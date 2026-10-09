/* ════════════════════════════════════════════════════════════════════════════
   👑 KIDS LEARNING KINGDOM — Full Learner Profile
   All features: Session Logging, Pet HW XP, Talking Mood, Editable Skills,
   Enhanced HW Board, 3D Land Builder, Magic Scroll, Feedback, Admin Panel
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Activity, ChevronDown,
  Shield, BookOpen, Plus,
  Trash2, Check, AlertTriangle, Edit2, Save, X,
  Copy, Volume2, ChevronLeft,
  TrendingUp, BarChart2, Sparkles,
} from 'lucide-react';
import {
  Learner, StoreItem, TeacherProfile,
  getAvatarEvolution, getPetEvolution,
  getAvatarEvolutionTable, getPetEvolutionTable, getNextRankProgress,
  getRarityTier, EVOLUTION_RARITY_TIERS,
  Homework, SessionLog, Weakness,
} from './types';
import { RewardShop } from './RewardShop';
import { HtmlGenerator } from './HtmlGenerator';
import { KidsLessonCreator } from './components/KidsLessonCreator';
import { Calendar } from './Calendar';
import { EnhancedQuestsTab } from './components/EnhancedQuestsTab';
import { EnhancedSkillsTab } from './components/EnhancedSkillsTab';
import { EnhancedKingdomCanvasTab } from './components/EnhancedKingdomCanvasTab';
import { EnhancedFeedbackTab } from './components/EnhancedFeedbackTab';
import { playStarShower, playQuestDing } from './utils/kidsAudio';
import { getStoredDirectoryHandle, writeBase64ImageToDisk, triggerAutoSyncImmediate } from '../../utils/diskStorage';
import { openLessonInsight, buildFactsFallback } from '../../utils/lessonInsightHandoff';
import GroupedVoiceOptions from '../../components/ui/GroupedVoiceOptions';
import TierGatedOverlay from '../../components/ui/TierGatedOverlay';
import { useAuthStore } from '../../store/useAuthStore';

/* ── Props ── */
interface KidsprofileProps {
  learner: Learner;
  onBack: () => void;
  onUpdate: (updated: Partial<Learner>) => void;
  storeItems: StoreItem[];
  setStoreItems: React.Dispatch<React.SetStateAction<StoreItem[]>>;
  teacher: TeacherProfile;
  onBuyItem: (item: StoreItem) => void;
}

/* ── Tab definitions ── */
type TabId = 'hero' | 'roadmap' | 'lessons' | 'sessions' | 'insight' | 'quests' | 'skills' | 'land' | 'store' | 'feedback' | 'voice' | 'calendar' | 'admin' | 'scroll';

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'hero',     label: 'Hero Card',      emoji: '🦸' },
  { id: 'lessons',  label: 'Lesson Creator', emoji: '🧩' },
  { id: 'roadmap',  label: 'Evolution Map',  emoji: '🗺️' },
  { id: 'sessions', label: 'Log Session',    emoji: '📋' },
  { id: 'insight',  label: 'Lesson Insight', emoji: '🔎' },
  { id: 'quests',   label: 'Quests & HW',    emoji: '📜' },
  { id: 'skills',   label: 'Skills',         emoji: '📈' },
  { id: 'land',     label: "Kingdom",        emoji: '🌲' },
  { id: 'store',    label: 'Shop',           emoji: '🏪' },
  { id: 'feedback', label: 'Feedback',       emoji: '💬' },
  { id: 'voice',    label: 'Voices',         emoji: '🔊' },
  { id: 'calendar', label: 'Calendar',       emoji: '📅' },
  { id: 'admin',    label: 'Admin',          emoji: '🛡️' },
  { id: 'scroll',   label: 'Flipbook',     emoji: '📖✨' },
];

/* ── Theme styles ── */
const THEME_STYLES: Record<string, { bg: string; text: string; btn: string; border: string; card: string }> = {
  fairy:  { bg: 'from-pink-100 via-purple-50 to-indigo-100',  text: 'text-purple-950',  btn: 'from-pink-500 to-purple-600',   border: 'border-pink-300',   card: 'bg-white/70' },
  space:  { bg: 'from-slate-900 via-indigo-950 to-slate-900', text: 'text-indigo-100',  btn: 'from-cyan-500 to-blue-600',     border: 'border-indigo-500/40', card: 'bg-slate-800/80' },
  ocean:  { bg: 'from-cyan-100 via-blue-50 to-teal-100',      text: 'text-blue-950',    btn: 'from-cyan-500 to-teal-500',     border: 'border-cyan-300',   card: 'bg-white/70' },
  jungle: { bg: 'from-green-100 via-emerald-50 to-lime-100',  text: 'text-emerald-950', btn: 'from-green-500 to-emerald-600', border: 'border-emerald-300', card: 'bg-white/70' },
};

const getLevel = (xp: number) => Math.max(1, Math.floor(xp / 100) + 1);

