export type ActivityType =
  | 'flashcard'
  | 'multipleChoice'
  | 'trueFalse'
  | 'fillBlanks'
  | 'dragDrop'
  | 'matching'
  | 'speaking'
  | 'truthOrDare'
  | 'wouldYouRather'
  | 'discussion'
  | 'predictNext'
  | 'voiceOver'
  | 'ordering'
  | 'wordScramble'
  | 'reflection'
  | 'hotspot'
  | 'videoPause'
  | 'readingChallenge'
  | 'listeningComprehension';

export type ActivityColor = 'gold' | 'teal' | 'purple' | 'orange' | 'green' | 'pink' | 'blue';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AppMode = 'subtitle' | 'transcript';

export interface SubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface LessonCard {
  front: string;
  back: string;
  example?: string;
  pronunciation?: string;
  translation?: string; // L1 native language translation
}

export interface ReadingContent {
  title: string;
  genre: 'fiction' | 'factual' | 'whatIf';
  text: string;
  translation?: string;
  questions: { question: string; options: ActivityOption[]; explanation?: string }[];
}

export interface ListeningContent {
  title: string;
  genre: 'podcast' | 'dialogue' | 'talk' | 'interview' | 'story';
  audioText: string; // Text to be read aloud by TTS
  translation?: string;
  showTranscript: boolean;
  questions: { question: string; options: ActivityOption[]; timestamp?: number }[];
}

export interface HotspotContent {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  question: string;
  options?: ActivityOption[];
  hint?: string;
}

export interface WhiteboardElement {
  id: string;
  type: 'text' | 'drawing' | 'shape' | 'highlight' | 'arrow' | 'sticky';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color: string;
  fontSize?: number;
  points?: { x: number; y: number }[]; // for drawings
  shapeType?: 'rect' | 'circle' | 'line';
}

export interface WhiteboardState {
  timestamp: number;
  elements: WhiteboardElement[];
  snapshot?: string; // base64 image for export
}

export interface ActivityOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: number;
  title?: string;
  lessonContent?: {
    warmUp?: string;
    form?: string;
    meaning?: string;
    use?: string;
    personalizedExamples?: string[];
    lifeApplication?: string;
  };
  content: {
    question?: string;
    term?: string;
    definition?: string;
    example?: string;
    pronunciation?: string;
    translation?: string; // L1 translation
    options?: ActivityOption[];
    answer?: boolean;
    sentence?: string;
    blanks?: string[];
    items?: string[];
    targets?: string[];
    pairs?: MatchPair[];
    expectedSentence?: string;
    dare?: string;
    truth?: string;
    wouldYouOption1?: string;
    wouldYouOption2?: string;
    discussionPrompt?: string;
    predictOptions?: { text: string; consequence: string }[];
    // Hotspot
    hotspot?: HotspotContent;
    // VideoPause - open-ended question
    videoPausePrompt?: string;
    // Reading Challenge
    reading?: ReadingContent;
    whatIfScenario?: { scenario: string; options: { choice: string; consequence: string; followUp?: string }[] };
    // Listening Comprehension
    listening?: ListeningContent;
    cards?: LessonCard[];
    scrambledWord?: string;
    correctWord?: string;
    orderedItems?: string[];
    reflectionPrompt?: string;
  };
  correctFeedback: string;
  incorrectFeedback: string;
  catFeedback?: { correct?: string; incorrect?: string };
  points: number;
  requiredForNext: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  emoji: string;
  color: ActivityColor;
}

export interface Segment {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  activities: Activity[];
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  rarity: BadgeRarity;
  condition: string;
  description: string;
}

export interface LessonMetadata {
  title: string;
  targetLanguage: string;
  cefrLevel: string;
  estimatedDurationSeconds: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  learnerL1?: string;
}

export interface GlobalSettings {
  pointsToLevelUp: number;
  enableStreak: boolean;
  suspenseSounds: boolean;
}

export interface LearnerProfile {
  name: string;
  level: string;
  nativeLanguage: string;
  goals: string;
  interests: string;
  facts: string;
}

export interface Lesson {
  metadata: LessonMetadata;
  segments: Segment[];
  globalSettings: GlobalSettings;
  badges: Badge[];
  learnerProfile?: LearnerProfile;
}

export interface LearnerState {
  name: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  badges: string[];
  completedActivities: string[];
  journal: { prompt: string; answer: string; timestamp: number }[];
}

export interface LeaderboardEntry {
  name: string;
  avatar: string;
  xp: number;
  isPlayer: boolean;
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

export interface HotspotData {
  id: string;
  x: number;
  y: number;
  timestamp: number;
  title: string;
  content: string;
}

export interface TimelineMarker {
  id: string;
  time: number;
  type: ActivityType;
  color: ActivityColor;
  completed: boolean;
  label: string;
}
