import React, { useState, useEffect } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

export function FlipTiles({ payload }: ArenaProps) { const [flipped,setFlipped]=useState<string[]>([]); const [learned,setLearned]=useState<string[]>([]); return <div className="grid sm:grid-cols-4 gap-3">{payload.items.map(it=><div key={it.id} className={`min-h-44 rounded-3xl border p-4 transition transform-3d ${learned.includes(it.id)?"opacity-40":"bg-white/10 border-white/20"}`}><button onClick={()=>setFlipped(f=>f.includes(it.id)?f.filter(x=>x!==it.id):[...f,it.id])} className="w-full h-28 rounded-2xl bg-slate-800 text-xl font-black rotate-y-card">{flipped.includes(it.id)?it.definition:it.term}</button><button onClick={()=>setLearned(l=>[...l,it.id])} className="mt-2 w-full p-2 rounded-xl bg-emerald-400 text-black font-black">Learned</button></div>)}</div>; }
