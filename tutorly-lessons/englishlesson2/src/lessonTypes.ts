/**
 * ============================================================================
 * lessonTypes.ts — Comprehensive TypeScript interfaces for the English Lesson
 * HTML Generator. Defines every data shape for LessonPayload, LearnerProfile,
 * GeneratorConfig, and all 45+ activity types.
 * ============================================================================
 */

/* ─────────────────────────── LESSON PAYLOAD ─────────────────────────── */

/** Top-level payload passed to the generator */
export interface LessonPayload {
  /** Ordered array of lesson sections (accordion groups) */
  sections: Section[];
  /** HTML or plain-text summary shown at lesson start */
  lessonSummary: string;
  /** Global lesson settings */
  settings: LessonSettings;
}

/** Global settings for the lesson */
export interface LessonSettings {
  /** Display name of the lesson (e.g., "Unit 5 – Past Experiences") */
  lessonName: string;
  /** Estimated study time range (e.g., "45-60 minutes") */
  lessonTimeRange: string;
  /** HTML/markdown teacher guidance notes */
  teacherNotes: string;
  /** Plain-text checklist (one task per line, no bullet markers) */
  homeworkChecklist: string;
  /** Plain-text list of URLs (one per line) */
  materialLinks: string;
  /** ISO 8601 deadline date (e.g., "2026-06-10T09:00:00Z") */
  deadlineIso?: string;
  /** Global tags for spiral repetition (e.g., ["past simple", "travel"]) */
  tags?: string[];
}

/* ─────────────────────────── SECTION ─────────────────────────── */

export interface Section {
  /** Section heading (may include emoji) */
  title: string;
  /** Hex colour for left border / section accent */
  color: string;
  /** Estimated study time */
  studyTime: string;
  /** Total XP reward for completing all activities in this section */
  xpReward: number;
  /** Which mode tab(s) display this section */
  mode: 'prepare' | 'produce' | 'practice' | 'all';
  /** Tags for spiral repetition cross-referencing */
  tags?: string[];
  /** Difficulty label */
  difficulty?: 'easy' | 'medium' | 'hard';
  /** Prerequisite activity type or tag that must be completed first */
  prerequisite?: string;
  /** Ordered list of activities within this section */
  activities: Activity[];
}

/* ─────────────────────────── FEATURE FLAGS ─────────────────────────── */

/** Per-activity feature overrides */
export interface FeatureFlags {
  /** Enable text-to-speech for this activity */
  ttsEnabled: boolean;
  /** Show timer */
  timerEnabled: boolean;
  /** Time limit in seconds */
  timeLimitSeconds: number;
  /** Allow retry */
  retryAllowed: boolean;
  /** Show hints */
  hintsEnabled: boolean;
  /** Shuffle items on load */
  shuffleItems: boolean;
  /** Auto-advance after completion */
  autoAdvance: boolean;
}

/* ─────────────────────────── BASE ACTIVITY ─────────────────────────── */

/** Common fields shared by all activity types */
export interface BaseActivity {
  /** Unique activity type discriminator */
  type: string;
  /** Display title */
  title: string;
  /**
   * Stringified JSON of the activity-specific content object.
   * Each activity type defines its own content shape (see below).
   */
  content: string | any;
  /** Rich HTML feedback shown after completion */
  comprehensiveFeedback: string;
  imageUrl?: string;
  imageCaption?: string;
  videoUrl?: string;
  videoCaption?: string;
  /** Per-activity feature overrides */
  features?: Partial<FeatureFlags>;
  /** If true, only visible in tutor dashboard */
  tutorOnly?: boolean;
}

/* ─────────────────────────── ACTIVITY TYPES ─────────────────────────── */

/*
 * Each interface below extends BaseActivity with a literal `type` discriminator.
 * The `content` field is always a JSON string; the expected parsed shape is
 * documented in the JSDoc comment above each interface.
 */

/**
 * **flashcard** – Flip-card vocabulary study.
 * Content shape: `{ cards: Array<{ front: string; back: string; translation: string; example: string; ccq: string; ipa?: string }> }`
 */
