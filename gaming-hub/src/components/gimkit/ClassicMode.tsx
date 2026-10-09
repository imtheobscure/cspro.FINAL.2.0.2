import React from "react";
import { GimkitQuestion, GimkitUpgrade, GimkitPowerup } from "../../data/gimkitModes";

// GIMKIT CLASSIC MODE (Extracted to separate file per user request)
export function ClassicMode({
  players,
  playerStates,
  activeId,
  payload,
  activeQ,
  selectedChoice,
  locked,
  winner,
  answer,
  computeEarnings
}: any) {
  const activePlayer = players.find((p: any) => p.id === activeId);
  const activeState = playerStates[activeId];

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-2xl bg-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md border border-white/10 shadow-2xl relative">
        <h3 className="text-xl md:text-2xl font-bold text-center mb-6">{activeQ.text}</h3>
        {activeQ.image && (
          <div className="w-full h-40 md:h-56 mb-6 rounded-xl overflow-hidden shadow-inner bg-black/40">
            <img src={activeQ.image} alt="Question" className="w-full h-full object-cover opacity-90" />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeQ.choices.map((c: string, idx: number) => {
            const isSelected = selectedChoice === c;
            const isCorrect = c === activeQ.answer;
            const reveal = locked !== null;
            let btnBg = "bg-white/10 hover:bg-white/20 border-white/20";
            if (reveal) {
              if (isCorrect) btnBg = "bg-emerald-500/80 border-emerald-400";
              else if (isSelected) btnBg = "bg-red-500/80 border-red-400";
              else btnBg = "bg-white/5 border-transparent opacity-50";
            } else if (isSelected) {
              btnBg = "bg-indigo-500 border-indigo-400";
            }

            return (
              <button
                key={idx}
                onClick={() => answer(c)}
                disabled={reveal || !!winner}
                className={"p-4 md:p-5 rounded-2xl border text-left font-semibold transition-all duration-200 shadow-md " + btnBg}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
