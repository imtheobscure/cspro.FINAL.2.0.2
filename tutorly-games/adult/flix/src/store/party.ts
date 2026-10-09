/**
 * Watch party state (Zustand).
 *
 * The transport object itself lives in a module variable (it is not
 * serialisable and must not trigger renders); the store holds what the UI needs:
 * who is here, what the room says the playhead is, and how far this tab has
 * drifted. `mode` is the room's contract:
 *
 *   host        — this tab drives; every play/pause/seek is published
 *   follow      — this tab obeys the host (drift-corrected)
 *   independent — watching in the room, but with your own controls (a learner
 *                 scrubbing back to re-listen must not disturb the class)
 */

import { create } from "zustand";
import type { PartyMode, PartyParticipant, PartyRoomState } from "../types";
import {
  createLocalTransport,
  createTransport,
  decideDriftCorrection,
  expectedTime,
  makeRoomState,
  randomRoomId,
  type DriftDecision,
  type RoomTransport,
  type TransportKind,
} from "../lib/party/transport";

let transport: RoomTransport | null = null;

interface PartyState {
  roomId: string | null;
  mode: PartyMode;
  connected: boolean;
  transportKind: TransportKind | null;
  detail: string | null;
  participants: PartyParticipant[];
  roomState: PartyRoomState | null;
  drift: DriftDecision | null;
  episodeId: string | null;
  error: string | null;

  join: (input: { roomId?: string; userId: string; userName: string; episodeId: string }) => Promise<void>;
  leave: () => void;
  setMode: (mode: PartyMode) => void;
  makeMeHost: () => void;
  toggleCoHost: (participantId: string) => void;
  /** Publish the local playhead (host mode, or any mode on an explicit action). */
  publish: (input: { isPlaying: boolean; currentTime: number; playbackRate: number; subtitleTrack: string | null; subtitleMode: PartyRoomState["subtitleMode"] }) => void;
  /** Compare the local playhead with the room and decide what to do about it. */
  evaluateDrift: (localTime: number, isPlaying: boolean) => DriftDecision | null;
  clockOffset: () => number;
  applyRemote: (state: PartyRoomState) => void;
}

const DEFAULT_MODE: PartyMode = "independent";

export const usePartyStore = create<PartyState>((set, get) => ({
  roomId: null,
  mode: DEFAULT_MODE,
  connected: false,
  transportKind: null,
  detail: null,
  participants: [],
  roomState: null,
  drift: null,
  episodeId: null,
  error: null,

  join: async ({ roomId, userId, userName, episodeId }) => {
    get().leave();
    const id = roomId?.trim() || randomRoomId();
    const events = {
      onState: (state: PartyRoomState) => get().applyRemote(state),
      onParticipants: (participants: PartyParticipant[]) => set({ participants }),
      onStatus: (status: { connected: boolean; kind: TransportKind; detail?: string }) =>
        set({ connected: status.connected, transportKind: status.kind, detail: status.detail ?? null }),
    };

    try {
      transport = await createTransport(events);
      await transport.connect({ roomId: id, userId, userName, isHost: true });
      set({ roomId: id, episodeId, mode: "host", error: null, connected: true, transportKind: transport.kind });
    } catch (error) {
      // No LiveKit token endpoint (or no network): a same-device room still runs
      // the whole feature set across tabs, which is how classrooms demo it.
      const fallback = createLocalTransport(events);
      await fallback.connect({ roomId: id, userId, userName, isHost: true });
      transport = fallback;
      set({
        roomId: id,
        episodeId,
        mode: "host",
        connected: true,
        transportKind: "local",
        error: `LiveKit unavailable (${(error as Error).message}) — using an on-device room.`,
      });
    }
  },

  leave: () => {
    transport?.disconnect();
    transport = null;
    set({ roomId: null, connected: false, transportKind: null, participants: [], roomState: null, drift: null, mode: DEFAULT_MODE, detail: null });
  },

  setMode: (mode) => {
    set({ mode });
    if (mode === "host") get().makeMeHost();
  },

  makeMeHost: () => {
    set((state) => ({
      participants: state.participants.map((p) => ({ ...p, isHost: p.id === state.participants[0]?.id ? p.isHost : false })),
    }));
  },

  toggleCoHost: (participantId) =>
    set((state) => ({ participants: state.participants.map((p) => (p.id === participantId ? { ...p, isCoHost: !p.isCoHost } : p)) })),

  publish: (input) => {
    const { roomId, episodeId, participants, mode, connected } = get();
    if (!transport || !connected || !roomId || !episodeId) return;
    if (mode === "follow") return; // followers never publish
    const hostUserId = participants.find((p) => p.isHost)?.id ?? participants[0]?.id ?? "host";
    const state = makeRoomState({
      roomId,
      episodeId,
      hostUserId,
      isPlaying: input.isPlaying,
      currentTime: input.currentTime,
      playbackRate: input.playbackRate,
      subtitleTrack: input.subtitleTrack,
      subtitleMode: input.subtitleMode,
      clockOffsetMs: transport.clockOffset(),
    });
    transport.publishState(state);
    set({ roomState: state });
  },

  evaluateDrift: (localTime, isPlaying) => {
    const { roomState, mode } = get();
    if (!roomState || mode !== "follow") return null;
    const expected = expectedTime(roomState, Date.now(), transport?.clockOffset() ?? 0);
    const decision = decideDriftCorrection(localTime, expected, isPlaying);
    set({ drift: decision });
    return decision;
  },

  clockOffset: () => transport?.clockOffset() ?? 0,

  applyRemote: (state) => {
    const { mode, episodeId } = get();
    set({ roomState: state });
    if (episodeId && state.episodeId !== episodeId) set({ episodeId: state.episodeId });
    if (mode === "host") return;
    // Followers: surface the drift so the player can act on it; the player owns
    // the media element, this store only reports.
    if (mode === "follow") {
      const expected = expectedTime(state, Date.now(), transport?.clockOffset() ?? 0);
      set({ drift: { drift: 0, action: "none", detail: `room at ${expected.toFixed(1)}s` } });
    }
  },
}));

export { randomRoomId };