export interface FlashcardActivity extends BaseActivity { type: 'flashcard'; }

/**
 * **vocab_table** – Interactive vocabulary table with TTS per row.
 * Content shape: `{ words: Array<{ word: string; ipa: string; definition: string; example: string; collocations: string; wordFamily: string }> }`
 */
export interface VocabTableActivity extends BaseActivity { type: 'vocab_table'; }

/**
 * **spelling_bee** – Hear a word, type the spelling.
 * Content shape: `{ words: Array<{ word: string; hint?: string }> }`
 */
export interface SpellingBeeActivity extends BaseActivity { type: 'spelling_bee'; }

/**
 * **bingo** – 5×5 bingo card with TTS word calling.
 * Content shape: `{ words: string[]; freeCenter?: boolean }`
 */
export interface BingoActivity extends BaseActivity { type: 'bingo'; }

/**
 * **word_search** – Grid word search puzzle.
 * Content shape: `{ words: string[]; gridSize?: number }`
 */
export interface WordSearchActivity extends BaseActivity { type: 'word_search'; }

/**
 * **hangman** – Guess the word letter by letter.
 * Content shape: `{ words: Array<{ word: string; hint: string }> }`
 */
export interface HangmanActivity extends BaseActivity { type: 'hangman'; }

/**
 * **collocation_drag** – Drag-and-drop to match collocations.
 * Content shape: `{ pairs: Array<{ left: string; right: string }> }`
 */
export interface CollocationDragActivity extends BaseActivity { type: 'collocation_drag'; }

/**
 * **word_formation** – Fill in missing word family forms.
 * Content shape: `{ rows: Array<{ noun: string; verb: string; adjective: string; adverb?: string; gap: 'noun'|'verb'|'adjective'|'adverb' }> }`
 */
export interface WordFormationActivity extends BaseActivity { type: 'word_formation'; }

/**
 * **gap_fill** – Type-in-the-blank sentences.
 * Content shape: `{ sentences: Array<{ text: string; answer: string; hint?: string }> }`
 * Use `___` as the blank marker in `text`.
 */
export interface GapFillActivity extends BaseActivity { type: 'gap_fill'; }

/**
 * **gap_fill_dropdown** – Select answer from dropdown.
 * Content shape: `{ sentences: Array<{ text: string; answer: string; options: string[] }> }`
 */
export interface GapFillDropdownActivity extends BaseActivity { type: 'gap_fill_dropdown'; }

/**
 * **gap_fill_drag** – Drag words into blanks.
 * Content shape: `{ sentences: Array<{ text: string; answer: string }>; wordBank: string[] }`
 */
export interface GapFillDragActivity extends BaseActivity { type: 'gap_fill_drag'; }

/**
 * **error_correction** – Find and fix errors in sentences.
 * Content shape: `{ sentences: Array<{ text: string; errorWord: string; correction: string; explanation?: string }> }`
 */
export interface ErrorCorrectionActivity extends BaseActivity { type: 'error_correction'; }

/**
 * **scramble** – Reorder word chips to form a sentence.
 * Content shape: `{ sentences: Array<{ words: string[]; correctOrder: string }> }`
 */
export interface ScrambleActivity extends BaseActivity { type: 'scramble'; }

/**
 * **matching** – Match items from two columns.
 * Content shape: `{ pairs: Array<{ left: string; right: string }> }`
 */
export interface MatchingActivity extends BaseActivity { type: 'matching'; }

/**
 * **memory_match** – Flip-card memory game.
 * Content shape: `{ pairs: Array<{ a: string; b: string }> }`
 */
export interface MemoryMatchActivity extends BaseActivity { type: 'memory_match'; }

/**
 * **sequence_ordering** – Put items in the correct order.
 * Content shape: `{ items: string[]; correctOrder: number[] }`
 */
export interface SequenceOrderingActivity extends BaseActivity { type: 'sequence_ordering'; }

/**
 * **sentence_auction** – Bid on correct/incorrect sentences.
 * Content shape: `{ sentences: Array<{ text: string; correct: boolean; explanation: string }>; startingMoney: number }`
 */
