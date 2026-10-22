import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { expireLapsedHolds } from "../src/modules/bookings/application/booking-lifecycle.ts";
import { api, bookingRequest, idempotency, listVehicle, signUp, type Session } from "./helpers/api.ts";
import { CARDS, pay } from "./helpers/payments.ts";
import { createTestApp, drainOutbox, resetDatabase, type TestApp } from "./helpers/test-app.ts";

/**
 * The booking invariant — no two active reservations of a vehicle overlap — under real concurrency.
 * Requests run in parallel against real Postgres connections (pool of 25), not serialized mocks.
 */
let t: TestApp;
let owner: Session;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.app.close());
beforeEach(async () => {
  await resetDatabase(t.container);
  t.clock.set("2030-01-10T09:00:00Z");
  t.emails.length = 0;
  owner = await signUp(t.app, { owner: true });
});

const renters = (n: number) => Promise.all(Array.from({ length: n }, () => signUp(t.app)));
const book = (session: Session, vehicleId: string, from: string, to: string, key?: string) =>
  api(t.app).post("/v1/bookings", bookingRequest(vehicleId, from, to), { session, headers: idempotency(key) });

async function activeReservations(vehicleId: string) {
  const result = await t.container.database.pool.query(
    "select count(*)::int as n from vehicle_reservations where vehicle_id = $1 and active",
    [vehicleId],
  );
  return result.rows[0].n as number;
}

describe("1. simultaneous overlapping requests", () => {
  it("lets exactly one of many concurrent overlapping bookings succeed", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const people = await renters(12);
    // Every request overlaps every other (all include 2030-02-03).
    const results = await Promise.all(
      people.map((p, i) => book(p, vehicle.id, i % 2 ? "2030-02-01" : "2030-02-03", i % 3 ? "2030-02-04" : "2030-02-06")),
    );

    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(11);
    expect(results.find((r) => r.status === 409)!.body.error.code).toBe("BOOKING_CONFLICT");
    expect(await activeReservations(vehicle.id)).toBe(1);
  });
});

describe("2. simultaneous non-overlapping requests", () => {
  it("accepts all of them, including back-to-back periods", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const people = await renters(4);
    const periods = [
      ["2030-02-01", "2030-02-03"],
      ["2030-02-03", "2030-02-05"],
      ["2030-02-05", "2030-02-08"],
      ["2030-02-10", "2030-02-11"],
    ] as const;
    const results = await Promise.all(people.map((p, i) => book(p, vehicle.id, periods[i]![0], periods[i]![1])));
    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    expect(await activeReservations(vehicle.id)).toBe(4);
  });
});

describe("3. simultaneous requests for different vehicles", () => {
  it("does not let one vehicle's bookings block another's", async () => {
    const vehicles = await Promise.all(Array.from({ length: 5 }, (_, i) => listVehicle(t.app, owner, { model: `Car ${i}` })));
    const people = await renters(5);
    const results = await Promise.all(people.map((p, i) => book(p, vehicles[i]!.id, "2030-02-01", "2030-02-05")));
    expect(results.every((r) => r.status === 201)).toBe(true);
  });
});

describe("4. duplicate booking requests", () => {
  it("returns the same booking for concurrent retries with one Idempotency-Key", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [renter] = await renters(1);
    const key = "checkout-attempt-0001";
    const results = await Promise.all(Array.from({ length: 6 }, () => book(renter!, vehicle.id, "2030-02-01", "2030-02-04", key)));

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 200)).toHaveLength(5);
    expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
    expect(await activeReservations(vehicle.id)).toBe(1);
  });

  it("refuses to reuse a key for a different request", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [renter] = await renters(1);
    await book(renter!, vehicle.id, "2030-02-01", "2030-02-04", "checkout-attempt-0002");
    const reused = await book(renter!, vehicle.id, "2030-03-01", "2030-03-04", "checkout-attempt-0002");
    expect(reused.status).toBe(422);
    expect(reused.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("requires an Idempotency-Key", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [renter] = await renters(1);
    const res = await api(t.app).post("/v1/bookings", bookingRequest(vehicle.id, "2030-02-01", "2030-02-04"), { session: renter });
    expect(res.status).toBe(400);
  });
});

