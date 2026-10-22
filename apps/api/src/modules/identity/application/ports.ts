import type { UpdateProfileBody, UserRole } from "@car-rental/contracts";
import type { Clock } from "../../../shared/clock.ts";
import type { TransactionManager } from "../../../shared/db/transaction.ts";
import type { EmailQueue } from "../../notifications/application/email.ts";
import type { User, UserWithPassword } from "../domain/user.ts";

export interface UserRepository {
  /** Returns null when the email is already registered. */
  create(input: { id: string; email: string; passwordHash: string; fullName: string; roles: UserRole[] }): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByIdWithPassword(id: string): Promise<UserWithPassword | null>;
  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;
  updateProfile(id: string, patch: UpdateProfileBody): Promise<User>;
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
  addRole(id: string, role: UserRole): Promise<User>;
  /** Display names for many users in one query (avoids N+1 in list views). */
  findNames(ids: string[]): Promise<Map<string, string>>;
}

export type SessionRecord = { id: string; userId: string; expiresAt: Date };

export interface SessionRepository {
  create(input: SessionRecord & { tokenHash: string; ip: string | null; userAgent: string | null }): Promise<void>;
  findValid(tokenHash: string, now: Date): Promise<{ session: SessionRecord; user: User } | null>;
  extend(sessionId: string, expiresAt: Date): Promise<void>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  deleteAllForUser(userId: string, exceptSessionId?: string): Promise<void>;
  deleteExpired(now: Date): Promise<number>;
}

export interface PasswordResetRepository {
  create(input: { id: string; userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  /** Atomically marks an unused, unexpired token as used; returns its user id. */
  consume(tokenHash: string, now: Date): Promise<string | null>;
  invalidateForUser(userId: string, now: Date): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export type IdentityDeps = {
  users: UserRepository;
  sessions: SessionRepository;
  resets: PasswordResetRepository;
  hasher: PasswordHasher;
  emails: EmailQueue;
  tx: TransactionManager;
  clock: Clock;
  config: { sessionTtlDays: number; webUrl: string };
};
