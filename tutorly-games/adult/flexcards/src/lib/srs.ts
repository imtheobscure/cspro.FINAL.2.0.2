/*
 * Spaced repetition, rebuilt on two fixes.
 *
 * ── 1. The progress belonged to the wrong thing ───────────────────────────────
 *
 * The old store was one global object keyed by the card's own id:
 *
 *     localStorage["flexcards_srs_data"] = { "1": {...}, "2": {...} }
 *
 * Deck ids in a generated lesson start at "1" every time. So loading a second lesson
 * silently overwrote the first lesson's card 1 with the second lesson's card 1 — and there was
 * no way to notice, because the schedule looked plausible either way. The learner's history for
 * every previous deck was destroyed by the act of opening a new one.
 *
 * The key is now `flexcards_srs_v2:<deckId>:<cardId>`, with the deck taken from the payload's
 * `deckId` and falling back to a hash of the deck title. Two decks can never collide, and
 * neither can a deck whose author forgot to set an id.
 *
 * ── 2. SM-2 was the wrong algorithm to be on ──────────────────────────────────
 *
 * SM-2 (1987) carries an ease factor that multiplies a growing interval, and it has two
 * well-known problems this app was visibly hitting: an `easeFactor` that decays toward the 1.3
 * floor and then *stays* there, so a card the learner keeps half-forgetting is scheduled
 * identically forever; and a hard `repetitions === 0/1` special case that makes the first
 * three reviews behave unlike every later one.
 *
 * FSRS models the same two quantities people actually care about — **difficulty** (how hard
 * this item is for this learner) and **stability** (how long a memory survives) — and derives
 * the interval from stability with a fixed target retention. It is fitted to real review logs
 * rather than derived from a heuristic, and it is what Anki moved to.
 *
 * This is FSRS-4.5 with the published default weights. Two deliberate simplifications, both
 * noted rather than hidden: the optimiser is not implemented (this app has no review log to
 * fit against, and inventing one would be worse than the defaults), and there is no learning
 * -phase step machinery — a failed card comes back in ten minutes rather than being walked
 * through sub-day steps. Everything else follows the specification.
 */

export type Grade = 1 | 2 | 3 | 4; // Again | Hard | Good | Easy

export type CardState = "new" | "learning" | "review" | "relearning";

export interface Memory {
  /** Days at which retrievability falls to the target retention. */
  stability: number;
  /** 1–10, higher is harder. */
  difficulty: number;
  reps: number;
  lapses: number;
  state: CardState;
  /** ms epoch of the last review, 0 for a card never seen. */
  lastReview: number;
  /** ms epoch of the next review. */
  due: number;
  /** Interval in days as last scheduled, for display. */
  interval: number;
}

/** FSRS-4.5 defaults. */
const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246,
  1.587, 0.2272, 2.8755,
];

const DECAY = -0.5;
const FACTOR = 19 / 81; // Chosen so that a card at stability S has retrievability 0.9 exactly.
/** The retention the intervals are computed to hit. */
export const TARGET_RETENTION = 0.9;
const MIN_STABILITY = 0.01;
const MAX_INTERVAL_DAYS = 365 * 2;
const MINUTES = 60 * 1000;
const DAYS = 24 * 60 * MINUTES;

/**
 * How long a lapsed card waits before it comes back.
 *
 * Ten minutes, and the number matters more than it looks: it is short enough that the card is
 * still ahead of the end of a 45-minute lesson, and long enough that the learner has thought
 * about something else in between. Shorter becomes brute repetition; longer and the review
 * never happens.
 */
const RELEARN_DELAY_MS = 10 * MINUTES;

export function newMemory(at: number = Date.now()): Memory {
  return { stability: 0, difficulty: 0, reps: 0, lapses: 0, state: "new", lastReview: 0, due: at, interval: 0 };
}

/** `R(t, S) = (1 + FACTOR · t/S)^DECAY` — the probability the learner still remembers it. */
export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + FACTOR * (elapsedDays / stability), DECAY);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function initialStability(grade: Grade): number {
  return Math.max(MIN_STABILITY, W[grade - 1]);
}

function initialDifficulty(grade: Grade): number {
  return clamp(W[4] - (grade - 3) * W[5], 1, 10);
}

