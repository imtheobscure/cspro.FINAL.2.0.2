"use client";
/**
 * The public sub-path this build is served from, and the two kinds of URL Next
 * cannot rewrite for us.
 *
 * Next prefixes `<Link href="/play">` itself, but it knows nothing about a string
 * built by hand or about a plain `<img src="/images/…">` — and Party has both:
 *
 *   · the join link (and the QR code drawn from it) is read out to the class and
 *     opened on another screen, so it must be a full absolute URL that includes
 *     the app's folder on the host;
 *   · the six scene pictures in `public/images/` are referenced from plain `<img>`
 *     tags, which are served from the base path but not rewritten by it.
 *
 * `next.config.ts` bakes `NEXT_PUBLIC_BASE_PATH` into the build, so these are the
 * same value Next uses; if the folder is ever renamed, that one line changes and
 * everything hand-written follows.
 */
export const BASE_PATH: string = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

/** A file in `public/`, as it is served on the host. */
export function asset(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

/** A page inside the app, as an absolute URL a learner's browser can open. */
export function publicUrl(path = "/", query?: Record<string, string | number>): string {
  const suffix = query
    ? "?" +
      Object.entries(query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const clean = path.startsWith("/") ? path : `/${path}`;
  // `location` does not exist while Next prerenders the page, so the empty string
  // is the right fallback there — the value is only read in an effect or an event
  // handler, by which time it does.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${BASE_PATH}${clean}${suffix}`;
}

/** The join URL a phone opens: the phone view, with the room code already in it. */
export function joinUrl(code: string): string {
  return publicUrl("/play/", { code });
}
