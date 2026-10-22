import type { UserRole } from "@car-rental/contracts";
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
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
  suspendedAt: users.suspendedAt,
  createdAt: users.createdAt,
};

type Row = { id: string; email: string; fullName: string; phone: string | null; roles: string[]; suspendedAt: Date | null; createdAt: Date };
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

    async listForAdmin({ q, role }, { page, pageSize }) {
      // Escape LIKE wildcards in user input.
      const pattern = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : undefined;
      const where = and(
        pattern ? or(ilike(users.email, pattern), ilike(users.fullName, pattern)) : undefined,
        role ? sql`${role} = any(${users.roles})` : undefined,
      );
      const [rows, totals] = await Promise.all([
        db().select(publicColumns).from(users).where(where).orderBy(desc(users.createdAt), asc(users.id)).limit(pageSize).offset((page - 1) * pageSize),
        db().select({ total: count() }).from(users).where(where),
      ]);
      return { items: rows.map(toUser), total: totals[0]?.total ?? 0 };
    },

    async countSummary() {
      const [row] = await db()
        .select({
          total: count(),
          hosts: count(sql`case when 'owner' = any(${users.roles}) then 1 end`),
          admins: count(sql`case when 'admin' = any(${users.roles}) then 1 end`),
          suspended: count(users.suspendedAt),
        })
        .from(users);
      return row ?? { total: 0, hosts: 0, admins: 0, suspended: 0 };
    },

    async setRoles(id, roles) {
      const [row] = await db().update(users).set({ roles, updatedAt: sql`now()` }).where(eq(users.id, id)).returning(publicColumns);
      return row ? toUser(row) : null;
    },

    async setSuspended(id, suspendedAt) {
      const [row] = await db().update(users).set({ suspendedAt, updatedAt: sql`now()` }).where(eq(users.id, id)).returning(publicColumns);
      return row ? toUser(row) : null;
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
