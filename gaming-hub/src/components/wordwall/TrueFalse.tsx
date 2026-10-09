import React, { useState, useEffect } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

export function TrueFalse({ payload, addScore }: ArenaProps) { const [i,setI]=useState(0); const [combo,setCombo]=useState(0); const it=itemAt(payload.items,i); const choose=(v:boolean)=>{const ok=v===it.truth;setCombo(ok?combo+1:0);addScore(ok?5+combo*2:-5,ok?`Correct! Combo ${combo+1}`:"Combo broken.",ok);setI(i+1);}; return <div className="text-center"><div className="relative h-24 overflow-hidden rounded-3xl bg-black/40 border border-white/20 mb-6"><div className="absolute whitespace-nowrap text-3xl font-black animate-conveyor top-6">{it.statement}</div></div><div className="text-xl mb-3">Combo: {combo}</div><div className="grid grid-cols-2 gap-4 max-w-xl mx-auto"><button onClick={()=>choose(true)} className="p-8 rounded-3xl bg-emerald-500 text-4xl font-black hover:scale-105 transition">TRUE</button><button onClick={()=>choose(false)} className="p-8 rounded-3xl bg-rose-500 text-4xl font-black hover:scale-105 transition">FALSE</button></div></div>; }
