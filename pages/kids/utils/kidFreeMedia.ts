/* ════════════════════════════════════════════════════════════════════════════
   🆓 KID FREE MEDIA — real photographs, real pronunciation, real emoji art
   ════════════════════════════════════════════════════════════════════════════

   The lesson library is written in emoji: the duck glyph means "duck". That is a
   fine placeholder and a poor *lesson*. A four-year-old acquiring a word needs to
   see the thing, not a symbol for it — recognition of a real duck is what
   transfers to the real duck on the pond, and a flat cartoon glyph on a projector
   at ten metres is not much of a duck. This module replaces the placeholder with
   reality, from sources that need no account and no key:

     1. **Wikimedia Commons** — the actual photograph of the thing, via the
        MediaWiki API with `origin=*` so the browser may read it (verified:
        `access-control-allow-origin: *`). Results are filtered to licences that
        permit reuse and to bitmaps, because a classroom screen needs a picture
        and not an SVG diagram.
     2. **Wiktionary via api.dictionaryapi.dev** — a real human recording of the
        word and its IPA transcription (CC BY-SA 3.0). This is the single biggest
        quality jump available for a phonics lesson: a laptop's speech voice is a
        mediocre approximation, and a child learning to say "thistle" needs to hear
        a person say it.
     3. **Twemoji** (via jsDelivr) — the same emoji as a clean SVG everywhere.
        Windows draws a flat monochrome glyph, macOS a 3-D apple, Android something
        else again; a projector should not care which laptop made the screen.
     4. **Openverse** — a second photo pool, used when Commons has nothing usable.

   Three rules govern everything here:

     · **A child is never left with a broken image.** Every call is wrapped, timed
       out, and resolves to `null` rather than throwing. The UI falls back to the
       emoji the lesson already had, so the lesson runs identically with the
       network unplugged — which is also how it runs in the one classroom that
       blocks everything.
     · **Nothing unsuitable reaches a screen.** Commons is an open repository
       holding genuinely unsuitable material for a four-year-old. Words are
       screened before a search is issued, results are filtered to permissive
       licences, and files whose title suggests a person, a diagram, a map or a
       weapon are refused even when the licence allows them.
     · **Every photograph keeps its credit.** The API returns the artist and the
       licence; both travel with the URL so the screen can show them, because CC
       BY and CC BY-SA attribution is a legal condition, not a courtesy.

   The cache is `localStorage['kids.freemedia.v1']` — namespaced, versioned so a
   change to the filters drops it, and capped so a long-running dashboard cannot
   grow it without bound.
   ════════════════════════════════════════════════════════════════════════════ */

import type { KidAgeBand } from './lessonCreatorTypes';

const CACHE_KEY = 'kids.freemedia.v1';
const CACHE_MAX = 220;

/**
 * Timeouts, and they differ on purpose.
 *
 * Measured, not guessed: a cold Wikimedia Commons query answers in well under a
 * second, but a cold `dictionaryapi.dev` query was measured at **26 seconds**
 * before falling to ~1.4s once its connection was warm. A single shared 7s budget
 * therefore looked like "this API is down" on the very first word of a lesson —
 * which is the moment a teacher is watching and least able to wait.
 *
 * So the dictionary gets a long leash because it is pure enrichment: nothing waits
 * on it, the screen is already showing the word and the emoji, and a slow answer
 * simply means this lesson keeps the browser's voice. The picture keeps the short
 * leash, because a photograph arriving 20 seconds late is worse than no photograph.
 */
const PHOTO_TIMEOUT_MS = 8000;
const PRONUNCIATION_TIMEOUT_MS = 25000;

/* ────────────────────────────────────────────────────────────────────────────
   1 · What we will never fetch
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Words that must never reach a search engine from a children's app.
 *
 * A *blocklist*, so it is not complete and is not relied on alone — the licence
 * and title filters below are the second and third line of defence. It exists
 * because the cheapest possible failure is a tutor opening a lesson and finding a
 * war memorial, and because the query leaves a shared classroom computer where a
 * cached result would outlive the class.
 */
