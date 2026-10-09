/**
 * Title information — "find information about any movie or TV series".
 *
 * One official, keyed API:
 *
 *   TMDB (https://developer.themoviedb.org)  — the catalog itself: overview,
 *       tagline, genres, runtime or season/episode counts, cast and key crew,
 *       seasons, official trailers, content ratings, IMDb ids, and the
 *       JustWatch-powered `watch/providers` list of places the title is
 *       legitimately available.
 *
 * TMDB is optional: without a key the module returns `configured: false` and the
 * UI explains which environment variable unlocks it. Nothing here ever resolves a
 * playable media file — TMDB is not a distributor, so its contribution to
 * playback is *official destination links* (streaming services, free ad-supported
 * players, official YouTube channels) plus the trailers it publishes for embed.
 */

const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const TIMEOUT_MS = 12_000;

/* ─────────────────────────────── types ─────────────────────────────── */

export type TitlePerson = {
  id: number | null;
  name: string;
  /** Character played (cast) or department job (crew). */
  role: string;
  photo: string | null;
  order: number;
};

export type TitleSeason = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  poster: string | null;
  overview: string;
};

export type WatchKind = "flatrate" | "free" | "ads" | "rent" | "buy";

export type WatchOption = {
  providerName: string;
  logo: string | null;
  kind: WatchKind;
  link: string | null;
};

export type TitleTrailer = {
  name: string;
  /** Official YouTube channel upload — embeddable without any pirate middleman. */
  youtubeId: string;
  official: boolean;
  publishedAt: string | null;
};

export type ImdbBlock = {
  rating: string | null;
  votes: string | null;
  metascore: string | null;
  rated: string | null;
  awards: string | null;
  boxOffice: string | null;
  runtime: string | null;
  genre: string | null;
  director: string | null;
  actors: string | null;
  plot: string | null;
  type: string | null;
};

export type TitleInfo = {
  /** `${provider}:${externalId}`, the same id the search results use. */
  titleId: string;
  kind: "movie" | "series";
  tmdbId: number | null;
  imdbId: string | null;
  title: string;
  originalTitle: string | null;
  tagline: string | null;
  overview: string;
  releaseDate: string | null;
  status: string | null;
  originalLanguage: string | null;
  spokenLanguages: string[];
  productionCountries: string[];
  productionCompanies: string[];
  genres: string[];
  runtimeMinutes: number | null;
  seasonsCount: number | null;
  episodesCount: number | null;
  tmdbRating: number | null;
  tmdbVotes: number | null;
  contentRating: string | null;
  poster: string | null;
  backdrop: string | null;
  homepage: string | null;
  tmdbUrl: string;
  cast: TitlePerson[];
  crew: TitlePerson[];
  seasons: TitleSeason[];
  trailers: TitleTrailer[];
  /** Official availability, grouped the way JustWatch groups it. */
  watch: WatchOption[];
  /** JustWatch deep link for the region — the "where can I watch this" answer. */
  watchLink: string | null;
  /** True when at least one FREE / ad-supported official destination exists. */
  freeLegallyAvailable: boolean;
  imdb: ImdbBlock | null;
  /** Which APIs actually answered, for the UI's provenance line. */
  sources: string[];
  /** Non-fatal problems (a missing key, a TMDB hiccup). */
  notes: string[];
};

export type InfoResponse = {
  info: TitleInfo | null;
  error: string | null;
  /** Keys the deployment is missing, so the UI can name the env var to set. */
  missingKeys: string[];
};

/**
 * What the UI knows about a non-TMDB catalog entry, passed in so the same
 * information page can be shown for a public-domain copy.
 *
 * Without this, opening a Wikimedia or Internet Archive film could only say
 * "title information is only available for catalog entries" — which is exactly
 * backwards, because those are the titles this app can actually play.
 */
export type TitleHint = {
  title: string;
  year: number | null;
  kind: "movie" | "series" | null;
};

/* ────────────────────────────── credentials ────────────────────────────── */

function tmdbKey(): string | null {
  return process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || null;
}

