import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import type { GimkitPayload } from "../../data/gimkitModes";

export function GimkitStudySection({ payload }: { payload: GimkitPayload }) {
  const { speakOnHover, sfx, catSay } = useApp();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<string[]>([]);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const card = payload.study.flashcards[idx % payload.study.flashcards.length];

  const next = () => { setIdx(i => i + 1); setFlipped(false); };

  return (
    <section className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
      <div className="premium-panel p-5 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3 text-sm">
          <div>📚 Card {(idx % payload.study.flashcards.length) + 1} / {payload.study.flashcards.length}</div>
          <div>🟢 Known {knownIds.length} · 🔴 Review {reviewIds.length}</div>
        </div>

        <div className="perspective-scene cursor-pointer" onClick={() => { setFlipped(!flipped); sfx.play("flip"); }}>
          <div className={`relative w-full min-h-[440px] rounded-3xl border-2 border-white/25 overflow-hidden transition-all duration-500 transform-3d ${flipped ? "rotate-y-card" : ""}`}>
            <img src={card.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            <div className="relative z-10 p-8 h-full flex flex-col items-center justify-center text-center">
              {!flipped ? (
                <>
                  <div className="text-xs uppercase tracking-widest text-white/55 mb-2">Front · Term</div>
                  <h2 onMouseEnter={() => speakOnHover(card.front)} className="text-5xl font-black mb-3 glossy-emoji">{card.front}</h2>
                  <p className="text-sm text-white/65 mt-4 italic">Click to flip ↻</p>
                </>
              ) : (
                <div className="space-y-4 max-w-xl">
                  <div className="text-xs uppercase tracking-widest text-emerald-200 font-bold">Definition</div>
                  <p onMouseEnter={() => speakOnHover(card.back)} className="text-xl font-black">{card.back}</p>

                  <div className="text-xs uppercase tracking-widest text-amber-200 font-bold mt-4">📌 Personalized Example</div>
                  <p onMouseEnter={() => speakOnHover(card.example)} className="text-sm italic bg-amber-400/15 border border-amber-300/30 rounded-xl p-3">{card.example}</p>

                  <div className="text-xs uppercase tracking-widest text-fuchsia-200 font-bold mt-4">🧠 CCQ — Concept Check</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); catSay(card.ccq, "😼"); sfx.play("bell"); }}
                    onMouseEnter={() => speakOnHover(card.ccq)}
                    className="text-sm font-bold bg-fuchsia-500/20 border border-fuchsia-300/40 rounded-xl p-3 w-full text-left hover:bg-fuchsia-500/30 transition"
                  >
                    {card.ccq} <span className="text-xs opacity-60">(tap for cat to read)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <button onClick={() => { setKnownIds(k => [...k, card.front]); next(); sfx.play("coin"); }}
            className="px-4 py-3 rounded-xl bg-emerald-500 text-black font-black hover:scale-105 transition">🟢 Known</button>
          <button onClick={() => { setReviewIds(r => [...r, card.front]); next(); sfx.play("buzz"); }}
            className="px-4 py-3 rounded-xl bg-rose-500 text-black font-black hover:scale-105 transition">🔴 Review</button>
          <button onClick={() => next()} className="px-4 py-3 rounded-xl bg-white/15 border border-white/25 font-bold hover:bg-white/25 transition">⏭️ Skip</button>
        </div>
      </div>
    </section>
  );
}

