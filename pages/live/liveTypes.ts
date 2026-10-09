// ─── Core Lesson Types ────────────────────────────────────────────────────────

export type LessonPhase = 'study' | 'speak' | 'review';

export type AvatarTier = 'common' | 'rare' | 'epic' | 'legendary';

export interface LearnerProfile {
  name: string;
  age?: number;
  level?: string;
  interests?: string[];
  avatarTier?: AvatarTier;
  pastScores?: number[];
  preferences?: {
    ttsVoice?: string;
    language?: string;
  };
}

export interface GamificationConfig {
  points: number;
  retryAllowed: boolean;
  maxRetries: number;
  badgeConditions?: BadgeCondition[];
}

export interface BadgeCondition {
  id: string;
  label: string;
  icon: string;
  condition: 'perfect_score' | 'first_try' | 'speed_bonus' | 'streak';
  threshold?: number;
}

export type TimerBehaviour = 'auto_transition' | 'pause_allowed' | 'manual';

export interface TtsVoiceSelection {
  character: string;
  voiceName?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface GlobalSettings {
  timerBehaviour: TimerBehaviour;
  ttsVoiceSelections?: TtsVoiceSelection[];
  supportedLanguages?: string[];
  gamification: GamificationConfig;
  showTimerToStudents?: boolean;
  autoAdvance?: boolean;
  confettiOnCorrect?: boolean;
}

export interface LessonMetadata {
  lessonId: string;
  title: string;
  description: string;
  durationMinutes: number;
  learningObjectives: string[];
  targetLanguage: string;
  defaultLocale: string;
  phase: LessonPhase;
  level?: string;
  topic?: string;
  tags?: string[];
}

// ─── Language Reference Types ─────────────────────────────────────────────────

export interface GrammarPoint {
  rule: string;
  example: string;
  color?: string;
}

export interface VocabularyItem {
  word: string;
  definition: string;
  example?: string;
  translation?: string;
  color?: string;
}

export interface Expression {
  phrase: string;
  context: string;
  example?: string;
}

export interface SentenceStarter {
  starter: string;
  purpose?: string;
}

export interface LanguageReference {
  grammar?: GrammarPoint[];
  vocabulary?: VocabularyItem[];
  expressions?: Expression[];
  spokenGrammar?: string[];
  sentenceStarters?: SentenceStarter[];
}

// ─── CCQ & Speaking Questions ─────────────────────────────────────────────────

export interface CCQQuestion {
  question: string;
  answer?: string;
  purpose?: string;
}

export interface SpeakingQuestion {
  question: string;
  level?: 'controlled' | 'guided' | 'free';
  followUp?: string;
  targetLanguage?: string;
}

export interface DetailedFeedback {
  correctFeedback: string;
  incorrectFeedback: string;
  encouragement?: string;
  languageNote?: string;
  ccqQuestions?: CCQQuestion[];
  speakingQuestions?: SpeakingQuestion[];
}

// ─── H5P Activity Types ───────────────────────────────────────────────────────

export type ActivityType =
  | 'multiple-choice'
  | 'single-choice-set'
  | 'true-false'
  | 'fill-in-blanks'
  | 'advanced-fill-in-blanks'
  | 'drag-the-words'
  | 'mark-the-words'
  | 'essay'
  | 'quiz-set'
  | 'arithmetic-quiz'
  | 'personality-quiz'
  | 'sort-paragraphs'
  | 'summary'
  | 'guess-the-answer'
  | 'speak-the-words'
  | 'speak-the-words-set'
  | 'dictation'
  | 'crossword'
  | 'questionnaire'
  | 'interactive-video'
  | 'course-presentation'
  | 'interactive-book'
  | 'image-hotspots'
  | 'find-hotspot'
  | 'virtual-tour'
  | 'branching-scenario'
  | 'image-juxtaposition'
  | 'image-sequencing'
  | 'agamotto'
  | 'image-slider'
  | 'image-pairing'
  | 'memory-game'
  | 'flashcards'
  | 'dialog-cards'
  | 'accordion'
  | 'audio-recorder'
  | 'chart'
  | 'audio'
  | 'word-cloud'
  | 'emoji-cloud'
  | 'multipoll'
  | 'information-wall'
  | 'timeline'
  | 'collage'
  | 'game-map'
  | 'truth-or-dare'
  | 'would-you-rather'
  | 'spot-the-difference'
  | 'image-description'
  | 'audio-discussion'
  | 'team-quiz';

// ─── Multiple Choice ──────────────────────────────────────────────────────────

export interface MCQChoice {
  id: string;
  text: string;
  correct: boolean;
  feedback?: string;
  tip?: string;
}

export interface MultipleChoiceActivity {
  type: 'multiple-choice';
  question: string;
  questionImage?: string;
  choices: MCQChoice[];
  allowMultiple?: boolean;
  randomise?: boolean;
  penaltyPerWrong?: number;
  partialCredit?: boolean;
  showSolutionButton?: boolean;
  retryButton?: boolean;
  feedback?: DetailedFeedback;
  ttsEnabled?: boolean;
}

// ─── Single Choice Set ────────────────────────────────────────────────────────

export interface SingleChoiceQuestion {
  question: string;
  answers: string[];
  correctIndex: number;
  image?: string;
}

export interface SingleChoiceSetActivity {
  type: 'single-choice-set';
  questions: SingleChoiceQuestion[];
  passPercentage?: number;
  soundEffects?: boolean;
  timerPerQuestion?: number;
  feedback?: DetailedFeedback;
}

// ─── True/False ───────────────────────────────────────────────────────────────

export interface TrueFalseActivity {
  type: 'true-false';
  statement: string;
  correct: boolean;
  image?: string;
  trueFeedback?: string;
  falseFeedback?: string;
  feedback?: DetailedFeedback;
  ttsEnabled?: boolean;
}

// ─── Fill in the Blanks ───────────────────────────────────────────────────────

export interface BlankItem {
  id: string;
  correct: string[];
  hint?: string;
  feedback?: string;
}

export interface FillInBlanksActivity {
  type: 'fill-in-blanks';
  textWithBlanks: string;
  blanks: BlankItem[];
  caseSensitive?: boolean;
  showSolutionButton?: boolean;
  retryButton?: boolean;
  feedback?: DetailedFeedback;
}

// ─── Drag the Words ───────────────────────────────────────────────────────────

export interface DragWord {
  id: string;
  word: string;
  correctPosition: number;
  alternatePositions?: number[];
}

export interface DragTheWordsActivity {
  type: 'drag-the-words';
  textWithPlaceholders: string;
  words: DragWord[];
  feedback?: DetailedFeedback;
}

// ─── Mark the Words ───────────────────────────────────────────────────────────

export interface MarkTheWordsActivity {
  type: 'mark-the-words';
  text: string;
  correctWords: string[];
  minWords?: number;
  feedback?: DetailedFeedback;
}

// ─── Essay ────────────────────────────────────────────────────────────────────

export interface EssayActivity {
  type: 'essay';
  prompt: string;
  placeholder?: string;
  minWords?: number;
  maxWords?: number;
  rubric?: string[];
  aiPromptTemplate?: string;
  feedback?: DetailedFeedback;
}

// ─── Sort Paragraphs ──────────────────────────────────────────────────────────

export interface SortParagraphsActivity {
  type: 'sort-paragraphs';
  paragraphs: string[];
  correctOrder: number[];
  feedback?: DetailedFeedback;
}

// ─── Guess the Answer ─────────────────────────────────────────────────────────

export interface GuessTheAnswerActivity {
  type: 'guess-the-answer';
  image?: string;
  question: string;
  answer: string;
  hint?: string;
  countdownSeconds?: number;
  feedback?: DetailedFeedback;
}

// ─── Speak the Words ──────────────────────────────────────────────────────────

export interface SpeakTheWordsActivity {
  type: 'speak-the-words';
  targetPhrase: string;
  language?: string;
  accuracyThreshold?: number;
  feedback?: DetailedFeedback;
}

// ─── Dictation ────────────────────────────────────────────────────────────────

export interface DictationActivity {
  type: 'dictation';
  sentences: string[];
  ttsText?: string;
  playbackSpeed?: number;
  caseSensitive?: boolean;
  feedback?: DetailedFeedback;
}

// ─── Crossword ────────────────────────────────────────────────────────────────

export interface CrosswordClue {
  word: string;
  clue: string;
  direction: 'across' | 'down';
  startRow: number;
  startCol: number;
  number: number;
}

export interface CrosswordActivity {
  type: 'crossword';
  rows: number;
  cols: number;
  clues: CrosswordClue[];
  feedback?: DetailedFeedback;
}

// ─── Flashcards ───────────────────────────────────────────────────────────────

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
  audio?: string;
  category?: string;
  ttsCharacter?: string;
}

