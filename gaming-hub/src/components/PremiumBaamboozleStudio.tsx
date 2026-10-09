import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { SuitePlayersTab, type Player } from "./SuitePlayersTab";
import { SuiteLeaderboard } from "./SuiteLeaderboard";
import { SuitePromptTab } from "./SuitePromptTab";
import {
  BAAMBOOZLE_MODES,
  MASTER_AI_COPY_PROMPT,
  SAMPLE_BAAM_PAYLOAD,
  modeById,
  type BaamGameModeId,
  type BaamPayload,
  type BaamQuestion,
} from "../data/baamboozleModes";
import type { Emotion } from "../data/activities";

import { BaamboozleClassic } from "./baamboozle/BaamboozleClassic";
import { Guesseroo } from "./baamboozle/Guesseroo";
import { TicTacToe } from "./baamboozle/TicTacToe";
import { DoubleVision } from "./baamboozle/DoubleVision";
import { StoryDice } from "./baamboozle/StoryDice";
import { FourInARow } from "./baamboozle/FourInARow";
import { MemoryGame } from "./baamboozle/MemoryGame";
import type { ScoreEvent, ArenaProps } from "./baamboozle/shared";

type Tab = "game" | "players" | "study" | "slides" | "prompt" | "logic";



interface Props {
  onBack: () => void;
  initialModeId?: BaamGameModeId;
}

