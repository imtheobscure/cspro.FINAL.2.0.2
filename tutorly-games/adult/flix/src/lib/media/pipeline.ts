/**
 * The streaming pipeline behind the player UI.
 *
 * Vidstack owns the INTERFACE (controls, gestures, keyboard shortcuts, layout);
 * this module owns the BYTES:
 *
 *   .mpd           → Shaka Player (DASH: ABR, audio + text tracks, no DRM games)
 *   .m3u8          → Shaka Player when the browser can run it, else hls.js
 *   .mp4/.webm/…   → the media element's native pipeline
 *   youtube/vimeo  → official embed (Vidstack's own provider), never scraped
 *
 * Every engine implements the same `MediaPipeline` contract, so the player can
 * swap engines mid-episode when a source fails without losing the lesson.
 */

import type Hls from "hls.js";
import type shaka from "shaka-player";
import type { MediaSource, PreservedPlayback } from "../../types";

export interface EngineQuality {
  id: string;
  label: string;
  height?: number;
  bitrate?: number;
  active?: boolean;
}

export interface EngineAudioTrack {
  id: string;
  label: string;
  language: string;
  active?: boolean;
}

export interface EngineTextTrackRef {
  id: string;
  label: string;
  language: string;
  active?: boolean;
}

export interface EngineEvents {
  onError?: (message: string, fatal: boolean) => void;
  onQualities?: (qualities: EngineQuality[]) => void;
  onAudioTracks?: (tracks: EngineAudioTrack[]) => void;
  onEmbeddedTextTracks?: (tracks: EngineTextTrackRef[]) => void;
  onBuffer?: (info: { buffered: number; stall: boolean; bandwidthEstimate?: number }) => void;
  onReady?: () => void;
}

export interface MediaPipeline {
  readonly engine: "shaka" | "hlsjs" | "native";
  load(source: MediaSource, startAt: number): Promise<void>;
  selectQuality(id: string): void;
  selectAudioTrack(id: string): void;
  selectTextTrack(id: string): void;
  /** Adaptive bitrate on/off (manual quality locks ABR off). */
  setAdaptive(enabled: boolean): void;
  snapshot(): PreservedPlayback;
  destroy(): void;
}

const isDashUri = (url: string) => /\.mpd(\?|$)/i.test(url);
const isHlsUri = (url: string) => /\.m3u8(\?|$)/i.test(url);

/** Lazy imports keep the two engines out of the first paint. */
async function loadShaka(): Promise<typeof shaka | null> {
  try {
    const mod = await import("shaka-player/dist/shaka-player.compiled.js");
    const shakaNs = (mod as { default?: typeof shaka }).default ?? (mod as unknown as typeof shaka);
    if (!shakaNs?.Player?.isBrowserSupported?.()) return null;
    // Shaka's own polyfills + a quiet logger: classroom projectors, not devtools.
    // (`log` lives on the namespace at runtime but is not in the bundled types.)
    shakaNs.polyfill?.installAll?.();
    const logging = shakaNs as unknown as { log?: { setLevel?: (level: number) => void; Level?: { WARNING?: number } } };
    logging.log?.setLevel?.(logging.log.Level?.WARNING ?? 2);
    return shakaNs;
  } catch {
    return null;
  }
}

/**
 * hls.js only accepts the VALUES of its `Events` enum ("hlsManifestParsed", …)
 * as listener names, and this module imports hls.js as a type so it can also be
 * lazy-loaded. These literals are exactly those values; the cast keeps the
 * listener's own argument types at the call site.
 */
function onHls<A extends unknown[]>(hls: Hls, event: string, handler: (...args: A) => void): void {
  (hls.on as unknown as (name: string, listener: (...args: A) => void) => void)(event, handler);
}

async function loadHls(): Promise<typeof Hls | null> {
  try {
    const mod = await import("hls.js");
    const HlsNs = (mod as { default?: typeof Hls }).default ?? (mod as unknown as typeof Hls);
    return HlsNs?.isSupported?.() ? HlsNs : null;
  } catch {
    return null;
  }
}

