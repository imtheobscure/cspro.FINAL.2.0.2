/**
 * Score rooms — play against your learners without a server.
 *
 * The tutor hosts a room, shares one link, and every learner who opens it lands in
 * the console with the same game on screen. Their scores stream into the host's
 * leaderboard with their own name and photo, live.
 *
 * ── Why PeerJS and not a database ────────────────────────────────────────────
 * The console is a static folder; there is no backend to hold a room, and a tutor
 * should not have to stand one up to play for twenty minutes. PeerJS gives a
 * WebRTC data channel plus a free public signalling broker, which means the only
 * moving part is a third party that introduces two browsers to each other — the
 * scores never touch it. The trade-offs are real and worth stating:
 *
 *   · the FREE broker is best-effort. When it is slow or unreachable the room says
 *     so and the tutor can still play locally — nothing else in the console breaks.
 *   · a room lives as long as the host's tab. Close it and guests are told the host
 *     left; they keep playing on their own console with their own records.
 *   · some school networks block WebRTC outright. The error text says which hop
 *     failed rather than just "connection failed".
 *   · `reliable: true` is used deliberately: scores are small and must arrive, and
 *     this is not a game-stretching netcode problem.
 *
 * The room code is also the PeerJS peer id (`tutorly-consol-<code>`), which is what
 * makes the share link a plain URL with `?room=CODE` — no handshake, no copy-paste
 * of SDP. Codes avoid `0/O/1/I/L` because they get read aloud across a classroom.
 */

import type Peer from "peerjs";
import type { DataConnection } from "peerjs";

export const ROOM_PREFIX = "tutorly-consol-";
export const ROOM_PARAM = "room";
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const CONNECT_TIMEOUT_MS = 20_000;
const MAX_CODE_ATTEMPTS = 4;
/**
 * How many times the whole peer is rebuilt before the panel admits defeat.
 *
 * The free broker is best-effort, and PeerJS is unforgiving about it: one dropped
 * websocket or one 5xx from its `/id` endpoint calls `_abort()`, which *destroys*
 * the peer. The old code surfaced that as "the broker could not be reached" and
 * left the tutor with nothing to click — a room that failed once never came back.
 * Three rebuilds, spaced out, turn a flaky minute into a room that opens.
 */
const MAX_PEER_ATTEMPTS = 3;
/**
 * How many times a guest re-asks for the host before saying nobody is home.
 *
 * The host registers its id with the broker before it shows the code, so this is
 * usually answered first time — but a guest joining from a `?room=` link can arrive
 * while the host's registration is still settling, and "no room is answering" one
 * second too early is the most annoying possible failure.
 */
const MAX_CONNECT_ATTEMPTS = 4;
/** One look for the host, before asking the broker again. Four of these make up the budget. */
const LOOK_TIMEOUT_MS = 6000;
/**
 * The guest's own peer id, chosen rather than asked for.
 *
 * A `new Peer()` with no id makes PeerJS fetch one with an HTTP request to the
 * broker's `/id` endpoint — measured here at **~4 of the 6 seconds** a join takes,
 * and the single most rate-limited thing on the whole public service. Passing an id
 * skips that request entirely (`retrieveId` is only called when there is no id), so
 * a join costs one websocket, not a websocket plus a throttled HTTP call. A
 * collision reports `unavailable-id`, which is retried with a fresh token.
 */
const GUEST_PREFIX = "tutorly-guest-";

export function makeGuestId(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return GUEST_PREFIX + Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 8);
}

/**
 * Where two browsers get introduced, and how they get through a NAT.
 *
 * PeerJS's defaults are fine but they are *its* defaults, and every option here is
 * one an upgrade of the library could change under us:
 *
 *   · `host`/`port`/`path`/`key` are pinned so a future default cannot silently
 *     move the room onto a broker that does not answer.
 *   · `secure: true` is explicit. On a plain-HTTP page PeerJS's own default would
 *     open a cleartext `ws://` socket, which Chrome refuses outright on an HTTPS
 *     page — the failure looks exactly like "the console is broken".
 *   · the ICE list keeps PeerJS's free TURN relay (the fallback for a network that
 *     blocks direct UDP, which is most school networks) and *adds* a second STUN
 *     host, so reflection does not depend on one server being up.
 */
const PEER_OPTIONS = {
  secure: true,
  host: "0.peerjs.com",
  port: 443,
  path: "/",
  key: "peerjs",
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
      {
        urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"],
        username: "peerjs",
        credential: "peerjsp",
      },
    ],
  },
};

