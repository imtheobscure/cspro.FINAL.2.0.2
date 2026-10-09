import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Lang, Theme } from '../data/types';
import { BUILT_IN_THEMES } from '../data';
import { setTtsConfig, setSfxEnabled } from './audio';
import type { LessonPlan } from './lessons';

/**
 * One storage key per game: all the Kids' Corner games share an origin, so a
 * generic key would let one game read or overwrite another's learners.
 * `tutorly.v1` is what HeroArcade wrote before it was named, and is still read.
 */
const SAVE_KEY = 'heroarcade.v1';
const LEGACY_KEYS = ['tutorly.v1'];

export interface Settings {
  learn: Lang;              // learning language (big text)
  support: Lang | 'none';   // support language (small text) – 'none' = monolingual
  azureKey: string;
  azureRegion: string;
  voices: Partial<Record<Lang, string>>;
  rate: number;
  sfx: boolean;
  /** Root type scale. 1 = the old default; the app now opens at 1.3. */
  fontScale: number;
  autoSpeak: boolean;
}

/**
 * The text sizes offered in Settings and by the “A A” button.
 *
 * HeroArcade scales every size from the root font size, so these are honest
 * multipliers on the whole app. The old default (1) was tuned for a laptop at
 * arm’s length; the app now OPENS at 1.3, which is the same design and the same
 * colours, just comfortably readable on a shared screen. The first step is the
 * old 1.15 for a tutor who wants the compact layout back.
 */
export const FONT_STEPS = [1.15, 1.3, 1.5, 1.7] as const;

const DEFAULTS: Settings = {
  learn: 'en', support: 'none', azureKey: '', azureRegion: 'eastus', voices: {}, rate: 0.9, sfx: true, fontScale: 1.3, autoSpeak: true,
};

interface Store {
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  themes: Theme[];
  customThemes: Theme[];
  addCustomTheme: (t: Theme) => void;
  removeCustomTheme: (id: string) => void;
  /** Lesson plans pasted in from an AI, newest first. */
  lessonPlans: LessonPlan[];
  addLessonPlan: (p: LessonPlan) => void;
  removeLessonPlan: (id: string) => void;
  stars: number;
  addStars: (n: number) => void;
}

const Ctx = createContext<Store>(null as any);

function load(): { settings: Settings; custom: Theme[]; lessons: LessonPlan[]; stars: number } {
  try {
    const stored = localStorage.getItem(SAVE_KEY) ?? LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) ?? null;
    const raw = stored;
    if (raw) {
      const p = JSON.parse(raw);
      return {
        settings: { ...DEFAULTS, ...(p.settings || {}) },
        custom: Array.isArray(p.custom) ? p.custom : [],
        lessons: Array.isArray(p.lessons) ? p.lessons : [],
        stars: p.stars || 0,
      };
    }
  } catch { /* ignore */ }
  return { settings: DEFAULTS, custom: [], lessons: [], stars: 0 };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(load, []);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [customThemes, setCustom] = useState<Theme[]>(initial.custom);
  const [lessonPlans, setLessons] = useState<LessonPlan[]>(initial.lessons);
  const [stars, setStars] = useState(initial.stars);

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, settings, custom: customThemes, lessons: lessonPlans, stars }));
    setTtsConfig({ azureKey: settings.azureKey, azureRegion: settings.azureRegion, voices: settings.voices, rate: settings.rate });
    setSfxEnabled(settings.sfx);
  }, [settings, customThemes, lessonPlans, stars]);

  /**
   * Apply the type scale — and keep it honest on a narrow window.
   *
   * Every size in the app is a rem, so the root font size IS the setting. At
   * 1.3× on a 1240px laptop the headings wrap and the header controls drop onto
   * a second row, which is not “more readable”, just tighter: below 1400px the
   * applied size steps down to 0.9 of the choice. A projector or a 1080p screen
   * share is wider than that, so the tutor still gets the size they asked for
   * where it matters, and the layout never has to fight the type.
   */
  useEffect(() => {
    const apply = () => {
      const narrow = window.innerWidth < 1400 ? 0.9 : 1;
      document.documentElement.style.fontSize = `${18 * settings.fontScale * narrow}px`;
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [settings.fontScale]);

  const value: Store = {
    settings,
    update: (p) => setSettings((s) => ({ ...s, ...p })),
    themes: [...BUILT_IN_THEMES, ...customThemes],
    customThemes,
    addCustomTheme: (t) => setCustom((c) => [...c.filter((x) => x.id !== t.id), { ...t, custom: true }]),
    removeCustomTheme: (id) => setCustom((c) => c.filter((x) => x.id !== id)),
    lessonPlans,
    addLessonPlan: (p) => setLessons((l) => [{ ...p, custom: true }, ...l.filter((x) => x.id !== p.id)]),
    removeLessonPlan: (id) => setLessons((l) => l.filter((x) => x.id !== id)),
    stars,
    addStars: (n) => setStars((s) => s + n),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
