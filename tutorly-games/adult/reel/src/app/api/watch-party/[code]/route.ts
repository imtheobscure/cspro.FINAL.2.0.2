import { and, eq, gt } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { users, watchParties, watchPartyParticipants } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";

type Ctx = { params: Promise<{ code: string }> };

async function loadParty(code: string) {
  const [party] = await db.select().from(watchParties).where(eq(watchParties.code, code.toUpperCase())).limit(1);
  return party ?? null;
}

/** Room state + presence. Polled by participants; acts as heartbeat. */
export async function GET(_req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const { user } = await getCurrentUser();
  const party = await loadParty(code);
  if (!party) return error("Room not found", 404);
  await db
    .insert(watchPartyParticipants)
    .values({ id: randomUUID(), partyId: party.id, userId: user.id, role: party.hostUserId === user.id ? "host" : "participant" })
    .onConflictDoUpdate({ target: [watchPartyParticipants.partyId, watchPartyParticipants.userId], set: { lastSeenAt: new Date() } });
  const since = new Date(Date.now() - 30000);
  const participants = await db
    .select({ userId: watchPartyParticipants.userId, role: watchPartyParticipants.role, name: users.name, color: users.avatarColor, lastSeenAt: watchPartyParticipants.lastSeenAt })
    .from(watchPartyParticipants)
    .innerJoin(users, eq(users.id, watchPartyParticipants.userId))
    .where(and(eq(watchPartyParticipants.partyId, party.id), gt(watchPartyParticipants.lastSeenAt, since)));
  return json({
    state: {
      roomId: party.id,
      code: party.code,
      episodeId: party.episodeId,
      hostUserId: party.hostUserId,
      mode: party.mode,
      isPlaying: party.isPlaying,
      currentTime: party.currentTime,
      playbackRate: party.playbackRate,
      subtitleTrack: party.subtitleTrackId,
      serverTimestamp: party.serverTimestamp,
    },
    participants,
    serverNow: Date.now(),
    you: { userId: user.id, isHost: party.hostUserId === user.id },
  });
}

type Body = { isPlaying?: boolean; currentTime?: number; playbackRate?: number; episodeId?: string; subtitleTrackId?: string | null; mode?: "host" | "follow" | "independent"; active?: boolean };

/** Host / co-host pushes authoritative playback state. */
export async function PUT(req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const { user } = await getCurrentUser();
  const party = await loadParty(code);
  if (!party) return error("Room not found", 404);
  const [me] = await db.select().from(watchPartyParticipants).where(and(eq(watchPartyParticipants.partyId, party.id), eq(watchPartyParticipants.userId, user.id))).limit(1);
  const canControl = party.hostUserId === user.id || me?.role === "cohost";
  if (!canControl) return error("Only the host can control playback", 403);
  const body = await readJson<Body>(req);
  await db
    .update(watchParties)
    .set({
      isPlaying: body.isPlaying ?? party.isPlaying,
      currentTime: body.currentTime ?? party.currentTime,
      playbackRate: body.playbackRate ?? party.playbackRate,
      episodeId: body.episodeId ?? party.episodeId,
      subtitleTrackId: body.subtitleTrackId === undefined ? party.subtitleTrackId : body.subtitleTrackId,
      mode: body.mode ?? party.mode,
      active: body.active ?? party.active,
      serverTimestamp: Date.now(),
      updatedAt: new Date(),
    })
    .where(eq(watchParties.id, party.id));
  return json({ ok: true, serverTimestamp: Date.now() });
}
