import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../Modal';
import { toPng } from 'html-to-image';
import { format, addDays } from 'date-fns';
import { Learner, GroupClass, CalendarEvent, Session } from '../../../types2';
import { useAutomationStore } from '../../../store/useAutomationStore';
import { useLearnerStore } from '../../../store/useLearnerStore';
import { useCalendarStore } from '../../../store/useCalendarStore';
import AvailabilityView, { SlotPlanEntry } from './AvailabilityView';
import EventForm from '../EventForm';
import AddSessionForm from './AddSessionForm';

interface DateActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date | null;
    learnerOrGroup: Learner | GroupClass;
    allLearners: Learner[];
    allEvents: CalendarEvent[];
    onSaveEvent: (event: CalendarEvent) => void;
    onSaveSession: (sessionData: Session | Omit<Session, 'id' | 'aiAnalysis'>) => Promise<void>;
    onSaveLearner?: (learner: Learner) => void;
}

const genId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const dayKey = (d: string | Date) => {
    try {
        const date = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d;
        if (isNaN(date.getTime())) return null;
        return format(date, 'yyyy-MM-dd');
    } catch { return null; }
};

const DateActionModal: React.FC<DateActionModalProps> = ({ isOpen, onClose, selectedDate, learnerOrGroup, allLearners, allEvents, onSaveEvent, onSaveSession, onSaveLearner }) => {
    const [activeTab, setActiveTab] = useState<'availability' | 'addEvent' | 'logSession' | 'actions'>('availability');
    // Group classes carry a `schedule` field; learners (even with no timezone set yet) never do.
    const isIndividualLearner = !('schedule' in learnerOrGroup) && !Array.isArray((learnerOrGroup as any).participants);
    const cardRef = useRef<HTMLDivElement>(null);
    const [capturing, setCapturing] = useState(false);
    const [actionMsg, setActionMsg] = useState('');
    const [availabilityPlan, setAvailabilityPlan] = useState<SlotPlanEntry[]>([]);
    const [learnerReply, setLearnerReply] = useState('');
    const [bookMsg, setBookMsg] = useState('');
    const handlePlanChange = useCallback((plan: SlotPlanEntry[]) => {
        setAvailabilityPlan(plan);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(isIndividualLearner ? 'availability' : 'addEvent');
            setActionMsg('');
            setBookMsg('');
        }
    }, [isOpen, isIndividualLearner]);

    // ---- Auto-book from the learner's availability reply ----
    const bookFromReply = () => {
        if (!learner) return;
        const reply = learnerReply.trim();
        if (!reply) {
            setBookMsg('Paste the learner\'s reply first (e.g. “3 works” or “1 and 5”).');
            return;
        }
        const nums = Array.from(new Set((reply.match(/\d+/g) || []).map(n => parseInt(n, 10))));
        if (nums.length === 0) {
            setBookMsg('No slot numbers found in the reply — the message numbers slots like “1) 4:00 PM”.');
            return;
        }
        const booked: string[] = [];
        const missed: number[] = [];
        nums.forEach(n => {
            const entry = availabilityPlan.find(p => p.number === n);
            if (!entry) {
                missed.push(n);
                return;
            }
            useCalendarStore.getState().addCalendarEvent({
                title: `📚 Class — ${learner.name}`,
                date: entry.dateKey,
                time: entry.tutorTime24,
                type: 'class',
                learnerId: learner.id,
                color: '#3b82f6',
                description: `Booked from learner reply “${reply.slice(0, 80)}”.`,
            });
            booked.push(`#${n} → ${entry.dayLabel} ${entry.learnerTime}`);
        });
        const parts: string[] = [];
        if (booked.length) parts.push(`✅ Booked ${booked.length} slot${booked.length > 1 ? 's' : ''}: ${booked.join(' · ')}`);
        if (missed.length) parts.push(`⚠️ No match for ${missed.map(n => `#${n}`).join(', ')} (available numbers: 1–${availabilityPlan.length || 0})`);
        setBookMsg(parts.join('  '));
    };

    if (!isOpen || !selectedDate) return null;

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const learner = isIndividualLearner ? (learnerOrGroup as Learner) : undefined;

    // ---- Data on this day (same stores as the calendar tab — always in sync) ----
    const daySessions = (learner?.sessions || []).filter(s => dayKey(s.date) === formattedDate);
    const dayEvents = allEvents.filter(e => dayKey(e.date || e.start || '') === formattedDate && !e.id.startsWith('holiday-') && !e.id.startsWith('bday-'));
    const dayHomework = learner ? useAutomationStore.getState().homeworkAssignments.filter(h => h.learnerId === learner.id && dayKey(h.dueDate) === formattedDate) : [];
    const dayExams = learner ? ((learner as any).examAnalysis || []).filter((e: any) => dayKey(e.date || e.completedAt || e.examDate) === formattedDate) : [];
    const dayReviews = learner ? useAutomationStore.getState().spacedRepetitionItems.filter(r => r.learnerId === learner.id && dayKey(r.nextReviewDate) === formattedDate) : [];
    const hasData = daySessions.length > 0 || dayEvents.length > 0 || dayHomework.length > 0 || dayExams.length > 0 || dayReviews.length > 0;

    const markAttendance = (attended: boolean) => {
        if (!learner) return;
        const store = useLearnerStore.getState();
        const existing = daySessions[0];
        if (existing) {
            store.updateSession(learner.id, {
                ...existing,
                attended,
                status: attended ? 'completed' : 'missed',
                lessonName: attended && !existing.lessonName ? 'Live Session' : attended ? existing.lessonName : 'Absence',
            });
        } else {
            const current = store.getLearnerById(learner.id) as Learner | undefined;
            if (!current) return;
            const newSession: Session = {
                id: genId(),
                learnerId: learner.id,
                date: formattedDate,
                duration: 60,
                status: attended ? 'completed' : 'missed',
                attended,
                topics: [],
                notes: `Marked ${attended ? 'attended' : 'missed'} on calendar.`,
                lessonName: attended ? 'Live Session' : 'Absence',
                lessonSummary: '',
            };
            store.updateLearner({ ...current, sessions: [...(current.sessions || []), newSession] });
        }
        setActionMsg(attended ? '✅ Session log auto-created/updated — marked attended.' : '❌ Session log auto-created/updated — marked missed.');
    };

    const proposeMakeup = () => {
        if (!learner) return;
        const time = dayEvents[0]?.time || '18:00';
        let cand = addDays(selectedDate, 7);
        let guard = 0;
        let slot: Date = cand;
        while (guard < 14) {
            const ck = format(cand, 'yyyy-MM-dd');
            const busy = allEvents.some(ev => dayKey(ev.date || ev.start || '') === ck && !ev.id.startsWith('holiday-'))
                || (learner.sessions || []).some(s => dayKey(s.date) === ck);
            if (!busy) { slot = cand; break; }
            cand = addDays(cand, 1);
            guard++;
        }
        useCalendarStore.getState().addCalendarEvent({
            title: `🎯 Make-up: ${learner.name}`,
            date: format(slot, 'yyyy-MM-dd'),
            time,
            type: 'class',
            learnerId: learner.id,
            color: '#10b981',
            description: `Make-up for the missed class on ${format(selectedDate, 'MMM d')}.`,
        });
        setActionMsg(`🎯 Make-up proposed for ${format(slot, 'EEEE, MMM d')} at ${time} — booked on the calendar.`);
    };

    const copyDaySummary = async () => {
        const lines = [
            `Day summary — ${learner ? learner.name : 'Learner'} — ${format(selectedDate, 'EEEE, MMM d, yyyy')}`,
            '',
            ...daySessions.map(s => `• Session: ${s.lessonName || 'Live Session'} (${s.attended ? 'attended' : s.status})${s.topics?.length ? ` — topics: ${s.topics.join(', ')}` : ''}${(s as any).aiAnalysis?.summary ? ` — summary: ${(s as any).aiAnalysis.summary}` : ''}`),
            ...dayEvents.map(e => `• Booked: ${e.title} at ${e.time || 'all day'}${e.description ? ` — ${e.description}` : ''}`),
            ...dayHomework.map(h => `• Homework: ${h.title} (${h.status})${h.feedback ? ` — feedback: ${h.feedback}` : ''}`),
            ...dayExams.map((e: any) => `• Exam: ${e.examTitle || 'Mock test'}${typeof e.score === 'number' ? ` — score ${e.score}%` : ''}${e.band ? ` (${e.band})` : ''}`),
            ...dayReviews.map(r => `• Review due: ${r.content}`),
        ];
        if (lines.length === 3) lines.push('• No activity on this day.');
        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            setActionMsg('📋 Day summary copied to clipboard.');
        } catch {
            setActionMsg('Could not copy — clipboard blocked.');
        }
    };

    const saveDayCard = async () => {
        if (!cardRef.current || capturing) return;
        setCapturing(true);
        try {
            const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `day-card-${learner?.name || 'learner'}-${formattedDate}.png`;
            link.click();
            setActionMsg('💾 Day card saved as PNG — send it to your learner.');
        } catch (err) {
            console.error('Failed to save day card', err);
            setActionMsg('Could not save the image.');
        } finally {
            setCapturing(false);
        }
    };

    const initialEvent: Partial<CalendarEvent> = {
        date: formattedDate,
        endDate: formattedDate,
        color: isIndividualLearner ? '#3b82f6' : '#8b5cf6',
        title: '',
        learnerId: isIndividualLearner ? learnerOrGroup.id : undefined,
        groupId: !isIndividualLearner ? learnerOrGroup.id : undefined,
    };

    const tabs: { key: typeof activeTab; label: string; show: boolean }[] = [
        { key: 'availability', label: '🕒 My Availability', show: isIndividualLearner },
        { key: 'addEvent', label: '📅 Add New Event', show: true },
        { key: 'logSession', label: '📝 Log Session', show: true },
        { key: 'actions', label: '⚡ Actions', show: true },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Actions for ${format(selectedDate, 'MMMM do, yyyy')}`}>
            <div className="flex border-b mb-4 overflow-x-auto">
                {tabs.filter(t => t.show).map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`py-2 px-4 font-semibold border-b-2 whitespace-nowrap ${activeTab === t.key ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
                {/* Panels stay mounted so availability slot numbers survive tab switches */}
                <div style={{ display: activeTab === 'availability' ? '' : 'none' }}>
                    {isIndividualLearner && (
                        <>
                            <AvailabilityView
                                learner={learnerOrGroup as Learner}
                                events={allEvents}
                                selectedDate={formattedDate}
                                onTimezoneChange={(tz) => onSaveLearner?.({ ...(learnerOrGroup as Learner), timezone: tz })}
                                onPlanChange={handlePlanChange}
                            />
                            {/* Auto-book from the learner's reply — pasted straight into the day popup */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 mt-4">
                                <div className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">🤖 Auto-book from learner's reply</div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                                    They replied to your availability message with a slot number? Paste their reply here and it books straight onto the calendar — in <strong>their</strong> local time.
                                </p>
                                <textarea
                                    value={learnerReply}
                                    onChange={(e) => setLearnerReply(e.target.value)}
                                    rows={2}
                                    placeholder='e.g. “3 works for me” or “1 and 5”'
                                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                                <div className="flex items-center gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={bookFromReply}
                                        disabled={availabilityPlan.length === 0}
                                        className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-40"
                                    >
                                        ⚡ Book Slot(s)
                                    </button>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {availabilityPlan.length > 0 ? `Available numbers: 1–${availabilityPlan.length}` : 'No slots generated yet'}
                                    </span>
                                </div>
                                {bookMsg && (
                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 mt-2">{bookMsg}</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div style={{ display: activeTab === 'addEvent' ? '' : 'none' }}>
                    <EventForm
                        event={initialEvent}
                        onSave={onSaveEvent}
                        onClose={onClose}
                        learners={allLearners}
                        groupId={!isIndividualLearner ? learnerOrGroup.id : undefined}
                    />
                </div>
                <div style={{ display: activeTab === 'logSession' ? '' : 'none' }}>
                    <AddSessionForm
                        learner={learnerOrGroup}
                        onSaveSession={onSaveSession}
                        isOpen={true}
                        onClose={onClose}
                        embedded={true}
                        initialDate={formattedDate}
                    />
                </div>
                <div style={{ display: activeTab === 'actions' ? '' : 'none' }}>
                    <div className="space-y-4">
                        {/* Day snapshot card (screenshot-ready) */}
                        <div ref={cardRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="relative">
                                <img
                                    loading="lazy"
                                    src={dayExams.length > 0
                                        ? 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=60'
                                        : daySessions.length > 0 || dayEvents.length > 0
                                          ? 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900&q=60'
                                          : 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=60'}
                                    alt=""
                                    className="w-full h-20 object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            </div>
                            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 px-4 py-3 text-white -mt-0">
                                <div className="text-[9px] font-black uppercase tracking-wider text-blue-100">Day Card</div>
                                <div className="font-black text-sm">{learner?.name || 'Learner'} — {format(selectedDate, 'EEEE, MMM d, yyyy')}</div>
                            </div>
                            <div className="p-4 space-y-2 text-slate-800">
                                {!hasData && <p className="text-xs text-slate-500">No sessions, bookings, homework, exams or reviews on this day.</p>}
                                {daySessions.map(s => (
                                    <div key={s.id} className="text-xs font-semibold flex justify-between gap-2">
                                        <span>📌 Session — {s.lessonName || 'Live Session'}</span>
                                        <span className={`font-black ${s.attended ? 'text-emerald-600' : 'text-rose-600'}`}>{s.attended ? '✓ Attended' : s.status}</span>
                                    </div>
                                ))}
                                {dayEvents.map(e => {
                                    const localT = learner?.timezone && e.time
                                        ? (() => {
                                            try {
                                                return new Date(`${e.date}T${e.time}:00Z`).toLocaleTimeString('en-US', { timeZone: learner.timezone, hour: 'numeric', minute: '2-digit', hour12: true });
                                            } catch { return ''; }
                                        })()
                                        : '';
                                    return (
                                        <div key={e.id} className="text-xs font-semibold flex justify-between gap-2 text-blue-700">
                                            <span className="truncate">{e.title}</span>
                                            <span className="shrink-0 text-right">
                                                {e.time || 'All day'}
                                                {localT ? <span className="text-blue-400"> · {localT} their time</span> : null}
                                            </span>
                                        </div>
                                    );
                                })}
                                {dayHomework.map(h => (
                                    <div key={h.id} className="text-xs font-semibold flex justify-between gap-2 text-amber-700">
                                        <span>📝 {h.title}</span>
                                        <span className="capitalize">{h.status}</span>
                                    </div>
                                ))}
                                {dayExams.map((e: any, i: number) => (
                                    <div key={i} className="text-xs font-semibold flex justify-between gap-2 text-violet-700">
                                        <span>🎓 {e.examTitle || 'Mock test'}</span>
                                        <span>{typeof e.score === 'number' ? `${e.score}%` : e.band || ''}</span>
                                    </div>
                                ))}
                                {dayReviews.map(r => (
                                    <div key={r.id} className="text-xs font-semibold text-sky-700">🔁 Review due — {r.content}</div>
                                ))}
                            </div>
                        </div>

                        {/* Quick actions */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <button type="button" onClick={() => markAttendance(true)} className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all cursor-pointer shadow-md">
                                ✅ Mark Attended
                            </button>
                            <button type="button" onClick={() => markAttendance(false)} className="p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all cursor-pointer shadow-md">
                                ❌ Mark Missed
                            </button>
                            <button type="button" onClick={proposeMakeup} className="p-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition-all cursor-pointer shadow-md">
                                🎯 Propose Make-up
                            </button>
                            <button type="button" onClick={copyDaySummary} className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all cursor-pointer shadow-md">
                                📋 Copy Day Summary
                            </button>
                        </div>
                        <button type="button" onClick={saveDayCard} disabled={capturing} className="w-full p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs transition-all cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50">
                            {capturing ? '⏳ Saving...' : '💾 Save Day Card PNG'}
                        </button>

                        {actionMsg && <p className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">{actionMsg}</p>}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default DateActionModal;