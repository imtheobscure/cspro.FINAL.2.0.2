/**
 * Player state (Zustand).
 *
 * Separate from lesson state on purpose: the player clock ticks several times a
 * second and the lesson engine must not re-render because a buffer percentage
 * moved. Preferences that a learner expects to survive a reload (subtitle mode,
 * size, playback rate, volume, dual-subtitle choice) are persisted; transient
 * telemetry (bands, stalls) is not.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubtitleMode } from "../types";
import type { EngineAudioTrack, EngineQuality, EngineTextTrackRef } from "../lib/media/pipeline";

export interface AbLoop {
  start: number;
  end: number;
  label?: string;
}

interface PlayerState {
  /* transport */
  ready: boolean;
  playing: boolean;
  waiting: boolean;
  time: number;
  duration: number;
  rate: number;
  volume: number;
  muted: boolean;
  buffered: number;
  bandwidth?: number;

  /* sources & engines */
  sourceId: string | null;
  engine: "shaka" | "hlsjs" | "native" | "none";
  fallbackNote: string | null;
  qualities: EngineQuality[];
  audioTracks: EngineAudioTrack[];
  embeddedTextTracks: EngineTextTrackRef[];

  /* subtitles */
  subtitleMode: SubtitleMode;
  originalTrackId: string | null;
  translationTrackId: string | null;
  showWordHighlight: boolean;
  subtitleScale: number;
  /** Pause automatically when a line finishes — the "listen and repeat" mode. */
  pauseAfterLine: boolean;
  /** Show the target-language text above/below the translation. */
  dualOrder: "original-first" | "translation-first";

  /* navigation helpers */
  loop: AbLoop | null;
  followTranscript: boolean;
  transcriptQuery: string;
  selectedCueId: string | null;

  /* actions */
  setTransport: (patch: Partial<Pick<PlayerState, "ready" | "playing" | "waiting" | "time" | "duration" | "rate" | "volume" | "muted" | "buffered" | "bandwidth">>) => void;
  setSource: (id: string | null, engine: PlayerState["engine"]) => void;
  setFallback: (note: string | null) => void;
  setTracks: (patch: Partial<Pick<PlayerState, "qualities" | "audioTracks" | "embeddedTextTracks">>) => void;
  setSubtitleMode: (mode: SubtitleMode) => void;
  setSubtitleTracks: (patch: { originalTrackId?: string | null; translationTrackId?: string | null }) => void;
  setPreference: (
    patch: Partial<
      Pick<PlayerState, "showWordHighlight" | "subtitleScale" | "pauseAfterLine" | "dualOrder" | "followTranscript" | "rate" | "volume" | "muted">
    >,
  ) => void;
  setLoop: (loop: AbLoop | null) => void;
  setTranscriptQuery: (query: string) => void;
  selectCue: (id: string | null) => void;
  reset: () => void;
}

const initial = {
  ready: false,
  playing: false,
  waiting: false,
  time: 0,
  duration: 0,
  rate: 1,
  volume: 1,
  muted: false,
  buffered: 0,
  bandwidth: undefined as number | undefined,
  sourceId: null as string | null,
  engine: "none" as PlayerState["engine"],
  fallbackNote: null as string | null,
  qualities: [] as EngineQuality[],
  audioTracks: [] as EngineAudioTrack[],
  embeddedTextTracks: [] as EngineTextTrackRef[],
  loop: null as AbLoop | null,
  transcriptQuery: "",
  selectedCueId: null as string | null,
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      ...initial,
      subtitleMode: "dual",
      originalTrackId: null,
      translationTrackId: null,
      showWordHighlight: true,
      subtitleScale: 1,
      pauseAfterLine: false,
      dualOrder: "original-first",
      followTranscript: true,

      setTransport: (patch) => set(patch),
      setSource: (sourceId, engine) => set({ sourceId, engine }),
      setFallback: (fallbackNote) => set({ fallbackNote }),
      setTracks: (patch) => set(patch),
      setSubtitleMode: (subtitleMode) => set({ subtitleMode }),
      setSubtitleTracks: (patch) => set(patch),
      setPreference: (patch) => set(patch),
      setLoop: (loop) => set({ loop }),
      setTranscriptQuery: (transcriptQuery) => set({ transcriptQuery }),
      selectCue: (selectedCueId) => set({ selectedCueId }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "tutoflix-player",
      // Only the learner's preferences persist — the clock and track lists do not.
      partialize: (state) => ({
        subtitleMode: state.subtitleMode,
        originalTrackId: state.originalTrackId,
        translationTrackId: state.translationTrackId,
        showWordHighlight: state.showWordHighlight,
        subtitleScale: state.subtitleScale,
        pauseAfterLine: state.pauseAfterLine,
        dualOrder: state.dualOrder,
        followTranscript: state.followTranscript,
        rate: state.rate,
        volume: state.volume,
        muted: state.muted,
      }),
    },
  ),
);
