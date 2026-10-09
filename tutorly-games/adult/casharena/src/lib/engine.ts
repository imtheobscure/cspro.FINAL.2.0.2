import type { AttackType } from "./types";

/* ---------------- SHOP ---------------- */
export const MULTIPLIER_LEVELS = [10, 50, 250, 1000, 5000, 25000]; // cash per correct at level 0..5
export const MULTIPLIER_COST = [0, 100, 800, 5000, 30000, 200000];
export const STREAK_BONUS = [0, 5, 25, 120, 600, 3000]; // extra per streak step at level 0..5
export const STREAK_COST = [0, 60, 400, 2500, 15000, 90000];
export const INSURANCE_RATE = [0, 0.5, 0.8, 1]; // fraction of penalty blocked at level 0..3
export const INSURANCE_COST = [0, 150, 1200, 8000];
export const BASE_PENALTY = 5;

export interface ShopItemDef {
  key: "multiplier" | "streak" | "insurance";
  name: string;
  icon: string;
  desc: string;
  max: number;
  costs: number[];
  levelLabel: (lvl: number) => string;
}

export const SHOP_UPGRADES: ShopItemDef[] = [
  {
    key: "multiplier",
    name: "Money Multiplier",
    icon: "💰",
    desc: "Massively increases cash earned per correct answer.",
    max: 5,
    costs: MULTIPLIER_COST,
    levelLabel: (l) => `$${MULTIPLIER_LEVELS[l].toLocaleString()} / correct`,
  },
  {
    key: "streak",
    name: "Streak Bonus",
    icon: "🔥",
    desc: "Earn extra cash for every question in your current streak.",
    max: 5,
    costs: STREAK_COST,
    levelLabel: (l) => (l === 0 ? "No bonus" : `+$${STREAK_BONUS[l].toLocaleString()} × streak`),
  },
  {
    key: "insurance",
    name: "Insurance",
    icon: "🛡️",
    desc: "Reduces or removes the cash penalty on wrong answers.",
    max: 3,
    costs: INSURANCE_COST,
    levelLabel: (l) => `${Math.round(INSURANCE_RATE[l] * 100)}% protected`,
  },
];

/* ---------------- ATTACKS (buyable disruptive abilities) ---------------- */
export interface AttackDef {
  type: AttackType;
  name: string;
  icon: string;
  cost: number;
  desc: string;
  target: "random" | "leader";
}
export const ATTACKS: AttackDef[] = [
  { type: "blackout", name: "Blackout", icon: "🌑", cost: 400, desc: "Plunge a random rival's screen into darkness for 6 seconds.", target: "random" },
  { type: "scramble", name: "Scramble", icon: "🌀", cost: 350, desc: "Shuffle a rival's answer options mid-question for 2 questions.", target: "random" },
  { type: "fog", name: "Brain Fog", icon: "🌫️", cost: 500, desc: "Blur a rival's question text for 8 seconds.", target: "random" },
  { type: "slowmo", name: "Slow-Mo", icon: "🐌", cost: 600, desc: "Cut the leader's timer speed... in reverse: their next timer runs 2x faster.", target: "leader" },
  { type: "drain", name: "Cash Drain", icon: "🧲", cost: 1500, desc: "Siphon 8% of the leader's cash straight into your wallet.", target: "leader" },
];

/* ---------------- POWER-UPS ---------------- */
export type PowerKey =
  | "double_jeopardy"
  | "mega_shield"
  | "streak_saver"
  | "time_freeze"
  | "fifty_fifty"
  | "second_chance"
  | "golden_question"
  | "cash_magnet"
  | "lucky_spin"
  | "heist"
  | "time_warp"
  | "insight"
  | "combo_burst"
  | "reflector"
  | "jackpot";

export interface PowerDef {
  key: PowerKey;
  name: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  desc: string;
  guide: string;
  color: string; // tailwind gradient
  instant?: boolean; // resolves immediately when used
}

