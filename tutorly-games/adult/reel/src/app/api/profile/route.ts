import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { learnerProfiles, userPlayerPreferences, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { json, readJson } from "@/lib/api";
import { CEFR_LEVELS } from "@/modules/lessons/types";

type Body = {
  name?: string;
  cefrLevel?: string;
  nativeLanguage?: string;
  targetLanguage?: string;
  goals?: string[];
  interests?: string[];
  facts?: string[];
  weaknesses?: string[];
  strengths?: string[];
  preferences?: Record<string, unknown>;
  player?: Partial<{
    subtitleMode: string;
    playbackRate: number;
    quality: string;
    volume: number;
    autoSkipIntro: boolean;
    autoSkipRecap: boolean;
    autoSkipOutro: boolean;
    autoSkipCredits: boolean;
    autoplayNext: boolean;
    subtitleFontSize: string;
    subtitleBackground: boolean;
    theaterMode: boolean;
  }>;
};

export async function PUT(req: Request) {
  const { user, profile } = await getCurrentUser();
  const body = await readJson<Body>(req);
  if (body.name?.trim()) await db.update(users).set({ name: body.name.trim().slice(0, 60) }).where(eq(users.id, user.id));
  const set: Partial<typeof profile> = { updatedAt: new Date(), onboarded: true };
  if (body.cefrLevel && (CEFR_LEVELS as string[]).includes(body.cefrLevel)) set.cefrLevel = body.cefrLevel;
  if (body.nativeLanguage) set.nativeLanguage = body.nativeLanguage.slice(0, 40);
  if (body.targetLanguage) set.targetLanguage = body.targetLanguage.slice(0, 40);
  for (const key of ["goals", "interests", "facts", "weaknesses", "strengths"] as const) {
    if (Array.isArray(body[key])) set[key] = (body[key] as string[]).map((s) => String(s).slice(0, 80)).slice(0, 20);
  }
  if (body.preferences) set.preferences = { ...profile.preferences, ...body.preferences };
  await db.update(learnerProfiles).set(set).where(eq(learnerProfiles.userId, user.id));

  if (body.player) {
    const [existing] = await db.select().from(userPlayerPreferences).where(eq(userPlayerPreferences.userId, user.id)).limit(1);
    const values = { ...body.player, updatedAt: new Date() };
    if (existing) await db.update(userPlayerPreferences).set(values).where(eq(userPlayerPreferences.id, existing.id));
    else await db.insert(userPlayerPreferences).values({ id: randomUUID(), userId: user.id, ...body.player });
  }
  return json({ ok: true });
}