export function PremiumBaamboozleStudio({ onBack, initialModeId }: Props) {
  const { catSay, sfx } = useApp();
  const [tab, setTab] = useState<Tab>("game");
  const [jsonText, setJsonText] = useState(() => JSON.stringify(SAMPLE_BAAM_PAYLOAD, null, 2));
  const [payload, setPayload] = useState<BaamPayload>(() => {
    if (!initialModeId) return SAMPLE_BAAM_PAYLOAD;
    return { ...SAMPLE_BAAM_PAYLOAD, metadata: { ...SAMPLE_BAAM_PAYLOAD.metadata, selectedGameType: initialModeId } };
  });
  const [error, setError] = useState("");
  const [teamIndex, setTeamIndex] = useState(0);
  const [maximized, setMaximized] = useState(false);
  const arenaRef = useRef<HTMLDivElement | null>(null);

  const [players, setPlayers] = useState<Player[]>(() => [
    { id: "p1", name: "Rival Foxes", avatar: "🦊", score: 0, streak: 0, wrongStreak: 0 },
    { id: "p2", name: "Llama Rangers", avatar: "🦄", score: 0, streak: 0, wrongStreak: 0 },
  ]);

  const scores = useMemo(() => players.map(p => p.score), [players]);

  const mode = modeById(payload.metadata.selectedGameType);
  const teams = players;

  useEffect(() => {
    if (initialModeId) {
      const m = modeById(initialModeId);
      catSay(`${m.name} loaded. ${m.short}`, "😻");
    } else {
      catSay("Baamboozle Suite is ready. Pick a mode or paste your AI JSON.", "😻");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetScores = (next = payload) => {
    setPlayers(prev => prev.map(p => ({ ...p, score: 0, streak: 0, wrongStreak: 0 })));
    setTeamIndex(0);
    console.log(next);
  };

  const onScore = (event: ScoreEvent, targetTeam: number = teamIndex, advance = true) => {
    if (event.sfx) sfx.play(event.sfx);
    setPlayers(prev => prev.map((p, i) => i === targetTeam ? { ...p, score: Math.max(0, p.score + event.delta) } : p));
    catSay(event.message, event.emotion ?? "😺");
    if (advance) setTeamIndex(i => (i + 1) % teams.length);
  };

  const buildFromJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as BaamPayload;
      if (!parsed.metadata?.selectedGameType) throw new Error("metadata.selectedGameType is required.");
      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error("questions must be a non-empty array.");
      setPayload(parsed);
      setError("");
      resetScores(parsed);
      setTab("game");
      sfx.play("open");
      catSay(`Built ${parsed.metadata.title}.`, "😸");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid JSON.";
      setError(msg);
      catSay(`The JSON needs a fix: ${msg}`, "🙀");
      sfx.play("buzz");
    }
  };

  const selectMode = (id: BaamGameModeId) => {
    const updated: BaamPayload = { ...payload, metadata: { ...payload.metadata, selectedGameType: id } };
    setPayload(updated);
    setJsonText(JSON.stringify(updated, null, 2));
    resetScores(updated);
    sfx.play("click");
    catSay(`Switched to ${modeById(id).name}.`, "😺");
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(MASTER_AI_COPY_PROMPT);
      catSay("Master AI prompt copied. Paste it into your AI tool!", "😻");
      sfx.play("coin");
    } catch {
      catSay("Browser blocked copy — select the prompt manually.", "😿");
    }
  };

  const toggleMaximize = async () => {
    const el = arenaRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen();
        setMaximized(true);
        sfx.play("open");
      } catch {
        setMaximized(true); // CSS fallback
      }
    } else {
      try { await document.exitFullscreen(); } catch { /* */ }
      setMaximized(false);
    }
  };

  useEffect(() => {
    const handler = () => setMaximized(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const bg = payload.environment.backgroundImage || mode.bgImage;

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      <div className="fixed inset-0 -z-20">
        <img src={bg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-purple-950/55 to-black/85" />
      </div>

      <header className="sticky top-0 z-30 bg-black/45 backdrop-blur-xl border-b border-white/15">
        <div className="w-full px-4 sm:px-8 xl:px-12 py-4 flex items-center gap-3 flex-wrap">
          <button onClick={onBack} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition">← Hub</button>
          <div className="text-5xl glossy-emoji animate-float-slow">{mode.emoji}</div>
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-2xl sm:text-4xl font-black title-shimmer">Baamboozle Suite</h1>
            <p className="text-white/70 text-sm">{mode.name} · JSON-powered 3D arena · {teams.length} teams · Cat coach</p>
          </div>
          <button onClick={copyPrompt} className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 text-black font-black shadow-xl hover:scale-105 transition">
            Copy AI Prompt
          </button>
        </div>

        <div className="w-full px-4 sm:px-8 xl:px-12 pb-3 flex gap-2 overflow-x-auto">
          {(["game", "players", "study", "slides", "prompt", "logic"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition ${tab === t ? "bg-white text-slate-950 border-white" : "bg-white/10 border-white/20 hover:bg-white/20"}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="w-full px-4 sm:px-8 xl:px-12 py-6 pb-32">
        {tab === "game" && (
          <div className="grid lg:grid-cols-[2.5fr_1fr] 2xl:grid-cols-[3.5fr_1fr] gap-5">
            <section ref={arenaRef} className={`premium-panel p-4 sm:p-6 relative ${maximized ? "fixed inset-0 z-50 rounded-none overflow-auto bg-black" : ""}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black">{payload.metadata.title}</h2>
                  <p className="text-white/65 text-sm">{payload.metadata.topic} · {payload.metadata.level}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={payload.metadata.selectedGameType}
                    onChange={e => selectMode(e.target.value as BaamGameModeId)}
                    className="bg-black/60 border border-white/30 rounded-xl px-3 py-2 text-sm font-bold"
                  >
                    {BAAMBOOZLE_MODES.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
                  </select>
                  <button onClick={toggleMaximize} className="px-3 py-2 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 transition font-black text-sm" title="Maximize for screen sharing">
                    {maximized ? "⤢ Exit Full" : "⤢ Maximize"}
                  </button>
                  <button onClick={() => resetScores()} className="px-3 py-2 rounded-xl bg-white/15 border border-white/25 text-sm font-bold">↺ Reset</button>
                </div>
              </div>

              {/* Compact in-arena scoreboard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {teams.map((team, i) => (
                  <button key={team.id} onClick={() => setTeamIndex(i)}
                    className={`p-2 rounded-xl text-left flex items-center gap-2 border transition ${i === teamIndex ? "bg-white/25 border-white/60 scale-[1.04] shadow-[0_0_20px_rgba(168,85,247,0.5)]" : "bg-white/10 border-white/20"}`}
                  >
                    <span className="text-4xl glossy-emoji">{team.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1">{team.name}{team.streak >= 3 && <span>🔥</span>}</div>
                      <div className="text-2xl font-black leading-none" style={{ color: "#fbbf24" }}>{team.score}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Game arena */}
              <ModeArena
                key={mode.id}
                payload={payload}
                mode={mode}
                teamIndex={teamIndex}
                scores={scores}
                onScore={onScore}
                maximized={maximized}
              />
            </section>

            <aside className="space-y-4">
              <div className="premium-panel p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-3 flex items-center justify-between">
                  <span>🏆 Live Leaderboard</span>
                </div>
                <SuiteLeaderboard players={teams} activeId={teams[teamIndex]?.id} onSelect={(id) => {
                  const idx = teams.findIndex(t => t.id === id);
                  if (idx >= 0) setTeamIndex(idx);
                }} />
              </div>
              <div className="premium-panel p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">How {mode.name} Works</div>
                <ul className="space-y-1 text-sm text-white/85">
                  {mode.logic.slice(0, 4).map(step => <li key={step}>• {step}</li>)}
                </ul>
              </div>
            </aside>
          </div>
        )}

        {tab === "players" && <SuitePlayersTab players={players} setPlayers={setPlayers} />}

        {tab === "study" && <StudySection payload={payload} />}
        {tab === "slides" && <SlideshowSection payload={payload} />}
        {tab === "prompt" && (
          <SuitePromptTab
            basePrompt={MASTER_AI_COPY_PROMPT}
            jsonText={jsonText}
            setJsonText={setJsonText}
            onBuild={buildFromJson}
            onLoadSample={() => { setJsonText(JSON.stringify(SAMPLE_BAAM_PAYLOAD, null, 2)); setError(""); }}
            error={error}
            metrics={[
              { label: "Questions", value: payload.questions.length },
              { label: "Flashcards", value: payload.study.flashcards.length },
              { label: "Slides", value: payload.slideshow.miniLessons.length },
              { label: "Teams", value: payload.environment.teams.length },
            ]}
          />
        )}
        {tab === "logic" && <LogicSection selected={payload.metadata.selectedGameType} />}
      </main>
    </div>
  );
}

// Metric component removed (now provided by SuitePromptTab)

// ─────────────────────────────────────────────────────────────────────
// MODE ARENA
// ─────────────────────────────────────────────────────────────────────


function ModeArena(props: ArenaProps) {
  const { mode } = props;
  switch (mode.id) {
    case "baamboozle":         return <BaamboozleClassic {...props} />;
    case "guess-eroo":         return <Guesseroo {...props} />;
    case "tic-tac-toe":        return <TicTacToe {...props} />;
    case "double-vision":      return <DoubleVision {...props} />;
    case "story-dice":         return <StoryDice {...props} />;
    case "four-in-a-row":      return <FourInARow {...props} />;
    case "memory":             return <MemoryGame {...props} />;
    default:                   return null;
  }
}


// helper subcomponents
function StudySection({ payload }: { payload: BaamPayload }) {
  return (
    <div className="grid sm:grid-cols-4 gap-4">
      {payload.study.flashcards.map(fc => (
        <div key={fc.front} className="premium-panel p-4">
          <h3 className="font-black text-lg">{fc.front}</h3>
          <p className="text-sm mt-1 text-white/70">{fc.back}</p>
        </div>
      ))}
    </div>
  );
}

function SlideshowSection({ payload }: { payload: BaamPayload }) {
  return (
    <div className="space-y-4">
      {payload.slideshow.miniLessons.map((l, idx) => (
        <div key={idx} className="premium-panel p-5">
          <h3 className="font-black text-2xl">{l.title}</h3>
          <p className="text-sm text-white/70 italic mt-1">{l.teacherScript}</p>
        </div>
      ))}
    </div>
  );
}

// PromptSection removed in favor of SuitePromptTab

function LogicSection({ selected }: { selected: BaamGameModeId }) {
  return (
    <div className="premium-panel p-5">
      <h3 className="font-black text-xl">Selected Mode: {selected}</h3>
      <p className="text-sm text-white/70 mt-1">Baamboozle Suite author authorized state looping.</p>
    </div>
  );
}
