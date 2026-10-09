# 🏃 Tuto Runner

Side-scrolling horde survival shooter for English learning: answer vocabulary questions to unlock
weapons, shields and allies while you run the bridge. Voice answers, CEFR calibration and an
AI curriculum prompt are built in.

The app is a Vite + React + Three.js build that compiles to a **single HTML file**
(`vite-plugin-singlefile`), so deploying it is one file copy.

## Build & deploy

```bash
npm install        # this folder's own toolchain
npm run build      # emits dist/index.html (+ public images)
```

Deployment (host: `https://cspro.tutomy.com/tutorly-games/adult/runner/index.html`):

1. Copy the **contents** of `./dist` (`index.html`, `images/`, `ASSET_CREDITS.md`) into the host
   folder `tutorly-games/adult/runner/`.
2. `vite.config.ts` sets `base: "/tutorly-games/adult/runner/"` for the inlined CSS, but the game itself is
   relocatable: public images are referenced relatively and script-loaded assets (the sky texture) go
   through `src/utils/assetUrl.ts`, which resolves against the deployed `index.html`. The same build
   therefore works at the site root, under `/tutorly-games/adult/runner/`, or on a local preview server.
3. The gaming hub launches it at `/tutorly-games/adult/runner/index.html` (registered in
   `gaming-hub/src/data/activities.ts` → category **Action & Survival**, `launchPath`).
4. With the repo's Express server, the production route `/tutorly-games/adult/runner*all` → `dist/tutorly-games/adult/runner/index.html`
   is already in `server.ts`, and `/tutorly-games` is served as a static folder.

## Branding

The game is branded **Tuto Runner** (title, header mark, mission report, exported lesson files and
AI prompt). Its local storage keys are namespaced `tuto-runner-*` so classroom preferences and
records never collide with other games.

> Note: `node_modules` here may be partial (only what a one-off build needed) — run `npm install` for
> the full toolchain listed in `package.json`.
