/**
 * Collect the standalone sub-app builds into the main `dist/` folder.
 *
 * Every game now lives — in the repo AND on the host — under the same public
 * path, so the folder inside `dist/` is simply the URL:
 *
 *     /gaming-hub                          → dist/gaming-hub/index.html            (script: build-gaming-hub.mjs)
 *     /tutorly-games/adult/lingo           → dist/tutorly-games/adult/lingo/        (Lingo / Next.js)
 *     /tutorly-games/adult/<game>          → dist/tutorly-games/adult/<game>/       (the Vite games, runner, flix)
 *     /tutorly-games/adult/geoseeker       → dist/tutorly-games/adult/geoseeker/    (Vite game, builds itself)
 *     /tutorly-widgets/<app>               → dist/tutorly-widgets/<app>/            (the dock apps)
 *     /tutorly-lessons/<app>               → dist/tutorly-lessons/<app>/            (the lesson apps)
 *
 * The widgets and lessons moved out of the web root into their own folders so that
 * `dist/` mirrors the repo. Every path they used to sit at (`/exam-builder/`,
 * `/Tutorly-cscreen-v1/`, `/tutorly-lesson-insight/`, `/englishlesson2/`, …) is a
 * 301 in `server.ts`, and the apps whose build is not in the repo yet get a
 * signpost page (see SIGNPOSTS) so no dock tile ever lands on the dashboard shell.
 *
 * Why this exists at all: `npm run build` used to leave the sub-apps out of
 * `dist/`, so a deploy silently kept serving the PREVIOUS version of them — and
 * a mistyped folder name showed up in the browser as a wall of 404s instead of a
 * build error. The folder name inside `dist/` is stated separately from the
 * source folder so a game can be moved (as they all were, under
 * `tutorly-games/adult/`) without silently ending up at the wrong URL.
 *
 * Missing sub-app builds FAIL the build by default (that is the whole point), but
 * you can opt out while working on just the main app:
 *
 *     node scripts/collect-standalone-apps.mjs --allow-missing
 *     SKIP_MISSING_APPS=1 npm run build
 *
 * Build every game first with `npm run build:games` (scripts/build-tutorly-games.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { relativizeApp, findRootAbsoluteRefs, trimServiceWorkerPrecache } from "./relativize-app.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const allowMissing =
  process.argv.includes("--allow-missing") || process.env.SKIP_MISSING_APPS === "1";

/**
 * Old-name forwarding pages.
 *
 * Renaming a game changes its folder, and the folder IS its URL, so a
 * bookmarked or previously shared link (`/tutorly-games/adult/tutolingo/`)
 * would dead-end. A stub at the old path costs under a kilobyte each and works on
 * any static host — a CDN, a plain nginx box, or even opened straight off a disk,
 * none of which run `.htaccess`. That is why they are written by DEFAULT:
 *
 *     LEGACY_REDIRECTS=0 npm run build   # to skip them
 *
 * They used to be opt-in to keep `dist/` tidy. The trade is not close: a tidy
 * folder list is worth nothing if a shared link dead-ends, and `server.ts` and
 * `public/.htaccess` cannot cover a host that never executes them.
 *
 * Whatever you choose, a stale COPY of an old build is always deleted (see the
 * `legacy` lists below) — that mistake is what this script exists to prevent,
 * and it is not optional. The web-root forwarding pages are the one exception:
 * their stale builds are still deleted, but the replacement page is opt-in via
 * `ROOT_LEGACY_REDIRECTS=1` (see below).
 */
const writeLegacyRedirects = process.env.LEGACY_REDIRECTS !== "0";

/**
 * Root-level "this app moved" pages.
 *
 * The retired web-root folders (see `ROOT_LEGACY_REDIRECTS`) are cleaned on every
 * build, but the forwarding page itself is written only when asked for. Keeping
 * fifteen ~1 kB folders in the deploy root beside `index.html` is noise, and
 * `server.ts` and `public/.htaccess` already 301 every one of these URLs on the
 * hosts we run. Opt in for a plain static host that executes neither:
 *
 *     ROOT_LEGACY_REDIRECTS=1 npm run build
 */
const writeRootRedirects = process.env.ROOT_LEGACY_REDIRECTS === "1";

/** Where every game source lives, relative to the repo root. */
const GAMES_ROOT = "tutorly-games/adult";
const KIDS_GAMES_ROOT = "tutorly-games/kids";
/**
 * The dock-launched apps (Classroom Screen, Preply Success Advisor, Lesson
 * Insight, University Manager, Exam Builder) live here, next to the games they
 * sit beside in the hub. ONLY the source folder moved into this directory: each
 * app's public URL is served by server.ts out of dist/ and did not change, so no
 * bookmark, route or hub link was touched by the move.
 */
const WIDGETS_ROOT = "tutorly-widgets";
/** The lesson-app sources (the HTML generators and the lesson players). */
const LESSONS_ROOT = "tutorly-lessons";

/**
 * LESSONS note — why `tutorly-lessons/` has no entry in the APPS list above.
 *
 * Of the six folders in `tutorly-lessons/`, four (`Avatar_Lesson`,
 * `Avatar_Lesson_V2`, `Mock-Test`, `Mock_Test_V3`) are pure TypeScript modules:
 * they export the HTML generators the MAIN app imports, so they compile into
 * `dist/assets/main-*.js`, have no URL of their own, and have nothing to copy.
 *
 * The other two (`englishlesson2`, `Video-Lesson`) ARE standalone Vite apps, but
 * neither has ever been built — there is no `dist/` to collect, which is why they
 * are in SIGNPOSTS below rather than here. Listing them here anyway would make a
 * working build FAIL (which is the script's job): it treats a missing `dist/` as
 * "you forgot to build this", exactly as it did before this note existed.
 *
 * When you do build one:
 *     cd tutorly-lessons/<name> && npm install && npm run build
 * then add it here (or let the signpost be replaced by its collected `dist/`) —
 * see its APPS-shaped `hint` in SIGNPOSTS.
 */

/**
 * Apps the dock opens whose real build is not in the repo yet.
 *
 * Each has a tile that opens a URL, and the URL must resolve to SOMETHING or the
 * browser gets the dashboard shell from the catch-all route, which reads as "this
 * app is broken" rather than "it moved". So a signpost page is written at the
 * app's new path — and ONLY when nothing is there yet, so the day the real build
 * is dropped in (or built and collected) the real app wins and the signpost never
 * comes back.
 *
 * These are the same ones the old flat routes pointed at and never found:
 *   · `englishlesson2` — source is in this repo; never built
 *   · `Video-Lesson`   — source is in this repo; never built
 *
 * `tutorly-transcriber-2-v1` used to be listed here. Its build arrived, so it is a
 * real APPS entry now — see `prebuilt/` below, and the note there about the base
 * path it had baked in. `tutorly-prompter` and `whiteboard-application-V2` were the
 * other two: the prompter is now built from its source by `build-widgets.mjs`, and
 * the whiteboard's finished build was recovered from the live server, so both are
 * real APPS entries above and no longer need a signpost.
 */
