import {
  BASE_REWARD,
  BASE_PENALTY,
  MULTIPLIER_VALUES,
  STREAK_BONUS_VALUES,
  INSURANCE_REDUCTION,
  type PlayerEconomy,
} from "./types";

export function defaultEconomy(): PlayerEconomy {
  return {
    multiplierLevel: 0,
    streakLevel: 0,
    insuranceLevel: 0,
    powerups: [],
    activeEffects: [],
  };
}

export interface ScoreInput {
  correct: boolean;
  streakBefore: number; // current streak count (consecutive correct)
  economy: PlayerEconomy;
}

export interface ScoreResult {
  cashDelta: number;
  newStreak: number;
  breakdown: string[];
  consumedPowerups: string[];
  triggeredEffects: string[];
}

/**
 * Pure economy calculation. The server calls this so the math is authoritative,
 * but the client mirrors it for instant feedback.
 */
export function computeScore(input: ScoreInput): ScoreResult {
  const { correct, streakBefore, economy } = input;
  const breakdown: string[] = [];
  const consumed: string[] = [];
  const triggered: string[] = [];
  const has = (id: string) => economy.powerups.includes(id);
  const consume = (id: string) => {
    if (has(id)) {
      consumed.push(id);
      triggered.push(id);
      return true;
    }
    return false;
  };

  const mult = MULTIPLIER_VALUES[Math.min(economy.multiplierLevel, 5)];
  let cashDelta = 0;
  let newStreak = streakBefore;

  if (correct) {
    let reward = BASE_REWARD * mult;
    breakdown.push(`Base $${BASE_REWARD} × ${mult} multiplier = $${Math.round(reward)}`);

    newStreak = streakBefore + 1;

    // streak bonus
    if (newStreak >= 2 && economy.streakLevel > 0) {
      let bonus = STREAK_BONUS_VALUES[economy.streakLevel] * (newStreak - 1);
      if (consume("overdrive")) {
        bonus *= 2;
        breakdown.push(`Overdrive ⚡ doubled streak bonus`);
      }
      reward += bonus;
      breakdown.push(`Streak ×${newStreak} bonus = +$${Math.round(bonus)}`);
    }

    // power-ups that boost a correct answer
    if (consume("magnet")) {
      reward += 100;
      breakdown.push(`Cash Magnet 🧲 +$100`);
    }
    if (consume("jackpot")) {
      reward *= 3;
      breakdown.push(`Jackpot 💰 ×3`);
    }
    if (consume("double")) {
      reward *= 2;
      breakdown.push(`Double Jeopardy 🎲 ×2`);
    }

    cashDelta = Math.round(reward);
  } else {
    // Wrong answer
    let penalty = BASE_PENALTY;
    // insurance reduces penalty
    const reduce = INSURANCE_REDUCTION[Math.min(economy.insuranceLevel, 3)];
    let removed = penalty * reduce;

    let shielded = false;
    if (consume("shield")) {
      shielded = true;
      breakdown.push(`Mega Shield 🛡️ absorbed the hit`);
    }
    if (!shielded && consume("insurance1")) {
      removed = penalty;
      breakdown.push(`Instant Insurance 🪙 cancelled the penalty`);
    }

    if (consume("double")) {
      penalty *= 2;
      breakdown.push(`Double Jeopardy 🎲 doubled the penalty`);
    }

    penalty = shielded ? 0 : Math.max(0, penalty - removed);
    if (reduce > 0 && !shielded) {
      breakdown.push(`Insurance reduced penalty by ${Math.round(reduce * 100)}%`);
    }

    cashDelta = -Math.round(penalty);
    breakdown.push(cashDelta === 0 ? `No cash lost` : `Lost $${Math.abs(cashDelta)}`);

    // streak handling
    if (consume("streaksaver")) {
      newStreak = streakBefore;
      breakdown.push(`Streak Saver 🔥 kept your streak`);
    } else {
      newStreak = 0;
    }
  }

  return {
    cashDelta,
    newStreak,
    breakdown,
    consumedPowerups: consumed,
    triggeredEffects: triggered,
  };
}
