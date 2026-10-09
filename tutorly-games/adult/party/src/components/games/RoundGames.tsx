"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CONCEPT_LINKS, EMOTION_ROUNDS, FORBIDDEN_ROUNDS, NPC_BIDDERS, SECRET_MISSIONS,
  SELL_ITEMS, STORY_ROUNDS, TRANSLATION_TRAPS,
} from "@/content/games-a";
import type { GameKey } from "@/content/pack";
import { Avatar, Bar, Btn, Chip, Panel, Ring } from "@/components/ui";
import { useArena } from "@/components/arena/provider";
import { sfx } from "@/lib/audio";
import { Listener, normalise, speechRichness } from "@/lib/speech";
import { asset } from "@/lib/basePath";
import { avatarUrl } from "@/lib/avatars";

export default function RoundGames({ mode }: { mode: GameKey }) {
  switch (mode) {
    case "concept": return <Concept />;
    case "translation": return <Translation />;
    case "forbidden": return <Forbidden />;
    case "sentiment": return <Sentiment />;
    case "sell": return <SellThis />;
    case "mission": return <Missions />;
    case "story": return <FinishStory />;
    default: return <p className="p-8 text-slate-400">Pick a game from the menu.</p>;
  }
}

function Head({ round, total, children }: { round: number; total: number; children?: React.ReactNode }) {
  const a = useArena();
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Chip colour="#f59e0b">Round {round} of {total}</Chip>
      <Chip colour="#34d399">{a.current?.name}&apos;s turn</Chip>
      {children}
    </div>
  );
}

