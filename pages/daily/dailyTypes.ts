/**
 * Daily Lesson — shared JSON schema.
 *
 * Ported from the `Daily_Lesson` app. This is the canonical type used by both
 * the standalone HTML generator and the React presenter. It describes a full
 * 10-step lesson plus the three bonus modules (Conversation Game, Guess the
 * Place, Leaderboard) and the cat mascot's feedback copy.
 */

export interface WarmupQuestion {
  question: string;
  answer: string;
  emoji: string;
}

export interface KeywordTerm {
  term: string;
  definition: string;
  example: string;
  level: string; // B1 / B2 / C1
  translation?: Record<string, string>;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  emotion: string;
}

export interface ReadingLevel {
  title: string;
  content: string;
}

export interface GrammarSlide {
  level: string; // 'A2/B1' | 'B1/B2' | 'B2/C1'
  structure: string;
  example: string;
  meaning: string;
  mistake: string;
  alternatives: string[];
}

export interface RadioDramaLine {
  character: string;
  text: string;
  emotion: string;
}

export interface ComprehensionQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface RadioDrama {
  title: string;
  setting: string;
  cast: string[];
  lines: RadioDramaLine[];
  comprehensionQuestions?: ComprehensionQuestion[];
  ambientSound?: string;
}

export interface DiscussionComment {
  character: string;
  avatar: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export interface QuizQuestion extends ComprehensionQuestion {}

export interface ConversationChoice {
  text: string;
  next: string;
  catNote: string;
}

export interface ConversationNode {
  id: string;
  speaker: string;
  text: string;
  emotion: string;
  choices: ConversationChoice[];
  isEnd?: boolean;
  isWin?: boolean;
  endMessage?: string;
}

export interface ConversationGameData {
  title: string;
  description: string;
  characters: { name: string; role: string; avatar: string; personality: string }[];
  nodes: Record<string, ConversationNode>;
  keywords: Record<string, string>;
  discussionQuestions: string[];
}

export interface PlaceImage {
  label: string;
  emoji: string;
  description: string;
}

export interface SurvivalPhrase {
  phrase: string;
  pronunciation: string;
  translation: string;
  context: string;
}

export interface GuessThePlaceData {
  name: string;
  coordinates: { lat: number; lng: number };
  clue: string;
  tooltipWords: Record<string, string>;
  hints: string[];
  images: PlaceImage[];
  funFacts: string[];
  cultureNotes: string[];
  thingsToAvoid: string[];
  country: string;
  language: string;
  languageCode: string;
  survivalPhrases: SurvivalPhrase[];
  audioTour: {
    lines: { speaker: string; text: string }[];
  };
}

export interface CatFeedback {
  correct: string[];
  incorrect: string[];
  idle: string[];
  lessonIntro: string;
  moduleIntro: Record<string, string>;
}

export interface DailyLessonData {
  topic: string;
  level: string;
  theme: string;
  warmup: WarmupQuestion[];
  keywords: KeywordTerm[];
  dialogue: { title: string; speakers: string[]; lines: DialogueLine[] };
  reading: { basic: ReadingLevel; intermediate: ReadingLevel; advanced: ReadingLevel };
  grammarSlides: GrammarSlide[];
  radioDrama: RadioDrama;
  dictation: { sentences: string[] };
  discussion: { topic: string; post: string; comments: DiscussionComment[] };
  quiz: QuizQuestion[];
  secretCode: string;
  conversationGame?: ConversationGameData;
  guessThePlace?: GuessThePlaceData;
  catFeedback: CatFeedback;
  keywordTranslations?: Record<string, Record<string, string>>;
  stepImages?: Record<string, string>;
}