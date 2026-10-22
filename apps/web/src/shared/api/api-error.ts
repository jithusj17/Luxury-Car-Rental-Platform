import type { ErrorCode, ErrorResponse } from "@car-rental/contracts";

export type FieldIssue = { path: string; message: string };

/** An error response from the API, in the shared `{ error: { code, message } }` envelope. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: unknown;
  readonly requestId: string | undefined;

  constructor(status: number, body: Partial<ErrorResponse> | undefined) {
    super(body?.error?.message ?? "Something went wrong. Please try again.");
    this.name = "ApiError";
    this.status = status;
    this.code = body?.error?.code ?? (status >= 500 ? "INTERNAL_ERROR" : "VALIDATION_ERROR");
    this.details = body?.error?.details;
    this.requestId = body?.error?.requestId;
  }

  /** Field-level validation issues keyed by field name (`body.email` → `email`). */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const entries = (this.details as FieldIssue[])
      .filter((d) => typeof d?.path === "string")
      .map((d) => [d.path.replace(/^(body|query|params)\./, ""), d.message] as const);
    return Object.fromEntries(entries);
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

/** A user-facing message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please check your connection and try again.";
}

export async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 202) return undefined as T;
  const text = await response.text();
  const body = text ? safeJson(text) : undefined;
  if (!response.ok) throw new ApiError(response.status, body as Partial<ErrorResponse> | undefined);
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
