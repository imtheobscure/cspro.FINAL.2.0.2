"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Theme, Word } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { speakText, ui } from "@/lib/i18n";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { WordImage, Emoji } from "../WordImage";
import { SpeakButton } from "../SpeakButton";
import { BigButton, ProgressDots, Toast, shuffle } from "../ui";
import { Celebration } from "./Celebration";

type Mode = "hear-pic" | "pic-word" | "word-pic" | "count";
const ROUNDS = 6;

interface Round { answer: Word; options: Word[] }

function makeRounds(words: Word[], n: number, choices: number): Round[] {
  const pool = shuffle(words).slice(0, n);
  return pool.map((answer) => {
    const others = shuffle(words.filter((w) => w.id !== answer.id)).slice(0, choices - 1);
    return { answer, options: shuffle([answer, ...others]) };
  });
}

export function Quiz({ theme }: { theme: Theme }) {
  const s = useSettings();
  const target = s.target;
  const isNumbers = theme.kind === "number";
  const modes: { id: Mode; icon: string; label: string }[] = useMemo(
    () => [
      ...(isNumbers ? [{ id: "count" as Mode, icon: "🔢", label: ui(target, "howMany") }] : []),
      { id: "hear-pic", icon: "👂", label: ui(target, "whichPicture") },
      { id: "pic-word", icon: "🔤", label: ui(target, "whichWord") },
      { id: "word-pic", icon: "👀", label: ui(target, "whichPicture") },
    ],
    [isNumbers, target],
  );
  const [mode, setMode] = useState<Mode>(isNumbers ? "count" : "hear-pic");
  const [rounds, setRounds] = useState<Round[]>(() => makeRounds(theme.words, ROUNDS, 3));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<{ t: string; tone: "mint" | "coral" | "sun" } | null>(null);

  const round = rounds[idx];

  const prompt = useCallback(() => {
    if (!round) return;
    const w = round.answer;
    if (mode === "hear-pic") return speak(`${ui(target, "touchThe", { w: w.t[target] })}`, target);
    if (mode === "pic-word") return speak(ui(target, "whatIsThis"), target);
    if (mode === "word-pic") return speak(`${ui(target, "whichPicture")} ${w.t[target]}`, target);
    if (mode === "count") return speak(ui(target, "howMany"), target);
  }, [round, mode, target]);

  useEffect(() => {
    if (s.autoSpeak && s.ready) {
      const t = setTimeout(() => void prompt(), 400);
      return () => clearTimeout(t);
    }
  }, [idx, mode, prompt, s.autoSpeak, s.ready]);

  const restart = (m: Mode = mode) => {
    setMode(m);
    setRounds(makeRounds(theme.words, ROUNDS, 3));
    setIdx(0); setPicked(null); setWrong([]); setScore(0); setMisses(0); setDone(false);
  };

  const choose = async (w: Word) => {
    if (picked) return;
    if (w.id === round.answer.id) {
      setPicked(w.id);
      sfx.ding();
      setToast({ t: `⭐ ${ui(target, "greatJob")}`, tone: "mint" });
      const firstTry = wrong.length === 0;
      if (firstTry) setScore((x) => x + 1);
      await speak(`${speakText(target, w)}! ${ui(target, "greatJob")}`, target);
      setTimeout(() => {
        if (idx + 1 >= rounds.length) setDone(true);
        else { setIdx(idx + 1); setPicked(null); setWrong([]); }
      }, 600);
    } else {
      sfx.oops();
      setWrong((p) => [...p, w.id]);
      setMisses((m) => m + 1);
      setToast({ t: `🤔 ${ui(target, "tryAgain")}`, tone: "coral" });
      void speak(ui(target, "tryAgain"), target);
    }
  };

  if (done) {
    const stars = score >= ROUNDS ? 3 : score >= ROUNDS - 2 ? 2 : 1;
    return (
      <Celebration
        stars={stars} themeId={theme.id} activity="quiz" onReplay={() => restart()}
        message={`${score} / ${ROUNDS} ✓`}
      />
    );
  }

  const showText = mode === "pic-word";
  const questionText =
    mode === "hear-pic" ? "👂 " + ui(target, "whichPicture")
    : mode === "pic-word" ? ui(target, "whatIsThis")
    : mode === "word-pic" ? round.answer.t[target]
    : ui(target, "howMany");

  return (
    <div className="mx-auto max-w-5xl">
      {toast && <Toast key={toast.t + idx + wrong.length} text={toast.t} tone={toast.tone} />}
      {/* Mode picker (tutor) */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => { sfx.tick(); restart(m.id); }}
            className={`rounded-full px-4 py-2 text-base font-bold transition-all ${mode === m.id ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-ink/10 hover:bg-cream-2"}`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Question */}
      <div className="card-soft mx-auto mb-6 flex max-w-3xl flex-col items-center gap-3 px-6 py-6 text-center">
        {(mode === "pic-word") && <WordImage word={round.answer} size={200} countEmoji={theme.countEmoji} className="anim-pop" />}
        {mode === "count" && (
          <div className="anim-pop flex flex-wrap justify-center gap-2" style={{ maxWidth: 520 }}>
            {Array.from({ length: round.answer.n ?? 1 }).map((_, i) => (
              <Emoji key={i} emoji={theme.countEmoji ?? "🍎"} size={round.answer.n! > 10 ? 44 : 64} />
            ))}
          </div>
        )}
        <div className="font-display text-4xl font-bold text-ink sm:text-5xl">{questionText}</div>
        <div className="flex items-center gap-2">
          <SpeakButton
            text={mode === "hear-pic" ? ui(target, "touchThe", { w: round.answer.t[target] }) : mode === "word-pic" ? round.answer.t[target] : mode === "count" ? ui(target, "howMany") : ui(target, "whatIsThis")}
            lang={target} size="lg" label={ui(target, "listenBtn")}
          />
          <span className="rounded-full bg-cream-2 px-3 py-1 text-sm font-bold text-ink-soft">{idx + 1} / {ROUNDS}</span>
        </div>
      </div>

      {/* Options */}
      <div className={`grid gap-4 ${showText || mode === "count" ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
        {round.options.map((w) => {
          const isRight = picked === w.id;
          const isWrong = wrong.includes(w.id);
          return (
            <button
              key={w.id}
              onClick={() => void choose(w)}
              disabled={isWrong}
              className={`card-soft flex min-h-44 flex-col items-center justify-center gap-2 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                isRight ? "anim-bounce ring-8 ring-mint" : isWrong ? "anim-shake opacity-40 grayscale" : ""
              }`}
              aria-label={w.t.en}
            >
              {showText || mode === "count" ? (
                <span className="font-display text-5xl font-bold text-ink sm:text-6xl">
                  {mode === "count" ? w.n : w.t[target]}
                </span>
              ) : (
                <WordImage word={w} size={150} countEmoji={theme.countEmoji} />
              )}
              {isRight && <span className="font-display text-2xl text-mint-deep">✓ {w.t[target]}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <ProgressDots total={ROUNDS} current={idx} done={Array.from({ length: idx }).map(() => true)} />
        <span className="text-ink-soft">{misses > 0 ? `🤔 ${misses}` : ""}</span>
        <BigButton tone="white" size="sm" onClick={() => restart()}>🔀 {ui(target, "again")}</BigButton>
      </div>
    </div>
  );
}
