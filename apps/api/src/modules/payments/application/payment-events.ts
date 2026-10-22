import { randomUUID } from "node:crypto";
import { errors } from "../../../shared/errors/app-error.ts";
import { canTransition, refundAmount } from "../domain/payment.ts";
import { PAYMENT_JOBS, type PaymentDeps, type ProviderEvent, type ProviderPaymentStatus } from "./ports.ts";

/**
 * Queues a refund in the current transaction. The refund row reserves the amount (so concurrent
 * cancellations can't over-refund) and its idempotency key makes the provider call safe to retry.
 */
export async function queueRefund(deps: PaymentDeps, paymentId: string, percent: number, key: string, reason: string): Promise<void> {
  const payment = await deps.payments.findById(paymentId);
  if (!payment || payment.status !== "SUCCEEDED") return;
  const amountCents = refundAmount(payment, percent);
  if (amountCents === 0) return;
  const refundId = randomUUID();
  const reserved = await deps.payments.reserveRefund({ id: refundId, paymentId, amountCents, reason, idempotencyKey: key });
  if (reserved) await deps.outbox.enqueue(PAYMENT_JOBS.refund, { refundId });
}

async function markSucceeded(deps: PaymentDeps, paymentId: string, bookingId: string): Promise<void> {
  // Any other open attempt for this booking is now redundant (and would violate the one-active index).
  for (const providerPaymentId of await deps.payments.cancelOtherOpenAttempts(bookingId, paymentId)) {
    await deps.outbox.enqueue(PAYMENT_JOBS.cancelAtProvider, { providerPaymentId });
  }
  await deps.payments.update(paymentId, { status: "SUCCEEDED", succeededAt: deps.clock.now(), failureReason: null });

  const outcome = await deps.bookings.confirmPaid(bookingId);
  if (outcome === "slot-lost" || outcome === "cancelled") {
    // Money arrived after the hold was released or the booking was cancelled: give it back in full.
    deps.metrics.latePaymentRefunds.inc();
    await queueRefund(deps, paymentId, 100, `late-payment:${paymentId}`, `late-payment-${outcome}`);
  }
}

/**
 * Applies a provider-reported status to our payment, in the caller's transaction.
 * Out-of-order and repeated reports are harmless: only valid transitions take effect.
 */
export async function applyProviderStatus(
  deps: PaymentDeps,
  providerPaymentId: string,
  status: ProviderPaymentStatus,
  failureReason?: string,
): Promise<void> {
  const payment = await deps.payments.findByProviderIdForUpdate(providerPaymentId);
  // Unknown id: the event may have raced ahead of our own write. Fail so the provider redelivers.
  if (!payment) throw new Error(`Unknown provider payment ${providerPaymentId}`);

  if (status === "succeeded" && canTransition(payment.status, "SUCCEEDED")) {
    await markSucceeded(deps, payment.id, payment.bookingId);
  } else if (status === "failed" && canTransition(payment.status, "FAILED")) {
    // The booking keeps its hold until it lapses, so the renter can retry with another card.
    await deps.payments.update(payment.id, { status: "FAILED", failureReason: failureReason ?? "payment_failed" });
    deps.metrics.paymentFailures.inc({ reason: failureReason ?? "unknown" });
  } else if (status === "canceled" && canTransition(payment.status, "CANCELLED")) {
    await deps.payments.update(payment.id, { status: "CANCELLED" });
  }
}

const statusByEvent: Record<ProviderEvent["type"], ProviderPaymentStatus> = {
  "payment.succeeded": "succeeded",
  "payment.failed": "failed",
  "payment.canceled": "canceled",
};

/** Verified, de-duplicated webhook processing. Returns false for an already-seen event. */
export async function handleWebhook(
  deps: PaymentDeps,
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
): Promise<boolean> {
  let event: ProviderEvent | null;
  try {
    event = deps.provider.verifyWebhook(rawBody, headers);
  } catch {
    throw errors.validation("Invalid webhook signature");
  }
  if (!event) return false; // authentic but irrelevant event type
  const verified = event;
  return deps.tx.run(async () => {
    if (!(await deps.inbox.recordIfNew(deps.provider.name, verified))) return false;
    await applyProviderStatus(deps, verified.providerPaymentId, statusByEvent[verified.type], verified.failureReason);
    return true;
  });
}
