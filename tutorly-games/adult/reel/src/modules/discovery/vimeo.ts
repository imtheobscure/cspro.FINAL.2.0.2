/**
 * Vimeo as a catalog and as a player.
 *
 * Vimeo holds a large amount of professional and educational film, and its API is
 * the most respectful of the three: an access token is required, every result
 * carries its own `privacy.embed` permission, and the player is the platform's own.
 * Only videos whose owner allows embedding on third-party sites are offered.
 *
 * The token is optional — without it the provider reports itself unconfigured and
 * the other two platforms carry on.
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

const API = "https://api.vimeo.com";
const TIMEOUT_MS = 12_000;
const MAX_LIMIT = 24;

function token(): string | null {
  return process.env.VIMEO_ACCESS_TOKEN || process.env.NEXT_PUBLIC_VIMEO_ACCESS_TOKEN || null;
}

type VimeoVideo = {
  uri?: string;
  name?: string;
  description?: string;
  duration?: number;
  release_time?: string;
  created_time?: string;
  link?: string;
  language?: string;
  privacy?: { embed?: string; view?: string };
  pictures?: { sizes?: { width?: number; link?: string }[] };
  user?: { name?: string };
  stats?: { plays?: number };
  status?: string;
};

type VimeoList = { data?: VimeoVideo[]; total?: number };

async function getJson<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const accessToken = token();
  if (!accessToken) throw new Error("VIMEO_ACCESS_TOKEN is not set");
  const url = `${API}${path}${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.vimeo.*+json;version=3.4" },
  });
  if (res.status === 401) throw new Error("Vimeo rejected the access token.");
  if (res.status === 429) throw new Error("Vimeo is rate-limiting this app; try again shortly.");
  if (!res.ok) throw new Error(`Vimeo responded ${res.status}`);
  return (await res.json()) as T;
}

/** `https://vimeo.com/123456789` → the id the embed URL needs. */
export function vimeoIdFromUri(uri: string | undefined, link: string | undefined): string | null {
  const fromLink = link?.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (fromLink) return fromLink[1];
  const fromUri = uri?.match(/\/videos\/(\d+)/);
  return fromUri ? fromUri[1] : null;
}

export function vimeoEmbedUrl(videoId: string): string {
  return `https://player.vimeo.com/video/${encodeURIComponent(videoId)}`;
}

/**
 * The largest picture Vimeo offers, with the size marked in the `width` parameter —
 * asking for a bare link returns a 100×75 still.
 */
function bestPicture(pictures: VimeoVideo["pictures"]): string | null {
  const sizes = (pictures?.sizes ?? []).filter((s) => s.link && s.width);
  if (!sizes.length) return null;
  const largest = sizes.reduce((a, b) => ((b.width ?? 0) > (a.width ?? 0) ? b : a));
  return largest.link ?? null;
}

function embedSource(videoId: string, owner: string, durationSeconds: number | null): DiscoverSource {
  return {
    providerId: "vimeo",
    providerName: "Vimeo",
    label: durationSeconds ? `Vimeo · ${owner} · ${Math.round(durationSeconds / 60)} min` : `Vimeo · ${owner}`,
    url: vimeoEmbedUrl(videoId),
    kind: "embed",
    quality: "auto",
    width: null,
    height: null,
    bitrate: null,
    qualities: [],
    authorizationType: "OFFICIAL_EMBED",
    licenseLabel: "Vimeo · official embed",
    licenseUrl: "https://vimeo.com/terms",
    downloadable: false,
    playable: true,
  };
}

function toTitle(video: VimeoVideo): DiscoverTitle | null {
  const videoId = vimeoIdFromUri(video.uri, video.link);
  if (!videoId) return null;
  // Any value other than "public" means the owner has not allowed third-party
  // embedding, and the player would refuse to start.
  if (video.privacy?.embed && video.privacy.embed !== "public") return null;
  if (video.status && video.status !== "available") return null;
  const duration = typeof video.duration === "number" && video.duration > 0 ? video.duration : null;
  const owner = video.user?.name ?? "Vimeo";
  const poster = bestPicture(video.pictures);
  const released = video.release_time ?? video.created_time;
  return {
    id: `vimeo:${videoId}`,
    providerId: "vimeo",
    providerName: "Vimeo",
    externalId: videoId,
    kind: (duration ?? 0) >= 1200 ? "movie" : "clip",
    title: (video.name ?? "Untitled").replace(/\s+/g, " ").trim(),
    year: released ? parseYear(released) : null,
    overview: (video.description ?? "").replace(/\s+/g, " ").trim().slice(0, 900),
    poster,
    backdrop: poster,
    duration,
    language: video.language ? video.language.slice(0, 2).toLowerCase() : null,
    licenseLabel: "Vimeo · official embed",
    licenseUrl: "https://vimeo.com/terms",
    authorizationType: "OFFICIAL_EMBED",
    attribution: `Published by ${owner} on Vimeo`,
    availability: "FREE",
    externalUrl: video.link ?? `https://vimeo.com/${videoId}`,
    popularity: Number(video.stats?.plays ?? 0) || 0,
    sources: [embedSource(videoId, owner, duration)],
    subtitles: [],
    inLibrary: null,
    resolvableVia: null,
  };
}

export const vimeoProvider: VideoProvider = {
  id: "vimeo",
  name: "Vimeo",
  authorizationType: "OFFICIAL_API",
  licenseUrl: "https://vimeo.com/terms",
  requiresEnv: "VIMEO_ACCESS_TOKEN",
  note: "Vimeo's public catalog — a lot of it documentary and educational film — played in Vimeo's own player. Needs a free personal access token from developer.vimeo.com.",

  configured() {
    return !!token();
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
    if (!this.configured()) return base;
    try {
      // `/videos` is search-only now: without `query` Vimeo answers 2001
      // ("a required query parameter is missing") and a perfectly good token would
      // be reported as unreachable. Any term works; this one is cheap and stable.
      await getJson<VimeoList>("/videos", { query: "documentary", per_page: "1" });
      return { ...base, reachable: true };
    } catch (err) {
      return { ...base, reachable: false };
    }
  },

  async search(opts: DiscoverSearchOptions): Promise<DiscoverTitle[]> {
    if (!token()) return [];
    const limit = Math.min(opts.limit ?? 12, MAX_LIMIT);
    const data = await getJson<VimeoList>("/videos", {
      query: opts.query,
      per_page: String(limit * 2),
      sort: "relevant",
      direction: "desc",
      fields: "uri,name,description,duration,release_time,created_time,link,language,privacy,status,pictures,user,stats",
    });
    const titles: DiscoverTitle[] = [];
    for (const video of data.data ?? []) {
      const title = toTitle(video);
      if (title) titles.push(title);
    }
    if (opts.kind === "movie") return titles.filter((t) => t.kind === "movie").slice(0, limit);
    return titles.slice(0, limit);
  },

  async detail(externalId: string): Promise<DiscoverTitle | null> {
    const video = await getJson<VimeoVideo>(`/videos/${encodeURIComponent(externalId)}`, {
      fields: "uri,name,description,duration,link,privacy,status,pictures,user,release_time",
    });
    return toTitle(video);
  },

  async resolveSources(externalId: string): Promise<{ sources: DiscoverSource[]; subtitles: DiscoverSubtitle[] }> {
    const title = await this.detail!(externalId);
    if (!title) throw new Error("The owner of this video has not allowed it to be embedded, so it cannot be played here.");
    return { sources: title.sources, subtitles: [] };
  },
};