/* ─────────────────────────────── Shaka engine ─────────────────────────────── */

class ShakaPipeline implements MediaPipeline {
  readonly engine = "shaka" as const;
  private player: shaka.Player;
  private media: HTMLVideoElement;
  private events: EngineEvents;
  private listeners: Array<() => void> = [];

  constructor(player: shaka.Player, media: HTMLVideoElement, events: EngineEvents) {
    this.player = player;
    this.media = media;
    this.events = events;
    void this.wire();
  }

  private async wire() {
    const shakaNs = await loadShaka();
    const player = this.player;
    player.configure({
      streaming: {
        // Generous forward buffer: a classroom projector should survive a wifi
        // hiccup without the lesson stopping, and 2 s of rebuffering headroom
        // keeps the start fast on a slow school connection.
        bufferingGoal: 40,
        rebufferingGoal: 2,
        lowLatencyMode: false,
      },
      abr: { enabled: true, defaultBandwidthEstimate: 1_200_000 },
    });

    const emitQualities = () => {
      const tracks = player.getVariantTracks?.() ?? [];
      const active = player.getVariantTracks?.().find((t: shaka.extern.Track) => t.active);
      const seen = new Set<number>();
      const qualities: EngineQuality[] = [{ id: "auto", label: "Auto", active: !!active?.id && tracks.some((t: shaka.extern.Track) => t.id === active.id && player.getConfiguration().abr.enabled) }];
      for (const track of tracks) {
        const height = track.height ?? 0;
        if (seen.has(height)) continue;
        seen.add(height);
        qualities.push({
          id: String(track.id),
          label: height ? `${height}p` : `${Math.round((track.bandwidth ?? 0) / 1000)} kbps`,
          height,
          bitrate: track.bandwidth,
          active: track.active,
        });
      }
      this.events.onQualities?.(qualities);
    };

    const emitAudio = () => {
      const tracks = player.getAudioTracks?.() ?? [];
      this.events.onAudioTracks?.(
        tracks.map((t: shaka.extern.AudioTrack) => ({
          id: String(t.id),
          label: t.label || t.language || `Track ${t.id}`,
          language: t.language,
          active: t.active,
        })),
      );
    };

    const emitText = () => {
      const tracks = player.getTextTracks?.() ?? [];
      this.events.onEmbeddedTextTracks?.(
        tracks.map((t: shaka.extern.TextTrack) => ({
          id: String(t.id),
          label: t.label || t.language || `Subtitles ${t.id}`,
          language: t.language,
          active: t.active,
        })),
      );
    };

    player.addEventListener("variantchanged", emitQualities);
    player.addEventListener("adaptation", emitQualities);
    player.addEventListener("audiotrackchanged", emitAudio);
    player.addEventListener("texttrackchanged", emitText);
    player.addEventListener("error", (event) => {
      const detail = (event as unknown as { detail?: shaka.util.Error }).detail;
      const fatal = !!detail?.severity && detail.severity >= 2;
      this.events.onError?.(detail?.message ?? "Playback error", fatal);
    });
    player.addEventListener("buffering", (event) => {
      const e = event as unknown as { buffering?: boolean };
      const buffered = this.media.buffered.length ? this.media.buffered.end(this.media.buffered.length - 1) - this.media.currentTime : 0;
      this.events.onBuffer?.({ buffered, stall: !!e.buffering, bandwidthEstimate: player.getStats?.().estimatedBandwidth });
    });

    const onLoaded = () => {
      emitQualities();
      emitAudio();
      emitText();
      this.events.onReady?.();
    };
    this.media.addEventListener("loadedmetadata", onLoaded);
    this.listeners.push(() => this.media.removeEventListener("loadedmetadata", onLoaded));
    void shakaNs;
  }

  async load(source: MediaSource, startAt = 0) {
    await this.player.load(source.url, startAt > 0.25 ? startAt : undefined, "application/x-mpegurl");
  }