describe("5. payment failure after a hold is created", () => {
  it("keeps the hold for a retry, blocks others, and confirms on a successful retry", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [renter, rival] = await renters(2);
    const hold = await book(renter!, vehicle.id, "2030-02-01", "2030-02-04");

    const declined = await pay(t.app, renter!, hold.body.id, CARDS.declined);
    expect(declined.confirmed!.body.status).toBe("failed");
    await drainOutbox(t.container);
    const afterFailure = await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: renter });
    expect(afterFailure.body.status).toBe("PENDING_PAYMENT");
    expect((await book(rival!, vehicle.id, "2030-02-02", "2030-02-03")).status).toBe(409);

    const retry = await pay(t.app, renter!, hold.body.id, CARDS.ok);
    expect(retry.started.status).toBe(201);
    await drainOutbox(t.container);
    expect((await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: renter })).body.status).toBe("CONFIRMED");
  });

  it("opens a fresh attempt when the renter retries before the failure webhook arrives", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [renter] = await renters(1);
    const hold = await book(renter!, vehicle.id, "2030-02-01", "2030-02-04");
    const declined = await pay(t.app, renter!, hold.body.id, CARDS.declined); // webhook still queued

    const retry = await pay(t.app, renter!, hold.body.id, CARDS.ok);
    expect(retry.started.status).toBe(201);
    expect(retry.started.body.id).not.toBe(declined.started.body.id);
    expect(retry.confirmed!.body.status).toBe("succeeded");
    await drainOutbox(t.container);
    expect((await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: renter })).body.status).toBe("CONFIRMED");
  });

  it("releases the dates when the renter never completes payment", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [renter] = await renters(1);
    const hold = await book(renter!, vehicle.id, "2030-02-01", "2030-02-04");
    await pay(t.app, renter!, hold.body.id, CARDS.insufficientFunds);
    t.clock.advance(16 * 60_000);
    expect(await expireLapsedHolds(t.container.deps.bookings)).toBe(1);
    expect(await activeReservations(vehicle.id)).toBe(0);
  });
});

describe("6. hold expiration followed by a new reservation", () => {
  it("lets someone else book once the hold lapses, even before the sweeper runs", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [first, second] = await renters(2);
    const lapsed = await book(first!, vehicle.id, "2030-02-01", "2030-02-04");
    expect((await book(second!, vehicle.id, "2030-02-02", "2030-02-05")).status).toBe(409);

    t.clock.advance(15 * 60_000 + 1);
    const taken = await book(second!, vehicle.id, "2030-02-02", "2030-02-05");
    expect(taken.status).toBe(201);
    expect((await api(t.app).get(`/v1/bookings/${lapsed.body.id}`, { session: first })).body.status).toBe("EXPIRED");

    const latePayment = await api(t.app).post(`/v1/bookings/${lapsed.body.id}/payments`, {}, { session: first });
    expect(latePayment.status).toBe(409);
  });

  it("serializes concurrent takeovers of the same lapsed hold", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [first, ...others] = await renters(6);
    await book(first!, vehicle.id, "2030-02-01", "2030-02-04");
    t.clock.advance(16 * 60_000);
    const results = await Promise.all(others.map((p) => book(p, vehicle.id, "2030-02-01", "2030-02-04")));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await activeReservations(vehicle.id)).toBe(1);
  });
});