export interface SentenceAuctionActivity extends BaseActivity { type: 'sentence_auction'; }

/**
 * **pattern_drills** – Transform sentences based on instructions.
 * Content shape: `{ drills: Array<{ instruction: string; prompt: string; answer: string }> }`
 */
export interface PatternDrillsActivity extends BaseActivity { type: 'pattern_drills'; }

/**
 * **listening_mc** – Listen to audio and answer MCQs.
 * Content shape: `{ audioUrl?: string; audioText?: string; questions: Array<{ question: string; options: string[]; answer: string }> }`
 */
export interface ListeningMCActivity extends BaseActivity { type: 'listening_mc'; }

/**
 * **minimal_pairs** – Listen and choose between two similar sounds.
 * Content shape: `{ pairs: Array<{ wordA: string; wordB: string; correct: 'A'|'B' }> }`
 */
export interface MinimalPairsActivity extends BaseActivity { type: 'minimal_pairs'; }

/**
 * **dictation** – Listen and type what you hear.
 * Content shape: `{ sentences: Array<{ text: string; audioUrl?: string }> }`
 */
export interface DictationActivity extends BaseActivity { type: 'dictation'; }

/**
 * **gap_transcript** – Fill blanks in an audio transcript.
 * Content shape: `{ audioUrl?: string; audioText?: string; transcript: string; blanks: Array<{ position: number; answer: string }> }`
 */
export interface GapTranscriptActivity extends BaseActivity { type: 'gap_transcript'; }

/**
 * **phoneme_bingo** – Bingo with phonetic symbols.
 * Content shape: `{ phonemes: string[]; words: Array<{ word: string; phoneme: string }> }`
 */
export interface PhonemeBingoActivity extends BaseActivity { type: 'phoneme_bingo'; }

/**
 * **pronunciation_check** – Record and compare pronunciation.
 * Content shape: `{ words: Array<{ word: string; ipa: string; audioUrl?: string }> }`
 */
export interface PronunciationCheckActivity extends BaseActivity { type: 'pronunciation_check'; }

/**
 * **tongue_twister** – Practice tongue twisters.
 * Content shape: `{ twisters: Array<{ text: string; speed?: 'slow'|'medium'|'fast' }> }`
 */
export interface TongueTwisterActivity extends BaseActivity { type: 'tongue_twister'; }

/**
 * **read_aloud** – Read text aloud with speech recognition.
 * Content shape: `{ text: string; targetWPM?: number }`
 */
export interface ReadAloudActivity extends BaseActivity { type: 'read_aloud'; }

/**
 * **timed_reading** – Read a passage with timer and comprehension Qs.
 * Content shape: `{ passage: string; wordCount: number; questions: Array<{ question: string; options?: string[]; answer: string; type: 'mcq'|'true_false'|'short' }> }`
 */
export interface TimedReadingActivity extends BaseActivity { type: 'timed_reading'; }

/**
 * **interactive_story** – Branching narrative with choices.
 * Content shape: `{ scenes: Array<{ id: string; text: string; choices?: Array<{ label: string; nextSceneId: string }> }> }`
 */
export interface InteractiveStoryActivity extends BaseActivity { type: 'interactive_story'; }

/**
 * **text_reconstruction** – Reorder jumbled paragraphs.
 * Content shape: `{ paragraphs: string[]; correctOrder: number[] }`
 */
export interface TextReconstructionActivity extends BaseActivity { type: 'text_reconstruction'; }

/**
 * **jigsaw_reading** – Two texts with cross-referencing questions.
 * Content shape: `{ textA: string; textB: string; questions: Array<{ question: string; answer: string; source: 'A'|'B'|'both' }> }`
 */
export interface JigsawReadingActivity extends BaseActivity { type: 'jigsaw_reading'; }

/**
 * **annotation_reading** – Highlight words in a text.
 * Content shape: `{ text: string; categories: Array<{ label: string; color: string }> }`
 */
export interface AnnotationReadingActivity extends BaseActivity { type: 'annotation_reading'; }

/**
 * **summary_writing** – Write a summary and compare with model.
 * Content shape: `{ text: string; modelSummary: string; maxWords?: number }`
 */
