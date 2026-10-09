import React, { useState, useEffect } from 'react';
import { Learner } from '../../../types2';
import { useAppStore } from '../../../store/useAppStore';
import { useLearnerStore } from '../../../store/useLearnerStore';
import GroupedVoiceOptions from '../../ui/GroupedVoiceOptions';
import { playSynthAlarm } from '../../../utils/audioUtils';
import { generatePersonalizedTemplates, playSoundMeme } from '../../../utils/templateUtils';

interface LessonTimerProps {
    learner: Learner;
}

const ALARMS = [
    { id: 'zen', icon: '🕊️', name: 'Zen Bell', desc: 'Serene deep Tibetan chime' },
    { id: 'digital', icon: '🎵', name: 'Active Beeps', desc: 'Crisp high-frequency digital pulses' },
    { id: 'classic', icon: '🔔', name: 'Brass Ring', desc: 'Classic bright mechanical bell alarm' },
    { id: 'synth', icon: '🚀', name: 'Synth Sweep', desc: 'Upbeat cyber-futurism star-rise' },
    { id: 'voice', icon: '📢', name: 'Vocal Praise', desc: 'Personalized speech template alerts' },
    { id: 'meme', icon: '🎭', name: 'Sound Meme', desc: 'Custom MyInstants sound meme clip' }
];

const PRESETS = [15, 30, 45, 60, 90];

