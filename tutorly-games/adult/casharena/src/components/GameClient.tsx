"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataConnection } from "peerjs";
import type { AttackType, HostMessage, PlayerPublic, Question, Quiz } from "@/lib/types";
import { initialEcon, resolveAnswer, type EconState, type PowerDef, POWER_MAP, type PowerKey, fmtCash, perCorrect, ATTACKS } from "@/lib/engine";
import { sfx, startMusic, stopMusic, isMusicOn, unlockAudio, stopSpeech, speak } from "@/lib/audio";
import { QuestionView, shuffleIdx } from "./QuestionView";
import { CashRain, FloatingDelta, RollingCash } from "./Cash";
import { PowerCard, PowerDropModal } from "./PowerUpCard";
import { Shop } from "./Shop";
import { Leaderboard } from "./Leaderboard";
import { sendClient } from "@/lib/peer";

interface Props {
  quiz: Quiz;
  me: { id: string; name: string; avatar: string };
  conn?: DataConnection | null;
  players?: PlayerPublic[];
  durationSec: number;
  startedAt: number;
  ended?: boolean;
  onFinish: (econ: EconState) => void;
}

export function GameClient({ quiz, me, conn, players = [], durationSec, startedAt, ended, onFinish }: Props) {
  const [econ, setEcon] = useState<EconState>(initialEcon);
  const econRef = useRef(econ);
  econRef.current = econ;

  const [round, setRound] = useState(0);
  const [qi, setQi] = useState(0);
  const order = useMemo(() => shuffleIdx(quiz.questions.length, 1000 + round * 7 + me.id.length), [quiz.questions.length, round, me.id.length]);
  const q: Question = quiz.questions[order[qi % order.length]];
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000));

  const [locked, setLocked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [floats, setFloats] = useState<{ id: number; text: string; positive: boolean }[]>([]);
  const [rain, setRain] = useState(0);
  const [bigRain, setBigRain] = useState(false);
  const [drop, setDrop] = useState<PowerDef | null>(null);
  const [shop, setShop] = useState(false);
  const [board, setBoard] = useState(false);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [music, setMusic] = useState(false);
  const [shakeIt, setShakeIt] = useState(false);

  // timers
  const qLimit = q.timeLimit ?? (["reading", "listening", "dialogue"].includes(q.type) ? 40 : 20);
  const [qTime, setQTime] = useState(qLimit);
  const [frozen, setFrozen] = useState(false);
  const [slow, setSlow] = useState(false);
  const [now, setNow] = useState(Date.now());
  const gameLeft = Math.max(0, Math.round((startedAt + durationSec * 1000 - now) / 1000));
  const over = ended || gameLeft <= 0;
  const finishedRef = useRef(false);

  // attacks
  const [blackout, setBlackout] = useState<string | null>(null);
  const [fog, setFog] = useState(false);

  useEffect(() => { unlockAudio(); setMusic(isMusicOn()); }, []);

  // global clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // question timer
  useEffect(() => { setQTime(qLimit); }, [q.id, qLimit]);
  useEffect(() => {
    if (locked || frozen || over || shop || drop) return;
    const t = setInterval(() => {
      setQTime((s) => {
        const n = s - (slow ? 2 : 1);
        if (n <= 5 && n > 0) sfx.urgent();
        return n;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [locked, frozen, over, shop, drop, slow, q.id]);

  const pushFloat = (text: string, positive: boolean) => {
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, text, positive }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1300);
  };
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2600); };

  const sendProgress = useCallback((s: EconState, finished = false) => {
    if (!conn) return;
    sendClient(conn, { t: "progress", p: { cash: s.cash, streak: s.streak, correct: s.correct, wrong: s.wrong, answered: s.answered, finished, wrongIds: s.wrongIds } });
  }, [conn]);

  const next = useCallback(() => {
    setLocked(false); setRevealed(false); setFeedback(null); setEliminated([]); setHint(null); setFrozen(false); setSlow(false);
    setSeed(Math.floor(Math.random() * 100000));
    if (qi + 1 >= order.length) { setRound((r) => r + 1); setQi(0); } else setQi((i) => i + 1);
  }, [qi, order.length]);

  const answer = useCallback((correct: boolean) => {
    if (locked) return;
    stopSpeech();
    const res = resolveAnswer(econRef.current, correct, q.id);
    if (res.retry) { setEcon(res.state); say(res.message); sfx.shield(); return; }
    setLocked(true); setRevealed(true);
    setEcon(res.state);
    sendProgress(res.state);
    if (correct) {
      if (res.delta >= 1000) { sfx.bigCash(); setBigRain(true); } else { sfx.cash(); setBigRain(false); }
      sfx.correct();
      setRain((r) => r + 1);
      pushFloat(`+${fmtCash(res.delta)}`, true);
      if (res.state.streak >= 3 && res.state.streak % 3 === 0) sfx.streak();
    } else {
      sfx.wrong(); setShakeIt(true); setTimeout(() => setShakeIt(false), 500);
      if (res.delta < 0) pushFloat(`-${fmtCash(-res.delta)}`, false);
    }
    setFeedback({ text: res.message, ok: correct });
    const delay = correct ? 1400 : 2000;
    setTimeout(() => {
      if (res.dropped) {
        if (res.dropped.rarity === "legendary") sfx.legendary(); else sfx.powerup();
        setDrop(res.dropped);
      } else next();
    }, delay);
  }, [locked, q.id, next, sendProgress]);

  // time out
  useEffect(() => {
    if (qTime <= 0 && !locked && !over) answer(false);
  }, [qTime, locked, over, answer]);

  // finish
  useEffect(() => {
    if (over && !finishedRef.current) {
      finishedRef.current = true;
      stopSpeech();
      sendProgress(econRef.current, true);
      sfx.fanfare();
      onFinish(econRef.current);
    }
  }, [over, onFinish, sendProgress]);

  // incoming attacks from host
  useEffect(() => {
    if (!conn) return;
    const handler = (raw: unknown) => {
      const m = raw as HostMessage;
      if (m.t !== "attack") return;
      const s = econRef.current;
      if (s.buffs.reflector) {
        setEcon({ ...s, buffs: { ...s.buffs, reflector: false } });
        sfx.shield(); say(`🪞 Reflected ${m.type} back to ${m.from}!`);
        sendClient(conn, { t: "attack", type: m.type, targetId: "random", amount: m.amount });
        return;
      }
      sfx.attack();
      if (m.type === "blackout") { setBlackout(m.from); setTimeout(() => setBlackout(null), 6000); }
      if (m.type === "fog") { setFog(true); setTimeout(() => setFog(false), 8000); }
      if (m.type === "scramble") { setEcon((e) => ({ ...e, buffs: { ...e.buffs, scrambled: 2 } })); setSeed(Math.floor(Math.random() * 1e5)); say(`🌀 ${m.from} scrambled your options!`); }
      if (m.type === "slowmo") { setSlow(true); say(`🐌 ${m.from} sped up your clock!`); }
      if (m.type === "drain") {
        const amt = Math.round(econRef.current.cash * ((m.amount ?? 8) / 100));
        setEcon((e) => ({ ...e, cash: Math.max(0, e.cash - amt) }));
        pushFloat(`-${fmtCash(amt)}`, false);
        say(`🧲 ${m.from} drained ${fmtCash(amt)} from you!`);
        sendClient(conn, { t: "drainResult", targetId: m.from, amount: amt });
      }
    };
    conn.on("data", handler);
    return () => { conn.off("data", handler); };
  }, [conn]);

  // scramble buff re-seeds each question
  useEffect(() => { if (econ.buffs.scrambled > 0) setSeed(Math.floor(Math.random() * 1e5)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q.id]);

  const leader = useMemo(() => [...players].filter((p) => p.id !== me.id).sort((a, b) => b.cash - a.cash)[0], [players, me.id]);

  const usePower = (key: PowerKey) => {
    const s = econRef.current;
    const idx = s.inventory.indexOf(key);
    if (idx < 0) return;
    const inv = [...s.inventory]; inv.splice(idx, 1);
    const n: EconState = { ...s, inventory: inv, buffs: { ...s.buffs } };
    const def = POWER_MAP[key];
    sfx.powerup();
    switch (key) {
      case "double_jeopardy": n.buffs.doubleJeopardy = true; break;
      case "mega_shield": n.buffs.shieldCharges += 2; break;
      case "streak_saver": n.buffs.streakSaver = true; break;
      case "second_chance": n.buffs.secondChance = true; break;
      case "golden_question": n.buffs.golden = true; break;
      case "combo_burst": n.buffs.comboBurst = 3; break;
      case "reflector": n.buffs.reflector = true; break;
      case "time_freeze": setFrozen(true); break;
      case "time_warp": setQTime((t) => t + 15); break;
      case "fifty_fifty": {
        const wrongs = q.options.map((_, i) => i).filter((i) => !q.correct.includes(i));
        const remove = wrongs.sort(() => Math.random() - 0.5).slice(0, Math.max(1, Math.floor(wrongs.length / 2)));
        setEliminated(remove); break;
      }
      case "insight": setHint(q.explanation.tip || q.explanation.meaning); break;
      case "cash_magnet": { const amt = Math.round(n.cash * 0.15); n.cash += amt; pushFloat(`+${fmtCash(amt)}`, true); setRain((r) => r + 1); sfx.cash(); break; }
      case "lucky_spin": { sfx.slot(); const amt = Math.max(50, Math.round(n.cash * Math.random() * 0.3)); n.cash += amt; pushFloat(`+${fmtCash(amt)}`, true); setRain((r) => r + 1); break; }
      case "jackpot": { const amt = perCorrect(n) * 10; n.cash += amt; pushFloat(`+${fmtCash(amt)}`, true); setRain((r) => r + 1); setBigRain(true); sfx.bigCash(); break; }
      case "heist": {
        if (conn && leader) { sendClient(conn, { t: "attack", type: "drain", targetId: leader.id, amount: 5 }); say(`🕶️ Heist launched on ${leader.name}!`); }
        else { const amt = 100; n.cash += amt; pushFloat(`+${fmtCash(amt)}`, true); say("No rivals to rob — pocketed $100 instead."); }
        break;
      }
    }
    if (!def.instant) say(`${def.icon} ${def.name} armed!`);
    setEcon(n);
    sendProgress(n);
  };

  // drain results credited to me (host relays)
  useEffect(() => {
    if (!conn) return;
    const h = (raw: unknown) => {
      const m = raw as { t: string; amount?: number; from?: string };
      if (m.t === "credit" && m.amount) {
        setEcon((e) => ({ ...e, cash: e.cash + m.amount! }));
        pushFloat(`+${fmtCash(m.amount)}`, true); setRain((r) => r + 1); sfx.cash();
        say(`🧲 You stole ${fmtCash(m.amount)} from ${m.from}!`);
      }
    };
    conn.on("data", h);
    return () => { conn.off("data", h); };
  }, [conn]);

  const launchAttack = (type: AttackType, cost: number) => {
    if (!conn) return;
    const def = ATTACKS.find((a) => a.type === type)!;
    setEcon((e) => ({ ...e, cash: e.cash - cost }));
    sendClient(conn, { t: "attack", type, targetId: def.target });
    say(`${def.icon} ${def.name} launched!`);
    setShop(false);
  };

  const invCounts = useMemo(() => {
    const m = new Map<PowerKey, number>();
    econ.inventory.forEach((k) => m.set(k, (m.get(k) || 0) + 1));
    return [...m.entries()];
  }, [econ.inventory]);

  const mm = Math.floor(gameLeft / 60), ss = String(gameLeft % 60).padStart(2, "0");
  const pct = Math.max(0, (qTime / qLimit) * 100);
  const myRank = [...players].sort((a, b) => b.cash - a.cash).findIndex((p) => p.id === me.id) + 1;

  return (
    <div className={`min-h-dvh flex flex-col ${shakeIt ? "anim-shake" : ""}`}>
      <CashRain trigger={rain} big={bigRain} />
      <FloatingDelta items={floats} />

      {/* HUD */}
      <header className="glass sticky top-0 z-40 rounded-b-3xl px-3 py-2 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => { sfx.click(); setShop(true); }} className="btn btn-gold !px-3 !py-2 anim-glow">🛒 <span className="hidden sm:inline">SHOP</span></button>
            {players.length > 1 && (
              <button onClick={() => { sfx.click(); setBoard(true); }} className="btn btn-ghost !px-3 !py-2">🏆 <span className="hidden sm:inline">#{myRank || "-"}</span></button>
            )}
            <button onClick={() => { const on = !music; if (on) startMusic(); else stopMusic(); setMusic(on); }} className="btn btn-ghost !px-3 !py-2" title="Music">{music ? "🎵" : "🔇"}</button>
          </div>
          <div className="text-center leading-none">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-white/50">Wallet</div>
            <RollingCash value={econ.cash} className="text-3xl sm:text-5xl" />
          </div>
          <div className="text-right leading-tight">
            <div className={`font-black text-2xl sm:text-3xl tabular-nums ${gameLeft < 30 ? "text-rose-400 anim-flicker" : ""}`}>{mm}:{ss}</div>
            <div className="text-xs text-white/60">{econ.streak >= 2 ? `🔥 ${econ.streak}` : "streak 0"} · {fmtCash(perCorrect(econ))}/✓</div>
          </div>
        </div>
        {/* buffs */}
        <div className="mt-1 flex flex-wrap gap-1 text-xs font-bold">
          {econ.buffs.doubleJeopardy && <span className="rounded-full bg-fuchsia-600 px-2 py-0.5">🎲 2× risk</span>}
          {econ.buffs.shieldCharges > 0 && <span className="rounded-full bg-sky-600 px-2 py-0.5">🛡️ ×{econ.buffs.shieldCharges}</span>}
          {econ.buffs.streakSaver && <span className="rounded-full bg-orange-600 px-2 py-0.5">🔥 saver</span>}
          {econ.buffs.secondChance && <span className="rounded-full bg-teal-600 px-2 py-0.5">🔁 retry</span>}
          {econ.buffs.golden && <span className="rounded-full bg-amber-500 text-black px-2 py-0.5">👑 5×</span>}
          {econ.buffs.comboBurst > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5">💥 +50% ×{econ.buffs.comboBurst}</span>}
          {econ.buffs.reflector && <span className="rounded-full bg-emerald-600 px-2 py-0.5">🪞 reflect</span>}
          {frozen && <span className="rounded-full bg-cyan-500 text-black px-2 py-0.5">❄️ frozen</span>}
          {slow && <span className="rounded-full bg-rose-700 px-2 py-0.5">🐌 2× clock</span>}
        </div>
      </header>

      {/* question timer */}
      <div className="mx-3 mt-3 h-4 overflow-hidden rounded-full bg-white/10 sm:mx-6">
        <div className={`timer-bar h-full rounded-full ${frozen ? "bg-cyan-300" : pct > 50 ? "bg-emerald-400" : pct > 25 ? "bg-amber-400" : "bg-rose-500"}`} style={{ width: `${pct}%` }} />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6">
        <div className="mb-2 flex items-center justify-between text-sm text-white/60">
          <span>Question {econ.answered + 1} · {q.type === "multi" ? "multi-select" : `${qTime}s`}</span>
          <span>✅ {econ.correct} · ❌ {econ.wrong}</span>
        </div>
        <QuestionView q={q} seed={seed} onAnswer={(ok) => answer(ok)} locked={locked || over} revealed={revealed} eliminated={eliminated} hint={hint} fog={fog} />

        {feedback && (
          <div className={`mt-4 rounded-2xl p-4 text-center text-2xl font-black anim-pop ${feedback.ok ? "bg-emerald-500/25 text-emerald-200" : "bg-rose-500/25 text-rose-200"}`}>
            {feedback.text}
            {!feedback.ok && <div className="mt-1 text-base font-semibold text-white/80">💡 {q.explanation.tip || q.explanation.meaning}</div>}
          </div>
        )}
      </main>

      {/* inventory dock */}
      <footer className="glass sticky bottom-0 z-40 rounded-t-3xl px-3 py-2 sm:px-6">
        <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-widest text-white/50">
          <span>Power-ups · next drop in {3 - econ.sinceDrop} ✓</span>
          <span>{econ.inventory.length} held</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {invCounts.length === 0 && <div className="text-sm text-white/50 py-2">Answer 3 in a row correctly to earn a power-up card, or buy a Mystery Box.</div>}
          {invCounts.map(([k, c]) => (
            <PowerCard key={k} def={POWER_MAP[k]} size="sm" count={c} onClick={() => usePower(k)} disabled={over} />
          ))}
        </div>
      </footer>

      {toast && <div className="fixed left-1/2 top-24 z-[65] -translate-x-1/2 rounded-2xl bg-black/80 px-5 py-3 text-lg font-black anim-slide border border-white/20">{toast}</div>}

      {drop && <PowerDropModal def={drop} onClose={() => { setDrop(null); next(); }} />}
      {shop && (
        <Shop econ={econ} onChange={(s) => { setEcon(s); sendProgress(s); }} onAttack={launchAttack} onMystery={(d) => { setShop(false); setDrop(d); }} onClose={() => setShop(false)} multiplayer={!!conn && players.length > 1} />
      )}
      {board && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setBoard(false)}>
          <div className="glass w-full max-w-2xl rounded-3xl p-5 max-h-[85dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-2xl font-black gold-text mb-3">🏆 Live Leaderboard</div>
            <Leaderboard players={players} meId={me.id} />
            <button className="btn btn-primary w-full mt-4" onClick={() => setBoard(false)}>Close</button>
          </div>
        </div>
      )}
      {blackout && (
        <div className="blackout">
          <div className="text-center anim-fade">
            <div className="text-7xl">🌑</div>
            <div className="mt-3 text-3xl font-black text-white">BLACKOUT!</div>
            <div className="text-white/60 text-lg">{blackout} hit you · 6 seconds</div>
            <button onClick={() => speak("Blackout. Your screen is dark for six seconds.", "male")} className="mt-3 text-sm text-white/40">🔊</button>
          </div>
        </div>
      )}
    </div>
  );
}
