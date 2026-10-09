// ============================================================
// TUTOR ACADEMY - TIERS & PERMISSIONS SYSTEM
// ============================================================

export type UserTier = 'free' | 'pro' | 'vip';
export type UserStatus = 'active' | 'suspended' | 'pending_verification';

export interface TutorAccount {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  avatarId?: string;
  bio?: string;
  teachingMethod?: string;
  interests?: string;
  nativeLanguage?: string;
  hourlyRate?: number;
  country?: string;
  timezone?: string;
  tier: UserTier;
  status: UserStatus;
  role: 'tutor' | 'admin';
  createdAt: string;
  lastLogin: string;
  deviceId?: string;
  notes?: string;
  emailVerified?: boolean;
  verificationToken?: string;
  verificationCode?: string;
  maxAdultLearners?: number; // 30 for free, 100 for pro, unlimited (-1) for vip
  maxKidsLearners?: number;   // 30 for free, 100 for pro, unlimited (-1) for vip
  /** ISO date when the granted tier expires. After this moment the account falls back to free. */
  tierExpiresAt?: string;
  /** HMAC signature over email|tier|tierExpiresAt — tamper-evident tier grants. */
  tierSig?: string;
}

// ── Donation & support (keeps the project alive) ───────────────────────
export const DONATION_INFO = {
  cardNumber: '6104 3376 8299 6937',
  cardNumberDigits: '6104337682996937',
  bank: 'Mellat',
  cardHolder: 'Kamran Rostami',
  supportPhone: '09137809061',
  supportPhoneInternational: '+98 913 780 9061',
};

// ── VIP paid plans (Tomans) ────────────────────────────────────────────
export const VIP_PLANS = [
  { days: 60, priceToman: 1000000, label: '60 days' },
  { days: 120, priceToman: 1500000, label: '120 days' },
] as const;

// Admin console grant durations (days)
export const GRANT_DURATIONS = [30, 60, 90, 120];

export const FREE_LEARNER_LIMIT = 30;
export const PRO_LEARNER_LIMIT = 100;

export interface TierBenefit {
  tier: UserTier;
  label: string;
  shortBadge: string;
  gradient: string;
  border: string;
  icon: string;
  description: string;
  learnerLimit: string;
  lessons: string[];
  features: string[];
}

