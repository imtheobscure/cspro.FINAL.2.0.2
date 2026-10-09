/**
 * Build Arena — the tutor-operated "Syndicate Learning Engine" that the main
 * app's Combat Arena buttons open at `/tutorly-games/adult/arena/`.
 *
 * Why this exists as its own script: every other adult game is handled by
 * `build-tutorly-games.mjs`, which drives Vite with the checkout's root toolchain.
 * Arena is the one game whose `vite.config.ts` needs more than that — it is a
 * `vite-plugin-singlefile` app that also carries `dist/images/`, and keeping its
 * build in its own small script names that difference in one place instead of
 * hiding a special case inside the games loop.
 *
 * Nothing built it at first, which is why dist/ had no arena/ folder and the
 * dashboard's Combat Arena button dead-ended on the dashboard shell.
 *
 * Output: `tutorly-games/adult/arena/dist/index.html` (a single file) plus
 * `tutorly-games/adult/arena/dist/images/` (its six scene images, referenced
 * relatively).
 *
 *     npm run build:arena
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const appRoot = path.join(root, "tutorly-games", "adult", "arena");
const label = path.relative(root, appRoot).split(path.sep).join("/");
if (!fs.existsSync(path.join(appRoot, "vite.config.ts"))) {
  console.error(`[arena] ${label}/vite.config.ts not found — nothing to build.`);
  process.exit(1);
}

try {
  await build({ root: appRoot, logLevel: "warn" });
  const html = path.join(appRoot, "dist", "index.html");
  if (!fs.existsSync(html)) {
    throw new Error(`build finished but ${label}/dist/index.html was not produced`);
  }
  const kb = Math.round(fs.statSync(html).size / 1024);
  const images = path.join(appRoot, "dist", "images");
  const imgCount = fs.existsSync(images) ? fs.readdirSync(images).length : 0;
  console.log(
    `\n[arena] build summary\n  ✓ ${label}   dist/index.html  ${kb} kB` +
      (imgCount ? `  (+${imgCount} scene images)` : ""),
  );
} catch (err) {
  console.error(`[arena] ✗ ${label}   ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