  selectQuality(id: string) {
    if (id === "auto") {
      this.player.configure({ abr: { enabled: true } });
      return;
    }
    const track = this.player.getVariantTracks().find((t) => String(t.id) === id);
    if (!track) {
      this.player.configure({ abr: { enabled: true } });
      return;
    }
    this.player.configure({ abr: { enabled: false } });
    try {
      this.player.selectVariantTrack(track, true);
    } catch {
      this.player.configure({ abr: { enabled: true } });
    }
  }

  selectAudioTrack(id: string) {
    const track = this.player.getAudioTracks?.().find((t) => String(t.id) === id);
    if (track) this.player.selectAudioTrack(track);
  }

  selectTextTrack(id: string) {
    const track = this.player.getTextTracks?.().find((t) => String(t.id) === id);
    // Present on the player at runtime; the compiled types of 5.x omit it.
    (this.player as unknown as { setTextTrackVisibility?: (visible: boolean) => void }).setTextTrackVisibility?.(true);
    if (track) this.player.selectTextTrack(track);
  }

  setAdaptive(enabled: boolean) {
    this.player.configure({ abr: { enabled } });
  }

  snapshot(): PreservedPlayback {
    return {
      time: this.media.currentTime,
      paused: this.media.paused,
      rate: this.media.playbackRate,
      audioTrackId: this.player.getAudioTracks?.().find((t) => t.active) ? String(this.player.getAudioTracks().find((t) => t.active)?.id) : null,
      textTrackId: this.player.getTextTracks?.().find((t) => t.active) ? String(this.player.getTextTracks().find((t) => t.active)?.id) : null,
      volume: this.media.volume,
      muted: this.media.muted,
    };
  }

  destroy() {
    this.listeners.forEach((off) => off());
    try {
      void this.player.destroy();
    } catch {
      /* the element may already be gone */
    }
  }
}

/* ─────────────────────────────── hls.js engine ─────────────────────────────── */

class HlsPipeline implements MediaPipeline {
  readonly engine = "hlsjs" as const;
  private hls: Hls;
  private media: HTMLVideoElement;

  constructor(hls: Hls, media: HTMLVideoElement, events: EngineEvents) {
    this.hls = hls;
    this.media = media;
    onHls(hls, "hlsManifestParsed", () => {
      const levels = hls.levels ?? [];
      events.onQualities?.([
        { id: "auto", label: "Auto", active: hls.autoLevelEnabled },
        ...levels
          .map((level, i) => ({
            id: String(i),
            label: level.height ? `${level.height}p` : `${Math.round((level.bitrate ?? 0) / 1000)} kbps`,
            height: level.height,
            bitrate: level.bitrate,
            active: i === hls.currentLevel,
          }))
          .filter((level, i, all) => all.findIndex((l) => l.label === level.label) === i),
      ]);
      events.onAudioTracks?.(
        (hls.audioTracks ?? []).map((track, i) => ({
          id: String(i),
          label: track.name || track.lang || `Audio ${i + 1}`,
          language: track.lang ?? "",
          active: i === hls.audioTrack,
        })),
      );
      events.onEmbeddedTextTracks?.(
        (hls.subtitleTracks ?? []).map((track, i) => ({
          id: String(i),
          label: track.name || track.lang || `Subtitles ${i + 1}`,
          language: track.lang ?? "",
          active: i === hls.subtitleTrack,
        })),
      );
      events.onReady?.();
    });
    onHls(hls, "hlsError", (_event: unknown, data: { type: string; details: string; fatal: boolean }) => {
      events.onError?.(`${data.type}: ${data.details}`, !!data.fatal);
      if (data.fatal && data.type === "networkError") hls.startLoad();
    });
    onHls(hls, "hlsFragBuffered", () => {
      const buffered = media.buffered.length ? media.buffered.end(media.buffered.length - 1) - media.currentTime : 0;
      events.onBuffer?.({ buffered, stall: false });
    });
  }

  async load(source: MediaSource, startAt = 0) {
    this.hls.attachMedia(this.media);
    this.hls.loadSource(source.url);
    if (startAt > 0.25) {
      this.media.addEventListener(
        "loadedmetadata",
        () => {
          this.media.currentTime = startAt;
        },
        { once: true },
      );
    }
  }

