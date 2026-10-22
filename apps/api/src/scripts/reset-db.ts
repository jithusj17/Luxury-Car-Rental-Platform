/**
 * Drops and recreates the database named in DATABASE_URL, then applies migrations.
 * For disposable databases only (E2E runs); refuses names that don't end in `_e2e` or `_test`.
 */
import pg from "pg";
import { runMigrations } from "../shared/db/migrate.ts";

const url = new URL(process.env.DATABASE_URL ?? "");
const name = url.pathname.slice(1);
if (!/^[a-z0-9_]+_(e2e|test)$/.test(name)) throw new Error(`Refusing to reset database "${name}"`);

const admin = new URL(url);
admin.pathname = "/postgres";
const client = new pg.Client({ connectionString: admin.toString() });
await client.connect();
await client.query(`drop database if exists ${name} with (force)`);
await client.query(`create database ${name}`);
await client.end();
await runMigrations(url.toString());
console.log(`Reset database ${name}`);
