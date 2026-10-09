// ============================================================
//  REALM OF RUIN — Tabletop Survival Chronicle (Multiplayer)
//  flashcards.ts — single-file game engine (types + logic + content + UI)
// ============================================================

// NOTE:
// - This engine is designed for a teacher/DM to screenshare and control the game.
// - Players are a party (1–4). Each class can be chosen once.
// - Gameplay is decision-based (no quiz modes).
// - Custom campaigns are provided via JSON paste (AI-generated or manual).

// ─────────────────────────────────────────────────────────────
//  1) TYPES
// ─────────────────────────────────────────────────────────────

export type Difficulty = 'novice' | 'adventurer' | 'hero' | 'legend';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type EventKind =
  | 'narrative'
  | 'trap'
  | 'monster'
  | 'treasure'
  | 'rest'
  | 'merchant'
  | 'boss'
  | 'jumpscare'
  | 'ambush'
  | 'puzzle'
  | 'moral'
  | 'curse'
  | 'npc'
  | 'sacrifice'
  | 'betrayal'   // PvP / side-with-enemy twists
  | 'vote';      // group vote scenes

export type PlayerClass = 'fighter' | 'mage' | 'marksman' | 'assassin' | 'tank';

export type Gender = 'male' | 'female';

export type HeroTier = Rarity; // common/rare/epic/legendary — used for premium avatar glow & starting perks

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type GamePhase =
  /** The shared Tutorly splash (see GameShell.tsx) — always the first screen. */
  | 'splash'
  | 'landing'
  | 'character-select'
  | 'briefing'
  | 'dungeon-event'
  | 'game-over'
  | 'victory'
  | 'storybook'
  | 'settings'
  | 'json-editor'
  | 'prompt-builder';

export type StatKey = 'str' | 'dex' | 'int' | 'wis' | 'cha';

export interface PlayerStats {
  str: number;
  dex: number;
  int: number;
  wis: number;
  cha: number;
}

export interface VoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  isDefault: boolean;
}

export interface LootItem {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  description: string;
  perks?: string[];
  effect:
    | 'heal'
    | 'shield'
    | 'xp-boost'
    | 'revive'
    | 'trap-detector'
    | 'poison-cure'
    | 'key'
    | 'weapon'
    | 'armor'
    | 'luck'
    | 'str-boost'
    | 'dex-boost'
    | 'int-boost'
    | 'wis-boost'
    | 'cha-boost'
    | 'none';
  value: number;
  sellPrice: number;
}

export interface Companion {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  role: 'companion' | 'pet';
  description: string;
  perks: string[];
  bonus: Partial<Record<StatKey, number>>;
  passive?: {
    healPerRoom?: number;
    shieldPerRoom?: number;
    goldBonusPct?: number;
    xpBonusPct?: number;
    trapWarnChance?: number; // 0..1
    rerollChance?: number;   // 0..1
  };
}

export interface SurvivalChoice {
  id: string;
  label: string;
  emoji: string;
  description: string;

  // Outcome category
  outcome: 'good' | 'bad' | 'neutral' | 'death' | 'jackpot';

  // Who is affected
  applyTo?: 'party' | 'active' | 'target';
  requiresTargetPlayer?: boolean; // DM chooses target player (PvP/betrayal/rescue)

  // Consequences
  hpChange: number;
  goldChange: number;
  xpChange: number;
  staminaChange: number;

  // Twists
  stealGoldFromTarget?: number; // if applyTo=target and requiresTargetPlayer, active receives
  giftGoldToTarget?: number;    // active gives
  poison?: { dmgPerRoom: number; durationRooms: number };
  curse?: boolean;

  // Rewards
  grantsItem?: LootItem;
  addCompanion?: Companion;

  // Skill check (D&D style)
  skillCheck?: { stat: StatKey; dc: number };

  // Narration
  outcomeNarration: string; // DM reads this
  /**
   * Optional narration for a FAILED skill check.
   *
   * When a choice has a `skillCheck` the dice can turn a good outcome into nothing,
   * and printing the success text anyway reads as the game lying about what just
   * happened. Supply this and the failure gets its own prose; leave it out and the
   * game says plainly that the attempt failed instead of reusing the success line.
   */
  failNarration?: string;

  // Risk indicator
  riskLevel: 'safe' | 'risky' | 'deadly';

  // Branching story graph
  // - If nextEventId is set, always jump there.
  // - Else, use nextEventIdOnSuccess/Fail if a skillCheck exists.
  // - Else, advance linearly.
  nextEventId?: string;
  nextEventIdOnSuccess?: string;
  nextEventIdOnFail?: string;

  // Relationship effects (optional)
  relationshipDelta?: {
    bond?: number;
    trust?: number;
    suspicion?: number;
    jealousy?: number;
    romance?: number;
  };

  // Optional per-choice timer (seconds). If missing, event timeLimitSec is used.
  timeLimitSec?: number;
}

export interface MonsterConfig {
  name: string;
  description: string;
  hp: number;
  attackDamage: number;
  lootGold: number;
  lootXP: number;
  weaknessHint: string;
  imageKey: string;
  isBoss?: boolean;
  bossAbility?: string;
  loot?: LootItem;
}

export interface TrapConfig {
  name: string;
  description: string;
  damage: number;
  avoidStat: StatKey;
  avoidDC: number;
  imageKey: string;
}

export interface TreasureConfig {
  name: string;
  description: string;
  gold: number;
  xp: number;
  loot?: LootItem;
  imageKey: string;
  trapped?: boolean;
  trapDamage?: number;
}

export interface MerchantConfig {
  name: string;
  greeting: string;
  items: LootItem[];
  imageKey: string;
  canSell?: boolean;
}

export interface JumpscareConfig {
  name: string;
  description: string;
  damage: number;
  imageKey: string;
  scare: string;
}

export type DMBeatTrigger =
  | 'onEnter'
  | 'onHalfTime'
  | 'onLowHP'
  | 'onChoiceGood'
  | 'onChoiceBad'
  | 'onChoiceDeath'
  | 'onBetrayal'
  | 'onBossPhase'
  | 'onLoot';

export interface DMBeat {
  id: string;
  trigger: DMBeatTrigger;
  text: string;
  once?: boolean;
  chance?: number; // 0..1
}

export interface DungeonEvent {
  id: string;
  kind: EventKind;
  chapter: number;
  title: string;
  narration: string;
  imageKey: string;
  choices: SurvivalChoice[];
  monster?: MonsterConfig;
  trap?: TrapConfig;
  treasure?: TreasureConfig;
  merchant?: MerchantConfig;
  jumpscare?: JumpscareConfig;

  // DM lines
  dmReaction: {
    onEnter: string;
    onGoodOutcome: string;
    onBadOutcome: string;
    onDeath: string;
  };

  // DM beats: micro-lines that can interrupt at specific triggers
  dmBeats?: DMBeat[];

  // Default timer for this room (seconds)
  timeLimitSec?: number;

  // Multiplayer twist notes (optional)
  partyTwist?: {
    canBetray?: boolean;
    canSideWithEnemy?: boolean;
    voteRequired?: boolean;
  };
}

export interface StoryEntry {
  timestamp: number;
  room: number;
  event: string;
  actor: string; // who decided (player name or PARTY)
  choice: string;
  outcome: string;
  imageKey?: string;
  isHighlight?: boolean;
  isDeath?: boolean;
}

export interface PlayerDossier {
  appearance: string;              // freeform: "tall, blue hair, scar..."
  hometown: string;                // city/country
  culture: string;                 // optional flavor
  interests: string[];             // e.g. football, anime
  strengths: string[];             // e.g. brave, logical
  fears: string[];                 // e.g. spiders
  signaturePhrases: string[];      // catchphrases for DM beats
  secret: string;                  // one secret for drama hooks
}

export interface NPCPlayerProfile {
  agenda: string;
  traits: string[];
  goals: string[];
  rivalries: string[];
  trust: number;           // 0..100 (party's trust in them)
  luck: number;            // 0..10
  dialogueBank: {
    onLoot: string[];
    onBetrayal: string[];
    onNearDeath: string[];
    onCriticalSuccess: string[];
    onFailure: string[];
    onRomance: string[];
  };
}

export interface RelationshipMeters {
  bond: number;      // 0..100
  trust: number;     // 0..100
  suspicion: number; // 0..100
  jealousy: number;  // 0..100
  romance: number;   // 0..100
}

export type RelationshipKey = string; // `${minId}|${maxId}`

export interface PartyRelationships {
  byPair: Record<RelationshipKey, RelationshipMeters>;
}

export function makePairKey(aId: string, bId: string): RelationshipKey {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

export function defaultRelationship(): RelationshipMeters {
  return { bond: 50, trust: 50, suspicion: 0, jealousy: 0, romance: 0 };
}

export function initRelationships(players: PlayerState[]): PartyRelationships {
  const byPair: Record<string, RelationshipMeters> = {};
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      byPair[makePairKey(players[i].id, players[j].id)] = defaultRelationship();
    }
  }
  return { byPair };
}

export function clampRel(x: number): number {
  return Math.max(0, Math.min(100, Math.round(x)));
}

export function applyRelationshipDelta(
  rel: RelationshipMeters,
  delta?: Partial<RelationshipMeters>
): RelationshipMeters {
  if (!delta) return rel;
  return {
    bond: clampRel(rel.bond + (delta.bond || 0)),
    trust: clampRel(rel.trust + (delta.trust || 0)),
    suspicion: clampRel(rel.suspicion + (delta.suspicion || 0)),
    jealousy: clampRel(rel.jealousy + (delta.jealousy || 0)),
    romance: clampRel(rel.romance + (delta.romance || 0)),
  };
}

export interface PlayerState {
  id: string;
  name: string;
  class: PlayerClass;
  gender: Gender;
  heroTier: HeroTier;

  // Personalization (learner dossier)
  dossier: PlayerDossier;
  luck: number; // 0..10

  // If this player is a custom NPC (actor), they can interrupt the story.
  isNPC: boolean;
  npc?: NPCPlayerProfile;

  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  shield: number;
  lives: number;

  xp: number;
  level: number;
  gold: number;

  stats: PlayerStats;

  poisoned: boolean;
  poisonDmg: number;
  poisonRoomsLeft: number;
  cursed: boolean;

  inventory: LootItem[];

  kills: number;
  mercy: number;
  decisionsGood: number;
  decisionsBad: number;
}

export interface PartyState {
  players: PlayerState[];
  activePlayerIndex: number;

  companions: Companion[]; // party-wide
  stash: LootItem[];       // party-wide stash

  // Relationship matrix (bond/trust/jealousy etc.)
  relationships: PartyRelationships;

  roomsCleared: number;
  monstersDefeated: number;
  trapsAvoided: number;
  treasuresFound: number;
  npcsHelped: number;
  deaths: number;

  // DM beat usage (avoid repeating once beats)
  dmBeatUsed: Record<string, boolean>;

  storyLog: StoryEntry[];
  startTime: number;
}

export interface GameSession {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  dmName: string;
  dmVoiceURI: string;

  // Used only for prompt builder / custom content (not shown in champion select)
  cefrLevel?: CEFRLevel;

  events: DungeonEvent[];
  party: PartyState;
  currentEventIndex: number;
  phase: GamePhase;
  totalRooms: number;
  createdAt: number;
  completedAt?: number;
  customJson?: string;
}

// ─────────────────────────────────────────────────────────────
//  2) RARITY LOOKUP
// ─────────────────────────────────────────────────────────────

export const RARITY: Record<Rarity, {
  label: string;
  color: string;
  glow: string;
  bg: string;
  border: string;
  badge: string;
}> = {
  common:    { label: 'Common',    color: '#9ca3af', glow: '0 0 8px #9ca3af44',  bg: '#27272a', border: '#3f3f46', badge: 'bg-zinc-700' },
  rare:      { label: 'Rare',      color: '#3b82f6', glow: '0 0 16px #3b82f644', bg: '#172554', border: '#1d4ed8', badge: 'bg-blue-800' },
  epic:      { label: 'Epic',      color: '#a855f7', glow: '0 0 20px #a855f744', bg: '#3b0764', border: '#7c3aed', badge: 'bg-purple-800' },
  legendary: { label: 'Legendary', color: '#f59e0b', glow: '0 0 24px #f59e0b66', bg: '#451a03', border: '#d97706', badge: 'bg-amber-800' },
};

