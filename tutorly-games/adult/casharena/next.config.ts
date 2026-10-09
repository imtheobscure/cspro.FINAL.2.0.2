import type { NextConfig } from "next";

/**
 * Cash Arena is a **static export**, served from the Game Hub's games folder.
 *
 * It arrived as a Next.js + PostgreSQL server app (`src/app/api/…` route handlers
 * and a drizzle schema). That shape cannot live in the hub: a server app needs
 * its own Node process and a database, so its tile can only ever be a signpost.
 * Everything the arena actually needs from a server turned out to be optional —
 * a live game is peer-to-peer over WebRTC, and the quiz library and score history
 * fit in the browser (`src/lib/localApi.ts`) — so the app is exported instead,
 * exactly like Interview and Console before it. `output: "export"` writes plain
 * files to `out/`, which `npm run build` moves to `dist/` for
 * `scripts/collect-standalone-apps.mjs` to publish.
 *
 * `BASE_PATH` is the public sub-path and it is compiled into every asset URL, so
 * the folder on the host must be named `tutorly-games/adult/casharena`. It is
 * also injected as `NEXT_PUBLIC_BASE_PATH` because a hand-written join link, the
 * QR code and `<Link>`-less `location` URLs are NOT rewritten by `basePath` —
 * those go through `src/lib/basePath.ts` instead.
 */
export const BASE_PATH = "/tutorly-games/adult/casharena";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  images: { unoptimized: true },
  trailingSlash: true,
  /** No Next.js dev-tools badge over a game that is being projected to a class. */
  devIndicators: false,
};

export default nextConfig;
