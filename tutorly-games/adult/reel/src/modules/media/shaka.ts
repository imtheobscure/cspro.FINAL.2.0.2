"use client";

/**
 * Adaptive streaming engine.
 *
 * Shaka Player is the media pipeline for HLS and DASH: it owns manifest parsing,
 * ABR (bitrate switching), audio/text track discovery and buffering, while the
 * app keeps its own chrome, transcript engine and lesson overlay on top. The
 * native `<video>` element stays the renderer for progressive files and for
 * every engine-agnostic API the player controller exposes (time, volume, rate).
 *
 * Nothing here touches React: the controller drives it and mirrors its state
 * into the Zustand store, so the lesson engine, transcript and watch party stay
 * independent of which engine is currently attached.
 */

export type AdaptiveLevel = { id: number; label: string; height: number; bitrate: number; active: boolean };
export type AudioTrackOption = { id: string; label: string; language: string; active: boolean };
export type TextTrackOption = { id: number; label: string; language: string; kind: string; active: boolean };

export type AdaptiveSnapshot = {
  levels: AdaptiveLevel[];
  audioTracks: AudioTrackOption[];
  textTracks: TextTrackOption[];
  /** True while ABR is choosing the rendition itself. */
  autoQuality: boolean;
  /** Rendition currently being played, e.g. "720p · 2.4 Mbps". */
  activeLabel: string;
  loading: boolean;
};

const EMPTY: AdaptiveSnapshot = { levels: [], audioTracks: [], textTracks: [], autoQuality: true, activeLabel: "auto", loading: false };

/** HLS / DASH manifests are handed to Shaka; everything else stays on the element. */
export function isAdaptiveType(type: string | undefined): boolean {
  return type === "hls" || type === "dash";
}

export function normalizeSourceType(type: string | undefined, url: string): "hls" | "dash" | "mp4" | "webm" | "other" {
  const clean = (url.split("?")[0] ?? url).toLowerCase();
  if (type === "hls" || clean.endsWith(".m3u8")) return "hls";
  if (type === "dash" || clean.endsWith(".mpd")) return "dash";
  if (type === "mp4" || clean.endsWith(".mp4") || clean.endsWith(".m4v")) return "mp4";
  if (type === "webm" || clean.endsWith(".webm")) return "webm";
  return "other";
}

type ShakaNamespace = typeof import("shaka-player").default;

let shakaPromise: Promise<ShakaNamespace> | null = null;

/** Loads shaka-player once, browser-side, and installs its polyfills. */
function loadShaka(): Promise<ShakaNamespace> {
  if (!shakaPromise) {
    shakaPromise = import("shaka-player")
      .then((mod) => {
        const shaka = (mod.default ?? mod) as ShakaNamespace;
        shaka.polyfill.installAll();
        return shaka;
      })
      .catch((err) => {
        shakaPromise = null;
        console.error("[adaptive-engine] shaka-player could not be loaded:", err);
        throw err;
      });
  }
  return shakaPromise;
}

export function isAdaptiveSupported(): Promise<boolean> {
  return loadShaka()
    .then((shaka) => shaka.Player.isBrowserSupported())
    .catch(() => false);
}

export type LoadOptions = {
  startTime?: number;
  rate?: number;
  muted?: boolean;
  volume?: number;
  audioLanguage?: string | null;
  textLanguage?: string | null;
  /** Fires whenever the engine's state changes so the controller can mirror it. */
  onChange?: (snapshot: AdaptiveSnapshot) => void;
  /** Fatal engine failures; the controller uses this for source fallback. */
  onError?: (message: string, recoverable: boolean) => void;
};

export class AdaptiveEngine {
  private shaka: ShakaNamespace | null = null;
  private player: import("shaka-player").default.Player | null = null;
  private video: HTMLVideoElement | null = null;
  /** Remembered so the engine can re-attach after a detach (e.g. a fallback to a file). */
  private lastVideo: HTMLVideoElement | null = null;
  private listeners: Array<{ target: EventTarget; type: string; fn: EventListener }> = [];
  private snapshot: AdaptiveSnapshot = { ...EMPTY };
  private change: ((s: AdaptiveSnapshot) => void) | null = null;
  private failure: ((message: string, recoverable: boolean) => void) | null = null;
  /** Langs survive a source switch so a fallback keeps the learner's choices. */
  audioLanguage: string | null = null;
  textLanguage: string | null = null;

