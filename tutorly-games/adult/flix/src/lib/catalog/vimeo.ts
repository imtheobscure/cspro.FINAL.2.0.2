/**
 * Vimeo search, browser-side and optional.
 *
 * Vimeo holds a lot of professional and educational film, but its API requires a
 * token, so this provider stays dormant until one is pasted into Settings. Only
 * videos whose owner allows third-party embedding are offered — anything else would
 * import and then refuse to play.
 */

import type { CatalogKeys, CatalogTitle } from "./types";
import type { MediaSource } from "../../types";

const API = "https://api.vimeo.com";
const TIMEOUT_MS = 12_000;
const FIELDS = "uri,name,description,duration,release_time,created_time,link,language,privacy,status,pictures,user,stats";

type Video = {
  uri?: string;
  name?: string;
  description?: string;
  duration?: number;
  release_time?: string;
  created_time?: string;
  link?: string;
  language?: string;
  privacy?: { embed?: string };
  status?: string;
  pictures?: { sizes?: { width?: number; link?: string }[] };
  user?: { name?: string };
  stats?: { plays?: number };
};

export function vimeoKeyPresent(keys: CatalogKeys): boolean {
  return !!keys.vimeo?.trim();
}

async function getJson<T>(path: string, params: Record<string, string>, token: string): Promise<T> {
  const url = `${API}${path}${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.vimeo.*+json;version=3.4" },
  });
  if (res.status === 401) throw new Error("Vimeo rejected the access token.");
  if (res.status === 429) throw new Error("Vimeo is rate-limiting this app; try again shortly.");
  if (!res.ok) throw new Error(`Vimeo responded ${res.status}`);
  return (await res.json()) as T;
}

export function vimeoEmbedUrl(videoId: string): string {
  return `https://player.vimeo.com/video/${encodeURIComponent(videoId)}`;
}

export function vimeoIdFromUri(uri: string | undefined, link: string | undefined): string | null {
  const fromLink = link?.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (fromLink) return fromLink[1];
  const fromUri = uri?.match(/\/videos\/(\d+)/);
  return fromUri ? fromUri[1] : null;
}

/** Vimeo returns a 100×75 still unless a size is asked for. */
function bestPicture(pictures: Video["pictures"]): string | null {
  const sizes = (pictures?.sizes ?? []).filter((s) => s.link && s.width);
  if (!sizes.length) return null;
  return sizes.reduce((a, b) => ((b.width ?? 0) > (a.width ?? 0) ? b : a)).link ?? null;
}

function embedSource(videoId: string, owner: string, duration: number | null): MediaSource {
  return {
    id: `vimeo-${videoId}`,
    url: vimeoEmbedUrl(videoId),
    kind: "vimeo",
    quality: 90,
    licence: "official-embed",
    label: duration ? `Vimeo · ${owner} · ${Math.round(duration / 60)} min` : `Vimeo · ${owner}`,
    attribution: `Published by ${owner} on Vimeo`,
  };
}

export async function vimeoReachable(keys: CatalogKeys): Promise<boolean> {
  if (!vimeoKeyPresent(keys)) return false;
  try {
    // `/videos` is search-only now: without `query` Vimeo answers 2001 ("a required
    // query parameter is missing") and a perfectly good token reads as unreachable.
    await getJson("/videos", { query: "documentary", per_page: "1" }, keys.vimeo);
    return true;
  } catch {
    return false;
  }
}

function toTitle(video: Video): CatalogTitle | null {
  const videoId = vimeoIdFromUri(video.uri, video.link);
  if (!videoId) return null;
  if (video.privacy?.embed && video.privacy.embed !== "public") return null;
  if (video.status && video.status !== "available") return null;
  const duration = typeof video.duration === "number" && video.duration > 0 ? video.duration : null;
  const owner = video.user?.name ?? "Vimeo";
  const poster = bestPicture(video.pictures);
  const released = video.release_time ?? video.created_time;
  return {
    id: `vimeo:${videoId}`,
    providerId: "vimeo",
    providerLabel: "Vimeo",
    externalId: videoId,
    kind: (duration ?? 0) >= 1200 ? "movie" : "clip",
    title: (video.name ?? "Untitled").replace(/\s+/g, " ").trim(),
    year: released ? Number(released.slice(0, 4)) || null : null,
    overview: (video.description ?? "").replace(/\s+/g, " ").trim().slice(0, 900),
    tagline: null,
    poster,
    backdrop: poster,
    runtimeMinutes: duration ? Math.round(duration / 60) : null,
    seasonsCount: null,
    episodesCount: null,
    genres: [],
    cast: [],
    crew: [],
    tmdbRating: null,
    tmdbVotes: null,
    imdb: null,
    imdbId: null,
    contentRating: null,
    trailers: [],
    watch: [],
    watchLink: null,
    seasons: [],
    licence: "official-embed",
    licenceLabel: "Vimeo · official embed",
    licenceUrl: "https://vimeo.com/terms",
    attribution: `Published by ${owner} on Vimeo`,
    sources: [embedSource(videoId, owner, duration)],
    subtitles: [],
    externalUrl: video.link ?? `https://vimeo.com/${videoId}`,
    popularity: Number(video.stats?.plays ?? 0) || 0,
    durationSeconds: duration,
  };
}

export async function vimeoSearch(query: string, kind: "any" | "movie" | "series", keys: CatalogKeys, limit = 12): Promise<CatalogTitle[]> {
  if (!vimeoKeyPresent(keys)) return [];
  const data = await getJson<{ data?: Video[] }>(
    "/videos",
    { query, per_page: String(Math.min(limit * 2, 40)), sort: "relevant", direction: "desc", fields: FIELDS },
    keys.vimeo,
  );
  const titles: CatalogTitle[] = [];
  for (const video of data.data ?? []) {
    const title = toTitle(video);
    if (title) titles.push(title);
  }
  if (kind === "movie") return titles.filter((t) => t.kind === "movie").slice(0, limit);
  return titles.slice(0, limit);
}

export async function vimeoResolve(videoId: string, keys: CatalogKeys): Promise<MediaSource[]> {
  if (!vimeoKeyPresent(keys)) return [];
  const video = await getJson<Video>(`/videos/${encodeURIComponent(videoId)}`, { fields: "uri,name,duration,link,privacy,status,pictures,user" }, keys.vimeo);
  const title = toTitle(video);
  if (!title) throw new Error("The owner of this video has not allowed it to be embedded.");
  return title.sources;
}
