"use client";
import { useEffect, useMemo, useState } from "react";
import type { Question } from "@/lib/types";
import { speakScript, stopSpeech, speak, sfx } from "@/lib/audio";

const TYPE_LABEL: Record<Question["type"], string> = {
  mcq: "Multiple Choice",
  multi: "Select ALL that apply",
  tf: "True or False",
  reading: "Reading Comprehension",
  listening: "Listening",
  dialogue: "Complete the Dialogue",
  fill: "Fill the Gap",
};

export function shuffleIdx(n: number, seed: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function QuestionView({
  q,
  seed,
  onAnswer,
  locked,
  revealed,
  eliminated,
  hint,
  fog,
}: {
  q: Question;
  seed: number;
  onAnswer: (correct: boolean, chosen: number[]) => void;
  locked: boolean;
  revealed: boolean;
  eliminated: number[];
  hint?: string | null;
  fog?: boolean;
}) {
  const order = useMemo(() => (q.type === "tf" ? [0, 1] : shuffleIdx(q.options.length, seed)), [q, seed]);
  const [sel, setSel] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);

  useEffect(() => { setSel([]); setPlays(0); }, [q.id]);

  const isMulti = q.type === "multi";
  const hasAudio = q.type === "listening" || q.type === "dialogue";

  useEffect(() => {
    if (q.type === "listening" && q.script) {
      const t = setTimeout(() => play(), 600);
      return () => { clearTimeout(t); stopSpeech(); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id]);

  const play = () => {
    if (!q.script) return;
    setPlaying(true);
    setPlays((p) => p + 1);
    speakScript(q.script, () => setPlaying(false));
  };

  const choose = (origIdx: number) => {
    if (locked) return;
    sfx.click();
    if (isMulti) {
      setSel((s) => (s.includes(origIdx) ? s.filter((x) => x !== origIdx) : [...s, origIdx]));
    } else {
      onAnswer(q.correct.includes(origIdx), [origIdx]);
    }
  };

  const submitMulti = () => {
    if (locked || sel.length === 0) return;
    const ok = sel.length === q.correct.length && sel.every((i) => q.correct.includes(i));
    onAnswer(ok, sel);
  };

  return (
    <div className={`w-full ${fog ? "fogged" : ""}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-500/30 border border-violet-300/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-violet-100">{TYPE_LABEL[q.type]}</span>
        {isMulti && <span className="rounded-full bg-amber-500/30 px-3 py-1 text-sm font-bold text-amber-100">Pick {q.correct.length}</span>}
      </div>

      {q.passage && (
        <div className="glass mb-4 max-h-56 overflow-y-auto rounded-2xl p-4 text-lg leading-relaxed text-white/90">
          <button onClick={() => speak(q.passage!, "female")} className="float-right ml-3 rounded-full bg-white/10 px-3 py-1 text-sm font-bold">🔊 Read</button>
          {q.passage}
        </div>
      )}

      {q.type === "dialogue" && q.script && (
        <div className="glass mb-4 rounded-2xl p-4 space-y-2">
          {q.script.map((l, i) => (
            <div key={i} className={`flex gap-3 text-lg ${l.text.includes("____") ? "font-black text-amber-300" : "text-white/90"}`}>
              <span className="shrink-0 font-black text-violet-300">{l.speaker}:</span>
              <span>{l.text}</span>
            </div>
          ))}
        </div>
      )}

      {hasAudio && (
        <div className="mb-4 flex items-center gap-3">
          <button onClick={play} disabled={playing} className={`btn btn-primary ${playing ? "anim-flicker" : ""}`}>
            {playing ? "🔊 Playing…" : plays === 0 ? "▶️ Play audio" : "🔁 Replay"}
          </button>
          <span className="text-sm text-white/60">Natural voices · {q.script?.length} speaker line{(q.script?.length ?? 0) > 1 ? "s" : ""}</span>
        </div>
      )}

      <h2 className="mb-5 text-2xl sm:text-3xl lg:text-4xl font-black leading-snug drop-shadow-lg">{q.prompt}</h2>

      {hint && (
        <div className="mb-4 rounded-2xl border border-fuchsia-300/40 bg-fuchsia-600/20 p-3 text-lg font-bold text-fuchsia-100 anim-fade">🔮 Insight: {hint}</div>
      )}

      <div className={`grid gap-3 sm:gap-4 ${q.type === "tf" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
        {order.map((orig, i) => {
          const isCorrect = q.correct.includes(orig);
          const cls = revealed ? (isCorrect ? "correct" : sel.includes(orig) || !isMulti ? "wrong" : "wrong") : sel.includes(orig) ? "selected" : "";
          const elim = eliminated.includes(orig) && !revealed;
          return (
            <button key={orig} disabled={locked || elim} onClick={() => choose(orig)} className={`tile tile-${q.type === "tf" ? (orig === 0 ? 3 : 0) : i} ${cls} ${elim ? "eliminated" : ""}`}>
              <span className="mr-3 inline-grid h-9 w-9 place-items-center rounded-xl bg-black/25 text-base">{isMulti ? (sel.includes(orig) ? "✓" : "") : String.fromCharCode(65 + i)}</span>
              {q.options[orig]}
            </button>
          );
        })}
      </div>

      {isMulti && !revealed && (
        <button onClick={submitMulti} disabled={locked || sel.length === 0} className="btn btn-gold mt-4 w-full text-2xl">
          Lock in {sel.length} answer{sel.length !== 1 ? "s" : ""} ✓
        </button>
      )}
    </div>
  );
}
