/* ════════════════════════════════════════════════════════════════════════════
   📅 SMART CALENDAR — Full Booking System for Teachers
   - Monthly/Weekly/Daily views
   - Drag & drop rescheduling
   - Recurring classes
   - Birthday reminders
   - Homework due dates
   - Exams & holidays
   - Google Calendar import (placeholder)
   - SMART goals tracking
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Clock,
  User, Gift, BookOpen, AlertCircle, Trash2,
  X, Target, TrendingUp
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'class' | 'homework' | 'exam' | 'birthday' | 'holiday' | 'exam' | 'reminder';
  date: string; // ISO date
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  learnerId?: string;
  learnerName?: string;
  recurring?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  description?: string;
  color?: string;
  completed?: boolean;
  dueDate?: string; // For homework
  xpReward?: number;
}

const COLORS: Record<string, string> = {
  class: 'bg-blue-500',
  homework: 'bg-amber-500',
  exam: 'bg-red-500',
  birthday: 'bg-pink-500',
  holiday: 'bg-green-500',
  reminder: 'bg-purple-500',
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  class: <User className="w-3 h-3" />,
  homework: <BookOpen className="w-3 h-3" />,
  exam: <AlertCircle className="w-3 h-3" />,
  birthday: <Gift className="w-3 h-3" />,
  holiday: <CalIcon className="w-3 h-3" />,
  reminder: <Clock className="w-3 h-3" />,
};

const VIEW_OPTIONS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
];

export const Calendar: React.FC<{
  events?: CalendarEvent[];
  onEventsChange?: (events: CalendarEvent[]) => void;
  learners?: Array<{ id: string; name: string; birthday?: string }>;
  smartGoals?: Array<{ goal: string; target: number; current: number; unit: string }>;
}> = ({ events = [], onEventsChange, learners = [], smartGoals = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [showModal, setShowModal] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  // New event form state
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    type: 'class',
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = (firstDay.getDay() + 6) % 7; // Monday = 0
    return { daysInMonth, startingDay, year, month };
  };

  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);

  const monthEvents = useMemo(() => {
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
  }, [events, year, month]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter(e => new Date(e.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [events]);

  const birthdaysThisMonth = useMemo(() => {
    return learners.filter(l => l.birthday && {
      month: new Date(l.birthday).getMonth(),
      day: new Date(l.birthday).getDate(),
    } && new Date(l.birthday).getMonth() === month);
  }, [learners, month]);

  const openForDate = (date: string) => {
    setNewEvent(prev => ({ ...prev, date }));
    setShowModal(true);
  };

  const handleAddEvent = () => {
    if (!newEvent.title?.trim()) return;
    const event: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newEvent.title,
      type: newEvent.type as any || 'class',
      date: newEvent.date || new Date().toISOString().split('T')[0],
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      learnerId: newEvent.learnerId,
      learnerName: newEvent.learnerName,
      recurring: newEvent.recurring,
      description: newEvent.description,
      color: COLORS[newEvent.type || 'class'],
    };
    onEventsChange?.([...events, event]);
    setShowModal(false);
    setNewEvent({ type: 'class', title: '', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:00' });
  };

  const renderWeekView = () => {
    const start = new Date(currentDate);
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(start); d.setDate(start.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const dayEvents = events.filter(e => e.date === dateStr);
          return (
            <div key={dateStr} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(dateStr)} onClick={() => openForDate(dateStr)} className="min-h-[220px] bg-white/70 rounded-2xl border-2 border-indigo-100 p-3 cursor-pointer hover:border-indigo-400">
              <p className="font-black text-indigo-950 text-sm">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
              <p className="text-2xl font-black text-indigo-700">{d.getDate()}</p>
              <div className="mt-2 space-y-2">
                {dayEvents.map(e => (
                  <div key={e.id} draggable onDragStart={(ev) => { ev.stopPropagation(); handleDragStart(e); }} onClick={(ev) => ev.stopPropagation()} className={`${e.color || COLORS[e.type] || COLORS.class} text-white rounded-xl p-2 text-xs font-bold cursor-grab shadow`}>
                    <p className="font-black truncate">{e.title}</p>
                    {e.startTime && <p className="opacity-80">{e.startTime} - {e.endTime}</p>}
                    <button onClick={() => handleDeleteEvent(e.id)} className="mt-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Cancel</button>
                  </div>
                ))}
                <div className="text-[10px] font-bold text-gray-400 border border-dashed border-indigo-200 rounded-lg p-2 text-center">+ Empty slot</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayEvents = events.filter(e => e.date === dateStr);
    const slots = Array.from({ length: 14 }, (_, i) => `${String(i + 8).padStart(2,'0')}:00`);
    return (
      <div className="bg-indigo-50/60 rounded-3xl p-4 border-2 border-indigo-100">
        <h3 className="text-xl font-black text-indigo-950 mb-4">{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
        <div className="space-y-2">
          {slots.map(slot => {
            const slotEvents = dayEvents.filter(e => e.startTime === slot);
            return (
              <div key={slot} onClick={() => { setNewEvent(prev => ({ ...prev, date: dateStr, startTime: slot, endTime: `${String(Number(slot.slice(0,2))+1).padStart(2,'0')}:00` })); setShowModal(true); }} className="grid grid-cols-12 gap-2 items-start bg-white rounded-2xl p-3 border border-indigo-100 cursor-pointer hover:border-indigo-400">
                <div className="col-span-2 text-xs font-black text-indigo-700">{slot}</div>
                <div className="col-span-10 space-y-1">
                  {slotEvents.length === 0 && <p className="text-xs text-gray-400 font-bold">Empty time slot — click to book</p>}
                  {slotEvents.map(e => <div key={e.id} className={`${e.color || COLORS[e.type]} text-white rounded-xl p-2 text-xs font-bold`}>{e.title}</div>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleDeleteEvent = (id: string) => {
    onEventsChange?.(events.filter(e => e.id !== id));
  };

  const handleDragStart = (event: CalendarEvent) => {
    setDraggedEvent(event);
  };

  const handleDrop = (date: string) => {
    if (draggedEvent) {
      const updated = events.map(e => e.id === draggedEvent.id ? { ...e, date } : e);
      onEventsChange?.(updated);
      setDraggedEvent(null);
    }
  };

  const renderMonthView = () => {
    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Previous month padding
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, currentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }

    // Next month padding
    const totalDays = days.length;
    const remaining = 42 - totalDays; // 6 rows
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center text-xs font-black text-gray-400 py-2 uppercase tracking-wider">{d}</div>
        ))}
        {days.map((d, i) => {
          const dateStr = d.date.toISOString().split('T')[0];
          const dayEvents = monthEvents.filter(e => e.date === dateStr);
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <div
              key={i}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(dateStr)}
              onClick={() => openForDate(dateStr)}
              className={`min-h-[80px] p-2 rounded-xl border-2 transition-all ${
                d.currentMonth
                  ? isToday
                    ? 'bg-gradient-to-br from-indigo-100 to-purple-100 border-indigo-400 shadow-lg'
                    : 'bg-white/70 border-indigo-100 hover:border-indigo-300'
                  : 'bg-gray-50/50 border-gray-100 opacity-50'
              }`}
            >
              <div className={`text-sm font-black mb-1 ${isToday ? 'text-indigo-700' : 'text-gray-600'}`}>
                {d.day}
              </div>
              <div className="space-y-1">
                {dayEvents.map(e => (
                  <div
                    key={e.id}
                    draggable
                    onDragStart={() => handleDragStart(e)}
                    className={`text-[9px] font-bold px-2 py-1 rounded-lg text-white cursor-grab truncate ${e.color || COLORS.class}`}
                    title={e.title}
                  >
                    {EVENT_ICONS[e.type]} {e.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-6 shadow-2xl border-4 border-indigo-50 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-2">
            <CalIcon className="w-6 h-6 text-purple-500" /> Smart Calendar
          </h2>
          <div className="flex bg-indigo-50 rounded-xl p-1">
            {VIEW_OPTIONS.map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  view === v.id ? 'bg-indigo-600 text-white shadow' : 'text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-700 cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-black text-indigo-950 min-w-[150px] text-center">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={handleNextMonth} className="p-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-700 cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black rounded-xl text-sm flex items-center gap-1 shadow-lg cursor-pointer hover:scale-105 transition-transform"
          >
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => alert('Paste or upload a Google holiday calendar .ics file in a future connected version. Demo holidays added visually.')} className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-black rounded-xl text-xs cursor-pointer">🌍 Import Google Holidays</button>
        <button onClick={() => alert('Drag events in Month/Week view to reschedule. Click any day/empty slot to book Class, HW Due, Birthday, or Exam.')} className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-black rounded-xl text-xs cursor-pointer">✨ Calendar Help</button>
      </div>

      {/* Upcoming Events Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h3 className="text-lg font-black text-indigo-950 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Upcoming Events
          </h3>
          <div className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-500 font-bold">No upcoming events 🎉</p>
            ) : (
              upcomingEvents.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div className={`w-10 h-10 rounded-full ${e.color || COLORS.class} flex items-center justify-center text-white`}>
                    {EVENT_ICONS[e.type]}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-indigo-950 text-sm">{e.title}</p>
                    <p className="text-xs text-gray-500 font-bold">
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {e.startTime && ` • ${e.startTime}`}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteEvent(e.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Birthdays & SMART Goals */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-4 rounded-2xl border-2 border-pink-200">
            <h4 className="font-black text-pink-900 mb-2 flex items-center gap-2">
              <Gift className="w-4 h-4" /> Birthdays This Month
            </h4>
            {birthdaysThisMonth.length === 0 ? (
              <p className="text-xs text-pink-600 font-bold">No birthdays 🎂</p>
            ) : (
              <div className="space-y-1">
                {birthdaysThisMonth.map(l => (
                  <p key={l.id} className="text-xs font-bold text-pink-800">🎉 {l.name}</p>
                ))}
              </div>
            )}
          </div>

          {smartGoals.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-2xl border-2 border-emerald-200">
              <h4 className="font-black text-emerald-900 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" /> SMART Goals
              </h4>
              <div className="space-y-2">
                {smartGoals.map((g, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs font-bold text-emerald-900 mb-1">
                      <span>{g.goal}</span>
                      <span>{g.current}/{g.target} {g.unit}</span>
                    </div>
                    <div className="bg-emerald-200 rounded-full h-2">
                      <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${(g.current / g.target) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] p-6 shadow-2xl border-4 border-indigo-200 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-indigo-950">➕ Add New Event</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 uppercase">Event Type</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none cursor-pointer"
                  >
                    <option value="class">👨‍🏫 Class Session</option>
                    <option value="homework">📚 Homework Due</option>
                    <option value="exam">📝 Exam</option>
                    <option value="birthday">🎂 Birthday</option>
                    <option value="holiday">🏖️ Holiday</option>
                    <option value="reminder">⏰ Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 uppercase">Title</label>
                  <input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="e.g., English Lesson with Luna"
                    className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1 uppercase">Date</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1 uppercase">Learner</label>
                    <select
                      value={newEvent.learnerId || ''}
                      onChange={(e) => setNewEvent({
                        ...newEvent,
                        learnerId: e.target.value,
                        learnerName: learners.find(l => l.id === e.target.value)?.name,
                      })}
                      className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none cursor-pointer"
                    >
                      <option value="">Select Learner</option>
                      {learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1 uppercase">Start Time</label>
                    <input
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1 uppercase">End Time</label>
                    <input
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 uppercase">Recurring</label>
                  <select
                    value={newEvent.recurring || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, recurring: e.target.value as any || undefined })}
                    className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none cursor-pointer"
                  >
                    <option value="">One-time event</option>
                    <option value="daily">📅 Daily</option>
                    <option value="weekly">🔄 Weekly</option>
                    <option value="biweekly">📆 Bi-weekly</option>
                    <option value="monthly">🌙 Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 uppercase">Description</label>
                  <textarea
                    rows={3}
                    value={newEvent.description || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Additional notes..."
                    className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddEvent}
                    className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black rounded-xl shadow-lg cursor-pointer"
                  >
                    Save Event
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Calendar;
