/**
 * Lesson state (Zustand).
 *
 * Holds what the learner has DONE: which activities are complete, the XP and
 * streak, the journal, and which activity overlay is open right now. Persisted
 * per episode so closing the tab mid-lesson does not lose work.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Activity, Lesson } from "../types";
import { levelFromXp, scoreAttempt, type Evaluation, type ScoreResult } from "../lib/lesson/engine";

export interface JournalEntry {
  id: string;
  activityId: string;
  prompt: string;
  answer: string;
  at: number;
}

export interface AttemptRecord {
  activityId: string;
  attempts: number;
  lastCorrect: boolean;
  points: number;
  at: number;
}

interface LessonState {
  lesson: Lesson | null;
  episodeId: string | null;
  completed: string[];
  attempts: Record<string, AttemptRecord>;
  xp: number;
  streak: number;
  bestStreak: number;
  badges: string[];
  journal: JournalEntry[];
  /** The activity overlay currently open (null = watching). */
  activeActivityId: string | null;
  /** Whether re-opening an already completed activity is allowed (review mode). */
  reviewing: boolean;
  lastResult: { activityId: string; evaluation: Evaluation; score: ScoreResult; attempts: number } | null;

  setLesson: (lesson: Lesson | null, episodeId: string | null) => void;
  openActivity: (activityId: string, options?: { review?: boolean }) => void;
  closeActivity: () => void;
  recordAttempt: (input: { activity: Activity; evaluation: Evaluation; secondsTaken: number }) => { result: ScoreResult; attempts: number; correct: boolean };
  addJournal: (entry: Omit<JournalEntry, "id" | "at">) => void;
  awardBadge: (badgeId: string) => void;
  hydrateFrom: (state: { completed?: string[]; xp?: number; streak?: number; journal?: JournalEntry[] }) => void;
  reset: () => void;
}

const PERSIST_KEY = "tutoflix-lesson";

export const useLessonStore = create<LessonState>()(
  persist(
    (set, get) => ({
      lesson: null,
      episodeId: null,
      completed: [],
      attempts: {},
      xp: 0,
      streak: 0,
      bestStreak: 0,
      badges: [],
      journal: [],
      activeActivityId: null,
      reviewing: false,
      lastResult: null,

      setLesson: (lesson, episodeId) => set({ lesson, episodeId, activeActivityId: null, reviewing: false, lastResult: null }),

      openActivity: (activityId, options) => set({ activeActivityId: activityId, reviewing: !!options?.review }),

      closeActivity: () => set({ activeActivityId: null, reviewing: false }),

      recordAttempt: ({ activity, evaluation, secondsTaken }) => {
        const state = get();
        if (state.completed.includes(activity.id) && !state.reviewing) {
          const previous = state.attempts[activity.id];
          return {
            result: { points: 0, base: 0, streakBonus: 0, speedBonus: 0, message: "Already completed — review mode earns no extra XP." },
            attempts: previous?.attempts ?? 1,
            correct: previous?.lastCorrect ?? evaluation.correct,
          };
        }

        const previousAttempts = state.attempts[activity.id]?.attempts ?? 0;
        const attempt = previousAttempts + 1;
        const streak = evaluation.correct ? state.streak + 1 : 0;
        const result = scoreAttempt({ activity, correct: evaluation.correct, attempt, secondsTaken, streak });
        // Reflection/discussion/videoPause are completion-only: they never break a streak.
        const effectiveStreak = evaluation.unscored ? state.streak : streak;
        const points = state.reviewing ? 0 : result.points;

        set({
          xp: state.xp + points,
          streak: effectiveStreak,
          bestStreak: Math.max(state.bestStreak, effectiveStreak),
          attempts: {
            ...state.attempts,
            [activity.id]: { activityId: activity.id, attempts: attempt, lastCorrect: evaluation.correct, points: (state.attempts[activity.id]?.points ?? 0) + points, at: Date.now() },
          },
          completed: state.completed.includes(activity.id) ? state.completed : [...state.completed, activity.id],
          lastResult: { activityId: activity.id, evaluation, score: { ...result, points }, attempts: attempt },
        });

        return { result: { ...result, points }, attempts: attempt, correct: evaluation.correct };
      },

      addJournal: (entry) =>
        set((state) => ({
          journal: [...state.journal, { ...entry, id: `j-${Date.now().toString(36)}`, at: Date.now() }],
        })),

      awardBadge: (badgeId) => set((state) => (state.badges.includes(badgeId) ? state : { badges: [...state.badges, badgeId] })),

      hydrateFrom: (state) =>
        set((current) => ({
          completed: state.completed ?? current.completed,
          xp: Math.max(current.xp, state.xp ?? 0),
          streak: 0,
          journal: state.journal?.length ? state.journal : current.journal,
        })),

      reset: () =>
        set({
          completed: [],
          attempts: {},
          xp: 0,
          streak: 0,
          badges: [],
          journal: [],
          activeActivityId: null,
          lastResult: null,
        }),
    }),
    {
      name: PERSIST_KEY,
      partialize: (state) => ({
        episodeId: state.episodeId,
        completed: state.completed,
        attempts: state.attempts,
        xp: state.xp,
        bestStreak: state.bestStreak,
        badges: state.badges,
        journal: state.journal,
      }),
    },
  ),
);

/** Level/progress derived from the stored XP. */
export function useLearnerLevel() {
  const xp = useLessonStore((s) => s.xp);
  const lesson = useLessonStore((s) => s.lesson);
  return levelFromXp(xp, lesson?.globalSettings.pointsToLevelUp ?? 500);
}
