import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { Learner, CalendarEvent } from '../../../types2';
import { useCalendarStore, getTimezoneOffsetForDate } from '../../../store/useCalendarStore';
import { format, addDays } from 'date-fns';
import { parseLearnerOffDays, LearnerOffDays } from '../../../utils/availabilityOffDays';

export type SlotPlanEntry = {
    number: number;
    dateKey: string;      // tutor-side calendar date (yyyy-MM-dd)
    dayLabel: string;     // "Monday, Sep 7"
    learnerTime: string;  // 12h, learner's own timezone
    tutorTime: string;    // 12h, tutor-side (internal only — never shown to the learner)
    tutorTime24: string;  // "HH:00" tutor-side 24h — used to book the calendar event
};

interface TooltipData {
    content: string;
    x: number;
    y: number;
}

const COMMON_TIMEZONES = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo', 'America/Buenos_Aires',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
    'Europe/Amsterdam', 'Europe/Lisbon', 'Europe/Stockholm', 'Europe/Warsaw', 'Europe/Athens',
    'Europe/Istanbul', 'Europe/Moscow', 'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
    'Asia/Dubai', 'Asia/Riyadh', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok',
    'Asia/Jakarta', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Hong_Kong', 'Asia/Shanghai',
    'Asia/Taipei', 'Asia/Seoul', 'Asia/Tokyo', 'Asia/Manila', 'Australia/Sydney', 'Australia/Melbourne',
    'Pacific/Auckland',
].sort();

