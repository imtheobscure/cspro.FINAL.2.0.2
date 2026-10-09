import { readFile } from "node:fs/promises";
import { error, json, readJson } from "@/lib/api";
import { extractAudio, extractSubtitleStream, ffmpegStatus, probe, thumbnail, transcodeToMp4, waveform } from "@/modules/media/ffmpeg";
import { detectAndParse } from "@/modules/subtitles/engine";

type Body = {
  action: "status" | "probe" | "thumbnail" | "waveform" | "audio" | "subtitles" | "transcode";
  url?: string;
  at?: number;
  width?: number;
  buckets?: number;
  streamIndex?: number;
  maxHeight?: number;
  maxSeconds?: number;
  /** For action=audio: run a transcription on the extracted file instead of returning its size. */
  transcribe?: boolean;
};

/**
 * FFmpeg jobs for the media platform. Each action is a thin wrapper over the
 * FFmpeg module so the browser can ask for a probe, a thumbnail, a waveform, an
 * audio track for WhisperX, subtitle extraction or a normalising transcode
 * without ever shelling out itself.
 */
export async function GET() {
  return json(await ffmpegStatus());
}

export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  const status = await ffmpegStatus();
  if (!status.available) {
    return json({ ok: false, available: false, error: "FFmpeg is not installed or not on PATH", hint: status.hint }, 501);
  }
  if (!body.action || body.action === "status") return json(status);
  if (!body.url) return error("A media url is required");

  try {
    switch (body.action) {
      case "probe":
        return json({ ok: true, ...(await probe(body.url)) });
      case "thumbnail": {
        const shot = await thumbnail(body.url, body.at ?? 5, body.width ?? 640);
        return json({ ok: true, ...shot });
      }
      case "waveform":
        return json({ ok: true, ...(await waveform(body.url, body.buckets ?? 240)) });
      case "audio": {
        const audio = await extractAudio(body.url, { maxSeconds: body.maxSeconds });
        try {
          const bytes = await readFile(audio.filePath);
          return new Response(new Uint8Array(bytes), {
            headers: {
              "Content-Type": "audio/wav",
              "Content-Length": String(audio.bytes),
              "Content-Disposition": `attachment; filename="audio-16k-mono.wav"`,
            },
          });
        } finally {
          await audio.cleanup();
        }
      }
      case "subtitles": {
        const srt = await extractSubtitleStream(body.url, body.streamIndex ?? 0);
        const parsed = detectAndParse(srt);
        return json({ ok: true, cues: parsed.cues.length, format: "srt", preview: parsed.cues.slice(0, 5).map((c) => c.text) });
      }
      case "transcode": {
        const out = await transcodeToMp4(body.url, { maxHeight: body.maxHeight ?? 480, maxSeconds: body.maxSeconds ?? 120 });
        try {
          const bytes = await readFile(out.filePath);
          return new Response(new Uint8Array(bytes), {
            headers: {
              "Content-Type": "video/mp4",
              "Content-Length": String(out.bytes),
              "Content-Disposition": `attachment; filename="normalised-${body.maxHeight ?? 480}p.mp4"`,
            },
          });
        } finally {
          await out.cleanup();
        }
      }
      default:
        return error("Unknown action");
    }
  } catch (err) {
    return error((err as Error).message, 422);
  }
}
