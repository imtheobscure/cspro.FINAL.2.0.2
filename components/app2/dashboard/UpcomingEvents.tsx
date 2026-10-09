import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useLearnerStore } from '../../../store/useLearnerStore';
import { useCalendarStore } from '../../../store/useCalendarStore';
import { useTodoStore } from '../../../store/useTodoStore';
import { isFuture, isToday, compareAsc, format, addDays } from 'date-fns';
import { getAvatarUrl } from '../../../services/avatarService';
import SectionCard from '../SectionCard';
import { Link } from 'react-router-dom';
import { CalendarEvent, Learner } from '../../../types2';
import EventModal from '../EventModal';
import { generateBatchEventGreetings } from '../../../services/geminiService2';
import { useAppStore } from '../../../store/useAppStore';

const Countdown: React.FC<{ targetDate: Date; isPast: boolean; isHappeningNow: boolean; getNow: () => Date; }> = ({ targetDate, isPast, isHappeningNow, getNow }) => {
    const [text, setText] = useState('');
    const [color, setColor] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    const [hasPlayedAlarm, setHasPlayedAlarm] = useState(false);

    const calculateTimeLeft = useCallback(() => {
        if (isPast) {
            setText('Finished');
            setColor('text-gray-400 font-bold');
            setIsUrgent(false);
            return;
        }
        if (isHappeningNow) {
            setText('Happening now');
            setColor('text-red-600 font-black animate-pulse uppercase tracking-wider');
            setIsUrgent(false);
            return;
        }

        const now = getNow();
        const difference = targetDate.getTime() - now.getTime();
        
        if (difference <= 0) {
            setText('');
            return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);

        if (days > 0) {
            setText(`in ${days}d ${hours}h`);
            setColor('text-gray-500 font-bold');
            setIsUrgent(false);
        } else if (hours > 0) {
             setText(`in ${hours}h ${minutes}m`);
             setColor('text-orange-600 font-bold');
             setIsUrgent(false);
        } else if (minutes > 0) {
            if (minutes <= 19) {
                // Alarm trigger exactly at 10m
                if (minutes === 10 && !hasPlayedAlarm) {
                    setHasPlayedAlarm(true);
                    try {
                        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                        if (AudioContextClass) {
                            const ctx = new AudioContextClass();
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 chime
                            gain.gain.setValueAtTime(0, ctx.currentTime);
                            gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
                            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
                            
                            osc.start(ctx.currentTime);
                            osc.stop(ctx.currentTime + 0.8);
                        }
                    } catch (e) {
                        console.error("Synthesizer sound blocked/failed:", e);
                    }
                }
                
                setIsUrgent(true);
                setText(`Starts in ${minutes}m`);
                if (minutes <= 10) {
                    setColor('bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold border-red-700 shadow-md ring-2 ring-red-300 ring-offset-1 text-xs');
                } else {
                    setColor('bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold border-red-600 shadow-sm text-[10px]');
                }
            } else {
                setText(`in ${minutes}m`);
                setColor('text-orange-600 font-bold');
                setIsUrgent(false);
            }
        } else {
            setText('Starting soon');
            setColor('text-red-500 font-black uppercase tracking-wider');
            setIsUrgent(false);
        }
    }, [targetDate, isPast, isHappeningNow, getNow, hasPlayedAlarm]);

    useEffect(() => {
        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 10000); // Check more frequently (every 10s) for dynamic updates and accurate alarm
        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    if (!text) return null;

    if (isUrgent) {
        return (
            <span className={`inline-flex items-center justify-center px-2 py-1 rounded inline-block ${color} animate-pulse shadow-sm min-w-max ml-2`}>
                <i className="fas fa-bell text-white mr-1.5 opacity-90"></i> {text}
            </span>
        );
    }
    
    return <span className={`text-xs ml-2 ${color}`}>{text}</span>;
};


const UpcomingEvents: React.FC = () => {
    const learners = useLearnerStore(state => state.learners);
    const addChatMessageToLearner = useLearnerStore(state => state.addChatMessageToLearner);
    const calendarEvents = useCalendarStore(state => state.calendarEvents);
    const syncedCalendars = useCalendarStore(state => state.syncedCalendars);
    const calendarTimezone = useCalendarStore(state => state.calendarTimezone ?? 'Asia/Tehran');
    const hiddenEventIds = useCalendarStore(state => state.hiddenEventIds);
    const addCalendarEvent = useCalendarStore(state => state.addCalendarEvent);
    const updateCalendarEvent = useCalendarStore(state => state.updateCalendarEvent);
    const removeCalendarEvent = useCalendarStore(state => state.removeCalendarEvent);
    const hideEvent = useCalendarStore(state => state.hideEvent);
    const setLoading = useAppStore(state => state.setLoading);
    const todos = useTodoStore(state => state.todos);

    const [visibleCount, setVisibleCount] = useState(5);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEvent, setCurrentEvent] = useState<Partial<CalendarEvent> | null>(null);
    const [timeOverride, setTimeOverride] = useState('');
    const [showTimeOverride, setShowTimeOverride] = useState(false);

    const getNow = useCallback(() => {
        if (timeOverride) {
            const [hours, minutes] = timeOverride.split(':');
            const now = new Date();
            now.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            return now;
        }
        return new Date();
    }, [timeOverride]);

    const allUpcomingEvents = useMemo(() => {
        const now = getNow();
        const today = new Date(now.getTime());
        today.setHours(0, 0, 0, 0);
        
        const fourHoursAgo = new Date(now.getTime());
        fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);


        const birthdayEvents = learners
            .filter(l => l.birthday)
            .map(l => {
                const birthDate = new Date(`${l.birthday}T00:00:00`);
                let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                if (nextBirthday < today) {
                    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
                }
                return {
                    id: `bday-${l.id}-${nextBirthday.getFullYear()}`,
                    date: nextBirthday,
                    title: `${l.name}'s Birthday`,
                    displayTitle: `${l.name}'s Birthday`,
                    type: 'birthday' as const,
                    learnerId: l.id,
                    emoji: '🎂'
                };
            });

        const todoEvents = todos
            .filter(t => !t.completed && t.dueDate)
            .map(t => ({
                id: `todo-${t.id}`,
                date: new Date(`${t.dueDate}T00:00:00`),
                title: `To-do: ${t.text}`,
                displayTitle: `To-do: ${t.text}`,
                type: 'todo' as const,
                learnerId: t.learnerId,
                emoji: '📝',
                color: '#f59e0b',
                time: '12:00' // Default to noon if not timed
            }));

        const otherEvents = calendarEvents.map(e => {
            let learnerId = e.learnerId;
            let displayTitle = e.title;
            const isSynced = !!e.sourceCalendarId;

            if (!learnerId && isSynced) {
                const associatedLearner = learners.find(l => 
                    e.title.toLowerCase().includes(l.name.toLowerCase()) || 
                    (l.registeredName && e.title.toLowerCase().includes(l.registeredName.toLowerCase()))
                );
                if (associatedLearner) {
                    learnerId = associatedLearner.id;
                }
            }

            const assignedLearner = learnerId ? learners.find(l => l.id === learnerId) : null;
            const sourceCalendar = isSynced ? syncedCalendars.find(c => c.id === e.sourceCalendarId) : null;

            if (displayTitle.toLowerCase() === 'busy') {
                if (assignedLearner) {
                    displayTitle = `${assignedLearner.name} - Preply`;
                } else if (sourceCalendar && sourceCalendar.name) {
                    displayTitle = sourceCalendar.name;
                }
            } else if (assignedLearner && isSynced) {
                 if (displayTitle.toLowerCase().includes('preply') || displayTitle.toLowerCase().includes('lesson')) {
                     displayTitle = `${assignedLearner.name} - Preply`;
                 }
            }

            return {
                ...e,
                learnerId,
                displayTitle,
                date: new Date(`${e.date}T00:00:00`),
                type: isSynced ? 'synced' : 'event' as const,
            };
        });

        const allEvents = [...birthdayEvents, ...todoEvents, ...otherEvents];

        return allEvents
            .map(event => {
                const eventTime = 'time' in event && event.time ? event.time : undefined;
                const eventDateTime = eventTime
                    ? new Date(`${format(event.date, 'yyyy-MM-dd')}T${eventTime}:00Z`) // Create date object from UTC time
                    : new Date(`${format(event.date, 'yyyy-MM-dd')}T00:00:00Z`); // For all-day events
                
                return { ...event, dateTime: eventDateTime };
            })
            .filter(event => (event.dateTime >= fourHoursAgo) && !hiddenEventIds.includes(event.id))
            .sort((a, b) => compareAsc(a.dateTime, b.dateTime));
    }, [learners, calendarEvents, syncedCalendars, hiddenEventIds, todos, getNow]);

    const handleAddEvent = () => {
        setCurrentEvent({
            date: new Date().toISOString().split('T')[0],
            color: '#3b82f6',
            title: ''
        });
        setIsModalOpen(true);
    };

    const handleEditEvent = (event: any) => {
        setCurrentEvent({
            ...event,
            date: format(new Date(event.date), 'yyyy-MM-dd')
        });
        setIsModalOpen(true);
    };

    const handleDeleteEvent = (eventId: string) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            removeCalendarEvent(eventId);
        }
    };
    
    const handleSaveEvent = (eventData: CalendarEvent) => {
        if (eventData.id && !eventData.id.startsWith('bday-')) {
            updateCalendarEvent(eventData);
        } else {
            addCalendarEvent({
                title: eventData.title,
                date: eventData.date,
                time: eventData.time,
                color: eventData.color,
                learnerId: eventData.learnerId,
                emoji: eventData.emoji,
            });
        }
        setIsModalOpen(false);
        setCurrentEvent(null);
    };

    const handleAssignLearner = (eventId: string, learnerId: string) => {
        if (!learnerId) return; // Ignore placeholder selection
        
        // Find the original event from the store to avoid issues with memoized/transformed objects
        const originalEvent = calendarEvents.find(e => e.id === eventId);
        if (!originalEvent) return;

        updateCalendarEvent({ ...originalEvent, learnerId });
    };
    
    const handleGenerateGreetings = async () => {
        try {
            const now = new Date();
            const twoWeeksFromNow = addDays(now, 14);
            const promptData: string[] = [];

            learners.forEach((learner, index) => {
                const relevantEvents = allUpcomingEvents.filter(event => {
                    if (event.dateTime > twoWeeksFromNow) return false;
                    if (event.learnerId === learner.id) return true;
                    if (event.type === 'birthday' && event.learnerId === learner.id) return true;
                    if (event.id.startsWith('holiday-')) {
                        const parts = event.id.split('-');
                        if (parts.length >= 2) {
                            const eventCountryNormalized = parts[1].toLowerCase();
                            const learnerCountryNormalized = (learner.country || '').replace(/\s/g, '').toLowerCase();
                            return learnerCountryNormalized && eventCountryNormalized.includes(learnerCountryNormalized);
                        }
                    }
                    return false;
                });
                
                const eventDesc = relevantEvents.length > 0 
                    ? `${relevantEvents[0].displayTitle || relevantEvents[0].title} on ${format(relevantEvents[0].date, 'PPPP')}`
                    : 'No specific upcoming holiday in the next 14 days, but send a general warm check-in motivation greeting.';

                promptData.push(
                    `Student #${index + 1}: ${learner.name} (ID: ${learner.id})
   - Country: ${learner.country || 'N/A'}
   - Level: ${learner.level || 'N/A'}
   - Interests: ${learner.interests || 'N/A'}
   - Goals: ${(learner.goals || []).join(', ') || 'N/A'}
   - Learning Style: ${learner.learningStyle || 'N/A'}
   - Upcoming Holiday/Reminder: ${eventDesc}
   - Teacher Notes: ${learner.notes || 'N/A'}`
                );
            });

            if (promptData.length === 0) {
                alert("No active learners found to generate prompt for.");
                return;
            }

            const promptText = `You are an expert ESOL/language tutor. I want you to write highly personalized, warm, and detailed greetings for my learners based on their individual profiles and upcoming events/holidays.

TUTOR INSTRUCTIONS:
- Tailor each message specifically to the learner's goals, English level, interests, and their specific upcoming event/holiday/birthday (or a motivational check-in if there is no holiday).
- Keep the tone friendly, inspiring, and professional.
- For Beginner/Novice level students, keep sentences clear and vocabulary simple. For Advanced/Expert levels, use natural and sophisticated language.
- Format the output EXACTLY in the following block syntax for each learner so that I can copy each message easily:

=== GREETING FOR: [learnerId] ===
[Your detailed, warm personalized greeting here, structured in paragraphs, wishing them well and offering encouragement for their goals]
=== END GREETING ===

Here is the list of my learners and their details:

${promptData.join('\n\n')}

Write the personalized greetings now!`;

            await navigator.clipboard.writeText(promptText);
            alert("📋 Personalized Greetings Prompt Copied!\n\nWe have compiled profiles of your learners and their upcoming events into a custom AI prompt. It has been copied to your clipboard.\n\nYou can transition to ChatGPT, Claude, or Gemini, paste this prompt, and then easily paste the individual messages back to each learner's Feedback Chat section!");

        } catch (error) {
            console.error("Failed to copy greetings prompt", error);
            alert("Failed to copy prompt to clipboard. Please check browser permissions.");
        }
    };

    const visibleEvents = allUpcomingEvents.slice(0, visibleCount);
    
    const renderEventIcon = (event: any) => {
        const learner = event.learnerId ? learners.find(l => l.id === event.learnerId) : null;

        if (event.type === 'birthday' && learner) {
            return (
                <Link to={`/learner/${learner.id}`}>
                    <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} alt="avatar" className="w-10 h-10 rounded-full" />
                </Link>
            );
        }

        if (learner) {
             return (
                <Link to={`/learner/${learner.id}`} className={`w-10 h-10 rounded-full flex items-center justify-center relative`} style={{backgroundColor: event.color}}>
                    <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} alt="avatar" className="w-10 h-10 rounded-full" />
                    {event.type === 'synced' && <i className="fas fa-sync-alt text-white text-xs absolute bottom-0 right-0 bg-gray-600 rounded-full p-1"></i>}
                </Link>
            );
        }

        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center relative`} style={{backgroundColor: event.color}}>
                <span className="text-xl">{event.emoji || '📅'}</span>
                {event.type === 'synced' && <i className="fas fa-sync-alt text-white text-xs absolute bottom-0 right-0 bg-gray-600 rounded-full p-1"></i>}
            </div>
        )
    }

    return (
        <>
            <SectionCard title="Holidays and Events Reminder" icon={<span>🗓️</span>}>
                <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
                    <div className="flex gap-2">
                        <button onClick={handleAddEvent} className="bg-brand-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors shadow-sm text-sm">
                            + Add Event
                        </button>
                        <button onClick={handleGenerateGreetings} className="bg-brand-purple text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors shadow-sm text-sm flex items-center gap-2" title="Generate personalized messages for upcoming events">
                            <i className="fas fa-magic"></i> Send Greetings
                        </button>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowTimeOverride(prev => !prev)}
                            className="text-xs font-semibold text-gray-500 hover:text-brand-blue flex items-center gap-1 border px-2 py-1 rounded-md"
                            title="Manually set time to view event statuses"
                        >
                            <i className="fas fa-clock"></i>
                            Time Override
                            <i className={`fas fa-chevron-${showTimeOverride ? 'up' : 'down'} ml-1`}></i>
                        </button>
                        {showTimeOverride && (
                            <div className="absolute top-full right-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-10 w-48 animate-fade-in">
                                <label htmlFor="time-override" className="text-xs font-bold text-gray-600 block mb-1">Set a time for today</label>
                                <input
                                    type="time"
                                    id="time-override"
                                    value={timeOverride}
                                    onChange={(e) => setTimeOverride(e.target.value)}
                                    className="p-1 border rounded-lg bg-white w-full text-sm"
                                />
                            </div>
                        )}
                    </div>
                </div>
                {visibleEvents.length > 0 ? (
                    <div className="space-y-3">
                        {visibleEvents.map((event, idx) => {
                            const assignedLearner = event.learnerId ? learners.find(l => l.id === event.learnerId) : null;

                            const now = getNow();
                            const diff = event.dateTime.getTime() - now.getTime();
                            const isHappeningNow = diff <= 0 && diff > -3600000;
                            const isPast = diff < -3600000;
                            const isEventToday = format(event.date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
                            
                            let containerClass = 'group flex items-center gap-3 p-2 rounded-lg transition-colors ';
                            if (isPast) {
                                containerClass += 'bg-gray-100 opacity-60';
                            } else if (isHappeningNow) {
                                containerClass += 'bg-red-50';
                            } else if (isEventToday) {
                                containerClass += 'bg-yellow-50';
                            } else {
                                containerClass += 'bg-blue-50';
                            }

                            return (
                                <div key={`${event.id}-${idx}`} className={containerClass}>
                                    <div className="flex-shrink-0 text-center w-12">
                                        <p className="font-extrabold text-brand-blue text-lg">{format(event.date, 'd')}</p>
                                        <p className="text-xs font-bold text-gray-500 -mt-1">{format(event.date, 'MMM')}</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {renderEventIcon(event)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate" title={event.displayTitle || event.title}>
                                            {/* Fix: Check if 'time' property exists on event object before accessing it. */}
                                            {'time' in event && event.time && <span className="text-sm font-semibold text-gray-600 mr-2">{event.dateTime.toLocaleTimeString('en-GB', { timeZone: calendarTimezone, hour: '2-digit', minute: '2-digit' })}</span>}
                                            {event.displayTitle || event.title}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {assignedLearner ? (
                                                <p className="text-xs font-semibold text-brand-purple">{assignedLearner.name}</p>
                                            ) : (
                                                event.type === 'synced' && (
                                                    <select
                                                        value=""
                                                        onChange={(e) => handleAssignLearner(event.id, e.target.value)}
                                                        className="text-[9px] mt-0.5 p-[1px] border border-indigo-200 rounded text-indigo-700 bg-indigo-50 w-20 hover:bg-indigo-100 transition-colors focus:ring-1 focus:ring-indigo-300 outline-none"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="" disabled>Assign</option>
                                                        {learners.map((l, lIdx) => (
                                                            <option key={`${l.id}-${lIdx}`} value={l.id}>{l.name}</option>
                                                        ))}
                                                    </select>
                                                )
                                            )}
                                             {/* Fix: Check if 'time' property exists on event object before accessing it. */}
                                             {'time' in event && event.time && <Countdown targetDate={event.dateTime} isPast={isPast} isHappeningNow={isHappeningNow} getNow={getNow} />}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {event.type === 'event' && !isPast && (
                                            <>
                                                <button onClick={() => handleEditEvent(event)} className="p-2 text-gray-500 hover:text-brand-blue rounded-full hover:bg-blue-100" title="Edit Event"><i className="fas fa-pencil-alt text-xs"></i></button>
                                                <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-gray-500 hover:text-brand-red rounded-full hover:bg-red-100" title="Delete Event"><i className="fas fa-trash-alt text-xs"></i></button>
                                            </>
                                        )}
                                         <button onClick={() => hideEvent(event.id)} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-200" title="Hide Event">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-brand-gray-dark text-center p-4">No upcoming events.</p>
                )}
                {allUpcomingEvents.length > visibleCount && (
                    <button onClick={() => setVisibleCount(prev => prev + 5)} className="w-full mt-4 text-sm font-bold text-brand-blue hover:underline">
                        Show More
                    </button>
                )}
                 {visibleCount > 5 && (
                    <button onClick={() => setVisibleCount(5)} className="w-full mt-2 text-sm font-bold text-gray-600 hover:underline">
                        Show Less
                    </button>
                )}


            </SectionCard>
            <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveEvent} event={currentEvent} learners={learners} />
        </>
    );
};

export default UpcomingEvents;