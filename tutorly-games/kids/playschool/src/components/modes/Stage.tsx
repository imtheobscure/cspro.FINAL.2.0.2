"use client";

import { useEffect } from "react";
import { MODES, useTutor, type Mode } from "@/lib/store";
import { useSetup } from "@/lib/useSetup";
import { useSfxSync } from "@/lib/useSpeech";
import { FeedbackProvider } from "@/components/ui/Feedback";
import { LessonMode } from "./LessonMode";
import { EchoGame, SmoothieGame, TraceGame } from "@/components/games/LetterGames";
import { CharadeGame, MirrorGame, ScavengerGame } from "@/components/games/WorldGamesA";
import { DollhouseGame, DressingGame, TrainGame } from "@/components/games/WorldGamesB";

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
    case "lesson":
      return <LessonMode s={s} />;
    case "trace":
      return <TraceGame s={s} />;
    case "echo":
      return <EchoGame s={s} />;
    case "smoothie":
      return <SmoothieGame s={s} />;
    case "scavenger":
      return <ScavengerGame s={s} />;
    case "mirror":
      return <MirrorGame s={s} />;
    case "charade":
      return <CharadeGame s={s} />;
    case "train":
      return <TrainGame s={s} />;
    case "dollhouse":
      return <DollhouseGame s={s} />;
    case "dressing":
      return <DressingGame s={s} />;
    default:
      return <LessonMode s={s} />;
  }
}

export function Stage() {
  const mode = useTutor((s) => s.mode);
  const patch = useTutor((s) => s.patch);
  useSfxSync();

  // Deep link: `?mode=trace#/play` — read from the URL directly. PlaySchool is a
  // static export, so `useSearchParams()` from next/navigation would need a
  // Suspense boundary and is empty at prerender time anyway.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mode") as Mode | null;
    if (m && MODES.some((x) => x.id === m) && m !== mode) patch({ mode: m });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FeedbackProvider>
      <Router mode={mode} />
    </FeedbackProvider>
  );
}
