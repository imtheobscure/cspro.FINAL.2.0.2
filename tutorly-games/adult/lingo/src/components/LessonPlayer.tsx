"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Exercise } from "@/lib/lesson-engine";
import { refHref, REF_TAB_ICON, type RefTab } from "@/lib/ref-link";
import { speak, stopSpeaking, playCorrect, playWrong, playClick, playComplete } from "@/lib/audio";
import { useStore } from "@/lib/store";
import { useContent } from "@/lib/content-provider";
import { contentL1Name } from "@/content/languages";
import { AnswerFeedback } from "./AnswerFeedback";
import { ProgressBar, fireConfetti } from "./ui";

interface Props {
  exercises: Exercise[];
  lessonId: number;
  lessonTitle: string;
  accent?: string;
  onExit: string;
}

type AnySpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

type Status = "answering" | "correct" | "wrong";

export default function LessonPlayer({ exercises, lessonId, lessonTitle, accent = "#58CC02", onExit }: Props) {
  const router = useRouter();
  const { pack } = useContent();
  const { state, addXp, completeLesson, loseHeart, addMistake, saveLessonProgress } = useStore();
  /**
   * The language the mini lesson is written in. The text comes from the pack, so
   * label it with the pack's own L1 when it declares one (a learner who later
   * changes their profile L1 must not mislabel translations already baked into
   * the file).
   */
  const l1Name = contentL1Name(state.l1, pack.meta.l1);
  const [userAnswer, setUserAnswer] = useState("");
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<Status>("answering");
  const [mistakes, setMistakes] = useState(0);
  /** Questions the learner passed on — most often because they cannot speak out loud right now. */
  const [skipped, setSkipped] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [done, setDone] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [noHearts, setNoHearts] = useState(false);
  const total = exercises.length;
  const ex = exercises[idx];

  /** Every reference entry this lesson practised, in first-seen order. */
  const lessonRefs = useMemo(() => {
    const seen = new Set<string>();
    const out: { tab: RefTab; key: string }[] = [];
    for (const e of exercises) {
      const r = e.coach?.ref;
      if (!r?.key) continue;
      const id = `${r.tab}:${r.key.toLowerCase()}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ tab: r.tab, key: r.key });
    }
    return out;
  }, [exercises]);

  /** True once we have looked for a saved position (so it only ever happens once). */
  const [resumeChecked, setResumeChecked] = useState(false);
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);

  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [matchSel, setMatchSel] = useState<{ en: string[]; native: string[] }>({ en: [], native: [] });
  const [matchDone, setMatchDone] = useState<string[]>([]);
  const [orderSel, setOrderSel] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recogRef = useRef<AnySpeechRecognition | null>(null);

  useEffect(() => {
    setAnswer("");
    setSelected(null);
    setMatchSel({ en: [], native: [] });
    setMatchDone([]);
    setOrderSel([]);
    setShowHint(false);
    setStatus("answering");
    setTranscript("");
  }, [idx]);

  /**
   * Resume where the learner stopped. The saved position is applied once, on the
   * first render that has both the store and the exercises available, and it asks
   * the store to forget it as soon as it has been used.
   */
  useEffect(() => {
    if (resumeChecked || total === 0) return;
    const p = state.lessonProgress;
    setResumeChecked(true);
    if (p && p.lessonId === lessonId && p.index > 0 && p.index < total) {
      setIdx(p.index);
      setResumedFrom(p.index);
    }
  }, [resumeChecked, state.lessonProgress, lessonId, total]);

  /**
   * Remember the exercise being worked on, so the next visit continues here.
   *
   * The store function is read through a ref on purpose: `useStore()` returns a
   * new API object whenever any state changes, so putting `saveLessonProgress` in
   * the dependency list made this effect re-run on every render it caused — an
   * infinite loop that froze the whole lesson screen.
   */
  const saveProgressRef = useRef(saveLessonProgress);
  useEffect(() => {
    saveProgressRef.current = saveLessonProgress;
  }, [saveLessonProgress]);
  useEffect(() => {
    if (!resumeChecked || done || noHearts || total === 0) return;
    saveProgressRef.current({ lessonId, index: idx, total, updatedAt: Date.now() });
  }, [resumeChecked, done, noHearts, idx, lessonId, total]);

  /** Leaving the screen must never leave a voice talking in the background. */
  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (ex && (ex.type === "type_hear" || ex.type === "listen_select") && state.soundOn) {
      const t = setTimeout(() => speak(ex.sentence?.target || ex.answer || ""), 500);
      return () => clearTimeout(t);
    }
  }, [idx, ex, state.soundOn]);

  const progress = useMemo(() => (idx / Math.max(1, total)) * 100, [idx, total]);
  const hint = useMemo(() => (ex ? hintFor(ex) : { main: "", extra: undefined as string | undefined }), [ex]);
  /** Correct answers over the questions the learner actually answered (skips excluded). */
  const answered = Math.max(0, total - skipped);
  const accuracy = answered > 0 ? Math.round(((answered - mistakes) / answered) * 100) : 0;

  if (!ex) return null;

  function handleCorrect() {
    setStatus("correct");
    if (state.soundOn) playCorrect();
    setXpEarned((x) => x + 10);
    addXp(10);
    if (Math.random() < 0.25) fireConfetti(false);
  }

  function handleWrong(userAns: string) {
    setUserAnswer(userAns);
    setStatus("wrong");
    if (state.soundOn) playWrong();
    setMistakes((m) => m + 1);
    loseHeart();
    addMistake({
      exerciseType: ex.type,
      question: ex.sentence?.target || ex.prompt?.target || ex.id,
      native: ex.sentence?.native || ex.prompt?.native,
      correctAnswer: ex.answer || "",
      userAnswer: userAns,
    });
  }

  function check() {
    let userAns = "";
    let ok = false;
    switch (ex.type) {
      case "fill_blank":
      case "select_translation":
      case "listen_select":
      case "tap_complete":
        userAns = selected || "";
        ok = !!selected && selected === ex.answer;
        break;
      case "type_hear": {
        if (!ex.answer) return;
        userAns = answer.trim();
        const norm = (s: string) => s.toLowerCase().replace(/[.?!,;:'"()]/g, "").replace(/\s+/g, " ").trim();
        ok = norm(answer) === norm(ex.answer);
        break;
      }
      case "reorder": {
        userAns = orderSel.join(" ");
        const norm = (s: string) => s.toLowerCase().replace(/[.?!,]/g, "").trim();
        ok = norm(userAns) === norm(ex.answer || "");
        break;
      }
      case "match":
        userAns = `${matchDone.length}/${(ex.pairs || []).length} matched`;
        ok = matchDone.length === (ex.pairs || []).length;
        break;
      case "speak": {
        userAns = transcript || "(no speech captured)";
        const norm = (s: string) => s.toLowerCase().replace(/[.?!,]/g, "").trim();
        const target = norm(ex.answer || "");
        if (!transcript) ok = false;
        else {
          const heard = new Set(norm(transcript).split(" "));
          const words = target.split(" ");
          ok = words.filter((w) => heard.has(w)).length / Math.max(1, words.length) >= 0.5;
        }
        break;
      }
    }
    if (ok) handleCorrect();
    else handleWrong(userAns);
  }

  function finish() {
    const perfect = mistakes === 0 && skipped === 0;
    const bonus = perfect ? 5 : 0;
    completeLesson(lessonId, perfect, bonus);
    setXpEarned((x) => x + bonus);
    setDone(true);
    if (state.soundOn) playComplete();
    fireConfetti(true);
  }

  function next() {
    if (state.hearts <= 0) {
      setNoHearts(true);
      return;
    }
    if (state.soundOn) playClick();
    if (idx + 1 >= total) finish();
    else setIdx(idx + 1);
  }

  /**
   * Skip the question without answering it — for the places where speaking or
   * typing out loud is simply not possible. No heart is lost and it is not counted
   * as a mistake; it just does not count towards accuracy.
   */
  function skip() {
    void stopSpeaking();
    setShowHint(false);
    setSkipped((s) => s + 1);
    if (state.soundOn) playClick();
    if (idx + 1 >= total) finish();
    else setIdx(idx + 1);
  }

  function exit() {
    void stopSpeaking();
    router.push(onExit);
  }

  function startListening() {
    const w = window as unknown as {
      SpeechRecognition?: new () => AnySpeechRecognition;
      webkitSpeechRecognition?: new () => AnySpeechRecognition;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      const v = window.prompt("This browser has no speech recognition. Type the sentence instead so it can be checked:");
      if (v) setTranscript(v);
      return;
    }
    try {
      recogRef.current?.abort();
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      setListening(true);
      rec.onresult = (e) => {
        setTranscript(e.results[0][0].transcript);
        setListening(false);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      rec.start();
      recogRef.current = rec;
    } catch {
      setListening(false);
    }
  }

  if (total === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-6xl">🗂️</div>
        <h1 className="mt-4 text-2xl font-black text-slate-800">This lesson has no content yet</h1>
        <p className="mt-2 text-slate-500">Generate the content pack and this lesson will fill itself in.</p>
        <button onClick={() => router.push("/prompt")} className="btn-3d mt-6 w-full rounded-2xl border-[#46A302] bg-[#58CC02] py-3 font-black text-white">
          Open the AI content prompt
        </button>
      </div>
    );
  }

  if (done) {
    const perfect = mistakes === 0;
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <div className="animate-bounce-in text-7xl">{perfect ? "🏆" : "🎉"}</div>
        <h1 className="mt-4 text-3xl font-black text-[#58CC02]">{perfect ? "Perfect lesson!" : "Lesson complete!"}</h1>
        <p className="mt-2 text-slate-500">
          {perfect
            ? "No mistakes at all — you earned 5 bonus XP."
            : `Finished with ${mistakes} mistake${mistakes === 1 ? "" : "s"}${skipped ? ` and ${skipped} skipped` : ""} — keep going!`}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-4">
            <p className="text-xs font-bold text-yellow-600">XP this lesson</p>
            <p className="text-2xl font-black text-yellow-500">⚡ {xpEarned}</p>
          </div>
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-bold text-blue-600">Accuracy</p>
            <p className="text-2xl font-black text-blue-500">{accuracy}%</p>
            <p className="text-[11px] font-bold text-blue-400">
              {answered} answered{skipped ? ` · ${skipped} skipped` : ""}
            </p>
          </div>
        </div>
        <button onClick={() => router.push(onExit)} className="btn-3d mt-6 w-full rounded-2xl border-[#46A302] bg-[#58CC02] py-4 text-lg font-black text-white">
          Continue
        </button>
        <button onClick={() => router.push("/mistakes")} className="mt-2 w-full rounded-2xl py-2 font-bold text-slate-400">
          Review my mistakes
        </button>

        {lessonRefs.length > 0 && (
          <div className="mt-6 rounded-3xl border-2 border-slate-200 bg-white p-4">
            <p className="text-[11px] font-black tracking-wide text-slate-400">STUDY THESE IN REFERENCES</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {lessonRefs.slice(0, 6).map((r) => (
                <Link
                  key={`${r.tab}:${r.key}`}
                  href={refHref(r.tab, r.key)}
                  className="max-w-[16rem] truncate rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-[#DDF4FF] hover:text-[#1899D6]"
                >
                  {REF_TAB_ICON[r.tab]} {r.key}
                </Link>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-bold text-slate-400">
              Everything you just practised, explained in one place.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (noHearts) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <div className="text-7xl">💔</div>
        <h1 className="mt-4 text-2xl font-black text-slate-800">Out of hearts!</h1>
        <p className="mt-2 text-slate-500">Refill them with 50 gems, or come back in 30 minutes.</p>
        <button onClick={() => router.push(onExit)} className="mt-6 w-full rounded-2xl py-2 font-bold text-slate-400">
          Back to the path
        </button>
      </div>
    );
  }

  const canCheck =
    status === "answering" &&
    (ex.type === "fill_blank" || ex.type === "select_translation" || ex.type === "listen_select" || ex.type === "tap_complete"
      ? !!selected
      : ex.type === "type_hear"
        ? answer.trim().length > 0
        : ex.type === "reorder"
          ? orderSel.length > 0
          : ex.type === "match"
            ? matchDone.length === (ex.pairs || []).length
            : ex.type === "speak"
              ? transcript.length > 0
              : false);

  return (
    <div className="lesson-shell mx-auto flex min-h-[calc(100vh-64px)] max-w-2xl flex-col px-4 pb-3 pt-4">
      <div className="flex items-center gap-3">
        <button onClick={exit} className="text-xl text-slate-400 hover:text-slate-600" aria-label="Exit lesson">
          ✕
        </button>
        <ProgressBar value={progress} color={accent} />
        <span className="flex items-center gap-1 text-sm font-black text-red-500">❤️ {state.hearts}</span>
        {ex?.coach?.ref && (
          <Link
            href={refHref(ex.coach.ref.tab, ex.coach.ref.key)}
            className="shrink-0 rounded-xl bg-slate-100 px-2.5 py-1 text-sm font-black text-slate-500 hover:bg-[#DDF4FF] hover:text-[#1899D6]"
            title={`Study “${ex.coach.ref.key}” in References`}
            aria-label="Study this in References"
          >
            📖
          </Link>
        )}
      </div>
      <p className="mt-3 text-center text-xs font-bold text-slate-400">
        {lessonTitle} — question {idx + 1} of {total}
      </p>

      {resumedFrom !== null && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-[#1CB0F6] bg-[#DDF4FF] px-3 py-2">
          <p className="text-xs font-black text-[#1899D6]">
            ⏩ Picked up where you stopped — question {resumedFrom + 1} of {total}
          </p>
          <button
            onClick={() => {
              setIdx(0);
              setResumedFrom(null);
              saveLessonProgress(null);
            }}
            className="rounded-xl bg-white px-3 py-1 text-xs font-black text-[#1899D6]"
          >
            Start over
          </button>
        </div>
      )}

      <div className="flex-1 py-4" key={ex.id}>
        <h2 className="mb-4 text-lg font-black text-slate-800 sm:text-xl">{ex.instruction}</h2>
        <ExerciseBody
          ex={ex}
          answer={answer}
          setAnswer={setAnswer}
          selected={selected}
          setSelected={setSelected}
          matchSel={matchSel}
          setMatchSel={setMatchSel}
          matchDone={matchDone}
          setMatchDone={setMatchDone}
          orderSel={orderSel}
          setOrderSel={setOrderSel}
          transcript={transcript}
          listening={listening}
          startListening={startListening}
          status={status}
        />

        {hint.main && (
          <div className="mt-4">
            {!showHint ? (
              <button onClick={() => setShowHint(true)} className="rounded-full border-2 border-dashed border-slate-300 px-4 py-1.5 text-sm font-bold text-slate-400">
                💡 Show hint
              </button>
            ) : (
              <div className="animate-pop-in rounded-2xl bg-slate-100 p-3 text-sm text-slate-600">
                💡 {hint.main}
                {hint.extra && <span className="font-latin mt-1 block text-slate-500">{hint.extra}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {status !== "answering" && (
        <AnswerFeedback
          status={status === "correct" ? "correct" : "wrong"}
          coach={ex.coach}
          answer={ex.answer}
          userAnswer={status === "wrong" ? userAnswer : undefined}
          l1Name={l1Name}
          l1Code={pack.meta.l1}
          targetLanguage={pack.meta.targetLanguage}
          note={ex.explain}
        />
      )}

      <div className="sticky bottom-0 z-10 mt-3 border-t-2 border-slate-200 bg-white/90 py-3 pb-[calc(0.75rem+var(--safe-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-3">
          {status === "answering" ? (
            <>
              <button
                onClick={check}
                disabled={!canCheck}
                className="btn-3d flex-1 rounded-2xl border-[#46A302] bg-[#58CC02] py-3.5 font-black text-white disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
              >
                Check
              </button>
              {/*
                Skipping is always available: some places are too quiet to speak in,
                some answers need a keyboard nobody has at hand. It costs no heart
                and is not scored as a mistake.
              */}
              <button
                onClick={skip}
                className="btn-3d rounded-2xl border-slate-300 bg-white px-5 py-3.5 text-sm font-black text-slate-500"
                title="Move on without answering — no heart lost"
              >
                Skip ⏭
              </button>
            </>
          ) : (
            <button
              onClick={next}
              className={`btn-3d flex-1 rounded-2xl py-3.5 font-black text-white ${status === "correct" ? "border-[#46A302] bg-[#58CC02]" : "border-[#d33131] bg-[#FF4B4B]"}`}
            >
              Continue
            </button>
          )}
        </div>
        {status === "answering" && idx + 1 < total && (
          <p className="mx-auto mt-1.5 max-w-2xl text-center text-[11px] font-bold text-slate-300">
            Can’t talk or type right now? Skip and come back to it in Smart practice.
          </p>
        )}
      </div>
    </div>
  );
}

/* ================= Hints ================= */

/**
 * What the 💡 button reveals.
 *
 * The exercises carry the sentence translation in their `hint`, and the sentence
 * block above already prints the very same translation — showing both produced the
 * “the hint gives me the translation twice” bug. The hint is therefore shown once,
 * and a second line only appears when it is genuinely different information.
 */
function hintFor(ex: Exercise): { main: string; extra?: string } {
  const hint = (ex.hint || "").trim();
  const native = (ex.sentence?.native || ex.prompt?.native || "").trim();
  const main = hint || native;
  return { main, extra: native && native !== main ? native : undefined };
}

/* ================= Exercise bodies ================= */
interface BodyProps {
  ex: Exercise;
  answer: string;
  setAnswer: (v: string) => void;
  selected: string | null;
  setSelected: (v: string | null) => void;
  matchSel: { en: string[]; native: string[] };
  setMatchSel: (v: { en: string[]; native: string[] }) => void;
  matchDone: string[];
  setMatchDone: (v: string[]) => void;
  orderSel: string[];
  setOrderSel: (v: string[]) => void;
  transcript: string;
  listening: boolean;
  startListening: () => void;
  status: "answering" | "correct" | "wrong";
}

function ExerciseBody(p: BodyProps) {
  const { ex, status } = p;
  const disabled = status !== "answering";

  if (ex.type === "match") {
    const pairs = ex.pairs || [];
    const left = pairs.map((x) => x.target);
    const right = [...pairs.map((x) => x.native || x.target)].reverse();
    const isDone = (target: string) => p.matchDone.includes(target);
    const nativeOf = (target: string) => pairs.find((x) => x.target === target)?.native || target;

    function tapLeft(target: string) {
      if (disabled || isDone(target)) return;
      playClick();
      const cur = p.matchSel.en.includes(target) ? [] : [target];
      const native = p.matchSel.native[0];
      if (native && cur.length) {
        if (nativeOf(target) === native) {
          p.setMatchDone([...p.matchDone, target]);
          p.setMatchSel({ en: [], native: [] });
          playCorrect();
        } else {
          p.setMatchSel({ en: cur, native: [native] });
          setTimeout(() => p.setMatchSel({ en: [], native: [] }), 450);
          playWrong();
        }
      } else p.setMatchSel({ en: cur, native: p.matchSel.native });
    }

    function tapRight(native: string) {
      if (disabled) return;
      const targetOfNative = pairs.find((x) => (x.native || x.target) === native)?.target || "";
      if (isDone(targetOfNative)) return;
      playClick();
      const cur = p.matchSel.native.includes(native) ? [] : [native];
      const target = p.matchSel.en[0];
      if (target && cur.length) {
        if (nativeOf(target) === native) {
          p.setMatchDone([...p.matchDone, target]);
          p.setMatchSel({ en: [], native: [] });
          playCorrect();
        } else {
          p.setMatchSel({ en: [target], native: cur });
          setTimeout(() => p.setMatchSel({ en: [], native: [] }), 450);
          playWrong();
        }
      } else p.setMatchSel({ en: p.matchSel.en, native: cur });
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {left.map((target) => (
            <button
              key={target}
              onClick={() => tapLeft(target)}
              disabled={disabled || isDone(target)}
              className={`font-latin rounded-2xl border-2 border-slate-200 bg-white px-3 py-3 text-sm font-bold shadow-sm ${p.matchSel.en.includes(target) ? "tile-selected" : ""} ${isDone(target) ? "opacity-30" : ""}`}
            >
              {isDone(target) ? "✓ " : ""}
              {target}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {right.map((native, i) => {
            const targetOfNative = pairs.find((x) => (x.native || x.target) === native)?.target || "";
            const done = isDone(targetOfNative);
            return (
              <button
                key={`${native}-${i}`}
                onClick={() => tapRight(native)}
                disabled={disabled || done}
                className={`rounded-2xl border-2 border-slate-200 bg-white px-3 py-3 text-sm font-bold shadow-sm ${p.matchSel.native.includes(native) ? "tile-selected" : ""} ${done ? "opacity-30" : ""}`}
              >
                {done ? "✓ " : ""}
                {native}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (ex.type === "fill_blank" || ex.type === "select_translation" || ex.type === "listen_select" || ex.type === "tap_complete") {
    const options = ex.options || ex.wordBank || [];
    return (
      <div>
        {ex.type === "listen_select" && (
          <button
            onClick={() => speak(ex.sentence?.target || ex.answer || "")}
            className="btn-3d mb-4 flex items-center gap-3 rounded-2xl border-[#1899D6] bg-[#1CB0F6] px-6 py-4 font-black text-white"
          >
            <span className="text-3xl">🔊</span> Play audio
          </button>
        )}
        {ex.prompt && (
          <div className="mb-3 rounded-2xl border-2 border-slate-200 bg-white p-4 text-center">
            <p className="text-lg font-black text-slate-800">{ex.prompt.target}</p>
            {ex.prompt.native && <p className="font-latin mt-1 text-sm text-slate-400">{ex.prompt.native}</p>}
          </div>
        )}
        {ex.sentence && ex.type !== "listen_select" && ex.type !== "select_translation" && (
          <div className="mb-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
            <p className="font-latin text-center text-lg font-bold text-slate-800">{ex.sentence.target}</p>
            {ex.sentence.native && <p className="mt-1 text-center text-sm text-slate-400">{ex.sentence.native}</p>}
          </div>
        )}
        {ex.type === "select_translation" && ex.sentence && (
          <p className="mb-3 text-center text-sm text-slate-400">{ex.sentence.target}</p>
        )}
        <div className="grid gap-2">
          {options.map((o, i) => {
            const sel = p.selected === o;
            let cls = "border-slate-200 bg-white text-slate-700";
            if (sel && status === "answering") cls = "tile-selected";
            if (status !== "answering" && o === ex.answer) cls = "tile-correct";
            if (status === "wrong" && sel && o !== ex.answer) cls = "tile-wrong";
            return (
              <button
                key={`${o}-${i}`}
                disabled={disabled}
                onClick={() => {
                  p.setSelected(o);
                  playClick();
                }}
                className={`rounded-2xl border-2 px-4 py-3.5 text-left font-bold shadow-sm transition ${cls}`}
              >
                <span className="mr-2 inline-grid h-7 w-7 place-items-center rounded-lg border border-current text-xs opacity-60">{i + 1}</span>
                {o}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (ex.type === "type_hear") {
    return (
      <div>
        <button
          onClick={() => speak(ex.sentence?.target || "")}
          className="btn-3d mb-4 flex items-center gap-3 rounded-2xl border-[#1899D6] bg-[#1CB0F6] px-6 py-4 font-black text-white"
        >
          <span className="animate-wiggle text-3xl">🔊</span> Play again
        </button>
        {ex.sentence?.native && <p className="mb-2 text-sm text-slate-400">{ex.sentence.native}</p>}
        <input
          value={p.answer}
          onChange={(e) => p.setAnswer(e.target.value)}
          disabled={disabled}
          lang="en"
          placeholder="Type what you hear…"
          className="font-latin w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-lg font-bold text-slate-800 outline-none placeholder:font-sans placeholder:font-normal placeholder:text-slate-300 focus:border-[#1CB0F6]"
          autoFocus
        />
        {status === "wrong" && <p className="font-latin mt-2 text-sm text-slate-500">Correct: {ex.answer}</p>}
      </div>
    );
  }

  if (ex.type === "reorder") {
    const usedCount: Record<string, number> = {};
    return (
      <div>
        {ex.sentence?.native && <p className="mb-3 rounded-2xl bg-slate-100 p-3 text-center text-sm text-slate-600">{ex.sentence.native}</p>}
        <div className="mb-3 flex min-h-[64px] flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-3">
          {p.orderSel.length === 0 && <span className="text-sm text-slate-300">Tap the words in the right order…</span>}
          {p.orderSel.map((w, i) => (
            <button
              key={`${w}-${i}`}
              disabled={disabled}
              onClick={() => p.setOrderSel(p.orderSel.filter((_, j) => j !== i))}
              className="font-latin animate-pop-in rounded-xl border-2 border-[#1CB0F6] bg-[#DDF4FF] px-3 py-1.5 text-sm font-bold text-[#1899D6]"
            >
              {w}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {(ex.words || []).map((w, i) => {
            usedCount[w] = usedCount[w] || 0;
            const usedIndices = p.orderSel.reduce<number[]>((acc, ow, oi) => (ow === w ? [...acc, oi] : acc), []);
            const instanceNum = (ex.words || []).slice(0, i + 1).filter((x) => x === w).length;
            if (usedIndices.length >= instanceNum) return null;
            return (
              <button
                key={`${w}-${i}`}
                disabled={disabled}
                onClick={() => {
                  p.setOrderSel([...p.orderSel, w]);
                  playClick();
                }}
                className="font-latin rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-slate-300"
              >
                {w}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (ex.type === "speak") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 max-w-md rounded-2xl border-2 border-slate-200 bg-white p-5">
          <p className="font-latin text-xl font-black text-slate-800">{ex.sentence?.target}</p>
          {ex.sentence?.native && <p className="mt-1 text-sm text-slate-400">{ex.sentence.native}</p>}
          <button onClick={() => speak(ex.sentence?.target || "")} className="mt-3 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-500">
            🔊 Listen
          </button>
        </div>
        <button
          onClick={p.startListening}
          disabled={disabled || p.listening}
          className={`btn-3d mx-auto grid h-20 w-20 place-items-center rounded-full border-4 text-3xl text-white ${p.listening ? "animate-glow border-red-300 bg-red-500" : "border-[#d33131] bg-[#FF4B4B]"}`}
        >
          {p.listening ? "⏺️" : "🎤"}
        </button>
        <p className="mt-2 text-sm font-bold text-slate-500">
          {p.listening ? "Listening… speak now" : "Tap the microphone and read the sentence"}
        </p>
        {p.transcript && (
          <div className="font-latin mx-auto mt-3 max-w-md rounded-2xl bg-slate-100 p-3 text-sm">🗣️ “{p.transcript}”</div>
        )}
      </div>
    );
  }

  return null;
}
