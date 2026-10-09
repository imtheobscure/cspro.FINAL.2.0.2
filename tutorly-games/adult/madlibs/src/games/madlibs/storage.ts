/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE — vocabulary bank, spaced repetition, saved sessions
   ───────────────────────────────────────────────────────────────────────────
   Two things outlive a single story:
     • the WORDS the class produced — collected into a personal bank, reviewed
       on a small spaced-repetition schedule, and exportable for homework;
     • the GAME ITSELF — so a refresh, an accidental close or a lesson that runs
       out of time does not throw the filled-in words away. The splash offers
       "Continue saved game" from the same snapshot.

   Everything is best-effort: private-mode browsers throw on localStorage, and a
   game must never break because of that.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { DifficultyState } from "./grammar";
import type { GamePhase, Player, StoryBeat, Template } from "./types";

const VOCAB_KEY = "tutorly-madlibs-vocab-v1";
const SESSION_KEY = "tutorly-madlibs-session-v1";

const safeGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeSet = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* private mode, quota, disabled storage — the game still plays */
  }
};

/* ── vocabulary bank ─────────────────────────────────────────────────────── */

export interface VocabWord {
  id: string;
  word: string;
  type: string;
  templateId: string;
  templateTitle: string;
  createdAt: number;
  lastSeenAt: number;
  reviews: number;
  correct: number;
  wrong: number;
  /** index into REVIEW_INTERVALS — how far up the schedule this word has climbed */
  strength: number;
  dueAt: number;
}

export interface VocabInput {
  word: string;
  type: string;
  templateId: string;
  templateTitle: string;
}

/** Days between reviews: same-day, then 1, 3, 7, 16, 35. */
export const REVIEW_INTERVALS_DAYS = [0, 1, 3, 7, 16, 35];
const DAY = 24 * 60 * 60 * 1000;

const norm = (w: string) => w.trim().toLowerCase();
const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};
export const vocabId = (word: string) => `w-${hash(norm(word))}`;

export function loadVocab(): VocabWord[] {
  const raw = safeGet(VOCAB_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is VocabWord => !!v && typeof (v as VocabWord).word === "string");
  } catch {
    return [];
  }
}

export function saveVocab(words: VocabWord[]) {
  safeSet(VOCAB_KEY, JSON.stringify(words.slice(0, 400)));
}

/**
 * Merge this story's words into the bank. A word already in the bank keeps its
 * schedule and just records that it was seen again — the reuse bonus the class
 * sees in-game comes from here.
 */
export function collectWords(
  bank: VocabWord[],
  inputs: VocabInput[],
  now = Date.now(),
): { bank: VocabWord[]; added: VocabWord[]; reused: VocabWord[] } {
  const next = [...bank];
  const added: VocabWord[] = [];
  const reused: VocabWord[] = [];

  inputs.forEach((input) => {
    const word = input.word.trim();
    if (!word) return;
    const id = vocabId(word);
    const existing = next.findIndex((v) => v.id === id);
    if (existing >= 0) {
      const prev = next[existing];
      next[existing] = { ...prev, lastSeenAt: now, reviews: prev.reviews, word: prev.word };
      reused.push(next[existing]);
      return;
    }
    const entry: VocabWord = {
      id,
      word,
      type: input.type,
      templateId: input.templateId,
      templateTitle: input.templateTitle,
      createdAt: now,
      lastSeenAt: now,
      reviews: 0,
      correct: 0,
      wrong: 0,
      strength: 0,
      dueAt: now + REVIEW_INTERVALS_DAYS[0] * DAY,
    };
    next.push(entry);
    added.push(entry);
  });

  return { bank: next, added, reused };
}

/** Grade one review: recall climbs the schedule, a miss resets it to day zero. */
export function reviewWord(bank: VocabWord[], id: string, recalled: boolean, now = Date.now()): VocabWord[] {
  return bank.map((v) => {
    if (v.id !== id) return v;
    const strength = recalled ? Math.min(REVIEW_INTERVALS_DAYS.length - 1, v.strength + 1) : 0;
    return {
      ...v,
      strength,
      reviews: v.reviews + 1,
      correct: v.correct + (recalled ? 1 : 0),
      wrong: v.wrong + (recalled ? 0 : 1),
      dueAt: now + REVIEW_INTERVALS_DAYS[strength] * DAY,
    };
  });
}

export function dueVocab(bank: VocabWord[], now = Date.now(), cap = 12): VocabWord[] {
  return bank
    .filter((v) => v.dueAt <= now)
    .sort((a, b) => a.strength - b.strength || a.dueAt - b.dueAt)
    .slice(0, cap);
}

export function masteredCount(bank: VocabWord[]): number {
  return bank.filter((v) => v.strength >= 4).length;
}

export function vocabCsv(bank: VocabWord[]): string {
  const head = "word,type,story,reviews,correct,wrong,strength,first_seen";
  const rows = bank.map((v) =>
    [v.word, v.type, v.templateTitle, v.reviews, v.correct, v.wrong, v.strength, new Date(v.createdAt).toISOString().slice(0, 10)]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [head, ...rows].join("\n");
}

/* ── saved session ───────────────────────────────────────────────────────── */

export interface SavedSession {
  version: 1;
  savedAt: number;
  phase: GamePhase;
  template: Template | null;
  answers: Record<string, string>;
  beats: StoryBeat[];
  scores: Record<string, number>;
  currentPlayer: number;
  sessionCompleted: number;
  reflections: string[];
  players: Player[];
  difficulty: DifficultyState;
  topic: string;
  level: string;
  location: string;
}

/** Only the mid-game phases are worth resuming; the picker is not. */
const RESUMABLE: SavedSession["phase"][] = ["FILL", "REVEAL_REEL", "STORY", "BRANCH", "SWIPE_ENDING", "PEER_FILL", "REVIEW", "RECAP"];

export function saveSession(session: SavedSession | null) {
  if (!session || !RESUMABLE.includes(session.phase)) {
    safeSet(SESSION_KEY, null);
    return;
  }
  // A picker-only snapshot has nothing to save.
  const hasWords = Object.keys(session.answers ?? {}).length > 0 || (session.beats ?? []).length > 0;
  safeSet(SESSION_KEY, hasWords ? JSON.stringify(session) : null);
}

export function loadSession(): SavedSession | null {
  const raw = safeGet(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedSession;
    if (parsed?.version !== 1 || !parsed.template) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  safeSet(SESSION_KEY, null);
}
