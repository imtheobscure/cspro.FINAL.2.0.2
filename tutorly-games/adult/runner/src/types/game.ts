export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type AudienceMode = 'adult' | 'kid';

export type QuestionType = 
  | 'multiple_choice' 
  | 'multi_select' 
  | 'true_false' 
  | 'listening' 
  | 'reading' 
  | 'spelling' 
  | 'unscramble' 
  | 'sorting';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  cefr: CEFRLevel;
  audience: AudienceMode;
  prompt: string;
  explanation?: string;
  difficultySeconds: number; // custom timer
  powerUpReward: PowerUpType;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: string[];
  correctIndex: number;
  fruitTriggers?: { word: string; emoji: string }[];
}

export interface MultiSelectQuestion extends BaseQuestion {
  type: 'multi_select';
  options: string[];
  correctIndices: number[];
  fruitTriggers?: { word: string; emoji: string }[];
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  statement: string;
  isTrue: boolean;
  fruitTriggers?: { word: string; emoji: string }[];
}

export interface ListeningQuestion extends BaseQuestion {
  type: 'listening';
  audioScript: string;
  options: string[];
  correctIndex: number;
  fruitTriggers?: { word: string; emoji: string }[];
}

export interface ReadingQuestion extends BaseQuestion {
  type: 'reading';
  readingPassage: string;
  question: string;
  options: string[];
  correctIndex: number;
  fruitTriggers?: { word: string; emoji: string }[];
}

export interface SpellingQuestion extends BaseQuestion {
  type: 'spelling';
  clue: string;
  correctWord: string; // sanitized without punctuation
  missingLettersTemplate?: string; // e.g. "S _ R V _ V O R"
}

export interface UnscrambleQuestion extends BaseQuestion {
  type: 'unscramble';
  scrambledWords: string[]; // sanitized without punctuation
  correctSentence: string;
}

export interface SortingQuestion extends BaseQuestion {
  type: 'sorting';
  categoryA: string;
  categoryB: string;
  items: { text: string; category: 'A' | 'B' }[];
}

export type Question = 
  | MultipleChoiceQuestion 
  | MultiSelectQuestion 
  | TrueFalseQuestion 
  | ListeningQuestion 
  | ReadingQuestion 
  | SpellingQuestion 
  | UnscrambleQuestion 
  | SortingQuestion;

export type PowerUpType = 
  | 'squad_boost_small'   // +5 Soldiers
  | 'squad_boost_large'   // +15 Soldiers
  | 'dual_smg'            // High rate of fire
  | 'shotgun_spread'      // 5-way spread
  | 'gatling_overload'    // Insane mob clearing fire
  | 'plasma_laser'        // Piercing laser
  | 'rocket_barrage'      // AOE explosion
  | 'rescue_medic_ally'   // Saves female medic who heals squad
  | 'rescue_sniper_ally'  // Saves commando who snipes elites
  | 'energy_shield'       // Temporary invulnerability
  | 'nuke_airstrike'      // Clears all onscreen enemies
  | 'ice_blizzard';       // Freezes horde for 6 seconds

export interface ActivePowerUp {
  type: PowerUpType;
  name: string;
  durationSeconds: number;
  expiresAt: number;
  icon: string;
  description: string;
}

export interface SavedAlly {
  id: string;
  name: string;
  role: 'medic' | 'sniper' | 'pyro' | 'commando';
  color: string;
  avatar: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  waves: number;
  accuracy: number;
  country: string;
  badge?: string;
  isPlayer?: boolean;
}

export interface GameStats {
  score: number;
  kills: number;
  wave: number;
  squadSize: number;
  hp: number;
  maxHp: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  highestCombo: number;
}
