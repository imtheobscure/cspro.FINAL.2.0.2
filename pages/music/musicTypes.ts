// Music Lesson — shared JSON schema (ported 1:1 from the music-lesson-v1 app).

export interface WordHighlight {
  word: string;
  type: 'idiom' | 'phrasal_verb' | 'vocab' | 'grammar';
  definition: string;
  translation: string;
  example: string;
  ccq: string;
}

export interface CardIteration {
  question: string;
  instruction?: string; // Cat reads this on hover
  options?: string[];
  answer: any;
  context?: string;
  scrambled?: string;
  pairs?: { left: string; right: string }[];
  sentenceParts?: string[]; // for sentenceBuilder / dragDrop
  ordering?: string[]; // shuffled list for ordering activity
  correctOrder?: string[];
  mistakeText?: string;
  correctedText?: string;
  prompt?: string; // open-ended prompts (discussion)
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
}

export interface ActivityBlock {
  type:
    | 'gapFill'
    | 'dragDrop'
    | 'scramble'
    | 'match'
    | 'multipleChoice'
    | 'trueFalse'
    | 'ordering'
    | 'dictation'
    | 'errorCorrection'
    | 'sentenceBuilder'
    | 'findMistake'
    | 'discussionQuestions';
  title: string;
  instruction: string; // Cat reads on hover
  cards: CardIteration[];
}

export interface Challenge {
  type:
    | 'roleplay'
    | 'lyricTranscription'
    | 'karaoke'
    | 'metaphor'
    | 'newVerse'
    | 'compareSongs'
    | 'paraphraseChorus'
    | 'shortReview'
    | 'debate'
    | 'predictNext'
    | 'predictPast'
    | 'audioRecording';
  title: string;
  instruction: string; // Cat reads on hover
  data: any;
}

export interface LessonContentCard {
  heading: string;
  htmlBody: string; // Color-coded sections
  /** Optional heading of the same card written in the learner's native language (L1). */
  l1Heading?: string;
  /** Optional native-language (L1) version of the card body — a simpler, easier-to-read twin. */
  l1HtmlBody?: string;
}

export interface ConceptCheck {
  question: string;
  checklist: string[];
  /** Optional native-language (L1) version of the concept-check question. */
  l1Question?: string;
}

export interface MiniLesson {
  id: string;
  timeMarker: number;
  title: string;
  /** Optional native-language (L1) title. */
  l1Title?: string;
  /** Optional 1-2 sentence native-language (L1) summary of the whole mini-lesson. */
  l1Summary?: string;
  contentCards: LessonContentCard[]; // Multiple cards if long content
  ccqs: ConceptCheck[];
  activities: ActivityBlock[];
  challenge: Challenge;
  catFeedback: string;
  /** Optional native-language (L1) version of the tutor feedback. */
  catFeedbackL1?: string;
}

export interface SubtitleLine {
  start: number;
  end: number;
  text: string;
  translation?: string;
  highlights?: WordHighlight[];
}

export interface LearnerProfileRef {
  name?: string;
  level?: string;
  l1?: string;
  goals?: string;
  focus?: string;
}

export interface PremiumLesson {
  id: string;
  songTitle: string;
  artist: string;
  level: string; // CEFR
  goals: string;
  l1: string;
  mediaUrl: string;
  subtitles: SubtitleLine[];
  miniLessons: MiniLesson[];
  learnerProfile?: LearnerProfileRef;
  createdAt?: string;
}