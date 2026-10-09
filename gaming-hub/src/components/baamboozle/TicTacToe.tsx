import { useState } from "react";
import { ArenaProps, QuestionPopup, getQ, checkWin3 } from "./shared";

export const TicTacToePrompt = `You are an elite curriculum designer, language teacher, game designer, and strict JSON generator.

TASK
Create one complete JSON payload for my Baamboozle-style Activity Library Hub...

SHARED TOP-LEVEL JSON SHAPE
{
  "metadata": { ... "selectedGameType": "tic-tac-toe" },
  "environment": { ... },
  "questions": [],
  "study": { ... },
  "slideshow": { ... },
  "aiQualityChecklist": []
}

MODE-SPECIFIC REQUIREMENTS
include modeSettings.ticTacToe with symbols, boardSize 3, bestOfRounds, drawBreaker, teamCount 2.`;

export function TicTacToe({ payload, teamIndex, onScore }: ArenaProps) {
  const [board, setBoard] = useState<string[]>(() => Array.from({ length: 9 }, () => ""));
  const [pendingCell, setPendingCell] = useState<number | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const team = payload.environment.teams[teamIndex] || { name: "Rivals", emoji: "🦊", color: "#fbbf24" };
  const question = getQ(payload, qIndex);
  const symbol = teamIndex % 2 === 0 ? "❌" : "⭕";

  const apply = (correct: boolean) => {
    if (pendingCell === null) return;
    if (correct) {
      const next = [...board]; next[pendingCell] = symbol; setBoard(next);
      const w = checkWin3(next);
      if (w) {
        setWinner(w);
        onScore({ delta: 100, message: `🏆 Tic-Tac-Toe Win!`, emotion: "😻", sfx: "cash" }, teamIndex, false);
      } else {
        onScore({ delta: 5, message: `\${symbol} placed`, emotion: "😼", sfx: "click" });
      }
    } else {
      onScore({ delta: 0, message: "Wrong!", emotion: "😿", sfx: "buzz" });
    }
    setPendingCell(null); setQIndex(qIndex + 1);
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
        {board.map((mark, i) => (
          <button key={i} onClick={() => !mark && setPendingCell(i)} disabled={!!mark || !!winner}
            className={`aspect-square rounded-3xl text-7xl font-black border-2 transition transform-3d \${mark ? "bg-white text-black" : "bg-gradient-to-br from-sky-400 to-blue-700"}`}>{mark}</button>
        ))}
      </div>
      <QuestionPopup question={question} team={team} open={pendingCell !== null} title="Claim Tic-Tac-Toe"
        onCorrect={() => apply(true)} onWrong={() => apply(false)}
      />
    </div>
  );
}
