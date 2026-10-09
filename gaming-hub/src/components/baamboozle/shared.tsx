import { useApp } from "../../context/AppContext";
import { type BaamPayload, type BaamQuestion } from "../../data/baamboozleModes";
import type { Emotion } from "../../data/activities";

export interface ScoreEvent {
  delta: number;
  message: string;
  emotion?: Emotion;
  sfx?: "coin" | "buzz" | "open" | "close" | "spin" | "pop" | "bell" | "dice" | "cash" | "splash" | "unlock" | "unwrap" | "click" | "flip" | "tick" | "snow" | "chomp" | "bonk" | "pencil" | "hover";
}

export interface ArenaProps {
  payload: BaamPayload;
  mode: any;
  teamIndex: number;
  scores: number[];
  onScore: (e: ScoreEvent, target?: number, advance?: boolean) => void;
  maximized: boolean;
}

export function QuestionPopup({
  question,
  team,
  open,
  onCorrect,
  onWrong,
  title,
}: {
  question: BaamQuestion;
  team: { name: string; emoji: string; color: string };
  open: boolean;
  onCorrect: () => void;
  onWrong: () => void;
  title?: string;
}) {
  const { speakOnHover, sfx } = useApp();
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-xl premium-panel p-6 relative">
        <div className="absolute -top-5 left-6 px-3 py-1 rounded-full bg-amber-300 text-black font-black text-xs">{title ?? "Question"}</div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-3xl">{team.emoji}</span>
          <span className="font-black" style={{ color: team.color }}>{team.name}</span>
        </div>
        {question.image && <img src={question.image} alt="" className="w-full h-40 object-cover rounded-2xl mb-3 border border-white/20" />}
        <h3 onMouseEnter={() => speakOnHover(question.prompt)} className="text-xl font-black leading-tight mb-3">{question.prompt}</h3>
        {question.choices?.length ? (
          <div className="grid gap-2 mb-3">
            {question.choices.map(choice => <div key={choice} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-sm">{choice}</div>)}
          </div>
        ) : null}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { sfx.play("coin"); onCorrect(); }} className="flex-1 px-4 py-3 rounded-xl bg-emerald-400 text-black font-black hover:scale-[1.02] transition">✓ OK (Correct)</button>
          <button onClick={() => { sfx.play("buzz"); onWrong(); }} className="flex-1 px-4 py-3 rounded-xl bg-rose-500 font-black hover:scale-[1.02] transition">✗ Oops (Wrong)</button>
        </div>
        <details className="mt-3">
          <summary className="text-xs text-white/60 cursor-pointer">Show suggested answer</summary>
          <p className="mt-2 text-sm text-emerald-200 font-bold">{question.answer}</p>
          <p className="text-xs text-white/65">{question.explanation}</p>
        </details>
      </div>
    </div>
  );
}

export function getQ(payload: BaamPayload, idx: number) {
  return payload.questions[idx % payload.questions.length];
}

export function randInt(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const BOX_REWARDS = [
  { emoji: "💎", label: "Massive Bonus +50",  delta: 50, kind: "good" as const },
  { emoji: "💀", label: "Trap! −20",           delta: -20, kind: "bad" as const },
  { emoji: "🪨", label: "Dud (zero)",          delta: 0,  kind: "neutral" as const },
  { emoji: "🚀", label: "DOUBLE your score!", delta: 0,  kind: "double" as const },
];

export function rollTier() {
  const r = Math.random();
  if (r < 0.1) return { rarity: "golden", emoji: "🥇", label: "GOLDEN EGG", points: 25 };
  if (r < 0.4) return { rarity: "rare", emoji: "🐣", label: "RARE EGG", points: 5 };
  return { rarity: "common", emoji: "🥚", label: "PASTEL EGG", points: 1 };
}

export function checkWin3(b: string[]) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const l of lines) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return b[l[0]];
  return null;
}
