"use client";

import { useTutor } from "@/lib/store";
import { useSetup } from "@/lib/useSetup";
import { useSfxSync } from "@/lib/useSpeech";
import { FeedbackProvider } from "@/components/ui/Feedback";
import { LearnMode, ListenMode, QuizMode, TalkMode } from "./CoreModes";
import { MatchMode, MemoryMode, OppositesMode, SortMode } from "./DragModes";
import { AbcMode, ChantMode, NumbersMode } from "./RhythmModes";
import type { Mode } from "@/lib/store";

function Router({ mode }: { mode: Mode }) {
  const s = useSetup();
  if (!s.words.length) {
    return (
      <div className="grid place-items-center py-32 text-center">
        <div className="font-display text-4xl font-extrabold text-inksoft">Pick a theme on the left to begin 🎈</div>
      </div>
    );
  }
  switch (mode) {
    case "learn":
      return <LearnMode s={s} />;
    case "talk":
      return <TalkMode s={s} />;
    case "listen":
      return <ListenMode s={s} />;
    case "quiz":
      return <QuizMode s={s} />;
    case "match":
      return <MatchMode s={s} />;
    case "memory":
      return <MemoryMode s={s} />;
    case "sort":
      return <SortMode s={s} />;
    case "opposites":
      return <OppositesMode s={s} />;
    case "chant":
      return <ChantMode s={s} />;
    case "numbers":
      return <NumbersMode s={s} />;
    case "abc":
      return <AbcMode s={s} />;
    default:
      return <LearnMode s={s} />;
  }
}

export function Stage() {
  const mode = useTutor((s) => s.mode);
  useSfxSync();
  return (
    <FeedbackProvider>
      <Router mode={mode} />
    </FeedbackProvider>
  );
}
