/*
 * One place where the network is talked to.
 *
 * Every data source in this app is a public, keyless, CORS-enabled endpoint — Wiktionary,
 * Wikiquote, Wikidata, Wikimedia Commons, Openverse and Datamuse. That is a deliberate
 * constraint rather than an accident: this is a single-file build a tutor opens by
 * double-clicking, and a secret embedded in it would not be a secret.
 *
 * Three things live here, all of which each caller would otherwise get subtly wrong:
 *
 *  1. **A timeout.** `fetch` has none. A lesson is a live, projected event, and a request that
 *     hangs leaves the card showing a spinner in front of a room. Everything fails in 6s and
 *     the caller falls back to what the deck already carries.
 *  2. **A cache.** The same word is looked up by the image band, the dictionary, the quotes
 *     panel and the audio button, and a learner moving back and forth across twelve sections
 *     would otherwise re-request the same resource a dozen times. Cached in memory for the
 *     session and, for the cheap ones, in `localStorage` so a re-opened lesson is instant.
 *  3. **A parse that cannot throw.** These are third-party services returning third-party
 *     JSON. One renamed field must not take the app down mid-lesson, so a failed parse
 *     resolves to `null` and the caller degrades.
 */

const TIMEOUT_MS = 6000;
const CACHE_PREFIX = "flexcards_cache_v1:";

/** In-flight and resolved requests, so a burst of the same lookup is one request. */
const memory = new Map<string, Promise<unknown>>();

const canPersist = (() => {
  try {
    const probe = "__flexcards_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
})();

function readPersisted<T>(key: string): T | null {
  if (!canPersist) return null;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function persist(key: string, value: unknown): void {
  if (!canPersist) return;
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* Quota or blocked storage: the memory cache still covers this session. */
  }
}

/**
 * Fetch JSON, with a timeout and a cache.
 *
 * `cacheKey` defaults to the URL. Pass `null` to skip the cache entirely — used for the
 * one call whose result is genuinely time-sensitive rather than derived from a title.
 */
export async function getJson<T>(url: string, cacheKey: string | null = url): Promise<T | null> {
  if (cacheKey) {
    const cached = readPersisted<T>(cacheKey);
    if (cached !== null) return cached;
    const pending = memory.get(cacheKey);
    if (pending) return (await pending) as T | null;
  }

  const request = (async (): Promise<T | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) return null;
      const parsed = (await response.json()) as T;
      if (cacheKey) persist(cacheKey, parsed);
      return parsed;
    } catch {
      /*
       * Offline, blocked, timed out, or malformed. All four are the same thing to the caller:
       * no enrichment for this word, so show what the deck already has.
       */
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();

  if (cacheKey) memory.set(cacheKey, request);
  return request;
}

/** Strip the HTML that MediaWiki's REST API leaves inside definition strings. */
export function stripHtml(input: string | undefined): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Is this string safe to put in an `href` or an `img src`?
 *
 * Deck JSON is pasted in from whatever an AI produced, so a value that came out of a model is
 * untrusted input. Allowing only absolute `http(s)` URLs means a `javascript:` or `data:`
 * value in a generated deck can never become an executable link.
 */
export function isSafeHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Build a query string, encoding every value. */
export function qs(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}
