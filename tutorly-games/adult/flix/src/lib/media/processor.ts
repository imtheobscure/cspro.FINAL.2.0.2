/**
 * Media processing.
 *
 * Two halves, so the app is useful with or without a backend:
 *
 *  SERVER (optional, hung off `VITE_TUTOFLIX_API`; 404/absent → skipped):
 *    POST /media/transcode      FFmpeg → target renditions (HLS + mp4 fallback)
 *    POST /media/audio          FFmpeg → 16 kHz mono wav for the aligner
 *    POST /media/thumbnails     FFmpeg → sprite sheet + WebVTT thumbnail track
 *    POST /media/waveform       FFmpeg → peaks JSON
 *    POST /media/subtitles      FFmpeg/ffprobe → extract or convert subtitle streams
 *    POST /transcribe           WhisperX → word-level cues, forced alignment, diarisation
 *
 *  CLIENT (always available):
 *    thumbnails — seek + drawImage on a canvas, exactly what FFmpeg would emit
 *    waveform   — WebAudio decode of the same media, peak-per-bucket
 *
 * The client paths are what make the lesson maker work offline: with a local
 * file, subtitles, thumbnails, waveform and segmentation all happen in the tab.
 */

import type { Episode, SubtitleCue } from "../../types";
import { normaliseCues } from "../subtitles/parse";

const API_BASE = (import.meta.env.VITE_TUTOFLIX_API as string | undefined)?.replace(/\/$/, "") ?? "";

export type ServerCapability = "transcode" | "thumbnails" | "waveform" | "subtitles" | "transcribe";

let capabilityCache: Promise<Record<ServerCapability, boolean>> | null = null;

/** Is a processing backend present? Cached — the answer does not change mid-session. */
export function serverCapabilities(): Promise<Record<ServerCapability, boolean>> {
  if (!API_BASE) {
    return Promise.resolve({ transcode: false, thumbnails: false, waveform: false, subtitles: false, transcribe: false });
  }
  capabilityCache ??= (async () => {
    try {
      const response = await fetch(`${API_BASE}/media/capabilities`, { signal: AbortSignal.timeout(2500) });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as Partial<Record<ServerCapability, boolean>>;
      return {
        transcode: !!data.transcode,
        thumbnails: !!data.thumbnails,
        waveform: !!data.waveform,
        subtitles: !!data.subtitles,
        transcribe: !!data.transcribe,
      };
    } catch {
      return { transcode: false, thumbnails: false, waveform: false, subtitles: false, transcribe: false };
    }
  })();
  return capabilityCache;
}

/* ─────────────────────────── WhisperX transcription ─────────────────────────── */

export interface TranscriptionRequest {
  /** A URL the backend can fetch, or a filename previously uploaded. */
  mediaUrl?: string;
  uploadId?: string;
  language?: string;
  /** Word-level timestamps + speaker diarisation, the reason to use WhisperX. */
  align?: boolean;
  diarise?: boolean;
  minSpeakers?: number;
  maxSpeakers?: number;
}

export interface TranscriptionResult {
  cues: SubtitleCue[];
  language: string;
  speakers: string[];
  /** What produced this, for the credits line under the player. */
  engine: string;
}

/**
 * Ask the backend's WhisperX worker for word-level cues. Returns `null` when no
 * backend is configured — callers then keep the imported subtitle track instead
 * of blocking the lesson.
 */
