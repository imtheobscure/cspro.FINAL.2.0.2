/**
 * The public sub-path TalkQuest is served from.
 *
 * `next.config.ts` sets `basePath`/`assetPrefix`, and Next prefixes route links,
 * CSS/JS assets and `next/image` for us. It does NOT prefix a plain
 * `<img src="/…">` or an `<a href="/…">` straight to a public file — those are
 * the places this helper is used. Keep it in sync with `BASE_PATH` in
 * `next.config.ts` (it is injected through `env.NEXT_PUBLIC_BASE_PATH`, so there
 * is only one source of truth).
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Turn an app-absolute path into a public URL under the deployed sub-path. */
export function withBase(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}

/** A public file inside `public/`, e.g. `/images/whisper-wall.svg`. */
export function publicFile(name: string): string {
  return withBase(`/${name.replace(/^\/+/, "")}`);
}
