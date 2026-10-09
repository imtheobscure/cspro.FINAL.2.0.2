import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

export function TeamCompetitionStudio({ initialGame, onBack }: { initialGame: string, onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900 text-white z-50 flex flex-col">
      <div className="p-4 border-b border-white/20 flex gap-4">
        <button onClick={onBack}>Back</button>
        <h2>Team & Competition Suite</h2>
        <span className="text-white/50">Playing: {initialGame}</span>
      </div>
      <div className="flex-1 flex items-center justify-center font-bold text-2xl text-white/40">
        Logic loading for {initialGame}...
      </div>
    </div>
  );
}
