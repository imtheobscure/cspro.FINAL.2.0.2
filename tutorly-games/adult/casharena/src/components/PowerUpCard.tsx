"use client";
import type { PowerDef } from "@/lib/engine";

export function PowerCard({ def, size = "lg", onClick, count, disabled }: { def: PowerDef; size?: "sm" | "lg"; onClick?: () => void; count?: number; disabled?: boolean }) {
  const lg = size === "lg";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${def.color} text-left text-white transition-transform ${onClick && !disabled ? "hover:scale-105 active:scale-95" : ""} rarity-${def.rarity} ${disabled ? "opacity-50 grayscale" : ""} ${
        lg ? "w-64 p-5" : "w-36 p-3"
      }`}
    >
      <div className="shimmer absolute inset-0 pointer-events-none" />
      <div className={`${lg ? "text-6xl" : "text-4xl"} drop-shadow-lg`}>{def.icon}</div>
      <div className={`mt-2 font-black leading-tight ${lg ? "text-2xl" : "text-base"}`}>{def.name}</div>
      <div className={`mt-1 uppercase tracking-widest font-bold ${lg ? "text-xs" : "text-[10px]"} opacity-80`}>{def.rarity}</div>
      {lg && <div className="mt-2 text-sm font-semibold opacity-95 leading-snug">{def.desc}</div>}
      {count !== undefined && count > 1 && (
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-sm font-black">×{count}</div>
      )}
    </button>
  );
}

export function PowerDropModal({ def, onClose }: { def: PowerDef; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="text-center">
        <div className="mb-4 text-3xl font-black gold-text anim-fade">POWER-UP DROP!</div>
        <div className="anim-card inline-block" style={{ perspective: "1000px" }}>
          <PowerCard def={def} />
        </div>
        <div className="mt-6 text-lg text-white/80 anim-fade">Added to your inventory · tap anywhere to continue</div>
      </div>
    </div>
  );
}
