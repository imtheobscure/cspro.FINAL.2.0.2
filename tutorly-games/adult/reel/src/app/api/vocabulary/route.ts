import { and, asc, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { learningHistory, vocabularyItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";
import { evaluateBadges } from "@/modules/gamification/engine";

export async function GET() {
  const { user } = await getCurrentUser();
  const items = await db.select().from(vocabularyItems).where(eq(vocabularyItems.userId, user.id)).orderBy(asc(vocabularyItems.nextReviewAt), desc(vocabularyItems.firstSeenAt));
  const now = Date.now();
  return json({ items, due: items.filter((i) => i.nextReviewAt && i.nextReviewAt.getTime() <= now && i.status !== "mastered").length });
}

type PostBody = { word: string; translation?: string; definition?: string; example?: string; episodeId?: string; timestamp?: number; cueId?: string; partOfSpeech?: string; cefr?: string };

export async function POST(req: Request) {
  const { user } = await getCurrentUser();
  const body = await readJson<PostBody>(req);
  const word = body.word?.trim().replace(/^[^\p{L}]+|[^\p{L}'-]+$/gu, "");
  if (!word) return error("word required");
  const lemma = word.toLowerCase();
  const [existing] = await db.select().from(vocabularyItems).where(and(eq(vocabularyItems.userId, user.id), eq(vocabularyItems.lemma, lemma), eq(vocabularyItems.language, "en"))).limit(1);
  if (existing) return json({ item: existing, created: false });
  const [item] = await db
    .insert(vocabularyItems)
    .values({
      id: randomUUID(),
      userId: user.id,
      word,
      lemma,
      language: "en",
      translation: body.translation ?? null,
      definition: body.definition ?? null,
      example: body.example ?? null,
      partOfSpeech: body.partOfSpeech ?? null,
      cefr: body.cefr ?? null,
      sourceEpisodeId: body.episodeId ?? null,
      sourceTimestamp: body.timestamp ?? null,
      sourceCueId: body.cueId ?? null,
      status: "new",
      nextReviewAt: new Date(Date.now() + 86400000),
    })
    .returning();
  await db.insert(learningHistory).values({ id: randomUUID(), userId: user.id, type: "vocab_saved", episodeId: body.episodeId ?? null, payload: { word, cueId: body.cueId ?? null } });
  const newBadges = await evaluateBadges(user.id);
  return json({ item, created: true, newBadges });
}

/** Spaced repetition review (SM-2 style). quality: 0 (forgot) – 5 (perfect). */
export async function PATCH(req: Request) {
  const { user } = await getCurrentUser();
  const body = await readJson<{ id: string; quality?: number; status?: string; translation?: string; definition?: string }>(req);
  const [item] = await db.select().from(vocabularyItems).where(and(eq(vocabularyItems.id, body.id), eq(vocabularyItems.userId, user.id))).limit(1);
  if (!item) return error("Not found", 404);

  const set: Partial<typeof item> = {};
  if (body.translation !== undefined) set.translation = body.translation;
  if (body.definition !== undefined) set.definition = body.definition;
  if (body.status) set.status = body.status;

  if (typeof body.quality === "number") {
    const q = Math.max(0, Math.min(5, body.quality));
    let ease = item.easeFactor;
    let interval = item.intervalDays;
    let reviewCount = item.reviewCount;
    let mastery = item.mastery;
    if (q < 3) {
      interval = 0.5;
      ease = Math.max(1.3, ease - 0.2);
      mastery = Math.max(0, mastery - 15);
    } else {
      reviewCount += 1;
      interval = reviewCount === 1 ? 1 : reviewCount === 2 ? 3 : Math.round(interval * ease * 10) / 10;
      ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
      mastery = Math.min(100, mastery + (q === 5 ? 20 : q === 4 ? 14 : 8));
    }
    Object.assign(set, {
      easeFactor: ease,
      intervalDays: interval,
      reviewCount,
      mastery,
      lastReviewedAt: new Date(),
      nextReviewAt: new Date(Date.now() + interval * 86400000),
      status: q < 3 ? "needsReview" : mastery >= 90 ? "mastered" : mastery >= 60 ? "known" : mastery >= 30 ? "review" : "learning",
    });
    await db.insert(learningHistory).values({ id: randomUUID(), userId: user.id, type: "review", payload: { word: item.word, quality: q } });
  }
  const [updated] = await db.update(vocabularyItems).set(set).where(eq(vocabularyItems.id, item.id)).returning();
  return json({ item: updated });
}

export async function DELETE(req: Request) {
  const { user } = await getCurrentUser();
  const { id } = await readJson<{ id: string }>(req);
  await db.delete(vocabularyItems).where(and(eq(vocabularyItems.id, id), eq(vocabularyItems.userId, user.id)));
  return json({ ok: true });
}
