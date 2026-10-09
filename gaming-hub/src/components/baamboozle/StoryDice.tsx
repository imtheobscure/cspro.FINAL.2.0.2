import { useState } from "react";
import { ArenaProps, randInt } from "./shared";

export const StoryDicePrompt = `You are an elite curriculum designer, language teacher, game designer, and strict JSON generator.

TASK
Create one complete JSON payload for my Baamboozle-style Activity Library Hub...

SHARED TOP-LEVEL JSON SHAPE
{
  "metadata": { ... "selectedGameType": "story-dice" },
  "environment": { ... },
  "questions": [],
  "study": { ... },
  "slideshow": { ... },
  "aiQualityChecklist": []
}

MODE-SPECIFIC REQUIREMENTS
include modeSettings.storyDice with diceCount 1-16, diceImages, taskTypes, speakingTimerSeconds, rubric, rerollAllowed.`;

export function StoryDice({ payload, teamIndex }: ArenaProps) {
  const imgs = payload.questions.map(q => q.image).filter(Boolean) as string[];
  const [dice, setDice] = useState<number[]>([0, 1, 2]);
  const team = payload.environment.teams[teamIndex] || { name: "Rivals", emoji: "🦊", color: "#fbbf24" };

  return (
    <div className="text-center">
      <p className="mb-3">Storytelling prompt for {team.name}</p>
      <button onClick={() => setDice(Array.from({ length: 3 }, () => randInt(0, imgs.length - 1)))} className="px-4 py-2 bg-fuchsia-500 rounded-xl font-bold">Roll Dice</button>
      <div className="flex justify-center gap-4 mt-4">
        {dice.map((idx, i) => (
          <div key={i} className="w-32 h-32 bg-white p-2 rounded-3xl">
            <img src={imgs[idx % imgs.length]} alt="" className="w-full h-full object-cover rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
