/* ═══════════════════════════════════════════════════════════════════════════
   GRAMMAR COACH + ADAPTIVE DIFFICULTY
   ───────────────────────────────────────────────────────────────────────────
   The old scorer added points for a word that happened to look right and said
   nothing when it did not. This one reads the blank's requested form (the label
   and the type), tells the learner WHAT the blank wants and WHY their word does
   or does not fit, and turns their running accuracy into a challenge level that
   hides hints or pushes them to a harder band.

   Design rule: coach, never block. A mismatched word is still playable — the
   class is mid-story — but it scores nothing and the note explains the fix.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Blank } from "./types";

/** past forms that do not end in -ed */
const IRREGULAR_PAST = new Set([
  "went", "saw", "came", "took", "made", "did", "had", "was", "were", "ate", "bought", "caught",
  "felt", "found", "got", "knew", "left", "lost", "met", "paid", "ran", "said", "sat", "spoke",
  "told", "thought", "wrote", "gave", "drank", "sang", "swam", "flew", "threw", "grew", "began",
  "broke", "chose", "drove", "fell", "fought", "held", "hid", "hit", "kept", "led", "read", "rode",
  "rose", "slept", "spent", "stood", "stole", "taught", "understood", "woke", "wore", "won",
]);

/** adverbs that do not end in -ly */
const FLAT_ADVERBS = new Set([
  "fast", "hard", "well", "often", "soon", "very", "yesterday", "today", "tomorrow", "never",
  "always", "sometimes", "here", "there", "late", "early", "straight", "wrong", "right", "away",
  "back", "down", "up", "in", "out", "far", "near", "twice", "once",
]);

/** adjectives that end in -ly (so the -ly check does not misfire on them) */
const LY_ADJECTIVES = new Set([
  "friendly", "lovely", "ugly", "silly", "lonely", "likely", "daily", "weekly", "monthly",
  "yearly", "elderly", "costly", "deadly", "orderly", "timely", "lovely", "unfriendly", "unlikely",
]);

const NUMBERS = new Set([
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "twenty", "thirty", "forty", "fifty", "hundred", "thousand", "million", "billion", "zillion",
  "bajillion", "countless", "several", "many", "few", "couple", "dozen", "half", "zero", "none",
  "infinity", "enough",
]);

const COLORS = new Set([
  "red", "blue", "green", "yellow", "purple", "pink", "orange", "brown", "black", "white", "grey",
  "gray", "gold", "golden", "silver", "turquoise", "violet", "indigo", "crimson", "scarlet",
  "emerald", "amber", "beige", "mauve", "chartreuse", "teal", "cyan", "magenta", "maroon", "navy",
  "lime", "peach", "mint", "lavender", "ivory", "charcoal", "neon", "pastel", "rainbow",
]);

const EXCLAMATIONS = new Set([
  "wow", "oh", "hey", "oops", "yikes", "ugh", "yay", "hooray", "alas", "gosh", "phew", "darn",
  "shoot", "eek", "hmm", "aha", "oi", "whoa", "hurray", "blimey", "crikey", "goodness", "god",
  "lord", "man", "boo", "bravo", "bingo", "hush", "bang", "bam", "pow", "zoom", "splat",
]);

const DETERMINERS = new Set([
  "a", "an", "the", "my", "your", "his", "her", "its", "our", "their", "this", "that", "these",
  "those", "some", "any", "no", "every", "each",
]);

const isWordy = (raw: string) => /\s/.test(raw.trim());

export interface CoachNote {
  /** true when the word matches the form the blank asked for */
  ok: boolean;
  /** how it reads to the class: a clean hit, a near miss, or a form to fix */
  level: "match" | "close" | "fix";
  /** one short line the learner can act on */
  message: string;
  /** 0-6 points for using the right form */
  bonus: number;
  /** short machine tags for the score toast, e.g. "+edForm" */
  tags: string[];
}

const MATCH = (message: string, bonus: number, ...tags: string[]): CoachNote => ({
  ok: true,
  level: "match",
  message,
  bonus,
  tags,
});
const CLOSE = (message: string, ...tags: string[]): CoachNote => ({
  ok: true,
  level: "close",
  message,
  bonus: 2,
  tags,
});
const FIX = (message: string, ...tags: string[]): CoachNote => ({
  ok: false,
  level: "fix",
  message,
  bonus: 0,
  tags,
});

