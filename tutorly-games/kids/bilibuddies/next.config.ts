import type { NextConfig } from "next";

/**
 * BiliBuddies is deployed as static files inside the host's KIDS games folder:
 * https://<host>/tutorly-games/kids/bilibuddies/
 *
 * That is why the app is EXPORTED (no Node server, no database): the Game Hub
 * opens it with `launchKids("bilibuddies")`, exactly like every other game in
 * `tutorly-games/`, and the Tutorly splash can read the Adult Dashboard's
 * `app-storage` settings because it is served from the same origin.
 *
 * The sub-path is compiled into EVERY asset URL, so hosting the build under a
 * different folder name makes all of them 404. If the app ever moves, change it
 * here and nowhere else.
 */
export const BASE_PATH = "/tutorly-games/kids/bilibuddies";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  devIndicators: false,
};

export default nextConfig;
