"use client";

import { useMemo, useState } from "react";
import { ALIBI_CASES, MAFIA_CASTS, SPY_LOCATIONS } from "@/content/games-b";
import { Avatar, Btn, Chip, Panel } from "@/components/ui";
import { useArena } from "@/components/arena/provider";
import { sfx } from "@/lib/audio";
import { speak } from "@/lib/speech";
import { avatarUrl } from "@/lib/avatars";
import { asset } from "@/lib/basePath";

export default function Deduction({ mode }: { mode: "alibi" | "spyfall" | "mafia" }) {
  if (mode === "alibi") return <Alibi />;
  if (mode === "spyfall") return <Spyfall />;
  return <Mafia />;
}

/* ---------------- 8 · Alibi Puzzle ---------------- */
function Alibi() {
  const a = useArena();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [accused, setAccused] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const c = ALIBI_CASES[i % ALIBI_CASES.length];

  const lock = () => {
    if (accused === null) return;
    setRevealed(true);
    const ok = accused === c.liar;
    sfx(ok ? "applause" : "buzz");
    if (ok) a.addPoints(a.current.id, 300);
    a.log({ gameKey: "alibi", questionId: c.id, teamId: a.current.id, teamName: a.current.name, skill: "Listening · Detail", grammarPoint: c.language, correct: ok, points: ok ? 300 : 0 });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip colour="#60a5fa">Case {(i % ALIBI_CASES.length) + 1} of {ALIBI_CASES.length}</Chip>
        <Chip colour="#f59e0b">{c.language}</Chip>
        <Btn size="sm" tone="ghost" onClick={() => a.say(`${c.scene}. ${c.crime}. The facts: ${c.facts.join(". ")}`)}>🔊 Read the case</Btn>
        <Btn size="sm" tone="blue" className="ml-auto" onClick={() => { setI((v) => v + 1); setAccused(null); setRevealed(false); setOpen(null); a.nextTurn(); sfx("whoosh"); }}>Next case →</Btn>
      </div>

      <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <img src={asset("/images/noir.svg")} alt="" className="h-40 w-full object-cover opacity-80" />
            <div className="bg-slate-900/80 p-3">
              <p className="text-sm font-black text-sky-200">{c.scene}</p>
              <p className="text-xs text-slate-300">{c.crime}</p>
            </div>
          </div>
          <Panel title="Case facts">
            <ul className="space-y-1 text-sm text-slate-200">{c.facts.map((f, k) => <li key={k}>• {f}</li>)}</ul>
          </Panel>
          <Panel title="Interrogation questions">
            <ul className="space-y-1 text-sm text-amber-100">{c.questions.map((q, k) => <li key={k}>❓ {q}</li>)}</ul>
          </Panel>
        </div>

        <div className="space-y-2">
          {c.suspects.map((s, k) => (
            <div key={s.name} className={`rounded-2xl border p-3 transition ${accused === k ? "border-amber-400 bg-amber-500/10" : "border-white/10 bg-white/[0.03]"} ${revealed && k === c.liar ? "border-rose-400 bg-rose-500/15" : ""}`}>
              <div className="flex items-center gap-3">
                <Avatar src={avatarUrl("notionists", s.seed)} name={s.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">{s.name} <span className="font-normal text-slate-400">· {s.job}</span></p>
                  {open === k || revealed ? <p className="mt-1 text-sm leading-relaxed text-slate-200">“{s.alibi}”</p> : <p className="text-xs text-slate-500">Statement hidden — open to read.</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Btn size="sm" tone="ghost" onClick={() => setOpen(open === k ? null : k)}>{open === k ? "Close" : "Open"}</Btn>
                  <Btn size="sm" tone="ghost" onClick={() => void speak(s.alibi, { gender: k % 2 ? "m" : "f" })}>🔊</Btn>
                  <Btn size="sm" tone={accused === k ? "amber" : "ghost"} onClick={() => { setAccused(k); sfx("card"); }}>Accuse</Btn>
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Btn tone="red" onClick={lock} disabled={accused === null || revealed}>🔒 Lock in the accusation</Btn>
            {revealed && (
              <div className={`flex-1 rounded-2xl border p-3 text-sm ${accused === c.liar ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100" : "border-rose-400/50 bg-rose-500/10 text-rose-100"}`}>
                <b>{accused === c.liar ? "Correct!" : `Wrong — the liar was ${c.suspects[c.liar].name}.`}</b> {c.contradiction}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 11 · Spyfall ---------------- */
function Spyfall() {
  const a = useArena();
  const [i, setI] = useState(0);
  const [spy, setSpy] = useState(() => Math.floor(Math.random() * Math.max(1, a.s.teams.length)));
  const [shown, setShown] = useState<number | null>(null);
  const [peek, setPeek] = useState(false);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [over, setOver] = useState(false);
  const loc = SPY_LOCATIONS[i % SPY_LOCATIONS.length];

  const roles = useMemo(() => [...loc.roles].sort(() => Math.random() - 0.5), [loc]);

  const nextRound = () => {
    setI((v) => v + 1);
    setSpy(Math.floor(Math.random() * Math.max(1, a.s.teams.length)));
    setShown(null); setPeek(false); setVotes({}); setOver(false);
    sfx("deal");
  };

  const finish = () => {
    setOver(true);
    const tally = new Map<string, number>();
    Object.values(votes).forEach((v) => tally.set(v, (tally.get(v) ?? 0) + 1));
    const top = [...tally.entries()].sort((x, y) => y[1] - x[1])[0];
    const caught = top?.[0] === a.s.teams[spy]?.id;
    sfx(caught ? "applause" : "buzz");
    a.s.teams.forEach((t, k) => { if (k !== spy && caught) a.addPoints(t.id, 120); });
    if (!caught && a.s.teams[spy]) a.addPoints(a.s.teams[spy].id, 300);
    a.log({ gameKey: "spyfall", questionId: loc.id, teamName: a.s.teams[spy]?.name, skill: "Speaking · Questioning", grammarPoint: "Question forms & bluffing", correct: caught, points: caught ? 120 : 300 });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip colour="#f472b6">Round {(i % SPY_LOCATIONS.length) + 1} of {SPY_LOCATIONS.length}</Chip>
        <Chip colour="#38bdf8">{a.s.teams.length} players · 1 spy</Chip>
        <Btn size="sm" tone="ghost" onClick={() => setPeek((p) => !p)}>{peek ? "Hide tutor view" : "👁 Tutor view"}</Btn>
        <Btn size="sm" tone="blue" className="ml-auto" onClick={nextRound}>Re-deal →</Btn>
      </div>

      <Panel title="Pass the board — each player opens only their own card">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {a.s.teams.map((t, k) => (
            <button key={t.id} onClick={() => { setShown(shown === k ? null : k); sfx("card"); }}
              className={`rounded-2xl border p-4 text-left transition ${shown === k ? "border-amber-400 bg-amber-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}>
              <div className="flex items-center gap-2">
                <Avatar src={t.avatar} name={t.name} size={32} />
                <span className="text-sm font-black">{t.name}</span>
              </div>
              {shown === k ? (
                k === spy
                  ? <p className="mt-3 text-center text-2xl font-black text-rose-400">🕵️ YOU ARE THE SPY</p>
                  : <>
                    <p className="mt-3 text-center text-xl font-black text-emerald-300">{loc.emoji} {loc.name}</p>
                    <p className="text-center text-xs text-slate-300">{roles[k % roles.length].role} — {roles[k % roles.length].prompt}</p>
                  </>
              ) : <p className="mt-3 text-center text-sm text-slate-500">tap to reveal · tap again to hide</p>}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Opening questions">
          <ul className="space-y-1 text-sm text-amber-100">{loc.starters.map((s, k) => <li key={k}>❓ {s}</li>)}</ul>
          {peek && (
            <p className="mt-3 rounded-xl border border-rose-400/40 bg-rose-500/10 p-2 text-sm text-rose-200">
              Tutor only: location is <b>{loc.name}</b>; the spy is <b>{a.s.teams[spy]?.name}</b>.
            </p>
          )}
        </Panel>
        <Panel title="Accusations">
          <div className="space-y-2">
            {a.s.teams.map((voter) => (
              <div key={voter.id} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs font-bold">{voter.name} votes</span>
                <select value={votes[voter.id] ?? ""} onChange={(e) => setVotes({ ...votes, [voter.id]: e.target.value })}
                  className="flex-1 rounded-lg border border-white/15 bg-slate-950/60 px-2 py-1 text-xs">
                  <option value="">—</option>
                  {a.s.teams.filter((t) => t.id !== voter.id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ))}
          </div>
          <Btn className="mt-3 w-full" tone="red" onClick={finish} disabled={over}>Reveal the spy</Btn>
          {over && (
            <p className="mt-2 rounded-xl border border-white/15 bg-white/[0.05] p-3 text-sm">
              The spy was <b className="text-rose-300">{a.s.teams[spy]?.name}</b>. The location was <b className="text-emerald-300">{loc.name}</b>.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- 12 · Mafia & Werewolf ---------------- */
function Mafia() {
  const a = useArena();
  const [i, setI] = useState(0);
  const [read, setRead] = useState(0);
  const [accuse, setAccuse] = useState<Record<string, number>>({});
  const [over, setOver] = useState(false);
  const cast = MAFIA_CASTS[i % MAFIA_CASTS.length];
  const diff = a.s.settings.mafia;
  const tellLimit = diff === "easy" ? 3 : diff === "standard" ? 2 : 0;

  const lock = () => {
    setOver(true);
    sfx("reveal");
    let right = 0;
    Object.entries(accuse).forEach(([teamId, idx]) => {
      const ok = cast.culprits.includes(idx);
      if (ok) { right++; a.addPoints(teamId, 250); }
    });
    a.log({
      gameKey: "mafia", questionId: cast.id, teamId: a.current.id, teamName: a.current.name,
      skill: "Speaking · Debate", grammarPoint: "Deduction & accusation language",
      correct: right > 0, points: right * 250, detail: { difficulty: diff, right },
    });
  };

  const report = useMemo(() => {
    const lines = [
      `PARTY MODE ARENA — ${cast.title} (${diff})`,
      `Hidden side: ${cast.hidden}. Culprits: ${cast.culprits.map((c) => cast.cast[c].n).join(" & ")}.`,
      "",
      "THE REAL TELLS:",
      ...cast.culprits.map((c) => `• ${cast.cast[c].n}: ${cast.cast[c].tell ?? "no tell dealt"}`),
      "",
      "ACCUSATIONS:",
      ...Object.entries(accuse).map(([tid, idx]) => {
        const t = a.s.teams.find((x) => x.id === tid);
        return `• ${t?.name} accused ${cast.cast[idx].n} — ${cast.culprits.includes(idx) ? "CORRECT" : "wrong"}`;
      }),
      "",
      "WHY THE ROUND PLAYED OUT THIS WAY:",
      cast.report,
    ];
    return lines.join("\n");
  }, [cast, accuse, a.s.teams, diff]);

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip colour="#94a3b8">Cast {(i % MAFIA_CASTS.length) + 1} of {MAFIA_CASTS.length}</Chip>
        <Chip colour="#fb7185">{cast.hidden} ×2 hidden</Chip>
        {(["easy", "standard", "brutal"] as const).map((d) => (
          <Btn key={d} size="sm" tone={diff === d ? "amber" : "ghost"}
            onClick={() => a.set((st) => ({ ...st, settings: { ...st.settings, mafia: d } }))}>{d}</Btn>
        ))}
        <Btn size="sm" tone="blue" className="ml-auto" onClick={() => { setI((v) => v + 1); setRead(0); setAccuse({}); setOver(false); sfx("deal"); }}>Next cast →</Btn>
      </div>

      <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
        <b className="text-white">{cast.title}.</b> {cast.flavour} Nothing in a statement names a role — every line fits at least two people.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {cast.cast.map((ch, k) => {
          const revealedTell = !over && ch.tell && ch.rank && ch.rank <= tellLimit;
          const isCulprit = over && cast.culprits.includes(k);
          return (
            <div key={ch.n} className={`rounded-2xl border p-3 transition ${isCulprit ? "border-rose-400 bg-rose-500/15" : k < read ? "border-white/20 bg-white/[0.05]" : "border-white/10 bg-white/[0.02] opacity-70"}`}>
              <div className="flex items-start gap-3">
                <Avatar src={avatarUrl("lorelei", ch.seed)} name={ch.n} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">{ch.n} {over && <span className="font-normal text-rose-300">· {isCulprit ? cast.hidden : ch.role}</span>}</p>
                  <p className="mt-1 text-sm leading-snug text-slate-200">“{ch.s}”</p>
                  {revealedTell && <p className="mt-1 text-xs text-amber-300">🔎 tell: {ch.tell}</p>}
                  {over && ch.tell && <p className="mt-1 text-xs text-amber-200">Real tell: {ch.tell}</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Btn size="sm" tone="ghost" onClick={() => void speak(ch.s, { gender: k % 2 ? "m" : "f" })}>🔊</Btn>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Btn tone="amber" onClick={() => { setRead((r) => Math.min(8, r + 1)); void speak(cast.cast[Math.min(7, read)].s, { gender: read % 2 ? "m" : "f" }); }}>
          ▶ Read statement {Math.min(read + 1, 8)} aloud
        </Btn>
        <Btn tone="ghost" onClick={() => setRead(8)}>Show all statements</Btn>
      </div>

      <Panel title="Accusations — every team names one character">
        <div className="grid gap-2 sm:grid-cols-2">
          {a.s.teams.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <Avatar src={t.avatar} name={t.name} size={24} />
              <span className="w-24 shrink-0 truncate text-xs font-bold">{t.name}</span>
              <select value={accuse[t.id] ?? ""} onChange={(e) => setAccuse({ ...accuse, [t.id]: Number(e.target.value) })}
                className="flex-1 rounded-lg border border-white/15 bg-slate-950/60 px-2 py-1 text-xs">
                <option value="">—</option>
                {cast.cast.map((c, k) => <option key={c.n} value={k}>{c.n}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn tone="red" onClick={lock} disabled={over || !Object.keys(accuse).length}>🔒 Lock in and reveal</Btn>
          {over && <Btn tone="ghost" onClick={() => { navigator.clipboard?.writeText(report); sfx("correct"); }}>📋 Copy the round report</Btn>}
          {over && <Btn tone="ghost" onClick={() => a.say(cast.report)}>🔊 Read the report</Btn>}
        </div>
        {over && (
          <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-slate-200">{report}</pre>
        )}
      </Panel>
    </div>
  );
}