/**
 * Read one answer against the blank it was given for.
 * The liberal path is deliberate: an unexpected but usable word is "close",
 * never a hard failure, so a student's own funny idea still lands.
 */
export function coachAnswer(blank: Blank, rawInput: string): CoachNote {
  const raw = rawInput.trim();
  const w = raw.toLowerCase();
  const type = blank.type.toLowerCase();
  const label = blank.label.toLowerCase();
  const wordy = isWordy(raw);

  if (!w) return FIX("Type a word to claim this blank.", "empty");

  // ── numbers ─────────────────────────────────────────────────────────────
  if (type === "number") {
    if (/^-?[\d.,]+$/.test(w) || NUMBERS.has(w) || /\d/.test(w)) {
      return MATCH("That's a number — the maths of this story checks out.", 4, "+number");
    }
    return FIX('This blank wants a number ("47", "three", "a million").', "-notNumber");
  }

  // ── adverbs ─────────────────────────────────────────────────────────────
  if (type === "adverb") {
    if (w.endsWith("ly") || FLAT_ADVERBS.has(w.split(" ")[0]) || wordy) {
      return MATCH("-ly is the adverb ending — that's the job done.", 4, "+lyAdverb");
    }
    return FIX('Adverbs usually end in -ly ("slowly", "chaotically") or are flat ("fast", "well").', "-notAdverb");
  }

  // ── adjectives ──────────────────────────────────────────────────────────
  if (type === "adjective") {
    if (w.endsWith("ly") && !LY_ADJECTIVES.has(w)) {
      return FIX('That ends in -ly, so it is an adverb. Use a describing word ("suspicious", "enormous").', "-adverbForAdjective");
    }
    if (DETERMINERS.has(w)) return FIX("That's a determiner, not a describing word.", "-determiner");
    if (w.endsWith("ed") || w.endsWith("ing")) {
      return CLOSE("That's a participle doing an adjective's job — it fits, but keep it describing.", "+participleAdjective");
    }
    return MATCH("Describing word — exactly what the blank asked for.", 4, "+adjective");
  }

  // ── verbs ───────────────────────────────────────────────────────────────
  if (type === "verb") {
    const wantsIng = label.includes("(-ing)") || label.includes("ing form") || label.includes("gerund");
    const wantsPast = label.includes("past") || label.includes("ed form");

    if (wantsIng) {
      if (w.endsWith("ing")) return MATCH("Right form: verb + -ing, running the action along.", 5, "+ingForm");
      return FIX(`This blank needs the -ing form ("${w}ing").`, "-noIng");
    }
    if (wantsPast) {
      if (w.endsWith("ed") || IRREGULAR_PAST.has(w)) {
        return MATCH("Past form — the timeline stays straight.", 5, "+pastForm");
      }
      return FIX(`This blank needs a past form ("${w}ed") or an irregular one ("went", "saw").`, "-notPast");
    }
    // a plain "Verb" blank wants the base form
    if (w.endsWith("ing")) return FIX("This blank wants the base verb without -ing.", "-ingForBase");
    if (w.endsWith("ed")) return FIX("This blank wants the base verb, not the past form.", "-edForBase");
    if (DETERMINERS.has(w)) return FIX("That's a determiner — this blank wants an action.", "-determiner");
    return MATCH("Action word — the story moves because of it.", 3, "+verb");
  }

  // ── exclamations ────────────────────────────────────────────────────────
  if (type === "exclamation") {
    if (raw.endsWith("!") || EXCLAMATIONS.has(w) || wordy) {
      return MATCH("That reads like a shout — perfect for this blank.", 4, "+exclamation");
    }
    return CLOSE("Add the drama: an exclamation mark makes it land.", "+nearExclamation");
  }

  // ── colours ─────────────────────────────────────────────────────────────
  if (type === "color") {
    if (COLORS.has(w) || /(ish|y|ed)$/.test(w) || wordy) return MATCH("Colour noted — the scene is now painted.", 3, "+color");
    return CLOSE("That may not read as a colour, but paint the scene you want.", "+maybeColor");
  }

  // ── nouns, people, places, things ───────────────────────────────────────
  if (w.endsWith("ly") && !wordy) return FIX("-ly makes that an adverb; this blank wants a thing or a person.", "-adverbForNoun");
  if (DETERMINERS.has(w)) return FIX("That's a determiner — name the thing itself.", "-determiner");
  if (type === "person" && /^[A-Z]/.test(raw.trim())) return MATCH("A named character! Names make stories stick.", 4, "+properNoun");
  if (type === "noun" || type === "person" || type === "place" || type === "animal" || type === "food") {
    return MATCH("Naming word — the story has something to hold on to.", 3, `+${type || "noun"}`);
  }
  if (type === "emotion") {
    return MATCH("Feeling logged — that drives the next scene.", 3, "+emotion");
  }

  // unknown type: accept and say so, never invent a rule
  return CLOSE("Custom blank — any vivid word works here.", "+custom");
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADAPTIVE DIFFICULTY
   Accuracy per blank type decides a challenge level:
     0  assisted — every suggestion is shown, coaching is generous
     1  standard — five suggestions (the original behaviour)
     2  expert   — suggestions hidden, only the coach talks
   Enough answers must land before the level moves, so one bad word cannot
   yank the whole lesson up or down.
   ═══════════════════════════════════════════════════════════════════════════ */

export type ChallengeLevel = 0 | 1 | 2;

export interface DifficultyState {
  perType: Record<string, { hits: number; misses: number }>;
  challenge: ChallengeLevel;
  answered: number;
}

export const initialDifficulty: DifficultyState = { perType: {}, challenge: 1, answered: 0 };

export function recordAnswer(state: DifficultyState, type: string, ok: boolean): DifficultyState {
  const key = (type || "noun").toLowerCase();
  const bucket = state.perType[key] ?? { hits: 0, misses: 0 };
  const perType = {
    ...state.perType,
    [key]: { hits: bucket.hits + (ok ? 1 : 0), misses: bucket.misses + (ok ? 0 : 1) },
  };
  const answered = state.answered + 1;

  let hits = 0;
  let misses = 0;
  Object.values(perType).forEach((b) => {
    hits += b.hits;
    misses += b.misses;
  });
  const accuracy = hits + misses > 0 ? hits / (hits + misses) : 0.5;

  let challenge = state.challenge;
  if (answered >= 6) {
    if (accuracy >= 0.85) challenge = 2;
    else if (accuracy >= 0.6) challenge = 1;
    else challenge = 0;
  }
  return { perType, challenge, answered };
}

/** Expert mode hides the suggestion chips so recall is real. */
export const hidesSuggestions = (state: DifficultyState) => state.challenge === 2;

/** Assisted mode offers twice the suggestions. */
export const suggestionLimit = (state: DifficultyState) => (state.challenge === 0 ? 8 : state.challenge === 2 ? 0 : 5);

export function difficultyLabel(state: DifficultyState): string {
  if (state.challenge === 2) return "Expert · hints off";
  if (state.challenge === 0) return "Assisted · extra hints";
  return "Standard";
}

/**
 * Push the next story one CEFR band up or down from what the learner produced.
 * Cold answers drop a band so confidence comes back; a hot streak raises it.
 */
export function adaptLevel(state: DifficultyState, current: string): string {
  const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const idx = order.indexOf(current.toUpperCase());
  if (idx < 0) return current;
  let hits = 0;
  let misses = 0;
  Object.values(state.perType).forEach((b) => {
    hits += b.hits;
    misses += b.misses;
  });
  const acc = hits + misses > 0 ? hits / (hits + misses) : 0.5;
  if (state.answered >= 6 && acc >= 0.85 && idx < order.length - 1) return order[idx + 1];
  if (state.answered >= 6 && acc < 0.5 && idx > 0) return order[idx - 1];
  return current;
}

/** One line for the teacher's recap, naming the blanks that keep slipping. */
export function weakSpotSummary(state: DifficultyState): string {
  const weak = Object.entries(state.perType)
    .filter(([, b]) => b.misses > b.hits)
    .sort((a, b) => b[1].misses - a[1].misses)
    .slice(0, 3)
    .map(([type]) => type);
  if (!weak.length) return "No recurring form errors — the class is holding its level.";
  return `Review these forms next lesson: ${weak.join(", ")}.`;
}
