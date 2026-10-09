# Reel — the video platform

A premium video-based language-learning platform: streaming, interactive subtitles,
video-synced lessons and real-time watch parties.

> **This is a different product from `tutorly-games/adult/flix`.** Flix is a
> self-contained static app that runs entirely in the browser. Reel is a full
> **Next.js + database** application: it searches external catalogs, stores a real
> library, generates lessons server-side and can talk to FFmpeg, WhisperX and
> LiveKit. Both live side by side; nothing here changes Flix.

```
tutorly-games/adult/reel/
├── drizzle/            generated schema SQL (embedded DB bootstrap applies these)
├── src/app             pages + API routes (Next.js App Router)
├── src/components      player chrome, discover browser, lesson UI, party panel
├── src/db              schema + seed + dual driver (Postgres | embedded PGlite)
├── src/modules
│   ├── discovery       catalog providers (Internet Archive, Wikimedia, TMDB)
│   ├── media           Shaka adaptive engine + FFmpeg jobs
│   ├── player          engine-agnostic controller, event bus, Zustand store
│   ├── subtitles       VTT/SRT/ASS/WhisperX engine, QA, provider search
│   ├── lessons         lesson schema, validator, AI generator, repository
│   └── watch-party     LiveKit transport + drift correction
└── src/app/api         REST surface for everything above
```

## Run it

```bash
cd tutorly-games/adult/reel
npm install
npm run dev            # http://localhost:3000
```

**No database to install.** With `DATABASE_URL` unset the app boots an embedded
Postgres (PGlite) in `./.pglite`, applies `drizzle/*.sql` and seeds the demo
catalog on first request. Point `DATABASE_URL` at a real Postgres and the same code
uses node-postgres instead (apply `drizzle/` with `drizzle-kit migrate` there).

```bash
npm run build && npm start     # production
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint
```

### Optional services (each degrades gracefully)

| Feature | Environment | Without it |
| --- | --- | --- |
| Any movie/TV metadata + official availability | `TMDB_API_KEY` | that provider is listed as "needs key"; Dailymotion and paste-a-link playback still work |
| YouTube search | `YOUTUBE_API_KEY` | YouTube is listed as "needs key"; Dailymotion searches without one and any pasted YouTube link still plays |
| Subtitle search | `OPENSUBTITLES_API_KEY`, `SUBDL_API_KEY`, `WYZIE_API_KEY` | paste/URL import still works |
| OpenSubtitles downloads | `OPENSUBTITLES_USERNAME`, `OPENSUBTITLES_PASSWORD` | search works, download links need the free account token |
| Thumbnails, waveform, audio extraction, subtitle streams, transcode | FFmpeg on `PATH` (or `FFMPEG_PATH`/`FFPROBE_PATH`) | `/api/media/process` answers 501 with the install hint |
| Word-level transcription + diarization | `WHISPERX_URL` (hosted) or `WHISPERX_BIN` (CLI) | `/api/subtitles/transcribe` answers 501 with the hint |
| Watch-party WebRTC sync | `LIVEKIT_URL` (or `NEXT_PUBLIC_LIVEKIT_URL`), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | the room falls back to HTTP sync (2 s polling) |
| Region for official availability | `TMDB_REGION` (default `US`) | US results |
| Embedded DB location | `PGLITE_DIR` (default `.pglite`) | local folder |

## What it does

**Discover — search and play any film or series.** `/discover` fans one query out to
every configured catalog in parallel:

- **Internet Archive** — public-domain and Creative Commons features, TV and
  documentaries with their real rendition ladders and any published caption files.
- **Wikimedia Commons** — CC/PD video with the transcoded ladder (240p–1080p) the
  player's quality menu reads.
- **Title information** (`GET /api/discover/info?titleId=tmdb:movie:603`) — the "find
  information about any movie or TV series" path: TMDB supplies cast and crew (with
  headshots), genres, runtime or season/episode counts and per-season detail,
  taglines, official trailers, content ratings, and JustWatch's **official
  availability** for the configured region; OMDb adds IMDb rating and votes,
  Metascore, Rated and box office; and the same title is cross-matched against the
  freely licensed catalogs so a public-domain or Creative Commons print can be played
  instead of merely described.