export interface FlashcardsActivity {
  type: 'flashcards';
  cards: FlashCard[];
  shuffle?: boolean;
  spacedRepetition?: boolean;
  ttsEnabled?: boolean;
  feedback?: DetailedFeedback;
}

// ─── Dialog Cards ─────────────────────────────────────────────────────────────

export interface DialogCard {
  id: string;
  front: string;
  back: string;
  frontImage?: string;
  ttsCharacter?: string;
  tips?: string[];
}

export interface DialogCardsActivity {
  type: 'dialog-cards';
  cards: DialogCard[];
  shuffle?: boolean;
  ttsEnabled?: boolean;
  feedback?: DetailedFeedback;
}

// ─── Memory Game ──────────────────────────────────────────────────────────────

export type MemoryPairType = 'image-image' | 'image-text' | 'text-text';

export interface MemoryPair {
  id: string;
  cardA: string;
  cardB: string;
  type: MemoryPairType;
  imageA?: string;
  imageB?: string;
}

export interface MemoryGameActivity {
  type: 'memory-game';
  pairs: MemoryPair[];
  gridSize?: number;
  timerEnabled?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  feedback?: DetailedFeedback;
}

// ─── Image Hotspots ───────────────────────────────────────────────────────────

export interface Hotspot {
  id: string;
  x: number;
  y: number;
  label: string;
  content: string;
  icon?: string;
  image?: string;
  video?: string;
  type?: 'info' | 'question';
  answer?: string;
}

