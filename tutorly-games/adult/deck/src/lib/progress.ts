/**
 * Progress that survives the tab closing.
 *
 * Before this, XP, streaks, per-card memory and the gacha pity counter all lived in
 * React state, so every reload reset the learner to level 1 with an empty collection.
 * A game cannot feel premium if it forgets you, so this module is the memory.
 *
 * It also owns the scheduler. Selection quality is what separates a flashcard app from
 * a card game: showing words at the moment they are about to be forgotten is the entire
 * point. The maths lives in `lib/fsrs.ts` — a model of forgetting rather than the
 * hand-tuned multipliers this file used to carry — and this module is the persistence,
 * migration and derived-readout layer around it.
 */

import {
  type FsrsCard,
  type FsrsGrade,
  dueForecast,
  gradeFromDifficulty as fsrsGradeFromDifficulty,
  isMastered,
  memoryStrength,
  newCard,
  review,
} from "./fsrs";
import type { FlashItem, GachaState, ItemStat, ItemStatsMap } from "../tools/flashcards/flashcards";

/*
 * The game is called Deck, and these keys are namespaced after it.
 *
 * `linguaquest3d.` is the prefix the same file used before the rename, and it has to be
 * read first-time through: a learner who has already built up XP, a streak and a
 * collection in the hub must find all of it here, not meet a fresh level 1. The old keys
 * are read (never written) and are cleared alongside the new one.
 */
const STORAGE_KEY = "deck.progress.v2";
const LEGACY_KEYS = ["linguaquest3d.progress.v2", "linguaquest3d.progress.v1"];
const DAILY_LOG_DAYS = 365;

export interface DailyActivity {
  /** Local date, YYYY-MM-DD. */
  date: string;
  cards: number;
  xp: number;
}

/** A read-only snapshot of everything an achievement check is allowed to look at. */
export interface AchievementSnapshot {
  xp: number;
  level: number;
  totalReviews: number;
  correctReviews: number;
  bestStreak: number;
  mastered: number;
  dayStreak: number;
  collection: number;
  gachaPulls: number;
  hasLegendary: boolean;
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  /** Points awarded on unlock, which is also how the UI sorts them by weight. */
  xp: number;
  color: string;
  earned: (snapshot: AchievementSnapshot) => boolean;
}

/**
 * The achievement set.
 *
 * Each one is written as a predicate over a snapshot rather than an event hook, so
 * achievements are always derivable from stored progress. That means they cannot be
 * missed because a session ended mid-flow, and they survive a save being migrated.
 */
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-review", label: "First Steps", description: "Review your first card", xp: 10, color: "#60a5fa", earned: (s) => s.totalReviews >= 1 },
  { id: "twenty-reviews", label: "Getting Warm", description: "Review 20 cards", xp: 20, color: "#38bdf8", earned: (s) => s.totalReviews >= 20 },
  { id: "hundred-reviews", label: "Century", description: "Review 100 cards", xp: 60, color: "#818cf8", earned: (s) => s.totalReviews >= 100 },
  { id: "streak-10", label: "On Fire", description: "Answer 10 correct in a row", xp: 40, color: "#fb923c", earned: (s) => s.bestStreak >= 10 },
  { id: "streak-25", label: "Unstoppable", description: "Answer 25 correct in a row", xp: 100, color: "#f97316", earned: (s) => s.bestStreak >= 25 },
  { id: "level-5", label: "Ascending", description: "Reach level 5", xp: 50, color: "#a78bfa", earned: (s) => s.level >= 5 },
  { id: "level-10", label: "Ascendant", description: "Reach level 10", xp: 120, color: "#c084fc", earned: (s) => s.level >= 10 },
  { id: "first-mastered", label: "Locked In", description: "Master your first word", xp: 30, color: "#34d399", earned: (s) => s.mastered >= 1 },
  { id: "ten-mastered", label: "Keeper of Words", description: "Master 10 words", xp: 130, color: "#10b981", earned: (s) => s.mastered >= 10 },
  { id: "day-3", label: "Habit Forming", description: "Study three days in a row", xp: 35, color: "#fbbf24", earned: (s) => s.dayStreak >= 3 },
  { id: "day-7", label: "Week Strong", description: "Study seven days in a row", xp: 90, color: "#fcd34d", earned: (s) => s.dayStreak >= 7 },
  { id: "accuracy-85", label: "Sharp Shooter", description: "Hold 85% accuracy over 50 answers", xp: 70, color: "#22d3ee", earned: (s) => s.totalReviews >= 50 && s.correctReviews / s.totalReviews >= 0.85 },
  { id: "first-legendary", label: "Foil Found", description: "Pull a legendary card", xp: 45, color: "#f59e0b", earned: (s) => s.hasLegendary },
  { id: "collector-10", label: "Collector", description: "Own 10 cards in your collection", xp: 80, color: "#e879f9", earned: (s) => s.collection >= 10 },
  { id: "gacha-50", label: "Committed", description: "Make 50 pulls", xp: 65, color: "#f472b6", earned: (s) => s.gachaPulls >= 50 },
];

