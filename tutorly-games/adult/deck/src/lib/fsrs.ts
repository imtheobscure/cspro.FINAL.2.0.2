/**
 * FSRS — the spaced-repetition scheduler.
 *
 * `lib/progress.ts` originally implemented SM-2, which was the right first move but is
 * a 1987 heuristic: its ease factor never learns anything about the individual card,
 * and its intervals are chosen by hand-tuned multipliers. FSRS models each card with
 * two numbers — **stability** (how long the memory survives) and **difficulty** (how
 * hard this particular item is for this particular learner) — and updates them from a
 * real curve of forgetting. Published benchmarks put it meaningfully ahead of SM-2 at
 * the same review workload, which for a learner means the same retention in fewer
 * repetitions.
 *
 * The weights below are FSRS-4.5's published default parameters (`w0`–`w16`). They are
 * *defaults*, not fitted to this deck — fitting properly needs a review history. That
 * is the honest caveat: this is FSRS's model with stock constants, which already beats
 * hand-tuned SM-2, and it improves for free once there is history to optimise against.
 *
 * Reference: Ye et al., "A Stochastic Shortest Path Algorithm for Optimizing
 * Spaced-Repetition Scheduling" (KDD 2022).
 */

/** Grade pressed by the learner, on the four-point scale FSRS expects. */
export type FsrsGrade = 1 | 2 | 3 | 4; // again | hard | good | easy

export type CardState = "new" | "learning" | "review" | "relearning";

/** Per-card scheduler memory. This is what gets persisted. */
export interface FsrsCard {
  state: CardState;
  /** Days until retrievability falls to the target. 0 for a brand-new card. */
  stability: number;
  /** 1–10. Higher is harder for this learner. */
  difficulty: number;
  /** Epoch ms of the last review. */
  lastReview: number;
  /** Epoch ms when the card becomes due. */
  due: number;
  reps: number;
  lapses: number;
  /** Days between the last two reviews, which FSRS uses to correct intervals. */
  elapsedDays: number;
  scheduledDays: number;
}

/**
 * FSRS-4.5 default parameters.
 *
 * w0–w3 are the initial stabilities for each grade on a first sight; w4–w5 shape the
 * difficulty curve; w6–w7 control how difficulty is updated and mean-reverted; w8–w10
 * are the stability increase on success; w11–w14 the stability after a lapse; w15–w16
 * are the hard/easy interval multipliers.
 */
export const DEFAULT_WEIGHTS = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975,
  2.2042, 0.2407, 2.9466,
] as const;

/** Decay and factor from the FSRS forgetting curve: R(t,S) = (1 + FACTOR·t/S)^DECAY. */
const DECAY = -0.5;
const FACTOR = 19 / 81;

/** Retrievability the scheduler aims for when it picks an interval. 0.9 is standard. */
export const TARGET_RETENTION = 0.9;

const DAY_MS = 86_400_000;
const MIN_STABILITY = 0.1;
const MAX_INTERVAL_DAYS = 365 * 2;
/** An interval below this is handled by the short-term (learning) path, not review. */
const LEARNING_STEPS_MINUTES = [1, 10];

export function newCard(now = Date.now()): FsrsCard {
  return {
    state: "new",
    stability: 0,
    difficulty: 0,
    lastReview: 0,
    due: now,
    reps: 0,
    lapses: 0,
    elapsedDays: 0,
    scheduledDays: 0,
  };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * R(t, S) — the probability the learner still remembers the card after `elapsed` days.
 *
 * This is the function the whole scheduler is built around: every interval decision is
 * "how long until R falls below the target", and every stability update is "how much
 * did the actual outcome move S".
 */
export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * Math.max(0, elapsedDays)) / stability, DECAY);
}

/** Initial stability for a card's very first grade. */
function initialStability(grade: FsrsGrade): number {
  return Math.max(MIN_STABILITY, DEFAULT_WEIGHTS[grade - 1]);
}