  get attached() {
    return !!this.player && !!this.video;
  }

  get current(): AdaptiveSnapshot {
    return this.snapshot;
  }

  /**
   * Remembers the element and the callbacks without creating a Shaka player.
   * Attaching eagerly would make Shaka take over the element's `src` with a
   * MediaSource object URL, which breaks progressive playback — so the engine is
   * only attached when an HLS/DASH manifest is actually loaded (see `load`).
   */
  setElement(video: HTMLVideoElement, opts: LoadOptions = {}) {
    this.lastVideo = video;
    this.video = video;
    this.change = opts.onChange ?? this.change;
    this.failure = opts.onError ?? this.failure;
  }

  async attach(video: HTMLVideoElement, opts: LoadOptions = {}) {
    if (this.video === video && this.player) return;
    this.change = opts.onChange ?? this.change;
    this.failure = opts.onError ?? this.failure;
    if (this.shaka === null) this.shaka = await loadShaka();
    await this.detach();
    this.video = video;
    this.lastVideo = video;
    const shaka = this.shaka;
    const player = new shaka.Player();
    this.player = player;
    await player.attach(video);
    await player.configure({
      abr: { enabled: true, defaultBandwidthEstimate: 1_200_000, switchInterval: 4 },
      streaming: { rebufferingGoal: 2, bufferingGoal: 30, retryParameters: { maxAttempts: 3, baseDelay: 500 } },
      manifest: { retryParameters: { maxAttempts: 3, baseDelay: 500 } },
    });
    const events: [string, EventListener][] = [
      ["adaptation", () => this.refresh()],
      ["variantchanged", () => this.refresh()],
      ["trackschanged", () => this.refresh()],
      ["streaming", () => this.refresh()],
      ["loaded", () => this.refresh()],
      ["error", (event) => {
        const detail = (event as unknown as { detail?: { code?: number; category?: number; message?: string } }).detail;
        const message = detail?.message ?? "Adaptive playback failed";
        // 1001 = BAD_HTTP_STATUS, 1002 = HTTP_ERROR — retrying a dead source is pointless.
        const fatal = detail?.category === 1 && (detail?.code === 1001 || detail?.code === 1002);
        this.failure?.(message, !fatal);
      }],
    ];
    for (const [type, fn] of events) {
      player.addEventListener(type, fn);
      this.listeners.push({ target: player as unknown as EventTarget, type, fn });
    }
  }