// ─────────────────────────────────────────────────────────────
//  3) CLASS DEFINITIONS (unique pick)
// ─────────────────────────────────────────────────────────────

/**
 * Class portraits — one anime/JRPG set, all 384×512, CC0 (see CREDITS.md beside them).
 *
 * Resolved through Vite's BASE_URL for the same reason the scene art is — the folder
 * name is the public URL, so the artwork has to follow the game.
 */
const CLASS_ART = (file: string) => `${import.meta.env.BASE_URL}images/classes/${file}.png`;

/**
 * Vector stand-ins, drawn by `tools/make-class-art.mjs`.
 *
 * Shown automatically (see the `onError` handlers) if a portrait file is ever missing,
 * so a class tile degrades to real art instead of a broken-image icon.
 */
const CLASS_ART_FALLBACK = (file: string) => `${import.meta.env.BASE_URL}images/classes/vector/${file}.svg`;

export const CLASS_STATS: Record<PlayerClass, {
  emoji: string;
  title: string;
  description: string;
  maxHp: number;
  maxStamina: number;
  startGold: number;
  startLives: number;
  color: string;
  stats: PlayerStats;
  perks: string[];
  avatars: Record<Gender, string>; // premium large emoji avatar per gender
  /** Full-figure class portrait, shown on cards, the party bar and modals. */
  portrait: string;
  /** Vector stand-in used if `portrait` cannot be loaded. */
  portraitFallback: string;
}> = {
  fighter: {
    emoji: '⚔️',
    title: 'Fighter',
    description: 'Frontline hero. Leads charges, protects allies, and turns fear into momentum.',
    maxHp: 150,
    maxStamina: 110,
    startGold: 35,
    startLives: 2,
    color: '#ef4444',
    stats: { str: 17, dex: 12, int: 10, wis: 10, cha: 12 },
    perks: ['Balanced damage', 'Reliable', 'Team leader'],
    avatars: { male: '🦸‍♂️', female: '🦸‍♀️' },
    portrait: CLASS_ART('fighter'),
    portraitFallback: CLASS_ART_FALLBACK('fighter'),
  },
  mage: {
    emoji: '🔮',
    title: 'Mage',
    description: 'Arcane specialist. Wins with cleverness, curses, and decisive magical bursts.',
    maxHp: 95,
    maxStamina: 150,
    startGold: 25,
    startLives: 2,
    color: '#8b5cf6',
    stats: { str: 6, dex: 11, int: 20, wis: 16, cha: 10 },
    perks: ['INT 20', 'Powerful skill checks', 'High stamina'],
    avatars: { male: '🧙‍♂️', female: '🧙‍♀️' },
    portrait: CLASS_ART('mage'),
    portraitFallback: CLASS_ART_FALLBACK('mage'),
  },
  marksman: {
    emoji: '🏹',
    title: 'Marksman',
    description: 'Precise ranged killer. Spots angles, reads the room, and strikes from safety.',
    maxHp: 110,
    maxStamina: 130,
    startGold: 45,
    startLives: 2,
    color: '#3b82f6',
    stats: { str: 10, dex: 18, int: 12, wis: 14, cha: 10 },
    perks: ['DEX 18', 'High awareness', 'Loot finder'],
    avatars: { male: '🧝‍♂️', female: '🧝‍♀️' },
    portrait: CLASS_ART('marksman'),
    portraitFallback: CLASS_ART_FALLBACK('marksman'),
  },
  assassin: {
    emoji: '🗡️',
    title: 'Assassin',
    description: 'Deadly in shadows. Lies with a smile and ends fights before they begin.',
    maxHp: 105,
    maxStamina: 140,
    startGold: 55,
    startLives: 2,
    color: '#10b981',
    stats: { str: 11, dex: 20, int: 12, wis: 10, cha: 15 },
    perks: ['DEX 20', 'CHA 15', 'Betrayal specialist'],
    avatars: { male: '🦹‍♂️', female: '🦹‍♀️' },
    portrait: CLASS_ART('assassin'),
    portraitFallback: CLASS_ART_FALLBACK('assassin'),
  },
  tank: {
    emoji: '🛡️',
    title: 'Tank',
    description: 'Unbreakable wall. Absorbs punishment and forces the dungeon to waste its cruelty.',
    maxHp: 190,
    maxStamina: 80,
    startGold: 20,
    startLives: 3,
    color: '#f59e0b',
    stats: { str: 18, dex: 8, int: 8, wis: 14, cha: 10 },
    perks: ['Highest HP', '3 Lives', 'STR 18'],
    avatars: { male: '🛡️', female: '🛡️' },
    portrait: CLASS_ART('tank'),
    portraitFallback: CLASS_ART_FALLBACK('tank'),
  },
};

// ─────────────────────────────────────────────────────────────
//  4) LOOT TABLE (Common / Rare / Epic / Legendary)
// ─────────────────────────────────────────────────────────────

export const LOOT_TABLE: LootItem[] = [
  // COMMON
  {
    id: 'bread', name: 'Stale Bread', emoji: '🍞', rarity: 'common',
    description: 'Restores 15 HP. Tastes like regret.',
    perks: ['Quick snack', 'Cheap heal'], effect: 'heal', value: 15, sellPrice: 3,
  },
  {
    id: 'bandage', name: 'Linen Bandage', emoji: '🩹', rarity: 'common',
    description: 'Restores 25 HP and steadies your breathing.',
    perks: ['Reliable', 'Stops bleeding'], effect: 'heal', value: 25, sellPrice: 6,
  },
  {
    id: 'torch', name: 'Oil Torch', emoji: '🔥', rarity: 'common',
    description: 'Reveals hidden danger. Next trap DC -2.',
    perks: ['Trap hint', 'Light source'], effect: 'trap-detector', value: 1, sellPrice: 5,
  },
  {
    id: 'buckler', name: 'Wooden Buckler', emoji: '🛡️', rarity: 'common',
    description: 'Absorbs 12 damage.',
    perks: ['Light', 'Quick block'], effect: 'shield', value: 12, sellPrice: 7,
  },
  {
    id: 'rusty-dagger', name: 'Rusty Dagger', emoji: '🗡️', rarity: 'common',
    description: '+2 DEX permanently. It wants blood.',
    perks: ['DEX +2'], effect: 'dex-boost', value: 2, sellPrice: 10,
  },

  // RARE
  {
    id: 'heal-potion', name: 'Healing Potion', emoji: '🧪', rarity: 'rare',
    description: 'Restores 60 HP. Warm light in a bottle.',
    perks: ['Big heal', 'Instant'], effect: 'heal', value: 60, sellPrice: 20,
  },
  {
    id: 'iron-shield', name: 'Iron Tower Shield', emoji: '🛡️', rarity: 'rare',
    description: 'Absorbs 40 damage.',
    perks: ['Solid defense', 'Boss-ready'], effect: 'shield', value: 40, sellPrice: 22,
  },
  {
    id: 'silver-sword', name: 'Silver Longsword', emoji: '⚔️', rarity: 'rare',
    description: '+4 STR. Effective against undead.',
    perks: ['STR +4', 'Undead bane'], effect: 'str-boost', value: 4, sellPrice: 30,
  },
  {
    id: 'antidote', name: 'Antidote Vial', emoji: '💊', rarity: 'rare',
    description: 'Cures poison instantly.',
    perks: ['Poison cure'], effect: 'poison-cure', value: 1, sellPrice: 18,
  },
  {
    id: 'dungeon-key', name: 'Dungeon Key', emoji: '🔑', rarity: 'rare',
    description: 'Opens one locked path. Some doors fear it.',
    perks: ['Bypass locks'], effect: 'key', value: 1, sellPrice: 15,
  },

  // EPIC
  {
    id: 'dragon-scale', name: 'Dragon Scale Armor', emoji: '🐉', rarity: 'epic',
    description: 'Absorbs 70 damage. Fire feels like a breeze.',
    perks: ['Huge shield', 'Fireproof vibe'], effect: 'armor', value: 70, sellPrice: 60,
  },
  {
    id: 'coin-fortune', name: 'Coin of Fortune', emoji: '🪙', rarity: 'epic',
    description: 'Once, reroll a failed skill check.',
    perks: ['Reroll', 'Clutch saver'], effect: 'luck', value: 1, sellPrice: 55,
  },
  {
    id: 'elixir-life', name: 'Elixir of Life', emoji: '✨', rarity: 'epic',
    description: 'Full heal (to max HP).',
    perks: ['Full heal'], effect: 'heal', value: 999, sellPrice: 70,
  },
  {
    id: 'archmage-tome', name: 'Tome of the Archmage', emoji: '📖', rarity: 'epic',
    description: '+6 INT permanently. Knowledge burns.',
    perks: ['INT +6'], effect: 'int-boost', value: 6, sellPrice: 65,
  },

  // LEGENDARY
  {
    id: 'phoenix-feather', name: 'Phoenix Feather', emoji: '🪶', rarity: 'legendary',
    description: 'Gain +1 life. Death becomes negotiable.',
    perks: ['Extra life'], effect: 'revive', value: 1, sellPrice: 140,
  },
  {
    id: 'excalibur', name: 'Excalibur', emoji: '🗡️', rarity: 'legendary',
    description: '+10 STR and +4 CHA. The blade judges you.',
    perks: ['STR +10', 'CHA +4'], effect: 'weapon', value: 10, sellPrice: 220,
  },
  {
    id: 'abyss-crown', name: 'Crown of the Abyss', emoji: '👑', rarity: 'legendary',
    description: '+4 ALL stats (party-wide aura). Power whispers.',
    perks: ['All stats +4 aura'], effect: 'none', value: 4, sellPrice: 260,
  },
];

// ─────────────────────────────────────────────────────────────
//  5) COMPANIONS & PETS
// ─────────────────────────────────────────────────────────────

export const COMPANIONS: Companion[] = [
  {
    id: 'pet-wolf', name: 'Ash-Wolf Pup', emoji: '🐺', rarity: 'rare', role: 'pet',
    description: 'A loyal pup that growls before danger strikes.',
    perks: ['DEX +1 party', 'Trap warn (10%)'],
    bonus: { dex: 1 },
    passive: { trapWarnChance: 0.10 },
  },
  {
    id: 'pet-hawk', name: 'Moon-Hawk', emoji: '🦅', rarity: 'rare', role: 'pet',
    description: 'Sees hidden paths and watches for betrayal.',
    perks: ['WIS +2 party', 'Reroll chance (5%)'],
    bonus: { wis: 2 },
    passive: { rerollChance: 0.05 },
  },
  {
    id: 'comp-healer', name: 'Sister Maren', emoji: '🧝‍♀️', rarity: 'epic', role: 'companion',
    description: 'A wandering healer sworn to keep your party alive.',
    perks: ['Heal +5 each room', 'WIS +2 party'],
    bonus: { wis: 2 },
    passive: { healPerRoom: 5 },
  },
  {
    id: 'comp-scout', name: 'Kestrel the Scout', emoji: '🧝‍♂️', rarity: 'epic', role: 'companion',
    description: 'A nimble scout who finds shortcuts and ambushes.',
    perks: ['DEX +3 party', 'Gold bonus +10%'],
    bonus: { dex: 3 },
    passive: { goldBonusPct: 0.10 },
  },
  {
    id: 'pet-dragonling', name: 'Cinder Dragonling', emoji: '🐲', rarity: 'legendary', role: 'pet',
    description: 'A tiny dragon with an enormous attitude.',
    perks: ['STR +2, CHA +2 party', 'Shield +10 each room'],
    bonus: { str: 2, cha: 2 },
    passive: { shieldPerRoom: 10 },
  },
];

