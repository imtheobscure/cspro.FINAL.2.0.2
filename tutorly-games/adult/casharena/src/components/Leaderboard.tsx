"use client";
import { useEffect, useRef, useState } from "react";
import type { PlayerPublic } from "@/lib/types";
import { avatarSrc } from "@/lib/avatars";
import { RollingCash } from "./Cash";

const ROW_H = 4.6; // rem

export function Leaderboard({ players, meId, compact = false, max = 12 }: { players: PlayerPublic[]; meId?: string; compact?: boolean; max?: number }) {
  const sorted = [...players].sort((a, b) => b.cash - a.cash).slice(0, max);
  const prevRank = useRef<Record<string, number>>({});
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  useEffect(() => {
    const next: Record<string, number> = {};
    const d: Record<string, number> = {};
    sorted.forEach((p, i) => {
      next[p.id] = i;
      const prev = prevRank.current[p.id];
      if (prev !== undefined && prev !== i) d[p.id] = prev - i;
    });
    prevRank.current = next;
    if (Object.keys(d).length) {
      setDeltas(d);
      const t = setTimeout(() => setDeltas({}), 1800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.map((p) => p.id + ":" + p.cash).join("|")]);

  const rowH = compact ? 3.4 : ROW_H;
  return (
    <div className="relative w-full" style={{ height: `${sorted.length * rowH}rem` }}>
      {sorted.map((p, i) => {
        const d = deltas[p.id];
        const me = p.id === meId;
        return (
          <div
            key={p.id}
            className={`absolute left-0 right-0 flex items-center gap-3 rounded-2xl px-3 transition-all duration-700 ease-[cubic-bezier(.2,.9,.3,1.1)] ${
              i === 0 ? "bg-gradient-to-r from-amber-500/30 to-transparent border border-amber-400/40" : me ? "bg-violet-500/25 border border-violet-400/40" : "bg-white/5 border border-white/5"
            } ${d ? "anim-rank" : ""}`}
            style={{ top: `${i * rowH}rem`, height: `${rowH - 0.4}rem` }}
          >
            <div className={`w-10 text-center font-black ${compact ? "text-lg" : "text-2xl"} ${i === 0 ? "gold-text" : i === 1 ? "text-slate-200" : i === 2 ? "text-amber-600" : "text-white/60"}`}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc(p.avatar)} alt="" className={`${compact ? "h-9 w-9" : "h-12 w-12"} rounded-full bg-white/10 ring-2 ring-white/20`} />
            <div className="flex-1 min-w-0">
              <div className={`truncate font-extrabold ${compact ? "text-base" : "text-xl"}`}>
                {p.name} {me && <span className="text-violet-300 text-sm">(you)</span>}
              </div>
              {!compact && (
                <div className="text-sm text-white/60">
                  {p.streak >= 3 ? `🔥 ${p.streak} streak · ` : ""}✅ {p.correct} · ❌ {p.wrong} {p.finished ? "· 🏁" : ""}
                </div>
              )}
            </div>
            {d !== undefined && (
              <div className={`anim-pop rounded-full px-2 py-0.5 text-sm font-black ${d > 0 ? "bg-emerald-400 text-emerald-950" : "bg-rose-500 text-white"}`}>
                {d > 0 ? `▲ +${d}` : `▼ ${d}`}
              </div>
            )}
            <RollingCash value={p.cash} className={compact ? "text-lg" : "text-2xl"} />
          </div>
        );
      })}
    </div>
  );
}
