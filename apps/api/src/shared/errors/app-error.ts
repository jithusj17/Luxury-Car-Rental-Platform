import type { ErrorCode } from "@car-rental/contracts";

const statusByCode: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  BOOKING_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 422,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  PAYMENT_ERROR: 402,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

/** An expected failure with a stable, client-safe code and message. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }

  get statusCode(): number {
    return statusByCode[this.code];
  }
}

export const errors = {
  validation: (message: string, details?: unknown) => new AppError("VALIDATION_ERROR", message, details),
  unauthenticated: (message = "Sign in to continue") => new AppError("UNAUTHENTICATED", message),
  forbidden: (message = "You don't have permission to do that") => new AppError("FORBIDDEN", message),
  notFound: (resource: string) => new AppError("NOT_FOUND", `${resource} not found`),
  conflict: (message: string) => new AppError("CONFLICT", message),
  bookingConflict: (message = "Those dates are no longer available for this vehicle") =>
    new AppError("BOOKING_CONFLICT", message),
  idempotencyConflict: (message: string) => new AppError("IDEMPOTENCY_CONFLICT", message),
  payment: (message: string) => new AppError("PAYMENT_ERROR", message),
  unavailable: (message = "Service temporarily unavailable, please retry") => new AppError("SERVICE_UNAVAILABLE", message),
};
