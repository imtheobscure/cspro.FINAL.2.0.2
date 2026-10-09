import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CalendarEvent, SyncedCalendar, Learner } from '../types2';
import { holidaysByCountry, getHolidaysForYear } from '../data/holidays';
import { useLearnerStore } from './useLearnerStore';
import { useAppStore } from './useAppStore';
import { idbZustandStorage } from '../utils/storageAdapter';

// Helper to parse ICS date format (YYYYMMDD or YYYYMMDDTHHMMSSZ) into YYYY-MM-DD
const parseIcsDate = (dateStr: string): string => {
    // Handle cases where the date string might already be in YYYY-MM-DD format
    if (dateStr.includes('-')) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
};

const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/;

// This helper converts a time from Tehran time to a UTC HH:mm string for storage.
const convertTehranTimeToUTC = (date: string, time: string): string => {
  if (!time || !date) return time;
  try {
    // Construct a date assuming the time is in Tehran timezone
    const tehranDate = new Date(`${date}T${time}:00+03:30`);
    if (isNaN(tehranDate.getTime())) return time; // Return original on parse error

    // Get UTC hours and minutes
    const hours = tehranDate.getUTCHours().toString().padStart(2, '0');
    const minutes = tehranDate.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    console.error("Failed to convert time to UTC:", e);
    return time; // Return original on any error
  }
};

export const getTimezoneOffsetForDate = (dateStr: string, timeZone: string): number => {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            timeZoneName: 'longOffset'
        });
        const parts = formatter.formatToParts(new Date(`${dateStr}T12:00:00Z`));
        const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || '';
        
        if (!offsetPart || offsetPart === 'GMT' || offsetPart === 'UTC') return 0;
        const match = offsetPart.match(/GMT([-+])(\d{1,2}):?(\d{2})?/);
        if (match) {
            const sign = match[1] === '-' ? -1 : 1;
            const hours = parseInt(match[2], 10);
            const minutes = match[3] ? parseInt(match[3], 10) : 0;
            return sign * (hours * 60 + minutes);
        }
        return 0;
    } catch (e) {
        if (timeZone === 'Asia/Tehran') return 210; // Fallback +03:30
        return 0;
    }
};

