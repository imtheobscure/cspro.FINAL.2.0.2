"use client";
/**
 * Everything the eight `/api/…` route handlers used to do, in the browser.
 *
 * Party ships as a **static export** (see `next.config.ts`), which is what lets
 * the Game Hub open it from a plain folder URL with no server and no database —
 * the same move Cash Arena, Interview and Console made. A static export cannot
 * have route handlers, so the endpoints are gone and this module is what replaced
 * them:
 *
 *   · the lesson library — built-in pack list, imported Copy-AI packs and the
 *     "which pack is this session using" lookup — lives in `localStorage`;
 *   · a session's games log and saved sessions live in `localStorage` too, so the
 *     score sheet and the teaching plan survive a reload on this machine;
 *   · a phone room (the tutor's board plus learners' phones) is a channel between
 *     windows of the SAME browser: rooms, players, prompts and answers are kept in
 *     `localStorage` and announced on a `BroadcastChannel`, which is enough for a
 *     projector window and a second window (or an incognito tab) on the tutor's
 *     machine. Phones on other devices cannot reach a static folder, which is the
 *     one thing the old database bought and this cannot.
 *
 * The shape of every function matches the route it replaces (same fields, same
 * error strings), so the call sites read the same as they did against `fetch`.
 */

/* ─────────────────────────────── storage ─────────────────────────────── */

const PACKS_KEY = "pma-packs-v1";
const ROOM_KEY = (code: string) => `pma-room-${code}`;
const ROOM_INDEX_KEY = "pma-room-index";
const SESSIONS_KEY = "pma-sessions-v1";
const EVENTS_KEY = "pma-events-v1";
const CHANNEL = "pma-room";

/** Every room change is announced here so the board and the phones react at once. */
let channel: BroadcastChannel | null = null;
function bus(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL);
  return channel;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T | null;
    return parsed ?? fallback;
  } catch {
    // A corrupt entry must not take the game down — start from empty instead.
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode, or the quota is full. The lesson in front of the class is not
    // worth interrupting for this, so it stays silent and the game continues.
  }
}

/* ─────────────────────────── lesson packs ─────────────────────────── */

export type PackMeta = { slug: string; title: string; cefr: string; topic: string; createdAt?: string };
export type PackRow = PackMeta & { data: unknown };

type Incoming = {
  meta?: { title?: string; cefr?: string; topic?: string; l1?: string };
  grid?: unknown[];
  [k: string]: unknown;
};

const slugify = (s: string) =>
  (s || "pack").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "pack";

/** `GET /api/packs` — every pack the tutor can choose, newest first. */
export function listPacks(): PackMeta[] {
  return read<PackMeta[]>(PACKS_KEY, []).map(({ slug, title, cefr, topic, createdAt }) => ({
    slug, title, cefr, topic: topic ?? "", createdAt,
  }));
}

/** `GET /api/packs?slug=…` — one imported pack, ready for `normalisePack`. */
export function getPack(slug: string): { pack: PackRow } | null {
  const rows = read<PackRow[]>(PACKS_KEY, []);
  const pack = rows.find((p) => p.slug === slug);
  return pack ? { pack } : null;
}

/**
 * `POST /api/packs` — the validator the Copy-AI flow depends on.
 *
 * The rules are the ones the route enforced: exactly 64 grid questions, each with
 * a prompt, at least two options, an answer index and a mini lesson, no repeated
 * prompts and nothing that points at outside material. They are the difference
 * between a lesson that plays and a board full of empty tiles, so they stayed
 * verbatim.
 */
export function importPack(
  raw: string,
):
  | { ok: true; pack: { slug: string; title: string; cefr: string } }
  | { ok: false; error: string; problems?: string[] } {
  let body: Incoming;
  try {
    body = JSON.parse(raw) as Incoming;
  } catch {
    return { ok: false, error: "That is not valid JSON. Paste the whole object, including the outer braces." };
  }

  const problems: string[] = [];
  const grid = Array.isArray(body.grid) ? body.grid : [];
  if (!grid.length) problems.push('No "grid" array found — the pack needs the 64 grid questions.');
  if (grid.length && grid.length !== 64) problems.push(`The grid has ${grid.length} questions; the board needs exactly 64.`);

  const seen = new Set<string>();
  grid.forEach((rawQ, i) => {
    const q = rawQ as Record<string, unknown>;
    if (!q || typeof q !== "object") { problems.push(`Question ${i + 1} is not an object.`); return; }
    if (typeof q.prompt !== "string" || !q.prompt.trim()) problems.push(`Question ${i + 1} has no prompt.`);
    if (!Array.isArray(q.options) || q.options.length < 2) problems.push(`Question ${i + 1} needs at least two options.`);
    if (!Array.isArray(q.answer) || !q.answer.length) problems.push(`Question ${i + 1} has no answer index.`);
    if (!q.lesson) problems.push(`Question ${i + 1} is missing its mini lesson.`);
    const key = String(q.prompt ?? "").trim().toLowerCase();
    if (key && seen.has(key)) problems.push(`Question ${i + 1} repeats an earlier prompt.`);
    seen.add(key);
    if (typeof q.prompt === "string" && /\b(see page|the text on page|track \d|the video above|listen to the recording)\b/i.test(q.prompt))
      problems.push(`Question ${i + 1} refers to outside material; packs must be self-contained.`);
  });

  if (problems.length > 12) problems.length = 12;
  if (problems.length) return { ok: false, error: "Pack rejected", problems };

  const title = body.meta?.title ?? "Imported lesson pack";
  const slug = `${slugify(title)}-${Date.now().toString(36).slice(-4)}`;
  const row: PackRow = {
    slug,
    title,
    cefr: body.meta?.cefr ?? "B1",
    topic: body.meta?.topic ?? "General",
    createdAt: new Date().toISOString(),
    data: body,
  };
  write(PACKS_KEY, [row, ...read<PackRow[]>(PACKS_KEY, [])]);
  return { ok: true, pack: { slug: row.slug, title: row.title, cefr: row.cefr } };
}