const BLOCKED_WORDS = new Set([
  'war', 'weapon', 'gun', 'rifle', 'pistol', 'bomb', 'grenade', 'knife', 'blood',
  'corpse', 'dead', 'death', 'kill', 'suicide', 'murder', 'rape', 'abuse',
  'terrorist', 'extremist', 'nazi', 'hitler', 'religion', 'politics', 'election',
  'president', 'trump', 'biden', 'porn', 'sex', 'nude', 'naked', 'drugs',
  'heroin', 'cocaine', 'meth', 'cancer', 'tumour', 'tumor', 'disease', 'autism',
  'disability', 'depression', 'suffering', 'poverty', 'homeless', 'refugee',
  'immigrant', 'racism', 'racist', 'slave', 'slavery', 'lynching', 'cremation',
  'casino', 'gambling', 'lottery', 'cigarette', 'alcohol', 'beer', 'wine', 'vodka',
  'accident', 'injury', 'hospital', 'crime', 'prison', 'police', 'court',
  'statue', 'monument', 'memorial', 'gravestone', 'flag', 'emblem', 'insignia',
  'dictator', 'regime', 'colonialism', 'empire', 'revolution',
]);

/** Titles whose pictures a child should not be asked to interpret. */
const BLOCKED_TITLE_WORDS = [
  'nude', 'naked', 'porn', 'sex', 'erotic', 'gore', 'mutilat',
  'corpse', 'cadaver', 'autopsy', 'blood', 'wound',
  'weapon', 'rifle', 'pistol', 'gun', 'bomb', 'missile', 'tank', 'artillery',
  'war', 'soldier', 'military', 'nazis', 'hitler', 'swastika',
  'hanging', 'guillotine', 'lynch',
  'map of', 'flag of', 'coat of arms', 'logo of', 'diagram',
  'book cover', 'album cover', 'movie poster', 'screenshot',
  'statue of', 'monument', 'memorial', 'grave', 'cemetery', 'tomb',
  'painting of', 'engraving of', 'coin of', 'stamp',
];

/** Licences that permit classroom reuse. NC/ND are refused: non-commercial reads
 *  narrow for a school, and no-derivatives breaks cropping for a projector. */
const OK_LICENCE = /(cc0|public domain|\bpd\b|no restrictions|attribution|cc by|cc-by|by-sa|by sa)/i;
const BAD_LICENCE = /(nc|nd|non-?commercial|no-?derivs?|fair use|copyright|all rights reserved)/i;

/** Commons is huge; these keep results on the "a real photo of it" path. */
const BAD_FILE_EXT = /\.(svg|tif|tiff|ogg|webm|pdf|djvu|gif)$/i;
const BAD_MIME = /^(image\/svg|image\/tiff|application|audio|video)/i;
/* ────────────────────────────────────────────────────────────────────────────
   2 · The cache
   ──────────────────────────────────────────────────────────────────────────── */

type Cache = Record<string, unknown>;

const memoryCache: Cache = {};

function readCache(): Cache {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Cache) : {};
  } catch {
    return {};
  }
}

