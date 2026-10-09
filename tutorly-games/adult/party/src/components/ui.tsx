"use client";

import React from "react";
import { sfx } from "@/lib/audio";

export function Btn({
  children, onClick, tone = "slate", size = "md", className = "", disabled, title,
}: {
  children: React.ReactNode; onClick?: () => void; tone?: "slate" | "amber" | "green" | "red" | "blue" | "violet" | "ghost";
  size?: "sm" | "md" | "lg"; className?: string; disabled?: boolean; title?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-800/80 hover:bg-slate-700 text-slate-100 border-slate-600/60",
    amber: "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_24px_-6px_rgba(245,158,11,.8)]",
    green: "bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300 shadow-[0_0_24px_-6px_rgba(16,185,129,.8)]",
    red: "bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_24px_-6px_rgba(244,63,94,.8)]",
    blue: "bg-sky-600 hover:bg-sky-500 text-white border-sky-400",
    violet: "bg-violet-600 hover:bg-violet-500 text-white border-violet-400",
    ghost: "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10",
  };
  const sizes: Record<string, string> = { sm: "px-2.5 py-1 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-5 py-3 text-base" };
  return (
    <button
      type="button" title={title} disabled={disabled}
      onClick={() => { if (disabled) return; sfx("click"); onClick?.(); }}
      className={`rounded-xl border font-semibold tracking-tight transition active:scale-[.97] disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Panel({ title, right, children, className = "" }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur shadow-xl ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">{title}</h3>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`mt-8 w-full ${wide ? "max-w-5xl" : "max-w-2xl"} rounded-3xl border border-white/15 bg-slate-900 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
          <Btn tone="ghost" size="sm" onClick={onClose}>Close ✕</Btn>
        </header>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Avatar({ src, name, size = 40, ring }: { src?: string; name: string; size?: number; ring?: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-xs font-black text-white"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
    >
      {src ? <img src={src} alt={name} width={size} height={size} className="h-full w-full object-cover" /> : initials}
    </span>
  );
}

export function Ring({ value, max, size = 62, label, onClick }: { value: number; max: number; size?: number; label?: string; onClick?: () => void }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const danger = pct < 0.25;
  return (
    <button type="button" onClick={onClick} className="relative" style={{ width: size, height: size }} title="Click to pause or resume">
      <svg width={size} height={size} className={danger ? "animate-pulse" : ""}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.12)" strokeWidth="5" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth="5" fill="none" strokeLinecap="round"
          stroke={danger ? "#f43f5e" : pct < 0.5 ? "#f59e0b" : "#22d3ee"}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-[11px] font-black text-white">
        {label ?? Math.ceil(value)}
      </span>
    </button>
  );
}

export function Chip({ children, colour = "#38bdf8" }: { children: React.ReactNode; colour?: string }) {
  return (
    <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
      style={{ borderColor: `${colour}66`, color: colour, background: `${colour}14` }}>
      {children}
    </span>
  );
}

export function Bar({ value, colour = "#22d3ee" }: { value: number; colour?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full transition-all duration-200" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: colour }} />
    </div>
  );
}

export function useTicker(active: boolean, onTick: () => void, ms = 1000) {
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(onTick, ms);
    return () => clearInterval(t);
  });
}
