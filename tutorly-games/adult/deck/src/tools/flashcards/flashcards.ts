/**
 * The engine behind the flashcards tool.
 *
 * This module used to be a stub — every export did nothing and `DEMO_PAYLOAD` was
 * `null`, so the app threw on its very first render and showed a blank page. The
 * UI in `FlashcardsTool.tsx` was complete all along; only this file was missing.
 *
 * Two rules shaped it:
 *
 *  1. **No assets and no network.** The build is a single self-contained HTML file.
 *     So every sound is synthesised with WebAudio, every voice is the browser's own
 *     `speechSynthesis`, and the music is generated rather than downloaded. Nothing
 *     here needs a file on disk, which is also why the whole thing works offline.
 *
 *  2. **Nothing is generated before a user gesture.** Browsers refuse to start an
 *     AudioContext without one, so the context is created lazily on the first sound
 *     and every method is a safe no-op until then.
 */

import confetti from "canvas-confetti";
import type { FsrsCard } from "../../lib/fsrs";
import type { StageName } from "../../components/Glyphs";

// ═══════════════════════════════════════════════════════════
// CONTENT MODEL
// ═══════════════════════════════════════════════════════════

/** The four card tiers. Everything visual keys off this. */
export type Rarity = "common" | "rare" | "epic" | "legendary";

/**
 * How well the learner recalled a card. `perfect` is only used by the RPG mode,
 * the other three by Classic.
 */
export type Difficulty = "easy" | "good" | "hard" | "perfect";

export interface FlashExample {
  text: string;
  /** "News", "Movie: Before Sunset", "Conversation", … — shown under the quote. */
  source?: string;
}

export interface Etymology {
  root: string;
  origin: string;
  meaning: string;
  relatedWords?: string[];
}

/** A concept-checking question: always answerable yes/no, hence the boolean. */
export interface CCQ {
  question: string;
  answer: boolean;
}

export interface FlashItem {
  id: string;
  front: string;
  back: string;
  example?: string;
  examples?: FlashExample[];
  l1Translation?: string;
  etymology?: Etymology;
  wordFamily?: string[];
  rarity?: Rarity;
  ccq?: CCQ[];
  /*
   * Fields the lesson generator is asked to produce and the modes consume.
   *
   * All optional: a hand-written deck built from `front`/`back` alone is still valid, and
   * the app must not require an AI to have filled in every slot before a card can be
   * studied. `rarity` above is the same idea — absent means "common".
   *
   * `pronunciation` is IPA. It is the one addition a learner notices immediately: it turns
   * a card you can read into a card you can say.
   */
  pronunciation?: string;
  partOfSpeech?: string;
  /** "informal", "academic", "dated" — how safe it is to actually use the word. */
  register?: string;
  /** The CEFR band the *card* is written at, which may differ from the deck's. */
  cefr?: string;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[];
  /** A nudge for the free-recall modes, short enough to fit on one line. */
  hint?: string;
  /*
   * A photograph for the card.
   *
   * The Swipe deck is modelled on a dating app, and the thing that makes that reading
   * instant is a real image at the top of the card — a generated sigil is handsome but it
   * is unmistakably not a photo. The lesson generator is asked for a direct, hot-linkable
   * URL; when it does not supply one the card falls back to the generated art, and
   * when the URL fails to load it falls back again, so a broken link degrades to the old
   * look rather than to an empty box.
   *
   * `imageCredit` exists because these are other people's photographs. A URL that renders
   * without attribution is the kind of thing that quietly becomes a problem later, so the
   * card carries the credit line whenever the model supplies one.
   */
  image?: string;
  imageCredit?: string;
  /** Alt text for screen readers. Decorative-only when absent. */
  imageAlt?: string;
}

export interface FlashPayload {
  title?: string;
  description?: string;
  language?: string;
  /** Who the deck was generated for, so a tutor can tell two decks of the same lesson apart. */
  learner?: string;
  /** The CEFR band the whole deck targets. */
  level?: string;
  /** One line naming the lesson the cards came from. */
  source?: string;
  items: FlashItem[];
}

/** Per-card memory, which is what the scheduler reads. */
export interface ItemStat {
  rep: number;
  correctCount: number;
  wrongCount: number;
  lastSeen: number;
  mastered: boolean;
  streak: number;
  loveLevel: number;
  /*
   * Spaced-repetition fields. Optional on purpose: the UI builds stats inline in
   * several places, and a save written by an earlier build will not have them. The
   * scheduler treats a missing value as "never reviewed".
   *
   * `fsrs` is the live scheduler state (see `lib/fsrs.ts`); the looser fields beside it
   * are the SM-2 era shape, kept so an old save can be migrated instead of discarded.
   */
  fsrs?: FsrsCard;
  ease?: number;
  intervalDays?: number;
  due?: number;
  reps?: number;
  lapses?: number;
}

export type ItemStatsMap = Record<string, ItemStat>;

export interface SessionStats {
  startTime: number;
  cardsStudied: number;
  correctAnswers: number;
  wrongAnswers: number;
  xpEarned: number;
  streak: number;
  maxStreak: number;
  wrongCards: FlashItem[];
}

export interface MascotState {
  mood: string;
  animation: string;
  message: string;
}

export interface GachaState {
  pullsSinceEpic: number;
  pullsSinceLegendary: number;
  totalPulls: number;
  collection: FlashItem[];
}

