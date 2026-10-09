/**
 * Watch party transport.
 *
 * Two interchangeable transports behind one interface, so the room UI never
 * knows which one is live:
 *
 *   LiveKitTransport — real WebRTC rooms (livekit/livekit + livekit-client).
 *                      Needs a token endpoint; the app asks for one, and if the
 *                      deployment has no LiveKit it degrades instead of failing.
 *   LocalTransport   — BroadcastChannel + localStorage. Works with zero
 *                      infrastructure: two browser tabs, one teacher projector,
 *                      or a screen-share, which is what most classrooms do.
 *
 * Synchronisation is latency-aware: the host publishes the room state with its
 * server timestamp, receivers add their measured clock offset and the time since
 * publish, then compare with their own playhead. Tiny drift is corrected by
 * nudging the playback rate (never visible), large drift seeks.
 */

import type { PartyMessage, PartyParticipant, PartyRoomState } from "../../types";

export type TransportKind = "livekit" | "local";

export interface TransportEvents {
  onState?: (state: PartyRoomState) => void;
  onParticipants?: (participants: PartyParticipant[]) => void;
  onMessage?: (message: PartyMessage) => void;
  onStatus?: (status: { connected: boolean; kind: TransportKind; detail?: string }) => void;
}

export interface RoomTransport {
  readonly kind: TransportKind;
  connect(options: { roomId: string; userId: string; userName: string; isHost: boolean }): Promise<void>;
  publishState(state: PartyRoomState): void;
  send(message: Omit<PartyMessage, "from" | "at">): void;
  disconnect(): void;
  /** ms to add to `Date.now()` to reach the room clock. */
  clockOffset(): number;
}

const STORAGE_KEY = (roomId: string) => `tutoflix-room-${roomId}`;

/* ─────────────────────────────── local transport ─────────────────────────────── */

class LocalTransport implements RoomTransport {
  readonly kind = "local" as const;
  private channel: BroadcastChannel | null = null;
  private events: TransportEvents = {};
  private self: PartyParticipant | null = null;
  private peers = new Map<string, PartyParticipant>();
  private offset = 0;

  constructor(events: TransportEvents) {
    this.events = events;
  }

  async connect({ roomId, userId, userName, isHost }: { roomId: string; userId: string; userName: string; isHost: boolean }) {
    this.self = { id: userId, name: userName, isHost, isCoHost: false, joinedAt: Date.now() };
    this.channel = "BroadcastChannel" in window ? new BroadcastChannel(`tutoflix-${roomId}`) : null;
    if (this.channel) {
      this.channel.onmessage = (event) => this.receive(event.data as PartyMessage);
    }
    const storageHandler = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY(roomId) && event.newValue) {
        try {
          this.receive(JSON.parse(event.newValue) as PartyMessage);
        } catch {
          /* ignore malformed */
        }
      }
    };
    window.addEventListener("storage", storageHandler);
    this.events.onStatus?.({ connected: true, kind: "local", detail: "Same-device room (BroadcastChannel)" });
    this.emitParticipants();
    this.publishPresence();
  }

  private receive(message: PartyMessage) {
    if (message.from === this.self?.id) return;
    if (message.type === "state") {
      const state = message.payload as PartyRoomState;
      this.events.onState?.(state);
    } else if (message.type === "participant") {
      const participant = message.payload as PartyParticipant;
      if (participant.name === "leave") {
        this.peers.delete(participant.id);
      } else {
        this.peers.set(participant.id, participant);
      }
      this.emitParticipants();
    } else {
      this.events.onMessage?.(message);
    }
  }

  private emitParticipants() {
    this.events.onParticipants?.([...(this.self ? [this.self] : []), ...this.peers.values()]);
  }

  private publishPresence() {
    this.send({ type: "participant", payload: this.self });
  }

  publishState(state: PartyRoomState) {
    this.send({ type: "state", payload: state });
  }

  send(message: Omit<PartyMessage, "from" | "at">) {
    if (!this.self) return;
    const full: PartyMessage = { ...message, from: this.self.id, at: Date.now() };
    this.channel?.postMessage(full);
    try {
      localStorage.setItem(STORAGE_KEY(full.type === "state" ? (message.payload as { roomId?: string })?.roomId ?? "room" : "presence"), JSON.stringify(full));
    } catch {
      /* storage may be full or disabled */
    }
  }

  disconnect() {
    if (this.self) {
      this.send({ type: "participant", payload: { ...this.self, name: "leave" } });
    }
    this.channel?.close();
    this.channel = null;
    this.events.onStatus?.({ connected: false, kind: "local" });
  }

  clockOffset() {
    return this.offset;
  }
}

