import { randomUUID } from "node:crypto";
import { errors } from "../../../shared/errors/app-error.ts";
import type { User } from "../../identity/domain/user.ts";
import type { Payment } from "../domain/payment.ts";
import { applyProviderStatus } from "./payment-events.ts";
import type { PaymentDeps } from "./ports.ts";

export type StartPaymentResult = { payment: Payment; created: boolean };

/**
 * An open attempt may already be finished at the provider while its webhook is still in flight
 * (e.g. the renter retries right after a decline). Ask the provider and apply the real outcome,
 * so a dead attempt is never handed back to the client.
 */
async function resolveOpenAttempt(deps: PaymentDeps, open: Payment): Promise<Payment | null> {
  if (!open.providerPaymentId) return open;
  const remote = await deps.provider.retrievePayment(open.providerPaymentId);
  if (remote.status === "requires_action") return open;
  await deps.tx.run(() => applyProviderStatus(deps, open.providerPaymentId!, remote.status, remote.failureReason));
  if (remote.status === "succeeded") throw errors.conflict("This booking is already paid");
  return null;
}

/**
 * Opens (or returns the already-open) payment for a held booking. Idempotent by construction:
 * a unique index allows one open-or-succeeded payment per booking, and the provider call is keyed
 * by our payment id, so retries never create a second charge.
 */
export async function startPayment(deps: PaymentDeps, user: User, bookingId: string): Promise<StartPaymentResult> {
  const booking = await deps.bookings.getForPayment(bookingId);
  if (!booking || booking.renterId !== user.id) throw errors.notFound("Booking");

  let existing = await deps.payments.findActiveForBooking(bookingId);
  if (existing?.status === "SUCCEEDED") throw errors.conflict("This booking is already paid");
  if (booking.status !== "PENDING_PAYMENT") throw errors.conflict("This booking is not awaiting payment");
  if (!booking.holdExpiresAt || booking.holdExpiresAt <= deps.clock.now()) {
    throw errors.conflict("Your hold on these dates has expired. Please book again.");
  }
  if (existing) existing = await resolveOpenAttempt(deps, existing);
  if (existing?.providerPaymentId) return { payment: existing, created: false };

  const payment =
    existing ??
    (await deps.payments.insert({
      id: randomUUID(),
      bookingId,
      renterId: user.id,
      amountCents: booking.totalCents,
      currency: booking.currency,
      status: "REQUIRES_ACTION",
      provider: deps.provider.name,
      providerPaymentId: null,
      clientSecret: null,
      failureReason: null,
      createdAt: deps.clock.now(),
    })) ??
    (await deps.payments.findActiveForBooking(bookingId)); // lost a race with a concurrent request
  if (!payment) throw new Error(`Could not open a payment for booking ${bookingId}`);
  if (payment.providerPaymentId) return { payment, created: false };

  // Network call outside any transaction; keyed by our id so a retry reuses the provider payment.
  try {
    const created = await deps.provider.createPayment({
      reference: payment.id,
      amountCents: payment.amountCents,
      currency: payment.currency,
      idempotencyKey: payment.id,
    });
    await deps.payments.update(payment.id, created);
    return { payment: { ...payment, ...created }, created: true };
  } catch {
    await deps.payments.update(payment.id, { status: "FAILED", failureReason: "provider_unavailable" });
    throw errors.unavailable("The payment provider is unavailable. Please try again.");
  }
}
