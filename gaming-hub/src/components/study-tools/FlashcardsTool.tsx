import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  FlashPayload, FlashItem, ItemStat, ItemStatsMap, GameMode, SoundEngine, VoiceEngine, MusicEngine,
  DEMO_PAYLOAD, getEvolutionStage, getLoveLevel, xpToLevel, xpProgress, xpToNextLevel,
  getNextCardIndex, getStreakMessage, DIFFICULTY_CONFIG, Difficulty, shuffleArray, getDistractors,
  launchConfetti, RARITY_CONFIG, SessionStats, calculateAttackPower, calculateDefensePower,
  createNewSession, formatSessionTime, getRandomMascotReaction, MascotState, getRandomQuote,
  MUSIC_TRACKS, rollGacha, GachaState, PITY_LEGENDARY, PITY_EPIC, Rarity, generateFlashcardsPDF,
} from "./flashcards";

const sfx = new SoundEngine();
const voice = new VoiceEngine();
const music = new MusicEngine();

// ═══════════════════════════════════════════════════════════
// ANIMATED MASCOT
// ═══════════════════════════════════════════════════════════
function Mascot({ state, onSpeak }: { state: MascotState; onSpeak?: () => void }) {
  const getMascotEmoji = () => {
    switch (state.mood) {
      case "happy": return "😊"; case "excited": return "🤩"; case "proud": return "😎";
      case "worried": return "😰"; case "sad": return "😢"; case "love": return "🥰";
      case "thinking": return "🤔"; case "sleeping": return "😴"; case "celebrating": return "🥳";
      default: return "🦉";
    }
  };
  const getAnimation = () => {
    switch (state.animation) {
      case "bounce": return { y: [0, -15, 0], transition: { duration: 0.5, repeat: 2 } };
      case "spin": return { rotate: [0, 360], transition: { duration: 0.8 } };
      case "shake": return { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } };
      case "float": return { y: [0, -8, 0], transition: { duration: 2, repeat: Infinity } };
      case "dance": return { rotate: [-10, 10, -10, 10, 0], scale: [1, 1.1, 1], transition: { duration: 0.6 } };
      case "wave": return { rotate: [0, 15, -15, 15, 0], transition: { duration: 0.8 } };
      default: return { scale: [1, 1.02, 1], transition: { duration: 2, repeat: Infinity } };
    }
  };
  return (
    <motion.div className="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer select-none"
      style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.3)" }}
      onClick={onSpeak} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <motion.div className="text-4xl" animate={getAnimation()}>{getMascotEmoji()}</motion.div>
      <div className="flex-1 min-w-0">
        <motion.p key={state.message} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-bold text-white/90">{state.message}</motion.p>
        <p className="text-xs text-indigo-400/60 mt-0.5">Click to hear me! 🔊</p>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// SESSION TIMER
