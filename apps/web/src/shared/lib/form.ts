import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError, errorMessage } from "@/shared/api/api-error";

/**
 * Maps API validation issues onto form fields; anything that isn't field-specific becomes
 * the form-level `root` error. Server-side validation stays the source of truth.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly string[]): void {
  if (error instanceof ApiError) {
    const fieldErrors = error.fieldErrors;
    const matched = Object.entries(fieldErrors).filter(([field]) => fields.includes(field));
    for (const [field, message] of matched) setError(field as Path<T>, { type: "server", message });
    if (matched.length > 0 && matched.length === Object.keys(fieldErrors).length) return;
  }
  setError("root" as Path<T>, { type: "server", message: errorMessage(error) });
}
