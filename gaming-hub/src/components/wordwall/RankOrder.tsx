import React, { useState, useEffect } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

export function RankOrder({ payload, addScore }: ArenaProps) { const [items,setItems]=useState(()=>shuffle(payload.items)); const move=(i:number,d:number)=>{const j=i+d;if(j<0||j>=items.length)return;const a=[...items];[a[i],a[j]]=[a[j],a[i]];setItems(a);}; const check=()=>{const ok=items.every((x,i)=>x.order===i+1);addScore(ok?30:-5,ok?"Perfect order!":"Order needs review.",ok);}; return <div className="max-w-xl mx-auto"><div className="space-y-2">{items.map((it,i)=><div key={it.id} className="flex items-center gap-2 p-3 rounded-2xl bg-purple-500/30 border border-white/20"><span className="text-2xl font-black w-8">{i+1}</span><img src={it.image} className="w-16 h-12 object-cover rounded-lg"/><span className="font-black flex-1">{it.term}</span><button onClick={()=>move(i,-1)}>↑</button><button onClick={()=>move(i,1)}>↓</button></div>)}</div><button onClick={check} className="mt-4 w-full p-3 rounded-xl bg-emerald-400 text-black font-black">Check Order</button></div>; }
