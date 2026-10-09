import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useLearnerStore } from '../../../store/useLearnerStore';
import { Link } from 'react-router-dom';
import { playSynthAlarm } from '../../../utils/audioUtils';
import { generatePersonalizedTemplates, playSoundMeme } from '../../../utils/templateUtils';

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const ALARM_ICONS: Record<string, string> = {
    'zen': '🕊️',
    'digital': '🎵',
    'classic': '🔔',
    'synth': '🚀',
    'voice': '📢',
    'meme': '🎭'
};

const GlobalTimer: React.FC = () => {
    const activeTimer = useAppStore(state => state.activeTimer);
    const stopTimer = useAppStore(state => state.stopTimer);
    const speak = useAppStore(state => state.speak);
    const [displayTime, setDisplayTime] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const alertsFiredRef = useRef<{ wrapUp: boolean; breaks: number[] }>({ wrapUp: false, breaks: [] });

    // Draggable position coordinates
    const [position, setPosition] = useState({ x: window.innerWidth / 2 - 190, y: 30 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        // Exclude interactive elements from triggering drag
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
            return;
        }
        setIsDragging(true);
        dragStart.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        e.preventDefault();
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
            return;
        }
        setIsDragging(true);
        const touch = e.touches[0];
        dragStart.current = {
            x: touch.clientX - position.x,
            y: touch.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            // Prevent dragging offscreen limits
            const newX = Math.max(10, Math.min(window.innerWidth - 380, e.clientX - dragStart.current.x));
            const newY = Math.max(15, Math.min(window.innerHeight - 150, e.clientY - dragStart.current.y));
            setPosition({ x: newX, y: newY });
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            const newX = Math.max(10, Math.min(window.innerWidth - 380, touch.clientX - dragStart.current.x));
            const newY = Math.max(15, Math.min(window.innerHeight - 150, touch.clientY - dragStart.current.y));
            setPosition({ x: newX, y: newY });
        };

        const handleDragEnd = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleDragEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging]);

    useEffect(() => {
        if (activeTimer) {
            alertsFiredRef.current = { wrapUp: false, breaks: [] };
           
            intervalRef.current = setInterval(() => {
                const remainingMs = activeTimer.endTime ? (activeTimer.endTime - Date.now()) : 0;
                const learner = useLearnerStore.getState().getLearnerById(activeTimer.learnerId);
                const isVocalPraiseEnabled = (learner as any)?.enableVocalPraise !== false;

                if (remainingMs <= 0) {
                    clearInterval(intervalRef.current!);
                    
                    const alarmType = activeTimer.alarmType || 'zen';
                    const customVoice = learner?.selectedAlarmVoice;
                    const finishMeme = (learner as any)?.selectedMemeUrlFinish || learner?.selectedMemeUrl;

                    if (alarmType === 'meme' && finishMeme) {
                        playSoundMeme(finishMeme);
                        setTimeout(() => {
                            const templates = (learner as any)?.vocalPraiseTemplates || generatePersonalizedTemplates(learner || {});
                            const completeText = templates[5]?.text || "Your live lesson is completed. Outstanding effort today!";
                            if (isVocalPraiseEnabled) speak(completeText, customVoice);
                        }, 2500);
                    } else if (alarmType === 'voice') {
                        // Play active beeps first to grab attention, then speak
                        playSynthAlarm('digital');
                        setTimeout(() => {
                            const templates = (learner as any)?.vocalPraiseTemplates || generatePersonalizedTemplates(learner || {});
                            const completeText = templates[5]?.text || "Your live lesson is completed. Outstanding effort today!";
                            if (isVocalPraiseEnabled) speak(completeText, customVoice);
                        }, 1200);
                    } else {
                        playSynthAlarm(alarmType);
                        setTimeout(() => {
                            const templates = (learner as any)?.vocalPraiseTemplates || generatePersonalizedTemplates(learner || {});
                            const completeText = templates[5]?.text || "Your live lesson is completed. Outstanding effort today!";
                            if (isVocalPraiseEnabled) speak(completeText, customVoice);
                        }, 1200);
                    }
                    
                    stopTimer();
                } else {
                    const remainingSeconds = Math.round(remainingMs / 1000);
                    const customVoice = learner?.selectedAlarmVoice;
                    
                    if (activeTimer.breakInterval > 0) {
                        const elapsedSeconds = (activeTimer.durationMinutes * 60) - remainingSeconds;
                        const currentBreakPoint = Math.floor(elapsedSeconds / (activeTimer.breakInterval * 60));
                        if (currentBreakPoint > 0 && !alertsFiredRef.current.breaks.includes(currentBreakPoint)) {
                            const templates = (learner as any)?.vocalPraiseTemplates || generatePersonalizedTemplates(learner || {});
                            // Match interval: 15->0, 20->1, 25->2, 30->3
                            let breakIdx = 0;
                            if (activeTimer.breakInterval === 20) breakIdx = 1;
                            else if (activeTimer.breakInterval === 25) breakIdx = 2;
                            else if (activeTimer.breakInterval === 30) breakIdx = 3;

                            const breakText = templates[breakIdx]?.text || "Time for a short break!";
                            
                            const breakMeme = (learner as any)?.selectedMemeUrlBreak;
                            if (breakMeme) {
                                playSoundMeme(breakMeme);
                                setTimeout(() => {
                                    if (isVocalPraiseEnabled) speak(breakText, customVoice);
                                }, 1500);
                            } else {
                                playSynthAlarm('digital');
                                setTimeout(() => {
                                    if (isVocalPraiseEnabled) speak(breakText, customVoice);
                                }, 500);
                            }
                            alertsFiredRef.current.breaks.push(currentBreakPoint);
                        }
                    }

                    // Fired exactly 10 minutes (600 seconds) before the end of class
                    const is10MinEnabled = (learner as any)?.enable10MinAlert !== false;
                    if (is10MinEnabled && remainingSeconds > 595 && remainingSeconds <= 600 && !alertsFiredRef.current.wrapUp) {
                        const templates = (learner as any)?.vocalPraiseTemplates || generatePersonalizedTemplates(learner || {});
                        const wrapText = templates[4]?.text || "About ten minutes remaining. Let's start wrapping up.";
                        
                        const wrapUpMeme = (learner as any)?.selectedMemeUrl10Min;
                        if (wrapUpMeme) {
                            playSoundMeme(wrapUpMeme);
                            setTimeout(() => {
                                if (isVocalPraiseEnabled) speak(wrapText, customVoice);
                            }, 1500);
                        } else {
                            playSynthAlarm('digital');
                            setTimeout(() => {
                                if (isVocalPraiseEnabled) speak(wrapText, customVoice);
                            }, 600);
                        }
                        alertsFiredRef.current.wrapUp = true;
                    }

                    setDisplayTime(remainingSeconds);
                }
            }, 500);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setDisplayTime(0);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [activeTimer, stopTimer, speak]);

    // Recalculate horizontal center on initial mount if still default
    useEffect(() => {
        setPosition({ x: window.innerWidth / 2 - 180, y: 70 });
    }, []);

    if (!activeTimer) {
        return null;
    }

    const currentAlarmIcon = ALARM_ICONS[activeTimer.alarmType || 'zen'] || '⏱️';

    return (
        <div 
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={`fixed z-50 bg-white/95 border-2 border-emerald-500/85 backdrop-blur-md rounded-2xl shadow-2xl px-5 py-3.5 flex items-center gap-4 text-slate-800 animate-fade-in select-none max-w-[360px] w-full cursor-grab ${isDragging ? 'cursor-grabbing border-purple-500 ring-4 ring-purple-500/25' : 'ring-4 ring-emerald-500/15'}`}
        >
             {/* Grip drag handle icon */}
             <div className="text-slate-400 hover:text-slate-600 transition-colors flex flex-col justify-center gap-0.5 pr-1 font-mono font-bold text-xs select-none cursor-grab">
                 <span>:::</span>
             </div>

             {/* Profile and Pulse details */}
             <div className="flex flex-col text-left flex-1 min-w-0">
                 <div className="flex items-center gap-1.5">
                     <span className="relative flex h-2 w-2">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </span>
                     <p className="text-[9px] uppercase tracking-widest font-black text-slate-550 leading-none">Live Session</p>
                 </div>
                 <Link 
                     to={`/learner/${activeTimer.learnerId}`} 
                     className="text-purple-600 text-sm font-black hover:underline hover:text-purple-800 transition-colors mt-1.5 truncate max-w-[120px]" 
                     title={`Go to ${activeTimer.learnerName}'s profile`}
                 >
                     {activeTimer.learnerName}
                 </Link>
             </div>

             {/* Splitter */}
             <div className="h-8 w-px bg-slate-200"></div>

             {/* Draggable remaining remaining timer clock */}
             <div className="font-mono text-2xl font-black text-emerald-600 tracking-tight select-none flex-1 text-center min-w-[75px]">
                 {formatTime(displayTime)}
             </div>

             {/* Stop Controls Button */}
             <button 
                 onClick={stopTimer} 
                 className="bg-red-50 hover:bg-red-500 border border-red-200 hover:border-red-500 hover:text-white text-red-600 p-2 rounded-xl transition-all cursor-pointer transform hover:scale-[1.08] active:scale-95 flex items-center justify-center h-8 w-8"
                 title="Stop Lesson & Save"
             >
                 ⏹️
             </button>
        </div>
    );
};

export default GlobalTimer;