function writeCache(key: string, value: unknown) {
  memoryCache[key] = value;
  if (typeof localStorage === 'undefined') return;
  try {
    const store = { ...readCache(), ...memoryCache };
    const keys = Object.keys(store);
    if (keys.length > CACHE_MAX) {
      // Drop the oldest insertions; JSON key order is insertion order, which is
      // exactly the order we want here.
      for (const stale of keys.slice(0, keys.length - CACHE_MAX)) delete store[stale];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    /* a full or disabled quota must never break a lesson */
  }
}

/** A cached value, or `undefined`. Negative results are cached too — a word
 *  Commons does not have should not cost the same network call every round. */
function cached<T>(key: string): T | undefined {
  if (key in memoryCache) return memoryCache[key] as T;
  const store = readCache();
  if (key in store) {
    memoryCache[key] = store[key];
    return store[key] as T;
  }
  return undefined;
}

/* ────────────────────────────────────────────────────────────────────────────
   3 · Small utilities
   ──────────────────────────────────────────────────────────────────────────── */

async function getJson(url: string, timeoutMs: number): Promise<any> {
  if (typeof fetch !== 'function') return null;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller?.signal,
      // No credentials: this is a public read, and sending cookies to a third
      // party for it would be wrong even where CORS permits it.
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Emoji presentation → hex codepoints, for the Twemoji filename. */
function toCodePoints(emoji: string): string | null {
  const points: string[] = [];
  for (const char of Array.from(emoji)) {
    const code = char.codePointAt(0);
    if (code === undefined) return null;
    // Twemoji's filenames strip the U+FE0F variation selector but keep every
    // other modifier and the ZWJ joiner.
    if (code === 0xfe0f) continue;
    points.push(code.toString(16));
  }
  return points.length ? points.join('-') : null;
}

const stripHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&[a-z]+;/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Turns whatever the lesson wrote into the noun a search should use. */
export function searchTermFor(word: string): string {
  return String(word || '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')[0]
    .replace(/-/g, ' ')
    .trim();
}
/* ────────────────────────────────────────────────────────────────────────────
   4 · Photographs
   ──────────────────────────────────────────────────────────────────────────── */

export interface KidPhoto {
  /** A thumbnail-sized HTTPS URL — right for a projector, not a 20 MB original. */
  url: string;
  /** What the picture is of, for the alt text and the tutor's line. */
  title: string;
  /** The photographer or uploader. CC BY requires this be shown. */
  credit: string;
  /** e.g. "CC BY-SA 4.0" — shown beside the credit. */
  license: string;
  /** Where the file lives, so a tutor can look it up. */
  sourceUrl: string;
  /** True when the file is in the public domain, which needs no attribution. */
  publicDomain?: boolean;
}

/**
 * Is this word safe to send to a search engine from a children's app?
 *
 * Exported because the UI must be able to say *why* a word got no photograph,
 * rather than silently falling back to an emoji and leaving the tutor guessing.
 */
export function isPhotoSafe(word: string): boolean {
  const term = searchTermFor(word);
  if (!term || term.length < 2) return false;
  if (BLOCKED_WORDS.has(term)) return false;
  // A single character, or a string of digits, is never a photographable noun.
  if (/^\d+$/.test(term)) return false;
  return true;
}

/**
 * Score how well a file title depicts `term`. Higher is better; `null` means no.
 *
 * A whole-word filter alone is not enough, and the reason shows up immediately in
 * testing. Commons searches the file's whole *description page*, not just its
 * title, so a query for "rainbow" returns *Aurora Australis (icebreaker) berthed
 * in Hobart under a rainbow* — a photograph of a ship. It passes every safety and
 * licence check and it is a real rainbow in the frame, but the subject of the
 * picture is a ship, and a child shown it is being taught the wrong thing.
 *
 * The same trap catches "tree" (*Bonnet macaque in tree*) and "apple" (*Rotten
 * apple under the tree*). All of these contain the word and none of them is a
 * picture of the word. So the score rewards a word that is the *subject*:
 *
 *   · it must appear as a whole word, near the front of the title;
 *   · a word introduced by "with", "under", "beside", "near" is treated as
 *     incidental — the picture is of the thing it is described *against*;
 *   · shorter titles win, because Commons' plain descriptive titles
 *     ("Red Apple", "Duck") are usually exactly the subject and the longer ones
 *     are usually a scene the subject happens to be in.
 */
function titleScore(title: string, term: string): number | null {
  const normalised = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = normalised.split(' ').filter(Boolean);
  const needle = term.toLowerCase().replace(/\s+/g, ' ').trim();
  const at = words.indexOf(needle);
  if (at === -1) return null;

  // "…with rainbow", "…under a rainbow" — present, but not the subject.
  const before = at > 0 ? words[at - 1] : '';
  if (/^(with|under|over|beside|near|behind|above|beneath|inside|outside|among|next|by)$/.test(before)) {
    return -100;
  }

  let score = 100;
  // Front of the title is the subject; the back is scenery.
  score += Math.max(0, 40 - at * 8);
  // Concise titles are usually the plain subject.
  score += Math.max(0, 24 - words.length * 2);
  return score;
}

function acceptableCommonsFile(page: any, term: string): { score: number; photo: KidPhoto } | null {
  const info = page?.imageinfo?.[0];
  if (!info) return null;

  const rawTitle = String(page.title || '');
  const title = rawTitle.replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '');
  const lowerTitle = title.toLowerCase();
  if (!title) return null;
  // A title that says "X" but is really a person, a map or a diagram is refused
  // however permissive its licence — the licence answers "may I", not "should I".
  if (BLOCKED_TITLE_WORDS.some((bad) => lowerTitle.includes(bad))) return null;
  if (BAD_FILE_EXT.test(rawTitle)) return null;
  if (BAD_MIME.test(String(info.mime || ''))) return null;
  // Must actually be a picture OF the word, not merely a licensed file that the
  // search engine thought was related. The score also screens out a word that is
  // scenery ("a ship under a rainbow") rather than the subject.
  const score = titleScore(title, term);
  if (score === null || score < 0) return null;

  const meta = info.extmetadata || {};
  const licence = stripHtml(meta.LicenseShortName?.value) || stripHtml(meta.UsageTerms?.value);
  const publicDomain = /public domain|^pd|cc0/i.test(licence);
  if (!publicDomain) {
    if (BAD_LICENCE.test(licence)) return null;
    if (!OK_LICENCE.test(licence)) return null;
  }

  const url = stripHtml(info.thumburl || info.url);
  if (!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(url)) return null;

  return {
    score,
    photo: {
      url,
      title,
      credit: stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value) || 'Wikimedia Commons',
      license: licence || 'see file page',
      sourceUrl: stripHtml(info.descriptionurl),
      publicDomain,
    },
  };
}

