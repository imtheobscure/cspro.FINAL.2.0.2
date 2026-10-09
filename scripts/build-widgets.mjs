/**
 * Build the dock-launched WIDGET apps that have no `node_modules` of their own,
 * using the checkout's root vite — the same trick `build-tutorly-games.mjs` uses,
 * so a fresh clone needs no per-widget install.
 *
 * Only the "root-vite" widgets are listed here. The two heavier widgets carry
 * their own toolchain and build themselves:
 *
 *     cd tutorly-widgets/preply-success-advisor && npm run build
 *     cd tutorly-widgets/exam-builder           && npm run build
 *
 * Everything here was previously built (or not) by `build-cscreen.mjs`, which
 * handled exactly one app. That is why the University Manager tile 404'd: it was
 * a widget nobody built and no list mentioned. One script, one list, one place to
 * add the next one.
 *
 * Output: `tutorly-widgets/<widget>/dist/index.html` — a single file, assets
 * inlined by `vite-plugin-singlefile`.
 *
 *     npm run build:widgets                              # all of them
 *     npm run build:widgets -- tutorly-prompter           # just one
 *     npm run build:cscreen                              # alias, see package.json
 *
 * `collect-standalone-apps.mjs` (run by `npm run build`) copies each result into
 * dist/ and refuses to publish a dist/ that would 404 on one of them.
 *
 * NOTE: only the SOURCE lives in this repo folder. Every public URL is served by
 * server.ts out of dist/ and did not change when these apps moved here.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const widgetsRoot = path.join(root, "tutorly-widgets");

const WIDGETS = [
  /**
   * Classroom Screen — the projector app. server.ts has always served
   * `/Tutorly-cscreen-v1/` from dist/, but nothing ever built or collected it, so
   * that route fell through to the dashboard shell and the screen was deployed
   * behind a dead link.
   */
  "Tutorly-cscreen",
  /*
   * University Manager is deliberately NOT listed here any more.
   *
   * Its repo `src/` was OLDER than the build that ships: the sample-data loader
   * and the professor identity (`Dr. Layla Haddad`, `Tutorly University`) exist
   * only in the build, never in that source. Building it here therefore produced a
   * DOWNGRADE and overwrote a newer app with an older one — the exact mistake
   * `collect-standalone-apps.mjs` exists to prevent.
   *
   * The build that ships is now a PREBUILT artifact with no source in the repo,
   * published by `collect-standalone-apps.mjs` from
   * `tutorly-widgets/university-management-system/prebuilt/` — the same
   * arrangement as `tutorly-transcriber-2-v1`. Edit that one file directly; do not
   * re-add this widget here, because a rebuild from source can only be a downgrade.
   */
  /**
   * Voice Transcribe — the live lesson recorder/analyser.
   *
   * It arrived as `tutorly-lesson-insight (1)`, which was a name collision and not
   * a duplicate: the widget already published at `/tutorly-lesson-insight/` is a
   * different app (a self-contained classroom analytics dashboard, no recording, no
   * API), so this one is filed beside it under its own name rather than replacing
   * it. It is published by `collect-standalone-apps.mjs` at
   * `/tutorly-widgets/tutorly-voice-transcribe/` so the folder in dist/ mirrors the
   * folder in the repo, but it has no dock tile yet — nothing links to it.
   *
   * It needs no `node_modules` of its own: every dependency it imports (react,
   * lucide-react, @google/genai, tailwind) is already in the root toolchain. Note
   * its `.env.local` was deliberately NOT carried over — a live key does not belong
   * in a source folder, and the app reads the key from its own onboarding modal
   * anyway (localStorage `tutorly_api_key`).
   */
  "tutorly-voice-transcribe",
  /**
   * Tutorly Prompter — the offline teleprompter behind the dock's Prompter tile.
   *
   * It arrived as source only and had never been built, so the tile opened the
   * signpost page instead of the app. Its dependencies (react, lucide-react, clsx,
   * tailwind-merge, zustand, tailwind) are all in the root toolchain, so it needs
   * no `node_modules` of its own and builds with the checkout's vite like the
   * others here. Published at `/tutorly-widgets/tutorly-prompter/` by
   * collect-standalone-apps.mjs.
   */
  "tutorly-prompter",
  /**
   * Lesson Insight — the lesson-quality report the classroom dock opens in a new
   * tab. This entry replaces the old "nothing to build" arrangement: the folder
   * used to hold a single finished `index.html` with no source, which was a
   * DIFFERENT app from the real Tutorly Lesson Insight project. That project is
   * now the source here, so the widget is built like its neighbours.
   *
   * It deliberately does NOT use `vite-plugin-singlefile`: its build is a real
   * `index.html` + `assets/` pair, which is what lets `check-static-deploy.mjs`
   * verify its references the way it does for the Transcriber.
   */
  "tutorly-lesson-insight",
];

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const wanted = only.length ? WIDGETS.filter((w) => only.includes(w)) : WIDGETS;
if (!wanted.length) {
  console.error(`[widgets] no such widget. Known: ${WIDGETS.join(", ")}`);
  process.exit(1);
}

const results = [];

for (const widget of wanted) {
  const appRoot = path.join(widgetsRoot, widget);
  // The config (react, tailwind, singlefile) comes from the widget's own
  // vite.config.ts, which vite picks up because `root` points at that folder.
  if (!fs.existsSync(path.join(appRoot, "vite.config.ts"))) {
    results.push({ widget, ok: false, note: `no vite.config.ts in tutorly-widgets/${widget}` });
    continue;
  }

  const started = Date.now();
  try {
    await build({ root: appRoot, logLevel: "warn" });
    const html = path.join(appRoot, "dist", "index.html");
    if (!fs.existsSync(html)) throw new Error("build finished but dist/index.html was not produced");
    results.push({
      widget,
      ok: true,
      kb: Math.round(fs.statSync(html).size / 1024),
      ms: Date.now() - started,
    });
  } catch (err) {
    results.push({ widget, ok: false, note: err instanceof Error ? err.message : String(err) });
  }
}

console.log("\n[widgets] build summary");
for (const r of results) {
  console.log(
    r.ok
      ? `  ✓ ${r.widget.padEnd(30)} dist/index.html  ${String(r.kb).padStart(4)} kB  (${(r.ms / 1000).toFixed(1)}s)`
      : `  ✗ ${r.widget.padEnd(30)} ${r.note}`,
  );
}

// A failed widget leaves dist/ missing that folder; collect-standalone-apps.mjs
// then refuses to publish. Fail here too, so CI and `npm run build` see it.
if (results.some((r) => !r.ok)) process.exitCode = 1;
