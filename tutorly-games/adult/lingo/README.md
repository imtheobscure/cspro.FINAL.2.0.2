# 🦉 Lingo

A gamified language course (Duolingo-style) whose **entire content comes from one AI-generated JSON file**.
The interface is **English only**; the learner's translations are written in whatever first language (L1) the
content pack declares.

Everything in the app — vocabulary, grammar, idioms, conversations, sentences — is optional. If the source
document has no grammar, the app simply shows no grammar.

## How it works

```
content/tutolingo-content.json   ← the only content source (public/content/… in the repo)
        │
        ├── Home            learning path: units + lessons planned from the pack
        ├── References      the study companion to Home, four sub-tabs:
        │      ├── Vocabulary   every word in the course + flashcard review mode
        │      ├── Grammar      all rules, mini lessons and their tests in one place
        │      ├── Dialogues    the conversations, read with native voices
        │      └── Idioms       idioms / slang / registers by formality
        ├── League          weekly leaderboard (names follow the learner's L1)
        ├── Profile         L1, learner info, achievements, settings
        ├── AI Prompt       builds the prompt that creates the JSON file
        └── Checker         validates / auto-repairs a pack before it goes live
```

**Home is the graded course; References is the same content gathered for study.** Nothing in References is extra
material — it is a second view of the pack, so the two always stay in sync.

Every lesson is generated at runtime from the pack by `src/lib/lesson-engine.ts`, which produces all eight
activity kinds: `match`, `select_translation`, `fill_blank`, `type_hear`, `reorder`, `listen_select`,
`speak` (speech recognition) and `tap_complete`.

After every answer — right or wrong — the player shows a short **mini lesson in the learner's L1**: the rule or
word behind the exercise, why the answer is what it is, and the L1 translation. It is built in
`src/components/AnswerFeedback.tsx` from the pack's own `nativeRule` / `nativeMeaning` / `nativeExplanation`
fields, so no content is invented to produce it.

Dialogues are read aloud with the **Microsoft Azure natural voices** chosen per speaker (a different voice per
character). The app calls the Azure speech endpoint directly from the browser — see **Voice settings** in Profile
for the key/region, the per-speaker voice map and the offline fallback (browser voices) used when Azure is not
configured.

The layout is **left-to-right**: the navigation panel sits on the **left**, the content on the right
(mobile uses a bottom bar).

## Loading a pack without a web root (drag & drop / paste)

On a phone, or on a deployed site, there is nowhere to copy `content/tutolingo-content.json` into — so a pack can also
be opened **in the browser**:

- **Home** (empty state) — *No course content loaded yet* is now a drop zone: drag the agent's `.json` onto it (or tap to
  pick the file) and the path fills itself in immediately.
- **AI Prompt → step 3** — paste the agent's answer into the box and press **📥 Open in Lingo**, or drop the file.
  **💾 Save as tutolingo-content.json** keeps a copy to publish later.
- **Checker** — after a check or an auto-repair, **📥 Load into Lingo** opens the pack in the app; the published pack
  can also be read back with *Check the uploaded pack*.
- **Profile → 🧪 Demo data** — switch between *your content pack*, the *sample (mock)* pack and the *uploaded file*, and
  forget the uploaded file again.

The loaded pack is **normalised** exactly the way the app normally reads a pack (`coercePackText` forgives code fences,
smart quotes, trailing commas and surrounding prose), then stored in **IndexedDB** (`src/lib/local-pack.ts`) —
IndexedDB rather than `localStorage` because a real pack is megabytes and `localStorage` throws above ~5 MB. It survives
reloads, a bad file never replaces a working pack (the error is shown instead), and nothing is ever uploaded anywhere.
Publishing for everyone still means saving the JSON as `content/tutolingo-content.json` next to the app.

## Trying it without generating content (mock data)

The repo ships a small sample pack, `public/content/tutolingo-content.mock.json`: two demo units with
24 words, 6 grammar points, 10 idioms, 3 conversations and 20 sentences, enough to exercise every screen
and every activity type.

- **Profile → 🧪 Demo data (for testing)** switches between *Your content pack* and *Sample data (mock)*.
- Opening the app with **`?pack=mock`** (e.g. `…/tutorly-games/lingo/?pack=mock`) loads the sample pack for that visit.

