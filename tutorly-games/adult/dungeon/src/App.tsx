import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BGM,
  CLASS_STATS,
  Difficulty,
  GameSession,
  LootItem,
  PartyState,
  PlayerClass,
  PlayerState,
  PlayerDossier,
  NPCPlayerProfile,
  RARITY,
  Rarity,
  Gender,
  HeroTier,
  SAMPLE_JSON_TEMPLATE,
  SurvivalChoice,
  VoiceOption,
  buildContentPrompt,
  chooseBestVoice,
  createSession,
  formatTime,
  generateMerchantStock,
  generateStorybook,
  getAvailableVoices,
  getBuyPrice,
  getPronounVars,
  getSurvivalRating,
  playBGM,
  playHeartbeat,
  playSFX,
  primeSFX,
  setActivePlayer,
  canRevivePartyMember,
  revivePartyMember,
  setBGMVolume,
  skillCheck,
  speakText,
  stopBGM,
  stopSpeech,
  useItem,
} from "./flashcards";
import { SplashScreen } from "./GameShell";

/**
 * Scene art, resolved through Vite's BASE_URL.
 *
 * These were root-absolute (`/images/dungeon-bg.jpg`), which only works when the game is served
 * from the site root. The folder name is the URL here, so every one of the ten images 404'd once
 * the game moved under `/tutorly-games/adult/`. `import.meta.env.BASE_URL` is exactly the base
 * declared in vite.config.ts, so the artwork follows the game wherever it is deployed.
 */
const IMG: Record<string, string> = {
  "dungeon-bg": `${import.meta.env.BASE_URL}images/dungeon-bg.jpg`,
  dragon: `${import.meta.env.BASE_URL}images/dragon.jpg`,
  "hero-warrior": `${import.meta.env.BASE_URL}images/hero-warrior.jpg`,
  treasure: `${import.meta.env.BASE_URL}images/treasure.jpg`,
  "trap-room": `${import.meta.env.BASE_URL}images/trap-room.jpg`,
  victory: `${import.meta.env.BASE_URL}images/victory.jpg`,
  "death-screen": `${import.meta.env.BASE_URL}images/death-screen.jpg`,
  storybook: `${import.meta.env.BASE_URL}images/storybook.jpg`,
  "monster-encounter": `${import.meta.env.BASE_URL}images/monster-encounter.jpg`,
  "potion-herbs": `${import.meta.env.BASE_URL}images/potion-herbs.jpg`,
};

const css = `

:root{--bg:#0c0a09;--amber:#f59e0b;--amber2:#b45309;--stone:#1c1917}
*{box-sizing:border-box}

@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes pglow{0%,100%{box-shadow:0 0 18px #f59e0b33}50%{box-shadow:0 0 42px #f59e0b66}}
@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@keyframes fire{0%,100%{text-shadow:0 0 8px #f97316,0 0 16px #ef4444}50%{text-shadow:0 0 24px #fbbf24,0 0 48px #f97316}}
@keyframes hb{0%,100%{transform:scale(1)}14%{transform:scale(1.12)}28%{transform:scale(1)}42%{transform:scale(1.08)}70%{transform:scale(1)}}
@keyframes flicker{0%,100%{opacity:1}93%{opacity:.4}95%{opacity:1}97%{opacity:.6}}
@keyframes xpUp{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-44px);opacity:0}}
@keyframes d20spin{0%{transform:rotateY(0deg)}100%{transform:rotateY(720deg)}}

.font-cinzel{font-family:'Cinzel','Georgia',serif}
.font-crimson{font-family:'Crimson Text','Georgia',serif}
.an-float{animation:float 3s ease-in-out infinite}
.an-pglow{animation:pglow 2s ease-in-out infinite}
.an-slideUp{animation:slideUp .55s ease-out}
.an-fadeIn{animation:fadeIn .6s ease-out}
.an-shake{animation:shake .5s ease-in-out}
.an-fire{animation:fire 1.5s ease-in-out infinite}
.an-hb{animation:hb .85s ease-in-out infinite}

.card3d{transform-style:preserve-3d;perspective:1000px;transition:transform .3s}
.card3d:hover{transform:rotateX(2deg) rotateY(-2deg) translateZ(4px)}

.glass{backdrop-filter:blur(12px) saturate(180%);-webkit-backdrop-filter:blur(12px) saturate(180%)}

::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:#1c1917;border-radius:4px}
::-webkit-scrollbar-thumb{background:#78350f;border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:#b45309}
`;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function sum<T>(arr: T[], f: (x: T) => number) {
  return arr.reduce((a, x) => a + f(x), 0);
}

function Particles({ n = 16, color = "#f59e0b" }: { n?: number; color?: string }) {
  const ps = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: Math.random() * 4 + 2,
        d: Math.random() * 4,
        du: Math.random() * 3 + 2,
      })),
    [n]
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {ps.map((p) => (
        <div
          key={p.i}
          className="absolute rounded-full opacity-50"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.s,
            height: p.s,
            background: color,
            boxShadow: `0 0 ${p.s * 2}px ${color}`,
            animation: `float ${p.du}s ease-in-out ${p.d}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function HPBar({ hp, max }: { hp: number; max: number }) {
  const pct = max <= 0 ? 0 : clamp((hp / max) * 100, 0, 100);
  const c = pct > 60 ? "#22c55e" : pct > 30 ? "#f59e0b" : "#ef4444";
  return (
    <div className={pct <= 25 ? "an-hb" : ""}>
      <div className="flex justify-between text-[10px] font-bold mb-0.5 font-cinzel">
        <span style={{ color: c }}>❤️ {hp}/{max}</span>
        <span className="text-stone-500">{Math.round(pct)}%</span>
      </div>
      <div className="rounded-full overflow-hidden bg-stone-800/60 border border-stone-700" style={{ height: 8 }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg,${c}99,${c})`, boxShadow: pct <= 25 ? `0 0 10px ${c}` : "none" }}
        />
      </div>
    </div>
  );
}

