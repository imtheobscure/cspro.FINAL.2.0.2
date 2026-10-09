# Agent instructions — Tutorly Classroom Screen (games)

Read this before touching any game. Detailed, verified procedure lives in
`.freebuff/run.md` (per-game dev servers, ports, build artifacts, detach recipe).

## 0a. Catalog sources are legal-only — never wire a pirate API

Both Tutoflix apps may search *any* movie or TV series, but may only **play** what is
licensed: `owned`, `licensed`, `public-domain`, `creative-commons`, `official-embed`.
That is enforced in `VideoProvider` / `videoSources.authorizationType` and shown in the
UI as a licence badge.

**Never add VidSrc, VidSrc TO, VidLink, Autoembed, Vidsrc.pro, SuperEmbed, TMDB-free-
lookalikes, or cyberlockers (Voe, Filemoon, Mixdrop, Vidguard, Streamtape)** — they
stream copyrighted film without a licence, and adding one turns these apps into an
infringement pipeline. Requests for them are declined and answered with the legal
equivalent instead: playable copies from Internet Archive / Wikimedia Commons, the
title's **official** streaming destinations from TMDB's watch-provider data, and the
user's own files. A title with no licensed copy gets a full information page, not a
dead play button.

## 0. Two video platforms, do not confuse them

- `tutorly-games/adult/flix` — **the video-lesson app**, static and browser-only. Its catalog
  lives in `src/lib/catalog/` (TMDB + OMDb keys typed into Settings → localStorage; Internet
  Archive and Wikimedia Commons need no key). It **is** a build target: `build-tutorly-games.mjs`,
  `collect-standalone-apps.mjs` and `check-static-deploy.mjs` all list `flix`.
- `tutorly-games/adult/reel` — **the video platform**, a Next.js + database app (`npm run dev`
  on port 3100, embedded PGlite when `DATABASE_URL` is unset; see its README and the run doc's
  "Tutoflix Studio V2" section). It is **not** a static game: do not copy it into `dist/`, do
  not add it to `collect-standalone-apps.mjs`, and remember that attaching Shaka eagerly or
  leaving `allowedDevOrigins` unset both break playback in non-obvious ways. The hub reaches it
  through `VIDEO_PLATFORM_URL` (`VITE_REEL_URL`, or the legacy `VITE_TUTOFLIX_V2_URL`).
- `tutorly-games/adult/interview` — **the interview rehearsal studio**. It *was* Next.js +
  PostgreSQL; its workspace now runs in the browser (`src/lib/local-store.ts`) and the app is a
  static export, so it publishes like Lingo (`npm run build` inside the folder, listed in
  `collect-standalone-apps.mjs` and `check-static-deploy.mjs`, hub tile `launch("interview")`).
  Do not reintroduce a database or a `/api/` route: `output: "export"` cannot serve one. Its
  24 interviewer portraits are the **tutor's own professional headshots**,
  `public/images/characters/01.jpg` … `24.jpg` (640 × 640, copied byte-for-byte from
  `tutorly-games/adult/images/`; `public/images/README.md` documents the set), and
  `tutorly-hero.jpg` is a collage of portraits 01, 09 and 07. Both naming conventions resolve —
  the original app's `01.jpg` and the plain `1.jpg` — and zero-padded wins when both exist, so the
  tutor's files never need renaming. New or replacement pictures come in with
  `npm run portraits -- --from "folder-or.zip"` (matched by filename or natural order), the hero
  rebuilds with `npm run portraits -- --hero`, and `npm run portraits:ai` draws AI corporate
  headshots for any character that has no picture. **Never delete artwork by filename pattern**
  in this folder: for ids 10+ the padded and plain names are identical, so a glob like
  `1[0-9].jpg` also matches the real files.
