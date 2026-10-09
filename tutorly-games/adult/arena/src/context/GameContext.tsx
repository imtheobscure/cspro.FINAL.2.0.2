import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { GameState, NavTab, Theme, Learner, Item, Quest, TutorProfile, BattleRecord, AirdropRecord, VoiceCard, Role } from '../types';
import { INITIAL_GAME_STATE, createCombatLearner } from '../data/initialState';
import { ALL_ROLES, getRolesByTheme } from '../data/roles';
import { getMainAppLearners, updateMainAppXp } from '../utils/syncStore';

type Action =
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_NAV'; payload: NavTab }
  | { type: 'SELECT_LEARNER'; payload: string | null }
  | { type: 'TOGGLE_SPLASH' }
  | { type: 'UPDATE_TUTOR'; payload: Partial<TutorProfile> }
  | { type: 'ADD_LEARNER'; payload: Learner }
  | { type: 'UPDATE_LEARNER'; payload: { id: string; updates: Partial<Learner> } }
  | { type: 'REMOVE_LEARNER'; payload: string }
  | { type: 'ASSIGN_ROLES' }
  | { type: 'ADD_ITEM'; payload: Item }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<Item> } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'PURCHASE_ITEM'; payload: { learnerId: string; itemId: string } }
  | { type: 'ADD_QUEST'; payload: Quest }
  | { type: 'UPDATE_QUEST'; payload: { id: string; updates: Partial<Quest> } }
  | { type: 'COMPLETE_QUEST_STEP'; payload: { questId: string; stepId: string } }
  | { type: 'LOG_BATTLE'; payload: BattleRecord }
  | { type: 'LOG_AIRDROP'; payload: AirdropRecord }
  | { type: 'GRANT_XP'; payload: { learnerId: string; amount: number } }
  | { type: 'GRANT_COINS'; payload: { learnerId: string; amount: number } }
  | { type: 'SET_LEARNER_ALIVE'; payload: { learnerId: string; alive: boolean } }
  | { type: 'SET_BATTLE_RUNNING'; payload: boolean }
  | { type: 'LOAD_STATE'; payload: GameState }
  | { type: 'RESET_WEEKLY' }
  | { type: 'UNLOCK_EASTER_EGG'; payload: string }
  | { type: 'UPDATE_WEEK_NUMBER'; payload: number }
  | { type: 'ADD_TUTOR_DIALOGUE'; payload: VoiceCard }
  | { type: 'UPDATE_TUTOR_DIALOGUE'; payload: { id: string; updates: Partial<VoiceCard> } }
  | { type: 'REMOVE_TUTOR_DIALOGUE'; payload: string }
  | { type: 'BULK_IMPORT'; payload: BulkImportPayload }
  | { type: 'UPDATE_ROLE'; payload: { id: string; name: string; emoji: string } };

// Bulk import structure from the single mega AI prompt
export interface BulkImportPayload {
  quests?: Quest[];
  items?: Item[];
  battleRecord?: BattleRecord;
  airdrops?: AirdropRecord[];
  learnerUpdates?: { id: string; voiceCards?: VoiceCard[]; goals?: string; lessonNotes?: string }[];
  narrations?: Record<string, string>;
}

