"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { SAMPLE_QUIZ } from "@/lib/sampleQuiz";
import type { Question, Quiz } from "@/lib/types";
import { deleteQuiz, isSeeded, listQuizzes, saveQuiz, type QuizRow } from "@/lib/localApi";
import { sfx } from "@/lib/audio";

const TYPES = ["mcq", "multi", "tf", "reading", "listening", "dialogue", "fill"];

function validate(raw: string): { quiz?: Quiz; errors: string[] } {
  const errors: string[] = [];
  let data: unknown;
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    data = JSON.parse(cleaned);
  } catch (e) { return { errors: ["Invalid JSON: " + (e as Error).message] }; }
  const d = data as Partial<Quiz>;
  if (!d || typeof d !== "object") return { errors: ["Root must be an object"] };
  if (!d.title) errors.push("Missing title");
  if (!Array.isArray(d.questions) || d.questions.length === 0) return { errors: [...errors, "questions[] is empty"] };
  const ids = new Set<string>();
  d.questions.forEach((q: Partial<Question>, i) => {
    const p = `Q${i + 1}`;
    if (!q.id) q.id = `q${i + 1}`;
    if (ids.has(q.id)) errors.push(`${p}: duplicate id ${q.id}`); ids.add(q.id);
    if (!q.type || !TYPES.includes(q.type)) errors.push(`${p}: invalid type "${q.type}"`);
    if (!q.prompt) errors.push(`${p}: missing prompt`);
    if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`${p}: needs ≥2 options`);
    if (!Array.isArray(q.correct) || q.correct.length === 0) errors.push(`${p}: correct[] missing`);
    else if (q.options && q.correct.some((c) => c < 0 || c >= q.options!.length)) errors.push(`${p}: correct index out of range`);
    if (q.type === "tf" && q.options?.length !== 2) errors.push(`${p}: tf needs exactly 2 options`);
    if (q.type === "multi" && (q.correct?.length ?? 0) < 2) errors.push(`${p}: multi needs ≥2 correct`);
    if (q.type !== "multi" && q.type !== "tf" && (q.correct?.length ?? 0) !== 1) errors.push(`${p}: ${q.type} needs exactly 1 correct`);
    if (q.type === "reading" && !q.passage) errors.push(`${p}: reading needs a passage`);
    if ((q.type === "listening" || q.type === "dialogue") && !Array.isArray(q.script)) errors.push(`${p}: ${q.type} needs script[]`);
    if (!q.explanation) errors.push(`${p}: missing explanation`);
    else { const e = q.explanation; if (!e.title || !e.meaning || !e.usage || !e.example) errors.push(`${p}: explanation needs title, meaning, usage, example`); }
    if (q.options && q.correct && q.options.length >= 3) {
      const lens = q.options.map((o) => o.length);
      const maxI = lens.indexOf(Math.max(...lens));
      if (q.correct.includes(maxI) && Math.max(...lens) > 1.6 * (lens.reduce((a, b) => a + b, 0) - lens[maxI]) / (lens.length - 1)) errors.push(`⚠ ${p}: correct answer is noticeably longer than distractors (guessable)`);
    }
  });
  const hard = errors.filter((e) => !e.startsWith("⚠"));
  return { quiz: hard.length ? undefined : (d as Quiz), errors };
}

