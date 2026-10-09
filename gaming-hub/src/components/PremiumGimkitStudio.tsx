import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { SuitePlayersTab, type Player } from "./SuitePlayersTab";
import { SuiteLeaderboard } from "./SuiteLeaderboard";
import { SuitePromptTab } from "./SuitePromptTab";
import { Logic } from "./gimkit/Logic";
import { GimkitStudySection } from "./gimkit/GimkitStudySection";
import { GimkitSlideSection } from "./gimkit/GimkitSlideSection";
import {
  GIMKIT_POWERUPS,
  GIMKIT_PROMPT,
  GIMKIT_UPGRADES,
  SAMPLE_GIMKIT_PAYLOAD,
  type GimkitModeId,
  type GimkitPayload,
  type GimkitPowerup,
  type GimkitQuestion,
  type GimkitUpgrade,
} from "../data/gimkitModes";

interface Props {
  onBack: () => void;
}

type Tab = "game" | "players" | "study" | "slides" | "prompt" | "logic";

interface PlayerState {
  cash: number;
  upgradeLevels: Record<GimkitUpgrade["id"], number>;
  faction: "human" | "zombie" | null;
  isBot: boolean;
  status: { frozen?: number; fogged?: number; shielded?: boolean };
  lastFloat?: { delta: number; key: number };
}