  async detach() {
    for (const l of this.listeners) l.target.removeEventListener(l.type, l.fn);
    this.listeners = [];
    const player = this.player;
    this.player = null;
    if (player) {
      // destroy() can reject or hang when the element is being torn down mid-load;
      // the caller only needs the MediaSource released, so never block on it.
      await Promise.race([
        player.destroy().catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
    this.video = null;
    this.snapshot = { ...EMPTY };
  }

  /** Loads an HLS/DASH manifest, restoring position, rate and track choices. */
  async load(url: string, opts: LoadOptions = {}) {
    // Attach on first adaptive load, and re-attach after a detach (a fallback to a
    // progressive file detaches Shaka so the element is free again).
    if (!this.player) {
      const element = this.video ?? this.lastVideo;
      if (!element) throw new Error("Adaptive engine has no media element");
      await this.attach(element, opts);
    }
    const player = this.player;
    if (!player) throw new Error("Adaptive engine is not attached");
    this.change = opts.onChange ?? this.change;
    this.failure = opts.onError ?? this.failure;
    this.snapshot = { ...this.snapshot, loading: true };
    this.refresh();
    const startTime = opts.startTime && opts.startTime > 0.5 ? opts.startTime : undefined;
    // Shaka 5 takes the resume position as a plain number of seconds.
    await player.load(url, startTime ?? null, null);

    const audio = opts.audioLanguage ?? this.audioLanguage;
    if (audio) this.selectAudioTrackFor(audio);
    const text = opts.textLanguage ?? this.textLanguage;
    if (text !== null) this.selectTextTrackFor(text);
    const video = this.video;
    if (video) {
      if (opts.rate) video.playbackRate = opts.rate;
      if (opts.muted !== undefined) video.muted = opts.muted;
      if (opts.volume !== undefined) video.volume = opts.volume;
    }
    this.snapshot = { ...this.snapshot, loading: false };
    this.refresh();
  }

  /** Picks a rendition by id, or returns to automatic ABR. */
  async selectLevel(id: number | null) {
    const player = this.player;
    if (!player) return;
    const config = player.getConfiguration();
    if (id === null) {
      await player.configure({ abr: { ...config.abr, enabled: true } });
    } else {
      const tracks = player.getVariantTracks();
      const track = tracks.find((t) => t.id === id);
      await player.configure({ abr: { ...config.abr, enabled: false } });
      if (track) await player.selectVariantTrack(track, true);
    }
    this.refresh();
  }

  selectAudio(language: string) {
    this.audioLanguage = language;
    this.selectAudioTrackFor(language);
    this.refresh();
  }

  /** Shaka 5 selects concrete track objects rather than language codes. */
  private selectAudioTrackFor(language: string) {
    const player = this.player;
    if (!player) return;
    const track = player.getAudioTracks().find((t) => t.language === language || t.label === language);
    if (track) player.selectAudioTrack(track);
  }

  private selectTextTrackFor(language: string) {
    const player = this.player;
    if (!player) return;
    const track = player.getTextTracks().find((t) => t.language === language || t.label === language);
    if (track) player.selectTextTrack(track);
  }

  selectText(language: string | null) {
    this.textLanguage = language;
    if (!this.player) return;
    if (language === null) this.player.selectTextTrack(null);
    else this.selectTextTrackFor(language);
    this.refresh();
  }

  destroy() {
    return this.detach();
  }

  private refresh() {
    const player = this.player;
    if (!player) {
      this.snapshot = { ...EMPTY };
      this.change?.(this.snapshot);
      return;
    }
    try {
      const variants = player.getVariantTracks();
      const activeId = variants.find((v) => v.active)?.id;
      const levels = variants
        .filter((v) => v.videoId !== undefined || v.height)
        .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))
        .map((v) => ({ id: v.id, label: `${v.height ?? "?"}p`, height: v.height ?? 0, bitrate: v.bandwidth ?? 0, active: v.id === activeId }));
      const audioTracks = variants
        .filter((v) => v.audioId !== undefined || v.language)
        .map((v) => ({
          id: String(v.audioId ?? v.language),
          label: v.label ?? v.language ?? "Original",
          language: v.language ?? "und",
          active: !!v.active,
        }));
      const seenAudio = new Set<string>();
      const audio = audioTracks.filter((a) => (seenAudio.has(a.language) ? false : (seenAudio.add(a.language), true)));

      const textTracks = player.getTextTracks().map((t) => ({
        id: t.id,
        label: t.label ?? t.language ?? "Subtitles",
        language: t.language ?? "und",
        kind: t.kind ?? "subtitles",
        active: t.active,
      }));

      const config = player.getConfiguration();
      const active = variants.find((v) => v.id === activeId);
      const autoQuality = !!config?.abr?.enabled && player.getVariantTracks().length > 1;
      this.snapshot = {
        levels,
        audioTracks: audio,
        textTracks,
        autoQuality: config?.abr?.enabled ?? true,
        activeLabel: active ? `${active.height ?? "?"}p · ${((active.bandwidth ?? 0) / 1_000_000).toFixed(1)} Mbps` : "auto",
        loading: false,
      };
    } catch {
      /* the player was destroyed mid-refresh */
      return;
    }
    this.change?.(this.snapshot);
  }
}
