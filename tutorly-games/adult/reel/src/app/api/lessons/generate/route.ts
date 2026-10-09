import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, episodes, grammarItems, seasons, series, subtitleCues, subtitleTracks, videoLessons, videoSources, vocabularyItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";
import { generateLesson } from "@/modules/ai/lesson-generator";
import { persistLesson } from "@/modules/lessons/repository";
import type { CEFRLevel } from "@/modules/lessons/types";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { user, profile } = await getCurrentUser();
  const { episodeId, objectivesHint } = await readJson<{ episodeId?: string; objectivesHint?: string }>(req);
  if (!episodeId) return error("episodeId required");

  const [row] = await db
    .select({ episode: episodes, season: seasons, series: series })
    .from(episodes)
    .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
    .innerJoin(series, eq(series.id, seasons.seriesId))
    .where(eq(episodes.id, episodeId))
    .limit(1);
  if (!row) return error("Episode not found", 404);

  const [track] = await db.select().from(subtitleTracks).where(and(eq(subtitleTracks.episodeId, episodeId), eq(subtitleTracks.isOriginal, true))).limit(1);
  if (!track) return error("This episode has no original-language transcript yet. Import subtitles (VTT/SRT) or a WhisperX transcript first.", 422);
  const cues = await db.select().from(subtitleCues).where(eq(subtitleCues.trackId, track.id)).orderBy(asc(subtitleCues.cueIndex));
  const chapterRows = await db.select().from(chapters).where(eq(chapters.episodeId, episodeId)).orderBy(asc(chapters.sortOrder));
  const [source] = await db.select().from(videoSources).where(eq(videoSources.episodeId, episodeId)).orderBy(asc(videoSources.priority)).limit(1);
  const vocab = await db.select().from(vocabularyItems).where(eq(vocabularyItems.userId, user.id));
  const grammar = await db.select().from(grammarItems).where(eq(grammarItems.userId, user.id));
  const previous = await db.select({ title: videoLessons.title }).from(videoLessons).where(eq(videoLessons.forUserId, user.id)).orderBy(desc(videoLessons.createdAt)).limit(5);

  try {
    const output = await generateLesson({
      episode: { id: row.episode.id, title: row.episode.title, description: row.episode.description, duration: row.episode.duration, courseId: row.series.courseId, seriesId: row.series.id, seasonId: row.season.id, videoUrl: source?.url },
      chapters: chapterRows.map((c) => ({ title: c.title, startTime: c.startTime, endTime: c.endTime })),
      cues: cues.map((c) => ({ id: c.id, startTime: c.startTime, endTime: c.endTime, text: c.text, speaker: c.speaker })),
      learner: {
        cefrLevel: profile.cefrLevel as CEFRLevel,
        nativeLanguage: profile.nativeLanguage,
        targetLanguage: profile.targetLanguage,
        interests: profile.interests,
        goals: profile.goals,
        weaknesses: profile.weaknesses,
        knownVocabulary: vocab.filter((v) => v.status === "known" || v.status === "mastered").map((v) => v.word),
        reviewVocabulary: vocab.filter((v) => v.status === "review" || v.status === "needsReview" || v.status === "learning").map((v) => v.word),
        grammarHistory: grammar.map((g) => ({ name: g.name, status: g.status })),
        previousLessons: previous.map((p) => p.title),
      },
      objectivesHint,
    });
    const id = `lesson-${episodeId}-${user.id.slice(0, 8)}`;
    const saved = await persistLesson({
      id,
      lesson: output.lesson,
      episodeId,
      courseId: row.series.courseId,
      seriesId: row.series.id,
      seasonId: row.season.id,
      generatedBy: output.generatedBy,
      forUserId: user.id,
      status: "published",
      videoDuration: row.episode.duration,
    });
    return json({ ok: true, lessonId: saved.id, generatedBy: output.generatedBy, notes: output.notes, warnings: saved.warnings.slice(0, 10), segments: output.lesson.segments.length, activities: output.lesson.segments.reduce((a, s) => a + s.activities.length, 0) });
  } catch (err) {
    return error((err as Error).message, 422);
  }
}
