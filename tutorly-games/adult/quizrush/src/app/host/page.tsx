"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SAMPLE_QUESTIONS, SAMPLE_TITLE } from "@/lib/sampleQuiz";
import { createGame } from "@/lib/localApi";

export default function HostLaunch() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const launchDemo = () => {
    setBusy(true);
    const data = createGame({
      title: SAMPLE_TITLE,
      questions: SAMPLE_QUESTIONS,
      sample: { title: SAMPLE_TITLE, questions: SAMPLE_QUESTIONS },
    });
    if (data.game.code) router.push(`/host/room?code=${data.game.code}`);
    else setBusy(false);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 text-cyan-300 hover:underline">← Home</Link>
      <h1 className="text-center text-4xl md:text-6xl font-black">🎤 <span className="text-gradient">Host a Game</span></h1>
      <p className="mt-3 text-center text-lg text-slate-300">
        Launch instantly with our demo quiz, or build your own with the AI Test Maker.
      </p>
      <div className="mt-8 grid w-full gap-4 md:grid-cols-2">
        <button
          onClick={launchDemo}
          disabled={busy}
          className="btn-glow glass-strong rounded-3xl p-7 text-left ring-1 ring-indigo-400/30 hover:ring-indigo-400 disabled:opacity-50"
        >
          <div className="text-5xl">🎯</div>
          <h3 className="mt-2 text-2xl font-black">{busy ? "Launching…" : "Launch Demo Game"}</h3>
          <p className="text-slate-300">8 mixed questions covering every skill type. Ready in one click.</p>
        </button>
        <Link
          href="/create"
          className="btn-glow glass-strong rounded-3xl p-7 text-left ring-1 ring-emerald-400/30 hover:ring-emerald-400"
        >
          <div className="text-5xl">🤖</div>
          <h3 className="mt-2 text-2xl font-black">Build with AI</h3>
          <p className="text-slate-300">Paste content, get a pristine quiz, then host it live.</p>
        </Link>
      </div>
    </main>
  );
}
