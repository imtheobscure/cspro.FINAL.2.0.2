/* ════════════════════════════════════════════════════════════════════════════
   🧩 Shared TypeScript Types for Kids Learning Kingdom
   ════════════════════════════════════════════════════════════════════════════ */

import type { SavedKidLesson } from './utils/lessonCreatorTypes';
import type { SavedKidGame } from './utils/kidGameCatalog';

export type ThemeType = 'fairy' | 'space' | 'ocean' | 'jungle';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type LeaderboardPeriod = 'all-time' | 'week' | 'month';
export type Mood = 'happy' | 'focused' | 'tired' | 'excited' | 'sick';
export type Gender = 'Male' | 'Female' | 'PreferNotToSay';

export type AvatarArchetype =
  | 'Fairy' | 'Vampire' | 'Mermaid' | 'Genie' | 'Zombie'
  | 'Elf' | 'Superhero' | 'Supervillain' | 'Mage' | 'Baby' | 'Troll';

export type PetType = 'Cat' | 'Dog' | 'Bird' | 'Fish' | 'Lizard' | 'Snake' | 'Turtle';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  expiresAt?: string;
  durationDays?: number;
}

export interface LandItem {
  id: string;
  emoji: string;
  name: string;
  row?: number;
  col?: number;
  // 3D Canvas properties
  x?: number; // percentage (0-100) or pixels
  y?: number; // percentage (0-100) or pixels
  size?: number; // scale/pixel size (default ~48)
  rotation?: number; // degrees (-180 to 180)
  elevation?: number; // 3D depth/height off the canvas (1-5)
  animation?: 'float' | 'spin' | 'pulse' | 'bounce' | 'none';
  customColor?: string;
  flipH?: boolean;
}

export interface StoreItem {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  stock: number;
  effect: 'attack' | 'defense' | 'heal' | 'land' | 'cosmetic';
  effectValue?: number;
  category?: 'potion' | 'food' | 'land' | 'avatar' | 'pet' | 'special';
  rarity?: Rarity;
  description?: string;
}

export interface Skills {
  pronunciation: number;
  grammar: number;
  vocabulary: number;
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
  [key: string]: number; // Allow custom skills
}

export interface Weakness {
  id: string;
  name: string;
  points: number;
  completed: boolean;
  dateAdded: string;
}

export interface LessonRecord {
  id: string;
  date: string;
  topic: string;
  xpEarned: number;
  duration: number;
  strengths: string[];
  weaknesses: string[];
}

export interface Flashcard { id: string; front: string; back: string; }
export interface FeedbackEntry { id: string; date: string; note: string; }

export interface SessionLog {
  id: string;
  date: string;
  duration: number;
  xpEarned: number;
  strengths: Array<{ text: string; points: number }>;
  weaknesses: Array<{ text: string; points: number }>;
  summary: string;
  transcript?: string;
  aiAnalysis?: {
    competencies: Record<string, number>;
    newSkills: string[];
    facts: string[];
    homework: string[];
    message: string;
  };
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  xpReward: number;
  completed: boolean;
  completedAt?: string;
  category?: 'speaking' | 'reading' | 'grammar' | 'vocab' | 'creative' | 'writing' | 'math' | 'project';
  imageUrl?: string;
  stickerStamp?: string;
  practiceType?: 'read_aloud' | 'unscramble' | 'quiz' | 'free_talk';
  practiceContent?: string;
  practiceOptions?: string[];
  practiceAnswer?: string;
  difficulty?: 'easy' | 'medium' | 'boss';
  priority?: 'normal' | 'high' | 'urgent';
  tutorFeedback?: string;
  rating?: number;
  submissionNote?: string;
}

export interface QuestCheckpoint {
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  challenge: string;
  completed: boolean;
  xpReward: number;
  type?: 'pronounce' | 'unscramble' | 'story' | 'quiz';
  targetWord?: string;
  scrambleLetters?: string[];
  audioNarration?: string;
}

export interface QuestMap {
  id: string;
  title: string;
  themeEmoji: string;
  mapImage?: string;
  subtitle?: string;
  checkpoints: QuestCheckpoint[];
  createdAt: string;
}

export interface CustomEvolutionRank {
  rank: number;
  xpNeeded: number;
  form: string;
  emoji: string;
  rarity?: EvolutionRarity;
}

