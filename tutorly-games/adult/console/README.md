# Console — the games console

A **static folder**. It plays games: 1,650 indexed YouTube Playables plus any
Unity WebGL build you open, inside a pro-gaming rig with score capture and a
leaderboard.

```
npm install
npm run build      # next build → out/ → dist/  (what scripts/collect-standalone-apps.mjs publishes)
npm run dev        # development
npm run typecheck
```

Public URL: **`/tutorly-games/adult/console/`** — the folder name IS the URL, and
it is baked into the build as `BASE_PATH` in `next.config.ts`.
`gaming-hub/src/data/activities.ts` launches it with `CONSOLE_URL`, which defaults
to that same path; set `VITE_CONSOLE_URL` at hub-build time only if you host it
somewhere else.

## What runs where

| Feature | Where it runs |
| --- | --- |
| 1,650-game catalog, rigs, RGB/scanlines, telemetry | browser (a plain static export) |
| Your scores, "Your Records", custom games | browser (`src/lib/localApi.ts`, `localStorage`) |
| Unity builds you load from a folder | browser (`src/lib/localUnity.ts` + `public/unity-sw.js`, Cache API + service worker) |
| Games you add by URL | framed directly, if their host allows it |
| **YouTube Playables inside the rig** | **`public/play.php`** on a PHP host, or the `server.ts` route of the same path when this app runs on Node (`npm run dev`, `npm start`) — or a proxy you point at |
| Playables when no proxy is answering | opened on YouTube in a new tab, in one click |

There is no database and no Node process to run: `output: "export"` writes files.

## The one thing a static host cannot do, and what replaced it

A Playable is a Unity build on `<id>.playables.usercontent.goog` whose response
carries `frame-ancestors https://*.youtube.com …`, so the browser refuses to frame
it from our origin. Reading the document to strip that header needs a request the
browser is not allowed to make (the build host sends no CORS headers) — it has to
be done by code on a server.

That job used to be a Next route handler (`/api/play/[host]/[...path]`). It is now
two files with one contract:

* **`public/play.php`** — for the cPanel host, which runs PHP but no Node process;
* **`server.ts`** — the Express route of the same path, which answers when this
  app itself serves the console (`npm run dev`, `npm start`).

Both keep the same safety checks (only `*.playables.usercontent.goog`, no
traversal), the same HTML transform (drop the CSP meta tags, re-point
root-absolute refs, swap the YouTube SDK for the bundled `ytgame-shim.js`) and the
same content types. The app asks the path whether anything answers before using it
(`src/lib/proxy.ts` → `play.php/__probe__`, which reports which one replied) and
falls back to "play it on YouTube" when neither is there, so the tile never
dead-ends.

