import { useState, useEffect } from "react";
import { ArenaProps, QuestionPopup, getQ, BOX_REWARDS } from "./shared";

export function BaamboozleClassic({ payload, teamIndex, onScore }: ArenaProps) {
  const SIZE = 24;
  const teams = payload.environment.teams;
  const team = teams[teamIndex] || { name: "Rivals", emoji: "🦊", color: "#fbbf24" };
  
  const [opened, setOpened] = useState<Set<number>>(new Set());
  const [activeTile, setActiveTile] = useState<number | null>(null);
  
  const [tileTypes, setTileTypes] = useState<Record<number, any>>({});
  
  useEffect(() => {
    // Distribute powerups across 24 tiles
    const types: Record<number, any> = {};
    for (let i = 0; i < SIZE; i++) {
      if (Math.random() < 0.2) {
        types[i] = BOX_REWARDS[Math.floor(Math.random() * BOX_REWARDS.length)];
      }
    }
    setTileTypes(types);
    setOpened(new Set());
  }, [payload]);

  const question = getQ(payload, activeTile || 0);

  const handleCorrect = () => {
    setActiveTile(null);
    onScore({
      delta: question.points || 15,
      message: "Great job!",
      emotion: "😻",
      sfx: "coin",
    });
  };

  const handleWrong = () => {
    setActiveTile(null);
    onScore({
      delta: 0,
      message: "Not quite!",
      emotion: "😿",
      sfx: "buzz",
    });
  };

  const clickTile = (i: number) => {
    if (opened.has(i)) return;
    const n = new Set(opened); n.add(i); setOpened(n);
    
    const power = tileTypes[i];
    if (power) {
      onScore({
        delta: power.delta,
        message: `Power! ${power.label}`,
        emotion: power.delta >= 0 ? "😻" : "🙀",
        sfx: power.delta > 0 ? "cash" : (power.delta < 0 ? "buzz" : "unwrap")
      });
    } else {
      setActiveTile(i);
    }
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {Array.from({ length: SIZE }, (_, i) => (
          <button
            key={i}
            onClick={() => clickTile(i)}
            disabled={opened.has(i)}
            className={`h-24 sm:h-28 rounded-2xl border-2 flex items-center justify-center text-3xl font-black transition-all ${
              opened.has(i)
                ? "bg-transparent border-white/10 text-white/10 opacity-50 cursor-not-allowed"
                : "bg-gradient-to-br from-indigo-500 to-purple-600 border-white/20 hover:scale-105 hover:from-fuchsia-500 hover:to-pink-500 shadow-xl"
            }`}
          >
            {opened.has(i) ? tileTypes[i]?.emoji || "✓" : i + 1}
          </button>
        ))}
      </div>

      <QuestionPopup
        question={question}
        team={team}
        open={activeTile !== null}
        title={`Question ${activeTile !== null ? activeTile + 1 : ""}`}
        onCorrect={handleCorrect}
        onWrong={handleWrong}
      />
    </div>
  );
}
