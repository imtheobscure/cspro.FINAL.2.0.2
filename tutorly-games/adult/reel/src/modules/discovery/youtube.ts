/**
 * YouTube as a catalog and as a player.
 *
 * Search goes through the official Data API v3 (`YOUTUBE_API_KEY`, free) and every
 * result is constrained to videos the owner allows to be embedded — `videoEmbeddable`
 * on the search call and a re-check of `status.embeddable` at resolve time, because a
 * result that cannot be embedded is worse than no result: it imports fine and then
 * fails in front of a class. Playback is the platform's own IFrame player, the only
 * way YouTube licenses a video to be shown.
 *
 * The key matters for cost: `search.list` is 100 of the 10,000 free units per day,
 * so roughly 100 searches a day, and each result set is cached by the search layer.
 * `videos.list` (1 unit) fills in the durations the search response does not carry.
 */

import {
  kindFromText,
  parseYear,
  type AuthorizationType,
  type DiscoverSearchOptions,
  type DiscoverSource,
  type DiscoverSubtitle,
  type DiscoverTitle,
  type ProviderStatus,
  type VideoProvider,
} from "./types";

const API = "https://www.googleapis.com/youtube/v3";
const TIMEOUT_MS = 12_000;
const CONCURRENCY_SAFE_LIMIT = 24;

function apiKey(): string | null {
  return process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || null;
}

type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url?: string; width?: number; height?: number }>;
    tags?: string[];
  };
};

type YouTubeVideoItem = {
  id?: string;
  snippet?: YouTubeSearchItem["snippet"];
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean; privacyStatus?: string; uploadStatus?: string; license?: string };
  statistics?: { viewCount?: string; likeCount?: string };
};

/** ISO-8601 duration (`PT1H2M3S`) → seconds. */
export function parseIsoDuration(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, d, h, m, s] = match;
  return Number(d ?? 0) * 86_400 + Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string; errors?: { reason?: string }[] } } | null;
    const reason = body?.error?.errors?.[0]?.reason;
    if (res.status === 403 && reason === "quotaExceeded") throw new Error("The YouTube quota for today is used up (10,000 units/day; a search costs 100).");
    if (res.status === 400 || res.status === 403) throw new Error(body?.error?.message ?? `YouTube rejected the key (HTTP ${res.status})`);
    throw new Error(`YouTube responded ${res.status}`);
  }
  return (await res.json()) as T;
}

function bestThumbnail(snippet: YouTubeSearchItem["snippet"]): string | null {
  const thumbs = snippet?.thumbnails ?? {};
  return thumbs.maxres?.url ?? thumbs.standard?.url ?? thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? null;
}

/** Only these uploads are worth offering: public, embeddable, finished processing. */
function usable(item: YouTubeVideoItem): boolean {
  if (item.status?.privacyStatus && item.status.privacyStatus !== "public") return false;
  if (item.status?.uploadStatus && item.status.uploadStatus !== "processed") return false;
  return item.status?.embeddable !== false;
}

/**
 * An embed source. The URL is the canonical watch page — `modules/media/embed.ts`
 * recognises every YouTube URL shape and builds the player from the id, so storing
 * the human URL keeps the catalog readable and the source portable.
 */
function embedSource(videoId: string, label: string, license: AuthorizationType = "OFFICIAL_EMBED"): DiscoverSource {
  return {
    providerId: "youtube",
    providerName: "YouTube",
    label: label || "Official embed",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    kind: "embed",
    quality: "auto",
    width: null,
    height: null,
    bitrate: null,
    // YouTube exposes no rendition list through the API — the player picks. Saying so
    // with an empty ladder is more honest than inventing heights.
    qualities: [],
    authorizationType: license,
    licenseLabel: "YouTube · official embed",
    licenseUrl: "https://www.youtube.com/t/terms",
    downloadable: false,
    playable: true,
  };
}

function titleFrom(item: YouTubeVideoItem, kind: DiscoverTitle["kind"]): DiscoverTitle {
  const videoId = item.id ?? "";
  const snippet = item.snippet;
  const duration = parseIsoDuration(item.contentDetails?.duration);
  const channel = snippet?.channelTitle ?? "YouTube";
  return {
    id: `youtube:${videoId}`,
    providerId: "youtube",
    providerName: "YouTube",
    externalId: videoId,
    kind,
    title: (snippet?.title ?? "Untitled").replace(/\s+/g, " ").trim(),
    year: parseYear(snippet?.publishedAt),
    overview: (snippet?.description ?? "").replace(/\s+/g, " ").trim().slice(0, 900),
    poster: bestThumbnail(snippet),
    backdrop: bestThumbnail(snippet),
    duration: duration || null,
    language: null,
    licenseLabel: "YouTube · official embed",
    licenseUrl: "https://www.youtube.com/t/terms",
    authorizationType: "OFFICIAL_EMBED",
    attribution: `Published by ${channel} on YouTube`,
    availability: "FREE",
    externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    popularity: Number(item.statistics?.viewCount ?? 0) || 0,
    sources: [embedSource(videoId, `YouTube · ${channel}`)],
    subtitles: [],
    inLibrary: null,
    resolvableVia: null,
  };
}

