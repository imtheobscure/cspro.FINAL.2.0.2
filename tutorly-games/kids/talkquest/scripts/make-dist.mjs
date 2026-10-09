/**
 * `next build` with `output: "export"` writes the static site to `out/`.
 *
 * The game's public folder name IS its URL
 * (`/tutorly-games/kids/talkquest/`), and
 * `scripts/collect-standalone-apps.mjs` publishes `<game>/dist/` — so the export
 * is moved to `dist/` here. Doing it with fs (not `mv out dist`) keeps it working
 * on Windows and when `dist/` already exists from a previous build.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const from = path.join(root, "out");
const to = path.join(root, "dist");

if (!fs.existsSync(path.join(from, "index.html"))) {
  console.error(`[talkquest] ${path.relative(root, from)}/index.html was not produced — did the export fail?`);
  process.exit(1);
}

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
fs.rmSync(from, { recursive: true, force: true });

let files = 0;
let bytes = 0;
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      files++;
      bytes += fs.statSync(full).size;
    }
  }
};
walk(to);

console.log(
  `[talkquest] dist/ ready ← out/ (${files} files, ${(bytes / 1048576).toFixed(1)} MB) — public at /tutorly-games/kids/talkquest/`,
);
