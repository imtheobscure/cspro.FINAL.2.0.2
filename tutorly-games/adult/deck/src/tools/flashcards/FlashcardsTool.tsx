import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { animate, motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  FlashPayload, FlashItem, ItemStat, ItemStatsMap, GameMode, SoundEngine, VoiceEngine, MusicEngine,
  DEMO_PAYLOAD, getEvolutionStage, getLoveLevel, xpToLevel, xpProgress, xpToNextLevel,
  getNextCardIndex, getStreakMessage, DIFFICULTY_CONFIG, Difficulty, shuffleArray, getDistractors,
  launchConfetti, RARITY_CONFIG, SessionStats, calculateAttackPower, calculateDefensePower,
  createNewSession, formatSessionTime, getRandomMascotReaction, MascotState, getRandomQuote, isTypedAnswerCorrect,
  MUSIC_TRACKS, rollGacha, GachaState, PITY_LEGENDARY, PITY_EPIC, Rarity, generateFlashcardsPDF,
} from "./flashcards";
import { FileText, Flag, Layers, Moon, Music, Sun, Timer, Volume2, VolumeX } from "lucide-react";
import { CardFrame, DriftField, ParticleAura, RarityGlyph, RuneSigil, Tilt3D } from "../../components/CardArt";
import {
  Icon,
  MasteryRing,
  Mascot as OwlMascot,
  ModeGlyph,
  StageGlyph,
  StreakFlame,
  UI,
  type Mood,
} from "../../components/Glyphs";
import { EnrichPanel } from "../../components/EnrichPanel";
import { AchievementToasts, LegendaryReveal, LevelUpCinematic, ShareSheet } from "../../components/Cinematics";
import { LiveRegion, useAnnouncer, useFocusTrap, useKeyboardShortcuts } from "../../lib/a11y";
import { buildShareUrl, exportDeckFile, renderQrCode } from "../../lib/deck";
import { L1_LANGUAGES } from "../../lib/enrich";
import { findWordImage, type WordImage } from "../../lib/wordImage";
import { useTheme } from "../../lib/theme";
import { useTutorlyBranding } from "../../lib/tutorlyBranding";
import { newCard, previewIntervals } from "../../lib/fsrs";
import {
  ACHIEVEMENTS,
  activityHeatmap,
  clearProgress,
  currentDayStreak,
  dueCount,
  dueForecastForStats,
  evaluateAchievements,
  gradeFromDifficulty,
  loadProgress,
  masteryPercent,
  recordActivity,
  saveProgress,
  scheduleNext,
  type Achievement,
  type DailyActivity,
  type Grade,
} from "../../lib/progress";

const sfx = new SoundEngine();
const voice = new VoiceEngine();
const music = new MusicEngine();

/**
 * "3 days ago" from a timestamp.
 *
 * A raw epoch in the UI is noise; what a learner actually wants to know is whether the
 * card is new or is coming back around. Coarse buckets are easier to read than a precise
 * duration, and "never" is a real answer for a card that has not been seen yet.
 */
