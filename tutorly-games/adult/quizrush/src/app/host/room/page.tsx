"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import QR from "@/components/QRCode";
import Leaderboard, { type LBPlayer } from "@/components/Leaderboard";
import { TeachingSlides } from "@/components/Review";
import AudioControls from "@/components/AudioControls";
import TimerRing from "@/components/TimerRing";
import { Confetti } from "@/components/Effects";
import type { Question } from "@/lib/types";
import { sfx, unlockAudio } from "@/lib/sound";
import { controlGame, getGame } from "@/lib/localApi";
import { joinUrl as joinUrlFor } from "@/lib/basePath";

interface GameState {
  game: {
    id: number;
    code: string;
    title: string;
    status: string;
    currentQuestion: number;
    totalQuestions: number;
  };
  currentQuestion: Question | null;
  players: LBPlayer[];
}

const TILE_COLORS = ["bg-rose-500", "bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-violet-500", "bg-cyan-500"];
const TILE_SHAPES = ["🔺", "🔷", "🟡", "🟢", "🟣", "⬛"];

function HostGame() {
  /**
   * The code comes from `?code=`, not from a path segment.
   *
   * This page used to be `/host/[code]`. A static export cannot prerender a
   * dynamic segment — the code only exists at run time — so the live pages are
   * query-parameter pages now, exactly like Cash Arena's. Every link that used
   * to build `/host/${code}` points here instead.
   */
  const code = (useSearchParams().get("code") ?? "").toUpperCase();
  const [state, setState] = useState<GameState | null>(null);
  const [joinUrl, setJoinUrl] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const prevStatus = useRef("");

  useEffect(() => {
    if (code) setJoinUrl(joinUrlFor(code));
  }, [code]);

  const poll = useCallback(() => {
    const data = getGame(code);
    if (data) setState(data as GameState);
  }, [code]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 1500);
    return () => clearInterval(t);
  }, [poll]);

  // question timer (visual only for host)
  const q = state?.currentQuestion;
  const qIndex = state?.game.currentQuestion ?? -1;
  const total = q?.timeLimit || 20;
  useEffect(() => {
    if (state?.game.status !== "live" || !q) return;
    setTimeLeft(total);
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [qIndex, state?.game.status, total, q]);

  useEffect(() => {
    if (state?.game.status === "ended" && prevStatus.current !== "ended") {
      sfx.win();
      setConfetti((c) => c + 1);
    }
    if (state?.game.status) prevStatus.current = state.game.status;
  }, [state?.game.status]);

  const control = (action: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    unlockAudio();
    sfx.click();
    controlGame(code, { action, ...(extra as { index?: number }) });
    poll();
    setBusy(false);
    if (action === "start") sfx.start();
  };

  const questions = useMemo<Question[]>(() => (state?.currentQuestion ? [state.currentQuestion] : []), [state]);

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-2xl font-bold text-slate-400">Loading game…</div>
      </main>
    );
  }

  const { game, players } = state;
  const answeredCount = players.reduce((a, p) => a + ((p.answeredCount ?? 0) >= (qIndex + 1) ? 1 : 0), 0);

  // ===== LOBBY =====
  if (game.status === "lobby") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <TopBar code={code} title={game.title} />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-strong flex flex-col items-center rounded-3xl p-6 md:p-10">
            <div className="text-lg font-bold uppercase tracking-widest text-cyan-300">Join at</div>
            <div className="mb-4 text-2xl md:text-3xl font-black">{joinUrl.replace(/^https?:\/\//, "")}</div>
            {joinUrl && <QR value={joinUrl} size={260} />}
            {/*
              * The join link and the QR are honest about what a static game is:
              * the room lives in this browser, so the link opens in a second
              * window on this machine. No server means no other devices.
              */}
            <p className="mt-3 max-w-sm text-center text-sm text-slate-400">
              Open this link in a second window on this machine to play as a learner — the game runs
              inside this browser, so a phone on another device cannot reach it.
            </p>
            <div className="mt-6 text-center">
              <div className="text-lg font-bold uppercase tracking-widest text-slate-400">Game Code</div>
              <div className="text-6xl md:text-8xl font-black tracking-[0.15em] text-gradient">{game.code}</div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-black">
                🎒 Players <span className="text-cyan-300">({players.length})</span>
              </h2>
            </div>
            <div className="glass min-h-[300px] flex-1 rounded-3xl p-4">
              {players.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                  <div className="text-5xl anim-ring rounded-full">📱</div>
                  <p className="mt-3 text-lg">Waiting for learners to join…</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {players.map((p) => (
                    <div key={p.id} className="anim-pop glass flex items-center gap-2 rounded-2xl p-3">
                      <span className="text-3xl">{p.avatar}</span>
                      <span className="truncate font-bold">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => control("start")}
              disabled={players.length === 0 || busy}
              className="btn-glow mt-4 rounded-3xl bg-gradient-to-r from-emerald-500 to-green-600 py-6 text-3xl font-black text-slate-900 disabled:opacity-40"
            >
              🚀 Start Game
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ===== ENDED =====
  if (game.status === "ended") {
    const podium = [...players].slice(0, 3);
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Confetti trigger={confetti} />
        <TopBar code={code} title={game.title} />
        <h2 className="mb-6 text-center text-4xl md:text-6xl font-black">🏆 <span className="text-gradient">Final Results</span></h2>

        <div className="mb-8 flex items-end justify-center gap-3 md:gap-6">
          {[1, 0, 2].map((slot) => {
            const p = podium[slot];
            if (!p) return <div key={slot} className="w-24" />;
            const heights = ["h-40", "h-56", "h-32"];
            const order = slot === 0 ? 1 : slot === 1 ? 0 : 2;
            return (
              <div key={slot} className="flex flex-col items-center">
                <div className="text-5xl md:text-7xl">{p.avatar}</div>
                <div className="text-lg md:text-2xl font-black">{p.name}</div>
                <div className="money text-xl md:text-3xl text-green-400">${p.cash.toLocaleString()}</div>
                <div className={`${heights[order]} mt-2 flex w-24 md:w-32 items-start justify-center rounded-t-2xl bg-gradient-to-b ${slot === 1 ? "from-amber-300 to-yellow-600" : slot === 0 ? "from-slate-300 to-slate-500" : "from-orange-400 to-orange-700"} pt-3 text-4xl font-black text-slate-900`}>
                  {order + 1}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-2xl font-black">📊 Full Standings</h3>
            <Leaderboard players={players} />
          </div>
          <div>
            <h3 className="mb-3 text-2xl font-black">📚 Teaching Review</h3>
            {q ? <TeachingSlides questions={questions} /> : (
              <div className="glass rounded-2xl p-6 text-slate-300">
                Learners can review every question with mini teaching slides & flashcards on their own devices.
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/host" className="btn-glow rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 py-4 text-xl font-black">
            🎮 Host Another
          </Link>
        </div>
      </main>
    );
  }

  // ===== LIVE =====
  const isLast = qIndex >= game.totalQuestions - 1;
  return (
    <main className="mx-auto max-w-7xl px-4 py-4">
      <TopBar code={code} title={game.title} />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Main stage */}
        <div className="glass-strong rounded-3xl p-5 md:p-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-full bg-white/10 px-4 py-1.5 text-lg font-black">
              Q{qIndex + 1} / {game.totalQuestions}
            </div>
            <div className="rounded-full bg-white/10 px-4 py-1.5 text-lg font-bold">
              ✅ {answeredCount}/{players.length} answered
            </div>
            <TimerRing seconds={timeLeft} total={total} />
          </div>

          {q?.passage && (
            <div className="glass mb-4 rounded-2xl p-4 text-lg md:text-2xl leading-relaxed">
              📖 {q.passage}
            </div>
          )}
          {q?.type === "listening" && (
            <div className="glass mb-4 rounded-2xl p-4 text-lg text-cyan-300">🎧 Listening question — learners hear the audio on their devices.</div>
          )}
          {q?.dialogue && (
            <div className="glass mb-4 space-y-2 rounded-2xl p-4">
              {q.dialogue.map((d, i) => (
                <div key={i} className="text-lg md:text-2xl">
                  <span className="font-black text-cyan-300">{d.speaker}: </span>
                  {d.line.includes("_") ? <span className="font-black text-amber-300">? ? ?</span> : d.line}
                </div>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-6xl font-black leading-tight">{q?.question}</h1>

          {q?.choices && (
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {q.choices.map((c, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-2xl ${TILE_COLORS[i % 6]} p-4 md:p-6 shadow-xl`}>
                  <span className="text-3xl md:text-4xl">{TILE_SHAPES[i % 6]}</span>
                  <span className="text-xl md:text-3xl font-black">{c}</span>
                </div>
              ))}
            </div>
          )}
          {q?.type === "typed" && (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-white/20 p-8 text-center text-2xl text-slate-400">
              ✍️ Learners type their answer on their devices
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => control("prev")} disabled={busy || qIndex === 0} className="rounded-2xl bg-white/10 px-6 py-4 text-xl font-black hover:bg-white/20 disabled:opacity-30">
              ◀ Prev
            </button>
            <button
              onClick={() => control(isLast ? "end" : "next")}
              disabled={busy}
              className="btn-glow flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-4 text-xl md:text-2xl font-black"
            >
              {isLast ? "🏁 End Game & Show Results" : "Next Question ▶"}
            </button>
          </div>
        </div>

        {/* Live leaderboard */}
        <div>
          <h2 className="mb-3 text-2xl font-black">📈 Live Leaderboard</h2>
          <Leaderboard players={players} />
        </div>
      </div>
    </main>
  );
}

function TopBar({ code, title }: { code: string; title: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="text-cyan-300 hover:underline">← Exit</Link>
      <h1 className="text-xl md:text-3xl font-black">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="rounded-xl glass px-3 py-1.5 font-black tracking-widest">CODE: {code}</div>
        <AudioControls />
      </div>
    </div>
  );
}

/**
 * The board — and the boundary `useSearchParams` needs to be prerenderable.
 *
 * A page that reads a search parameter has to sit inside `<Suspense>` or the
 * static export bails out at build time; the player and join pages already did
 * this, and the host board is the third one.
 */
export default function HostRoomPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading…</div>}>
      <HostGame />
    </Suspense>
  );
}