export interface SummaryWritingActivity extends BaseActivity { type: 'summary_writing'; }

/**
 * **escape_room** – Sequential puzzles.
 * Content shape: `{ puzzles: Array<{ clue: string; answer: string; hint?: string }> }`
 */
export interface EscapeRoomActivity extends BaseActivity { type: 'escape_room'; }

/**
 * **jeopardy** – Category board with point values.
 * Content shape: `{ categories: Array<{ name: string; questions: Array<{ points: number; question: string; answer: string }> }> }`
 */
export interface JeopardyActivity extends BaseActivity { type: 'jeopardy'; }

/**
 * **typing_speed** – Type a passage as fast as possible.
 * Content shape: `{ text: string; targetWPM?: number }`
 */
export interface TypingSpeedActivity extends BaseActivity { type: 'typing_speed'; }

/**
 * **crossword** – DOM-based crossword puzzle.
 * Content shape: `{ clues: Array<{ direction: 'across'|'down'; number: number; clue: string; answer: string; row: number; col: number }> }`
 */
export interface CrosswordActivity extends BaseActivity { type: 'crossword'; }

/**
 * **word_chain** – Chain words by last letter.
 * Content shape: `{ startWord: string; timeLimitSeconds?: number; minWords?: number }`
 */
export interface WordChainActivity extends BaseActivity { type: 'word_chain'; }

/**
 * **ai_trivia** – General knowledge MCQs.
 * Content shape: `{ questions: Array<{ question: string; options: string[]; answer: string; explanation?: string }> }`
 */
export interface AiTriviaActivity extends BaseActivity { type: 'ai_trivia'; }

/**
 * **would_you_rather** – Two options, learner picks one.
 * Content shape: `{ options: Array<{ optionA: string; optionB: string }> }`
 */
export interface WouldYouRatherActivity extends BaseActivity { type: 'would_you_rather'; }

/**
 * **concealed_text** – Hidden content revealed on click.
 * Content shape: `{ blocks: Array<{ label: string; hiddenContent: string }> }`
 */
export interface ConcealedTextActivity extends BaseActivity { type: 'concealed_text'; }

/**
 * **split_view** – Register slider (casual → formal).
 * Content shape: `{ versions: Array<{ label: string; text: string }> }`
 */
export interface SplitViewActivity extends BaseActivity { type: 'split_view'; }

/**
 * **quote_block** – Display a quote.
 * Content shape: `{ quote: string; author: string; source?: string }`
 */
export interface QuoteBlockActivity extends BaseActivity { type: 'quote_block'; }

/**
 * **image_block** – Display an image with lightbox.
 * Content shape: `{ src: string; alt: string; caption?: string }`
 */
export interface ImageBlockActivity extends BaseActivity { type: 'image_block'; }

/**
 * **video_block** – Embed a video.
 * Content shape: `{ src: string; caption?: string; type?: 'youtube'|'mp4' }`
 */
export interface VideoBlockActivity extends BaseActivity { type: 'video_block'; }

/**
 * **code_block** – Display code snippet.
 * Content shape: `{ code: string; language?: string }`
 */
export interface CodeBlockActivity extends BaseActivity { type: 'code_block'; }

/**
 * **math_block** – Display mathematical content.
 * Content shape: `{ expression: string; explanation?: string }`
 */
export interface MathBlockActivity extends BaseActivity { type: 'math_block'; }

/**
 * **multiple_choice** – Standard MCQ.
 * Content shape: `{ questions: Array<{ question: string; options: string[]; answer: string; explanation?: string }> }`
 */
export interface MultipleChoiceActivity extends BaseActivity { type: 'multiple_choice'; }

/**
 * **true_false** – True/False questions.
 * Content shape: `{ statements: Array<{ statement: string; answer: boolean; explanation?: string }> }`
 */
export interface TrueFalseActivity extends BaseActivity { type: 'true_false'; }

/**
 * **contextual_mc** – MCQ with a reading context.
 * Content shape: `{ context: string; questions: Array<{ question: string; options: string[]; answer: string }> }`
 */