export default function MakerPage() {
  const [copied, setCopied] = useState(false);
  const [raw, setRaw] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [mine, setMine] = useState<QuizRow[]>([]);

  // The library lives in this browser (the arena is a static export), so saving a
  // quiz survives a reload and travels with the tutor's own machine.
  const load = () => setMine(listQuizzes());
  useEffect(() => { load(); }, []);

  const copy = async () => { await navigator.clipboard.writeText(SYSTEM_PROMPT); setCopied(true); sfx.buy(); setTimeout(() => setCopied(false), 2000); };
  const check = (v: string) => { setRaw(v); const r = validate(v); setErrors(r.errors); setQuiz(r.quiz ?? null); setSavedId(null); };
  const save = () => {
    if (!quiz) return;
    setSaving(true);
    try {
      const row = saveQuiz(quiz);
      setSavedId(row.id);
      sfx.fanfare();
      load();
    } catch (e) {
      setErrors(["Could not save to this browser's library: " + String((e as Error)?.message || e)]);
    } finally {
      setSaving(false);
    }
  };
  const del = (id: number) => { if (isSeeded(id)) return; deleteQuiz(id); load(); };

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        <h1 className="text-4xl sm:text-5xl font-black">🧪 Test Maker</h1>
        <p className="mt-2 text-lg text-white/70">Turn any notes, article or vocab list into a full multi-skill quiz using your favourite AI (ChatGPT, Claude, Gemini, Copilot…). Copy the blueprint, paste your content after it, then paste the JSON back here.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-black">1 · System prompt blueprint</div>
              <button onClick={copy} className={`btn ${copied ? "btn-cash" : "btn-gold"}`}>{copied ? "✓ Copied!" : "📋 Copy prompt"}</button>
            </div>
            <pre className="mt-3 max-h-[28rem] overflow-auto rounded-2xl bg-black/40 p-4 text-sm leading-relaxed text-emerald-100 whitespace-pre-wrap">{SYSTEM_PROMPT}</pre>
            <div className="mt-3 text-sm text-white/60">Covers: 7 question types · anti-guessing rules (equal-length options) · explanation slides · flashcards.</div>
          </div>

          <div className="glass rounded-3xl p-5 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-black">2 · Paste the JSON</div>
              <button onClick={() => check(JSON.stringify(SAMPLE_QUIZ, null, 2))} className="btn btn-ghost !py-2 text-sm">Load example</button>
            </div>
            <textarea value={raw} onChange={(e) => check(e.target.value)} placeholder='{"title": "...", "questions": [...]}' className="mt-3 flex-1 min-h-[16rem] rounded-2xl bg-black/40 p-4 font-mono text-sm text-white outline-none focus:ring-4 ring-violet-500" />
            {errors.length > 0 && (
              <div className="mt-3 max-h-40 overflow-auto rounded-2xl bg-rose-500/15 border border-rose-400/30 p-3 text-sm">
                {errors.map((e, i) => <div key={i} className={e.startsWith("⚠") ? "text-amber-300" : "text-rose-200"}>• {e}</div>)}
              </div>
            )}
            {quiz && (
              <div className="mt-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 p-3">
                <div className="text-xl font-black">✓ {quiz.title}</div>
                <div className="text-sm text-white/70">{quiz.questions.length} questions · {[...new Set(quiz.questions.map((q) => q.type))].join(", ")}</div>
              </div>
            )}
            <button onClick={save} disabled={!quiz || saving} className="btn btn-cash mt-3 text-xl">{saving ? "Saving…" : "💾 Save quiz to library"}</button>
            {savedId && (
              <div className="mt-3 flex gap-2">
                <Link href="/host" className="btn btn-gold flex-1">🎤 Host it now</Link>
                <Link href="/play?solo=1" className="btn btn-primary flex-1">🎯 Try solo</Link>
              </div>
            )}
          </div>
        </div>

        <div className="glass mt-6 rounded-3xl p-5">
          <div className="text-2xl font-black">📚 Quiz library</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {mine.map((q) => (
              <div key={q.id} className="rounded-2xl bg-white/5 p-4 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-widest text-violet-300">{q.subject}</div>
                  <div className="text-xl font-black">{q.title}</div>
                  <div className="text-sm text-white/60">{q.questions.length} questions</div>
                </div>
                {isSeeded(q.id) ? (
                  <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[0.65rem] font-black uppercase tracking-wider text-white/50" title="Ships with the arena — it cannot be deleted">
                    built-in
                  </span>
                ) : (
                  <button onClick={() => del(q.id)} className="text-white/40 hover:text-rose-400 text-xl" title="Delete">🗑</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
