import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * FFmpeg side of the media platform.
 *
 * The browser cannot transcode, probe or re-mux, so the heavy jobs live here:
 * probing metadata, grabbing a thumbnail at a timestamp, drawing a waveform,
 * extracting a mono 16 kHz track for WhisperX, and pulling subtitle streams out
 * of a container so they can be converted to VTT/SRT by the subtitle engine.
 *
 * Binaries come from PATH, or from FFMPEG_PATH / FFPROBE_PATH. When they are
 * missing every entry point reports that clearly instead of failing obscurely.
 */
const MAX_JOBS_TIMEOUT_MS = Number(process.env.FFMPEG_TIMEOUT_MS ?? 120_000);

export type FfmpegStatus = { available: boolean; ffmpegPath: string; ffprobePath: string; version: string | null; hint: string };

let cached: FfmpegStatus | null = null;

export function ffmpegPath(): string {
  return process.env.FFMPEG_PATH || "ffmpeg";
}
export function ffprobePath(): string {
  return process.env.FFPROBE_PATH || "ffprobe";
}

export async function ffmpegStatus(force = false): Promise<FfmpegStatus> {
  if (cached && !force) return cached;
  const hint =
    "Install FFmpeg (winget install Gyan.FFmpeg · brew install ffmpeg · apt install ffmpeg) or set FFMPEG_PATH/FFPROBE_PATH to the binaries.";
  try {
    const { stdout } = await run(ffmpegPath(), ["-version"], { timeout: 8000 });
    const version = stdout.split("\n")[0]?.trim() ?? null;
    cached = { available: true, ffmpegPath: ffmpegPath(), ffprobePath: ffprobePath(), version, hint };
  } catch {
    cached = { available: false, ffmpegPath: ffmpegPath(), ffprobePath: ffprobePath(), version: null, hint };
  }
  return cached;
}

