"use client";

import { useEffect, useState } from "react";
import { DEBATE_FORMAT, DEBATE_RUBRIC, DEBATE_TOPICS } from "@/content/debate";
import { Bar, Btn, Chip, Panel } from "@/components/ui";
import { useArena } from "@/components/arena/provider";
import { sfx } from "@/lib/audio";
import { asset } from "@/lib/basePath";

export default function DebateArena() {
  const a = useArena();
  const [ti, setTi] = useState(0);
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState(DEBATE_FORMAT[0].seconds);
  const [running, setRunning] = useState(false);
  const [forTeam, setForTeam] = useState(a.s.teams[0]?.id ?? "");
  const [againstTeam, setAgainstTeam] = useState(a.s.teams[1]?.id ?? a.s.teams[0]?.id ?? "");
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [showFor, setShowFor] = useState(true);
  const [showAgainst, setShowAgainst] = useState(true);
  const t = DEBATE_TOPICS[ti % DEBATE_TOPICS.length];
  const ph = DEBATE_FORMAT[phase];

  useEffect(() => {
    if (!running || left <= 0) return;
    const id = setTimeout(() => {
      setLeft((v) => v - 1);
      if (left <= 4) sfx("tick");
      if (left === 1) { sfx("bell"); setRunning(false); }
    }, 1000);
    return () => clearTimeout(id);
  }, [running, left]);

  const goPhase = (i: number) => { setPhase(i); setLeft(DEBATE_FORMAT[i].seconds); setRunning(false); sfx("chime"); };

  const score = (teamId: string, crit: string, v: number) =>
    setScores((s) => ({ ...s, [teamId]: { ...(s[teamId] ?? {}), [crit]: v } }));

  const total = (teamId: string) => Object.values(scores[teamId] ?? {}).reduce((x, y) => x + y, 0);

  const finish = () => {
    const f = total(forTeam), ag = total(againstTeam);
    sfx("applause");
    a.addPoints(forTeam, f * 20);
    if (againstTeam !== forTeam) a.addPoints(againstTeam, ag * 20);
    a.log({
      gameKey: "debate", questionId: t.id, teamId: forTeam,
      teamName: `${a.s.teams.find((x) => x.id === forTeam)?.name} vs ${a.s.teams.find((x) => x.id === againstTeam)?.name}`,
      skill: "Speaking · Debate", grammarPoint: t.tags.join(", "), correct: f >= ag, points: Math.max(f, ag) * 20,
      detail: { motion: t.motion, for: f, against: ag },
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip colour="#fbbf24">Motion {(ti % DEBATE_TOPICS.length) + 1} of {DEBATE_TOPICS.length}</Chip>
        <Chip colour="#fb7185">heat {"🔥".repeat(t.heat)}</Chip>
        <Chip colour="#38bdf8">{t.cefr}</Chip>
        <Btn size="sm" tone="ghost" onClick={() => a.say(`${t.motion}. ${t.context}`)}>🔊 Read the motion</Btn>
        <Btn size="sm" tone="blue" className="ml-auto" onClick={() => { setTi((v) => v + 1); setPhase(0); setLeft(DEBATE_FORMAT[0].seconds); setScores({}); sfx("whoosh"); }}>Next motion →</Btn>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-amber-400/25">
        <img src={asset("/images/debate.svg")} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="relative p-5">
          <p className="text-center text-xs uppercase tracking-[0.35em] text-amber-300">{t.hook}</p>
          <h2 className="mt-2 text-center text-3xl font-black leading-tight">{t.motion}</h2>
          <p className="mx-auto mt-2 max-w-3xl text-center text-sm text-slate-300">{t.context}</p>

          <div className="mx-auto mt-4 grid max-w-3xl gap-2 sm:grid-cols-2">
            <label className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
              For
              <select value={forTeam} onChange={(e) => setForTeam(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950/70 px-2 py-1 text-sm font-normal normal-case text-white">
                {a.s.teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
            <label className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-2 text-xs font-bold uppercase tracking-wider text-rose-200">
              Against
              <select value={againstTeam} onChange={(e) => setAgainstTeam(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950/70 px-2 py-1 text-sm font-normal normal-case text-white">
                {a.s.teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
          </div>
        </div>
      </div>

      <Panel title={`Phase ${phase + 1} · ${ph.phase}`} right={<span className="font-mono text-2xl font-black tabular-nums">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</span>}>
        <p className="text-sm text-slate-300">{ph.instruction}</p>
        <div className="mt-2"><Bar value={(left / ph.seconds) * 100} colour="#fbbf24" /></div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn tone={running ? "amber" : "green"} onClick={() => { setRunning((r) => !r); sfx("bell"); }}>{running ? "❚❚ Pause" : "▶ Start phase"}</Btn>
          <Btn tone="ghost" onClick={() => goPhase(Math.max(0, phase - 1))}>← Previous</Btn>
          <Btn tone="ghost" onClick={() => goPhase(Math.min(DEBATE_FORMAT.length - 1, phase + 1))}>Next phase →</Btn>
          <Btn tone="violet" onClick={() => { a.say(t.curveball); sfx("boom"); }}>🌀 Curveball</Btn>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {DEBATE_FORMAT.map((p, i) => (
            <button key={p.phase} onClick={() => goPhase(i)}
              className={`rounded-lg border px-2 py-1 text-[11px] ${i === phase ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-white/10 bg-white/5 text-slate-400"}`}>{p.phase}</button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Case FOR" right={<Btn size="sm" tone="ghost" onClick={() => setShowFor((s) => !s)}>{showFor ? "hide" : "show"}</Btn>}>
          {showFor && t.forArguments.map((x, i) => (
            <div key={i} className="mb-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3">
              <p className="text-sm font-black text-emerald-200">{x.claim}</p>
              <p className="text-xs text-slate-300">Evidence: {x.evidence}</p>
              <p className="text-[11px] text-emerald-300/80">Language: {x.language}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Case AGAINST" right={<Btn size="sm" tone="ghost" onClick={() => setShowAgainst((s) => !s)}>{showAgainst ? "hide" : "show"}</Btn>}>
          {showAgainst && t.againstArguments.map((x, i) => (
            <div key={i} className="mb-2 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3">
              <p className="text-sm font-black text-rose-200">{x.claim}</p>
              <p className="text-xs text-slate-300">Evidence: {x.evidence}</p>
              <p className="text-[11px] text-rose-300/80">Language: {x.language}</p>
            </div>
          ))}
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Target vocabulary">
          <ul className="space-y-1.5 text-sm">
            {t.vocabulary.map((v) => (
              <li key={v.word}><b className="text-amber-200">{v.word}</b> — {v.meaning}<br /><span className="text-xs text-slate-400">“{v.example}”</span></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Sentence frames">
          {t.frames.map((f) => (
            <div key={f.function} className="mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{f.function}</p>
              <ul className="text-sm text-slate-200">{f.phrases.map((p, i) => <li key={i}>› {p}</li>)}</ul>
            </div>
          ))}
        </Panel>
        <Panel title="Media & follow-ups">
          {t.media.filter((m) => m.type === "image" && m.url).slice(0, 1).map((m, i) => (
            <figure key={i} className="mb-2 overflow-hidden rounded-xl border border-white/10">
              <img src={m.url} alt={m.caption} className="h-28 w-full object-cover" />
              <figcaption className="p-2 text-[11px] text-slate-400">{m.caption}</figcaption>
            </figure>
          ))}
          <ul className="space-y-1 text-sm text-slate-200">{t.followUps.map((f, i) => <li key={i}>❓ {f}</li>)}</ul>
        </Panel>
      </div>

      <Panel title="Live judging" right={<Btn size="sm" tone="green" onClick={finish}>Save result & award points</Btn>}>
        <div className="grid gap-3 sm:grid-cols-2">
          {[forTeam, againstTeam].filter((v, i, arr) => arr.indexOf(v) === i).map((tid) => (
            <div key={tid} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-sm font-black">{a.s.teams.find((x) => x.id === tid)?.name} — {total(tid)}/25</p>
              {DEBATE_RUBRIC.map((r) => (
                <div key={r.id} className="mb-1.5">
                  <p className="text-[11px] text-slate-400">{r.label} <span className="text-slate-600">· {r.hint}</span></p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => { score(tid, r.id, n); sfx("click"); }}
                        className={`h-7 flex-1 rounded-md border text-xs ${(scores[tid]?.[r.id] ?? 0) >= n ? "border-amber-400 bg-amber-500/25 text-amber-100" : "border-white/10 bg-white/5 text-slate-500"}`}>{n}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
