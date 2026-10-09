import type { Lang } from "@/lib/data/types";

/**
 * LEARNERS, PLAYLISTS & PROGRESS — kept in this browser.
 *
 * ToyBox shipped as a Next.js server app: `src/app/api/*` stored learners,
 * saved playlists, quiz results and studio completions in PostgreSQL. It is now
 * a STATIC export published at `/tutorly-games/kids/toybox/` (see
 * `next.config.ts`), so there is no `/api` to call and no database to call it
 * on. This module keeps the very same public surface — every function here has
 * the name, parameters and resolved value the server routes had — but answers
 * from `localStorage`, so none of the screens that use it needed rewriting.
 *
 * What that changes for the tutor, honestly:
 *   · learners, saved playlists and results live on THIS device and this
 *     browser only. They survive a reload, but not a different computer, a
 *     different browser, or clearing site data.
 *   · the server version was already documented as a single trusted tutor
 *     workspace rather than a multi-tenant school platform, and the same advice
 *     applies with even more force here: use learner nicknames, never names
 *     that identify a child.
 *   · `mode`/`studio` writes stay local, which is why the screens that used to
 *     say "cloud sync will retry" now say "saved on this device".
 *
 * The store is versioned (`toybox.tutor.v1`) and every read is defensive: a
 * corrupt or half-written entry yields an empty list instead of a crash.
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

/** Studio completions (the playroom's own "little moments"). */
export type StudioSessionDto = {
  id: string;
  workspaceId: string;
  studentId: string | null;
  gameId: string;
  lessonId: string;
  language: Lang;
  seconds: number;
  createdAt: string;
  synced: boolean;
};

const KEY = "toybox.tutor.v1";

type Store = {
  students: StudentDto[];
  progress: ProgressDto[];
  plans: PlanDto[];
  results: ResultDto[];
  sessions: StudioSessionDto[];
};

const EMPTY: Store = { students: [], progress: [], plans: [], results: [], sessions: [] };

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function read(): Store {
  if (!isBrowser()) return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      students: Array.isArray(parsed.students) ? parsed.students : [],
      progress: Array.isArray(parsed.progress) ? parsed.progress : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      results: Array.isArray(parsed.results) ? parsed.results : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function write(next: Store): Store {
  if (isBrowser()) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* Private mode or a full quota: the caller keeps its in-memory copy. */
    }
  }
  return next;
}

function id() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Resolve like the old `fetch` did — one microtask later, never throwing. */
function json<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

export const api = {
  /* ------------------------------- learners ------------------------------- */
  listStudents: () => json<StudentDto[]>(read().students),

  createStudent: (body: { name: string; avatar: string; age: number; homeLang: Lang; targetLang: Lang }) => {
    const store = read();
    const student: StudentDto = {
      id: id(),
      name: body.name,
      avatar: body.avatar,
      age: body.age,
      homeLang: body.homeLang,
      targetLang: body.targetLang,
    };
    write({ ...store, students: [...store.students, student] });
    return json<StudentDto[]>(read().students);
  },

  deleteStudent: (studentId: string) => {
    const store = read();
    write({
      ...store,
      students: store.students.filter((s) => s.id !== studentId),
      sessions: store.sessions.filter((s) => s.studentId !== studentId),
    });
    return json<StudentDto[]>(read().students);
  },

  /* ------------------------------- progress ------------------------------- */
  getProgress: (studentId: string, targetLang: Lang) => {
    void studentId;
    const rows = read().progress.filter((p) => p.targetLang === targetLang);
    return json<ProgressDto[]>(rows);
  },

  saveProgress: (body: {
    studentId: string;
    wordId: string;
    targetLang: Lang;
    stars?: number;
    seen?: number;
    correct?: number;
    wrong?: number;
  }) => {
    const store = read();
    const existing = store.progress.find((p) => p.wordId === body.wordId && p.targetLang === body.targetLang);
    const merged: ProgressDto = {
      wordId: body.wordId,
      targetLang: body.targetLang,
      stars: Math.max(existing?.stars ?? 0, body.stars ?? 0),
      seen: (existing?.seen ?? 0) + (body.seen ?? 0),
      correct: (existing?.correct ?? 0) + (body.correct ?? 0),
      wrong: (existing?.wrong ?? 0) + (body.wrong ?? 0),
    };
    const progress = existing
      ? store.progress.map((p) => (p.wordId === merged.wordId && p.targetLang === merged.targetLang ? merged : p))
      : [...store.progress, merged];
    write({ ...store, progress });
    return json<ProgressDto[]>(progress);
  },

  /* ------------------------------- playlists ------------------------------ */
  listPlans: () => json<PlanDto[]>(read().plans),

  savePlan: (body: Omit<PlanDto, "id" | "createdAt">) => {
    const store = read();
    const plan: PlanDto = { ...body, id: id(), createdAt: new Date().toISOString() };
    write({ ...store, plans: [plan, ...store.plans] });
    return json<PlanDto[]>(read().plans);
  },

  deletePlan: (planId: string) => {
    const store = read();
    write({ ...store, plans: store.plans.filter((p) => p.id !== planId) });
    return json<PlanDto[]>(read().plans);
  },

  /* -------------------------- quiz & studio results ----------------------- */
  listResults: () => json<ResultDto[]>(read().results),

  saveResult: (body: {
    studentId: string;
    mode: string;
    themeId: string;
    targetLang: Lang;
    score: number;
    total: number;
    seconds: number;
  }) => {
    const store = read();
    const learner = store.students.find((s) => s.id === body.studentId);
    const result: ResultDto = {
      id: id(),
      mode: body.mode,
      themeId: body.themeId,
      targetLang: body.targetLang,
      score: body.score,
      total: body.total,
      seconds: body.seconds,
      createdAt: new Date().toISOString(),
      studentName: learner?.name,
    };
    write({ ...store, results: [result, ...store.results].slice(0, 500) });
    return json<ResultDto[]>(read().results);
  },

  /* --------------------- studio completions (playroom) -------------------- */
  listStudioSessions: (workspaceId: string) =>
    json<StudioSessionDto[]>(read().sessions.filter((s) => s.workspaceId === workspaceId)),

  saveStudioSession: (row: StudioSessionDto) => {
    const store = read();
    const sessions = store.sessions.some((s) => s.id === row.id)
      ? store.sessions.map((s) => (s.id === row.id ? { ...s, synced: true } : s))
      : [{ ...row, synced: true }, ...store.sessions];
    write({ ...store, sessions: sessions.slice(0, 1000) });
    return json<StudioSessionDto[]>(read().sessions);
  },

  clearStudioSessions: (workspaceId: string) => {
    const store = read();
    write({ ...store, sessions: store.sessions.filter((s) => s.workspaceId !== workspaceId) });
    return json<StudioSessionDto[]>(read().sessions);
  },
};
