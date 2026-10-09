/**
 * The playback engine hook — where the Media Platform actually runs.
 *
 * Responsibilities, all of them in one place so no component ever touches
 * `<video>` directly:
 *
 *   • pick a source (SourceResolver) and build the pipeline for its kind:
 *     Shaka Player for HLS/DASH, hls.js as the HLS fallback, the element itself
 *     for progressive files;
 *   • mirror element state into the player store (a 200 ms sampler plus the real
 *     element events — a rAF loop would stall in a hidden tab or a preview pane);
 *   • keep the pipeline's track lists (quality/audio/text) in the store;
 *   • FALL BACK on a fatal error while preserving time, rate, tracks and volume,
 *     which is the whole point of `PreservedPlayback`;
 *   • register the imperative controller from `control.ts` and publish the
 *     structured media events other layers subscribe to.
 *
 * The element is rendered by the caller (inside Vidstack's `MediaProvider`), so
 * Vidstack still owns the DOM/chrome while Shaka owns the bytes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Episode, MediaSource, MediaTrack, SubtitleCue } from "../../types";
import { usePlayerStore } from "../../store/player";
import { events } from "../events";
import { attachTranslations, cuesOf, trackPair } from "../subtitles";
import { registerMediaController, registerPipeline } from "./control";
import { EmbedController, parseEmbedUrl } from "./embed";
import { isEmbedKind } from "./sources";
import { SourceResolver, buildCandidates, detectKind } from "./sources";
import { createPipeline, type MediaPipeline } from "./pipeline";

/** Playback rate the media element can actually accept (0 or NaN means "unknown"). */
export function safeRate(value: number | undefined): number {
  return Number.isFinite(value) && (value as number) > 0.05 ? Math.min(4, value as number) : 1;
}

export interface EngineOptions {
  preferEngine?: "auto" | "shaka" | "hlsjs" | "native";
  autoPlay?: boolean;
  /** Called when a source dies and the next candidate takes over. */
  onFallback?: (info: { from: string; to: string; restoredTime: number }) => void;
}

export interface EngineHandle {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /**
   * Set when the active source is a platform-hosted video (YouTube, Dailymotion,
   * Vimeo). The player then renders the platform's own player in an iframe pointed at
   * this ref instead of using the `<video>` element — those platforms license
   * playback only inside their own player.
   */
  embedRef: React.RefObject<HTMLIFrameElement | null>;
  embedUrl: string | null;
  ready: boolean;
  /** Non-fatal notices worth showing the teacher (fallbacks, engine swaps). */
  notice: string | null;
  sources: MediaSource[];
  activeSourceId: string | null;
  retry: () => void;
  selectSource: (id: string) => void;
}

let sourceSwitcher: ((id: string) => void) | null = null;

/** Switch playback source from anywhere (the source menu, a deep link, the fallback flow). */
export function switchSource(id: string): void {
  sourceSwitcher?.(id);
}