/* ── TTS helper ── */
const speak = (text: string, voiceName?: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  if (voiceName) {
    const voice = window.speechSynthesis.getVoices().find(v => v.name === voiceName);
    if (voice) utt.voice = voice;
  }
  window.speechSynthesis.speak(utt);
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
export const Kidsprofile: React.FC<KidsprofileProps> = ({
  learner, onBack, onUpdate, storeItems, setStoreItems, teacher, onBuyItem,
}) => {
  const [tab, setTab] = useState<TabId>('hero');
  const [tabMenuOpen, setTabMenuOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  /* The Lesson Creator locks its higher-tier kinds by name, the same way the rest of the
     app does, so the tier has to be live rather than read once at mount. */
  const authTier = useAuthStore((s) => s.tier);

  const ts = THEME_STYLES[learner.theme] || THEME_STYLES.fairy;
  const avatarTable = useMemo(() => getAvatarEvolutionTable(learner.gender, learner.avatarArchetype), [learner.gender, learner.avatarArchetype]);
  const petTable    = useMemo(() => getPetEvolutionTable(learner.petType), [learner.petType]);
  const avatarRank  = useMemo(() => getAvatarEvolution(learner.gender, learner.avatarArchetype, learner.xp), [learner.gender, learner.avatarArchetype, learner.xp]);
  const petRank     = useMemo(() => getPetEvolution(learner.petType, learner.petXp ?? 0), [learner.petType, learner.petXp]);
  const avatarProg  = useMemo(() => getNextRankProgress(avatarTable, learner.xp), [avatarTable, learner.xp]);
  const petProg     = useMemo(() => getNextRankProgress(petTable, learner.petXp ?? 0), [petTable, learner.petXp]);

  const moodEmoji = learner.mood === 'sick' ? '🤢' : learner.mood === 'tired' ? '😴' : learner.mood === 'focused' ? '🤓' : learner.mood === 'excited' ? '🤩' : '😊';

  /* Load TTS voices */
  useEffect(() => {
    const load = () => { const v = window.speechSynthesis?.getVoices() || []; setVoices(v); };
    load();
    if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = load;
  }, []);

  /* Tab click handler (closes dropdown on mobile) */
  const selectTab = (id: TabId) => { setTab(id); setTabMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  /* ── Talking mood click/hover ── */
  const handleMoodClick = () => {
    const mood = learner.talkingMood;
    if (!mood) return;
    const dialogue = mood.dialogues?.length
      ? mood.dialogues[Math.floor(Math.random() * mood.dialogues.length)]
      : mood.text;
    speak(dialogue, mood.voiceName || learner.avatarVoice);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${ts.bg} ${ts.text} font-kids relative theme-space-overrides`}>
      {learner.theme === 'space' && (
        <style>{`
          /* Space Theme Contrast & Readability Overrides */
          .theme-space-overrides h1,
          .theme-space-overrides h2,
          .theme-space-overrides h3,
          .theme-space-overrides h4,
          .theme-space-overrides h5,
          .theme-space-overrides h6 {
            color: #f8fafc !important; /* slate-50 */
          }
          .theme-space-overrides .text-indigo-950, 
          .theme-space-overrides .text-indigo-900,
          .theme-space-overrides .text-indigo-800,
          .theme-space-overrides .text-indigo-700,
          .theme-space-overrides .text-indigo-600,
          .theme-space-overrides .text-slate-950,
          .theme-space-overrides .text-slate-900,
          .theme-space-overrides .text-slate-800,
          .theme-space-overrides .text-slate-700,
          .theme-space-overrides .text-slate-600,
          .theme-space-overrides .text-gray-900,
          .theme-space-overrides .text-gray-800,
          .theme-space-overrides .text-gray-700,
          .theme-space-overrides .text-gray-600,
          .theme-space-overrides .text-black {
            color: #cbd5e1 !important; /* text-slate-300 */
          }
          .theme-space-overrides .text-gray-500,
          .theme-space-overrides .text-slate-500,
          .theme-space-overrides .text-indigo-500 {
            color: #94a3b8 !important; /* text-slate-400 */
          }
          /* High visibility accents for badges or metrics */
          .theme-space-overrides .text-emerald-700,
          .theme-space-overrides .text-emerald-600,
          .theme-space-overrides .text-emerald-800 {
            color: #34d399 !important; /* emerald-400 */
          }
          .theme-space-overrides .text-pink-700,
          .theme-space-overrides .text-pink-600,
          .theme-space-overrides .text-pink-800 {
            color: #f472b6 !important; /* pink-400 */
          }
          .theme-space-overrides .text-amber-700,
          .theme-space-overrides .text-amber-600,
          .theme-space-overrides .text-amber-800 {
            color: #fbbf24 !important; /* amber-400 */
          }
          .theme-space-overrides .text-red-700,
          .theme-space-overrides .text-red-600,
          .theme-space-overrides .text-red-800 {
            color: #f87171 !important; /* red-400 */
          }
          .theme-space-overrides .text-purple-700,
          .theme-space-overrides .text-purple-600,
          .theme-space-overrides .text-purple-800 {
            color: #c084fc !important; /* purple-400 */
          }

          /* Container Backgrounds */
          .theme-space-overrides .bg-white\\/70, 
          .theme-space-overrides .bg-white\\/80, 
          .theme-space-overrides .bg-white\\/60,
          .theme-space-overrides .bg-white\\/40,
          .theme-space-overrides .bg-white\\/30 {
            background-color: rgba(15, 23, 42, 0.85) !important; /* slate-900/85 */
            color: #e2e8f0 !important;
          }
          .theme-space-overrides .border-white\\/80,
          .theme-space-overrides .border-white\\/60,
          .theme-space-overrides .border-indigo-100,
          .theme-space-overrides .border-indigo-200,
          .theme-space-overrides .border-gray-200,
          .theme-space-overrides .border-gray-300 {
            border-color: rgba(99, 102, 241, 0.3) !important; /* indigo-500/30 */
          }

          /* Light Inner Cards & Boxes to Dark variants */
          .theme-space-overrides .bg-indigo-50,
          .theme-space-overrides .bg-indigo-100,
          .theme-space-overrides .bg-indigo-50\\/50,
          .theme-space-overrides .bg-indigo-50\\/80 {
            background-color: rgba(99, 102, 241, 0.15) !important;
            color: #e0e7ff !important;
            border-color: rgba(99, 102, 241, 0.35) !important;
          }
          .theme-space-overrides .bg-purple-50,
          .theme-space-overrides .bg-purple-100,
          .theme-space-overrides .bg-purple-50\\/50,
          .theme-space-overrides .bg-purple-100\\/50 {
            background-color: rgba(168, 85, 247, 0.15) !important;
            color: #faf5ff !important;
            border-color: rgba(168, 85, 247, 0.3) !important;
          }
          .theme-space-overrides .bg-pink-50,
          .theme-space-overrides .bg-pink-100,
          .theme-space-overrides .bg-pink-50\\/50 {
            background-color: rgba(236, 72, 153, 0.12) !important;
            color: #fdf2f8 !important;
            border-color: rgba(236, 72, 153, 0.25) !important;
          }
          .theme-space-overrides .bg-amber-50,
          .theme-space-overrides .bg-amber-100,
          .theme-space-overrides .bg-amber-50\\/50 {
            background-color: rgba(245, 158, 11, 0.12) !important;
            color: #fffbeb !important;
            border-color: rgba(245, 158, 11, 0.25) !important;
          }
          .theme-space-overrides .bg-red-50,
          .theme-space-overrides .bg-red-100,
          .theme-space-overrides .bg-red-50\\/50 {
            background-color: rgba(239, 68, 68, 0.12) !important;
            color: #fef2f2 !important;
            border-color: rgba(239, 68, 68, 0.25) !important;
          }
          .theme-space-overrides .bg-gray-100,
          .theme-space-overrides .bg-gray-50,
          .theme-space-overrides .bg-gray-200 {
            background-color: rgba(255, 255, 255, 0.08) !important;
            color: #f1f5f9 !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
          }

          /* Gradient overrides */
          .theme-space-overrides .from-indigo-50,
          .theme-space-overrides .from-purple-50,
          .theme-space-overrides .from-pink-50,
          .theme-space-overrides .from-amber-50,
          .theme-space-overrides .from-red-50,
          .theme-space-overrides .from-gray-100 {
            background-image: none !important;
            background-color: rgba(15, 23, 42, 0.6) !important;
          }

          /* Inputs & Forms */
          .theme-space-overrides select, 
          .theme-space-overrides input,
          .theme-space-overrides textarea {
            background-color: #0f172a !important; /* bg-slate-900 */
            color: #f1f5f9 !important;
            border-color: rgba(99, 102, 241, 0.4) !important;
          }
          .theme-space-overrides option {
            background-color: #0f172a !important;
            color: #cbd5e1 !important;
          }
        `}</style>
      )}
      {/* Giant background emojis */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0">
        <div className="absolute top-10 left-6 text-8xl opacity-10 animate-bounce-gentle">{avatarRank.emoji}</div>
        <div className="absolute bottom-20 right-6 text-8xl opacity-10 animate-float">{petRank.emoji}</div>
        <div className="absolute top-1/3 right-1/4 text-7xl opacity-5">🏰</div>
      </div>

      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 max-w-6xl pb-24">

        {/* ── HEADER ── */}
        <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className={`${ts.card} backdrop-blur-xl border-4 ${ts.border} rounded-3xl p-4 mb-4 shadow-2xl`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={onBack}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-2xl text-xs sm:text-sm shadow cursor-pointer flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <div>
                <h1 className="text-xl sm:text-3xl font-black flex items-center gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl">{avatarRank.emoji}</span>
                  <span>{learner.name}</span>
                  {/* Talking mood badge */}
                  {learner.talkingMood && (
                    <motion.button
                      whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                      onClick={handleMoodClick}
                      title="Click to hear mood voice!"
                      className="text-3xl cursor-pointer relative group">
                      {learner.talkingMood.emoji}
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        🔊 Click to hear
                      </span>
                    </motion.button>
                  )}
                </h1>
                <p className="text-[10px] sm:text-xs font-bold text-gray-500 mt-0.5 uppercase tracking-wider">
                  Level {getLevel(learner.xp)} • {avatarRank.form} • {learner.country}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Streak', val: `🔥 ${learner.streak}d` },
                { label: 'Coins',  val: `🪙 ${learner.coins}` },
                { label: 'XP',     val: `⚡ ${learner.xp}` },
                { label: 'Pet XP', val: `🐾 ${learner.petXp ?? 0}` },
              ].map(s => (
                <div key={s.label} className="bg-white/80 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-indigo-200 text-center">
                  <p className="text-[9px] font-black uppercase text-gray-400">{s.label}</p>
                  <p className="text-sm font-black text-indigo-700">{s.val}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.header>

        {/* ── TABS: horizontal scroll on md+, dropdown on mobile ── */}
        <div className="mb-4">
          {/* Mobile dropdown */}
          <div className="md:hidden relative">
            <button onClick={() => setTabMenuOpen(o => !o)}
              className={`w-full px-4 py-3 rounded-2xl font-black text-sm flex items-center justify-between bg-gradient-to-r ${ts.btn} text-white shadow-xl cursor-pointer`}>
              <span>{TABS.find(t => t.id === tab)?.emoji} {TABS.find(t => t.id === tab)?.label}</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${tabMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {tabMenuOpen && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute z-50 mt-1 w-full bg-white rounded-2xl border-4 border-indigo-200 shadow-2xl grid grid-cols-3 gap-1 p-2">
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => selectTab(t.id)}
                      className={`px-2 py-2 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 cursor-pointer ${tab === t.id ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-50 text-indigo-950'}`}>
                      <span className="text-xl">{t.emoji}</span>
                      <span className="leading-tight text-center">{t.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Desktop tabs */}
          <div className="hidden md:flex gap-1.5 overflow-x-auto pb-2 no-scrollbar flex-wrap">
            {TABS.map(t => (
              <button key={t.id} onClick={() => selectTab(t.id)}
                className={`px-3 py-2 rounded-2xl font-black text-xs whitespace-nowrap flex items-center gap-1 border-2 cursor-pointer transition-all ${
                  tab === t.id
                    ? `bg-gradient-to-r ${ts.btn} text-white shadow-xl border-transparent scale-105`
                    : `${ts.card} border-white/60 hover:border-indigo-300 ${ts.text}`
                }`}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB CONTENT ──
            No `mode="wait"`: that mode holds the new tab back until the old one has finished
            its exit, and a heavy tab (the Lesson Creator loads the whole activity engine)
            leaves the switcher waiting on an exit that never lands — the button highlights
            and the panel below never changes. Mounting the new tab straight away is worth
            the brief overlap of the two cross-fades. */}
        <AnimatePresence>
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>

            {/* ════ TAB: HERO CARD ════ */}
            {tab === 'hero' && (
              <HeroTab learner={learner} avatarRank={avatarRank} petRank={petRank} avatarProg={avatarProg} petProg={petProg} moodEmoji={moodEmoji} ts={ts} onUpdate={onUpdate} handleMoodClick={handleMoodClick} />
            )}

            {/* ════ TAB: EVOLUTION ROADMAP ════ */}
            {/* ════ TAB: LESSON CREATOR ════ */}
            {tab === 'lessons' && (
              <KidsLessonCreator
                learner={learner}
                teacher={teacher}
                tier={authTier}
                onUpdate={onUpdate}
                onUpgrade={(message) => useAuthStore.getState().openUpgradeModal(message)}
              />
            )}

            {tab === 'roadmap' && (
              <RoadmapTab avatarTable={avatarTable} petTable={petTable} avatarRank={avatarRank} petRank={petRank} learner={learner} ts={ts} onUpdate={onUpdate} />
            )}

            {/* ════ TAB: LOG SESSION ════ */}
            {tab === 'sessions' && (
              <SessionTab learner={learner} onUpdate={onUpdate} ts={ts} />
            )}

            {/* ════ TAB: LESSON INSIGHT ════ */}
            {tab === 'insight' && (
              <KidLessonInsightTab learner={learner} teacher={teacher} />
            )}

            {/* ════ TAB: QUESTS & HOMEWORK ════ */}
            {tab === 'quests' && (
              <EnhancedQuestsTab learner={learner} onUpdate={onUpdate} ts={ts} />
            )}

            {/* ════ TAB: SKILLS (SUPER GAMIFIED ADRENALINE ARENA) ════ */}
            {tab === 'skills' && (
              <EnhancedSkillsTab learner={learner} onUpdate={onUpdate} ts={ts} />
            )}

            {/* ════ TAB: HERO LAND KINGDOM (3D EDITABLE EMOJI CANVAS) ════ */}
            {tab === 'land' && (
              <EnhancedKingdomCanvasTab learner={learner} onUpdate={onUpdate} ts={ts} storeItems={storeItems} onBuyItem={onBuyItem} />
            )}

            {/* ════ TAB: SHOP ════ */}
            {tab === 'store' && (
              <RewardShop storeItems={storeItems} setStoreItems={setStoreItems} coins={learner.coins} onPurchase={onBuyItem} teacher={teacher} buyerMode ownedIds={learner.purchasedRewards || []} />
            )}

            {/* ════ TAB: FEEDBACK (GAMIFIED & HIGHLY VISUALIZED - PREMIUM) ════ */}
            {tab === 'feedback' && (
              <TierGatedOverlay
                requiredTier="pro"
                featureName="Visualized Feedback"
                description="Gamified feedback cards, dynamic mood metrics, and custom lesson reviews are available on PRO and VIP plans."
              >
                <EnhancedFeedbackTab learner={learner} onUpdate={onUpdate} ts={ts} teacher={teacher} />
              </TierGatedOverlay>
            )}

            {/* ════ TAB: VOICES & DIALOGUE (PREMIUM) ════ */}
            {tab === 'voice' && (
              <TierGatedOverlay
                requiredTier="pro"
                featureName="Voices & Dialogue Studio"
                description="Interactive speech synthesis, companion voice casting, and custom dialogue builders are available on PRO and VIP plans."
              >
                <VoiceTab learner={learner} onUpdate={onUpdate} ts={ts} voices={voices} avatarRank={avatarRank} petRank={petRank} teacher={teacher} />
              </TierGatedOverlay>
            )}

            {/* ════ TAB: CALENDAR (PREMIUM) ════ */}
            {tab === 'calendar' && (
              <TierGatedOverlay
                requiredTier="pro"
                featureName="Adventure Calendar"
                description="Class booking grids, synchronized quest calendars, and attendance tracking are available on PRO and VIP plans."
              >
                <LearnerCalendarTab learner={learner} onUpdate={onUpdate} ts={ts} />
              </TierGatedOverlay>
            )}

            {/* ════ TAB: ADMIN (PREMIUM) ════ */}
            {tab === 'admin' && (
              <TierGatedOverlay
                requiredTier="pro"
                featureName="Admin & Data Management"
                description="Young learner profile data backups, system exports, and advanced settings are available on PRO and VIP plans."
              >
                <AdminTab learner={learner} onUpdate={onUpdate} ts={ts} />
              </TierGatedOverlay>
            )}

            {/* ════ TAB: MAGIC BOOK (PREMIUM) ════ */}
            {tab === 'scroll' && (
              <TierGatedOverlay
                requiredTier="pro"
                featureName="Flipbook Studio"
                description="Interactive 3D turn-page flipbooks, illustrated story chapters, and gamified standalone HTML generators are available on PRO and VIP plans."
              >
                <HtmlGenerator learner={learner} teacher={teacher} learnerName={learner.name} learnerAge={learner.age} tutorName={teacher.characterName} tutorStyle={teacher.teachingStyle} />
              </TierGatedOverlay>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   TAB: HERO CARD
   ════════════════════════════════════════════════════════════════════════════ */
const HeroTab: React.FC<any> = ({ learner, avatarRank, petRank, avatarProg, petProg, moodEmoji, ts, onUpdate, handleMoodClick }) => {
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const adventurerInputRef = React.useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const optimizePhoto = (file: File, callback: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) { setPhotoError('Please choose an image file.'); return; }
    if (file.size > 12 * 1024 * 1024) { setPhotoError('Please choose an image smaller than 12 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        setPhotoError(null);
        callback(canvas.toDataURL('image/jpeg', 0.86));
      };
      image.onerror = () => setPhotoError('The image could not be opened. Please try again.');
      image.src = String(reader.result);
    };
    reader.onerror = () => setPhotoError('The image could not be read. Please try again.');
    reader.readAsDataURL(file);
  };
  const persistImage = async (dataUrl: string, fileName: string) => {
    try {
      const handle = await getStoredDirectoryHandle();
      if (handle) await writeBase64ImageToDisk(handle, `kids_photos/${fileName}`, dataUrl);
    } catch { /* browser may not support disk access; profile data remains saved */ }
    void triggerAutoSyncImmediate();
  };
  const savePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) optimizePhoto(file, photoDataUrl => { onUpdate({ photoDataUrl }); void persistImage(photoDataUrl, `${learner.id || 'learner'}_profile.jpg`); });
    event.target.value = '';
  };
  const saveAdventurerPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) optimizePhoto(file, photoDataUrl => { onUpdate({ adventurerPhotos: [...(learner.adventurerPhotos || []), { id: `adventurer-${Date.now()}`, name: file.name.replace(/\\.[^.]+$/, ''), photoDataUrl }] }); void persistImage(photoDataUrl, `${learner.id || 'learner'}_adventurer_${Date.now()}.jpg`); });
    event.target.value = '';
  };
  const pastePhoto = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find(t => t.startsWith('image/'));
        if (type) { const blob = await item.getType(type); optimizePhoto(new File([blob], 'clipboard-image', { type }), dataUrl => { onUpdate({ photoDataUrl: dataUrl }); void persistImage(dataUrl, `${learner.id || 'learner'}_profile.jpg`); }); return; }
      }
      setPhotoError('Copy an image first, then try Paste photo.');
    } catch { setPhotoError('Clipboard access was blocked. Use Choose photo instead.'); }
  };
  const removePhoto = () => onUpdate({ photoDataUrl: undefined });
  const removeAdventurer = (id: string) => onUpdate({ adventurerPhotos: (learner.adventurerPhotos || []).filter((photo: any) => photo.id !== id) });
  const [editInfo, setEditInfo] = useState(false);
  const [editCourse, setEditCourse] = useState(false);
  const [newCourseItem, setNewCourseItem] = useState('');
  const [infoForm, setInfoForm] = useState({ name: learner.name, age: learner.age ?? 8, country: learner.country, city: learner.city ?? '', nativeLang: learner.nativeLang ?? '', targetLang: learner.targetLang ?? '', birthday: learner.birthday ?? '', parentName: learner.parentName ?? '', parentPhone: learner.parentPhone ?? '', contactEmail: learner.contactEmail ?? '' });

  const avatarRarity = getRarityTier(avatarRank.rank);
  const petRarity = getRarityTier(petRank.rank);

  const saveInfo = () => { onUpdate(infoForm); setEditInfo(false); };
  const addCourse = () => { if (newCourseItem.trim()) { onUpdate({ coursePlan: [...learner.coursePlan, newCourseItem] }); setNewCourseItem(''); } };
  const removeCourse = (i: number) => onUpdate({ coursePlan: learner.coursePlan.filter((_: any, idx: number) => idx !== i) });

  return (
    <div className="space-y-6">
      <div className={`${ts.card} border-2 ${ts.border} rounded-3xl p-5 shadow-lg`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">📸 Learner Photos</h3>
            <p className="text-sm font-bold opacity-75">Add a real photo for the profile and Flipbook.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={savePhoto} />
            <button type="button" onClick={() => photoInputRef.current?.click()} className={`px-4 py-2 rounded-xl bg-gradient-to-r ${ts.btn} text-white font-black text-sm cursor-pointer`}>{learner.photoDataUrl ? 'Change photo' : 'Choose photo'}</button>
            <button type="button" onClick={pastePhoto} className="px-4 py-2 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm cursor-pointer">Paste photo</button>
            {learner.photoDataUrl && <button type="button" onClick={removePhoto} className="px-4 py-2 rounded-xl bg-rose-100 text-rose-700 font-black text-sm cursor-pointer">Remove</button>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {learner.photoDataUrl ? <img src={learner.photoDataUrl} alt={`${learner.name} profile`} className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-md" /> : <div className="w-28 h-28 rounded-2xl bg-indigo-100 flex items-center justify-center text-5xl">{avatarRank.emoji}</div>}
          <div className="flex-1 min-w-[220px]">
            <input ref={adventurerInputRef} type="file" accept="image/*" className="hidden" onChange={saveAdventurerPhoto} />
            <button type="button" onClick={() => adventurerInputRef.current?.click()} className="mt-3 px-3 py-2 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs cursor-pointer">+ Add adventurer photo</button>
          </div>
        </div>
        {photoError && <p className="mt-3 text-sm font-black text-rose-600">{photoError}</p>}
        {!!learner.adventurerPhotos?.length && <div className="mt-4 flex flex-wrap gap-3">{learner.adventurerPhotos.map((photo: any) => <div key={photo.id} className="relative"><img src={photo.photoDataUrl} alt={photo.name} className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow" /><button type="button" onClick={() => removeAdventurer(photo.id)} aria-label={`Remove ${photo.name}`} className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black cursor-pointer">×</button></div>)}</div>}
      </div>
      {/* 3D Avatar + Pet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Avatar Card */}
        <motion.div whileHover={{ rotateY: 8, y: -4 }} style={{ transformStyle: 'preserve-3d', boxShadow: avatarRarity.boxGlow }}
          className={`bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 rounded-3xl p-6 text-white shadow-2xl border-4 ${avatarRarity.borderColor} min-h-[420px] flex flex-col relative overflow-hidden transition-all duration-300`}>
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/25 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-bold">
            <span>{moodEmoji}</span>
            <span className="capitalize">{learner.mood}</span>
          </div>
          <div className={`absolute top-3 right-3 ${avatarRarity.badgeBg} ${avatarRarity.badgeText} text-[10px] font-black px-3 py-1 rounded-full shadow-md`}>
            {avatarRarity.rarity.toUpperCase()} • RANK {avatarRank.rank}
          </div>
          <div className="text-center flex-1 flex flex-col justify-center pt-8">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}
              className={`text-8xl sm:text-9xl relative inline-block cursor-pointer select-none ${avatarRarity.dropGlow}`}
              style={{ filter: `drop-shadow(${avatarRarity.boxGlow})` }}
              onClick={handleMoodClick} title="Click to hear mood">
              {avatarRank.emoji}
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-black mt-3">{learner.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${avatarRarity.badgeBg} ${avatarRarity.badgeText}`}>
                {avatarRarity.rarity} {avatarRank.form}
              </span>
              <span className="text-xs font-bold text-pink-200">• {learner.avatarArchetype}</span>
            </div>
          </div>
          {avatarProg.next && (
            <div className="bg-black/30 p-3 rounded-xl mt-2">
              <div className="flex justify-between text-[10px] font-black mb-1">
                <span>Next: {avatarProg.next.form} ({getRarityTier(avatarProg.next.rank).rarity})</span>
                <span>{avatarProg.next.xpNeeded - learner.xp} XP left</span>
              </div>
              <div className="bg-white/20 rounded-full h-2">
                <div className="h-full bg-yellow-300 rounded-full transition-all" style={{ width: `${avatarProg.pct}%` }} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 bg-black/20 p-3 rounded-2xl mt-3">
            <div className="text-center"><p className="text-[10px] font-black opacity-70">⚔️ ATTACK</p><p className="text-2xl font-black">{learner.attack}</p></div>
            <div className="text-center"><p className="text-[10px] font-black opacity-70">🛡️ DEFENSE</p><p className="text-2xl font-black">{learner.defense}</p></div>
          </div>
        </motion.div>

        {/* Pet Card */}
        <motion.div whileHover={{ rotateY: -8, y: -4 }} style={{ transformStyle: 'preserve-3d', boxShadow: petRarity.boxGlow }}
          className={`bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-500 rounded-3xl p-6 text-white shadow-2xl border-4 ${petRarity.borderColor} min-h-[420px] flex flex-col relative overflow-hidden transition-all duration-300`}>
          <div className="absolute top-3 left-3 bg-black/25 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-bold text-emerald-100">
            🐾 Loyal Pet
          </div>
          <div className={`absolute top-3 right-3 ${petRarity.badgeBg} ${petRarity.badgeText} text-[10px] font-black px-3 py-1 rounded-full shadow-md`}>
            {petRarity.rarity.toUpperCase()} • RANK {petRank.rank}
          </div>
          <div className="text-center flex-1 flex flex-col justify-center pt-8">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
              className={`text-8xl sm:text-9xl relative inline-block select-none ${petRarity.dropGlow}`}
              style={{ filter: `drop-shadow(${petRarity.boxGlow})` }}>
              {petRank.emoji}
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-black mt-3">{petRank.form}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${petRarity.badgeBg} ${petRarity.badgeText}`}>
                {petRarity.rarity} {learner.petType}
              </span>
              <span className="text-xs font-bold text-emerald-200">• {learner.petXp ?? 0} Pet-XP</span>
            </div>
          </div>
          {petProg.next && (
            <div className="bg-black/30 p-3 rounded-xl mt-2">
              <div className="flex justify-between text-[10px] font-black mb-1">
                <span>Next: {petProg.next.form} ({getRarityTier(petProg.next.rank).rarity})</span>
                <span>{petProg.next.xpNeeded - (learner.petXp ?? 0)} Pet-XP left</span>
              </div>
              <div className="bg-white/20 rounded-full h-2">
                <div className="h-full bg-yellow-300 rounded-full transition-all" style={{ width: `${petProg.pct}%` }} />
              </div>
            </div>
          )}
          <div className="bg-black/20 p-3 rounded-2xl mt-3 text-center">
            <p className="text-[10px] font-black uppercase opacity-90">Complete homework to level up pet! 🏠</p>
          </div>
        </motion.div>
      </div>

      {/* Personal Information */}
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-white/60 shadow-xl`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-indigo-950 flex items-center gap-2"><User className="w-5 h-5 text-indigo-500" /> Personal Information</h3>
          <button onClick={() => setEditInfo(!editInfo)} className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-black rounded-xl text-xs cursor-pointer flex items-center gap-1">
            {editInfo ? <><Save className="w-3 h-3" /> Save</> : <><Edit2 className="w-3 h-3" /> Edit</>}
          </button>
        </div>
        {editInfo ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'name', label: 'Hero Name', placeholder: 'Luna Starlight' },
              { key: 'country', label: 'Country 🌍', placeholder: 'Mexico' },
              { key: 'city', label: 'City 🏙️', placeholder: 'Mexico City' },
              { key: 'birthday', label: 'Birthday 🎂', placeholder: '', type: 'date' },
              { key: 'nativeLang', label: 'Native Language 🗣️', placeholder: 'Spanish' },
              { key: 'targetLang', label: 'Learning Language 🎯', placeholder: 'English' },
              { key: 'parentName', label: 'Parent Name 👨‍👩‍👧', placeholder: 'Maria Rodriguez' },
              { key: 'parentPhone', label: 'WhatsApp 📱', placeholder: '+52 555 000 0000' },
              { key: 'contactEmail', label: 'Email 📧', placeholder: 'parent@email.com' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">{f.label}</label>
                <input type={f.type || 'text'} value={(infoForm as any)[f.key] || ''} placeholder={f.placeholder}
                  onChange={e => setInfoForm({ ...infoForm, [f.key]: e.target.value })}
                  className="w-full p-2.5 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Age 🎂</label>
              <input type="number" value={infoForm.age} onChange={e => setInfoForm({ ...infoForm, age: parseInt(e.target.value) || 8 })}
                className="w-full p-2.5 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none" />
            </div>
            <div className="col-span-full">
              <button onClick={saveInfo} className={`w-full py-3 bg-gradient-to-r ${ts.btn} text-white font-black rounded-2xl cursor-pointer`}>
                ✅ Save All Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: '📛', label: 'Name', val: learner.name },
              { icon: '🎂', label: 'Age', val: `${learner.age ?? '—'} years` },
              { icon: '🌍', label: 'Country', val: `${learner.city ? learner.city + ', ' : ''}${learner.country}` },
              { icon: '🎁', label: 'Birthday', val: learner.birthday ? new Date(learner.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '—' },
              { icon: '🗣️', label: 'Native', val: learner.nativeLang || '—' },
              { icon: '🎯', label: 'Learning', val: learner.targetLang || '—' },
              { icon: '👨‍👩‍👧', label: 'Parent', val: learner.parentName || '—' },
              { icon: '📱', label: 'WhatsApp', val: learner.parentPhone || '—' },
              { icon: '📧', label: 'Email', val: learner.contactEmail || '—' },
            ].map(r => (
              <div key={r.label} className="bg-indigo-50/60 p-3 rounded-xl">
                <p className="text-[10px] font-black text-gray-400">{r.icon} {r.label}</p>
                <p className="text-sm font-black text-indigo-950 mt-0.5 truncate">{r.val}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Course Plan */}
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-white/60 shadow-xl`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-indigo-950 flex items-center gap-2"><BookOpen className="w-5 h-5 text-purple-500" /> Course Plan</h3>
          <button onClick={() => setEditCourse(!editCourse)} className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-black rounded-xl text-xs cursor-pointer flex items-center gap-1">
            {editCourse ? <><X className="w-3 h-3" /> Done</> : <><Edit2 className="w-3 h-3" /> Edit</>}
          </button>
        </div>
        <div className="space-y-2">
          {learner.coursePlan.map((p: string, i: number) => (
            <div key={i} className="flex items-center gap-2 p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100">
              <span className="text-green-600 font-black">🎯</span>
              <span className="flex-1 text-sm font-bold text-indigo-950">{p}</span>
              {editCourse && <button onClick={() => removeCourse(i)} className="text-red-500 hover:text-red-700 cursor-pointer"><Trash2 className="w-4 h-4" /></button>}
            </div>
          ))}
          {editCourse && (
            <div className="flex gap-2">
              <input value={newCourseItem} onChange={e => setNewCourseItem(e.target.value)} placeholder="Add new objective..."
                className="flex-1 p-2.5 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none" />
              <button onClick={addCourse} className={`px-4 bg-gradient-to-r ${ts.btn} text-white font-black rounded-xl cursor-pointer`}>+ Add</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   TAB: EVOLUTION ROADMAP (ADRENALINE OVERDRIVE)
   ════════════════════════════════════════════════════════════════════════════ */
const RoadmapTab: React.FC<any> = ({ avatarTable, petTable, avatarRank, petRank, learner, ts, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState(learner.customAvatarRoadmap || avatarTable);
  const [petDraft, setPetDraft] = useState(learner.customPetRoadmap || petTable);
  const [selectedPreview, setSelectedPreview] = useState<{ type: 'avatar' | 'pet'; rank: number } | null>(null);

  const save = () => {
    onUpdate({ customAvatarRoadmap: avatarDraft, customPetRoadmap: petDraft });
    setEditing(false);
    playStarShower();
  };

  const updateRank = (type: 'avatar' | 'pet', idx: number, key: string, value: string | number) => {
    const setter = type === 'avatar' ? setAvatarDraft : setPetDraft;
    const list = type === 'avatar' ? avatarDraft : petDraft;
    setter(list.map((r: any, i: number) => i === idx ? { ...r, [key]: key === 'xpNeeded' ? Number(value) : value } : r));
  };

  // Calculate next rank thresholds
  const avatarNext = avatarTable.find((r: any) => r.rank === avatarRank.rank + 1);
  const avatarPrev = avatarTable.find((r: any) => r.rank === avatarRank.rank);
  const avatarProgPercent = avatarNext 
    ? Math.min(100, Math.max(0, Math.round(((learner.xp - (avatarPrev?.xpNeeded || 0)) / (avatarNext.xpNeeded - (avatarPrev?.xpNeeded || 0))) * 100)))
    : 100;

  const petXpVal = learner.petXp ?? 0;
  const petNext = petTable.find((r: any) => r.rank === petRank.rank + 1);
  const petPrev = petTable.find((r: any) => r.rank === petRank.rank);
  const petProgPercent = petNext 
    ? Math.min(100, Math.max(0, Math.round(((petXpVal - (petPrev?.xpNeeded || 0)) / (petNext.xpNeeded - (petPrev?.xpNeeded || 0))) * 100)))
    : 100;

  const renderRank = (r: any, i: number, type: 'avatar' | 'pet') => {
    const xp = type === 'avatar' ? learner.xp : (learner.petXp ?? 0);
    const currentRank = type === 'avatar' ? avatarRank.rank : petRank.rank;
    const reached = xp >= r.xpNeeded;
    const current = r.rank === currentRank;
    const rarity = getRarityTier(r.rank);

    return (
      <motion.div
        key={`${type}-${r.rank}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: r.rank * 0.06 }}
        whileHover={{ scale: reached ? 1.015 : 1, transition: { duration: 0.2 } }}
        onClick={() => {
          if (reached) {
            playQuestDing();
            setSelectedPreview({ type, rank: r.rank });
          }
        }}
        className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 sm:border-3 transition-all duration-300 relative overflow-hidden ${
          current
            ? `bg-white dark:bg-slate-900 ${rarity.borderColor} shadow-2xl ring-2 sm:ring-4 ring-offset-2 ${rarity.glowClass}`
            : reached
            ? `bg-white/95 dark:bg-slate-900/90 ${rarity.borderColor} shadow-lg hover:shadow-xl cursor-pointer`
            : 'bg-slate-100/70 dark:bg-slate-950/60 border-slate-300/80 dark:border-slate-800 opacity-65'
        }`}
        style={current || reached ? { boxShadow: rarity.boxGlow } : undefined}
      >
        {/* Adrenaline ambient sheen background for active and reached tiers */}
        {(current || reached) && (
          <div className="absolute inset-0 opacity-10 bg-gradient-to-r pointer-events-none" style={{ backgroundImage: `linear-gradient(135deg, ${rarity.glowColor} 0%, transparent 60%)` }} />
        )}

        {editing ? (
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${rarity.badgeStyle}`}>
                Rank {r.rank} • {rarity.rarity}
              </span>
              <span className="text-xs font-bold text-gray-500">Edit Rank Form</span>
            </div>
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-3 sm:col-span-2">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">Emoji</label>
                <input
                  value={r.emoji}
                  onChange={(e) => updateRank(type, i, 'emoji', e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border-2 border-indigo-200 rounded-xl text-3xl text-center shadow-inner"
                />
              </div>
              <div className="col-span-9 sm:col-span-6">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">Form Name / Title</label>
                <input
                  value={r.form}
                  onChange={(e) => updateRank(type, i, 'form', e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border-2 border-indigo-200 rounded-xl text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div className="col-span-12 sm:col-span-4">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">Required XP</label>
                <input
                  type="number"
                  value={r.xpNeeded}
                  onChange={(e) => updateRank(type, i, 'xpNeeded', e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border-2 border-indigo-200 rounded-xl text-sm font-black text-indigo-950 dark:text-indigo-200"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            {/* Left: Avatar / Pet Icon & Form Information */}
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="relative shrink-0">
                <motion.div
                  animate={current ? { scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 3.5 }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl select-none shadow-md ${
                    reached ? 'bg-gradient-to-br from-white/90 to-slate-100 dark:from-slate-800 dark:to-slate-900' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                  style={reached ? { filter: `drop-shadow(${rarity.boxGlow})` } : undefined}
                >
                  <span className={reached ? '' : 'grayscale opacity-60'}>{r.emoji}</span>
                </motion.div>
                {current && (
                  <span className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white shadow-xs"></span>
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Dramatic Badge & Rank Title */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs sm:text-sm font-black tracking-wide uppercase px-3 py-1 rounded-xl flex items-center gap-1.5 ${rarity.badgeStyle}`}>
                    <span>{rarity.symbol}</span>
                    <span>{rarity.rarity}</span>
                    <span className="opacity-75">•</span>
                    <span>Rank {r.rank}</span>
                  </span>

                  <span className="text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg">
                    {rarity.powerRating}
                  </span>
                </div>

                <h4 className="font-black text-base sm:text-lg text-slate-900 dark:text-white truncate">
                  {r.form}
                </h4>

                <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <strong className="text-indigo-600 dark:text-indigo-400 font-black">{r.xpNeeded.toLocaleString()}</strong> {type === 'avatar' ? 'Class XP' : 'HW XP'}
                  </span>
                  <span>•</span>
                  <span>
                    {reached 
                      ? <span className="text-emerald-600 dark:text-emerald-400 font-black">Unlocked ({xp.toLocaleString()} XP)</span> 
                      : <span className="text-slate-500 font-semibold">{Math.max(0, r.xpNeeded - xp).toLocaleString()} XP remaining</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Dramatic Status Indicator */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {current ? (
                <div className="px-3.5 py-1.5 bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="w-4 h-4 fill-white" />
                  <span>CURRENT ACTIVE</span>
                </div>
              ) : reached ? (
                <div className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>UNLOCKED</span>
                </div>
              ) : (
                <div className="px-3 py-1.5 bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5">
                  <span>🔒 Locked</span>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 sm:p-7 border-4 border-white/70 shadow-2xl space-y-7`}>
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100/80 dark:border-slate-800 pb-5">
        <div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>🗺️</span> Evolution Roadmap & Rarity Mastery
          </h3>
          <p className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-400 mt-1">
            Universal rank evolution, adrenaline aura transformations, and unlocked power forms for heroes and companion pets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={editing ? save : () => setEditing(true)}
            className={`px-5 py-2.5 bg-gradient-to-r ${ts.btn} text-white font-black rounded-2xl text-sm cursor-pointer flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all`}
          >
            {editing ? (
              <>
                <Save className="w-4 h-4" />
                <span>Save Roadmap</span>
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                <span>Edit XP & Forms</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Adrenaline Hero & Pet Active Progression Hub ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Hero Avatar Hub Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white border-2 border-indigo-400/40 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/40 border border-indigo-300/40 flex items-center justify-center text-3xl shadow-inner">
                {learner.avatar}
              </div>
              <div>
                <span className="text-xs font-black uppercase text-indigo-300 tracking-wider">Active Hero Archetype</span>
                <h4 className="text-xl sm:text-2xl font-black text-white">{learner.name.split(' ')[0]} • {learner.avatarArchetype}</h4>
              </div>
            </div>

            <span className={`text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl ${getRarityTier(avatarRank.rank).badgeStyle}`}>
              {getRarityTier(avatarRank.rank).symbol} {getRarityTier(avatarRank.rank).rarity}
            </span>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-indigo-200">
              <span>Class XP Progress: <strong className="text-white font-black text-sm sm:text-base">{learner.xp.toLocaleString()} XP</strong></span>
              <span>{avatarNext ? `Next: Rank ${avatarNext.rank} (${avatarNext.xpNeeded.toLocaleString()} XP)` : '👑 Maximum Tier Reached!'}</span>
            </div>
            <div className="w-full h-3.5 bg-black/50 rounded-full overflow-hidden p-0.5 border border-indigo-500/40">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${avatarProgPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full bg-gradient-to-r ${getRarityTier(avatarRank.rank).gradientBg} shadow-md`}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-black text-indigo-300 pt-1">
              <span>Current Form: <strong>{avatarRank.form}</strong></span>
              <span>{avatarProgPercent}% to next rank</span>
            </div>
          </div>
        </div>

        {/* Right: Companion Pet Hub Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white border-2 border-emerald-400/40 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/40 border border-emerald-300/40 flex items-center justify-center text-3xl shadow-inner">
                {petRank.emoji || '🐾'}
              </div>
              <div>
                <span className="text-xs font-black uppercase text-emerald-300 tracking-wider">Companion Evolution</span>
                <h4 className="text-xl sm:text-2xl font-black text-white">{learner.petType} Companion</h4>
              </div>
            </div>

            <span className={`text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl ${getRarityTier(petRank.rank).badgeStyle}`}>
              {getRarityTier(petRank.rank).symbol} {getRarityTier(petRank.rank).rarity}
            </span>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-emerald-200">
              <span>Homework XP Progress: <strong className="text-white font-black text-sm sm:text-base">{petXpVal.toLocaleString()} XP</strong></span>
              <span>{petNext ? `Next: Rank ${petNext.rank} (${petNext.xpNeeded.toLocaleString()} XP)` : '👑 Maximum Tier Reached!'}</span>
            </div>
            <div className="w-full h-3.5 bg-black/50 rounded-full overflow-hidden p-0.5 border border-emerald-500/40">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${petProgPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full bg-gradient-to-r ${getRarityTier(petRank.rank).gradientBg} shadow-md`}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-black text-emerald-300 pt-1">
              <span>Current Pet: <strong>{petRank.form}</strong></span>
              <span>{petProgPercent}% to next rank</span>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="text-sm font-bold text-amber-900 bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 p-4 rounded-2xl shadow-sm">
          💡 <strong>Tip:</strong> Custom roadmap names and XP values are saved per learner. Class XP accelerates hero evolution, while homework completion XP powers pet evolutions.
        </div>
      )}

      {/* ── Dual Column Evolution Tiers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Left Column: Avatar Form Roadmap */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-indigo-200 dark:border-indigo-800 pb-3">
            <h4 className="font-black text-slate-900 dark:text-white text-lg sm:text-xl flex items-center gap-2">
              <span>🦸</span> Hero Avatar: {learner.avatarArchetype}
            </h4>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-xl border border-indigo-200">
              5 Rarity Tiers
            </span>
          </div>
          <div className="space-y-3.5">
            {avatarDraft.map((r: any, i: number) => renderRank(r, i, 'avatar'))}
          </div>
        </div>

        {/* Right Column: Companion Pet Roadmap */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-emerald-200 dark:border-emerald-800 pb-3">
            <h4 className="font-black text-slate-900 dark:text-white text-lg sm:text-xl flex items-center gap-2">
              <span>🐾</span> Companion Pet: {learner.petType}
            </h4>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-200">
              5 Rarity Tiers
            </span>
          </div>
          <div className="space-y-3.5">
            {petDraft.map((r: any, i: number) => renderRank(r, i, 'pet'))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   TAB: LOG SESSION
   ════════════════════════════════════════════════════════════════════════════ */
const SessionTab: React.FC<{ learner: Learner; onUpdate: (u: Partial<Learner>) => void; ts: any }> = ({ learner, onUpdate, ts }) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate]         = useState(today);
  const [duration, setDuration] = useState(60);
  const [goal, setGoal]         = useState('');
  const [transcript, setTranscript] = useState('');
  const [strengths, setStrengths]   = useState<Array<{ text: string; points: number }>>([]);
  const [weaknesses, setWeaknesses] = useState<Array<{ text: string; points: number }>>([]);
  const [newStrength, setNewStrength] = useState({ text: '', points: 5 });
  const [newWeakness, setNewWeakness] = useState({ text: '', points: 3 });
  const [useManual, setUseManual] = useState(false);
  const [manualJson, setManualJson] = useState('');
  const [manualErr, setManualErr]   = useState('');

  const totalXP  = strengths.reduce((s, x) => s + x.points, 0) * 10;
  const lostXP   = weaknesses.reduce((s, x) => s + x.points, 0) * 5;
  const netXP    = Math.max(0, totalXP - lostXP);

  const manualPrompt = `You are analyzing a language lesson session for a ${learner.age ?? 8}-year-old learner named "${learner.name}".

Lesson Goal: ${goal || '(not specified)'}
Session Notes/Transcript: ${transcript || '(paste transcript here)'}

Return ONLY a valid JSON object with this structure:
{
  "competencyUpdates": { "pronunciation": 5, "grammar": -2, "vocabulary": 3 },
  "newSkills": ["Subject pronouns", "Food vocabulary"],
  "facts": ["Learner loves dragons", "Learner has a sister named Sofia"],
  "homework": ["Practice past tense verbs 5x", "Read story about animals"],
  "xpBonus": 30,
  "message": "Great job today ${learner.name}! You did really well with pronunciation!"
}`;

  const applyManualJson = () => {
    try {
      const data = JSON.parse(manualJson);
      finalizeSession(data);
      setManualJson(''); setManualErr('');
    } catch { setManualErr('Invalid JSON — please check format!'); }
  };

  const finalizeSession = (aiData?: any) => {
    const xpBonus  = aiData?.xpBonus ?? 0;
    const totalGained = netXP + xpBonus + 50; // base 50 XP per session

    /* Update weaknesses profile */
    const currentWeaknesses: Weakness[] = learner.weaknesses || [];
    const newWeak: Weakness[] = weaknesses.map(w => ({
      id: `w-${Date.now()}-${Math.random()}`,
      name: w.text,
      points: w.points,
      completed: false,
      dateAdded: date,
    }));

    /* Competency updates from AI */
    const updatedSkills = { ...learner.skills };
    if (aiData?.competencyUpdates) {
      Object.entries(aiData.competencyUpdates as Record<string, number>).forEach(([k, v]) => {
        if (k in updatedSkills) updatedSkills[k] = Math.max(0, Math.min(100, (updatedSkills[k] || 0) + v));
      });
    }

    /* Build session log */
    const log: SessionLog = {
      id: `sl-${Date.now()}`,
      date,
      duration,
      xpEarned: totalGained,
      strengths,
      weaknesses,
      summary: goal,
      transcript,
      ...(aiData ? { aiAnalysis: { competencies: aiData.competencyUpdates || {}, newSkills: aiData.newSkills || [], facts: aiData.facts || [], homework: aiData.homework || [], message: aiData.message || '' } } : {}),
    };

    /* Add homework to learner if AI provided */
    const aiHomework: Homework[] = (aiData?.homework || []).map((h: string) => ({
      id: `hw-ai-${Date.now()}-${Math.random()}`,
      title: h, description: 'AI-suggested task',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      xpReward: 40, completed: false,
    }));

    /* Add feedback facts */
    const currentFeedback = learner.feedbackLog || [];
    const newFacts = (aiData?.facts || []).map((f: string) => ({
      id: `fact-${Date.now()}-${Math.random()}`, date, note: f,
    }));

    onUpdate({
      xp: learner.xp + totalGained,
      streak: learner.streak + 1,
      totalSessions: learner.totalSessions + 1,
      totalMinutes: learner.totalMinutes + duration,
      skills: updatedSkills,
      weaknesses: [...currentWeaknesses, ...newWeak],
      sessionLogs: [...(learner.sessionLogs || []), log],
      homework: [...(learner.homework || []), ...aiHomework],
      feedbackLog: [...currentFeedback, ...newFacts],
    });

    /* Reset form */
    setGoal(''); setTranscript(''); setStrengths([]); setWeaknesses([]);
    setDuration(60); setDate(today);
    alert(`✨ Session logged! +${totalGained} XP earned for ${learner.name}!`);
  };

  return (
    <div className="space-y-5">
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-white/60 shadow-xl`}>
        <h3 className="text-xl font-black text-indigo-950 flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-blue-500" /> 📋 Log Class Session</h3>
        <p className="text-xs font-bold text-gray-500 mb-4">Avatar XP grows from sessions. More participation = higher rank!</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-gray-500 mb-1 uppercase">📅 Class Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold outline-none" />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 mb-1 uppercase">⏱️ Duration (min)</label>
            <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)} min={5} max={180} className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-black outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-black text-gray-500 mb-1 uppercase">🎯 Lesson Goal / Summary</label>
            <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g., Practice food vocabulary and past tense..." className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-black text-gray-500 mb-1 uppercase">📝 Session Notes / Transcript</label>
            <textarea rows={3} value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Paste what the learner said or what was covered..." className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none resize-none" />
          </div>
        </div>

        {/* Strengths */}
        <div className="mt-4">
          <label className="block text-xs font-black text-emerald-700 mb-2 uppercase">💪 Strengths (each adds XP × 10)</label>
          <div className="flex gap-2 mb-2">
            <input value={newStrength.text} onChange={e => setNewStrength({ ...newStrength, text: e.target.value })} placeholder="What did they do well?" className="flex-1 p-2.5 bg-white border-2 border-emerald-200 rounded-xl font-bold text-xs outline-none" />
            <input type="number" value={newStrength.points} onChange={e => setNewStrength({ ...newStrength, points: parseInt(e.target.value) || 1 })} min={1} max={10} className="w-16 p-2.5 bg-white border-2 border-emerald-200 rounded-xl font-black text-center outline-none" />
            <button onClick={() => { if (newStrength.text.trim()) { setStrengths(prev => [...prev, { ...newStrength }]); setNewStrength({ text: '', points: 5 }); } }}
              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs cursor-pointer">+</button>
          </div>
          <div className="space-y-1">
            {strengths.map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-600 text-sm">💪</span>
                <span className="flex-1 text-sm font-bold text-emerald-900">{s.text}</span>
                <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">+{s.points * 10}XP</span>
                <button onClick={() => setStrengths(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 cursor-pointer"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="mt-4">
          <label className="block text-xs font-black text-red-700 mb-2 uppercase">⚠️ Weaknesses (appear in Skills tab as tasks)</label>
          <div className="flex gap-2 mb-2">
            <input value={newWeakness.text} onChange={e => setNewWeakness({ ...newWeakness, text: e.target.value })} placeholder="What needs more practice?" className="flex-1 p-2.5 bg-white border-2 border-red-200 rounded-xl font-bold text-xs outline-none" />
            <input type="number" value={newWeakness.points} onChange={e => setNewWeakness({ ...newWeakness, points: parseInt(e.target.value) || 1 })} min={1} max={10} className="w-16 p-2.5 bg-white border-2 border-red-200 rounded-xl font-black text-center outline-none" />
            <button onClick={() => { if (newWeakness.text.trim()) { setWeaknesses(prev => [...prev, { ...newWeakness }]); setNewWeakness({ text: '', points: 3 }); } }}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl text-xs cursor-pointer">+</button>
          </div>
          <div className="space-y-1">
            {weaknesses.map((w, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded-xl border border-red-200">
                <span className="text-red-500 text-sm">⚠️</span>
                <span className="flex-1 text-sm font-bold text-red-900">{w.text}</span>
                <span className="text-xs font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">-{w.points * 5}XP</span>
                <button onClick={() => setWeaknesses(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* XP preview */}
        <div className="mt-4 p-3 bg-indigo-50 rounded-2xl border border-indigo-200 flex gap-4 text-sm font-black">
          <span className="text-emerald-700">+{totalXP} XP</span>
          {lostXP > 0 && <span className="text-red-600">-{lostXP} XP</span>}
          <span className="text-indigo-700">Base: +50 XP</span>
          <span className="text-purple-700 font-black text-base ml-auto">Net: +{netXP + 50} XP ⚡</span>
        </div>

        {/* Manual AI Toggle */}
        <div className="mt-4 border-t border-indigo-100 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useManual} onChange={e => setUseManual(e.target.checked)} className="w-5 h-5 rounded text-indigo-600" />
            <span className="text-sm font-black text-indigo-900">🤖 Use Manual AI Analysis (Copy prompt → paste to AI → paste JSON back)</span>
          </label>
          {useManual && (
            <div className="mt-3 space-y-3">
              <div className="bg-slate-900 text-indigo-100 p-4 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {manualPrompt}
              </div>
              <button onClick={() => navigator.clipboard.writeText(manualPrompt)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs cursor-pointer flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copy Prompt
              </button>
              <textarea value={manualJson} onChange={e => setManualJson(e.target.value)} placeholder='Paste AI JSON response here...' rows={5} className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-mono text-xs outline-none resize-none" />
              {manualErr && <p className="text-red-600 text-xs font-bold">{manualErr}</p>}
              <button onClick={applyManualJson} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs cursor-pointer">Apply AI Analysis</button>
            </div>
          )}
        </div>

        <button onClick={() => finalizeSession()}
          className={`mt-4 w-full py-4 bg-gradient-to-r ${ts.btn} text-white text-lg font-black rounded-2xl shadow-xl cursor-pointer hover:scale-105 transition-transform`}>
          📋 Log Session & Award XP!
        </button>
      </div>

      {/* Session History */}
      {(learner.sessionLogs?.length ?? 0) > 0 && (
        <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-white/60 shadow-xl`}>
          <h3 className="text-lg font-black text-indigo-950 mb-3">📜 Session History ({learner.sessionLogs?.length})</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
            {[...(learner.sessionLogs || [])].reverse().map(log => (
              <div key={log.id} className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-black text-sm text-indigo-950">{log.date} • {log.duration}min</p>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">+{log.xpEarned}XP</span>
                </div>
                {log.summary && <p className="text-xs font-bold text-gray-600">{log.summary}</p>}
                {log.aiAnalysis?.message && <p className="text-xs font-bold text-purple-700 mt-1 italic">"{log.aiAnalysis.message}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   TAB: HERO LAND (city-builder with drag placement)
   ════════════════════════════════════════════════════════════════════════════ */
const GRID_ROWS = 6;
const GRID_COLS = 8;

const LandTab: React.FC<{ learner: Learner; onUpdate: (u: Partial<Learner>) => void; ts: any; storeItems: StoreItem[]; onBuyItem: (item: StoreItem) => void }> = ({ learner, onUpdate, ts }) => {
  const [grid, setGrid] = useState<(typeof learner.landItems[0] | null)[][]>(() => {
    const g: any[][] = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    (learner.landItems || []).forEach(item => {
      if (item.row < GRID_ROWS && item.col < GRID_COLS) g[item.row][item.col] = item;
    });
    return g;
  });
  const [selectedItem, setSelectedItem] = useState<typeof learner.landItems[0] | null>(null);
  const [customItem, setCustomItem] = useState({ emoji: '🗿', name: 'Custom Statue', cost: 20 });

  const QUICK_ITEMS = [
    { emoji: '🌲', name: 'Pine Tree', cost: 20 },
    { emoji: '🌸', name: 'Cherry Bloom', cost: 20 },
    { emoji: '🏰', name: 'Castle Tower', cost: 20 },
    { emoji: '🌳', name: 'Oak Tree', cost: 20 },
    { emoji: '🌺', name: 'Red Flower', cost: 20 },
    { emoji: '🏠', name: 'House', cost: 25 },
    { emoji: '⛲', name: 'Fountain', cost: 30 },
    { emoji: '🌉', name: 'Bridge', cost: 40 },
    { emoji: '🗼', name: 'Tower', cost: 50 },
    { emoji: '🌊', name: 'River', cost: 35 },
    { emoji: '🐉', name: 'Dragon Lair', cost: 100 },
    { emoji: '✨', name: 'Magic Spark', cost: 15 },
  ];

  const buyAndPlace = (item: { emoji: string; name: string; cost: number }) => {
    if (learner.coins < item.cost) { alert('❌ Not enough coins!'); return; }
    const newItem = { id: `land-${Date.now()}`, emoji: item.emoji, name: item.name, row: 0, col: 0 };
    setSelectedItem(newItem);
    onUpdate({ coins: learner.coins - item.cost });
  };

  const placeItem = (row: number, col: number) => {
    if (grid[row][col] && !selectedItem) return;
    if (selectedItem) {
      const newGrid = grid.map(r => [...r]);
      // Remove old position
      newGrid.forEach((r, ri) => r.forEach((c, ci) => { if (c?.id === selectedItem.id) newGrid[ri][ci] = null; }));
      newGrid[row][col] = { ...selectedItem, row, col };
      setGrid(newGrid);
      setSelectedItem(null);
    }
  };

  const pickItem = (row: number, col: number) => {
    if (!grid[row][col]) return;
    setSelectedItem(grid[row][col]);
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = null;
    setGrid(newGrid);
  };

  const removeItem = (row: number, col: number) => {
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = null;
    setGrid(newGrid);
  };

  const saveKingdom = () => {
    const items: typeof learner.landItems = [];
    grid.forEach((r, ri) => r.forEach((c, ci) => { if (c) items.push({ ...c, row: ri, col: ci }); }));
    onUpdate({ landItems: items });
    alert('🏰 Kingdom saved!');
  };

  return (
    <div className="space-y-5">
      {/* Item Store */}
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-white/60 shadow-xl`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-black text-indigo-950">🏗️ Kingdom Builder</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-full">🪙 {learner.coins}</span>
            {selectedItem && <span className="text-xs font-black text-purple-700 bg-purple-100 px-3 py-1 rounded-full animate-pulse">Placing: {selectedItem.emoji} — tap grid!</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ITEMS.map(item => (
            <button key={item.emoji} onClick={() => buyAndPlace(item)}
              className="flex items-center gap-1 px-3 py-2 bg-white border-2 border-indigo-200 rounded-xl text-xs font-black hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer transition-all">
              <span className="text-xl">{item.emoji}</span>
              <span className="text-indigo-950">{item.name}</span>
              <span className="text-amber-600">🪙{item.cost}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 p-3 bg-white/70 rounded-2xl border-2 border-indigo-100">
          <p className="text-xs font-black text-indigo-950 mb-2">✨ Add Custom Land Item</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input value={customItem.emoji} onChange={(e) => setCustomItem({...customItem, emoji: e.target.value})} className="p-2 bg-white border rounded-xl text-2xl text-center" />
            <input value={customItem.name} onChange={(e) => setCustomItem({...customItem, name: e.target.value})} className="p-2 bg-white border rounded-xl font-bold sm:col-span-2" />
            <input type="number" value={customItem.cost} onChange={(e) => setCustomItem({...customItem, cost: Number(e.target.value)})} className="p-2 bg-white border rounded-xl font-black" />
          </div>
          <button onClick={() => buyAndPlace(customItem)} className={`mt-2 w-full py-2 bg-gradient-to-r ${ts.btn} text-white font-black rounded-xl text-xs cursor-pointer`}>Buy & Place Custom Item</button>
        </div>
      </div>

      {/* Grid */}
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-white/60 shadow-xl`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-indigo-950">🌍 {learner.name}'s Kingdom</h3>
          <div className="flex gap-2">
            {selectedItem && <button onClick={() => setSelectedItem(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 font-black rounded-xl text-xs cursor-pointer">Cancel</button>}
            <button onClick={saveKingdom} className={`px-4 py-1.5 bg-gradient-to-r ${ts.btn} text-white font-black rounded-xl text-xs cursor-pointer flex items-center gap-1`}>
              <Save className="w-3 h-3" /> Save Kingdom
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="bg-gradient-to-br from-emerald-200/50 to-green-100/50 rounded-2xl p-3 border-4 border-emerald-300 min-w-[500px]">
            {grid.map((row, ri) => (
              <div key={ri} className="flex gap-1 mb-1">
                {row.map((cell, ci) => (
                  <div key={ci}
                    onClick={() => cell ? pickItem(ri, ci) : placeItem(ri, ci)}
                    onContextMenu={(e) => { e.preventDefault(); removeItem(ri, ci); }}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all text-3xl relative
                      ${selectedItem ? 'border-dashed border-purple-400 hover:bg-purple-100/50' : cell ? 'border-emerald-400 hover:bg-red-50' : 'border-emerald-200/60 bg-emerald-100/20 hover:bg-emerald-200/40'}`}
                    title={cell ? `${cell.name} (right-click to remove)` : selectedItem ? `Place ${selectedItem.emoji} here` : 'Empty tile'}>
                    {cell ? (
                      <motion.span animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 2 + (ri + ci) * 0.1 }}>
                        {cell.emoji}
                      </motion.span>
                    ) : (
                      <span className="text-emerald-300 text-sm opacity-40">·</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold text-gray-400 mt-2 text-center">Click to pick/place • Right-click to remove • Save when done</p>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   TAB: FEEDBACK (Competency, Facts, Challenges, AI Copilot)
   ════════════════════════════════════════════════════════════════════════════ */
/**
 * Lesson Insight tab for a kids profile.
 *
 * Same hand-off as the adult profile's tab: write this child's profile facts to
 * the shared key, then open the Lesson Insight widget in a new tab so the tutor
 * can paste the class transcript. The kid profile has different field names
 * (`nativeLang`/`targetLang`, `parentNotes`, `targetCEFR`), which is why the
 * facts block is assembled here rather than shared with the adult page.
 */
const KidLessonInsightTab: React.FC<{ learner: Learner; teacher: TeacherProfile }> = ({ learner, teacher }) => {
  const [opened, setOpened] = useState(false);

  const facts = buildFactsFallback({
    level: learner.targetCEFR || (learner.level ? `Level ${learner.level}` : ''),
    nationality: learner.country,
    l1: learner.nativeLang,
    l2: learner.targetLang,
    age: learner.age,
    goals: learner.parentExpectations?.join('; ') || learner.expectations,
    weakAreas: learner.weaknesses?.map((w) => w?.name).filter(Boolean).join('; '),
    interests: [...(learner.interests || []), ...(learner.hobbies || [])].join(', '),
    notes: [learner.parentNotes?.join(' | '), learner.learningStyle ? `Learning style: ${learner.learningStyle}` : ''].filter(Boolean).join('\n'),
    extra: [
      learner.favoriteSubject ? `Favourite subject: ${learner.favoriteSubject}` : '',
      learner.sessionFrequency ? `Session frequency: ${learner.sessionFrequency}` : '',
      learner.placementScore ? `Placement score: ${learner.placementScore}` : '',
      learner.totalSessions ? `Sessions so far: ${learner.totalSessions}` : '',
    ],
  });

  const handleOpen = () => {
    const ok = openLessonInsight({
      name: learner.name,
      tutorName: teacher?.characterName || '',
      nationality: learner.country,
      l1: learner.nativeLang,
      l2: learner.targetLang,
      focusedLanguage: learner.coursePlan?.join('; ') || '',
      facts,
      source: `${learner.name}'s kids profile — Lesson Insight`,
    });
    if (ok) {
      setOpened(true);
      setTimeout(() => setOpened(false), 4000);
    }
  };

  return (
    <div className="rounded-3xl border-2 border-indigo-200 bg-white/80 p-6 space-y-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🔎</span>
        <div>
          <h3 className="text-lg font-black text-indigo-950">Lesson Insight</h3>
          <p className="text-xs text-indigo-700">
            Build a speaking &amp; grammar report for {learner.name} from a class transcript — no API key needed.
          </p>
        </div>
      </div>

      <p className="text-sm text-indigo-900 leading-relaxed">
        Clicking below copies {learner.name}'s profile facts into the Lesson Insight app and opens it in a new
        tab. Paste the lesson transcript there, copy the generated prompt into any external AI, then paste
        the AI's JSON reply back into the app.
      </p>

      <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-3">
        <span className="block text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-1.5">
          Facts that will be copied
        </span>
        <pre className="text-[11px] text-indigo-900 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto leading-relaxed">
          {facts || '(nothing on file yet — fill in the Hero Card details for a sharper report)'}
        </pre>
      </div>

      <button
        onClick={handleOpen}
        className="w-full sm:w-auto px-5 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center gap-2"
      >
        {opened ? '✅ Opened in a new tab!' : '🚀 Copy facts & open Lesson Insight'}
      </button>
    </div>
  );
};

const FeedbackTab: React.FC<{ learner: Learner; onUpdate: (u: Partial<Learner>) => void; ts: any; teacher: TeacherProfile }> = ({ learner, onUpdate, ts, teacher }) => {
  const [newFact, setNewFact] = useState('');
  const [newChallenge, setNewChallenge] = useState('');
  const feedbackLog = learner.feedbackLog || [];
  const facts = feedbackLog.filter(f => f.id.startsWith('fact-') || !f.id.startsWith('msg-'));

  const addFact = () => {
    if (!newFact.trim()) return;
    const entry = { id: `fact-${Date.now()}`, date: new Date().toISOString().split('T')[0], note: newFact };
    onUpdate({ feedbackLog: [...feedbackLog, entry] });
    setNewFact('');
  };

  const addChallenge = () => {
    if (!newChallenge.trim()) return;
    const wk = { id: `w-${Date.now()}`, name: newChallenge, points: 2, completed: false, dateAdded: new Date().toISOString().split('T')[0] };
    onUpdate({ weaknesses: [...(learner.weaknesses || []), wk] });
    setNewChallenge('');
  };

  return (
    <div className="space-y-5">
      {/* Competency chart */}
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-white/60 shadow-xl`}>
        <h3 className="text-lg font-black text-indigo-950 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Competency Progress</h3>
        <div className="space-y-2">
          {Object.entries(learner.skills).map(([name, val]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-xs font-black capitalize w-24 truncate text-indigo-950">{name}</span>
              <div className="flex-1 bg-indigo-100 rounded-full h-4 overflow-hidden">
                <motion.div className={`h-full rounded-full ${val >= 80 ? 'bg-emerald-500' : val >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 1 }} />
              </div>
              <span className="text-xs font-black text-indigo-700 w-10 text-right">{val}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Facts bank */}
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-indigo-100 shadow-xl`}>
        <h3 className="text-lg font-black text-indigo-950 mb-3 flex items-center gap-2">💡 Learner Facts Bank</h3>
        <p className="text-xs text-gray-500 font-bold mb-3">Personal facts extracted from sessions. Helps personalize lessons!</p>
        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar mb-3">
          {facts.length === 0 && <p className="text-sm text-gray-400 font-bold">No facts recorded yet.</p>}
          {facts.map(f => (
            <div key={f.id} className="flex items-center gap-2 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
              <span className="text-lg">💡</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-indigo-950">{f.note}</p>
                <p className="text-[10px] text-gray-400">{f.date}</p>
              </div>
              <button onClick={() => onUpdate({ feedbackLog: feedbackLog.filter(x => x.id !== f.id) })} className="text-gray-300 hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newFact} onChange={e => setNewFact(e.target.value)} placeholder="Add a fact about the learner..." className="flex-1 p-2.5 bg-white border-2 border-indigo-200 rounded-xl font-bold text-xs outline-none" onKeyDown={e => e.key === 'Enter' && addFact()} />
          <button onClick={addFact} className={`px-4 py-2 bg-gradient-to-r ${ts.btn} text-white font-black rounded-xl text-xs cursor-pointer`}>+ Add</button>
        </div>
      </div>

      {/* Challenges bank */}
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-red-100 shadow-xl`}>
        <h3 className="text-lg font-black text-indigo-950 mb-3 flex items-center gap-2">⚠️ Challenges Bank</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar mb-3">
          {(learner.weaknesses || []).length === 0 && <p className="text-sm text-gray-400 font-bold">No challenges recorded yet.</p>}
          {(learner.weaknesses || []).map((w: Weakness) => (
            <div key={w.id} className={`flex items-center gap-2 p-2.5 rounded-xl border ${w.completed ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-red-50 border-red-200'}`}>
              <span>{w.completed ? '✅' : '⚠️'}</span>
              <p className={`text-xs font-bold flex-1 ${w.completed ? 'line-through text-gray-500' : 'text-red-900'}`}>{w.name}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newChallenge} onChange={e => setNewChallenge(e.target.value)} placeholder="Add challenge to work on..." className="flex-1 p-2.5 bg-white border-2 border-red-200 rounded-xl font-bold text-xs outline-none" onKeyDown={e => e.key === 'Enter' && addChallenge()} />
          <button onClick={addChallenge} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl text-xs cursor-pointer">+ Add</button>
        </div>
      </div>

      {/* Ask Copilot */}
      <AskCopilot learner={learner} teacher={teacher} ts={ts} />
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   TAB: VOICES & DIALOGUE
   ════════════════════════════════════════════════════════════════════════════ */
const MOOD_EMOJIS = ['😊', '🤩', '😎', '🤓', '😴', '💪', '🌟', '🔥', '🎯', '🏆', '🦸', '🧚', '🐉', '🌈', '🪄'];

const VoiceTab: React.FC<{ learner: Learner; onUpdate: (u: Partial<Learner>) => void; ts: any; voices: SpeechSynthesisVoice[]; avatarRank: any; petRank: any; teacher: TeacherProfile }> = ({ learner, onUpdate, ts, voices, avatarRank, petRank, teacher }) => {
  const [customMoodEmoji, setCustomMoodEmoji] = useState(learner.talkingMood?.emoji || '😊');
  const [moodText, setMoodText] = useState(learner.talkingMood?.text || "Let's learn today!");
  const [dialogueInput, setDialogueInput] = useState('');
  const dialogues = learner.talkingMood?.dialogues || [];

  const [avatarVoice, setAvatarVoice]   = useState(learner.avatarVoice || '');
  const [petVoice, setPetVoice]         = useState(learner.petVoice || '');
  const [teacherVoice, setTeacherVoice] = useState(learner.teacherVoice || '');
  const [moodVoice, setMoodVoice]       = useState(learner.talkingMood?.voiceName || '');

  const [dialogue, setDialogue] = useState(learner.dialogueText || "Ready for our lesson!");

  const saveMood = () => {
    // Update talking mood AND sync with main mood status
    const newMood = { emoji: customMoodEmoji, text: moodText, dialogues, voiceName: moodVoice };
    onUpdate({ 
      talkingMood: newMood, 
      avatarVoice, 
      petVoice, 
      teacherVoice, 
      dialogueText: dialogue,
      // Sync mood based on emoji
      mood: customMoodEmoji === '😊' || customMoodEmoji === '🤩' ? 'happy' :
            customMoodEmoji === '🤓' ? 'focused' :
            customMoodEmoji === '😴' ? 'tired' :
            customMoodEmoji === '🤢' ? 'sick' : 'excited'
    });
  };
  const addDialogue = () => {
    if (dialogueInput.trim()) {
      onUpdate({ talkingMood: { ...(learner.talkingMood || { emoji: '😊', text: '', dialogues: [], voiceName: '' }), dialogues: [...dialogues, dialogueInput] } });
      setDialogueInput('');
    }
  };
  const removeDialogue = (i: number) => onUpdate({ talkingMood: { ...(learner.talkingMood || { emoji: '😊', text: '', dialogues: [], voiceName: '' }), dialogues: dialogues.filter((_: any, idx: number) => idx !== i) } });

  return (
    <div className="space-y-5">
      {/* Talking Mood Setup */}
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-white/60 shadow-xl`}>
        <h3 className="text-xl font-black text-indigo-950 mb-4 flex items-center gap-2"><Volume2 className="w-5 h-5 text-purple-500" /> Talking Mood Avatar Setup</h3>
        <p className="text-xs text-gray-500 font-bold mb-4">The mood emoji is clickable/hoverable on the profile. Click it → browser reads a random dialogue!</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-500 mb-2 uppercase">Pick Mood Emoji</label>
              <div className="flex flex-wrap gap-1 p-2 bg-white rounded-xl border-2 border-indigo-200">
                {MOOD_EMOJIS.map(em => (
                  <button key={em} onClick={() => setCustomMoodEmoji(em)} className={`w-9 h-9 text-2xl rounded-lg cursor-pointer ${customMoodEmoji === em ? 'bg-purple-200 ring-2 ring-purple-500' : 'hover:bg-purple-50'}`}>{em}</button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input value={customMoodEmoji} onChange={e => setCustomMoodEmoji(e.target.value)} maxLength={4} className="w-20 p-2 text-center text-2xl bg-white border-2 border-indigo-200 rounded-xl outline-none" placeholder="😊" />
                <input value={moodText} onChange={e => setMoodText(e.target.value)} placeholder="Mood caption text..." className="flex-1 p-2 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 mb-2 uppercase">Dialogue Cards (random on click)</label>
              <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar mb-2">
                {dialogues.map((d: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-purple-50 rounded-xl border border-purple-200">
                    <span className="text-lg">{customMoodEmoji}</span>
                    <p className="flex-1 text-xs font-bold text-purple-900">{d}</p>
                    <button onClick={() => removeDialogue(i)} className="text-gray-400 hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={dialogueInput} onChange={e => setDialogueInput(e.target.value)} placeholder="Add dialogue phrase..." className="flex-1 p-2 bg-white border-2 border-purple-200 rounded-xl font-bold text-xs outline-none" onKeyDown={e => e.key === 'Enter' && addDialogue()} />
                <button onClick={addDialogue} className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white font-black rounded-xl text-xs cursor-pointer">+ Add</button>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl p-5 border-4 border-purple-200 flex flex-col items-center justify-center text-center space-y-3">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-7xl cursor-pointer" onClick={() => speak(dialogues[0] || moodText, moodVoice)}>
              {customMoodEmoji}
            </motion.div>
            <p className="text-sm font-black text-purple-900 italic">"{moodText}"</p>
            <p className="text-xs text-gray-500 font-bold">Click emoji to hear it!</p>
            <div className="bg-white/60 rounded-xl p-3 text-left w-full">
              <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Random Dialogues:</p>
              {dialogues.slice(0, 3).map((d: string, i: number) => <p key={i} className="text-xs text-purple-800 font-bold">• {d}</p>)}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Selectors per character */}
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-white/60 shadow-xl`}>
        <h3 className="text-lg font-black text-indigo-950 mb-4">🎙️ Individual Voice Assignments</h3>
        <p className="text-xs text-gray-500 font-bold mb-4">Assign unique natural voices to each character. Microsoft Edge offers the best neural voices!</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: `${avatarRank.emoji} Avatar Voice (${avatarRank.form})`, val: avatarVoice, set: setAvatarVoice, test: `Hi! I'm ${learner.name}, the ${avatarRank.form}!` },
            { label: `${petRank.emoji} Pet Voice (${petRank.form})`, val: petVoice, set: setPetVoice, test: `Roar! I am the mighty ${petRank.form}!` },
            { label: `${teacher.characterEmoji} Teacher Voice (${teacher.characterName})`, val: teacherVoice, set: setTeacherVoice, test: teacher.greeting },
            { label: `${customMoodEmoji} Mood Emoji Voice`, val: moodVoice, set: setMoodVoice, test: moodText },
          ].map(v => (
            <div key={v.label} className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
              <label className="block text-xs font-black text-indigo-950 mb-2">{v.label}</label>
              <select value={v.val} onChange={e => v.set(e.target.value)} className="w-full p-2 bg-white border-2 border-indigo-200 rounded-xl font-bold text-xs cursor-pointer outline-none mb-2">
                <option value="">Default Voice</option>
                <GroupedVoiceOptions voices={voices} valueKey="name" />
              </select>
              <button onClick={() => speak(v.test, v.val)} className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1">
                <Volume2 className="w-3 h-3" /> Test Voice
              </button>
            </div>
          ))}
        </div>

        {/* Learner dialogue */}
        <div className="mt-4">
          <label className="block text-xs font-black text-gray-500 mb-2 uppercase">📖 Learner Profile Dialogue (used in class read-aloud)</label>
          <textarea value={dialogue} onChange={e => setDialogue(e.target.value)} rows={3} className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none resize-none" />
          <div className="flex gap-2 mt-2">
            <button onClick={() => speak(dialogue, avatarVoice)} className={`flex-1 py-2.5 bg-gradient-to-r ${ts.btn} text-white font-black rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1`}>
              <Volume2 className="w-4 h-4" /> Read Aloud Now
            </button>
          </div>
        </div>

        <button onClick={saveMood} className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-black rounded-2xl shadow-lg cursor-pointer">💾 Save All Voice Settings</button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   TAB: ADMIN
   ════════════════════════════════════════════════════════════════════════════ */
/* ─── Ask Copilot Component ─── */
const AskCopilot: React.FC<{ learner: Learner; teacher: TeacherProfile; ts: any }> = ({ learner, teacher, ts }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ q: string; a: string }>>([]);

  const askCopilot = async () => {
    if (!question.trim()) return;
    setLoading(true);
    
    // Generate contextual response
    let response = '';
    const q = question.toLowerCase();
    
    if (q.includes('lesson') || q.includes('plan')) {
      response = `📚 Based on ${learner.name}'s profile, I recommend:\n\n1. **Focus Area**: ${Object.entries(learner.skills).sort((a, b) => a[1] - b[1])[0][0]} (lowest at ${Object.entries(learner.skills).sort((a, b) => a[1] - b[1])[0][1]}%)\n2. **Activity**: Interactive ${learner.learningStyle || 'Visual'} exercise with ${learner.interests?.[0] || 'dragons'} theme\n3. **Duration**: ${learner.age && learner.age < 8 ? '30' : '45'} minutes (age-appropriate)\n4. **Reward**: +${Math.floor(learner.xp * 0.1)} XP for completion\n\nWould you like me to generate a full lesson plan in Magic Scroll?`;
    } else if (q.includes('homework') || q.includes('hw')) {
      response = `🏠 Homework suggestions for ${learner.name}:\n\n1. **${learner.interests?.[0] || 'Adventure'} Vocabulary**: Write 5 sentences using new words\n2. **Practice Weakness**: Focus on ${(learner.weaknesses || [])[0]?.name || 'grammar'} - 10 min daily\n3. **Creative Task**: Draw a comic using ${learner.targetLang || 'English'} speech bubbles\n\nPet XP Reward: +30 XP for each completed task!`;
    } else if (q.includes('progress') || q.includes('how')) {
      const nextRank = Math.floor(learner.xp / 100) + 2;
      const xpNeeded = nextRank * 100 - learner.xp;
      response = `📊 ${learner.name}'s Progress Report:\n\n✅ **Current Level**: ${Math.floor(learner.xp / 100) + 1}\n⚡ **Total XP**: ${learner.xp}\n🔥 **Streak**: ${learner.streak} days (amazing!)\n🎯 **Next Level**: ${xpNeeded} XP needed for Level ${nextRank}\n\n💪 **Top Skill**: ${Object.entries(learner.skills).sort((a, b) => b[1] - a[1])[0][0]} (${Object.entries(learner.skills).sort((a, b) => b[1] - a[1])[0][1]}%)\n⚠️ **Needs Work**: ${Object.entries(learner.skills).sort((a, b) => a[1] - b[1])[0][0]} (${Object.entries(learner.skills).sort((a, b) => a[1] - b[1])[0][1]}%)\n\nKeep up the great work! 🌟`;
    } else {
      response = `🤖 ${teacher.characterName} here!\n\n${learner.name} is doing ${learner.streak > 5 ? 'fantastic' : 'well'} with a ${learner.streak}-day streak!\n\nGiven their ${learner.avatarArchetype} personality and love for ${learner.interests?.join(', ') || 'learning'}, I suggest:\n\n• Focus on strengths in ${Object.entries(learner.skills).filter(([, v]) => v > 70).map(([k]) => k).join(', ') || 'all areas'}\n• Practice ${Object.entries(learner.skills).filter(([, v]) => v < 50).map(([k]) => k)[0] || 'basics'} with gamified exercises\n• Consider a ${learner.petType} evolution boost via homework!\n\nAsk me about: lessons, homework, progress, or strategies!`;
    }
    
    await new Promise(r => setTimeout(r, 800));
    setAnswer(response);
    setHistory(prev => [...prev, { q: question, a: response }]);
    setLoading(false);
  };

  return (
    <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-purple-100 shadow-xl`}>
      <h3 className="text-lg font-black text-indigo-950 mb-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-500" /> Ask Copilot
      </h3>
      <p className="text-xs text-gray-500 font-bold mb-3">AI assistant for learner insights, lesson ideas, and progress analysis!</p>
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <input 
            value={question} 
            onChange={e => setQuestion(e.target.value)} 
            placeholder="Ask anything about this learner..."
            className="flex-1 p-3 bg-white border-2 border-purple-200 rounded-xl font-bold text-sm outline-none"
            onKeyDown={e => e.key === 'Enter' && askCopilot()}
          />
          <button 
            onClick={askCopilot}
            disabled={loading}
            className={`px-4 py-2 bg-gradient-to-r ${ts.btn} text-white font-black rounded-xl text-sm cursor-pointer disabled:opacity-50 flex items-center gap-1`}
          >
            {loading ? 'Thinking...' : <><Sparkles className="w-4 h-4" /> Ask</>}
          </button>
        </div>
        
        {answer && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-2xl border-2 border-purple-200"
          >
            <p className="text-sm font-bold text-indigo-900 whitespace-pre-line">{answer}</p>
          </motion.div>
        )}
        
        {history.length > 1 && (
          <div className="mt-4 pt-4 border-t border-purple-100">
            <p className="text-xs font-black text-gray-400 mb-2">Previous Questions</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {history.slice(0, -1).reverse().map((h, i) => (
                <div key={i} className="p-2 bg-white/50 rounded-lg text-xs">
                  <p className="font-bold text-purple-700">Q: {h.q}</p>
                  <p className="text-gray-600 truncate">A: {h.a.replace(/\n/g, ' ').substring(0, 60)}...</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 pt-2">
          {['Suggest a lesson plan', 'What homework to assign?', 'How is their progress?', 'Help with weak skills'].map(suggestion => (
            <button 
              key={suggestion}
              onClick={() => { setQuestion(suggestion); }}
              className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold rounded-full text-xs cursor-pointer transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Learner Calendar Tab ─── */
const LearnerCalendarTab: React.FC<{ learner: Learner; onUpdate: (u: Partial<Learner>) => void; ts: any }> = ({ learner, onUpdate, ts }) => {
  const [newTerm, setNewTerm] = useState({
    name: 'New English Term',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    targetClasses: 24,
    notes: '',
  });
  const [showTermForm, setShowTermForm] = useState(false);

  const learnerEvents = useMemo(() => {
    const events: any[] = [];
    (learner.calendarEvents || []).forEach((e: any) => events.push({ ...e, learnerId: learner.id, learnerName: learner.name, color: e.type === 'class' ? 'bg-blue-500' : 'bg-purple-500' }));
    (learner.homework || []).forEach((h: any) => events.push({ id: `hw-${h.id}`, title: `HW Due: ${h.title}`, type: 'homework', date: h.dueDate, learnerId: learner.id, learnerName: learner.name, color: 'bg-amber-500', xpReward: h.xpReward }));
    if (learner.birthday) {
      const bd = new Date(learner.birthday);
      const year = new Date().getFullYear();
      events.push({ id: `bd-${learner.id}`, title: `${learner.name}'s Birthday`, type: 'birthday', date: `${year}-${String(bd.getMonth()+1).padStart(2,'0')}-${String(bd.getDate()).padStart(2,'0')}`, learnerId: learner.id, learnerName: learner.name, color: 'bg-pink-500' });
    }
    return events;
  }, [learner]);

  const smartGoals = useMemo(() => [
    { goal: 'Class attendance', target: Number(learner.sessionFrequency?.replace(/\D/g, '') || 2) * 4, current: Math.min(learner.totalSessions, Number(learner.sessionFrequency?.replace(/\D/g, '') || 2) * 4), unit: 'classes/mo' },
    { goal: 'Homework completion', target: Math.max(1, (learner.homework || []).length), current: (learner.homework || []).filter((h: any) => h.completed).length, unit: 'tasks' },
    { goal: 'XP growth', target: 500, current: learner.xp % 500, unit: 'XP' },
  ], [learner]);

  const updateEvents = (events: any[]) => {
    const own = events
      .filter(e => e.learnerId === learner.id && !String(e.id).startsWith('hw-') && !String(e.id).startsWith('bd-'))
      .map(e => ({ id: e.id, title: e.title, type: e.type, date: e.date, recurring: e.recurring }));
    onUpdate({ calendarEvents: own });
  };

  const addTerm = () => {
    onUpdate({ terms: [...(learner.terms || []), { id: `term-${Date.now()}`, ...newTerm, completedClasses: 0, cancelledClasses: 0 }] });
    setShowTermForm(false);
  };

  return (
    <div className="space-y-5">
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-white/60 shadow-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-2xl font-black text-indigo-950">📅 Learner Calendar & Term Plan</h3>
            <p className="text-xs font-bold text-gray-500">Track SMART goals, schedules, cancelled classes, expected finish date, and term progress.</p>
          </div>
          <button onClick={() => setShowTermForm(!showTermForm)} className={`px-4 py-2 bg-gradient-to-r ${ts.btn} text-white font-black rounded-xl text-xs cursor-pointer flex items-center gap-1`}><Plus className="w-4 h-4" /> New Term</button>
        </div>
        {showTermForm && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-200">
            <input value={newTerm.name} onChange={(e) => setNewTerm({...newTerm, name: e.target.value})} className="p-2 bg-white rounded-xl border font-bold" />
            <input type="number" value={newTerm.targetClasses} onChange={(e) => setNewTerm({...newTerm, targetClasses: Number(e.target.value)})} className="p-2 bg-white rounded-xl border font-bold" />
            <input type="date" value={newTerm.startDate} onChange={(e) => setNewTerm({...newTerm, startDate: e.target.value})} className="p-2 bg-white rounded-xl border font-bold" />
            <input type="date" value={newTerm.endDate} onChange={(e) => setNewTerm({...newTerm, endDate: e.target.value})} className="p-2 bg-white rounded-xl border font-bold" />
            <input value={newTerm.notes} onChange={(e) => setNewTerm({...newTerm, notes: e.target.value})} placeholder="Term notes..." className="sm:col-span-2 p-2 bg-white rounded-xl border font-bold" />
            <button onClick={addTerm} className="sm:col-span-2 py-2 bg-emerald-500 text-white font-black rounded-xl cursor-pointer">Save Term</button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(learner.terms || []).map((term: any) => {
            const pct = Math.round((term.completedClasses / Math.max(1, term.targetClasses)) * 100);
            return (
              <div key={term.id} className="p-4 bg-white/70 rounded-2xl border-2 border-indigo-100">
                <p className="font-black text-indigo-950">📘 {term.name}</p>
                <p className="text-[10px] text-gray-500 font-bold">{term.startDate} → {term.endDate}</p>
                <div className="mt-2 bg-indigo-100 h-2 rounded-full overflow-hidden"><div className="bg-indigo-600 h-full" style={{ width: `${pct}%` }} /></div>
                <p className="text-xs font-bold text-indigo-700 mt-1">{term.completedClasses}/{term.targetClasses} classes • {term.cancelledClasses} cancelled</p>
              </div>
            );
          })}
        </div>
      </div>
      <Calendar events={learnerEvents} onEventsChange={updateEvents} learners={[{ id: learner.id, name: learner.name, birthday: learner.birthday }]} smartGoals={smartGoals} />
    </div>
  );
};

const AdminTab: React.FC<{ learner: Learner; onUpdate: (u: Partial<Learner>) => void; ts: any }> = ({ learner, onUpdate, ts }) => {
  return (
    <div className="space-y-5">
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 border-indigo-100 shadow-xl`}>
        <h3 className="text-xl font-black text-indigo-950 flex items-center gap-2 mb-4"><Shield className="w-5 h-5 text-red-500" /> 🛡️ Teacher Admin Controls</h3>
        <p className="text-xs text-gray-500 font-bold mb-4">Directly adjust any stat. Note: Attack/Defense only change through Shop purchases.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: '⚡ XP (Avatar)',    key: 'xp',           val: learner.xp,           step: 50,  color: 'indigo' },
            { label: '🐾 Pet XP',         key: 'petXp',        val: learner.petXp ?? 0,   step: 50,  color: 'emerald' },
            { label: '🪙 Coins',          key: 'coins',        val: learner.coins,        step: 20,  color: 'amber' },
            { label: '🔥 Streak (days)',   key: 'streak',       val: learner.streak,       step: 1,   color: 'orange' },
            { label: '🎮 Sessions',        key: 'totalSessions',val: learner.totalSessions,step: 1,   color: 'blue' },
            { label: '⏰ Minutes',         key: 'totalMinutes', val: learner.totalMinutes, step: 30,  color: 'teal' },
          ].map(s => (
            <div key={s.key} className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100">
              <p className="text-[10px] font-black text-gray-500 uppercase mb-1">{s.label}</p>
              <p className="text-2xl font-black text-indigo-950 mb-2">{s.val}</p>
              <div className="flex gap-1">
                <button onClick={() => onUpdate({ [s.key]: Math.max(0, s.val - s.step) } as any)}
                  className="flex-1 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-black text-red-700 cursor-pointer">−{s.step}</button>
                <button onClick={() => onUpdate({ [s.key]: s.val + s.step } as any)}
                  className="flex-1 py-1.5 bg-green-100 hover:bg-green-200 rounded-lg text-xs font-black text-green-700 cursor-pointer">+{s.step}</button>
              </div>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="mt-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
          <label className="block text-xs font-black text-gray-600 mb-2">Hero Status</label>
          <div className="flex gap-2">
            {(['active', 'graduated', 'inactive'] as const).map(s => (
              <button key={s} onClick={() => onUpdate({ status: s })}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${learner.status === s ? 'bg-emerald-500 text-white' : 'bg-white border border-emerald-200'}`}>
                {s === 'active' ? '✅' : s === 'graduated' ? '🎓' : '⏸️'} {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Kidsprofile;
