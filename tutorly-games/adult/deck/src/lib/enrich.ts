/**
 * Live word enrichment from free, key-less public APIs.
 *
 * The deck is authored from pasted JSON, so a card knows its definition but nothing
 * about how the word *sounds*, what it rhymes with, where it came from or how it is
 * used in the wild. Those are exactly the things a language learner needs, and all of
 * them are available from public endpoints that need no API key and no account:
 *
 *  - **dictionaryapi.dev** — IPA transcription, a real audio recording, definitions
 *    grouped by part of speech. Also a per-word endpoint, so one fetch covers a lot.
 *  - **Datamuse** — rhymes, near-rhymes, collocations ("words that often follow"),
 *    soundalikes and "means like". Its whole API is a single GET with a query string.
 *  - **Wiktionary** — extra senses and etymology. Etymology is the one field the card
 *    design has always had a slot for and nothing ever filled.
 *  - **Tatoeba** — human-translated example sentences, which beat dictionary examples
 *    because they are real usage rather than an illustration of a definition.
 *  - **MyMemory** — a free translation endpoint, used to prefill the L1 line.
 *
 * Three rules this module follows:
 *
 *  1. **It never throws.** Enrichment is additive; a learner with no network must still
 *     be able to flip cards. Every source is wrapped so a failure degrades to a missing
 *     field, and `failed` records *which* source was down so the UI can say so.
 *  2. **It never blocks play.** Callers get a promise, not an await in a render path.
 *  3. **It remembers.** Results are cached in localStorage with a TTL, so a word is
 *     fetched once per device and the second visit is instant — including offline.
 */

export interface EnrichDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
}

export interface EnrichMeaning {
  partOfSpeech: string;
  definitions: EnrichDefinition[];
}

export interface WordEnrichment {
  word: string;
  fetchedAt: number;
  /** IPA, e.g. /ˌserənˈdɪpəti/. */
  phonetic?: string;
  /** A directly playable recording, when one exists. */
  audioUrl?: string;
  /**
   * Everything worth trying for audio, best first.
   *
   * Wikimedia paths are constructed from the word rather than looked up, so some of
   * these will 404. The player walks the list and the button hides if all of them fail.
   */
  audioCandidates?: string[];
  meanings: EnrichMeaning[];
  etymology?: { text: string; source: string };
  rhymes: string[];
  nearRhymes: string[];
  collocations: string[];
  soundsLike: string[];
  similar: string[];
  sentences: { text: string; source?: string }[];
  translations: { lang: string; text: string }[];
  /** Sources that answered, for a small "via ..." credit line. */
  answered: string[];
  /** Sources that failed, so the UI can distinguish "loading" from "unreachable". */
  failed: string[];
}

export function emptyEnrichment(word: string): WordEnrichment {
  return {
    word,
    fetchedAt: 0,
    meanings: [],
    rhymes: [],
    nearRhymes: [],
    collocations: [],
    soundsLike: [],
    similar: [],
    sentences: [],
    translations: [],
    answered: [],
    failed: [],
  };
}

/*
 * Bumped whenever the shape of `WordEnrichment` or the set of sources changes.
 *
 * A cached record written by an older build would otherwise be served as if it had been
 * produced by the current sources — so after swapping the primary dictionary, every
 * already-visited word would keep showing an empty pronunciation section forever.
 */
const CACHE_KEY = "deck.enrich.v3";
/** Written before the game was named Deck. Read once so a warmed cache is not thrown away. */
const LEGACY_CACHE_KEYS = ["linguaquest3d.enrich.v3", "linguaquest3d.enrich.v2", "linguaquest3d.enrich.v1"];
const CACHE_LIMIT = 60; // words kept; enough for a working deck, small enough to not bloat storage
const TTL_MS = 30 * 86_400_000;
/** Every request is capped, because a hanging fetch inside a card flip feels broken. */
const TIMEOUT_MS = 6500;

// ─────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────

type Cache = Record<string, WordEnrichment>;

