import Stripe from "stripe";
import type { PaymentProvider, ProviderEvent, ProviderPaymentStatus } from "../../application/ports.ts";

export type StripeSettings = { secretKey: string; webhookSecret: string; apiBase?: string };

/** Stripe PaymentIntent status → our provider status. A declined attempt is retryable ("open"). */
function toStatus(intent: Stripe.PaymentIntent): ProviderPaymentStatus {
  switch (intent.status) {
    case "succeeded":
      return "succeeded";
    case "canceled":
      return "canceled";
    default:
      return "requires_action";
  }
}

const eventTypes: Partial<Record<string, ProviderEvent["type"]>> = {
  "payment_intent.succeeded": "payment.succeeded",
  "payment_intent.payment_failed": "payment.failed",
  "payment_intent.canceled": "payment.canceled",
};

/**
 * Stripe adapter for the payment port. Every mutating call carries an idempotency key, so the
 * outbox and request retries can never create a second charge or refund.
 */
export function createStripePaymentProvider(settings: StripeSettings): PaymentProvider {
  const base = settings.apiBase ? new URL(settings.apiBase) : undefined;
  const stripe = new Stripe(settings.secretKey, {
    maxNetworkRetries: 2,
    timeout: 10_000,
    ...(base && {
      host: base.hostname,
      port: base.port,
      protocol: base.protocol === "http:" ? "http" : "https",
    }),
  });

  return {
    name: "stripe",

    async createPayment({ reference, amountCents, currency, idempotencyKey }) {
      const intent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: currency.toLowerCase(),
          automatic_payment_methods: { enabled: true },
          metadata: { payment_id: reference },
        },
        { idempotencyKey: `create:${idempotencyKey}` },
      );
      if (!intent.client_secret) throw new Error("Stripe returned a PaymentIntent without a client secret");
      return { providerPaymentId: intent.id, clientSecret: intent.client_secret };
    },

    async retrievePayment(providerPaymentId) {
      const intent = await stripe.paymentIntents.retrieve(providerPaymentId);
      return { status: toStatus(intent), failureReason: intent.last_payment_error?.code ?? undefined };
    },

    async cancelPayment(providerPaymentId) {
      try {
        return { status: toStatus(await stripe.paymentIntents.cancel(providerPaymentId)) };
      } catch (error) {
        // Already succeeded or canceled: report the real state so callers can react.
        if (error instanceof Stripe.errors.StripeInvalidRequestError) {
          return { status: toStatus(await stripe.paymentIntents.retrieve(providerPaymentId)) };
        }
        throw error;
      }
    },

    async refund({ providerPaymentId, amountCents, idempotencyKey }) {
      const refund = await stripe.refunds.create(
        { payment_intent: providerPaymentId, amount: amountCents },
        { idempotencyKey: `refund:${idempotencyKey}` },
      );
      return { providerRefundId: refund.id };
    },

    verifyWebhook(rawBody, headers) {
      const signature = headers["stripe-signature"];
      const event = stripe.webhooks.constructEvent(rawBody, Array.isArray(signature) ? signature[0]! : (signature ?? ""), settings.webhookSecret);
      const type = eventTypes[event.type];
      if (!type) return null;
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        id: event.id,
        type,
        providerPaymentId: intent.id,
        ...(intent.last_payment_error?.code && { failureReason: intent.last_payment_error.code }),
      };
    },
  };
}
