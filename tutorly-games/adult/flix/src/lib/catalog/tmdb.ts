/**
 * TMDB — every movie and TV series, from the browser.
 *
 * This is the catalog half of the platform: search anything, then see its cast,
 * crew, genres, runtime or season list, official trailers, and the official
 * destinations the title streams on in the operator's region (TMDB publishes
 * JustWatch's availability data).
 *
 * It never returns a playable media file — TMDB is not a distributor. Playback
 * comes from the licensed catalogs (archive.ts / wikimedia.ts), and for any other
 * title the honest answer is the official destination link.
 */

import type { CatalogKeys, CatalogPerson, CatalogSeason, CatalogTitle, CatalogTrailer, CatalogWatch, WatchKind } from "./types";
import { parseYear } from "./types";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const TIMEOUT_MS = 12_000;

type TmdbResult = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
};

type TmdbDetail = TmdbResult & {
  original_title?: string;
  original_name?: string;
  tagline?: string | null;
  status?: string;
  genres?: { name?: string }[];
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  homepage?: string | null;
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
  release_dates?: { results?: { iso_3166_1?: string; release_dates?: { certification?: string }[] }[] };
  content_ratings?: { results?: { iso_3166_1?: string; rating?: string }[] };
  credits?: { cast?: { id?: number; name?: string; character?: string; job?: string; profile_path?: string | null; order?: number }[]; crew?: { id?: number; name?: string; character?: string; job?: string; profile_path?: string | null; order?: number }[] };
  aggregate_credits?: { cast?: { id?: number; name?: string; character?: string; profile_path?: string | null; order?: number }[] };
  videos?: { results?: { name?: string; site?: string; key?: string; type?: string; official?: boolean }[] };
  seasons?: { season_number?: number; name?: string; episode_count?: number; air_date?: string | null }[];
  "watch/providers"?: {
    results?: Record<string, { link?: string; flatrate?: Provider[]; free?: Provider[]; ads?: Provider[]; rent?: Provider[]; buy?: Provider[] }>;
  };
};

type Provider = { provider_name?: string; logo_path?: string | null };

async function tmdb<T>(path: string, key: string, params: Record<string, string> = {}): Promise<T> {
  if (!key) throw new Error("Add your TMDB API key in Settings to search the full catalog");
  const url = `${API}${path}?${new URLSearchParams(params)}`;
  // The v3 key can go in the query string or as a bearer token; try the header
  // first (works for both v3 and v4 keys) and fall back to the parameter.
  const withBearer = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (withBearer.ok) return (await withBearer.json()) as T;
  const withParam = await fetch(`${url}&api_key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!withParam.ok) throw new Error(`TMDB responded ${withBearer.status}`);
  return (await withParam.json()) as T;
}

function image(path: string | null | undefined, size: string): string | null {
  return path ? `${IMG}/${size}${path}` : null;
}

const CREW_JOBS = new Set(["Director", "Screenplay", "Writer", "Story", "Original Music Composer", "Producer", "Novel", "Creator"]);

function toPeople(list: TmdbDetail["credits"] extends undefined ? never : NonNullable<TmdbDetail["credits"]>["cast"], kind: "cast" | "crew", limit: number): CatalogPerson[] {
  const people = (list ?? [])
    .filter((p) => !!p.name)
    .map((p) => ({ name: p.name as string, role: (kind === "cast" ? p.character : p.job) ?? (kind === "cast" ? "Cast" : "Crew"), photo: image(p.profile_path, "w154"), order: p.order ?? 999 }));
  return kind === "cast" ? people.sort((a, b) => a.order - b.order).slice(0, limit).map(({ name, role, photo }) => ({ name, role, photo })) : people.filter((p) => CREW_JOBS.has(p.role)).slice(0, limit).map(({ name, role, photo }) => ({ name, role, photo }));
}

function watchFrom(payload: TmdbDetail["watch/providers"], region: string): { watch: CatalogWatch[]; link: string | null } {
  const entry = payload?.results?.[region.toUpperCase()];
  if (!entry) return { watch: [], link: null };
  const groups: WatchKind[] = ["free", "ads", "flatrate", "rent", "buy"];
  const watch: CatalogWatch[] = [];
  for (const kind of groups) {
    for (const provider of entry[kind] ?? []) {
      if (!provider.provider_name) continue;
      watch.push({ provider: provider.provider_name, logo: image(provider.logo_path, "w92"), kind, link: entry.link ?? null });
    }
  }
  return { watch, link: entry.link ?? null };
}

function ratingFrom(payload: TmdbDetail, region: string): string | null {
  return (
    payload.release_dates?.results?.find((r) => r.iso_3166_1 === region.toUpperCase())?.release_dates?.map((d) => d.certification).find((c) => !!c) ??
    payload.content_ratings?.results?.find((r) => r.iso_3166_1 === region.toUpperCase())?.rating ??
    null
  );
}

/** Search movies, series or both. Metadata only — `sources` stays empty. */
export async function tmdbSearch(query: string, kind: "any" | "movie" | "series", keys: CatalogKeys, limit = 12): Promise<CatalogTitle[]> {
  const data = await tmdb<{ results?: TmdbResult[] }>("/search/multi", keys.tmdb, { query, include_adult: "false", page: "1" });
  const wanted = (data.results ?? []).filter((r) => r.media_type === "movie" || r.media_type === "tv");
  const filtered = kind === "movie" ? wanted.filter((r) => r.media_type === "movie") : kind === "series" ? wanted.filter((r) => r.media_type === "tv") : wanted;
  return filtered.slice(0, limit).map((r) => {
    const isMovie = r.media_type === "movie";
    return {
      id: `tmdb:${isMovie ? "movie" : "tv"}:${r.id}`,
      providerId: "tmdb" as const,
      providerLabel: "TMDB",
      externalId: `${isMovie ? "movie" : "tv"}:${r.id}`,
      kind: (isMovie ? "movie" : "series") as CatalogTitle["kind"],
      title: r.title ?? r.name ?? "Untitled",
      year: parseYear(r.release_date ?? r.first_air_date),
      overview: r.overview ?? "",
      tagline: null,
      poster: image(r.poster_path, "w342"),
      backdrop: image(r.backdrop_path, "w780"),
      runtimeMinutes: null,
      seasonsCount: null,
      episodesCount: null,
      genres: [],
      cast: [],
      crew: [],
      tmdbRating: typeof r.vote_average === "number" ? Number(r.vote_average.toFixed(1)) : null,
      tmdbVotes: r.vote_count ?? null,
      imdb: null,
      imdbId: null,
      contentRating: null,
      trailers: [],
      watch: [],
      watchLink: null,
      seasons: [],
      licence: "official-embed" as const,
      licenceLabel: "Metadata © TMDB · official availability",
      licenceUrl: "https://www.themoviedb.org/documentation/api/terms-of-use",
      attribution: "Metadata from TMDB",
      sources: [],
      subtitles: [],
      externalUrl: `https://www.themoviedb.org/${isMovie ? "movie" : "tv"}/${r.id}`,
      popularity: r.popularity ?? 0,
      durationSeconds: null,
    } satisfies CatalogTitle;
  });
}

