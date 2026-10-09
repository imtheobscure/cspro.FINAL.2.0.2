"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ArtTile } from "./ArtTile";
import { IconSpeaker, IconStar } from "./Icons";
import type { Lang, Word } from "@/lib/data/types";
import { label } from "@/lib/data";

export type Variant = "coral" | "sun" | "sage" | "sky" | "plum" | "berry" | "paper" | "ink";

const V: Record<Variant, string> = {
  coral: "bg-coral text-white border-[#d9694f]",
  sun: "bg-sun text-ink border-[#dcac3d]",
  sage: "bg-sage text-white border-[#74a681]",
  sky: "bg-sky text-white border-[#649ac5]",
  plum: "bg-plum text-white border-[#9a7ac0]",
  berry: "bg-berry text-white border-[#cd5473]",
  paper: "bg-paper text-ink border-sand",
  ink: "bg-ink text-cream border-[#1f1c18]",
};

const SIZES = {
  sm: "text-xl px-4 py-2 rounded-[1.1rem]",
  md: "text-2xl px-6 py-3 rounded-[1.3rem]",
  lg: "text-3xl px-8 py-4 rounded-[1.6rem]",
  xl: "text-4xl px-10 py-6 rounded-[1.9rem]",
} as const;

export function BigButton({
  children,
  onClick,
  variant = "coral",
  size = "lg",
  className = "",
  disabled,
  title,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: keyof typeof SIZES;
  className?: string;
  disabled?: boolean;
  title?: string;
  full?: boolean;
}) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97, y: 2 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`soft-ring no-select font-display font-bold border-b-[5px] inline-flex items-center justify-center gap-3 leading-tight
        ${V[variant]} ${SIZES[size]} ${full ? "w-full" : ""} ${disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function IconButton({
  children,
  onClick,
  variant = "paper",
  className = "",
  title,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  title?: string;
  active?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`soft-ring no-select grid place-items-center rounded-[1.1rem] border-b-[4px] h-14 w-14 cursor-pointer
        ${V[variant]} ${active ? "ring-4 ring-sky/60" : ""} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function SpeakerButton({
  onClick,
  size = "lg",
  variant = "coral",
  title = "Listen",
  busy = false,
}: {
  onClick: () => void;
  size?: keyof typeof SIZES;
  variant?: Variant;
  title?: string;
  busy?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`soft-ring no-select grid place-items-center rounded-full border-b-[5px] cursor-pointer ${V[variant]}
        ${size === "sm" ? "h-12 w-12" : size === "md" ? "h-16 w-16" : size === "lg" ? "h-20 w-20" : "h-28 w-28"}
        ${busy ? "animate-beat" : ""}`}
    >
      <IconSpeaker size={size === "sm" ? 24 : size === "md" ? 30 : size === "lg" ? 38 : 52} />
    </motion.button>
  );
}

export function Chip({
  children,
  active,
  onClick,
  color,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`soft-ring no-select font-display font-bold text-lg px-4 py-2 rounded-full border-2 transition-colors cursor-pointer
        ${active ? "text-white border-transparent" : "bg-paper text-inksoft border-sand hover:border-ink/20"}`}
      style={active ? { background: color ?? "#f2836b" } : undefined}
    >
      {children}
    </button>
  );
}

export function StarRow({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <IconStar
          key={i}
          size={26}
          className={i < n ? "text-sun" : "text-sand"}
          style={{ color: i < n ? undefined : "#e8dcc8" }}
        />
      ))}
    </div>
  );
}

/** The big picture + word card used across every mode. */
export function WordCard({
  word,
  lang,
  homeLang,
  mono,
  art = 180,
  showWord = true,
  color = "#f2836b",
  onClick,
  className = "",
  dim = false,
}: {
  word: Word;
  lang: Lang;
  homeLang: Lang;
  mono: boolean;
  art?: number;
  showWord?: boolean;
  color?: string;
  onClick?: () => void;
  className?: string;
  dim?: boolean;
}) {
  const primary = label(word, lang);
  const secondary = !mono && homeLang !== lang ? label(word, homeLang) : "";
  return (
    <div
      onClick={onClick}
      className={`no-select flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-paper px-6 py-7 tile-shadow transition
        ${onClick ? "cursor-pointer hover:-translate-y-0.5" : ""} ${dim ? "opacity-40 grayscale" : ""} ${className}`}
    >
      <ArtTile word={word} size={art} color={color} float />
      {showWord && (
        <div className="text-center">
          <div className="font-display text-4xl leading-tight font-extrabold" style={{ color }}>
            {primary}
          </div>
          {lang === "zh" && word.py && (
            <div className="mt-1 text-xl font-bold tracking-wide text-inksoft">{word.py}</div>
          )}
          {secondary && <div className="mt-1 text-2xl font-bold text-inksoft">{secondary}</div>}
        </div>
      )}
    </div>
  );
}