export interface ContextualMCActivity extends BaseActivity { type: 'contextual_mc'; }

/* ─── Produce-mode speaking activities ─── */

/**
 * **movie_scene** – Roleplay with speech recognition.
 * Content shape: `{ roles: string[]; lines: Array<{ role: string; text: string; isLearner?: boolean }> }`
 */
export interface MovieSceneActivity extends BaseActivity { type: 'movie_scene'; }

/**
 * **speaking_jam** – Free speaking with prompts.
 * Content shape: `{ prompts: string[]; timeLimitSeconds?: number }`
 */
export interface SpeakingJamActivity extends BaseActivity { type: 'speaking_jam'; }

/**
 * **speaking_game** – Speaking game with subtypes.
 * Content shape: `{ subtype: 'would_you_rather'|'never_have_i_ever'|'truth_or_dare'|'pick_who'|'chatterbox'|'find_someone_who'; prompts: string[] }`
 */
export interface SpeakingGameActivity extends BaseActivity { type: 'speaking_game'; }

/**
 * **information_gap** – Pair work with split info.
 * Content shape: `{ sideA: string; sideB: string; questions?: string[] }`
 */
export interface InformationGapActivity extends BaseActivity { type: 'information_gap'; }

/**
 * **debate** – Discussion with two sides.
 * Content shape: `{ statement: string; forArguments: string[]; againstArguments: string[]; timeLimitSeconds?: number }`
 */
export interface DebateActivity extends BaseActivity { type: 'debate'; }

/**
 * **one_minute_challenge** – Speak for one minute on a topic.
 * Content shape: `{ topic: string; timeLimitSeconds?: number }`
 */
export interface OneMinuteChallengeActivity extends BaseActivity { type: 'one_minute_challenge'; }

/**
 * **taboo** – Describe a word without using taboo words.
 * Content shape: `{ cards: Array<{ word: string; tabooWords: string[] }> }`
 */
export interface TabooActivity extends BaseActivity { type: 'taboo'; }

/**
 * **picture_description** – Describe an image.
 * Content shape: `{ imageUrl: string; questions?: string[] }`
 */
export interface PictureDescriptionActivity extends BaseActivity { type: 'picture_description'; }

/**
 * **shadowing** – Listen and repeat sentences.
 * Content shape: `{ sentences: Array<{ text: string; audioUrl?: string }> }`
 */
export interface ShadowingActivity extends BaseActivity { type: 'shadowing'; }

/* ─── Practice-mode activities ─── */

/**
 * **guided_writing** – Writing with prompts and word count.
 * Content shape: `{ prompt: string; sentenceStarters?: string[]; minWords?: number; maxWords?: number }`
 */
export interface GuidedWritingActivity extends BaseActivity { type: 'guided_writing'; }

/**
 * **paragraph_organizer** – Reorder sentences into a paragraph.
 * Content shape: `{ sentences: string[]; correctOrder: number[] }`
 */
export interface ParagraphOrganizerActivity extends BaseActivity { type: 'paragraph_organizer'; }

/**
 * **personal_dictionary** – Free-text log of new words.
 * Content shape: `{ promptText?: string; categories?: string[] }`
 */
export interface PersonalDictionaryActivity extends BaseActivity { type: 'personal_dictionary'; }

/**
 * **can_do_statements** – Self-assessment checklist.
 * Content shape: `{ statements: Array<{ text: string; category?: string }> }`
 */
export interface CanDoStatementsActivity extends BaseActivity { type: 'can_do_statements'; }

/**
 * **reflective_journal** – Free-text reflection.
 * Content shape: `{ prompts: string[] }`
 */
export interface ReflectiveJournalActivity extends BaseActivity { type: 'reflective_journal'; }

/**
 * **grammar_reference** – Expandable grammar reference cards.
 * Content shape: `{ cards: Array<{ title: string; content: string; examples?: string[] }> }`
 */
export interface GrammarReferenceActivity extends BaseActivity { type: 'grammar_reference'; }

/**
 * **list** – Simple ordered/unordered list.
 * Content shape: `{ items: string[]; ordered?: boolean }`
 */