/**
 * Is this error worth another go, or is it the answer?
 *
 * Everything PeerJS reports as a broker/socket problem is a *moment*, not a
 * verdict: the same room opens on the next attempt. Everything else — a bad code, a
 * browser with no WebRTC, a host that has left — is the real answer, and retrying
 * only delays it.
 */
function isTransient(err: { type?: string } | null | undefined): boolean {
  const type = err?.type || "";
  return (
    type === "network" ||
    type === "server-error" ||
    type === "socket-error" ||
    type === "socket-closed" ||
    type === "disconnected"
  );
}

export type PartyRole = "host" | "guest" | null;
export type PartyStatus = "idle" | "starting" | "live" | "joining" | "error";

export interface PartyProfile {
  name: string;
  avatar: string;
}

/** The participant's own record, keyed by their player id, as the host sees it. */
export interface PartyBoardRow {
  id: string;
  name: string;
  avatar: string;
  role: "host" | "guest";
  /** Best score per game id, so the board follows whichever game is on screen. */
  best: Record<string, number>;
}

export interface PartySnapshot {
  role: PartyRole;
  status: PartyStatus;
  code: string | null;
  link: string | null;
  error: string | null;
  /** Which try this is, so "Opening the room…" can say "try 2 of 3". */
  attempt: { n: number; of: number } | null;
  /**
   * Why that try ended, in the tutor's words.
   *
   * The two reasons are not the same thing and must not read the same way: a broker
   * that dropped a socket is not the learner's problem and fixes itself, while an
   * empty room usually means the host's tab has closed. Saying "the broker dropped
   * it" for a missing room sent the tutor looking in the wrong place.
   */
  attemptNote: string | null;
  /** Host view: everyone currently connected. */
  guests: PartyBoardRow[];
  /** Guest view: the host's name and face. */
  hostProfile: PartyProfile | null;
  /** Shared scoreboard — authoritative on the host, mirrored on guests. */
  board: PartyBoardRow[];
  /** Guest view: the game the host put on the console. */
  hostGameId: string | null;
}

export const initialParty: PartySnapshot = {
  role: null,
  status: "idle",
  code: null,
  link: null,
  error: null,
  attempt: null,
  attemptNote: null,
  guests: [],
  hostProfile: null,
  board: [],
  hostGameId: null,
};

export function makeRoomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < CODE_LENGTH; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function normalizeCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .slice(0, CODE_LENGTH);
}

/** The link a learner opens. Everything except `room` is preserved. */
export function buildRoomLink(code: string): string {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(ROOM_PARAM, code);
    url.hash = "";
    return url.toString();
  } catch {
    return `${window.location.origin}${window.location.pathname}?${ROOM_PARAM}=${code}`;
  }
}

/** The code in the current URL, if this page was opened from a share link. */
export function codeFromLocation(): string | null {
  try {
    const raw = new URL(window.location.href).searchParams.get(ROOM_PARAM);
    const code = raw ? normalizeCode(raw) : "";
    return code.length >= 4 ? code : null;
  } catch {
    return null;
  }
}

/**
 * Whether a phone on another device could actually open this link.
 *
 * The console is usually served to the class from a real address, but while it is
 * being set up it lives on `localhost` — where the share link and its QR code are
 * *correct and useless*: they point at the tutor's own machine, so every phone that
 * scans them gets nothing. Showing a scannable-looking code in that state wastes
 * the first two minutes of a lesson, so the console says outright that the link is
 * local-only and points at the room code instead, which always works.
 */
export function roomShareable(): boolean {
  if (typeof window === "undefined") return false;
  const proto = String(window.location.protocol || "");
  if (proto !== "http:" && proto !== "https:") return false;
  const host = String(window.location.hostname || "");
  if (!host) return false;
  if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host === "[::1]") return false;
  if (host.startsWith("127.")) return false;
  return true;
}

type Message =
  | { type: "hello"; name: string; avatar: string }
  | { type: "profile"; name: string; avatar: string }
  | { type: "welcome"; hostProfile: PartyProfile | null; gameId: string | null; board: PartyBoardRow[] }
  | { type: "game"; gameId: string | null }
  | { type: "score"; gameId: string; score: number; at: string }
  | { type: "board"; board: PartyBoardRow[] }
  | { type: "bye" };