export const POWERUPS: PowerDef[] = [
  { key: "double_jeopardy", name: "Double Jeopardy", icon: "🎲", rarity: "rare", color: "from-fuchsia-500 to-purple-700", desc: "Next question: win 2× cash… or lose 2× cash.", guide: "Activate before answering when you feel confident. Your next correct answer pays double, but a wrong answer costs double the penalty." },
  { key: "mega_shield", name: "Mega Shield", icon: "🛡️", rarity: "rare", color: "from-sky-400 to-blue-700", desc: "Blocks the penalty of your next 2 wrong answers.", guide: "A safety net. Once active, your next two mistakes cost you nothing. Great before risky Double Jeopardy plays." },
  { key: "streak_saver", name: "Streak Saver", icon: "🔥", rarity: "common", color: "from-orange-400 to-red-600", desc: "Keeps your streak alive even if the next answer is wrong.", guide: "Protects your streak once. Use it when your streak is high and the question looks hard." },
  { key: "time_freeze", name: "Time Freeze", icon: "❄️", rarity: "common", color: "from-cyan-300 to-indigo-600", desc: "Pauses the countdown for the current question.", guide: "Stops the clock immediately on the question you are looking at. Perfect for long reading passages." },
  { key: "fifty_fifty", name: "50 / 50", icon: "✂️", rarity: "common", color: "from-lime-400 to-emerald-700", desc: "Removes half of the wrong options on this question.", guide: "Cuts the wrong choices in half instantly on the current question." },
  { key: "second_chance", name: "Second Chance", icon: "🔁", rarity: "rare", color: "from-teal-400 to-cyan-700", desc: "If your next answer is wrong, you may answer again.", guide: "Gives you one retry on the next question. Combine it with Double Jeopardy for a low-risk gamble." },
  { key: "golden_question", name: "Golden Question", icon: "👑", rarity: "epic", color: "from-yellow-300 to-amber-600", desc: "Your next correct answer pays 5× cash.", guide: "Stacks with your multiplier! Activate right before a question you know well." },
  { key: "cash_magnet", name: "Cash Magnet", icon: "🧲", rarity: "common", color: "from-rose-400 to-pink-700", desc: "Instantly gain 15% of your current cash.", guide: "Instant bonus. The richer you are, the more it pays — save it for late game.", instant: true },
  { key: "lucky_spin", name: "Lucky Spin", icon: "🎰", rarity: "rare", color: "from-violet-400 to-fuchsia-700", desc: "Random reward: $50 up to 30% of your cash.", guide: "Pure luck. Spin and see what the slot machine gives you.", instant: true },
  { key: "heist", name: "Heist", icon: "🕶️", rarity: "epic", color: "from-slate-500 to-zinc-900", desc: "Steal 5% of the leader's cash.", guide: "Targets whoever is in first place on the leaderboard and transfers 5% of their cash to you.", instant: true },
  { key: "time_warp", name: "Time Warp", icon: "⏱️", rarity: "common", color: "from-indigo-400 to-purple-800", desc: "Adds 15 seconds to the current question.", guide: "Instantly adds 15 seconds to the clock on the current question.", instant: true },
  { key: "insight", name: "Insight", icon: "🔮", rarity: "rare", color: "from-purple-400 to-indigo-800", desc: "Reveals the teaching tip for this question.", guide: "Shows the hint from the question's explanation card before you answer.", instant: true },
  { key: "combo_burst", name: "Combo Burst", icon: "💥", rarity: "epic", color: "from-red-500 to-orange-700", desc: "Next 3 correct answers each pay +50% cash.", guide: "A short buff window. Fire it when you're on a roll and the questions feel easy." },
  { key: "reflector", name: "Reflector", icon: "🪞", rarity: "rare", color: "from-emerald-300 to-teal-800", desc: "Reflects the next attack back to the sender.", guide: "The next Blackout, Scramble, Fog or Drain aimed at you bounces back to the attacker." },
  { key: "jackpot", name: "Jackpot", icon: "💎", rarity: "legendary", color: "from-amber-300 via-yellow-500 to-orange-700", desc: "Instantly gain one full multiplier payout ×10.", guide: "Ultra rare. Pays ten times your current per-question reward instantly.", instant: true },
];

export const POWER_MAP: Record<PowerKey, PowerDef> = Object.fromEntries(POWERUPS.map((p) => [p.key, p])) as Record<PowerKey, PowerDef>;

