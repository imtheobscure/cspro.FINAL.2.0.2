import React, { useState, useEffect, useMemo } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

export function QuizGame({ payload, addScore, lives, setLives }: ArenaProps) {
  const [i, setI] = useState(0); const [time, setTime] = useState(15); const [locked, setLocked] = useState<string | null>(null); const q = itemAt(payload.items, i); const choices = useMemo(() => shuffle([q, ...payload.items.filter(x => x.id !== q.id).slice(0, 3)]), [i, payload.items]);
  useEffect(() => { if (locked) return; if (time <= 0) { setLives(Math.max(0, lives - 1)); setI(i + 1); setTime(15); return; } const id = setTimeout(() => setTime(t => t - 1), 1000); return () => clearTimeout(id); }, [time, locked, i, lives, setLives]);
  const choose = (id: string) => { setLocked(id); const ok = id === q.id; setTimeout(() => { addScore(ok ? 10 : -5, ok ? "Correct quiz answer!" : `Wrong. Answer: ${q.term}`, ok); setI(i + 1); setTime(15); setLocked(null); }, 850); };
  return <div className="max-w-3xl mx-auto"><div className="h-3 bg-white/20 rounded-full mb-4"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(time/15)*100}%` }} /></div><div className="p-6 rounded-3xl bg-white/15 border border-white/25 text-center mb-4"><img src={q.image} className="w-full h-56 object-cover rounded-2xl mb-3" /><h2 className="text-3xl font-black">{q.definition}</h2></div><div className="grid sm:grid-cols-2 gap-3">{choices.map(c => <button key={c.id} onClick={() => choose(c.id)} disabled={!!locked} className={`p-5 rounded-2xl font-black border transition ${locked === c.id ? c.id === q.id ? "bg-emerald-400 text-black" : "bg-rose-500" : "bg-white/10 border-white/20 hover:bg-white/20"}`}>{c.term}</button>)}</div></div>;
}
