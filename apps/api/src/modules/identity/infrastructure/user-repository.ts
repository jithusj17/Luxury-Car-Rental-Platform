import type { UserRole } from "@car-rental/contracts";
import { eq, inArray, sql } from "drizzle-orm";
import { isPgError, PgErrorCode } from "../../../shared/db/pg-errors.ts";
import type { TransactionManager } from "../../../shared/db/transaction.ts";
import type { UserRepository } from "../application/ports.ts";
import type { User } from "../domain/user.ts";
import { users } from "./schema.ts";

const publicColumns = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  phone: users.phone,
  roles: users.roles,
  createdAt: users.createdAt,
};

type Row = { id: string; email: string; fullName: string; phone: string | null; roles: string[]; createdAt: Date };
const toUser = (row: Row): User => ({ ...row, roles: row.roles as UserRole[] });

export function createUserRepository(tx: TransactionManager): UserRepository {
  const db = () => tx.executor();

  return {
    async create(input) {
      try {
        const [row] = await tx.run(() => db().insert(users).values(input).returning(publicColumns));
        return row ? toUser(row) : null;
      } catch (error) {
        if (isPgError(error, PgErrorCode.uniqueViolation)) return null;
        throw error;
      }
    },

    async findById(id) {
      const [row] = await db().select(publicColumns).from(users).where(eq(users.id, id));
      return row ? toUser(row) : null;
    },

    async findByIdWithPassword(id) {
      const [row] = await db()
        .select({ ...publicColumns, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, id));
      return row ? { ...toUser(row), passwordHash: row.passwordHash } : null;
    },

    async findByEmailWithPassword(email) {
      const [row] = await db()
        .select({ ...publicColumns, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.email, email));
      return row ? { ...toUser(row), passwordHash: row.passwordHash } : null;
    },

    async updateProfile(id, patch) {
      const [row] = await db()
        .update(users)
        .set({ ...patch, updatedAt: sql`now()` })
        .where(eq(users.id, id))
        .returning(publicColumns);
      if (!row) throw new Error(`User ${id} vanished during update`);
      return toUser(row);
    },

    async updatePasswordHash(id, passwordHash) {
      await db().update(users).set({ passwordHash, updatedAt: sql`now()` }).where(eq(users.id, id));
    },

    async addRole(id, role) {
      const [row] = await db()
        .update(users)
        .set({ roles: sql`array(select distinct unnest(${users.roles} || array[${role}]::text[]))`, updatedAt: sql`now()` })
        .where(eq(users.id, id))
        .returning(publicColumns);
      if (!row) throw new Error(`User ${id} vanished during update`);
      return toUser(row);
    },

    async findNames(ids) {
      if (ids.length === 0) return new Map();
      const rows = await db()
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(inArray(users.id, [...new Set(ids)]));
      return new Map(rows.map((r) => [r.id, r.fullName]));
    },
  };
}
