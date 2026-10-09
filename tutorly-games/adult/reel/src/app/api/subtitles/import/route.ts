import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { episodes, subtitleCues, subtitleTracks, subtitleWords } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";
import { detectAndParse } from "@/modules/subtitles/engine";

type Body = { episodeId: string; language: string; label?: string; type?: "original" | "translation"; content: string; source?: string };

/** Ingests VTT / SRT / WhisperX JSON and normalizes it into tracks → cues → words. */
export async function POST(req: Request) {
  await getCurrentUser();
  const body = await readJson<Body>(req);
  if (!body.episodeId || !body.language || !body.content) return error("episodeId, language and content are required");
  const [ep] = await db.select({ id: episodes.id }).from(episodes).where(eq(episodes.id, body.episodeId)).limit(1);
  if (!ep) return error("Episode not found", 404);
  let parsed;
  try {
    parsed = detectAndParse(body.content);
  } catch (e) {
    return error(`Could not parse subtitles: ${(e as Error).message}`);
  }
  if (!parsed.cues.length) return error("No cues found in the provided content");
  const type = body.type ?? "original";
  const trackId = `trk-${randomUUID().slice(0, 8)}`;
  await db.insert(subtitleTracks).values({
    id: trackId,
    episodeId: body.episodeId,
    language: body.language,
    label: body.label ?? body.language.toUpperCase(),
    type,
    source: body.source ?? (parsed.alignment === "word" ? "whisperx" : "import"),
    format: body.content.trim().startsWith("{") ? "json" : body.content.trim().startsWith("WEBVTT") ? "vtt" : "srt",
    alignment: parsed.alignment,
    isOriginal: type === "original",
    isTranslation: type === "translation",
  });
  const cueRows = parsed.cues.map((c, i) => ({ id: `${trackId}-c${i}`, trackId, cueIndex: i, startTime: c.startTime, endTime: c.endTime, text: c.text, speaker: c.speaker ?? null }));
  for (let i = 0; i < cueRows.length; i += 300) await db.insert(subtitleCues).values(cueRows.slice(i, i + 300));
  const wordRows = parsed.cues.flatMap((c, i) => c.words.map((w, wi) => ({ cueId: `${trackId}-c${i}`, wordIndex: wi, text: w.text, startTime: w.startTime, endTime: w.endTime, confidence: w.confidence, speaker: w.speaker ?? null })));
  for (let i = 0; i < wordRows.length; i += 300) await db.insert(subtitleWords).values(wordRows.slice(i, i + 300));
  return json({ ok: true, trackId, cues: cueRows.length, words: wordRows.length, alignment: parsed.alignment });
}
