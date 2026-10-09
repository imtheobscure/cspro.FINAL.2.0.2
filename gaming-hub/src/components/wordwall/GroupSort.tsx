import React, { useState, useEffect } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

export function GroupSort({ payload, addScore }: ArenaProps) {
  const groups = [...new Set(payload.items.map(i => i.group))];
  const [i, setI] = useState(0);
  const [placed, setPlaced] = useState<Record<string, WordwallItem[]>>({});
  const cur = itemAt(payload.items, i);
  const place = (g: string) => { const ok = cur.group === g; setPlaced(p => ({ ...p, [g]: [...(p[g] ?? []), cur] })); addScore(ok ? 8 : -3, ok ? "Sorted correctly." : "Misclassified item.", ok); setI(i + 1); };
  return <div><div className="text-center mb-4"><div className="inline-block p-5 rounded-3xl bg-white text-black shadow-2xl"><img src={cur.image} className="w-48 h-32 object-cover rounded-2xl mb-2" /><div className="text-3xl font-black">{cur.term}</div></div></div><div className="grid md:grid-cols-3 gap-4">{groups.map(g => <button key={g} onClick={() => place(g)} className="min-h-64 p-4 rounded-3xl bg-gradient-to-b from-amber-400/30 to-orange-700/30 border border-white/25 hover:scale-[1.02] transition"><h3 className="text-2xl font-black mb-3">{g}</h3><div className="flex flex-wrap gap-2">{(placed[g] ?? []).map(x => <span key={`${g}-${x.id}-${Math.random()}`} className="px-2 py-1 rounded-lg bg-white/20 text-xs">{x.term}</span>)}</div></button>)}</div></div>;
}
