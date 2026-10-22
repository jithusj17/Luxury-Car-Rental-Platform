/**
 * Raised by persistence when the vehicle calendar's exclusion constraint rejects an entry —
 * i.e. the requested period overlaps an active hold, booking, or owner block.
 */
export class ReservationConflictError extends Error {
  constructor() {
    super("Reservation overlaps an existing calendar entry");
    this.name = "ReservationConflictError";
  }
}

/** Raised when the same renter reuses an idempotency key concurrently. */
export class DuplicateIdempotencyKeyError extends Error {
  constructor() {
    super("Idempotency key already used");
    this.name = "DuplicateIdempotencyKeyError";
  }
}
