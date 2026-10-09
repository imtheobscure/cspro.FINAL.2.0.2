export type SupportedLanguage = 
  | 'en' // English
  | 'zh' // Chinese (Mandarin)
  | 'fr' // French
  | 'it' // Italian
  | 'de' // German
  | 'tr' // Turkish
  | 'fa'; // Farsi / Persian

export interface WordTranslation {
  word: string;
  pronunciation?: string; // Pinyin, phonetics or guide
}

export interface CCQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  speakingPrompt: string; // Encourages oral sentence production
}

export interface VocabularyItem {
  id: string;
  english: string;
  emoji: string;
  phonetic: string;
  category: string;
  translations: Record<SupportedLanguage, WordTranslation>;
  exampleSentence: string;
  exampleTranslation: Record<SupportedLanguage, string>;
  ccq: CCQuestion;
  chant: string;
  funFact: string;
}

export interface StoryPage {
  pageNumber: number;
  text: string;
  translations: Record<SupportedLanguage, string>;
  illustrationEmoji: string;
  ccqPrompt: string;
}

export interface StoryBook {
  title: string;
  theme: string;
  pages: StoryPage[];
}

export interface ThemeModule {
  id: string;
  slug: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  color: string;
  words: VocabularyItem[];
  story: StoryBook;
  tutorChant: string;
}

export interface SpokenMission {
  id: string;
  title: string;
  gameKey: string;
  icon: string;
  description: string;
  instructions: string;
  character: string;
  levels: SpokenMissionLevel[];
}

export interface SpokenMissionLevel {
  id: string;
  scenarioPrompt: string;
  targetResponse: string;
  whisperOrNormal: 'whisper' | 'normal' | 'excited' | 'polite' | 'interrogation';
  characterAudioPrompt: string;
  cluesOrContext: string[];
  options: string[];
  correctOptionIndex: number;
  tutorCCQ: string;
  rewardStars: number;
}
