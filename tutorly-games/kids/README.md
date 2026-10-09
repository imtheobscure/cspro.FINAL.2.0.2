# tutorly-games / kids

The **Kids' Corner** games live here, one sub-folder per game:

```
tutorly-games/kids/<folder>/index.html
```

The hub links to them as `/tutorly-games/kids/<folder>/index.html` — i.e.
`launchKids("<folder>")` in `gaming-hub/src/data/activities.ts`.

## The games

| Folder | Game | What it is |
| --- | --- | --- |
| `wordpop` | **WordPop** | First-words arcade: topic areas of illustrated cards, six activities each (Learn, Chant, Quiz, Match, Memory, Touch it!), a timed lesson plan per topic, read aloud in six languages. |
| `learnloop` | **LearnLoop** | Tutor-led lesson loop: pick a theme + unit, then loop it through eleven modes with CCQs, chants and talk time, plus a timed lesson plan per unit. |
| `bilibuddies` | **BiliBuddies** | Bilingual picture dictionary and pronunciation studio with several learners, per-word stars and a timed lesson plan per word set. |
| `playschool` | **PlaySchool** | Nursery curriculum: letters, phonics, numbers to twenty and first words, with ten games and a complete timed lesson plan for every unit. |
| `toybox` | **ToyBox** | A toy box of nine hands-on studios for ages 3–6 — letter sandbox, echo monsters, sound smoothies, camera scavenger hunt, feelings mirror, charades, talking train, dollhouse, dressing room — over fourteen themes and 600+ illustrated words, with a lesson library and read-aloud in six languages. |
| `heroarcade` | **HeroArcade** | An arcade of bilingual speaking games for ages 6–12: 58 themes, each with its own words, CCQs, chant, quiz, matching game, hero story and eight speaking games, read aloud in seven languages. |
| `talkquest` | **TalkQuest** | Speaking missions for ages 5–12: 56 topics × 20 illustrated words, each topic becoming a full lesson — word cards, a sentence per word, a chant, concept-check questions, a quiz, a matching game, a short story with comprehension questions and a talk-time challenge — plus a timed tutor plan, ten speaking games and read-aloud in seven languages. |

Six of the seven are **Next.js static exports** (`output: "export"`, no server, no database), so
their state lives in `localStorage` and their `npm run build` exports to `out/` and then
moves that to `dist/`. **HeroArcade is the exception**: a Vite SPA whose `vite-plugin-singlefile`
build inlines every asset into one `dist/index.html`, so it has no base path to bake in and
`npx vite build` is all it needs. Either way they are published by
`scripts/collect-standalone-apps.mjs`, and `scripts/check-static-deploy.mjs` verifies that
every asset URL carries the right sub-path. Nothing here is served from the Node app.

## Naming convention — follow it for every game added later

1. **The folder is the URL**, so it is the one thing that is hard to change:
   a single lower-case word, no hyphens, ideally ≤ 7 characters (`wordpop`).
2. **The in-app name is that word in CamelCase**: `WordPop`, `LearnLoop`, `PlaySchool`.
3. **Name the game after what the child DOES** (pop words, loop a lesson, play school),
   never after what it teaches. A four-year-old cannot read "Bilingual Vocabulary
   Trainer", but they can ask for the balloon game. The teaching belongs in the
   tagline on the splash screen, not in the name.
4. **Say it out loud.** It must be unambiguous over a video call and must not collide
   with a sibling game — one word, one idea, and no two games sharing a word.
5. **Names already taken (do not reuse):** WordPop, LearnLoop, BiliBuddies, PlaySchool,
   ToyBox, HeroArcade, TalkQuest — and no two games may share any word of their name, not just their
   whole name: the first pick for the playroom game was `PlayBox`, renamed to `ToyBox`
   because `Play…` already belonged to PlaySchool and the two are both for ages 3–6.
   (`talkquest` is the speaking game whose every topic ends in the child talking; it was
   `interactive-bilingual-learning-game4`, and its old dist/ copies are deleted and redirected
   like the others.)
   Fresh slots in the same family: `rhymetime`, `storybox`, `animalhomes`, `shapehunt`.
6. Keep the tile's emoji and blurb about **the play**, and make its `mk(...)` entry call
   `launchKids("<folder>")` so a broken folder surfaces immediately.

### Renaming an existing game

Renaming changes the URL, so:

1. Rename the folder in `tutorly-games/kids/` **and** the `BASE_PATH` in its
   `next.config.ts` (and nowhere else — every asset URL is compiled from it).
2. Update `KIDS_GAMES` in `scripts/collect-standalone-apps.mjs` and the list in
   `scripts/check-static-deploy.mjs`.
