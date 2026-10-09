import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLearnerStore } from '../../store/useLearnerStore';
import { GroupClass, Learner, Session, CalendarEvent, CourseLevel } from '../../types2';
import { normalizeCefrLevel } from '../../utils/cefrGrammarDictionary';
import { getAICopilotResponse } from '../../services/geminiService2';
import confetti from 'canvas-confetti';
import { format, subDays, addDays } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  AreaChart,
  Area
} from 'recharts';

import GroupProfileHeader from '../../components/app2/profile/group/GroupProfileHeader';
import GroupParticipantsManager from '../../components/app2/profile/group/GroupParticipantsManager';
import GroupLessonBrief from '../../components/app2/profile/group/GroupLessonBrief';
import {
    buildGroupLessonFacts,
    courseLevelToCefr,
    groupL1FromRoster,
    rosterAsLearners,
    rosterParticipantIdFromLearnerId,
} from '../../services/groupParticipants';
import SectionCard from '../../components/app2/SectionCard';
import { EditableCoursePlan } from '../../components/app2/profile/EditableCoursePlan';
import SessionLog from '../../components/app2/profile/SessionLog';
import AddSessionForm from '../../components/app2/profile/AddSessionForm';
import GroupNeedsAndWants from '../../components/app2/profile/group/GroupNeedsAndWants';
import AttendanceTracker from '../../components/app2/AttendanceTracker';
import Modal from '../../components/app2/Modal';
import DateActionModal from '../../components/app2/profile/DateActionModal';
import PrintableGroupOverview from '../../components/app2/profile/group/PrintableGroupOverview';
import GroupReport from '../../components/app2/profile/group/GroupReport';
import { useCalendarStore } from '../../store/useCalendarStore';
import CompetencySection from '../../components/app2/profile/CompetencySection';
import Feedback from '../../components/app2/profile/Feedback';
import LearningChallenges from '../../components/app2/profile/RecycleBin';
import FunFacts from '../../components/app2/profile/FunFacts';
import AIChatGenerator from '../../components/app2/profile/AIChatGenerator';
import LearningPathTimeline from '../../components/app2/profile/overview/LearningPathTimeline';
import LearnerPage from '../../pages/LearnerPage';
import CompetitionTab from '../../components/app2/profile/CompetitionTab';
import BookingSystem from '../../components/app2/profile/automation/BookingSystem';

// ── Custom Sub-tab State Types ──
type ActiveTab = 'profile' | 'generator' | 'overview' | 'activity' | 'calendar' | 'feedback' | 'competition' | 'automation';
type OverviewSubTab = 'overview' | 'achievements' | 'progress' | 'learningPath' | 'skillTree' | 'heatmap' | 'records';
type ActivitySubTab = 'history' | 'homework' | 'exam' | 'spaced' | 'reviews';
type FeedbackSubTab = 'feedback' | 'challenges' | 'facts' | 'chat' | 'copilot' | 'challengeBoard';
type AutomationSubTab = 'payments' | 'resources' | 'comparison';

// ── Types for local homework and exams persistence on GroupClass ──
interface GroupHomework {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    xpReward: number;
    completedLearnerIds: string[];
}

interface GroupExam {
    id: string;
    title: string;
    date: string;
    maxScore: number;
    scores: Record<string, number>;
}

interface GroupResource {
    id: string;
    name: string;
    type: 'pdf' | 'doc' | 'audio' | 'link';
    url: string;
    dateAdded: string;
}

// ── Minimalist Skeleton for Loading ──
const TabSkeleton = () => (
    <div className="animate-pulse space-y-4 p-4">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-32 bg-gray-200 rounded w-full"></div>
    </div>
);

// Helper to safely trigger a burst of confetti
const triggerCelebration = () => {
    confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
    });
};

interface App1ProfileProps {
    groups?: any[];
    setGroups?: any;
    groupContent?: any;
    setGroupContent?: any;
    platforms?: any[];
    tutorProfile?: any;
}

