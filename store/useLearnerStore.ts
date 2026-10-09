
// Fix: Changed 'create' import from default to named to match Zustand's ESM module structure.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { addDays } from 'date-fns';
import LZString from 'lz-string';
import { idbZustandStorage } from '../utils/storageAdapter';
import { Learner, Todo, Session, Competency, Need, Skill, AIComprehensiveAnalysis, GroupClass, GroupParticipant, CourseLevel, CalendarEvent, SyncedCalendar, CompetencyStatus, PersonalizedAchievement, CompetitionMatch, WeeklyWinRecord, CompetitionSettlement, CompetitionSettlementPair } from '../types2';
import { normalizeCefrLevel } from '../utils/cefrGrammarDictionary';
import { mockLearners, mockGroupClasses, getTestUser } from '../data/mockData';
import { getAIComprehensiveSessionAnalysis, generateAIChatMessages, getAICompetencySuggestions, getAIAchievementSuggestions } from '../services/geminiService2';
import { useAppStore, AppState } from './useAppStore';
import { useTodoStore } from './useTodoStore';
import { useCalendarStore } from './useCalendarStore';
import { useBookingStore } from './useBookingStore';
import { useAutomationStore } from './useAutomationStore';
import { generatePersonalizedTemplates } from '../utils/templateUtils';
import { generateLocalGreetings, generateLocalGoodbyes, categorizeFact } from '../utils/greetingGenerator';
import { getWeekNumber, compareWeeklyStats, getWeeklyActivityStats } from '../utils/weeklyStats';
import { syncLearnerToDisk, triggerAutoSync, isDiskModeEnabled } from '../utils/diskStorage';


// Local Storage Dehydration Safeguard: drop non-essential HTML blocks and truncate huge transcripts/scripts
export const dehydrateLearners = (learners: Learner[]): Learner[] => {
    if (!learners || !Array.isArray(learners)) return [];
    return learners.map(learner => {
        const cleanLearner = { ...learner };
        
        if (cleanLearner.sessions && Array.isArray(cleanLearner.sessions)) {
            cleanLearner.sessions = cleanLearner.sessions.map(session => {
                const s = { ...session };
                
                // Truncate huge script transcript logs (>5000 chars)
                if (s.script && s.script.length > 5000) {
                    s.script = s.script.substring(0, 5000) + "\n\n[Transcript truncated to save space. Click to view online or download full version.]";
                }
                
                // Truncate huge chatMessages log to preserve space
                if (s.chatMessages && Array.isArray(s.chatMessages) && s.chatMessages.length > 30) {
                    s.chatMessages = s.chatMessages.slice(-20); // Keep only the latest 20 message blocks to safeguard storage limits
                }
                
                // Drop any huge HTML/XML formatting in session fields
                Object.keys(s).forEach(key => {
                    const val = (s as any)[key];
                    if (typeof val === 'string' && val.length > 4000) {
                        const hasHtml = val.includes('<!DOCTYPE') || val.includes('<html') || val.includes('<div') || val.includes('class=') || val.includes('style=');
                        if (hasHtml) {
                            (s as any)[key] = `[HTML block removed/archived under Local Storage Dehydration Safeguard - file remains accessible in the Saved Files library]`;
                        }
                    }
                });
                
                return s;
            });
        }
        
        return cleanLearner;
    });
};

const calculateStreak = (sessions: Session[]): number => {
    let currentStreak = 0;
    if (!sessions) return 0;
    for (let i = sessions.length - 1; i >= 0; i--) {
        if (sessions[i].attended) {
            currentStreak++;
        } else {
            break;
        }
    }
    return currentStreak;
};

interface LearnerState {
    learners: Learner[];
    groupClasses: GroupClass[];
    
    // Actions
    getLearnerById: (id: string) => Learner | undefined;
    addLearner: (learner: Learner) => void;
    updateLearner: (updatedLearner: Learner) => void;
    removeLearner: (learnerId: string) => void;
    dismissFromAttention: (learnerId: string) => void;
    undismissFromAttention: (learnerId: string) => void;
    runAIUpdatesForAllLearners: () => Promise<void>;
    runAIUpdatesForLearner: (learnerId: string) => Promise<void>;
    getGroupById: (id: string) => GroupClass | undefined;
    /**
     * Create a class, optionally complete: its level and its roster can be handed in
     * with the name, so "Create New Group Class" produces a teachable class in one step
     * instead of an empty shell the tutor has to come back and fill in.
     * Returns the new id so the caller can navigate straight to it.
     */
    addGroupClass: (name: string, options?: {
        level?: CourseLevel;
        /** CEFR ceiling chosen at creation (A1 … C2, including A2+/B1+). */
        cefrLevel?: string;
        /** Grammar tier 1 · Easy / 2 · Medium / 3 · Advanced for that CEFR level. */
        cefrTier?: number;
        schedule?: string;
        participants?: Omit<GroupParticipant, 'id'>[];
        groupRouting?: string;
        rosterSource?: string;
    }) => string;
    updateGroupClass: (updatedGroup: GroupClass) => void;
    removeGroupClass: (groupId: string) => void;
    addParticipantToGroup: (groupId: string, learnerId: string) => void;
    removeParticipantFromGroup: (groupId: string, learnerId: string) => void;
    /* ── Group ROSTER (no learner accounts involved) ─────────────────────────────
     * The people in a group class are stored on the class itself. The two helpers
     * above link EXISTING learner accounts and are kept only for that old behaviour;
     * every group feature should use these instead. See `GroupParticipant` in types2. */
    addGroupParticipant: (groupId: string, participant: Omit<GroupParticipant, 'id'>) => string;
    updateGroupParticipant: (groupId: string, participant: GroupParticipant) => void;
    removeGroupParticipant: (groupId: string, participantId: string) => void;
    /** Merges a parsed roster in; people already on it are updated, not duplicated. */
    importGroupParticipants: (
        groupId: string,
        participants: Omit<GroupParticipant, 'id'>[],
        options?: { source?: string; groupRouting?: string }
    ) => number;
    /** The tutor's mandatory Step 2 instructions for the lesson AI. */
    setGroupRouting: (groupId: string, routing: string) => void;
    /** One call per logged session: everyone not named is marked absent. */
    recordGroupAttendance: (groupId: string, sessionId: string, date: string, presentIds: string[]) => void;
    importData: (data: { learners?: Learner[], todos?: Todo[], calendarEvents?: CalendarEvent[], syncedCalendars?: SyncedCalendar[], groupClasses?: GroupClass[], logoUrl?: string, tutorInfo?: AppState['tutorInfo'] }) => void;
    addSession: (learnerId: string, session: Omit<Session, 'id' | 'aiAnalysis' | 'reviewQuestions' | 'skillsLearned' | 'needsHelp'> & { manualAnalysisJson?: string }) => Promise<void>;
    finalizeSessionWithAI: (learnerId: string, sessionData: Omit<Session, 'id' | 'aiAnalysis' | 'reviewQuestions' | 'skillsLearned' | 'needsHelp'>, confirmedAnalysis: AIComprehensiveAnalysis | null) => Promise<void>;
    updateSession: (learnerId: string, session: Session) => void;
    removeSession: (learnerId: string, sessionId: string) => void;
    addSessionToGroup: (groupId: string, session: Omit<Session, 'id' | 'aiAnalysis'>) => Promise<void>;
    updateSessionInGroup: (groupId: string, session: Session) => void;
    removeSessionFromGroup: (groupId: string, sessionId: string) => void;
    addCompetency: (learnerId: string, competency: Omit<Competency, 'id'>) => void;
    updateCompetency: (learnerId: string, competency: Competency) => void;
    removeCompetency: (learnerId: string, competencyId: string) => void;
    addNeed: (learnerId: string, need: Omit<Need, 'id'>) => void;
    updateNeed: (learnerId: string, need: Need) => void;
    removeNeed: (learnerId: string, needId: string) => void;
    addSkill: (learnerId: string, needId: string, skillName: string) => void;
    updateSkillProgress: (learnerId: string, needId: string, skillId: string, change: number) => void;
    updateLearnerXP: (learnerId: string, amount: number) => void;
    toggleCompetition: (learnerId: string) => void;
    declareWinner: (winnerId: string, loserId: string) => void;
    assignMatches: () => void;
    // ── Self-running Weekly Competition ──
    competitionRoundWeek: number | null;
    competitionRoundYear: number | null;
    // Digest of the last round the engine auto-settled at the Sunday deadline (winners, ties, per-pair XP)
    lastSettledRound: CompetitionSettlement | null;
    ensureCompetitionRound: () => void;
    addChatMessageToLearner: (learnerId: string, message: string) => void;
    addTestUser: () => void;
}

