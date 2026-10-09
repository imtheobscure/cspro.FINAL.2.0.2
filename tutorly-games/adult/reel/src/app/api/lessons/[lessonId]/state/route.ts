import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { lessonProgress, type ActivityStateValue } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";
import { getLessonById } from "@/modules/lessons/repository";
import { lessonActivityCount } from "@/modules/lessons/types";

type Ctx = { params: Promise<{ lessonId: string }> };
type Body = { activityStates?: Record<string, ActivityStateValue>; videoPosition?: number; status?: string; timeSpent?: number };

export async function GET(_req: Request, ctx: Ctx) {
  const { lessonId } = await ctx.params;
  const { user } = await getCurrentUser();
  const [row] = await db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lessonId))).limit(1);
  return json(row ?? null);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { lessonId } = await ctx.params;
  const { user } = await getCurrentUser();
  const lesson = await getLessonById(lessonId);
  if (!lesson) return error("Lesson not found", 404);
  const body = await readJson<Body>(req);
  const [existing] = await db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lessonId))).limit(1);
  const states = { ...(existing?.activityStates ?? {}), ...(body.activityStates ?? {}) };
  const total = lessonActivityCount(lesson.data);
  const done = Object.values(states).filter((s) => !["not_started", "active", "locked"].includes(s)).length;
  const percentage = total ? Math.round((done / total) * 100) : 0;
  const status = body.status ?? (percentage >= 100 ? "completed" : existing?.status === "not_started" || !existing ? "in_progress" : existing.status);
  const set = {
    activityStates: states,
    percentage,
    activitiesCompleted: done,
    status,
    videoPosition: body.videoPosition ?? existing?.videoPosition ?? 0,
    timeSpent: (existing?.timeSpent ?? 0) + (body.timeSpent ?? 0),
    startedAt: existing?.startedAt ?? new Date(),
    completedAt: percentage >= 100 ? (existing?.completedAt ?? new Date()) : null,
    updatedAt: new Date(),
  };
  if (existing) await db.update(lessonProgress).set(set).where(eq(lessonProgress.id, existing.id));
  else await db.insert(lessonProgress).values({ id: randomUUID(), userId: user.id, lessonId, ...set });
  return json({ ok: true, percentage, status, activityStates: states });
}