const SIGNPOSTS = [
  {
    at: `${LESSONS_ROOT}/englishlesson2`,
    title: "English Lesson Studio",
    note: "Its source is in this repo; it has never been built.",
    how: `cd \"${LESSONS_ROOT}/englishlesson2\" && npm install && npm run build, then copy its dist/ into dist/${LESSONS_ROOT}/englishlesson2/`,
  },
  {
    at: `${LESSONS_ROOT}/Video-Lesson`,
    title: "Video Lesson",
    note: "Its source is in this repo; it has never been built.",
    how: `cd \"${LESSONS_ROOT}/Video-Lesson\" && npm install && npm run build, then copy its dist/ into dist/${LESSONS_ROOT}/Video-Lesson/`,
  },
];

/** Vite games: each one builds to <folder>/dist/index.html (single file). */
const VITE_GAMES = [
  "edupoly",
  "hotseat",
  "ladder",
  "werewolf",
  "runner",
  /**
   * Deck and FlexCards — the two that arrived as finished single-file builds and were
   * first renamed into their folders as-is. Their source now lives beside them (a real
   * Vite project each, `vite-plugin-singlefile` so the build is still one page), which is
   * why they are collected from `dist/` rather than copied whole: copying the folder would
   * now sweep up `src/` and `node_modules/`. Build them with
   * `cd tutorly-games/adult/<game> && npm run build`.
   */
  "deck",
  "flexcards",
  /**
   * Flix — the React video-lesson platform. A Vite app like the games, so it lands
   * at `/tutorly-games/adult/flix/` exactly like they do. (Reel, the video platform
   * with its own database, is deliberately NOT in this list: it needs a Node host.)
   */
  "flix",
  /**
   * MadLibs — the fill-in-the-blanks story game. It arrived as `tutorly-madlibs`
   * and its source was promoted into the canonical folder (the signpost that used
   * to sit in `madlibs/` is gone), so it is built and collected from `dist/` now.
   */
  "madlibs",
  /**
   * TalkArena and ShoutOut — one app that arrived twice.
   *
   * Both folders held byte-identical copies of a classroom speaking platform, and
   * a folder here IS a URL, so two copies meant two names and no way to tell the
   * tiles apart. The names say what each half does: `talkarena` is the tutor-led
   * platform (grid rounds, drawing, debate, practice, and the teaching plan built
   * from what the class got wrong), `shoutout` is the emoji-flood arcade that grew
   * out of its fifth room. They cross-link, and they deliberately do NOT share
   * localStorage keys (`ta.` / `so.`) — same origin, same tutor, two apps.
   */
  "talkarena",
  "shoutout",
  /**
   * SpeedReader and StoryCraft — the classroom pair that came in as hyphenated
   * folders the convention forbids. SpeedReader is the projector karaoke-shadowing
   * arena (PTE Read Aloud, live pronunciation scoring); StoryCraft is the GM-run
   * story engine, a canvas for the class plus a control panel in a second window.
   * Both are single-file Vite builds with a relative base; SpeedReader keeps
   * `dist/images/` for its eight scene jpgs.
   */
  "speedreader",
  "storycraft",
  /**
   * GeoSeeker — promoted from STATIC_GAMES once its SOURCE arrived.
   *
   * It used to be a folder of finished build output copied whole (`index.html` +
   * `assets/`), which is fine right up until the day someone needs to change it.
   * The source project landed afterwards, in the folder of the same name, so the
   * folder now holds `src/`, `node_modules/` and a `vite.config.ts` — and a
   * whole-folder copy would have swept 364 installed packages into dist/.
   *
   * The rebuild was verified byte-for-byte against the build that was already
   * live (the three `dist/assets/*` files are identical), so this is exactly the
   * page the hub has been serving — now regenerable.
   *
   * It builds itself rather than through `build-tutorly-games.mjs`, because that
   * script uses the repo root's vite and geoseeker's own toolchain is a different
   * version (see the note in that file's GAMES list):
   * `cd tutorly-games/adult/geoseeker && npm install && npm run build`.
   */
  "geoseeker",
];

/**
 * Folders copied verbatim (no build step) — they are already a finished static
 * site, so their repo folder IS their `dist/` folder: `index.html` plus whatever
 * assets it references (`geoseeker/assets/`, `chess/chess-hero.jpg`).
 *
 * These used to be PLACEHOLDER_GAMES — folder + a signpost `index.html` saying
 * "build not uploaded yet". The builds arrived (the user keeps copies in
 * `tutorly-games/adult/backup/`), so they are real games now and are copied whole.
 *
 * `deck` and `flexcards` were two of those seven; they are VITE_GAMES now, because
 * their source was promoted into the folder after the landing. A folder with a `src/`
 * and a `node_modules/` in it must NEVER be copied whole.
 *
 * `geoseeker` was the third to leave this list for exactly that reason: it had been
 * a copied-whole static build, and then its source project arrived into the same
 * folder — see its VITE_GAMES entry above.
 *
 * `dungeon` was one of them too. It is a BUILT app now (see the APPS entry below) and its
 * source project lives in the folder of the same name: the stale single-file page that
 * used to sit there shipped before the game moved under `/tutorly-games/adult/`, so its
 * artwork was referenced root-absolute and 404'd on the deployed URL. Copying that folder
 * verbatim would keep overwriting the real build.
 */
const STATIC_GAMES = ["chess", "tales", "feed"];

/**
 * Adult games whose folder exists and is served as-is, but whose build has not
 * been uploaded yet: the folder holds a signpost `index.html`. They are still
 * collected, so the Game Hub tile lands on a real page instead of a 404 — drop
 * the real build in and it takes over unchanged.
 *
 * (Console used to be here, described as "the one server app left". It is a
 * static export now, with its Playables proxy shipped as `play.php` inside it —
 * see APPS below. MadLibs was the last entry: its source moved into the folder
 * and it is built as a Vite game, so it lives in VITE_GAMES above now.)
 */
const PLACEHOLDER_GAMES = [];

/**
 * ADULT RENAMES — old folder → new folder.
 *
 * The adult games were renamed to the same convention the kids' games use (one
 * lower-case word, no hyphens, no digits, named after what the player does), so
 * every old URL needs a forwarding page: `tutolingo` → `lingo`, `3d-monopoly` →
 * `edupoly`, and the seven games that only ever had a folder name in the hub
 * (`dd-survival-game` → `dungeon`, `tutorly-chess` → `chess`, …). The stub is
 * written by the loop at the bottom of this file; the stale dist copy of the old
 * name is deleted first (see `legacy` in APPS below).
 */