// Role overrides stored in localStorage
const ROLE_OVERRIDES_KEY = 'combat_arena_role_overrides';
function loadRoleOverrides(): Record<string, { name: string; emoji: string }> {
  try { const s = localStorage.getItem(ROLE_OVERRIDES_KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
}
function saveRoleOverrides(o: Record<string, { name: string; emoji: string }>) {
  try { localStorage.setItem(ROLE_OVERRIDES_KEY, JSON.stringify(o)); } catch {}
}
let roleOverrides = loadRoleOverrides();

// Get role with possible override
export function getOverriddenRole(id: string): Role | undefined {
  const base = ALL_ROLES.find(r => r.id === id);
  if (!base) return undefined;
  const ov = roleOverrides[id];
  if (ov) return { ...base, name: ov.name, emoji: ov.emoji };
  return base;
}

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_THEME': return { ...state, theme: action.payload };
    case 'SET_NAV': return { ...state, activeNav: action.payload };
    case 'SELECT_LEARNER': return { ...state, selectedLearnerId: action.payload };
    case 'TOGGLE_SPLASH': return { ...state, showSplash: !state.showSplash };
    case 'UPDATE_TUTOR': return { ...state, tutorProfile: { ...state.tutorProfile, ...action.payload } };
    case 'ADD_LEARNER': return { ...state, learners: [...state.learners, action.payload] };
    case 'UPDATE_LEARNER':
      return { ...state, learners: state.learners.map(l => l.id === action.payload.id ? { ...l, ...action.payload.updates } : l) };
    case 'REMOVE_LEARNER': return { ...state, learners: state.learners.filter(l => l.id !== action.payload) };

    case 'ASSIGN_ROLES': {
      const themeRoles = getRolesByTheme(state.theme);
      const shuffled = [...themeRoles].sort(() => Math.random() - 0.5);
      const updatedLearners = state.learners.map((learner, index) => {
        const assigned = shuffled[index % shuffled.length];
        const role = getOverriddenRole(assigned.id) || assigned;
        return { ...learner, currentRoleId: assigned.id, emoji: role.emoji, weeklyRoleLevel: 1, weeklyKills: 0, weeklySaves: 0, weeklyCorrectAnswers: 0, isAlive: true, isGhost: false };
      });
      return { ...state, learners: updatedLearners, weekNumber: state.weekNumber + 1 };
    }

    case 'ADD_ITEM': return { ...state, items: [...state.items, action.payload] };
    case 'UPDATE_ITEM': return { ...state, items: state.items.map(i => i.id === action.payload.id ? { ...i, ...action.payload.updates } : i) };
    case 'REMOVE_ITEM': return { ...state, items: state.items.filter(i => i.id !== action.payload) };

    case 'PURCHASE_ITEM': {
      const item = state.items.find(i => i.id === action.payload.itemId);
      const learner = state.learners.find(l => l.id === action.payload.learnerId);
      if (!item || !learner || learner.coins < item.cost || item.stock === 0) return state;
      const existing = learner.inventory.find(inv => inv.itemId === item.id);
      const updInv = existing
        ? learner.inventory.map(inv => inv.itemId === item.id ? { ...inv, quantity: inv.quantity + 1 } : inv)
        : [...learner.inventory, { itemId: item.id, quantity: 1 }];
      return {
        ...state,
        items: state.items.map(i => i.id === item.id ? { ...i, stock: Math.max(0, i.stock - 1) } : i),
        learners: state.learners.map(l => l.id === learner.id ? { ...l, coins: l.coins - item.cost, inventory: updInv, bonusAtk: l.bonusAtk + item.atk, bonusDef: l.bonusDef + item.def } : l),
      };
    }

    case 'ADD_QUEST': return { ...state, quests: [...state.quests, action.payload] };
    case 'UPDATE_QUEST': return { ...state, quests: state.quests.map(q => q.id === action.payload.id ? { ...q, ...action.payload.updates } : q) };
    case 'COMPLETE_QUEST_STEP': {
      const quest = state.quests.find(q => q.id === action.payload.questId);
      if (!quest) return state;
      const steps = quest.steps.map(s => s.id === action.payload.stepId ? { ...s, completed: true } : s);
      return { ...state, quests: state.quests.map(q => q.id === quest.id ? { ...q, steps, completed: steps.every(s => s.completed) } : q) };
    }

    case 'LOG_BATTLE': return { ...state, battleHistory: [action.payload, ...state.battleHistory], tutorProfile: { ...state.tutorProfile, totalBattlesRun: state.tutorProfile.totalBattlesRun + 1 } };
    case 'LOG_AIRDROP': return { ...state, airdropHistory: [action.payload, ...state.airdropHistory], tutorProfile: { ...state.tutorProfile, totalAirdropsLaunched: state.tutorProfile.totalAirdropsLaunched + 1 } };
    case 'GRANT_XP': {
      updateMainAppXp(action.payload.learnerId, action.payload.amount);
      return { ...state, learners: state.learners.map(l => l.id === action.payload.learnerId ? { ...l, careerXp: l.careerXp + action.payload.amount } : l) };
    }
    case 'GRANT_COINS': return { ...state, learners: state.learners.map(l => l.id === action.payload.learnerId ? { ...l, coins: l.coins + action.payload.amount } : l) };
    case 'SET_LEARNER_ALIVE': return { ...state, learners: state.learners.map(l => l.id === action.payload.learnerId ? { ...l, isAlive: action.payload.alive, isGhost: !action.payload.alive } : l) };
    case 'SET_BATTLE_RUNNING': return { ...state, isBattleRunning: action.payload };
    case 'LOAD_STATE': return action.payload;
    case 'RESET_WEEKLY': return { ...state, learners: state.learners.map(l => ({ ...l, weeklyRoleLevel: 1, weeklyKills: 0, weeklySaves: 0, weeklyCorrectAnswers: 0, isAlive: true, isGhost: false })), weekNumber: state.weekNumber + 1, dayNumber: 1 };
    case 'UNLOCK_EASTER_EGG': return state.easterEggVault.includes(action.payload) ? state : { ...state, easterEggVault: [...state.easterEggVault, action.payload] };
    case 'UPDATE_WEEK_NUMBER': return { ...state, weekNumber: action.payload };
    case 'ADD_TUTOR_DIALOGUE': return { ...state, tutorProfile: { ...state.tutorProfile, dialogueCards: [...state.tutorProfile.dialogueCards, action.payload] } };
    case 'UPDATE_TUTOR_DIALOGUE': return { ...state, tutorProfile: { ...state.tutorProfile, dialogueCards: state.tutorProfile.dialogueCards.map(d => d.id === action.payload.id ? { ...d, ...action.payload.updates } : d) } };
    case 'REMOVE_TUTOR_DIALOGUE': return { ...state, tutorProfile: { ...state.tutorProfile, dialogueCards: state.tutorProfile.dialogueCards.filter(d => d.id !== action.payload) } };

    case 'UPDATE_ROLE': {
      roleOverrides[action.payload.id] = { name: action.payload.name, emoji: action.payload.emoji };
      saveRoleOverrides(roleOverrides);
      // Also update any learner currently using this role
      return { ...state, learners: state.learners.map(l => l.currentRoleId === action.payload.id ? { ...l, emoji: action.payload.emoji } : l) };
    }

    case 'BULK_IMPORT': {
      const p = action.payload;
      let s = { ...state };
      if (p.quests) s = { ...s, quests: [...s.quests, ...p.quests] };
      if (p.items) s = { ...s, items: [...s.items, ...p.items] };
      if (p.battleRecord) s = { ...s, battleHistory: [p.battleRecord, ...s.battleHistory] };
      if (p.airdrops) s = { ...s, airdropHistory: [...p.airdrops, ...s.airdropHistory] };
      if (p.learnerUpdates) {
        s = { ...s, learners: s.learners.map(l => {
          const upd = p.learnerUpdates?.find(u => u.id === l.id);
          if (!upd) return l;
          return { ...l, ...(upd.voiceCards ? { voiceCards: upd.voiceCards } : {}), ...(upd.goals ? { goals: upd.goals } : {}), ...(upd.lessonNotes ? { lessonNotes: upd.lessonNotes } : {}) };
        })};
      }
      return s;
    }

    default: return state;
  }
}

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  getRoleById: (id: string) => Role | undefined;
  getItemById: (id: string) => Item | undefined;
  getLearnerById: (id: string) => Learner | undefined;
  exportState: () => void;
  importState: (json: string) => void;
  copyToClipboard: (text: string) => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

