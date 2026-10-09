/**
 * Verify that a built `dist/` folder can actually be deployed as static files.
 *
 * This exists because of a real outage: the app HTML was uploaded to a folder
 * named `/Duolingo_game/` while the build had `/tutolingo/` baked in as its base
 * path. Every asset, the web manifest and the icons 404'd, the server's HTML
 * fallback answered instead (so the browser reported
 * "Refused to apply style … MIME type ('text/html')"), and the service worker
 * threw "Failed to fetch" for a page that looked fine on disk. Nothing in the
 * build said a word. This check reads each sub-app's index.html, resolves every
 * local reference the deployed page will request, and fails loudly if any of them
 * is not on disk.
 *
 * It caught the second instance of the same outage: Tutolingo was moved on the
 * host to `/tutorly-games/tutolingo/` while its build still requested `/tutolingo/…`,
 * and Tuto Runner was still listed at the pre-move URL. Hence the folder inside
 * dist is now stated separately from the public URL prefix.
 *
 * Every game has since moved (in the repo and on the host) under
 * `/tutorly-games/adult/<game>/`, so each one is listed here with its own base
 * path: that is what makes a wrong `base:` in a game's vite.config.ts loud.
 *
 * Usage:
 *   node scripts/check-static-deploy.mjs [distDir]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.resolve(process.argv[2] ?? path.join(root, "dist"));

/**
 * Sub-app → where it lives inside dist/ (or the repo root) and the public URL
 * prefix its build has baked in. The two are separate because a nested app such as
 * Tutolingo is served from `/tutorly-games/tutolingo/`.
 */
/** Where every game lives inside dist/ — the folder IS the public path. */
const GAME_ROOT = "tutorly-games/adult";
/**
 * Adult games, in the adult naming convention (one lower-case word, no digits and
 * no hyphens — the folder IS the URL, so a wrong `base:` in vite.config.ts is
 * caught here by name). The list must stay in step with `VITE_GAMES` and
 * `STATIC_GAMES` in collect-standalone-apps.mjs.
 */
const GAMES = [
  "lingo",
  "edupoly",
  "hotseat",
  "ladder",
  "werewolf",
  "runner",
  // Flix — the React video-lesson platform.
  "flix",
  "geoseeker",
  // The seven that arrived from the user's own archive (nested STATIC_GAMES in
  // collect-standalone-apps.mjs) — real builds now, not signposts.
  "chess",
  "deck",
  "flexcards",
  // Dungeons & Dragons survival — single-file Vite build whose scene artwork ships in
  // its own `images/` folder. Its refs are relative (the singlefile plugin forces
  // `base: "./"`), so this entry guarantees the folder is actually present in dist/.
  // NOTE: the source project lives in `dd-survival-game/`, but the folder in dist/ — and
  // therefore the URL the Game Hub tile opens — is `dungeon/`. See the APPS entry in
  // collect-standalone-apps.mjs.
  "dungeon",
  "tales",
  "feed",
  /*
   * Interview — a Next.js static export (it used to be a PostgreSQL server app).
   * Its base path is baked in, so a wrong `BASE_PATH` in next.config.ts has to
   * fail loudly here, exactly like Lingo's.
   */
  "interview",
  // Console — a static export since its workspace moved into the browser; its
  // Playables proxy is `play.php` inside the export, which needs no check here
  // because nothing in index.html references it (the app fetches it at runtime).
  "console",
  // Cash Arena — a static export too (the quiz arena, formerly
  // `gamified-educational-quiz-platform`). Its library and score history live in
  // the browser, so like Console it needs no host of its own, and a wrong
  // `BASE_PATH` in its next.config.ts breaks the join link and its QR code, which
  // is exactly what this check is for.
  "casharena",
  // MadLibs — the fill-in-the-blanks story game, the last PLACEHOLDER folder to
  // become a real build. Its source arrived as `tutorly-madlibs`; the hyphen is
  // gone, so the folder here is the one the hub tile opens.
  "madlibs",
  // TalkArena and ShoutOut — one classroom speaking platform that arrived as two
  // identical folders. The splitting rule is the hub's: a tile is a game, so the
  // tutor-led rooms are `talkarena` and the emoji-flood arcade is `shoutout`.
  // Both are plain single-file Vite builds with a relative base, so there is no
  // baked-in base path to be wrong — the check is that the folder is really there.
  "talkarena",
  "shoutout",
  // SpeedReader and StoryCraft — the classroom pair that arrived as hyphenated
  // folders and were renamed before any tile pointed at them. Both are single-file
  // Vite builds with a relative base, so what this checks is that the folder is
  // really in dist/; SpeedReader also depends on `dist/images/` being collected.
  "speedreader",
  "storycraft",
  // Party — the classroom game show, and the newest Next.js static export. It
  // arrived as `language-learning-party-arena` (three copies, two of them the same
  // build) with a PostgreSQL room server behind it; the rooms, the lesson library
  // and the score sheet all live in the browser now, so it is a plain folder again.
  // Its base path is baked in, so a wrong `BASE_PATH` in next.config.ts breaks the
  // join link and the QR code — exactly what this check is for.
  "party",
];

