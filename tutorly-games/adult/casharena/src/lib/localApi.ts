"use client";
/**
 * The arena's library and score history, in the browser.
 *
 * Cash Arena ships as a **static export** (see `next.config.ts`), which is what
 * lets the Game Hub open it from a plain folder URL with no server and no
 * database — the same move Interview and Console made. A static export cannot
 * have route handlers, so the five `/api/…` endpoints are gone and everything
 * they did happens here instead:
 *
 *   · the two built-in quizzes are the seed, exactly as the old `ensureSeed` did;
 *   · a quiz the tutor builds in Test Maker is kept in `localStorage`, so their
 *     library survives a reload and travels with their browser;
 *   · final scores are kept per browser, which is what the Review Suite reads.
 *
 * What is *not* here, and never was the browser's job: the live game. Answers
 * travel directly between the tutor's board and the learners' phones over
 * WebRTC, so a room needs no storage at all — only the free PeerJS signalling
 * service to introduce the two ends.
 */
import { SAMPLE_QUIZ, SAMPLE_QUIZ_2 } from "./sampleQuiz";
import type { Quiz } from "./types";

export interface QuizRow extends Quiz {
  id: number;
  subject: string;
  description: string;
  createdAt: string;
}

export interface ResultRow {
  id: number;
  gameCode: string;
  quizId: number;
  playerName: string;
  cash: number;
  correct: number;
  wrong: number;
  wrongQuestionIds: string[];
  createdAt: string;
}

const LIBRARY_KEY = "tutorly:casharena:library:v1";
const RESULTS_KEY = "tutorly:casharena:results:v1";
/** Results are a teaching aid, not an archive: keep the last few hundred. */
const MAX_RESULTS = 400;

/* ─────────────────────────── low level ─────────────────────────── */

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    // A corrupt entry must not take the app down — start from empty instead.
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode, or the quota is full. The game in front of the class is not
    // worth interrupting for this, so it stays silent and the session continues.
  }
}

function seedLibrary(): QuizRow[] {
  const at = new Date(0).toISOString();
  return [
    { ...SAMPLE_QUIZ, id: 1, subject: SAMPLE_QUIZ.subject || "General", description: SAMPLE_QUIZ.description || "", createdAt: at },
    { ...SAMPLE_QUIZ_2, id: 2, subject: SAMPLE_QUIZ_2.subject || "General", description: SAMPLE_QUIZ_2.description || "", createdAt: at },
  ];
}

/* ───────────────────────────── quizzes ───────────────────────────── */

/** Every quiz the tutor can host: the two built-ins plus their own. */
export function listQuizzes(): QuizRow[] {
  const mine = read<QuizRow[]>(LIBRARY_KEY, []);
  if (!Array.isArray(mine) || mine.length === 0) return seedLibrary();
  return [...mine, ...seedLibrary()];
}

export function getQuiz(id: number): QuizRow | null {
  return listQuizzes().find((q) => q.id === id) || null;
}

/**
 * Save a quiz built in Test Maker. Ids above 1000 so they can never collide with
 * the two seeded ids, which keeps a stored library valid across a reinstall.
 */
export function saveQuiz(quiz: Quiz): QuizRow {
  const mine = read<QuizRow[]>(LIBRARY_KEY, []);
  const row: QuizRow = {
    ...quiz,
    id: 1000 + mine.length + 1,
    subject: quiz.subject || "General",
    description: quiz.description || "",
    createdAt: new Date().toISOString(),
  };
  write(LIBRARY_KEY, [row, ...mine]);
  return row;
}

export function deleteQuiz(id: number): void {
  const mine = read<QuizRow[]>(LIBRARY_KEY, []);
  write(
    LIBRARY_KEY,
    mine.filter((q) => q.id !== id)
  );
}

/** Only the tutor's own quizzes are removable — the seeded pair is not data. */
export function isSeeded(id: number): boolean {
  return id < 1000;
}

/* ───────────────────────────── results ───────────────────────────── */

export function addResults(rows: Omit<ResultRow, "id" | "createdAt">[]): void {
  if (!rows.length) return;
  const existing = read<ResultRow[]>(RESULTS_KEY, []);
  const at = new Date().toISOString();
  const fresh = rows.map((r, i) => ({ ...r, id: Date.now() + i, createdAt: at } as ResultRow));
  write(RESULTS_KEY, [...fresh, ...existing].slice(0, MAX_RESULTS));
}

export function listResults(code?: string | null): ResultRow[] {
  const all = read<ResultRow[]>(RESULTS_KEY, []);
  const wanted = code ? code.toUpperCase() : null;
  const filtered = wanted ? all.filter((r) => r.gameCode === wanted) : all;
  // Newest first: the Review Suite labels this list "Recent results" and prints
  // the timestamp of each row, so recency is the useful order here.
  return [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

/** The Review Suite's "most missed" tally, across every game this browser ran. */
export function missedCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  listResults().forEach((r) => (r.wrongQuestionIds || []).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
  return counts;
}

/** Forget everything kept locally — offered next to the library, and useful in class. */
export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RESULTS_KEY);
  } catch {
    /* nothing to forget */
  }
}