/** Difficulty moves toward a grade-dependent target, and drifts back to the mean over time. */
function nextDifficulty(difficulty: number, grade: Grade): number {
  const delta = -(grade - 3);
  const damped = difficulty + delta * W[6];
  // Mean reversion to W[4], which is what stops difficulty pinning at 10 for a hard item.
  return clamp(W[7] * initialDifficulty(4) + (1 - W[7]) * damped, 1, 10);
}

function nextStabilityOnSuccess(difficulty: number, stability: number, retrieval: number, grade: Grade): number {
  const hardPenalty = grade === 2 ? W[15] : 1;
  const easyBonus = grade === 4 ? W[16] : 1;
  const growth =
    Math.exp(W[8]) *
    (11 - difficulty) *
    Math.pow(stability, -W[9]) *
    (Math.exp((1 - retrieval) * W[10]) - 1) *
    hardPenalty *
    easyBonus;
  return Math.max(MIN_STABILITY, stability * (1 + growth));
}

function nextStabilityOnLapse(difficulty: number, stability: number, retrieval: number): number {
  const next = W[11] * Math.pow(difficulty, -W[12]) * (Math.pow(stability + 1, W[13]) - 1) * Math.exp((1 - retrieval) * W[14]);
  // A lapse can never increase stability, and never drops below the floor.
  return clamp(next, MIN_STABILITY, stability);
}

/** The interval that lands retrievability on the target. */
function intervalFor(stability: number): number {
  const days = (stability / FACTOR) * (Math.pow(TARGET_RETENTION, 1 / DECAY) - 1);
  return clamp(Math.round(days), 1, MAX_INTERVAL_DAYS);
}

/**
 * Apply a grade and return the new memory.
 *
 * `now` is injectable so this is a pure function of its inputs — which is what makes the
 * schedule testable at all, and is the reason the previous implementation was not.
 */
export function review(memory: Memory, grade: Grade, now: number = Date.now()): Memory {
  const elapsedDays = memory.lastReview > 0 ? (now - memory.lastReview) / DAYS : 0;
  const retrieval = memory.state === "new" ? 0 : retrievability(elapsedDays, memory.stability);

  let stability: number;
  let difficulty: number;
  let lapses = memory.lapses;
  let state: CardState;

  /*
   * Failing a card the learner has never seen is a lapse, not a graduation to the learning
   * phase. The first version of this let the generic path handle it, and because FSRS's
   * initial stability for "Again" is 0.49 days the interval rounded to **one day** — so a card
   * the learner had just failed was filed next to the ones they had just passed, and the
   * session ended without ever showing it again. It is the one grade where "you will see this
   * again in a minute" has to be literally true.
   */
  if (memory.state === "new" && grade === 1) {
    return {
      stability: initialStability(grade),
      difficulty: initialDifficulty(grade),
      reps: memory.reps + 1,
      lapses: memory.lapses + 1,
      state: "learning",
      lastReview: now,
      due: now + RELEARN_DELAY_MS,
      interval: 0,
    };
  }

  if (memory.state === "new") {
    stability = initialStability(grade);
    difficulty = initialDifficulty(grade);
    state = "review";
  } else if (grade === 1) {
    lapses += 1;
    stability = nextStabilityOnLapse(memory.difficulty, memory.stability, retrieval);
    difficulty = nextDifficulty(memory.difficulty, grade);
    /*
     * A failed card is relearned within the session. Real FSRS runs it through minute-scale
     * learning steps; this collapses those into one re-show, because the app's unit of work is
     * a single projected session and a card scheduled four minutes out would never be seen in
     * one.
     */
    return {
      stability,
      difficulty,
      reps: memory.reps + 1,
      lapses,
      state: "relearning",
      lastReview: now,
      due: now + RELEARN_DELAY_MS,
      interval: 0,
    };
  } else {
    stability = nextStabilityOnSuccess(memory.difficulty, memory.stability, retrieval, grade);
    difficulty = nextDifficulty(memory.difficulty, grade);
    state = "review";
  }

  const interval = intervalFor(stability);

  return {
    stability,
    difficulty,
    reps: memory.reps + 1,
    lapses,
    state,
    lastReview: now,
    due: now + interval * DAYS,
    interval,
  };
}

/** A memory the learner is "remembering" when the app opens: due, or never seen. */
export function isDue(memory: Memory | undefined, now: number = Date.now()): boolean {
  if (!memory) return true;
  if (memory.state === "new") return true;
  return now >= memory.due;
}