/**
 * Adult games whose real build has not been uploaded yet: each folder currently
 * holds a signpost `index.html`. They are checked exactly like the rest — if the
 * tile's folder ever goes missing, the route is a 404 and this should say so.
 *
 * Empty now — MadLibs was the last one and it is a Vite game, listed in GAMES.
 */
const PLACEHOLDER_GAMES = [];

/**
 * Old folder names that must NOT exist in dist/ at all.
 *
 * They are forwarding stubs (`LEGACY_REDIRECTS=1`) or, worse, a stale build with
 * the pre-rename base path baked in. Either way the deploy is cleaner without
 * them, and a real game sitting under a name the hub no longer uses is exactly the
 * kind of duplicate that used to keep serving a previous version. Keep in step
 * with ADULT_LEGACY / KIDS_GAMES_LEGACY in collect-standalone-apps.mjs.
 */
const LEGACY_FOLDERS = [
  "tutorly-games/adult/tutolingo",
  "tutorly-games/adult/tuto_runner",
  "tutorly-games/adult/tutoflix",
  "tutorly-games/adult/GeoSeeker",
  "tutorly-games/adult/3d-monopoly",
  "tutorly-games/adult/3d-millionaire-game",
  "tutorly-games/adult/3d-survival-snake-ladder",
  "tutorly-games/adult/3d-werewolf-game",
  "tutorly-games/adult/dd-survival-game",
  "tutorly-games/adult/Story-teller-game",
  "tutorly-games/adult/tutorly-chess",
  "tutorly-games/adult/3d-flashcard",
  "tutorly-games/adult/3d-flexcards",
  "tutorly-games/adult/tutorly-madlibs",
  "tutorly-games/adult/tutorly-instalesson",
  "tutorly-games/adult/develop-tutorly-consol-app",
  "tutorly-games/adult/gamified-educational-quiz-platform",
  "tutorly-games/adult/gamified-language-learning-platform",
  "tutorly-games/adult/gamified-language-learning-platform5",
  "tutorly-games/adult/speed-reader-shadowing-game",
  "tutorly-games/adult/ai-storytelling-game-architecture",
  "tutorly-games/adult/language-learning-party-arena",
  "tutorly-games/kids/say-the-word",
  "tutorly-games/kids/learn-together",
  "tutorly-games/kids/bilingual-game",
  "tutorly-games/kids/preschool-learning-game",
  "tutorly-games/kids/multilingual-preschool-learning-game2",
  "tutorly-games/kids/playbox",
  "tutorly-games/kids/interactive-bilingual-language-game",
  "tutorly-games/kids/interactive-bilingual-learning-game4",
  /**
   * The RETIRED WEB-ROOT FOLDERS — apps that used to sit beside index.html.
   *
   * These are the dangerous ones. A rewrite rule cannot win against a real folder,
   * so a stale `dist/combat-arena/` or `dist/content-creator-v1/` left in an upload
   * keeps serving its old build from the old URL no matter what `.htaccess` says.
   * `ROOT_LEGACY_REDIRECTS` in the collect script deletes each of these and leaves a
   * forwarding stub, which `isRedirectStub` accepts; anything else here fails the
   * build, which is the point.
   */
  "combat-arena",
  "content-creator-v1",
  "tutorly-transcriber-2-v1",
  "Tutorly-cscreen",
  "Tutorly-cscreen-v1",
  "preply-success-advisor",
  "preply-success-advisor-v1",
  "exam-builder",
  "exam-builder-v1",
  "whiteboard-application-V2",
  "tutorly-lesson-insight",
  "university-management-system",
  "university-management-system-v1",
  "tutorly-prompter",
];

