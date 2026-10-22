import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, bookingRequest, idempotency, listVehicle, signUp, type Session } from "./helpers/api.ts";
import { pay } from "./helpers/payments.ts";
import { createTestApp, drainOutbox, resetDatabase, type TestApp } from "./helpers/test-app.ts";

let t: TestApp;
let owner: Session;
let renter: Session;
let vehicleId: string;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.app.close());
beforeEach(async () => {
  await resetDatabase(t.container);
  t.clock.set("2030-01-10T09:00:00Z");
  owner = await signUp(t.app, { owner: true });
  renter = await signUp(t.app, { name: "Rui Renter" });
  vehicleId = (await listVehicle(t.app, owner, { dailyRateCents: 10_000 })).id;
});

const book = (from: string, to: string) =>
  api(t.app).post("/v1/bookings", bookingRequest(vehicleId, from, to), { session: renter, headers: idempotency() });
const block = (session: Session, startDate: string, endDate: string) =>
  api(t.app).post("/v1/owner/blocks", { vehicleId, startDate, endDate, note: "Service" }, { session });

describe("owner blocks", () => {
  it("blocks dates against bookings using the same overlap constraint", async () => {
    expect((await block(owner, "2030-02-10", "2030-02-12")).status).toBe(201);
    expect((await book("2030-02-11", "2030-02-13")).status).toBe(409);
    expect((await book("2030-02-12", "2030-02-14")).status).toBe(201);
    expect((await block(owner, "2030-02-13", "2030-02-15")).status).toBe(409);
  });

  it("only lets the vehicle's owner manage its calendar", async () => {
    const other = await signUp(t.app, { owner: true });
    expect((await block(other, "2030-02-10", "2030-02-12")).status).toBe(404);
    const created = await block(owner, "2030-02-10", "2030-02-12");
    expect((await api(t.app).delete(`/v1/owner/blocks/${created.body.id}`, { session: other })).status).toBe(404);
    expect((await api(t.app).delete(`/v1/owner/blocks/${created.body.id}`, { session: owner })).status).toBe(204);
    expect((await book("2030-02-10", "2030-02-12")).status).toBe(201);
  });

  it("shows bookings and blocks on the owner calendar", async () => {
    await block(owner, "2030-02-10", "2030-02-12");
    await book("2030-02-01", "2030-02-03");
    const res = await api(t.app).get(`/v1/owner/calendar?vehicleId=${vehicleId}&from=2030-02-01&to=2030-03-01`, { session: owner });
    expect(res.body.entries).toEqual([
      expect.objectContaining({ kind: "BOOKING", startDate: "2030-02-01", label: "Rui Renter", status: "PENDING_PAYMENT" }),
      expect.objectContaining({ kind: "OWNER_BLOCK", startDate: "2030-02-10", label: "Service" }),
    ]);
  });
});

describe("owner bookings and earnings", () => {
  it("lists bookings on the owner's vehicles only", async () => {
    await book("2030-02-01", "2030-02-03");
    const mine = await api(t.app).get("/v1/owner/bookings", { session: owner });
    expect(mine.body.total).toBe(1);
    const other = await signUp(t.app, { owner: true });
    expect((await api(t.app).get("/v1/owner/bookings", { session: other })).body.total).toBe(0);
    expect((await api(t.app).get("/v1/owner/bookings", { session: renter })).status).toBe(403);
  });

  it("reports earnings net of refunds, excluding the service fee", async () => {
    const past = await book("2030-01-11", "2030-01-13");
    await pay(t.app, renter, past.body.id);
    const future = await book("2030-03-01", "2030-03-04");
    await pay(t.app, renter, future.body.id);
    const lateCancel = await book("2030-01-14", "2030-01-15");
    await pay(t.app, renter, lateCancel.body.id);
    await drainOutbox(t.container);
    t.clock.set("2030-01-12T09:00:00Z"); // 39 hours before pickup: 50% refund
    await api(t.app).post(`/v1/bookings/${lateCancel.body.id}/cancel`, {}, { session: renter });

    t.clock.set("2030-01-20T09:00:00Z"); // within the 14-day session lifetime
    const earnings = await api(t.app).get("/v1/owner/earnings", { session: owner });
    expect(earnings.body).toEqual({
      currency: "USD",
      totalEarnedCents: 20_000 + 5_000,
      upcomingCents: 30_000,
      confirmedBookings: 2,
      byMonth: [{ month: "2030-01", earnedCents: 25_000 }],
    });
  });
});