const ADULT_LEGACY = {
  lingo: ["tutolingo"],
  runner: ["tuto_runner"],
  flix: ["tutoflix"],
  geoseeker: ["GeoSeeker"],
  edupoly: ["3d-monopoly"],
  hotseat: ["3d-millionaire-game"],
  ladder: ["3d-survival-snake-ladder"],
  werewolf: ["3d-werewolf-game"],
  dungeon: ["dd-survival-game"],
  tales: ["Story-teller-game"],
  chess: ["tutorly-chess"],
  deck: ["3d-flashcard"],
  flexcards: ["3d-flexcards"],
  madlibs: ["tutorly-madlibs"],
  feed: ["tutorly-instalesson"],
  console: ["develop-tutorly-consol-app"],
  // Arrived as `gamified-educational-quiz-platform`: the folder is the public URL,
  // so it took a one-word name before it was ever deployed. Listed here anyway so a
  // copy built under the old name can never survive in dist/.
  casharena: ["gamified-educational-quiz-platform"],
  // The doubled classroom platform: one app, two identical folders, both with a
  // hyphenated name the convention forbids. If either was ever built into a dist
  // under its old name, this is what removes it on the next build.
  talkarena: ["gamified-language-learning-platform"],
  shoutout: ["gamified-language-learning-platform5"],
  // Arrived as `speed-reader-shadowing-game` and `ai-storytelling-game-architecture`.
  // Both are multi-word hyphenated names, which the convention forbids because the
  // folder IS the public URL, and neither had been given a hub tile yet — so they
  // were renamed before they could ever be shared. Listed here anyway, so a copy
  // built under the old name can never survive in dist/.
  speedreader: ["speed-reader-shadowing-game"],
  storycraft: ["ai-storytelling-game-architecture"],
  // Arrived as `language-learning-party-arena` — three folders from the user's
  // downloads, two of them byte-identical. The name is now the one lower-case word
  // the convention asks for (`party`), and the old hyphenated folder is listed so a
  // copy built under it can never survive a deploy.
  party: ["language-learning-party-arena"],
};

/** Old folder names of the games above, as they must be deleted from dist/. */
const adultLegacyPaths = (game) =>
  (ADULT_LEGACY[game] ?? []).flatMap((old) => [`${GAMES_ROOT}/${old}`, `${GAMES_ROOT}/${old}/out`, old]);

/**
 * RETIRED WEB-ROOT FOLDERS — apps that sat directly beside index.html and have
 * since moved under a group folder.
 *
 * Every one of these is a stale copy in an upload of dist/: the live server held
 * `combat-arena/`, `content-creator-v1/`, `tutor-leaderboard/`, the FLAT
 * `tutorly-transcriber-2-v1/` build and the rest, and because a request for a real
 * folder wins over any rewrite rule, each one keeps serving its old build from the
 * old URL forever. Deleting them here means the deploy itself removes them.
 *
 * A redirect stub is then written at each old path. `public/.htaccess` and
 * `server.ts` carry the same redirects, but a stub is plain HTML: it works on any
 * static host, on a CDN, and even when opened straight off the disk, which is what
 * makes a collected dist/ self-contained rather than Apache-only.
 *
 *   key   the folder as it used to be at the web root
 *   value the path it lives at now
 */
const ROOT_LEGACY_REDIRECTS = {
  "combat-arena": "/tutorly-games/adult/arena/",
  "content-creator-v1": "/tutorly-widgets/content-creator/",
  // `tutor-leaderboard` is deliberately still listed even though the app is
  // retired: an older upload may still hold a real `tutor-leaderboard/` folder at
  // the web root, and a real folder beats a rewrite rule on Apache. Retiring it
  // here deletes that stale copy and leaves a plain signpost in its place, which
  // is what actually kills the old URL.
  "tutor-leaderboard": "/",
  // The flat Transcriber that shipped at the web root before it moved under
  // /tutorly-widgets/. It is the single most important one to retire: its service
  // worker still caches the broken page from this URL, so an old bookmark would
  // keep showing the pre-fix build no matter what was deployed.
  "tutorly-transcriber-2-v1": "/tutorly-widgets/tutorly-transcriber-2-v1/",
  "Tutorly-cscreen-v1": "/tutorly-widgets/Tutorly-cscreen/",
  "Tutorly-cscreen": "/tutorly-widgets/Tutorly-cscreen/",
  "preply-success-advisor-v1": "/tutorly-widgets/preply-success-advisor/",
  "preply-success-advisor": "/tutorly-widgets/preply-success-advisor/",
  "exam-builder-v1": "/tutorly-widgets/exam-builder/",
  "exam-builder": "/tutorly-widgets/exam-builder/",
  "whiteboard-application-V2": "/tutorly-widgets/whiteboard-application-V2/",
  "tutorly-lesson-insight": "/tutorly-widgets/tutorly-lesson-insight/",
  "university-management-system-v1": "/tutorly-widgets/university-management-system/",
  "university-management-system": "/tutorly-widgets/university-management-system/",
  "tutorly-prompter": "/tutorly-widgets/tutorly-prompter/",
};

/**
 * TUTORLY KIDS — the kids' games.
 *
 * Each one is a Next.js STATIC EXPORT (no server, no database) that builds into
 * its own `<folder>/dist/`, so it lands in dist/ as plain files at
 * `/tutorly-games/kids/<folder>/` — exactly like Tutolingo. The folder name is
 * the public URL, so renaming a game means renaming the folder here.
 *
 * NAMING CONVENTION for every kids' game, present and future:
 *   · the FOLDER (and therefore the URL) is a single lower-case word, no hyphens
 *     and no digits, short enough to type: `wordpop`, `toybox`, `talkquest`;
 *   · the in-app name is that word in CamelCase — `WordPop`, `LearnLoop`;
 *   · the game is named after what the child actually DOES, not what it teaches,
 *     and it must be findable by a six-year-old reading it aloud;
 *   · every game ships its own tile in `gaming-hub/src/data/activities.ts`
 *     (Kids' Corner) that calls `launchKids("<folder>")`;
 *   · when a game is renamed, add the old folder to `legacy` below so a stale
 *     build with the previous base path baked in cannot survive in dist/.
 */
const KIDS_GAMES = ["wordpop", "learnloop", "bilibuddies", "playschool", "toybox", "heroarcade", "talkquest"];

/** Old folder names of the games above — their dist/ copies must be deleted. */
const KIDS_GAMES_LEGACY = {
  wordpop: ["say-the-word"],
  learnloop: ["learn-together"],
  bilibuddies: ["bilingual-game"],
  playschool: ["preschool-learning-game"],
  toybox: ["multilingual-preschool-learning-game2", "playbox"],
  heroarcade: ["interactive-bilingual-language-game"],
  talkquest: ["interactive-bilingual-learning-game4"],
};

