import { randomUUID } from "node:crypto";
import type { Currency, PaymentStatus } from "@car-rental/contracts";
import { and, asc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { isPgError, PgErrorCode } from "../../../shared/db/pg-errors.ts";
import type { TransactionManager } from "../../../shared/db/transaction.ts";
import type { PaymentRepository, WebhookInbox } from "../application/ports.ts";
import type { Payment } from "../domain/payment.ts";
import { payments, paymentWebhookEvents, refunds } from "./schema.ts";

type Row = typeof payments.$inferSelect;
const toPayment = ({ updatedAt: _u, ...row }: Row): Payment => ({
  ...row,
  status: row.status as PaymentStatus,
  currency: row.currency as Currency,
});

export function createPaymentRepository(tx: TransactionManager): PaymentRepository {
  const db = () => tx.executor();
  const now = sql`now()`;

  return {
    async insert(payment) {
      try {
        const [row] = await tx.run(() => db().insert(payments).values(payment).returning());
        return toPayment(row!);
      } catch (error) {
        if (isPgError(error, PgErrorCode.uniqueViolation, "payments_one_active_per_booking")) return null;
        throw error;
      }
    },

    async findById(id) {
      const [row] = await db().select().from(payments).where(eq(payments.id, id));
      return row ? toPayment(row) : null;
    },

    async findActiveForBooking(bookingId) {
      const [row] = await db()
        .select()
        .from(payments)
        .where(and(eq(payments.bookingId, bookingId), inArray(payments.status, ["REQUIRES_ACTION", "SUCCEEDED"])));
      return row ? toPayment(row) : null;
    },

    async findByProviderIdForUpdate(providerPaymentId) {
      const [row] = await db().select().from(payments).where(eq(payments.providerPaymentId, providerPaymentId)).for("update");
      return row ? toPayment(row) : null;
    },

    async update(id, patch) {
      await db().update(payments).set({ ...patch, updatedAt: now }).where(eq(payments.id, id));
    },

    async cancelOtherOpenAttempts(bookingId, exceptPaymentId) {
      const rows = await db()
        .update(payments)
        .set({ status: "CANCELLED", updatedAt: now })
        .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "REQUIRES_ACTION"), ne(payments.id, exceptPaymentId)))
        .returning({ providerPaymentId: payments.providerPaymentId });
      return rows.flatMap((r) => (r.providerPaymentId ? [r.providerPaymentId] : []));
    },

    async findStaleOpen(createdBefore, limit) {
      const rows = await db()
        .select()
        .from(payments)
        .where(and(eq(payments.status, "REQUIRES_ACTION"), lt(payments.createdAt, createdBefore)))
        .orderBy(asc(payments.createdAt))
        .limit(limit);
      return rows.map(toPayment);
    },

    async reserveRefund(refund) {
      const inserted = await db()
        .insert(refunds)
        .values({ ...refund, status: "PENDING" })
        .onConflictDoNothing({ target: refunds.idempotencyKey })
        .returning({ id: refunds.id });
      if (inserted.length === 0) return false;
      // The CHECK constraint (refunded ≤ amount) is the final guard against over-refunding.
      await db()
        .update(payments)
        .set({ refundedCents: sql`${payments.refundedCents} + ${refund.amountCents}`, updatedAt: now })
        .where(eq(payments.id, refund.paymentId));
      return true;
    },

    async findRefund(id) {
      const [row] = await db()
        .select({ id: refunds.id, paymentId: refunds.paymentId, amountCents: refunds.amountCents, idempotencyKey: refunds.idempotencyKey, status: refunds.status })
        .from(refunds)
        .where(eq(refunds.id, id));
      return row ?? null;
    },

    async completeRefund(id, status, providerRefundId) {
      await db().update(refunds).set({ status, providerRefundId }).where(eq(refunds.id, id));
    },
  };
}

export function createWebhookInbox(tx: TransactionManager): WebhookInbox {
  return {
    async recordIfNew(provider, event) {
      const inserted = await tx
        .executor()
        .insert(paymentWebhookEvents)
        .values({ id: randomUUID(), provider, eventId: event.id, type: event.type, payload: event })
        .onConflictDoNothing()
        .returning({ id: paymentWebhookEvents.id });
      return inserted.length > 0;
    },
  };
}