// ═══════════════════════════════════════════════════════════
function SessionTimer({ session }: { session: SessionStats }) {
  const [time, setTime] = useState(formatSessionTime(session.startTime));
  useEffect(() => {
    const interval = setInterval(() => setTime(formatSessionTime(session.startTime)), 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
      <span className="text-emerald-400">⏱️ {time}</span>
      <span className="text-white/40">|</span>
      <span className="text-emerald-400">✓{session.correctAnswers}</span>
      <span className="text-red-400">✗{session.wrongAnswers}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MUSIC PLAYER
// ═══════════════════════════════════════════════════════════
function MusicPlayer({ isPlaying, currentTrack, onSelectTrack }: { isPlaying: boolean; currentTrack: string | null; onSelectTrack: (id: string) => void }) {
  const [showList, setShowList] = useState(false);
  return (
    <div className="relative">
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowList(!showList)}
        className="w-9 h-9 rounded-xl flex items-center justify-center border text-sm"
        style={{ background: isPlaying ? "#10b98122" : "rgba(255,255,255,0.05)", borderColor: isPlaying ? "#10b981" : "rgba(255,255,255,0.1)" }}>
        {isPlaying ? "🎵" : "🔇"}
      </motion.button>
      <AnimatePresence>
        {showList && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 top-12 w-56 rounded-xl border p-2 z-50"
            style={{ background: "rgba(15,23,42,0.98)", borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="text-xs font-bold text-white/40 px-2 mb-2">🎶 Background Music</div>
            {MUSIC_TRACKS.map((track) => (
              <button key={track.id} onClick={() => { onSelectTrack(track.id); setShowList(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left hover:bg-white/5"
                style={{ background: currentTrack === track.id ? "rgba(16,185,129,0.15)" : "transparent" }}>
                <span className="text-lg">{track.emoji}</span>
                <div className="flex-1"><div className="text-xs font-bold text-white/80">{track.name}</div></div>
                {currentTrack === track.id && <span className="text-emerald-400 text-xs">▶</span>}
              </button>
            ))}
            <button onClick={() => { music.stop(); setShowList(false); }} className="w-full mt-1 px-2 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-white/5">
              ⏹ Stop Music
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CARD SHIMMER
// ═══════════════════════════════════════════════════════════
function CardShimmer({ rarity }: { rarity: Rarity }) {
  if (!RARITY_CONFIG[rarity].shimmer) return null;
  return (
    <motion.div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden">
      <motion.div className="absolute inset-0"
        style={{ background: `linear-gradient(105deg, transparent 40%, ${RARITY_CONFIG[rarity].color}33 45%, ${RARITY_CONFIG[rarity].color}66 50%, ${RARITY_CONFIG[rarity].color}33 55%, transparent 60%)`, backgroundSize: "200% 200%" }}
        animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// ETYMOLOGY PANEL
// ═══════════════════════════════════════════════════════════
function EtymologyPanel({ item }: { item: FlashItem }) {
  const [expanded, setExpanded] = useState(false);
  if (!item.etymology && !item.examples?.length && !item.wordFamily?.length) return null;
  return (
    <div className="w-full mt-3">
      <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="w-full text-xs font-bold text-indigo-400/70 py-1">
        {expanded ? "▼ Hide Details" : "▶ Etymology & Examples"}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-3 pt-3">
              {item.etymology && (
                <div className="p-3 rounded-xl border" style={{ background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.2)" }}>
                  <div className="text-xs font-bold text-purple-400 mb-1">📜 Etymology</div>
                  <div className="text-xs text-white/80"><span className="font-bold text-purple-300">{item.etymology.root}</span> ({item.etymology.origin})</div>
                  <div className="text-xs text-white/60 mt-1">{item.etymology.meaning}</div>
                  {item.etymology.relatedWords && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.etymology.relatedWords.map((w, i) => <span key={i} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }}>{w}</span>)}
                    </div>
                  )}
                </div>
              )}
              {item.wordFamily && item.wordFamily.length > 0 && (
                <div className="p-3 rounded-xl border" style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.2)" }}>
                  <div className="text-xs font-bold text-blue-400 mb-2">🌳 Word Family</div>
                  <div className="flex flex-wrap gap-1">{item.wordFamily.map((w, i) => <span key={i} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd" }}>{w}</span>)}</div>
                </div>
              )}
              {item.examples && item.examples.length > 0 && (
                <div className="p-3 rounded-xl border" style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.2)" }}>
                  <div className="text-xs font-bold text-emerald-400 mb-2">📰 Real-World Examples</div>
                  <div className="space-y-2">{item.examples.map((ex, i) => (
                    <div key={i} className="text-xs"><p className="text-white/80 italic">"{ex.text}"</p>{ex.source && <p className="text-emerald-400/60 mt-0.5">— {ex.source}</p>}</div>
                  ))}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SESSION REVIEW
// ═══════════════════════════════════════════════════════════
function SessionReview({ session, onClose, onShare }: { session: SessionStats; onClose: () => void; onShare: () => void }) {
  const accuracy = session.cardsStudied > 0 ? Math.round((session.correctAnswers / session.cardsStudied) * 100) : 0;
  const quote = getRandomQuote();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-3xl border p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: "linear-gradient(135deg, #0f172a, #1e1b4b)", borderColor: "#6366f144" }}>
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">{accuracy >= 80 ? "🏆" : accuracy >= 50 ? "👍" : "💪"}</div>
          <h2 className="text-2xl font-black text-white">Session Complete!</h2>
          <p className="text-white/50 text-sm mt-1">Duration: {formatSessionTime(session.startTime)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[{ label: "Cards", value: session.cardsStudied, color: "#3b82f6", icon: "📚" },
            { label: "Accuracy", value: `${accuracy}%`, color: accuracy >= 70 ? "#10b981" : "#f59e0b", icon: "🎯" },
            { label: "XP", value: session.xpEarned, color: "#f59e0b", icon: "⭐" },
            { label: "Streak", value: session.maxStreak, color: "#ef4444", icon: "🔥" }
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl border text-center" style={{ background: `${stat.color}11`, borderColor: `${stat.color}33` }}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
        {session.wrongCards.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-black text-red-400 mb-3">📝 Review ({session.wrongCards.length})</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {session.wrongCards.map((card) => (
                <div key={card.id} className="p-3 rounded-xl border" style={{ background: "#ef444411", borderColor: "#ef444433" }}>
                  <div className="font-bold text-white text-sm">{card.front}</div>
                  <div className="text-xs text-white/60 mt-1">{card.back}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="p-4 rounded-xl border mb-6 text-center" style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.2)" }}>
          <p className="text-sm italic text-white/80">"{quote.quote}"</p>
          <p className="text-xs text-indigo-400 mt-1">— {quote.author}</p>
        </div>
        <div className="flex gap-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={onShare} className="flex-1 py-3 rounded-xl font-bold text-sm border" style={{ background: "#10b98122", borderColor: "#10b981", color: "#10b981" }}>📤 Share</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white" }}>Continue</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// GACHA MODE
// ═══════════════════════════════════════════════════════════
function GachaMode({ gachaState, onPull, onCollect }: { gachaState: GachaState; onPull: (count: number) => FlashItem[]; onCollect: (cards: FlashItem[]) => void }) {
  const [phase, setPhase] = useState<"idle" | "pulling" | "reveal">("idle");
  const [pulledCards, setPulledCards] = useState<FlashItem[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const handlePull = (count: number) => {
    setPhase("pulling"); sfx.play("gacha");
    setTimeout(() => { const cards = onPull(count); setPulledCards(cards); setRevealIndex(0); setPhase("reveal"); }, 1500);
  };
  const revealNext = () => {
    if (revealIndex < pulledCards.length - 1) {
      const card = pulledCards[revealIndex + 1];
      if ((card.rarity || "common") === "legendary") { sfx.play("legendary"); launchConfetti("legendary"); }
      else if ((card.rarity || "common") === "epic") { sfx.play("gacha"); launchConfetti("perfect"); }
      else sfx.play("cardFlip");
      setRevealIndex(revealIndex + 1);
    } else { onCollect(pulledCards); setPhase("idle"); setPulledCards([]); }
  };
  const currentCard = pulledCards[revealIndex];
  return (
    <div className="w-full max-w-2xl mx-auto">
      {phase === "idle" && (
        <div className="text-center space-y-6">
          <motion.div className="text-8xl mb-4" animate={{ y: [0, -10, 0], rotate: [0, -5, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>🎁</motion.div>
          <h2 className="text-2xl font-black text-white">Card Pack Opening</h2>
          <p className="text-white/50 text-sm">Pity: Epic in {PITY_EPIC - gachaState.pullsSinceEpic} | Legendary in {PITY_LEGENDARY - gachaState.pullsSinceLegendary}</p>
          <div className="flex flex-col gap-3">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handlePull(1)} className="py-4 rounded-2xl font-black text-lg" style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "white" }}>🎴 Single Pull</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handlePull(5)} className="py-4 rounded-2xl font-black text-lg" style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "white" }}>🎴 × 5 Multi-Pull</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handlePull(10)} className="py-4 rounded-2xl font-black text-lg relative overflow-hidden" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white" }}>
              <motion.div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }} animate={{ x: ["-100%", "100%"] }} transition={{ duration: 2, repeat: Infinity }} />
              <span className="relative">🎴 × 10 Mega Pull (Epic Guaranteed!)</span>
            </motion.button>
          </div>
        </div>
      )}
      {phase === "pulling" && (
        <div className="text-center">
          <motion.div className="text-9xl mb-6" animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>✨</motion.div>
          <h2 className="text-2xl font-black text-white">Opening...</h2>
        </div>
      )}
      {phase === "reveal" && currentCard && (
        <div className="text-center" onClick={revealNext}>
          <motion.div key={revealIndex} initial={{ rotateY: 180, scale: 0.5 }} animate={{ rotateY: 0, scale: 1 }} transition={{ duration: 0.6, type: "spring" }}
            className="relative mx-auto w-64 h-80 rounded-3xl border-4 p-6 flex flex-col items-center justify-center cursor-pointer"
            style={{ background: RARITY_CONFIG[currentCard.rarity || "common"].bgGradient, borderColor: RARITY_CONFIG[currentCard.rarity || "common"].borderColor, boxShadow: `0 0 60px ${RARITY_CONFIG[currentCard.rarity || "common"].glowColor}` }}>
            <CardShimmer rarity={currentCard.rarity || "common"} />
            <div className="text-xs font-black px-3 py-1 rounded-full mb-4" style={{ background: "rgba(0,0,0,0.3)", color: RARITY_CONFIG[currentCard.rarity || "common"].color }}>{RARITY_CONFIG[currentCard.rarity || "common"].emoji} {RARITY_CONFIG[currentCard.rarity || "common"].label}</div>
            <h3 className="text-2xl font-black text-white text-center mb-2">{currentCard.front}</h3>
            <p className="text-sm text-white/70 text-center">{currentCard.back}</p>
          </motion.div>
          <p className="text-sm text-white/50 mt-6">{revealIndex + 1}/{pulledCards.length} — Tap to continue</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BACKGROUND
// ═══════════════════════════════════════════════════════════
function NebulaBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <motion.div className="absolute rounded-full opacity-15" style={{ width: 600, height: 600, left: "-10%", top: "-10%", background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", filter: "blur(80px)" }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }} transition={{ duration: 15, repeat: Infinity }} />
      <motion.div className="absolute rounded-full opacity-15" style={{ width: 500, height: 500, right: "-5%", bottom: "10%", background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", filter: "blur(80px)" }}
        animate={{ x: [0, -20, 0], y: [0, -30, 0] }} transition={{ duration: 18, repeat: Infinity, delay: 3 }} />
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div key={i} className="absolute rounded-full bg-white" style={{ left: `${(i * 7.3 + 13) % 100}%`, top: `${(i * 11.7 + 7) % 100}%`, width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1 }}
          animate={{ opacity: [0.1, 0.5, 0.1] }} transition={{ duration: 2 + (i % 5), repeat: Infinity, delay: (i * 0.3) % 5 }} />
      ))}
    </div>
  );
}

function XPBar({ xp, streak }: { xp: number; streak: number }) {
  const level = xpToLevel(xp);
  const progress = xpProgress(xp);
  const stage = getEvolutionStage(level);
  const streakMsg = getStreakMessage(streak);
  return (
    <div className="flex items-center gap-3 w-full">
      <motion.div className="text-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>{stage.emoji}</motion.div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-white/60">Lv.{level} {stage.title}</span>
          <span className="text-xs font-bold text-yellow-400">{progress}/100 XP</span>
        </div>
        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #f59e0b, #ec4899, #8b5cf6)" }} animate={{ width: `${progress}%` }} />
        </div>
      </div>
      {streakMsg && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs font-black text-orange-400 px-2 py-0.5 rounded-full border border-orange-400/30 bg-orange-400/10">{streakMsg}</motion.div>}
      <div className="flex items-center gap-1"><span className="text-lg">🔥</span><span className="text-sm font-black text-orange-300">{streak}</span></div>
    </div>
  );
}

const MODE_CONFIG: Record<GameMode, { icon: string; label: string; color: string }> = {
  classic: { icon: "🃏", label: "Classic", color: "#6366f1" },
  xpQuest: { icon: "⚔️", label: "RPG", color: "#f59e0b" },
  race: { icon: "⏱️", label: "Race", color: "#ef4444" },
  speak: { icon: "🎤", label: "Speak", color: "#3b82f6" },
  cardBattle: { icon: "🎴", label: "Battle", color: "#10b981" },
  swipe: { icon: "💕", label: "Swipe", color: "#ec4899" },
  gacha: { icon: "🎁", label: "Gacha", color: "#a855f7" },
};

function ModeTabBar({ mode, setMode }: { mode: GameMode; setMode: (m: GameMode) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
      {(Object.keys(MODE_CONFIG) as GameMode[]).map((m) => {
        const cfg = MODE_CONFIG[m];
        return (
          <motion.button key={m} onClick={() => { sfx.play("whoosh"); setMode(m); }} whileTap={{ scale: 0.92 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black shrink-0 border"
            style={{ background: mode === m ? `${cfg.color}22` : "rgba(255,255,255,0.05)", borderColor: mode === m ? cfg.color : "rgba(255,255,255,0.1)", color: mode === m ? cfg.color : "rgba(255,255,255,0.5)" }}>
            <span className="text-base">{cfg.icon}</span><span className="hidden sm:inline">{cfg.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CLASSIC MODE
// ═══════════════════════════════════════════════════════════
function ClassicMode({ item, onCorrect, onWrong }: { item: FlashItem; onCorrect: (d: Difficulty) => void; onWrong: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const rarity = item.rarity || "common";
  useEffect(() => { setFlipped(false); }, [item.id]);
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div style={{ perspective: "1200px" }} onClick={() => { sfx.play("cardFlip"); setFlipped(!flipped); }}>
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.55 }} style={{ transformStyle: "preserve-3d" }} className="w-full min-h-[380px] cursor-pointer relative">
          <div className="absolute inset-0 rounded-3xl p-6 flex flex-col items-center justify-center select-none overflow-hidden"
            style={{ backfaceVisibility: "hidden", background: RARITY_CONFIG[rarity].bgGradient, border: `2px solid ${RARITY_CONFIG[rarity].borderColor}44`, boxShadow: `0 25px 60px rgba(0,0,0,0.5), 0 0 40px ${RARITY_CONFIG[rarity].glowColor}` }}>
            <CardShimmer rarity={rarity} />
            <div className="text-xs font-bold px-3 py-1 rounded-full mb-4" style={{ background: "rgba(0,0,0,0.3)", color: RARITY_CONFIG[rarity].color }}>{RARITY_CONFIG[rarity].emoji} {RARITY_CONFIG[rarity].label}</div>
            <motion.h2 key={item.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-4xl sm:text-6xl font-black text-white text-center" style={{ textShadow: `0 0 30px ${RARITY_CONFIG[rarity].glowColor}` }}>{item.front}</motion.h2>
            <div className="absolute bottom-4 text-xs text-white/30 font-bold">↻ Tap to flip</div>
          </div>
          <div className="absolute inset-0 rounded-3xl p-6 flex flex-col items-center justify-start select-none overflow-y-auto"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "linear-gradient(135deg, #064e3b, #0f172a)", border: "2px solid #10b98144" }}>
            <div className="text-xs font-bold text-emerald-400/70 mb-2">💡 Definition</div>
            <h2 className="text-xl font-black text-white text-center mb-3">{item.back}</h2>
            {item.example && <p className="text-sm text-emerald-300/70 italic text-center mb-3">"{item.example}"</p>}
            {item.l1Translation && <p className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full mb-3">🌍 {item.l1Translation}</p>}
            <EtymologyPanel item={item} />
            <div className="flex flex-wrap gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
              {(["easy", "good", "hard"] as Difficulty[]).map((d) => (
                <motion.button key={d} whileTap={{ scale: 0.9 }} onClick={() => onCorrect(d)}
                  className="px-4 py-2 rounded-xl text-xs font-black border" style={{ background: `${DIFFICULTY_CONFIG[d].color}22`, borderColor: DIFFICULTY_CONFIG[d].color, color: DIFFICULTY_CONFIG[d].color }}>
                  {DIFFICULTY_CONFIG[d].label} +{DIFFICULTY_CONFIG[d].points}
                </motion.button>
              ))}
              <motion.button whileTap={{ scale: 0.9 }} onClick={onWrong} className="px-4 py-2 rounded-xl text-xs font-black border" style={{ background: "#ef444422", borderColor: "#ef4444", color: "#ef4444" }}>Miss</motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// XP QUEST / RPG MODE
// ═══════════════════════════════════════════════════════════
function XPQuestMode({ item, xp, level, onCorrect, onWrong }: { item: FlashItem; xp: number; level: number; onCorrect: (d: Difficulty) => void; onWrong: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const progress = xpProgress(xp);
  const stage = getEvolutionStage(level);
  useEffect(() => { setFlipped(false); }, [item.id]);
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl p-4 mb-4 border relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1c1c0a 0%, #0f0f1a 100%)", borderColor: "#f59e0b44", boxShadow: "0 0 40px rgba(245,158,11,0.15)" }}>
        <div className="relative flex items-center gap-4">
          <motion.div className="text-5xl" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>{stage.emoji}</motion.div>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="font-black text-yellow-400 text-sm">Lv.{level} {stage.title}</span>
              <span className="text-xs text-yellow-400/70">{xpToNextLevel(xp)} XP to evolve</span>
            </div>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-yellow-400/20">
              <motion.div animate={{ width: `${progress}%` }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #f59e0b, #fcd34d)", boxShadow: "0 0 8px rgba(245,158,11,0.8)" }} />
            </div>
          </div>
          <div className="text-right"><div className="text-2xl font-black text-yellow-400">{xp}</div><div className="text-xs text-white/40">Total XP</div></div>
        </div>
      </div>
      <div style={{ perspective: "1200px" }} onClick={() => { sfx.play("cardFlip"); setFlipped(!flipped); }}>
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.55 }} style={{ transformStyle: "preserve-3d" }} className="w-full min-h-[300px] cursor-pointer relative">
          <div className="absolute inset-0 rounded-3xl p-6 flex flex-col items-center justify-center" style={{ backfaceVisibility: "hidden", background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", border: "2px solid #f59e0b44", boxShadow: "0 0 30px rgba(245,158,11,0.2)" }}>
            <div className="text-xs font-bold px-3 py-1 rounded-full mb-4" style={{ background: "#f59e0b22", color: "#f59e0b" }}>⚔️ Enemy Card</div>
            <motion.h2 key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black" style={{ color: "#fcd34d", textShadow: "0 0 30px rgba(245,158,11,0.7)" }}>{item.front}</motion.h2>
          </div>
          <div className="absolute inset-0 rounded-3xl p-6 flex flex-col items-center justify-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "linear-gradient(135deg, #064e3b 0%, #0f172a 100%)", border: "2px solid #10b98144" }}>
            <h2 className="text-2xl font-black text-emerald-300 text-center mb-4">{item.back}</h2>
            {item.example && <p className="text-xs text-white/50 italic mb-4">"{item.example}"</p>}
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => onCorrect("perfect")} className="px-6 py-3 rounded-2xl font-black text-xs border" style={{ background: "#ec489922", borderColor: "#ec4899", color: "#ec4899" }}>🌟 Perfect +25</motion.button>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => onCorrect("good")} className="px-6 py-3 rounded-2xl font-black text-xs border" style={{ background: "#10b98122", borderColor: "#10b981", color: "#10b981" }}>⚔️ Correct +10</motion.button>
              <motion.button whileTap={{ scale: 0.92 }} onClick={onWrong} className="px-6 py-3 rounded-2xl font-black text-xs border" style={{ background: "#ef444422", borderColor: "#ef4444", color: "#ef4444" }}>💀 Miss</motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TIME RACE MODE
// ═══════════════════════════════════════════════════════════
function RaceMode({ items, onCorrect, onWrong, onUpdateIndex, currentIndex }: { items: FlashItem[]; onCorrect: (d: Difficulty) => void; onWrong: () => void; onUpdateIndex: (idx: number) => void; currentIndex: number }) {
  const [selectedTime, setSelectedTime] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [raceActive, setRaceActive] = useState(false);
  const [raceScore, setRaceScore] = useState(0);
  const [answered, setAnswered] = useState<null | boolean>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const item = items[currentIndex];
  const options = useMemo(() => {
    const distractors = getDistractors(items, item, 3);
    return shuffleArray([item, ...distractors]);
  }, [currentIndex, items]);
  useEffect(() => {
    if (raceActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => { if (t <= 1) { clearInterval(timerRef.current!); setRaceActive(false); sfx.play("buzz"); return 0; } if (t <= 10) sfx.play("tick"); return t - 1; });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [raceActive]);
  const handleAnswer = (opt: FlashItem) => {
    if (answered !== null) return;
    const correct = opt.id === item.id;
    setAnswered(correct);
    if (correct) { sfx.play("coin"); setRaceScore((s) => s + 1); setTimeLeft((t) => Math.min(t + 4, selectedTime + 20)); setTimeout(() => { setAnswered(null); onUpdateIndex((currentIndex + 1) % items.length); onCorrect("good"); }, 500); }
    else { sfx.play("buzz"); setTimeLeft((t) => Math.max(0, t - 3)); setTimeout(() => { setAnswered(null); onUpdateIndex((currentIndex + 1) % items.length); onWrong(); }, 700); }
  };
  const timerPercent = (timeLeft / selectedTime) * 100;
  const timerColor = timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : "#10b981";
  if (!raceActive) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-3xl p-8 text-center border" style={{ background: "linear-gradient(135deg, #1a0a0a 0%, #0f0f1a 100%)", borderColor: "#ef444444" }}>
        <div className="text-6xl mb-4">⏱️</div>
        <h3 className="text-2xl font-black text-red-400 mb-2">Time Attack!</h3>
        <p className="text-white/50 mb-6 text-sm">Score: <strong className="text-emerald-400">{raceScore}</strong></p>
        <div className="flex justify-center gap-3 mb-6">
          {[30, 60, 90].map((t) => (
            <button key={t} onClick={() => setSelectedTime(t)} className="px-4 py-2 rounded-xl text-sm font-black border"
              style={{ background: selectedTime === t ? "#ef444422" : "rgba(255,255,255,0.05)", borderColor: selectedTime === t ? "#ef4444" : "rgba(255,255,255,0.1)", color: selectedTime === t ? "#ef4444" : "rgba(255,255,255,0.5)" }}>{t}s</button>
          ))}
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setTimeLeft(selectedTime); setRaceScore(0); setRaceActive(true); }}
          className="px-12 py-4 rounded-full font-black text-xl text-white" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 0 30px rgba(239,68,68,0.5)" }}>🚀 START</motion.button>
      </div>
    );
  }
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden"><motion.div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPercent}%`, background: timerColor }} /></div>
        <motion.div className="font-black text-3xl w-14 text-right" animate={timeLeft <= 10 ? { scale: [1, 1.1, 1] } : {}} style={{ color: timerColor }}>{timeLeft}</motion.div>
        <div className="text-right"><div className="text-xs text-white/40">Score</div><div className="font-black text-emerald-400 text-xl">{raceScore}</div></div>
      </div>
      <motion.div key={item.id} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 text-center border" style={{ background: "linear-gradient(135deg, #0f172a, #1e1b4b)", borderColor: "#ef444433" }}>
        <p className="text-lg sm:text-xl font-bold text-white">{item.back}</p>
      </motion.div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const correct = opt.id === item.id;
          const showCorrect = answered !== null && correct;
          const showWrong = answered === false && !correct;
          return (
            <motion.button key={opt.id} whileTap={{ scale: 0.96 }} onClick={() => handleAnswer(opt)} disabled={answered !== null}
              className="p-4 rounded-2xl text-sm font-black border-2"
              style={{ background: showCorrect ? "#10b98122" : showWrong ? "#ef444422" : "rgba(255,255,255,0.05)", borderColor: showCorrect ? "#10b981" : showWrong ? "#ef4444" : "rgba(255,255,255,0.1)", color: showCorrect ? "#10b981" : showWrong ? "#ef4444" : "white" }}>
              {opt.front}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SPEAK MODE
// ═══════════════════════════════════════════════════════════
function SpeakMode({ item, onCorrect, onWrong }: { item: FlashItem; onCorrect: (d: Difficulty) => void; onWrong: () => void }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  useEffect(() => { setTranscript(""); setResult(null); }, [item.id]);
  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech Recognition not supported. Try Chrome."); return; }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => { setIsListening(true); setTranscript(""); };
    recognition.onresult = (event: any) => {
      const speech = event.results[0][0].transcript.toLowerCase();
      setTranscript(speech);
      const target = item.front.toLowerCase();
      const isCorrect = speech.includes(target) || target.includes(speech);
      setResult(isCorrect ? "correct" : "wrong");
      if (isCorrect) { sfx.play("coin"); setTimeout(() => onCorrect("good"), 1000); }
      else { sfx.play("buzz"); setTimeout(() => { setResult(null); onWrong(); }, 1200); }
    };
    recognition.onerror = () => { setIsListening(false); sfx.play("buzz"); };
    recognition.onend = () => { setIsListening(false); };
    recognition.start();
  };
  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl p-8 border text-center" style={{ background: "linear-gradient(135deg, #050d1a, #0f172a)", borderColor: "#3b82f644" }}>
      <div className="text-xs uppercase font-bold text-blue-400/70 mb-2">🎤 Say This Word</div>
      <motion.h2 key={item.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-5xl sm:text-7xl font-black text-white mb-2" style={{ textShadow: "0 0 40px rgba(59,130,246,0.6)" }}>{item.front}</motion.h2>
      <p className="text-blue-300/60 text-sm mb-8">"{item.back}"</p>
      <div className="relative flex items-center justify-center mb-6">
        {isListening && (
          <>
            <motion.div className="absolute rounded-full" style={{ background: "rgba(59,130,246,0.2)", width: 96, height: 96 }} animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
            <motion.div className="absolute rounded-full" style={{ background: "rgba(59,130,246,0.15)", width: 96, height: 96 }} animate={{ scale: [1, 2], opacity: [0.4, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }} />
          </>
        )}
        <motion.button whileTap={{ scale: 0.92 }} onClick={startListening} disabled={isListening || result !== null}
          className="w-24 h-24 rounded-full flex items-center justify-center text-5xl border-4 z-10"
          style={{ background: isListening ? "linear-gradient(135deg, #ef4444, #dc2626)" : result === "correct" ? "linear-gradient(135deg, #10b981, #047857)" : "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderColor: isListening ? "#ef4444" : "#3b82f6" }}>
          {result === "correct" ? "✅" : result === "wrong" ? "❌" : isListening ? "🎙️" : "🎤"}
        </motion.button>
      </div>
      {transcript && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl border mb-4" style={{ background: result === "correct" ? "#10b98111" : "#ef444411", borderColor: result === "correct" ? "#10b98144" : "#ef444444" }}>
          <p className="text-xs text-white/40 mb-1">Heard:</p>
          <p className="text-lg font-black" style={{ color: result === "correct" ? "#10b981" : "#ef4444" }}>"{transcript}"</p>
        </motion.div>
      )}
      <p className="text-xs text-white/30">{isListening ? "🔴 Listening..." : "Click the microphone and say the word"}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SWIPE MODE
// ═══════════════════════════════════════════════════════════
function SwipeMode({ item, stat, onCorrect, onWrong, onUpdateLove }: { item: FlashItem; stat: ItemStat; onCorrect: (d: Difficulty) => void; onWrong: () => void; onUpdateLove: (d: number) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const loveData = getLoveLevel(stat.loveLevel || 0);
  return (
    <div className="w-full max-w-sm mx-auto">
      <p className="text-center text-white/30 mb-3 text-xs font-bold">💔 Swipe Left | Swipe Right 💕</p>
      <div className="relative h-[420px]" style={{ perspective: "1000px" }}>
        <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.8}
          style={{ x, rotate, background: "linear-gradient(135deg, #1e1b4b, #0f172a)", borderColor: loveData.color }}
          onDragEnd={(_, info) => {
            if (info.offset.x > 100) { sfx.play("love"); launchConfetti("love"); onUpdateLove(1); voice.speak(loveData.comments[Math.floor(Math.random() * loveData.comments.length)], "love"); setTimeout(() => onCorrect("good"), 500); }
            else if (info.offset.x < -100) { sfx.play("angry"); onUpdateLove(-1); voice.speak(getLoveLevel(Math.max(-5, (stat.loveLevel || 0) - 1)).comments[0], "angry"); setTimeout(() => onWrong(), 500); }
          }}
          className="absolute inset-0 rounded-3xl border-2 p-6 flex flex-col items-center justify-center cursor-grab select-none">
          <motion.div className="text-6xl mb-2" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}>{loveData.emoji}</motion.div>
          <div className="text-xs font-black px-3 py-1 rounded-full mb-4" style={{ background: `${loveData.color}22`, color: loveData.color }}>{loveData.title}</div>
          <h2 className="text-4xl font-black text-white text-center mb-3">{item.front}</h2>
          <p className="text-base text-white/70 text-center">{item.back}</p>
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CARD BATTLE MODE
// ═══════════════════════════════════════════════════════════
function CardBattleMode({ items, onCorrect }: { items: FlashItem[]; onCorrect: (d: Difficulty, bonus: number) => void }) {
  const [phase, setPhase] = useState<"select" | "playerAttack" | "enemyAttack" | "result">("select");
  const [playerHP, setPlayerHP] = useState(100);
  const [enemyHP, setEnemyHP] = useState(100);
  const [selectedCard, setSelectedCard] = useState<FlashItem | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(10);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [hand, setHand] = useState<FlashItem[]>([]);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [attackPower, setAttackPower] = useState(0);
  const [defensePower, setDefensePower] = useState(0);
  const [enemyCard, setEnemyCard] = useState<FlashItem | null>(null);
  const [showDamage, setShowDamage] = useState<{ player: number; enemy: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setHand(shuffleArray(items).slice(0, 5));
    setPhase("select"); setPlayerHP(100); setEnemyHP(100); setGameResult(null);
  }, [items]);

  useEffect(() => {
    if (isTimerActive && questionTimer > 0) {
      timerRef.current = setInterval(() => {
        setQuestionTimer((t) => { if (t <= 1) { clearInterval(timerRef.current!); handleQuestionTimeout(); return 0; } if (t <= 3) sfx.play("tick"); return t - 1; });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerActive, currentQuestion]);

  const handleQuestionTimeout = () => {
    setIsTimerActive(false); sfx.play("buzz");
    if (phase === "playerAttack") { setAttackPower(0); proceedToEnemyPhase(); }
    else { setDefensePower(0); applyDamage(); }
  };

  const selectCard = (card: FlashItem) => {
    sfx.play("cardFlip"); setSelectedCard(card); setCurrentQuestion(0); setQuestionTimer(10);
    setPhase("playerAttack"); setIsTimerActive(true); sfx.play("whoosh");
  };

  const answerQuestion = (isCorrect: boolean) => {
    const card = selectedCard!;
    const rarity = card.rarity || "common";
    const config = RARITY_CONFIG[rarity];
    const questionsNeeded = config.questions;
    if (isCorrect) {
      sfx.play("coin");
      const power = calculateAttackPower(questionTimer, 10, config.points);
      setAttackPower((prev) => prev + power);
      if (currentQuestion + 1 >= questionsNeeded) { setIsTimerActive(false); proceedToEnemyPhase(); }
      else { setCurrentQuestion((q) => q + 1); setQuestionTimer(10); }
    } else { sfx.play("buzz"); setIsTimerActive(false); proceedToEnemyPhase(); }
  };

  const proceedToEnemyPhase = () => {
    setShowDamage({ player: 0, enemy: attackPower }); sfx.play("whoosh");
    setTimeout(() => {
      setEnemyHP((hp) => { const newHP = Math.max(0, hp - attackPower); if (newHP <= 0) { setGameResult("win"); sfx.play("levelup"); launchConfetti("victory"); return 0; } return newHP; });
      setShowDamage(null);
      const randomCard = items[Math.floor(Math.random() * items.length)];
      setEnemyCard(randomCard); setPhase("enemyAttack"); setCurrentQuestion(0); setQuestionTimer(10); setDefensePower(0); setIsTimerActive(true);
    }, 1000);
  };

  const defendQuestion = (isCorrect: boolean) => {
    const card = enemyCard!;
    const rarity = card.rarity || "common";
    const config = RARITY_CONFIG[rarity];
    const questionsNeeded = config.questions;
    if (isCorrect) {
      sfx.play("coin");
      const defense = calculateDefensePower(questionTimer, 10, 15);
      setDefensePower((prev) => prev + defense);
      if (currentQuestion + 1 >= questionsNeeded) { setIsTimerActive(false); applyDamage(); }
      else { setCurrentQuestion((q) => q + 1); setQuestionTimer(10); }
    } else { sfx.play("buzz"); setIsTimerActive(false); applyDamage(); }
  };

  const applyDamage = () => {
    const enemyAttack = RARITY_CONFIG[(enemyCard?.rarity || "common")].points;
    const damage = Math.max(5, enemyAttack - defensePower);
    setShowDamage({ player: damage, enemy: 0 }); sfx.play("buzz");
    setTimeout(() => {
      setPlayerHP((hp) => { const newHP = Math.max(0, hp - damage); if (newHP <= 0) { setGameResult("lose"); sfx.play("buzz"); return 0; } return newHP; });
      setShowDamage(null);
      setHand((h) => { const newHand = h.filter((c) => c.id !== selectedCard?.id); if (newHand.length < 3) { const available = items.filter((i) => !newHand.some((c) => c.id === i.id)); return [...newHand, ...shuffleArray(available).slice(0, 5 - newHand.length)]; } return newHand; });
      setSelectedCard(null); setEnemyCard(null); setAttackPower(0); setDefensePower(0); setPhase("select");
      onCorrect("good", attackPower);
    }, 1000);
  };

  const resetGame = () => { setHand(shuffleArray(items).slice(0, 5)); setPhase("select"); setPlayerHP(100); setEnemyHP(100); setGameResult(null); setSelectedCard(null); setEnemyCard(null); };

  const activeCard = phase === "playerAttack" ? selectedCard : enemyCard;
  const activeQuestion = activeCard?.ccq?.[currentQuestion];

  if (gameResult) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center p-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-8">
          <div className="text-8xl mb-4">{gameResult === "win" ? "🏆" : "💀"}</div>
          <h2 className="text-4xl font-black" style={{ color: gameResult === "win" ? "#10b981" : "#ef4444" }}>{gameResult === "win" ? "VICTORY!" : "DEFEATED"}</h2>
        </motion.div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={resetGame} className="px-8 py-4 rounded-2xl font-black text-lg text-white" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>🔄 Play Again</motion.button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1"><span className="font-black text-blue-400">👤 YOU</span><span className="text-white/60">{playerHP}/100</span></div>
          <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-blue-400/30">
            <motion.div animate={{ width: `${playerHP}%` }} className="h-full rounded-full" style={{ background: playerHP > 30 ? "linear-gradient(90deg, #3b82f6, #06b6d4)" : "linear-gradient(90deg, #ef4444, #f87171)" }} />
          </div>
          {showDamage && showDamage.player > 0 && <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -30 }} className="text-red-500 font-black text-xl">-{showDamage.player}</motion.div>}
        </div>
        <div className="text-2xl font-black text-white/60">⚔️</div>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1"><span className="text-white/60">{enemyHP}/100</span><span className="font-black text-red-400">ENEMY 👹</span></div>
          <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-red-400/30">
            <motion.div animate={{ width: `${enemyHP}%` }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #ef4444, #f97316)" }} />
          </div>
          {showDamage && showDamage.enemy > 0 && <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -30 }} className="text-emerald-500 font-black text-xl text-right">-{showDamage.enemy}</motion.div>}
        </div>
      </div>
      {phase === "select" && (
        <div className="text-center">
          <h3 className="text-xl font-black text-white mb-4">🃏 Select a Card to Attack!</h3>
          <div className="flex flex-wrap gap-3 justify-center">
            {hand.map((card, i) => {
              const rarity = card.rarity || "common";
              const config = RARITY_CONFIG[rarity];
              return (
                <motion.button key={card.id} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -10, scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => selectCard(card)}
                  className="w-28 h-40 rounded-2xl p-3 flex flex-col items-center justify-between border-2 relative overflow-hidden"
                  style={{ background: config.bgGradient, borderColor: config.borderColor, boxShadow: `0 0 20px ${config.glowColor}` }}>
                  <CardShimmer rarity={rarity} />
                  <div className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.3)", color: config.color }}>{config.emoji}</div>
                  <div className="text-lg font-black text-white text-center leading-tight line-clamp-2">{card.front}</div>
                  <div className="text-xs text-white/60">{config.questions}Q</div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
      {(phase === "playerAttack" || phase === "enemyAttack") && activeCard && activeQuestion && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black" style={{ color: phase === "playerAttack" ? "#3b82f6" : "#ef4444" }}>{phase === "playerAttack" ? "⚔️ ATTACK" : "🛡️ DEFEND"}</div>
            <motion.div animate={questionTimer <= 3 ? { scale: [1, 1.2, 1] } : {}} className="text-2xl font-black" style={{ color: questionTimer <= 3 ? "#ef4444" : "#f59e0b" }}>{questionTimer}s</motion.div>
            <div className="text-sm font-bold text-white/60">Q{currentQuestion + 1}/{RARITY_CONFIG[activeCard.rarity || "common"].questions}</div>
          </div>
          <div className="rounded-2xl p-6 border text-center" style={{ background: RARITY_CONFIG[activeCard.rarity || "common"].bgGradient, borderColor: RARITY_CONFIG[activeCard.rarity || "common"].borderColor, boxShadow: `0 0 30px ${RARITY_CONFIG[activeCard.rarity || "common"].glowColor}` }}>
            <div className="text-2xl font-black text-white mb-2">{activeCard.front}</div>
            <div className="text-sm text-white/70 mb-4">{activeCard.back}</div>
            <div className="h-px bg-white/20 my-4" />
            <div className="text-lg font-bold text-white mb-4">{activeQuestion.question}</div>
            <div className="flex gap-4 justify-center">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => phase === "playerAttack" ? answerQuestion(activeQuestion.answer === true) : defendQuestion(activeQuestion.answer === true)}
                className="px-8 py-3 rounded-xl font-black text-lg border-2" style={{ background: "#10b98122", borderColor: "#10b981", color: "#10b981" }}>✓ YES</motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => phase === "playerAttack" ? answerQuestion(activeQuestion.answer === false) : defendQuestion(activeQuestion.answer === false)}
                className="px-8 py-3 rounded-xl font-black text-lg border-2" style={{ background: "#ef444422", borderColor: "#ef4444", color: "#ef4444" }}>✗ NO</motion.button>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <div className="text-blue-400 font-black">⚔️ ATK: {attackPower}</div>
            <div className="text-emerald-400 font-black">🛡️ DEF: {defensePower}</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARE IMAGE GENERATOR
// ═══════════════════════════════════════════════════════════
async function generateShareImage(session: SessionStats, xp: number, level: number): Promise<string> {
  const canvas = document.createElement("canvas"); canvas.width = 600; canvas.height = 400;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 600, 400); gradient.addColorStop(0, "#1e1b4b"); gradient.addColorStop(1, "#0f172a");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 600, 400);
  ctx.font = "bold 32px system-ui"; ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.fillText("🎓 LinguaQuest Progress", 300, 50);
  ctx.font = "bold 20px system-ui";
  [{ label: "Level", value: level.toString(), y: 120 }, { label: "Total XP", value: xp.toString(), y: 160 },
   { label: "Cards Studied", value: session.cardsStudied.toString(), y: 200 },
   { label: "Accuracy", value: `${Math.round((session.correctAnswers / Math.max(1, session.cardsStudied)) * 100)}%`, y: 240 },
   { label: "Best Streak", value: session.maxStreak.toString(), y: 280 }
  ].forEach((stat) => { ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left"; ctx.fillText(stat.label, 150, stat.y); ctx.fillStyle = "#f59e0b"; ctx.textAlign = "right"; ctx.fillText(stat.value, 450, stat.y); });
  ctx.font = "16px system-ui"; ctx.fillStyle = "#6366f1"; ctx.textAlign = "center"; ctx.fillText("Join me on LinguaQuest! 🚀", 300, 360);
  return canvas.toDataURL("image/png");
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export function FlashcardsTool({ payload: _payload, players }: any) {
  const payload: FlashPayload = _payload || DEMO_PAYLOAD;
  const [mode, setMode] = useState<GameMode>("classic");
  const [fcIndex, setFcIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(players?.[0]?.score || 0);
  const [level, setLevel] = useState(xpToLevel(xp));
  const [itemStats, setItemStats] = useState<ItemStatsMap>({});
  const [muted, setMuted] = useState(false);
  const [session, setSession] = useState<SessionStats>(createNewSession());
  const [showReview, setShowReview] = useState(false);
  const [mascotState, setMascotState] = useState<MascotState>(getRandomMascotReaction("sessionStart"));
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [gachaState, setGachaState] = useState<GachaState>({ pullsSinceEpic: 0, pullsSinceLegendary: 0, totalPulls: 0, collection: [] });
  const [toast, setToast] = useState<string | null>(null);

  const items = payload.items;
  const activeItem = items[fcIndex] || items[0];
  const currentStat: ItemStat = itemStats[activeItem?.id] || { rep: 0, correctCount: 0, wrongCount: 0, lastSeen: 0, mastered: false, streak: 0, loveLevel: 0 };

  useEffect(() => { sfx.setMuted(muted); voice.setEnabled(!muted); }, [muted]);
  useEffect(() => { const newLevel = xpToLevel(xp); if (newLevel > level) { setLevel(newLevel); sfx.play("levelup"); launchConfetti("levelup"); setMascotState(getRandomMascotReaction("levelUp")); voice.speak(`Level up! Level ${newLevel}!`, "happy"); } }, [xp]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const speakMascot = () => { voice.speak(mascotState.message, mascotState.mood === "love" ? "love" : mascotState.mood === "sad" ? "angry" : "happy"); };

  const updateItemStat = (id: string, isCorrect: boolean, loveDelta = 0) => {
    setItemStats((prev: ItemStatsMap) => {
      const existing = prev[id] || { rep: 0, correctCount: 0, wrongCount: 0, lastSeen: 0, mastered: false, streak: 0, loveLevel: 0 };
      return { ...prev, [id]: { rep: existing.rep + (isCorrect ? 1 : -1), correctCount: existing.correctCount + (isCorrect ? 1 : 0), wrongCount: existing.wrongCount + (isCorrect ? 0 : 1), lastSeen: Date.now(), mastered: existing.mastered || (isCorrect && existing.correctCount >= 4), streak: isCorrect ? existing.streak + 1 : 0, loveLevel: Math.max(-5, Math.min(5, existing.loveLevel + loveDelta)) } };
    });
  };

  const handleCorrect = useCallback((difficulty: Difficulty = "good", bonus = 0) => {
    const points = DIFFICULTY_CONFIG[difficulty].points + (streak >= 5 ? Math.floor(streak / 5) * 2 : 0) + bonus;
    setXp((prev: number) => prev + points); setStreak((s) => s + 1);
    sfx.play("coin"); launchConfetti("correct"); updateItemStat(activeItem.id, true);
    setSession((s) => ({ ...s, cardsStudied: s.cardsStudied + 1, correctAnswers: s.correctAnswers + 1, xpEarned: s.xpEarned + points, streak: streak + 1, maxStreak: Math.max(s.maxStreak, streak + 1) }));
    if (streak + 1 >= 10) setMascotState(getRandomMascotReaction("streak10"));
    else if (streak + 1 >= 5) setMascotState(getRandomMascotReaction("streak5"));
    else if (streak + 1 >= 3) setMascotState(getRandomMascotReaction("streak3"));
    else setMascotState(getRandomMascotReaction("correct"));
    if (Math.random() < 0.15) { const quote = getRandomQuote(); showToast(`💬 "${quote.quote}" — ${quote.author}`); }
    setFcIndex(getNextCardIndex(items, itemStats, fcIndex));
  }, [streak, activeItem, fcIndex, items, itemStats]);

  const handleWrong = useCallback(() => {
    setStreak(0); sfx.play("buzz"); updateItemStat(activeItem.id, false);
    setMascotState(getRandomMascotReaction("wrong"));
    setSession((s) => ({ ...s, cardsStudied: s.cardsStudied + 1, wrongAnswers: s.wrongAnswers + 1, streak: 0, wrongCards: [...s.wrongCards, activeItem] }));
    setFcIndex(getNextCardIndex(items, itemStats, fcIndex));
  }, [activeItem, fcIndex, items, itemStats]);

  const handleUpdateLove = useCallback((delta: number) => {
    setItemStats((prev: ItemStatsMap) => {
      const existing = prev[activeItem.id] || { rep: 0, correctCount: 0, wrongCount: 0, lastSeen: 0, mastered: false, streak: 0, loveLevel: 0 };
      return { ...prev, [activeItem.id]: { ...existing, loveLevel: Math.max(-5, Math.min(5, existing.loveLevel + delta)) } };
    });
  }, [activeItem]);

  const handleGachaPull = (count: number): FlashItem[] => {
    const pulled: FlashItem[] = []; let newState = { ...gachaState };
    for (let i = 0; i < count; i++) {
      const { rarity } = rollGacha(newState);
      const itemsOfRarity = items.filter((item) => (item.rarity || "common") === rarity);
      const card = itemsOfRarity.length > 0 ? itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)] : items[Math.floor(Math.random() * items.length)];
      pulled.push({ ...card, rarity });
      newState.totalPulls++;
      if (rarity === "legendary") { newState.pullsSinceLegendary = 0; newState.pullsSinceEpic = 0; }
      else if (rarity === "epic") { newState.pullsSinceEpic = 0; newState.pullsSinceLegendary++; }
      else { newState.pullsSinceEpic++; newState.pullsSinceLegendary++; }
    }
    setGachaState(newState); return pulled;
  };

  const handleSelectTrack = (id: string) => { setCurrentTrack(id); music.play(id); setMusicPlaying(true); };
  const handleShare = async () => { try { const dataUrl = await generateShareImage(session, xp, level); const link = document.createElement("a"); link.download = "linguaquest-progress.png"; link.href = dataUrl; link.click(); showToast("📸 Progress image downloaded!"); } catch (e) { showToast("Couldn't generate image"); } };
  const endSession = () => { if (session.cardsStudied > 0) setShowReview(true); };

  if (!items?.length) return <div className="text-center text-white/50 p-8">No flashcard items found.</div>;

  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #060614 0%, #0a0f1e 50%, #060614 100%)" }}>
      <NebulaBackground />
      <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-bold text-white max-w-sm text-center" style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", border: "1px solid #6366f144" }}>{toast}</motion.div>}</AnimatePresence>
      <AnimatePresence>{showReview && <SessionReview session={session} onClose={() => { setShowReview(false); setSession(createNewSession()); }} onShare={handleShare} />}</AnimatePresence>
      <div className="relative z-10 flex flex-col gap-4 p-4 sm:p-6 max-w-4xl mx-auto w-full">
        <div className="rounded-2xl p-4 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <div><h1 className="text-lg font-black text-white">{payload.title || "Flashcard Quest"}</h1>{payload.description && <p className="text-xs text-white/40">{payload.description}</p>}</div>
            <div className="flex items-center gap-2">
              <SessionTimer session={session} />
              <MusicPlayer isPlaying={musicPlaying} currentTrack={currentTrack} onSelectTrack={handleSelectTrack} />
              <button onClick={() => setMuted((m) => !m)} className="w-9 h-9 rounded-xl flex items-center justify-center border text-sm" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} title="Toggle Sound">{muted ? "🔇" : "🔊"}</button>
              <button onClick={() => { generateFlashcardsPDF(payload); showToast("📄 PDF export opened in new tab!"); }} className="w-9 h-9 rounded-xl flex items-center justify-center border text-sm" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} title="Export PDF">📄</button>
              <button onClick={endSession} className="w-9 h-9 rounded-xl flex items-center justify-center border text-sm" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} title="End Session">🏁</button>
            </div>
          </div>
          <XPBar xp={xp} streak={streak} />
        </div>
        <Mascot state={mascotState} onSpeak={speakMascot} />
        <ModeTabBar mode={mode} setMode={setMode} />
        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {mode === "classic" && <ClassicMode item={activeItem} onCorrect={handleCorrect} onWrong={handleWrong} />}
            {mode === "xpQuest" && <XPQuestMode item={activeItem} xp={xp} level={level} onCorrect={handleCorrect} onWrong={handleWrong} />}
            {mode === "race" && <RaceMode items={items} currentIndex={fcIndex} onCorrect={handleCorrect} onWrong={handleWrong} onUpdateIndex={setFcIndex} />}
            {mode === "speak" && <SpeakMode item={activeItem} onCorrect={handleCorrect} onWrong={handleWrong} />}
            {mode === "cardBattle" && <CardBattleMode items={items} onCorrect={handleCorrect} />}
            {mode === "swipe" && <SwipeMode item={activeItem} stat={currentStat} onCorrect={handleCorrect} onWrong={handleWrong} onUpdateLove={handleUpdateLove} />}
            {mode === "gacha" && <GachaMode gachaState={gachaState} onPull={handleGachaPull} onCollect={() => {}} />}
          </motion.div>
        </AnimatePresence>
        {mode !== "gacha" && mode !== "cardBattle" && mode !== "race" && (
          <div className="flex justify-center gap-3 mt-2">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { sfx.play("whoosh"); setFcIndex((i) => (i - 1 + items.length) % items.length); }}
              className="px-5 py-2 rounded-xl border text-sm font-black" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>← Prev</motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { sfx.play("whoosh"); setFcIndex(getNextCardIndex(items, itemStats, fcIndex)); }}
              className="px-5 py-2 rounded-xl border text-sm font-black" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>Skip →</motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
