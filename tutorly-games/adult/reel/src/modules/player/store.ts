"use client";

import { create } from "zustand";
import { EmbedController, parseEmbedUrl, type EmbedHandle } from "@/modules/media/embed";
import { AdaptiveEngine, isAdaptiveType, type AdaptiveLevel, type AdaptiveSnapshot, type AudioTrackOption, type TextTrackOption } from "@/modules/media/shaka";
import { createEventBus, type EventBus } from "./events";

export type SubtitleMode = "off" | "original" | "translation" | "dual";
export type PanelTab = "transcript" | "lesson" | "vocab" | "tutor" | "party";
export type { AdaptiveLevel, AudioTrackOption, TextTrackOption };

/** Which pipeline is currently carrying the media. */
export type PlaybackEngine = "native" | "shaka";

export interface PlayerState {
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
  buffering: boolean;
  buffered: number;
  volume: number;
  muted: boolean;
  rate: number;
  sourceId: string | null;
  sourceUrl: string | null;
  qualityLabel: string;
  /** "shaka" once an HLS/DASH manifest is loaded through the adaptive engine. */
  engine: PlaybackEngine;
  levels: AdaptiveLevel[];
  audioOptions: AudioTrackOption[];
  textOptions: TextTrackOption[];
  autoQuality: boolean;
  adaptiveLabel: string;
  engineLoading: boolean;
  subtitleMode: SubtitleMode;
  subtitleFontSize: "sm" | "md" | "lg";
  subtitleBackground: boolean;
  theater: boolean;
  fullscreen: boolean;
  pip: boolean;
  abLoop: { start: number; end: number } | null;
  controlsVisible: boolean;
  settingsOpen: boolean;
  episodesOpen: boolean;
  shortcutsOpen: boolean;
  panel: PanelTab;
  toast: { id: number; text: string; tone?: "info" | "success" | "warn" } | null;
  set: (patch: Partial<PlayerState>) => void;
  toastMessage: (text: string, tone?: "info" | "success" | "warn") => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTime: 0,
  duration: 0,
  paused: true,
  ended: false,
  buffering: false,
  buffered: 0,
  volume: 1,
  muted: false,
  rate: 1,
  sourceId: null,
  sourceUrl: null,
  qualityLabel: "auto",
  engine: "native",
  levels: [],
  audioOptions: [],
  textOptions: [],
  autoQuality: true,
  adaptiveLabel: "auto",
  engineLoading: false,
  subtitleMode: "dual",
  subtitleFontSize: "md",
  subtitleBackground: true,
  theater: false,
  fullscreen: false,
  pip: false,
  abLoop: null,
  controlsVisible: true,
  settingsOpen: false,
  episodesOpen: false,
  shortcutsOpen: false,
  panel: "transcript",
  toast: null,
  set: (patch) => set(patch),
  toastMessage: (text, tone = "info") => set({ toast: { id: Date.now(), text, tone } }),
}));

// Dev aid: the player store is reachable from the console/preview tooling so engine
// state (active pipeline, ABR levels, tracks) can be inspected without a debugger.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __tutoflixPlayer?: unknown }).__tutoflixPlayer = usePlayerStore;
}

export type SourceDescriptor = { id: string; url: string; type: string; label: string; qualityLabel?: string };

/**
 * Engine-agnostic controller around the media element.
 *
 * Progressive files play on the element itself; HLS and DASH manifests are routed
 * through Shaka (see modules/media/shaka.ts) so the learner gets real ABR and the
 * manifest's own audio/text tracks. Everything above this class — lesson engine,
 * transcript, watch party — only depends on the event bus and the store, so the
 * engine in play never leaks into their code.
 */