const LOCAL_VETTED_MEMES = [
    { name: "Bruh Sound", sound: "https://www.myinstants.com/media/sounds/bruh.mp3" },
    { name: "Emotional Damage", sound: "https://www.myinstants.com/media/sounds/emotional-damage.mp3" },
    { name: "Vine Boom", sound: "https://www.myinstants.com/media/sounds/vine-boom-sound-effect.mp3" },
    { name: "Noice", sound: "https://www.myinstants.com/media/sounds/noice.mp3" },
    { name: "GTA Wasted", sound: "https://www.myinstants.com/media/sounds/gta-sa-wasted-death-sound.mp3" },
    { name: "Sad Violin", sound: "https://www.myinstants.com/media/sounds/sad-violin.mp3" },
    { name: "Directed by Robert Weide", sound: "https://www.myinstants.com/media/sounds/directed-by-robert-b-weide.mp3" },
    { name: "MLG Airhorn", sound: "https://www.myinstants.com/media/sounds/mlg-airhorn.mp3" },
    { name: "Coffin Dance", sound: "https://www.myinstants.com/media/sounds/coffin-dance-meme.mp3" },
    { name: "Run Meme", sound: "https://www.myinstants.com/media/sounds/run-meme-sound.mp3" },
    { name: "SpongeBob - My Leg", sound: "https://www.myinstants.com/media/sounds/spongebob-my-leg.mp3" },
    { name: "Anime Wow Effect", sound: "https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3" },
    { name: "FBI Open Up", sound: "https://www.myinstants.com/media/sounds/fbi-open-up-sound-effect.mp3" },
    { name: "Denied Buzzer", sound: "https://www.myinstants.com/media/sounds/buzzer.mp3" },
    { name: "Correct Ding Chime", sound: "https://www.myinstants.com/media/sounds/corrected.mp3" },
    { name: "Oof Roblox Death", sound: "https://www.myinstants.com/media/sounds/roblox-death-sound_1.mp3" },
    { name: "2005 Years Later", sound: "https://www.myinstants.com/media/sounds/2000-years-later-spongebob-time-card.mp3" },
    { name: "What are you doing step bro", sound: "https://www.myinstants.com/media/sounds/sound-effect-what-are-you-doing-step-bro.mp3" },
    { name: "He needs some milk", sound: "https://www.myinstants.com/media/sounds/he-needs-some-milk-sound-effect.mp3" },
    { name: "Damn Son", sound: "https://www.myinstants.com/media/sounds/damn_son.mp3" },
    { name: "Surprise Motherfucker", sound: "https://www.myinstants.com/media/sounds/surprise-motherfucker_1.mp3" },
    { name: "Nani? (Omae Wa Mou)", sound: "https://www.myinstants.com/media/sounds/omae-wa-mou-shindeiru.mp3" },
    { name: "Why are you running", sound: "https://www.myinstants.com/media/sounds/why-are-you-running.mp3" },
    { name: "Windows XP Error Chime", sound: "https://www.myinstants.com/media/sounds/windows-xp-error-sound.mp3" },
    { name: "Let Me In Eric Andre", sound: "https://www.myinstants.com/media/sounds/let-me-in-eric-andre.mp3" },
    { name: "Oh No TikTok Song", sound: "https://www.myinstants.com/media/sounds/oh-no-tiktok.mp3" },
    { name: "Yeah Boy", sound: "https://www.myinstants.com/media/sounds/yeah-boy-meme-sound-effect.mp3" },
    { name: "Wilhelm Scream", sound: "https://www.myinstants.com/media/sounds/wilhelm-scream-original-sound-effect.mp3" },
    { name: "GTA V Mission Passed", sound: "https://www.myinstants.com/media/sounds/gta-v-mission-passed-hud-sound-effect.mp3" },
    { name: "Nokia Ringtone Retro", sound: "https://www.myinstants.com/media/sounds/nokia_-ringtone.mp3" },
    { name: "Clash of Clans Bell", sound: "https://www.myinstants.com/media/sounds/clash-of-clans-loading.mp3" },
    { name: "Fortnite Default Dance", sound: "https://www.myinstants.com/media/sounds/fortnite-default-dance.mp3" },
    { name: "Jeopardy Theme Chime", sound: "https://www.myinstants.com/media/sounds/jeopardy-think-music_1.mp3" },
    { name: "Metal Gear Solid Alert", sound: "https://www.myinstants.com/media/sounds/mgs_alert.mp3" },
    { name: "X-Files Theme Song", sound: "https://www.myinstants.com/media/sounds/the-x-files-theme-song.mp3" },
    { name: "Goofy Slide Whistle", sound: "https://www.myinstants.com/media/sounds/goofy-slide-whistle.mp3" },
    { name: "Cricket Sound Effect", sound: "https://www.myinstants.com/media/sounds/crickets.mp3" },
    { name: "Airhorn Triple Bass", sound: "https://www.myinstants.com/media/sounds/triple-airhorn.mp3" },
    { name: "Success Chime", sound: "https://www.myinstants.com/media/sounds/success-sound-effect.mp3" },
    { name: "Tada Fanfare", sound: "https://www.myinstants.com/media/sounds/tada.mp3" }
];

