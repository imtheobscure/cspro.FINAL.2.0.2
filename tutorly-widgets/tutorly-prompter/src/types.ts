// Core type definitions for Tutorly Prompter

export type ProfileKind =
  | "lesson"
  | "free_discussion"
  | "friendly_chat"
  | "trial_preply"
  | "content_maker"
  | "profile_intro"
  | "custom";

export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface LearnerFacts {
  id: string;
  name: string;
  l1: string;
  cefr: CEFR;
  age?: string;
  interests?: string;
  goals?: string;
  notes?: string;
  targetAccent?: string; // e.g. "American English", "British English", "Australian"
}

export interface CustomProfile {
  id: string;
  name: string;
  description: string;
  instructions: string; // embedded in the prompt
}

export type ContentVerbosity = "minimal" | "average" | "maximum";

export interface PromptSettings {
  profile: ProfileKind;
  customProfileId?: string;
  targetMinutes: number;
  includeWarmUp: boolean;
  includeLeadIn: boolean;
  includeCooler: boolean;
  includeBlooms: boolean;
  includePronunciation: boolean;
  includeTranslation: boolean;
  translationLanguage: string;
  includePredictedQuestions: boolean;
  includeWhiteboard: boolean;
  includeFormative: boolean;
  bilingualMode: boolean;
  contentPlatform?: "youtube" | "instagram" | "tiktok" | "shorts" | "profile_intro";
  verbosity: ContentVerbosity;
  customInstructions: string;
  waitTimeSec: number; // default wait time after questions (sent to AI, used for timers)
  // Teacher Guide sub-options
  teacherGuide: {
    enabled: boolean;
    ccqs: boolean;
    extraExplanation: boolean;
    sel: boolean;
    softSkills: boolean;
    discussionQuestions: boolean;
    relatedVocabulary: boolean;
    relatedGrammar: boolean;
    homeworkIdea: boolean;
    onlineChallenges: boolean;
    activities: boolean;
    teacherTips: boolean;
    customItems: string[];
  };
}

// === Lesson JSON returned by AI ===

export type CueCategory =
  | "question"
  | "slide"
  | "poll"
  | "activity"
  | "joke"
  | "transition"
  | "image"
  | "whiteboard"
  | "note";

export type Emotion =
  | "smile"
  | "serious"
  | "excited"
  | "warm"
  | "curious"
  | "encouraging"
  | "neutral";

export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

export interface CueCard {
  id?: string;
  category: CueCategory;
  text: string;
  imageQuery?: string;
  durationSec?: number;
  hotkey?: number;
}

export interface PredictedQuestion {
  q: string;
  hint?: string;
}

export interface TeacherGuide {
  ccqs?: string[];
  extraExplanation?: string;
  sel?: string;
  softSkills?: string;
  discussionQuestions?: string[];
  relatedVocabulary?: string[];
  relatedGrammar?: string;
  homeworkIdea?: string;
  onlineChallenges?: string[];
  activities?: string[];
  teacherTips?: string;
}

export interface SentenceAnnotation {
  intonation?: "up" | "down" | "flat";
  pitchContour?: number[];
  bloom?: BloomLevel;
  emotion?: Emotion;
  waitTimeSec?: number;
  pronunciation?: { word: string; ipa: string }[];
  translations?: { word: string; tr: string }[];
  accentMarkers?: { word: string; reason: string }[];
  predicted?: PredictedQuestion[];
  confidenceBoost?: string;
  cues?: CueCard[];
}

export interface LessonSentence {
  text: string;
  ann?: SentenceAnnotation;
}

export interface LessonSection {
  id: string;
  title: string;
  kind:
    | "warm_up"
    | "lead_in"
    | "presentation"
    | "practice"
    | "production"
    | "cooler"
    | "discussion"
    | "trial_intro"
    | "trial_assessment"
    | "trial_close"
    | "content_hook"
    | "content_body"
    | "content_cta"
    | "custom";
  estimatedMinutes: number;
  sentences: LessonSentence[];
  cues?: CueCard[];
  teacherGuide?: TeacherGuide;
}

export interface LessonGlossaryItem {
  term: string;
  definition: string;
  exampleSentence?: string;
}

export interface LessonPlan {
  title: string;
  profile: ProfileKind;
  learner: LearnerFacts;
  targetMinutes: number;
  sections: LessonSection[];
  glossary?: LessonGlossaryItem[];
  notes?: string;
  generatedAt?: string;
}

// === UI / persisted state ===

export type ColorScheme = "dark" | "light" | "highContrastWB" | "highContrastYB";

export interface DisplaySettings {
  fontFamily: string;
  fontSizePx: number;
  lineHeight: number;
  letterSpacingEm: number;
  maxWidthCh: number;
  scheme: ColorScheme;
  opacity: number;
  anchor: "third" | "half";
  focusMode: boolean;
  showPitchContour: boolean;
  showTranslations: boolean;
  showPronunciation: boolean;
  showBloom: boolean;
  showEmotion: boolean;
  snapToParagraph: boolean;
  fullscreenLock: boolean;
  scrollSpeed: number; // 0.25 – 4.0 multiplier
  showWebcam: boolean;
}

export interface VoiceSettings {
  enabled: boolean;
  baseWPM: number;
  minWPM: number;
  maxWPM: number;
  autoPauseSec: number;
  waitTimeSec: number;
}

export interface AppData {
  display: DisplaySettings;
  voice: VoiceSettings;
  prompt: PromptSettings;
  learner: LearnerFacts;
  learners: LearnerFacts[];
  activeLearnerIdx: number;
  customProfiles: CustomProfile[];
  rawLessonText: string;
  lessonJsonText: string;
  lesson: LessonPlan | null;
  bookmarks: number[];
  studentRoster: string[];
}
