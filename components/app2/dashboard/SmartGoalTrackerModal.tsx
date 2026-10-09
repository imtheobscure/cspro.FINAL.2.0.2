import React, { useState, useMemo } from 'react';
import { useLearnerStore } from '../../../store/useLearnerStore';
import { useCalendarStore } from '../../../store/useCalendarStore';
import { useAutomationStore } from '../../../store/useAutomationStore';
import { Learner } from '../../../types2';
import { buildSmartCoachingAiPrompt, parseSmartCoachingJson } from '../../../services/smartCoachingPromptBuilder';

interface SmartGoalTrackerModalProps {
    learner: Learner;
    onClose: () => void;
}

export const SmartGoalTrackerModal: React.FC<SmartGoalTrackerModalProps> = ({ learner, onClose }) => {
    const updateLearner = useLearnerStore(state => state.updateLearner);
    const addCalendarEvent = useCalendarStore(state => state.addCalendarEvent);

    const [step, setStep] = useState<1 | 2>(1);

    // Extract competency goals from learner profile
    const learnerCompetencies = useMemo(() => {
        const list: string[] = [];
        if (learner.competencies && Array.isArray(learner.competencies)) {
            learner.competencies.forEach(c => {
                if (c.name && !list.includes(c.name)) list.push(c.name);
            });
        }
        if ((learner as any).syllabus?.competencies && Array.isArray((learner as any).syllabus.competencies)) {
            (learner as any).syllabus.competencies.forEach((c: any) => {
                if (c.name && !list.includes(c.name)) list.push(c.name);
            });
        }
        const cp = learner.coursePlan as any;
        if (cp?.shortTermGoals && !list.includes(cp.shortTermGoals)) {
            list.push(cp.shortTermGoals);
        }
        if (cp?.longTermGoals && !list.includes(cp.longTermGoals)) {
            list.push(cp.longTermGoals);
        }
        
        // Fallback default competency goals if learner has no custom competencies set
        if (list.length === 0) {
            return [
                '🗣️ Spontaneous Speech & Conversational Fluency',
                '💼 Professional & Business Communication',
                '🎓 Exam Preparation & Academic Syntax',
                '🎧 Native Speed Listening & Accent Adaptation',
                '✍️ Advanced Writing & Lexical Precision'
            ];
        }
        return list;
    }, [learner]);

    // Active course selection (coursebook or course name)
    const courseName = learner.coursePlan?.courseName || learner.coursePlan?.coursebookInfo?.coursebook || 'General English Syllabus';

    // Personal syllabus chapters — selectable alongside competencies ("chapters" =
    // the per-competency sections from Lessons > Learner Path).
    const syllabusComps: any[] = ((learner as any).syllabus?.competencies) || [];
    const [chapterSearch, setChapterSearch] = useState('');
    const [goalSearch, setGoalSearch] = useState('');
    const chapterOptions = useMemo(() => {
        const titleCounts: Record<string, number> = {};
        syllabusComps.forEach((c: any) => (c.chapters || []).forEach((ch: any) => {
            const t = ch?.title || 'Untitled chapter';
            titleCounts[t] = (titleCounts[t] || 0) + 1;
        }));
        const out: { id: string; title: string; compName: string; status: string; label: string }[] = [];
        syllabusComps.forEach((c: any) => {
            (c.chapters || []).forEach((ch: any) => {
                const t = ch?.title || 'Untitled chapter';
                const repeated = titleCounts[t] > 1;
                const label = repeated && c.competencyName ? `${c.competencyName} — ${t}` : t;
                out.push({ id: ch?.id || label, title: t, compName: c.competencyName || '', status: ch?.status || 'pending', label });
            });
        });
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [learner]);
    const q = chapterSearch.trim().toLowerCase();
    const filteredChapters = q
        ? chapterOptions.filter(ch => `${ch.label} ${ch.compName} ${ch.title}`.toLowerCase().includes(q))
        : chapterOptions;
    const gq = goalSearch.trim().toLowerCase();
    const filteredCompetencies = gq
        ? learnerCompetencies.filter(c => c.toLowerCase().includes(gq))
        : learnerCompetencies;

    // State
    const [selectedGoals, setSelectedGoals] = useState<string[]>(() => {
        if (learner.smartGoal?.goals && Array.isArray(learner.smartGoal.goals) && learner.smartGoal.goals.length > 0) {
            return learner.smartGoal.goals;
        }
        if (learner.smartGoal?.goal) {
            return [learner.smartGoal.goal];
        }
        return learnerCompetencies.length > 0 ? [learnerCompetencies[0]] : ['Spontaneous Speech & Conversational Fluency'];
    });

    const [customGoalInput, setCustomGoalInput] = useState('');
    const [studyHours, setStudyHours] = useState(learner.smartGoal?.hoursPerWeek?.toString() || '4');
    const [studyPace, setStudyPace] = useState(learner.smartGoal?.studyPace || 'balanced');
    const [lifestyleWindow, setLifestyleWindow] = useState(learner.smartGoal?.lifestyleWindow || 'evening');
    
    // Default deadline date: 90 days from today
    const defaultDeadline = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [targetDate, setTargetDate] = useState(learner.smartGoal?.deadline || defaultDeadline);

    // AI Plan import states
    const [aiAnalysisText, setAiAnalysisText] = useState<string>(learner.smartGoal?.aiAnalysis || '');
    const [milestonesList, setMilestonesList] = useState<string[]>(learner.smartGoal?.recommendedMilestones || []);
    const [importedCoachingData, setImportedCoachingData] = useState<any>(learner.smartGoal || null);
    const [learnerReply, setLearnerReply] = useState(learner.smartGoal?.learnerReply || '');
    const [copiedAsk, setCopiedAsk] = useState(false);

    // Prompt & JSON Import UI states
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [jsonError, setJsonError] = useState('');

    const currentLevel = learner.cefrLevel || learner.level || 'B1';

    // ---- Auto-prefilled snapshot (everything already lives in the profile) ----
    const attendedCount = (learner.sessions || []).filter(s => s.attended).length;
    const attendancePct = (learner.sessions || []).length > 0 ? Math.round((attendedCount / (learner.sessions || []).length) * 100) : 100;
    const pendingHomework = ((learner as any).homeworkAssignments || []).filter((h: any) => h.status === 'assigned' || h.status === 'overdue').length;
    const examCount = ((learner as any).examAnalysis || []).length;
    const reviewsDue = useAutomationStore.getState().spacedRepetitionItems.filter(s => s.learnerId === learner.id).length;
    const history = (learner.lessonHistory || []);
    const currentLesson = history.length > 0 ? history[history.length - 1] : undefined;
    const lessonProgressPct = currentLesson && currentLesson.headings?.length
      ? Math.round(((currentLesson.completedHeadings || []).length / currentLesson.headings.length) * 100)
      : 0;


    // Calculations
    const hours = Math.max(1, parseInt(studyHours, 10) || 4);
    const lessonsPerWeek = Math.max(1, Math.round(hours / 1.5));
    const daysBetweenLessons = Math.ceil(7 / lessonsPerWeek);
    
    const nextClassDateObj = new Date(Date.now() + daysBetweenLessons * 24 * 60 * 60 * 1000);
    const nextRecommendedClassDate = nextClassDateObj.toISOString().split('T')[0];

    const toggleGoal = (goalName: string) => {
        setSelectedGoals(prev => {
            if (prev.includes(goalName)) {
                return prev.length > 1 ? prev.filter(g => g !== goalName) : prev;
            } else {
                return [...prev, goalName];
            }
        });
    };

    const handleAddCustomGoal = () => {
        if (!customGoalInput.trim()) return;
        const trimmed = customGoalInput.trim();
        if (!selectedGoals.includes(trimmed)) {
            setSelectedGoals(prev => [...prev, trimmed]);
        }
        setCustomGoalInput('');
    };

    const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
    const nextMonthLabel = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const askMessage = [
        `Hi ${learner.name}! 👋`,
        '',
        `I am planning your coaching schedule for ${nextMonthLabel} and I want to build it around your real life. Could you answer these 7 quick questions?`,
        '',
        `1) How much free time do you have each week overall?`,
        `2) How much time can you put aside for studying English per day?`,
        `3) What time of day do you study best (morning / afternoon / evening / weekend)?`,
        `4) Do you have any plans or trips next month that would take days away?`,
        `5) Which days of the week are you NOT available at all?`,
        `6) How many English classes per week do you want (for example 2 a week)?`,
        `7) Any holidays, exams or busy periods I should avoid?`,
        '',
        `For context, we are currently working at ${currentLevel} level${learner.occupation ? ` with a focus on your ${learner.occupation} work needs` : ''}${currentLesson ? `, and the current lesson is "${currentLesson.title}"` : ''}.`,
        '',
        `No rush — just reply in your own words and I will adjust everything to your week. 😊`,
    ].join('\n');

    const handleCopyAsk = async () => {
        try {
            await navigator.clipboard.writeText(askMessage);
            setCopiedAsk(true);
            setTimeout(() => setCopiedAsk(false), 3000);
        } catch {
            setCopiedAsk(false);
        }
    };

    const handleCopyPrompt = () => {
        const promptText = buildSmartCoachingAiPrompt(learner, { learnerReply, selectedGoals });
        navigator.clipboard.writeText(promptText);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 3000);
    };

    const handleImportJson = () => {
        setJsonError('');
        const res = parseSmartCoachingJson(jsonInput);
        if (!res.success || !res.data) {
            setJsonError(res.error || 'Invalid JSON format.');
            return;
        }

        const data = res.data;
        if (data.goals && Array.isArray(data.goals) && data.goals.length > 0) {
            setSelectedGoals(data.goals);
        } else if (data.goal) {
            setSelectedGoals([data.goal]);
        }
        if (data.hoursPerWeek) setStudyHours(data.hoursPerWeek.toString());
        if (data.studyPace) setStudyPace(data.studyPace);
        if (data.lifestyleWindow) setLifestyleWindow(data.lifestyleWindow);
        if (data.deadline) setTargetDate(data.deadline);
        if (data.coachingSummary || data.aiAnalysis) setAiAnalysisText(data.coachingSummary || data.aiAnalysis || '');
        if (data.recommendedMilestones && Array.isArray(data.recommendedMilestones)) {
            setMilestonesList(data.recommendedMilestones);
        }
        if (data.learnerReply) setLearnerReply(data.learnerReply);
        setImportedCoachingData(data);

        setIsImportModalOpen(false);
        setJsonInput('');
        setStep(2);
    };

    const handleSave = () => {
        const attendedCount = (learner.sessions || []).filter(s => s.attended).length;
        const syllabusChapters = chapterOptions.filter(o => selectedGoals.includes(o.label)).map(o => o.label);
        const smartGoalData = {
            goal: selectedGoals.join(', '),
            goals: selectedGoals,
            hoursPerWeek: hours,
            lessonsPerWeek,
            studyPace,
            lifestyleWindow,
            deadline: targetDate,
            nextRecommendedClassDate,
            aiAnalysis: aiAnalysisText,
            coachingSummary: aiAnalysisText,
            coachMotivationalQuote: importedCoachingData?.coachMotivationalQuote,
            whatToStudyNext: importedCoachingData?.whatToStudyNext,
            weeklyMilestones: importedCoachingData?.weeklyMilestones,
            roadmapPhases: importedCoachingData?.roadmapPhases,
            keyStrengthsIdentified: importedCoachingData?.keyStrengthsIdentified,
            priorityFixes: importedCoachingData?.priorityFixes,
            learnerReply,
            syllabusChapters,
            monthlyPlans: importedCoachingData?.monthlyPlans || [],
            termPlanDetails: importedCoachingData?.termPlanDetails || {
                totalSessions: 24,
                sessionsCompleted: attendedCount,
                expectedCompletionDate: targetDate,
                weeklyCadence: `${lessonsPerWeek} sessions / week`,
                attendanceTargetPct: 95
            },
            recommendedMilestones: milestonesList,
            testResults: {
                goalType: selectedGoals.join(', '),
                goals: selectedGoals,
                studyHours,
                studyPace,
                lifestyleWindow,
                targetDate
            }
        };

        const existingSettings = learner.currentLessonSettings || {
            lessonName: '',
            materialLinks: '',
            teacherNotes: '',
            homeworkChecklist: '',
            themeColor: '#111827',
            attachedFiles: []
        };

        const finalNextDate = existingSettings.nextClassDate || nextRecommendedClassDate;

        updateLearner({
            ...learner,
            smartGoal: smartGoalData,
            currentLessonSettings: {
                ...existingSettings,
                nextClassDate: finalNextDate
            }
        });

        // Sync calendar event
        if (finalNextDate) {
            addCalendarEvent({
                id: `smart-class-${learner.id}-${Date.now()}`,
                title: `🎯 Scheduled Lesson: ${learner.name}`,
                date: finalNextDate,
                time: '10:00',
                type: 'class',
                learnerId: learner.id,
                description: `SMART Goal Target: ${selectedGoals.join(', ')} (${courseName})`
            });
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🎯</span>
                            <h3 className="font-extrabold text-xl tracking-tight">SMART Goal Assessment & Roadmap</h3>
                        </div>
                        <p className="text-xs text-blue-100 font-medium mt-0.5">
                            Designing a precise, data-driven study schedule for <strong className="text-amber-300">{learner.name}</strong>
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer text-lg font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
                    {step === 1 ? (
                        <div className="space-y-6 animate-fade-in">
                            
                            {/* Baseline Info & AI Prompt Bar */}
                            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <span className="font-bold text-xs text-blue-900 dark:text-blue-300">Learner Baseline Level:</span>{' '}
                                    <span className="bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded-md uppercase ml-1 text-xs">{currentLevel}</span>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                        Course Selection: <strong className="text-indigo-700 dark:text-indigo-300">{courseName}</strong>
                                    </div>
                                </div>
                                
                            </div>

                            {/* Auto-prefilled learner snapshot — no re-typing anything */}
                            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <span>🧬</span> {learner.name} — filled automatically from the profile
                                    </span>
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">✓ No re-entry</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {[
                                        { icon: '🧠', label: 'Level', value: `${currentLevel} ➔ ${learner.smartGoal?.targetLevel || 'Next'}` },
                                        { icon: '🔥', label: 'Streak', value: `${learner.streak || 0}` },
                                        { icon: '✅', label: 'Attendance', value: `${attendancePct}%` },
                                        { icon: '📅', label: 'Sessions', value: String((learner.sessions || []).length) },
                                        { icon: '📝', label: 'Homework', value: `${pendingHomework} pending` },
                                        { icon: '🎓', label: 'Exams', value: String(examCount) },
                                        { icon: '🔁', label: 'Reviews', value: String(reviewsDue) },
                                        { icon: '🌍', label: 'Time', value: learner.timezone ? learner.timezone.split('/').pop() || learner.timezone : 'Not set' },
                                    ].map(s => (
                                        <div key={s.label} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-2">
                                            <div className="text-[8px] font-black uppercase tracking-wider text-slate-400">{s.icon} {s.label}</div>
                                            <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 truncate mt-0.5">{s.value}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl px-3 py-2.5">
                                    <div className="flex justify-between items-center text-[10px] font-black text-indigo-800 dark:text-indigo-300">
                                        <span>📖 {currentLesson ? `Current lesson: ${currentLesson.title}` : 'No lesson generated yet — the plan will start with Unit 1 of the syllabus'}</span>
                                        {currentLesson && <span>{lessonProgressPct}%</span>}
                                    </div>
                                    {currentLesson && (
                                        <div className="h-1.5 rounded-full bg-white dark:bg-slate-800 overflow-hidden mt-1.5">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${lessonProgressPct}%` }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Question 1: Goals */}
                            <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 rounded-2xl p-3.5 space-y-3.5">
                                <div className="flex items-center gap-2">
                                    <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded-lg">STEP 1</span>
                                    <label className="block text-xs font-extrabold uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">Pick the focus — competencies & chapters</label>
                                </div>
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <label className="block text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                                        1. Goals — Learner Competencies (choose 1 or more)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedGoals([]); setGoalSearch(''); setChapterSearch(''); }}
                                            title="Clear every selected goal and chapter"
                                            className="text-[9px] font-black text-rose-500 hover:text-white bg-transparent hover:bg-rose-500 border border-rose-200 dark:border-rose-800 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                                        >
                                            ✕ Clear all
                                        </button>
                                        <span className="text-[11px] font-semibold text-slate-500">
                                            {selectedGoals.length} Selected
                                        </span>
                                    </div>
                                </div>

                                <input
                                    type="text"
                                    value={goalSearch}
                                    onChange={(e) => setGoalSearch(e.target.value)}
                                    placeholder="🔍 Search competencies..."
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {filteredCompetencies.length === 0 && (
                                    <p className="text-[10px] font-semibold text-slate-400 py-1">No competencies match &quot;{goalSearch}&quot;.</p>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {filteredCompetencies.map((compName) => {
                                        const isSelected = selectedGoals.includes(compName);
                                        return (
                                            <button
                                                key={compName}
                                                type="button"
                                                onClick={() => toggleGoal(compName)}
                                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                                                    isSelected 
                                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/20' 
                                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-800/40'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 text-xs font-black transition-all ${
                                                    isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                                }`}>
                                                    {isSelected ? '✓' : ''}
                                                </div>
                                                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                                                    {compName}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Personal syllabus chapters — select alongside competencies */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                            2. Personal Syllabus — chapters (choose any)
                                        </label>
                                        {chapterOptions.length > 0 && (
                                            <span className="text-[10px] font-bold text-slate-400">{chapterOptions.length} chapters</span>
                                        )}
                                    </div>
                                    {chapterOptions.length > 0 ? (
                                        <>
                                            <input
                                                type="text"
                                                value={chapterSearch}
                                                onChange={(e) => setChapterSearch(e.target.value)}
                                                placeholder="🔍 Search chapters by title, competency or skill..."
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <div className="max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                                                {filteredChapters.length === 0 && (
                                                    <p className="text-[10px] font-semibold text-slate-400 py-2">No chapters match &quot;{chapterSearch}&quot;.</p>
                                                )}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                    {filteredChapters.map((ch) => {
                                                        const isSelected = selectedGoals.includes(ch.label);
                                                        return (
                                                            <button
                                                                key={ch.id}
                                                                type="button"
                                                                onClick={() => toggleGoal(ch.label)}
                                                                title={ch.compName ? `${ch.compName} · ${ch.title}` : ch.title}
                                                                className={`flex items-start gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${isSelected ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white/70 dark:bg-slate-800/40'}`}
                                                            >
                                                                <div className={`w-[18px] h-[18px] min-w-[18px] min-h-[18px] rounded-md border flex items-center justify-center shrink-0 mt-px text-[10px] font-black transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                                                    {isSelected ? '✓' : ''}
                                                                </div>
                                                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-snug min-w-0">
                                                                    <span className="block truncate">{ch.title}</span>
                                                                    {ch.compName && <span className="block text-[8px] font-black uppercase tracking-wide text-slate-400 mt-0.5">{ch.status === 'completed' ? '✓ done · ' : '📖 '}{ch.compName}</span>}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-[10px] font-semibold text-slate-500 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                                            No personal syllabus yet — generate a Learner Path in the Lessons tab, or add a custom goal below.
                                        </p>
                                    )}
                                </div>

                                {/* Custom Goal Input */}
                                <div className="flex items-center gap-2 pt-1">
                                    <input 
                                        type="text"
                                        placeholder="Add custom competence goal..."
                                        value={customGoalInput}
                                        onChange={(e) => setCustomGoalInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomGoal())}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCustomGoal}
                                        className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer shrink-0"
                                    >
                                        ➕ Add
                                    </button>
                                </div>
                            </div>

                            {/* STEP 2 — Ask your learner about next month, then paste their reply */}
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-3.5 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-1 rounded-lg">STEP 2</span>
                                    <label className="block text-xs font-extrabold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">Ask {learner.name.split(' ')[0]} about {nextMonthLabel}</label>
                                </div>

                                {/* Personalized message to send first */}
                                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/60 rounded-2xl p-4">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <label className="block text-xs font-extrabold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                                            📩 Ask {learner.name.split(' ')[0]} about {nextMonthLabel} — personalized message
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleCopyAsk}
                                            className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer ${copiedAsk ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-700'}`}
                                        >
                                            {copiedAsk ? '✅ Copied!' : '📋 Copy Message'}
                                        </button>
                                    </div>
                                    <textarea
                                        readOnly
                                        rows={9}
                                        value={askMessage}
                                        onFocus={(e) => e.currentTarget.select()}
                                        className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[11px] font-medium leading-relaxed outline-none resize-none select-text"
                                    />
                                </div>

                                {/* Paste their reply */}
                                <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/60 rounded-2xl p-4">
                                    <label className="block text-xs font-extrabold uppercase text-amber-700 dark:text-amber-400 tracking-wider flex items-center gap-1.5 mb-2">
                                        <span>💬</span> Ask your learner, then paste their reply
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={learnerReply}
                                        onChange={(e) => setLearnerReply(e.target.value)}
                                        placeholder="Paste their reply here, e.g. 'I am free Mon-Wed after 6pm, Thu-Fri off. I can do 2-3 classes a week, and I travel from the 12th to the 16th next month...'"
                                        className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                                                        {/* STEP 3 — Copy the AI prompt, then paste the AI roadmap back */}
                            <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-lg">STEP 3</span>
                                    <label className="block text-xs font-extrabold uppercase text-blue-700 dark:text-blue-300 tracking-wider">
                                        Copy the AI prompt, then paste the AI roadmap back
                                    </label>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCopyPrompt}
                                        className="flex-1 min-w-[170px] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span>{copiedPrompt ? '✅ Copied — paste it into your AI' : '📋 Copy AI Prompt'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsImportModalOpen(true)}
                                        className="flex-1 min-w-[170px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        📥 Paste AI JSON
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm p-4 rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                Generate SMART Roadmap & Lesson Cadence ➔
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                                <h4 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span>📊</span> Generated SMART Goal Strategy
                                </h4>
                                <button 
                                    onClick={() => setStep(1)} 
                                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                                >
                                    ✏️ Edit Assessment
                                </button>
                            </div>

                                                        {importedCoachingData ? (
                            <div className="space-y-3 mb-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3">
                                    <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                        🤖 AI roadmap applied from your pasted JSON
                                    </span>
                                    {importedCoachingData.targetLevel && (
                                        <span className="text-[10px] font-bold bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full">
                                            Level goal: {importedCoachingData.currentLevel || currentLevel} → {importedCoachingData.targetLevel}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { icon: '📅', label: 'Classes / week', value: importedCoachingData.lessonsPerWeek || lessonsPerWeek },
                                        { icon: '⏱️', label: 'Hours / week', value: importedCoachingData.hoursPerWeek || hours },
                                        { icon: '🏃', label: 'Pace', value: importedCoachingData.studyPace || studyPace },
                                        { icon: '🎯', label: 'Deadline', value: (importedCoachingData.deadline || targetDate) ? new Date(importedCoachingData.deadline || targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set' },
                                    ].map(tile => (
                                        <div key={tile.label} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-2">
                                            <div className="text-[8px] font-black uppercase tracking-wider text-slate-400">{tile.icon} {tile.label}</div>
                                            <div className="text-[12px] font-extrabold text-slate-800 dark:text-slate-100 truncate capitalize mt-0.5">{tile.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {(importedCoachingData.coachingSummary || aiAnalysisText) && (
                                    <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4">
                                        <p className="text-[11px] font-black uppercase text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5 mb-1">
                                            <span>🧠</span> Plan summary
                                        </p>
                                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{importedCoachingData.coachingSummary || aiAnalysisText}</p>
                                    </div>
                                )}

                                {(importedCoachingData.goals || selectedGoals).length > 0 && (
                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-3.5">
                                        <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">🎯 Goals & chapters</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(importedCoachingData.goals || selectedGoals).map((g: any) => (
                                                <span key={g} className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded-full px-2 py-0.5">{g}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {importedCoachingData.roadmapPhases && importedCoachingData.roadmapPhases.length > 0 && (
                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-3.5">
                                        <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">🗺️ Roadmap phases</p>
                                        <div className="space-y-2">
                                            {importedCoachingData.roadmapPhases.map((p: any, idx: number) => (
                                                <div key={idx} className="border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/60 dark:bg-slate-900/40">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Phase {p.phase || idx + 1}: {p.title}</span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : p.status === 'in_progress' || p.status === 'current' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                            {p.status === 'in_progress' || p.status === 'current' ? '● NOW' : p.status === 'completed' ? '✓ DONE' : '⏳ NEXT'}
                                                        </span>
                                                    </div>
                                                    {p.targetDate && <p className="text-[10px] text-slate-500 mt-0.5">📅 {p.targetDate}{p.targetCefr ? ` · target ${p.targetCefr}` : ''}</p>}
                                                    {(p.focusSkills || []).length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            {(p.focusSkills || []).map((skill: any, i: number) => <span key={i} className="text-[9px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md px-1.5 py-0.5">{skill}</span>)}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {importedCoachingData.monthlyPlans && importedCoachingData.monthlyPlans.length > 0 && (
                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-3.5">
                                        <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">📆 Month-by-month coaching plan</p>
                                        <div className="space-y-2">
                                            {importedCoachingData.monthlyPlans.map((mp: any, idx: number) => (
                                                <div key={idx} className="border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/60 dark:bg-slate-900/40">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{mp.label || mp.month}</span>
                                                        {(mp.sessionsPlanned || mp.startDate) && <span className="text-[9px] font-bold text-slate-400">{mp.sessionsPlanned ? `${mp.sessionsPlanned} classes ` : ''}{mp.startDate ? `· ${mp.startDate}${mp.endDate ? ` → ${mp.endDate}` : ''}` : ''}</span>}
                                                    </div>
                                                    {mp.focus && <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 mt-1">Focus: {mp.focus}</p>}
                                                    {(mp.goals || []).length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {(mp.goals || []).map((g: any, i: number) => <span key={i} className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full px-1.5 py-0.5">{g}</span>)}
                                                        </div>
                                                    )}
                                                    {(mp.milestones || []).length > 0 && (
                                                        <ul className="mt-1.5 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                                                            {(mp.milestones || []).slice(0, 5).map((ms: any, i: number) => (
                                                                <li key={i} className="flex items-start gap-1.5"><span className="text-blue-500 font-bold">•</span><span>{ms}</span></li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    {(mp.holidaysConsidered || []).length > 0 && <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-1">🗓 Skips: {(mp.holidaysConsidered || []).join(', ')}</p>}
                                                    {(mp.timeManagementMessages || []).length > 0 && <p className="text-[9px] font-bold text-purple-600 dark:text-purple-400 mt-0.5">💬 {(mp.timeManagementMessages || [])[0]}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {importedCoachingData.whatToStudyNext && importedCoachingData.whatToStudyNext.length > 0 && (
                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-3.5">
                                        <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">📚 What to study next</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {importedCoachingData.whatToStudyNext.slice(0, 8).map((w: any, i: number) => (
                                                <span key={i} className="text-[10px] font-bold bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 rounded-lg px-2 py-1" title={w.description}>
                                                    {w.icon || '📖'} {w.topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {((importedCoachingData.keyStrengthsIdentified && importedCoachingData.keyStrengthsIdentified.length > 0) || (importedCoachingData.priorityFixes && importedCoachingData.priorityFixes.length > 0)) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {importedCoachingData.keyStrengthsIdentified && importedCoachingData.keyStrengthsIdentified.length > 0 && (
                                            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3">
                                                <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 mb-1">💪 Strengths</p>
                                                <ul className="space-y-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">
                                                    {importedCoachingData.keyStrengthsIdentified.slice(0, 5).map((item: any, i: number) => (
                                                        <li key={i} className="flex gap-1.5"><span>•</span><span>{item}</span></li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {importedCoachingData.priorityFixes && importedCoachingData.priorityFixes.length > 0 && (
                                            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-3">
                                                <p className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300 mb-1">🔧 Fixes to prioritise</p>
                                                <ul className="space-y-1 text-[10px] font-semibold text-rose-800 dark:text-rose-200">
                                                    {importedCoachingData.priorityFixes.slice(0, 5).map((item: any, i: number) => (
                                                        <li key={i} className="flex gap-1.5"><span>•</span><span>{item}</span></li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {milestonesList.length > 0 && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl space-y-1.5">
                                        <p className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">📅 Recommended milestones</p>
                                        <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                                            {milestonesList.map((m, idx) => (
                                                <li key={idx} className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span><span>{m}</span></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            ) : (
                            <div className="space-y-3 mb-3">
                                <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
                                        Showing smart defaults — press <strong>📋 Copy AI Prompt</strong>, paste it into your AI, then import the JSON with <strong>📥 Paste AI JSON</strong> to replace this with the exact roadmap it writes.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-4 rounded-2xl flex items-start gap-3">
                                        <div className="bg-blue-600 text-white font-black w-8 h-8 rounded-xl flex items-center justify-center shrink-0">S</div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-blue-800 dark:text-blue-300">Specific Target Goals</p>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Targeting: <strong className="text-indigo-700 dark:text-indigo-300">{(selectedGoals.length ? selectedGoals : learner.smartGoal?.goals || []).join(', ') || 'TBD from the AI plan'}</strong></p>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-4 rounded-2xl flex items-start gap-3">
                                        <div className="bg-emerald-600 text-white font-black w-8 h-8 rounded-xl flex items-center justify-center shrink-0">M</div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300">Measurable Cadence</p>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200"><span className="text-emerald-700 dark:text-emerald-300 font-extrabold">{lessonsPerWeek} lessons / week</span> ({hours} hrs/wk). Next class: <span className="font-bold text-emerald-600">{nextRecommendedClassDate}</span>.</p>
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-4 rounded-2xl flex items-start gap-3">
                                        <div className="bg-amber-600 text-white font-black w-8 h-8 rounded-xl flex items-center justify-center shrink-0">A</div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-amber-800 dark:text-amber-300">Achievable Pace</p>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Set for <span className="font-bold capitalize">{studyPace}</span> pace, study window <span className="font-bold capitalize">{lifestyleWindow}</span>.</p>
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 p-4 rounded-2xl flex items-start gap-3">
                                        <div className="bg-purple-600 text-white font-black w-8 h-8 rounded-xl flex items-center justify-center shrink-0">R</div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-purple-800 dark:text-purple-300">Relevant & Syllabus Aligned</p>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Mapped to <strong className="text-purple-700 dark:text-purple-300">{courseName}</strong>.</p>
                                        </div>
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-4 rounded-2xl flex items-start gap-3">
                                        <div className="bg-rose-600 text-white font-black w-8 h-8 rounded-xl flex items-center justify-center shrink-0">T</div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-rose-800 dark:text-rose-300">Time-Bound Completion</p>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Target completion by <span className="font-extrabold text-rose-600">{new Date(targetDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</span>.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm py-3 px-4 rounded-2xl transition-all cursor-pointer"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm py-3 px-4 rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                                >
                                    Save SMART Plan & Sync Calendar 🎯
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* AI JSON Import Sub-Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                            <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span>📥</span> Import External AI Generated JSON Plan
                            </h4>
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            Paste the JSON generated by ChatGPT, Gemini, or Claude after analyzing the copied AI prompt.
                        </p>

                        <textarea
                            rows={8}
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='Paste JSON here... e.g. {"goal": "Negotiations", "goals": ["Negotiations", "Idioms"], "hoursPerWeek": 4, "studyPace": "balanced", "aiAnalysis": "..."}'
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 font-mono text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        {jsonError && (
                            <div className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800">
                                {jsonError}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleImportJson}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md"
                            >
                                Apply AI Plan 🎯
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
