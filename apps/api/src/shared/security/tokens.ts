import { createHash, randomBytes } from "node:crypto";

/** 256-bit random, URL-safe token (session cookies, password reset links). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Tokens are stored hashed so a database leak cannot be replayed as live sessions. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Stable fingerprint of a request payload (idempotency checks). */
export function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