3. Add the old folder to `KIDS_GAMES_LEGACY` in `scripts/collect-standalone-apps.mjs`.
   That deletes the stale build from `dist/` (a leftover copy would keep serving the
   old page from the old URL, with the old base path baked in) and writes a redirect
   stub at the old path so bookmarked links still land somewhere useful.
4. Update the game's own branding: `layout.tsx` metadata (title + `applicationName`), the
   `Splash` copy in `app/page.tsx`, and any header/tutor-panel wordmark. A non-Next game
   carries the same strings in `index.html` (`<title>`, description) and in its logo/footer.
5. Update the strings that carry the name inside the app's *content*: the two AI prompts
   (“…the Tutorly <Game> app”), the `dist/` log line in the build script, and `package.json`
   (`name` + description). Skip one and the rename is only visible on the splash screen.
6. Rekey the game's `localStorage` keys to the new folder name, and read the old key once as
   a fallback (`heroarcade.v1` still reads `tutorly.v1`) so a rename never looks like data
   loss. Storage is the one thing a folder rename cannot migrate on its own.
7. Update the hub tile blurb in `gaming-hub/src/data/activities.ts`: its name, folder and any
   hard-coded count (prefer “50+ themes” to a number that goes stale), then
   `node scripts/build-gaming-hub.mjs`.

## Adding a new kids' game

1. Build the game so `tutorly-games/kids/<folder>/dist/index.html` exists, and add it to
   the two script lists above.
2. Add an entry to `KIDS_CATEGORY.activities` in `gaming-hub/src/data/activities.ts`:

   ```ts
   mk("animalhomes", "AnimalHomes", "🐣",
      "Where does each animal live? Match the animal to its home.",
      "Matching game",
      { timerSec: 0, hints: true, difficulty: "easy", multiplayer: false },
      fb("Tap the home this animal lives in!", "😺"),
      launchKids("animalhomes"))
   ```

   As soon as `activities` is not empty, the kids' grid replaces the coming-soon cards
   automatically — no other change is needed.
3. **Namespace every storage key with the game's folder name.** All the games share one
   origin, so `localStorage` is shared between them: `wordpop.learners.v1`,
   `playschool.tutor.v1`, `learnloop.store.v2`. A generic key (`settings`, `students`)
   lets one game silently overwrite another's learners. Only `app-storage` (the Adult
   Dashboard's splash text, subtext and logo) is deliberately shared — read it, don't
   write it.
4. **Use the free Microsoft natural voices for read-aloud.** No API key, no server:
   the Microsoft "Online (Natural)" voices Edge exposes to `speechSynthesis` are the
   same Azure neural voices its own Read aloud uses, child voices included. Ship a
   🎤 voice-test screen that reports honestly which voices the device actually has.
5. **Give the tutor a copy-AI-prompt → paste-JSON path** for new content, so a topic the
   library does not cover never needs a code change. Parse defensively, repair what is
   safe to repair, and report what could not be repaired.
6. **"Copy AI prompt" adds two different things, and both are worth having.**
   *Content* (themes, topics, word sets) fills the library. A *lesson plan* is the
   other half: a timed, tutor-ready plan for something already in the library —
   objectives, materials, stages, the words the tutor says out loud, the
   concept-check questions and what to expect back, each step pointing at the game's
   own activities. All four kids' games have both, on one screen with two tabs
   (📋 AI Prompt & JSON) and one reader screen (📚 Lesson plan).

   Two rules make a pasted plan behave like content the game ships:

   - **Store only the override, never a frozen lesson.** The plan keeps referring to
     the unit/topic it belongs to, so switching the taught language re-renders
     every title and re-reads every word, and editing the vocabulary later cannot
     leave the plan stale. Persist it under `<game>.customLessons.v1` and
     `registerLesson(...)` on boot (`reinstallSavedLessons()`), or a reload
     silently falls back to the generated plan.
   - **Every unit ships with a plan the game writes itself** from its own material —
     its words, its CCQs, its chant — so 📚 is never empty and pasting one is an
     upgrade, not the only way in. Removing a pasted plan brings the generated one
     back.

   The prompt must carry the real word list and the exact ids, and the parser must
   **drop word ids the unit does not have** (a hallucinated id would highlight
   nothing) while reporting them. Accept both a full dictionary id and a shortened
   one: an AI happily answers `"nose"` for `self-body:nose`.
7. **Read-aloud on the lesson screen is the point.** Every script, question, target
   word and review item is a button that speaks the line in the language being taught,
   so the tutor watches the child, not the screen.
8. Keep kid games kid-safe: no jumpscares, no timers that punish, no blood, and prefer
   the hub's built-in gentle AI feedback strings.

