"use client";
import { useEffect, useState } from "react";
import type { Question, Quiz } from "@/lib/types";
import { speak, stopSpeech, sfx } from "@/lib/audio";

const GRADS = ["from-violet-600 to-indigo-800", "from-rose-500 to-pink-800", "from-emerald-500 to-teal-800", "from-amber-500 to-orange-800", "from-sky-500 to-blue-800", "from-fuchsia-500 to-purple-800"];

export function TeachingSlides({ questions, wrongIds = [] }: { questions: Question[]; wrongIds?: string[] }) {
  const [i, setI] = useState(0);
  const q = questions[i];
  useEffect(() => () => stopSpeech(), []);
  if (!q) return null;
  const e = q.explanation;
  const missed = wrongIds.includes(q.id);
  const readAloud = () => speak(`${e.title}. ${e.meaning} ${e.usage} For example: ${e.example}. ${e.tip ? "Tip: " + e.tip : ""}`, "female");
  return (
    <div className="w-full">
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${GRADS[i % GRADS.length]} p-6 sm:p-10 shadow-2xl anim-fade`} key={q.id}>
        <div className="absolute -right-10 -top-10 text-[14rem] opacity-10 select-none">{e.emoji || "💡"}</div>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-black/30 px-3 py-1 text-sm font-black uppercase tracking-widest">Slide {i + 1} / {questions.length}</span>
          {missed && <span className="rounded-full bg-rose-500 px-3 py-1 text-sm font-black">❌ You missed this</span>}
        </div>
        <div className="mt-4 text-5xl">{e.emoji}</div>
        <h2 className="mt-2 text-3xl sm:text-5xl font-black leading-tight">{e.title}</h2>
        <div className="mt-4 rounded-2xl bg-black/25 p-4 text-lg sm:text-xl">
          <div className="text-xs uppercase tracking-widest text-white/60">Question</div>
          <div className="font-bold">{q.prompt}</div>
          <div className="mt-2 text-emerald-300 font-black">✓ {q.correct.map((c) => q.options[c]).join(" · ")}</div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Block label="Meaning" text={e.meaning} icon="📘" />
          <Block label="Usage" text={e.usage} icon="🛠️" />
          <Block label="Example" text={e.example} icon="✍️" italic />
          {e.tip && <Block label="Memory tip" text={e.tip} icon="🧠" />}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={readAloud} className="btn btn-ghost">🔊 Read aloud</button>
          <button onClick={() => { sfx.click(); stopSpeech(); setI((x) => Math.max(0, x - 1)); }} disabled={i === 0} className="btn btn-ghost">◀ Prev</button>
          <button onClick={() => { sfx.click(); stopSpeech(); setI((x) => Math.min(questions.length - 1, x + 1)); }} disabled={i === questions.length - 1} className="btn btn-gold">Next ▶</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1 justify-center">
        {questions.map((qq, k) => (
          <button key={qq.id} onClick={() => setI(k)} className={`h-3 w-6 rounded-full ${k === i ? "bg-white" : wrongIds.includes(qq.id) ? "bg-rose-500/70" : "bg-white/25"}`} />
        ))}
      </div>
    </div>
  );
}

function Block({ label, text, icon, italic }: { label: string; text: string; icon: string; italic?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
      <div className="text-xs uppercase tracking-widest text-white/60">{icon} {label}</div>
      <div className={`mt-1 text-lg sm:text-xl font-semibold ${italic ? "italic" : ""}`}>{text}</div>
    </div>
  );
}

export function Flashcards({ questions }: { questions: Question[] }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const q = questions[i];
  if (!q) return <div className="glass rounded-3xl p-8 text-center text-xl">🎉 Nothing to review — perfect run!</div>;
  const ans = q.correct.map((c) => q.options[c]).join(" · ");
  const go = (d: number) => { setFlip(false); stopSpeech(); setI((x) => (x + d + questions.length) % questions.length); };
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-2 flex justify-between text-sm text-white/60"><span>Card {i + 1} / {questions.length}</span><span>✅ known: {known.size}</span></div>
      <div className="cursor-pointer" style={{ perspective: "1400px" }} onClick={() => { setFlip((f) => !f); sfx.reveal(); }}>
        <div className="relative h-[24rem] transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: flip ? "rotateY(180deg)" : "none" }}>
          <div className="absolute inset-0 glass rounded-3xl p-8 flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: "hidden" }}>
            <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Question · tap to flip</div>
            <div className="text-2xl sm:text-3xl font-black">{q.prompt}</div>
            {q.passage && <div className="mt-3 text-sm text-white/60 line-clamp-4">{q.passage}</div>}
          </div>
          <div className="absolute inset-0 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-emerald-600 to-teal-800" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <div className="text-xs uppercase tracking-widest text-white/60 mb-3">Answer</div>
            <div className="text-3xl font-black">{ans}</div>
            <div className="mt-4 text-lg font-semibold">{q.explanation.meaning}</div>
            <div className="mt-2 text-base italic text-white/80">{q.explanation.example}</div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button onClick={() => go(-1)} className="btn btn-ghost">◀</button>
        <button onClick={() => speak(flip ? `${ans}. ${q.explanation.meaning}` : q.prompt, "female")} className="btn btn-ghost">🔊</button>
        <button onClick={() => { setKnown((s) => new Set(s).add(q.id)); sfx.correct(); go(1); }} className="btn btn-cash">I know it ✓</button>
        <button onClick={() => { sfx.click(); go(1); }} className="btn btn-danger">Again ↻</button>
      </div>
    </div>
  );
}

export function buildStaticHtml(quiz: Quiz, questions: Question[], playerName?: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const cards = questions
    .map((q) => {
      const ans = q.correct.map((c) => q.options[c]).join(" · ");
      const e = q.explanation;
      return `<div class="card" onclick="this.classList.toggle('flip')"><div class="inner"><div class="face front"><div class="tag">${esc(q.type.toUpperCase())}</div><h3>${esc(q.prompt)}</h3>${q.passage ? `<p class="pass">${esc(q.passage)}</p>` : ""}<div class="hint">tap to flip</div></div><div class="face back"><div class="tag">ANSWER</div><h3>${esc(ans)}</h3><p><b>${esc(e.emoji || "")} ${esc(e.title)}</b></p><p>${esc(e.meaning)}</p><p><i>${esc(e.example)}</i></p>${e.tip ? `<p class="tip">🧠 ${esc(e.tip)}</p>` : ""}</div></div></div>`;
    })
    .join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(quiz.title)} — Flashcards</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b1020;color:#f4f6ff;padding:24px;font-size:18px}
h1{font-size:2rem;margin:0}.sub{color:#9aa3c7;margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:18px}
.card{perspective:1200px;cursor:pointer;height:320px}.inner{position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d}
.card.flip .inner{transform:rotateY(180deg)}.face{position:absolute;inset:0;backface-visibility:hidden;border-radius:20px;padding:22px;display:flex;flex-direction:column;justify-content:center;overflow:auto}
.front{background:#1a2140;border:1px solid #2c3766}.back{background:linear-gradient(135deg,#059669,#0f766e);transform:rotateY(180deg)}
.tag{font-size:.7rem;letter-spacing:.15em;opacity:.7;font-weight:800}h3{margin:8px 0;font-size:1.35rem}.pass{font-size:.85rem;opacity:.75}.hint{margin-top:auto;font-size:.8rem;opacity:.5}
.tip{background:rgba(0,0,0,.25);padding:8px 12px;border-radius:10px}p{margin:6px 0}
.btn{background:#7c3aed;color:#fff;border:0;border-radius:12px;padding:12px 18px;font-weight:800;font-size:1rem;cursor:pointer;margin-right:8px}
</style></head><body>
<h1>🎓 ${esc(quiz.title)} — Review Flashcards</h1>
<div class="sub">${playerName ? esc(playerName) + " · " : ""}${questions.length} cards · Tutorly Quizziz · works offline</div>
<button class="btn" onclick="document.querySelectorAll('.card').forEach(c=>c.classList.add('flip'))">Show all answers</button>
<button class="btn" onclick="document.querySelectorAll('.card').forEach(c=>c.classList.remove('flip'))">Hide all</button>
<button class="btn" onclick="var t=[...document.querySelectorAll('.card')].map(c=>c.querySelector('h3').innerText).join('. ');var u=new SpeechSynthesisUtterance(t);speechSynthesis.speak(u)">🔊 Read questions</button>
<div class="grid" style="margin-top:18px">${cards}</div>
</body></html>`;
}

export function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
