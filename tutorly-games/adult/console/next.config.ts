import type { NextConfig } from "next";

/**
 * Console is a **static export**.
 *
 * It used to be a Next.js server app with a PostgreSQL database, which is why it
 * was the one game in the hub that could not live in a folder on the web host —
 * clicking its tile landed on a signpost explaining that. Everything except one
 * feature now runs in the browser: the workspace and leaderboard
 * (`src/lib/localApi.ts`), the loaded Unity builds (`src/lib/localUnity.ts`, which
 * serves them from the Cache API through a service worker). `output: "export"`
 * writes plain files to `out/`, which `npm run build` moves to `dist/` for
 * `scripts/collect-standalone-apps.mjs` to publish, exactly like the kids' games.
 *
 * The one thing a static host cannot do is proxy YouTube's Playables builds (their
 * CSP forbids framing, and a browser cannot rewrite another origin's HTML). That
 * job moved into `public/play.php`, which their cPanel host can run; the app asks
 * it whether it is working and falls back to opening a Playable on YouTube when it
 * is not — see `src/lib/proxy.ts`.
 *
 * `BASE_PATH` is the public sub-path and it is compiled into every asset URL, so
 * the folder on the host must be named `tutorly-games/adult/console`. It is also
 * injected as `NEXT_PUBLIC_BASE_PATH` because a hand-written `fetch("/api/…")` or
 * `<iframe src="/api/play/…">` is NOT rewritten by `basePath` — those go through
 * `lib/basePath.ts` instead.
 */
export const BASE_PATH = "/tutorly-games/adult/console";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
