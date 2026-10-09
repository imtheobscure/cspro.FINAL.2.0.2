"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Flashcards, TeachingSlides, buildStaticHtml, downloadHtml } from "@/components/Review";
import type { Quiz } from "@/lib/types";
import { fmtCash } from "@/lib/engine";
import { listQuizzes, listResults, type QuizRow, type ResultRow } from "@/lib/localApi";

interface Saved { quiz: Quiz; wrongIds: string[]; name: string; cash: number; at: number }

export default function ReviewPage() {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [tab, setTab] = useState<"cards" | "slides">("cards");
  const [pick, setPick] = useState<number | null>(null);

  useEffect(() => {
    try { const s = localStorage.getItem("tq_last_review"); if (s) setSaved(JSON.parse(s)); } catch { /* ignore */ }
    // Both come from this browser: the arena is a static export (see localApi).
    setResults(listResults());
    setQuizzes(listQuizzes());
  }, []);

  const active: { quiz: Quiz; wrongIds: string[]; label: string } | null = useMemo(() => {
    if (pick !== null) {
      const qz = quizzes.find((q) => q.id === pick);
      if (!qz) return null;
      const wrong = new Map<string, number>();
      results.filter((r) => r.quizId === pick).forEach((r) => r.wrongQuestionIds.forEach((id) => wrong.set(id, (wrong.get(id) || 0) + 1)));
      return { quiz: qz, wrongIds: [...wrong.keys()], label: `${qz.title} · all sessions` };
    }
    if (saved) return { quiz: saved.quiz, wrongIds: saved.wrongIds, label: `${saved.name} · ${saved.quiz.title} · ${fmtCash(saved.cash)}` };
    return null;
  }, [pick, quizzes, results, saved]);

  const wrongQs = active ? active.quiz.questions.filter((q) => active.wrongIds.includes(q.id)) : [];
  const stats = useMemo(() => {
    const m = new Map<string, number>();
    results.forEach((r) => r.wrongQuestionIds.forEach((id) => m.set(id, (m.get(id) || 0) + 1)));
    return m;
  }, [results]);

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        <h1 className="text-4xl sm:text-5xl font-black">🧠 Review Suite</h1>
        <p className="mt-2 text-lg text-white/70">Wrong answers become flashcards. Export a single HTML file and study offline on any device.</p>

        <div className="mt-5 flex flex-wrap gap-2 items-center">
          <button onClick={() => setPick(null)} className={`btn ${pick === null ? "btn-primary" : "btn-ghost"} !py-2`}>My last game</button>
          {quizzes.map((q) => (
            <button key={q.id} onClick={() => setPick(q.id)} className={`btn ${pick === q.id ? "btn-primary" : "btn-ghost"} !py-2`}>{q.title}</button>
          ))}
        </div>

        {!active ? (
          <div className="glass mt-6 rounded-3xl p-8 text-center">
            <div className="text-6xl">🃏</div>
            <div className="mt-3 text-2xl font-black">No review data yet</div>
            <div className="text-white/60">Play a game first — every mistake is captured here automatically.</div>
            <Link href="/play?solo=1" className="btn btn-gold mt-5">Play solo now</Link>
          </div>
        ) : (
          <div className="mt-6">
            <div className="glass rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-white/50">{active.label}</div>
                <div className="text-2xl font-black">{wrongQs.length} card{wrongQs.length !== 1 ? "s" : ""} to master · {active.quiz.questions.length} total questions</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setTab("cards")} className={`btn ${tab === "cards" ? "btn-primary" : "btn-ghost"}`}>🃏 Flashcards</button>
                <button onClick={() => setTab("slides")} className={`btn ${tab === "slides" ? "btn-primary" : "btn-ghost"}`}>📚 Lessons</button>
                <button onClick={() => downloadHtml(buildStaticHtml(active.quiz, wrongQs.length ? wrongQs : active.quiz.questions), `${active.quiz.title.replace(/\W+/g, "-")}-flashcards.html`)} className="btn btn-cash">⬇ Export HTML</button>
              </div>
            </div>
            <div className="mt-5">
              {tab === "cards" ? <Flashcards questions={wrongQs.length ? wrongQs : active.quiz.questions} /> : <TeachingSlides questions={[...wrongQs, ...active.quiz.questions.filter((q) => !active.wrongIds.includes(q.id))]} wrongIds={active.wrongIds} />}
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="glass mt-8 rounded-3xl p-5">
            <div className="text-2xl font-black">📊 Recent results</div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-base">
                <thead className="text-white/50 text-sm uppercase tracking-widest"><tr><th className="p-2">Player</th><th className="p-2">Game</th><th className="p-2">Cash</th><th className="p-2">✅</th><th className="p-2">❌</th><th className="p-2">When</th></tr></thead>
                <tbody>
                  {results.slice(0, 25).map((r) => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="p-2 font-black">{r.playerName}</td><td className="p-2">{r.gameCode}</td><td className="p-2 cash-text font-black">{fmtCash(r.cash)}</td><td className="p-2">{r.correct}</td><td className="p-2">{r.wrong}</td><td className="p-2 text-white/60">{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-sm text-white/60">Most-missed question ids across all games: {[...stats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => `${id} (${n})`).join(", ") || "—"}</div>
          </div>
        )}
      </main>
    </div>
  );
}
