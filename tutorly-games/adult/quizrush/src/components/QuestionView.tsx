"use client";

import { useEffect, useRef, useState } from "react";
import type { Question } from "@/lib/types";
import { speak, stopSpeaking, VOICE_CHARACTERS } from "@/lib/speech";
import { sfx } from "@/lib/sound";

const TILE_COLORS = [
  "from-rose-500 to-pink-600",
  "from-sky-500 to-blue-600",
  "from-amber-400 to-orange-500",
  "from-emerald-500 to-green-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-teal-600",
];
const TILE_SHAPES = ["🔺", "🔷", "🟡", "🟢", "🟣", "⬛"];

export default function QuestionView({
  question,
  qIndex,
  onSubmit,
  disabled,
  reveal,
  correctAnswer,
  hideChoices,
}: {
  question: Question;
  qIndex: number;
  onSubmit: (response: unknown) => void;
  disabled?: boolean;
  reveal?: boolean;
  correctAnswer?: number | number[] | string | string[];
  hideChoices?: number[]; // 50/50 removed indices
}) {
  const q = question;
  const [selected, setSelected] = useState<number[]>([]);
  const [typed, setTyped] = useState("");
  const [voice, setVoice] = useState("aria");
  const [speaking, setSpeaking] = useState(false);
  const [wordIndex, setWordIndex] = useState<number | null>(null);
  const [autoPlayed, setAutoPlayed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // reset when question changes
  useEffect(() => {
    setSelected([]);
    setTyped("");
    setWordIndex(null);
    setAutoPlayed(false);
    stopSpeaking();
    setSpeaking(false);
  }, [qIndex]);

  const isMulti = q.type === "multi";
  const showChoices = q.type !== "typed";

  const doSpeak = (text: string, track = false) => {
    setSpeaking(true);
    speak(
      text,
      voice,
      () => {
        setSpeaking(false);
        setWordIndex(null);
      },
      track ? (idx) => setWordIndex(idx) : undefined,
    );
  };

  const readable =
    q.type === "listening"
      ? q.audioText || ""
      : [q.passage, q.question, ...(q.choices || [])].filter(Boolean).join(". ");

  // auto-play listening audio once
  useEffect(() => {
    if (q.type === "listening" && !autoPlayed && !disabled) {
      const t = setTimeout(() => {
        doSpeak(q.audioText || "");
        setAutoPlayed(true);
      }, 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, autoPlayed, disabled]);

  const toggle = (i: number) => {
    if (disabled || reveal) return;
    sfx.click();
    if (isMulti) {
      setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
    } else {
      setSelected([i]);
      setTimeout(() => onSubmit(i), 120);
    }
  };

  const submitMulti = () => {
    if (!selected.length) return;
    onSubmit(selected);
  };
  const submitTyped = () => {
    if (!typed.trim()) return;
    onSubmit(typed.trim());
  };

  const tileState = (i: number) => {
    if (!reveal) return "";
    const correct = correctAnswer;
    const isCorrect = Array.isArray(correct) ? (correct as number[]).includes(i) : Number(correct) === i;
    const picked = selected.includes(i);
    if (isCorrect) return "ring-4 ring-green-300 brightness-110";
    if (picked && !isCorrect) return "opacity-50 ring-4 ring-red-400 grayscale";
    return "opacity-40";
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Passage */}
      {q.passage && (
        <div className="glass mb-4 rounded-2xl p-4 md:p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wide text-cyan-300">📖 Read the passage</span>
            <ReadAloudBtn speaking={speaking} onClick={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : doSpeak(q.passage!, true))} />
          </div>
          <p className="text-lg md:text-2xl leading-relaxed text-slate-100">{q.passage}</p>
        </div>
      )}

      {/* Listening */}
      {q.type === "listening" && (
        <div className="glass mb-4 flex flex-col items-center gap-3 rounded-2xl p-5 md:p-8">
          <div className="text-sm font-bold uppercase tracking-wide text-cyan-300">🎧 Listen carefully</div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {VOICE_CHARACTERS.map((c) => (
              <button
                key={c.key}
                onClick={() => setVoice(c.key)}
                className={`rounded-xl px-3 py-1.5 text-sm md:text-base font-bold ${
                  voice === c.key ? "bg-cyan-500/30 ring-2 ring-cyan-400" : "bg-white/10"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : doSpeak(q.audioText || ""))}
            className={`btn-glow flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 text-xl md:text-2xl font-black ${speaking ? "anim-ring" : ""}`}
          >
            {speaking ? "⏸ Playing…" : "▶ Play Audio"}
          </button>
          <p className="text-xs text-slate-400">You can replay as many times as you like.</p>
        </div>
      )}

      {/* Dialogue */}
      {q.dialogue && (
        <div className="glass mb-4 space-y-2 rounded-2xl p-4 md:p-6">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wide text-cyan-300">💬 Complete the dialogue</span>
            <ReadAloudBtn
              speaking={speaking}
              onClick={() =>
                speaking
                  ? (stopSpeaking(), setSpeaking(false))
                  : doSpeak(q.dialogue!.map((d) => `${d.speaker} says ${d.line}`).join(". "))
              }
            />
          </div>
          {q.dialogue.map((d, i) => (
            <div key={i} className={`flex gap-2 ${i % 2 ? "flex-row-reverse text-right" : ""}`}>
              <div className="rounded-2xl bg-white/8 px-4 py-2 text-lg md:text-2xl">
                <span className="mr-2 font-black text-cyan-300">{d.speaker}:</span>
                {d.line.includes("_") ? <span className="text-amber-300 font-black">? ? ?</span> : d.line}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question text */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <h2 className="text-2xl md:text-5xl font-black leading-tight">{q.question}</h2>
        {q.type !== "listening" && (
          <ReadAloudBtn speaking={speaking} onClick={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : doSpeak(readable))} />
        )}
      </div>

      {/* Typed answer */}
      {q.type === "typed" && (
        <div className="flex flex-col items-center gap-3">
          <input
            ref={inputRef}
            value={typed}
            disabled={disabled || reveal}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitTyped()}
            placeholder="Type your answer…"
            className="w-full max-w-xl rounded-2xl border-2 border-white/20 bg-white/5 px-5 py-4 text-center text-2xl md:text-3xl font-bold outline-none focus:border-cyan-400"
          />
          {reveal && (
            <div className="text-lg text-green-300">
              ✔ Accepted: {(Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]).join(" / ")}
            </div>
          )}
          {!reveal && (
            <button
              onClick={submitTyped}
              disabled={disabled || !typed.trim()}
              className="btn-glow rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 py-3 text-xl font-black disabled:opacity-40"
            >
              Submit ✍️
            </button>
          )}
        </div>
      )}

      {/* Choice tiles */}
      {showChoices && q.choices && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {q.choices.map((c, i) => {
              if (hideChoices?.includes(i)) {
                return (
                  <div key={i} className="rounded-2xl border-2 border-dashed border-white/10 p-4 text-center text-slate-600 line-through">
                    removed by 50/50 ✂️
                  </div>
                );
              }
              const picked = selected.includes(i);
              return (
                <button
                  key={i}
                  disabled={disabled || reveal}
                  onClick={() => toggle(i)}
                  className={`answer-tile flex items-center gap-3 rounded-2xl bg-gradient-to-br ${TILE_COLORS[i % 6]} p-4 md:p-6 text-left shadow-xl ${tileState(i)} ${
                    picked && !reveal ? "ring-4 ring-white scale-[1.02]" : ""
                  }`}
                >
                  <span className="text-2xl md:text-4xl">{TILE_SHAPES[i % 6]}</span>
                  <span className="flex-1 text-lg md:text-3xl font-black leading-tight text-white">{c}</span>
                  {isMulti && !reveal && (
                    <span className={`flex h-7 w-7 items-center justify-center rounded-md border-2 ${picked ? "border-white bg-white text-slate-900" : "border-white/60"}`}>
                      {picked ? "✓" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {isMulti && !reveal && (
            <button
              onClick={submitMulti}
              disabled={disabled || !selected.length}
              className="btn-glow mt-4 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-4 text-xl md:text-2xl font-black disabled:opacity-40"
            >
              Lock In {selected.length} Answer{selected.length !== 1 ? "s" : ""} ✅
            </button>
          )}
        </>
      )}
    </div>
  );
}

function ReadAloudBtn({ speaking, onClick }: { speaking: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm md:text-base font-bold hover:bg-white/20 ${speaking ? "anim-ring text-cyan-300" : ""}`}
      title="Read aloud"
    >
      {speaking ? "⏸" : "🔊"} <span className="hidden md:inline">{speaking ? "Stop" : "Read aloud"}</span>
    </button>
  );
}
