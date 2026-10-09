"use client";

import { useState } from "react";
import type { Question, TeachSlide } from "@/lib/types";
import { speak, stopSpeaking } from "@/lib/speech";

export interface WrongAnswer {
  questionIndex: number;
  question: string;
  type: string;
  choices?: string[];
  correctAnswer?: number | number[] | string | string[];
  yourAnswer?: unknown;
  explanation?: string;
  slide?: TeachSlide;
  passage?: string;
  audioText?: string;
  dialogue?: { speaker: string; line: string }[];
}

function answerText(q: { choices?: string[]; correctAnswer?: unknown }): string {
  const a = q.correctAnswer;
  if (Array.isArray(a)) {
    if (typeof a[0] === "number" && q.choices) return (a as number[]).map((i) => q.choices![i]).join(", ");
    return (a as string[]).join(" / ");
  }
  if (typeof a === "number" && q.choices) return q.choices[a] ?? String(a);
  return String(a ?? "");
}

// ===== Teaching slides carousel (all questions) =====
export function TeachingSlides({ questions }: { questions: Question[] }) {
  const [idx, setIdx] = useState(0);
  const q = questions[idx];
  const slide = q?.slide;
  const color = slide?.color || "#6d5efc";

  if (!q) return null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        className="anim-pop relative overflow-hidden rounded-3xl p-6 md:p-10"
        style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)`, border: `1px solid ${color}55` }}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 text-[9rem] opacity-20 anim-spin-slow">
          {slide?.emoji || "📘"}
        </div>
        <div className="relative">
          <div className="mb-1 text-sm font-black uppercase tracking-widest" style={{ color }}>
            Slide {idx + 1} / {questions.length}
          </div>
          <h3 className="text-3xl md:text-5xl font-black">
            {slide?.emoji} {slide?.title || q.question}
          </h3>
          <div className="mt-4 space-y-3 text-lg md:text-2xl">
            {slide?.meaning && (
              <p><span className="font-black text-cyan-300">Meaning: </span>{slide.meaning}</p>
            )}
            {slide?.usage && (
              <p><span className="font-black text-amber-300">Usage: </span>{slide.usage}</p>
            )}
            {slide?.example && (
              <p className="rounded-2xl bg-black/25 p-3"><span className="font-black text-green-300">Example: </span>{slide.example}</p>
            )}
            {slide?.tip && (
              <p><span className="font-black text-pink-300">💡 Tip: </span>{slide.tip}</p>
            )}
            <div className="rounded-2xl bg-green-500/15 p-3 ring-1 ring-green-400/40">
              <span className="font-black text-green-300">✔ Correct answer: </span>
              {answerText({ choices: q.choices, correctAnswer: q.answer })}
            </div>
            {q.explanation && <p className="text-slate-300">{q.explanation}</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="rounded-2xl bg-white/10 px-5 py-3 text-lg font-bold disabled:opacity-30"
        >
          ◀ Prev
        </button>
        <button
          onClick={() =>
            speak(
              `${slide?.title || q.question}. ${slide?.meaning || ""} ${slide?.usage || ""} Example: ${slide?.example || ""} Tip: ${slide?.tip || ""}`,
            )
          }
          className="btn-glow rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-3 text-lg font-bold"
        >
          🔊 Read Slide
        </button>
        <button
          onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
          disabled={idx === questions.length - 1}
          className="rounded-2xl bg-white/10 px-5 py-3 text-lg font-bold disabled:opacity-30"
        >
          Next ▶
        </button>
      </div>
    </div>
  );
}

// ===== Flashcards for wrong answers =====
export function Flashcards({ wrong }: { wrong: WrongAnswer[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!wrong.length) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <div className="text-6xl">🏆</div>
        <p className="mt-3 text-2xl font-black text-green-300">Flawless! No wrong answers to review.</p>
      </div>
    );
  }

  const card = wrong[idx];
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        onClick={() => setFlipped((f) => !f)}
        className="glass-strong flex min-h-[240px] cursor-pointer flex-col justify-center rounded-3xl p-6 md:p-10 text-center transition hover:brightness-110"
      >
        {!flipped ? (
          <>
            <div className="mb-2 text-sm font-black uppercase tracking-widest text-slate-400">Question</div>
            <div className="text-2xl md:text-3xl font-black">{card.question}</div>
            {card.passage && <p className="mt-3 text-base text-slate-300">{card.passage}</p>}
            <div className="mt-4 text-sm text-slate-500">Tap to flip 🔄</div>
          </>
        ) : (
          <>
            <div className="mb-2 text-sm font-black uppercase tracking-widest text-green-400">Answer</div>
            <div className="text-2xl md:text-3xl font-black text-green-300">
              {answerText({ choices: card.choices, correctAnswer: card.correctAnswer })}
            </div>
            {card.explanation && <p className="mt-3 text-lg text-slate-200">{card.explanation}</p>}
            {card.slide?.tip && <p className="mt-2 text-pink-300">💡 {card.slide.tip}</p>}
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => {
            setIdx((i) => Math.max(0, i - 1));
            setFlipped(false);
          }}
          disabled={idx === 0}
          className="rounded-2xl bg-white/10 px-5 py-3 text-lg font-bold disabled:opacity-30"
        >
          ◀
        </button>
        <div className="text-lg font-bold text-slate-300">
          {idx + 1} / {wrong.length}
        </div>
        <button
          onClick={() => {
            setIdx((i) => Math.min(wrong.length - 1, i + 1));
            setFlipped(false);
          }}
          disabled={idx === wrong.length - 1}
          className="rounded-2xl bg-white/10 px-5 py-3 text-lg font-bold disabled:opacity-30"
        >
          ▶
        </button>
      </div>

      <button
        onClick={() => downloadFlashcards(wrong)}
        className="btn-glow mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 py-4 text-xl font-black text-slate-900"
      >
        ⬇ Export Flashcards (offline HTML)
      </button>
    </div>
  );
}

export function downloadFlashcards(wrong: WrongAnswer[]) {
  stopSpeaking();
  const cards = wrong
    .map(
      (c, i) => `
    <div class="card" onclick="this.classList.toggle('flip')">
      <div class="face front"><div class="tag">Q${i + 1}</div><div class="q">${esc(c.question)}</div>${c.passage ? `<p class="passage">${esc(c.passage)}</p>` : ""}<div class="hint">tap to flip</div></div>
      <div class="face back"><div class="tag">Answer</div><div class="a">${esc(answerText({ choices: c.choices, correctAnswer: c.correctAnswer }))}</div>${c.explanation ? `<p class="exp">${esc(c.explanation)}</p>` : ""}${c.slide?.tip ? `<p class="tip">💡 ${esc(c.slide.tip)}</p>` : ""}</div>
    </div>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tutorly Flashcards</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