It is addressed by path — `play.php/<buildHost>/<path/inside/build>` — because a
Unity build fetches its parts with relative URLs, and keeping the build host in
the path is what makes those come back to the proxy. Apache passes that through as
`PATH_INFO`; the `.htaccess` beside it covers hosts configured with
`AcceptPathInfo Off`. Their cPanel host runs PHP (the site's own `auth.php`), so
Playables stream in-rig there.

Needs `curl` and outbound HTTPS on the PHP side (the Node side uses `fetch`). If
the console is served from a host with neither — a plain static host, or the
Freebuff preview's throwaway file server — or you would rather run the proxy
elsewhere, the app accepts an override:

```
/tutorly-games/adult/console/?proxy=https://my-proxy.example/play.php
# or build-time: NEXT_PUBLIC_CONSOLE_PROXY_URL=…   (its base must accept <host>/<path>)
```

## If a game stops with a Unity error

```
RuntimeError: null function or function signature mismatch
  at invoke_iiii …  Browser_mainLoop_runner
```

That is Unity's own fatal error, and it means the loaded pieces no longer belong to each other:
**a Unity WebGL build is only valid as a set** — the loader `.js`, the `.wasm` and the `.data`
share one function table — so a call through a table index the current module does not have dies
the moment that code path runs. That is why it looks like "sometimes", mid-game, in whichever
title YouTube updated.

The usual cause is a half-stale cache: the entry document was fetched fresh while one of the
build files came from the browser's copy. So the proxy serves everything the build has to agree
on — the wrapper document plus js/wasm/data/unityweb/css — with **`no-store`**: nothing may keep
a copy, neither the browser nor an intermediary. That costs nothing here, because the build host
sends **no `ETag`** and only a `Last-Modified` for these files, so there was never a validator
that could have saved a re-fetch: `no-cache` already meant one.

Forwarding that `Last-Modified` is what previously made a bad copy **permanent** — the browser
revalidated its stored body, the host answered 304, and the broken set stayed in service through
every reload and every deployment. The browser now only ever sees our own namespaced validator
(`etag: "tc3.<base64url(host validator|size)>"`), while a copy written by any other proxy build
carries a tag this one does not recognise and gets a 200 with the current bytes instead. Media
(images, audio) still caches for a day. Pressing **Reload game** fetches the current set, and the
rig's telemetry strip names the proxy that answered plus its version (`PROXY (node v3)`), so a
deployment still running an older `play.php` is visible at a glance.

When it happens, the console now says so itself: it reads Unity's error dialog inside the frame
(and the `ytgame-shim`'s `runtimeError` event) and shows a banner with **Start fresh** and
**Reload game**, while trying the next proxy on its own. If the error survives all of that, it is
that game's own build — and the banner says so instead of blaming a cache that has already been
ruled out. Two things are worth knowing before concluding that, and both are checkable from the
rig:

* **the delivery is not the cause.** The files this proxy served are byte-identical to the ones
  YouTube serves for the same build (fetch both and compare a hash), and the build set is fetched
  under one token, so nothing can be mixed from two builds.
* **the game's own state is not the cause.** Clearing it is what the eraser does (below); if the
  failure is identical from a clean state, there was no state involved.

## The eraser: starting one game over, for real

The eraser button next to **Reload game** (tap twice) clears *this* game and nothing else:

1. **the frame is taken down first.** This is the part that has to be right: deleting an IndexedDB
   database while the page holding it is open makes the delete `blocked`, and a blocked delete
   silently does nothing. An earlier version of this button did exactly that — it reported success
   and changed nothing.
2. **then it clears** the `ytgame` save payload — under *every* build host this game has been
   opened on, not only the current one (see below) — any storage key or database named after the
   game, Unity's Cache Storage caches (`UnityCache_<company>_<product>`, matched by *name* as well
   as by URL, because a page's ordinary storage clearing never reaches them) and this build's rows
   in Unity's shared `UnityCache` database — which is pruned, not dropped, so other games on this
   origin keep their cached builds.
3. **then it asks for a freshly stamped build.** The frame URL carries `?fresh=<marker>`, and the
   proxy folds that marker into the build token, so every build URL is one the browser has never
   requested. This is the only honest answer to "clear the cache": a page cannot clear the
   browser's HTTP cache, but it can stop asking for a URL that something might have stored.

A Playable's save is named after its **build host**, and YouTube gives a republished game a new
host — so one game accumulates one save per host it has been opened on, and clearing only the
current name leaves every earlier save behind. Measured on *Build a Queen*: after a hard reset,
`tutorly:ytgame:save:10649787444406743561` was still in storage while the game had moved to
`…:10542200469832840160`. The names are recorded in `tutorly:console:game-hosts:v1` each time a
game is loaded (`rememberGameHost`), and the reset clears all of them. A save left by a host from
before that record existed is still caught by the global **CLEAR CACHE**, which clears every
`tutorly:ytgame:save:` key there is.

The note under the rig is the report — what was cleared, and anything that could not be. If a
store was still open it says so and asks for a second tap rather than claiming a clean slate, and
if the game ran on a proxy at another origin it says that only the files could be cleared, because
one origin may not touch another's storage.

## The build set is stamped, so a stale file can never be mixed in

A Unity build is one artifact split across four files — the loader `.js`, the framework `.js`, the
`.wasm` and the `.data` — that share a single function table. If a browser hands the game one of
them from an older copy, the first JS→wasm call through a stale table index dies with
`RuntimeError: null function or function signature mismatch`, and the C# side throws
`ArgumentException: Incompatible Delegate Types` while combining delegates.

Do not read every such error as a mixed set, though: the two errors above are *also* what a broken
build throws on its own. *Build a Queen* was measured after a full reset — empty PlayerPrefs, a
complete `.data` file, every part fetched fresh from YouTube's live host — and its
outfit-requirements screen still died with `NullReferenceException`, naming body parts its own
`BodyPartsDatabase` does not contain (`bopeep_hair`, `bopeed_outfit`). Nothing was mixed and
nothing was cached; the published build is missing that level's content. To tell the two apart:
reset the game, and if the identical error comes back on a stamped set, it is the game.

That build cannot finish a run, so the game is no longer offered: its row is out of
`playables.json` and its id is in `EXCLUDED_PLAYABLES` (`src/data/catalog.ts`), which is what a
re-crawl cannot undo. Nothing else changes — a tutor who pastes the Playables URL by hand still
loads it, because that is an explicit request rather than something the console suggested.

`no-store` on those files stops *new* copies being stored, but it cannot evict one that was cached
under an older policy — a URL has to change for that. So the proxy stamps the set: it hashes the
build's own HTML (nonces removed, plus the host's validator and the proxy version) into a short
token, injects it into the page, and that page appends `?bt=<token>` to every `.unityweb`/`.wasm`/
`.data` request through both `XMLHttpRequest` and `fetch`. A changed build — or a changed proxy —
means changed URLs, and a fresh set can never be assembled out of old parts again. The proxy drops
`bt` before talking to the build host, so it never reaches YouTube.

The stamp is in all three providers (`server.mjs`, `public/play.php`, `server.ts`). To see it on a
running game, check `window.__tutorlyBuildToken` in the frame.

## Is the link this catalogue stores still the one YouTube serves?

A Playable's build does not live at a stable address: YouTube gives each published build its own
numeric host, and a re-published game gets a new one. `src/data/playables.json` records the host
that was live when the catalogue was scraped, so a stale entry means the rig asks for a build that
is gone — a dead frame that looks like a corrupt game when only the address is old.

```
node scripts/check-playables-links.mjs                 # 12-game sample
node scripts/check-playables-links.mjs --id="Tall Man Run"
node scripts/check-playables-links.mjs --all --fix     # repair stale hosts in place
```

It resolves the live build exactly the way `play.php` and the app do, probes the live entry, and
exits non-zero if anything is stale, so it can gate a deploy. `--fix` rewrites only `buildHost` and
`entryPath`, and only for entries whose live build answered 200 — then rebuild, because the bundled
copy of the catalogue is what the app reads.

## Several proxies, tried until one works

The proxy is not a single address any more. The console holds an ordered list
(`src/lib/proxy.ts`) — `?proxy=` / `NEXT_PUBLIC_CONSOLE_PROXY_URL` first, then the bundled
`play.php`, then a copy at the site root — probes each with `__probe__`, and keeps the winner.

Two kinds of failure are then handled automatically, and neither ever shows a screen telling the
tutor to go and play the game on YouTube instead:

* **The proxy never answers.** The walk continues past it, and if *no* candidate answers the
  rig stays in its loading state and re-probes every few seconds (a deploy can land mid-lesson),
  listing which candidates were tried and what each one said.
* **The proxy answers and then cannot serve the build** (half-uploaded folder, blocked CDN, a
  firewall that allows the handshake but not the assets). The frame is given 22 s to report a
  first frame; if it never does, the player advances to the next candidate and streams again. A
  Unity `RuntimeError` inside the frame counts as the same signal and triggers one hop.

The same reasoning applies to the room panel and the YouTube icon in the toolbar: those are
deliberate affordances a tutor can choose, not error states the console forces on a lesson.

A proxy on another origin needs CORS. All three providers send
`Access-Control-Allow-Origin: *` (plus an `OPTIONS` answer) — without it the browser refuses to
let the console read the probe response and a perfectly healthy proxy is reported as missing.

## What changed from the server version

* `src/app/api/**`, `src/db/**`, `drizzle.config.json`, `lib/playables.ts` — gone
  with the server and the database; scores and custom games are per browser now
  (the board is labelled a practice board, because the rivals on it always were).
* The proxy moved to `play.php`; `next.config.ts` gained `output: "export"`.
* `scripts/make-dist.mjs` moves the export to `dist/` and makes sure `play.php`
  and `.htaccess` are in it.
* `public/ytgame-shim.js` learned the `play.php/<host>/…` shape, so two games can
  no longer share `saveData` under one key.
