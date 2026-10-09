import type { NextConfig } from "next";

/**
 * Lingo is deployed as static files inside the host's ADULT games folder:
 * https://cspro.tutomy.com/tutorly-games/adult/lingo/
 * so the app is exported (no server) with that sub-path baked in.
 *
 * This path is compiled into EVERY asset URL, the manifest, the icons and the
 * service worker scope. Hosting the build under a different folder name makes all
 * of them 404 (the server then answers with its HTML fallback, which the browser
 * reports as "Refused to apply style/execute …"). If the app ever moves again,
 * change it here and nowhere else; `npm run verify:dist` from the repo root
 * compares the referenced paths with this value. The Game Hub links here with
 * `launch("lingo", "?continue=1")`, and the production route in `server.ts`
 * (`/tutorly-games/adult/lingo*all`) serves the same folder.
 *
 * The folder was `tutolingo` until the adult games were renamed to one-word
 * names; the old URL still resolves through a redirect stub written by
 * `scripts/collect-standalone-apps.mjs`.
 */
export const BASE_PATH = "/tutorly-games/adult/lingo";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  /**
   * No Next.js dev-tools widget in the corner.
   *
   * Tutolingo is a finished app that is previewed as a product, not as a Next.js
   * project: the floating “Open Next.js Dev Tools” badge sat on top of the lesson
   * screen and the bottom navigation. Errors still surface in the terminal and in
   * the browser console.
   */
  devIndicators: false,
};

export default nextConfig;
