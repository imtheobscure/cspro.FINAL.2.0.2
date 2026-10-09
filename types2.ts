
export enum CourseLevel {
  Beginner = 'Beginner',
  Novice = 'Novice',
  Elementary = 'Elementary',
  Intermediate = 'Intermediate',
  UpperIntermediate = 'Upper-Intermediate',
  Advanced = 'Advanced',
  Expert = 'Expert',
  Master = 'Master',
  // CEFR aliases for compatibility
  A1 = 'Beginner',
  A2 = 'Elementary',
  B1 = 'Intermediate',
  B2 = 'Upper-Intermediate',
  C1 = 'Advanced',
  C2 = 'Expert'
}

export enum CompetencyStatus {
  NeedsWork = 'NeedsWork',
  OnTrack = 'OnTrack',
  Mastered = 'Mastered',
  Learning = 'Learning',
  Practicing = 'Practicing'
}

export interface SyllabusChapter {
  id: string;
  title: string;
  vocabulary: string[];
  grammar: string;
  description: string;
  status: 'pending' | 'completed';
  functionalLanguage?: string[];
  skillsNeeded?: string[];
  strategiesAndTips?: string;
}

export interface CompetencySyllabus {
  competencyId: string;
  competencyName: string;
  chapters: SyllabusChapter[];
}

export interface PersonalSyllabus {
  competencies: CompetencySyllabus[];
}

export interface Learner {
  id: string;
  isSubscribed?: boolean;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  timezone: string;
  avatarId: string;
  avatarIds?: string[];
  level: CourseLevel;
  cefrLevel?: string;
  l1Language?: string;
  targetLanguage?: string;
  translationLanguage?: string;
  tutorVoice?: string;
  readAloudVoice?: string;
  translationVoice?: string;
  facts?: any;
  vocabulary?: string[];
  goalsList?: string[]; // to avoid conflicting with goals: string[]
  achievementsList?: string[]; 
  challenges?: Record<string, 'pending'|'completed'|'failed'>;
  currentLessonSettings?: any;
  status: 'active' | 'inactive' | 'paused';
  joinedAt: string;
  lastSessionDate?: string;
  nextSessionDate?: string;
  sessionHistory?: Array<{
    date: string;
    title?: string;
    lessonName?: string;
    review?: {
        stars: number;
        liked: string;
        disliked: string;
        expectationsMetOptions: string[];
        /**
         * Clarity / Progress / Preparation / Reassurance, 1–5 each.
         *
         * Optional because every review written before these four existed has none of them,
         * and they must still load and still average correctly (see
         * `components/app2/profile/reviewSkills.ts`, which owns the keys).
         */
        skillRatings?: Partial<Record<'clarity' | 'progress' | 'preparation' | 'reassurance', number>>;
    };
  }>;
  competencies: Competency[];
  needs: Need[];
  goals: string[];
  interests: string;
  situations?: string;
  focus?: string;
  learningStyle: string;
  expectations: string;
  learningFactors?: any;
  occupation: string;
  gender: string;
  birthday: string;
  languages: string[];
  sessions: Session[];
  streak: number;
  xp: number;
  achievements: PersonalizedAchievement[];
  notes: string;
  coursePlan?: CoursePlan; 
  plan?: CoursePlan; 
  // Newly added attributes to fix typescript errors:
  isAttentionDismissed?: boolean;
  timeOffsetMinutes?: number;
  vocalPraiseTemplates?: Array<{ id: string; title: string; text: string; icon: string }>;
  selectedAlarmVoice?: string;
  selectedMemeUrl?: string;
  selectedMemeName?: string;
  selectedAlarmType?: string;
  registeredName?: string;
  competitionWins?: number;
  isCompeting?: boolean;
  currentOpponentId?: string;
  matchHistory?: any[];
  /** Per-week duel victories: used by the leaderboard to show week-by-week win history */
  weeklyWinRecords?: WeeklyWinRecord[];
  /** Category / theme assigned to this profile (id from LEARNER_CATEGORIES) */
  category?: string;
  major?: string;
  dismissedFeedback?: string[];
  masteredSkills?: any[];
  classmates?: any[]; // To avoid circular imports, just use any or replicate type
  sessionAnalysis?: any[];
  examAnalysis?: any[];
  reportPreferences?: { template: string; selectedComponents: string[] };
  syllabus?: PersonalSyllabus;
  lessonHistory?: LessonHistoryEntry[];
  smartGoal?: { 
    goal: string; 
    goals?: string[];
    deadline: string; 
    hoursPerWeek: number; 
    lessonsPerWeek: number; 
    targetLevel?: string;
    currentLevel?: string;
    studyPace?: string;
    primarySkill?: string;
    lifestyleWindow?: string;
    nextRecommendedClassDate?: string;
    coachMotivationalQuote?: string;
    coachingSummary?: string;
    coachName?: string;
    whatToStudyNext?: Array<{
      topic: string;
      description: string;
      priority?: 'high' | 'medium' | 'normal';
      tags?: string[];
      actionType?: 'review' | 'homework' | 'practice' | 'preview';
    }>;
    weeklyMilestones?: Array<{
      week: number;
      title: string;
      focus: string;
      isCompleted?: boolean;
    }>;
    roadmapPhases?: Array<{
      phase: number;
      title: string;
      targetDate?: string;
      targetCefr?: string;
      status: 'completed' | 'in_progress' | 'upcoming';
      focusSkills: string[];
      keyMilestones: string[];
      grammarFocus?: string;
      vocabularyFocus?: string;
      actionItems?: string[];
    }>;
    keyStrengthsIdentified?: string[];
    priorityFixes?: string[];
    termPlanDetails?: {
      totalSessions?: number;
      sessionsCompleted?: number;
      expectedCompletionDate?: string;
      weeklyCadence?: string;
      attendanceTargetPct?: number;
      notes?: string;
    };
    aiAnalysis?: string;
    recommendedMilestones?: string[];
    testResults?: any;
    learnerReply?: string;
    syllabusChapters?: string[];
    monthlyPlans?: Array<{
      month: string;
      label: string;
      startDate?: string;
      endDate?: string;
      goals?: string[];
      focus?: string;
      sessionsPlanned?: number;
      milestones?: string[];
      holidaysConsidered?: string[];
      timeManagementMessages?: string[];
    }>;
  };
}

