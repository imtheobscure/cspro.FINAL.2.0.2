import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { extractAudio } from "@/modules/media/ffmpeg";
import { detectAndParse, type ParsedTrack } from "./engine";

const run = promisify(execFile);

/**
 * WhisperX — word-level timestamps, forced alignment and speaker diarization.
 *
 * Two deployment shapes are supported, chosen by environment:
 *   • WHISPERX_URL  → a hosted WhisperX/FastAPI service; the extracted audio is
 *                      POSTed as multipart and its JSON is ingested.
 *   • WHISPERX_BIN  → the CLI, run locally with `--output_format json`.
 *
 * WhisperX needs FFmpeg for the audio, so the audio is always extracted here in
 * 16 kHz mono WAV before the model sees it. Word alignment is what makes
 * click-a-word, replay-sentence and activity-on-speech work.
 */

export type WhisperXStatus = { configured: boolean; mode: "service" | "cli" | "none"; target: string | null; hint: string };

export function whisperxStatus(): WhisperXStatus {
  if (process.env.WHISPERX_URL) return { configured: true, mode: "service", target: process.env.WHISPERX_URL, hint: "" };
  if (process.env.WHISPERX_BIN) return { configured: true, mode: "cli", target: process.env.WHISPERX_BIN, hint: "" };
  return {
    configured: false,
    mode: "none",
    target: null,
    hint: "Set WHISPERX_URL to a hosted WhisperX service (e.g. http://127.0.0.1:8000) or WHISPERX_BIN to the whisperx CLI. FFmpeg is also required.",
  };
}

export type TranscribeOptions = {
  /** Media URL to transcribe; audio is extracted with FFmpeg. */
  mediaUrl: string;
  language?: string | null;
  model?: string | null;
  diarize?: boolean;
  maxSeconds?: number;
};

export type TranscribeResult = { parsed: ParsedTrack; mode: "service" | "cli"; words: number; speakers: number };

export async function transcribe(opts: TranscribeOptions): Promise<TranscribeResult> {
  const status = whisperxStatus();
  if (!status.configured) throw new Error(status.hint);
  const audio = await extractAudio(opts.mediaUrl, { sampleRate: 16000, maxSeconds: opts.maxSeconds });
  try {
    const json = status.mode === "service" ? await viaService(audio.filePath, opts) : await viaCli(audio.filePath, opts);
    const parsed = detectAndParse(JSON.stringify(json));
    if (!parsed.cues.length) throw new Error("WhisperX returned no segments");
    const words = parsed.cues.reduce((n, c) => n + c.words.length, 0);
    const speakers = new Set(parsed.cues.map((c) => c.speaker).filter(Boolean)).size;
    return { parsed, mode: status.mode as "service" | "cli", words, speakers };
  } finally {
    await audio.cleanup();
  }
}

async function viaService(filePath: string, opts: TranscribeOptions): Promise<unknown> {
  const base = process.env.WHISPERX_URL!.replace(/\/$/, "");
  const bytes = await readFile(filePath);
  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(bytes)], { type: "audio/wav" }), "audio.wav");
  if (opts.language) form.append("language", opts.language);
  if (opts.model) form.append("model", opts.model);
  form.append("align", "true");
  if (opts.diarize) form.append("diarize", "true");
  const res = await fetch(`${base}/transcribe`, { method: "POST", body: form, signal: AbortSignal.timeout(Number(process.env.WHISPERX_TIMEOUT_MS ?? 600_000)) });
  if (!res.ok) throw new Error(`WhisperX service responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return await res.json();
}

async function viaCli(filePath: string, opts: TranscribeOptions): Promise<unknown> {
  const bin = process.env.WHISPERX_BIN!;
  const outDir = await mkdtemp(path.join(tmpdir(), "tutorly-whisperx-"));
  const args = [filePath, "--output_format", "json", "--output_dir", outDir];
  if (opts.language) args.push("--language", opts.language);
  if (opts.model) args.push("--model", opts.model);
  if (opts.diarize) args.push("--diarize");
  try {
    await run(bin, args, { timeout: Number(process.env.WHISPERX_TIMEOUT_MS ?? 900_000), maxBuffer: 64 * 1024 * 1024 });
    const files = await readdir(outDir);
    const jsonFile = files.find((f) => f.endsWith(".json"));
    if (!jsonFile) throw new Error("WhisperX produced no JSON output");
    return JSON.parse(await readFile(path.join(outDir, jsonFile), "utf8"));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}
