"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Peer from "peerjs";
import type { DataConnection } from "peerjs";
import QRCode from "qrcode";
import { Nav } from "@/components/Nav";
import { Leaderboard } from "@/components/Leaderboard";
import { TeachingSlides, Flashcards, buildStaticHtml, downloadHtml } from "@/components/Review";
import { createHostPeer, genCode, sendHost } from "@/lib/peer";
import type { ClientMessage, PlayerPublic } from "@/lib/types";
import { addResults, listQuizzes, type QuizRow } from "@/lib/localApi";
import { publicUrl } from "@/lib/basePath";
import { avatarSrc } from "@/lib/avatars";
import { sfx, startMusic, stopMusic, unlockAudio, speak } from "@/lib/audio";
import { fmtCash } from "@/lib/engine";
import { CashRain } from "@/components/Cash";

type Phase = "pick" | "connecting" | "lobby" | "live" | "podium" | "review";

export default function HostPage() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [minutes, setMinutes] = useState(6);
  const [phase, setPhase] = useState<Phase>("pick");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const [err, setErr] = useState("");
  const [players, setPlayers] = useState<PlayerPublic[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [countdown, setCountdown] = useState<number | null>(null);
  const [rain, setRain] = useState(0);
  const [reviewTab, setReviewTab] = useState<"slides" | "cards">("slides");
  const peerRef = useRef<Peer | null>(null);
  const conns = useRef<Map<string, DataConnection>>(new Map());
  const playersRef = useRef<Map<string, PlayerPublic>>(new Map());
  const phaseRef = useRef<Phase>("pick");
  const startRef = useRef(0);
  phaseRef.current = phase;

  // The library is read from this browser, not the network: the arena is a
  // static export, so there is no endpoint to ask (see src/lib/localApi.ts).
  useEffect(() => {
    setQuizzes(listQuizzes());
  }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);

  // Built through publicUrl: a hand-written URL is not rewritten by Next's
  // basePath, so this is what puts the QR code on the right folder on the host.
  const joinUrl = typeof window !== "undefined" ? publicUrl("/play", { code }) : "";

  const broadcastPlayers = useCallback(() => {
    const list = [...playersRef.current.values()];
    setPlayers(list);
    conns.current.forEach((c) => sendHost(c, { t: "players", players: list }));
  }, []);

  useEffect(() => {
    if (phase !== "lobby" && phase !== "live") return;
    const t = setInterval(broadcastPlayers, 1500);
    return () => clearInterval(t);
  }, [phase, broadcastPlayers]);

  const handleMsg = useCallback((conn: DataConnection, raw: unknown) => {
    const m = raw as ClientMessage;
    const q = quiz!;
    if (m.t === "join") {
      const p: PlayerPublic = { id: conn.peer, name: m.name.slice(0, 20), avatar: m.avatar, cash: 0, streak: 0, correct: 0, wrong: 0, answered: 0, finished: false, wrongIds: [] };
      playersRef.current.set(conn.peer, p);
      sfx.reveal();
      sendHost(conn, { t: "welcome", quiz: { title: q.title, subject: q.subject, questions: q.questions }, players: [...playersRef.current.values()], status: phaseRef.current, duration: minutes * 60, you: conn.peer });
      if (phaseRef.current === "live") sendHost(conn, { t: "start", duration: minutes * 60, startedAt: startRef.current });
      broadcastPlayers();
    } else if (m.t === "progress") {
      const p = playersRef.current.get(conn.peer);
      if (p) playersRef.current.set(conn.peer, { ...p, ...m.p });
    } else if (m.t === "attack") {
      const from = playersRef.current.get(conn.peer);
      const others = [...playersRef.current.values()].filter((p) => p.id !== conn.peer);
      if (!from || others.length === 0) return;
      let target: PlayerPublic | undefined;
      if (m.targetId === "random") target = others[Math.floor(Math.random() * others.length)];
      else if (m.targetId === "leader") target = [...others].sort((a, b) => b.cash - a.cash)[0];
      else target = others.find((p) => p.id === m.targetId);
      const tc = target && conns.current.get(target.id);
      if (tc) sendHost(tc, { t: "attack", type: m.type, from: from.name, amount: m.amount });
    } else if (m.t === "drainResult") {
      const victim = playersRef.current.get(conn.peer);
      const attacker = [...playersRef.current.values()].find((p) => p.name === m.targetId);
      const ac = attacker && conns.current.get(attacker.id);
      if (ac && ac.open) ac.send({ t: "credit", amount: m.amount, from: victim?.name || "a rival" });
    }
  }, [quiz, minutes, broadcastPlayers]);

  const create = async () => {
    if (!quiz) return;
    unlockAudio();
    setPhase("connecting"); setErr("");
    let tries = 0;
    while (tries < 4) {
      const c = genCode();
      try {
        const peer = await createHostPeer(c);
        peerRef.current = peer;
        setCode(c);
        peer.on("connection", (conn) => {
          conns.current.set(conn.peer, conn);
          conn.on("data", (d) => handleMsg(conn, d));
          conn.on("close", () => { conns.current.delete(conn.peer); });
        });
        peer.on("disconnected", () => { try { peer.reconnect(); } catch { /* ignore */ } });
        // Nothing to register on a server: the room's identity IS the peer id,
        // which `peerIdForCode` derives from the code alone.
        setQr(await QRCode.toDataURL(publicUrl("/play", { code: c }), { width: 520, margin: 1, color: { dark: "#0b1020", light: "#ffffff" } }));
        setPhase("lobby");
        return;
      } catch (e) {
        tries++;
        if (tries >= 4) { setErr("Could not connect to the signalling server. Check your internet and retry. " + String((e as Error)?.message || "")); setPhase("pick"); }
      }
    }
  };

  const start = () => {
    sfx.click();
    let n = 3;
    setCountdown(n);
    sfx.countdown();
    const t = setInterval(() => {
      n--;
      if (n > 0) { setCountdown(n); sfx.countdown(); }
      else {
        clearInterval(t);
        setCountdown(null);
        sfx.go();
        const s = Date.now() + 500;
        startRef.current = s;
        setStartedAt(s);
        setPhase("live");
        startMusic();
        conns.current.forEach((c) => sendHost(c, { t: "start", duration: minutes * 60, startedAt: s }));
      }
    }, 1000);
  };

  const end = useCallback(() => {
    conns.current.forEach((c) => sendHost(c, { t: "end" }));
    stopMusic();
    sfx.fanfare();
    setRain((r) => r + 1);
    setPhase("podium");
    const list = [...playersRef.current.values()];
    setPlayers(list);
    if (list.length && quiz) {
      // Straight into this browser's history, which is what the Review Suite and
      // the score sheet read back.
      addResults(list.map((p) => ({ gameCode: code, quizId: quiz.id, playerName: p.name, cash: p.cash, correct: p.correct, wrong: p.wrong, wrongQuestionIds: p.wrongIds })));
    }
    const top = [...list].sort((a, b) => b.cash - a.cash)[0];
    if (top) setTimeout(() => speak(`Time's up! The champion is ${top.name} with ${fmtCash(top.cash)}. Amazing game everyone!`, "female"), 1200);
  }, [code, quiz]);

  const left = Math.max(0, Math.round((startedAt + minutes * 60000 - now) / 1000));
  useEffect(() => { if (phase === "live" && left <= 0) end(); }, [left, phase, end]);

  const sorted = useMemo(() => [...players].sort((a, b) => b.cash - a.cash), [players]);
  const missedIds = useMemo(() => {
    const count = new Map<string, number>();
    players.forEach((p) => p.wrongIds.forEach((id) => count.set(id, (count.get(id) || 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [players]);
  const missedQs = useMemo(() => (quiz ? quiz.questions.filter((q) => missedIds.includes(q.id)) : []), [quiz, missedIds]);

  useEffect(() => () => { peerRef.current?.destroy(); stopMusic(); }, []);

  return (
    <div className="min-h-dvh">
      <Nav />
      <CashRain trigger={rain} big />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        {phase === "pick" && (
          <div className="anim-fade">
            <h1 className="text-4xl sm:text-5xl font-black">🎤 Host a live game</h1>
            <p className="mt-2 text-white/70 text-lg">Pick a quiz, set the round length, and share the code with your learners.</p>
            {err && <div className="mt-4 rounded-2xl bg-rose-500/20 border border-rose-400/40 p-4 font-bold text-rose-200">{err}</div>}
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {quizzes.map((qz) => (
                <button key={qz.id} onClick={() => { sfx.click(); setQuiz(qz); }} className={`glass rounded-3xl p-5 text-left transition hover:scale-[1.02] ${quiz?.id === qz.id ? "ring-4 ring-amber-400" : ""}`}>
                  <div className="text-xs uppercase tracking-widest text-violet-300">{qz.subject}</div>
                  <div className="mt-1 text-2xl font-black">{qz.title}</div>
                  <div className="mt-1 text-white/60 line-clamp-2">{qz.description}</div>
                  <div className="mt-3 text-sm font-bold text-emerald-300">{qz.questions.length} questions · {[...new Set(qz.questions.map((q) => q.type))].length} skill types</div>
                </button>
              ))}
              {quizzes.length === 0 && <div className="glass rounded-3xl p-6 text-white/60">Loading quizzes…</div>}
            </div>
            <div className="glass mt-6 rounded-3xl p-6 flex flex-wrap items-center gap-6">
              <div>
                <div className="text-sm uppercase tracking-widest text-white/50">Round length</div>
                <div className="mt-2 flex gap-2">
                  {[3, 5, 6, 8, 10, 15].map((m) => (
                    <button key={m} onClick={() => setMinutes(m)} className={`rounded-xl px-4 py-2 font-black ${minutes === m ? "bg-amber-400 text-black" : "bg-white/10"}`}>{m}m</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 text-white/60">Questions loop until time runs out — Gimkit style. The richest wallet wins.</div>
              <button disabled={!quiz} onClick={create} className="btn btn-gold text-2xl">Create game ➜</button>
            </div>
          </div>
        )}

        {phase === "connecting" && (
          <div className="grid place-items-center py-40 text-center">
            <div className="h-20 w-20 rounded-full border-8 border-white/10 border-t-amber-400" style={{ animation: "spin 1s linear infinite" }} />
            <div className="mt-6 text-2xl font-black">Opening the arena…</div>
            <div className="text-white/60">Connecting to the free WebRTC signalling network</div>
          </div>
        )}

        {phase === "lobby" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] anim-fade">
            <div className="glass rounded-3xl p-6 text-center">
              <div className="text-sm uppercase tracking-widest text-white/50">Join at</div>
              <div className="text-2xl font-black break-all text-violet-200">{joinUrl.replace(/^https?:\/\//, "")}</div>
              <div className="mt-4 text-sm uppercase tracking-widest text-white/50">Game code</div>
              <div className="gold-text text-7xl sm:text-8xl tracking-[0.2em] font-black">{code}</div>
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code to join" className="mx-auto mt-4 w-64 rounded-2xl bg-white p-2 shadow-2xl" />
              )}
              <div className="mt-4 flex justify-center gap-2">
                <button onClick={() => { navigator.clipboard.writeText(joinUrl); sfx.click(); }} className="btn btn-ghost">📋 Copy link</button>
                <button onClick={() => speak(`Join the game at ${window.location.host} slash play. The code is ${code.split("").join(" ")}.`, "female")} className="btn btn-ghost">🔊</button>
              </div>
            </div>
            <div className="glass rounded-3xl p-6 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-3xl font-black">{quiz?.title}</div>
                <div className="rounded-full bg-emerald-500/20 px-4 py-1 font-black text-emerald-300">{players.length} joined</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 flex-1 content-start">
                {players.map((p) => (
                  <div key={p.id} className="anim-pop flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarSrc(p.avatar)} alt="" className="h-12 w-12 rounded-full" />
                    <span className="text-xl font-black">{p.name}</span>
                  </div>
                ))}
                {players.length === 0 && <div className="text-white/50 text-lg">Waiting for learners to scan the code…</div>}
              </div>
              <button onClick={start} disabled={players.length === 0 || countdown !== null} className="btn btn-cash mt-6 text-3xl w-full">🚀 Start game ({minutes} min)</button>
            </div>
          </div>
        )}

        {phase === "live" && (
          <div className="anim-fade">
            <div className="glass rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-widest text-white/50">Code {code} · {quiz?.title}</div>
                <div className="text-2xl font-black">{players.length} players battling</div>
              </div>
              <div className={`text-6xl font-black tabular-nums ${left < 30 ? "text-rose-400 anim-flicker" : "gold-text"}`}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>
              <button onClick={end} className="btn btn-danger">End now</button>
            </div>
            <div className="glass mt-4 rounded-3xl p-5">
              <div className="mb-3 text-3xl font-black">🏆 Live Leaderboard</div>
              <Leaderboard players={players} max={20} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[["💵 Total cash", fmtCash(players.reduce((a, p) => a + p.cash, 0))], ["✅ Correct answers", String(players.reduce((a, p) => a + p.correct, 0))], ["🔥 Best streak", String(Math.max(0, ...players.map((p) => p.streak)))]].map(([l, v]) => (
                <div key={l} className="glass rounded-2xl p-4"><div className="text-sm text-white/60">{l}</div><div className="text-3xl font-black">{v}</div></div>
              ))}
            </div>
          </div>
        )}

        {phase === "podium" && (
          <div className="anim-fade text-center">
            <h1 className="gold-text text-5xl sm:text-7xl font-black">🏆 CHAMPIONS</h1>
            <div className="mt-8 flex items-end justify-center gap-4">
              {[1, 0, 2].map((rank) => {
                const p = sorted[rank];
                if (!p) return <div key={rank} className="w-40" />;
                const h = rank === 0 ? "h-56" : rank === 1 ? "h-40" : "h-32";
                return (
                  <div key={p.id} className="anim-card flex flex-col items-center" style={{ animationDelay: `${rank * 0.2}s` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarSrc(p.avatar)} alt="" className={`${rank === 0 ? "h-28 w-28" : "h-20 w-20"} rounded-full ring-4 ring-amber-300`} />
                    <div className="mt-2 text-2xl font-black">{p.name}</div>
                    <div className="cash-text text-3xl">{fmtCash(p.cash)}</div>
                    <div className={`${h} w-40 mt-2 rounded-t-3xl grid place-items-start justify-center pt-3 text-5xl font-black ${rank === 0 ? "bg-gradient-to-t from-amber-600 to-yellow-300 text-black" : rank === 1 ? "bg-gradient-to-t from-slate-500 to-slate-200 text-black" : "bg-gradient-to-t from-orange-900 to-orange-400"}`}>{rank + 1}</div>
                  </div>
                );
              })}
            </div>
            <div className="glass mx-auto mt-8 max-w-3xl rounded-3xl p-5 text-left">
              <Leaderboard players={players} max={30} compact />
            </div>
            <button onClick={() => { sfx.click(); setPhase("review"); }} className="btn btn-gold text-2xl mt-8">📚 Review & teach ➜</button>
          </div>
        )}

        {phase === "review" && quiz && (
          <div className="anim-fade">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-4xl font-black">📚 Class Review</h1>
              <div className="flex gap-2">
                <button onClick={() => setReviewTab("slides")} className={`btn ${reviewTab === "slides" ? "btn-primary" : "btn-ghost"}`}>Teaching slides</button>
                <button onClick={() => setReviewTab("cards")} className={`btn ${reviewTab === "cards" ? "btn-primary" : "btn-ghost"}`}>Flashcards ({missedQs.length})</button>
                <button onClick={() => downloadHtml(buildStaticHtml(quiz, missedQs.length ? missedQs : quiz.questions), `${quiz.title.replace(/\W+/g, "-")}-flashcards.html`)} className="btn btn-cash">⬇ Export HTML</button>
              </div>
            </div>
            <div className="mt-2 text-white/60">Most-missed questions first: {missedQs.slice(0, 3).map((q) => q.explanation.title).join(" · ") || "none — great class!"}</div>
            <div className="mt-6">
              {reviewTab === "slides" ? <TeachingSlides questions={[...missedQs, ...quiz.questions.filter((q) => !missedIds.includes(q.id))]} wrongIds={missedIds} /> : <Flashcards questions={missedQs.length ? missedQs : quiz.questions} />}
            </div>
          </div>
        )}
      </main>

      {countdown !== null && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80">
          <div key={countdown} className="anim-pop gold-text text-[12rem] font-black leading-none">{countdown}</div>
        </div>
      )}
    </div>
  );
}
