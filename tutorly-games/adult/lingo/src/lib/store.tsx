"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ActivityKind } from "@/content/tutolingo";

export interface Quest {
  id: string;
  title: string;
  target: number;
  progress: number;
  rewardXp: number;
  rewardGems: number;
  kind: "xp" | "lessons" | "mistakes" | "words";
  completed: boolean;
}

export interface Mistake {
  id: string;
  exerciseType: ActivityKind | string;
  question: string;
  native?: string;
  correctAnswer: string;
  userAnswer: string;
  createdAt: string;
  resolved: boolean;
}

/** The exercise a learner stopped on, so a lesson can resume mid-way. */
export interface LessonProgress {
  lessonId: number;
  /** 0-based index of the exercise they were working on. */
  index: number;
  total: number;
  updatedAt: number;
}

export interface UserState {
  xp: number;
  gems: number;
  streak: number;
  hearts: number;
  streakFreeze: number;
  lastActive: string; // yyyy-mm-dd
  heartsRefillAt: number;
  completedLessons: number[];
  crowns: Record<number, number>; // lessonId -> 0..5
  wordsLearned: string[]; // terms marked as known
  lessonsToday: number;
  xpToday: number;
  quests: Quest[];
  questDate: string;
  achievements: string[];
  xpHistory: Array<{ date: string; xp: number }>;
  mistakes: Mistake[];
  soundOn: boolean;
  darkMode: boolean;
  fontBig: boolean;
  /** Learner's first language — drives league names and the native-language label. */
  l1: string;
  /** Free-text learner profile used to personalise examples in the AI prompt. */
  learnerInfo: string;
  /** Where the learner stopped inside a lesson (`null` when nothing is open). */
  lessonProgress: LessonProgress | null;
}

const KEY = "tutolingo-state-v1";
export const SRS_KEY = "tutolingo-srs-v1";

function todayStr(d = new Date()) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function defaultQuests(): Quest[] {
  return [
    { id: "q-xp", title: "Earn 50 XP", target: 50, progress: 0, rewardXp: 20, rewardGems: 5, kind: "xp", completed: false },
    { id: "q-lessons", title: "Complete 3 lessons", target: 3, progress: 0, rewardXp: 30, rewardGems: 10, kind: "lessons", completed: false },
    { id: "q-mistakes", title: "Review 10 mistakes", target: 10, progress: 0, rewardXp: 20, rewardGems: 5, kind: "mistakes", completed: false },
  ];
}

function defaultState(): UserState {
  return {
    xp: 0, gems: 120, streak: 1, hearts: 5, streakFreeze: 0,
    lastActive: todayStr(), heartsRefillAt: 0,
    completedLessons: [], crowns: {}, wordsLearned: [],
    lessonsToday: 0, xpToday: 0,
    quests: defaultQuests(), questDate: todayStr(),
    achievements: [], xpHistory: [{ date: todayStr(), xp: 0 }],
    mistakes: [],
    soundOn: true, darkMode: false, fontBig: false,
    l1: "auto", learnerInfo: "",
    lessonProgress: null,
  };
}

function load(): UserState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = { ...defaultState(), ...(JSON.parse(raw) as Partial<UserState>) } as UserState;
    const t = todayStr();
    if (s.questDate !== t) {
      s.quests = defaultQuests();
      s.questDate = t;
      s.lessonsToday = 0;
      s.xpToday = 0;
    }
    if (s.lastActive !== t) {
      const yesterday = todayStr(new Date(Date.now() - 86400000));
      if (s.lastActive !== yesterday && s.streakFreeze > 0) s.streakFreeze -= 1;
      s.hearts = 5;
    }
    const now = Date.now();
    if (s.hearts < 5 && s.heartsRefillAt && now >= s.heartsRefillAt) {
      const refill = 1 + Math.floor((now - s.heartsRefillAt) / (30 * 60 * 1000));
      s.hearts = Math.min(5, s.hearts + refill);
      s.heartsRefillAt = s.hearts >= 5 ? 0 : now + 30 * 60 * 1000;
    }
    return s;
  } catch {
    return defaultState();
  }
}

