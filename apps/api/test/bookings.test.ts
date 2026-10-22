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
  t.emails.length = 0;
  owner = await signUp(t.app, { owner: true, name: "Olivia Owner" });
  renter = await signUp(t.app, { name: "Rui Renter" });
  vehicleId = (await listVehicle(t.app, owner, { dailyRateCents: 5_000, minDays: 2 })).id;
});

const book = (session: Session, from: string, to: string) =>
  api(t.app).post("/v1/bookings", bookingRequest(vehicleId, from, to), { session, headers: idempotency() });

async function confirmedBooking(from = "2030-02-01", to = "2030-02-04") {
  const hold = await book(renter, from, to);
  await pay(t.app, renter, hold.body.id);
  await drainOutbox(t.container);
  return hold.body.id as string;
}

describe("quotes and holds", () => {
  it("prices on the server and reports availability", async () => {
    const quote = await api(t.app).get(`/v1/bookings/quote?vehicleId=${vehicleId}&pickupDate=2030-02-01&returnDate=2030-02-04`);
    expect(quote.body).toMatchObject({
      available: true,
      price: { days: 3, dailyRateCents: 5_000, subtotalCents: 15_000, serviceFeeCents: 1_500, totalCents: 16_500 },
    });
  });

  it("creates a pending hold with a 15-minute window and the server's price", async () => {
    const res = await book(renter, "2030-02-01", "2030-02-04");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: "PENDING_PAYMENT",
      holdExpiresAt: "2030-01-10T09:15:00.000Z",
      price: { totalCents: 16_500 },
      vehicle: { id: vehicleId },
      renter: { name: "Rui Renter" },
      owner: { name: "Olivia Owner" },
    });
  });

  it("applies rental rules", async () => {
    expect((await book(renter, "2030-01-05", "2030-01-12")).status).toBe(400); // past
    expect((await book(renter, "2030-02-01", "2030-02-02")).status).toBe(400); // under minimum
    expect((await book(owner, "2030-02-01", "2030-02-04")).status).toBe(403); // own vehicle
    const anon = await api(t.app).post("/v1/bookings", bookingRequest(vehicleId, "2030-02-01", "2030-02-04"), { headers: idempotency() });
    expect(anon.status).toBe(401);
  });

  it("refuses bookings for unlisted vehicles", async () => {
    await api(t.app).put(`/v1/owner/vehicles/${vehicleId}/status`, { status: "INACTIVE", version: 1 }, { session: owner });
    expect((await book(renter, "2030-02-01", "2030-02-04")).status).toBe(404);
  });

  it("exposes merged unavailable ranges without revealing who booked", async () => {
    await book(renter, "2030-02-01", "2030-02-04");
    const other = await signUp(t.app);
    await book(other, "2030-02-04", "2030-02-06");
    const res = await api(t.app).get(`/v1/availability?vehicleId=${vehicleId}&from=2030-02-01&to=2030-03-01`);
    expect(res.body.unavailable).toEqual([{ start: "2030-02-01", end: "2030-02-06" }]);
    expect(JSON.stringify(res.body)).not.toContain(renter.userId);
  });
});

describe("access control", () => {
  it("shows a booking only to its renter, the owner, and nobody else", async () => {
    const hold = await book(renter, "2030-02-01", "2030-02-04");
    const stranger = await signUp(t.app);
    expect((await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: renter })).status).toBe(200);
    expect((await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: owner })).status).toBe(200);
    expect((await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: stranger })).status).toBe(404);
    expect((await api(t.app).post(`/v1/bookings/${hold.body.id}/cancel`, {}, { session: stranger })).status).toBe(404);
    expect((await api(t.app).post(`/v1/bookings/${hold.body.id}/payments`, {}, { session: owner })).status).toBe(404);
  });

  it("lists each renter's own bookings by scope", async () => {
    const id = await confirmedBooking("2030-01-12", "2030-01-15");
    t.clock.set("2030-01-20T09:00:00Z"); // within the 14-day session lifetime
    expect((await api(t.app).get("/v1/bookings?scope=upcoming", { session: renter })).body.total).toBe(0);
    const past = await api(t.app).get("/v1/bookings?scope=past", { session: renter });
    expect(past.body.items.map((b: { id: string }) => b.id)).toEqual([id]);
    const other = await signUp(t.app);
    expect((await api(t.app).get("/v1/bookings", { session: other })).body.total).toBe(0);
  });
});

