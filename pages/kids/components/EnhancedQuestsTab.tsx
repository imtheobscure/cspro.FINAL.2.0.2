/* ════════════════════════════════════════════════════════════════════════════
   🌟 KIDS LEARNING KINGDOM — ENHANCED QUESTS & HOMEWORK HUB
   - Custom Quest Adventure Builder: Tutor defines & edits all steps (emoji, title, subtitle, XP) with real image map templates
   - Pure Homework Definition & Comprehensive Tracking: Status filters (Active, Due Soon, Overdue, Mastered), priority, due date countdown, audio read-aloud, tutor feedback & star rating, and pet feeding XP
   - Editable & Custom Teacher Sticker Stamps: Preset stamps + Custom stamp builder
   - Strict active theme styling (Fairy, Space, Ocean, Jungle)
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Check, Trash2, Volume2, Sparkles, Trophy,
  Star, Flame, Heart, Award, CheckCircle2, ChevronRight,
  X, Calendar, Clock, AlertCircle, Search, Edit3, MessageSquare,
  Image as ImageIcon, Filter, CheckSquare, RefreshCw, Layers
} from 'lucide-react';
import {
  Learner, Homework, QuestMap, QuestCheckpoint,
  getPetEvolution, getRarityTier
} from '../types';
import {
  playQuestDing, playCheckpointUnlock, playHomeworkComplete,
  playPetFeed, playStarShower, playLevelUpFanfare, playStickerStamp,
  playClick, playCoinClink
} from '../utils/kidsAudio';

/* ── TTS Voice helper ── */
const speakText = (text: string, voiceName?: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.9;
  utt.pitch = 1.1;
  if (voiceName) {
    const voice = window.speechSynthesis.getVoices().find(v => v.name === voiceName);
    if (voice) utt.voice = voice;
  }
  window.speechSynthesis.speak(utt);
};

/* ── Real Image Map Templates for Custom Quest Adventure ── */
export interface MapTemplate {
  id: string;
  name: string;
  themeEmoji: string;
  image: string;
  description: string;
  themeStyle: 'space' | 'ocean' | 'jungle' | 'mountain' | 'desert' | 'aurora' | 'kingdom';
}

const MAP_TEMPLATES: MapTemplate[] = [
  {
    id: 'tpl-space',
    name: 'Cosmic Starlight Odyssey',
    themeEmoji: '🌌',
    image: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80',
    description: 'Chart stellar galaxies, constellations, and cosmic knowledge portals.',
    themeStyle: 'space'
  },
  {
    id: 'tpl-ocean',
    name: 'Deep Sea Coral Trench',
    themeEmoji: '🌊',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    description: 'Dive into shimmering coral reefs and underwater sunken treasures.',
    themeStyle: 'ocean'
  },
  {
    id: 'tpl-jungle',
    name: 'Ancient Temple Canopy Safari',
    themeEmoji: '🌴',
    image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=80',
    description: 'Venture through misty rainforest canopies and uncover ancient animal lore.',
    themeStyle: 'jungle'
  },
  {
    id: 'tpl-mountain',
    name: 'Dragon Peak Alpine Trail',
    themeEmoji: '🏔️',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    description: 'Ascend mist-shrouded mountain ridges toward the legendary dragon roost.',
    themeStyle: 'mountain'
  },
  {
    id: 'tpl-desert',
    name: 'Golden Mystic Dunes',
    themeEmoji: '🏜️',
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
    description: 'Unravel sand mysteries, glowing pyramids, and ancient oasis wisdom.',
    themeStyle: 'desert'
  },
  {
    id: 'tpl-aurora',
    name: 'Glacial Aurora Wonder',
    themeEmoji: '❄️',
    image: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80',
    description: 'Trek across crystal ice fields underneath dancing emerald northern lights.',
    themeStyle: 'aurora'
  },
  {
    id: 'tpl-kingdom',
    name: 'Royal Crystal Spire',
    themeEmoji: '👑',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    description: 'Journey through marble courtyards and crystal spires of the grand citadel.',
    themeStyle: 'kingdom'
  }
];

/* ── Default Teacher Sticker Stamps ── */
export interface StickerStampItem {
  id: string;
  name: string;
  emoji: string;
  color: string;
  border: string;
  isCustom?: boolean;
}

const DEFAULT_STICKER_STAMPS: StickerStampItem[] = [
  { id: 'stamp-star', name: '5-STAR SUPERSTAR', emoji: '⭐', color: 'from-amber-400 to-yellow-500', border: 'border-amber-300' },
  { id: 'stamp-magic', name: 'PURE MAGIC', emoji: '🦄', color: 'from-pink-500 to-purple-600', border: 'border-pink-300' },
  { id: 'stamp-cosmic', name: 'COSMIC GENIUS', emoji: '🚀', color: 'from-cyan-400 to-blue-600', border: 'border-cyan-300' },
  { id: 'stamp-brave', name: 'BRAVE LEARNER', emoji: '🦁', color: 'from-emerald-400 to-green-600', border: 'border-emerald-300' },
  { id: 'stamp-royal', name: 'ROYAL MASTER', emoji: '👑', color: 'from-purple-500 to-indigo-600', border: 'border-purple-300' },
  { id: 'stamp-gem', name: 'FLAWLESS GEM', emoji: '💎', color: 'from-sky-400 to-teal-500', border: 'border-teal-300' },
  { id: 'stamp-bullseye', name: 'TARGET HIT', emoji: '🎯', color: 'from-rose-500 to-red-600', border: 'border-rose-300' },
  { id: 'stamp-lightbulb', name: 'BRILLIANT WORK', emoji: '💡', color: 'from-yellow-400 to-amber-500', border: 'border-yellow-300' },
];

interface EnhancedQuestsTabProps {
  learner: Learner;
  onUpdate: (u: Partial<Learner>) => void;
  ts: { bg: string; text: string; btn: string; border: string; card: string };
}

