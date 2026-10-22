import { errors } from "../../../shared/errors/app-error.ts";
import { addDays, daysBetween, startOfDay, todayIn } from "./calendar-dates.ts";
import type { Booking } from "./booking.ts";

/** Bookings can be made up to a year ahead. */
export const MAX_ADVANCE_DAYS = 365;
/** Renters get a full refund when cancelling at least this long before pickup day starts. */
export const FULL_REFUND_NOTICE_HOURS = 48;
export const LATE_CANCELLATION_REFUND_PERCENT = 50;

export type RentalRules = { timezone: string; minDays: number; maxDays: number };

/**
 * Validates a requested rental against the vehicle's rules and returns its length in days.
 * Pickup may be today (vehicle-local) at the earliest.
 */
export function validateRentalPeriod(period: { pickupDate: string; returnDate: string }, rules: RentalRules, now: Date): number {
  const issue = (path: string, message: string) => errors.validation(message, [{ path: `body.${path}`, message }]);
  const today = todayIn(rules.timezone, now);

  if (period.pickupDate < today) throw issue("pickupDate", "Pickup date can't be in the past");
  if (period.pickupDate > addDays(today, MAX_ADVANCE_DAYS)) throw issue("pickupDate", "Bookings open up to a year ahead");
  if (period.returnDate <= period.pickupDate) throw issue("returnDate", "Return date must be after pickup date");

  const days = daysBetween(period.pickupDate, period.returnDate);
  if (days < rules.minDays) throw issue("returnDate", `This vehicle has a minimum rental of ${rules.minDays} days`);
  if (days > rules.maxDays) throw issue("returnDate", `This vehicle can be rented for at most ${rules.maxDays} days`);
  return days;
}

export type CancellationActor = "renter" | "owner" | "admin";
export type CancellationTerms = { allowed: boolean; refundPercent: number };

/**
 * Who may cancel, and how much of the payment is refunded:
 * - Unpaid holds: either party, nothing to refund.
 * - Confirmed, by renter: until pickup day starts; 100% with ≥48h notice, otherwise 50%.
 * - Confirmed, by owner/admin: until the return day; always 100%.
 */
export function cancellationTerms(
  booking: Pick<Booking, "status" | "pickupDate" | "returnDate" | "timezone">,
  actor: CancellationActor,
  now: Date,
): CancellationTerms {
  const denied = { allowed: false, refundPercent: 0 };
  if (booking.status === "PENDING_PAYMENT") return { allowed: true, refundPercent: 0 };
  if (booking.status !== "CONFIRMED") return denied;

  if (actor === "renter") {
    const pickupStart = startOfDay(booking.pickupDate, booking.timezone).getTime();
    if (now.getTime() >= pickupStart) return denied;
    const hoursNotice = (pickupStart - now.getTime()) / 3_600_000;
    return { allowed: true, refundPercent: hoursNotice >= FULL_REFUND_NOTICE_HOURS ? 100 : LATE_CANCELLATION_REFUND_PERCENT };
  }
  const returnStart = startOfDay(booking.returnDate, booking.timezone).getTime();
  return now.getTime() < returnStart ? { allowed: true, refundPercent: 100 } : denied;
}
