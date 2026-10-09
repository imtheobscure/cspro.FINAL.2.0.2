import { useState } from "react";
import { ArenaProps, QuestionPopup, getQ } from "./shared";

export const FourInARowPrompt = `You are an elite curriculum designer, language teacher, game designer, and strict JSON generator.

TASK
Create one complete JSON payload for my Baamboozle-style Activity Library Hub...

SHARED TOP-LEVEL JSON SHAPE
{
  "metadata": { ... "selectedGameType": "four-in-a-row" },
  "environment": { ... },
  "questions": [],
  "study": { ... },
  "slideshow": { ... },
  "aiQualityChecklist": []
}

MODE-SPECIFIC REQUIREMENTS
include modeSettings.fourInARow with rows 6, columns 7, discColors, suddenDeathRule, bestOfRounds, teamCount 2.`;

export function FourInARow({ payload, teamIndex, onScore }: ArenaProps) {
  const [grid, setGrid] = useState<string[]>(() => Array.from({ length: 42 }, () => ""));
  const [pendingCol, setPendingCol] = useState<number | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const team = payload.environment.teams[teamIndex] || { name: "Rivals", emoji: "🦊", color: "#fbbf24" };
  const question = getQ(payload, qIndex);
  const color = teamIndex % 2 === 0 ? "🔴" : "🟡";

  const apply = (correct: boolean) => {
    if (pendingCol === null) return;
    if (correct) {
      const next = [...grid];
      for (let r = 5; r >= 0; r--) {
        if (!next[r * 7 + pendingCol]) { next[r * 7 + pendingCol] = color; break; }
      }
      setGrid(next);
      onScore({ delta: 5, message: "Disc dropped!", emotion: "😼", sfx: "click" });
    }
    setPendingCol(null); setQIndex(qIndex + 1);
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {Array.from({ length: 7 }, (_, c) => (
          <button key={c} onClick={() => setPendingCol(c)} className="py-2 bg-yellow-300 rounded-xl font-black">⬇</button>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 bg-blue-700 p-3 rounded-3xl">
        {grid.map((cell, i) => (
          <div key={i} className="aspect-square rounded-full bg-blue-900 flex items-center justify-center text-4xl">{cell}</div>
        ))}
      </div>
      <QuestionPopup question={question} team={team} open={pendingCol !== null} title="Drop Disc"
        onCorrect={() => apply(true)} onWrong={() => apply(false)}
      />
    </div>
  );
}