There is deliberately **no banner or other demo chrome** in the UI: the shipped app is production-ready. The
sample pack is a testing aid only and behaves exactly like a real pack.

## The AI prompt: no repetition, full coverage, real depth

`src/content/ai-prompt.ts` is the single source of truth for what the app expects, and it now states the
things that actually make a pack usable:

- **Non-repetition** — one sentence, one question. No sentence, prompt, option set or example may appear
twice anywhere in the file; the banks (unscramble, listening, dictation) must each use different sentences;
a `hint` may never repeat the sentence's own translation. `meta.coverage` asks the agent to report
`distinctSentences` and `duplicatesRemoved`, so it has to audit itself.
- **Volume** — floors per chapter (20+ vocabulary items, 6+ grammar points with 8+ exercises each, 10+
idioms, 8+ dialogues with 8+ turns, 60+ sentences) and a final pass that rewrites what fails the audit.
- **Full coverage of the PDF** — 100% of the source, nothing beyond it, every item carrying a verbatim
`sourceQuote` and a `sourceRef`, and anything unconverted listed in `meta.coverage.omissions`.
- **A `feedback` mini lesson on every item**, written for that learner.

The Checker reports the same two things on the way in: repeated sentences (each repeat becomes a duplicate
question) and items with no `feedback` block.

## Generating content

1. Open the app → **AI Prompt**.
2. **Type** the learner's **first language (L1)** in the text box — required, because it decides the language
   of every translation. Any language or spelling is accepted ("Farsi", "فارسی", "español", "Klingon", …):
   recognised languages get their proper name and their own leaderboard name pool, anything else is used
   exactly as typed. Leave it empty to follow the L1 declared by the content pack. Then fill in the
   **learner information** box (age, job, interests, goals, exam targets).
3. Press **Copy AI prompt** and paste it into your AI agent **together with the source PDF**. The prompt is
   binding on this point: it forbids outside knowledge, forbids inventing items to fill a section, and requires a
   verbatim `sourceQuote` plus a `sourceRef` on every vocabulary item, grammar point, idiom, conversation and
   sentence — so the JSON is an index of *your* file, not a generic course. It also carries the
   **answer-length anti-cue rule**: every option set must be length-balanced, and the longest option must
   never be the correct one, because learners otherwise score by tapping the wordiest answer.
4. The agent replies with one single JSON file. Paste it into **AI Prompt → step 3** and press **📥 Open in Lingo** —
   the course is live in that browser at once. (Or save it as `content/tutolingo-content.json` in the exported build to
   publish it for everyone.)
5. Reload the app; the path, lesson count and all pages fill themselves in.

## Checking a pack before it goes live (Checker)

Because `normalizePack` repairs and ignores broken content silently, a half-finished pack still *looks* fine in the app.
The **Checker** (`/check`, in the sidebar) reads a file exactly the way the app does and reports what would really happen:

- **JSON validity** — code fences, trailing commas, smart quotes, leading prose (the agent's usual mistakes, named).
- **Silent drops** — items the app would throw away without telling you (no term, non-string fields, missing answers).
- **Missing translations** — every item without its L1 text, plus examples whose `native` is missing.
- **Thin content** — grammar points with fewer than 3 examples or 4 exercises, exercises with fewer than 4 options
  or whose answer is not among the options, dialogues with fewer than 6 turns, sentences shorter than 3 words.
- **Uncovered sections** — empty vocabulary/grammar/idioms/conversations/sentences and what that costs the course.
- **Coverage honesty** — `meta.coverage` counts compared with the real array lengths, plus the omissions the agent admitted.
- **Activity coverage** — which of the eight activity kinds this pack can actually build, and why not.
- **Course size** — units, lessons and exercises per lesson the pack will produce.

Paste the JSON, drop a `.json` file on the box, or press **Check the app's current pack** (it reads whichever file the app
is loading — sample pack and browser-uploaded pack included). Identical problems are grouped (`×23`) so a systematic gap
reads as one instruction. **Copy the report for the AI agent** produces a plain-text issue list you can paste straight back
into the conversation; **Download normalised pack** saves what the app will actually load (structure cleaned, content gaps
untouched), and **📥 Load into Lingo** runs the checked pack in the app itself, with no file to publish.

