import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, bookingRequest, idempotency, listVehicle, signUp, vehicleInput, type Session } from "./helpers/api.ts";
import { createTestApp, resetDatabase, type TestApp } from "./helpers/test-app.ts";

let t: TestApp;
let owner: Session;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.app.close());
beforeEach(async () => {
  await resetDatabase(t.container);
  owner = await signUp(t.app, { owner: true, name: "Olivia Owner" });
});

describe("owner vehicle management", () => {
  it("requires the owner role to list a vehicle", async () => {
    const renter = await signUp(t.app);
    const res = await api(t.app).post("/v1/owner/vehicles", vehicleInput(), { session: renter });
    expect(res.status).toBe(403);
  });

  it("creates a vehicle with a slug and starts as draft unless published", async () => {
    const draft = await listVehicle(t.app, owner, { status: "DRAFT" });
    expect(draft).toMatchObject({ status: "DRAFT", version: 1, imageUrls: [], owner: { name: "Olivia Owner" } });
    expect(draft.slug).toMatch(/^2024-toyota-corolla-[0-9a-f]{8}$/);
  });

  it("validates vehicle input", async () => {
    const res = await api(t.app).post("/v1/owner/vehicles", vehicleInput({ dailyRateCents: 0, timezone: "Mars/Base", minDays: 9, maxDays: 2 }), { session: owner });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["body.dailyRateCents", "body.timezone"]));
  });

  it("uses optimistic concurrency so stale edits can't overwrite newer ones", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const first = await api(t.app).patch(`/v1/owner/vehicles/${vehicle.id}`, { dailyRateCents: 6_000, version: 1 }, { session: owner });
    expect(first.status).toBe(200);
    expect(first.body.version).toBe(2);
    const stale = await api(t.app).patch(`/v1/owner/vehicles/${vehicle.id}`, { dailyRateCents: 7_000, version: 1 }, { session: owner });
    expect(stale.status).toBe(409);
  });

  it("hides other owners' vehicles", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const intruder = await signUp(t.app, { owner: true });
    expect((await api(t.app).get(`/v1/owner/vehicles/${vehicle.id}`, { session: intruder })).status).toBe(404);
    expect((await api(t.app).patch(`/v1/owner/vehicles/${vehicle.id}`, { color: "Red", version: 1 }, { session: intruder })).status).toBe(404);
  });

  it("enforces status transitions", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const archived = await api(t.app).put(`/v1/owner/vehicles/${vehicle.id}/status`, { status: "ARCHIVED", version: 1 }, { session: owner });
    expect(archived.status).toBe(200);
    const revived = await api(t.app).put(`/v1/owner/vehicles/${vehicle.id}/status`, { status: "ACTIVE", version: 2 }, { session: owner });
    expect(revived.status).toBe(409);
  });
});

describe("public catalog", () => {
  it("shows only listed vehicles and withholds the street address", async () => {
    const active = await listVehicle(t.app, owner);
    await listVehicle(t.app, owner, { status: "DRAFT", model: "Hidden" });

    const list = await api(t.app).get("/v1/vehicles");
    expect(list.body.total).toBe(1);
    const detail = await api(t.app).get(`/v1/vehicles/${active.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body).not.toHaveProperty("address");
    expect(detail.body).not.toHaveProperty("status");
  });

  it("filters, sorts and paginates", async () => {
    await listVehicle(t.app, owner, { make: "Tesla", model: "Model Y", category: "suv", dailyRateCents: 9_000, fuelType: "electric", city: "Porto" });
    await listVehicle(t.app, owner, { make: "Mini", model: "Cooper", category: "hatchback", dailyRateCents: 4_000, seats: 4 });
    await listVehicle(t.app, owner, { make: "Ford", model: "Transit", category: "van", dailyRateCents: 6_500, seats: 7, transmission: "manual" });

    const cheapest = await api(t.app).get("/v1/vehicles?sort=price_asc&pageSize=2");
    expect(cheapest.body.items.map((v: { make: string }) => v.make)).toEqual(["Mini", "Ford"]);
    expect(cheapest.body.total).toBe(3);

    expect((await api(t.app).get("/v1/vehicles?q=model")).body.items[0].make).toBe("Tesla");
    expect((await api(t.app).get("/v1/vehicles?city=porto")).body.total).toBe(1);
    expect((await api(t.app).get("/v1/vehicles?seatsMin=6")).body.items[0].make).toBe("Ford");
    expect((await api(t.app).get("/v1/vehicles?priceMaxCents=5000")).body.total).toBe(1);
    expect((await api(t.app).get("/v1/vehicles?q=%25")).body.total).toBe(0); // LIKE wildcards are escaped
  });

  it("rejects unbounded page sizes", async () => {
    expect((await api(t.app).get("/v1/vehicles?pageSize=500")).status).toBe(400);
  });

  it("excludes vehicles already reserved for the requested dates", async () => {
    const booked = await listVehicle(t.app, owner, { make: "Booked" });
    await listVehicle(t.app, owner, { make: "Free" });
    const renter = await signUp(t.app);
    await api(t.app).post("/v1/bookings", bookingRequest(booked.id, "2030-02-01", "2030-02-04"), { session: renter, headers: idempotency() });

    const overlapping = await api(t.app).get("/v1/vehicles?pickupDate=2030-02-03&returnDate=2030-02-06");
    expect(overlapping.body.items.map((v: { make: string }) => v.make)).toEqual(["Free"]);
    const backToBack = await api(t.app).get("/v1/vehicles?pickupDate=2030-02-04&returnDate=2030-02-06");
    expect(backToBack.body.total).toBe(2);
  });
});