export const useLearnerStore = create<LearnerState>()(
    persist(
        (set, get) => ({
            learners: [],
            groupClasses: [],
            competitionRoundWeek: null,
            competitionRoundYear: null,
            lastSettledRound: null,

            addTestUser: () => {
                const testUser = getTestUser();
                set(state => ({
                    learners: [...state.learners.filter(l => l.id !== testUser.id), testUser]
                }));
            },

            getLearnerById: (id) => get().learners.find(learner => learner.id === id),
            
            addLearner: (learner) => {
                set(state => ({ learners: [...state.learners, learner] }));
                if (isDiskModeEnabled()) {
                    syncLearnerToDisk(learner);
                    triggerAutoSync(false);
                }
            },
            
            updateLearner: (updatedLearner) => {
                set(state => ({ learners: state.learners.map(l => l.id === updatedLearner.id ? updatedLearner : l) }));
                if (isDiskModeEnabled()) {
                    syncLearnerToDisk(updatedLearner);
                    triggerAutoSync(false);
                }
            },

            removeLearner: (learnerId) => {
                const learner = get().learners.find(l => l.id === learnerId);
                if (learner) {
                    const attendedSessions = (learner.sessions || []).filter(s => s.attended);
                    const hours = attendedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
                    if (hours > 0) {
                        const appStore = useAppStore.getState();
                        const currentHistorical = appStore.tutorInfo?.historicalHoursTaught || 0;
                        appStore.setTutorInfo({
                            historicalHoursTaught: currentHistorical + hours
                        });
                    }
                }
                set(state => ({
                    learners: state.learners.filter(l => l.id !== learnerId),
                    groupClasses: state.groupClasses.map(g => ({...g, participantIds: (g.participantIds || []).filter(id => id !== learnerId)})),
                }));
                useTodoStore.setState(state => ({
                    todos: state.todos.filter(t => t.learnerId !== learnerId)
                }));
                useCalendarStore.setState(state => ({
                    calendarEvents: state.calendarEvents.filter(e => e.learnerId !== learnerId)
                }));
                
                if (isDiskModeEnabled()) {
                    triggerAutoSync(false);
                }
                
                // Clean up IndexedDB lessons/materials content for this learner to save space
                import('idb-keyval').then(async (idb) => {
                    try {
                        const content = await idb.get('tutor-crafter-content') || {};
                        if (content[learnerId]) {
                            delete content[learnerId];
                            await idb.set('tutor-crafter-content', content);
                            console.log(`[IndexedDB Cleanup] Successfully pruned lesson materials for deleted learner: ${learnerId}`);
                        }
                    } catch (idbErr) {
                        console.warn("[IndexedDB Cleanup] Failed to prune deleted learner content:", idbErr);
                    }
                }).catch(() => {});
            },
            
            dismissFromAttention: (learnerId: string) => set(state => ({
                learners: state.learners.map(l => l.id === learnerId ? { ...l, isAttentionDismissed: true } : l)
            })),

            undismissFromAttention: (learnerId: string) => set(state => ({
                learners: state.learners.map(l => l.id === learnerId ? { ...l, isAttentionDismissed: false } : l)
            })),
            
            runAIUpdatesForAllLearners: async () => {
                const { setLoading, logError } = useAppStore.getState();
                setLoading(true);
                try {
                    const currentLearners = get().learners;
                    let updatedCount = 0;

                    const updatedLearnersPromises = currentLearners.map(async (learner) => {
                        let learnerChanged = false;
                        const updatedLearner = JSON.parse(JSON.stringify(learner)); // Deep copy

                        // Fetch suggestions in parallel
                        const [competencySuggestions, achievementSuggestions] = await Promise.all([
                            getAICompetencySuggestions(learner),
                            getAIAchievementSuggestions(learner)
                        ]);

                        // 1. Process Competency Suggestions
                        if (competencySuggestions) {
                            competencySuggestions.forEach(suggestion => {
                                const needIndex = updatedLearner.needs.findIndex((n: Need) => n.name === suggestion.needName);
                                if (needIndex !== -1) {
                                    suggestion.suggestedCompetencies.forEach(compName => {
                                        const compExists = updatedLearner.competencies.some((c: Competency) => c.name.toLowerCase() === compName.toLowerCase());
                                        if (!compExists) {
                                            learnerChanged = true;
                                            // Add new competency
                                            const newCompetency: Competency = {
                                                id: `c${Date.now()}-${Math.random()}`,
                                                name: compName,
                                                icon: 'target',
                                                rating: 3,
                                                initialProgress: 0,
                                                progress: 0,
                                                status: CompetencyStatus.NeedsWork,
                                            };
                                            updatedLearner.competencies.push(newCompetency);

                                            // Link it to the need via learningPath
                                            const skillExists = updatedLearner.needs[needIndex].learningPath.some((s: Skill) => s.name.toLowerCase() === compName.toLowerCase());
                                            if (!skillExists) {
                                                const newSkill: Skill = { id: `s${Date.now()}-${Math.random()}`, name: compName, progress: 0 };
                                                updatedLearner.needs[needIndex].learningPath.push(newSkill);
                                            }
                                        }
                                    });
                                }
                            });
                        }

                        // 2. Process Achievement Suggestions
                        if (achievementSuggestions) {
                            const existingAchievements = new Set((updatedLearner.personalizedAchievements || []).map((a: PersonalizedAchievement) => a.name.toLowerCase()));
                            achievementSuggestions.forEach(suggestion => {
                                if (!existingAchievements.has(suggestion.name.toLowerCase())) {
                                    learnerChanged = true;
                                    const newAchievement: PersonalizedAchievement = {
                                        id: `ach-${Date.now()}-${Math.random()}`,
                                        name: suggestion.name,
                                        description: suggestion.description,
                                        icon: suggestion.icon,
                                        unlocked: false,
                                    } as any;
                                    if (!updatedLearner.personalizedAchievements) {
                                        updatedLearner.personalizedAchievements = [];
                                    }
                                    updatedLearner.personalizedAchievements.push(newAchievement);
                                }
                            });
                        }
                        
                        if (learnerChanged) {
                            updatedCount++;
                        }
                        return updatedLearner;
                    });

                    const updatedLearners = await Promise.all(updatedLearnersPromises);

                    set({ learners: updatedLearners });
                    alert(`AI updates complete! ${updatedCount} learner profile(s) were enhanced.`);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    logError("Failed to run AI updates for all learners:", errorMessage);
                    alert(`An error occurred during the AI update process: ${errorMessage}`);
                } finally {
                    setLoading(false);
                }
            },

            runAIUpdatesForLearner: async (learnerId) => {
                const { getLearnerById, updateLearner } = get();
                const { setLoading, logError } = useAppStore.getState();
                setLoading(true);
                const originalLearner = getLearnerById(learnerId);
                if (!originalLearner) {
                    logError(`Learner with ID ${learnerId} not found for AI update.`);
                    setLoading(false);
                    return;
                }
            
                try {
                    let updatedLearner = JSON.parse(JSON.stringify(originalLearner)); // Deep copy
                    let learnerChanged = false;
            
                    // --- SEQUENTIAL API CALL 1: COMPETENCIES ---
                    const competencySuggestions = await getAICompetencySuggestions(updatedLearner);
                    if (competencySuggestions) {
                        competencySuggestions.forEach(suggestion => {
                            const needIndex = updatedLearner.needs.findIndex((n: Need) => n.name === suggestion.needName);
                            if (needIndex !== -1) {
                                suggestion.suggestedCompetencies.forEach(compName => {
                                    const compExists = updatedLearner.competencies.some((c: Competency) => c.name.toLowerCase() === compName.toLowerCase());
                                    if (!compExists) {
                                        learnerChanged = true;
                                        const newCompetency: Competency = {
                                            id: `c${Date.now()}-${Math.random()}`, name: compName, icon: 'target', rating: 3, initialProgress: 0, progress: 0, status: CompetencyStatus.NeedsWork,
                                        };
                                        updatedLearner.competencies.push(newCompetency);
            
                                        const skillExists = updatedLearner.needs[needIndex].learningPath.some((s: Skill) => s.name.toLowerCase() === compName.toLowerCase());
                                        if (!skillExists) {
                                            const newSkill: Skill = { id: `s${Date.now()}-${Math.random()}`, name: compName, progress: 0 };
                                            updatedLearner.needs[needIndex].learningPath.push(newSkill);
                                        }
                                    }
                                });
                            }
                        });
                    }
            
                    // --- SEQUENTIAL API CALL 2: ACHIEVEMENTS ---
                    const achievementSuggestions = await getAIAchievementSuggestions(updatedLearner);
                    if (achievementSuggestions) {
                        const existingAchievements = new Set((updatedLearner.personalizedAchievements || []).map((a: PersonalizedAchievement) => a.name.toLowerCase()));
                        achievementSuggestions.forEach(suggestion => {
                            if (!existingAchievements.has(suggestion.name.toLowerCase())) {
                                learnerChanged = true;
                                const newAchievement = {
                                    id: `ach-${Date.now()}-${Math.random()}`, name: suggestion.name, description: suggestion.description, icon: suggestion.icon, unlocked: false,
                                } as any;
                                if (!updatedLearner.personalizedAchievements) {
                                    updatedLearner.personalizedAchievements = [];
                                }
                                updatedLearner.personalizedAchievements.push(newAchievement);
                            }
                        });
                    }
                    
                    if (learnerChanged) {
                        updateLearner(updatedLearner);
                        alert(`AI Enhancements complete! ${updatedLearner.name}'s profile has been updated with new competencies and achievements.`);
                    } else {
                        alert(`No new AI suggestions found for ${updatedLearner.name} at this time.`);
                    }
            
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    logError(`Failed to run AI updates for learner ${learnerId}:`, errorMessage);
                    alert(`An error occurred during the AI update process: ${errorMessage}`);
                } finally {
                    setLoading(false);
                }
            },


            getGroupById: (id) => get().groupClasses.find(group => group.id === id),

            addGroupClass: (name, options) => {
                 const id = `g${Date.now()}`;
                 const level = options?.level ?? CourseLevel.B1;
                 const newGroup = {
                    id,
                    name,
                    level,
                    // The class ceiling + grammar tier, straight from the creation modal so
                    // the very first generated lesson already respects it (the individual
                    // profile stores the same pair).
                    cefrLevel: normalizeCefrLevel(options?.cefrLevel || (level as any), 'B1'),
                    cefrTier: options?.cefrTier || 1,
                    schedule: options?.schedule || '',
                    targetLevel: 'A1-C2',
                    l1Language: 'Multiple',
                    targetLanguage: 'English',
                    requirements: '',
                    learnerFacts: '',
                    avatarId: `group-${Date.now()}`,
                    participantIds: [],
                    // The roster the class is actually taught from — people who were
                    // typed in, pasted in, or extracted by an AI from a transcript.
                    // Deliberately not learner accounts: see `GroupParticipant`.
                    participantsData: (options?.participants || []).map((p, i) => ({ ...p, id: `gp${Date.now()}${i}` })),
                    groupRouting: options?.groupRouting || '',
                    rosterSource: options?.rosterSource || '',
                    dateCreated: new Date().toISOString().split('T')[0],
                    sessions: [],
                    coursePlan: {
                        level,
                        targetLevel: CourseLevel.B2,
                        courseName: 'Group Sessions',
                        duration: 60,
                        frequency: 'Light',
                        totalSessions: 12,
                    },
                } as any;
                set(state => ({ groupClasses: [...state.groupClasses, newGroup] }));
                return id;
            },

            updateGroupClass: (updatedGroup) => set(state => ({
                groupClasses: state.groupClasses.map(g => g.id === updatedGroup.id ? updatedGroup : g)
            })),
            
            removeGroupClass: (groupId: string) => {
                // 1. Immediately update the groupClasses list to provide instant UI feedback.
                set(state => ({
                    groupClasses: state.groupClasses.filter(g => g.id !== groupId)
                }));

                // 2. Then, perform cleanup in other stores.
                // This happens after the primary UI state is updated.
                useTodoStore.setState(state => ({
                    todos: state.todos.filter(todo => todo.groupId !== groupId)
                }));
                useCalendarStore.setState(state => ({
                    calendarEvents: state.calendarEvents.filter(event => event.groupId !== groupId)
                }));
            },

            /* ── Group roster (people, not accounts) ─────────────────────────────── */

            addGroupParticipant: (groupId, participant) => {
                const participantId = `gp${Date.now()}${Math.floor(Math.random() * 10000)}`;
                set(state => ({
                    groupClasses: state.groupClasses.map(g =>
                        g.id === groupId
                            ? { ...g, participantsData: [...(g.participantsData || []), { ...participant, id: participantId }] }
                            : g
                    )
                }));
                return participantId;
            },

            updateGroupParticipant: (groupId, participant) => set(state => ({
                groupClasses: state.groupClasses.map(g =>
                    g.id === groupId
                        ? { ...g, participantsData: (g.participantsData || []).map(p => (p.id === participant.id ? participant : p)) }
                        : g
                )
            })),

            removeGroupParticipant: (groupId, participantId) => set(state => ({
                groupClasses: state.groupClasses.map(g =>
                    g.id === groupId
                        ? { ...g, participantsData: (g.participantsData || []).filter(p => p.id !== participantId) }
                        : g
                )
            })),

            importGroupParticipants: (groupId, participants, options) => {
                let added = 0;
                set(state => ({
                    groupClasses: state.groupClasses.map(g => {
                        if (g.id !== groupId) return g;
                        const next = [...(g.participantsData || [])];
                        participants.forEach((incoming, index) => {
                            // Match on name: re-running the AI with a better answer (or a
                            // second transcript) must IMPROVE a roster, never double it.
                            const key = incoming.name.trim().toLowerCase();
                            const at = next.findIndex(p => p.name.trim().toLowerCase() === key);
                            if (at === -1) {
                                next.push({ ...incoming, id: `gp${Date.now()}${index}` });
                                added += 1;
                            } else {
                                // Keep the tutor's own edits to people already on the roster.
                                const kept = next[at];
                                next[at] = {
                                    ...incoming,
                                    ...kept,
                                    cefr: incoming.cefr || kept.cefr,
                                    facts: incoming.facts || kept.facts,
                                    interests: incoming.interests || kept.interests,
                                    goals: incoming.goals || kept.goals,
                                    routing: kept.routing || incoming.routing || '',
                                    talkative: kept.talkative && kept.talkative !== 'unknown' ? kept.talkative : incoming.talkative,
                                };
                            }
                        });
                        return {
                            ...g,
                            participantsData: next,
                            rosterSource: options?.source ?? g.rosterSource,
                            groupRouting: options?.groupRouting ?? g.groupRouting,
                        };
                    })
                }));
                return added;
            },

            setGroupRouting: (groupId, routing) => set(state => ({
                groupClasses: state.groupClasses.map(g => (g.id === groupId ? { ...g, groupRouting: routing } : g))
            })),

            recordGroupAttendance: (groupId, sessionId, date, presentIds) => set(state => ({
                groupClasses: state.groupClasses.map(g => {
                    if (g.id !== groupId) return g;
                    return {
                        ...g,
                        participantsData: (g.participantsData || []).map(p => {
                            const entry = { sessionId, date, present: presentIds.includes(p.id) };
                            const others = (p.attendance || []).filter(a => a.sessionId !== sessionId);
                            return { ...p, attendance: [...others, entry] };
                        }),
                    };
                })
            })),

            addParticipantToGroup: (groupId, learnerId) => set(state => ({
                groupClasses: state.groupClasses.map(g => {
                    if (g.id === groupId && !(g.participantIds || []).includes(learnerId)) {
                        return { ...g, participantIds: [...(g.participantIds || []), learnerId] };
                    }
                    return g;
                })
            })),

            removeParticipantFromGroup: (groupId, learnerId) => set(state => ({
                groupClasses: state.groupClasses.map(g => 
                    g.id === groupId 
                        ? { ...g, participantIds: (g.participantIds || []).filter(id => id !== learnerId) }
                        : g
                )
            })),

            importData: (data) => {
                const { learners, todos, calendarEvents, syncedCalendars, groupClasses, logoUrl, tutorInfo } = data;
                let message = 'Import successful!';
                let importedSomething = false;
                const details = [];

                if (learners && Array.isArray(learners)) {
                    set({ learners });
                    details.push(`${learners.length} learner profiles`);
                    importedSomething = true;
                }
                if (todos && Array.isArray(todos)) {
                    useTodoStore.setState({ todos });
                    details.push(`${todos.length} to-do items`);
                    importedSomething = true;
                }
                if (calendarEvents && Array.isArray(calendarEvents)) {
                    useCalendarStore.setState({ calendarEvents });
                    details.push(`${calendarEvents.length} calendar events`);
                    importedSomething = true;
                }
                if (syncedCalendars && Array.isArray(syncedCalendars)) {
                    useCalendarStore.setState({ syncedCalendars });
                    details.push(`${syncedCalendars.length} synced calendars`);
                    importedSomething = true;
                }
                if (groupClasses && Array.isArray(groupClasses)) {
                    set({ groupClasses });
                    details.push(`${groupClasses.length} group classes`);
                    importedSomething = true;
                }
                if (logoUrl) {
                    useAppStore.getState().setLogoUrl(logoUrl);
                    details.push('App Logo');
                    importedSomething = true;
                }
                if (tutorInfo) {
                    useAppStore.getState().setTutorInfo(tutorInfo);
                    details.push('Tutor Info');
                    importedSomething = true;
                }


                if (importedSomething) {
                    alert(`${message}\n\nLoaded:\n- ${details.join('\n- ')}`);
                } else {
                    alert('Import failed. No valid data found in the file.');
                }
            },
            
            addSession: async (learnerId, sessionData) => {
                const { getLearnerById, finalizeSessionWithAI } = get();
                const { setLoading, logError, setPendingAIConfirmation } = useAppStore.getState();
                const learner = getLearnerById(learnerId);
                if (!learner) return;

                const sessionNotes = sessionData.script || '';
                const { manualAnalysisJson, ...cleanSessionData } = sessionData;

                let sessionNotesFallback = sessionNotes;
                let summaryFallback = sessionData.lessonSummary;
                if (!sessionNotesFallback.trim() && !summaryFallback?.trim() && !manualAnalysisJson?.trim()) {
                    summaryFallback = `General session completed on ${sessionData.date}. No detailed transcript provided.`;
                }

                setLoading(true);
                try {
                    let analysis: AIComprehensiveAnalysis | null = null;
                    
                    if (manualAnalysisJson?.trim()) {
                        try {
                            const cleanedJsonStr = manualAnalysisJson.replace(/```json\n?/g, '').replace(/```/g, '').trim();
                            analysis = JSON.parse(cleanedJsonStr) as AIComprehensiveAnalysis;
                        } catch(e) {
                            console.error("Invalid Manual JSON:", e);
                            const errMsg = e instanceof Error ? e.message : String(e);
                            throw new Error(`INVALID_MANUAL_JSON: ${errMsg}`);
                        }
                    }

                    if (!analysis) {
                        let selectedSyllabusChaptersStr = '';
                        if (cleanSessionData.selectedSyllabusChapterIds && cleanSessionData.selectedSyllabusChapterIds.length > 0 && learner.syllabus?.competencies) {
                            const matchingChapters: any[] = [];
                            learner.syllabus.competencies.forEach(comp => {
                                comp.chapters.forEach(chap => {
                                    if (cleanSessionData.selectedSyllabusChapterIds.includes(chap.id)) {
                                        matchingChapters.push(chap);
                                    }
                                });
                            });
                            if (matchingChapters.length > 0) {
                                selectedSyllabusChaptersStr = matchingChapters.map(chap => {
                                    return `Chapter Title: ${chap.title}
Grammar: ${chap.grammar}
Vocabulary: ${(chap.vocabulary || []).join(', ')}
Description: ${chap.description}
Functional Language: ${(chap.functionalLanguage || []).join(', ') || 'N/A'}
Skills Needed: ${(chap.skillsNeeded || []).join(', ') || 'N/A'}
Strategies & Tips: ${chap.strategiesAndTips || 'N/A'}`;
                                }).join('\n\n---\n\n');
                            }
                        }

                        analysis = await getAIComprehensiveSessionAnalysis({
                            script: sessionNotesFallback,
                            lessonSummary: summaryFallback,
                            learnerInterests: learner.interests,
                            learnerLevel: learner.coursePlan.level,
                            learnerCompetencies: learner.competencies.map(c => `${c.name} (${c.progress}%)`).join(', '),
                            learnerNeeds: learner.needs.map(n => n.name).join(', '),
                            selectedSyllabusChapters: selectedSyllabusChaptersStr
                        });
                    }

                    if (analysis) {
                        // Always show the AI Confirmation Modal when an analysis is present
                        setPendingAIConfirmation({ analysis, learnerId, sessionData: cleanSessionData });
                    } else {
                        // If AI fails, just log the session without AI data
                        await finalizeSessionWithAI(learnerId, cleanSessionData, null);
                    }
                } catch (error) {
                    if (error instanceof Error && error.message.startsWith("INVALID_MANUAL_JSON")) {
                        throw error;
                    }
                    logError("Failed during AI session analysis", error instanceof Error ? error.stack : String(error));
                    await finalizeSessionWithAI(learnerId, cleanSessionData, null); // Finalize without AI on error
                } finally {
                    setLoading(false);
                }
            },

            finalizeSessionWithAI: async (learnerId, sessionData, confirmedAnalysis) => {
                const { getLearnerById, updateLearner } = get();
                const { setLoading, logError } = useAppStore.getState();
                const { addTodo } = useTodoStore.getState();
                const { calendarEvents } = useCalendarStore.getState();
                
                setLoading(true);
                try {
                    const learner = getLearnerById(learnerId);
                    if (!learner) return;

                    let updatedLearnerData = { ...learner };
                    // FIX: Introduced `xpChange` to track XP earned from competency progress during a session.
                    let xpChange = 0;

                    // Mark selected syllabus chapters as completed
                    if (sessionData.selectedSyllabusChapterIds && sessionData.selectedSyllabusChapterIds.length > 0 && updatedLearnerData.syllabus?.competencies) {
                        const updatedCompetencies = updatedLearnerData.syllabus.competencies.map(comp => {
                            if (!comp.chapters) return comp;
                            const updatedChapters = comp.chapters.map(chap => {
                                if (sessionData.selectedSyllabusChapterIds.includes(chap.id)) {
                                    return { ...chap, status: 'completed' as const };
                                }
                                return chap;
                            });
                            return { ...comp, chapters: updatedChapters };
                        });
                        updatedLearnerData.syllabus = {
                            ...updatedLearnerData.syllabus,
                            competencies: updatedCompetencies
                        };
                    }

                    if (confirmedAnalysis?.suggestedTodos) {
                        confirmedAnalysis.suggestedTodos.forEach(todoText => {
                            addTodo({ text: todoText, learnerId: learner.id, learnerName: learner.name, completed: false, priority: 'Medium' });
                        });
                    }

                    if (confirmedAnalysis?.facts) {
                        const currentFactsArray = Array.isArray(learner.facts) ? learner.facts : (typeof learner.facts === 'string' ? learner.facts.split('.').filter(Boolean) : []);
                        const normalizeFact = (f: string) => f?.trim?.()?.toLowerCase?.()?.replace(/^\[.*?\]\s*/, '')?.replace(/[\.!?,;:]$/g, '')?.replace(/\s+/g, ' ') || '';
                        const existingFactsSet = new Set(currentFactsArray.map(f => normalizeFact(f)).filter(Boolean));
                        const trulyNewFacts = confirmedAnalysis.facts.filter((newFact: string) => {
                            const normalized = normalizeFact(newFact);
                            if (!normalized) return false;
                            const isDuplicate = existingFactsSet.has(normalized);
                            const isSubstringOfExisting = Array.from(existingFactsSet).some(ex => ex.includes(normalized) || normalized.includes(ex));
                            return !isDuplicate && !isSubstringOfExisting;
                        });
                        if (trulyNewFacts.length > 0) {
                            const allFacts = [
                                ...currentFactsArray.map(f => f?.trim?.()).filter(Boolean), 
                                ...trulyNewFacts.map((f: string) => f.trim().replace(/\.$/g, ''))
                            ].map(categorizeFact);
                            updatedLearnerData.facts = allFacts;
                        }
                    }

                    if (confirmedAnalysis?.competencyUpdates) {
                        const newCompetencies = [...updatedLearnerData.competencies];
                        confirmedAnalysis.competencyUpdates.forEach(update => {
                            const index = newCompetencies.findIndex(c => c.name?.toLowerCase() === update.competencyName?.toLowerCase());
                            if (index !== -1) {
                                const originalProgress = newCompetencies[index].progress;
                                const newProgress = update.suggestedProgress;
                                // FIX: Calculate XP earned from competency progress. Only positive changes are rewarded.
                                if (newProgress > originalProgress) {
                                    xpChange += (newProgress - originalProgress);
                                }
                                
                                newCompetencies[index].progress = newProgress;
                                newCompetencies[index].status = newProgress >= 40 ? CompetencyStatus.OnTrack : CompetencyStatus.NeedsWork;
                            }
                        });
                        updatedLearnerData.competencies = newCompetencies;
                    }
                    
                    if (confirmedAnalysis?.newSkills) {
                        const newNeeds = [...updatedLearnerData.needs];
                        const newCompetencies = [...updatedLearnerData.competencies];

                        confirmedAnalysis.newSkills.forEach(newSkill => {
                            const skillName = newSkill.skillName?.trim();
                            if (!skillName) return;

                            const progress = newSkill.suggestedProgress ?? 5;
                            // FIX: Award XP for the initial progress of newly identified skills.
                            xpChange += progress;

                            // 1. Add to need's learning path
                            const needIndex = newNeeds.findIndex(n => n.name?.toLowerCase() === newSkill.linkedNeed?.toLowerCase());
                            if (needIndex !== -1) {
                                const skillExistsInPath = newNeeds[needIndex].learningPath.some(s => s.name?.toLowerCase() === skillName.toLowerCase());
                                if (!skillExistsInPath) {
                                    newNeeds[needIndex].learningPath.push({ 
                                        id: `s${Date.now()}-${Math.random()}`, 
                                        name: skillName, 
                                        progress: progress
                                    });
                                }
                            }

                            // 2. Add to learner's competencies if it doesn't exist
                            const compExists = newCompetencies.some(c => c.name?.toLowerCase() === skillName.toLowerCase());
                            if (!compExists) {
                                newCompetencies.push({
                                    id: `c${Date.now()}-${Math.random()}`,
                                    name: skillName,
                                    icon: 'target',
                                    rating: 3,
                                    initialProgress: progress,
                                    progress: progress,
                                    status: progress >= 40 ? CompetencyStatus.OnTrack : CompetencyStatus.NeedsWork
                                });
                            }
                        });
                        updatedLearnerData.needs = newNeeds;
                        updatedLearnerData.competencies = newCompetencies;
                    }
                    
                    if (confirmedAnalysis?.challenges) {
                        const newChallenges = { ...(updatedLearnerData.challenges || {}) };
                        const { addChallenge } = useAutomationStore.getState();
                        confirmedAnalysis.challenges.forEach((challengeTitle: string) => {
                            newChallenges[challengeTitle] = 'pending';
                            addChallenge({
                                title: challengeTitle,
                                category: 'custom',
                                description: `Generated by AI for session on ${sessionData.date}`,
                                learnerId: learner.id,
                                type: 'custom',
                                target: 5,
                                current: 0,
                                xpReward: 50,
                                status: 'active',
                                startDate: new Date().toISOString(),
                                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                            });
                        });
                        updatedLearnerData.challenges = newChallenges as any;
                    }

                    if (confirmedAnalysis?.badges) {
                        const newAchievements = [...(updatedLearnerData.achievements || [])];
                        confirmedAnalysis.badges.forEach((b: any) => {
                            newAchievements.push({
                                id: `ach-${Date.now()}-${Math.random()}`,
                                title: b.name,
                                description: b.description,
                                dateEarned: sessionData.date || new Date().toISOString().split('T')[0],
                                icon: b.emoji || '🎖️'
                            });
                        });
                        updatedLearnerData.achievements = newAchievements;
                    }

                    // Merge unlocked vocabulary into learner's vocabulary list
                    if (confirmedAnalysis?.unlockedVocabulary) {
                        const existingVocab = new Set((updatedLearnerData.vocabulary || []).map(v => v.toLowerCase().trim()));
                        const newVocabWords = confirmedAnalysis.unlockedVocabulary
                            .filter((v: any) => v.word && !existingVocab.has(v.word.toLowerCase().trim()))
                            .map((v: any) => v.word.trim());
                        if (newVocabWords.length > 0) {
                            updatedLearnerData.vocabulary = [...(updatedLearnerData.vocabulary || []), ...newVocabWords];
                        }
                    }

                    // Merge key learnings into goals/growth areas
                    if (confirmedAnalysis?.keyLearnings) {
                        const existingGoals = new Set((updatedLearnerData.goalsList || []).map(g => g.toLowerCase().trim()));
                        const newLearningGoals = confirmedAnalysis.keyLearnings
                            .filter((l: string) => l && !existingGoals.has(l.toLowerCase().trim()))
                            .slice(0, 3); // Max 3 new goals
                        if (newLearningGoals.length > 0) {
                            updatedLearnerData.goalsList = [...(updatedLearnerData.goalsList || []), ...newLearningGoals];
                        }
                    }

                    // Track emotional trend data at learner level
                    const emotionalFeeling = confirmedAnalysis?.emotionalFeeling || (confirmedAnalysis as any)?.emotionAnalysis;
                    if (emotionalFeeling) {
                        const emotionHistory = (updatedLearnerData as any).emotionHistory || [];
                        (updatedLearnerData as any).emotionHistory = [...emotionHistory.slice(-20), {
                            date: sessionData.date,
                            sentimentScore: emotionalFeeling.sentimentScore,
                            dominantEmotion: emotionalFeeling.dominantEmotion,
                            confidenceScore: emotionalFeeling.confidenceScore,
                            motivationScore: emotionalFeeling.motivationScore,
                        }];
                    }

                    const nextSessionNum = (learner.streak || 0) + 1;
                    const newSession: Session = {
                        ...sessionData,
                        id: `s${Date.now()}`,
                        sessionNumber: nextSessionNum,
                        lessonSummary: confirmedAnalysis?.revisedLessonSummary?.trim() || confirmedAnalysis?.summary?.trim() || sessionData.lessonSummary || '',
                        skillsLearned: confirmedAnalysis?.strengths || [],
                        needsHelp: confirmedAnalysis?.weaknesses || [],
                        reviewQuestions: confirmedAnalysis?.reviewQuestions || null,
                        aiAnalysis: confirmedAnalysis,
                        weaknessDetails: (confirmedAnalysis as any)?.weaknessDetails || [],
                    } as any;

                    const factsArray = Array.isArray(updatedLearnerData.facts) ? updatedLearnerData.facts : [];
                    const localGreetings = generateLocalGreetings(updatedLearnerData.name, updatedLearnerData.interests || '', factsArray);
                    const localGoodbyes = generateLocalGoodbyes(updatedLearnerData.name, updatedLearnerData.interests || '', factsArray);

                    newSession.personalizedGreetings = confirmedAnalysis?.personalizedGreetings && confirmedAnalysis.personalizedGreetings.length >= 4
                        ? confirmedAnalysis.personalizedGreetings
                        : localGreetings;

                    newSession.personalizedGoodbyes = confirmedAnalysis?.personalizedGoodbyes && confirmedAnalysis.personalizedGoodbyes.length >= 4
                        ? confirmedAnalysis.personalizedGoodbyes
                        : localGoodbyes;

                    if (newSession.aiAnalysis) {
                        if (confirmedAnalysis?.chatMessages && Array.isArray(confirmedAnalysis.chatMessages)) {
                            newSession.chatMessages = confirmedAnalysis.chatMessages;
                            confirmedAnalysis.chatMessages.forEach((msg: string) => {
                                get().addChatMessageToLearner(learnerId, msg);
                            });
                        } else {
                            const today = new Date();
                            const thirtyDaysFromNow = addDays(today, 30);
                            const upcomingHolidays = calendarEvents.filter(e => {
                                if (!e.id.startsWith('holiday-')) return false;
                                try { const eventDate = new Date(e.date); return eventDate >= today && eventDate <= thirtyDaysFromNow; } catch { return false; }
                            });
                            const chatMessages = await generateAIChatMessages(learner, newSession, upcomingHolidays);
                            if (chatMessages) {
                                newSession.chatMessages = chatMessages;
                                chatMessages.forEach((msg: string) => {
                                    get().addChatMessageToLearner(learnerId, msg);
                                });
                            }
                        }
                    } else {
                        newSession.chatMessages = [
                            localGreetings[0],
                            `**Recap from your last class on ${newSession.date}:**\nToday we focused on language development, building confidence and refining fluency. Keep practicing!`,
                            localGoodbyes[0]
                        ];
                        newSession.chatMessages.forEach((msg: string) => {
                            get().addChatMessageToLearner(learnerId, msg);
                        });
                    }

                    const newSessions = [...(learner.sessions || []), newSession];
                    updatedLearnerData.sessions = newSessions;
                    // FIX: Add the calculated `xpChange` from competencies to the total XP awarded for the session.
                    updatedLearnerData.xp = learner.xp + ((confirmedAnalysis as any)?.adjustedSessionXP ?? ((newSession.attended ? 50 : 0) + xpChange));
                    updatedLearnerData.streak = (learner.streak || 0) + (newSession.attended ? 1 : 0);
                    updatedLearnerData.lastSessionDate = newSession.date;
                    updatedLearnerData.isAttentionDismissed = false;
                    updatedLearnerData.vocalPraiseTemplates = generatePersonalizedTemplates(updatedLearnerData);

                    const sessionTitle = (newSession as any).title || newSession.lessonName || (newSession as any).lessonTitle;
                    
                    // Auto-update Course Plan with completed lesson name
                    if (sessionTitle) {
                        updatedLearnerData.coursePlan = {
                            ...(updatedLearnerData.coursePlan || {}),
                            currentLesson: sessionTitle,
                        };
                    }

                    // Update session history if reviews are present
                    const hasReview = (sessionData as any).review || (newSession as any).review;
                    const existingHistory = updatedLearnerData.sessionHistory || [];
                    updatedLearnerData.sessionHistory = [...existingHistory, {
                        date: newSession.date,
                        title: sessionTitle || newSession.lessonName,
                        lessonName: newSession.lessonName,
                        review: hasReview
                    }];

                    // Update Calendar with completed session and auto-schedule next target session
                    try {
                        const { addCalendarEvent } = useCalendarStore.getState();
                        // 1. Add completed session record to Calendar
                        addCalendarEvent({
                            id: `session-log-${learner.id}-${Date.now()}`,
                            title: `✅ ${learner.name}: ${sessionTitle || 'Class Completed'}`,
                            date: newSession.date ? newSession.date.split('T')[0] : new Date().toISOString().split('T')[0],
                            time: (newSession as any).time || '10:00',
                            type: 'class',
                            learnerId: learner.id,
                            description: `Attended session. Summary: ${newSession.lessonSummary || 'Completed session.'}`
                        });

                        // 2. Auto-schedule next session in Calendar based on SMART Goal cadence
                        if (updatedLearnerData.smartGoal?.lessonsPerWeek) {
                            const daysGap = Math.max(1, Math.ceil(7 / updatedLearnerData.smartGoal.lessonsPerWeek));
                            const baseDate = new Date(newSession.date || Date.now());
                            const nextDateObj = new Date(baseDate.getTime() + daysGap * 24 * 60 * 60 * 1000);
                            const nextDateStr = nextDateObj.toISOString().split('T')[0];

                            updatedLearnerData.nextSessionDate = nextDateStr;
                            updatedLearnerData.currentLessonSettings = {
                                ...(updatedLearnerData.currentLessonSettings || {}),
                                nextClassDate: nextDateStr
                            };

                            addCalendarEvent({
                                id: `smart-cadence-${learner.id}-${Date.now()}`,
                                title: `🎯 Next Lesson: ${learner.name}`,
                                date: nextDateStr,
                                time: '10:00',
                                type: 'class',
                                learnerId: learner.id,
                                description: `Scheduled by Smart Coach cadence (${updatedLearnerData.smartGoal.lessonsPerWeek} lessons/wk)`
                            });
                        }
                    } catch (calErr) {
                        console.error("Auto Calendar sync failed:", calErr);
                    }

                    updateLearner(updatedLearnerData);

                    // Update Automation tab / Booking Store
                    if (newSession.attended) {
                        const bookingStoreState = useBookingStore.getState();
                        const learnerBookingData = bookingStoreState.learnerData[learnerId];
                        if (learnerBookingData?.activePackage) {
                            const scheduledSessions = learnerBookingData.activePackage.scheduledSessions;
                            const targetDate = newSession.date;
                            const sessionIndex = scheduledSessions.findIndex(s => s.date === targetDate && s.status === 'scheduled');
                            if (sessionIndex !== -1) {
                                // Mark found session as completed
                                const updatedSessions = [...scheduledSessions];
                                updatedSessions[sessionIndex] = { ...updatedSessions[sessionIndex], status: 'completed' };
                                bookingStoreState.updateLearnerData(learnerId, {
                                    activePackage: { ...learnerBookingData.activePackage, scheduledSessions: updatedSessions }
                                });
                            } else {
                                // Push a completed session manually
                                const updatedSessions = [...scheduledSessions, {
                                    id: `auto-log-${Date.now()}`,
                                    date: targetDate,
                                    time: '12:00', // Default fallback time
                                    status: 'completed',
                                    notes: 'Auto-completed via Session Log',
                                    duration: newSession.duration || 60
                                } as any];
                                bookingStoreState.updateLearnerData(learnerId, {
                                    activePackage: { ...learnerBookingData.activePackage, scheduledSessions: updatedSessions, remaining: Math.max(0, learnerBookingData.activePackage.remaining - 1) }
                                });
                            }
                        }
                    }

                } catch (error) {
                    logError("Failed during AI session finalization", error instanceof Error ? error.stack : String(error));
                } finally {
                    setLoading(false);
                }
            },
            
            updateSession: (learnerId, updatedSession) => set(state => ({
                learners: state.learners.map(l => l.id === learnerId ? { ...l, sessions: (l.sessions || []).map(s => s.id === updatedSession.id ? updatedSession : s) } : l)
            })),
            
            removeSession: (learnerId, sessionId) => set(state => {
                const learner = state.learners.find(l => l.id === learnerId);
                if (learner) {
                    const session = (learner.sessions || []).find(s => s.id === sessionId);
                    if (session && session.attended) {
                        const hours = (session.duration || 0) / 60;
                        if (hours > 0) {
                            const appStore = useAppStore.getState();
                            const currentHistorical = appStore.tutorInfo?.historicalHoursTaught || 0;
                            appStore.setTutorInfo({
                                historicalHoursTaught: currentHistorical + hours
                            });
                        }
                    }
                }
                return {
                    learners: state.learners.map(l => l.id === learnerId ? { ...l, sessions: (l.sessions || []).filter(s => s.id !== sessionId) } : l)
                };
            }),

            addSessionToGroup: async (groupId, sessionData) => {
                const { getGroupById, learners, updateGroupClass } = get();
                const { setLoading, logError } = useAppStore.getState();
                const { addTodo } = useTodoStore.getState();
                const group = getGroupById(groupId);
                if (!group) return;
        
                if (!sessionData.script?.trim()) {
                    const newSession: Session = { ...sessionData, id: `s_group_${Date.now()}`, aiAnalysis: null, reviewQuestions: null, skillsLearned: [], needsHelp: [] };
                    const updatedGroup = { ...group, sessions: [newSession, ...(group.sessions || [])] };
                    updateGroupClass(updatedGroup);
                    return;
                }
        
                setLoading(true);
                try {
                    const participants = learners.filter(l => (group.participantIds || []).includes(l.id));
        
                    const groupAsLearnerForAI = {
                        id: group.id,
                        name: group.name,
                        interests: [...new Set(participants.flatMap(p => (p.interests || '').split(',').map(i => i.trim()).filter(Boolean)))].join(', '),
                        coursePlan: group.coursePlan,
                        facts: group.facts,
                        sessions: group.sessions,
                        email: '', phone: '', country: 'Group', languages: [], occupation: 'Group Class', major: '', dateCreated: group.dateCreated, xp: 0, streak: 0, competencies: [], gender: 'Other', avatarId: group.avatarId, needs: group.needs || [],
                    } as any;
        
                    const analysis = await getAIComprehensiveSessionAnalysis({
                        script: sessionData.script || '',
                        lessonSummary: sessionData.lessonSummary,
                        learnerInterests: groupAsLearnerForAI.interests,
                        learnerLevel: groupAsLearnerForAI.coursePlan.level,
                        learnerCompetencies: '', // Not applicable for groups in this manner
                        learnerNeeds: (group.needs || []).map(n => n.name).join(', '),
                        isGroup: true,
                        groupName: group.name,
                    });

                    if (analysis?.suggestedTodos && analysis.suggestedTodos.length > 0) {
                        analysis.suggestedTodos.forEach(todoText => {
                            addTodo({
                                text: todoText,
                                groupId: group.id,
                                groupName: group.name,
                                completed: false,
                                priority: 'Medium'
                            });
                        });
                    }
        
                    const newSession: Session = {
                        ...sessionData,
                        id: `s_group_${Date.now()}`,
                        skillsLearned: analysis?.strengths || [],
                        needsHelp: analysis?.weaknesses || [],
                        reviewQuestions: analysis?.reviewQuestions || null,
                        aiAnalysis: analysis,
                        weaknessDetails: (analysis as any)?.weaknessDetails || [],
                        personalizedGreetings: analysis?.personalizedGreetings || [],
                        personalizedGoodbyes: analysis?.personalizedGoodbyes || [],
                    } as any;
                    
                    const chatMessages = await generateAIChatMessages(groupAsLearnerForAI, newSession, [], true);
                    if (chatMessages) {
                        newSession.chatMessages = chatMessages;
                    }
        
                    let updatedGroupData: GroupClass = { ...group };
        
                    const newFactsFromAI = analysis?.facts || [];
                    if (newFactsFromAI.length > 0) {
                        const currentFactsArray = Array.isArray(group.facts) ? group.facts : (typeof group.facts === 'string' ? group.facts.split('.') : []);
                        const existingFactsSet = new Set(currentFactsArray.map(f => f.trim().toLowerCase().replace(/\.$/, '')).filter(Boolean));
                        const trulyNewFacts = newFactsFromAI.filter(newFact => {
                            const normalizedFact = newFact.trim().toLowerCase().replace(/\.$/, '');
                            return normalizedFact && !existingFactsSet.has(normalizedFact);
                        });
                        if (trulyNewFacts.length > 0) {
                            const allFacts = [...currentFactsArray.map(f => f.trim()).filter(Boolean), ...trulyNewFacts];
                            updatedGroupData.facts = allFacts;
                        }
                    }
                    
                    updatedGroupData.sessions = [newSession, ...(group.sessions || [])];
                    
                    updateGroupClass(updatedGroupData);
        
                } catch (error) {
                    logError("Failed during AI group session processing", error instanceof Error ? error.stack : String(error));
                } finally {
                    setLoading(false);
                }
            },

            updateSessionInGroup: (groupId, updatedSession) => set(state => ({
                groupClasses: state.groupClasses.map(g => 
                    g.id === groupId 
                    ? { ...g, sessions: (g.sessions || []).map(s => s.id === updatedSession.id ? updatedSession : s) }
                    : g
                )
            })),

            removeSessionFromGroup: (groupId, sessionId) => set(state => ({
                groupClasses: state.groupClasses.map(g =>
                    g.id === groupId
                    ? { ...g, sessions: (g.sessions || []).filter(s => s.id !== sessionId) }
                    : g
                )
            })),

            addCompetency: (learnerId, competencyData) => {
                const newCompetency: Competency = { ...competencyData, id: `c${Date.now()}` };
                set(state => ({ learners: state.learners.map(l => l.id === learnerId ? { ...l, competencies: [...l.competencies, newCompetency] } : l) }));
            },

            updateCompetency: (learnerId, updatedCompetency) => set(state => ({ learners: state.learners.map(l => l.id === learnerId ? { ...l, competencies: l.competencies.map(c => c.id === updatedCompetency.id ? updatedCompetency : c) } : l) })),
            
            removeCompetency: (learnerId, competencyId) => set(state => ({ learners: state.learners.map(l => l.id === learnerId ? { ...l, competencies: l.competencies.filter(c => c.id !== competencyId) } : l) })),

            addNeed: (learnerId, needData) => {
                const newNeed: Need = { ...needData, id: `n${Date.now()}` };
                set(state => ({ learners: state.learners.map(l => l.id === learnerId ? { ...l, needs: [...l.needs, newNeed] } : l) }));
            },

            updateNeed: (learnerId, updatedNeed) => set(state => ({ learners: state.learners.map(l => l.id === learnerId ? { ...l, needs: l.needs.map(n => n.id === updatedNeed.id ? updatedNeed : n) } : l) })),

            removeNeed: (learnerId, needId) => set(state => ({ learners: state.learners.map(l => l.id === learnerId ? { ...l, needs: l.needs.filter(n => n.id !== needId) } : l) })),

            addSkill: (learnerId, needId, skillName) => {
                const newSkill: Skill = { id: `sk${Date.now()}`, name: skillName, progress: 0 };
                set(state => ({ learners: state.learners.map(l => l.id === learnerId ? { ...l, needs: l.needs.map(n => n.id === needId ? { ...n, learningPath: [...n.learningPath, newSkill] } : n) } : l) }));
            },
            
            updateSkillProgress: (learnerId, needId, skillId, change) => set(state => ({
                learners: state.learners.map(l => l.id === learnerId ? { ...l, xp: (Number(l.xp) || 0) + change, needs: l.needs.map(n => n.id === needId ? { ...n, learningPath: n.learningPath.map(s => s.id === skillId ? { ...s, progress: Math.max(0, Math.min(100, s.progress + change)) } : s) } : n) } : l)
            })),
            
            updateLearnerXP: (learnerId, amount) => set(state => ({ learners: state.learners.map(l => l.id === learnerId ? { ...l, xp: (Number(l.xp) || 0) + amount } : l) })),
            
            toggleCompetition: (learnerId) => set(state => ({
                learners: state.learners.map(l => 
                    l.id === learnerId ? { ...l, isCompeting: !(l.isCompeting || false) } : l
                )
            })),

            declareWinner: (winnerId, loserId) => set(state => {
                const winner = state.learners.find(l => l.id === winnerId);
                const loser = state.learners.find(l => l.id === loserId);

                if (!winner || !loser) return state;

                // Bonus XP auto-awarded for winning a weekly duel
                const WIN_BONUS_XP = 100;
                const now = new Date();
                const todayISO = now.toISOString().split('T')[0];
                const weekRecord: WeeklyWinRecord = {
                    week: getWeekNumber(now),
                    year: now.getFullYear(),
                    date: todayISO,
                    opponentId: loser.id,
                    opponentName: loser.name,
                    bonusXp: WIN_BONUS_XP
                };

                const updatedWinner = {
                    ...winner,
                    competitionWins: (winner.competitionWins || 0) + 1,
                    xp: (winner.xp || 0) + WIN_BONUS_XP,
                    currentOpponentId: null,
                    weeklyWinRecords: [
                        ...(winner.weeklyWinRecords || []),
                        weekRecord
                    ],
                    matchHistory: [
                        ...(winner.matchHistory || []),
                        {
                            opponentName: loser.name,
                            opponentAvatarId: loser.avatarId,
                            opponentGender: loser.gender,
                            date: todayISO,
                            week: weekRecord.week,
                            year: weekRecord.year,
                            bonusXp: WIN_BONUS_XP
                        }
                    ]
                };

                const updatedLoser = {
                    ...loser,
                    currentOpponentId: null
                };

                return {
                    learners: state.learners.map(l => {
                        if (l.id === winnerId) return updatedWinner;
                        if (l.id === loserId) return updatedLoser;
                        return l;
                    })
                };
            }),

            assignMatches: () => {
                const curWeek = getWeekNumber(new Date());
                const curYear = new Date().getFullYear();
                set(state => {
                    const learnersToUpdate = [...state.learners];
                    
                    // First, clear any existing matches for competing players who have an opponent
                    for (let i = 0; i < learnersToUpdate.length; i++) {
                        if (learnersToUpdate[i].isCompeting && learnersToUpdate[i].currentOpponentId) {
                            learnersToUpdate[i].currentOpponentId = null;
                        }
                    }
                    
                    // Get a pool of available competitors (competing and not already matched in this run)
                    const pool = learnersToUpdate.filter(l => l.isCompeting && !l.currentOpponentId);

                    // Group by category so learners compete two-by-two INSIDE their own theme
                    const byCategory = new Map<string, typeof pool>();
                    pool.forEach(l => {
                        const key = l.category || 'none';
                        if (!byCategory.has(key)) byCategory.set(key, []);
                        byCategory.get(key)!.push(l);
                    });

                    const pairPool: typeof pool = [];
                    byCategory.forEach(group => {
                        // Shuffle each category group (Fisher-Yates shuffle)
                        for (let i = group.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [group[i], group[j]] = [group[j], group[i]];
                        }
                        pairPool.push(...group);
                    });

                    // Pair them up two by two within the same category
                    for (let i = 0; i < pairPool.length - 1; i += 2) {
                        const learnerA = pairPool[i];
                        const learnerB = pairPool[i+1];

                        // Safety: never pair learners from different categories
                        if ((learnerA.category || 'none') !== (learnerB.category || 'none')) continue;

                        const indexA = learnersToUpdate.findIndex(l => l.id === learnerA.id);
                        const indexB = learnersToUpdate.findIndex(l => l.id === learnerB.id);

                        if(indexA !== -1 && indexB !== -1) {
                            learnersToUpdate[indexA].currentOpponentId = learnerB.id;
                            learnersToUpdate[indexB].currentOpponentId = learnerA.id;
                        }
                    }
                    
                    return { learners: learnersToUpdate, competitionRoundWeek: curWeek, competitionRoundYear: curYear };
                });
                alert('New weekly matches assigned — learners were paired two-by-two inside their own category!');
            },

            // ── Self-running engine: every Sunday at the deadline the round rolls over. ──
            // 1) Any mutual pair still active when the round ends is settled automatically
            //    (winner gets +100 bonus XP + a Week record, computed from the 7-day stats),
            // 2) then fresh same-category pairs are assigned for the new week.
            ensureCompetitionRound: () => {
                const now = new Date();
                const curWeek = getWeekNumber(now);
                const curYear = now.getFullYear();
                const activeWeek = get().competitionRoundWeek;
                const activeYear = get().competitionRoundYear;

                // Already inside the active round's week → nothing to roll over yet.
                if (activeWeek !== null && activeWeek === curWeek && activeYear === curYear) return;

                set(state => {
                    let learners2 = [...state.learners];
                    // Digest recorded for the round being settled (winners, ties + per-pair XP snapshots)
                    const settlementPairs: CompetitionSettlementPair[] = [];

                    // ── 1) Settle mutual pairs from the round that just ended ──
                    if (activeWeek !== null && activeYear !== null) {
                        const homework = useAutomationStore.getState().homeworkAssignments;
                        const WIN_BONUS_XP = 100;
                        const todayISO = now.toISOString().split('T')[0];
                        const learnersMap = new Map(learners2.map(l => [l.id, l]));
                        const processed = new Set<string>();

                        learners2.forEach(a => {
                            if (!a.isCompeting || !a.currentOpponentId || processed.has(a.id)) return;
                            const b = learnersMap.get(a.currentOpponentId);
                            if (!b || !b.isCompeting || b.currentOpponentId !== a.id) return;
                            processed.add(a.id);
                            processed.add(b.id);

                            const statsA = getWeeklyActivityStats(a, homework);
                            const statsB = getWeeklyActivityStats(b, homework);
                            const edge = compareWeeklyStats(statsA, statsB);

                            if (edge === 0) {
                                // Tied week — no declared winner, both free for the next round.
                                learnersMap.set(a.id, { ...a, currentOpponentId: null });
                                learnersMap.set(b.id, { ...b, currentOpponentId: null });
                                settlementPairs.push({
                                    category: a.category || 'none',
                                    tie: true,
                                    a: { id: a.id, name: a.name, xp: statsA.xpEarned },
                                    b: { id: b.id, name: b.name, xp: statsB.xpEarned }
                                });
                                return;
                            }

                            const winner = edge > 0 ? a : b;
                            const loser = edge > 0 ? b : a;
                            const weekRecord: WeeklyWinRecord = {
                                week: activeWeek,
                                year: activeYear,
                                date: todayISO,
                                opponentId: loser.id,
                                opponentName: loser.name,
                                bonusXp: WIN_BONUS_XP
                            };
                            learnersMap.set(winner.id, {
                                ...winner,
                                competitionWins: (winner.competitionWins || 0) + 1,
                                xp: (winner.xp || 0) + WIN_BONUS_XP,
                                currentOpponentId: null,
                                weeklyWinRecords: [
                                    ...(winner.weeklyWinRecords || []),
                                    weekRecord
                                ],
                                matchHistory: [
                                    ...(winner.matchHistory || []),
                                    {
                                        opponentName: loser.name,
                                        opponentAvatarId: loser.avatarId,
                                        opponentGender: loser.gender,
                                        date: todayISO,
                                        week: weekRecord.week,
                                        year: weekRecord.year,
                                        bonusXp: WIN_BONUS_XP
                                    }
                                ]
                            });
                            learnersMap.set(loser.id, { ...loser, currentOpponentId: null });
                            settlementPairs.push({
                                category: a.category || 'none',
                                tie: false,
                                a: { id: a.id, name: a.name, xp: edge > 0 ? statsA.xpEarned : statsB.xpEarned },
                                b: { id: b.id, name: b.name, xp: edge > 0 ? statsB.xpEarned : statsA.xpEarned },
                                winnerId: winner.id,
                                loserId: loser.id,
                                bonusXp: WIN_BONUS_XP
                            });
                        });

                        learners2 = Array.from(learnersMap.values());
                    }

                    // Learners who opted out keep no stale opponent.
                    learners2 = learners2.map(l => (l.isCompeting ? l : { ...l, currentOpponentId: null }));

                    // ── 2) Fresh same-category pairings for the new week ──
                    const pool = learners2.filter(l => l.isCompeting && !l.currentOpponentId);
                    const byCategory = new Map<string, typeof pool>();
                    pool.forEach(l => {
                        const key = l.category || 'none';
                        if (!byCategory.has(key)) byCategory.set(key, []);
                        byCategory.get(key)!.push(l);
                    });
                    const pairPool: typeof pool = [];
                    byCategory.forEach(group => {
                        for (let i = group.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [group[i], group[j]] = [group[j], group[i]];
                        }
                        pairPool.push(...group);
                    });
                    for (let i = 0; i + 1 < pairPool.length; i += 2) {
                        const a = pairPool[i];
                        const b = pairPool[i + 1];
                        if ((a.category || 'none') !== (b.category || 'none')) continue;
                        learners2 = learners2.map(l =>
                            l.id === a.id ? { ...l, currentOpponentId: b.id } :
                            l.id === b.id ? { ...l, currentOpponentId: a.id } :
                            l
                        );
                    }

                    let lastSettledRound = state.lastSettledRound;
                    // Only publish a settlement digest when the ended round actually had mutual pairs to settle
                    if (settlementPairs.length > 0) {
                        lastSettledRound = {
                            week: activeWeek!,
                            year: activeYear!,
                            date: now.toISOString().split('T')[0],
                            pairs: settlementPairs
                        };
                    }

                    return {
                        learners: learners2,
                        competitionRoundWeek: curWeek,
                        competitionRoundYear: curYear,
                        lastSettledRound
                    };
                });
            },
            
            addChatMessageToLearner: (learnerId, message) => set(state => {
                const learnerIndex = state.learners.findIndex(l => l.id === learnerId);
                if (learnerIndex === -1) return state;

                const learner = state.learners[learnerIndex];
                let sessions = learner.sessions ? [...learner.sessions] : [];
                
                // If no sessions exist, create a placeholder session to store chats.
                // This ensures the message is saved even for new learners.
                if (sessions.length === 0) {
                    const placeholderSession: Session = {
                        id: `s_chat_${Date.now()}`,
                        learnerId: learnerId,
                        status: 'completed',
                        topics: [],
                        notes: '',
                        date: new Date().toISOString().split('T')[0],
                        attended: true,
                        duration: 0,
                        script: '',
                        reflection: '',
                        aiAnalysis: { // Minimal valid analysis object
                            summary: "System generated session for chat history.",
                            strengths: [],
                            weaknesses: [],
                            keyLearnings: [],
                        },
                        lessonName: "General Chat",
                        chatMessages: []
                    };
                    sessions.push(placeholderSession);
                }

                // Find the latest session with AI Analysis or just the latest session
                const sessionsWithChat = sessions
                    .filter(s => s.aiAnalysis)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                let targetSessionId: string;

                if (sessionsWithChat.length > 0) {
                    targetSessionId = sessionsWithChat[0].id;
                } else {
                    // Fallback to absolute latest session if none have AI analysis
                    const sortedSessions = sessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    targetSessionId = sortedSessions[0].id;
                }

                const updatedLearner = {
                    ...learner,
                    sessions: sessions.map(s => {
                        if (s.id === targetSessionId) {
                            return {
                                ...s,
                                chatMessages: [...(s.chatMessages || []), message]
                            };
                        }
                        return s;
                    })
                };

                const newLearners = [...state.learners];
                newLearners[learnerIndex] = updatedLearner;

                return { learners: newLearners };
            }),
        }),
        {
            name: 'learner-profile-storage',
            storage: createJSONStorage(() => idbZustandStorage),                partialize: (state) => ({
                    learners: dehydrateLearners(state.learners),
                    groupClasses: state.groupClasses,
                    competitionRoundWeek: state.competitionRoundWeek,
                    competitionRoundYear: state.competitionRoundYear,
                    lastSettledRound: state.lastSettledRound,
                }),
        }
    )
);
