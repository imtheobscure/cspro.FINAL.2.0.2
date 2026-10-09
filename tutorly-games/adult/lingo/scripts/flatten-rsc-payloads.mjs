/**
 * Make the exported RSC payloads resolvable on a plain static host.
 *
 * `next build` (output: "export") writes a route's segment payload as a
 * DIRECTORY:
 *
 *     out/practice/__next.practice/__PAGE__.txt
 *
 * but the client router requests the flattened dot form:
 *
 *     /tutolingo/practice/__next.practice.__PAGE__.txt?_rsc=…
 *
 * On Next's own server that URL is handled for you; on Apache/LiteSpeed/nginx or
 * any plain file server it 404s, which shows up as a handful of "Failed to load
 * resource: 404" errors in the console on every prefetched route (and quietly
 * downgrades client-side prefetching to full navigations).
 *
 * This script copies each `__PAGE__.txt` up one level under the flattened name,
 * so both URLs resolve. It is idempotent and a no-op if a future Next version
 * already emits the flattened files.
 *
 * Usage: node scripts/flatten-rsc-payloads.mjs [outDir]   (default: out)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const target = path.resolve(root, process.argv[2] ?? "out");

if (!fs.existsSync(target)) {
  console.error(`[rsc-payloads] ${path.relative(root, target)}/ not found — run next build first.`);
  process.exit(1);
}

let created = 0;
let skipped = 0;

/** Walk every directory, looking for `__next.<segment>/__PAGE__.txt` pairs. */
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    walk(full);

    if (!entry.name.startsWith("__next.")) continue;
    const payload = path.join(full, "__PAGE__.txt");
    if (!fs.existsSync(payload)) continue;

    const alias = path.join(dir, `${entry.name}.__PAGE__.txt`);
    if (fs.existsSync(alias)) {
      skipped++;
      continue;
    }
    fs.copyFileSync(payload, alias);
    created++;
  }
};

walk(target);

console.log(
  `[rsc-payloads] ${created} payload alias(es) written, ${skipped} already present (in ${path.relative(root, target)}/)`,
);
