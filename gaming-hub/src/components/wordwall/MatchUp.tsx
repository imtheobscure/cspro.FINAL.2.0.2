import React, { useState, useEffect } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

export function MatchUp({ payload, addScore }: ArenaProps) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [dock, setDock] = useState(() => shuffle(payload.items));
  const [wrong, setWrong] = useState<string[]>([]);
  const onDrop = (targetId: string, cardId: string) => {
    setAssignments(a => ({ ...a, [targetId]: cardId }));
    setDock(d => d.filter(x => x.id !== cardId));
  };
  const submit = () => {
    const bad = Object.entries(assignments).filter(([target, card]) => target !== card).map(([, card]) => card);
    const good = Object.entries(assignments).length - bad.length;
    setWrong(bad);
    setDock(d => [...d, ...payload.items.filter(i => bad.includes(i.id))]);
    setAssignments(a => Object.fromEntries(Object.entries(a).filter(([, card]) => !bad.includes(card))));
    addScore(good * 5, `${good} correct matches. ${bad.length} returned.`, bad.length === 0);
  };
  return <div className="space-y-4"><div className="grid md:grid-cols-4 gap-3">{payload.items.map(t => <div key={t.id} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(t.id, e.dataTransfer.getData("text/plain"))} className="min-h-32 p-3 rounded-3xl bg-white/15 border border-white/25"><div className="text-xs text-white/60 mb-2">ANSWER</div><div className="font-black">{t.definition}</div><div className={`mt-3 p-2 rounded-xl text-center font-black ${assignments[t.id] === t.id ? "bg-emerald-400 text-black" : wrong.includes(assignments[t.id] ?? "") ? "bg-rose-500 animate-shake" : assignments[t.id] ? "bg-white/20" : "bg-black/20"}`}>{assignments[t.id] ? payload.items.find(i => i.id === assignments[t.id])?.term : "Drop card"}</div></div>)}</div><div className="p-4 rounded-3xl bg-black/30 border border-white/20"><div className="text-xs uppercase tracking-wider text-white/50 mb-2">Question Dock</div><div className="flex flex-wrap gap-2">{dock.map(card => <div key={card.id} draggable onDragStart={e => e.dataTransfer.setData("text/plain", card.id)} className="px-4 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 font-black cursor-grab active:cursor-grabbing hover:scale-105 transition shadow-xl">{card.term}</div>)}</div></div><button onClick={submit} className="px-5 py-3 rounded-2xl bg-emerald-400 text-black font-black">Submit All Matches</button></div>;
}
