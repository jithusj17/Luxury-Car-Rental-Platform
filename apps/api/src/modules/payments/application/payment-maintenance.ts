import { applyProviderStatus, queueRefund } from "./payment-events.ts";
import { PAYMENT_JOBS, type PaymentDeps } from "./ports.ts";

const STALE_AFTER_MS = 10 * 60_000;

/**
 * Port used by the bookings module (inside its transactions).
 */
export function createPaymentCoordinator(deps: PaymentDeps) {
  return {
    async refundBooking(bookingId: string, percent: number, reason: string): Promise<void> {
      const payment = await deps.payments.findActiveForBooking(bookingId);
      if (payment?.status === "SUCCEEDED") {
        await queueRefund(deps, payment.id, percent, `cancel:${bookingId}`, reason);
      }
    },

    /**
     * Deferred to the outbox so booking transactions never lock payment rows (webhooks lock
     * payment → calendar → booking; doing payment work here would invert that order).
     */
    async cancelOpenPayment(bookingId: string): Promise<void> {
      await deps.outbox.enqueue(PAYMENT_JOBS.cancelOpenForBooking, { bookingId });
    },
  };
}

/**
 * Reconciliation for uncertain outcomes (lost or delayed webhooks, timeouts): payments that stayed
 * open too long are re-read from the provider and the authoritative status is applied.
 */
export async function reconcileStalePayments(deps: PaymentDeps, limit = 50): Promise<number> {
  const now = deps.clock.now();
  const stale = await deps.payments.findStaleOpen(new Date(now.getTime() - STALE_AFTER_MS), limit);
  for (const payment of stale) {
    if (!payment.providerPaymentId) {
      await deps.payments.update(payment.id, { status: "FAILED", failureReason: "provider_unconfirmed" });
      continue;
    }
    const remote = await deps.provider.retrievePayment(payment.providerPaymentId);
    await deps.tx.run(async () => {
      if (remote.status !== "requires_action") {
        await applyProviderStatus(deps, payment.providerPaymentId!, remote.status, remote.failureReason);
        return;
      }
      // Still unpaid at the provider; if the hold is gone, stop the payment from completing later.
      const booking = await deps.bookings.getForPayment(payment.bookingId);
      if (booking?.status !== "PENDING_PAYMENT") {
        await deps.payments.update(payment.id, { status: "CANCELLED" });
        await deps.outbox.enqueue(PAYMENT_JOBS.cancelAtProvider, { providerPaymentId: payment.providerPaymentId });
      }
    });
  }
  return stale.length;
}

/** Outbox handler: executes a reserved refund at the provider (idempotent). */
export async function executeRefund(deps: PaymentDeps, refundId: string): Promise<void> {
  const refund = await deps.payments.findRefund(refundId);
  if (!refund || refund.status !== "PENDING") return;
  const payment = await deps.payments.findById(refund.paymentId);
  if (!payment?.providerPaymentId) throw new Error(`Refund ${refundId} has no provider payment`);
  const result = await deps.provider.refund({
    providerPaymentId: payment.providerPaymentId,
    amountCents: refund.amountCents,
    idempotencyKey: refund.idempotencyKey,
  });
  await deps.payments.completeRefund(refundId, "SUCCEEDED", result.providerRefundId);
}

/** Outbox handler: stops a still-open payment attempt for a booking that no longer needs it. */
export async function cancelOpenPaymentForBooking(deps: PaymentDeps, bookingId: string): Promise<void> {
  await deps.tx.run(async () => {
    const open = await deps.payments.findActiveForBooking(bookingId);
    if (open?.status !== "REQUIRES_ACTION") return;
    if (!open.providerPaymentId) {
      await deps.payments.update(open.id, { status: "CANCELLED" });
      return;
    }
    const locked = await deps.payments.findByProviderIdForUpdate(open.providerPaymentId);
    if (locked?.status !== "REQUIRES_ACTION") return; // a webhook settled it meanwhile
    await deps.payments.update(open.id, { status: "CANCELLED" });
    await deps.outbox.enqueue(PAYMENT_JOBS.cancelAtProvider, { providerPaymentId: open.providerPaymentId });
  });
}

/** Outbox handler: cancels at the provider; if it had already captured, run the late-success path. */
export async function cancelAtProvider(deps: PaymentDeps, providerPaymentId: string): Promise<void> {
  const result = await deps.provider.cancelPayment(providerPaymentId);
  if (result.status === "succeeded") {
    await deps.tx.run(() => applyProviderStatus(deps, providerPaymentId, "succeeded"));
  }
}
