"use client";

import { useState } from "react";
import { Word } from "@/lib/types";
import { twemojiUrl } from "@/lib/emoji";

/** Emoji drawn with the Twemoji SVG set (one coherent art family), falling back to the system glyph. */
export function Emoji({ emoji, className = "", size }: { emoji: string; className?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`inline-block leading-none ${className}`} style={size ? { fontSize: size * 0.85 } : undefined} role="img" aria-label={emoji}>
        {emoji}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={twemojiUrl(emoji)}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      className={`inline-block select-none ${className}`}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}

const SHAPES: Record<string, (fill: string) => React.ReactNode> = {
  circle: (f) => <circle cx="50" cy="50" r="40" fill={f} />,
  square: (f) => <rect x="12" y="12" width="76" height="76" rx="8" fill={f} />,
  triangle: (f) => <path d="M50 10 L92 86 L8 86 Z" fill={f} strokeLinejoin="round" stroke={f} strokeWidth="8" />,
  rectangle: (f) => <rect x="6" y="26" width="88" height="48" rx="8" fill={f} />,
  star: (f) => <path d="M50 6l13 27 30 4-22 21 5 30-26-14-26 14 5-30L7 37l30-4z" fill={f} stroke={f} strokeWidth="6" strokeLinejoin="round" />,
  heart: (f) => <path d="M50 88 C20 66 6 50 6 32 6 18 18 8 30 8c9 0 16 5 20 12 4-7 11-12 20-12 12 0 24 10 24 24 0 18-14 34-44 56z" fill={f} />,
  oval: (f) => <ellipse cx="50" cy="50" rx="30" ry="44" fill={f} />,
  diamond: (f) => <path d="M50 6 L90 50 L50 94 L10 50 Z" fill={f} stroke={f} strokeWidth="6" strokeLinejoin="round" />,
};
const SHAPE_COLORS: Record<string, string> = {
  circle: "#42A5F5", square: "#EF5350", triangle: "#66BB6A", rectangle: "#FFA726",
  star: "#FDD835", heart: "#F06292", oval: "#AB47BC", diamond: "#26C6DA",
};

export function WordImage({ word, size = 160, countEmoji, className = "" }: { word: Word; size?: number; countEmoji?: string; className?: string }) {
  if (word.shape) {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-label={word.t.en}>
        {SHAPES[word.shape]?.(SHAPE_COLORS[word.shape] ?? "#42A5F5")}
      </svg>
    );
  }
  if (word.color) {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-label={word.t.en}>
        <path
          d="M50 8c14 0 20 8 30 14s14 14 12 28-8 22-18 30-20 14-32 10S10 76 8 62 10 34 18 24 36 8 50 8z"
          fill={word.color}
          stroke={word.color === "#FFFFFF" ? "#cfd8dc" : "rgba(0,0,0,0.08)"}
          strokeWidth="3"
        />
        <ellipse cx="36" cy="30" rx="10" ry="6" fill="rgba(255,255,255,0.45)" transform="rotate(-25 36 30)" />
      </svg>
    );
  }
  if (word.n !== undefined) {
    const n = word.n;
    const cols = n <= 5 ? n : n <= 10 ? 5 : n <= 12 ? 6 : 5;
    const dot = n <= 5 ? size / 5.5 : n <= 10 ? size / 6.5 : size / 8;
    return (
      <div className={`flex flex-col items-center justify-center gap-2 ${className}`} style={{ width: size, minHeight: size }}>
        <div className="font-display font-bold leading-none text-ink" style={{ fontSize: size * 0.45 }}>{n}</div>
        <div className="grid justify-items-center gap-1" style={{ gridTemplateColumns: `repeat(${cols}, ${dot}px)` }}>
          {Array.from({ length: n }).map((_, i) => (
            <Emoji key={i} emoji={countEmoji ?? "🍎"} size={dot} />
          ))}
        </div>
      </div>
    );
  }
  if (word.letter) {
    return (
      <div className={`flex items-center justify-center gap-3 ${className}`} style={{ width: size, height: size }}>
        <div className="font-display font-bold leading-none text-sky-deep" style={{ fontSize: size * 0.5 }}>
          {word.letter}
          <span className="text-coral-deep">{word.letter.toLowerCase()}</span>
        </div>
        <Emoji emoji={word.emoji} size={size * 0.42} />
      </div>
    );
  }
  return <Emoji emoji={word.emoji} size={size} className={className} />;
}
