"use client";

/**
 * Race against time.
 *
 * One shared, premium-looking timed quiz used by the Vocabulary, Dialogues and
 * Idioms references. Each question has its own clock: answer before the bar runs
 * out. Correct answers build a streak (and a multiplier); the best score is kept per
 * quiz in this browser, so every run has something to beat.
 */
import React, { useEffect, useRef, useState } from "react";
import type { RaceQuestion } from "@/lib/race";
import { speakLine } from "@/lib/tts";
import { playClick, playCorrect, playWrong, playStreak } from "@/lib/audio";
import { useStore } from "@/lib/store";

const BEST_PREFIX = "tutolingo-race-best-";

type Phase = "ready" | "playing" | "result";
type Verdict = "right" | "wrong" | "time";

function readBest(key: string): number {
  try {
    return parseInt(localStorage.getItem(BEST_PREFIX + key) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function writeBest(key: string, score: number): void {
  try {
    localStorage.setItem(BEST_PREFIX + key, String(score));
  } catch {
    /* storage blocked — the score simply is not remembered */
  }
}

/**
 * Shuffled chunks for an “order” question.
 *
 * Deterministic on purpose: the order depends on the question's own id, not on
 * `Math.random()`, so building the card cannot differ between the server render and
 * the browser (and it stays put if the component re-renders).
 */
function shuffledChunks(question: RaceQuestion): string[] {
  const sequence = question.sequence ?? [];
  const out = [...sequence];
  let seed = 7;
  for (const ch of question.id) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.length > 1 && out.every((line, i) => line === sequence[i])) [out[0], out[1]] = [out[1], out[0]];
  return out;
}

export function RaceQuiz({
  questions,
  storageKey,
  title,
  blurb,
  accent = "#58CC02",
  seconds = 12,
}: {
  questions: RaceQuestion[];
  /** Best score is remembered per quiz (and per browser). */
  storageKey: string;
  title: string;
  blurb?: string;
  accent?: string;
  seconds?: number;
}) {
  const { addXp } = useStore();
  const [phase, setPhase] = useState<Phase>("ready");
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string[]>([]);
  const [left, setLeft] = useState(seconds);
  const [best, setBest] = useState(0);
  const awarded = useRef(false);

  const total = questions.length;
  // Clamped: filters can shrink the list under a running quiz, and a run must never
  // crash on a question that no longer exists.
  const question = questions[Math.min(idx, Math.max(0, total - 1))];

  /** Shuffled chunks for `order` questions — derived, never randomised mid-render. */
  const chunks = question ? shuffledChunks(question) : [];

  /** Read the card out loud when it opens (words and sentences only). */
  useEffect(() => {
    if (phase !== "playing" || !question?.speak) return;
    const t = setTimeout(() => void speakLine(question.speak!, { speaker: "Narrator" }), 260);
    return () => clearTimeout(t);
  }, [phase, idx, question]);

  function next() {
    setVerdict(null);
    setPicked(null);
    setPlaced([]);
    if (idx + 1 >= total) {
      setPhase("result");
      const finalScore = score;
      // Read and write the record in a handler, never during render.
      const stored = readBest(storageKey);
      const record = Math.max(stored, finalScore);
      if (finalScore > stored) writeBest(storageKey, finalScore);
      setBest(record);
      if (!awarded.current) {
        awarded.current = true;
        addXp(Math.max(5, Math.round(finalScore / 2)));
      }
    } else {
      setIdx(idx + 1);
      setLeft(seconds);
    }
  }

  function resolve(result: Verdict) {
    if (verdict) return;
    setVerdict(result);
    setAnswered((n) => n + 1);
    if (result === "right") {
      const gain = 10 + Math.min(streak, 5) * 2;
      setScore((s) => s + gain);
      setCorrect((c) => c + 1);
      setStreak((s) => {
        const nextStreak = s + 1;
        setBestStreak((b) => Math.max(b, nextStreak));
        return nextStreak;
      });
      if (streak >= 3) playStreak();
      else playCorrect();
      setTimeout(next, 700);
    } else {
      setStreak(0);
      playWrong();
      setTimeout(next, result === "time" ? 1400 : 1000);
    }
  }

  /** The clock, restarted for every card. */
  useEffect(() => {
    if (phase !== "playing" || verdict) return;
    const deadline = Date.now() + seconds * 1000;
    const timer = setInterval(() => {
      const remain = Math.max(0, (deadline - Date.now()) / 1000);
      setLeft(remain);
      if (remain <= 0) {
        clearInterval(timer);
        resolve("time");
      }
    }, 100);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, verdict, seconds]);

  if (!total) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-3xl">🏁</p>
        <p className="mt-2 font-black text-slate-700">The race needs more content</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Load a bigger content pack — this quiz builds its questions from everything in your file.
        </p>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className="rounded-3xl border-2 p-6 text-center" style={{ borderColor: accent, background: `${accent}12` }}>
        <p className="text-4xl">⏱️</p>
        <h2 className="mt-2 text-xl font-black text-slate-800">{title}</h2>
        {blurb && <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">{blurb}</p>}
        <div className="mx-auto mt-3 flex max-w-md flex-wrap items-center justify-center gap-2 text-xs font-black text-slate-500">
          <span className="rounded-full bg-white px-3 py-1">{total} questions</span>
          <span className="rounded-full bg-white px-3 py-1">{seconds}s per question</span>
        </div>
        <button
          onClick={() => {
            playClick();
            setPhase("playing");
            setIdx(0);
            setScore(0);
            setCorrect(0);
            setAnswered(0);
            setStreak(0);
            setBestStreak(0);
            setVerdict(null);
            setPicked(null);
            setPlaced([]);
            setLeft(seconds);
          }}
          className="btn-3d mx-auto mt-4 block rounded-2xl px-8 py-3 text-lg font-black text-white"
          style={{ background: accent, borderColor: "rgba(0,0,0,.25)" }}
        >
          Start the race ▶
        </button>
      </div>
    );
  }

  if (phase === "result") {
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    const beat = score > 0 && score >= best;
    return (
      <div className="animate-pop-in rounded-3xl border-2 border-slate-200 bg-white p-6 text-center">
        <p className="text-5xl">{accuracy >= 80 ? "🏆" : accuracy >= 50 ? "🥇" : "🏁"}</p>
        <h2 className="mt-2 text-2xl font-black text-slate-800">Time&apos;s up!</h2>
        <p className="mt-1 text-sm text-slate-500">
          {beat ? "New personal best — that is the one to beat now." : `Your best is still ${best}.`}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Score" value={String(score)} />
          <Stat label="Correct" value={`${correct}/${answered}`} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Best streak" value={`${bestStreak}🔥`} />
        </div>
        <button
          onClick={() => {
            playClick();
            awarded.current = false;
            setPhase("playing");
            setIdx(0);
            setScore(0);
            setCorrect(0);
            setAnswered(0);
            setStreak(0);
            setBestStreak(0);
            setVerdict(null);
            setPicked(null);
            setPlaced([]);
            setLeft(seconds);
          }}
          className="btn-3d mx-auto mt-5 block rounded-2xl px-8 py-3 font-black text-white"
          style={{ background: accent, borderColor: "rgba(0,0,0,.25)" }}
        >
          Race again 🔁
        </button>
      </div>
    );
  }

  const timePct = Math.max(0, Math.min(100, (left / seconds) * 100));
  const urgent = left <= 3;

  return (
    <div className="rounded-3xl border-2 bg-white p-4" style={{ borderColor: `${accent}66` }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black text-slate-400">
          Question {idx + 1} of {total}
        </p>
        <div className="flex items-center gap-2 text-xs font-black">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">⭐ {score}</span>
          {streak >= 2 && <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">🔥 {streak} streak</span>}
          <span className={`rounded-full px-3 py-1 ${urgent ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
            ⏱️ {Math.ceil(left)}s
          </span>
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${urgent ? "bg-[#FF4B4B]" : ""}`}
          style={{ width: `${timePct}%`, background: urgent ? undefined : accent }}
        />
      </div>

      {!!question.context?.length && (
        <div className="mt-3 space-y-1.5">
          {question.context.map((line, i) => (
            <div key={`${line.target}-${i}`} className="rounded-2xl bg-slate-50 p-2.5">
              {line.speaker && <p className="text-[10px] font-black text-slate-400">{line.speaker}</p>}
              <p className="font-latin text-sm font-bold text-slate-700">{line.target}</p>
              {line.native && <p className="text-xs text-slate-400">{line.native}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        <p className="text-center text-xs font-black text-slate-500">{question.title}</p>
        {question.prompt && (
          <p className="font-latin mt-1 text-center text-xl font-black text-slate-800">{question.prompt}</p>
        )}
        {question.hint && <p className="mt-0.5 text-center text-xs text-slate-400">{question.hint}</p>}
        {question.speak && (
          <button
            onClick={() => void speakLine(question.speak!, { speaker: "Narrator" })}
            className="mx-auto mt-2 block rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-500"
          >
            🔊 Play audio
          </button>
        )}
      </div>

      {question.kind === "choose" ? (
        <div className="mt-3 grid gap-2">
          {(question.options ?? []).map((option, i) => {
            const isAnswer = option === question.answer;
            const isPicked = picked === option;
            let cls = "border-slate-200 bg-white text-slate-700 hover:border-slate-300";
            if (!verdict && isPicked) cls = "tile-selected";
            if (verdict === "right" && isAnswer) cls = "tile-correct";
            if (verdict === "wrong" && isPicked) cls = "tile-wrong";
            if (verdict === "time" && isAnswer) cls = "tile-correct";
            return (
              <button
                key={`${option}-${i}`}
                disabled={!!verdict}
                onClick={() => {
                  playClick();
                  setPicked(option);
                  resolve(option.trim() === (question.answer ?? "").trim() ? "right" : "wrong");
                }}
                className={`font-latin rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold shadow-sm transition ${cls}`}
              >
                <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-lg border border-current text-[11px] opacity-60">
                  {i + 1}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3">
          <div className="mb-2 flex min-h-[56px] flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-2">
            {placed.length === 0 && <span className="text-xs text-slate-300">Tap the lines in the right order…</span>}
            {placed.map((line, i) => (
              <button
                key={`${line}-${i}`}
                disabled={!!verdict}
                onClick={() => setPlaced(placed.filter((_, j) => j !== i))}
                className="font-latin animate-pop-in rounded-xl border-2 border-[#1CB0F6] bg-[#DDF4FF] px-2.5 py-1.5 text-xs font-bold text-[#1899D6]"
              >
                {line}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {chunks.map((line, i) => {
              const used = placed.filter((x) => x === line).length;
              const available = chunks.filter((x) => x === line).length;
              if (used >= available) return null;
              return (
                <button
                  key={`${line}-${i}`}
                  disabled={!!verdict}
                  onClick={() => {
                    playClick();
                    const nextPlaced = [...placed, line];
                    setPlaced(nextPlaced);
                    if (nextPlaced.length === (question.sequence ?? []).length) {
                      const ok = nextPlaced.every((x, k) => x === question.sequence![k]);
                      resolve(ok ? "right" : "wrong");
                    }
                  }}
                  className="font-latin rounded-xl border-2 border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 shadow-sm"
                >
                  {line}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {verdict && (
        <div
          className={`animate-pop-in mt-3 rounded-2xl p-2.5 text-center text-xs font-black ${
            verdict === "right" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {verdict === "right" ? "Correct! ⚡" : verdict === "time" ? `Time! Answer: ${question.answer ?? question.sequence?.join(" → ")}` : "Not quite 😅"}
          {verdict !== "right" && question.explain && (
            <p className="font-latin mt-1 whitespace-pre-line text-[11px] font-bold text-slate-500">{question.explain}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
      <p className="text-lg font-black text-slate-800">{value}</p>
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
    </div>
  );
}
