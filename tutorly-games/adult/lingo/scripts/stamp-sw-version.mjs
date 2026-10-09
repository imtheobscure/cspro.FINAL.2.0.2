#!/usr/bin/env node
/**
 * Stamp a fresh cache version into the built service worker.
 *
 * Why this exists
 * ---------------
 * `public/sw.js` is served from a fixed URL, so the browser only notices a new
 * build when that file's bytes change — and until they do, the old worker keeps
 * serving the previous build's HTML out of its cache. A freshly uploaded build
 * therefore looks like nothing happened. The worker keys its cache on `VERSION`
 * for exactly this reason, but bumping it by hand only works while someone
 * remembers.
 *
 * So the version is derived from the build itself: every file Next writes under
 * `_next/static` is content-hashed, so any code or styling change produces a new
 * fingerprint. Identical builds keep the same version and the learner sees no
 * pointless re-download.
 *
 * What survives an update
 * -----------------------
 * Only caches are versioned. Progress (streak, XP, hearts, completed lessons,
 * lesson position) lives in `localStorage`, and the content file the learner
 * loaded lives in IndexedDB, so the old worker's caches are deleted on activate
 * while every byte of the learner's own data is left alone.
 *
 * Usage: node scripts/stamp-sw-version.mjs <out-dir>
 */
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, posix, relative, sep } from "node:path";

const outDir = process.argv[2] || "out";
const swPath = join(outDir, "sw.js");

/** Every file under `dir`, as POSIX-style paths relative to `outDir`. */
async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else if (entry.isFile()) found.push(full);
  }
  return found;
}

const files = (await walk(outDir)).sort();
const swAbs = join(outDir, "sw.js");

// The worker is excluded: it is the file being written, so hashing it would make
// the fingerprint depend on its own previous value.
const fingerprint = createHash("sha256");
for (const file of files) {
  if (file === swAbs) continue;
  const rel = relative(outDir, file).split(sep).join(posix.sep);
  const { size } = await stat(file);
  fingerprint.update(`${rel}:${size}\n`);
}
const version = `lingo-${fingerprint.digest("hex").slice(0, 12)}`;

let sw;
try {
  sw = await readFile(swPath, "utf8");
} catch {
  console.error(`stamp-sw-version: no ${swPath} — run the export first`);
  process.exit(1);
}

// `tutolingo-` is accepted as well as `lingo-` so that an already-stamped file
// from before the rename still matches; `public/sw.js` ships `lingo-vN`.
const pattern = /const VERSION = "(?:lingo|tutolingo)-[^"]*";/;
if (!pattern.test(sw)) {
  console.error(`stamp-sw-version: could not find the VERSION line in ${swPath}`);
  process.exit(1);
}

const current = sw.match(pattern)[0];
const next = `const VERSION = "${version}";`;
if (current === next) {
  console.log(`stamp-sw-version: ${version} (unchanged — same build)`);
} else {
  await writeFile(swPath, sw.replace(pattern, next), "utf8");
  console.log(`stamp-sw-version: ${version} stamped into ${swPath}`);
}
