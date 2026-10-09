import type { NextConfig } from "next";

/**
 * QuizRush is a **static export**, served from the Game Hub's games folder.
 *
 * It arrived as `tutorly-quizziz-platform-architecture`: Next.js + PostgreSQL with
 * seven `/api/…` route handlers, a drizzle schema and a live game that only existed
 * in the database. That shape cannot live in the hub — a server app needs its own
 * Node process and a database, so its tile could only ever be a signpost.
 *
 * Everything the game needs from a server turned out to be optional: the quiz
 * bank, the live game, the players, the shop and the score log all fit in the
 * browser, so a game is a `BroadcastChannel` plus the same 1.5-second poll the
 * pages always used (`src/lib/localApi.ts`). That is what Party, Cash Arena,
 * Interview and Console did before it — `output: "export"` writes plain files to
 * `out/`, which `npm run build` moves to `dist/` for
 * `scripts/collect-standalone-apps.mjs` to publish.
 *
 * A static export also forbids dynamic route segments (`/host/[code]`), which is
 * why the two live pages are `/host/room?code=…` and `/play?code=…&pid=…` — the
 * same shape Cash Arena uses, and the reason `src/lib/basePath.ts` exists: the
 * join link and the QR code are built by hand, and Next does not rewrite those.
 *
 * `BASE_PATH` is compiled into every asset URL, so the folder on the host must be
 * named `tutorly-games/adult/quizrush`.
 */
export const BASE_PATH = "/tutorly-games/adult/quizrush";

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
