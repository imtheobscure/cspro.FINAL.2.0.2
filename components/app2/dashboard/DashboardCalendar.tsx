import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendarStore, convertUtcToLocalTime } from '../../../store/useCalendarStore';
import { useLearnerStore } from '../../../store/useLearnerStore';
import { CalendarEvent } from '../../../types2';

const DashboardCalendar: React.FC = () => {
    const navigate = useNavigate();
    const calendarEvents = useCalendarStore(state => state.calendarEvents);
    const addCalendarEvent = useCalendarStore(state => state.addCalendarEvent);
    const updateCalendarEvent = useCalendarStore(state => state.updateCalendarEvent);
    const removeCalendarEvent = useCalendarStore(state => state.removeCalendarEvent);
    const calendarTimezone = useCalendarStore(state => state.calendarTimezone ?? 'Asia/Tehran');
    const setCalendarTimezone = useCalendarStore(state => state.setCalendarTimezone || (() => {}));
    
    const learners = useLearnerStore(state => state.learners);
    const groupClasses = useLearnerStore(state => state.groupClasses);

    // States
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
    const [selectedDateStr, setSelectedDateStr] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

    // Dynamic Timezone Settings
    const [isCalSettingsOpen, setIsCalSettingsOpen] = useState(false);

    // Event Creator Modal / Form
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [newEvtTitle, setNewEvtTitle] = useState('');
    const [newEvtTime, setNewEvtTime] = useState('10:00');
    const [newEvtType, setNewEvtType] = useState<'class' | 'holiday' | 'personal' | 'custom'>('class');
    const [newEvtLearner, setNewEvtLearner] = useState('');
    const [newEvtDesc, setNewEvtDesc] = useState('');

    // Available Time slot form states
    const [availDay, setAvailDay] = useState<number>(1);
    const [availStart, setAvailStart] = useState<string>('10:00');
    const [availEnd, setAvailEnd] = useState<string>('13:00');

    // Available time state (defaults to Monday 10:00-12:00, Wed 14:00-16:00, Sat 11:00-13:00)
    const [usualFreeSlots, setUsualFreeSlots] = useState<{ dayOfWeek: number; start: string; end: string }[]>([
        { dayOfWeek: 1, start: '10:00', end: '12:00' }, // Monday
        { dayOfWeek: 3, start: '14:00', end: '16:00' }, // Wednesday
        { dayOfWeek: 6, start: '11:00', end: '13:00' }  // Saturday
    ]);
    const [showFreeSlots, setShowFreeSlots] = useState(true);

    // Color mapper for learners
    const getLearnerBgColor = (learnerId?: string) => {
        if (!learnerId) return 'bg-slate-500 text-white';
        // Generate consistent premium colors based on learner's ID
        const colors = [
            'bg-teal-500 text-white hover:bg-teal-600',
            'bg-purple-500 text-white hover:bg-purple-600',
            'bg-amber-500 text-white hover:bg-amber-600',
            'bg-rose-500 text-white hover:bg-rose-600',
            'bg-indigo-500 text-white hover:bg-indigo-600',
            'bg-emerald-500 text-white hover:bg-emerald-600',
            'bg-blue-500 text-white hover:bg-blue-600',
            'bg-cyan-500 text-[#000] hover:bg-cyan-600'
        ];
        const index = [...learnerId].reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    // Helper: Formats Date objects to YYYY-MM-DD local format
    const formatDateKey = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    // Helper: Get local Tehran/user standard string to UTC conversion
    const handleQuickAddEventSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEvtTitle.trim()) return;

        if (editingEventId) {
            updateCalendarEvent({
                id: editingEventId,
                title: newEvtTitle,
                date: selectedDateStr,
                time: newEvtTime || undefined,
                type: newEvtType,
                learnerId: newEvtLearner || undefined,
                description: newEvtDesc || undefined
            });
        } else {
            addCalendarEvent({
                title: newEvtTitle,
                date: selectedDateStr,
                time: newEvtTime || undefined,
                type: newEvtType,
                learnerId: newEvtLearner || undefined,
                description: newEvtDesc || undefined
            } as any);
        }

        // Reset
        setNewEvtTitle('');
        setNewEvtDesc('');
        setNewEvtTime('10:00');
        setNewEvtType('class');
        setNewEvtLearner('');
        setEditingEventId(null);
        setIsAddEventOpen(false);
    };

    // Prev / Next navigators
    const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            const today = new Date();
            setCurrentDate(today);
            setSelectedDateStr(formatDateKey(today));
            return;
        }

        const newDate = new Date(currentDate);
        if (calendarView === 'month') {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else if (calendarView === 'week') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
        setSelectedDateStr(formatDateKey(newDate));
    };

    // Monthly View Date Calculations
    const monthlyDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of current month
        const firstDayOfMonth = new Date(year, month, 1);
        const startDayIndex = firstDayOfMonth.getDay(); // 0 is Sunday, 6 is Saturday

        // Total days in current month
        const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

        // Total days in previous month
        const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

        const days = [];

        // Previous month filler days
        for (let i = startDayIndex - 1; i >= 0; i--) {
            const prevDate = new Date(year, month - 1, totalDaysInPrevMonth - i);
            days.push({
                date: prevDate,
                isCurrentMonth: false,
                key: formatDateKey(prevDate)
            });
        }

        // Current month days
        for (let i = 1; i <= totalDaysInMonth; i++) {
            const currDate = new Date(year, month, i);
            days.push({
                date: currDate,
                isCurrentMonth: true,
                key: formatDateKey(currDate)
            });
        }

        // Next month filler days to complete grid rows
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            const nextDate = new Date(year, month + 1, i);
            days.push({
                date: nextDate,
                isCurrentMonth: false,
                key: formatDateKey(nextDate)
            });
        }

        return days;
    }, [currentDate]);

    // Weekly View Days Calculation
    const weeklyDays = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        const dayDifference = startOfWeek.getDay(); // Sunday=0, Monday=1 etc
        startOfWeek.setDate(startOfWeek.getDate() - dayDifference);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            days.push({
                date: d,
                key: formatDateKey(d)
            });
        }
        return days;
    }, [currentDate]);

    // Busyness glow lookup map
    const busynessDensity = useMemo(() => {
        const density: { [dateStr: string]: CalendarEvent[] } = {};
        calendarEvents.forEach(evt => {
            if (!evt.date) return;
            if (!density[evt.date]) density[evt.date] = [];
            density[evt.date].push(evt);
        });
        // Sort each day's events chronologically from earliest (most recent on the timeline) to latest
        Object.keys(density).forEach(dateStr => {
            density[dateStr].sort((a, b) => {
                const timeA = a.time || '00:00';
                const timeB = b.time || '00:00';
                return timeA.localeCompare(timeB);
            });
        });
        return density;
    }, [calendarEvents]);

    const getGlowStyles = (dateStr: string) => {
        const count = busynessDensity[dateStr]?.length || 0;
        if (count === 0) return 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800';
        if (count === 1) {
            return 'bg-emerald-50/20 hover:bg-emerald-50/40 border-emerald-300 dark:border-emerald-900/60 shadow-[0_0_12px_rgba(52,211,153,0.1)_inset,0_1px_2px_rgba(0,0,0,0.05)]';
        }
        if (count <= 3) {
            return 'bg-amber-50/25 hover:bg-amber-50/45 border-amber-300 dark:border-amber-900/60 shadow-[0_0_18px_rgba(245,158,11,0.15)_inset,0_1px_3px_rgba(0,0,0,0.05)]';
        }
        // Critical visual glow
        return 'bg-rose-50/30 hover:bg-rose-50/50 border-rose-400 dark:border-rose-900 shadow-[0_0_24px_rgba(244,63,94,0.22)_inset,0_2px_4px_rgba(244,63,94,0.1)]';
    };

    return (
        <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden font-sans">
            {/* Header control board */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-150 dark:border-slate-850 flex flex-col sm:flex-row justify-between items-center gap-3.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-brand-blue/10 text-brand-blue rounded-xl flex items-center justify-center text-lg shadow-sm">
                        📅
                    </div>
                    <div>
                        <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <span>Tutor Master Calendar</span>
                            {showFreeSlots && (
                                <span className="text-[10px] bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                    Availability Active
                                </span>
                            )}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium font-sans">
                            {calendarView === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            {calendarView === 'week' && `Week of ${weeklyDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                            {calendarView === 'day' && currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* View Toggles & Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Month / Week / Day */}
                    <div className="bg-gray-150 dark:bg-slate-850 p-1 rounded-xl flex">
                        {(['month', 'week', 'day'] as const).map(mode => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setCalendarView(mode)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black capitalize transition-all cursor-pointer ${
                                    calendarView === mode
                                        ? 'bg-white dark:bg-slate-800 text-brand-purple shadow-md scale-105'
                                        : 'text-gray-600 dark:text-gray-450 hover:text-gray-950 dark:hover:text-gray-200'
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    {/* Nav actions */}
                    <div className="flex items-center bg-gray-150 dark:bg-slate-850 rounded-xl p-1 gap-1">
                        <button
                            type="button"
                            onClick={() => navigateCalendar('prev')}
                            className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-755 text-xs text-slate-700 dark:text-slate-200 font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                            ◀
                        </button>
                        <button
                            type="button"
                            onClick={() => navigateCalendar('today')}
                            className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-755 text-xs text-slate-700 dark:text-slate-200 font-black px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => navigateCalendar('next')}
                            className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-755 text-xs text-slate-700 dark:text-slate-200 font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                            ▶
                        </button>
                    </div>

                    {/* Toggle availability & Add event button */}
                    <button
                        type="button"
                        onClick={() => setShowFreeSlots(p => !p)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                            showFreeSlots 
                                ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/20 dark:text-sky-350 dark:border-sky-900' 
                                : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-150 dark:bg-slate-850'
                        }`}
                        title="Visualize standard available times"
                    >
                        {showFreeSlots ? '🔓 Available time Visible' : '🔒 Available time Hidden'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setSelectedDateStr(formatDateKey(currentDate));
                            setIsAddEventOpen(true);
                        }}
                        className="bg-brand-purple hover:bg-purple-700 text-white font-black text-xs px-3.5 py-2 rounded-xl transition-all shadow-lg hover:shadow-purple-500/20 cursor-pointer flex items-center gap-1"
                    >
                        <span>➕</span> Create Event
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsCalSettingsOpen(true)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-200 p-2 rounded-xl border border-transparent transition-all cursor-pointer flex items-center justify-center"
                        style={{ height: '38px', width: '38px' }}
                        title="Configure calendar display timezone"
                    >
                        ⚙️
                    </button>
                </div>
            </div>

            {/* MAIN CALENDAR DISPLAYER */}
            <div className="p-4 bg-white dark:bg-slate-950">
                {calendarView === 'month' && (
                    <div className="animate-fade-in">
                        {/* Days of week header */}
                        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1.5 text-center text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="py-1">{d}</div>
                            ))}
                        </div>

                        {/* Month Grid */}
                        <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
                            {monthlyDays.map(({ date, isCurrentMonth, key }) => {
                                const isToday = formatDateKey(new Date()) === key;
                                const dayEvents = busynessDensity[key] || [];
                                const glowClass = getGlowStyles(key);
                                const dayOfWeek = date.getDay();

                                // Check if this day of week has an active free slot
                                const freeSlotsToday = showFreeSlots && usualFreeSlots.filter(s => s.dayOfWeek === dayOfWeek);

                                return (
                                    <div
                                        key={key}
                                        onClick={() => {
                                            setSelectedDateStr(key);
                                            setCurrentDate(date);
                                            setCalendarView('day');
                                        }}
                                        className={`min-h-[75px] md:min-h-[110px] rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer relative group ${glowClass} ${
                                            isCurrentMonth ? 'opacity-100' : 'opacity-35 hover:opacity-60'
                                        } ${
                                            isToday 
                                                ? 'ring-2 ring-brand-purple ring-offset-2 dark:ring-offset-slate-950 shadow-[0_0_20px_rgba(139,92,246,0.35)] border-brand-purple bg-purple-50/15 dark:bg-purple-950/25 animate-pulse' 
                                                : ''
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[11px] font-black w-5 h-5 flex items-center justify-center rounded-full ${
                                                isToday 
                                                    ? 'bg-brand-purple text-white font-black scale-110 shadow-sm' 
                                                    : 'text-slate-700 dark:text-slate-300'
                                            }`}>
                                                {date.getDate()}
                                            </span>
                                            
                                            {/* Busyness Badge */}
                                            {dayEvents.length > 0 && (
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                                    dayEvents.length >= 4 
                                                        ? 'bg-rose-500 text-white' 
                                                        : dayEvents.length >= 2 
                                                        ? 'bg-amber-500 text-white' 
                                                        : 'bg-emerald-500 text-white'
                                                }`}>
                                                    {dayEvents.length} {dayEvents.length === 1 ? 'evt' : 'evts'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Events display */}
                                        <div className="space-y-1 my-1.5 min-w-0 flex-1 overflow-hidden">
                                            {dayEvents.slice(0, 3).map((evt, idx) => {
                                                const hasLearner = evt.learnerId && learners.some(l => l.id === evt.learnerId);
                                                const connectedLearner = hasLearner ? learners.find(l => l.id === evt.learnerId) : null;
                                                return (
                                                    <div
                                                        key={`${evt.id}-${idx}`}
                                                        onClick={(e) => {
                                                            if (connectedLearner) {
                                                                e.stopPropagation();
                                                                navigate(`/learner/${connectedLearner.id}`);
                                                            }
                                                        }}
                                                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded truncate flex items-center gap-1 transition-all ${getLearnerBgColor(evt.learnerId)} ${
                                                            connectedLearner 
                                                                ? 'cursor-pointer hover:scale-[1.05] active:scale-95 shadow-xs border border-white/10 hover:underline' 
                                                                : ''
                                                        }`}
                                                        title={connectedLearner ? `${evt.title} • Connected to ${connectedLearner.name} (Click to view profile)` : evt.title}
                                                    >
                                                        {evt.emoji && <span>{evt.emoji}</span>}
                                                        <span className="truncate">{evt.title}</span>
                                                    </div>
                                                );
                                            })}
                                            {dayEvents.length > 3 && (
                                                <div className="text-[8px] font-black text-slate-400 pl-1">
                                                    + {dayEvents.length - 3} more
                                                </div>
                                            )}
                                        </div>

                                        {/* Availability Dot Indicator */}
                                        {freeSlotsToday && freeSlotsToday.length > 0 && (
                                            <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 flex gap-1">
                                                {freeSlotsToday.map((slot, i) => (
                                                    <span 
                                                        key={i} 
                                                        className="h-1.5 w-1.5 bg-sky-400 dark:bg-sky-500 rounded-full animate-pulse" 
                                                        title={`🔓 Tutor Slot: ${slot.start}-${slot.end}`} 
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* WEEKLY VIEW PLANNER */}
                {calendarView === 'week' && (
                    <div className="animate-fade-in space-y-4">
                        <div className="grid grid-cols-7 gap-2.5">
                            {weeklyDays.map(({ date, key }) => {
                                const isToday = formatDateKey(new Date()) === key;
                                const dayEvents = busynessDensity[key] || [];
                                const dayOfWeek = date.getDay();
                                const freeSlotsToday = showFreeSlots && usualFreeSlots.filter(s => s.dayOfWeek === dayOfWeek);

                                return (
                                    <div 
                                        key={key}
                                        className={`rounded-2xl border p-3 flex flex-col justify-start text-left min-h-[300px] ${
                                            isToday 
                                                ? 'bg-amber-50/10 border-amber-400 dark:bg-slate-900/60' 
                                                : 'bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-850'
                                        }`}
                                    >
                                        <div className="border-b border-slate-200/55 dark:border-slate-800 pb-2">
                                            <p className="text-[10px] font-bold uppercase text-slate-400">
                                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </p>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className={`text-sm font-black w-6 h-6 flex items-center justify-center rounded-full ${
                                                    isToday ? 'bg-indigo-600 text-white' : 'text-slate-800 dark:text-slate-200'
                                                }`}>
                                                    {date.getDate()}
                                                </span>
                                                {freeSlotsToday && freeSlotsToday.length > 0 && (
                                                    <span className="text-[8px] bg-sky-100 text-sky-800 font-extrabold px-1 py-0.5 rounded">
                                                        🔓 Available time
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Events lists */}
                                        <div className="space-y-2 mt-3 flex-1 overflow-y-auto">
                                            {dayEvents.length > 0 ? (
                                                dayEvents.map((evt, idx) => {
                                                    const hasLearner = evt.learnerId && learners.some(l => l.id === evt.learnerId);
                                                    const connectedLearner = hasLearner ? learners.find(l => l.id === evt.learnerId) : null;
                                                    return (
                                                        <div 
                                                            key={`${evt.id}-${idx}`}
                                                            onClick={() => {
                                                                if (connectedLearner) {
                                                                    navigate(`/learner/${connectedLearner.id}`);
                                                                }
                                                            }}
                                                            className={`p-2 rounded-xl text-[10px] font-extrabold shadow-sm border border-black/5 flex flex-col transition-all duration-200 group ${getLearnerBgColor(evt.learnerId)} ${
                                                                connectedLearner 
                                                                    ? 'cursor-pointer hover:shadow-md hover:scale-[1.03] active:scale-95' 
                                                                    : ''
                                                            }`}
                                                            title={connectedLearner ? `${evt.title} • Connected: ${connectedLearner.name} (Click to view profile)` : evt.title}
                                                        >
                                                            <div className="flex justify-between items-start gap-1">
                                                                <span className={`font-extrabold leading-tight ${connectedLearner ? 'underline decoration-dotted' : ''}`}>{evt.title}</span>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const localTime = evt.time ? convertUtcToLocalTime(key, evt.time, calendarTimezone) : '10:00';
                                                                            setNewEvtTitle(evt.title);
                                                                            setNewEvtTime(localTime);
                                                                            setNewEvtType((evt.type as any) || 'class');
                                                                            setNewEvtLearner(evt.learnerId || '');
                                                                            setNewEvtDesc(evt.description || '');
                                                                            setEditingEventId(evt.id);
                                                                            setSelectedDateStr(key);
                                                                            setIsAddEventOpen(true);
                                                                        }}
                                                                        className="text-white hover:text-black/50 cursor-pointer text-[10px] font-sans"
                                                                        title="Edit Event"
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            removeCalendarEvent(evt.id);
                                                                        }}
                                                                        className="text-white hover:text-black/50 cursor-pointer transition-opacity text-[10px] font-sans ml-0.5"
                                                                        title="Delete Event"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {evt.time && <span className="text-[8px] mt-1 font-mono font-medium opacity-90">🕒 {convertUtcToLocalTime(key, evt.time, calendarTimezone)}</span>}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-[10px] text-gray-400 italic text-center pt-8">No events</p>
                                            )}

                                            {/* Available Slot Indicator templates */}
                                            {freeSlotsToday && freeSlotsToday.map((slot, sIdx) => (
                                                <div 
                                                    key={`sf-${sIdx}`}
                                                    onClick={() => {
                                                        setSelectedDateStr(key);
                                                        setNewEvtTime(slot.start);
                                                        setIsAddEventOpen(true);
                                                    }}
                                                    className="bg-sky-50 dark:bg-sky-950/20 border border-dashed border-sky-300 dark:border-sky-800 p-2 rounded-xl text-[10px] text-sky-800 dark:text-sky-300 font-extrabold text-center hover:bg-sky-100 dark:hover:bg-sky-950 transition-colors cursor-pointer"
                                                    title="Click slots to book a custom class!"
                                                >
                                                    🔓 Open {slot.start}-{slot.end}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* DAILY DETAILED VIEW */}
                {calendarView === 'day' && (
                    <div className="animate-fade-in border border-slate-150 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/20 dark:bg-slate-900/10">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            {/* Day's Events List */}
                            <div className="flex-1 w-full space-y-4">
                                <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Appointments & Events</h4>
                                
                                {(busynessDensity[selectedDateStr] || []).length > 0 ? (
                                    <div className="space-y-3">
                                        {(busynessDensity[selectedDateStr] || []).map((evt, idx) => {
                                            const hasLearner = evt.learnerId && learners.some(l => l.id === evt.learnerId);
                                            const connectedLearner = hasLearner ? learners.find(l => l.id === evt.learnerId) : null;
                                            return (
                                                <div 
                                                    key={`${evt.id}-${idx}`}
                                                    onClick={() => {
                                                        if (connectedLearner) {
                                                            navigate(`/learner/${connectedLearner.id}`);
                                                        }
                                                    }}
                                                    className={`bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-xl transition-all flex justify-between items-center ${
                                                        connectedLearner 
                                                            ? 'cursor-pointer hover:border-brand-purple hover:shadow-md hover:bg-slate-50/45 dark:hover:bg-slate-850/50' 
                                                            : 'shadow-xs'
                                                    }`}
                                                    title={connectedLearner ? `Connected to ${connectedLearner.name}'s profile. Click to view.` : undefined}
                                                >
                                                    <div className="space-y-1 min-w-0 flex-1 pr-4 text-left">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-xl">{evt.emoji || '📅'}</span>
                                                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                                                                {evt.title}
                                                            </h4>
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                                                evt.type === 'holiday' 
                                                                    ? 'bg-amber-100 text-amber-800' 
                                                                    : 'bg-indigo-100 text-indigo-800'
                                                            }`}>
                                                                {evt.type || 'Custom'}
                                                            </span>
                                                            {connectedLearner && (
                                                                <span className="text-[10px] bg-brand-purple/15 text-brand-purple font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 hover:bg-brand-purple hover:text-white transition-colors">
                                                                    👤 Connected to {connectedLearner.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {evt.time && (
                                                            <p className="text-xs font-mono font-extrabold text-brand-purple flex items-center gap-1">
                                                                🕒 Time slot: {convertUtcToLocalTime(evt.date || selectedDateStr, evt.time, calendarTimezone)}
                                                            </p>
                                                        )}
                                                        {evt.description && (
                                                            <p className="text-xs text-gray-500/90 dark:text-gray-400 leading-normal max-w-lg mt-2 font-sans">
                                                                {evt.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Avoid triggering card-level learner route navigation
                                                                const localTime = evt.time ? convertUtcToLocalTime(evt.date || selectedDateStr, evt.time, calendarTimezone) : '10:00';
                                                                setNewEvtTitle(evt.title);
                                                                setNewEvtTime(localTime);
                                                                setNewEvtType((evt.type as any) || 'class');
                                                                setNewEvtLearner(evt.learnerId || '');
                                                                setNewEvtDesc(evt.description || '');
                                                                setEditingEventId(evt.id);
                                                                setIsAddEventOpen(true);
                                                            }}
                                                            className="bg-amber-55 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 px-3 py-2 rounded-xl cursor-pointer text-xs font-bold transition-all shrink-0"
                                                        >
                                                            ✏️ Edit Event
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Avoid triggering card-level learner route navigation
                                                                removeCalendarEvent(evt.id);
                                                            }}
                                                            className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 p-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all shrink-0"
                                                        >
                                                            🗑️ Cancel Event
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center p-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-sm font-sans flex flex-col items-center gap-2">
                                        <span className="text-2xl">😎</span>
                                        <p>You have no classes, events, or holidays configured for today.</p>
                                        <button 
                                            onClick={() => setIsAddEventOpen(true)}
                                            className="text-xs text-brand-purple font-black underline mt-1"
                                        >
                                            Quick Add Personal Task
                                        </button>
                                    </div>
                                )}

                                {/* Available templates preview */}
                                {showFreeSlots && usualFreeSlots.length > 0 && (
                                    <div className="p-4 bg-sky-50/40 dark:bg-sky-950/10 border border-sky-100 dark:border-sky-900/60 rounded-xl space-y-2 text-left">
                                        <p className="text-xs font-black text-sky-800 dark:text-sky-400 flex items-center gap-1.5">
                                            <span>🔓</span> Available time
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {usualFreeSlots.filter(s => s.dayOfWeek === currentDate.getDay()).map((slot, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={() => {
                                                        setNewEvtTime(slot.start);
                                                        setNewEvtTitle("Tutor Open Slot");
                                                        setIsAddEventOpen(true);
                                                    }}
                                                    className="p-2.5 bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 hover:border-sky-400 rounded-lg text-xs font-bold text-center text-sky-800 dark:text-sky-305 transition-all cursor-pointer shadow-sm"
                                                >
                                                    🕒 {slot.start} - {slot.end}
                                                </div>
                                            ))}
                                            {usualFreeSlots.filter(s => s.dayOfWeek === currentDate.getDay()).length === 0 && (
                                                <p className="text-[11px] text-sky-650 dark:text-sky-400 font-sans italic">
                                                    No predefined available blocks for this weekday.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tutor Availability Settings widget right in Calendar */}
                            <div className="w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-xl text-left space-y-4">
                                <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Available time</h4>
                                <div className="space-y-2">
                                    {usualFreeSlots.map((slot, index) => {
                                        const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                        return (
                                            <div key={index} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-extrabold text-slate-800 dark:text-slate-200">
                                                        {weekDays[slot.dayOfWeek]}
                                                    </p>
                                                    <p className="text-[10px] font-mono text-slate-500 font-semibold">
                                                        Available: {slot.start} - {slot.end}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUsualFreeSlots(prev => prev.filter((_, idx) => idx !== index));
                                                    }}
                                                    className="text-[10px] font-bold text-red-600 hover:underline shrink-0 cursor-pointer"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                                    <p className="text-[10px] font-black uppercase text-gray-450 tracking-wider">Add Available Time Slot</p>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Day of Week</label>
                                            <select
                                                id="avail-day-select"
                                                value={availDay}
                                                onChange={(e) => setAvailDay(parseInt(e.target.value))}
                                                className="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border rounded font-semibold focus:outline-none focus:ring-1 focus:ring-brand-purple"
                                            >
                                                <option value="1">Monday</option>
                                                <option value="2">Tuesday</option>
                                                <option value="3">Wednesday</option>
                                                <option value="4">Thursday</option>
                                                <option value="5">Friday</option>
                                                <option value="6">Saturday</option>
                                                <option value="0">Sunday</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Start Time</label>
                                                <input 
                                                    type="time" 
                                                    value={availStart} 
                                                    onChange={e => setAvailStart(e.target.value)}
                                                    className="w-full text-xs p-1 bg-white dark:bg-slate-900 border rounded font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-purple"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">End Time</label>
                                                <input 
                                                    type="time" 
                                                    value={availEnd} 
                                                    onChange={e => setAvailEnd(e.target.value)}
                                                    className="w-full text-xs p-1 bg-white dark:bg-slate-900 border rounded font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-purple"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (availStart >= availEnd) {
                                                    alert("Start time must be before End time!");
                                                    return;
                                                }
                                                // Create custom slot
                                                setUsualFreeSlots(p => {
                                                    const updated = [...p, { dayOfWeek: availDay, start: availStart, end: availEnd }];
                                                    return updated.sort((a, b) => {
                                                        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                                                        return a.start.localeCompare(b.start);
                                                    });
                                                });
                                            }}
                                            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black text-xs py-2 rounded-xl transition-all cursor-pointer text-center"
                                        >
                                            Add Available Slot
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* QUICK CREATE EVENT SLIDE OVER */}
            {isAddEventOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-150 dark:border-slate-800 max-w-md w-full overflow-hidden animate-bounce-subtle">
                        <div className="bg-brand-purple p-4 text-white text-left flex justify-between items-center">
                                                            <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                                                                <span>📅</span> {editingEventId ? "Edit Event Details" : "Schedule New Class or Event"}
                                                            </h3>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setNewEvtTitle('');
                                                                    setNewEvtDesc('');
                                                                    setNewEvtTime('10:00');
                                                                    setNewEvtType('class');
                                                                    setNewEvtLearner('');
                                                                    setEditingEventId(null);
                                                                    setIsAddEventOpen(false);
                                                                }}
                                                                className="text-white hover:text-slate-200 cursor-pointer font-black text-xs"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>

                        <form onSubmit={handleQuickAddEventSubmit} className="p-5 space-y-4 text-left">
                            <div className="space-y-1">
                                <label className="text-[11px] font-black uppercase text-gray-500 block">Date scheduled</label>
                                <input
                                    type="date"
                                    required
                                    value={selectedDateStr}
                                    onChange={(e) => setSelectedDateStr(e.target.value)}
                                    className="w-full text-xs p-2.5 border border-gray-200 dark:border-slate-850 dark:bg-slate-950 font-semibold rounded-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black uppercase text-gray-500 block">Start time</label>
                                    <input
                                        type="time"
                                        required
                                        value={newEvtTime}
                                        onChange={(e) => setNewEvtTime(e.target.value)}
                                        className="w-full text-xs p-2.5 border border-gray-200 dark:border-slate-850 dark:bg-slate-950 font-semibold rounded-lg"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black uppercase text-gray-500 block">Type</label>
                                    <select
                                        value={newEvtType}
                                        onChange={(e) => setNewEvtType(e.target.value as any)}
                                        className="w-full text-xs p-2.5 border border-gray-200 dark:border-slate-850 dark:bg-slate-950 font-semibold rounded-lg"
                                    >
                                        <option value="class">🎓 Active Class Slot</option>
                                        <option value="holiday">🎉 Holiday Reminder</option>
                                        <option value="personal">👨‍💻 Personal Task</option>
                                        <option value="custom">⭐️ Custom Reminder</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-black uppercase text-gray-500 block">Event Title / Class description</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Mathematics Prep with Jack"
                                    value={newEvtTitle}
                                    onChange={(e) => setNewEvtTitle(e.target.value)}
                                    className="w-full text-xs p-2.5 border border-gray-200 dark:border-slate-850 dark:bg-slate-950 font-semibold rounded-lg"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-black uppercase text-gray-500 block">Associate Learner (For color coding)</label>
                                <select
                                    value={newEvtLearner}
                                    onChange={(e) => setNewEvtLearner(e.target.value)}
                                    className="w-full text-xs p-2.5 border border-gray-200 dark:border-slate-850 dark:bg-slate-950 font-semibold rounded-lg"
                                >
                                    <option value="">-- No Learner Association (Gray) --</option>
                                    {learners.map((l, lIdx) => (
                                        <option key={`${l.id}-${lIdx}`} value={l.id}>👤 {l.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-black uppercase text-gray-500 block">Optional Description</label>
                                <textarea
                                    rows={2}
                                    placeholder="Enter materials needed, virtual link or other metadata details..."
                                    value={newEvtDesc}
                                    onChange={(e) => setNewEvtDesc(e.target.value)}
                                    className="w-full text-xs p-2.5 border border-gray-200 dark:border-slate-850 dark:bg-slate-950 font-medium rounded-lg font-sans"
                                />
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNewEvtTitle('');
                                        setNewEvtDesc('');
                                        setNewEvtTime('10:00');
                                        setNewEvtType('class');
                                        setNewEvtLearner('');
                                        setEditingEventId(null);
                                        setIsAddEventOpen(false);
                                    }}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-3 rounded-lg transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="w-full bg-brand-purple hover:bg-purple-700 text-white font-black text-xs py-3 rounded-lg transition-all shadow-lg hover:shadow-purple-500/20 cursor-pointer"
                                >
                                    {editingEventId ? "Save Changes" : "Add Calendar Event"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* CALENDAR SETTINGS MODAL */}
            {isCalSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-150 dark:border-slate-800 max-w-sm w-full overflow-hidden animate-bounce-subtle">
                        <div className="bg-brand-purple p-4 text-white text-left flex justify-between items-center">
                            <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                                <span>⚙️</span> Calendar Settings
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsCalSettingsOpen(false)}
                                className="text-white hover:text-slate-200 cursor-pointer font-black text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-left">
                            <div className="space-y-1">
                                <label className="text-[11px] font-black uppercase text-gray-500 block">Calendar Timezone</label>
                                <select
                                    value={calendarTimezone}
                                    onChange={(e) => {
                                        setCalendarTimezone(e.target.value);
                                    }}
                                    className="w-full text-xs p-2.5 border border-gray-200 dark:border-slate-850 dark:bg-slate-950 font-semibold rounded-lg"
                                >
                                    <option value="Asia/Tehran">🇮🇷 Tehran Time (Asia/Tehran, +03:30)</option>
                                    <option value="UTC">🌐 Coordinated Universal Time (UTC)</option>
                                    <option value="Europe/London">🇬🇧 London Time (Europe/London)</option>
                                    <option value="Europe/Paris">🇫🇷 Paris Time (Europe/Paris)</option>
                                    <option value="America/New_York">🇺🇸 New York / Toronto Time (America/New_York)</option>
                                    <option value="America/Chicago">🇺🇸 Chicago Time (America/Chicago)</option>
                                    <option value="America/Denver">🇺🇸 Denver Time (America/Denver)</option>
                                    <option value="America/Los_Angeles">🇺🇸 Los Angeles Time (America/Los_Angeles)</option>
                                    <option value="Asia/Dubai">🇦🇪 Dubai Time (Asia/Dubai, +04:00)</option>
                                    <option value="Asia/Singapore">🇸🇬 Singapore Time (Asia/Singapore, +08:00)</option>
                                    <option value="Asia/Tokyo">🇯🇵 Tokyo Time (Asia/Tokyo, +09:00)</option>
                                    <option value="Australia/Sydney">🇦🇺 Sydney Time (Australia/Sydney)</option>
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                                    This dictates the display timezone specifically for the Tutor Master Calendar. Event times will be converted and shown in this timezone.
                                </p>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCalSettingsOpen(false)}
                                    className="w-full bg-brand-purple hover:bg-purple-700 text-white font-black text-xs py-2.5 rounded-lg transition-all shadow-lg hover:shadow-purple-500/20 cursor-pointer text-center font-bold"
                                >
                                    Apply & Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardCalendar;