// ─────────────────────────────────────────────────────────────
//  6) AUDIO (SFX + BGM)
//
//  Every effect is now a real, professionally recorded CC0 sound shipped WITH
//  the app (`public/sounds/`, credits in that folder). The previous build
//  hot-linked `assets.mixkit.co/…-preview.mp3` for everything: thin, synthetic,
//  and silent with no connection. The old URLs are kept as a second candidate
//  so a build uploaded without the sounds/ folder still makes noise online.
// ─────────────────────────────────────────────────────────────

/** Shipped recordings — filename inside `public/sounds/`. */
export const SFX_FILES: Record<string, string> = {
  click:      'click.ogg',
  toggle:     'toggle.ogg',
  correct:    'correct.ogg',
  wrong:      'wrong.ogg',
  clockTick:  'clock-tick.ogg',

  levelUp:    'level-up.ogg',
  victory:    'victory.ogg',
  boss:       'boss-hit.ogg',

  treasure:   'coins.ogg',
  purchase:   'coins-stack.ogg',
  sword:      'blade-slice.ogg',
  clash:      'metal-clash.ogg',
  trap:       'trap-latch.ogg',
  monster:    'monster-toll.ogg',
  death:      'death-bell.ogg',
  magic:      'magic-chime.ogg',
  jumpscare:  'metal-slam.ogg',
  heartbeat:  'heartbeat.ogg',

  door:       'door-open.ogg',
  doorClose:  'door-close.ogg',
  cardFlip:   'card-flip.ogg',
  whoosh:     'whoosh.ogg',
  step:       'step-wood.ogg',
  dice:       'dice-throw.ogg',
  diceShake:  'dice-shake.ogg',
};

/** Legacy remote previews — fallback only, never the first choice. */
const SFX_REMOTE: Record<string, string> = {
  click:     'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  whoosh:    'https://assets.mixkit.co/active_storage/sfx/2877/2877-preview.mp3',
  correct:   'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  wrong:     'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
  levelUp:   'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  treasure:  'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  trap:      'https://assets.mixkit.co/active_storage/sfx/2961/2961-preview.mp3',
  monster:   'https://assets.mixkit.co/active_storage/sfx/2810/2810-preview.mp3',
  death:     'https://assets.mixkit.co/active_storage/sfx/2886/2886-preview.mp3',
  victory:   'https://assets.mixkit.co/active_storage/sfx/1997/1997-preview.mp3',
  jumpscare: 'https://assets.mixkit.co/active_storage/sfx/2862/2862-preview.mp3',
  heartbeat: 'https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3',
  purchase:  'https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3',
  sword:     'https://assets.mixkit.co/active_storage/sfx/2810/2810-preview.mp3',
  magic:     'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
};

/** Back-compat shape: every slot keeps its old URLs resolvable. */
export const SFX: Record<string, string> = { ...SFX_REMOTE };

/** Resolve `public/sounds/` relative to the page, so the game works at any
 *  sub-path (dev server, /tutorly-games/adult/dungeon/, or a file:// build). */
function soundsDir(): string {
  try {
    return new URL('sounds/', document.baseURI).href;
  } catch {
    return 'sounds/';
  }
}

/**
 * Loudness trim per slot.
 *
 * The 25 recordings arrive at wildly different levels — measured on the shipped
 * files, a confirmation chime sits at -11 dB RMS while the whoosh, the coin
 * stack and the dice throw are around -31 to -34 dB. Played back untouched that
 * is a 22 dB spread: the important cues shout and the atmospheric ones vanish.
 *
 * Playing through Web Audio means gain is not capped at 1, so this table lifts
 * the quiet files instead of only dulling the loud ones, and `volume` at the
 * call site goes back to meaning “how loud is this moment”.
 */
export const SFX_GAIN: Record<string, number> = {
  // UI
  click:        2.71,
  toggle:       0.58,
  // Outcomes and stings
  correct:      0.95,
  wrong:        1.42,
  levelUp:      0.88,
  victory:      0.99,
  boss:         1.51,
  death:        1.88,
  jumpscare:    1.91,
  // Loot and combat
  treasure:     2.26,
  purchase:     7.13,
  sword:        1.48,
  clash:        2.62,
  trap:         1.81,
  monster:      2.16,
  magic:        2.3,
  // Movement, props, ambience (deliberately below the cues)
  door:         0.94,
  doorClose:    0.9,
  cardFlip:     2.43,
  whoosh:       5.45,
  step:         1.43,
  dice:         3.0,
  diceShake:    2.15,
  heartbeat:    1.56,
  clockTick:    2.45,
};

/** Master headroom, so a stack of simultaneous effects cannot clip. */
export const SFX_MASTER = 0.85;

let audioCtx: AudioContext | null = null;
let audioDisabled = false;
const bufferCache = new Map<string, AudioBuffer>();
const bufferLoading = new Map<string, Promise<AudioBuffer | null>>();

function getCtx(): AudioContext | null {
  if (audioDisabled) return null;
  if (audioCtx) return audioCtx;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) { audioDisabled = true; return null; }
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    audioDisabled = true;
    return null;
  }
}

function loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(url);
  if (cached) return Promise.resolve(cached);
  const inflight = bufferLoading.get(url);
  if (inflight) return inflight;
  const job = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      bufferCache.set(url, buf);
      return buf;
    } catch {
      return null;
    } finally {
      bufferLoading.delete(url);
    }
  })();
  bufferLoading.set(url, job);
  return job;
}

/** Single-file `<audio>` fallback: used when Web Audio is unavailable or a file
 *  will not decode (older Safari and Ogg), so the game still has sound. */
function playCandidate(list: string[], i: number, volume: number, rate: number): void {
  if (i >= list.length) return;
  let a: HTMLAudioElement;
  try {
    a = new Audio(list[i]);
  } catch {
    return;
  }
  a.volume = Math.max(0, Math.min(1, volume));
  if (rate !== 1) {
    try { a.playbackRate = rate; } catch { /* older engines */ }
  }
  let advanced = false;
  const next = () => {
    if (advanced) return;
    advanced = true;
    playCandidate(list, i + 1, volume, rate);
  };
  a.addEventListener('error', next, { once: true });
  a.play().catch((err: unknown) => {
    const name = (err as { name?: string } | null)?.name;
    if (name === 'NotSupportedError') next();
  });
}

function playViaElement(key: string, volume: number, rate: number): void {
  const candidates: string[] = [];
  const file = SFX_FILES[key];
  if (file) candidates.push(soundsDir() + file);
  const remote = SFX_REMOTE[key];
  if (remote) candidates.push(remote);
  if (!candidates.length) return;
  // `<audio>` volume cannot exceed 1, so the loudness trim cannot be applied
  // here; cap it instead of distorting.
  playCandidate(candidates, 0, Math.min(1, volume), rate);
}

/**
 * Warm the sound cache. Called once the player taps Play (a real user gesture),
 * so the first monster roar is not the first time the file is fetched — and so
 * the AudioContext is allowed to start under browser autoplay rules.
 */
export function primeSFX(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  for (const file of Object.values(SFX_FILES)) void loadBuffer(ctx, soundsDir() + file);
}

/**
 * Play a sound effect. `key` is a slot name (see SFX_FILES); `rate` slows or
 * speeds the recording without a pitch-shifting library.
 */
export function playSFX(key: string, volume = 0.5, rate = 1): void {
  try {
    const file = SFX_FILES[key];
    if (!file) { playViaElement(key, volume, rate); return; }
    const ctx = getCtx();
    if (!ctx) { playViaElement(key, volume, rate); return; }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const url = soundsDir() + file;

    const fire = (buf: AudioBuffer) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      if (rate !== 1) src.playbackRate.value = rate;
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, volume) * (SFX_GAIN[key] ?? 1) * SFX_MASTER;
      src.connect(gain);
      gain.connect(ctx.destination);
      try { src.start(); } catch { /* context went away mid-play */ }
    };

    const ready = bufferCache.get(url);
    if (ready) { fire(ready); return; }

    void loadBuffer(ctx, url).then((buf) => {
      if (buf) fire(buf);
      else playViaElement(key, volume, rate);
    });
  } catch {}
}

/** Two low thumps — used under the room clock when time is nearly out. */
export function playHeartbeat(volume = 0.35): void {
  playSFX('heartbeat', volume, 0.55);
  setTimeout(() => playSFX('heartbeat', volume * 0.8, 0.5), 175);
}

export const BGM: Record<string, string> = {
  dungeon:  'https://assets.mixkit.co/music/preview/mixkit-games-worldbeat-466.mp3',
  battle:   'https://assets.mixkit.co/music/preview/mixkit-epic-battle-295.mp3',
  victory:  'https://assets.mixkit.co/music/preview/mixkit-winning-a-prize-2006.mp3',
  sad:      'https://assets.mixkit.co/music/preview/mixkit-sad-lullaby-605.mp3',
  merchant: 'https://assets.mixkit.co/music/preview/mixkit-medieval-tavern-373.mp3',
  boss:     'https://assets.mixkit.co/music/preview/mixkit-cinematic-mystery-291.mp3',
};

let bgmAudio: HTMLAudioElement | null = null;
let bgmKey = '';
export function playBGM(key: string, volume = 0.18, loop = true): void {
  try {
    const url = BGM[key];
    if (!url) return;
    if (bgmKey === key && bgmAudio && !bgmAudio.paused) return;
    if (bgmAudio) { bgmAudio.pause(); bgmAudio.currentTime = 0; }
    bgmAudio = new Audio(url);
    bgmAudio.volume = volume;
    bgmAudio.loop = loop;
    bgmAudio.play().catch(() => {});
    bgmKey = key;
  } catch {}
}
export function stopBGM(): void { if (bgmAudio) { bgmAudio.pause(); bgmAudio.currentTime = 0; } }
export function setBGMVolume(v: number): void { if (bgmAudio) bgmAudio.volume = v; }

// ─────────────────────────────────────────────────────────────
//  7) VOICE (Speech Synthesis) — list all voices, avoid fallback
// ─────────────────────────────────────────────────────────────

export function getAvailableVoices(): VoiceOption[] {
  if (!window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().map(v => ({
    voiceURI: v.voiceURI,
    name: v.name,
    lang: v.lang,
    localService: v.localService,
    isDefault: v.default,
  }));
}

export function chooseBestVoice(voices: VoiceOption[], preferredLangs: string[] = ['en-AU', 'en-GB', 'en-US']): VoiceOption | null {
  if (voices.length === 0) return null;
  const avoid = (n: string) => n.toLowerCase().includes('microsoft david');

  // Prefer "Natural" voices on Edge
  for (const lang of preferredLangs) {
    const v = voices.find(x => x.lang === lang && x.name.toLowerCase().includes('natural') && !avoid(x.name));
    if (v) return v;
  }
  for (const lang of preferredLangs) {
    const v = voices.find(x => x.lang === lang && !avoid(x.name));
    if (v) return v;
  }
  const notDavid = voices.find(v => !avoid(v.name));
  return notDavid || voices[0];
}

export function speakText(opts: {
  text: string;
  voiceURI?: string;           // lock to a specific voice
  preferredLangs?: string[];   // fallback search
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  onUsedVoice?: (voiceName: string) => void;
}): void {
  const { text, voiceURI, preferredLangs = ['en-AU', 'en-GB', 'en-US'], rate = 0.88, pitch = 0.85, volume = 0.9, onEnd, onUsedVoice } = opts;
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = pitch;
  u.volume = volume;

  const voices = window.speechSynthesis.getVoices();
  const avoid = (n: string) => n.toLowerCase().includes('microsoft david');

  let chosen: SpeechSynthesisVoice | undefined;
  if (voiceURI) chosen = voices.find(v => v.voiceURI === voiceURI);

  if (!chosen) {
    // Prefer natural voices
    for (const lang of preferredLangs) {
      chosen = voices.find(v => v.lang === lang && v.name.toLowerCase().includes('natural') && !avoid(v.name));
      if (chosen) break;
    }
  }

  if (!chosen) {
    for (const lang of preferredLangs) {
      chosen = voices.find(v => v.lang === lang && !avoid(v.name));
      if (chosen) break;
    }
  }

  if (!chosen) chosen = voices.find(v => !avoid(v.name)) || voices[0];

  if (chosen) {
    u.voice = chosen;
    u.lang = chosen.lang;
    onUsedVoice?.(chosen.name);
  }

  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

export function stopSpeech(): void { if (window.speechSynthesis) window.speechSynthesis.cancel(); }

// ─────────────────────────────────────────────────────────────
//  8) LEVELING
// ─────────────────────────────────────────────────────────────

export const XP_LEVELS = [0, 80, 200, 420, 740, 1200, 2000, 3200, 5000, 8000, 12000];
export function calcLevel(xp: number): number {
  let l = 1;
  for (let i = 1; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i]) l = i + 1;
    else break;
  }
  return Math.min(l, 10);
}

