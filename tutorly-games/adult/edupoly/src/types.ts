// ─── TYPES ───────────────────────────────────────────────────────────────────

export type QuestionType =
  | 'mcq' | 'true_false' | 'fill_gap' | 'listening' | 'matching'
  | 'sentence_scramble' | 'ordering' | 'wild_card' | 'challenge'
  | 'would_you_rather' | 'truth_or_dare';

export type TileType =
  | 'property' | 'railroad' | 'utility' | 'chance' | 'community_chest'
  | 'go' | 'jail' | 'free_parking' | 'go_to_jail' | 'tax';

export type PropertyColor =
  | 'brown' | 'light_blue' | 'pink' | 'orange' | 'red'
  | 'yellow' | 'green' | 'blue' | 'railroad' | 'utility' | 'none';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  audioText?: string;          // for listening – TTS reads this
  options?: string[];          // MCQ / true-false
  correctAnswer?: string | string[];
  pairs?: { left: string; right: string }[];   // matching
  words?: string[];            // scramble / ordering
  wildEffect?: WildEffect;     // for wild_card
  challengeText?: string;      // for challenge
  optionA?: string; optionB?: string;  // would you rather
  hint?: string;
  explanation?: string;
  imageUrl?: string;
  cefrLevel?: string;
}

export type WildEffect =
  | 'advance_to_go' | 'collect_100' | 'collect_200' | 'go_back_3'
  | 'go_to_jail' | 'pay_50' | 'pay_100' | 'free_rent' | 'double_rent'
  | 'get_out_of_jail' | 'extra_turn' | 'lose_turn';

export interface TileCulture {
  /** a real map (Google Maps embed / static map) for this exact place */
  mapImageUrl?: string;
  /** a real photo of this exact place */
  photoUrl?: string;
  /** 2-4 real photos of this exact place — the hover/landing gallery */
  photoUrls?: string[];
  /** keywords for a photo of this place — used when photoUrl fails to load */
  photoQuery?: string;
  /** a real video about the place (YouTube/Vimeo watch URL or direct mp4) */
  videoUrl?: string;
  /** a real 360° panorama / Street View style embed for the place */
  panoramaUrl?: string;
  /** a Street View / panorama viewer link to open in a new tab */
  panoramaLink?: string;
  /** free-text query used to build a live Google Maps embed for the place */
  mapQuery?: string;
  /** "lat,lng" of the exact spot — powers pano/map deep links */
  latLng?: string;
  /** 2-4 sentences: what this place is, why it matters */
  description?: string;
  /** short caption the AI wrote for the media gallery */
  mediaCaption?: string;
  /** what the linked video shows ("A 4-minute walkthrough of the crossing") */
  videoCaption?: string;
  /** direct video poster/thumb the AI may provide */
  videoPosterUrl?: string;
  foods?: string[];
  thingsToDo?: string[];
  taboos?: string[];
  phrases?: { phrase: string; meaning: string }[];
  funFact?: string;
  neighborhood?: string;
  country?: string;
}

export interface Tile {
  id: number;
  name: string;
  type: TileType;
  color: PropertyColor;
  price?: number;
  rent?: number[];             // [base, 1h, 2h, 3h, 4h, hotel]
  mortgageValue?: number;
  housePrice?: number;
  question?: Question;
  imageUrl?: string;
  description?: string;
  culture?: TileCulture;
  realAddress?: string;
}

export interface Property {
  tileId: number;
  ownerId: string | null;
  houses: number;              // 0-4 houses, 5 = hotel
  mortgaged: boolean;
  isMortgaged?: boolean;
}

export interface Player {
  id: string;
  name: string;
  emoji: string;
  money: number;
  position: number;
  jailTurns: number;          // 0 = not in jail
  getOutOfJailCards: number;
  color: string;
  isEliminated: boolean;
  propertiesOwned: number[];   // tile IDs
  consecutiveDoubles: number;
  hasRolled: boolean;
}

export type GamePhase =
  | 'setup' | 'playing' | 'question' | 'auction' | 'trading'
  | 'buying' | 'jail_decision' | 'game_over' | 'house_buying';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'gold';
  duration?: number;
}

export interface TradeOffer {
  fromPlayerId: string;
  toPlayerId: string;
  offeredProperties: number[];
  requestedProperties: number[];
  offeredMoney: number;
  requestedMoney: number;
}

export interface GameState {
  players: Player[];
  tiles: Tile[];
  properties: Record<number, Property>;
  currentPlayerIndex: number;
  phase: GamePhase;
  diceValues: [number, number];
  isDoubles: boolean;
  currentQuestion: Question | null;
  questionTileId: number | null;
  auctionTileId: number | null;
  auctionBids: Record<string, number>;
  tradeOffer: TradeOffer | null;
  communityChestDeck: Question[];
  chanceDeck: Question[];
  log: string[];
  turnCount: number;
  timeLimit: number | null;    // minutes, null = unlimited
  startTime: number | null;
  darkMode: boolean;
  hostVoice: string;
  musicMuted: boolean;
  sfxMuted: boolean;
  audienceSounds: boolean;
  showTeacherPanel: boolean;
  jailQuestionActive: boolean;
  pendingRentTileId: number | null;
  rentAmount: number;
  rentReduceQuestion: Question | null;
  houseTarget: number | null;  // tile ID for house buying
  selectedVoice: SpeechSynthesisVoice | null;

  // Stock-market style price fluctuations per tile
  market: Record<number, { price: number; deltaPct: number }>;

  // Wealth history for sparkline (per-player arrays of money snapshots)
  wealthHistory: Record<string, number[]>;
}

export interface HostLine {
  id: string;
  category: string;
  templates: string[];
}

export interface ContentPack {
  title: string;
  cefrLevel: string;
  topic: string;
  tiles: Tile[];
  questions: Question[];
}
