"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type Peer from "peerjs";
import type { DataConnection } from "peerjs";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { GameClient } from "@/components/GameClient";
import { Leaderboard } from "@/components/Leaderboard";
import { TeachingSlides, Flashcards, buildStaticHtml, downloadHtml } from "@/components/Review";
import { AVATAR_SEEDS, AVATAR_SETS, avatarUrl } from "@/lib/avatars";
import { connectToHost, sendClient } from "@/lib/peer";
import type { HostMessage, PlayerPublic, Quiz } from "@/lib/types";
import { type EconState, fmtCash } from "@/lib/engine";
import { addResults, listQuizzes, type QuizRow } from "@/lib/localApi";
import { sfx, unlockAudio, loadVoices, startMusic, stopMusic, speak } from "@/lib/audio";
import { CashRain } from "@/components/Cash";

type Phase = "form" | "connecting" | "lobby" | "live" | "done";

function PlayInner() {
  const sp = useSearchParams();
  const solo = sp.get("solo") === "1";
  const [code, setCode] = useState((sp.get("code") || "").toUpperCase());
  const [name, setName] = useState("");
  const [set, setSet] = useState(AVATAR_SETS[0].key);
  const [seed, setSeed] = useState(AVATAR_SEEDS[0]);
  const [phase, setPhase] = useState<Phase>("form");
  const [err, setErr] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [soloQuiz, setSoloQuiz] = useState<number | null>(null);
  const [players, setPlayers] = useState<PlayerPublic[]>([]);
  const [myId, setMyId] = useState("solo");
  const [duration, setDuration] = useState(300);
  const [startedAt, setStartedAt] = useState(0);
  const [ended, setEnded] = useState(false);
  const [final, setFinal] = useState<EconState | null>(null);
  const [tab, setTab] = useState<"slides" | "cards" | "board">("cards");
  const [rain, setRain] = useState(0);
  const peerRef = useRef<Peer | null>(null);
  const [conn, setConn] = useState<DataConnection | null>(null);

  useEffect(() => {
    loadVoices();
    if (solo) {
      // Read from this browser: the arena is a static export (see localApi).
      const rows = listQuizzes();
      setQuizzes(rows);
      if (rows[0]) setSoloQuiz(rows[0].id);
    }
    const saved = localStorage.getItem("tq_name");
    if (saved) setName(saved);
  }, [solo]);

  const avatar = `${set}|${seed}`;

  const join = async () => {
    unlockAudio();
    sfx.click();
    if (!name.trim()) { setErr("Enter your name first."); return; }
    localStorage.setItem("tq_name", name.trim());
    setErr("");
    if (solo) {
      const qz = quizzes.find((q) => q.id === soloQuiz);
      if (!qz) return;
      setQuiz(qz); setDuration(300); setStartedAt(Date.now() + 300); setMyId("solo");
      setPlayers([{ id: "solo", name: name.trim(), avatar, cash: 0, streak: 0, correct: 0, wrong: 0, answered: 0, finished: false, wrongIds: [] }]);
      startMusic();
      setPhase("live");
      return;
    }
    if (code.length < 4) { setErr("Enter the 6-letter game code."); return; }
    setPhase("connecting");
    try {
      const { peer, conn: c } = await connectToHost(code);
      peerRef.current = peer;
      c.on("data", (raw) => {
        const m = raw as HostMessage;
        if (m.t === "welcome") { setQuiz(m.quiz); setPlayers(m.players); setMyId(m.you); setDuration(m.duration); setPhase((p) => (p === "connecting" ? "lobby" : p)); }
        if (m.t === "players") setPlayers(m.players);
        if (m.t === "start") { setDuration(m.duration); setStartedAt(m.startedAt); sfx.go(); startMusic(); setPhase("live"); }
        if (m.t === "end") { setEnded(true); }
        if (m.t === "error") setErr(m.msg);
      });
      c.on("close", () => { setErr("Connection to host closed."); });
      setConn(c);
      sendClient(c, { t: "join", name: name.trim(), avatar });
    } catch (e) {
      setErr((e as Error).message || "Could not join. Check the code.");
      setPhase("form");
    }
  };

  const onFinish = useCallback((econ: EconState) => {
    setFinal(econ);
    stopMusic();
    setRain((r) => r + 1);
    setPhase("done");
    if (quiz) {
      localStorage.setItem("tq_last_review", JSON.stringify({ quiz, wrongIds: econ.wrongIds, name: name.trim(), cash: econ.cash, at: Date.now() }));
      if (solo) {
        addResults([{ gameCode: "SOLO", quizId: (quiz as QuizRow).id || 0, playerName: name.trim(), cash: econ.cash, correct: econ.correct, wrong: econ.wrong, wrongQuestionIds: econ.wrongIds }]);
      }
    }
    setTimeout(() => speak(`Game over! You finished with ${fmtCash(econ.cash)}. ${econ.wrongIds.length ? "Let's review the questions you missed." : "Perfect score, incredible!"}`, "female"), 800);
  }, [quiz, name, solo]);

  useEffect(() => () => { peerRef.current?.destroy(); stopMusic(); }, []);

  if (phase === "live" && quiz) {
    return <GameClient quiz={quiz} me={{ id: myId, name: name.trim(), avatar }} conn={conn} players={players} durationSec={duration} startedAt={startedAt} ended={ended} onFinish={onFinish} />;
  }

  const wrongQs = quiz && final ? quiz.questions.filter((q) => final.wrongIds.includes(q.id)) : [];

  return (
    <div className="min-h-dvh">
      <Nav />
      <CashRain trigger={rain} big />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
        {phase === "form" && (
          <div className="glass rounded-3xl p-6 sm:p-8 anim-fade">
            <h1 className="text-4xl font-black">{solo ? "🎯 Solo practice" : "📱 Join the game"}</h1>
            {err && <div className="mt-3 rounded-2xl bg-rose-500/20 border border-rose-400/40 p-3 font-bold text-rose-200">{err}</div>}
            {!solo ? (
              <div className="mt-5">
                <label className="text-sm uppercase tracking-widest text-white/50">Game code</label>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" className="mt-1 w-full rounded-2xl bg-white/10 px-5 py-4 text-center text-4xl font-black tracking-[0.3em] uppercase outline-none focus:ring-4 ring-violet-500" />
              </div>
            ) : (
              <div className="mt-5">
                <label className="text-sm uppercase tracking-widest text-white/50">Pick a quiz</label>
                <select value={soloQuiz ?? ""} onChange={(e) => setSoloQuiz(Number(e.target.value))} className="mt-1 w-full rounded-2xl bg-white/10 px-4 py-3 text-xl font-bold outline-none">
                  {quizzes.map((q) => <option key={q.id} value={q.id} className="text-black">{q.title} ({q.questions.length})</option>)}
                </select>
              </div>
            )}
            <div className="mt-5">
              <label className="text-sm uppercase tracking-widest text-white/50">Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder="Nickname" className="mt-1 w-full rounded-2xl bg-white/10 px-5 py-4 text-2xl font-black outline-none focus:ring-4 ring-violet-500" />
            </div>
            <div className="mt-5">
              <label className="text-sm uppercase tracking-widest text-white/50">Avatar set</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {AVATAR_SETS.map((s) => (
                  <button key={s.key} onClick={() => { setSet(s.key); sfx.click(); }} className={`rounded-xl px-3 py-1.5 text-sm font-black ${set === s.key ? "bg-amber-400 text-black" : "bg-white/10"}`}>{s.name}</button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-12">
                {AVATAR_SEEDS.map((sd) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={sd} src={avatarUrl(set, sd)} alt={sd} onClick={() => { setSeed(sd); sfx.reveal(); }} className={`aspect-square w-full cursor-pointer rounded-full bg-white/10 transition hover:scale-110 ${seed === sd ? "ring-4 ring-amber-400 scale-110" : ""}`} />
                ))}
              </div>
            </div>
            <button onClick={join} className="btn btn-gold mt-6 w-full text-2xl">{solo ? "Start practice ➜" : "Enter the arena ➜"}</button>
            {!solo && <Link href="/play?solo=1" className="mt-3 block text-center text-white/60 underline">No code? Practice solo instead</Link>}
          </div>
        )}

        {phase === "connecting" && (
          <div className="grid place-items-center py-32 text-center">
            <div className="h-20 w-20 rounded-full border-8 border-white/10 border-t-violet-400" style={{ animation: "spin 1s linear infinite" }} />
            <div className="mt-6 text-2xl font-black">Connecting to game {code}…</div>
            <button onClick={() => setPhase("form")} className="btn btn-ghost mt-6">Cancel</button>
          </div>
        )}

        {phase === "lobby" && (
          <div className="glass rounded-3xl p-6 text-center anim-fade">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl(set, seed)} alt="" className="mx-auto h-32 w-32 rounded-full ring-4 ring-emerald-400 anim-pop" />
            <div className="mt-3 text-3xl font-black">You&apos;re in, {name}!</div>
            <div className="text-white/60 text-lg">Look at the big screen — the tutor will start soon.</div>
            <div className="mt-6 text-sm uppercase tracking-widest text-white/50">{quiz?.title} · {players.length} players</div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {players.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={avatarUrl(...(p.avatar.split("|") as [string, string]))} alt={p.name} title={p.name} className="h-12 w-12 rounded-full bg-white/10 anim-pop" />
              ))}
            </div>
            <Link href="/guide" className="btn btn-ghost mt-6">📖 Learn the power-ups while you wait</Link>
          </div>
        )}

        {phase === "done" && final && quiz && (
          <div className="anim-fade">
            <div className="glass rounded-3xl p-6 text-center">
              <div className="text-sm uppercase tracking-widest text-white/50">Final wallet</div>
              <div className="cash-text text-6xl sm:text-7xl">{fmtCash(final.cash)}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[["✅ Correct", final.correct], ["❌ Wrong", final.wrong], ["🔥 Best streak", final.bestStreak]].map(([l, v]) => (
                  <div key={String(l)} className="rounded-2xl bg-white/5 p-3"><div className="text-xs text-white/60">{l}</div><div className="text-3xl font-black">{v}</div></div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {players.length > 1 && <button onClick={() => setTab("board")} className={`btn ${tab === "board" ? "btn-primary" : "btn-ghost"}`}>🏆 Leaderboard</button>}
              <button onClick={() => setTab("cards")} className={`btn ${tab === "cards" ? "btn-primary" : "btn-ghost"}`}>🃏 My flashcards ({wrongQs.length})</button>
              <button onClick={() => setTab("slides")} className={`btn ${tab === "slides" ? "btn-primary" : "btn-ghost"}`}>📚 Lessons</button>
              <button onClick={() => downloadHtml(buildStaticHtml(quiz, wrongQs.length ? wrongQs : quiz.questions, name), `${name}-flashcards.html`)} className="btn btn-cash">⬇ Export HTML</button>
            </div>
            <div className="mt-5">
              {tab === "board" && <div className="glass rounded-3xl p-4"><Leaderboard players={players} meId={myId} /></div>}
              {tab === "cards" && <Flashcards questions={wrongQs} />}
              {tab === "slides" && <TeachingSlides questions={[...wrongQs, ...quiz.questions.filter((q) => !final.wrongIds.includes(q.id))]} wrongIds={final.wrongIds} />}
            </div>
            <div className="mt-6 text-center"><Link href="/play?solo=1" className="btn btn-gold">Play again</Link></div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PlayPage() {
  return <Suspense fallback={<div className="p-10 text-center text-xl">Loading…</div>}><PlayInner /></Suspense>;
}