export interface LearnerTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetClasses: number;
  completedClasses: number;
  cancelledClasses: number;
  notes?: string;
}

export interface Learner {
  id: string;
  name: string;
  age?: number;
  avatar: string;
  /** Optional learner photo stored as a data URL for offline use. */
  photoDataUrl?: string;
  /** Optional additional adventurer photos stored as data URLs. */
  adventurerPhotos?: Array<{ id: string; name: string; photoDataUrl: string }>;
  gender: Gender;
  avatarArchetype: AvatarArchetype;
  petType: PetType;
  theme: ThemeType;
  country: string;
  city?: string;
  status: 'active' | 'graduated' | 'inactive';
  joinDate: string;
  lastActive?: string;
  xp: number;
  level?: number;
  coins: number;
  streak: number;
  attack: number;
  defense: number;
  mood: Mood;
  totalSessions: number;
  totalMinutes: number;
  favoriteSubject: string;
  tags: string[];
  badges: Badge[];
  skills: Skills;
  weaknesses?: Weakness[];
  interests: string[];
  hobbies?: string[];
  coursePlan: string[];
  landItems: LandItem[];
  dialogueText: string;
  parentName?: string;
  parentPhone?: string;
  contactEmail?: string;
  nativeLang?: string;
  targetLang?: string;
  spokenLanguages?: string[];
  learningStyle?: 'Visual' | 'Auditory' | 'Kinesthetic' | 'Reading' | string;
  placementScore?: number;
  sessionFrequency?: string;
  parentExpectations?: string[];
  expectations?: string;
  targetCEFR?: 'A1' | 'A2' | 'B1' | 'B2';
  achievements?: string[];
  completedQuests?: string[];
  currentQuests?: string[];
  purchasedRewards?: string[];
  parentNotes?: string[];
  dailyXP?: number[];
  lessonHistory?: LessonRecord[];
  flashcards?: Flashcard[];
  feedbackLog?: FeedbackEntry[];
  dripToggles?: { welcome: boolean; weeklyReminder: boolean };
  ownedItems?: string[];
  birthday?: string;
  petXp: number; // Separate XP for pet evolution
  sessionLogs?: SessionLog[];
  customSkillMetas?: Record<string, { name?: string; emoji?: string; image?: string; tag?: string }>;
  homework?: Homework[];
  talkingMood?: {
    emoji: string;
    text: string;
    dialogues: string[];
    voiceName: string;
  };
  avatarVoice?: string;
  petVoice?: string;
  teacherVoice?: string;
  smartGoals?: Array<{
    goal: string;
    target: number;
    current: number;
    unit: string;
  }>;
  calendarEvents?: Array<{
    id: string;
    title: string;
    type: string;
    date: string;
    recurring?: string;
  }>;
  questMaps?: QuestMap[];
  customAvatarRoadmap?: CustomEvolutionRank[];
  customPetRoadmap?: CustomEvolutionRank[];
  terms?: LearnerTerm[];
  /**
   * Lessons built in the Lesson Creator tab.
   *
   * They live on the learner rather than in a drawer of their own so that a lesson
   * follows the child: the same IndexedDB snapshot, the same JSON export, the same
   * folder backup — a tutor who moves a profile to another machine keeps the lessons.
   */
  savedLessons?: SavedKidLesson[];
  /**
   * Games built in the Game Studio, kept for the next lesson.
   *
   * Separate from `savedLessons` because they are a different thing in the room: a lesson
   * is what the tutor teaches from, a game is what the class plays on the screen.
   */
  savedGames?: SavedKidGame[];
}

export interface TeacherProfile {
  name: string;
  characterEmoji: string;
  characterName: string;
  bio: string;
  teachingStyle: string;
  interests: string[];
  greeting: string;
  storeOwnerTitle: string;
}

export interface WorkspaceSettings {
  aiProvider: 'OpenAI' | 'Claude' | 'Gemini';
  apiKey: string;
  aiModel: string;
  tutorName: string;
  tutorInterests: string[];
  teachingStyle: string;
  tutorBio: string;
  aiPersonalization: boolean;
  appName: string;
  webAddress: string;
  baseLearnerInflater: number;
  customLogo: string;
  sendgridKey: string;
  senderEmail: string;
  emailTemplate: string;
}

