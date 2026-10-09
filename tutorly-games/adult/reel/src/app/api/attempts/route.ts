import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityAttempts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";
import { evaluateAnswer, pointsFor } from "@/modules/activities/evaluate";
import { getLessonById } from "@/modules/lessons/repository";
import { flattenActivities } from "@/modules/lessons/types";
import { recordActivityOutcome } from "@/modules/gamification/engine";

type Body = { lessonId: string; activityId: string; answer: unknown; timeSpent?: number; videoTimestamp?: number };

export async function POST(req: Request) {
  const { user } = await getCurrentUser();
  const body = await readJson<Body>(req);
  if (!body.lessonId || !body.activityId) return error("lessonId and activityId required");
  const lessonRow = await getLessonById(body.lessonId);
  if (!lessonRow) return error("Lesson not found", 404);
  if (lessonRow.forUserId && lessonRow.forUserId !== user.id) return error("Forbidden", 403);
  const entry = flattenActivities(lessonRow.data).find((e) => e.activity.id === body.activityId);
  if (!entry) return error("Activity not found", 404);

  const [prev] = await db
    .select({ n: count() })
    .from(activityAttempts)
    .where(and(eq(activityAttempts.userId, user.id), eq(activityAttempts.lessonId, body.lessonId), eq(activityAttempts.activityId, body.activityId)));
  const attemptNumber = (prev?.n ?? 0) + 1;

  const result = evaluateAnswer(entry.activity, body.answer);
  const points = pointsFor(entry.activity, result, attemptNumber);
  const outcome = await recordActivityOutcome({
    userId: user.id,
    lesson: lessonRow.data,
    lessonId: lessonRow.id,
    episodeId: lessonRow.episodeId,
    activity: entry.activity,
    result,
    points,
    answer: body.answer,
    attemptNumber,
    timeSpent: Math.max(0, Math.round(body.timeSpent ?? 0)),
    videoTimestamp: body.videoTimestamp ?? entry.activity.timestamp,
  });

  return json({
    correct: result.correct,
    score: result.score,
    detail: result.detail,
    attemptNumber,
    feedback: {
      main: result.correct === false ? entry.activity.incorrectFeedback : entry.activity.correctFeedback,
      comprehensive: entry.activity.comprehensiveFeedback,
    },
    ...outcome,
  });
}
