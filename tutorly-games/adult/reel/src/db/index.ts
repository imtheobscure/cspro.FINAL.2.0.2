import { drizzle as drizzleNode, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";

/**
 * Two drivers, one interface.
 *
 *  • DATABASE_URL set   → node-postgres (the production path, unchanged)
 *  • DATABASE_URL unset → PGlite, a real Postgres compiled to WASM, persisted in
 *    .pglite/ so the whole platform runs locally with no server to install.
 *
 * PGlite is the actual Postgres engine, so every query the app already uses
 * (jsonb, enums, `count(*) filter`, arrays, timezone timestamps) behaves the same
 * in both modes. The schema is applied from the generated SQL in drizzle/ before
 * the first query — see src/lib/bootstrap.ts.
 */
export type Database = NodePgDatabase<Record<string, never>>;

export type DriverKind = "postgres" | "pglite";

const databaseUrl = process.env.DATABASE_URL;

export const driver: DriverKind = databaseUrl ? "postgres" : "pglite";

const globalForDb = globalThis as typeof globalThis & {
  __tutoflixPool?: Pool;
  __tutoflixPglite?: PGlite;
  __tutoflixDb?: Database;
};

function createPostgres(): Database {
  const pool =
    globalForDb.__tutoflixPool ??
    new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.PGPOOL_MAX ?? 10),
    });
  if (process.env.NODE_ENV !== "production") globalForDb.__tutoflixPool = pool;
  return drizzleNode(pool) as unknown as Database;
}

function createPglite(): Database {
  const location = process.env.PGLITE_DIR ?? ".pglite";
  const client = globalForDb.__tutoflixPglite ?? new PGlite(location);
  globalForDb.__tutoflixPglite = client;
  return drizzlePglite(client) as unknown as Database;
}

export const db: Database = globalForDb.__tutoflixDb ?? (driver === "postgres" ? createPostgres() : createPglite());

if (process.env.NODE_ENV !== "production") globalForDb.__tutoflixDb = db;

/** Raw handle used by the bootstrap step to apply the generated DDL in embedded mode. */
export function pgliteClient(): PGlite | null {
  return globalForDb.__tutoflixPglite ?? null;
}

export function describeDriver(): string {
  return driver === "postgres" ? "postgres (DATABASE_URL)" : `pglite (embedded, ${process.env.PGLITE_DIR ?? ".pglite"})`;
}
