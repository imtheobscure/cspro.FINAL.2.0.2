"use client";

import React, { useMemo, useState } from "react";
import { PageShell, SectionTitle, ContentStatus, EmptyPackNotice, pill } from "@/components/ui";
import { useContent } from "@/lib/content-provider";
import { speak } from "@/lib/audio";
import { refAnchor, useFocusScroll } from "@/lib/ref-link";
import { RaceQuiz } from "@/components/RaceQuiz";
import { buildIdiomRace } from "@/lib/race";
import type { IdiomEntry } from "@/content/tutolingo";

const TYPE_LABEL: Record<string, string> = {
  idiom: "Idiom",
  phrasal_verb: "Phrasal verb",
  collocation: "Collocation",
  proverb: "Proverb",
  slang: "Slang",
  expression: "Expression",
};

export function IdiomsView({ focus }: { focus?: string } = {}) {
  const { pack, loading } = useContent();
  // A deep link from a lesson pre-filters the list so the expression is on screen.
  const [search, setSearch] = useState(focus ?? "");
  const [type, setType] = useState("all");
  const [mode, setMode] = useState<"list" | "race">("list");
  const [page, setPage] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizPick, setQuizPick] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const SIZE = 24;

  const types = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of pack.idioms) map[i.type || "idiom"] = (map[i.type || "idiom"] || 0) + 1;
    return map;
  }, [pack.idioms]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pack.idioms.filter((i) => {
      if (type !== "all" && (i.type || "idiom") !== type) return false;
      if (!q) return true;
      return i.expression.toLowerCase().includes(q) || i.meaning.toLowerCase().includes(q) || (i.nativeMeaning ?? "").toLowerCase().includes(q);
    });
  }, [pack.idioms, search, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / SIZE));
  const pageItems = filtered.slice(page * SIZE, page * SIZE + SIZE);

  /** The race runs on the expressions the filters left, so it can be narrowed too. */
  const raceQuestions = useMemo(() => buildIdiomRace({ ...pack, idioms: filtered }), [pack, filtered]);

  useFocusScroll(focus, !loading && pageItems.length > 0);

  const quiz: IdiomEntry | undefined = pack.idioms[quizIdx % Math.max(1, pack.idioms.length)];
  const quizOptions = useMemo(() => {
    if (!quiz) return [];
    const others = pack.idioms.filter((x) => x.expression !== quiz.expression);
    const distractors = [0, 7, 13].map((k) => others[(quizIdx * 5 + k) % Math.max(1, others.length)]?.meaning).filter(Boolean) as string[];
    const set = Array.from(new Set([quiz.meaning, ...distractors]));
    return quizIdx % 2 ? set : [...set].reverse();
  }, [quiz, quizIdx, pack.idioms]);

  return (
    <>
      <ContentStatus />
      <SectionTitle
        icon="🎭"
        title="Idioms & expressions reference"
        sub={`${pack.idioms.length.toLocaleString("en-US")} entries: idioms, phrasal verbs, collocations and everyday expressions`}
      />

      {quiz && mode === "list" && (
        <div className="card-light mb-3 rounded-3xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4">
          <div className="flex items-center justify-between">
            <p className="font-black text-slate-800">🎯 Quick idiom quiz</p>
            <span className="rounded-full bg-purple-500 px-3 py-1 text-xs font-black text-white">Score: {score}</span>
          </div>
          <p className="font-latin mt-2 text-center text-xl font-black text-purple-700">“{quiz.expression}”</p>
          <p className="text-center text-xs text-slate-400">Pick the correct meaning</p>
          <div className="mx-auto mt-2 grid max-w-lg gap-1.5">
            {quizOptions.map((o) => {
              let cls = "border-slate-200 bg-white text-slate-600";
              if (quizPick === o && o === quiz.meaning) cls = "tile-correct";
              else if (quizPick === o) cls = "tile-wrong";
              else if (quizPick && o === quiz.meaning) cls = "tile-correct";
              return (
                <button
                  key={o}
                  disabled={!!quizPick}
                  onClick={() => {
                    setQuizPick(o);
                    if (o === quiz.meaning) setScore((s) => s + 1);
                    setTimeout(() => {
                      setQuizIdx((i) => i + 1);
                      setQuizPick(null);
                    }, 1200);
                  }}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-bold ${cls}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="card-light mb-3 rounded-3xl border-2 border-slate-200 bg-white p-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search expressions and meanings…"
          className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold outline-none focus:border-purple-400"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            onClick={() => setMode("list")}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${mode === "list" ? "bg-[#58CC02] text-white" : "bg-slate-100 text-slate-500"}`}
          >
            📖 All entries
          </button>
          <button
            onClick={() => setMode("race")}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${mode === "race" ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-500"}`}
          >
            ⏱️ Race against time
          </button>
          <span className="w-full" />
          <button
            onClick={() => {
              setType("all");
              setPage(0);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${type === "all" ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-500"}`}
          >
            All ({pack.idioms.length})
          </button>
          {Object.entries(types).map(([t, n]) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setPage(0);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-black ${type === t ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-500"}`}
            >
              {TYPE_LABEL[t] ?? t} ({n})
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] font-bold text-slate-400">
          {filtered.length.toLocaleString("en-US")} results · page {page + 1} of {totalPages}
        </p>
      </div>

      {!pack.idioms.length && <EmptyPackNotice feature="idiom" />}

      {mode === "race" ? (
        <RaceQuiz
          questions={raceQuestions}
          storageKey="idioms"
          title="Idioms race"
          blurb="Meaning to expression, expression to meaning and gap-fills — the fastest way to make idioms yours."
          accent="#8b5cf6"
          seconds={12}
        />
      ) : (
      <div className="grid gap-2.5 sm:grid-cols-2">
        {pageItems.map((entry, i) => (
          <div
            key={`${entry.expression}-${i}`}
            id={refAnchor("idioms", entry.expression)}
            data-ref={entry.expression}
            className="card-light scroll-mt-24 rounded-3xl border-2 border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-latin text-lg font-black text-slate-800">{entry.expression}</p>
              <button onClick={() => speak(entry.expression)} className="shrink-0 rounded-xl bg-blue-50 px-2.5 py-1.5 text-sm" aria-label="Pronounce">
                🔊
              </button>
            </div>
            {entry.literalMeaning && <p className="mt-1 text-xs text-slate-400">Literally: {entry.literalMeaning}</p>}
            <p className="mt-0.5 text-sm font-bold italic text-purple-600">{entry.meaning}</p>
            {entry.nativeMeaning && <p className="text-xs text-slate-400">{entry.nativeMeaning}</p>}
            {entry.nativeNote && <p className="mt-1 rounded-xl bg-slate-50 p-2 text-xs leading-5 text-slate-600">{entry.nativeNote}</p>}
            {entry.usageNotes && <p className="mt-1 text-[11px] text-slate-400">💡 {entry.usageNotes}</p>}
            {entry.example && (
              <div className="mt-2 rounded-2xl bg-slate-50 p-2.5">
                <p className="font-latin text-sm text-slate-700">{entry.example.target}</p>
                {entry.example.native && <p className="text-xs text-slate-400">{entry.example.native}</p>}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {pill("purple", TYPE_LABEL[entry.type || "idiom"] ?? (entry.type || "Idiom"))}
              {entry.register && pill("slate", entry.register)}
            </div>
          </div>
        ))}
      </div>
      )}

      {mode === "list" && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-3d rounded-xl border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-500">
            Previous
          </button>
          <span className="text-sm font-black text-slate-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn-3d rounded-xl border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-500"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

export default function IdiomsPage() {
  return (
    <PageShell wide>
      <IdiomsView />
    </PageShell>
  );
}
