/* ════════════════════════════════════════════════════════════════════════════
   🏰 KIDS LEARNING KINGDOM — Premium 3D Adventure Dashboard
   Teacher's HQ with: roster cards (avatars/pets/stats), teacher profile,
   reward shop creator, full data import/export, Whiskers mascot, etc.
   ════════════════════════════════════════════════════════════════════════════ */

import React, {
  useState, useMemo, useEffect, useRef, createContext, useContext,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Settings, Compass, Volume2, VolumeX, Mail, User, Layers,
  BrainCircuit, Download, Upload, Store, Swords,
} from 'lucide-react';
import { CombatArena } from './CombatArena';
import { Calendar } from './Calendar';
import TierGatedOverlay from '../../components/ui/TierGatedOverlay';
import {
  Learner, ThemeType, LeaderboardPeriod, WorkspaceSettings, StoreItem, TeacherProfile,
  getAvatarEvolution, getPetEvolution, getRarityTier,
} from './types';
import { RewardShop } from './RewardShop';
import { KidsHardDiskSyncCard } from './components/KidsHardDiskSyncCard';

interface DashboardProps {
  learners: Learner[];
  setLearners: React.Dispatch<React.SetStateAction<Learner[]>>;
  storeItems: StoreItem[];
  setStoreItems: React.Dispatch<React.SetStateAction<StoreItem[]>>;
  teacher: TeacherProfile;
  setTeacher: React.Dispatch<React.SetStateAction<TeacherProfile>>;
  onSelectLearner: (l: Learner) => void;
  onOpenOnboarding: () => void;
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
  onBuyItem: (item: StoreItem) => void;
  onGoHome?: () => void;
  /** Fired after the kingdom is restored from the hard drive folder. */
  onKingdomRestored?: () => void;
}

const getLevel = (xp: number) => Math.max(1, Math.floor(xp / 100) + 1);

const THEME_STYLES: Record<ThemeType, { bg: string; panelBg: string; }> = {
  fairy:  { bg: 'from-pink-100 via-purple-100 to-indigo-200', panelBg: 'bg-white/70 backdrop-blur-xl border-pink-200/60' },
  space:  { bg: 'from-slate-900 via-indigo-950 to-slate-900', panelBg: 'bg-slate-900/80 backdrop-blur-xl border-indigo-500/30' },
  ocean:  { bg: 'from-cyan-200 via-blue-100 to-teal-100',     panelBg: 'bg-white/70 backdrop-blur-xl border-cyan-200/60' },
  jungle: { bg: 'from-green-200 via-emerald-100 to-lime-100', panelBg: 'bg-white/70 backdrop-blur-xl border-emerald-200/60' },
};

const THEME_PARTICLES: Record<ThemeType, string[]> = {
  fairy:  ['✨','🌟','💫','⭐','🦋','🌸','🌷','💖','🧚','🌈'],
  space:  ['⭐','🌟','💫','🚀','🪐','🌙','☄️','🛸','🔭','👾'],
  ocean:  ['🐠','🐟','🐙','🦀','🐚','🌊','🐬','🦈','🐳','🫧'],
  jungle: ['🌿','🦜','🐒','🦋','🌺','🍃','🐸','🌴','🦁','🌻'],
};

const ALERTS = [
  { id: 1, icon: '📢', title: 'New Challenge!',    desc: 'Pronunciation Sprint unlocked', color: 'bg-blue-50 border-blue-200' },
  { id: 2, icon: '🎂', title: "Luna's Level Up!",  desc: 'She reached Rank 4 Fairy Queen!', color: 'bg-pink-50 border-pink-200' },
  { id: 3, icon: '⚠️', title: 'Streak Risk',       desc: 'Sophie missed yesterday',         color: 'bg-amber-50 border-amber-200' },
];

/* ─── Sound Context ─── */
const SoundContext = createContext<{ play: (t: 'click'|'success'|'unlock'|'pop')=>void; muted: boolean; toggleMute: ()=>void; }>({
  play: () => {}, muted: false, toggleMute: () => {},
});
const useSound = () => useContext(SoundContext);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const ensureCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctxRef.current;
  };
  const tone = (f: number, d: number) => {
    if (muted) return;
    try {
      const ctx = ensureCtx(); if (!ctx) return;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + d);
    } catch {/**/}
  };
  const play = (t: 'click'|'success'|'unlock'|'pop') => {
    if (t === 'click') tone(600, 0.08);
    if (t === 'pop') tone(440, 0.1);
    if (t === 'success') { tone(523, 0.1); setTimeout(() => tone(659, 0.12), 100); }
    if (t === 'unlock') { tone(440, 0.1); setTimeout(() => tone(659, 0.1), 100); setTimeout(() => tone(880, 0.2), 200); }
  };
  return <SoundContext.Provider value={{ play, muted, toggleMute: () => setMuted(m => !m) }}>{children}</SoundContext.Provider>;
};

/* ─── Sparkle Background ─── */
const SparkleBackground: React.FC<{ theme: ThemeType }> = ({ theme }) => {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number; opacity: number; char: string; }>>([]);
  useEffect(() => {
    const emojis = THEME_PARTICLES[theme] || THEME_PARTICLES.fairy;
    setSparkles(Array.from({ length: 30 }, (_, i) => ({
      id: i, x: Math.random()*100, y: Math.random()*100,
      size: 14 + Math.random()*20, duration: 6+Math.random()*8,
      delay: Math.random()*5, opacity: 0.1 + Math.random()*0.3,
      char: emojis[Math.floor(Math.random()*emojis.length)],
    })));
  }, [theme]);
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {sparkles.map((s) => (
        <motion.div
          key={s.id} className="absolute"
          style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: `${s.size}px`, opacity: s.opacity }}
          animate={{ y: [0,-40,0], rotate: [0,180,360], scale: [1,1.2,0.8,1] }}
          transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
        >{s.char}</motion.div>
      ))}
    </div>
  );
};