The score is 100 minus 6 per error, 1.5 per warning and 0.25 per note (a grouped issue counts up to 5×), with the verdict
*Ready to publish* (no errors, no warnings), *Needs work* or *Do not publish*.

### Auto-repair — fix it, don't just report it

Most problems in an agent's file are mechanical, so the checker can fix them itself. **🔧 Auto-repair this pack**
(`src/lib/pack-repair.ts`) first coerces the text (strips code fences, leading/trailing prose, smart quotes, `…`,
trailing commas, then parses), then repairs the pack and leaves a publishable JSON in the box:

- **Text coercion** — anything `JSON.parse` would reject but a human can read.
- **Option sets** — fills exercises to four options using distractors taken *only from the pack's own* vocabulary and
  idioms, de-duplicates them, and guarantees the answer is one of its own options.
- **Gaps** — writes `______` into `fill_blank` sentences and grammar prompts that carry their answer inline.
- **Drops** — removes entries the app could never load (no term, no prompt, no answer, empty turn/sentence).
- **Coverage counters** — recomputes `meta.coverage` so the numbers match the file.
- **`meta.app` / `version`** — normalised to `Lingo`.

It never invents content: every replacement string already exists in the file, so a repaired pack is still 100% the
agent's material. The repair log lists each fix, and a separate “still needs the AI agent” list holds the things only
the agent can do (missing L1 translations, sections that are genuinely too thin). **Download the repaired pack** saves
the result; **Re-check the repaired pack** re-runs the audit on it.

A clean pack is a no-op: repairing the bundled sample reports *0 fixes* and preserves every item.

## Home → References (deep links)

Every lesson is a slice of the pack, so its entries can be linked directly:

- Open a lesson circle on **Home**: the popup lists up to four entries that lesson is built from
  (grammar rule, words, idioms, dialogue) — each one opens the matching References tab and scrolls
  to that exact entry. The lesson player's header has the same **📖** shortcut for the exercise you
  are on, the answer feedback links to the entry behind the answer, and the lesson summary ends with
  “Study these in References”.
- Anchors are `id="ref-<tab>-<slug>"` plus `data-ref="<key>"` on the entry itself (`src/lib/ref-link.ts`),
  so a link such as `/references?tab=grammar&focus=Present%20Simple` scrolls to the entry and flashes it.
- The banner checks the **pack data** (`refExists`) rather than the DOM: if a key is not in the pack it
  says so instead of promising an entry it cannot show.

## Mini lessons (what every answer teaches)

After each checked answer the app shows a lesson, not just a verdict: **what it means**, **how it is built**,
**where this learner will actually use it**, unique example sentences with a 🔊 button, and one **CCQ** — a
question the learner answers out loud. There is no heading on the panel: the content itself teaches.

The text comes from a `"feedback"` block on the item (vocabulary, idiom, grammar point, sentence and
dialogue line all support it):

```json
"feedback": {
  "meaning": "…in the learner's first language…",
  "form": "…how it is built…",
  "use": "…where/when/how this learner will use it, in their own life…",
  "examples": ["unique sentence 1", "unique sentence 2", "unique sentence 3"],
  "ccq": "What do you put in your bag when you travel?",
  "tip": "one thing to remember"
}
```

- `src/content/tutolingo.ts` normalises the block (a bare string is accepted too), `src/lib/lesson-engine.ts`
  maps it onto the `Coach`, and `src/components/AnswerFeedback.tsx` renders it. Packs without the block still
  work — the panel then says so and points at the prompt, instead of looking broken.
- The 🔊 button reads the explanation in the learner's own language. `localeOf()` understands
  `"Persian"`, `"Persian (Farsi)"`, `"fa"` and `"fa-IR"` alike — an earlier version labelled the Persian
  explanation “English” and read it with an English voice, which sounded like silence.

## Timed races (Vocabulary · Dialogues · Idioms)

Each reference tab has a **⏱️ Race against time** quiz built from whatever the current search/filters leave:

- **Vocabulary** — meaning → word, word → meaning, gap-fill and listening, up to 40 questions per run.
- **Dialogues** — *Choose the best reply* (the wrong options are real lines from other dialogues, so only
  understanding wins) and *Reorder the conversation* (four consecutive lines put back in order).
