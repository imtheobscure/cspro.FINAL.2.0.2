import React, { useState, useEffect } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

export function OpenBox({ payload, addScore }: ArenaProps) {
  const [opened, setOpened] = useState<Record<number, "ok" | "bad">>({}); const [active, setActive] = useState<number | null>(null); const q = active !== null ? itemAt(payload.items, active) : null;
  return <div className="relative"><div className="grid grid-cols-4 gap-3">{payload.items.concat(payload.items).slice(0,12).map((_,i)=><button key={i} onClick={()=>setActive(i)} className={`aspect-square rounded-3xl text-6xl glossy-tile transition hover:scale-105 ${opened[i]==="ok"?"bg-emerald-400 text-black":opened[i]==="bad"?"bg-rose-500":"bg-gradient-to-br from-pink-500 to-rose-700"}`}>{opened[i]==="ok"?"✓":opened[i]==="bad"?"✗":"🎁"}</button>)}</div>{q&&<div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4"><div className="premium-panel p-6 max-w-md text-center"><div className="text-8xl animate-float-slow">🎁</div><h3 className="text-2xl font-black mb-2">{q.definition}</h3><div className="grid grid-cols-2 gap-2">{shuffle(payload.items).slice(0,4).map(c=><button key={c.id} onClick={()=>{const ok=c.id===q.id; const key = active ?? 0; setOpened(o=>({...o,[key]:ok?"ok":"bad"})); addScore(ok?10:-5, ok?"Box cleared!":"Box failed.", ok); setActive(null);}} className="p-3 rounded-xl bg-white/15 border border-white/20 font-bold">{c.term}</button>)}</div></div></div>}</div>;
}
