"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GRID_QUESTIONS } from "@/content/pack";
import type { Question } from "@/content/build";
import { LUCK_DECK, POWER_UPS, STREAK_BONUS, type LuckId, type PowerId } from "@/content/cards";
import { Avatar, Btn, Chip, Panel, Ring } from "@/components/ui";
import { useArena } from "@/components/arena/provider";
import { sfx } from "@/lib/audio";
import { Listener, scoreReading, speakScript } from "@/lib/speech";
import { getRoom, pushPrompt } from "@/lib/localApi";

export default function GridArena() {
  const a = useArena();
  const [active, setActive] = useState<number | null>(null);
  const done = a.s.cells.filter((c) => c.done).length;
  const finished = done === 64;

  useEffect(() => { if (finished) sfx("applause"); }, [finished]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Chip colour="#f59e0b">{done}/64 tiles taken</Chip>
          <Chip colour="#34d399">{a.current?.name} to choose</Chip>
          {a.current?.streak ? <Chip colour="#fb7185">streak bonus +{STREAK_BONUS(a.current.streak)}</Chip> : null}
        </div>
        <div className="flex gap-2">
          <Btn size="sm" tone="ghost" onClick={() => a.set((st) => ({ ...st, cells: st.cells.map((c) => ({ ...c, done: false, correct: undefined })) }))}>Reset board</Btn>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
        {a.s.cells.map((c) => (
          <button
            key={c.cell}
            disabled={c.done}
            onClick={() => { setActive(c.cell); sfx("whoosh"); }}
            className={`tile-3d relative aspect-square rounded-xl border text-center font-black transition
              ${c.done
                ? c.correct === true ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300/70"
                  : c.correct === false ? "border-rose-400/40 bg-rose-500/15 text-rose-300/70"
                    : "border-white/10 bg-white/[0.04] text-slate-600"
                : "border-white/15 bg-gradient-to-br from-slate-800 to-slate-900 text-slate-200 hover:border-amber-300"}`}
          >
            <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-lg">{c.done ? (c.correct === true ? "✓" : c.correct === false ? "✕" : "·") : c.cell}</span>
          </button>
        ))}
      </div>

      {finished && <EndBanner />}
      {active !== null && <CardOverlay cell={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function EndBanner() {
  const a = useArena();
  const winner = [...a.s.teams].sort((x, y) => y.score - x.score)[0];
  return (
    <div className="animate-pop rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Final tile taken</p>
      <p className="mt-1 text-3xl font-black">🏆 {winner?.name} wins with {winner?.score}</p>
      <p className="mt-1 text-sm text-slate-300">Open the score sheet in the header for the teaching plan and the one-tap re-ask.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CardOverlay({ cell, onClose }: { cell: number; onClose: () => void }) {
  const a = useArena();
  const cellState = a.s.cells.find((c) => c.cell === cell)!;
  const bank = a.questions.length ? a.questions : GRID_QUESTIONS;
  const q: Question = bank[(cell - 1) % bank.length];
  const me = a.current;

  const [picked, setPicked] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [left, setLeft] = useState(a.s.settings.timer);
  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState(false);
  const [removed, setRemoved] = useState<number[]>([]);
  const [stake, setStake] = useState(1);
  const [shieldOn, setShieldOn] = useState(false);
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const [bonusShown, setBonusShown] = useState(false);
  const [luckTarget, setLuckTarget] = useState<LuckId | null>(null);
  const [votes, setVotes] = useState<{ answer: string; playerName: string }[]>([]);
  const started = useRef(Date.now());
  const listener = useRef<Listener | null>(null);

  const points = q.points * stake;

  useEffect(() => {
    if (a.s.settings.autoRead) a.say(q.prompt);
    if (a.s.roomCode) {
      pushPrompt(a.s.roomCode, { kind: "mcq", title: `Cell ${cell}`, question: q.prompt, options: q.options, answer: q.answer });
    }
    return () => listener.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const code = a.s.roomCode;
    if (!code || revealed) return;
    const t = setInterval(() => {
      const r = getRoom(code);
      if (r?.answers) setVotes(r.answers.map((x) => ({ answer: x.answer, playerName: x.playerName })));
    }, 2200);
    return () => clearInterval(t);
  }, [a.s.roomCode, revealed]);

  useEffect(() => {
    if (paused || revealed || left <= 0) return;
    const t = setTimeout(() => {
      setLeft((v) => v - 1);
      if (left <= 6) sfx(left % 2 ? "tick" : "tock");
    }, 1000);
    return () => clearTimeout(t);
  }, [left, paused, revealed]);

  const correctSet = useMemo(() => new Set(q.answer), [q.answer]);

  const grade = (ok: boolean) => {
    if (revealed) return;
    const seconds = Math.round((Date.now() - started.current) / 1000);
    setWasCorrect(ok);
    setRevealed(true);
    sfx(ok ? "correct" : "wrong");
    const streakBonus = ok ? STREAK_BONUS(me.streak + 1) : 0;
    const delta = ok ? points + streakBonus : shieldOn ? 0 : -points;
    a.addPoints(me.id, delta);
    a.bumpStreak(me.id, ok || shieldOn);
    a.set((st) => ({
      ...st,
      cells: st.cells.map((c) => (c.cell === cell ? { ...c, done: true, correct: ok, teamId: me.id, seconds, points: delta } : c)),
    }));
    a.log({
      gameKey: "grid", cell, questionId: q.id, teamId: me.id, teamName: me.name,
      skill: q.skill, grammarPoint: q.grammarPoint, cefr: q.cefr, correct: ok, points: delta, seconds,
    });
    if (cellState.bonus) setTimeout(() => setBonusShown(true), 700);
  };

  const pick = (i: number) => {
    if (revealed) return;
    if (q.type === "multi") {
      const next = picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i];
      setPicked(next);
      return;
    }
    setPicked([i]);
    grade(correctSet.has(i));
  };

  const submitMulti = () => grade(picked.length === correctSet.size && picked.every((p) => correctSet.has(p)));

  /** `playPower`, not `usePower`: the name is what the lint rule reads, and a handler called `use…` inside a map reads as a hook. */
  const playPower = (p: PowerId) => {
    if (!me.powers.includes(p)) return;
    a.spendPower(me.id, p);
    sfx("powerup");
    if (p === "double") setStake((s) => s * 2);
    if (p === "highstakes") setStake((s) => s * 2);
    if (p === "fifty50") {
      const wrong = q.options.map((_, i) => i).filter((i) => !correctSet.has(i)).sort(() => Math.random() - 0.5).slice(0, 2);
      setRemoved(wrong);
    }
    if (p === "shield" || p === "streaklock") setShieldOn(true);
    if (p === "freeze") setPaused(true);
    if (p === "timeboost") { setLeft((v) => v + 10); a.addPoints(me.id, 25); }
    if (p === "streakup") a.bumpStreak(me.id, true);
    if (p === "bounty") a.addPoints(me.id, 50);
    if (p === "swap") {
      const sorted = [...a.s.teams].sort((x, y) => y.score - x.score);
      const idx = sorted.findIndex((t) => t.id === me.id);
      const above = sorted[Math.max(0, idx - 1)];
      if (above && above.id !== me.id) { const mine = me.score; a.setScore(me.id, above.score); a.setScore(above.id, mine); }
    }
    if (p === "wipe") {
      const rival = a.s.teams.find((t) => t.id !== me.id);
      if (rival) a.setScore(rival.id, 0);
    }
  };

  const applyLuck = (id: LuckId, targetId?: string) => {
    const card = LUCK_DECK.find((c) => c.id === id)!;
    const teams = a.s.teams;
    const leader = [...teams].sort((x, y) => y.score - x.score)[0];
    const bottom = [...teams].sort((x, y) => x.score - y.score)[0];
    const rnd = () => 10 + Math.floor(Math.random() * 31);
    sfx(card.kind === "gain" ? "coin" : card.kind === "loss" ? "buzz" : "reveal");
    switch (id) {
      case "fairy": if (targetId) { a.addPoints(targetId, -50); a.addPoints(me.id, 50); } break;
      case "thief": if (targetId) { a.addPoints(targetId, 50); a.addPoints(me.id, -50); } break;
      case "rocket": a.setScore(me.id, leader.score + 10); break;
      case "banana": a.setScore(me.id, bottom.score - 10); break;
      case "star": a.setScore(me.id, me.score * 2); break;
      case "heart": if (targetId) a.addPoints(targetId, 50); break;
      case "eraser": a.setScore(me.id, 0); break;
      case "virus": teams.forEach((t) => a.setScore(t.id, 0)); break;
      case "shark": { let got = 0; teams.filter((t) => t.id !== me.id).forEach((t) => { a.addPoints(t.id, -25); got += 25; }); a.addPoints(me.id, got); break; }
      case "magnet": if (leader.id !== me.id) { a.addPoints(leader.id, -75); a.addPoints(me.id, 75); } break;
      case "lifesaver": if (bottom.id !== me.id) { a.addPoints(me.id, -75); a.addPoints(bottom.id, 75); } break;
      case "trap": a.nextTurn(); break;
      case "seesaw": if (leader.id !== me.id) { const mine = me.score; a.setScore(me.id, leader.score); a.setScore(leader.id, mine); } break;
      case "gold": a.addPoints(me.id, 50); break;
      case "boom": a.addPoints(me.id, -50); break;
      case "gift": a.addPoints(me.id, rnd()); break;
      case "baam": a.addPoints(me.id, -rnd()); break;
    }
    setLuckTarget(null);
    setBonusShown(false);
  };

  const startSpeech = () => {
    if (listening) { listener.current?.stop(); setListening(false); return; }
    const l = new Listener((final, interim) => setHeard(`${final} ${interim}`.trim()));
    listener.current = l;
    if (l.start()) setListening(true);
  };

  const spokenScore = heard ? scoreReading(q.options[q.answer[0]] ?? "", heard) : null;

  const finish = () => {
    if (!revealed) grade(false);
    a.nextTurn();
    onClose();
  };

  const bonusCard = cellState.bonus;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-sm">
      <div className="animate-pop mt-4 w-full max-w-5xl space-y-3">
        {/* header */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/90 px-4 py-2.5">
          <Chip colour="#38bdf8">{q.skill}</Chip>
          <Chip colour="#a78bfa">{q.cefr}</Chip>
          <Chip colour="#f59e0b">{points} pts{stake > 1 ? ` (×${stake})` : ""}</Chip>
          <Chip colour="#fb7185">streak {me.streak}🔥</Chip>
          <span className="text-xs text-slate-400">cell {cell}</span>
          <div className="ml-auto flex items-center gap-2">
            <Ring value={left} max={a.s.settings.timer} onClick={() => setPaused((p) => !p)} label={paused ? "❚❚" : String(Math.max(0, left))} />
            <Btn tone="ghost" size="sm" onClick={finish}>Close ✕</Btn>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-3">
            {/* question */}
            <Panel title={`Question · ${q.grammarPoint}`}>
              {q.passage && (
                <div className="mb-3 max-h-56 overflow-y-auto whitespace-pre-line rounded-xl border border-sky-400/20 bg-sky-500/5 p-3 text-sm leading-relaxed text-slate-200">
                  {q.passage}
                </div>
              )}
              {q.script && (
                <div className="mb-3 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-violet-300">Listening</span>
                    <Btn size="sm" tone="violet" onClick={() => void speakScript(q.script!.map((l) => ({ speaker: l.speaker, voice: l.voice, line: l.line })), a.s.settings.narrator)}>▶ Play the recording</Btn>
                  </div>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {q.script.map((l, i) => <li key={i}><b className="text-violet-200">{l.speaker}:</b> {l.line}</li>)}
                  </ul>
                </div>
              )}
              <p className="text-xl font-bold leading-snug text-white">{q.prompt}</p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((o, i) => {
                  const isCorrect = correctSet.has(i);
                  const chosen = picked.includes(i);
                  const hidden = removed.includes(i);
                  const tone = revealed
                    ? isCorrect ? "border-emerald-400 bg-emerald-500/20"
                      : chosen ? "border-rose-400 bg-rose-500/20" : "border-white/10 bg-white/[0.02] opacity-60"
                    : chosen ? "border-amber-300 bg-amber-400/15" : "border-white/15 bg-white/[0.04] hover:border-white/40";
                  return (
                    <button key={i} disabled={hidden} onClick={() => pick(i)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${tone} ${hidden ? "pointer-events-none opacity-20 line-through" : ""}`}>
                      <span className="mr-2 text-xs font-black text-slate-400">{"ABCD"[i]}</span>{o}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {q.type === "multi" && !revealed && <Btn tone="amber" onClick={submitMulti}>Submit selection</Btn>}
                <Btn tone="ghost" size="sm" onClick={() => { setHint(true); sfx("chime"); }}>💡 Hint</Btn>
                <Btn tone="ghost" size="sm" onClick={() => a.say(q.prompt)}>🔊 Read question</Btn>
                <Btn tone={listening ? "red" : "ghost"} size="sm" onClick={startSpeech}>🎙 {listening ? "Stop" : "Speech practice"}</Btn>
                <div className="ml-auto flex gap-2">
                  <Btn tone="green" onClick={() => grade(true)} disabled={revealed}>✓ Correct</Btn>
                  <Btn tone="red" onClick={() => grade(false)} disabled={revealed}>✕ Wrong</Btn>
                </div>
              </div>
              {hint && <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2 text-sm text-amber-200">💡 {q.hint}</p>}
              {heard && (
                <p className="mt-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-2 text-sm text-cyan-100">
                  🎙 heard: “{heard}”{spokenScore ? ` · match ${spokenScore.accuracy}%` : ""}
                </p>
              )}
            </Panel>

            {revealed && <MiniLesson q={q} correct={wasCorrect === true} />}
          </div>

          {/* right rail */}
          <div className="space-y-3">
            <Panel title="Play a power-up">
              <div className="flex flex-wrap gap-1.5">
                {me.powers.length ? me.powers.map((p, i) => {
                  const pu = POWER_UPS.find((x) => x.id === p)!;
                  return (
                    <button key={i} onClick={() => playPower(p)} title={pu.rule}
                      className="rounded-lg border px-2 py-1 text-[11px] font-bold hover:brightness-125"
                      style={{ borderColor: `${pu.colour}66`, color: pu.colour, background: `${pu.colour}18` }}>
                      {pu.icon} {pu.name}
                    </button>
                  );
                }) : <span className="text-xs text-slate-500">None held. Land on a ⚡ tile to earn one.</span>}
              </div>
              {shieldOn && <p className="mt-2 text-[11px] text-emerald-300">🛡️ Shield active — the next miss is free.</p>}
            </Panel>

            {a.s.roomCode && (
              <Panel title={`Room ${a.s.roomCode}`}>
                {votes.length ? (
                  <>
                    <ul className="space-y-1 text-xs">
                      {q.options.map((o, i) => {
                        const n = votes.filter((v) => v.answer === String(i)).length;
                        return (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-4 font-black text-slate-500">{"ABCD"[i]}</span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                              <span className="block h-full rounded-full bg-sky-400" style={{ width: `${(n / Math.max(1, votes.length)) * 100}%` }} />
                            </span>
                            <span className="w-5 text-right tabular-nums">{n}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <Btn className="mt-2 w-full" size="sm" tone="blue" onClick={() => {
                      const tally = q.options.map((_, i) => votes.filter((v) => v.answer === String(i)).length);
                      const best = tally.indexOf(Math.max(...tally));
                      pick(best);
                    }}>Adopt the room&rsquo;s pick</Btn>
                  </>
                ) : <p className="text-xs text-slate-500">Waiting for phones…</p>}
              </Panel>
            )}

            <Panel title="Next">
              <Btn className="w-full" tone="amber" onClick={finish}>{revealed ? "Next team →" : "Skip & pass →"}</Btn>
            </Panel>
          </div>
        </div>

        {/* bonus card */}
        {bonusShown && bonusCard && (
          <div className="animate-pop rounded-2xl border-2 p-5 text-center"
            style={{ borderColor: bonusCard.type === "luck" ? LUCK_DECK.find((c) => c.id === bonusCard.id)!.colour : POWER_UPS.find((p) => p.id === bonusCard.id)!.colour, background: "rgba(2,6,23,.9)" }}>
            {bonusCard.type === "luck" ? (() => {
              const card = LUCK_DECK.find((c) => c.id === bonusCard.id)!;
              const needsTarget = ["fairy", "thief", "heart"].includes(card.id);
              return (
                <>
                  <p className="text-5xl">{card.icon}</p>
                  <p className="mt-1 text-2xl font-black" style={{ color: card.colour }}>{card.name}</p>
                  <p className="text-sm text-slate-300">{card.rule}</p>
                  {needsTarget ? (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {a.s.teams.filter((t) => t.id !== me.id).map((t) => (
                        <Btn key={t.id} tone="ghost" size="sm" onClick={() => applyLuck(card.id, t.id)}>
                          <span className="flex items-center gap-2"><Avatar src={t.avatar} name={t.name} size={18} />{t.name}</span>
                        </Btn>
                      ))}
                      {a.s.teams.length < 2 && <Btn tone="amber" size="sm" onClick={() => applyLuck(card.id)}>Apply</Btn>}
                    </div>
                  ) : <Btn className="mt-3" tone="amber" onClick={() => applyLuck(card.id, luckTarget ? String(luckTarget) : undefined)}>Apply the card</Btn>}
                </>
              );
            })() : (() => {
              const pu = POWER_UPS.find((p) => p.id === bonusCard.id)!;
              return (
                <>
                  <p className="text-5xl">{pu.icon}</p>
                  <p className="mt-1 text-2xl font-black" style={{ color: pu.colour }}>{pu.name} earned</p>
                  <p className="text-sm text-slate-300">{pu.rule}</p>
                  <Btn className="mt-3" tone="green" onClick={() => { a.givePower(me.id, pu.id); sfx("powerup"); setBonusShown(false); }}>Add to inventory</Btn>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function MiniLesson({ q, correct }: { q: Question; correct: boolean }) {
  const a = useArena();
  const l = q.lesson;
  const readAll = () => a.say(
    `${l.headline}. Why: ${l.why}. The form: ${l.form.rule}. For example, ${l.form.examples.join(". ")}. Key word: ${l.keyword.word}, ${l.keyword.collocation}. Watch out: ${l.keyword.trap}. ${l.steps.join(". ")}. Now try this: ${l.speakingTask}`,
  );
  return (
    <div className="animate-rise space-y-2">
      <div className={`rounded-2xl border p-4 ${correct ? "border-emerald-400/40 bg-emerald-500/10" : "border-amber-400/40 bg-amber-500/10"}`}>
        <p className="text-lg font-black text-white">{correct ? "✅" : "💡"} {l.headline}</p>
      </div>

      <Block colour="#34d399" title="Why this is right">{l.why}</Block>

      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4">
        <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-rose-300">What the other options reveal</p>
        <ul className="space-y-1 text-sm text-rose-100">
          {l.wrongWhy.map((w, i) => <li key={i}>• {w}</li>)}
        </ul>
      </div>

      <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4">
        <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-sky-300">The form</p>
        <p className="text-sm font-bold text-sky-100">{l.form.rule}</p>
        <ul className="mt-1 space-y-0.5 text-sm text-sky-100/90">{l.form.examples.map((e, i) => <li key={i}>› {e}</li>)}</ul>
      </div>

      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-amber-300">Key word</p>
        <p><b>{l.keyword.word}</b> · <span className="opacity-90">{l.keyword.collocation}</span></p>
        <p className="mt-1 text-amber-200/90">⚠ {l.keyword.trap}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Teach it in {l.steps.length} steps</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">{l.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </div>

      <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
        <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-violet-300">Say it out loud</p>
        <p className="text-sm text-violet-100">🗣 {l.speakingTask}</p>
      </div>

      {l.media.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {l.media.map((m, i) => (
            <figure key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              {m.url && m.type === "image" && <img src={m.url} alt={m.caption} className="h-44 w-full object-cover" />}
              {m.type === "motion" && <div className="sheen h-44 w-full bg-slate-800" />}
              <figcaption className="p-2 text-xs text-slate-300">{m.caption}{m.notice ? <span className="block text-slate-500">{m.notice}</span> : null}</figcaption>
            </figure>
          ))}
        </div>
      )}

      <Btn tone="blue" onClick={readAll}>🔊 Read the whole mini lesson aloud</Btn>
    </div>
  );
}

function Block({ colour, title, children }: { colour: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: `${colour}55`, background: `${colour}14` }}>
      <p className="mb-1 text-[11px] font-black uppercase tracking-widest" style={{ color: colour }}>{title}</p>
      <p className="text-sm text-slate-100">{children}</p>
    </div>
  );
}
