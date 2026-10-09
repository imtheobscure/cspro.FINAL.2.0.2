import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Learner } from '../../types2';
import { differenceInDays, formatDistanceToNow, format } from 'date-fns';
import { getAvatarUrl } from '../../services/avatarService';
import { useLearnerStore } from '../../store/useLearnerStore';
import { useAppStore } from '../../store/useAppStore';

interface AttentionNeededProps {
    learners: Learner[];
}

interface AttentionItem {
    learner: Learner;
    reasons: { type: 'inactive' | 'struggling' | 'challenge'; label: string; severity: 'high' | 'medium' | 'low' }[];
    totalSeverityScore: number;
}

interface CoachPathItem {
    learner: Learner;
    completedUnit: string;
    nextUnit: string;
    deadline: string | null;
    daysRemaining: number | null;
    urgency: 'overdue' | 'urgent' | 'upcoming';
    customReminderMessage: string;
    hasLoggedSession: boolean;
}

const AttentionPagination: React.FC<{ 
    currentPage: number; 
    totalPages: number; 
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void 
}> = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
    if (totalPages <= 1) return null;
    const startIdx = (currentPage - 1) * itemsPerPage + 1;
    const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {startIdx}-{endIdx} of {totalItems}
            </span>
            <div className="flex items-center gap-1.5">
                <button 
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)} 
                    disabled={currentPage === 1} 
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                    &larr; Prev
                </button>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 px-1">
                    {currentPage} / {totalPages}
                </span>
                <button 
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages} 
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                    Next &rarr;
                </button>
            </div>
        </div>
    );
};

