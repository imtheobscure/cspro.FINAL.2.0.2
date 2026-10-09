import { decodeMaybeCompressed } from "./archive";

/**
 * Subtitle search across every source the platform is allowed to use.
 *
 *   • OpenSubtitles REST (official API key, optional account for downloads)
 *   • Subdl         (official API key)
 *   • Wyzie Subs    (free aggregator key)
 *   • archive.org   (keyless: the caption files published with the very item the
 *                    episode was imported from)
 *
 * The manual path (paste, upload a file, or point at a URL) lives in the UI and is
 * handled by `/api/subtitles/import`, so a learner is never stuck without options.
 */

export type SubtitleProviderId = "opensubtitles" | "subdl" | "wyzie";

export type SubtitleSearchResult = {
  /** `${provider}:${providerRef}` — what `/api/subtitles/fetch` needs. */
  id: string;
  provider: SubtitleProviderId;
  providerName: string;
  providerRef: string;
  language: string;
  languageLabel: string;
  title: string;
  release: string | null;
  format: string;
  hearingImpaired: boolean;
  /** Machine translation or automatic captions — flagged for learners. */
  automatic: boolean;
  downloads: number | null;
  rating: number | null;
  url: string | null;
  note: string | null;
};

export type SubtitleProviderStatus = {
  id: SubtitleProviderId;
  name: string;
  configured: boolean;
  requiresEnv?: string;
  note: string;
  reachable?: boolean;
};

export type SubtitleQuery = {
  query: string;
  /** Used when a provider keys off ids rather than free text. */
  imdbId?: string | null;
  tmdbId?: string | null;
  season?: number | null;
  episode?: number | null;
  languages?: string[];
  limit?: number;
};

export interface SubtitleProvider {
  id: SubtitleProviderId;
  name: string;
  requiresEnv?: string;
  note: string;
  configured(): boolean;
  search(q: SubtitleQuery): Promise<SubtitleSearchResult[]>;
  /** Returns the raw subtitle text, already decompressed. */
  download(result: SubtitleSearchResult): Promise<{ text: string; filename: string }>;
}

const UA = "Tutoflix/2.0 (+https://tutoflix.app)";
const TIMEOUT_MS = 15_000;
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  tr: "Turkish",
  ar: "Arabic",
  fa: "Persian",
  hi: "Hindi",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  cs: "Czech",
  el: "Greek",
  he: "Hebrew",
  ro: "Romanian",
  hu: "Hungarian",
  uk: "Ukrainian",
};

export function languageLabel(code: string): string {
  return LANGUAGE_LABELS[code.slice(0, 2).toLowerCase()] ?? code.toUpperCase();
}

