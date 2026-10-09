"use client";

import { POWERUPS, powerupById, type PowerUpDef } from "@/lib/types";

const rarityRing: Record<string, string> = {
  common: "ring-slate-400/50",
  rare: "ring-blue-400/70",
  epic: "ring-purple-400/80",
  legendary: "ring-amber-300",
};
const rarityGlow: Record<string, string> = {
  common: "",
  rare: "shadow-[0_0_20px_rgba(59,130,246,0.4)]",
  epic: "shadow-[0_0_26px_rgba(168,85,247,0.5)]",
  legendary: "anim-glow",
};

export function PowerUpDrop({ id, onClose }: { id: string; onClose: () => void }) {
  const p = powerupById(id);
  if (!p) return null;
  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className={`anim-pop relative w-[86%] max-w-sm rounded-3xl p-6 text-center glass-strong ring-4 ${rarityRing[p.rarity]} ${rarityGlow[p.rarity]}`}>
        <div className="shimmer pointer-events-none absolute inset-0 rounded-3xl opacity-40" />
        <div className="mb-1 text-sm font-black uppercase tracking-widest" style={{ color: p.color }}>
          {p.rarity} Power-Up!
        </div>
        <div className="my-3 text-7xl md:text-8xl anim-pop" style={{ filter: `drop-shadow(0 0 20px ${p.color})` }}>
          {p.emoji}
        </div>
        <h3 className="text-3xl md:text-4xl font-black">{p.name}</h3>
        <p className="mx-auto mt-2 max-w-xs text-base md:text-lg text-slate-300">{p.desc}</p>
        <p className="mt-3 rounded-xl bg-white/5 p-2 text-sm text-cyan-200">💡 {p.guide}</p>
        <button
          onClick={onClose}
          className="btn-glow mt-5 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-3 text-xl font-black"
        >
          Add to Inventory 🎒
        </button>
      </div>
    </div>
  );
}

export function PowerUpBar({
  owned,
  onActivate,
  activated,
  disabled,
}: {
  owned: string[];
  onActivate: (id: string) => void;
  activated: string[];
  disabled?: boolean;
}) {
  if (!owned.length) return null;
  const counts: Record<string, number> = {};
  owned.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(counts).map(([id, count]) => {
        const p = powerupById(id);
        if (!p) return null;
        const on = activated.includes(id);
        return (
          <button
            key={id}
            disabled={disabled}
            onClick={() => onActivate(id)}
            title={p.desc}
            className={`relative flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-lg font-bold ring-2 transition ${
              on ? "bg-green-500/30 ring-green-400 scale-105" : "glass ring-white/10 hover:ring-white/30"
            }`}
            style={on ? { boxShadow: `0 0 16px ${p.color}` } : {}}
          >
            <span className="text-2xl">{p.emoji}</span>
            {count > 1 && (
              <span className="rounded-full bg-white/20 px-1.5 text-xs font-black">×{count}</span>
            )}
            {on && <span className="text-xs text-green-300">ARMED</span>}
          </button>
        );
      })}
    </div>
  );
}

export function PowerUpGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
      <div className="glass-strong anim-pop w-full max-w-2xl rounded-3xl p-5 md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-black">🎓 Power-Up Guide</h2>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-lg font-bold hover:bg-white/20">✕</button>
        </div>
        <div className="grid max-h-[70vh] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
          {POWERUPS.map((p: PowerUpDef) => (
            <div key={p.id} className={`glass rounded-2xl p-3 ring-1 ${rarityRing[p.rarity]}`}>
              <div className="flex items-center gap-2">
                <span className="text-3xl">{p.emoji}</span>
                <div>
                  <div className="font-black">{p.name}</div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: p.color }}>{p.rarity}</div>
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-300">{p.desc}</p>
              <p className="mt-1 text-xs text-cyan-200">💡 {p.guide}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