const AttentionNeeded: React.FC<AttentionNeededProps> = ({ learners }) => {
    const dismissFromAttention = useLearnerStore(state => state.dismissFromAttention);
    const undismissFromAttention = useLearnerStore(state => state.undismissFromAttention);
    const addChatMessageToLearner = useLearnerStore(state => state.addChatMessageToLearner);
    const tutorInfo = useAppStore(state => state.tutorInfo);
    
    const [activeTab, setActiveTab] = useState<'path' | 'risk'>('path');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [sentChatId, setSentChatId] = useState<string | null>(null);
    
    // Pagination states
    const [pathPage, setPathPage] = useState(1);
    const [riskPage, setRiskPage] = useState(1);
    const [dismissedPage, setDismissedPage] = useState(1);
    
    const PATH_ITEMS_PER_PAGE = 2;
    const RISK_ITEMS_PER_PAGE = 3;
    const DISMISSED_ITEMS_PER_PAGE = 4;

    const coachName = tutorInfo?.name ? `Coach ${tutorInfo.name}` : 'Coach';

    // 1. Compute Standard Risk Items
    const attentionItems: AttentionItem[] = useMemo(() => {
        const items: AttentionItem[] = [];

        (learners || []).forEach(learner => {
            if (learner.isAttentionDismissed) return;

            const reasons: AttentionItem['reasons'] = [];
            let score = 0;

            const sessions = learner.sessions || [];
            const attendedSessions = sessions.filter(s => s.attended).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            // Inactivity
            if (attendedSessions.length === 0) {
                const daysSinceCreated = differenceInDays(new Date(), new Date((learner as any).dateCreated || new Date()));
                if (daysSinceCreated > 7) {
                    reasons.push({ type: 'inactive', label: `No sessions yet (${daysSinceCreated}d ago)`, severity: 'medium' });
                    score += 2;
                }
            } else {
                const lastAttendedDate = new Date(attendedSessions[0].date);
                const daysSinceLastSession = differenceInDays(new Date(), lastAttendedDate);
                if (daysSinceLastSession > 14) {
                     reasons.push({ type: 'inactive', label: `Inactive for ${formatDistanceToNow(lastAttendedDate)}`, severity: daysSinceLastSession > 21 ? 'high' : 'medium' });
                     score += daysSinceLastSession > 21 ? 3 : 1;
                }
                
                // Struggling (Weaknesses/Needs Help from latest session)
                const latestSession = attendedSessions[0];
                const needsHelp = latestSession.needsHelp || latestSession.aiAnalysis?.weaknesses || [];
                if (needsHelp.length > 0) {
                    reasons.push({ type: 'struggling', label: `Struggling with: ${needsHelp[0]}`, severity: 'high' });
                    score += 3;
                }
            }

            // Failed Challenges
            if (learner.challenges) {
                const failedChalls = Object.entries(learner.challenges).filter(([_, status]) => status === 'failed');
                if (failedChalls.length > 0) {
                     reasons.push({ type: 'challenge', label: `${failedChalls.length} failed challenge${failedChalls.length > 1 ? 's': ''}`, severity: 'medium' });
                     score += 2;
                }
            }

            if (reasons.length > 0) {
                items.push({ learner, reasons, totalSeverityScore: score });
            }
        });

        return items.sort((a, b) => b.totalSeverityScore - a.totalSeverityScore);
    }, [learners]);

    // 2. Compute Coach Path & Next Unit Trackers
    const coachPathItems: CoachPathItem[] = useMemo(() => {
        const items: CoachPathItem[] = [];

        (learners || []).forEach(learner => {
            if (learner.isAttentionDismissed) return;

            const lessonHistory = learner.lessonHistory || [];
            const attendedSessions = (learner.sessions || []).filter(s => s.attended).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            // Determine completed unit/lesson
            let completedUnit = "Onboarding Baseline Diagnostic";
            if (attendedSessions.length > 0 && (attendedSessions[0].lessonName || (attendedSessions[0] as any).title)) {
                completedUnit = attendedSessions[0].lessonName || (attendedSessions[0] as any).title;
            } else if (lessonHistory.length > 0) {
                completedUnit = lessonHistory[lessonHistory.length - 1].title;
            }

            // Determine next pending unit/lesson
            let nextUnit = "Unit 1: Core Fundamentals";
            const settings = learner.currentLessonSettings;
            if (settings?.unitNumber && settings?.unitName) {
                nextUnit = `${settings.unitNumber.startsWith('Unit') ? settings.unitNumber : 'Unit ' + settings.unitNumber}: ${settings.unitName}`;
            } else if (settings?.lessonName) {
                nextUnit = settings.lessonName;
            } else if (learner.coursePlan?.currentLesson) {
                nextUnit = String(learner.coursePlan.currentLesson);
            } else if (learner.coursePlan?.coursebookInfo?.unit && learner.coursePlan?.coursebookInfo?.unitTitle) {
                nextUnit = `${learner.coursePlan.coursebookInfo.unit}: ${learner.coursePlan.coursebookInfo.unitTitle}`;
            }

            // Determine deadline date
            let targetDeadline: string | null = settings?.nextClassDate || null;
            if (!targetDeadline && learner.nextSessionDate) {
                targetDeadline = learner.nextSessionDate;
            } else if (!targetDeadline && learner.smartGoal?.deadline) {
                targetDeadline = learner.smartGoal.deadline;
            }

            // Calculate urgency and days remaining
            let daysRemaining: number | null = null;
            let urgency: 'overdue' | 'urgent' | 'upcoming' = 'upcoming';

            if (targetDeadline) {
                try {
                    const deadlineDate = new Date(`${targetDeadline}T23:59:59`);
                    daysRemaining = differenceInDays(deadlineDate, new Date());
                    if (daysRemaining < 0) {
                        urgency = 'overdue';
                    } else if (daysRemaining <= 3) {
                        urgency = 'urgent';
                    } else {
                        urgency = 'upcoming';
                    }
                } catch {
                    daysRemaining = null;
                }
            } else {
                urgency = 'urgent';
            }

            // Check if latest attended session is logged ON or AFTER the target deadline or matches the next unit
            let hasLoggedSession = false;
            if (targetDeadline && attendedSessions.length > 0) {
                const latestDate = new Date(attendedSessions[0].date).getTime();
                const deadlineTime = new Date(`${targetDeadline}T00:00:00`).getTime();
                if (latestDate >= deadlineTime || (attendedSessions[0].lessonName === nextUnit)) {
                    hasLoggedSession = true;
                }
            }

            if (!hasLoggedSession) {
                const deadlineFormatted = targetDeadline ? format(new Date(`${targetDeadline}T00:00:00`), 'EEEE, MMM d, yyyy') : 'this upcoming milestone';
                
                const customReminderMessage = `🚨 URGENT REMINDER FROM ${coachName.toUpperCase()} 🚨\n\n` +
                    `Hey ${learner.name}! ⏰ Your next milestone deadline is ${deadlineFormatted}!\n\n` +
                    `📚 Progress Status:\n` +
                    `✅ Completed: ${completedUnit}\n` +
                    `⏳ Required Next: ${nextUnit}\n\n` +
                    `⚡ Action Required Immediately:\n` +
                    `1️⃣ Complete your interactive self-study HTML lesson package: "${nextUnit}" 📖\n` +
                    `2️⃣ Lock in & confirm our next 1-on-1 coaching session before ${deadlineFormatted} to keep your 🔥 ${learner.streak || 0}-day streak alive! 🎯\n\n` +
                    `Let's make it happen! 💪🚀`;

                items.push({
                    learner,
                    completedUnit,
                    nextUnit,
                    deadline: targetDeadline,
                    daysRemaining,
                    urgency,
                    customReminderMessage,
                    hasLoggedSession
                });
            }
        });

        // Sort items: overdue first, then urgent, then upcoming
        return items.sort((a, b) => {
            const rank = { overdue: 0, urgent: 1, upcoming: 2 };
            if (rank[a.urgency] !== rank[b.urgency]) return rank[a.urgency] - rank[b.urgency];
            return (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999);
        });
    }, [learners, coachName]);

    const handleCopyReminder = (id: string, message: string) => {
        navigator.clipboard.writeText(message);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2500);
    };

    const handleSendChat = (learnerId: string, message: string) => {
        addChatMessageToLearner(learnerId, message);
        setSentChatId(learnerId);
        setTimeout(() => setSentChatId(null), 2500);
    };

    // Paginated Slices
    const totalPathPages = Math.ceil(coachPathItems.length / PATH_ITEMS_PER_PAGE);
    const paginatedPathItems = coachPathItems.slice((pathPage - 1) * PATH_ITEMS_PER_PAGE, pathPage * PATH_ITEMS_PER_PAGE);

    const totalRiskPages = Math.ceil(attentionItems.length / RISK_ITEMS_PER_PAGE);
    const paginatedRiskItems = attentionItems.slice((riskPage - 1) * RISK_ITEMS_PER_PAGE, riskPage * RISK_ITEMS_PER_PAGE);

    const dismissedLearners = (learners || []).filter(learner => learner.isAttentionDismissed);
    const totalDismissedPages = Math.ceil(dismissedLearners.length / DISMISSED_ITEMS_PER_PAGE);
    const paginatedDismissedLearners = dismissedLearners.slice((dismissedPage - 1) * DISMISSED_ITEMS_PER_PAGE, dismissedPage * DISMISSED_ITEMS_PER_PAGE);

    useEffect(() => {
        if (pathPage > totalPathPages && totalPathPages > 0) setPathPage(totalPathPages);
    }, [coachPathItems.length, totalPathPages, pathPage]);

    useEffect(() => {
        if (riskPage > totalRiskPages && totalRiskPages > 0) setRiskPage(totalRiskPages);
    }, [attentionItems.length, totalRiskPages, riskPage]);

    useEffect(() => {
        if (dismissedPage > totalDismissedPages && totalDismissedPages > 0) setDismissedPage(totalDismissedPages);
    }, [dismissedLearners.length, totalDismissedPages, dismissedPage]);

    return (
        <div className="space-y-3.5">
            {/* Header with Coach Branding and Tabs */}
            <div className="flex flex-col gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider truncate">
                        {coachName} Coaching
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {activeTab === 'path' ? `${coachPathItems.length} active` : `${attentionItems.length} alerts`}
                    </span>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setActiveTab('path')}
                        className={`flex-1 py-1 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
                            activeTab === 'path'
                                ? 'bg-white text-indigo-700 shadow-sm font-extrabold dark:bg-slate-700 dark:text-indigo-300'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                        }`}
                    >
                        <span>🎯</span> Path Check
                        {coachPathItems.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full">
                                {coachPathItems.length}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('risk')}
                        className={`flex-1 py-1 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
                            activeTab === 'risk'
                                ? 'bg-white text-rose-700 shadow-sm font-extrabold dark:bg-slate-700 dark:text-rose-300'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                        }`}
                    >
                        <span>⚡</span> Risk Alerts
                        {attentionItems.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] rounded-full">
                                {attentionItems.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* TAB 1: COACH PATH & NEXT UNIT */}
            {activeTab === 'path' && (
                <div className="space-y-3">
                    {coachPathItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-brand-gray-dark bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 p-4 text-center">
                            <span className="text-2xl mb-1.5">🎉</span>
                            <p className="font-bold text-xs text-emerald-900 dark:text-emerald-300">All learners are up to date!</p>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">All pending units and sessions are logged.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {paginatedPathItems.map(({ learner, completedUnit, nextUnit, deadline, daysRemaining, urgency, customReminderMessage }) => {
                                const urgencyBadge = urgency === 'overdue' 
                                    ? { label: `🚨 OVERDUE (${Math.abs(daysRemaining || 0)}d)`, color: 'bg-rose-100 text-rose-800 border-rose-300' }
                                    : urgency === 'urgent'
                                    ? { label: `⚠️ DUE SOON (${daysRemaining}d)`, color: 'bg-amber-100 text-amber-900 border-amber-300' }
                                    : { label: `⏱️ TARGET (${daysRemaining ?? 'Set'}d)`, color: 'bg-blue-50 text-blue-800 border-blue-200' };

                                return (
                                    <div 
                                        key={learner.id} 
                                        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs hover:shadow-md transition-all space-y-2.5 overflow-hidden"
                                    >
                                        {/* Left urgency accent bar */}
                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${urgency === 'overdue' ? 'bg-rose-500' : urgency === 'urgent' ? 'bg-amber-500' : 'bg-indigo-500'}`} />

                                        {/* Top Learner Bar */}
                                        <div className="flex items-center justify-between gap-2 pl-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img 
                                                    src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} 
                                                    alt={learner.name} 
                                                    className="w-8 h-8 rounded-full border border-indigo-200 object-cover shrink-0" 
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <Link to={`/learner/${learner.id}`} className="font-bold text-xs text-slate-900 dark:text-white hover:text-indigo-600 transition truncate max-w-[130px]" title={learner.name}>
                                                            {learner.name}
                                                        </Link>
                                                        <span className="text-[9px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1 rounded">
                                                            {learner.level}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${urgencyBadge.color}`}>
                                                            {urgencyBadge.label}
                                                        </span>
                                                        <span className="text-[10px] text-amber-600 font-bold">
                                                            {learner.streak || 0} 🔥
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => dismissFromAttention(learner.id)}
                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                                title={`Dismiss ${learner.name}`}
                                            >
                                                <i className="fas fa-times text-xs"></i>
                                            </button>
                                        </div>

                                        {/* Completed vs Pending Unit Box */}
                                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700/70 space-y-1.5 text-[11px] pl-2">
                                            <div className="min-w-0">
                                                <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                                                    ✅ Completed:
                                                </span>
                                                <p className="font-medium text-slate-700 dark:text-slate-300 truncate" title={completedUnit}>
                                                    {completedUnit}
                                                </p>
                                            </div>
                                            <div className="border-t border-slate-200 dark:border-slate-700/60 pt-1 min-w-0">
                                                <span className="text-[9px] uppercase font-bold text-rose-600 dark:text-rose-400 block">
                                                    ⏳ Next Unit:
                                                </span>
                                                <p className="font-bold text-indigo-950 dark:text-indigo-200 truncate" title={nextUnit}>
                                                    {nextUnit}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5 pl-1">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                📅 {deadline ? format(new Date(`${deadline}T00:00:00`), 'MMM d') : 'Pending'}
                                            </span>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyReminder(learner.id, customReminderMessage)}
                                                    className="px-2 py-1 text-[10px] font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 transition flex items-center gap-1 cursor-pointer"
                                                    title="Copy reminder"
                                                >
                                                    <span>{copiedId === learner.id ? '✅' : '📋'}</span>
                                                    <span>{copiedId === learner.id ? 'Copied' : 'Prompt'}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSendChat(learner.id, customReminderMessage)}
                                                    className="px-2 py-1 text-[10px] font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1 cursor-pointer"
                                                    title="Send to learner chat"
                                                >
                                                    <span>{sentChatId === learner.id ? '🚀' : '💬'}</span>
                                                    <span>{sentChatId === learner.id ? 'Sent' : 'Chat'}</span>
                                                </button>

                                                <Link
                                                    to={`/learner/${learner.id}?tab=sessions`}
                                                    className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                                                >
                                                    Log
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <AttentionPagination 
                                currentPage={pathPage}
                                totalPages={totalPathPages}
                                totalItems={coachPathItems.length}
                                itemsPerPage={PATH_ITEMS_PER_PAGE}
                                onPageChange={setPathPage}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: RISK & STRUGGLES */}
            {activeTab === 'risk' && (
                <div className="space-y-3">
                    {attentionItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-brand-gray-dark bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 text-center">
                            <span className="text-2xl mb-1">🎉</span>
                            <p className="font-medium text-xs">No struggle alerts detected.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {paginatedRiskItems.map(({ learner, reasons }) => {
                                const completedSessions = learner.sessions ? learner.sessions.filter(s => s.attended).length : 0;

                                return (
                                    <div key={learner.id} className="relative overflow-hidden p-3 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/40 rounded-xl shadow-xs hover:shadow-md transition-all space-y-2">
                                        {/* Risk indicator bar */}
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-500 to-amber-500"></div>
                                        
                                        <div className="flex items-start justify-between gap-2 pl-1">
                                            <Link to={`/learner/${learner.id}`} className="flex items-center gap-2 min-w-0">
                                                <img 
                                                    src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} 
                                                    alt={learner.name} 
                                                    className="w-8 h-8 rounded-full border border-rose-200 object-cover shrink-0" 
                                                />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate hover:text-indigo-600">
                                                        {learner.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        {learner.level} • {completedSessions} sessions • {learner.streak || 0} 🔥
                                                    </p>
                                                </div>
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={() => dismissFromAttention(learner.id)}
                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                                title={`Dismiss ${learner.name}`}
                                            >
                                                <i className="fas fa-times text-xs"></i>
                                            </button>
                                        </div>

                                        {/* Badges */}
                                        <div className="flex flex-wrap gap-1.5 pl-1">
                                            {reasons.map((r, i) => {
                                                const badgeColors = r.severity === 'high' 
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400' 
                                                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400';

                                                return (
                                                    <span 
                                                        key={i} 
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold border rounded-md truncate max-w-full ${badgeColors}`}
                                                        title={r.label}
                                                    >
                                                        <i className={`fas ${r.type === 'inactive' ? 'fa-clock' : r.type === 'struggling' ? 'fa-exclamation-circle' : 'fa-calendar-times'} text-[9px]`}></i>
                                                        <span className="truncate">{r.label}</span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            <AttentionPagination 
                                currentPage={riskPage}
                                totalPages={totalRiskPages}
                                totalItems={attentionItems.length}
                                itemsPerPage={RISK_ITEMS_PER_PAGE}
                                onPageChange={setRiskPage}
                            />
                        </div>
                    )}
                </div>
            )}
            
            {/* Dismissed Section */}
            {dismissedLearners.length > 0 && (
                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Dismissed ({dismissedLearners.length})
                        </h4>
                    </div>
                    <div className="space-y-1.5">
                        {paginatedDismissedLearners.map(learner => (
                            <div key={learner.id} className="flex items-center justify-between p-2 bg-slate-50/80 dark:bg-slate-800/40 rounded-lg text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                     <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} alt={learner.name} className="w-5 h-5 rounded-full opacity-50 grayscale" />
                                     <p className="text-[11px] font-medium text-slate-500 truncate">{learner.name}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => undismissFromAttention(learner.id)}
                                    className="text-[10px] font-bold text-brand-blue hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded cursor-pointer"
                                >
                                    Restore
                                </button>
                            </div>
                        ))}
                    </div>
                    <AttentionPagination 
                        currentPage={dismissedPage}
                        totalPages={totalDismissedPages}
                        totalItems={dismissedLearners.length}
                        itemsPerPage={DISMISSED_ITEMS_PER_PAGE}
                        onPageChange={setDismissedPage}
                    />
                </div>
            )}
        </div>
    );
};

export default AttentionNeeded;