- **Idioms** — meaning → expression, expression → meaning and gap-fills.

Each question has its own clock; correct answers build a streak multiplier (×2 per streak, capped), the
best score per quiz is kept in `localStorage`, and a finished run awards XP. Questions are generated by
`src/lib/race.ts` and rendered by `src/components/RaceQuiz.tsx`.

## Skipping a question

Every question has a **Skip ⏭** button next to *Check*: some places are too quiet to speak in and some
answers need a keyboard nobody has at hand. Skipping costs no heart, is not recorded as a mistake, and is
left out of the accuracy figure (the summary reports how many were skipped).

## Continue where you left off (and mid-lesson resume)

`?continue=1` (or `?resume=1`) on any entry point opens the next unfinished lesson instead of the path.
The gaming-hub tile uses it, so learners land straight in a lesson, and Home shows a
**Continue where you left off** card with the same target (lesson, unit and position). When every lesson
is done the card becomes a “keep it sharp” link to practice.

The exact exercise is remembered too: every answer stores
`lessonProgress = { lessonId, index, total, updatedAt }` in `localStorage`, so reopening a lesson (or
clicking the tile) resumes at the question the learner stopped on and says so — “⏩ Picked up where you
stopped — question 5 of 14”, with a **Start over** button. The record is cleared the moment the lesson is
completed, and Home's card switches to “Pick up where you stopped · question 5 of 14”.

## Offline (installable PWA)

Lingo installs as an app and keeps working with no connection:

- `public/manifest.webmanifest` — standalone display, portrait, green theme, maskable icons, and
  shortcuts for *Continue my lesson*, *References* and *Practice mistakes*. Its `start_url`, `scope`,
  `id`, icons and shortcuts are all **relative to the manifest**, so the manifest is correct in whatever
  folder the build is uploaded to.
- `public/sw.js` — at install it pre-caches every route's HTML **and** every hashed chunk those pages
  reference (checked), so the whole course works offline. Navigations and `/content/` are network-first
  (falling back to the cache offline), hashed chunks are cache-first, `/api/tts` is never cached, and old
  caches are pruned on activation.
  - Navigation used to be cache-first with a background refresh. That served the **previous** build's HTML
    after a redeploy, and because that HTML names the previous hashed chunks the whole app kept running the
    old version no matter how often the learner reloaded — i.e. uploading a new folder looked like nothing
    happened. Network-first costs one small request and makes a redeploy take effect immediately.
  - **`VERSION` is stamped automatically on every build** by `scripts/stamp-sw-version.mjs` (the last step of
    `npm run build`). The worker lives at a fixed URL, so the browser only installs a new one when those bytes
    change; until then the old worker keeps serving its cache and an uploaded build looks like nothing
    happened. The version is the hash of everything Next emitted, so every real change opens a fresh version
    and an unchanged rebuild keeps the same one (no pointless re-download).
  - **An update never costs learner data.** Only `caches` are versioned and pruned; progress (streak, XP,
    hearts, completed lessons, mid-lesson position) is in `localStorage` and the loaded content file is in
    IndexedDB, and the worker touches neither.
  - The scope is derived from the worker's own URL (`new URL("./", self.location).pathname`) instead of a
    hard-coded `/tutorly-games/lingo/`, so a differently named deploy folder can no longer make the worker cache
    nothing while still reporting “Failed to fetch”.
  - Every `Cache.put()` goes through `safePut()`, which swallows `NetworkError`/`QuotaExceededError`.
    Unawaited writes used to surface in the console as
    `Uncaught (in promise) NetworkError: Failed to execute 'put' on 'Cache'`.
- `src/app/layout.tsx` builds the manifest/icon URLs from `NEXT_PUBLIC_BASE_PATH` (exported by
  `next.config.ts`), so the metadata can never drift from the real base path again.
- `src/components/PwaBoot.tsx` — registers the worker **once per page**, shows an “📴 Offline” ribbon when
the device is offline, and adds **Profile → 📲 Install & offline** (install button, offline-ready status,
  and the steps for the device you are on). A worker update reloads the page once so chunks match.
