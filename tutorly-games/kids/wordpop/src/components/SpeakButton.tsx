"use client";

import { useState } from "react";
import { Lang } from "@/lib/types";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { LANG_META } from "@/lib/i18n";

export function SpeakButton({
  text, lang, size = "md", label, slow, tone = "sky", className = "",
}: {
  text: string; lang: Lang; size?: "sm" | "md" | "lg"; label?: string; slow?: boolean;
  tone?: "sky" | "white" | "sun"; className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const sz = { sm: "h-10 min-w-10 px-3 text-lg", md: "h-14 min-w-14 px-4 text-2xl", lg: "h-20 min-w-20 px-6 text-4xl" }[size];
  const bg = { sky: "bg-sky text-ink [--shadow:#4ba3e3]", white: "bg-white text-ink [--shadow:#e3d9c8]", sun: "bg-sun text-ink [--shadow:#e0a52e]" }[tone];
  return (
    <button
      onClick={async () => {
        sfx.tick();
        setBusy(true);
        await speak(text, lang, { slow });
        setBusy(false);
      }}
      className={`btn-3d inline-flex items-center justify-center gap-2 rounded-full font-bold ${bg} ${sz} ${busy ? "anim-pulse" : ""} ${className}`}
      title={`${LANG_META[lang].name}: ${text}`}
      aria-label={`Listen: ${text}`}
    >
      <span aria-hidden>{slow ? "🐢" : "🔊"}</span>
      {label && <span className="font-display">{label}</span>}
    </button>
  );
}