/* ─── Animated Counter ─── */
const AnimatedCounter: React.FC<{ end: number; duration?: number }> = ({ end, duration = 1.5 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [start, setStart] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStart(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current); return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!start) return;
    let s: number;
    const step = (t: number) => {
      if (!s) s = t;
      const p = Math.min((t-s)/(duration*1000), 1);
      setCount(Math.round((1 - Math.pow(1-p, 3)) * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, end, duration]);
  return <span ref={ref}>{count}</span>;
};

/* ─── XP Toast ─── */
const XPToast: React.FC<{ message: string | null; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => { if (message) { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); } }, [message, onClose]);
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.8, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: -60, scale: 0.8, x: '-50%' }}
          className="fixed top-8 left-1/2 z-[100] bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white font-black px-8 py-4 rounded-full shadow-2xl border-4 border-white text-lg flex items-center gap-3"
        >
          <span className="text-2xl">✨🏆✨</span><span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Whiskers Mascot for Dashboard ─── */
const WhiskersBubble: React.FC<{ teacher: TeacherProfile; speech: string }> = ({ teacher, speech }) => (
  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-6 p-6 rounded-[2.5rem] bg-white/70 backdrop-blur-xl border-4 border-indigo-200 shadow-xl">
    <motion.div animate={{ rotate: [0,-5,5,-5,0] }} transition={{ repeat: Infinity, duration: 4 }}
      className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-6xl shadow-xl shrink-0 border-4 border-white">
      🐱
    </motion.div>
    <div className="space-y-1 flex-1">
      <h4 className="font-black text-indigo-950 text-lg flex items-center gap-2">
        Whiskers the Wise 🐾
        <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">ACADEMY MASCOT</span>
      </h4>
      <p className="text-sm font-black text-gray-700 leading-snug">"{speech}"</p>
      <p className="text-[10px] font-bold text-gray-400 mt-1">Curated by {teacher.characterName} {teacher.characterEmoji}</p>
    </div>
  </motion.div>
);