/* ---------------- 5 · Concept Link ---------------- */
function Concept() {
  const a = useArena();
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(1);
  const [hints, setHints] = useState(0);
  const [done, setDone] = useState(false);
  const r = CONCEPT_LINKS[i % CONCEPT_LINKS.length];
  const points = Math.max(60, 300 - (shown - 1) * 45 - hints * 30);

  const finish = (ok: boolean) => {
    setDone(true);
    sfx(ok ? "correct" : "wrong");
    if (ok) a.addPoints(a.current.id, points);
    a.log({ gameKey: "concept", questionId: r.id, teamId: a.current.id, teamName: a.current.name, skill: "Vocabulary · Concept", grammarPoint: "Lexical inference", correct: ok, points: ok ? points : 0 });
  };
  const next = () => { setI((v) => v + 1); setShown(1); setHints(0); setDone(false); a.nextTurn(); sfx("whoosh"); };

  return (
    <div className="mx-auto max-w-4xl">
      <Head round={(i % CONCEPT_LINKS.length) + 1} total={CONCEPT_LINKS.length}><Chip colour="#38bdf8">worth {points}</Chip></Head>
      <Panel title="What connects these five?">
        <div className="flex flex-wrap justify-center gap-4 py-6">
          {r.clues.map((c, k) => (
            <div key={k} className={`flex h-24 w-24 items-center justify-center rounded-3xl border text-5xl transition ${k < shown ? "animate-pop border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-white/[0.03] text-transparent"}`}>
              {k < shown ? c : "?"}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn tone="amber" onClick={() => { setShown((s) => Math.min(5, s + 1)); sfx("card"); }} disabled={shown >= 5 || done}>Reveal clue {Math.min(shown + 1, 5)}</Btn>
          <Btn tone="ghost" onClick={() => { setHints((h) => Math.min(3, h + 1)); sfx("chime"); }} disabled={hints >= 3 || done}>💡 Hint ({3 - hints} left)</Btn>
          <Btn tone="green" onClick={() => finish(true)} disabled={done}>✓ They got it</Btn>
          <Btn tone="red" onClick={() => finish(false)} disabled={done}>✕ Nobody got it</Btn>
          <Btn tone="blue" className="ml-auto" onClick={next}>Next round →</Btn>
        </div>
        {hints > 0 && <ul className="mt-3 space-y-1 text-sm text-amber-200">{r.hints.slice(0, hints).map((h, k) => <li key={k}>💡 {h}</li>)}</ul>}
        {done && (
          <div className="animate-rise mt-4 space-y-2">
            <p className="text-2xl font-black text-emerald-300">{r.answer}</p>
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">{r.explain}</p>
            <Btn tone="ghost" size="sm" onClick={() => a.say(`${r.answer}. ${r.explain}`)}>🔊 Read the explanation</Btn>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- 6 · Translation Trap ---------------- */
function Translation() {
  const a = useArena();
  const [i, setI] = useState(0);
  const [lit, setLit] = useState(false);
  const [nat, setNat] = useState(false);
  const r = TRANSLATION_TRAPS[i % TRANSLATION_TRAPS.length];

  const mark = (ok: boolean) => {
    sfx(ok ? "correct" : "buzz");
    if (ok) a.addPoints(a.current.id, 180);
    a.log({ gameKey: "translation", questionId: r.id, teamId: a.current.id, teamName: a.current.name, skill: "Speaking · Reformulation", grammarPoint: r.focus, correct: ok, points: ok ? 180 : 0 });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Head round={(i % TRANSLATION_TRAPS.length) + 1} total={TRANSLATION_TRAPS.length}><Chip colour="#fb7185">{r.focus}</Chip></Head>
      <Panel title="Say the idea naturally in English — do not translate it">
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center text-2xl font-bold">{r.l1}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn tone="red" onClick={() => { setLit(true); sfx("wrong"); }}>Show the trap (literal)</Btn>
          <Btn tone="green" onClick={() => { setNat(true); sfx("correct"); }}>Show the natural version</Btn>
          <Btn tone="ghost" onClick={() => mark(true)}>✓ They nailed it (+180)</Btn>
          <Btn tone="ghost" onClick={() => mark(false)}>✕ Needs work</Btn>
          <Btn tone="blue" className="ml-auto" onClick={() => { setI((v) => v + 1); setLit(false); setNat(false); a.nextTurn(); }}>Next line →</Btn>
        </div>
        {lit && <p className="animate-rise mt-3 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-rose-100">❌ {r.literal}</p>}
        {nat && (
          <div className="animate-rise mt-3 space-y-2">
            {r.natural.map((n, k) => <p key={k} className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-emerald-100">✅ {n}</p>)}
            <p className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3 text-sm text-sky-100">{r.why}</p>
            <Btn size="sm" tone="ghost" onClick={() => a.say(`${r.natural[0]}. ${r.why}`)}>🔊 Read aloud</Btn>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- 7 · Forbidden Answer ---------------- */
function Forbidden() {
  const a = useArena();
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(30);
  const [live, setLive] = useState(false);
  const [heard, setHeard] = useState("");
  const [busted, setBusted] = useState<string | null>(null);
  const listener = useRef<Listener | null>(null);
  const r = FORBIDDEN_ROUNDS[i % FORBIDDEN_ROUNDS.length];

  useEffect(() => () => listener.current?.stop(), []);
  useEffect(() => {
    if (!live || left <= 0 || busted) return;
    const t = setTimeout(() => { setLeft((v) => v - 1); if (left < 6) sfx("tick"); }, 1000);
    return () => clearTimeout(t);
  }, [live, left, busted]);

  useEffect(() => {
    if (!heard || busted) return;
    const words = normalise(heard).split(" ");
    const hit = r.banned.find((b) => words.includes(normalise(b)) || normalise(heard).includes(` ${normalise(b)} `));
    if (hit) { setBusted(hit); sfx("buzz"); listener.current?.stop(); setLive(false); a.addPoints(a.current.id, -60); }
  }, [heard, busted, r.banned, a]);

  const start = () => {
    setHeard(""); setBusted(null); setLeft(30);
    const l = new Listener((f, im) => setHeard(`${f} ${im}`));
    listener.current = l; l.start(); setLive(true); sfx("siren");
  };
  const survive = () => {
    listener.current?.stop(); setLive(false);
    a.addPoints(a.current.id, 200); sfx("correct");
    a.log({ gameKey: "forbidden", questionId: r.id, teamId: a.current.id, teamName: a.current.name, skill: "Speaking · Circumlocution", grammarPoint: "Avoiding fixed answers", correct: true, points: 200 });
  };
  const next = () => { listener.current?.stop(); setLive(false); setI((v) => v + 1); setHeard(""); setBusted(null); setLeft(30); a.nextTurn(); };

  return (
    <div className="mx-auto max-w-4xl">
      <Head round={(i % FORBIDDEN_ROUNDS.length) + 1} total={FORBIDDEN_ROUNDS.length} />
      <Panel title="Answer without using any banned word" right={<Ring value={left} max={30} />}>
        <p className="text-3xl font-black leading-snug">{r.question}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {r.banned.map((b) => (
            <span key={b} className="rounded-full border border-rose-400/50 bg-rose-500/15 px-3 py-1 text-sm font-black uppercase tracking-wider text-rose-200 line-through">{b}</span>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">Trap: {r.trap}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!live ? <Btn tone="red" onClick={start}>🎙 Start the interrogation</Btn> : <Btn tone="amber" onClick={() => { listener.current?.stop(); setLive(false); }}>Pause mic</Btn>}
          <Btn tone="green" onClick={survive} disabled={!!busted}>✓ Survived (+200)</Btn>
          <Btn tone="ghost" onClick={() => a.say(r.model)}>🔊 Model answer</Btn>
          <Btn tone="blue" className="ml-auto" onClick={next}>Next question →</Btn>
        </div>
        {heard && <p className="mt-3 rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-2 text-sm text-cyan-100">🎙 {heard}</p>}
        {busted && (
          <p className="animate-shake mt-3 rounded-xl border border-rose-500 bg-rose-600/30 p-4 text-center text-2xl font-black text-rose-100">
            🚨 BUSTED — “{busted}” (−60)
          </p>
        )}
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300"><b>Model:</b> {r.model}</p>
      </Panel>
    </div>
  );
}

/* ---------------- 10 · Sentiment Analyst ---------------- */
function Sentiment() {
  const a = useArena();
  const [i, setI] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const r = EMOTION_ROUNDS[i % EMOTION_ROUNDS.length];

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => { setUrl(URL.createObjectURL(new Blob(chunks, { type: "audio/webm" }))); stream.getTracks().forEach((t) => t.stop()); };
      mr.start(); setRec(mr); sfx("chime");
    } catch { sfx("wrong"); }
  };
  const stop = () => { rec?.stop(); setRec(null); sfx("card"); };
  const vote = (landed: boolean) => {
    sfx(landed ? "applause" : "buzz");
    if (landed) a.addPoints(a.current.id, 150);
    a.log({ gameKey: "sentiment", questionId: r.id, teamId: a.current.id, teamName: a.current.name, skill: "Speaking · Prosody", grammarPoint: r.emotion, correct: landed, points: landed ? 150 : 0 });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Head round={(i % EMOTION_ROUNDS.length) + 1} total={EMOTION_ROUNDS.length} />
      <Panel title="Perform this line in the demanded emotion">
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-3xl font-black">“{r.line}”</p>
        <p className="mt-4 text-center text-xl">as <span className="rounded-xl bg-violet-500/20 px-3 py-1 font-black text-violet-200">{r.emotion}</span></p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {!rec ? <Btn tone="red" onClick={start}>🎙 Record</Btn> : <Btn tone="amber" onClick={stop}>■ Stop</Btn>}
          {url && <audio controls src={url} className="h-9" />}
          <Btn tone="green" onClick={() => vote(true)}>👏 It landed (+150)</Btn>
          <Btn tone="ghost" onClick={() => vote(false)}>🤔 Missed</Btn>
          <Btn tone="blue" onClick={() => { setI((v) => v + 1); setUrl(null); a.nextTurn(); }}>Next line →</Btn>
        </div>
        <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">🎧 Coaching: {r.coach}</p>
      </Panel>
    </div>
  );
}

/* ---------------- 13 · Sell This! ---------------- */
function SellThis() {
  const a = useArena();
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const [heard, setHeard] = useState("");
  const [bids, setBids] = useState<Record<string, number>>({});
  const listener = useRef<Listener | null>(null);
  const item = SELL_ITEMS[i % SELL_ITEMS.length];
  const rich = useMemo(() => speechRichness(heard), [heard]);

  useEffect(() => () => listener.current?.stop(), []);
  useEffect(() => {
    if (!running || left <= 0) return;
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);

  useEffect(() => {
    if (!running) return;
    setBids((b) => {
      const next = { ...b };
      NPC_BIDDERS.forEach((n, k) => {
        const base = Math.floor(rich.words / (4 + k)) * 5;
        const bonus = rich.advanced * (6 + k * 2);
        const val = base + bonus;
        if (val > (next[n.name] ?? 0)) next[n.name] = val;
      });
      return next;
    });
  }, [rich.words, rich.advanced, running]);

  const top = Math.max(0, ...Object.values(bids));
  const winner = Object.entries(bids).sort((x, y) => y[1] - x[1])[0];

  const start = () => {
    setHeard(""); setBids({}); setLeft(60);
    const l = new Listener((f, im) => setHeard(`${f} ${im}`));
    listener.current = l; l.start(); setRunning(true); sfx("drumroll");
  };
  const stop = () => {
    listener.current?.stop(); setRunning(false);
    const sold = top >= item.reserve;
    sfx(sold ? "applause" : "buzz");
    if (sold) a.addPoints(a.current.id, top);
    a.log({ gameKey: "sell", questionId: item.id, teamId: a.current.id, teamName: a.current.name, skill: "Speaking · Persuasion", grammarPoint: "Adjectives & selling language", correct: sold, points: sold ? top : 0, detail: { top, words: rich.words, advanced: rich.advancedWords } });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Head round={(i % SELL_ITEMS.length) + 1} total={SELL_ITEMS.length}>
        <Chip colour="#eab308">reserve {item.reserve}</Chip><Chip colour="#22d3ee">{left}s</Chip>
      </Head>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel title="Today's lot">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <img src={asset("/images/market.svg")} alt="" className="h-40 w-full object-cover opacity-70" />
          </div>
          <p className="mt-3 text-3xl font-black">{item.item}</p>
          <p className="mt-1 text-sm text-amber-200">Twist: {item.twist}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!running ? <Btn tone="red" onClick={start}>🎙 Start the pitch (60s)</Btn> : <Btn tone="amber" onClick={stop}>■ Going once… sold!</Btn>}
            <Btn tone="ghost" onClick={() => setBids((b) => ({ ...b, "Tutor": (b["Tutor"] ?? top) + 25 }))}>💸 Tutor bids +25</Btn>
            <Btn tone="blue" className="ml-auto" onClick={() => { listener.current?.stop(); setRunning(false); setI((v) => v + 1); setHeard(""); setBids({}); setLeft(60); a.nextTurn(); }}>Next lot →</Btn>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Mini label="words" value={rich.words} /><Mini label="unique" value={rich.unique} /><Mini label="B2+ words" value={rich.advanced} tone="#34d399" />
          </div>
          {rich.advancedWords.length > 0 && <p className="mt-2 text-xs text-emerald-300">Bid boosters heard: {rich.advancedWords.join(", ")}</p>}
          {heard && <p className="mt-3 max-h-28 overflow-y-auto rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-2 text-sm text-cyan-100">🎙 {heard}</p>}
        </Panel>

        <Panel title="The bidders">
          <ul className="space-y-2">
            {NPC_BIDDERS.map((n) => (
              <li key={n.name} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                <Avatar src={avatarUrl("open-peeps", n.seed)} name={n.name} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{n.name}</span>
                  <span className="block text-[10px] text-slate-400">{n.style}</span>
                </span>
                <span className="text-lg font-black text-amber-300 tabular-nums">{bids[n.name] ?? 0}</span>
              </li>
            ))}
            {bids["Tutor"] !== undefined && (
              <li className="flex items-center justify-between rounded-xl border border-amber-400/40 bg-amber-500/10 p-2 text-sm font-bold">
                <span>Tutor</span><span className="text-lg font-black text-amber-300">{bids["Tutor"]}</span>
              </li>
            )}
          </ul>
          <div className="mt-3">
            <p className="text-xs text-slate-400">Top bid vs reserve</p>
            <Bar value={(top / item.reserve) * 100} colour={top >= item.reserve ? "#34d399" : "#f59e0b"} />
            <p className="mt-1 text-2xl font-black">{top} <span className="text-sm text-slate-400">/ {item.reserve}</span></p>
            {!running && top > 0 && (
              <p className={`mt-2 rounded-xl p-2 text-sm font-bold ${top >= item.reserve ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"}`}>
                {top >= item.reserve ? `SOLD to ${winner?.[0]} for ${top}!` : "Unsold — the reserve wasn't met."}
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Mini({ label, value, tone = "#38bdf8" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-xl font-black" style={{ color: tone }}>{value}</p>
    </div>
  );
}

/* ---------------- 14 · Secret Mission ---------------- */
function Missions() {
  const a = useArena();
  const [i, setI] = useState(0);
  const [hidden, setHidden] = useState(true);
  const [targetId, setTargetId] = useState(a.s.teams[0]?.id ?? "");
  const m = SECRET_MISSIONS[i % SECRET_MISSIONS.length];
  const target = a.s.teams.find((t) => t.id === targetId);

  const win = () => {
    sfx("applause");
    a.addPoints(a.current.id, 200);
    a.log({ gameKey: "mission", questionId: m.id, teamId: a.current.id, teamName: a.current.name, skill: "Speaking · Functional language", grammarPoint: m.language, correct: true, points: 200 });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Head round={(i % SECRET_MISSIONS.length) + 1} total={SECRET_MISSIONS.length}><Chip colour="#2dd4bf">{m.language}</Chip></Head>
      <Panel title="Secret mission card">
        <p className="mb-3 text-sm text-slate-300">
          Choose the player who must <b>not</b> look at the screen. Everyone else reads the mission and plays a normal conversation
          until the target performs the action.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {a.s.teams.map((t) => (
            <button key={t.id} onClick={() => setTargetId(t.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm ${targetId === t.id ? "border-amber-400 bg-amber-500/15" : "border-white/10 bg-white/5"}`}>
              <Avatar src={t.avatar} name={t.name} size={22} />{t.name}
            </button>
          ))}
        </div>
        <div className={`relative overflow-hidden rounded-2xl border p-8 text-center transition ${hidden ? "border-white/10 bg-white/[0.03]" : "border-teal-400/40 bg-teal-500/10"}`}>
          {hidden ? (
            <>
              <p className="text-6xl">🤫</p>
              <p className="mt-2 text-sm text-slate-400">{target?.name} — look away. Everyone else, press reveal.</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-black text-teal-200">{m.mission}</p>
              <p className="mt-2 text-sm text-slate-300">Nudge: {m.reveal}</p>
            </>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn tone="amber" onClick={() => { setHidden((h) => !h); sfx("card"); }}>{hidden ? "Reveal the card" : "Hide the card"}</Btn>
          <Btn tone="green" onClick={win}>🎯 Mission accomplished (+200)</Btn>
          <Btn tone="blue" className="ml-auto" onClick={() => { setI((v) => v + 1); setHidden(true); a.nextTurn(); }}>Next mission →</Btn>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- 16 · Finish My Story ---------------- */
function FinishStory() {
  const a = useArena();
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(30);
  const [running, setRunning] = useState(false);
  const [heard, setHeard] = useState("");
  const [dropped, setDropped] = useState<number>(0);
  const [twist, setTwist] = useState(false);
  const listener = useRef<Listener | null>(null);
  const s = STORY_ROUNDS[i % STORY_ROUNDS.length];

  useEffect(() => () => listener.current?.stop(), []);
  useEffect(() => {
    if (!running || left <= 0) return;
    const t = setTimeout(() => {
      setLeft((v) => v - 1);
      if (left % 6 === 0) { setDropped((d) => Math.min(s.vocab.length, d + 1)); sfx("chime"); }
      if (left <= 5) sfx("tick");
    }, 1000);
    return () => clearTimeout(t);
  }, [running, left, s.vocab.length]);

  const used = (w: string) => normalise(heard).includes(normalise(w).slice(0, Math.max(4, w.length - 2)));
  const hits = s.vocab.slice(0, dropped).filter(used).length;

  const start = () => {
    setHeard(""); setLeft(30); setDropped(1); setTwist(false);
    const l = new Listener((f, im) => setHeard(`${f} ${im}`));
    listener.current = l; l.start(); setRunning(true); sfx("whoosh");
  };
  const stop = () => {
    listener.current?.stop(); setRunning(false);
    const pts = hits * 60;
    if (pts) a.addPoints(a.current.id, pts);
    sfx(pts ? "correct" : "buzz");
    a.log({ gameKey: "story", questionId: s.id, teamId: a.current.id, teamName: a.current.name, skill: "Speaking · Narrative", grammarPoint: "Improvised storytelling", correct: hits >= 3, points: pts, detail: { hits } });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Head round={(i % STORY_ROUNDS.length) + 1} total={STORY_ROUNDS.length}><Chip colour="#22d3ee">{left}s</Chip><Chip colour="#34d399">{hits} words used</Chip></Head>
      <Panel title="Continue the story">
        <p className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5 text-xl font-bold leading-relaxed">{s.opener}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {s.vocab.map((w, k) => (
            <span key={w} className={`rounded-xl border px-3 py-1.5 text-lg font-black transition ${k >= dropped ? "border-white/5 bg-black/30 text-transparent" : used(w) ? "animate-pop border-emerald-400 bg-emerald-500/20 text-emerald-200 line-through" : "animate-pop border-amber-400 bg-amber-500/15 text-amber-200"}`}>
              {k >= dropped ? "•••" : w}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!running ? <Btn tone="red" onClick={start}>🎙 Start 30 seconds</Btn> : <Btn tone="amber" onClick={stop}>■ Stop & score</Btn>}
          <Btn tone="violet" onClick={() => { setTwist(true); sfx("boom"); }}>🌀 Throw the twist</Btn>
          <Btn tone="ghost" onClick={() => a.say(s.opener)}>🔊 Read the opener</Btn>
          <Btn tone="blue" className="ml-auto" onClick={() => { listener.current?.stop(); setRunning(false); setI((v) => v + 1); setHeard(""); setDropped(0); setLeft(30); a.nextTurn(); }}>Next story →</Btn>
        </div>
        {twist && <p className="animate-rise mt-3 rounded-xl border border-violet-400/40 bg-violet-500/15 p-3 text-violet-100">🌀 {s.twist}</p>}
        {heard && <p className="mt-3 max-h-32 overflow-y-auto rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-2 text-sm text-cyan-100">🎙 {heard}</p>}
      </Panel>
    </div>
  );
}
