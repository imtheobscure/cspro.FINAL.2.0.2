import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useSpeech } from "../hooks/useSpeech";
import { useSfx } from "../hooks/useSfx";
import type { Activity, Emotion } from "../data/activities";

interface CatState {
  emotion: Emotion;
  message: string;
  visible: boolean;
}

interface AppCtx {
  speech: ReturnType<typeof useSpeech>;
  sfx: ReturnType<typeof useSfx>;
  cat: CatState;
  setCat: (s: Partial<CatState>) => void;
  // Convenience: cat speaks AI feedback for an activity event
  catSay: (msg: string, emotion?: Emotion) => void;
  catReact: (activity: Activity, kind: "intro" | "tip" | "correct" | "incorrect" | "encourage") => void;
  // hover-to-speak helper
  speakOnHover: (text: string) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const speech = useSpeech();
  const sfx = useSfx();
  const [cat, setCatState] = useState<CatState>({
    emotion: "😺",
    message: "Welcome to the Activity Library Hub! Hover any activity and I'll read it to you.",
    visible: true,
  });

  const setCat = (s: Partial<CatState>) => setCatState(prev => ({ ...prev, ...s }));

  const catSay = (msg: string, emotion: Emotion = "😺") => {
    setCatState(prev => ({ ...prev, emotion, message: msg, visible: true }));
    speech.speak(msg);
  };

  const catReact = (activity: Activity, kind: "intro" | "tip" | "correct" | "incorrect" | "encourage") => {
    const text = activity.ai[kind];
    catSay(text, activity.ai.emotion);
  };

  // Debounced hover so we don't spam the synth on quick mouse moves
  let hoverTimer: number | undefined;
  const speakOnHover = (text: string) => {
    if (hoverTimer) window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => speech.speak(text), 120);
  };

  const value = useMemo<AppCtx>(() => ({
    speech, sfx, cat, setCat, catSay, catReact, speakOnHover,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [speech.voice, speech.muted, speech.rate, speech.pitch, speech.volume, sfx.enabled, cat]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