function assertUrl(url: string) {
  if (!/^https?:\/\//i.test(url) && !path.isAbsolute(url)) throw new Error("A remote http(s) URL or an absolute file path is required");
}

export type ProbeResult = {
  format: string | null;
  duration: number | null;
  bitrate: number | null;
  size: number | null;
  streams: { index: number; type: string; codec: string | null; language: string | null; width: number | null; height: number | null; channels: number | null; title: string | null }[];
  subtitles: { index: number; language: string | null; codec: string | null; title: string | null }[];
};

export async function probe(url: string): Promise<ProbeResult> {
  assertUrl(url);
  const { stdout } = await run(
    ffprobePath(),
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", "-user_agent", "Tutoflix/2.0", url],
    { timeout: MAX_JOBS_TIMEOUT_MS, maxBuffer: 12 * 1024 * 1024 },
  );
  const parsed = JSON.parse(stdout) as {
    format?: { format_name?: string; duration?: string; bit_rate?: string; size?: string };
    streams?: { index?: number; codec_type?: string; codec_name?: string; tags?: { language?: string; title?: string }; width?: number; height?: number; channels?: number }[];
  };
  const streams = (parsed.streams ?? []).map((s) => ({
    index: s.index ?? 0,
    type: s.codec_type ?? "unknown",
    codec: s.codec_name ?? null,
    language: s.tags?.language ?? null,
    width: s.width ?? null,
    height: s.height ?? null,
    channels: s.channels ?? null,
    title: s.tags?.title ?? null,
  }));
  return {
    format: parsed.format?.format_name ?? null,
    duration: parsed.format?.duration ? Number(parsed.format.duration) : null,
    bitrate: parsed.format?.bit_rate ? Number(parsed.format.bit_rate) : null,
    size: parsed.format?.size ? Number(parsed.format.size) : null,
    streams,
    subtitles: streams.filter((s) => s.type === "subtitle").map((s) => ({ index: s.index, language: s.language, codec: s.codec, title: s.title })),
  };
}

/** One JPEG frame at `at` seconds, as a data URL the UI can show immediately. */
export async function thumbnail(url: string, at = 5, width = 640): Promise<{ dataUrl: string; at: number; bytes: number }> {
  assertUrl(url);
  const { stdout } = await run(
    ffmpegPath(),
    ["-hide_banner", "-loglevel", "error", "-user_agent", "Tutoflix/2.0", "-ss", String(at), "-i", url, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1"],
    { timeout: MAX_JOBS_TIMEOUT_MS, maxBuffer: 24 * 1024 * 1024, encoding: "buffer" },
  );
  const buffer = stdout as unknown as Buffer;
  if (!buffer?.length) throw new Error("FFmpeg produced no frame at that timestamp");
  return { dataUrl: `data:image/jpeg;base64,${buffer.toString("base64")}`, at, bytes: buffer.length };
}

/** Peaks for a waveform strip: mono 8 kHz PCM → per-bucket max amplitude. */
export async function waveform(url: string, buckets = 240): Promise<{ peaks: number[]; buckets: number; duration: number | null }> {
  assertUrl(url);
  const { stdout } = await run(
    ffmpegPath(),
    ["-hide_banner", "-loglevel", "error", "-user_agent", "Tutoflix/2.0", "-i", url, "-ac", "1", "-ar", "8000", "-f", "s16le", "-acodec", "pcm_s16le", "pipe:1"],
    { timeout: MAX_JOBS_TIMEOUT_MS, maxBuffer: 256 * 1024 * 1024, encoding: "buffer" },
  );
  const pcm = stdout as unknown as Buffer;
  if (!pcm?.length) throw new Error("No audio stream found");
  const samples = Math.floor(pcm.length / 2);
  const perBucket = Math.max(1, Math.floor(samples / buckets));
  const peaks: number[] = [];
  for (let b = 0; b < buckets; b++) {
    let max = 0;
    const start = b * perBucket;
    const end = Math.min(samples, start + perBucket);
    for (let i = start; i < end; i++) {
      const v = Math.abs(pcm.readInt16LE(i * 2)) / 32768;
      if (v > max) max = v;
    }
    peaks.push(Number(max.toFixed(3)));
  }
  return { peaks, buckets, duration: samples / 8000 };
}

/** Mono 16 kHz WAV — the shape WhisperX wants — written to a temp file. */
export async function extractAudio(url: string, opts: { sampleRate?: number; maxSeconds?: number } = {}): Promise<{ filePath: string; bytes: number; cleanup: () => Promise<void> }> {
  assertUrl(url);
  const dir = await mkdtemp(path.join(tmpdir(), "tutoflix-audio-"));
  const filePath = path.join(dir, "audio.wav");
  const args = ["-hide_banner", "-loglevel", "error", "-user_agent", "Tutoflix/2.0", "-i", url, "-vn", "-ac", "1", "-ar", String(opts.sampleRate ?? 16000)];
  if (opts.maxSeconds) args.push("-t", String(opts.maxSeconds));
  args.push("-acodec", "pcm_s16le", "-y", filePath);
  await run(ffmpegPath(), args, { timeout: MAX_JOBS_TIMEOUT_MS });
  const bytes = (await readFile(filePath)).length;
  return { filePath, bytes, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

/** Pulls an embedded subtitle stream out as SRT text for the subtitle engine. */
export async function extractSubtitleStream(url: string, streamIndex = 0): Promise<string> {
  assertUrl(url);
  const { stdout } = await run(
    ffmpegPath(),
    ["-hide_banner", "-loglevel", "error", "-user_agent", "Tutoflix/2.0", "-i", url, "-map", `0:s:${streamIndex}`, "-f", "srt", "pipe:1"],
    { timeout: MAX_JOBS_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 },
  );
  const text = String(stdout ?? "");
  if (!text.trim()) throw new Error("No subtitle stream found at that index");
  return text;
}

/** Converts any audio/video URL into a small H.264 MP4 (a first pass at normalising a source). */
export async function transcodeToMp4(url: string, opts: { maxHeight?: number; maxSeconds?: number } = {}): Promise<{ filePath: string; bytes: number; cleanup: () => Promise<void> }> {
  assertUrl(url);
  const dir = await mkdtemp(path.join(tmpdir(), "tutoflix-transcode-"));
  const filePath = path.join(dir, "output.mp4");
  const args = ["-hide_banner", "-loglevel", "error", "-user_agent", "Tutoflix/2.0", "-i", url, "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-vf", `scale=-2:${opts.maxHeight ?? 480}`];
  if (opts.maxSeconds) args.push("-t", String(opts.maxSeconds));
  args.push("-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-y", filePath);
  await run(ffmpegPath(), args, { timeout: MAX_JOBS_TIMEOUT_MS });
  const bytes = (await readFile(filePath)).length;
  return { filePath, bytes, cleanup: () => rm(dir, { recursive: true, force: true }) };
}
