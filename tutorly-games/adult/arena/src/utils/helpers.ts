import type { Rarity, Theme, Faction } from '../types';

export const RARITY_CONFIG: Record<Rarity, { label: string; color: string; glow: string; border: string; bg: string }> = {
  common: {
    label: 'Common',
    color: 'text-gray-300',
    glow: 'shadow-gray-400/30',
    border: 'border-gray-400/40',
    bg: 'from-gray-700/50 to-gray-800/50',
  },
  rare: {
    label: 'Rare',
    color: 'text-blue-300',
    glow: 'shadow-blue-500/50',
    border: 'border-blue-400/60',
    bg: 'from-blue-900/60 to-blue-800/40',
  },
  epic: {
    label: 'Epic',
    color: 'text-purple-300',
    glow: 'shadow-purple-500/60',
    border: 'border-purple-400/70',
    bg: 'from-purple-900/70 to-purple-800/50',
  },
  legendary: {
    label: 'Legendary',
    color: 'text-yellow-300',
    glow: 'shadow-yellow-400/70',
    border: 'border-yellow-400/80',
    bg: 'from-yellow-900/60 to-amber-800/50',
  },
};

export const RARITY_BADGE: Record<Rarity, string> = {
  common: '⚪',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟡',
};

export const FACTION_CONFIG: Record<Faction, { label: string; color: string; bg: string; theme: Theme }> = {
  town: { label: 'The Innocents', color: 'text-blue-300', bg: 'bg-blue-900/40', theme: 'mafia' },
  mafia: { label: 'The Mafia', color: 'text-red-300', bg: 'bg-red-900/40', theme: 'mafia' },
  neutral: { label: 'The Neutrals', color: 'text-gray-300', bg: 'bg-gray-800/40', theme: 'mafia' },
  village: { label: 'The Village', color: 'text-green-300', bg: 'bg-green-900/40', theme: 'werewolf' },
  werewolves: { label: 'The Werewolves', color: 'text-orange-300', bg: 'bg-orange-900/40', theme: 'werewolf' },
  lonewolves: { label: 'The Lone Wolves', color: 'text-purple-300', bg: 'bg-purple-900/40', theme: 'werewolf' },
};

export const THEME_CONFIG = {
  mafia: {
    name: 'Mafia Syndicate',
    emoji: '🎭',
    bg: 'from-[#0a0a1a] via-[#1a0a0a] to-[#0a0a0a]',
    accent: 'red',
    headerBg: 'bg-gradient-to-r from-red-950/80 via-gray-900/90 to-red-950/80',
    cardBg: 'bg-gradient-to-br from-gray-900/90 to-red-950/50',
    neonColor: '#ff2222',
    particleColor: '#cc0000',
    ambientSound: 'city-rain',
    factions: ['town', 'mafia', 'neutral'] as Faction[],
    teamNames: ['The Innocents', 'The Mafia', 'The Neutrals'],
  },
  werewolf: {
    name: 'Werewolf Pack',
    emoji: '🐺',
    bg: 'from-[#0a1a0a] via-[#0a0a1a] to-[#0a0a0a]',
    accent: 'green',
    headerBg: 'bg-gradient-to-r from-green-950/80 via-gray-900/90 to-green-950/80',
    cardBg: 'bg-gradient-to-br from-gray-900/90 to-green-950/50',
    neonColor: '#22ff44',
    particleColor: '#00aa22',
    ambientSound: 'forest-night',
    factions: ['village', 'werewolves', 'lonewolves'] as Faction[],
    teamNames: ['The Village', 'The Werewolves', 'The Lone Wolves'],
  },
};

export const CAREER_RANK_TITLES = [
  { rank: 1, mafia: 'Street Rat 🐀', wolf: 'Pup 🐾', xp: 0 },
  { rank: 2, mafia: 'Associate 🃏', wolf: 'Scout 🌿', xp: 100 },
  { rank: 3, mafia: 'Soldier 🔫', wolf: 'Beta Wolf 🐺', xp: 300 },
  { rank: 4, mafia: 'Capo 🕴️', wolf: 'Pack Hunter 🏹', xp: 600 },
  { rank: 5, mafia: 'Underboss 💼', wolf: 'Pack Guardian 🛡️', xp: 1000 },
  { rank: 6, mafia: 'Consigliere 🎩', wolf: 'Elder 🧙‍♂️', xp: 1500 },
  { rank: 7, mafia: 'Don 👑', wolf: 'Alpha 🐺👑', xp: 2200 },
  { rank: 8, mafia: 'Godfather 💎', wolf: 'Alpha Supreme 🌕', xp: 3000 },
  { rank: 9, mafia: 'Legend 🌟', wolf: 'Immortal Wolf ✨', xp: 4000 },
  { rank: 10, mafia: 'Syndicate Lord 🏆', wolf: 'Moonborn God 🌑', xp: 5000 },
];

export function getCareerRank(xp: number, theme: Theme) {
  let rank = CAREER_RANK_TITLES[0];
  for (const r of CAREER_RANK_TITLES) {
    if (xp >= r.xp) rank = r;
    else break;
  }
  return theme === 'mafia' ? rank.mafia : rank.wolf;
}

