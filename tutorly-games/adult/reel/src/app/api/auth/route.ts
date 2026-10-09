import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { learnerProfiles, userPlayerPreferences, userStreaks, users } from "@/db/schema";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { error, json, readJson } from "@/lib/api";

type Body = { action: "login" | "signup" | "logout" | "me"; email?: string; password?: string; name?: string; cefrLevel?: string; nativeLanguage?: string; targetLanguage?: string; interests?: string[] };

export async function GET() {
  const me = await getCurrentUser();
  return json({ user: { id: me.user.id, name: me.user.name, email: me.user.email }, profile: me.profile, isGuest: me.isGuest });
}

export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  if (body.action === "logout") {
    await destroySession();
    return json({ ok: true });
  }
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return error("Valid email required");
  if (password.length < 6) return error("Password must be at least 6 characters");

  if (body.action === "signup") {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return error("An account with this email already exists", 409);
    const name = body.name?.trim() || email.split("@")[0];
    const id = randomUUID();
    const colors = ["#8b5cf6", "#f472b6", "#22d3ee", "#fbbf24", "#34d399", "#fb7185"];
    await db.insert(users).values({ id, email, name, passwordHash: hashPassword(password), avatarColor: colors[Math.floor(Math.random() * colors.length)] });
    await db.insert(learnerProfiles).values({
      id: randomUUID(),
      userId: id,
      cefrLevel: body.cefrLevel ?? "B1",
      nativeLanguage: body.nativeLanguage ?? "Spanish",
      targetLanguage: body.targetLanguage ?? "English",
      interests: body.interests ?? [],
      onboarded: true,
    });
    await db.insert(userStreaks).values({ id: randomUUID(), userId: id });
    await db.insert(userPlayerPreferences).values({ id: randomUUID(), userId: id });
    await createSession(id);
    return json({ ok: true, userId: id });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) return error("Invalid email or password", 401);
  await createSession(user.id);
  return json({ ok: true, userId: user.id });
}
