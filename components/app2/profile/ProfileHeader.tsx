import React, { useState, useEffect, useCallback, useRef } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useNavigate } from 'react-router-dom';
import { Learner } from '../../../types2';
import { formatSkillRatings } from './reviewSkills';
import { ICONS } from '../../../constants2';
import { getAvatarUrl, generateRandomAvatarId } from '../../../services/avatarService';
import { saveCustomAvatar } from '../../../services/customAvatarStore';
import { useLearnerStore } from '../../../store/useLearnerStore';
import { useAppStore } from '../../../store/useAppStore';
import LearnerTime from './LearnerTime';
import { EditableStreak } from '../EditableStreak';
import { XPVisual } from '../XPVisual';
import LZString from 'lz-string';

interface ProfileHeaderProps {
    learner: Learner;
    onGenerateReport: () => void;
    onUpdate: (updatedLearner: Learner) => void;
    onComposeEmail: () => void;
    onManualUpdateClick?: () => void;
}

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


const ProfileHeader: React.FC<ProfileHeaderProps> = ({ learner, onGenerateReport, onUpdate, onComposeEmail, onManualUpdateClick }) => {
    const navigate = useNavigate();
    const updateLearnerXP = useLearnerStore(state => state.updateLearnerXP);
    const runAIUpdatesForLearner = useLearnerStore(state => state.runAIUpdatesForLearner);
    
    const speak = useAppStore(state => state.speak);
    const loading = useAppStore(state => state.loading);
    const [isPasting, setIsPasting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [copiedFacts, setCopiedFacts] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const [currentSlideId, setCurrentSlideId] = useState(learner.avatarId);

    const fallbackCopyTextToClipboard = (text: string) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setCopiedFacts(true);
            setTimeout(() => setCopiedFacts(false), 2500);
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
    };

    const handleCopyProfileFacts = () => {
        const competenciesText = (learner.competencies || []).map((c, i) => {
            return `${i + 1}. ${c.name} [Type: ${c.type || 'General'} | Status: ${c.status || 'Active'} | Progress: ${c.progress ?? 0}%]${c.notes ? ` - Note: ${c.notes}` : ''}`;
        }).join('\n') || 'No competencies recorded.';

        const personalInfoText = [
            `- Name: ${learner.name || 'N/A'}`,
            `- Email: ${learner.email || 'N/A'}`,
            `- Phone: ${learner.phone || 'N/A'}`,
            `- Country/City: ${[learner.country, learner.city].filter(Boolean).join(', ') || 'N/A'}`,
            `- Timezone: ${learner.timezone || 'N/A'}`,
            `- Current Level: ${learner.level || 'N/A'} (CEFR: ${learner.cefrLevel || 'N/A'})`,
            `- Native Language (L1): ${learner.l1Language || 'N/A'}`,
            `- Target Language: ${learner.targetLanguage || 'N/A'}`,
            `- Languages Spoken: ${(learner.languages || []).join(', ') || 'N/A'}`,
            `- Occupation: ${learner.occupation || 'N/A'}`,
            `- Gender / Birthday: ${[learner.gender, learner.birthday].filter(Boolean).join(' | ') || 'N/A'}`,
            `- Learning Style: ${learner.learningStyle || 'N/A'}`,
            `- Interests: ${learner.interests || 'N/A'}`,
            `- Stated Goals: ${(learner.goals || learner.goalsList || []).join(', ') || 'N/A'}`,
            `- Clinical Profile / General Notes: ${learner.notes || 'N/A'}`
        ].join('\n');

        const needsList = (learner.needs || []).map((n, i) => {
            return `${i + 1}. ${n.name} (Priority: ${n.priority || 'medium'}, Status: ${n.status || 'active'})`;
        }).join('\n') || 'No specific needs recorded.';

        const needsWantsExpectationsText = [
            `Needs:\n${needsList}`,
            `Wants & Focus Areas:\n- Situations: ${learner.situations || 'N/A'}\n- Focus: ${learner.focus || 'N/A'}`,
            `Expectations:\n${learner.expectations || 'None specified.'}`
        ].join('\n\n');

        const plan = learner.coursePlan || learner.plan;
        let coursePlanText = 'No formal course plan configured.';
        if (plan) {
            const modulesText = (plan.modules || []).map((m, i) => {
                const topStr = (m.topics || []).join(', ');
                return `  Module ${i + 1}: ${m.title || 'Untitled'}${topStr ? ` (Topics: ${topStr})` : ''}`;
            }).join('\n');
            coursePlanText = [
                `- Course Name: ${plan.courseName || plan.title || 'N/A'}`,
                `- Target Level: ${plan.targetLevel || 'N/A'}`,
                `- Total Sessions: ${plan.totalSessions || 'N/A'}`,
                modulesText ? `Modules:\n${modulesText}` : ''
            ].filter(Boolean).join('\n');
        }

        let factsStr = 'No extra facts recorded.';
        if (learner.facts) {
            factsStr = typeof learner.facts === 'string' ? learner.facts : JSON.stringify(learner.facts, null, 2);
        }

        const sessionReviews = (learner.sessionHistory || [])
            .filter(s => s.review)
            .slice(-5)
            .map(s => {
                /*
                 * The four teaching-quality ratings are appended to the same line rather than
                 * given their own block, so the analyser reads them as part of the review they
                 * came from instead of having to match them up by date. Reviews written before
                 * these existed format to an empty string and leave no trace.
                 */
                const quality = formatSkillRatings(s.review?.skillRatings);
                return `- [${s.date}] ${s.lessonName || s.title || 'Session'}: Rating ${s.review?.stars}/5. Liked: "${s.review?.liked || 'N/A'}". Disliked: "${s.review?.disliked || 'N/A'}"${quality ? `. Teaching quality: ${quality}` : ''}`;
            })
            .join('\n');

        const feedbackFactsText = [
            `Facts & Observations:\n${factsStr}`,
            `Recent Session Feedback:\n${sessionReviews || 'No recent session feedback.'}`
        ].join('\n\n');

        const fullFactsPrompt = [
            `================ STUDENT PROFILE FACTS: ${learner.name} ================`,
            `1. PERSONAL INFORMATION\n${personalInfoText}`,
            `2. COMPETENCY OVERVIEW\n${competenciesText}`,
            `3. NEEDS, WANTS & EXPECTATIONS\n${needsWantsExpectationsText}`,
            `4. COURSE PLAN\n${coursePlanText}`,
            `5. FEEDBACK (FACTS)\n${feedbackFactsText}`
        ].join('\n\n');

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullFactsPrompt).then(() => {
                setCopiedFacts(true);
                setTimeout(() => setCopiedFacts(false), 2500);
            }).catch(() => {
                fallbackCopyTextToClipboard(fullFactsPrompt);
            });
        } else {
            fallbackCopyTextToClipboard(fullFactsPrompt);
        }
    };

    const handleExportToYoungLearnersDashboard = async () => {
        if (!learner) return;

        const { SAMPLE_LEARNERS, DEFAULT_STORE, DEFAULT_TEACHER } = await import('../../../pages/kids/KidsApp');

        const mappedSkills = {
            pronunciation: 70,
            grammar: 70,
            vocabulary: 70,
            listening: 70,
            speaking: 70,
            reading: 70,
            writing: 70,
        } as any;

        if (learner.competencies && learner.competencies.length > 0) {
            learner.competencies.forEach((c: any) => {
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

        const interestsArray = learner.interests
            ? learner.interests.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [];

        const mappedCoursePlan = [
            ...(learner.goals || []),
            ...(learner.coursePlan?.modules ? learner.coursePlan.modules.map((m: any) => m.title) : [])
        ];

        const mappedWeaknesses = (learner.needs || []).map((n: any) => ({
            id: n.id,
            name: n.name,
            points: 2,
            completed: n.status === 'mastered',
            dateAdded: new Date().toISOString().split('T')[0]
        }));

        const mappedSessionLogs = (learner.sessions || []).map((s: any) => ({
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
        if (learner.birthday) {
            try {
                const birthYear = new Date(learner.birthday).getFullYear();
                if (!isNaN(birthYear)) {
                    calculatedAge = new Date().getFullYear() - birthYear;
                }
            } catch (e) {}
        }

        const kidsAvatar = learner.avatarId && learner.avatarId.length < 10 ? learner.avatarId : (learner.gender === 'Female' ? '🧚‍♀️' : '🦸‍♂️');
        const kidsGender = learner.gender === 'Female' ? 'Female' : (learner.gender === 'Male' ? 'Male' : 'PreferNotToSay');
        const kidsArchetype = learner.gender === 'Female' ? 'Fairy' : 'Superhero';

        const kidsLearner = {
            id: learner.id,
            name: learner.name,
            age: calculatedAge,
            avatar: kidsAvatar,
            gender: kidsGender,
            avatarArchetype: kidsArchetype,
            petType: 'Cat',
            theme: 'fairy',
            country: learner.country || 'Unknown',
            city: learner.city || '',
            status: 'active',
            joinDate: new Date().toISOString().split('T')[0],
            xp: learner.xp || 100,
            petXp: 0,
            coins: Math.floor((learner.xp || 100) / 10),
            streak: learner.streak || 0,
            attack: 10,
            defense: 10,
            mood: 'happy',
            totalSessions: learner.sessions?.length || 0,
            totalMinutes: (learner.sessions || []).reduce((sum, s) => sum + (s.duration || 0), 0),
            favoriteSubject: learner.targetLanguage || learner.focus || 'English',
            tags: [] as string[],
            badges: [] as any[],
            skills: mappedSkills,
            weaknesses: mappedWeaknesses,
            interests: interestsArray,
            coursePlan: mappedCoursePlan,
            landItems: [] as any[],
            dialogueText: "Hello! Ready to learn!",
            purchasedRewards: [] as string[],
            nativeLang: learner.l1Language || 'English',
            targetLang: learner.targetLanguage || 'English',
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
            const { triggerAutoSync } = await import('../../../utils/diskStorage');
            triggerAutoSync(true);
        } catch (err) {
            console.error("Failed to trigger auto disk sync", err);
        }

        alert(`Successfully duplicated "${learner.name}" to Young Learners Dashboard!`);

        const keepProfile = confirm(`Do you want to KEEP "${learner.name}" in the Adult Dashboard?\n\nClick "OK" to KEEP it, or "Cancel" to DELETE it.`);
        if (!keepProfile) {
            useLearnerStore.getState().removeLearner(learner.id);
            alert(`Deleted "${learner.name}" from Adult Dashboard.`);
            navigate('/dashboard');
        }
    };

    useEffect(() => {
        setCurrentSlideId(learner.avatarId);
    }, [learner.avatarId]);

    useEffect(() => {
        const avatars = learner.avatarIds || [];
        if (avatars.length <= 1) return;
        
        const interval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * avatars.length);
            setCurrentSlideId(avatars[randomIndex]);
        }, 4000); // Slideshow changes every 4 seconds
        
        return () => clearInterval(interval);
    }, [learner.avatarIds]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const onEmojiClick = (emojiData: EmojiClickData) => {
        onUpdate({ ...learner, avatarId: emojiData.emoji });
        setShowEmojiPicker(false);
    };

    const handleRandomizeAvatar = () => {
        onUpdate({ ...learner, avatarId: generateRandomAvatarId() });
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

        let imageBlob: Blob | null = null;

        for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.type.startsWith('image/')) {
                imageBlob = item.getAsFile();
                break;
            }
        }

        if (imageBlob) {
            try {
                const resizedBase64 = await resizeImage(imageBlob);
                const timestamp = Date.now();
                const newAvatarId = `custom:${learner.id}_${timestamp}`;
                await saveCustomAvatar(learner.id + "_" + timestamp, resizedBase64);
                
                const currentIds = learner.avatarIds || [];
                const updatedIds = currentIds.includes(learner.avatarId)
                    ? [...currentIds, newAvatarId]
                    : [learner.avatarId || `custom:${learner.id}`, newAvatarId].filter(Boolean);
                
                onUpdate({
                    ...learner,
                    avatarId: newAvatarId,
                    avatarIds: updatedIds
                });
                alert("New profile photo added to your slideshow!");
            } catch (error) {
                console.error('Failed to process pasted image:', error);
                alert('Failed to process the pasted image.');
            }
        } else {
            alert('No image found on the clipboard. Please copy an image first.');
        }

        setIsPasting(false);
    }, [isPasting, onUpdate, learner]);

    useEffect(() => {
        if (isPasting) {
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    setIsPasting(false);
                }
            };

            document.addEventListener('paste', handlePaste);
            document.addEventListener('keydown', handleKeyDown);

            return () => {
                document.removeEventListener('paste', handlePaste);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isPasting, handlePaste]);

    const initiatePasteAvatar = () => {
        setIsPasting(true);
    };
    
    const handleThumbsUp = () => {
        updateLearnerXP(learner.id, 10);
        speak('Great job!');
    };

    const handleThumbsDown = () => {
        updateLearnerXP(learner.id, -10);
        speak('Try again.');
    };

    const handleAIUpdate = () => {
        runAIUpdatesForLearner(learner.id);
    };


        const overallProgress = learner.competencies && learner.competencies.length > 0 
            ? Math.round(learner.competencies.reduce((acc, comp) => acc + comp.progress, 0) / learner.competencies.length) 
            : 0;
            
        const radius = 70;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (overallProgress / 100) * circumference;

        return (
            <header className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group cursor-pointer w-40 h-40 flex items-center justify-center shrink-0" onClick={initiatePasteAvatar} title="Click to paste a profile picture from clipboard">
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 160 160">
                        <circle 
                            cx="80" 
                            cy="80" 
                            r="70" 
                            className="stroke-gray-200" 
                            strokeWidth="8" 
                            fill="none" 
                        />
                        <circle 
                            cx="80" 
                            cy="80" 
                            r="70" 
                            className="stroke-brand-purple transition-all duration-1000 ease-out" 
                            strokeWidth="8" 
                            fill="none" 
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                    </svg>
                    <div className={`relative w-32 h-32 rounded-full overflow-hidden flex items-center justify-center ${learner.xp >= 2000 ? 'rarity-legendary' : learner.xp >= 1000 ? 'rarity-epic' : learner.xp >= 500 ? 'rarity-rare' : 'rarity-common'}`}>
                        <div className="animate-shine-inner z-10 pointer-events-none" />
                        <img src={getAvatarUrl(learner.gender, currentSlideId, learner.name)} alt={learner.name} className="w-full h-full object-cover relative z-0" />
                        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-all z-20 ${isPasting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {isPasting ? (
                                <div className="text-white text-center p-2 text-sm z-30">
                                    <p className="font-bold">Ready</p>
                                    <p>Ctrl+V</p>
                                    <p className="text-[10px] mt-1">(Esc to cancel)</p>
                                </div>
                            ) : (
                                <div className="text-white text-center flex flex-col items-center gap-1">
                                    <i className="fas fa-paste text-xl z-30"></i>
                                    <span className="text-[9px] font-bold">Add Photo</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Overall Progress Badge */}
                    {overallProgress === 100 && (
                        <div className="absolute top-2 right-2 text-2xl drop-shadow-md z-40 animate-bounce" title="100% Competency Completed!">
                            🏆
                        </div>
                    )}
                    
                    {learner.avatarIds && learner.avatarIds.length > 1 && (
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onUpdate({ ...learner, avatarIds: [learner.avatarId] }); 
                                alert("Reset profile pictures to only the current active photo.");
                            }} 
                            className="absolute bottom-2 left-2 bg-white text-red-500 rounded-full p-2 shadow-md hover:bg-red-500 hover:text-white transition-all transform opacity-0 group-hover:opacity-100 z-30" 
                            title="Reset slideshow photos"
                        >
                            <i className="fas fa-trash text-xs"></i>
                        </button>
                    )}
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleRandomizeAvatar(); }} 
                        className="absolute bottom-2 right-2 bg-white text-brand-blue rounded-full p-2 shadow-md hover:bg-brand-blue hover:text-white transition-all transform opacity-0 group-hover:opacity-100 z-30" 
                        title="Randomize Avatar"
                    >
                        {React.cloneElement(ICONS.refresh as React.ReactElement<any>, { className: 'w-5 h-5'})}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }} 
                        className="absolute top-2 left-2 bg-white text-yellow-500 rounded-full p-2 shadow-md hover:bg-yellow-100 transition-all transform opacity-0 group-hover:opacity-100 z-30" 
                        title="Choose Emoji Avatar"
                    >
                        <i className="fas fa-smile"></i>
                    </button>
                    {showEmojiPicker && (
                        <div ref={emojiPickerRef} className="absolute z-50 top-full left-0 mt-2" onClick={e => e.stopPropagation()}>
                            <EmojiPicker onEmojiClick={onEmojiClick} />
                        </div>
                    )}
                </div>
                <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0">
                 <div className="flex items-center justify-center sm:justify-start gap-4 flex-wrap">
                    <h1 className="text-5xl font-extrabold">{learner.name}</h1>
                </div>
                 <div className="flex items-center justify-center sm:justify-start gap-4 flex-wrap mt-2">
                    <button onClick={handleThumbsUp} title="Thumbs Up (+10 XP)" className="bg-brand-green text-white rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg hover:scale-110 transition-transform"><i className="fas fa-thumbs-up"></i></button>
                    <button onClick={handleThumbsDown} title="Thumbs Down (-10 XP)" className="bg-brand-red text-white rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg hover:scale-110 transition-transform"><i className="fas fa-thumbs-down"></i></button>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-6 mt-4 text-brand-gray-darkest">
                    <div className="flex items-center gap-2 font-bold">
                        <EditableStreak learner={learner} size="md" />
                        <span className="text-sm text-gray-500 font-normal">Session Streak</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold">
                        <XPVisual xp={learner.xp} size="md" />
                    </div>
                    <LearnerTime learner={learner} />
                </div>
                 <div className="flex items-center justify-center sm:justify-start gap-2 mt-4 flex-wrap">
                     <button onClick={onGenerateReport} className="bg-brand-purple text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                        Report
                    </button>
                    <button onClick={onManualUpdateClick || handleAIUpdate} disabled={loading} className="bg-brand-green text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {loading ? 'Updating...' : 'Update Profile'}
                    </button>
                    <button 
                        onClick={handleCopyProfileFacts} 
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        title="Copy Personal Information, Competency Overview, Needs, Wants & Expectations, Course Plan, and Feedback (facts) of this learner to Clipboard"
                    >
                        <i className={`fas ${copiedFacts ? 'fa-check-circle text-emerald-200' : 'fa-clipboard'}`}></i>
                        {copiedFacts ? 'Copied Profile Facts!' : 'Copy Profile Facts'}
                    </button>
                    <button onClick={onComposeEmail} className="bg-brand-blue text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2">
                        <i className="fas fa-paper-plane"></i> Compose Email
                    </button>
                    <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl hover:bg-slate-100 transition-all select-none shadow-sm">
                        <input 
                            type="checkbox" 
                            checked={!!learner.isSubscribed} 
                            onChange={() => onUpdate({ ...learner, isSubscribed: !learner.isSubscribed })}
                            className="rounded text-brand-purple focus:ring-brand-purple h-4 w-4 cursor-pointer"
                        />
                        <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-gray-700">Subscribe</span>
                        </div>
                    </label>
                </div>
            </div>
        </header>
    );
};

export default ProfileHeader;