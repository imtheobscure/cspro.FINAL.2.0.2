import React, { useState, useMemo, useRef } from 'react';
import { toPng, toBlob } from 'html-to-image';
import {
  format,
  addDays,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isBefore,
  isAfter,
  isFuture,
  endOfMonth,
  endOfWeek,
  parse,
  startOfMonth,
  startOfWeek,
  startOfDay as fnsStartOfDay,
  differenceInDays,
  differenceInHours,
  differenceInMinutes
} from 'date-fns';
import { Learner, Session, CalendarEvent, GroupClass, HomeworkAssignment, SpacedRepetitionItem } from '../../types2';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useTodoStore } from '../../store/useTodoStore';
import { useAutomationStore } from '../../store/useAutomationStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useLearnerStore } from '../../store/useLearnerStore';
import { getAvatarUrl } from '../../services/avatarService';
import ProgressBar from './ProgressBar';
import { sendEmailWithAIGreeting } from '../../utils/emailSender';

const genId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/** Small helper: the yyyy-MM-dd key for any date-like value. */
const dayKey = (d: string | Date) => {
  try {
    const date = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d;
    if (isNaN(date.getTime())) return null;
    return format(fnsStartOfDay(date), 'yyyy-MM-dd');
  } catch {
    return null;
  }
};

interface AttendanceTrackerProps {
  learner: Learner | GroupClass;
  title?: string;
  showNewTermButton?: boolean;
  contextDate?: string;
  highlightSessionId?: string;
  events?: CalendarEvent[];
  allCalendarEvents?: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onNavigateTab?: (tabName: string) => void;
  onOpenSmartGoal?: () => void;
  viewMode?: 'fullTerm' | 'singleMonth';
  isForScreenshot?: boolean;
}

interface TooltipData {
  content: React.ReactNode;
  x: number;
  y: number;
  color?: string;
}

// Event times are stored as UTC "HH:mm"; show the learner's own local clock next to them.
// Returns '' when the learner has no timezone or the conversion fails.
const formatLearnerLocalTime = (tz: string | undefined, dateKey: string, utcTime: string) => {
  if (!tz || !dateKey || !utcTime) return '';
  try {
    return new Date(`${dateKey}T${utcTime}:00Z`).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return ''; }
};

const PLAN_DETAILS: Record<string, { name: string; sessionsPerWeek: number; description: string; emoji: string; colorClass: string }> = {
  Light: { name: 'Basic Plan', sessionsPerWeek: 1, description: 'For flexible or part-time learners', emoji: '🟦', colorClass: 'text-brand-blue' },
  Balanced: { name: 'Standard Plan', sessionsPerWeek: 2, description: 'Balanced pace for regular improvement', emoji: '🟨', colorClass: 'text-amber-500' },
  Intensive: { name: 'Intensive Plan', sessionsPerWeek: 3, description: 'For motivated learners wanting faster progress', emoji: '🟥', colorClass: 'text-rose-500' },
  Custom: { name: 'Elite Plan', sessionsPerWeek: 4, description: 'For fast-paced, immersive learning', emoji: '🟧', colorClass: 'text-orange-500' }
};

const WeekStatus: React.FC<{ status: 'success' | 'partial' | 'fail' | 'pending' | 'none'; count: number; required: number }> = ({ status, count, required }) => {
  const tooltipText = status === 'none' ? '' : `${count}/${required} sessions`;
  switch (status) {
    case 'success': return <div title={tooltipText} className="flex items-center justify-center h-9 text-xl">🏆</div>;
    case 'partial': return <div title={tooltipText} className="flex items-center justify-center h-9 text-xl">🟡</div>;
    case 'fail': return <div title={tooltipText} className="flex items-center justify-center h-9 text-xl">❌</div>;
    case 'pending': return <div title={tooltipText} className="flex items-center justify-center h-9 text-base text-slate-300">•••</div>;
    default: return <div className="h-9"></div>;
  }
};

