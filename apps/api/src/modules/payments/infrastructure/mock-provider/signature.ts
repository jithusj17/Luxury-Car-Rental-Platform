import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-mock-signature";
const TOLERANCE_SECONDS = 300;

/** `t=<unix seconds>,v1=<hex HMAC-SHA256 of "t.body">` — the same scheme Stripe uses. */
export function signPayload(secret: string, body: string, at: Date): string {
  const timestamp = Math.floor(at.getTime() / 1000);
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

export function verifySignature(secret: string, body: string, header: string | undefined, now: Date): void {
  const parts = Object.fromEntries((header ?? "").split(",").map((p) => p.split("=") as [string, string]));
  const timestamp = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(timestamp)) throw new Error("Malformed signature header");
  if (Math.abs(now.getTime() / 1000 - timestamp) > TOLERANCE_SECONDS) throw new Error("Signature timestamp outside tolerance");

  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  const actual = Buffer.from(parts.v1, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Signature mismatch");
}