export type GameMode = "classic" | "xpQuest" | "race" | "speak" | "cardBattle" | "swipe" | "gacha" | "type";

export interface Quote {
  quote: string;
  author: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  color: string;
}

export interface LoveLevel {
  color: string;
  title: string;
  /** −2 … 4. The meter draws this many filled hearts. */
  tier: number;
  comments: string[];
}

export interface EvolutionStage {
  stage: StageName;
  title: string;
}

export interface RarityStyle {
  label: string;
  color: string;
  borderColor: string;
  glowColor: string;
  bgGradient: string;
  /** Whether the travelling foil sheen is drawn across the card. */
  shimmer: boolean;
  /** How many overlapping ornamental rings the frame draws. */
  ornament: 0 | 1 | 2 | 3;
  /** XP/attack weight of the card. */
  points: number;
  /** How many CCQs must be cleared to land an attack with it. */
  questions: number;
}

// ═══════════════════════════════════════════════════════════
// RARITY
// ═══════════════════════════════════════════════════════════
/*
 * The palettes are deliberately deep (near-black grounds, saturated accents). On an
 * already-dark page a flat mid-tone card reads as a grey box; these keep the word
 * legible and let the glow do the work of signalling tier.
 */
export const RARITY_CONFIG: Record<Rarity, RarityStyle> = {
  common: {
    label: "Common",
    color: "#cbd5e1",
    borderColor: "#94a3b8",
    glowColor: "rgba(148,163,184,0.35)",
    bgGradient: "linear-gradient(150deg, #1b2230 0%, #0b1018 55%, #05070c 100%)",
    shimmer: false,
    ornament: 0,
    points: 10,
    questions: 1,
  },
  rare: {
    label: "Rare",
    color: "#7dd3fc",
    borderColor: "#3b82f6",
    glowColor: "rgba(59,130,246,0.5)",
    bgGradient: "linear-gradient(150deg, #0d2440 0%, #0a1a33 50%, #050b16 100%)",
    shimmer: true,
    ornament: 1,
    points: 16,
    questions: 2,
  },
  epic: {
    label: "Epic",
    color: "#d8b4fe",
    borderColor: "#a855f7",
    glowColor: "rgba(168,85,247,0.6)",
    bgGradient: "linear-gradient(150deg, #2a1150 0%, #1a0b33 50%, #0a0514 100%)",
    shimmer: true,
    ornament: 2,
    points: 24,
    questions: 2,
  },
  legendary: {
    label: "Legendary",
    color: "#fcd34d",
    borderColor: "#f59e0b",
    glowColor: "rgba(245,158,11,0.75)",
    bgGradient: "linear-gradient(150deg, #4a2c05 0%, #2a1904 45%, #120b02 100%)",
    shimmer: true,
    ornament: 3,
    points: 35,
    questions: 3,
  },
};

// ═══════════════════════════════════════════════════════════
// DIFFICULTY
// ═══════════════════════════════════════════════════════════
export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; points: number; color: string }> = {
  easy: { label: "Easy", points: 5, color: "#3b82f6" },
  good: { label: "Good", points: 10, color: "#10b981" },
  hard: { label: "Hard", points: 15, color: "#f59e0b" },
  perfect: { label: "Perfect", points: 25, color: "#ec4899" },
};

// ═══════════════════════════════════════════════════════════
// PROGRESSION MATHS
// ═══════════════════════════════════════════════════════════
/*
 * Level L starts at 50·(L−1)·L XP: level 2 at 100, level 3 at 300, level 4 at 600.
 * Inverting that quadratic gives the level directly, with no table to keep in sync,
 * and the widening gaps mean early levels still land fast enough to feel good.
 */
export function xpToLevel(xp: number): number {
  const safe = Math.max(0, xp || 0);
  return Math.floor((1 + Math.sqrt(1 + (8 * safe) / 50)) / 2);
}

function xpAtLevelStart(level: number): number {
  return (50 * (level - 1) * level) / 2;
}
function xpAtNextLevel(level: number): number {
  return (50 * level * (level + 1)) / 2;
}

export function xpProgress(xp: number): number {
  const safe = Math.max(0, xp || 0);
  const level = xpToLevel(safe);
  const start = xpAtLevelStart(level);
  const next = xpAtNextLevel(level);
  if (next <= start) return 0;
  return Math.max(0, Math.min(100, Math.round(((safe - start) / (next - start)) * 100)));
}

export function xpToNextLevel(xp: number): number {
  const safe = Math.max(0, xp || 0);
  return Math.max(0, xpAtNextLevel(xpToLevel(safe)) - safe);
}

/*
 * The mascot's growth stages.
 *
 * Each stage names a vector badge in `components/Glyphs.tsx` rather than an emoji, so
 * the ladder is drawn by this app and looks the same on every device.
 */
const EVOLUTION_STAGES: (EvolutionStage & { minLevel: number })[] = [
  { minLevel: 1, stage: "hatchling", title: "Hatchling" },
  { minLevel: 3, stage: "fledgling", title: "Fledgling" },
  { minLevel: 5, stage: "soaring", title: "Soaring" },
  { minLevel: 7, stage: "blazing", title: "Blazing" },
  { minLevel: 10, stage: "ascendant", title: "Ascendant" },
  { minLevel: 15, stage: "mythic", title: "Mythic" },
];