export interface WeeklyWinRecord {
  week: number;          // ISO week number the duel was won in
  year: number;
  date: string;          // ISO date of the declaration
  opponentId?: string;
  opponentName: string;
  bonusXp: number;       // bonus XP auto-awarded for the win
}

// One settled duel inside a completed weekly round (recorded at the Sunday deadline auto-settle)
export interface CompetitionSettlementPair {
  category: string;            // theme/category id both learners belong to
  tie: boolean;                // true when the 7-day stats were level and no winner was declared
  a: { id: string; name: string; xp: number };      // learner A with the XP snapshot taken at settle time
  b: { id: string; name: string; xp: number };      // learner B with the XP snapshot taken at settle time
  winnerId?: string;           // set when !tie
  loserId?: string;            // set when !tie
  bonusXp?: number;            // 100 when !tie
}

// Digest of everything the self-running engine settled when a weekly round ended
export interface CompetitionSettlement {
  week: number;                // ISO week that just ended (the round being settled)
  year: number;
  date: string;                // ISO date the settlement happened
  pairs: CompetitionSettlementPair[];
}

export interface CoursePlan {
    id?: string;
    title?: string;
    level?: CourseLevel | string;
    modules?: CourseModule[];
    totalSessions?: number | string;
    targetLevel?: string;
    courseName?: string;
    currentLesson?: number | string;
    duration?: number | string;
    frequency?: string;
    features?: string[] | string;
    coursebookInfo?: any; // To store selected coursebook metadata
}

