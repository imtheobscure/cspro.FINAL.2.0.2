import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityAttempts, badges, courses, episodes, grammarItems, learningHistory, lessonProgress, seasons, series, subtitleTracks, userBadges, userStreaks, videoLessons, vocabularyItems, watchProgress } from "@/db/schema";
import type { EpisodeLite } from "@/components/watch/types";

export async function getCatalog() {
  const courseRows = await db.select().from(courses).orderBy(asc(courses.createdAt));
  const seriesRows = await db.select().from(series).orderBy(asc(series.sortOrder));
  const seasonRows = await db.select().from(seasons).orderBy(asc(seasons.seasonNumber));
  const episodeRows = await db.select().from(episodes).orderBy(asc(episodes.episodeNumber));
  return { courses: courseRows, series: seriesRows, seasons: seasonRows, episodes: episodeRows };
}

export async function getEpisodeLites(userId: string, seasonIds: string[]): Promise<Map<string, EpisodeLite[]>> {
  if (!seasonIds.length) return new Map();
  const eps = await db.select().from(episodes).where(inArray(episodes.seasonId, seasonIds)).orderBy(asc(episodes.episodeNumber));
  const ids = eps.map((e) => e.id);
  const progress = ids.length ? await db.select().from(watchProgress).where(and(eq(watchProgress.userId, userId), inArray(watchProgress.episodeId, ids))) : [];
  const tracks = ids.length ? await db.select({ episodeId: subtitleTracks.episodeId }).from(subtitleTracks).where(inArray(subtitleTracks.episodeId, ids)) : [];
  const lessons = ids.length ? await db.select({ episodeId: videoLessons.episodeId }).from(videoLessons).where(inArray(videoLessons.episodeId, ids)) : [];
  const withSubs = new Set(tracks.map((t) => t.episodeId));
  const withLesson = new Set(lessons.map((l) => l.episodeId));
  const map = new Map<string, EpisodeLite[]>();
  for (const e of eps) {
    const p = progress.find((x) => x.episodeId === e.id);
    const lite: EpisodeLite = { id: e.id, episodeNumber: e.episodeNumber, title: e.title, duration: e.duration, thumbnail: e.thumbnail, progress: p?.percentage ?? 0, completed: p?.completed ?? false, hasSubtitles: withSubs.has(e.id), hasLesson: withLesson.has(e.id) };
    if (!map.has(e.seasonId)) map.set(e.seasonId, []);
    map.get(e.seasonId)!.push(lite);
  }
  return map;
}

export async function getContinueWatching(userId: string) {
  return db
    .select({ progress: watchProgress, episode: episodes, season: seasons, series: series })
    .from(watchProgress)
    .innerJoin(episodes, eq(episodes.id, watchProgress.episodeId))
    .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
    .innerJoin(series, eq(series.id, seasons.seriesId))
    .where(and(eq(watchProgress.userId, userId), eq(watchProgress.completed, false)))
    .orderBy(desc(watchProgress.lastWatchedAt))
    .limit(6);
}

export async function getLearnerDashboard(userId: string) {
  const [streak] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);
  const vocab = await db.select().from(vocabularyItems).where(eq(vocabularyItems.userId, userId));
  const grammar = await db.select().from(grammarItems).where(eq(grammarItems.userId, userId)).orderBy(desc(grammarItems.lastPracticedAt));
  const lessons = await db
    .select({ progress: lessonProgress, lesson: videoLessons })
    .from(lessonProgress)
    .innerJoin(videoLessons, eq(videoLessons.id, lessonProgress.lessonId))
    .where(eq(lessonProgress.userId, userId))
    .orderBy(desc(lessonProgress.updatedAt));
  const earned = await db.select({ badge: badges, earnedAt: userBadges.earnedAt }).from(userBadges).innerJoin(badges, eq(badges.id, userBadges.badgeId)).where(eq(userBadges.userId, userId));
  const allBadges = await db.select().from(badges).orderBy(asc(badges.sortOrder));
  const history = await db.select().from(learningHistory).where(eq(learningHistory.userId, userId)).orderBy(desc(learningHistory.createdAt)).limit(40);
  const [attempts] = await db.select({ total: count(), correct: sql<number>`count(*) filter (where ${activityAttempts.correct} = true)` }).from(activityAttempts).where(eq(activityAttempts.userId, userId));
  const skillRows = await db
    .select({ type: activityAttempts.activityType, total: count(), correct: sql<number>`count(*) filter (where ${activityAttempts.correct} = true)` })
    .from(activityAttempts)
    .where(eq(activityAttempts.userId, userId))
    .groupBy(activityAttempts.activityType);
  const weakActivities = await db
    .select({ activityId: activityAttempts.activityId, lessonId: activityAttempts.lessonId, type: activityAttempts.activityType, wrong: count() })
    .from(activityAttempts)
    .where(and(eq(activityAttempts.userId, userId), eq(activityAttempts.correct, false)))
    .groupBy(activityAttempts.activityId, activityAttempts.lessonId, activityAttempts.activityType)
    .orderBy(desc(count()))
    .limit(8);
  const now = Date.now();
  return {
    streak,
    vocab,
    dueVocab: vocab.filter((v) => v.nextReviewAt && v.nextReviewAt.getTime() <= now && v.status !== "mastered"),
    grammar,
    lessons,
    earned,
    allBadges,
    history,
    attempts: { total: attempts?.total ?? 0, correct: Number(attempts?.correct ?? 0) },
    skills: skillRows.map((r) => ({ type: r.type, total: r.total, correct: Number(r.correct) })),
    weakActivities,
  };
}