/**
 * OMDb was removed from this build: it only added IMDb numbers, and every one of them
 * came with a "needs OMDB_API_KEY" badge that cluttered Discover for a key nobody had
 * to set. TMDB carries the ratings people actually use.
 */
export function missingApiKeys(): string[] {
  const missing: string[] = [];
  if (!tmdbKey()) missing.push("TMDB_API_KEY");
  return missing;
}

/** Region for availability lookups; TMDB returns one JustWatch block per country. */
function region(): string {
  return (process.env.TMDB_REGION || "US").toUpperCase();
}

/* ─────────────────────────────── fetchers ─────────────────────────────── */

async function tmdbJson<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = tmdbKey();
  if (!apiKey) throw new Error("TMDB_API_KEY is not set");
  const url = `${TMDB_API}${path}?${new URLSearchParams(params)}`;
  const bearer = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (bearer.ok) return (await bearer.json()) as T;
  // v3 keys are also accepted as a query parameter — try that before giving up.
  const fallback = await fetch(`${url}&api_key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!fallback.ok) throw new Error(`TMDB responded ${bearer.status}`);
  return (await fallback.json()) as T;
}


/* ────────────────────────── TMDB payload shapes ────────────────────────── */

type TmdbWatchProviders = {
  results?: Record<
    string,
    {
      link?: string;
      flatrate?: { provider_name: string; logo_path?: string | null }[];
      free?: { provider_name: string; logo_path?: string | null }[];
      ads?: { provider_name: string; logo_path?: string | null }[];
      rent?: { provider_name: string; logo_path?: string | null }[];
      buy?: { provider_name: string; logo_path?: string | null }[];
    }
  >;
};

type TmdbVideo = { name?: string; site?: string; key?: string; type?: string; official?: boolean; published_at?: string };

type TmdbSearchRow = { id: number; media_type?: string; title?: string; name?: string; release_date?: string; first_air_date?: string };

type TmdbCreditPerson = {
  id?: number;
  name?: string;
  character?: string;
  job?: string;
  profile_path?: string | null;
  order?: number;
};

type TmdbMovie = {
  id: number;
  title?: string;
  original_title?: string;
  tagline?: string | null;
  overview?: string;
  release_date?: string;
  status?: string;
  original_language?: string;
  spoken_languages?: { english_name?: string; name?: string }[];
  production_countries?: { name?: string }[];
  production_companies?: { name?: string }[];
  genres?: { name?: string }[];
  runtime?: number | null;
  vote_average?: number;
  vote_count?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  homepage?: string | null;
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
  release_dates?: { results?: { iso_3166_1?: string; release_dates?: { certification?: string }[] }[] };
  /** TV only — the per-country age rating ("TV-14"). */
  content_ratings?: { results?: { iso_3166_1?: string; rating?: string }[] };
  credits?: { cast?: TmdbCreditPerson[]; crew?: TmdbCreditPerson[] };
  aggregate_credits?: { cast?: TmdbCreditPerson[] };
  videos?: { results?: TmdbVideo[] };
  "watch/providers"?: TmdbWatchProviders;
};

type TmdbTv = TmdbMovie & {
  name?: string;
  original_name?: string;
  first_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  seasons?: { season_number?: number; name?: string; episode_count?: number; air_date?: string | null; poster_path?: string | null; overview?: string }[];
};

/* ──────────────────────────── normalisation ──────────────────────────── */

const CAST_LIMIT = 24;
const CREW_JOBS = new Set(["Director", "Screenplay", "Writer", "Story", "Original Music Composer", "Director of Photography", "Producer", "Executive Producer", "Novel", "Creator"]);

function image(path: string | null | undefined, size: "w342" | "w500" | "w780" | "w154"): string | null {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}

function normaliseWatch(payload: TmdbWatchProviders | undefined): { watch: WatchOption[]; link: string | null } {
  const entry = payload?.results?.[region()];
  if (!entry) return { watch: [], link: null };
  const groups: WatchKind[] = ["free", "ads", "flatrate", "rent", "buy"];
  const watch: WatchOption[] = [];
  const seen = new Set<string>();
  for (const kind of groups) {
    for (const provider of entry[kind] ?? []) {
      const providerName = provider.provider_name ?? "Unknown";
      const key = `${kind}:${providerName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      watch.push({ providerName, logo: image(provider.logo_path ?? null, "w154"), kind, link: entry.link ?? null });
    }
  }
  return { watch, link: entry.link ?? null };
}

