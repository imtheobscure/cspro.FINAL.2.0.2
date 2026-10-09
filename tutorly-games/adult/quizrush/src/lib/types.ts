// ==== Question types ====
export type QuestionType =
  | "mc" // multiple choice (single answer)
  | "multi" // multiple correct answers
  | "tf" // true / false
  | "reading" // multiple choice with passage
  | "listening" // multiple choice with read-aloud audio
  | "dialogue" // best line to complete a dialogue
  | "typed"; // type the answer

export interface QuestionBase {
  id?: string;
  type: QuestionType;
  question: string;
  choices?: string[];
  answer?: number | number[] | string | string[]; // index, indices, or text(s)
  passage?: string; // reading comprehension
  audioText?: string; // listening: text to read aloud
  voice?: string; // preferred voice hint
  dialogue?: { speaker: string; line: string }[]; // dialogue context
  explanation?: string; // shown after answering
  slide?: TeachSlide; // rich post-game teaching slide
  timeLimit?: number; // seconds
  points?: number;
}

export interface TeachSlide {
  title?: string;
  meaning?: string;
  usage?: string;
  example?: string;
  tip?: string;
  emoji?: string;
  color?: string;
}

export type Question = QuestionBase;

// ==== Shop / Economy ====
export interface PlayerEconomy {
  multiplierLevel: number; // 0-5
  streakLevel: number; // 0-5
  insuranceLevel: number; // 0-3
  powerups: string[]; // owned single-use power-up ids
  activeEffects: ActiveEffect[]; // effects queued for next questions
}

export interface ActiveEffect {
  id: string;
  remaining: number; // number of questions it applies to
}

export const BASE_REWARD = 10;
export const BASE_PENALTY = 5;

// Multiplier tiers: level 0 => x1, 1 => x1.5 ... exponential-ish
export const MULTIPLIER_VALUES = [1, 1.5, 2.5, 5, 12, 25];
export const MULTIPLIER_COSTS = [0, 250, 800, 2500, 7000, 18000];

export const STREAK_BONUS_VALUES = [0, 5, 15, 40, 90, 200]; // extra $ per streak question
export const STREAK_COSTS = [0, 200, 600, 1800, 5000, 12000];

export const INSURANCE_REDUCTION = [0, 0.4, 0.75, 1]; // fraction of penalty removed
export const INSURANCE_COSTS = [0, 400, 1200, 3500];

export interface PowerUpDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  guide: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  color: string;
}

export const POWERUPS: PowerUpDef[] = [
  {
    id: "double",
    name: "Double Jeopardy",
    emoji: "🎲",
    desc: "Earn 2× cash if correct — but lose 2× if wrong on the next question.",
    guide: "High risk, high reward. Play it when you're confident about the next question.",
    rarity: "rare",
    color: "#f59e0b",
  },
  {
    id: "shield",
    name: "Mega Shield",
    emoji: "🛡️",
    desc: "Protects your cash from the next 2 incorrect answers.",
    guide: "Great defensive tool. Activate before a tricky section to play fearlessly.",
    rarity: "epic",
    color: "#3b82f6",
  },
  {
    id: "streaksaver",
    name: "Streak Saver",
    emoji: "🔥",
    desc: "Keeps your streak alive even if your next answer is wrong.",
    guide: "Protect a long, valuable streak. The higher your streak, the more this is worth.",
    rarity: "rare",
    color: "#ef4444",
  },
  {
    id: "freeze",
    name: "Time Freeze",
    emoji: "❄️",
    desc: "Pauses the countdown timer for the current question.",
    guide: "Buy yourself time on a hard question. Tap to freeze the clock instantly.",
    rarity: "common",
    color: "#06b6d4",
  },
  {
    id: "jackpot",
    name: "Jackpot",
    emoji: "💰",
    desc: "Instantly triples the cash from your next correct answer.",
    guide: "Stack with multipliers for a massive single-question payout.",
    rarity: "legendary",
    color: "#eab308",
  },
  {
    id: "fifty",
    name: "50 / 50",
    emoji: "✂️",
    desc: "Removes two wrong choices on the next multiple-choice question.",
    guide: "Turns a hard question into a coin flip. Use on your weakest topics.",
    rarity: "common",
    color: "#8b5cf6",
  },
  {
    id: "magnet",
    name: "Cash Magnet",
    emoji: "🧲",
    desc: "Adds a flat +$100 bonus to your next correct answer.",
    guide: "Reliable value early game when multipliers are still low.",
    rarity: "common",
    color: "#10b981",
  },
  {
    id: "insurance1",
    name: "Instant Insurance",
    emoji: "🪙",
    desc: "Fully cancels the penalty on your next wrong answer.",
    guide: "One-time safety net. Perfect for a guess.",
    rarity: "common",
    color: "#64748b",
  },
  {
    id: "overdrive",
    name: "Overdrive",
    emoji: "⚡",
    desc: "Doubles your streak bonus for the next 3 questions.",
    guide: "Combine with a hot streak to snowball your lead fast.",
    rarity: "epic",
    color: "#f97316",
  },
  {
    id: "sabotage",
    name: "Sabotage",
    emoji: "💣",
    desc: "The current leader earns half cash on their next question.",
    guide: "Disruptive! Knock the top player down a peg to close the gap.",
    rarity: "rare",
    color: "#dc2626",
  },
  {
    id: "steal",
    name: "Heist",
    emoji: "🦹",
    desc: "Steal $150 from a random opponent on your next correct answer.",
    guide: "Aggressive economy play — grow your pile while shrinking theirs.",
    rarity: "epic",
    color: "#7c3aed",
  },
  {
    id: "lucky",
    name: "Lucky Clover",
    emoji: "🍀",
    desc: "Guarantees a power-up drop after your next correct answer.",
    guide: "Keep the power-up engine running. Chain drops together.",
    rarity: "rare",
    color: "#22c55e",
  },
];

export function powerupById(id: string): PowerUpDef | undefined {
  return POWERUPS.find((p) => p.id === id);
}

// ==== Avatars ====
export const AVATAR_SETS: { name: string; avatars: string[] }[] = [
  { name: "Animals", avatars: ["🦊", "🐼", "🦁", "🐸", "🐵", "🦉", "🐧", "🦄", "🐙", "🦖"] },
  { name: "Space", avatars: ["🚀", "🛸", "👽", "🌟", "🪐", "☄️", "🌙", "🔭", "👨‍🚀", "🌌"] },
  { name: "Faces", avatars: ["😎", "🤓", "🥳", "🤠", "🧐", "😇", "🤖", "🦸", "🧙", "🥷"] },
  { name: "Food", avatars: ["🍕", "🍔", "🌮", "🍩", "🍦", "🥑", "🍓", "🧁", "🍜", "🍿"] },
  { name: "Sports", avatars: ["⚽", "🏀", "🎾", "🏈", "🎯", "🏓", "🥊", "🏆", "🎽", "🛹"] },
];

export const ALL_AVATARS = AVATAR_SETS.flatMap((s) => s.avatars);
