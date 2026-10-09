// ============================================================
// AUTOMATION HUB — one dashboard for a learner's classes,
// homework and reminders, with one-click "Add to Master
// Calendar" actions. Bright Duolingo-style theme, readable
// typography, fully responsive.
// ============================================================

import React, { useMemo, useState } from 'react';
import { format, parseISO, isAfter } from 'date-fns';
import { Learner } from '../../../../types2';
import { useCalendarStore } from '../../../../store/useCalendarStore';
import { useAutomationStore } from '../../../../store/useAutomationStore';

interface AutomationHubProps {
  learner?: Learner;
}

const todayStart = () => new Date().setHours(0, 0, 0, 0);

const formatWhen = (dateStr?: string, timeStr?: string): string => {
  if (!dateStr) return '—';
  let label: string;
  try {
    const d = parseISO(dateStr);
    label = format(d, 'EEE, MMM d');
  } catch {
    label = dateStr;
  }
  return timeStr ? `${label} · ${timeStr}` : label;
};

const AutomationHub: React.FC<AutomationHubProps> = ({ learner }) => {
  const calendarEvents = useCalendarStore(state => state.calendarEvents);
  const addCalendarEvent = useCalendarStore(state => state.addCalendarEvent);
  const homeworkAssignments = useAutomationStore(state => state.homeworkAssignments);
  const scheduledEmails = useAutomationStore(state => state.scheduledEmails);

  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('18:00');
  const [addedFlash, setAddedFlash] = useState<string | null>(null);

  // ── Upcoming classes / events from the master calendar ───────────────
  const upcomingEvents = useMemo(() => {
    const learnerId = learner?.id;
    return calendarEvents
      .filter(e => e.learnerId && learnerId && e.learnerId === learnerId)
      .filter(e => {
        if (e.start) return isAfter(new Date(e.start), new Date(Date.now() - 3600 * 1000));
        if (e.date) return isAfter(parseISO(e.date), new Date(todayStart() - 86400 * 1000));
        return false;
      })
      .sort((a, b) => {
        const ta = a.start ? new Date(a.start).getTime() : a.date ? parseISO(a.date).getTime() : 0;
        const tb = b.start ? new Date(b.start).getTime() : b.date ? parseISO(b.date).getTime() : 0;
        return ta - tb;
      })
      .slice(0, 6);
  }, [calendarEvents, learner?.id]);

  // ── Homework due (assigned or overdue) ───────────────────────────────
  const dueHomework = useMemo(() => {
    const learnerId = learner?.id;
    return homeworkAssignments
      .filter(h => h.learnerId === learnerId && (h.status === 'assigned' || h.status === 'overdue'))
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())
      .slice(0, 5);
  }, [homeworkAssignments, learner?.id]);

  // ── Pending scheduled emails for this learner ────────────────────────
  const pendingEmails = useMemo(() => {
    const learnerId = learner?.id;
    const email = (learner as any)?.email as string | undefined;
    return scheduledEmails.filter(e =>
      e.status === 'pending' &&
      ((e.learnerId && e.learnerId === learnerId) ||
        (email && Array.isArray(e.learnerIds) && e.learnerIds.includes(email)))
    ).length;
  }, [scheduledEmails, learner?.id, learner]);

  const addToMasterCalendar = (title: string, dateStr: string, timeStr: string, opts?: { emoji?: string; description?: string; type?: string }) => {
    const event = {
      title: `${opts?.emoji || '⏰'} ${title}`,
      date: dateStr.slice(0, 10),
      time: timeStr,
      type: opts?.type || 'reminder',
      emoji: opts?.emoji || '⏰',
      color: '#6366f1',
      learnerId: learner?.id,
      description: opts?.description
    };
    addCalendarEvent(event as any);
    setAddedFlash(event.title);
    setTimeout(() => setAddedFlash(null), 2200);
  };

  const submitReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim() || !reminderDate) return;
    addToMasterCalendar(reminderTitle.trim(), reminderDate, reminderTime || '18:00', {
      emoji: '⏰',
      type: 'reminder',
      description: learner ? `Reminder for ${learner.name}` : 'Automation hub reminder'
    });
    setReminderTitle('');
    setReminderDate('');
  };

  const statCard = (icon: string, label: string, value: number | string, tint: string) => (
    <div className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 bg-white ${tint}`}>
      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-lg shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-black text-slate-900 leading-none">{value}</div>
        <div className="text-[11.5px] font-bold text-slate-500 mt-1 truncate">{label}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCard('📅', 'Upcoming classes', upcomingEvents.length, 'border-slate-200')}
        {statCard('📚', 'Homework due', dueHomework.length, 'border-indigo-200')}
        {statCard('📧', 'Emails scheduled', pendingEmails, 'border-emerald-200')}
        {statCard('🗓️', 'Master calendar', calendarEvents.length, 'border-amber-200')}
      </div>

      {addedFlash && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-300 px-3.5 py-2.5 text-[13px] font-extrabold text-emerald-800 animate-fade-in">
          ✅ Added to Master Calendar — {addedFlash}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming classes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-black text-slate-900 flex items-center gap-2">📅 Upcoming Classes</h3>
            <span className="text-[11px] font-bold text-slate-400">from Master Calendar</span>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-[13px] text-slate-500 font-medium py-6 text-center">
              No upcoming classes yet. Add one from the <strong>Calendar</strong> tab or drop a quick reminder below.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcomingEvents.map(ev => (
                <li key={ev.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ev.color || '#6366f1' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-extrabold text-slate-800 truncate">{ev.emoji && !ev.title.startsWith(ev.emoji) ? `${ev.emoji} ` : ''}{ev.title}</p>
                    <p className="text-[12px] font-bold text-slate-500">{formatWhen(ev.date || ev.start, ev.time)}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    ✓ In calendar
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Homework due */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-black text-slate-900 flex items-center gap-2">📚 Homework Due</h3>
            <span className="text-[11px] font-bold text-slate-400">auto-tracked</span>
          </div>
          {dueHomework.length === 0 ? (
            <p className="text-[13px] text-slate-500 font-medium py-6 text-center">
              Nothing due right now. Assign homework from the <strong>Sessions</strong> tab and deadlines land here.
            </p>
          ) : (
            <ul className="space-y-2">
              {dueHomework.map(h => (
                <li key={h.id} className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2.5">
                  <span className="text-lg shrink-0">📄</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-extrabold text-slate-800 truncate">{h.title}</p>
                    <p className="text-[12px] font-bold text-indigo-600">{formatWhen(h.dueDate)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToMasterCalendar(h.title, h.dueDate, '18:00', { emoji: '📚', type: 'reminder', description: `Homework due for ${learner?.name || 'learner'}` })}
                    className="shrink-0 text-[11px] font-extrabold text-indigo-700 bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                    title="Add due date to the Master Calendar"
                  >
                    ＋ Calendar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick reminder → Master Calendar */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-indigo-50/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[15px] font-black text-slate-900">⏰ Quick Reminder</h3>
          <span className="text-[11px] font-bold text-slate-400">lands straight on your Master Calendar</span>
        </div>
        <form onSubmit={submitReminder} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
          <input
            type="text"
            value={reminderTitle}
            onChange={e => setReminderTitle(e.target.value)}
            placeholder={`Reminder for ${learner?.name || 'this learner'}… e.g. Review quiz results`}
            className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <input
            type="date"
            value={reminderDate}
            onChange={e => setReminderDate(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <input
            type="time"
            value={reminderTime}
            onChange={e => setReminderTime(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="submit"
            disabled={!reminderTitle.trim() || !reminderDate}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[13px] font-extrabold shadow transition cursor-pointer whitespace-nowrap"
          >
            ＋ Add to Master Calendar
          </button>
        </form>
      </div>
    </div>
  );
};

export default AutomationHub;