import type { GameState, Learner, Item, Quest, TutorProfile, CefrLevel } from '../types';

export const CAREER_RANKS = [
  { rank: 1, title: 'Street Rat', emoji: '🐀', xpRequired: 0, mafiaTitles: 'Street Rat', werewolfTitle: 'Pup' },
  { rank: 2, title: 'Associate', emoji: '🃏', xpRequired: 100, mafiaTitles: 'Associate', werewolfTitle: 'Scout' },
  { rank: 3, title: 'Soldier', emoji: '🔫', xpRequired: 300, mafiaTitles: 'Soldier', werewolfTitle: 'Beta Wolf' },
  { rank: 4, title: 'Capo', emoji: '🕴️', xpRequired: 600, mafiaTitles: 'Capo', werewolfTitle: 'Pack Hunter' },
  { rank: 5, title: 'Underboss', emoji: '💼', xpRequired: 1000, mafiaTitles: 'Underboss', werewolfTitle: 'Pack Guardian' },
  { rank: 6, title: 'Consigliere', emoji: '🎩', xpRequired: 1500, mafiaTitles: 'Consigliere', werewolfTitle: 'Elder' },
  { rank: 7, title: 'Don', emoji: '👑', xpRequired: 2200, mafiaTitles: 'Don', werewolfTitle: 'Alpha' },
  { rank: 8, title: 'Godfather', emoji: '💎', xpRequired: 3000, mafiaTitles: 'Godfather', werewolfTitle: 'Alpha Supreme' },
  { rank: 9, title: 'Legend', emoji: '🌟', xpRequired: 4000, mafiaTitles: 'Legend', werewolfTitle: 'Immortal Wolf' },
  { rank: 10, title: 'Syndicate Lord', emoji: '🏆', xpRequired: 5000, mafiaTitles: 'Syndicate Lord', werewolfTitle: 'Moonborn God' },
];

export const getCareerRank = (xp: number) => {
  let rank = CAREER_RANKS[0];
  for (const r of CAREER_RANKS) { if (xp >= r.xpRequired) rank = r; else break; }
  return rank;
};

