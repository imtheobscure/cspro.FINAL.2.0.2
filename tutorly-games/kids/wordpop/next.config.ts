import type { NextConfig } from "next";

/**
 * WordPop is deployed as static files inside the host's KIDS games folder:
 * https://<host>/tutorly-games/kids/wordpop/
 *
 * That is why the app is EXPORTED (no Node server, no database): the Game Hub
 * opens it with `launchKids("wordpop")`, exactly like every other game in
 * `tutorly-games/`, and the Tutorly splash can read the Adult Dashboard's
 * `app-storage` settings because it is served from the same origin.
 *
 * The sub-path is compiled into EVERY asset URL, so hosting the build under a
 * different folder name makes all of them 404 (the server then answers with its
 * HTML fallback, which the browser reports as "Refused to apply style/execute…").
 * If the app ever moves, change it here and nowhere else.
 *
 * `npm run build` exports into `out/` and then moves it to `dist/`, which is the
 * folder `scripts/collect-standalone-apps.mjs` publishes to the host.
 */
export const BASE_PATH = "/tutorly-games/kids/wordpop";

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
