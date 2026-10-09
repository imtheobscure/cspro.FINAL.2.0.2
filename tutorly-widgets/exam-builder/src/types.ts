export interface LearnerProfile {
  name: string;
  id: string;
  email: string;
  notes: string;
  context: string;
  targetScore?: string;
  tutorEmail?: string;
  collectCandidateInfo?: boolean;
}

export interface ProctoringRules {
  webcamRequired: boolean;
  maxWarnings: number;
  tabSwitchPenalty: boolean;
  pauseTimerOnWarning: boolean;
  enforceFullscreen: boolean;
  reproctorOnResume: boolean;
  aiProctorLog: boolean;
  gazeTracking: boolean;
  keystrokeDynamics: boolean;
  waveformVisualization: boolean;
  silenceAlerts: boolean;
  fillerWordTracking: boolean;
}

export type ExamQuestionType =
  | 'multipleChoice'
  | 'multipleSelect'
  | 'essay'
  | 'writing'
  | 'fillInBlank'
  | 'matching'
  | 'ordering'
  | 'likert'
  | 'listening'
  | 'speaking'
  /**
   * Completion family. These render `templateHtml` with `{{blankId}}` placeholders and
   * mark each gap separately. They exist so a task that says "complete the notes below"
   * actually ships the notes - previously the whole family was either flattened into a
   * single bare fillInBlank or refused, leaving a heading with nothing under it.
   */
  | 'noteCompletion'
  | 'tableCompletion'
  | 'summaryCompletion'
  | 'sentenceCompletion'
  | 'gapFill'
  /** TOEFL 'Complete the Words': partial words with the missing letters typed in. */
  | 'completeWords';

export interface EditableQuestionFramework {
  id: string;
  label: string;
  description: string;
  questionType: ExamQuestionType;
  enabled: boolean;
  estimatedQuestions: number;
  timePerQuestionSeconds: number;
}

export interface VoiceSettings {
  enabled: boolean;
  voiceName: string;
  voiceLanguage: string;
  rate: number;
  pitch: number;
  volume: number;
  readInstructions: boolean;
  readFeedbackInPractice: boolean;
  playbackSpeed: number;
  accentFamiliarization: boolean;
}

export interface BrandingSettings {
  institutionName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  customFont: string;
  dyslexicFriendly: boolean;
  defaultFontSize: string;
}

export interface ListeningDialogueLine {
  speaker: string;
  text: string;
  voiceName?: string;
  voiceLanguage?: string;
  accent?: string;
  /** 'male' | 'female' | 'child' | 'elder', used to choose a persona. */
  gender?: string;
  /** Explicit persona key, e.g. 'male-gb', 'female-us', 'child-gb'. */
  profile?: string;
  /** Per-line pitch offset, added to the paper's pitch setting. */
  pitch?: number;
}

export interface ListeningActivity {
  id: string;
  title: string;
  mode: 'monologue' | 'dialogue';
  transcript?: string;
  voiceName?: string;
  voiceLanguage?: string;
  accent?: string;
  /**
   * Per-character persona, e.g. { Examiner: 'male-gb', Candidate: 'female-us' }.
   * Distinct personas are what make a dialogue read as a dialogue instead of one
   * voice reading every part; anything uninstalled falls back without failing.
   */
  cast?: Record<string, string>;
  lines?: ListeningDialogueLine[];
}

export interface ReadingPassage {
  id: string;
  title: string;
  content: string;
  vocabulary?: { word: string; definition: string }[];
}

export interface ExamOption {
  id: string;
  text: string;
}

/**
 * One gap inside a completion task. `{{id}}` in `templateHtml` is replaced by this
 * blank's input, and the blank keeps its own key so partial credit is possible.
 */
export interface ExamBlank {
  id: string;
  /** Accepted answers. Case and surrounding whitespace are ignored. */
  correct: string | string[];
  /** 'partial' draws the visible letters from `stem` / `tail` (Complete the Words). */
  kind?: 'gap' | 'partial';
  /** Visible leading letters, e.g. "att" of "attended". */
  stem?: string;
  /** Visible trailing letters, e.g. "ed". */
  tail?: string;
  /** Label shown when the task has no template to place the blank in. */
  prompt?: string;
  maxLength?: number;
}

export interface ExamQuestion {
  id: string;
  type: ExamQuestionType;
  text: string;
  instructions?: string;
  /** Authored markup carrying {{blankId}} placeholders for the completion family. */
  templateHtml?: string;
  blanks?: ExamBlank[];
  readingPassage?: ReadingPassage;
  options?: ExamOption[];
  correctAnswers?: string[];
  scoringWeight: number;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  strategyTips?: string;
  explanation?: string;
  feedbackDetail?: string;
  matchingPairs?: { left: string; right: string }[];
  audioText?: string;
  voiceRole?: string;
  voiceName?: string;
  voiceLanguage?: string;
  accent?: string;
  /** Persona key for this item's audio, e.g. 'male-gb', 'female-us', 'child-gb'. */
  profile?: string;
  /** 'male' | 'female' | 'child' | 'elder', used when no explicit persona is given. */
  gender?: string;
  maxRecordingSeconds?: number;
  /**
   * Completion floor for a written response. A writing item is credited for completion
   * once the response reaches this many words, because no rubric engine is bundled.
   */
  minWords?: number;
}

export interface ExamSection {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  timeLimitMinutes?: number;
  listeningActivities?: ListeningActivity[];
  readingPassages?: ReadingPassage[];
  questions: ExamQuestion[];
}

export interface AdaptiveLogic {
  enabled: boolean;
  rulesDescription?: string;
  difficultyProgression?: {
    thresholdCorrectPercent: number;
    nextDifficulty: 'easy' | 'medium' | 'hard';
  }[];
}

export interface ExamJSONSchema {
  metadata: {
    title: string;
    language: string;
    examFamily?: string;
    testInfo?: string;
    examInstances?: number;
    adaptiveFlag: boolean;
    practiceModeFlag: boolean;
    timeLimitMinutes: number;
    timerMode: 'total' | 'section';
    passingScorePercent: number;
    tutorEmail?: string;
    shuffleQuestions?: boolean;
    taskBlueprints?: EditableQuestionFramework[];
    voiceSettings?: VoiceSettings;
    environmentVariables?: Record<string, string | number | boolean>;
    branding?: BrandingSettings;
    aiMode?: 'lessonText' | 'mockTest' | 'realTestTranscript';
    peerJsEnabled?: boolean;
    peerJsRoomId?: string;
  };
  proctoring: ProctoringRules;
  sections: ExamSection[];
  adaptiveLogic?: AdaptiveLogic;
}

export interface AIGenerationMode {
  id: 'lessonText' | 'mockTest' | 'realTestTranscript';
  name: string;
  icon: string;
  description: string;
  prompt: string;
}

export interface ExamConfigParams {
  selectedTestId: string;
  selectedTestName: string;
  selectedTestInfo: string;
  selectedTestEnvironment: Record<string, string | number | boolean>;
  examInstances: number;
  taskFrameworks: EditableQuestionFramework[];
  voiceSettings: VoiceSettings;
  branding: BrandingSettings;
  aiGenerationMode: 'lessonText' | 'mockTest' | 'realTestTranscript';
  aiModeUserContent: string;
  questionTypes: Record<ExamQuestionType, boolean>;
  adaptiveMode: boolean;
  practiceMode: boolean;
  questionRandomisation: boolean;
  defaultTimerMinutes: number;
  timerMode: 'total' | 'section';
  passingScorePercent: number;
}