export const convertLocalTimeToUTC = (dateStr: string, localTime: string, timeZone: string): string => {
    if (!localTime || !dateStr) return localTime;
    try {
        const offsetMinutes = getTimezoneOffsetForDate(dateStr, timeZone);
        const [localHrs, localMins] = localTime.split(':').map(Number);
        
        // Base UTC time
        const utcDate = new Date(`${dateStr}T00:00:00Z`);
        const utcMs = utcDate.getTime() + (localHrs * 60 + localMins - offsetMinutes) * 60000;
        const finalDate = new Date(utcMs);
        
        const hours = finalDate.getUTCHours().toString().padStart(2, '0');
        const minutes = finalDate.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (e) {
        console.error("Failed to convert local time to UTC:", e);
        return localTime;
    }
};

export const convertUtcToLocalTime = (dateStr: string, utcTime: string, timeZone: string): string => {
    if (!utcTime || !dateStr) return utcTime;
    try {
        const offsetMinutes = getTimezoneOffsetForDate(dateStr, timeZone);
        const [utcHrs, utcMins] = utcTime.split(':').map(Number);
        
        const utcDate = new Date(`${dateStr}T00:00:00Z`);
        const localMs = utcDate.getTime() + (utcHrs * 60 + utcMins + offsetMinutes) * 60000;
        const finalDate = new Date(localMs);
        
        const hours = finalDate.getUTCHours().toString().padStart(2, '0');
        const minutes = finalDate.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (e) {
        console.error("Failed to convert UTC to local time:", e);
        return utcTime;
    }
};

const parseIcsText = (icsText: string, calendar: SyncedCalendar, learners: Learner[], calendarTimezone: string = 'Asia/Tehran'): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const unfoldedText = icsText.replace(/\r?\n[ \t]/g, '');
    const eventBlocks = unfoldedText.match(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g) || [];

    for (const block of eventBlocks) {
        const summaryMatch = block.match(/SUMMARY:(.*)/);
        const dtstartMatch = block.match(/DTSTART(?:;TZID=.*?)?(?:;VALUE=DATE)?:(.*)/);
        const dtendMatch = block.match(/DTEND(?:;TZID=.*?)?(?:;VALUE=DATE)?:(.*)/);
        const descriptionMatch = block.match(/DESCRIPTION:((?:.|\n)*?)(?:\n[A-Z\-]+:|$)/);
        const uidMatch = block.match(/UID:(.*)/);

        if (!summaryMatch || !dtstartMatch) continue;

        let title = summaryMatch[1].replace(/\\,/g, ',').replace(/\\n/g, '\n').trim();
        const startDateStr = dtstartMatch[1].trim();
        const endDateStr = dtendMatch ? dtendMatch[1].trim() : startDateStr;
        const eventId = uidMatch ? uidMatch[1].trim() : `v-${startDateStr}-${title.replace(/\s+/g, '')}`;

        const hasTime = startDateStr.includes('T');
        const datePart = hasTime ? startDateStr.split('T')[0] : startDateStr;
        
        const startDate = parseIcsDate(datePart);
        let finalUtcTime: string | undefined = undefined;

        if(hasTime) {
            const timePartRaw = startDateStr.split('T')[1];
            const isUtc = timePartRaw.endsWith('Z');
            const timeDigits = timePartRaw.substring(0, 6); // HHMMSS
            const localTime = `${timeDigits.substring(0, 2)}:${timeDigits.substring(2, 4)}`;

            if (isUtc) {
                // Time from calendar is already in UTC
                finalUtcTime = localTime;
            } else {
                // It's a "floating" time. Assume it's in the user's primary timezone (calendarTimezone) and convert to UTC for consistent storage.
                finalUtcTime = convertLocalTimeToUTC(startDate, localTime, calendarTimezone);
            }
        }
        
        const isAllDay = !hasTime;
        let endDate = parseIcsDate(endDateStr.split('T')[0]);

        if(isAllDay) {
            const tempDate = new Date(`${endDate}T00:00:00`);
            tempDate.setDate(tempDate.getDate() - 1);
            endDate = tempDate.toISOString().split('T')[0];
        }
        
        const emojiMatch = title.match(emojiRegex);
        const emoji = emojiMatch ? emojiMatch[0] : undefined;
        if (emoji) {
            title = title.replace(emoji, '').trim();
        }

        const associatedLearner = learners.find(l => 
            title.toLowerCase().includes(l.name.toLowerCase()) || 
            (l.registeredName && title.toLowerCase().includes(l.registeredName.toLowerCase()))
        );

        events.push({
            id: eventId,
            title: title,
            date: startDate,
            endDate: (endDate !== startDate) ? endDate : undefined,
            time: finalUtcTime,
            color: calendar.color,
            emoji: emoji,
            description: descriptionMatch ? descriptionMatch[1].replace(/\\,/g, ',').replace(/\\n/g, '\n').trim() : undefined,
            learnerId: associatedLearner?.id,
            sourceCalendarId: calendar.id,
        });
    }
    return events;
};

const initializeGlobalHolidays = (): CalendarEvent[] => {
    const allHolidayEvents: CalendarEvent[] = [];
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1];
    const countries = Object.keys(holidaysByCountry);

    for (const country of countries) {
        for (const year of years) {
            const holidays = getHolidaysForYear(country, year);
            for (const holiday of holidays) {
                // Assign a consistent pink color and link to the global calendar
                allHolidayEvents.push({
                    ...holiday,
                    color: '#ec4899', // pink
                    sourceCalendarId: 'cal_global_holidays'
                });
            }
        }
    }
    // De-duplicate in case of overlapping definitions
    return Array.from(new Map(allHolidayEvents.map(e => [e.id, e])).values());
};


interface CalendarState {
    calendarEvents: CalendarEvent[];
    syncedCalendars: SyncedCalendar[];
    hiddenEventIds: string[];
    calendarTimezone?: string;
    setCalendarTimezone?: (tz: string) => void;
    addCalendarEvent: (event: Omit<CalendarEvent, 'id'> & { id?: string }) => void;
    updateCalendarEvent: (event: CalendarEvent) => void;
    removeCalendarEvent: (eventId: string) => void;
    hideEvent: (eventId: string) => void;
    addSyncedCalendar: (calendar: Omit<SyncedCalendar, 'id'>) => void;
    updateSyncedCalendar: (calendar: SyncedCalendar) => void;
    removeSyncedCalendar: (calendarId: string) => void;
    syncAllCalendars: () => Promise<void>;
}

