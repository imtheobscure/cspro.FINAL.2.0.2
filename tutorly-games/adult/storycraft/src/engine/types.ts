// ============================================================================
// StoryCraft — Domain Types
// Single source of truth for the entire game state model.
// ============================================================================

export type GameMode = "adult" | "kids";
export type Difficulty = "story" | "normal" | "hard" | "nightmare";
export type Tone = "epic" | "dark" | "comedic" | "mysterious" | "romantic" | "horror" | "whimsical";
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type ItemRarity = "common" | "rare" | "epic" | "legendary";

export interface StatusEffect {
  id: string;
  emoji: string;
  label: string;
  /** turns remaining; -1 = permanent until removed */
  turns: number;
}

export interface InventoryItem {
  id: string;
  emoji: string;
  name: string;
  qty: number;
  rarity?: ItemRarity;
}

export interface RelationshipMeter {
  /** id of the player/NPC this meter points to */
  targetId: string;
  /** -100 (hatred) .. 100 (devotion) */
  value: number;
}

export interface Entity {
  id: string;
  kind: "player" | "npc";
  name: string;
  /** The character's category emoji. Determines both the visible icon at
   *  level 0/5 (the "base" form) and the entire evolution ladder. */
  emoji: string;
  // Profile
  background: string;
  personality: string;
  goals: string;
  language: string; // BCP-47 ish, e.g. "en-US"
  /** Per-player CEFR focus level (e.g. "A2"). Drives strict vocabulary/grammar for this player. */
  cefrLevel?: CEFRLevel;
  /** Bilingual NPC mode: shows L1/Learning/translation voice options. */
  bilingual?: boolean;
  nativeLanguage?: string;
  learningLanguage?: string;
  abilities: string;
  // NPC voice / narration
  voiceURI?: string;
  translationVoiceURI?: string;
  // Stats (live, mutated by AI HTML triggers)
  health: number;
  maxHealth: number;
  lives: number;
  hunger: number; // 0..100 (adult)
  thirst: number; // 0..100 (adult)
  score: number;
  deaths: number;
  dead: boolean;
  reviveAt?: number; // epoch ms for revival timer
  inventory: InventoryItem[];
  statuses: StatusEffect[];
  powerUps: string[];
  // NPC specific
  relationships: RelationshipMeter[];
  isAlly?: boolean;
  // social deduction role
  role?: string;
  color: string; // pointer / accent color
  // Evolution: 0 = baby, 1..4 = ladder steps, 5 = final adult form.
  evolutionLevel?: number;
}

export interface EvolutionLevel {
  level: number; // 1..5
  emoji: string;
  title: string;
}

export interface EvolutionSystem {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  levels: EvolutionLevel[]; // exactly 5
}

export interface SocialDeductionPreset {
  id: string;
  name: string;
  icon: string;
  roles: string[];
  roleDetails?: SocialDeductionRole[];
  blurb: string;
}

export interface SocialDeductionRole {
  role: string;
  emoji: string;
  alignment: string;
  facts: string;
  publicGoal: string;
  secretGoal: string;
  conversationStyle: string;
}

export interface Universe {
  id: string;
  name: string;
  icon: string;
  category: "video-game" | "movie" | "situational" | "custom" | "social-deduction";
  description: string;
  lore: string;
  presetId?: string; // social deduction
  templateId?: UniverseTemplateId; // active generation template
}

/** IDs of the structured turn-based generation templates. */
export type UniverseTemplateId =
  | "video-game"
  | "movie-tv"
  | "situational"
  | "social-deduction"
  | "custom";

/**
 * A UniverseTemplate is a hyper-detailed, opinionated set of rules the
 * Story Maker prompt injects into the AI so every generated chapter is
 * guaranteed to be playable, card-based, and integrated with the canvas.
 */
export interface UniverseTemplate {
  id: UniverseTemplateId;
  label: string;
  icon: string;
  blurb: string;
  /** Long-form description used as a system prompt for the AI. */
  system: string;
  /** The NPC roles this template typically needs (auto-suggested). */
  defaultRoles: { role: string; emoji: string; alignment: string; brief: string }[];
  /** Required widgets for this template. */
  requiredWidgets: { widget: string; title: string; purpose: string }[];
  /** Item archetypes the AI is asked to populate. */
  itemArchetypes: { name: string; emoji: string; rarity: "common" | "rare" | "epic" | "legendary"; purpose: string }[];
  /** Sound archetypes. */
  soundArchetypes: { key: string; search: string; emoji: string }[];
  /** Required scene content for production-ready output. */
  requiredScenes: { title: string; minLines: number; must: string[] }[];
  /** Map of strict card-based interaction patterns the AI must implement. */
  cardPatterns: { name: string; description: string; code: string }[];
  /** Functional rules the AI must follow. */
  rules: string[];
}

