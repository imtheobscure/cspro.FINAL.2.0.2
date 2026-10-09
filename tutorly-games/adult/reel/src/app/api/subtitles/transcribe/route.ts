import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { episodes, videoSources } from "@/db/schema";
import { error, json, readJson } from "@/lib/api";
import { persistTrack } from "@/modules/subtitles/store";
import { transcribe, whisperxStatus } from "@/modules/subtitles/whisperx";

type Body = { episodeId?: string; sourceId?: string; mediaUrl?: string; language?: string; model?: string; diarize?: boolean; maxSeconds?: number };

/** Reports whether WhisperX is wired up, so the UI can guide the operator. */
export async function GET() {
  return json(whisperxStatus());
}

/**
 * Generates a word-level, speaker-labelled transcript for an episode's source:
 * FFmpeg extracts the audio, WhisperX aligns it, and the result is stored as a
 * normal subtitle track ("whisperx") — the same pipeline manual imports use, so
 * click-a-word, sentence replay and lesson generation all work from it.
 */
export async function POST(req: Request) {
  const status = whisperxStatus();
  if (!status.configured) return json({ ok: false, error: "WhisperX is not configured", hint: status.hint }, 501);

  const body = await readJson<Body>(req);
  let mediaUrl = body.mediaUrl ?? null;
  let language = body.language ?? null;

  if (!mediaUrl && body.episodeId) {
    const sources = await db.select().from(videoSources).where(eq(videoSources.episodeId, body.episodeId)).orderBy(asc(videoSources.priority));
    const pick = body.sourceId ? sources.find((s) => s.id === body.sourceId) : sources[0];
    if (!pick) return error("This episode has no source to transcribe", 404);
    mediaUrl = pick.url;
    if (!language) {
      const [episode] = await db.select({ language: episodes.language }).from(episodes).where(eq(episodes.id, body.episodeId)).limit(1);
      language = episode?.language ?? null;
    }
  }
  if (!mediaUrl) return error("A media URL or an episodeId is required");
  if (!body.episodeId) return error("episodeId is required so the track can be attached");

  try {
    const result = await transcribe({ mediaUrl, language, model: body.model ?? null, diarize: body.diarize ?? true, maxSeconds: body.maxSeconds });
    const stored = await persistTrack({
      episodeId: body.episodeId,
      language: (language ?? "en").slice(0, 2).toLowerCase(),
      label: "WhisperX (word-level)",
      type: "original",
      format: "json",
      source: "whisperx",
      sourceUrl: mediaUrl,
      parsed: result.parsed,
    });
    return json({ ok: true, mode: result.mode, transcriptWords: result.words, speakers: result.speakers, ...stored });
  } catch (err) {
    return error((err as Error).message, 422);
  }
}