/**
 * A real photograph of `word`, or nothing.
 *
 * Commons search first (the largest pool of freely licensed photographs of
 * concrete things, and stable), then Openverse as a second pool. Both are
 * optional: the caller always has the emoji to fall back on.
 */
export async function fetchPhoto(word: string): Promise<KidPhoto | null> {
  const term = searchTermFor(word);
  if (!isPhotoSafe(term)) return null;

  const key = `photo:${term}`;
  const hit = cached<KidPhoto | null>(key);
  if (hit !== undefined) return hit;

  const commons =
    'https://commons.wikimedia.org/w/api.php' +
    '?action=query&format=json&origin=*&formatversion=2' +
    '&generator=search&gsrnamespace=6&gsrlimit=20' +
    `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${term}`)}` +
    '&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=900';

  const fromCommons = await getJson(commons, PHOTO_TIMEOUT_MS);
  const pages: any[] = Array.isArray(fromCommons?.query?.pages) ? fromCommons.query.pages : [];
  // Take the BEST candidate, not the first. Commons' own ranking is a text
  // relevance score over description pages, which is not the same question as
  // "is this a picture of a duck" — so every acceptable file is scored and the
  // strongest subject match wins.
  let best: { score: number; photo: KidPhoto } | null = null;
  for (const page of pages) {
    const candidate = acceptableCommonsFile(page, term);
    if (candidate && (!best || candidate.score > best.score)) best = candidate;
  }
  if (best) {
    writeCache(key, best.photo);
    return best.photo;
  }

  const openverse =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(term)}` +
    '&page_size=5&license_type=all-cc&mature=false';

  const fromOpenverse = await getJson(openverse, PHOTO_TIMEOUT_MS);
  const results: any[] = Array.isArray(fromOpenverse?.results) ? fromOpenverse.results : [];
  for (const item of results) {
    const url = String(item?.url || '').trim();
    const licence = String(item?.license || '');
    if (!/^https:\/\//.test(url)) continue;
    // Openverse answers with plain slugs ("by", "by-sa"); refuse the rest.
    if (!['cc0', 'pdm', 'by', 'by-sa'].includes(licence)) continue;
    if (item?.mature) continue;
    const title = stripHtml(item.title) || term;
    // Same relevance rule as Commons — Openverse's "mallard ducks feel in love!!"
    // is a real photograph, but it is not a picture *of a duck* a child is learning.
    if (titleScore(title, term) === null) continue;
    const photo: KidPhoto = {
      url,
      title,
      credit: stripHtml(item.creator) || 'Openverse',
      license: `CC ${licence.toUpperCase()}${item.license_version ? ` ${item.license_version}` : ''}`,
      sourceUrl: String(item.foreign_landing_url || '').trim(),
    };
    writeCache(key, photo);
    return photo;
  }

  // Remembered as "nothing", so the same unknown word costs one request, not six.
  writeCache(key, null);
  return null;
}
/* ────────────────────────────────────────────────────────────────────────────
   5 · Pronunciation — a real voice, and the letters that make it
   ──────────────────────────────────────────────────────────────────────────── */

