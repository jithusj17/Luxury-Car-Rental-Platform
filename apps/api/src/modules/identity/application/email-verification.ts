import { randomUUID } from "node:crypto";
import { errors } from "../../../shared/errors/app-error.ts";
import { generateToken, hashToken } from "../../../shared/security/tokens.ts";
import type { User } from "../domain/user.ts";
import type { IdentityDeps } from "./ports.ts";

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Replaces any earlier link and returns the new one. Call inside a transaction with the email it goes into. */
export async function issueVerificationLink(deps: IdentityDeps, userId: string): Promise<string> {
  const token = generateToken();
  const now = deps.clock.now();
  await deps.verifications.invalidateForUser(userId, now);
  await deps.verifications.create({ id: randomUUID(), userId, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + VERIFY_TOKEN_TTL_MS) });
  return `${deps.config.webUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

/** Sends a fresh verification link to a signed-in user who hasn't verified yet. */
export async function resendVerificationEmail(deps: IdentityDeps, userId: string): Promise<void> {
  await deps.tx.run(async () => {
    const user = await deps.users.findById(userId);
    if (!user) throw errors.notFound("User");
    if (user.emailVerifiedAt) throw errors.conflict("Your email is already verified");
    const verifyUrl = await issueVerificationLink(deps, user.id);
    await deps.emails.enqueue({ template: "verify-email", to: user.email, data: { name: user.fullName, verifyUrl } });
  });
}

/** Marks the email verified (the link is single use), then runs the verified-account hook. */
export async function verifyEmail(deps: IdentityDeps, token: string): Promise<User> {
  return deps.tx.run(async () => {
    const now = deps.clock.now();
    const userId = await deps.verifications.consume(hashToken(token), now);
    if (!userId) throw errors.validation("This verification link is invalid or has expired");
    const user = await deps.users.markEmailVerified(userId, now);
    if (!user) throw errors.notFound("User");
    await deps.onEmailVerified?.(user);
    // The hook may have changed roles (configured admins), so return the latest record.
    return (await deps.users.findById(userId)) ?? user;
  });
}
