import React from "react";

export function TeamMode(props: any) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-xl mb-4 font-bold text-blue-300">Team Total: ${props.players.reduce((sum: number, p: any) => sum + (props.playerStates[p.id]?.cash || 0), 0).toLocaleString()}</div>
      {/* Re-use question layout */}
      <div className="w-full max-w-2xl bg-blue-900/40 rounded-3xl p-6 md:p-8 backdrop-blur-md border border-blue-500/30 shadow-2xl relative">
        <h3 className="text-xl md:text-2xl font-bold text-center mb-6">{props.activeQ.text}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {props.activeQ.choices.map((c: string, idx: number) => {
            const isSelected = props.selectedChoice === c;
            const reveal = props.locked !== null;
            const isCorrect = c === props.activeQ.answer;
            let btnBg = "bg-white/10 hover:bg-white/20 border-white/20";
            if (reveal) {
              if (isCorrect) btnBg = "bg-emerald-500/80 border-emerald-400";
              else if (isSelected) btnBg = "bg-red-500/80 border-red-400";
              else btnBg = "opacity-50";
            }
            return (
              <button key={idx} disabled={reveal || !!props.winner} onClick={() => props.answer(c)} className={"p-4 md:p-5 rounded-2xl border text-left font-semibold " + btnBg}>
                {c}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