export interface CourseModule {
    id: string;
    title: string;
    topics: string[];
    status: 'pending' | 'in-progress' | 'completed';
}

export interface Competency {
  id: string;
  name: string;
  type?: 'grammar' | 'vocabulary' | 'pronunciation' | 'fluency' | 'listening' | 'reading' | 'writing' | string;
  status: CompetencyStatus | string;
  progress: number; // 0-100
  notes?: string;
  initialProgress?: number;
  rating?: number;
  icon?: string;
  history?: { date: string; score: number; note: string }[];
}

export interface Need {
  id: string;
  name: string;
  description?: string;
  rating: number;
  learningPath?: any[];
  priority?: 'low' | 'medium' | 'high';
  status?: 'identified' | 'addressing' | 'resolved' | string;
  createdAt?: string;
}

export interface LessonSectionFocus {
  sectionTitle: string;
  grammar?: string;
  vocabulary?: string;
  pronunciation?: string;
}

export interface LessonHistoryEntry {
  id?: string;
  date: string;
  title: string;
  headings: string[];
  completedHeadings?: string[];
  sectionFocus?: LessonSectionFocus[];
}

export interface Session {
  id: string;
  learnerId: string;
  date: string;
  duration: number; // minutes
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  attended: boolean;
  topics: string[];
  notes: string;
  homework?: string;
  feedback?: string;
  rating?: number;
  aiAnalysis?: AIComprehensiveAnalysis;
  reviewQuestions?: { context: string; question: string; answer?: string }[];
  skillsLearned?: string[];
  needsHelp?: string[];
  // Newly added to fix TS errors:
  lessonName?: string;
  lessonSummary?: string;
  spokenTime?: number;
  sessionNumber?: number;
  penalties?: string[];
  badges?: any[];
  metExpectations?: string | boolean | any;
  script?: string;
  chatMessages?: any[];
  personalizedGreetings?: string[];
  personalizedGoodbyes?: string[];
  reflection?: string;
  weaknesses?: string[];
  weaknessDetails?: any[];
  review?: any;
  selectedSyllabusChapterIds?: string[];
  sectionFocus?: LessonSectionFocus[];
  grammarPoints?: string[];
  vocabularyPoints?: string[];
  pronunciationPoints?: string[];
}

export interface AIComprehensiveAnalysis {
    summary: string;
    revisedLessonSummary?: string;
    strengths: string[];
    weaknesses: string[];
    recommendations?: string[];
    keyLearnings?: string[];
    corrections?: { category: string; explanation: string; examples: { incorrect: string; correct: string }[] }[];
    competencyUpdates?: any[];
    newSkills?: any[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    suggestedTodos?: any[];
    facts?: any; // To allow split() calls 
    masteryLevel?: number | string;
    masteryJustification?: string;
    reviewQuestions?: any[];
    challenges?: any[];
    chatMessages?: any[];
    personalizedGreetings?: string[];
    personalizedGoodbyes?: string[];
    badges?: { name: string; description: string; emoji: string }[];
    unlockedVocabulary?: { word: string; category?: string; definition: string }[];
    advancedFeedback?: {
        fluency?: string;
        accuracy?: string;
        clarity?: string;
        confidence?: string;
        pragmaticAppropriateness?: string;
        lexicalSophistication?: string;
        syntacticComplexity?: string;
        repairStrategyTypology?: string;
        registerConsistency?: string;
        ideaDensity?: string;
        metaDiscourse?: string;
        stanceMarkers?: string;
        syllabusFeedback?: string;
    };
    emotionalFeeling?: {
        sentimentScore?: number;
        dominantEmotion?: string;
        analysis?: string;
        confidenceScore?: number;
        confidenceAnalysis?: string;
        anxietyScore?: number;
        anxietyAnalysis?: string;
        riskTakingScore?: number;
        riskTakingAnalysis?: string;
        fearOfMistakesScore?: number;
        fearOfMistakesAnalysis?: string;
        motivationScore?: number;
        motivationAnalysis?: string;
        transferableSkills?: Array<{
            skill: string;
            score: number;
            evidence: string;
        }>;
    };
    speakingScores?: {
        cefr?: string;
        ielts?: number;
        toefl?: number;
        fluencyCoherence?: number;
        lexicalResource?: number;
        grammarAccuracy?: number;
        pronunciation?: number;
        rubricJustification?: string;
    };
    selectedSyllabusChapterIds?: string[];
}

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    learnerId?: string;
    dueDate?: string;
    learnerName?: string;
    groupName?: string;
    priority?: string;
    groupId?: string;
}