- **Mobile → 📲 Get app** (last slot of the bottom bar) opens the install section as a **bottom sheet** —
  phone learners never open the rail, so the same one-tap button and platform steps are one tap away. The
  sheet closes with its ✕, the dimmed backdrop or Escape. The slot disappears once the app is installed.
- **Home → the same card**, for the first visit on a phone, is a dismissible mobile entry point (`lg:hidden`,
  hidden after the ✕ or once installed; the ✕ persists across reloads). It is client-only by design — the
  server snapshot renders nothing, so hydration never flashes it.
- **Sidebar → 📲 Install the app** (above *Daily practice*) is the one-tap installer. The captured
  `beforeinstallprompt` event lives in a module store, so every caller shares one deferred prompt (a second
  `prompt()` on a consumed event throws); the main button hands the click straight to the browser's own
  install window, and the Windows / Android / iPhone-iPad rows carry the steps for the other devices you
  own (Safari on iOS cannot be prompted programmatically, so there the button reveals the three taps).
- Icons (`icon-192/512`, `icon-maskable-512`, `apple-touch-icon`) live in `public/`.

## Mobile

The app is phone-first: a bottom tab bar under `lg`, the left rail from `lg` up, `viewport-fit=cover`
and `env(safe-area-inset-*)` padding so nothing hides under a notch or home indicator, `100dvh` shells,
and a `--path-spread` variable that narrows the Home path zig-zag on small screens so a lesson popup can
never run off the edge. Verified at 320 px and 390 px on every route: no page scrolls sideways.

The bottom bar carries the five pages a learner opens every day — **Home · References · Notebook · League ·
Profile** — plus the install action. **AI Prompt** and **Checker** are authoring tools used once on a
computer to build and validate a content file, so they stay in the rail; they are still reachable on a phone
by URL, just not in the tab bar where their labels squeezed the learner pages thin.

## Development

```bash
npm install
npm run dev        # http://localhost:3000/tutorly-games/tutolingo
npm run typecheck
```

`next.config.ts` sets `devIndicators: false`: Lingo is previewed as a finished product, so the floating
“Open Next.js Dev Tools” badge no longer sits over the lesson screen and the bottom navigation. Errors
still appear in the terminal and in the browser console.

## Build & deploy

The app is exported as static files with the `/tutorly-games/tutolingo` sub-path baked in (`next.config.ts`), so it
can be dropped into an existing web root:

```bash
npm run build      # emits ./out
```

Deployment (host: `https://cspro.tutomy.com/tutorly-games/lingo/index.html`):

1. Copy the **contents** of `./out` (this repo keeps a built copy in `./dist`) into the host folder
   `tutorly-games/lingo/` — i.e. `tutorly-games/lingo/index.html`,
   `tutorly-games/lingo/_next/…`, `tutorly-games/lingo/content/tutolingo-content.json`, …

> ⚠️ **The host folder must be `tutorly-games/tutolingo`.** That base path is compiled into every
> asset URL, so uploading these files into a folder with any other name or depth (e.g. `tutolingo/` at
> the site root) makes the CSS, JS, manifest and icons 404; the server then answers those requests with
> its HTML fallback, and the browser reports
> `Refused to apply style … MIME type ('text/html')` / `Refused to execute script …`.
> Run `npm run verify:dist` from the repo root after building — it resolves every asset reference and
> fails if any file is missing or the paths point outside `/tutorly-games/lingo/`.
2. The gaming hub launches it at `/tutorly-games/lingo/index.html?continue=1` (registered as a
   standalone app in `gaming-hub/src/data/activities.ts` → category **Words & Grammar**, `launchPath`),
   so a learner who clicks the tile resumes their next unfinished lesson. Every standalone game the hub
   links to is listed there with its host folder name; a tile carries a `launchPath` exactly when it is
   one of those builds.
3. If the site is served by the repo's Express server, the production route
   `/tutorly-games/tutolingo*all` → `dist/tutorly-games/lingo/index.html` is already in `server.ts`
   (and `/tutorly-games` is mounted as a static folder, so the nested app is served as-is).

## Notes

- Progress, XP, streaks, hearts and mistakes live in `localStorage` (no backend required).
- The leaderboard opponents are generated locally; their names come from the L1 selected in
  **Profile → Learner's first language** (or the L1 of the loaded pack when set to *Auto*).