/* ════════════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ════════════════════════════════════════════════════════════════════════════ */
export const Dashboard: React.FC<DashboardProps> = ({
  learners, setLearners, storeItems, setStoreItems, teacher, setTeacher,
  onSelectLearner, onOpenOnboarding, theme, setTheme, onBuyItem, onGoHome,
  onKingdomRestored,
}) => {
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showTeacherProfile, setShowTeacherProfile] = useState(false);
  const [activeSection, setActiveSection] = useState<'roster' | 'shop'>('roster');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [filterCountry, setFilterCountry] = useState<string>('All');
  const [filterLevel] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'xp'|'recent'|'name'>('xp');
  const [leaderPeriod, setLeaderPeriod] = useState<LeaderboardPeriod>('all-time');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { play, muted, toggleMute } = useSound();

  const [settings, setSettings] = useState<WorkspaceSettings>({
    aiProvider: 'OpenAI', apiKey: '', aiModel: 'GPT-4o-Mini',
    tutorName: teacher.characterName, tutorInterests: teacher.interests,
    teachingStyle: teacher.teachingStyle, tutorBio: teacher.bio,
    aiPersonalization: true, appName: 'Kingdom Academy',
    webAddress: 'kingdom-academy.school', baseLearnerInflater: 15,
    customLogo: '👑', sendgridKey: '',
    senderEmail: 'spells@kingdom-academy.school',
    emailTemplate: 'Hello Hero! Ready for your daily spell quest?',
  });

  const totalXP = useMemo(() => learners.reduce((s, l) => s + l.xp, 0), [learners]);
  const activeStreak = useMemo(() => Math.max(...learners.map(l => l.streak), 0), [learners]);

  const filteredLearners = useMemo(() => {
    let list = [...learners];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.favoriteSubject.toLowerCase().includes(q) ||
        l.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (filterCountry !== 'All') list = list.filter(l => l.country === filterCountry);
    if (filterLevel !== 'All') list = list.filter(l => getLevel(l.xp).toString() === filterLevel);
    if (filterStatus !== 'All') list = list.filter(l => l.status === filterStatus);
    if (sortBy === 'xp') list.sort((a,b) => b.xp - a.xp);
    else if (sortBy === 'name') list.sort((a,b) => a.name.localeCompare(b.name));
    else if (sortBy === 'recent') list.sort((a,b) => b.joinDate.localeCompare(a.joinDate));
    return list;
  }, [learners, search, filterCountry, filterLevel, filterStatus, sortBy]);

  const triggerBulkSpell = (campaignType: string) => {
    if (selectedIds.length === 0) { showNotice('❌ No heroes selected!'); return; }
    showNotice(`✨ Cast [${campaignType}] on ${selectedIds.length} Heroes!`);
    setSelectedIds([]);
  };
  const deleteBulk = () => {
    if (selectedIds.length === 0) return;
    setLearners(prev => prev.filter(l => !selectedIds.includes(l.id)));
    setSelectedIds([]);
    showNotice('🧹 Heroes returned to academy dorms.');
  };
  const showNotice = (msg: string) => { play('unlock'); setToastMessage(msg); };

  /* ─── FULL Export / Import — EVERYTHING is included ─── */
  const exportAllData = () => {
    // Gather combat arena storybook from localStorage
    let combatHistory: any[] = [];
    try {
      const raw = localStorage.getItem('combat_arena_storybook_v1');
      if (raw) combatHistory = JSON.parse(raw);
    } catch { /* ignore */ }

    const fullExport = {
      _format: 'KidsLearningKingdom_FullBackup',
      _version: 2,
      exportedAt: new Date().toISOString(),

      // ── Core data (nothing stripped, every field preserved) ──
      teacher,
      theme,
      settings,
      storeItems,
      learners, // Full learner objects — no stripping of empty arrays

      // ── Combat Arena history ──
      combatArenaHistory: combatHistory,
    };

    const blob = new Blob([JSON.stringify(fullExport)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KingdomAcademy_FULL_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('📥 Full kingdom backup exported! (learners, store, teacher, settings, combat history)');
  };

  const importAllData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      reader.readAsText(e.target.files[0], 'UTF-8');
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);

          // ── Restore learners (ensure all arrays exist with defaults) ──
          if (parsed.learners) {
            const restored = parsed.learners.map((l: any) => ({
              // Ensure every array/field has a safe default so the app never crashes
              badges: [],
              skills: { pronunciation: 20, grammar: 20, vocabulary: 20, listening: 20, speaking: 20, reading: 20, writing: 20 },
              weaknesses: [],
              interests: [],
              coursePlan: [],
              landItems: [],
              purchasedRewards: [],
              homework: [],
              sessionLogs: [],
              feedbackLog: [],
              calendarEvents: [],
              questMaps: [],
              terms: [],
              tags: [],
              petXp: 0,
              attack: 10,
              defense: 10,
              streak: 0,
              coins: 0,
              xp: 0,
              totalSessions: 0,
              totalMinutes: 0,
              dialogueText: '',
              ...l, // Overlay with actual saved data (overrides defaults)
            }));
            setLearners(restored);
          }

          if (parsed.storeItems) setStoreItems(parsed.storeItems);
          if (parsed.teacher) setTeacher({ ...teacher, ...parsed.teacher });
          if (parsed.theme) setTheme(parsed.theme);
          if (parsed.settings) setSettings({ ...settings, ...parsed.settings });

          // ── Restore combat arena history ──
          if (parsed.combatArenaHistory) {
            try {
              localStorage.setItem('combat_arena_storybook_v1', JSON.stringify(parsed.combatArenaHistory));
            } catch { /* ignore */ }
          }

          showNotice('📤 Full kingdom restored! (learners, store, teacher, settings, combat history)');
        } catch {
          showNotice('❌ Corrupted scroll! Could not parse JSON.');
        }
      };
    }
    e.target.value = '';
  };

  const activeStyle = THEME_STYLES[theme];

  return (
    <div className={`min-h-screen relative overflow-x-hidden bg-gradient-to-b ${activeStyle.bg} font-kids pb-24 transition-all duration-700`}>
      <div className="theme-space-overrides flex flex-col min-h-screen">
        {theme === 'space' && (
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
        <SparkleBackground theme={theme} />
        <XPToast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* ── TOP NAV ── */}
      <motion.nav initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="relative z-30 container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-[2.5rem] bg-white/60 backdrop-blur-xl border-4 border-indigo-200 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="text-4xl animate-bounce-gentle">🏆</span>
            <div>
              <h1 className="text-2xl font-black text-indigo-950 flex items-center gap-2">
                Hero Academy
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Adventure HQ</span>
              </h1>
              <p className="text-xs text-gray-500 font-bold">{settings.webAddress} • {teacher.characterName}'s Classroom</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 bg-indigo-50/50 p-2 rounded-2xl border border-indigo-100">
            <div className="text-center px-3 border-r border-indigo-100"><p className="text-[10px] uppercase font-black text-gray-500">Global XP</p><p className="text-sm font-black text-indigo-700">{totalXP}</p></div>
            <div className="text-center px-3 border-r border-indigo-100"><p className="text-[10px] uppercase font-black text-gray-500">Max Streak</p><p className="text-sm font-black text-pink-600">{activeStreak}🔥</p></div>
            <div className="text-center px-3"><p className="text-[10px] uppercase font-black text-gray-500">Heroes</p><p className="text-sm font-black text-emerald-600">{learners.length}</p></div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeType)}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl border border-indigo-200 text-xs font-black cursor-pointer outline-none">
              <option value="fairy">🧚 Fairy</option><option value="space">🚀 Space</option>
              <option value="ocean">🌊 Ocean</option><option value="jungle">🌿 Jungle</option>
            </select>

            <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }} onClick={toggleMute}
              className="p-3 bg-indigo-50 hover:bg-indigo-100 rounded-full border border-indigo-200 cursor-pointer">
              {muted ? <VolumeX className="w-5 h-5 text-gray-400" /> : <Volume2 className="w-5 h-5 text-indigo-600" />}
            </motion.button>

            <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
              onClick={() => { play('click'); onOpenOnboarding(); }}
              className="px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black rounded-2xl shadow-[0_6px_0_#9d174d] hover:translate-y-[2px] hover:shadow-[0_4px_0_#9d174d] transition-all flex items-center gap-2 text-sm cursor-pointer">
              ✨ Summon Hero
            </motion.button>

            <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
              onClick={() => { play('click'); setShowTeacherProfile(!showTeacherProfile); }}
              className="p-3 bg-purple-50 hover:bg-purple-100 rounded-full border border-purple-200 cursor-pointer text-2xl"
              title="Teacher Profile">
              {teacher.characterEmoji}
            </motion.button>

            <motion.button whileHover={{ scale:1.1, rotate:30 }} whileTap={{ scale:0.9 }}
              onClick={() => { play('click'); setShowSettings(!showSettings); }}
              className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full border border-indigo-200 cursor-pointer">
              <Settings className="w-5 h-5" />
            </motion.button>

            {onGoHome && (
              <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                onClick={() => { play('click'); onGoHome(); }}
                className="px-5 py-3 bg-gray-100 text-gray-700 font-black rounded-2xl border border-gray-300 shadow hover:bg-gray-200 transition-all flex items-center gap-2 text-sm cursor-pointer ml-2">
                🏠 Back to Main
              </motion.button>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ── TEACHER PROFILE PANEL ── */}
      <AnimatePresence>
        {showTeacherProfile && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            className="relative z-30 container mx-auto px-4 mb-6">
            <TeacherProfileEditor teacher={teacher} setTeacher={setTeacher} onClose={() => setShowTeacherProfile(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SETTINGS PANEL (Import/Export Lives Here Too) ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            className="relative z-30 container mx-auto px-4 mb-6">
            <div className="bg-white/80 backdrop-blur-xl border-4 border-indigo-200 rounded-[2rem] p-6 shadow-2xl relative">
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">✕ Close</button>
              </div>
              <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-3 mb-6">⚙️ Master Spell & Admin Room</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* AI */}
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <h3 className="font-extrabold text-indigo-950 text-sm mb-3 flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-purple-500" /> AI Engine</h3>
                  <div className="space-y-3 text-xs">
                    <select value={settings.aiProvider} onChange={(e) => setSettings({...settings, aiProvider: e.target.value as any})} className="w-full p-2 bg-white rounded-lg border border-indigo-200 outline-none">
                      <option>OpenAI</option><option>Claude</option><option>Gemini</option>
                    </select>
                    <input type="password" placeholder="API Key" value={settings.apiKey} onChange={(e) => setSettings({...settings, apiKey: e.target.value})} className="w-full p-2 bg-white rounded-lg border border-indigo-200 outline-none" />
                    <select value={settings.aiModel} onChange={(e) => setSettings({...settings, aiModel: e.target.value})} className="w-full p-2 bg-white rounded-lg border border-indigo-200 outline-none">
                      <option>GPT-4o-Mini</option><option>GPT-4o</option><option>Claude-3.5-Sonnet</option>
                    </select>
                  </div>
                </div>

                {/* White-label */}
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <h3 className="font-extrabold text-indigo-950 text-sm mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-emerald-500" /> Academy Customization</h3>
                  <div className="space-y-3 text-xs">
                    <input value={settings.appName} onChange={(e) => setSettings({...settings, appName: e.target.value})} placeholder="Academy Name" className="w-full p-2 bg-white rounded-lg border border-indigo-200 outline-none" />
                    <input value={settings.webAddress} onChange={(e) => setSettings({...settings, webAddress: e.target.value})} placeholder="Web Address" className="w-full p-2 bg-white rounded-lg border border-indigo-200 outline-none" />
                  </div>
                </div>

                {/* Backups */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200">
                  <h3 className="font-extrabold text-indigo-950 text-sm mb-3 flex items-center gap-2"><Mail className="w-4 h-4 text-amber-500" /> 💾 Full Data Backups</h3>
                  <p className="text-[11px] text-gray-600 font-bold mb-3">Exports EVERYTHING: all learners (with homework, sessions, quests, skills, weaknesses, badges, kingdom, calendar, terms, voices, quest maps), store inventory, teacher profile, settings, and combat arena history — into one JSON file.</p>
                  <div className="flex flex-col gap-2">
                    <button onClick={exportAllData} className="py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs shadow">
                      <Download className="w-4 h-4" /> Export ALL Data
                    </button>
                    <label className="py-2.5 bg-gradient-to-r from-emerald-500 to-green-700 hover:from-emerald-600 hover:to-green-800 text-white font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs shadow text-center">
                      <Upload className="w-4 h-4" /> Import / Restore Data
                      <input type="file" accept=".json" onChange={importAllData} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Back-up Suite — kids adaptation of the Adult Dashboard panel */}
                <KidsHardDiskSyncCard onRestored={onKingdomRestored} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="space-y-6">
          {/* Whiskers Mascot */}
          <WhiskersBubble teacher={teacher} speech={`Purrrr! 😺 Teachers — share your screens with the heroes! Today ${teacher.characterName} ${teacher.characterEmoji} is here to forge new treasures and check our heroes' progress!`} />

          {/* Stats */}
          <KidsStatsCards learners={learners} />

          {/* Section Switcher */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => setActiveSection('roster')}
              className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 cursor-pointer transition-all ${activeSection === 'roster' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xl scale-105' : 'bg-white/70 text-indigo-900 border-2 border-white/80'}`}>
              <Compass className="w-5 h-5" /> Hero Roster
            </button>
            <button onClick={() => setActiveSection('shop')}
              className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 cursor-pointer transition-all ${activeSection === 'shop' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xl scale-105' : 'bg-white/70 text-indigo-900 border-2 border-white/80'}`}>
              <Store className="w-5 h-5" /> Mystical Shop
            </button>
          </div>

          {activeSection === 'shop' ? (
            /* ── SHOP MANAGEMENT (Teacher Admin) ── */
            <RewardShop
              storeItems={storeItems}
              setStoreItems={setStoreItems}
              coins={9999}
              onPurchase={(item) => { onBuyItem(item); showNotice(`🛒 Purchased ${item.name} from inventory!`); }}
              teacher={teacher}
              teacherAdmin
              buyerMode={false}
            />
          ) : (
            <>
              {/* Filters */}
              <div className={`${activeStyle.panelBg} rounded-[2.5rem] p-6 shadow-2xl border-4 border-white/80`}>
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-6 border-b border-indigo-100/60">
                  <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2"><Search className="w-5 h-5" /> Filter Spells & Hero Search</h3>
                  <div className="flex flex-wrap gap-2">
                    {(['all-time','week','month'] as LeaderboardPeriod[]).map(period => (
                      <button key={period} onClick={() => { play('click'); setLeaderPeriod(period); }}
                        className={`px-3 py-1 rounded-full text-xs font-black capitalize border cursor-pointer ${leaderPeriod === period ? 'bg-indigo-600 text-white border-transparent shadow' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1">Country</label>
                    <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="w-full p-2.5 bg-white/80 border-2 border-indigo-100 rounded-xl font-bold text-xs outline-none cursor-pointer">
                      <option>All</option><option>Mexico</option><option>Spain</option><option>United States</option><option>Brazil</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1">Status</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full p-2.5 bg-white/80 border-2 border-indigo-100 rounded-xl font-bold text-xs outline-none cursor-pointer">
                      <option>All</option><option>active</option><option>graduated</option><option>inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1">Sort</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full p-2.5 bg-white/80 border-2 border-indigo-100 rounded-xl font-bold text-xs outline-none cursor-pointer">
                      <option value="xp">Most XP ⚡</option>
                      <option value="name">Name 🧑‍🎓</option>
                      <option value="recent">Recent ⏰</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1">Search</label>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search heroes..."
                      className="w-full p-2.5 bg-white/80 border-2 border-indigo-100 rounded-xl font-bold text-xs outline-none" />
                  </div>
                </div>
              </div>

              {/* 3D Roster + Sidebar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`${activeStyle.panelBg} rounded-[2.5rem] p-6 shadow-2xl border-4 border-white/80 col-span-2 space-y-4`}>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100/60">
                    <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2"><Compass className="w-5 h-5 animate-spin-slow text-pink-500" /> Active Roster Board</h3>
                    {selectedIds.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">Selected {selectedIds.length}</span>
                        <button onClick={() => triggerBulkSpell('Drip Campaign')} className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg text-xs font-black cursor-pointer">💌 Campaign</button>
                        <button onClick={deleteBulk} className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-black cursor-pointer">🗑️ Banish</button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredLearners.map((learner) => (
                      <HeroBattleCard
                        key={learner.id}
                        learner={learner}
                        selected={selectedIds.includes(learner.id)}
                        onToggle={() => {
                          play('click');
                          setSelectedIds(prev => prev.includes(learner.id) ? prev.filter(id => id !== learner.id) : [...prev, learner.id]);
                        }}
                        onClick={() => onSelectLearner(learner)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <KidsLeaderboard learners={learners} onSelect={onSelectLearner} />
                  <KidsTodoAlerts learners={learners} />
                </div>
              </div>

              {/* Attention Needed */}
              <AttentionNeeded learners={learners} onSelectLearner={onSelectLearner} />

              {/* All Homework Board + Calendar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AllHomeworkBoard learners={learners} onSelectLearner={onSelectLearner} />
                <DashboardCalendar learners={learners} />
              </div>

              {/* ⚔️ Combat Arena (VIP Exclusive) */}
              <div className="mt-8">
                <TierGatedOverlay
                  requiredTier="vip"
                  featureName="3D Combat Arena"
                  description="Real-time turn-based 3D battles, spellcasting challenges, boss raids, and storybook battle chronicles are exclusive to VIP Elite members."
                >
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Swords className="w-8 h-8 text-red-500" />
                    <h2 className="text-3xl font-black text-indigo-950">Combat Arena</h2>
                    <Swords className="w-8 h-8 text-purple-500" />
                  </div>
                  <CombatArena learners={learners} setLearners={setLearners} teacher={teacher} />
                </TierGatedOverlay>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════════════════ */

/* ─── All Homework Board (Dashboard) ─── */
const AllHomeworkBoard: React.FC<{ learners: Learner[]; onSelectLearner: (l: Learner) => void }> = ({ learners, onSelectLearner }) => {
  const allHw = useMemo(() => {
    const list: { learner: Learner; hw: any }[] = [];
    learners.forEach(l => (l.homework || []).filter((h: any) => !h.completed).forEach((hw: any) => list.push({ learner: l, hw })));
    list.sort((a, b) => new Date(a.hw.dueDate).getTime() - new Date(b.hw.dueDate).getTime());
    return list;
  }, [learners]);

  const isExpired = (dueDate: string) => new Date(dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-5 shadow-xl border-4 border-amber-100">
      <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2 mb-4">
        📚 Active Quests & Homework
        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{allHw.length} pending</span>
      </h3>
      {allHw.length === 0 && <p className="text-center text-gray-400 font-bold py-8">🎉 All homework done!</p>}
      <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
        {allHw.map(({ learner, hw }) => {
          const expired = isExpired(hw.dueDate);
          return (
            <div key={`${learner.id}-${hw.id}`} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${expired ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-100'}`}>
              <div className="text-2xl">{expired ? '⚠️' : '📌'}</div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-xs text-indigo-950 truncate">{hw.title}</p>
                <p className="text-[10px] text-gray-500 font-bold">{learner.name} • Due: {new Date(hw.dueDate).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <span className="text-[10px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">🐾{hw.xpReward}</span>
                <button onClick={() => onSelectLearner(learner)}
                  className="px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-lg text-[10px] cursor-pointer">Open →</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Dashboard Calendar (compact view) ─── */
const DashboardCalendar: React.FC<{ learners: Learner[] }> = ({ learners }) => {
  const [events, setEvents] = useState<any[]>(() => []);
  const calendarEvents = useMemo(() => {
    const generated: any[] = [];
    const y = new Date().getFullYear();
    learners.forEach(l => {
      if (l.birthday) {
        const bd = new Date(l.birthday);
        generated.push({ id: `bd-${l.id}`, title: `🎂 ${l.name}'s Birthday`, type: 'birthday', date: `${y}-${String(bd.getMonth()+1).padStart(2,'0')}-${String(bd.getDate()).padStart(2,'0')}`, learnerId: l.id, learnerName: l.name, color: 'bg-pink-500' });
      }
      (l.homework || []).filter((h: any) => !h.completed).forEach((h: any) => generated.push({ id: `hw-${l.id}-${h.id}`, title: `📚 ${l.name}: ${h.title}`, type: 'homework', date: h.dueDate, learnerId: l.id, learnerName: l.name, color: 'bg-amber-500', xpReward: h.xpReward }));
      (l.calendarEvents || []).forEach((ce: any) => generated.push({ ...ce, learnerId: l.id, learnerName: l.name, color: ce.type === 'class' ? 'bg-blue-500' : 'bg-purple-500' }));
    });
    return [...generated, ...events];
  }, [learners, events]);
  return (
    <Calendar
      events={calendarEvents}
      onEventsChange={setEvents}
      learners={learners.map(l => ({ id: l.id, name: l.name, birthday: l.birthday }))}
      smartGoals={[
        { goal: 'Weekly classes booked', target: learners.length * 2, current: calendarEvents.filter(e => e.type === 'class').length, unit: 'classes' },
        { goal: 'Homework due tracked', target: Math.max(1, learners.length), current: calendarEvents.filter(e => e.type === 'homework').length, unit: 'tasks' },
      ]}
    />
  );
};

/* ─── Hero Battle Card (3D, big avatar+pet+stats) ─── */
const HeroBattleCard: React.FC<{ learner: Learner; selected: boolean; onToggle: () => void; onClick: () => void }> = ({ learner, selected, onToggle, onClick }) => {
  const avatar = getAvatarEvolution(learner.gender, learner.avatarArchetype, learner.xp);
  const pet = getPetEvolution(learner.petType, learner.petXp ?? learner.xp);
  const avatarRarity = getRarityTier(avatar.rank);
  const petRarity = getRarityTier(pet.rank);

  const moodEmoji =
    learner.mood === 'sick' ? '🤢' :
    learner.mood === 'tired' ? '😴' :
    learner.mood === 'focused' ? '🤓' :
    learner.mood === 'excited' ? '🤩' : '😊';

  const isDark = learner.theme === 'space';

  return (
    <motion.div
      whileHover={{ scale: 1.04, rotateY: 5, rotateX: 3, y: -4 }}
      transition={{ type: 'spring', stiffness: 200 }}
      className={`relative p-5 rounded-[2.5rem] border-4 flex flex-col justify-between overflow-hidden shadow-2xl h-[410px] cursor-pointer bg-gradient-to-br transition-shadow duration-300 ${
        isDark ? 'from-slate-800 via-indigo-950 to-slate-900 border-indigo-500/30 text-white' :
        'from-indigo-50 via-purple-50 to-pink-50 border-white/80 text-indigo-950'
      }`}
      style={{
        transformStyle: 'preserve-3d',
        boxShadow: avatarRarity.boxGlow,
      }}
    >
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <input type="checkbox" checked={selected} onChange={(e) => { e.stopPropagation(); onToggle(); }}
          onClick={(e) => e.stopPropagation()}
          className="w-5 h-5 rounded border-gray-300 text-indigo-600 cursor-pointer" />
        <span className="text-xs bg-white/70 backdrop-blur-xs px-2 py-0.5 rounded-full font-black text-indigo-950 shadow-xs">
          {moodEmoji}
        </span>
      </div>

      <div className={`absolute top-3 right-3 z-20 ${avatarRarity.badgeBg} ${avatarRarity.badgeText} text-[10px] font-black px-2.5 py-1 rounded-full shadow-md`}>
        {avatarRarity.rarity.toUpperCase()} • R{avatar.rank}
      </div>

      <div onClick={onClick} className="flex-1 flex flex-col">
        {/* Avatar + Pet hero showcase */}
        <div className="flex items-center justify-around pt-7 pb-2">
          <div className="text-center flex flex-col items-center">
            <motion.div
              animate={{ y: [0,-4,0] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className={`text-7xl select-none relative inline-block p-1 rounded-2xl ${avatarRarity.dropGlow}`}
              style={{ filter: `drop-shadow(${avatarRarity.boxGlow})` }}
            >
              {avatar.emoji}
            </motion.div>
            <p className="text-[10px] font-black uppercase tracking-wider mt-1 opacity-80">{avatar.form}</p>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-0.5 ${avatarRarity.badgeBg} ${avatarRarity.badgeText}`}>
              {avatarRarity.rarity}
            </span>
          </div>

          <div className="text-2xl opacity-40">⚔️</div>

          <div className="text-center flex flex-col items-center">
            <motion.div
              animate={{ y: [0,-4,0] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
              className={`text-7xl select-none relative inline-block p-1 rounded-2xl ${petRarity.dropGlow}`}
              style={{ filter: `drop-shadow(${petRarity.boxGlow})` }}
            >
              {pet.emoji}
            </motion.div>
            <p className="text-[10px] font-black uppercase tracking-wider mt-1 opacity-80">{pet.form}</p>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-0.5 ${petRarity.badgeBg} ${petRarity.badgeText}`}>
              {petRarity.rarity}
            </span>
          </div>
        </div>

        {/* Name */}
        <div className="text-center my-1.5">
          <h4 className="font-black text-2xl drop-shadow">{learner.name}</h4>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Level {getLevel(learner.xp)} • {learner.country}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-1 mt-1 bg-black/20 p-2.5 rounded-2xl text-center">
          <div><p className="text-[9px] uppercase font-black opacity-70">⚔️ ATK</p><p className="text-base font-black">{learner.attack}</p></div>
          <div><p className="text-[9px] uppercase font-black opacity-70">🛡️ DEF</p><p className="text-base font-black">{learner.defense}</p></div>
          <div><p className="text-[9px] uppercase font-black opacity-70">⚡ XP</p><p className="text-base font-black">{learner.xp}</p></div>
          <div><p className="text-[9px] uppercase font-black opacity-70">🔥 STK</p><p className="text-base font-black">{learner.streak}</p></div>
        </div>

        <div className="mt-2 text-center">
          <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🪙 {learner.coins} coins</span>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Teacher Profile Editor ─── */
const TEACHER_EMOJIS = ['🧙‍♂️','🧙‍♀️','🦸‍♂️','🦸‍♀️','🧚‍♂️','🧚‍♀️','🧝‍♂️','🧝‍♀️','🧛‍♂️','🧛‍♀️','🧞‍♂️','🧞‍♀️','🦹‍♂️','🦹‍♀️','👨‍🏫','👩‍🏫','🐱','🐶','🦊','🦄','🐉'];

const TeacherProfileEditor: React.FC<{ teacher: TeacherProfile; setTeacher: React.Dispatch<React.SetStateAction<TeacherProfile>>; onClose: () => void }> = ({ teacher, setTeacher, onClose }) => {
  const [draft, setDraft] = useState(teacher);
  const save = () => { setTeacher(draft); onClose(); };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 backdrop-blur-xl border-4 border-purple-200 rounded-[2rem] p-6 shadow-2xl relative">
      <div className="absolute top-0 right-0 p-4">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">✕ Close</button>
      </div>
      <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-3 mb-6"><User className="w-6 h-6 text-purple-600" /> Teacher Character Profile</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Live Preview */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-[2rem] p-6 text-white text-center relative overflow-hidden shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-90">Live Preview</p>
          <motion.div animate={{ rotate: [0,-8,8,-8,0], scale: [1,1.05,1] }} transition={{ repeat: Infinity, duration: 4 }}
            className="text-9xl my-4 drop-shadow-2xl inline-block">{draft.characterEmoji}</motion.div>
          <h3 className="text-2xl font-black drop-shadow">{draft.characterName}</h3>
          <p className="text-xs font-black uppercase tracking-widest opacity-90 mt-1">{draft.storeOwnerTitle}</p>
          <div className="mt-4 bg-white/20 p-3 rounded-2xl text-left">
            <p className="text-xs font-bold italic">"{draft.greeting}"</p>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-indigo-950 mb-2 uppercase">Character Emoji</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white rounded-xl border-2 border-purple-200">
              {TEACHER_EMOJIS.map(em => (
                <button key={em} onClick={() => setDraft({...draft, characterEmoji: em})}
                  className={`w-10 h-10 text-2xl rounded-lg cursor-pointer transition-all ${draft.characterEmoji === em ? 'bg-purple-200 ring-2 ring-purple-500 scale-110' : 'hover:bg-purple-50'}`}>{em}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Character Name</label>
            <input value={draft.characterName} onChange={(e) => setDraft({...draft, characterName: e.target.value})}
              placeholder="e.g., Wizard Master Dan"
              className="w-full p-3 bg-white border-2 border-purple-200 rounded-xl font-black text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Storekeeper Title</label>
            <input value={draft.storeOwnerTitle} onChange={(e) => setDraft({...draft, storeOwnerTitle: e.target.value})}
              placeholder="e.g., Royal Storekeeper"
              className="w-full p-3 bg-white border-2 border-purple-200 rounded-xl font-bold text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Teaching Style</label>
            <input value={draft.teachingStyle} onChange={(e) => setDraft({...draft, teachingStyle: e.target.value})}
              className="w-full p-3 bg-white border-2 border-purple-200 rounded-xl font-bold text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Greeting (shown to students)</label>
            <textarea rows={2} value={draft.greeting} onChange={(e) => setDraft({...draft, greeting: e.target.value})}
              className="w-full p-3 bg-white border-2 border-purple-200 rounded-xl font-bold text-sm outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Bio</label>
            <textarea rows={2} value={draft.bio} onChange={(e) => setDraft({...draft, bio: e.target.value})}
              className="w-full p-3 bg-white border-2 border-purple-200 rounded-xl font-bold text-sm outline-none resize-none" />
          </div>
          <button onClick={save} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-black rounded-2xl shadow-xl cursor-pointer">💾 Save Teacher Profile</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Leaderboard ─── */
const KidsLeaderboard: React.FC<{ learners: Learner[]; onSelect: (l: Learner) => void }> = ({ learners, onSelect }) => {
  const sorted = useMemo(() => [...learners].sort((a, b) => b.xp - a.xp), [learners]);
  const medals = ['🥇','🥈','🥉'];
  const { play } = useSound();
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border-4 border-amber-100">
      <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3 mb-5"><span>🏆</span> Hall of Fame</h3>
      <div className="space-y-2">
        {sorted.map((l, i) => {
          const av = getAvatarEvolution(l.gender, l.avatarArchetype, l.xp);
          const rarity = getRarityTier(av.rank);
          return (
            <div key={l.id} onClick={() => { play('click'); onSelect(l); }}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all hover:translate-x-2 ${
                i === 0 ? 'bg-amber-50 border-amber-300' : i === 1 ? 'bg-slate-50 border-slate-300' : i === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white/60 border-indigo-100'
              }`}>
              <span className="text-2xl w-8 text-center">{medals[i] || `#${i + 1}`}</span>
              <div
                className={`w-11 h-11 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-2xl border-2 ${rarity.borderColor} ${rarity.dropGlow}`}
                style={{ filter: `drop-shadow(${rarity.boxGlow})` }}
              >
                {av.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-indigo-900 truncate">{l.name.split(' ')[0]}</p>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${rarity.badgeBg} ${rarity.badgeText}`}>
                    {rarity.rarity}
                  </span>
                </div>
                <p className="text-xs text-pink-600 font-bold">Lvl {getLevel(l.xp)} • {av.form}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-lg text-indigo-700">{l.xp} XP</p>
                <p className="text-xs text-gray-500">{l.streak}🔥</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Alerts ─── */
const KidsTodoAlerts: React.FC<{ learners: Learner[] }> = ({ learners }) => {
  const [todos, setTodos] = useState<{ id: string; text: string; due: string; done: boolean }[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const upcoming = useMemo(() => {
    const items: { icon: string; title: string; desc: string; date: string; color: string }[] = [];
    const now = new Date();
    learners.forEach(l => {
      (l.homework || []).filter((h: any) => !h.completed).forEach((h: any) => items.push({ icon: '📚', title: h.title, desc: `${l.name} homework due`, date: h.dueDate, color: 'bg-amber-50 border-amber-200' }));
      (l.calendarEvents || []).forEach((e: any) => items.push({ icon: e.type === 'class' ? '👨‍🏫' : '📅', title: e.title, desc: `${l.name} ${e.type}`, date: e.date, color: 'bg-blue-50 border-blue-200' }));
      if (l.birthday) {
        const bd = new Date(l.birthday); const y = now.getFullYear();
        const date = `${y}-${String(bd.getMonth()+1).padStart(2,'0')}-${String(bd.getDate()).padStart(2,'0')}`;
        items.push({ icon: '🎂', title: `${l.name}'s Birthday`, desc: 'Birthday reminder', date, color: 'bg-pink-50 border-pink-200' });
      }
    });
    return items.filter(i => new Date(i.date) >= now).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);
  }, [learners]);
  const remaining = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    const days = Math.max(0, Math.ceil(diff / 86400000));
    return days === 0 ? 'Today' : `${days}d left`;
  };
  const addTodo = () => { if (newTodo.trim()) { setTodos(prev => [{ id: `td-${Date.now()}`, text: newTodo, due: new Date(Date.now()+86400000).toISOString().split('T')[0], done: false }, ...prev]); setNewTodo(''); } };
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border-4 border-red-100">
      <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3 mb-5"><span>🔔</span> Magic Alerts</h3>
      <div className="space-y-3">
        {upcoming.map((a, i) => (
          <div key={i} className={`p-3 rounded-2xl border-2 ${a.color}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl">{a.icon}</span>
              <div className="flex-1"><p className="font-extrabold text-gray-800 text-sm">{a.title}</p><p className="text-xs text-gray-500">{a.desc}</p></div>
              <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-full text-indigo-700">{remaining(a.date)}</span>
            </div>
          </div>
        ))}
        {upcoming.length === 0 && ALERTS.map((a, i) => (
          <div key={i} className={`p-3 rounded-2xl border-2 ${a.color}`}><div className="flex items-start gap-3"><span className="text-xl">{a.icon}</span><div><p className="font-extrabold text-gray-800 text-sm">{a.title}</p><p className="text-xs text-gray-500">{a.desc}</p></div></div></div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-red-100">
        <p className="text-xs font-black text-indigo-900 mb-2">🧙 Teacher To-Do & Reminders</p>
        <div className="flex gap-2 mb-2">
          <input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTodo()} placeholder="Add reminder..." className="flex-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none" />
          <button onClick={addTodo} className="px-3 bg-indigo-600 text-white rounded-xl text-xs font-black cursor-pointer">+</button>
        </div>
        <div className="space-y-1 max-h-28 overflow-y-auto no-scrollbar">
          {todos.map(td => <button key={td.id} onClick={() => setTodos(prev => prev.map(t => t.id === td.id ? {...t, done: !t.done} : t))} className={`w-full text-left p-2 rounded-xl text-xs font-bold ${td.done ? 'bg-emerald-50 text-emerald-700 line-through' : 'bg-indigo-50 text-indigo-900'}`}>✅ {td.text}</button>)}
        </div>
      </div>
    </div>
  );
};

/* ─── Stats ─── */
const KidsStatsCards: React.FC<{ learners: Learner[] }> = ({ learners }) => {
  const totals = useMemo(() => ({
    learners: learners.length,
    xp: learners.reduce((s, l) => s + l.xp, 0),
    streak: Math.max(...learners.map(l => l.streak), 0),
    coins: learners.reduce((s, l) => s + l.coins, 0),
    sessions: learners.reduce((s, l) => s + l.totalSessions, 0),
    minutes: learners.reduce((s, l) => s + l.totalMinutes, 0),
  }), [learners]);
  const cards = [
    { label: 'Total Heroes', icon: '🦸', bg: 'from-violet-500 to-purple-600',  val: totals.learners },
    { label: 'Total XP',     icon: '⚡', bg: 'from-amber-400 to-orange-500',   val: totals.xp },
    { label: 'Best Streak',  icon: '🔥', bg: 'from-rose-500 to-pink-600',      val: totals.streak },
    { label: 'Coins Vault',  icon: '💰', bg: 'from-emerald-400 to-green-600',  val: totals.coins },
    { label: 'Sessions',     icon: '🎮', bg: 'from-sky-400 to-blue-600',       val: totals.sessions },
    { label: 'Minutes',      icon: '⏰', bg: 'from-fuchsia-400 to-pink-600',   val: totals.minutes },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
      {cards.map((c, i) => (
        <motion.div key={c.label} initial={{ opacity:0, y:30, scale:0.9 }} animate={{ opacity:1, y:0, scale:1 }} transition={{ delay: i*0.08, type:'spring', stiffness:200 }}
          whileHover={{ scale:1.06, rotate:-1, y:-4 }}
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${c.bg} p-4 md:p-5 shadow-xl text-white cursor-default group`}>
          <div className="absolute -right-3 -top-3 text-6xl opacity-25 group-hover:scale-110 transition-transform">{c.icon}</div>
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-90 relative z-10">{c.label}</p>
          <p className="text-xl md:text-2xl font-black mt-1 relative z-10"><AnimatedCounter end={c.val} /></p>
        </motion.div>
      ))}
    </div>
  );
};

/* Removed Weekly Magic and Active Challenges — replaced with AllHomeworkBoard and DashboardCalendar above */

/* ─── Attention Needed Section ─── */
const AttentionNeeded: React.FC<{ learners: Learner[]; onSelectLearner: (l: Learner) => void }> = ({ learners, onSelectLearner }) => {
  const atRisk = useMemo(() => {
    const today = new Date();
    return learners.filter(l => {
      // No class in 7+ days
      const lastSession = l.sessionLogs?.length ? new Date(l.sessionLogs[l.sessionLogs.length - 1].date) : new Date(l.joinDate);
      const daysSince = Math.floor((today.getTime() - lastSession.getTime()) / 86400000);
      
      // Or missed homework
      const missedHw = (l.homework || []).some((h: any) => !h.completed && new Date(h.dueDate) < today);
      
      // Or low streak (0-1)
      const lowStreak = l.streak <= 1 && l.totalSessions > 5;
      
      return daysSince > 7 || missedHw || lowStreak;
    }).map(l => {
      const lastSession = l.sessionLogs?.length ? new Date(l.sessionLogs[l.sessionLogs.length - 1].date) : new Date(l.joinDate);
      const daysSince = Math.floor((today.getTime() - lastSession.getTime()) / 86400000);
      const reason = daysSince > 7 ? `⚠️ ${daysSince} days no class` : 
                    l.streak <= 1 ? '🔥 Streak broken' : 
                    '📚 Missed homework';
      return { ...l, reason, daysSince };
    }).sort((a, b) => b.daysSince - a.daysSince);
  }, [learners]);

  if (atRisk.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 rounded-[2.5rem] p-5 border-4 border-red-200 shadow-xl mb-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl animate-pulse">⚠️</span>
        <h3 className="text-xl font-black text-red-900">Attention Needed!</h3>
        <span className="bg-red-500 text-white font-black px-3 py-1 rounded-full text-sm">{atRisk.length} learners</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {atRisk.slice(0, 6).map(l => (
          <motion.div 
            key={l.id}
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelectLearner(l)}
            className="p-3 bg-white/80 rounded-2xl border-2 border-red-100 cursor-pointer hover:border-red-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getAvatarEvolution(l.gender, l.avatarArchetype, l.xp).emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-indigo-950 truncate">{l.name}</p>
                <p className="text-[10px] font-bold text-red-600">{l.reason}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