export function getEvolutionStage(level: number): EvolutionStage {
  const lvl = Math.max(1, level || 1);
  let stage = EVOLUTION_STAGES[0];
  for (const candidate of EVOLUTION_STAGES) if (lvl >= candidate.minLevel) stage = candidate;
  return { stage: stage.stage, title: stage.title };
}

/**
 * Streak tiers, as a level plus words.
 *
 * The old version returned a string with emoji baked into it, which meant the flame
 * count could not be drawn differently per size. Returning the tier lets the UI pick a
 * glyph and a colour.
 */
export interface StreakTier {
  tier: number;
  text: string;
}

export function getStreakMessage(streak: number): StreakTier | null {
  const s = streak || 0;
  if (s >= 20) return { tier: 5, text: "Legendary run" };
  if (s >= 15) return { tier: 4, text: "Diamond streak" };
  if (s >= 10) return { tier: 3, text: "Unstoppable" };
  if (s >= 5) return { tier: 2, text: "Heating up" };
  if (s >= 3) return { tier: 1, text: "On fire" };
  return null;
}

// ═══════════════════════════════════════════════════════════
// THE SWIPE MODE'S AFFECTION METER
// ═══════════════════════════════════════════════════════════
const LOVE_LEVELS: (LoveLevel & { min: number })[] = [
  { min: 4, color: "#fb7185", title: "Devoted", tier: 4, comments: ["You two are inseparable now!", "Another one you adore!"] },
  { min: 2, color: "#f472b6", title: "Fond", tier: 3, comments: ["This one's growing on you.", "A word you actually like."] },
  { min: 0, color: "#60a5fa", title: "Curious", tier: 2, comments: ["Fresh word, first look.", "Let's see what you make of it."] },
  { min: -2, color: "#fb923c", title: "Wary", tier: 1, comments: ["Still not clicking, is it?", "This one's putting up a fight."] },
  { min: -99, color: "#ef4444", title: "Tough", tier: 0, comments: ["Tough crowd. Give it another go.", "Swipe left all you like — it's still on the test."] },
];

export function getLoveLevel(loveLevel: number): LoveLevel {
  const v = loveLevel || 0;
  const level = LOVE_LEVELS.find((l) => v >= l.min) || LOVE_LEVELS[LOVE_LEVELS.length - 1];
  return { color: level.color, title: level.title, tier: level.tier, comments: level.comments };
}

// ═══════════════════════════════════════════════════════════
// CARD SELECTION
// ═══════════════════════════════════════════════════════════

/**
 * Free-recall comparison for the typing mode.
 *
 * Deliberately forgiving, because the thing being tested is whether the learner can
 * *produce* the word, not whether they can spell it to the character. Case, surrounding
 * whitespace, a leading article and a one-character slip are all accepted — and a near
 * miss is reported as "close" rather than as a failure, because a typo is not evidence
 * that the memory failed.
 */
