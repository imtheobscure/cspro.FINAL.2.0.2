"use client";

import type { Lang } from "@/lib/data/types";

/**
 * THE TUTOR'S DATA — now stored on the device, not on a server.
 *
 * LearnLoop used to POST all of this to `/api/students`, `/api/progress`,
 * `/api/plans` and `/api/quiz` (Next route handlers + Postgres). The game ships
 * as static files inside the Game Hub, so there is no server to talk to — and a
 * tutor screen-sharing with a learner should not need one.
 *
 * The DTO shapes are IDENTICAL to the old API on purpose: every screen keeps
 * calling `api.listStudents()`, `api.saveProgress(…)` and so on, so the tutor
 * dashboard, the quiz scoring and the plan saver needed no changes at all. Only
 * the storage moved: localStorage, keyed per game, with a tiny subscribe() so two
 * open tabs (or the game + the teacher screen) stay in sync.
 *
 * Nothing personal leaves the device, and clearing the browser data resets it.
 */

export type StudentDto = {
  id: string;
  name: string;
  avatar: string;
  age: number;
  homeLang: string;
  targetLang: string;
};

export type ProgressDto = {
  wordId: string;
  targetLang: string;
  stars: number;
  seen: number;
  correct: number;
  wrong: number;
};

export type PlanDto = {
  id: string;
  title: string;
  homeLang: string;
  targetLang: string;
  themeId: string;
  unitIds: string[];
  wordIds: string[];
  mode: string;
  createdAt: string;
};

export type ResultDto = {
  id: string;
  mode: string;
  themeId: string;
  targetLang: string;
  score: number;
  total: number;
  seconds: number;
  createdAt: string;
  studentName?: string;
};

type Db = {
  students: StudentDto[];
  /** progress[studentId][targetLang] = ProgressDto[] */
  progress: Record<string, Record<string, ProgressDto[]>>;
  plans: PlanDto[];
  results: ResultDto[];
};

const KEY = "learnloop.tutor.v1";
const EMPTY: Db = { students: [], progress: {}, plans: [], results: [] };

const listeners = new Set<() => void>();

function read(): Db {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Db>;
    return {
      students: Array.isArray(parsed.students) ? parsed.students : [],
      progress: parsed.progress && typeof parsed.progress === "object" ? parsed.progress : {},
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      results: Array.isArray(parsed.results) ? parsed.results : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(db: Db) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* quota or private mode — the game keeps working for this session */
  }
  listeners.forEach((fn) => fn());
}

function mutate(fn: (db: Db) => void): Db {
  const db = read();
  fn(db);
  write(db);
  return db;
}

/** Re-render when the data changes in this tab or another one. */
export function subscribeApi(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** Stable ids without pulling in a uuid dependency. */
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const api = {
  listStudents: async (): Promise<StudentDto[]> => read().students,

  createStudent: async (body: { name: string; avatar: string; age: number; homeLang: Lang; targetLang: Lang }) => {
    const db = mutate((d) => {
      d.students.push({ id: newId(), ...body, homeLang: body.homeLang, targetLang: body.targetLang });
    });
    return db.students;
  },

  getProgress: async (studentId: string, targetLang: Lang): Promise<ProgressDto[]> =>
    read().progress[studentId]?.[targetLang] ?? [],

  saveProgress: async (body: {
    studentId: string;
    wordId: string;
    targetLang: Lang;
    stars?: number;
    seen?: number;
    correct?: number;
    wrong?: number;
  }): Promise<ProgressDto[]> => {
    const db = mutate((d) => {
      const byLang = (d.progress[body.studentId] ??= {});
      const rows = (byLang[body.targetLang] ??= []);
      const row = rows.find((r) => r.wordId === body.wordId);
      if (row) {
        row.stars = Math.max(row.stars, body.stars ?? row.stars);
        row.seen += body.seen ?? 0;
        row.correct += body.correct ?? 0;
        row.wrong += body.wrong ?? 0;
      } else {
        rows.push({
          wordId: body.wordId,
          targetLang: body.targetLang,
          stars: body.stars ?? 0,
          seen: body.seen ?? 0,
          correct: body.correct ?? 0,
          wrong: body.wrong ?? 0,
        });
      }
    });
    return db.progress[body.studentId]?.[body.targetLang] ?? [];
  },

  listPlans: async (): Promise<PlanDto[]> => read().plans.slice().reverse(),

  savePlan: async (body: Omit<PlanDto, "id" | "createdAt">): Promise<PlanDto[]> => {
    const db = mutate((d) => {
      d.plans.push({ id: newId(), createdAt: new Date().toISOString(), ...body });
    });
    return db.plans.slice().reverse();
  },

  deletePlan: async (id: string): Promise<PlanDto[]> => {
    const db = mutate((d) => {
      d.plans = d.plans.filter((p) => p.id !== id);
    });
    return db.plans.slice().reverse();
  },

  listResults: async (): Promise<ResultDto[]> => {
    const db = read();
    // Attach the child's name for the teacher screen (the server used to join it).
    const byId = new Map(db.students.map((s) => [s.id, s.name]));
    return db.results
      .slice()
      .reverse()
      .map((r) => ({ ...r, studentName: (r as ResultDto & { studentId?: string }).studentId ? byId.get((r as ResultDto & { studentId?: string }).studentId as string) : r.studentName }));
  },

  saveResult: async (body: {
    studentId: string;
    mode: string;
    themeId: string;
    targetLang: Lang;
    score: number;
    total: number;
    seconds: number;
  }): Promise<ResultDto[]> => {
    const db = mutate((d) => {
      d.results.push({ id: newId(), createdAt: new Date().toISOString(), ...body });
      d.results = d.results.slice(-200);
    });
    return db.results.slice().reverse();
  },
};

/** Backup / restore — the whole tutor file in one JSON object. */
export function exportTutorData(): string {
  return JSON.stringify({ app: "learnloop", version: 1, ...read() }, null, 2);
}

export function importTutorData(raw: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(raw) as Partial<Db>;
    if (!parsed || typeof parsed !== "object") return { ok: false, error: "That is not a JSON object." };
    write({
      students: Array.isArray(parsed.students) ? parsed.students : [],
      progress: parsed.progress && typeof parsed.progress === "object" ? parsed.progress : {},
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      results: Array.isArray(parsed.results) ? parsed.results : [],
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "parse error" };
  }
}