export function usePlaybackEngine(episode: Episode | null, options: EngineOptions = {}): EngineHandle {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pipelineRef = useRef<MediaPipeline | null>(null);
  const resolverRef = useRef<SourceResolver | null>(null);
  const sessionRef = useRef(0);
  /** The platform player for an embed source — see lib/media/embed.ts. */
  const embedRef = useRef<HTMLIFrameElement | null>(null);
  const embedControllerRef = useRef<EmbedController | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);

  const preferEngine = options.preferEngine ?? "auto";
  const sources = episode ? buildCandidates(episode.sources) : [];

  /* ── pipeline lifecycle: build, attach, tear down ───────────────────────── */
  const mount = useCallback(
    async (source: MediaSource, startAt: number) => {
      const video = videoRef.current;
      if (!video) return;
      const session = ++sessionRef.current;

      pipelineRef.current?.destroy();
      pipelineRef.current = null;
      registerPipeline(null);
      setReady(false);
      setActiveSourceId(source.id);
      usePlayerStore.getState().setSource(source.id, "none");
      usePlayerStore.getState().setFallback(null);
      events.emit("media:source", { sourceId: source.id, url: source.url, kind: detectKind(source.url) });

      // Platform-hosted video: there is no file to fetch. Handing the id to the
      // platform's own player is the only licensed way to play it, so the pipeline is
      // skipped entirely and the player surface renders the embed instead.
      if (isEmbedKind(detectKind(source.url))) {
        // The file pipeline was already torn down above; there is nothing left to
        // destroy here, only the embed controller to hand over.
        embedControllerRef.current?.detach();
        embedControllerRef.current = null;
        setEmbedUrl(source.url);
        usePlayerStore.getState().setTransport({
          ready: true,
          duration: episode?.durationSeconds || 0,
          time: startAt > 0.25 ? startAt : 0,
          waiting: false,
        });
        setReady(true);
        return;
      }
      // Leaving an embed for a real file: release the platform player first.
      embedControllerRef.current?.detach();
      embedControllerRef.current = null;
      setEmbedUrl(null);

      let attempts = 0;
      let candidate: MediaSource | null = source;

      while (candidate && attempts < 4) {
        attempts += 1;
        const current = candidate;
        try {
          const pipeline = await createPipeline(video, current, {
            prefer: preferEngine,
            onError: (message, fatal) => {
              events.emit("media:error", { sourceId: current.id, message, fatal });
              if (!fatal) setNotice(message);
            },
            onQualities: (qualities) => usePlayerStore.getState().setTracks({ qualities }),
            onAudioTracks: (tracks) => usePlayerStore.getState().setTracks({ audioTracks: tracks }),
            onEmbeddedTextTracks: (tracks) => usePlayerStore.getState().setTracks({ embeddedTextTracks: tracks }),
            onBuffer: ({ buffered, stall, bandwidthEstimate }) =>
              usePlayerStore.getState().setTransport({ buffered, waiting: stall, bandwidth: bandwidthEstimate }),
            onReady: () => {
              if (session !== sessionRef.current) return;
              setReady(true);
              usePlayerStore.getState().setTransport({
                ready: true,
                duration: video.duration || episode?.durationSeconds || 0,
                // Reading `playbackRate` the moment metadata lands gives 0 in some
                // Chromium builds (MSE attached, media not started yet). Never let
                // that leak into the UI or the persisted preferences.
                rate: safeRate(video.playbackRate),
                volume: video.volume,
                muted: video.muted,
              });
              events.emit("media:ready", {
                sourceId: current.id,
                engine: pipeline.engine,
                duration: video.duration || 0,
                qualities: usePlayerStore.getState().qualities.length,
                audioTracks: usePlayerStore.getState().audioTracks.length,
                textTracks: usePlayerStore.getState().embeddedTextTracks.length,
              });
            },
          });
          if (session !== sessionRef.current) {
            pipeline.destroy();
            return;
          }
          pipelineRef.current = pipeline;
          registerPipeline(pipeline);
          usePlayerStore.getState().setSource(current.id, pipeline.engine);
          // Restore what the learner chose before the swap.
          const state = usePlayerStore.getState();
          video.playbackRate = safeRate(state.rate);
          video.volume = state.volume;
          video.muted = state.muted;
          if (startAt > 0.25 && Math.abs((video.currentTime || 0) - startAt) > 0.5) video.currentTime = startAt;
          if (options.autoPlay) void video.play().catch(() => undefined);
          return;
        } catch (error) {
          events.emit("media:error", { sourceId: current.id, message: (error as Error).message, fatal: true });
          candidate = resolverRef.current?.next() ?? null;
          if (candidate) {
            const restored = usePlayerStore.getState().time;
            setNotice(`“${current.label}” failed — switched to “${candidate.label}”.`);
            options.onFallback?.({ from: current.label, to: candidate.label, restoredTime: restored });
            events.emit("media:fallback", { from: current.label, to: candidate.label, restoredTime: restored });
          }
        }
      }
      setNotice(`No playable source for “${episode?.title ?? "this episode"}”. Add one in the library.`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [episode?.id, preferEngine],
  );

  /* ── (re)build when the episode changes ────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!episode || !video) return;
    const resolver = new SourceResolver(buildCandidates(episode.sources));
    resolverRef.current = resolver;
    const first = resolver.current;
    if (first) void mount(first, 0);
    return () => {
      sessionRef.current += 1;
      pipelineRef.current?.destroy();
      pipelineRef.current = null;
      registerPipeline(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode?.id]);

  /* ── element state → store ─────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const sample = () => {
      const state = usePlayerStore.getState();
      const duration = Number.isFinite(video.duration) ? video.duration : state.duration;
      let buffered = 0;
      try {
        if (video.buffered.length) buffered = video.buffered.end(video.buffered.length - 1);
      } catch {
        buffered = 0;
      }
      state.setTransport({
        time: video.currentTime || 0,
        duration: Math.max(duration, 0),
        playing: !video.paused && !video.ended,
        waiting: video.readyState < 3 && !video.paused,
        buffered,
      });
    };

    const onEvent = () => sample();
    const timer = window.setInterval(sample, 200);
    for (const type of ["play", "playing", "pause", "timeupdate", "durationchange", "loadedmetadata", "waiting", "canplay", "ended", "ratechange", "volumechange", "seeking", "seeked", "progress"] as const) {
      video.addEventListener(type, onEvent);
    }
    sample();
    return () => {
      window.clearInterval(timer);
      for (const type of ["play", "playing", "pause", "timeupdate", "durationchange", "loadedmetadata", "waiting", "canplay", "ended", "ratechange", "volumechange", "seeking", "seeked", "progress"] as const) {
        video.removeEventListener(type, onEvent);
      }
    };
  }, [episode?.id]);

  /* ── the imperative controller every component uses ────────────────────── */
  useEffect(() => {
    const clearRange = { current: null as number | null };
    /** The platform player, when one is in charge. */
    const embed = () => embedControllerRef.current;
    registerMediaController({
      play: () => {
        const player = embed();
        if (player) return player.play();
        void videoRef.current?.play().catch(() => undefined);
      },
      pause: () => {
        const player = embed();
        if (player) return player.pause();
        videoRef.current?.pause();
      },
      toggle: () => {
        const player = embed();
        if (player) {
          if (usePlayerStore.getState().playing) player.pause();
          else player.play();
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) void video.play().catch(() => undefined);
        else video.pause();
      },
      seek: (time) => {
        const player = embed();
        if (player) {
          const duration = usePlayerStore.getState().duration;
          const target = Math.max(0, duration > 0 ? Math.min(time, duration - 0.05) : time);
          player.seek(target);
          usePlayerStore.getState().setTransport({ time: target });
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        const max = Number.isFinite(video.duration) ? video.duration - 0.05 : time;
        video.currentTime = Math.max(0, Math.min(time, max));
        usePlayerStore.getState().setTransport({ time: video.currentTime });
      },
      seekBy: (delta) => {
        const player = embed();
        if (player) {
          const now = player.readTime();
          const duration = usePlayerStore.getState().duration;
          const target = Math.max(0, Math.min(now + delta, (duration || Infinity) - 0.05));
          player.seek(target);
          usePlayerStore.getState().setTransport({ time: target });
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.max(0, Math.min(video.currentTime + delta, (video.duration || Infinity) - 0.05));
      },
      setRate: (rate) => {
        const player = embed();
        if (player) {
          player.setRate(safeRate(rate));
          return;
        }
        if (videoRef.current) videoRef.current.playbackRate = safeRate(rate);
      },
      setVolume: (volume, muted) => {
        const player = embed();
        const level = Math.max(0, Math.min(1, volume));
        if (player) {
          player.setVolume(level);
          if (typeof muted === "boolean") player.setMuted(muted);
          return;
        }
        if (!videoRef.current) return;
        videoRef.current.volume = level;
        if (typeof muted === "boolean") videoRef.current.muted = muted;
      },
      duration: () => embed()?.duration || videoRef.current?.duration || usePlayerStore.getState().duration || 0,
      time: () => embed()?.readTime() ?? videoRef.current?.currentTime ?? 0,
      playing: () => {
        const player = embed();
        if (player) return usePlayerStore.getState().playing;
        return !!videoRef.current && !videoRef.current.paused;
      },
      playRange: (start, end, opts) => {
        const player = embed();
        if (player) {
          // Sentence replay on a platform player: seek, play, then stop at the end by
          // watching the position the platform reports.
          player.seek(start);
          if (opts?.slow) player.setRate(0.7);
          player.play();
          if (clearRange.current) window.clearInterval(clearRange.current);
          clearRange.current = window.setInterval(() => {
            const at = player.readTime();
            if (at >= end - 0.15 || !usePlayerStore.getState().playing) {
              if (clearRange.current) window.clearInterval(clearRange.current);
              clearRange.current = null;
              player.pause();
              if (opts?.slow) player.setRate(safeRate(usePlayerStore.getState().rate));
            }
          }, 120);
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        if (clearRange.current) window.clearInterval(clearRange.current);
        const previousRate = safeRate(video.playbackRate);
        if (opts?.slow) video.playbackRate = Math.min(previousRate, 0.7);
        video.currentTime = start;
        void video.play().catch(() => undefined);
        clearRange.current = window.setInterval(() => {
          if (video.currentTime >= end || video.paused) {
            if (clearRange.current) window.clearInterval(clearRange.current);
            clearRange.current = null;
            video.pause();
            if (opts?.slow) video.playbackRate = previousRate;
          }
        }, 60);
      },
    });
    const unsubscribe = onSourceSwitch((id) => {
      const resolver = resolverRef.current;
      if (!resolver) return;
      const snapshot = pipelineRef.current?.snapshot();
      const next = resolver.select(id);
      if (!next) return;
      void mount(next, snapshot?.time ?? videoRef.current?.currentTime ?? 0);
    });
    return () => {
      unsubscribe();
      if (clearRange.current) window.clearInterval(clearRange.current);
      registerMediaController(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode?.id]);

  useEffect(() => {
    sourceSwitcher = (id) => switchListeners.forEach((fn) => fn(id));
    return () => {
      sourceSwitcher = null;
    };
  }, []);

  /*
   * Embed lifecycle.
   *
   * The platform's own player is attached to the iframe the surface rendered, and
   * everything it reports — play, pause, position, duration, buffering — is mirrored
   * into the same store the `<video>` path writes to. That is what keeps the
   * timeline, transcript, activity triggers and watch-party sync working on a
   * YouTube or Dailymotion video without any of them knowing the difference.
   */
  useEffect(() => {
    const iframe = embedRef.current;
    if (!embedUrl || !iframe) return;
    const handle = parseEmbedUrl(embedUrl);
    if (!handle) {
      setNotice("This source is not a YouTube, Dailymotion or Vimeo video, so there is no official player for it.");
      return;
    }

    const controller = new EmbedController();
    embedControllerRef.current = controller;
    const store = usePlayerStore.getState();
    let tickTimer = 0;

    void controller.attach(iframe, handle, {
      onReady: (duration) => {
        usePlayerStore.getState().setTransport({ ready: true, duration: duration || usePlayerStore.getState().duration, waiting: false });
      },
      onTime: (time, duration) => {
        usePlayerStore.getState().setTransport({ time, duration: duration || usePlayerStore.getState().duration });
      },
      onPlay: () => {
        usePlayerStore.getState().setTransport({ playing: true, waiting: false });
        // A light poll keeps the position flowing between the platform's events; some
        // of them only report on state changes, which is not enough for the timeline.
        if (!tickTimer) {
          tickTimer = window.setInterval(() => {
            const at = controller.readTime();
            if (Math.abs(at - usePlayerStore.getState().time) >= 0.2) {
              usePlayerStore.getState().setTransport({ time: at, duration: controller.duration || usePlayerStore.getState().duration });
            }
          }, 250);
        }
      },
      onPause: () => {
        usePlayerStore.getState().setTransport({ playing: false });
        if (tickTimer) {
          window.clearInterval(tickTimer);
          tickTimer = 0;
        }
      },
      onEnded: () => {
        usePlayerStore.getState().setTransport({ playing: false });
        if (tickTimer) {
          window.clearInterval(tickTimer);
          tickTimer = 0;
        }
      },
      onBuffering: (buffering) => usePlayerStore.getState().setTransport({ waiting: buffering }),
      onError: (message) => setNotice(message),
      // Dailymotion's API needs a whitelisted embedding domain; without it the picture
      // plays but nothing is reported. Say that rather than leaving a frozen timeline.
      onSilentPlatform: (message) => setNotice(message),
    });

    // Send the learner's current preferences once the platform player is booted.
    controller.prime({ volume: store.volume, muted: store.muted, rate: safeRate(store.rate) });
    if (store.time > 0.5) controller.setStartAt(store.time);
    controller.handshake();

    return () => {
      if (tickTimer) window.clearInterval(tickTimer);
      controller.detach();
      if (embedControllerRef.current === controller) embedControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedUrl, activeSourceId]);

  return {
    videoRef,
    embedRef,
    embedUrl,
    ready,
    notice,
    sources,
    activeSourceId,
    retry: () => {
      const resolver = resolverRef.current;
      const current = resolver?.current ?? sources[0];
      if (current) void mount(current, usePlayerStore.getState().time);
    },
    selectSource: (id) => switchSource(id),
  };
}

const switchListeners = new Set<(id: string) => void>();

function onSourceSwitch(listener: (id: string) => void): () => void {
  switchListeners.add(listener);
  return () => switchListeners.delete(listener);
}

/* ─────────────────────────────── caption helpers ─────────────────────────────── */

export interface CaptionSet {
  cues: SubtitleCue[];
  original: MediaTrack | null;
  translation: MediaTrack | null;
}

/**
 * Merge an episode's text tracks into the cue list the overlay renders: word
 * timings from the original track, translations aligned onto it (dual mode).
 */
export function captionSet(episode: Episode | null, originalTrackId: string | null, translationTrackId: string | null): CaptionSet {
  if (!episode) return { cues: [], original: null, translation: null };
  const pair = trackPair(episode.tracks);
  const original = episode.tracks.find((t) => t.id === originalTrackId) ?? pair.original;
  const translation = episode.tracks.find((t) => t.id === translationTrackId) ?? pair.translation;
  const originalCues = cuesOf(original);
  const translationCues = cuesOf(translation);
  const cues = originalCues.length
    ? translationCues.length
      ? attachTranslations(originalCues, translationCues)
      : originalCues
    : translationCues;
  return { cues, original, translation };
}