export interface EffectCard {
  id: string;
  name: string;
  emoji: string;
  animation: AnimKind;
  soundUrl: string;
  color: string;
}

export type AnimKind =
  | "burst"
  | "shake"
  | "spin"
  | "pulse"
  | "rain"
  | "float"
  | "zoom"
  | "flash"
  | "slide"
  | "wobble";

export interface Soundscape {
  id: string;
  name: string;
  url: string;
  imageUrl?: string;
  volume: number; // 0..1
  loop: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  timestamp: number;
  html: string;
  narratorOpening: string;
  /** snapshot of entities at this chapter for tab restore */
  leaderboardSnapshot: Entity[];
  decisions: Decision[];
}

export interface Decision {
  id: string;
  entityId: string;
  action: string;
  reasoning: string;
  locked: boolean;
}

export interface StoryNode {
  id: string;
  chapterId: string;
  label: string;
  parentId?: string;
  fates: string[];
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  color: string;
  text: string;
  emoji?: string;
  ts: number;
  groupId?: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  color: string;
  emoji: string;
  memberIds: string[];
  messages: ChatMessage[];
}

export interface SpeakingEntity {
  id: string;
  timer: number;
}

export interface ConversationTurn {
  id: string;
  /** which NPC/entity is talking */
  fromEntityId: string;
  /** target player(s) (one or more) */
  toPlayerIds: string[];
  /** rich text HTML content */
  richText: string;
  /** pure text for TTS (no html tags) */
  ttsText: string;
  /** challenge/quest info */
  challenge?: {
    description: string;
    rewardItemEmoji: string;
    rewardItemName: string;
  };
  ts: number;
}

export interface ConversationMessage {
  id: string;
  /** entity id of who sent it (NPC/Player) */
  fromId: string;
  fromName: string;
  fromColor: string;
  fromEmoji: string;
  /** target player ids (or empty for all) */
  toPlayerIds: string[];
  richHtml: string;
  ttsText: string;
  challenge?: ConversationTurn["challenge"];
  ts: number;
  /** items sent (transfer events) */
  itemTransfer?: { toPlayerId: string; emoji: string; name: string; rarity?: ItemRarity };
}

export interface SessionPeer {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  assignedEntityId?: string;
}

export interface GameSettings {
  mode: GameMode;
  difficulty: Difficulty;
  tone: Tone;
  cefrLevel: CEFRLevel;
  narratorVoiceURI?: string;
  scoringEnabled: boolean;
  consensusMode: boolean;
  highContrast: boolean;
  keyboardOnly: boolean;
}

export interface EnvironmentState {
  openingImageUrl?: string;
  manualWeather: string;
}

export interface GameState {
  meta: { id: string; title: string; createdAt: number; version: number };
  settings: GameSettings;
  entities: Entity[];
  universes: Universe[];
  activeUniverseId?: string;
  effects: EffectCard[];
  soundscapes: Soundscape[];
  activeSoundscapeId?: string;
  chapters: Chapter[];
  activeChapterId?: string;
  storyMap: StoryNode[];
  chat: ChatMessage[];
  chatGroups: ChatGroup[];
  conversation: ConversationMessage[];
  conversationDraft: ConversationTurn[];
  paused: boolean;
  liveInputs: Decision[];
  environment: EnvironmentState;
  isHosting: boolean;
  sessionCode: string;
  sessionPeers: SessionPeer[];
  speakingEntityId?: string;
  /** Side panel state on the canvas */
  sessionPanelOpen: boolean;
  /** The player currently selected on the canvas; their choices/pickups in the
   *  embedded game are attributed to them. */
  selectedPlayerId?: string;
  /** Height (px) of the resizable decision panel on the canvas. */
  decisionPanelHeight?: number;
  /** Monotonically incremented to force the canvas iframe to re-render. */
  sceneReloadKey?: number;
}

// ---- Cross-window message protocol -----------------------------------------
/**
 * The one channel the canvas and the GM panel use to talk. `engine/store.ts`
 * declares its constant as this type, so renaming one without the other is now a
 * compile error rather than two windows that quietly never sync.
 */
export type Channel = "storycraft-sync";

export type WireMessage =
  | { type: "STATE_PATCH"; state: GameState; origin: string }
  | { type: "REQUEST_STATE"; origin: string }
  | { type: "TRIGGER_EFFECT"; effect: EffectCard; origin: string }
  | { type: "COUNTDOWN"; origin: string }
  | { type: "DEPLOY_HTML"; html: string; opening: string; origin: string }
  | { type: "ENVIRONMENT"; weather?: string; openingImageUrl?: string; origin: string }
  | { type: "SPEAK"; text: string; voiceURI?: string; origin: string }
  | { type: "PING"; origin: string };
