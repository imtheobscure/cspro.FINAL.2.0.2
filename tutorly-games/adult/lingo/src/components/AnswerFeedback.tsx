"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Coach } from "@/lib/lesson-engine";
import { speakLine, stopSpeaking } from "@/lib/tts";
import { playClick } from "@/lib/audio";
import { REF_TAB_ICON, REF_TAB_LABEL, refHref } from "@/lib/ref-link";

const PRAISE = ["Nice! 🎉", "Correct! ⭐", "Awesome! 🚀", "Exactly right! 💪", "You nailed it! 🔥"];
const RETRY = ["Not quite 💪", "Almost — look at this 🌱", "So close! 🎯"];

/**
 * Feedback for a checked answer: the verdict, the correct answer, and the mini
 * lesson that turns the question into something learned.
 *
 * The mini lesson is written in the learner's own language and always answers the
 * same three questions — *what does it mean, how is it built, when would I
 * actually say it* — plus examples in the language being learned and one question
 * the learner answers out loud (a CCQ). No heading: the content speaks for itself.
 */
export function AnswerFeedback({
  status,
  coach,
  answer,
  userAnswer,
  l1Name,
  l1Code,
  targetLanguage,
  note,
}: {
  status: "correct" | "wrong";
  coach?: Coach;
  /** The expected answer (shown when the learner got it wrong). */
  answer?: string;
  userAnswer?: string;
  /** Learner's first language, for the “Mini lesson (Spanish)” label. */
  l1Name?: string;
  /** ISO code of the learner's first language — decides which voice reads it. */
  l1Code?: string;
  /** Language being learned — decides the voice for the examples. */
  targetLanguage?: string;
  /** Extra one-liner, e.g. the raw explanation field. */
  note?: string;
}) {
  const good = status === "correct";
  const headline = good ? PRAISE[hash(answer ?? "") % PRAISE.length] : RETRY[hash(userAnswer ?? answer ?? "") % RETRY.length];

  const body = (coach?.native ?? "").trim();
  const meaning = (coach?.meaning ?? body ?? coach?.translation ?? "").trim();
  const translation = (coach?.translation ?? "").trim();
  const showTranslation = !!translation && translation !== meaning && translation !== body;
  const form = (coach?.form ?? "").trim();
  const use = (coach?.use ?? "").trim();
  const ccq = (coach?.ccq ?? "").trim();
  const englishNote = (note?.trim() || coach?.note?.trim()) ?? "";
  const examples = (coach?.examples ?? coach?.extra ?? []).map((x) => x.trim()).filter(Boolean);
  /** What the 🔊 button reads out: the whole mini lesson, in the learner's language. */
  const spoken = [body || meaning, form && `Form: ${form}`, use && `Use: ${use}`, ccq && `Say it out loud: ${ccq}`]
    .filter(Boolean)
    .join(". ");
  const hasLesson = !!(meaning || form || use || ccq || examples.length || englishNote || showTranslation);
  /**
   * A pack built with the old prompt carries no `feedback` block, so the only thing
   * to show is the translation. Say so, and say how to fix it — a silently thin
   * lesson looks like a bug.
   */
  const needsRicherPack = !form && !use && !ccq && examples.length <= 1 && !!meaning;

  return (
    <div
      className={`animate-pop-in border-t-2 px-4 pb-2 pt-3 ${good ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
    >
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{good ? "🎉" : "😅"}</span>
          <div className="flex-1">
            <p className={`font-black ${good ? "text-green-600" : "text-red-500"}`}>{headline}</p>
            {!good && answer && (
              <p className="mt-0.5 text-sm text-slate-600">
                Correct answer: <b className="font-latin">{answer}</b>
              </p>
            )}
            {!good && userAnswer && (
              <p className="text-xs text-slate-400">
                You answered: <span className="font-latin">{userAnswer}</span>
              </p>
            )}
          </div>
        </div>

        {hasLesson && (
          <div className="mt-3 max-h-[52vh] overflow-y-auto rounded-2xl border-2 border-slate-200 bg-white p-3">
            {spoken && (
              <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
                <ListenButton
                  text={spoken}
                  language={l1Code || l1Name || "English"}
                  speaker="Tutor"
                  label={l1Name ? `Hear the explanation in ${l1Name}` : "Hear the explanation"}
                />
              </div>
            )}

            {meaning && (
              <Section label="What it means" text={meaning} />
            )}
            {showTranslation && (
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-black text-slate-400">Also: </span>
                <span className="font-latin">{translation}</span>
              </p>
            )}
            {form && <Section label="How it is built" text={form} />}
            {use && <Section label="Where you will use it" text={use} highlight />}

            {!!examples.length && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[11px] font-black text-slate-400">
                  Examples{targetLanguage ? ` · ${targetLanguage}` : ""}
                </p>
                {examples.map((line, i) => (
                  <div key={`${line}-${i}`} className="flex items-start gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
                    <SpeakIcon text={line} language={targetLanguage || "English"} speaker={`Example ${i + 1}`} />
                    <p className="font-latin min-w-0 flex-1 text-xs font-bold text-slate-700">{line}</p>
                  </div>
                ))}
              </div>
            )}

            {ccq && (
              <div className="mt-2 rounded-xl border-2 border-amber-200 bg-amber-50 p-2.5">
                <p className="text-[11px] font-black text-amber-700">🗣️ Say the answer out loud</p>
                <div className="mt-1 flex items-start gap-2">
                  <SpeakIcon text={ccq} language={targetLanguage || "English"} speaker="Check question" />
                  <p className="font-latin min-w-0 flex-1 text-xs font-bold text-amber-900">{ccq}</p>
                </div>
              </div>
            )}

            {englishNote && (
              <div className="mt-2 rounded-xl bg-slate-50 p-2.5">
                <p className="whitespace-pre-line text-xs leading-5 text-slate-500">{englishNote}</p>
              </div>
            )}

            {needsRicherPack && (
              <p className="mt-2 rounded-xl border-2 border-dashed border-slate-200 p-2.5 text-[11px] font-bold text-slate-400">
                This pack was built before mini lessons existed, so there is only a translation here. Rebuild it with the
                current AI prompt — every item then carries a form, a real-life use, examples and a speaking question.
              </p>
            )}

            {/* Straight to the entry that explains this item, in the References hub. */}
            {coach?.ref && (
              <Link
                href={refHref(coach.ref.tab, coach.ref.key)}
                className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-blue-50 hover:text-[#1899D6]"
              >
                <span className="text-base">{REF_TAB_ICON[coach.ref.tab]}</span>
                Study this in References · {REF_TAB_LABEL[coach.ref.tab]}
                <span className="ml-auto">→</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, text, highlight }: { label: string; text: string; highlight?: boolean }) {
  return (
    <div className={`mt-2 rounded-xl p-2.5 ${highlight ? "bg-[#F2FAFF]" : "bg-slate-50"}`}>
      <p className={`text-[11px] font-black ${highlight ? "text-[#1899D6]" : "text-slate-400"}`}>{label}</p>
      <p className="mt-0.5 text-sm leading-6 text-slate-700">{text}</p>
    </div>
  );
}

/**
 * Read a line out loud with a natural voice. Azure voices are used when they are
 * configured (server proxy or the learner's own key), the device voice otherwise —
 * either way something is heard, and the button tells the learner when it is only
 * the device voice so they know why it sounds different.
 */
function ListenButton({ text, language, speaker, label }: { text: string; language: string; speaker: string; label: string }) {
  const [state, setState] = useState<"idle" | "playing" | "device">("idle");

  async function play() {
    playClick();
    if (state === "playing") {
      stopSpeaking();
      setState("idle");
      return;
    }
    setState("playing");
    const natural = await speakLine(text, { speaker, language });
    setState(natural ? "idle" : "device");
  }

  return (
    <button
      onClick={() => void play()}
      className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-500 transition hover:bg-blue-100"
      title={label}
    >
      <span className="text-base">{state === "playing" ? "⏸" : "🔊"}</span>
      {state === "playing" ? "Playing…" : "Listen"}
      {state === "device" && <span className="font-bold text-slate-400">· device voice</span>}
    </button>
  );
}

function SpeakIcon({ text, language, speaker }: { text: string; language: string; speaker: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      onClick={() => {
        playClick();
        setPlaying(true);
        void speakLine(text, { speaker, language }).finally(() => setPlaying(false));
      }}
      className="mt-[1px] shrink-0 rounded-lg bg-white px-2 py-1 text-xs shadow-sm"
      aria-label="Play this example"
    >
      {playing ? "⏸" : "🔊"}
    </button>
  );
}

/** Small stable hash so praise/retry lines do not flicker on every render. */
function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 997;
  return h;
}
