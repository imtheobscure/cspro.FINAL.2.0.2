/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Emotion {
  Happy = 'Happy',
  Sad = 'Sad',
  Angry = 'Angry',
  Neutral = 'Neutral'
}

export interface TranscriptionSegment {
  speaker: string;
  timestamp: string;
  content: string;
  language: string;
  translation?: string;
  emotion?: Emotion;
}

export interface TranscriptionResponse {
  summary: string;
  segments: TranscriptionSegment[];
}

export type AppStatus = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export interface AudioData {
  blob: Blob;
  base64: string;
  mimeType: string;
  duration?: number;
  micAssignment?: 'tutor' | 'learner';
  tabAssignment?: 'tutor' | 'learner';
}

export interface StudentProfile {
  name: string;
  tutorName?: string;
  nationality: string;
  l1: string;
  addL1Translations: boolean;
  l2: string; // Target language
  explanationsInEnglish: boolean;
  focusedLanguage: string;
  facts: string;
}

export interface FalseFriendItem {
  word: string;
  l1Meaning: string;
  actualMeaning: string;
  warning: string;
}

export interface WordFamilyItem {
  base: string;
  family: string[];
}

export interface OverusedWordItem {
  word: string;
  count: number;
  alternatives: string[];
}

export interface IdiomItem {
  idiom: string;
  definition: string;
  status: 'attempted' | 'correct' | 'recommended';
}

export interface SynonymSuggestion {
  studentSpoke: string;
  formalVersion: string;
  casualVersion: string;
  note: string;
}

export interface LanguageMistake {
  id: string;
  timestamp: string;
  type: 'article' | 'preposition' | 'subject-verb agreement' | 'tense' | 'word choice' | 'pronunciation';
  error: string;
  correction: string;
  explanation: string;
  ruleId: string; // index in ruleBank or custom rule identifier
  persistenceCount: number; // For error persistence meter
}

export interface RuleCard {
  id: string;
  title: string;
  content: string;
}

export interface SpeakerTalkingRatio {
  student: number; // Percentage
  tutor: number;   // Percentage
}

export interface FillerWordCount {
  word: string;
  count: number;
}

export interface MinuteFillerTrack {
  minute: number;
  count: number;
}

export interface FillerWordDensity {
  averageDensity: number; // e.g. 2.5 per minute
  trendData: MinuteFillerTrack[];
  fillerWords: FillerWordCount[];
}

export interface StandoutSentence {
  sentence: string;
  analysis: string;
  structurallySound: boolean;
}

export interface PronunciationPhonemeMatch {
  word: string;
  phoneticGuidance: string;
  mispronounced: boolean;
  timestamp: string;
}

export interface HomeworkExercise {
  day: number; // Day 1 to Day 7
  type: 'drag-drop' | 'fill-blank' | 'multiple-choice';
  question: string;
  options?: string[]; // Multiple choice or drag items
  correctAnswer: string;
  explanation: string;
}

export interface ScenarioVersion {
  description: string;
  tasks: string[];
}

export interface InteractiveScenario {
  title: string;
  basic: ScenarioVersion;
  intermediate: ScenarioVersion;
  advanced: ScenarioVersion;
}

export interface TeacherFeedback {
  generalLessonTopic: string;
  subtopicClustering: Array<{
    title: string;
    description: string;
    timestamp: string;
  }>;
  keyTakeaways: {
    wins: string[];
    futureFocus: string[];
  };
  vocabulary: {
    totalWords: number;
    newWordsCount: number;
    passiveVocab: string[];
    activeVocab: string[];
    overusedWords: OverusedWordItem[];
    wordFamilyExpansion: WordFamilyItem[];
    falseFriends: FalseFriendItem[];
  };
  cefrLevel: {
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    targetLevelProjection: string;
    missingWordsList: string[];
  };
  advancedVocab: {
    idiomsPhrasalDashboard: {
      attempted: number;
      usedCorrectly: number;
      list: IdiomItem[];
    };
  };
  synonymSuggestions: SynonymSuggestion[];
  grammarInsights: {
    mistakes: LanguageMistake[];
    ruleBank: RuleCard[];
    positiveReinforcement: string[];
  };
  speakingMetrics: {
    speakingTimeRatio: SpeakerTalkingRatio;
    turnTakingFairnessScore: number; // 0 - 100
    fillerWordDensity: FillerWordDensity;
    standoutSentence: StandoutSentence;
  };
  pronunciationFeedback: PronunciationPhonemeMatch[];
  connectedFeatures: {
    dailyExercises: HomeworkExercise[];
    scenarios: InteractiveScenario[];
  };
}