export interface ListActivity extends BaseActivity { type: 'list'; }

/**
 * **questions** – Display questions for discussion.
 * Content shape: `{ questions: string[] }`
 */
export interface QuestionsActivity extends BaseActivity { type: 'questions'; }

/**
 * **sorting** – Sort items into categories.
 * Content shape: `{ categories: Array<{ name: string; items: string[] }> }`
 */
export interface SortingActivity extends BaseActivity { type: 'sorting'; }

/* ─────────────────────────── DISCRIMINATED UNION ─────────────────────────── */

export type Activity =
  | FlashcardActivity
  | VocabTableActivity
  | SpellingBeeActivity
  | BingoActivity
  | WordSearchActivity
  | HangmanActivity
  | CollocationDragActivity
  | WordFormationActivity
  | GapFillActivity
  | GapFillDropdownActivity
  | GapFillDragActivity
  | ErrorCorrectionActivity
  | ScrambleActivity
  | MatchingActivity
  | MemoryMatchActivity
  | SequenceOrderingActivity
  | SentenceAuctionActivity
  | PatternDrillsActivity
  | ListeningMCActivity
  | MinimalPairsActivity
  | DictationActivity
  | GapTranscriptActivity
  | PhonemeBingoActivity
  | PronunciationCheckActivity
  | TongueTwisterActivity
  | ReadAloudActivity
  | TimedReadingActivity
  | InteractiveStoryActivity
  | TextReconstructionActivity
  | JigsawReadingActivity
  | AnnotationReadingActivity
  | SummaryWritingActivity
  | EscapeRoomActivity
  | JeopardyActivity
  | TypingSpeedActivity
  | CrosswordActivity
  | WordChainActivity
  | AiTriviaActivity
  | WouldYouRatherActivity
  | ConcealedTextActivity
  | SplitViewActivity
  | QuoteBlockActivity
  | ImageBlockActivity
  | VideoBlockActivity
  | CodeBlockActivity
  | MathBlockActivity
  | MultipleChoiceActivity
  | TrueFalseActivity
  | ContextualMCActivity
  | MovieSceneActivity
  | SpeakingJamActivity
  | SpeakingGameActivity
  | InformationGapActivity
  | DebateActivity
  | OneMinuteChallengeActivity
  | TabooActivity
  | PictureDescriptionActivity
  | ShadowingActivity
  | GuidedWritingActivity
  | ParagraphOrganizerActivity
  | PersonalDictionaryActivity
  | CanDoStatementsActivity
  | ReflectiveJournalActivity
  | GrammarReferenceActivity
  | ListActivity
  | QuestionsActivity
  | SortingActivity;

/* ─────────────────────────── LEARNER PROFILE ─────────────────────────── */

export interface LearnerProfile {
  /** Display name */
  name: string;
  /** Avatar URL or emoji; null triggers avatar setup modal */
  avatar: string | null;
  /** CEFR level */
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  /** Learner's native language (ISO 639-1) */
  l1: string;
  /** Interests for personalised content */
  interests: string[];
  /** Age group for content filtering */
  ageGroup?: 'child' | 'teen' | 'adult';
}

/* ─────────────────────────── GENERATOR CONFIG ─────────────────────────── */

export interface GeneratorConfig {
  /** Enable/disable all gamification features */
  gamificationEnabled: boolean;
  /** Enable TTS globally */
  ttsEnabled: boolean;
  /** ISO 8601 deadline date */
  deadlineDate: string;
  /** Preferred TTS voice name for study mode */
  studyModeVoice: string;
  /** Enable the cat mascot (Mimi) */
  mascotEnabled: boolean;
  /** Celebration intensity */
  celebrationIntensity: 'minimal' | 'normal' | 'maximum';
  /** Enable spiral repetition cues */
  spiralRepetition: boolean;
  /** Tutor dashboard passcode */
  tutorPasscode: string;
  /** XP values per activity type */
  xpValues: Record<string, number>;
  /** Level thresholds */
  levelThresholds: number[];
  /** Default theme */
  defaultTheme: string;
  /** Enable haptic feedback */
  hapticEnabled: boolean;
}