export class PlayerController {
  readonly bus: EventBus = createEventBus();
  readonly adaptive = new AdaptiveEngine();
  /**
   * Platform-hosted sources (YouTube, Dailymotion, Vimeo) are driven through this
   * instead of the element. See modules/media/embed.ts for why they cannot be
   * played any other way: the platform licenses playback inside its own player.
   */
  readonly embed = new EmbedController();
  private embedHandle: EmbedHandle | null = null;
  private video: HTMLVideoElement | null = null;
  private raf = 0;
  private cleanup: (() => void) | null = null;
  private sources: SourceDescriptor[] = [];
  private sourceIndex = 0;
  private pendingResume: { time: number; play: boolean } | null = null;
  seekGuard: ((from: number, to: number) => number) | null = null;
  onSourceFallback: ((from: SourceDescriptor, to: SourceDescriptor) => void) | null = null;

  get element() {
    return this.video;
  }
  /** True when the active source is carried by a platform embed. */
  get isEmbed() {
    return this.embedHandle !== null;
  }
  get currentTime() {
    return this.isEmbed ? this.embed.readTime() : (this.video?.currentTime ?? 0);
  }
  /** Position the player is resuming to while a source switch is in flight. */
  get resumeTarget() {
    return this.pendingResume?.time ?? this.currentTime;
  }
  /** True when the current source is carried by Shaka. */
  get isAdaptive() {
    return usePlayerStore.getState().engine === "shaka";
  }

  /**
   * Binds to the iframe the player rendered for an embed source.
   *
   * Everything the platforms report — play, pause, position, duration, buffer state
   * — is mirrored into the same store and bus the `<video>` path uses, so the
   * timeline, transcript, activity triggers and watch party keep working without
   * knowing which kind of source is underneath.
   */
  async attachEmbed(iframe: HTMLIFrameElement, src: SourceDescriptor): Promise<void> {
    const handle = parseEmbedUrl(src.url);
    if (!handle) {
      this.bus.emit("ERROR", { message: `“${src.label}” is not a recognised YouTube, Dailymotion or Vimeo embed.` });
      usePlayerStore.getState().toastMessage("This embedded source could not be recognised", "warn");
      return;
    }
    this.embedHandle = handle;
    const store = usePlayerStore.getState();
    store.set({ engine: "native", levels: [], audioOptions: [], textOptions: [], adaptiveLabel: "auto", engineLoading: true });
    await this.embed.attach(iframe, handle, {
      onReady: (duration) => {
        usePlayerStore.getState().set({ duration, engineLoading: false, buffering: false });
      },
      onTime: (time, duration) => {
        usePlayerStore.getState().set({ currentTime: time, duration: duration || usePlayerStore.getState().duration });
        this.bus.emit("TIME_UPDATE", { time });
      },
      onPlay: () => {
        usePlayerStore.getState().set({ paused: false, ended: false, buffering: false });
        this.bus.emit("PLAY", { time: this.embed.readTime() });
        this.startLoop();
      },
      onPause: () => {
        usePlayerStore.getState().set({ paused: true });
        this.bus.emit("PAUSE", { time: this.embed.readTime() });
        this.stopLoop();
        this.tick();
      },
      onEnded: () => {
        usePlayerStore.getState().set({ ended: true, paused: true });
        this.bus.emit("ENDED", { time: this.embed.readTime() });
      },
      onBuffering: (buffering) => usePlayerStore.getState().set({ buffering, engineLoading: false }),
      onError: (message) => {
        usePlayerStore.getState().set({ engineLoading: false, buffering: false });
        this.bus.emit("ERROR", { message });
        usePlayerStore.getState().toastMessage(message, "warn");
      },
      onSilentPlatform: (message) => {
        // The picture plays but the platform never answered, so lesson sync, loops and
        // caption timing cannot follow it. Explain that instead of showing a frozen
        // 0:00 timeline as if the app had lost the video.
        usePlayerStore.getState().set({ engineLoading: false, buffering: false });
        this.bus.emit("ERROR", { message });
        usePlayerStore.getState().toastMessage(message, "warn");
      },
    });
    // Preferences are primed rather than sent: the platform player may not have
    // booted yet, and both platforms drop messages posted before that.
    const state = usePlayerStore.getState();
    this.embed.prime({ volume: state.volume, muted: state.muted, rate: state.rate });
    if (this.pendingResume && this.pendingResume.time > 0) {
      this.embed.setStartAt(this.pendingResume.time);
      this.pendingResume = null;
    }
  }

