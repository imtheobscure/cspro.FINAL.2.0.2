# tutorly-games / adult

Every grown-up game from the **Game Hub** lives in this folder, one sub-folder per game.
The folder name **is** the public URL, so it is the one thing that is expensive to change
later — every folder below is a single lower-case word, with no hyphens and no digits.

```
tutorly-games/
  adult/
    lingo/        the language course               (Next.js static export)
    runner/       run-and-shoot vocabulary horde    (Vite, single file)
    flix/         the video-lesson platform         (Vite, single file)
    geoseeker/    hunt locations on the world map   (plain static folder)
    edupoly/      buy, build and trade              (Vite, single file)
    hotseat/      the quiz-show ladder              (Vite, single file)
    ladder/       roll, climb, dodge                (Vite, single file)
    werewolf/     find the wolves                   (Vite, single file)
    dungeon/      fight through the dungeon         (signpost — build not uploaded yet)
    tales/        choose the story                  (signpost)
    chess/        play and learn chess              (signpost)
    deck/         flip the cards                    (signpost)
    flexcards/    read multi-sided cards            (signpost)
    madlibs/      fill in the blanks                (Vite, single file)
    feed/         scroll micro-lessons              (signpost)
    casharena/    the live multiplayer quiz arena   (Next.js static export)
    interview/    rehearse a real interview         (Next.js static export)
    console/      play Unity + YouTube Playables    (Next.js static export)
    party/        the classroom game show           (Next.js static export)
    reel/         the video platform                (Next.js + PostgreSQL, own host)
    talkarena/    run the whole speaking lesson      (Vite, single file)
    shoutout/     shout the falling words            (Vite, single file)
    speedreader/  read aloud against the ghost pace  (Vite, single file + images/)
    storycraft/   the GM runs the story, class decides (Vite, single file)
  kids/           ← kids' games (see kids/README.md)
```

The hub links to them as `/tutorly-games/adult/<folder>/index.html` (`launch("<folder>")` in
`gaming-hub/src/data/activities.ts`), so a folder name here and the name in that file must
match **exactly**, case included.

## The naming convention

The same rule the kids' games follow, and it applies to every game added later:

1. **The folder** is a single lower-case word — `lingo`, `hotseat`, `edupoly`. No hyphens,
   no digits, no version suffixes (`3d-`, `-v1`), because the folder is the URL and every
   one of those has had to be renamed at least once.
2. **The in-app name** is that word in CamelCase: `Lingo`, `HotSeat`, `EduPoly`.
3. **Name it after what the learner does**, not what it teaches, and keep it sayable out
   loud: `runner`, not `SideScrollVocabShooter3D`.
4. **No trademarked titles.** The property-trading game is *EduPoly*, the game show is
   *HotSeat*; a name you cannot put on a landing page is not a name.
5. **No two games may share a word**, and the hub tile's `id` should be the folder name so
   a stale link is obvious during review.
6. **Renaming means leaving a forwarding page.** Add the old folder to `ADULT_LEGACY` in
   `scripts/collect-standalone-apps.mjs`: the next build deletes the stale `dist/` copy and
   writes a redirect stub at the old path, so bookmarked and previously shared links survive.

## Adding or moving a game

1. Build the game (`npm run build`) and copy its output folder here, so the file
   `tutorly-games/adult/<folder>/index.html` exists. Games that have no build yet hold a
   signpost `index.html`; drop the real build in and it takes over unchanged.
