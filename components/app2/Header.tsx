
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
// Fix: Changed react-router-dom import to named import.
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ICONS, LOGO_URL } from '../../constants2';
import { useLearnerStore } from '../../store/useLearnerStore';
import { useTodoStore } from '../../store/useTodoStore';
import { useCalendarStore, convertUtcToLocalTime } from '../../store/useCalendarStore';
import { useAppStore } from '../../store/useAppStore';
import ServerTime from './ServerTime';
import TutorSettingsModal from './TutorSettingsModal';
import { getAvatarUrl } from '../../services/avatarService';
import { uploadFileToServer } from '../../utils/imageUtils';
import { Learner, Session, Badge } from '../../types2';
import * as idb from 'idb-keyval';
import { exportAllCustomAvatars, loadAllCustomAvatars } from '../../services/customAvatarStore';
import LZString from 'lz-string';
import { useAuthStore } from '../../store/useAuthStore';
import TierBadge from '../ui/TierBadge';
import GroupedVoiceOptions from '../ui/GroupedVoiceOptions';
import { canAddLearner, FREE_LEARNER_LIMIT, PRO_LEARNER_LIMIT, getRemainingLearnerSlots, formatTierRemaining } from '../../utils/tiers';

const resizeImage = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            if (!event.target?.result) {
                return reject(new Error("FileReader did not return a result."));
            }
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 192; 
                let { width, height } = img;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height = Math.round(height * (MAX_SIZE / width));
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width = Math.round(width * (MAX_SIZE / height));
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
};

