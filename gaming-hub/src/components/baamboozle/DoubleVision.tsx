import { useState, useEffect } from "react";
import { ArenaProps, QuestionPopup, getQ } from "./shared";

export const DoubleVisionPrompt = `You are an elite curriculum designer, language teacher, game designer, and strict JSON generator.

TASK
Create one complete JSON payload for my Baamboozle-style Activity Library Hub...

SHARED TOP-LEVEL JSON SHAPE
{
  "metadata": { ... "selectedGameType": "double-vision" },
  "environment": { ... },
  "questions": [],
  "study": { ... },
  "slideshow": { ... },
  "aiQualityChecklist": []
}

MODE-SPECIFIC REQUIREMENTS
include modeSettings.doubleVision with imageBank, rounds, panelSize, distractorsPerPanel, speedScoring, followUpQuestions.`;

export function DoubleVision({ payload, teamIndex, onScore }: ArenaProps) {
  const imgs = payload.questions.map(q => q.image).filter(Boolean) as string[];
  const [askOpen, setAskOpen] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [running, setRunning] = useState(false);
  const [found, setFound] = useState<number[]>([]);
  const [diffs] = useState<number[]>([1, 3]);
  const team = payload.environment.teams[teamIndex] || { name: "Rivals", emoji: "🦊", color: "#fbbf24" };
  const question = getQ(payload, qIndex);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft === 0 || found.length >= 2) {
      const win = found.length >= 2;
      onScore({ delta: win ? 25 : 0, message: win ? "👁️ Spotted!" : "Missed differences.", emotion: "😻", sfx: "cash" });
      setRunning(false); setFound([]); setSecondsLeft(15); setQIndex(qIndex + 1);
      return;
    }
    const id = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, secondsLeft, found]);

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setAskOpen(true)} disabled={running} className="px-4 py-2 rounded-xl bg-emerald-400 text-black font-black">👁️ Answer to Hunt</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[0, 1].map(side => (
          <div key={side} className="grid grid-cols-3 gap-2 p-3 bg-black/40 rounded-3xl">
            {Array.from({ length: 6 }, (_, i) => (
              <button key={i} onClick={() => side === 1 && diffs.includes(i) && setFound(f => [...f, i])} className="h-24 rounded-2xl overflow-hidden">
                <img src={imgs[i % imgs.length]} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        ))}
      </div>
      <QuestionPopup question={question} team={team} open={askOpen} title="Diff hunt"
        onCorrect={() => { setAskOpen(false); setRunning(true); }}
        onWrong={() => { setAskOpen(false); setQIndex(qIndex + 1); }}
      />
    </div>
  );
}
