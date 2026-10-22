import type { UserRole } from "@car-rental/contracts";
import { and, eq, gt, isNull, lt, ne } from "drizzle-orm";
import type { TransactionManager } from "../../../shared/db/transaction.ts";
import type { PasswordResetRepository, SessionRepository } from "../application/ports.ts";
import { passwordResetTokens, sessions, users } from "./schema.ts";

export function createSessionRepository(tx: TransactionManager): SessionRepository {
  const db = () => tx.executor();

  return {
    async create(input) {
      await db().insert(sessions).values(input);
    },

    async findValid(tokenHash, now) {
      const [row] = await db()
        .select({
          session: { id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt },
          user: {
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            phone: users.phone,
            roles: users.roles,
            suspendedAt: users.suspendedAt,
            createdAt: users.createdAt,
          },
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        // A suspended account's sessions stop working immediately.
        .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now), isNull(users.suspendedAt)));
      return row ? { session: row.session, user: { ...row.user, roles: row.user.roles as UserRole[] } } : null;
    },

    async extend(sessionId, expiresAt) {
      await db().update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId));
    },

    async deleteByTokenHash(tokenHash) {
      await db().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },

    async deleteAllForUser(userId, exceptSessionId) {
      const condition = exceptSessionId
        ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
        : eq(sessions.userId, userId);
      await db().delete(sessions).where(condition);
    },

    async deleteExpired(now) {
      const deleted = await db().delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id });
      return deleted.length;
    },
  };
}

export function createPasswordResetRepository(tx: TransactionManager): PasswordResetRepository {
  const db = () => tx.executor();

  return {
    async create(input) {
      await db().insert(passwordResetTokens).values(input);
    },

    async consume(tokenHash, now) {
      const [row] = await db()
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, now),
          ),
        )
        .returning({ userId: passwordResetTokens.userId });
      return row?.userId ?? null;
    },

    async invalidateForUser(userId, now) {
      await db()
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
    },
  };
}