## Three traps these static exports share

All three bit TalkQuest at once, and none of them is visible in `npm run build` — the build
is happy, the page works the first time, and the bug only shows on a real reload.

1. **Never read `localStorage` while rendering.** The export is pre-rendered on a build
   machine where storage does not exist, so a value read in a `useState` initialiser
   (`localStorage.getItem(KEY) !== 'done'`, a saved text size, a mute flag) makes the
   client's first paint differ from the HTML React is hydrating. React 19 answers with
   minified error #418 — "Hydration failed because the server rendered HTML didn't match
   the client" — and throws the whole tree away. Start from the default and read storage
   in a `useEffect` instead; the flash is invisible, the mismatch is not.
2. **Do not nest `<AnimatePresence mode="wait">`.** The page already wraps its screens in
   one, so a second `wait` inside it (the lesson player's step body, a game's speech
   bubble) holds the incoming child until the outgoing exit finishes — and while the
   parent is animating that never happens, leaving the step area blank. Re-key a plain
   `<div>` instead: it remounts, so the fade-in still plays and nothing can get stuck.
3. **U+FE0F belongs in a joined emoji's filename.** Twemoji through jsDelivr wants
   `1f469-200d-2695-fe0f.svg` for 👩‍⚕️, so stripping the marker 404s and the icon falls
   back to a flat system glyph (doctor, pilot, pirate, mage, mermaid). Keycaps are the
   opposite (`31-20e3.svg`), so keep the marker only inside a ZWJ sequence — and keep
   the plain-emoji fallback for anything that still misses.

## Preview and verify one game

The root dev server serves each game's **build**, not its source — `server.ts` maps
`/tutorly-games/kids/<folder>/<path>` → `tutorly-games/kids/<folder>/dist/<path>`. So:

```bash
npm run dev                      # repo root, http://127.0.0.1:3000
# then open http://127.0.0.1:3000/tutorly-games/kids/wordpop/index.html
cd tutorly-games/kids/wordpop && npm run build   # an edit needs this before it shows
```

Each game typechecks and builds on its own:

```bash
cd tutorly-games/kids/<folder>
npx tsc --noEmit -p tsconfig.json
npm run build                    # next build → out/ → dist/
```

After changing any game, republish and re-check from the root:

```bash
node scripts/collect-standalone-apps.mjs    # copies every dist/ into dist/tutorly-games/kids/…
node scripts/check-static-deploy.mjs        # every asset URL must carry the right sub-path
node scripts/build-gaming-hub.mjs           # only if a tile changed
```

**Verifying the pasted-JSON importer.** A live browser can be driven by hand, but the
preview harness cannot type into a React-controlled field (React 19's value tracker
reads the DOM, so a programmatic value change is not a change), which leaves the
install button disabled. Verify the importer where it actually lives instead — a
throwaway script in the game folder that stubs `window.localStorage` and exercises the
real module:

```ts
// tutorly-games/kids/<folder>/.tmp-check.ts
const mem = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) },
};
import { buildPackPrompt, parsePackJson, installPack, listPacks, removePack } from "@/lib/customPack";
```

```bash
cd tutorly-games/kids/<folder> && npx tsx --tsconfig tsconfig.json .tmp-check.ts
```

Assert the library counts move (`themes/units/words` before → after), that
`t(theme.name, "zh")` resolves to real Chinese rather than the raw `theme.x.…` key, that
a word's translations are right, and that removing the pack puts the counts back. Pass
the **exact signature** each game uses — `installPack(themes, pack)` in
`bilibuddies`/`playschool` (both return `{ pack, themes }`), `installPack(pack)` in
`wordpop`. Delete the script when done.

A React-controlled textarea *can* still be driven from the preview, which is how the
lesson importer was verified end to end (paste → install → 📚 reader → reload): set the
value through the prototype's own setter so React's tracker never sees a stale value,
then dispatch a bubbling `input` event.

```js
const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
setter.call(el, json);
el.dispatchEvent(new Event("input", { bubbles: true }));   // then click Install
```

The same trick works for a `<select>` (`HTMLSelectElement.prototype` + a `change`
event), which is the cheap way to check that a pasted plan is reachable from its own
deep link (`#/lesson/<id>`, `#/lesson?set=<id>`) as well as from the list.

For the lesson engine, assert these five things specifically: a plain-string stage title
(`"title": "Hello circle"`) comes through as that text in every language rather than
`"Stage 3"`; a translated title row survives; a word id the unit does not have is
reported *and* dropped; installing makes the plan live; and unregistering + re-attaching
from `localStorage` brings it back (that is the reload path).