const MODE_INFO: { id: GimkitModeId; name: string; emoji: string; tagline: string; bg: string; accent: string }[] = [
  { id: "classic",            name: "Classic",            emoji: "💰", tagline: "Solo cash race — top net worth wins.",                bg: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1600", accent: "from-emerald-500 to-cyan-700" },
  { id: "team",               name: "Team Mode",          emoji: "🤝", tagline: "Cash flows into a unified team treasury.",            bg: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600", accent: "from-blue-500 to-indigo-700" },
  { id: "trust",              name: "Trust No One",       emoji: "🕵️", tagline: "Social deduction with a hidden traitor!",            bg: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600", accent: "from-purple-500 to-rose-700" },
  { id: "humans-vs-zombies",  name: "Humans vs Zombies",  emoji: "🧟", tagline: "Repair the barrier or break it down before time!",   bg: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1600", accent: "from-rose-700 to-emerald-900" },
];

function makePlayerState(isBot = false): PlayerState {
  return {
    cash: 0,
    upgradeLevels: { income: 1, streak: 1, multiplier: 1, insurance: 1 },
    faction: null,
    isBot,
    status: {},
  };
}

export function PremiumGimkitStudio({ onBack }: Props) {
  const { catSay, sfx } = useApp();
  const [tab, setTab] = useState<Tab>("game");
  const [mode, setMode] = useState<GimkitModeId>("classic");
  const [payload, setPayload] = useState<GimkitPayload>(SAMPLE_GIMKIT_PAYLOAD);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(SAMPLE_GIMKIT_PAYLOAD, null, 2));
  const [error, setError] = useState("");
  const [maximized, setMaximized] = useState(false);
  const arenaRef = useRef<HTMLDivElement | null>(null);

  // Players (human + bot)
  const [players, setPlayers] = useState<Player[]>(() => [
    { id: "p1", name: "You",           avatar: "🧙‍♀️", score: 0, streak: 0, wrongStreak: 0 },
    { id: "p2", name: "Vex the Vamp",  avatar: "🧛‍♂️", score: 0, streak: 0, wrongStreak: 0 },
    { id: "p3", name: "Mira Mage",     avatar: "🧚",   score: 0, streak: 0, wrongStreak: 0 },
    { id: "p4", name: "Zog Zombie",    avatar: "🧟‍♀️", score: 0, streak: 0, wrongStreak: 0 },
  ]);
  const [playerStates, setPlayerStates] = useState<Record<string, PlayerState>>({
    p1: makePlayerState(false),
    p2: makePlayerState(true),
    p3: makePlayerState(true),
    p4: makePlayerState(true),
  });

  const [activeId, setActiveId] = useState("p1");
  const [qIndex, setQIndex] = useState(0);
  const [activeQ, setActiveQ] = useState<GimkitQuestion>(SAMPLE_GIMKIT_PAYLOAD.questions[0]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [locked, setLocked] = useState<boolean | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopTab, setShopTab] = useState<"upgrades" | "powerups">("upgrades");

  // Effects state
  const [globalIce, setGlobalIce] = useState(0);
  const [globalFog, setGlobalFog] = useState(0);
  const [floatingCash, setFloatingCash] = useState<{ key: number; amount: number; ok: boolean }[]>([]);

  // Game timer & end state
  const [gameTime, setGameTime] = useState(180);
  const [winner, setWinner] = useState<string | null>(null);

  // Humans vs Zombies state
  const [barrierHP, setBarrierHP] = useState(100);
  const [hzLog, setHzLog] = useState<{ key: number; text: string; type: "attack" | "repair" }[]>([]);
  const [zombieMarchOffset, setZombieMarchOffset] = useState(70);

  // Trust No One
  const [traitorId] = useState("p3");
  const [accusations, setAccusations] = useState<string[]>([]);

  const activePlayer = useMemo(() => players.find(p => p.id === activeId)!, [players, activeId]);
  const activeState = playerStates[activeId];

  useEffect(() => { catSay("Gimkit Suite live. Answer questions, earn cash, buy upgrades, dominate!", "😻"); /* eslint-disable-next-line */ }, []);

  // Auto-assign factions when entering Humans vs Zombies
  useEffect(() => {
    if (mode === "humans-vs-zombies") {
      setPlayerStates(prev => {
        const next = { ...prev };
        players.forEach((p, i) => {
          next[p.id] = { ...next[p.id], faction: i % 2 === 0 ? "human" : "zombie" };
        });
        return next;
      });
      setBarrierHP(100);
      setHzLog([]);
      setZombieMarchOffset(70);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, players.length]);

  // Game timer
  useEffect(() => {
    if (winner || gameTime <= 0) return;
    const id = setInterval(() => setGameTime(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [winner, gameTime]);

  // Win condition
  useEffect(() => {
    if (gameTime === 0 && !winner) {
      if (mode === "humans-vs-zombies") {
        setWinner(barrierHP > 0 ? "🧑 Humans Survive!" : "🧟 Zombies Win!");
      } else if (mode === "team") {
        const total = players.reduce((s, p) => s + (playerStates[p.id]?.cash ?? 0), 0);
        setWinner(`🤝 Team Total: $${total.toLocaleString()}`);
      } else {
        const top = [...players].sort((a, b) => (playerStates[b.id]?.cash ?? 0) - (playerStates[a.id]?.cash ?? 0))[0];
        setWinner(`🏆 ${top.name} wins with $${(playerStates[top.id]?.cash ?? 0).toLocaleString()}!`);
      }
      sfx.play("cash");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameTime, mode, barrierHP]);

  // Zombie march for Humans vs Zombies
  useEffect(() => {
    if (mode !== "humans-vs-zombies") return;
    const id = setInterval(() => setZombieMarchOffset(o => Math.max(20, o - 0.5 + (100 - barrierHP) / 50)), 200);
    return () => clearInterval(id);
  }, [mode, barrierHP]);

  // Bot AI loop — simulate other players answering
  useEffect(() => {
    if (winner) return;
    const id = setInterval(() => {
      players.forEach(p => {
        if (p.id === activeId || !playerStates[p.id]?.isBot) return;
        const s = playerStates[p.id];
        if (s.status.frozen && s.status.frozen > 0) return;
        const correct = Math.random() < 0.65;
        const q = payload.questions[Math.floor(Math.random() * payload.questions.length)];
        if (correct) {
          const earn = computeEarnings(q, p, s);
          setPlayerStates(prev => ({ ...prev, [p.id]: { ...prev[p.id], cash: prev[p.id].cash + earn } }));
          setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, score: x.score + Math.floor(earn / 5), streak: x.streak + 1, wrongStreak: 0 } : x));
          if (mode === "humans-vs-zombies") {
            if (s.faction === "zombie") {
              setBarrierHP(h => {
                const next = Math.max(0, h - 5);
                setHzLog(l => [...l.slice(-6), { key: Date.now() + Math.random(), text: `${p.avatar} ${p.name} attacked! −5 HP`, type: "attack" }]);
                return next;
              });
            } else {
              setBarrierHP(h => {
                const next = Math.min(100, h + 5);
                setHzLog(l => [...l.slice(-6), { key: Date.now() + Math.random(), text: `${p.avatar} ${p.name} repaired! +5 HP`, type: "repair" }]);
                return next;
              });
            }
          }
        } else {
          setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, streak: 0, wrongStreak: x.wrongStreak + 1 } : x));
        }
      });
    }, 2200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, playerStates, mode, winner]);

  // Status timers (freeze/fog)
  useEffect(() => {
    const id = setInterval(() => {
      setPlayerStates(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          const s = next[k];
          const status = { ...s.status };
          if (status.frozen && status.frozen > 0) status.frozen -= 1;
          if (status.fogged && status.fogged > 0) status.fogged -= 1;
          next[k] = { ...s, status };
        });
        return next;
      });
      if (globalIce > 0) setGlobalIce(s => s - 1);
      if (globalFog > 0) setGlobalFog(s => s - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [globalIce, globalFog]);

  function computeEarnings(q: GimkitQuestion, player: Player, state: PlayerState) {
    const base = q.points * GIMKIT_UPGRADES[0].baseValue * Math.pow(GIMKIT_UPGRADES[0].valueScale, state.upgradeLevels.income - 1);
    const streakBonus = player.streak * (GIMKIT_UPGRADES[1].baseValue * Math.pow(GIMKIT_UPGRADES[1].valueScale, state.upgradeLevels.streak - 1));
    const multiplier = 1 + (state.upgradeLevels.multiplier - 1) * 0.3;
    return Math.round((base + streakBonus * 5) * multiplier);
  }

  function answer(choice: string) {
    if (locked !== null || winner) return;
    if (activeState?.status.frozen) {
      catSay("You are frozen! Wait for the ice to melt.", "🙀");
      return;
    }
    setSelectedChoice(choice);
    const correct = choice === activeQ.answer;
    setLocked(correct);

    if (correct) {
      const earn = computeEarnings(activeQ, activePlayer, activeState);
      setPlayerStates(prev => ({ ...prev, [activeId]: { ...prev[activeId], cash: prev[activeId].cash + earn } }));
      setPlayers(prev => prev.map(p => p.id === activeId ? { ...p, score: p.score + Math.floor(earn / 5), streak: p.streak + 1, wrongStreak: 0 } : p));
      setFloatingCash(f => [...f, { key: Date.now(), amount: earn, ok: true }]);
      sfx.play("coin");

      if (mode === "humans-vs-zombies") {
        if (activeState.faction === "zombie") {
          setBarrierHP(h => {
            const next = Math.max(0, h - 8);
            setHzLog(l => [...l.slice(-6), { key: Date.now(), text: `🧟 You attacked! −8 HP`, type: "attack" }]);
            return next;
          });
        } else {
          setBarrierHP(h => {
            const next = Math.min(100, h + 8);
            setHzLog(l => [...l.slice(-6), { key: Date.now(), text: `🛠️ You repaired! +8 HP`, type: "repair" }]);
            return next;
          });
        }
      }
      catSay(`Correct! +$${earn}`, "😸");
    } else {
      const insurance = (activeState.upgradeLevels.insurance - 1) * 0.2;
      const penalty = Math.round(activeQ.points * 5 * (1 - Math.min(0.95, insurance)));
      setPlayerStates(prev => ({ ...prev, [activeId]: { ...prev[activeId], cash: Math.max(0, prev[activeId].cash - penalty) } }));
      setPlayers(prev => prev.map(p => p.id === activeId ? { ...p, streak: 0, wrongStreak: p.wrongStreak + 1 } : p));
      setFloatingCash(f => [...f, { key: Date.now(), amount: -penalty, ok: false }]);
      sfx.play("buzz");
      catSay(`Wrong! Lost $${penalty}`, "😿");
    }

    setTimeout(() => {
      const next = (qIndex + 1) % payload.questions.length;
      setQIndex(next);
      setActiveQ(payload.questions[next]);
      setSelectedChoice(null);
      setLocked(null);
    }, 1200);
  }

  function buyUpgrade(up: GimkitUpgrade) {
    const lvl = activeState.upgradeLevels[up.id];
    const cost = Math.round(up.baseCost * Math.pow(up.costScale, lvl - 1));
    if (activeState.cash < cost) {
      catSay("Not enough cash!", "🙀"); sfx.play("buzz"); return;
    }
    setPlayerStates(prev => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        cash: prev[activeId].cash - cost,
        upgradeLevels: { ...prev[activeId].upgradeLevels, [up.id]: lvl + 1 },
      },
    }));
    sfx.play("cash");
    catSay(`${up.name} upgraded to Lv ${lvl + 1}!`, "😻");
  }

  function buyPowerup(pw: GimkitPowerup) {
    if (activeState.cash < pw.cost) { catSay("Not enough cash!", "🙀"); sfx.play("buzz"); return; }
    setPlayerStates(prev => ({ ...prev, [activeId]: { ...prev[activeId], cash: prev[activeId].cash - pw.cost } }));
    sfx.play("unwrap");

    if (pw.id === "snowball") {
      setGlobalIce(8);
      setPlayerStates(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { if (k !== activeId) next[k] = { ...next[k], status: { ...next[k].status, frozen: 8 } }; });
        return next;
      });
      catSay("❄️ Snowball thrown! Rivals frozen!", "😼");
    } else if (pw.id === "fog") {
      setGlobalFog(8);
      catSay("🌫️ Fog deployed! Question text obscured!", "😼");
    } else if (pw.id === "bait") {
      setPlayerStates(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (k !== activeId) {
            next[k] = { ...next[k], cash: Math.max(0, next[k].cash - 50) };
            setFloatingCash(f => [...f, { key: Date.now() + Math.random(), amount: -50, ok: false }]);
          }
        });
        next[activeId] = { ...next[activeId], cash: next[activeId].cash + 50 * (Object.keys(next).length - 1) };
        return next;
      });
      catSay("🪤 Bait sprung! Drained $50 from each rival!", "😼");
    } else if (pw.id === "shield") {
      setPlayerStates(prev => ({ ...prev, [activeId]: { ...prev[activeId], status: { ...prev[activeId].status, shielded: true } } }));
      catSay("🛡️ Shield up! Next attack reflected!", "😻");
    } else if (pw.id === "purify") {
      setPlayerStates(prev => ({ ...prev, [activeId]: { ...prev[activeId], status: {} } }));
      catSay("✨ Status cleansed!", "😺");
    } else if (pw.id === "zombie-strike") {
      setBarrierHP(h => Math.max(0, h - 25));
      setHzLog(l => [...l.slice(-6), { key: Date.now(), text: "🧟 Horde unleashed! −25 HP", type: "attack" }]);
      catSay("🧟 Horde strike! Barrier hit hard!", "😼");
    } else if (pw.id === "barrier-boost") {
      setBarrierHP(h => Math.min(100, h + 30));
      setHzLog(l => [...l.slice(-6), { key: Date.now(), text: "🧱 Barrier reinforced! +30 HP", type: "repair" }]);
      catSay("🧱 Barrier boosted!", "😻");
    }
  }

  function buildJson() {
    try {
      const parsed = JSON.parse(jsonText) as GimkitPayload;
      if (!parsed.questions?.length) throw new Error("questions array must not be empty");
      setPayload(parsed);
      setActiveQ(parsed.questions[0]);
      setQIndex(0);
      setError("");
      sfx.play("open");
      catSay(`Built ${parsed.title}.`, "😸");
      setTab("game");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      sfx.play("buzz");
    }
  }

  function resetGame() {
    setGameTime(180);
    setWinner(null);
    setBarrierHP(100);
    setHzLog([]);
    setPlayerStates(prev => {
      const next: Record<string, PlayerState> = {};
      Object.keys(prev).forEach(k => { next[k] = makePlayerState(prev[k].isBot); });
      return next;
    });
    setPlayers(prev => prev.map(p => ({ ...p, score: 0, streak: 0, wrongStreak: 0 })));
    sfx.play("open");
  }

  // Sync player states when players added/removed
  useEffect(() => {
    setPlayerStates(prev => {
      const next = { ...prev };
      players.forEach(p => { if (!next[p.id]) next[p.id] = makePlayerState(false); });
      Object.keys(next).forEach(k => { if (!players.some(p => p.id === k)) delete next[k]; });
      return next;
    });
  }, [players]);

  async function toggleMaximize() {
    const el = arenaRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      try { await el.requestFullscreen(); setMaximized(true); sfx.play("open"); } catch { setMaximized(true); }
    } else {
      try { await document.exitFullscreen(); } catch { /* */ }
      setMaximized(false);
    }
  }

  useEffect(() => {
    const h = () => setMaximized(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const modeInfo = MODE_INFO.find(m => m.id === mode)!;
  const isHvZ = mode === "humans-vs-zombies";

  return (
    <div className="min-h-screen relative text-white overflow-hidden">
      <div className="fixed inset-0 -z-20">
        <img src={modeInfo.bg} alt="" className="w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-gradient-to-br ${modeInfo.accent} opacity-50`} />
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* Global ice/fog overlays */}
      {globalIce > 0 && <div className="fixed inset-0 z-40 bg-cyan-500/15 backdrop-blur-sm pointer-events-none" />}

      <header className="sticky top-0 z-30 bg-black/55 backdrop-blur-xl border-b border-white/15">
        <div className="w-full px-4 sm:px-8 xl:px-12 py-4 flex items-center gap-3 flex-wrap">
          <button onClick={onBack} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20">← Hub</button>
          <div className="text-5xl glossy-emoji animate-float-slow">{modeInfo.emoji}</div>
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-2xl sm:text-4xl font-black title-shimmer">Gimkit Suite</h1>
            <p className="text-white/70 text-sm">{modeInfo.name} — {modeInfo.tagline}</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={mode} onChange={e => setMode(e.target.value as GimkitModeId)}
              className="bg-black/65 border border-white/30 rounded-xl px-3 py-2 font-bold text-sm">
              {MODE_INFO.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
            </select>
            <button onClick={toggleMaximize} className="px-3 py-2 rounded-xl bg-fuchsia-500 font-black text-sm hover:scale-105 transition">
              {maximized ? "⤢ Exit" : "⤢ Max"}
            </button>
            <button onClick={resetGame} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 font-bold text-sm">↺ Reset</button>
          </div>
        </div>
        <div className="w-full px-4 sm:px-8 xl:px-12 pb-3 flex gap-2 overflow-x-auto">
          {(["game", "players", "study", "slides", "prompt", "logic"] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); sfx.play("click"); }}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition ${tab === t ? "bg-white text-black border-white" : "bg-white/10 border-white/20 hover:bg-white/20"}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="w-full px-4 sm:px-8 xl:px-12 py-6 pb-32">
        {tab === "game" && (
          <div ref={arenaRef} className={`${maximized ? "fixed inset-0 z-50 bg-black p-6 overflow-auto" : ""}`}>
            <div className="grid lg:grid-cols-[2.5fr_1fr] 2xl:grid-cols-[3.5fr_1fr] gap-5">

              {/* LEFT: Question arena + shop */}
              <section className="premium-panel p-4 sm:p-6 relative min-h-[520px] overflow-hidden">
                {/* Top status bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl glossy-emoji animate-float-slow">{activePlayer.avatar}</span>
                    <div>
                      <div className="font-black text-lg flex items-center gap-2">{activePlayer.name}
                        {activePlayer.streak >= 3 && <span className="text-amber-300 animate-bounce">🔥{activePlayer.streak}</span>}
                      </div>
                      <div className="text-xs text-white/60">{isHvZ && (activeState?.faction === "zombie" ? "🧟 ZOMBIE FACTION" : "🧑 HUMAN FACTION")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-black text-emerald-300 animate-cash-pop px-4 py-2 rounded-2xl bg-black/50 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]" key={activeState?.cash}>
                      ${activeState?.cash.toLocaleString() ?? 0}
                    </div>
                    <div className="text-xl font-black text-amber-300 px-4 py-2 rounded-2xl bg-black/50 border border-amber-500/30">
                      ⏱ {Math.floor(gameTime / 60)}:{String(gameTime % 60).padStart(2, "0")}
                    </div>
                  </div>
                </div>

                {/* Floating cash deltas */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-30">
                  {floatingCash.map(f => (
                    <div key={f.key} className={`text-3xl font-black animate-float-up ${f.ok ? "text-emerald-300" : "text-rose-400"}`}>
                      {f.ok ? "+" : ""}${f.amount}
                    </div>
                  ))}
                </div>

                {/* Status overlays */}
                {activeState?.status.frozen && activeState.status.frozen > 0 && (
                  <div className="absolute inset-0 z-40 bg-cyan-500/30 backdrop-blur-md flex flex-col items-center justify-center text-center">
                    <div className="text-9xl animate-bounce">❄️</div>
                    <h2 className="text-4xl font-black text-cyan-100 mt-2">FROZEN!</h2>
                    <p className="text-cyan-50">Thawing in {activeState.status.frozen}s</p>
                  </div>
                )}

                {/* Humans vs Zombies battle scene */}
                {isHvZ && !shopOpen && (
                  <div className="mb-4 p-4 rounded-2xl bg-black/45 border border-white/15">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-black text-emerald-300">🛡️ Barrier {barrierHP}%</div>
                      <div className="text-sm font-black text-rose-300">🧟 Zombie Pressure {Math.round(100 - barrierHP)}%</div>
                    </div>
                    <div className={`relative h-32 rounded-2xl bg-gradient-to-r from-rose-950 via-stone-800 to-emerald-900 overflow-hidden border border-white/15 ${barrierHP < 30 ? "animate-barrier-crack" : ""}`}>
                      {/* Zombie horde */}
                      <div className="absolute top-1/2 -translate-y-1/2 text-5xl animate-zombie-walk" style={{ left: `${zombieMarchOffset - 20}%` }}>🧟</div>
                      <div className="absolute top-1/2 -translate-y-1/2 text-4xl animate-zombie-walk" style={{ left: `${zombieMarchOffset - 12}%`, animationDelay: "0.3s" }}>🧟‍♂️</div>
                      <div className="absolute top-1/2 -translate-y-1/2 text-4xl animate-zombie-walk" style={{ left: `${zombieMarchOffset - 5}%`, animationDelay: "0.6s" }}>🧟‍♀️</div>
                      {/* Barrier */}
                      <div className="absolute right-12 top-0 bottom-0 w-4 bg-gradient-to-b from-amber-300 to-amber-700 rounded-full shadow-[0_0_25px_rgba(251,191,36,0.7)]"
                        style={{ opacity: barrierHP / 100, height: `${Math.max(20, barrierHP)}%`, top: `${(100 - Math.max(20, barrierHP)) / 2}%` }} />
                      {/* Human */}
                      <div className="absolute top-1/2 -translate-y-1/2 right-2 text-5xl glossy-emoji">🛠️</div>
                    </div>
                    <div className="mt-2 max-h-20 overflow-y-auto text-xs space-y-1">
                      {hzLog.slice().reverse().slice(0, 4).map(l => (
                        <div key={l.key} className={l.type === "attack" ? "text-rose-300" : "text-emerald-300"}>{l.text}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trust No One */}
                {mode === "trust" && !shopOpen && (
                  <div className="mb-4 p-4 rounded-2xl bg-purple-900/40 border border-purple-400/30 text-center">
                    <div className="text-xs uppercase text-purple-200 tracking-widest font-bold">🕵️ Trust No One</div>
                    <p className="text-sm">One player is the secret traitor. Spot suspicious behavior!</p>
                    <div className="flex justify-center gap-2 mt-2">
                      {players.filter(p => p.id !== activeId).map(p => (
                        <button key={p.id} onClick={() => setAccusations(a => [...a, p.id])}
                          className={`px-3 py-1 rounded-lg text-xs font-bold ${accusations.includes(p.id) ? "bg-rose-500" : "bg-white/10 border border-white/20"}`}>
                          {p.avatar} Accuse
                        </button>
                      ))}
                    </div>
                    {accusations.length > 0 && (
                      <p className="text-xs mt-2 text-rose-200">
                        {accusations.includes(traitorId) ? "🎯 Correct accusation!" : "❌ Innocent accused…"}
                      </p>
                    )}
                  </div>
                )}

                {/* Question / Shop body */}
                {!shopOpen ? (
                  <div className="space-y-5">
                    {activeQ.image && <img src={activeQ.image} alt="" className="w-full h-44 object-cover rounded-2xl border border-white/15" />}
                    <div className={`p-6 rounded-3xl border-2 text-center bg-black/55 border-white/15 ${globalFog > 0 ? "blur-md" : ""}`}>
                      <div className="text-xs uppercase tracking-widest text-white/40 mb-1">Question · {activeQ.points} pts base</div>
                      <h2 className="text-2xl font-black leading-tight">{activeQ.prompt}</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {activeQ.choices.map(c => (
                        <button key={c} onClick={() => answer(c)} disabled={locked !== null}
                          className={`p-4 rounded-2xl font-black border text-left transition ${
                            locked !== null
                              ? c === activeQ.answer ? "bg-emerald-400 text-black border-emerald-400 animate-glow-pulse"
                              : selectedChoice === c ? "bg-rose-500 border-rose-500 animate-shake-fall"
                              : "bg-white/5 border-white/10 opacity-50"
                              : "bg-white/10 border-white/25 hover:bg-white/20 hover:scale-[1.01]"
                          }`}>
                          {c}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setShopOpen(true); setShopTab("upgrades"); sfx.play("open"); }}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black hover:scale-105 transition shadow-2xl">
                        🛒 Shop
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black">🛒 Shop — ${activeState?.cash.toLocaleString()}</h3>
                      <button onClick={() => setShopOpen(false)} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 font-bold hover:bg-white/20">Back</button>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <button onClick={() => setShopTab("upgrades")} className={`px-4 py-2 rounded-xl font-black text-sm ${shopTab === "upgrades" ? "bg-amber-300 text-black" : "bg-white/10 border border-white/20"}`}>📈 Upgrades</button>
                      <button onClick={() => setShopTab("powerups")} className={`px-4 py-2 rounded-xl font-black text-sm ${shopTab === "powerups" ? "bg-fuchsia-400 text-black" : "bg-white/10 border border-white/20"}`}>⚡ Power-ups</button>
                    </div>

                    {shopTab === "upgrades" ? (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {GIMKIT_UPGRADES.map(up => {
                          const lvl = activeState?.upgradeLevels[up.id] ?? 1;
                          const cost = Math.round(up.baseCost * Math.pow(up.costScale, lvl - 1));
                          const affordable = (activeState?.cash ?? 0) >= cost;
                          return (
                            <div key={up.id} className={`p-4 rounded-2xl border bg-gradient-to-br ${up.color} bg-opacity-30 border-white/20`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-3xl glossy-emoji">{up.emoji}</span>
                                  <div>
                                    <div className="font-black text-sm">{up.name}</div>
                                    <div className="text-[10px] text-white/70">Level {lvl}</div>
                                  </div>
                                </div>
                                <button onClick={() => buyUpgrade(up)} disabled={!affordable}
                                  className={`px-3 py-2 rounded-xl font-black text-xs ${affordable ? "bg-amber-300 text-black hover:scale-105" : "bg-black/40 text-white/40"}`}>
                                  ${cost}
                                </button>
                              </div>
                              <p className="text-xs text-white/85">{up.description(lvl)}</p>
                              <div className="mt-2 flex gap-1">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <div key={i} className={`flex-1 h-1.5 rounded-full ${i < lvl ? "bg-amber-300" : "bg-white/20"}`} />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {GIMKIT_POWERUPS.filter(p => isHvZ ? true : !["zombie-strike", "barrier-boost"].includes(p.id)).map(pw => {
                          const affordable = (activeState?.cash ?? 0) >= pw.cost;
                          return (
                            <div key={pw.id} className={`p-4 rounded-2xl border bg-gradient-to-br ${pw.color} bg-opacity-30 border-white/20`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-3xl glossy-emoji">{pw.emoji}</span>
                                  <div>
                                    <div className="font-black text-sm">{pw.name}</div>
                                    <div className="text-[10px] text-white/70 uppercase tracking-widest">{pw.type}</div>
                                  </div>
                                </div>
                                <button onClick={() => buyPowerup(pw)} disabled={!affordable}
                                  className={`px-3 py-2 rounded-xl font-black text-xs ${affordable ? "bg-fuchsia-300 text-black hover:scale-105" : "bg-black/40 text-white/40"}`}>
                                  ${pw.cost}
                                </button>
                              </div>
                              <p className="text-xs text-white/85">{pw.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {winner && (
                  <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-[fadeIn_0.3s_ease-out]">
                    <div className="text-9xl glossy-emoji animate-bounce mb-4">🏆</div>
                    <h2 className="text-5xl font-black title-shimmer mb-3">Game Over!</h2>
                    <p className="text-2xl font-black text-amber-200 mb-6">{winner}</p>
                    <button onClick={resetGame} className="px-6 py-3 rounded-2xl bg-emerald-400 text-black font-black text-lg hover:scale-110 transition">Play Again</button>
                  </div>
                )}
              </section>

              {/* RIGHT: Live leaderboard with epic animations */}
              <aside className="space-y-4">
                <div className="premium-panel p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-white/55 mb-3 flex items-center justify-between">
                    <span>🏆 Live Leaderboard</span>
                    {mode === "team" && <span className="text-amber-300">Total: ${players.reduce((s, p) => s + (playerStates[p.id]?.cash ?? 0), 0).toLocaleString()}</span>}
                  </div>
                  <SuiteLeaderboard players={players} activeId={activeId} onSelect={setActiveId} />
                </div>
                <div className="premium-panel p-4 text-xs text-white/70">
                  <div className="font-black text-white mb-2">📜 How to Play</div>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>Answer correctly to earn Cash.</li>
                    <li>Reinvest Cash in upgrades (income, streak, multiplier, insurance).</li>
                    <li>Buy power-ups to attack rivals or defend yourself.</li>
                    <li>{isHvZ ? "Humans repair the barrier; Zombies attack it." : "Top Cash when timer hits 0 wins."}</li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        )}

        {tab === "players" && <SuitePlayersTab players={players} setPlayers={setPlayers} />}

        {tab === "study" && <GimkitStudySection payload={payload} />}

        {tab === "slides" && <GimkitSlideSection payload={payload} />}

        {tab === "prompt" && (
          <SuitePromptTab
            basePrompt={GIMKIT_PROMPT}
            jsonText={jsonText}
            setJsonText={setJsonText}
            onBuild={buildJson}
            onLoadSample={() => { setJsonText(JSON.stringify(SAMPLE_GIMKIT_PAYLOAD, null, 2)); setError(""); }}
            error={error}
            metrics={[
              { label: "Questions", value: payload.questions.length },
              { label: "Cards", value: payload.study.flashcards.length },
              { label: "Slides", value: payload.slideshow.lessons.length },
              { label: "Players", value: players.length },
            ]}
          />
        )}

        {tab === "logic" && (
          <section className="space-y-4">
            <div className="premium-panel p-6">
              <h2 className="text-3xl font-black mb-2">🧬 Gimkit Engine Logic</h2>
              <p className="text-white/70 text-sm mb-4">Authoritative state loop syncs every 50ms (simulated). Cash is the universal fuel.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Logic title="Income Multipliers" body="Each level multiplies base cash per correct answer using exponential scaling." emoji="💵" />
                <Logic title="Streak Bonuses"     body="Consecutive correct answers stack a streak multiplier — break the streak and lose the bonus." emoji="🔥" />
                <Logic title="Mega Multiplier"    body="Adds a global x-factor on TOP of all other earnings, including streak bonuses." emoji="📈" />
                <Logic title="Loss Insurance"     body="Limits the financial penalty on wrong answers up to 95% protection at max." emoji="🛡️" />
                <Logic title="Offensive Power-ups" body="Snowball (freeze), Fog (obscure), Bait (drain) hit ALL rivals simultaneously." emoji="⚡" />
                <Logic title="Defensive Power-ups" body="Shield reflects the next attack; Purify clears active negative status." emoji="🛡️" />
                <Logic title="Humans vs Zombies"   body="Faction assigned per player. Zombies attack barrier; Humans repair it. Timer + barrier HP decide the winner." emoji="🧟" />
                <Logic title="Trust No One"        body="A hidden traitor shares the team room. Use accusations and behavior reads to identify them." emoji="🕵️" />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

