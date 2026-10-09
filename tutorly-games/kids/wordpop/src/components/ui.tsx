"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { sfx } from "@/lib/sfx";

/**
 * In-app navigation is hash based (`#/theme/pets`) so the static export works
 * from any folder, including deep links and a hard refresh. A plain <a> is
 * enough — the hashchange listener in `useRoute()` does the rest.
 */
export const toHash = (target: string) => (target.startsWith("#") ? target : `#${target}`);

type Tone = "coral" | "sky" | "mint" | "sun" | "lilac" | "white" | "ink";
const TONES: Record<Tone, string> = {
  coral: "bg-coral text-white [--shadow:#d9584a]",
  sky: "bg-sky text-ink [--shadow:#4ba3e3]",
  mint: "bg-mint text-ink [--shadow:#4fbf8c]",
  sun: "bg-sun text-ink [--shadow:#e0a52e]",
  lilac: "bg-lilac text-ink [--shadow:#a48be6]",
  white: "bg-white text-ink [--shadow:#e3d9c8]",
  ink: "bg-ink text-white [--shadow:#151b24]",
};

export function BigButton({
  children, onClick, tone = "coral", className = "", size = "lg", disabled, href, title,
}: {
  children: ReactNode; onClick?: () => void; tone?: Tone; className?: string;
  size?: "sm" | "md" | "lg" | "xl"; disabled?: boolean; href?: string; title?: string;
}) {
  const sz = { sm: "px-4 py-2 text-base", md: "px-5 py-3 text-lg", lg: "px-7 py-4 text-2xl", xl: "px-9 py-5 text-3xl" }[size];
  const cls = `btn-3d font-display inline-flex items-center justify-center gap-2 rounded-full font-bold ${TONES[tone]} ${sz} ${className}`;
  const handle = () => { sfx.pop(); onClick?.(); };
  if (href) return <a href={toHash(href)} onClick={() => sfx.pop()} className={cls} title={title}>{children}</a>;
  return <button onClick={handle} disabled={disabled} className={cls} title={title}>{children}</button>;
}

export function Stars({ count, max = 3, size = "text-4xl" }: { count: number; max?: number; size?: string }) {
  return (
    <div className={`flex items-center justify-center gap-1 ${size}`} aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < count ? "anim-star drop-shadow" : "opacity-25 grayscale"} style={{ animationDelay: `${i * 0.15}s` }}>⭐</span>
      ))}
    </div>
  );
}

export function ProgressDots({ total, current, done }: { total: number; current: number; done?: boolean[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-3.5 w-3.5 rounded-full transition-all ${
            i === current ? "scale-125 bg-coral" : done?.[i] ? "bg-mint-deep" : "bg-ink/15"
          }`}
        />
      ))}
    </div>
  );
}

const CONF_COLORS = ["#ff8c7a", "#7cc4f5", "#8fd9b6", "#ffd166", "#c6b6f2", "#ffc8dd"];
export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.6,
        dx: (Math.random() - 0.5) * 200,
        color: CONF_COLORS[i % CONF_COLORS.length],
        w: 8 + Math.random() * 8,
        h: 10 + Math.random() * 10,
        round: Math.random() > 0.5,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.round ? "50%" : 3,
            animation: `confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
            ["--dx" as string]: `${p.dx}px`,
          }}
        />
      ))}
    </div>
  );
}

/** Brief floating feedback like "+⭐" or "Great!" that pops and disappears. */
export function Toast({ text, tone = "mint" }: { text: string; tone?: "mint" | "coral" | "sun" }) {
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 1100); return () => clearTimeout(t); }, []);
  if (!show) return null;
  const bg = { mint: "bg-mint", coral: "bg-coral text-white", sun: "bg-sun" }[tone];
  return (
    <div className="pointer-events-none fixed inset-x-0 top-28 z-50 flex justify-center">
      <div className={`anim-pop font-display rounded-full px-8 py-3 text-3xl font-bold shadow-xl ${bg}`}>{text}</div>
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={toHash(href)} onClick={() => sfx.tick()} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-bold text-ink-soft ring-1 ring-ink/10 hover:bg-cream-2">
      ← {label}
    </a>
  );
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
