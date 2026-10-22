import "server-only";
import { cookies } from "next/headers";
import { parseResponse } from "./api-error";

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/**
 * Server-side API call (Server Components). Public data is fetched without credentials;
 * pass `{ auth: true }` to forward the visitor's session cookie.
 */
export async function serverApi<T>(path: string, options: { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.auth) {
    const cookieHeader = (await cookies()).toString();
    if (cookieHeader) headers.cookie = cookieHeader;
  }
  const response = await fetch(`${API_URL}${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  return parseResponse<T>(response);
}
