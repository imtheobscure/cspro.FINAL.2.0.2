"use client";

import { useState } from "react";
import type { Word } from "@/lib/data/types";

const CDN = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/";

/** Twemoji file naming: drop FE0F unless the sequence contains a ZWJ. */
export function twemojiCode(emoji: string): string {
  const hasZwj = emoji.includes("\u200d");
  return [...emoji]
    .filter((c) => hasZwj || c !== "\ufe0f")
    .map((c) => c.codePointAt(0)!.toString(16))
    .join("-");
}

export function twemojiUrl(emoji: string): string {
  return `${CDN}${twemojiCode(emoji)}.svg`;
}

const SHAPES: Record<string, string> = {
  circle: "M50 8a42 42 0 1 1 0 84 42 42 0 0 1 0-84z",
  square: "M14 14h72v72H14z",
  triangle: "M50 10 92 84H8z",
  rectangle: "M10 26h80v48H10z",
  star: "M50 6l13.1 27.6L92 38l-21 21.3L76 90 50 75.4 24 90l5-30.7L8 38l28.9-4.4z",
  heart:
    "M50 90S10 63 10 36C10 22 21 12 33 12c8 0 14 4 17 10 3-6 9-10 17-10 12 0 23 10 23 24 0 27-40 54-40 54z",
  oval: "M50 12c22 0 40 17 40 38s-18 38-40 38S10 71 10 50s18-38 40-38z",
  diamond: "M50 6l42 44-42 44L8 50z",
};

function ShapeArt({ shape, color }: { shape: string; color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <path d={SHAPES[shape] ?? SHAPES.circle} fill={color} stroke="#35302a" strokeOpacity="0.14" strokeWidth="3" />
    </svg>
  );
}

function ColorArt({ hex }: { hex: string }) {
  const light = hex.toLowerCase() === "#ffffff";
  return (
    <div
      className="relative h-full w-full rounded-full"
      style={{
        background: `radial-gradient(circle at 32% 28%, #ffffffaa 0%, transparent 46%), ${hex}`,
        border: light ? "4px solid #e7dcc9" : "4px solid rgba(53,48,42,0.10)",
        boxShadow: "inset 0 -10px 24px rgba(53,48,42,0.16)",
      }}
    />
  );
}

function DigitArt({ n, color }: { n: number; color: string }) {
  const dots = Array.from({ length: Math.min(n, 10) });
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
      <div
        className="font-display text-[3.6em] leading-none font-extrabold"
        style={{ color, fontSize: "min(9rem, 12cqw)" }}
      >
        {n}
      </div>
      <div className="flex max-w-full flex-wrap justify-center gap-1 px-2">
        {dots.map((_, i) => (
          <span key={i} className="h-[0.42em] w-[0.42em] rounded-full" style={{ background: color, fontSize: "1.1rem" }} />
        ))}
      </div>
    </div>
  );
}

function LetterArt({ letter, color }: { letter: string; color: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <span
        className="font-display leading-none font-extrabold"
        style={{ color, fontSize: "min(9rem, 16cqw)", textShadow: "0 6px 0 rgba(53,48,42,0.08)" }}
      >
        {letter}
        <span className="ml-2 text-[0.45em] opacity-70">{letter.toLowerCase()}</span>
      </span>
    </div>
  );
}

export function ArtTile({
  word,
  size = 168,
  color = "#f2836b",
  className = "",
  float = false,
}: {
  word: Word;
  size?: number;
  color?: string;
  className?: string;
  float?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  const inner = word.hex ? (
    <div style={{ width: size * 0.78, height: size * 0.78 }}>
      <ColorArt hex={word.hex} />
    </div>
  ) : word.shape ? (
    <div style={{ width: size * 0.86, height: size * 0.86 }}>
      <ShapeArt shape={word.shape} color={color} />
    </div>
  ) : word.digit !== undefined ? (
    <div style={{ width: size, height: size }}>
      <DigitArt n={word.digit} color={color} />
    </div>
  ) : word.letter ? (
    <div style={{ width: size, height: size }}>
      <LetterArt letter={word.letter} color={color} />
    </div>
  ) : failed ? (
    <span style={{ fontSize: size * 0.72, lineHeight: 1 }} className="no-select">
      {word.e}
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={twemojiUrl(word.e)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="no-select pointer-events-none object-contain"
      draggable={false}
    />
  );

  return (
    <div
      className={`flex items-center justify-center ${float ? "animate-floaty" : ""} ${className}`}
      style={{ width: size, height: size, containerType: "inline-size" }}
      aria-hidden
    >
      {inner}
    </div>
  );
}
