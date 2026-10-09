import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { lessonActivities, lessonSegments, videoLessons } from "@/db/schema";
import type { VideoLesson } from "./types";
import { validateLesson } from "./validate";

export type PersistLessonInput = {
  id: string;
  lesson: VideoLesson;
  episodeId?: string | null;
  courseId?: string | null;
  seriesId?: string | null;
  seasonId?: string | null;
  generatedBy: "manual" | "ai" | "rules";
  forUserId?: string | null;
  status?: "draft" | "published";
  videoDuration?: number;
};

/** Validates then stores a lesson (JSON + normalized segment/activity rows). Throws on invalid lessons. */
export async function persistLesson(input: PersistLessonInput) {
  const result = validateLesson(input.lesson, { videoDuration: input.videoDuration });
  if (!result.valid) {
    const msg = result.errors.slice(0, 5).map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`Lesson failed validation: ${msg}`);
  }
  const lesson = result.lesson!;

  await db.delete(videoLessons).where(eq(videoLessons.id, input.id));
  await db.insert(videoLessons).values({
    id: input.id,
    episodeId: input.episodeId ?? null,
    courseId: input.courseId ?? null,
    seriesId: input.seriesId ?? null,
    seasonId: input.seasonId ?? null,
    title: lesson.metadata.title,
    lessonType: lesson.metadata.lessonType,
    status: input.status ?? "published",
    cefrLevel: lesson.metadata.cefrLevel,
    targetLanguage: lesson.metadata.targetLanguage,
    nativeLanguage: lesson.metadata.nativeLanguage,
    estimatedDurationSeconds: lesson.metadata.estimatedDurationSeconds,
    generatedBy: input.generatedBy,
    forUserId: input.forUserId ?? null,
    data: lesson,
  });

  const segmentRows = lesson.segments.map((s, i) => ({
    id: `${input.id}:${s.id}`,
    lessonId: input.id,
    segmentKey: s.id,
    title: s.title,
    startTime: s.startTime,
    endTime: s.endTime,
    focus: s.focus,
    sortOrder: i,
  }));
  if (segmentRows.length) await db.insert(lessonSegments).values(segmentRows);

  const activityRows = lesson.segments.flatMap((s) =>
    s.activities.map((a) => ({
      id: `${input.id}:${a.id}`,
      lessonId: input.id,
      segmentId: `${input.id}:${s.id}`,
      activityKey: a.id,
      type: a.type,
      timestamp: a.timestamp,
      title: a.title,
      points: a.points,
      difficulty: a.difficulty,
      requiredForNext: a.requiredForNext,
      content: a.content as Record<string, unknown>,
    })),
  );
  if (activityRows.length) await db.insert(lessonActivities).values(activityRows);

  return { id: input.id, warnings: result.warnings };
}

/** Personal lesson for the user if one exists, otherwise the shared published lesson. */
export async function getLessonForEpisode(episodeId: string, userId: string) {
  const rows = await db
    .select()
    .from(videoLessons)
    .where(
      and(
        eq(videoLessons.episodeId, episodeId),
        eq(videoLessons.status, "published"),
        or(eq(videoLessons.forUserId, userId), isNull(videoLessons.forUserId)),
      ),
    )
    .orderBy(desc(videoLessons.updatedAt));
  return rows.find((r) => r.forUserId === userId) ?? rows.find((r) => !r.forUserId) ?? null;
}

export async function getLessonById(id: string) {
  const [row] = await db.select().from(videoLessons).where(eq(videoLessons.id, id)).limit(1);
  return row ?? null;
}