function RarityBadge({ r }: { r: Rarity }) {
  const cfg = RARITY[r];
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg.badge} border`}
      style={{ color: cfg.color, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}

function ItemCard({
  item,
  right,
}: {
  item: LootItem;
  right?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  const r = RARITY[item.rarity];
  return (
    <div
      className="card3d rounded-2xl border-2 overflow-hidden transition-all hover:scale-[1.02]"
      style={{ borderColor: r.border, background: r.bg, boxShadow: r.glow }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="text-4xl flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: `${r.color}22`, border: `2px solid ${r.border}` }}
          >
            {item.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm font-cinzel truncate" style={{ color: r.color }}>
              {item.name}
            </div>
            <div className="mt-1">
              <RarityBadge r={item.rarity} />
            </div>
            <p className="text-stone-300/80 text-xs mt-2 font-crimson leading-snug">{item.description}</p>
            {item.perks && item.perks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.perks.slice(0, 4).map((p, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-black/25 border border-white/10 text-stone-200">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {right && (
          <button
            onClick={right.onClick}
            disabled={right.disabled}
            className="w-full mt-3 py-2 rounded-xl text-sm font-black transition-all hover:scale-105 disabled:opacity-40"
            style={{ background: r.color, color: "#0c0a09" }}
          >
            {right.label}
          </button>
        )}
      </div>
    </div>
  );
}

function CompanionChip({
  name,
  emoji,
  rarity,
  description,
}: {
  name: string;
  emoji: string;
  rarity: Rarity;
  description: string;
}) {
  const r = RARITY[rarity];
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
      style={{ borderColor: r.border, background: `${r.color}12` }}>
      <div className="text-2xl">{emoji}</div>
      <div className="min-w-0">
        <div className="text-xs font-black font-cinzel" style={{ color: r.color }}>{name}</div>
        <div className="text-[10px] text-stone-400 truncate" title={description}>{description}</div>
      </div>
    </div>
  );
}

let floatId = 0;

export default function App() {
  // Theme
  const [isDark, setIsDark] = useState(false);

  // Session
  const [session, setSession] = useState<GameSession | null>(null);
  // The shared Tutorly splash is always the first screen (GameShell.tsx) — same
  // splash, same tutor branding and same wording as every other adult game.
  const [phase, setPhase] = useState<GameSession["phase"]>("splash");

  // Party draft (multiplayer)
  type DraftPlayer = {
    name: string;
    class: PlayerClass;
    gender: Gender;
    heroTier: HeroTier;
    luck: number; // 0..10
    dossier: PlayerDossier;
    isNPC: boolean;
    npc?: NPCPlayerProfile;
  };

  const emptyDossier = (): PlayerDossier => ({
    appearance: "",
    hometown: "",
    culture: "",
    interests: [],
    strengths: [],
    fears: [],
    signaturePhrases: [],
    secret: "",
  });

  const emptyNpcProfile = (): NPCPlayerProfile => ({
    agenda: "",
    traits: [],
    goals: [],
    rivalries: [],
    trust: 50,
    luck: 5,
    dialogueBank: {
      onLoot: ["Nice. That loot has consequences."],
      onBetrayal: ["I knew someone would crack."],
      onNearDeath: ["Don't die. Not yet."],
      onCriticalSuccess: ["Lucky. Too lucky."],
      onFailure: ["That was embarrassing."],
      onRomance: ["Love is just leverage."],
    },
  });

  const parseList = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const joinList = (arr: string[]) => arr.join(", ");

  const [draftPlayers, setDraftPlayers] = useState<DraftPlayer[]>([
    {
      name: "Player 1",
      class: "fighter",
      gender: "male",
      heroTier: "common",
      luck: 5,
      dossier: emptyDossier(),
      isNPC: false,
    },
  ]);
  const [difficulty, setDifficulty] = useState<Difficulty>("adventurer");

  // Voice + Audio
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>(() => localStorage.getItem("ror_voiceURI") || "");

  useEffect(() => {
    localStorage.setItem("ror_voiceURI", voiceURI);
  }, [voiceURI]);
  const [usedVoiceName, setUsedVoiceName] = useState<string>("");
  const [voiceWarn, setVoiceWarn] = useState<string>("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceVol, setVoiceVol] = useState(0.9);

  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [bgmVol, setBgmVol] = useState(0.18);
  const [curBGM, setCurBGM] = useState("");

  // Custom JSON + Prompt Builder
  const [jsonText, setJsonText] = useState<string>(() => localStorage.getItem("ror_json") || SAMPLE_JSON_TEMPLATE);
  const [jsonErr, setJsonErr] = useState("");

  const [promptTopic, setPromptTopic] = useState(localStorage.getItem("ror_prompt_topic") || "");
  const [promptTone, setPromptTone] = useState(localStorage.getItem("ror_prompt_tone") || "dramatic and suspenseful");
  const [promptAge, setPromptAge] = useState(localStorage.getItem("ror_prompt_age") || "adult");
  const [promptInterests, setPromptInterests] = useState(localStorage.getItem("ror_prompt_interests") || "Dungeons & Dragons, survival games");
  const [promptRooms, setPromptRooms] = useState<number>(() => Number(localStorage.getItem("ror_prompt_rooms") || "12"));
  const [promptCEFR, setPromptCEFR] = useState<"A1" | "A2" | "B1" | "B2" | "C1" | "C2">((localStorage.getItem("ror_prompt_cefr") as any) || "B1");

  // DM / Host
  const [hostText, setHostText] = useState("");

  // Gameplay
  const [choiceResult, setChoiceResult] = useState<null | {
    choice: SurvivalChoice;
    actorId: string;
    targetId?: string;
    roll?: ReturnType<typeof skillCheck>;
    usedTimeSec?: number;
    timeout?: boolean;
  }>(null);

  const [targetModal, setTargetModal] = useState<null | {
    choice: SurvivalChoice;
    actorId: string;
  }>(null);

  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [stashOpen, setStashOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopRarity, setShopRarity] = useState<Rarity | "all">("all");

  const [storyEntries, setStoryEntries] = useState<any[]>([]);
  const [storyPage, setStoryPage] = useState(0);

  const [floats, setFloats] = useState<Array<{ id: number; text: string; color: string }>>([]);
  const [shake, setShake] = useState(false);
  const [levelUp, setLevelUp] = useState("");

  // Timer per room/choice
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeMax, setTimeMax] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const roomStartRef = useRef<number>(Date.now());

  const ev = session?.events[session.currentEventIndex];
  const party = session?.party;

  const activePlayer = useMemo(() => {
    if (!party) return null;
    return party.players[clamp(party.activePlayerIndex, 0, party.players.length - 1)];
  }, [party]);

  // Inject CSS once
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
    return () => {
      document.head.removeChild(s);
    };
  }, []);

  // Load voices (Edge/Chrome load asynchronously)
  useEffect(() => {
    if (!window.speechSynthesis) return;

    const load = () => {
      const v = getAvailableVoices();
      setVoices(v);
      const exists = voiceURI ? v.some(x => x.voiceURI === voiceURI) : false;
      if (!voiceURI || !exists) {
        const best = chooseBestVoice(v);
        if (best) setVoiceURI(best.voiceURI);
      }
    };

    load();
    const t = window.setTimeout(load, 250);
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.clearTimeout(t);
      window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist prompt inputs
  useEffect(() => {
    localStorage.setItem("ror_prompt_topic", promptTopic);
    localStorage.setItem("ror_prompt_tone", promptTone);
    localStorage.setItem("ror_prompt_age", promptAge);
    localStorage.setItem("ror_prompt_interests", promptInterests);
    localStorage.setItem("ror_prompt_rooms", String(promptRooms));
    localStorage.setItem("ror_prompt_cefr", promptCEFR);
  }, [promptTopic, promptTone, promptAge, promptInterests, promptRooms, promptCEFR]);

  // Persist JSON
  useEffect(() => {
    localStorage.setItem("ror_json", jsonText);
  }, [jsonText]);

  // BGM control
  useEffect(() => {
    if (!bgmEnabled) {
      stopBGM();
      return;
    }
    let key = "dungeon";
    if (phase === "victory") key = "victory";
    if (phase === "game-over") key = "sad";
    if (ev?.kind === "merchant") key = "merchant";
    if (ev?.kind === "boss") key = "boss";
    if (ev?.kind === "monster") key = "battle";
    if (key !== curBGM) {
      setCurBGM(key);
      playBGM(key, bgmVol);
    }
  }, [bgmEnabled, bgmVol, ev?.kind, phase, curBGM]);

  useEffect(() => {
    setBGMVolume(bgmVol);
  }, [bgmVol]);

  const addFloat = useCallback((text: string, color = "#f59e0b") => {
    const id = ++floatId;
    setFloats((p) => [...p, { id, text, color }]);
    window.setTimeout(() => setFloats((p) => p.filter((x) => x.id !== id)), 2000);
  }, []);

  const doShake = useCallback(() => {
    setShake(true);
    window.setTimeout(() => setShake(false), 600);
  }, []);

  const speak = useCallback(
    (text: string) => {
      setHostText(text);
      if (!autoSpeak) return;
      if (!window.speechSynthesis) return;
      speakText({
        text,
        voiceURI,
        volume: voiceVol,
        onUsedVoice: (name) => {
          setUsedVoiceName(name);
          if (voiceURI) {
            // If chosen voice not used, warn (prevents Microsoft David surprise)
            const chosen = voices.find((v) => v.voiceURI === voiceURI);
            if (chosen && name !== chosen.name) {
              setVoiceWarn(`⚠️ Voice fallback used: "${name}" (chosen: "${chosen.name}")`);
            } else {
              setVoiceWarn("");
            }
          }
        },
      });
    },
    [autoSpeak, voiceURI, voiceVol, voices]
  );

  // Timer helpers
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(null);
    setTimeMax(null);
  }, []);

  const startTimer = useCallback(
    (seconds: number) => {
      stopTimer();
      setTimeLeft(seconds);
      setTimeMax(seconds);
      roomStartRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        setTimeLeft((t) => {
          if (t === null) return null;
          if (t <= 1) {
            // Clear the interval WITHOUT nulling the state: the timeout consequence
            // below keys on `timeLeft === 0`, and `stopTimer()` here used to wipe the
            // value (null) before React could ever see the 0 — so the clock ran out in
            // total silence, with no penalty, and the party could carry on choosing.
            if (timerRef.current) {
              window.clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    },
    [stopTimer]
  );

  // If timer hits 0 while no choice chosen, apply panic and auto-continue
  useEffect(() => {
    if (!session || !party || !activePlayer || !ev) return;
    if (timeLeft !== 0) return;
    if (choiceResult) return;

    // Timeout consequence: active player takes damage and loses stamina, then forced to continue
    const dmg = ev.kind === "boss" ? 25 : 15;

    setSession((prev) => {
      if (!prev) return prev;
      const p = prev.party;
      const a = p.players[p.activePlayerIndex];
      const nextA = { ...a, hp: Math.max(0, a.hp - dmg), stamina: Math.max(0, a.stamina - 15) };
      const nextPlayers = p.players.map((pp, i) => (i === p.activePlayerIndex ? nextA : pp));

      const log = {
        timestamp: Date.now(),
        room: prev.currentEventIndex + 1,
        event: ev.title,
        actor: a.name,
        choice: "(timeout)",
        outcome: `Time ran out. Panic strikes. -${dmg} HP and -15 stamina.`,
        imageKey: ev.imageKey,
        isHighlight: true,
      };

      return {
        ...prev,
        party: { ...p, players: nextPlayers, storyLog: [...p.storyLog, log] },
      };
    });

    addFloat(`⏳ TIME OUT! -${dmg} HP`, "#ef4444");
    if (sfxEnabled) playSFX("wrong", 0.6);
    doShake();
    speak("Time is a weapon in this dungeon. You hesitated... and it punished you.");

    // Show a result card briefly then continue
    setChoiceResult({
      choice: {
        id: "timeout",
        label: "Hesitation",
        emoji: "⏳",
        description: "Time ran out.",
        outcome: "bad",
        applyTo: "active",
        hpChange: -dmg,
        goldChange: 0,
        xpChange: 0,
        staminaChange: -15,
        outcomeNarration: "Time ran out. Panic and pain.",
        riskLevel: "deadly",
      },
      actorId: activePlayer.id,
      timeout: true,
      usedTimeSec: timeMax || undefined,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // START GAME
  const startGame = useCallback(
    (customJson?: string) => {
      // ensure unique class selection
      const classSet = new Set(draftPlayers.map((p) => p.class));
      if (classSet.size !== draftPlayers.length) {
        alert("Each class can be chosen only once (Fighter/Mage/Marksman/Assassin/Tank). Choose unique classes.");
        return;
      }
      let campaignJson = customJson;
      if (!campaignJson) {
        try {
          const parsed = JSON.parse(jsonText);
          if (parsed && Array.isArray(parsed.events) && parsed.events.length > 0) {
            campaignJson = jsonText;
          }
        } catch {
          // ignore
        }
      }

      const s = createSession({
        partyPlayers: draftPlayers.map((p) => ({
          name: p.name.trim() || "Player",
          class: p.class,
          gender: p.gender,
          heroTier: p.heroTier,
          luck: p.luck,
          dossier: p.dossier,
          isNPC: p.isNPC,
          npc: p.npc,
        })),
        difficulty,
        dmVoiceURI: voiceURI,
        customJson: campaignJson,
      });
      setSession({ ...s, phase: "dungeon-event" });
      setPhase("briefing");
      setChoiceResult(null);
      setShopOpen(false);
      setInventoryOpen(false);
      setStashOpen(false);
      stopSpeech();
      if (sfxEnabled) playSFX("whoosh", 0.45);
      if (bgmEnabled) playBGM("dungeon", bgmVol);
    },
    [draftPlayers, difficulty, voiceURI, sfxEnabled, bgmEnabled, bgmVol]
  );

  // Enter first room
  const enterDungeon = useCallback(() => {
    if (!session) return;
    const e = session.events[0];
    setPhase("dungeon-event");
    setChoiceResult(null);
    stopSpeech();
    setTimeout(() => speak(e.dmReaction.onEnter || e.narration), 500);
    const seconds = e.timeLimitSec ?? 60;
    startTimer(seconds);
  }, [session, speak, startTimer]);

  // Per-room passive effects
  const applyRoomPassives = useCallback((p: PartyState): PartyState => {
    // Companions passive heal/shield each room
    const heal = sum(p.companions, (c) => c.passive?.healPerRoom || 0);
    const shield = sum(p.companions, (c) => c.passive?.shieldPerRoom || 0);

    const nextPlayers = p.players.map((pl) => {
      let np = { ...pl };
      if (heal > 0) np.hp = Math.min(np.maxHp, np.hp + heal);
      if (shield > 0) np.shield = np.shield + shield;

      if (np.poisoned) {
        np.hp = Math.max(0, np.hp - np.poisonDmg);
        np.poisonRoomsLeft = Math.max(0, np.poisonRoomsLeft - 1);
        if (np.poisonRoomsLeft <= 0) {
          np.poisoned = false;
          np.poisonDmg = 0;
        }
      }

      // Minor stamina regen
      np.stamina = Math.min(np.maxStamina, np.stamina + 8);
      return np;
    });

    return { ...p, players: nextPlayers };
  }, []);

  // If ALL party members are permanently dead → game over
  useEffect(() => {
    if (!session || !party) return;
    if (phase !== "dungeon-event") return;
    const allDead = party.players.every((pl) => pl.hp <= 0 && pl.lives <= 0);
    if (!allDead) return;

    stopTimer();
    stopSpeech();
    setPhase("game-over");
    if (bgmEnabled) playBGM("sad", bgmVol);
    if (sfxEnabled) playSFX("death", 0.7);
    setTimeout(() => speak("The party has fallen. The dungeon seals the door behind your story."), 200);
  }, [session, party, phase, bgmEnabled, bgmVol, sfxEnabled, speak, stopTimer]);

  // Advance room
  const advanceRoom = useCallback(() => {
    if (!session) return;
    stopTimer();
    stopSpeech();
    setTargetModal(null);
    setShopOpen(false);

    const nextIndex = session.currentEventIndex + 1;
    if (nextIndex >= session.events.length) {
      // Count the room just survived. `roomsCleared` used to be incremented only on
      // the way INTO the next room, so the last room of every campaign was never
      // counted — a finished 12-room campaign reported 11, and the one-room demo
      // campaign ended on "Rooms 0" with an F rating and a shrug from the dice.
      const completed = {
        ...session,
        completedAt: Date.now(),
        party: { ...session.party, roomsCleared: session.party.roomsCleared + 1 },
      };
      setSession(completed);
      setPhase("victory");
      if (sfxEnabled) playSFX("victory", 0.7);
      playBGM("victory", bgmVol);
      setStoryEntries(generateStorybook(completed));
      setStoryPage(0);
      speak("You survived. The dungeon is silent. Tutorly Dungeons and Dragons has been conquered.");
      return;
    }

    const nextEv = session.events[nextIndex];

    setSession((prev) => {
      if (!prev) return prev;
      let p = { ...prev.party };
      p.roomsCleared += 1;
      p = applyRoomPassives(p);
      // Deaths count
      p.deaths = p.players.filter((pl) => pl.hp <= 0 && pl.lives <= 0).length;

      // Merchant restock if empty
      let evs = prev.events;
      if (nextEv.kind === "merchant" && nextEv.merchant && nextEv.merchant.items.length === 0) {
        const items = generateMerchantStock({ difficulty: prev.difficulty, chapter: nextEv.chapter, allowLegendary: true });
        evs = prev.events.map((e, i) => (i === nextIndex ? { ...e, merchant: e.merchant ? { ...e.merchant, items } : e.merchant } : e));
      }

      return { ...prev, events: evs, party: p, currentEventIndex: nextIndex };
    });

    setChoiceResult(null);
    setInventoryOpen(false);
    setStashOpen(false);

    setTimeout(() => speak(nextEv.dmReaction.onEnter || nextEv.narration), 450);
    if (sfxEnabled) {
      // A real door swings shut behind the party, then the room itself speaks —
      // the old build jumped straight to the monster sting with no sense of entry.
      setTimeout(() => playSFX("door", 0.42), 60);
      if (nextEv.kind === "monster" || nextEv.kind === "boss") setTimeout(() => playSFX("monster", 0.5), 200);
      if (nextEv.kind === "boss") setTimeout(() => playSFX("boss", 0.4), 900);
      if (nextEv.kind === "trap") setTimeout(() => playSFX("trap", 0.5), 200);
      if (nextEv.kind === "treasure") setTimeout(() => playSFX("treasure", 0.5), 200);
      if (nextEv.kind === "jumpscare") setTimeout(() => playSFX("jumpscare", 0.7), 1200);
    }

    const seconds = nextEv.timeLimitSec ?? 60;
    startTimer(seconds);
  }, [session, stopTimer, speak, sfxEnabled, bgmVol, startTimer, applyRoomPassives]);

  // The room clock has a voice of its own. It used to count down in total
  // silence, so running out of time was easy to miss until the penalty landed:
  // now a real clock tick marks the last five seconds and a heartbeat sits
  // under the last three. One sound per second, never a loop, so it stays a
  // warning rather than a headache.
  useEffect(() => {
    if (!sfxEnabled || timeLeft === null || timeLeft <= 0) return;
    if (timeLeft > 5) return;
    playSFX("clockTick", 0.32);
    if (timeLeft <= 3) playHeartbeat(0.3);
  }, [timeLeft, sfxEnabled]);

  // Choose active player
  const setActive = useCallback(
    (playerId: string) => {
      setSession((prev) => {
        if (!prev) return prev;
        return { ...prev, party: setActivePlayer(prev.party, playerId) };
      });
    },
    []
  );

  const reviveMember = useCallback(
    (playerId: string) => {
      setSession((prev) => {
        if (!prev) return prev;
        const p = prev.party;
        const idx = p.players.findIndex((x) => x.id === playerId);
        if (idx < 0) return prev;
        const pl = p.players[idx];
        if (!canRevivePartyMember(pl)) return prev;
        const revived = revivePartyMember(pl);
        const players = p.players.map((x, i) => (i === idx ? revived : x));
        const log = {
          timestamp: Date.now(),
          room: prev.currentEventIndex + 1,
          event: 'Revival',
          actor: prev.dmName,
          choice: `⚡ Revive ${pl.name}`,
          outcome: `${pl.name} rises again with ${revived.hp} HP. Lives remaining: ${revived.lives}.`,
          imageKey: 'victory',
          isHighlight: true,
        };
        return { ...prev, party: { ...p, players, storyLog: [...p.storyLog, log] } };
      });
      addFloat('⚡ REVIVED!', '#22c55e');
      if (sfxEnabled) playSFX('levelUp', 0.6);
      speak('A miracle! Someone rises from the brink. The dungeon is not finished with you yet.');
    },
    [addFloat, sfxEnabled, speak]
  );

  // Apply choice
  const applyChoice = useCallback(
    (choice: SurvivalChoice, actorId: string, targetId?: string) => {
      if (!session || !party) return;
      if (!activePlayer) return;
      if (choiceResult) return;

      // Skill check
      let roll: ReturnType<typeof skillCheck> | undefined;
      if (choice.skillCheck) {
        const actor = party.players.find((p) => p.id === actorId) || activePlayer;
        roll = skillCheck({ party, actor, stat: choice.skillCheck.stat, dc: choice.skillCheck.dc });
      }

      // Used time
      const usedSec = Math.max(0, Math.round((Date.now() - roomStartRef.current) / 1000));

      // Determine effective outcome (failed check worsens good/jackpot)
      const failed = roll ? !roll.success : false;
      const effectiveOutcome = failed
        ? choice.outcome === "jackpot"
          ? "good"
          : choice.outcome === "good"
            ? "neutral"
            : choice.outcome
        : choice.outcome;

      // What the party actually reads this turn.
      //
      // The dice decide before the text does: a FAILED check used to print the
      // choice's success narration anyway ("a safe path opens") while the DM said
      // "Ouch" and the HP bar disagreed — three sources, three different stories.
      const narration = failed
        ? choice.failNarration ??
          `${outcomeForDM(choice)} The dungeon does not reward bad luck — the attempt costs you.`
        : choice.outcomeNarration;

      // Apply
      setSession((prev) => {
        if (!prev) return prev;
        const e = prev.events[prev.currentEventIndex];
        let p = { ...prev.party };

        const actorIdx = p.players.findIndex((pl) => pl.id === actorId);
        const targetIdx = targetId ? p.players.findIndex((pl) => pl.id === targetId) : -1;
        const actor = actorIdx >= 0 ? p.players[actorIdx] : p.players[p.activePlayerIndex];
        const target = targetIdx >= 0 ? p.players[targetIdx] : null;

        const applyTo = choice.applyTo || "party";

        const applyToOne = (pl: PlayerState) => {
          let np = { ...pl };
          // HP (shield not modeled here; simplified)
          if (choice.hpChange !== 0) {
            const hc = failed ? Math.round(choice.hpChange * 1.3) : choice.hpChange;
            if (hc < 0) np.hp = Math.max(0, np.hp + hc);
            else np.hp = Math.min(np.maxHp, np.hp + hc);
          }
          // gold
          if (choice.goldChange !== 0) {
            const gc = failed ? Math.round(choice.goldChange * 0.7) : choice.goldChange;
            np.gold = Math.max(0, np.gold + gc);
          }
          // xp
          if (choice.xpChange !== 0) {
            const oldLvl = np.level;
            np.xp += choice.xpChange;
            np.level = Math.min(10, Math.max(1, Math.floor((np.xp / 12000) * 10) + 1));
            // We still show level-up in UI using xpToNextLevel visual; not strict.
            if (np.level > oldLvl) {
              setLevelUp(`⬆️ ${np.name} LEVEL ${np.level}!`);
              window.setTimeout(() => setLevelUp(""), 2800);
              if (sfxEnabled) playSFX("levelUp", 0.6);
            }
          }
          // stamina
          if (choice.staminaChange !== 0) {
            const sc = failed ? Math.round(choice.staminaChange * 1.2) : choice.staminaChange;
            np.stamina = clamp(np.stamina + sc, 0, np.maxStamina);
          }
          // poison
          if (choice.poison) {
            np.poisoned = true;
            np.poisonDmg = choice.poison.dmgPerRoom;
            np.poisonRoomsLeft = choice.poison.durationRooms;
          }
          // curse
          if (choice.curse) np.cursed = true;

          // decision counters
          if (effectiveOutcome === "good" || effectiveOutcome === "jackpot") np.decisionsGood += 1;
          if (effectiveOutcome === "bad" || effectiveOutcome === "death") np.decisionsBad += 1;

          return np;
        };

        const applyLoot = (pl: PlayerState) => {
          let np = { ...pl };
          if (choice.grantsItem) np.inventory = [...np.inventory, choice.grantsItem];
          return np;
        };

        if (applyTo === "party") {
          p.players = p.players.map((pl) => applyLoot(applyToOne(pl)));
        } else if (applyTo === "active") {
          p.players = p.players.map((pl, i) => (i === p.activePlayerIndex ? applyLoot(applyToOne(pl)) : pl));
        } else if (applyTo === "target") {
          // If target not provided, fallback to active
          const idx = targetIdx >= 0 ? targetIdx : p.activePlayerIndex;
          p.players = p.players.map((pl, i) => (i === idx ? applyLoot(applyToOne(pl)) : pl));

          // PvP money transfer
          if (choice.stealGoldFromTarget && actorIdx >= 0) {
            const amt = Math.max(0, choice.stealGoldFromTarget);
            const tIdx = idx;
            const aIdx = actorIdx;
            if (tIdx >= 0 && aIdx >= 0 && tIdx !== aIdx) {
              const t = p.players[tIdx];
              const a = p.players[aIdx];
              const steal = Math.min(t.gold, amt);
              p.players[tIdx] = { ...t, gold: t.gold - steal };
              p.players[aIdx] = { ...a, gold: a.gold + steal };
            }
          }

          if (choice.giftGoldToTarget && actorIdx >= 0) {
            const amt = Math.max(0, choice.giftGoldToTarget);
            const tIdx = idx;
            const aIdx = actorIdx;
            if (tIdx >= 0 && aIdx >= 0 && tIdx !== aIdx) {
              const t = p.players[tIdx];
              const a = p.players[aIdx];
              const give = Math.min(a.gold, amt);
              p.players[aIdx] = { ...a, gold: a.gold - give };
              p.players[tIdx] = { ...t, gold: t.gold + give };
            }
          }
        }

        // Add companion
        if (choice.addCompanion) {
          if (!p.companions.find((c) => c.id === choice.addCompanion!.id)) {
            p.companions = [...p.companions, choice.addCompanion];
          }
        }

      // Story log
      const actorName = actor?.name || "PARTY";
      const targetName = target?.name;
      const outcomeText = substitute(
        narration,
          {
            actor: actorName,
            target: targetName || "",
            ...getPronounVars('actor', actor?.gender || 'male'),
            ...getPronounVars('target', target?.gender || 'male'),
          }
        );
        p.storyLog = [
          ...p.storyLog,
          {
            timestamp: Date.now(),
            room: prev.currentEventIndex + 1,
            event: e.title,
            actor: actorName,
            choice: `${choice.emoji} ${choice.label}${targetName ? ` → ${targetName}` : ""}`,
            outcome: outcomeText,
            imageKey: e.imageKey,
            isHighlight: effectiveOutcome === "jackpot" || effectiveOutcome === "death" || choice.requiresTargetPlayer,
            isDeath: effectiveOutcome === "death",
          },
        ];

        // Death handling
        if (choice.hpChange <= -999 || effectiveOutcome === "death") {
          // Ensure target or active dies
          const killIdx = choice.applyTo === "target" && targetIdx >= 0 ? targetIdx : p.activePlayerIndex;
          const victim = p.players[killIdx];
          p.players[killIdx] = { ...victim, hp: 0, lives: Math.max(0, victim.lives - 1) };
        }

        // Merchant choice opens shop
        // (handled in UI, but log already.

        return { ...prev, party: p };
      });

      stopTimer();

      // The dice land before the outcome is read: the player hears the throw on
      // the same beat the result card starts its spin. A choice with no check
      // gets a card turn instead, so the reveal is never silent.
      if (sfxEnabled) playSFX(roll ? "dice" : "cardFlip", 0.45);

      if (sfxEnabled) {
        if (effectiveOutcome === "good" || effectiveOutcome === "jackpot") playSFX("correct", 0.55);
        else playSFX("wrong", 0.55);
      }

      if (effectiveOutcome === "bad" || effectiveOutcome === "death") {
        doShake();
      }

      // floats
      if (choice.hpChange !== 0) addFloat(`${choice.hpChange > 0 ? "+" : ""}${choice.hpChange} HP`, choice.hpChange > 0 ? "#22c55e" : "#ef4444");
      if (choice.goldChange !== 0) addFloat(`${choice.goldChange > 0 ? "+" : ""}${choice.goldChange} 💰`, "#f59e0b");
      if (choice.xpChange !== 0) addFloat(`+${choice.xpChange} XP`, "#a855f7");
      if (choice.addCompanion) addFloat(`+ ${choice.addCompanion.emoji} ${choice.addCompanion.name}`, RARITY[choice.addCompanion.rarity].color);
      if (choice.grantsItem) addFloat(`📦 ${choice.grantsItem.emoji} ${choice.grantsItem.name}`, RARITY[choice.grantsItem.rarity].color);

      // DM reaction
      if (!ev) return;
      if (effectiveOutcome === "death") speak(ev.dmReaction.onDeath || narration);
      else if (effectiveOutcome === "good" || effectiveOutcome === "jackpot") speak(ev.dmReaction.onGoodOutcome || narration);
      else speak(ev.dmReaction.onBadOutcome || narration);

      // `narration` rides along on the result card so the text on screen, the
      // chronicle entry and the spoken line can never disagree again.
      setChoiceResult({
        choice: { ...choice, outcomeNarration: narration },
        actorId,
        targetId,
        roll,
        usedTimeSec: usedSec,
      });
    },
    [
      session,
      party,
      activePlayer,
      choiceResult,
      stopTimer,
      sfxEnabled,
      doShake,
      addFloat,
      speak,
      ev,
    ]
  );

  const onPickChoice = useCallback(
    (choice: SurvivalChoice) => {
      if (!session || !party || !activePlayer) return;
      if (choice.requiresTargetPlayer) {
        setTargetModal({ choice, actorId: activePlayer.id });
        return;
      }

      // Merchant shop is a UI state; still apply choice so log updates.
      if (ev?.kind === "merchant" && choice.id === "c6a") {
        setShopOpen(true);
      }

      applyChoice(choice, activePlayer.id);
    },
    [applyChoice, session, party, activePlayer, ev]
  );

  const onPickTarget = useCallback(
    (targetId: string) => {
      if (!targetModal) return;
      applyChoice(targetModal.choice, targetModal.actorId, targetId);
      setTargetModal(null);
    },
    [targetModal, applyChoice]
  );

  const handleUseItem = useCallback(
    (playerId: string, itemId: string) => {
      if (!session) return;
      const res = useItem({ party: session.party, playerId, itemId });
      setSession((prev) => (prev ? { ...prev, party: res.party } : prev));
      addFloat(res.message, "#22c55e");
      if (sfxEnabled) playSFX("magic", 0.5);
      speak(res.message);
    },
    [session, addFloat, sfxEnabled, speak]
  );

  const handleBuy = useCallback(
    (item: LootItem) => {
      if (!session || !party || !activePlayer || !ev?.merchant) return;
      const cost = getBuyPrice(item);
      if (activePlayer.gold < cost) {
        addFloat("❌ Not enough gold", "#ef4444");
        if (sfxEnabled) playSFX("wrong", 0.35);
        return;
      }
      setSession((prev) => {
        if (!prev) return prev;
        const p = prev.party;
        const idx = p.activePlayerIndex;
        const a = p.players[idx];
        const nextA: PlayerState = { ...a, gold: a.gold - cost, inventory: [...a.inventory, item] };
        const nextPlayers = p.players.map((pl, i) => (i === idx ? nextA : pl));
        return { ...prev, party: { ...p, players: nextPlayers } };
      });
      addFloat(`-${cost} 💰`, "#f59e0b");
      addFloat(`📦 ${item.emoji} ${item.name}`, RARITY[item.rarity].color);
      if (sfxEnabled) playSFX("purchase", 0.55);
    },
    [session, party, activePlayer, ev, addFloat, sfxEnabled]
  );

  // UI helpers
  const promptText = useMemo(() => {
    return buildContentPrompt({
      topic: promptTopic || "survival fantasy",
      cefrLevel: promptCEFR,
      numRooms: clamp(promptRooms, 3, 24),
      tone: promptTone,
      learnerAge: promptAge,
      learnerInterests: promptInterests,
    });
  }, [promptTopic, promptCEFR, promptRooms, promptTone, promptAge, promptInterests]);

  const renderTimer = () => {
    if (timeLeft === null || timeMax === null) return null;
    const pct = timeMax > 0 ? timeLeft / timeMax : 0;
    const col = pct > 0.5 ? "#22c55e" : pct > 0.25 ? "#f59e0b" : "#ef4444";
    const r = 26;
    const c = 32;
    const circ = 2 * Math.PI * r;
    return (
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="absolute" width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="#1c1917" strokeWidth="6" />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={col}
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 5px ${col})` }}
          />
        </svg>
        <span className="relative text-lg font-black font-cinzel" style={{ color: col }}>
          {timeLeft}
        </span>
      </div>
    );
  };

  // ─────────────────────────────────────────
  // SPLASH (shared shell — Adult Dashboard → General Settings → Splash Screen)
  // ─────────────────────────────────────────
  if (phase === "splash") {
    return (
      <SplashScreen
        darkMode={isDark}
        onToggleDark={() => setIsDark((v) => !v)}
        onPlay={() => {
          // First real user gesture: unlock audio and prefetch the effects now,
          // so the opening door and the first dice throw are instant.
          primeSFX();
          setPhase("landing");
        }}
        config={{
          gameTitle: "Dungeons and Dragons",
          gameEmoji: "🏰",
          tagline:
            "The teacher is the Dungeon Master. Students become a party — every choice changes the story.",
          accent: "#f59e0b",
          features: [
            { icon: "🧑‍🤝‍🧑", label: "Multiplayer party" },
            { icon: "🐾", label: "Companions & pets" },
            { icon: "🛒", label: "Rarity shop" },
            { icon: "🎙️", label: "Voice Dungeon Master" },
          ],
          howToPlay: [
            "Each learner picks a class — Fighter, Mage, Marksman, Assassin or Tank.",
            "Copy the AI prompt, paste it into ChatGPT or Claude with your lesson content, and paste the JSON back.",
            "The DM reads each room aloud; the party chooses, rolls a d20 and lives with the consequences.",
            "Pick the active player each room — the dungeon tempts and the chronicle remembers everything.",
          ],
          extraAction: { label: "🤖 AI Prompt Builder", onClick: () => setPhase("prompt-builder") },
        }}
      />
    );
  }

  // ─────────────────────────────────────────
  // LANDING
  // ─────────────────────────────────────────
  if (phase === "landing") {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: "#0c0a09" }}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="absolute inset-0">
          <img src={IMG["dungeon-bg"]} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-stone-950/60 to-stone-950" />
        </div>
        <Particles n={30} />

        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={() => setIsDark((v) => !v)}
            className="p-2 rounded-xl bg-stone-900/80 border border-amber-800/40 text-amber-300"
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => setPhase("settings")}
            className="p-2 rounded-xl bg-stone-900/80 border border-amber-800/40 text-amber-300"
            title="Settings"
          >
            ⚙️
          </button>
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center">
          <div className="text-8xl mb-6 an-float">🏰</div>
          <h1
            className="text-6xl md:text-8xl font-black mb-3 an-fire font-cinzel"
            style={{
              background: "linear-gradient(135deg,#f59e0b,#b45309,#f59e0b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            TUTORLY DUNGEONS AND DRAGONS
          </h1>
          <h2 className="text-3xl md:text-4xl font-black text-amber-300 mb-3 font-cinzel">Multiplayer D&D Survival</h2>
          <p className="text-lg text-stone-300 max-w-2xl mx-auto mb-10 font-crimson">
            The teacher is the Dungeon Master. Students become a party. Every choice changes the story. Sometimes the dungeon tempts you to betray each other.
            Survive the campaign — or die in the pages.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-10 an-fadeIn">
            {[
              { i: "🧑‍🤝‍🧑", t: "Multiplayer Party", d: "Each class can be chosen once" },
              { i: "🐾", t: "Companions & Pets", d: "Recruit allies with perks" },
              { i: "🛒", t: "Rarity Shop", d: "Common → Legendary loot" },
              { i: "🎙️", t: "Voice DM", d: "Use your best browser voices" },
            ].map((f, i) => (
              <div key={i} className="p-4 rounded-2xl bg-stone-900/80 border border-amber-800/30 glass">
                <div className="text-3xl mb-2">{f.i}</div>
                <div className="font-black text-amber-300 text-sm font-cinzel">{f.t}</div>
                <div className="text-stone-400 text-xs">{f.d}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setPhase("character-select")}
              className="px-12 py-5 rounded-2xl font-black text-2xl transition-all hover:scale-105 an-pglow font-cinzel"
              style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#0c0a09", boxShadow: "0 0 40px #f59e0b55" }}
            >
              ⚔️ Start Party Quest
            </button>
            <button
              onClick={() => setPhase("json-editor")}
              className="px-8 py-5 rounded-2xl font-black text-xl bg-stone-900/80 border-2 border-amber-700/60 text-amber-300 hover:bg-stone-800 transition-all hover:scale-105 font-cinzel"
            >
              📝 Paste Campaign JSON
            </button>
            <button
              onClick={() => setPhase("prompt-builder")}
              className="px-8 py-5 rounded-2xl font-black text-xl bg-stone-900/80 border-2 border-purple-700/60 text-purple-300 hover:bg-stone-800 transition-all hover:scale-105 font-cinzel"
            >
              🤖 AI Prompt Builder
            </button>
          </div>

          <div className="mt-10 text-stone-500 text-sm">
            Tip: In Edge, choose a voice with "Natural" in the name for the highest quality.
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // CHARACTER SELECT (no CEFR here)
  // ─────────────────────────────────────────
  if (phase === "character-select") {
    const chosenClasses = new Set(draftPlayers.map((p) => p.class));

    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: "#0c0a09" }}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="absolute inset-0">
          <img src={IMG["hero-warrior"]} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 to-stone-950" />
        </div>
        <Particles n={14} color="#818cf8" />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10">
          <button onClick={() => setPhase("landing")} className="absolute top-6 left-6 text-stone-400 hover:text-amber-300 text-sm">
            ← Back
          </button>

          <h2 className="text-4xl font-black text-amber-400 mb-2 font-cinzel">Build the Party</h2>
          <p className="text-stone-400 mb-8 font-crimson text-center max-w-2xl">
            Multiplayer: each class can be chosen only once. The DM selects the active player each room.
          </p>

          <div className="w-full max-w-5xl space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-black font-cinzel">Party size:</span>
                <span className="text-stone-300 font-bold">{draftPlayers.length}/4</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    if (draftPlayers.length >= 4) return;
                    // pick next available class
                    const all: PlayerClass[] = ["fighter", "mage", "marksman", "assassin", "tank"];
                    const next = all.find((c) => !chosenClasses.has(c)) || "fighter";
                    setDraftPlayers((p) => [...p, {
                      name: `Player ${p.length + 1}`,
                      class: next,
                      gender: "female",
                      heroTier: "common",
                      luck: 5,
                      dossier: emptyDossier(),
                      isNPC: false,
                    }]);
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-800 border border-stone-700 text-amber-300 font-bold hover:bg-stone-700"
                >
                  + Add Player
                </button>
                <button
                  onClick={() => setDraftPlayers((p) => (p.length > 1 ? p.slice(0, -1) : p))}
                  className="px-4 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-300 font-bold hover:bg-stone-700"
                >
                  − Remove
                </button>
              </div>
            </div>

            {/* Player rows */}
            <div className="grid grid-cols-1 gap-4">
              {draftPlayers.map((pl, idx) => {
                const cls = CLASS_STATS[pl.class];
                const tier = RARITY[pl.heroTier];
                const avatar = cls.avatars[pl.gender];
                const takenText = (c: PlayerClass) => (chosenClasses.has(c) && pl.class !== c ? 'Already chosen by another player' : '');
                return (
                  <div
                    key={idx}
                    className="rounded-3xl border-2 glass p-5 an-slideUp card3d"
                    style={{
                      borderColor: tier.border,
                      background: 'linear-gradient(135deg, rgba(28,25,23,0.85), rgba(12,10,9,0.85))',
                      boxShadow: tier.glow,
                    }}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Avatar + identity */}
                      <div className="rounded-2xl border border-stone-700 bg-stone-950/40 p-4">
                        <div className="flex items-center gap-3">
                          {/* The class portrait replaces the emoji tile: the emoji stays
                              as a corner badge so the chosen gender still reads. */}
                          <div
                            className="relative w-20 h-20 rounded-3xl overflow-hidden shrink-0"
                            style={{
                              background: `radial-gradient(circle at 30% 30%, ${tier.color}55, transparent 60%), linear-gradient(135deg, ${tier.color}22, rgba(0,0,0,0.35))`,
                              border: `2px solid ${tier.border}`,
                              boxShadow: tier.glow,
                            }}
                            title={`${cls.title} portrait`}
                          >
                            <img
                              src={cls.portrait}
                              alt=""
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement;
                                if (img.src !== cls.portraitFallback) img.src = cls.portraitFallback;
                              }}
                            />
                            <div className="absolute right-0 bottom-0 px-1 rounded-tl-lg bg-stone-950/85 text-sm leading-tight">{avatar}</div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-stone-400 font-cinzel">Player {idx + 1}</div>
                            <div className="text-lg font-black text-amber-200 font-cinzel truncate">{pl.name || `Player ${idx + 1}`}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-sm font-black" style={{ color: cls.color }}>{cls.title}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${tier.badge} border`} style={{ color: tier.color, borderColor: tier.border }}>{tier.label}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-amber-400 text-xs font-bold mb-1 font-cinzel">Player Name</label>
                          <input
                            value={pl.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDraftPlayers((p) => p.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                            }}
                            className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-lg font-bold outline-none focus:border-amber-500"
                            placeholder={`Player ${idx + 1}`}
                          />
                        </div>

                        {/* Gender */}
                        <div className="mt-3">
                          <div className="text-amber-400 text-xs font-bold mb-2 font-cinzel">Gender (adds story drama)</div>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { g: 'male' as const, label: 'Male', e: '♂️' },
                              { g: 'female' as const, label: 'Female', e: '♀️' },
                            ]).map(x => (
                              <button
                                key={x.g}
                                onClick={() => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, gender: x.g } : y)))}
                                className={`py-2 rounded-xl border font-black text-xs transition-all ${pl.gender === x.g ? 'border-amber-500 bg-amber-500/15 text-amber-200' : 'border-stone-700 bg-stone-900/40 text-stone-400'}`}
                              >
                                {x.e} {x.label}
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 text-[11px] text-stone-500 font-crimson">
                            The campaign can include romance, jealousy, and betrayal arcs based on party dynamics.
                          </div>
                        </div>

                        {/* Hero tier */}
                        <div className="mt-3">
                          <div className="text-amber-400 text-xs font-bold mb-2 font-cinzel">Hero Tier (premium glow + starting perks)</div>
                          <div className="grid grid-cols-2 gap-2">
                            {(['common','rare','epic','legendary'] as HeroTier[]).map(r => {
                              const rr = RARITY[r];
                              const selected = pl.heroTier === r;
                              return (
                                <button
                                  key={r}
                                  onClick={() => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, heroTier: r } : y)))}
                                  className={`py-2 rounded-xl border-2 text-[11px] font-black transition-all ${selected ? 'scale-[1.01]' : 'opacity-80 hover:opacity-100'}`}
                                  style={{ borderColor: selected ? rr.border : '#374151', color: rr.color, background: selected ? `${rr.color}15` : '#0c0a09aa', boxShadow: selected ? rr.glow : 'none' }}
                                >
                                  {rr.label.toUpperCase()}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Luck */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between">
                            <div className="text-amber-400 text-xs font-bold font-cinzel">Luck (0–10)</div>
                            <div className="text-xs font-black" style={{ color: tier.color }}>{pl.luck}/10</div>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={pl.luck}
                            onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, luck: Number(e.target.value) } : y)))}
                            className="w-full accent-amber-500"
                          />
                          <div className="text-[11px] text-stone-500 font-crimson">Luck affects rerolls, loot, and betrayal temptations.</div>
                        </div>

                        {/* Learner dossier */}
                        <div className="mt-3 rounded-2xl border border-stone-700 bg-stone-900/40 p-3">
                          <div className="text-amber-300 text-xs font-black font-cinzel mb-2">Learner Dossier (personalization)</div>
                          <div className="grid grid-cols-1 gap-2">
                            <input
                              value={pl.dossier.appearance}
                              onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, dossier: { ...y.dossier, appearance: e.target.value } } : y)))}
                              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                              placeholder="Appearance (e.g., blue hair, glasses, scar...)"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                value={pl.dossier.hometown}
                                onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, dossier: { ...y.dossier, hometown: e.target.value } } : y)))}
                                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                                placeholder="Hometown / country"
                              />
                              <input
                                value={pl.dossier.culture}
                                onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, dossier: { ...y.dossier, culture: e.target.value } } : y)))}
                                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                                placeholder="Culture (optional)"
                              />
                            </div>
                            <input
                              value={joinList(pl.dossier.interests)}
                              onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, dossier: { ...y.dossier, interests: parseList(e.target.value) } } : y)))}
                              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                              placeholder="Interests (comma separated)"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                value={joinList(pl.dossier.strengths)}
                                onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, dossier: { ...y.dossier, strengths: parseList(e.target.value) } } : y)))}
                                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                                placeholder="Strengths (comma separated)"
                              />
                              <input
                                value={joinList(pl.dossier.fears)}
                                onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, dossier: { ...y.dossier, fears: parseList(e.target.value) } } : y)))}
                                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                                placeholder="Fears (comma separated)"
                              />
                            </div>
                            <input
                              value={joinList(pl.dossier.signaturePhrases)}
                              onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, dossier: { ...y.dossier, signaturePhrases: parseList(e.target.value) } } : y)))}
                              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                              placeholder="Signature phrases (comma separated)"
                            />
                            <input
                              value={pl.dossier.secret}
                              onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, dossier: { ...y.dossier, secret: e.target.value } } : y)))}
                              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                              placeholder="One secret (DM hook)"
                            />
                          </div>
                        </div>

                        {/* NPC toggle */}
                        <div className="mt-3 rounded-2xl border border-stone-700 bg-stone-900/40 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-amber-300 text-xs font-black font-cinzel">NPC Player (actor)</div>
                              <div className="text-[11px] text-stone-500">Optional: adds agenda, trust meter, and dialogue interruptions.</div>
                            </div>
                            <button
                              onClick={() => setDraftPlayers((p) => p.map((y, i) => {
                                if (i !== idx) return y;
                                const next = !y.isNPC;
                                return { ...y, isNPC: next, npc: next ? (y.npc || emptyNpcProfile()) : undefined };
                              }))}
                              className={`relative w-12 h-6 rounded-full transition-all ${pl.isNPC ? 'bg-amber-500' : 'bg-stone-600'}`}
                              title="Toggle NPC"
                            >
                              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${pl.isNPC ? 'left-7' : 'left-1'}`} />
                            </button>
                          </div>

                          {pl.isNPC && (
                            <div className="mt-3 grid grid-cols-1 gap-2">
                              <input
                                value={pl.npc?.agenda || ''}
                                onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, npc: { ...(y.npc || emptyNpcProfile()), agenda: e.target.value } } : y)))}
                                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                                placeholder="NPC agenda (hidden motive)"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  value={joinList(pl.npc?.traits || [])}
                                  onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, npc: { ...(y.npc || emptyNpcProfile()), traits: parseList(e.target.value) } } : y)))}
                                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                                  placeholder="Traits (comma separated)"
                                />
                                <input
                                  value={joinList(pl.npc?.goals || [])}
                                  onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, npc: { ...(y.npc || emptyNpcProfile()), goals: parseList(e.target.value) } } : y)))}
                                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                                  placeholder="Goals (comma separated)"
                                />
                              </div>
                              <input
                                value={joinList(pl.npc?.rivalries || [])}
                                onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, npc: { ...(y.npc || emptyNpcProfile()), rivalries: parseList(e.target.value) } } : y)))}
                                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                                placeholder="Rivalries (comma separated)"
                              />
                              <div>
                                <div className="flex items-center justify-between">
                                  <div className="text-[11px] text-stone-400">Trust meter</div>
                                  <div className="text-[11px] font-black text-amber-300">{pl.npc?.trust ?? 50}/100</div>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={pl.npc?.trust ?? 50}
                                  onChange={(e) => setDraftPlayers((p) => p.map((y, i) => (i === idx ? { ...y, npc: { ...(y.npc || emptyNpcProfile()), trust: Number(e.target.value) } } : y)))}
                                  className="w-full accent-amber-500"
                                />
                              </div>
                              <textarea
                                value={(pl.npc?.dialogueBank?.onLoot || []).join('\n')}
                                onChange={(e) => setDraftPlayers((p) => p.map((y, i) => {
                                  if (i !== idx) return y;
                                  const base = y.npc || emptyNpcProfile();
                                  return {
                                    ...y,
                                    npc: {
                                      ...base,
                                      dialogueBank: { ...base.dialogueBank, onLoot: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) },
                                    },
                                  };
                                }))}
                                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                                rows={3}
                                placeholder="NPC lines (on loot) — one per line"
                              />
                              <textarea
                                value={(pl.npc?.dialogueBank?.onBetrayal || []).join('\n')}
                                onChange={(e) => setDraftPlayers((p) => p.map((y, i) => {
                                  if (i !== idx) return y;
                                  const base = y.npc || emptyNpcProfile();
                                  return {
                                    ...y,
                                    npc: {
                                      ...base,
                                      dialogueBank: { ...base.dialogueBank, onBetrayal: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) },
                                    },
                                  };
                                }))}
                                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 text-sm outline-none"
                                rows={3}
                                placeholder="NPC lines (on betrayal) — one per line"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Class selection */}
                      <div className="rounded-2xl border border-stone-700 bg-stone-950/40 p-4 lg:col-span-2">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <div className="text-amber-400 text-xs font-bold font-cinzel">Choose Class (unique)</div>
                            <div className="text-[11px] text-stone-500">Each class can only be chosen once in a party.</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {(["fighter", "mage", "marksman", "assassin", "tank"] as PlayerClass[]).map((c) => {
                            const s = CLASS_STATS[c];
                            const taken = chosenClasses.has(c) && pl.class !== c;
                            const selected = pl.class === c;
                            const em = s.avatars[pl.gender];
                            return (
                              <button
                                key={c}
                                onClick={() => {
                                  if (taken) return;
                                  setDraftPlayers((p) => p.map((x, i) => (i === idx ? { ...x, class: c } : x)));
                                }}
                                disabled={taken}
                                title={taken ? takenText(c) : s.description}
                                className={`p-3 rounded-2xl border-2 text-left transition-all ${selected ? 'scale-[1.02]' : 'opacity-80 hover:opacity-100'} ${taken ? 'opacity-30 cursor-not-allowed' : ''}`}
                                style={{ borderColor: selected ? s.color : '#374151', background: selected ? `${s.color}18` : '#1c1917aa', boxShadow: selected ? `0 0 18px ${s.color}33` : 'none' }}
                              >
                                <img
                                  src={s.portrait}
                                  alt={`${s.title} portrait`}
                                  className="w-full h-auto rounded-xl"
                                  style={{ border: `1px solid ${selected ? s.color : '#3a3a3a'}55` }}
                                  onError={(e) => {
                                    const img = e.currentTarget as HTMLImageElement;
                                    if (img.src !== s.portraitFallback) img.src = s.portraitFallback;
                                  }}
                                />
                                <div className="mt-1 flex items-center justify-between">
                                  <div className="text-xl">{em}</div>
                                  <div className="text-base">{s.emoji}</div>
                                </div>
                                <div className="mt-2 text-[11px] font-black font-cinzel" style={{ color: s.color }}>
                                  {s.title}
                                </div>
                                <div className="text-[10px] text-stone-400 mt-1">HP {s.maxHp} · STM {s.maxStamina}</div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Stats preview */}
                        <div className="mt-3 grid grid-cols-5 gap-2">
                          {([
                            ['STR', cls.stats.str, '#ef4444'],
                            ['DEX', cls.stats.dex, '#10b981'],
                            ['INT', cls.stats.int, '#8b5cf6'],
                            ['WIS', cls.stats.wis, '#3b82f6'],
                            ['CHA', cls.stats.cha, '#f59e0b'],
                          ] as const).map(([k, v, col]) => (
                            <div key={k} className="p-2 rounded-xl bg-stone-900/50 border border-stone-700 text-center">
                              <div className="text-xs font-black" style={{ color: col }}>{v}</div>
                              <div className="text-[10px] text-stone-500">{k}</div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 text-xs text-stone-400 font-crimson">
                          {cls.description}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Difficulty + Voice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="rounded-2xl border border-amber-800/30 bg-stone-900/70 glass p-4">
                <div className="text-amber-400 font-black font-cinzel mb-2">Difficulty</div>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { d: "novice", e: "🌱", c: "#22c55e" },
                    { d: "adventurer", e: "⚔️", c: "#3b82f6" },
                    { d: "hero", e: "🔥", c: "#f59e0b" },
                    { d: "legend", e: "💀", c: "#ef4444" },
                  ] as const).map((x) => (
                    <button
                      key={x.d}
                      onClick={() => setDifficulty(x.d)}
                      className={`p-3 rounded-xl border-2 text-center font-black text-xs transition-all ${difficulty === x.d ? "scale-[1.02]" : "opacity-60"}`}
                      style={{ borderColor: difficulty === x.d ? x.c : "#374151", color: x.c, background: "#0c0a09aa" }}
                    >
                      <div className="text-2xl mb-1">{x.e}</div>
                      {x.d}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-stone-500">
                  Legend mode is brutal: tighter timers, higher damage.
                </div>
              </div>

              <div className="rounded-2xl border border-amber-800/30 bg-stone-900/70 glass p-4">
                <div className="flex items-center justify-between">
                  <div className="text-amber-400 font-black font-cinzel">DM Voice (all browser voices)</div>
                  <button
                    onClick={() => {
                      const best = chooseBestVoice(voices);
                      if (best) setVoiceURI(best.voiceURI);
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-700/40 border border-amber-700/40 text-amber-200 text-xs font-bold"
                  >
                    Auto-pick best
                  </button>
                </div>

                <div className="mt-2">
                  <select
                    value={voiceURI}
                    onChange={(e) => setVoiceURI(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl bg-stone-950 border border-stone-700 text-amber-100 outline-none text-sm"
                  >
                    {voices.length === 0 ? (
                      <option value="">(Loading voices...)</option>
                    ) : (
                      voices
                        .slice()
                        .sort((a, b) => {
                          // Prefer Natural
                          const an = a.name.toLowerCase().includes("natural") ? 1 : 0;
                          const bn = b.name.toLowerCase().includes("natural") ? 1 : 0;
                          if (an !== bn) return bn - an;
                          return a.name.localeCompare(b.name);
                        })
                        .map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} — {v.lang}
                            {v.name.toLowerCase().includes("natural") ? " (Natural)" : ""}
                            {v.name.toLowerCase().includes("microsoft david") ? " (avoid)" : ""}
                          </option>
                        ))
                    )}
                  </select>
                  {(() => {
                    const sel = voices.find((v) => v.voiceURI === voiceURI);
                    if (!sel) return null;
                    const isDavid = sel.name.toLowerCase().includes("microsoft david");
                    if (!isDavid) return null;
                    return (
                      <div className="mt-2 p-2 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                        ⚠️ "{sel.name}" often sounds robotic. Prefer an Edge "Natural" voice for best quality.
                      </div>
                    );
                  })()}
                  <div className="mt-2 flex items-center justify-between">
                    <label className="text-xs text-stone-400 flex items-center gap-2">
                      <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />
                      Auto-narrate
                    </label>
                    <button
                      onClick={() => speak("Welcome party. I am your Dungeon Master. Choose carefully — the dungeon hears everything.")}
                      className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-amber-300 text-xs font-bold hover:bg-stone-700"
                    >
                      🔊 Test voice
                    </button>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs text-stone-400">Voice volume: {Math.round(voiceVol * 100)}%</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={voiceVol}
                      onChange={(e) => setVoiceVol(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                  {usedVoiceName && (
                    <div className="mt-2 text-[11px] text-stone-500">Currently used: {usedVoiceName}</div>
                  )}
                  {voiceWarn && (
                    <div className="mt-2 p-2 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                      {voiceWarn}
                      <div className="text-red-400/80 mt-1">Tip: choose a different voice (Edge Natural voices are best).</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => startGame()}
              className="w-full mt-2 px-14 py-5 rounded-2xl font-black text-2xl transition-all hover:scale-[1.01] an-pglow font-cinzel"
              style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#0c0a09", boxShadow: "0 0 40px #f59e0b55" }}
            >
              🧑‍🤝‍🧑 Start Multiplayer Campaign
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // PROMPT BUILDER (CEFR only here)
  // ─────────────────────────────────────────
  if (phase === "prompt-builder") {
    return (
      <div className={`min-h-screen ${isDark ? "bg-stone-950 text-amber-50" : "bg-amber-50 text-stone-900"}`}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-black text-amber-700 font-cinzel">🤖 AI Prompt Builder</h1>
            <div className="flex gap-2">
              <button onClick={() => setPhase("landing")} className="px-4 py-2 rounded-xl bg-stone-700 text-amber-200 font-bold text-sm">
                ← Back
              </button>
              <button onClick={() => setIsDark((v) => !v)} className="px-4 py-2 rounded-xl bg-stone-900 text-amber-300 font-bold text-sm">
                {isDark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className={`rounded-2xl border p-5 ${isDark ? "bg-stone-900 border-stone-700" : "bg-white border-stone-200"}`}>
              <div className="text-amber-700 font-black font-cinzel mb-3">Campaign inputs</div>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Theme / Topic" value={promptTopic} set={setPromptTopic} placeholder="e.g., vampire castle survival" dark={isDark} />
                <Field label="Tone" value={promptTone} set={setPromptTone} placeholder="dramatic, horror, funny" dark={isDark} />
                <Field label="Learner age" value={promptAge} set={setPromptAge} placeholder="adult" dark={isDark} />
                <Field label="Learner interests" value={promptInterests} set={setPromptInterests} placeholder="D&D, survival games" dark={isDark} />
                <div>
                  <label className="block text-sm font-bold mb-1 font-cinzel" style={{ color: isDark ? "#fbbf24" : "#b45309" }}>
                    Rooms
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={24}
                    value={promptRooms}
                    onChange={(e) => setPromptRooms(Number(e.target.value))}
                    className={`w-full px-3 py-3 rounded-xl border outline-none ${isDark ? "bg-stone-950 border-stone-700 text-amber-100" : "bg-white border-amber-300 text-stone-900"}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 font-cinzel" style={{ color: isDark ? "#fbbf24" : "#b45309" }}>
                    CEFR level
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(["A1", "A2", "B1", "B2", "C1", "C2"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setPromptCEFR(l)}
                        className={`px-3 py-2 rounded-xl border text-sm font-black transition-all ${promptCEFR === l ? "border-amber-500 bg-amber-500/20 text-amber-500" : isDark ? "border-stone-700 text-stone-400" : "border-stone-300 text-stone-600"}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-stone-500 mt-2">
                    CEFR is only used to guide language complexity in the AI campaign generation.
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border p-5 ${isDark ? "bg-stone-900 border-stone-700" : "bg-white border-stone-200"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-amber-700 font-black font-cinzel">Generated prompt</div>
                <button
                  onClick={() => navigator.clipboard.writeText(promptText)}
                  className="px-3 py-2 rounded-xl font-black text-sm"
                  style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#0c0a09" }}
                >
                  📋 Copy
                </button>
              </div>
              <textarea
                readOnly
                value={promptText}
                className={`w-full h-[420px] px-4 py-3 rounded-2xl border font-mono text-xs resize-none outline-none ${isDark ? "bg-stone-950 border-stone-700 text-stone-300" : "bg-stone-50 border-stone-200 text-stone-700"}`}
              />
              <div className="mt-3 text-xs text-stone-500">
                Paste this into an AI → ask it to output JSON → paste the JSON into “Paste Campaign JSON”.
              </div>
              <button
                onClick={() => setPhase("json-editor")}
                className="w-full mt-3 px-4 py-3 rounded-xl bg-stone-700 hover:bg-stone-600 text-amber-200 font-black"
              >
                📝 Go to JSON Editor
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // JSON EDITOR
  // ─────────────────────────────────────────
  if (phase === "json-editor") {
    return (
      <div className={`min-h-screen ${isDark ? "bg-stone-950 text-amber-50" : "bg-amber-50 text-stone-900"}`}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-black text-amber-700 font-cinzel">📝 Paste Campaign JSON</h1>
            <div className="flex gap-2">
              <button onClick={() => setPhase("prompt-builder")} className="px-4 py-2 rounded-xl bg-purple-900 text-purple-100 font-bold text-sm">
                🤖 Prompt Builder
              </button>
              <button onClick={() => setPhase("landing")} className="px-4 py-2 rounded-xl bg-stone-700 text-amber-200 font-bold text-sm">
                ← Back
              </button>
            </div>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonErr("");
            }}
            className={`w-full h-[420px] px-4 py-3 rounded-2xl border-2 font-mono text-sm outline-none resize-none ${isDark ? "bg-stone-900 border-amber-800/60 text-amber-100" : "bg-white border-amber-300 text-stone-900"}`}
            spellCheck={false}
            placeholder="Paste AI-generated JSON here..."
          />

          {jsonErr && <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300">{jsonErr}</div>}

          <div className="flex gap-3 mt-3">
            <button
              onClick={() => {
                try {
                  JSON.parse(jsonText);
                  alert("✅ JSON syntax OK. Now go to Party setup and start.");
                } catch (e) {
                  setJsonErr("Invalid JSON syntax. Fix and try again.");
                }
              }}
              className="flex-1 py-3 rounded-xl bg-stone-700 hover:bg-stone-600 text-amber-200 font-black"
            >
              🔍 Validate JSON
            </button>
            <button
              onClick={() => {
                try {
                  JSON.parse(jsonText);
                  setPhase("character-select");
                } catch (e) {
                  setJsonErr("Invalid JSON syntax. Fix and try again.");
                }
              }}
              className="flex-1 py-3 rounded-xl font-black"
              style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#0c0a09" }}
            >
              ⚔️ Setup Party
            </button>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-stone-900/40 border border-stone-700 text-stone-300 text-sm font-crimson">
            Note: The game uses your JSON exactly. Include betrayal scenes, PvP target choices, companions/pets, rarity shops, and timers for unique campaigns.
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────
  if (phase === "settings") {
    return (
      <div className={`min-h-screen ${isDark ? "bg-stone-950 text-amber-50" : "bg-amber-50 text-stone-900"}`}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-black text-amber-700 font-cinzel">⚙️ Settings</h1>
            <button
              onClick={() => setPhase(session ? "dungeon-event" : "landing")}
              className="px-4 py-2 rounded-xl bg-amber-600 text-stone-950 font-black"
            >
              ← Resume
            </button>
          </div>

          <div className="space-y-4">
            <SettingsCard title="🎨 Theme" dark={isDark}>
              <div className="flex gap-3">
                <button onClick={() => setIsDark(false)} className={`flex-1 py-3 rounded-xl font-black border-2 ${!isDark ? "border-amber-500 bg-amber-500/10" : "border-stone-400/30 opacity-60"}`}>
                  Light ☀️
                </button>
                <button onClick={() => setIsDark(true)} className={`flex-1 py-3 rounded-xl font-black border-2 ${isDark ? "border-amber-500 bg-amber-500/10" : "border-stone-400/30 opacity-60"}`}>
                  Dark 🌙
                </button>
              </div>
            </SettingsCard>

            <SettingsCard title="🎵 Music" dark={isDark}>
              <div className="flex items-center justify-between">
                <div className="text-sm">Background music</div>
                <Toggle on={bgmEnabled} set={(v) => {
                  setBgmEnabled(v);
                  if (!v) stopBGM();
                }} />
              </div>
              <div className="mt-3">
                <label className="text-xs text-stone-400">Volume: {Math.round(bgmVol * 100)}%</label>
                <input type="range" min={0} max={0.5} step={0.01} value={bgmVol} onChange={(e) => setBgmVol(Number(e.target.value))} className="w-full accent-amber-500" />
                <div className="text-xs text-stone-500 mt-1">Tracks: {Object.keys(BGM).join(", ")}</div>
              </div>
            </SettingsCard>

            <SettingsCard title="🔊 Sound Effects" dark={isDark}>
              <div className="flex items-center justify-between">
                <div className="text-sm">SFX</div>
                <Toggle on={sfxEnabled} set={setSfxEnabled} />
              </div>
            </SettingsCard>

            <SettingsCard title="🎙️ Voice" dark={isDark}>
              <div className="flex items-center justify-between">
                <div className="text-sm">Auto-narrate</div>
                <Toggle on={autoSpeak} set={setAutoSpeak} />
              </div>
              <div className="mt-3">
                <label className="text-xs text-stone-400">Choose voice (locks voiceURI to avoid Microsoft David)</label>
                <select value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)} className={`w-full px-3 py-3 rounded-xl border outline-none ${isDark ? "bg-stone-900 border-stone-700 text-amber-100" : "bg-white border-stone-300 text-stone-900"}`}>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} — {v.lang}
                      {v.name.toLowerCase().includes("natural") ? " (Natural)" : ""}
                      {v.name.toLowerCase().includes("microsoft david") ? " (avoid)" : ""}
                    </option>
                  ))}
                </select>
                {(() => {
                  const sel = voices.find((v) => v.voiceURI === voiceURI);
                  if (!sel) return null;
                  const isDavid = sel.name.toLowerCase().includes("microsoft david");
                  if (!isDavid) return null;
                  return (
                    <div className="mt-2 p-2 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                      ⚠️ Selected voice is Microsoft David (often low quality). Choose a "Natural" voice if available.
                    </div>
                  );
                })()}
              </div>
              <div className="mt-3">
                <label className="text-xs text-stone-400">Voice volume: {Math.round(voiceVol * 100)}%</label>
                <input type="range" min={0} max={1} step={0.05} value={voiceVol} onChange={(e) => setVoiceVol(Number(e.target.value))} className="w-full accent-amber-500" />
              </div>
              <button onClick={() => speak("Testing voice. The dungeon is listening.")} className="mt-3 w-full py-3 rounded-xl bg-stone-700 hover:bg-stone-600 text-amber-200 font-black">
                🔊 Test
              </button>
              {voiceWarn && <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-sm">{voiceWarn}</div>}
            </SettingsCard>

            <SettingsCard title="⚠️ Danger Zone" dark={isDark}>
              <button
                onClick={() => {
                  stopBGM();
                  stopSpeech();
                  setSession(null);
                  setChoiceResult(null);
                  stopTimer();
                  setPhase("landing");
                }}
                className="w-full py-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 font-black"
              >
                🚪 Abandon Campaign
              </button>
            </SettingsCard>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // BRIEFING
  // ─────────────────────────────────────────
  if (phase === "briefing" && session) {
    const p = session.party;
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: "#0c0a09" }}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="absolute inset-0">
          <img src={IMG["dungeon-bg"]} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/70 to-stone-950" />
        </div>
        <Particles n={18} />

        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
          <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-3 gap-5 an-slideUp">
            <div className="rounded-3xl border border-amber-800/30 bg-stone-900/70 glass p-5">
              <div className="text-amber-400 font-black font-cinzel text-xl mb-2">Party</div>
              <div className="space-y-3">
                {p.players.map((pl) => (
                  <div key={pl.id} className="p-3 rounded-2xl bg-stone-950/60 border border-stone-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-amber-200 font-black font-cinzel flex items-center gap-2">
                          <img
                            src={CLASS_STATS[pl.class].portrait}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover object-top"
                            style={{ border: `1px solid ${CLASS_STATS[pl.class].color}55` }}
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              const fb = CLASS_STATS[pl.class].portraitFallback;
                              if (img.src !== fb) img.src = fb;
                            }}
                          />
                          {pl.name}
                        </div>
                        <div className="text-stone-500 text-xs">{CLASS_STATS[pl.class].title}</div>
                      </div>
                      <div className="text-xs text-stone-500 font-bold">❤️ {pl.hp}/{pl.maxHp}</div>
                    </div>
                    <div className="mt-2"><HPBar hp={pl.hp} max={pl.maxHp} /></div>
                  </div>
                ))}
              </div>
              {p.companions.length > 0 && (
                <div className="mt-4">
                  <div className="text-amber-400 font-black font-cinzel mb-2">Companions & Pets</div>
                  <div className="flex flex-wrap gap-2">
                    {p.companions.map((c) => (
                      <CompanionChip key={c.id} name={c.name} emoji={c.emoji} rarity={c.rarity} description={c.description} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 rounded-3xl border border-amber-800/30 bg-stone-900/70 glass p-6">
              <div className="text-center">
                <div className="text-6xl mb-2 an-float">📜</div>
                <h1 className="text-4xl font-black text-amber-400 font-cinzel">{session.title}</h1>
                <p className="text-stone-300 text-lg mt-3 font-crimson">{session.description}</p>
              </div>

              <div className="mt-6 p-5 rounded-2xl bg-amber-950/40 border border-amber-800/40 font-crimson text-amber-100 text-lg italic leading-relaxed">
                "I am the Dungeon Master. I will tempt you with gold, threaten you with death, and occasionally offer you a way out that costs someone else. The dungeon does not ask what is right. It asks what you will do."
                <div className="text-amber-600 text-sm mt-2 not-italic font-cinzel">— {session.dmName}</div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={enterDungeon}
                  className="flex-1 py-5 rounded-2xl font-black text-2xl transition-all hover:scale-[1.01] an-pglow font-cinzel"
                  style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#0c0a09" }}
                >
                  ⚔️ Enter the Dungeon
                </button>
                <button
                  onClick={() => setPhase("character-select")}
                  className="px-6 py-5 rounded-2xl font-black text-xl bg-stone-800 border border-stone-700 text-amber-200 hover:bg-stone-700"
                >
                  ✏️ Edit Party
                </button>
              </div>

              <div className="mt-4 text-stone-500 text-sm">
                DM tip: you can change the active player each room from the top party bar.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // Ensure session ready
  // ─────────────────────────────────────────
  if (!session || !party || !ev || !activePlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 text-amber-400">
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="text-center animate-pulse">
          <div className="text-6xl mb-4">⚔️</div>
          <div className="text-2xl font-cinzel">Loading...</div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // GAME OVER / VICTORY / STORYBOOK
  // ─────────────────────────────────────────
  if (phase === "game-over") {
    const r = getSurvivalRating(party);
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: "#0c0a09" }}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="absolute inset-0"><img src={IMG["death-screen"]} alt="" className="w-full h-full object-cover opacity-30" /></div>
        <Particles n={18} color="#ef4444" />
        <div className="relative z-10 text-center max-w-3xl px-4 an-slideUp">
          <div className="text-8xl mb-4 an-hb">💀</div>
          <h1 className="text-6xl font-black text-red-500 mb-2 font-cinzel an-fire">THE PARTY FALLS</h1>
          <p className="text-stone-300 text-xl mb-6 font-crimson">Tutorly Dungeons and Dragons closes around your story.</p>

          <div className="p-6 rounded-2xl bg-stone-900/80 border border-red-900/40 glass mb-6">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Rooms" value={party.roomsCleared} emoji="🏰" color="#f59e0b" />
              <Stat label="Rating" value={r.rank} emoji="⭐" color={r.color} />
              <Stat label="Companions" value={party.companions.length} emoji="🐾" color="#a855f7" />
            </div>
            <div className="mt-4 text-2xl font-black font-cinzel" style={{ color: r.color }}>{r.title}</div>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => {
                stopSpeech();
                stopBGM();
                setSession(null);
                setChoiceResult(null);
                setPhase("character-select");
              }}
              className="px-8 py-4 rounded-2xl font-black text-xl font-cinzel"
              style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#0c0a09" }}
            >
              ⚔️ Try Again
            </button>
            <button
              onClick={() => {
                setStoryEntries(generateStorybook(session));
                setStoryPage(0);
                setPhase("storybook");
              }}
              className="px-6 py-4 rounded-2xl font-black text-lg bg-stone-900 border-2 border-stone-700 text-amber-300 hover:bg-stone-800"
            >
              📖 Chronicle
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "victory") {
    const r = getSurvivalRating(party);
    const time = session.completedAt ? formatTime(session.completedAt - party.startTime) : "";
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: "#0c0a09" }}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="absolute inset-0"><img src={IMG.victory} alt="" className="w-full h-full object-cover opacity-40" /></div>
        <Particles n={40} />
        <Particles n={18} color="#818cf8" />
        <div className="relative z-10 text-center max-w-4xl px-4 an-slideUp">
          <div className="text-8xl mb-4 an-float">🏆</div>
          <h1 className="text-6xl font-black mb-2 font-cinzel an-fire" style={{ background: "linear-gradient(135deg,#f59e0b,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            VICTORY
          </h1>
          <p className="text-amber-300 text-2xl mb-2 font-crimson">The party survives Tutorly Dungeons and Dragons.</p>

          <div className="p-6 rounded-2xl bg-stone-900/80 border border-amber-800/40 glass mb-6">
            <div className="grid grid-cols-4 gap-4">
              <Stat label="Rating" value={r.rank} emoji="⭐" color={r.color} />
              <Stat label="Time" value={time || "—"} emoji="⏱️" color="#3b82f6" />
              <Stat label="Rooms" value={party.roomsCleared} emoji="🏰" color="#f59e0b" />
              <Stat label="Companions" value={party.companions.length} emoji="🐾" color="#a855f7" />
            </div>
            <div className="mt-4 text-2xl font-black font-cinzel" style={{ color: r.color }}>{r.title}</div>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => {
                setStoryEntries(generateStorybook(session));
                setStoryPage(0);
                setPhase("storybook");
              }}
              className="px-8 py-4 rounded-2xl font-black text-xl font-cinzel"
              style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#0c0a09" }}
            >
              📖 Read Chronicle
            </button>
            <button
              onClick={() => {
                stopSpeech();
                stopBGM();
                setSession(null);
                setChoiceResult(null);
                setPhase("character-select");
              }}
              className="px-6 py-4 rounded-2xl font-black text-lg bg-stone-900 border-2 border-stone-700 text-amber-300 hover:bg-stone-800"
            >
              ⚔️ New Party
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "storybook") {
    const entries = storyEntries.length > 0 ? storyEntries : generateStorybook(session);
    const e = entries[storyPage];
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: "#1c1207" }}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="absolute inset-0">
          <img src={IMG.storybook} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-amber-950/60 to-amber-950/90" />
        </div>
        <Particles n={10} />
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-4">
              <div className="text-4xl mb-1">📖</div>
              <h1 className="text-2xl font-black text-amber-400 font-cinzel">Party Chronicle</h1>
              <p className="text-amber-700 text-xs">Page {storyPage + 1} of {entries.length}</p>
            </div>

            {e && (
              <div key={storyPage} className="rounded-3xl overflow-hidden border-4 border-amber-800/60 an-slideUp" style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
                {e.imageKey && (
                  <div className="relative h-44">
                    <img src={IMG[e.imageKey]} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-100/90" />
                    {e.isHighlight && <div className="absolute top-2 right-2 bg-amber-500 text-stone-950 text-xs font-black px-2 py-0.5 rounded-full">⭐ KEY</div>}
                    <div className="absolute bottom-2 left-2 bg-amber-900/80 text-amber-200 text-xs px-2 py-0.5 rounded font-cinzel">Room {e.room}</div>
                  </div>
                )}
                <div className="p-5">
                  <div className="text-xl font-black text-amber-900 font-cinzel">{e.event}</div>
                  <div className="mt-1 text-sm text-amber-800 font-cinzel">Actor: {e.actor}</div>
                  {e.choice && <div className="mt-2 text-sm text-amber-800">Decision: {e.choice}</div>}
                  <p className="mt-3 text-amber-900 text-lg leading-relaxed font-crimson">{e.outcome}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setStoryPage((p) => Math.max(0, p - 1))} disabled={storyPage === 0} className="px-5 py-2 rounded-xl font-black bg-amber-800 text-amber-100 disabled:opacity-30">← Prev</button>
              <div className="flex gap-1">{entries.map((_: any, i: number) => <button key={i} onClick={() => setStoryPage(i)} className="w-2 h-2 rounded-full" style={{ background: i === storyPage ? "#b45309" : "#78350f44" }} />)}</div>
              {storyPage < entries.length - 1 ? (
                <button onClick={() => setStoryPage((p) => p + 1)} className="px-5 py-2 rounded-xl font-black bg-amber-800 text-amber-100">Next →</button>
              ) : (
                <button onClick={() => setPhase(session.completedAt ? "victory" : "game-over")} className="px-5 py-2 rounded-xl font-black" style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#0c0a09" }}>← Back</button>
              )}
            </div>

            <div className="flex justify-center mt-3 gap-2">
              {e && (
                <button onClick={() => speak(`${e.event}. ${e.outcome}`)} className="px-4 py-2 rounded-xl bg-amber-800/60 text-amber-300 text-sm border border-amber-700/40">🔊 Read aloud</button>
              )}
              <button onClick={() => { stopSpeech(); setPhase("landing"); setSession(null); }} className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-sm border border-stone-700">🏠 Home</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // MAIN DUNGEON EVENT VIEW
  // ─────────────────────────────────────────

  const bg = IMG[ev.imageKey] || IMG["dungeon-bg"];
  const isBoss = ev.kind === "boss";

  // Party bar (multiplayer)
  const PartyBar = () => (
    <div className="fixed top-0 left-0 right-0 z-40 bg-stone-950/95 glass border-b border-amber-800/30">
      <div className="max-w-7xl mx-auto px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="mr-1 text-xs font-black text-amber-400 font-cinzel">PARTY</div>
          {party.players.map((pl, i) => {
            const cls = CLASS_STATS[pl.class];
            const isActive = i === party.activePlayerIndex;
            return (
              <div key={pl.id} className="flex items-center gap-1">
                <button
                  onClick={() => setActive(pl.id)}
                  className={`rounded-2xl border transition-all ${isActive ? "scale-[1.02]" : "opacity-90 hover:opacity-100"}`}
                  style={{
                    borderColor: isActive ? "#f59e0b" : RARITY[pl.heroTier].border,
                    background: isActive ? "#f59e0b18" : "#1c1917aa",
                    boxShadow: isActive ? "0 0 16px #f59e0b44" : RARITY[pl.heroTier].glow,
                  }}
                  title="Set active player"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div
                      className="relative w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center text-2xl"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${RARITY[pl.heroTier].color}55, transparent 60%), linear-gradient(135deg, ${RARITY[pl.heroTier].color}22, rgba(0,0,0,0.35))`,
                        border: `1px solid ${RARITY[pl.heroTier].border}`,
                      }}
                    >
                      {/* Class portrait; the gendered emoji is behind it and the vector
                          stand-in replaces it, so the bar never shows an empty tile. */}
                      <span className="absolute">{cls.avatars[pl.gender]}</span>
                      <img
                        src={cls.portrait}
                        alt=""
                        className="relative w-full h-full object-cover object-top"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (img.src === cls.portraitFallback) img.style.display = "none";
                          else img.src = cls.portraitFallback;
                        }}
                      />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-black font-cinzel text-amber-200 flex items-center gap-1">
                        {pl.name}
                        {pl.hp <= 0 && pl.lives <= 0 && <span className="text-red-400" title="Dead">💀</span>}
                      </div>
                      <div className="text-[10px] text-stone-500">❤️ {pl.hp}/{pl.maxHp} · 💰 {pl.gold} · ❤️ {pl.lives}</div>
                    </div>
                  </div>
                </button>

                {pl.hp <= 0 && pl.lives > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      reviveMember(pl.id);
                    }}
                    className="px-2 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-black border border-amber-400"
                    title="Revive (uses 1 life)"
                  >
                    ⚡
                  </button>
                )}
              </div>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setInventoryOpen((v) => !v)} className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-amber-300" title="Inventory">
              🎒
            </button>
            <button onClick={() => setStashOpen((v) => !v)} className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-amber-300" title="Party stash">
              🧰
            </button>
            <button onClick={() => setPhase("settings")} className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-amber-300" title="Settings">
              ⚙️
            </button>
          </div>
        </div>

        {/* Companions row */}
        {party.companions.length > 0 && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <div className="text-[10px] font-black text-amber-500 font-cinzel">COMPANIONS</div>
            {party.companions.map((c) => (
              <CompanionChip key={c.id} name={c.name} emoji={c.emoji} rarity={c.rarity} description={c.perks.join(" · ")} />
            ))}
          </div>
        )}
      </div>

      {/* Inventory panels */}
      {(inventoryOpen || stashOpen) && (
        <div className="max-w-7xl mx-auto px-3 pb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inventoryOpen && (
              <div className="p-3 rounded-2xl bg-stone-900 border border-amber-800/30 an-slideUp">
                <div className="text-xs font-black text-amber-400 font-cinzel mb-2">🎒 {activePlayer.name}'s Inventory ({activePlayer.inventory.length})</div>
                {activePlayer.inventory.length === 0 ? (
                  <div className="text-xs text-stone-500">Empty — buy loot or earn it in rooms.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activePlayer.inventory.map((it, i) => (
                      <ItemCard key={`${it.id}-${i}`} item={it} right={{ label: "Use", onClick: () => handleUseItem(activePlayer.id, it.id) }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {stashOpen && (
              <div className="p-3 rounded-2xl bg-stone-900 border border-amber-800/30 an-slideUp">
                <div className="text-xs font-black text-amber-400 font-cinzel mb-2">🧰 Party Stash ({party.stash.length})</div>
                {party.stash.length === 0 ? (
                  <div className="text-xs text-stone-500">Empty — some campaigns will put shared loot here.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {party.stash.map((it, i) => (
                      <ItemCard key={`${it.id}-${i}`} item={it} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0c0a09" }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="fixed inset-0 z-0">
        <img src={bg} alt="" className="w-full h-full object-cover opacity-35" style={{ filter: isBoss ? "hue-rotate(20deg) saturate(180%)" : "none" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/60 via-stone-950/35 to-stone-950/90" />
      </div>

      <div className="fixed top-16 left-4 w-2 h-10 rounded-full opacity-50 pointer-events-none" style={{ background: "#f97316", boxShadow: "0 0 16px #f9731688", animation: "flicker 2s ease-in-out infinite" }} />
      <div className="fixed top-16 right-4 w-2 h-10 rounded-full opacity-50 pointer-events-none" style={{ background: "#f97316", boxShadow: "0 0 16px #f9731688", animation: "flicker 2.3s ease-in-out infinite" }} />

      <Particles n={12} color={isBoss ? "#ef4444" : "#f59e0b44"} />

      <PartyBar />

      <div className={`relative z-10 pt-28 pb-16 px-4 min-h-screen ${shake ? "an-shake" : ""}`}>
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-4 an-slideUp">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-stone-950/80 border border-amber-800/40">
              <span className="text-xs text-amber-600 font-black font-cinzel">
                CHAPTER {ev.chapter} · ROOM {session.currentEventIndex + 1}/{session.totalRooms}
              </span>
              {isBoss && <span className="text-xs font-black text-red-400 an-fire">🔥 BOSS</span>}
              {renderTimer()}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-amber-300 mt-3 font-cinzel">{ev.title}</h2>
          </div>

          {/* Host */}
          {hostText && (
            <div className="rounded-2xl border p-4 mb-4 glass bg-amber-950/75 border-amber-700/40 an-slideUp">
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-amber-900/60 border-2 border-amber-500 flex items-center justify-center text-2xl an-pglow">🧙</div>
                <div className="flex-1">
                  <div className="text-sm font-black text-amber-400 font-cinzel mb-1">{session.dmName} (DM)</div>
                  <p className="text-amber-100 text-base leading-relaxed font-crimson italic">"{hostText}"</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => speak(hostText)} className="p-2 rounded-lg bg-amber-800/40 hover:bg-amber-700/40 text-amber-300 text-xs">🔊</button>
                  <button onClick={stopSpeech} className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs">⏹️</button>
                </div>
              </div>
            </div>
          )}

          {/* Narrative */}
          <div className="rounded-2xl bg-stone-900/60 border border-stone-700 p-5 mb-5 an-slideUp glass">
            <p className="text-amber-100 text-lg leading-relaxed font-crimson">{ev.narration}</p>
          </div>

          {/* Encounter Panels (monster / trap / treasure / jumpscare) */}
          {(ev.monster || ev.trap || ev.treasure || ev.jumpscare) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 an-slideUp">
              {ev.trap && (
                <div className="rounded-2xl border-2 border-red-900/60 bg-red-950/20 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-red-400 font-black font-cinzel text-xl">⚠️ {ev.trap.name}</div>
                      <div className="text-stone-400 text-sm font-crimson mt-1">{ev.trap.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-300 font-black">-{ev.trap.damage} HP</div>
                      <div className="text-[11px] text-stone-500">Avoid: {ev.trap.avoidStat.toUpperCase()} DC {ev.trap.avoidDC}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-stone-400">
                    Tip: companions can add bonuses to the party’s stat checks.
                  </div>
                </div>
              )}

              {ev.monster && (
                <div className={`rounded-2xl border-2 p-5 ${ev.monster.isBoss ? "border-red-700/70 bg-red-950/10" : "border-purple-700/60 bg-purple-950/10"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-amber-300 font-black font-cinzel text-xl">{ev.monster.isBoss ? "🐉 BOSS" : "👹 ENEMY"} — {ev.monster.name}</div>
                      <div className="text-stone-400 text-sm font-crimson mt-1">{ev.monster.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-300 font-black">HP {ev.monster.hp}</div>
                      <div className="text-[11px] text-stone-500">ATK -{ev.monster.attackDamage}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-stone-900/50 border border-stone-700">
                      <div className="text-stone-500">Loot Gold</div>
                      <div className="text-amber-400 font-black">+{ev.monster.lootGold} 💰</div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-900/50 border border-stone-700">
                      <div className="text-stone-500">Loot XP</div>
                      <div className="text-purple-400 font-black">+{ev.monster.lootXP} XP</div>
                    </div>
                  </div>
                  {ev.monster.weaknessHint && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs font-crimson">
                      💡 Weakness: {ev.monster.weaknessHint}
                    </div>
                  )}
                  {ev.monster.loot && (
                    <div className="mt-3">
                      <ItemCard item={ev.monster.loot} />
                    </div>
                  )}
                </div>
              )}

              {ev.treasure && (
                <div className="rounded-2xl border-2 border-amber-700/60 bg-amber-950/10 p-5 md:col-span-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-amber-400 font-black font-cinzel text-xl">💎 {ev.treasure.name}</div>
                      <div className="text-stone-400 text-sm font-crimson mt-1">{ev.treasure.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-300 font-black">+{ev.treasure.gold} 💰</div>
                      <div className="text-purple-300 font-black">+{ev.treasure.xp} XP</div>
                    </div>
                  </div>
                  {ev.treasure.loot && (
                    <div className="mt-3 max-w-sm">
                      <ItemCard item={ev.treasure.loot} />
                    </div>
                  )}
                  {ev.treasure.trapped && (
                    <div className="mt-3 p-3 rounded-xl bg-red-950/20 border border-red-800/40 text-red-300 text-xs">
                      ⚠️ Trapped treasure: potential damage -{ev.treasure.trapDamage || 0} HP
                    </div>
                  )}
                </div>
              )}

              {ev.jumpscare && (
                <div className="rounded-2xl border-2 border-stone-700 bg-stone-950/30 p-5 md:col-span-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-stone-200 font-black font-cinzel text-xl">👁️ Jumpscare: {ev.jumpscare.name}</div>
                      <div className="text-stone-400 text-sm font-crimson mt-1">{ev.jumpscare.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-300 font-black">Shock -{ev.jumpscare.damage} HP</div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 rounded-xl bg-stone-900/40 border border-stone-700 text-stone-300 text-xs font-crimson">
                    {ev.jumpscare.scare}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Merchant shop button */}
          {ev.kind === "merchant" && ev.merchant && (
            <div className="rounded-2xl border border-emerald-700/60 bg-emerald-950/20 p-5 mb-5 an-slideUp">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-emerald-400 font-black font-cinzel text-xl">🛒 {ev.merchant.name}</div>
                  <div className="text-stone-400 text-sm font-crimson italic">"{ev.merchant.greeting}"</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 font-black text-xl">{activePlayer.gold} 💰</div>
                  <div className="text-xs text-stone-500">Active player gold</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <button onClick={() => setShopOpen((v) => !v)} className="px-5 py-3 rounded-xl font-black bg-emerald-700 hover:bg-emerald-600 text-white">
                  {shopOpen ? "Close shop" : "Open shop"}
                </button>
                <button onClick={advanceRoom} className="px-5 py-3 rounded-xl font-black" style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#0c0a09" }}>
                  Continue →
                </button>
              </div>

              {shopOpen && (
                <div className="mt-4">
                  <div className="flex gap-2 flex-wrap mb-3">
                    {(["all", "common", "rare", "epic", "legendary"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setShopRarity(r)}
                        className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${shopRarity === r ? "border-amber-500 bg-amber-500/20 text-amber-300" : "border-stone-700 bg-stone-900/40 text-stone-400"}`}
                      >
                        {r === "all" ? "🛒 ALL" : r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ev.merchant.items
                      .filter((it) => shopRarity === "all" || it.rarity === shopRarity)
                      .map((it, i) => {
                        const cost = getBuyPrice(it);
                        return (
                          <ItemCard
                            key={`${it.id}-${i}`}
                            item={it}
                            right={{ label: `Buy ${cost} 💰`, onClick: () => handleBuy(it), disabled: activePlayer.gold < cost }}
                          />
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Choices */}
          {!choiceResult && ev.choices.length > 0 && (
            <div className="space-y-3 an-slideUp">
              <div className="text-center mb-2">
                <span className="text-amber-400 text-xl font-black font-cinzel">⚔️ Choose</span>
                <div className="text-stone-400 text-sm font-crimson">Active player: {CLASS_STATS[activePlayer.class].emoji} {activePlayer.name}</div>
              </div>
              {ev.choices.map((ch) => {
                const riskCol = ch.riskLevel === "deadly" ? "#ef4444" : ch.riskLevel === "risky" ? "#f59e0b" : "#22c55e";
                const applyTo = ch.applyTo || "party";
                const elapsed = timeMax !== null && timeLeft !== null ? Math.max(0, timeMax - timeLeft) : 0;
                const expired = typeof ch.timeLimitSec === "number" && elapsed > ch.timeLimitSec;
                return (
                  <button
                    key={ch.id}
                    onClick={() => !expired && onPickChoice(ch)}
                    disabled={expired}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed ${expired ? "opacity-40" : ""}`}
                    style={{ borderColor: "#4b5563", background: "#1c1917aa" }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl flex-shrink-0">{ch.emoji}</div>
                      <div className="flex-1">
                        <div className="font-black text-amber-200 text-lg font-cinzel">{ch.label}</div>
                        <div className="text-stone-400 text-sm mt-0.5 font-crimson">{ch.description}</div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black px-2 py-1 rounded-full border" style={{ color: riskCol, borderColor: riskCol, background: `${riskCol}22` }}>
                            {ch.riskLevel === "deadly" ? "💀 DEADLY" : ch.riskLevel === "risky" ? "⚠️ RISKY" : "🟢 SAFE"}
                          </span>
                          <span className="text-[10px] text-stone-500 font-bold">
                            Affects: {applyTo === "party" ? "Party" : applyTo === "active" ? "Active" : "Target"}{ch.requiresTargetPlayer ? " (choose target)" : ""}
                          </span>
                          {ch.skillCheck && (
                            <span className="text-[10px] text-stone-500 font-bold">
                              🎲 {ch.skillCheck.stat.toUpperCase()} DC {ch.skillCheck.dc}
                            </span>
                          )}
                          {typeof ch.timeLimitSec === "number" && (
                            <span className="text-[10px] font-bold" style={{ color: expired ? "#ef4444" : "#a8a29e" }}>
                              {expired ? "⛔ EXPIRED" : `⏳ ${ch.timeLimitSec}s`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-stone-500 space-y-0.5">
                        {ch.hpChange !== 0 && <div style={{ color: ch.hpChange > 0 ? "#22c55e" : "#ef4444" }}>{ch.hpChange > 0 ? "+" : ""}{ch.hpChange} HP</div>}
                        {ch.goldChange !== 0 && <div className="text-amber-400">{ch.goldChange > 0 ? "+" : ""}{ch.goldChange} 💰</div>}
                        {ch.xpChange !== 0 && <div className="text-purple-400">+{ch.xpChange} XP</div>}
                        {ch.grantsItem && <div style={{ color: RARITY[ch.grantsItem.rarity].color }}>{ch.grantsItem.emoji} Loot</div>}
                        {ch.addCompanion && <div style={{ color: RARITY[ch.addCompanion.rarity].color }}>{ch.addCompanion.emoji} Companion</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Target modal */}
          {targetModal && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4 an-fadeIn">
              <div className="max-w-xl w-full rounded-3xl border border-amber-700/40 bg-stone-950 p-6">
                <div className="text-2xl font-black text-amber-300 font-cinzel mb-2">Choose Target Player</div>
                <div className="text-stone-400 font-crimson mb-4">For: {targetModal.choice.emoji} {targetModal.choice.label}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {party.players.map((pl) => (
                    <button key={pl.id} onClick={() => onPickTarget(pl.id)} className="p-4 rounded-2xl border border-stone-700 bg-stone-900 hover:bg-stone-800 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="text-amber-200 font-black font-cinzel flex items-center gap-2">
                          <img
                            src={CLASS_STATS[pl.class].portrait}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover object-top"
                            style={{ border: `1px solid ${CLASS_STATS[pl.class].color}55` }}
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              const fb = CLASS_STATS[pl.class].portraitFallback;
                              if (img.src !== fb) img.src = fb;
                            }}
                          />
                          {pl.name}
                        </div>
                        <div className="text-xs text-stone-500">❤️ {pl.hp}/{pl.maxHp}</div>
                      </div>
                      <div className="mt-2"><HPBar hp={pl.hp} max={pl.maxHp} /></div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setTargetModal(null)} className="w-full mt-4 py-3 rounded-xl bg-stone-800 border border-stone-700 text-stone-300 font-black">Cancel</button>
              </div>
            </div>
          )}

          {/* Result card */}
          {choiceResult && (
            <div className="mt-5 rounded-2xl border-2 p-6 an-slideUp" style={{ borderColor: "#f59e0b", background: "#f59e0b10" }}>
              {choiceResult.roll && (
                <div className="text-center mb-4 p-4 rounded-2xl bg-stone-900/60 border border-stone-700">
                  <div className="text-4xl mb-2" style={{ animation: "d20spin 1s ease-out" }}>🎲</div>
                  <div className="text-2xl font-black font-cinzel" style={{ color: choiceResult.roll.success ? "#22c55e" : "#ef4444" }}>
                    d20: {choiceResult.roll.roll} + {choiceResult.roll.mod} + {choiceResult.roll.partyBonus} = {choiceResult.roll.total}
                  </div>
                  <div className="text-sm text-stone-400">{choiceResult.roll.success ? "✅ SUCCESS" : "❌ FAIL"}{choiceResult.roll.rerolled ? " (reroll)" : ""}</div>
                </div>
              )}

              <div className="text-2xl font-black text-amber-300 font-cinzel text-center">
                {choiceResult.choice.emoji} {choiceResult.choice.label}
              </div>
              <div className="text-center text-stone-400 mt-1">Actor: {party.players.find((p) => p.id === choiceResult.actorId)?.name || ""}</div>
              <p className="mt-4 text-amber-100 text-lg leading-relaxed font-crimson text-center">
                {choiceResult.choice.outcomeNarration}
              </p>
              <div className="mt-5 flex justify-center">
                <button
                  onClick={() => {
                    setChoiceResult(null);
                    advanceRoom();
                  }}
                  className="px-10 py-4 rounded-xl font-black text-lg hover:scale-105 transition-all font-cinzel"
                  style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#0c0a09", boxShadow: "0 0 20px #f59e0b44" }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floats */}
      <div className="fixed bottom-20 left-0 right-0 pointer-events-none z-50 flex flex-col items-center gap-1">
        {floats.map((f) => (
          <div key={f.id} className="font-black text-xl px-4 py-1 rounded-full" style={{ color: f.color, textShadow: `0 0 8px ${f.color}`, animation: "xpUp 1.8s ease-out forwards" }}>
            {f.text}
          </div>
        ))}
        {levelUp && (
          <div className="text-2xl font-black px-6 py-2 rounded-2xl border-2 an-fadeIn" style={{ color: "#f59e0b", borderColor: "#f59e0b", background: "#1c1917", boxShadow: "0 0 30px #f59e0b44" }}>
            {levelUp}
          </div>
        )}
      </div>
    </div>
  );
}

function outcomeForDM(choice: SurvivalChoice): string {
  return choice.outcomeNarration;
}

function substitute(t: string, vars: Record<string, string>) {
  let out = t;
  Object.entries(vars).forEach(([k, v]) => {
    const token = `{${k}}`;
    // Avoid String.prototype.replaceAll for older TS targets
    out = out.split(token).join(v);
  });
  return out;
}

function Field({
  label,
  value,
  set,
  placeholder,
  dark,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  placeholder: string;
  dark: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-1 font-cinzel" style={{ color: dark ? "#fbbf24" : "#b45309" }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`w-full px-3 py-3 rounded-xl border outline-none ${dark ? "bg-stone-950 border-stone-700 text-amber-100" : "bg-white border-amber-300 text-stone-900"}`}
        placeholder={placeholder}
      />
    </div>
  );
}

function SettingsCard({ title, children, dark }: { title: string; children: any; dark: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${dark ? "bg-stone-900 border-stone-700" : "bg-white border-stone-200"}`}>
      <h3 className="font-black text-base mb-3 font-cinzel" style={{ color: dark ? "#fbbf24" : "#b45309" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <button onClick={() => set(!on)} className={`relative w-12 h-6 rounded-full transition-all ${on ? "bg-amber-500" : "bg-stone-600"}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}

function Stat({ label, value, emoji, color }: { label: string; value: any; emoji: string; color: string }) {
  return (
    <div className="text-center p-3 rounded-2xl bg-stone-800/60">
      <div className="text-xl mb-1">{emoji}</div>
      <div className="text-2xl font-black font-cinzel" style={{ color }}>{value}</div>
      <div className="text-stone-400 text-xs">{label}</div>
    </div>
  );
}
