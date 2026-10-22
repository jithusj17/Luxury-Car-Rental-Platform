import type { BookingStatus, Currency, PriceBreakdown } from "@car-rental/contracts";

export type Booking = {
  id: string;
  vehicleId: string;
  renterId: string;
  ownerId: string;
  pickupDate: string;
  returnDate: string;
  timezone: string;
  status: BookingStatus;
  price: PriceBreakdown;
  holdExpiresAt: Date | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  refundPercent: number | null;
  idempotencyKey: string;
  requestHash: string;
  createdAt: Date;
};

/** Statuses that occupy the vehicle calendar. */
export const BLOCKING_STATUSES: readonly BookingStatus[] = ["PENDING_PAYMENT", "CONFIRMED"];

/**
 * Lifecycle:
 *   PENDING_PAYMENT → CONFIRMED (paid) | CANCELLED (by a party) | EXPIRED (hold lapsed)
 *   EXPIRED → CONFIRMED  only when a late payment arrives and the dates are still free
 *   CONFIRMED → CANCELLED
 */
const transitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED", "EXPIRED"],
  EXPIRED: ["CONFIRMED"],
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new Error(`Invalid booking transition ${from} → ${to}`);
}

/** 10% platform service fee on the rental subtotal, rounded to the cent. */
export const SERVICE_FEE_RATE = 0.1;

export function priceRental(dailyRateCents: number, days: number, currency: Currency): PriceBreakdown {
  const subtotalCents = dailyRateCents * days;
  const serviceFeeCents = Math.round(subtotalCents * SERVICE_FEE_RATE);
  return { days, dailyRateCents, subtotalCents, serviceFeeCents, totalCents: subtotalCents + serviceFeeCents, currency };
}