export const useCalendarStore = create<CalendarState>()(
    persist(
        (set, get) => ({
            calendarEvents: initializeGlobalHolidays(),
            syncedCalendars: [{
                id: 'cal_global_holidays',
                name: 'Global Holidays & Events',
                url: 'internal_holiday_calendar',
                color: '#ec4899', // pink
                isEnabled: true,
            }],
            hiddenEventIds: [],
            calendarTimezone: 'Asia/Tehran',
            setCalendarTimezone: (tz) => set({ calendarTimezone: tz }),

            addCalendarEvent: (event) => set(state => {
                const eventToSave = { ...event, id: event.id || `e${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
                if (eventToSave.time) {
                    eventToSave.time = convertLocalTimeToUTC(eventToSave.date, eventToSave.time, state.calendarTimezone || 'Asia/Tehran');
                }
                return {
                    calendarEvents: [...state.calendarEvents, eventToSave]
                };
            }),
            
            updateCalendarEvent: (updatedEvent) => set(state => {
                // First, find the original event to check for changes
                const originalEvent = state.calendarEvents.find(e => e.id === updatedEvent.id);
                let eventToUpdate = { ...updatedEvent };
            
                // Only convert time to UTC if the time value actually changed (it comes from the form as local time)
                if (eventToUpdate.time && (!originalEvent || eventToUpdate.time !== originalEvent.time)) {
                    eventToUpdate.time = convertLocalTimeToUTC(eventToUpdate.date, eventToUpdate.time, state.calendarTimezone || 'Asia/Tehran');
                }
                
                // Create the updated list with the single event change
                let updatedEvents = state.calendarEvents.map(e => (e.id === eventToUpdate.id ? eventToUpdate : e));
            
                // Now handle the bulk-assign side-effect
                const isAssigningLearnerToSyncedEvent = updatedEvent.learnerId && originalEvent && !originalEvent.learnerId && originalEvent.sourceCalendarId;
            
                if (isAssigningLearnerToSyncedEvent) {
                    const targetTitle = originalEvent.title;
                    const sourceCalendarId = originalEvent.sourceCalendarId;
                    const newLearnerId = updatedEvent.learnerId;
            
                    if (targetTitle && targetTitle.toLowerCase() !== 'busy') {
                        updatedEvents = updatedEvents.map(event => {
                            if (!event.learnerId && event.sourceCalendarId === sourceCalendarId && event.title === targetTitle) {
                                return { ...event, learnerId: newLearnerId };
                            }
                            return event;
                        });
                    }
                }
            
                return { calendarEvents: updatedEvents };
            }),
            
            removeCalendarEvent: (eventId) => set(state => ({ calendarEvents: state.calendarEvents.filter(e => e.id !== eventId) })),

            hideEvent: (eventId) => set(state => ({ hiddenEventIds: [...new Set([...state.hiddenEventIds, eventId])] })),
            
            addSyncedCalendar: (calendar) => {
                const newCalendar = { ...calendar, id: `sc${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
                set(state => ({ syncedCalendars: [...state.syncedCalendars, newCalendar] }));
            },
            
            updateSyncedCalendar: (updatedCal) => {
                set(state => ({
                    syncedCalendars: state.syncedCalendars.map(c => c.id === updatedCal.id ? updatedCal : c)
                }));
            },

            removeSyncedCalendar: (calendarId) => set(state => ({
                syncedCalendars: state.syncedCalendars.filter(c => c.id !== calendarId),
                calendarEvents: state.calendarEvents.filter(e => e.sourceCalendarId !== calendarId)
            })),

            syncAllCalendars: async () => {
                const { learners } = useLearnerStore.getState();
                const { setLoading, logError } = useAppStore.getState();
                const { syncedCalendars, calendarEvents } = get();

                setLoading(true);
                let newEventsCount = 0;
                const errors: string[] = [];

                const nonSyncedEvents = calendarEvents.filter(e => !e.sourceCalendarId);
                let allNewSyncedEvents: CalendarEvent[] = [];

                for (const calendar of syncedCalendars) {
                    if (!calendar.isEnabled || !calendar.url || calendar.url.startsWith('internal_')) continue;

                    try {
                    const proxyUrls = [
                        `/api/proxy/calendar?url=${encodeURIComponent(calendar.url)}`,
                        `https://api.allorigins.win/raw?url=${encodeURIComponent(calendar.url)}`,
                        `https://corsproxy.io/?url=${encodeURIComponent(calendar.url)}`,
                        `https://api.allorigins.io/raw?url=${encodeURIComponent(calendar.url)}`,
                        `https://corsproxy.org/?${encodeURIComponent(calendar.url)}`,
                    ];

                    let response = null;
                    for (const proxyUrl of proxyUrls) {
                        try {
                            response = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
                            if (response.ok) break;
                        } catch (e) {
                            // Proxy failed, try next
                        }
                        response = null;
                    }

                    if (!response || !response.ok) {
                        // Last resort: try direct fetch (may fail due to CORS but worth a shot)
                        try {
                            response = await fetch(calendar.url, { signal: AbortSignal.timeout(8000) });
                        } catch (e) {
                            // Direct fetch failed
                        }
                    }

                    if (!response || !response.ok) {
                        throw new Error(`Failed to fetch calendar '${calendar.name}'. Status: ${response?.status || 'network error'}`);
                    }
                    const icsText = await response.text();
                    const newEvents = parseIcsText(icsText, calendar, learners, get().calendarTimezone || 'Asia/Tehran');
                    allNewSyncedEvents.push(...newEvents);

                    set(state => ({
                        syncedCalendars: state.syncedCalendars.map(c =>
                            c.id === calendar.id ? { ...c, lastSynced: new Date().toISOString() } : c
                        )
                    }));
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        logError(`Error syncing calendar ${calendar.name}`, errorMessage);
                        errors.push(`Could not sync '${calendar.name}'. Check URL and sharing settings.`);
                    }
                }
                
                const oldEventsMap = new Map<string, CalendarEvent>(calendarEvents.map(e => [e.id, e]));
                
                const preservedSyncedEvents = allNewSyncedEvents.map(newEvent => {
                    const oldEvent = oldEventsMap.get(newEvent.id);
                    if (oldEvent && oldEvent.learnerId && !newEvent.learnerId) {
                        return { ...newEvent, learnerId: oldEvent.learnerId };
                    }
                    return newEvent;
                });

                const oldEventIds = new Set(calendarEvents.map(e => e.id));
                const trulyNewEvents = preservedSyncedEvents.filter(e => !oldEventIds.has(e.id));
                newEventsCount = trulyNewEvents.length;

                set({
                    calendarEvents: [...nonSyncedEvents, ...preservedSyncedEvents]
                });

                setLoading(false);

                let alertMessage = `Sync complete! Found ${allNewSyncedEvents.length} total events. Added ${newEventsCount} new events.`;
                if (errors.length > 0) {
                    alertMessage += `\n\nErrors:\n- ${errors.join('\n- ')}`;
                }
                alert(alertMessage);
            },
        }),
        {
            name: 'calendar-storage',
            storage: createJSONStorage(() => idbZustandStorage),
            partialize: (state) => ({
                calendarEvents: (state.calendarEvents || []).filter(e => e.sourceCalendarId !== 'cal_global_holidays'),
                syncedCalendars: state.syncedCalendars,
                hiddenEventIds: state.hiddenEventIds,
                calendarTimezone: state.calendarTimezone,
            }),
            merge: (persistedState: any, currentState: CalendarState) => {
                const persistedEvents = (persistedState?.calendarEvents || []).filter((e: any) => e.sourceCalendarId !== 'cal_global_holidays');
                const globalHolidays = initializeGlobalHolidays();
                const combined = [...globalHolidays, ...persistedEvents];
                const deduplicated = Array.from(new Map(combined.map(e => [e.id, e])).values());
                return {
                    ...currentState,
                    ...(persistedState || {}),
                    calendarEvents: deduplicated,
                };
            }
        }
    )
);