export function xpToNextLevel(xp: number): { current: number; needed: number; pct: number } {
  const l = calcLevel(xp);
  const base = XP_LEVELS[Math.min(l - 1, XP_LEVELS.length - 1)];
  const next = XP_LEVELS[Math.min(l, XP_LEVELS.length - 1)];
  const cur = xp - base;
  const need = next - base;
  return { current: cur, needed: need, pct: need > 0 ? Math.min(100, (cur / need) * 100) : 100 };
}

// ─────────────────────────────────────────────────────────────
//  9) PARTY FACTORY
// ─────────────────────────────────────────────────────────────

export function createPlayer(opts: {
  name: string;
  cls: PlayerClass;
  gender: Gender;
  heroTier?: HeroTier;
  id?: string;
  dossier?: Partial<PlayerDossier>;
  luck?: number;
  isNPC?: boolean;
  npc?: NPCPlayerProfile;
}): PlayerState {
  const {
    name,
    cls,
    gender,
    heroTier = 'common',
    id,
    dossier,
    luck = 5,
    isNPC = false,
    npc,
  } = opts;
  const c = CLASS_STATS[cls];

  // Tier-based starting perks (purely gamification + premium feel)
  // common: nothing
  // rare: +1 rare-ish consumable (healing potion)
  // epic: +1 epic item OR a companion/pet
  // legendary: +1 life OR phoenix feather
  const inventory: LootItem[] = [];
  let extraLives = 0;

  if (heroTier === 'rare') {
    const hp = LOOT_TABLE.find(i => i.id === 'heal-potion');
    if (hp) inventory.push(hp);
  }
  if (heroTier === 'epic') {
    const elixir = LOOT_TABLE.find(i => i.id === 'elixir-life');
    if (elixir) inventory.push(elixir);
  }
  if (heroTier === 'legendary') {
    const feather = LOOT_TABLE.find(i => i.id === 'phoenix-feather');
    if (feather) inventory.push(feather);
    extraLives = 1;
  }

  const fullDossier: PlayerDossier = {
    appearance: dossier?.appearance || '',
    hometown: dossier?.hometown || '',
    culture: dossier?.culture || '',
    interests: dossier?.interests || [],
    strengths: dossier?.strengths || [],
    fears: dossier?.fears || [],
    signaturePhrases: dossier?.signaturePhrases || [],
    secret: dossier?.secret || '',
  };

  return {
    id: id || `p-${cls}-${Math.random().toString(16).slice(2)}`,
    name,
    class: cls,
    gender,
    heroTier,

    dossier: fullDossier,
    luck: Math.max(0, Math.min(10, Math.round(luck))),
    isNPC,
    npc,

    hp: c.maxHp,
    maxHp: c.maxHp,
    stamina: c.maxStamina,
    maxStamina: c.maxStamina,
    shield: 0,
    lives: c.startLives + extraLives,

    xp: 0,
    level: 1,
    gold: c.startGold,

    stats: { ...c.stats },

    poisoned: false,
    poisonDmg: 0,
    poisonRoomsLeft: 0,
    cursed: false,

    inventory,

    kills: 0,
    mercy: 0,
    decisionsGood: 0,
    decisionsBad: 0,
  };
}

export function createParty(players: Array<{ name: string; class: PlayerClass; gender: Gender; heroTier?: HeroTier; dossier?: Partial<PlayerDossier>; luck?: number; isNPC?: boolean; npc?: NPCPlayerProfile }>): PartyState {
  const uniqueClasses = new Set(players.map(p => p.class));
  if (uniqueClasses.size !== players.length) {
    throw new Error('Each class can be chosen only once.');
  }
  const ps = players.map(p => createPlayer({ name: p.name, cls: p.class, gender: p.gender, heroTier: p.heroTier, dossier: p.dossier, luck: p.luck, isNPC: p.isNPC, npc: p.npc }));

  // Starting companion: if any player is epic/legendary, small chance of a pet join (fun hook)
  const tiers = ps.map(p => p.heroTier);
  const companions: Companion[] = [];
  if (tiers.includes('epic') || tiers.includes('legendary')) {
    const pet = COMPANIONS.find(c => c.id === 'pet-hawk') || COMPANIONS[0];
    if (pet) companions.push(pet);
  }

  return {
    players: ps,
    activePlayerIndex: 0,
    companions,
    stash: [],

    relationships: initRelationships(ps),

    roomsCleared: 0,
    monstersDefeated: 0,
    trapsAvoided: 0,
    treasuresFound: 0,
    npcsHelped: 0,
    deaths: 0,

    dmBeatUsed: {},

    storyLog: [],
    startTime: Date.now(),
  };
}

export function getActivePlayer(party: PartyState): PlayerState {
  return party.players[Math.max(0, Math.min(party.activePlayerIndex, party.players.length - 1))];
}

export function setActivePlayer(party: PartyState, playerId: string): PartyState {
  const idx = party.players.findIndex(p => p.id === playerId);
  return idx >= 0 ? { ...party, activePlayerIndex: idx } : party;
}

// ─────────────────────────────────────────────────────────────
//  10) COMBAT / DAMAGE / HEAL / GOLD / XP
// ─────────────────────────────────────────────────────────────

export function applyDamageToPlayer(p: PlayerState, raw: number): PlayerState {
  let dmg = raw;
  let shield = p.shield;
  if (shield > 0) {
    const absorbed = Math.min(shield, dmg);
    shield -= absorbed;
    dmg -= absorbed;
  }
  return { ...p, hp: Math.max(0, p.hp - dmg), shield };
}

export function applyHealToPlayer(p: PlayerState, amt: number): PlayerState {
  return { ...p, hp: Math.min(p.maxHp, p.hp + amt) };
}

export function applyGoldToPlayer(p: PlayerState, delta: number): PlayerState {
  return { ...p, gold: Math.max(0, p.gold + delta) };
}

export function applyXPToPlayer(p: PlayerState, xp: number): PlayerState {
  const newXp = p.xp + xp;
  const lvl = calcLevel(newXp);
  return { ...p, xp: newXp, level: lvl };
}

export function canRevivePartyMember(p: PlayerState): boolean {
  return p.hp <= 0 && p.lives > 0;
}

export function revivePartyMember(p: PlayerState): PlayerState {
  return { ...p, hp: Math.floor(p.maxHp * 0.4), lives: p.lives - 1 };
}

export function partyAnyAlive(party: PartyState): boolean {
  return party.players.some(p => p.hp > 0);
}

// ─────────────────────────────────────────────────────────────
//  11) D20 SKILL CHECKS + COMPANION BONUSES + REROLLS
// ─────────────────────────────────────────────────────────────

export function rollD20(): number { return Math.floor(Math.random() * 20) + 1; }

export function getPartyStatBonus(party: PartyState, stat: StatKey): number {
  return party.companions.reduce((acc, c) => acc + (c.bonus[stat] || 0), 0);
}

export function skillCheck(opts: {
  party: PartyState;
  actor: PlayerState;
  stat: StatKey;
  dc: number;
  allowCompanionReroll?: boolean;
}): { roll: number; mod: number; partyBonus: number; total: number; success: boolean; rerolled?: boolean } {
  const { party, actor, stat, dc, allowCompanionReroll = true } = opts;
  const baseMod = Math.floor((actor.stats[stat] - 10) / 2);
  const partyBonus = getPartyStatBonus(party, stat);

  const doRoll = () => {
    const roll = rollD20();
    const total = roll + baseMod + partyBonus;
    return { roll, total };
  };

  let { roll, total } = doRoll();
  let success = total >= dc;

  // Companion reroll chance
  const rerollChance = party.companions.reduce((acc, c) => acc + (c.passive?.rerollChance || 0), 0);
  if (!success && allowCompanionReroll && rerollChance > 0 && Math.random() < Math.min(0.25, rerollChance)) {
    const r2 = doRoll();
    roll = r2.roll;
    total = r2.total;
    success = total >= dc;
    return { roll, mod: baseMod, partyBonus, total, success, rerolled: true };
  }

  return { roll, mod: baseMod, partyBonus, total, success };
}

// ─────────────────────────────────────────────────────────────
//  12) ITEMS: USE ITEM (apply to active player by default)
// ─────────────────────────────────────────────────────────────

export function useItem(opts: {
  party: PartyState;
  playerId: string;
  itemId: string;
}): { party: PartyState; message: string } {
  const { party, playerId, itemId } = opts;
  const idx = party.players.findIndex(p => p.id === playerId);
  if (idx < 0) return { party, message: 'Player not found.' };
  const p = party.players[idx];
  const itemIndex = p.inventory.findIndex(i => i.id === itemId);
  if (itemIndex < 0) return { party, message: 'Item not found.' };

  const item = p.inventory[itemIndex];
  const inv = p.inventory.filter((_, i) => i !== itemIndex);
  let nextP: PlayerState = { ...p, inventory: inv };
  let message = '';

  switch (item.effect) {
    case 'heal':
      nextP = item.value >= 999 ? { ...nextP, hp: nextP.maxHp } : applyHealToPlayer(nextP, item.value);
      message = `${item.emoji} ${item.name}: ${item.value >= 999 ? 'FULL HEAL!' : `+${item.value} HP`}`;
      break;
    case 'shield':
      nextP = { ...nextP, shield: nextP.shield + item.value };
      message = `${item.emoji} ${item.name}: Shield +${item.value}`;
      break;
    case 'revive':
      nextP = { ...nextP, lives: nextP.lives + 1 };
      message = `${item.emoji} ${item.name}: +1 Life`;
      break;
    case 'poison-cure':
      nextP = { ...nextP, poisoned: false, poisonDmg: 0, poisonRoomsLeft: 0 };
      message = `${item.emoji} ${item.name}: Poison cured`;
      break;
    case 'trap-detector':
      message = `${item.emoji} ${item.name}: Traps feel easier now (-2 DC next trap)`;
      // Model: we treat as party bonus by adding a common companion-like temporary effect in UI layer.
      break;
    case 'str-boost':
      nextP = { ...nextP, stats: { ...nextP.stats, str: nextP.stats.str + item.value } };
      message = `${item.emoji} ${item.name}: STR +${item.value}`;
      break;
    case 'dex-boost':
      nextP = { ...nextP, stats: { ...nextP.stats, dex: nextP.stats.dex + item.value } };
      message = `${item.emoji} ${item.name}: DEX +${item.value}`;
      break;
    case 'int-boost':
      nextP = { ...nextP, stats: { ...nextP.stats, int: nextP.stats.int + item.value } };
      message = `${item.emoji} ${item.name}: INT +${item.value}`;
      break;
    case 'wis-boost':
      nextP = { ...nextP, stats: { ...nextP.stats, wis: nextP.stats.wis + item.value } };
      message = `${item.emoji} ${item.name}: WIS +${item.value}`;
      break;
    case 'cha-boost':
      nextP = { ...nextP, stats: { ...nextP.stats, cha: nextP.stats.cha + item.value } };
      message = `${item.emoji} ${item.name}: CHA +${item.value}`;
      break;
    case 'luck':
      message = `${item.emoji} ${item.name}: Fortune smiles (reroll chance increased)`;
      // Applied as companion reroll chance? left to UI.
      break;
    default:
      message = `${item.emoji} ${item.name} used.`;
  }

  const nextPlayers = party.players.map((pp, i) => (i === idx ? nextP : pp));
  return { party: { ...party, players: nextPlayers }, message };
}

