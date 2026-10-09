import React, { useState, useMemo } from 'react';
import { startOfWeek, format } from 'date-fns';
import { Learner } from '../../../types2';
import { useAutomationStore } from '../../../store/useAutomationStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useAppStore } from '../../../store/useAppStore';
import { useLearnerStore } from '../../../store/useLearnerStore';
import { getAvatarUrl } from '../../../services/avatarService';
import { 
  buildSmartCoachingAiPrompt, 
  parseSmartCoachingJson, 
  SmartGoalRoadmapPhase, 
  WhatToStudyItem, 
  WeeklyMilestoneItem 
} from '../../../services/smartCoachingPromptBuilder';

interface SmartGoalCardProps {
  learner: Learner;
  onOpenTracker: () => void;
  onNavigateTab?: (tabName: string) => void;
}

export const SmartGoalCard: React.FC<SmartGoalCardProps> = ({ 
  learner, 
  onOpenTracker,
  onNavigateTab 
}) => {
  const updateLearner = useLearnerStore(state => state.updateLearner);
  const tutor = useAuthStore(state => state.tutor) || useAppStore(state => state.tutorInfo);
  
  const tutorName = tutor?.name || 'Tutor';
  const coachDisplayName = `Coach ${tutorName}`;
  const coachAvatarUrl = getAvatarUrl('other', (tutor as any)?.avatarId || (tutor as any)?.avatarUrl, tutorName);

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const smartGoal = learner.smartGoal;
  const currentLevel = smartGoal?.currentLevel || learner.cefrLevel || learner.level || 'B1';
  const targetLevel = smartGoal?.targetLevel || 'B2';
  const hoursPerWeek = smartGoal?.hoursPerWeek || 4;
  const lessonsPerWeek = smartGoal?.lessonsPerWeek || Math.max(1, Math.round(hoursPerWeek / 1.5));
  
  const deadlineDate = smartGoal?.deadline ? new Date(smartGoal.deadline) : null;
  const daysRemaining = useMemo(() => {
    if (!deadlineDate) return null;
    const diffMs = deadlineDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [deadlineDate]);

  // Derived or stored roadmap phases
  const roadmapPhases: SmartGoalRoadmapPhase[] = useMemo(() => {
    if (smartGoal?.roadmapPhases && smartGoal.roadmapPhases.length > 0) {
      return smartGoal.roadmapPhases;
    }
    // Fallback structured default phases
    return [
      {
        phase: 1,
        title: 'Foundation & Core Accuracy',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetCefr: `${currentLevel}+`,
        status: 'in_progress',
        focusSkills: ['Grammar Precision', 'Active Collocations', 'Sentence Flow'],
        keyMilestones: ['Complete core Units 1-2', 'Achieve >85% on accuracy checkpoint'],
        grammarFocus: 'Conditional structures & modal precision',
        vocabularyFocus: 'Workplace & conversational collocations'
      },
      {
        phase: 2,
        title: 'Fluency Expansion & Spontaneous Dialogue',
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetCefr: targetLevel,
        status: 'upcoming',
        focusSkills: ['Spontaneous Speech', 'Discourse Connectors', 'Accent Cadence'],
        keyMilestones: ['Uninterrupted 5-min talk', 'Simulated real-world case study'],
        grammarFocus: 'Inversion, cleft sentences & stance markers',
        vocabularyFocus: 'High-frequency idiomatic expressions'
      },
      {
        phase: 3,
        title: 'Advanced Mastery & Professional Polish',
        targetDate: smartGoal?.deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetCefr: `${targetLevel}+`,
        status: 'upcoming',
        focusSkills: ['Executive Polish', 'Speed Listening', 'Rhetorical Agility'],
        keyMilestones: ['Term milestone exam pass', 'Target CEFR benchmark achieved'],
        grammarFocus: 'Pragmatic hedging & rhetorical framing',
        vocabularyFocus: 'Advanced nuanced terminology'
      }
    ];
  }, [smartGoal, currentLevel, targetLevel]);

  // Weekly Milestones — built from the learner's REAL generated lesson history
  // (Lessons > Learner Path > Lesson History Log), not hardcoded goals.
  const weeklyMilestones: (WeeklyMilestoneItem & { _lessons?: any[]; _weekStart?: string })[] = useMemo(() => {
    interface WeekBucket { lessons: any[]; planned: number; attended: number; }
    const history = (learner as any).lessonHistory || [];
    const sessions = learner.sessions || [];
    const byWeek = new Map<string, WeekBucket>();

    history.forEach((h: any) => {
      if (!h || !h.date) return;
      const d = new Date(h.date);
      if (isNaN(d.getTime())) return;
      const key = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const bucket = byWeek.get(key) || { lessons: [], planned: 0, attended: 0 };
      bucket.lessons.push(h);
      byWeek.set(key, bucket);
    });
    sessions.forEach(s => {
      const d = new Date(s.date);
      if (isNaN(d.getTime())) return;
      const key = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const bucket = byWeek.get(key);
      if (!bucket) return;
      bucket.planned += 1;
      if (s.attended || s.status === 'completed') bucket.attended += 1;
    });

    return Array.from(byWeek.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([weekStart, bucket], idx) => {
      const allLessonsDone = bucket.lessons.length > 0 && bucket.lessons.every((l: any) => {
        if (!l.completedHeadings || l.completedHeadings.length === 0) return false;
        return !l.headings || l.completedHeadings.length >= l.headings.length;
      });
      const title = bucket.lessons.length === 1
        ? (bucket.lessons[0].title || 'Lesson')
        : `${bucket.lessons.length} lessons this week`;
      return {
        week: idx + 1,
        title,
        focus: bucket.lessons.map((l: any) => l.title || 'Lesson').slice(0, 3).join(' • '),
        isCompleted: allLessonsDone || bucket.attended > 0,
        _lessons: bucket.lessons,
        _weekStart: weekStart,
      };
    });
  }, [learner]);

  // Term Plan Details
  const attendedCount = (learner.sessions || []).filter(s => s.attended).length;
  const termTotal = smartGoal?.termPlanDetails?.totalSessions || 24;
  const termProgressPct = Math.min(100, Math.round((attendedCount / termTotal) * 100));

  // Live cross-tab data (sessions, homework, exams, spaced repetition, reviews)
  const homeworkAssignments = useAutomationStore(state => state.homeworkAssignments);
  const spacedRepetitionItems = useAutomationStore(state => state.spacedRepetitionItems);
  const learnerHomework = homeworkAssignments.filter(h => h.learnerId === learner.id);
  const pendingHomework = learnerHomework.filter(h => h.status === 'assigned' || h.status === 'overdue');
  const learnerReviews = spacedRepetitionItems.filter(s => s.learnerId === learner.id);
  const dueReviews = learnerReviews.filter(r => r.status !== 'mastered' && (!r.nextReviewDate || new Date(r.nextReviewDate).getTime() <= Date.now()));
  const examsLogged = ((learner as any).examAnalysis || []).length;
  const lovedClasses = (learner.sessions || []).filter(s => s.attended && ((s.rating && Number(s.rating) >= 4) || (s as any).aiAnalysis?.sentiment === 'positive')).length;

  // Handlers
  const handleCopyPrompt = () => {
    const promptText = buildSmartCoachingAiPrompt(learner);
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    showToast('📋 Profile prompt copied to clipboard! Paste into external AI to get roadmap JSON.');
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const handleApplyPastedJson = () => {
    if (!jsonInput.trim()) {
      setJsonError('Please paste the JSON generated by the external AI.');
      return;
    }
    
    const res = parseSmartCoachingJson(jsonInput);
    if (!res.success || !res.data) {
      setJsonError(res.error || 'Failed to parse JSON.');
      return;
    }

    const data = res.data;
    const existingSettings = learner.currentLessonSettings || {
      lessonName: '',
      materialLinks: '',
      teacherNotes: '',
      homeworkChecklist: '',
      themeColor: '#111827',
      attachedFiles: []
    };

    const finalNextDate = data.nextRecommendedClassDate || existingSettings.nextClassDate || smartGoal?.nextRecommendedClassDate;

    const updatedSmartGoal = {
      goal: data.goal,
      goals: data.goals,
      targetLevel: data.targetLevel || targetLevel,
      currentLevel: data.currentLevel || currentLevel,
      deadline: data.deadline || smartGoal?.deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      hoursPerWeek: data.hoursPerWeek,
      lessonsPerWeek: data.lessonsPerWeek,
      studyPace: data.studyPace || 'Balanced',
      lifestyleWindow: data.lifestyleWindow || 'Evening Deep-Dive',
      nextRecommendedClassDate: finalNextDate,
      coachMotivationalQuote: data.coachMotivationalQuote,
      coachingSummary: data.coachingSummary,
      coachName: coachDisplayName,
      whatToStudyNext: data.whatToStudyNext,
      weeklyMilestones: data.weeklyMilestones,
      roadmapPhases: data.roadmapPhases,
      keyStrengthsIdentified: data.keyStrengthsIdentified,
      priorityFixes: data.priorityFixes,
      termPlanDetails: {
        totalSessions: data.termPlanDetails?.totalSessions || termTotal,
        sessionsCompleted: attendedCount,
        expectedCompletionDate: data.deadline,
        weeklyCadence: `${data.lessonsPerWeek} sessions / week`,
        attendanceTargetPct: data.termPlanDetails?.attendanceTargetPct || 95,
        notes: data.termPlanDetails?.notes || ''
      },
      recommendedMilestones: data.recommendedMilestones,
      aiAnalysis: data.coachingSummary
    };

    updateLearner({
      ...learner,
      smartGoal: updatedSmartGoal,
      currentLessonSettings: {
        ...existingSettings,
        nextClassDate: finalNextDate
      }
    });

    setIsPasteModalOpen(false);
    setJsonInput('');
    setJsonError('');
    showToast('🎯 SMART Goal Roadmap & Term Plan successfully updated!');
  };

  // Toggling a milestone writes back to the real lesson history — marking the
  // week's generated lessons as fully completed (or un-completed).
  const toggleMilestoneCompletion = (index: number) => {
    const milestone = weeklyMilestones[index];
    const lessons = milestone?._lessons || [];
    if (lessons.length === 0) return;

    const anyDone = lessons.some((l: any) => l.completedHeadings && l.completedHeadings.length > 0);
    const currentHistory = (learner as any).lessonHistory || [];
    const updatedHistory = currentHistory.map((h: any) => {
      const idx = lessons.findIndex((l: any) => l === h || l.id === h.id);
      if (idx === -1) return h;
      return {
        ...h,
        completedHeadings: anyDone ? [] : (h.headings || []).slice(),
      };
    });

    updateLearner({
      ...learner,
      lessonHistory: updatedHistory,
    });
  };

  return (
    <div id="smart-goal-roadmap-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Toast alert */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between animate-fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="text-white/80 hover:text-white font-black ml-3">✕</button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img 
              src={coachAvatarUrl} 
              alt={coachDisplayName} 
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500/20 shadow-md bg-slate-100 dark:bg-slate-800"
              onError={(e) => { (e.target as any).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><text y="18" font-size="18">🧑‍🏫</text></svg>'; }}
            />
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-black px-1 rounded-full ring-2 ring-white dark:ring-slate-900">
              ✓
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tracking-tight">
                SMART Goal Roadmap & Term Plan
              </h3>
              <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                {coachDisplayName}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Roadmap & term plan for <strong className="text-slate-800 dark:text-slate-200">{learner.name}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons: Analyse (Copy Prompt) / Paste JSON / Customize */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-extrabold text-xs px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
            title="Copy all learner profile context into an AI prompt ready for analysis"
          >
            <span>{copiedPrompt ? '✅' : '⚡'}</span>
            <span>{copiedPrompt ? 'Prompt Copied!' : 'Analyse (Copy Prompt)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Paste external AI JSON to automatically construct roadmap and term plan"
          >
            <span>📥</span>
            <span>Paste JSON Plan</span>
          </button>

          <button
            type="button"
            onClick={onOpenTracker}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs px-3.5 py-2.5 rounded-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <span>✏️</span>
            <span>Customize Plan</span>
          </button>
        </div>
      </div>

      {/* Target Goal Banner & Executive Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Level Progression Journey */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 p-4 rounded-2xl space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            CEFR Trajectory
          </span>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white font-black text-xs px-2.5 py-1 rounded-lg">
              {currentLevel}
            </span>
            <span className="text-slate-400 font-bold">➔</span>
            <span className="bg-emerald-600 text-white font-black text-xs px-2.5 py-1 rounded-lg">
              {targetLevel}
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
            {smartGoal?.goal || 'Conversational & Professional Fluency'}
          </p>
        </div>

        {/* Weekly Study Cadence */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 p-4 rounded-2xl space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Study Pace & Frequency
          </span>
          <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-baseline gap-1.5">
            <span>{hoursPerWeek} hrs/week</span>
            <span className="text-xs font-medium text-slate-500">({lessonsPerWeek} sessions/wk)</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
            {smartGoal?.studyPace || 'Balanced'} pace • {smartGoal?.lifestyleWindow || 'Evening Window'}
          </p>
        </div>

        {/* Target Deadline Horizon */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 p-4 rounded-2xl space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Target Completion Deadline
          </span>
          <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
            {deadlineDate ? deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set yet'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
              {daysRemaining !== null ? `${daysRemaining} days remaining` : 'Structured plan'}
            </span>
          </div>
        </div>

        {/* Term Attendance Progress */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Term Sessions Completed
            </span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
              {termProgressPct}%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(5, termProgressPct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            <strong>{attendedCount}</strong> of <strong>{termTotal}</strong> sessions logged
          </p>
        </div>
      </div>

      {/* Roadmap Phases — slim visual strip, no long text */}
      <div className="space-y-2">
        <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>🗺️</span> Roadmap Phases
        </h4>
        <div className="flex flex-col md:flex-row gap-2.5">
          {roadmapPhases.map((phase, idx) => {
            const isCompleted = phase.status === 'completed';
            const isInProgress = phase.status === 'in_progress' || (!isCompleted && idx === 0);
            return (
              <div
                key={phase.phase || idx}
                className={`flex-1 p-3.5 rounded-2xl border min-w-0 ${
                  isCompleted
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                    : isInProgress
                      ? 'bg-blue-50/40 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/15'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Phase {phase.phase || idx + 1}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isCompleted ? 'bg-emerald-600 text-white' : isInProgress ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {isCompleted ? '✓ Done' : isInProgress ? '🔄 Now' : '⏳ Next'}
                  </span>
                </div>
                <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-snug mt-1.5">{phase.title}</h5>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">{phase.targetCefr || 'CEFR Step'}</span>
                  {phase.targetDate && <span className="text-[9px] font-bold text-slate-500">📅 {phase.targetDate}</span>}
                </div>
                {(phase.focusSkills || []).length > 0 && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 truncate" title={(phase.focusSkills || []).join(' · ')}>
                    {(phase.focusSkills || []).join(' · ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Milestones (real lesson history) + Live Status (real cross-tab data) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
        
        {/* Weekly Milestones — from the Learner Path lesson history log */}
        <div className="lg:col-span-2 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
              <span>🎯</span> Weekly Milestones
            </h4>
            <span className="text-[10px] font-bold text-slate-400">{weeklyMilestones.length} wk</span>
          </div>

          {weeklyMilestones.length === 0 ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 py-2">No lessons logged yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {weeklyMilestones.map((m, idx) => (
                <button
                  key={m._weekStart || idx}
                  type="button"
                  onClick={() => toggleMilestoneCompletion(idx)}
                  className={`px-3 py-2 rounded-full border text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                    m.isCompleted
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 line-through'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
                  }`}
                  title={`Click to ${m.isCompleted ? 'reopen' : 'complete'} this week's lesson in the lesson history`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center text-[8px] ${m.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-500'}`}>{m.isCompleted ? '✓' : ''}</span>
                  <span className="max-w-[180px] truncate">{m.title}</span>
                  <span className="text-[9px] font-bold text-slate-400">W{m.week || idx + 1}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Status — always synced with sessions, homework, exams & reviews */}
        <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
          <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
            <span>⚡</span> Live Status
          </h4>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-center">
              <div className="text-sm font-black text-amber-600 dark:text-amber-400">🔥 {learner.streak || 0}</div>
              <div className="text-[8px] font-bold uppercase text-slate-400">Streak</div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-center">
              <div className={`text-sm font-black ${pendingHomework.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>📚 {pendingHomework.length}</div>
              <div className="text-[8px] font-bold uppercase text-slate-400">Homework</div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-center">
              <div className={`text-sm font-black ${dueReviews.length > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>🔁 {dueReviews.length}</div>
              <div className="text-[8px] font-bold uppercase text-slate-400">Reviews due</div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-center">
              <div className="text-sm font-black text-violet-600">🎓 {examsLogged}</div>
              <div className="text-[8px] font-bold uppercase text-slate-400">Exams</div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-center">
              <div className="text-sm font-black text-pink-600">❤️ {lovedClasses}</div>
              <div className="text-[8px] font-bold uppercase text-slate-400">Loved</div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-center">
              <div className="text-sm font-black text-emerald-600">✅ {attendedCount}</div>
              <div className="text-[8px] font-bold uppercase text-slate-400">Attended</div>
            </div>
          </div>
        </div>
      </div>

      {/* Paste AI JSON Plan Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📥</span>
                <h4 className="font-black text-base">Import SMART Roadmap JSON</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 font-black text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <p>
                1. Click <strong>"Analyse (Copy Prompt)"</strong> to copy learner context to clipboard.
              </p>
              <p>
                2. Paste into ChatGPT, Claude, or Gemini to generate the custom coaching roadmap JSON.
              </p>
              <p>
                3. Paste the generated JSON below and click <strong>"Apply Roadmap"</strong>.
              </p>
            </div>

            <textarea
              rows={9}
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setJsonError('');
              }}
              placeholder='Paste JSON here... e.g. { "goal": "B2 Fluency", "hoursPerWeek": 4, "roadmapPhases": [...], ... }'
              className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 font-mono text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {jsonError && (
              <div className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800">
                {jsonError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPastedJson}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Apply Roadmap 🎯
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
