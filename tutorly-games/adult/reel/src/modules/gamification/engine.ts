import { and, count, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import {
  activityAttempts,
  badges,
  grammarItems,
  learnerProfiles,
  learningHistory,
  lessonProgress,
  userBadges,
  userStreaks,
  vocabularyItems,
  watchPartyParticipants,
  watchProgress,
  type ActivityStateValue,
  type Badge,
  type BadgeCondition,
} from "@/db/schema";
import type { Activity, VideoLesson } from "@/modules/lessons/types";
import { lessonActivityCount } from "@/modules/lessons/types";
import type { EvaluationResult } from "@/modules/activities/evaluate";

export const DEFAULT_POINTS_TO_LEVEL = 500;

export function levelForXp(xp: number, pointsToLevelUp = DEFAULT_POINTS_TO_LEVEL) {
  const level = Math.floor(xp / pointsToLevelUp) + 1;
  const into = xp - (level - 1) * pointsToLevelUp;
  return { level, into, next: pointsToLevelUp, progress: into / pointsToLevelUp };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function touchDailyStreak(userId: string) {
  const [s] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);
  const t = today();
  if (!s) {
    await db.insert(userStreaks).values({ id: randomUUID(), userId, currentDaily: 1, longestDaily: 1, lastActiveDate: t });
    return 1;
  }
  if (s.lastActiveDate === t) return s.currentDaily;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const current = s.lastActiveDate === yesterday ? s.currentDaily + 1 : 1;
  await db
    .update(userStreaks)
    .set({ currentDaily: current, longestDaily: Math.max(current, s.longestDaily), lastActiveDate: t, updatedAt: new Date() })
    .where(eq(userStreaks.userId, userId));
  return current;
}

async function userStats(userId: string) {
  const [attemptsCompleted] = await db.select({ n: count() }).from(activityAttempts).where(eq(activityAttempts.userId, userId));
  const [attemptsCorrect] = await db.select({ n: count() }).from(activityAttempts).where(and(eq(activityAttempts.userId, userId), eq(activityAttempts.correct, true)));
  const [speakingPerfect] = await db
    .select({ n: count() })
    .from(activityAttempts)
    .where(and(eq(activityAttempts.userId, userId), eq(activityAttempts.correct, true), sql`${activityAttempts.activityType} in ('speaking','voiceOver')`));
  const [vocab] = await db.select({ n: count() }).from(vocabularyItems).where(eq(vocabularyItems.userId, userId));
  const [lessons] = await db.select({ n: count() }).from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "completed")));
  const [eps] = await db.select({ n: count() }).from(watchProgress).where(and(eq(watchProgress.userId, userId), eq(watchProgress.completed, true)));
  const [parties] = await db.select({ n: count() }).from(watchPartyParticipants).where(eq(watchPartyParticipants.userId, userId));
  const [profile] = await db.select().from(learnerProfiles).where(eq(learnerProfiles.userId, userId)).limit(1);
  const [streak] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);
  return {
    activities_completed: attemptsCompleted.n,
    activities_correct: attemptsCorrect.n,
    speaking_perfect: speakingPerfect.n,
    vocab_saved: vocab.n,
    lessons_completed: lessons.n,
    episodes_completed: eps.n,
    watch_party_joined: parties.n,
    xp: profile?.xp ?? 0,
    correct_streak: streak?.bestCorrectStreak ?? 0,
    daily_streak: streak?.longestDaily ?? 0,
  } satisfies Record<BadgeCondition["type"], number>;
}

/** Evaluates all badge conditions and awards new ones. Returns newly earned badges. */
export async function evaluateBadges(userId: string): Promise<Badge[]> {
  const stats = await userStats(userId);
  const all = await db.select().from(badges);
  const owned = new Set((await db.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, userId))).map((b) => b.badgeId));
  const earned: Badge[] = [];
  for (const b of all) {
    if (owned.has(b.id)) continue;
    if (stats[b.condition.type] >= b.condition.count) {
      await db.insert(userBadges).values({ id: randomUUID(), userId, badgeId: b.id }).onConflictDoNothing();
      await db.insert(learningHistory).values({ id: randomUUID(), userId, type: "badge_earned", payload: { badgeId: b.id } });
      earned.push(b);
    }
  }
  return earned;
}

