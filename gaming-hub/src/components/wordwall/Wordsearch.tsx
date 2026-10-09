import React, { useState, useEffect, useMemo } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

function makeWordGrid(words:string[],size:number){const letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ"; const grid=Array.from({length:size*size},()=>letters[Math.floor(Math.random()*letters.length)]); words.forEach((w,wi)=>{const row=wi; for(let c=0;c<w.length&&c<size;c++) grid[row*size+c]=w[c];}); return grid;}
export function Wordsearch({ payload, addScore }: ArenaProps) {
  const words = payload.items.slice(0,6).map(i=>i.term.toUpperCase()); const size=10; const [found,setFound]=useState<string[]>([]); const grid=useMemo(()=>makeWordGrid(words,size),[payload]); const [sel,setSel]=useState<number[]>([]);
  const release=()=>{const s=sel.map(n=>grid[n]).join(""); const rev=s.split("").reverse().join(""); const w=words.find(x=>x===s||x===rev); if(w&&!found.includes(w)){setFound([...found,w]); addScore(10,`Found ${w}!`,true);} setSel([]);};
  return <div className="grid md:grid-cols-[1fr_220px] gap-4"><div className="grid gap-1" style={{gridTemplateColumns:`repeat(${size},1fr)`}} onMouseLeave={release}>{grid.map((ch,i)=><button key={i} onMouseDown={()=>setSel([i])} onMouseEnter={()=>sel.length&&setSel(s=>[...s,i])} onMouseUp={release} className={`aspect-square rounded-lg font-black text-xl select-none ${sel.includes(i)?"bg-yellow-300 text-black":"bg-white/15"}`}>{ch}</button>)}</div><div className="premium-panel p-4"><h3 className="font-black mb-2">Find Words</h3>{words.map(w=><div key={w} className={`py-1 ${found.includes(w)?"line-through text-emerald-300":""}`}>{w}</div>)}</div></div>;
}
