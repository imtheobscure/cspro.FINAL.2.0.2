/**
 * `next build` with `output: "export"` writes the static site to `out/`.
 *
 * The folder name inside `dist/` IS the public URL
 * (`/tutorly-games/adult/console/`), and `scripts/collect-standalone-apps.mjs`
 * publishes `<app>/dist/` — so the export is moved here. Done with fs rather than
 * `mv out dist` so it works on Windows and when `dist/` already exists.
 *
 * It also guarantees the two files that make a Playable playable in-rig are in
 * the published folder: `play.php` (the proxy — see src/lib/proxy.ts) and
 * `.htaccess` (the rewrite that hands it the build host + path on Apache hosts
 * where PATH_INFO is dropped). Next copies `public/` verbatim, but dotfiles are
 * not something to bet a feature on, so they are checked and copied explicitly.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const from = path.join(root, "out");
const to = path.join(root, "dist");

if (!fs.existsSync(path.join(from, "index.html"))) {
  console.error(`[console] ${path.relative(root, from)}/index.html was not produced — did the export fail?`);
  process.exit(1);
}

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
fs.rmSync(from, { recursive: true, force: true });

for (const asset of ["play.php", ".htaccess"]) {
  const src = path.join(root, "public", asset);
  const dest = path.join(to, asset);
  if (!fs.existsSync(src)) {
    console.error(`[console] public/${asset} is missing — Playables streaming depends on it.`);
    process.exit(1);
  }
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    console.log(`[console] copied public/${asset} into dist/ (Next skipped it)`);
  }
}

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
  `[console] dist/ ready ← out/ (${files} files, ${(bytes / 1048576).toFixed(1)} MB) — public at /tutorly-games/adult/console/`,
);