export interface KidPronunciation {
  /** IPA, e.g. "/dʌk/". Shown to the Young band, never to the little ones. */
  phonetic?: string;
  /** A human recording. Lingua Libre first, Wiktionary second. */
  audioUrl?: string;
  /** The shortest definition that a child could actually use. */
  definition?: string;
  /** Grammar label — "noun", "verb" — for the older band's flashcards. */
  partOfSpeech?: string;
  /** Who recorded it, for the attribution line. */
  credit?: string;
}

/**
 * A single-word human recording from **Lingua Libre** on Wikimedia Commons.
 *
 * This exists because the obvious source turned out to be unusable in a lesson.
 * `api.dictionaryapi.dev` was measured taking **40 seconds** on a cold request
 * (its connection setup, not the lookup) — a tutor pressing ▶ cannot wait that
 * long, and a timeout at any sane budget reports the whole service as dead.
 *
 * Lingua Libre is a Wikimedia project of volunteers recording single English
 * words for exactly this purpose, hosted on the same `upload.wikimedia.org` CDN
 * that already serves the photographs — measured at ~1.8s, and warm after the
 * first request. Same origin, same caching, same licence handling as the pictures.
 * The files are named `LL-Q1860 (eng)-Speaker-word`, so the match requires the
 * title to END with the word, which is what stops the search handing back
 * "apple pie" or "apple tree" for a lesson about the fruit.
 *
 * Licence: every Lingua Libre file on Commons is CC BY-SA 3.0 or later.
 */
async function fetchLinguaLibre(term: string): Promise<{ url: string; credit: string } | null> {
  const query =
    'https://commons.wikimedia.org/w/api.php' +
    '?action=query&format=json&origin=*&formatversion=2' +
    '&generator=search&gsrnamespace=6&gsrlimit=25' +
    `&gsrsearch=${encodeURIComponent(`filetype:audio LL-Q1860 (eng) - ${term}`)}` +
    '&prop=imageinfo&iiprop=url|mime|extmetadata';

  const data = await getJson(query, PHOTO_TIMEOUT_MS);
  const pages: any[] = Array.isArray(data?.query?.pages) ? data.query.pages : [];

  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    const title = String(page?.title || '');
    // Must be a Lingua Libre English recording ...
    if (!/^File:LL-Q1860 \(eng\)-/i.test(title)) continue;
    // ... whose filename ENDS in exactly this word. This is the guard that keeps
    // "apple pie" and "apple tree" out of a lesson about the fruit. The limit
    // above is generous because a common word is often crowded out of the first
    // page by its own compounds ("apple pie", "apple tree", "apple cider").
    const stem = title.replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '').toLowerCase();
    const tail = stem.slice(stem.lastIndexOf('-') + 1);
    if (tail.replace(/\s+/g, '') !== term.replace(/\s+/g, '')) continue;

    const url = stripHtml(info?.url);
    if (!/^https:\/\/upload\.wikimedia\.org\//.test(url)) continue;
    const meta = info?.extmetadata || {};
    // The credit is "Speaker: Jane Recorder: Jim" on Commons. A child's screen has
    // room for the person whose voice they are hearing, not the recording engineer,
    // so only the speaker's name is kept.
    const raw = stripHtml(meta.Artist?.value);
    const speaker =
      (raw.match(/speaker:\s*([^|]+?)(?:\s*\|)?\s*recorder/i) || [])[1] ||
      // Fall back to the filename: "LL-Q1860 (eng)-Speaker-word" puts the speaker
      // between the language code and the word.
      title.replace(/^File:LL-Q1860 \(eng\)-/i, '').slice(0, title.lastIndexOf('-')).trim() ||
      'a Lingua Libre volunteer';
    return { url, credit: speaker.trim() };
  }
  return null;
}

