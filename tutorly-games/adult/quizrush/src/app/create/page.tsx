"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AI_SYSTEM_PROMPT } from "@/lib/aiPrompt";
import { SAMPLE_QUESTIONS } from "@/lib/sampleQuiz";
import { createGame } from "@/lib/localApi";
import type { Question } from "@/lib/types";

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [json, setJson] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = useMemo<{ ok: boolean; questions: Question[]; msg: string }>(() => {
    if (!json.trim()) return { ok: false, questions: [], msg: "" };
    try {
      let raw = json.trim();
      raw = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return { ok: false, questions: [], msg: "JSON must be an array." };
      const valid = arr.filter((q) => q && q.type && q.question);
      return { ok: valid.length > 0, questions: valid, msg: `${valid.length} valid question(s) detected.` };
    } catch (e) {
      return { ok: false, questions: [], msg: "Invalid JSON: " + (e as Error).message };
    }
  }, [json]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_SYSTEM_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — select the text manually.");
    }
  };

  const launchGame = (questions: Question[], t: string) => {
    setBusy(true);
    setError("");
    const data = createGame({ title: t || "Untitled Quiz", questions });
    if (data.game.code) router.push(`/host/room?code=${data.game.code}`);
    else {
      setError("Failed to create game.");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-cyan-300 hover:underline">← Home</Link>
        <h1 className="text-3xl md:text-5xl font-black">🤖 <span className="text-gradient">AI Test Maker</span></h1>
        <div className="w-16" />
      </div>

      {/* Step 1: blueprint */}
      <section className="glass-strong rounded-3xl p-5 md:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 font-black">1</div>
          <h2 className="text-2xl font-black">Copy the AI Blueprint Prompt</h2>
        </div>
        <p className="mt-2 text-slate-300">
          Paste this into ChatGPT, Claude, Gemini, or any LLM. It forces the model to output a
          pristine, anti-guessing JSON array of mixed question types with teaching slides.
        </p>
        <div className="relative mt-3">
          <pre className="max-h-64 overflow-auto rounded-2xl bg-black/40 p-4 text-xs md:text-sm text-slate-200">
{AI_SYSTEM_PROMPT}
          </pre>
          <button
            onClick={copyPrompt}
            className={`btn-glow absolute right-3 top-3 rounded-xl px-4 py-2 font-black ${copied ? "bg-green-500 text-slate-900" : "bg-gradient-to-r from-indigo-500 to-cyan-500"}`}
          >
            {copied ? "✓ Copied!" : "📋 Copy Prompt"}
          </button>
        </div>
      </section>

      {/* Step 2: paste JSON */}
      <section className="glass-strong mt-5 rounded-3xl p-5 md:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 font-black">2</div>
          <h2 className="text-2xl font-black">Paste the AI's JSON Output</h2>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quiz title (e.g. Unit 5 Vocabulary)"
          className="mt-3 w-full rounded-2xl border-2 border-white/15 bg-white/5 px-4 py-3 text-lg font-bold outline-none focus:border-cyan-400"
        />
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder='Paste the JSON array here, e.g. [{"type":"mc","question":"...","choices":[...],"answer":0}]'
          className="mt-3 h-56 w-full resize-y rounded-2xl border-2 border-white/15 bg-black/30 p-4 font-mono text-sm outline-none focus:border-cyan-400"
        />
        {parsed.msg && (
          <div className={`mt-2 rounded-xl px-3 py-2 text-sm font-bold ${parsed.ok ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
            {parsed.ok ? "✔ " : "✖ "}
            {parsed.msg}
          </div>
        )}
      </section>

      {error && <div className="mt-4 rounded-xl bg-red-500/20 px-4 py-2 text-red-300">{error}</div>}

      {/* Step 3: launch */}
      <section className="mt-5 flex flex-col gap-3 md:flex-row">
        <button
          disabled={!parsed.ok || busy}
          onClick={() => launchGame(parsed.questions, title)}
          className="btn-glow flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 py-5 text-2xl font-black text-slate-900 disabled:opacity-40"
        >
          {busy ? "Launching…" : `🚀 Host Game (${parsed.questions.length} Q)`}
        </button>
        <button
          disabled={busy}
          onClick={() => launchGame(SAMPLE_QUESTIONS, "QuizRush Demo: Mixed Skills Challenge")}
          className="btn-glow rounded-2xl bg-white/10 px-6 py-5 text-xl font-black hover:bg-white/20"
        >
          🎯 Try Demo Quiz
        </button>
      </section>
    </main>
  );
}