export interface ImageHotspotsActivity {
  type: 'image-hotspots';
  imageUrl: string;
  imageAlt?: string;
  hotspots: Hotspot[];
  showSpeakingQuestion?: string;
  feedback?: DetailedFeedback;
}

// ─── Word Cloud ───────────────────────────────────────────────────────────────

export interface WordCloudActivity {
  type: 'word-cloud';
  prompt: string;
  seedWords?: string[];
  maxSubmissions?: number;
  feedback?: DetailedFeedback;
}

// ─── Emoji Cloud ──────────────────────────────────────────────────────────────

export interface EmojiCloudActivity {
  type: 'emoji-cloud';
  prompt: string;
  emojis?: string[];
  feedback?: DetailedFeedback;
}

// ─── Multipoll ────────────────────────────────────────────────────────────────

export interface PollOption {
  id: string;
  text: string;
  image?: string;
}

export interface MultipollActivity {
  type: 'multipoll';
  question: string;
  options: PollOption[];
  allowMultiple?: boolean;
  feedback?: DetailedFeedback;
}

// ─── Accordion ────────────────────────────────────────────────────────────────

export interface AccordionPanel {
  id: string;
  title: string;
  content: string;
  image?: string;
}

export interface AccordionActivity {
  type: 'accordion';
  panels: AccordionPanel[];
  expandMultiple?: boolean;
  feedback?: DetailedFeedback;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  image?: string;
  media?: string;
}

export interface TimelineActivity {
  type: 'timeline';
  events: TimelineEvent[];
  isExercise?: boolean;
  feedback?: DetailedFeedback;
}

// ─── Image Juxtaposition ──────────────────────────────────────────────────────

export interface ImageJuxtapositionActivity {
  type: 'image-juxtaposition';
  imageA: string;
  imageB: string;
  labelA?: string;
  labelB?: string;
  description?: string;
  initialPosition?: number;
  feedback?: DetailedFeedback;
}

// ─── Spot the Difference ──────────────────────────────────────────────────────

export interface Difference {
  id: string;
  x: number;
  y: number;
  radius: number;
  description: string;
}

export interface SpotTheDifferenceActivity {
  type: 'spot-the-difference';
  imageA: string;
  imageB: string;
  differences: Difference[];
  timeLimit?: number;
  feedback?: DetailedFeedback;
}

// ─── Would You Rather ─────────────────────────────────────────────────────────

export interface WouldYouRatherOption {
  id: string;
  text: string;
  image?: string;
  emoji?: string;
}

