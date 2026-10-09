"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GAMES, GAME_BY_KEY, type GameKey } from "@/content/pack";
import { LUCK_DECK, POWER_UPS } from "@/content/cards";
import { Avatar, Btn, Chip, Modal, Panel } from "@/components/ui";
import { useArena } from "./provider";
import { music, sfx } from "@/lib/audio";
import { listVoices, onVoicesReady, speak, stopSpeaking } from "@/lib/speech";
import PhoneRoomPanel from "./PhoneRoom";
import GridArena from "@/components/games/GridArena";
import PracticeMode from "@/components/games/Practice";
import SpeedReader from "@/components/games/SpeedReader";
import Pictionary from "@/components/games/Pictionary";
import RoundGames from "@/components/games/RoundGames";
import Deduction from "@/components/games/Deduction";
import KeepTalking from "@/components/games/KeepTalking";
import Poker from "@/components/games/Poker";
import DebateArena from "@/components/games/DebateArena";

/**
 * The game on the board.
 *
 * It lives at module scope on purpose. It used to be a `const Surface = () => …`
 * declared inside `Shell`, which makes it a NEW component type on every render —
 * and `Shell` renders once a second, because the provider's clock ticks through the
 * same context. React therefore unmounted and remounted the whole game every second:
 * a card opened on the grid closed itself a moment later and every timer, recording
 * and half-finished answer was thrown away. A stable component identity is what
 * lets the game hold its own state for as long as the tutor needs it.
 */
function GameSurface({ game }: { game: GameKey }) {
  switch (game) {
    case "grid": return <GridArena />;
    case "practice": return <PracticeMode />;
    case "speed": return <SpeedReader />;
    case "pictionary": return <Pictionary />;
    case "alibi": case "spyfall": case "mafia": return <Deduction mode={game} />;
    case "keeptalking": return <KeepTalking />;
    case "poker": return <Poker />;
    case "debate": return <DebateArena />;
    default: return <RoundGames mode={game} />;
  }
}