  selectQuality(id: string) {
    this.hls.currentLevel = id === "auto" ? -1 : Number(id);
  }

  selectAudioTrack(id: string) {
    this.hls.audioTrack = Number(id);
  }

  selectTextTrack(id: string) {
    this.hls.subtitleTrack = Number(id);
  }

  setAdaptive(enabled: boolean) {
    if (enabled) this.hls.currentLevel = -1;
  }

  snapshot(): PreservedPlayback {
    return {
      time: this.media.currentTime,
      paused: this.media.paused,
      rate: this.media.playbackRate,
      audioTrackId: String(this.hls.audioTrack),
      textTrackId: String(this.hls.subtitleTrack),
      volume: this.media.volume,
      muted: this.media.muted,
    };
  }

  destroy() {
    try {
      this.hls.destroy();
    } catch {
      /* ignore */
    }
  }
}

/* ─────────────────────────────── native engine ─────────────────────────────── */

class NativePipeline implements MediaPipeline {
  readonly engine = "native" as const;
  private media: HTMLVideoElement;

  constructor(media: HTMLVideoElement, events: EngineEvents) {
    this.media = media;
    const ready = () => events.onReady?.();
    media.addEventListener("loadedmetadata", ready);
    events.onQualities?.([{ id: "auto", label: "Source", active: true }]);
  }

  async load(source: MediaSource, startAt = 0) {
    this.media.src = source.url;
    this.media.load();
    if (startAt > 0.25) {
      this.media.addEventListener(
        "loadedmetadata",
        () => {
          this.media.currentTime = startAt;
        },
        { once: true },
      );
    }
  }

  selectQuality() {}
  selectAudioTrack() {}
  selectTextTrack() {}
  setAdaptive() {}

  snapshot(): PreservedPlayback {
    return {
      time: this.media.currentTime,
      paused: this.media.paused,
      rate: this.media.playbackRate,
      audioTrackId: null,
      textTrackId: null,
      volume: this.media.volume,
      muted: this.media.muted,
    };
  }

  destroy() {
    this.media.removeAttribute("src");
    this.media.load();
  }
}

/* ──────────────────────────────── factory ──────────────────────────────── */

export interface PipelineOptions extends EngineEvents {
  /** Force a specific engine — used by the engine picker in the player settings. */
  prefer?: "auto" | "shaka" | "hlsjs" | "native";
}

/**
 * Create the pipeline for a source. Adaptive sources try Shaka, then hls.js,
 * then the element itself; progressive sources go straight to the element.
 */
export async function createPipeline(
  media: HTMLVideoElement,
  source: MediaSource,
  options: PipelineOptions = {},
): Promise<MediaPipeline> {
  const prefer = options.prefer ?? "auto";

  if (prefer !== "native" && (isDashUri(source.url) || isHlsUri(source.url))) {
    if (prefer !== "hlsjs") {
      const shakaNs = await loadShaka();
      if (shakaNs) {
        try {
          const player = new shakaNs.Player();
          await player.attach(media);
          const pipeline = new ShakaPipeline(player, media, options);
          await pipeline.load(source);
          return pipeline;
        } catch (error) {
          options.onError?.(`Shaka could not start: ${(error as Error).message}`, false);
        }
      }
    }
    if (isHlsUri(source.url) || prefer === "hlsjs") {
      const HlsNs = await loadHls();
      if (HlsNs) {
        const hls = new HlsNs({ enableWorker: true, lowLatencyMode: false, backBufferLength: 30 });
        const pipeline = new HlsPipeline(hls, media, options);
        await pipeline.load(source);
        return pipeline;
      }
    }
  }

  const native = new NativePipeline(media, options);
  await native.load(source);
  return native;
}

export const PIPELINE_NOTES = {
  shaka: "Shaka Player — DASH + HLS adaptive streaming, ABR, audio/subtitle track switching.",
  hlsjs: "hls.js — HLS fallback used when Shaka is unavailable on this browser.",
  native: "Native media element — progressive files (mp4/webm) and local uploads.",
} as const;