/** Full information for one TMDB title id (`tmdb:movie:603`). */
export async function tmdbInfo(id: string, keys: CatalogKeys): Promise<CatalogTitle> {
  const match = /^tmdb:(movie|tv):(\d+)$/.exec(id);
  if (!match) throw new Error("Not a TMDB title id");
  const [, mediaType, numericId] = match;
  const isMovie = mediaType === "movie";
  const append = isMovie ? "credits,external_ids,watch/providers,videos,release_dates" : "aggregate_credits,external_ids,watch/providers,videos,content_ratings,seasons";
  const payload = await tmdb<TmdbDetail>(`/${mediaType}/${numericId}`, keys.tmdb, { append_to_response: append });
  const { watch, link } = watchFrom(payload["watch/providers"], keys.region || "US");

  const trailers: CatalogTrailer[] = (payload.videos?.results ?? [])
    .filter((v) => v.site === "YouTube" && !!v.key && /trailer|teaser|clip/i.test(v.type ?? "Trailer"))
    .sort((a, b) => Number(b.official ?? false) - Number(a.official ?? false))
    .slice(0, 4)
    .map((v) => ({ name: v.name ?? "Trailer", youtubeId: v.key as string, official: !!v.official }));

  const seasons: CatalogSeason[] = isMovie
    ? []
    : (payload.seasons ?? [])
        .filter((s) => (s.season_number ?? 0) > 0)
        .map((s) => ({ seasonNumber: s.season_number ?? 0, name: s.name ?? `Season ${s.season_number}`, episodeCount: s.episode_count ?? 0, airDate: s.air_date ?? null }));

  return {
    id,
    providerId: "tmdb",
    providerLabel: "TMDB",
    externalId: `${mediaType}:${numericId}`,
    kind: isMovie ? "movie" : "series",
    title: (isMovie ? payload.title : payload.name) ?? "Untitled",
    year: parseYear(isMovie ? payload.release_date : payload.first_air_date),
    overview: payload.overview ?? "",
    tagline: payload.tagline ?? null,
    poster: image(payload.poster_path, "w500"),
    backdrop: image(payload.backdrop_path, "w780"),
    runtimeMinutes: isMovie ? (payload.runtime ?? null) : (payload.episode_run_time?.[0] ?? null),
    seasonsCount: isMovie ? null : (payload.number_of_seasons ?? null),
    episodesCount: isMovie ? null : (payload.number_of_episodes ?? null),
    genres: (payload.genres ?? []).map((g) => g.name ?? "").filter(Boolean),
    cast: toPeople(isMovie ? payload.credits?.cast : (payload.aggregate_credits?.cast ?? payload.credits?.cast), "cast", 24),
    crew: toPeople(payload.credits?.crew, "crew", 12),
    tmdbRating: typeof payload.vote_average === "number" ? Number(payload.vote_average.toFixed(1)) : null,
    tmdbVotes: payload.vote_count ?? null,
    imdb: null,
    imdbId: payload.imdb_id ?? payload.external_ids?.imdb_id ?? null,
    contentRating: ratingFrom(payload, keys.region || "US"),
    trailers,
    watch,
    watchLink: link,
    seasons,
    licence: "official-embed",
    licenceLabel: "Metadata © TMDB · official availability",
    licenceUrl: "https://www.themoviedb.org/documentation/api/terms-of-use",
    attribution: `Metadata from TMDB${watch.length ? ` · streaming on ${watch.slice(0, 3).map((w) => w.provider).join(", ")}` : ""}`,
    sources: [],
    subtitles: [],
    externalUrl: `https://www.themoviedb.org/${mediaType}/${numericId}`,
    popularity: payload.popularity ?? 0,
    durationSeconds: null,
  };
}

/** Is the key usable? (A cheap configuration call, used by the status strip.) */
export async function tmdbReachable(key: string): Promise<boolean> {
  try {
    await tmdb("/configuration", key);
    return true;
  } catch {
    return false;
  }
}