export const EnhancedQuestsTab: React.FC<EnhancedQuestsTabProps> = ({ learner, onUpdate, ts }) => {
  // Homework state & filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'dueSoon' | 'overdue' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addingHw, setAddingHw] = useState(false);
  const [editingHw, setEditingHw] = useState<Homework | null>(null);

  // Sticker Stamps state (with user-defined custom stamps)
  const [customStamps, setCustomStamps] = useState<StickerStampItem[]>(() => {
    try {
      const saved = localStorage.getItem('kids_custom_teacher_stamps');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [stampPickerHwId, setStampPickerHwId] = useState<string | null>(null);
  const [showCustomStampModal, setShowCustomStampModal] = useState(false);
  const [newStampEmoji, setNewStampEmoji] = useState('🏆');
  const [newStampName, setNewStampName] = useState('');
  const [newStampColor, setNewStampColor] = useState('from-indigo-500 to-purple-600');

  // Homework creation form state
  const [hwForm, setHwForm] = useState<Partial<Homework>>({
    title: '',
    description: '',
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    xpReward: 50,
    category: 'speaking',
    priority: 'normal',
    imageUrl: '',
    tutorFeedback: '',
    rating: 5
  });

  // Tutor feedback modal for completed homework
  const [feedbackHwId, setFeedbackHwId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);

  // Quest Map Builder State (No mock data, full step definition)
  const [showQuestCreator, setShowQuestCreator] = useState(false);
  const [editingQuestMapId, setEditingQuestMapId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MapTemplate>(MAP_TEMPLATES[0]);
  const [questTitle, setQuestTitle] = useState('Cosmic Starlight Odyssey');
  const [questSubtitle, setQuestSubtitle] = useState('Solve grammar and pronunciation checkpoints across the stars');
  const [questEmoji, setQuestEmoji] = useState('🌌');
  
  // Fully customizable step list for the builder
  const [customSteps, setCustomSteps] = useState<Array<{
    id: string;
    emoji: string;
    title: string;
    subtitle: string;
    xpReward: number;
  }>>([
    { id: 'step-1', emoji: '🌟', title: 'Step 1: Phonics Spark', subtitle: 'Pronounce 3 target words clearly with tutor', xpReward: 25 },
    { id: 'step-2', emoji: '📖', title: 'Step 2: Sentence Bridge', subtitle: 'Read the short paragraph aloud with correct rhythm', xpReward: 35 },
    { id: 'step-3', emoji: '⚡', title: 'Step 3: Grammar Puzzle', subtitle: 'Identify the past-tense action words', xpReward: 40 },
    { id: 'step-4', emoji: '🧩', title: 'Step 4: Vocab Realm', subtitle: 'Match 4 new keywords with their meanings', xpReward: 50 },
    { id: 'step-5', emoji: '🏆', title: 'Step 5: Boss Gate Mastery', subtitle: 'Create and speak your own 3-sentence story', xpReward: 60 },
  ]);

  // Pet companion details & streak
  const petRank = useMemo(() => getPetEvolution(learner.petType, learner.petXp ?? 0), [learner.petType, learner.petXp]);
  const petRarity = useMemo(() => getRarityTier(petRank.rank), [petRank.rank]);
  const [petFeedAnim, setPetFeedAnim] = useState(false);
  const [petDialogue, setPetDialogue] = useState<string | null>(null);

  // Streak Multiplier
  const streakMultiplier = useMemo(() => {
    if (learner.streak >= 14) return 1.5;
    if (learner.streak >= 7) return 1.3;
    if (learner.streak >= 3) return 1.15;
    return 1.0;
  }, [learner.streak]);

  // Combined stamp list
  const allStamps = useMemo(() => [...DEFAULT_STICKER_STAMPS, ...customStamps], [customStamps]);

  // Feed Pet
  const feedPetWithHwXp = (amount: number = 25) => {
    playPetFeed();
    setPetFeedAnim(true);
    const dialogues = [
      `*YUM!* That was super helpful! I'm getting stronger! 🍖`,
      `*Crunch crunch!* My power is growing! Thank you, ${learner.name.split(' ')[0]}! ❤️`,
      `*Purr/Happy chirp!* You are doing awesome in English! 🌟`,
      `*Sparkle!* Keep completing your tasks and I will evolve! 🐾`
    ];
    setPetDialogue(dialogues[Math.floor(Math.random() * dialogues.length)]);
    onUpdate({
      petXp: (learner.petXp ?? 0) + amount,
      coins: learner.coins + Math.floor(amount / 2)
    });
    setTimeout(() => {
      setPetFeedAnim(false);
      setPetDialogue(null);
    }, 2800);
  };

  // Save custom stamp
  const handleCreateCustomStamp = () => {
    if (!newStampName.trim()) return;
    playStickerStamp();
    const newStamp: StickerStampItem = {
      id: `stamp-custom-${Date.now()}`,
      name: newStampName.trim().toUpperCase(),
      emoji: newStampEmoji || '⭐',
      color: newStampColor,
      border: 'border-purple-300',
      isCustom: true
    };
    const updated = [...customStamps, newStamp];
    setCustomStamps(updated);
    try {
      localStorage.setItem('kids_custom_teacher_stamps', JSON.stringify(updated));
    } catch {}
    setNewStampName('');
    setShowCustomStampModal(false);
  };

  // Delete custom stamp
  const handleDeleteCustomStamp = (id: string) => {
    playClick();
    const updated = customStamps.filter(s => s.id !== id);
    setCustomStamps(updated);
    try {
      localStorage.setItem('kids_custom_teacher_stamps', JSON.stringify(updated));
    } catch {}
  };

  // Apply stamp to homework
  const applyStickerStamp = (hwId: string, stamp: StickerStampItem) => {
    playStickerStamp();
    const updatedHw = (learner.homework || []).map(h =>
      h.id === hwId ? { ...h, stickerStamp: `${stamp.emoji} ${stamp.name}` } : h
    );
    onUpdate({ homework: updatedHw });
    setStampPickerHwId(null);
  };

  // Remove stamp from homework
  const removeStickerStamp = (hwId: string) => {
    playClick();
    const updatedHw = (learner.homework || []).map(h =>
      h.id === hwId ? { ...h, stickerStamp: undefined } : h
    );
    onUpdate({ homework: updatedHw });
    setStampPickerHwId(null);
  };

  // Complete / Toggle Homework
  const toggleHomeworkComplete = (hw: Homework) => {
    if (!hw.completed) {
      playHomeworkComplete();
      playStarShower();
      const finalPetXp = Math.round(hw.xpReward * streakMultiplier);
      const coinsEarned = Math.floor(finalPetXp / 2);

      const updatedHw = (learner.homework || []).map(h =>
        h.id === hw.id ? { ...h, completed: true, completedAt: new Date().toISOString().split('T')[0] } : h
      );

      onUpdate({
        homework: updatedHw,
        petXp: (learner.petXp ?? 0) + finalPetXp,
        xp: learner.xp + Math.round(hw.xpReward * 0.5),
        coins: learner.coins + coinsEarned,
        streak: learner.streak + 1
      });

      feedPetWithHwXp(finalPetXp);
    } else {
      playClick();
      const updatedHw = (learner.homework || []).map(h =>
        h.id === hw.id ? { ...h, completed: false, completedAt: undefined } : h
      );
      onUpdate({ homework: updatedHw });
    }
  };

  // Save Tutor Feedback & Rating on Homework
  const saveTutorFeedback = (hwId: string) => {
    playQuestDing();
    const updatedHw = (learner.homework || []).map(h =>
      h.id === hwId ? { ...h, tutorFeedback: feedbackText.trim(), rating: feedbackRating } : h
    );
    onUpdate({ homework: updatedHw });
    setFeedbackHwId(null);
    setFeedbackText('');
  };

  // Create or Update Homework
  const handleSaveHw = () => {
    if (!hwForm.title?.trim()) return;
    playQuestDing();

    if (editingHw) {
      // Update existing
      const updatedHw = (learner.homework || []).map(h =>
        h.id === editingHw.id ? {
          ...h,
          title: hwForm.title!.trim(),
          description: hwForm.description?.trim() || '',
          dueDate: hwForm.dueDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          xpReward: Number(hwForm.xpReward) || 50,
          category: hwForm.category || 'speaking',
          priority: hwForm.priority || 'normal',
          imageUrl: hwForm.imageUrl || '',
          tutorFeedback: hwForm.tutorFeedback || h.tutorFeedback,
          rating: hwForm.rating || h.rating
        } : h
      );
      onUpdate({ homework: updatedHw });
      setEditingHw(null);
    } else {
      // Create new
      const newHwItem: Homework = {
        id: `hw-${Date.now()}`,
        title: hwForm.title!.trim(),
        description: hwForm.description?.trim() || '',
        dueDate: hwForm.dueDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        xpReward: Number(hwForm.xpReward) || 50,
        category: hwForm.category || 'speaking',
        priority: hwForm.priority || 'normal',
        imageUrl: hwForm.imageUrl || '',
        completed: false
      };
      onUpdate({ homework: [newHwItem, ...(learner.homework || [])] });
    }

    // Reset form
    setHwForm({
      title: '',
      description: '',
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      xpReward: 50,
      category: 'speaking',
      priority: 'normal',
      imageUrl: ''
    });
    setAddingHw(false);
  };

  const deleteHw = (id: string) => {
    playClick();
    onUpdate({ homework: (learner.homework || []).filter(h => h.id !== id) });
  };

  // Open Edit Homework
  const openEditHw = (hw: Homework) => {
    setEditingHw(hw);
    setHwForm({
      title: hw.title,
      description: hw.description,
      dueDate: hw.dueDate,
      xpReward: hw.xpReward,
      category: hw.category,
      priority: hw.priority || 'normal',
      imageUrl: hw.imageUrl || '',
      tutorFeedback: hw.tutorFeedback || '',
      rating: hw.rating || 5
    });
    setAddingHw(true);
  };

  // Helper to adjust number of custom steps in quest builder
  const handleSetStepCount = (count: number) => {
    const targetCount = Math.max(2, Math.min(10, count));
    if (targetCount === customSteps.length) return;

    if (targetCount > customSteps.length) {
      const added: typeof customSteps = [];
      for (let i = customSteps.length; i < targetCount; i++) {
        const isLast = i === targetCount - 1;
        added.push({
          id: `step-${Date.now()}-${i}`,
          emoji: isLast ? '🏆' : ['⭐', '📖', '⚡', '🧩', '💎', '🔥', '🌈'][i % 7],
          title: isLast ? `Step ${i + 1}: Final Mastery Gate` : `Step ${i + 1}: Checkpoint Challenge`,
          subtitle: `Define practice objective for step ${i + 1}`,
          xpReward: 25 + (i * 10)
        });
      }
      setCustomSteps([...customSteps, ...added]);
    } else {
      setCustomSteps(customSteps.slice(0, targetCount));
    }
  };

  // Select Map Template
  const handleSelectTemplate = (tpl: MapTemplate) => {
    setSelectedTemplate(tpl);
    setQuestTitle(tpl.name);
    setQuestEmoji(tpl.themeEmoji);
    setQuestSubtitle(tpl.description);
  };

  // Save or Generate Custom Quest Map
  const handleSaveQuestMap = () => {
    playLevelUpFanfare();

    const checkpoints: QuestCheckpoint[] = customSteps.map((step, idx) => ({
      id: `cp-${Date.now()}-${idx}`,
      title: step.title.trim() || `Step ${idx + 1}`,
      subtitle: step.subtitle.trim(),
      emoji: step.emoji || '⭐',
      challenge: step.subtitle.trim() || step.title.trim(),
      completed: false,
      xpReward: Number(step.xpReward) || 30
    }));

    if (editingQuestMapId) {
      // Update existing
      const updatedMaps = (learner.questMaps || []).map(q =>
        q.id === editingQuestMapId ? {
          ...q,
          title: questTitle.trim(),
          subtitle: questSubtitle.trim(),
          themeEmoji: questEmoji,
          mapImage: selectedTemplate.image,
          checkpoints
        } : q
      );
      onUpdate({ questMaps: updatedMaps });
      setEditingQuestMapId(null);
    } else {
      // Create new
      const newMap: QuestMap = {
        id: `quest-${Date.now()}`,
        title: questTitle.trim() || selectedTemplate.name,
        subtitle: questSubtitle.trim() || selectedTemplate.description,
        themeEmoji: questEmoji || selectedTemplate.themeEmoji,
        mapImage: selectedTemplate.image,
        checkpoints,
        createdAt: new Date().toISOString().split('T')[0]
      };
      onUpdate({ questMaps: [newMap, ...(learner.questMaps || [])] });
    }

    setShowQuestCreator(false);
  };

  // Open Edit Quest Map
  const openEditQuestMap = (quest: QuestMap) => {
    setEditingQuestMapId(quest.id);
    setQuestTitle(quest.title);
    setQuestEmoji(quest.themeEmoji);
    setQuestSubtitle(quest.subtitle || '');
    if (quest.mapImage) {
      const match = MAP_TEMPLATES.find(t => t.image === quest.mapImage);
      if (match) setSelectedTemplate(match);
    }
    setCustomSteps(quest.checkpoints.map(cp => ({
      id: cp.id,
      emoji: cp.emoji,
      title: cp.title,
      subtitle: cp.subtitle || cp.challenge,
      xpReward: cp.xpReward
    })));
    setShowQuestCreator(true);
  };

  // Delete Quest Map
  const deleteQuestMap = (id: string) => {
    playClick();
    onUpdate({ questMaps: (learner.questMaps || []).filter(q => q.id !== id) });
  };

  // Toggle checkpoint completion
  const toggleCheckpoint = (questId: string, cp: QuestCheckpoint) => {
    if (!cp.completed) {
      playCheckpointUnlock();
      const updatedMaps = (learner.questMaps || []).map(q => {
        if (q.id !== questId) return q;
        return {
          ...q,
          checkpoints: q.checkpoints.map(c => c.id === cp.id ? { ...c, completed: true } : c)
        };
      });
      onUpdate({
        questMaps: updatedMaps,
        xp: learner.xp + cp.xpReward,
        coins: learner.coins + Math.floor(cp.xpReward / 2),
        petXp: (learner.petXp ?? 0) + Math.floor(cp.xpReward / 2)
      });
    } else {
      playClick();
      const updatedMaps = (learner.questMaps || []).map(q => {
        if (q.id !== questId) return q;
        return {
          ...q,
          checkpoints: q.checkpoints.map(c => c.id === cp.id ? { ...c, completed: false } : c)
        };
      });
      onUpdate({ questMaps: updatedMaps });
    }
  };

  // Homework status helper
  const getHwStatus = (hw: Homework): 'completed' | 'dueSoon' | 'overdue' | 'active' => {
    if (hw.completed) return 'completed';
    const now = new Date().setHours(0, 0, 0, 0);
    const due = new Date(hw.dueDate).setHours(0, 0, 0, 0);
    if (due < now) return 'overdue';
    if (due - now <= 2 * 86400000) return 'dueSoon';
    return 'active';
  };

  // Filtered & Searched Homework List
  const filteredHomework = useMemo(() => {
    const list = learner.homework || [];
    return list.filter(hw => {
      // Status filter
      const status = getHwStatus(hw);
      if (statusFilter === 'active' && hw.completed) return false;
      if (statusFilter === 'completed' && !hw.completed) return false;
      if (statusFilter === 'dueSoon' && (hw.completed || status !== 'dueSoon')) return false;
      if (statusFilter === 'overdue' && (hw.completed || status !== 'overdue')) return false;

      // Category filter
      if (categoryFilter !== 'all' && hw.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = hw.title.toLowerCase().includes(q);
        const matchDesc = (hw.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      return true;
    });
  }, [learner.homework, statusFilter, categoryFilter, searchQuery]);

  // Homework Counts for Tabs
  const hwCounts = useMemo(() => {
    const list = learner.homework || [];
    let active = 0, dueSoon = 0, overdue = 0, completed = 0;
    list.forEach(h => {
      const s = getHwStatus(h);
      if (s === 'completed') completed++;
      else {
        active++;
        if (s === 'dueSoon') dueSoon++;
        if (s === 'overdue') overdue++;
      }
    });
    return { all: list.length, active, dueSoon, overdue, completed };
  }, [learner.homework]);

  return (
    <div className="space-y-6">

      {/* ── 1. Sleek Pet HW Companion & Streak Multiplier Bar (No Fairy Citadel) ── */}
      <div className={`p-4 sm:p-5 rounded-3xl border-3 shadow-md transition-all ${
        learner.theme === 'space'
          ? 'bg-slate-900/95 border-indigo-500/40 text-white'
          : learner.theme === 'fairy'
          ? 'bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 border-pink-200 text-purple-950'
          : learner.theme === 'ocean'
          ? 'bg-gradient-to-r from-cyan-50 via-blue-50 to-teal-50 border-cyan-200 text-blue-950'
          : 'bg-gradient-to-r from-emerald-50 via-green-50 to-lime-50 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Companion Info & Streak */}
          <div className="flex items-center gap-4 text-center sm:text-left">
            <motion.div
              animate={petFeedAnim ? { y: [-6, 0, -6, 0], scale: [1, 1.2, 1] } : { y: [0, -3, 0] }}
              transition={{ repeat: petFeedAnim ? 2 : Infinity, duration: petFeedAnim ? 0.3 : 2.5 }}
              onClick={() => feedPetWithHwXp(15)}
              className={`text-5xl sm:text-6xl cursor-pointer select-none relative ${petRarity.dropGlow}`}
              title="Click to give a treat!"
            >
              {petRank.emoji}
              {petFeedAnim && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: -20 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-3 -right-2 text-2xl"
                >
                  ❤️🍖✨
                </motion.span>
              )}
            </motion.div>

            <div>
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <h3 className="font-black text-lg sm:text-xl">
                  {learner.name.split(' ')[0]}'s {petRank.form} ({learner.petType})
                </h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${petRarity.badgeBg} ${petRarity.badgeText}`}>
                  Rank {petRank.rank} • {petRarity.rarity}
                </span>
              </div>
              <p className="text-xs font-bold text-gray-500 mt-0.5">
                Homework & Quest XP Feeds Companion Evolution
              </p>

              {/* Badges & Boost */}
              <div className="flex items-center gap-2 flex-wrap mt-2 justify-center sm:justify-start">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500/15 border border-orange-400/40 text-orange-700 font-black text-xs">
                  <Flame className="w-3.5 h-3.5 text-orange-500 animate-bounce" />
                  <span>{learner.streak} Day Streak ({streakMultiplier}x XP Boost)</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-800 font-black text-xs">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pet XP: {learner.petXp ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Feed Button & Dialogue */}
          <div className="flex flex-col items-center md:items-end gap-2 relative">
            <button
              onClick={() => feedPetWithHwXp(20)}
              className="py-2 px-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <Heart className="w-3.5 h-3.5 fill-white" /> Feed Companion Treat (+20 XP)
            </button>

            {petDialogue && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-100 border border-amber-300 text-amber-950 font-black text-[10px] p-2 rounded-xl shadow-lg w-56 text-center"
              >
                {petDialogue}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Custom Quest Adventure Builder & Interactive Adventure Maps ── */}
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 ${
        learner.theme === 'space' ? 'border-indigo-500/40 bg-slate-900/90' :
        learner.theme === 'fairy' ? 'border-pink-200 bg-white/90' :
        learner.theme === 'ocean' ? 'border-cyan-200 bg-white/90' :
        'border-emerald-200 bg-white/90'
      } shadow-xl space-y-5`}>
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-xl font-black ${learner.theme === 'space' ? 'text-white' : 'text-indigo-950'}`}>
                🗺️ Custom Quest Adventure Trails
              </h3>
              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black rounded-full uppercase">
                {(learner.questMaps || []).length} Active Maps
              </span>
            </div>
            <p className={`text-xs font-bold ${learner.theme === 'space' ? 'text-indigo-200' : 'text-gray-500'}`}>
              Define custom multi-step learning adventures with real scenic map templates, custom checkpoints, and audio read-aloud.
            </p>
          </div>

          <button
            onClick={() => {
              playClick();
              if (showQuestCreator) {
                setShowQuestCreator(false);
                setEditingQuestMapId(null);
              } else {
                setEditingQuestMapId(null);
                setShowQuestCreator(true);
              }
            }}
            className={`px-4 py-2.5 bg-gradient-to-r ${ts.btn} text-white font-black rounded-xl text-xs cursor-pointer flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all`}
          >
            <Plus className="w-4 h-4" /> {showQuestCreator ? 'Close Builder' : 'Build Custom Quest Adventure'}
          </button>
        </div>

        {/* ── Quest Adventure Builder Form (Tutor defines ALL steps & chooses Real Image Template) ── */}
        <AnimatePresence>
          {showQuestCreator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-5 rounded-3xl border-3 bg-purple-50/90 border-purple-300/80 space-y-5 shadow-lg overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-purple-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    {editingQuestMapId ? 'Edit Quest Adventure Map' : 'Build Custom Quest Adventure (No Mock Data)'}
                  </h4>
                  <p className="text-xs text-purple-800 font-bold">
                    Choose a real scenery template, then define the exact title, emoji, subtitle challenge, and XP for every step.
                  </p>
                </div>
                <button
                  onClick={() => setShowQuestCreator(false)}
                  className="p-1.5 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-purple-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Real Images Map Template Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-purple-900 block flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  Select Scenic Map Template:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {MAP_TEMPLATES.map((tpl) => {
                    const isSelected = selectedTemplate.id === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleSelectTemplate(tpl)}
                        className={`relative rounded-2xl overflow-hidden cursor-pointer border-3 transition-all ${
                          isSelected
                            ? 'border-purple-600 ring-2 ring-purple-400 scale-102 shadow-md'
                            : 'border-purple-200 hover:border-purple-300 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="h-20 w-full relative">
                          <img
                            src={tpl.image}
                            alt={tpl.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                          <span className="absolute top-1 right-1 text-lg">{tpl.themeEmoji}</span>
                          <span className="absolute bottom-1 left-1.5 right-1.5 text-[10px] font-black text-white truncate">
                            {tpl.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Quest Title, Emoji & Subtitle Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-purple-900 block mb-1">Emoji</label>
                  <input
                    value={questEmoji}
                    onChange={(e) => setQuestEmoji(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-purple-200 rounded-xl text-2xl text-center font-black outline-none focus:border-purple-500"
                    placeholder="🌌"
                  />
                </div>
                <div className="sm:col-span-6">
                  <label className="text-[10px] font-black uppercase text-purple-900 block mb-1">Quest Adventure Title</label>
                  <input
                    value={questTitle}
                    onChange={(e) => setQuestTitle(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-purple-200 rounded-xl font-black text-sm outline-none focus:border-purple-500"
                    placeholder="Quest Title (e.g. Star Spelling Voyage)..."
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="text-[10px] font-black uppercase text-purple-900 block mb-1">
                    Number of Steps ({customSteps.length})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetStepCount(customSteps.length - 1)}
                      disabled={customSteps.length <= 2}
                      className="px-3 py-2 bg-white border-2 border-purple-200 font-black rounded-xl text-xs hover:bg-purple-100 disabled:opacity-40 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={customSteps.length}
                      onChange={(e) => handleSetStepCount(parseInt(e.target.value) || 2)}
                      className="w-full p-2 bg-white border-2 border-purple-200 rounded-xl font-black text-center text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSetStepCount(customSteps.length + 1)}
                      disabled={customSteps.length >= 10}
                      className="px-3 py-2 bg-white border-2 border-purple-200 font-black rounded-xl text-xs hover:bg-purple-100 disabled:opacity-40 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-12">
                  <label className="text-[10px] font-black uppercase text-purple-900 block mb-1">Adventure Overview / Subtitle</label>
                  <input
                    value={questSubtitle}
                    onChange={(e) => setQuestSubtitle(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-purple-200 rounded-xl font-bold text-xs outline-none focus:border-purple-500"
                    placeholder="Short description of this learning adventure..."
                  />
                </div>
              </div>

              {/* 3. Tutor Step Editor — Define all steps individually */}
              <div className="space-y-3 pt-1 border-t border-purple-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-purple-950 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                    Customize All {customSteps.length} Steps (Titles, Challenges & XP):
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSetStepCount(customSteps.length + 1)}
                    className="text-[11px] font-black text-purple-700 hover:text-purple-900 bg-purple-100 px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {customSteps.map((step, sIdx) => (
                    <div
                      key={step.id || sIdx}
                      className="p-3 bg-white border-2 border-purple-200 rounded-2xl shadow-xs space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {sIdx + 1}
                        </span>
                        <input
                          value={step.emoji}
                          onChange={(e) => {
                            const copy = [...customSteps];
                            copy[sIdx].emoji = e.target.value;
                            setCustomSteps(copy);
                          }}
                          className="w-12 p-1.5 bg-purple-50 border border-purple-200 rounded-xl text-center text-lg font-black outline-none"
                          placeholder="⭐"
                          title="Step Emoji"
                        />
                        <input
                          value={step.title}
                          onChange={(e) => {
                            const copy = [...customSteps];
                            copy[sIdx].title = e.target.value;
                            setCustomSteps(copy);
                          }}
                          className="flex-1 p-1.5 bg-white border border-purple-200 rounded-xl font-black text-xs outline-none focus:border-purple-400"
                          placeholder={`Step ${sIdx + 1} Title (e.g. Word Spark)`}
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <label className="text-[10px] font-black text-amber-700">XP:</label>
                          <input
                            type="number"
                            min={10}
                            max={200}
                            value={step.xpReward}
                            onChange={(e) => {
                              const copy = [...customSteps];
                              copy[sIdx].xpReward = parseInt(e.target.value) || 25;
                              setCustomSteps(copy);
                            }}
                            className="w-16 p-1.5 bg-amber-50 border border-amber-300 rounded-xl font-black text-xs text-center outline-none"
                          />
                        </div>
                        {customSteps.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const copy = customSteps.filter((_, i) => i !== sIdx);
                              setCustomSteps(copy);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                            title="Remove step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Subtitle / Challenge description input */}
                      <input
                        value={step.subtitle}
                        onChange={(e) => {
                          const copy = [...customSteps];
                          copy[sIdx].subtitle = e.target.value;
                          setCustomSteps(copy);
                        }}
                        className="w-full p-2 bg-gray-50 border border-purple-100 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-purple-400"
                        placeholder={`Challenge / Subtitle for Step ${sIdx + 1} (e.g., Pronounce 3 target words clearly)`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSaveQuestMap}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl text-xs cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {editingQuestMapId ? 'Update Quest Trail' : 'Launch Custom Quest Adventure'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuestCreator(false)}
                  className="px-5 py-3 bg-gray-200 text-gray-700 font-black rounded-2xl text-xs cursor-pointer hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Rendered Quest Adventure Maps ── */}
        <div className="space-y-6">
          {(learner.questMaps || []).length === 0 && (
            <div className="text-center py-8 space-y-2 border-2 border-dashed border-purple-200 rounded-3xl bg-purple-50/50">
              <div className="text-4xl">🗺️✨</div>
              <p className="text-sm font-black text-purple-950">No custom quest adventure trails created yet.</p>
              <p className="text-xs text-gray-500 font-bold max-w-md mx-auto">
                Click "Build Custom Quest Adventure" above to choose a real map template and define custom step checkpoints for your learner!
              </p>
              <button
                onClick={() => setShowQuestCreator(true)}
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-sm"
              >
                + Create First Quest Trail
              </button>
            </div>
          )}

          {(learner.questMaps || []).map((quest: QuestMap) => {
            const completedCount = quest.checkpoints.filter(c => c.completed).length;
            const progressPct = Math.round((completedCount / quest.checkpoints.length) * 100);
            const mapImage = quest.mapImage || MAP_TEMPLATES[0].image;

            return (
              <div
                key={quest.id}
                className="rounded-3xl border-3 border-purple-300/70 overflow-hidden shadow-lg bg-slate-900 relative"
              >
                {/* Real Template Image Backdrop with Overlay */}
                <div className="relative h-32 sm:h-36 w-full overflow-hidden">
                  <img
                    src={mapImage}
                    alt={quest.title}
                    className="w-full h-full object-cover filter saturate-125"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                  {/* Header info over map image */}
                  <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl sm:text-4xl filter drop-shadow-md">{quest.themeEmoji}</span>
                        <div>
                          <h4 className="text-base sm:text-xl font-black text-white tracking-wide drop-shadow-sm">
                            {quest.title}
                          </h4>
                          {quest.subtitle && (
                            <p className="text-xs font-bold text-purple-200 line-clamp-1">
                              {quest.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Map Controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditQuestMap(quest)}
                          className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-xs text-xs font-black cursor-pointer"
                          title="Edit Quest Trail"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteQuestMap(quest.id)}
                          className="p-1.5 bg-red-500/30 hover:bg-red-500/50 text-white rounded-xl backdrop-blur-xs cursor-pointer"
                          title="Delete Quest Trail"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-black text-white">
                        <span>Checkpoints Progress</span>
                        <span>{completedCount} / {quest.checkpoints.length} Cleared ({progressPct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkpoint Nodes Trail Canvas */}
                <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-950 to-slate-900 relative">
                  {/* Decorative curved SVG connection line */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                    <path
                      d="M 60 80 Q 240 20 440 80 T 800 80"
                      stroke="#c084fc"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="12 8"
                    />
                  </svg>

                  {/* Step Nodes Grid */}
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    {quest.checkpoints.map((cp, idx) => (
                      <motion.div
                        key={cp.id || idx}
                        whileHover={{ scale: 1.04, y: -3 }}
                        className={`p-3.5 rounded-2xl border-2 transition-all shadow-md relative flex flex-col justify-between ${
                          cp.completed
                            ? 'bg-emerald-950/80 border-emerald-400 text-emerald-100 ring-2 ring-emerald-500/40'
                            : 'bg-slate-800/90 border-purple-500/40 text-white'
                        }`}
                      >
                        {/* Audio speaker button */}
                        <button
                          onClick={() => {
                            playClick();
                            speakText(`${cp.title}. ${cp.subtitle || cp.challenge}`);
                          }}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-purple-300 rounded-full cursor-pointer"
                          title="Listen to challenge instructions"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="text-center my-1">
                          <button
                            onClick={() => toggleCheckpoint(quest.id, cp)}
                            className="text-4xl cursor-pointer block mx-auto transform active:scale-90 transition-transform select-none hover:scale-110"
                            title={cp.completed ? "Completed! Click to undo" : "Click to clear checkpoint!"}
                          >
                            {cp.completed ? '✅' : cp.emoji}
                          </button>
                          <p className="font-black text-xs truncate mt-2 text-white">{cp.title}</p>
                          <p className="text-[11px] font-medium text-purple-200 line-clamp-2 my-1 min-h-[32px]">
                            {cp.subtitle || cp.challenge}
                          </p>
                        </div>

                        <div className="w-full flex items-center justify-between gap-1 pt-2 border-t border-white/10 mt-1">
                          <span className="text-[10px] font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-md">
                            +{cp.xpReward} XP
                          </span>
                          <button
                            onClick={() => toggleCheckpoint(quest.id, cp)}
                            className={`text-[10px] font-black px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                              cp.completed
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                            }`}
                          >
                            {cp.completed ? 'CLEARED' : 'CLAIM XP'}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Homework Quest Center (Pure Definition & Comprehensive Tracking) ── */}
      <div className={`${ts.card} backdrop-blur-md rounded-3xl p-5 border-4 ${
        learner.theme === 'space' ? 'border-indigo-500/40 bg-slate-900/90' :
        learner.theme === 'fairy' ? 'border-pink-200 bg-white/90' :
        learner.theme === 'ocean' ? 'border-cyan-200 bg-white/90' :
        'border-emerald-200 bg-white/90'
      } shadow-xl space-y-5`}>

        {/* Board Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-xl font-black ${learner.theme === 'space' ? 'text-white' : 'text-indigo-950'}`}>
                📝 Homework Quest Center
              </h3>
              <span className="text-xs font-black bg-pink-100 text-pink-700 px-2.5 py-0.5 rounded-full">
                {hwCounts.active} Pending / {hwCounts.all} Total
              </span>
            </div>
            <p className={`text-xs font-bold ${learner.theme === 'space' ? 'text-indigo-200' : 'text-gray-500'}`}>
              Define homework assignments, track submissions, award custom teacher sticker stamps, and rate student work.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowCustomStampModal(true)}
              className="px-3.5 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-black rounded-xl text-xs cursor-pointer flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Award className="w-4 h-4 text-amber-700" /> Sticker Stamps Tray
            </button>

            <button
              onClick={() => {
                playClick();
                setEditingHw(null);
                setHwForm({
                  title: '',
                  description: '',
                  dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
                  xpReward: 50,
                  category: 'speaking',
                  priority: 'normal',
                  imageUrl: ''
                });
                setAddingHw(!addingHw);
              }}
              className={`px-4 py-2.5 bg-gradient-to-r ${ts.btn} text-white font-black rounded-xl text-xs cursor-pointer flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all`}
            >
              <Plus className="w-4 h-4" /> {addingHw ? 'Close Form' : 'Assign Homework'}
            </button>
          </div>
        </div>

        {/* ── Assign / Edit Homework Form ── */}
        <AnimatePresence>
          {addingHw && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-5 bg-indigo-50/95 border-3 border-indigo-200 rounded-3xl overflow-hidden space-y-4 shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  {editingHw ? 'Edit Homework Assignment' : 'Define New Homework Assignment'}
                </p>
                <button
                  onClick={() => setAddingHw(false)}
                  className="p-1 text-gray-500 hover:text-gray-800 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-900 block mb-1">Homework Title</label>
                  <input
                    value={hwForm.title}
                    onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
                    placeholder="e.g. Unit 3 Animal Vocabulary & Read-Aloud..."
                    className="w-full p-2.5 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-900 block mb-1">Subject / Category</label>
                  <select
                    value={hwForm.category}
                    onChange={(e) => setHwForm({ ...hwForm, category: e.target.value as any })}
                    className="w-full p-2.5 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="speaking">🗣️ Speaking & Pronunciation</option>
                    <option value="reading">📖 Story & Reading</option>
                    <option value="grammar">✍️ Grammar & Sentences</option>
                    <option value="vocab">🧩 Vocabulary & Phonics</option>
                    <option value="writing">📝 Creative Writing & Spelling</option>
                    <option value="math">🔢 Math & Logic Fun</option>
                    <option value="project">🎨 Creative Project</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-indigo-900 block mb-1">
                  Assignment Instructions & Practice Prompts
                </label>
                <textarea
                  value={hwForm.description}
                  onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })}
                  placeholder="Provide clear steps, reading sentences, or recording directions for the student..."
                  rows={3}
                  className="w-full p-2.5 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none resize-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-600 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={hwForm.dueDate}
                    onChange={(e) => setHwForm({ ...hwForm, dueDate: e.target.value })}
                    className="w-full p-2 bg-white border-2 border-indigo-200 rounded-xl font-bold text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-600 block mb-1">🐾 Pet XP Reward</label>
                  <input
                    type="number"
                    value={hwForm.xpReward}
                    onChange={(e) => setHwForm({ ...hwForm, xpReward: parseInt(e.target.value) || 40 })}
                    min={10}
                    max={300}
                    className="w-full p-2 bg-white border-2 border-indigo-200 rounded-xl font-black text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-600 block mb-1">Priority</label>
                  <select
                    value={hwForm.priority}
                    onChange={(e) => setHwForm({ ...hwForm, priority: e.target.value as any })}
                    className="w-full p-2 bg-white border-2 border-indigo-200 rounded-xl font-bold text-xs outline-none"
                  >
                    <option value="normal">🟢 Normal</option>
                    <option value="high">🟡 High Priority</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-600 block mb-1">Image URL (Optional)</label>
                  <input
                    value={hwForm.imageUrl}
                    onChange={(e) => setHwForm({ ...hwForm, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash..."
                    className="w-full p-2 bg-white border-2 border-indigo-200 rounded-xl font-bold text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveHw}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> {editingHw ? 'Update Homework' : 'Assign to Learner'}
                </button>
                <button
                  type="button"
                  onClick={() => setAddingHw(false)}
                  className="px-5 py-3 bg-gray-200 text-gray-700 font-black rounded-xl text-xs cursor-pointer hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Filter Tabs & Search Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Status filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: `🌟 All (${hwCounts.all})` },
              { id: 'active', label: `⏳ Active (${hwCounts.active})` },
              { id: 'dueSoon', label: `⏰ Due Soon (${hwCounts.dueSoon})` },
              { id: 'overdue', label: `⚠️ Overdue (${hwCounts.overdue})` },
              { id: 'completed', label: `✅ Mastered (${hwCounts.completed})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  playClick();
                  setStatusFilter(tab.id as any);
                }}
                className={`px-3 py-1.5 rounded-xl font-black text-xs whitespace-nowrap cursor-pointer transition-all ${
                  statusFilter === tab.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : learner.theme === 'space'
                    ? 'bg-slate-800 text-indigo-200 hover:bg-slate-700'
                    : 'bg-white/90 text-gray-600 hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Category select */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search homework..."
                className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-purple-500 w-36 sm:w-48"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
            >
              <option value="all">All Subjects</option>
              <option value="speaking">🗣️ Speaking</option>
              <option value="reading">📖 Reading</option>
              <option value="grammar">✍️ Grammar</option>
              <option value="vocab">🧩 Vocabulary</option>
              <option value="writing">📝 Writing</option>
              <option value="math">🔢 Math</option>
              <option value="project">🎨 Project</option>
            </select>
          </div>
        </div>

        {/* ── Homework Cards List ── */}
        <div className="space-y-3.5">
          {filteredHomework.length === 0 && (
            <div className="text-center py-12 space-y-2 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <div className="text-4xl">📚✨</div>
              <p className="text-sm font-black text-gray-600">No homework found in this filter view.</p>
              <p className="text-xs text-gray-400 font-bold">
                Assign a new homework quest above to keep track of assignments!
              </p>
            </div>
          )}

          {filteredHomework.map((hw) => {
            const status = getHwStatus(hw);
            const daysLeft = Math.ceil((new Date(hw.dueDate).getTime() - Date.now()) / 86400000);

            return (
              <motion.div
                key={hw.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all shadow-sm ${
                  hw.completed
                    ? 'bg-emerald-50/90 border-emerald-300'
                    : status === 'overdue'
                    ? 'bg-red-50/90 border-red-300 ring-1 ring-red-200'
                    : status === 'dueSoon'
                    ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-200'
                    : learner.theme === 'space'
                    ? 'bg-slate-800/90 border-indigo-500/30 text-white'
                    : 'bg-white border-purple-100 text-slate-900'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                  {/* Left content */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="text-3xl p-2.5 rounded-2xl bg-purple-100/70 shrink-0 text-center">
                      {hw.category === 'speaking' ? '🗣️' :
                       hw.category === 'reading' ? '📖' :
                       hw.category === 'grammar' ? '✍️' :
                       hw.category === 'vocab' ? '🧩' :
                       hw.category === 'writing' ? '📝' :
                       hw.category === 'math' ? '🔢' : '🎨'}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-black text-sm sm:text-base ${hw.completed ? 'line-through text-gray-500' : ''}`}>
                          {hw.title}
                        </h4>

                        {/* Pet XP reward pill */}
                        <span className="text-[10px] font-black bg-pink-100 text-pink-700 px-2.5 py-0.5 rounded-full">
                          🐾 +{Math.round(hw.xpReward * streakMultiplier)} Pet XP
                        </span>

                        {/* Priority Badge */}
                        {hw.priority === 'urgent' && (
                          <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-300">
                            🔴 URGENT
                          </span>
                        )}
                        {hw.priority === 'high' && (
                          <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                            🟡 HIGH
                          </span>
                        )}

                        {/* Teacher Sticker Stamp (Editable) */}
                        {hw.stickerStamp && (
                          <span
                            onClick={() => setStampPickerHwId(stampPickerHwId === hw.id ? null : hw.id)}
                            className="text-[10px] font-black bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse cursor-pointer shadow-xs"
                            title="Click to change or remove teacher stamp"
                          >
                            🏅 {hw.stickerStamp}
                          </span>
                        )}
                      </div>

                      {/* Instructions */}
                      {hw.description && (
                        <p className="text-xs font-bold text-gray-600 whitespace-pre-line leading-relaxed">
                          {hw.description}
                        </p>
                      )}

                      {/* Attached Image if any */}
                      {hw.imageUrl && (
                        <div className="pt-1">
                          <img
                            src={hw.imageUrl}
                            alt="Homework reference"
                            className="max-h-32 rounded-xl object-cover border border-purple-200"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {/* Metadata Row */}
                      <div className="flex items-center gap-3 flex-wrap pt-1 text-xs">
                        {/* Audio speaker read-aloud */}
                        <button
                          onClick={() => {
                            playClick();
                            speakText(`${hw.title}. ${hw.description || ''}`);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md cursor-pointer transition-all"
                        >
                          <Volume2 className="w-3 h-3" /> Read Aloud
                        </button>

                        <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          Due: {new Date(hw.dueDate).toLocaleDateString()}
                        </span>

                        {/* Status Countdown */}
                        {!hw.completed && status === 'overdue' && (
                          <span className="text-[9px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Overdue by {Math.abs(daysLeft)}d
                          </span>
                        )}
                        {!hw.completed && status === 'dueSoon' && (
                          <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due {daysLeft <= 0 ? 'Today' : `in ${daysLeft}d`}
                          </span>
                        )}
                        {hw.completed && (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Mastered {hw.completedAt || 'Recently'}
                          </span>
                        )}
                      </div>

                      {/* Tutor Feedback Note & Rating (if given) */}
                      {(hw.tutorFeedback || hw.rating) && (
                        <div className="mt-2 p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-xs flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-purple-900 text-[11px]">Tutor Feedback:</span>
                              {hw.rating && (
                                <span className="text-amber-500 text-xs font-bold">
                                  {'★'.repeat(hw.rating)}{'☆'.repeat(5 - hw.rating)}
                                </span>
                              )}
                            </div>
                            {hw.tutorFeedback && (
                              <p className="font-bold text-gray-700 text-[11px] mt-0.5">{hw.tutorFeedback}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                    {/* Award Teacher Stamp */}
                    <button
                      onClick={() => setStampPickerHwId(stampPickerHwId === hw.id ? null : hw.id)}
                      className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl cursor-pointer text-xs font-black flex items-center gap-1 shadow-xs transition-all"
                      title="Award or change teacher sticker stamp"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-700" />
                      <span>{hw.stickerStamp ? 'Edit Stamp' : 'Sticker'}</span>
                    </button>

                    {/* Tutor Feedback button */}
                    <button
                      onClick={() => {
                        setFeedbackHwId(hw.id);
                        setFeedbackText(hw.tutorFeedback || '');
                        setFeedbackRating(hw.rating || 5);
                      }}
                      className="p-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl cursor-pointer text-xs font-black"
                      title="Add or edit tutor review note & rating"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => openEditHw(hw)}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl cursor-pointer"
                      title="Edit homework details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Mark Done / Reopen */}
                    <button
                      onClick={() => toggleHomeworkComplete(hw)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1 shadow-xs transition-all ${
                        hw.completed
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{hw.completed ? 'Reopen' : 'Mark Done'}</span>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => deleteHw(hw.id)}
                      className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-xl cursor-pointer"
                      title="Delete homework"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Teacher Sticker Stamp Picker Drawer ── */}
                <AnimatePresence>
                  {stampPickerHwId === hw.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2.5 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black uppercase text-amber-950 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-700" /> Award Magical Teacher Stamp:
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowCustomStampModal(true)}
                            className="text-[10px] font-black text-purple-700 hover:underline cursor-pointer"
                          >
                            + Create Custom Stamp
                          </button>
                          {hw.stickerStamp && (
                            <button
                              onClick={() => removeStickerStamp(hw.id)}
                              className="text-[10px] font-black text-red-600 hover:underline cursor-pointer"
                            >
                              Remove Current Stamp
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {allStamps.map(stamp => (
                          <button
                            key={stamp.id}
                            onClick={() => applyStickerStamp(hw.id, stamp)}
                            className="px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-xl text-xs font-black text-amber-950 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                          >
                            <span>{stamp.emoji}</span>
                            <span>{stamp.name}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Tutor Review & Star Rating Modal ── */}
      <AnimatePresence>
        {feedbackHwId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border-4 border-purple-300 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-black text-base text-indigo-950 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  Tutor Review & Star Rating
                </h4>
                <button
                  onClick={() => setFeedbackHwId(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Star Rating Selector */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-gray-500">Student Performance Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`text-2xl cursor-pointer transition-transform hover:scale-125 ${
                        star <= feedbackRating ? 'text-amber-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-gray-500">Teacher Encouragement & Feedback</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g. Fantastic pronunciation and sentence rhythm today! Keep up the stellar work!"
                  rows={3}
                  className="w-full p-3 bg-purple-50 border-2 border-purple-200 rounded-xl font-bold text-xs outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => saveTutorFeedback(feedbackHwId)}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-md"
                >
                  Save Feedback & Rating
                </button>
                <button
                  onClick={() => setFeedbackHwId(null)}
                  className="px-4 py-2.5 bg-gray-200 text-gray-700 font-black rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 5. Custom Teacher Sticker Stamp Creator Modal ── */}
      <AnimatePresence>
        {showCustomStampModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border-4 border-amber-300 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">🏅</span>
                  <div>
                    <h4 className="font-black text-lg text-indigo-950">Teacher Sticker Stamps Tray</h4>
                    <p className="text-xs font-bold text-gray-500">Create & manage custom teacher motivational stamps</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomStampModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Creator Inputs */}
              <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-200 space-y-3">
                <p className="text-xs font-black uppercase text-amber-900">✨ Create New Custom Stamp</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Emoji</label>
                    <input
                      value={newStampEmoji}
                      onChange={(e) => setNewStampEmoji(e.target.value)}
                      placeholder="🏆"
                      className="w-full p-2 bg-white border-2 border-amber-200 rounded-xl text-center text-xl font-black outline-none"
                    />
                  </div>
                  <div className="sm:col-span-9">
                    <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Stamp Name</label>
                    <input
                      value={newStampName}
                      onChange={(e) => setNewStampName(e.target.value)}
                      placeholder="e.g. SUPER SPELLER, BRAVE VOICE..."
                      className="w-full p-2 bg-white border-2 border-amber-200 rounded-xl font-black text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Quick Emoji presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black text-gray-500">Quick Emojis:</span>
                  {['🏆', '🎖️', '🦖', '🌟', '🦄', '🎯', '💡', '🚀', '💎', '🔥', '👑', '🌈', '⚡', '🦉'].map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewStampEmoji(em)}
                      className="p-1 bg-white hover:bg-amber-100 rounded-lg text-sm border border-amber-200 cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCreateCustomStamp}
                  disabled={!newStampName.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-black rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  + Add Custom Stamp to Collection
                </button>
              </div>

              {/* Existing Stamps Display */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase text-gray-600">Available Stamps Collection:</p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {allStamps.map(stamp => (
                    <div
                      key={stamp.id}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black flex items-center gap-1.5"
                    >
                      <span>{stamp.emoji}</span>
                      <span>{stamp.name}</span>
                      {stamp.isCustom && (
                        <button
                          onClick={() => handleDeleteCustomStamp(stamp.id)}
                          className="ml-1 text-gray-400 hover:text-red-500 cursor-pointer"
                          title="Delete custom stamp"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowCustomStampModal(false)}
                  className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-black rounded-xl text-xs cursor-pointer"
                >
                  Close Tray
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