/** Initial difficulty from the first grade, then mean-reverted toward the easy end. */
function initialDifficulty(grade: FsrsGrade): number {
  const raw = DEFAULT_WEIGHTS[4] - Math.exp(DEFAULT_WEIGHTS[5] * (grade - 1)) + 1;
  return clamp(raw, 1, 10);
}

/**
 * Next difficulty: nudged by the grade, then pulled toward a mid-point.
 *
 * The mean reversion is what stops a card that was graded "again" once from being
 * permanently marked as difficult — without it, a single bad night would keep a word
 * on a punishing schedule forever.
 */
function nextDifficulty(difficulty: number, grade: FsrsGrade): number {
  const delta = -DEFAULT_WEIGHTS[6] * (grade - 3);
  const damped = difficulty + delta * ((10 - difficulty) / 9);
  // Revert toward the difficulty a "good" first answer would have produced.
  const reverted = DEFAULT_WEIGHTS[7] * initialDifficulty(3) + (1 - DEFAULT_WEIGHTS[7]) * damped;
  return clamp(reverted, 1, 10);
}

/** Stability after a successful recall, of which there are three flavours. */
function stabilityOnSuccess(difficulty: number, stability: number, recall: number, grade: FsrsGrade): number {
  const hardPenalty = grade === 2 ? DEFAULT_WEIGHTS[15] : 1;
  const easyBonus = grade === 4 ? DEFAULT_WEIGHTS[16] : 1;
  const gain =
    Math.exp(DEFAULT_WEIGHTS[8]) *
    (11 - difficulty) *
    Math.pow(stability, -DEFAULT_WEIGHTS[9]) *
    (Math.exp((1 - recall) * DEFAULT_WEIGHTS[10]) - 1) *
    hardPenalty *
    easyBonus;
  return Math.max(MIN_STABILITY, stability * (1 + gain));
}

/** Stability after a lapse. Deliberately much smaller than a success. */
function stabilityOnLapse(difficulty: number, stability: number, recall: number): number {
  const next =
    DEFAULT_WEIGHTS[11] *
    Math.pow(difficulty, -DEFAULT_WEIGHTS[12]) *
    (Math.pow(stability + 1, DEFAULT_WEIGHTS[13]) - 1) *
    Math.exp((1 - recall) * DEFAULT_WEIGHTS[14]);
  return clamp(next, MIN_STABILITY, stability);
}

