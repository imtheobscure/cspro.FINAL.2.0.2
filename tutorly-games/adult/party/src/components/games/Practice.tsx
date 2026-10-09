"use client";

import { useMemo, useState } from "react";
import { GRID_QUESTIONS } from "@/content/pack";
import { Btn, Chip, Panel } from "@/components/ui";
import { useArena } from "@/components/arena/provider";
import { MiniLesson } from "./GridArena";
import { sfx } from "@/lib/audio";
import { speakScript } from "@/lib/speech";

export default function PracticeMode() {
  const a = useArena();
  const bank = a.questions.length ? a.questions : GRID_QUESTIONS;
  const [order, setOrder] = useState<number[]>(() => bank.map((_, i) => i));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"all" | "easy" | "medium" | "hard">("all");

  const deck = useMemo(
    () => order.map((x) => bank[x % bank.length]).filter((q) => q && (filter === "all" || q.difficulty === filter)),
    [order, filter, bank],
  );
  const q = deck[i % Math.max(1, deck.length)];

  const move = (d: number) => { setFlipped(false); setI((v) => (v + d + deck.length) % deck.length); sfx("card"); };

  if (!q) return <p className="p-6 text-slate-400">No cards in this filter.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip colour="#38bdf8">Card {i + 1} of {deck.length}</Chip>
        {(["all", "easy", "medium", "hard"] as const).map((f) => (
          <Btn key={f} size="sm" tone={filter === f ? "amber" : "ghost"} onClick={() => { setFilter(f); setI(0); setFlipped(false); }}>{f}</Btn>
        ))}
        <Btn size="sm" tone="ghost" onClick={() => { setOrder((o) => [...o].sort(() => Math.random() - 0.5)); setI(0); setFlipped(false); sfx("deal"); }}>🔀 Shuffle</Btn>
        <span className="ml-auto text-xs text-slate-500">No timer. No score. This is the revision pass.</span>
      </div>

      <div className="flip-wrap">
        <div className={`flip-inner relative min-h-[340px] ${flipped ? "flipped" : ""}`}>
          {/* front */}
          <div className={`card-face ${flipped ? "pointer-events-none absolute inset-0 opacity-0" : ""}`}>
            <Panel title={`${q.skill} · ${q.cefr}`} right={<Chip colour="#f59e0b">{q.difficulty}</Chip>}>
              {q.passage && <div className="mb-3 max-h-48 overflow-y-auto whitespace-pre-line rounded-xl border border-sky-400/20 bg-sky-500/5 p-3 text-sm">{q.passage}</div>}
              {q.script && (
                <div className="mb-3 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3">
                  <Btn size="sm" tone="violet" onClick={() => void speakScript(q.script!, a.s.settings.narrator)}>▶ Play the listening</Btn>
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">{q.script.map((l, k) => <li key={k}><b className="text-violet-200">{l.speaker}:</b> {l.line}</li>)}</ul>
                </div>
              )}
              <p className="text-2xl font-bold leading-snug">{q.prompt}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((o, k) => (
                  <li key={k} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm">
                    <b className="mr-2 text-slate-500">{"ABCD"[k]}</b>{o}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn tone="amber" onClick={() => { setFlipped(true); sfx("reveal"); }}>Flip for the answer →</Btn>
                <Btn tone="ghost" onClick={() => a.say(q.prompt)}>🔊 Read aloud</Btn>
                <Btn tone="ghost" onClick={() => a.say(q.hint)}>💡 Hint</Btn>
              </div>
            </Panel>
          </div>

          {/* back */}
          {flipped && (
            <div className="card-face flip-back">
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-widest text-emerald-300">Answer</p>
                <p className="text-xl font-black text-white">{q.answer.map((x) => q.options[x]).join("  •  ")}</p>
              </div>
              <div className="mt-3"><MiniLesson q={q} correct /></div>
              <Btn className="mt-3" tone="ghost" onClick={() => setFlipped(false)}>← Back to the question</Btn>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Btn tone="ghost" onClick={() => move(-1)}>← Previous</Btn>
        <Btn tone="blue" onClick={() => move(1)}>Next card →</Btn>
      </div>
    </div>
  );
}
