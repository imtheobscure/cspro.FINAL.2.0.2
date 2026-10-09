import React, { useState, useEffect, useMemo } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

export function FindMatch({ payload, addScore, lives, setLives }: ArenaProps) {
  const [idx, setIdx] = useState(0);
  const [offset, setOffset] = useState(0);
  const target = itemAt(payload.items, idx);
  const choices = useMemo(() => shuffle([target, ...payload.items.filter(i => i.id !== target.id)]).slice(0, 6), [target, payload.items]);
  useEffect(() => { const id = setInterval(() => setOffset(o => (o + 1) % 100), 40); return () => clearInterval(id); }, []);
  const tap = (it: WordwallItem) => { if (it.id === target.id) { addScore(10 + Math.max(0, 20 - offset), "Fast match!", true); setIdx(idx + 1); } else { setLives(Math.max(0, lives - 1)); addScore(-5, "Wrong option. Carousel freeze!", false); } };
  return <div className="relative h-[520px] rounded-3xl overflow-hidden bg-gradient-to-b from-emerald-900 to-black border border-white/25"><div className="absolute inset-0"><img src={target.image} className="w-full h-full object-cover opacity-25" /></div><div className="absolute inset-x-0 top-10 text-center"><div className="inline-block p-6 rounded-3xl bg-white/90 text-black shadow-2xl"><img src={target.image} className="w-40 h-28 object-cover rounded-2xl mx-auto mb-2" /><div className="text-3xl font-black">Find: {target.term}</div></div></div><div className="absolute bottom-16 left-0 right-0 flex gap-4 transition-transform duration-75" style={{ transform: `translateX(-${offset * 8}px)` }}>{[...choices, ...choices].map((c, i) => <button key={`${c.id}-${i}`} onClick={() => tap(c)} className="shrink-0 w-48 p-4 rounded-3xl bg-white/20 backdrop-blur border border-white/30 hover:bg-yellow-300 hover:text-black transition"><img src={c.image} className="h-24 w-full object-cover rounded-xl mb-2" /><div className="font-black">{c.term}</div></button>)}</div></div>;
}
