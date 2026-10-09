/*
 * The enrichment sources that make a card about the *word* rather than about the definition.
 *
 * The deck JSON already carries a quote, a cultural fact and a song. Those are model-written,
 * and a model writing a quote does the thing models do: it produces something plausible and
 * unattributed. A language lesson is exactly the context where that matters, because the
 * learner is being asked to trust it. So this module goes and gets the real ones.
 *
 *  - **Wikiquote** for a quotation that genuinely uses the word. Search, then sentence
 *    extraction, and if the word appears in no indexed quotation the section says so rather
 *    than inventing one. Attribution is the page the sentence came from.
 *  - **Wikipedia** for cultural context: the summary of the article the word resolves to,
 *    with its own description line and lead image where one exists.
 *  - **Wiktionary audio**, which is the real prize here. `File:en-uk-serendipity.ogg` is a
 *    recording of a human being saying the word — a UK and a US speaker, usually several
 *    accents. `speechSynthesis` guessing at "serendipity" is not the same thing as hearing it,
 *    and pronunciation is the one part of vocabulary that a text-only deck cannot teach.
 *
 * All three are keyless and CORS-open. Note the pattern in the audio resolver: the file is
 * fetched through `Special:FilePath`, which 302s to `upload.wikimedia.org`, rather than via
 * the `imageinfo` API — one request instead of two, and the redirect lands on a host that
 * sends `access-control-allow-origin: *` so the browser can play it directly.
 */

import { getJson, qs, stripHtml } from "./http";

export interface Quote {
  text: string;
  attribution: string;
}

export interface Culture {
  title: string;
  description: string;
  extract: string;
  /** Lead image from the article, if it has one. */
  image: string;
  imageCredit: string;
  url: string;
}

export interface Pronunciations {
  uk: string;
  us: string;
  /** Every other recording Wiktionary holds, so the app can offer "try another accent". */
  others: string[];
}

export const EMPTY_CULTURE: Culture = { title: "", description: "", extract: "", image: "", imageCredit: "", url: "" };
export const EMPTY_PRONUNCIATIONS: Pronunciations = { uk: "", us: "", others: [] };

interface SearchResponse {
  query?: { search?: { title?: string; snippet?: string }[] };
}

interface ExtractResponse {
  query?: { pages?: Record<string, { title?: string; extract?: string }> };
}

