"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell, SectionTitle, Mascot, ContentStatus, EmptyPackNotice } from "@/components/ui";
import { useContent } from "@/lib/content-provider";
import { useStore, SRS_KEY } from "@/lib/store";
import { buildPracticeExercises, buildReviewExercises, type Exercise } from "@/lib/lesson-engine";
import LessonPlayer from "@/components/LessonPlayer";

export default function PracticePage() {
  const { pack } = useContent();
  const { state } = useStore();
  const [started, setStarted] = useState(false);
  const [srs, setSrs] = useState<Record<string, { nextReview: string; reps: number }>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SRS_KEY);
      if (raw) setSrs(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const dueTerms = useMemo(() => {
    const now = Date.now();
    const due = Object.entries(srs)
      .filter(([, v]) => new Date(v.nextReview).getTime() <= now)
      .map(([k]) => k);
    const fromMistakes = state.mistakes.filter((m) => !m.resolved).map((m) => m.correctAnswer);
    return Array.from(new Set([...due, ...fromMistakes]));
  }, [srs, state.mistakes]);

  const exercises: Exercise[] = useMemo(
    () => (dueTerms.length ? buildPracticeExercises(pack, dueTerms, 12) : buildReviewExercises(pack, 12, Math.floor(Date.now() / 86400000))),
    [pack, dueTerms],
  );

  if (started && exercises.length > 0) {
    return (
      <div className="min-h-screen bg-white">
        <LessonPlayer exercises={exercises} lessonId={9999} lessonTitle="⚡ Smart practice & review" accent="#A560FF" onExit="/practice" />
      </div>
    );
  }

  const openMistakes = state.mistakes.filter((m) => !m.resolved).length;

  return (
    <PageShell>
      <ContentStatus />
      <SectionTitle icon="⚡" title="Smart practice & review" sub="Spaced repetition finds the items you are about to forget" />

      <div className="card-light rounded-3xl border-2 border-slate-200 bg-white p-5 text-center">
        <Mascot size={110} message="Let's go! 💪" />
        <h2 className="mt-2 text-xl font-black text-slate-800">Time to review!</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          This session uses spaced repetition: items come back after 1, 3, 7, 14 and 30 days so they stay in long-term memory.
        </p>
        <div className="mx-auto mt-4 grid max-w-md grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-purple-50 p-3">
            <p className="text-xl font-black text-purple-600">{exercises.length}</p>
            <p className="text-[11px] font-bold text-purple-400">Exercises</p>
          </div>
          <div className="rounded-2xl bg-red-50 p-3">
            <p className="text-xl font-black text-red-500">{openMistakes}</p>
            <p className="text-[11px] font-bold text-red-400">Open mistakes</p>
          </div>
          <div className="rounded-2xl bg-green-50 p-3">
            <p className="text-xl font-black text-green-600">{dueTerms.length}</p>
            <p className="text-[11px] font-bold text-green-500">Items due</p>
          </div>
        </div>
        <button
          onClick={() => setStarted(true)}
          disabled={exercises.length === 0}
          className="btn-3d mx-auto mt-5 block w-full max-w-md rounded-2xl border-[#7c3aed] bg-[#8b5cf6] py-4 text-lg font-black text-white disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400"
        >
          Start practice ⚡
        </button>
        <Link href="/mistakes" className="mt-2 block text-sm font-bold text-slate-400">
          Open the mistake notebook →
        </Link>
      </div>

      {!pack.vocabulary.length && !pack.grammar.length && !pack.sentences.length && (
        <div className="mt-4">
          <EmptyPackNotice feature="practice" />
        </div>
      )}

      <div className="card-light mt-4 rounded-3xl border-2 border-slate-200 bg-white p-5">
        <h3 className="font-black text-slate-800">🪜 Review ladder</h3>
        <div className="mt-3 flex items-center justify-between gap-1">
          {["1d", "3d", "7d", "14d", "30d", "∞"].map((d, i) => (
            <React.Fragment key={d}>
              <div className="flex flex-col items-center">
                <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white ${i < 3 ? "bg-[#58CC02]" : "bg-slate-300"}`}>
                  {i < 3 ? "✓" : i + 1}
                </span>
                <span className="font-latin mt-1 text-[10px] font-bold text-slate-400">{d}</span>
              </div>
              {i < 5 && <div className={`h-1 flex-1 rounded ${i < 2 ? "bg-[#58CC02]" : "bg-slate-200"}`} />}
            </React.Fragment>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Each successful review pushes the next review further away — that is how it sticks.</p>
      </div>
    </PageShell>
  );
}
