/**
 * Comparing scores when the network refuses to cooperate.
 *
 * A score room needs WebRTC, and a lot of school networks block it outright. The
 * console already says which hop failed, but "rooms are unavailable" is a poor
 * answer for a tutor standing in front of a class who just wants to see whose
 * score was higher. So a result can also travel as a *code*:
 *
 *   1. the class plays on their own devices (the console is served on the LAN, or
 *      each learner has the lesson open locally — no room involved);
 *   2. after a score is saved, that device shows a short code, e.g. `K7QM 9X2C`;
 *   3. the tutor types the code into the console. Out comes the score, attached to
 *      the learner's name, on the same board as everyone else.
 *
 * Nothing is transmitted and nothing is trusted from the wire — the code is a
 * compact, typo-resistant way of *reading a number aloud*. That is why it exists
 * rather than "just tell me your score": `9X2C` cannot be misheard the way
 * "nine thousand two hundred and eighty" can, and a code that belongs to a
 * different game is rejected instead of silently corrupting the board.
 *
 * ── The shape ───────────────────────────────────────────────────────────────
 * Eight characters from the 31-character alphabet left after removing `0 O 1 I L`
 * — the symbols people actually misread on a screen and mishear across a room:
 *
 *     [G G]  game fingerprint        (961 buckets of the game id)
 *     [S S S S]  score               (base 31, up to 923,520)
 *     [D]    duration, 15-second steps
 *     [C]    check character over everything above
 *
 * 31 is prime, which is what makes the check character honest: the weights it uses
 * are all coprime with the base, so a single misread character can never produce a
 * code that still checks out with a different number in it.
 *
 * The check character is what makes typing it safe: any single mistyped
 * character, and any swap of two neighbours, fails the check and is reported as
 * "that code does not add up" instead of being filed as a score.
 *
 * This file is deliberately pure — no storage, no clock, no React — so it can be
 * tested by calling it.
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const BASE = ALPHABET.length; // 31 — prime, which the check character relies on
const CODE_LENGTH = 8;
const SCORE_CHARS = 4;
/** The largest score a code can carry. Above this the console refuses to encode. */
export const MAX_RESULT_SCORE = BASE ** SCORE_CHARS - 1; // 923,520
const DURATION_STEP_SECONDS = 15;
const GAME_BUCKETS = BASE * BASE; // 961

export interface OfflineResult {
  score: number;
  durationSeconds: number;
}

/**
 * A stable 10-bit fingerprint of the game id. Deliberately *not* a cryptographic
 * hash: this only has to notice that the code in the tutor's hand was read off a
 * different game, and 1024 buckets does that well enough for a classroom.
 */
export function gameBucket(gameId: string): number {
  let h = 2166136261;
  const id = String(gameId || "");
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % GAME_BUCKETS;
}

function toBase32(value: number, length: number): string {
  let n = Math.max(0, Math.floor(value));
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out = ALPHABET[n % BASE] + out;
    n = Math.floor(n / BASE);
  }
  return out;
}

function fromBase32(text: string): number {
  let n = 0;
  for (const ch of text) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) return NaN;
    n = n * BASE + idx;
  }
  return n;
}

/**
 * One character over the whole payload, so a misread is caught before it becomes a
 * score. The weights are 1, 2, 3… — all coprime with the prime base — so changing
 * any single payload character necessarily changes this character too. With a
 * non-prime base (or weights sharing a factor with it) a mistyped `4` for a `2`
 * could cancel out and the wrong number would be filed silently.
 */
function checkChar(payload: string): string {
  let sum = 0;
  for (let i = 0; i < payload.length; i += 1) {
    sum += (ALPHABET.indexOf(payload[i]) + 1) * (i + 1);
  }
  return ALPHABET[sum % BASE];
}

/** `"K7QM9X2C"` → `"K7QM 9X2C"`, which is what gets read out loud. */
export function formatResultCode(code: string): string {
  const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)} ${clean.slice(4)}`;
}

/** Strip whatever the tutor typed (spaces, dashes, lower case) into a code. */
export function normalizeResultCode(input: string): string {
  return String(input || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .slice(0, CODE_LENGTH);
}

/** Anything that cannot be represented gets an explicit failure, never a silent 0. */
export function canEncodeResult(score: number): boolean {
  return Number.isFinite(score) && score >= 0 && Math.floor(score) <= MAX_RESULT_SCORE;
}

export function encodeResult(gameId: string, score: number, durationSeconds = 60): string {
  // Clamped rather than wrapped: a score past the ceiling becomes the ceiling, and
  // the caller can ask `canEncodeResult` first when that distinction matters.
  const safeScore = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;
  const capped = Math.min(safeScore, MAX_RESULT_SCORE);
  const seconds = Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.floor(durationSeconds) : 0;
  const steps = Math.min(BASE - 1, Math.round(seconds / DURATION_STEP_SECONDS));
  const payload = toBase32(gameBucket(gameId), 2) + toBase32(capped, SCORE_CHARS) + toBase32(steps, 1);
  return payload + checkChar(payload);
}

export interface DecodeResult {
  ok: boolean;
  score?: number;
  durationSeconds?: number;
  /** A sentence a tutor can act on, shown verbatim in the console. */
  error?: string;
}

/**
 * Read a code back. `gameId` is the game currently on the console, so a code read
 * off last week's game is refused rather than filed against this one.
 */
export function decodeResult(code: string, gameId: string): DecodeResult {
  const clean = normalizeResultCode(code);
  if (clean.length !== CODE_LENGTH) {
    return {
      ok: false,
      error: `A result code is ${CODE_LENGTH} characters — like K7QM 9X2C. That one had ${clean.length}.`,
    };
  }
  const payload = clean.slice(0, CODE_LENGTH - 1);
  const check = clean[CODE_LENGTH - 1];
  if (checkChar(payload) !== check) {
    return {
      ok: false,
      error: "That code does not add up — one character was misread or mistyped. Ask the learner to read it again.",
    };
  }
  const bucket = fromBase32(payload.slice(0, 2));
  const score = fromBase32(payload.slice(2, 2 + SCORE_CHARS));
  const steps = fromBase32(payload.slice(2 + SCORE_CHARS, 2 + SCORE_CHARS + 1));
  if (!Number.isFinite(bucket) || !Number.isFinite(score) || !Number.isFinite(steps)) {
    return { ok: false, error: "That code is not a result code." };
  }
  if (bucket !== gameBucket(gameId)) {
    return {
      ok: false,
      error: "That code came from a different game. Put that game on the console, or check the code.",
    };
  }
  return { ok: true, score, durationSeconds: steps * DURATION_STEP_SECONDS };
}