interface SummaryResponse {
  title?: string;
  description?: string;
  extract?: string;
  extract_html?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

interface MediaListResponse {
  items?: { title?: string; type?: string }[];
}

/** Quote characters and dashes that Wikiquote returns and a card should render cleanly. */
function normaliseQuotes(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pull the sentences that actually contain the word.
 *
 * Wikiquote pages are messy — they carry headings, source lines, translator notes and
 * "Wikiquote has quotations related to..." boilerplate. The only reliable filter for "is this
 * a sentence using my word" is to keep sentences that contain it and drop the rest, which also
 * incidentally removes almost all of the boilerplate.
 */
function sentencesContaining(text: string, word: string, limit: number): string[] {
  const needle = word.toLowerCase();
  const candidates = text
    .split(/(?<=[.!?])\s+(?=[A-Z"'\u201C])/)
    .map(normaliseQuotes)
    .filter((sentence) => sentence.toLowerCase().includes(needle));

  return candidates
    .filter((sentence) => sentence.length >= 30 && sentence.length <= 320)
    .filter((sentence) => !/^(see also|external links|references|sources?)\b/i.test(sentence))
    .slice(0, limit);
}

export async function lookupQuotes(word: string): Promise<Quote[]> {
  const term = word.trim().toLowerCase();
  if (!term) return [];

  // `insource:` matches the word inside the page's wikitext, so the hits actually contain it.
  const search = await getJson<SearchResponse>(
    `https://en.wikiquote.org/w/api.php?${qs({
      action: "query",
      list: "search",
      srsearch: `insource:"${term}"`,
      srlimit: "5",
      format: "json",
      origin: "*",
    })}`,
    `wq:${term}`
  );

  const titles = (search?.query?.search ?? []).map((hit) => hit.title).filter((title): title is string => Boolean(title)).slice(0, 3);
  if (titles.length === 0) return [];

  const pages = await Promise.all(
    titles.map((title) =>
      getJson<ExtractResponse>(
        `https://en.wikiquote.org/w/api.php?${qs({
          action: "query",
          prop: "extracts",
          explaintext: "1",
          exsectionformat: "plain",
          titles: title,
          format: "json",
          origin: "*",
        })}`,
        `wqx:${title}`
      )
    )
  );

  const quotes: Quote[] = [];
  pages.forEach((page, index) => {
    for (const entry of Object.values(page?.query?.pages ?? {})) {
      const text = entry.extract;
      if (!text) continue;
      for (const sentence of sentencesContaining(text, term, 2)) {
        quotes.push({ text: sentence, attribution: titles[index] ?? entry.title ?? "Wikiquote" });
      }
    }
  });

  // De-duplicate by opening words: Wikiquote repeats a quote across several pages.
  const seen = new Set<string>();
  return quotes.filter((quote) => {
    const key = quote.text.slice(0, 48).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}

export async function lookupCulture(word: string): Promise<Culture> {
  const term = word.trim().replace(/\s+/g, "_");
  if (!term) return EMPTY_CULTURE;

  const data = await getJson<SummaryResponse>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`, `wp:${term.toLowerCase()}`);
  if (!data?.extract) return EMPTY_CULTURE;

  return {
    title: data.title ?? word,
    description: data.description ?? "",
    extract: stripHtml(data.extract),
    image: data.thumbnail?.source ?? data.originalimage?.source ?? "",
    imageCredit: "Wikimedia Commons",
    url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${term}`,
  };
}

/**
 * True when Wikipedia gave back a real article rather than a disambiguation stub.
 *
 * The summary endpoint answers for almost any string, so a word with no article of its own
 * resolves to the disambiguation page listing the topics that share the name. That page begins
 * "… may refer to:", which is a precise enough tell to drop it — showing a learner a list of
 * unrelated things as "cultural context" is worse than showing nothing.
 */
export function cultureIsRelevant(culture: Culture): boolean {
  if (!culture.extract) return false;
  if (/may refer to|topics referred to by the same term/i.test(culture.extract)) return false;
  return culture.extract.length > 80;
}

/**
 * Resolve the pronunciation recordings Wiktionary holds for a word.
 *
 * `Special:FilePath` is used rather than resolving `imageinfo` first: it 302s straight to the
 * file on `upload.wikimedia.org`, so this is one round trip and an `<audio src>` can point at
 * it directly. Missing files 404 rather than rendering an error, which is the behaviour needed
 * here — the audio element simply never gets a source and the TTS fallback stays in charge.
 */
export async function lookupPronunciations(word: string): Promise<Pronunciations> {
  const term = word.trim().toLowerCase();
  if (!term) return EMPTY_PRONUNCIATIONS;

  const data = await getJson<MediaListResponse>(`https://en.wiktionary.org/api/rest_v1/page/media-list/${encodeURIComponent(term)}`, `ml:${term}`);
  const files = (data?.items ?? [])
    .filter((item) => item.type === "audio" && item.title)
    .map((item) => item.title!.replace(/^File:/, ""));

  const toUrl = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;

  const uk = files.find((file) => /^en-uk-|^en-gb-/i.test(file));
  const us = files.find((file) => /^en-us-/i.test(file));
  const others = files.filter((file) => file !== uk && file !== us).map(toUrl).slice(0, 4);

  return {
    uk: uk ? toUrl(uk) : "",
    us: us ? toUrl(us) : "",
    others,
  };
}

/** "en-uk-serendipity.ogg" → "UK". Used for the accent label on the audio button. */
export function accentLabel(file: string): string {
  const match = /^en-([a-z]{2})-/i.exec(file);
  return match ? match[1].toUpperCase() : "";
}
