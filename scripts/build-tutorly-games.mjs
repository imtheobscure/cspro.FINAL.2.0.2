/**
 * Build every Vite game under `tutorly-games/adult/` in one go.
 *
 * The folder names below are the ADULT naming convention: one lower-case word,
 * no hyphens and no digits (`edupoly`, `runner`) — the folder IS the URL, and
 * the Game Hub tile calls `launch("<folder>")` with exactly this word. See
 * `tutorly-games/adult/README.md` before adding or renaming one.
 *
 * Only the Vite games are listed here. Lingo (Next.js export) and the kids' games
 * build with their own `npm run build`, and the two server apps (Reel, Interview)
 * are never copied into dist/ at all — see `collect-standalone-apps.mjs`.
 *
 * Each game is a standalone single-file Vite + React app with its own
 * `vite.config.ts`. This script builds them from the REPO ROOT so a fresh
 * checkout does not need five separate `npm install`s: Node resolves each
 * config's plugins (`@vitejs/plugin-react`, `@tailwindcss/vite`,
 * `vite-plugin-singlefile`) from the game's own `node_modules` when present and
 * from the root's otherwise — the same trick `build-gaming-hub.mjs` uses.
 *
 * Output: `tutorly-games/adult/<game>/dist/index.html` (single file, assets
 * inlined; games that ship extra media keep `dist/images/…`, `dist/sounds/…`).
 *
 *     npm run build:games
 *     npm run build:games -- edupoly            # just one
 *     npm run build:games -- --strict           # exit 1 if any game fails
 *
 * A failing game does NOT stop the rest: the summary prints exactly what
 * failed. `scripts/collect-standalone-apps.mjs` (run by `npm run build`) then
 * refuses to publish a dist/ that would 404 on that game.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const gamesRoot = path.join(root, "tutorly-games", "adult");

const GAMES = [
  "edupoly",
  "hotseat",
  "ladder",
  "werewolf",
  "runner",
  // The React video-lesson platform (Flix). It is a Vite app like the games, so
  // it builds and collects through the same path — its own config carries
  // `base: "/tutorly-games/adult/flix/"`.
  "flix",
  /**
   * Deck and FlexCards. They arrived as finished single-file builds and used to be
   * copied into dist/ verbatim; their real source was promoted into the canonical
   * folder, so they are Vite games now and MUST be built here. Without this they are
   * collected from whatever `dist/` happens to be lying around — which is how a copy
   * from a previous landing gets published as if it were current.
   */
  "deck",
  "flexcards",
  /**
   * MadLibs — the fill-in-the-blanks story game. It arrived as `tutorly-madlibs`
   * (a hyphen, which the folder convention forbids) and is a real Vite game now,
   * in the folder the Game Hub tile already opens: `madlibs`.
   */
  "madlibs",
  /**
   * TalkArena — the tutor-led classroom speaking platform, and the two halves it
   * was split into.
   *
   * It arrived twice, as two byte-identical copies of the same app
   * (`gamified-language-learning-platform` and `…platform5`): a hyphenated folder
   * name that the convention forbids, and no way to tell the two tiles apart.
   * The app already branded itself TalkArena and had five rooms plus a teaching
   * plan around one arcade game, so the split followed what was already there —
   * the tutor-led rooms stayed together as `talkarena`, and Emoji Flood grew into
   * a game of its own, `shoutout`, with its own splash, room and scoreboard.
   */
  "talkarena",
  "shoutout",
  /**
   * SpeedReader and StoryCraft — the two classroom games that arrived as
   * hyphenated folders (`speed-reader-shadowing-game`,
   * `ai-storytelling-game-architecture`). The convention forbids the hyphens
   * because the folder IS the URL, so both were renamed; they had never been wired
   * to a tile, which is why the old names only need a legacy entry rather than a
   * forwarding page. SpeedReader ships its own `public/images/` (8 scene jpgs that
   * stay in `dist/images/`, like `dungeon`), StoryCraft is one self-contained page.
   */
  "speedreader",
  "storycraft",
  /**
   * GeoSeeker is deliberately NOT in this list, even though it is a Vite game
   * and `collect-standalone-apps.mjs` collects it from its `dist/`.
   *
   * This script builds with the REPO ROOT's vite, which is the right trade when a
   * game has no `node_modules` of its own. GeoSeeker does have one, and the two
   * toolchains are not the same version (root vite 6.4.3 + tailwind 4.3.3 vs
   * geoseeker vite 6.4.1 + tailwind 4.1.18). Running it through here produced
   * different content hashes than the build the hub is already serving; building
   * it in its own folder reproduces that build byte-for-byte. So it builds itself:
   *
   *     cd tutorly-games/adult/geoseeker && npm install && npm run build
   *
   * Same arrangement as the two heavyweight widgets (preply-success-advisor,
   * exam-builder). See its VITE_GAMES entry in collect-standalone-apps.mjs.
   */
];

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const only = args.filter((a) => !a.startsWith("--"));

const wanted = only.length ? GAMES.filter((g) => only.includes(g)) : GAMES;
if (!wanted.length) {
  console.error(`[games] no such game. Known: ${GAMES.join(", ")}`);
  process.exit(1);
}

const results = [];

for (const game of wanted) {
  const dir = path.join(gamesRoot, game);
  const config = path.join(dir, "vite.config.ts");
  if (!fs.existsSync(config)) {
    results.push({ game, ok: false, note: `no vite.config.ts in tutorly-games/adult/${game}` });
    continue;
  }

  const started = Date.now();
  try {
    await build({ root: dir, configFile: config, logLevel: "warn" });
    const html = path.join(dir, "dist", "index.html");
    if (!fs.existsSync(html)) throw new Error("build finished but dist/index.html was not produced");
    results.push({
      game,
      ok: true,
      kb: Math.round(fs.statSync(html).size / 1024),
      ms: Date.now() - started,
    });
  } catch (err) {
    results.push({ game, ok: false, note: err instanceof Error ? err.message : String(err) });
  }
}

console.log("\n[games] build summary");
for (const r of results) {
  console.log(
    r.ok
      ? `  ✓ ${r.game.padEnd(28)} dist/index.html  ${String(r.kb).padStart(4)} kB  (${(r.ms / 1000).toFixed(1)}s)`
      : `  ✗ ${r.game.padEnd(28)} ${r.note}`,
  );
}

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.warn(
    `\n[games] ${failed.length} game(s) failed — dist/ will be missing them (collect-standalone-apps.mjs will refuse to publish that unless you pass --allow-missing).`,
  );
  if (strict) process.exit(1);
}
