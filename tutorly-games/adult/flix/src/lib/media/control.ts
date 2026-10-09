/**
 * The imperative bridge to the media element.
 *
 * Components (transcript, timeline, cues overlay, activity overlay, party sync)
 * must be able to seek, play, pause and change rate without owning the player.
 * The engine registers itself here on mount, everything else calls these
 * functions. Keys are non-React on purpose: the same object is what a keyboard
 * shortcut, a Deep link (#t=42) or a future remote-control API would use.
 */

import type { MediaPipeline } from "./pipeline";

export interface MediaController {
  play(): void;
  pause(): void;
  toggle(): void;
  seek(time: number): void;
  seekBy(delta: number): void;
  setRate(rate: number): void;
  setVolume(volume: number, muted?: boolean): void;
  /** Seconds, 0 when metadata is not in yet. */
  duration(): number;
  time(): number;
  playing(): boolean;
  /** Frame-accurate "go to this cue and start it" used by transcript + sentence replay. */
  playRange(start: number, end: number, options?: { slow?: boolean }): void;
}

const noop = () => undefined;

let controller: MediaController | null = null;
const listeners = new Set<(ready: boolean) => void>();

export function registerMediaController(next: MediaController | null): void {
  controller = next;
  for (const listener of [...listeners]) {
    try {
      listener(!!next);
    } catch {
      /* ignore */
    }
  }
}

/** Subscribe to "is a media element attached yet?" — the empty library case matters. */
export function onMediaControllerChange(listener: (ready: boolean) => void): () => void {
  listeners.add(listener);
  listener(!!controller);
  return () => listeners.delete(listener);
}

export function hasMediaController(): boolean {
  return !!controller;
}

/* ────────────────────────── pipeline (Shaka/hls) bridge ────────────────────────── */

let activePipeline: MediaPipeline | null = null;

export function registerPipeline(pipeline: MediaPipeline | null): void {
  activePipeline = pipeline;
}

/** Track/quality selection straight through to the streaming engine. */
export const pipeline = {
  selectQuality: (id: string) => activePipeline?.selectQuality(id),
  selectAudioTrack: (id: string) => activePipeline?.selectAudioTrack(id),
  selectTextTrack: (id: string) => activePipeline?.selectTextTrack(id),
  setAdaptive: (enabled: boolean) => activePipeline?.setAdaptive(enabled),
  engine: () => activePipeline?.engine ?? null,
};

export const media: MediaController = {
  play: () => controller?.play() ?? noop(),
  pause: () => controller?.pause() ?? noop(),
  toggle: () => controller?.toggle() ?? noop(),
  seek: (time) => controller?.seek(time) ?? noop(),
  seekBy: (delta) => controller?.seekBy(delta) ?? noop(),
  setRate: (rate) => controller?.setRate(rate) ?? noop(),
  setVolume: (volume, muted) => controller?.setVolume(volume, muted) ?? noop(),
  duration: () => controller?.duration() ?? 0,
  time: () => controller?.time() ?? 0,
  playing: () => controller?.playing() ?? false,
  playRange: (start, end, options) => controller?.playRange(start, end, options) ?? noop(),
};
