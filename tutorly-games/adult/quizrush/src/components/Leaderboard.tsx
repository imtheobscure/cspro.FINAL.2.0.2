"use client";

import { useEffect, useRef, useState } from "react";

export interface LBPlayer {
  id: number;
  name: string;
  avatar: string;
  cash: number;
  streak: number;
  rank: number;
  connected?: boolean;
  answeredCount?: number;
  correctCount?: number;
  lastRank?: number;
}

function money(n: number) {
  return "$" + n.toLocaleString();
}

export default function Leaderboard({
  players,
  highlightId,
  compact = false,
}: {
  players: LBPlayer[];
  highlightId?: number;
  compact?: boolean;
}) {
  const prevRanks = useRef<Record<number, number>>({});
  const [deltas, setDeltas] = useState<Record<number, number>>({});

  useEffect(() => {
    const d: Record<number, number> = {};
    players.forEach((p) => {
      const prev = prevRanks.current[p.id];
      if (prev !== undefined && prev !== p.rank) d[p.id] = prev - p.rank;
      prevRanks.current[p.id] = p.rank;
    });
    if (Object.keys(d).length) {
      setDeltas(d);
      const t = setTimeout(() => setDeltas({}), 1400);
      return () => clearTimeout(t);
    }
  }, [players]);

  const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`);

  return (
    <div className="flex flex-col gap-2">
      {players.map((p) => {
        const delta = deltas[p.id];
        const isTop = p.rank === 1;
        return (
          <div
            key={p.id}
            className={`leader-row flex items-center gap-3 rounded-2xl px-3 py-2.5 md:px-4 md:py-3 ${
              delta && delta > 0 ? "anim-rank-up" : delta && delta < 0 ? "anim-rank-down" : ""
            } ${
              p.id === highlightId
                ? "bg-indigo-500/25 ring-2 ring-indigo-400"
                : isTop
                  ? "bg-amber-400/15 ring-1 ring-amber-300/40"
                  : "glass"
            }`}
          >
            <div
              className={`flex h-9 w-9 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-xl text-lg md:text-2xl font-black ${
                isTop ? "bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-900" : "bg-white/10"
              }`}
            >
              {medal(p.rank)}
            </div>
            <div className="text-2xl md:text-4xl">{p.avatar}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-base md:text-2xl font-bold">{p.name}</span>
                {p.streak >= 2 && (
                  <span className="shrink-0 rounded-full bg-orange-500/25 px-2 py-0.5 text-xs md:text-sm font-bold text-orange-300">
                    🔥 {p.streak}
                  </span>
                )}
                {p.connected === false && <span className="text-xs text-slate-500">offline</span>}
              </div>
            </div>
            {delta !== undefined && delta !== 0 && (
              <span
                className={`anim-pop shrink-0 rounded-full px-2 py-0.5 text-xs md:text-sm font-black ${
                  delta > 0 ? "bg-green-500/30 text-green-300" : "bg-red-500/30 text-red-300"
                }`}
              >
                {delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}
              </span>
            )}
            <div className={`money shrink-0 text-lg md:text-3xl ${isTop ? "text-amber-300" : "text-green-400"}`}>
              {money(p.cash)}
            </div>
          </div>
        );
      })}
      {players.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center text-slate-400">
          Waiting for players to join…
        </div>
      )}
    </div>
  );
}
