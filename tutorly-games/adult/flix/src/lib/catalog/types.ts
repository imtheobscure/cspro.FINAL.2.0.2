/**
 * Catalog types — "find any video, film or series, and learn what it is".
 *
 * Flix plays only media it is allowed to play: owned files, licensed uploads,
 * and first-party uploads on the platforms that host them (YouTube, Dailymotion,
 * Vimeo) through each platform's own official embed. Every other title still gets a
 * full information page and its official streaming destinations, because knowing
 * where a film legally lives is the point — and a catalogue entry with no playable
 * source must never look like a broken play button.
 *
 * The keys below are supplied by the operator in Settings (browser-only app, so
 * they live in localStorage and never leave the device).
 */

import type { MediaSource, SourceLicence } from "../../types";

export type CatalogKind = "movie" | "series" | "clip";

export type CatalogKeys = {
  /** TMDB API key (v3) — the whole catalog: search, cast, seasons, destinations. */
  tmdb: string;
  /** OMDb key — adds IMDb rating, Metascore, Rated, box office. */
  // OMDb was removed: IMDb numbers now come from TMDB, so no second key exists.
  /**
   * YouTube Data API v3 key — search of YouTube plus the embeddability check that
   * stops an unplayable video being imported. Free, but required: the API has no
   * anonymous access. Dailymotion needs no key.
   */
  youtube: string;
  /** Vimeo personal access token — optional, documentary-heavy catalog. */
  vimeo: string;
  /** ISO-3166-1 country whose availability to show (US, GB, ES…). */
  region: string;
};

export const EMPTY_CATALOG_KEYS: CatalogKeys = { tmdb: "", youtube: "", vimeo: "", region: "US" };

export type CatalogPerson = { name: string; role: string; photo: string | null };

export type CatalogSeason = { seasonNumber: number; name: string; episodeCount: number; airDate: string | null };

export type WatchKind = "free" | "ads" | "flatrate" | "rent" | "buy";

export type CatalogWatch = { provider: string; logo: string | null; kind: WatchKind; link: string | null };

export type CatalogTrailer = { name: string; youtubeId: string; official: boolean };

export type CatalogSubtitle = {
  language: string;
  label: string;
  url: string;
  format: "vtt" | "srt" | "ass";
};

export type CatalogImdb = {
  rating: string | null;
  votes: string | null;
  metascore: string | null;
  rated: string | null;
  awards: string | null;
  boxOffice: string | null;
  runtime: string | null;
};

export type CatalogTitle = {
  /** `${providerId}:${externalId}` */
  id: string;
  providerId: "tmdb" | "youtube" | "dailymotion" | "vimeo";
  providerLabel: string;
  externalId: string;
  kind: CatalogKind;
  title: string;
  year: number | null;
  overview: string;
  tagline: string | null;
  poster: string | null;
  backdrop: string | null;
  runtimeMinutes: number | null;
  seasonsCount: number | null;
  episodesCount: number | null;
  genres: string[];
  cast: CatalogPerson[];
  crew: CatalogPerson[];
  tmdbRating: number | null;
  tmdbVotes: number | null;
  imdb: CatalogImdb | null;
  imdbId: string | null;
  contentRating: string | null;
  trailers: CatalogTrailer[];
  watch: CatalogWatch[];
  watchLink: string | null;
  seasons: CatalogSeason[];
  /** Licence of the playable copy, when there is one. */
  licence: SourceLicence;
  licenceLabel: string;
  licenceUrl: string | null;
  attribution: string;
  /** Playable copies. Empty for metadata-only titles. */
  sources: MediaSource[];
  subtitles: CatalogSubtitle[];
  /** Where to read more (TMDB page, archive.org details page, Commons file page). */
  externalUrl: string | null;
  popularity: number;
  durationSeconds: number | null;
};

export type CatalogStatus = {
  id: "tmdb" | "youtube" | "dailymotion" | "vimeo";
  label: string;
  configured: boolean;
  needsKey: boolean;
  note: string;
  reachable: boolean | null;
  /** What this source is allowed to do in the library. */
  role: "catalog" | "ratings" | "playable";
};

export function parseYear(value: unknown): number | null {
  const n = Number(String(value ?? "").slice(0, 4));
  return Number.isFinite(n) && n > 1880 && n < 2200 ? n : null;
}

export function normaliseTitleKey(title: string, year: number | null): string {
  return `${title.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim()}|${year ?? ""}`;
}

export const WATCH_LABEL: Record<WatchKind, string> = {
  free: "Free",
  ads: "Free with ads",
  flatrate: "Included with a subscription",
  rent: "Rent",
  buy: "Buy",
};

/** Split `tmdb:movie:603` and `youtube:dQw4w9WgXcQ` into their parts. */
export function parseCatalogId(id: string): { providerId: string; externalId: string; kind: "movie" | "series" | null; numericId: number | null } | null {
  const sep = id.indexOf(":");
  if (sep < 0) return null;
  const providerId = id.slice(0, sep);
  const externalId = id.slice(sep + 1);
  const [maybeKind, maybeId] = externalId.split(/[:/]/);
  const kind = maybeKind === "movie" ? "movie" : maybeKind === "tv" ? "series" : null;
  const numericId = Number(maybeId);
  return { providerId, externalId, kind, numericId: Number.isFinite(numericId) && numericId > 0 ? numericId : null };
}
