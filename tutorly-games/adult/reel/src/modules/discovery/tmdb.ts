import { kindFromText, parseYear, type DiscoverSearchOptions, type DiscoverSource, type DiscoverTitle, type ProviderStatus, type VideoProvider } from "./types";

/**
 * TMDB — metadata for *any* movie or TV series, via the official API.
 *
 * This provider deliberately never returns a playable source: TMDB is not a
 * distributor. It answers "does this title exist, what is it, where can I watch it
 * legitimately", and the discovery service cross-matches its results against the
 * freely licensed catalogs so a learner who searches a famous film gets either a
 * playable public-domain copy or an official destination link — never a pirate
 * stream.
 */
const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const TIMEOUT_MS = 10_000;

type TmdbResult = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  popularity?: number;
  adult?: boolean;
};

type WatchProviders = {
  results?: Record<string, { link?: string; flatrate?: { provider_name: string }[]; free?: { provider_name: string }[]; ads?: { provider_name: string }[]; rent?: { provider_name: string }[] }>;
};

function key(): string | null {
  return process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || null;
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = key();
  if (!apiKey) throw new Error("TMDB_API_KEY is not set");
  const url = `${API}${path}?${new URLSearchParams({ ...params })}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // v3 keys can also be passed as a query parameter.
    const fallback = await fetch(`${url}&api_key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!fallback.ok) throw new Error(`TMDB responded ${res.status}`);
    return (await fallback.json()) as T;
  }
  return (await res.json()) as T;
}

export const tmdbProvider: VideoProvider = {
  id: "tmdb",
  name: "TMDB (metadata + official availability)",
  authorizationType: "OFFICIAL_API",
  licenseUrl: "https://www.themoviedb.org/documentation/api/terms-of-use",
  requiresEnv: "TMDB_API_KEY",
  note: "Searches every movie and TV series for metadata, then points to the official streaming destinations. Set TMDB_API_KEY to enable.",

  configured() {
    return !!key();
  },

  async status(): Promise<ProviderStatus> {
    if (!this.configured())
      return { id: this.id, name: this.name, authorizationType: this.authorizationType, configured: false, requiresEnv: this.requiresEnv, note: this.note, reachable: false };
    try {
      await tmdb("/configuration");
      return { id: this.id, name: this.name, authorizationType: this.authorizationType, configured: true, requiresEnv: this.requiresEnv, note: this.note, reachable: true };
    } catch {
      return { id: this.id, name: this.name, authorizationType: this.authorizationType, configured: true, requiresEnv: this.requiresEnv, note: this.note, reachable: false };
    }
  },

  async search(opts: DiscoverSearchOptions): Promise<DiscoverTitle[]> {
    if (!this.configured()) return [];
    const limit = Math.min(opts.limit ?? 12, 20);
    const data = await tmdb<{ results?: TmdbResult[] }>("/search/multi", {
      query: opts.query,
      include_adult: "false",
      language: opts.language || "en-US",
      page: "1",
    });
    const results = (data.results ?? []).filter((r) => r.media_type === "movie" || r.media_type === "tv").slice(0, limit);

    const titles = await Promise.all(
      results.map(async (r) => {
        const kind = r.media_type === "tv" ? ("series" as const) : kindFromText("movie");
        const name = r.title ?? r.name ?? "Untitled";
        const year = parseYear(r.release_date ?? r.first_air_date);
        const official = await officialDestination(r).catch(() => null);
        return {
          id: `tmdb:${r.media_type}:${r.id}`,
          providerId: "tmdb",
          providerName: "TMDB",
          externalId: `${r.media_type}/${r.id}`,
          kind,
          title: name,
          year,
          overview: (r.overview ?? "").slice(0, 900),
          poster: r.poster_path ? `${IMG}/w342${r.poster_path}` : null,
          backdrop: r.backdrop_path ? `${IMG}/w780${r.backdrop_path}` : null,
          duration: null,
          language: null,
          licenseLabel: "Metadata © TMDB · official availability",
          licenseUrl: null,
          authorizationType: "OFFICIAL_API" as const,
          attribution: `Metadata from TMDB${official?.providers?.length ? ` · streaming on ${official.providers.slice(0, 3).join(", ")}` : ""}`,
          availability: (official?.providers?.length ? "SUBSCRIPTION" : "EXTERNAL") as DiscoverTitle["availability"],
          externalUrl: official?.url ?? `https://www.themoviedb.org/${r.media_type}/${r.id}`,
          popularity: r.popularity ?? 0,
          sources: [] as DiscoverSource[],
          subtitles: [],
          inLibrary: null,
          resolvableVia: null,
        } satisfies DiscoverTitle;
      }),
    );
    if (opts.kind === "movie") return titles.filter((t) => t.kind === "movie");
    if (opts.kind === "series") return titles.filter((t) => t.kind === "series");
    if (opts.kind === "clip") return [];
    return titles;
  },

  async resolveSources() {
    // Official embed destinations are links, not media we can legally proxy.
    return { sources: [], subtitles: [] };
  },
};

async function officialDestination(result: TmdbResult): Promise<{ url: string | null; providers: string[] } | null> {
  const region = process.env.TMDB_REGION || "US";
  const path = result.media_type === "tv" ? `/tv/${result.id}/watch/providers` : `/movie/${result.id}/watch/providers`;
  const data = await tmdb<WatchProviders>(path);
  const entry = data.results?.[region];
  if (!entry) return { url: `https://www.themoviedb.org/${result.media_type}/${result.id}`, providers: [] };
  const providers = [...(entry.flatrate ?? []), ...(entry.free ?? []), ...(entry.ads ?? [])].map((p) => p.provider_name);
  return { url: entry.link ?? `https://www.themoviedb.org/${result.media_type}/${result.id}`, providers: [...new Set(providers)] };
}
