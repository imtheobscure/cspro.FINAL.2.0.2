import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";

export async function GET() {
  const { user } = await getCurrentUser();
  return json(await db.select().from(bookmarks).where(eq(bookmarks.userId, user.id)).orderBy(desc(bookmarks.createdAt)).limit(100));
}

export async function POST(req: Request) {
  const { user } = await getCurrentUser();
  const body = await readJson<{ episodeId: string; time: number; note?: string; cueId?: string }>(req);
  if (!body.episodeId || typeof body.time !== "number") return error("episodeId and time required");
  const [row] = await db.insert(bookmarks).values({ id: randomUUID(), userId: user.id, episodeId: body.episodeId, time: body.time, note: body.note?.slice(0, 300) ?? null, cueId: body.cueId ?? null }).returning();
  return json(row);
}