/** SVG progress ring — a clean premium donut for term completion. */
const ProgressRing: React.FC<{ percent: number; size?: number; stroke?: number; color?: string; label?: string; sub?: string }> = ({
  percent, size = 74, stroke = 8, color = '#6366f1', label, sub
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-200 dark:text-slate-700" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`}
          style={{ transition: 'stroke-dasharray .6s cubic-bezier(.16,1,.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-black text-slate-900 dark:text-slate-100" style={{ fontSize: size / 4.2 }}>
          {Math.round(p)}%
        </span>
        {(label || sub) && (
          <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
            {label || sub}
          </span>
        )}
      </div>
    </div>
  );
};

/** Term timeline strip — all terms at a glance with live progress and a "you are here" marker. */
const TermTimeline: React.FC<{ terms: Session[][]; sessionsPerTerm: number; sessionsPerWeek: number; activeTermIndex: number }> = ({ terms, sessionsPerTerm, sessionsPerWeek, activeTermIndex }) => {
  if (!terms.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
      <div className="flex gap-1.5 items-end">
        {terms.map((termSessions, i) => {
          const attended = termSessions.filter(s => s.attended).length;
          const pct = sessionsPerTerm > 0 ? Math.min(100, Math.round((attended / sessionsPerTerm) * 100)) : 0;
          const isActive = i === activeTermIndex;
          const color = pct >= 100 ? 'bg-emerald-500' : isActive ? 'bg-indigo-500' : pct > 0 ? 'bg-sky-400' : 'bg-slate-200 dark:bg-slate-700';
          return (
            <div key={i} className={`flex-1 rounded-xl border p-2 transition-all ${isActive ? 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/10 bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40'}`} title={`Term ${i + 1}: ${attended}/${sessionsPerTerm} sessions attended`}>
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wide text-slate-400 mb-1">
                <span>Term {i + 1}</span>
                <span>{isActive ? '● now' : ''}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.max(4, pct)}%` }} />
              </div>
              <div className="flex justify-between items-center mt-1 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                <span>{attended}/{sessionsPerTerm} sessions</span>
                <span>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** One-click Term Report Card — printable / emailable summary for a single term. */
const TermReportCard: React.FC<{
  learner: Learner | GroupClass;
  termIndex: number;
  termSessions: Session[];
  sessionsPerTerm: number;
  sessionsPerWeek: number;
  planInfo: any;
  termStartDate: Date;
  termEndDate: Date | null;
  commitment: number;
  successfulWeeks: number;
  totalWeeksSoFar: number;
  onClose: () => void;
}> = ({ learner, termIndex, termSessions, sessionsPerTerm, sessionsPerWeek, planInfo, termStartDate, termEndDate, commitment, successfulWeeks, totalWeeksSoFar, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgState, setImgState] = useState<'idle' | 'working' | 'done'>('idle');

  const attended = termSessions.filter(s => s.attended || s.status === 'completed').length;
  const missedSessions = termSessions.filter(s => s.status === 'missed' || (!s.attended && s.status !== 'scheduled' && s.status !== 'cancelled'));
  const booked = termSessions.filter(s => s.status === 'scheduled' || s.status === 'cancelled').length;
  const logged = termSessions.length;
  const attendanceRate = logged > 0 ? Math.round((attended / logged) * 100) : 0;
  const goalPct = sessionsPerTerm > 0 ? Math.round((attended / sessionsPerTerm) * 100) : 0;

  const isLearnerObj = 'sessions' in learner && 'smartGoal' in learner;
  const smartGoal = isLearnerObj ? (learner as Learner).smartGoal : undefined;
  const cefr = (learner as any).cefrLevel || (learner as any).level || 'B1';
  const targetLevel = smartGoal?.targetLevel || 'B2';
  const phases = smartGoal?.roadmapPhases || [];
  const phasesDone = phases.filter(p => p.status === 'completed').length;
  const deadline = smartGoal?.deadline ? new Date(smartGoal.deadline) : null;
  const daysLeft = deadline && !isNaN(deadline.getTime()) ? differenceInDays(deadline, new Date()) : null;

  const learnerName = (learner as any).name || 'Learner';
  const smartLine = smartGoal
    ? `SMART goal: ${smartGoal.goal || 'Fluency'} — ${cefr} ➜ ${targetLevel} • ${phasesDone}/${phases.length} phases done${daysLeft !== null ? ` • ${daysLeft} days left` : ''}`
    : `SMART goal: not set yet`;

  const buildHtml = () => `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Term ${termIndex + 1} Report — ${learnerName}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 32px; }
      h1 { font-size: 20px; margin: 0 0 2px; }
      .sub { color: #64748b; font-size: 12px; margin-bottom: 18px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
      td, th { border: 1px solid #e2e8f0; padding: 7px 9px; font-size: 12px; text-align: left; }
      th { background: #f1f5f9; }
      .big { font-size: 22px; font-weight: 700; }
      .miss { color: #be123c; }
      .ok { color: #047857; }
      .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
      .card h2 { font-size: 13px; text-transform: uppercase; color: #64748b; margin: 0 0 8px; letter-spacing: .5px; }
    </style></head><body>
    <h1>Term ${termIndex + 1} Report Card — ${learnerName}</h1>
    <p class="sub">${format(termStartDate, 'PPP')}${termEndDate ? ' – ' + format(termEndDate, 'PPP') : ''} • ${planInfo.emoji} ${planInfo.name} • ${sessionsPerWeek}× per week</p>
    <div class="card"><h2>Attendance</h2><table>
      <tr><th>Attended</th><th>Missed</th><th>Logged</th><th>Attendance rate</th><th>Goal progress</th></tr>
      <tr><td class="big ok">${attended}</td><td class="big miss">${missedSessions.length}</td><td class="big">${logged}</td><td class="big">${attendanceRate}%</td><td class="big">${goalPct}%</td></tr>
    </table></div>
    <div class="card"><h2>Commitment (weekly goal met)</h2><p class="big">${commitment}%</p><p>Weeks where the ${sessionsPerWeek}×/week goal was met: ${successfulWeeks} out of ${totalWeeksSoFar} weeks passed.</p></div>
    <div class="card"><h2>SMART Goal Progress</h2><p>${smartLine}</p></div>
    <div class="card"><h2>Missed classes — need a make-up</h2>
      ${missedSessions.length === 0 ? '<p class="ok">No missed classes. 🎉</p>' : `<table><tr><th>Date</th><th>Class</th></tr>${missedSessions.map(s => `<tr><td>${format(new Date(s.date), 'PPP')}</td><td>${s.lessonName || 'Live Session'}</td></tr>`).join('')}</table><p>Make-up needed: ${missedSessions.length} class${missedSessions.length > 1 ? 'es' : ''}.</p>`}
    </div>
  </body></html>`;

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow pop-ups to print the report.');
      return;
    }
    win.document.write(buildHtml());
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  const handleCopyImage = async () => {
    if (!cardRef.current || imgState === 'working') return;
    setImgState('working');
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setImgState('done');
        setTimeout(() => setImgState('idle'), 3000);
      }
    } catch (err) {
      console.error('Could not copy report card image:', err);
      alert('Could not copy the report image. Your browser may not support it — try Print instead.');
      setImgState('idle');
    }
  };

  const handleEmail = () => {
    if (!('timezone' in learner)) return;
    const missedList = missedSessions.map(s => `${format(new Date(s.date), 'MMM d')} (${s.lessonName || 'Live Session'})`).join(', ');
    const bodyContent = `Hi ${learnerName}!\n\nHere is your Term ${termIndex + 1} Report Card:\n\n• Attendance: ${attended} attended, ${missedSessions.length} missed (${attendanceRate}% rate)\n• Goal progress: ${goalPct}% of the term plan\n• Commitment: ${commitment}% of weeks met the ${sessionsPerWeek}×/week goal\n• SMART goal: ${smartLine}\n${missedSessions.length > 0 ? `\n• Make-up needed: ${missedList}\n` : ''}\nGreat work — let's keep the momentum!`;
    sendEmailWithAIGreeting({
      learner: learner as Learner,
      topic: `Term ${termIndex + 1} Report`,
      subject: `Your Term ${termIndex + 1} Report Card — ${learnerName}`,
      bodyContent,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in no-screenshot">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📋</span> Term {termIndex + 1} Report Card
          </h4>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={handlePrint} className="text-[10px] font-black bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white dark:text-slate-900 text-white px-3 py-1.5 rounded-xl cursor-pointer">🖨️ Print</button>
            <button type="button" onClick={handleCopyImage} disabled={imgState === 'working'} className="text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-50">{imgState === 'working' ? '⏳' : imgState === 'done' ? '✅ Copied' : '📸 Copy Image'}</button>
            {('timezone' in learner) && (
              <button type="button" onClick={handleEmail} className="text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl cursor-pointer">✉️ Email</button>
            )}
            <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold cursor-pointer">✕</button>
          </div>
        </div>

        <div ref={cardRef} className="p-5 space-y-3 text-slate-900 dark:text-slate-100">
          <div className="text-center pb-1">
            <h5 className="font-black text-lg">Term {termIndex + 1} Report Card</h5>
            <p className="text-[11px] text-slate-500">{learnerName} • {format(termStartDate, 'MMM d, yyyy')}{termEndDate ? ` – ${format(termEndDate, 'MMM d, yyyy')}` : ''} • {planInfo.emoji} {planInfo.name}</p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-2">
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{attended}</div>
              <div className="text-[9px] font-bold uppercase text-emerald-700/80">Attended</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-2">
              <div className="text-xl font-black text-rose-600 dark:text-rose-400">{missedSessions.length}</div>
              <div className="text-[9px] font-bold uppercase text-rose-700/80">Missed</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl p-2">
              <div className="text-xl font-black text-blue-600 dark:text-blue-400">{attendanceRate}%</div>
              <div className="text-[9px] font-bold uppercase text-blue-700/80">Attendance</div>
            </div>
            <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60 rounded-xl p-2">
              <div className="text-xl font-black text-violet-600 dark:text-violet-400">{goalPct}%</div>
              <div className="text-[9px] font-bold uppercase text-violet-700/80">Goal Progress</div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">💪 Commitment — weekly goal met</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{commitment}%</span>
              <span className="text-[11px] text-slate-500">{successfulWeeks} of {totalWeeksSoFar} weeks met the {sessionsPerWeek}×/week goal</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">🎯 SMART Goal Progress</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">{smartLine}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">🚨 Missed classes — need a make-up</p>
            {missedSessions.length === 0 ? (
              <p className="text-[11px] text-emerald-600 font-bold">No missed classes. 🎉</p>
            ) : (
              <div className="space-y-1">
                {missedSessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                    <span className="font-bold text-rose-600 dark:text-rose-400">{format(new Date(s.date), 'MMM d, yyyy')}</span>
                    <span className="text-slate-500">{s.lessonName || 'Live Session'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TermSection: React.FC<{
  termIndex: number;
  termSessions: Session[];
  refreshKey: number;
  learner: Learner | GroupClass;
  sessionsPerTerm: number;
  sessionsPerWeek: number;
  planInfo: any;
  eventDateMap: Map<string, CalendarEvent[]>;
  dayExtraMap: Map<string, {
    homework?: HomeworkAssignment;
    exam?: any;
    reviewDue?: SpacedRepetitionItem;
    loved?: number;
    material?: any;
  }>;
  lessonHistory?: any[];
  onOpenMonth?: (monthDate: Date) => void;
  viewMode: 'fullTerm' | 'singleMonth';
  contextDate?: string;
  isForScreenshot: boolean;
  monthlyCompetencies: Record<string, string>;
  handleCompetencyChange: (monthStr: string, compId: string) => void;
  onDateClick?: (date: Date) => void;
  onQuickMark?: (day: Date, attended: boolean) => void;
  onReschedule?: (event: CalendarEvent, dayKey: string) => void;
  onBookMakeup?: (forDateKey: string, slotDate: Date, time: string, lessonName: string) => void;
  nextClassDateKey?: string;
  highlightSessionId?: string;
  setTooltip: (tooltip: TooltipData | null) => void;
}> = ({
  termIndex, termSessions, refreshKey, learner, sessionsPerTerm, sessionsPerWeek, planInfo, eventDateMap, dayExtraMap, lessonHistory, onOpenMonth, viewMode, contextDate, isForScreenshot, monthlyCompetencies, handleCompetencyChange, onDateClick, onQuickMark, onReschedule, onBookMakeup, nextClassDateKey, highlightSessionId, setTooltip
}) => {
  // Full calendars are shown by default — collapse with ▴ Hide Full Calendars when not needed.
  const [showFullMonths, setShowFullMonths] = useState(true);
  const [reportCardOpen, setReportCardOpen] = useState(false);
  const termStartDate = useMemo(() => {
    const firstSessionDate = termSessions.length > 0 ? new Date(termSessions[0].date) : null;
    const creationDate = new Date((learner as any).dateCreated || (learner as any).joinedAt || new Date());
    if (firstSessionDate && !isNaN(firstSessionDate.getTime())) {
      return fnsStartOfDay(firstSessionDate);
    }
    if (termIndex > 0) {
      return fnsStartOfDay(addDays(creationDate, termIndex * 90));
    }
    return fnsStartOfDay(creationDate);
  }, [termSessions, learner, termIndex, refreshKey]);

  const termEndDate = useMemo(() => {
    if (sessionsPerWeek > 0 && sessionsPerTerm > 0) {
      const weeksNeeded = Math.ceil(sessionsPerTerm / sessionsPerWeek);
      return addDays(termStartDate, (weeksNeeded * 7) - 1);
    }
    return null;
  }, [termStartDate, sessionsPerWeek, sessionsPerTerm, refreshKey]);

  const loggedSessionDateMap = useMemo(() => {
    const map = new Map<string, Session[]>();
    termSessions.forEach(s => {
      const dateKey = format(fnsStartOfDay(new Date(s.date)), 'yyyy-MM-dd');
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(s);
    });
    return map;
  }, [termSessions, refreshKey]);

  const monthsToRenderData = useMemo(() => {
    if (sessionsPerTerm <= 0) return [];

    if (viewMode === 'singleMonth' && contextDate) {
      const monthDate = new Date(`${contextDate}T00:00:00`);
      const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
      const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
      const weeks = [];
      for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
      return [{ monthStr: format(monthDate, 'yyyy-MM'), monthDate, weeks }];
    }

    // Real range: from the month the term started through every logged session,
    // booked/activity event and the next class — no fake "+20 sessions" projection.
    let latest = new Date(termStartDate);
    termSessions.forEach(s => {
      const d = fnsStartOfDay(new Date(s.date));
      if (!isNaN(d.getTime()) && d > latest) latest = d;
    });
    eventDateMap.forEach((evs, key) => {
      if (evs.some(e => !e.id.startsWith('holiday-'))) {
        const d = fnsStartOfDay(new Date(key));
        if (!isNaN(d.getTime()) && d > latest) latest = d;
      }
    });
    const now = fnsStartOfDay(new Date(contextDate || new Date()));
    if (now > latest) latest = now; // keep the current month visible
    if (nextClassDateKey) {
      const nextD = fnsStartOfDay(new Date(`${nextClassDateKey}T00:00:00`));
      if (!isNaN(nextD.getTime()) && nextD > latest) latest = nextD;
    }

    const months = new Set<string>();
    let currentDate = startOfMonth(termStartDate);
    while (currentDate <= endOfMonth(latest)) {
      months.add(format(currentDate, 'yyyy-MM'));
      if (months.size > 24) break;
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }

    return Array.from(months).map(monthStr => {
      const monthDate = parse(monthStr, 'yyyy-MM', new Date());
      const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
      const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
      const weeks = [];
      for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
      return { monthStr, monthDate, weeks };
    });
  }, [termStartDate, sessionsPerTerm, sessionsPerWeek, termSessions.length, eventDateMap, nextClassDateKey, viewMode, contextDate, refreshKey]);

  const allPastWeeks = useMemo(() => {
    const weeks = new Set<string>();
    if (!termStartDate || !isFinite(termStartDate.getTime())) return weeks;
    let weekCursor = startOfWeek(termStartDate, { weekStartsOn: 1 });
    const now = contextDate ? fnsStartOfDay(new Date(contextDate)) : fnsStartOfDay(new Date());
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    let safety = 0;
    while (weekCursor <= currentWeekStart && safety < 200) {
      weeks.add(format(weekCursor, 'yyyy-MM-dd'));
      weekCursor = addDays(weekCursor, 7);
      safety++;
    }
    return weeks;
  }, [termStartDate, contextDate, refreshKey]);

  const weeklySuccess = useMemo(() => {
    const successMap = new Map<string, { count: number; status: 'success' | 'partial' | 'fail' }>();
    allPastWeeks.forEach(weekStartStr => {
      const weekStart = new Date(weekStartStr);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const count = termSessions.filter(s => {
        const d = fnsStartOfDay(new Date(s.date));
        return s.attended && d >= weekStart && d <= weekEnd;
      }).length;
      let status: 'success' | 'partial' | 'fail';
      if (count >= sessionsPerWeek) status = 'success';
      else if (count > 0) status = 'partial';
      else status = 'fail';
      successMap.set(weekStartStr, { count, status });
    });
    return successMap;
  }, [allPastWeeks, termSessions, sessionsPerWeek, refreshKey]);

  const successfulWeeks = Array.from(weeklySuccess.values()).filter(v => v.status === 'success').length;
  const attendedSessionsInTerm = termSessions.filter(s => s.attended).length;
  const missedSessionsInTerm = termSessions.filter(s => s.status === 'missed' || (!s.attended && s.status !== 'scheduled' && s.status !== 'cancelled')).length;
  const totalWeeksSoFar = allPastWeeks.size;
  const commitment = totalWeeksSoFar > 0 ? Math.round((successfulWeeks / totalWeeksSoFar) * 100) : 0;
  const goalPct = sessionsPerTerm > 0 ? Math.round((attendedSessionsInTerm / sessionsPerTerm) * 100) : 0;

  const getDurationText = (totalSessions: number, perWeek: number): string => {
    if (perWeek <= 0 || totalSessions <= 0) return '';
    const weeks = Math.ceil(totalSessions / perWeek);
    const months = Number((weeks / 4.0).toFixed(1));
    if (weeks === 1) return `🗓️ ${totalSessions} session${totalSessions > 1 ? 's' : ''} = 1 week`;
    return `🗓️ ${totalSessions} sessions = ${weeks} weeks ≈ ${months} months`;
  };
  const durationText = getDurationText(sessionsPerTerm, sessionsPerWeek);
  const learnerCompetencies = 'competencies' in learner ? (learner.competencies || []) : [];

  // Compact per-month summary for the collapsed Month Overview view.
  const monthSummaries = useMemo(() => monthsToRenderData.map(({ monthStr, monthDate, weeks }) => {
    const attended = termSessions.filter(s => {
      const d = new Date(s.date);
      return (s.attended || s.status === 'completed') && isSameMonth(d, monthDate);
    }).length;
    const missed = termSessions.filter(s => {
      const d = new Date(s.date);
      return (s.status === 'missed' || (!s.attended && s.status !== 'scheduled' && s.status !== 'cancelled')) && isSameMonth(d, monthDate);
    }).length;
    const cancelled = termSessions.filter(s => {
      const d = new Date(s.date);
      return (s.status === 'cancelled' || s.status === 'scheduled') && isSameMonth(d, monthDate);
    }).length;
    const booked = Array.from(eventDateMap.entries()).filter(([k, evs]) => {
      return k.startsWith(monthStr) && evs.some(e => !e.id.startsWith('holiday-'));
    }).reduce((acc, [, evs]) => acc + evs.filter(e => !e.id.startsWith('holiday-')).length, 0);
    const extras = Array.from(dayExtraMap.entries()).filter(([k]) => k.startsWith(monthStr)).reduce((acc, [, x]) => acc + (x.homework ? 1 : 0) + (x.exam ? 1 : 0) + (x.reviewDue ? 1 : 0) + (x.material ? 1 : 0) + (x.loved ? 1 : 0), 0);
    let goalStatus: 'success' | 'partial' | 'fail' | 'none' = 'none';
    const monthWeeks = weeks.filter(w => !isBefore(startOfWeek(w[0], { weekStartsOn: 1 }), termStartDate) && startOfWeek(w[0], { weekStartsOn: 1 }) <= fnsStartOfDay(new Date(contextDate || new Date())));
    const met = monthWeeks.filter(w => {
      const ws = startOfWeek(w[0], { weekStartsOn: 1 });
      const we = endOfWeek(w[0], { weekStartsOn: 1 });
      return termSessions.filter(s => s.attended && fnsStartOfDay(new Date(s.date)) >= ws && fnsStartOfDay(new Date(s.date)) <= we).length >= sessionsPerWeek;
    }).length;
    if (monthWeeks.length > 0) goalStatus = met === monthWeeks.length ? 'success' : met > 0 ? 'partial' : 'fail';
    return { monthStr, monthDate, attended, missed, cancelled, booked, extras, goalStatus, weeks };
  }), [monthsToRenderData, termSessions, eventDateMap, dayExtraMap, termStartDate, sessionsPerWeek, contextDate]);

  // Continuous lesson progress bars — from the Lessons > Learner Path > Lesson History Log.
  const lessonSpans = useMemo(() => {
    const hist = (lessonHistory || [])
      .filter((x: any) => x.date)
      .sort((a: any, b: any) => (dayKey(a.date) || '') < (dayKey(b.date) || '') ? -1 : 1);
    return hist.map((lh: any, i: number) => {
      const start = dayKey(lh.date) || '';
      if (!start) return null;
      const next = hist[i + 1];
      const end = next ? (dayKey(next.date) || start) : format(fnsStartOfDay(new Date()), 'yyyy-MM-dd');
      const total = (lh.headings || []).length;
      const doneCount = (lh.completedHeadings || []).length;
      const done = total > 0 ? doneCount >= total : lh.completed === true;
      return { lh, start, end: end < start ? start : end, done, doneCount, totalCount: total, pct: total > 0 ? Math.round((doneCount / total) * 100) : done ? 100 : 0 };
    }).filter(Boolean) as Array<{ lh: any; start: string; end: string; done: boolean; doneCount: number; totalCount: number; pct: number }>;
  }, [lessonHistory, refreshKey]);

  return (
    <div key={`${termIndex}-${(learner as any).id || 'learner'}-${refreshKey}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Term Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-500/20">
            T{termIndex + 1}
          </div>
          <div>
            <h4 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tracking-tight">Term {termIndex + 1}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex flex-wrap gap-x-2 gap-y-0.5">
              <span title="Term start date">{format(termStartDate, 'MMM d, yyyy')}</span>
              {termEndDate && <><span aria-hidden>→</span><span title="Estimated end date">{format(termEndDate, 'MMM d, yyyy')}</span></>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ProgressRing percent={goalPct} color={goalPct >= 100 ? '#10b981' : '#6366f1'} label="goal" />
          {!isForScreenshot && (
            <button
              type="button"
              onClick={() => setReportCardOpen(true)}
              className="text-[10px] font-black bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              title="One-click printable / emailable Term Report Card"
            >
              <span>📋</span> Report Card
            </button>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/60 rounded-xl p-2.5" title={`Based on ${successfulWeeks} weeks meeting the goal out of ${totalWeeksSoFar} weeks passed.`}>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{commitment}%</div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">Commitment</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 rounded-xl p-2.5" title="Total sessions attended this term vs. total planned sessions.">
              <div className="text-xl font-black text-blue-600 dark:text-blue-400">{attendedSessionsInTerm}<span className="text-xs text-blue-400">/{sessionsPerTerm}</span></div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-blue-700/80 dark:text-blue-300/80">Sessions</div>
            </div>
            <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200/70 dark:border-violet-900/60 rounded-xl p-2.5" title="Number of weeks where the session frequency goal was met.">
              <div className="text-xl font-black text-violet-600 dark:text-violet-400">{successfulWeeks}<span className="text-xs text-violet-400">/{totalWeeksSoFar}</span></div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-violet-700/80 dark:text-violet-300/80">Weeks Met</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/60 rounded-xl p-2.5" title={`Total sessions missed this term. ${missedSessionsInTerm} missed sessions need a make-up class.`}>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400">{missedSessionsInTerm}</div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-rose-700/80 dark:text-rose-300/80">Missed</div>
            </div>
          </div>
        </div>
      </div>

      {/* SMART Goal + Plan — visual chips, one line per term (past & current) */}
      {(() => {
        const sg = (learner as any).smartGoal;
        const phases = sg?.roadmapPhases || [];
        const phasesDone = phases.filter((p: any) => p.status === 'completed').length;
        const sgCefr = sg?.currentLevel || (learner as any).cefrLevel || 'B1';
        const sgTarget = sg?.targetLevel || 'B2';
        const deadline = sg?.deadline ? new Date(sg.deadline) : null;
        const daysLeft = deadline && !isNaN(deadline.getTime())
          ? Math.max(0, Math.ceil(differenceInDays(deadline, new Date())))
          : null;
        const chipCls = 'text-[10px] font-bold px-2.5 py-1 rounded-full border';
        const chips: React.ReactNode[] = [];
        chips.push(
          <span key="plan" className={`${chipCls} bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300`} title={`${planInfo.name} — ${sessionsPerWeek}× per week, ${sessionsPerTerm} sessions total`}>
            {planInfo.emoji} {planInfo.name} · {sessionsPerWeek}×/wk
          </span>,
        );
        if (sg?.goal) {
          chips.push(
            <span key="goal" className={`${chipCls} bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300`} title={`SMART goal: ${sg.goal}`}>
              🎯 {String(sg.goal).slice(0, 34)}{String(sg.goal).length > 34 ? '…' : ''}
            </span>,
            <span key="cefr" className={`${chipCls} bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300`}>
              {sgCefr} ➔ {sgTarget}
            </span>,
          );
          if (phases.length > 0) {
            chips.push(
              <span key="phases" className={`${chipCls} bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300`} title={`${phasesDone} of ${phases.length} roadmap phases completed`}>
                🗺️ {phasesDone}/{phases.length} phases
              </span>,
            );
          }
          if (daysLeft !== null) {
            chips.push(
              <span key="deadline" className={`${chipCls} ${daysLeft <= 14 ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`} title={deadline ? `Target completion: ${format(deadline, 'PPP')}` : undefined}>
                📅 {daysLeft}d left
              </span>,
            );
          }
        }
        if (durationText) {
          chips.push(
            <span key="duration" className={`${chipCls} bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400`}>
              {sessionsPerTerm} sessions
            </span>,
          );
        }
        return <div className="flex flex-wrap items-center gap-1.5">{chips}</div>;
      })()}

      {/* Month Overview strip + toggle (full calendars shown by default) */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>🗓️</span> Month Overview
          </span>
          <button
            type="button"
            onClick={() => setShowFullMonths(v => !v)}
            className="text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>{showFullMonths ? '▴' : '▾'}</span>
            {showFullMonths ? 'Hide Full Calendars' : 'Show Full Calendars'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {monthSummaries.map(m => (
            <button
              key={m.monthStr}
              type="button"
              onClick={() => { if (onOpenMonth) onOpenMonth(m.monthDate); else setShowFullMonths(true); }}
              className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:border-indigo-400 hover:shadow-md transition-all text-left cursor-pointer group"
              title="Click for the big month view — full details, screenshot & AI update prompt"
            >
              <span className="absolute hidden group-hover:inline-flex -top-1.5 -right-1.5 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md">⤢</span>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black text-slate-800 dark:text-slate-100">{format(m.monthDate, 'MMM yyyy')}</span>
                {m.goalStatus !== 'none' && (
                  <span title="Weekly goal status">{m.goalStatus === 'success' ? '🏆' : m.goalStatus === 'partial' ? '🟡' : '❌'}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">✓ {m.attended}</span>
                {m.missed > 0 && <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded">✗ {m.missed}</span>}
                {m.cancelled > 0 && <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">↺ {m.cancelled} sched.</span>}
                {m.booked > 0 && <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">📌 {m.booked}</span>}
                {m.extras > 0 && <span className="bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded">✦ {m.extras} activities</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Month Grids */}
      {showFullMonths && (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {monthsToRenderData.map(({ monthStr, monthDate, weeks }) => {
          const selectedCompetencyId = monthlyCompetencies[monthStr] || 'overall';
          let competencyToShow: { progress: number; name: string } | null = null;
          if (selectedCompetencyId === 'overall') {
            const overallProgress = learnerCompetencies.length > 0
              ? learnerCompetencies.reduce((acc, c) => acc + c.progress, 0) / learnerCompetencies.length
              : 0;
            competencyToShow = { progress: overallProgress, name: 'Overall' };
          } else {
            const foundComp = learnerCompetencies.find(c => c.id === selectedCompetencyId);
            if (foundComp) competencyToShow = foundComp;
          }

          const monthHasNextClass = weeks.some(week => week.some(day => format(day, 'yyyy-MM-dd') === nextClassDateKey));

          return (
            <div key={monthStr} className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
              <div className="flex flex-wrap justify-between items-center gap-1.5 mb-2">
                <h5 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {format(monthDate, 'MMMM yyyy')}
                  {monthHasNextClass && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-black px-1.5 py-0.5 rounded-full">📌 Next</span>}
                </h5>
                {learnerCompetencies.length > 0 && !isForScreenshot && (
                  <select
                    onChange={(e) => handleCompetencyChange(monthStr, e.target.value)}
                    value={selectedCompetencyId}
                    className="text-[10px] font-bold p-1 border rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[100px] cursor-pointer"
                  >
                    <option value="overall">Overall</option>
                    {learnerCompetencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              {(() => {
                const focus = ((learner as any)?.smartGoal?.syllabusChapters) || [];
                if (focus.length === 0) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    <span className="text-[8px] font-black uppercase tracking-wide text-indigo-500 dark:text-indigo-400">🎯 Focus</span>
                    {focus.slice(0, 3).map((f: string) => (
                      <span key={f} title={f} className="max-w-[150px] truncate text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full px-1.5 py-0.5">{f}</span>
                    ))}
                    {focus.length > 3 && <span className="text-[9px] font-bold text-indigo-400">+{focus.length - 3}</span>}
                  </div>
                );
              })()}

              {(() => {
                const firstDay = format(monthDate, 'yyyy-MM-01');
                const lastDay = format(endOfMonth(monthDate), 'yyyy-MM-dd');
                const monthLessons = lessonSpans.filter(l => l.start <= lastDay && l.end >= firstDay);
                if (monthLessons.length === 0) return null;
                return (
                  <div className="mb-2.5 space-y-1.5">
                    <div className="text-[9px] font-black uppercase tracking-wide text-indigo-500 dark:text-indigo-400">📖 Lessons in progress</div>
                    {monthLessons.map((l, li) => (
                      <div key={li} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5" title={`${l.lh.title} — ${l.doneCount}/${l.totalCount} contents done, ${Math.max(1, differenceInDays(new Date(l.end), new Date(l.start)) + 1)} days`}>
                        <div className="flex items-center justify-between gap-2 text-[9px] font-bold text-slate-700 dark:text-slate-300">
                          <span className="truncate">{l.lh.title}</span>
                          <span className={`shrink-0 text-[8px] font-black ${l.done ? 'text-emerald-600' : 'text-indigo-500'}`}>{l.done ? '✓ finished' : `${l.pct}%`}</span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-700 mt-1 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${l.done ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.max(6, l.pct)}%` }} />
                        </div>
                        <div className="text-[8px] text-slate-400 mt-0.5">{l.start} → {l.end} · {Math.max(1, differenceInDays(new Date(l.end), new Date(l.start)) + 1)} days · {l.doneCount}/{l.totalCount} contents</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {competencyToShow && (
                <div className="mb-2.5">
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    <span>{competencyToShow.name} progress</span>
                    <span>{Math.round(competencyToShow.progress)}%</span>
                  </div>
                  <ProgressBar progress={competencyToShow.progress} />
                </div>
              )}

              <div className="grid grid-cols-8 gap-1 text-center text-[9px] font-black uppercase text-slate-400 mb-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                <div className="text-blue-500" title="Weekly Goal Status">Goal</div>
              </div>

              {weeks.map((weekDays, wIndex) => (
                <div key={wIndex} className="grid grid-cols-8 gap-1 mt-1">
                  {weekDays.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const loggedSessions = loggedSessionDateMap.get(dateKey);
                    const eventsOnDay = eventDateMap.get(dateKey);
                    const eventInfo = eventsOnDay && eventsOnDay.length > 0 ? eventsOnDay[0] : undefined;
                    const extra = dayExtraMap.get(dateKey);
                    const isCurrentMonth = isSameMonth(day, monthDate);
                    const isTodaysDate = isToday(day);
                    const isBeforeTermStart = isBefore(day, termStartDate);
                    const isNextClass = nextClassDateKey !== undefined && dateKey === nextClassDateKey;
                    const isPastDay = !isFuture(day) && !isBeforeTermStart;
                    const hadSession = !!loggedSessions && loggedSessions.length > 0;
                    const wasAttended = hadSession && loggedSessions!.some(s => s.attended || s.status === 'completed');

                    let statusColor: string | null = null;
                    if (hadSession) {
                      statusColor = wasAttended ? 'bg-emerald-500 text-white font-black' : 'bg-rose-500 text-white font-black';
                    }

                    const dayStyle = eventInfo ? { backgroundColor: `${eventInfo.color || '#6366f1'}26` } : {};
                    const markers: React.ReactNode[] = [];
                    if (extra?.loved) markers.push(<span key="loved" className="text-amber-400" title={`Loved this class — ${'★'.repeat(extra.loved)} rating`}>{'★'.repeat(extra.loved)}</span>);
                    if (extra?.material) markers.push(<span key="material" title={`Lesson material: ${extra.material.title || 'Lesson'}`}>📖</span>);
                    if (extra?.homework) markers.push(<span key="hw" title={`Homework: ${extra.homework.title} (${extra.homework.status})`}>📝</span>);
                    if (extra?.exam) markers.push(<span key="exam" title={`Exam: ${extra.exam.examTitle || 'Mock Test'}`}>🎓</span>);
                    if (extra?.reviewDue) markers.push(<span key="review" title={`Review due: ${extra.reviewDue.content}`}>🔁</span>);

                    return (
                      <div
                        key={dateKey}
                        onClick={() => {
                          if (!isForScreenshot && onDateClick) onDateClick(day);
                        }}
                        style={dayStyle}
                        className={`group relative h-14 sm:h-16 rounded-lg text-xs sm:text-sm font-bold transition-all
                          ${!isCurrentMonth || isBeforeTermStart ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}
                          ${onDateClick && !isForScreenshot ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-default'}
                          ${isNextClass ? 'ring-2 ring-emerald-400 ring-offset-1 dark:ring-offset-slate-900 animate-pulse' : ''}
                        `}
                        onMouseEnter={(e) => {
                          if (isForScreenshot) return;

                          const wasMissed = hadSession && !wasAttended;
                          const status: { label: string; pill: string; bar: string } = hadSession
                            ? wasAttended
                              ? { label: '✅ Attended', pill: 'bg-emerald-500/20 text-emerald-300', bar: '#10b981' }
                              : { label: '❌ Missed', pill: 'bg-rose-500/20 text-rose-300', bar: '#f43f5e' }
                            : isNextClass
                              ? { label: '📌 Next class', pill: 'bg-emerald-500/20 text-emerald-300', bar: '#10b981' }
                              : eventInfo
                                ? { label: '📌 Booked', pill: 'bg-blue-500/20 text-blue-300', bar: eventInfo.color || '#6366f1' }
                                : { label: 'Open day', pill: 'bg-white/10 text-white/60', bar: '#64748b' };

                          const rows: React.ReactNode[] = [];

                          if (hadSession) {
                            const s = loggedSessions![0];
                            const summary = (s as any)?.aiAnalysis?.summary || s.lessonSummary || '';
                            rows.push(
                              <div key="session" className="py-2">
                                <div className="text-[9px] font-black uppercase tracking-wider text-white/50 mb-1">Session</div>
                                <div className="font-extrabold text-[12px] text-white leading-snug">{s.lessonName || 'Live Session'}</div>
                                {(s.topics || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(s.topics || []).slice(0, 3).map((t, i) => (
                                      <span key={i} className="text-[9px] font-bold bg-white/10 text-white/90 px-1.5 py-0.5 rounded-md">{t}</span>
                                    ))}
                                  </div>
                                )}
                                {summary && <p className="text-[11px] text-white/75 leading-snug mt-1 line-clamp-3">{summary}</p>}
                                {!summary && s.notes && !s.notes.startsWith('Marked ') && <p className="text-[11px] text-white/75 leading-snug mt-1 line-clamp-2 italic">"{s.notes}"</p>}
                                {s.duration ? <p className="text-[10px] text-white/50 mt-1">⏱ {s.duration} min</p> : null}
                              </div>
                            );
                          }

                          if (eventInfo && !eventInfo.id.startsWith('holiday-')) {
                            rows.push(
                              <div key="event" className="py-2">
                                <div className="text-[9px] font-black uppercase tracking-wider text-white/50 mb-1">Class booked</div>
                                <div className="text-[12px] font-extrabold text-white leading-snug">
                                  {eventInfo.emoji ? eventInfo.emoji + ' ' : ''}{eventInfo.title}
                                </div>
                                {eventInfo.time ? (
                                  <div className="text-[11px] text-white/70 mt-0.5">
                                    🕐 {eventInfo.time}
                                    {(() => {
                                      const localT = formatLearnerLocalTime((learner as any)?.timezone, eventInfo.date || dateKey, eventInfo.time);
                                      return localT ? <span className="text-white/50"> · {localT} their time</span> : null;
                                    })()}
                                  </div>
                                ) : null}
                                {eventInfo.description ? <div className="text-[10px] text-white/55 mt-0.5 line-clamp-2">{eventInfo.description}</div> : null}
                                {onReschedule && !isForScreenshot && (
                                  <button
                                    type="button"
                                    onClick={(ev) => { ev.stopPropagation(); onReschedule(eventInfo, dateKey); }}
                                    className="mt-2 w-full text-[10px] font-black bg-indigo-500/90 hover:bg-indigo-500 text-white rounded-lg py-1.5 px-3 flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    🔄 Reschedule class
                                  </button>
                                )}
                              </div>
                            );
                          }

                          const extraRows: { icon: string; tint: string; label: string; value: React.ReactNode }[] = [];
                          if (extra?.loved) {
                            const sessionWithReview = loggedSessions?.[0];
                            const reviewText = (sessionWithReview as any)?.aiAnalysis?.summary
                              || (sessionWithReview as any)?.review?.comment
                              || '';
                            extraRows.push({
                              icon: '★', tint: 'bg-amber-500/20', label: 'Loved class',
                              value: (
                                <>
                                  <span className="text-amber-400 font-black tracking-wider">{'★'.repeat(extra.loved)}{'☆'.repeat(5 - extra.loved)}</span>
                                  <span className="text-white/55"> {extra.loved}/5 from the student</span>
                                  {reviewText && <div className="text-[10px] text-white/70 mt-0.5 italic line-clamp-2">"{reviewText}"</div>}
                                </>
                              ),
                            });
                          }
                          if (extra?.homework) {
                            extraRows.push({
                              icon: '📝', tint: 'bg-amber-500/20', label: 'Homework',
                              value: (
                                <>
                                  {extra.homework.title}
                                  {' '}<span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${extra.homework.status === 'submitted' || extra.homework.status === 'reviewed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{extra.homework.status}</span>
                                </>
                              ),
                            });
                          }
                          if (extra?.exam) {
                            const exam = extra.exam;
                            extraRows.push({
                              icon: '🎓', tint: 'bg-violet-500/20', label: 'Exam',
                              value: (
                                <>
                                  {exam.examTitle || 'Mock Test'}
                                  {typeof exam.score === 'number' && <> — <span className="font-black text-violet-300">{exam.score}%</span></>}
                                  {exam.band && <span className="text-white/60"> ({exam.band})</span>}
                                </>
                              ),
                            });
                          }
                          if (extra?.reviewDue) {
                            extraRows.push({
                              icon: '🔁', tint: 'bg-sky-500/20', label: 'Review due',
                              value: extra.reviewDue.content,
                            });
                          }
                          if (extra?.material) {
                            extraRows.push({
                              icon: '📖', tint: 'bg-indigo-500/20', label: 'Lesson material',
                              value: extra.material.title || 'Generated lesson',
                            });
                          }

                          extraRows.forEach((r, i) => rows.push(
                            <div key={`extra-${i}`} className="py-2 flex items-start gap-2.5">
                              <span className={`w-6 h-6 rounded-lg ${r.tint} flex items-center justify-center text-[11px] shrink-0`}>{r.icon}</span>
                              <div className="min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-wider text-white/50">{r.label}</div>
                                <div className="text-[11px] font-semibold text-white/90 leading-snug mt-0.5">{r.value}</div>
                              </div>
                            </div>
                          ));

                          if (wasMissed) {
                            const baseTime = eventInfo?.time || '18:00';
                            const slots: { date: Date; time: string }[] = [];
                            let cand = addDays(day, 7);
                            let guard = 0;
                            while (slots.length < 2 && guard < 14) {
                              const ck = format(cand, 'yyyy-MM-dd');
                              const hasEvent = (eventDateMap.get(ck) || []).some(ev => !ev.id.startsWith('holiday-'));
                              if (!hasEvent && !loggedSessionDateMap.has(ck) && !isBefore(cand, new Date())) {
                                slots.push({ date: cand, time: baseTime });
                              }
                              cand = addDays(cand, 1);
                              guard++;
                            }
                            rows.push(
                              <div key="makeup" className="py-2">
                                <div className="text-[9px] font-black uppercase tracking-wider text-rose-300/90 mb-1">🚨 Missed — needs a make-up</div>
                                {slots.length === 0 ? (
                                  <div className="text-[10px] text-white/55">No free slot nearby — book one from Sessions.</div>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {slots.map((s, i) => (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={(ev) => { ev.stopPropagation(); if (onBookMakeup) onBookMakeup(dateKey, s.date, s.time, loggedSessions![0]?.lessonName || ''); }}
                                        className="text-[10px] font-black bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-400/40 rounded-lg px-2 py-1 cursor-pointer"
                                      >
                                        + {format(s.date, 'EEE d')} {s.time}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (rows.length === 0) {
                            rows.push(<div key="empty" className="text-[11px] text-white/55 py-1.5">No activity on this day.</div>);
                          }

                          setTooltip({
                            content: (
                              <div className="w-72">
                                <div className="flex items-center justify-between gap-2 pb-2 mb-1 border-b border-white/10">
                                  <span className="font-black text-[11px] uppercase tracking-wider text-white">{format(day, 'EEEE, MMM d')}</span>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${status.pill}`}>{status.label}</span>
                                </div>
                                <div className="divide-y divide-white/5">{rows}</div>
                              </div>
                            ),
                            x: e.clientX,
                            y: e.clientY,
                            color: status.bar,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span
                          className={`relative w-full h-full flex items-center justify-center rounded-lg transition-all cursor-pointer
                            ${statusColor || ''}
                            ${isTodaysDate && !statusColor ? 'bg-brand-blue text-white font-black' : ''}
                            ${highlightSessionId && loggedSessions?.some(s => s.id === highlightSessionId) ? 'ring-2 ring-brand-purple' : ''}
                          `}
                        >
                          {format(day, 'd')}
                          {eventInfo?.emoji && <span className="absolute -top-1 -right-0.5 text-[10px]">{eventInfo.emoji}</span>}
                          {markers.length > 0 && (
                            <span className="absolute -bottom-0.5 left-0.5 flex text-[7px] leading-none gap-px pointer-events-none">
                              {markers.slice(0, 3)}
                            </span>
                          )}
                          {(extra as any)?.lessonSpan && (
                            <span className="absolute bottom-0 left-0.5 right-0.5 h-0.5 rounded-full bg-white/60 dark:bg-slate-950/40 overflow-hidden pointer-events-none" title={`📖 ${(extra as any).lessonSpan.title} — ${(extra as any).lessonSpan.doneCount}/${(extra as any).lessonSpan.totalCount} contents, ${(extra as any).lessonSpan.done ? 'finished ✓' : (extra as any).lessonSpan.pct + '%'}`}>
                              <span className={`block h-full ${(extra as any).lessonSpan.done ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.max(5, (extra as any).lessonSpan.pct)}%` }} />
                            </span>
                          )}
                        </span>

                        {/* One-click attendance toggle for past days */}
                        {onQuickMark && isPastDay && !isForScreenshot && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-px z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full shadow-md px-0.5 py-0.5">
                            <button
                              type="button"
                              title="Mark attended ✓ (creates/updates the session log)"
                              onClick={(e) => { e.stopPropagation(); onQuickMark(day, true); }}
                              className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center cursor-pointer transition-colors ${wasAttended ? 'bg-emerald-500 text-white' : 'text-emerald-600 hover:bg-emerald-100'}`}
                            >✓</button>
                            <button
                              type="button"
                              title="Mark missed ✗ (creates/updates the session log)"
                              onClick={(e) => { e.stopPropagation(); onQuickMark(day, false); }}
                              className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center cursor-pointer transition-colors ${hadSession && !wasAttended ? 'bg-rose-500 text-white' : 'text-rose-600 hover:bg-rose-100'}`}
                            >✗</button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Weekly Goal Status Cell */}
                  {(() => {
                    const weekStart = startOfWeek(weekDays[0], { weekStartsOn: 1 });
                    if (isBefore(weekStart, termStartDate)) return <div key={`goal-${wIndex}`} />;
                    const weekEnd = endOfWeek(weekDays[0], { weekStartsOn: 1 });
                    const count = termSessions.filter(s => {
                      const d = fnsStartOfDay(new Date(s.date));
                      return s.attended && d >= weekStart && d <= weekEnd;
                    }).length;
                    let status: 'success' | 'partial' | 'fail' | 'pending' | 'none' = 'none';
                    if (count >= sessionsPerWeek) status = 'success';
                    else if (count > 0) status = 'partial';
                    else if (weekStart <= fnsStartOfDay(new Date(contextDate || new Date()))) status = 'fail';
                    else status = 'pending';
                    return <WeekStatus key={`goal-${wIndex}`} status={status} count={count} required={sessionsPerWeek} />;
                  })()}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      )}

      {/* Term Report Card modal */}
      {reportCardOpen && !isForScreenshot && (
        <TermReportCard
          learner={learner}
          termIndex={termIndex}
          termSessions={termSessions}
          sessionsPerTerm={sessionsPerTerm}
          sessionsPerWeek={sessionsPerWeek}
          planInfo={planInfo}
          termStartDate={termStartDate}
          termEndDate={termEndDate}
          commitment={commitment}
          successfulWeeks={successfulWeeks}
          totalWeeksSoFar={totalWeeksSoFar}
          onClose={() => setReportCardOpen(false)}
        />
      )}
    </div>
  );
};

/** Big month view — click a month chip on the calendar to open it: full details,
 *  the month's coaching plan (e.g. "September Plan"), screenshot & AI update prompt. */
const MonthDetailModal: React.FC<{
  monthDate: Date;
  termIndex: number;
  learner: Learner | GroupClass;
  events: CalendarEvent[];
  dayExtraMap: Map<string, any>;
  smartGoal: any;
  planInfo: any;
  sessionsPerWeek: number;
  sessionsPerTerm: number;
  lessonHistory?: any[];
  onClose: () => void;
}> = ({ monthDate, termIndex, learner, events, dayExtraMap, smartGoal, planInfo, sessionsPerWeek, sessionsPerTerm, lessonHistory, onClose }) => {
  const tutor = useAuthStore(state => state.tutor) || useAppStore(state => state.tutorInfo);
  const coachDisplayName = `Coach ${tutor?.name || 'Tutor'}`;
  const cardRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailState, setEmailState] = useState<'idle' | 'working' | 'done'>('idle');
  const monthKey = format(monthDate, 'yyyy-MM');
  const monthLabel = format(monthDate, 'MMMM yyyy');
  const sg = smartGoal || {};
  const learnerObj = 'sessions' in learner ? (learner as Learner) : undefined;
  const sessions = (learnerObj?.sessions || []);

  // Live stats for this month (all from real profile data).
  const monthSessions = sessions.filter(s => (dayKey(s.date) || '').startsWith(monthKey));
  const attended = monthSessions.filter(s => s.attended || s.status === 'completed').length;
  const missed = monthSessions.filter(s => s.status === 'missed' || (!s.attended && s.status !== 'scheduled' && s.status !== 'cancelled')).length;
  const monthEvents = Array.from(dayExtraMap.entries()).filter(([k]) => k.startsWith(monthKey));
  const hwCount = monthEvents.reduce((a, [, x]) => a + (x.homework ? 1 : 0), 0);
  const examCount = monthEvents.reduce((a, [, x]) => a + (x.exam ? 1 : 0), 0);
  const reviewCount = monthEvents.reduce((a, [, x]) => a + (x.reviewDue ? 1 : 0), 0);
  const lessonCount = monthEvents.reduce((a, [, x]) => a + (x.material ? 1 : 0), 0);
  const bookedInMonth = events.filter(e => (dayKey(e.date || e.start || '') || '').startsWith(monthKey) && !e.id.startsWith('holiday-') && !e.id.startsWith('bday-')).length;

  // The month's coaching plan — from the AI monthlyPlans, or computed from the roadmap.
  const monthlyPlan = (sg.monthlyPlans || []).find((p: any) =>
    (p.month || '').toLowerCase().includes(monthLabel.toLowerCase())
    || (p.startDate || '').startsWith(monthKey)
    || (p.endDate || '').startsWith(monthKey)
  ) || undefined;
  const activePhase = (sg.roadmapPhases || []).find((p: any) => (p.targetDate || '').startsWith(monthKey))
    || (sg.roadmapPhases || []).find((p: any) => p.status === 'in_progress');
  const deadline = sg.deadline ? new Date(sg.deadline) : null;
  const daysInMonth = endOfMonth(monthDate).getDate();
  const monthStart = startOfMonth(monthDate);
  const monthEnd = deadline && deadline > monthStart && deadline < endOfMonth(monthDate) ? deadline : endOfMonth(monthDate);
  const weeksCount = Math.max(1, Math.ceil(differenceInDays(monthEnd, monthStart) / 7));
  const sessionsPlanned = monthlyPlan?.sessionsPlanned || Math.max(1, Math.round(sessionsPerWeek * weeksCount));

  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthDate) });

  // Send the month plan to the learner: screenshot to clipboard + plain-language
  // summary via the email composer.
  const sendMonthPlan = async () => {
    if (!cardRef.current || emailState === 'working') return;
    if (!('timezone' in learner)) return;
    setEmailState('working');
    try {
      let copiedImage = false;
      try {
        const blob = await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          copiedImage = true;
        }
      } catch { copiedImage = false; }

      const totalCount = sessionsPerTerm || 24;
      const lines = [
        `Hi ${learnerObj?.name || 'there'}!`,
        '',
        `Here is your ${monthLabel} learning plan.`,
        '',
        `• Level: ${learnerObj?.cefrLevel || learnerObj?.level || 'B1'} ➔ target ${sg.targetLevel || 'B2'}`,
        `• Classes planned: ${sessionsPlanned} (${sessionsPerWeek}×/week, ${totalCount} classes in the term)`,
        `• This month so far: ${attended} attended, ${missed} missed, ${bookedInMonth} booked`,
        `• Homework: ${hwCount} · Exams: ${examCount} · Reviews: ${reviewCount}`,
        monthlyPlan?.focus || activePhase?.title ? `• This month's focus: ${monthlyPlan?.focus || activePhase?.title}` : '',
        monthlyPlan?.goals?.length ? `• Goals: ${monthlyPlan.goals.slice(0, 3).join(' · ')}` : '',
        monthlyPlan?.milestones?.length ? `• Milestones: ${monthlyPlan.milestones.slice(0, 3).join(' · ')}` : '',
        '',
        `${copiedImage ? 'I attached a screenshot of your calendar for this month — paste it right below this message. ' : ''}Looking forward to a great month!`,
        '',
        `— ${coachDisplayName}`,
      ].filter(Boolean).join('\n');

      await sendEmailWithAIGreeting({
        learner: learner as Learner,
        topic: `${monthLabel} learning plan`,
        subject: `Your ${monthLabel} Plan — ${learnerObj?.name || 'Let\'s Go'} 🎯`,
        bodyContent: lines,
      });
      setEmailState('done');
      setTimeout(() => setEmailState('idle'), 4000);
    } catch (err) {
      console.error('Could not send month plan:', err);
      setEmailState('idle');
    }
  };

  const copyMonthPrompt = () => {
    const lines: string[] = [];
    lines.push(`Here is every real data point for ${learnerObj?.name || 'the learner'} in ${monthLabel}. Write a detailed JSON coaching plan for this month: goals, focus, class dates that respect their availability + their country's holidays, homework tasks, review drills, and 2-3 short time-management messages I can send them. Return ONLY raw JSON.`);
    lines.push('');
    lines.push(`- Level: ${learnerObj?.cefrLevel || learnerObj?.level || 'B1'} ➔ ${sg.targetLevel || 'B2'}`);
    lines.push(`- Country/timezone: ${(learnerObj as any)?.country || '—'} / ${(learnerObj as any)?.timezone || '—'}`);
    lines.push(`- Learner reply: ${sg.learnerReply || '—'}`);
    lines.push(`- Attendance in ${monthLabel}: ${attended} attended, ${missed} missed, ${bookedInMonth} booked`);
    lines.push(`- Homework: ${hwCount}, Exams: ${examCount}, Reviews: ${reviewCount}, Lessons: ${lessonCount}`);
    lines.push(`- Smart goal: ${sg.goal || '—'} (deadline ${sg.deadline || '—'})`);
    monthSessions.forEach(s => lines.push(`- ${s.date}: ${s.lessonName || 'Live Session'} — ${s.attended ? 'attended' : s.status}${(s as any).aiAnalysis?.summary ? ` — ${(s as any).aiAnalysis.summary}` : ''}${s.rating ? ` (rating ${s.rating}/5)` : ''}`));
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const savePng = async () => {
    if (!cardRef.current || capturing) return;
    setCapturing(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${monthLabel.replace(/ /g, '-')}-plan-${learnerObj?.name || 'learner'}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to capture month card', err);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in no-screenshot">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div ref={cardRef} className="p-6 space-y-5">
          {/* Month header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20">
                {format(monthDate, 'MMM').slice(0, 1)}
              </div>
              <div>
                <h4 className="font-black text-xl text-slate-900 dark:text-slate-100 tracking-tight">{monthLabel}</h4>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {monthlyPlan?.label || `Term ${termIndex + 1} · ${planInfo.emoji} ${planInfo.name} · ${sessionsPerWeek}×/wk`} — {learnerObj?.name || 'Learner'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={copyMonthPrompt} className="text-[10px] font-black bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white px-3 py-2 rounded-xl transition-colors cursor-pointer">
                {copied ? '✅ Copied!' : '📋 Copy AI Update'}
              </button>
              <button type="button" onClick={savePng} disabled={capturing} className="text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50">
                {capturing ? '⏳ Saving...' : '💾 Save Screenshot PNG'}
              </button>
              {'timezone' in learner && (
                <button type="button" onClick={sendMonthPlan} disabled={emailState === 'working'} className="text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50">
                  {emailState === 'working' ? '⏳ Preparing...' : emailState === 'done' ? '✅ Email Ready' : '📧 Send Month Plan'}
                </button>
              )}
              <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer">✕</button>
            </div>
          </div>

          {/* Active focus chapters for this term */}
          {(() => {
            const focus = ((sg.syllabusChapters) || []);
            if (focus.length === 0) return null;
            return (
              <div className="flex flex-wrap items-center gap-1.5 -mt-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">🎯 Term focus</span>
                {focus.map((f: string) => (
                  <span key={f} title={f} className="max-w-[220px] truncate text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full px-2 py-0.5">📚 {f}</span>
                ))}
              </div>
            );
          })()}

          {/* Month stats — all real data */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/60 rounded-xl p-2.5 text-center">
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{attended}</div>
              <div className="text-[8px] font-black uppercase tracking-wide text-emerald-700/80">Attended</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/60 rounded-xl p-2.5 text-center">
              <div className="text-lg font-black text-rose-600 dark:text-rose-400">{missed}</div>
              <div className="text-[8px] font-black uppercase tracking-wide text-rose-700/80">Missed</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 rounded-xl p-2.5 text-center">
              <div className="text-lg font-black text-blue-600 dark:text-blue-400">{bookedInMonth}</div>
              <div className="text-[8px] font-black uppercase tracking-wide text-blue-700/80">Booked</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/60 rounded-xl p-2.5 text-center">
              <div className="text-lg font-black text-amber-600 dark:text-amber-400">{hwCount}</div>
              <div className="text-[8px] font-black uppercase tracking-wide text-amber-700/80">Homework</div>
            </div>
            <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200/70 dark:border-violet-900/60 rounded-xl p-2.5 text-center">
              <div className="text-lg font-black text-violet-600 dark:text-violet-400">{examCount}</div>
              <div className="text-[8px] font-black uppercase tracking-wide text-violet-700/80">Exams</div>
            </div>
            <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-900/60 rounded-xl p-2.5 text-center">
              <div className="text-lg font-black text-sky-600 dark:text-sky-400">{reviewCount}</div>
              <div className="text-[8px] font-black uppercase tracking-wide text-sky-700/80">Reviews</div>
            </div>
          </div>

          {/* The month's coaching plan */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">🎯 {monthlyPlan?.label || `${monthLabel} Plan`}</span>
              <span className="text-[10px] font-black bg-white/15 px-2 py-0.5 rounded-full">{sessionsPlanned} classes planned</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {(monthlyPlan?.goals && monthlyPlan.goals.length > 0 ? monthlyPlan.goals : (sg.goals || (sg.goal ? [sg.goal] : []))).slice(0, 3).map((g: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-[12px] font-bold">
                  <span className="text-amber-300">★</span> {g}
                </div>
              ))}
              {!sg.goals && !sg.goal && <div className="text-[12px] font-bold text-indigo-100">Design the SMART goal (🎯 button above) to generate this month's plan.</div>}
              {(monthlyPlan?.focus || activePhase?.title) && (
                <div className="text-[11px] font-semibold text-indigo-100">
                  🗺 Focus: {monthlyPlan?.focus || `${activePhase?.title} (${activePhase?.targetCefr || ''})`}
                </div>
              )}
              {monthlyPlan?.milestones && monthlyPlan.milestones.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {monthlyPlan.milestones.slice(0, 3).map((m: string, i: number) => (
                    <span key={i} className="text-[9px] font-black bg-white/15 px-2 py-0.5 rounded-full">✓ {m}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lesson progress in this month */}
          {(() => {
            const hist = (lessonHistory || []).filter((x: any) => x.date)
              .sort((a: any, b: any) => (dayKey(a.date) || '') < (dayKey(b.date) || '') ? -1 : 1);
            const spans = hist.map((lh: any, i: number) => {
              const start = dayKey(lh.date) || '';
              if (!start) return null;
              const next = hist[i + 1];
              const end = next ? (dayKey(next.date) || start) : format(fnsStartOfDay(new Date()), 'yyyy-MM-dd');
              const total = (lh.headings || []).length;
              const doneCount = (lh.completedHeadings || []).length;
              const done = total > 0 ? doneCount >= total : lh.completed === true;
              const first = format(monthDate, 'yyyy-MM-01');
              const last = format(endOfMonth(monthDate), 'yyyy-MM-dd');
              if (start > last || end < first) return null;
              return { lh, start, end: end < start ? start : end, done, doneCount, totalCount: total, pct: total > 0 ? Math.round((doneCount / total) * 100) : done ? 100 : 0 };
            }).filter(Boolean);
            if (spans.length === 0) return null;
            return (
              <div className="space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wide text-indigo-500">📖 Lessons in this month (from the Lesson History Log)</div>
                {spans.map((l: any, i: number) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 truncate">{l.lh.title}</span>
                      <span className={`text-[9px] font-black shrink-0 ${l.done ? 'text-emerald-600' : 'text-indigo-500'}`}>{l.done ? '✓ finished' : `${l.pct}%`}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-1">
                      <div className={`h-full rounded-full ${l.done ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.max(6, l.pct)}%` }} />
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">{l.start} → {l.end} · {Math.max(1, differenceInDays(new Date(l.end), new Date(l.start)) + 1)} days · {l.doneCount}/{l.totalCount} contents checked</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Mini day strip */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="text-[9px] font-black uppercase text-slate-400">{d}</div>)}
            {Array.from({ length: (startOfMonth(monthDate).getDay() + 6) % 7 }).map((_, i) => <div key={`e${i}`} />)}
            {days.map(day => {
              const k = format(day, 'yyyy-MM-dd');
              const sess = monthSessions.find(s => dayKey(s.date) === k);
              const ev = events.find(e => dayKey(e.date || e.start || '') === k && !e.id.startsWith('holiday-') && !e.id.startsWith('bday-'));
              const extra = dayExtraMap.get(k);
              const cell = sess ? (sess.attended || sess.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : ev ? 'bg-blue-500 text-white' : isToday(day) ? 'bg-brand-blue text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
              return (
                <div key={k} className={`relative h-9 rounded-lg flex items-center justify-center text-[10px] font-black ${cell}`} title={`${format(day, 'MMM d')}${sess ? ` — ${sess.lessonName || 'Session'} (${sess.attended ? 'attended' : sess.status})` : ''}${ev ? ` — ${ev.title} ${ev.time || ''}` : ''}${extra?.homework ? ' — homework due' : ''}${extra?.exam ? ' — exam' : ''}${extra?.reviewDue ? ' — review due' : ''}`}>
                  {format(day, 'd')}
                  {(extra?.homework || extra?.exam || extra?.reviewDue || extra?.loved) && (
                    <span className="absolute -bottom-0.5 left-0.5 flex text-[6px] gap-px">
                      {extra?.loved && <span className="text-amber-400">{'★'.repeat(extra.loved)}</span>}
                      {extra?.homework && <span>📝</span>}
                      {extra?.exam && <span>🎓</span>}
                      {extra?.reviewDue && <span>🔁</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day-by-day details */}
          <div className="space-y-1.5">
            {days.map(day => {
              const k = format(day, 'yyyy-MM-dd');
              const sess = monthSessions.filter(s => dayKey(s.date) === k);
              const evs = events.filter(e => dayKey(e.date || e.start || '') === k && !e.id.startsWith('holiday-') && !e.id.startsWith('bday-'));
              const extra = dayExtraMap.get(k);
              const items: string[] = [];
              sess.forEach(s => items.push(`📌 ${s.lessonName || 'Live Session'} — ${s.attended ? '✓ attended' : s.status}${s.rating ? ` (★ ${s.rating}/5)` : ''}${(s as any).aiAnalysis?.summary ? ` — ${(s as any).aiAnalysis.summary}` : ''}`));
              evs.forEach(e => items.push(`🗓 ${e.title} ${e.time ? `at ${e.time}${formatLearnerLocalTime((learner as any)?.timezone, k, e.time) ? ` (${formatLearnerLocalTime((learner as any)?.timezone, k, e.time)} their time)` : ''}` : ''}`));
              if (extra?.homework) items.push(`📝 Homework: ${extra.homework.title} (${extra.homework.status})${extra.homework.feedback ? ` — ${extra.homework.feedback}` : ''}`);
              if (extra?.exam) items.push(`🎓 Exam: ${extra.exam.examTitle || 'Mock test'}${typeof extra.exam.score === 'number' ? ` — ${extra.exam.score}%` : ''}${extra.exam.band ? ` (${extra.exam.band})` : ''}`);
              if (extra?.reviewDue) items.push(`🔁 Review due: ${extra.reviewDue.content}`);
              if (extra?.loved) items.push(`★ ${'★'.repeat(extra.loved)} loved this class`);
              if (items.length === 0) return null;
              return (
                <div key={k} className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-black text-slate-400 w-8 shrink-0 pt-0.5">{format(day, 'd MMM')}</span>
                  <div className="space-y-0.5 min-w-0">
                    {items.map((it, i) => <div key={i} className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-snug">{it}</div>)}
                  </div>
                </div>
              );
            })}
            {monthSessions.length === 0 && bookedInMonth === 0 && hwCount === 0 && examCount === 0 && reviewCount === 0 && lessonCount === 0 && (
              <p className="text-xs text-slate-400 py-2">No activity in {monthLabel} yet — log a session or book a class to see it here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({
  learner,
  events = [],
  allCalendarEvents = [],
  onDateClick,
  onNavigateTab,
  onOpenSmartGoal,
  viewMode = 'fullTerm',
  isForScreenshot = false,
  showNewTermButton = true,
  contextDate,
  highlightSessionId,
}) => {
  const tutor = useAuthStore(state => state.tutor) || useAppStore(state => state.tutorInfo);
  const tutorName = tutor?.name || 'Tutor';
  const coachDisplayName = `Coach ${tutorName}`;
  const coachAvatarUrl = getAvatarUrl('other', (tutor as any)?.avatarId || (tutor as any)?.avatarUrl, tutorName);

  const addTodo = useTodoStore(state => state.addTodo);
  const snapshotRef = useRef<HTMLDivElement>(null);
  const isCapturingRef = useRef(false); // avoid double-capture while toBlob runs
  const [isCapturing, setIsCapturing] = useState(false);
  const [snapshotSuccessMsg, setSnapshotSuccessMsg] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [selectedDaySessions, setSelectedDaySessions] = useState<{ date: string; sessions: Session[]; events: CalendarEvent[] } | null>(null);
  const [tooltipState, setTooltipState] = useState<TooltipData | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipHovering = useRef(false);
  const setTooltip = (t: TooltipData | null) => {
    if (!t) {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      tooltipTimer.current = setTimeout(() => {
        if (!tooltipHovering.current) setTooltipState(null);
      }, 280);
      return;
    }
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltipState(t);
  };
  const [rescheduleTarget, setRescheduleTarget] = useState<{ event: CalendarEvent; dayKey: string } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [monthlyCompetencies, setMonthlyCompetencies] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [explicitBonusTerms, setExplicitBonusTerms] = useState(0);
  const [emailButtonState, setEmailButtonState] = useState<'idle' | 'generating' | 'generated'>('idle');
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  const isLearnerObj = 'sessions' in learner;
  const learnerSessions: Session[] = useMemo(() => {
    if (!isLearnerObj) return [];
    return (learner as Learner).sessions || [];
  }, [learner, isLearnerObj]);

  const plan: any = (learner as any).coursePlan || (learner as any).plan || {};
  const sessionGoal = useMemo(() => {
    // Term capacity: course plan first, then SMART goal term plan, default 24.
    const fromPlan = Number(plan.totalSessions);
    const fromSmart = Number((learner as any).smartGoal?.termPlanDetails?.totalSessions);
    if (fromPlan > 0) return fromPlan;
    if (fromSmart > 0) return fromSmart;
    return 24;
  }, [plan, learner]);

  const frequencyRaw = String(plan.frequency || (learner as any).smartGoal?.termPlanDetails?.weeklyCadence || 'Balanced');
  const planInfo = useMemo(() => {
    if (PLAN_DETAILS[frequencyRaw]) return PLAN_DETAILS[frequencyRaw];
    const match = Object.keys(PLAN_DETAILS).find(k => frequencyRaw.toLowerCase().includes(k.toLowerCase()));
    return PLAN_DETAILS[match || 'Balanced'];
  }, [frequencyRaw]);
  const sessionsPerWeek = planInfo.sessionsPerWeek || 1;

  const smartGoal = isLearnerObj ? (learner as Learner).smartGoal : undefined;
  const currentStreak = isLearnerObj ? ((learner as Learner).streak || 0) : 0;
  const cefrLevel = isLearnerObj ? ((learner as Learner).cefrLevel || (learner as Learner).level || 'B1') : 'B1';
  const targetLevel = smartGoal?.targetLevel || 'B2';

  // 1. Attendance Statistics Calculation
  const stats = useMemo(() => {
    const total = learnerSessions.length;
    const attended = learnerSessions.filter(s => s.attended || s.status === 'completed').length;
    const missed = learnerSessions.filter(s => s.status === 'missed' || (!s.attended && s.status !== 'scheduled' && s.status !== 'cancelled')).length;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 100;
    const totalMinutes = learnerSessions.reduce((acc, s) => acc + (s.attended ? (s.duration || 60) : 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    return { total, attended, missed, rate, totalHours };
  }, [learnerSessions]);

  // 2. Previous Session Info
  const previousSession = useMemo(() => {
    if (learnerSessions.length === 0) return null;
    const sorted = [...learnerSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted.find(s => s.attended || s.status === 'completed') || sorted[0];
  }, [learnerSessions]);

  // 3. Next Class / Upcoming Session Detection
  const combinedEvents = useMemo(() => {
    const list: CalendarEvent[] = [];
    if (events && Array.isArray(events)) list.push(...events);
    if (allCalendarEvents && Array.isArray(allCalendarEvents)) {
      allCalendarEvents.forEach(ev => {
        if (ev.learnerId === (learner as any).id && !list.some(x => x.id === ev.id)) {
          list.push(ev);
        }
      });
    }
    return list;
  }, [events, allCalendarEvents, learner]);

  const upcomingClass = useMemo(() => {
    const now = new Date();
    const futureEvents = combinedEvents.filter(ev => {
      const evDate = new Date(ev.date || ev.start || '');
      return !isNaN(evDate.getTime()) && isAfter(evDate, now);
    }).sort((a, b) => new Date(a.date || a.start || '').getTime() - new Date(b.date || b.start || '').getTime());

    if (futureEvents.length > 0) {
      const nextEv = futureEvents[0];
      const nextDate = new Date(nextEv.date || nextEv.start || '');
      return {
        date: nextDate,
        dateStr: format(nextDate, 'EEEE, MMM d, yyyy'),
        timeStr: nextEv.time || format(nextDate, 'h:mm a'),
        title: nextEv.title || 'Live Coaching Session',
        isBooked: true,
        source: 'calendar'
      };
    }

    const settingsNextDate = isLearnerObj ? (learner as Learner).currentLessonSettings?.nextClassDate : undefined;
    if (settingsNextDate) {
      const parsedDate = new Date(settingsNextDate);
      if (!isNaN(parsedDate.getTime()) && isAfter(parsedDate, now)) {
        return {
          date: parsedDate,
          dateStr: format(parsedDate, 'EEEE, MMM d, yyyy'),
          timeStr: 'Scheduled Time',
          title: (learner as Learner).currentLessonSettings?.lessonName || 'Live Lesson',
          isBooked: true,
          source: 'settings'
        };
      }
    }

    const recommendedDateStr = smartGoal?.nextRecommendedClassDate;
    if (recommendedDateStr) {
      const parsedRec = new Date(recommendedDateStr);
      if (!isNaN(parsedRec.getTime())) {
        return {
          date: parsedRec,
          dateStr: format(parsedRec, 'EEEE, MMM d, yyyy'),
          timeStr: 'Recommended Deadline',
          title: 'Recommended Study Checkpoint',
          isBooked: false,
          source: 'smartGoal'
        };
      }
    }

    // No fabricated dates — if nothing is booked, show the honest empty state.
    return null;
  }, [combinedEvents, learner, isLearnerObj, smartGoal]);

  const nextClassDateKey = useMemo(() => {
    if (!upcomingClass) return undefined;
    return format(upcomingClass.date, 'yyyy-MM-dd');
  }, [upcomingClass]);

  // Live countdown calculation
  const countdownText = useMemo(() => {
    if (!upcomingClass) return null;
    const now = new Date();
    const target = upcomingClass.date;
    if (isBefore(target, now)) return 'Scheduled for today / soon';
    const days = differenceInDays(target, now);
    const hours = differenceInHours(target, now) % 24;
    const minutes = differenceInMinutes(target, now) % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [upcomingClass]);

  // 4. "What to Study Before Next Class" Items
  const studyItems = useMemo(() => {
    if (smartGoal?.whatToStudyNext && smartGoal.whatToStudyNext.length > 0) {
      return smartGoal.whatToStudyNext;
    }
    const items: Array<{ topic: string; description: string; priority: 'high' | 'medium' | 'normal'; tags: string[]; actionType: string }> = [];
    const homework = isLearnerObj ? ((learner as any).homeworkAssignments || []) : [];
    const pendingHw = homework.filter((h: HomeworkAssignment) => h.status === 'assigned' || h.status === 'overdue');
    if (pendingHw.length > 0) {
      items.push({
        topic: pendingHw[0].title || 'Pending Homework Assignment',
        description: pendingHw[0].description || 'Complete and submit before the next class session.',
        priority: 'high',
        tags: ['Homework', 'Essential'],
        actionType: 'homework'
      });
    }
    const comps = isLearnerObj ? ((learner as Learner).competencies || []) : [];
    const weakComp = comps.find(c => c.progress < 50 || c.status === 'NeedsWork');
    if (weakComp) {
      items.push({
        topic: `Reinforce: ${weakComp.name}`,
        description: `Review key rules and collocations for ${weakComp.name} to boost confidence.`,
        priority: 'medium',
        tags: [weakComp.type || 'Grammar', 'Target'],
        actionType: 'review'
      });
    }
    return items;
  }, [smartGoal, learner, isLearnerObj]);

  // 4b. Live integrated data for calendar day overlays — homework, exams, spaced
  // repetition, loved-class reviews and generated lesson material (lesson history).
  const homeworkStore = useAutomationStore(state => state.homeworkAssignments);
  const spacedStore = useAutomationStore(state => state.spacedRepetitionItems);
  const learnerHomework = useMemo(() => isLearnerObj ? homeworkStore.filter(h => h.learnerId === (learner as Learner).id) : [], [homeworkStore, learner, isLearnerObj]);
  const learnerReviews = useMemo(() => isLearnerObj ? spacedStore.filter(s => s.learnerId === (learner as Learner).id) : [], [spacedStore, learner, isLearnerObj]);

  const dayExtraMap = useMemo(() => {
    const map = new Map<string, {
      homework?: HomeworkAssignment;
      exam?: any;
      reviewDue?: SpacedRepetitionItem;
      loved?: number;
      material?: any;
      lessonSpan?: { title: string; start: string; end: string; done: boolean; doneCount: number; totalCount: number; pct: number };
    }>();
    const put = (key: string | null, part: { homework?: HomeworkAssignment; exam?: any; reviewDue?: SpacedRepetitionItem; loved?: number; material?: any }) => {
      if (!key) return;
      const cur = map.get(key) || {};
      map.set(key, { ...cur, ...part });
    };

    learnerHomework.forEach(h => {
      const k = dayKey(h.dueDate);
      if (k) put(k, { homework: h });
    });

    // Lesson spans (continuous progress — start of the lesson until its contents are all checked).
    const hist = (isLearnerObj ? ((learner as Learner).lessonHistory || []) : [])
      .filter((x: any) => x.date)
      .sort((a: any, b: any) => (dayKey(a.date) || '') < (dayKey(b.date) || '') ? -1 : 1);
    hist.forEach((lh: any, i: number) => {
      const start = dayKey(lh.date);
      if (!start) return;
      const next = hist[i + 1];
      const end = next ? (dayKey(next.date) || start) : format(new Date(), 'yyyy-MM-dd');
      const totalCount = (lh.headings || []).length;
      const doneCount = (lh.completedHeadings || []).length;
      const done = totalCount > 0 ? doneCount >= totalCount : lh.completed === true;
      const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : done ? 100 : 0;
      // Fill every day of the lesson's span so the progress bar reads continuously across the calendar.
      let cursor = new Date(`${start}T00:00:00`);
      const endDate = new Date(`${(end < start ? start : end)}T00:00:00`);
      let guard = 0;
      while (cursor <= endDate && guard < 400) {
        const k = format(cursor, 'yyyy-MM-dd');
        const cur = map.get(k) || {};
        map.set(k, { ...cur, lessonSpan: { title: lh.title, start, end: end < start ? start : end, done, doneCount, totalCount, pct } });
        cursor = addDays(cursor, 1);
        guard++;
      }
    });

    (isLearnerObj ? ((learner as Learner).examAnalysis || []) : []).forEach((exam: any) => {
      const k = dayKey(exam.date || exam.completedAt || exam.session?.completedAt || exam.examDate);
      if (k) put(k, { exam });
    });

    learnerReviews.forEach(r => {
      const k = dayKey(r.nextReviewDate);
      if (k) put(k, { reviewDue: r });
    });

    // Loved classes: high rating or positive sentiment in the session log / review.
    learnerSessions.forEach(s => {
      if (!s.attended) return;
      const stars = Math.max(
        Number(s.rating) || 0,
        Number((s as any).review?.stars) || 0,
        ((s as any).aiAnalysis?.sentiment === 'positive' ? 4 : 0)
      );
      if (stars >= 4) put(dayKey(s.date), { loved: stars });
    });
    (isLearnerObj ? ((learner as Learner).sessionHistory || []) : []).forEach(h => {
      const stars = Number((h as any).review?.stars || 0);
      if (stars >= 4) put(dayKey(h.date), { loved: stars });
    });

    // Generated lesson material from the Learner Path lesson history log.
    (isLearnerObj ? ((learner as Learner).lessonHistory || []) : []).forEach(entry => {
      const k = dayKey((entry as any).date);
      if (k) put(k, { material: entry });
    });

    return map;
  }, [learnerSessions, learner, isLearnerObj, learnerHomework, learnerReviews]);

  const handleQuickMark = (day: Date, attended: boolean) => {
    if (!isLearnerObj || isForScreenshot) return;
    const dateKey = format(fnsStartOfDay(day), 'yyyy-MM-dd');
    const learnerId = (learner as Learner).id;
    const store = useLearnerStore.getState();
    const existing = learnerSessions.find(s => format(fnsStartOfDay(new Date(s.date)), 'yyyy-MM-dd') === dateKey);

    if (existing) {
      store.updateSession(learnerId, {
        ...existing,
        attended,
        status: attended ? 'completed' : 'missed',
        lessonName: attended && !existing.lessonName ? 'Live Session' : attended ? existing.lessonName : 'Absence',
        notes: attended
          ? existing.notes
          : `${existing.notes || ''} Marked missed on calendar.`.trim()
      });
    } else {
      const current = store.getLearnerById(learnerId) as Learner | undefined;
      if (!current) return;
      const newSession: Session = {
        id: genId(),
        learnerId,
        date: dateKey,
        duration: 60,
        status: attended ? 'completed' : 'missed',
        attended,
        topics: [],
        notes: `Marked ${attended ? 'attended' : 'missed'} on calendar.`,
        lessonName: attended ? 'Live Session' : 'Absence',
        lessonSummary: '',
      };
      store.updateLearner({
        ...current,
        sessions: [...(current.sessions || []), newSession]
      });
    }
    setToastMessage(`Marked ${format(day, 'MMM d')} as ${attended ? '✔ attended' : '✘ missed'} — session log updated.`);
  };

  const openReschedule = (event: CalendarEvent, dayKey: string) => {
    setRescheduleTarget({ event, dayKey });
    setRescheduleDate(dayKey);
    setRescheduleTime(event.time || '18:00');
  };

  const confirmReschedule = () => {
    if (!rescheduleTarget) return;
    const { event, dayKey: oldDateKey } = rescheduleTarget;
    if (!rescheduleDate) {
      setToastMessage('Pick a new date for the class.');
      return;
    }
    useCalendarStore.getState().updateCalendarEvent({ ...event, date: rescheduleDate, time: rescheduleTime });
    // Move any logged session that sits on the old date so the log stays in sync.
    const session = learnerSessions.find(s => dayKey(s.date) === oldDateKey);
    if (session && isLearnerObj) {
      useLearnerStore.getState().updateSession((learner as Learner).id, {
        ...session,
        date: rescheduleDate,
        notes: `${session.notes || ''} Rescheduled from ${format(new Date(`${oldDateKey}T00:00:00`), 'MMM d')} to ${format(new Date(`${rescheduleDate}T00:00:00`), 'MMM d')}.`.trim(),
      });
    }
    setTooltipState(null);
    setRescheduleTarget(null);
    setToastMessage(`🔄 Class rescheduled to ${format(new Date(`${rescheduleDate}T00:00:00`), 'EEEE, MMM d')} at ${rescheduleTime} — calendar & session log updated.`);
  };

  const handleBookMakeup = (forDateKey: string, slotDate: Date, time: string, lessonName: string) => {
    useCalendarStore.getState().addCalendarEvent({
      title: `🎯 Make-up: ${lessonName || 'Live Session'}`,
      date: format(slotDate, 'yyyy-MM-dd'),
      time,
      type: 'class',
      learnerId: (learner as any).id,
      color: '#10b981',
      description: `Make-up for the missed class on ${format(new Date(`${forDateKey}T00:00:00`), 'MMM d')}.`,
    });
    setTooltipState(null);
    setToastMessage(`🎯 Make-up booked for ${format(slotDate, 'EEEE, MMM d')} at ${time} — added to the calendar.`);
    setRefreshKey(k => k + 1);
  };

  // 5. Terms (grouped session buckets from the course plan goal)
  const sortedSessions = useMemo(() =>
    [...learnerSessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [learnerSessions, refreshKey]
  );

  const eventDateMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    combinedEvents.forEach(e => {
      let actualStart: Date;
      try { actualStart = new Date(`${e.date || e.start || ''}T00:00:00`); } catch { actualStart = new Date(); }
      if (isNaN(actualStart.getTime())) actualStart = new Date();
      const end = e.endDate ? new Date(`${e.endDate}T00:00:00`) : actualStart;
      try {
        const interval = eachDayOfInterval({ start: actualStart, end: isNaN(end.getTime()) ? actualStart : end });
        interval.forEach(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          if (!map.has(dateKey)) map.set(dateKey, []);
          map.get(dateKey)!.push(e);
        });
      } catch (error) {
        console.warn('Invalid event date range:', e);
      }
    });
    return map;
  }, [combinedEvents, refreshKey]);

  const terms = useMemo(() => {
    const termList: Session[][] = [];
    if (sessionGoal > 0) {
      for (let i = 0; i < sortedSessions.length; i += sessionGoal) {
        termList.push(sortedSessions.slice(i, i + sessionGoal));
      }
    }
    if (termList.length === 0 || (sessionGoal > 0 && termList[termList.length - 1].length >= sessionGoal)) {
      termList.push([]);
    }
    for (let i = 0; i < explicitBonusTerms; i++) termList.push([]);
    return termList;
  }, [sortedSessions, sessionGoal, explicitBonusTerms, refreshKey]);

  const activeTermIndex = useMemo(() => {
    const now = fnsStartOfDay(new Date());
    return Math.max(0, terms.findIndex((termSessions, ti) => {
      if (termSessions.length === 0) return ti === terms.length - 1;
      const first = fnsStartOfDay(new Date(termSessions[0].date));
      const next = terms[ti + 1]?.[0] ? fnsStartOfDay(new Date(terms[ti + 1][0].date)) : addDays(first, 9999);
      return now >= first && now < next;
    }));
  }, [terms]);

  const bookedSessionsCount = useMemo(() => {
    const today = fnsStartOfDay(new Date());
    return combinedEvents.filter(e => {
      if (e.id.startsWith('holiday-')) return false;
      const eventDate = new Date(`${e.date || e.start || ''}T00:00:00`);
      return isToday(eventDate) || isFuture(eventDate);
    }).length;
  }, [combinedEvents]);

  const handleNewTerm = () => {
    const next = explicitBonusTerms + 1;
    setExplicitBonusTerms(next);
    addTodo({
      text: `Create a new course plan for ${(learner as any).name}'s next term.`,
      learnerId: learner.id,
      learnerName: (learner as any).name,
      completed: false,
    });
    setToastMessage(`🎉 Term ${next + 1} created — log its first session or book its classes to populate it.`);
  };

  const handleCompetencyChange = (monthStr: string, competencyId: string) => {
    setMonthlyCompetencies(prev => ({ ...prev, [monthStr]: competencyId }));
  };

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setEmailButtonState('idle');
    setGeneratedBlob(null);
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
      setIsRefreshing(false);
      setToastMessage('🔄 Calendar synced — attendance, homework, exams, reviews and lessons are all live from the profile.');
    }, 600);
  };

  const handleEmailFlow = async () => {
    if (!('timezone' in learner)) return;
    if (emailButtonState === 'idle') {
      if (snapshotRef.current) {
        setEmailButtonState('generating');
        try {
          const blob = await toBlob(snapshotRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#f9fafb' });
          if (blob) {
            setGeneratedBlob(blob);
            setEmailButtonState('generated');
          } else {
            throw new Error('Blob conversion failed.');
          }
        } catch (err) {
          console.error('Error generating calendar image:', err);
          alert('Could not generate the calendar image.');
          setEmailButtonState('idle');
        }
      }
    } else if (emailButtonState === 'generated' && generatedBlob) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': generatedBlob })]);
        const bodyContent = `Here is a snapshot of your attendance calendar.\n\nI've copied it to your clipboard. Please paste it into this email to view it (Ctrl+V or Cmd+V).\n\nLet's keep up the great work!`;
        await sendEmailWithAIGreeting({
          learner: learner as Learner,
          topic: 'Attendance Calendar',
          subject: 'Your Attendance Tracker',
          bodyContent,
        });
        setEmailButtonState('idle');
        setGeneratedBlob(null);
      } catch (err) {
        console.error('Could not copy to clipboard or send email:', err);
        alert('Could not copy the calendar image to the clipboard. Your browser might not support this feature or permission was denied.');
        setEmailButtonState('generated');
      }
    }
  };

  // 6. Screenshot & Snapshot Copy Handler
  const handleCopySnapshotToClipboard = async () => {
    if (!snapshotRef.current || isCapturingRef.current) return;
    isCapturingRef.current = true;
    setIsCapturing(true);
    try {
      const blob = await toBlob(snapshotRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-screenshot')) return false;
          return true;
        }
      });
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setSnapshotSuccessMsg('📸 Snapshot copied to clipboard! Ready to paste into WhatsApp, Telegram, or Email.');
        setTimeout(() => setSnapshotSuccessMsg(''), 5000);
      }
    } catch (err) {
      try {
        const dataUrl = await toPng(snapshotRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `coaching-snapshot-${(learner as any).name || 'learner'}.png`;
        link.href = dataUrl;
        link.click();
        setSnapshotSuccessMsg('💾 Snapshot downloaded as PNG image!');
        setTimeout(() => setSnapshotSuccessMsg(''), 5000);
      } catch (e) {
        console.error('Failed to copy snapshot', e);
      }
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  };

  const handleDownloadSnapshot = async () => {
    if (!snapshotRef.current || isCapturingRef.current) return;
    isCapturingRef.current = true;
    setIsCapturing(true);
    try {
      const dataUrl = await toPng(snapshotRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-screenshot')) return false;
          return true;
        }
      });
      const link = document.createElement('a');
      link.download = `coaching-card-${(learner as any).name || 'learner'}.png`;
      link.href = dataUrl;
      link.click();
      setSnapshotSuccessMsg('💾 Snapshot downloaded as PNG image!');
      setTimeout(() => setSnapshotSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to download image', err);
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  };

  // 7. "Update" — copy the full live snapshot as an AI prompt, so the AI can write
  //    a detailed JSON that updates the calendar + coaching & time-management messages.
  const handleUpdatePrompt = () => {
    const fromPlan = (learner as any).smartGoal?.learnerReply || '';
    const lines: string[] = [];
    lines.push(`You are the Smart Coaching planner for ${coachDisplayName}. The learner's calendar just moved. Analyse this live snapshot and return ONLY a JSON object with: coachingMessages (2-4 short plain-language messages for the coming weeks), timeManagementMessages (2-3 per month), updatedRoadmapPhases (mark any phase completed), nextRecommendedClassDate, monthlyPlans (month by month until the deadline, skipping their unavailable days and their country's holidays), whatToStudyNext and weeklyMilestones.`);
    lines.push('');
    lines.push('=== LEARNER ===');
    lines.push(`- Name: ${(learner as any).name || 'Learner'}`);
    lines.push(`- Level: ${cefrLevel} ➔ target ${targetLevel}${smartGoal?.deadline ? `, deadline ${smartGoal.deadline}` : ''}`);
    lines.push(`- Country / timezone: ${(learner as any).country || 'Not set'} / ${(learner as any).timezone || 'Not set'}`);
    lines.push(`- Learner scheduling reply: ${fromPlan || 'Not provided'}`);
    lines.push('');
    lines.push('=== CURRENT SNAPSHOT (all real data) ===');
    lines.push(`- Sessions: ${stats.total} logged — ${stats.attended} attended, ${stats.missed} missed (${stats.rate}% attendance), ${stats.totalHours} hrs learning time, streak ${currentStreak}`);
    lines.push(`- Booked classes ahead: ${bookedSessionsCount}`);
    lines.push(`- Next class: ${upcomingClass ? `${upcomingClass.dateStr} ${upcomingClass.timeStr} — ${upcomingClass.title}` : 'none booked'}`);
    lines.push(`- Last session: ${previousSession ? `${previousSession.lessonName || 'Live Session'} on ${previousSession.date} (${previousSession.attended ? 'attended' : previousSession.status})` : 'none logged'}`);
    lines.push(`- Plan: ${planInfo.name} (${sessionsPerWeek}×/wk), ${sessionGoal} sessions per term, term ${activeTermIndex + 1} active`);
    lines.push(`- Homework: ${learnerHomework.length} total — ${learnerHomework.filter(h => h.status === 'assigned' || h.status === 'overdue').length} pending`);
    lines.push(`- Exams logged: ${((learner as any).examAnalysis || []).length}`);
    lines.push(`- Reviews due: ${learnerReviews.length}`);
    lines.push(`- SMART goal: ${smartGoal?.goal || 'not set yet'}`);
    lines.push(`- Roadmap phases: ${(smartGoal?.roadmapPhases || []).map((p: any) => `${p.title} (${p.status})`).join(' | ') || 'none'}`);
    lines.push('');
    lines.push('=== SESSION LOG (most recent) ===');
    sortedSessions.slice(-10).reverse().forEach(s => {
      lines.push(`- ${s.date}: ${s.lessonName || 'Live Session'} — ${s.attended ? 'attended' : s.status}${(s as any).aiAnalysis?.summary ? ` — ${(s as any).aiAnalysis.summary}` : ''}`);
    });
    lines.push('');
    lines.push('=== HOMEWORK ===');
    learnerHomework.forEach(h => lines.push(`- ${h.title} (due ${h.dueDate}): ${h.status}${h.feedback ? ` — ${h.feedback}` : ''}`));
    if (learnerHomework.length === 0) lines.push('- none');
    lines.push('');
    lines.push('=== LESSON HISTORY LOG ===');
    ((learner as any).lessonHistory || []).forEach((l: any) => lines.push(`- ${l.date}: ${l.title} — ${(l.completedHeadings || []).length}/${(l.headings || []).length} contents`));
    if (!((learner as any).lessonHistory || []).length) lines.push('- none yet');
    lines.push('');
    lines.push('Return ONLY raw JSON matching the schema from the SMART goal design prompt (goals, hoursPerWeek, lessonsPerWeek, studyPace, lifestyleWindow, deadline, monthlyPlans, roadmapPhases, weeklyMilestones, whatToStudyNext, coachingMessages, timeManagementMessages, nextRecommendedClassDate). Use simple words; never invent attendance or sessions that are not listed above.');
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setToastMessage('📋 Update prompt copied — paste it into your AI, then bring the JSON back through the 🎯 plan popup.');
    }).catch(() => {
      setToastMessage('Could not copy — clipboard access blocked.');
    });
  };

  return (
    <div className="space-y-6">
      {snapshotSuccessMsg && (
        <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-fade-in">
          <span>{snapshotSuccessMsg}</span>
          <button onClick={() => setSnapshotSuccessMsg('')} className="text-white/80 hover:text-white font-black ml-3">✕</button>
        </div>
      )}
      {toastMessage && (
        <div className="bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="text-white/80 hover:text-white font-black ml-3">✕</button>
        </div>
      )}

      <div ref={snapshotRef} id="attendance-booking-grid-snapshot" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 text-slate-800 dark:text-slate-100">
        {/* Top Coach Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src={coachAvatarUrl}
                alt={coachDisplayName}
                className="w-13 h-13 rounded-2xl object-cover ring-2 ring-indigo-500/20 shadow-md bg-slate-100 dark:bg-slate-800"
                onError={(e) => { (e.target as any).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24"><text y="18" font-size="18">🧑‍🏫</text></svg>'; }}
              />
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-black px-1 rounded-full ring-2 ring-white dark:ring-slate-900">✓</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tracking-tight">Smart Coaching Calendar</h3>
                <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">{coachDisplayName}</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                Bookings · attendance · homework · exams · reviews · lessons — all in one view. Click a day or hover it for full details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-screenshot">
            {onOpenSmartGoal && (
              <button
                type="button"
                onClick={onOpenSmartGoal}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Design or recalculate the SMART goal — everything is prefilled from the profile"
              >
                <span>🎯</span>
                <span>{smartGoal ? 'Recalculate SMART Goal' : 'Design SMART Goal Plan'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleUpdatePrompt}
              className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Copy all current stats, progress and data as an AI prompt — paste the AI's JSON answer back through the 🎯 plan popup"
            >
              <span>📋</span>
              <span>Update</span>
            </button>
            <button
              type="button"
              onClick={handleCopySnapshotToClipboard}
              disabled={isCapturing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Copy visual coaching snapshot card to clipboard to send via WhatsApp or Telegram"
            >
              <span>{isCapturing ? '⏳' : '📸'}</span>
              <span>{isCapturing ? 'Capturing...' : 'Copy Snapshot'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSnapshot}
              disabled={isCapturing}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs px-3.5 py-2.5 rounded-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Download snapshot image"
            >
              <span>💾</span>
              <span>Save PNG</span>
            </button>
          </div>
        </div>

        {/* Two compact strips: Next Class + Last Session — numbers, not paragraphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`p-4 rounded-2xl border transition-all ${upcomingClass && upcomingClass.isBooked
            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 ring-2 ring-emerald-500/10'
            : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 ring-2 ring-amber-500/10'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>⏱️</span> Next Class
              </span>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${upcomingClass && upcomingClass.isBooked ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                {upcomingClass && upcomingClass.isBooked ? '✓ Booked' : '⚠️ Not Booked'}
              </span>
            </div>
            {upcomingClass && upcomingClass.isBooked ? (
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{countdownText}</span>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  📅 {upcomingClass.dateStr} • {upcomingClass.timeStr}
                </span>
              </div>
            ) : upcomingClass ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-extrabold text-sm text-amber-900 dark:text-amber-200">No class booked</span>
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Recommended: {upcomingClass.dateStr}</span>
              </div>
            ) : (
              <div className="mt-2 font-extrabold text-sm text-amber-900 dark:text-amber-200">No class booked</div>
            )}
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>📝</span> Last Session
              </span>
              {previousSession && (
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${previousSession.attended ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'}`}>
                  {previousSession.attended ? '✅ Attended' : '⚠️ Missed'}
                </span>
              )}
            </div>
            {previousSession ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h5 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {previousSession.lessonName || (previousSession.topics && previousSession.topics[0]) || 'Session'}
                  </h5>
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">{format(new Date(previousSession.date), 'MMM d')}</span>
                </div>
                {(previousSession.topics || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(previousSession.topics || []).slice(0, 3).map((t, i) => (
                      <span key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md">{t}</span>
                    ))}
                  </div>
                )}
                {previousSession.notes && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic line-clamp-1">{previousSession.notes}</p>
                )}
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-400">No sessions logged yet</div>
            )}
          </div>
        </div>

        {/* 5 compact KPI tiles — numbers only, no filler */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 p-3 rounded-2xl">
            <div className="font-black text-xl text-emerald-600 dark:text-emerald-400">{stats.rate}%</div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">Attendance</span>
          </div>
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/60 p-3 rounded-2xl">
            <div className="font-black text-xl text-indigo-600 dark:text-indigo-400">{stats.totalHours} hrs</div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-700/80 dark:text-indigo-300/80">Learning Time</span>
          </div>
          <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 p-3 rounded-2xl">
            <div className="font-black text-xl text-amber-600 dark:text-amber-400"><span>🔥</span> {currentStreak}</div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80">Streak</span>
          </div>
          <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/60 p-3 rounded-2xl">
            <div className="font-black text-xl text-blue-600 dark:text-blue-400">{cefrLevel} ➔ {targetLevel}</div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-700/80 dark:text-blue-300/80">CEFR Goal</span>
          </div>
          <div className="bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200/70 dark:border-cyan-900/60 p-3 rounded-2xl">
            <div className="font-black text-xl text-cyan-600 dark:text-cyan-400">{bookedSessionsCount}</div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-cyan-700/80 dark:text-cyan-300/80">Booked</span>
          </div>
        </div>

        {/* Prep chips — real data only, one line each */}
        {studyItems.length > 0 && (
        <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">📚 Prep</span>
          {studyItems.map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-2 pr-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200" title={item.description}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.priority === 'high' ? 'bg-rose-500' : 'bg-blue-500'}`}></span>
              <span className="max-w-[220px] truncate">{item.topic}</span>
              {(item.tags || []).slice(0, 1).map((t, ti) => (
                <span key={ti} className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{t}</span>
              ))}
            </span>
          ))}
        </div>
        )}

        {!isForScreenshot && (
          <TermTimeline terms={terms} sessionsPerTerm={sessionGoal} sessionsPerWeek={sessionsPerWeek} activeTermIndex={activeTermIndex} />
        )}

        {/* TERM-BASED FULL CALENDAR */}
        <div className="space-y-5 pt-2">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📆</span> Attendance Calendar
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
              {sessionGoal} sessions · {sessionsPerWeek}×/wk
            </span>
          </h4>

          {terms.map((termSessions, termIndex) => (
            <TermSection
              key={`term-${termIndex}-${(learner as any).id || 'learner'}-${refreshKey}`}
              termIndex={termIndex}
              termSessions={termSessions}
              refreshKey={refreshKey}
              learner={learner}
              sessionsPerTerm={sessionGoal}
              sessionsPerWeek={sessionsPerWeek}
              planInfo={planInfo}
              eventDateMap={eventDateMap}
              dayExtraMap={dayExtraMap}
              viewMode={viewMode}
              contextDate={contextDate}
              isForScreenshot={isForScreenshot}
              monthlyCompetencies={monthlyCompetencies}
              handleCompetencyChange={handleCompetencyChange}
              onDateClick={onDateClick}
              onQuickMark={handleQuickMark}
              onReschedule={openReschedule}
              onBookMakeup={handleBookMakeup}
              nextClassDateKey={nextClassDateKey}
              highlightSessionId={highlightSessionId}
              lessonHistory={isLearnerObj ? (learner as Learner).lessonHistory : undefined}
              onOpenMonth={setSelectedMonth}
              setTooltip={setTooltip}
            />
          ))}

          {/* Calendar Status Legend — every item appears on the calendar only when the real data exists in the profile */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500 inline-block"></span> Attended</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-rose-500 inline-block"></span> Missed</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-brand-blue inline-block"></span> Today</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded ring-2 ring-emerald-400 inline-block"></span> Next Class</span>
            <span className="flex items-center gap-1.5">📌 Booked</span>
            <span className="flex items-center gap-1.5"><span className="text-amber-400">★★★★★</span> Loved (stars from the student)</span>
            <span className="flex items-center gap-1.5">📖 Lesson</span>
            <span className="flex items-center gap-1.5">📝 Homework</span>
            <span className="flex items-center gap-1.5">🎓 Exam</span>
            <span className="flex items-center gap-1.5">🔁 Review</span>
            <span className="flex items-center gap-1.5">🏆 Weekly goal met</span>
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">📌 {bookedSessionsCount} Booked ahead</span>
            <span className="flex items-center gap-1.5 font-semibold text-indigo-500 dark:text-indigo-400">🖱 Hover or click any day for full performance details</span>
          </div>

          {/* Footer actions */}
          {!isForScreenshot && (
            <div className="flex flex-wrap justify-end items-center gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                {'timezone' in learner && (
                  <button
                    type="button"
                    onClick={handleEmailFlow}
                    disabled={emailButtonState === 'generating' || isCapturing}
                    title="Email Calendar"
                    className="text-[10px] font-black bg-blue-500 text-white px-3 py-1.5 rounded-xl hover:bg-blue-600 transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-700 cursor-pointer flex items-center gap-1.5"
                  >
                    {emailButtonState === 'idle' && <><i className="fas fa-envelope"></i> Email</>}
                    {emailButtonState === 'generating' && <><i className="fas fa-spinner fa-spin"></i> Preparing...</>}
                    {emailButtonState === 'generated' && <><i className="fas fa-clipboard-check mr-0.5"></i> Copy & Email</>}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRefresh}
                  title="Refresh Tracker Data"
                  className={`text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer ${isRefreshing ? 'opacity-50' : ''}`}
                >
                  <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''}`}></i> Refresh
                </button>
                {showNewTermButton && (
                  <button
                    type="button"
                    onClick={handleNewTerm}
                    className="text-[10px] font-black bg-brand-blue text-white px-3 py-1.5 rounded-xl hover:bg-blue-600 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <i className="fas fa-plus"></i> New Term
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected Day Quick-View Modal (fallback when no page-level date action modal) */}
        {selectedDaySessions && !onDateClick && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in no-screenshot">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>📅</span> Sessions & Events: {selectedDaySessions.date}
                </h4>
                <button type="button" onClick={() => setSelectedDaySessions(null)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold cursor-pointer">✕</button>
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {selectedDaySessions.sessions.length === 0 && selectedDaySessions.events.length === 0 && (
                  <p className="text-xs text-slate-500">No sessions or events on this day.</p>
                )}
                {selectedDaySessions.sessions.map((s, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-xs">{s.lessonName || 'Live Session'}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.attended ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {s.attended ? 'Attended' : s.status}
                      </span>
                    </div>
                    {s.topics && s.topics.length > 0 && <p className="text-[11px] text-slate-600 dark:text-slate-400">Topics: {s.topics.join(', ')}</p>}
                  </div>
                ))}
                {selectedDaySessions.events.map((ev, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-xs text-blue-900 dark:text-blue-200">{ev.title}</span>
                      <span className="text-[10px] font-bold text-blue-600">
                        {ev.time || 'All Day'}
                        {ev.time && (() => {
                          const localT = formatLearnerLocalTime((learner as any)?.timezone, ev.date || '', ev.time);
                          return localT ? <span className="text-blue-400"> · {localT} their time</span> : null;
                        })()}
                      </span>
                    </div>
                    {ev.description && <p className="text-[11px] text-slate-600 dark:text-slate-400">{ev.description}</p>}
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setSelectedDaySessions(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-xl cursor-pointer">Close</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {tooltipState && !isForScreenshot && (
        <div
          className="fixed z-[60] pointer-events-auto animate-fade-in"
          style={{
            top: `${Math.min(tooltipState.y + 14, (typeof window !== 'undefined' ? window.innerHeight : 800) - 320)}px`,
            left: `${Math.min(tooltipState.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 300)}px`,
          }}
          onMouseEnter={() => {
            tooltipHovering.current = true;
            if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
          }}
          onMouseLeave={() => {
            tooltipHovering.current = false;
            setTooltip(null);
          }}
        >
          <div
            className="rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-white/10 shadow-2xl shadow-black/40 overflow-hidden"
            style={{ borderTop: `3px solid ${tooltipState.color || '#6366f1'}` }}
          >
            <div className="px-4 py-3">{tooltipState.content}</div>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleTarget && !isForScreenshot && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in no-screenshot">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🔄</span> Reschedule Class
              </h4>
              <button type="button" onClick={() => { setRescheduleTarget(null); setTooltipState(null); }} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold cursor-pointer">✕</button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong className="text-slate-700 dark:text-slate-300">{rescheduleTarget.event.title}</strong> on{' '}
              {format(new Date(`${rescheduleTarget.dayKey}T00:00:00`), 'MMM d, yyyy')} at {rescheduleTarget.event.time || '—'}
              {rescheduleTarget.event.time && (() => {
                const localT = formatLearnerLocalTime((learner as any)?.timezone, rescheduleTarget.dayKey, rescheduleTarget.event.time);
                return localT ? <span className="text-slate-400"> ({localT} their time)</span> : null;
              })()}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">New date</span>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">New time</span>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setRescheduleTarget(null); setTooltipState(null); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
              <button type="button" onClick={confirmReschedule} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer">✓ Confirm Reschedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Big month view — opened by clicking a month chip */}
      {selectedMonth && !isForScreenshot && (
        <MonthDetailModal
          monthDate={selectedMonth}
          termIndex={activeTermIndex}
          learner={learner}
          events={combinedEvents}
          dayExtraMap={dayExtraMap}
          smartGoal={smartGoal}
          planInfo={planInfo}
          sessionsPerWeek={sessionsPerWeek}
          sessionsPerTerm={sessionGoal}
          lessonHistory={isLearnerObj ? (learner as Learner).lessonHistory : undefined}
          onClose={() => setSelectedMonth(null)}
        />
      )}
    </div>
  );
};

export default AttendanceTracker;