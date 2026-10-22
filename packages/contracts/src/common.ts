import { z } from "zod";

/** Calendar date, `YYYY-MM-DD`. Rental dates are calendar days in the vehicle's timezone. */
export const isoDate = z.iso.date();

export const uuid = z.uuid();

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });
}

export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number };

export const errorCode = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "BOOKING_CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
  "PAYMENT_ERROR",
  "SERVICE_UNAVAILABLE",
  "INTERNAL_ERROR",
]);
export type ErrorCode = z.infer<typeof errorCode>;

export const errorResponse = z.object({
  error: z.object({
    code: errorCode,
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponse>;

export const idParams = z.object({ id: uuid });

export const currency = z.enum(["USD"]);
export type Currency = z.infer<typeof currency>;

/** Amount in minor units (cents). */
export const cents = z.number().int().nonnegative();