export async function transcribe(request: TranscriptionRequest): Promise<TranscriptionResult | null> {
  const caps = await serverCapabilities();
  if (!caps.transcribe) return null;
  const response = await fetch(`${API_BASE}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_url: request.mediaUrl,
      upload_id: request.uploadId,
      language: request.language,
      align: request.align ?? true,
      diarize: request.diarise ?? false,
      min_speakers: request.minSpeakers,
      max_speakers: request.maxSpeakers,
    }),
  });
  if (!response.ok) throw new Error(`Transcription failed: ${response.status}`);
  const data = (await response.json()) as {
    segments?: { start: number; end: number; text: string; speaker?: string; words?: { word: string; start: number; end: number; score?: number }[] }[];
  };
  const cues = (data.segments ?? []).map((segment, i) => ({
    id: `wx${i}`,
    startTime: segment.start,
    endTime: segment.end,
    text: segment.text.trim(),
    speaker: segment.speaker,
    words: segment.words?.map((w) => ({
      text: w.word.trim(),
      startTime: w.start,
      endTime: w.end,
      confidence: w.score,
    })),
  }));
  return {
    cues: normaliseCues(cues),
    language: request.language ?? "auto",
    speakers: [...new Set(cues.map((c) => c.speaker).filter((s): s is string => !!s))],
    engine: "WhisperX (word-level + alignment)",
  };
}

/* ───────────────────────────── client processing ───────────────────────────── */

export interface ThumbnailStrip {
  thumbnails: { time: number; dataUrl: string }[];
  width: number;
  height: number;
  interval: number;
}

/**
 * Grab evenly spaced frames from any media the element can play. This is the
 * FFmpeg thumbnail pass, done in the browser so it also works for a local file
 * that never leaves the device.
 */
export async function generateThumbnails(
  media: HTMLVideoElement | HTMLAudioElement,
  options: { count?: number; width?: number; signal?: AbortSignal } = {},
): Promise<ThumbnailStrip> {
  const count = Math.max(4, Math.min(120, options.count ?? 40));
  const width = options.width ?? 180;
  const duration = media.duration;
  if (!Number.isFinite(duration) || duration <= 0) return { thumbnails: [], width, height: 0, interval: 0 };

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return { thumbnails: [], width, height: 0, interval: 0 };

  const isVideo = media instanceof HTMLVideoElement;
  const aspect = isVideo ? (media.videoWidth || 16) / (media.videoHeight || 9) : 16 / 9;
  const height = Math.round(width / aspect);
  canvas.width = width;
  canvas.height = height;

  const wasPaused = media.paused;
  const originalTime = media.currentTime;
  const originalRate = media.playbackRate;
  const interval = duration / count;
  const thumbnails: { time: number; dataUrl: string }[] = [];

  const seekTo = (time: number) =>
    new Promise<void>((resolve) => {
      const done = () => {
        media.removeEventListener("seeked", done);
        resolve();
      };
      media.addEventListener("seeked", done);
      media.currentTime = Math.min(Math.max(0, time), Math.max(0, duration - 0.05));
      // Some formats never fire `seeked` for the very first frame.
      setTimeout(done, 1200);
    });

  for (let i = 0; i < count; i++) {
    if (options.signal?.aborted) break;
    await seekTo(interval * i + 0.1);
    try {
      context.drawImage(media as HTMLVideoElement, 0, 0, width, height);
      thumbnails.push({ time: interval * i, dataUrl: canvas.toDataURL("image/jpeg", 0.6) });
    } catch {
      /* a frame that cannot be drawn (audio-only, tainted) is simply skipped */
    }
  }

  media.currentTime = originalTime;
  media.playbackRate = originalRate;
  if (!wasPaused) void media.play().catch(() => undefined);

  return { thumbnails, width, height, interval };
}

/** Peak-per-bucket waveform from the decoded audio track. */
export async function generateWaveform(
  input: Blob | string,
  buckets = 900,
): Promise<number[]> {
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return [];
  const context = new AudioContextCtor();
  try {
    const bytes = typeof input === "string" ? await (await fetch(input)).arrayBuffer() : await input.arrayBuffer();
    const buffer = await context.decodeAudioData(bytes.slice(0));
    const channel = buffer.getChannelData(0);
    const bucketSize = Math.max(1, Math.floor(channel.length / buckets));
    const peaks: number[] = [];
    for (let i = 0; i < buckets; i++) {
      let peak = 0;
      const start = i * bucketSize;
      for (let j = 0; j < bucketSize; j += 24) {
        const value = Math.abs(channel[start + j] ?? 0);
        if (value > peak) peak = value;
      }
      peaks.push(Number(peak.toFixed(3)));
    }
    return peaks;
  } catch {
    return [];
  } finally {
    void context.close();
  }
}

/** Audio-only extraction done client-side (what the server does with FFmpeg -vn). */
export async function extractAudioBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

/** Attach generated artwork + peaks to an episode object. */
export function withProcessedMedia(episode: Episode, strip: ThumbnailStrip, waveform: number[]): Episode {
  return { ...episode, thumbnails: strip.thumbnails, waveform };
}

export const PROCESSING_NOTES = {
  server: API_BASE ? `Processing backend: ${API_BASE}` : "No processing backend configured (set VITE_TUTOFLIX_API to enable FFmpeg + WhisperX endpoints).",
  client: "Thumbnails and waveform are generated in the browser, so a local file never has to be uploaded.",
} as const;