export const TIER_CONFIGS: Record<UserTier, TierBenefit> = {
  free: {
    tier: 'free',
    label: 'Free Starter',
    shortBadge: 'FREE',
    gradient: 'from-slate-500 to-slate-700',
    border: 'border-slate-400/30',
    icon: 'fa-user',
    description: 'Essential classroom tools and up to 30 learners for independent tutors.',
    learnerLimit: 'Up to 30 Adult & 30 Kids Learners',
    lessons: [
      'Micro Lesson (Version 1)',
      'Explainer Lesson (Concept Deep-Dive)',
      'Exam Prep Lesson & Mock Test Lab',
    ],
    features: [
      'Full Adult & Kids Dashboards (Up to 30 Learners each)',
      'Gadgets: Transcriber & Audio Tools',
      'Conversation Maker & Dialog Generators',
      'Interactive Whiteboard V2 & Classroom Screen Tools',
      'Timers, Stopwatch, Noise Level & Dice Widgets',
      'SoundBoard & Sticky Notes',
      'Local Disk Storage & Hard Drive Sync',
      'Existing learners preserved with zero data loss',
    ]
  },
  pro: {
    tier: 'pro',
    label: 'Premium (Pro)',
    shortBadge: '⭐ PRO',
    gradient: 'from-indigo-600 to-blue-600',
    border: 'border-indigo-400/50',
    icon: 'fa-star',
    description: 'Up to 100 learners, comprehensive lesson suites, assignments & smart automations — unlocked by a donation that keeps the project alive.',
    learnerLimit: 'Up to 100 Adult & 100 Kids Learners',
    lessons: [
      'Everything in Free',
      'Interactive Lesson (AI HTML5 Studio)',
      'Bilingual Study Lesson',
      'Conversational English Lesson',
      'Homework & Assignment Generator',
      'Interactive Quiz Creator',
      'Official Printable Worksheet',
      'Comprehensive Lesson Plan & Teacher Guide',
      'Supplementary Study Guide',
      'Daily English Lesson',
      'Guess The Place & Conversation Game Maker',
      'Interactive Flashcards & Flexcards',
    ],
    features: [
      'Up to 100 Adult and Kids Learner Profiles',
      'Calendar Sync (Google, Microsoft & iCal)',
      'Automated Drip Campaigns & Batch Email Composer',
      'Smart Goal Tracker & Milestone Analytics',
      'Tag Management & Search Indexing',
      'Division Leaderboards & Competency Charts',
      'Priority Lesson Generation & Exports',
      'Unlocked via a one-time donation (no support line — that is VIP)',
    ]
  },
  vip: {
    tier: 'vip',
    label: 'VIP Elite Master',
    shortBadge: '👑 VIP',
    gradient: 'from-amber-500 via-purple-600 to-pink-600',
    border: 'border-amber-400/60',
    icon: 'fa-crown',
    description: 'The ultimate AI-powered mastery suite with live media players, karaoke, simulations & super admin — VIP plans run 60/120 days and include direct support.',
    learnerLimit: 'Unlimited Adult & Kids Learners',
    lessons: [
      'Everything in Pro + Free',
      'Live Lesson Studio (Super Media Player H5P)',
      'Interactive Video Lesson Studio',
      'Slide Presentation Builder',
      'Music Lesson & AI Karaoke Studio',
      'Party Mode Arena',
      'Supplementary Simulations (Audio Lab)',
      'Avatar Lesson V2 & Custom AI Avatar Generator',
    ],
    features: [
      'Full Kids Kingdom Canvas & Magic FlipBook',
      'Combat Arena War Room & Tutor God Mode',
      'University Management Suite',
      'Preply & Platform Success Advisor AI',
      'Custom Branding & White-label Export',
      'VIP Fast-track Support & Direct Contact (09137809061)',
      'Course Resources & Library Access',
    ]
  }
};

// Map content type to required tier
export const LESSON_TIER_MAP: Record<string, UserTier> = {
  // Free Lessons & Essentials
  'englishLesson': 'free',         // Micro Lesson V1
  'explainerLesson': 'free',       // Explainer Lesson
  'examPrepLesson': 'free',        // Exam Prep Lesson
  'mockTest': 'free',              // Mock Test
  'mockTestV2': 'free',            // Mock Test V2
  'testLab': 'free',               // Test Lab Activity
  'homework': 'free',              // Homework
  'quiz': 'free',                  // Quiz
  'lessonPlan': 'free',            // Lesson Plan
  'forTeachers': 'free',           // Teacher Guide
  'lessonGuide': 'free',           // Lesson Guide
  'lessonGen': 'free',
  'calendar': 'free',
  'media': 'free',
  'webcam': 'free',

  // Pro / Premium Lessons & Gadgets
  'interactiveLesson': 'pro',      // Interactive Lesson (AI-designed HTML5 studio)
  'englishLessonV2': 'pro',        // Micro Lesson V2
  'bilingualStudyLesson': 'pro',
  'conversationalLesson': 'pro',
  'studyGuide': 'pro',
  'printableWorksheet': 'pro',
  'conversationGame': 'pro',
  'conversationMaker': 'pro',
  'placeGame': 'pro',
  'weeklyChallenge': 'pro',
  'dailyLesson': 'pro',
  'transcriber': 'pro',
  'prompter': 'pro',
  'whiteboard': 'pro',
  'lessonInsight': 'pro',
  'sound-board': 'pro',
  'tutorly-chess': 'pro',
  'lyrics': 'pro',
  'karaoke': 'pro',
  'exam-builder': 'pro',
  'magicBook': 'pro',
  'kidsAdmin': 'pro',
  'kidsCalendar': 'pro',
  'kidsVoice': 'pro',
  'kidsFeedback': 'pro',

  // VIP Lessons & Exclusive Suites
  'liveLesson': 'vip',
  'videoLesson': 'vip',
  'slides': 'vip',
  'musicLesson': 'vip',
  'audioLesson': 'vip',
  'partyMode': 'vip',
  'simulations': 'vip',
  'avatarLesson': 'vip',
  'avatarLessonV2': 'vip',
  'classmate': 'vip',
  'learningApp': 'vip',
  'learningAppV2': 'vip',
  'gallery': 'vip',
  'competition': 'vip',
  'automation': 'vip',
  'screen': 'vip',
  'combatArena': 'vip',
  'universityManagement': 'vip',
  'university-management': 'vip',
  // 'advisor' / 'advisor-v2' used to sit here: the first was the same app under an
  // earlier id, the second pointed at a folder that never shipped. Both dock tiles
  // are gone — the Preply Success Advisor is 'preply-success'.
  'preply-success': 'vip',
  'contentCreator': 'vip',
  'content-creator': 'vip',
};