body{background:linear-gradient(180deg,#0a0e1a,#0b1022);color:#f8fafc;padding:24px;min-height:100vh}
h1{font-size:2rem;margin-bottom:4px}
p.sub{color:#94a3b8;margin-bottom:24px}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
.card{position:relative;min-height:200px;cursor:pointer;perspective:1000px}
.face{position:absolute;inset:0;border-radius:18px;padding:20px;display:flex;flex-direction:column;justify-content:center;backface-visibility:hidden;transition:transform .5s;border:1px solid rgba(255,255,255,.1)}
.front{background:rgba(20,27,51,.85);transform:rotateY(0)}
.back{background:linear-gradient(135deg,#16341f,#0f2a1a);transform:rotateY(180deg)}
.card.flip .front{transform:rotateY(-180deg)}
.card.flip .back{transform:rotateY(0)}
.tag{font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;font-weight:800}
.q{font-size:1.25rem;font-weight:800}
.a{font-size:1.35rem;font-weight:900;color:#4ade80}
.passage{margin-top:8px;font-size:.85rem;color:#cbd5e1}
.exp{margin-top:10px;color:#e2e8f0}
.tip{margin-top:8px;color:#f9a8d4}
.hint{position:absolute;bottom:12px;left:20px;font-size:.75rem;color:#64748b}
footer{margin-top:28px;color:#64748b;font-size:.85rem}
</style></head><body>
<h1>🧠 Tutorly Quizziz — Flashcards</h1>
<p class="sub">${wrong.length} card${wrong.length !== 1 ? "s" : ""} to master · tap any card to flip · works fully offline</p>
<div class="grid">${cards}</div>
<footer>Generated by Tutorly Quizziz · ${new Date().toLocaleString()}</footer>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tutorly-flashcards.html";
  a.click();
  URL.revokeObjectURL(url);
}

function esc(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}
