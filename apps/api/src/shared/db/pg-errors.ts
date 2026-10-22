/** Postgres SQLSTATE codes the application reacts to. */
export const PgErrorCode = {
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
  checkViolation: "23514",
  exclusionViolation: "23P01",
  serializationFailure: "40001",
  deadlockDetected: "40P01",
} as const;

type PgLikeError = { code?: string; constraint?: string };

/** Drizzle wraps driver errors; the Postgres error is on `cause`. */
function unwrap(error: unknown): PgLikeError | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as PgLikeError & { cause?: unknown };
  if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) return candidate;
  return candidate.cause ? unwrap(candidate.cause) : undefined;
}

export function isPgError(error: unknown, code: string, constraint?: string): boolean {
  const pgError = unwrap(error);
  if (!pgError || pgError.code !== code) return false;
  return constraint === undefined || pgError.constraint === constraint;
}

/** Transient concurrency aborts: safe for the client to retry the same request. */
export function isTransientConflict(error: unknown): boolean {
  return isPgError(error, PgErrorCode.deadlockDetected) || isPgError(error, PgErrorCode.serializationFailure);
}

/** Connection-level failures: the database is unreachable or went away mid-request. */
export function isDatabaseUnavailable(error: unknown): boolean {
  const pgError = unwrap(error);
  if (pgError?.code && /^(08|57P0[1-3]|53300)/.test(pgError.code)) return true;
  const message = error instanceof Error ? `${error.message} ${String((error as { cause?: unknown }).cause ?? "")}` : "";
  return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|Connection terminated|timeout exceeded when trying to connect/i.test(message);
}