const Header: React.FC = () => {
    // FIX: Refactored multi-property selectors with `shallow` to individual selectors to resolve type inference issues.
    const learners = useLearnerStore(state => state.learners);
    const navigate = useNavigate();
    const location = useLocation();
    const match = location.pathname.match(/^\/learner\/([^/]+)$/);
    const activeLearnerId = match ? match[1] : null;
    const activeLearner = activeLearnerId ? learners.find(l => l.id === activeLearnerId) : null;
    const groupClasses = useLearnerStore(state => state.groupClasses);
    const importData = useLearnerStore(state => state.importData);
    const todos = useTodoStore(state => state.todos);
    const syncedCalendars = useCalendarStore(state => state.syncedCalendars);
    const calendarEvents = useCalendarStore(state => state.calendarEvents);
    const calendarTimezone = useCalendarStore(state => state.calendarTimezone ?? 'Asia/Tehran');
    const logoUrl = useAppStore(state => state.logoUrl);
    const authTier = useAuthStore(state => state.tier);
    const authTutor = useAuthStore(state => state.tutor);
    // Remaining time on a granted Pro/VIP subscription (shown on the account chip)
    const tierRemainingText = (authTier === 'pro' || authTier === 'vip') && authTutor?.tierExpiresAt
      ? formatTierRemaining(authTutor.tierExpiresAt)
      : '';
    const tierExpiresDateText = authTutor?.tierExpiresAt
      ? new Date(authTutor.tierExpiresAt).toLocaleDateString()
      : '';
    const openAuthModal = useAuthStore(state => state.openAuthModal);
    const openUpgradeModal = useAuthStore(state => state.openUpgradeModal);
    const openAdminModal = useAuthStore(state => state.openAdminModal);
    const setLogoUrl = useAppStore(state => state.setLogoUrl);
    const tutorInfo = useAppStore(state => state.tutorInfo);
    const setTutorInfo = useAppStore(state => state.setTutorInfo);
    const appAddress = useAppStore(state => state.appAddress);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPasting, setIsPasting] = useState(false);
    const [isPastingTutor, setIsPastingTutor] = useState(false);
    const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Theme state
    const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    });

    const toggleTheme = useCallback(() => {
        const nextDark = !isDarkTheme;
        setIsDarkTheme(nextDark);
        const html = document.documentElement;
        const body = document.body;
        if (nextDark) {
            html.classList.add('dark');
            body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            html.classList.remove('dark');
            body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkTheme]);

    // Notifications state & settings
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifTab, setNotifTab] = useState<'reminders' | 'settings'>('reminders');
    const notifMenuRef = useRef<HTMLDivElement>(null);
    
    const [snoozedEvents, setSnoozedEvents] = useState<Record<string, number>>({});
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [dismissedEvents, setDismissedEvents] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('dismissed_events');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const [notifSettings, setNotifSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('tutomy_notif_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.voiceURI === undefined) parsed.voiceURI = '';
                return parsed;
            }
        } catch (e) {}
        return {
            enabled: true,
            volume: 0.25,
            alarmTone: 'synth-chime',
            voiceSynth: true,
            remindMinutes: 10,
            voiceURI: ''
        };
    });

    useEffect(() => {
        localStorage.setItem('tutomy_notif_settings', JSON.stringify(notifSettings));
    }, [notifSettings]);

    // Helper to get current date and time in calendar timezone
    const getCurrentTimeInTimezone = useCallback((tz: string) => {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            const parts = formatter.formatToParts(new Date());
            const y = parts.find(p => p.type === 'year')?.value || '';
            const m = parts.find(p => p.type === 'month')?.value || '';
            const d = parts.find(p => p.type === 'day')?.value || '';
            const hr = parts.find(p => p.type === 'hour')?.value || '00';
            const min = parts.find(p => p.type === 'minute')?.value || '00';
            
            return {
                dateStr: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
                timeStr: `${hr.padStart(2, '0')}:${min.padStart(2, '0')}`
            };
        } catch (e) {
            // Fallback to local browser time
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const hr = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            return {
                dateStr: `${y}-${m}-${d}`,
                timeStr: `${hr}:${min}`
            };
        }
    }, []);

    const tomorrowLocalDate = useMemo(() => {
        try {
            const { dateStr } = getCurrentTimeInTimezone(calendarTimezone);
            const d = new Date(dateStr + 'T12:00:00');
            d.setDate(d.getDate() + 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        } catch(e) {
            return '';
        }
    }, [calendarTimezone, getCurrentTimeInTimezone]);

    const handleDismissEvent = (id: string) => {
        setDismissedEvents(prev => {
            const next = [...prev, id];
            localStorage.setItem('dismissed_events', JSON.stringify(next));
            return next;
        });
    };

    // Compute upcoming holidays and classes in next 7 days, filtering out past events in timezone
    const upcomingEventsAndHolidays = useMemo(() => {
        const { dateStr: currentLocalDate, timeStr: currentLocalTime } = getCurrentTimeInTimezone(calendarTimezone);
        
        return calendarEvents.filter(e => {
            if (!e.date) return false;
            if (dismissedEvents.includes(e.id)) return false;

            // Date comparison
            if (e.date < currentLocalDate) {
                return false; // past day
            }
            if (e.date === currentLocalDate) {
                // If it is today, check time if it exists
                if (e.time) {
                    // e.time is UTC, convert to local time of the calendar timezone first
                    const localTime = convertUtcToLocalTime(e.date, e.time, calendarTimezone);
                    if (localTime < currentLocalTime) {
                        return false; // already happened today
                    }
                }
            }
            
            // Limit to next 7 days
            const today = new Date();
            const endRange = new Date();
            endRange.setDate(today.getDate() + 7);
            const endRangeStr = endRange.toISOString().split('T')[0];
            
            return e.date <= endRangeStr;
        }).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    }, [calendarEvents, calendarTimezone, dismissedEvents, getCurrentTimeInTimezone]);

    // Background 10m reminder loop
    const [alarmedEventIds, setAlarmedEventIds] = useState<string[]>([]);
    const [activeAlarmAlert, setActiveAlarmAlert] = useState<{ id: string; title: string; time: string; learnerName?: string } | null>(null);

    const triggerWebAudioAlarm = (tone: string, vol: number) => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const now = ctx.currentTime;
            
            if (tone === 'synth-chime') {
                const freqs = [329.63, 415.30, 493.88, 587.33];
                freqs.forEach((f, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(f, now);
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(vol * 0.25, now + 0.1 * idx);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 2.0);
                });
            } else if (tone === 'beeps') {
                for (let i = 0; i < 3; i++) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(880, now + i * 0.3);
                    gain.gain.setValueAtTime(0, now + i * 0.3);
                    gain.gain.linearRampToValueAtTime(vol * 0.4, now + i * 0.3 + 0.05);
                    gain.gain.linearRampToValueAtTime(0, now + i * 0.3 + 0.2);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + i * 0.3);
                    osc.stop(now + i * 0.3 + 0.25);
                }
            } else if (tone === 'classic') {
                const freqs = [1200, 1500];
                freqs.forEach((f, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(f, now);
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(vol * 0.3, now + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 1.3);
                });
            } else {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 1.2);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(vol * 0.2, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 1.3);
            }
        } catch (e) {}
    };

    const triggerTutorSpeech = (text: string) => {
        if (!window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.volume = notifSettings.volume;
            if (notifSettings.voiceURI) {
                const voices = window.speechSynthesis.getVoices();
                const selectedVoice = voices.find(v => v.voiceURI === notifSettings.voiceURI);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
            } else {
                const voices = window.speechSynthesis.getVoices();
                const defaultNaturalVoice = voices.find(v => 
                    v.lang.startsWith('en') && 
                    (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Apple'))
                );
                if (defaultNaturalVoice) {
                    utterance.voice = defaultNaturalVoice;
                }
            }
            window.speechSynthesis.speak(utterance);
        } catch (e) {}
    };

    // Ask for browser notification permission on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().catch(err => console.error("Could not request notification permission:", err));
            }
        }
    }, []);

    useEffect(() => {
        if (!notifSettings.enabled) return;

        const checkClassReminders = () => {
            const now = new Date();

            calendarEvents.forEach(evt => {
                if (!evt.date || !evt.time || alarmedEventIds.includes(evt.id)) return;
                if (evt.type === 'holiday') return;

                // Check if snoozed
                const snoozeUntil = snoozedEvents[evt.id];
                if (snoozeUntil && Date.now() < snoozeUntil) return;

                // evt.time is stored in UTC format. Parse with its date.
                const eventUtcDate = new Date(`${evt.date}T${evt.time}:00Z`);
                
                if (isNaN(eventUtcDate.getTime())) return;

                // Difference in milliseconds converted to minutes
                const diffMs = eventUtcDate.getTime() - now.getTime();
                const diffMinutes = Math.floor(diffMs / 60000);

                // Alarm if within user-selected reminder window
                if (diffMinutes >= 0 && diffMinutes <= notifSettings.remindMinutes) {
                    setAlarmedEventIds(prev => [...prev, evt.id]);
                    
                    // Convert stored UTC to calendar display-aligned timezone
                    const displayTimeStr = convertUtcToLocalTime(evt.date, evt.time, calendarTimezone);

                    setActiveAlarmAlert({
                        id: evt.id,
                        title: evt.title,
                        time: displayTimeStr,
                        learnerName: evt.learnerId ? learners.find(l => l.id === evt.learnerId)?.name : undefined
                    });

                    // Trigger Web Audio sound
                    triggerWebAudioAlarm(notifSettings.alarmTone, notifSettings.volume);

                    // Standard local browser/system Push Notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        const sName = evt.learnerId ? learners.find(l => l.id === evt.learnerId)?.name : '';
                        const notifTitle = `Tutorly Class Alert`;
                        const notifBody = `Class "${evt.title}"${sName ? ` with ${sName}` : ''} starts in ${diffMinutes} min at ${displayTimeStr} (${calendarTimezone})!`;
                        try {
                            if ('serviceWorker' in navigator) {
                                navigator.serviceWorker.ready.then(registration => {
                                    registration.showNotification(notifTitle, {
                                        body: notifBody,
                                        icon: '/Tutomy_logo_192.png',
                                        tag: `evt-alert-${evt.id}`
                                    });
                                }).catch(() => {
                                    new Notification(notifTitle, {
                                        body: notifBody,
                                        icon: '/Tutomy_logo_192.png',
                                        tag: `evt-alert-${evt.id}`
                                    });
                                });
                            } else {
                                new Notification(notifTitle, {
                                    body: notifBody,
                                    icon: '/Tutomy_logo_192.png',
                                    tag: `evt-alert-${evt.id}`
                                });
                            }
                        } catch (pErr) {
                            console.error("OS push notification failed to trigger:", pErr);
                        }
                    }

                    if (notifSettings.voiceSynth) {
                        const nameText = evt.learnerId ? learners.find(l => l.id === evt.learnerId)?.name : '';
                        const speechMsg = `Tutor ${tutorInfo.name || 'Alex'}, your class ${evt.title} ${nameText ? `with ${nameText}` : ''} is starting in ${diffMinutes} minutes at ${displayTimeStr}. Please prepare your materials.`;
                        setTimeout(() => {
                            triggerTutorSpeech(speechMsg);
                        }, 1200);
                    }
                }
            });
        };

        checkClassReminders();
        const intervalId = setInterval(checkClassReminders, 12000);
        return () => clearInterval(intervalId);
    }, [calendarEvents, alarmedEventIds, learners, notifSettings, tutorInfo.name, calendarTimezone, snoozedEvents]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
            if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleOptimizedExport = () => {
        const learnersForExport = learners.map(learner => {
            // Destructure learner, separating fields to be processed or removed.
            const { sessions, avatarId, ...restProps } = learner;
            const currentLessonText = (learner as any).currentLessonText;
            const dismissedFeedback = (learner as any).dismissedFeedback;
            const restOfLearner = restProps;
    
            // Remove learner avatarId if it's a base64 string.
            const finalAvatarId = avatarId && avatarId.startsWith('data:image/') ? undefined : avatarId;
    
            const sortedSessions = (sessions || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
            const optimizedSessions = sortedSessions.map((session, index) => {
                // For older sessions, keep only the data essential for features like timeline, challenges, chat, and calendar.
                const baseSession: Partial<Session> = {
                    id: session.id,
                    date: session.date,
                    attended: session.attended,
                    duration: session.duration,
                    skillsLearned: session.skillsLearned,
                    weaknessDetails: session.weaknessDetails,
                    chatMessages: session.chatMessages,
                    // FIX: The partial `aiAnalysis` object was causing a type error because it didn't match the `AIComprehensiveAnalysis` type. Casting to `any` resolves this for the export data.
                    aiAnalysis: session.aiAnalysis ? { competencyUpdates: session.aiAnalysis.competencyUpdates } as any : null,
                };
    
                if (index === 0) { // This is the most recent session
                    // Keep more details for the last session log, including feedback (corrections).
                    // Fix: Cast the returned object to `Session` to match the expected type for the `sessions` array. This resolves the type mismatch error.
                    return {
                        ...baseSession,
                        lessonName: session.lessonName,
                        lessonSummary: session.lessonSummary,
                        spokenTime: session.spokenTime,
                        penalties: session.penalties,
                        badges: session.badges,
                        metExpectations: session.metExpectations,
                        aiAnalysis: session.aiAnalysis ? {
                            ...baseSession.aiAnalysis,
                            summary: session.aiAnalysis.summary,
                            strengths: session.aiAnalysis.strengths,
                            weaknesses: session.aiAnalysis.weaknesses,
                            keyLearnings: session.aiAnalysis.keyLearnings,
                            corrections: session.aiAnalysis.corrections, // Keep feedback for last session
                            masteryLevel: session.aiAnalysis.masteryLevel,
                            masteryJustification: session.aiAnalysis.masteryJustification,
                        } : null,
                    } as Session;
                }
                
                return baseSession as Session;
            });
            
            // Reassemble the learner object
            const finalLearner: Partial<Learner> = {
                ...restOfLearner,
                sessions: optimizedSessions,
            };
            if (finalAvatarId) {
                finalLearner.avatarId = finalAvatarId;
            }
            return finalLearner;
        });
    
        const groupClassesForExport = groupClasses.map(group => {
            const { sessions, currentLessonPlan, ...restOfGroup } = group;
    
            const sortedSessions = (sessions || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
            const optimizedSessions = sortedSessions.map((session, index) => {
                if (index === 0) { // Most recent session
                    // Fix: Removed non-existent 'photos' property from destructuring to resolve type error.
                    const { script, reflection, ...rest } = session;
                    return rest;
                } else { // Older sessions
                    return {
                        id: session.id,
                        date: session.date,
                        attended: session.attended,
                        duration: session.duration,
                    };
                }
            });
    
            return {
                ...restOfGroup,
                sessions: optimizedSessions,
            };
        });
    
        const data = {
            learners: learnersForExport,
            groupClasses: groupClassesForExport,
            todos,
            syncedCalendars,
            calendarEvents,
            logoUrl,
            tutorInfo,
        };
        const payload = JSON.stringify(data);
        const compressed = LZString.compressToUTF16(payload);
        const blob = new Blob([compressed], { type: 'text/plain;charset=utf-16' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `learner-profile-optimized-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    
        setIsExportMenuOpen(false);
    };

    const handleFullExport = async () => {
        const combatArenaState = localStorage.getItem('combat_arena_state_v3');
        const data = {
            learners,
            groupClasses,
            todos,
            syncedCalendars,
            calendarEvents,
            logoUrl,
            tutorInfo,
            combatArenaState: combatArenaState ? JSON.parse(combatArenaState) : undefined,
        };
        const jsonData = JSON.stringify(data);
        
        // Save to cloud
        try {
            const blob = new Blob([jsonData], { type: 'application/json' });
            const currentTutor = tutorInfo.name || 'DefaultTutor';
            await uploadFileToServer(blob, 'settings.json', currentTutor, 'Settings');
            console.log("Uploaded successfully to cloud");
        } catch (err) {
            console.error("Cloud upload failed", err);
        }

        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `learner-profile-full-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        setIsExportMenuOpen(false);
    };
    
    const handleExportProfileImages = async () => {
        const avatars = await exportAllCustomAvatars();
        const data = {
            tutorlyCustomAvatarsBackup: true,
            avatars,
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `learner-profile-images-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const handleExportCalendarEvents = () => {
        const data = {
            calendarEvents,
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `calendar-events-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const handleExportToYoungLearnersDashboard = async () => {
        if (!activeLearner) return;

        const { SAMPLE_LEARNERS, DEFAULT_STORE, DEFAULT_TEACHER } = await import('../../pages/kids/KidsApp');

        const mappedSkills = {
            pronunciation: 70,
            grammar: 70,
            vocabulary: 70,
            listening: 70,
            speaking: 70,
            reading: 70,
            writing: 70,
        } as any;

        if (activeLearner.competencies && activeLearner.competencies.length > 0) {
            activeLearner.competencies.forEach((c: any) => {
                const key = c.name?.toLowerCase() || '';
                if (key.includes('pronun')) mappedSkills.pronunciation = c.progress;
                else if (key.includes('gramm')) mappedSkills.grammar = c.progress;
                else if (key.includes('vocab')) mappedSkills.vocabulary = c.progress;
                else if (key.includes('listen')) mappedSkills.listening = c.progress;
                else if (key.includes('speak')) mappedSkills.speaking = c.progress;
                else if (key.includes('read')) mappedSkills.reading = c.progress;
                else if (key.includes('writ')) mappedSkills.writing = c.progress;
                else {
                    mappedSkills[c.name] = c.progress;
                }
            });
        }

        const interestsArray = activeLearner.interests
            ? activeLearner.interests.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [];

        const mappedCoursePlan = [
            ...(activeLearner.goals || []),
            ...(activeLearner.coursePlan?.modules ? activeLearner.coursePlan.modules.map((m: any) => m.title) : [])
        ];

        const mappedWeaknesses = (activeLearner.needs || []).map((n: any) => ({
            id: n.id,
            name: n.name,
            points: 2,
            completed: n.status === 'mastered',
            dateAdded: new Date().toISOString().split('T')[0]
        }));

        const mappedSessionLogs = (activeLearner.sessions || []).map((s: any) => ({
            id: s.id || `s-${Date.now()}-${Math.random()}`,
            date: s.date || new Date().toISOString().split('T')[0],
            duration: s.duration || 45,
            xpEarned: s.xpEarned || 50,
            strengths: (s.skillsLearned || []).map((st: string) => ({ text: st, points: 5 })),
            weaknesses: (s.needsHelp || []).map((we: string) => ({ text: we, points: 5 })),
            summary: s.lessonSummary || '',
            transcript: s.script || ''
        }));

        let calculatedAge = 10;
        if (activeLearner.birthday) {
            try {
                const birthYear = new Date(activeLearner.birthday).getFullYear();
                if (!isNaN(birthYear)) {
                    calculatedAge = new Date().getFullYear() - birthYear;
                }
            } catch (e) {}
        }

        const kidsAvatar = activeLearner.avatarId && activeLearner.avatarId.length < 10 ? activeLearner.avatarId : (activeLearner.gender === 'Female' ? '🧚‍♀️' : '🦸‍♂️');
        const kidsGender = activeLearner.gender === 'Female' ? 'Female' : (activeLearner.gender === 'Male' ? 'Male' : 'PreferNotToSay');
        const kidsArchetype = activeLearner.gender === 'Female' ? 'Fairy' : 'Superhero';

        const kidsLearner = {
            id: activeLearner.id,
            name: activeLearner.name,
            age: calculatedAge,
            avatar: kidsAvatar,
            gender: kidsGender,
            avatarArchetype: kidsArchetype,
            petType: 'Cat',
            theme: 'fairy',
            country: activeLearner.country || 'Unknown',
            city: activeLearner.city || '',
            status: 'active',
            joinDate: new Date().toISOString().split('T')[0],
            xp: activeLearner.xp || 100,
            petXp: 0,
            coins: Math.floor((activeLearner.xp || 100) / 10),
            streak: activeLearner.streak || 0,
            attack: 10,
            defense: 10,
            mood: 'happy',
            totalSessions: activeLearner.sessions?.length || 0,
            totalMinutes: (activeLearner.sessions || []).reduce((sum, s) => sum + (s.duration || 0), 0),
            favoriteSubject: activeLearner.targetLanguage || activeLearner.focus || 'English',
            tags: [] as string[],
            badges: [] as any[],
            skills: mappedSkills,
            weaknesses: mappedWeaknesses,
            interests: interestsArray,
            coursePlan: mappedCoursePlan,
            landItems: [] as any[],
            dialogueText: "Hello! Ready to learn!",
            purchasedRewards: [] as string[],
            nativeLang: activeLearner.l1Language || 'English',
            targetLang: activeLearner.targetLanguage || 'English',
            learningStyle: 'Visual',
            talkingMood: { emoji: '😊', text: "I'm ready!", dialogues: ["Hello!", "Let's learn!"], voiceName: '' },
            homework: [] as any[],
            sessionLogs: mappedSessionLogs
        };

        const STORAGE_KEY = 'kids_learning_kingdom_v2';
        let rawStore: any = null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                if (raw.trim().startsWith('{')) {
                    rawStore = JSON.parse(raw);
                } else {
                    const decompressed = LZString.decompressFromUTF16(raw);
                    rawStore = decompressed ? JSON.parse(decompressed) : JSON.parse(raw);
                }
            }
        } catch (e) {
            console.error("Failed to parse kids learning kingdom store", e);
        }

        if (!rawStore || !rawStore.learners || rawStore.learners.length === 0) {
            rawStore = {
                learners: JSON.parse(JSON.stringify(SAMPLE_LEARNERS)),
                storeItems: JSON.parse(JSON.stringify(DEFAULT_STORE)),
                teacher: JSON.parse(JSON.stringify(DEFAULT_TEACHER)),
                theme: 'fairy'
            };
        }

        if (!rawStore.learners) rawStore.learners = [];

        const duplicateIdx = rawStore.learners.findIndex((l: any) => l.id === kidsLearner.id);
        if (duplicateIdx >= 0) {
            if (confirm(`A profile with ID "${kidsLearner.id}" (${kidsLearner.name}) already exists in Young Learners Dashboard. Replace it?`)) {
                rawStore.learners[duplicateIdx] = kidsLearner;
            } else {
                kidsLearner.id = `${kidsLearner.id}-dup-${Date.now()}`;
                kidsLearner.name = `${kidsLearner.name} (Copy)`;
                rawStore.learners.push(kidsLearner);
            }
        } else {
            rawStore.learners.push(kidsLearner);
        }

        try {
            const payload = JSON.stringify(rawStore);
            const compressed = LZString.compressToUTF16(payload);
            localStorage.setItem(STORAGE_KEY, compressed);
        } catch (e) {
            console.error("Failed to save compressed kids store", e);
            // Fallback
            localStorage.setItem(STORAGE_KEY, JSON.stringify(rawStore));
        }

        try {
            const { triggerAutoSync } = await import('../../utils/diskStorage');
            triggerAutoSync(true);
        } catch (err) {
            console.error("Failed to trigger auto disk sync", err);
        }

        alert(`Successfully duplicated "${activeLearner.name}" to Young Learners Dashboard!`);

        const keepProfile = confirm(`Do you want to KEEP "${activeLearner.name}" in the Adult Dashboard?\n\nClick "OK" to KEEP it, or "Cancel" to DELETE it.`);
        if (!keepProfile) {
            useLearnerStore.getState().removeLearner(activeLearner.id);
            alert(`Deleted "${activeLearner.name}" from Adult Dashboard.`);
            navigate('/dashboard');
        }
        setIsExportMenuOpen(false);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    let parsedData: any = null;
                    const trimmed = text.trim();
                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                        parsedData = JSON.parse(text);
                    } else {
                        // Decompress with LZString
                        const decompressed = LZString.decompressFromUTF16(text) || LZString.decompress(text);
                        if (decompressed) {
                            parsedData = JSON.parse(decompressed);
                        } else {
                            parsedData = JSON.parse(text);
                        }
                    }
                    
                    if (parsedData && parsedData.tutorlyCustomAvatarsBackup === true) {
                        const avatars = parsedData.avatars || {};
                        for (const [id, base64] of Object.entries(avatars)) {
                            await idb.set(`custom-avatar-${id}`, base64);
                        }
                        await loadAllCustomAvatars();
                        alert("Profile images imported successfully! Custom avatars have been restored.");
                        return;
                    }

                    if (parsedData && parsedData.isSingleLearnerProfile === true && parsedData.learner) {
                        const learnerToAdd = parsedData.learner;
                        const existingLearners = useLearnerStore.getState().learners;
                        let updatedLearners = [...existingLearners];
                        const duplicateIndex = existingLearners.findIndex(l => l.id === learnerToAdd.id);
                        if (duplicateIndex >= 0) {
                            if (confirm(`A profile with ID "${learnerToAdd.id}" (${learnerToAdd.name}) already exists. Replace with imported profile?`)) {
                                updatedLearners[duplicateIndex] = learnerToAdd;
                                alert(`Profile updated for ${learnerToAdd.name}!`);
                            } else {
                                const newId = `learner-${Date.now()}`;
                                const renamedName = `${learnerToAdd.name} (Imported)`;
                                updatedLearners.push({ ...learnerToAdd, id: newId, name: renamedName });
                                alert(`Profile added as ${renamedName}!`);
                            }
                        } else {
                            updatedLearners.push(learnerToAdd);
                            alert(`Profile added for ${learnerToAdd.name}!`);
                        }
                        useLearnerStore.setState({ learners: updatedLearners });
                    } else {
                        importData(parsedData);
                        if (parsedData.combatArenaState) {
                            localStorage.setItem('combat_arena_state_v3', JSON.stringify(parsedData.combatArenaState));
                        }
                    }
                }
            } catch (error) {
                alert('Error reading or parsing the file. Please ensure it is a valid JSON backup.');
                console.error("Import error:", error);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handlePaste = useCallback(async (event: ClipboardEvent) => {
        if (!isPasting) return;
        event.preventDefault();
        
        const clipboardItems = event.clipboardData?.items;
        if (!clipboardItems) {
            alert('Could not access clipboard items.');
            setIsPasting(false);
            return;
        }

        const imageBlob = Array.from(clipboardItems).find(item => item.type.startsWith('image/'))?.getAsFile();

        if (imageBlob) {
            try {
                const resizedDataUrl = await resizeImage(imageBlob);
                // The above isn't compatible directly, wait, let me use the imported imageUtils
                // Let's dynamically import dataURLtoBlob and uploadFileToServer
                const { dataURLtoBlob, uploadFileToServer } = await import('../../utils/imageUtils');
                const pB64: string = resizedDataUrl;
                const blob = dataURLtoBlob(pB64);
                const tutorName = tutorInfo.name || 'DefaultTutor';
                const remoteUrl = await uploadFileToServer(blob, 'header_logo.jpg', tutorName, 'Logo');
                setLogoUrl(remoteUrl);
            } catch (error) {
                console.error('Failed to process pasted image:', error);
                alert('Failed to process the pasted image.');
            }
        } else {
            alert('No image found on the clipboard. Please copy an image first.');
        }
        setIsPasting(false);
    }, [isPasting, setLogoUrl]);

    const handlePasteTutor = useCallback(async (event: ClipboardEvent) => {
        if (!isPastingTutor) return;
        event.preventDefault();
        const clipboardItems = event.clipboardData?.items;
        if (!clipboardItems) {
            alert('Could not access clipboard items.');
            setIsPastingTutor(false);
            return;
        }
        const imageBlob = Array.from(clipboardItems).find(item => item.type.startsWith('image/'))?.getAsFile();
        if (imageBlob) {
            try {
                const resizedBase64 = await resizeImage(imageBlob);
                setTutorInfo({ avatarId: resizedBase64 });
            } catch (error) {
                console.error('Failed to process pasted tutor image:', error);
                alert('Failed to process the pasted image.');
            }
        } else {
            alert('No image found on the clipboard. Please copy an image first.');
        }
        setIsPastingTutor(false);
    }, [isPastingTutor, setTutorInfo]);

    useEffect(() => {
        const setupPasteListener = (isPastingFlag: boolean, pasteHandler: (e: ClipboardEvent) => void, cleanup: () => void) => {
            if (!isPastingFlag) return;
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') cleanup();
            };
            document.addEventListener('paste', pasteHandler);
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('paste', pasteHandler);
                document.removeEventListener('keydown', handleKeyDown);
            };
        };

        const cleanupLogo = setupPasteListener(isPasting, handlePaste, () => setIsPasting(false));
        const cleanupTutor = setupPasteListener(isPastingTutor, handlePasteTutor, () => setIsPastingTutor(false));

        return () => {
            cleanupLogo?.();
            cleanupTutor?.();
        };
    }, [isPasting, handlePaste, isPastingTutor, handlePasteTutor]);


    const ActionButton: React.FC<{id?: string, onClick?: () => void, children?: React.ReactNode, icon?: React.ReactElement, className?: string, disabled?: boolean, title?: string}> = 
    ({ id, onClick, children, icon, className = '', disabled = false, title = '' }) => (
        <button 
            id={id}
            onClick={onClick} 
            disabled={disabled}
            title={title}
            className={`flex items-center justify-center text-sm font-bold rounded-lg transition-colors ${className} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
            {icon}
            {children}
        </button>
    );

    const [currentTourStep, setCurrentTourStep] = useState<number | null>(() => {
        if (typeof window !== 'undefined') {
            const val = localStorage.getItem("active_dashboard_tour_step");
            return val ? parseInt(val, 10) : null;
        }
        return null;
    });

    useEffect(() => {
        const handleTourChange = () => {
            const val = localStorage.getItem("active_dashboard_tour_step");
            setCurrentTourStep(val ? parseInt(val, 10) : null);
        };
        window.addEventListener("dashboard_tour_step_changed", handleTourChange);
        window.addEventListener("storage", handleTourChange);
        return () => {
            window.removeEventListener("dashboard_tour_step_changed", handleTourChange);
            window.removeEventListener("storage", handleTourChange);
        };
    }, []);

    useEffect(() => {
        if (currentTourStep === 2) {
            setIsNotifOpen(true);
        } else if (currentTourStep !== null) {
            setIsNotifOpen(false);
        }

        if (currentTourStep === 3) {
            setIsExportMenuOpen(true);
        } else if (currentTourStep !== null) {
            setIsExportMenuOpen(false);
        }
    }, [currentTourStep]);

  return (
    <>
    <header className="bg-white shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/*
          * Wraps, and is free to GROW when it does.
          *
          * The toolbar beside the brand is ~800px of actions once a real tier
          * badge and name are in it, and the brand is ~430px — together more than
          * a 1280px container has. The row used to be a hard `h-20` with no wrap,
          * so the overflow was silently cut off by `body { overflow-x: hidden }`:
          * the tier badge and the account avatar were unreachable.
          *
          * Allowing a wrap alone was not enough — `h-20` then pinned the header at
          * 80px while the second line sat below it, so the toolbar floated outside
          * the white bar. `min-h-20` is what keeps a wrapped toolbar INSIDE the
          * header: one line costs the same 80px as before, and only a genuinely
          * overflowing toolbar makes the header taller.
          */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 min-h-20 py-2">
          {/* `min-w-0` so a long brand can shrink instead of forcing the toolbar onto
              a second line on its own. */}
          <div className="flex items-center gap-4 min-w-0">
            <div 
              className="relative group flex-shrink-0" 
              title="Tutor Academy Logo"
            >
              <div className="w-11 h-11 sm:w-14 sm:h-14 bg-brand-blue rounded-md flex items-center justify-center shadow-md">
                 <i className="fas fa-graduation-cap text-2xl text-white"></i>
              </div>
            </div>
            <Link to="/">
              <div>
                <h1 className="text-base sm:text-lg md:text-xl font-extrabold text-brand-blue leading-tight truncate">Adult Dashboard</h1>
              </div>
            </Link>
          </div>
          {/* `ml-auto` keeps the toolbar against the right edge when it wraps onto a
              line of its own — without it, a wrapped line in a `justify-between`
              row snaps to the left, which reads as a mistake next to the brand. */}
          <nav className="flex flex-wrap items-center justify-end gap-2 xl:gap-4 ml-auto">
             {/* Back to Home button */}
             <Link to="/" title="Back to Home" className="text-xl font-bold text-brand-gray-dark hover:text-brand-blue transition-colors p-3 rounded-lg hover:bg-gray-100 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                <i className="fas fa-arrow-left"></i>
             </Link>

             <ActionButton 
                id="tutor-header-import"
                onClick={handleImportClick} 
                icon={<i className="fas fa-upload text-xl"></i>} 
                className="bg-gray-100 text-brand-gray-dark hover:bg-gray-200 w-10 h-10 sm:w-12 sm:h-12"
                title="Import Data"
              />

             {/* Notifications Icon Button */}
             {/* No `relative` here on purpose: this wrapper is mid-toolbar, and a 358px
                 panel right-aligned to it ran ~137px off the left of a 390px screen.
                 Without it the panel resolves against the `sticky` header, so it can
                 be laid out edge-to-edge under the header on a phone. */}
             <div ref={notifMenuRef}>
                 <ActionButton 
                    id="tutor-header-notifications"
                    onClick={() => setIsNotifOpen(prev => !prev)} 
                    icon={
                        <div className="relative">
                            <i className="fas fa-bell text-xl"></i>
                            {upcomingEventsAndHolidays.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[9px] w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                                    {upcomingEventsAndHolidays.length}
                                </span>
                            )}
                        </div>
                    } 
                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${isNotifOpen ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' : 'bg-gray-100 text-brand-gray-dark hover:bg-gray-200'}`}
                    title="Reminders & Notifications"
                 />
                 
                 {/*
                   * `min(24rem, 100vw - 2rem)`: a flat `w-96` is 384px, which is wider than
                   * a phone viewport, so `right-0` (and even `left-0`) could not keep the
                   * panel on screen.
                   */}
                 {isNotifOpen && (
                    <div className="absolute top-full left-2 right-2 w-auto sm:left-auto sm:right-0 sm:w-[min(24rem,calc(100vw-2rem))] origin-top-right bg-white rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 z-50 animate-fade-in divide-y divide-gray-100">
                        {/* Header Tabs */}
                        <div className="flex bg-gray-50 rounded-t-xl overflow-hidden border-b border-gray-100">
                            <button 
                                type="button"
                                onClick={() => setNotifTab('reminders')}
                                className={`flex-1 py-3 px-4 text-xs font-bold transition-all text-center border-b-2 cursor-pointer ${notifTab === 'reminders' ? 'text-brand-purple border-brand-purple bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <i className="fas fa-calendar-day mr-2 text-brand-purple"></i> Reminders ({upcomingEventsAndHolidays.length})
                            </button>
                            <button 
                                type="button"
                                onClick={() => setNotifTab('settings')}
                                className={`flex-1 py-3 px-4 text-xs font-bold transition-all text-center border-b-2 cursor-pointer ${notifTab === 'settings' ? 'text-brand-purple border-brand-purple bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <i className="fas fa-sliders-h mr-2 text-brand-purple"></i> Settings
                            </button>
                        </div>
                        
                        {/* Tab Content */}
                        <div className="max-h-[360px] overflow-y-auto p-4 space-y-3.5">
                            {notifTab === 'reminders' ? (
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center px-1">
                                        <button 
                                            type="button"
                                            onClick={() => triggerWebAudioAlarm(notifSettings.alarmTone, notifSettings.volume)}
                                            className="text-[10px] font-extrabold text-brand-purple hover:underline cursor-pointer flex items-center gap-1 ml-auto"
                                        >
                                            🔊 Test Ringtone
                                        </button>
                                    </div>
                                    
                                    {upcomingEventsAndHolidays.length > 0 ? (
                                        upcomingEventsAndHolidays.map((evt, idx) => {
                                            const isHoliday = evt.type === 'holiday' || evt.id.startsWith('holiday-') || evt.id.startsWith('bday-');
                                            const { dateStr: todayDateStr } = getCurrentTimeInTimezone(calendarTimezone);
                                            const isToday = evt.date === todayDateStr;
                                            const isTomorrow = evt.date === tomorrowLocalDate;

                                            // Determine custom classes based on date and type (color-coding)
                                            let cardClasses = "p-3.5 rounded-xl border text-left transition-all flex items-start gap-2.5 relative shadow-sm ";
                                            if (isToday) {
                                                if (isHoliday) {
                                                    cardClasses += "border-amber-300 bg-amber-50/80 ring-2 ring-amber-300/15";
                                                } else {
                                                    cardClasses += "border-emerald-300 bg-emerald-50/80 ring-2 ring-emerald-300/15";
                                                }
                                            } else if (isTomorrow) {
                                                if (isHoliday) {
                                                    cardClasses += "border-amber-200 bg-amber-50/40 hover:bg-amber-50";
                                                } else {
                                                    cardClasses += "border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50";
                                                }
                                            } else {
                                                if (isHoliday) {
                                                    cardClasses += "border-amber-100 bg-amber-50/10 hover:bg-slate-50";
                                                } else {
                                                    cardClasses += "border-slate-200 bg-white hover:bg-slate-50";
                                                }
                                            }

                                            return (
                                                <div 
                                                    key={`${evt.id}-${idx}`} 
                                                    className={cardClasses}
                                                >
                                                    <span className="text-xl shrink-0 pt-0.5">
                                                        {isHoliday ? '🎉' : '📅'}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex justify-between items-start gap-1">
                                                            <p className="font-extrabold text-xs text-gray-800 truncate pr-4" title={evt.title}>
                                                                {evt.title}
                                                            </p>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {isToday ? (
                                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 bg-emerald-600 text-white tracking-wide uppercase">
                                                                        Today
                                                                    </span>
                                                                ) : isTomorrow ? (
                                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-indigo-600 text-white">
                                                                        Tomorrow
                                                                    </span>
                                                                ) : null}
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isHoliday ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                                                    {isHoliday ? 'Holiday' : 'Class'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] font-semibold text-gray-500 mt-0.5 flex items-center gap-1.5 font-sans">
                                                            <span>📅 {!isToday && !isTomorrow ? evt.date : (isToday ? 'Today' : 'Tomorrow')}</span>
                                                            {evt.time && (
                                                                <>
                                                                    <span className="h-1 w-1 bg-gray-300 rounded-full"></span>
                                                                    <span>🕒 {convertUtcToLocalTime(evt.date, evt.time, calendarTimezone)}</span>
                                                                </>
                                                            )}
                                                        </p>
                                                        {evt.description && (
                                                            <p className="text-[9px] text-gray-400 mt-1 italic truncate font-sans">
                                                                {evt.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Dismiss Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDismissEvent(evt.id)}
                                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors cursor-pointer shrink-0 self-start"
                                                        title="Dismiss notification"
                                                    >
                                                        <i className="fas fa-times-circle text-xs"></i>
                                                    </button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center p-8 bg-gray-50/50 rounded-lg border border-dashed text-gray-400 text-xs font-sans">
                                            <p>No holidays or events in the next 7 days.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 p-1 text-left">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-700">Enable Dashboard Alerts</span>
                                        <button 
                                            type="button"
                                            onClick={() => setNotifSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${notifSettings.enabled ? 'bg-purple-600' : 'bg-gray-250'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifSettings.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-700">Speech Announcements</span>
                                        <button 
                                            type="button"
                                            onClick={() => setNotifSettings(prev => ({ ...prev, voiceSynth: !prev.voiceSynth }))}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${notifSettings.voiceSynth ? 'bg-purple-600' : 'bg-gray-250'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifSettings.voiceSynth ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-700">OS Push Notifications</span>
                                            <span className="text-[9px] text-gray-400">Receive alerts on your Windows/system</span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={async () => {
                                                if (!('Notification' in window)) {
                                                    alert('Web notifications are not supported in this browser version.');
                                                    return;
                                                }
                                                const permission = await Notification.requestPermission();
                                                alert(`OS notification status: ${permission}`);
                                            }}
                                            className={`px-2.5 py-1 text-[10px] font-black rounded transition-all cursor-pointer ${
                                                typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800'
                                            }`}
                                        >
                                            {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
                                                ? '✅ Enabled'
                                                : '🔔 Grant Access'}
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label htmlFor="alarm-tone-select" className="text-xs font-bold text-gray-750 block">Modern Class Alarm Tone</label>
                                        <select
                                            id="alarm-tone-select"
                                            value={notifSettings.alarmTone}
                                            onChange={(e) => setNotifSettings(prev => ({ ...prev, alarmTone: e.target.value }))}
                                            className="w-full text-xs p-2 border border-gray-200 bg-white rounded-lg font-semibold"
                                        >
                                            <option value="synth-chime">⚛️ Retro Synth Chime</option>
                                            <option value="beeps">⚡ Digital High Beeps</option>
                                            <option value="classic">🔔 Bright Brass Bell</option>
                                            <option value="sweep">🚀 Cyber Wave Sweep</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="remind-minutes-select" className="text-xs font-bold text-gray-750 block">Lead Time Alert</label>
                                        <select
                                            id="remind-minutes-select"
                                            value={notifSettings.remindMinutes}
                                            onChange={(e) => setNotifSettings(prev => ({ ...prev, remindMinutes: Number(e.target.value) }))}
                                            className="w-full text-xs p-2 border border-gray-200 bg-white rounded-lg font-semibold"
                                        >
                                            <option value="5">5 Minutes remaining</option>
                                            <option value="10">10 Minutes remaining</option>
                                            <option value="15">15 Minutes remaining</option>
                                            <option value="20">20 Minutes remaining</option>
                                        </select>
                                    </div>

                                    {notifSettings.voiceSynth && availableVoices.length > 0 && (
                                        <div className="space-y-1">
                                            <label htmlFor="voice-select" className="text-xs font-bold text-gray-750 block">Alarm Speech Voice</label>
                                            <select
                                                id="voice-select"
                                                value={notifSettings.voiceURI || ''}
                                                onChange={(e) => setNotifSettings(prev => ({ ...prev, voiceURI: e.target.value }))}
                                                className="w-full text-xs p-2 border border-gray-200 bg-white rounded-lg font-semibold max-w-full overflow-hidden text-ellipsis"
                                            >
                                                <option value="">Default Natural Voice</option>
                                                <GroupedVoiceOptions voices={availableVoices} />
                                            </select>
                                        </div>
                                    )}
                                    
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label htmlFor="notif-volume-slider" className="text-xs font-bold text-gray-750">Notification Volume</label>
                                            <span className="text-[10px] font-mono font-bold text-gray-500">{Math.round(notifSettings.volume * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            id="notif-volume-slider"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={notifSettings.volume}
                                            onChange={(e) => setNotifSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                        />
                                        <p className="text-[8px] text-gray-400 font-sans">Safe default is set at 25% since alarms are usually loud.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                 )}
             </div>

            <div className="relative" ref={exportMenuRef}>
                <ActionButton 
                    id="tutor-header-export"
                    onClick={() => setIsExportMenuOpen(prev => !prev)} 
                    icon={<i className="fas fa-download text-xl"></i>} 
                    className="bg-gray-100 text-brand-gray-dark hover:bg-gray-200 w-10 h-10 sm:w-12 sm:h-12"
                    title="Export Data"
                />
                 {isExportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 animate-fade-in">
                        <div className="py-1">
                            <button onClick={handleOptimizedExport} className="group flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                                <i className="fas fa-file-archive fa-fw text-gray-400 group-hover:text-gray-500 mr-3"></i>
                                <div>
                                    <p className="font-semibold">Optimized Export</p>
                                    <p className="text-xs text-gray-500">Smaller file, preserves key features.</p>
                                </div>
                            </button>
                            <div className="border-t border-gray-100"></div>
                            <button onClick={handleFullExport} className="group flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                                <i className="fas fa-database fa-fw text-gray-400 group-hover:text-gray-500 mr-3"></i>
                                <div>
                                    <p className="font-semibold">Full Backup & Save To Cloud</p>
                                    <p className="text-xs text-gray-500">Includes all data and saves to cloud folder.</p>
                                </div>
                            </button>
                            <div className="border-t border-gray-100"></div>
                            <button onClick={handleExportProfileImages} className="group flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                                <i className="fas fa-image fa-fw text-gray-400 group-hover:text-gray-500 mr-3"></i>
                                <div>
                                    <p className="font-semibold">Export Profile Images</p>
                                    <p className="text-xs text-gray-500">Separately back up heavy base64 pictures.</p>
                                </div>
                            </button>
                            <div className="border-t border-gray-100"></div>
                            <button onClick={handleExportCalendarEvents} className="group flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                                <i className="fas fa-calendar-alt fa-fw text-gray-400 group-hover:text-gray-500 mr-3"></i>
                                <div>
                                    <p className="font-semibold">Export Calendar & Reminders</p>
                                    <p className="text-xs text-gray-500">Only export scheduled classes & reminders.</p>
                                </div>
                            </button>
                            <div className="border-t border-gray-100"></div>
                            <button onClick={async () => {
                                const tName = prompt("Enter Tutor Name to load from cloud:");
                                if (!tName) return;
                                try {
                                    const url = `https://tutorly.ir/cspro/uploads/${encodeURIComponent(tName)}/Settings/settings.json?t=${Date.now()}`;
                                    let resp: Response;
                                    try {
                                        resp = await fetch(url);
                                    } catch {
                                        // DNS/TLS/CORS/offline — the request never reached the file server.
                                        alert(`Could not reach the cloud backup server for "${tName}".\n\nThis is a connection problem, not a missing backup. Check your internet connection and open the app in a normal browser tab — an embedded frame, an ad-blocker or a firewall can block it. Nothing was changed.`);
                                        setIsExportMenuOpen(false);
                                        return;
                                    }
                                    if (resp.status === 404) {
                                        alert(`No cloud backup was found for "${tName}".\n\nCheck the exact Tutor Name used when it was uploaded — the name is case-sensitive.`);
                                        setIsExportMenuOpen(false);
                                        return;
                                    }
                                    if (!resp.ok) {
                                        alert(`The cloud backup server answered with an error (HTTP ${resp.status}) for "${tName}". Try again in a moment; if it keeps failing the backup file server may be down on the host. Nothing was changed.`);
                                        setIsExportMenuOpen(false);
                                        return;
                                    }
                                    const data = await resp.json();
                                    importData(data);
                                    alert("Cloud backup loaded successfully!");
                                } catch (err) {
                                    alert(`The cloud backup for "${tName}" could not be read: ${err instanceof Error ? err.message : String(err)}. The file may be incomplete — try another backup.`);
                                }
                                setIsExportMenuOpen(false);
                            }} className="group flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                                <i className="fas fa-cloud-download-alt fa-fw text-gray-400 group-hover:text-gray-500 mr-3"></i>
                                <div>
                                    <p className="font-semibold">Load from Cloud</p>
                                    <p className="text-xs text-gray-500">Retrieve your latest settings via Tutor Name.</p>
                                </div>
                            </button>
                            {activeLearner && (
                                <>
                                    <div className="border-t border-gray-100"></div>
                                    <button 
                                        onClick={() => {
                                            const data = {
                                                isSingleLearnerProfile: true,
                                                learner: activeLearner
                                            };
                                            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `learner-profile-export-${activeLearner.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
                                            link.click();
                                            URL.revokeObjectURL(url);
                                            setIsExportMenuOpen(false);
                                        }} 
                                        className="group flex items-center w-full text-left px-4 py-3 text-sm text-brand-purple hover:bg-purple-50 transition-colors"
                                    >
                                        <i className="fas fa-user-tag fa-fw text-brand-purple group-hover:text-purple-600 mr-3 font-bold"></i>
                                        <div>
                                            <p className="font-semibold text-brand-purple">Export Active Learner</p>
                                            <p className="text-[10px] text-purple-600">Saves only "${activeLearner.name}" for standalone import.</p>
                                        </div>
                                    </button>
                                    <div className="border-t border-gray-100"></div>
                                    <button 
                                        onClick={handleExportToYoungLearnersDashboard} 
                                        className="group flex items-center w-full text-left px-4 py-3 text-sm text-brand-purple hover:bg-purple-50 transition-colors"
                                    >
                                        <i className="fas fa-child fa-fw text-brand-purple group-hover:text-purple-600 mr-3 font-bold"></i>
                                        <div>
                                            <p className="font-semibold text-brand-purple">Export to Young Learners Dashboard</p>
                                            <p className="text-[10px] text-purple-600">Copies "${activeLearner.name}" directly to Young Learners.</p>
                                        </div>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
             
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

             <Link to="/dashboard" title="Learner Dashboard" className="text-xl font-bold text-brand-gray-dark hover:text-brand-blue transition-colors p-3 rounded-lg hover:bg-gray-100 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                <i className="fas fa-home"></i>
             </Link>
             <Link 
                to="/onboarding" 
                title="Add New Learner" 
                onClick={(e) => {
                  if (!canAddLearner(learners.length, authTier)) {
                    e.preventDefault();
                    const limit = authTier === 'pro' ? PRO_LEARNER_LIMIT : FREE_LEARNER_LIMIT;
                    openUpgradeModal(`You have reached the ${authTier === 'pro' ? 'PRO' : 'Free Starter'} limit of ${limit} learner profiles (${learners.length} active). Upgrade to ${authTier === 'pro' ? 'VIP Elite Master for unlimited' : 'PRO (100) or VIP (Unlimited)'} learner profiles.`);
                  }
                }}
                className="flex items-center justify-center bg-brand-blue text-white font-bold w-10 h-10 sm:w-12 sm:h-12 rounded-full hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
             >
                {React.cloneElement(ICONS.plus as React.ReactElement<any>, { className: 'w-6 h-6' })}
             </Link>

             {/* Tutor Account & Tier Badge */}
             <button
                type="button"
                onClick={() => {
                  if (!authTutor) {
                    openAuthModal('login');
                  } else {
                    openUpgradeModal();
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors shadow-sm cursor-pointer"
                title={authTutor ? `Signed in as ${authTutor.name || authTutor.email} (${authTier.toUpperCase()})` : 'Tutor Sign In / Sign Up'}
             >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-purple flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {authTutor?.avatarUrl ? (
                    <img src={authTutor.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (authTutor?.name || tutorInfo?.name || 'T').charAt(0).toUpperCase()
                  )}
                </div>
                {/* The account button is the widest thing in the toolbar (263px), so its
                    two text lines are capped rather than allowed to set the width: with
                    a long display name it was what pushed the toolbar onto a second row
                    on a 1024–1279px window. */}
                <div className="hidden sm:flex flex-col items-start leading-none text-left min-w-0">
                  <span className="text-xs font-bold text-gray-800 max-w-[96px] xl:max-w-[140px] truncate flex items-center gap-1">
                    <span className="truncate">{authTutor ? (authTutor.name || authTutor.email.split('@')[0]) : 'Sign In'}</span>
                    {authTutor?.emailVerified && <span className="text-emerald-500 text-xs shrink-0" title="Verified Gmail Account">✅</span>}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium max-w-[110px] xl:max-w-[150px] truncate">
                    {authTier === 'vip' 
                      ? 'Unlimited Learners' 
                      : `${getRemainingLearnerSlots(learners.length, authTier)} slots left`}
                    {tierRemainingText && ` · ${tierRemainingText} left`}
                  </span>
                </div>
                <TierBadge tier={authTier} size="sm" />
                {tierRemainingText && (
                  <span
                    className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black whitespace-nowrap"
                    title={`${authTier.toUpperCase()} active until ${tierExpiresDateText}`}
                  >
                    ⏳ {tierRemainingText} left
                  </span>
                )}
             </button>

             {/* Admin Console Trigger for Master Admin */}
             {authTutor?.email === 'info.tutomy@gmail.com' && (
                <button
                  type="button"
                  onClick={() => openAdminModal()}
                  className="px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-transform hover:scale-105 cursor-pointer"
                  title="Super Admin Master Console"
                >
                  <i className="fas fa-shield-alt"></i>
                  <span className="hidden md:inline">Admin</span>
                </button>
             )}

             <div 
                id="tutor-header-avatar"
                className="relative group" 
                title={tutorInfo.name || 'Tutor'}
             >
                <img src={getAvatarUrl('Male', tutorInfo.avatarId, tutorInfo.name)} alt="Tutor Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-brand-purple shadow-sm" />
                <div 
                    className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setIsPastingTutor(true); }}
                    title="Paste new avatar"
                >
                    <i className="fas fa-paste text-xs text-brand-purple"></i>
                </div>
                {isPastingTutor && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 rounded-full flex items-center justify-center text-white text-xs text-center p-1 pointer-events-none">
                        <span>Paste<br/>(Ctrl+V)</span>
                    </div>
                )}
            </div>
          </nav>
        </div>
      </div>
    </header>
    <TutorSettingsModal isOpen={isTutorModalOpen} onClose={() => setIsTutorModalOpen(false)} />

    {/* Screen Alarm Prompt Overlay Modal */}
    {activeAlarmAlert && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="mt-16 bg-white rounded-2xl shadow-2xl border-4 border-amber-400 p-6 max-w-md w-full text-center relative overflow-hidden animate-bounce-subtle">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-red-500 to-amber-400"></div>
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-3xl mx-auto my-3 text-amber-500 animate-pulse">
                    🔔
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Class Starting in {notifSettings.remindMinutes} Minutes!</h3>
                <p className="text-slate-600 text-sm mt-3 font-semibold">
                    You have an upcoming event:
                </p>
                <div className="my-4 p-4 bg-slate-50 rounded-xl border border-slate-100 font-extrabold text-slate-850">
                    <p className="text-base text-brand-purple leading-normal">
                        {activeAlarmAlert.title}
                    </p>
                    {activeAlarmAlert.learnerName && (
                        <p className="text-xs text-slate-500 mt-1">
                            Learner: {activeAlarmAlert.learnerName}
                        </p>
                    )}
                    <p className="text-sm text-amber-600 mt-2 font-mono">
                        ⏰ Scheduled for {activeAlarmAlert.time}
                    </p>
                </div>
                <p className="text-xs text-gray-400">
                    Please get your teaching whiteboard details and lesson notes ready.
                </p>
                <div className="mt-5 flex gap-2">
                    <button 
                        type="button"
                        onClick={() => {
                            if (window.speechSynthesis) window.speechSynthesis.cancel();
                            setActiveAlarmAlert(null);
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-lg text-sm transition-transform cursor-pointer"
                    >
                        Dismiss
                    </button>
                    {activeAlarmAlert.id && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.speechSynthesis) window.speechSynthesis.cancel();
                                // Snooze for 5 minutes (300,000 ms)
                                const snoozeDurationMs = 5 * 60 * 1000;
                                setSnoozedEvents(prev => ({
                                    ...prev,
                                    [activeAlarmAlert.id]: Date.now() + snoozeDurationMs
                                }));
                                // Reset alarmed status so it can trigger again when the snooze expires
                                setAlarmedEventIds(prev => prev.filter(id => id !== activeAlarmAlert.id));
                                setActiveAlarmAlert(null);
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-lg text-sm transition-transform cursor-pointer whitespace-nowrap"
                        >
                            ⏰ Snooze (5m)
                        </button>
                    )}
                </div>
            </div>
        </div>
    )}

    </>
  );
};

export default Header;