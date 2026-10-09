"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { THEMES, getSubtheme, getTheme, siblingSubthemes, wordsOf } from "@/data/dictionary";
import { LANG_MAP } from "@/data/languages";
import type { LangCode, Subtheme, Theme, Word } from "@/data/types";
import { sfx, setSfxMuted, unlockAudio } from "@/lib/sfx";
import { addStars, logLesson } from "@/lib/students";
import { primeVoices, speak, stopSpeaking } from "@/lib/tts";
import type { VoiceKind } from "@/lib/tts";
import { shuffle } from "@/lib/util";

export type ModeId = "learn" | "quiz" | "match" | "sort" | "chant" | "talk" | "abc" | "count";

export type ModeDef = {
  id: ModeId;
  label: string;
  emoji: string;
  blurb: string;
  /** what the mode needs from the deck */
  needs: "words" | "bins" | "numbers" | "letters";
};

export const MODES: ModeDef[] = [
  { id: "learn", label: "Learn", emoji: "🃏", blurb: "Big flashcards, tap to hear, star the wins", needs: "words" },
  { id: "quiz", label: "Quiz", emoji: "🎯", blurb: "Multiple choice: listen → picture, picture → word", needs: "words" },
  { id: "match", label: "Match", emoji: "🧲", blurb: "Drag the word onto the right picture", needs: "words" },
  { id: "sort", label: "Sort it", emoji: "🧺", blurb: "Drag into two baskets (fruit / veg, big / small)", needs: "bins" },
  { id: "chant", label: "Chant", emoji: "🎶", blurb: "Karaoke chant with claps — whole class sings", needs: "words" },
  { id: "talk", label: "Talk time", emoji: "💬", blurb: "CCQ question cards that make children speak", needs: "words" },
  { id: "abc", label: "ABC", emoji: "🔤", blurb: "Letter sounds and 'what starts with…?'", needs: "letters" },
  { id: "count", label: "Count", emoji: "🔢", blurb: "Count along and choose the number", needs: "numbers" },
];

export type StudentRow = {
  id: number;
  name: string;
  avatar: string;
  color: string;
  homeLang: string;
  targetLang: string;
};

type Settings = {
  target: LangCode;
  support: LangCode | "none";
  voice: VoiceKind;
  slow: boolean;
  sfxOn: boolean;
  autoSpeak: boolean;
  reveal: boolean;
  bigCards: boolean;
};

type StudioValue = {
  ready: boolean;
  student: StudentRow | null;
  setStudent: (s: StudentRow | null) => void;
  settings: Settings;
  patch: (p: Partial<Settings>) => void;
  theme: Theme;
  subtheme: Subtheme;
  siblings: Subtheme[];
  deck: Word[];
  index: number;
  word: Word;
  setTheme: (id: string) => void;
  setSubtheme: (id: string) => void;
  setMode: (m: ModeId) => void;
  mode: ModeId;
  setDeck: (w: Word[]) => void;
  go: (i: number) => void;
  next: () => void;
  prev: () => void;
  reshuffle: () => void;
  stars: number;
  addStar: (word?: Word | null) => void;
  say: (text: string, lang?: LangCode, over?: Partial<{ kind: VoiceKind; slow: boolean }>) => Promise<void>;
  sayWord: (w: Word, lang?: LangCode) => Promise<void>;
  sayPair: (w: Word) => Promise<void>;
  stop: () => void;
  text: (w: Word, lang?: LangCode) => string;
  roman: (w: Word) => string | null;
  reset: () => void;
};

const Ctx = createContext<StudioValue | null>(null);

const DEFAULT_SETTINGS: Settings = {
  target: "en",
  support: "none",
  voice: "kid",
  slow: false,
  sfxOn: true,
  autoSpeak: true,
  reveal: true,
  bigCards: true,
};

export type StudioInit = {
  theme?: string;
  sub?: string;
  mode?: ModeId;
  target?: LangCode;
  support?: LangCode | "none";
};

function deckOf(s: Subtheme): Word[] {
  return s.kind === "numbers" || s.kind === "letters" ? s.words : wordsOf(s);
}

