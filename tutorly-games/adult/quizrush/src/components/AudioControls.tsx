"use client";

import { useState } from "react";
import { startMusic, stopMusic, isMusicOn, setSfx, isSfxOn, unlockAudio } from "@/lib/sound";

export default function AudioControls() {
  const [music, setMusic] = useState(false);
  const [sound, setSound] = useState(true);

  return (
    <div className="flex gap-2">
      <button
        onClick={() => {
          unlockAudio();
          if (isMusicOn()) {
            stopMusic();
            setMusic(false);
          } else {
            startMusic();
            setMusic(true);
          }
        }}
        className={`rounded-xl px-3 py-2 text-lg font-bold ${music ? "bg-indigo-500/40 ring-2 ring-indigo-400" : "glass"}`}
        title="Background music"
      >
        {music ? "🎵" : "🎵̶"}
        <span className="ml-1 hidden text-sm md:inline">{music ? "Music On" : "Music Off"}</span>
      </button>
      <button
        onClick={() => {
          const next = !isSfxOn();
          setSfx(next);
          setSound(next);
        }}
        className={`rounded-xl px-3 py-2 text-lg font-bold ${sound ? "bg-indigo-500/40 ring-2 ring-indigo-400" : "glass"}`}
        title="Sound effects"
      >
        {sound ? "🔊" : "🔇"}
        <span className="ml-1 hidden text-sm md:inline">SFX</span>
      </button>
    </div>
  );
}