export async function addXp(userId: string, amount: number, pointsToLevelUp = DEFAULT_POINTS_TO_LEVEL) {
  const [profile] = await db.select().from(learnerProfiles).where(eq(learnerProfiles.userId, userId)).limit(1);
  const xp = (profile?.xp ?? 0) + amount;
  const { level } = levelForXp(xp, pointsToLevelUp);
  const leveledUp = level > (profile?.level ?? 1);
  await db.update(learnerProfiles).set({ xp, level, updatedAt: new Date() }).where(eq(learnerProfiles.userId, userId));
  return { ...levelForXp(xp, pointsToLevelUp), xp, leveledUp };
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Update grammar / vocabulary mastery based on an activity outcome. */
async function updateKnowledge(userId: string, activity: Activity, correct: boolean | null, lessonId: string, episodeId: string | null) {
  const delta = correct === null ? 5 : correct ? 15 : -8;
  for (const g of activity.grammar ?? []) {
    const slug = slugify(g);
    const [existing] = await db.select().from(grammarItems).where(and(eq(grammarItems.userId, userId), eq(grammarItems.slug, slug))).limit(1);
    if (existing) {
      const mastery = Math.max(0, Math.min(100, existing.mastery + delta));
      await db
        .update(grammarItems)
        .set({
          mastery,
          correctCount: existing.correctCount + (correct ? 1 : 0),
          incorrectCount: existing.incorrectCount + (correct === false ? 1 : 0),
          status: mastery >= 80 ? "mastered" : correct === false ? "needsReview" : "practiced",
          lastPracticedAt: new Date(),
        })
        .where(eq(grammarItems.id, existing.id));
    } else {
      await db.insert(grammarItems).values({
        id: randomUUID(),
        userId,
        name: g,
        slug,
        description: activity.comprehensiveFeedback.slice(0, 240),
        level: "B1",
        examples: activity.sourceText ? [activity.sourceText] : [],
        sourceLessonId: lessonId,
        sourceEpisodeId: episodeId,
        mastery: Math.max(0, 20 + delta),
        status: correct === false ? "needsReview" : "practiced",
        correctCount: correct ? 1 : 0,
        incorrectCount: correct === false ? 1 : 0,
        lastPracticedAt: new Date(),
      });
    }
  }
  for (const w of activity.vocabulary ?? []) {
    const lemma = w.toLowerCase().trim();
    const [existing] = await db.select().from(vocabularyItems).where(and(eq(vocabularyItems.userId, userId), eq(vocabularyItems.lemma, lemma), eq(vocabularyItems.language, "en"))).limit(1);
    if (existing) {
      const mastery = Math.max(0, Math.min(100, existing.mastery + delta));
      await db
        .update(vocabularyItems)
        .set({ mastery, status: mastery >= 90 ? "mastered" : mastery >= 60 ? "known" : correct === false ? "needsReview" : "learning", lastReviewedAt: new Date() })
        .where(eq(vocabularyItems.id, existing.id));
    }
  }
}

export type OutcomeInput = {
  userId: string;
  lesson: VideoLesson;
  lessonId: string;
  episodeId: string | null;
  activity: Activity;
  result: EvaluationResult;
  points: number;
  answer: unknown;
  attemptNumber: number;
  timeSpent: number;
  videoTimestamp: number;
};

export async function recordActivityOutcome(input: OutcomeInput) {
  const { userId, lesson, lessonId, activity, result } = input;
  const scored = result.correct !== null;
  const finalState: ActivityStateValue = scored ? (result.correct ? "correct" : "incorrect") : "completed";

  await db.insert(activityAttempts).values({
    id: randomUUID(),
    userId,
    lessonId,
    activityId: activity.id,
    activityType: activity.type,
    attemptNumber: input.attemptNumber,
    answer: input.answer,
    correct: result.correct,
    score: input.points,
    timeSpent: input.timeSpent,
    videoTimestamp: input.videoTimestamp,
    feedbackShown: result.correct === false ? "incorrect" : "correct",
  });

  // Streaks
  const [streak] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);
  let correctStreak = streak?.correctStreak ?? 0;
  if (scored) correctStreak = result.correct ? correctStreak + 1 : 0;
  if (streak) {
    await db
      .update(userStreaks)
      .set({ correctStreak, bestCorrectStreak: Math.max(correctStreak, streak.bestCorrectStreak), updatedAt: new Date() })
      .where(eq(userStreaks.userId, userId));
  }
  const dailyStreak = await touchDailyStreak(userId);

  // Lesson progress
  const total = lessonActivityCount(lesson);
  const [existing] = await db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId))).limit(1);
  const states: Record<string, ActivityStateValue> = { ...(existing?.activityStates ?? {}) };
  const wasDone = states[activity.id] && !["not_started", "active", "locked", "skipped"].includes(states[activity.id]);
  const allowRetry = lesson.globalSettings.allowRetry;
  if (!wasDone || allowRetry) states[activity.id] = finalState;
  const doneCount = Object.values(states).filter((s) => !["not_started", "active", "locked"].includes(s)).length;
  const correctCount = Object.values(states).filter((s) => s === "correct" || s === "completed").length;
  const percentage = total ? Math.round((doneCount / total) * 100) : 0;
  const completedNow = percentage >= 100 && existing?.status !== "completed";
  const xpEarned = wasDone && !allowRetry ? 0 : input.points;

  if (existing) {
    await db
      .update(lessonProgress)
      .set({
        status: percentage >= 100 ? "completed" : "in_progress",
        currentSegment: activity.id.split("-act-")[0],
        currentActivity: activity.id,
        videoPosition: input.videoTimestamp,
        score: existing.score + xpEarned,
        xp: existing.xp + xpEarned,
        percentage,
        activitiesCompleted: doneCount,
        activitiesCorrect: correctCount,
        timeSpent: existing.timeSpent + input.timeSpent,
        activityStates: states,
        startedAt: existing.startedAt ?? new Date(),
        completedAt: percentage >= 100 ? (existing.completedAt ?? new Date()) : null,
        updatedAt: new Date(),
      })
      .where(eq(lessonProgress.id, existing.id));
  } else {
    await db.insert(lessonProgress).values({
      id: randomUUID(),
      userId,
      lessonId,
      status: percentage >= 100 ? "completed" : "in_progress",
      currentSegment: activity.id.split("-act-")[0],
      currentActivity: activity.id,
      videoPosition: input.videoTimestamp,
      score: xpEarned,
      xp: xpEarned,
      percentage,
      activitiesCompleted: doneCount,
      activitiesCorrect: correctCount,
      timeSpent: input.timeSpent,
      activityStates: states,
      startedAt: new Date(),
      completedAt: percentage >= 100 ? new Date() : null,
    });
    await db.insert(learningHistory).values({ id: randomUUID(), userId, type: "lesson_started", lessonId, episodeId: input.episodeId, payload: { title: lesson.metadata.title } });
  }

  await db.insert(learningHistory).values({
    id: randomUUID(),
    userId,
    type: "activity_attempt",
    lessonId,
    episodeId: input.episodeId,
    payload: { activityId: activity.id, type: activity.type, correct: result.correct, points: xpEarned, grammar: activity.grammar ?? [], vocabulary: activity.vocabulary ?? [] },
  });
  if (completedNow) {
    await db.insert(learningHistory).values({ id: randomUUID(), userId, type: "lesson_completed", lessonId, episodeId: input.episodeId, payload: { title: lesson.metadata.title, percentage } });
    if (streak) await db.update(userStreaks).set({ lessonStreak: (streak.lessonStreak ?? 0) + 1 }).where(eq(userStreaks.userId, userId));
  }

  await updateKnowledge(userId, activity, result.correct, lessonId, input.episodeId);
  const xpState = await addXp(userId, xpEarned, lesson.globalSettings.pointsToLevelUp);
  const newBadges = await evaluateBadges(userId);

  return {
    state: finalState,
    xpEarned,
    xp: xpState.xp,
    level: xpState.level,
    leveledUp: xpState.leveledUp,
    levelProgress: xpState.progress,
    correctStreak,
    dailyStreak,
    percentage,
    lessonCompleted: percentage >= 100,
    completedNow,
    activityStates: states,
    newBadges,
  };
}