const LessonTimer: React.FC<LessonTimerProps> = ({ learner }) => {
    const startTimer = useAppStore(state => state.startTimer);
    const speak = useAppStore(state => state.speak);
    const plan = (learner as any).coursePlan || (learner as any).plan || {};
    const [duration, setDuration] = useState<number>(Number(plan.duration) || 60);
    const [breakInterval, setBreakInterval] = useState(0); // 0 for no breaks
    const [selectedAlarm, setSelectedAlarm] = useState<string>((learner as any).selectedAlarmType || 'zen');
    const is10MinEnabled = (learner as any).enable10MinAlert !== false;
    const handleToggle10Min = () => {
        const updateLearner = useLearnerStore.getState().updateLearner;
        updateLearner({
            ...learner,
            enable10MinAlert: !is10MinEnabled
        } as any);
    };

    const isVocalPraiseEnabled = (learner as any).enableVocalPraise !== false;
    const handleToggleVocalPraise = () => {
        const updateLearner = useLearnerStore.getState().updateLearner;
        updateLearner({
            ...learner,
            enableVocalPraise: !isVocalPraiseEnabled
        } as any);
    };

    // Live MyInstants Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ name: string; sound: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Vocal Praise & Aloud Alerts Configuration States
    const voices = useAppStore(state => state.voices);
    const initVoices = useAppStore(state => state.initVoices);
    const [isPraiseConfigOpen, setIsPraiseConfigOpen] = useState(false);
    const [localTemplates, setLocalTemplates] = useState<any[]>([]);

    const selectedVoiceName = (learner as any).selectedAlarmVoice || useAppStore.getState().globalVoice || '';

    const generateVocalTemplates = (l: any) => {
        const name = l.name || 'Learner';
        const lang = l.targetLanguage || 'English';
        const interests = l.personalInfo?.interests || '';
        const latestTopic = l.sessions && l.sessions.length > 0
            ? l.sessions[l.sessions.length - 1].lessonName || l.sessions[l.sessions.length - 1].title || ''
            : '';
        
        return [
            { 
                id: 'welcome', 
                title: 'Warm Welcome', 
                icon: '👋', 
                text: `Welcome back, ${name}! Let's have an amazing ${lang} session together today${latestTopic ? ` focusing on ${latestTopic}` : ''}!` 
            },
            { 
                id: 'm15', 
                title: '15-Minute Milestone', 
                icon: '⏱️', 
                text: `Fantastic progress, ${name}! We have completed our first fifteen minutes of ${lang} practice. Keep up the high energy!` 
            },
            { 
                id: 'm30', 
                title: '30-Minute Midpoint', 
                icon: '🚀', 
                text: `Thirty minutes in, ${name}! We are officially halfway through. Your ${lang} skills are shining today!` 
            },
            { 
                id: 'homework', 
                title: 'Homework Success', 
                icon: '📝', 
                text: `Splendid effort on your homework assignments, ${name}! Your dedication to mastering ${lang} is truly paying off.` 
            },
            { 
                id: 'vocab', 
                title: 'Vocabulary Unlock', 
                icon: '🔑', 
                text: `Incredible vocabulary usage, ${name}! You are expressing your thoughts so naturally${interests ? ` and connecting it to your interest in ${interests}` : ''}.` 
            },
            { 
                id: 'goodbye', 
                title: 'Final Praise & Goodbye', 
                icon: '🎉', 
                text: `Session complete! Tremendous work today, ${name}. You've made solid progress in ${lang}. Enjoy your rest and see you next time!` 
            }
        ];
    };

    useEffect(() => {
        initVoices();
    }, [initVoices]);

    useEffect(() => {
        if ((learner as any).vocalPraiseTemplates && (learner as any).vocalPraiseTemplates.length > 0) {
            setLocalTemplates((learner as any).vocalPraiseTemplates);
        } else {
            setLocalTemplates(generateVocalTemplates(learner));
        }
    }, [learner]);

    const handleVoiceSelect = (name: string) => {
        const updateLearner = useLearnerStore.getState().updateLearner;
        updateLearner({
            ...learner,
            selectedAlarmVoice: name
        } as any);
        speak("Voice updated! Ready to announce your lesson milestones.", name);
    };

    const handleSaveTemplates = () => {
        const updateLearner = useLearnerStore.getState().updateLearner;
        updateLearner({
            ...learner,
            vocalPraiseTemplates: localTemplates
        } as any);
        speak("All 6 custom praise presets saved successfully!");
    };

    const handleUpdateTemplateText = (index: number, val: string) => {
        const next = [...localTemplates];
        next[index] = { ...next[index], text: val };
        setLocalTemplates(next);
    };

    const handleRegenerateTemplates = () => {
        const fresh = generateVocalTemplates(learner);
        setLocalTemplates(fresh);
        const updateLearner = useLearnerStore.getState().updateLearner;
        updateLearner({
            ...learner,
            vocalPraiseTemplates: fresh
        } as any);
        speak("Regenerated all 6 alarm presets based on learner profile!", selectedVoiceName);
    };

    const handleMemeSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const term = searchQuery.trim().toLowerCase();
        if (!term) return;
        setIsSearching(true);

        // 1. Instant local fuzzy search
        const locallyMatched = LOCAL_VETTED_MEMES.filter(m => 
            m.name.toLowerCase().includes(term)
        );
        setSearchResults(locallyMatched);

        // 2. Query official server api proxy (which uses robust/reliable JSON API from MyInstants)
        try {
            const apiRes = await fetch(`/api/sounds/search?q=${encodeURIComponent(searchQuery)}`);
            if (apiRes.ok) {
                const apiData = await apiRes.json();
                const fetchedResults = (apiData.results || [])
                    .filter((r: any) => r.sound)
                    .map((r: any) => ({
                        name: r.name,
                        sound: r.sound
                    }));
                
                setSearchResults(prev => {
                    const combined = [...prev, ...fetchedResults];
                    // de-duplicate
                    return combined.filter((val, idx, self) => 
                        self.findIndex(t => t.sound === val.sound) === idx
                    );
                });
                setIsSearching(false);
                return;
            }
        } catch (err) {
            console.error("Local sound proxy failed, trying CORS fallback", err);
        }

        // 3. Fallback to direct AllOrigins CORS proxy
        try {
            const externalUrl = `https://api.allorigins.win/get?url=${encodeURIComponent('https://www.myinstants.com/api/v1/instants/?format=json&name=' + encodeURIComponent(searchQuery))}`;
            const extRes = await fetch(externalUrl);
            if (extRes.ok) {
                const extBlob = await extRes.json();
                const extData = JSON.parse(extBlob.contents);
                const extResults = (extData.results || [])
                    .filter((r: any) => r.sound)
                    .map((r: any) => ({
                        name: r.name,
                        sound: r.sound
                    }));

                setSearchResults(prev => {
                    const combined = [...prev, ...extResults];
                    return combined.filter((val, idx, self) => 
                        self.findIndex(t => t.sound === val.sound) === idx
                    );
                });
            }
        } catch (err) {
            console.error("AllOrigins search fallback failed", err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAssignMeme = (target: 'finish' | 'break' | '10min', name: string, url: string) => {
        const updateLearner = useLearnerStore.getState().updateLearner;
        const updated: any = { ...learner };
        if (target === 'finish') {
            updated.selectedMemeNameFinish = name;
            updated.selectedMemeUrlFinish = url;
            updated.selectedMemeName = name; // legacy backup
            updated.selectedMemeUrl = url;
        } else if (target === 'break') {
            updated.selectedMemeNameBreak = name;
            updated.selectedMemeUrlBreak = url;
        } else if (target === '10min') {
            updated.selectedMemeName10Min = name;
            updated.selectedMemeUrl10Min = url;
        }
        updateLearner(updated);
    };

    const handleStart = () => {
        if (duration < 1) {
            alert("Lesson duration must be at least 1 minute.");
            return;
        }
        
        // Save preset alarm type choice on learner settings
        const updateLearner = useLearnerStore.getState().updateLearner;
        updateLearner({
            ...learner,
            selectedAlarmType: selectedAlarm
        });
        
        startTimer(learner.id, learner.name, duration, breakInterval, selectedAlarm);
    };

    const memeVolume = (learner as any).memeVolume !== undefined ? (learner as any).memeVolume : 0.25;

    const handlePreviewAlarm = (e: React.MouseEvent, type: string) => {
        e.stopPropagation();
        if (type === 'voice') {
            const voice = (learner as any).selectedAlarmVoice;
            const templates = (learner as any).vocalPraiseTemplates || generatePersonalizedTemplates(learner);
            const completeText = templates[5]?.text || "Your live lesson is completed. Outstanding effort today!";
            // Play Active Beeps first, then vocalize praise
            playSynthAlarm('digital');
            if (isVocalPraiseEnabled) {
                setTimeout(() => {
                    speak(completeText, voice);
                }, 1200);
            }
        } else if (type === 'meme') {
            const memeUrl = (learner as any).selectedMemeUrlFinish || (learner as any).selectedMemeUrl;
            if (memeUrl) {
                playSoundMeme(memeUrl, memeVolume);
            } else {
                // play fallback standard bruh
                playSoundMeme("https://www.myinstants.com/media/sounds/bruh.mp3", memeVolume);
            }
        } else {
            playSynthAlarm(type);
        }
    };

    return (
        <div className="p-5 bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-2xl shadow-lg space-y-5 font-sans">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <span className="text-2xl">⚡</span>
                <div>
                    <h3 className="font-extrabold text-lg text-slate-800 leading-none">Start Live Lesson</h3>
                    <p className="text-xs text-gray-500 mt-1">Configure study parameters, periodic breaks, and notifications</p>
                </div>
            </div>

            {/* Duration and Presets */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label htmlFor="duration-input" className="text-sm font-bold text-slate-700">Lesson Duration</label>
                    <span className="text-xs font-mono font-bold bg-blue-50 text-brand-blue px-2 py-0.5 rounded-md">
                        {duration} mins
                    </span>
                </div>
                <div className="flex gap-2 items-center">
                    <input 
                        type="number" 
                        id="duration-input"
                        value={duration} 
                        onChange={e => setDuration(Math.max(1, Number(e.target.value)))} 
                        className="w-24 p-2 bg-white border border-gray-300 rounded-xl font-bold font-mono text-center focus:ring-2 focus:ring-brand-blue"
                        min="1"
                    />
                    {/* Presets Grid */}
                    <div className="flex flex-wrap gap-1.5 flex-1 justify-end">
                        {PRESETS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setDuration(p)}
                                className={`text-xs font-extrabold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                                    duration === p 
                                        ? 'bg-slate-900 text-white shadow-md transform -translate-y-0.5' 
                                        : 'bg-white border border-gray-200 hover:border-gray-400 text-slate-600'
                                }`}
                            >
                                {p}m
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Break Interval Options */}
            <div className="space-y-1.5">
                <label htmlFor="break-interval-select" className="text-sm font-bold text-slate-700 block">Periodic Mindful Breaks</label>
                <select
                    id="break-interval-select"
                    value={breakInterval}
                    onChange={e => setBreakInterval(Number(e.target.value))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue text-sm font-semibold text-slate-700"
                >
                    <option value="0">Continuous Study (No Alarm Breaks)</option>
                    <option value="15">Short Interval — Break every 15 minutes</option>
                    <option value="20">Standard Interval — Break every 20 minutes</option>
                    <option value="25">Focus Interval — Break every 25 minutes</option>
                    <option value="30">Deep Study — Break every 30 minutes</option>
                </select>
                <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                    {breakInterval > 0 
                      ? `We will play a gentle reminder to rest and stretch every ${breakInterval} minutes during this lesson session.`
                      : 'We will keep training straight through without midway break bells.'
                    }
                </p>
            </div>

            {/* Alarm Selectors */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">Completion Notification Alert</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALARMS.map((alarm) => (
                        <div
                            key={alarm.id}
                            onClick={() => setSelectedAlarm(alarm.id)}
                            className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 select-none group relative ${
                                selectedAlarm === alarm.id 
                                    ? 'bg-cyan-50/20 border-cyan-500 shadow-md ring-1 ring-cyan-400/20' 
                                    : 'bg-white border-gray-150 hover:border-gray-300'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={`text-xl transition-transform duration-300 group-hover:scale-125`}>{alarm.icon}</span>
                                <div className="text-left">
                                    <p className={`text-xs font-extrabold leading-none ${selectedAlarm === alarm.id ? 'text-slate-800' : 'text-slate-700'}`}>
                                        {alarm.name}
                                    </p>
                                    <p className="text-[9px] text-gray-400 mt-1 truncate max-w-[120px] font-medium">
                                        {alarm.desc}
                                    </p>
                                </div>
                            </div>
                            
                            <button
                                type="button"
                                onClick={(e) => handlePreviewAlarm(e, alarm.id)}
                                className={`text-[10px] uppercase font-black px-2 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                                    selectedAlarm === alarm.id
                                        ? 'bg-slate-900 border-slate-900 text-white hover:bg-black shadow-sm'
                                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-slate-700'
                                }`}
                                title={`Preview ${alarm.name}`}
                            >
                                <span>🔊</span>
                                <span className="text-[9px]">Test</span>
                            </button>
                        </div>
                    ))}
                </div>
                {selectedAlarm === 'meme' && (
                    <div className="bg-amber-50/20 border border-amber-200/50 p-4 rounded-xl text-left text-[11px] font-semibold space-y-4 animate-fade-in text-slate-800 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1.5 font-bold border-b border-amber-100 dark:border-slate-800 pb-1.5 text-amber-900 dark:text-amber-400">
                            <span>🎭</span> Live Sound Meme Configurator
                        </div>

                        {/* Volume Accurate Slider */}
                        <div className="space-y-1.5 p-3 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-150 dark:border-slate-800">
                            <div className="flex justify-between items-center">
                                <label htmlFor="volume-slider" className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                    <span>🔊</span> Meme Volume Control
                                </label>
                                <span className="text-[10px] font-bold text-slate-500 font-mono">
                                    {Math.round(memeVolume * 100)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                id="volume-slider"
                                min="0"
                                max="1"
                                step="0.01"
                                value={memeVolume}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const updateLearner = useLearnerStore.getState().updateLearner;
                                    updateLearner({
                                        ...learner,
                                        memeVolume: val
                                    } as any);
                                }}
                                className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                            <p className="text-[9px] text-slate-400 font-medium font-sans">
                                Default is set safe at 25% because search sounds are usually very loud.
                            </p>
                        </div>
                        
                        {/* Current Meme Presets */}
                        <div className="grid grid-cols-1 gap-2.5">
                            {/* FINISH PRESET */}
                            <div className="flex items-center justify-between bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800">
                                <div className="min-w-0 flex-1 pr-2">
                                    <span className="block text-[8px] uppercase font-black text-amber-600 dark:text-amber-400 tracking-wider">Finish Lesson Alarm</span>
                                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate block">
                                        {(learner as any).selectedMemeNameFinish || (learner as any).selectedMemeName || "Bruh Sound (Default)"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => playSoundMeme((learner as any).selectedMemeUrlFinish || (learner as any).selectedMemeUrl || "https://www.myinstants.com/media/sounds/bruh.mp3", memeVolume)}
                                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0"
                                    title="Test Alarm Sound"
                                >
                                    🔊 Preview
                                </button>
                            </div>

                            {/* BREAK PRESET */}
                            <div className="flex items-center justify-between bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800">
                                <div className="min-w-0 flex-1 pr-2">
                                    <span className="block text-[8px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">Mid-Lesson Break Alarm</span>
                                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate block">
                                        {(learner as any).selectedMemeNameBreak || "Standard Alert Interval"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const url = (learner as any).selectedMemeUrlBreak;
                                        if (url) {
                                            playSoundMeme(url, memeVolume);
                                        } else {
                                            playSynthAlarm('digital');
                                        }
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0"
                                    title="Test Alarm Sound"
                                >
                                    🔊 Preview
                                </button>
                            </div>

                            {/* 10MIN PRESET WITH TOGGLE */}
                            <div className="bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1 pr-2">
                                        <span className="block text-[8px] uppercase font-black text-indigo-600 dark:text-indigo-400 tracking-wider">10-Min Wrap-up Alarm</span>
                                        <span className={`font-extrabold text-xs truncate block ${is10MinEnabled ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 line-through'}`}>
                                            {(learner as any).selectedMemeName10Min || "Standard Alert Interval"}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const url = (learner as any).selectedMemeUrl10Min;
                                            if (url) {
                                                playSoundMeme(url, memeVolume);
                                            } else {
                                                playSynthAlarm('digital');
                                            }
                                        }}
                                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0"
                                        title="Test Alarm Sound"
                                    >
                                        🔊 Preview
                                    </button>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Activate 10 minutes before finish alert</span>
                                    <button
                                        type="button"
                                        onClick={handleToggle10Min}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            is10MinEnabled ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-705'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                is10MinEnabled ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search Interactive Console */}
                        <div className="space-y-2 border-t border-amber-250/20 dark:border-slate-800 pt-3">
                            <span className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">Search & Assign Sound Clips</span>
                            <form onSubmit={handleMemeSearch} className="flex gap-1.5">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search e.g. bruh, airhorn, metal gear, win..."
                                    className="flex-1 p-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-amber-400"
                                />
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white font-black text-xs px-3 rounded-lg cursor-pointer flex items-center justify-center min-w-[70px]"
                                >
                                    {isSearching ? "..." : "Search"}
                                </button>
                            </form>

                            {/* Search Results Shelf */}
                            {searchResults.length > 0 && (
                                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 border border-slate-150 dark:border-slate-800 p-2 rounded-xl bg-white dark:bg-slate-850/50">
                                    {searchResults.map((m) => (
                                        <div key={m.name + m.sound} className="flex items-center justify-between gap-1.5 p-2 bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-900/10 dark:hover:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-xs">
                                            <div className="text-left flex-1 min-w-0 pr-1">
                                                <p className="font-extrabold text-slate-700 dark:text-slate-250 truncate" title={m.name}>{m.name}</p>
                                            </div>
                                            <div className="flex gap-1 items-center shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => playSoundMeme(m.sound, memeVolume)}
                                                    className="bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 w-7 h-7 flex items-center justify-center rounded-lg text-xs cursor-pointer"
                                                    title="Preview Sound"
                                                >
                                                    🔊
                                                </button>
                                                
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAssignMeme('finish', m.name, m.sound)}
                                                        className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black py-1 px-1.5 rounded-md cursor-pointer whitespace-nowrap"
                                                    >
                                                        Finish
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAssignMeme('break', m.name, m.sound)}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black py-1 px-1.5 rounded-md cursor-pointer whitespace-nowrap"
                                                    >
                                                        Break
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAssignMeme('10min', m.name, m.sound)}
                                                        className="bg-indigo-650 hover:bg-indigo-700 text-white text-[9px] font-black py-1 px-1.5 rounded-md cursor-pointer whitespace-nowrap"
                                                    >
                                                        10m
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {searchResults.length === 0 && !isSearching && (
                                <div className="text-center py-4 bg-white/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                    <span className="text-lg">🔍</span>
                                    <p className="text-[10px] text-slate-500 font-bold mt-1">Search the MyInstants database above</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">Assign direct custom audio meme playbacks for finish, break, and wrap-up separately!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {selectedAlarm === 'voice' && (
                    <div className="bg-purple-50 text-purple-950 border border-purple-100 p-2.5 rounded-xl text-left text-[11px] font-semibold space-y-1 animate-fade-in">
                        <p className="flex items-center gap-1.5 font-bold text-brand-purple">
                            <span>📢</span> Vocal Voice: {(learner as any).selectedAlarmVoice?.split(' ').slice(0, 3).join(' ') || 'Standard System Voice'}
                        </p>
                        <p className="text-gray-400 font-medium leading-normal text-[10px]">
                            Change voice profiles or edit the 15-30 minute segment alerts in the <strong className="text-brand-purple">Vocal Praise &amp; Aloud Alarms panel below</strong>!
                        </p>
                    </div>
                )}
            </div>

            {/* Vocal Praise & Aloud Alerts Configuration Accordion */}
            <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                <button
                    type="button"
                    onClick={() => setIsPraiseConfigOpen(!isPraiseConfigOpen)}
                    className="w-full flex items-center justify-between p-4 font-bold text-sm text-slate-800 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    <span className="flex items-center gap-2 text-slate-800">
                        <span>🎙️</span> Vocal Praise & Aloud Alarms
                    </span>
                    <span className={`text-slate-400 transform transition-transform duration-200 ${isPraiseConfigOpen ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>
                
                {isPraiseConfigOpen && (
                    <div className="p-4 border-t border-slate-100 space-y-4 animate-fade-in">
                        {/* Master Toggle */}
                        <div className="flex items-center justify-between p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl">
                            <div>
                                <span className="block text-xs font-black text-purple-950 flex items-center gap-1.5">
                                    <span>🔊</span> Spoken Praise & Alarms
                                </span>
                                <span className="block text-[10px] text-purple-700/80 font-semibold leading-normal mt-1">
                                    Enable or disable all automated spoken interval praises and wrap-up voice alarms for this learner.
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleToggleVocalPraise}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    isVocalPraiseEnabled ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        isVocalPraiseEnabled ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Voice Profile Choice */}
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/60 space-y-3">
                            <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                                <span>📢</span> Choose Aloud Voice Profile
                            </h5>
                            <p className="text-[10px] text-gray-500 leading-normal font-semibold">
                                Select the SpeechSynthesis read-aloud voice used for study interval reminders and praise alarms.
                            </p>
                            <div className="space-y-1.5 text-left">
                                <label htmlFor="praise-voice-select" className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Available Browser Voices</label>
                                <select
                                    id="praise-voice-select"
                                    value={selectedVoiceName}
                                    onChange={(e) => handleVoiceSelect(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-purple text-xs font-bold text-slate-700"
                                >
                                    {voices.length === 0 ? (
                                        <option value="">(Loading system voices...)</option>
                                    ) : (
                                        <GroupedVoiceOptions voices={voices} valueKey="name" />
                                    )}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => speak("Super work, let me announce your alarms!", selectedVoiceName)}
                                className="w-full bg-slate-900 hover:bg-black text-white font-extrabold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer text-center"
                            >
                                🔊 Test Selected Voice
                            </button>
                        </div>

                        {/* Personalized Alarm Templates */}
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/60 space-y-3">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                                <div className="text-left">
                                    <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                                        <span>🎙️</span> Personalized Alarm Presets
                                    </h5>
                                    <p className="text-[9px] text-gray-400 font-semibold mt-0.5">
                                        6 custom alerts dynamically adapted to their profile!
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRegenerateTemplates}
                                    className="text-[9px] font-black bg-purple-50 text-brand-purple hover:bg-brand-purple hover:text-white px-2 py-1 rounded-lg transition-all cursor-pointer border border-brand-purple/10 flex items-center gap-0.5"
                                    title="Regenerate presets"
                                >
                                    <span>🔄</span> Refresh
                                </button>
                            </div>

                            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                                {localTemplates.map((template, index) => (
                                    <div key={template.id} className="p-2.5 bg-white border border-slate-200/60 rounded-xl space-y-1.5 transition-all hover:border-slate-300">
                                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm leading-none">{template.icon}</span>
                                                <span className="font-extrabold text-slate-700">{template.title}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => speak(template.text, selectedVoiceName)}
                                                className="text-[8px] font-black hover:text-brand-purple flex items-center gap-0.5 text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200/40 p-1 rounded cursor-pointer transition-all"
                                            >
                                                🔊 Test
                                            </button>
                                        </div>
                                        <textarea
                                            rows={2}
                                            value={template.text}
                                            onChange={(e) => handleUpdateTemplateText(index, e.target.value)}
                                            className="w-full text-[11px] font-semibold p-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-purple rounded-lg text-slate-700 leading-normal transition-all resize-none text-left"
                                        />
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={handleSaveTemplates}
                                className="w-full bg-brand-purple hover:bg-purple-600 text-white font-extrabold py-2 rounded-lg text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shadow-sm"
                            >
                                <span>💾</span> Save All 6 Preset Alarms
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={handleStart} 
                className="w-full bg-slate-900 hover:bg-black text-white font-extrabold py-3.5 rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.99] shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
                <span className="text-base">🚀</span> Start Lesson Now
            </button>
        </div>
    );
};

export default LessonTimer;
