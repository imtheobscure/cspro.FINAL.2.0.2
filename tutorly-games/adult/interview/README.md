# Interview — the interview rehearsal studio

A **static** Next.js app. Every interviewer, lesson, question, prompt and answer
lives in the browser; there is no server, no database and nothing to install.

```
npm install
npm run build          # → dist/, public at /tutorly-games/adult/interview/
npm run dev            # development
npm run typecheck
npm run portraits      # (re)download the 24 photographic portraits + hero art
npm run portraits -- --from "path/to/my photos"   # import your own pictures
npm run avatars        # redraw the 24 SVG fallback portraits
```

## What changed, and why

This app used to be a Next.js **+ PostgreSQL** server application: a workspace
cookie identified a learner, and profiles, sessions, imported packs and every
submitted answer were rows in a `pg` database behind six API routes. That is why
it was the one game in the set that could not be dropped into a web host's folder
like the others — it needed a Node process and a database next to it.

The workspace now lives in the browser, in `src/lib/local-store.ts`, which
implements the same operations (same request paths, same response shapes, the same
guard messages the UI already showed) against `localStorage`. The screens above it
were not touched: `workspace-provider.tsx` calls `localApi()` where it used to
call `fetch()`.

Removed with it: `src/app/api/**`, `src/db/**`, `src/lib/server.ts`,
`drizzle.config.json`, and the `pg` / `drizzle-orm` / `drizzle-kit` dependencies.
`next.config.ts` now sets `output: "export"`, so `npm run build` writes plain files
that `scripts/make-dist.mjs` moves to `dist/` for the repo's collect step.

### The trade-off, stated plainly

* **Progress is per browser, per device.** It does not follow the learner to
  another computer or another browser, and clearing site data erases it. The
  Settings → My data screen exports the whole workspace as JSON, and the app's own
  copy says all of this rather than implying an account exists.
* **No cloud voices.** `/api/voice` (Azure Speech) is gone, so speech is the
  device's own voices — Microsoft natural voices when the browser exposes them,
  with the honest availability note the app already carried.
* For interview answers, local-only is arguably the better default: nothing leaves
  the learner's machine.

## The 24 portraits

`public/images/characters/01.jpg` … `24.jpg` are the **tutor's own portrait set**,
one professional studio headshot per interviewer at 640 × 640, copied in
byte-for-byte (their original folder is kept at `tutorly-games/adult/images/`).
`01.jpg` is Emily Parker, `02.jpg` is James Wilson, and so on in session order —
the same names the original app asked for, which is why nothing had to be
renamed. `public/images/tutorly-hero.jpg` is the dashboard panel, built as a
collage of portraits 01, 09 and 07 so it matches the set.

The app was always built around photographs — `art.ts` asks for
`images/characters/<id>.<ext>`, zero-padded — but the files were never shipped in
the copy of this app, so every avatar fell back to a generated illustration. That
is what this fixed.

Your own pictures win automatically, and they do not need renaming. Point the
importer at a folder or a `.zip` of photographs —
`npm run portraits -- --from "path/to/my photos"` — and it matches files to
characters by name (or in natural order), crops them to the 512 px square,
rebuilds the hero and prints the mapping. Dropping `1.jpg` … `24.jpg` straight
into `public/images/characters/` (a `.png`, `.webp` or `.avif` works too) and
running `npm run build` does the same thing more manually.

Either way `scripts/manifest-images.mjs` records what is on disk, `lib/art.ts`
prefers the photograph, and `components/image-guard.tsx` walks the extension
chain so a missing file falls back to the generated `.svg` illustration
(`scripts/make-avatars.mjs`) instead of showing a broken-image icon.
`public/images/tutorly-hero.jpg` is the dashboard hero and follows the same rule.

## Validation

`npm run typecheck` and `npm run build` are the checks that matter now. The old
`scripts/verify.mjs` Playwright suite exercised the **removed** server API
(workspaces, database isolation, session persistence over HTTP) and no longer
applies as written; its accessibility sweep is still worth re-adding as a
static-page check if this app keeps changing.

The behaviour that replaced it was verified by hand in a real browser against the
built `dist/`: the workspace initialises with no error bar, a session is created,
an answer is submitted and written to `localStorage`, and a reload brings the
session and its answer back with no server anywhere in the picture.

## Design and technical references

- Big Interview's structured preparation/practice/feedback approach: https://www.biginterview.com/
- Dialogue-state and audio-design guidance, used as architectural reference rather than copied implementation: https://github.com/gamedev-skills/awesome-gamedev-agent-skills (Apache-2.0)
- Microsoft Edge online voice policy: https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/configureonlinetexttospeech

Visual assets are original generated artwork. DM Sans is distributed under the SIL
Open Font License; see `public/fonts/OFL.txt`. Interface icons are from Lucide
(ISC license).