  detachEmbed() {
    this.embed.detach();
    this.embedHandle = null;
    this.stopLoop();
  }

  attach(video: HTMLVideoElement) {
    if (this.video === video) return;
    this.detach();
    this.video = video;
    this.adaptive.setElement(video, {
      onChange: (snapshot) => this.mirrorAdaptive(snapshot),
      onError: (message, recoverable) => this.handleEngineError(message, recoverable),
    });
    const s = usePlayerStore.getState();
    video.volume = s.volume;
    video.muted = s.muted;
    video.playbackRate = s.rate;
    const set = (patch: Partial<PlayerState>) => usePlayerStore.getState().set(patch);

    const onPlay = () => {
      set({ paused: false, ended: false });
      this.bus.emit("PLAY", { time: video.currentTime });
      this.startLoop();
    };
    const onPause = () => {
      set({ paused: true });
      this.bus.emit("PAUSE", { time: video.currentTime });
      this.stopLoop();
      this.tick();
    };
    const onEnded = () => {
      set({ ended: true, paused: true });
      this.bus.emit("ENDED", { time: video.currentTime });
    };
    const onMeta = () => {
      set({ duration: video.duration || 0 });
      this.applyPendingResume(video);
    };
    const onCanPlayResume = () => this.applyPendingResume(video);
    const onWaiting = () => set({ buffering: true });
    const onCanPlay = () => set({ buffering: false });
    const onVolume = () => set({ volume: video.volume, muted: video.muted });
    const onRate = () => {
      set({ rate: video.playbackRate });
      this.bus.emit("PLAYBACK_RATE_CHANGE", { rate: video.playbackRate });
    };
    const onProgress = () => {
      try {
        const b = video.buffered;
        if (b.length) set({ buffered: b.end(b.length - 1) });
      } catch {
        /* ignore */
      }
    };
    const onError = () => {
      // The element only errors for progressive sources now; HLS/DASH failures
      // arrive through the adaptive engine's own error channel.
      if (this.isAdaptive && this.adaptive.attached) {
        this.bus.emit("ERROR", { message: "The adaptive stream reported an element error" });
        return;
      }
      if (!this.fallbackToNextSource()) {
        this.bus.emit("ERROR", { message: "The video could not be loaded from any authorized source." });
        usePlayerStore.getState().toastMessage("Playback error: no working source available", "warn");
      }
    };
    const onEnterPip = () => set({ pip: true });
    const onLeavePip = () => set({ pip: false });

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("canplay", onCanPlayResume);
    video.addEventListener("seeked", onCanPlayResume);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onCanPlay);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("ratechange", onRate);
    video.addEventListener("progress", onProgress);
    video.addEventListener("error", onError);
    video.addEventListener("enterpictureinpicture", onEnterPip);
    video.addEventListener("leavepictureinpicture", onLeavePip);
    this.cleanup = () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("canplay", onCanPlayResume);
      video.removeEventListener("seeked", onCanPlayResume);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onCanPlay);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("ratechange", onRate);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("error", onError);
      video.removeEventListener("enterpictureinpicture", onEnterPip);
      video.removeEventListener("leavepictureinpicture", onLeavePip);
    };
    if (video.readyState >= 1) onMeta();
  }

  detach() {
    this.stopLoop();
    this.cleanup?.();
    this.cleanup = null;
    void this.adaptive.detach();
    this.video = null;
  }

  private startLoop() {
    this.stopLoop();
    const loop = () => {
      this.tick();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  private stopLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
  private lastTick = -1;
  private tick() {
    const v = this.video;
    if (!v) return;
    // An embed reports its own position; the platform is the source of truth.
    if (this.isEmbed) {
      const t = this.embed.readTime();
      if (Math.abs(t - this.lastTick) >= 0.2) {
        this.lastTick = t;
        usePlayerStore.getState().set({ currentTime: t });
        this.bus.emit("TIME_UPDATE", { time: t });
      }
      return;
    }
    const t = v.currentTime;
    const loop = usePlayerStore.getState().abLoop;
    if (loop && t >= loop.end) {
      v.currentTime = loop.start;
      return;
    }
    if (Math.abs(t - this.lastTick) >= 0.08) {
      this.lastTick = t;
      usePlayerStore.getState().set({ currentTime: t });
      this.bus.emit("TIME_UPDATE", { time: t });
    }
  }

  /** Adaptive manifests are always playable now that Shaka is the pipeline. */
  canPlay(src: SourceDescriptor) {
    // An embed plays in the platform's own player, so the browser only needs to be
    // able to load an iframe — always true — and the platform still has to allow it.
    if (src.type === "embed") return parseEmbedUrl(src.url) !== null;
    if (isAdaptiveType(src.type)) return true;
    if (src.type === "mp4" || src.type === "webm" || src.type === "audio") return true;
    if (!this.video) return true;
    return this.video.canPlayType(`video/${src.type}`) !== "";
  }

  /**
   * Chooses the source to start from. An explicit preference wins, otherwise the
   * provider's own ordering is respected (the catalog lists its safest stream
   * first); adaptive manifests are what the fallback chain uses when a file fails.
   */
  setSources(sources: SourceDescriptor[], preferredId?: string | null) {
    this.sources = sources;
    const playable = sources.filter((s) => this.canPlay(s));
    const preferred = playable.find((s) => s.id === preferredId);
    const pick = preferred ?? playable[0] ?? sources[0];
    this.sourceIndex = sources.indexOf(pick);
    return pick;
  }

  loadSource(src: SourceDescriptor, resumeAt?: number, play?: boolean) {
    const v = this.video;
    if (!v) return;
    const time = resumeAt ?? this.resumeTime();
    const shouldPlay = play ?? (!this.isEmbed && !v.paused);
    this.pendingResume = { time, play: shouldPlay };
    this.sourceIndex = Math.max(0, this.sources.indexOf(src));
    const store = usePlayerStore.getState();
    store.set({ sourceId: src.id, sourceUrl: src.url, qualityLabel: src.qualityLabel ?? "auto" });

    if (src.type === "embed") {
      // The component re-renders the iframe for the new id and calls attachEmbed;
      // resetting the element here is what makes that swap reliable.
      this.detachEmbed();
      if (!this.adaptive.attached) {
        v.removeAttribute("src");
        try {
          v.load();
        } catch {
          /* an element with no source is already in the state we want */
        }
      }
      store.set({ engine: "native", engineLoading: true, levels: [], audioOptions: [], textOptions: [], duration: 0 });
      this.bus.emit("SOURCE_CHANGE", { sourceId: src.id, reason: "user" });
      return;
    }
    if (this.isEmbed) this.detachEmbed();

    if (isAdaptiveType(src.type)) {
      store.set({ engine: "shaka", engineLoading: true, qualityLabel: src.qualityLabel ?? "auto" });
      void this.adaptive
        .load(src.url, { startTime: time, rate: v.playbackRate, muted: v.muted, volume: v.volume })
        .then(() => {
          if (shouldPlay) void v.play().catch(() => undefined);
        })
        .catch((err: Error) => this.handleEngineError(err?.message ?? "Adaptive playback failed", false));
      return;
    }

    store.set({ engine: "native", levels: [], audioOptions: [], textOptions: [], adaptiveLabel: "auto", engineLoading: false });
    const start = () => {
      // Track/volume choices belong to the element, not the engine: re-apply them
      // after an engine swap so a fallback keeps what the learner set.
      v.playbackRate = store.rate;
      v.volume = store.volume;
      v.muted = store.muted;
      v.src = src.url;
      v.load();
      // Retry the resume position: tearing down a MediaSource can reset the element
      // just after the seek, and only the events are too early to catch that.
      setTimeout(() => this.applyPendingResume(v), 700);
      setTimeout(() => this.applyPendingResume(v), 2000);
    };
    if (this.adaptive.attached) {
      // Shaka owns the element through a MediaSource while attached; detach first or
      // the browser aborts the progressive load we are switching to.
      void this.adaptive.detach().then(start);
    } else start();
  }

  /**
   * The position a source switch should resume from. A failed adaptive load tears
   * the element down, which resets `currentTime` to 0 — the store still holds the
   * last real position, so trust whichever value is further along.
   */
  private resumeTime(): number {
    const elementTime = this.video?.currentTime ?? 0;
    const stored = usePlayerStore.getState().currentTime;
    if (elementTime > 1) return elementTime;
    return stored > elementTime ? stored : elementTime;
  }

  /**
   * Re-applies a pending resume position after a source switch. A new media
   * element (or a torn-down MediaSource) can drop the first seek, so this runs on
   * every metadata/canplay/seeked event until the position actually sticks.
   */
  private applyPendingResume(video: HTMLVideoElement) {
    const pending = this.pendingResume;
    if (!pending) return;
    if (Math.abs(video.currentTime - pending.time) > 1.5 && video.readyState >= 1) {
      try {
        video.currentTime = pending.time;
      } catch {
        return; // duration still unknown — try again on the next event
      }
    }
    if (Math.abs(video.currentTime - pending.time) <= 1.5) {
      if (pending.play) void video.play().catch(() => undefined);
      this.pendingResume = null;
    }
  }

  /**
   * Moves to the next authorized source, preserving position, rate and track
   * choices. Candidates are tried after the current index first, then wrapped
   * around, because the preferred source is often the *last* entry (an adaptive
   * manifest deliberately outranks the progressive files).
   */
  private fallbackToNextSource() {
    const v = this.video;
    if (!v) return false;
    const from = this.sources[this.sourceIndex];
    const ordered = [...this.sources.slice(this.sourceIndex + 1), ...this.sources.slice(0, this.sourceIndex)];
    const next = ordered.find((src) => this.canPlay(src));
    if (!from || !next) return false;
    const time = this.resumeTime();
    const play = !v.paused;
    this.sourceIndex = this.sources.indexOf(next);
    this.loadSource(next, time, play);
    this.onSourceFallback?.(from, next);
    this.bus.emit("SOURCE_CHANGE", { sourceId: next.id, reason: "fallback" });
    return true;
  }

  private handleEngineError(message: string, recoverable: boolean) {
    console.warn("[playback] engine error:", message, recoverable ? "(recoverable)" : "(fatal — trying the next source)");
    this.bus.emit("ERROR", { message });
    if (recoverable) {
      usePlayerStore.getState().toastMessage(`Playback issue: ${message}`, "warn");
      return;
    }
    if (!this.fallbackToNextSource()) usePlayerStore.getState().toastMessage("Playback error: no working source available", "warn");
  }

  private mirrorAdaptive(snapshot: AdaptiveSnapshot) {
    usePlayerStore.getState().set({
      levels: snapshot.levels,
      audioOptions: snapshot.audioTracks,
      textOptions: snapshot.textTracks,
      autoQuality: snapshot.autoQuality,
      adaptiveLabel: snapshot.activeLabel,
      engineLoading: snapshot.loading,
    });
  }

  /** Quality selection: a level id pins the rendition, `null` returns to ABR. */
  setLevel(id: number | null) {
    if (!this.isAdaptive) return;
    void this.adaptive.selectLevel(id);
    usePlayerStore.getState().set({ qualityLabel: id === null ? "auto" : (this.adaptive.current.levels.find((l) => l.id === id)?.label ?? "auto") });
    this.bus.emit("QUALITY_CHANGE", { quality: id === null ? "auto" : String(id) });
  }

  selectAudio(language: string) {
    void this.adaptive.selectAudio(language);
    this.bus.emit("AUDIO_CHANGE", { trackId: language });
  }

  /** Selects a text track from the manifest itself (distinct from app subtitles). */
  selectManifestText(language: string | null) {
    void this.adaptive.selectText(language);
  }

  play() {
    if (this.isEmbed) {
      this.embed.play();
      return Promise.resolve();
    }
    return this.video?.play().catch(() => undefined);
  }
  pause() {
    if (this.isEmbed) {
      this.embed.pause();
      return;
    }
    this.video?.pause();
  }
  toggle() {
    if (this.isEmbed) {
      if (usePlayerStore.getState().paused) this.embed.play();
      else this.embed.pause();
      return;
    }
    if (!this.video) return;
    if (this.video.paused) void this.play();
    else this.pause();
  }
  seek(to: number, source: "user" | "sync" | "engine" = "user") {
    const v = this.video;
    if (!v) return;
    if (this.isEmbed) {
      const from = this.embed.readTime();
      const duration = usePlayerStore.getState().duration;
      let target = Math.max(0, duration > 0 ? Math.min(to, duration - 0.05) : to);
      if (source === "user" && this.seekGuard) target = this.seekGuard(from, target);
      this.embed.seek(target);
      this.lastTick = -1;
      usePlayerStore.getState().set({ currentTime: target, ended: false });
      this.bus.emit("SEEK", { from, to: target, source });
      this.bus.emit("TIME_UPDATE", { time: target });
      return;
    }
    const from = v.currentTime;
    const max = Number.isFinite(v.duration) && v.duration > 0 ? v.duration - 0.05 : Infinity;
    let target = Math.max(0, Math.min(to, max));
    if (source === "user" && this.seekGuard) target = this.seekGuard(from, target);
    v.currentTime = target;
    this.lastTick = -1;
    usePlayerStore.getState().set({ currentTime: target, ended: false });
    this.bus.emit("SEEK", { from, to: target, source });
    this.bus.emit("TIME_UPDATE", { time: target });
  }
  skip(delta: number) {
    this.seek(this.currentTime + delta);
  }
  setRate(rate: number) {
    if (this.isEmbed) this.embed.setRate(rate);
    else if (this.video) this.video.playbackRate = rate;
    usePlayerStore.getState().set({ rate });
  }
  setVolume(volume: number) {
    const v = Math.max(0, Math.min(1, volume));
    if (this.isEmbed) {
      this.embed.setVolume(v);
      if (v > 0) {
        this.embed.setMuted(false);
        usePlayerStore.getState().set({ volume: v, muted: false });
      } else {
        usePlayerStore.getState().set({ volume: v });
      }
      return;
    }
    if (!this.video) return;
    this.video.volume = v;
    if (volume > 0) this.video.muted = false;
  }
  setMuted(muted: boolean) {
    if (this.isEmbed) {
      this.embed.setMuted(muted);
      usePlayerStore.getState().set({ muted });
      return;
    }
    if (this.video) this.video.muted = muted;
  }
  /** Play a time range once (used by sentence replay and voice-over), optionally muted / slowed. */
  playRange(start: number, end: number, opts: { rate?: number; muted?: boolean } = {}) {
    const v = this.video;
    if (!v) return;
    const prevRate = v.playbackRate;
    const prevMuted = v.muted;
    v.playbackRate = opts.rate ?? prevRate;
    if (opts.muted !== undefined) v.muted = opts.muted;
    this.seek(start, "engine");
    void v.play().catch(() => undefined);
    const stop = () => {
      if (v.currentTime >= end - 0.02) {
        v.pause();
        v.playbackRate = prevRate;
        v.muted = prevMuted;
        usePlayerStore.getState().set({ rate: prevRate });
        v.removeEventListener("timeupdate", stop);
        off();
      }
    };
    const off = this.bus.on("TIME_UPDATE", () => stop());
    v.addEventListener("timeupdate", stop);
  }
  async togglePip() {
    const v = this.video as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null;
    if (!v) return;
    const doc = document as Document & { pictureInPictureElement?: Element | null; exitPictureInPicture?: () => Promise<void> };
    try {
      if (doc.pictureInPictureElement) await doc.exitPictureInPicture?.();
      else await v.requestPictureInPicture?.();
    } catch {
      usePlayerStore.getState().toastMessage("Picture-in-Picture is not available here", "warn");
    }
  }
  async toggleFullscreen(container: HTMLElement | null) {
    if (!container) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await container.requestFullscreen();
    } catch {
      usePlayerStore.getState().toastMessage("Fullscreen is not available here", "warn");
    }
  }
}
