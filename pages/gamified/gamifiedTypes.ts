/**
 * Gamified Challenge — shared JSON schema (ported 1:1 from the Gamified-Challnege
 * React app so the standalone HTML, the React presenter and the Manual JSON
 * Creator all consume the same lesson shape).
 */

export interface GamifiedLearnerInfo {
  name: string;
  photo: string;
  l1: string;
  l2: string;
  level: string;
  goals: string;
  objectives: string;
  facts: string;
}

export interface GamifiedCharacterVoice {
  character: string;
  voiceURI: string;
}

export interface GamifiedDialogueOption {
  text: string;
  outcome: 'survive' | 'die' | 'neutral';
  response: string;
  points: number;
}

export interface GamifiedDialogueTurn {
  narrator: string;
  character?: string;
  question: string;
  options: GamifiedDialogueOption[];
}

export interface GamifiedGlitchWord {
  text: string;
  isGlitch: boolean;
  correction?: string;
}

export interface GamifiedListeningChallenge {
  text: string;
  hiddenWord: string;
  hint: string;
}

export interface GamifiedSpeakingChallenge {
  text: string;
  targetAccuracy: number;
  clueOnSuccess: string;
  mode: 'whisper' | 'shout' | 'normal';
}

export interface GamifiedDragDropClue {
  clue: string;
  match: string;
}

export interface GamifiedBossBattleQuestion {
  question: string;
  options: string[];
  correct: number;
  timeLimit: number;
}

export interface GamifiedVocabItem {
  word: string;
  translation: string;
  definition: string;
  example: string;
  partOfSpeech: string;
}

export interface GamifiedGrammarPoint {
  rule: string;
  explanation: string;
  examples: string[];
  exercises: GamifiedGrammarExercise[];
}

export interface GamifiedGrammarExercise {
  instruction: string;
  sentence: string;
  answer: string;
  options?: string[];
}

export interface GamifiedDictationItem {
  text: string;
  speed: 'slow' | 'normal' | 'fast';
}

export interface GamifiedWritingPrompt {
  prompt: string;
  minWords: number;
  keywords: string[];
  sampleAnswer: string;
}

export interface GamifiedQuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  hint?: string;
  codeFragment?: string;
}

export interface GamifiedDayContent {
  dayNumber: number;
  title: string;
  subtitle: string;
  skill: string;
  narratorIntro: string;
  narratorOutro: string;
  backgroundImage: string;
  artifactEmoji: string;
  artifactName: string;
  unlockCode: string;
  codeHint: string;
  lesson: {
    title: string;
    content: string;
    sections: GamifiedLessonSection[];
  };
  vocabulary: GamifiedVocabItem[];
  grammar: GamifiedGrammarPoint[];
  reading: {
    text: string;
    glitchWords: GamifiedGlitchWord[];
    comprehensionQuestions: GamifiedQuizQuestion[];
  };
  listening: GamifiedListeningChallenge[];
  dialogue: {
    scenario: string;
    characters: string[];
    turns: GamifiedDialogueTurn[];
  };
  speaking: GamifiedSpeakingChallenge[];
  writing: GamifiedWritingPrompt[];
  dictation: GamifiedDictationItem[];
  quiz: GamifiedQuizQuestion[];
  bossBattle?: GamifiedBossBattleQuestion[];
  dragDropClues?: GamifiedDragDropClue[];
  fearMeterImpact: number;
  timeLimit: number;
  pointsAvailable: number;
}

export interface GamifiedLessonSection {
  title: string;
  content: string;
  type: 'text' | 'dialogue' | 'exercise' | 'note' | 'warning';
}

export interface GamifiedThemeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  colorPrimary: string;
  colorSecondary: string;
  backgroundImages: string[];
  soundTheme: string;
  days: GamifiedDayContent[];
  narratorVoicePreference: string;
  masterCode?: string;
  startDate?: string;
}

/** Everything the standalone HTML / React presenter persist per learner. */
export interface GamifiedProgressRecord {
  fileName: string;
  title: string;
  points: number;
  fearMeter: number;
  completedDays: number[];
  unlockedDays: number[];
  badges: string[];
  cluesCollected: string[];
  mysteryBoxes: number;
  updatedAt: string;
}