const APPS = [
  ...[...GAMES, ...PLACEHOLDER_GAMES].map((game) => ({
    app: game,
    dir: `${GAME_ROOT}/${game}`,
    basePath: `/${GAME_ROOT}/${game}/`,
  })),
  /**
   * Kids' Corner — each game is a Next.js static export like Tutolingo, so its own
   * sub-path is baked into every asset URL and a wrong `BASE_PATH` must fail
   * loudly here. The folder name IS the public URL, so this list and
   * `KIDS_GAMES` in collect-standalone-apps.mjs must always agree.
   */  ...["wordpop", "learnloop", "bilibuddies", "playschool", "toybox", "heroarcade", "talkquest"].map((game) => ({
    app: game,
    dir: `tutorly-games/kids/${game}`,
    basePath: `/tutorly-games/kids/${game}/`,
  })),
  { app: "gaming-hub", dir: "gaming-hub", basePath: "/gaming-hub/" },
  /**
   * Preply Success Advisor — one single-file Vite build, served from
   * `/preply-success-advisor/` by the route in server.ts and collected by
   * collect-standalone-apps.mjs. Checked here because its absence is otherwise
   * silent: the route just falls through to the app shell.
   */
  { app: "preply-advisor", dir: "tutorly-widgets/preply-success-advisor", basePath: "/tutorly-widgets/preply-success-advisor/" },
  /**
   * Exam Builder — one single-file Vite build, served from /exam-builder/ by the
   * route in server.ts and opened by the classroom Exam Builder widget. Checked
   * for the same reason as the advisor: without it the folder is simply absent
   * from dist/ and the tile dead-ends, which is how it shipped before.
   */
  { app: "exam-builder", dir: "tutorly-widgets/exam-builder", basePath: "/tutorly-widgets/exam-builder/" },
  /**
   * Classroom Screen — one single-file Vite build (`Tutorly-cscreen/`), served
   * from `/Tutorly-cscreen-v1/` by the route in server.ts. Same failure mode as
   * the advisor and the builder above: nothing built it, so the route silently
   * served the dashboard shell instead of the classroom screen.
   */
  { app: "cscreen", dir: "tutorly-widgets/Tutorly-cscreen", basePath: "/tutorly-widgets/Tutorly-cscreen/" },
  /**
   * University Manager — the other dock-launched app, opened at
   * /university-management-system/ in a new tab. Its absence from dist/ was silent
   * for the same reason as the three above: the route just falls through.
   */
  { app: "university-manager", dir: "tutorly-widgets/university-management-system", basePath: "/tutorly-widgets/university-management-system/" },
  /**
   * Lesson Insight — a finished single-file page opened by the dock; it is copied
   * whole rather than built, so there is no base path to get wrong. Checked anyway,
   * because a missing folder here is a 404 with no other symptom.
   */
  { app: "lesson-insight", dir: "tutorly-widgets/tutorly-lesson-insight", basePath: "/tutorly-widgets/tutorly-lesson-insight/" },
  /**
   * Voice Transcribe — the lesson recorder, filed beside Lesson Insight rather
   * than replacing it. It has no dock tile, so it is checked here only so its
   * folder cannot quietly go missing once someone does link to it.
   */
  { app: "voice-transcribe", dir: "tutorly-widgets/tutorly-voice-transcribe", basePath: "/tutorly-widgets/tutorly-voice-transcribe/" },
  /**
   * The lesson apps, published under `/tutorly-lessons/` like the games are under
   * `/tutorly-games/`. Right now these two hold signpost pages (their sources are
   * real Vite apps that have never been built); the check is the same either way —
   * if the folder vanishes the route 404s.
   */
  { app: "englishlesson", dir: "tutorly-lessons/englishlesson2", basePath: "/tutorly-lessons/englishlesson2/" },
  { app: "video-lesson", dir: "tutorly-lessons/Video-Lesson", basePath: "/tutorly-lessons/Video-Lesson/" },
  /**
   * Tutorly Prompter — now a REAL build (the dock's Prompter tile used to open a
   * signpost page). It is a single-file Vite build with its own `manifest.json`, so
   * the check confirms the folder, the page and that manifest are all present.
   */
  { app: "prompter", dir: "tutorly-widgets/tutorly-prompter", basePath: "/tutorly-widgets/tutorly-prompter/" },
  /**
   * Whiteboard ("ProBoard") — a finished single-file page recovered from the live
   * server. There is no source project, so what this checks is that the page really
   * is in dist/ (the dock tile otherwise opens a signpost or the app shell).
   */
  { app: "whiteboard", dir: "tutorly-widgets/whiteboard-application-V2", basePath: "/tutorly-widgets/whiteboard-application-V2/" },
  { app: "transcriber", dir: "tutorly-widgets/tutorly-transcriber-2-v1", basePath: "/tutorly-widgets/tutorly-transcriber-2-v1/" },
  /**
   * Content Creator ("ContentAlchemy AI") — a finished Vite build recovered from the
   * live server, where it sat at the web root as `content-creator-v1/`. It is the
   * one Widget Studio tile that used to create an invisible widget (see the APPS
   * entry), so the check confirms both the page and its `assets/` folder arrived:
   * an inlined index.html with a missing bundle would still render a blank screen.
   */
  { app: "content-creator", dir: "tutorly-widgets/content-creator", basePath: "/tutorly-widgets/content-creator/" },
  /**
   * Arena ("Combat Arena") — now one of the adult games, at
   * `/tutorly-games/adult/arena/`. It ships six scene images in its own `images/`,
   * and a root-absolute image path would 404 from under the games folder.
   */
  { app: "arena", dir: "tutorly-games/adult/arena", basePath: "/tutorly-games/adult/arena/" },
];

