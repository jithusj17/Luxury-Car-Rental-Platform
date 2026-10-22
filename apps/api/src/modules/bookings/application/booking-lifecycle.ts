import { errors } from "../../../shared/errors/app-error.ts";
import { isAdmin, type User } from "../../identity/domain/user.ts";
import { assertTransition, type Booking } from "../domain/booking.ts";
import type { Period } from "../domain/calendar-dates.ts";
import { ReservationConflictError } from "../domain/errors.ts";
import { cancellationTerms, type CancellationActor } from "../domain/rental-policy.ts";
import { notifyBookingCancelled, notifyBookingConfirmed } from "./booking-notifications.ts";
import type { BookingDeps } from "./ports.ts";

export function actorFor(booking: Pick<Booking, "renterId" | "ownerId">, user: User): CancellationActor | null {
  if (booking.renterId === user.id) return "renter";
  if (booking.ownerId === user.id) return "owner";
  return isAdmin(user) ? "admin" : null;
}

/**
 * Cancels a booking under the cancellation policy, freeing the dates and queueing any refund atomically.
 * Admins who aren't a party may only cancel through the admin area (`asAdmin`), which audits the action.
 */
export async function cancelBooking(
  deps: BookingDeps,
  user: User,
  bookingId: string,
  reason?: string,
  options: { asAdmin?: boolean } = {},
): Promise<Booking> {
  const now = deps.clock.now();
  const cancelled = await deps.tx.run(async () => {
    const booking = await deps.bookings.findByIdForUpdate(bookingId);
    const actor = booking && actorFor(booking, user);
    if (!booking || !actor || (actor === "admin" && !options.asAdmin)) throw errors.notFound("Booking");

    const terms = cancellationTerms(booking, actor, now);
    if (!terms.allowed) throw errors.conflict("This booking can no longer be cancelled");
    assertTransition(booking.status, "CANCELLED");

    const updated = await deps.bookings.update(booking.id, {
      status: "CANCELLED",
      cancelledAt: now,
      cancelledBy: user.id,
      cancellationReason: reason ?? null,
      refundPercent: terms.refundPercent,
      holdExpiresAt: null,
    });
    await deps.calendar.setBookingEntryActive(booking.id, false);
    if (booking.status === "CONFIRMED") {
      await deps.payments.refundBooking(booking.id, terms.refundPercent, `cancelled-by-${actor}`);
    } else {
      await deps.payments.cancelOpenPayment(booking.id);
    }
    await notifyBookingCancelled(deps, updated);
    return updated;
  });
  return cancelled;
}

/**
 * Inside a booking/block transaction: expires lapsed holds that overlap `period` so their dates can
 * be reused immediately, and cancels their open payment attempts. Late payments are then refunded.
 */
export async function reclaimLapsedHolds(deps: BookingDeps, vehicleId: string, period: Period, now: Date): Promise<void> {
  const ids = await deps.bookings.expireLapsedHoldsOverlapping(vehicleId, period, now);
  for (const id of ids) await deps.payments.cancelOpenPayment(id);
  deps.metrics.holdsExpired.inc(ids.length);
}

/** Releases unpaid holds whose payment window has passed. Idempotent; safe on many instances. */
export async function expireLapsedHolds(deps: BookingDeps, limit = 100): Promise<number> {
  const now = deps.clock.now();
  const ids = await deps.bookings.findLapsedHoldIds(now, limit);
  let expired = 0;
  for (const id of ids) {
    await deps.tx.run(async () => {
      const booking = await deps.bookings.findByIdForUpdate(id);
      if (booking?.status !== "PENDING_PAYMENT" || !booking.holdExpiresAt || booking.holdExpiresAt > now) return;
      await deps.bookings.update(id, { status: "EXPIRED" });
      await deps.calendar.setBookingEntryActive(id, false);
      await deps.payments.cancelOpenPayment(id);
      expired += 1;
    });
  }
  deps.metrics.holdsExpired.inc(expired);
  return expired;
}

export type PaidOutcome = "confirmed" | "already-confirmed" | "slot-lost" | "cancelled";

/**
 * Called by the payments module, inside its transaction, once money is captured.
 * A hold that lapsed is revived only if its dates are still free; otherwise the caller refunds.
 */
export async function confirmPaidBooking(deps: BookingDeps, bookingId: string): Promise<PaidOutcome> {
  const now = deps.clock.now();
  // The vehicle id never changes, so it can be read before locking; the calendar lock is taken
  // before the booking row lock, the same order booking creation uses.
  const snapshot = await deps.bookings.findById(bookingId);
  if (!snapshot) throw new Error(`Booking ${bookingId} not found for payment`);
  return deps.tx.run(async () => {
    await deps.calendar.lockVehicleCalendar(snapshot.vehicleId);
    const booking = await deps.bookings.findByIdForUpdate(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found for payment`);
    if (booking.status === "CONFIRMED") return "already-confirmed";
    if (booking.status === "CANCELLED") return "cancelled";

    if (booking.status === "EXPIRED") {
      try {
        await deps.calendar.setBookingEntryActive(booking.id, true);
      } catch (error) {
        if (error instanceof ReservationConflictError) return "slot-lost";
        throw error;
      }
    }
    assertTransition(booking.status, "CONFIRMED");
    const confirmed = await deps.bookings.update(booking.id, { status: "CONFIRMED", confirmedAt: now, holdExpiresAt: null });
    await notifyBookingConfirmed(deps, confirmed);
    return "confirmed";
  });
}
