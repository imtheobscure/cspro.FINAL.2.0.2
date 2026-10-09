"use client";

import type { ReactNode } from "react";
import { WordArt } from "@/components/ui/WordArt";
import { SpeakerIcon, StarIcon } from "@/components/ui/icons";
import { sfx } from "@/lib/sfx";
import { useStudio } from "@/lib/studio";
import type { LangCode, Word } from "@/data/types";

/** top strip of the stage: what the child sees as the instruction */
export function PromptBar({
  children,
  hint,
  right,
  color = "#FF8A5B",
}: {
  children: ReactNode;
  hint?: string;
  right?: ReactNode;
  color?: string;
}) {
  const { settings } = useStudio();
  return (
    <div className="flex w-full items-center gap-4">
      <div
        className="sticker flex min-h-[74px] flex-1 items-center gap-3 px-6 py-3"
        style={{ borderColor: `${color}44`, background: `${color}12` }}
      >
        <span className="display text-[clamp(1.35rem,2.3vw,2rem)] font-extrabold leading-tight text-ink">{children}</span>
      </div>
      {settings.reveal && hint ? (
        <div className="hidden max-w-[300px] shrink-0 rounded-2xl border-2 border-dashed border-line bg-white/70 px-4 py-2 text-[0.9rem] font-semibold leading-snug text-inksoft xl:block">
          <span className="display font-extrabold uppercase tracking-wide text-branddeep">Tutor tip · </span>
          {hint}
        </div>
      ) : null}
      {right}
    </div>
  );
}

/** the picture: emoji art, numeral, or big letter */
export function Art({ w, size = 200, className = "" }: { w: Word; size?: number; className?: string }) {
  if (w.numeral !== undefined) {
    return (
      <div className={`display flex items-center justify-center font-extrabold text-ink ${className}`} style={{ fontSize: size * 0.9, lineHeight: 1 }}>
        {w.numeral}
      </div>
    );
  }
  if (w.letter) {
    return (
      <div className={`display flex items-end justify-center font-extrabold leading-none text-ink ${className}`} style={{ fontSize: size * 0.78 }}>
        {w.letter}
        <span className="ml-1 text-[0.55em] opacity-70">{w.letter.toLowerCase()}</span>
      </div>
    );
  }
  return <WordArt emoji={w.emoji} size={size} className={className} alt={w.t.en} />;
}

/** always the picture — used by games where the letter/numeral would give the answer away */
export function PictureArt({ w, size = 200, className = "" }: { w: Word; size?: number; className?: string }) {
  return <WordArt emoji={w.emoji} size={size} className={className} alt={w.t.en} />;
}

export function WordText({
  w,
  lang,
  size = 64,
  roman: showRoman = true,
  supportLang,
  className = "",
}: {
  w: Word;
  lang: LangCode;
  size?: number;
  roman?: boolean;
  supportLang?: LangCode | "none";
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="display text-center font-extrabold leading-[1.05] text-ink" style={{ fontSize: size }}>
        {w.t[lang] || w.t.en}
      </div>
      {showRoman && lang === "zh" && w.pinyin ? (
        <div className="display text-center font-bold text-branddeep" style={{ fontSize: size * 0.42 }}>
          {w.pinyin}
        </div>
      ) : null}
      {supportLang && supportLang !== "none" && supportLang !== lang ? (
        <div className="display text-center font-bold text-inksoft/80" style={{ fontSize: size * 0.44 }}>
          {w.t[supportLang] || w.t.en}
        </div>
      ) : null}
    </div>
  );
}

/** round speaker button that reads a phrase aloud */
export function SpeakButton({
  text,
  lang,
  size = 76,
  label,
  color = "#FF8A5B",
  onDone,
}: {
  text: string;
  lang: LangCode;
  size?: number;
  label?: string;
  color?: string;
  onDone?: () => void;
}) {
  const { say } = useStudio();
  return (
    <button
      onClick={async () => {
        sfx.pop();
        await say(text, lang);
        onDone?.();
      }}
      className="pressable no-select display flex flex-col items-center justify-center gap-1 rounded-full border-b-[6px] font-extrabold text-white"
      style={{ width: size, height: label ? size * 1.25 : size, background: color, borderColor: "rgba(59,52,85,0.22)", fontSize: size * 0.17 }}
      aria-label={`Say ${text}`}
    >
      <SpeakerIcon size={size * 0.44} strokeWidth={2.4} />
      {label ? <span>{label}</span> : null}
    </button>
  );
}

export function StarBadge({ n, color = "#FFC145" }: { n: number; color?: string }) {
  return (
    <div
      className="sticker flex items-center gap-2 px-4 py-2"
      style={{ background: `${color}22`, borderColor: `${color}66` }}
      aria-label={`${n} stars`}
    >
      <StarIcon size={26} className="text-[#F2A62B]" />
      <span className="display text-[1.5rem] font-extrabold leading-none text-ink">{n}</span>
    </div>
  );
}

export function ProgressDots({ total, done, color }: { total: number; done: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="h-3.5 w-3.5 rounded-full border-2 transition-all"
          style={{
            borderColor: `${color}88`,
            background: i < done ? color : "transparent",
            transform: i === done - 1 ? "scale(1.25)" : undefined,
          }}
        />
      ))}
    </div>
  );
}

export function StagePanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex w-full flex-1 flex-col items-center justify-center gap-6 ${className}`}>{children}</div>;
}