// ─────────────────────────────────────────────────────────────
//  13) SHOP STOCK GENERATION (rarity tiers)
// ─────────────────────────────────────────────────────────────

export function generateMerchantStock(opts: {
  difficulty: Difficulty;
  chapter: number;
  allowLegendary?: boolean;
}): LootItem[] {
  const { difficulty, chapter, allowLegendary = true } = opts;

  const byRarity = {
    common: LOOT_TABLE.filter(i => i.rarity === 'common'),
    rare: LOOT_TABLE.filter(i => i.rarity === 'rare'),
    epic: LOOT_TABLE.filter(i => i.rarity === 'epic'),
    legendary: LOOT_TABLE.filter(i => i.rarity === 'legendary'),
  };

  // Weighting: later chapters and higher difficulty -> more rare/epic
  const base = {
    novice: { c: 7, r: 3, e: 1, l: 0 },
    adventurer: { c: 5, r: 4, e: 2, l: 0 },
    hero: { c: 4, r: 4, e: 3, l: 1 },
    legend: { c: 3, r: 4, e: 4, l: 2 },
  }[difficulty];

  const chapterBoost = Math.max(0, chapter - 1);
  const wantEpic = base.e + Math.floor(chapterBoost / 2);
  const wantLegend = allowLegendary ? base.l + (chapter >= 4 ? 1 : 0) : 0;

  const pick = (arr: LootItem[]) => arr[Math.floor(Math.random() * arr.length)];
  const uniq = new Map<string, LootItem>();

  // Fill slots
  for (let i = 0; i < base.c; i++) uniq.set(`c-${i}-${pick(byRarity.common).id}`, pick(byRarity.common));
  for (let i = 0; i < base.r; i++) uniq.set(`r-${i}-${pick(byRarity.rare).id}`, pick(byRarity.rare));
  for (let i = 0; i < wantEpic; i++) uniq.set(`e-${i}-${pick(byRarity.epic).id}`, pick(byRarity.epic));
  for (let i = 0; i < wantLegend; i++) uniq.set(`l-${i}-${pick(byRarity.legendary).id}`, pick(byRarity.legendary));

  return Array.from(uniq.values()).slice(0, 14);
}

export function getBuyPrice(item: LootItem): number {
  const mult = item.rarity === 'common' ? 2.5 : item.rarity === 'rare' ? 2.8 : item.rarity === 'epic' ? 3.2 : 3.8;
  return Math.max(5, Math.round(item.sellPrice * mult));
}

// ─────────────────────────────────────────────────────────────
//  14) UTILITIES
// ─────────────────────────────────────────────────────────────

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function getPronouns(gender: Gender): {
  they: string; them: string; their: string; theirs: string; themself: string;
  They: string; Them: string; Their: string; Theirs: string; Themself: string;
} {
  // Binary for now (as requested). Internally we still provide they/them-style keys.
  const p = gender === 'female'
    ? { they: 'she', them: 'her', their: 'her', theirs: 'hers', themself: 'herself' }
    : { they: 'he', them: 'him', their: 'his', theirs: 'his', themself: 'himself' };
  return {
    ...p,
    They: p.they.charAt(0).toUpperCase() + p.they.slice(1),
    Them: p.them.charAt(0).toUpperCase() + p.them.slice(1),
    Their: p.their.charAt(0).toUpperCase() + p.their.slice(1),
    Theirs: p.theirs.charAt(0).toUpperCase() + p.theirs.slice(1),
    Themself: p.themself.charAt(0).toUpperCase() + p.themself.slice(1),
  };
}

export function getPronounVars(prefix: 'actor' | 'target', gender: Gender): Record<string, string> {
  const p = getPronouns(gender);
  return {
    [`${prefix}_he`]: p.they,
    [`${prefix}_him`]: p.them,
    [`${prefix}_his`]: p.their,
    [`${prefix}_himself`]: p.themself,
    [`${prefix}_He`]: p.They,
    [`${prefix}_Him`]: p.Them,
    [`${prefix}_His`]: p.Their,
    [`${prefix}_Himself`]: p.Themself,
  };
}

export function getSurvivalRating(party: PartyState): { rank: string; color: string; title: string } {
  const kills = party.players.reduce((a, p) => a + p.kills, 0);
  const mercy = party.players.reduce((a, p) => a + p.mercy, 0);
  const good = party.players.reduce((a, p) => a + p.decisionsGood, 0);
  const bad = party.players.reduce((a, p) => a + p.decisionsBad, 0);

  const score = party.roomsCleared * 8 + party.monstersDefeated * 12 + party.npcsHelped * 8 + good * 4 - bad * 3 - party.deaths * 20 + kills * 2 + mercy;
  if (score >= 160) return { rank: 'S+', color: '#f59e0b', title: 'Legendary Party' };
  if (score >= 120) return { rank: 'A', color: '#10b981', title: 'Heroic Survivors' };
  if (score >= 85) return { rank: 'B', color: '#3b82f6', title: 'Seasoned Adventurers' };
  if (score >= 55) return { rank: 'C', color: '#8b5cf6', title: 'Dungeon Crawlers' };
  if (score >= 25) return { rank: 'D', color: '#f97316', title: 'Lucky Escapees' };
  return { rank: 'F', color: '#ef4444', title: 'Dungeon Fodder' };
}

export function generateStorybook(session: GameSession): StoryEntry[] {
  const party = session.party;
  const entries: StoryEntry[] = [
    {
      timestamp: party.startTime,
      room: 0,
      event: 'The Chronicle Begins',
      actor: 'PARTY',
      choice: '',
      outcome: `The party descended into Tutorly Dungeons and Dragons: ${party.players.map(p => `${p.name} the ${CLASS_STATS[p.class].title}`).join(', ')}. The Dungeon Master smiled. The dungeon listened. The story began...`,
      imageKey: 'dungeon-bg',
      isHighlight: true,
    },
    ...party.storyLog,
  ];

  if (session.completedAt) {
    const r = getSurvivalRating(party);
    entries.push({
      timestamp: session.completedAt,
      room: session.totalRooms,
      event: 'The Chronicle Ends',
      actor: 'PARTY',
      choice: '',
      outcome: `After ${formatTime(session.completedAt - party.startTime)}, the party emerged from the dungeon. Rating: ${r.rank} — ${r.title}. Tutorly Dungeons and Dragons will remember every decision they made.`,
      imageKey: 'victory',
      isHighlight: true,
    });
  }

  return entries;
}

// ─────────────────────────────────────────────────────────────
//  15) DEFAULT CAMPAIGN (includes betrayal/pvp twist + companion)
// ─────────────────────────────────────────────────────────────

function item(id: string): LootItem | undefined {
  return LOOT_TABLE.find(i => i.id === id);
}

function companion(id: string): Companion | undefined {
  return COMPANIONS.find(c => c.id === id);
}

