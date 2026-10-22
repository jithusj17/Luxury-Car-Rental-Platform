import Stripe from "stripe";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createStripePaymentProvider } from "../src/modules/payments/infrastructure/stripe/stripe-payment-provider.ts";
import { api, bookingRequest, idempotency, listVehicle, signUp } from "./helpers/api.ts";
import { createTestApp, resetDatabase, type TestApp } from "./helpers/test-app.ts";

const WEBHOOK_SECRET = "whsec_test_0123456789abcdef";
const stripeMock = process.env.TEST_STRIPE_API_BASE; // e.g. http://localhost:12111 (stripe-mock)
const signer = new Stripe("sk_test_signing_only");

function signedEvent(type: string, intent: Partial<Stripe.PaymentIntent>, id = `evt_${Math.random().toString(36).slice(2)}`) {
  const payload = JSON.stringify({ id, object: "event", type, data: { object: { object: "payment_intent", ...intent } } });
  return { payload, header: signer.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }) };
}

describe("Stripe webhooks", () => {
  const provider = createStripePaymentProvider({ secretKey: "sk_test_unused", webhookSecret: WEBHOOK_SECRET });

  it("accepts correctly signed events and maps them", () => {
    const { payload, header } = signedEvent("payment_intent.payment_failed", { id: "pi_123", last_payment_error: { code: "card_declined" } as never });
    expect(provider.verifyWebhook(payload, { "stripe-signature": header })).toMatchObject({
      type: "payment.failed",
      providerPaymentId: "pi_123",
      failureReason: "card_declined",
    });
  });

  it("rejects tampered or unsigned payloads", () => {
    const { payload, header } = signedEvent("payment_intent.succeeded", { id: "pi_123" });
    expect(() => provider.verifyWebhook(payload.replace("pi_123", "pi_999"), { "stripe-signature": header })).toThrow();
    expect(() => provider.verifyWebhook(payload, {})).toThrow();
  });

  it("ignores authentic events it doesn't act on", () => {
    const { payload, header } = signedEvent("customer.created", { id: "cus_1" } as never);
    expect(provider.verifyWebhook(payload, { "stripe-signature": header })).toBeNull();
  });
});

describe.skipIf(!stripeMock)("Stripe API calls (stripe-mock)", () => {
  const provider = createStripePaymentProvider({ secretKey: "sk_test_123", webhookSecret: WEBHOOK_SECRET, apiBase: stripeMock });

  it("creates, reads, refunds and cancels payment intents", async () => {
    const created = await provider.createPayment({ reference: "pay_1", amountCents: 16_500, currency: "USD", idempotencyKey: "pay_1" });
    expect(created.providerPaymentId).toMatch(/^pi_/);
    expect(created.clientSecret).toContain("secret");
    expect((await provider.retrievePayment(created.providerPaymentId)).status).toBeTypeOf("string");
    expect((await provider.refund({ providerPaymentId: created.providerPaymentId, amountCents: 1000, idempotencyKey: "r1" })).providerRefundId).toMatch(/^re_/);
    expect((await provider.cancelPayment(created.providerPaymentId)).status).toBeTypeOf("string");
  });
});

describe.skipIf(!stripeMock)("checkout with Stripe end to end (stripe-mock)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({
      env: { PAYMENT_PROVIDER: "stripe", STRIPE_SECRET_KEY: "sk_test_123", STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET, STRIPE_API_BASE: stripeMock! },
    });
  });
  afterAll(() => t.app.close());
  beforeEach(() => resetDatabase(t.container));

  it("opens a Stripe payment and confirms the booking from the signed webhook", async () => {
    const owner = await signUp(t.app, { owner: true });
    const renter = await signUp(t.app);
    const vehicle = await listVehicle(t.app, owner);
    const hold = await api(t.app).post("/v1/bookings", bookingRequest(vehicle.id, "2030-02-01", "2030-02-04"), { session: renter, headers: idempotency() });

    const payment = await api(t.app).post(`/v1/bookings/${hold.body.id}/payments`, {}, { session: renter });
    expect(payment.status).toBe(201);
    expect(payment.body).toMatchObject({ provider: "stripe", status: "REQUIRES_ACTION" });
    expect(payment.body.clientSecret).toBeTruthy();

    const providerId = (await t.container.database.pool.query("select provider_payment_id from payments")).rows[0].provider_payment_id as string;
    const { payload, header } = signedEvent("payment_intent.succeeded", { id: providerId });
    const webhook = await t.app.inject({
      method: "POST",
      url: "/v1/payments/webhooks/stripe",
      headers: { "content-type": "application/json", "stripe-signature": header },
      payload,
    });
    expect(webhook.json()).toEqual({ received: true });
    expect((await api(t.app).get(`/v1/bookings/${hold.body.id}`, { session: renter })).body.status).toBe("CONFIRMED");

    const forged = await t.app.inject({ method: "POST", url: "/v1/payments/webhooks/stripe", headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=bad" }, payload });
    expect(forged.statusCode).toBe(400);
  });
});
