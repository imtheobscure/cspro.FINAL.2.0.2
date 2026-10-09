/**
 * A photograph for a word, looked up rather than shipped.
 *
 * The swipe deck is modelled on a dating app, and the thing that makes that reading
 * instant is a real image where a profile photo would be. A drawn sigil is handsome but it
 * is unmistakably *not* a photograph, and no amount of polish closes that gap.
 *
 * Wikimedia Commons is the right source for this and it is worth being explicit about why,
 * because the obvious alternatives all fail for a build like this one:
 *
 *  - **No key.** Unsplash and Pexels need an account and a secret, and a secret shipped in
 *    a single-file HTML build is not a secret.
 *  - **CORS.** The API answers with `access-control-allow-origin: *` when asked with
 *    `origin=*`, so a browser can call it directly. Several otherwise-good picture APIs
 *    return real data and no CORS header, which means every browser fetch fails — a
 *    mistake that looks like a bug in this file and is not.
 *  - **Hot-linkable.** `upload.wikimedia.org` serves the images themselves, so the URL the
 *    API returns can go straight into an `<img src>`.
 *
 * What it is *not* good at is honesty about its limits: this is a filename search, so it
 * returns a real photograph of *something related*, not a caption for the word. "Harbour"
 * gets a beautiful photograph of Sydney Harbour. "Serendipity" gets a photograph of a
 * 1960s folk group called the Serendipity Singers. That is why the image the lesson
 * generator supplies is always preferred, and why this is only the fallback.
 *
 * Failures are cached as `null` alongside successes: a word that has no photograph should
 * be looked up once per session, not on every card flip.
 */

export type WordImage = {
  /** The `thumburl` the API returned — already sized for a card. */
  url: string;
  /** Attribution, because these are other people's photographs. */
  credit: string;
  source: "wikimedia";
};

const cache = new Map<string, WordImage | null>();

/** Cleared between decks, so two lessons do not share each other's lookups. */
export function clearWordImageCache(): void {
  cache.clear();
}

/**
 * An image mime type that is safe to render.
 *
 * Deliberately an allow-list, and deliberately without SVG. Commons hosts plenty of SVG,
 * and an SVG fetched from a third party and dropped into `<img>` is a document that can
 * carry script — for a photo slot on a flashcard there is no upside worth that risk.
 */
const SAFE_MIME = /^image\/(jpeg|png|webp)$/;

/** Commons returns artist fields as HTML fragments; the card needs plain text. */
function stripHtml(value: unknown): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
}

export async function findWordImage(word: string, signal?: AbortSignal): Promise<WordImage | null> {
  const key = word.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    // `origin=*` is what turns on the CORS response; without it the fetch fails silently.
    url.searchParams.set("origin", "*");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", `intitle:${key}`);
    // Namespace 6 is the File namespace — searching everything mostly returns articles
    // *about* the word, which have no image of their own to hand back.
    url.searchParams.set("gsrnamespace", "6");
    /*
     * Four candidates rather than one, because the top hit is frequently unusable: a PDF, a
     * coat of arms, a logo, or a portrait of someone who happens to share the word. Taking
     * the first *renderable* result is much better than taking the first result and giving
     * up.
     */
    url.searchParams.set("gsrlimit", "4");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|mime|extmetadata");
    url.searchParams.set("iiurlwidth", "900");

    const response = await fetch(url.toString(), { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data: any = await response.json();
    const pages: any[] = Object.values(data?.query?.pages ?? {});

    for (const page of pages) {
      const info = page?.imageinfo?.[0];
      const mime = typeof info?.mime === "string" ? info.mime : "";
      const src = info?.thumburl ?? info?.url;
      if (typeof src !== "string" || !SAFE_MIME.test(mime)) continue;

      const artist = stripHtml(info?.extmetadata?.Artist?.value);
      const licence = stripHtml(info?.extmetadata?.LicenseShortName?.value);
      const credit = [artist, licence, "Wikimedia Commons"].filter(Boolean).join(" · ");

      const result: WordImage = { url: src, credit, source: "wikimedia" };
      cache.set(key, result);
      return result;
    }

    cache.set(key, null);
    return null;
  } catch {
    /*
     * Offline, rate-limited, blocked, or aborted. Returning null rather than throwing is
     * the whole point of the fallback chain: the card has its generated art to fall back
     * on, and a lesson must never break because a photograph could not be found.
     */
    return null;
  }
}
