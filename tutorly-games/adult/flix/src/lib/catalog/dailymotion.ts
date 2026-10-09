/**
 * Dailymotion search, browser-side — and the one platform that needs no key at all.
 *
 * The public Graph API answers cross-origin, so search works the moment the app
 * loads, and every result is checked for `allow_embed` before it is offered:
 * a video whose owner has disabled embedding would import fine and then refuse to
 * play. Playback is Dailymotion's official embed, driven over postMessage.
 */

import type { CatalogTitle } from "./types";
import type { MediaSource } from "../../types";

const API = "https://api.dailymotion.com";
const TIMEOUT_MS = 12_000;
/** Dailymotion descriptions are HTML — `<br />` and entities, not prose. */
export function plainText(value: string | undefined | null): string {
  return (value ?? "")
    .replace(/<\s*br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const FIELDS = ["id", "title", "description", "thumbnail_720_url", "thumbnail_480_url", "duration", "created_time", "owner.screenname", "views_total", "url", "allow_embed", "language", "private"].join(",");

type Video = {
  id?: string;
  title?: string;
  description?: string;
  thumbnail_720_url?: string;
  thumbnail_480_url?: string;
  duration?: number;
  created_time?: number;
  owner_screenname?: string;
  owner?: { screenname?: string };
  views_total?: number;
  url?: string;
  allow_embed?: boolean;
  language?: string;
  private?: boolean;
};

async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${API}${path}?${new URLSearchParams(params)}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (res.status === 429) throw new Error("Dailymotion is rate-limiting this network; try again in a minute.");
  if (!res.ok) throw new Error(`Dailymotion responded ${res.status}`);
  return (await res.json()) as T;
}

export function dailymotionEmbedUrl(videoId: string): string {
  return `https://www.dailymotion.com/embed/video/${encodeURIComponent(videoId)}`;
}

function embedSource(videoId: string, channel: string, duration: number | null): MediaSource {
  return {
    id: `dailymotion-${videoId}`,
    url: dailymotionEmbedUrl(videoId),
    kind: "dailymotion",
    quality: 90,
    licence: "official-embed",
    label: duration ? `Dailymotion · ${channel} · ${Math.round(duration / 60)} min` : `Dailymotion · ${channel}`,
    attribution: `Published by ${channel} on Dailymotion`,
  };
}

export async function dailymotionReachable(): Promise<boolean> {
  try {
    await getJson("/videos", { fields: "id", limit: "1" });
    return true;
  } catch {
    return false;
  }
}

function toTitle(video: Video): CatalogTitle | null {
  const videoId = video.id;
  if (!videoId || video.allow_embed === false || video.private === true) return null;
  // Dailymotion sends HTML: left alone, descriptions render as a wall of `<br />` and
  // entity codes in the card and the title panel.
  const duration = typeof video.duration === "number" && video.duration > 0 ? video.duration : null;
  const channel = video.owner_screenname ?? video.owner?.screenname ?? "Dailymotion";
  const poster = video.thumbnail_720_url ?? video.thumbnail_480_url ?? null;
  const created = typeof video.created_time === "number" ? new Date(video.created_time * 1000) : null;
  const year = created && !Number.isNaN(created.getTime()) ? created.getFullYear() : null;
  return {
    id: `dailymotion:${videoId}`,
    providerId: "dailymotion",
    providerLabel: "Dailymotion",
    externalId: videoId,
    kind: (duration ?? 0) >= 1200 ? "movie" : "clip",
    title: plainText(video.title) || "Untitled",
    year,
    overview: plainText(video.description).slice(0, 900),
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
    licenceLabel: "Dailymotion · official embed",
    licenceUrl: "https://www.dailymotion.com/legal/terms",
    attribution: `Published by ${channel} on Dailymotion`,
    sources: [embedSource(videoId, channel, duration)],
    subtitles: [],
    externalUrl: video.url ?? `https://www.dailymotion.com/video/${videoId}`,
    popularity: Number(video.views_total ?? 0) || 0,
    durationSeconds: duration,
  };
}

export async function dailymotionSearch(query: string, kind: "any" | "movie" | "series", limit = 12): Promise<CatalogTitle[]> {
  const data = await getJson<{ list?: Video[] }>("/videos", {
    search: query,
    fields: FIELDS,
    sort: "relevance",
    limit: String(Math.min(limit * 2, 40)),
    page: "1",
  });
  const titles: CatalogTitle[] = [];
  for (const video of data.list ?? []) {
    const title = toTitle(video);
    if (title) titles.push(title);
  }
  if (kind === "movie") return titles.filter((t) => t.kind === "movie").slice(0, limit);
  if (kind === "series") return titles.filter((t) => t.kind === "series" || /\bseries\b|season \d|episode \d/i.test(t.title)).slice(0, limit);
  return titles.slice(0, limit);
}

/** Confirms the owner still allows embedding before an import relies on it. */
export async function dailymotionResolve(videoId: string): Promise<MediaSource[]> {
  const video = await getJson<Video>(`/video/${encodeURIComponent(videoId)}`, { fields: FIELDS });
  const title = toTitle(video);
  if (!title) throw new Error("The owner of this video has disabled embedding, so it cannot be played here.");
  return title.sources;
}
