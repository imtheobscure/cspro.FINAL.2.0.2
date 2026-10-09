import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { episodes, watchProgress } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";
import { evaluateBadges } from "@/modules/gamification/engine";

type Body = { episodeId: string; position: number; duration: number; completed?: boolean; lastSubtitleId?: string | null; lastChapterId?: string | null };

export async function GET() {
  const { user } = await getCurrentUser();
  const rows = await db
    .select({ progress: watchProgress, episode: episodes })
    .from(watchProgress)
    .innerJoin(episodes, eq(episodes.id, watchProgress.episodeId))
    .where(eq(watchProgress.userId, user.id))
    .orderBy(desc(watchProgress.lastWatchedAt))
    .limit(10);
  return json(rows);
}

/** Throttled by the client (every ~10s, on pause/seek/unload). Also accepts sendBeacon text bodies. */
export async function POST(req: Request) {
  const { user } = await getCurrentUser();
  let body: Body;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) body = await readJson<Body>(req);
  else {
    try {
      body = JSON.parse(await req.text()) as Body;
    } catch {
      return error("Invalid body");
    }
  }
  if (!body.episodeId || typeof body.position !== "number") return error("episodeId and position required");
  const [ep] = await db.select({ id: episodes.id, duration: episodes.duration }).from(episodes).where(eq(episodes.id, body.episodeId)).limit(1);
  if (!ep) return error("Unknown episode", 404);
  const duration = body.duration || ep.duration || 0;
  const percentage = duration ? Math.min(100, (body.position / duration) * 100) : 0;
  const completed = body.completed ?? percentage >= 92;

  const [existing] = await db.select().from(watchProgress).where(and(eq(watchProgress.userId, user.id), eq(watchProgress.episodeId, body.episodeId))).limit(1);
  const values = {
    position: body.position,
    duration,
    percentage,
    completed: completed || existing?.completed === true,
    lastSubtitleId: body.lastSubtitleId ?? existing?.lastSubtitleId ?? null,
    lastChapterId: body.lastChapterId ?? existing?.lastChapterId ?? null,
    lastWatchedAt: new Date(),
  };
  if (existing) await db.update(watchProgress).set(values).where(eq(watchProgress.id, existing.id));
  else await db.insert(watchProgress).values({ id: randomUUID(), userId: user.id, episodeId: body.episodeId, ...values });
  const newBadges = completed && !existing?.completed ? await evaluateBadges(user.id) : [];
  return json({ ok: true, percentage, completed: values.completed, newBadges });
}
