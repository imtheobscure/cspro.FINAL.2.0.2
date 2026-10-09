"use client";

/**
 * Watch Party realtime transport (LiveKit).
 *
 * The room record in Postgres stays the source of truth for who is in a party;
 * LiveKit carries the moment-to-moment playback state over a WebRTC data channel
 * so everyone follows within a few milliseconds instead of a 2-second poll.
 *
 * The same JSON shape is used by both transports, so `planDriftCorrection()` is
 * shared: small drift is corrected smoothly by nudging the playback rate, large
 * drift is corrected with a seek — and the guest is never yanked around mid-word.
 *
 * When NEXT_PUBLIC_LIVEKIT_URL is not set the panel keeps using polling, so the
 * feature degrades instead of breaking.
 */
export type PartyPlaybackState = {
  roomId: string;
  code: string;
  episodeId: string;
  hostUserId: string;
  mode: "host" | "follow" | "independent";
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  subtitleTrackId?: string | null;
  /** Server clock at publish time, used to compensate for network latency. */
  serverTimestamp: number;
};

export type PartyParticipant = { userId: string; role: string; name: string; color: string };

export type PartyMessage =
  | { type: "state"; state: PartyPlaybackState; serverTimestamp: number }
  | { type: "presence"; participants: PartyParticipant[] }
  | { type: "reaction"; emoji: string; from: string }
  | { type: "request-state"; from: string };

export function livekitConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_LIVEKIT_URL;
}

export type DriftPlan = { drift: number; expected: number; action: "none" | "nudge" | "seek" };

/**
 * Latency-aware drift calculation, shared by the LiveKit and polling transports.
 * `serverNow` and `serverTimestamp` are both epoch ms on the server clock.
 */
export function planDriftCorrection(opts: { local: number; state: PartyPlaybackState; serverNow: number; isHost: boolean }): DriftPlan {
  const { local, state, serverNow, isHost } = opts;
  if (isHost || state.mode === "independent") return { drift: 0, expected: local, action: "none" };
  const elapsed = state.isPlaying ? ((serverNow - state.serverTimestamp) / 1000) * state.playbackRate : 0;
  const expected = state.currentTime + elapsed;
  const drift = expected - local;
  if (Math.abs(drift) > 2.5) return { drift, expected, action: "seek" };
  if (Math.abs(drift) > 0.4 && state.isPlaying) return { drift, expected, action: "nudge" };
  return { drift, expected, action: "none" };
}

type ConnectOptions = {
  code: string;
  identity: string;
  name: string;
  color?: string;
  onState?: (state: PartyPlaybackState, serverTimestamp: number) => void;
  onPresence?: (participants: PartyParticipant[]) => void;
  onReaction?: (emoji: string, from: string) => void;
  onError?: (message: string) => void;
  onConnected?: () => void;
};

/** Thin wrapper over livekit-client; imported lazily so it never ships unless used. */
export class LiveKitTransport {
  private room: import("livekit-client").Room | null = null;
  private handlers: Array<{ event: string; fn: (...args: never[]) => void }> = [];
  connected = false;

  async connect(opts: ConnectOptions): Promise<void> {
    if (!livekitConfigured()) throw new Error("NEXT_PUBLIC_LIVEKIT_URL is not configured");
    const res = await fetch("/api/watch-party/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: opts.code, identity: opts.identity, name: opts.name, color: opts.color }),
    });
    const json = (await res.json()) as { url?: string; token?: string; error?: string };
    if (!res.ok || !json.url || !json.token) throw new Error(json.error ?? "Could not get a LiveKit token");

    const lk = await import("livekit-client");
    const room = new lk.Room({ adaptiveStream: true, dynacast: true, disconnectOnPageLeave: true, publishDefaults: { simulcast: false } });
    this.room = room;

    room
      .on(lk.RoomEvent.DataReceived, (payload: Uint8Array, _participant, _kind, topic) => {
        try {
          const message = JSON.parse(new TextDecoder().decode(payload)) as PartyMessage;
          if (topic && topic !== "tutoflix.party") return;
          if (message.type === "state") opts.onState?.(message.state, message.serverTimestamp);
          else if (message.type === "presence") opts.onPresence?.(message.participants);
          else if (message.type === "reaction") opts.onReaction?.(message.emoji, message.from);
          else if (message.type === "request-state" && opts.onReaction === undefined) return;
        } catch {
          /* ignore malformed frames */
        }
      })
      .on(lk.RoomEvent.ParticipantConnected, () => this.publishPresence(opts))
      .on(lk.RoomEvent.ParticipantDisconnected, () => this.publishPresence(opts))
      .on(lk.RoomEvent.Disconnected, () => {
        this.connected = false;
        opts.onError?.("LiveKit disconnected");
      });

    await room.connect(json.url, json.token);
    this.connected = true;
    opts.onConnected?.();
  }

  private publishPresence(opts: ConnectOptions): void {
    const participants =
      this.room?.remoteParticipants?.size !== undefined
        ? [...(this.room?.remoteParticipants.values() ?? [])].map((p) => ({ userId: p.identity, role: "participant", name: p.name || p.identity, color: "#a78bfa" }))
        : [];
    opts.onPresence?.(participants);
  }

  async publish(message: PartyMessage): Promise<void> {
    if (!this.room || !this.connected) return;
    const payload = new TextEncoder().encode(JSON.stringify(message));
    await this.room.localParticipant.publishData(payload, { reliable: true, topic: "tutoflix.party" }).catch(() => undefined);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    for (const h of this.handlers) this.room?.off(h.event as never, h.fn as never);
    this.handlers = [];
    await this.room?.disconnect().catch(() => undefined);
    this.room = null;
  }
}
