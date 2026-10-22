import pg from "pg";
import { runMigrations } from "../src/shared/db/migrate.ts";

const TEST_DB = "carrental_test";
export const adminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://postgres:postgres@localhost:5433/postgres";

/** Recreates the test database from migrations once per run — tests always see the real schema. */
export default async function setup(): Promise<void> {
  const admin = new pg.Client({ connectionString: adminUrl });
  try {
    await admin.connect();
  } catch (error) {
    throw new Error(`Postgres is not reachable at ${adminUrl}. Start it with \`docker compose up -d\`.`, { cause: error });
  }
  await admin.query(`drop database if exists ${TEST_DB} with (force)`);
  await admin.query(`create database ${TEST_DB}`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${TEST_DB}`;
  await runMigrations(url.toString());
}