export interface WouldYouRatherRound {
  id: string;
  question?: string;
  optionA: WouldYouRatherOption;
  optionB: WouldYouRatherOption;
  speakingPrompts?: string[];
  feedback?: DetailedFeedback;
}

export interface WouldYouRatherActivity {
  type: 'would-you-rather';
  question?: string;
  optionA: WouldYouRatherOption;
  optionB: WouldYouRatherOption;
  speakingPrompts?: string[];
  feedback?: DetailedFeedback;
  rounds?: WouldYouRatherRound[];
}

// ─── Truth or Dare ────────────────────────────────────────────────────────────

export interface TruthOrDareItem {
  type: 'truth' | 'dare';
  text: string;
  targetLanguage?: string;
}

export interface TruthOrDareActivity {
  type: 'truth-or-dare';
  items: TruthOrDareItem[];
  feedback?: DetailedFeedback;
}

// ─── Image Description ────────────────────────────────────────────────────────

export interface ImageDescriptionActivity {
  type: 'image-description';
  imageUrl: string;
  imageAlt?: string;
  guidingQuestions?: string[];
  vocabulary?: string[];
  sentenceStarters?: string[];
  targetStructures?: string[];
  feedback?: DetailedFeedback;
}

// ─── Personality Quiz ─────────────────────────────────────────────────────────

export interface PersonalityAnswer {
  text: string;
  resultsMap: Record<string, number>;
}

export interface PersonalityQuestion {
  question: string;
  answers: PersonalityAnswer[];
}

export interface PersonalityResult {
  id: string;
  title: string;
  description: string;
  image?: string;
}

export interface PersonalityQuizActivity {
  type: 'personality-quiz';
  questions: PersonalityQuestion[];
  results: PersonalityResult[];
  feedback?: DetailedFeedback;
}

// ─── Audio Activity ───────────────────────────────────────────────────────────

export interface AudioActivity {
  type: 'audio';
  audioUrl?: string;
  ttsText?: string;
  transcript?: string;
  ttsCharacter?: string;
  playbackSpeed?: number;
  feedback?: DetailedFeedback;
}

// ─── Audio Discussion ────────────────────────────────────────────────────────

export interface AudioDiscussionPrompt {
  id: string;
  text: string;
  hint?: string;
  usefulLanguage?: string[];
}

export interface AudioDiscussionActivity {
  type: 'audio-discussion';
  instructions?: string;
  prompts: AudioDiscussionPrompt[];
  sampleOpinions?: { speaker?: string; text: string }[];
  feedback?: DetailedFeedback;
}

// ─── Team Quiz ───────────────────────────────────────────────────────────────

export interface TeamQuizQuestion {
  id: string;
  question: string;
  choices: MCQChoice[];
  points?: number;
}

export interface TeamQuizActivity {
  type: 'team-quiz';
  instructions?: string;
  secondsPerQuestion?: number;
  questions: TeamQuizQuestion[];
  feedback?: DetailedFeedback;
}

// ─── Image Sequencing ─────────────────────────────────────────────────────────

export interface SequenceImage {
  id: string;
  imageUrl: string;
  caption?: string;
  correctPosition: number;
}

export interface ImageSequencingActivity {
  type: 'image-sequencing';
  images: SequenceImage[];
  feedback?: DetailedFeedback;
}

// ─── Image Pairing ────────────────────────────────────────────────────────────

export interface ImagePair {
  id: string;
  itemA: string;
  itemB: string;
  imageA?: string;
  imageB?: string;
  isImageA?: boolean;
  isImageB?: boolean;
}

export interface ImagePairingActivity {
  type: 'image-pairing';
  pairs: ImagePair[];
  layout?: 'grid' | 'freeform';
  feedback?: DetailedFeedback;
}

// ─── Questionnaire ────────────────────────────────────────────────────────────

export interface QuestionnaireItem {
  id: string;
  question: string;
  type: 'text' | 'single-choice' | 'multiple-choice' | 'scale';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
}

export interface QuestionnaireActivity {
  type: 'questionnaire';
  title: string;
  questions: QuestionnaireItem[];
  feedback?: DetailedFeedback;
}

// ─── Information Wall ─────────────────────────────────────────────────────────

export interface InfoCard {
  id: string;
  title: string;
  content: string;
  image?: string;
  category?: string;
  color?: string;
}