export interface PartyCallbacks {
  onState: (snapshot: PartySnapshot) => void;
  /**
   * A guest reported a score. The host folds it into its own record so the score
   * survives the guest closing their laptop.
   */
  onGuestScore?: (score: { peerId: string; name: string; avatar: string; gameId: string; score: number }) => void;
  /** A guest's profile changed (they renamed or changed their photo). */
  onGuestProfile?: (profile: { peerId: string; name: string; avatar: string }) => void;
}

/**
 * One Party per tab. Deliberately not a React hook: the peer, its connections and
 * their handlers must outlive renders, and React strict-mode double-mounting a
 * signalling connection is a genuinely bad time.
 */
export class Party {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null; // guest side
  private guestConns = new Map<string, DataConnection>(); // host side
  private timer: number | null = null;
  /** A scheduled rebuild, so a retry cannot revive a room the tutor has closed. */
  private retryTimer: number | null = null;
  /** Which peer rebuild this is, so the panel can say "try 2 of 3". */
  private attempt = 1;
  private attempts = 0;
  private disposed = false;
  private hostProfile: PartyProfile = { name: "Host", avatar: "⚡" };
  private hostGameId: string | null = null;
  /** The host's own best-per-game, kept here so a board rebuild never loses it. */
  private hostBest: Record<string, number> = {};
  private board: PartyBoardRow[] = [];
  private guests = new Map<string, PartyBoardRow>();
  private state: PartySnapshot = { ...initialParty };

  constructor(private cb: PartyCallbacks) {}

  /* ------------------------------------------------------------------ state -- */

  private emit(patch: Partial<PartySnapshot>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.cb.onState(this.state);
  }

  get snapshot(): PartySnapshot {
    return this.state;
  }

  /* ------------------------------------------------------------------- host -- */

  host(profile: PartyProfile, initialBoard: PartyBoardRow[] = []): void {
    this.teardownPeer();
    this.hostProfile = profile;
    this.guests.clear();
    this.hostBest = { ...(initialBoard.find((r) => r.role === "host")?.best ?? {}) };
    const code = makeRoomCode();
    this.attempt = 1;
    // Emit first, then build: `rebuildBoard` refuses to run while the panel is not
    // a live host (see below), so the role has to be set before the board is built.
    this.emit({
      role: "host",
      status: "starting",
      code,
      link: buildRoomLink(code),
      error: null,
      attempt: { n: 1, of: MAX_PEER_ATTEMPTS },
      attemptNote: null,
      guests: [],
      hostProfile: null,
      board: [],
      hostGameId: null,
    });
    this.rebuildBoard();
    void this.openHostPeer(code);
  }