function normaliseCast(people: TmdbCreditPerson[] | undefined, kind: "cast" | "crew"): TitlePerson[] {
  const list = (people ?? [])
    .filter((p) => !!p.name)
    .map((p) => ({
      id: p.id ?? null,
      name: p.name as string,
      role: (kind === "cast" ? p.character : p.job) ?? (kind === "cast" ? "Cast" : "Crew"),
      photo: image(p.profile_path ?? null, "w154"),
      order: p.order ?? 999,
    }));
  return kind === "cast" ? list.sort((a, b) => a.order - b.order).slice(0, CAST_LIMIT) : list.filter((p) => CREW_JOBS.has(p.role)).slice(0, 12);
}

function normaliseTrailers(videos: TmdbVideo[] | undefined): TitleTrailer[] {
  return (videos ?? [])
    .filter((v) => v.site === "YouTube" && !!v.key && /trailer|teaser|clip/i.test(v.type ?? "Trailer"))
    .sort((a, b) => Number(b.official ?? false) - Number(a.official ?? false))
    .slice(0, 4)
    .map((v) => ({ name: v.name ?? "Trailer", youtubeId: v.key as string, official: !!v.official, publishedAt: v.published_at ?? null }));
}

function contentRatingFrom(payload: TmdbMovie): string | null {
  const iso = region();
  const fromReleaseDates = payload.release_dates?.results?.find((r) => r.iso_3166_1 === iso)?.release_dates?.map((d) => d.certification).find((c) => !!c);
  if (fromReleaseDates) return fromReleaseDates;
  return payload.content_ratings?.results?.find((r) => r.iso_3166_1 === iso)?.rating ?? null;
}

function imdbBlockFrom(data: Record<string, unknown> | null): ImdbBlock | null {
  if (!data) return null;
  const str = (key: string): string | null => {
    const value = data[key];
    return typeof value === "string" && value !== "N/A" ? value : null;
  };
  const block: ImdbBlock = {
    rating: str("imdbRating"),
    votes: str("imdbVotes"),
    metascore: str("Metascore"),
    rated: str("Rated"),
    awards: str("Awards"),
    boxOffice: str("BoxOffice"),
    runtime: str("Runtime"),
    genre: str("Genre"),
    director: str("Director"),
    actors: str("Actors"),
    plot: str("Plot"),
    type: str("Type"),
  };
  return Object.values(block).some((v) => v !== null) ? block : null;
}

/* ───────────────────────────── public API ───────────────────────────── */

/**
 * Split a discovery id into its parts.
 *
 * The discovery provider emits `tmdb:movie:603`, while some other providers use a
 * slash (`internet-archive:some/item`), so the tail is split on EITHER separator
 * — a colon-only parser silently produced `externalId: "movie:603"` with no kind
 * and no numeric id (caught by .freebuff/tmp-meta-check.ts).
 */
export function parseTitleId(titleId: string): { providerId: string; externalId: string; kind: "movie" | "series" | null; numericId: number | null } | null {
  const sep = titleId.indexOf(":");
  if (sep < 0) return null;
  const providerId = titleId.slice(0, sep);
  const externalId = titleId.slice(sep + 1);
  const [maybeKind, maybeId] = externalId.split(/[:/]/);
  const kind = maybeKind === "movie" || maybeKind === "tv" ? (maybeKind === "tv" ? "series" : "movie") : null;
  const numericId = Number(maybeId);
  return { providerId, externalId, kind, numericId: Number.isFinite(numericId) && numericId > 0 ? numericId : null };
}

