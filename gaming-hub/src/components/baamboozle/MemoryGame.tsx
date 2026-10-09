import { useState } from "react";
import { ArenaProps, QuestionPopup, getQ } from "./shared";

export const MemoryGamePrompt = `You are an elite curriculum designer, language teacher, game designer, and strict JSON generator.

TASK
Create one complete JSON payload for my Baamboozle-style Activity Library Hub...

SHARED TOP-LEVEL JSON SHAPE
{
  "metadata": { ... "selectedGameType": "memory" },
  "environment": { ... },
  "questions": [],
  "study": { ... },
  "slideshow": { ... },
  "aiQualityChecklist": []
}

MODE-SPECIFIC REQUIREMENTS
include modeSettings.memory with pairs, pairCount, tileLabels, flipBackDelayMs, pointsPerPair, imageTextMatching.`;

export function MemoryGame({ payload, teamIndex, onScore }: ArenaProps) {
  const [revealed, setRevealed] = useState<number[]>([]);
  const [pending, setPending] = useState<number | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const team = payload.environment.teams[teamIndex] || { name: "Rivals", emoji: "🦊", color: "#fbbf24" };
  const question = getQ(payload, qIndex);

  return (
    <div className="relative">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 16 }, (_, i) => (
          <button key={i} onClick={() => setPending(i)} className="aspect-square bg-gradient-to-br from-cyan-400 to-blue-700 rounded-2xl flex items-center justify-center text-4xl font-black text-white">
            {revealed.includes(i) ? "⭐" : "?"}
          </button>
        ))}
      </div>
      <QuestionPopup question={question} team={team} open={pending !== null} title="Memory flip"
        onCorrect={() => { if (pending !== null) setRevealed(r => [...r, pending]); setPending(null); onScore({ delta: 10, message: "Matched!", emotion: "😻", sfx: "coin" }); }}
        onWrong={() => { setPending(null); setQIndex(qIndex + 1); }}
      />
    </div>
  );
}