/** Extensions that must never be answered by an HTML fallback. */
const STRICT = /\.(?:js|mjs|css|png|jpe?g|gif|svg|webp|ico|woff2?|webmanifest|json|map)$/i;

const strip = (u) => u.split("#")[0].split("?")[0];

/** Resolve one reference from a page to a file inside dist/ (or null if external). */
function resolveRef(ref, pageUrl, basePath) {
  if (!ref || ref.startsWith("data:") || ref.startsWith("blob:")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return null; // absolute http(s), mailto, …
  const clean = strip(ref);
  if (!clean) return null;

  if (clean.startsWith("/")) {
    // A root-absolute URL is only correct if it starts with this app's base
    // path; otherwise the build does not belong in this folder.
    if (!clean.startsWith(basePath)) {
      return { path: null, wrongBase: clean };
    }
    return { path: path.join(dist, clean.slice(1)) };
  }
  // Relative to the page URL.
  const dir = pageUrl.endsWith("/") ? pageUrl : pageUrl.replace(/[^/]*$/, "");
  return { path: path.join(dist, path.normalize(dir + clean).replace(/^\//, "")) };
}

let failures = 0;
let checked = 0;

for (const { app, dir: appDir, basePath } of APPS) {
  const dir = path.join(dist, appDir);
  const index = path.join(dir, "index.html");
  if (!fs.existsSync(index)) {
    console.log(`✗ ${app.padEnd(12)} missing ${path.relative(root, dir)}/index.html — route will 404`);
    failures++;
    continue;
  }

  const html = fs
    .readFileSync(index, "utf8")
    // Drop inline script bodies and comments first: built bundles contain JS that
    // builds markup with string concatenation (href="'+f+'"), which is not a
    // reference the browser ever requests.
    .replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const pageUrl = `${basePath.replace(/^\//, "")}index.html`;
  const refs = new Set();
  // Assets only (script/link/img/source/iframe/video/audio). Outbound <a href>
  // navigation is deliberately ignored: the hub links to sibling apps that are
  // deployed as their own top-level folders, not inside this dist.
  const tagRe = /<(?:script|link|img|source|iframe|video|audio)\b[^>]*?\b(?:src|href)="([^"]+)"/gi;
  for (const m of html.matchAll(tagRe)) refs.add(m[1]);

  const missing = [];
  const wrongBase = [];
  for (const ref of refs) {
    const r = resolveRef(ref, pageUrl, basePath);
    if (!r) continue;
    checked++;
    if (r.wrongBase) {
      wrongBase.push(r.wrongBase);
      continue;
    }
    if (!fs.existsSync(r.path)) missing.push(ref);
  }

  /*
   * Media referenced as strings INSIDE the bundle.
   *
   * The tag scan above cannot see an image the app builds at runtime
   * (`img.src = "/images/dungeon-bg.jpg"`), and that is exactly how the Dungeons &
   * Dragons game shipped a page whose ten scene images all 404'd after it moved to
   * `/tutorly-games/adult/`: the paths were root-absolute and had been correct only
   * while it sat at the site root. The bundle is inlined, so pull the URLs out of the
   * script text too — restricted to media/font extensions, which are never generated
   * at runtime, so a miss here is always a real broken asset.
   */
  const rawHtml = fs.readFileSync(index, "utf8");
  for (const m of rawHtml.matchAll(/["'`](\/[A-Za-z0-9._@\/-]+\.(?:jpe?g|png|gif|svg|webp|avif|ico|mp3|ogg|wav|m4a|woff2?|ttf|otf))["'`]/gi)) {
    const url = m[1];
    checked++;
    if (!fs.existsSync(path.join(dist, url.slice(1)))) missing.push(`${url}  (root-absolute, nothing at that path in dist/)`);
  }

  const size = fs.statSync(index).size;
  const problems = missing.length + wrongBase.length;
  if (problems === 0) {
    console.log(`✓ ${app.padEnd(12)} ${refs.size} refs ok · ${(size / 1024).toFixed(0)} kB · base ${basePath}`);
  } else {
    failures += problems;
    console.log(`✗ ${app.padEnd(12)} ${problems} broken reference(s)`);
    missing.slice(0, 8).forEach((m) => console.log(`    missing file:      ${m}`));
    if (missing.length > 8) console.log(`    … and ${missing.length - 8} more`);
    [...new Set(wrongBase)].slice(0, 5).forEach((u) => console.log(`    outside ${basePath}: ${u}`));
  }
}

/**
 * Folders that ARE live, lower-cased. This matters on Windows and macOS, where
 * `dist/…/GeoSeeker` and `dist/…/geoseeker` are the SAME directory: without this
 * the legacy check would report the live game as leftovers of itself.
 */
const liveDirs = new Set(APPS.map(({ dir }) => dir.toLowerCase()));

/**
 * A forwarding page — not a leftover build.
 *
 * `collect-standalone-apps.mjs` can write redirect stubs at retired paths
 * (`LEGACY_REDIRECTS=1`), and `ROOT_LEGACY_REDIRECTS` always does for the folders
 * that used to sit at the web root. A stub is the DESIRED end state at an old
 * address: it is one file, it names the path it forwards to, and it has no build
 * behind it. What this check is actually looking for is a full stale copy — an old
 * app that would keep serving itself from the old URL — so a stub has to be told
 * apart from one, or a correct dist fails its own verification.
 */
function isRedirectStub(dir) {
  const index = path.join(dir, "index.html");
  if (!fs.existsSync(index)) return false;
  // Only the stub is allowed to live there: a real build ships its assets beside it.
  if (fs.readdirSync(dir).length > 1) return false;
  const html = fs.readFileSync(index, "utf8");
  return html.includes('http-equiv="refresh"') && html.includes("location.replace(");
}

for (const legacy of LEGACY_FOLDERS) {
  if (liveDirs.has(legacy.toLowerCase())) continue;
  const dir = path.join(dist, legacy);
  if (!fs.existsSync(dir)) continue;
  if (isRedirectStub(dir)) {
    console.log(`· ${legacy} retired — forwarding stub (no build behind it)`);
    continue;
  }
  failures++;
  console.log(`✗ ${legacy} old folder name still in dist/ — delete it (or drop it from ADULT_LEGACY/KIDS_GAMES_LEGACY)`);
}

console.log(
  failures === 0
    ? `\nAll sub-apps under ${path.relative(root, dist)}/ are self-consistent (${checked} references checked).`
    : `\n${failures} problem(s) — this dist would 404 in production.`,
);
process.exit(failures === 0 ? 0 : 1);
