// ============================================================
// COMBAT ARENA — SUPER DETAILED AI PROMPT GENERATORS
// ============================================================

import type { GameState, Learner } from '../types';
import { ALL_ROLES } from '../data/roles';

// Generate the SUPER detailed narration prompt with ALL game data
export function generateMasterNarrationPrompt(state: GameState): string {
  const theme = state.theme === 'mafia' ? 'Mafia Syndicate (noir crime thriller)' : 'Werewolf Pack (dark fantasy horror)';
  const themeRoles = ALL_ROLES.filter(r => r.theme === state.theme);
  
  const learnerDetails = state.learners.map(l => {
    const role = ALL_ROLES.find(r => r.id === l.currentRoleId);
    return `
  - ${l.emoji} ${l.name}:
    • Role: ${role?.name || 'Unknown'} (${role?.emoji || '?'})
    • Faction: ${role?.faction || 'unknown'}
    • Weekly Level: ${l.weeklyRoleLevel}/10
    • Career XP: ${l.careerXp}
    • Credits: ${l.coins}
    • ATK/DEF Bonus: +${l.bonusAtk}/+${l.bonusDef}
    • Status: ${l.isAlive ? 'ALIVE' : 'ELIMINATED'}
    • Weekly Stats: ${l.weeklyKills} kills, ${l.weeklySaves} saves, ${l.weeklyCorrectAnswers} correct answers
    • Inventory: ${l.inventory.length} items
    • Vendetta Targets: ${l.vendettaTargets.length > 0 ? l.vendettaTargets.join(', ') : 'None'}
    • Tutor Notes: "${l.tutorNotes}"`;
  }).join('\n');

  const rolesByFaction = {
    town: themeRoles.filter(r => r.faction === 'town' || r.faction === 'village'),
    evil: themeRoles.filter(r => r.faction === 'mafia' || r.faction === 'werewolves'),
    neutral: themeRoles.filter(r => r.faction === 'neutral' || r.faction === 'lonewolves'),
  };

  return `
═══════════════════════════════════════════════════════════════
COMBAT ARENA — MASTER NARRATION & GAME DATA PROMPT
═══════════════════════════════════════════════════════════════

GAME OVERVIEW:
- Theme: ${theme}
- Week: ${state.weekNumber}
- Phase: ${state.phase.toUpperCase()}
- Teaching Subject: ${state.tutorProfile.subject}

GOD (TUTOR) PROFILE:
- Name: ${state.tutorProfile.emoji} ${state.tutorProfile.name}
- Title: Supreme Game Master
- Battles Run: ${state.tutorProfile.totalBattlesRun}
- Airdrops Sent: ${state.tutorProfile.totalAirdropsLaunched}
- Favor Tokens: ${state.tutorProfile.favorTokens}

═══════════════════════════════════════════════════════════════
ALL LEARNERS (${state.learners.length} operatives):
═══════════════════════════════════════════════════════════════
${learnerDetails}

═══════════════════════════════════════════════════════════════
AVAILABLE ROLES (${themeRoles.length} total in ${state.theme} theme):
═══════════════════════════════════════════════════════════════

INNOCENTS/VILLAGE (7 roles):
${rolesByFaction.town.map(r => `  ${r.emoji} ${r.name}: ${r.ability} | Lv5 Perk: "${r.level5PerkName}" - ${r.level5PerkDesc}`).join('\n')}

MAFIA/WEREWOLVES (7 roles):
${rolesByFaction.evil.map(r => `  ${r.emoji} ${r.name}: ${r.ability} | Lv5 Perk: "${r.level5PerkName}" - ${r.level5PerkDesc}`).join('\n')}

NEUTRALS/LONE WOLVES (7 roles):
${rolesByFaction.neutral.map(r => `  ${r.emoji} ${r.name}: ${r.ability} | Lv5 Perk: "${r.level5PerkName}" - ${r.level5PerkDesc}`).join('\n')}

═══════════════════════════════════════════════════════════════
ACTIVE QUESTS (${state.quests.length}):
═══════════════════════════════════════════════════════════════
${state.quests.map(q => `  ${q.emoji} ${q.title} (${q.type}): ${q.steps.filter(s => s.completed).length}/${q.steps.length} complete | +${q.totalXp} XP, +${q.totalCoins} Credits`).join('\n') || 'No active quests'}

═══════════════════════════════════════════════════════════════
SHOP ITEMS (${state.items.length}):
═══════════════════════════════════════════════════════════════
${state.items.filter(i => i.theme === state.theme).map(i => `  ${i.emoji} ${i.name} (${i.rarity}): ${i.cost} credits | ATK+${i.atk}, DEF+${i.def} | Stock: ${i.stock}`).join('\n')}

═══════════════════════════════════════════════════════════════
BATTLE HISTORY (${state.battleHistory.length} battles):
═══════════════════════════════════════════════════════════════
${state.battleHistory.slice(0, 5).map(b => `  Battle #${b.id.slice(-4)}: ${b.events.length} events, Winner: ${b.winner || 'Unknown'}`).join('\n') || 'No battles yet'}

═══════════════════════════════════════════════════════════════
TASK: Generate a comprehensive narration JSON for the God character to read aloud.

Return ONLY valid JSON in this exact format:
{
  "narrations": {
    "welcome": "A dramatic 2-3 sentence welcome announcement for when the game starts.",
    "roleReveal": "Suspenseful narration for when roles are assigned to learners.",
    "dayStart": "Atmospheric narration for the start of each day phase.",
    "nightStart": "Ominous narration for when night falls.",
    "battleStart": "Epic battle announcement narration.",
    "battleEnd": "Dramatic conclusion narration summarizing the battle.",
    "airdropAnnounce": "Exciting announcement when an airdrop arrives.",
    "questComplete": "Celebratory narration when a quest is completed.",
    "elimination": "Somber narration when a learner is eliminated.",
    "victory": "Grand victory announcement for the winning team.",
    "weeklyRecap": "Summary narration recapping the week's events."
  },
  "learnerIntros": [
    {
      "learnerId": "learner_id_here",
      "intro": "A personalized dramatic introduction for this specific learner based on their role and stats."
    }
  ],
  "weeklyStory": {
    "title": "A dramatic title for this week's story arc",
    "synopsis": "A 3-4 sentence overview of the dramatic tension this week.",
    "nightEvents": [
      {
        "night": 1,
        "events": "Detailed narrative of what happens on night 1 based on roles and abilities.",
        "casualties": ["list of learner IDs who might be eliminated"],
        "missions": ["learning missions for survivors"]
      }
    ]
  }
}

Make all narrations dramatic, suspenseful, and themed to ${theme}.
Reference specific learners by name for personalization.
Include learning tie-ins related to: ${state.tutorProfile.subject}
`.trim();
}

// Generate war/battle simulation prompt
export function generateWarSimulationPrompt(state: GameState): string {
  const aliveLearners = state.learners.filter(l => l.isAlive);
  const theme = state.theme === 'mafia' ? 'Mafia Syndicate' : 'Werewolf Pack';

  const learnerStats = aliveLearners.map(l => {
    const role = ALL_ROLES.find(r => r.id === l.currentRoleId);
    return `  ${l.emoji} ${l.name} | Role: ${role?.emoji} ${role?.name} | Faction: ${role?.faction} | Lv.${l.weeklyRoleLevel} | XP:${l.careerXp} | ATK+${l.bonusAtk} DEF+${l.bonusDef} | Coins:${l.coins}`;
  }).join('\n');

  return `
═══════════════════════════════════════════════════════════════
COMBAT ARENA — WAR SIMULATION PROMPT
═══════════════════════════════════════════════════════════════

CONTEXT:
- Theme: ${theme}
- Week: ${state.weekNumber}
- Subject: ${state.tutorProfile.subject}
- God/Tutor: ${state.tutorProfile.emoji} ${state.tutorProfile.name}

ALIVE OPERATIVES (${aliveLearners.length}):
${learnerStats}

FACTION BREAKDOWN:
- Town/Village: ${aliveLearners.filter(l => { const r = ALL_ROLES.find(ro => ro.id === l.currentRoleId); return r?.faction === 'town' || r?.faction === 'village'; }).length}
- Mafia/Wolves: ${aliveLearners.filter(l => { const r = ALL_ROLES.find(ro => ro.id === l.currentRoleId); return r?.faction === 'mafia' || r?.faction === 'werewolves'; }).length}
- Neutrals: ${aliveLearners.filter(l => { const r = ALL_ROLES.find(ro => ro.id === l.currentRoleId); return r?.faction === 'neutral' || r?.faction === 'lonewolves'; }).length}

TASK: Simulate a full week of nightly conflicts based on roles and abilities.

Return ONLY valid JSON:
{
  "simulation": {
    "weekTitle": "Dramatic title for this week's war",
    "nights": [
      {
        "night": 1,
        "narrative": "Detailed story of what happens this night (3-5 sentences).",
        "actions": [
          {
            "actor": "learner_id",
            "actorName": "Name",
            "action": "what they did",
            "target": "target_learner_id or null",
            "targetName": "Target Name or null",
            "result": "outcome description",
            "blocked": false,
            "saved": false
          }
        ],
        "eliminations": ["learner_ids who died"],
        "learningMissions": [
          {
            "learnerId": "id",
            "mission": "A ${state.tutorProfile.subject}-related task they must complete to survive"
          }
        ]
      }
    ],
    "finalResult": {
      "winningFaction": "town/mafia/neutral etc",
      "survivors": ["learner_ids"],
      "mvp": "learner_id of most valuable player",
      "storyConclusion": "Epic conclusion paragraph"
    }
  }
}
`.trim();
}

// Generate airdrop content prompt
export function generateAirdropPrompt(state: GameState): string {
  return `
Generate a dramatic airdrop event for Combat Arena (${state.theme === 'mafia' ? 'Mafia Syndicate' : 'Werewolf Pack'} theme).

Teaching Subject: ${state.tutorProfile.subject}
Week: ${state.weekNumber}
Active Learners: ${state.learners.filter(l => l.isAlive).map(l => `${l.emoji} ${l.name}`).join(', ')}

Return JSON:
{
  "airdrop": {
    "title": "Dramatic event name",
    "narrative": "3-4 sentences of suspenseful narration for God to read aloud.",
    "item": {
      "name": "Item name",
      "emoji": "📦",
      "rarity": "common|rare|epic|legendary",
      "atk": 10,
      "def": 5,
      "description": "Item description"
    },
    "xpReward": 50,
    "coinReward": 25,
    "learningChallenge": "A ${state.tutorProfile.subject} question or task learners must complete to claim"
  }
}
`.trim();
}

// Generate quest/mission prompt
export function generateQuestPrompt(state: GameState, questCount: number = 5): string {
  return `
Generate a winding road quest map for Combat Arena.

Theme: ${state.theme === 'mafia' ? 'Mafia Syndicate' : 'Werewolf Pack'}
Subject: ${state.tutorProfile.subject}
Learners: ${state.learners.map(l => `${l.emoji} ${l.name}`).join(', ')}

Create ${questCount} connected missions on a winding path.

Return JSON:
{
  "questMap": {
    "title": "Epic quest arc title",
    "description": "Overview of the quest journey",
    "emoji": "🗺️",
    "totalXp": 500,
    "totalCoins": 250,
    "milestones": [
      {
        "id": "m1",
        "position": 1,
        "title": "Milestone name",
        "description": "What learners must do (${state.tutorProfile.subject} task)",
        "emoji": "⚔️",
        "xpReward": 50,
        "coinReward": 25,
        "learningTask": "Specific learning activity"
      }
    ],
    "completionNarration": "God's epic speech when quest is complete"
  }
}
`.trim();
}

// Generate dialogue cards for a learner
export function generateLearnerDialoguePrompt(learner: Learner, state: GameState): string {
  const role = ALL_ROLES.find(r => r.id === learner.currentRoleId);
  return `
Generate dramatic dialogue cards for learner character:

Character: ${learner.emoji} ${learner.name}
Role: ${role?.emoji} ${role?.name} (${role?.faction})
Theme: ${state.theme === 'mafia' ? 'Mafia Syndicate noir' : 'Werewolf Pack dark fantasy'}
Subject: ${state.tutorProfile.subject}

Return JSON with 6 dialogue cards:
{
  "dialogueCards": [
    {
      "label": "Introduction",
      "text": "Character's dramatic self-introduction (2 sentences)",
      "emoji": "${learner.emoji}",
      "mood": "confident"
    },
    {
      "label": "Accusation",
      "text": "Accusing another player",
      "emoji": "😠",
      "mood": "aggressive"
    },
    {
      "label": "Defense",
      "text": "Defending themselves from accusation",
      "emoji": "😰",
      "mood": "nervous"
    },
    {
      "label": "Victory",
      "text": "Celebrating a win",
      "emoji": "🎉",
      "mood": "triumphant"
    },
    {
      "label": "Defeat",
      "text": "Upon elimination",
      "emoji": "💀",
      "mood": "dramatic"
    },
    {
      "label": "Learning",
      "text": "Commenting on ${state.tutorProfile.subject} lesson",
      "emoji": "📚",
      "mood": "thoughtful"
    }
  ]
}
`.trim();
}
