import { randomUUID } from "node:crypto";
import type { LoginBody, RegisterBody } from "@car-rental/contracts";
import { errors } from "../../../shared/errors/app-error.ts";
import { generateToken, hashToken } from "../../../shared/security/tokens.ts";
import { DEFAULT_ROLES, type User } from "../domain/user.ts";
import type { IdentityDeps } from "./ports.ts";

export type ClientInfo = { ip: string | null; userAgent: string | null };
export type IssuedSession = { user: User; token: string; expiresAt: Date };
export type AuthenticatedSession = { user: User; sessionId: string; refreshedExpiresAt: Date | null };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Verifying against this keeps login timing the same whether or not the email exists. */
let dummyHash: Promise<string> | undefined;

async function issueSession(deps: IdentityDeps, user: User, client: ClientInfo): Promise<IssuedSession> {
  const token = generateToken();
  const expiresAt = new Date(deps.clock.now().getTime() + deps.config.sessionTtlDays * DAY_MS);
  await deps.sessions.create({ id: randomUUID(), userId: user.id, tokenHash: hashToken(token), expiresAt, ...client });
  return { user, token, expiresAt };
}

export async function register(deps: IdentityDeps, input: RegisterBody, client: ClientInfo): Promise<IssuedSession> {
  const passwordHash = await deps.hasher.hash(input.password);
  return deps.tx.run(async () => {
    const user = await deps.users.create({
      id: randomUUID(),
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      roles: DEFAULT_ROLES,
    });
    if (!user) throw errors.conflict("An account with this email already exists");
    await deps.emails.enqueue({ template: "welcome", to: user.email, data: { name: user.fullName } });
    return issueSession(deps, user, client);
  });
}

export async function login(deps: IdentityDeps, input: LoginBody, client: ClientInfo): Promise<IssuedSession> {
  const record = await deps.users.findByEmailWithPassword(input.email);
  dummyHash ??= deps.hasher.hash("timing-equalisation-password");
  const valid = await deps.hasher.verify(input.password, record?.passwordHash ?? (await dummyHash));
  if (!record || !valid) throw errors.unauthenticated("Invalid email or password");
  const { passwordHash: _omit, ...user } = record;
  return issueSession(deps, user, client);
}

export async function logout(deps: IdentityDeps, token: string): Promise<void> {
  await deps.sessions.deleteByTokenHash(hashToken(token));
}

/**
 * Resolves a session cookie to its user. Sessions slide: once less than half the lifetime is left,
 * the expiry is pushed out again so active users are not logged out mid-task.
 */
export async function authenticate(deps: IdentityDeps, token: string): Promise<AuthenticatedSession | null> {
  const now = deps.clock.now();
  const found = await deps.sessions.findValid(hashToken(token), now);
  if (!found) return null;

  const ttlMs = deps.config.sessionTtlDays * DAY_MS;
  const remainingMs = found.session.expiresAt.getTime() - now.getTime();
  let refreshedExpiresAt: Date | null = null;
  if (remainingMs < ttlMs / 2) {
    refreshedExpiresAt = new Date(now.getTime() + ttlMs);
    await deps.sessions.extend(found.session.id, refreshedExpiresAt);
  }
  return { user: found.user, sessionId: found.session.id, refreshedExpiresAt };
}