/* ────────────────────────────────────────────────────────────────────────────
   ░░ EVOLUTION RARITY & TIERS ░░
   Common (Rank 1) > Uncommon (Rank 2) > Rare (Rank 3) > Epic (Rank 4) > Legendary (Rank 5)
   ──────────────────────────────────────────────────────────────────────────── */

export type EvolutionRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface RarityTier {
  rank: number;
  rarity: EvolutionRarity;
  xpNeeded: number;
  name: string;
  glowColor: string;
  glowClass: string;
  badgeBg: string;
  badgeText: string;
  textColor: string;
  borderColor: string;
  boxGlow: string;
  dropGlow: string;
  gradientBg: string;
  cardGradLight: string;
  cardGradDark: string;
  badgeStyle: string;
  powerRating: string;
  symbol: string;
}

export const EVOLUTION_RARITY_TIERS: Record<number, RarityTier> = {
  1: {
    rank: 1,
    rarity: 'Common',
    xpNeeded: 0,
    name: 'Novice Vanguard',
    symbol: '🛡️',
    powerRating: 'Tier I • Base Surge',
    glowColor: '#94a3b8',
    glowClass: 'shadow-slate-400/50 ring-slate-400',
    badgeBg: 'bg-gradient-to-r from-slate-600 via-zinc-600 to-slate-700',
    badgeText: 'text-white font-black',
    badgeStyle: 'bg-gradient-to-r from-slate-700 via-zinc-600 to-slate-800 text-white border border-slate-400/60 shadow-md',
    textColor: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-300 dark:border-slate-600',
    boxGlow: '0 0 16px rgba(148, 163, 184, 0.5)',
    dropGlow: 'drop-shadow-[0_4px_12px_rgba(148,163,184,0.7)]',
    gradientBg: 'from-slate-600 via-zinc-600 to-slate-800',
    cardGradLight: 'bg-gradient-to-br from-white via-slate-50 to-zinc-100/90',
    cardGradDark: 'bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900',
  },
  2: {
    rank: 2,
    rarity: 'Uncommon',
    xpNeeded: 200,
    name: 'Bio-Storm Vanguard',
    symbol: '⚡',
    powerRating: 'Tier II • Toxic Kinetic',
    glowColor: '#10b981',
    glowClass: 'shadow-emerald-500/60 ring-emerald-400',
    badgeBg: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600',
    badgeText: 'text-white font-black',
    badgeStyle: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white border border-emerald-300/80 shadow-lg shadow-emerald-500/30',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-400 dark:border-emerald-500',
    boxGlow: '0 0 24px rgba(16, 185, 129, 0.65)',
    dropGlow: 'drop-shadow-[0_4px_16px_rgba(16,185,129,0.85)]',
    gradientBg: 'from-emerald-500 via-teal-500 to-green-600',
    cardGradLight: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-white',
    cardGradDark: 'bg-gradient-to-br from-slate-950 via-emerald-950/60 to-teal-950/70',
  },
  3: {
    rank: 3,
    rarity: 'Rare',
    xpNeeded: 600,
    name: 'Cobalt Lightning Apex',
    symbol: '💠',
    powerRating: 'Tier III • Arc Overdrive',
    glowColor: '#3b82f6',
    glowClass: 'shadow-blue-500/70 ring-blue-400',
    badgeBg: 'bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600',
    badgeText: 'text-white font-black',
    badgeStyle: 'bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 text-white border border-cyan-300/80 shadow-xl shadow-blue-500/40',
    textColor: 'text-blue-700 dark:text-cyan-300',
    borderColor: 'border-blue-400 dark:border-cyan-400',
    boxGlow: '0 0 30px rgba(59, 130, 246, 0.75)',
    dropGlow: 'drop-shadow-[0_4px_20px_rgba(59,130,246,0.95)]',
    gradientBg: 'from-blue-600 via-indigo-600 to-cyan-500',
    cardGradLight: 'bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-white',
    cardGradDark: 'bg-gradient-to-br from-slate-950 via-blue-950/70 to-indigo-950/80',
  },
  4: {
    rank: 4,
    rarity: 'Epic',
    xpNeeded: 1800,
    name: 'Hypernova Astral Titan',
    symbol: '🔮',
    powerRating: 'Tier IV • Dark Matter Warp',
    glowColor: '#a855f7',
    glowClass: 'shadow-fuchsia-500/80 ring-purple-400',
    badgeBg: 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-600',
    badgeText: 'text-white font-black',
    badgeStyle: 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-600 text-white border border-pink-300/80 shadow-2xl shadow-purple-500/50',
    textColor: 'text-purple-700 dark:text-fuchsia-300',
    borderColor: 'border-purple-400 dark:border-fuchsia-400',
    boxGlow: '0 0 36px rgba(168, 85, 247, 0.85)',
    dropGlow: 'drop-shadow-[0_4px_24px_rgba(168,85,247,1)]',
    gradientBg: 'from-purple-600 via-fuchsia-600 to-pink-600',
    cardGradLight: 'bg-gradient-to-br from-purple-50/90 via-fuchsia-50/60 to-white',
    cardGradDark: 'bg-gradient-to-br from-slate-950 via-purple-950/70 to-fuchsia-950/80',
  },
  5: {
    rank: 5,
    rarity: 'Legendary',
    xpNeeded: 5000,
    name: 'God-Tier Solar Apex',
    symbol: '👑',
    powerRating: 'Tier V • Supreme Divine Apex',
    glowColor: '#f59e0b',
    glowClass: 'shadow-amber-500/90 ring-amber-400',
    badgeBg: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500',
    badgeText: 'text-amber-950 font-black',
    badgeStyle: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 text-amber-950 font-black border-2 border-yellow-200 shadow-2xl shadow-amber-500/60',
    textColor: 'text-amber-600 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-yellow-400',
    boxGlow: '0 0 44px rgba(245, 158, 11, 0.95)',
    dropGlow: 'drop-shadow-[0_0_28px_rgba(245,158,11,1)]',
    gradientBg: 'from-amber-400 via-yellow-300 to-orange-500',
    cardGradLight: 'bg-gradient-to-br from-amber-50/95 via-yellow-50/70 to-orange-50/80',
    cardGradDark: 'bg-gradient-to-br from-slate-950 via-amber-950/70 to-orange-950/80',
  },
};

