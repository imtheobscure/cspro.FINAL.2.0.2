import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import TimeInputModal from './TimeInputModal';

const ServerTime: React.FC<{ className?: string; simple?: boolean }> = ({ className, simple }) => {
    const [time, setTime] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const tutorInfo = useAppStore(state => state.tutorInfo);
    const setTutorInfo = useAppStore(state => state.setTutorInfo);
    const tutorTimezone = tutorInfo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeOffsetMinutes = tutorInfo?.timeOffsetMinutes;

    useEffect(() => {
        const updateServerTime = () => {
            try {
                const now = new Date();
                let timeString = '';
                
                if (timeOffsetMinutes !== undefined) {
                    const localNow = new Date(now.getTime() + timeOffsetMinutes * 60000);
                    timeString = localNow.toLocaleTimeString('en-CA', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                        timeZone: 'UTC' // because we've manually added the offset to UTC time
                    });
                } else {
                    timeString = now.toLocaleTimeString('en-CA', {
                        timeZone: tutorTimezone,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                    });
                }
                setTime(timeString);
            } catch (error) {
                console.error(`Error formatting time for ${tutorTimezone}:`, error);
                setTime('Time Error');
            }
        };

        updateServerTime(); // Initial call
        const intervalId = setInterval(updateServerTime, 1000); // Update every second

        return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, [tutorTimezone, timeOffsetMinutes]);

    const handleTimeSubmit = (hours: number, minutes: number) => {
        const now = new Date();
        const currentUtcHours = now.getUTCHours();
        const currentUtcMinutes = now.getUTCMinutes();
        
        let desiredTotalMinutes = hours * 60 + minutes;
        let currentUtcTotalMinutes = currentUtcHours * 60 + currentUtcMinutes;
        
        // Handle next day / previous day wrap-around for offset calculation
        let offset = desiredTotalMinutes - currentUtcTotalMinutes;
        if (offset > 720) offset -= 1440; // if it's more than 12h ahead, it might be previous day
        if (offset < -720) offset += 1440; // if it's more than 12h behind, it might be next day
        
        setTutorInfo({ ...tutorInfo, timeOffsetMinutes: offset });
    };

    return (
        <>
            {simple ? (
                <span className={className}>{time}</span>
            ) : (
                <div className={`flex items-center gap-2 ${className || 'text-brand-gray-dark'}`}>
                    <div 
                        className="flex items-center gap-2 text-xs font-semibold cursor-pointer hover:bg-gray-100/10 p-1 rounded transition-colors" 
                        title={`Local Time (${tutorTimezone}). Click to set exact time.`}
                        onClick={() => setIsEditing(true)}
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span>{time}</span>
                    </div>
                    <button 
                        onClick={() => setIsEditing(true)} 
                        className="text-lg hover:scale-110 transition-transform bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-full h-7 w-7 flex items-center justify-center p-0"
                        title="Set Exact Time"
                        style={{ pointerEvents: 'auto' }}
                    >
                        ⚙️
                    </button>
                </div>
            )}
            <TimeInputModal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                onSubmit={handleTimeSubmit}
                title="Set Digital Clock Time"
            />
        </>
    );
};

export default ServerTime;