describe("payments", () => {
  it("confirms the booking and emails both parties", async () => {
    const id = await confirmedBooking();
    const booking = await api(t.app).get(`/v1/bookings/${id}`, { session: renter });
    expect(booking.body.status).toBe("CONFIRMED");
    expect(t.emails.map((e) => e.subject)).toEqual(expect.arrayContaining([expect.stringMatching(/^Booking confirmed/), expect.stringMatching(/^New booking/)]));
  });

  it("returns the same open payment when started twice", async () => {
    const hold = await book(renter, "2030-02-01", "2030-02-04");
    const [a, b] = await Promise.all([
      api(t.app).post(`/v1/bookings/${hold.body.id}/payments`, {}, { session: renter }),
      api(t.app).post(`/v1/bookings/${hold.body.id}/payments`, {}, { session: renter }),
    ]);
    expect(a.body.id).toBe(b.body.id);
    expect(a.body.amountCents).toBe(16_500);
  });

  it("does not charge a booking twice", async () => {
    const id = await confirmedBooking();
    const again = await api(t.app).post(`/v1/bookings/${id}/payments`, {}, { session: renter });
    expect(again.status).toBe(409);
  });
});

describe("cancellation and refunds", () => {
  async function refunds() {
    return (await t.container.database.pool.query("select amount_cents, status from refunds")).rows;
  }

  it("refunds in full when the renter cancels with 48h notice", async () => {
    const id = await confirmedBooking("2030-02-01", "2030-02-04");
    const res = await api(t.app).post(`/v1/bookings/${id}/cancel`, { reason: "Plans changed" }, { session: renter });
    expect(res.body).toMatchObject({ status: "CANCELLED", refundedCents: 16_500, cancellationReason: "Plans changed" });
    await drainOutbox(t.container);
    expect(await refunds()).toEqual([{ amount_cents: 16_500, status: "SUCCEEDED" }]);
    const availability = await api(t.app).get(`/v1/availability?vehicleId=${vehicleId}&from=2030-02-01&to=2030-02-10`);
    expect(availability.body.unavailable).toEqual([]);
  });

  it("refunds half for late renter cancellations and refuses once the trip started", async () => {
    const id = await confirmedBooking("2030-01-11", "2030-01-14");
    expect((await api(t.app).get(`/v1/bookings/${id}`, { session: renter })).body.cancellation).toEqual({ allowed: true, refundPercent: 50 });
    t.clock.set("2030-01-11T08:00:00Z");
    expect((await api(t.app).post(`/v1/bookings/${id}/cancel`, {}, { session: renter })).status).toBe(409);
  });

  it("lets the owner cancel with a full refund, and never refunds twice", async () => {
    const id = await confirmedBooking("2030-01-11", "2030-01-14");
    const [first, second] = await Promise.all([
      api(t.app).post(`/v1/bookings/${id}/cancel`, {}, { session: owner }),
      api(t.app).post(`/v1/bookings/${id}/cancel`, {}, { session: owner }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    await drainOutbox(t.container);
    expect(await refunds()).toEqual([{ amount_cents: 16_500, status: "SUCCEEDED" }]);
  });

  it("cancels an unpaid hold and its open payment", async () => {
    const hold = await book(renter, "2030-02-01", "2030-02-04");
    await api(t.app).post(`/v1/bookings/${hold.body.id}/payments`, {}, { session: renter });
    const res = await api(t.app).post(`/v1/bookings/${hold.body.id}/cancel`, {}, { session: renter });
    expect(res.body).toMatchObject({ status: "CANCELLED", refundedCents: 0 });
    await drainOutbox(t.container);
    const provider = await t.container.database.pool.query("select status from mock_provider_payments");
    expect(provider.rows[0].status).toBe("canceled");
  });
});