/**
 * One person in a GROUP class.
 *
 * Deliberately NOT a `Learner`. A group class is run from a roster the tutor types or
 * pastes — usually extracted from a transcript of everyone introducing themselves — and
 * asking a tutor to first create one individual account per attendee (login, XP, streak,
 * milestones) is the wrong shape for it: those accounts are never wanted and get in the
 * way. Everything the lesson AI needs to know about a person lives here instead.
 *
 * `facts` and `routing` are the two fields that matter most: `facts` is what a tutor can
 * open a conversation with, and `routing` is how THIS person should be handled in class
 * (ask often, keep to reading, pair with someone). Both are fed to the lesson generator.
 */
export interface GroupParticipant {
    id: string;
    name: string;
    /** A1–C2, or 'unknown' when the source text gives no signal. */
    cefr?: string;
    /**
     * This learner's first language, for translations. A group can be all one L1 or a
     * mix — so each learner records their own, and `groupL1FromRoster` decides what the
     * class as a whole can be translated into (one language, or none).
     */
    l1?: string;
    /* ── Contact information (shown on the class profile, used by Compose Email) ── */
    email?: string;
    phone?: string;
    country?: string;
    /** Free text: job, studies, family, personality — conversation ammunition. */
    facts?: string;
    interests?: string;
    goals?: string;
    /** How much they tend to speak; drives who gets asked what. */
    talkative?: 'high' | 'medium' | 'low' | 'unknown';
    /** How to use them in class, e.g. "ask often, loves role-play" or "reading only". */
    routing?: string;
    /** Logged per group session from the Sessions tab. */
    attendance?: { sessionId: string; date: string; present: boolean }[];
    /** 0–100, from logged sessions and the tutor's own assessment. */
    progress?: number;
    notes?: string;
}

export interface GroupClass {
    id: string;
    name: string;
    schedule: string;
    participants?: string[]; // learner IDs
    participantIds?: string[]; // duplicate field to avoid breaking changes
    /**
     * The class roster. This is the roster a group class is actually taught from —
     * `participantIds` above only exists for the old linked-account behaviour.
     */
    participantsData?: GroupParticipant[];
    /**
     * The tutor's mandatory instructions for the lesson AI: who to ask more, which parts
     * to use with which people, who to keep off the spot. Written in
     * "Step 2 · Customization & Lesson Structure" and injected into every generated
     * lesson as a hard requirement (see `groupLessonBrief` in the group profile).
     */
    groupRouting?: string;
    /** Whatever the tutor pasted or imported — the raw source of the roster. */
    rosterSource?: string;
    /** Class-level subscription flag (the individual profile has the same one). */
    isSubscribed?: boolean;
    level: CourseLevel;
    /**
     * The ceiling the lesson AI writes to: a CEFR level plus a grammar tier
     * (1 · Easy / 2 · Medium / 3 · Advanced) — the same pair the individual profile
     * picks in "Step 2 · Customization & Lesson Structure". Every generator reads it
     * through `groupAsLearnerForAI`, so a class is held to exactly the grammar its
     * level allows instead of silently defaulting to B1 / Tier 1.
     */
    cefrLevel?: string;
    cefrTier?: number;
    // newly added fields
    sessions?: Session[];
    coursePlan?: CoursePlan;
    plan?: CoursePlan;
    competencies?: Competency[];
    needs?: Need[];
    facts?: any;
    dateCreated?: string;
    avatarId?: string;
    expectations?: string;
    dismissedFeedback?: string[];
    masteredSkills?: any[];
    currentLessonPlan?: any;
    syllabus?: PersonalSyllabus;
}