export const createCombatLearner = (
  id: string, name: string, emoji: string, roleId: string, lvl: number,
  xp: number, coins: number, cefr: CefrLevel, notes: string, dialogue: string
): Learner => ({
  id, name, emoji,
  portraitUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${name}`,
  currentRoleId: roleId, weeklyRoleLevel: lvl,
  careerXp: xp, coins,
  inventory: [], questIds: [], battleHistory: [], vendettaTargets: [],
  voiceCards: [{ id: `vc_${id}`, text: dialogue, voiceName: '', pitch: 1, rate: 1, emoji, label: 'Introduction' }],
  isAlive: true, isGhost: false,
  weeklyKills: 0, weeklySaves: 0, weeklyCorrectAnswers: Math.floor(Math.random() * 8) + 1,
  bonusAtk: Math.floor(xp / 100), bonusDef: Math.floor(xp / 150),
  tutorNotes: notes, achievements: [],
  cefrLevel: cefr,
  goals: '', lessonNotes: '', currentLesson: '',
  learnerVoice: '',
});

export const INITIAL_LEARNERS: Learner[] = [];

export const INITIAL_ITEMS: Item[] = [
  { id: 'item1', name: 'Tommy Gun', emoji: '🔫', rarity: 'rare', cost: 150, stock: 5, atk: 25, def: 0, vendettaDebuff: 0, description: 'Classic Syndicate weapon.', theme: 'mafia' },
  { id: 'item2', name: 'Bulletproof Fedora', emoji: '🎩', rarity: 'epic', cost: 300, stock: 3, atk: 0, def: 30, vendettaDebuff: 0, description: 'Stops bullets in style.', theme: 'mafia' },
  { id: 'item3', name: 'Marked Card', emoji: '🃏', rarity: 'common', cost: 50, stock: 10, atk: 5, def: 0, vendettaDebuff: 10, description: 'A warning from the Syndicate.', theme: 'mafia' },
  { id: 'item4', name: 'Syndicate Ring', emoji: '💍', rarity: 'legendary', cost: 800, stock: 1, atk: 20, def: 20, vendettaDebuff: 0, description: 'Symbol of ultimate power.', theme: 'mafia' },
  { id: 'item5', name: 'Moonstone Amulet', emoji: '🌙', rarity: 'epic', cost: 350, stock: 3, atk: 0, def: 35, vendettaDebuff: 0, description: 'Protects under the full moon.', theme: 'werewolf' },
  { id: 'item6', name: 'Wolf Fang Dagger', emoji: '🗡️', rarity: 'rare', cost: 200, stock: 4, atk: 30, def: 0, vendettaDebuff: 0, description: 'Forged from a fallen Alpha fang.', theme: 'werewolf' },
  { id: 'item7', name: 'Forest Cloak', emoji: '🌿', rarity: 'common', cost: 60, stock: 8, atk: 0, def: 8, vendettaDebuff: 0, description: 'Blend into the shadows.', theme: 'werewolf' },
  { id: 'item8', name: 'Rune Armor', emoji: '🛡️', rarity: 'legendary', cost: 900, stock: 1, atk: 15, def: 40, vendettaDebuff: 0, description: 'Ancient wolf runes. Ultimate defense.', theme: 'werewolf' },
];

export const INITIAL_QUESTS: Quest[] = [
  {
    id: 'q1', title: 'The First Contract', description: 'Prove your knowledge.',
    emoji: '📋', type: 'weekly',
    steps: [
      { id: 'qs1', title: 'Attend Briefing', description: 'Participate in opening lesson.', completed: false, reward: { xp: 20, coins: 10 } },
      { id: 'qs2', title: 'First Answer', description: 'Answer correctly in battle.', completed: false, reward: { xp: 30, coins: 15 } },
      { id: 'qs3', title: 'Survive', description: 'Remain alive through one round.', completed: false, reward: { xp: 50, coins: 25 } },
    ],
    totalXp: 100, totalCoins: 50, completed: false,
    assignedTo: ['l1','l2','l3','l4','l5','l6','l7','l8','l9','l10'],
  },
];

export const INITIAL_TUTOR_PROFILE: TutorProfile = {
  name: 'Don Linguistica', emoji: '🧙‍♂️', subject: 'Business English',
  voiceName: '', signatureSound: 'chime',
  dialogueCards: [
    { id: 'td1', text: 'Welcome to the arena, operatives. Tonight, only the sharpest minds survive.', voiceName: '', pitch: 0.8, rate: 0.9, emoji: '🎭', label: 'Opening' },
    { id: 'td2', text: 'Excellent answer! The Syndicate is pleased.', voiceName: '', pitch: 0.85, rate: 0.95, emoji: '💰', label: 'Reward' },
    { id: 'td3', text: 'Incorrect. You have failed the Syndicate. Try again.', voiceName: '', pitch: 0.75, rate: 0.9, emoji: '💀', label: 'Penalty' },
    { id: 'td4', text: 'The battle begins. May the sharpest tongue prevail!', voiceName: '', pitch: 0.8, rate: 1.0, emoji: '⚔️', label: 'Battle Start' },
  ],
  bio: 'Ruler of Combat Arena. The Don of learning.', theme: 'mafia',
  favorTokens: 10, totalBattlesRun: 0, totalAirdropsLaunched: 0,
};

export const INITIAL_GAME_STATE: GameState = {
  theme: 'mafia', phase: 'day', weekNumber: 1, dayNumber: 1,
  tutorProfile: INITIAL_TUTOR_PROFILE,
  learners: INITIAL_LEARNERS, roles: [], items: INITIAL_ITEMS, quests: INITIAL_QUESTS,
  battleHistory: [], airdropHistory: [],
  activeNav: 'dashboard', selectedLearnerId: null,
  isBattleRunning: false, showSplash: true, easterEggVault: [],
};
