import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { Clock } from "../../../../shared/clock.ts";
import type { TransactionManager } from "../../../../shared/db/transaction.ts";
import type { PaymentProvider, ProviderEvent, ProviderPaymentStatus } from "../../application/ports.ts";
import { mockProviderPayments, mockProviderRefunds } from "./schema.ts";
import { SIGNATURE_HEADER, verifySignature } from "./signature.ts";

const randomId = (prefix: string) => `${prefix}_${randomBytes(12).toString("hex")}`;

/**
 * Stand-in for a real provider (Stripe-like semantics), backed by its own tables. Development and
 * tests only — `loadEnv` refuses to start production with it.
 */
export function createMockPaymentProvider(tx: TransactionManager, clock: Clock, webhookSecret: string): PaymentProvider {
  const db = () => tx.executor();

  async function load(id: string) {
    const [row] = await db().select().from(mockProviderPayments).where(eq(mockProviderPayments.id, id));
    if (!row) throw new Error(`Mock provider: no payment ${id}`);
    return row;
  }

  return {
    name: "mock",

    async createPayment({ reference, amountCents, currency }) {
      // `reference` (our payment id) is unique: repeating the call returns the same payment.
      const id = randomId("mock_pi");
      await db()
        .insert(mockProviderPayments)
        .values({ id, reference, amountCents, currency, status: "requires_action", clientSecret: `${id}_secret_${randomBytes(12).toString("hex")}` })
        .onConflictDoNothing({ target: mockProviderPayments.reference });
      const [row] = await db().select().from(mockProviderPayments).where(eq(mockProviderPayments.reference, reference));
      return { providerPaymentId: row!.id, clientSecret: row!.clientSecret };
    },

    async retrievePayment(providerPaymentId) {
      const row = await load(providerPaymentId);
      return { status: row.status as ProviderPaymentStatus, failureReason: row.failureReason ?? undefined };
    },

    async cancelPayment(providerPaymentId) {
      await db()
        .update(mockProviderPayments)
        .set({ status: "canceled" })
        .where(and(eq(mockProviderPayments.id, providerPaymentId), eq(mockProviderPayments.status, "requires_action")));
      return { status: (await load(providerPaymentId)).status as ProviderPaymentStatus };
    },

    async refund({ providerPaymentId, amountCents, idempotencyKey }) {
      return tx.run(async () => {
        const [existing] = await db().select().from(mockProviderRefunds).where(eq(mockProviderRefunds.idempotencyKey, idempotencyKey));
        if (existing) return { providerRefundId: existing.id };
        const id = randomId("mock_re");
        await db().insert(mockProviderRefunds).values({ id, paymentId: providerPaymentId, amountCents, idempotencyKey });
        await db()
          .update(mockProviderPayments)
          .set({ refundedCents: sql`${mockProviderPayments.refundedCents} + ${amountCents}` })
          .where(eq(mockProviderPayments.id, providerPaymentId));
        return { providerRefundId: id };
      });
    },

    verifyWebhook(rawBody, headers) {
      const header = headers[SIGNATURE_HEADER];
      verifySignature(webhookSecret, rawBody, Array.isArray(header) ? header[0] : header, clock.now());
      return JSON.parse(rawBody) as ProviderEvent;
    },
  };
}