export interface CompetencyUpdateSuggestion {
    id?: string;
    competencyName: string;
    suggestedProgress: number;
    suggestedLevel?: string | number;
    justification: string;
}

export interface NewSkillSuggestion {
    name?: string;
    skillName: string;
    linkedNeed?: string;
    suggestedProgress: number;
    level?: number | string;
    justification: string;
}

export interface PendingAIConfirmation {
    learnerId: string;
    sessionData: any;
    analysis: AIComprehensiveAnalysis;
}

export interface ActiveTimer {
    learnerId: string;
    learnerName: string;
    durationMinutes: number;
    breakInterval: number;
    startTime: number;
    endTime?: number;
    alarmType?: string;
}

export interface SessionToLogInfo {
    learnerId: string;
    learnerName: string;
    duration: number;
    elapsedMinutes?: number;
    date: string;
}

export interface ErrorLog {
    id: string;
    message: string;
    timestamp: number;
    stack?: string;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start?: string;
    end?: string;
    date?: string; // Legacy support if needed
    learnerId?: string;
    type?: 'session' | 'reminder' | 'holiday' | 'other' | string;
    description?: string;
    endDate?: string;
    color?: string;
    emoji?: string;
    groupId?: string;
    time?: string;
    sourceCalendarId?: string;
}

export interface SyncedCalendar {
    id: string;
    name: string;
    url: string;
    color: string;
    isEnabled?: boolean;
    lastSynced?: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  dateEarned?: string;
  count?: number;
}

export interface PersonalizedAchievement {
    id: string;
    title: string;
    description: string;
    dateEarned: string;
    icon: string;
    name?: string; // Appears used in some places
}

export interface CompetitionMatch {
    id: string;
    learnerId1: string;
    learnerId2: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed';
    scores: { [learnerId: string]: number };
    winnerId?: string;
}

export interface Skill {
    id: string;
    name: string;
    level?: number;
    progress?: number;
}

export interface AIProgressReport {
    learnerName: string;
    period: string;
    summary: string;
    achievements: string[];
    areasForImprovement: string[];
    nextSteps: string[];
    progressOverTime?: any;
    statistics?: any;
    totalLearningHours?: any;
    overallSummary?: any;
    criticalEvaluation?: any;
    competencyAnalysis?: any;
    sessionLearningAnalysis?: any;
    needsAndPathAnalysis?: any;
    suggestedNextSteps?: any;
}

// ============ AUTOMATION TYPES ============
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'welcome' | 'reminder' | 'homework' | 'progress' | 'reengagement' | 'followup' | 'certificate' | 'custom';
  createdAt: string;
}

export interface ScheduledEmail {
  id: string;
  templateId?: string;
  learnerId?: string;
  learnerIds?: string[]; // For batch emails
  groupId?: string;
  subject: string;
  body: string;
  scheduledDate: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  type: 'drip' | 'batch' | 'followup' | 'digest' | 'reengagement' | 'certificate' | 'homework' | 'reminder';
  createdAt: string;
  sentAt?: string;
}

export interface DripCampaign {
  id: string;
  name: string;
  learnerId: string;
  emails: {
    templateId: string;
    dayOffset: number; // Days after campaign start
    status: 'pending' | 'sent' | 'cancelled';
    scheduledDate?: string;
  }[];
  startDate: string;
  status: 'active' | 'paused' | 'completed';
}

export interface SpacedRepetitionItem {
  id: string;
  learnerId: string;
  sessionId: string;
  content: string;
  type: 'vocabulary' | 'grammar' | 'phrase' | 'concept';
  intervals: number[]; // Days: [1, 3, 7, 14, 30]
  currentInterval: number;
  nextReviewDate: string;
  timesReviewed: number;
  status: 'active' | 'mastered' | 'paused';
}