export function rollPowerUp(): PowerDef {
  const r = Math.random();
  const rarity = r < 0.03 ? "legendary" : r < 0.18 ? "epic" : r < 0.5 ? "rare" : "common";
  const pool = POWERUPS.filter((p) => p.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------------- PLAYER STATE ---------------- */
export interface Buffs {
  doubleJeopardy: boolean;
  shieldCharges: number;
  streakSaver: boolean;
  secondChance: boolean;
  golden: boolean;
  comboBurst: number; // remaining correct answers
  reflector: boolean;
  scrambled: number; // remaining questions with shuffled options (attack)
}

export interface EconState {
  cash: number;
  streak: number;
  bestStreak: number;
  correct: number;
  wrong: number;
  answered: number;
  multiplier: number;
  streakLvl: number;
  insurance: number;
  inventory: PowerKey[];
  buffs: Buffs;
  wrongIds: string[];
  sinceDrop: number;
}

export const initialEcon = (): EconState => ({
  cash: 0,
  streak: 0,
  bestStreak: 0,
  correct: 0,
  wrong: 0,
  answered: 0,
  multiplier: 0,
  streakLvl: 0,
  insurance: 0,
  inventory: [],
  buffs: { doubleJeopardy: false, shieldCharges: 0, streakSaver: false, secondChance: false, golden: false, comboBurst: 0, reflector: false, scrambled: 0 },
  wrongIds: [],
  sinceDrop: 0,
});

export function perCorrect(s: EconState): number {
  return MULTIPLIER_LEVELS[s.multiplier] + STREAK_BONUS[s.streakLvl] * s.streak;
}

export interface ResolveResult {
  state: EconState;
  delta: number;
  message: string;
  dropped: PowerDef | null;
  retry: boolean;
}

export function resolveAnswer(s: EconState, isCorrect: boolean, qid: string): ResolveResult {
  const n: EconState = { ...s, buffs: { ...s.buffs }, inventory: [...s.inventory], wrongIds: [...s.wrongIds] };
  let delta = 0;
  let message = "";
  let dropped: PowerDef | null = null;
  let retry = false;

  if (n.buffs.scrambled > 0) n.buffs.scrambled--;

  if (isCorrect) {
    n.streak += 1;
    n.bestStreak = Math.max(n.bestStreak, n.streak);
    n.correct += 1;
    let earn = MULTIPLIER_LEVELS[n.multiplier] + STREAK_BONUS[n.streakLvl] * n.streak;
    const tags: string[] = [];
    if (n.buffs.golden) { earn *= 5; n.buffs.golden = false; tags.push("👑 GOLDEN ×5"); }
    if (n.buffs.doubleJeopardy) { earn *= 2; n.buffs.doubleJeopardy = false; tags.push("🎲 DOUBLE ×2"); }
    if (n.buffs.comboBurst > 0) { earn = Math.round(earn * 1.5); n.buffs.comboBurst--; tags.push("💥 COMBO +50%"); }
    delta = Math.round(earn);
    n.cash += delta;
    message = tags.length ? tags.join("  ") : n.streak >= 3 ? `🔥 ${n.streak} STREAK!` : "CORRECT!";
    n.sinceDrop += 1;
    if (n.sinceDrop >= 3) {
      n.sinceDrop = 0;
      dropped = rollPowerUp();
      n.inventory.push(dropped.key);
    }
  } else {
    if (n.buffs.secondChance) {
      n.buffs.secondChance = false;
      return { state: n, delta: 0, message: "🔁 SECOND CHANCE — try again!", dropped: null, retry: true };
    }
    n.wrong += 1;
    if (!n.wrongIds.includes(qid)) n.wrongIds.push(qid);
    let penalty = BASE_PENALTY + Math.round(MULTIPLIER_LEVELS[n.multiplier] * 0.1);
    if (n.buffs.doubleJeopardy) { penalty *= 2; n.buffs.doubleJeopardy = false; }
    if (n.buffs.golden) n.buffs.golden = false;
    if (n.buffs.shieldCharges > 0) {
      n.buffs.shieldCharges--;
      penalty = 0;
      message = "🛡️ SHIELD ABSORBED IT";
    } else {
      const blocked = INSURANCE_RATE[n.insurance];
      penalty = Math.round(penalty * (1 - blocked));
      message = blocked >= 1 ? "🛡️ INSURED — no loss" : "WRONG";
    }
    penalty = Math.min(penalty, n.cash);
    delta = -penalty;
    n.cash -= penalty;
    if (n.buffs.streakSaver) { n.buffs.streakSaver = false; message += " · 🔥 streak saved"; }
    else n.streak = 0;
  }
  n.answered += 1;
  return { state: n, delta, message, dropped, retry };
}

export function buyUpgrade(s: EconState, key: ShopItemDef["key"]): EconState | null {
  const def = SHOP_UPGRADES.find((d) => d.key === key)!;
  const lvl = s[key];
  if (lvl >= def.max) return null;
  const cost = def.costs[lvl + 1];
  if (s.cash < cost) return null;
  return { ...s, cash: s.cash - cost, [key]: lvl + 1 };
}

export function fmtCash(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}
