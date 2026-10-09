"use client";
/**
 * The public sub-path this build is served from.
 *
 * Next rewrites `<Link href="/host">` itself, but it cannot rewrite a URL a string
 * was built from by hand — and the arena has three of those: the join link shown
 * on the projector, the QR code that encodes it, and the "join at" line read out
 * loud. Those were built as `window.location.origin + "/play?code=…"`, which is
 * correct on `localhost:3000` and 404s on the host, where the app lives at
 * `/tutorly-games/adult/casharena/`.
 *
 * `next.config.ts` bakes `NEXT_PUBLIC_BASE_PATH` in, so this is the same value
 * Next uses; if the folder is ever renamed, that one line changes and everything
 * hand-written follows.
 */
export const BASE_PATH: string = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

/** A path inside the app, as an absolute URL a learner's phone can open. */
export function publicUrl(path = "/", query?: Record<string, string | number>): string {
  const suffix = query
    ? "?" +
      Object.entries(query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const clean = path.startsWith("/") ? path : `/${path}`;
  // `location` is not available while Next prerenders the page, so the empty
  // string is the right fallback there — the value is only ever read in an
  // effect or an event handler, by which time it exists.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${BASE_PATH}${clean}${suffix}`;
}
