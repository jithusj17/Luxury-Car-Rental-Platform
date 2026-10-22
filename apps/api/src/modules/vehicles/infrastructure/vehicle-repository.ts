import { and, asc, count, desc, eq, gte, inArray, lte, notInArray, sql, type SQL } from "drizzle-orm";
import type { TransactionManager } from "../../../shared/db/transaction.ts";
import type { VehicleRepository, VehicleSearchFilters } from "../application/ports.ts";
import type { Vehicle } from "../domain/vehicle.ts";
import { vehicles } from "./schema.ts";

type Row = typeof vehicles.$inferSelect;
const toVehicle = (row: Row): Vehicle => row as Vehicle;

/** Escapes LIKE wildcards in user input. */
const likeLiteral = (value: string) => `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function searchConditions(f: VehicleSearchFilters): SQL[] {
  const conditions: (SQL | undefined)[] = [
    eq(vehicles.status, "ACTIVE"),
    f.q ? sql`(${vehicles.make} || ' ' || ${vehicles.model}) ilike ${likeLiteral(f.q)}` : undefined,
    f.city ? sql`lower(${vehicles.city}) = lower(${f.city})` : undefined,
    f.category ? eq(vehicles.category, f.category) : undefined,
    f.transmission ? eq(vehicles.transmission, f.transmission) : undefined,
    f.fuelType ? eq(vehicles.fuelType, f.fuelType) : undefined,
    f.seatsMin ? gte(vehicles.seats, f.seatsMin) : undefined,
    f.priceMinCents !== undefined ? gte(vehicles.dailyRateCents, f.priceMinCents) : undefined,
    f.priceMaxCents !== undefined ? lte(vehicles.dailyRateCents, f.priceMaxCents) : undefined,
    f.excludeIds?.length ? notInArray(vehicles.id, f.excludeIds) : undefined,
  ];
  return conditions.filter((c): c is SQL => c !== undefined);
}

/** Deterministic ordering (id tie-breaker) keeps pagination stable. */
function searchOrder(sort: VehicleSearchFilters["sort"]): SQL[] {
  switch (sort) {
    case "price_asc":
      return [asc(vehicles.dailyRateCents), asc(vehicles.id)];
    case "price_desc":
      return [desc(vehicles.dailyRateCents), asc(vehicles.id)];
    case "newest":
    case "recommended":
      return [desc(vehicles.createdAt), asc(vehicles.id)];
  }
}

export function createVehicleRepository(tx: TransactionManager): VehicleRepository {
  const db = () => tx.executor();

  return {
    async create(vehicle) {
      const [row] = await db().insert(vehicles).values(vehicle).returning();
      return toVehicle(row!);
    },

    async findById(id) {
      const [row] = await db().select().from(vehicles).where(eq(vehicles.id, id));
      return row ? toVehicle(row) : null;
    },

    async findManyByIds(ids) {
      if (ids.length === 0) return [];
      const rows = await db().select().from(vehicles).where(inArray(vehicles.id, [...new Set(ids)]));
      return rows.map(toVehicle);
    },

    async findActiveBySlug(slug) {
      const [row] = await db()
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.slug, slug), eq(vehicles.status, "ACTIVE")));
      return row ? toVehicle(row) : null;
    },

    async updateIfVersion(id, expectedVersion, patch) {
      const [row] = await db()
        .update(vehicles)
        .set({ ...patch, version: sql`${vehicles.version} + 1`, updatedAt: sql`now()` })
        .where(and(eq(vehicles.id, id), eq(vehicles.version, expectedVersion)))
        .returning();
      return row ? toVehicle(row) : null;
    },

    async search(filters, { page, pageSize }) {
      const where = and(...searchConditions(filters));
      const [rows, totals] = await Promise.all([
        db()
          .select()
          .from(vehicles)
          .where(where)
          .orderBy(...searchOrder(filters.sort))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db().select({ total: count() }).from(vehicles).where(where),
      ]);
      return { items: rows.map(toVehicle), total: totals[0]?.total ?? 0 };
    },

    async listForAdmin({ q, status }, { page, pageSize }) {
      const where = and(
        q ? sql`(${vehicles.make} || ' ' || ${vehicles.model} || ' ' || ${vehicles.city}) ilike ${likeLiteral(q)}` : undefined,
        status ? eq(vehicles.status, status) : undefined,
      );
      const [rows, totals] = await Promise.all([
        db().select().from(vehicles).where(where).orderBy(desc(vehicles.createdAt), asc(vehicles.id)).limit(pageSize).offset((page - 1) * pageSize),
        db().select({ total: count() }).from(vehicles).where(where),
      ]);
      return { items: rows.map(toVehicle), total: totals[0]?.total ?? 0 };
    },

    async countSummary() {
      const [row] = await db()
        .select({ total: count(), listed: count(sql`case when ${vehicles.status} = 'ACTIVE' then 1 end`) })
        .from(vehicles);
      return row ?? { total: 0, listed: 0 };
    },

    async listByOwner(ownerId, { page, pageSize }, status) {
      const where = and(eq(vehicles.ownerId, ownerId), status ? eq(vehicles.status, status) : undefined);
      const [rows, totals] = await Promise.all([
        db()
          .select()
          .from(vehicles)
          .where(where)
          .orderBy(desc(vehicles.createdAt), asc(vehicles.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db().select({ total: count() }).from(vehicles).where(where),
      ]);
      return { items: rows.map(toVehicle), total: totals[0]?.total ?? 0 };
    },
  };
}
