import { z } from "zod";
import { cents, currency } from "./common.ts";

export const paymentStatus = z.enum(["REQUIRES_ACTION", "SUCCEEDED", "FAILED", "CANCELLED"]);
export type PaymentStatus = z.infer<typeof paymentStatus>;

export const payment = z.object({
  id: z.uuid(),
  bookingId: z.uuid(),
  status: paymentStatus,
  amountCents: cents,
  refundedCents: cents,
  currency,
  provider: z.string(),
  /** Opaque value the client passes to the provider's checkout step. */
  clientSecret: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type Payment = z.infer<typeof payment>;

/** Card step of the built-in mock provider (development/test only). */
export const mockConfirmBody = z.object({
  clientSecret: z.string().min(10).max(200),
  cardNumber: z.string().regex(/^\d{12,19}$/, "Enter a card number"),
});
export type MockConfirmBody = z.infer<typeof mockConfirmBody>;

export const earningsSummary = z.object({
  currency,
  /** Rental subtotal of confirmed bookings, net of refunds (service fees excluded). */
  totalEarnedCents: cents,
  upcomingCents: cents,
  confirmedBookings: z.number().int(),
  byMonth: z.array(z.object({ month: z.string(), earnedCents: cents })),
});
export type EarningsSummary = z.infer<typeof earningsSummary>;
