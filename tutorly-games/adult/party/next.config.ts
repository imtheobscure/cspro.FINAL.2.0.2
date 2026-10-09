import type { NextConfig } from "next";

/**
 * Party is a **static export**, served from the Game Hub's games folder.
 *
 * It arrived as a Next.js + PostgreSQL server app (`src/app/api/…` route handlers,
 * a drizzle schema, a room table the phones polled). That shape cannot live in the
 * hub: a server app needs its own Node process and a database, so its tile could
 * only ever be a signpost. Everything the game actually needs from a server turned
 * out to be optional — the board keeps its session in `localStorage`, the lesson
 * library and the score sheet fit in the browser, and a phone room is a
 * same-browser channel (`src/lib/localApi.ts`) — so the app is exported instead,
 * exactly like Cash Arena, Interview and Console before it. `output: "export"`
 * writes plain files to `out/`, which `npm run build` moves to `dist/` for
 * `scripts/collect-standalone-apps.mjs` to publish.
 *
 * `BASE_PATH` is the public sub-path and it is compiled into every asset URL, so
 * the folder on the host must be named `tutorly-games/adult/party`. It is also
 * injected as `NEXT_PUBLIC_BASE_PATH` because a hand-written join link, the QR
 * code and the game screens' artwork are NOT rewritten by `basePath` — those go
 * through `src/lib/basePath.ts` instead.
 */
export const BASE_PATH = "/tutorly-games/adult/party";

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