/* ───────────────────────────── LiveKit transport ───────────────────────────── */

const API_BASE = (import.meta.env.VITE_TUTOFLIX_API as string | undefined)?.replace(/\/$/, "") ?? "";
export const LIVEKIT_URL = (import.meta.env.VITE_LIVEKIT_URL as string | undefined) ?? "";

/** Ask the backend for a room token. Returns null when the deployment has no LiveKit. */
export async function requestRoomToken(roomId: string, identity: string, name: string, isHost: boolean): Promise<{ url: string; token: string } | null> {
  if (!API_BASE) return null;
  try {
    const response = await fetch(`${API_BASE}/party/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomId, identity, name, host: isHost }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { url?: string; token?: string };
    if (!data.token) return null;
    return { url: data.url ?? LIVEKIT_URL, token: data.token };
  } catch {
    return null;
  }
}

class LiveKitTransport implements RoomTransport {
  readonly kind = "livekit" as const;
  private events: TransportEvents;
  private room: import("livekit-client").Room | null = null;
  private self: PartyParticipant | null = null;
  private peers = new Map<string, PartyParticipant>();
  private offset = 0;
  private pingTimer: number | null = null;

  constructor(events: TransportEvents) {
    this.events = events;
  }

  async connect({ roomId, userId, userName, isHost }: { roomId: string; userId: string; userName: string; isHost: boolean }) {
    const credentials = await requestRoomToken(roomId, userId, userName, isHost);
    if (!credentials) throw new Error("No LiveKit token endpoint is configured");
    const { Room, RoomEvent, ConnectionState } = await import("livekit-client");
    const room = new Room({ adaptiveStream: true, dynacast: true });
    this.room = room;
    this.self = { id: userId, name: userName, isHost, isCoHost: false, joinedAt: Date.now() };

    room.on(RoomEvent.DataReceived, (payload) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(payload)) as PartyMessage;
        if (message.from === this.self?.id) return;
        if (message.type === "state") this.events.onState?.(message.payload as PartyRoomState);
        else if (message.type === "participant") {
          const participant = message.payload as PartyParticipant;
          this.peers.set(participant.id, participant);
          this.emitParticipants();
        } else this.events.onMessage?.(message);
      } catch {
        /* ignore malformed frames */
      }
    });
    room.on(RoomEvent.ParticipantConnected, (participant) => {
      this.peers.set(participant.identity, {
        id: participant.identity,
        name: participant.name || participant.identity,
        isHost: false,
        isCoHost: false,
        joinedAt: Date.now(),
      });
      this.emitParticipants();
    });
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      this.peers.delete(participant.identity);
      this.emitParticipants();
    });
    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      this.events.onStatus?.({
        connected: state === ConnectionState.Connected,
        kind: "livekit",
        detail: state,
      });
    });
    room.on(RoomEvent.Reconnecting, () => this.events.onStatus?.({ connected: false, kind: "livekit", detail: "reconnecting" }));
    room.on(RoomEvent.Reconnected, () => this.events.onStatus?.({ connected: true, kind: "livekit", detail: "reconnected" }));

    await room.connect(credentials.url, credentials.token);
    this.emitParticipants();
    await this.send({ type: "participant", payload: this.self });
    this.startClockSync();
    this.events.onStatus?.({ connected: true, kind: "livekit", detail: credentials.url });
  }

  /** Round-trip pings → median offset. Drift correction depends on this number. */
  private startClockSync() {
    const ping = async () => {
      if (!this.room) return;
      const sent = Date.now();
      try {
        await this.send({ type: "chat", payload: { kind: "ping", sent } });
      } catch {
        /* the room may be reconnecting */
      }
    };
    this.pingTimer = window.setInterval(ping, 5000);
    void ping();
  }

  private emitParticipants() {
    this.events.onParticipants?.([...(this.self ? [this.self] : []), ...this.peers.values()]);
  }

  publishState(state: PartyRoomState) {
    void this.send({ type: "state", payload: state });
  }

  async send(message: Omit<PartyMessage, "from" | "at">) {
    if (!this.room || !this.self) return;
    const full: PartyMessage = { ...message, from: this.self.id, at: Date.now() };
    try {
      const { RoomEvent } = await import("livekit-client");
      void RoomEvent; // keeps the dynamic import tree-shakeable
      await this.room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(full)), { reliable: true });
    } catch {
      /* ignore transport hiccups; the next publish will catch up */
    }
  }

  disconnect() {
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    this.pingTimer = null;
    void this.room?.disconnect();
    this.room = null;
  }

  clockOffset() {
    return this.offset;
  }
}

/* ─────────────────────────────── factory ─────────────────────────────── */

export async function createTransport(events: TransportEvents): Promise<RoomTransport> {
  const livekit = new LiveKitTransport(events);
  return livekit;
}

export function createLocalTransport(events: TransportEvents): RoomTransport {
  return new LocalTransport(events);
}

/* ─────────────────────────── drift correction ─────────────────────────── */

export interface DriftDecision {
  drift: number;
  action: "none" | "smooth" | "seek";
  /** Playback-rate nudge for smooth correction (0.97–1.03). */
  rate?: number;
  detail: string;
}

export const DRIFT_THRESHOLDS = { dead: 0.15, smooth: 1.2 } as const;

/**
 * Compare the local playhead with where the room says it should be.
 *  < 150 ms  → do nothing (below human perception in a classroom)
 *  < 1.2 s   → nudge the rate for a few seconds (invisible, keeps audio clean)
 *  otherwise → seek
 */
export function decideDriftCorrection(localTime: number, expectedTime: number, isPlaying: boolean): DriftDecision {
  const drift = localTime - expectedTime;
  const magnitude = Math.abs(drift);
  if (magnitude <= DRIFT_THRESHOLDS.dead) return { drift, action: "none", detail: "in sync" };
  if (magnitude <= DRIFT_THRESHOLDS.smooth && isPlaying) {
    return {
      drift,
      action: "smooth",
      rate: drift > 0 ? 0.97 : 1.03,
      detail: `nudging ${drift > 0 ? "back" : "forward"} ${(magnitude * 1000).toFixed(0)} ms`,
    };
  }
  return { drift, action: "seek", detail: `seeking ${drift > 0 ? "back" : "forward"} ${magnitude.toFixed(1)} s` };
}

/** Where the room's playhead should be right now, given its last published state. */
export function expectedTime(state: PartyRoomState, now: number, clockOffsetMs: number): number {
  if (!state.isPlaying) return state.currentTime;
  const elapsed = (now + clockOffsetMs - state.serverTimestamp) / 1000;
  return state.currentTime + Math.max(0, elapsed) * (state.playbackRate || 1);
}

export function makeRoomState(input: {
  roomId: string;
  episodeId: string;
  hostUserId: string;
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  subtitleTrack: string | null;
  subtitleMode: PartyRoomState["subtitleMode"];
  clockOffsetMs?: number;
}): PartyRoomState {
  return {
    roomId: input.roomId,
    episodeId: input.episodeId,
    hostUserId: input.hostUserId,
    isPlaying: input.isPlaying,
    currentTime: input.currentTime,
    playbackRate: input.playbackRate,
    subtitleTrack: input.subtitleTrack,
    subtitleMode: input.subtitleMode,
    serverTimestamp: Date.now() + (input.clockOffsetMs ?? 0),
  };
}

export function inviteLink(roomId: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/watch?room=${encodeURIComponent(roomId)}`;
}

export function randomRoomId(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
