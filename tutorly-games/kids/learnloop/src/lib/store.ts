"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang, Word } from "@/lib/data/types";
import { THEME_MAP, UNITS, WORD_MAP, wordsByIds } from "@/lib/data";

export type Mode =
  | "learn"
  | "talk"
  | "listen"
  | "match"
  | "memory"
  | "sort"
  | "chant"
  | "quiz"
  | "numbers"
  | "abc"
  | "opposites";

export const MODES: { id: Mode; key: string; icon: string }[] = [
  { id: "learn", key: "mode.learn", icon: "🃏" },
  { id: "talk", key: "mode.talk", icon: "💬" },
  { id: "listen", key: "mode.listen", icon: "👂" },
  { id: "quiz", key: "mode.quiz", icon: "❓" },
  { id: "match", key: "mode.match", icon: "🧲" },
  { id: "memory", key: "mode.memory", icon: "🂠" },
  { id: "sort", key: "mode.sort", icon: "🗂️" },
  { id: "opposites", key: "mode.opposites", icon: "↔️" },
  { id: "chant", key: "mode.chant", icon: "🎵" },
  { id: "numbers", key: "mode.numbers", icon: "🔢" },
  { id: "abc", key: "mode.abc", icon: "🔤" },
];

export type StudentLite = { id: string; name: string; avatar: string; age: number };

interface TutorState {
  homeLang: Lang;
  targetLang: Lang;
  mono: boolean;
  themeId: string;
  unitIds: string[];
  wordIds: string[];
  mode: Mode;
  student: StudentLite | null;
  stars: number;
  mastered: string[];
  muted: boolean;
  sfx: boolean;
  slow: boolean;
  panelHidden: boolean;
  bigView: boolean;
  voice: string;
  useLocalVoice: boolean;
  seed: number;

  patch: (p: Partial<TutorState>) => void;
  setLangs: (home: Lang, target: Lang, mono?: boolean) => void;
  setTheme: (id: string) => void;
  toggleUnit: (id: string) => void;
  toggleWord: (id: string) => void;
  setWordIds: (ids: string[]) => void;
  clearWords: () => void;
  setMode: (m: Mode) => void;
  awardStar: (wordId?: string) => void;
  resetStars: () => void;
  newSeed: () => void;
}

export const useTutor = create<TutorState>()(
  persist(
    (set, get) => ({
      homeLang: "en",
      targetLang: "zh",
      mono: false,
      themeId: "nature",
      unitIds: ["pets"],
      wordIds: [],
      mode: "learn",
      student: null,
      stars: 0,
      mastered: [],
      muted: false,
      sfx: true,
      slow: false,
      panelHidden: false,
      bigView: false,
      voice: "",
      useLocalVoice: false,
      seed: 7,

      patch: (p) => set(p),
      setLangs: (homeLang, targetLang, mono) =>
        set({ homeLang, targetLang, mono: mono ?? get().mono }),
      setTheme: (id) => {
        const theme = THEME_MAP[id];
        set({
          themeId: id,
          unitIds: theme ? [theme.units[0].id] : [],
          wordIds: [],
          seed: Math.floor(Math.random() * 900) + 3,
        });
      },
      toggleUnit: (id) => {
        const cur = get().unitIds;
        const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
        set({ unitIds: next.length ? next : cur, wordIds: [], seed: Math.floor(Math.random() * 900) + 3 });
      },
      toggleWord: (id) => {
        const cur = get().wordIds;
        set({ wordIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
      },
      setWordIds: (wordIds) => set({ wordIds }),
      clearWords: () => set({ wordIds: [] }),
      setMode: (mode) => set({ mode, seed: Math.floor(Math.random() * 900) + 3 }),
      awardStar: (wordId) => {
        const s = get();
        set({
          stars: s.stars + 1,
          mastered: wordId && !s.mastered.includes(wordId) ? [...s.mastered, wordId] : s.mastered,
        });
      },
      resetStars: () => set({ stars: 0, mastered: [] }),
      newSeed: () => set({ seed: Math.floor(Math.random() * 900) + 3 }),
    }),
    {
      // Namespaced: every Tutorly game shares one origin, so two games must
      // never write the same persisted key (the convention for kids games is
      // `<game>.store.v2`).
      name: "learnloop.store.v2",
      skipHydration: true,
      partialize: (s) => ({
        homeLang: s.homeLang,
        targetLang: s.targetLang,
        mono: s.mono,
        themeId: s.themeId,
        unitIds: s.unitIds,
        wordIds: s.wordIds,
        mode: s.mode,
        student: s.student,
        stars: s.stars,
        mastered: s.mastered,
        muted: s.muted,
        sfx: s.sfx,
        slow: s.slow,
        bigView: s.bigView,
        voice: s.voice,
        useLocalVoice: s.useLocalVoice,
      }),
    },
  ),
);

/** The words currently on stage, honouring explicit picks then unit selection. */
export function activeWords(): Word[] {
  const { wordIds, unitIds } = useTutor.getState();
  if (wordIds.length) return wordsByIds(wordIds);
  const picked = unitIds.flatMap((u) => UNITS.find((x) => x.id === u)?.words ?? []);
  return picked.length ? picked : wordsByIds(Object.keys(WORD_MAP).slice(0, 8));
}

export function useActiveWords(): Word[] {
  const wordIds = useTutor((s) => s.wordIds);
  const unitIds = useTutor((s) => s.unitIds);
  const seed = useTutor((s) => s.seed);
  void seed;
  if (wordIds.length) return wordsByIds(wordIds);
  const picked = unitIds.flatMap((u) => UNITS.find((x) => x.id === u)?.words ?? []);
  return picked.length ? picked : wordsByIds(Object.keys(WORD_MAP).slice(0, 8));
}