export interface HomeworkAssignment {
  id: string;
  learnerId: string;
  sessionId?: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'assigned' | 'submitted' | 'reviewed' | 'overdue';
  xpReward: number;
  attachments?: string[];
  submittedAt?: string;
  feedback?: string;
  grade?: number;
}

// ============ GAMIFICATION TYPES ============
export interface LearnerLevel {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
  color: string;
  icon: string;
}

export const LEVEL_TIERS: LearnerLevel[] = [
  { level: 1, name: 'Beginner', minXP: 0, maxXP: 99, color: 'gray', icon: '🌱' },
  { level: 2, name: 'Novice', minXP: 100, maxXP: 299, color: 'green', icon: '🌿' },
  { level: 3, name: 'Elementary', minXP: 300, maxXP: 599, color: 'blue', icon: '💧' },
  { level: 4, name: 'Intermediate', minXP: 600, maxXP: 999, color: 'purple', icon: '⭐' },
  { level: 5, name: 'Upper-Intermediate', minXP: 1000, maxXP: 1499, color: 'orange', icon: '🔥' },
  { level: 6, name: 'Advanced', minXP: 1500, maxXP: 2199, color: 'red', icon: '💎' },
  { level: 7, name: 'Expert', minXP: 2200, maxXP: 2999, color: 'pink', icon: '👑' },
  { level: 8, name: 'Master', minXP: 3000, maxXP: Infinity, color: 'yellow', icon: '🏆' },
];

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'attendance' | 'streak' | 'xp' | 'homework' | 'special';
  requirement: number;
  xpReward: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-session', name: 'First Steps', description: 'Complete your first session', icon: '👣', category: 'attendance', requirement: 1, xpReward: 10 },
  { id: 'ten-sessions', name: 'Dedicated Learner', description: 'Complete 10 sessions', icon: '📚', category: 'attendance', requirement: 10, xpReward: 50 },
  { id: 'twenty-five-sessions', name: 'Commitment', description: 'Complete 25 sessions', icon: '🎯', category: 'attendance', requirement: 25, xpReward: 100 },
  { id: 'fifty-sessions', name: 'Half Century', description: 'Complete 50 sessions', icon: '🌟', category: 'attendance', requirement: 50, xpReward: 200 },
  { id: 'hundred-sessions', name: 'Centurion', description: 'Complete 100 sessions', icon: '💯', category: 'attendance', requirement: 100, xpReward: 500 },
  { id: 'streak-7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', category: 'streak', requirement: 7, xpReward: 30 },
  { id: 'streak-30', name: 'Monthly Master', description: 'Maintain a 30-day streak', icon: '🌙', category: 'streak', requirement: 30, xpReward: 150 },
  { id: 'streak-100', name: 'Unstoppable', description: 'Maintain a 100-day streak', icon: '⚡', category: 'streak', requirement: 100, xpReward: 500 },
  { id: 'xp-500', name: 'XP Hunter', description: 'Earn 500 XP', icon: '✨', category: 'xp', requirement: 500, xpReward: 25 },
  { id: 'xp-1000', name: 'XP Master', description: 'Earn 1000 XP', icon: '💫', category: 'xp', requirement: 1000, xpReward: 50 },
  { id: 'homework-5', name: 'Homework Hero', description: 'Complete 5 homework assignments', icon: '📝', category: 'homework', requirement: 5, xpReward: 40 },
  { id: 'homework-20', name: 'Assignment Ace', description: 'Complete 20 homework assignments', icon: '🏅', category: 'homework', requirement: 20, xpReward: 100 },
  { id: 'perfect-week', name: 'Perfect Week', description: 'No missed sessions in a week', icon: '💎', category: 'special', requirement: 1, xpReward: 75 },
  { id: 'early-bird', name: 'Early Bird', description: 'Complete a session before 8 AM', icon: '🌅', category: 'special', requirement: 1, xpReward: 20 },
];

