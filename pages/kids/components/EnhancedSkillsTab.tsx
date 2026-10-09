/* ════════════════════════════════════════════════════════════════════════════
   ⚡ KIDS LEARNING KINGDOM — VISUAL SKILL TEMPLES & COMBAT MATRIX
   - Fully customizable: Edit names, emojis, %, focus tags & images
   - Keyword Photo Picker: Instant curated keyword chips + custom search
   - Adaptive Themes: Space 🌌, Fairy 🧚, Ocean 🌊, Jungle 🌴
   - Minified, high-impact UI with simple kid-friendly words & rich visuals
   - 30s Speed Battle Arena with Boss HP & Combo multiplier
   - Weakness Boss Hunter, Holographic Badges & Parent Report Card
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Trophy, Flame, Star, Shield, Sword, Award, Sparkles,
  Volume2, Plus, Trash2, Check, X, AlertTriangle, Printer,
  Share2, BarChart3, TrendingUp, Compass, Target, Clock,
  ChevronRight, RefreshCw, Eye, Edit3, Image as ImageIcon,
  Search, CheckCircle2, Sliders, Play, RotateCcw
} from 'lucide-react';
import { Learner, Badge, Weakness, Rarity, ThemeType } from '../types';
import {
  playTone, playClick, playQuestDing, playStarShower,
  playLevelUpFanfare, playBossClash, playComboSurge,
  playPowerUp, playRadarScan, playTimerTick, playTrophyUnlock,
  playStickerStamp
} from '../utils/kidsAudio';

/* ── TTS Voice helper ── */
const speakText = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  utt.pitch = 1.1;
  window.speechSynthesis.speak(utt);
};

/* ── Curated High-Res Unsplash Keyword Image Library ── */
export const KEYWORD_IMAGE_LIBRARY: Record<string, { label: string; emoji: string; images: string[] }> = {
  speaking: {
    label: 'Speaking',
    emoji: '🎙️',
    images: [
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80'
    ]
  },
  phonics: {
    label: 'Phonics',
    emoji: '🔊',
    images: [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80'
    ]
  },
  words: {
    label: 'Words',
    emoji: '📚',
    images: [
      'https://images.unsplash.com/photo-1507842229456-7f8e1215b497?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80'
    ]
  },
  grammar: {
    label: 'Grammar',
    emoji: '⚙️',
    images: [
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=800&q=80'
    ]
  },
  reading: {
    label: 'Reading',
    emoji: '📖',
    images: [
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1532012164546-f432f2e3edd3?auto=format&fit=crop&w=800&q=80'
    ]
  },
  listening: {
    label: 'Listening',
    emoji: '🎧',
    images: [
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80'
    ]
  },
  writing: {
    label: 'Writing',
    emoji: '✍️',
    images: [
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80'
    ]
  },
  galaxy: {
    label: 'Galaxy & Space',
    emoji: '🌌',
    images: [
      'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=800&q=80'
    ]
  },
  ocean: {
    label: 'Ocean & Coral',
    emoji: '🌊',
    images: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
    ]
  },
  jungle: {
    label: 'Jungle & Safari',
    emoji: '🌴',
    images: [
      'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80'
    ]
  },
  castle: {
    label: 'Fairy Castle',
    emoji: '🏰',
    images: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'
    ]
  },
  dragon: {
    label: 'Dragon & Myth',
    emoji: '🐉',
    images: [
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80'
    ]
  },
  crystal: {
    label: 'Magic Crystal',
    emoji: '🔮',
    images: [
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80'
    ]
  },
  mountain: {
    label: 'Alpine Peak',
    emoji: '🏔️',
    images: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
    ]
  },
  aurora: {
    label: 'Northern Lights',
    emoji: '❄️',
    images: [
      'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=800&q=80'
    ]
  },
  robot: {
    label: 'Robot & Tech',
    emoji: '🤖',
    images: [
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
    ]
  },
  fire: {
    label: 'Fire & Spark',
    emoji: '🔥',
    images: [
      'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80'
    ]
  }
};

/* ── Default Base Skill Definitions (Kid-Friendly, Easy Words) ── */
const DEFAULT_SKILL_CONFIGS: Record<string, { name: string; emoji: string; image: string; tag: string }> = {
  speaking: {
    name: 'Speaking & Talk',
    emoji: '🎙️',
    image: KEYWORD_IMAGE_LIBRARY.speaking.images[0],
    tag: 'Story Flow • Voice Power'
  },
  pronunciation: {
    name: 'Phonics & Sounds',
    emoji: '🔊',
    image: KEYWORD_IMAGE_LIBRARY.phonics.images[0],
    tag: 'Clear Sounds • Rhythm'
  },
  vocabulary: {
    name: 'Word Power',
    emoji: '📚',
    image: KEYWORD_IMAGE_LIBRARY.words.images[0],
    tag: 'New Words • Synonyms'
  },
  grammar: {
    name: 'Sentence Builder',
    emoji: '⚙️',
    image: KEYWORD_IMAGE_LIBRARY.grammar.images[0],
    tag: 'Rules • Perfect Tenses'
  },
  reading: {
    name: 'Story Quest',
    emoji: '📖',
    image: KEYWORD_IMAGE_LIBRARY.reading.images[0],
    tag: 'Main Idea • Speed'
  },
  listening: {
    name: 'Eagle Ears',
    emoji: '🎧',
    image: KEYWORD_IMAGE_LIBRARY.listening.images[0],
    tag: 'Catch Clues • Quick Listen'
  },
  writing: {
    name: 'Creative Quill',
    emoji: '✍️',
    image: KEYWORD_IMAGE_LIBRARY.writing.images[0],
    tag: 'Fun Stories • Sparks'
  }
};