export function normaliseAnswer(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip the accents NFKD splits off
    .replace(/^(a|an|the)\s+/, "")
    .replace(/[^a-z0-9\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance, two rows at a time so memory stays O(n) in the shorter string. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1, // deletion
        current[j - 1] + 1, // insertion
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * Whether a typed answer counts as the target word.
 *
 * `close` marks a single-edit match, which the UI shows as a near miss and still accepts
 * — the alternative is punishing finger slips as if they were forgotten words.
 */
export function isTypedAnswerCorrect(input: string, target: string): { correct: boolean; close: boolean } {
  const typed = normaliseAnswer(input);
  const expected = normaliseAnswer(target);
  if (!typed) return { correct: false, close: false };
  if (typed === expected) return { correct: true, close: false };
  const tolerance = expected.length > 7 ? 2 : 1;
  const distance = editDistance(typed, expected);
  return distance <= tolerance ? { correct: true, close: true } : { correct: false, close: false };
}

export function shuffleArray<T>(array: T[]): T[] {
  const copy = [...(array || [])];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Which card to show next.
 *
 * A plain "next index" would let a learner see a word once and never again. The
 * weight is the whole scheduling policy: unseen cards are pulled hard, misses are
 * pulled harder, mastered cards fade, and recency keeps anything from repeating
 * back-to-back. It is SM-2 in spirit without the fixed intervals.
 */
export function getNextCardIndex(items: FlashItem[], itemStats: ItemStatsMap, currentIndex: number): number {
  const list = items || [];
  if (list.length <= 1) return 0;

  const now = Date.now();
  const weights = list.map((item, index) => {
    const stat = itemStats?.[item.id];
    if (!stat) return 6; // never seen
    let weight = 1.5;
    weight += Math.min(stat.wrongCount, 4) * 2.5; // misses dominate
    weight -= Math.min(stat.correctCount, 5) * 0.45;
    if (stat.mastered) weight -= 1.2;
    if (stat.streak >= 3) weight -= 0.8;
    if (stat.lastSeen && now - stat.lastSeen < 20000) weight -= 3.5; // just seen it
    if (index === currentIndex) weight -= 5;
    return Math.max(0.15, weight);
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return (currentIndex + 1) % list.length;
}

/** Wrong answers for a multiple-choice question: never the card itself, never a duplicate. */
export function getDistractors(items: FlashItem[], item: FlashItem, count = 3): FlashItem[] {
  const others = (items || []).filter(
    (candidate) => candidate && candidate.id !== item?.id && candidate.front !== item?.front
  );
  return shuffleArray(others).slice(0, Math.max(0, count));
}

// ═══════════════════════════════════════════════════════════
// CARD BATTLE MATHS
// ═══════════════════════════════════════════════════════════
/** Answering early is worth more than answering correctly at the buzzer. */
export function calculateAttackPower(timeLeft: number, maxTime: number, rarityPoints: number): number {
  const speed = Math.max(0, Math.min(1, (timeLeft || 0) / (maxTime || 10)));
  return Math.max(1, Math.round((rarityPoints || 10) * (0.6 + speed * 0.9)));
}

export function calculateDefensePower(timeLeft: number, maxTime: number, base = 15): number {
  const speed = Math.max(0, Math.min(1, (timeLeft || 0) / (maxTime || 10)));
  return Math.max(1, Math.round(base * (0.35 + speed * 0.85)));
}

// ═══════════════════════════════════════════════════════════
// SESSIONS
// ═══════════════════════════════════════════════════════════
export function createNewSession(): SessionStats {
  return {
    startTime: Date.now(),
    cardsStudied: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    xpEarned: 0,
    streak: 0,
    maxStreak: 0,
    wrongCards: [],
  };
}

/** Elapsed time as M:SS, or MM:SS once past ten minutes. */
export function formatSessionTime(startTime: number): string {
  const started = typeof startTime === "number" && isFinite(startTime) ? startTime : Date.now();
  const totalSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════
// MASCOT + QUOTES
// ═══════════════════════════════════════════════════════════
const MASCOT_REACTIONS: Record<string, MascotState[]> = {
  sessionStart: [
    { mood: "happy", animation: "float", message: "Ready when you are. Let's learn something!" },
    { mood: "excited", animation: "bounce", message: "New session! I love the smell of fresh cards." },
    { mood: "thinking", animation: "float", message: "Take your time — accuracy beats speed." },
  ],
  correct: [
    { mood: "happy", animation: "bounce", message: "Nailed it!" },
    { mood: "proud", animation: "spin", message: "Look at you go." },
    { mood: "excited", animation: "dance", message: "Yes! That's the one." },
  ],
  wrong: [
    { mood: "worried", animation: "shake", message: "Close — it'll come back around." },
    { mood: "sad", animation: "shake", message: "No worries, that's what repeats are for." },
    { mood: "thinking", animation: "float", message: "Almost. Picture the example sentence." },
  ],
  levelUp: [
    { mood: "celebrating", animation: "dance", message: "LEVEL UP! You're evolving!" },
    { mood: "excited", animation: "spin", message: "New level unlocked. Look at that badge!" },
  ],
  streak3: [{ mood: "happy", animation: "bounce", message: "Three in a row — the rhythm's yours." }],
  streak5: [{ mood: "excited", animation: "dance", message: "Five straight! Don't stop now." }],
  streak10: [{ mood: "celebrating", animation: "spin", message: "TEN. Absolutely locked in." }],
};

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function getRandomMascotReaction(event: string): MascotState {
  const pool = MASCOT_REACTIONS[event] || MASCOT_REACTIONS.correct;
  return { ...pick(pool) };
}

const QUOTES: Quote[] = [
  { quote: "The limits of my language mean the limits of my world.", author: "Ludwig Wittgenstein" },
  { quote: "To have another language is to possess a second soul.", author: "Charlemagne" },
  { quote: "A different language is a different vision of life.", author: "Federico Fellini" },
  { quote: "You can never understand one language until you understand at least two.", author: "Geoffrey Willans" },
  { quote: "Learning is a treasure that will follow its owner everywhere.", author: "Chinese proverb" },
  { quote: "Words are, of course, the most powerful drug used by mankind.", author: "Rudyard Kipling" },
  { quote: "One language sets you in a corridor for life. Two open every door along the way.", author: "Frank Smith" },
  { quote: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
];

export function getRandomQuote(): Quote {
  return pick(QUOTES);
}

// ═══════════════════════════════════════════════════════════
// GACHA
// ═══════════════════════════════════════════════════════════
/*
 * Odds with a floor under them. A pure random roll feels broken to unlucky learners,
 * so both counters escalate and then guarantee: epic by 20 pulls, legendary by 90.
 * The counters are shown to the player, which is what turns an RNG into a promise.
 */
export const PITY_EPIC = 20;
export const PITY_LEGENDARY = 90;

export function rollGacha(state: GachaState): { rarity: Rarity } {
  const sinceEpic = Math.max(0, state?.pullsSinceEpic ?? 0);
  const sinceLegendary = Math.max(0, state?.pullsSinceLegendary ?? 0);

  if (sinceLegendary + 1 >= PITY_LEGENDARY) return { rarity: "legendary" };

  const weights: Record<Rarity, number> = {
    common: 62,
    rare: 26,
    // Soft pity starts at ten pulls without an epic, then climbs steeply.
    epic: 10 + (sinceEpic >= 10 ? (sinceEpic - 10) * 2.2 : 0),
    legendary: 2 + (sinceLegendary >= 50 ? (sinceLegendary - 50) * 0.8 : 0),
  };

  if (sinceEpic + 1 >= PITY_EPIC) {
    weights.common = 0;
    weights.rare = Math.min(weights.rare, 18);
    weights.epic += 30;
  }

  const order: Rarity[] = ["common", "rare", "epic", "legendary"];
  const total = order.reduce((sum, rarity) => sum + weights[rarity], 0);
  let roll = Math.random() * total;
  for (const rarity of order) {
    roll -= weights[rarity];
    if (roll <= 0) return { rarity };
  }
  return { rarity: "common" };
}

// ═══════════════════════════════════════════════════════════
// CONFETTI
// ═══════════════════════════════════════════════════════════
/*
 * One palette per moment, so a legendary pull reads as different from a correct
 * answer. `canvas-confetti` already runs its own frame loop, so these fire and
 * forget — a burst that is still tumbling when the next one starts simply overlaps.
 */
export function launchConfetti(kind: string = "correct"): void {
  try {
    const presets: Record<string, () => void> = {
      correct: () =>
        confetti({ particleCount: 45, spread: 60, startVelocity: 32, origin: { y: 0.75 }, colors: ["#10b981", "#34d399", "#a7f3d0"], scalar: 0.9 }),
      perfect: () =>
        confetti({ particleCount: 90, spread: 90, startVelocity: 45, origin: { y: 0.6 }, colors: ["#ec4899", "#f472b6", "#fcd34d", "#ffffff"], scalar: 1.1 }),
      love: () =>
        confetti({ particleCount: 70, spread: 100, startVelocity: 38, origin: { y: 0.65 }, shapes: ["circle", "square"], colors: ["#fb7185", "#f472b6", "#fecdd3"], scalar: 1 }),
      legendary: () => {
        // Three staggered bursts: the reveal deserves a beat, not a single pop.
        confetti({ particleCount: 140, spread: 360, startVelocity: 48, origin: { y: 0.5 }, colors: ["#f59e0b", "#fcd34d", "#fbbf24", "#ffffff"], scalar: 1.25, ticks: 240 });
        setTimeout(
          () => confetti({ particleCount: 80, spread: 120, startVelocity: 40, origin: { x: 0.2, y: 0.7 }, colors: ["#f59e0b", "#ffffff"] }),
          220
        );
        setTimeout(
          () => confetti({ particleCount: 80, spread: 120, startVelocity: 40, origin: { x: 0.8, y: 0.7 }, colors: ["#fcd34d", "#ffffff"] }),
          380
        );
      },
      victory: () => {
        confetti({ particleCount: 120, spread: 100, startVelocity: 50, origin: { y: 0.6 }, colors: ["#10b981", "#3b82f6", "#fcd34d"], scalar: 1.15 });
        setTimeout(() => confetti({ particleCount: 60, spread: 160, startVelocity: 35, origin: { y: 0.5 }, shapes: ["star"], colors: ["#fcd34d", "#ffffff"] }), 200);
      },
      levelup: () =>
        confetti({ particleCount: 130, spread: 110, startVelocity: 55, origin: { y: 0.45 }, colors: ["#f59e0b", "#ec4899", "#8b5cf6", "#ffffff"], scalar: 1.2, ticks: 220 }),
    };
    (presets[kind] || presets.correct)();
  } catch {
    // Confetti is decoration; it must never be the reason a card fails to advance.
  }
}

// ═══════════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════════
/*
 * The sound engine and its synthesis primitives live in `lib/audio.ts`, next to the
 * reverb bus and the compressor they all share. `SoundEngine` is re-exported below so
 * every existing import keeps working, and the two engines that stayed here — voice and
 * background music — borrow the same primitives rather than growing their own.
 */
export { SoundEngine, getAudioContext, tone, burst, partials } from "../../lib/audio";
import { getAudioContext, tone } from "../../lib/audio";

export class VoiceEngine {
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = !!enabled;
    if (!this.enabled) this.stop();
  }

  stop(): void {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* speechSynthesis can be missing in older webviews */
    }
  }

  /**
   * The mascot's voice. Pitch and rate carry the mood, because a monotone delivery
   * is worse than no voice at all.
   */
  speak(text: string, mood: string = "happy"): void {
    if (!this.enabled || !text) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      const profile: Record<string, { pitch: number; rate: number }> = {
        happy: { pitch: 1.2, rate: 1.02 },
        excited: { pitch: 1.35, rate: 1.12 },
        proud: { pitch: 1.1, rate: 0.98 },
        love: { pitch: 1.3, rate: 0.95 },
        angry: { pitch: 0.85, rate: 1.1 },
        sad: { pitch: 0.9, rate: 0.9 },
        worried: { pitch: 1.05, rate: 0.95 },
        thinking: { pitch: 1.0, rate: 0.92 },
      };
      const chosen = profile[mood] || profile.happy;
      utterance.pitch = chosen.pitch;
      utterance.rate = chosen.rate;
      synth.speak(utterance);
    } catch {
      /* speaking is optional polish */
    }
  }
}

/**
 * Generated background music.
 *
 * There are no audio files in this build, so each track is a slow arpeggio over a
 * different scale, with a soft pad underneath. Different scales is what makes them
 * feel like different tracks rather than the same loop at another tempo.
 */
export const MUSIC_TRACKS: MusicTrack[] = [
  { id: "focus", name: "Focus Flow", color: "#38bdf8" },
  { id: "neon", name: "Neon Study", color: "#f472b6" },
  { id: "deep", name: "Deep Work", color: "#a78bfa" },
  { id: "arcade", name: "Arcade Rush", color: "#fbbf24" },
];

const TRACK_SCALES: Record<string, { notes: number[]; stepMs: number; wave: OscillatorType }> = {
  // A minor pentatonic — calm, no leading tone, hard to make sound wrong.
  focus: { notes: [261.63, 311.13, 349.23, 392.0, 466.16, 523.25], stepMs: 620, wave: "sine" },
  // Dorian, brighter, a touch faster.
  neon: { notes: [293.66, 329.63, 349.23, 440.0, 493.88, 587.33], stepMs: 480, wave: "triangle" },
  // Low and slow.
  deep: { notes: [174.61, 196.0, 220.0, 261.63, 293.66, 349.23], stepMs: 780, wave: "sine" },
  // Square wave and quick steps for the arcade feel.
  arcade: { notes: [329.63, 392.0, 493.88, 587.33, 659.25, 783.99], stepMs: 340, wave: "square" },
};

export class MusicEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private volume = 0.5;

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  play(trackId: string): void {
    this.stop();
    const scale = TRACK_SCALES[trackId];
    if (!scale) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    this.step = 0;

    const tick = () => {
      const live = getAudioContext();
      if (!live) return;
      const { notes, wave } = scale;
      // Wander rather than walk the scale in order, so it never sounds like an exercise.
      const index = (this.step * 3 + (this.step % 2 === 0 ? 1 : 4)) % notes.length;
      const note = notes[index];
      const gain = 0.05 * this.volume;
      tone(live, { freq: note, duration: (scale.stepMs / 1000) * 1.6, type: wave, gain });
      // A quiet octave below holds the pad together between notes.
      if (this.step % 4 === 0) {
        tone(live, { freq: note / 2, duration: (scale.stepMs / 1000) * 3.2, type: "sine", gain: gain * 0.7 });
      }
      this.step++;
    };

    tick();
    this.timer = setInterval(tick, scale.stepMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

// ═══════════════════════════════════════════════════════════
// PDF EXPORT
// ═══════════════════════════════════════════════════════════
/** Card text comes from pasted AI JSON, so it is escaped before it reaches the DOM. */
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A print-ready sheet in a new tab. The browser's own print-to-PDF does the file
 * conversion, which keeps a PDF library out of an offline single-file build.
 */
export function generateFlashcardsPDF(payload: FlashPayload): void {
  const items = payload?.items || [];
  const title = escapeHtml(payload?.title || "Flashcards");

  const cards = items
    .map((item, index) => {
      const examples = (item.examples || [])
        .map((ex) => `<li>“${escapeHtml(ex.text)}”${ex.source ? ` <em>— ${escapeHtml(ex.source)}</em>` : ""}</li>`)
        .join("");
      const family = (item.wordFamily || []).map((word) => `<span class="chip">${escapeHtml(word)}</span>`).join("");
      const ccqs = (item.ccq || [])
        .map((q) => `<li>${escapeHtml(q.question)} <strong>${q.answer ? "Yes" : "No"}</strong></li>`)
        .join("");
      const etymology = item.etymology
        ? `<div class="block"><h4>Etymology</h4><p><strong>${escapeHtml(item.etymology.root)}</strong> (${escapeHtml(
            item.etymology.origin
          )}) — ${escapeHtml(item.etymology.meaning)}</p></div>`
        : "";

      return `<article class="card">
        <header><span class="num">${index + 1}</span><h2>${escapeHtml(item.front)}</h2>
        <span class="rarity ${escapeHtml(item.rarity || "common")}">${escapeHtml(item.rarity || "common")}</span></header>
        <p class="def">${escapeHtml(item.back)}</p>
        ${item.example ? `<p class="ex">“${escapeHtml(item.example)}”</p>` : ""}
        ${item.l1Translation ? `<p class="l1"><strong>L1:</strong> ${escapeHtml(item.l1Translation)}</p>` : ""}
        ${examples ? `<div class="block"><h4>Examples</h4><ul>${examples}</ul></div>` : ""}
        ${etymology}
        ${family ? `<div class="block"><h4>Word family</h4><p>${family}</p></div>` : ""}
        ${ccqs ? `<div class="block"><h4>Concept check</h4><ul>${ccqs}</ul></div>` : ""}
      </article>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${title} — Flashcards</title>
<style>
  @page { margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #fff; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  .sub { color: #64748b; margin: 0 0 20px; font-size: 13px; }
  .print { position: fixed; right: 20px; top: 20px; padding: 10px 16px; border: 0; border-radius: 10px; background: #4f46e5; color: #fff; font-weight: 700; cursor: pointer; }
  .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin-bottom: 14px; break-inside: avoid; page-break-inside: avoid; }
  .card header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 999px; background: #eef2ff; color: #4f46e5; font-weight: 800; font-size: 12px; }
  h2 { font-size: 19px; margin: 0; flex: 1; }
  .rarity { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; font-weight: 800; padding: 3px 8px; border-radius: 999px; border: 1px solid currentColor; }
  .rarity.common { color: #64748b; } .rarity.rare { color: #2563eb; } .rarity.epic { color: #9333ea; } .rarity.legendary { color: #d97706; }
  .def { font-size: 14px; margin: 0 0 6px; }
  .ex { font-style: italic; color: #334155; margin: 0 0 6px; font-size: 13px; }
  .l1 { font-size: 12px; color: #1d4ed8; margin: 0 0 6px; }
  .block { margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 8px; }
  .block h4 { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin: 0 0 4px; }
  .block p, .block li { font-size: 12.5px; margin: 0 0 3px; color: #1e293b; }
  .block ul { margin: 0; padding-left: 18px; }
  .chip { display: inline-block; font-size: 11px; background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 2px 8px; margin: 0 4px 4px 0; }
  @media print { .print { display: none; } body { padding: 0; } }
</style></head>
<body>
  <button class="print" onclick="window.print()">Print / Save as PDF</button>
  <h1>${title}</h1>
  <p class="sub">${escapeHtml(payload?.description || "")} · ${items.length} card${items.length === 1 ? "" : "s"}${
    payload?.language ? ` · ${escapeHtml(payload.language)}` : ""
  }</p>
  ${cards || "<p>This deck has no cards yet.</p>"}
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ═══════════════════════════════════════════════════════════
// DEMO DECK
// ═══════════════════════════════════════════════════════════
/*
 * The deck the app boots into, and the shape the AI prompt in `App.tsx` asks for.
 * It covers all four rarities on purpose: the gacha, card battle and rarity styling
 * all have nothing to show without at least one card of each tier.
 */
export const DEMO_PAYLOAD: FlashPayload = {
  title: "Words Worth Keeping",
  description: "Eight English words with etymology, real-world usage and concept checks",
  language: "English",
  items: [
    {
      id: "1",
      front: "Serendipity",
      back: "The occurrence of events by chance in a happy or beneficial way; a fortunate accident.",
      example: "Finding my dream flat the same day I started looking was pure serendipity.",
      examples: [
        { text: "The discovery of penicillin was one of history's greatest examples of serendipity.", source: "Science History" },
        { text: "Their meeting at that tiny café in Paris was serendipity — they hadn't seen each other in twenty years.", source: "Movie: Before Sunset" },
        { text: "Sometimes the best career moves happen through serendipity rather than careful planning.", source: "Business" },
      ],
      l1Translation: "casualidad afortunada",
      etymology: {
        root: "Serendip",
        origin: "Persian, via English",
        meaning:
          "Coined by Horace Walpole in 1754 from the Persian tale 'The Three Princes of Serendip', whose heroes made discoveries by accident and sagacity.",
        relatedWords: ["serendipitous", "serendipitously"],
      },
      wordFamily: ["serendipity (n)", "serendipitous (adj)", "serendipitously (adv)"],
      rarity: "legendary",
      ccq: [
        { question: "Is serendipity something you can plan or schedule?", answer: false },
        { question: "If you found a £50 note that paid for an emergency repair, would that be serendipity?", answer: true },
        { question: "Is serendipity usually associated with bad outcomes?", answer: false },
      ],
    },
    {
      id: "2",
      front: "Meticulous",
      back: "Showing great attention to detail; very careful and precise.",
      example: "She kept meticulous notes, so nothing was ever lost between lessons.",
      examples: [
        { text: "The restoration was meticulous, down to the original paint mixture.", source: "News" },
        { text: "He was meticulous about his desk — every pencil had a place.", source: "Book: The Remains of the Day" },
        { text: "My grandmother is meticulous with her recipe cards.", source: "Conversation" },
      ],
      l1Translation: "meticuloso / minucioso",
      etymology: {
        root: "Metus",
        origin: "Latin",
        meaning:
          "From Latin 'meticulosus' meaning fearful — the sense shifted from 'frightened' to 'careful to the point of anxiety', then lost the fear entirely.",
        relatedWords: ["meticulousness", "meticulously"],
      },
      wordFamily: ["meticulous (adj)", "meticulously (adv)", "meticulousness (n)"],
      rarity: "epic",
      ccq: [
        { question: "Does a meticulous person usually rush?", answer: false },
        { question: "Can meticulous describe work rather than a person?", answer: true },
        { question: "Is meticulous a mild criticism of sloppiness?", answer: false },
      ],
    },
    {
      id: "3",
      front: "Resilient",
      back: "Able to recover quickly from difficulty; springing back into shape after being stretched or compressed.",
      example: "Kids are remarkably resilient — a bad morning rarely lasts past lunch.",
      examples: [
        { text: "The economy proved more resilient than forecasters expected.", source: "News" },
        { text: "I am not afraid of storms, for I am learning how to sail my ship.", source: "Book: Little Women" },
        { text: "She's so resilient, she bounced back from that setback in a week.", source: "Conversation" },
      ],
      l1Translation: "resiliente",
      etymology: {
        root: "Salire",
        origin: "Latin",
        meaning: "From 'resilire' — 'to leap back', built from 're-' (back) plus 'salire' (to jump).",
        relatedWords: ["resilience", "resiliency", "resiliently"],
      },
      wordFamily: ["resilient (adj)", "resilience (n)", "resiliently (adv)"],
      rarity: "rare",
      ccq: [
        { question: "Is a resilient material one that breaks easily?", answer: false },
        { question: "Can a person be described as resilient?", answer: true },
        { question: "Does resilient imply returning to an earlier state?", answer: true },
      ],
    },
    {
      id: "4",
      front: "Ephemeral",
      back: "Lasting for a very short time; transitory.",
      example: "The ephemeral glow of the sunset lasted barely ten minutes.",
      examples: [
        { text: "Fame can be remarkably ephemeral.", source: "News" },
        { text: "We are ephemeral creatures walking on a stage of stone.", source: "Movie: Blade Runner 2049" },
        { text: "Autumn colours are ephemeral — blink and the trees are bare.", source: "Conversation" },
      ],
      l1Translation: "efímero",
      etymology: {
        root: "Ephemeros",
        origin: "Greek",
        meaning: "'Ephēmeros' meant 'lasting only a day' — from 'epi' (on) plus 'hēmera' (day).",
        relatedWords: ["ephemera", "ephemerally"],
      },
      wordFamily: ["ephemeral (adj)", "ephemera (n)", "ephemerally (adv)"],
      rarity: "rare",
      ccq: [
        { question: "Does ephemeral describe something long-lasting?", answer: false },
        { question: "Are mayflies a good example of something ephemeral?", answer: true },
        { question: "Can ephemeral describe an experience rather than an object?", answer: true },
      ],
    },
    {
      id: "5",
      front: "Ubiquitous",
      back: "Present, appearing, or found everywhere.",
      example: "Phones have become so ubiquitous that a quiet carriage feels strange.",
      examples: [
        { text: "Coffee shops are now ubiquitous on this street.", source: "News" },
        { text: "Plastic is ubiquitous, and that is precisely the problem.", source: "Academic" },
        { text: "Those paper cups are ubiquitous in every office.", source: "Conversation" },
      ],
      l1Translation: "omnipresente",
      etymology: {
        root: "Ubique",
        origin: "Latin",
        meaning: "'Ubique' meant 'everywhere'; 'ubiquitous' arrived in English in the 1800s.",
        relatedWords: ["ubiquity", "ubiquitously"],
      },
      wordFamily: ["ubiquitous (adj)", "ubiquity (n)", "ubiquitously (adv)"],
      rarity: "common",
      ccq: [
        { question: "Is something ubiquitous found in only one place?", answer: false },
        { question: "Could you describe a brand as ubiquitous?", answer: true },
        { question: "Does ubiquitous suggest something is rare?", answer: false },
      ],
    },
    {
      id: "6",
      front: "Negotiate",
      back: "To discuss something in order to reach an agreement; also, to find a way over or through an obstacle.",
      example: "We negotiated a lower price by offering to pay upfront.",
      examples: [
        { text: "Union leaders will negotiate with management next week.", source: "News" },
        { text: "You can't always get what you want, but if you try sometimes you just might find you get what you need.", source: "Movie: The Big Short" },
        { text: "I had to negotiate my way through the market crowds.", source: "Conversation" },
      ],
      l1Translation: "negociar",
      etymology: {
        root: "Negotium",
        origin: "Latin",
        meaning: "'Negotium' meant business — 'nec' (not) plus 'otium' (leisure), literally 'not leisure'.",
        relatedWords: ["negotiation", "negotiator", "negotiable"],
      },
      wordFamily: ["negotiate (v)", "negotiation (n)", "negotiator (n)", "negotiable (adj)"],
      rarity: "common",
      ccq: [
        { question: "Does negotiating always mean arguing?", answer: false },
        { question: "Can you negotiate a physical obstacle like a path?", answer: true },
        { question: "Must both sides gain something for a negotiation to work?", answer: true },
      ],
    },
    {
      id: "7",
      front: "Succinct",
      back: "Briefly and clearly expressed; using few words to say something well.",
      example: "His feedback was succinct: cut the second paragraph.",
      examples: [
        { text: "The report was refreshingly succinct — two pages, no filler.", source: "Business" },
        { text: "Brevity is the soul of wit.", source: "Book: Hamlet" },
        { text: "Keep the email succinct and people actually read it.", source: "Conversation" },
      ],
      l1Translation: "sucinto / conciso",
      etymology: {
        root: "Cingere",
        origin: "Latin",
        meaning: "'Succinctus' meant 'girded up' — a tucked-in robe, and so 'trimmed' in speech too.",
        relatedWords: ["succinctly", "succinctness"],
      },
      wordFamily: ["succinct (adj)", "succinctly (adv)", "succinctness (n)"],
      rarity: "common",
      ccq: [
        { question: "Is a succinct answer a long one?", answer: false },
        { question: "Can succinct describe writing as well as speech?", answer: true },
        { question: "Does succinct imply careless or vague?", answer: false },
      ],
    },
    {
      id: "8",
      front: "Wanderlust",
      back: "A strong desire to travel and explore the world.",
      example: "One documentary about Patagonia and my wanderlust was back.",
      examples: [
        { text: "A year of remote work revived her wanderlust.", source: "News" },
        { text: "The world is a book and those who do not travel read only one page.", source: "Book: Confessions" },
        { text: "I get serious wanderlust every time I see a cheap flight.", source: "Conversation" },
      ],
      l1Translation: "deseo de viajar",
      etymology: {
        root: "Wandern + Lust",
        origin: "German",
        meaning: "From German 'wandern' (to hike) and 'Lust' (desire) — a love of being on the move.",
        relatedWords: ["wanderer", "wander"],
      },
      wordFamily: ["wanderlust (n)", "wander (v)", "wanderer (n)"],
      rarity: "common",
      ccq: [
        { question: "Does wanderlust mean a fear of travelling?", answer: false },
        { question: "Can wanderlust be felt while sitting at home?", answer: true },
        { question: "Is wanderlust borrowed from German?", answer: true },
      ],
    },
  ],
};
