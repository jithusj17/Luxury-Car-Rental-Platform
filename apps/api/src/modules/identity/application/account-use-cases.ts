import { randomUUID } from "node:crypto";
import type { ChangePasswordBody, ResetPasswordBody, UpdateProfileBody } from "@car-rental/contracts";
import { errors } from "../../../shared/errors/app-error.ts";
import { generateToken, hashToken } from "../../../shared/security/tokens.ts";
import { hasRole, type User } from "../domain/user.ts";
import type { IdentityDeps } from "./ports.ts";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function getUser(deps: IdentityDeps, userId: string): Promise<User> {
  const user = await deps.users.findById(userId);
  if (!user) throw errors.notFound("User");
  return user;
}

/** Always succeeds from the caller's point of view, so it can't be used to discover accounts. */
export async function requestPasswordReset(deps: IdentityDeps, email: string): Promise<void> {
  const user = await deps.users.findByEmailWithPassword(email);
  if (!user) return;

  const token = generateToken();
  const now = deps.clock.now();
  await deps.tx.run(async () => {
    await deps.resets.invalidateForUser(user.id, now);
    await deps.resets.create({
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
    });
    const resetUrl = `${deps.config.webUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await deps.emails.enqueue({ template: "password-reset", to: user.email, data: { name: user.fullName, resetUrl } });
  });
}

/** Sets a new password and signs the account out everywhere. */
export async function resetPassword(deps: IdentityDeps, input: ResetPasswordBody): Promise<void> {
  const passwordHash = await deps.hasher.hash(input.password);
  await deps.tx.run(async () => {
    const userId = await deps.resets.consume(hashToken(input.token), deps.clock.now());
    if (!userId) throw errors.validation("This reset link is invalid or has expired");
    await deps.users.updatePasswordHash(userId, passwordHash);
    await deps.sessions.deleteAllForUser(userId);
  });
}

/** Changes the password and signs out every other session. */
export async function changePassword(
  deps: IdentityDeps,
  userId: string,
  currentSessionId: string,
  input: ChangePasswordBody,
): Promise<void> {
  const user = await deps.users.findByIdWithPassword(userId);
  if (!user) throw errors.notFound("User");
  if (!(await deps.hasher.verify(input.currentPassword, user.passwordHash))) {
    throw errors.validation("Current password is incorrect", [{ path: "body.currentPassword", message: "Incorrect password" }]);
  }
  const passwordHash = await deps.hasher.hash(input.newPassword);
  await deps.tx.run(async () => {
    await deps.users.updatePasswordHash(userId, passwordHash);
    await deps.sessions.deleteAllForUser(userId, currentSessionId);
  });
}

export async function updateProfile(deps: IdentityDeps, userId: string, patch: UpdateProfileBody): Promise<User> {
  return deps.users.updateProfile(userId, patch);
}

/** Opt in to listing vehicles. Idempotent. */
export async function becomeOwner(deps: IdentityDeps, userId: string): Promise<User> {
  const user = await getUser(deps, userId);
  return hasRole(user, "owner") ? user : deps.users.addRole(userId, "owner");
}