/**
 * Find the TMDB entry for a title we know only by name — used when the caller
 * opened a freely licensed copy and we still want to show cast, ratings and the
 * official destinations for the same film.
 *
 * Year proximity decides between remakes, which matters here: "Night of the
 * Living Dead" matches 1968, 1990, 2006 and 2012, and the 1968 one is the
 * public-domain film and the one with free destinations.
 */
/**
 * Reduce a real catalog title to something TMDB can match.
 *
 * Wikimedia and Internet Archive titles are written for humans and carry the
 * description inside the name — "His Girl Friday (1940) by Howard Hawks, Trailer"
 * matches nothing, while "His Girl Friday" matches immediately. Each candidate is
 * tried in order until one resolves, so the most specific interpretation wins.
 */
// Multi-word phrases are matched *without* a trailing word boundary because these
// catalogs glue the next word on: "SafetyLastHaroldLloyd1923.FullMovieexcellent…".
// Single words keep the boundary so "short" cannot truncate "shortcut".
const DESCRIPTOR = /\b((?:full|end|behind|the)\s*(?:movie|film|episode|credits|scenes)\w*|(?:trailer|teaser|official|complete|restored|remastered|remaster|version|versions|clip|clips|scene|excerpt|ending|credits|interview|documentary|short|hd|uhd|4k|1080p|720p|480p|silent|colorized)\b)[\s\S]*$/i;

/** Trailing words that qualify a title rather than name it. */
const TRAILING_QUALIFIER = /^(version|versions|edition|english|spanish|french|german|italian|portuguese|dubbed|subtitled|subs|restored|remastered|remaster|hd|uhd|4k|1080p|720p|480p|full|complete|movie|film|cut|original|colorized|extended|uncut|the|of|and|&|\d{1,4})$/i;

/** Room for a handful of readings — each one costs an API call, so keep it tight. */
const MAX_CANDIDATES = 10;

export function titleCandidates(raw: string): string[] {
  const out: string[] = [];
  const push = (value: string) => {
    const cleaned = value
      .replace(/\([^)]*\)/g, " ")
      .replace(/[_.]/g, " ") // these catalogs use underscores and dots for spaces
      .replace(/\b(19|20)\d{2}\b/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s,;:|\-–—]+|[\s,;:|\-–—]+$/g, "")
      .trim();
    if (cleaned.length >= 3 && !out.includes(cleaned)) out.push(cleaned);
  };
  /** Peel qualifying words off the end: "Metropolis English Version" → "Metropolis". */
  const trimTrailing = (value: string) => {
    let words = value.replace(/[_.]/g, " ").split(/\s+/).filter(Boolean);
    for (let i = 0; i < 6 && words.length > 1; i++) {
      const last = words[words.length - 1].replace(/[^\w&]+$/g, "");
      if (!TRAILING_QUALIFIER.test(last)) break;
      words = words.slice(0, -1);
      push(words.join(" "));
    }
  };

  // Every reading worth trying, then their descriptor-stripped forms, then trimmed.
  const variants = new Set<string>([raw]);
  for (const separator of [/\s*[|–—]\s*/, /\s*,\s*/, /\s+by\s+/i, /\s+-\s+/, /-/]) variants.add(raw.split(separator)[0]);
  // archive.org identifiers arrive run together — "HisGirlFriday 1940" and
  // "Nosferatu1922HD" are real published titles, and they match TMDB only once the
  // word boundaries inside them are restored.
  variants.add(raw.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Za-z])(\d+)/g, "$1 $2").replace(/(\d)([A-Z])/g, "$1 $2"));
  variants.add(raw.replace(/-/g, " "));
  for (const variant of [...variants]) variants.add(variant.replace(DESCRIPTOR, ""));

  for (const variant of variants) {
    push(variant);
    trimTrailing(variant);
  }
  return out.slice(0, MAX_CANDIDATES);
}

function normalizedTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function resolveTmdbId(hint: TitleHint): Promise<{ id: number; kind: "movie" | "series" } | null> {
  const yearOf = (r: TmdbSearchRow) => Number(String(r.release_date ?? r.first_air_date ?? "").slice(0, 4)) || null;
  type Candidate = { id: number; kind: "movie" | "series"; exact: boolean; yearDistance: number; relevance: number };
  const exactMatches: Candidate[] = [];
  const looseMatches: Candidate[] = [];

  for (const candidate of titleCandidates(hint.title)) {
    const data = await tmdbJson<{ results?: TmdbSearchRow[] }>("/search/multi", { query: candidate, include_adult: "false", page: "1" });
    const rows = (data.results ?? []).filter((r) => r.media_type === "movie" || r.media_type === "tv");
    const wanted = hint.kind ? rows.filter((r) => (hint.kind === "movie" ? r.media_type === "movie" : r.media_type === "tv")) : rows;

    wanted.slice(0, 8).forEach((row, relevance) => {
      const a = normalizedTitle(row.title ?? row.name ?? "");
      const b = normalizedTitle(candidate);
      if (!a || !b) return;
      const exact = a === b;
      const contains = a.includes(b) || b.includes(a);
      if (!exact && !contains) return;
      const rowYear = yearOf(row);
      const yearDistance = hint.year && rowYear ? Math.abs(rowYear - hint.year) : 0;
      const entry: Candidate = { id: row.id, kind: row.media_type === "tv" ? "series" : "movie", exact, yearDistance, relevance };
      // A title that only *contains* the query still needs the year to agree —
      // otherwise "Full Movie With Cary Grant" would drag in anything.
      if (!exact && hint.year && rowYear && yearDistance > 3) return;
      (exact ? exactMatches : looseMatches).push(entry);
    });
    // An exact title in the stated year is as good as this gets.
    if (exactMatches.some((m) => m.yearDistance <= 3)) break;
  }

  const pick = (list: Candidate[]): Candidate | null =>
    list.length
      ? [...list].sort((a, b) => a.yearDistance - b.yearDistance || a.relevance - b.relevance)[0]
      : null;

  // Prefer a match that also agrees on the year. Wikimedia and Internet Archive
  // often report the *upload* year instead of the film's (a 1940 film uploaded in
  // 2015 says 2015), so when no candidate agrees on the year the exact-title match
  // TMDB ranks highest is the better answer than no match at all.
  const chosen = pick(exactMatches.filter((m) => m.yearDistance <= 3)) ?? pick(exactMatches) ?? pick(looseMatches);
  return chosen ? { id: chosen.id, kind: chosen.kind } : null;
}

/**
 * Everything the UI needs about one title, from TMDB plus the licensed catalogs
 * exists. Throws for a malformed id; a TMDB outage is reported as an error string
 * rather than an exception so the page can still show the search results.
 *
 * `hint` lets a non-TMDB id (a Wikimedia or Internet Archive copy) resolve to the
 * matching TMDB entry, so the same page works for the films this app can play.
 */
