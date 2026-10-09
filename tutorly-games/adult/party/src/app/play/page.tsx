"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AVATAR_PACKS, avatarUrl, randomAvatar } from "@/lib/avatars";
import { sfx } from "@/lib/audio";
import { answerRoom, getRoom, joinRoom } from "@/lib/localApi";

type Prompt = { kind?: string; title?: string; question?: string; options?: string[]; answer?: number[] };
type Player = { playerKey: string; name: string; avatar: string; score: number; streak: number };

export default function PlayPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pack, setPack] = useState("fun-emoji");
  const [seed, setSeed] = useState("Nova");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState<Prompt>({});
  const [rev, setRev] = useState(-1);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sent, setSent] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [text, setText] = useState("");
  const keyRef = useRef("");
  const shownAt = useRef(Date.now());

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("code");
    if (p) setCode(p.toUpperCase());
    let k = window.localStorage.getItem("pma-player-key");
    if (!k) { k = Math.random().toString(36).slice(2, 12); window.localStorage.setItem("pma-player-key", k); }
    keyRef.current = k;
    const saved = window.localStorage.getItem("pma-player-name");
    if (saved) setName(saved);
    const a = randomAvatar(); setPack(a.pack); setSeed(a.seed);
  }, []);

  useEffect(() => {
    if (!joined) return;
    const poll = () => {
      const r = getRoom(code);
      if (!r?.room) return;
      setPlayers(r.players ?? []);
      if (r.room.promptRev !== rev) {
        setRev(r.room.promptRev);
        setPrompt(r.room.prompt ?? {});
        setSent(null); setFeedback(null); setText("");
        shownAt.current = Date.now();
        sfx("chime");
        if (navigator.vibrate) navigator.vibrate(60);
      }
    };
    poll();
    const t = setInterval(poll, 1600);
    return () => clearInterval(t);
  }, [joined, code, rev]);

  const avatar = useMemo(() => avatarUrl(pack, seed), [pack, seed]);
  const me = players.find((p) => p.playerKey === keyRef.current);

  const join = () => {
    setError("");
    const d = joinRoom({ code: code.toUpperCase(), playerKey: keyRef.current, name: name.trim() || "Player", avatar });
    if ("error" in d) { setError(d.error); sfx("wrong"); return; }
    window.localStorage.setItem("pma-player-name", name.trim());
    setJoined(true); sfx("correct");
  };

  const answer = (value: string, correct: boolean) => {
    setSent(value);
    const r = answerRoom({
      code, playerKey: keyRef.current, playerName: name, promptRev: rev,
      answer: value, correct, ms: Date.now() - shownAt.current,
    });
    setFeedback(correct ? `+${("points" in r ? r.points : 0)}` : "Locked in");
    sfx(correct ? "coin" : "click");
  };

  if (!joined) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="neon text-center text-4xl font-black">Party</h1>
        <p className="text-center text-sm text-slate-400">Join the room your tutor is showing on the board.</p>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" maxLength={4}
          className="rounded-2xl border border-white/15 bg-slate-950/60 p-4 text-center text-3xl font-black tracking-[0.4em]" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
          className="rounded-2xl border border-white/15 bg-slate-950/60 p-3 text-center text-lg" />
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <img src={avatar} alt="" className="h-16 w-16 rounded-xl bg-slate-800" />
          <div className="flex-1">
            <select value={pack} onChange={(e) => setPack(e.target.value)} className="w-full rounded-lg border border-white/15 bg-slate-950/60 p-2 text-sm">
              {AVATAR_PACKS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <button onClick={() => { const a = randomAvatar(); setPack(a.pack); setSeed(a.seed); sfx("card"); }}
              className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 p-2 text-sm font-bold">🎲 Shuffle avatar</button>
          </div>
        </div>
        {error && <p className="rounded-xl bg-rose-500/15 p-3 text-center text-sm text-rose-200">{error}</p>}
        <button onClick={join} className="rounded-2xl bg-amber-500 p-4 text-xl font-black text-slate-950">Join the room</button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-4">
      <header className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <img src={avatar} alt="" className="h-12 w-12 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-black">{name}</p>
          <p className="text-xs text-slate-400">room {code} · {me?.score ?? 0} pts {me?.streak ? `· ${me.streak}🔥` : ""}</p>
        </div>
        <span className="text-xs text-slate-500">#{players.findIndex((p) => p.playerKey === keyRef.current) + 1}</span>
      </header>

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-amber-300">{prompt.title ?? "Waiting"}</p>
        {prompt.kind === "mcq" && (
          <>
            <p className="mt-2 text-center text-lg font-bold">{prompt.question}</p>
            <div className="mt-4 grid gap-2">
              {(prompt.options ?? []).map((o, i) => (
                <button key={i} disabled={sent !== null}
                  onClick={() => answer(String(i), (prompt.answer ?? []).includes(i))}
                  className={`rounded-2xl border p-4 text-left text-base font-bold transition ${sent === String(i) ? "border-amber-400 bg-amber-500/20" : "border-white/15 bg-white/[0.04]"} disabled:opacity-60`}>
                  <span className="mr-2 text-slate-500">{"ABCD"[i]}</span>{o}
                </button>
              ))}
            </div>
          </>
        )}
        {prompt.kind === "open" && (
          <>
            <p className="mt-2 text-center text-lg font-bold">{prompt.question}</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-3 h-28 w-full rounded-2xl border border-white/15 bg-slate-950/60 p-3" />
            <button disabled={sent !== null} onClick={() => answer(text, true)} className="mt-2 w-full rounded-2xl bg-sky-500 p-3 font-black text-slate-950 disabled:opacity-50">Send answer</button>
          </>
        )}
        {prompt.kind === "buzz" && (
          <button disabled={sent !== null} onClick={() => answer("BUZZ", true)}
            className="mt-4 h-40 w-full rounded-full bg-gradient-to-br from-rose-500 to-amber-500 text-3xl font-black text-slate-950 active:scale-95 disabled:opacity-50">
            BUZZ!
          </button>
        )}
        {(!prompt.kind || prompt.kind === "idle") && (
          <p className="py-10 text-center text-slate-400 animate-floaty">👀 Eyes on the board — the tutor will send something soon.</p>
        )}
        {feedback && <p className="mt-3 text-center text-2xl font-black text-emerald-300">{feedback}</p>}
      </section>

      <section className="mt-4 rounded-3xl border border-white/10 bg-slate-900/60 p-4">
        <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Room leaderboard</p>
        <ol className="space-y-1">
          {players.map((p, i) => (
            <li key={p.playerKey} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${p.playerKey === keyRef.current ? "bg-amber-500/10" : ""}`}>
              <span className="w-4 text-xs font-black text-slate-500">{i + 1}</span>
              <img src={p.avatar || avatarUrl("thumbs", p.name)} alt="" className="h-7 w-7 rounded-lg" />
              <span className="flex-1 truncate text-sm font-bold">{p.name}</span>
              <span className="text-sm font-black text-amber-300">{p.score}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
