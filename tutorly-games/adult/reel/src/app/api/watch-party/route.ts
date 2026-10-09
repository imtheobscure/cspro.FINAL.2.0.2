import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { episodes, watchParties, watchPartyParticipants } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson, shortId } from "@/lib/api";
import { evaluateBadges } from "@/modules/gamification/engine";

type Body = { action: "create" | "join"; episodeId?: string; mode?: "host" | "follow" | "independent"; code?: string };

export async function POST(req: Request) {
  const { user } = await getCurrentUser();
  const body = await readJson<Body>(req);

  if (body.action === "create") {
    if (!body.episodeId) return error("episodeId required");
    const [ep] = await db.select({ id: episodes.id }).from(episodes).where(eq(episodes.id, body.episodeId)).limit(1);
    if (!ep) return error("Episode not found", 404);
    const id = randomUUID();
    const code = shortId();
    await db.insert(watchParties).values({ id, code, episodeId: body.episodeId, hostUserId: user.id, mode: body.mode ?? "host", serverTimestamp: Date.now() });
    await db.insert(watchPartyParticipants).values({ id: randomUUID(), partyId: id, userId: user.id, role: "host" });
    const newBadges = await evaluateBadges(user.id);
    return json({ ok: true, code, partyId: id, episodeId: body.episodeId, newBadges });
  }

  if (body.action === "join") {
    const code = body.code?.trim().toUpperCase();
    if (!code) return error("code required");
    const [party] = await db.select().from(watchParties).where(eq(watchParties.code, code)).limit(1);
    if (!party || !party.active) return error("Room not found", 404);
    await db
      .insert(watchPartyParticipants)
      .values({ id: randomUUID(), partyId: party.id, userId: user.id, role: party.hostUserId === user.id ? "host" : "participant" })
      .onConflictDoNothing();
    const newBadges = await evaluateBadges(user.id);
    return json({ ok: true, code: party.code, partyId: party.id, episodeId: party.episodeId, newBadges });
  }
  return error("Unknown action");
}
