"use client";

import { useEffect, useRef } from "react";
import { Mascot } from "@/lib/shell";
import { BigButton, Confetti, Stars } from "../ui";
import { useSettings, saveProgress } from "@/lib/settings";
import { ui } from "@/lib/i18n";
import { sfx } from "@/lib/sfx";
import { speak } from "@/lib/tts";
import { Activity } from "@/lib/types";

export function Celebration({
  stars, themeId, activity, onReplay, message,
}: {
  stars: number; themeId: string; activity: Activity; onReplay: () => void; message?: string;
}) {
  const s = useSettings();
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    sfx.fanfare();
    void saveProgress(s.learner?.id, themeId, activity, stars);
    if (s.autoSpeak) void speak(ui(s.target, stars >= 3 ? "superStar" : "wellDone"), s.target);
  }, [s.autoSpeak, s.learner?.id, s.target, stars, themeId, activity]);

  return (
    <div className="anim-pop card-soft relative mx-auto mt-4 flex max-w-2xl flex-col items-center gap-5 overflow-hidden px-6 py-10 text-center">
      <Confetti />
      <Mascot size={160} className="anim-float" />
      <h2 className="font-display text-5xl font-bold text-ink sm:text-6xl">
        {ui(s.target, stars >= 3 ? "superStar" : "wellDone")}
      </h2>
      {s.support !== "none" && (
        <p className="font-display text-3xl text-ink-soft">{ui(s.support, stars >= 3 ? "superStar" : "wellDone")}</p>
      )}
      {message && <p className="text-2xl font-bold text-ink-soft">{message}</p>}
      <Stars count={stars} size="text-6xl" />
      {s.learner ? (
        <p className="text-lg font-bold text-ink-soft">
          {s.learner.avatar} {s.learner.name} · +{stars} ⭐
        </p>
      ) : (
        <p className="text-base text-ink-soft">Tip: pick a learner on the home page to save stars.</p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <BigButton tone="coral" onClick={onReplay}>🔁 {ui(s.target, "playAgain")}</BigButton>
        <BigButton tone="white" href={`/theme/${themeId}`}>🎮 {ui(s.target, "chooseGame")}</BigButton>
      </div>
    </div>
  );
}
