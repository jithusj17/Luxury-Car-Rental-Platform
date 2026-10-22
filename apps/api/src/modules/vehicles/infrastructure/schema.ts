import { sql } from "drizzle-orm";
import { char, check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "../../identity/infrastructure/schema.ts";

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    slug: text("slug").notNull().unique(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    category: text("category").notNull(),
    seats: integer("seats").notNull(),
    doors: integer("doors").notNull(),
    transmission: text("transmission").notNull(),
    fuelType: text("fuel_type").notNull(),
    color: text("color"),
    description: text("description").notNull().default(""),
    features: text("features").array().notNull().default(sql`'{}'::text[]`),
    dailyRateCents: integer("daily_rate_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    city: text("city").notNull(),
    address: text("address").notNull().default(""),
    timezone: text("timezone").notNull(),
    minDays: integer("min_days").notNull().default(1),
    maxDays: integer("max_days").notNull().default(30),
    status: text("status").notNull(),
    imageUrls: text("image_urls").array().notNull().default(sql`'{}'::text[]`),
    /** Optimistic-concurrency version, bumped on every owner edit. */
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("vehicles_status_check", sql`${t.status} in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')`),
    check("vehicles_rate_check", sql`${t.dailyRateCents} > 0`),
    check("vehicles_days_check", sql`${t.minDays} >= 1 and ${t.minDays} <= ${t.maxDays}`),
    index("vehicles_owner_idx").on(t.ownerId, t.createdAt.desc()),
    index("vehicles_active_city_idx").on(sql`lower(${t.city})`).where(sql`${t.status} = 'ACTIVE'`),
    index("vehicles_active_price_idx").on(t.dailyRateCents, t.id).where(sql`${t.status} = 'ACTIVE'`),
    index("vehicles_active_newest_idx").on(t.createdAt.desc(), t.id).where(sql`${t.status} = 'ACTIVE'`),
  ],
);
