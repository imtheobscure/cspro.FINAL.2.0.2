/*
 * Where a card's photograph comes from.
 *
 * The app already had an image slot — `<img src={item.image}>` with an `onError` that hid
 * itself — but nothing ever filled it. The demo deck carried no URLs and nothing fetched any,
 * so the "Visual" section was a decorative rectangle that had never once shown a picture.
 *
 * Three sources, in descending order of trust:
 *
 *  1. **`item.image`** — a URL the lesson generator put in the deck JSON. This is the only
 *     source with any judgement behind it: a model that has just written a card about
 *     *serendipity* can choose a picture of the right sense, a keyword search cannot.
 *  2. **Openverse** (`api.openverse.org`) — CC-licensed images from Flickr, museums and
 *     galleries. Keyless, `access-control-allow-origin: *`, and a *semantic* catalogue rather
 *     than a filename index, which matters enormously at the abstract end of the vocabulary
 *     range. This is the source I added to fix the weakness in the Commons search below.
 *  3. **Wikimedia Commons** — a filename search. Reliable and permanent, but literally a
 *     filename index, so it fails in a specific and instructive way: it answers *"is there a
 *     file whose name contains this word?"*, not *"what does this word mean?"*. It once
 *     returned a geomorphology coastline photograph for "serendipity", because that is what
 *     happens to be filed under a similar name.
 *
 * Every result is normalised to one shape, and a failure at every step is a legitimate
 * outcome: the card falls back to its own drawn artwork rather than showing a broken box, and
 * no request is made at all for a word the deck marked as abstract.
 */

import { getJson, isSafeHttpUrl, qs, stripHtml } from "./http";

export interface WordImage {
  /** A hot-linkable image URL, or empty when nothing suitable was found. */
  url: string;
  /** Attribution, because these are other people's photographs. */
  credit: string;
  /** Alt text. Defaults to the word itself when the source supplies nothing better. */
  alt: string;
  source: "deck" | "openverse" | "commons" | "none";
}

const EMPTY: WordImage = { url: "", credit: "", alt: "", source: "none" };

/**
 * Words where a photograph is the wrong answer.
 *
 * Asking for a picture of "however" or "whereas" gets a stock image of a wooden signpost with
 * the word burned into it, which teaches nothing and looks like a placeholder. For these the
 * card uses its own artwork, which is honest about being a diagram.
 */
const ABSTRACT = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "that", "this", "these", "those",
  "however", "therefore", "moreover", "nevertheless", "although", "though", "unless", "whereas",
  "because", "since", "while", "until", "whether", "despite", "regardless", "hence", "thus",
  "on the other hand", "in spite of", "as long as", "so far", "at least", "in order to",
]);

interface OpenverseResponse {
  results?: {
    title?: string;
    url?: string;
    creator?: string;
    license?: string;
    license_version?: string;
    foreign_landing_url?: string;
    mature?: boolean;
  }[];
}

interface CommonsResponse {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: { url?: string; mime?: string; extmetadata?: { Artist?: { value?: string } } }[];
      }
    >;
  };
}

function openverseUrl(word: string): string {
  return `https://api.openverse.org/v1/images/?${qs({
    q: word,
    page_size: 3,
    /*
     * Photographs only. Without this the top hits for most vocabulary words are nineteenth
     * century engravings and museum scans, which are legitimate CC images and useless as a
     * visual for a modern word.
     */
    category: "photograph",
    license_type: "commercial,modification",
    mature: "false",
  })}`;
}

function commonsUrl(word: string): string {
  return `https://commons.wikimedia.org/w/api.php?${qs({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${word}`,
    gsrnamespace: "6",
    gsrlimit: "3",
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "1280",
    format: "json",
    origin: "*",
  })}`;
}

/** Title-case the search term: Commons filenames are capitalised, Openverse does not care. */
function tidy(word: string): string {
  const trimmed = word.trim().replace(/\s+/g, " ");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

async function fromOpenverse(word: string): Promise<WordImage | null> {
  const data = await getJson<OpenverseResponse>(openverseUrl(word), `img:ov:${word.toLowerCase()}`);
  const hit = data?.results?.find((entry) => isSafeHttpUrl(entry.url));
  if (!hit?.url) return null;
  const parts = [hit.creator, hit.license ? `${hit.license.toUpperCase()} ${hit.license_version ?? ""}`.trim() : null]
    .filter(Boolean)
    .join(" · ");
  return {
    url: hit.url,
    credit: parts ? `${stripHtml(hit.title) || "Openverse"} — ${parts}` : "Openverse",
    alt: stripHtml(hit.title) || word,
    source: "openverse",
  };
}

async function fromCommons(word: string): Promise<WordImage | null> {
  const data = await getJson<CommonsResponse>(commonsUrl(word), `img:wc:${word.toLowerCase()}`);
  const pages = Object.values(data?.query?.pages ?? {});
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.url || !isSafeHttpUrl(info.url)) continue;
    // SVG and PDF are excluded upstream by `filetype:bitmap`, but a mime check costs nothing.
    if (info.mime && !info.mime.startsWith("image/")) continue;
    return {
      url: info.url,
      credit: `${stripHtml(page.title)?.replace(/^File:/, "Wikimedia Commons") ?? "Wikimedia Commons"}`,
      alt: (page.title ?? word).replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
      source: "commons",
    };
  }
  return null;
}

/**
 * Find a photograph for a word.
 *
 * `preferred` is the deck's own URL and short-circuits everything. The credit for it is
 * assumed to be carried by the deck's `imageCredit` field, which the lesson prompt requires.
 */
export async function findImage(word: string, preferred?: string, preferredCredit?: string, preferredAlt?: string): Promise<WordImage> {
  if (isSafeHttpUrl(preferred)) {
    return { url: preferred!, credit: preferredCredit ?? "", alt: preferredAlt || word, source: "deck" };
  }

  const term = word.trim();
  if (!term || ABSTRACT.has(term.toLowerCase())) return EMPTY;

  /*
   * Openverse first, then Commons, then give up. Not `Promise.any`: a Commons hit for an
   * abstract word is exactly the failure mode this ordering exists to avoid, so the more
   * semantic source has to win outright rather than the faster one winning.
   */
  return (await fromOpenverse(term)) ?? (await fromCommons(tidy(term))) ?? EMPTY;
}