2. In `gaming-hub/src/data/activities.ts`, add/keep the launch path with
   `launch("<folder>")` (or `launchKids("<folder>")` for the Kids' Corner).
3. If the game is a Next.js/sub-path build, update its `basePath`/`assetPrefix` to the new
   public path as well — for Lingo that is `BASE_PATH` in
   `tutorly-games/adult/lingo/next.config.ts`, and the server also needs its route updated
   in `server.ts` (`/tutorly-games/adult/lingo*all`).
4. Add the folder to the three scripts that must agree: `GAMES` in
   `scripts/build-tutorly-games.mjs` (Vite games only), `VITE_GAMES`/`STATIC_GAMES`/
   `PLACEHOLDER_GAMES` in `scripts/collect-standalone-apps.mjs`, and `GAMES`/
   `PLACEHOLDER_GAMES` in `scripts/check-static-deploy.mjs`.

Only `reel` is still a **server** app: it is Next.js + PostgreSQL, so it needs its own Node
process and is not copied into `dist/`. Point the hub at the host with `VITE_REEL_URL` at
hub-build time; the default is the same-origin path, which works behind a reverse proxy, and
its folder holds a signpost `index.html` so the tile explains itself rather than 404ing.

`casharena` (the quiz arena), `interview` and `console` used to be in that group and left it
the same way: each one was Next.js + PostgreSQL, and each one turned out to need nothing
from a server that the browser could not do, so all three are **static exports** now —
`npm run build` writes `out/`, `scripts/make-dist.mjs` moves it to `<folder>/dist/`, and the
collector publishes it like any other game. Their library/workspace data lives in the
browser (`src/lib/localApi.ts` in the arena and in Interview), so a single folder is a
complete, working app.

`talkarena` and `shoutout` arrived the same way, as **two byte-identical copies** of one
hyphenated platform (`gamified-language-learning-platform` and its `…5` sibling). Split by
what the tutor does with the class, one copy kept the teaching half and became
**TalkArena** — grid rounds with a mini lesson on every miss, Pictionary Studio with webcam
Sketch-Sense AI, nine timed debate stages, the practice room, and a teaching plan built from
what the class actually got wrong. The other copy became **ShoutOut**, the emoji-flood
arcade that used to live inside it: words rain into the camera feed, the class shouts them,
scores rotate per wave, and the scoreboard ends with the words that beat you. They are
separate games with separate splash cards, words in the same room instead of one
app-in-an-app, and both former folder names sit in `ADULT_LEGACY` so a stale dist copy of
`gamified-language-learning-platform` cannot survive a deploy.

`speedreader` and `storycraft` arrived the same way `talkarena` and `shoutout` did: as
hyphenated, multi-word folders (`speed-reader-shadowing-game`,
`ai-storytelling-game-architecture`) that the convention forbids, because the folder **is** the
URL. Neither had been given a hub tile yet, so both were renamed while a rename still cost
nothing — the old names are in `ADULT_LEGACY` purely so a copy built under one of them can
never survive a deploy.

  · **SpeedReader** (`speedreader`) is the projector karaoke-shadowing arena: eight themed
    scenes where your voice is the throttle — word-level pronunciation scoring, a live WPM
    readout and a ghost pace to beat, with a shared scoreboard and a PTE Read Aloud practice
    booth. It is the one adult game that ships its own media: the eight scene jpgs live in
    `public/images/`, the build keeps them in `dist/images/`, and `src/games/art.ts` resolves
    them through `import.meta.env.BASE_URL` so they stay relative — the same arrangement
    `dungeon` uses. (They were once imported from `src/assets/images/`, a folder that never
    existed, which made the game unbuildable.)
  · **StoryCraft** (`storycraft`) is the GM-run story engine: the projector canvas carries the
    characters, story map, decisions and leaderboard, and a second window holds the control
    panel — AI story generation, the universe library, live questions, effects, weather,
    overrides and session export. Its storage and its GM↔canvas channel are namespaced
    `storycraft:…` / `storycraft-sync` (they used to say `aetherweave`, an internal codename
    that told you nothing while debugging).

`party` came in the same shape as `casharena` and `interview`, and left the server group the
same way — with one extra wrinkle. It arrived as **`language-learning-party-arena`**, Next.js +
PostgreSQL with eight `/api/…` route handlers and a room table the learners' phones polled, and
it arrived **three times**: two of the folders (`language-learning-party-arena` and its `(3)`
sibling) were byte-identical builds of the full app, the third was an earlier, smaller cut of the
same product. Only the fullest build was kept, and it was renamed to the convention's one word
**before** any tile pointed at it, so there was never a URL to forward from — the old hyphenated
folder sits in `ADULT_LEGACY` so a copy built under it can never survive a deploy.

The database went the way the others did: the lesson library built from the Copy-AI prompt, the
session log and the score sheet live in the browser (`src/lib/localApi.ts`), so `out/` is a
complete app and the hub tile opens it like any other game. The one feature that genuinely
needed a server — a phone room where the learners answer from their own devices — became a
channel between windows of the **same browser** (a `BroadcastChannel` plus the same poll the
phones always used). A projector window and a second window on the tutor's machine can play
together; a phone on another device cannot, and no part of the app pretends otherwise.
Two bugs were fixed on the way in, both of which had made the delivered build unusable: the
game surface was declared *inside* the shell component, so React unmounted and remounted the
game every second (a card opened on the board closed itself immediately), and the six scene
pictures the games reference were never shipped — the folder had no `public/` at all, so every
`<img>` was a 404 on the projector. The scenes now ship as SVG in `public/images/`.

Games that are built *inside* the hub (Gimkit, Tic Tac Toe, Memory, Wordwall suites…) have
no folder here — they open as hub studios.