const STORAGE_KEY = 'combat_arena_state_v3';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE, (init) => {
    let baseState = { ...init };
    try {
      // Try v3 first, then migrate from v2
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('combat_arena_state_v2');
      if (stored) {
        const parsed = JSON.parse(stored) as GameState;
        // Ensure new fields exist on learners
        const learners = (parsed.learners || []).map(l => ({
          ...l, 
          cefrLevel: l.cefrLevel || 'A2',
          goals: l.goals || '',
          lessonNotes: l.lessonNotes || '',
          currentLesson: l.currentLesson || '',
          learnerVoice: l.learnerVoice || '',
        }));
        baseState = { ...init, ...parsed, learners, showSplash: true };
      }
    } catch {}

    // Sync with main app learners
    try {
      const mainLearners = getMainAppLearners();
      if (mainLearners.length > 0) {
        const newLearners: Learner[] = [];

        for (const ml of mainLearners) {
          let existing = baseState.learners.find(l => l.id === ml.id);
          const xp = ml.xp || 0;
          const streak = ml.streak || 0;
          if (existing) {
            existing.careerXp = xp;
            existing.name = ml.name;
            existing.streak = streak;
            newLearners.push(existing);
          } else {
            const themeRoles = getRolesByTheme(baseState.theme || 'mafia');
            const randomRole = themeRoles[Math.floor(Math.random() * themeRoles.length)] || themeRoles[0];
            const created = createCombatLearner(
              ml.id,
              ml.name,
              randomRole.emoji,
              randomRole.id,
              1,
              xp,
              100, // starting coins
              ml.cefrLevel || 'B1',
              (ml as any).facts?.join('. ') || '',
              `Hello, I am ${ml.name}. Ready to serve!`
            );
            newLearners.push(created);
          }
        }
        baseState.learners = newLearners;
      }
    } catch {}

    return baseState;
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const getRoleById = useCallback((id: string) => getOverriddenRole(id), []);
  const getItemById = useCallback((id: string) => state.items.find(i => i.id === id), [state.items]);
  const getLearnerById = useCallback((id: string) => state.learners.find(l => l.id === id), [state.learners]);

  const exportState = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `combat_arena_${Date.now()}.json`; a.click();
  }, [state]);

  const importState = useCallback((json: string) => {
    try { dispatch({ type: 'LOAD_STATE', payload: JSON.parse(json) }); } catch { alert('Invalid JSON'); }
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const el = document.createElement('textarea'); el.value = text;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, getRoleById, getItemById, getLearnerById, exportState, importState, copyToClipboard }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