- `tutorly-games/adult/console` — **the games console** (1,650 YouTube Playables plus your own
  Unity WebGL builds, score capture, leaderboard, rig modes). It is a **static folder** now: a
  Next.js `output: "export"` copied to `dist/` by its own `scripts/make-dist.mjs`, with the hub
  reaching it through `CONSOLE_URL` (default `/tutorly-games/adult/console/`). The workspace,
  scores and custom games live in the browser (`src/lib/localApi.ts` — no database, no server),
  and the one job a browser cannot do — stripping the CSP off a Playables build so it can be
  framed — ships as **`public/play.php`** inside the export, with a second implementation of the
  same contract in **`server.ts`** (the Node/Express route the console asks for in dev and
  `npm start`). The app probes that path at runtime (`play.php/__probe__`, see
  `src/lib/proxy.ts`) and falls back to opening the game on YouTube where neither is there, so
  the tile never dead-ends. When you touch one proxy, touch the other: same safety checks, same
  transform, same content types — but NOT the same passthrough list, because cURL hands back raw
  bytes while Node's fetch decodes the body for you (`content-encoding` must not be forwarded by
  the Node side, or every game dies with `ERR_CONTENT_DECODING_FAILED`). Never let a build be
  CACHED either: a Unity build only works as a SET that shares one function table, so a cached
  loader against a freshly deployed `.wasm` throws `RuntimeError: null function or function
  signature mismatch` in `invoke_iiii` mid-game. `playablesCacheControl` (server.ts) and
  `tutorly_cache_control` (play.php) put js/wasm/data/unityweb/css/html on **`no-store`** and let
  only images and audio cache for a day. The build host sends `Last-Modified` but **no `ETag`**,
  and forwarding it is what once made a bad copy permanent: the browser revalidated its stored
  body, the host answered 304, and the broken set stayed in service through every reload. So the
  browser only ever sees OUR namespaced validator, `etag: "tc3.<base64url(host validator|size)>"`
  (`VALIDATOR_TAG_PREFIX` in both proxies — an unrecognised tag forces an unconditional fetch),
  and `If-Modified-Since` is ignored. **Bump that prefix and `PROXY_VERSION` whenever a proxy
  change could have served bytes that were not byte-identical to the host's** — that is what
  evicts copies an older proxy poisoned. The rig shows which proxy answered and which version:
  `PROXY (node v3)` / `(php v3)`, from `play.php/__probe__`. Test with
  `npm run typecheck && npm run build` inside the console, then `node dist/server.cjs` at the root
  and `curl` the probe. PHP cannot be run in this workspace: verify the transform against a real
  `https://<host>.playables.usercontent.goog/…` document. Remember `dist/server.cjs` is a BUILD
  ARTIFACT — re-run `npx esbuild server.ts …` (or `npm run build`) after editing `server.ts`, or
  the running app keeps the old route.
- **`.freebuff/` scratch scripts are never shipped** — if you write one to check a build, delete
  it when you are done.

## 1. Game-dev skills — use these for EVERY game

**<https://github.com/gamedev-skills/awesome-gamedev-agent-skills>** — 73 portable `SKILL.md`
game-dev skills (Godot, Unity, Unreal, Phaser, PixiJS, three.js, Bevy, pygame, LÖVE, Roblox)
plus a router that detects the engine/task and loads only the matching skills.

```
npx skills add gamedev-skills/awesome-gamedev-agent-skills          # router + all 73 skills
npx skills add gamedev-skills/awesome-gamedev-agent-skills -a claude-code   # a single agent
```

The games here are React 19 + Vite + DOM/CSS single-file builds, so the **`web-engines`**
group and the cross-cutting skills (asset/art-direction pipeline, audio, save systems, UI/UX,
publishing) are the relevant ones. Consult the matching skill *before* writing game code
instead of inventing an approach.

## 2. Never change the main app when asked to work on a game

Game work stays inside that game's folder — since 2026-09-17 every hub game lives under
`tutorly-games/adult/<game>/`, one lower-case word per folder (the adult naming convention
below): `edupoly`, `hotseat`, `ladder`, `werewolf`, `runner`, `lingo`, `flix`, `geoseeker`,
`dungeon`, `tales`, `chess`, `deck`, `flexcards`, `feed`, `interview` and `console`, plus
`madlibs` (still a signpost — its build has not arrived) and the one remaining server app
`reel`. Several arrived as finished single-file builds kept in
`tutorly-games/adult/backup/tutorly-games/<old-name>/` and copied into their renamed folders.

