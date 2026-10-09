"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Lang } from "./types";
import { setMuted } from "./sfx";
import { saveStars } from "./store";
import type { Learner } from "./store";

export type { Learner };

export interface Settings {
  target: Lang; // language being taught
  support: Lang | "none"; // home language shown underneath (or monolingual)
  showCCQ: boolean; // tutor talk-time panel
  autoSpeak: boolean;
  sound: boolean;
  learner: Learner | null;
  /** Read-aloud voice per language (a SpeechSynthesis voiceURI, chosen in the Voice test screen). */
  voices: Partial<Record<Lang, string>>;
}

const DEFAULTS: Settings = {
  target: "en",
  support: "none",
  showCCQ: true,
  autoSpeak: true,
  sound: true,
  learner: null,
  voices: {},
};

interface Ctx extends Settings {
  update: (patch: Partial<Settings>) => void;
  ready: boolean;
}

const SettingsContext = createContext<Ctx>({ ...DEFAULTS, update: () => {}, ready: false });

/** `wordpop.`-prefixed because every Tutorly game shares this origin's storage. */
const KEY = "wordpop.settings.v1";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(s));
    setMuted(!s.sound);
  }, [s, ready]);

  const update = useCallback((patch: Partial<Settings>) => setS((p) => ({ ...p, ...patch })), []);

  const value = useMemo(() => ({ ...s, update, ready }), [s, update, ready]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

/**
 * Save stars for the current learner.
 *
 * The game is a static export, so results are written to this browser (keeping
 * the learner's best score) instead of a database. Staying fire-and-forget keeps
 * the same call sites as before.
 */
export function saveProgress(learnerId: number | undefined, themeId: string, activity: string, stars: number) {
  saveStars(learnerId, themeId, activity, stars);
}
