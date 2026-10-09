"use client";

import type { LangCode } from "@/data/types";
import type { StudentRow } from "@/lib/studio";

/**
 * THE ROSTER, ON THE DEVICE.
 *
 * BiliBuddies used to keep children in Postgres through `/api/students` and
 * `/api/progress`. It now ships as static files in the Game Hub, so the roster,
 * the stars and the lesson log live in localStorage instead: a tutor screen-
 * sharing a lesson never needs an account, a server or a database, and nothing
 * about a child leaves the laptop.
 */

const K_STUDENTS = "bilibuddies.students.v1";
const K_PROGRESS = "bilibuddies.progress.v1";
const K_LESSONS = "bilibuddies.lessons.v1";

const SEED: StudentRow[] = [
  { id: 1, name: "Mia", avatar: "🦊", color: "#EFB03F", homeLang: "en", targetLang: "zh" },
  { id: 2, name: "Leo", avatar: "🐼", color: "#4FB89B", homeLang: "zh", targetLang: "en" },
  { id: 3, name: "Ada", avatar: "🦄", color: "#A98BE0", homeLang: "tr", targetLang: "fr" },
];

const GUEST: StudentRow = { id: -1, name: "Guest", avatar: "🐣", color: "#FFC145", homeLang: "en", targetLang: "en" };

const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — keep playing for this session */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeStudio(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith("bilibuddies.")) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function listStudents(): StudentRow[] {
  const rows = read<StudentRow[]>(K_STUDENTS, []);
  if (Array.isArray(rows) && rows.length) return rows;
  // First run: the friendly demo children, so the tutor can play immediately.
  write(K_STUDENTS, SEED);
  return SEED;
}

export function addStudent(input: { name: string; avatar: string; color: string; homeLang: LangCode; targetLang: LangCode }): StudentRow {
  const rows = listStudents();
  const next: StudentRow = {
    id: Math.max(0, ...rows.map((r) => r.id)) + 1,
    name: input.name,
    avatar: input.avatar,
    color: input.color,
    homeLang: input.homeLang,
    targetLang: input.targetLang,
  };
  write(K_STUDENTS, [...rows, next]);
  return next;
}

/** The only learner at the table when nobody is signed in. */
export function guest(): StudentRow {
  return GUEST;
}

type ProgressRow = { studentId: number; wordId: string; lang: string; correct: number; stars: number };

export function addStars(studentId: number, wordId: string, lang: string, stars = 1) {
  const rows = read<ProgressRow[]>(K_PROGRESS, []);
  const found = rows.find((r) => r.studentId === studentId && r.wordId === wordId && r.lang === lang);
  if (found) {
    found.correct += 1;
    found.stars += stars;
  } else {
    rows.push({ studentId, wordId, lang, correct: 1, stars });
  }
  write(K_PROGRESS, rows);
}

export function progressFor(studentId: number, lang: string): ProgressRow[] {
  return read<ProgressRow[]>(K_PROGRESS, []).filter((r) => r.studentId === studentId && r.lang === lang);
}

export type LessonRow = {
  studentId: number;
  themeId: string;
  subthemeId: string;
  modeId: string;
  targetLang: string;
  supportLang: string | null;
  stars: number;
  seconds: number;
  at: string;
};

export function logLesson(row: Omit<LessonRow, "at">) {
  const rows = read<LessonRow[]>(K_LESSONS, []);
  rows.push({ ...row, at: new Date().toISOString() });
  write(K_LESSONS, rows.slice(-300));
}

export function listLessons(): LessonRow[] {
  return read<LessonRow[]>(K_LESSONS, []).slice().reverse();
}

export function stats() {
  const progress = read<ProgressRow[]>(K_PROGRESS, []);
  const lessons = read<LessonRow[]>(K_LESSONS, []);
  return {
    stars: progress.reduce((n, r) => n + r.stars, 0),
    lessons: lessons.length,
  };
}

export function resetStudioData() {
  write(K_STUDENTS, SEED);
  write(K_PROGRESS, []);
  write(K_LESSONS, []);
}
