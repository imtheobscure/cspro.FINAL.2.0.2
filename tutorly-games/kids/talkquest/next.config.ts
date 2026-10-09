import type { NextConfig } from "next";

/**
 * TalkQuest is deployed as static files inside the host's KIDS games folder:
 * https://<host>/tutorly-games/kids/talkquest/
 *
 * That is why the app is EXPORTED (no Node server, no database): the Game Hub
 * opens it with `launchKids("talkquest")`, exactly like every other game in
 * `tutorly-games/`, and it can read the Adult Dashboard's `app-storage` splash
 * settings because it is served from the same origin.
 *
 * The sub-path is compiled into EVERY asset URL, so hosting the build under a
 * different folder name makes all of them 404 (the server then answers with its
 * HTML fallback, which the browser reports as "Refused to apply style/execute…").
 * If the app ever moves, change it here and nowhere else.
 *
 * `npm run build` exports into `out/` and then moves it to `dist/`, which is the
 * folder `scripts/collect-standalone-apps.mjs` publishes to the host.
 *
 * The original server build kept custom lesson packs and tutor notes in
 * PostgreSQL through `/api/*`. Static hosting has no server, so those go to this
 * browser's storage instead — see `src/lib/customPack.ts`, which is the only
 * place that reads or writes them.
 */
export const BASE_PATH = "/tutorly-games/kids/talkquest";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  /** No Next.js dev-tools badge on a finished product page. */
  devIndicators: false,
};

export default nextConfig;
