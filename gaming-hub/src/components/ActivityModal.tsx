import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Activity } from "../data/activities";

interface Props {
  activity: Activity | null;
  onClose: () => void;
}

export function ActivityModal({ activity, onClose }: Props) {
  const { catReact, speech, sfx, speakOnHover } = useApp();
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (activity) {
      setScore(0); setStreak(0);
      catReact(activity, "intro");
    }
  }, [activity?.id]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!activity) return null;

  const fakeAnswer = (correct: boolean) => {
    sfx.play(correct ? "coin" : "buzz");
    if (correct) {
      setScore(s => s + 100);
      setStreak(s => s + 1);
      catReact(activity, "correct");
    } else {
      setStreak(0);
      catReact(activity, "incorrect");
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
      onClick={() => { speech.stop(); sfx.play("close"); onClose(); }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-white/30"
        style={{
          background: "linear-gradient(135deg, rgba(30,30,60,0.95), rgba(60,30,80,0.95))",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        <button
          onClick={() => { speech.stop(); onClose(); }}
          className="absolute top-3 right-3 text-2xl hover:rotate-90 transition-transform"
          aria-label="Close"
        >✖️</button>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-7xl"
            style={{ filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.5))" }}
          >{activity.emoji}</div>
          <div>
            <h2
              onMouseEnter={() => speakOnHover(activity.name)}
              className="text-3xl font-extrabold tracking-tight"
            >{activity.name}</h2>
            <p
              onMouseEnter={() => speakOnHover(activity.description)}
              className="text-white/80 text-sm"
            >{activity.description}</p>
            <p className="text-white/50 text-xs mt-1">Inspired by {activity.similarTo}</p>
          </div>
        </div>

        {/* Settings preview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <Stat label="Timer" value={activity.settings.timerSec ? `${activity.settings.timerSec}s` : "Off"} />
          <Stat label="Hints" value={activity.settings.hints ? "On" : "Off"} />
          <Stat label="Mode" value={activity.settings.multiplayer ? `Multi×${activity.settings.maxPlayers ?? "?"}` : "Solo"} />
          <Stat label="Difficulty" value={activity.settings.difficulty ?? "Adaptive"} />
        </div>

        {/* AI feedback panel */}
        <div className="bg-white/10 rounded-2xl p-4 mb-5 border border-white/20">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-1">🐱 AI Cat Tip</div>
          <p
            onMouseEnter={() => speakOnHover(activity.ai.tip)}
            className="text-sm text-white/90"
          >{activity.ai.tip}</p>
        </div>

        {/* Score panel */}
        <div className="flex items-center justify-between bg-black/30 rounded-2xl p-4 mb-4">
          <div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Score</div>
            <div className="text-3xl font-extrabold">{score}</div>
          </div>
          <div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Streak</div>
            <div className="text-3xl font-extrabold">🔥 {streak}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fakeAnswer(true)}
              className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition font-bold text-sm shadow-lg"
            >✓ Correct</button>
            <button
              onClick={() => fakeAnswer(false)}
              className="px-4 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 active:scale-95 transition font-bold text-sm shadow-lg"
            >✗ Wrong</button>
            <button
              onClick={() => catReact(activity, "encourage")}
              className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 transition font-bold text-sm shadow-lg"
            >💪 Encourage</button>
          </div>
        </div>

        <p className="text-xs text-white/50 italic text-center">
          Demo preview — the real activity is auto-built from the AI JSON payload below.
        </p>

        {/* JSON preview - the "Non-Negotiable AI Process" payload */}
        <details className="mt-3">
          <summary className="text-xs text-white/60 cursor-pointer hover:text-white">View AI JSON payload</summary>
          <pre className="mt-2 text-[10px] bg-black/50 p-3 rounded-lg overflow-auto max-h-40 text-emerald-300">
{JSON.stringify({ id: activity.id, name: activity.name, settings: activity.settings, ai: activity.ai }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/20">
      <div className="text-[10px] uppercase tracking-wider text-white/60">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}