export function getCareerProgress(xp: number) {
  const ranks = CAREER_RANK_TITLES;
  let currentRankIdx = 0;
  for (let i = 0; i < ranks.length; i++) {
    if (xp >= ranks[i].xp) currentRankIdx = i;
    else break;
  }
  const current = ranks[currentRankIdx];
  const next = ranks[currentRankIdx + 1];
  if (!next) return { percent: 100, current, next: null };
  const percent = Math.min(100, ((xp - current.xp) / (next.xp - current.xp)) * 100);
  return { percent, current, next };
}

export function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

// AI PROMPT TEMPLATES
export const AI_PROMPTS = {
  itemForge: (subject: string, learners: string[], theme: string) => `
You are the AI Item Forge for Combat Arena, a gamified adult language-learning app.

CONTEXT:
- Teaching subject: ${subject}
- Universe theme: ${theme}
- Learner names: ${learners.join(', ')}

TASK:
Generate 5 unique items for the Syndicate Shop. Each item must have both a Mafia Syndicate AND Werewolf Pack version.

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "id": "unique_id_here",
      "mafia": {
        "name": "Item Name",
        "emoji": "🔫",
        "rarity": "common|rare|epic|legendary",
        "cost": 100,
        "stock": 5,
        "atk": 10,
        "def": 0,
        "vendettaDebuff": 0,
        "description": "Flavourful description in Mafia noir style."
      },
      "werewolf": {
        "name": "Wolf Version Name",
        "emoji": "🐺",
        "rarity": "common|rare|epic|legendary",
        "cost": 100,
        "stock": 5,
        "atk": 10,
        "def": 0,
        "vendettaDebuff": 0,
        "description": "Flavourful description in werewolf pack style."
      }
    }
  ]
}

Make items thematically related to: ${subject}
Ensure a variety of rarities (at least one legendary, one common).
`.trim(),

  airdrop: (subject: string, learners: string[], weekNumber: number) => `
You are the AI Airdrop Generator for Combat Arena.

CONTEXT:
- Teaching subject: ${subject}
- Week: ${weekNumber}
- Learners: ${learners.join(', ')}

TASK:
Generate a dramatic airdrop event with one item reward and a learning challenge.

Return ONLY valid JSON:
{
  "airdrop": {
    "title": "Airdrop Event Name",
    "narrative": "2-3 sentences of dramatic in-universe story.",
    "item": {
      "name": "Item Name",
      "emoji": "📦",
      "rarity": "common|rare|epic|legendary",
      "atk": 0,
      "def": 0,
      "description": "Item description."
    },
    "xpReward": 50,
    "coinReward": 25,
    "challenge": "One sentence describing the learning challenge to claim the airdrop.",
    "tutorHint": "A hint for the tutor about how to deliver this challenge."
  }
}
`.trim(),

  quest: (subject: string, learners: string[], theme: string, month: number) => `
You are the Quest Designer for Combat Arena.

CONTEXT:
- Teaching subject: ${subject}
- Universe: ${theme}
- Month: ${month}
- Learners: ${learners.join(', ')}

TASK:
Design a complete Monthly Epic Quest with 4-6 steps.

Return ONLY valid JSON:
{
  "quest": {
    "title": "Epic Quest Title",
    "description": "2-3 sentences of epic narrative.",
    "emoji": "⚔️",
    "steps": [
      {
        "id": "step1",
        "title": "Step Title",
        "description": "What learners must do (learning activity description).",
        "reward": { "xp": 50, "coins": 25 }
      }
    ],
    "totalXp": 300,
    "totalCoins": 150,
    "completionNarrative": "Epic text revealed when quest is complete."
  }
}
`.trim(),

  battleStory: (events: string[], winner: string, theme: string, subject: string) => `
You are the Battle Chronicler for Combat Arena.

CONTEXT:
- Universe: ${theme}
- Teaching subject: ${subject}
- Winner: ${winner}
- Battle Events: ${events.join(' | ')}

TASK:
Write an epic illustrated battle chronicle.

Return ONLY valid JSON:
{
  "story": {
    "title": "Chronicle Title",
    "chapters": [
      {
        "heading": "Chapter 1: The Opening",
        "text": "2-3 sentences of dramatic narrative.",
        "emoji": "⚔️"
      }
    ],
    "epilogue": "A closing statement about what was learned.",
    "learningMoment": "One sentence highlighting the key language/subject point demonstrated."
  }
}
`.trim(),

  dialogueCards: (subject: string, tutorName: string, theme: string, count: number) => `
You are generating Tutor Dialogue Cards for Combat Arena.

CONTEXT:
- Tutor name: ${tutorName}
- Teaching subject: ${subject}
- Universe: ${theme}

TASK:
Generate ${count} dramatic tutor dialogue cards for various game moments.

Return ONLY valid JSON:
{
  "cards": [
    {
      "label": "Card Label (e.g. Opening, Reward, Penalty, Battle Start)",
      "text": "The exact dialogue text the tutor will speak.",
      "emoji": "🎭",
      "pitch": 0.9,
      "rate": 0.95
    }
  ]
}

Make each card dramatic, in-universe, and tied to the teaching subject: ${subject}.
`.trim(),
};