export default function Shell() {
  const a = useArena();
  const g = GAME_BY_KEY[a.s.activeGame];
  const [guide, setGuide] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [phones, setPhones] = useState(false);
  const [powers, setPowers] = useState(false);
  const [settings, setSettings] = useState(false);
  const [menu, setMenu] = useState(false);
  const [voices, setVoices] = useState<string[]>([]);
  const laser = useRef<HTMLDivElement | null>(null);

  useEffect(() => onVoicesReady(() => setVoices(listVoices().map((v) => v.name))), []);
  useEffect(() => { if (a.s.settings.music) music(g.music); }, [g.music, a.s.settings.music]);

  useEffect(() => {
    if (!a.s.settings.pointerOn) return;
    const move = (e: PointerEvent) => { if (laser.current) { laser.current.style.left = `${e.clientX}px`; laser.current.style.top = `${e.clientY}px`; } };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [a.s.settings.pointerOn]);

  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const board = useMemo(() => [...a.s.teams].sort((x, y) => y.score - x.score), [a.s.teams]);

  const setSetting = <K extends keyof typeof a.s.settings>(k: K, v: (typeof a.s.settings)[K]) =>
    a.set((st) => ({ ...st, settings: { ...st.settings, [k]: v } }));

  return (
    <div className="min-h-screen">
      {a.s.settings.pointerOn && <div ref={laser} className="laser-dot" />}


      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-3 py-2">
          <Btn tone="ghost" size="sm" onClick={() => setMenu(true)}>☰ Menu</Btn>
          <div className="mr-2 flex items-center gap-2">
            <span className="text-xl">{g.emoji}</span>
            <div className="leading-none">
              <p className="text-sm font-black" style={{ color: g.accent }}>{g.name}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">{g.tag}</p>
            </div>
          </div>
          <Btn tone="ghost" size="sm" onClick={() => setGuide(true)}>📖 Guide</Btn>
          <Btn tone="ghost" size="sm" onClick={() => setPowers(true)}>⚡ Power-ups</Btn>
          <Btn tone="ghost" size="sm" onClick={() => setPhones(true)}>📱 Phones{a.s.roomCode ? ` · ${a.s.roomCode}` : ""}</Btn>
          <Btn tone="ghost" size="sm" onClick={() => setSheet(true)}>🧾 Score sheet</Btn>
          <button
            onClick={() => setSetting("autoRead", !a.s.settings.autoRead)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${a.s.settings.autoRead ? "border-emerald-400 bg-emerald-500/15 text-emerald-200" : "border-white/10 bg-white/5 text-slate-300"}`}>
            🔊 Auto-read {a.s.settings.autoRead ? "on" : "off"}
          </button>
          <button
            onClick={() => setSetting("pointerOn", !a.s.settings.pointerOn)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${a.s.settings.pointerOn ? "border-rose-400 bg-rose-500/15 text-rose-200" : "border-white/10 bg-white/5 text-slate-300"}`}>
            🔴 Laser
          </button>
          <select
            value={a.s.settings.narrator ?? ""} onChange={(e) => setSetting("narrator", e.target.value || null)}
            className="rounded-xl border border-white/10 bg-slate-900 px-2 py-1.5 text-xs">
            <option value="">Narrator: default</option>
            {voices.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <Btn tone="ghost" size="sm" onClick={() => { stopSpeaking(); void speak("This is the narrator voice for tonight's game show. Let's play.", { voiceName: a.s.settings.narrator }); }}>Audition</Btn>
          <div className="ml-auto flex items-center gap-2">
            <Chip colour="#22d3ee">⏱ {mmss(a.elapsed)}</Chip>
            <Btn tone="ghost" size="sm" onClick={() => setSettings(true)}>⚙️</Btn>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 px-3 py-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* SIDEBAR */}
        <aside className="space-y-3">
          <Panel title="Whose turn">
            <div className="flex items-center gap-3">
              <Avatar src={a.current?.avatar} name={a.current?.name ?? "—"} size={54} ring={g.accent} />
              <div className="min-w-0">
                <p className="truncate text-lg font-black">{a.current?.name}</p>
                <p className="text-xs text-slate-400">{a.current?.score ?? 0} pts · streak {a.current?.streak ?? 0}🔥</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(a.current?.powers ?? []).map((p, i) => {
                const pu = POWER_UPS.find((x) => x.id === p)!;
                return <span key={i} title={pu.blurb} className="rounded-lg border px-2 py-0.5 text-[11px] font-bold"
                  style={{ borderColor: `${pu.colour}66`, color: pu.colour, background: `${pu.colour}18` }}>{pu.icon} {pu.name}</span>;
              })}
              {!a.current?.powers.length && <span className="text-[11px] text-slate-500">No power-ups held.</span>}
            </div>
            <Btn className="mt-3 w-full" tone="ghost" size="sm" onClick={() => { a.nextTurn(); sfx("whoosh"); }}>Pass turn →</Btn>
          </Panel>

          <Panel title="Leaderboard">
            <ol className="space-y-1.5">
              {board.map((t, i) => (
                <li key={t.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1"
                  style={{ background: t.id === a.current?.id ? "rgba(245,158,11,.12)" : undefined }}>
                  <span className="w-4 text-center text-[11px] font-black text-slate-500">{i + 1}</span>
                  <Avatar src={t.avatar} name={t.name} size={26} />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">{t.name}</span>
                  <span className="text-xs font-black tabular-nums" style={{ color: t.score < 0 ? "#fb7185" : "#fbbf24" }}>{t.score}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Who holds what">
            <ul className="space-y-1">
              {a.s.teams.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-[11px]">
                  <Avatar src={t.avatar} name={t.name} size={20} />
                  <span className="w-16 shrink-0 truncate font-bold text-slate-300">{t.name}</span>
                  <span className="flex flex-wrap gap-1">
                    {t.powers.length
                      ? t.powers.map((p, i) => <span key={i} title={p}>{POWER_UPS.find((x) => x.id === p)?.icon}</span>)
                      : <span className="text-slate-600">—</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>

        {/* GAME SURFACE */}
        <main className="min-h-[70vh] rounded-3xl border border-white/10 bg-slate-950/40 p-3 grid-bg">
          <GameSurface game={a.s.activeGame} />
        </main>
      </div>

      {/* MENU */}
      <Modal open={menu} onClose={() => setMenu(false)} title="Switch game" wide>
        <div className="grid gap-2 sm:grid-cols-3">
          {GAMES.map((x) => (
            <button key={x.key} onClick={() => { a.setGame(x.key as GameKey); setMenu(false); sfx("whoosh"); }}
              className={`rounded-2xl border p-3 text-left transition ${a.s.activeGame === x.key ? "border-amber-400 bg-amber-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
              <p className="text-sm font-black" style={{ color: x.accent }}>{x.emoji} {x.name}</p>
              <p className="text-[11px] text-slate-400">{x.tag}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Link href="/" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10">← Back to setup</Link>
          <Link href="/discuss" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10">Discussion library</Link>
        </div>
      </Modal>

      {/* GUIDE */}
      <Modal open={guide} onClose={() => setGuide(false)} title={`Guide — ${g.name}`}>
        <p className="mb-3 text-sm text-slate-300">{g.blurb}</p>
        <ol className="space-y-2">
          {g.guide.map((line, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <span className="font-black" style={{ color: g.accent }}>{i + 1}</span><span>{line}</span>
            </li>
          ))}
        </ol>
        <Btn className="mt-4" tone="blue" onClick={() => a.say(`${g.name}. ${g.blurb} ${g.guide.join(" ")}`)}>🔊 Read this guide aloud</Btn>
      </Modal>

      {/* POWER-UPS */}
      <Modal open={powers} onClose={() => setPowers(false)} title="Power-ups in play" wide>
        <div className="grid gap-2 sm:grid-cols-2">
          {POWER_UPS.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-sm font-black" style={{ color: p.colour }}>{p.icon} {p.name}</p>
              <p className="text-xs text-slate-300">{p.blurb}</p>
              <p className="text-[11px] text-slate-500">{p.rule}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {a.s.teams.map((t) => (
                  <button key={t.id} onClick={() => { a.givePower(t.id, p.id); sfx("powerup"); }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] hover:bg-white/15">grant → {t.name}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* PHONES */}
      <Modal open={phones} onClose={() => setPhones(false)} title="Play on phones" wide>
        <PhoneRoomPanel />
      </Modal>

      {/* SETTINGS */}
      <Modal open={settings} onClose={() => setSettings(false)} title="Board settings">
        <div className="space-y-4 text-sm">
          <label className="flex items-center justify-between gap-3">
            <span>Soundtrack</span>
            <input type="checkbox" checked={a.s.settings.music} onChange={(e) => setSetting("music", e.target.checked)} className="h-5 w-5" />
          </label>
          <label className="block">Music volume
            <input type="range" min={0} max={1} step={0.02} value={a.s.settings.musicVol}
              onChange={(e) => setSetting("musicVol", Number(e.target.value))} className="w-full" />
          </label>
          <label className="block">Effects volume
            <input type="range" min={0} max={1} step={0.02} value={a.s.settings.sfxVol}
              onChange={(e) => setSetting("sfxVol", Number(e.target.value))} className="w-full" />
          </label>
          <label className="block">Question timer: <b>{a.s.settings.timer}s</b>
            <input type="range" min={15} max={120} step={5} value={a.s.settings.timer}
              onChange={(e) => setSetting("timer", Number(e.target.value))} className="w-full" />
          </label>
          <div>
            <p className="mb-1 font-bold">Hidden-role difficulty</p>
            <div className="flex gap-2">
              {(["easy", "standard", "brutal"] as const).map((d) => (
                <Btn key={d} tone={a.s.settings.mafia === d ? "amber" : "ghost"} size="sm" onClick={() => setSetting("mafia", d)}>{d}</Btn>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 font-bold">Luck deck ({LUCK_DECK.filter((c) => a.s.settings.luck[c.id]).length}/17 live)</p>
            <div className="flex flex-wrap gap-1">
              {LUCK_DECK.map((c) => (
                <button key={c.id} onClick={() => setSetting("luck", { ...a.s.settings.luck, [c.id]: !a.s.settings.luck[c.id] })}
                  className={`rounded-lg border px-2 py-1 text-xs ${a.s.settings.luck[c.id] ? "border-white/25 bg-white/10" : "border-white/5 bg-black/30 opacity-40"}`}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* SCORE SHEET + TEACHING PLAN */}
      <ScoreSheet open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}

function ScoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const a = useArena();
  const rows = a.events.filter((e) => typeof e.correct === "boolean");
  const misses = rows.filter((e) => e.correct === false);

  const byPoint = useMemo(() => {
    const m = new Map<string, { miss: number; total: number }>();
    rows.forEach((e) => {
      const k = e.grammarPoint || e.skill || "General";
      const cur = m.get(k) ?? { miss: 0, total: 0 };
      cur.total++; if (e.correct === false) cur.miss++;
      m.set(k, cur);
    });
    return [...m.entries()].sort((x, y) => y[1].miss - x[1].miss);
  }, [rows]);

  const bySkill = useMemo(() => {
    const m = new Map<string, { miss: number; total: number }>();
    rows.forEach((e) => {
      const k = (e.skill || "General").split("·")[0].trim();
      const cur = m.get(k) ?? { miss: 0, total: 0 };
      cur.total++; if (e.correct === false) cur.miss++;
      m.set(k, cur);
    });
    return [...m.entries()].sort((x, y) => y[1].miss / Math.max(1, y[1].total) - x[1].miss / Math.max(1, x[1].total));
  }, [rows]);

  const weakest = bySkill[0]?.[0] ?? "—";

  const drill = useMemo(() => {
    const lines = byPoint.filter(([, v]) => v.miss > 0).slice(0, 6)
      .map(([k, v]) => `• ${k} — missed ${v.miss}/${v.total}. Drill: 3 quick transformations + 1 personalised sentence each.`);
    return [`Next lesson drill — ${a.s.packTitle}`, `Weakest sub-skill: ${weakest}`, ...lines,
      "", "Warm-up: re-ask the missed cards as a 12-tile mini board (Practice Mode → Missed only).",
      "Production: 4-minute pair task using the target structures above."].join("\n");
  }, [byPoint, weakest, a.s.packTitle]);

  const reAsk = () => {
    const missedCells = new Set(misses.map((m) => m.cell).filter(Boolean) as number[]);
    a.set((st) => ({ ...st, activeGame: "grid", cells: st.cells.map((c) => (missedCells.has(c.cell) ? { ...c, done: false, correct: undefined } : { ...c, done: true })) }));
    sfx("reveal"); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Score sheet & teaching plan" wide>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Answers" value={String(rows.length)} />
        <Stat label="Correct" value={String(rows.filter((r) => r.correct).length)} tone="#34d399" />
        <Stat label="Missed" value={String(misses.length)} tone="#fb7185" />
        <Stat label="Weakest sub-skill" value={weakest} tone="#f59e0b" />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-slate-400">
            <tr><th className="p-2">Cell</th><th className="p-2">Team</th><th className="p-2">Skill</th><th className="p-2">Point</th><th className="p-2">Time</th><th className="p-2">Worth</th><th className="p-2">Result</th></tr>
          </thead>
          <tbody>
            {rows.slice().reverse().map((r, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="p-2 font-black text-slate-300">{r.cell ?? "—"}</td>
                <td className="p-2">{r.teamName}</td>
                <td className="p-2 text-slate-400">{r.skill}</td>
                <td className="p-2 text-slate-400">{r.grammarPoint}</td>
                <td className="p-2 tabular-nums">{r.seconds ?? 0}s</td>
                <td className="p-2 tabular-nums">{r.points ?? 0}</td>
                <td className="p-2 font-bold" style={{ color: r.correct ? "#34d399" : "#fb7185" }}>{r.correct ? "correct" : "missed"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td className="p-4 text-slate-500" colSpan={7}>No graded answers yet — play a few tiles.</td></tr>}
          </tbody>
        </table>
      </div>

      <h3 className="mt-5 text-sm font-black uppercase tracking-widest text-amber-300">Teaching plan</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Misses by grammar point</p>
          <ul className="space-y-1 text-xs">
            {byPoint.filter(([, v]) => v.miss).map(([k, v]) => <li key={k}>• <b>{k}</b> — {v.miss}/{v.total}</li>)}
            {!byPoint.some(([, v]) => v.miss) && <li className="text-slate-500">Nothing missed yet.</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Misses by skill</p>
          <ul className="space-y-1 text-xs">
            {bySkill.map(([k, v]) => <li key={k}>• <b>{k}</b> — {v.miss}/{v.total}</li>)}
            {!bySkill.length && <li className="text-slate-500">No data yet.</li>}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Btn tone="amber" onClick={reAsk} disabled={!misses.length}>↻ Re-ask only the missed cards</Btn>
        <Btn tone="blue" onClick={() => a.say(`Let's look at what we missed. ${byPoint.filter(([, v]) => v.miss).slice(0, 4).map(([k, v]) => `${k}, missed ${v.miss} times.`).join(" ")}`)}>🔊 Teach this aloud</Btn>
        <Btn tone="ghost" onClick={() => { navigator.clipboard?.writeText(drill); sfx("correct"); }}>📋 Copy next-lesson drill</Btn>
      </div>
    </Modal>
  );
}

function Stat({ label, value, tone = "#38bdf8" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="truncate text-xl font-black" style={{ color: tone }}>{value}</p>
    </div>
  );
}
