/**
 * Dailymotion as a catalog and as a player.
 *
 * The Graph API's public read endpoints need no key at all, which makes this the one
 * video platform that works out of the box, and every result is checked for
 * `allow_embed` before it is offered — a video whose owner has disabled embedding
 * would import fine and then refuse to play. Playback is Dailymotion's official
 * embed, driven through its documented postMessage player API (modules/media/embed.ts).
 */

import {
  parseYear,
  type DiscoverSearchOptions,
  type DiscoverSource,
  type DiscoverSubtitle,
  type DiscoverTitle,
  type ProviderStatus,
  type VideoProvider,
} from "./types";

const API = "https://api.dailymotion.com";
const TIMEOUT_MS = 12_000;
const MAX_LIMIT = 24;

/** The fields every listing needs, in one request. */
const FIELDS = ["id", "title", "description", "thumbnail_720_url", "thumbnail_480_url", "duration", "created_time", "owner.screenname", "views_total", "url", "allow_embed", "language", "private"].join(",");

type DailymotionVideo = {
  id?: string;
  title?: string;
  description?: string;
  thumbnail_720_url?: string;
  thumbnail_480_url?: string;
  duration?: number;
  created_time?: number;
  owner_screenname?: string;
  views_total?: number;
  url?: string;
  allow_embed?: boolean;
  language?: string;
  private?: boolean;
  /** Present on some responses instead of the flattened form. */
  owner?: { screenname?: string };
};

type DailymotionList = { list?: DailymotionVideo[]; has_more?: boolean; total?: number };

async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${API}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json", "User-Agent": "tutoflix/2.0 (language learning)" },
  });
  if (res.status === 429) throw new Error("Dailymotion is rate-limiting this network; try again in a minute.");
  if (!res.ok) throw new Error(`Dailymotion responded ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Dailymotion's official embed URL.
 *
 * The `api=postMessage` flag is what lets the player be driven from here, and
 * `queue-enable=false` stops their up-next queue from hijacking a lesson.
 */
export function dailymotionEmbedUrl(videoId: string): string {
  return `https://www.dailymotion.com/embed/video/${encodeURIComponent(videoId)}`;
}

function embedSource(videoId: string, channel: string, durationSeconds: number | null): DiscoverSource {
  return {
    providerId: "dailymotion",
    providerName: "Dailymotion",
    label: durationSeconds ? `Dailymotion · ${channel} · ${Math.round(durationSeconds / 60)} min` : `Dailymotion · ${channel}`,
    url: dailymotionEmbedUrl(videoId),
    kind: "embed",
    quality: "auto",
    width: null,
    height: null,
    bitrate: null,
    qualities: [],
    authorizationType: "OFFICIAL_EMBED",
    licenseLabel: "Dailymotion · official embed",
    licenseUrl: "https://www.dailymotion.com/legal/terms",
    downloadable: false,
    playable: true,
  };
}

/**
 * Dailymotion descriptions are HTML: left alone they render as a wall of
 * `<br /><br />` and entity codes in the card and the title panel.
 */
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

/** Long videos are features, short ones clip — so the kind filter in the UI works. */
function kindFor(durationSeconds: number): DiscoverTitle["kind"] {
  if (durationSeconds >= 1200) return "movie";
  if (durationSeconds >= 60) return "clip";
  return "clip";
}

function toTitle(video: DailymotionVideo): DiscoverTitle | null {
  const videoId = video.id;
  if (!videoId || video.allow_embed === false || video.private === true) return null;
  const duration = typeof video.duration === "number" && video.duration > 0 ? video.duration : null;
  const channel = video.owner_screenname ?? video.owner?.screenname ?? "Dailymotion";
  const poster = video.thumbnail_720_url ?? video.thumbnail_480_url ?? null;
  const created = typeof video.created_time === "number" ? new Date(video.created_time * 1000) : null;
  return {
    id: `dailymotion:${videoId}`,
    providerId: "dailymotion",
    providerName: "Dailymotion",
    externalId: videoId,
    kind: kindFor(duration ?? 0),
    title: plainText(video.title) || "Untitled",
    year: created && !Number.isNaN(created.getTime()) ? parseYear(created.toISOString()) : null,
    overview: plainText(video.description).slice(0, 900),
    poster,
    backdrop: poster,
    duration,
    language: video.language ? video.language.slice(0, 2).toLowerCase() : null,
    licenseLabel: "Dailymotion · official embed",
    licenseUrl: "https://www.dailymotion.com/legal/terms",
    authorizationType: "OFFICIAL_EMBED",
    attribution: `Published by ${channel} on Dailymotion`,
    availability: "FREE",
    externalUrl: video.url ?? `https://www.dailymotion.com/video/${videoId}`,
    popularity: Number(video.views_total ?? 0) || 0,
    sources: [embedSource(videoId, channel, duration)],
    subtitles: [],
    inLibrary: null,
    resolvableVia: null,
  };
}

export const dailymotionProvider: VideoProvider = {
  id: "dailymotion",
  name: "Dailymotion",
  authorizationType: "OFFICIAL_API",
  licenseUrl: "https://www.dailymotion.com/legal/terms",
  note: "Every embeddable video on Dailymotion, through its public Graph API and its official player. No key needed.",

  configured() {
    return true;
  },

  async status(): Promise<ProviderStatus> {
    const base = {
      id: this.id,
      name: this.name,
      authorizationType: this.authorizationType,
      configured: true,
      note: this.note,
    };
    try {
      await getJson<DailymotionList>("/videos", { fields: "id", limit: "1" });
      return { ...base, reachable: true };
    } catch {
      return { ...base, reachable: false };
    }
  },

  async search(opts: DiscoverSearchOptions): Promise<DiscoverTitle[]> {
    const limit = Math.min(opts.limit ?? 12, MAX_LIMIT);
    const data = await getJson<DailymotionList>("/videos", {
      search: opts.query,
      fields: FIELDS,
      // `longer_than`/`shorter_than` would bias the results; relevance plus the
      // embeddability filter is what a learner wants.
      sort: "relevance",
      limit: String(limit * 2),
      page: "1",
    });
    const titles: DiscoverTitle[] = [];
    for (const video of data.list ?? []) {
      const title = toTitle(video);
      if (title) titles.push(title);
    }
    if (opts.kind === "movie") return titles.filter((t) => t.kind === "movie").slice(0, limit);
    if (opts.kind === "series") return titles.filter((t) => t.kind === "series" || /\bseries\b|season \d|episode \d/i.test(t.title)).slice(0, limit);
    return titles.slice(0, limit);
  },

  async detail(externalId: string): Promise<DiscoverTitle | null> {
    const video = await getJson<DailymotionVideo>(`/video/${encodeURIComponent(externalId)}`, { fields: FIELDS });
    return toTitle(video);
  },

  async resolveSources(externalId: string): Promise<{ sources: DiscoverSource[]; subtitles: DiscoverSubtitle[] }> {
    const title = await this.detail!(externalId);
    if (!title) throw new Error("The owner of this video has disabled embedding, so it cannot be played here.");
    return { sources: title.sources, subtitles: [] };
  },
};
