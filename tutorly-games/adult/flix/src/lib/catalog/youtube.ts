/**
 * YouTube search, browser-side.
 *
 * The app is static, so the Data API key is the learner's own: it lives in
 * localStorage (Settings → Catalog, or Discover's 🔑 panel) and every request goes
 * straight from the browser to Google. Two filters keep the results usable —
 * `videoEmbeddable` on the search and `status.embeddable` on the follow-up details
 * call — because a video whose owner has disabled embedding would import fine and
 * then refuse to play in front of a class.
 *
 * The key is free (console.cloud.google.com → “YouTube Data API v3”). Quota is
 * 10,000 units a day and a search costs 100, so about 100 searches a day.
 */

import type { CatalogKeys, CatalogTitle } from "./types";
import type { MediaSource } from "../../types";

const API = "https://www.googleapis.com/youtube/v3";
const TIMEOUT_MS = 12_000;

type VideoItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean; privacyStatus?: string; uploadStatus?: string };
  statistics?: { viewCount?: string };
};

/** ISO-8601 duration (`PT1H2M3S`) → seconds. */
export function parseIsoDuration(value: string | undefined): number {
  if (!value) return 0;
  const m = value.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, d, h, mi, s] = m;
  return Number(d ?? 0) * 86_400 + Number(h ?? 0) * 3600 + Number(mi ?? 0) * 60 + Number(s ?? 0);
}

async function getJson<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string; errors?: { reason?: string }[] } } | null;
    const reason = body?.error?.errors?.[0]?.reason;
    if (res.status === 403 && reason === "quotaExceeded") throw new Error("Today's YouTube quota is used up (10,000 units/day; one search costs 100).");
    if (res.status === 400 || res.status === 403) throw new Error(body?.error?.message ?? `YouTube rejected the key (HTTP ${res.status})`);
    throw new Error(`YouTube responded ${res.status}`);
  }
  return (await res.json()) as T;
}

export function youtubeKeyPresent(keys: CatalogKeys): boolean {
  return !!keys.youtube?.trim();
}

/** One check the Settings panel can show without spending a search's quota. */
export async function youtubeReachable(keys: CatalogKeys): Promise<boolean> {
  if (!youtubeKeyPresent(keys)) return false;
  try {
    await getJson("videos", { part: "id", id: "dQw4w9WgXcQ" }, keys.youtube);
    return true;
  } catch {
    return false;
  }
}

function bestThumbnail(snippet: VideoItem["snippet"]): string | null {
  const t = snippet?.thumbnails ?? {};
  return t.maxres?.url ?? t.standard?.url ?? t.high?.url ?? t.medium?.url ?? t.default?.url ?? null;
}

function usable(item: VideoItem): boolean {
  if (item.status?.privacyStatus && item.status.privacyStatus !== "public") return false;
  if (item.status?.uploadStatus && item.status.uploadStatus !== "processed") return false;
  return item.status?.embeddable !== false;
}

/** A first-party upload played in YouTube's own player — the licensed way. */
function embedSource(videoId: string, channel: string): MediaSource {
  return {
    id: `youtube-${videoId}`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    kind: "youtube",
    quality: 90,
    licence: "official-embed",
    label: `YouTube · ${channel}`,
    attribution: `Published by ${channel} on YouTube`,
  };
}

function toTitle(item: VideoItem): CatalogTitle | null {
  const videoId = item.id;
  if (!videoId || !usable(item)) return null;
  const snippet = item.snippet;
  const duration = parseIsoDuration(item.contentDetails?.duration);
  const channel = snippet?.channelTitle ?? "YouTube";
  const published = snippet?.publishedAt ? Number(snippet.publishedAt.slice(0, 4)) : null;
  return {
    id: `youtube:${videoId}`,
    providerId: "youtube",
    providerLabel: "YouTube",
    externalId: videoId,
    kind: duration >= 1200 ? "movie" : "clip",
    title: (snippet?.title ?? "Untitled").replace(/\s+/g, " ").trim(),
    year: published && Number.isFinite(published) ? published : null,
    overview: (snippet?.description ?? "").replace(/\s+/g, " ").trim().slice(0, 900),
    tagline: null,
    poster: bestThumbnail(snippet),
    backdrop: bestThumbnail(snippet),
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
    licenceLabel: "YouTube · official embed",
    licenceUrl: "https://www.youtube.com/t/terms",
    attribution: `Published by ${channel} on YouTube`,
    sources: [embedSource(videoId, channel)],
    subtitles: [],
    externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    popularity: Number(item.statistics?.viewCount ?? 0) || 0,
    durationSeconds: duration || null,
  };
}

export async function youtubeSearch(query: string, kind: "any" | "movie" | "series", keys: CatalogKeys, limit = 12): Promise<CatalogTitle[]> {
  if (!youtubeKeyPresent(keys)) return [];
  const data = await getJson<{ items?: { id?: { videoId?: string } }[] }>(
    "search",
    {
      part: "snippet",
      q: query,
      type: "video",
      maxResults: String(Math.min(limit * 2, 40)),
      videoEmbeddable: "true",
      videoSyndicated: "true",
      safeSearch: "moderate",
      ...(keys.region === "TR" ? { regionCode: "TR" } : {}),
    },
    keys.youtube,
  );
  const ids = (data.items ?? []).map((i) => i.id?.videoId).filter((id): id is string => !!id);
  if (!ids.length) return [];

  const details = await getJson<{ items?: VideoItem[] }>(
    "videos",
    { part: "contentDetails,status,statistics,snippet", id: ids.join(","), maxResults: "50" },
    keys.youtube,
  );
  const titles: CatalogTitle[] = [];
  for (const raw of details.items ?? []) {
    const title = toTitle(raw);
    if (title) titles.push(title);
  }
  if (kind === "movie") return titles.filter((t) => t.kind === "movie" || t.kind === "clip").slice(0, limit);
  if (kind === "series") return titles.filter((t) => t.kind === "series" || /series|season|episode|documentary/i.test(t.title)).slice(0, limit);
  return titles.slice(0, limit);
}

/** Re-checks embeddability for one video, so an import cannot land a dead source. */
export async function youtubeResolve(videoId: string, keys: CatalogKeys): Promise<MediaSource[]> {
  if (!youtubeKeyPresent(keys)) return [];
  const data = await getJson<{ items?: VideoItem[] }>("videos", { part: "status,snippet", id: videoId }, keys.youtube);
  const item = data.items?.[0];
  if (!item || !usable(item)) throw new Error("The owner of this video does not allow it to be embedded.");
  return [embedSource(videoId, item.snippet?.channelTitle ?? "YouTube")];
}