- **TMDB** — metadata for *any* movie or TV series plus its **official** streaming
  destinations. Results are cross-matched against the free catalogs, so searching a
  famous title gives either a playable licensed copy or an official link — never a
  pirate source.

Results carry their licence, attribution, availability and a playable/in-library
state. "Add & play" imports the title into the local catalog (course → series →
season → episode + every playable source + publisher captions through the subtitle
engine), then opens the player. Authorization types are first class: `PUBLIC_DOMAIN`,
`CREATIVE_COMMONS`, `OWNED`, `LICENSED`, `OFFICIAL_API`, `OFFICIAL_EMBED` — a source
without a licence is never offered for playback.

**Subtitle search and attach.** The transcript panel has a finder (and the empty
state *is* the finder). It searches OpenSubtitles, Subdl, Wyzie and archive.org
captions — including the caption files published with the archive item a title was
imported from — searches by title, IMDb/TMDB id, season and episode, attaches a
choice through the normalizing engine, and reports QA: cues, words, speech duration,
characters/second, overlaps, over-long cues and duplicates. Sync tools nudge or
rescale a whole track (`/api/subtitles/track`) and export VTT/SRT. VTT, SRT, ASS/SSA,
WhisperX JSON, gzipped and zipped files all normalize to the same structure.

**Adaptive streaming.** The player is engine-agnostic: progressive files play on the
element, HLS/DASH manifests go through **Shaka Player** (real ABR, audio/text track
lists, level pinning). A failed source falls back down the provider's ladder while
preserving position, rate, volume and track choices, and reports where it resumed.
Shaka is attached lazily — only when an adaptive manifest actually loads — so it
never hijacks the element for ordinary files.

**Lessons and the rest.** Segments/activities JSON, 14 activity types, anti-guessing
rules, three-tier feedback, XP/badges/streaks, SRS vocabulary, AI tutor, watch party
with host/follow/independent modes and latency-aware drift correction (LiveKit data
channel when configured, HTTP sync otherwise). Server state uses **TanStack Query**;
player/lesson state uses **Zustand**.

## API surface

| Route | Purpose |
| --- | --- |
| `POST /api/discover/search` | ranked, licensed search across catalogs |
| `GET /api/discover/status` | provider availability + recently imported titles |
| `GET /api/discover/title?id=` | rendition ladder + caption candidates for one title |
| `POST /api/discover/import` | add a title to the library, return the episode to watch |
| `POST /api/subtitles/search` | provider search (auto-detects the episode's archive items) |
| `POST /api/subtitles/fetch` | download/parse/store a provider result, with QA |
| `GET /api/subtitles/providers` | which providers and WhisperX are live |
| `POST /api/subtitles/transcribe` | FFmpeg → WhisperX → word-level track |
| `GET/POST /api/subtitles/track` | QA report, export, shift/stretch/edit a track |
| `POST /api/media/process` | FFmpeg probe / thumbnail / waveform / audio / subtitles / transcode |
| `POST /api/watch-party/token` | LiveKit room token (HS256 JWT, scoped grant) |

## Hosting

Unlike the static games this app needs a **Node host** (Next.js server + a database):

```bash
npm run build && npm start          # behind your reverse proxy
```

`server.ts` in the repo root does not serve it (it only serves static `dist/`
folders), so either proxy a path like `/tutorly-games/adult/reel/` to this
process, or host it on its own domain. The Game Hub tile for Reel
reads `VITE_REEL_URL` at build time for exactly that reason; without it the
tile points at the same-origin path.

## Development notes

- `next.config.ts` sets `allowedDevOrigins` for `localhost`/`127.0.0.1`/LAN: Next
  refuses dev-only resources cross-origin, and a blocked module chunk shows up as a
  mysterious `net::ERR_BLOCKED_BY_ORB` with the player silently falling back.
- Dev-only debug handles: `window.__tutoflixPlayer` (Zustand store) and
  `window.__tutoflixController` (player controller). Both are stripped in production.
- Schema changes: edit `src/db/schema.ts`, run `npx drizzle-kit generate`, commit the
  new `drizzle/*.sql`. The embedded bootstrap applies only files it has not recorded
  in `_tutoflix_migrations`; real Postgres applies them with `drizzle-kit migrate`.