function readCache(): Cache {
  if (typeof window === "undefined") return {};
  try {
    const raw = [CACHE_KEY, ...LEGACY_CACHE_KEYS]
      .map((key) => window.localStorage.getItem(key))
      .find((value) => value !== null) ?? null;
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Cache;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Cache): void {
  try {
    const entries = Object.entries(cache)
      .filter(([, value]) => value && typeof value.fetchedAt === "number")
      .sort((a, b) => b[1].fetchedAt - a[1].fetchedAt)
      .slice(0, CACHE_LIMIT);
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Quota or private browsing. Enrichment is a cache, not a source of truth.
  }
}

/** Returns a cached hit when it is fresh, otherwise `null`. */
export function getCachedEnrichment(word: string): WordEnrichment | null {
  const key = normalise(word);
  const hit = readCache()[key];
  if (!hit) return null;
  if (hit.fetchedAt && Date.now() - hit.fetchedAt > TTL_MS) return null;
  // A record that came back with nothing is worse than no record: it would make the
  // UI believe the word has no data. Treat an empty fetch as a miss so it retries.
  if (!hit.meanings?.length && !hit.rhymes?.length && !hit.sentences?.length) return null;
  return hit;
}

export function clearEnrichmentCache(): void {
  try {
    window.localStorage.removeItem(CACHE_KEY);
    for (const key of LEGACY_CACHE_KEYS) window.localStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

function normalise(word: string): string {
  return String(word || "").trim().toLowerCase();
}

// ─────────────────────────────────────────────────────────────
// Fetch helper
// ─────────────────────────────────────────────────────────────

/**
 * One guarded GET.
 *
 * `AbortSignal.timeout` is preferred but not universal, so the fallback timer is kept
 * — and the signal is also aborted by the caller when the learner moves to another
 * card, which is what stops a slow response overwriting a newer card's panel.
 */
async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** Runs a source, recording success or failure without letting either escape. */
async function source<T>(
  name: string,
  run: () => Promise<T>,
  answered: string[],
  failed: string[]
): Promise<T | null> {
  try {
    const value = await run();
    answered.push(name);
    return value;
  } catch {
    failed.push(name);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Sources
// ─────────────────────────────────────────────────────────────

interface FreeDictionaryResponse {
  word?: string;
  entries?: {
    partOfSpeech?: string;
    pronunciations?: { type?: string; text?: string }[];
    forms?: { word?: string; tags?: string[] }[];
    senses?: {
      definition?: string;
      examples?: string[] | string;
      synonyms?: string[];
      antonyms?: string[];
      subsenses?: { definition?: string; examples?: string[] | string }[];
    }[];
  }[];
}

/**
 * Free Dictionary API (freedictionaryapi.com) — the primary source.
 *
 * Chosen over dictionaryapi.dev after testing both in a browser rather than assuming:
 * this endpoint sends `access-control-allow-origin`, returns genuine IPA (often several
 * variants), parts of speech, definitions, **real example sentences**, quotes and
 * synonyms — and it answers. dictionaryapi.dev returned no response at all here, so
 * relying on it alone meant a pronunciation section that silently never populated.
 */
async function fromFreeDictionary(word: string, signal?: AbortSignal) {
  const data = await getJSON<FreeDictionaryResponse>(
    `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(word)}`,
    signal
  );
  const entries = data?.entries || [];
  if (!entries.length) return null;

  /** `examples` arrives sometimes as an array, sometimes as one newline-joined string. */
  const toSentences = (value: string[] | string | undefined): string[] => {
    if (!value) return [];
    const list = Array.isArray(value) ? value : [value];
    return list
      .flatMap((entry) => String(entry).split(/\n+/))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 12 && entry.length < 200);
  };

  const meanings: EnrichMeaning[] = [];
  const sentences: { text: string; source?: string }[] = [];
  let phonetic = "";

  for (const entry of entries.slice(0, 3)) {
    const definitions: EnrichDefinition[] = [];
    for (const sense of (entry.senses || []).slice(0, 4)) {
      if (!sense.definition) continue;
      // A subsense is a more specific reading of the same sense — worth showing when
      // the parent definition is broad ("a lucky discovery" → "specifically, in science").
      const sub = sense.subsenses?.find((candidate) => candidate.definition)?.definition;
      definitions.push({
        definition: sense.definition,
        example: toSentences(sense.examples)[0],
        synonyms: sense.synonyms?.slice(0, 6),
      });
      if (sub && definitions.length < 4) definitions.push({ definition: sub });
      for (const sentence of toSentences(sense.examples).slice(0, 2)) {
        if (!sentences.some((existing) => existing.text === sentence)) sentences.push({ text: sentence, source: "Free Dictionary" });
      }
    }
    if (definitions.length) meanings.push({ partOfSpeech: entry.partOfSpeech || "—", definitions });
    if (!phonetic) phonetic = entry.pronunciations?.find((p) => p.type === "ipa" && p.text)?.text || "";
  }

  return { phonetic, meanings, sentences: sentences.slice(0, 4), entries };
}

/**
 * A Wikimedia pronunciation file, guessed from the word.
 *
 * dictionaryapi.dev used to supply an audio URL, and with it unreachable there was no
 * way to *hear* a word — which is the single most useful thing in this panel. Wikimedia
 * Commons hosts `En-us-{word}.ogg` for a large share of common English words at a
 * predictable path.
 *
 * Playing it needs no CORS (an `<audio>` element is not a cross-origin fetch), so this
 * returns a candidate URL and the UI hides the button if the file turns out not to
 * exist. Constructing it is honest: it is a guess with a visible failure mode, not a
 * silent wrong answer.
 */
export function wikimediaAudioCandidates(word: string): string[] {
  const clean = normalise(word).replace(/[^a-z'-]/g, "");
  if (!clean) return [];
  const capitalised = clean.charAt(0).toUpperCase() + clean.slice(1);
  return [
    `https://upload.wikimedia.org/wikipedia/commons/transcoded/0/00/En-us-${clean}.ogg/En-us-${clean}.ogg.mp3`,
    `https://commons.wikimedia.org/wiki/Special:FilePath/En-us-${clean}.ogg`,
    `https://commons.wikimedia.org/wiki/Special:FilePath/En-us-${capitalised}.ogg`,
  ];
}

interface DictionaryEntry {
  word?: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  origin?: string;
}

/**
 * dictionaryapi.dev — a secondary source, kept only for the two things it does uniquely:
 * a direct audio file URL, and an etymology note. It is unreachable from this network, so
 * nothing here is allowed to be load-bearing.
 */
async function fromDictionaryApi(word: string, signal?: AbortSignal) {
  const data = await getJSON<DictionaryEntry[]>(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    signal
  );
  const entry = Array.isArray(data) ? data[0] : null;
  if (!entry) return null;

  const withAudio = (entry.phonetics || []).find((p) => p.audio);
  const anyText = (entry.phonetics || []).find((p) => p.text);
  const audio = withAudio?.audio || "";

  return {
    phonetic: entry.phonetic || anyText?.text || "",
    // Wikimedia-hosted recordings are protocol-relative; make them absolute so the
    // audio element can load them.
    audioUrl: audio ? (audio.startsWith("//") ? `https:${audio}` : audio) : "",
    origin: entry.origin || "",
  };
}

interface DatamuseWord {
  word?: string;
  score?: number;
}

/** Datamuse's query surface, reduced to the five relations this game can use. */
async function fromDatamuse(word: string, signal?: AbortSignal) {
  const queries = {
    rhymes: `rel_rhy=${encodeURIComponent(word)}&max=10`,
    nearRhymes: `rel_nry=${encodeURIComponent(word)}&max=10`,
    // "bricked up" style pairs: words that habitually follow this one.
    collocations: `rel_bga=${encodeURIComponent(word)}&max=8`,
    soundsLike: `sl=${encodeURIComponent(word)}&max=8`,
    similar: `ml=${encodeURIComponent(word)}&max=10`,
  };

  const results = await Promise.all(
    Object.entries(queries).map(([key, query]) =>
      getJSON<DatamuseWord[]>(`https://api.datamuse.com/words?${query}`, signal)
        .then((list) => [key, (list || []).map((item) => item.word).filter((w): w is string => !!w)] as const)
        .catch(() => [key, [] as string[]] as const)
    )
  );

  return Object.fromEntries(results) as Record<keyof typeof queries, string[]>;
}

interface WiktionaryResponse {
  en?: { partOfSpeech?: string; definitions?: { definition?: string; parsedExamples?: { example?: string }[] }[] }[];
}

/**
 * Wiktionary — supplementary senses.
 *
 * Used for breadth rather than as the primary source: its definitions include wiki
 * markup and cross-references, so the raw text is stripped of `[[...]]` and `{{...}}`
 * before being shown.
 */
async function fromWiktionary(word: string, signal?: AbortSignal) {
  const data = await getJSON<WiktionaryResponse>(
    `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
    signal
  );
  const groups = data?.en || [];
  const meanings: EnrichMeaning[] = groups
    .map((group) => ({
      partOfSpeech: group.partOfSpeech || "—",
      definitions: (group.definitions || [])
        .slice(0, 3)
        .map((d) => ({
          definition: stripWikiMarkup(d.definition || ""),
          example: d.parsedExamples?.[0] ? stripWikiMarkup(d.parsedExamples[0].example || "") : undefined,
        }))
        .filter((d) => d.definition.length > 2),
    }))
    .filter((meaning) => meaning.definitions.length);
  return meanings;
}

/** Removes the wiki syntax Wiktionary leaves in its API payload. */
function stripWikiMarkup(value: string): string {
  return value
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/<[^>]*>/g, "")
    .replace(/'''?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Wiktionary etymology, pulled out of the raw wikitext.
 *
 * There is no clean etymology endpoint, so this asks for the page's wikitext and
 * extracts the first sentence or two of the English Etymology section. It is the
 * most fragile source here — templates and nested links make the text messy — which
 * is why it is markdown-stripped and length-capped before it reaches the card.
 */
async function fromWiktionaryEtymology(word: string, signal?: AbortSignal) {
  const data = await getJSON<{ parse?: { wikitext?: { "*"?: string } } }>(
    `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(
      word
    )}&prop=wikitext&section=0&format=json&origin=*`,
    signal
  );
  const wikitext = data?.parse?.wikitext?.["*"] || "";
  if (!wikitext) return null;

  const match = wikitext.match(/===\s*Etymology\s*[^=]*===\s*([\s\S]*?)(\n==|\n===|$)/);
  if (!match) return null;
  const text = stripWikiMarkup(match[1]).slice(0, 420);
  return text.length > 24 ? { text, source: "Wiktionary" } : null;
}

/*
 * Tatoeba was removed after testing it in a browser rather than trusting the docs.
 *
 * It answers over the network (`200 OK`, real results for common words) but sends **no
 * `access-control-allow-origin` header**, so every `fetch` from the page fails and the
 * source could never have contributed anything except a permanently failing entry in
 * the panel's "unavailable" note. Example sentences now come from the two sources that
 * do send CORS headers — Free Dictionary's own examples and Wiktionary's parsed ones.
 *
 * The lesson is worth recording here: reachable is not the same as usable, and the only
 * way to tell them apart is to look at the response headers.
 */
interface MyMemoryResponse {
  responseData?: { translatedText?: string };
  responseStatus?: number;
}

/**
 * MyMemory — free machine translation, used to prefill the L1 line.
 *
 * The endpoint is rate-limited for anonymous use, so it is deliberately the last thing
 * fetched and its failure is unremarkable.
 */
async function fromMyMemory(word: string, language: string, signal?: AbortSignal) {
  const data = await getJSON<MyMemoryResponse>(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|${encodeURIComponent(language)}`,
    signal
  );
  const text = data?.responseData?.translatedText || "";
  // The API returns its own error strings in the translation field.
  if (!text || /MYMEMORY WARNING|INVALID|QUERY LENGTH/i.test(text)) return null;
  return { lang: language.toUpperCase(), text };
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/** Languages offered for the L1 line. Kept short: this is a prefills, not a translator. */
export const L1_LANGUAGES = ["es", "fr", "de", "it", "pt", "nl", "pl", "tr", "ar", "zh", "ja", "ko", "ru", "uk"] as const;

export interface EnrichOptions {
  /** Two-letter code for the L1 prefill. Omit to skip translation entirely. */
  l1?: string;
  /** Skips the cache and refetches. */
  force?: boolean;
  signal?: AbortSignal;
}

/**
 * Gathers everything known about one word.
 *
 * All five sources run concurrently with `Promise.allSettled`, so the panel fills in as
 * fast as the slowest source rather than in sequence — and one dead endpoint costs
 * latency, not the result. A cached record is returned immediately unless `force`.
 */
export async function enrichWord(word: string, options: EnrichOptions = {}): Promise<WordEnrichment> {
  const key = normalise(word);
  const result = emptyEnrichment(key);
  if (!key) return result;

  if (!options.force) {
    const cached = getCachedEnrichment(key);
    if (cached) return cached;
  }

  const answered: string[] = [];
  const failed: string[] = [];
  const { signal, l1 } = options;

  /*
   * `dictionary` is the primary source and `legacyDictionary` is the best-effort
   * secondary, so a total failure of the primary still leaves the panel with something.
   */
  const [dictionary, legacyDictionary, datamuse, wiktionary, etymology, translation] = await Promise.all([
    source("Free Dictionary", () => fromFreeDictionary(key, signal), answered, failed),
    source("dictionaryapi.dev", () => fromDictionaryApi(key, signal), answered, failed),
    source("Datamuse", () => fromDatamuse(key, signal), answered, failed),
    source("Wiktionary", () => fromWiktionary(key, signal), answered, failed),
    source("Wiktionary", () => fromWiktionaryEtymology(key, signal), answered, failed),
    l1
      ? source("MyMemory", () => fromMyMemory(key, l1, signal), answered, failed)
      : Promise.resolve(null),
  ]);

  if (dictionary) {
    result.phonetic = dictionary.phonetic || undefined;
    result.meanings = dictionary.meanings;
    result.sentences = dictionary.sentences;
  }

  // A phonetic from the secondary source is better than none at all.
  if (!result.phonetic && legacyDictionary?.phonetic) result.phonetic = legacyDictionary.phonetic;

  // Wiktionary senses are appended only when they add something: it and the dictionary
  // overlap heavily, and duplicated definitions read as a bug rather than as depth.
  if (wiktionary?.length) {
    const seen = new Set(result.meanings.flatMap((m) => m.definitions.map((d) => d.definition.slice(0, 40).toLowerCase())));
    const extra = wiktionary
      .map((group) => ({
        partOfSpeech: group.partOfSpeech,
        definitions: group.definitions.filter((d) => !seen.has(d.definition.slice(0, 40).toLowerCase())),
      }))
      .filter((group) => group.definitions.length);
    result.meanings = [...result.meanings, ...extra].slice(0, 6);

    // Wiktionary's parsed examples are the fallback when the dictionary had none.
    for (const group of wiktionary) {
      for (const definition of group.definitions) {
        if (!definition.example || definition.example.length < 16 || definition.example.length > 200) continue;
        if (result.sentences.some((sentence) => sentence.text === definition.example)) continue;
        if (result.sentences.length >= 5) break;
        result.sentences.push({ text: definition.example, source: "Wiktionary" });
      }
    }
  }

  /*
   * Audio, in order of confidence: a real file URL from the secondary source, then a
   * constructed Wikimedia Commons path. If neither resolves the UI hides the button, so
   * the failure is visible rather than silent.
   */
  const candidates = [legacyDictionary?.audioUrl, ...wikimediaAudioCandidates(key)].filter(
    (candidate): candidate is string => !!candidate
  );
  result.audioCandidates = candidates;
  result.audioUrl = candidates[0];

  if (datamuse) {
    result.rhymes = datamuse.rhymes || [];
    result.nearRhymes = datamuse.nearRhymes || [];
    result.collocations = datamuse.collocations || [];
    result.soundsLike = datamuse.soundsLike || [];
    result.similar = datamuse.similar || [];
  }

  // Prefer the Wiktionary wikitext etymology; fall back to the secondary source's note.
  result.etymology =
    etymology || (legacyDictionary?.origin ? { text: legacyDictionary.origin, source: "dictionaryapi.dev" } : undefined);
  result.translations = translation ? [translation] : [];

  // `answered` can list a source twice (Wiktionary is queried for both senses and
  // etymology), so it is deduped for the credit line.
  result.answered = [...new Set(answered)];
  result.failed = [...new Set(failed)];
  result.fetchedAt = Date.now();

  if (result.answered.length) {
    writeCache({ ...readCache(), [key]: result });
  }
  return result;
}

/** True when the panel has something worth showing. */
export function hasEnrichment(data: WordEnrichment | null | undefined): boolean {
  if (!data) return false;
  return Boolean(
    data.phonetic || data.meanings.length || data.etymology || data.rhymes.length || data.sentences.length || data.translations.length
  );
}

/** A compact one-line summary for the toast after a manual refresh. */
export function enrichmentSummary(data: WordEnrichment): string {
  const parts: string[] = [];
  if (data.meanings.length) parts.push(`${data.meanings.reduce((n, m) => n + m.definitions.length, 0)} definitions`);
  if (data.rhymes.length) parts.push(`${data.rhymes.length} rhymes`);
  if (data.sentences.length) parts.push(`${data.sentences.length} examples`);
  if (data.etymology) parts.push("etymology");
  return parts.length ? parts.join(" · ") : "no data found";
}
