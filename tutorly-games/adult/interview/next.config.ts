import type { NextConfig } from "next";

/**
 * Interview is a **static export**.
 *
 * It used to be a Next.js + PostgreSQL server app, which is why it was the one
 * game that could not live in a folder on the web host. The workspace now runs in
 * the browser (`src/lib/local-store.ts`), so there is no server code left to run:
 * `output: "export"` writes plain files to `out/`, which `npm run build` moves to
 * `dist/` for `scripts/collect-standalone-apps.mjs` to publish — exactly like the
 * kids' games and Lingo.
 *
 * `BASE_PATH` is the public sub-path and it is compiled into every asset URL, so
 * the folder on the host must be named `tutorly-games/adult/interview`. It is
 * also injected as `NEXT_PUBLIC_BASE_PATH` so plain `<img src="/…">` and
 * `<a href="/…">` to public files (which Next does NOT rewrite; `next/image` is
 * the only thing it prefixes automatically) resolve through `lib/basePath.ts`.
 */
export const BASE_PATH = "/tutorly-games/adult/interview";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