/* ─────────────────────────── phone rooms ─────────────────────────── */

export type RoomPrompt = { kind?: string; title?: string; question?: string; options?: string[]; answer?: number[] };
export type RoomPlayer = { playerKey: string; name: string; avatar: string; score: number; streak: number };
export type RoomAnswer = { answer: string; playerName: string; playerKey: string; promptRev: number; correct: boolean; points: number };
export type RoomState = {
  code: string;
  hostName: string;
  sessionCode: string;
  prompt: RoomPrompt;
  promptRev: number;
  open: boolean;
  players: RoomPlayer[];
  answers: RoomAnswer[];
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () =>
  Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

type StoredRoom = Omit<RoomState, "players" | "answers">;

const readRoom = (code: string) => read<StoredRoom | null>(ROOM_KEY(code), null);
const roomIndex = () => read<string[]>(ROOM_INDEX_KEY, []);

/** `GET /api/room?code=…` — the state the board and every phone polls for. */
export function getRoom(code: string): { room: StoredRoom; players: RoomPlayer[]; answers: RoomAnswer[] } | null {
  const key = (code ?? "").toUpperCase();
  if (!key) return null;
  const room = readRoom(key);
  if (!room) return null;
  const players = read<RoomPlayer[]>(`pma-players-${key}`, []);
  const answers = read<RoomAnswer[]>(`pma-answers-${key}`, []).filter((a) => a.promptRev === room.promptRev);
  return {
    room,
    players: [...players].sort((a, b) => b.score - a.score),
    answers,
  };
}

/** `POST /api/room { action: "create" }`. */
export function createRoom(opts: { hostName?: string; sessionCode?: string } = {}): { ok: true; code: string } {
  let code = newCode();
  for (let i = 0; i < 6 && readRoom(code); i++) code = newCode();
  const room: StoredRoom = {
    code,
    hostName: opts.hostName ?? "Tutor",
    sessionCode: opts.sessionCode ?? "",
    prompt: { kind: "idle", title: "Waiting for the tutor…" },
    promptRev: 0,
    open: true,
  };
  write(ROOM_KEY(code), room);
  write(ROOM_INDEX_KEY, [...new Set([code, ...roomIndex()])].slice(0, 20));
  write(`pma-players-${code}`, []);
  write(`pma-answers-${code}`, []);
  bus()?.postMessage({ type: "room", code });
  return { ok: true, code };
}

/** `POST /api/room { action: "prompt" }` — pushes the board's question to every phone. */
export function pushPrompt(code: string, prompt: RoomPrompt): { ok: true; promptRev: number } | { error: string } {
  const key = (code ?? "").toUpperCase();
  const room = readRoom(key);
  if (!room) return { error: "no room" };
  const promptRev = room.promptRev + 1;
  write(ROOM_KEY(key), { ...room, prompt, promptRev });
  bus()?.postMessage({ type: "room", code: key });
  return { ok: true, promptRev };
}

/** `POST /api/room { action: "close" }`. */
export function closeRoom(code: string) {
  const key = (code ?? "").toUpperCase();
  const room = readRoom(key);
  if (room) write(ROOM_KEY(key), { ...room, open: false });
  bus()?.postMessage({ type: "room", code: key });
}

/** `POST /api/room { action: "reset-scores" }`. */
export function resetScores(code: string) {
  const key = (code ?? "").toUpperCase();
  const players = read<RoomPlayer[]>(`pma-players-${key}`, []);
  write(`pma-players-${key}`, players.map((p) => ({ ...p, score: 0, streak: 0 })));
  bus()?.postMessage({ type: "room", code: key });
}

/** `POST /api/room/join` — a learner's phone enters the room. */
export function joinRoom(b: { code?: string; playerKey?: string; name?: string; avatar?: string }):
  | { ok: true; room: StoredRoom }
  | { error: string } {
  const code = (b.code ?? "").toUpperCase();
  if (!code || !b.playerKey || !b.name) return { error: "code, playerKey and name are required" };
  const room = readRoom(code);
  if (!room) return { error: "That room code doesn't exist." };
  if (!room.open) return { error: "That room is closed." };
  const players = read<RoomPlayer[]>(`pma-players-${code}`, []);
  const name = (b.name ?? "").slice(0, 24);
  const i = players.findIndex((p) => p.playerKey === b.playerKey);
  const row: RoomPlayer = { playerKey: b.playerKey, name, avatar: b.avatar ?? "", score: players[i]?.score ?? 0, streak: players[i]?.streak ?? 0 };
  write(`pma-players-${code}`, i >= 0 ? players.map((p) => (p.playerKey === b.playerKey ? row : p)) : [...players, row]);
  bus()?.postMessage({ type: "room", code });
  return { ok: true, room: { ...room, code: room.code } };
}

/**
 * `POST /api/room/answer` — phones score on speed AND accuracy: a fast correct
 * answer is worth roughly double a slow one. One answer per learner per prompt.
 */
export function answerRoom(b: {
  code?: string; playerKey?: string; playerName?: string; promptRev?: number;
  answer?: string; correct?: boolean; ms?: number;
}): { ok: true; already?: boolean; points: number } | { error: string } {
  const code = (b.code ?? "").toUpperCase();
  if (!code || !b.playerKey) return { error: "code and playerKey required" };
  const ms = Math.max(0, Math.min(60000, b.ms ?? 0));
  const correct = Boolean(b.correct);
  const speedBonus = Math.max(0, Math.round((15000 - ms) / 150));
  const points = correct ? 100 + speedBonus : 0;

  const answers = read<RoomAnswer[]>(`pma-answers-${code}`, []);
  const rev = b.promptRev ?? 0;
  if (answers.some((a) => a.playerKey === b.playerKey && a.promptRev === rev)) return { ok: true, already: true, points: 0 };

  answers.push({
    answer: (b.answer ?? "").slice(0, 400),
    playerName: b.playerName ?? "",
    playerKey: b.playerKey,
    promptRev: rev,
    correct,
    points,
  });
  write(`pma-answers-${code}`, answers.slice(-400));

  const players = read<RoomPlayer[]>(`pma-players-${code}`, []);
  write(`pma-players-${code}`, players.map((p) => (p.playerKey === b.playerKey
    ? { ...p, score: p.score + points, streak: correct ? p.streak + 1 : 0 }
    : p)));
  bus()?.postMessage({ type: "room", code });
  return { ok: true, points };
}

/* ─────────────────────── sessions, events, QR ─────────────────────── */

export type EventInput = {
  gameKey?: string; cell?: number; questionId?: string; teamId?: string; teamName?: string;
  skill?: string; grammarPoint?: string; cefr?: string; correct?: boolean; points?: number;
  seconds?: number; detail?: Record<string, unknown>;
};

/** `POST /api/sessions` — the session header the score sheet and reports read. */
export function saveSession(b: {
  code: string; packSlug?: string; title?: string; teams?: unknown; state?: unknown;
}) {
  if (!b?.code) return;
  const rows = read<Array<Record<string, unknown>>>(SESSIONS_KEY, []);
  const row = {
    code: b.code,
    packSlug: b.packSlug ?? "built-in",
    title: b.title ?? "Party",
    teams: b.teams ?? [],
    state: b.state ?? {},
    updatedAt: new Date().toISOString(),
  };
  write(SESSIONS_KEY, [row, ...rows.filter((r) => r.code !== b.code)].slice(0, 40));
}

/** `GET /api/sessions?code=…` — plus the events logged against it. */
export function getSession(code: string) {
  const session = read<Array<Record<string, unknown>>>(SESSIONS_KEY, []).find((r) => r.code === code) ?? null;
  const events = read<Array<EventInput & { sessionCode: string }>>(EVENTS_KEY, []).filter((e) => e.sessionCode === code);
  return { session, events };
}

/** `POST /api/events` — one graded moment, kept for the teaching plan. */
export function logEvent(e: EventInput & { sessionCode: string }) {
  write(EVENTS_KEY, [...read<Array<EventInput & { sessionCode: string }>>(EVENTS_KEY, []), e].slice(-800));
}

/**
 * `GET /api/qr?text=…` — the join QR, drawn in the browser instead of on a server.
 *
 * It used to be an `<img src="/api/qr?text=…">`. There is no route to serve it any
 * more, so the callers ask for a data URL and keep their own `<img>`.
 */
export async function qrDataUrl(text: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(text, {
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
