<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2a10f7d0-7922-445e-a910-1f4073e100b2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Building

```
npm run build          # main app + Gaming Hub + collects the standalone apps
npm run build:app      # main app only (vite build)
npm run build:hub      # Gaming Hub only → dist/gaming-hub/index.html
npm run verify:dist    # checks every sub-app in dist/ is self-consistent
```

`npm run build` produces ONE deployable `dist/` folder. Each sub-app is served by
`server.ts` from its own folder inside it:

| Route                      | Folder                            | Built by                              |
| -------------------------- | --------------------------------- | ------------------------------------- |
| `/`                             | `dist/`                            | `vite build`                          |
| `/gaming-hub*`                  | `dist/gaming-hub/`                 | `scripts/build-gaming-hub.mjs`        |
| `/tutorly-games/adult/<game>*`  | `dist/tutorly-games/adult/<game>/` | the game's own build, then `collect`  |
| `/tutorly-games/kids/<game>*`   | `dist/tutorly-games/kids/<game>/`  | the game's own build, then `collect`  |

Every game is built in its own folder (Vite games with `npm run build:games`; Lingo and
the kids' games with `cd tutorly-games/<audience>/<game> && npm run build`) and copied in
by `scripts/collect-standalone-apps.mjs`. The folder name **is** the public URL, and every
adult folder is a single lower-case word — `lingo`, `runner`, `hotseat`, `edupoly` — the
same convention the kids' games use (`tutorly-games/adult/README.md` has the rule and the
full list). If a game has not been built, `collect-standalone-apps.mjs` **fails the build**
rather than shipping a dist that 404s on that route — pass `--allow-missing` (or
`SKIP_MISSING_APPS=1`) to build just the main app.

Renamed games keep their old links alive: `ADULT_LEGACY` / `KIDS_GAMES_LEGACY` in that
script delete the stale `dist/` copy of the old name and write a redirect page in its place
(`tutolingo` → `lingo`, `3d-monopoly` → `edupoly`, `say-the-word` → `wordpop`).

### Copy AI prompts — answer-length rule

Every prompt the platform hands a teacher to paste into an AI carries the same
anti-giveaway rule: options must be within ±2 words of each other, the correct
option must never be the longest/most detailed one, distractor detail must match,
the correct position must rotate, and the model must self-check each item before
returning it.

`utils/promptRules.ts` holds the canonical wording (`ANSWER_LENGTH_ANTI_CUE_RULE`
and the short form). It is appended to:

| Prompt | File |
| ------ | ---- |
| Every Lesson Creator type (Micro Lesson V1/V2, Mock Test, Explainer, Conversational, Homework, …, 19 types in total) | `utils/manualPrompts.ts` |
| Classmate master prompt (`quiz_single` / `quiz_multi` / `true_false`) | `utils/html/promptTexts.ts` |
| Classroom quiz panel | `components/classroom/ClassroomScreen.tsx` |
| Kids flipbook (`multipleChoice` activities) | `pages/kids/utils/flipbookPrompt.ts` |
| Interactive video pack (SMP activities) | `utils/html/smp/smpActivities.ts` |
| Live Lesson manual | `utils/liveLessonHtmlScript.ts` |
| Lingo content-pack prompt | `tutorly-games/adult/lingo/src/content/ai-prompt.ts` |
| Runner question prompt | `tutorly-games/adult/runner/src/utils/aiPromptGenerator.ts` |

The standalone apps keep their own copy of the wording because they are separate
bundles with their own base paths.

### Deployment gotcha — base paths

Every sub-app is compiled with the public path it will be served from baked in
(Lingo and every kids' game: `/tutorly-games/<audience>/<game>/`, hub:
`/gaming-hub/`). Uploading one of these folders under a **different name** makes
every asset, manifest and icon 404, and the server's HTML fallback then answers for
them — which the browser reports as `Refused to apply style … MIME type
('text/html')` and `Refused to execute script …`.

Run `npm run verify:dist` before uploading. It resolves every asset reference in
each app's `index.html` and fails if anything is missing or lives outside the
app's own base path. Upload the **contents** of `dist/` into the site root, so the
folder layout on the host matches it exactly: `gaming-hub/`,
`tutorly-games/adult/…` and `tutorly-games/kids/…`.
