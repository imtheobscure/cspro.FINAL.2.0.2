import type { QualityOption } from "@/db/schema";

/**
 * Catalog discovery: one normalized shape for anything a provider can find,
 * whether it is freely playable (public domain / Creative Commons) or only
 * resolvable to an official destination the learner can open.
 *
 * Authorization is a first-class field: every source carries the license it was
 * published under, and nothing without a license is ever offered for playback.
 */
export type AuthorizationType = "OWNED" | "LICENSED" | "PUBLIC_DOMAIN" | "CREATIVE_COMMONS" | "OFFICIAL_API" | "OFFICIAL_EMBED";

export type DiscoverSourceKind = "mp4" | "webm" | "ogv" | "hls" | "dash" | "embed";

export type DiscoverSource = {
  providerId: string;
  providerName: string;
  label: string;
  url: string;
  kind: DiscoverSourceKind;
  quality: string;
  width: number | null;
  height: number | null;
  bitrate: number | null;
  qualities: QualityOption[];
  authorizationType: AuthorizationType;
  licenseLabel: string;
  licenseUrl: string | null;
  downloadable: boolean;
  /** Playable inside the player, as opposed to an official embed/redirect. */
  playable: boolean;
};

export type DiscoverSubtitle = {
  language: string;
  label: string;
  url: string;
  format: "vtt" | "srt" | "ass" | "unknown";
  provider: string;
};

export type DiscoverTitle = {
  /** `${provider}:${externalId}` — stable across searches, used for import + dedupe. */
  id: string;
  providerId: string;
  providerName: string;
  externalId: string;
  kind: "movie" | "series" | "episode" | "clip" | "other";
  title: string;
  year: number | null;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  duration: number | null;
  language: string | null;
  licenseLabel: string;
  licenseUrl: string | null;
  authorizationType: AuthorizationType;
  attribution: string;
  availability: "FREE" | "SUBSCRIPTION" | "RENT" | "EXTERNAL";
  externalUrl: string | null;
  /** Prominence signal from the provider (downloads, views, rating). */
  popularity: number;
  sources: DiscoverSource[];
  subtitles: DiscoverSubtitle[];
  /** Set when the title has already been added to the local library. */
  inLibrary: { episodeId: string; title: string } | null;
  /** Populated when another provider can supply the playback sources (TMDB → archives). */
  resolvableVia: string | null;
};

export type ProviderStatus = {
  id: string;
  name: string;
  authorizationType: AuthorizationType;
  configured: boolean;
  /** Environment variable a developer must set to activate the provider. */
  requiresEnv?: string;
  note: string;
  reachable?: boolean;
};

export type DiscoverSearchOptions = {
  query: string;
  kind?: "any" | "movie" | "series" | "clip";
  providers?: string[];
  language?: string | null;
  limit?: number;
};

export type SearchResponse = {
  query: string;
  titles: DiscoverTitle[];
  providers: ProviderStatus[];
  errors: { provider: string; message: string }[];
  /** True when a metadata-only provider matched but no playable copy exists. */
  metadataOnly: number;
};

/**
 * The provider contract. `search` never throws for a missing key or a dead
 * network — it reports `configured: false` / an empty result and the service
 * layer surfaces that, so one broken catalog never blanks the page.
 */
export interface VideoProvider {
  id: string;
  name: string;
  authorizationType: AuthorizationType;
  licenseUrl: string | null;
  /** Env var that unlocks the provider, if any. */
  requiresEnv?: string;
  note: string;
  configured(): boolean;
  search(opts: DiscoverSearchOptions): Promise<DiscoverTitle[]>;
  /** Re-resolves playback sources for a known item (used at import time). */
  resolveSources(externalId: string): Promise<{ sources: DiscoverSource[]; subtitles: DiscoverSubtitle[] }>;
  /**
   * Full metadata for one item by id — needed when a title is opened outside a
   * search result (a library row, a deep link), where there is nothing else to
   * read the title, poster or duration from. Optional: a provider without a
   * by-id endpoint falls back to the id-shaped stub `resolveTitle` builds.
   */
  detail?(externalId: string): Promise<DiscoverTitle | null>;
  status(): Promise<ProviderStatus>;
}

export function kindFromText(value: string | undefined | null): DiscoverTitle["kind"] {
  const v = (value ?? "").toLowerCase();
  if (v.includes("series") || v.includes("tv")) return "series";
  if (v.includes("movie") || v.includes("film")) return "movie";
  if (v.includes("clip") || v.includes("short")) return "clip";
  if (v.includes("episode")) return "episode";
  return "other";
}

export function parseYear(value: unknown): number | null {
  const n = Number(String(value ?? "").slice(0, 4));
  return Number.isFinite(n) && n > 1880 && n < 2200 ? n : null;
}

export function normalizeTitleKey(title: string, year: number | null): string {
  return `${title
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()}|${year ?? ""}`;
}
