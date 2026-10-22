import { z } from "zod";
import { cents, currency, isoDate, pageQuery } from "./common.ts";

export const bookingStatus = z.enum(["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "EXPIRED"]);
export type BookingStatus = z.infer<typeof bookingStatus>;

const rentalPeriod = z
  .object({ pickupDate: isoDate, returnDate: isoDate })
  .refine((p) => p.pickupDate < p.returnDate, {
    message: "Return date must be after pickup date",
    path: ["returnDate"],
  });

export const quoteQuery = rentalPeriod;

export const createBookingBody = z
  .object({ vehicleId: z.uuid(), pickupDate: isoDate, returnDate: isoDate })
  .refine((p) => p.pickupDate < p.returnDate, {
    message: "Return date must be after pickup date",
    path: ["returnDate"],
  });
export type CreateBookingBody = z.infer<typeof createBookingBody>;

export const priceBreakdown = z.object({
  days: z.number().int(),
  dailyRateCents: cents,
  subtotalCents: cents,
  serviceFeeCents: cents,
  totalCents: cents,
  currency,
});
export type PriceBreakdown = z.infer<typeof priceBreakdown>;

export const quoteResponse = z.object({
  vehicleId: z.uuid(),
  pickupDate: isoDate,
  returnDate: isoDate,
  available: z.boolean(),
  price: priceBreakdown,
});
export type QuoteResponse = z.infer<typeof quoteResponse>;

export const cancellationPolicy = z.object({
  allowed: z.boolean(),
  /** Percentage of the amount paid that is refunded if cancelled now. */
  refundPercent: z.number().int().min(0).max(100),
});

export const booking = z.object({
  id: z.uuid(),
  status: bookingStatus,
  pickupDate: isoDate,
  returnDate: isoDate,
  price: priceBreakdown,
  holdExpiresAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  confirmedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  cancellationReason: z.string().nullable(),
  refundedCents: cents,
  vehicle: z.object({
    id: z.uuid(),
    slug: z.string(),
    make: z.string(),
    model: z.string(),
    year: z.number().int(),
    city: z.string(),
    imageUrl: z.string().nullable(),
  }),
  renter: z.object({ id: z.uuid(), name: z.string() }),
  owner: z.object({ id: z.uuid(), name: z.string() }),
  cancellation: cancellationPolicy,
});
export type Booking = z.infer<typeof booking>;

export const cancelBookingBody = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type CancelBookingBody = z.infer<typeof cancelBookingBody>;

export const bookingScope = z.enum(["upcoming", "past", "all"]);
export type BookingScope = z.infer<typeof bookingScope>;

export const bookingListQuery = pageQuery.extend({
  scope: bookingScope.default("all"),
  status: bookingStatus.optional(),
  vehicleId: z.uuid().optional(),
});
export type BookingListQuery = z.infer<typeof bookingListQuery>;

export const createBlockBody = z
  .object({
    vehicleId: z.uuid(),
    startDate: isoDate,
    endDate: isoDate,
    note: z.string().trim().max(200).optional(),
  })
  .refine((b) => b.startDate < b.endDate, { message: "End date must be after start date", path: ["endDate"] });
export type CreateBlockBody = z.infer<typeof createBlockBody>;

export const vehicleBlock = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  startDate: isoDate,
  endDate: isoDate,
  note: z.string().nullable(),
});
export type VehicleBlock = z.infer<typeof vehicleBlock>;

export const calendarQuery = z
  .object({ vehicleId: z.uuid(), from: isoDate, to: isoDate })
  .refine((q) => q.from < q.to, { message: "`to` must be after `from`", path: ["to"] });

export const calendarEntry = z.object({
  kind: z.enum(["BOOKING", "OWNER_BLOCK"]),
  id: z.uuid(),
  startDate: isoDate,
  endDate: isoDate,
  label: z.string(),
  status: bookingStatus.nullable(),
});
export type CalendarEntry = z.infer<typeof calendarEntry>;