export const DEFAULT_EVENTS: DungeonEvent[] = [
  {
    id: 'ev01',
    kind: 'narrative',
    chapter: 1,
    title: 'The Mouth of the Abyss',
    imageKey: 'dungeon-bg',
    narration: 'Rain hammers the cliffside. The entrance yawns open like a hungry throat. Behind you, the world is safe and ordinary. Ahead: Tutorly Dungeons and Dragons — a dungeon that turns courage into legend or corpses into warnings. The DM clears his throat. "Once you step inside, the dungeon will begin to bargain with your lives."',
    dmReaction: {
      onEnter: 'Welcome, party. Tutorly Dungeons and Dragons is listening. Speak softly. Decide boldly.',
      onGoodOutcome: 'A careful start. You might live long enough to regret it.',
      onBadOutcome: 'The dungeon loves impatience. It feeds on it.',
      onDeath: 'The ruins claim their first soul with embarrassing speed.',
    },
    timeLimitSec: 60,
    choices: [
      {
        id: 'c1a', label: 'Descend carefully with torches', emoji: '🔥',
        description: 'Slow steps, sharp eyes. Treat every shadow like a knife.',
        outcome: 'good', applyTo: 'party',
        hpChange: 0, goldChange: 0, xpChange: 40, staminaChange: -5,
        outcomeNarration: 'Torches ignite. The party descends in formation. Your caution pays off: you spot the first tripwire before it becomes a funeral. The dungeon seems... mildly disappointed.',
        riskLevel: 'safe',
      },
      {
        id: 'c1b', label: 'Sprint down. No fear.', emoji: '💨',
        description: 'Speed is survival. Hesitation is death.',
        outcome: 'bad', applyTo: 'party',
        hpChange: -18, goldChange: 0, xpChange: 20, staminaChange: -15,
        outcomeNarration: 'A step collapses. Someone falls. Then another. You recover quickly — but blood has already been paid to the dungeon.',
        riskLevel: 'risky',
      },
      {
        id: 'c1c', label: 'Scavenge the entrance for gear', emoji: '🔍',
        description: 'If others died here, let their mistakes feed your survival.',
        outcome: 'jackpot', applyTo: 'party',
        hpChange: 0, goldChange: 20, xpChange: 60, staminaChange: 0,
        grantsItem: item('heal-potion'),
        outcomeNarration: 'You find a dead adventurer\'s pack. A healing potion. 20 gold. And a note: "DON\'T TRUST THE MIRROR." Wonderful. That is definitely not terrifying.',
        riskLevel: 'safe',
      },
      {
        id: 'c1d', label: 'Offer a prayer for protection', emoji: '🙏',
        description: 'Ask whatever gods still listen to this place for mercy.',
        outcome: 'neutral', applyTo: 'party',
        hpChange: 0, goldChange: 0, xpChange: 35, staminaChange: 5,
        outcomeNarration: 'You whisper prayers into the dark. The air warms slightly. Perhaps something heard you. Perhaps something laughed.',
        riskLevel: 'safe',
      },
    ],
  },
  {
    id: 'ev02',
    kind: 'trap',
    chapter: 1,
    title: 'The Corridor of Clicking Stones',
    imageKey: 'trap-room',
    narration: 'A corridor of pressure tiles. Arrow holes line the walls like hungry mouths. A skeleton lies mid-sprint — still trying to run centuries later.',
    dmReaction: {
      onEnter: 'Traps don\'t hate you. They don\'t fear you. They\'re simply honest about what they do.',
      onGoodOutcome: 'Elegant. Precise. Almost beautiful.',
      onBadOutcome: 'Arrows fly. Blood follows.',
      onDeath: 'The corridor adds another skeleton to its collection.',
    },
    timeLimitSec: 50,
    trap: { name: 'Arrow Storm', description: 'A volley of bolts fires from both walls.', damage: 45, avoidStat: 'dex', avoidDC: 14, imageKey: 'trap-room' },
    choices: [
      {
        id: 'c2a', label: 'Disarm it with patience', emoji: '🔧',
        description: 'Find the mechanism and kill it before it kills you.',
        outcome: 'good', applyTo: 'active',
        hpChange: 0, goldChange: 0, xpChange: 70, staminaChange: -10,
        skillCheck: { stat: 'int', dc: 13 },
        outcomeNarration: 'You pry loose a stone panel. A rusted lever. You pull. The tiles relax with a final defeated click. The dungeon sighs.',
        riskLevel: 'risky',
      },
      {
        id: 'c2b', label: 'Rogue-style dash between tiles', emoji: '🗡️',
        description: 'Precision footwork. Fast. Dangerous.',
        outcome: 'neutral', applyTo: 'active',
        hpChange: -12, goldChange: 0, xpChange: 55, staminaChange: -15,
        skillCheck: { stat: 'dex', dc: 12 },
        outcomeNarration: 'You move like smoke — until a tile dips. A bolt grazes your arm. You make it through, breathing hard.',
        riskLevel: 'risky',
      },
      {
        id: 'c2c', label: 'Sprint as a group. Pray.', emoji: '⚡',
        description: 'Everyone runs. The dungeon chooses who it hits.',
        outcome: 'bad', applyTo: 'party',
        hpChange: -30, goldChange: 0, xpChange: 35, staminaChange: -25,
        outcomeNarration: 'The corridor erupts in violence. Bolts slam into stone. Someone screams. You escape, but the dungeon collects its toll.',
        riskLevel: 'deadly',
      },
      {
        id: 'c2d', label: 'Send a shield-bearer first', emoji: '🛡️',
        description: 'Let the toughest take the storm while others follow.',
        outcome: 'good', applyTo: 'active',
        hpChange: -10, goldChange: 0, xpChange: 60, staminaChange: -10,
        outcomeNarration: 'You raise your shield and advance. Bolts hammer into it like rain. Painful, but controlled. The party follows your safe trail.',
        riskLevel: 'risky',
      },
    ],
  },
  {
    id: 'ev03',
    kind: 'npc',
    chapter: 1,
    title: 'A Pet in the Dark',
    imageKey: 'potion-herbs',
    narration: 'Behind a cracked pillar, a tiny creature shivers — a wolf pup, black as ash, eyes like moonlight. It\'s hungry. Afraid. But it doesn\'t run when you approach. It watches your hands.',
    dmReaction: {
      onEnter: 'Not everything down here wants to kill you. Not immediately.',
      onGoodOutcome: 'A new bond is forged. Companions matter when death corners you.',
      onBadOutcome: 'You had a chance at loyalty. You traded it for convenience.',
      onDeath: 'Even the pup turns away from the body. The ruins have rules.',
    },
    timeLimitSec: 55,
    choices: [
      {
        id: 'c3a', label: 'Feed it and adopt it', emoji: '🐺',
        description: 'Spend some gold to earn loyalty.',
        outcome: 'good', applyTo: 'party',
        hpChange: 0, goldChange: -10, xpChange: 80, staminaChange: 0,
        addCompanion: companion('pet-wolf'),
        outcomeNarration: 'You offer food. The pup approaches, sniffs, then devours it. After a moment it presses its head against your leg. Congratulations — you now have a wolf pup. Also: a moral obligation.',
        riskLevel: 'safe',
      },
      {
        id: 'c3b', label: 'Ignore it. Focus on survival', emoji: '🚶',
        description: 'You can\'t carry attachments in a place like this.',
        outcome: 'neutral', applyTo: 'party',
        hpChange: 0, goldChange: 0, xpChange: 30, staminaChange: 5,
        outcomeNarration: 'You walk away. The pup does not follow. Behind you, you hear a quiet whine — or perhaps the dungeon mimicking it.',
        riskLevel: 'safe',
      },
      {
        id: 'c3c', label: 'Try to scare it away', emoji: '😠',
        description: 'No distractions. No weak links.',
        outcome: 'bad', applyTo: 'party',
        hpChange: -10, goldChange: 0, xpChange: 20, staminaChange: -5,
        outcomeNarration: 'You shout. The pup bolts — and triggers a hidden nail trap. A spike catches someone\'s boot. The pup disappears, but the dungeon remembers your cruelty.',
        riskLevel: 'risky',
      },
    ],
  },
  {
    id: 'ev04',
    kind: 'monster',
    chapter: 2,
    title: 'The Troll Under the Bridge',
    imageKey: 'monster-encounter',
    narration: 'A bridge spans a chasm. A troll sits beneath it, picking teeth with a femur. It looks up. "Toll," it rumbles. "Or blood."',
    dmReaction: {
      onEnter: 'A troll. Classic. Dangerous. Annoyingly confident.',
      onGoodOutcome: 'Well played. You made a monster blink.',
      onBadOutcome: 'It hits like a landslide.',
      onDeath: 'The troll adds another bone to the collection.',
    },
    timeLimitSec: 45,
    monster: {
      name: 'Grothak the Bridge Troll',
      description: 'Regenerating brute. It loves easy meals and hard bargains.',
      hp: 140,
      attackDamage: 40,
      lootGold: 60,
      lootXP: 110,
      weaknessHint: 'Fire stops regeneration. Confidence stops breathing.',
      imageKey: 'monster-encounter',
      loot: item('iron-shield'),
    },
    partyTwist: { canSideWithEnemy: true },
    choices: [
      {
        id: 'c4a', label: 'Pay the toll (50 gold)', emoji: '💰',
        description: 'You value life more than coins.',
        outcome: 'neutral', applyTo: 'party',
        hpChange: 0, goldChange: -50, xpChange: 30, staminaChange: 0,
        outcomeNarration: 'The troll counts coins with surprising skill. "Smart meat," it says, and lets you pass. You hate that sentence.',
        riskLevel: 'safe',
      },
      {
        id: 'c4b', label: 'Fight it head-on', emoji: '⚔️',
        description: 'End the threat. Earn the bridge.',
        outcome: 'bad', applyTo: 'active',
        hpChange: -40, goldChange: 60, xpChange: 120, staminaChange: -25,
        skillCheck: { stat: 'str', dc: 15 },
        outcomeNarration: 'Steel meets stone-flesh. The troll slams you into the bridge, cracking ribs. But you keep swinging. It finally topples into the abyss, roaring all the way down. You loot 60 gold from its nest.',
        riskLevel: 'deadly',
      },
      {
        id: 'c4c', label: 'Lie: "We serve the Lich King"', emoji: '🎭',
        description: 'Fear is cheaper than steel.',
        outcome: 'good', applyTo: 'active',
        hpChange: 0, goldChange: 0, xpChange: 90, staminaChange: 0,
        skillCheck: { stat: 'cha', dc: 14 },
        outcomeNarration: 'Your voice becomes a weapon. The troll\'s eyes widen. It shuffles aside, bowing. "No dust! No curse! Go!" It trembles. You pass — victorious without blood.',
        riskLevel: 'risky',
      },
      {
        id: 'c4d', label: 'Side with the troll (betray another party)', emoji: '🩸',
        description: 'Offer the troll a different meal: someone else.',
        outcome: 'death', applyTo: 'target', requiresTargetPlayer: true,
        hpChange: -999, goldChange: 0, xpChange: 150, staminaChange: 0,
        stealGoldFromTarget: 20,
        outcomeNarration: 'The troll grins. You point at a party member. The troll lunges. This is not a bluff. Someone\'s story ends here — and the rest of you will never forget who chose it.',
        riskLevel: 'deadly',
      },
    ],
  },
  {
    id: 'ev05',
    kind: 'jumpscare',
    chapter: 2,
    title: 'The Whispering Gallery',
    imageKey: 'dungeon-bg',
    narration: 'A circular chamber. Carved faces. Your footsteps echo as if something follows one step behind you. The air is suddenly cold. A whisper touches the back of your neck.',
    dmReaction: {
      onEnter: 'Shhh. Don\'t move. Something is in here with you.',
      onGoodOutcome: 'You kept your head. In this dungeon, that is rare.',
      onBadOutcome: 'Fear makes fools of everyone eventually.',
      onDeath: 'The last sound you hear is your own heartbeat stopping.',
    },
    timeLimitSec: 40,
    jumpscare: {
      name: 'Banshee Echo',
      description: 'A spectral remnant of a queen who died screaming.',
      damage: 25,
      imageKey: 'monster-encounter',
      scare: '💀 A face materialises inches from you — screaming without sound. Then the scream hits your bones.',
    },
    choices: [
      {
        id: 'c5a', label: 'Stand perfectly still', emoji: '🧊',
        description: 'No movement. No breathing. No mistakes.',
        outcome: 'good', applyTo: 'party',
        hpChange: 0, goldChange: 0, xpChange: 75, staminaChange: -10,
        skillCheck: { stat: 'wis', dc: 12 },
        outcomeNarration: 'You freeze. The presence drifts past. Cold air. Ancient grief. Then it fades. You exhale together like survivors.',
        riskLevel: 'risky',
      },
      {
        id: 'c5b', label: 'Run for the exit', emoji: '🏃',
        description: 'Flight is a decision too.',
        outcome: 'bad', applyTo: 'party',
        hpChange: -25, goldChange: 0, xpChange: 35, staminaChange: -20,
        outcomeNarration: 'You bolt. The chamber punishes the noise. The scream hits you like a fist. You escape — shaken, alive, and slightly deaf.',
        riskLevel: 'deadly',
      },
      {
        id: 'c5c', label: 'Speak to it with respect', emoji: '🗣️',
        description: 'Some monsters are just pain that never ended.',
        outcome: 'jackpot', applyTo: 'party',
        hpChange: 15, goldChange: 0, xpChange: 120, staminaChange: 10,
        skillCheck: { stat: 'cha', dc: 15 },
        grantsItem: item('archmage-tome'),
        outcomeNarration: 'You speak gently. The presence pauses. The grief softens. The queen\'s echo gifts you a fragment of ancient knowledge — and spares your hearts.',
        riskLevel: 'risky',
      },
    ],
  },
  {
    id: 'ev06',
    kind: 'merchant',
    chapter: 2,
    title: 'Grimshaw\'s Black Market',
    imageKey: 'potion-herbs',
    narration: 'A hidden chamber, warm fire, shelves of potions and weapons. Grimshaw looks up and smiles like a man selling exits. "Gold buys survival," he says.',
    dmReaction: {
      onEnter: 'A merchant. Rare mercy. Rarer honesty. Spend wisely.',
      onGoodOutcome: 'Now you look like a party that might actually survive.',
      onBadOutcome: 'Leaving underprepared is a choice. A loud one.',
      onDeath: 'Grimshaw shrugs. "Another donation to my stock," he mutters.',
    },
    timeLimitSec: 90,
    merchant: {
      name: 'Grimshaw the Fence',
      greeting: 'I\'ve outlived heroes, monsters, and curses. Buy something useful, or leave me in peace.',
      items: [],
      imageKey: 'potion-herbs',
      canSell: true,
    },
    choices: [
      {
        id: 'c6a', label: 'Shop for gear', emoji: '🛒',
        description: 'Open the shop UI and buy items.',
        outcome: 'neutral', applyTo: 'party',
        hpChange: 0, goldChange: 0, xpChange: 20, staminaChange: 15,
        outcomeNarration: 'You browse grim tools of survival. Grimshaw watches, amused. "Everything has a price," he says. "Including your trust."',
        riskLevel: 'safe',
      },
      {
        id: 'c6b', label: 'Ask for rumors (twists ahead)', emoji: '🗣️',
        description: 'Learn what the dungeon won\'t tell you.',
        outcome: 'good', applyTo: 'party',
        hpChange: 0, goldChange: 0, xpChange: 60, staminaChange: 5,
        outcomeNarration: 'Grimshaw leans in. "Sometimes the dungeon offers survival... by making you fight each other. Don\'t assume your party stays a party."',
        riskLevel: 'safe',
      },
      {
        id: 'c6c', label: 'Try to steal from Grimshaw', emoji: '🤫',
        description: 'Risk it. He looks distracted.',
        outcome: 'bad', applyTo: 'active',
        hpChange: -20, goldChange: 0, xpChange: 15, staminaChange: 0,
        skillCheck: { stat: 'dex', dc: 18 },
        outcomeNarration: 'A hidden blade snaps out. You bleed. Grimshaw doesn\'t even blink. "Try that again and you won\'t leave," he says pleasantly.',
        riskLevel: 'deadly',
      },
    ],
  },
  {
    id: 'ev07',
    kind: 'betrayal',
    chapter: 3,
    title: 'The Hunger Contract',
    imageKey: 'monster-encounter',
    narration: 'A demon-scribe crawls out of a crack in the wall, carrying parchment made of skin. It looks at each of you for far too long, like it can taste secrets. "Sign," it whispers. "One of you dies. The rest receive a legendary artifact. Refuse... and I summon the Hunter." Its smile widens. "Love, jealousy, admiration, resentment... your hearts are loud. I can hear who would die for whom. I can also hear who would kill for whom." This is not a bluff. The dungeon is offering you a shortcut made of cruelty.',
    dmReaction: {
      onEnter: 'Here it is. The dungeon\'s favorite game: turning friends into resources.',
      onGoodOutcome: 'You refused the easy evil. The dungeon is... displeased.',
      onBadOutcome: 'You made a dark choice. The reward is real. The consequences will be too.',
      onDeath: 'The contract is satisfied. The dead do not argue.',
    },
    timeLimitSec: 45,
    partyTwist: { canBetray: true, voteRequired: true },
    choices: [
      {
        id: 'c7a', label: 'Refuse. Fight the Hunter instead', emoji: '⚔️',
        description: 'No sacrifices. We survive together — or die together.',
        outcome: 'bad', applyTo: 'party',
        hpChange: -35, goldChange: 0, xpChange: 140, staminaChange: -25,
        outcomeNarration: 'The demon-scribe shrieks with joy and vanishes. The Hunter arrives — something with claws like scythes. The fight is brutal. You survive, but barely. Still... your souls remain your own.',
        riskLevel: 'deadly',
      },
      {
        id: 'c7love', label: 'Swear a vow to protect someone in the party', emoji: '💘',
        description: 'Love, loyalty, obsession — the dungeon will use it, but it can also make you stronger.',
        outcome: 'good', applyTo: 'target', requiresTargetPlayer: true,
        hpChange: 25, goldChange: 0, xpChange: 90, staminaChange: -5,
        addCompanion: companion('pet-hawk'),
        outcomeNarration: 'You step between the demon and {target}. You swear an oath out loud — and the dungeon HEARS it. Something shifts. A Moon-Hawk lands nearby, watching you with too-intelligent eyes. The demon-scribe smiles. "How delicious," it whispers. "Now I know exactly who to threaten."',
        riskLevel: 'risky',
      },
      {
        id: 'c7b', label: 'Sign the contract — choose a sacrifice', emoji: '📜',
        description: 'One dies so the rest may live. The dungeon calls it "math".',
        outcome: 'death', applyTo: 'target', requiresTargetPlayer: true,
        hpChange: -999, goldChange: 0, xpChange: 200, staminaChange: 0,
        grantsItem: item('excalibur'),
        outcomeNarration: 'The parchment drinks ink. The demon-scribe giggles. A shadow hand drags the chosen party member screaming into the crack. In exchange, the floor opens and presents a legendary weapon. You are richer. You are worse.',
        riskLevel: 'deadly',
      },
      {
        id: 'c7c', label: 'Trick the demon: sacrifice YOURSELF then revive', emoji: '🪶',
        description: 'If you have a Phoenix Feather, you might cheat the contract.',
        outcome: 'neutral', applyTo: 'active',
        hpChange: -999, goldChange: 0, xpChange: 220, staminaChange: 0,
        outcomeNarration: 'You step forward and sign. Darkness consumes you. If the party can revive you, you\'ve outplayed a demon. If not... you\'ve just volunteered for oblivion.',
        riskLevel: 'deadly',
      },
    ],
  },
  {
    id: 'ev08',
    kind: 'rest',
    chapter: 3,
    title: 'The Underground Spring',
    imageKey: 'potion-herbs',
    narration: 'A hidden cavern glows with fungi like stars. A clear spring bubbles from the rock. For a moment, the dungeon feels like it might forgive you. For a moment.',
    dmReaction: {
      onEnter: 'Rest. Breathe. The dungeon allows it — briefly.',
      onGoodOutcome: 'Recovered. Stronger. Still doomed, but later.',
      onBadOutcome: 'Even rest can carry a price down here.',
      onDeath: 'You drowned in peace. That is almost poetic.',
    },
    timeLimitSec: 70,
    choices: [
      {
        id: 'c8a', label: 'Drink and recover', emoji: '💧',
        description: 'Heal as a party.',
        outcome: 'good', applyTo: 'party',
        hpChange: 35, goldChange: 0, xpChange: 40, staminaChange: 25,
        outcomeNarration: 'The water tastes like clean air. Wounds close. Muscles relax. You leave the spring stronger than you arrived.',
        riskLevel: 'safe',
      },
      {
        id: 'c8b', label: 'Harvest glowing fungi to sell', emoji: '🍄',
        description: 'Trade beauty for profit.',
        outcome: 'neutral', applyTo: 'party',
        hpChange: 10, goldChange: 25, xpChange: 45, staminaChange: 10,
        outcomeNarration: 'You collect the fungi carefully. Alchemists would pay for this. The spring watches silently.',
        riskLevel: 'safe',
      },
      {
        id: 'c8c', label: 'Offer the spring a gift, gain a companion', emoji: '🧝‍♀️',
        description: 'Some places reward respect.',
        outcome: 'jackpot', applyTo: 'party',
        hpChange: 20, goldChange: -10, xpChange: 120, staminaChange: 15,
        addCompanion: companion('comp-healer'),
        outcomeNarration: 'You leave coins by the water and whisper thanks. A healer steps from the shadows, as if summoned by your humility. "I\'ve been waiting," she says. "This dungeon needs someone who refuses to let people die."',
        riskLevel: 'risky',
      },
    ],
  },
  {
    id: 'ev09',
    kind: 'treasure',
    chapter: 3,
    title: 'The Vault of Teeth',
    imageKey: 'treasure',
    narration: 'A door opens into a vault filled with gold, gems, and weapons. But the gold is mixed with teeth — hundreds of human teeth. The chest at the center is locked with a smiling face carved into it.',
    dmReaction: {
      onEnter: 'Treasure. But the dungeon never gives without laughing.',
      onGoodOutcome: 'The vault pays you. It also marks you.',
      onBadOutcome: 'Greed bites back.',
      onDeath: 'You died wealthy. That\'s the dungeon\'s favorite joke.',
    },
    timeLimitSec: 60,
    treasure: { name: 'Tooth Vault', description: 'Gold mixed with old teeth. The smell is... wrong.', gold: 80, xp: 120, loot: item('coin-fortune'), imageKey: 'treasure', trapped: true, trapDamage: 30 },
    choices: [
      {
        id: 'c9a', label: 'Take only what you need', emoji: '🫱',
        description: 'Careful looting. Less greed, less curse.',
        outcome: 'good', applyTo: 'party',
        hpChange: 0, goldChange: 80, xpChange: 120, staminaChange: -5,
        grantsItem: item('coin-fortune'),
        outcomeNarration: 'You loot swiftly but respectfully. The smiling lock seems... disappointed. The vault lets you leave with your prize.',
        riskLevel: 'risky',
      },
      {
        id: 'c9b', label: 'Empty the vault. Take EVERYTHING', emoji: '🤑',
        description: 'Risk the trap for maximum profit.',
        outcome: 'bad', applyTo: 'party',
        hpChange: -30, goldChange: 140, xpChange: 140, staminaChange: -15,
        outcomeNarration: 'The chest laughs. The floor drops. Teeth and gold cascade like an avalanche. You crawl out richer and bleeding, with the sound of laughter stuck in your head.',
        riskLevel: 'deadly',
      },
      {
        id: 'c9c', label: 'Leave it. It\'s cursed', emoji: '🚪',
        description: 'Survival over wealth.',
        outcome: 'neutral', applyTo: 'party',
        hpChange: 0, goldChange: 0, xpChange: 40, staminaChange: 10,
        outcomeNarration: 'You back away. The lock smiles wider. But you leave alive, which is a form of wealth.',
        riskLevel: 'safe',
      },
    ],
  },
  {
    id: 'ev10',
    kind: 'boss',
    chapter: 4,
    title: 'THE THRONE OF BONES — King Urgoth',
    imageKey: 'dragon',
    narration: 'The final chamber is a cathedral of bones. At the far end sits King Urgoth — lich king, crown fragments orbiting his skull like moons. He rises. "Which of you will betray the others first?" he asks softly. The dungeon holds its breath.',
    dmReaction: {
      onEnter: 'This is it. The throne. The crown. The king. Choose your ending.',
      onGoodOutcome: 'You did it. Against reason. Against fate. You survived.',
      onBadOutcome: 'Urgoth punishes weakness with surgical cruelty.',
      onDeath: 'The lich king raises another servant. Your party becomes part of his walls.',
    },
    timeLimitSec: 45,
    monster: {
      name: 'King Urgoth the Undying',
      description: 'Lich king bound to crown shards. Necrotic magic. Endless patience.',
      hp: 260,
      attackDamage: 55,
      lootGold: 220,
      lootXP: 600,
      weaknessHint: 'Break the crown fragments, break the king.',
      imageKey: 'dragon',
      isBoss: true,
      bossAbility: 'Necrotic Pulse — drains 20 HP from the active hero on failure.',
      loot: item('abyss-crown'),
    },
    partyTwist: { canBetray: true, canSideWithEnemy: true },
    choices: [
      {
        id: 'c10a', label: 'Attack the crown fragments', emoji: '👑',
        description: 'Strike the power source, not the body.',
        outcome: 'good', applyTo: 'active',
        hpChange: -25, goldChange: 0, xpChange: 220, staminaChange: -20,
        skillCheck: { stat: 'dex', dc: 15 },
        outcomeNarration: 'You leap, slash, and shatter a fragment. Urgoth screams. The air becomes lighter. You can win this.',
        riskLevel: 'risky',
      },
      {
        id: 'c10b', label: 'Speak to the king inside the lich', emoji: '💬',
        description: 'Try to reach the dwarf Urgoth once was.',
        outcome: 'jackpot', applyTo: 'party',
        hpChange: 0, goldChange: 0, xpChange: 360, staminaChange: 0,
        skillCheck: { stat: 'cha', dc: 18 },
        grantsItem: item('abyss-crown'),
        outcomeNarration: 'You speak truth into the monster. For one breath, Urgoth remembers. The crown fragments fall. The lich crumbles. The curse breaks like a chain.',
        riskLevel: 'deadly',
      },
      {
        id: 'c10c', label: 'Offer someone to Urgoth to spare the rest', emoji: '🩸',
        description: 'A final betrayal, dressed as strategy.',
        outcome: 'death', applyTo: 'target', requiresTargetPlayer: true,
        hpChange: -999, goldChange: 0, xpChange: 260, staminaChange: 0,
        outcomeNarration: 'Urgoth smiles as you name a party member. The crown fragments flare. A shadow hook drags them screaming into the throne. You live. But you are not heroes.',
        riskLevel: 'deadly',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
//  16) CUSTOM JSON PARSER
// ─────────────────────────────────────────────────────────────

export function parseCustomJson(raw: string): Partial<GameSession> {
  try {
    const d = JSON.parse(raw);
    const events: DungeonEvent[] = [];

    if (Array.isArray(d.events)) {
      d.events.forEach((ev: Partial<DungeonEvent>, i: number) => {
        events.push({
          id: ev.id || `ev-${i}`,
          kind: ev.kind || 'narrative',
          chapter: ev.chapter || Math.floor(i / 3) + 1,
          title: ev.title || `Room ${i + 1}`,
          narration: ev.narration || 'A room awaits.',
          imageKey: ev.imageKey || 'dungeon-bg',
          choices: Array.isArray(ev.choices) ? (ev.choices as SurvivalChoice[]) : [],
          monster: ev.monster,
          trap: ev.trap,
          treasure: ev.treasure,
          merchant: ev.merchant,
          jumpscare: ev.jumpscare,
          dmReaction: ev.dmReaction || {
            onEnter: 'The room awaits...',
            onGoodOutcome: 'Well done.',
            onBadOutcome: 'Ouch.',
            onDeath: 'You have fallen.',
          },
          timeLimitSec: ev.timeLimitSec,
          partyTwist: ev.partyTwist,
        });
      });
    }

    // Optional: AI may include item/companion pools; currently ignored by engine.

    // Inject merchant stock if merchant has empty items
    events.forEach(e => {
      if (e.kind === 'merchant' && e.merchant) {
        if (!e.merchant.items || e.merchant.items.length === 0) {
          e.merchant.items = generateMerchantStock({ difficulty: d.difficulty || 'adventurer', chapter: e.chapter, allowLegendary: true });
        }
      }
    });

    return {
      title: d.title || 'Custom Campaign',
      description: d.description || 'A custom Tutorly Dungeons and Dragons adventure.',
      difficulty: d.difficulty || 'adventurer',
      cefrLevel: d.cefrLevel,
      events: events.length > 0 ? events : DEFAULT_EVENTS,
    };
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────
//  17) SESSION FACTORY
// ─────────────────────────────────────────────────────────────

function scaleByDifficulty(diff: Difficulty): number {
  return diff === 'novice' ? 0.75 : diff === 'adventurer' ? 1.0 : diff === 'hero' ? 1.25 : 1.55;
}

export function createSession(opts: {
  partyPlayers: Array<{
    name: string;
    class: PlayerClass;
    gender: Gender;
    heroTier?: HeroTier;
    dossier?: Partial<PlayerDossier>;
    luck?: number;
    isNPC?: boolean;
    npc?: NPCPlayerProfile;
  }>;
  difficulty: Difficulty;
  dmName?: string;
  dmVoiceURI?: string;
  customJson?: string;
  cefrLevel?: CEFRLevel;
}): GameSession {
  const {
    partyPlayers,
    difficulty,
    dmName = 'Aldric the Ancient',
    dmVoiceURI = '',
    customJson,
    cefrLevel,
  } = opts;

  let events = [...DEFAULT_EVENTS];
  let title = 'Tutorly Dungeons and Dragons: The Shattered Crown';
  let description = 'A twisted D&D survival chronicle where party loyalty is tested by the dungeon itself — built for Tutorly.';

  if (customJson) {
    const p = parseCustomJson(customJson);
    if (p.events && p.events.length > 0) {
      events = p.events;
      title = p.title || title;
      description = p.description || description;
    }
  }

  // Generate merchant stock for default campaign
  events = events.map(e => {
    if (e.kind === 'merchant' && e.merchant) {
      const items = (e.merchant.items && e.merchant.items.length > 0)
        ? e.merchant.items
        : generateMerchantStock({ difficulty, chapter: e.chapter, allowLegendary: true });
      return { ...e, merchant: { ...e.merchant, items } };
    }
    return e;
  });

  // Scale monsters/traps slightly by difficulty
  const mult = scaleByDifficulty(difficulty);
  events = events.map(e => ({
    ...e,
    monster: e.monster ? {
      ...e.monster,
      hp: Math.floor(e.monster.hp * mult),
      attackDamage: Math.floor(e.monster.attackDamage * mult),
    } : e.monster,
    trap: e.trap ? {
      ...e.trap,
      damage: Math.floor(e.trap.damage * mult),
      avoidDC: Math.max(8, Math.floor(e.trap.avoidDC + (difficulty === 'legend' ? 2 : difficulty === 'hero' ? 1 : 0))),
    } : e.trap,
  }));

  const party = createParty(partyPlayers);

  return {
    id: `session-${Date.now()}`,
    title,
    description,
    difficulty,
    dmName,
    dmVoiceURI,
    cefrLevel,
    events,
    party,
    currentEventIndex: 0,
    phase: 'character-select',
    totalRooms: events.length,
    createdAt: Date.now(),
    customJson,
  };
}

// ─────────────────────────────────────────────────────────────
//  18) PROMPT BUILDER (AI instructions for unique campaigns)
// ─────────────────────────────────────────────────────────────

export function buildContentPrompt(opts: {
  topic: string;
  cefrLevel: CEFRLevel;
  numRooms: number;
  tone: string;
  learnerAge: string;
  learnerInterests: string;
  // Optional: include the full party dossier so the AI can personalize directly
  partyProfiles?: Array<{
    name: string;
    class: PlayerClass;
    gender: Gender;
    luck: number;
    isNPC?: boolean;
    dossier: PlayerDossier;
    npc?: NPCPlayerProfile;
  }>;
}): string {
  const o = opts;
  return `You are an expert Dungeon Master designing a HIGH-ADRENALINE D&D survival campaign for an online class.

GOAL:
- This is a DECISION-MAKING RPG, not a quiz.
- Players make survival decisions in a coherent story.
- There is suspense, risk of death, betrayal twists, and meaningful consequences.
- Vocabulary difficulty and sentence complexity should match CEFR ${o.cefrLevel}.

LEARNER PROFILE:
- CEFR: ${o.cefrLevel}
- Age group: ${o.learnerAge}
- Interests: ${o.learnerInterests}
- Theme focus: ${o.topic}
- Tone: ${o.tone}

PARTY DOSSIER (MUST PERSONALIZE TO THESE PROFILES):
${o.partyProfiles && o.partyProfiles.length > 0
  ? o.partyProfiles.map((p, i) => {
      const d = p.dossier;
      const npc = p.isNPC ? `\n  NPC Agenda: ${p.npc?.agenda || ''}\n  NPC Traits: ${(p.npc?.traits || []).join(', ')}\n  NPC Goals: ${(p.npc?.goals || []).join(', ')}\n  NPC Rivalries: ${(p.npc?.rivalries || []).join(', ')}\n  NPC Trust: ${p.npc?.trust ?? 50}/100\n  NPC Dialogue Samples: ${(p.npc?.dialogueBank?.onLoot || []).slice(0,2).join(' | ')}` : '';
      return `PLAYER ${i + 1}:
- Name: ${p.name}
- Class: ${p.class}
- Gender: ${p.gender}
- Luck (0-10): ${p.luck}
- Appearance: ${d.appearance}
- Hometown/Culture: ${d.hometown} / ${d.culture}
- Interests: ${d.interests.join(', ')}
- Strengths: ${d.strengths.join(', ')}
- Fears: ${d.fears.join(', ')}
- Signature phrases: ${d.signaturePhrases.join(' | ')}
- Secret: ${d.secret}${npc}`;
    }).join('\n\n')
  : '(No party profiles provided — create generic profiles)'}

MULTIPLAYER REQUIREMENTS: 
- Party size 1–4.
- Add scenes where the party must decide together (voting), and at least ONE scene where a betrayal or PvP decision is possible.
- Sometimes a player can side with an enemy to survive (twisted moral choices).

GAME DESIGN REQUIREMENTS (make it UNIQUE each generation):
- Decide and include gameplay parameters in JSON: recommended timeLimitSec per room/choice, difficulty scaling notes.
- Create a coherent campaign with ${o.numRooms} rooms (events).
- Each room has 3–5 choices.
- Each choice has consequences: hpChange, goldChange, xpChange, staminaChange.
- At least 1 choice in every 2 rooms must risk DEATH.
- Include: traps, monsters, treasure, shops, rest scenes, NPCs, curses, moral dilemmas.
- Include companions/pets as rewards in some choices (addCompanion object) with perks and stat bonuses.
- Include shops with items across rarities: common/rare/epic/legendary.
- Include a final BOSS room.

ITEMS:
- Create items with rarity tiers and flashy emoji.
- Items can heal, shield, revive, cure poison, boost stats, or grant luck/rerolls.

OUTPUT JSON SCHEMA:
{
  "title": "Campaign Name",
  "description": "Campaign description",
  "difficulty": "adventurer",
  "cefrLevel": "${o.cefrLevel}",
  "events": [
    {
      "id": "ev01",
      "kind": "narrative|trap|monster|treasure|rest|merchant|boss|jumpscare|ambush|puzzle|moral|curse|npc|sacrifice|betrayal|vote",
      "chapter": 1,
      "title": "Room Title",
      "imageKey": "dungeon-bg|trap-room|monster-encounter|treasure|dragon|potion-herbs",
      "narration": "Long, dramatic DM narration (minimum 4 sentences).",
      "timeLimitSec": 45,
      "partyTwist": { "canBetray": true, "canSideWithEnemy": true, "voteRequired": false },
      "dmReaction": {
        "onEnter": "DM line on entering",
        "onGoodOutcome": "DM line on good outcome",
        "onBadOutcome": "DM line on bad outcome",
        "onDeath": "DM line on death"
      },
      "monster": { "name": "...", "description": "...", "hp": 120, "attackDamage": 35, "lootGold": 40, "lootXP": 80, "weaknessHint": "...", "imageKey": "monster-encounter", "isBoss": false, "bossAbility": "...", "loot": { /* LootItem */ } },
      "merchant": { "name": "...", "greeting": "...", "imageKey": "potion-herbs", "items": [ /* LootItem */ ] },
      "treasure": { "name": "...", "description": "...", "gold": 60, "xp": 100, "loot": { /* LootItem */ }, "imageKey": "treasure" },
      "trap": { "name": "...", "description": "...", "damage": 40, "avoidStat": "dex", "avoidDC": 14, "imageKey": "trap-room" },
      "choices": [
        {
          "id": "c1a",
          "label": "Choice label",
          "emoji": "⚔️",
          "description": "Short description",
          "outcome": "good|bad|neutral|death|jackpot",
          "applyTo": "party|active|target",
          "requiresTargetPlayer": false,
          "hpChange": -20,
          "goldChange": 10,
          "xpChange": 50,
          "staminaChange": -5,
          "skillCheck": { "stat": "dex", "dc": 14 },
          "stealGoldFromTarget": 0,
          "giftGoldToTarget": 0,
          "poison": { "dmgPerRoom": 5, "durationRooms": 3 },
          "curse": false,
          "grantsItem": { "id": "...", "name": "...", "emoji": "🧪", "rarity": "rare", "description": "...", "perks": ["..."], "effect": "heal", "value": 60, "sellPrice": 20 },
          "addCompanion": { "id": "pet-wolf", "name": "Ash-Wolf Pup", "emoji": "🐺", "rarity": "rare", "role": "pet", "description": "...", "perks": ["..."], "bonus": {"dex": 1}, "passive": {"trapWarnChance": 0.1} },
          "outcomeNarration": "What happens after choosing this (minimum 3 sentences).",
          "riskLevel": "safe|risky|deadly",
          "timeLimitSec": 30
        }
      ]
    }
  ]
}

SPECIAL PLACEHOLDERS YOU MAY USE IN NARRATION (OPTIONAL):
- {actor}, {target}
- {actor_he}/{actor_him}/{actor_his} and capitalized variants {actor_He}/{actor_Him}/{actor_His}
- {target_he}/{target_him}/{target_his} and capitalized variants
These placeholders will be replaced in-game based on each player’s selected gender.

IMPORTANT:
- Make this campaign unique by randomizing monsters, hazards, NPC motives, loot themes, romance/jealousy hooks, and betrayal situations.
- Decide gameplay parameters each time: timeLimitSec per room and sometimes timeLimitSec per choice.
- Include unique items and companions (you can invent them) with rarity tiers and clear perks.
- Keep the story coherent end-to-end.
- Keep the language level consistent with CEFR ${o.cefrLevel}.
`;
}

export const SAMPLE_JSON_TEMPLATE = `{
  "title": "The Candlelit Catacombs",
  "description": "A twisted survival run where the dungeon tempts the party to betray each other.",
  "difficulty": "adventurer",
  "cefrLevel": "B1",
  "events": [
    {
      "id": "ev01",
      "kind": "narrative",
      "chapter": 1,
      "title": "A Door That Breathes",
      "imageKey": "dungeon-bg",
      "narration": "The door is not made of wood. It is made of something that looks like bone and leather. It moves like it is breathing. The air smells of cold metal and old smoke. You feel the dungeon noticing you.",
      "timeLimitSec": 45,
      "dmReaction": {
        "onEnter": "Welcome. The catacombs are awake.",
        "onGoodOutcome": "Smart. You are learning how this place thinks.",
        "onBadOutcome": "Ouch. The catacombs just took a piece of you.",
        "onDeath": "Your story ends as the door closes behind you."
      },
      "choices": [
        {
          "id": "c1a",
          "label": "Touch the door and listen",
          "emoji": "👂",
          "description": "Try to understand what it wants.",
          "outcome": "good",
          "applyTo": "active",
          "requiresTargetPlayer": false,
          "hpChange": 0,
          "goldChange": 0,
          "xpChange": 60,
          "staminaChange": -5,
          "skillCheck": { "stat": "wis", "dc": 12 },
          "outcomeNarration": "You place your palm on the door. It is warm. You hear a faint rhythm, like a heartbeat. The door relaxes, and a safe path opens.",
          "failNarration": "The door goes still under your hand — and then it bites. Something in the wood takes a piece of you before you pull away. The passage stays shut, and the dark laughs at the noise you made.",
          "riskLevel": "risky"
        }
      ]
    }
  ]
}`;
