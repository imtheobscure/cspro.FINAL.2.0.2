"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const join = () => {
    if (code.trim().length >= 4) router.push(`/join?code=${code.trim().toUpperCase()}`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* hero image backdrop */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[520px] opacity-30"
        style={{
          backgroundImage: "url(/images/hero-arena.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), transparent)",
          WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), transparent)",
        }}
      />
      {/* floating decor */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {["💵", "💰", "🔥", "⚡", "🛡️", "🎲", "🏆", "❄️"].map((e, i) => (
          <span
            key={i}
            className="absolute text-4xl opacity-10"
            style={{
              left: `${(i * 13 + 5) % 95}%`,
              top: `${(i * 27 + 10) % 90}%`,
              animation: `floatUp ${6 + i}s ${i * 0.5}s ease-in-out infinite alternate`,
            }}
          >
            {e}
          </span>
        ))}
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-10 md:py-16">
        <div className="mb-3 rounded-full glass px-4 py-1.5 text-sm font-bold text-cyan-300">
          🎮 Live · Multiplayer · Real Economy · Zero cost to play
        </div>
        <h1 className="text-center text-5xl md:text-8xl font-black leading-none tracking-tight">
          <span className="text-gradient">Tutorly</span>
          <br />
          <span className="drop-shadow-lg">Quizziz</span>
        </h1>
        <p className="mt-5 max-w-2xl text-center text-lg md:text-2xl text-slate-300">
          The high-adrenaline learning arena where correct answers earn{" "}
          <span className="money text-green-400">real cash</span>, power-ups drop from the sky, and the
          leaderboard never stops moving. Host on the big screen — learners join from their phones.
        </p>

        {/* Join box */}
        <div className="mt-9 w-full max-w-md glass-strong rounded-3xl p-5">
          <label className="mb-1 block text-sm font-bold uppercase tracking-wide text-slate-400">
            Have a game code?
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && join()}
              maxLength={6}
              placeholder="ABC123"
              className="w-full rounded-2xl border-2 border-white/15 bg-white/5 px-4 py-4 text-center text-3xl font-black tracking-[0.3em] outline-none focus:border-cyan-400"
            />
            <button
              onClick={join}
              className="btn-glow shrink-0 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 text-xl font-black"
            >
              Join
            </button>
          </div>
        </div>

        <div className="my-6 text-slate-500">— or —</div>

        <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
          <Link
            href="/host"
            className="btn-glow group glass-strong rounded-3xl p-6 text-left ring-1 ring-indigo-400/30 transition hover:ring-indigo-400"
          >
            <div className="text-5xl">🎤</div>
            <h3 className="mt-2 text-2xl font-black">Host a Live Game</h3>
            <p className="text-slate-300">Launch a session, share the QR & code, control the flow.</p>
            <span className="mt-3 inline-block font-bold text-cyan-300 group-hover:underline">Start hosting →</span>
          </Link>
          <Link
            href="/create"
            className="btn-glow group glass-strong rounded-3xl p-6 text-left ring-1 ring-emerald-400/30 transition hover:ring-emerald-400"
          >
            <div className="text-5xl">🤖</div>
            <h3 className="mt-2 text-2xl font-black">AI Test Maker</h3>
            <p className="text-slate-300">Turn any content into a pristine quiz with the AI blueprint prompt.</p>
            <span className="mt-3 inline-block font-bold text-emerald-300 group-hover:underline">Build a quiz →</span>
          </Link>
        </div>

        {/* feature strip */}
        <div className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { e: "💰", t: "In-Game Shop", d: "Multipliers, insurance, streaks" },
            { e: "🎲", t: "12+ Power-Ups", d: "Shields, jackpots, sabotage" },
            { e: "🎧", t: "All Skill Types", d: "Reading, listening, dialogue" },
            { e: "🧠", t: "Flashcard Review", d: "Export offline HTML" },
          ].map((f) => (
            <div key={f.t} className="glass rounded-2xl p-4 text-center">
              <div className="text-4xl">{f.e}</div>
              <div className="mt-1 font-black">{f.t}</div>
              <div className="text-sm text-slate-400">{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