const APPS = [
  {
    /**
     * Classroom Screen (`Tutorly-cscreen/`) — the projector app: the canvas, the
     * leaderboard, reactions, timers and the classroom chat.
     *
     * `vite-plugin-singlefile`, so its whole build is ONE index.html.
     *
     * Published under the source folder's own name, so the folder in dist/ mirrors
     * the folder in the repo: `/tutorly-widgets/Tutorly-cscreen/`. It used to sit
     * at the web root as `Tutorly-cscreen-v1`; that old path is in `legacy` (so its
     * stale dist copy is deleted) and `server.ts` 301s it to the new one.
     *
     * Built by `npm run build:cscreen`, which `npm run build` runs first — before
     * that the route was served an index.html that was never built and always
     * fell through to the dashboard shell.
     */
    name: `${WIDGETS_ROOT}/Tutorly-cscreen`,
    from: path.join(root, WIDGETS_ROOT, "Tutorly-cscreen", "dist"),
    hint: `npm run build:cscreen`,
    legacy: ["Tutorly-cscreen-v1", "Tutorly-cscreen"],
  },
  {
    /**
     * Preply Success Advisor — the tutor's own coaching app (Tutor board,
     * Insights, tasks & reminders). `vite-plugin-singlefile`, so its whole build
     * is ONE index.html; server.ts serves it from dist/ at
     * /preply-success-advisor/. Without this entry the folder is never copied
     * and that route dead-ends, which is exactly how the deployed copy stayed a
     * build behind the source.
     *
     * The folder used to be called `preply-success-advisor-v1`, and then it sat at
     * the web root under its own name. Both old paths are in `legacy` so no stale
     * copy can survive, and `server.ts` 301s them to /tutorly-widgets/.
     */
    name: `${WIDGETS_ROOT}/preply-success-advisor`,
    from: path.join(root, WIDGETS_ROOT, "preply-success-advisor", "dist"),
    hint: `cd ${WIDGETS_ROOT}/preply-success-advisor && npm run build`,
    legacy: ["preply-success-advisor-v1", "preply-success-advisor"],
  },
  {
    /**
     * Exam Builder — the proctored assessment builder behind the classroom home
     * screen's Exam Builder widget (`PREMIUM_WIDGET_IDS` in ClassroomScreen.tsx).
     *
     * `vite-plugin-singlefile`, so its whole build is ONE index.html.
     *
     * The widget and server.ts used to point at `exam-builder-v1`, which was never
     * built and never existed in dist/ — the tile was a dead link on the deployed
     * site. It is now published under its source folder's name,
     * `/tutorly-widgets/exam-builder/`, and both old paths are in `legacy` so a
     * stale copy can never win.
     */
    name: `${WIDGETS_ROOT}/exam-builder`,
    from: path.join(root, WIDGETS_ROOT, "exam-builder", "dist"),
    hint: `cd ${WIDGETS_ROOT}/exam-builder && npm run build`,
    legacy: ["exam-builder-v1", "exam-builder"],
  },
  {
    /**
     * Lesson Insight — the lesson-quality report the classroom dock and the
     * learner-profile "Lesson Insight" tabs open in a new tab.
     *
     * This used to be published as a FINISHED single-file page copied straight
     * from the folder. That page was NOT this app: it was a self-contained
     * classroom analytics dashboard with no recording, no API and no report
     * schema. The real Tutorly Lesson Insight project (the React/TS app with the
     * speaking, grammar, vocabulary and homework report) is now the source here
     * and is built by `build-widgets.mjs`, so `from` points at its `dist/`.
     *
     * The old app's source still exists in the repo under
     * `tutorly-widgets/tutorly-voice-transcribe/`, published separately — nothing
     * was lost by replacing this folder's contents.
     */
    name: `${WIDGETS_ROOT}/tutorly-lesson-insight`,
    from: path.join(root, WIDGETS_ROOT, "tutorly-lesson-insight", "dist"),
    hint: `cd ${WIDGETS_ROOT}/tutorly-lesson-insight && npm run build`,
    legacy: ["tutorly-lesson-insight"],
  },
  {
    /**
     * Whiteboard ("ProBoard") — the teaching whiteboard the classroom dock's
     * Whiteboard tile opens at `/tutorly-widgets/whiteboard-application-V2/`.
     *
     * It arrived from the live server as a FINISHED single-file page: there is no
     * source project for it in the repo, so the folder is copied whole (the same
     * shape as Lesson Insight above). Until this entry existed the tile opened a
     * signpost page, because `SIGNPOSTS` was the only thing writing that path — and
     * `server.ts` 301s the old root-level `/whiteboard-application-V2/` here.
     */
    name: `${WIDGETS_ROOT}/whiteboard-application-V2`,
    from: path.join(root, WIDGETS_ROOT, "whiteboard-application-V2"),
    hint: "nothing to build — tutorly-widgets/whiteboard-application-V2 is a finished single-file app",
    legacy: ["whiteboard-application-V2"],
  },
  {
    /**
     * Content Creator ("ContentAlchemy AI") — the VIP studio tile in the Widget
     * Studio. It arrived from the live server as a FINISHED Vite build
     * (`index.html` + `assets/`), so the folder is copied whole: the same shape as
     * the Whiteboard above, and the reason there is no build script for it.
     *
     * Before this entry existed the tile was dead TWICE over: `addWidget` had no
     * `content-creator` branch and `renderWidget` had no case for it, so clicking it
     * fell through to creating a widget that rendered `null` — an invisible widget
     * that still counted in `widgets.length`, which is what made the "Ready to
     * teach?" hero vanish with nothing appearing in its place.
     *
     * It used to sit at the web root as `content-creator-v1`; that path is in
     * `ROOT_LEGACY_REDIRECTS`, so the old URL forwards here and the stale dist copy
     * is deleted on the next build.
     */
    name: `${WIDGETS_ROOT}/content-creator`,
    from: path.join(root, WIDGETS_ROOT, "content-creator"),
    hint: "nothing to build — tutorly-widgets/content-creator is a finished Vite build",
    legacy: ["content-creator", "content-creator-v1"],
  },
  /*
   * Tutor Leaderboard ("TutorGlory") was REMOVED here.
   *
   * The app was retired, so nothing may publish it again: its folder is gone from
   * the repo, the Widget Studio tile is gone from `ClassroomScreen.tsx`, its
   * `.htaccess`/`server.ts` redirects are gone, and its sitemap entry is gone.
   *
   * `ROOT_LEGACY_REDIRECTS` still retires the old web-root `tutor-leaderboard/`
   * folder, because an upload of an older dist/ may still carry a stale copy at
   * that path and a real folder always wins over a rewrite rule.
   */
  {
    /**
     * Tutorly Prompter — the offline teleprompter behind the dock's Prompter tile.
     *
     * Like the classroom screen it is a `vite-plugin-singlefile` build with no
     * `node_modules` of its own, so `scripts/build-widgets.mjs` builds it with the
     * checkout's root vite. Its source was in the repo from the start but had never
     * been built, so the tile served the SIGNPOST page; the source is real now and
     * the built artifact is what ships.
     */
    name: `${WIDGETS_ROOT}/tutorly-prompter`,
    from: path.join(root, WIDGETS_ROOT, "tutorly-prompter", "dist"),
    hint: `npm run build:widgets`,
    legacy: ["tutorly-prompter"],
  },
  {
    /**
     * University Manager — the standalone management app the classroom dock opens
     * at `/university-management-system/` in a new tab.
     *
     * A PREBUILT widget: `prebuilt/index.html` is the ONLY copy of this app, and
     * there is no source for it in the repo — the same arrangement as
     * `tutorly-transcriber-2-v1` above.
     *
     * It used to be built from `tutorly-widgets/university-management-system/src/`
     * by `scripts/build-widgets.mjs`. That is now WRONG and no longer possible: the
     * repo `src/` was OLDER than this build (the sample-data loader and the
     * professor identity, `Dr. Layla Haddad` / `Tutorly University`, exist only in
     * the build), so a rebuild from source produced a DOWNGRADE and replaced a newer
     * app with an older one — the exact mistake this script exists to prevent. The
     * widget was removed from `build-widgets.mjs` with the source, so a `dist/` is
     * never produced for it again.
     *
     * A single `vite-plugin-singlefile` build, so there is no build step: edit
     * `tutorly-widgets/university-management-system/prebuilt/index.html` itself.
     *
     * `legacy` keeps both old names cleaned up: an older build shipped under each of
     * them and must not survive a deploy.
     */
    name: `${WIDGETS_ROOT}/university-management-system`,
    from: path.join(root, WIDGETS_ROOT, "university-management-system", "prebuilt"),
    hint: `edit ${WIDGETS_ROOT}/university-management-system/prebuilt/index.html directly — the repo has no source to build from`,
    legacy: ["university-management-system-v1", "university-management-system"],
  },
  {
    /**
     * Voice Transcribe — the live lesson recorder/analyser, filed beside Lesson
     * Insight under its own name because it is a DIFFERENT app, not a newer copy of
     * it (that one is a self-contained analytics dashboard; this one records and
     * transcribes). No dock tile yet — it is published so the folder in dist/
     * mirrors the folder in the repo and the URL is there if a tile is wanted.
     *
     * Its `.env.local` was deliberately left out of the repo: it held a live Gemini
     * key, and the app reads the key from its own onboarding modal
     * (localStorage `tutorly_api_key`) so it never needed to be baked in.
     */
    name: `${WIDGETS_ROOT}/tutorly-voice-transcribe`,
    from: path.join(root, WIDGETS_ROOT, "tutorly-voice-transcribe", "dist"),
    hint: `npm run build:widgets`,
    legacy: [],
  },
  {
    /**
     * Transcriber — the transcription dock app (whisper through onnxruntime-web,
     * running in a web worker).
     *
     * THREE THINGS LIVE IN THIS FOLDER and only one of them ships:
     *
     *   · `prebuilt/`        — the build that SHIPS, and what `from:` points at. It has
     *                          no source in the repo, so it is deliberately NOT a
     *                          `dist/` (that is gitignored) — this folder holds the only
     *                          copy of a working app.
     *   · `prebuilt-server/` — that build's own express server (/api/translate and
     *                          /api/sherpa/*). Kept so the code is not lost; a web root
     *                          must never contain a server, so it is NOT published.
     *   · the project files — `src/`, `package.json`, `vite.config.ts`, `server.ts`,
     *                          `public/`: the app's SOURCE, which arrived separately and
     *                          LATER. It is OLDER than `prebuilt/`: its newest file is
     *                          2026-07-05 and its `server.ts` knows only /api/health and
     *                          /api/translate, while `prebuilt/` was built 2026-09-08 and
     *                          calls /api/sherpa/{status,download,progress}. So
     *                          `npm run build` in here produces a DOWNGRADE — point
     *                          `from:` at its `dist/` only once newer source turns up.
     *                          Replacing a newer build with an older one is the exact
     *                          mistake this script exists to prevent.
     *
     * What that source did provide is the ROOT CAUSE, now fixed where it belongs:
     * `vite.config.ts` carried `base: "/tutorly-transcriber-2-v1/"`, which is why the
     * build welded that address into every asset URL. Production now reads
     * `base: "./"`, the same convention as the main app, so a build made from this source
     * is address-independent by construction — 0 absolute references, and
     * `relativize-app.mjs` finds nothing left to fix in its `dist/`.
     *
     * `relativize` IS THE POINT OF THIS ENTRY. The app was built with
     * `base: "/tutorly-transcriber-2-v1/"`, so its index.html asked the browser for
     * `/tutorly-transcriber-2-v1/assets/…` while the app was being served from
     * `/tutorly-widgets/tutorly-transcriber-2-v1/`. The page itself loaded, so the
     * failure looked like a broken asset: every script, stylesheet, the worker, the
     * wasm model and the manifest 404'd — and because the catch-all answered those
     * 404s with index.html, the browser blamed the MIME type instead of the path.
     *
     * `scripts/relativize-app.mjs` rewrites that baked-in prefix to a relative one
     * on every copy, so dropping in a fresh (still absolute) build is safe: it can
     * never be published pointing at an address it no longer lives at. The baked-in
     * API path (`…/api/translate`) is rewritten with it, and `retireScopes` clears
     * the service worker the app registered at its OLD address — otherwise that
     * worker keeps serving the broken page out of its cache from a dead URL, and the
     * fix looks like it did nothing.
     *
     */
    name: `${WIDGETS_ROOT}/tutorly-transcriber-2-v1`,
    from: path.join(root, WIDGETS_ROOT, "tutorly-transcriber-2-v1", "prebuilt"),
    hint: `drop a new build into ${WIDGETS_ROOT}/tutorly-transcriber-2-v1/prebuilt/ — NOT \`npm run build\`, whose src/ is older than prebuilt/`,
    legacy: ["tutorly-transcriber-2-v1"],
    relativize: "tutorly-transcriber-2-v1",
    retireScopes: ["/tutorly-transcriber-2-v1/"],
    /**
     * Its service worker listed the 21 MB wasm model for precache. Workbox install is
     * all-or-nothing and the Cache API refuses that one response, so the worker failed
     * to install entirely — infinitely, silently, on every load. Anything over 8 MB is
     * dropped from the precache list, which lets the same worker install; the model is
     * still fetched on demand. See `trimServiceWorkerPrecache`.
     */
    swPrecacheMaxBytes: 8 * 1024 * 1024,
  },
  {
    /**
     * Arena — the tutor-operated "Syndicate Learning Engine".
     *
     * It used to live at the repo ROOT as `combat-arena/` and be served from
     * `/combat-arena/`, which broke the one rule `tutorly-games/adult/README.md`
     * gives every game: the folder IS the public URL, so it must be a single
     * lower-case word with no hyphens. It now sits with the other adult games and
     * is served at `/tutorly-games/adult/arena/`.
     *
     * Nothing built it at first, so the dashboard's Combat Arena button landed on
     * the dashboard shell. It is a `vite-plugin-singlefile` app with no
     * `node_modules` of its own, so `scripts/build-arena.mjs` (`npm run build:arena`)
     * builds it with the checkout's root vite; its `vite.config.ts` used to alias
     * react/react-dom to a `node_modules` that was never installed, which failed the
     * build on the first import. Its six scene images ship in `dist/images/`,
     * referenced relatively.
     *
     * `/combat-arena/` is a `ROOT_LEGACY_REDIRECTS` entry, so the old shared link
     * still lands on the game — and the stale `dist/combat-arena/` folder cannot
     * survive a deploy.
     */
    name: `${GAMES_ROOT}/arena`,
    from: path.join(root, GAMES_ROOT, "arena", "dist"),
    hint: `npm run build:arena`,
    legacy: ["combat-arena"],
  },
  {
    /** Folder inside dist/ — mirrors the public URL exactly. */
    name: "tutorly-games/adult/lingo",
    from: path.join(root, GAMES_ROOT, "lingo", "dist"),
    hint: `cd ${GAMES_ROOT}/lingo && npm run build && mv out dist`,
    legacy: ["tutorly-games/tutolingo", "tutolingo", ...adultLegacyPaths("lingo")],
  },
  {
    /**
     * Interview — a Next.js STATIC EXPORT like Lingo and the kids' games, since
     * its workspace moved into the browser (see the app's `lib/local-store.ts`).
     * It used to be a PostgreSQL server app, which is why it is called out here:
     * the moment it stopped needing a database, the hub tile could go back to a
     * plain folder URL like every other game.
     */
    name: "tutorly-games/adult/interview",
    from: path.join(root, GAMES_ROOT, "interview", "dist"),
    hint: `cd ${GAMES_ROOT}/interview && npm run build`,
    legacy: [],
  },
  {
    /**
     * Console — the games console, and the last adult app to stop being a server.
     *
     * It was Next.js + PostgreSQL with a route handler that proxied every YouTube
     * Playables build to strip its CSP. The workspace and leaderboard now live in
     * the browser and the proxy that genuinely needs a server ships as `play.php`
     * INSIDE the export (see its next.config.ts and src/lib/proxy.ts), so the folder
     * in dist/ is a complete, hostable app: 1,650-game catalog, the rigs, local
     * Unity builds, custom URLs — and in-rig Playables streaming wherever PHP is
     * available. Its old folder name is removed on every build.
     */
    name: "tutorly-games/adult/console",
    from: path.join(root, GAMES_ROOT, "console", "dist"),
    hint: `cd ${GAMES_ROOT}/console && npm run build`,
    legacy: ["tutorly-games/adult/develop-tutorly-consol-app", "develop-tutorly-consol-app"],
  },
  {
    /**
     * Dungeons & Dragons survival — the newest arrival.
     *
     * It arrived from the user's archive as `dd-survival-game` and was renamed to the
     * adult convention (`dungeon`, one lower-case word, no hyphens), so that old name now
     * lives in ADULT_LEGACY as this game's former folder — a stale build under it must
     * never survive a deploy, which is exactly what the prebuilt page in this folder used
     * to be: its artwork was referenced root-absolute, so all ten scene images 404'd on
     * `/tutorly-games/adult/dungeon/`.
     *
     * Single-file Vite build like FlexCards — collected from `dist/` rather than copied
     * whole, because its own `public/images/` artwork ships alongside the page and the
     * folder also holds `src/` and `node_modules/`.
     */
    name: `${GAMES_ROOT}/dungeon`,
    from: path.join(root, GAMES_ROOT, "dungeon", "dist"),
    hint: `cd ${GAMES_ROOT}/dungeon && npx vite build`,
    legacy: adultLegacyPaths("dungeon"),
  },
  {
    /**
     * Party — the classroom game show, and the next app to leave the server group.
     *
     * It arrived as `language-learning-party-arena`: Next.js + PostgreSQL with eight
     * `/api/…` route handlers, a drizzle schema and a room table that the learners'
     * phones polled. Three copies landed in `new/` — two of them byte-identical — so
     * only the fullest build was kept, renamed to the convention's one word, and then
     * converted the way Cash Arena, Interview and Console were: the lesson library,
     * the session log and a phone room all live in the browser now
     * (`src/lib/localApi.ts`), so the export in this folder is a complete app with no
     * host of its own. A room is a channel between windows of the same browser, which
     * is the one thing the old database bought and a static folder cannot.
     */
    name: "tutorly-games/adult/party",
    from: path.join(root, GAMES_ROOT, "party", "dist"),
    hint: `cd ${GAMES_ROOT}/party && npm run build`,
    legacy: adultLegacyPaths("party"),
  },
  {
    /**
     * Cash Arena — the live multiplayer quiz arena, and the newest app to leave the
     * server group.
     *
     * It arrived as Next.js + PostgreSQL with five `/api/…` route handlers, which a
     * static host cannot run and a hub tile cannot reach. Nothing genuinely needed
     * a server: a round is peer-to-peer over WebRTC (the free PeerJS signalling
     * service only introduces the two ends), and the quiz library plus score history
     * fit in the tutor's browser (see its `src/lib/localApi.ts`). So it exports
     * statically like Console and Interview, and its folder in dist/ is a complete
     * app — 7 question types, the cash shop, 15 power-ups, the score sheet and the
     * teaching report, all of it offline-capable.
     */
    name: "tutorly-games/adult/casharena",
    from: path.join(root, GAMES_ROOT, "casharena", "dist"),
    hint: `cd ${GAMES_ROOT}/casharena && npm run build`,
    legacy: adultLegacyPaths("casharena"),
  },
  ...KIDS_GAMES.map((game) => ({
    /**
     * A Kids' Corner game. Like Tutolingo it is a Next.js STATIC EXPORT (no
     * server, no database), so it is files in dist/ rather than a Node app —
     * `npm run build` inside it exports to out/ and moves that to dist/.
     */
    name: `${KIDS_GAMES_ROOT}/${game}`,
    from: path.join(root, KIDS_GAMES_ROOT, game, "dist"),
    hint: `cd ${KIDS_GAMES_ROOT}/${game} && npm run build`,
    legacy: [
      `${KIDS_GAMES_ROOT}/${game}/out`,
      ...(KIDS_GAMES_LEGACY[game] ?? []).flatMap((old) => [`${KIDS_GAMES_ROOT}/${old}`, `${KIDS_GAMES_ROOT}/${old}/out`]),
    ],
  })),
  ...VITE_GAMES.map((game) => ({
    name: `${GAMES_ROOT}/${game}`,
    from: path.join(root, GAMES_ROOT, game, "dist"),
    hint: `cd ${GAMES_ROOT}/${game} && npx vite build`,
    /** Older/other locations that must not survive a deploy with a stale build. */
    legacy: adultLegacyPaths(game),
  })),
  ...STATIC_GAMES.map((game) => ({
    name: `${GAMES_ROOT}/${game}`,
    from: path.join(root, GAMES_ROOT, game),
    hint: `nothing to build — ${GAMES_ROOT}/${game} is a static folder`,
    legacy: adultLegacyPaths(game),
  })),
  ...PLACEHOLDER_GAMES.map((game) => ({
    name: `${GAMES_ROOT}/${game}`,
    from: path.join(root, GAMES_ROOT, game),
    hint: `nothing to build yet — put the built game in ${GAMES_ROOT}/${game}/`,
    legacy: adultLegacyPaths(game),
    /**
     * Copy ONLY the signpost page, never the folder.
     *
     * A placeholder folder is a whole project (its own `node_modules`, `.next`,
     * `src/`, `artifacts/`…). Copying one verbatim is how `interview` once put
     * 28,686 files and 531 MB of dependencies into dist/ — a dist that takes
     * forever to upload and ships someone else's source. Once the real build is
     * dropped in, this list is what it must be measured against: add its entry
     * points here, or (once the folder is a finished static build) drop `only` and
     * copy the folder, as `interview` does now that it is a static export.
     */
    only: ["index.html"],
  })),
];