export function StudioProvider({
  students,
  init,
  children,
}: {
  students: StudentRow[];
  init?: StudioInit;
  children: ReactNode;
}) {
  const [student, setStudent] = useState<StudentRow | null>(students[0] ?? null);
  const [settings, setSettings] = useState<Settings>(() => {
    const t = init?.target ?? (students[0]?.targetLang as LangCode) ?? "en";
    const s = init?.support ?? (students[0]?.homeLang as LangCode) ?? "none";
    return {
      ...DEFAULT_SETTINGS,
      target: LANG_MAP[t] ? t : "en",
      support: s === "none" ? "none" : LANG_MAP[s as LangCode] ? (s as LangCode) : "none",
    };
  });
  const [themeId, setThemeId] = useState(init?.theme && getTheme(init.theme) ? init.theme : "self");
  const [subId, setSubId] = useState(init?.sub ?? "body");
  const [mode, setModeState] = useState<ModeId>(init?.mode ?? "learn");
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [ready, setReady] = useState(false);
  const started = useRef<number>(Date.now());

  const theme = getTheme(themeId);
  const subtheme = getSubtheme(subId) ?? theme.subthemes[0];
  const siblings = siblingSubthemes(theme, subtheme.id);
  const [deck, setDeckState] = useState<Word[]>(() => deckOf(getSubtheme(subId) ?? getTheme(themeId).subthemes[0]));

  /** deck = the words of the current subtheme (bin-only items excluded) */
  useEffect(() => {
    const base = deckOf(subtheme);
    setDeckState(base);
    setIndex(0);
    // pick a sensible default mode for special decks
    if (subtheme.kind === "numbers") setModeState("count");
    else if (subtheme.kind === "letters") setModeState("abc");
    else if (mode === "count" || mode === "abc") setModeState("learn");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtheme.id]);

  useEffect(() => {
    setSfxMuted(!settings.sfxOn);
  }, [settings.sfxOn]);

  useEffect(() => {
    started.current = Date.now();
    setReady(true);
    primeVoices();
    unlockAudio();
  }, []);

  const word = deck[index] ?? deck[0] ?? subtheme.words[0];

  const patch = useCallback((p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p })), []);

  const setTheme = useCallback((id: string) => {
    const th = getTheme(id);
    setThemeId(th.id);
    setSubId(th.subthemes[0].id);
  }, []);

  const setSubtheme = useCallback((id: string) => setSubId(id), []);

  const setMode = useCallback((m: ModeId) => {
    setModeState(m);
    stopSpeaking();
    sfx.flip();
  }, []);

  const setDeck = useCallback((w: Word[]) => {
    setDeckState(w);
    setIndex(0);
  }, []);

  const go = useCallback(
    (i: number) => {
      stopSpeaking();
      setIndex(((i % Math.max(1, deck.length)) + Math.max(1, deck.length)) % Math.max(1, deck.length));
    },
    [deck.length],
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);
  const reshuffle = useCallback(() => {
    stopSpeaking();
    setDeckState((d) => shuffle(d));
    setIndex(0);
    sfx.whoosh();
  }, []);

  const reset = useCallback(() => {
    stopSpeaking();
    setStars(0);
    setIndex(0);
    started.current = Date.now();
  }, []);

  const text = useCallback((w: Word, lang?: LangCode) => w.t[lang ?? settings.target] || w.t.en, [settings.target]);

  const roman = useCallback(
    (w: Word) => (settings.target === "zh" && w.pinyin ? w.pinyin : null),
    [settings.target],
  );

  const say = useCallback(
    async (txt: string, lang?: LangCode, over?: Partial<{ kind: VoiceKind; slow: boolean }>) => {
      const l = lang ?? settings.target;
      await speak(txt, { lang: l, kind: over?.kind ?? settings.voice, slow: over?.slow ?? settings.slow });
    },
    [settings.target, settings.voice, settings.slow],
  );

  const sayWord = useCallback(
    async (w: Word, lang?: LangCode) => {
      await say(text(w, lang), lang);
    },
    [say, text],
  );

  /** target language first, then the child's home language as a bridge */
  const sayPair = useCallback(
    async (w: Word) => {
      await say(text(w));
      if (settings.support !== "none") await say(text(w, settings.support), settings.support, { kind: "adult" });
    },
    [say, text, settings.support],
  );

  const addStar = useCallback(
    (w?: Word | null) => {
      setStars((n) => n + 1);
      sfx.star();
      if (!student || !w) return;
      // Saved on this device (no server): the star wall and the lesson log are
      // per child, per language, and survive a reload.
      addStars(student.id, w.id, settings.target, 1);
    },
    [student, settings.target],
  );

  const setStudentSafe = useCallback((s: StudentRow | null) => {
    setStudent(s);
    if (s) {
      setSettings((prev) => ({
        ...prev,
        target: LANG_MAP[s.targetLang as LangCode] ? (s.targetLang as LangCode) : prev.target,
        support: LANG_MAP[s.homeLang as LangCode] ? (s.homeLang as LangCode) : "none",
      }));
    }
  }, []);

  /** log the lesson when the tutor leaves the studio */
  useEffect(() => {
    return () => {
      const seconds = Math.round((Date.now() - started.current) / 1000);
      if (!student || seconds < 5) return;
      logLesson({
        studentId: student.id,
        themeId,
        subthemeId: subId,
        modeId: mode,
        targetLang: settings.target,
        supportLang: settings.support === "none" ? null : settings.support,
        stars,
        seconds,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: StudioValue = {
    ready,
    student,
    setStudent: setStudentSafe,
    settings,
    patch,
    theme,
    subtheme,
    siblings,
    deck,
    index,
    word,
    setTheme,
    setSubtheme,
    setMode,
    mode,
    setDeck,
    go,
    next,
    prev,
    reshuffle,
    stars,
    addStar,
    say,
    sayWord,
    sayPair,
    stop: stopSpeaking,
    text,
    roman,
    reset,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudio() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudio must be used inside <StudioProvider>");
  return v;
}

export { THEMES, LANG_MAP };