/** Long uploads are treated as features, short ones as clips, so the kind filter works. */
function kindForDuration(seconds: number, fallback: DiscoverTitle["kind"]): DiscoverTitle["kind"] {
  if (seconds >= 1200) return "movie";
  if (seconds >= 60) return "clip";
  return fallback;
}

export const youtubeProvider: VideoProvider = {
  id: "youtube",
  name: "YouTube",
  authorizationType: "OFFICIAL_API",
  licenseUrl: "https://developers.google.com/youtube/terms/api-services-terms-of-service",
  requiresEnv: "YOUTUBE_API_KEY",
  note: "Every publicly embeddable video on YouTube, searched through the official Data API and played in YouTube's own player. Needs a free API key from console.cloud.google.com (enable “YouTube Data API v3”).",

  configured() {
    return !!apiKey();
  },

  async status(): Promise<ProviderStatus> {
    const base = {
      id: this.id,
      name: this.name,
      authorizationType: this.authorizationType,
      configured: this.configured(),
      requiresEnv: this.requiresEnv,
      note: this.note,
    };
    // Without a key there is nothing to reach: `reachable` stays undefined so the UI
    // shows "needs a key" rather than "unreachable".
    if (!this.configured()) return base;
    try {
      await getJson("videos", { part: "id", id: "dQw4w9WgXcQ" });
      return { ...base, reachable: true };
    } catch (err) {
      return { ...base, reachable: false };
    }
  },

  async search(opts: DiscoverSearchOptions): Promise<DiscoverTitle[]> {
    if (!apiKey()) return [];
    const limit = Math.min(opts.limit ?? 12, CONCURRENCY_SAFE_LIMIT);
    const data = await getJson<{ items?: YouTubeSearchItem[] }>("search", {
      part: "snippet",
      q: opts.query,
      type: "video",
      maxResults: String(Math.min(limit * 2, 50)),
      // The two filters that keep an unplayable result out of the list entirely.
      videoEmbeddable: "true",
      videoSyndicated: "true",
      safeSearch: "moderate",
      ...(opts.language ? { relevanceLanguage: opts.language } : {}),
    });

    const ids = (data.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => !!id);
    if (!ids.length) return [];

    // Durations, embeddability and view counts live on a different endpoint; one
    // batched call fills them in for the whole page of results.
    const details = await getJson<{ items?: YouTubeVideoItem[] }>("videos", {
      part: "contentDetails,status,statistics,snippet",
      id: ids.join(","),
      maxResults: "50",
    });
    const byId = new Map((details.items ?? []).map((item) => [item.id ?? "", item]));

    const titles: DiscoverTitle[] = [];
    for (const id of ids) {
      const item = byId.get(id);
      if (!item || !usable(item)) continue;
      const kind = kindForDuration(parseIsoDuration(item.contentDetails?.duration), kindFromText(item.snippet?.title));
      titles.push(titleFrom(item, kind));
    }

    if (opts.kind === "series") return titles.filter((t) => t.kind === "series" || /series|season|episode|documentary/i.test(t.title));
    if (opts.kind === "movie") return titles.filter((t) => t.kind === "movie" || t.kind === "clip");
    return titles.slice(0, limit);
  },

  async detail(externalId: string): Promise<DiscoverTitle | null> {
    if (!apiKey()) return null;
    const data = await getJson<{ items?: YouTubeVideoItem[] }>("videos", {
      part: "snippet,contentDetails,status,statistics",
      id: externalId,
    });
    const item = data.items?.[0];
    if (!item || !usable(item)) return null;
    const duration = parseIsoDuration(item.contentDetails?.duration);
    return titleFrom({ ...item, id: externalId }, kindForDuration(duration, "clip"));
  },

  async resolveSources(externalId: string): Promise<{ sources: DiscoverSource[]; subtitles: DiscoverSubtitle[] }> {
    const data = await getJson<{ items?: YouTubeVideoItem[] }>("videos", { part: "contentDetails,status,snippet", id: externalId });
    const item = data.items?.[0];
    if (!item || !usable(item)) {
      throw new Error("This video does not allow embedding, so it cannot be played here.");
    }
    const channel = item.snippet?.channelTitle ?? "YouTube";
    return { sources: [embedSource(externalId, `YouTube · ${channel}`)], subtitles: [] };
  },
};