  /**
   * Put another peer in place of the one that just failed, or say that we are out
   * of tries.
   *
   * The peer that reported the error has usually already destroyed itself (PeerJS
   * calls `destroy()` on any broker error it cannot recover from), so this rebuilds
   * from nothing rather than trying to revive it, and it waits a moment first — a
   * broker that just dropped a socket is not ready for the replacement *immediately*.
   */
  private retryPeer(run: () => void): boolean {
    if (this.disposed || this.attempt >= MAX_PEER_ATTEMPTS) return false;
    this.attempt += 1;
    const n = this.attempt;
    const of = MAX_PEER_ATTEMPTS;
    this.teardownPeer();
    this.emit({
      status: this.state.role === "host" ? "starting" : "joining",
      error: null,
      attempt: { n, of },
      attemptNote: "The free broker dropped that signal — reconnecting",
    });
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      if (!this.disposed) run();
    }, 800 * n);
    return true;
  }

  private hostRow(): PartyBoardRow {
    return {
      id: "host",
      name: this.hostProfile.name,
      avatar: this.hostProfile.avatar,
      role: "host",
      best: { ...this.hostBest },
    };
  }

  private async openHostPeer(code: string): Promise<void> {
    try {
      const { default: PeerCtor } = await import("peerjs");
      if (this.disposed) return;
      const peer = new PeerCtor(ROOM_PREFIX + code.toLowerCase(), { debug: 1, ...PEER_OPTIONS });
      this.peer = peer;

      peer.on("open", () => {
        if (this.disposed) return;
        this.attempts = 0;
        this.emit({ status: "live", error: null, attempt: null, attemptNote: null });
      });

      peer.on("connection", (conn) => this.acceptGuest(conn));

      peer.on("error", (err: Error & { type?: string }) => {
        if (this.disposed) return;
        // The broker refuses an id that is already taken — the room code is the id, so
        // a fresh code is a complete fix, and the panel shows the new one.
        if (err.type === "unavailable-id" && this.attempts < MAX_CODE_ATTEMPTS) {
          this.attempts += 1;
          const next = makeRoomCode();
          this.emit({ status: "starting", code: next, link: buildRoomLink(next) });
          this.teardownPeer();
          void this.openHostPeer(next);
          return;
        }
        // A broker hiccup is not a verdict: rebuild the peer and keep the code.
        if (isTransient(err) && this.retryPeer(() => void this.openHostPeer(this.state.code || code))) return;
        this.emit({ status: "error", error: describePeerError(err, "host"), attempt: null, attemptNote: null });
      });

      peer.on("disconnected", () => {
        try {
          peer.reconnect();
        } catch {
          /* giving up quietly beats throwing inside an event handler */
        }
      });
    } catch (err) {
      if (isTransient(err as { type?: string }) && this.retryPeer(() => void this.openHostPeer(code))) return;
      this.emit({ status: "error", error: describePeerError(err, "host"), attempt: null, attemptNote: null });
    }
  }

  private acceptGuest(conn: DataConnection): void {
    conn.on("data", (raw: unknown) => this.onHostMessage(conn, raw as Message));
    conn.on("close", () => {
      this.guestConns.delete(conn.peer);
      this.guests.delete(conn.peer);
      this.rebuildBoard();
      this.broadcast((c) => c.send({ type: "board", board: this.board } satisfies Message));
    });
    conn.on("error", () => {
      this.guestConns.delete(conn.peer);
      this.guests.delete(conn.peer);
      this.rebuildBoard();
    });
  }

  private onHostMessage(conn: DataConnection, msg: Message): void {
    if (!msg || typeof msg !== "object") return;
    switch (msg.type) {
      case "hello":
      case "profile": {
        const name = String(msg.name || "").slice(0, 24).trim() || "Guest";
        const avatar = typeof msg.avatar === "string" ? msg.avatar : "⚡";
        this.guestConns.set(conn.peer, conn);
        const existing = this.guests.get(conn.peer);
        this.guests.set(conn.peer, {
          id: conn.peer,
          name,
          avatar,
          role: "guest",
          best: existing?.best ?? {},
        });
        this.rebuildBoard();
        conn.send({
          type: "welcome",
          hostProfile: this.hostProfile,
          gameId: this.hostGameId,
          board: this.board,
        } satisfies Message);
        this.broadcast((c) => c.send({ type: "board", board: this.board } satisfies Message));
        if (msg.type === "profile") this.cb.onGuestProfile?.({ peerId: conn.peer, name, avatar });
        break;
      }
      case "score": {
        const score = Number(msg.score);
        if (!Number.isFinite(score)) return;
        const guest = this.guests.get(conn.peer);
        if (!guest) return;
        const gameId = String(msg.gameId || "");
        guest.best[gameId] = Math.max(guest.best[gameId] ?? 0, score);
        this.rebuildBoard();
        this.broadcast((c) => c.send({ type: "board", board: this.board } satisfies Message));
        this.cb.onGuestScore?.({ peerId: conn.peer, name: guest.name, avatar: guest.avatar, gameId, score });
        break;
      }
      case "bye":
        this.guestConns.delete(conn.peer);
        this.guests.delete(conn.peer);
        this.rebuildBoard();
        this.broadcast((c) => c.send({ type: "board", board: this.board } satisfies Message));
        break;
      default:
        break;
    }
  }

  /**
   * Rebuild and publish the host's board.
   *
   * Guarded on the role on purpose: closing connections fires each connection's
   * `close` handler *after* `leave()` has already reset the panel, and those
   * handlers rebuilt the board — so a room that had just been closed left a host
   * row (and any lagging guests) sitting in the shared state.
   */
  private rebuildBoard(): void {
    if (this.state.role !== "host") return;
    this.board = [this.hostRow(), ...this.guests.values()];
    this.emit({ board: this.board, guests: [...this.guests.values()] });
  }

  private broadcast(send: (conn: DataConnection) => void): void {
    this.guestConns.forEach((conn) => {
      if (conn.open) {
        try {
          send(conn);
        } catch {
          /* a dropped guest must not stop the others */
        }
      }
    });
  }

  /** Host: the game on the console changed — guests follow it. */
  setGame(gameId: string | null): void {
    this.hostGameId = gameId;
    if (this.state.role !== "host") return;
    this.broadcast((c) => c.send({ type: "game", gameId } satisfies Message));
  }

  /** Host: their own score, kept on the shared board. */
  addLocalScore(gameId: string, score: number, profile?: PartyProfile): void {
    if (this.state.role !== "host") return;
    if (profile) this.hostProfile = profile;
    // Record first, then rebuild: `rebuildBoard` reads `hostBest`, so the other
    // way round the host's own score would be wiped by its own rebuild.
    this.hostBest[gameId] = Math.max(this.hostBest[gameId] ?? 0, score);
    this.rebuildBoard();
    this.broadcast((c) => c.send({ type: "board", board: this.board } satisfies Message));
  }

  /* ------------------------------------------------------------------ guest -- */

  join(code: string, profile: PartyProfile): void {
    this.teardownPeer();
    this.attempt = 1;
    this.emit({
      role: "guest",
      status: "joining",
      code,
      link: buildRoomLink(code),
      error: null,
      attempt: { n: 1, of: MAX_CONNECT_ATTEMPTS },
      attemptNote: null,
      guests: [],
      hostProfile: null,
      board: [],
      hostGameId: null,
    });
    void this.openGuestPeer(code, profile, 1);
  }

  /**
   * Look for the host, and keep looking.
   *
   * Three separate things used to end a join on their first bad moment: the
   * broker's `/id` request (now skipped — the peer brings its own id), a dropped
   * signalling socket (now rebuilt, up to `MAX_PEER_ATTEMPTS`), and a host that has
   * not finished registering yet (`peer-unavailable`, now re-asked up to
   * `MAX_CONNECT_ATTEMPTS`). The learner sees one line that counts up instead of a
   * dead end they have to ask the tutor about.
   */
  private async openGuestPeer(code: string, profile: PartyProfile, look: number): Promise<void> {
    try {
      const { default: PeerCtor } = await import("peerjs");
      if (this.disposed) return;
      const peer = new PeerCtor(makeGuestId(), { debug: 1, ...PEER_OPTIONS });
      this.peer = peer;

      const hopToNextLook = (): boolean => {
        if (this.disposed || look >= MAX_CONNECT_ATTEMPTS) return false;
        this.teardownPeer();
        this.emit({
          attempt: { n: look + 1, of: MAX_CONNECT_ATTEMPTS },
          attemptNote: "No room answered that try — asking again",
        });
        // A short pause: if the host is mid-registration, asking again instantly just
        // buys the same answer twice.
        this.retryTimer = window.setTimeout(() => {
          this.retryTimer = null;
          if (!this.disposed) void this.openGuestPeer(code, profile, look + 1);
        }, 500 + look * 400);
        return true;
      };

      const giveUp = (message: string) => {
        this.clearTimer();
        this.emit({ status: "error", error: message, attempt: null, attemptNote: null });
      };

      const sendHello = (conn: DataConnection) => {
        conn.send({ type: "hello", name: profile.name, avatar: profile.avatar } satisfies Message);
      };

      peer.on("open", () => {
        if (this.disposed) return;
        // The clock starts here, not before: the broker handshake is not the host's
        // fault, and counting it made a slow broker look like an absent room.
        this.clearTimer();
        this.timer = window.setTimeout(() => {
          if (this.state.status !== "joining") return;
          if (hopToNextLook()) return;
          giveUp(`The room did not answer after ${MAX_CONNECT_ATTEMPTS} tries. Check the code with the host, or that this network allows WebRTC.`);
        }, LOOK_TIMEOUT_MS);

        const conn = peer.connect(ROOM_PREFIX + code.toLowerCase(), { reliable: true, metadata: profile });
        this.conn = conn;
        conn.on("open", () => sendHello(conn));
        conn.on("data", (raw: unknown) => this.onGuestMessage(raw as Message));
        conn.on("close", () => {
          // The channel had been open, so this is the host genuinely going away —
          // retrying would just re-ask a room that no longer exists.
          giveUp("The host closed the room.");
        });
        conn.on("error", (err) => giveUp(describePeerError(err, "guest")));
      });

      peer.on("disconnected", () => {
        try {
          peer.reconnect();
        } catch {
          /* a destroyed peer cannot reconnect; the error handler below decides */
        }
      });

      peer.on("error", (err: Error & { type?: string }) => {
        if (this.disposed) return;
        // Our own id was taken (two learners on the same device, or a restored tab):
        // a fresh id is the whole fix.
        if (err.type === "unavailable-id") {
          if (hopToNextLook()) return;
        } else if (err.type === "peer-unavailable") {
          if (hopToNextLook()) return;
        } else if (isTransient(err)) {
          // The signalling socket, not the room. Rebuild and try the same code again.
          if (this.retryPeer(() => void this.openGuestPeer(code, profile, look))) return;
        }
        giveUp(describePeerError(err, "guest", code));
      });
    } catch (err) {
      if (isTransient(err as { type?: string }) && this.retryPeer(() => void this.openGuestPeer(code, profile, look))) return;
      this.clearTimer();
      this.emit({ status: "error", error: describePeerError(err, "guest"), attempt: null, attemptNote: null });
    }
  }

  private onGuestMessage(msg: Message): void {
    if (!msg || typeof msg !== "object") return;
    switch (msg.type) {
      case "welcome":
        this.clearTimer();
        this.emit({
          status: "live",
          error: null,
          attempt: null,
          attemptNote: null,
          hostProfile: msg.hostProfile ?? null,
          board: Array.isArray(msg.board) ? msg.board : [],
          hostGameId: msg.gameId ?? null,
        });
        break;
      case "game":
        this.emit({ hostGameId: msg.gameId ?? null });
        break;
      case "board":
        this.emit({ board: Array.isArray(msg.board) ? msg.board : [] });
        break;
      case "bye":
        this.emit({ status: "error", error: "The host closed the room." });
        break;
      default:
        break;
    }
  }

  updateProfile(profile: PartyProfile): void {
    if (this.state.role === "host") {
      this.hostProfile = profile;
      this.rebuildBoard();
      return;
    }
    if (this.state.role === "guest" && this.conn?.open) {
      this.conn.send({ type: "profile", name: profile.name, avatar: profile.avatar } satisfies Message);
    }
  }

  /** Guest: report a score to the host. */
  reportScore(gameId: string, score: number): void {
    if (this.state.role !== "guest" || !this.conn?.open) return;
    this.conn.send({ type: "score", gameId, score, at: new Date().toISOString() } satisfies Message);
  }

  /* ------------------------------------------------------------------ teardown -- */

  leave(silent = false): void {
    this.clearTimer();
    try {
      this.conn?.send({ type: "bye" } satisfies Message);
    } catch {
      /* already gone */
    }
    this.broadcast((c) => c.send({ type: "bye" } satisfies Message));
    this.teardownPeer();
    this.guests.clear();
    this.guestConns.clear();
    this.board = [];
    if (!silent) this.emit({ ...initialParty });
  }

  private teardownPeer(): void {
    this.clearTimer();
    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    try {
      this.conn?.close();
    } catch {
      /* ignore */
    }
    this.conn = null;
    this.guestConns.forEach((c) => {
      try {
        c.close();
      } catch {
        /* ignore */
      }
    });
    this.guestConns.clear();
    try {
      this.peer?.destroy();
    } catch {
      /* ignore */
    }
    this.peer = null;
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  dispose(): void {
    this.leave(true);
    this.disposed = true;
  }
}

/** Turn the broker's terse errors into something a tutor can act on. */
function describePeerError(err: unknown, role: "host" | "guest", code?: string): string {
  const e = err as { type?: string; message?: string };
  const type = e?.type || "";
  switch (type) {
    case "unavailable-id":
      return "That room code is already in use — press Host again to get a new one.";
    case "peer-unavailable":
      return `No room is answering on code ${code ?? "—"}. Ask the host to keep the console tab open.`;
    case "browser-incompatible":
      return "This browser has no WebRTC support, so rooms cannot be used here.";
    case "network":
    case "server-error":
      return "The free PeerJS broker could not be reached. Rooms need internet; everything else in the console works offline.";
    case "webrtc":
      return "The room answered but the direct connection was blocked — a school network is the usual cause.";
    case "ssl-unavailable":
      return "Rooms need HTTPS (or localhost). Open the console on a secure address.";
    default:
      if (role === "host" && /signali|socket/i.test(e?.message || "")) {
        return "The free PeerJS broker refused the connection. Try again in a moment.";
      }
      return e?.message || "The room could not be started.";
  }
}
