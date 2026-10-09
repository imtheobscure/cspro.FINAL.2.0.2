import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { driver, pgliteClient } from "@/db";
import { seedDatabase } from "@/db/seed";

const g = globalThis as typeof globalThis & { __tutoflixReady?: Promise<void> };

/**
 * Applies the generated schema (drizzle/*.sql) to the embedded PGlite database.
 *
 * Real Postgres deployments get their schema from `drizzle-kit migrate`/`push`, so
 * this is a no-op there. Every applied file is recorded in `_tutoflix_migrations`,
 * so adding a table later only runs the new file; files whose objects already
 * exist (a database created before tracking) are marked applied instead of failing.
 */
async function applyEmbeddedSchema(): Promise<void> {
  const client = pgliteClient();
  if (!client) return;
  const dir = path.join(process.cwd(), "drizzle");
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    return; // no migrations shipped with this deployment
  }
  if (!files.length) return;

  await client.exec("create table if not exists _tutoflix_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = await client.query<{ name: string }>("select name from _tutoflix_migrations");
  const applied = new Set(done.rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    try {
      await client.exec(sql.split("--> statement-breakpoint").join(";\n"));
      await client.query("insert into _tutoflix_migrations (name) values ($1) on conflict do nothing", [file]);
      console.log(`[tutoflix] applied ${file}`);
    } catch (err) {
      const message = (err as Error).message ?? "";
      if (/already exists|duplicate key/i.test(message)) {
        await client.query("insert into _tutoflix_migrations (name) values ($1) on conflict do nothing", [file]);
        continue;
      }
      throw new Error(`Migration ${file} failed: ${message}`);
    }
  }
}

/** Creates the schema (embedded mode) and seeds the catalog once per server process. */
export function ensureSeeded(): Promise<void> {
  if (!g.__tutoflixReady) {
    g.__tutoflixReady = (async () => {
      if (driver === "pglite") await applyEmbeddedSchema();
      await seedDatabase();
    })().catch((err) => {
      console.error("Bootstrap failed", err);
      g.__tutoflixReady = undefined;
    });
  }
  return g.__tutoflixReady;
}
