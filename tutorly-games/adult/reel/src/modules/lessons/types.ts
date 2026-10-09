/**
 * Canonical Video Lesson JSON contract.
 * The renderer renders this JSON; nothing about a specific lesson is hardcoded in components.
 */

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export type Difficulty = "easy" | "medium" | "hard";
export type ActivityKind = "core" | "optional" | "review" | "bonus";
export type Skill =
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "vocabulary"
  | "grammar"
  | "comprehension"
  | "pronunciation";

export const ACTIVITY_TYPES = [
  "flashcard",
  "multipleChoice",
  "trueFalse",
  "fillBlanks",
  "dragDrop",
  "matching",
  "speaking",
  "truthOrDare",
  "wouldYouRather",
  "discussion",
  "predictNext",
  "voiceOver",
  "ordering",
  "wordScramble",
  "reflection",
  "hotspot",
  "videoPause",
  "readingChallenge",
  "listeningComprehension",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ChoiceOption = { id: string; text: string; isCorrect: boolean };
export type ComprehensionQuestion = {
  id: string;
  question: string;
  options: ChoiceOption[];
  explanation?: string;
};

export type Flashcard = {
  front: string;
  back: string;
  pronunciation?: string;
  translation?: string;
  example?: string;
};

export type ActivityContentMap = {
  flashcard: { cards: Flashcard[] };
  multipleChoice: { question: string; options: ChoiceOption[] };
  trueFalse: { question: string; answer: boolean };
  fillBlanks: { sentence: string; blanks: string[]; hint?: string; translation?: string };
  dragDrop: {
    items: { id: string; text: string }[];
    targets: { id: string; label: string }[];
    pairs: { itemId: string; targetId: string }[];
  };
  matching: { pairs: { left: string; right: string }[] };
  speaking: { expectedSentence: string; translation?: string; tip?: string };
  truthOrDare: { truth: string; dare: string };
  wouldYouRather: { wouldYouOption1: string; wouldYouOption2: string };
  discussion: { discussionPrompt: string; guidingQuestions?: string[] };
  predictNext: {
    question: string;
    predictOptions: { text: string; consequence: string; isCorrect?: boolean }[];
  };
  voiceOver: { question: string; line: string; startTime?: number; endTime?: number };
  ordering: { orderedItems: string[]; instruction?: string };
  wordScramble: { scrambledWord: string; correctWord: string; hint?: string };
  reflection: { reflectionPrompt: string };
  hotspot: { hotspot: { x: number; y: number; question: string; options: ChoiceOption[] } };
  videoPause: { videoPausePrompt: string; modelAnswer?: string };
  readingChallenge: {
    reading: {
      title: string;
      genre: "fiction" | "factual" | "whatIf";
      text: string;
      translation?: string;
      questions: ComprehensionQuestion[];
    };
  };
  listeningComprehension: {
    listening: {
      title: string;
      genre: "podcast" | "dialogue" | "talk" | "interview" | "story";
      audioText: string;
      showTranscript: boolean;
      questions: ComprehensionQuestion[];
    };
  };
};

export interface ActivityBase<T extends ActivityType = ActivityType> {
  id: string; // seg-1-act-1
  type: T;
  timestamp: number; // seconds on the video timeline
  title: string;
  emoji: string;
  color: string;
  points: number;
  requiredForNext: boolean;
  difficulty: Difficulty;
  kind?: ActivityKind;
  skill?: Skill;
  behavior?: "pause" | "overlay";
  correctFeedback: string;
  incorrectFeedback: string;
  comprehensiveFeedback: string;
  /** Grounding: which subtitle cues this activity is built from */
  sourceCueIds?: string[];
  sourceText?: string;
  vocabulary?: string[];
  grammar?: string[];
  pronunciation?: string[];
  content: ActivityContentMap[T];
}

export type Activity = { [K in ActivityType]: ActivityBase<K> }[ActivityType];

export type SegmentFocus = {
  grammar: string[];
  vocabulary: string[];
  pronunciation: string[];
};

export interface LessonSegment {
  id: string; // seg-1
  title: string;
  startTime: number;
  endTime: number;
  summary?: string;
  focus: SegmentFocus;
  activities: Activity[];
}

export interface LessonBadge {
  id: string;
  name: string;
  emoji: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  condition: string;
  description: string;
}

export interface LessonMetadata {
  title: string;
  lessonType: string;
  targetLanguage: string;
  nativeLanguage: string;
  cefrLevel: CEFRLevel;
  estimatedDurationSeconds: number;
  videoUrl?: string;
  episodeId?: string;
  courseId?: string;
  seriesId?: string;
  seasonId?: string;
  generatedBy?: "manual" | "ai" | "rules";
  reviewRatio?: number;
}

export interface LessonGlobalSettings {
  pointsToLevelUp: number;
  enableStreak: boolean;
  suspenseSounds: boolean;
  allowRetry: boolean;
  showProgress: boolean;
  showXP: boolean;
}

export interface LessonLearnerProfile {
  cefrLevel: CEFRLevel;
  nativeLanguage: string;
  targetLanguage: string;
  interests?: string[];
  goals?: string[];
}

export interface LessonSettings {
  lessonName: string;
  lessonTimeRange: string;
  teacherNotes: string;
  homeworkChecklist: string;
  materialLinks: string;
  difficulty?: Difficulty;
  lessonImages?: string[];
  lessonVideos?: string[];
  lessonMedia?: { id: string; url: string; type: string; caption?: string }[];
}

export interface VideoLesson {
  metadata: LessonMetadata;
  globalSettings: LessonGlobalSettings;
  badges: LessonBadge[];
  learnerProfile: LessonLearnerProfile;
  objectives: string[];
  segments: LessonSegment[];
  settings: LessonSettings;
}

/* ------------------------------------------------------------------ */
/* Activity registry metadata (UI + pedagogy)                          */
/* ------------------------------------------------------------------ */

export type ActivityMeta = {
  label: string;
  emoji: string;
  color: string;
  skill: Skill;
  scored: boolean; // has an objectively correct answer
  description: string;
};

export const ACTIVITY_META: Record<ActivityType, ActivityMeta> = {
  flashcard: { label: "Flashcards", emoji: "🃏", color: "#a78bfa", skill: "vocabulary", scored: false, description: "Flip through key words from the scene." },
  multipleChoice: { label: "Multiple Choice", emoji: "🎯", color: "#60a5fa", skill: "comprehension", scored: true, description: "Choose the best answer." },
  trueFalse: { label: "True / False", emoji: "⚖️", color: "#34d399", skill: "comprehension", scored: true, description: "Decide whether a statement is true." },
  fillBlanks: { label: "Fill the Blanks", emoji: "✍️", color: "#fbbf24", skill: "grammar", scored: true, description: "Complete the line from the video." },
  dragDrop: { label: "Drag & Drop", emoji: "🧩", color: "#f472b6", skill: "vocabulary", scored: true, description: "Sort items into the right groups." },
  matching: { label: "Matching", emoji: "🔗", color: "#22d3ee", skill: "vocabulary", scored: true, description: "Match pairs together." },
  speaking: { label: "Speaking", emoji: "🎤", color: "#fb7185", skill: "speaking", scored: true, description: "Say the line out loud." },
  truthOrDare: { label: "Truth or Dare", emoji: "🎲", color: "#f97316", skill: "speaking", scored: false, description: "Pick a truth or a dare and respond." },
  wouldYouRather: { label: "Would You Rather", emoji: "🤔", color: "#a3e635", skill: "speaking", scored: false, description: "Choose and justify your choice." },
  discussion: { label: "Discussion", emoji: "💬", color: "#38bdf8", skill: "speaking", scored: false, description: "Talk about the scene." },
  predictNext: { label: "Predict Next", emoji: "🔮", color: "#c084fc", skill: "comprehension", scored: true, description: "What happens next?" },
  voiceOver: { label: "Voice Over", emoji: "🎬", color: "#f43f5e", skill: "pronunciation", scored: false, description: "Dub the line while the video plays muted." },
  ordering: { label: "Ordering", emoji: "🔢", color: "#2dd4bf", skill: "grammar", scored: true, description: "Put the words in order." },
  wordScramble: { label: "Word Scramble", emoji: "🔀", color: "#facc15", skill: "vocabulary", scored: true, description: "Unscramble the word." },
  reflection: { label: "Reflection", emoji: "🪞", color: "#94a3b8", skill: "writing", scored: false, description: "Write a short reflection." },
  hotspot: { label: "Hotspot", emoji: "📍", color: "#ef4444", skill: "vocabulary", scored: true, description: "Answer about something on screen." },
  videoPause: { label: "Video Pause", emoji: "⏸️", color: "#818cf8", skill: "listening", scored: false, description: "Pause and respond to the moment." },
  readingChallenge: { label: "Reading Challenge", emoji: "📖", color: "#fb923c", skill: "reading", scored: true, description: "Read a short text and answer." },
  listeningComprehension: { label: "Listening", emoji: "🎧", color: "#4ade80", skill: "listening", scored: true, description: "Listen and answer." },
};

export const POINT_RANGES: Record<Difficulty, [number, number]> = {
  easy: [5, 10],
  medium: [10, 15],
  hard: [15, 25],
};

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function lessonActivityCount(lesson: VideoLesson): number {
  return lesson.segments.reduce((acc, s) => acc + s.activities.length, 0);
}

export function flattenActivities(lesson: VideoLesson): { segment: LessonSegment; activity: Activity }[] {
  const out: { segment: LessonSegment; activity: Activity }[] = [];
  for (const segment of lesson.segments) {
    for (const activity of segment.activities) out.push({ segment, activity });
  }
  return out.sort((a, b) => a.activity.timestamp - b.activity.timestamp);
}