export async function lookupTitle(titleId: string, hint?: TitleHint): Promise<InfoResponse> {
  const parsed = parseTitleId(titleId);
  const missing = missingApiKeys();
  if (!parsed) return { info: null, error: "Malformed title id", missingKeys: missing };
  if (!tmdbKey()) return { info: null, error: "TMDB_API_KEY is not set on this deployment.", missingKeys: missing };

  if (parsed.providerId !== "tmdb") {
    if (!hint?.title) {
      return { info: null, error: `No TMDB entry could be matched for this “${parsed.providerId}” item.`, missingKeys: missing };
    }
    try {
      const match = await resolveTmdbId(hint);
      if (!match) {
        return { info: null, error: `TMDB has no entry matching “${hint.title}”${hint.year ? ` (${hint.year})` : ""}.`, missingKeys: missing };
      }
      const resolved = await lookupTitle(`tmdb:${match.kind === "movie" ? "movie" : "tv"}:${match.id}`);
      if (resolved.info) resolved.info.notes.push(`Matched to the TMDB entry for “${hint.title}”${hint.year ? ` (${hint.year})` : ""} — this copy comes from ${parsed.providerId}.`);
      return resolved;
    } catch (err) {
      return { info: null, error: (err as Error).message, missingKeys: missing };
    }
  }

  if (!parsed.numericId || !parsed.kind) return { info: null, error: "Title id needs the form tmdb:movie:<id> or tmdb:tv:<id>", missingKeys: missing };

  const notes: string[] = [];
  const sources: string[] = ["TMDB"];
  const movie = parsed.kind === "movie";
  const append = movie
    ? "credits,external_ids,watch/providers,videos,release_dates"
    : "aggregate_credits,external_ids,watch/providers,videos,content_ratings,seasons";

  let payload: TmdbTv;
  try {
    payload = await tmdbJson<TmdbTv>(`/${movie ? "movie" : "tv"}/${parsed.numericId}`, { append_to_response: append, language: process.env.TMDB_LANGUAGE || "en-US" });
  } catch (err) {
    return { info: null, error: (err as Error).message, missingKeys: missing };
  }

  // IMDb ids are still read from TMDB so the information panel can link to the IMDb
  // page; the OMDb ratings lookup that used to sit here is gone.
  const imdbId = payload.imdb_id ?? payload.external_ids?.imdb_id ?? null;
  const imdb: ImdbBlock | null = null;

  const { watch, link } = normaliseWatch(payload["watch/providers"]);
  const tv = payload as TmdbTv;

  const info: TitleInfo = {
    titleId,
    kind: parsed.kind,
    tmdbId: payload.id,
    imdbId,
    title: (movie ? payload.title : tv.name) ?? "Untitled",
    originalTitle: (movie ? payload.original_title : tv.original_name) ?? null,
    tagline: payload.tagline ?? null,
    overview: payload.overview ?? "",
    releaseDate: (movie ? payload.release_date : tv.first_air_date) ?? null,
    status: payload.status ?? null,
    originalLanguage: payload.original_language ?? null,
    spokenLanguages: (payload.spoken_languages ?? []).map((l) => l.english_name ?? l.name ?? "").filter(Boolean),
    productionCountries: (payload.production_countries ?? []).map((c) => c.name ?? "").filter(Boolean),
    productionCompanies: (payload.production_companies ?? []).map((c) => c.name ?? "").filter(Boolean).slice(0, 6),
    genres: (payload.genres ?? []).map((g) => g.name ?? "").filter(Boolean),
    runtimeMinutes: movie ? (payload.runtime ?? null) : (tv.episode_run_time?.[0] ?? null),
    seasonsCount: movie ? null : (tv.number_of_seasons ?? null),
    episodesCount: movie ? null : (tv.number_of_episodes ?? null),
    tmdbRating: typeof payload.vote_average === "number" ? Number(payload.vote_average.toFixed(1)) : null,
    tmdbVotes: payload.vote_count ?? null,
    contentRating: contentRatingFrom(payload),
    poster: image(payload.poster_path ?? null, "w500"),
    backdrop: image(payload.backdrop_path ?? null, "w780"),
    homepage: payload.homepage ?? null,
    tmdbUrl: `https://www.themoviedb.org/${movie ? "movie" : "tv"}/${payload.id}`,
    cast: normaliseCast(movie ? payload.credits?.cast : (payload.aggregate_credits?.cast ?? payload.credits?.cast), "cast"),
    crew: normaliseCast(payload.credits?.crew, "crew"),
    seasons: movie
      ? []
      : (tv.seasons ?? [])
          .filter((s) => (s.season_number ?? 0) > 0)
          .map((s) => ({
            seasonNumber: s.season_number ?? 0,
            name: s.name ?? `Season ${s.season_number}`,
            episodeCount: s.episode_count ?? 0,
            airDate: s.air_date ?? null,
            poster: image(s.poster_path ?? null, "w342"),
            overview: s.overview ?? "",
          })),
    trailers: normaliseTrailers(payload.videos?.results),
    watch,
    watchLink: link,
    freeLegallyAvailable: watch.some((w) => w.kind === "free" || w.kind === "ads"),
    imdb,
    sources,
    notes,
  };

  return { info, error: null, missingKeys: missing };
}

/* The OMDb-backed `imdbSearch` fallback catalog was removed with the key it needed. */