`deck` and `flexcards` are no longer those copies. Their real source was promoted into the
canonical folder and they are Vite games now (`npm run build` → `dist/index.html`, and both
use `vite-plugin-singlefile` so the page is still one file) — collected from `dist/`, not
copied whole. The copy of `deck` that shipped first was a **code-only shell** (its data module
was stripped before export: no items, no decks, no vocabulary in the file), which rendered
blank and threw `Cannot read properties of null (reading 'items')`; both now carry a complete
build. Six games read the Adult Dashboard's splash settings: the four shell games (edupoly,
hotseat, ladder, werewolf) through `GameShell.tsx`, and Deck and FlexCards through their own
`src/lib/tutorlyBranding.ts`. Those two files are copies of one contract — keep them in step,
because a game that quietly ignores the dashboard's splash text and logo reads as a broken
dashboard rather than a game that was never wired up.
Anything outside those folders (`components/`, `src/`, `server.ts`, the root scripts) is main-app
territory; the exceptions are the shared Tutorly integration the user explicitly asked for (the
games' splash settings read the dashboard bucket) and the build scripts that publish the games
into `dist/tutorly-games/adult/<game>/`.

## 3. The Tutorly game shell — one flow, identical in every game

Each game contains `src/GameShell.tsx` + `src/gamePack.ts`. `GameShell.tsx` is the SAME file in
all four 3D games: keep them byte-identical (`cp` one over the rest, then `md5sum` all four),
and pass per-game differences as config — `settingsHeading`, `extraAction`, and
`jsonPlaceholder` (the JSON paste box names the key THAT game's pack starts with; it is not
snake's `cells` for everyone). The flow is fixed: **splash → player setup
(names + facts + avatars + location) → Copy AI Prompt → paste the AI's JSON → Load Pack → play**,
with the light Tutorly theme as the default.

- `GameShell.tsx` ships its own `SHELL_CSS` `<style>` block. Do **not** move those rules into a
  game's `index.css` — a missing `.shell-floater` rule once turned the splash into a scrolling
  column of emoji. The splash is `100dvh` and its spacing scales with viewport height, so it
  must never scroll.
- Splash text/subtext/logo come from the Adult Dashboard via `localStorage['app-storage']`
  (`state.tutorInfo.splashScreenText / splashScreenSubtext / enableSplashScreens`,
  `state.logoUrl`). Same origin as `/tutorly-games/<folder>/index.html`, so dashboard edits
  appear in already-open games (storage/focus listeners). Edit the dashboard settings UI, not
  per-game copies.
- The AI prompt is the product: it must demand high quantity *and* hard, unguessable questions
  and real, checkable place data (real street names + addresses, 3+ direct photo URLs, video,
  360°/panorama, map coordinates). Never weaken the prompt's quality bar to "simplify".

## 3b. Nothing may be clipped, ever (FitFrame)

Every screen that has a fixed frame (the splash, the setup page, the game menu, the play screen)
must render inside the exported `FitFrame` from `GameShell.tsx`, and its frame must be a
`100dvh` box. `FitFrame` measures the natural height of its children against the space it is
given and shrinks them with CSS `zoom` only when they do not fit (never above 1x, floor 0.62-0.75
per screen, then the parent scrolls). Media queries alone are not enough: a 7-option question, a
long settings card or a short projector window will always beat them.

Facts learned the hard way:
- A single measurement at mount can run before layout settles and leave everything at zoom 1 —
  keep the follow-up passes (timers + `document.fonts.ready`) and the `ResizeObserver`.
- `zoom` keeps `scrollHeight` unscaled while `getBoundingClientRect()` scales, which is what
  makes `avail / visual` converge in one pass. Do not switch to a width-based `%` for the
  wrapper: with `zoom`, 100% comes out narrower than the frame.
- Keep fixed elements (the menu toolbar, timers, modals) OUTSIDE `FitFrame` so they are not
  scaled and do not eat the fit budget.
- `min-height: 100svh` beats `height: 620px`, so any frame-height override in a test needs
  `min-height: 0 !important` too.
- Grow the layout before shrinking it: a settings card in two columns, steps side by side, or
  compact media queries at short heights keep the zoom near 1 and the text big.
- A scrollable panel is NOT an excuse. The Millionaire prize ladder shipped as a 30-row list
  inside a short rail with `scrollIntoView`, so the top levels and the jackpot were cut off and
  it read as clipping. Scroll containers inside a fixed frame must be fitted (see the ladder:
  fixed-height flex → flex-1 body with `min-height: 0; overflow: hidden` → `FitFrame`).
- Do not put `max-width: 100%` on the FitFrame wrapper: it is measured against the unzoomed
  containing block, so at zoom < 1 it clamps the width and leaves a gap on the right.

## 3c. Game boards: drawn SVG, one geometry formula, tokens on their own layer

`tutorly-games/adult/3d-survival-snake-ladder/src/boardArt.tsx` is the pattern for board art: `TileArt` draws each
tile type (snake, ladder, oasis, death, jumpscare, start, finish, decision) as inline SVG — no
emoji as board art, `cell.glyph` only as a small scenario icon inside the drawn scroll. `BoardLinks`
draws each snake/ladder as a real link between its two squares, and `BoardTokens` puts the players
on a layer **above** the links (tokens inside `.board-cell` paint below the overlay and get hidden
under a snake's head).

- The geometry lives in ONE formula (`cellCenter`) that must match the CSS grid's boustrophedon
  order. The overlay SVG uses `viewBox="0 0 cols rows*aspect"` with `preserveAspectRatio="none"`,
  and the frame's aspect must equal `cols/(rows*aspect)` or the art lands off the squares.
- **A `<linearGradient>` with default `objectBoundingBox` units is never painted on a straight
  `<line>`** (zero-area bbox → degenerate paint server → Chrome drops it). Use
  `gradientUnits="userSpaceOnUse"` for anything stroked on a line. This silently hid every ladder.
- Movement is animated by stepping `position` one square per `setTimeout` and transitioning the
  token's `left`/`top` in % (no JS animation loop), so snake slides and ladder climbs ride their
  drawn link with a fading trail. Stat penalties land when the token *arrives*, not when it starts.
- Every new animated class must also be added to the `prefers-reduced-motion` block, and the
  reduced-motion webview in this environment runs no keyframes — verify movement via transitions
  and DOM geometry, and keyframe declarations via the CSSOM.

## 3b. Bundled media, not hot-links (`tutorly-games/adult/3d-survival-snake-ladder`)

The jump scare and its sound use **real, freely-licensed files downloaded into `public/`**
(`images/scares/*.jpg` from Wikimedia Commons, `sounds/scream-*.ogg|wav`) and referenced with
**relative** paths (`images/scares/x.jpg`), so they work offline and under a sub-path. Every
photo is credited in `CREDITS.md` and on screen (`.scare-credit`). Kid mode draws only the
non-gory half of the set. `dist/` therefore contains `images/` and `sounds/` next to
`index.html` — **copy the whole folder to the hub, not just the HTML**.

## 3a. Game Hub game paths (adult / kids)

Every standalone game URL is built from `GAME_ROOT` in `gaming-hub/src/data/activities.ts`:
`launch("<folder>")` → `/tutorly-games/adult/<folder>/index.html`, `launchKids("<folder>")` →
`/tutorly-games/kids/<folder>/index.html`. Never hardcode a game URL back into a component.
Games live on disk in `tutorly-games/adult/…` and `tutorly-games/kids/…` (README in each).
A game with its own sub-path build also needs its base path moved: Lingo is
`BASE_PATH` in `tutorly-games/adult/lingo/next.config.ts` plus the route in `server.ts`; the Vite
games are single-file builds, so they need nothing but the folder move.

### The adult naming convention (same rule as the kids' games)

The folder **is** the URL, so every adult game is one lower-case word, no hyphens and no
digits, and the in-app name is that word in CamelCase — `lingo`/Lingo, `edupoly`/EduPoly,
`hotseat`/HotSeat. Name the game after what the learner DOES, keep it sayable out loud, take
no trademarked title (the property-trading game is EduPoly, the game show is HotSeat), and
give no two games the same word. Renaming means adding the old folder to `ADULT_LEGACY` in
`scripts/collect-standalone-apps.mjs` (`KIDS_GAMES_LEGACY` is the kids' equivalent), which
deletes the stale `dist/` copy and writes a redirect page at the old URL on the next build.
Three scripts must agree about any new folder: `GAMES` in `build-tutorly-games.mjs` (Vite
games only), `collect-standalone-apps.mjs` (`VITE_GAMES` / `STATIC_GAMES` /
`PLACEHOLDER_GAMES` / `ADULT_LEGACY`) and `check-static-deploy.mjs` (`GAMES` /
`PLACEHOLDER_GAMES`).

Games whose build the user has not uploaded yet keep a signpost `index.html` in their folder
and are listed in `PLACEHOLDER_GAMES`, so the hub tile lands on a real page instead of a 404;
the real build takes over as soon as it is dropped in, with nothing to re-wire.
The Kids' Corner is a separate section (`KIDS_CATEGORY` + `components/KidsSection.tsx`) with its
own pastel skin, and shows dashed coming-soon cards while `KIDS_CATEGORY.activities` is empty.

### The seven kids' games (and the rules for the next one)

`wordpop` (WordPop), `learnloop` (LearnLoop), `bilibuddies` (BiliBuddies), `playschool`
(PlaySchool), `toybox` (ToyBox) and `talkquest` (TalkQuest) are **Next.js static exports** —
`output: "export"`, no server, no database — so they build to `<game>/dist/` and publish
exactly like Tutolingo. `heroarcade` (HeroArcade) is the odd one out: a **Vite single-file SPA**
(`vite-plugin-singlefile`) whose whole app is inlined into one `dist/index.html`, so it has no
base path to bake in but is otherwise published the same way. None of them is touched by
`npm run build:games`: run `npm run build` (Next) or `npx vite build` (Vite) inside the game.
The full convention list is in `tutorly-games/kids/README.md`; the parts an agent must not miss:

- **The folder name is the public URL** (and is baked into every asset URL via `BASE_PATH` in
  that game's `next.config.ts`). Name it one lower-case word — `wordpop` — and rename the
game by changing the folder, `BASE_PATH`, the two script lists, and
  `KIDS_GAMES_LEGACY` (which deletes the stale build and writes a redirect stub at the old URL).
- **Namespace every storage key with the game's folder name.** All games share one origin, so
  `localStorage` is shared: `wordpop.learners.v1`, `playschool.tutor.v1`,
  `learnloop.store.v2` (zustand `persist` name included). A generic key lets one game
  overwrite another's learners. Only `app-storage` is deliberately shared (read-only).
- **Read storage after mount, never while rendering.** These games are pre-rendered where
  `localStorage` does not exist, so a saved mute flag, text size or "seen this panel" flag read
  in a `useState` initialiser makes the client's first paint differ from the HTML and React 19
  throws the whole tree away (minified error #418). Start from the default, read it in a
  `useEffect`, and add `suppressHydrationWarning` to `<html>` only for a pre-paint bootstrap
  such as the text-size script. Same family: never nest `<AnimatePresence mode="wait">` inside
  the page's own — it deadlocks on an exit that never finishes and leaves the screen blank.
  Both are written up with the Twemoji U+FE0F filename rule in `tutorly-games/kids/README.md`
  under "Three traps these static exports share".
- **The lesson language is for the CHILD, not the teacher.** Every sentence the app puts in
  front of a 5–12 year old is short, kind and grammatical: a noun never gets a verb's line
  ("I can costume"), a plural never gets an article ("This is compass"), and no word harder
  than the lesson's own vocabulary appears in a question. `talkquest` keeps that honest with
  a **kind** per word (`contentGen.kindOf`) and one template pool per kind
  (`talkLines.talkFor`) — before adding a template, check it against a noun, a plural, an
  uncountable and an `-ing` word, because all four reach every pool.
- **Read-aloud uses the free Microsoft natural voices** — the Microsoft "Online (Natural)"
  voices Edge exposes to `speechSynthesis`, child voices included. No `AZURE_SPEECH_KEY`, no
  `/api/tts`, no server; every game ships a 🎤 voice-test screen and reports honestly when a
  device has no natural voice. Never reintroduce a server TTS route.
- **Every game ships the copy-AI-prompt → paste-JSON path, with two tabs** so a tutor can
  add a theme *and* a lesson plan with the game open. A theme fills the library; a lesson
  plan is a timed, tutor-ready plan for something already in it (objectives, stages, script,
  CCQs, expected answers). Store only the override under `<game>.customLessons.v1` and
  `registerLesson(...)` on boot, so a pasted plan keeps following a language switch instead
  of freezing into a stale copy. Every unit also needs a plan the game writes itself from
  its own words, so 📚 is never empty. Parse defensively: an AI answering with a plain
  string where the sample shows an object is normal, and must not degrade to "Theme 1" /
  "Stage 3".
- Kids' games that need client routing use the **hash** (`#/play`, `#/pack`), never a path —
  a static export has no server rewrites, and a theme installed from pasted JSON can never be
  pre-rendered. (`playschool` and `toybox` are pure Next static exports, so they use real
  routes instead; that is fine because every route is generated at build time.)
- **Rename a game as a whole, not just its folder.** A rename has to move the folder, the
  `BASE_PATH`, the two script lists (`KIDS_GAMES`, `KIDS_GAMES_LEGACY`), the in-app branding,
  the game's name inside its AI prompts, its `localStorage` prefix (read the old key once as a
  fallback — HeroArcade still reads `tutorly.v1`), and the hub tile copy. Half a rename leaves
  the old name on a splash screen or, worse, orphans a tutor's saved learners.

## 3b2. Snake & Ladder board rules (do not re-add tile art)

Snake and ladder squares carry **no SVG art inside the tile** on purpose — the snakes and
ladders are drawn across the board (`BoardLinks`), and a second copy inside the square read as
a duplicated, wrong-looking shape. There is exactly **one head per snake**, drawn as part of
the same silhouette that becomes body and tail, and every snake must drop at least one whole
row (heads 48→26, 32→12, 29→14, 38→22, 45→33). The bite is choreographed in three places that
must stay in sync: `BITE_MS` (pause before the slide), the rAF head-lunge in `BoardLinks`
(`bitingFrom` → reach 0.34 cell along the nose), and `.token-bitten` / `.cell-bite` /
`.bite-penalty` in the play-screen CSS. The morale hit lands on arrival, not after the slide.

## 3c. One motion switch per game

The player's own **Animations** setting is the authority: it seeds from
`prefers-reduced-motion` and is overridden by the ✨/🎞 button (header) and the menu toggle.
Board CSS animations are gated on the `.anim-off` class (not on a media query), the snake
slither is gated on the `animate` prop, and the scare choreography on `.scare-anim`.
`prefers-reduced-motion: reduce` in this environment is **true**, and `requestAnimationFrame`
is **suspended** in the preview webview — so rAF-driven art looks frozen here even though it
runs. To exercise a rAF loop for real, patch it with a timer in a `preview_evaluate`:
`window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16)` and then
sample the DOM twice.

## 4. Audio must never depend on a CDN

`tutorly-games/adult/3d-millionaire-game/src/synth.ts` renders every sting and music bed with the Web Audio API.
`'synth:'`/blank means "built-in synth", and every URL-backed sound falls back to the synth on
`error`. Mute/volume persist in localStorage and must silence music beds, synth loops and the
heartbeat together. Keep that guarantee for new sounds.

## 4a2. Do not style fixed chrome with Tailwind utilities in these games

The games import Tailwind 4 *and* ship a hand-written `index.css` whose rules are unlayered, and
unlayered CSS outranks `@layer utilities`. A `fixed` utility therefore silently computes to
`position: relative` (measured in werewolf), pushing chrome below the fold and making the
"never scrolls" splash scroll by 48 px. Inline-style anything that must be fixed/positioned
(`style={{position:'fixed', right:16, bottom:16}}`) and re-check
`scrollHeight - clientHeight === 0` with nothing past the fold.

## 4b. Source layout = public URL, and one command publishes it

A game's SOURCE folder, its build output and its public URL are the same relative path:
`tutorly-games/adult/<game>/` → `<game>/dist/` → `/tutorly-games/adult/<game>/`.
Never copy a build somewhere else by hand and never bake a "/tutorly-games/<game>/" (no
`adult/`) path into anything — `scripts/check-static-deploy.mjs` fails the deploy on exactly
that mistake.

- `npm run build:games` builds all five Vite games with the ROOT toolchain
  (`scripts/build-tutorly-games.mjs`); `npm run build` runs it and then
  `scripts/collect-standalone-apps.mjs`, which copies every build into `dist/` at its public
  path and DELETES stale copies at old locations. A game that fails to build stops the publish
  (that is deliberate — a missing folder means a 404 on the host).
- **No old-name folders in `dist/`.** `ADULT_LEGACY` / `KIDS_GAMES_LEGACY` delete the stale
  copies on every build, and `check-static-deploy.mjs` fails if one is still there. Forwarding
  pages at those old URLs are opt-in (`LEGACY_REDIRECTS=1 npm run build`) — by default the
  deployed folder holds the games that exist and nothing else, so the adult folder reads as 16
  folders instead of 32.
- The root `tsconfig.json` **excludes `tutorly-games/`** (each game typechecks itself; their
  `node_modules` also inject duplicate DOM/Speech globals that break the main app's build).
  So: main app via `npm run lint`, a game via `npx tsc --noEmit -p tsconfig.json` inside it.
- `server.ts` maps `/tutorly-games/<audience>/<game>/<file>` → `<game>/dist/<file>` (in dev AND
  production, registered before the `express.static("tutorly-games")` mount), so a game is
  reachable at its real URL from `npm run dev` without any copying.

### The same rule for the widgets and the lessons

The dock-launched apps keep source and public path in step too, so `dist/` reads like the repo:
`tutorly-widgets/<app>/` → `/<app>/dist/` → `/tutorly-widgets/<app>/`, and
`tutorly-lessons/<app>/` → `/tutorly-lessons/<app>/`.

- **Only what is servable is published.** Of the folders in `tutorly-lessons/`, only
  `englishlesson2` and `Video-Lesson` are standalone apps (and they are published as signposts
  until built); `Avatar_Lesson`, `Avatar_Lesson_V2`, `Mock-Test` and `Mock_Test_V3` are
  TypeScript MODULES — they export the HTML generators the main app imports, so they compile
  into `dist/assets/main-*.js` and have no URL at all. Never "fix" that by copying them into
  `dist/`.
- **Retired lesson studios are archived, not published.** `music-lesson/`, `live-lesson/`,
  `daily-lesson/`, `gamified-challenge/`, `flipbook-homework/`, `learning-app-v2/` and
  `interactive-lesson-maker/` came off the live server's `used/` folder — the standalone lesson
  studios that the main app's built-in **Lesson Creator** replaced. They are kept in the repo
  for version history and are deliberately **absent from `APPS`**, so no `dist/` folder and no
  URL is created for them. `Video-Lesson/prebuilt/` holds that app's finished build (recovered
  from the server) filed the same way the Transcriber's is. See `tutorly-lessons/README.md`
  before adding any of them to `dist/`.
- **Nothing is served from the site root except `index.html`.** Every standalone app lives
  under a group folder (`tutorly-widgets/`, `tutorly-lessons/`, `tutorly-games/`) and the folder
  name IS its URL. Combat Arena used to be the one exception: it sat at the repo root as
  `combat-arena/` and was served from `/combat-arena/`, which broke that rule and gave it the
  only hyphenated name in the games set. It is now `tutorly-games/adult/arena/`, served at
  `/tutorly-games/adult/arena/`, built by `scripts/build-arena.mjs` (`npm run build:arena`) and
  collected by the `APPS` entry `${GAMES_ROOT}/arena`. The dashboard's and learner profile's
  navigation was repointed, and `/combat-arena/` forwards there.
- **Retired web-root folders get a static forwarding page, not just a rewrite rule.**
  `ROOT_LEGACY_REDIRECTS` in `scripts/collect-standalone-apps.mjs` maps each folder that used to
  sit beside `index.html` (`combat-arena/`, `content-creator-v1/`, `tutor-leaderboard/`, the flat
  `tutorly-transcriber-2-v1/`, …) to where it lives now. The collect step DELETES any stale build
  at the old path and writes a plain-HTML redirect stub in its place. A real folder always wins
  over a rewrite rule on Apache, so without this an old upload keeps serving its old build from
  the old URL no matter what `.htaccess` says. `public/.htaccess` and `server.ts` carry the same
  redirects for hosts that never see the stub.
- **A studio tile must have a launcher AND a renderer.** The Widget Studio lists (`VIP_STUDIO_`,
  `PREMIUM_STUDIO_`, `FREE_STUDIO_WIDGETS` in `ClassroomScreen.tsx`) are plain id/icon/label
  arrays, and `addWidget` is a chain of `if (type === …)`. A tile whose id appears in neither
  `addWidget` nor `renderWidget` falls through to the default branch, which appends a widget that
  renders `null` — invisible, but still counted by `widgets.length`, which is what the home
  screen uses to decide whether to show the "Ready to teach?" hero. Content Creator shipped that
  way, so clicking it made the hero vanish with nothing appearing. Add the launcher and the
  renderer, or don't add the tile.
- **A widget is one file — except the Transcriber.** Every other dock app builds with
  `vite-plugin-singlefile`, so its whole app is one `index.html` with no external asset
  references. That is why relocating one of these URLs is safe and why `check-static-deploy.mjs`
  reports "0 refs ok" for them — there is nothing to rebase. The Transcriber is the exception:
  it is a real multi-file build (`assets/index-*.js`, `assets/ai.worker-*.js`, and a 21 MB
  `ort-wasm-simd-threaded.jsep.wasm`) with a service worker and a manifest, so its address
  independence has to be ENFORCED rather than assumed (next bullet).
- **A build that arrives without its source is normalized, not trusted.**
  `tutorly-widgets/tutorly-transcriber-2-v1/` is the one app whose shipped artifact has no source
  in the repo: `prebuilt/` holds the only copy of it, which is why that folder is named
  `prebuilt/` and is NOT a `dist/` (a `dist/` is gitignored, and nothing with no source behind
  it belongs outside version control). Its `prebuilt-server/` is that build's own express API
  server, kept but never published. The folder ALSO holds the app's real project (`src/`,
  `vite.config.ts`, `server.ts`) — and that source is **older** than `prebuilt/` (newest file
  2026-07-05, only `/api/health` + `/api/translate`; `prebuilt/` is 2026-09-08 and calls
  `/api/sherpa/*`). So `npm run build` in there is a DOWNGRADE, and `from:` must keep pointing
  at `prebuilt/`. Its `vite.config.ts` has since been fixed to `base: "./"` in production,
  which is where the absolute URLs originally came from.

  `scripts/relativize-app.mjs` is applied to the published copy on every build, so a freshly
  dropped, still-absolute build is safe to publish:
  - it rewrites the app's baked-in `base` to relative paths — `copy` for `new URL(…, import.meta.url)`
    (a sibling in `assets/`), `./` for everything the document resolves — because an absolute base
    is what makes a moved app load its page and 404 every asset;
  - it reads the OLD service-worker scope out of the registration file and appends a retirement
    snippet, since a worker left registered at the previous address serves the broken page from a
    dead URL even after the fix is deployed;
  - it FAILS the build if anything still names the old address, so this can never ship again.
- **A service worker must not precache a huge file.** Workbox `install` is all-or-nothing: one
  entry that cannot be stored (the Transcriber's 21 MB model: the Cache API refuses it with a
  `NetworkError`) makes the whole registration fail, silently, on every load. `swPrecacheMaxBytes`
  on an app entry drops oversized precache entries at collect time, which is what lets that worker
  activate; the model is still fetched on demand. Do not "fix" a failed install by widening this
  unless you have checked that the response can actually be cached.
- **Old widget URLs are 301s, not copies.** The flat paths these apps used to live at
  (`/exam-builder/`, `/Tutorly-cscreen-v1/`, `/tutorly-lesson-insight/`, …) are redirects in
  `server.ts`, and the app's own dock link must open the `/tutorly-widgets/…` path. When you
  rename or move one, change BOTH: the redirect in `server.ts` and the `window.open` in
  `components/classroom/ClassroomScreen.tsx`.
- **A "finished single-file app" with no source is copied whole, not built.** The Whiteboard
  (`whiteboard-application-V2`) arrived from the live server as one self-contained `index.html`
  with no source project anywhere, so its `APPS` entry points `from:` at the folder itself
  (like `tutorly-lesson-insight`) rather than a `dist/`. A folder with its own `src/` and
  `package.json` must never be copied whole — it would sweep up `node_modules/`.
- **Not-yet-built apps get a signpost, never a 404.** `SIGNPOSTS` in
  `scripts/collect-standalone-apps.mjs` writes a small "not on this server yet" page at an app's
  new path — but ONLY when nothing is there, so dropping the real build in always wins and the
  signpost never comes back. This is what keeps a dock tile from silently opening the dashboard
  shell (the `*all` catch-all), which reads as "the app is broken".

## 4c. Group classes are taught from a ROSTER, not learner accounts
`pages/app2/GroupProfile.tsx` + `components/app2/profile/group/*` are the group-class area
(tabs: Profile, Lessons, Overview, Sessions, Calendar, Feedback, Competition, Automation).
A group class is **not** a set of individual profiles:

- the people in it are `GroupParticipant` (`types2.ts`), stored on the class as
  `GroupClass.participantsData`: name, CEFR, `facts`, interests, goals, how talkative they
  are, and `routing` (how to use that person in class). `participantIds` still exists for
  the old linked-account behaviour — nothing new should use it.
- the roster is entered two ways, both in `GroupParticipantsManager`: by hand, or
  "Copy AI prompt" → paste it into the tutor's own AI with a transcript → paste the JSON
  back. `services/groupParticipants.ts` holds the prompt and a deliberately tolerant parser
  (fenced JSON, prose around it, renamed keys, a trailing comma, arrays where a string was
  asked for). A re-import UPDATES people already on the roster by name rather than
  duplicating them, and never overwrites the tutor's own edits.
- **A button inside a form is a submit button.** `GroupParticipantsManager` is also
  rendered inside the "Create New Group Class" `<form>`, so every button in it is
  `type="button"` — without that, "Add learner" creates the class on the spot.
- **The roster is presented to every OTHER tab as learners.** `rosterAsLearners`
  (`services/groupParticipants.ts`) turns each `GroupParticipant` into the `Learner` shape the
  rest of the app already renders (level from CEFR, XP and streak from `progress`, `attended`
  flags from the logged attendance, facts as `[Tag] value` lines, empty `avatarId` so the avatar
  service draws that learner's initials). `GroupProfile` then uses
  `participants = [...linkedParticipants, ...rosterAsLearners(...)]`, which is why Overview,
  Sessions (homework/exams), Calendar, Feedback, Competition and Automation are populated for a
  transcript-taught class. Before this they were empty, because those tabs only ever read
  `participantIds`. Keep that union: a new tab that reads `participantIds` directly will be blank
  for every roster class.
- a roster learner's id is `roster:<participantId>` (`isRosterLearnerId` /
  `rosterParticipantIdFromLearnerId`). Writes must be routed: `updateGroupParticipant` for a
  roster learner, `updateLearner` only for a linked account — writing a roster learner through
  `updateLearner` fabricates an individual profile, which is exactly what a group class is for
  avoiding. See `handleSaveLearnerEdit` and `applyLearnerXp` in `GroupProfile` (XP for a roster
  learner is `progress`).
- **A form component must not be declared inline.** `ParticipantForm` in
  `GroupParticipantsManager` is wrapped in `useMemo(..., [])`: declared inline it is a new
  component type on every render, so React rebuilt all twelve inputs on every keystroke — lost
  focus and IME state, and any field edited in the same tick as another (autofill, paste) wrote
  to a node React had already discarded. Fields also report a PATCH (`onChange({ email })`), not
  the whole object, so no handler can resurrect values from a stale render.
- the lesson AI is reached through `buildGroupLessonFacts`: the generator reads a learner's
  `facts` (ManualGenerator:1809) and `interests`, so the ROSTER goes there — one line per
  participant, plus `GroupClass.groupRouting` injected as a MANDATORY instruction. That is
  how a group inherits every individual-lesson feature unchanged; do not fork the generator
  for groups.
- `groupRouting` is the "Step 2 · Customization & Lesson Structure — Group questioning
  plan" box in the Lessons tab: who to ask more, who to protect, which parts belong to whom.
  "Draft from roster" (`suggestGroupRoutingPlan`) writes a first version from levels and
  personalities.
- every learner records their own **`l1`** (first language) plus contact details (email,
  phone, country), shown on the roster card (email as a `mailto:` link) and fed into
  "Compose Email" and the class report. A group is often a mix, so `groupL1FromRoster` answers
  what the CLASS can be translated into: the shared language, `'Multiple'`, or `''`. Those three
  cases are different instructions in the prompt — unknown must never be reported as mixed.
- **a class only "shares" a language when every learner is recorded.** `groupL1Summary`
  returns `shared` only when all learners are known and agree; one recorded learner out of three
  is not a shared L1, and the UI says so (`groupL1Label` → `Arabic (1/3)`, `Mixed (2)`,
  `Arabic`, `Not set`). The lesson brief explains the partial case instead of hiding it, and the
  prompt block uses the weaker "do not translate as a whole" instruction.
- the **"Group Plan (Step 2)"** tab is the **first tab of the lesson workspace**, ahead of
  Lesson Creator and Gallery, because it decides who gets asked what. `LearnerPage` renders it
  from the optional `groupBriefTab` prop; a group passes `GroupLessonBrief`. It also carries the
  quick-insert lines (ask more / protect / parts-to-people / pairings), "Draft from roster",
  "Copy plan" and a read-back of the translation strategy, so the plan is written where the
  roster is visible. It is a tab, not a box above the workspace: it must not push the Lesson
  Creator off the top of the page.
- **every lesson prompt must carry the group block.** `ManualGenerator` builds one prompt string
  per lesson and sends it as `promptText` (both to the AI and to the clipboard), and
  `groupClassPromptBlock(learner)` is appended at ALL FOUR `setPromptText` sites — the three
  preset paths and the main creator. Add a new lesson path and you must append it there too, or
  that lesson type silently loses the roster, the L1 rule and the tutor's mandatory plan.
- the class profile header carries the same actions as an individual profile — Report, Update
  Profile (the CLASS: name, level, schedule), Copy Profile Facts (class facts + every learner),
  Compose Email (every learner with an email), Subscribe — and `GroupReport` reads the ROSTER,
  not linked accounts, or a roster-taught class reports nothing.

## 5. Verify before reporting

- `npx tsc --noEmit -p tsconfig.json` inside the game folder (the `main.tsx` `react-dom/client`
  TS7016 notice is pre-existing and expected — `npm install` in that folder fixes it).
- Run the game's own Vite dev server and check the real page (`overflow`, console errors, the
  whole flow), not just the build.
- Rebuild the hub artifact: `npx vite build` → `dist/index.html` (single file). The hub loads
  `/tutorly-games/<folder>/index.html`, which is that built file.
- A dev server needs its own port; check `netstat` first so you do not collide with another
  game's preview.