const getSlotStyle = (timeStr: string) => {
    try {
        const [time, period] = timeStr.split(' ');
        let [hourStr] = time.split(':');
        let hour = parseInt(hourStr);
        if (period.toLowerCase() === 'pm' && hour !== 12) hour += 12;
        if (period.toLowerCase() === 'am' && hour === 12) hour = 0;
        if (hour >= 6 && hour < 12) {
            return { emoji: '☀️', label: 'Morning', cls: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:shadow-amber-200/60' };
        } else if (hour >= 12 && hour < 18) {
            return { emoji: '🏙️', label: 'Daytime', cls: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 hover:shadow-sky-200/60' };
        } else {
            return { emoji: '🌙', label: 'Evening', cls: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 hover:shadow-indigo-200/60' };
        }
    } catch {
        return { emoji: '🕒', label: '', cls: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300' };
    }
};

/**
 * My Availability — picks free 1-hour slots for the chosen day (or the whole week),
 * converts them to the learner's own timezone, and gives the tutor a ready-to-send
 * message with global slot numbers. The tutor's timezone stays internal — it is
 * never shown on the learner-facing text.
 */
const AvailabilityView: React.FC<{
    learner: Learner;
    events: CalendarEvent[];
    selectedDate: string;
    onTimezoneChange?: (tz: string) => void;
    onPlanChange?: (plan: SlotPlanEntry[]) => void;
}> = ({ learner, events, selectedDate, onTimezoneChange, onPlanChange }) => {
    const calendarTimezone = useCalendarStore(state => state.calendarTimezone ?? 'Asia/Tehran');
    const [learnerTz, setLearnerTz] = useState(learner.timezone || '');
    const [mode, setMode] = useState<'day' | 'week'>('day');
    const [slots, setSlots] = useState<Omit<SlotPlanEntry, 'number'>[]>([]);
    const [offInfo, setOffInfo] = useState<LearnerOffDays>({ offWeekdays: [], offDates: [], detected: [] });
    const [skippedDays, setSkippedDays] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [copied, setCopied] = useState(false);
    const [isScreenshotting, setIsScreenshotting] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [manualTime, setManualTime] = useState('');

    useEffect(() => {
        setLearnerTz(learner.timezone || '');
    }, [learner.timezone]);

    // Persist a picked timezone back to the learner profile so the whole app uses it.
    const handlePickTimezone = (tz: string) => {
        setLearnerTz(tz);
        if (learner.timezone !== tz) {
            onTimezoneChange?.(tz);
        }
    };

    // Days the learner said they're unavailable — parsed from their SMART-goal reply
    // (the "days they are unavailable / next month plans / holidays" answers).
    useEffect(() => {
        setOffInfo(parseLearnerOffDays(learner.smartGoal?.learnerReply, new Date(`${selectedDate}T00:00:00`)));
    }, [learner.smartGoal?.learnerReply, selectedDate]);

    const tutorOffset = (() => {
        try {
            const offsetInMinutes = getTimezoneOffsetForDate(selectedDate, calendarTimezone);
            const sign = offsetInMinutes >= 0 ? '+' : '-';
            const absMinutes = Math.abs(offsetInMinutes);
            const hours = Math.floor(absMinutes / 60).toString().padStart(2, '0');
            const minutes = (absMinutes % 60).toString().padStart(2, '0');
            return `${sign}${hours}:${minutes}`;
        } catch {
            return '+03:30';
        }
    })();

    // Slot start epoch for a given hour of a tutor-side day (epoch = real moment in time).
    const slotStartMs = (dateKey: string, hour: number) =>
        new Date(`${dateKey}T00:00:00${tutorOffset}`).getTime() + hour * 60 * 60 * 1000;

    const computePlan = (tz: string, m: 'day' | 'week') => {
        setIsLoading(true);
        try {
            const dayCount = m === 'week' ? 7 : 1;
            const entries: Omit<SlotPlanEntry, 'number'>[] = [];
            const skipped: string[] = [];

            // Pre-compute which of the window's days fall on the learner's stated days off.
            const windowDays = Array.from({ length: dayCount }, (_, d) => {
                const dateKey = format(addDays(new Date(`${selectedDate}T00:00:00`), d), 'yyyy-MM-dd');
                const weekday = new Date(`${dateKey}T12:00:00`).getDay();
                const isOff = offInfo.offWeekdays.includes(weekday) || offInfo.offDates.includes(dateKey);
                return { dateKey, weekday, isOff, label: format(new Date(`${dateKey}T00:00:00`), 'EEEE, MMM d') };
            });
            // Never return an empty message — if every day were off, offer the days anyway.
            const someDayOpen = windowDays.some(d => !d.isOff);

            for (let d = 0; d < dayCount; d++) {
                const dateKey = format(addDays(new Date(`${selectedDate}T00:00:00`), d), 'yyyy-MM-dd');
                if (m === 'week' && windowDays[d].isOff && someDayOpen) {
                    skipped.push(windowDays[d].label);
                    continue;
                }
                const dayStart = new Date(`${dateKey}T00:00:00${tutorOffset}`).getTime();
                const dayEnd = dayStart + 24 * 60 * 60 * 1000;

                const bookedSlots = events
                    .filter(e => e.time && !e.id.startsWith('holiday-') && !e.id.startsWith('bday-'))
                    .map(e => {
                        const start = new Date(`${e.date}T${e.time}:00Z`).getTime();
                        const end = start + 60 * 60 * 1000;
                        return { start, end };
                    })
                    .filter(slot => slot.start < dayEnd && slot.end > dayStart);

                for (let h = 0; h < 24; h++) {
                    const slotStart = dayStart + h * 60 * 60 * 1000;
                    const slotEnd = slotStart + 60 * 60 * 1000;
                    if (slotEnd > dayEnd) break;

                    const isBooked = bookedSlots.some(b => slotStart < b.end && slotEnd > b.start);
                    if (isBooked) continue;

                    entries.push({
                        dateKey,
                        dayLabel: format(new Date(`${dateKey}T00:00:00`), 'EEEE, MMM d'),
                        learnerTime: new Date(slotStart).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }),
                        tutorTime: new Date(slotStart).toLocaleTimeString('en-US', { timeZone: calendarTimezone, hour: 'numeric', minute: '2-digit', hour12: true }),
                        tutorTime24: `${String(h).padStart(2, '0')}:00`,
                    });
                }
            }

            setSlots(entries);
            setSkippedDays(skipped);
        } catch (error) {
            console.error('Error calculating availability:', error);
            setSlots([]);
            setSkippedDays([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!learnerTz) {
            setSlots([]);
            setSkippedDays([]);
            return;
        }
        computePlan(learnerTz, mode);
        setManualTime('');
        setCopied(false);
    }, [selectedDate, learnerTz, events, calendarTimezone, mode, offInfo]);

    // Keep the parent (day popup) in sync with the current numbered slot plan,
    // so a learner's reply can be resolved to a concrete date + time for booking.
    const handlePlanChange = useCallback((plan: SlotPlanEntry[]) => onPlanChange?.(plan), [onPlanChange]);
    useEffect(() => {
        handlePlanChange(slots.map((s, i) => ({ ...s, number: i + 1 })));
    }, [slots, handlePlanChange]);

    const bookedEventsForDay = useMemo(() => {
        const dayStart = new Date(`${selectedDate}T00:00:00${tutorOffset}`).getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        return events
            .filter(e => e.learnerId === learner.id && e.time && !e.id.startsWith('holiday-') && !e.id.startsWith('bday-'))
            .filter(e => {
                const start = new Date(`${e.date}T${e.time}:00Z`).getTime();
                return start >= dayStart && start < dayEnd;
            })
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }, [learner.id, selectedDate, tutorOffset, events]);

    const weekStartLabel = slots.length > 0 ? format(new Date(`${slots[0].dateKey}T00:00:00`), 'EEE, MMM d') : '';
    const weekEndLabel = slots.length > 0 ? format(new Date(`${slots[slots.length - 1].dateKey}T00:00:00`), 'EEE, MMM d') : '';

    const days = useMemo(() => {
        const map = new Map<string, { dayLabel: string; items: { number: number; learnerTime: string }[] }>();
        slots.forEach((s, i) => {
            const entry = map.get(s.dateKey) || { dayLabel: s.dayLabel, items: [] };
            entry.items.push({ number: i + 1, learnerTime: s.learnerTime });
            map.set(s.dateKey, entry);
        });
        return [...map.values()];
    }, [slots]);

    const shownDayCount = Math.max(1, days.length);
    const selectedDayOff = (() => {
        const weekday = new Date(`${selectedDate}T12:00:00`).getDay();
        return offInfo.offWeekdays.includes(weekday) || offInfo.offDates.includes(selectedDate);
    })();

    const copyMessage = async () => {
        if (slots.length === 0) return;
        const lines: string[] = [];
        if (mode === 'day') {
            const dateLabel = slots[0].dayLabel;
            lines.push(
                `Hi ${learner.name}! 👋`,
                ``,
                `Here is a list of my available times for a 1-hour class on ${dateLabel}.`,
                `Please reply with the number that works best for you!`,
                ``,
            );
            slots.forEach((s, i) => lines.push(`${i + 1}) ${s.learnerTime}`));
        } else {
            lines.push(
                `Hi ${learner.name}! 👋`,
                ``,
                `Here are my available times for 1-hour classes this week (${weekStartLabel} – ${weekEndLabel}):`,
                `Reply with the number(s) that work for you and I'll book them right away!`,
                ``,
            );
            let lastDay = '';
            slots.forEach((s, i) => {
                if (s.dayLabel !== lastDay) {
                    lines.push(``, `📅 ${s.dayLabel}`);
                    lastDay = s.dayLabel;
                }
                lines.push(`${i + 1}) ${s.learnerTime}`);
            });
        }
        lines.push(``, `If none of these work, tell me which day and time suits you better. 😊`);
        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch {
            alert('Could not copy — clipboard access blocked.');
        }
    };

    const handleAddManualTime = () => {
        if (!manualTime || !learnerTz) return;
        try {
            const [mh, mm] = manualTime.split(':').map(Number);
            if (isNaN(mh) || mm !== 0) {
                alert('Please pick a full hour (e.g. 14:00).');
                return;
            }
            const dateKey = mode === 'week' && slots.length > 0
                ? slots[slots.length - 1].dateKey
                : format(addDays(new Date(`${selectedDate}T00:00:00`), 0), 'yyyy-MM-dd');
            if (mode === 'day' && slots.some(s => s.tutorTime24 === `${String(mh).padStart(2, '0')}:00`)) {
                alert('This time slot is already in the list.');
                return;
            }
            const epoch = slotStartMs(dateKey, mh);
            const newEntry: Omit<SlotPlanEntry, 'number'> = {
                dateKey,
                dayLabel: format(new Date(`${dateKey}T00:00:00`), 'EEEE, MMM d'),
                learnerTime: new Date(epoch).toLocaleTimeString('en-US', { timeZone: learnerTz, hour: 'numeric', minute: '2-digit', hour12: true }),
                tutorTime: new Date(epoch).toLocaleTimeString('en-US', { timeZone: calendarTimezone, hour: 'numeric', minute: '2-digit', hour12: true }),
                tutorTime24: `${String(mh).padStart(2, '0')}:00`,
            };
            const updated = [...slots, newEntry].sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.tutorTime24.localeCompare(b.tutorTime24));
            setSlots(updated);
            setManualTime('');
        } catch (error) {
            console.error('Error adding manual time:', error);
        }
    };

    const handleScreenshot = async () => {
        if (!contentRef.current) return;
        setIsScreenshotting(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
            const [blob, dataUrl] = await Promise.all([
                toBlob(contentRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true }),
                toPng(contentRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true }),
            ]);
            if (blob) {
                try {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                } catch { /* clipboard unsupported */ }
            }
            if (dataUrl) {
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `availability-${learner.name}-${mode}-${selectedDate}.png`;
                link.click();
            }
            alert('Screenshot copied to clipboard and saved!');
        } catch (error) {
            console.error('Error creating screenshot:', error);
            alert('Failed to create screenshot. It may have been saved without being copied.');
        } finally {
            setIsScreenshotting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Mode: single day vs whole week */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-1 w-fit">
                <button
                    type="button"
                    onClick={() => setMode('day')}
                    className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${mode === 'day' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    📅 This Day
                </button>
                <button
                    type="button"
                    onClick={() => setMode('week')}
                    className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${mode === 'week' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    🗓️ Share My Whole Week
                </button>
            </div>

            {/* Timezone picker — only when the learner has none set yet */}
            {!learner.timezone && (
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                        🌍 Set {learner.name}'s timezone (used for all times below)
                    </label>
                    <select
                        value={learnerTz}
                        onChange={(e) => handlePickTimezone(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="" disabled>Select their timezone...</option>
                        {COMMON_TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ').replace('America/', '')}</option>)}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1.5">Once set, it is saved to their profile and reused everywhere.</p>
                </div>
            )}

            {/* Ready-to-send availability card (what the learner sees) */}
            <div ref={contentRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 px-4 py-3 text-white flex items-center justify-between gap-2">
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-wider text-blue-100">{mode === 'day' ? 'My availability' : 'My availability this week'}</div>
                        <div className="font-black text-sm">
                            {mode === 'day'
                                ? `1-hour class on ${slots[0]?.dayLabel || format(new Date(`${selectedDate}T00:00:00`), 'EEEE, MMMM do')}`
                                : `${weekStartLabel || format(new Date(`${selectedDate}T00:00:00`), 'EEE, MMM d')} – ${weekEndLabel || ''} · ${shownDayCount} free day${shownDayCount === 1 ? '' : 's'}`}
                        </div>
                    </div>
                    <span className="text-[10px] font-black bg-white/15 px-2.5 py-1 rounded-full">{learnerTz ? 'in their local time' : 'timezone not set'}</span>
                </div>
                <div className="p-4">
                    {mode === 'week' && skippedDays.length > 0 && (
                        <div className="mb-3 flex items-start gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
                            <span className="text-[12px]">🚫</span>
                            <p className="text-[10px] font-bold text-rose-600 dark:text-rose-300 leading-relaxed">
                                Skipping {learner.name}'s unavailable days (from their reply): <strong>{skippedDays.join(', ')}</strong>
                            </p>
                        </div>
                    )}
                    {mode === 'day' && selectedDayOff && (
                        <div className="mb-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                            <span className="text-[12px]">⚠️</span>
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 leading-relaxed">
                                Their reply lists this day as unavailable for {learner.name} — showing slots anyway in case plans changed.
                            </p>
                        </div>
                    )}
                    {!learnerTz ? (
                        <p className="text-[11px] font-semibold text-slate-500">Pick {learner.name}'s timezone above to see their local times.</p>
                    ) : isLoading ? (
                        <p className="text-center p-6 text-xs font-bold text-slate-400">Calculating...</p>
                    ) : slots.length > 0 ? (
                        mode === 'day' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                                {slots.map((slot, index) => {
                                    const style = getSlotStyle(slot.learnerTime);
                                    return (
                                        <div
                                            key={slot.dateKey + slot.tutorTime24}
                                            className={`group relative flex items-center gap-2.5 p-3 border rounded-xl transition-all cursor-default hover:shadow-md ${style.cls}`}
                                            onMouseEnter={(e) => setTooltip({ content: `${slot.tutorTime} — your time`, x: e.clientX, y: e.clientY })}
                                            onMouseLeave={() => setTooltip(null)}
                                        >
                                            <span className="flex-shrink-0 font-black text-sm h-7 w-7 flex items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm">{index + 1}</span>
                                            <div>
                                                <div className="font-extrabold text-[13px] leading-none">{style.emoji} {slot.learnerTime}</div>
                                                <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">{style.label}</div>
                                            </div>
                                            <button
                                                onClick={() => setSlots(slots.filter((_, i) => i !== index))}
                                                className="absolute top-1 right-1 text-slate-400 hover:text-rose-600 font-black opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                aria-label="Remove slot"
                                            >&times;</button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {days.map(dayGroup => (
                                    <div key={dayGroup.dayLabel}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide">📅 {dayGroup.dayLabel}</span>
                                            <span className="text-[9px] font-bold text-slate-400">{dayGroup.items.length} free</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {dayGroup.items.map(item => {
                                                const style = getSlotStyle(item.learnerTime);
                                                return (
                                                    <div
                                                        key={item.number}
                                                        className={`flex items-center gap-2 p-2 border rounded-lg transition-all cursor-default hover:shadow-md ${style.cls}`}
                                                        onMouseEnter={(e) => setTooltip({ content: `#${item.number} — your time?`, x: e.clientX, y: e.clientY })}
                                                        onMouseLeave={() => setTooltip(null)}
                                                    >
                                                        <span className="flex-shrink-0 font-black text-[11px] h-5 w-5 flex items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm">{item.number}</span>
                                                        <span className="font-extrabold text-[11px] leading-none">{style.emoji} {item.learnerTime}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <p className="col-span-full text-center text-xs font-bold text-slate-400 p-6">No free slots {mode === 'day' ? 'that day' : 'this week'}.</p>
                    )}

                    {bookedEventsForDay.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black text-purple-700 dark:text-purple-300">You already have a class booked on this day:</p>
                            <ul className="mt-1 space-y-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                                {bookedEventsForDay.map(event => {
                                    const learnerTime = learnerTz
                                        ? new Date(`${event.date}T${event.time}:00Z`).toLocaleTimeString('en-US', { timeZone: learnerTz, hour: 'numeric', minute: '2-digit', hour12: true })
                                        : event.time;
                                    return <li key={event.id}>• <strong>{learnerTime}</strong> — {event.title}</li>;
                                })}
                            </ul>
                        </div>
                    )}

                    {/* Manual slot (tutor's own time — visible to the tutor only) */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <label htmlFor="manual-time" className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Add a specific time (your side of the clock)</label>
                        <div className="flex gap-2">
                            <input
                                type="time"
                                id="manual-time"
                                value={manualTime}
                                onChange={e => setManualTime(e.target.value)}
                                className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                            />
                            <button type="button" onClick={handleAddManualTime} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-3.5 py-2 rounded-xl transition-colors cursor-pointer">Add Time</button>
                            <button type="button" onClick={() => setSlots([])} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-black text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer">Clear</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copyMessage} disabled={slots.length === 0} className="flex-1 min-w-[160px] bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-40">
                    {copied ? '✅ Copied — paste & send to your learner!' : mode === 'day' ? '📋 Copy Availability Message' : '🗓️ Copy Whole-Week Message'}
                </button>
                <button type="button" onClick={handleScreenshot} disabled={isScreenshotting} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs px-4 py-2.5 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50">
                    {isScreenshotting ? '⏳...' : '📸 Screenshot'}
                </button>
            </div>

            {tooltip && !isScreenshotting && (
                <div
                    className="fixed z-50 px-2.5 py-1.5 text-[10px] font-black text-white bg-slate-900 rounded-lg shadow-xl pointer-events-none"
                    style={{ top: `${tooltip.y + 15}px`, left: `${tooltip.x}px`, transform: 'translateX(-50%)' }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};

export default AvailabilityView;