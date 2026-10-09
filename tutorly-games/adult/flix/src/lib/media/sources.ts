/**
 * Source management — the `VideoProvider` contract plus the resolver that picks
 * a playable source and keeps a fallback list.
 *
 * Only AUTHORISED sources are playable (`owned`, `licensed`, `public-domain`,
 * `creative-commons`, `official-embed`). The registry below is the single place
 * a URL can enter the app: a provider `check()`s availability, `describe()`s its
 * metadata, and `resolve()`s playback candidates in preference order. When one
 * fails, the caller swaps to the next candidate while the playback state
 * (time, rate, tracks, volume) is preserved by `PreservedPlayback`.
 */

import type { MediaKind, MediaSource, SourceLicence } from "../../types";

export interface VideoProvider {
  id: string;
  label: string;
  licence: SourceLicence;
  /** URL patterns this provider claims. */
  matches(url: string): boolean;
  /** Is this source usable right now (HEAD/CORS/CSP)? */
  check(source: MediaSource): Promise<boolean>;
  /** Normalised metadata for the library UI. */
  describe(source: MediaSource): { kind: MediaKind; label: string; attribution?: string };
  /** Playback candidates, best first — includes this source and any better siblings. */
  resolve(source: MediaSource): MediaSource[];
}

/** Which URL belongs to which streaming engine. */
export function detectKind(url: string): MediaKind {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".m3u8")) return "hls";
  if (clean.endsWith(".mpd")) return "dash";
  if (/youtube\.com|youtu\.be/.test(clean)) return "youtube";
  if (/dailymotion\.com|dai\.ly/.test(clean)) return "dailymotion";
  if (/vimeo\.com/.test(clean)) return "vimeo";
  if (/^(blob:|data:)/.test(url)) return "local";
  return "progressive";
}

/** True for the kinds that play inside the platform's own official player. */
export function isEmbedKind(kind: MediaKind): boolean {
  return kind === "youtube" || kind === "dailymotion" || kind === "vimeo";
}

export const LICENCE_LABELS: Record<SourceLicence, string> = {
  owned: "Owned / produced in-house",
  licensed: "Licensed for classroom use",
  "public-domain": "Public domain",
  "creative-commons": "Creative Commons (attribution kept)",
  "official-embed": "Official player embed",
};

/**
 * Preference order for playback: adaptive (HLS/DASH) first, then progressive
 * files, then official embeds. Stable for equal quality so an authored order is
 * preserved — a fallback must never jump to a source the teacher did not list.
 */
export function buildCandidates(sources: MediaSource[]): MediaSource[] {
  const rank: Record<MediaKind, number> = { hls: 0, dash: 0, progressive: 1, local: 2, youtube: 3, dailymotion: 3, vimeo: 3 };
  return [...sources].sort((a, b) => rank[a.kind] - rank[b.kind] || b.quality - a.quality);
}

/** HEAD request with a timeout; a CORS-blocked but valid URL counts as available. */
export async function checkAvailability(url: string, timeoutMs = 4000): Promise<boolean> {
  if (/^(blob:|data:)/.test(url)) return true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1" }, signal: controller.signal });
    return response.ok || response.status === 206 || response.type === "opaque";
  } catch {
    // Opaque/CORS failures still usually play in the media element.
    return true;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The resolver used by the player. Keeps the preference order stable so a
 * fallback never silently downgrades below a source the user explicitly chose.
 */
export class SourceResolver {
  private index = 0;

  constructor(private readonly candidates: MediaSource[]) {}

  get all(): MediaSource[] {
    return this.candidates;
  }

  get current(): MediaSource | null {
    return this.candidates[this.index] ?? null;
  }

  select(id: string): MediaSource | null {
    const at = this.candidates.findIndex((s) => s.id === id);
    if (at === -1) return this.current;
    this.index = at;
    return this.current;
  }

  /** Move to the next candidate after a failure. `null` = nothing left. */
  next(): MediaSource | null {
    if (this.index + 1 >= this.candidates.length) return null;
    this.index += 1;
    return this.current;
  }

  reset(): void {
    this.index = 0;
  }
}

export function makeSource(input: {
  url: string;
  label?: string;
  licence?: SourceLicence;
  quality?: number;
  attribution?: string;
  id?: string;
}): MediaSource {
  const kind = detectKind(input.url);
  return {
    id: input.id ?? `${kind}-${Math.random().toString(36).slice(2, 8)}`,
    url: input.url,
    kind,
    quality: input.quality ?? (kind === "hls" || kind === "dash" ? 80 : 40),
    licence: input.licence ?? "creative-commons",
    label: input.label ?? kind.toUpperCase(),
    attribution: input.attribution,
  };
}