async function get(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { "User-Agent": UA, Accept: "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
}

/* ------------------------------------------------------------------ */
/* OpenSubtitles                                                       */
/* ------------------------------------------------------------------ */

const OS_BASE = "https://api.opensubtitles.com/api/v1";
let osToken: { value: string; expiresAt: number } | null = null;

const opensubtitles: SubtitleProvider = {
  id: "opensubtitles",
  name: "OpenSubtitles",
  requiresEnv: "OPENSUBTITLES_API_KEY",
  note: "The largest subtitle database. Needs a free API key; add OPENSUBTITLES_USERNAME/PASSWORD to fetch download links.",

  configured() {
    return !!process.env.OPENSUBTITLES_API_KEY;
  },

  async search(q) {
    const params = new URLSearchParams({ languages: (q.languages ?? ["en"]).join(","), order_by: "download_count", order_direction: "desc" });
    if (q.tmdbId) params.set(q.season ? "parent_tmdb_id" : "tmdb_id", q.tmdbId);
    else if (q.imdbId) params.set(q.season ? "parent_imdb_id" : "imdb_id", q.imdbId.replace(/^tt/, ""));
    else params.set("query", q.query);
    params.set("type", q.season ? "episode" : "movie");
    if (q.season) params.set("season_number", String(q.season));
    if (q.episode) params.set("episode_number", String(q.episode));

    const res = await get(`${OS_BASE}/subtitles?${params}`, { headers: { "Api-Key": process.env.OPENSUBTITLES_API_KEY! } });
    if (!res.ok) throw new Error(`OpenSubtitles responded ${res.status}`);
    const body = (await res.json()) as {
      data?: {
        id: string;
        attributes?: {
          language?: string;
          download_count?: number;
          ratings?: number;
          hearing_impaired?: boolean;
          foreign_parts_only?: boolean;
          machine_translated?: boolean;
          ai_translated?: boolean;
          release?: string;
          files?: { file_id: number; file_name?: string }[];
          feature_details?: { title?: string; movie_name?: string; year?: number };
        };
      }[];
    };
    return (body.data ?? []).slice(0, q.limit ?? 20).map((row) => {
      const a = row.attributes ?? {};
      const language = (a.language ?? "en").slice(0, 2);
      return {
        id: `opensubtitles:${a.files?.[0]?.file_id ?? row.id}`,
        provider: "opensubtitles" as const,
        providerName: "OpenSubtitles",
        providerRef: String(a.files?.[0]?.file_id ?? row.id),
        language,
        languageLabel: languageLabel(language),
        title: a.feature_details?.title ?? a.feature_details?.movie_name ?? q.query,
        release: a.release ?? a.files?.[0]?.file_name ?? null,
        format: "srt",
        hearingImpaired: !!a.hearing_impaired,
        automatic: !!(a.machine_translated || a.ai_translated),
        downloads: a.download_count ?? null,
        rating: a.ratings ?? null,
        url: null,
        note: a.foreign_parts_only ? "Foreign parts only" : null,
      } satisfies SubtitleSearchResult;
    });
  },

  async download(result) {
    const apiKey = process.env.OPENSUBTITLES_API_KEY;
    if (!apiKey) throw new Error("OpenSubtitles API key is not configured");
    let token: string | undefined;
    if (process.env.OPENSUBTITLES_USERNAME && process.env.OPENSUBTITLES_PASSWORD) token = await login();
    const res = await fetch(`${OS_BASE}/download`, {
      method: "POST",
      headers: { "Api-Key": apiKey, "Content-Type": "application/json", "User-Agent": UA, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ file_id: Number(result.providerRef), sub_format: "srt" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`OpenSubtitles download failed (${res.status}). Download endpoints require a free account token.`);
    const body = (await res.json()) as { link?: string; file_name?: string };
    if (!body.link) throw new Error("OpenSubtitles returned no download link");
    const file = await fetch(body.link, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
    if (!file.ok) throw new Error(`OpenSubtitles file responded ${file.status}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const decoded = decodeMaybeCompressed(buffer, body.file_name ?? "");
    if (!decoded) throw new Error("OpenSubtitles file format is not supported");
    return decoded;
  },
};

async function login(): Promise<string> {
  if (osToken && osToken.expiresAt > Date.now() + 60_000) return osToken.value;
  const res = await fetch(`${OS_BASE}/login`, {
    method: "POST",
    headers: { "Api-Key": process.env.OPENSUBTITLES_API_KEY!, "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ username: process.env.OPENSUBTITLES_USERNAME, password: process.env.OPENSUBTITLES_PASSWORD }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`OpenSubtitles login failed (${res.status})`);
  const body = (await res.json()) as { token: string };
  osToken = { value: body.token, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
  return body.token;
}

/* ------------------------------------------------------------------ */
/* Subdl                                                               */
/* ------------------------------------------------------------------ */

const subdl: SubtitleProvider = {
  id: "subdl",
  name: "Subdl",
  requiresEnv: "SUBDL_API_KEY",
  note: "Large community database with per-release matches. Needs a free API key.",

  configured() {
    return !!process.env.SUBDL_API_KEY;
  },

  async search(q) {
    const params = new URLSearchParams({
      api_key: process.env.SUBDL_API_KEY!,
      languages: (q.languages ?? ["EN"]).map((l) => l.toUpperCase()).join(","),
      type: q.season ? "tv" : "movie",
      subs_per_page: String(q.limit ?? 20),
    });
    if (q.imdbId) params.set("imdb_id", q.imdbId.replace(/^tt/, ""));
    else params.set("film_name", q.query);
    if (q.season) {
      params.set("season_number", String(q.season));
      if (q.episode) params.set("episode_number", String(q.episode));
    }
    const res = await get(`https://api.subdl.com/api/v1/subtitles?${params}`);
    if (!res.ok) throw new Error(`Subdl responded ${res.status}`);
    const body = (await res.json()) as {
      status?: boolean;
      subtitles?: { name?: string; language?: string; release_name?: string; url?: string; hi?: boolean; author?: string }[];
    };
    if (body.status === false) throw new Error("Subdl rejected the request (check SUBDL_API_KEY)");
    return (body.subtitles ?? []).map((row) => {
      const language = (row.language ?? "en").slice(0, 2).toLowerCase();
      return {
        id: `subdl:${row.url ?? row.name}`,
        provider: "subdl" as const,
        providerName: "Subdl",
        providerRef: row.url ?? "",
        language,
        languageLabel: languageLabel(language),
        title: row.name ?? q.query,
        release: row.release_name ?? null,
        format: /\.zip$/i.test(row.url ?? "") ? "zip" : "srt",
        hearingImpaired: !!row.hi,
        automatic: false,
        downloads: null,
        rating: null,
        url: row.url ? `https://dl.subdl.com${row.url}` : null,
        note: row.author ? `by ${row.author}` : null,
      } satisfies SubtitleSearchResult;
    });
  },

  async download(result) {
    if (!result.url) throw new Error("This Subdl result has no download link");
    const res = await fetch(result.url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Subdl download responded ${res.status}`);
    const decoded = decodeMaybeCompressed(Buffer.from(await res.arrayBuffer()), result.url);
    if (!decoded) throw new Error("Subdl archive format is not supported");
    return decoded;
  },
};

/* ------------------------------------------------------------------ */
/* Wyzie Subs                                                          */
/* ------------------------------------------------------------------ */

const wyzie: SubtitleProvider = {
  id: "wyzie",
  name: "Wyzie Subs",
  requiresEnv: "WYZIE_API_KEY",
  note: "Free aggregator that queries several databases at once. Needs a free key.",

  configured() {
    return !!process.env.WYZIE_API_KEY;
  },

  async search(q) {
    const languages = (q.languages ?? ["en"]).map((l) => l.slice(0, 2).toLowerCase());
    const results: SubtitleSearchResult[] = [];
    for (const language of languages.slice(0, 3)) {
      const params = new URLSearchParams({ key: process.env.WYZIE_API_KEY!, language });
      if (q.tmdbId) params.set("tmdb_id", q.tmdbId);
      else if (q.imdbId) params.set("id", q.imdbId);
      else params.set("query", q.query);
      if (q.season) params.set("season", String(q.season));
      if (q.episode) params.set("episode", String(q.episode));
      const res = await get(`https://sub.wyzie.io/search?${params}`);
      if (!res.ok) continue;
      const body = (await res.json()) as
        | { id?: string; url?: string; display?: string; format?: string; source?: string; language?: string; isHearingImpaired?: boolean; isMachineTranslated?: boolean }[]
        | { subtitles?: unknown };
      const list = Array.isArray(body) ? body : [];
      for (const row of list.slice(0, q.limit ?? 20)) {
        if (!row.url) continue;
        const lang = (row.language ?? language).slice(0, 2).toLowerCase();
        results.push({
          id: `wyzie:${row.id ?? row.url}`,
          provider: "wyzie",
          providerName: "Wyzie Subs",
          providerRef: row.url,
          language: lang,
          languageLabel: languageLabel(lang),
          title: row.display ?? q.query,
          release: row.source ?? null,
          format: (row.format ?? "srt").toLowerCase(),
          hearingImpaired: !!row.isHearingImpaired,
          automatic: !!row.isMachineTranslated || /auto/i.test(row.source ?? ""),
          downloads: null,
          rating: null,
          url: row.url,
          note: row.source ?? null,
        });
      }
    }
    return results;
  },

  async download(result) {
    const url = result.url ?? result.providerRef;
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Wyzie download responded ${res.status}`);
    const decoded = decodeMaybeCompressed(Buffer.from(await res.arrayBuffer()), url);
    if (!decoded) throw new Error("Wyzie file format is not supported");
    return decoded;
  },
};

export const SUBTITLE_PROVIDERS: SubtitleProvider[] = [opensubtitles, subdl, wyzie];

export function subtitleProviderById(id: string): SubtitleProvider | null {
  return SUBTITLE_PROVIDERS.find((p) => p.id === id) ?? null;
}

export function subtitleProviderStatuses(): SubtitleProviderStatus[] {
  return SUBTITLE_PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    configured: p.configured(),
    requiresEnv: p.requiresEnv,
    note: p.note,
  }));
}

/** Searches the selected providers in parallel; a failing provider never blocks the rest. */
export async function searchSubtitles(q: SubtitleQuery & { providers?: string[] }): Promise<{ results: SubtitleSearchResult[]; errors: { provider: string; message: string }[] }> {
  const selected = q.providers?.length ? SUBTITLE_PROVIDERS.filter((p) => q.providers!.includes(p.id)) : SUBTITLE_PROVIDERS;
  const errors: { provider: string; message: string }[] = [];
  const settled = await Promise.all(
    selected.map(async (p) => {
      if (!p.configured()) return [] as SubtitleSearchResult[];
      try {
        return await p.search(q);
      } catch (err) {
        errors.push({ provider: p.id, message: (err as Error).message });
        return [] as SubtitleSearchResult[];
      }
    }),
  );
  const results = settled.flat().sort((a, b) => {
    const byLanguage = a.language.localeCompare(b.language);
    if (byLanguage) return byLanguage;
    return (b.downloads ?? 0) - (a.downloads ?? 0);
  });
  return { results, errors };
}