interface StoreCtx {
  state: UserState;
  update: (fn: (s: UserState) => UserState) => void;
  addXp: (n: number) => void;
  completeLesson: (lessonId: number, perfect: boolean, xpEarned: number) => void;
  /** Remember (or clear, with `null`) the exercise a learner stopped on. */
  saveLessonProgress: (p: LessonProgress | null) => void;
  /** Flush (clear) the saved position without touching anything else. */
  clearLessonProgress: () => void;
  loseHeart: () => void;
  refillHearts: () => boolean;
  buyFreeze: () => boolean;
  claimQuest: (id: string) => void;
  addMistake: (m: Omit<Mistake, "id" | "createdAt" | "resolved">) => void;
  resolveMistake: (id: string) => void;
  clearMistakes: () => void;
  trackMistakeReview: () => void;
  resetAll: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked — progress simply stays in memory */
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.body.classList.toggle("dark", state.darkMode);
    document.body.classList.toggle("font-big", state.fontBig);
  }, [hydrated, state.darkMode, state.fontBig]);

  const api = useMemo<StoreCtx>(
    () => ({
      state,
      update: (fn) => setState((s) => fn({ ...s })),
      addXp: (n) =>
        setState((s) => {
          const t = todayStr();
          let streak = s.streak;
          let lastActive = s.lastActive;
          if (lastActive !== t) {
            const yesterday = todayStr(new Date(Date.now() - 86400000));
            streak = lastActive === yesterday ? s.streak + 1 : s.streakFreeze > 0 ? s.streak : 1;
            lastActive = t;
          }
          const quests = s.quests.map((q) => (q.kind === "xp" ? { ...q, progress: Math.min(q.target, q.progress + n) } : q));
          const hist = [...s.xpHistory];
          const last = hist[hist.length - 1];
          if (last && last.date === t) last.xp += n;
          else hist.push({ date: t, xp: n });

          const ach = new Set(s.achievements);
          const done = s.completedLessons.length;
          if (done >= 1) ach.add("first-lesson");
          if (done >= 10) ach.add("scholar-10");
          if (done >= 50) ach.add("scholar-50");
          if (streak >= 7) ach.add("streak-7");
          if (streak >= 30) ach.add("streak-30");
          if (s.xp + n >= 1000) ach.add("xp-1000");
          if (s.wordsLearned.length >= 100) ach.add("words-100");

          return {
            ...s,
            xp: s.xp + n,
            xpToday: (s.questDate === t ? s.xpToday : 0) + n,
            streak,
            lastActive,
            quests,
            xpHistory: hist.slice(-14),
            achievements: [...ach],
          };
        }),
      /**
       * Remember where the learner stopped.
       *
       * This is called on every exercise change, so it MUST bail out when the
       * stored position would not actually change: returning a fresh state object
       * every time re-created the whole store API, which re-ran the calling effect,
       * which called this again — an infinite render loop that froze the lesson
       * (the exit ✕ and every link stopped responding). Comparing the meaningful
       * fields (not `updatedAt`) keeps it idempotent.
       */
      saveLessonProgress: (p) =>
        setState((s) => {
          const next = p && p.index > 0 ? p : null;
          const cur = s.lessonProgress;
          const same =
            next === null
              ? cur === null
              : !!cur && cur.lessonId === next.lessonId && cur.index === next.index && cur.total === next.total;
          if (same) return s;
          return { ...s, lessonProgress: next };
        }),
      completeLesson: (lessonId, perfect, xpEarned) =>
        setState((s) => {
          const t = todayStr();
          const crowns = { ...s.crowns };
          crowns[lessonId] = Math.min(5, (crowns[lessonId] || 0) + 1);
          const completed = s.completedLessons.includes(lessonId) ? s.completedLessons : [...s.completedLessons, lessonId];
          const quests = s.quests.map((q) => (q.kind === "lessons" ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q));
          const hist = [...s.xpHistory];
          const last = hist[hist.length - 1];
          if (last && last.date === t) last.xp += xpEarned;
          else hist.push({ date: t, xp: xpEarned });
          return {
            ...s,
            crowns,
            completedLessons: completed,
            quests,
            lessonProgress: s.lessonProgress?.lessonId === lessonId ? null : s.lessonProgress,
            gems: s.gems + (perfect ? 10 : 5),
            xp: s.xp + xpEarned,
            xpToday: s.xpToday + xpEarned,
            lessonsToday: s.lessonsToday + 1,
            lastActive: t,
            xpHistory: hist.slice(-14),
          };
        }),
      loseHeart: () =>
        setState((s) => {
          if (s.hearts <= 0) return s;
          const hearts = s.hearts - 1;
          return { ...s, hearts, heartsRefillAt: hearts < 5 && !s.heartsRefillAt ? Date.now() + 30 * 60 * 1000 : s.heartsRefillAt };
        }),
      refillHearts: () => {
        let ok = false;
        setState((s) => {
          if (s.gems < 50 || s.hearts >= 5) return s;
          ok = true;
          return { ...s, gems: s.gems - 50, hearts: 5, heartsRefillAt: 0 };
        });
        return ok;
      },
      buyFreeze: () => {
        let ok = false;
        setState((s) => {
          if (s.gems < 200) return s;
          ok = true;
          return { ...s, gems: s.gems - 200, streakFreeze: s.streakFreeze + 1 };
        });
        return ok;
      },
      claimQuest: (id) =>
        setState((s) => {
          const quest = s.quests.find((q) => q.id === id);
          if (!quest || quest.completed) return s;
          return {
            ...s,
            quests: s.quests.map((q) => (q.id === id ? { ...q, completed: true } : q)),
            xp: s.xp + quest.rewardXp,
            gems: s.gems + quest.rewardGems,
          };
        }),
      addMistake: (m) =>
        setState((s) => {
          const entry: Mistake = {
            ...m,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: new Date().toISOString(),
            resolved: false,
          };
          return { ...s, mistakes: [entry, ...s.mistakes].slice(0, 300) };
        }),
      resolveMistake: (id) => setState((s) => ({ ...s, mistakes: s.mistakes.map((m) => (m.id === id ? { ...m, resolved: true } : m)) })),
      clearMistakes: () => setState((s) => ({ ...s, mistakes: [] })),
      trackMistakeReview: () =>
        setState((s) => ({
          ...s,
          quests: s.quests.map((q) => (q.kind === "mistakes" ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q)),
        })),
      clearLessonProgress: () => setState((s) => (s.lessonProgress === null ? s : { ...s, lessonProgress: null })),
      resetAll: () => {
        setState(defaultState());
        try {
          localStorage.removeItem(KEY);
          localStorage.removeItem(SRS_KEY);
        } catch {
          /* ignore */
        }
      },
    }),
    [state],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
