/**
 * The simulated clock — the console's half of "one day passed".
 *
 * ── Why a clock, when the save can be edited directly ───────────────────────
 * A daily reward is the one cheat a game refuses to let go of: it does not store
 * "you may claim again", it stores *when you last claimed*, and it decides the rest
 * from the clock. Editing that stored time helps only when the game keeps it in the
 * payload the SDK save carries — `ytgame`-based builds often do not (Cup Heroes keeps
 * a second copy in Unity's `PlayerPrefs`, and a Cocos build keeps everything in its
 * own key). Moving the clock the game itself reads reaches all of them at once, and it
 * needs nothing from the game's format: the shim is already injected before the
 * build's first script, so it can patch `Date` before any game code asks what time
 * it is.
 *
 * ── How the two halves meet ─────────────────────────────────────────────────
 * The offset is stored in this origin's `localStorage` under one key per game (the
 * console and the proxied frame share the origin). `public/ytgame-shim.js` reads that
 * key at boot, patches `Date.now`, `new Date()` and friends, and reports the shift
 * back to the rig. `listDayShiftActions` in `lib/cheats.ts` moves the *stored*
 * timestamps back at the same time — clock forward, timestamps back, both expressing
 * the same sentence: a day has passed.
 *
 * ── What this deliberately does not touch ───────────────────────────────────
 * `performance.now()` and the animation timestamps. They are monotonic, not wall
 * clock, and moving them would break frame timing while fixing nothing: no game
 * offers a daily bonus because a frame took 24 hours.
 */

/** One day in milliseconds — the unit the button works in. */
export const DAY_MS = 86_400_000;

/** The one key per game the shim and the drawer agree on. */
export function timeOffsetKey(gameKey: string): string {
  return `tutorly:console:time-offset:${gameKey}`;
}

/** How far ahead of real time this game is being told it is, in ms (0 = real time). */
export function readTimeOffset(gameKey: string): number {
  if (!gameKey) return 0;
  try {
    const raw = window.localStorage.getItem(timeOffsetKey(gameKey));
    const n = Number.parseInt(raw || "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Stores the offset the next boot of the game will read (0 removes it entirely). */
export function writeTimeOffset(gameKey: string, offsetMs: number): void {
  if (!gameKey) return;
  try {
    const key = timeOffsetKey(gameKey);
    if (offsetMs > 0) window.localStorage.setItem(key, String(Math.round(offsetMs)));
    else window.localStorage.removeItem(key);
  } catch {
    /* storage blocked: the game simply keeps its real clock, nothing is half-set */
  }
}

/** The offset said the way a person reads it on the button. */
export function describeTimeOffset(offsetMs: number): string {
  if (!offsetMs || offsetMs <= 0) return "real time";
  const days = Math.floor(offsetMs / DAY_MS);
  const hours = Math.round((offsetMs - days * DAY_MS) / 3_600_000);
  const parts: string[] = [];
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  return `+${parts.join(" ")} ahead`;
}
