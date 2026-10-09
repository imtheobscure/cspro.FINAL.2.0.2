"use client";

import { THEMES, THEME_MAP } from "@/lib/data";
import type { Theme } from "@/lib/data/types";
import { useActiveWords, useTutor } from "./store";
import { useVoice } from "./useSpeech";

export type Setup = ReturnType<typeof useSetup>;

export function useSetup() {
  const homeLang = useTutor((s) => s.homeLang);
  const targetLang = useTutor((s) => s.targetLang);
  const mono = useTutor((s) => s.mono);
  const themeId = useTutor((s) => s.themeId);
  const bigView = useTutor((s) => s.bigView);
  const slow = useTutor((s) => s.slow);
  const seed = useTutor((s) => s.seed);
  const student = useTutor((s) => s.student);
  const unitIds = useTutor((s) => s.unitIds);
  const words = useActiveWords();
  const theme: Theme = THEME_MAP[themeId] ?? THEMES[0];
  const voice = useVoice();
  /** first explicitly selected unit — used by the Lesson planner */
  const unitIdOfWords = unitIds[0] ?? theme.units[0].id;
  return { homeLang, targetLang, mono, theme, words, bigView, slow, seed, student, unitIdOfWords, ...voice };
}
