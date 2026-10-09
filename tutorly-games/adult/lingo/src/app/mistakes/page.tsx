"use client";

import React from "react";
import Link from "next/link";
import { PageShell, SectionTitle } from "@/components/ui";
import { useStore } from "@/lib/store";
import { ACTIVITY_LABELS, type ActivityKind } from "@/content/tutolingo";

export default function MistakesPage() {
  const { state, resolveMistake, trackMistakeReview, addXp, clearMistakes } = useStore();

  const open = state.mistakes.filter((m) => !m.resolved);
  const done = state.mistakes.filter((m) => m.resolved);

  return (
    <PageShell>
      <SectionTitle icon="📓" title="Mistake notebook" sub="Every mistake is a learning opportunity 🌱" />

      {state.mistakes.length === 0 ? (
        <div className="card-light rounded-3xl border-2 border-slate-200 bg-white p-8 text-center">
          <p className="text-5xl">🎉</p>
          <p className="mt-2 font-black text-slate-700">No mistakes recorded yet!</p>
          <p className="mt-1 text-sm text-slate-400">Wrong answers are collected here automatically so you can review them.</p>
          <Link href="/" className="btn-3d mx-auto mt-4 block max-w-xs rounded-2xl border-[#46A302] bg-[#58CC02] py-3 text-sm font-black text-white">
            Start a lesson
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-3 text-center">
              <p className="text-xl font-black text-red-500">{open.length}</p>
              <p className="text-[11px] font-bold text-red-400">To review</p>
            </div>
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-3 text-center">
              <p className="text-xl font-black text-green-600">{done.length}</p>
              <p className="text-[11px] font-bold text-green-500">Reviewed ✓</p>
            </div>
          </div>

          <div className="space-y-2">
            {open.map((m) => (
              <div key={m.id} className="card-light rounded-3xl border-2 border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                    {ACTIVITY_LABELS[m.exerciseType as ActivityKind] ?? m.exerciseType}
                  </span>
                  <span className="text-[11px] text-slate-300">{new Date(m.createdAt).toLocaleDateString("en-US")}</span>
                </div>
                <p className="font-latin mt-2 text-sm font-bold text-slate-800">{m.question}</p>
                {m.native && <p className="text-xs text-slate-400">{m.native}</p>}
                <div className="mt-2 grid gap-1.5 rounded-2xl bg-slate-50 p-2.5 text-sm">
                  <p>
                    ❌ Your answer: <b className="font-latin">{m.userAnswer || "(empty)"}</b>
                  </p>
                  <p>
                    ✅ Correct answer: <b className="font-latin text-green-600">{m.correctAnswer}</b>
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      resolveMistake(m.id);
                      trackMistakeReview();
                      addXp(3);
                    }}
                    className="btn-3d rounded-xl border-[#46A302] bg-[#58CC02] py-2 text-xs font-black text-white"
                  >
                    Got it ✓ (+3⚡)
                  </button>
                  <button
                    onClick={() => trackMistakeReview()}
                    className="btn-3d rounded-xl border-slate-300 bg-white py-2 text-xs font-black text-slate-500"
                  >
                    Still tricky
                  </button>
                </div>
              </div>
            ))}

            {done.length > 0 && (
              <details className="card-light rounded-3xl border-2 border-slate-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-black text-slate-600">Reviewed ({done.length})</summary>
                <div className="mt-2 space-y-1.5">
                  {done.map((m) => (
                    <p key={m.id} className="rounded-xl bg-green-50 p-2 text-xs text-slate-500">
                      ✅ <span className="font-latin">{m.correctAnswer}</span> — {m.question}
                    </p>
                  ))}
                </div>
              </details>
            )}

            <button onClick={clearMistakes} className="w-full rounded-2xl border-2 border-red-100 py-2.5 text-sm font-black text-red-400">
              🗑 Clear the notebook
            </button>
          </div>
        </>
      )}
    </PageShell>
  );
}