export const getRarityTier = (rank: number): RarityTier => {
  return EVOLUTION_RARITY_TIERS[rank] || (rank >= 5 ? EVOLUTION_RARITY_TIERS[5] : EVOLUTION_RARITY_TIERS[1]);
};

/* ────────────────────────────────────────────────────────────────────────────
   ░░ EVOLUTION TABLES ░░
   Avatar & Pet ranking based on XP thresholds.
   Strictly SINGLE character emoji per form and simple names.
   ──────────────────────────────────────────────────────────────────────────── */

export interface EvolutionRank {
  rank: number;
  xpNeeded: number;
  form: string;
  emoji: string;
  rarity?: EvolutionRarity;
}

/* FEMALE archetypes - Single clean emoji each */
export const FEMALE_AVATAR_EVOLUTIONS: Record<string, EvolutionRank[]> = {
  Fairy: [
    { rank: 1, xpNeeded: 0,    form: 'Pixie Fairy',    emoji: '🧚‍♀️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Forest Fairy',   emoji: '🧚‍♀️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Star Fairy',     emoji: '🧚‍♀️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Fairy Queen',    emoji: '🧚‍♀️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Cosmic Fairy',   emoji: '🧚‍♀️', rarity: 'Legendary' },
  ],
  Vampire: [
    { rank: 1, xpNeeded: 0,    form: 'Young Vampire',  emoji: '🧛‍♀️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Shadow Vampire', emoji: '🧛‍♀️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Vampire Noble',  emoji: '🧛‍♀️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Vampire Queen',  emoji: '🧛‍♀️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Ancient Vampire',emoji: '🧛‍♀️', rarity: 'Legendary' },
  ],
  Mermaid: [
    { rank: 1, xpNeeded: 0,    form: 'Young Mermaid',  emoji: '🧜‍♀️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Reef Mermaid',   emoji: '🧜‍♀️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Ocean Siren',    emoji: '🧜‍♀️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Sea Queen',      emoji: '🧜‍♀️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Ocean Goddess',  emoji: '🧜‍♀️', rarity: 'Legendary' },
  ],
  Genie: [
    { rank: 1, xpNeeded: 0,    form: 'Little Genie',   emoji: '🧞‍♀️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Wish Genie',     emoji: '🧞‍♀️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Mystic Genie',   emoji: '🧞‍♀️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Genie Queen',    emoji: '🧞‍♀️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Cosmic Genie',   emoji: '🧞‍♀️', rarity: 'Legendary' },
  ],
  Zombie: [
    { rank: 1, xpNeeded: 0,    form: 'Cute Zombie',    emoji: '🧟‍♀️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Runner Zombie',  emoji: '🧟‍♀️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Knight Zombie',  emoji: '🧟‍♀️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Zombie Queen',   emoji: '🧟‍♀️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Immortal Zombie',emoji: '🧟‍♀️', rarity: 'Legendary' },
  ],
  Elf: [
    { rank: 1, xpNeeded: 0,    form: 'Woodland Elf',   emoji: '🧝‍♀️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Ranger Elf',     emoji: '🧝‍♀️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'High Elf',       emoji: '🧝‍♀️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Elf Queen',      emoji: '🧝‍♀️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Solar Elf',      emoji: '🧝‍♀️', rarity: 'Legendary' },
  ],
  Superhero: [
    { rank: 1, xpNeeded: 0,    form: 'Hero Cadet',     emoji: '🦸‍♀️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Hero Scout',     emoji: '🦸‍♀️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Super Hero',     emoji: '🦸‍♀️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Hero Champion',  emoji: '🦸‍♀️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Cosmic Hero',    emoji: '🦸‍♀️', rarity: 'Legendary' },
  ],
  Supervillain: [
    { rank: 1, xpNeeded: 0,    form: 'Little Mischief',emoji: '🦹‍♀️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Shadow Rogue',   emoji: '🦹‍♀️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Super Villain',  emoji: '🦹‍♀️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Villain Queen',  emoji: '🦹‍♀️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Shadow Empress', emoji: '🦹‍♀️', rarity: 'Legendary' },
  ],
  Mage: [
    { rank: 1, xpNeeded: 0,    form: 'Apprentice Mage',emoji: '🧙‍♀️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Mystic Mage',    emoji: '🧙‍♀️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'High Mage',      emoji: '🧙‍♀️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Grand Mage',     emoji: '🧙‍♀️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Supreme Mage',   emoji: '🧙‍♀️', rarity: 'Legendary' },
  ],
  Baby: [
    { rank: 1, xpNeeded: 0,    form: 'Baby Angel',     emoji: '👼', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Little Angel',   emoji: '👼', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Guardian Angel', emoji: '👼', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Archangel',      emoji: '👼', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Divine Angel',   emoji: '👼', rarity: 'Legendary' },
  ],
  Troll: [
    { rank: 1, xpNeeded: 0,    form: 'Baby Troll',     emoji: '🧌', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Cave Troll',     emoji: '🧌', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Mountain Troll', emoji: '🧌', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Troll Queen',    emoji: '🧌', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Titan Troll',    emoji: '🧌', rarity: 'Legendary' },
  ],
};

/* MALE archetypes - Single clean emoji each */
export const MALE_AVATAR_EVOLUTIONS: Record<string, EvolutionRank[]> = {
  Fairy: [
    { rank: 1, xpNeeded: 0,    form: 'Pixie Fairy',    emoji: '🧚‍♂️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Forest Fairy',   emoji: '🧚‍♂️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Star Fairy',     emoji: '🧚‍♂️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Fairy King',     emoji: '🧚‍♂️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Cosmic Fairy',   emoji: '🧚‍♂️', rarity: 'Legendary' },
  ],
  Vampire: [
    { rank: 1, xpNeeded: 0,    form: 'Young Vampire',  emoji: '🧛‍♂️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Shadow Vampire', emoji: '🧛‍♂️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Vampire Lord',   emoji: '🧛‍♂️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Vampire King',   emoji: '🧛‍♂️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Ancient Vampire',emoji: '🧛‍♂️', rarity: 'Legendary' },
  ],
  Mermaid: [
    { rank: 1, xpNeeded: 0,    form: 'Young Merman',   emoji: '🧜‍♂️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Coral Merman',   emoji: '🧜‍♂️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Ocean Triton',   emoji: '🧜‍♂️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Sea King',       emoji: '🧜‍♂️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Ocean God',      emoji: '🧜‍♂️', rarity: 'Legendary' },
  ],
  Genie: [
    { rank: 1, xpNeeded: 0,    form: 'Little Genie',   emoji: '🧞‍♂️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Wish Genie',     emoji: '🧞‍♂️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Mystic Genie',   emoji: '🧞‍♂️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Genie Sultan',   emoji: '🧞‍♂️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Cosmic Genie',   emoji: '🧞‍♂️', rarity: 'Legendary' },
  ],
  Zombie: [
    { rank: 1, xpNeeded: 0,    form: 'Cute Zombie',    emoji: '🧟‍♂️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Runner Zombie',  emoji: '🧟‍♂️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Knight Zombie',  emoji: '🧟‍♂️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Zombie King',    emoji: '🧟‍♂️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Immortal Zombie',emoji: '🧟‍♂️', rarity: 'Legendary' },
  ],
  Elf: [
    { rank: 1, xpNeeded: 0,    form: 'Woodland Elf',   emoji: '🧝‍♂️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Ranger Elf',     emoji: '🧝‍♂️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'High Elf',       emoji: '🧝‍♂️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Elf King',      emoji: '🧝‍♂️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Solar Elf',      emoji: '🧝‍♂️', rarity: 'Legendary' },
  ],
  Superhero: [
    { rank: 1, xpNeeded: 0,    form: 'Hero Cadet',     emoji: '🦸‍♂️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Hero Scout',     emoji: '🦸‍♂️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Super Hero',     emoji: '🦸‍♂️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Hero Champion',  emoji: '🦸‍♂️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Cosmic Hero',    emoji: '🦸‍♂️', rarity: 'Legendary' },
  ],
  Supervillain: [
    { rank: 1, xpNeeded: 0,    form: 'Little Mischief',emoji: '🦹‍♂️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Shadow Rogue',   emoji: '🦹‍♂️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Super Villain',  emoji: '🦹‍♂️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Villain King',   emoji: '🦹‍♂️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Shadow Emperor', emoji: '🦹‍♂️', rarity: 'Legendary' },
  ],
  Mage: [
    { rank: 1, xpNeeded: 0,    form: 'Apprentice Mage',emoji: '🧙‍♂️', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Mystic Mage',    emoji: '🧙‍♂️', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'High Mage',      emoji: '🧙‍♂️', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Grand Mage',     emoji: '🧙‍♂️', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Supreme Mage',   emoji: '🧙‍♂️', rarity: 'Legendary' },
  ],
  Baby: [
    { rank: 1, xpNeeded: 0,    form: 'Baby Angel',     emoji: '👼', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Little Angel',   emoji: '👼', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Guardian Angel', emoji: '👼', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Archangel',      emoji: '👼', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Divine Angel',   emoji: '👼', rarity: 'Legendary' },
  ],
  Troll: [
    { rank: 1, xpNeeded: 0,    form: 'Baby Troll',     emoji: '🧌', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Cave Troll',     emoji: '🧌', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Mountain Troll', emoji: '🧌', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Troll King',     emoji: '🧌', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Titan Troll',    emoji: '🧌', rarity: 'Legendary' },
  ],
};

/* PET evolutions - Single clean emoji each */
export const PET_EVOLUTIONS: Record<PetType, EvolutionRank[]> = {
  Dog: [
    { rank: 1, xpNeeded: 0,    form: 'Puppy',          emoji: '🐶', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Hound',          emoji: '🐕', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Guard Dog',      emoji: '🦮', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Wolf Companion', emoji: '🐺', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Mythic Wolf',    emoji: '🐺', rarity: 'Legendary' },
  ],
  Cat: [
    { rank: 1, xpNeeded: 0,    form: 'Kitten',         emoji: '🐱', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'House Cat',      emoji: '🐈', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Panther',        emoji: '🐆', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Tiger',          emoji: '🐅', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Lion King',      emoji: '🦁', rarity: 'Legendary' },
  ],
  Bird: [
    { rank: 1, xpNeeded: 0,    form: 'Chick',          emoji: '🐣', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Songbird',       emoji: '🐦', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Eagle',          emoji: '🦅', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Owl',            emoji: '🦉', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Phoenix',        emoji: '🦚', rarity: 'Legendary' },
  ],
  Fish: [
    { rank: 1, xpNeeded: 0,    form: 'Guppy',          emoji: '🐟', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Goldfish',       emoji: '🐠', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Pufferfish',     emoji: '🐡', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Shark',          emoji: '🦈', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Whale',          emoji: '🐋', rarity: 'Legendary' },
  ],
  Lizard: [
    { rank: 1, xpNeeded: 0,    form: 'Little Gecko',   emoji: '🦎', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Chameleon',      emoji: '🦎', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Iguana',         emoji: '🦎', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Alligator',      emoji: '🐊', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Dragon',         emoji: '🐲', rarity: 'Legendary' },
  ],
  Snake: [
    { rank: 1, xpNeeded: 0,    form: 'Little Snake',   emoji: '🐍', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Garden Snake',   emoji: '🐍', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Cobra',          emoji: '🐍', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Python',         emoji: '🐍', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Great Serpent',  emoji: '🐲', rarity: 'Legendary' },
  ],
  Turtle: [
    { rank: 1, xpNeeded: 0,    form: 'Tiny Turtle',    emoji: '🐢', rarity: 'Common' },
    { rank: 2, xpNeeded: 200,  form: 'Pond Turtle',    emoji: '🐢', rarity: 'Uncommon' },
    { rank: 3, xpNeeded: 600,  form: 'Sea Turtle',     emoji: '🐢', rarity: 'Rare' },
    { rank: 4, xpNeeded: 1800, form: 'Giant Tortoise', emoji: '🐢', rarity: 'Epic' },
    { rank: 5, xpNeeded: 5000, form: 'Dragon Turtle',  emoji: '🐢', rarity: 'Legendary' },
  ],
};

const DEFAULT_AVATAR: EvolutionRank[] = [
  { rank: 1, xpNeeded: 0,    form: 'Novice',     emoji: '🧒', rarity: 'Common' },
  { rank: 2, xpNeeded: 200,  form: 'Adventurer', emoji: '🧑', rarity: 'Uncommon' },
  { rank: 3, xpNeeded: 600,  form: 'Champion',   emoji: '🦸', rarity: 'Rare' },
  { rank: 4, xpNeeded: 1800, form: 'Hero',       emoji: '🧙', rarity: 'Epic' },
  { rank: 5, xpNeeded: 5000, form: 'Legend',     emoji: '🌟', rarity: 'Legendary' },
];

export const getAvatarEvolutionTable = (gender: Gender, archetype: AvatarArchetype): EvolutionRank[] => {
  const table = gender === 'Female' ? FEMALE_AVATAR_EVOLUTIONS : MALE_AVATAR_EVOLUTIONS;
  return table[archetype] || DEFAULT_AVATAR;
};

export const getPetEvolutionTable = (petType: PetType): EvolutionRank[] => {
  return PET_EVOLUTIONS[petType] || PET_EVOLUTIONS.Cat;
};

export const getAvatarEvolution = (gender: Gender, archetype: AvatarArchetype, xp: number): EvolutionRank => {
  const table = getAvatarEvolutionTable(gender, archetype);
  let current = table[0];
  for (const rank of table) {
    if (xp >= rank.xpNeeded) current = rank;
  }
  return current;
};

export const getPetEvolution = (petType: PetType, xp: number): EvolutionRank => {
  const table = getPetEvolutionTable(petType);
  let current = table[0];
  for (const rank of table) {
    if (xp >= rank.xpNeeded) current = rank;
  }
  return current;
};

export const getNextRankProgress = (table: EvolutionRank[], xp: number): { current: EvolutionRank; next?: EvolutionRank; pct: number } => {
  let current = table[0];
  let nextRank: EvolutionRank | undefined;
  for (let i = 0; i < table.length; i++) {
    if (xp >= table[i].xpNeeded) {
      current = table[i];
      nextRank = table[i + 1];
    }
  }
  if (!nextRank) return { current, pct: 100 };
  const span = nextRank.xpNeeded - current.xpNeeded;
  const into = xp - current.xpNeeded;
  return { current, next: nextRank, pct: Math.min(100, Math.round((into / span) * 100)) };
};