export interface PersistedProgress {
  version: 2;
  xp: number;
  streak: number;
  bestStreak: number;
  itemStats: ItemStatsMap;
  gacha: GachaState;
  settings: { muted: boolean; l1: string; autoEnrich: boolean };
  daily: DailyActivity[];
  /** Achievement ids that have fired. Stored rather than derived so the unlock moment is showable once. */
  achievements: string[];
  totalReviews: number;
  correctReviews: number;
  savedAt: number;
}

export function emptyProgress(): PersistedProgress {
  return {
    version: 2,
    xp: 0,
    streak: 0,
    bestStreak: 0,
    itemStats: {},
    gacha: { pullsSinceEpic: 0, pullsSinceLegendary: 0, totalPulls: 0, collection: [] },
    settings: { muted: false, l1: "es", autoEnrich: true },
    daily: [],
    achievements: [],
    totalReviews: 0,
    correctReviews: 0,
    savedAt: Date.now(),
  };
}

function todayKey(date = new Date()): string {
  // Local time on purpose: a learner's "today" is their own, not UTC's.
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Coerces a stored `ItemStat` into one that carries FSRS state, whatever shape it is in. */
function normaliseStat(raw: Partial<ItemStat> | undefined): ItemStat {
  const base: ItemStat = {
    rep: Number(raw?.rep) || 0,
    correctCount: Number(raw?.correctCount) || 0,
    wrongCount: Number(raw?.wrongCount) || 0,
    lastSeen: Number(raw?.lastSeen) || 0,
    mastered: !!raw?.mastered,
    streak: Number(raw?.streak) || 0,
    loveLevel: Number(raw?.loveLevel) || 0,
  };

  if (raw?.fsrs && typeof raw.fsrs === "object") {
    return { ...base, fsrs: raw.fsrs as FsrsCard };
  }

  /*
   * Migration from the SM-2 era: a v1 save has ease/intervalDays/due at the top level.
   * Rather than discard that history — which would put every card back to "new" and
   * undo weeks of work — it is folded into FSRS's two numbers: the old interval becomes
   * stability, and the old lapses become difficulty pressure.
   */
  const interval = Number(raw?.intervalDays);
  if (Number.isFinite(interval) && interval > 0) {
    const ease = Number(raw?.ease) || 2.5;
    return {
      ...base,
      fsrs: {
        state: "review",
        stability: Math.max(0.1, interval * (ease / 2.5)),
        difficulty: Math.max(1, Math.min(10, 5 + (Number(raw?.lapses) || 0) * 0.8 - (ease - 2.5) * 3)),
        lastReview: Number(raw?.lastSeen) || Date.now(),
        due: Number(raw?.due) || Date.now(),
        reps: Number(raw?.reps) || base.rep,
        lapses: Number(raw?.lapses) || 0,
        elapsedDays: interval,
        scheduledDays: interval,
      },
    };
  }

  return base;
}

/**
 * Reads stored progress, repairing anything malformed.
 *
 * Storage is shared with every other app on the origin and can hold a payload written
 * by an older build, so each field is validated rather than trusted — a partially
 * corrupt record must not brick the game.
 */
export function loadProgress(): PersistedProgress {
  const base = emptyProgress();
  if (typeof window === "undefined") return base;
  try {
    const raw = [STORAGE_KEY, ...LEGACY_KEYS]
      .map((key) => window.localStorage.getItem(key))
      .find((value) => value !== null) ?? null;
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    if (!parsed || typeof parsed !== "object") return base;

    const stats: ItemStatsMap = {};
    if (parsed.itemStats && typeof parsed.itemStats === "object") {
      for (const [id, stat] of Object.entries(parsed.itemStats)) stats[id] = normaliseStat(stat);
    }

    return {
      version: 2,
      xp: Number.isFinite(parsed.xp) ? Math.max(0, Number(parsed.xp)) : 0,
      streak: Number.isFinite(parsed.streak) ? Math.max(0, Number(parsed.streak)) : 0,
      bestStreak: Number.isFinite(parsed.bestStreak) ? Math.max(0, Number(parsed.bestStreak)) : 0,
      itemStats: stats,
      gacha: {
        pullsSinceEpic: Number(parsed.gacha?.pullsSinceEpic) || 0,
        pullsSinceLegendary: Number(parsed.gacha?.pullsSinceLegendary) || 0,
        totalPulls: Number(parsed.gacha?.totalPulls) || 0,
        collection: Array.isArray(parsed.gacha?.collection) ? parsed.gacha!.collection : [],
      },
      settings: {
        muted: !!parsed.settings?.muted,
        l1: typeof parsed.settings?.l1 === "string" ? parsed.settings.l1 : "es",
        autoEnrich: parsed.settings?.autoEnrich !== false,
      },
      daily: Array.isArray(parsed.daily) ? parsed.daily.slice(-DAILY_LOG_DAYS) : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements.filter((id) => typeof id === "string") : [],
      totalReviews: Number(parsed.totalReviews) || 0,
      correctReviews: Number(parsed.correctReviews) || 0,
      savedAt: Number(parsed.savedAt) || Date.now(),
    };
  } catch {
    return base;
  }
}

export function saveProgress(progress: PersistedProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...progress, savedAt: Date.now() }));
  } catch {
    // Private browsing and full quotas both land here. Losing the save is bad, but
    // throwing mid-render would be worse.
  }
}

