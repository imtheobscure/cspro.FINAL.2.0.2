import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subtitleCues, subtitleTracks, subtitleWords } from "@/db/schema";
import { qaReport, type ParsedTrack, type QaReport } from "./engine";

export type PersistTrackInput = {
  episodeId: string;
  language: string;
  label?: string;
  type: "original" | "translation" | "forced";
  format: string;
  source: string;
  sourceUrl?: string | null;
  parsed: ParsedTrack;
  /** Replace an existing track with the same language+type instead of adding a second one. */
  replace?: boolean;
};

export type PersistTrackResult = { trackId: string; cues: number; words: number; replaced: boolean; qa: QaReport };

/**
 * Single write path for every subtitle source (manual import, provider download,
 * WhisperX, FFmpeg extraction) so cues, words and the QA report are always stored
 * the same way and an episode never accumulates duplicate tracks for a language.
 */
export async function persistTrack(input: PersistTrackInput): Promise<PersistTrackResult> {
  const qa = qaReport(input.parsed);
  let trackId = `trk-${randomUUID().slice(0, 8)}`;
  let replaced = false;

  if (input.replace !== false) {
    const existing = await db
      .select({ id: subtitleTracks.id })
      .from(subtitleTracks)
      .where(and(eq(subtitleTracks.episodeId, input.episodeId), eq(subtitleTracks.language, input.language), eq(subtitleTracks.type, input.type)))
      .limit(1);
    if (existing.length) {
      trackId = existing[0].id;
      replaced = true;
      // Words cascade with their cues (subtitle_words.cue_id → subtitle_cues.id ON DELETE CASCADE).
      await db.delete(subtitleCues).where(eq(subtitleCues.trackId, trackId));
      await db
        .update(subtitleTracks)
        .set({
          label: input.label ?? input.language.toUpperCase(),
          source: input.source,
          sourceUrl: input.sourceUrl ?? null,
          format: input.format,
          alignment: input.parsed.alignment,
          isOriginal: input.type === "original",
          isTranslation: input.type === "translation",
          isForced: input.type === "forced",
          available: true,
        })
        .where(eq(subtitleTracks.id, trackId));
    }
  }

  if (!replaced) {
    await db.insert(subtitleTracks).values({
      id: trackId,
      episodeId: input.episodeId,
      language: input.language,
      label: input.label ?? input.language.toUpperCase(),
      type: input.type,
      source: input.source,
      sourceUrl: input.sourceUrl ?? null,
      format: input.format,
      alignment: input.parsed.alignment,
      isOriginal: input.type === "original",
      isTranslation: input.type === "translation",
      isForced: input.type === "forced",
    });
  }

  const cueRows = input.parsed.cues.map((c, i) => ({
    id: `${trackId}-c${i}`,
    trackId,
    cueIndex: i,
    startTime: c.startTime,
    endTime: c.endTime,
    text: c.text,
    speaker: c.speaker ?? null,
  }));
  for (let i = 0; i < cueRows.length; i += 300) await db.insert(subtitleCues).values(cueRows.slice(i, i + 300));

  const wordRows = input.parsed.cues.flatMap((c, i) =>
    c.words.map((w, wi) => ({
      cueId: `${trackId}-c${i}`,
      wordIndex: wi,
      text: w.text,
      startTime: w.startTime,
      endTime: w.endTime,
      confidence: w.confidence,
      speaker: w.speaker ?? null,
    })),
  );
  for (let i = 0; i < wordRows.length; i += 300) await db.insert(subtitleWords).values(wordRows.slice(i, i + 300));

  return { trackId, cues: cueRows.length, words: wordRows.length, replaced, qa };
}

export async function listTracks(episodeId: string) {
  return db
    .select({
      id: subtitleTracks.id,
      language: subtitleTracks.language,
      label: subtitleTracks.label,
      type: subtitleTracks.type,
      source: subtitleTracks.source,
      format: subtitleTracks.format,
      alignment: subtitleTracks.alignment,
    })
    .from(subtitleTracks)
    .where(eq(subtitleTracks.episodeId, episodeId))
    .orderBy(asc(subtitleTracks.language));
}
