export type ActivityType =
  | 'multipleChoice'
  | 'matchingPairs'
  | 'dragDropSort'
  | 'sentenceBuilder'
  | 'fillBlank'
  | 'listenChoose'
  | 'speakRepeat'
  | 'memoryMatch'
  | 'trueFalse'
  | 'wordOrderRace'
  | 'storyChoice'
  | 'songKaraoke'
  | 'writingMission'
  | 'reflectionSEL'
  | 'realLifeMission'
  | 'spellingBee'
  | 'wordSearch'
  | 'balloonPop'
  | 'whackAMole'
  | 'bingoListener'
  | 'spinWheel'
  | 'oddOneOut'
  | 'rhymeMatch'
  | 'syllableCount'
  | 'drawingPad'
  | 'typingRace'
  | 'flashcardTrainer';

export type ContentType =
  | 'English Lesson'
  | 'Story Lesson'
  | 'Song Lesson'
  | 'Vocabulary Quest'
  | 'Grammar Quest'
  | 'Speaking Mission'
  | 'Reading Mission'
  | 'Phonics Lab';

export type Tone = 'Playful' | 'Encouraging' | 'Story-based' | 'Gamified' | 'Discovery-led' | 'Adventure';
export type Level = 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2';

export interface BookCharacter {
  name: string;
  emoji: string;
  gender: 'Male' | 'Female' | 'Neutral';
  archetype: string;
  azureVoice: string; // e.g. en-US-JennyNeural, en-US-GuyNeural, en-US-AnaNeural, en-GB-SoniaNeural
  pitch: number; // 0.6 to 1.5
  rate: number; // 0.8 to 1.2
  dialogueStyle: string;
}

export interface VocabularyItem {
  word: string;
  meaning: string;
  example: string;
  emoji: string;
  phonetic?: string;
  imageUrl?: string;
  audioPronunciationText?: string;
  speakerCharacter?: string;
}

export interface StoryDialogue {
  speaker: string;
  emoji: string;
  azureVoice?: string;
  text: string;
  translation?: string;
}

export interface LessonActivity {
  id: string;
  type: ActivityType;
  title?: string;
  emoji?: string;
  prompt: string;
  instruction?: string;
  mascotTip?: string;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  points?: number;
  readAloudText?: string;
  characterSpeaker?: string;
  characterEmoji?: string;

  // The round's one big picture, sized for a projector rather than a lap.
  //
  // The engines were written for a tablet: their prompts are 2xl type and their pictures are
  // 80px thumbnails. Shown to a class, a round needs one unmistakable image per screen, so
  // the game stage draws `heroEmoji` (or `imageUrl` when the AI had a stable real one) above
  // the activity. `heroEmoji` is one emoji, never a spoiler for the round's answer.
  heroEmoji?: string;
  imageUrl?: string;
  /** Named separately so it is never confused with an option's own picture. */
  posterImageUrl?: string;
  
  // Specific activity fields
  /**
   * Answer choices. A plain string is the common case; an object is allowed because the
   * engines read `text`/`imageUrl`/`isCorrect` off an option — which is how a picture
   * answer works, and picture answers are the only kind a pre-literate child can give.
   */
  options?: Array<string | { text?: string; imageUrl?: string; isCorrect?: boolean }>;
  correct?: string | number | boolean;
  correctAnswer?: string | number | boolean;
  explanation?: string;
  
  pairs?: Array<{ left: string; right: string; leftEmoji?: string; rightEmoji?: string }>;
  
  items?: string[];
  categories?: Array<{ name: string; emoji: string; items: string[]; color?: string }>;

  // High-fidelity arcade games (spellingBee, balloonPop, whackAMole, bingoListener,
  // spinWheel, oddOneOut, rhymeMatch, syllableCount, typingRace, flashcardTrainer, wordSearch)
  word?: string;
  hint?: string;
  distractorLetters?: string[];
  gridWords?: string[];
  odd?: string;
  seconds?: number;
  syllables?: Array<{ word: string; count: number }>;
  task?: string;
  
  correctOrder?: string[];
  distractors?: string[];
  
  blanks?: Array<{ sentence: string; answer: string; choices: string[]; hint?: string }>;
  segments?: string[];
  
  storyChoices?: Array<{ choice: string; outcome: string; nextPlot: string; best?: boolean; bonusXp?: number }>;
  
  lyrics?: string[];
  audioUrl?: string;
  youtubeId?: string;
  singAlongPacing?: number; // ms per word
  
  sentenceFrames?: string[];
  wordBank?: string[];
  minWords?: number;
  
  checklist?: string[];
  roleplayPrompt?: string;
}

export interface LessonSection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'prologue' | 'story' | 'song' | 'practice' | 'quest' | 'sel' | 'futureSkill' | 'realLife' | 'bossBattle' | 'reflection';
  emoji: string;
  color: 'pink' | 'purple' | 'blue' | 'cyan' | 'green' | 'amber' | 'red' | 'slate';
  duration: number;
  objective: string;
  content: string;
  readAloudText?: string;
  imageUrl?: string;
  youtubeId?: string;
  dialogues?: StoryDialogue[];
  activities: LessonActivity[];
}

export interface FlipbookJSON {
  title: string;
  subtitle: string;
  level: Level;
  estimatedMinutes: number;
  theme: string;
  contentType?: ContentType;
  backCoverBlurb?: string;
  coverImageUrl?: string;
  learnerPhotoDataUrl?: string;
  adventurerPhotos?: Array<{ id: string; name: string; photoDataUrl: string }>;
  learnerAvatarEmoji: string;
  learnerPetEmoji: string;
  characters: BookCharacter[];
  mascot: {
    name: string;
    emoji: string;
    personality: string;
    catchphrases: string[];
    azureVoice?: string;
  };
  xpTotal: number;
  learningObjectives: string[];
  successCriteria: string[];
  vocabulary: VocabularyItem[];
  sections: LessonSection[];
  exitTicket: LessonActivity;
  teacherNotes: string[];
}

export interface LessonConfig {
  contentType: ContentType;
  tone: Tone;
  level: Level;
  topic: string;
  sourceText: string;
  requiredActivities: ActivityType[];
  useTutorInfo: boolean;
  includeStory: boolean;
  includeSong: boolean;
  includeReadAloud: boolean;
  includeFutureSkills: boolean;
  includeSEL: boolean;
  includeCriticalThinking: boolean;
  includeImages: boolean;
  includeVideos: boolean;
  includeAzureVoices: boolean;
  discoveryMode: boolean;
  microlearning: boolean;
  customInstructions: string;
  tutorName: string;
  tutorStyle: string;
  learnerName: string;
  learnerAge: number;
  learnerPetEmoji?: string;
  learnerAvatarEmoji?: string;
}
