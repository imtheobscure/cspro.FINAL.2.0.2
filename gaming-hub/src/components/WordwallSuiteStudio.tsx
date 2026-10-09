import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { SuitePlayersTab, type Player } from "./SuitePlayersTab";
import { SuiteLeaderboard } from "./SuiteLeaderboard";
import { SuitePromptTab } from "./SuitePromptTab";
import {
  SAMPLE_WORDWALL_PAYLOAD,
  WORDWALL_MODES,
  wordwallModeById,
  type WordwallItem,
  type WordwallModeId,
  type WordwallPayload,
} from "../data/wordwallModes";
import { MASTER_AI_COPY_PROMPT } from "../data/baamboozleModes";
import { ArenaProps } from "./wordwall/shared";
import { TrueFalse } from "./wordwall/TrueFalse";
import { RankOrder } from "./wordwall/RankOrder";
import { Flashcards } from "./wordwall/Flashcards";
import { FlipTiles } from "./wordwall/FlipTiles";
import { LabelledDiagram } from "./wordwall/LabelledDiagram";
import { Unscramble } from "./wordwall/Unscramble";
import { MissingWord } from "./wordwall/MissingWord";
import { Anagram } from "./wordwall/Anagram";
import { Wordsearch } from "./wordwall/Wordsearch";
import { OpenBox } from "./wordwall/OpenBox";
import { QuizGame } from "./wordwall/QuizGame";
import { GroupSort } from "./wordwall/GroupSort";
import { FindMatch } from "./wordwall/FindMatch";
import { MatchUp } from "./wordwall/MatchUp";

interface Props {
  initialModeId: WordwallModeId;
  onBack: () => void;
}