const GroupProfile: React.FC<App1ProfileProps> = (props) => {
    const { id } = useParams<{ id: string }>();
    const group = useLearnerStore(state => state.getGroupById(id!));

    const updateGroupClass = useLearnerStore(state => state.updateGroupClass);
    const learners = useLearnerStore(state => state.learners);
    const updateLearner = useLearnerStore(state => state.updateLearner);
    const updateGroupParticipant = useLearnerStore(state => state.updateGroupParticipant);
    const addSessionToGroup = useLearnerStore(state => state.addSessionToGroup);
    const updateSessionInGroup = useLearnerStore(state => state.updateSessionInGroup);
    const removeSessionFromGroup = useLearnerStore(state => state.removeSessionFromGroup);
    
    const calendarEvents = useCalendarStore(state => state.calendarEvents);
    const addCalendarEvent = useCalendarStore(state => state.addCalendarEvent);
    const updateCalendarEvent = useCalendarStore(state => state.updateCalendarEvent);
    
    // Tab states matching LearnerProfile
    const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
    const [overviewSubTab, setOverviewSubTab] = useState<OverviewSubTab>('overview');
    const [activitySubTab, setActivitySubTab] = useState<ActivitySubTab>('history');
    const [feedbackSubTab, setFeedbackSubTab] = useState<FeedbackSubTab>('feedback');
    const [automationSubTab, setAutomationSubTab] = useState<AutomationSubTab>('payments');

    // Modals & form state
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
    const [isDateActionModalOpen, setIsDateActionModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // Individual learner editor modal state
    const [selectedLearnerForEdit, setSelectedLearnerForEdit] = useState<Learner | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        xp: 0,
        level: CourseLevel.Beginner,
        l1Language: '',
        occupation: '',
        notes: '',
        factsRaw: '',
    });

    // Form states for adding homework, exams, and resources
    const [showAddHw, setShowAddHw] = useState(false);
    const [newHwForm, setNewHwForm] = useState({ title: '', description: '', dueDate: '', xpReward: 50 });
    const [showAddExam, setShowAddExam] = useState(false);
    const [newExamForm, setNewExamForm] = useState({ title: '', date: '', maxScore: 100 });
    const [showAddResource, setShowAddResource] = useState(false);
    const [newResourceForm, setNewResourceForm] = useState({ name: '', type: 'pdf' as 'pdf' | 'doc' | 'audio' | 'link', url: '' });

    // Copilot interaction state
    const [copilotInput, setCopilotInput] = useState('');
    const [copilotResponse, setCopilotResponse] = useState('');
    const [isCopilotLoading, setIsCopilotLoading] = useState(false);

    // Search, pagination and sorting states for 30+ students support
    const [hwSearchQuery, setHwSearchQuery] = useState('');
    const [hwStatusFilter, setHwStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
    const [hwSortBy, setHwSortBy] = useState<'name' | 'status'>('name');

    const [examSearchQuery, setExamSearchQuery] = useState('');
    const [examSortBy, setExamSortBy] = useState<'name' | 'scoreAsc' | 'scoreDesc'>('name');

    const [profilesSearchQuery, setProfilesSearchQuery] = useState('');
    const [profilesPage, setProfilesPage] = useState(1);
    const [compSearchQuery, setCompSearchQuery] = useState('');
    const [gridSearchQuery, setGridSearchQuery] = useState('');

    const handleUpdateGroup = useCallback((updatedGroup: GroupClass) => {
        updateGroupClass(updatedGroup);
    }, [updateGroupClass]);

    const handleSaveSession = useCallback(async (sessionData: Session | Omit<Session, 'id' | 'aiAnalysis'>) => {
        if (!group) return;
        if ('id' in sessionData) {
            updateSessionInGroup(group.id, sessionData as Session);
        } else {
            await addSessionToGroup(group.id, sessionData);
        }
    }, [group, addSessionToGroup, updateSessionInGroup]);

    const handleOpenAddSessionModal = () => {
        setSessionToEdit(null);
        setIsSessionModalOpen(true);
    };

    const handleEditSession = (session: Session) => {
        setSessionToEdit(session);
        setIsSessionModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsSessionModalOpen(false);
        setSessionToEdit(null);
    };

    const handleRemoveSession = (sessionId: string) => {
        if (!group) return;
        if (confirm('Are you sure you want to delete this session?')) {
            removeSessionFromGroup(group.id, sessionId);
        }
    };

    const handleUpdateSession = (session: Session) => {
        if (!group) return;
        updateSessionInGroup(group.id, session);
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setIsDateActionModalOpen(true);
    };
    
    const handleSaveEvent = (eventData: CalendarEvent) => {
        if (eventData.id) {
            updateCalendarEvent(eventData);
        } else {
            addCalendarEvent(eventData);
        }
        setIsDateActionModalOpen(false);
    };

    if (!group) {
        return <div className="text-center p-10 font-bold text-gray-500">Group class not found or loading...</div>;
    }

    /*
     * WHO IS IN THIS CLASS
     *
     * Two sources, on purpose. `participantIds` links real learner accounts (the older way
     * of building a group, still honoured). `participantsData` is the roster — the people the
     * tutor typed in or imported from a transcript, who deliberately have no accounts. Both
     * are presented as learners so every tab (Overview, Sessions, Calendar, Feedback,
     * Competition, Automation) works on the class that actually exists: before this, a class
     * built from a transcript showed up as empty in every tab but Profile.
     */
    const linkedParticipants = learners.filter(l => (group.participantIds || []).includes(l.id));
    const rosterParticipants = rosterAsLearners(group.participantsData || [], group);
    const participants = [...linkedParticipants, ...rosterParticipants] as Learner[];
    const groupEvents = calendarEvents.filter(e => e.groupId === group.id);

    // Dynamic aggregated statistics
    const totalGroupXP = participants.reduce((sum, p) => sum + (p.xp || 0), 0);
    const avgGroupXP = participants.length > 0 ? Math.round(totalGroupXP / participants.length) : 0;
    const totalGroupSessions = group.sessions?.length || 0;
    const totalStudyHours = group.sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) / 60 || 0;

    // Attendance calculation
    const totalScheduled = group.sessions?.length || 0;
    const totalAttended = group.sessions?.filter(s => s.attended).length || 0;
    const groupAttendanceRate = totalScheduled > 0 ? Math.round((totalAttended / totalScheduled) * 100) : 100;

    /*
     * The group → lesson-AI bridge.
     *
     * Every lesson is generated from the `facts` and `interests` of the learner handed to
     * the generator. For a GROUP those fields hold the ROSTER: one line per participant
     * (name, CEFR, facts, interests, goals, how to use them) plus the tutor's mandatory
     * questioning plan. That is the whole trick — the group inherits every individual
     * lesson feature (Step 1/2/3, activities, companions) with no change to the generator,
     * and the AI is told who to ask what instead of treating the class as one learner with
     * contradictory facts.
     */
    const roster = group.participantsData || [];
    const rosterBrief = buildGroupLessonFacts(roster, group.groupRouting);
    // What the class as a whole can be translated into: one shared L1, or 'Multiple' when
    // the room is mixed. The generator reads `l1Language`, so the translation block in every
    // prompt is right for the group instead of guessing.
    const classL1 = groupL1FromRoster(roster);

    // Prepare group as simulated Learner object for standard sub-components
    const groupAsLearnerForAI = {
        ...group,
        id: group.id,
        name: group.name,
        interests: rosterBrief.interests || [...new Set(participants.flatMap(p => p.interests?.split(', ') || []))].filter(Boolean).join(', '),
        needs: group.needs || [],
        sessions: group.sessions || [],
        coursePlan: group.coursePlan,
        facts: rosterBrief.facts,
        // ── The class ceiling, so the generators write to the level and grammar tier
        //    chosen when the class was created (the individual profile's pair) ──
        cefrLevel: normalizeCefrLevel((group as any).cefrLevel || (group as any).level, 'B1'),
        cefrTier: (group as any).cefrTier || 1,
        // ── The handles every lesson prompt reads (`groupClassPromptBlock`) ──
        isGroupClass: true,
        groupRoster: rosterBrief.facts.join('\n'),
        groupRouting: group.groupRouting || '',
        groupNames: rosterBrief.names,
        groupL1: classL1,
        groupLearnerCount: roster.length,
        // Only claim a shared L1 when the roster actually has one. 'Multiple' means the class
        // is deliberately mixed; undefined means nobody's L1 is known yet, which must fall
        // through to the generator's own default rather than being reported as "mixed".
        l1Language: classL1 || undefined,
        email: '', phone: '', country: '', languages: [], occupation: 'Group Class', major: '', dateCreated: group.dateCreated, xp: totalGroupXP, streak: 0, gender: 'Other' as const, avatarId: group.avatarId,
        competencies: group.competencies || [],
    };

    // ── Open learner editor form ──
    const handleEditLearner = (learner: Learner) => {
        setSelectedLearnerForEdit(learner);
        setEditForm({
            name: learner.name || '',
            email: learner.email || '',
            xp: learner.xp || 0,
            level: learner.level || CourseLevel.Beginner,
            l1Language: learner.l1Language || '',
            occupation: learner.occupation || '',
            notes: learner.notes || '',
            factsRaw: Array.isArray(learner.facts) ? learner.facts.join('\n') : '',
        });
    };

    /*
     * ── Save the edited learner ──
     *
     * A roster learner is edited IN PLACE on the class: writing them through
     * `updateLearner` would fabricate an individual account for somebody who asked for
     * none, and the class would keep showing the old values. So the roster path maps the
     * form back onto the roster record (XP → progress, CEFR → level, facts → facts).
     */
    const handleSaveLearnerEdit = () => {
        if (!selectedLearnerForEdit) return;
        const processedFacts = editForm.factsRaw
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
        const rosterId = rosterParticipantIdFromLearnerId(selectedLearnerForEdit.id);

        if (rosterId) {
            const existing = (group.participantsData || []).find(p => p.id === rosterId);
            if (existing) {
                updateGroupParticipant(group.id, {
                    ...existing,
                    name: editForm.name,
                    email: editForm.email,
                    cefr: courseLevelToCefr(editForm.level, existing.cefr),
                    l1: editForm.l1Language,
                    progress: Math.max(0, Math.min(100, Math.round(Number(editForm.xp) / 10))),
                    notes: editForm.notes,
                    facts: processedFacts.filter(l => !/^\[(Interests|Goals|L1|How to use them in class)\]/i.test(l)).join('\n'),
                });
            }
            setSelectedLearnerForEdit(null);
            triggerCelebration();
            return;
        }

        updateLearner({
            ...selectedLearnerForEdit,
            name: editForm.name,
            email: editForm.email,
            xp: Number(editForm.xp),
            level: editForm.level,
            l1Language: editForm.l1Language,
            occupation: editForm.occupation,
            notes: editForm.notes,
            facts: processedFacts,
        });

        setSelectedLearnerForEdit(null);
        triggerCelebration();
    };

    /*
     * XP for a class works for both kinds of learner: a linked account keeps its XP, and a
     * roster learner's XP is their progress — so marking homework complete actually moves the
     * person forward instead of silently doing nothing for half the room.
     */
    const applyLearnerXp = (person: Learner, delta: number) => {
        const rosterId = rosterParticipantIdFromLearnerId(person.id);
        if (!rosterId) {
            updateLearner({ ...person, xp: Math.max(0, (person.xp || 0) + delta) });
            return;
        }
        const existing = (group.participantsData || []).find(p => p.id === rosterId);
        if (!existing) return;
        const nextProgress = Math.max(0, Math.min(100, Math.round(((Number(existing.progress) || 0) * 10 + delta) / 10)));
        updateGroupParticipant(group.id, { ...existing, progress: nextProgress });
    };

    // ── Persistent Homework Actions ──
    const homeworks: GroupHomework[] = (group as any).homeworks || [
        {
            id: 'hw-1',
            title: 'CEFR Vocab Drill',
            description: 'Complete the Unit 2 vocabulary drill in the online portal.',
            dueDate: format(addDays(new Date(), 4), 'yyyy-MM-dd'),
            xpReward: 100,
            completedLearnerIds: participants.slice(0, 1).map(p => p.id),
        }
    ];

    const handleCreateHomework = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHwForm.title.trim()) return;
        const newHw: GroupHomework = {
            id: `hw-${Date.now()}`,
            title: newHwForm.title,
            description: newHwForm.description,
            dueDate: newHwForm.dueDate || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
            xpReward: Number(newHwForm.xpReward) || 50,
            completedLearnerIds: [],
        };
        handleUpdateGroup({
            ...group,
            homeworks: [...homeworks, newHw]
        } as any);
        setNewHwForm({ title: '', description: '', dueDate: '', xpReward: 50 });
        setShowAddHw(false);
        triggerCelebration();
    };

    const handleToggleHomework = (hwId: string, studentId: string) => {
        const student = participants.find(s => s.id === studentId);
        if (!student) return;

        const updatedHws = homeworks.map(hw => {
            if (hw.id === hwId) {
                const isCompleted = hw.completedLearnerIds.includes(studentId);
                let newCompleted;
                if (isCompleted) {
                    newCompleted = hw.completedLearnerIds.filter(id => id !== studentId);
                    applyLearnerXp(student, -hw.xpReward);
                } else {
                    newCompleted = [...hw.completedLearnerIds, studentId];
                    applyLearnerXp(student, hw.xpReward);
                    triggerCelebration();
                }
                return { ...hw, completedLearnerIds: newCompleted };
            }
            return hw;
        });

        handleUpdateGroup({
            ...group,
            homeworks: updatedHws
        } as any);
    };

    // ── Persistent Exams Actions ──
    const exams: GroupExam[] = (group as any).exams || [
        {
            id: 'exam-1',
            title: 'Midterm Speech Assessment',
            date: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
            maxScore: 100,
            scores: participants.reduce((acc, p, idx) => {
                acc[p.id] = 80 + (idx * 5) % 20;
                return acc;
            }, {} as Record<string, number>),
        }
    ];

    const handleCreateExam = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExamForm.title.trim()) return;
        const newEx: GroupExam = {
            id: `exam-${Date.now()}`,
            title: newExamForm.title,
            date: newExamForm.date || format(new Date(), 'yyyy-MM-dd'),
            maxScore: Number(newExamForm.maxScore) || 100,
            scores: {},
        };
        handleUpdateGroup({
            ...group,
            exams: [...exams, newEx]
        } as any);
        setNewExamForm({ title: '', date: '', maxScore: 100 });
        setShowAddExam(false);
        triggerCelebration();
    };

    const handleSaveScore = (examId: string, studentId: string, score: number) => {
        const updatedExams = exams.map(ex => {
            if (ex.id === examId) {
                return {
                    ...ex,
                    scores: {
                        ...ex.scores,
                        [studentId]: score
                    }
                };
            }
            return ex;
        });
        handleUpdateGroup({
            ...group,
            exams: updatedExams
        } as any);
    };

    // ── Persistent Shared Resources ──
    const resources: GroupResource[] = (group as any).resources || [
        { id: 'res-1', name: 'Business Presentation Framework.pdf', type: 'pdf', url: '#', dateAdded: '2026-07-01' },
        { id: 'res-2', name: 'Idioms and Formal Expressions.doc', type: 'doc', url: '#', dateAdded: '2026-07-05' }
    ];

    const handleAddResource = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newResourceForm.name.trim()) return;
        const newRes: GroupResource = {
            id: `res-${Date.now()}`,
            name: newResourceForm.name,
            type: newResourceForm.type,
            url: newResourceForm.url || '#',
            dateAdded: format(new Date(), 'yyyy-MM-dd'),
        };
        handleUpdateGroup({
            ...group,
            resources: [...resources, newRes]
        } as any);
        setNewResourceForm({ name: '', type: 'pdf', url: '' });
        setShowAddResource(false);
        triggerCelebration();
    };

    // ── Copilot Query Handler ──
    const handleCopilotQuery = async () => {
        if (!copilotInput.trim()) return;
        setIsCopilotLoading(true);
        setCopilotResponse('');
        try {
            const res = await getAICopilotResponse(groupAsLearnerForAI as any, copilotInput);
            setCopilotResponse(res);
        } catch (err) {
            setCopilotResponse('Sorry, the AI model could not formulate a response at this time. Please check your API credentials.');
        } finally {
            setIsCopilotLoading(false);
        }
    };

    // ── Tab Component Builders ──
    const TabButton: React.FC<{ name: ActiveTab; label: string; icon: string }> = ({ name, label, icon }) => (
        <button
            onClick={() => setActiveTab(name)}
            className={`flex-1 font-bold py-3 px-4 rounded-t-lg transition-all border-b-4 flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base ${activeTab === name ? 'border-brand-purple text-brand-purple bg-purple-50/20 shadow-sm' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
            <i className={`fas ${icon}`}></i>
            <span className="hidden md:inline">{label}</span>
        </button>
    );

    const SubTabButton = <T extends string>({ name, label, icon, active, onClick }: { name: T; label: string; icon: string; active: boolean; onClick: () => void }) => (
        <button
            onClick={onClick}
            className={`font-semibold py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs md:text-sm ${active ? 'bg-brand-purple text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
            <i className={`fas ${icon}`}></i>
            {label}
        </button>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Group Header */}
            <GroupProfileHeader
                group={group}
                roster={roster}
                onUpdate={handleUpdateGroup}
                onGenerateReport={() => setIsReportModalOpen(true)}
            />

            {/* Main Navigation Tabs */}
            <div className="flex border-b border-gray-200 -mb-px overflow-x-auto scrollbar-none">
                <TabButton name="profile" label="Profile" icon="fa-users-cog" />
                <TabButton name="generator" label="Lessons" icon="fa-laptop-code" />
                <TabButton name="overview" label="Overview" icon="fa-chart-pie" />
                <TabButton name="activity" label="Sessions" icon="fa-rocket" />
                <TabButton name="calendar" label="Calendar" icon="fa-calendar-alt" />
                <TabButton name="feedback" label="Feedback" icon="fa-comments" />
                <TabButton name="competition" label="Competition" icon="fa-trophy" />
                <TabButton name="automation" label="Automation" icon="fa-cogs" />
            </div>

            {/* Main Content Area */}
            <div className="mt-6">
                {/* ── PROFILE TAB ── */}
                {activeTab === 'profile' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                        <div className="lg:col-span-2 space-y-8">
                            <CompetencySection learner={group} onUpdate={handleUpdateGroup as any} />
                        </div>
                        <div className="space-y-8">
                            <GroupParticipantsManager group={group} onUpdate={handleUpdateGroup} />
                            <GroupNeedsAndWants group={group} onUpdate={handleUpdateGroup} />
                            <EditableCoursePlan learner={group as any} onUpdate={handleUpdateGroup as any} />
                        </div>
                    </div>
                )}

                {/* ── GENERATOR HUB (LESSONS) TAB ── */}
                {activeTab === 'generator' && (
                    <div className="animate-fade-in -mx-4 sm:mx-0">
                        <LearnerPage
                            groupBriefTab={{
                                label: 'Group Plan (Step 2)',
                                node: <GroupLessonBrief group={group} roster={roster} onUpdate={handleUpdateGroup} />,
                            }}
                            isEmbedded={true}
                            embeddedLearnerId={id}
                            learners={[groupAsLearnerForAI as any]}
                            setLearners={(action) => {
                                const nextLearners = typeof action === 'function' ? action([groupAsLearnerForAI as any]) : action;
                                const updated = nextLearners.find(l => l.id === id);
                                if (updated) {
                                    handleUpdateGroup({ ...group, ...updated });
                                }
                            }}
                            allContent={props.groupContent || {}}
                            setAllContent={props.setGroupContent || (() => {})}
                            recentLearnerIds={[]}
                            setRecentLearnerIds={() => {}}
                            platforms={props.platforms || []}
                            tutorProfile={props.tutorProfile}
                        />
                    </div>
                )}

                {/* ── OVERVIEW TAB (7 SUB-TABS) ── */}
                {activeTab === 'overview' && (
                    <div className="animate-fade-in">
                        <SectionCard title="Group Overview & Analytics" icon={<i className="fas fa-chart-pie"></i>}>
                            <div className="flex flex-wrap gap-2 border-b pb-4 mb-6">
                                <SubTabButton name="overview" label="Overview" icon="fa-eye" active={overviewSubTab === 'overview'} onClick={() => setOverviewSubTab('overview')} />
                                <SubTabButton name="progress" label="Progress & Comparison" icon="fa-chart-bar" active={overviewSubTab === 'progress'} onClick={() => setOverviewSubTab('progress')} />
                                <SubTabButton name="achievements" label="Achievements" icon="fa-trophy" active={overviewSubTab === 'achievements'} onClick={() => setOverviewSubTab('achievements')} />
                                <SubTabButton name="learningPath" label="Learning Path" icon="fa-road" active={overviewSubTab === 'learningPath'} onClick={() => setOverviewSubTab('learningPath')} />
                                <SubTabButton name="skillTree" label="Skill Tree" icon="fa-sitemap" active={overviewSubTab === 'skillTree'} onClick={() => setOverviewSubTab('skillTree')} />
                                <SubTabButton name="heatmap" label="Heatmap" icon="fa-fire" active={overviewSubTab === 'heatmap'} onClick={() => setOverviewSubTab('heatmap')} />
                                <SubTabButton name="records" label="Records" icon="fa-medal" active={overviewSubTab === 'records'} onClick={() => setOverviewSubTab('records')} />
                            </div>

                            <div>
                                {overviewSubTab === 'overview' && (
                                    <PrintableGroupOverview group={group} participants={participants} />
                                )}

                                {overviewSubTab === 'progress' && (
                                    <div className="space-y-8 animate-fade-in">
                                        {/* Group Statistics Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-5 text-center shadow-sm">
                                                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">Combined XP</p>
                                                <p className="text-3xl font-extrabold text-purple-900">{totalGroupXP}</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-5 text-center shadow-sm">
                                                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Average Learner XP</p>
                                                <p className="text-3xl font-extrabold text-blue-900">{avgGroupXP}</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 text-center shadow-sm">
                                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Group Attendance</p>
                                                <p className="text-3xl font-extrabold text-emerald-900">{groupAttendanceRate}%</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 text-center shadow-sm">
                                                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Completed Classes</p>
                                                <p className="text-3xl font-extrabold text-amber-900">{totalGroupSessions}</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-5 text-center shadow-sm">
                                                <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Study Hours</p>
                                                <p className="text-3xl font-extrabold text-rose-900">{Math.round(totalStudyHours)} Hrs</p>
                                            </div>
                                        </div>

                                        {/* Recharts Bar Comparison Charts */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <i className="fas fa-trophy text-brand-purple"></i> XP Comparative Leaderboard
                                                </h4>
                                                <div className="h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={participants}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                                                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                                                            <Tooltip formatter={(value) => [`${value} XP`, 'XP']} />
                                                            <Bar dataKey="xp" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={40} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <i className="fas fa-calendar-check text-brand-blue"></i> Learner Attendance Logs
                                                </h4>
                                                <div className="h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={participants.map(p => ({
                                                            name: p.name,
                                                            rate: p.sessions?.length > 0 ? Math.round((p.sessions.filter(s => s.attended).length / p.sessions.length) * 100) : 100
                                                        }))}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                                                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} unit="%" />
                                                            <Tooltip formatter={(value) => [`${value}%`, 'Attendance Rate']} />
                                                            <Bar dataKey="rate" fill="#00C49F" radius={[4, 4, 0, 0]} barSize={40} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Individual Profile Quick Editing list */}
                                        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                                <div>
                                                    <h4 className="font-extrabold text-lg flex items-center gap-2 text-gray-900">
                                                        <i className="fas fa-user-edit text-brand-purple"></i> Learner Profiles Editor ({participants.length} in class)
                                                    </h4>
                                                    <p className="text-xs text-gray-500">Edit facts, levels, emails, and add/remove XP directly for each cohort member:</p>
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 text-xs">
                                                        <i className="fas fa-search"></i>
                                                    </span>
                                                    <input 
                                                        type="text"
                                                        placeholder="Search students..."
                                                        value={profilesSearchQuery}
                                                        onChange={e => {
                                                            setProfilesSearchQuery(e.target.value);
                                                            setProfilesPage(1); // reset to first page on search
                                                        }}
                                                        className="pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs w-full sm:w-64 focus:bg-white focus:ring-2 focus:ring-brand-purple focus:outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b text-xs text-gray-400 uppercase font-black">
                                                            <th className="pb-3">Learner name</th>
                                                            <th className="pb-3">Course Level</th>
                                                            <th className="pb-3">Experience (XP)</th>
                                                            <th className="pb-3">L1 Language</th>
                                                            <th className="pb-3">Facts</th>
                                                            <th className="pb-3 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y text-sm">
                                                        {(() => {
                                                            const filtered = participants.filter(p => 
                                                                p.name.toLowerCase().includes(profilesSearchQuery.toLowerCase()) ||
                                                                (p.l1Language || '').toLowerCase().includes(profilesSearchQuery.toLowerCase())
                                                            );
                                                            const itemsPerPage = 6;
                                                            const totalPages = Math.ceil(filtered.length / itemsPerPage);
                                                            const paginated = filtered.slice((profilesPage - 1) * itemsPerPage, profilesPage * itemsPerPage);

                                                            if (paginated.length === 0) {
                                                                 return (
                                                                     <tr>
                                                                         <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                                                                             {participants.length === 0 ? "No learners in this class yet. Add them from the Profile tab." : "No learner matches your search query."}
                                                                         </td>
                                                                     </tr>
                                                                 );
                                                             }

                                                             return (
                                                                 <>
                                                                     {paginated.map(p => (
                                                                         <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                                                             <td className="py-3.5 font-bold text-gray-900">{p.name}</td>
                                                                             <td className="py-3.5"><span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-bold">{p.level}</span></td>
                                                                             <td className="py-3.5 font-semibold text-gray-700">{p.xp || 0} XP</td>
                                                                             <td className="py-3.5 text-gray-500 font-medium">{p.l1Language || 'Not specified'}</td>
                                                                             <td className="py-3.5 text-gray-500 text-xs truncate max-w-xs">{Array.isArray(p.facts) ? p.facts.slice(0, 2).map(f => f.replace(/^\[.*?\]/, '')).join(', ') || 'None' : 'None'}</td>
                                                                             <td className="py-3.5 text-right">
                                                                                 <button 
                                                                                     onClick={() => handleEditLearner(p)}
                                                                                     className="bg-brand-blue hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                                                                                 >
                                                                                     <i className="fas fa-pencil-alt mr-1"></i> Edit Profile & Stats
                                                                                 </button>
                                                                             </td>
                                                                         </tr>
                                                                     ))}
                                                                     
                                                                     {/* Pagination controls */}
                                                                     {totalPages > 1 && (
                                                                         <tr>
                                                                             <td colSpan={6} className="py-4">
                                                                                 <div className="flex items-center justify-between">
                                                                                     <span className="text-xs text-gray-500 font-medium">
                                                                                         Showing Page {profilesPage} of {totalPages} ({filtered.length} students found)
                                                                                     </span>
                                                                                     <div className="flex gap-1">
                                                                                         <button 
                                                                                             disabled={profilesPage === 1}
                                                                                             onClick={() => setProfilesPage(p => Math.max(1, p - 1))}
                                                                                             className="px-3 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-gray-600 rounded-lg disabled:opacity-40 transition-colors"
                                                                                         >
                                                                                             <i className="fas fa-chevron-left"></i> Previous
                                                                                         </button>
                                                                                         <button 
                                                                                             disabled={profilesPage === totalPages}
                                                                                             onClick={() => setProfilesPage(p => Math.min(totalPages, p + 1))}
                                                                                             className="px-3 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-gray-600 rounded-lg disabled:opacity-40 transition-colors"
                                                                                         >
                                                                                             Next <i className="fas fa-chevron-right"></i>
                                                                                         </button>
                                                                                     </div>
                                                                                 </div>
                                                                             </td>
                                                                         </tr>
                                                                     )}
                                                                 </>
                                                             );
                                                         })()}
                                                     </tbody>
                                                 </table>
                                             </div>
                                         </div>
                                    </div>
                                )}

                                {overviewSubTab === 'achievements' && (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6">
                                                <h4 className="font-extrabold text-amber-900 mb-3 flex items-center gap-2"><i className="fas fa-medal"></i> Collective Group Milestones</h4>
                                                <ul className="space-y-3 text-sm">
                                                    <li className="flex items-center gap-2.5 text-amber-800"><i className="fas fa-check-circle text-amber-600"></i> Joined forces as a cohort: <strong>Earned +500 XP bonus</strong></li>
                                                    <li className="flex items-center gap-2.5 text-amber-800"><i className="fas fa-check-circle text-amber-600"></i> Completed first group lesson with perfect attendance!</li>
                                                    <li className="flex items-center gap-2.5 text-gray-400"><i className="far fa-circle"></i> Complete 10 combined study hours (Next unlock!)</li>
                                                </ul>
                                            </div>
                                            <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-6">
                                                <h4 className="font-extrabold text-purple-900 mb-3 flex items-center gap-2"><i className="fas fa-award"></i> Learner Achievement Counts</h4>
                                                <div className="space-y-2 text-sm text-purple-950">
                                                    {participants.map(p => (
                                                        <div key={p.id} className="flex justify-between items-center bg-white/70 p-2.5 rounded-xl border border-purple-100">
                                                            <span className="font-bold">{p.name}</span>
                                                            <span className="font-mono text-xs font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded-md">
                                                                {p.achievementsList?.length || 0} Completed
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {overviewSubTab === 'learningPath' && (
                                    <div className="animate-fade-in bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                        <LearningPathTimeline sessions={group.sessions} />
                                    </div>
                                )}

                                {overviewSubTab === 'skillTree' && (
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-fade-in">
                                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                            <i className="fas fa-sitemap text-brand-purple"></i> Group-wide Competency Map
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                            <div className="h-72">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                                        { subject: 'Grammar', groupAvg: 65 },
                                                        { subject: 'Vocabulary', groupAvg: 75 },
                                                        { subject: 'Pronunciation', groupAvg: 60 },
                                                        { subject: 'Fluency', groupAvg: 70 },
                                                        { subject: 'Listening', groupAvg: 80 },
                                                        { subject: 'Reading', groupAvg: 75 },
                                                    ]}>
                                                        <PolarGrid />
                                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#374151', fontWeight: 'bold' }} />
                                                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                                        <Radar name="Group Average" dataKey="groupAvg" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="space-y-4">
                                                <h5 className="font-extrabold text-gray-800">Competency Insights</h5>
                                                <p className="text-sm text-gray-500 leading-relaxed">This map showcases the composite skills of all learners. Currently, <strong>Listening</strong> and <strong>Vocabulary</strong> represent the cohort's strongest domains, whereas <strong>Pronunciation</strong> offers the highest potential for guided focus.</p>
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    <span className="text-xs font-bold text-slate-400 block mb-1">RECOMMENDED TARGET DRILL</span>
                                                    <span className="text-xs font-black text-brand-purple">Spoken dialogue shadowing on Segmental Phonemes</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {overviewSubTab === 'heatmap' && (
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-fade-in">
                                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4"><i className="fas fa-fire text-red-500"></i> Group Study Heatmap (Combined Days Active)</h4>
                                        <div className="h-48">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={[
                                                    { day: 'Mon', activeMembers: 1 },
                                                    { day: 'Tue', activeMembers: 3 },
                                                    { day: 'Wed', activeMembers: 2 },
                                                    { day: 'Thu', activeMembers: 4 },
                                                    { day: 'Fri', activeMembers: 2 },
                                                    { day: 'Sat', activeMembers: 1 },
                                                    { day: 'Sun', activeMembers: 0 },
                                                ]}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="day" />
                                                    <YAxis allowDecimals={false} label={{ value: 'Members Active', angle: -90, position: 'insideLeft' }} />
                                                    <Tooltip />
                                                    <Area type="monotone" dataKey="activeMembers" stroke="#E11D48" fill="#FFE4E6" strokeWidth={3} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {overviewSubTab === 'records' && (
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-fade-in space-y-4">
                                        <h4 className="font-extrabold text-lg text-gray-900"><i className="fas fa-medal text-brand-blue"></i> Class Records & Milestones</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl">
                                                <span className="text-xs font-bold text-slate-400 block">HIGHEST XP MEMBER</span>
                                                <span className="font-extrabold text-base text-slate-800">
                                                    {participants.length > 0 ? [...participants].sort((a,b) => (b.xp || 0) - (a.xp || 0))[0]?.name : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl">
                                                <span className="text-xs font-bold text-slate-400 block">LONGEST INDIVIDUAL STREAK</span>
                                                <span className="font-extrabold text-base text-slate-800">
                                                    {participants.length > 0 ? Math.max(...participants.map(p => p.streak || 0)) : 0} Days
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    </div>
                )}

                {/* ── SESSIONS / ACTIVITY TAB (5 SUB-TABS) ── */}
                {activeTab === 'activity' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-wrap gap-2 mb-4">
                            <SubTabButton name="history" label="Session History" icon="fa-history" active={activitySubTab === 'history'} onClick={() => setActivitySubTab('history')} />
                            <SubTabButton name="homework" label="Homework Hub" icon="fa-tasks" active={activitySubTab === 'homework'} onClick={() => setActivitySubTab('homework')} />
                            <SubTabButton name="exam" label="Exam Log" icon="fa-user-graduate" active={activitySubTab === 'exam'} onClick={() => setActivitySubTab('exam')} />
                            <SubTabButton name="spaced" label="Spaced Deck" icon="fa-brain" active={activitySubTab === 'spaced'} onClick={() => setActivitySubTab('spaced')} />
                            <SubTabButton name="reviews" label="Reviews" icon="fa-star" active={activitySubTab === 'reviews'} onClick={() => setActivitySubTab('reviews')} />
                        </div>

                        <div>
                            {activitySubTab === 'history' && (
                                <SessionLog 
                                    learner={group as any}
                                    onManualLogClick={handleOpenAddSessionModal} 
                                    onEditSession={handleEditSession}
                                    onRemoveSession={handleRemoveSession}
                                    onUpdateSession={handleUpdateSession}
                                />
                            )}

                            {activitySubTab === 'homework' && (
                                <div className="space-y-8 animate-fade-in">
                                    {/* Overall Homework Metrics */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-purple-100 rounded-2xl p-5 shadow-sm">
                                            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block mb-1">Total Assignments</span>
                                            <span className="text-3xl font-black text-purple-900">{homeworks.length}</span>
                                            <span className="text-xs text-slate-500 block mt-2">Active group tasks currently assigned</span>
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">Avg. Class Completion Rate</span>
                                            <span className="text-3xl font-black text-emerald-900">
                                                {(() => {
                                                    if (homeworks.length === 0 || participants.length === 0) return '0%';
                                                    const totalPossible = homeworks.length * participants.length;
                                                    const totalCompleted = homeworks.reduce((sum, hw) => sum + hw.completedLearnerIds.length, 0);
                                                    return `${Math.round((totalCompleted / totalPossible) * 100)}%`;
                                                })()}
                                            </span>
                                            <span className="text-xs text-slate-500 block mt-2">Overall group submission engagement rate</span>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border border-blue-100 rounded-2xl p-5 shadow-sm">
                                            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">Class Learners</span>
                                            <span className="text-3xl font-black text-blue-900">{participants.length} Learners</span>
                                            <span className="text-xs text-slate-500 block mt-2">All students track collective homework tasks</span>
                                        </div>
                                    </div>

                                    {/* Create Homework Form */}
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-extrabold text-lg text-gray-900"><i className="fas fa-plus-circle text-brand-purple"></i> Assign New Group Homework</h4>
                                            <button 
                                                onClick={() => setShowAddHw(!showAddHw)}
                                                className="bg-brand-purple text-white text-xs font-bold px-4 py-2 rounded-xl shadow hover:bg-purple-600 transition-colors"
                                            >
                                                {showAddHw ? 'Close Form' : 'Open Form'}
                                            </button>
                                        </div>

                                        {showAddHw && (
                                            <form onSubmit={handleCreateHomework} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-slate-50 p-4 rounded-xl border">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Homework Title</label>
                                                    <input 
                                                        type="text" required
                                                        value={newHwForm.title}
                                                        onChange={e => setNewHwForm({ ...newHwForm, title: e.target.value })}
                                                        placeholder="e.g. Unit 3 Grammar Exercises"
                                                        className="w-full p-2.5 bg-white border rounded-xl text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">XP Reward</label>
                                                    <input 
                                                        type="number" required min={0}
                                                        value={newHwForm.xpReward}
                                                        onChange={e => setNewHwForm({ ...newHwForm, xpReward: Number(e.target.value) })}
                                                        className="w-full p-2.5 bg-white border rounded-xl text-sm"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Task Description</label>
                                                    <textarea 
                                                        value={newHwForm.description}
                                                        onChange={e => setNewHwForm({ ...newHwForm, description: e.target.value })}
                                                        placeholder="Describe details, criteria, etc."
                                                        className="w-full p-2.5 bg-white border rounded-xl text-sm h-20"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                                                    <input 
                                                        type="date"
                                                        value={newHwForm.dueDate}
                                                        onChange={e => setNewHwForm({ ...newHwForm, dueDate: e.target.value })}
                                                        className="w-full p-2.5 bg-white border rounded-xl text-sm"
                                                    />
                                                </div>
                                                <div className="md:col-span-2 flex justify-end">
                                                    <button type="submit" className="bg-brand-green hover:bg-emerald-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow transition-colors">
                                                        <i className="fas fa-save mr-1"></i> Assign Homework
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>

                                    {/* Homework Grid with Checklist */}
                                    <div className="space-y-8">
                                        {homeworks.map(hw => {
                                            const completedCount = hw.completedLearnerIds.length;
                                            const totalCount = participants.length;
                                            const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                                            return (
                                                <div key={hw.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-8">
                                                    {/* Assignment Details */}
                                                    <div className="md:w-1/3 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-6">
                                                        <div>
                                                            <div className="flex justify-between items-start mb-3">
                                                                <h5 className="font-extrabold text-lg text-gray-900 leading-snug">{hw.title}</h5>
                                                                <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2.5 py-1 rounded-full shrink-0">
                                                                    +{hw.xpReward} XP
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-gray-400 font-bold mb-4">
                                                                <i className="far fa-calendar-alt"></i> Due: {hw.dueDate}
                                                            </div>
                                                            <p className="text-sm text-gray-500 leading-relaxed mb-6">{hw.description}</p>
                                                        </div>

                                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                                            <div className="flex justify-between items-center text-xs text-gray-400 font-bold">
                                                                <span>Class Progress</span>
                                                                <span>{completedCount} / {totalCount} Completed</span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                                                <div className="bg-gradient-to-r from-purple-500 to-brand-purple h-2.5 rounded-full transition-all" style={{ width: `${completionRate}%` }}></div>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-bold text-gray-500">Submission Rate</span>
                                                                <span className="font-black text-brand-purple">{completionRate}%</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Interactive checklist & filtering for large classes */}
                                                    <div className="flex-1 space-y-4">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filters:</span>
                                                                <select 
                                                                    value={hwStatusFilter}
                                                                    onChange={e => setHwStatusFilter(e.target.value as any)}
                                                                    className="bg-white border text-xs font-bold p-1.5 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-purple"
                                                                >
                                                                    <option value="all">All Statuses</option>
                                                                    <option value="completed">Completed Only</option>
                                                                    <option value="pending">Pending Only</option>
                                                                </select>
                                                                <select 
                                                                    value={hwSortBy}
                                                                    onChange={e => setHwSortBy(e.target.value as any)}
                                                                    className="bg-white border text-xs font-bold p-1.5 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-purple"
                                                                >
                                                                    <option value="name">Sort by Name</option>
                                                                    <option value="status">Sort by Status</option>
                                                                </select>
                                                            </div>

                                                            <div className="relative">
                                                                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-[10px]">
                                                                    <i className="fas fa-search"></i>
                                                                </span>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Find student..."
                                                                    value={hwSearchQuery}
                                                                    onChange={e => setHwSearchQuery(e.target.value)}
                                                                    className="pl-7 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-brand-purple"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Bulk grade helpers */}
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Cohort Submissions checklist</span>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const missingIds = participants.filter(p => !hw.completedLearnerIds.includes(p.id)).map(p => p.id);
                                                                        if (missingIds.length > 0) {
                                                                            const updatedHws = homeworks.map(h => h.id === hw.id ? { ...h, completedLearnerIds: [...h.completedLearnerIds, ...missingIds] } : h);
                                                                            // Add XP reward to each student
                                                                            participants.forEach(p => {
                                                                                if (missingIds.includes(p.id)) {
                                                                                    applyLearnerXp(p, hw.xpReward);
                                                                                }
                                                                            });
                                                                            handleUpdateGroup({ ...group, homeworks: updatedHws } as any);
                                                                            triggerCelebration();
                                                                        }
                                                                    }}
                                                                    className="text-brand-purple font-black hover:underline"
                                                                >
                                                                    ✓ Mark All Completed
                                                                </button>
                                                                <span className="text-slate-200">|</span>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (hw.completedLearnerIds.length > 0) {
                                                                            // Deduct XP reward from each completed student
                                                                            participants.forEach(p => {
                                                                                if (hw.completedLearnerIds.includes(p.id)) {
                                                                                    applyLearnerXp(p, -hw.xpReward);
                                                                                }
                                                                            });
                                                                            const updatedHws = homeworks.map(h => h.id === hw.id ? { ...h, completedLearnerIds: [] } : h);
                                                                            handleUpdateGroup({ ...group, homeworks: updatedHws } as any);
                                                                        }
                                                                    }}
                                                                    className="text-rose-500 font-black hover:underline"
                                                                >
                                                                    Reset All Pending
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Grid list of students */}
                                                        <div className="max-h-96 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100 pr-1">
                                                            {(() => {
                                                                let list = [...participants];
                                                                // Search Filter
                                                                if (hwSearchQuery.trim()) {
                                                                    list = list.filter(p => p.name.toLowerCase().includes(hwSearchQuery.toLowerCase()));
                                                                }
                                                                // Status Filter
                                                                if (hwStatusFilter === 'completed') {
                                                                    list = list.filter(p => hw.completedLearnerIds.includes(p.id));
                                                                } else if (hwStatusFilter === 'pending') {
                                                                    list = list.filter(p => !hw.completedLearnerIds.includes(p.id));
                                                                }
                                                                // Sorting
                                                                if (hwSortBy === 'name') {
                                                                    list.sort((a, b) => a.name.localeCompare(b.name));
                                                                } else if (hwSortBy === 'status') {
                                                                    list.sort((a, b) => {
                                                                        const aC = hw.completedLearnerIds.includes(a.id) ? 1 : 0;
                                                                        const bC = hw.completedLearnerIds.includes(b.id) ? 1 : 0;
                                                                        return bC - aC; // completed first
                                                                    });
                                                                }

                                                                if (list.length === 0) {
                                                                    return <div className="p-8 text-center text-gray-400 text-sm italic">No student matches current search filters.</div>;
                                                                }

                                                                return list.map(student => {
                                                                    const isChecked = hw.completedLearnerIds.includes(student.id);
                                                                    return (
                                                                        <div key={student.id} className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`w-2 h-2 rounded-full ${isChecked ? 'bg-emerald-500' : 'bg-rose-400'}`}></div>
                                                                                <span className="text-sm font-bold text-gray-800">{student.name}</span>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleToggleHomework(hw.id, student.id)}
                                                                                className={`text-xs font-black px-4 py-1.5 rounded-xl border transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm hover:bg-emerald-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                                            >
                                                                                {isChecked ? '✓ Completed' : 'Pending'}
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {homeworks.length === 0 && (
                                            <div className="col-span-2 text-center py-10 text-gray-400 italic">No homework records created yet. Click "Assign New" above.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activitySubTab === 'exam' && (
                                <div className="space-y-8 animate-fade-in">
                                    {/* Create Exam Form */}
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-extrabold text-lg text-gray-900"><i className="fas fa-plus-circle text-brand-blue"></i> Record New Class Exam</h4>
                                            <button 
                                                onClick={() => setShowAddExam(!showAddExam)}
                                                className="bg-brand-blue text-white text-xs font-bold px-4 py-2 rounded-xl shadow hover:bg-blue-600 transition-colors"
                                            >
                                                {showAddExam ? 'Close Form' : 'Record Scorecard'}
                                            </button>
                                        </div>

                                        {showAddExam && (
                                            <form onSubmit={handleCreateExam} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 bg-slate-50 p-4 rounded-xl border">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Exam / Assessment Title</label>
                                                    <input 
                                                        type="text" required
                                                        value={newExamForm.title}
                                                        onChange={e => setNewExamForm({ ...newExamForm, title: e.target.value })}
                                                        placeholder="e.g. B2 Listening Assessment"
                                                        className="w-full p-2.5 bg-white border rounded-xl text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Score</label>
                                                    <input 
                                                        type="number" required min={1}
                                                        value={newExamForm.maxScore}
                                                        onChange={e => setNewExamForm({ ...newExamForm, maxScore: Number(e.target.value) })}
                                                        className="w-full p-2.5 bg-white border rounded-xl text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date Conducted</label>
                                                    <input 
                                                        type="date"
                                                        value={newExamForm.date}
                                                        onChange={e => setNewExamForm({ ...newExamForm, date: e.target.value })}
                                                        className="w-full p-2.5 bg-white border rounded-xl text-sm"
                                                    />
                                                </div>
                                                <div className="md:col-span-3 flex justify-end">
                                                    <button type="submit" className="bg-brand-green hover:bg-emerald-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow transition-colors">
                                                        <i className="fas fa-check mr-1"></i> Register Scorecard
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>

                                    {/* Exams scoreboard comparison */}
                                    <div className="space-y-8">
                                        {exams.map(exam => {
                                            const rawScores = Object.values(exam.scores);
                                            const avgScore = rawScores.length > 0 ? Math.round(rawScores.reduce((sum, s) => sum + s, 0) / rawScores.length) : 0;
                                            const highestScore = rawScores.length > 0 ? Math.max(...rawScores) : 0;
                                            const lowestScore = rawScores.length > 0 ? Math.min(...rawScores) : 0;
                                            const passMark = Math.round(exam.maxScore * 0.6); // 60% standard pass mark
                                            const passingCount = rawScores.filter(s => s >= passMark).length;
                                            const passRate = rawScores.length > 0 ? Math.round((passingCount / rawScores.length) * 100) : 0;

                                            return (
                                                <div key={exam.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                                                    {/* Exam Header Banner */}
                                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-100 pb-5 mb-6 gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="bg-brand-blue/10 text-brand-blue text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full">Scorecard</span>
                                                                <span className="text-xs text-gray-400 font-bold"><i className="far fa-calendar-alt"></i> Date: {exam.date}</span>
                                                            </div>
                                                            <h5 className="font-black text-xl text-gray-900">{exam.title}</h5>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="bg-blue-50 text-blue-800 text-xs font-extrabold px-3.5 py-1.5 rounded-xl border border-blue-100">
                                                                Class Avg: <strong className="text-sm font-black">{avgScore}</strong> / {exam.maxScore}
                                                            </span>
                                                            <span className="bg-emerald-50 text-emerald-800 text-xs font-extrabold px-3.5 py-1.5 rounded-xl border border-emerald-100">
                                                                Pass Rate: <strong className="text-sm font-black">{passRate}%</strong> (≥ {passMark} pts)
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Statistical Mini Cards */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Highest Score</span>
                                                            <span className="text-lg font-extrabold text-emerald-600">{highestScore} <span className="text-xs font-medium text-slate-400">/ {exam.maxScore}</span></span>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Lowest Score</span>
                                                            <span className="text-lg font-extrabold text-rose-500">{lowestScore} <span className="text-xs font-medium text-slate-400">/ {exam.maxScore}</span></span>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Passing Grade</span>
                                                            <span className="text-lg font-extrabold text-blue-600">{passMark} <span className="text-xs font-medium text-slate-400">pts (60%)</span></span>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Assessed Count</span>
                                                            <span className="text-lg font-extrabold text-slate-700">{rawScores.length} <span className="text-xs font-medium text-slate-400">/ {participants.length}</span></span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                                        {/* Interactive Input Sheet with 30+ filtering */}
                                                        <div className="space-y-4">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sort:</span>
                                                                    <select 
                                                                        value={examSortBy}
                                                                        onChange={e => setExamSortBy(e.target.value as any)}
                                                                        className="bg-white border text-xs font-bold p-1.5 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                                                                    >
                                                                        <option value="name">Learner name (A-Z)</option>
                                                                        <option value="scoreDesc">Highest Score First</option>
                                                                        <option value="scoreAsc">Lowest Score First</option>
                                                                    </select>
                                                                </div>

                                                                <div className="relative">
                                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-[10px]">
                                                                        <i className="fas fa-search"></i>
                                                                    </span>
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="Find student..."
                                                                        value={examSearchQuery}
                                                                        onChange={e => setExamSearchQuery(e.target.value)}
                                                                        className="pl-7 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs w-full sm:w-44 focus:outline-none"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Bulk Actions */}
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-slate-400 font-bold uppercase tracking-wider">Cohort Scores Sheet</span>
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (confirm(`Set scores of all ${participants.length} students to ${exam.maxScore}?`)) {
                                                                                const updatedScores: Record<string, number> = {};
                                                                                participants.forEach(p => {
                                                                                    updatedScores[p.id] = exam.maxScore;
                                                                                });
                                                                                const updatedExams = exams.map(ex => ex.id === exam.id ? { ...ex, scores: updatedScores } : ex);
                                                                                handleUpdateGroup({ ...group, exams: updatedExams } as any);
                                                                            }
                                                                        }}
                                                                        className="text-brand-blue font-black hover:underline"
                                                                    >
                                                                        Set All to Max ({exam.maxScore})
                                                                    </button>
                                                                    <span className="text-slate-200">|</span>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (confirm('Reset all class scores to zero?')) {
                                                                                const updatedScores: Record<string, number> = {};
                                                                                participants.forEach(p => {
                                                                                    updatedScores[p.id] = 0;
                                                                                });
                                                                                const updatedExams = exams.map(ex => ex.id === exam.id ? { ...ex, scores: updatedScores } : ex);
                                                                                handleUpdateGroup({ ...group, exams: updatedExams } as any);
                                                                            }
                                                                        }}
                                                                        className="text-rose-500 font-black hover:underline"
                                                                    >
                                                                        Reset All to 0
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="max-h-96 overflow-y-auto border border-slate-100 rounded-2xl divide-y pr-1">
                                                                {(() => {
                                                                    let list = [...participants];
                                                                    if (examSearchQuery.trim()) {
                                                                        list = list.filter(p => p.name.toLowerCase().includes(examSearchQuery.toLowerCase()));
                                                                    }
                                                                    // Sort list
                                                                    if (examSortBy === 'name') {
                                                                        list.sort((a, b) => a.name.localeCompare(b.name));
                                                                    } else if (examSortBy === 'scoreDesc') {
                                                                        list.sort((a, b) => {
                                                                            const scoreA = exam.scores[a.id] !== undefined ? exam.scores[a.id] : 0;
                                                                            const scoreB = exam.scores[b.id] !== undefined ? exam.scores[b.id] : 0;
                                                                            return scoreB - scoreA;
                                                                        });
                                                                    } else if (examSortBy === 'scoreAsc') {
                                                                        list.sort((a, b) => {
                                                                            const scoreA = exam.scores[a.id] !== undefined ? exam.scores[a.id] : 0;
                                                                            const scoreB = exam.scores[b.id] !== undefined ? exam.scores[b.id] : 0;
                                                                            return scoreA - scoreB;
                                                                        });
                                                                    }

                                                                    if (list.length === 0) {
                                                                        return <div className="p-8 text-center text-gray-400 italic text-sm">No student score matches filter.</div>;
                                                                    }

                                                                    return list.map(std => {
                                                                        const stdScore = exam.scores[std.id] !== undefined ? exam.scores[std.id] : 0;
                                                                        const isPassing = stdScore >= passMark;
                                                                        return (
                                                                            <div key={std.id} className="flex items-center justify-between p-3.5 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className={`w-2.5 h-2.5 rounded-full ${isPassing ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-amber-400'}`}></div>
                                                                                    <div>
                                                                                        <span className="text-sm font-bold text-slate-800 block">{std.name}</span>
                                                                                        <span className="text-[10px] text-slate-400 font-semibold">{isPassing ? 'Passing grade' : 'Needs practice support'}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <input 
                                                                                        type="number" min={0} max={exam.maxScore}
                                                                                        value={stdScore}
                                                                                        onChange={e => {
                                                                                            let val = Number(e.target.value);
                                                                                            if (val > exam.maxScore) val = exam.maxScore;
                                                                                            if (val < 0) val = 0;
                                                                                            handleSaveScore(exam.id, std.id, val);
                                                                                        }}
                                                                                        className="w-16 p-1 text-center bg-white border border-gray-200 rounded-lg text-sm font-black text-slate-800 focus:ring-1 focus:ring-brand-blue focus:outline-none"
                                                                                    />
                                                                                    <span className="text-xs text-slate-400 font-bold">/ {exam.maxScore}</span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>
                                                        </div>

                                                        {/* Recharts Bar graph comparison optimized for 30+ (shows sorted scoreboard) */}
                                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                                            <div>
                                                                <h6 className="font-extrabold text-sm text-gray-800 mb-1"><i className="fas fa-chart-bar text-brand-blue"></i> Scoreboard Leaderboard</h6>
                                                                <p className="text-xs text-slate-400 mb-4">Interactive distribution of scores across the entire cohort (sorted highest to lowest)</p>
                                                            </div>
                                                            <div className="h-64 mt-2">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <BarChart 
                                                                        data={participants
                                                                            .map(p => ({ 
                                                                                name: p.name.length > 12 ? p.name.substring(0, 10) + '..' : p.name, 
                                                                                score: exam.scores[p.id] || 0 
                                                                            }))
                                                                            .sort((a,b) => b.score - a.score)
                                                                        }
                                                                    >
                                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                                        <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#94A3B8' }} interval={0} angle={-35} textAnchor="end" height={50} />
                                                                        <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} domain={[0, exam.maxScore]} />
                                                                        <Tooltip formatter={(value) => [`${value} pts`, 'Score']} />
                                                                        <Bar dataKey="score" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={12} />
                                                                    </BarChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                            <div className="text-[11px] text-center text-slate-400 font-bold mt-2">
                                                                * Class sizes of 30+ students are beautifully graphed in order of ranking.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {exams.length === 0 && (
                                            <div className="text-center py-10 text-gray-400 italic">No examination scorecards found. Create one above.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activitySubTab === 'spaced' && (
                                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-fade-in space-y-6">
                                    <h4 className="font-extrabold text-lg text-gray-900 flex items-center gap-2">
                                        <i className="fas fa-brain text-brand-purple"></i> Shared Group Vocabulary Recall Stats
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl space-y-3">
                                            <p className="text-xs font-bold text-slate-400 uppercase">Unwrapped Vocabulary Size per Member</p>
                                            {participants.map(p => (
                                                <div key={p.id} className="flex justify-between items-center">
                                                    <span className="font-bold text-sm text-gray-700">{p.name}</span>
                                                    <span className="font-mono text-xs font-black bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-md">
                                                        {Array.isArray(p.vocabulary) ? p.vocabulary.length : 12} Words
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl space-y-3">
                                            <p className="text-xs font-bold text-slate-400 uppercase">Class Mastery Benchmark</p>
                                            <div className="flex justify-between items-center text-sm font-bold text-gray-600">
                                                <span>Total Active Vocabulary items</span>
                                                <span>{participants.reduce((sum, p) => sum + (Array.isArray(p.vocabulary) ? p.vocabulary.length : 12), 0)} items</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm font-bold text-gray-600">
                                                <span>Average Retention Rate</span>
                                                <span>84%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activitySubTab === 'reviews' && (
                                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-fade-in space-y-6">
                                    <h4 className="font-extrabold text-lg text-gray-900"><i className="fas fa-star text-yellow-500"></i> Course Reviews Aggregate</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                        <div className="bg-yellow-50/50 border border-yellow-200 rounded-2xl p-6">
                                            <span className="text-xs font-black text-yellow-800 block uppercase mb-1">Group Score</span>
                                            <span className="text-4xl font-black text-yellow-600">4.9 / 5</span>
                                        </div>
                                        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-6 col-span-2">
                                            <span className="text-xs font-black text-emerald-800 block uppercase mb-1">Tutor Recommendation</span>
                                            <p className="text-sm text-emerald-900 font-bold mt-1">100% of class members reported they felt motivated during speech drills!</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── CALENDAR TAB ── */}
                {activeTab === 'calendar' && (
                    <div className="animate-fade-in">
                        <SectionCard title="SMART Goal Tracker & Calendar" icon={<span>🎯</span>}>
                            <AttendanceTracker 
                                learner={group as any} 
                                events={groupEvents}
                                allCalendarEvents={calendarEvents}
                                onDateClick={handleDateClick}
                            />
                        </SectionCard>
                    </div>
                )}

                {/* ── FEEDBACK TAB (6 SUB-TABS) ── */}
                {activeTab === 'feedback' && (
                    <div className="animate-fade-in">
                        <SectionCard title="Collective & AI Dialogue Assistant" icon={<i className="fas fa-comments"></i>}>
                            <div className="flex flex-wrap gap-2 border-b pb-4 mb-6">
                                <SubTabButton name="feedback" label="Group Feedback" icon="fa-comment-dots" active={feedbackSubTab === 'feedback'} onClick={() => setFeedbackSubTab('feedback')} />
                                <SubTabButton name="challenges" label="Challenges" icon="fa-lightbulb" active={feedbackSubTab === 'challenges'} onClick={() => setFeedbackSubTab('challenges')} />
                                <SubTabButton name="facts" label="Group Facts" icon="fa-brain" active={feedbackSubTab === 'facts'} onClick={() => setFeedbackSubTab('facts')} />
                                <SubTabButton name="chat" label="AI Group Chat" icon="fa-comments" active={feedbackSubTab === 'chat'} onClick={() => setFeedbackSubTab('chat')} />
                                <SubTabButton name="copilot" label="Group Copilot" icon="fa-robot" active={feedbackSubTab === 'copilot'} onClick={() => setFeedbackSubTab('copilot')} />
                                <SubTabButton name="challengeBoard" label="Game Board" icon="fa-flag-checkered" active={feedbackSubTab === 'challengeBoard'} onClick={() => setFeedbackSubTab('challengeBoard')} />
                            </div>

                            <div>
                                {feedbackSubTab === 'feedback' && (
                                    <Feedback learner={group} onUpdate={handleUpdateGroup} isTabContent={true} />
                                )}

                                {feedbackSubTab === 'challenges' && (
                                    <LearningChallenges learner={group} onUpdate={handleUpdateGroup} isTabContent={true} />
                                )}

                                {feedbackSubTab === 'facts' && (
                                    <FunFacts learner={group} onUpdate={handleUpdateGroup} isTabContent={true} />
                                )}

                                {feedbackSubTab === 'chat' && (
                                    <AIChatGenerator learner={group} />
                                )}

                                {feedbackSubTab === 'copilot' && (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                                            <h5 className="font-extrabold text-base mb-2 text-slate-900"><i className="fas fa-robot text-brand-purple"></i> Academic Group Consultation Desk</h5>
                                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">Query the AI model about activities or teaching materials tailored for this specific cohort. It will automatically consider the aggregate levels and strengths of your {participants.length} learners.</p>

                                            <div className="flex gap-2">
                                                <input 
                                                    type="text"
                                                    value={copilotInput}
                                                    onChange={e => setCopilotInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleCopilotQuery(); }}
                                                    placeholder="e.g. Suggest 3 corporate team games fitting Intermediate B2 CEFR..."
                                                    className="flex-1 p-3 bg-white border border-slate-200 focus:ring-2 focus:ring-brand-purple rounded-xl text-sm"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={handleCopilotQuery}
                                                    disabled={isCopilotLoading}
                                                    className="bg-brand-purple text-white font-extrabold px-6 rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-purple-600 shadow cursor-pointer"
                                                >
                                                    {isCopilotLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-paper-plane"></i>} Ask AI
                                                </button>
                                            </div>
                                        </div>

                                        {copilotResponse && (
                                            <div className="bg-purple-50/50 border border-purple-100 p-5 rounded-2xl text-purple-950 text-sm whitespace-pre-wrap leading-relaxed">
                                                {copilotResponse}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {feedbackSubTab === 'challengeBoard' && (
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-fade-in space-y-4">
                                        <h4 className="font-extrabold text-lg text-gray-900"><i className="fas fa-flag-checkered text-brand-green"></i> Cohort Challenge Board</h4>
                                        <p className="text-sm text-gray-500 leading-relaxed">Learners earn combined class bonuses by resolving learning challenges. Weekly progress meter resets in 3 days.</p>
                                        <div className="w-full bg-slate-100 rounded-full h-4 relative">
                                            <div className="bg-brand-green h-4 rounded-full transition-all" style={{ width: '65%' }}></div>
                                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-800">65% Class Goal Met</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    </div>
                )}

                {/* ── COMPETITION MAIN TAB ── */}
                {activeTab === 'competition' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-5 mb-6 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-purple-100 text-brand-purple text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full">Gamified Tournament</span>
                                        <span className="text-xs text-gray-400 font-bold"><i className="fas fa-bolt"></i> Live Leaderboard</span>
                                    </div>
                                    <h4 className="font-black text-2xl text-gray-900">
                                        Class Competition Bracket & Bragging Rights
                                    </h4>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-xs">
                                        <i className="fas fa-search"></i>
                                    </span>
                                    <input 
                                        type="text" 
                                        placeholder="Search competitor..."
                                        value={compSearchQuery}
                                        onChange={e => setCompSearchQuery(e.target.value)}
                                        className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full focus:outline-none focus:ring-1 focus:ring-brand-purple focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            {/* Podium Section for Top 3 (only when not searching or first loading) */}
                            {!compSearchQuery && (
                                <div className="mb-8">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 text-center">🏆 Leaderboard Podium</p>
                                    <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto items-end pt-4">
                                        {/* 2nd Place */}
                                        {(() => {
                                            const sorted = [...participants].sort((a,b) => (b.xp || 0) - (a.xp || 0));
                                            const p = sorted[1];
                                            if (!p) return <div className="opacity-0"></div>;
                                            return (
                                                <div className="flex flex-col items-center">
                                                    <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-lg font-black text-slate-600 shadow-sm">
                                                        🥈
                                                    </div>
                                                    <span className="text-xs font-extrabold text-slate-700 mt-2 truncate max-w-[100px]">{p.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{p.xp || 0} XP</span>
                                                    <div className="w-full bg-slate-200/60 rounded-t-xl h-16 mt-2 flex items-center justify-center border-t border-x border-slate-300">
                                                        <span className="font-black text-slate-500 text-sm">2nd</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* 1st Place */}
                                        {(() => {
                                            const sorted = [...participants].sort((a,b) => (b.xp || 0) - (a.xp || 0));
                                            const p = sorted[0];
                                            if (!p) return <div className="opacity-0"></div>;
                                            return (
                                                <div className="flex flex-col items-center">
                                                    <div className="w-16 h-16 rounded-full bg-amber-50 border-4 border-amber-400 flex items-center justify-center text-2xl font-black text-amber-600 shadow-md animate-bounce">
                                                        👑
                                                    </div>
                                                    <span className="text-sm font-black text-slate-800 mt-2 truncate max-w-[120px]">{p.name}</span>
                                                    <span className="text-xs font-black text-amber-600">{p.xp || 0} XP</span>
                                                    <div className="w-full bg-amber-400/20 rounded-t-xl h-24 mt-2 flex items-center justify-center border-t border-x border-amber-300 shadow-sm">
                                                        <span className="font-black text-amber-700 text-base">1st</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* 3rd Place */}
                                        {(() => {
                                            const sorted = [...participants].sort((a,b) => (b.xp || 0) - (a.xp || 0));
                                            const p = sorted[2];
                                            if (!p) return <div className="opacity-0"></div>;
                                            return (
                                                <div className="flex flex-col items-center">
                                                    <div className="w-12 h-12 rounded-full bg-orange-50 border-2 border-orange-300 flex items-center justify-center text-lg font-black text-orange-600 shadow-sm">
                                                        🥉
                                                    </div>
                                                    <span className="text-xs font-extrabold text-slate-700 mt-2 truncate max-w-[100px]">{p.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{p.xp || 0} XP</span>
                                                    <div className="w-full bg-orange-200/40 rounded-t-xl h-12 mt-2 flex items-center justify-center border-t border-x border-orange-300">
                                                        <span className="font-black text-orange-600 text-xs">3rd</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-4">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Cohort League Ranking List</p>
                                    <div className="divide-y border rounded-2xl overflow-hidden shadow-sm max-h-96 overflow-y-auto">
                                        {(() => {
                                            let sortedList = [...participants].sort((a,b) => (b.xp || 0) - (a.xp || 0));
                                            if (compSearchQuery.trim()) {
                                                sortedList = sortedList.filter(p => p.name.toLowerCase().includes(compSearchQuery.toLowerCase()));
                                            }

                                            if (sortedList.length === 0) {
                                                return <div className="p-8 text-center text-gray-400 italic text-sm bg-slate-50">No competitor matches search.</div>;
                                            }

                                            return sortedList.map((std, idx) => {
                                                // Find actual overall rank index in the complete sorted array
                                                const overallRank = [...participants]
                                                    .sort((a,b) => (b.xp || 0) - (a.xp || 0))
                                                    .findIndex(p => p.id === std.id) + 1;

                                                return (
                                                    <div key={std.id} className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`font-black text-xs w-6 h-6 rounded-full flex items-center justify-center ${
                                                                overallRank === 1 ? 'bg-amber-400 text-amber-950' : 
                                                                overallRank === 2 ? 'bg-slate-300 text-slate-800' :
                                                                overallRank === 3 ? 'bg-orange-300 text-orange-950' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                #{overallRank}
                                                            </span>
                                                            <div>
                                                                <span className="font-extrabold text-sm text-gray-800 block">{std.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{std.level} league</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-purple-400">Total Points</span>
                                                            <span className="text-xs font-black bg-purple-100 text-brand-purple px-3 py-1 rounded-full">{std.xp || 0} XP</span>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                                <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-5 flex flex-col justify-between h-fit gap-4">
                                    <div>
                                        <h5 className="font-black text-purple-950 text-sm mb-2"><i className="fas fa-bolt"></i> Dynamic 1v1 Matchups</h5>
                                        <p className="text-xs text-purple-700 leading-relaxed mb-4">Pairing students with comparable performance helps establish highly competitive vocabulary duels!</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            triggerCelebration();
                                            alert('Matchmaking brackets dispatched to all participants! They will receive a notification to join.');
                                        }}
                                        className="bg-brand-purple text-white text-xs font-bold py-2.5 rounded-xl hover:bg-purple-600 transition-colors cursor-pointer w-full text-center"
                                    >
                                        Dispatch Tournament Matchups
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── AUTOMATION MAIN TAB (3 SUB-TABS) ── */}
                {activeTab === 'automation' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex flex-wrap gap-2 mb-4">
                            <SubTabButton name="payments" label="Booking System" icon="fa-calendar-check" active={automationSubTab === 'payments'} onClick={() => setAutomationSubTab('payments')} />
                            <SubTabButton name="resources" label="Shared Files Library" icon="fa-folder-open" active={automationSubTab === 'resources'} onClick={() => setAutomationSubTab('resources')} />
                            <SubTabButton name="comparison" label="Cohort Comparison Grid" icon="fa-balance-scale" active={automationSubTab === 'comparison'} onClick={() => setAutomationSubTab('comparison')} />
                        </div>

                        <div>
                            {automationSubTab === 'payments' && (
                                <BookingSystem learner={groupAsLearnerForAI as any} />
                            )}

                            {automationSubTab === 'resources' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-extrabold text-lg text-gray-900"><i className="fas fa-cloud-upload-alt text-brand-purple"></i> Upload Class Resource File</h4>
                                            <button 
                                                onClick={() => setShowAddResource(!showAddResource)}
                                                className="bg-brand-purple text-white text-xs font-bold px-4 py-2 rounded-xl"
                                            >
                                                {showAddResource ? 'Close Panel' : 'Upload Resource File'}
                                            </button>
                                        </div>

                                        {showAddResource && (
                                            <form onSubmit={handleAddResource} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 border rounded-xl">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Resource Name</label>
                                                    <input 
                                                        type="text" required
                                                        value={newResourceForm.name}
                                                        onChange={e => setNewResourceForm({ ...newResourceForm, name: e.target.value })}
                                                        className="w-full p-2.5 bg-white border rounded-xl text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">File Type</label>
                                                    <select 
                                                        value={newResourceForm.type}
                                                        onChange={e => setNewResourceForm({ ...newResourceForm, type: e.target.value as any })}
                                                        className="w-full p-2.5 bg-white border rounded-xl text-sm"
                                                    >
                                                        <option value="pdf">PDF Document</option>
                                                        <option value="doc">Word / Text</option>
                                                        <option value="audio">Audio Track</option>
                                                        <option value="link">External URL Link</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">File / Redirect URL</label>
                                                    <input 
                                                        type="text"
                                                        value={newResourceForm.url}
                                                        onChange={e => setNewResourceForm({ ...newResourceForm, url: e.target.value })}
                                                        className="w-full p-2.5 bg-white border rounded-xl text-sm"
                                                    />
                                                </div>
                                                <div className="md:col-span-3 flex justify-end">
                                                    <button type="submit" className="bg-brand-green hover:bg-emerald-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow transition-colors">
                                                        <i className="fas fa-upload mr-1"></i> Register File
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>

                                    {/* Resources listing */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {resources.map(res => (
                                            <div key={res.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-brand-purple text-lg shrink-0">
                                                        {res.type === 'pdf' && <i className="fas fa-file-pdf"></i>}
                                                        {res.type === 'doc' && <i className="fas fa-file-word"></i>}
                                                        {res.type === 'audio' && <i className="fas fa-music"></i>}
                                                        {res.type === 'link' && <i className="fas fa-link"></i>}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm truncate max-w-xs">{res.name}</p>
                                                        <span className="text-[10px] text-gray-400">Added: {res.dateAdded}</span>
                                                    </div>
                                                </div>
                                                <a 
                                                    href={res.url} 
                                                    onClick={(e) => { if (res.url === '#') { e.preventDefault(); alert('This is a simulated demo file download link.'); } }}
                                                    className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-brand-purple transition-all shadow-inner"
                                                    title="Download file"
                                                >
                                                    <i className="fas fa-cloud-download-alt text-xs"></i>
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {automationSubTab === 'comparison' && (
                                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-fade-in space-y-6">
                                    <h4 className="font-extrabold text-lg text-gray-900"><i className="fas fa-balance-scale text-brand-purple"></i> Cohort Strengths & Weaknesses comparison</h4>
                                    <p className="text-xs text-gray-500">Cross-examine each student's focus, weaknesses, and needs side-by-side to construct perfectly targeted homework assignments:</p>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b text-xs text-gray-400 uppercase font-black">
                                                    <th className="pb-3">Learner name</th>
                                                    <th className="pb-3">Course Level</th>
                                                    <th className="pb-3">Primary Focus / Need</th>
                                                    <th className="pb-3">Stated Weakness</th>
                                                    <th className="pb-3">Interests</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y text-sm">
                                                {participants.map(std => (
                                                    <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="py-3 font-bold text-gray-900">{std.name}</td>
                                                        <td className="py-3"><span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-bold">{std.level}</span></td>
                                                        <td className="py-3 text-slate-700 font-semibold">{std.focus || 'General Fluency'}</td>
                                                        <td className="py-3 text-red-600 font-medium">{Array.isArray(std.needs) ? std.needs[0]?.name || 'Pronunciation Errors' : 'Pronunciation Errors'}</td>
                                                        <td className="py-3 text-gray-500 truncate max-w-xs">{std.interests || 'None listed'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Session Forms and Actions */}
            <AddSessionForm 
                learner={group as any}
                onSaveSession={handleSaveSession}
                isOpen={isSessionModalOpen}
                onClose={handleCloseModal}
                sessionToEdit={sessionToEdit}
                liveSessionInfo={null}
            />

            <DateActionModal
                isOpen={isDateActionModalOpen}
                onClose={() => setIsDateActionModalOpen(false)}
                selectedDate={selectedDate}
                learnerOrGroup={group}
                allLearners={learners}
                allEvents={calendarEvents}
                onSaveEvent={handleSaveEvent}
                onSaveSession={handleSaveSession}
            />

            <Modal isOpen={isOverviewModalOpen} onClose={() => setIsOverviewModalOpen(false)} title={`Overview for ${group.name}`} size="full">
                <PrintableGroupOverview group={group} participants={participants} />
            </Modal>
            
            <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title={`Report for ${group.name}`}>
                <GroupReport group={group} roster={roster} />
            </Modal>

            {/* ── HIGH FIDELITY PARTICIPANT EDITOR MODAL (NEW) ── */}
            {selectedLearnerForEdit && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative animate-fade-in border border-slate-100">
                        <button 
                            onClick={() => setSelectedLearnerForEdit(null)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 font-extrabold text-2xl"
                        >
                            &times;
                        </button>
                        <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                            <i className="fas fa-user-edit text-brand-purple"></i> Edit Learner Profile & Stats
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Learner name</label>
                                    <input 
                                        type="text" required
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm focus:bg-white transition-all font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Learner email</label>
                                    <input 
                                        type="email"
                                        value={editForm.email}
                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Experience Points (XP)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" required min={0}
                                            value={editForm.xp}
                                            onChange={e => setEditForm({ ...editForm, xp: Number(e.target.value) })}
                                            className="w-32 p-2.5 bg-slate-50 border rounded-xl text-sm text-center font-bold"
                                        />
                                        <button type="button" onClick={() => setEditForm({ ...editForm, xp: editForm.xp + 10 })} className="bg-slate-100 hover:bg-slate-200 text-xs font-bold px-3 py-1 rounded-lg shrink-0">+10</button>
                                        <button type="button" onClick={() => setEditForm({ ...editForm, xp: editForm.xp + 50 })} className="bg-slate-100 hover:bg-slate-200 text-xs font-bold px-3 py-1 rounded-lg shrink-0">+50</button>
                                        <button type="button" onClick={() => setEditForm({ ...editForm, xp: editForm.xp + 100 })} className="bg-slate-100 hover:bg-slate-200 text-xs font-bold px-3 py-1 rounded-lg shrink-0">+100</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEFR Level</label>
                                    <select 
                                        value={editForm.level}
                                        onChange={e => setEditForm({ ...editForm, level: e.target.value as CourseLevel })}
                                        className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-gray-700 focus:bg-white"
                                    >
                                        {Object.values(CourseLevel).map(lvl => (
                                            <option key={lvl} value={lvl}>{lvl}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">L1 Mother Tongue</label>
                                    <input 
                                        type="text"
                                        value={editForm.l1Language}
                                        onChange={e => setEditForm({ ...editForm, l1Language: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Occupation</label>
                                    <input 
                                        type="text"
                                        value={editForm.occupation}
                                        onChange={e => setEditForm({ ...editForm, occupation: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Personal Portfolio Facts</label>
                                <p className="text-[10px] text-gray-400 mb-1">One fact per line. Format with brackets: [People], [Work], [Places], [Likes & Dislikes] or just write plain sentences.</p>
                                <textarea 
                                    value={editForm.factsRaw}
                                    onChange={e => setEditForm({ ...editForm, factsRaw: e.target.value })}
                                    placeholder="e.g. [Work] Software developer at Stripe"
                                    className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-mono h-28 focus:bg-white transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Academic Notes</label>
                                <textarea 
                                    value={editForm.notes}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border rounded-xl text-xs h-16 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                            <button 
                                onClick={() => setSelectedLearnerForEdit(null)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-6 py-2.5 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveLearnerEdit}
                                className="bg-brand-purple hover:bg-purple-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-md transition-all"
                            >
                                Save Learner
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupProfile;