/**
 * Check if adding a new learner profile is allowed for a given tier.
 * Existing learners are NEVER deleted or blocked from viewing/teaching.
 */
export function getLearnerLimit(userTier: UserTier = 'free'): number {
  if (userTier === 'vip') return Infinity;
  if (userTier === 'pro') return PRO_LEARNER_LIMIT;
  return FREE_LEARNER_LIMIT;
}

export function canAddLearner(currentLearnerCount: number, userTier: UserTier = 'free'): boolean {
  if (userTier === 'vip') {
    return true;
  }
  if (userTier === 'pro') {
    return currentLearnerCount < PRO_LEARNER_LIMIT;
  }
  return currentLearnerCount < FREE_LEARNER_LIMIT;
}

export function getRemainingLearnerSlots(currentLearnerCount: number, userTier: UserTier = 'free'): number | 'Unlimited' {
  if (userTier === 'vip') return 'Unlimited';
  const limit = userTier === 'pro' ? PRO_LEARNER_LIMIT : FREE_LEARNER_LIMIT;
  return Math.max(0, limit - currentLearnerCount);
}

/**
 * Check if a lesson type or feature is permitted for a given user tier.
 */
export function isLessonAllowed(lessonType: string, userTier: UserTier = 'free'): boolean {
  const required = LESSON_TIER_MAP[lessonType] || 'pro';
  if (required === 'free') return true;
  if (required === 'pro') return userTier === 'pro' || userTier === 'vip';
  if (required === 'vip') return userTier === 'vip';
  return false;
}

export function getRequiredTierForLesson(lessonType: string): UserTier {
  return LESSON_TIER_MAP[lessonType] || 'pro';
}

/**
 * Effective tier after expiry enforcement. Any non-free tier with a
 * tierExpiresAt in the past collapses to 'free'.
 */
export function getEffectiveTier(tier: UserTier | undefined | null, tierExpiresAt?: string | null): UserTier {
  if (tier === 'free' || !tier) return 'free';
  if (tierExpiresAt) {
    const exp = new Date(tierExpiresAt).getTime();
    if (!isNaN(exp) && exp <= Date.now()) return 'free';
  }
  return tier;
}

/**
 * Human-friendly remaining time on a granted tier (e.g. "23 days", "4 hours").
 */
export function formatTierRemaining(tierExpiresAt?: string | null): string {
  if (!tierExpiresAt) return '';
  const ms = new Date(tierExpiresAt).getTime() - Date.now();
  if (isNaN(ms) || ms <= 0) return '';
  const days = Math.floor(ms / 86400000);
  if (days > 0) return `${days} day${days === 1 ? '' : 's'}`;
  const hours = Math.floor(ms / 3600000);
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const mins = Math.floor(ms / 60000);
  return `${Math.max(1, mins)} min`;
}