if (!fs.existsSync(dist)) {
  console.error("[collect-apps] dist/ does not exist — run the app build first.");
  process.exit(1);
}

const missing = [];

for (const app of APPS) {
  const indexHtml = path.join(app.from, "index.html");
  if (!fs.existsSync(indexHtml)) {
    missing.push(app);
    console.warn(`[collect-apps] SKIPPED ${app.name}: ${path.relative(root, app.from)}/index.html not found`);
    console.warn(`                build it with: ${app.hint}`);
    continue;
  }

  const dest = path.join(dist, app.name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  if (app.only) {
    for (const rel of app.only) fs.copyFileSync(path.join(app.from, rel), path.join(dest, rel));
  } else {
    fs.cpSync(app.from, dest, { recursive: true });
  }

  /**
   * Apps built with an absolute `base` carry their old address inside the build.
   * Rewrite it to a relative one, then refuse to publish anything that still names
   * an address it is not served from — a half-rewritten build 404s on every asset,
   * and doing that check here means it fails the BUILD instead of the browser.
   */
  if (app.relativize) {
    const result = relativizeApp(dest, {
      appName: app.relativize,
      extraScopes: app.retireScopes ?? [],
      log: (msg) => console.log(`[collect-apps] ${app.name}: ${msg}`),
    });
    if (result.absoluteLeft.length) {
      console.error(
        `\n[collect-apps] ${app.name} still points at its OLD address: ${result.absoluteLeft.join(", ")}.` +
          `\nIts assets would 404 the moment it is served from /${app.name}/. Rebuild it with base: './',` +
          `\nor extend scripts/relativize-app.mjs to cover this pattern.`,
      );
      process.exit(1);
    }
    findRootAbsoluteRefs(dest, (msg) => console.log(`[collect-apps] ${app.name}: ${msg}`));
  }

  /**
   * An oversized precache entry makes the whole service worker un-installable (above),
   * so the build drops it instead of shipping a worker that can never activate.
   */
  if (app.swPrecacheMaxBytes) {
    trimServiceWorkerPrecache(dest, {
      maxBytes: app.swPrecacheMaxBytes,
      log: (msg) => console.log(`[collect-apps] ${app.name}: ${msg}`),
    });
  }

  // A copy left at the OLD location is not harmless: it is a previous build with a
  // different base path baked in, and an upload of this dist would keep serving it
  // from the old URL (the mistake this whole script exists to prevent).
  const resolvedDest = path.resolve(dest);
  for (const oldName of app.legacy ?? []) {
    const stale = path.join(dist, oldName);
    if (!fs.existsSync(stale)) continue;
    const resolvedStale = path.resolve(stale);
    if (resolvedStale.startsWith(resolvedDest + path.sep)) continue;
    // The comparison is case-INSENSITIVE on purpose: a rename that only changes
    // case (`GeoSeeker` → `geoseeker`) is the same folder on Windows and macOS,
    // so deleting the "old" path would delete the build we just copied.
    if (resolvedStale.toLowerCase() === resolvedDest.toLowerCase()) continue;
    fs.rmSync(stale, { recursive: true, force: true });
    console.log(`[collect-apps] removed the stale dist/${oldName}/ (this app now lives at dist/${app.name}/)`);
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
  walk(dest);

  console.log(
    `[collect-apps] dist/${app.name}/ ← ${path.relative(root, app.from)} (${files} files, ${(bytes / 1048576).toFixed(1)} MB)`,
  );
}

if (missing.length && !allowMissing) {
  console.error(
    `\n[collect-apps] ${missing.length} sub-app build(s) missing: ${missing.map((a) => a.name).join(", ")}.` +
      `\nDeploying this dist would 404 on those routes. Build them (npm run build:games), or re-run with --allow-missing.`,
  );
  process.exit(1);
}

/*
 * RENAMED KIDS' GAMES — leave a forwarding page behind (opt-in, see
 * `writeLegacyRedirects` above).
 *
 * Renaming a kids' game changes its folder, and the folder IS the URL, so a
 * bookmarked or previously shared link (`/tutorly-games/kids/say-the-word/`) would
 * dead-end. A two-line redirect stub at the old path costs nothing and works on
 * any static host. The `dist/<old>/` folder of the real build has already been
 * deleted above — these stubs are all that is left.
 */
if (writeLegacyRedirects)
for (const [game, olds] of Object.entries(KIDS_GAMES_LEGACY)) {
  for (const old of olds) {
    const dir = path.join(dist, KIDS_GAMES_ROOT, old);
    const index = path.join(dir, "index.html");
    // Never overwrite a real build (e.g. if the old name is still a live game).
    if (fs.existsSync(index)) continue;
    const to = `/tutorly-games/kids/${game}/`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      index,
      `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
        `<title>This game moved</title>` +
        `<meta name="robots" content="noindex">` +
        `<meta http-equiv="refresh" content="0;url=${to}">` +
        `<link rel="canonical" href="${to}">` +
        `<style>body{font:600 20px/1.5 system-ui,sans-serif;background:#fff8ee;color:#35302a;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center}main{max-width:32rem;padding:2rem}b{color:#f26b58}</style>` +
        `</head><body><main>🎈<h1>This game has a new name</h1>` +
        `<p>${old} is now <b>${game}</b>. Taking you there&hellip;</p>` +
        `<p><a href="${to}">Open ${game}</a></p></main>` +
        `<script>location.replace(${JSON.stringify(to)} + location.hash + location.search);</script>` +
        `</body></html>\n`,
    );
    console.log(`[collect-apps] dist/${KIDS_GAMES_ROOT}/${old}/index.html → redirects to ${to}`);
  }
}

/*
 * RENAMED ADULT GAMES — same forwarding page, one level up.
 *
 * The adult set was renamed to the kids' convention, and several of the old
 * names were only ever folder names in the hub (`dd-survival-game`,
 * `tutorly-chess`, …), so those URLs were already linked from somewhere. A stub
 * at the old path keeps every one of them alive; the real build's stale dist/
 * copy was deleted above, so only the stub remains.
 */
if (writeLegacyRedirects)
for (const [game, olds] of Object.entries(ADULT_LEGACY)) {
  for (const old of olds) {
    const dir = path.join(dist, GAMES_ROOT, old);
    const index = path.join(dir, "index.html");
    // Never overwrite a real build — including the case-insensitive case, where
    // `GeoSeeker/` and the live `geoseeker/` are the same folder.
    if (fs.existsSync(index)) continue;
    const to = `/tutorly-games/adult/${game}/`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      index,
      `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
        `<title>This game moved</title>` +
        `<meta name="robots" content="noindex">` +
        `<meta http-equiv="refresh" content="0;url=${to}">` +
        `<link rel="canonical" href="${to}">` +
        `<style>body{font:600 20px/1.5 system-ui,sans-serif;background:#eef4ff;color:#1f2937;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center}main{max-width:32rem;padding:2rem}b{color:#2563eb}</style>` +
        `</head><body><main>🎮<h1>This game has a new name</h1>` +
        `<p>${old} is now <b>${game}</b>. Taking you there&hellip;</p>` +
        `<p><a href="${to}">Open ${game}</a></p></main>` +
        `<script>location.replace(${JSON.stringify(to)} + location.hash + location.search);</script>` +
        `</body></html>\n`,
    );
    console.log(`[collect-apps] dist/${GAMES_ROOT}/${old}/index.html → redirects to ${to}`);
  }
}

/**
 * SIGNPOSTS — nothing is uploaded to these paths yet.
 *
 * Written only when the path is empty, so a real build (built and collected, or
 * simply dropped in by hand) is never overwritten by a signpost.
 */
for (const sign of SIGNPOSTS) {
  const dir = path.join(dist, sign.at);
  const index = path.join(dir, "index.html");
  if (fs.existsSync(index)) continue;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    index,
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${sign.title} — not uploaded yet</title>` +
      `<meta name="robots" content="noindex">` +
      `<style>body{font:16px/1.6 system-ui,sans-serif;background:#f8fafc;color:#1f2937;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center}main{max-width:34rem;padding:2rem}h1{font-size:1.25rem;margin:0 0 .5rem}p{margin:.5rem 0}code{background:#e2e8f0;padding:.15rem .4rem;border-radius:.25rem;font-size:.85em;word-break:break-all}</style>` +
      `</head><body><main><div style="font-size:2.5rem">🧩</div><h1>${sign.title} is not on this server yet</h1>` +
      `<p>${sign.note}</p><p>Expected at <code>/` +
      `${sign.at}/</code></p><p style="margin-top:1.25rem">To fill it in: <code>${sign.how}</code></p>` +
      `</main></body></html>\n`,
  );
  console.log(`[collect-apps] dist/${sign.at}/index.html ← signpost (no build yet)`);
}

/*
 * RETIRED WEB-ROOT FOLDERS — always delete the stale build; the page is opt-in.
 *
 * Unlike the two loops above, these paths are not inside a games folder: they are
 * the app folders that sat directly beside index.html. A real folder always wins
 * over a rewrite rule, so a stale copy here would keep serving its old build from
 * the old URL — deleting it is the reason this script exists and is not optional.
 *
 * The forwarding page that used to replace it is no longer written by default:
 * server.ts and public/.htaccess already 301 these URLs, so the stubs only
 * cluttered the deploy root. Set ROOT_LEGACY_REDIRECTS=1 to get them back when
 * deploying to a static host that runs neither.
 */
if (writeLegacyRedirects)
for (const [old, to] of Object.entries(ROOT_LEGACY_REDIRECTS)) {
  const dir = path.join(dist, old);
  const index = path.join(dir, "index.html");

  // `old` must never be an app's live home: compare case-insensitively, because a
  // rename that only changes case is the same folder on Windows and macOS.
  const stillLive = APPS.some(
    (app) => path.resolve(path.join(dist, app.name)).toLowerCase() === path.resolve(dir).toLowerCase(),
  );
  if (stillLive) {
    console.warn(`[collect-apps] skipped the redirect for dist/${old}/ — that path is still a live app`);
    continue;
  }

  // A copy left at a retired URL keeps serving its old build, so it always goes.
  const hadStaleBuild = fs.existsSync(dir);
  if (hadStaleBuild) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (!writeRootRedirects) {
    if (hadStaleBuild) {
      console.log(
        `[collect-apps] dist/${old}/ → removed the stale build ` +
          "(no forwarding page by default; server.ts / .htaccess already redirect " +
          "this URL — set ROOT_LEGACY_REDIRECTS=1 to write one)",
      );
    }
    continue;
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    index,
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>This app moved</title>` +
      `<meta name="robots" content="noindex">` +
      `<meta http-equiv="refresh" content="0;url=${to}">` +
      `<link rel="canonical" href="${to}">` +
      `<style>body{font:600 20px/1.5 system-ui,sans-serif;background:#eef2ff;color:#1f2937;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center}main{max-width:32rem;padding:2rem}b{color:#4f46e5}</style>` +
      `</head><body><main>📦<h1>This app has a new home</h1>` +
      `<p><b>${old}</b> now lives under the Tutorly widget and lesson folders. Taking you there&hellip;</p>` +
      `<p><a href="${to}">Open it now</a></p></main>` +
      `<script>location.replace(${JSON.stringify(to)} + location.hash + location.search);</script>` +
      `</body></html>\n`,
  );
  console.log(
    `[collect-apps] dist/${old}/index.html → redirects to ${to}` +
      (hadStaleBuild ? " (removed the stale build that was sitting there)" : ""),
  );
}

if (!writeLegacyRedirects) {
  console.log("[collect-apps] legacy redirect stubs skipped — set LEGACY_REDIRECTS=1 to write them");
}

console.log("[collect-apps] done");
