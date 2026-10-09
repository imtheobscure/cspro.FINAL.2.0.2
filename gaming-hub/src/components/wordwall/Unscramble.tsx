import React, { useState, useEffect } from "react";
import type { ArenaProps } from "./shared";
import type { WordwallItem } from "../../data/wordwallModes";
import { shuffle, itemAt } from "./shared";

export function Unscramble({ payload, addScore }: ArenaProps) { const sentence=payload.items.slice(0,5).map(i=>i.term).join(" "); const [blocks,setBlocks]=useState(()=>shuffle(sentence.split(" "))); const move=(i:number,d:number)=>{const j=i+d;if(j<0||j>=blocks.length)return;const b=[...blocks];[b[i],b[j]]=[b[j],b[i]];setBlocks(b); if(b.join(" ")===sentence)addScore(25,"Sentence restored!",true);}; return <div><h3 className="mb-4 text-xl text-center">Order the sentence: {payload.topic}</h3><div className="flex flex-wrap justify-center gap-3">{blocks.map((b,i)=><div key={`${b}-${i}`} className="p-4 rounded-2xl bg-orange-400 text-black font-black shadow-xl"><button onClick={()=>move(i,-1)}>←</button> {b} <button onClick={()=>move(i,1)}>→</button></div>)}</div></div>; }