export interface Challenge {
  id: string;
  learnerId?: string; // If null, it's a global challenge
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  target: number;
  current: number;
  xpReward: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'failed' | 'expired';
  category: 'sessions' | 'xp' | 'streak' | 'homework' | 'vocabulary' | 'custom';
}

export interface StreakFreeze {
  id: string;
  learnerId: string;
  earnedAt: string;
  usedAt?: string;
  status: 'available' | 'used' | 'expired';
}

export interface RewardShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpCost: number;
  type: 'cosmetic' | 'utility' | 'certificate';
  stock: number; // -1 for unlimited
}

export const REWARD_SHOP_ITEMS: RewardShopItem[] = [
  { id: 'streak-freeze', name: 'Streak Freeze', description: 'Protect your streak for one day', icon: '🧊', xpCost: 100, type: 'utility', stock: -1 },
  { id: 'gold-frame', name: 'Gold Avatar Frame', description: 'A shiny gold frame for your avatar', icon: '🖼️', xpCost: 250, type: 'cosmetic', stock: -1 },
  { id: 'priority-scheduling', name: 'Priority Scheduling', description: 'Get first pick of time slots for a month', icon: '⏰', xpCost: 500, type: 'utility', stock: 5 },
  { id: 'fun-certificate', name: 'Fun Achievement Certificate', description: 'A personalized fun certificate', icon: '🎖️', xpCost: 150, type: 'certificate', stock: -1 },
  { id: 'custom-lesson', name: 'Custom Lesson Topic', description: 'Request any topic for your next lesson', icon: '🎨', xpCost: 300, type: 'utility', stock: -1 },
];

export type LeaderboardDivision = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface LearnerTag {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export const DEFAULT_TAGS: LearnerTag[] = [
  { id: 'vip', name: 'VIP', color: 'yellow' },
  { id: 'at-risk', name: 'At Risk', color: 'red' },
  { id: 'new', name: 'New', color: 'green' },
  { id: 'paused', name: 'Paused', color: 'gray' },
  { id: 'trial', name: 'Trial', color: 'blue' },
  { id: 'corporate', name: 'Corporate', color: 'purple' },
];

export interface Notification {
  id: string;
  type: 'session' | 'task' | 'milestone' | 'payment' | 'system';
  title: string;
  message: string;
  learnerId?: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface PaymentRecord {
  id: string;
  learnerId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'refunded';
  dueDate: string;
  paidAt?: string;
  description: string;
  invoiceNumber?: string;
}

export interface ResourceItem {
  id: string;
  learnerId: string;
  name: string;
  type: 'file' | 'link' | 'pdf' | 'video' | 'audio';
  url: string;
  topic?: string;
  uploadedAt: string;
  size?: number;
}

export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  defaultDuration: number;
  defaultScript: string;
  defaultTopics: string[];
  category: string;
}

// ============ ONBOARDING TYPES ============
export interface OnboardingData {
  // Step 1: Personal Info
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  timezone: string;
  timeOffsetMinutes?: number;
  gender: 'male' | 'female' | 'other';
  avatarId: number;
  occupation: string;
  
  // Step 2: Assessment
  placementScore: number;
  initialLevel: CourseLevel;
  assessmentAnswers: { questionId: string; answer: string; correct: boolean }[];
  
  // Step 3: Learning Style & Goals
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  goals: string[];
  expectations: string;
  interests: string;
  
  // Step 4: Schedule
  preferredDays: string[];
  preferredTimes: string[];
  sessionFrequency: 'once' | 'twice' | 'three' | 'custom';
  
  // Step 5: Communication
  emailPreference: 'every-session' | 'weekly' | 'bi-weekly' | 'minimal';
  wantsReminders: boolean;
  wantsProgressReports: boolean;
}

export interface PlacementQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  level: CourseLevel;
}

export interface LearningStyleQuestion {
  id: string;
  question: string;
  options: { text: string; style: 'visual' | 'auditory' | 'kinesthetic' | 'reading' }[];
}