describe("7. database failure during booking", () => {
  it("rolls back the whole booking when a write fails mid-transaction", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [renter] = await renters(1);
    const db = t.container.database.db;
    await db.execute(sql`create or replace function fail_reservation() returns trigger as $$
      begin raise exception 'simulated storage failure'; end $$ language plpgsql`);
    await db.execute(sql`create trigger fail_reservation before insert on vehicle_reservations for each row execute function fail_reservation()`);
    try {
      const failed = await book(renter!, vehicle.id, "2030-02-01", "2030-02-04", "retry-after-failure-1");
      expect(failed.status).toBe(500);
      expect(failed.body.error.message).toBe("Something went wrong");
      const orphans = await t.container.database.pool.query("select count(*)::int as n from bookings");
      expect(orphans.rows[0].n).toBe(0);
    } finally {
      await db.execute(sql`drop trigger fail_reservation on vehicle_reservations`);
    }
    // The client retries with the same key once the database recovers.
    expect((await book(renter!, vehicle.id, "2030-02-01", "2030-02-04", "retry-after-failure-1")).status).toBe(201);
  });

  it("answers 503 when the database is unreachable", async () => {
    const down = await createTestApp({ env: { DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:1/none" } });
    try {
      const res = await api(down.app).get("/v1/vehicles");
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("SERVICE_UNAVAILABLE");
      expect((await api(down.app).get("/health/ready")).status).toBe(503);
    } finally {
      await down.app.close();
    }
  });
});

describe("8. delayed or duplicated payment callbacks", () => {
  async function capturedWebhook() {
    const result = await t.container.database.pool.query("select payload from outbox_jobs where type = 'mock-provider.deliver-webhook'");
    return result.rows[0].payload;
  }

  it("processes a duplicated webhook exactly once", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [renter] = await renters(1);
    const hold = await book(renter!, vehicle.id, "2030-02-01", "2030-02-04");
    await pay(t.app, renter!, hold.body.id);
    const event = await capturedWebhook();
    await drainOutbox(t.container);

    // Redeliver the very same event, as providers do.
    await t.container.outbox.enqueue("mock-provider.deliver-webhook", event);
    await drainOutbox(t.container);
    const processed = await t.container.database.pool.query("select count(*)::int as n from payment_webhook_events");
    expect(processed.rows[0].n).toBe(1);
    expect(t.emails.filter((e) => e.subject.startsWith("Booking confirmed"))).toHaveLength(1);
  });

  it("refunds a payment that lands after the hold was given to someone else", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [slow, fast] = await renters(2);
    const hold = await book(slow!, vehicle.id, "2030-02-01", "2030-02-04");
    const started = await api(t.app).post(`/v1/bookings/${hold.body.id}/payments`, {}, { session: slow });

    t.clock.advance(16 * 60_000);
    expect((await book(fast!, vehicle.id, "2030-02-01", "2030-02-04")).status).toBe(201);
    // The slow renter's card step completes late at the provider.
    await t.container.database.pool.query("update payments set status = 'REQUIRES_ACTION' where id = $1", [started.body.id]);
    await api(t.app).post("/v1/mock-provider/confirm", { clientSecret: started.body.clientSecret, cardNumber: CARDS.ok }, { session: slow });
    await drainOutbox(t.container);

    const booking = await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: slow });
    expect(booking.body.status).toBe("EXPIRED");
    const refunds = await t.container.database.pool.query("select status, amount_cents from refunds");
    expect(refunds.rows).toEqual([{ status: "SUCCEEDED", amount_cents: hold.body.price.totalCents }]);
    expect(await activeReservations(vehicle.id)).toBe(1);
  });

  it("revives a lapsed hold when a late payment arrives and the dates are still free", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [renter] = await renters(1);
    const hold = await book(renter!, vehicle.id, "2030-02-01", "2030-02-04");
    const started = await api(t.app).post(`/v1/bookings/${hold.body.id}/payments`, {}, { session: renter });
    t.clock.advance(16 * 60_000);
    await expireLapsedHolds(t.container.deps.bookings);
    await t.container.database.pool.query("update payments set status = 'REQUIRES_ACTION' where id = $1", [started.body.id]);
    await t.container.database.pool.query("update mock_provider_payments set status = 'requires_action'");

    await api(t.app).post("/v1/mock-provider/confirm", { clientSecret: started.body.clientSecret, cardNumber: CARDS.ok }, { session: renter });
    await drainOutbox(t.container);
    expect((await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: renter })).body.status).toBe("CONFIRMED");
  });

  it("ignores a stale failure that arrives after success", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [renter] = await renters(1);
    const hold = await book(renter!, vehicle.id, "2030-02-01", "2030-02-04");
    await pay(t.app, renter!, hold.body.id);
    const success = await capturedWebhook();
    await drainOutbox(t.container);

    await t.container.outbox.enqueue("mock-provider.deliver-webhook", { ...success, id: "evt-stale-failure", type: "payment.failed" });
    await drainOutbox(t.container);
    const payment = await t.container.database.pool.query("select status from payments");
    expect(payment.rows[0].status).toBe("SUCCEEDED");
    expect((await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: renter })).body.status).toBe("CONFIRMED");
  });

  it("reconciles a payment whose webhook never arrives", async () => {
    const vehicle = await listVehicle(t.app, owner);
    const [renter] = await renters(1);
    const hold = await book(renter!, vehicle.id, "2030-02-01", "2030-02-04");
    await pay(t.app, renter!, hold.body.id, CARDS.lostWebhook);
    await drainOutbox(t.container);
    expect((await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: renter })).body.status).toBe("PENDING_PAYMENT");

    t.clock.advance(11 * 60_000);
    const { reconcileStalePayments } = await import("../src/modules/payments/application/payment-maintenance.ts");
    expect(await reconcileStalePayments(t.container.deps.payments)).toBe(1);
    expect((await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: renter })).body.status).toBe("CONFIRMED");
  });

  it("rejects webhooks with an invalid signature", async () => {
    const res = await t.app.inject({
      method: "POST",
      url: "/v1/payments/webhooks/mock",
      headers: { "content-type": "application/json", "x-mock-signature": "t=1,v1=deadbeef" },
      payload: JSON.stringify({ id: "evt_forged", type: "payment.succeeded", providerPaymentId: "x" }),
    });
    expect(res.statusCode).toBe(400);
  });
});
