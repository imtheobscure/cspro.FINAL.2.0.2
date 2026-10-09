/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Phrase {
  phrase: string;
  translation: string;
}

export interface VocabularyItem {
  word: string;
  definition: string;
  example: string;
}

export interface EslRound {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
  tourGuideText: string;
  hostClues?: string[]; // Sequential clues
  thingsToTry: string[];
  vocabulary: VocabularyItem[];
  grammarChallenge?: string;
  food: string;
  culture: string;
  clothes: string;
  taboos: string;
  phraseBook: Phrase[];
  
  history?: string;
  architecture?: string;
  climate?: string;
  transport?: string;
  wildlife?: string;
  music?: string;
  festivals?: string;
  sports?: string;
  famousPeople?: string;
  souvenirs?: string;
  localMyths?: string;
  gestures?: string;
  slang?: string;
  hobbies?: string;
  economy?: string;
  education?: string;
  literature?: string;
  movies?: string;
  landmarks?: string;
  funFacts?: string[];
  imageSearchKeywords?: Record<string, string>;

  // 20 Additional Hyper-realistic Cultural Attributes
  superstitions?: string;
  traditionalCrafts?: string;
  natureParks?: string;
  weekendActivities?: string;
  etiquetteRules?: string;
  regionalAccents?: string;
  historicalEra?: string;
  landmarkHeight?: string;
  costOfLiving?: string;
  mainSights?: string;
  streetArt?: string;
  localPets?: string;
  familyStructure?: string;
  localCoffeeCulture?: string;
  timeManagement?: string;
  shoppingHacks?: string;
  famousDisasters?: string;
  folkloreOutfits?: string;
  architectureSecret?: string;
  nationalSymbols?: string;
}

export interface PlayerGuess {
  roundIndex: number;
  lat: number;
  lng: number;
  distance: number; // in km
  timeElapsedSeconds: number;
  skipped?: boolean;
}

export interface Player {
  id: string;
  name: string;
  guesses: PlayerGuess[]; // indexed by roundIndex
  totalDistance: number;
  score: number; // cumulative points
  avatar?: string;
}

export interface EslGameConfig {
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  learnerBackground: string;
  placeOfLiving: string;
  customRegionName: string;
}

export interface EslGameState {
  players: Player[];
  config: EslGameConfig;
  status: 'setup' | 'playing' | 'revealed' | 'campaign_finished';
  rounds: EslRound[];
  currentRoundIndex: number;
  activePlayerIndexForGuess: number | null; // index of player currently picking on the map
  roundStartedAt: number | null;
  currentClueIndex: number;
}

