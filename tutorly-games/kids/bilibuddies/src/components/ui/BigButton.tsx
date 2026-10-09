"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { sfx } from "@/lib/sfx";

type Variant = "primary" | "mint" | "sky" | "sun" | "grape" | "soft" | "ghost" | "ink";

const STYLES: Record<Variant, string> = {
  primary: "bg-brand text-white border-[#e0563a]",
  mint: "bg-mint text-white border-[#26917a]",
  sky: "bg-sky text-white border-[#3d7fc4]",
  sun: "bg-sun text-ink border-[#dfa12a]",
  grape: "bg-grape text-white border-[#8568c0]",
  soft: "bg-white text-ink border-line",
  ghost: "bg-transparent text-inksoft border-transparent",
  ink: "bg-ink text-white border-[#251f3a]",
};

const SIZES = {
  sm: "text-[0.95rem] px-4 py-2 rounded-2xl gap-2",
  md: "text-[1.15rem] px-5 py-3 rounded-[20px] gap-2.5",
  lg: "text-[1.45rem] px-7 py-4 rounded-[26px] gap-3",
  xl: "display text-[1.9rem] px-9 py-6 rounded-[32px] gap-4",
};

export function BigButton({
  variant = "soft",
  size = "md",
  children,
  className = "",
  click = true,
  href,
  ...rest
}: {
  variant?: Variant;
  size?: keyof typeof SIZES;
  children: ReactNode;
  className?: string;
  click?: boolean;
  /** With a hash link the button becomes an anchor — same look, real navigation. */
  href?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `pressable no-select display inline-flex items-center justify-center border-b-[5px] font-bold shadow-[0_5px_0_rgba(59,52,85,0.10)] disabled:cursor-not-allowed disabled:opacity-45 ${STYLES[variant]} ${SIZES[size]} ${className}`;
  if (href) {
    return (
      <a href={href} onClick={() => { if (click) sfx.tap(); }} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button
      {...rest}
      onClick={(e) => {
        if (click) sfx.tap();
        rest.onClick?.(e);
      }}
      className={cls}
    >
      {children}
    </button>
  );
}

export function Chip({
  active,
  children,
  onClick,
  className = "",
  color,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  color?: string;
}) {
  return (
    <button
      onClick={() => {
        sfx.tap();
        onClick?.();
      }}
      style={active && color ? { backgroundColor: color, borderColor: color } : undefined}
      className={`pressable no-select display rounded-2xl border-2 px-3.5 py-2 text-[1rem] font-bold transition ${
        active
          ? color
            ? "text-white shadow-[0_4px_0_rgba(59,52,85,0.14)]"
            : "border-ink bg-ink text-white shadow-[0_4px_0_rgba(59,52,85,0.14)]"
          : "border-line bg-white text-inksoft hover:border-ink/25"
      } ${className}`}
    >
      {children}
    </button>
  );
}
