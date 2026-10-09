export type Theme = 'mafia' | 'werewolf';
export type Faction = 'town' | 'mafia' | 'neutral' | 'village' | 'werewolves' | 'lonewolves';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type NavTab = 'dashboard' | 'arena' | 'shop' | 'profiles' | 'tutor';

export interface Perk { level: number; name: string; description: string; emoji: string; }
export interface Role {
  id: string; name: string; emoji: string; faction: Faction; theme: Theme;
  description: string; ability: string; perks: Perk[];
  level5PerkName: string; level5PerkDesc: string;
}
export interface Item {
  id: string; name: string; emoji: string; rarity: Rarity; cost: number; stock: number;
  atk: number; def: number; vendettaDebuff: number; description: string; theme: Theme;
  mirrorItemId?: string;
}
export interface InventoryItem { itemId: string; quantity: number; equippedSlot?: 'weapon' | 'armor' | 'special'; }
export interface QuestStep {
  id: string; title: string; description: string; completed: boolean;
  reward: { xp: number; coins: number };
}
export interface Quest {
  id: string; title: string; description: string; emoji: string;
  type: 'daily' | 'weekly' | 'monthly' | 'personal';
  steps: QuestStep[]; totalXp: number; totalCoins: number;
  deadline?: string; completed: boolean; assignedTo?: string[];
}
export interface VoiceCard {
  id: string; text: string; voiceName: string; pitch: number; rate: number;
  emoji: string; label: string;
}
export interface BattleEvent {
  timestamp: string; actor: string; target?: string; action: string; result: string;
  emoji: string; xpGained?: number; coinsGained?: number;
}
export interface BattleRecord {
  id: string; date: string; theme: Theme; events: BattleEvent[];
  winner?: string; story?: string; participants: string[];
}
export interface AirdropRecord {
  id: string; date: string; item: Item; xp: number; coins: number;
  claimedBy?: string; theme: Theme;
}
export interface Learner {
  id: string;
  name: string;
  emoji: string;
  portraitUrl: string;
  currentRoleId: string;
  weeklyRoleLevel: number;
  careerXp: number;
  coins: number;
  inventory: InventoryItem[];
  questIds: string[];
  battleHistory: string[];
  vendettaTargets: string[];
  voiceCards: VoiceCard[];
  isAlive: boolean;
  isGhost: boolean;
  faction?: Faction;
  weeklyKills: number;
  weeklySaves: number;
  weeklyCorrectAnswers: number;
  bonusAtk: number;
  bonusDef: number;
  tutorNotes: string;
  achievements: string[];
  // NEW fields
  cefrLevel: CefrLevel;
  goals: string;
  lessonNotes: string;
  currentLesson: string;
  learnerVoice: string; // unique browser voice for this learner
  streak?: number;
}
export interface TutorProfile {
  name: string; emoji: string; subject: string; voiceName: string;
  signatureSound: string; dialogueCards: VoiceCard[]; bio: string;
  theme: Theme; favorTokens: number; totalBattlesRun: number;
  totalAirdropsLaunched: number;
}
export interface GameState {
  theme: Theme;
  phase: 'day' | 'night' | 'voting' | 'battle';
  weekNumber: number;
  dayNumber: number;
  tutorProfile: TutorProfile;
  learners: Learner[];
  roles: Role[];
  items: Item[];
  quests: Quest[];
  battleHistory: BattleRecord[];
  airdropHistory: AirdropRecord[];
  activeNav: NavTab;
  selectedLearnerId: string | null;
  isBattleRunning: boolean;
  showSplash: boolean;
  easterEggVault: string[];
}
