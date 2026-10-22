import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { Env } from "../config/env.ts";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(env: Pick<Env, "DATABASE_URL" | "DATABASE_POOL_MAX" | "DATABASE_STATEMENT_TIMEOUT_MS">) {
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: env.DATABASE_STATEMENT_TIMEOUT_MS,
    application_name: "car-rental-api",
  });
  const db = drizzle({ client: pool });

  return {
    pool,
    db,
    async ping(): Promise<void> {
      await pool.query("select 1");
    },
    close: () => pool.end(),
  };
}