export interface InformationWallActivity {
  type: 'information-wall';
  cards: InfoCard[];
  feedback?: DetailedFeedback;
}

// ─── Collage ──────────────────────────────────────────────────────────────────

export interface CollageImage {
  id: string;
  imageUrl: string;
  caption?: string;
  label?: string;
}

export interface CollageActivity {
  type: 'collage';
  images: CollageImage[];
  layout?: 'grid' | 'mosaic';
  feedback?: DetailedFeedback;
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export interface ChartDataset {
  label: string;
  values: number[];
  color?: string;
}

export interface ChartActivity {
  type: 'chart';
  chartType: 'bar' | 'pie' | 'line';
  title: string;
  labels: string[];
  datasets: ChartDataset[];
  feedback?: DetailedFeedback;
}

// ─── Union of All H5P Activities ─────────────────────────────────────────────

export type H5PActivity =
  | MultipleChoiceActivity
  | SingleChoiceSetActivity
  | TrueFalseActivity
  | FillInBlanksActivity
  | DragTheWordsActivity
  | MarkTheWordsActivity
  | EssayActivity
  | SortParagraphsActivity
  | GuessTheAnswerActivity
  | SpeakTheWordsActivity
  | DictationActivity
  | CrosswordActivity
  | FlashcardsActivity
  | DialogCardsActivity
  | MemoryGameActivity
  | ImageHotspotsActivity
  | WordCloudActivity
  | EmojiCloudActivity
  | MultipollActivity
  | AccordionActivity
  | TimelineActivity
  | ImageJuxtapositionActivity
  | SpotTheDifferenceActivity
  | WouldYouRatherActivity
  | TruthOrDareActivity
  | ImageDescriptionActivity
  | AudioDiscussionActivity
  | TeamQuizActivity
  | PersonalityQuizActivity
  | AudioActivity
  | ImageSequencingActivity
  | ImagePairingActivity
  | QuestionnaireActivity
  | InformationWallActivity
  | CollageActivity
  | ChartActivity;

// ─── Procedure Step ───────────────────────────────────────────────────────────

export interface ProcedureStep {
  id: string;
  title: string;
  type: ActivityType;
  phase: LessonPhase;
  durationSeconds: number;
  teacherPrompt?: string;
  studentInstructions?: string;
  h5pActivity: H5PActivity;
  languageReference?: LanguageReference;
  ccqQuestions?: CCQQuestion[];
  speakingQuestions?: SpeakingQuestion[];
  gamification?: GamificationConfig;
  aiPromptTemplate?: string;
  showTimerToStudents?: boolean;
  communityLegacy?: boolean;
}

// ─── Full Lesson Manual ───────────────────────────────────────────────────────

export interface LiveLessonManual {
  metadata: LessonMetadata;
  learnerProfile?: LearnerProfile;
  globalSettings: GlobalSettings;
  procedureBlocks: ProcedureStep[];
}

// ─── App State ────────────────────────────────────────────────────────────────

export type StepStatus = 'locked' | 'active' | 'completed' | 'skipped';

export interface StepProgress {
  stepId: string;
  status: StepStatus;
  score?: number;
  maxScore?: number;
  attempts?: number;
  timeSpent?: number;
  studentAnswer?: unknown;
  earnedBadges?: string[];
  completedAt?: number;
}

export interface GamificationState {
  totalPoints: number;
  avatarTier: AvatarTier;
  badges: string[];
  streak: number;
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  name: string;
  points: number;
  avatarTier: AvatarTier;
}

export interface LessonState {
  manual: LiveLessonManual | null;
  activeStepIndex: number;
  stepProgress: Record<string, StepProgress>;
  gamification: GamificationState;
  view: 'teacher' | 'student';
  isTimerRunning: boolean;
  timerRemaining: number;
  phase: LessonPhase;
  showAIPanel: boolean;
  showResults: boolean;
  locale: string;
  ttsEnabled: boolean;
}

// ─── AI Prompt Panel ─────────────────────────────────────────────────────────

export interface AILessonRequest {
  topic: string;
  level: string;
  learnerName?: string;
  learnerInterests?: string[];
  lessonObjectives: string[];
  selectedActivities: ActivityType[];
  durationMinutes: number;
  phase: LessonPhase;
  targetLanguage: string;
}
