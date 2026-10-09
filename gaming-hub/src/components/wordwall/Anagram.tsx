import React, { useState, useEffect } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

export function Anagram({ payload, addScore }: ArenaProps) { const [i,setI]=useState(0); const word=itemAt(payload.items,i).term.toUpperCase(); const [letters,setLetters]=useState(()=>shuffle(word.split(""))); useEffect(()=>setLetters(shuffle(word.split(""))),[word]); const swap=(idx:number)=>{if(idx<letters.length-1){const a=[...letters]; [a[idx],a[idx+1]]=[a[idx+1],a[idx]]; setLetters(a); if(a.join("")===word){addScore(15,`Solved ${word}!`,true); setTimeout(()=>setI(i+1),700);}}}; return <div className="text-center"><h3 className="text-xl mb-4">Definition: {itemAt(payload.items,i).definition}</h3><div className="flex flex-wrap justify-center gap-3">{letters.map((l,idx)=><button key={`${l}-${idx}`} onClick={()=>swap(idx)} className="w-20 h-20 rounded-2xl bg-gradient-to-br from-fuchsia-400 to-pink-700 text-4xl font-black shadow-2xl hover:scale-110 transition">{l}</button>)}</div><p className="mt-4 text-white/60">Click a tile to swap it with the next tile.</p></div>; }
