import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, bookingRequest, idempotency, listVehicle, signUp, type Session } from "./helpers/api.ts";
import { pay } from "./helpers/payments.ts";
import { createTestApp, drainOutbox, resetDatabase, type TestApp } from "./helpers/test-app.ts";

let t: TestApp;
let admin: Session;
let owner: Session;
let renter: Session;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.app.close());
beforeEach(async () => {
  await resetDatabase(t.container);
  t.clock.set("2030-01-10T09:00:00Z");
  admin = await signUp(t.app, { name: "Ada Admin" });
  await t.container.deps.identity.users.setRoles(admin.userId, ["renter", "admin"]);
  owner = await signUp(t.app, { owner: true, name: "Olivia Owner" });
  renter = await signUp(t.app, { name: "Rui Renter", email: "rui@example.com" });
});

async function auditActions() {
  return (await api(t.app).get("/v1/admin/audit-log", { session: admin })).body.items.map((e: { action: string }) => e.action);
}

describe("access control", () => {
  it.each(["/v1/admin/overview", "/v1/admin/users", "/v1/admin/vehicles", "/v1/admin/bookings", "/v1/admin/payments", "/v1/admin/audit-log"])(
    "refuses non-admins on %s",
    async (path) => {
      expect((await api(t.app).get(path, { session: renter })).status).toBe(403);
      expect((await api(t.app).get(path, { session: owner })).status).toBe(403);
      expect((await api(t.app).get(path)).status).toBe(401);
    },
  );
});

describe("overview", () => {
  it("summarises users, vehicles, bookings and revenue", async () => {
    const vehicle = await listVehicle(t.app, owner, { dailyRateCents: 10_000 });
    const hold = await api(t.app).post("/v1/bookings", bookingRequest(vehicle.id, "2030-02-01", "2030-02-03"), { session: renter, headers: idempotency() });
    await pay(t.app, renter, hold.body.id);
    await drainOutbox(t.container);

    const res = await api(t.app).get("/v1/admin/overview", { session: admin });
    expect(res.body).toEqual({
      users: { total: 3, hosts: 1, admins: 1, suspended: 0 },
      vehicles: { total: 1, listed: 1 },
      bookings: { total: 1, pendingPayment: 0, confirmed: 1, cancelled: 0, expired: 0 },
      revenue: { currency: "USD", grossBookingsCents: 22_000, serviceFeesCents: 2_000, refundedCents: 0 },
    });
  });
});

describe("users", () => {
  it("searches users by name or email and filters by role", async () => {
    const byEmail = await api(t.app).get("/v1/admin/users?q=rui%40", { session: admin });
    expect(byEmail.body.items.map((u: { fullName: string }) => u.fullName)).toEqual(["Rui Renter"]);
    const hosts = await api(t.app).get("/v1/admin/users?role=owner", { session: admin });
    expect(hosts.body.items.map((u: { fullName: string }) => u.fullName)).toEqual(["Olivia Owner"]);
  });

  it("changes roles, always keeping renter, and records it", async () => {
    const res = await api(t.app).put(`/v1/admin/users/${renter.userId}/roles`, { owner: true, admin: false }, { session: admin });
    expect(res.body.roles).toEqual(["renter", "owner"]);
    expect(await auditActions()).toEqual(["user.roles_changed"]);
  });

  it("won't let an admin remove their own admin access or suspend themselves", async () => {
    expect((await api(t.app).put(`/v1/admin/users/${admin.userId}/roles`, { owner: false, admin: false }, { session: admin })).status).toBe(409);
    expect((await api(t.app).put(`/v1/admin/users/${admin.userId}/suspension`, { suspended: true }, { session: admin })).status).toBe(409);
  });

  it("suspends a user: signs them out and blocks login until reinstated", async () => {
    const res = await api(t.app).put(`/v1/admin/users/${renter.userId}/suspension`, { suspended: true, reason: "Fraud check" }, { session: admin });
    expect(res.body.suspendedAt).toBe("2030-01-10T09:00:00.000Z");
    expect((await api(t.app).get("/v1/auth/me", { session: renter })).status).toBe(401);
    const login = await api(t.app).post("/v1/auth/login", { email: "rui@example.com", password: "correct-horse-battery" });
    expect(login.status).toBe(403);

    await api(t.app).put(`/v1/admin/users/${renter.userId}/suspension`, { suspended: false }, { session: admin });
    expect((await api(t.app).post("/v1/auth/login", { email: "rui@example.com", password: "correct-horse-battery" })).status).toBe(200);
    expect(await auditActions()).toEqual(["user.reinstated", "user.suspended"]);
  });
});

describe("vehicles", () => {
  it("lists every host's vehicles and can unlist one", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const list = await api(t.app).get("/v1/admin/vehicles", { session: admin });
    expect(list.body.items[0]).toMatchObject({ id: vehicle.id, owner: { name: "Olivia Owner" }, status: "ACTIVE" });

    const res = await api(t.app).put(`/v1/admin/vehicles/${vehicle.id}/status`, { status: "INACTIVE", version: vehicle.version }, { session: admin });
    expect(res.body.status).toBe("INACTIVE");
    expect((await api(t.app).get(`/v1/vehicles/${vehicle.slug}`)).status).toBe(404);
    expect(await auditActions()).toEqual(["vehicle.status_changed"]);
  });
});

describe("bookings and payments", () => {
  it("cancels any booking with a full refund and records the reason", async () => {
    const vehicle = await listVehicle(t.app, owner, { dailyRateCents: 10_000 });
    const hold = await api(t.app).post("/v1/bookings", bookingRequest(vehicle.id, "2030-01-11", "2030-01-13"), { session: renter, headers: idempotency() });
    await pay(t.app, renter, hold.body.id);
    await drainOutbox(t.container);

    // A renter cancelling now would only get 50% back; an admin cancellation refunds in full.
    const res = await api(t.app).post(`/v1/admin/bookings/${hold.body.id}/cancel`, { reason: "Vehicle unavailable" }, { session: admin });
    expect(res.body).toMatchObject({ status: "CANCELLED", refundedCents: 22_000, cancellationReason: "Vehicle unavailable" });
    await drainOutbox(t.container);

    const payments = await api(t.app).get("/v1/admin/payments", { session: admin });
    expect(payments.body.items[0]).toMatchObject({ status: "SUCCEEDED", amountCents: 22_000, refundedCents: 22_000 });
    expect(payments.body.items[0]).not.toHaveProperty("clientSecret");
    const bookings = await api(t.app).get("/v1/admin/bookings?status=CANCELLED", { session: admin });
    expect(bookings.body.total).toBe(1);
    expect(await auditActions()).toEqual(["booking.cancelled"]);
  });

  it("requires a reason to cancel", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const hold = await api(t.app).post("/v1/bookings", bookingRequest(vehicle.id, "2030-02-01", "2030-02-03"), { session: renter, headers: idempotency() });
    expect((await api(t.app).post(`/v1/admin/bookings/${hold.body.id}/cancel`, {}, { session: admin })).status).toBe(400);
  });
});