function timeAgo(timestamp: number): string {
  if (!timestamp) return "never";
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * The three grade buttons' solid fills.
 *
 * These are fixed values rather than theme tokens, and deliberately so: they live on
 * the *answer face*, which is light in both themes. `DIFFICULTY_CONFIG`'s own colours
 * are tuned to glow on dark and put white label text at about 2.2:1 on themselves;
 * these are the same hues deepened until white text on them clears 4.5:1.
 */
const GRADE_FILL: Record<Difficulty, string> = {
  easy: "#2563eb",
  good: "#047857",
  hard: "#b45309",
  // The classic grader never shows "perfect"; the RPG mode does, as a tint.
  perfect: "#be185d",
};

// ═══════════════════════════════════════════════════════════
// ANIMATED MASCOT
// ═══════════════════════════════════════════════════════════
/**
 * The mascot's speech bubble.
 *
 * The face itself is `OwlMascot` from `components/Glyphs` — a drawn owl whose expression
 * comes from geometry, not from an emoji glyph. This component adds the frame, the
 * animation and the tap-to-hear affordance around it.
 */
function MascotBubble({ state, onSpeak }: { state: MascotState; onSpeak?: () => void }) {
  const mood: Mood = ([ "happy", "excited", "proud", "worried", "sad", "love", "thinking", "sleeping", "celebrating" ] as Mood[]).includes(
    state.mood as Mood
  )
    ? (state.mood as Mood)
    : "happy";

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
      <motion.div animate={getAnimation()} className="text-accent-info">
        <OwlMascot mood={mood} size={44} />
      </motion.div>
      <div className="flex-1 min-w-0">
        <motion.p key={state.message} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-bold text-fg-1">{state.message}</motion.p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-indigo-600/75 dark:text-indigo-300/70">
          <Icon as={UI.Volume} size={11} /> Click to hear me
        </p>
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
      <Timer className="h-3.5 w-3.5 text-accent-good" aria-hidden="true" />
      <span className="tnum text-accent-good">{time}</span>
      <span className="text-fg-4">|</span>
      <span className="tnum flex items-center gap-1 text-accent-good">
        <span className="sr-only">correct answers:</span>
        <Icon as={UI.Check} size={12} />
        {session.correctAnswers}
      </span>
      <span className="tnum flex items-center gap-1 text-accent-bad">
        <span className="sr-only">wrong answers:</span>
        <Icon as={UI.X} size={12} />
        {session.wrongAnswers}
      </span>
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
        aria-label={isPlaying ? "Background music playing — open the track list" : "Background music — open the track list"}
        className="w-9 h-9 rounded-xl flex items-center justify-center border"
        style={{ background: isPlaying ? "#10b98122" : "var(--surface-control)", borderColor: isPlaying ? "var(--grade-good)" : "var(--border-control)", color: isPlaying ? "var(--grade-good)" : "var(--content-3)" }}>
        {isPlaying ? <Music className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </motion.button>
      <AnimatePresence>
        {showList && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 top-12 w-56 rounded-xl border p-2 z-50"
            style={{ background: "var(--surface-overlay)", borderColor: "var(--border-control)" }}>
            <div className="mb-2 flex items-center gap-1.5 px-2 text-xs font-bold text-fg-4">
              <Icon as={UI.Music} size={12} /> Background Music
            </div>
            {MUSIC_TRACKS.map((track) => (
              <button key={track.id} onClick={() => { onSelectTrack(track.id); setShowList(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left hover:bg-inset"
                style={{ background: currentTrack === track.id ? "rgba(16,185,129,0.15)" : "transparent" }}>
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 items-center justify-center rounded-md ${currentTrack === track.id ? "animate-pulse" : ""}`}
                  style={{ background: `${track.color}22`, color: track.color }}
                >
                  <Icon as={UI.Waves} size={13} />
                </span>
                <div className="flex-1"><div className="text-xs font-bold text-fg-2">{track.name}</div></div>
                {currentTrack === track.id && <span className="text-accent-good"><Icon as={UI.Pause} size={12} /></span>}
              </button>
            ))}
            <button onClick={() => { music.stop(); setShowList(false); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold text-accent-bad hover:bg-inset">
              <Icon as={UI.X} size={12} /> Stop Music
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
      <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="w-full py-1 text-sm font-bold text-indigo-600">
        {expanded ? "▼ Hide Details" : "▶ Etymology & Examples"}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-3 pt-3">
              {item.etymology && (
                <div className="p-3 rounded-xl border" style={{ background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.2)" }}>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-purple-700">
                    <Icon as={UI.Scroll} size={12} /> Etymology
                  </div>
                  <div className="text-sm text-slate-700"><span className="font-bold text-purple-700">{item.etymology.root}</span> ({item.etymology.origin})</div>
                  <div className="mt-1 text-sm text-slate-600">{item.etymology.meaning}</div>
                  {item.etymology.relatedWords && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.etymology.relatedWords.map((w, i) => <span key={i} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(139,92,246,0.16)", color: "#6d28d9" }}>{w}</span>)}
                    </div>
                  )}
                </div>
              )}
              {item.wordFamily && item.wordFamily.length > 0 && (
                <div className="p-3 rounded-xl border" style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.2)" }}>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-blue-700">
                    <Icon as={UI.TreePine} size={12} /> Word Family
                  </div>
                  <div className="flex flex-wrap gap-1">{item.wordFamily.map((w, i) => <span key={i} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(59,130,246,0.16)", color: "#1d4ed8" }}>{w}</span>)}</div>
                </div>
              )}
              {item.examples && item.examples.length > 0 && (
                <div className="p-3 rounded-xl border" style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.2)" }}>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <Icon as={UI.Newspaper} size={12} /> Real-World Examples
                  </div>
                  <div className="space-y-2">{item.examples.map((ex, i) => (
                    <div key={i} className="text-sm"><p className="italic text-slate-700">"{ex.text}"</p>{ex.source && <p className="mt-0.5 text-xs text-emerald-700/80">— {ex.source}</p>}</div>
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

  /*
   * This is a dialog, so it behaves like one: focus moves in, cannot leave except by
   * closing, and Escape closes it. The old version left focus on the stage behind it,
   * which meant Tab reached buttons nobody could see.
   */
  const trapRef = useFocusTrap<HTMLDivElement>(true, onClose);

  const headline = accuracy >= 80 ? UI.Trophy : accuracy >= 50 ? UI.Target : UI.Zap;
  const headlineColor = accuracy >= 80 ? "#fbbf24" : accuracy >= 50 ? "#10b981" : "#f59e0b";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--scrim)" }}>
      <motion.div ref={trapRef} role="dialog" aria-modal="true" aria-label="Session complete" initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-3xl border p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--panel-modal)", borderColor: "#6366f144" }}>
        <div className="text-center mb-6">
          <div className="mb-3 flex justify-center" style={{ color: headlineColor }}>
            <Icon as={headline} size={56} strokeWidth={1.4} />
          </div>
          <h2 className="text-2xl font-black text-fg-1">Session Complete!</h2>
          <p className="text-fg-3 text-sm mt-1">Duration: {formatSessionTime(session.startTime)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[{ label: "Cards", value: session.cardsStudied, color: "#3b82f6", icon: UI.BookOpen },
            { label: "Accuracy", value: `${accuracy}%`, color: accuracy >= 70 ? "var(--accent-good)" : "var(--accent-warn)", icon: UI.Target },
            { label: "XP", value: session.xpEarned, color: "var(--accent-warn)", icon: UI.Sparkles },
            { label: "Streak", value: session.maxStreak, color: "var(--accent-bad)", icon: UI.Zap }
          ].map((stat) => (
            /* A neutral chip with a coloured figure, not a coloured tint of one. The
               accent is a `var()` now, and appending an alpha suffix to a token produces
               invalid CSS — which fails silently as `transparent` — so the wash comes
               from a surface token rather than from string concatenation. */
            <div key={stat.label} className="rounded-xl border border-line-1 bg-inset p-3 text-center">
              <div className="mb-1 flex justify-center" style={{ color: stat.color }}>
                <Icon as={stat.icon} size={20} />
              </div>
              <div className="tnum text-xl font-black" style={{ color: stat.color }} data-num>{stat.value}</div>
              <div className="text-xs text-fg-3">{stat.label}</div>
            </div>
          ))}
        </div>
        {session.wrongCards.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-black text-accent-bad">
              <Icon as={UI.Pencil} size={14} /> Review ({session.wrongCards.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {session.wrongCards.map((card) => (
                <div key={card.id} className="p-3 rounded-xl border" style={{ background: "#ef444411", borderColor: "#ef444433" }}>
                  <div className="text-sm font-bold text-fg-1">{card.front}</div>
                  <div className="text-xs text-fg-3 mt-1">{card.back}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="p-4 rounded-xl border mb-6 text-center" style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.2)" }}>
          <p className="text-sm italic text-fg-2">"{quote.quote}"</p>
          <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">— {quote.author}</p>
        </div>
        <div className="flex gap-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={onShare} className="flex flex-1 items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border" style={{ background: "#10b98122", borderColor: "#10b981", color: "var(--accent-good)" }}>
            <Icon as={UI.Share2} size={15} /> Share
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "var(--content-1)" }}>Continue</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// GACHA MODE
// ═══════════════════════════════════════════════════════════
function GachaMode({ gachaState, deckSize, onPull, onCollect }: { gachaState: GachaState; deckSize: number; onPull: (count: number) => FlashItem[]; onCollect: (cards: FlashItem[]) => void }) {
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
    <div className="mx-auto w-full max-w-[1400px]">
      {phase === "idle" && (
        <div className="space-y-6 rounded-3xl border border-purple-400/25 bg-panel p-10 text-center" style={{ boxShadow: "var(--panel-shadow)" }}>
          <motion.div
            className="relative mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-3xl border border-purple-400/30 text-purple-600 dark:text-purple-300"
            style={{ background: "radial-gradient(circle at 50% 30%, rgba(168,85,247,0.25), transparent 70%)" }}
            animate={{ y: [0, -10, 0], rotate: [0, -4, 4, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ParticleAura rarity="epic" count={9} />
            <Icon as={UI.Sparkles} size={44} strokeWidth={1.3} />
          </motion.div>
          <h2 className="text-4xl font-black text-fg-1">Card Pack Opening</h2>
          <p className="text-lg text-fg-3">Pity: Epic in {PITY_EPIC - gachaState.pullsSinceEpic} | Legendary in {PITY_LEGENDARY - gachaState.pullsSinceLegendary}</p>
          {/* Collection progress — the reason to keep pulling once the deck is known. */}
          <div className="mx-auto w-full max-w-xs">
            <div className="mb-1.5 flex items-center justify-between text-sm font-bold text-fg-2">
              <span className="flex items-center gap-1.5"><Layers className="h-4 w-4" aria-hidden="true" /> Collection</span>
              <span className="tnum text-accent-xp">{gachaState.collection.length}/{deckSize || "?"}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--track)]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #a855f7, #f59e0b)" }}
                animate={{ width: `${deckSize ? Math.min(100, (gachaState.collection.length / deckSize) * 100) : 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-fg-4">
              {gachaState.totalPulls} pull{gachaState.totalPulls === 1 ? "" : "s"} · duplicates are not counted twice
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {/*
              White labels on the gradients, not `--content-1`.

              That token is near-black in the light theme, which put dark text on a mid
              purple and a mid amber — the two buttons with the least contrast precisely
              because their gradients are darkest at the centre where the label sits.
            */}
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handlePull(1)} className="flex items-center justify-center gap-2 rounded-2xl py-4 text-xl font-black text-white" style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
              <Icon as={UI.Layers} size={20} /> Single Pull
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handlePull(5)} className="flex items-center justify-center gap-2 rounded-2xl py-4 text-xl font-black text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
              <Icon as={UI.Layers} size={20} /> × 5 Multi-Pull
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handlePull(10)} className="relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-xl font-black text-white" style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}>
              <motion.div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }} animate={{ x: ["-100%", "100%"] }} transition={{ duration: 2, repeat: Infinity }} />
              <span className="relative flex items-center gap-2">
                <Icon as={UI.Layers} size={20} /> × 10 Mega Pull (Epic Guaranteed!)
              </span>
            </motion.button>
          </div>
        </div>
      )}
      {phase === "pulling" && (
        <div className="text-center">
          <motion.div className="mb-6 flex justify-center text-purple-600 dark:text-purple-300" animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <Icon as={UI.Sparkles} size={72} strokeWidth={1.2} />
          </motion.div>
          <h2 className="text-2xl font-black text-fg-1">Opening...</h2>
        </div>
      )}
      {phase === "reveal" && currentCard && (
        <div className="text-center" onClick={revealNext}>
          {(() => {
            const rarity = currentCard.rarity || "common";
            const style = RARITY_CONFIG[rarity];
            return (
              <div className="relative mx-auto w-64" style={{ perspective: "1200px" }}>
                <ParticleAura rarity={rarity} />
                <motion.div key={revealIndex} initial={{ rotateY: 180, scale: 0.5 }} animate={{ rotateY: 0, scale: 1 }} transition={{ duration: 0.6, type: "spring" }}
                  className="relative flex h-96 cursor-pointer flex-col items-center justify-center rounded-3xl border-4 p-6"
                  style={{ background: `var(--rarity-${rarity}-card)`, borderColor: style.borderColor, boxShadow: `0 0 60px ${style.glowColor}`, transformStyle: "preserve-3d" }}>
                  <CardShimmer rarity={rarity} />
                  <CardFrame rarity={rarity} seed={currentCard.front} ornament={style.ornament} />
                  <div className="relative z-10 mb-4 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black" style={{ borderColor: `${style.borderColor}66`, color: `var(--rarity-${rarity}-ink)` }}>
                    <RarityGlyph rarity={rarity} size={12} /> {style.label}
                  </div>
                  <h3 className="word-display relative z-10 mb-2 text-center text-3xl text-fg-1">{currentCard.front}</h3>
                  <p className="relative z-10 text-center text-sm text-fg-2">{currentCard.back}</p>
                </motion.div>
              </div>
            );
          })()}
          <p className="tnum mt-6 text-base text-fg-3" data-num>{revealIndex + 1}/{pulledCards.length} — Tap to continue</p>
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
      <motion.div className="absolute rounded-full" style={{ width: 600, height: 600, left: "-10%", top: "-10%", background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", filter: "blur(80px)", opacity: "var(--stage-aurora-opacity)" }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }} transition={{ duration: 15, repeat: Infinity }} />
      <motion.div className="absolute rounded-full" style={{ width: 500, height: 500, right: "-5%", bottom: "10%", background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", filter: "blur(80px)", opacity: "var(--stage-aurora-opacity)" }}
        animate={{ x: [0, -20, 0], y: [0, -30, 0] }} transition={{ duration: 18, repeat: Infinity, delay: 3 }} />
      {/*
       * The star field is a CSS-driven drift field rather than 30 React components
       * each running their own animation. One keyframe, no per-frame JavaScript.
       */}
      <DriftField count={26} />
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
      <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
        <StageGlyph stage={stage.stage} size={38} />
      </motion.div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-fg-3">Lv.<span className="tnum" data-num>{level}</span> {stage.title}</span>
          <span className="tnum text-xs font-bold text-accent-warn" data-num>{progress}/100 XP</span>
        </div>
        <div className="h-2.5 bg-[var(--track)] rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #f59e0b, #ec4899, #8b5cf6)" }} animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
        </div>
      </div>
      {/*
        * The tier label only where there is room for words. It used to fall back to
        * rendering the bare tier number on mobile, which read as a second, unexplained
        * figure sitting next to the streak count.
        */}
      {streakMsg ? (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="hidden items-center gap-1 rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 text-xs font-black text-orange-400 sm:flex">
          {streakMsg.text}
        </motion.div>
      ) : null}
      <div className="flex items-center gap-1">
        <StreakFlame streak={streak} size={20} />
        <span className="tnum text-sm font-black text-orange-600 dark:text-orange-300" data-num>{streak}</span>
      </div>
    </div>
  );
}

/**
 * Mode metadata.
 *
 * The `icon` field is gone: each tab draws `ModeGlyph`, which is a vector mark inside a
 * shared crest. Seven emoji at seven different optical weights was why this row never
 * looked aligned.
 */
const MODE_CONFIG: Record<GameMode, { label: string; color: string }> = {
  classic: { label: "Classic", color: "#6366f1" },
  xpQuest: { label: "RPG", color: "#f59e0b" },
  race: { label: "Race", color: "#ef4444" },
  speak: { label: "Speak", color: "#3b82f6" },
  cardBattle: { label: "Battle", color: "#10b981" },
  swipe: { label: "Swipe", color: "#ec4899" },
  gacha: { label: "Gacha", color: "#a855f7" },
  type: { label: "Type", color: "#22d3ee" },
};

function ModeTabBar({ mode, setMode }: { mode: GameMode; setMode: (m: GameMode) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar" role="tablist" aria-label="Game modes">
      {(Object.keys(MODE_CONFIG) as GameMode[]).map((m) => {
        const cfg = MODE_CONFIG[m];
        const active = mode === m;
        return (
          <motion.button key={m} role="tab" aria-selected={active}
            onClick={() => { sfx.play("whoosh"); setMode(m); }} whileTap={{ scale: 0.92 }}
            className="flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-black"
            /*
             * The tier colour stays as the border and the wash; the *label* reads from
             * the ink ramp. Mode accents are drawn to glow on dark, so using one as text
             * on white paper was the single least legible row on the light stage.
             */
            style={{ background: active ? `${cfg.color}22` : "var(--surface-control)", borderColor: active ? cfg.color : "var(--border-control)", color: active ? "var(--content-1)" : "var(--content-3)" }}>
            <ModeGlyph mode={m} size={22} color={active ? cfg.color : "currentColor"} />
            <span className="hidden sm:inline">{cfg.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CLASSIC MODE
// ═══════════════════════════════════════════════════════════
function ClassicMode({
  item,
  stat,
  l1 = "es",
  autoEnrich = true,
  onCorrect,
  onWrong,
}: {
  item: FlashItem;
  stat?: ItemStat;
  l1?: string;
  autoEnrich?: boolean;
  onCorrect: (d: Difficulty) => void;
  onWrong: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  /*
   * The reference material is collapsed by default.
   *
   * It is dense, rarely needed on first sight of a word, and — measured on a 1440×800
   * laptop — long enough to push the grade buttons below the fold. Collapsed, the back
   * face is definition, example and the three buttons, which fits without scrolling. It
   * also means the live word lookup only runs when a learner actually asks for it,
   * instead of firing five requests every time a card is flipped.
   */
  const [showReference, setShowReference] = useState(false);
  const rarity = item.rarity || "common";
  const style = RARITY_CONFIG[rarity];
  /*
   * Tier ink, not tier glow.
   *
   * `style.color` is a *light* colour — #cbd5e1 for common — because it was drawn to
   * bloom on near-black. The same value on white paper is a smudge, so accents on the
   * card read from a token that is re-pointed per theme instead of from the config.
   */
  const ink = `var(--rarity-${rarity}-ink)`;
  useEffect(() => { setFlipped(false); setShowReference(false); }, [item.id]);

  const mastery = masteryPercent(stat);

  /*
   * Space flips, 1–3 grade once the definition is showing.
   *
   * The shortcut lives here rather than at the app level because the flip state is
   * local — and because "1" should only mean "easy" once there is a definition on
   * screen to have graded. Answering a card you cannot see is not a shortcut.
   */
  useKeyboardShortcuts({
    " ": () => { sfx.play("cardFlip"); setFlipped((value) => !value); },
    enter: () => { sfx.play("cardFlip"); setFlipped((value) => !value); },
    "1": () => { if (flipped) onCorrect("easy"); },
    "2": () => { if (flipped) onCorrect("good"); },
    "3": () => { if (flipped) onCorrect("hard"); },
    x: () => { if (flipped) onWrong(); },
  });

  /*
   * FSRS interval previews on the grade buttons.
   *
   * Showing "Easy → 12 days" is the cheapest way to teach a learner how the scheduler
   * works, and it visibly improves how honestly people grade themselves: they can see
   * that claiming "easy" really does push the word a fortnight away.
   */
  const previews = useMemo(() => previewIntervals(stat?.fsrs ?? newCard()), [stat?.fsrs]);

  /*
   * Examples belong on the *front*.
   *
   * A word on its own is a spelling test; a word in a sentence is a reading task, and
   * reading it in context is the skill a learner actually needs. It also balances the
   * two faces — the front no longer flips from a lot of empty space to a wall of text.
   * The single `example` is tried first and duplicates are dropped.
   */
  const frontExamples = useMemo(() => {
    const candidates = [item.example, ...(item.examples || []).map((entry) => entry.text)];
    return candidates
      .map((sentence) => (sentence || "").trim())
      .filter((sentence, index, all) => sentence.length > 0 && all.indexOf(sentence) === index)
      .slice(0, 2);
  }, [item]);

  return (
    <Tilt3D className="mx-auto w-full max-w-[1200px] lg:max-w-[1500px]" intensity={10}>
      <div style={{ perspective: "1200px" }} onClick={() => { sfx.play("cardFlip"); setFlipped(!flipped); }}>
        {/*
          * The height is clamped against the viewport rather than fixed.
          *
          * A flat 520px looked right on a tall monitor and pushed the grade buttons 117px
          * below the fold on a 800px-tall laptop. `dvh` means the card takes whatever room
          * is actually left under the header, with a 400px floor so the word and its
          * examples always have space, and a 560px ceiling so it never becomes a poster.
          */}
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55 }}
          style={{ transformStyle: "preserve-3d", height: "clamp(420px, calc(100dvh - 400px), 640px)", minHeight: 420 }}
          className="relative w-full cursor-pointer"
        >
          {/*
            * FRONT — quiet by design.
            *
            * The glow, the travelling shimmer, the orbiting motes and the etched sigil are
            * all gone from this face. They looked impressive in isolation and actively
            * fought the one job the front has: making the word effortless to read. Rarity
            * still reads, through the badge and a single wash of tint at the top edge.
            */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-3xl px-6 py-8 select-none md:px-10"
            style={{
              backfaceVisibility: "hidden",
              background: "var(--card-front-bg)",
              border: `1px solid ${style.borderColor}44`,
              boxShadow: "var(--card-shadow)",
            }}
          >
            {/*
              * One wash of the tier colour clipped to the top edge, and nothing else.
              *
              * The travelling shimmer, the orbiting aura and the etched sigil all live on
              * the gacha reveal, where spectacle is the point. On the card a learner is
              * trying to read, they were the main reason the word looked worse than plain
              * white text on plain paper.
              */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-40"
              style={{ background: `radial-gradient(90% 100% at 50% 0%, ${style.color}24, transparent 70%)` }}
            />

            <div
              className="relative z-10 mb-6 flex items-center gap-1.5 rounded-full border px-3 py-1 text-2xs font-black uppercase tracking-wider"
              style={{ borderColor: `${style.borderColor}66`, color: ink }}
            >
              <RarityGlyph rarity={rarity} size={11} />
              {style.label}
            </div>

            {/* No text-shadow: glow behind letterforms is the main reason a display word
                on a dark card reads worse than the same word in plain white. */}
            <motion.h2
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="word-display relative z-10 text-center text-5xl font-semibold sm:text-6xl lg:text-7xl"
              style={{ color: "var(--card-front-ink)" }}
            >
              {item.front}
            </motion.h2>

            {frontExamples.length ? (
              <ul className="relative z-10 mt-7 w-full max-w-xl space-y-3">
                {frontExamples.map((sentence) => (
                  <li
                    key={sentence}
                    className="border-l-2 pl-3.5 text-left text-base leading-relaxed text-fg-2 sm:text-lg"
                    style={{ borderColor: ink }}
                  >
                    {sentence}
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Mastery: the visible form of the scheduler's opinion of this card. */}
            {stat ? (
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <MasteryRing percent={mastery} color={ink} size={26} />
                <span className="text-2xs font-bold text-fg-4">mastery</span>
              </div>
            ) : null}
            <div className="absolute bottom-4 right-4 flex items-center gap-1 text-2xs font-bold text-fg-4">
              <Icon as={UI.RotateCcw} size={12} /> Tap to flip
            </div>
          </div>

          {/*
            * BACK — light paper, heavy dark type.
            *
            * This face used to be the hardest thing on the screen: 20px of pale text on a
            * mid-tone green-to-navy gradient, which is roughly 3:1 contrast on a surface
            * that also competed with the panel behind it. It is now near-black type on a
            * near-white surface — about 17:1 — at double the size for the definition.
            */}
          <div
            className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl select-none"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "var(--card-back-bg)",
              border: `2px solid ${style.borderColor}66`,
              boxShadow: "var(--card-shadow)",
            }}
          >
            {/*
              * Only the content scrolls; the grading row is a sibling outside it.
              *
              * A single scrolling column put the grade buttons 51px below the fold at
              * 1440×800 — the one row that must always be reachable was the one that could
              * be scrolled away. Splitting the face means the definition and the reference
              * can be any length without ever hiding the controls.
              */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5 sm:p-6 md:p-8">
              <section className="text-center">
                <div className="text-2xs font-black uppercase tracking-[0.2em] text-cardback-2">Definition</div>
                <p className="mt-2 text-3xl font-bold leading-snug text-cardback sm:text-4xl lg:text-5xl">{item.back}</p>
                {item.example ? (
                  <p className="mt-3 text-lg italic leading-relaxed text-cardback-2 sm:text-xl">“{item.example}”</p>
                ) : null}
                {item.l1Translation ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-900">
                    <Icon as={UI.Globe} size={13} /> {item.l1Translation}
                  </p>
                ) : null}
              </section>

              {/*
                * The reference material keeps a dark surface.
                *
                * These panels are dense and were designed for one; forcing them light would
                * mean rewriting two components' worth of colour work for no legibility gain,
                * since nothing here needs to be read at a glance. Framing it as an inset
                * "notes" block turns the constraint into structure.
                */}
              <section onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setShowReference((value) => !value)}
                  aria-expanded={showReference}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--card-back-line)] bg-white px-4 py-2.5 text-sm font-black text-cardback-2 transition hover:border-slate-400 hover:bg-[var(--card-back-inset)]"
                >
                  <Icon as={showReference ? UI.X : UI.Scroll} size={15} />
                  {showReference ? "Hide reference" : "Etymology, examples & sound"}
                </button>

                {showReference ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 overflow-hidden rounded-2xl border border-[var(--card-back-line)] bg-[var(--card-back-inset)] p-3.5"
                  >
                    <div className="mb-2 text-2xs font-black uppercase tracking-[0.2em] text-cardback-2">Reference</div>
                    <EtymologyPanel item={item} />
                    <EnrichPanel word={item.front} l1={l1} autoFetch={autoEnrich} />
                  </motion.div>
                ) : null}
              </section>

              {/* Solid fills rather than tints: on a light card a 13% tint of the tier colour
                  with a same-colour label is barely legible, and these are the buttons the
                  whole loop depends on. */}
            </div>

            <div
              className="flex flex-wrap items-stretch justify-center gap-2 border-t border-[var(--card-back-line)] bg-[var(--card-back-rail)] px-3 py-3 sm:px-4"
              onClick={(event) => event.stopPropagation()}
            >
              {(["easy", "good", "hard"] as Difficulty[]).map((d) => (
                  <motion.button
                    key={d}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onCorrect(d)}
                    className="flex min-w-[104px] flex-1 flex-col items-center rounded-xl px-4 py-2.5 text-white sm:flex-none"
                    style={{ background: GRADE_FILL[d] }}
                    aria-label={`${DIFFICULTY_CONFIG[d].label}, plus ${DIFFICULTY_CONFIG[d].points} XP, next review in ${previews[gradeFromDifficulty(d)]}`}
                  >
                    <span className="text-sm font-black">
                      {DIFFICULTY_CONFIG[d].label} +{DIFFICULTY_CONFIG[d].points}
                    </span>
                    <span className="text-2xs font-bold text-white">next in {previews[gradeFromDifficulty(d)]}</span>
                  </motion.button>
                ))}
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={onWrong}
                className="flex min-w-[96px] flex-1 items-center justify-center rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 sm:flex-none"
              >
                Miss
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </Tilt3D>
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
    <div className="mx-auto w-full max-w-[1400px]">
      <div className="relative mb-5 overflow-hidden rounded-3xl border p-5" style={{ background: "var(--panel-xp-rail)", borderColor: "#f59e0b66" }}>
        <div className="relative flex items-center gap-5">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <StageGlyph stage={stage.stage} size={64} />
          </motion.div>
          <div className="flex-1">
            <div className="mb-2 flex justify-between gap-3">
              {/*
               * The level reads in the primary ink, not in amber.
               *
               * Amber *is* the tier colour for this mode, but as 15px text it was the one
               * label on the screen a learner could not read. The colour survives where it
               * belongs — the bar, the XP figure and the border — and the words are legible.
               */}
              <span className="text-lg font-black text-fg-1">Lv.<span className="tnum" data-num>{level}</span> {stage.title}</span>
              {/* `--accent-xp` rather than `--accent-warn`: this is the one place the gold is
                  *read* rather than looked at, so it needs the deep ink that clears 7.7:1 on
                  parchment instead of the amber that only reads on black. */}
              <span className="tnum text-base font-bold text-accent-xp" data-num>{xpToNextLevel(xp)} XP to evolve</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full border border-line-1 bg-[var(--track)]">
              <motion.div animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #d97706, #fcd34d)", boxShadow: "0 1px 6px rgba(217,119,6,0.5)" }} />
            </div>
          </div>
          <div className="text-right"><div className="tnum text-4xl font-black text-accent-xp" data-num>{xp}</div><div className="text-base font-bold text-fg-3">Total XP</div></div>
        </div>
      </div>
      <div style={{ perspective: "1200px" }} onClick={() => { sfx.play("cardFlip"); setFlipped(!flipped); }}>
        {/*
         * Both faces clip, and the back face scrolls its own content.
         *
         * The container's height is fixed by `min-h`, because it has no in-flow content —
         * both faces are `absolute inset-0`. So a long definition at display size did not
         * make the card taller; it simply spilled out of a rounded rectangle and printed
         * over the page around it. `overflow-hidden` stops that, and a scrollable body with
         * a pinned button rail means a long definition is *read* rather than clipped.
         */}
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.55 }} style={{ transformStyle: "preserve-3d" }} className="relative min-h-[440px] w-full cursor-pointer">
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-amber-300 px-8 py-6 text-center dark:border-amber-400/40" style={{ backfaceVisibility: "hidden", background: "var(--panel-xp-front)" }}>
            <div className="mb-6 flex items-center gap-2 rounded-full border border-amber-300 bg-[var(--surface-inset)] px-4 py-1.5 text-base font-black text-accent-xp dark:border-amber-400/40">
              <Icon as={UI.Swords} size={17} /> Enemy Card
            </div>
            {/* The word is the prompt: it gets the primary ink, at the largest size on the
                screen, rather than the tier accent. `break-words` so a long word wraps
                instead of widening the card. */}
            <motion.h2 key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="word-display max-w-full break-words text-5xl text-fg-1 sm:text-6xl lg:text-7xl">{item.front}</motion.h2>
            {item.pronunciation ? (
              <p className="mt-3 font-mono text-lg text-fg-3">{item.pronunciation}</p>
            ) : null}
            <p className="mt-6 flex items-center gap-2 text-base font-bold text-fg-4">
              <Icon as={UI.RotateCcw} size={15} /> Tap the card to face the enemy
            </p>
          </div>
          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl border-2 border-emerald-300 dark:border-emerald-400/40" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "var(--panel-xp-back)" }}>
            {/*
             * The definition is the *answer* on this face, which is why it used to be set at
             * display size — but a definition is a sentence, not a headline, and at 48px a
             * real one is four lines that do not fit. 24–30px is still the largest text on
             * the card and it fits twice as much.
             */}
            <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 text-center">
              <h2 className="mx-auto max-w-3xl text-2xl font-bold leading-snug text-fg-1 sm:text-3xl">{item.back}</h2>
              {item.example && (
                <p className="mx-auto mt-4 max-w-3xl text-lg italic leading-relaxed text-fg-2">“{item.example}”</p>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 border-t border-line-1 px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => onCorrect("perfect")} className="flex items-center gap-2 rounded-2xl border-2 px-6 py-4 text-base font-black" style={{ background: "#ec489922", borderColor: "#ec4899", color: "color-mix(in oklab, #ec4899 58%, var(--content-1))" }}>
                <Icon as={UI.Sparkles} size={19} /> Perfect +25
              </motion.button>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => onCorrect("good")} className="flex items-center gap-2 rounded-2xl border-2 px-6 py-4 text-base font-black" style={{ background: "#10b9811f", borderColor: "#059669", color: "var(--accent-good)" }}>
                <Icon as={UI.Swords} size={19} /> Correct +10
              </motion.button>
              <motion.button whileTap={{ scale: 0.92 }} onClick={onWrong} className="flex items-center gap-2 rounded-2xl border-2 px-6 py-4 text-base font-black" style={{ background: "#ef44441f", borderColor: "#dc2626", color: "var(--accent-bad)" }}>
                <Icon as={UI.X} size={19} /> Miss
              </motion.button>
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
  /* The countdown is read as text as well as shown as a bar, so it takes the theme's
     accent steps rather than the raw palette. */
  const timerColor = timeLeft <= 10 ? "var(--accent-bad)" : timeLeft <= 20 ? "var(--accent-warn)" : "var(--accent-good)";
  if (!raceActive) {
    return (
      <div className="mx-auto w-full max-w-[1400px] rounded-3xl border p-10 text-center" style={{ background: "var(--panel-race)", borderColor: "#ef444455", boxShadow: "var(--panel-shadow)" }}>
        <div className="mb-4 flex justify-center text-accent-bad">
          <Icon as={UI.Timer} size={64} strokeWidth={1.4} />
        </div>
        <h3 className="mb-2 text-4xl font-black text-accent-bad">Time Attack!</h3>
        <p className="mb-6 text-lg text-fg-3">Score: <strong className="tnum text-accent-good" data-num>{raceScore}</strong></p>
        <div className="mb-6 flex justify-center gap-3">
          {[30, 60, 90].map((t) => (
            <button key={t} onClick={() => setSelectedTime(t)} className="rounded-xl border-2 px-5 py-2.5 text-base font-black"
              style={{ background: selectedTime === t ? "#ef444422" : "var(--surface-control)", borderColor: selectedTime === t ? "var(--accent-bad)" : "var(--border-control)", color: selectedTime === t ? "var(--accent-bad)" : "var(--content-3)" }}>{t}s</button>
          ))}
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setTimeLeft(selectedTime); setRaceScore(0); setRaceActive(true); }}
          className="inline-flex items-center gap-2 px-12 py-4 rounded-full font-black text-xl text-white" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 0 30px rgba(239,68,68,0.5)" }}>
          <Icon as={UI.Play} size={20} /> START
        </motion.button>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-5 flex-1 overflow-hidden rounded-full bg-[var(--track)]"><motion.div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPercent}%`, background: timerColor }} /></div>
        <motion.div className="tnum w-20 text-right text-5xl font-black" data-num animate={timeLeft <= 10 ? { scale: [1, 1.1, 1] } : {}} style={{ color: timerColor }}>{timeLeft}</motion.div>
        <div className="text-right"><div className="text-base font-bold text-fg-3">Score</div><div className="tnum text-3xl font-black text-accent-good" data-num>{raceScore}</div></div>
      </div>
      <motion.div key={item.id} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border p-8 text-center" style={{ background: "var(--panel-race-card)", borderColor: "#ef444444", boxShadow: "var(--panel-shadow)" }}>
        <p className="text-2xl font-bold leading-snug text-fg-1 sm:text-3xl">{item.back}</p>
      </motion.div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {options.map((opt) => {
          const correct = opt.id === item.id;
          const showCorrect = answered !== null && correct;
          const showWrong = answered === false && !correct;
          return (
            <motion.button key={opt.id} whileTap={{ scale: 0.96 }} onClick={() => handleAnswer(opt)} disabled={answered !== null}
              className="rounded-2xl border-2 p-5 text-lg font-black sm:text-xl"
              style={{ background: showCorrect ? "#10b98122" : showWrong ? "#ef444422" : "var(--surface-control)", borderColor: showCorrect ? "var(--accent-good)" : showWrong ? "var(--accent-bad)" : "var(--border-control)", color: showCorrect ? "var(--accent-good)" : showWrong ? "var(--accent-bad)" : "var(--content-1)" }}>
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
    <div className="mx-auto w-full max-w-[1400px] rounded-3xl border p-10 text-center" style={{ background: "var(--panel-speak)", borderColor: "#3b82f655", boxShadow: "var(--panel-shadow)" }}>
      <div className="mb-3 flex items-center justify-center gap-2 text-base font-black uppercase tracking-wider text-accent-info">
        <Icon as={UI.Mic} size={17} /> Say This Word
      </div>
      <motion.h2 key={item.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="word-display mb-3 text-6xl text-fg-1 sm:text-7xl">{item.front}</motion.h2>
      <p className="mb-8 text-xl text-fg-2">“{item.back}”</p>
      <div className="relative flex items-center justify-center mb-6">
        {isListening && (
          <>
            <motion.div className="absolute rounded-full" style={{ background: "rgba(59,130,246,0.2)", width: 96, height: 96 }} animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
            <motion.div className="absolute rounded-full" style={{ background: "rgba(59,130,246,0.15)", width: 96, height: 96 }} animate={{ scale: [1, 2], opacity: [0.4, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }} />
          </>
        )}
        <motion.button whileTap={{ scale: 0.92 }} onClick={startListening} disabled={isListening || result !== null}
          className="z-10 flex h-28 w-28 items-center justify-center rounded-full border-4 text-white"
          aria-label={result === "correct" ? "Correct. Press to try another word" : result === "wrong" ? "Not recognised. Press to try again" : isListening ? "Listening" : "Start listening"}
          style={{ background: isListening ? "linear-gradient(135deg, #ef4444, #dc2626)" : result === "correct" ? "linear-gradient(135deg, #10b981, #047857)" : "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderColor: isListening ? "#ef4444" : result === "correct" ? "#10b981" : "#3b82f6" }}>
          {result === "correct" ? (
            <Icon as={UI.Check} size={40} strokeWidth={2.4} />
          ) : result === "wrong" ? (
            <Icon as={UI.X} size={40} strokeWidth={2.4} />
          ) : isListening ? (
            <Icon as={UI.AudioLines} size={40} strokeWidth={2} />
          ) : (
            <Icon as={UI.Mic} size={40} strokeWidth={2} />
          )}
        </motion.button>
      </div>
      {transcript && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl border mb-4" style={{ background: result === "correct" ? "#10b98111" : "#ef444411", borderColor: result === "correct" ? "#10b98144" : "#ef444444" }}>
          <p className="text-sm text-fg-4 mb-1">Heard:</p>
          <p className="text-2xl font-black" style={{ color: result === "correct" ? "var(--accent-good)" : "var(--accent-bad)" }}>“{transcript}”</p>
        </motion.div>
      )}
      <p className="flex items-center justify-center gap-1.5 text-base text-fg-3">
        {isListening ? (
          <>
            <span aria-hidden="true" className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" /> Listening…
          </>
        ) : (
          "Click the microphone and say the word"
        )}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SWIPE MODE
// ═══════════════════════════════════════════════════════════
/**
 * Swipe — a deck you deal through, shaped like a dating app.
 *
 * The previous version was a single card that happened to be draggable, which is not the
 * same thing as the interaction people already know: the thing that makes a swipe deck
 * readable at a glance is *the stack behind the top card*, because it tells you how much
 * is left and that the card you are holding is on top of something. So there are three
 * cards here, the top one draggable with rotation and stamps, and a decision throws it
 * off screen and deals the next.
 *
 * The card is a *photo with a caption*, not a text panel: the hero area carries the word
 * over a dark scrim the way a profile carries a name, and the definition sits underneath
 * — which is also the right order for a learner, because the word is the prompt.
 *
 * "Like" is a correct answer and "nope" is a miss, and they map onto the same two
 * callbacks as every other mode, so a session in Swipe still feeds the scheduler.
 */
function SwipeMode({
  item,
  items,
  index,
  stat,
  autoImage,
  onCorrect,
  onWrong,
  onUpdateLove,
}: {
  item: FlashItem;
  items: FlashItem[];
  index: number;
  stat: ItemStat;
  /** Whether to look a photograph up when the card does not carry one. */
  autoImage: boolean;
  onCorrect: (d: Difficulty) => void;
  onWrong: () => void;
  onUpdateLove: (d: number) => void;
}) {
  const x = useMotionValue(0);
  /*
   * A little vertical travel on the throw.
   *
   * A card that leaves on a perfectly horizontal line looks like a slide transition. A
   * slight upward arc is what a card does when it is thrown, and it costs one motion
   * value — but only on the *way out*: the vertical drag axis is deliberately unused so
   * the up-direction can stay free for the details sheet.
   */
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-280, 0, 280], [-13, 0, 13]);
  // The stamps fade in with *travel*, not with touch: a small nudge should not look like a verdict.
  const likeOpacity = useTransform(x, [30, 132], [0, 1]);
  const nopeOpacity = useTransform(x, [-132, -30], [1, 0]);
  const stampScale = useTransform(x, [-200, 0, 200], [1.15, 0.85, 1.15]);

  const [leaving, setLeaving] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  /*
   * The "It's a match" overlay.
   *
   * `matchReason` is what earned it rather than a boolean, because the overlay says
   * something different for each: a super like is a decision the learner made, mastery is
   * something that happened to them, and the copy should not pretend otherwise.
   *
   * `celebrated` keeps a mastered card from throwing a party every single time it is
   * liked afterwards. A Set in a ref rather than state because it must not cause a
   * render and must survive the card change.
   */
  const [matchReason, setMatchReason] = useState<null | { reason: "super" | "mastery"; word: string }>(null);
  const celebrated = useRef<Set<string>>(new Set());
  /*
   * The photograph, from two sources in order of trust.
   *
   * First the URL the lesson generator supplied, because a model that has read the lesson
   * can choose an image that actually illustrates the word. Then a Wikimedia lookup, which
   * is a filename search and therefore sometimes literal but wrong — it is a fallback, not
   * an equal.
   *
   * `photoFailed` is deliberately *not* one flag for the deck: a single dead link should
   * cost one card its picture, not every card after it.
   */
  const [lookedUp, setLookedUp] = useState<WordImage | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo: { url: string; credit: string } | null = item.image
    ? { url: item.image, credit: item.imageCredit ?? "" }
    : lookedUp;
  const loveData = getLoveLevel(stat.loveLevel || 0);
  const rarity = item.rarity || "common";
  const tier = RARITY_CONFIG[rarity];
  const ink = `var(--rarity-${rarity}-ink)`;

  /* The next two cards, so the deck reads as a deck rather than a single card. */
  const behind = [1, 2]
    .map((offset) => items[(index + offset) % Math.max(1, items.length)])
    .filter((card): card is FlashItem => Boolean(card));

  /*
   * Reset the picture per card, then look one up only if this card has none.
   *
   * The `cancelled` flag matters: flipping through a deck quickly starts a request per
   * card, and without it a slow response for card 3 can land after card 5 has already
   * mounted and put the wrong photograph on the right word.
   */
  useEffect(() => {
    setPhotoFailed(false);
    setLookedUp(null);
    if (item.image || !autoImage) return;
    let cancelled = false;
    void findWordImage(item.front).then((result) => {
      if (!cancelled) setLookedUp(result);
    });
    return () => {
      cancelled = true;
    };
  }, [item.id, item.front, item.image, autoImage]);

  const decide = useCallback(
    (direction: "left" | "right", strength: "like" | "super" = "like") => {
      /*
       * Both guards matter.
       *
       * `leaving` stops a double-throw mid-animation; `matchReason` stops the arrow keys
       * swiping the card *behind* the match overlay, which is the kind of bug that only
       * shows up when someone is excited and mashing keys.
       */
      if (leaving || matchReason) return;
      setLeaving(true);
      /*
       * A super like reads as *more*: it leaves faster and travels further, and it gets
       * its own sound. When a stronger choice looks identical to a weaker one, the extra
       * option is only decoration.
       */
      const superLike = strength === "super";
      sfx.play(direction === "left" ? "swipeBack" : superLike ? "match" : "swipe");
      animate(x, (direction === "right" ? 1 : -1) * (superLike ? 820 : 660), {
        duration: superLike ? 0.3 : 0.34,
        ease: [0.16, 1, 0.3, 1],
      });
      animate(y, superLike ? -150 : -60, { duration: 0.38, ease: [0.16, 1, 0.3, 1] });

      window.setTimeout(() => {
        if (direction === "right") {
          sfx.play("love");
          launchConfetti("love");
          onUpdateLove(superLike ? 3 : 1);
          /*
           * Speech only on a like.
           *
           * Narrating every swipe — including the misses — turned a quiet interaction into
           * a monologue. Praise is worth hearing; "wrong" is already visible on the card.
           */
          voice.speak(loveData.comments[Math.floor(Math.random() * loveData.comments.length)], "love");
          onCorrect(superLike ? "perfect" : "good");
          /*
           * When the overlay is worth interrupting for.
           *
           * Not on every like — a deck of eight would be a confetti storm and the moment
           * would stop meaning anything. It fires for a super like, which is a deliberate
           * decision, and for a card that has finally reached full mastery, which is the
           * one thing a spacing algorithm can honestly congratulate someone on.
           */
          /*
           * The word is captured *here*, not read from `item` when the overlay renders.
           *
           * `onCorrect` advances the deck immediately, so by the time React paints the
           * overlay `item` is already the next card — and the first version congratulated
           * the learner on a word they had not answered yet.
           */
          if (superLike) setMatchReason({ reason: "super", word: item.front });
          else if (masteryPercent(stat) >= 100 && !celebrated.current.has(item.id)) {
            celebrated.current.add(item.id);
            setMatchReason({ reason: "mastery", word: item.front });
          }
        } else {
          sfx.play("angry");
          onUpdateLove(-1);
          onWrong();
        }
        // The motion value is *not* component state: it survives the card change, so it
        // has to be reset by hand or the next card arrives already off screen.
        x.set(0);
        y.set(0);
        setLeaving(false);
        setShowDetail(false);
      }, superLike ? 320 : 360);
    },
    [leaving, matchReason, loveData, onCorrect, onWrong, onUpdateLove, x, y, stat, item.id, item.front]
  );

  // Arrow keys, so the deck works for a tutor driving from a projector keyboard.
  useKeyboardShortcuts(
    {
      ArrowLeft: () => decide("left"),
      ArrowRight: () => decide("right"),
      ";": () => decide("left"),
      "'": () => decide("right"),
      // `s` for super like, and Escape to leave the overlay — both needed because this
      // deck is driven from a projector keyboard as often as from a trackpad.
      s: () => decide("right", "super"),
      Escape: () => setMatchReason(null),
    },
    true
  );

  /*
   * The chips that sit under the word, in the place a dating profile keeps
   * "5'9 · Fitness · Dog lover".
   *
   * This row is doing real teaching work rather than dressing: part of speech, register
   * and CEFR level are exactly the facts a learner needs before deciding whether they own
   * the word, and in every other mode they are buried in the reference panel.
   */
  const chips = [
    item.partOfSpeech,
    item.register,
    item.cefr,
    `${stat.rep} review${stat.rep === 1 ? "" : "s"}`,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col">
      {/*
       * The app bar.
       *
       * Small, but it is most of why the screen reads as *an app* rather than as a card on
       * a page: a mark, a wordmark, a count, and the two directions on the right where a
       * thumb expects them. The legend doubles as the keyboard hint so the row is not
       * decoration-only.
       */}
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-line-1 bg-panel px-3 py-2" style={{ boxShadow: "var(--panel-shadow)" }}>
        <span className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, #fb7185, #e11d48)", boxShadow: "0 4px 12px rgba(225,29,72,0.35)" }}
            aria-hidden="true"
          >
            <Icon as={UI.Flame} size={19} strokeWidth={2.4} />
          </span>
          <span className="leading-tight">
            <span className="word-display block text-lg font-semibold text-fg-1">Wordfinder</span>
            <span className="block text-2xs font-bold text-fg-4">Swipe review</span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs font-bold text-accent-bad sm:flex">
            <Icon as={UI.X} size={13} strokeWidth={3} /> nope
          </span>
          <span className="tnum rounded-full border border-line-2 bg-inset px-2.5 py-1 text-xs font-black text-fg-2" data-num>
            {index + 1} / {items.length}
          </span>
          <span className="hidden items-center gap-1.5 text-xs font-bold text-accent-good sm:flex">
            know it <Icon as={UI.Heart} size={13} strokeWidth={3} />
          </span>
        </span>
      </div>

      {/* The stack. Cards behind are inset, lifted and dimmed so the top one reads as held. */}
      {/*
       * The deck takes whatever height is left under the chrome, rather than a fixed 520px.
       *
       * 560 is the space the header, the mascot, the app bar and the tab strip actually
       * occupy above it; hard-coding a card height instead meant the card ran off the
       * bottom of a laptop screen and took the action rail with it.
       */}
      <div className="relative h-[clamp(360px,calc(100dvh-500px),640px)] select-none">
        {behind
          .map((card, offset) => ({ card, depth: behind.length - offset }))
          .reverse()
          .map(({ card, depth }) => {
            const cardTier = RARITY_CONFIG[card.rarity || "common"];
            return (
              <div
                key={card.id}
                aria-hidden="true"
                className="absolute inset-x-0 top-0 overflow-hidden rounded-[30px] border border-line-1"
                style={{
                  height: "100%",
                  /*
                   * The card behind shows its *photo*, not its word.
                   *
                   * A real deck hiding text under text looks like a stack of screenshots.
                   * The tier wash and the faint sigil are what the card would look like if
                   * you could see it, which is exactly the information the stack is there
                   * to give: how much is left, and roughly what is in it.
                   */
                  background: `radial-gradient(130% 110% at 50% 0%, ${cardTier.color}2e, transparent 70%), linear-gradient(165deg, var(--surface-sunken), var(--surface-inset))`,
                  transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.04})`,
                  opacity: 1 - depth * 0.25,
                  boxShadow: "var(--card-shadow)",
                }}
              >
                <div className="absolute inset-0 opacity-[0.09]">
                  <RuneSigil seed={card.front} size={420} className="text-fg-1" />
                </div>
              </div>
            );
          })}

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.85}
          style={{ x, y, rotate, boxShadow: "var(--card-shadow)", borderColor: tier.color }}
          onDragEnd={(_, info) => {
            const flung = Math.abs(info.velocity.x) > 520;
            if (info.offset.x > 128 || (flung && info.velocity.x > 0)) decide("right");
            else if (info.offset.x < -128 || (flung && info.velocity.x < 0)) decide("left");
          }}
          className="absolute inset-0 flex cursor-grab flex-col overflow-hidden rounded-[30px] border-2 bg-white active:cursor-grabbing"
          animate={leaving ? undefined : { scale: 1 }}
          initial={{ scale: 0.96 }}
          key={`${item.id}`}
          aria-label={`${item.front}. Drag, or use the arrow keys, to sort this card.`}
        >
          {/*
           * The hero.
           *
           * There is no photograph and there never will be in a single-file offline build,
           * so the "photo" is generated from the card itself: the tier wash, the word's own
           * sigil drawn large and faint, and the drifting motes. It reads as an image
           * rather than as a placeholder because it is specific to this word — two cards
           * never look alike.
           */}
          {/*
           * The photo, and the card *is* the photo.
           *
           * The previous layout split the card into a picture on top and a caption below,
           * which is a website. In the app this imitates, the picture is the card and
           * everything you are told about the person is printed *over* the bottom of it —
           * which also happens to be the right order for a learner, because the word is the
           * prompt and the meaning is the answer, so the answer should sit under it.
           *
           * There is no photograph and there never will be in a single-file offline build,
           * so the photo is generated from the card: the tier wash, the word's own sigil
           * drawn large and faint, and the drifting motes. It reads as an image rather than
           * as a placeholder because it is specific to this word.
           */}
          {/*
           * A real flex column: the photograph takes the space that is left, the sheet takes
           * what it needs.
           *
           * The previous version anchored the sheet to the bottom of the card at up to 66%
           * of its height, which on a short card left a *band* of photograph rather than a
           * picture — the thing that makes the screen read as a photo deck was squeezed out
           * by the text under it.
           */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface-sunken)]">
            {photo && !photoFailed ? (
              <>
                {/*
                 * The photograph.
                 *
                 * `alt=""` unless the deck supplies one. The image is decoration here — the
                 * word printed on the sheet below *is* the content, and an alt attribute
                 * derived from it would just make a screen reader announce the word twice.
                 *
                 * `referrerPolicy="no-referrer"` because the tutor's own URL should not be
                 * handed to a third-party image host with every card flip.
                 */}
                <img
                  src={photo.url}
                  alt={item.imageAlt ?? ""}
                  onError={() => setPhotoFailed(true)}
                  referrerPolicy="no-referrer"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* A wash of the tier colour so the deck still reads as tiered when every
                    photograph is a different real image. */}
                <div
                  className="absolute inset-0 mix-blend-multiply"
                  style={{ background: `linear-gradient(200deg, ${tier.color}00 45%, ${tier.color}30 100%)` }}
                />
              </>
            ) : (
              /*
               * The generated picture, for a card with no image and no lookup result.
               *
               * Kept as the fallback rather than a placeholder box: it is specific to this
               * word — the tier wash, the word's own sigil, its motes — so a deck with no
               * photographs still looks like a deck rather than like a broken build.
               */
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(130% 110% at 50% 0%, ${tier.color}4a, transparent 72%), linear-gradient(165deg, var(--surface-sunken), var(--surface-inset))`,
                  }}
                />
                <div className="absolute inset-0 opacity-[0.13]">
                  <RuneSigil seed={item.front} size={460} className="text-fg-1" />
                </div>
                <ParticleAura rarity={rarity} count={10} />
                <DriftField count={12} />
              </>
            )}

            {/* The badges, top-left, where a verified badge lives. */}
            <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-black uppercase tracking-wider text-white shadow-sm"
                style={{ background: "rgba(4,6,12,0.62)", backdropFilter: "blur(6px)" }}
              >
                <RarityGlyph rarity={rarity} size={11} />
                {tier.label}
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-2xs font-black uppercase tracking-wider text-white shadow-sm"
                style={{ background: "rgba(4,6,12,0.62)", backdropFilter: "blur(6px)" }}
              >
                {loveData.title}
              </span>
            </div>

            {/*
             * The details control, top-right.
             *
             * It opens a sheet from the bottom rather than expanding in place: a bottom
             * sheet is what the app it imitates does, and it means the reference material
             * can be any length without the card growing and pushing the action rail off
             * the screen.
             */}
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); setShowDetail((value) => !value); }}
              onPointerDownCapture={(event) => event.stopPropagation()}
              aria-expanded={showDetail}
              aria-label={showDetail ? "Hide the word details" : "Show the word details"}
              className="absolute right-4 top-4 flex h-10 items-center gap-1.5 rounded-full bg-white/92 px-3 text-xs font-black text-[#0b1220] shadow-md"
              style={{ backdropFilter: "blur(8px)" }}
            >
              <Icon as={showDetail ? UI.X : UI.Chevron} size={14} strokeWidth={2.6} />
              {showDetail ? "Close" : "Details"}
            </button>

            {/*
             * The sheet.
             *
             * White with black text, and that is a legibility decision before it is a
             * stylistic one. The previous version put the word and the definition on a dark
             * scrim over the picture, which works when you know how bright the picture is —
             * and here the picture is whatever the lesson generator or Commons handed us. A
             * scrim tuned for the generated art was unreadable over a bright photograph and
             * pointless over a dark one. Black on white cannot be defeated by the image
             * behind it, and it is also exactly what a light-mode profile card looks like.
             */}
            {/*
             * `mt-auto` is what pins the sheet to the bottom.
             *
             * It is the only in-flow child of the picture layer — the image, the badges, the
             * details control and the stamps are all deliberately out of flow — so `mt-auto`
             * inside a flex column puts it at the bottom without a spacer element and without
             * lifting it out of the layout.
             */}
            <div className="mt-auto flex max-h-[56%] shrink-0 flex-col overflow-hidden rounded-t-[26px] bg-white shadow-[0_-14px_34px_rgba(11,18,32,0.22)]">
              <div className="flex items-start gap-3 px-4 pb-1.5 pt-4">
                <h2 className="word-display min-w-0 flex-1 break-words text-4xl leading-[1.05] text-[#0b1220] sm:text-5xl">{item.front}</h2>
                <div className="flex shrink-0 flex-col items-center gap-0.5 pt-1">
                  {/* Neutral ink rather than the tier colour: a gold ring next to black text
                      read as a different, louder visual language. The tier is stated by the
                      badge on the photo and the tinted chip below. */}
                  <MasteryRing percent={masteryPercent(stat)} color="#0b1220" size={34} />
                  <span className="text-2xs font-black uppercase tracking-wider text-[#5c6d84]">mastery</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 px-4">
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-2xs font-black uppercase tracking-wider text-[#0b1220]"
                  style={{ background: `${tier.color}1f`, borderColor: `${tier.color}66` }}
                >
                  <RarityGlyph rarity={rarity} size={11} />
                  {tier.label}
                </span>
                {item.pronunciation ? (
                  <span className="font-mono text-sm text-[#35435a]">{item.pronunciation}</span>
                ) : null}
                {chips.map((chip) => (
                  <span key={chip} className="rounded-full border border-[#dbe3ee] bg-[#f1f5fb] px-2.5 py-1 text-2xs font-bold text-[#35435a]">
                    {chip}
                  </span>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3.5 pt-2.5">
                <p className="text-lg font-semibold leading-snug text-[#0b1220] sm:text-xl">{item.back}</p>

                {item.example ? (
                  <p className="mt-2 border-l-2 pl-3 text-sm italic leading-relaxed text-[#35435a]" style={{ borderColor: tier.color }}>
                    “{item.example}”
                  </p>
                ) : null}

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {item.l1Translation ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe3ee] bg-[#f1f5fb] px-2.5 py-1 text-xs font-bold text-[#35435a]">
                      <Icon as={UI.Globe} size={12} /> {item.l1Translation}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 text-2xs font-bold text-[#5c6d84]">
                    <Icon as={UI.Timer} size={11} /> seen {timeAgo(stat.lastSeen)} · <span className="tnum" data-num>{stat.rep}</span> reviews
                  </span>
                </div>

                {/* Attribution, because these are other people's photographs. Shown only
                    when the source actually supplied a credit. */}
                {photo?.credit ? (
                  <p className="mt-2 truncate text-2xs text-[#5c6d84]">Photo: {photo.credit}</p>
                ) : null}
              </div>
            </div>

            {/* The stamps. Rotated like a rubber stamp, and only visible once the card travels. */}
            <motion.span
              aria-hidden="true"
              style={{ opacity: likeOpacity, scale: stampScale }}
              className="absolute left-4 top-[24%] flex -translate-y-1/2 -rotate-[14deg] items-center gap-2 rounded-2xl border-[5px] border-emerald-500 bg-white/90 px-4 py-1.5 text-3xl font-black uppercase tracking-widest text-emerald-600 shadow-lg sm:text-4xl"
            >
              <Icon as={UI.Heart} size={28} strokeWidth={3.2} />
              Know it
            </motion.span>
            <motion.span
              aria-hidden="true"
              style={{ opacity: nopeOpacity, scale: stampScale }}
              className="absolute right-4 top-[24%] flex -translate-y-1/2 rotate-[14deg] items-center gap-2 rounded-2xl border-[5px] border-rose-500 bg-white/90 px-4 py-1.5 text-3xl font-black uppercase tracking-widest text-rose-600 shadow-lg sm:text-4xl"
            >
              <Icon as={UI.X} size={28} strokeWidth={3.6} />
              Nope
            </motion.span>

            {/*
             * The bottom sheet.
             *
             * The reference material keeps its *fixed light* palette rather than following
             * the theme, for the same reason the answer face does: nothing here needs to be
             * read at a glance from across a room, and it holds far too much detail to be
             * legible on a scrim.
             */}
            {/*
             * The reference sheet: opaque white, and that has to be a real
             * `background-color`.
             *
             * This was `bg-[var(--card-back-bg)]`, which Tailwind compiles to
             * `background-color: var(--card-back-bg)` — and that token holds a
             * *linear-gradient*. A gradient is not a valid background-**color**, so the browser
             * dropped the declaration whole and the sheet painted nothing at all: the
             * reference text sat directly on the photograph and could not be read.
             *
             * Solid white rather than the card-back gradient, for the same reason the info
             * sheet above it is white — the photograph behind it is unpredictable, and this
             * one holds etymology, IPA and live lookup results.
             */}
            <AnimatePresence>
              {showDetail ? (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-x-0 bottom-0 max-h-[74%] overflow-y-auto rounded-t-[26px] border-t-2 border-[var(--card-back-line)] bg-white p-4"
                  style={{ boxShadow: "0 -14px 34px rgba(11,18,32,0.24)" }}
                  onPointerDownCapture={(event) => event.stopPropagation()}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-2xs font-black uppercase tracking-[0.2em] text-cardback-2">Reference</span>
                    <button
                      type="button"
                      onClick={() => setShowDetail(false)}
                      className="rounded-lg p-1 text-cardback-2 transition hover:bg-[var(--card-back-inset)]"
                      aria-label="Close the reference sheet"
                    >
                      <Icon as={UI.X} size={15} strokeWidth={2.6} />
                    </button>
                  </div>
                  {item.l1Translation ? (
                    <p className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--card-back-inset)] px-2.5 py-1 text-sm font-bold text-cardback">
                      <Icon as={UI.Globe} size={13} /> {item.l1Translation}
                    </p>
                  ) : null}
                  <p className="text-xl font-bold leading-snug text-cardback">{item.back}</p>
                  <div className="mt-1.5 h-0.5 w-12 rounded-full" style={{ background: ink }} />
                  <EtymologyPanel item={item} />
                  <EnrichPanel word={item.front} l1="es" autoFetch={false} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/*
       * The action rail.
       *
       * Five controls, sized and spaced like the app this imitates — the two decisions are
       * large and sit at the ends, the three supporting actions are smaller and sit between
       * them — so a tutor on a touch screen or a projector never has to drag anything.
       *
       * There is deliberately no rewind. Undoing a *graded review* is not the same gesture
       * as un-sending a like: it would rewrite the scheduler's state and the learner's own
       * memory of what they knew. Every button here does something honest instead.
       */}
      <div className="sticky bottom-2 z-20 mt-3 flex flex-col items-center gap-1.5">
        <div className="flex items-center justify-center gap-3 rounded-full border border-line-1 bg-panel px-4 py-3 sm:gap-4" style={{ boxShadow: "0 12px 34px rgba(15,23,42,0.20)", backdropFilter: "blur(12px)" }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowDetail((value) => !value)}
          aria-label="Show or hide the word details"
          aria-expanded={showDetail}
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-sky-300 bg-panel text-accent-info shadow-md sm:h-[52px] sm:w-[52px] dark:border-sky-400/40"
        >
          <Icon as={UI.BookOpen} size={20} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => decide("left")}
          aria-label={`Nope \u2014 mark ${item.front} as not yet known`}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-300 bg-panel text-accent-bad shadow-lg transition hover:border-rose-400 sm:h-[68px] sm:w-[68px] dark:border-rose-400/40"
        >
          <Icon as={UI.X} size={30} strokeWidth={2.6} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { voice.speak(item.front); sfx.play("coin"); }}
          aria-label={`Hear ${item.front} pronounced`}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-violet-300 bg-panel text-accent-magic shadow-md sm:h-[58px] sm:w-[58px] dark:border-violet-400/40"
        >
          <Icon as={UI.Volume} size={23} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => decide("right", "super")}
          aria-label={`Super like ${item.front} \u2014 you know this one and want to prove it`}
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-300 bg-panel text-accent-xp shadow-md sm:h-[52px] sm:w-[52px] dark:border-amber-400/40"
        >
          <Icon as={UI.Star} size={20} strokeWidth={2.4} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => decide("right")}
          aria-label={`Know it \u2014 mark ${item.front} as correct`}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-300 bg-panel text-accent-good shadow-lg transition hover:border-emerald-400 sm:h-[68px] sm:w-[68px] dark:border-emerald-400/40"
        >
          <Icon as={UI.Heart} size={28} strokeWidth={2.6} />
        </motion.button>
        </div>
        <p className="text-center text-2xs font-bold text-fg-4">
          drag the card, or ← nope · <span className="text-accent-good">know it</span> → · <span className="text-accent-xp">s</span> for super like
        </p>
      </div>

      {/*
       * The match overlay.
       *
       * The one moment the app this imitates is famous for, and it is load-bearing here
       * too: a full-bleed interruption is the only way to say "you just proved you own
       * this word" without a counter that nobody watches. It is deliberately *rare* — a
       * super like, or a card reaching full mastery — so it never becomes wallpaper.
       */}
      {createPortal(
        <AnimatePresence>
        {matchReason ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            role="dialog"
            aria-modal="true"
            aria-label="It is a match"
            /*
             * Portalled to `document.body` rather than rendered here.
             *
             * `position: fixed` is resolved against the nearest *transformed* ancestor,
             * and every mode in this tool is wrapped in a framer-motion cross-fade that
             * leaves a transform behind. Rendered in place, "full screen" instead covered
             * only the mode's own box — a match overlay that stops two thirds of the way
             * across the page. A portal is the only place a transform cannot reach it.
             */
            className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6 text-center"
            style={{ background: "radial-gradient(120% 90% at 50% 18%, rgba(225,29,72,0.38), rgba(4,6,12,0.95) 66%)", backdropFilter: "blur(10px)" }}
          >
            <motion.p
              initial={{ scale: 0.35, rotate: -16, opacity: 0 }}
              animate={{ scale: 1, rotate: -6, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 15 }}
              className="word-display text-6xl font-bold italic leading-none text-white sm:text-7xl"
            >
              It&rsquo;s a <span style={{ color: "#fb7185" }}>match</span>!
            </motion.p>
            <p className="mt-4 max-w-md text-base font-bold leading-snug text-white/85 sm:text-lg">
              {matchReason.reason === "super"
                ? `You starred \u201C${matchReason.word}\u201D and got it right. That is a word you own.`
                : `\u201C${matchReason.word}\u201D has just reached full mastery. It will still come back \u2014 that is how you keep it.`}
            </p>

            <div className="my-8 flex items-center gap-4 sm:gap-6">
              <motion.span
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.12, type: "spring", stiffness: 200, damping: 18 }}
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white/85 sm:h-28 sm:w-28"
                style={{ background: `linear-gradient(150deg, ${tier.color}, #0b1220)` }}
              >
                <span className="word-display text-5xl font-semibold text-white">{matchReason.word.slice(0, 1).toUpperCase()}</span>
              </motion.span>
              <motion.span
                animate={{ scale: [1, 1.22, 1] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-rose-600 shadow-xl sm:h-16 sm:w-16"
                aria-hidden="true"
              >
                <Icon as={UI.Heart} size={26} strokeWidth={2.8} />
              </motion.span>
              <motion.span
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.12, type: "spring", stiffness: 200, damping: 18 }}
                className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/85 sm:h-28 sm:w-28"
                style={{ background: "linear-gradient(150deg, #fb7185, #e11d48)" }}
                aria-hidden="true"
              >
                <Icon as={UI.Flame} size={40} strokeWidth={2.2} />
              </motion.span>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-2.5 sm:flex-row sm:justify-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { voice.speak(matchReason.word); sfx.play("coin"); setMatchReason(null); }}
                className="flex-1 rounded-2xl px-6 py-3.5 text-base font-black text-white"
                style={{ background: "linear-gradient(135deg, #10b981, #047857)", boxShadow: "0 10px 26px rgba(16,185,129,0.35)" }}
              >
                <span className="inline-flex items-center gap-2"><Icon as={UI.Volume} size={17} /> Say it out loud</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setMatchReason(null)}
                className="flex-1 rounded-2xl border-2 border-white/35 px-6 py-3.5 text-base font-black text-white"
              >
                Keep swiping
              </motion.button>
            </div>
          </motion.div>
        ) : null}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TYPE MODE — free recall
// ═══════════════════════════════════════════════════════════
/**
 * Production, not recognition.
 *
 * Every other mode shows the word and asks what it means, which is recognition — the
 * easier skill, and the one that produces learners who understand a word in a book but
 * cannot retrieve it mid-sentence. This mode inverts it: the definition is the prompt and
 * the learner has to produce the word. That is the same direction as real use, and it is
 * why the answer check is forgiving about typos (see `isTypedAnswerCorrect`).
 */
function TypeMode({ item, onCorrect, onWrong }: { item: FlashItem; onCorrect: (d: Difficulty) => void; onWrong: () => void }) {
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<null | { correct: boolean; close: boolean }>(null);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /*
   * No reset effect here on purpose.
   *
   * Resetting in an effect means one committed render with the previous card's state,
   * which is how the attempt counter leaked from one card onto the next. The component
   * is mounted with `key={item.id}` by the parent instead, so a new card is a new
   * component and there is no stale state to reset.
   */
  const check = () => {
    if (result || !guess.trim()) return;
    const outcome = isTypedAnswerCorrect(guess, item.front);
    setResult(outcome);
    setAttempts((n) => n + 1);
    if (outcome.correct) {
      sfx.play("coin");
      // A clean first-try answer is worth the easy grade: it is the strongest signal
      // FSRS can receive, so it should not be graded the same as a second attempt.
      setTimeout(() => onCorrect(outcome.close || attempts > 0 ? "good" : "easy"), 900);
    } else {
      sfx.play("buzz");
      // Reveal the answer on the first miss rather than letting them guess blindly.
      if (attempts >= 1) setTimeout(() => onWrong(), 1500);
      else setTimeout(() => { setResult(null); setGuess(""); inputRef.current?.focus(); }, 1400);
    }
  };

  // A hint that grows: one letter, then two, so the prompt is solvable without giving up.
  const hintLength = 1 + attempts;

  return (
    <div className="mx-auto w-full max-w-[1200px] rounded-3xl border border-cyan-400/30 p-10 text-center" style={{ background: "var(--panel-type)", boxShadow: "var(--panel-shadow)" }}>
      <div className="mb-4 flex items-center justify-center gap-1.5 text-sm font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
        <Icon as={UI.Type} size={14} /> Type the word
      </div>

      {/* The definition *is* the prompt here — production rather than recognition — so it
          gets the largest type on the screen instead of a supporting size. */}
      <motion.h2 key={`${item.id}-back`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl text-3xl font-bold leading-snug text-fg-1 sm:text-4xl">
        {item.back}
      </motion.h2>
      {item.example ? <p className="mx-auto mt-3 max-w-2xl text-lg italic text-cyan-800/80 dark:text-cyan-200/80">“{item.example}”</p> : null}        <p className="mt-6 font-mono text-2xl tracking-[0.35em] text-fg-3">
        {item.front.slice(0, hintLength).toUpperCase()}
        {"·".repeat(Math.max(0, item.front.length - hintLength))}
      </p>

      <div className="mt-4 flex flex-col items-center gap-3">
        <input
          ref={inputRef}
          value={guess}
          onChange={(event) => setGuess(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); check(); } }}
          disabled={!!result}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Your answer"
          placeholder="Type the word…"
          className="w-full max-w-md rounded-xl border-2 border-line-2 bg-inset px-4 py-4 text-center text-2xl font-bold text-fg-1 outline-none transition"
          style={{ borderColor: result ? (result.correct ? "#10b981" : "#ef4444") : "rgba(34,211,238,0.4)" }}
        />

        {result ? (
          <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-base font-black" style={{ color: result.correct ? "var(--accent-good)" : "var(--accent-bad)" }}>
            <Icon as={result.correct ? UI.Check : UI.X} size={18} />
            {result.correct
              ? result.close
                ? `Almost perfect — it is “${item.front}”`
                : "Correct"
              : attempts >= 1
                ? `It is “${item.front}”`
                : "Not quite — try once more"}
          </motion.p>
        ) : (
          <button
            type="button"
            onClick={check}
            disabled={!guess.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-8 py-4 text-lg font-black text-white transition hover:bg-cyan-500 disabled:opacity-40"
          >
            <Icon as={UI.Check} size={19} /> Check
          </button>
        )}

        <p className="text-xs font-bold text-fg-4">Press Enter to check · {attempts === 0 ? "no attempts yet" : `${attempts} attempt${attempts === 1 ? "" : "s"}`}</p>
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
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-line-1 bg-panel p-10 text-center" style={{ boxShadow: "var(--panel-shadow)" }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-8">
          <div className="mb-4 flex justify-center" style={{ color: gameResult === "win" ? "var(--accent-good)" : "var(--accent-bad)" }}>
            <Icon as={gameResult === "win" ? UI.Trophy : UI.X} size={96} strokeWidth={1.3} />
          </div>
          <h2 className="text-5xl font-black" style={{ color: gameResult === "win" ? "var(--accent-good)" : "var(--accent-bad)" }}>{gameResult === "win" ? "VICTORY!" : "DEFEATED"}</h2>
          <p className="mt-3 text-lg font-bold text-fg-3">
            {gameResult === "win" ? "Every question you answered was a card review — that XP is real." : "The questions you missed are already queued to come back."}
          </p>
        </motion.div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={resetGame} className="inline-flex items-center gap-2 rounded-2xl px-10 py-4 text-xl font-black text-white" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
          <Icon as={UI.RotateCcw} size={21} /> Play Again
        </motion.button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <div className="rounded-3xl border border-line-1 bg-panel p-4 sm:p-6" style={{ boxShadow: "var(--panel-shadow)" }}>
      {/*
       * The health rails.
       *
       * These were `bg-black/40`, which on the light stage painted two near-black slabs
       * across the middle of the board — the single most obvious thing wrong with this tab.
       * `--track` is the recessed-slot token, so in light it is a faint grey well and in
       * dark it is the faint white well it always was. The border carries the side colour
       * instead of the fill, which is what keeps the two bars distinguishable without
       * either of them having to be dark.
       */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-black text-accent-info"><Icon as={UI.User} size={15} /> YOU</span>
            <span className="tnum text-base font-bold text-fg-2" data-num>{playerHP}/100</span>
          </div>
          <div className="h-5 overflow-hidden rounded-full border border-sky-300 bg-[var(--track)] dark:border-sky-400/40">
            <motion.div animate={{ width: `${playerHP}%` }} className="h-full rounded-full" style={{ background: playerHP > 30 ? "linear-gradient(90deg, #3b82f6, #06b6d4)" : "linear-gradient(90deg, #ef4444, #f87171)" }} />
          </div>
          {showDamage && showDamage.player > 0 && <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -30 }} className="text-2xl font-black text-red-600 dark:text-red-400">-{showDamage.player}</motion.div>}
        </div>
        <div className="text-fg-3"><Icon as={UI.Swords} size={28} /></div>
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="tnum text-base font-bold text-fg-2" data-num>{enemyHP}/100</span>
            <span className="flex items-center gap-1.5 font-black text-accent-bad">ENEMY <Icon as={UI.Warning} size={15} /></span>
          </div>
          <div className="h-5 overflow-hidden rounded-full border border-rose-300 bg-[var(--track)] dark:border-rose-400/40">
            <motion.div animate={{ width: `${enemyHP}%` }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #ef4444, #f97316)" }} />
          </div>
          {showDamage && showDamage.enemy > 0 && <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -30 }} className="text-right text-2xl font-black text-emerald-700 dark:text-emerald-400">-{showDamage.enemy}</motion.div>}
        </div>
      </div>
      {phase === "select" && (
        <div className="mt-5 text-center">
          <h3 className="mb-5 flex items-center justify-center gap-2 text-2xl font-black text-fg-1">
            <Icon as={UI.Layers} size={24} /> Select a Card to Attack!
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {hand.map((card, i) => {
              const rarity = card.rarity || "common";
              const config = RARITY_CONFIG[rarity];
              return (
                <motion.button key={card.id} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -12, scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => selectCard(card)}
                  className="relative flex h-60 w-44 flex-col items-center justify-between overflow-hidden rounded-2xl border-2 p-3.5"
                  style={{ background: `var(--rarity-${rarity}-card)`, borderColor: config.borderColor, boxShadow: `0 6px 20px ${config.glowColor}` }}>
                  <CardShimmer rarity={rarity} />
                  <CardFrame rarity={rarity} seed={card.front} ornament={config.ornament} showSigil={false} />
                  <div className="relative z-10 flex items-center justify-center rounded-full border px-3 py-1" style={{ borderColor: `${config.borderColor}66`, color: `var(--rarity-${rarity}-ink)` }}>
                    <RarityGlyph rarity={rarity} size={15} />
                  </div>
                  <div className="word-display relative z-10 line-clamp-3 text-center text-xl leading-tight text-fg-1">{card.front}</div>
                  <div className="tnum relative z-10 text-base font-bold text-fg-3" data-num>{config.questions}Q</div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
      {(phase === "playerAttack" || phase === "enemyAttack") && activeCard && activeQuestion && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-base font-black" style={{ color: phase === "playerAttack" ? "#3b82f6" : "#ef4444" }}>
              <Icon as={phase === "playerAttack" ? UI.Swords : UI.Shield} size={17} />
              {phase === "playerAttack" ? "ATTACK" : "DEFEND"}
            </div>
            <motion.div animate={questionTimer <= 3 ? { scale: [1, 1.2, 1] } : {}} className="tnum text-4xl font-black" data-num style={{ color: questionTimer <= 3 ? "var(--accent-bad)" : "var(--accent-warn)" }}>{questionTimer}s</motion.div>
            <div className="tnum text-base font-bold text-fg-3" data-num>Q{currentQuestion + 1}/{RARITY_CONFIG[activeCard.rarity || "common"].questions}</div>
          </div>
          <div className="rounded-3xl border-2 p-6 text-center sm:p-10" style={{ background: `var(--rarity-${activeCard.rarity || "common"}-card)`, borderColor: RARITY_CONFIG[activeCard.rarity || "common"].borderColor, boxShadow: `0 10px 34px ${RARITY_CONFIG[activeCard.rarity || "common"].glowColor}` }}>
            <div className="word-display mb-2 text-5xl text-fg-1 sm:text-6xl">{activeCard.front}</div>
            <div className="mb-5 text-xl font-bold text-fg-2 sm:text-2xl">{activeCard.back}</div>
            <div className="my-5 h-px bg-line-2" />
            <div className="mb-6 text-2xl font-bold leading-snug text-fg-1 sm:text-3xl">{activeQuestion.question}</div>
            <div className="flex justify-center gap-4">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => phase === "playerAttack" ? answerQuestion(activeQuestion.answer === true) : defendQuestion(activeQuestion.answer === true)}
                className="flex items-center gap-2 rounded-xl border-2 px-8 py-3.5 text-xl font-black sm:px-12 sm:py-4" style={{ background: "#10b98122", borderColor: "#10b981", color: "var(--accent-good)" }}>
                <Icon as={UI.Check} size={22} /> YES
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => phase === "playerAttack" ? answerQuestion(activeQuestion.answer === false) : defendQuestion(activeQuestion.answer === false)}
                className="flex items-center gap-2 rounded-xl border-2 px-8 py-3.5 text-xl font-black sm:px-12 sm:py-4" style={{ background: "#ef444422", borderColor: "#ef4444", color: "var(--accent-bad)" }}>
                <Icon as={UI.X} size={22} /> NO
              </motion.button>
            </div>
          </div>
          <div className="flex justify-between text-base">
            <div className="tnum flex items-center gap-1.5 font-black text-accent-info" data-num>
              <Icon as={UI.Swords} size={17} /> ATK: {attackPower}
            </div>
            <div className="tnum flex items-center gap-1.5 font-black text-accent-good" data-num>
              <Icon as={UI.Shield} size={17} /> DEF: {defensePower}
            </div>
          </div>
        </motion.div>
      )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARE IMAGE GENERATOR
// ═══════════════════════════════════════════════════════════
/**
 * The session result card, drawn on a canvas.
 *
 * Canvas rather than DOM-to-image because it needs no library and cannot be affected by
 * the page's own font loading or scroll position. The QR is composited in when the deck
 * fits in a code, so the image advertises a scannable deck rather than a bare logo.
 */
async function generateShareImage(session: SessionStats, xp: number, level: number, qrDataUrl?: string | null): Promise<string> {
  const canvas = document.createElement("canvas");
  // 2× the display size, so the PNG stays sharp when a chat client scales it up.
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
  gradient.addColorStop(0, "#1e1b4b");
  gradient.addColorStop(1, "#0f172a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 800);

  // A soft accent wash, so the card is not a flat rectangle.
  const glow = ctx.createRadialGradient(200, 120, 20, 200, 120, 500);
  glow.addColorStop(0, "rgba(99,102,241,0.35)");
  glow.addColorStop(1, "rgba(99,102,241,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 800);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 46px Outfit, system-ui, sans-serif";
  ctx.fillText("Deck — Session Report", 600, 96);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "22px Outfit, system-ui, sans-serif";
  ctx.fillText(new Date().toLocaleDateString(), 600, 132);

  const accuracy = Math.round((session.correctAnswers / Math.max(1, session.cardsStudied)) * 100);
  const rows: [string, string][] = [
    ["Level", String(level)],
    ["Total XP", String(xp)],
    ["Cards studied", String(session.cardsStudied)],
    ["Accuracy", `${accuracy}%`],
    ["Best streak", String(session.maxStreak)],
  ];

  let y = 216;
  for (const [label, value] of rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(148,163,184,0.9)";
    ctx.font = "24px Outfit, system-ui, sans-serif";
    ctx.fillText(label, 120, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 30px Outfit, system-ui, sans-serif";
    ctx.fillText(value, 800, y);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(120, y + 22);
    ctx.lineTo(800, y + 22);
    ctx.stroke();
    y += 84;
  }

  if (qrDataUrl) {
    try {
      const image = new Image();
      image.src = qrDataUrl;
      await image.decode();
      // A white plate behind the code: a QR on a dark ground does not scan.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(880, 236, 260, 260);
      ctx.drawImage(image, 890, 246, 240, 240);
      ctx.textAlign = "center";
      ctx.fillStyle = "var(--content-3)";
      ctx.font = "18px Outfit, system-ui, sans-serif";
      ctx.fillText("Scan to load this deck", 1010, 540);
    } catch {
      // A failed decode must not cost the learner their summary image.
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(99,102,241,0.95)";
  ctx.font = "bold 22px Outfit, system-ui, sans-serif";
  ctx.fillText("Your own deck \u00b7 spaced repetition \u00b7 eight game modes", 600, 730);

  return canvas.toDataURL("image/png");
}

// ═══════════════════════════════════════════════════════════
// INSIGHTS — the view that makes the method visible
// ═══════════════════════════════════════════════════════════
/**
 * Three views that a learner cannot otherwise see: how consistently they have practised,
 * what the scheduler has planned for the next two weeks, and which badges they have
 * earned. The forecast strip is the important one — it is the only place the app *shows*
 * that doing today's reviews is what buys tomorrow's day off.
 */
function InsightsPanel({
  dayStreak,
  mastered,
  deckSize,
  heatmap,
  forecast,
  earned,
  totalAchievements,
  onClose,
}: {
  dayStreak: number;
  mastered: number;
  deckSize: number;
  heatmap: DailyActivity[];
  forecast: number[];
  earned: string[];
  totalAchievements: number;
  onClose: () => void;
}) {
  const trapRef = useFocusTrap<HTMLDivElement>(true, onClose);
  const busiest = Math.max(1, ...heatmap.map((day) => day.cards));
  const peakForecast = Math.max(1, ...forecast);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: "var(--scrim)" }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Progress and achievements"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line-2 bg-panel p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-fg-1">Your progress</h3>
            <p className="text-xs text-fg-3">Consistency, the fortnight ahead, and what you have earned.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close progress panel" className="rounded-lg border border-line-2 p-2 text-fg-3 transition hover:bg-inset hover:text-fg-1">
            <Icon as={UI.X} size={16} />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: "Day streak", value: dayStreak, color: "var(--grade-hard)", icon: UI.Zap },
            { label: "Mastered", value: `${mastered}/${deckSize}`, color: "var(--accent-good)", icon: UI.Trophy },
            { label: "Badges", value: `${earned.length}/${totalAchievements}`, color: "var(--accent-warn)", icon: UI.Sparkles },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-line-1 bg-inset p-3 text-center">
              <div className="mb-1 flex justify-center" style={{ color: stat.color }}><Icon as={stat.icon} size={18} /></div>
              <div className="tnum text-lg font-black" data-num style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-2xs text-fg-3">{stat.label}</div>
            </div>
          ))}
        </div>

        <section className="mb-5">
          <h4 className="mb-2 flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-fg-4">
            <Icon as={UI.Target} size={12} /> Last 13 weeks
          </h4>
          {/*
           * Grid-flow so the columns wrap into a calendar: 7 rows, so each column is one
           * week and the eye reads it as a streak rather than a scatter.
           */}
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label={`Practice history: ${heatmap.filter((d) => d.cards > 0).length} active days out of ${heatmap.length}`}>
            {heatmap.map((day) => {
              const intensity = day.cards / busiest;
              return (
                <span
                  key={day.date}
                  title={`${day.date}: ${day.cards} card${day.cards === 1 ? "" : "s"}`}
                  className="h-3 w-3 rounded-[3px]"
                  style={{ background: day.cards === 0 ? "var(--border-subtle)" : `rgba(52,211,153,${0.25 + intensity * 0.75})` }}
                />
              );
            })}
          </div>
        </section>

        <section className="mb-5">
          <h4 className="mb-2 flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-fg-4">
            <Icon as={UI.Timer} size={12} /> Due over the next 14 days
          </h4>
          <div className="flex items-end gap-1" role="img" aria-label="Forecast of cards due each day">
            {forecast.map((count, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{ height: `${Math.max(3, (count / peakForecast) * 56)}px`, background: index === 0 ? "#fbbf24" : "rgba(96,165,250,0.55)" }}
                  title={`${count} card${count === 1 ? "" : "s"}`}
                />
                {index % 2 === 0 ? <span className="tnum text-[9px] text-fg-4" data-num>{index}</span> : <span className="text-[9px] text-transparent">·</span>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-2xs text-fg-4">
            Day 0 is today. Reviews you clear now are why later days get lighter.
          </p>
        </section>

        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-fg-4">
            <Icon as={UI.Trophy} size={12} /> Achievements
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = earned.includes(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className="flex items-start gap-2 rounded-lg border p-2"
                  style={{ borderColor: unlocked ? `${achievement.color}44` : "var(--border-subtle)", background: unlocked ? `${achievement.color}12` : "var(--surface-inset)", opacity: unlocked ? 1 : 0.55 }}
                >
                  <span className="mt-0.5" style={{ color: unlocked ? achievement.color : "var(--content-4)" }}>
                    <Icon as={unlocked ? UI.Trophy : UI.Lock} size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-2xs font-black text-fg-1">{achievement.label}</p>
                    <p className="text-[10px] leading-tight text-fg-3">{achievement.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-5 flex justify-end border-t border-line-1 pt-4">
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Erase all progress, XP, mastery and your collection? This cannot be undone.")) return;
              clearProgress();
              window.location.reload();
            }}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-2xs font-bold text-red-700 transition hover:bg-red-50 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-400/10"
          >
            Reset all progress
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export function FlashcardsTool({ payload: _payload, players }: any) {
  const payload: FlashPayload = _payload || DEMO_PAYLOAD;
  /*
   * Stored progress is read once *before* the first render so the opening frame
   * already shows the learner's real level and collection. Loading it in an effect
   * would flash level 1 and an empty deck for a frame on every page load.
   */
  const saved = useMemo(() => loadProgress(), []);
  const [mode, setMode] = useState<GameMode>("classic");
  const [fcIndex, setFcIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(saved.bestStreak);
  // Typed explicitly: `players` is untyped in this tool's prop contract, and an `any`
  // state would silently widen every updater that touches XP.
  const [xp, setXp] = useState<number>(Number(saved.xp) || Number(players?.[0]?.score) || 0);
  const [level, setLevel] = useState(xpToLevel(saved.xp || 0));
  const [itemStats, setItemStats] = useState<ItemStatsMap>(saved.itemStats);
  const [daily, setDaily] = useState(saved.daily);
  const [muted, setMuted] = useState(saved.settings.muted);
  const [session, setSession] = useState<SessionStats>(createNewSession());
  const [showReview, setShowReview] = useState(false);
  const [mascotState, setMascotState] = useState<MascotState>(getRandomMascotReaction("sessionStart"));
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [gachaState, setGachaState] = useState<GachaState>(saved.gacha);
  const [toast, setToast] = useState<string | null>(null);

  /*
   * Settings, achievements and the cinematic/lifetime state.
   *
   * `lifetimeReviews` is tracked separately from the session's own counters because the
   * achievement rules are about a learner's whole history, not today's sitting.
   */
  const [autoEnrich, setAutoEnrich] = useState(saved.settings.autoEnrich);
  const [l1, setL1] = useState(saved.settings.l1);
  const [lifetimeReviews, setLifetimeReviews] = useState(saved.totalReviews);
  const [lifetimeCorrect, setLifetimeCorrect] = useState(saved.correctReviews);
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>(saved.achievements);
  const [unlocked, setUnlocked] = useState<Achievement[]>([]);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);
  const [legendaryCard, setLegendaryCard] = useState<{ word: string; rarity: "epic" | "legendary" } | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrTooLarge, setQrTooLarge] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const { message: announcement, announce } = useAnnouncer();
  // Light is the default and the first paint already uses it; this only tracks the
  // learner's own choice so the toggle can show the right action and icon.
  const { theme, toggle: toggleTheme } = useTheme();
  // The tutor's own branding, from the Adult Dashboard — see lib/tutorlyBranding.ts.
  const branding = useTutorlyBranding();

  const items = payload.items;
  const activeItem = items[fcIndex] || items[0];
  const currentStat: ItemStat = itemStats[activeItem?.id] || { rep: 0, correctCount: 0, wrongCount: 0, lastSeen: 0, mastered: false, streak: 0, loveLevel: 0 };
  // Surfaced in the header: what is due now, how much of the deck is known, and the
  // run of consecutive days. These are the three numbers that make returning matter.
  const dueNow = dueCount(items, itemStats);
  const masteredCount = items.filter((item) => itemStats[item.id]?.mastered).length;
  const dayStreak = currentDayStreak(daily);
  // The two analytics views: a year of activity, and where the workload lands next.
  const heatmap = useMemo(() => activityHeatmap(daily), [daily]);
  const forecast = useMemo(() => dueForecastForStats(items, itemStats), [items, itemStats]);

  useEffect(() => { sfx.setMuted(muted); voice.setEnabled(!muted); }, [muted]);

  /*
   * The single writer for the save.
   *
   * Every persisted field is listed explicitly, so adding a new one is a visible
   * decision here rather than something that silently never gets written.
   */
  useEffect(() => {
    saveProgress({
      version: 2,
      xp,
      streak,
      bestStreak,
      itemStats,
      gacha: gachaState,
      settings: { muted, l1, autoEnrich },
      daily,
      achievements: earnedAchievements,
      totalReviews: lifetimeReviews,
      correctReviews: lifetimeCorrect,
      savedAt: Date.now(),
    });
  }, [xp, streak, bestStreak, itemStats, gachaState, muted, l1, autoEnrich, daily, earnedAchievements, lifetimeReviews, lifetimeCorrect]);

  /*
   * Levelling up now runs a cinematic instead of only a confetti burst.
   *
   * The state is a *destination* level rather than a boolean, so the overlay renders the
   * right badge and title even if two levels land in quick succession.
   */
  useEffect(() => {
    const newLevel = xpToLevel(xp);
    if (newLevel <= level) return;
    setLevel(newLevel);
    sfx.play("levelup");
    launchConfetti("levelup");
    setLevelUpTo(newLevel);
    announce(`Level up. You reached level ${newLevel}.`);
    setMascotState(getRandomMascotReaction("levelUp"));
    voice.speak(`Level up! Level ${newLevel}!`, "happy");
  }, [xp, level]);

  /*
   * Achievement checking.
   *
   * Rules are predicates over a snapshot (see `lib/progress.ts`), so they are evaluated
   * after any change rather than hooked to specific events. That means an achievement
   * cannot be missed because a session ended mid-flow, and the XP award is a single
   * write.
   */
  useEffect(() => {
    const { newlyEarned, earned } = evaluateAchievements(
      {
        xp,
        bestStreak,
        itemStats,
        daily,
        gacha: gachaState,
        achievements: earnedAchievements,
        totalReviews: lifetimeReviews,
        correctReviews: lifetimeCorrect,
      },
      level
    );
    if (!newlyEarned.length) return;
    setEarnedAchievements(earned);
    setUnlocked((previous) => [...previous, ...newlyEarned]);
    const bonus = newlyEarned.reduce((sum, achievement) => sum + achievement.xp, 0);
    setXp((previous) => previous + bonus);
    announce(`Achievement unlocked: ${newlyEarned.map((achievement) => achievement.label).join(", ")}`);
    const timer = setTimeout(
      () => setUnlocked((previous) => previous.filter((item) => !newlyEarned.some((fresh) => fresh.id === item.id))),
      4200
    );
    return () => clearTimeout(timer);
  }, [xp, level, bestStreak, itemStats, daily, gachaState, lifetimeReviews, lifetimeCorrect, earnedAchievements]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const speakMascot = () => { voice.speak(mascotState.message, mascotState.mood === "love" ? "love" : mascotState.mood === "sad" ? "angry" : "happy"); };

  /**
   * Records one review.
   *
   * FSRS (via `lib/progress.ts`) owns the counters, so accuracy, mastery and the next
   * due date all derive from one place instead of three ad-hoc conditions that could
   * disagree with each other.
   */
  const updateItemStat = (id: string, isCorrect: boolean, loveDelta = 0, grade?: Grade) => {
    setItemStats((prev: ItemStatsMap) => {
      const existing = prev[id] || { rep: 0, correctCount: 0, wrongCount: 0, lastSeen: 0, mastered: false, streak: 0, loveLevel: 0 };
      // Grade 1 is FSRS's "again" — a miss, not an absence of a grade.
      const scheduled = scheduleNext(existing, grade ?? (isCorrect ? 3 : 1));
      return {
        ...prev,
        [id]: {
          ...scheduled,
          streak: isCorrect ? existing.streak + 1 : 0,
          loveLevel: Math.max(-5, Math.min(5, existing.loveLevel + loveDelta)),
        },
      };
    });
  };

  const handleCorrect = useCallback((difficulty: Difficulty = "good", bonus = 0) => {
    const points = DIFFICULTY_CONFIG[difficulty].points + (streak >= 5 ? Math.floor(streak / 5) * 2 : 0) + bonus;
    setXp((prev: number) => prev + points); setStreak((s) => s + 1);
    setLifetimeReviews((n) => n + 1); setLifetimeCorrect((n) => n + 1);
    sfx.play("coin"); launchConfetti("correct"); updateItemStat(activeItem.id, true, 0, gradeFromDifficulty(difficulty));
    setSession((s) => ({ ...s, cardsStudied: s.cardsStudied + 1, correctAnswers: s.correctAnswers + 1, xpEarned: s.xpEarned + points, streak: streak + 1, maxStreak: Math.max(s.maxStreak, streak + 1) }));
    setBestStreak((best) => Math.max(best, streak + 1));
    setDaily((log) => recordActivity(log, 1, points));
    announce(`${activeItem.front}: correct. Plus ${points} XP.`);
    if (streak + 1 >= 10) setMascotState(getRandomMascotReaction("streak10"));
    else if (streak + 1 >= 5) setMascotState(getRandomMascotReaction("streak5"));
    else if (streak + 1 >= 3) setMascotState(getRandomMascotReaction("streak3"));
    else setMascotState(getRandomMascotReaction("correct"));
    if (Math.random() < 0.15) { const quote = getRandomQuote(); showToast(`“${quote.quote}” — ${quote.author}`); }
    setFcIndex(getNextCardIndex(items, itemStats, fcIndex));
  }, [streak, activeItem, fcIndex, items, itemStats]);

  const handleWrong = useCallback(() => {
    setStreak(0); sfx.play("buzz"); updateItemStat(activeItem.id, false, 0, 1);
    setLifetimeReviews((n) => n + 1);
    setDaily((log) => recordActivity(log, 1, 0));
    announce(`${activeItem.front}: not this time. It will come back around shortly.`);
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
    setGachaState(newState);
    /*
     * The reveal cinematic fires from here rather than inside `GachaMode`, because this
     * is where the real rarity is decided. Taking the best pull in the batch means a
     * ×10 pull shows one celebration, not ten interruptions.
     */
    const best = pulled.reduce<null | "epic" | "legendary">((current, card) => {
      if (card.rarity === "legendary") return "legendary";
      if (card.rarity === "epic" && current !== "legendary") return "epic";
      return current;
    }, null);
    if (best) setLegendaryCard({ word: pulled.find((card) => card.rarity === best)?.front || "", rarity: best });
    return pulled;
  };

  const handleSelectTrack = (id: string) => { setCurrentTrack(id); music.play(id); setMusicPlaying(true); };

  /**
   * Opens the share sheet.
   *
   * The QR is generated before the sheet opens so there is no pop-in, and the deck is
   * compressed into the URL itself — there is no server to store a shared deck on.
   */
  const openShare = async () => {
    // Full fidelity for the link, then the compact form as a QR fallback — a full deck
    // is four times larger than the biggest QR code can hold.
    const full = buildShareUrl(payload);
    let qr = await renderQrCode(full);
    let url = full;
    if (qr.tooLarge) {
      url = buildShareUrl(payload, { compact: true });
      qr = await renderQrCode(url);
    }
    setShareUrl(full);
    setQrDataUrl(qr.dataUrl);
    setQrTooLarge(qr.tooLarge);
    try {
      setShareImage(await generateShareImage(session, xp, level, qr.dataUrl));
    } catch {
      setShareImage(null);
    }
    setShowShare(true);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      announce("Share link copied to the clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access is denied in some contexts; the link is on screen to select.
      showToast("Could not copy automatically — select the link text below");
    }
  };

  const endSession = () => { if (session.cardsStudied > 0) setShowReview(true); };

  /*
   * Space flips the card and 1–3 grade it, so a full review needs no pointer at all.
   * These are disabled while an overlay is up, which is the difference between a
   * shortcut and a way to accidentally answer a card you cannot see.
   */
  useKeyboardShortcuts(
    {
      m: () => setMuted((value) => !value),
      i: () => setShowInsights((value) => !value),
    },
    !showReview && !showShare && !showInsights && levelUpTo === null
  );

  if (!items?.length) return <div className="text-center text-fg-3 p-8">No flashcard items found.</div>;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <NebulaBackground />
      <LiveRegion message={announcement} />
      <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed left-1/2 top-4 z-50 max-w-sm -translate-x-1/2 rounded-xl px-4 py-2 text-center text-sm font-bold text-fg-1" style={{ background: "var(--surface-overlay)", border: "1px solid var(--border-control)", boxShadow: "var(--panel-shadow)" }}>{toast}</motion.div>}</AnimatePresence>
      <AnimatePresence>{showReview && <SessionReview session={session} onClose={() => { setShowReview(false); setSession(createNewSession()); }} onShare={() => { setShowReview(false); void openShare(); }} />}</AnimatePresence>

      {/* The reward cinematics. Each dismisses itself as well as on click or Escape. */}
      <AnimatePresence>
        {levelUpTo !== null && (
          <LevelUpCinematic
            level={levelUpTo}
            stage={getEvolutionStage(levelUpTo).stage}
            title={getEvolutionStage(levelUpTo).title}
            onDone={() => setLevelUpTo(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {legendaryCard && (
          <LegendaryReveal word={legendaryCard.word} rarity={legendaryCard.rarity} onDone={() => setLegendaryCard(null)} />
        )}
      </AnimatePresence>
      <AchievementToasts achievements={unlocked} />
      <AnimatePresence>
        {showShare && (
          <ShareSheet
            imageUrl={shareImage}
            qrDataUrl={qrDataUrl}
            qrTooLarge={qrTooLarge}
            shareUrl={shareUrl}
            copied={copied}
            onClose={() => setShowShare(false)}
            onCopy={copyShareLink}
            onExportFile={() => { exportDeckFile(payload); showToast("Deck JSON downloaded"); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInsights && (
          <InsightsPanel
            dayStreak={dayStreak}
            mastered={masteredCount}
            deckSize={items.length}
            heatmap={heatmap}
            forecast={forecast}
            earned={earnedAchievements}
            totalAchievements={ACHIEVEMENTS.length}
            onClose={() => setShowInsights(false)}
          />
        )}
      </AnimatePresence>
      {/* Full-bleed: the card is the lesson, so it takes the room a projector gives it
          and only the chrome stays inside a readable measure. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1680px] flex-col gap-4 p-4 sm:p-6 lg:px-10">
        <div className="rounded-2xl border p-4 sm:p-5" style={{ background: "var(--surface-panel)", borderColor: "var(--border-subtle)", boxShadow: "var(--panel-shadow)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/*
                * The tutor's logo, from the Adult Dashboard.
                *
                * It replaces the game's own mark when one is uploaded, which is the rule
                * every Tutorly game follows — so the deck a tutor projects carries their
                * branding, not ours. Nothing renders when no logo is set, rather than a
                * placeholder that would leave a hole in the header.
                */}
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-xl object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <div>
                <h1 className="word-display text-xl font-semibold text-fg-1 sm:text-2xl">{payload.title || "Flashcard Quest"}</h1>
                {payload.description && <p className="text-xs text-fg-4">{payload.description}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div
                className="hidden items-center gap-2 rounded-xl border border-line-2 bg-inset px-3 py-1.5 text-xs font-bold text-fg-3 sm:flex"
                title="Cards due for review · cards you have mastered · consecutive days practised"
              >
                <Layers className="h-3.5 w-3.5 text-accent-warn" aria-hidden="true" />
                <span className="tnum text-amber-700 dark:text-amber-200">{dueNow}</span> due
                <span className="text-fg-4">·</span>
                <span className="tnum text-emerald-700 dark:text-emerald-300">{masteredCount}</span>
                <span className="text-fg-4">/{items.length}</span>
                {dayStreak > 0 && (
                  <>
                    <span className="text-fg-4">·</span>
                    <span className="tnum text-orange-700 dark:text-orange-300">{dayStreak}d</span>
                  </>
                )}
              </div>
              <SessionTimer session={session} />
              <MusicPlayer isPlaying={musicPlaying} currentTrack={currentTrack} onSelectTrack={handleSelectTrack} />
              {/*
                Icon-only controls carry an aria-label as well as a title: `title` is a
                tooltip for a mouse, and says nothing to a screen reader.
              */}
              {/*
                * The theme switch.
                *
                * It sits next to mute rather than in a settings sheet because it is the
                * one control a tutor reaches for *during* a lesson — a projector washes
                * out the light stage in a dark room and vice versa, and hunting for it in
                * a menu mid-card is the wrong time to make someone think.
                */}
              <button
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme"}
                title={theme === "dark" ? "Light theme" : "Dark theme"}
                className="flex h-9 w-9 items-center justify-center rounded-xl border"
                style={{ background: "var(--surface-control)", borderColor: "var(--border-control)", color: "var(--content-3)" }}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute sound" : "Mute sound"} title={muted ? "Unmute sound" : "Mute sound"} className="flex h-9 w-9 items-center justify-center rounded-xl border" style={{ background: muted ? "var(--surface-control)" : "rgba(16,185,129,0.12)", borderColor: muted ? "var(--border-control)" : "rgba(16,185,129,0.4)", color: muted ? "var(--content-4)" : "var(--grade-good)" }}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
              <button onClick={() => setShowInsights(true)} aria-label="Progress and achievements" title="Progress and achievements (i)" className="flex h-9 w-9 items-center justify-center rounded-xl border" style={{ background: "var(--surface-control)", borderColor: "var(--border-control)", color: "var(--content-3)" }}><Icon as={UI.Target} size={16} /></button>
              <button onClick={() => void openShare()} aria-label="Share this deck as a QR code or link" title="Share deck" className="flex h-9 w-9 items-center justify-center rounded-xl border" style={{ background: "var(--surface-control)", borderColor: "var(--border-control)", color: "var(--content-3)" }}><Icon as={UI.Share2} size={16} /></button>
              <button onClick={() => { generateFlashcardsPDF(payload); showToast("Deck opened in a new tab — use Print / Save as PDF."); }} aria-label="Export deck as PDF" title="Export deck as PDF" className="flex h-9 w-9 items-center justify-center rounded-xl border" style={{ background: "var(--surface-control)", borderColor: "var(--border-control)", color: "var(--content-3)" }}><FileText className="h-4 w-4" /></button>
              <button onClick={endSession} aria-label="End session and see the summary" title="End session" className="flex h-9 w-9 items-center justify-center rounded-xl border" style={{ background: "var(--surface-control)", borderColor: "var(--border-control)", color: "var(--content-3)" }}><Flag className="h-4 w-4" /></button>
            </div>
          </div>
          <XPBar xp={xp} streak={streak} />
          {/*
            * The settings row. Two switches, both of which change what the card shows:
            * auto-enrich decides whether live lookups happen at all, and the L1 picker
            * decides which language the translation line is fetched for.
            */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-1 pt-3 text-2xs text-fg-3">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={autoEnrich} onChange={(event) => setAutoEnrich(event.target.checked)} className="h-3.5 w-3.5 accent-sky-400" />
              <span className="flex items-center gap-1"><Icon as={UI.Globe} size={11} /> Live word lookups</span>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="flex items-center gap-1"><Icon as={UI.Type} size={11} /> Translation</span>
              <select
                value={l1}
                onChange={(event) => setL1(event.target.value)}
                aria-label="Language for the translation line"
                className="rounded-md border border-line-2 bg-inset px-1.5 py-0.5 font-bold text-fg-2 outline-none"
              >
                {L1_LANGUAGES.map((code) => <option key={code} value={code} className="text-fg-1">{code.toUpperCase()}</option>)}
              </select>
            </label>
            <span className="ml-auto hidden items-center gap-1 sm:flex">
              <Icon as={UI.Check} size={11} /> <span className="tnum" data-num>{lifetimeCorrect}/{lifetimeReviews}</span> lifetime correct
            </span>
          </div>
        </div>
        {/*
         * The mascot stands down in Swipe mode.
         *
         * This is not decoration loss for its own sake: the deck is the one screen in the app
         * that is meant to read as a *photograph with a caption*, and the mascot was taking
         * about 120px of height above it that the picture needed more. Every other mode keeps
         * the companion.
         */}
        {mode !== "swipe" && <MascotBubble state={mascotState} onSpeak={speakMascot} />}
        <ModeTabBar mode={mode} setMode={setMode} />
        {/*
          * Deliberately *not* `mode="wait"`.
          *
          * "wait" holds the incoming mode back until the outgoing one has finished its
          * exit animation, which makes the tabs feel unresponsive — and if the exit
          * animation is ever starved (a throttled tab, a background window, or a device
          * under load) the new mode simply never mounts and the tab looks broken. Letting
          * them overlap costs one cross-fade and removes the failure mode entirely.
          */}
        <AnimatePresence initial={false}>
          <motion.div key={mode} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {mode === "classic" && (
              <ClassicMode
                item={activeItem}
                stat={itemStats[activeItem.id]}
                l1={l1}
                autoEnrich={autoEnrich}
                onCorrect={handleCorrect}
                onWrong={handleWrong}
              />
            )}
            {mode === "xpQuest" && <XPQuestMode item={activeItem} xp={xp} level={level} onCorrect={handleCorrect} onWrong={handleWrong} />}
            {mode === "race" && <RaceMode items={items} currentIndex={fcIndex} onCorrect={handleCorrect} onWrong={handleWrong} onUpdateIndex={setFcIndex} />}
            {mode === "type" && <TypeMode key={activeItem.id} item={activeItem} onCorrect={handleCorrect} onWrong={handleWrong} />}
            {mode === "speak" && <SpeakMode item={activeItem} onCorrect={handleCorrect} onWrong={handleWrong} />}
            {mode === "cardBattle" && <CardBattleMode items={items} onCorrect={handleCorrect} />}
            {mode === "swipe" && (
              <SwipeMode
                item={activeItem}
                items={items}
                index={fcIndex}
                stat={currentStat}
                autoImage={autoEnrich}
                onCorrect={handleCorrect}
                onWrong={handleWrong}
                onUpdateLove={handleUpdateLove}
              />
            )}
            {mode === "gacha" && (
              <GachaMode
                gachaState={gachaState}
                deckSize={items.length}
                onPull={handleGachaPull}
                onCollect={(cards) => {
                  // The collection used to be dropped on the floor: this callback was
                  // an empty function, so `gachaState.collection` could never grow.
                  setGachaState((prev) => {
                    const owned = new Set(prev.collection.map((card) => card.id));
                    const fresh = cards.filter((card) => !owned.has(card.id));
                    if (fresh.length) {
                      showToast(`${fresh.length} new card${fresh.length === 1 ? "" : "s"} added to your collection`);
                    }
                    return { ...prev, collection: [...prev.collection, ...fresh] };
                  });
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
        {!["gacha", "cardBattle", "race", "type"].includes(mode) && (
          <div className="flex justify-center gap-3 mt-2">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { sfx.play("whoosh"); setFcIndex((i) => (i - 1 + items.length) % items.length); }}
              aria-label="Previous card"
              className="flex items-center gap-1.5 rounded-xl border px-5 py-2 text-sm font-black" style={{ background: "var(--surface-control)", borderColor: "var(--border-control)", color: "var(--content-3)" }}>
              <Icon as={UI.ArrowLeft} size={14} /> Prev
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { sfx.play("whoosh"); setFcIndex(getNextCardIndex(items, itemStats, fcIndex)); }}
              aria-label="Next card"
              className="flex items-center gap-1.5 rounded-xl border px-5 py-2 text-sm font-black" style={{ background: "var(--surface-control)", borderColor: "var(--border-control)", color: "var(--content-3)" }}>
              Skip <Icon as={UI.ArrowRight} size={14} />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
