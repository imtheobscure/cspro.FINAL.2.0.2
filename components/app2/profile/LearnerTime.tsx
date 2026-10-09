import React, { useState, useEffect } from 'react';
import { Learner } from '../../../types2';
import { useLearnerStore } from '../../../store/useLearnerStore';
import { useAppStore } from '../../../store/useAppStore';
import { getTimezoneForLocation } from '../../../services/geminiService2';
import { ICONS } from '../../../constants2';
import TimeInputModal from '../TimeInputModal';

interface LearnerTimeProps {
    learner: Learner;
}

const getTimezoneOffsetMinutes = (timeZone: string, date: Date = new Date()): number => {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            timeZoneName: 'longOffset'
        }).formatToParts(date);
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
        return 0;
    }
};

const LearnerTime: React.FC<LearnerTimeProps> = ({ learner }) => {
    const updateLearner = useLearnerStore(state => state.updateLearner);
    const tutorInfo = useAppStore(state => state.tutorInfo);
    const tutorTimezone = tutorInfo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tutorTimeOffsetMinutes = tutorInfo?.timeOffsetMinutes;

    const [time, setTime] = useState<string>('');
    const [emoji, setEmoji] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [tutorTime, setTutorTime] = useState<string>('');
    const [tutorHour, setTutorHour] = useState<number>(12);
    const [learnerHour, setLearnerHour] = useState<number>(12);

    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);

    // Calculate both offsets for timezone comparison
    const now = new Date();
    const tutorOffset = tutorTimeOffsetMinutes !== undefined
        ? tutorTimeOffsetMinutes
        : getTimezoneOffsetMinutes(tutorTimezone, now);

    const learnerOffset = learner.timeOffsetMinutes !== undefined
        ? learner.timeOffsetMinutes
        : (learner.timezone ? getTimezoneOffsetMinutes(learner.timezone, now) : undefined);

    const getDiffString = () => {
        if (learnerOffset === undefined) return null;
        const diff = learnerOffset - tutorOffset;
        if (diff === 0) return 'Same timezone as you';
        const hours = Math.abs(diff) / 60;
        const formattedHours = Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
        return diff > 0 ? `${formattedHours} ahead` : `${formattedHours} behind`;
    };

    const getTimeOfDayConfig = (hour: number) => {
        // Morning
        if (hour >= 6 && hour < 12) {
            return {
                bg: 'bg-amber-50/70 border-amber-200/60',
                text: 'text-amber-700',
                timeText: 'text-amber-600',
                labelColor: 'text-amber-500',
                transparentEmoji: '☀️'
            };
        } 
        // Afternoon
        else if (hour >= 12 && hour < 17) {
            return {
                bg: 'bg-sky-50/70 border-sky-200/60',
                text: 'text-sky-700',
                timeText: 'text-sky-600',
                labelColor: 'text-sky-500',
                transparentEmoji: '🌤️'
            };
        } 
        // Evening
        else if (hour >= 17 && hour < 21) {
            return {
                bg: 'bg-rose-50/70 border-rose-200/60',
                text: 'text-rose-700',
                timeText: 'text-rose-600',
                labelColor: 'text-rose-500',
                transparentEmoji: '🌆'
            };
        } 
        // Night
        else {
            return {
                bg: 'bg-slate-900 border-slate-950 text-white',
                text: 'text-slate-300',
                timeText: 'text-white',
                labelColor: 'text-slate-400',
                transparentEmoji: '🌙'
            };
        }
    };

    useEffect(() => {
        const update = () => {
            const date = new Date();
            
            // Calculate accurate Tutor Time based on tutorInfo in AppStore & track physical tutorHour
            let tHour = date.getHours();
            try {
                let timeString = '';
                if (tutorTimeOffsetMinutes !== undefined) {
                    const localNow = new Date(date.getTime() + tutorTimeOffsetMinutes * 60000);
                    tHour = localNow.getUTCHours();
                    timeString = localNow.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'UTC'
                    });
                } else {
                    timeString = date.toLocaleTimeString('en-US', {
                        timeZone: tutorTimezone,
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                    const hourStr = date.toLocaleTimeString('en-US', {
                        timeZone: tutorTimezone,
                        hour: '2-digit',
                        hour12: false
                    });
                    tHour = parseInt(hourStr, 10);
                }
                setTutorTime(timeString);
            } catch (error) {
                console.error(`Error formatting tutor time:`, error);
                setTutorTime('Time Error');
            }
            setTutorHour(tHour);

            // Calculate Learner Time and learnerHour
            let lHour = date.getHours();
            if (learner.timeOffsetMinutes !== undefined) {
                // Use manual offset (difference from UTC)
                const utcNow = date.getTime();
                const learnerDate = new Date(utcNow + learner.timeOffsetMinutes * 60000);
                lHour = learnerDate.getUTCHours();
                
                setTime(learnerDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' }));
                if (lHour >= 6 && lHour < 12) setEmoji('☀️');
                else if (lHour >= 12 && lHour < 17) setEmoji('🏙️');
                else if (lHour >= 17 && lHour < 21) setEmoji('🌆');
                else setEmoji('🌙');
            } else if (learner.timezone) {
                // Use IANA timezone
                try {
                    const localTime = date.toLocaleTimeString('en-US', {
                        timeZone: learner.timezone,
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                    const hourVal = parseInt(date.toLocaleTimeString('en-US', { timeZone: learner.timezone, hour: '2-digit', hour12: false }), 10);
                    lHour = hourVal;
                    
                    setTime(localTime);
                    if (lHour >= 6 && lHour < 12) setEmoji('☀️');
                    else if (lHour >= 12 && lHour < 17) setEmoji('🏙️');
                    else if (lHour >= 17 && lHour < 21) setEmoji('🌆');
                    else setEmoji('🌙');
                } catch (error) {
                    console.error("Invalid timezone:", learner.timezone, error);
                    setTime('Invalid TZ');
                    setEmoji('⚠️');
                }
            } else {
                setTime('N/A');
                setEmoji('❓');
            }
            setLearnerHour(lHour);
        };

        update();
        const intervalId = setInterval(update, 60000);

        return () => clearInterval(intervalId);
    }, [learner.timezone, learner.timeOffsetMinutes, tutorTimezone, tutorTimeOffsetMinutes]);

    const handleSetManualTime = () => {
        setIsTimeModalOpen(true);
    };

    const handleTimeSubmit = (hours: number, minutes: number) => {
        const utcNow = new Date();
        const tOffset = tutorTimeOffsetMinutes !== undefined
            ? tutorTimeOffsetMinutes
            : getTimezoneOffsetMinutes(tutorTimezone, utcNow);
        
        // Exact local time of Tutor right now
        const tutorNow = new Date(utcNow.getTime() + tOffset * 60000);
        const tutorHours = tutorNow.getUTCHours();
        const tutorMinutes = tutorNow.getUTCMinutes();
        
        // Compute relative offset in minutes from tutor's current local time
        let diffMinutes = (hours * 60 + minutes) - (tutorHours * 60 + tutorMinutes);
        if (diffMinutes > 12 * 60) diffMinutes -= 24 * 60;
        if (diffMinutes < -12 * 60) diffMinutes += 24 * 60;
        
        // Resulting learner timezone offset relative to UTC:
        let targetOffset = tOffset + diffMinutes;
        if (targetOffset > 14 * 60) targetOffset -= 24 * 60;
        if (targetOffset < -12 * 60) targetOffset += 24 * 60;

        updateLearner({ ...learner, timeOffsetMinutes: targetOffset, timezone: '' });
    };

    const handleRefreshTimezone = async () => {
        if (!learner.country) {
            alert("Please set the learner's Country in their profile to calculate the timezone.");
            return;
        }
        setIsLoading(true);
        try {
            const newTimezone = await getTimezoneForLocation(learner.country, learner.city);
            if (newTimezone) {
                updateLearner({ ...learner, timezone: newTimezone, timeOffsetMinutes: undefined });
            } else {
                alert(`Could not find a timezone for ${learner.city || ''}, ${learner.country}. Please check the spelling.`);
            }
        } catch (error) {
            console.error("Failed to fetch timezone", error);
            alert("An error occurred while fetching the timezone.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const diffText = getDiffString();
    const locationText = [learner.city, learner.country].filter(Boolean).join(', ');

    const tutorConfig = getTimeOfDayConfig(tutorHour);
    const learnerConfig = getTimeOfDayConfig(learnerHour);

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white border border-slate-200 hover:border-slate-350 text-slate-800 rounded-2xl p-4 shadow-sm max-w-md w-full font-sans transition-transform hover:scale-[1.01]">
            {/* Clocks Section */}
            <div className="flex flex-1 items-center justify-between gap-4">
                {/* Tutor Local Base Clock */}
                <div className={`flex flex-col flex-1 pl-3 py-3 pr-2 rounded-xl relative overflow-hidden border ${tutorConfig.bg}`}>
                    {/* Cool large transparent background emoji */}
                    <span className="absolute right-1 -bottom-2 text-5xl opacity-[0.14] pointer-events-none select-none transition-transform duration-500 transform scale-110">
                        {tutorConfig.transparentEmoji}
                    </span>
                    <div className={`flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider ${tutorConfig.labelColor} relative z-10`}>
                        <span>💻</span> Tutor Time
                    </div>
                    <div className={`text-xl font-black font-mono tracking-tight mt-1 relative z-10 ${tutorConfig.timeText}`}>
                        {tutorTime || '--:--'}
                    </div>
                </div>

                {/* Animated Bridge Line */}
                <div className="flex flex-col items-center justify-center min-w-[50px] relative z-10">
                    <div className="text-[10px] bg-slate-100 border border-slate-250 px-2 py-0.5 rounded-full font-mono font-extrabold text-slate-600">
                        {diffText ? (learnerOffset! - tutorOffset > 0 ? `+${diffText.split(' ')[0]}` : `-${diffText.split(' ')[0]}`) : '±0h'}
                    </div>
                    <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded my-1 relative overflow-hidden animate-pulse">
                        <div className="absolute top-0 left-0 w-2 h-full bg-slate-400 rounded-full" style={{ animationDuration: '1s' }}></div>
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                        {diffText?.includes('Same') ? 'Same TZ' : diffText?.split(' ').pop() || 'Sync'}
                    </span>
                </div>

                {/* Learner Clock */}
                <div className={`flex flex-col flex-1 items-end pr-3 py-3 pl-2 text-right rounded-xl relative overflow-hidden border ${learnerConfig.bg}`}>
                    {/* Cool large transparent background emoji for Learner */}
                    <span className="absolute left-1 -bottom-2 text-5xl opacity-[0.14] pointer-events-none select-none transition-transform duration-500 transform scale-110">
                        {learnerConfig.transparentEmoji}
                    </span>
                    <div className={`flex items-center gap-1 justify-end text-[9px] uppercase font-bold tracking-wider ${learnerConfig.labelColor} relative z-10`}>
                        <span>{emoji}</span> Learner Time
                    </div>
                    <div className={`text-xl font-black font-mono mt-1 flex items-center gap-1 relative z-10 ${learnerConfig.timeText}`}>
                        {time || '--:--'}
                    </div>
                    <span className={`text-[9px] font-bold truncate max-w-[110px] text-right relative z-10 block mt-0.5 ${learnerHour >= 21 || learnerHour < 6 ? 'text-slate-300' : 'text-slate-500'}`} title={locationText || 'No location'}>
                        {locationText || 'Not Set'}
                    </span>
                </div>
            </div>

            {/* Action Buttons Panel */}
            <div className="flex sm:flex-col justify-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-200 pl-0 sm:pl-3 relative z-10">
                <button 
                    onClick={handleSetManualTime} 
                    className="flex-1 sm:flex-none p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all transform hover:scale-105 flex items-center justify-center gap-2 sm:gap-0 cursor-pointer"
                    title="Set manual difference"
                >
                    <span className="text-sm">⏱️</span>
                    <span className="sm:hidden text-xs font-bold">Adjust Time</span>
                </button>

                {locationText && learner.timeOffsetMinutes !== undefined && (
                    <button 
                        onClick={handleRefreshTimezone} 
                        disabled={isLoading}
                        className="flex-1 sm:flex-none p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 disabled:bg-slate-100 disabled:text-gray-400 disabled:border-slate-100 transition-all transform hover:scale-105 flex items-center justify-center gap-2 sm:gap-0 cursor-pointer"
                        title="Detect local Timezone automatically"
                    >
                        {isLoading ? (
                            <div className="animate-spin w-4 h-4 border-2 border-t-indigo-600 border-indigo-200 rounded-full"></div>
                        ) : (
                            <span>🌐</span>
                        )}
                        <span className="sm:hidden text-xs font-bold">Use Auto TZ</span>
                    </button>
                )}
            </div>
            
            <TimeInputModal
                isOpen={isTimeModalOpen}
                onClose={() => setIsTimeModalOpen(false)}
                onSubmit={handleTimeSubmit}
                title="Enter Learner's Local Time"
            />
        </div>
    );
};

export default LearnerTime;
