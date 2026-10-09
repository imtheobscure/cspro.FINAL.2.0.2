import { useRef } from "react";
import { useStore, store, uid } from "../state/store";
import { Btn } from "../ui/primitives";
import { pickAvatar } from "../lib/avatars";
import type { Rarity } from "../state/types";

const rarityStyles: Record<Rarity, { ring: string; glow: string; badge: string; gradient: string }> = {
  Common: {
    ring: "ring-slate-300",
    glow: "shadow-[0_0_0_2px_#cbd5e1]",
    badge: "bg-slate-200 text-slate-700",
    gradient: "from-slate-100 to-white",
  },
  Rare: {
    ring: "ring-sky-400",
    glow: "shadow-[0_0_18px_rgba(56,189,248,0.6)]",
    badge: "bg-sky-100 text-sky-700",
    gradient: "from-sky-50 to-white",
  },
  Epic: {
    ring: "ring-fuchsia-500",
    glow: "shadow-[0_0_22px_rgba(217,70,239,0.7)]",
    badge: "bg-fuchsia-100 text-fuchsia-700",
    gradient: "from-fuchsia-50 to-white",
  },
  Legendary: {
    ring: "ring-amber-400",
    glow: "shadow-[0_0_28px_rgba(245,158,11,0.85)] animate-pulse",
    badge: "bg-gradient-to-r from-amber-300 to-orange-400 text-white",
    gradient: "from-amber-50 via-orange-50 to-white",
  },
};

export default function Leaderboard() {
  const learners = useStore((s) => s.learners);
  const npcs = useStore((s) => s.npcs);
  const fileRef = useRef<HTMLInputElement>(null);

  // Combined ranking: learners + npcs treated equally for show
  const combined = [
    ...learners.map((l) => ({ kind: "learner" as const, ...l })),
    ...npcs.map((n) => ({
      kind: "npc" as const,
      id: n.id,
      name: n.name,
      avatar: n.avatar,
      score: 0,
      badges: [],
      rarity: "Common" as Rarity,
    })),
  ].sort((a, b) => b.score - a.score);

  function addLearner() {
    const name = prompt("Learner name?");
    if (!name) return;
    store.set((s) => {
      s.learners = [
        ...s.learners,
        { id: uid("L_"), name, avatar: pickAvatar(store.get().learners.map((l) => l.avatar)), score: 0, badges: [], rarity: "Common" },
      ];
      return { ...s };
    });
  }

  function addScore(id: string, delta: number) {
    store.set((s) => {
      s.learners = s.learners.map((l) =>
        l.id === id ? evolveIfNeeded({ ...l, score: Math.max(0, l.score + delta) }) : l,
      );
      return { ...s };
    });
  }

  function evolveIfNeeded(l: any) {
    let rarity: Rarity = "Common";
    if (l.score >= 150) rarity = "Legendary";
    else if (l.score >= 80) rarity = "Epic";
    else if (l.score >= 30) rarity = "Rare";
    return { ...l, rarity };
  }

  function addBadge(id: string) {
    const b = prompt("Badge emoji (e.g. 🏆 🌟 🎯)?");
    if (!b) return;
    store.set((s) => {
      s.learners = s.learners.map((l) => (l.id === id ? { ...l, badges: [...l.badges, b] } : l));
      return { ...s };
    });
  }

  function removeLearner(id: string) {
    if (!confirm("Remove this learner?")) return;
    store.set((s) => {
      s.learners = s.learners.filter((l) => l.id !== id);
      return { ...s };
    });
  }

  async function pasteAvatar(id: string) {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        for (const t of it.types) {
          if (t.startsWith("image/")) {
            const blob = await it.getType(t);
            const reader = new FileReader();
            reader.onload = () => {
              const data = reader.result as string;
              store.set((s) => {
                s.learners = s.learners.map((l) => (l.id === id ? { ...l, avatar: data } : l));
                return { ...s };
              });
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      fileRef.current?.click();
      fileRef.current!.onchange = () => {
        const f = fileRef.current?.files?.[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          const data = r.result as string;
          store.set((s) => {
            s.learners = s.learners.map((l) => (l.id === id ? { ...l, avatar: data } : l));
            return { ...s };
          });
        };
        r.readAsDataURL(f);
      };
    } catch {
      fileRef.current?.click();
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <input type="file" ref={fileRef} accept="image/*" hidden />
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div className="flex-1">
            <div className="font-bold text-slate-800">Leaderboard</div>
            <div className="text-[11px] text-slate-500">Live ranking · Earn XP to evolve</div>
          </div>
          <Btn size="sm" variant="primary" onClick={addLearner}>＋ Learner</Btn>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {combined.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-12">No participants yet.</div>
        )}
        {combined.map((p, idx) => {
          const r = rarityStyles[p.rarity];
          return (
            <div
              key={p.id}
              className={
                "group flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-gradient-to-r " +
                r.gradient +
                " hover:border-indigo-300 transition"
              }
            >
              <div className={"text-base font-bold w-7 text-center " + (idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-500" : idx === 2 ? "text-orange-400" : "text-slate-400")}>
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
              </div>
              <div
                onClick={() => p.kind === "learner" && pasteAvatar(p.id)}
                title={p.kind === "learner" ? "Click to paste avatar" : ""}
                className={
                  "relative w-11 h-11 rounded-full overflow-hidden ring-2 " +
                  r.ring +
                  " " +
                  r.glow +
                  " " +
                  (p.kind === "learner" ? "cursor-pointer" : "")
                }
              >
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-indigo-700">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1">
                  {p.name}
                  {p.kind === "npc" && <span className="text-[9px] font-normal text-slate-400">·in class</span>}
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className={"px-1.5 py-0.5 rounded-full font-semibold " + r.badge}>{p.rarity}</span>
                  <span className="text-slate-600 font-bold">{p.score} XP</span>
                  <span className="flex gap-0.5">
                    {("badges" in p ? p.badges : []).map((b, i) => (
                      <span key={i}>{b}</span>
                    ))}
                  </span>
                </div>
                {/* XP progress bar */}
                <div className="mt-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={"h-full transition-all " + (p.rarity === "Legendary" ? "bg-gradient-to-r from-amber-400 to-orange-500" : p.rarity === "Epic" ? "bg-fuchsia-500" : p.rarity === "Rare" ? "bg-sky-500" : "bg-slate-400")}
                    style={{ width: `${progressFor(p.score)}%` }}
                  />
                </div>
              </div>
              {p.kind === "learner" && (
                <div className="opacity-0 group-hover:opacity-100 transition flex flex-col gap-0.5">
                  <div className="flex gap-0.5">
                    <button onClick={() => addScore(p.id, 10)} className="w-7 h-6 text-xs font-bold rounded bg-emerald-500 text-white hover:bg-emerald-600">+10</button>
                    <button onClick={() => addScore(p.id, -10)} className="w-7 h-6 text-xs font-bold rounded bg-rose-500 text-white hover:bg-rose-600">-10</button>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => addBadge(p.id)} className="w-7 h-6 text-xs rounded bg-amber-400 text-white hover:bg-amber-500" title="Badge">🏅</button>
                    <button onClick={() => removeLearner(p.id)} className="w-7 h-6 text-xs rounded bg-slate-200 text-slate-600 hover:bg-rose-100 hover:text-rose-600" title="Remove">✕</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function progressFor(score: number) {
  if (score >= 150) return 100;
  if (score >= 80) return ((score - 80) / 70) * 100;
  if (score >= 30) return ((score - 30) / 50) * 100;
  return (score / 30) * 100;
}