/** The interval, in days, at which retrievability would hit the target. */
export function nextIntervalDays(stability: number, retention = TARGET_RETENTION): number {
  const raw = (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  // Never zero: a "due now" card that is also scheduled for today would loop.
  return Math.max(1, Math.min(MAX_INTERVAL_DAYS, Math.round(raw)));
}

export interface ReviewResult {
  card: FsrsCard;
  /** Human-readable interval, for the "next in 4 days" hint under the buttons. */
  intervalLabel: string;
  intervalDays: number;
}

/**
 * Applies one review.
 *
 * A failure ("again") drops the card into relearning and brings it back *within the
 * session* — the short-term steps are minutes, not days — because a word missed thirty
 * seconds ago is far better reviewed while the error is still fresh.
 */
export function review(card: FsrsCard, grade: FsrsGrade, now = Date.now()): ReviewResult {
  const base = card.stability > 0 ? card : newCard(now);
  const elapsedDays = base.lastReview ? (now - base.lastReview) / DAY_MS : 0;
  const recall = base.stability > 0 ? retrievability(elapsedDays, base.stability) : 0;

  let state: CardState;
  let stability: number;
  let difficulty: number;
  let lapses = base.lapses;

  if (base.state === "new" || base.stability <= 0) {
    // First ever sight of the card: difficulty and stability both come from the grade.
    difficulty = initialDifficulty(grade);
    stability = initialStability(grade);
    state = grade === 1 ? "learning" : "review";
  } else {
    difficulty = nextDifficulty(base.difficulty, grade);
    if (grade === 1) {
      stability = stabilityOnLapse(base.difficulty, base.stability, recall);
      lapses += 1;
      state = "relearning";
    } else {
      stability = stabilityOnSuccess(base.difficulty, base.stability, recall, grade);
      state = "review";
    }
  }

  let due: number;
  let scheduledDays: number;
  let intervalLabel: string;

  if (grade === 1) {
    // Relearning: minutes. `reps` still advances so the card is not treated as new.
    const minutes = LEARNING_STEPS_MINUTES[0];
    due = now + minutes * 60_000;
    scheduledDays = 0;
    intervalLabel = `${minutes} min`;
  } else if (base.state === "new" && grade !== 4) {
    // A first "hard"/"good" answer also steps through the short-term path once.
    const minutes = grade === 2 ? LEARNING_STEPS_MINUTES[1] : LEARNING_STEPS_MINUTES[0];
    due = now + minutes * 60_000;
    scheduledDays = 0;
    intervalLabel = `${minutes} min`;
    state = "learning";
  } else {
    scheduledDays = nextIntervalDays(stability);
    due = now + scheduledDays * DAY_MS;
    intervalLabel = scheduledDays === 1 ? "1 day" : `${scheduledDays} days`;
  }

  return {
    card: {
      state,
      stability,
      difficulty,
      lastReview: now,
      due,
      reps: base.reps + 1,
      lapses,
      elapsedDays,
      scheduledDays,
    },
    intervalLabel,
    intervalDays: scheduledDays,
  };
}

/**
 * Maps the UI's own difficulty buttons onto FSRS grades.
 *
 * The card face offers Easy / Good / Hard and a separate "I was wrong", so this is a
 * total mapping rather than a best guess. `perfect` from the RPG mode is treated as
 * `easy` because it is only awarded on a fast, confident answer — which is exactly the
 * signal FSRS wants for a bonus interval.
 */
export function gradeFromDifficulty(difficulty: string): FsrsGrade {
  switch (difficulty) {
    case "hard":
      return 2;
    case "easy":
    case "perfect":
      return 4;
    case "again":
    case "wrong":
      return 1;
    default:
      return 3;
  }
}

/**
 * What each button would do, so the UI can print the consequence on the button.
 *
 * Showing "Easy → 12 days" is the cheapest way to teach a learner how the algorithm
 * works, and it measurably improves how honestly people grade themselves.
 */
export function previewIntervals(card: FsrsCard, now = Date.now()): Record<FsrsGrade, string> {
  return {
    1: review(card, 1, now).intervalLabel,
    2: review(card, 2, now).intervalLabel,
    3: review(card, 3, now).intervalLabel,
    4: review(card, 4, now).intervalLabel,
  };
}

/** 0–100 health of a card's memory, derived from retrievability right now. */
export function memoryStrength(card: FsrsCard | undefined, now = Date.now()): number {
  if (!card || card.stability <= 0) return 0;
  const elapsed = card.lastReview ? (now - card.lastReview) / DAY_MS : 0;
  return Math.round(retrievability(elapsed, card.stability) * 100);
}

/** A card is "mastered" once its stability comfortably exceeds three weeks. */
export function isMastered(card: FsrsCard | undefined): boolean {
  return !!card && card.stability >= 21;
}

/**
 * A forecast of how many cards fall due on each of the next `days` days.
 *
 * This is the data behind the deck heatmap, and it is the one view that makes the
 * method visible: a learner can see that today's work is what buys tomorrow's day off.
 */
export function dueForecast(cards: FsrsCard[], days = 14, now = Date.now()): number[] {
  const buckets = new Array(days).fill(0);
  for (const card of cards) {
    if (!card || card.stability <= 0) {
      buckets[0] += 1; // new cards are always due today
      continue;
    }
    const offset = Math.floor((card.due - now) / DAY_MS);
    if (offset <= 0) buckets[0] += 1;
    else if (offset < days) buckets[offset] += 1;
  }
  return buckets;
}