export function WordwallSuiteStudio({ initialModeId, onBack }: Props) {
  const { catSay, sfx, speakOnHover } = useApp();
  const [modeId, setModeId] = useState<WordwallModeId>(initialModeId);
  const [tab, setTab] = useState<"game" | "players" | "study" | "slides" | "prompt" | "logic">("game");
  const [payload, setPayload] = useState<WordwallPayload>(SAMPLE_WORDWALL_PAYLOAD);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(SAMPLE_WORDWALL_PAYLOAD, null, 2));
  const [error, setError] = useState("");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [maximized, setMaximized] = useState(false);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const mode = wordwallModeById(modeId);

  const [players, setPlayers] = useState<Player[]>([
    { id: "p1", name: "Word Wizard", avatar: "🦉", score: 160, streak: 3, wrongStreak: 0 },
  ]);

  useEffect(() => {
    catSay(`${mode.name} loaded in Wordwall Suite. ${mode.short}`, "😻");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addScore = (delta: number, message: string, good = true) => {
    setScore(s => Math.max(0, s + delta));
    sfx.play(good ? "coin" : "buzz");
    catSay(message, good ? "😸" : "😿");
  };

  const buildJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as WordwallPayload;
      if (!parsed.items?.length) throw new Error("items must be a non-empty array");
      setPayload(parsed);
      setError("");
      setScore(0); setLives(3);
      setTab("game");
      sfx.play("open");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid JSON";
      setError(msg);
      sfx.play("buzz");
    }
  };

  const toggleMaximize = async () => {
    if (!arenaRef.current) return;
    if (!document.fullscreenElement) {
      try { await arenaRef.current.requestFullscreen(); setMaximized(true); }
      catch { setMaximized(true); }
    } else {
      try { await document.exitFullscreen(); } catch { /* noop */ }
      setMaximized(false);
    }
  };

  useEffect(() => {
    const handler = () => setMaximized(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="min-h-screen relative text-white overflow-hidden">
      <div className="fixed inset-0 -z-20">
        <img src={mode.bgImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-fuchsia-950/55 to-black/85" />
      </div>

      <header className="sticky top-0 z-30 bg-black/45 backdrop-blur-xl border-b border-white/15">
        <div className="w-full px-4 sm:px-8 xl:px-12 py-4 flex items-center gap-3 flex-wrap">
          <button onClick={onBack} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20">← Hub</button>
          <div className="text-5xl glossy-emoji animate-float-slow">{mode.emoji}</div>
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-2xl sm:text-4xl font-black title-shimmer">Wordwall Suite</h1>
            <p className="text-white/70 text-sm">{mode.name} · high-fidelity interactive environment</p>
          </div>
          <select value={modeId} onChange={e => setModeId(e.target.value as WordwallModeId)} className="bg-black/60 border border-white/30 rounded-xl px-3 py-2 font-bold">
            {WORDWALL_MODES.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
          </select>
        </div>
        <div className="w-full px-4 sm:px-8 xl:px-12 pb-3 flex gap-2 overflow-x-auto">
          {(["game", "players", "study", "slides", "prompt", "logic"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm font-bold border ${tab === t ? "bg-white text-black border-white" : "bg-white/10 border-white/20 hover:bg-white/20"}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="w-full px-4 sm:px-8 xl:px-12 py-6 pb-32">
        {tab === "game" && (
          <div className="grid lg:grid-cols-[2.5fr_1fr] 2xl:grid-cols-[3.5fr_1fr] gap-5">
            <section ref={arenaRef} className={`premium-panel p-4 sm:p-6 ${maximized ? "fixed inset-0 z-50 rounded-none overflow-auto bg-black" : ""}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="text-3xl font-black">{payload.title}</h2>
                  <p className="text-white/65 text-sm">{payload.topic} · {payload.level}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 font-black">Score {score}</div>
                  <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 font-black">Lives {"❤️".repeat(Math.max(0, lives))}</div>
                  <button onClick={toggleMaximize} className="px-4 py-2 rounded-xl bg-fuchsia-500 font-black">{maximized ? "Exit Full" : "Maximize"}</button>
                </div>
              </div>
              <WordwallArena modeId={modeId} payload={payload} score={score} addScore={addScore} lives={lives} setLives={setLives} />
            </section>

            <aside className="space-y-4">
              <div className="premium-panel p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-white/55 mb-3">🏆 Live Leaderboard</div>
                <SuiteLeaderboard players={players} />
              </div>
              <div className="premium-panel p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-white/55 mb-2">{mode.name}</div>
                <p className="text-sm text-white/80">{mode.short}</p>
              </div>
            </aside>
          </div>
        )}

        {tab === "players" && <SuitePlayersTab players={players} setPlayers={setPlayers} />}

{/* JSON Builder is now merged into the Prompt tab */}

        {tab === "study" && (
          <section className="space-y-5">
            <h2 className="text-3xl font-black">📚 Study Flashcards (with CCQ)</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {payload.items.map(card => (
                <div key={card.id} className="study-card rounded-3xl overflow-hidden border border-white/20 bg-white/10">
                  <img src={card.image} alt="" className="h-44 w-full object-cover" />
                  <div className="p-5 space-y-3">
                    <h3 onMouseEnter={() => speakOnHover(card.term)} className="text-2xl font-black">{card.term}</h3>
                    <p onMouseEnter={() => speakOnHover(card.definition)} className="text-sm text-white/80">{card.definition}</p>
                    <div className="text-[10px] uppercase tracking-widest text-amber-200 font-black">📌 Example</div>
                    <p onMouseEnter={() => speakOnHover(card.sentence)} className="text-xs italic bg-amber-400/10 border border-amber-300/25 rounded-xl p-2">{card.sentence}</p>
                    <div className="text-[10px] uppercase tracking-widest text-fuchsia-200 font-black">🧠 CCQ</div>
                    <p className="text-xs bg-fuchsia-500/10 border border-fuchsia-300/25 rounded-xl p-2">Is this in the {card.group} category?</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "slides" && (
          <section className="space-y-5">
            {payload.items.slice(0, 6).map((it, idx) => (
              <div key={it.id} className="premium-panel overflow-hidden grid lg:grid-cols-[320px_1fr]">
                <div className="relative min-h-60">
                  <img src={it.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <div className="text-xs uppercase tracking-widest font-black bg-fuchsia-500/40 px-2 py-0.5 rounded-full mb-2 inline-block">Slide {idx + 1}</div>
                    <h2 className="text-2xl font-black">{it.term}</h2>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <p className="text-white/85">{it.definition}</p>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-200 font-black mb-1">📝 Example</div>
                    <p className="text-sm italic bg-amber-400/10 border border-amber-300/25 rounded-xl p-3">{it.sentence}</p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-300/25">
                      <div className="text-[10px] uppercase tracking-widest text-blue-200 font-black mb-1">⏰ When</div>
                      <p className="text-xs">When discussing {it.group} topics in conversation.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-300/25">
                      <div className="text-[10px] uppercase tracking-widest text-emerald-200 font-black mb-1">🌍 Where</div>
                      <p className="text-xs">In real-world settings related to {it.group}.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-fuchsia-500/15 border border-fuchsia-300/25">
                      <div className="text-[10px] uppercase tracking-widest text-fuchsia-200 font-black mb-1">🛠️ How</div>
                      <p className="text-xs">Use it as a noun in clear, vivid sentences.</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "prompt" && (
          <SuitePromptTab
            basePrompt={MASTER_AI_COPY_PROMPT}
            jsonText={jsonText}
            setJsonText={setJsonText}
            onBuild={buildJson}
            onLoadSample={() => setJsonText(JSON.stringify(SAMPLE_WORDWALL_PAYLOAD, null, 2))}
            error={error}
            metrics={[
              { label: "Items", value: payload.items.length },
              { label: "Level", value: payload.level },
              { label: "Topic", value: payload.topic.slice(0, 14) },
              { label: "Mode", value: mode.name.slice(0, 12) },
            ]}
          />
        )}

        {tab === "logic" && (
          <section className="grid lg:grid-cols-2 gap-4">
            {WORDWALL_MODES.map(m => (
              <div key={m.id} className={`premium-panel p-5 ${m.id === modeId ? "ring-2 ring-amber-300" : ""}`}>
                <div className="flex items-center gap-3 mb-3"><span className="text-5xl glossy-emoji">{m.emoji}</span><div><h3 className="text-2xl font-black">{m.name}</h3><p className="text-sm text-white/65">{m.short}</p></div></div>
                <ul className="space-y-1 text-sm text-white/75">{m.logic.map(l => <li key={l}>• {l}</li>)}</ul>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}



export function WordwallArena(props: ArenaProps) {
  switch (props.modeId) {
    case "match-up": return <MatchUp {...props} />;
    case "find-the-match": return <FindMatch {...props} />;
    case "group-sort": return <GroupSort {...props} />;
    case "quiz": return <QuizGame {...props} />;
    case "open-the-box": return <OpenBox {...props} />;
    case "wordsearch": return <Wordsearch {...props} />;
    case "anagram": return <Anagram {...props} />;
    case "missing-word": return <MissingWord {...props} />;
    case "unscramble": return <Unscramble {...props} />;
    case "labelled-diagram": return <LabelledDiagram {...props} />;
    case "flip-tiles": return <FlipTiles {...props} />;
    case "flashcards": return <Flashcards {...props} />;
    case "rank-order": return <RankOrder {...props} />;
    case "true-or-false": return <TrueFalse {...props} />;
  }
}
