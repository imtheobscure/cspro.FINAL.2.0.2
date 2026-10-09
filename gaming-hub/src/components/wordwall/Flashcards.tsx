import React, { useState, useEffect } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

export function Flashcards({ payload, addScore }: ArenaProps) { const [i,setI]=useState(0); const [flip,setFlip]=useState(false); const [hard,setHard]=useState<string[]>([]); const it=itemAt(payload.items,i); return <div className="text-center"><button onClick={()=>setFlip(!flip)} className="mx-auto w-full max-w-xl min-h-96 rounded-3xl bg-white text-black shadow-2xl p-6 hover:scale-[1.02] transition"><img src={it.image} className="w-full h-56 object-cover rounded-2xl mb-4" /><div className="text-4xl font-black">{flip?it.definition:it.term}</div></button><div className="mt-4 flex justify-center gap-2"><button onClick={()=>{setI(Math.max(0,i-1));setFlip(false)}} className="ww-pad">←</button><button onClick={()=>{setHard(h=>[...h,it.id]);addScore(0,"Marked difficult.",true)}} className="px-4 py-2 rounded-xl bg-amber-300 text-black font-black">Hard ({hard.length})</button><button onClick={()=>{setI(i+1);setFlip(false)}} className="ww-pad">→</button></div></div>; }
