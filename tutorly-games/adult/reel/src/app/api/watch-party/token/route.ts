import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { watchParties } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";

type Body = { code?: string; identity?: string; name?: string; color?: string };

const TTL_SECONDS = 60 * 60 * 6;

function serverUrl(): string | null {
  return process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Mints a LiveKit access token for a watch-party room.
 *
 * LiveKit tokens are plain HS256 JWTs, so they are signed here with node:crypto —
 * no extra SDK dependency on the server. The grant is scoped to the party's room
 * (`roomJoin`, publish, subscribe) and expires with the session.
 */
export async function POST(req: Request) {
  const url = serverUrl();
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    return json(
      {
        ok: false,
        configured: false,
        error: "LiveKit is not configured",
        hint: "Set LIVEKIT_URL (or NEXT_PUBLIC_LIVEKIT_URL), LIVEKIT_API_KEY and LIVEKIT_API_SECRET to switch watch parties to WebRTC. Polling keeps working without them.",
      },
      501,
    );
  }

  const { user, profile } = await getCurrentUser();
  const body = await readJson<Body>(req);
  const code = (body.code ?? "").toUpperCase();
  if (!code) return error("A party code is required");
  const [party] = await db.select({ id: watchParties.id, code: watchParties.code }).from(watchParties).where(eq(watchParties.code, code)).limit(1);
  if (!party) return error("Party not found", 404);

  const identity = body.identity || user.id;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: apiKey,
    sub: identity,
    name: body.name || user.name,
    jti: identity,
    nbf: now - 10,
    iat: now,
    exp: now + TTL_SECONDS,
    video: {
      room: code,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
    metadata: JSON.stringify({ color: body.color || user.avatarColor, cefr: profile.cefrLevel }),
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = createHmac("sha256", apiSecret).update(signingInput).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const token = `${signingInput}.${signature}`;

  return json({ ok: true, configured: true, url, token, room: code, identity, expiresIn: TTL_SECONDS });
}

/** Tells the client whether to use WebRTC or stay on polling. */
export async function GET() {
  const configured = !!(serverUrl() && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
  return json({ configured, url: configured ? serverUrl() : null });
}