/* ── Mastery Stars & Tier Helper ── */
function getSkillTier(val: number) {
  if (val >= 90) return { title: 'Grandmaster', stars: '⭐⭐⭐⭐⭐', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-400' };
  if (val >= 75) return { title: 'Master', stars: '⭐⭐⭐⭐', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-400' };
  if (val >= 55) return { title: 'Champion', stars: '⭐⭐⭐', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-400' };
  if (val >= 35) return { title: 'Seeker', stars: '⭐⭐', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-400' };
  return { title: 'Initiate', stars: '⭐', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-400' };
}

/* ── Speed Trial Questions (Simple, Punchy, Fast) ── */
function getSpeedQuestions(skillKey: string) {
  if (skillKey === 'vocabulary' || skillKey === 'words') {
    return [
      { q: `What is the opposite of 'ANCIENT'?`, opts: ['Modern / Brand New', 'Old', 'Dinosaur'], ans: 0 },
      { q: `Pick the superpower word for 'VERY BIG':`, opts: ['Gigantic', 'Tiny', 'Quiet'], ans: 0 },
      { q: `A creature of deep oceans is a:`, opts: ['Dolphin', 'Eagle', 'Cheetah'], ans: 0 },
      { q: `What does 'BRILLIANT' mean?`, opts: ['Super Smart & Bright', 'Dark', 'Sleepy'], ans: 0 },
    ];
  }
  if (skillKey === 'pronunciation' || skillKey === 'phonics' || skillKey === 'speaking') {
    return [
      { q: `Which syllable is loudest in 'FAN-TAS-TIC'?`, opts: ['TAS (Middle)', 'FAN', 'TIC'], ans: 0 },
      { q: `Find the matching rhyme: 'Bright' & ___`, opts: ['Flight', 'Brave', 'Cloud'], ans: 0 },
      { q: `When telling a happy story, your voice should:`, opts: ['Sound energetic & clear', 'Be silent', 'Whisper sad'], ans: 0 },
    ];
  }
  return [
    { q: `Choose the correct action: 'The dragon ___ into sky.'`, opts: ['soared', 'soaring', 'soars-ed'], ans: 0 },
    { q: `Find the noun (person, place, or thing):`, opts: ['Magic Castle', 'Quickly', 'Glowing'], ans: 0 },
    { q: `Complete the hero motto: 'Brave and ___!'`, opts: ['Strong', 'Lazy', 'Sleepy'], ans: 0 },
  ];
}

/* ── Realm Rivals for Adrenaline Rank ── */
const REALM_RIVALS = [
  { name: "Leo 🐉", score: 94, rank: "Grandmaster" },
  { name: "Maya 🌌", score: 88, rank: "Master" },
  { name: "Kai 🌊", score: 82, rank: "Champion" },
  { name: "Zara 🐆", score: 76, rank: "Seeker" },
];

interface EnhancedSkillsTabProps {
  learner: Learner;
  onUpdate: (u: Partial<Learner>) => void;
  ts: { bg: string; text: string; btn: string; border: string; card: string };
}

export const EnhancedSkillsTab: React.FC<EnhancedSkillsTabProps> = ({ learner, onUpdate, ts }) => {
  // Theme styling helpers
  const theme = learner.theme || 'space';

  const themeClasses = useMemo(() => {
    switch (theme) {
      case 'fairy':
        return {
          hero: 'bg-gradient-to-r from-pink-900 via-purple-900 to-rose-900 border-pink-300/40 text-pink-50',
          card: 'bg-white/95 border-pink-200 text-pink-950',
          cardBorder: 'border-pink-200',
          accent: 'from-pink-500 to-purple-600',
          badge: 'bg-pink-100 text-pink-800 border-pink-300',
          slider: 'accent-pink-500',
          pill: 'bg-pink-50 text-pink-700 border-pink-200'
        };
      case 'ocean':
        return {
          hero: 'bg-gradient-to-r from-slate-950 via-cyan-950 to-blue-950 border-cyan-400/40 text-cyan-50',
          card: 'bg-white/95 border-cyan-200 text-cyan-950',
          cardBorder: 'border-cyan-200',
          accent: 'from-cyan-500 to-blue-600',
          badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
          slider: 'accent-cyan-500',
          pill: 'bg-cyan-50 text-cyan-700 border-cyan-200'
        };
      case 'jungle':
        return {
          hero: 'bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 border-emerald-400/40 text-emerald-50',
          card: 'bg-white/95 border-emerald-200 text-emerald-950',
          cardBorder: 'border-emerald-200',
          accent: 'from-emerald-500 to-teal-600',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          slider: 'accent-emerald-500',
          pill: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'space':
      default:
        return {
          hero: 'bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 border-indigo-500/40 text-indigo-50',
          card: 'bg-slate-900/95 border-indigo-500/30 text-white',
          cardBorder: 'border-indigo-500/30',
          accent: 'from-indigo-500 to-purple-600',
          badge: 'bg-indigo-900/50 text-indigo-200 border-indigo-400/40',
          slider: 'accent-purple-500',
          pill: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/30'
        };
    }
  }, [theme]);

  // Overdrive Buff State
  const [isOverdrive, setIsOverdrive] = useState(false);
  const [overdriveTimer, setOverdriveTimer] = useState(0);

  // State to track failed image loads
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [modalImageFailed, setModalImageFailed] = useState(false);

  // Unique theme-wise dark gradients for skill temple cards when images fail or are loading
  const getSkillFallbackGradient = (skillKey: string, index: number = 0) => {
    switch (theme) {
      case 'fairy': {
        const gradients = [
          'from-pink-950 via-purple-950 to-rose-950',
          'from-fuchsia-950 via-rose-950 to-pink-900',
          'from-purple-950 via-pink-950 to-violet-950',
          'from-rose-950 via-fuchsia-950 to-purple-950'
        ];
        return gradients[index % gradients.length];
      }
      case 'ocean': {
        const gradients = [
          'from-slate-950 via-cyan-950 to-blue-950',
          'from-blue-950 via-teal-950 to-cyan-950',
          'from-indigo-950 via-blue-950 to-sky-950',
          'from-cyan-950 via-sky-950 to-slate-950'
        ];
        return gradients[index % gradients.length];
      }
      case 'jungle': {
        const gradients = [
          'from-slate-950 via-emerald-950 to-teal-950',
          'from-emerald-950 via-green-950 to-teal-900',
          'from-teal-950 via-emerald-950 to-lime-950',
          'from-green-950 via-teal-950 to-emerald-950'
        ];
        return gradients[index % gradients.length];
      }
      case 'space':
      default: {
        const gradients = [
          'from-slate-950 via-indigo-950 to-purple-950',
          'from-indigo-950 via-purple-950 to-violet-950',
          'from-purple-950 via-slate-950 to-indigo-950',
          'from-violet-950 via-indigo-950 to-fuchsia-950'
        ];
        return gradients[index % gradients.length];
      }
    }
  };

  // Speed Battle Arena State
  const [speedBattleSkill, setSpeedBattleSkill] = useState<{ key: string; name: string } | null>(null);
  const [battleTime, setBattleTime] = useState(30);
  const [battleScore, setBattleScore] = useState(0);
  const [battleCombo, setBattleCombo] = useState(0);
  const [battleIdx, setBattleIdx] = useState(0);
  const [battleQuestions, setBattleQuestions] = useState<any[]>([]);
  const [battleFinished, setBattleFinished] = useState(false);
  const [bossHp, setBossHp] = useState(100);

  // Skill Editor & Keyword Image Chooser Modal State
  const [editingSkillKey, setEditingSkillKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('⭐');
  const [editVal, setEditVal] = useState(70);
  const [editTag, setEditTag] = useState('');
  const [editImage, setEditImage] = useState('');
  const [imageSearchKeyword, setImageSearchKeyword] = useState('');

  // Add New Skill Modal
  const [isAddingNewSkill, setIsAddingNewSkill] = useState(false);

  // Parent Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportNotes, setReportNotes] = useState(
    `${learner.name.split(' ')[0]} is making tremendous progress! Super engaged in practice challenges and rapid skill growth.`
  );
  const [copiedReport, setCopiedReport] = useState(false);

  // Weakness Boss Buster State
  const [addingWeakness, setAddingWeakness] = useState(false);
  const [weaknessName, setWeaknessName] = useState('');
  const [weaknessPoints, setWeaknessPoints] = useState(5);

  // Badges Forge State
  const [addingBadge, setAddingBadge] = useState(false);
  const [newBadge, setNewBadge] = useState<{ name: string; icon: string; rarity: Rarity }>({
    name: '',
    icon: '🏆',
    rarity: 'epic'
  });

  // Consolidated Skill Items with Learner customizations
  const skillList = useMemo(() => {
    const raw = Object.entries(learner.skills || {}) as [string, number][];
    const customMetas = learner.customSkillMetas || {};

    return raw.map(([key, val]) => {
      const defaultMeta = DEFAULT_SKILL_CONFIGS[key.toLowerCase()] || {
        name: key.charAt(0).toUpperCase() + key.slice(1),
        emoji: '⭐',
        image: KEYWORD_IMAGE_LIBRARY.galaxy.images[0],
        tag: 'Skill Practice • Fluency'
      };
      const custom = customMetas[key.toLowerCase()] || {};

      return {
        key,
        val,
        name: custom.name || defaultMeta.name,
        emoji: custom.emoji || defaultMeta.emoji,
        image: custom.image || defaultMeta.image,
        tag: custom.tag || defaultMeta.tag,
        isCustom: !DEFAULT_SKILL_CONFIGS[key.toLowerCase()]
      };
    });
  }, [learner.skills, learner.customSkillMetas]);

  // Overall average
  const avgScore = useMemo(() => {
    if (skillList.length === 0) return 0;
    return Math.round(skillList.reduce((acc, curr) => acc + curr.val, 0) / skillList.length);
  }, [skillList]);

  // Global Mastery Power
  const masteryIndex = useMemo(() => {
    const bonus = Math.min((learner.badges?.length || 0) * 1.5, 8);
    const streakBonus = Math.min(learner.streak * 0.5, 6);
    return Math.min(99, Math.round(avgScore + bonus + streakBonus));
  }, [avgScore, learner.badges, learner.streak]);

  // Overdrive Timer Countdown
  useEffect(() => {
    let t: any;
    if (isOverdrive && overdriveTimer > 0) {
      t = setInterval(() => {
        setOverdriveTimer(prev => {
          if (prev <= 1) {
            setIsOverdrive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(t);
  }, [isOverdrive, overdriveTimer]);

  // Speed Battle Countdown
  useEffect(() => {
    let timer: any;
    if (speedBattleSkill && !battleFinished && battleTime > 0) {
      timer = setInterval(() => {
        setBattleTime(prev => {
          if (prev <= 5 && prev > 1) playTimerTick();
          if (prev <= 1) {
            handleEndBattle();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [speedBattleSkill, battleFinished, battleTime]);

  // Launch Overdrive
  const handleTriggerOverdrive = () => {
    playPowerUp();
    playLevelUpFanfare();
    setIsOverdrive(true);
    setOverdriveTimer(45);
  };

  // Launch Speed Battle
  const handleStartSpeedBattle = (skill: { key: string; name: string }) => {
    playBossClash();
    playRadarScan();
    setSpeedBattleSkill(skill);
    setBattleTime(30);
    setBattleScore(0);
    setBattleCombo(0);
    setBattleIdx(0);
    setBattleFinished(false);
    setBossHp(100);
    setBattleQuestions(getSpeedQuestions(skill.key));
  };

  // Answer Speed Battle Question
  const handleAnswerBattle = (optIdx: number) => {
    const currQ = battleQuestions[battleIdx % battleQuestions.length];
    if (optIdx === currQ.ans) {
      const nextCombo = battleCombo + 1;
      setBattleCombo(nextCombo);
      playComboSurge(nextCombo);
      const points = 30 * nextCombo * (isOverdrive ? 2 : 1);
      setBattleScore(s => s + points);
      setBossHp(hp => Math.max(0, hp - 34));
    } else {
      setBattleCombo(0);
      playTone(200, 0.12, 'sawtooth', 0.08);
    }

    if (battleIdx + 1 >= battleQuestions.length * 3 || bossHp <= 34) {
      handleEndBattle();
    } else {
      setBattleIdx(i => i + 1);
    }
  };

  const handleEndBattle = () => {
    setBattleFinished(true);
    playTrophyUnlock();
    playStarShower();
    if (speedBattleSkill) {
      const gainedXP = Math.max(60, battleScore);
      const updatedVal = Math.min(100, (learner.skills[speedBattleSkill.key] || 50) + 3);
      onUpdate({
        xp: learner.xp + gainedXP,
        coins: learner.coins + Math.floor(gainedXP / 2),
        skills: {
          ...learner.skills,
          [speedBattleSkill.key]: updatedVal
        }
      });
    }
  };

  // Open Edit Modal for a skill
  const handleOpenEditModal = (skill: typeof skillList[0]) => {
    playClick();
    setModalImageFailed(false);
    setEditingSkillKey(skill.key);
    setEditName(skill.name);
    setEditEmoji(skill.emoji);
    setEditVal(skill.val);
    setEditTag(skill.tag);
    setEditImage(skill.image);
    setImageSearchKeyword('');
    setIsAddingNewSkill(false);
  };

  // Open Add Skill Modal
  const handleOpenAddModal = () => {
    playClick();
    setModalImageFailed(false);
    setEditingSkillKey('custom_' + Date.now());
    setEditName('');
    setEditEmoji('⭐');
    setEditVal(60);
    setEditTag('Practice • Mastery');
    setEditImage(KEYWORD_IMAGE_LIBRARY.galaxy.images[0]);
    setImageSearchKeyword('');
    setIsAddingNewSkill(true);
  };

  // Save Skill Customizations
  const handleSaveSkillConfig = () => {
    if (!editName.trim()) return;
    playStarShower();

    const key = isAddingNewSkill
      ? editName.trim().toLowerCase().replace(/\s+/g, '_')
      : editingSkillKey!;

    const currentSkills = { ...learner.skills, [key]: editVal };
    const currentMetas = {
      ...(learner.customSkillMetas || {}),
      [key]: {
        name: editName.trim(),
        emoji: editEmoji || '⭐',
        image: editImage || KEYWORD_IMAGE_LIBRARY.galaxy.images[0],
        tag: editTag.trim() || 'Skill Mastery'
      }
    };

    onUpdate({
      skills: currentSkills,
      customSkillMetas: currentMetas
    });

    setEditingSkillKey(null);
    setIsAddingNewSkill(false);
  };

  // Delete Skill
  const handleDeleteSkill = (key: string) => {
    playClick();
    const sCopy = { ...learner.skills };
    delete sCopy[key];
    const mCopy = { ...(learner.customSkillMetas || {}) };
    delete mCopy[key];
    onUpdate({ skills: sCopy, customSkillMetas: mCopy });
    setEditingSkillKey(null);
  };

  // Fast Update Slider
  const handleSliderChange = (key: string, val: number) => {
    playTone(320 + val * 4, 0.03, 'sine', 0.02);
    onUpdate({
      skills: {
        ...learner.skills,
        [key]: Math.max(0, Math.min(100, val))
      }
    });
  };

  // Filter Keyword Library for Image Picker
  const matchingKeywordImages = useMemo(() => {
    if (!imageSearchKeyword.trim()) {
      return Object.entries(KEYWORD_IMAGE_LIBRARY);
    }
    const kw = imageSearchKeyword.toLowerCase().trim();
    return Object.entries(KEYWORD_IMAGE_LIBRARY).filter(([k, v]) =>
      k.includes(kw) || v.label.toLowerCase().includes(kw)
    );
  }, [imageSearchKeyword]);

  // Weakness Actions
  const handleVanquishWeakness = (w: Weakness) => {
    playBossClash();
    playStarShower();
    const xpBonus = w.points * 25 * (isOverdrive ? 2 : 1);
    const updated = (learner.weaknesses || []).map(item =>
      item.id === w.id ? { ...item, completed: true } : item
    );
    onUpdate({
      weaknesses: updated,
      xp: learner.xp + xpBonus,
      coins: learner.coins + Math.floor(xpBonus / 2)
    });
  };

  const handleCreateWeakness = () => {
    if (!weaknessName.trim()) return;
    playQuestDing();
    const newW: Weakness = {
      id: `w-${Date.now()}`,
      name: weaknessName.trim(),
      points: weaknessPoints,
      completed: false,
      dateAdded: new Date().toISOString().split('T')[0]
    };
    onUpdate({ weaknesses: [newW, ...(learner.weaknesses || [])] });
    setWeaknessName('');
    setAddingWeakness(false);
  };

  // Badge Actions
  const handleCreateBadge = () => {
    if (!newBadge.name.trim()) return;
    playTrophyUnlock();
    const b: Badge = {
      id: `b-${Date.now()}`,
      name: newBadge.name.trim(),
      icon: newBadge.icon || '🏆',
      rarity: newBadge.rarity
    };
    onUpdate({ badges: [b, ...(learner.badges || [])] });
    setNewBadge({ name: '', icon: '🏆', rarity: 'epic' });
    setAddingBadge(false);
  };

  const handleDeleteBadge = (id: string) => {
    playClick();
    onUpdate({ badges: (learner.badges || []).filter(b => b.id !== id) });
  };

  // Copy Parent Report Text
  const handleCopyReport = () => {
    playClick();
    const text = `🌟 LEARNER PROGRESS REPORT: ${learner.name.toUpperCase()} 🌟
📅 Date: ${new Date().toLocaleDateString()}
⚡ Mastery Power: ${masteryIndex}% (${getSkillTier(avgScore).title})
🔥 Daily Streak: ${learner.streak} Days | Total XP: ${learner.xp}

📊 SKILL BREAKDOWN:
${skillList.map(s => `• ${s.emoji} ${s.name}: ${s.val}% (${getSkillTier(s.val).title})`).join('\n')}

🏅 BADGES: ${(learner.badges || []).map(b => b.name).join(', ') || 'Keep collecting!'}

💬 TUTOR NOTE:
"${reportNotes}"

Generated by Kids Learning Kingdom 👑`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className={`space-y-6 ${isOverdrive ? 'ring-4 ring-orange-500 rounded-3xl p-1 shadow-2xl shadow-orange-500/30' : ''}`}>

      {/* ── Visual Skill Temples with Integrated Report Card ── */}
      <div className={`${ts.card} rounded-3xl p-5 sm:p-7 border-3 ${themeClasses.cardBorder} shadow-2xl space-y-6`}>
        {/* Header with Report Card & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
          <div>
            <h3 className={`text-2xl sm:text-3xl font-black flex items-center gap-2.5 ${theme === 'space' ? 'text-white' : 'text-slate-900'}`}>
              <span>🏛️</span> Skill Temples & Competency Map
            </h3>
            <p className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-400 mt-1">
              Interactive skill mastery tracks, real-time competency calibration, and quick audio pronunciations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 2X Buff Button */}
            {isOverdrive ? (
              <div className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl border border-amber-300 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-lg animate-pulse">
                <Flame className="w-4 h-4 text-amber-200" />
                <span>2X BUFF ({overdriveTimer}s)</span>
              </div>
            ) : (
              <button
                onClick={handleTriggerOverdrive}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:brightness-110 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
                title="Trigger 2X XP & Mastery Boost"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>⚡ 2X Buff</span>
              </button>
            )}

            {/* Prominent Report Card Button */}
            <button
              onClick={() => {
                playRadarScan();
                setShowReportModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-300/40 rounded-2xl text-xs sm:text-sm font-black cursor-pointer shadow-lg flex items-center gap-2 active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4 text-purple-200" />
              <span>📜 Full Report Card</span>
            </button>

            {/* Add Skill Button */}
            <button
              onClick={handleOpenAddModal}
              className={`px-4 py-2.5 bg-gradient-to-r ${ts.btn} text-white font-black rounded-2xl text-xs sm:text-sm cursor-pointer flex items-center gap-1.5 shadow-lg hover:brightness-110 active:scale-95 transition-all`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Skill</span>
            </button>
          </div>
        </div>

        {/* ── Integrated Progress Report Card Bar ── */}
        <div className="bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-slate-900/95 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-purple-400/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-500/30 border border-purple-300/40 flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-inner">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base sm:text-lg font-black text-white">
                  {learner.name}'s Official Progress Report Card
                </h4>
                <span className="px-2.5 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black rounded-full">
                  {masteryIndex}% Overall Mastery
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-purple-200 mt-0.5">
                {skillList.length} Active Temples • Streak: {learner.streak} Days • Tier: {getSkillTier(avgScore).title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleCopyReport}
              className="px-3.5 py-2 bg-purple-700/80 hover:bg-purple-600 text-white border border-purple-300/30 rounded-xl text-xs sm:text-sm font-black cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedReport ? '✓ Copied!' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={() => {
                setShowReportModal(true);
                setTimeout(() => window.print(), 300);
              }}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-purple-100 border border-white/20 rounded-xl text-xs sm:text-sm font-black cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PDF</span>
            </button>
          </div>
        </div>

        {/* Temples Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {skillList.map((skill, index) => {
            const tier = getSkillTier(skill.val);
            const isImageBroken = failedImages[skill.key] || !skill.image;
            const fallbackGradient = getSkillFallbackGradient(skill.key, index);

            return (
              <motion.div
                key={skill.key}
                whileHover={{ y: -3 }}
                className={`rounded-3xl border-2 overflow-hidden shadow-lg flex flex-col justify-between group transition-all ${
                  theme === 'space' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
                }`}
              >
                {/* Visual Image Header with Quick Edit trigger & Dark Gradient Fallback */}
                <div className={`relative h-32 w-full overflow-hidden bg-gradient-to-br ${fallbackGradient}`}>
                  {!isImageBroken && (
                    <img
                      src={skill.image}
                      alt={skill.name}
                      onError={() => {
                        setFailedImages(prev => ({ ...prev, [skill.key]: true }));
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  {/* Subtle dark overlay for maximum text contrast with white typography */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20" />

                  {/* Header badges over image */}
                  <div className="absolute inset-0 p-3.5 flex flex-col justify-between z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl filter drop-shadow-md">{skill.emoji}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase text-white ${tier.bg} backdrop-blur-xs border border-white/30 shadow-xs`}>
                          {tier.title}
                        </span>
                        <button
                          onClick={() => handleOpenEditModal(skill)}
                          className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-xl cursor-pointer backdrop-blur-xs transition-colors border border-white/20 shadow-xs"
                          title="Edit Skill & Picture"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-white truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight">{skill.name}</h4>
                      <p className="text-xs text-purple-200 font-bold line-clamp-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{skill.tag}</p>
                    </div>
                  </div>
                </div>

                {/* Content & Interactive Slider */}
                <div className="p-4 space-y-3.5">
                  {/* Mastery percentage bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-black">
                      <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">Mastery Level</span>
                      <span className={`font-black text-sm ${tier.color}`}>{skill.val}%</span>
                    </div>

                    <div className="w-full h-2.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.val}%` }}
                        className={`h-full bg-gradient-to-r ${themeClasses.accent} rounded-full`}
                      />
                    </div>

                    {/* Range Slider & Adjusters */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={skill.val}
                        onChange={(e) => handleSliderChange(skill.key, parseInt(e.target.value))}
                        className={`flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer ${themeClasses.slider}`}
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleSliderChange(skill.key, skill.val - 5)}
                          className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950 text-red-600 text-xs font-black flex items-center justify-center cursor-pointer transition-colors"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleSliderChange(skill.key, skill.val + 5)}
                          className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-600 text-xs font-black flex items-center justify-center cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex gap-2">
                    <button
                      onClick={() => handleStartSpeedBattle({ key: skill.key, name: skill.name })}
                      className={`flex-1 py-2 bg-gradient-to-r ${themeClasses.accent} hover:brightness-110 text-white font-black text-xs sm:text-sm rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all`}
                    >
                      <Sword className="w-3.5 h-3.5" />
                      <span>Speed Battle</span>
                    </button>
                    <button
                      onClick={() => {
                        playClick();
                        speakText(`${skill.name}. Mastery is at ${skill.val} percent.`);
                      }}
                      className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950 text-gray-600 dark:text-gray-300 hover:text-purple-700 rounded-xl cursor-pointer transition-colors"
                      title="Audio Pronunciation"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Weakness Monster Hunter (Minified, Visual Boss Buster) ── */}
      <div className={`${ts.card} rounded-3xl p-5 sm:p-6 border-3 border-red-300/60 shadow-xl space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-red-950 flex items-center gap-2">
              👹 Weakness Boss Hunter
            </h3>
            <p className="text-xs font-bold text-gray-500">
              Vanquish session mistakes in battle to earn bonus XP and stars!
            </p>
          </div>

          <button
            onClick={() => {
              playClick();
              setAddingWeakness(!addingWeakness);
            }}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs cursor-pointer flex items-center gap-1 shadow-md active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> {addingWeakness ? 'Cancel' : 'Add Target'}
          </button>
        </div>

        {/* Add Target Form */}
        <AnimatePresence>
          {addingWeakness && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 bg-red-50 rounded-2xl border-2 border-red-200 space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={weaknessName}
                  onChange={(e) => setWeaknessName(e.target.value)}
                  placeholder="Target mistake (e.g. Past tense 'went' vs 'goed')..."
                  className="flex-1 p-2.5 bg-white border-2 border-red-200 rounded-xl font-bold text-xs outline-none"
                />
                <button
                  onClick={handleCreateWeakness}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  ⚡ Hunt Monster (+120 XP)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Targets List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(learner.weaknesses || []).length === 0 && (
            <p className="col-span-full text-center text-gray-500 font-bold py-3 text-xs">
              ✨ No active monster weaknesses logged. Realm is clear!
            </p>
          )}

          {(learner.weaknesses || []).map((w: Weakness) => (
            <div
              key={w.id}
              className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                w.completed
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{w.completed ? '🏆' : '👹'}</span>
                <div>
                  <h5 className={`font-black text-xs ${w.completed ? 'line-through text-gray-500' : 'text-red-950'}`}>
                    {w.name}
                  </h5>
                  <span className="text-[10px] text-amber-700 font-bold">Bounty: +{w.points * 25} XP</span>
                </div>
              </div>

              {!w.completed && (
                <button
                  onClick={() => handleVanquishWeakness(w)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-sm flex items-center gap-1 active:scale-95 shrink-0"
                >
                  <Sword className="w-3 h-3" /> Vanquish!
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Holographic Badges & Relics Showcase ── */}
      <div className={`${ts.card} rounded-3xl p-5 sm:p-6 border-3 border-amber-300/60 shadow-xl space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-amber-950 flex items-center gap-2">
              🏅 Badges & Mythic Relics
            </h3>
            <p className="text-xs font-bold text-gray-500">
              Collect and award shiny holographic milestone badges.
            </p>
          </div>

          <button
            onClick={() => {
              playClick();
              setAddingBadge(!addingBadge);
            }}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs cursor-pointer flex items-center gap-1 shadow-md active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> {addingBadge ? 'Cancel' : 'Forge Badge'}
          </button>
        </div>

        {/* Add Badge Form */}
        <AnimatePresence>
          {addingBadge && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 bg-amber-50 rounded-2xl border-2 border-amber-200 space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  value={newBadge.icon}
                  onChange={(e) => setNewBadge({ ...newBadge, icon: e.target.value })}
                  className="sm:col-span-2 p-2 bg-white border-2 border-amber-200 rounded-xl text-center text-lg font-black outline-none"
                  placeholder="🏆"
                />
                <input
                  value={newBadge.name}
                  onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                  placeholder="Badge Title (e.g., Vocab Star)..."
                  className="sm:col-span-6 p-2 bg-white border-2 border-amber-200 rounded-xl font-bold text-xs outline-none"
                />
                <select
                  value={newBadge.rarity}
                  onChange={(e) => setNewBadge({ ...newBadge, rarity: e.target.value as Rarity })}
                  className="sm:col-span-4 p-2 bg-white border-2 border-amber-200 rounded-xl font-bold text-xs outline-none cursor-pointer"
                >
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </div>
              <button
                onClick={handleCreateBadge}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs cursor-pointer shadow-md"
              >
                ✨ Award Badge
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {(learner.badges || []).map((b: Badge) => (
            <motion.div
              key={b.id}
              whileHover={{ scale: 1.05 }}
              className={`p-3 rounded-2xl border-2 text-center relative group transition-all ${
                b.rarity === 'legendary' ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-300' :
                b.rarity === 'epic' ? 'bg-purple-50 border-purple-300 shadow-sm ring-1 ring-purple-300' :
                b.rarity === 'rare' ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <button
                onClick={() => handleDeleteBadge(b.id)}
                className="absolute top-1 right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
              <span className="text-3xl block mb-1">{b.icon}</span>
              <p className="text-xs font-black text-gray-900 truncate">{b.name}</p>
              <span className="text-[9px] font-black uppercase text-amber-700 block mt-0.5">
                {b.rarity}
              </span>
            </motion.div>
          ))}
          {(learner.badges || []).length === 0 && (
            <p className="col-span-full text-center text-gray-500 font-bold py-4 text-xs">
              No badges awarded yet. Forge some shiny trophies! 🏆
            </p>
          )}
        </div>
      </div>

      {/* ── MODAL 1: Skill Temple Customizer & Keyword Image Picker ── */}
      <AnimatePresence>
        {editingSkillKey && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border-4 border-purple-300 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b pb-3 border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{editEmoji}</span>
                  <h3 className="text-lg font-black text-slate-900">
                    {isAddingNewSkill ? 'Add Custom Skill Temple' : 'Customize Skill & Picture'}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingSkillKey(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-black flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Live Preview Image & Header with Dark Gradient Fallback */}
              <div className={`relative h-32 rounded-2xl overflow-hidden border-2 border-purple-200 shadow-md bg-gradient-to-br ${getSkillFallbackGradient(editingSkillKey || '', 0)}`}>
                {!modalImageFailed && (editImage || KEYWORD_IMAGE_LIBRARY.galaxy.images[0]) && (
                  <img
                    src={editImage || KEYWORD_IMAGE_LIBRARY.galaxy.images[0]}
                    alt="Preview"
                    onError={() => setModalImageFailed(true)}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white z-10">
                  <div>
                    <h4 className="font-black text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{editEmoji} {editName || 'Skill Title'}</h4>
                    <p className="text-xs text-purple-200 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{editTag || 'Practice Focus'}</p>
                  </div>
                  <span className="text-lg font-black text-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{editVal}%</span>
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Emoji</label>
                  <input
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    className="w-full p-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-center text-xl font-black outline-none"
                  />
                </div>
                <div className="sm:col-span-9">
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Skill Title</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Speaking & Oratory..."
                    className="w-full p-2 bg-gray-50 border-2 border-gray-200 rounded-xl font-black text-sm outline-none"
                  />
                </div>
                <div className="sm:col-span-12">
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Focus Tag</label>
                  <input
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    placeholder="e.g. Story Flow • Pronunciation"
                    className="w-full p-2 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-xs outline-none"
                  />
                </div>
                <div className="sm:col-span-12">
                  <div className="flex items-center justify-between text-xs font-black mb-1">
                    <span className="text-gray-500 text-[10px] uppercase">Mastery Target</span>
                    <span className="text-purple-700">{editVal}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editVal}
                    onChange={(e) => setEditVal(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
              </div>

              {/* ── KEYWORD PHOTO CHOOSER SECTION ── */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                    Pick Picture by Keyword
                  </label>
                  <span className="text-[10px] font-bold text-gray-400">High-Res Scenic Unsplash</span>
                </div>

                {/* Instant Keyword Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {Object.entries(KEYWORD_IMAGE_LIBRARY).slice(0, 10).map(([k, meta]) => (
                    <button
                      key={k}
                      onClick={() => {
                        playClick();
                        setEditImage(meta.images[0]);
                        setImageSearchKeyword(k);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 border cursor-pointer transition-all ${
                        imageSearchKeyword === k
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-gray-100 hover:bg-purple-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {meta.emoji} {meta.label}
                    </button>
                  ))}
                </div>

                {/* Image Gallery Options for selected or all keywords */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-gray-50 rounded-2xl border border-gray-200">
                  {matchingKeywordImages.flatMap(([k, meta]) =>
                    meta.images.map((imgUrl, i) => (
                      <div
                        key={`${k}-${i}`}
                        onClick={() => {
                          playClick();
                          setEditImage(imgUrl);
                        }}
                        className={`relative h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                          editImage === imgUrl ? 'border-purple-600 ring-2 ring-purple-400 scale-95' : 'border-transparent hover:opacity-80'
                        }`}
                      >
                        <img src={imgUrl} alt={meta.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <span className="absolute bottom-0.5 right-0.5 px-1 bg-black/60 text-[8px] font-bold text-white rounded">
                          {meta.emoji}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Direct Image URL input */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">Or Paste Direct Image URL</label>
                  <input
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl text-[11px] font-mono outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {!isAddingNewSkill && (
                  <button
                    onClick={() => handleDeleteSkill(editingSkillKey!)}
                    className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-black rounded-xl text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
                <button
                  onClick={handleSaveSkillConfig}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Skill Temple
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: 30-Second Speed Battle Arena ── */}
      <AnimatePresence>
        {speedBattleSkill && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-950 rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-amber-400 text-white space-y-5"
            >
              {/* Battle Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚔️</span>
                  <div>
                    <h3 className="text-lg font-black text-amber-300">Speed Battle Arena</h3>
                    <p className="text-xs text-gray-400">{speedBattleSkill.name}</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-red-600 text-white font-black text-sm rounded-xl animate-pulse">
                  ⏱️ {battleTime}s
                </div>
              </div>

              {!battleFinished ? (
                <div className="space-y-4">
                  {/* Boss Health Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black text-gray-300">
                      <span>👹 Challenge Boss</span>
                      <span>{bossHp}% HP</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300"
                        style={{ width: `${bossHp}%` }}
                      />
                    </div>
                  </div>

                  {/* Combo & Score */}
                  <div className="flex items-center justify-between text-xs font-black px-1">
                    <span className="text-amber-400">🔥 Combo: x{battleCombo || 1}</span>
                    <span className="text-cyan-300">Score: {battleScore} XP</span>
                  </div>

                  {/* Current Question */}
                  {battleQuestions.length > 0 && (
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 space-y-3">
                      <h4 className="text-sm font-black text-amber-100 text-center">
                        {battleQuestions[battleIdx % battleQuestions.length].q}
                      </h4>
                      <div className="space-y-2">
                        {battleQuestions[battleIdx % battleQuestions.length].opts.map((opt: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => handleAnswerBattle(idx)}
                            className="w-full p-2.5 bg-slate-800 hover:bg-purple-600 active:scale-98 text-white font-black text-xs rounded-xl text-left cursor-pointer transition-all border border-slate-700"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Victory Screen */
                <div className="text-center py-6 space-y-4">
                  <span className="text-5xl block animate-bounce">🏆</span>
                  <div>
                    <h3 className="text-2xl font-black text-amber-400">VICTORY CONQUEST!</h3>
                    <p className="text-xs text-gray-300 mt-1">
                      Earned <strong className="text-amber-300">+{Math.max(60, battleScore)} XP</strong> and <strong className="text-cyan-300">+3% Mastery Boost</strong>!
                    </p>
                  </div>
                  <button
                    onClick={() => setSpeedBattleSkill(null)}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl text-xs cursor-pointer shadow-lg active:scale-95"
                  >
                    Claim Victory Rewards! ✨
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: Parent Progress Report Card (Clean, Printable) ── */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border-4 border-purple-300 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Report Header */}
              <div className="flex items-center justify-between border-b pb-4 border-gray-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{learner.avatar || '👑'}</span>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900">{learner.name}'s Progress Report</h3>
                    <p className="text-xs sm:text-sm text-gray-500 font-bold">Official Mastery Index & Milestones</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-black flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* High-Level Overview Grid */}
              <div className="grid grid-cols-3 gap-3 bg-purple-50 p-4 rounded-2xl border-2 border-purple-200 text-center">
                <div>
                  <span className="text-xs uppercase font-bold text-gray-600 block">Mastery Index</span>
                  <span className="text-lg sm:text-xl font-black text-purple-900">{masteryIndex}%</span>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-600 block">Rank</span>
                  <span className="text-lg sm:text-xl font-black text-amber-600">{getSkillTier(avgScore).title}</span>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-600 block">Daily Streak</span>
                  <span className="text-lg sm:text-xl font-black text-orange-600">{learner.streak} Days 🔥</span>
                </div>
              </div>

              {/* Skills Visual Breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-xs sm:text-sm font-black uppercase text-gray-600 tracking-wide">Subject Competencies</h4>
                <div className="space-y-2">
                  {skillList.map(s => (
                    <div key={s.key} className="flex items-center justify-between text-xs sm:text-sm font-bold p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{s.emoji}</span>
                        <span className="font-black text-slate-800">{s.name}</span>
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-28 sm:w-36 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-600 rounded-full" style={{ width: `${s.val}%` }} />
                        </div>
                        <span className="font-black text-purple-900 w-10 text-right">{s.val}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tutor Comment Note */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-black uppercase text-gray-600 tracking-wide">Tutor Pedagogical Commentary</label>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full p-3 bg-gray-50 border-2 border-purple-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-purple-500 transition-colors"
                  rows={3}
                />
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={handleCopyReport}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{copiedReport ? '✓ Copied to Clipboard!' : '📋 Copy WhatsApp / Email'}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-3 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 font-black text-xs sm:text-sm rounded-xl cursor-pointer flex items-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print PDF</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
