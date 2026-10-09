import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/db";
import { learnerProfiles, sessions, userPlayerPreferences, userStreaks, users, type LearnerProfile, type User } from "@/db/schema";
import { DEMO_USER_ID } from "@/db/seed";
import { ensureSeeded } from "@/lib/bootstrap";

export const SESSION_COOKIE = "lingua_session";
const SESSION_DAYS = 30;

export type CurrentUser = { user: User; profile: LearnerProfile; isGuest: boolean };

async function loadProfile(userId: string): Promise<LearnerProfile> {
  const [profile] = await db.select().from(learnerProfiles).where(eq(learnerProfiles.userId, userId)).limit(1);
  if (profile) return profile;
  const [created] = await db
    .insert(learnerProfiles)
    .values({ id: randomUUID(), userId })
    .returning();
  await db.insert(userStreaks).values({ id: randomUUID(), userId }).onConflictDoNothing();
  await db.insert(userPlayerPreferences).values({ id: randomUUID(), userId }).onConflictDoNothing();
  return created;
}

/**
 * Resolves the learner this build belongs to.
 *
 * There is deliberately no sign-in: this is a single-learner platform, so every
 * request resolves to the local profile. Cookie sessions are still read if one happens
 * to exist, which keeps any data created before this change attached to its owner, but
 * nothing in the UI asks anyone to log in and a missing session is never a barrier.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  await ensureSeeded();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const [row] = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);
    if (row) return { user: row.user, profile: await loadProfile(row.user.id), isGuest: false };
  }
  const [demo] = await db.select().from(users).where(eq(users.id, DEMO_USER_ID)).limit(1);
  return { user: demo, profile: await loadProfile(demo.id), isGuest: true };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(sessions).values({ id: randomUUID(), userId, token, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", expires: expiresAt, secure: process.env.NODE_ENV === "production" });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  store.delete(SESSION_COOKIE);
}