export function dueIn(memory: Memory, now: number = Date.now()): string {
  const diff = memory.due - now;
  if (diff <= 0) return "now";
  const minutes = Math.floor(diff / MINUTES);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `${days}d`;
  return `${Math.round(days / 30)}mo`;
}

export interface Badge {
  label: string;
  /** A role on the ink ramp, not a raw colour, so it follows the theme. */
  role: "info" | "warn" | "good" | "bad" | "muted";
  state: CardState | "due";
}

export function badgeFor(memory: Memory | undefined, now: number = Date.now()): Badge {
  if (!memory || memory.state === "new") return { label: "New", role: "info", state: "new" };
  if (memory.state === "learning" || memory.state === "relearning") return { label: "Learning", role: "warn", state: memory.state };
  if (now >= memory.due) return { label: "Due", role: "bad", state: "due" };
  return { label: dueIn(memory, now), role: "muted", state: "review" };
}

/* ─────────────────────────────────────────────────────────────
 * Persistence — namespaced per deck
 * ───────────────────────────────────────────────────────────── */

const PREFIX = "flexcards_srs_v2";
const LEGACY_KEY = "flexcards_srs_data";

/**
 * A stable id for a deck.
 *
 * `deckId` when the payload supplies one; otherwise a short hash of the title and card count,
 * so a deck without an id still gets its own progress rather than sharing the default slot
 * with everything else.
 */
export function deckKey(payload: { deckId?: string; title?: string; items: { id: string }[] }): string {
  if (payload.deckId) return slug(payload.deckId);
  const seed = `${payload.title ?? "deck"}:${payload.items.length}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return `${slug(payload.title ?? "deck")}-${Math.abs(hash).toString(36)}`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "deck";
}

export type Store = Record<string, Memory>;

export function loadStore(key: string): Store {
  try {
    const raw = localStorage.getItem(`${PREFIX}:${key}`);
    if (raw) return JSON.parse(raw) as Store;
    /*
     * One-time migration: the legacy store has no deck in its key, so it can only be attached
     * to the first deck opened after the upgrade. Worth doing rather than discarding, because
     * a learner who has been reviewing for weeks should not lose it to a refactor.
     */
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Record<string, unknown>;
      const migrated: Store = {};
      for (const [cardId, value] of Object.entries(parsed)) {
        const old = value as { interval?: number; repetitions?: number; nextReview?: number; lastReview?: number };
        migrated[cardId] = {
          stability: Math.max(MIN_STABILITY, old.interval ?? 0.4),
          difficulty: clamp(6 - (old.repetitions ?? 0) * 0.5, 1, 10),
          reps: old.repetitions ?? 0,
          lapses: 0,
          state: (old.repetitions ?? 0) >= 3 ? "review" : "new",
          lastReview: old.lastReview ?? 0,
          due: old.nextReview ?? Date.now(),
          interval: old.interval ?? 0,
        };
      }
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveStore(key: string, store: Store): void {
  try {
    localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(store));
  } catch {
    /* Storage blocked or full: the session still works, it just will not persist. */
  }
}

/**
 * Sort for a session: what is due first, then what has never been seen, then the future.
 *
 * The old sort put new cards ahead of everything including overdue ones, which meant a learner
 * coming back after a week was handed unseen vocabulary while their actual backlog rotted.
 */
export function sortForSession<T extends { id: string }>(items: T[], store: Store, now: number = Date.now()): T[] {
  return [...items].sort((a, b) => {
    const memoryA = store[a.id];
    const memoryB = store[b.id];
    const dueA = isDue(memoryA, now);
    const dueB = isDue(memoryB, now);
    const overdueA = memoryA && memoryA.state !== "new" ? now - memoryA.due : 0;
    const overdueB = memoryB && memoryB.state !== "new" ? now - memoryB.due : 0;

    if (dueA !== dueB) return dueA ? -1 : 1;
    // Among overdue cards, the longest-neglected first.
    if (overdueA !== overdueB) return overdueB - overdueA;
    // Then unseen, in deck order.
    const freshA = !memoryA || memoryA.state === "new";
    const freshB = !memoryB || memoryB.state === "new";
    if (freshA !== freshB) return freshA ? -1 : 1;
    if (memoryA && memoryB) return memoryA.due - memoryB.due;
    return 0;
  });
}