/**
 * The real pronunciation of a word.
 *
 * The browser's own voice is always the *default* — instant, offline and free,
 * and on a locked-down school laptop possibly the only voice there is. This is
 * the upgrade offered when there is a network: a human recording, worth far more
 * than a synthetic one for a child learning to *hear* the contrast between two
 * similar words, plus the IPA that a phonics lesson needs in order to show the
 * sound at all.
 *
 * Two sources, in the order that actually works in a classroom:
 *   1. **Lingua Libre / Commons** for the voice — fast, and a whole word rather
 *      than a dictionary headword read in isolation.
 *   2. **Wiktionary** for the IPA, the part of speech and a child-sized meaning.
 *      Slow, but nothing waits on it: if it never arrives the lesson still has a
 *      human recording, which is the part a child actually hears.
 */
export async function fetchPronunciation(word: string): Promise<KidPronunciation | null> {
  const term = searchTermFor(word);
  if (!term || term.length < 2 || BLOCKED_WORDS.has(term)) return null;

  const key = `pron:${term}`;
  const hit = cached<KidPronunciation | null>(key);
  if (hit !== undefined) return hit;

  const result: KidPronunciation = {};

  // 1 · The voice, from the fast CDN. This is the part a child actually hears, so
  //     it is resolved first and on its own — measured at ~1.8s.
  const recording = await fetchLinguaLibre(term);
  if (recording) {
    result.audioUrl = recording.url;
    result.credit = recording.credit;
    // Cached immediately. A later lesson showing the same word gets the recording
    // from storage without touching the network at all, even though the slower
    // enrichment below has not finished yet — or may never finish.
    writeCache(key, { ...result });
  }

  // 2 · The letters, the grammar and the meaning. Measured at 20-40s cold, so it
  //     runs *after* the recording is already banked and can be abandoned: an
  //     await that throws or times out leaves the cached recording intact.
  const data = await getJson(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`,
    PRONUNCIATION_TIMEOUT_MS,
  );
  const entries: any[] = Array.isArray(data) ? data : [];
  if (entries.length) {
    // Prefer the entry that carries audio; a polysemous word has several.
    const withAudio = entries.find((e) => Array.isArray(e?.phonetics) && e.phonetics.some((p: any) => p?.audio));
    const entry = withAudio || entries[0];
    const phonetic =
      stripHtml(entry?.phonetic) || stripHtml((entry?.phonetics || []).find((p: any) => p?.text)?.text);
    if (phonetic) result.phonetic = phonetic;
    // Prefer the shortest definition: children do not need the encyclopaedia.
    const meanings: any[] = Array.isArray(entry?.meanings) ? entry.meanings : [];
    const first = meanings[0];
    const definition = stripHtml(first?.definitions?.[0]?.definition);
    if (definition) result.definition = definition;
    if (first?.partOfSpeech) result.partOfSpeech = stripHtml(first.partOfSpeech);
    // Only fall back to Wiktionary's own recording when Lingua Libre had none.
    if (!result.audioUrl) {
      const fallback = stripHtml(
        (entry?.phonetics || [])
          .map((p: any) => p?.audio)
          .find((a: any) => typeof a === 'string' && a.startsWith('https://')),
      );
      if (fallback) {
        result.audioUrl = fallback;
        result.credit = 'Wiktionary (CC BY-SA 3.0)';
      }
    }
  }

  const usable = Object.keys(result).length ? result : null;
  writeCache(key, usable);
  return usable;
}
/* ────────────────────────────────────────────────────────────────────────────
   6 · Emoji as SVG — one duck, on every machine
   ──────────────────────────────────────────────────────────────────────────── */

const TWEMOJI_CDN = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15/assets/svg';
const EMOJI_RE = /\p{Extended_Pictographic}(?:️)?(?:‍\p{Extended_Pictographic}(?:️)?)*/u;

/**
 * A crisp SVG URL for an emoji, or nothing.
 *
 * Twemoji is used rather than the platform font because a classroom projector
 * shows whatever the laptop renders: one file gives the same duck everywhere.
 * Twemoji is CC BY 4.0, credited in the footer of any screen that uses it, and
 * the caller draws the original emoji as the fallback.
 */
export function twemojiSvg(emoji: string): string | null {
  const match = String(emoji || '').match(EMOJI_RE);
  if (!match) return null;
  const key = `svg:${match[0]}`;
  const hit = cached<string | null>(key);
  if (hit !== undefined) return hit;
  const code = toCodePoints(match[0]);
  if (!code) return null;
  const url = `${TWEMOJI_CDN}/${code}.svg`;
  writeCache(key, url);
  return url;
}

/** The licence line for the footer, whenever free media is on screen. */
export const TWEMOJI_CREDIT = 'Emoji art: Twemoji (CC BY 4.0) · Photos: Wikimedia Commons & Openverse';

/* ────────────────────────────────────────────────────────────────────────────
   7 · What the screen shows
   ──────────────────────────────────────────────────────────────────────────── */

/** One credit line for whatever media a lesson actually used. */
export function creditLine(photo?: KidPhoto | null): string {
  if (!photo) return TWEMOJI_CREDIT;
  const who = photo.publicDomain ? photo.title : `${photo.title} — ${photo.credit}`;
  return `${who} · ${photo.license} · Emoji art: Twemoji (CC BY 4.0)`;
}

/**
 * How much real media a screen should reach for.
 *
 * The bands differ here for a reason that is not cosmetic: a photograph is a
 * *referent*, and a two-year-old is still building the referent itself. Showing a
 * real cat is the lesson; showing a real cat to a nine-year-old who already owns
 * the concept is the reward for the seconds they spend reading the word beside it.
 * So the little ones get the picture as the primary channel and the browser voice
 * as support, while the older band gets pronunciation, IPA and photograph together,
 * because they can now hold three channels at once.
 */
export function mediaPlanFor(band: KidAgeBand): {
  photos: boolean;
  pronunciationAudio: boolean;
  showIpa: boolean;
  why: string;
} {
  return band === 'veryYoung'
    ? {
        photos: true,
        pronunciationAudio: false,
        showIpa: false,
        why: 'At 2-5 the photograph IS the word — it is the only channel doing the teaching. The browser voice carries the sound; a human recording would add latency a two-year-old cannot wait through.',
      }
    : {
        photos: true,
        pronunciationAudio: true,
        showIpa: true,
        why: 'From 5 the child can hold a word, its sound and its written form at the same time, so the lesson shows all three: the real photograph, a human recording, and the IPA that makes the sound visible.',
      };
}
/**
 * The human recording on its own — no IPA, no definition, no dictionary call.
 *
 * This exists because `fetchPronunciation` was measured taking **24 seconds**
 * end-to-end: the Lingua Libre recording arrives in ~1.8s, but the function then
 * waits on a dictionary lookup that can take 40s before it returns anything at
 * all. A screen that awaited it would leave the audio button missing for the best
 * part of a minute, which in a lesson is the whole lesson.
 *
 * So the two concerns are separate functions. A screen that only needs the voice
 * calls this one and gets it in under two seconds. A screen that also wants the
 * IPA calls `fetchPronunciation` and accepts the wait — because by then the
 * recording is already in the cache and already playing.
 */
export async function fetchVoiceOnly(word: string): Promise<KidPronunciation | null> {
  const term = searchTermFor(word);
  if (!term || term.length < 2 || BLOCKED_WORDS.has(term)) return null;

  // Reuse whatever the full fetch already banked.
  const cachedAll = cached<KidPronunciation | null>(`pron:${term}`);
  if (cachedAll && cachedAll.audioUrl) return cachedAll;

  const recording = await fetchLinguaLibre(term);
  if (!recording) return null;
  return { audioUrl: recording.url, credit: recording.credit };
}