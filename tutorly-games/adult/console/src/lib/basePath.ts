/**
 * The public sub-path Console is served from, compiled in at build time.
 *
 * Next rewrites the URLs it generates (its own `/_next/…` assets, `next/link`,
 * `next/image`), but NOT a hand-written `fetch("/api/scores")` or an
 * `<iframe src="/api/play/…">` — those go to the site ROOT, which is a different
 * app entirely. Since Console is now a static export living in
 * `dist/tutorly-games/adult/console/`, every hand-written URL has to be built
 * through `appUrl()` or it 404s on the host.
 *
 * The value comes from `next.config.ts` (`env.NEXT_PUBLIC_BASE_PATH`), so
 * changing the folder means changing one constant there.
 */
export const BASE_PATH: string = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

/** Turn an app-relative path (with or without a leading slash) into a real URL. */
export function appUrl(path: string): string {
  return `${BASE_PATH}/${String(path).replace(/^\/+/, "")}`;
}