export function clearProgress(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
  } catch {
    /* nothing useful to do */
  }
}

/** Adds today's activity, rolling the log over when the date changes. */
export function recordActivity(daily: DailyActivity[], cards: number, xp: number): DailyActivity[] {
  const key = todayKey();
  const existing = daily.find((entry) => entry.date === key);
  const next = existing
    ? daily.map((entry) => (entry.date === key ? { ...entry, cards: entry.cards + cards, xp: entry.xp + xp } : entry))
    : [...daily, { date: key, cards, xp }];
  return next.slice(-DAILY_LOG_DAYS);
}

/** The cards reviewed on each of the last `days` days, oldest first. Drives the heatmap. */
export function activityHeatmap(daily: DailyActivity[], days = 91): DailyActivity[] {
  const byDate = new Map(daily.map((entry) => [entry.date, entry]));
  const out: DailyActivity[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() - i);
    const key = todayKey(day);
    out.push(byDate.get(key) || { date: key, cards: 0, xp: 0 });
  }
  return out;
}

/** Consecutive days ending today (or yesterday, so a streak is not lost before the day is over). */
export function currentDayStreak(daily: DailyActivity[]): number {
  const seen = new Set(daily.filter((entry) => entry.cards > 0).map((entry) => entry.date));
  if (!seen.size) return 0;
  let streak = 0;
  const cursor = new Date();
  // If nothing happened today yet, start counting from yesterday.
  if (!seen.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (seen.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ─────────────────────────────────────────────────────────────
// Scheduling — thin wrappers over FSRS
// ─────────────────────────────────────────────────────────────

/**
 * Grades the UI can produce, on FSRS's own four-point scale.
 *
 * 1 = again, 2 = hard, 3 = good, 4 = easy. Using FSRS's numbering directly removes a
 * translation layer that used to exist between the buttons and the scheduler.
 */
export type Grade = FsrsGrade;

/**
 * Runs one review through FSRS and folds the result back onto the stat record.
 *
 * `again` resets the stability and makes the card due in minutes rather than days —
 * that immediate return is the whole mechanism: a word you just missed comes back in
 * the same session, while the error is still fresh.
 */
export function scheduleNext(stat: ItemStat, grade: Grade, now = Date.now()): ItemStat {
  const previous = stat.fsrs ?? newCard(now);
  const { card } = review(previous, grade, now);
  const isCorrect = grade > 1;

  return {
    ...stat,
    fsrs: card,
    reps: card.reps,
    lapses: card.lapses,
    ease: card.difficulty, // kept for older reads of this field
    intervalDays: card.scheduledDays,
    due: card.due,
    rep: stat.rep + 1,
    correctCount: stat.correctCount + (isCorrect ? 1 : 0),
    wrongCount: stat.wrongCount + (isCorrect ? 0 : 1),
    mastered: isMastered(card),
    lastSeen: now,
  };
}

export function isDue(stat: ItemStat | undefined, now = Date.now()): boolean {
  if (!stat?.fsrs) return true; // never seen, or pre-scheduler save
  return stat.fsrs.due <= now;
}

export function dueCount(items: FlashItem[], itemStats: ItemStatsMap, now = Date.now()): number {
  return (items || []).filter((item) => isDue(itemStats[item.id], now)).length;
}

/** How well a card is known, as 0–100. Derived from FSRS memory strength. */
export function masteryPercent(stat: ItemStat | undefined, now = Date.now()): number {
  return memoryStrength(stat?.fsrs, now);
}

/** Cards due on each of the next `days` days. Feeds the forecast strip. */
export function dueForecastForStats(items: FlashItem[], itemStats: ItemStatsMap, days = 14, now = Date.now()): number[] {
  const cards: FsrsCard[] = items.map((item) => itemStats[item.id]?.fsrs ?? newCard(now));
  return dueForecast(cards, days, now);
}

/** Maps a difficulty button onto an FSRS grade. */
export function gradeFromDifficulty(difficulty: string): Grade {
  return fsrsGradeFromDifficulty(difficulty);
}

/**
 * Works out which achievements the snapshot now satisfies.
 *
 * Returns only the *newly* earned ids so the caller can show an unlock once, and the
 * full earned list so the panel can render a complete set of badges.
 */
export function evaluateAchievements(
  progress: Pick<PersistedProgress, "xp" | "bestStreak" | "itemStats" | "daily" | "gacha" | "achievements" | "totalReviews" | "correctReviews">,
  level: number
): { newlyEarned: Achievement[]; earned: string[] } {
  const stats = Object.values(progress.itemStats || {});
  const snapshot: AchievementSnapshot = {
    xp: progress.xp,
    level,
    totalReviews: progress.totalReviews,
    correctReviews: progress.correctReviews,
    bestStreak: progress.bestStreak,
    mastered: stats.filter((stat) => stat.mastered).length,
    dayStreak: currentDayStreak(progress.daily || []),
    collection: progress.gacha?.collection?.length ?? 0,
    gachaPulls: progress.gacha?.totalPulls ?? 0,
    hasLegendary: (progress.gacha?.collection || []).some((card) => card.rarity === "legendary"),
  };

  const already = new Set(progress.achievements || []);
  const newlyEarned = ACHIEVEMENTS.filter((achievement) => !already.has(achievement.id) && achievement.earned(snapshot));
  return { newlyEarned, earned: [...already, ...newlyEarned.map((a) => a.id)] };
}
