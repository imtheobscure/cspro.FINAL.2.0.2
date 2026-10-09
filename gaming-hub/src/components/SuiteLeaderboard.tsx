import { useEffect, useRef, useState } from "react";
import { getStreakFace, getTier, type Player } from "./SuitePlayersTab";

const TIERS = [
  { name: "Legendary", min: 150, emoji: "🥇", ringClass: "border-amber-400", glowColor: "rgba(251,191,36,0.6)", textClass: "text-amber-300" },
  { name: "Epic",      min: 50,  emoji: "🔮", ringClass: "border-fuchsia-400", glowColor: "rgba(217,70,239,0.55)", textClass: "text-fuchsia-300" },
  { name: "Common",    min: 0,   emoji: "⚪", ringClass: "border-slate-500", glowColor: "rgba(148,163,184,0.4)", textClass: "text-slate-200" },
];

interface Props {
  players: Player[];
  activeId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
}

export function SuiteLeaderboard({ players, activeId, onSelect, compact }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const prevScores = useRef<Record<string, number>>({});
  const [shaking, setShaking] = useState<Record<string, "up" | "down" | undefined>>({});
  const [floats, setFloats] = useState<{ id: string; delta: number; key: number }[]>([]);

  useEffect(() => {
    const next: Record<string, "up" | "down" | undefined> = {};
    const newFloats: typeof floats = [];
    players.forEach(p => {
      const prev = prevScores.current[p.id];
      if (prev !== undefined && prev !== p.score) {
        const delta = p.score - prev;
        next[p.id] = delta > 0 ? "up" : "down";
        newFloats.push({ id: p.id, delta, key: Date.now() + Math.random() });
      }
      prevScores.current[p.id] = p.score;
    });
    if (Object.keys(next).length) {
      setShaking(next);
      setFloats(f => [...f, ...newFloats]);
      const t = setTimeout(() => setShaking({}), 700);
      const t2 = setTimeout(() => setFloats(f => f.filter(x => !newFloats.some(n => n.key === x.key))), 1200);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [players]);

  const max = Math.max(1, ...sorted.map(p => p.score));

  return (
    <div className={`relative space-y-2 ${compact ? "" : "p-1"}`}>
      {sorted.map((p, idx) => {
        const tier = getTier(p.score, TIERS);
        const face = getStreakFace(p.streak, p.wrongStreak);
        const shake = shaking[p.id];
        const isActive = activeId === p.id;
        const myFloats = floats.filter(f => f.id === p.id);
        return (
          <button
            key={p.id}
            onClick={() => onSelect?.(p.id)}
            className={`relative w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left overflow-hidden transition-all
              ${tier.ringClass}
              ${isActive ? "scale-[1.02]" : ""}
              ${shake === "up" ? "animate-shake-pop" : shake === "down" ? "animate-shake-fall" : ""}
            `}
            style={{
              background: `linear-gradient(90deg, ${tier.glowColor}, rgba(0,0,0,0.55))`,
              boxShadow: `0 8px 25px rgba(0,0,0,0.45), inset 0 0 30px ${tier.glowColor}`,
            }}
          >
            {/* Rank badge */}
            <div className="text-2xl font-black w-8 text-center">
              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
            </div>

            {/* Big glossy avatar */}
            <div className="relative">
              <div className={`text-5xl glossy-emoji ${shake === "up" ? "animate-bounce" : ""}`} style={{ filter: `drop-shadow(0 8px 12px ${tier.glowColor})` }}>
                {p.avatar}
              </div>
              {p.streak >= 3 && <span className="absolute -top-2 -right-1 text-2xl animate-bounce">🔥</span>}
            </div>

            {/* Streak face emoji */}
            <div className="text-3xl glossy-emoji" title={`Streak face: ${face}`}>{face}</div>

            <div className="flex-1 min-w-0">
              <div className="font-black text-sm truncate">{p.name}</div>
              <div className={`text-[10px] uppercase tracking-widest font-bold ${tier.textClass}`}>{tier.name}</div>
              <div className="h-1.5 mt-1 rounded-full bg-black/40 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${shake === "up" ? "animate-pulse" : ""}`}
                  style={{ width: `${(p.score / max) * 100}%`, background: `linear-gradient(90deg, ${tier.glowColor}, rgba(255,255,255,0.8))` }} />
              </div>
            </div>

            <div className={`text-2xl font-black ${tier.textClass}`} style={{ textShadow: `0 0 12px ${tier.glowColor}` }}>
              {p.score}
            </div>

            {/* Floating delta numbers */}
            {myFloats.map(f => (
              <span key={f.key}
                className={`absolute right-4 top-1 text-xl font-black animate-float-up pointer-events-none ${f.delta > 0 ? "text-emerald-300" : "text-rose-400"}`}
              >
                {f.delta > 0 ? "+" : ""}{f.delta}
              </span>
            ))}
          </button>
        );
      })}
    </div>
  );
}
