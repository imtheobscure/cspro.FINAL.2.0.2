import React, { FC, useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { LearnerProfile, LearnerContent, PlatformProfile, StructuredOutput, SimulationScenario, AttachedFileMeta, TutorProfile, LessonMediaItem } from '../types';
import { useLearnerStore } from '../store/useLearnerStore';
import { SearchableVoiceSelect } from '../components/ui/SearchableVoiceSelect';
import { handleSaveGamifiedChallengeAsHtml } from '../utils/gamifiedChallengeHtmlGenerator';
import { buildLessonFileName, getLessonFilePrefill } from '../utils/lessonFileNaming';
import { searchMediaWithFallback } from '../utils/mediaSearchClient';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Textarea from '../components/ui/Textarea';
import Spinner from '../components/ui/Spinner';
import GenerationResult from '../components/content/GenerationResult';
import WeeklyChallengeRenderer from '../components/content/WeeklyChallengeRenderer';
import type { ChecklistState } from '../components/content/FeatureChecklist';
import HomeworkRenderer from '../components/content/HomeworkRenderer';
import SimulationsRenderer from '../components/content/SimulationsRenderer';
import ChatWidget from '../components/ui/ChatWidget';
import StudyGuideRenderer from '../components/content/StudyGuideRenderer';
import ProfileSettings from './ProfileSettings';
import SendSavedLessonModal from '../components/app2/profile/email/SendSavedLessonModal';
import HtmlLiveEditorModal from '../components/content/HtmlLiveEditorModal';
import { handleSaveLearningAppAsInteractiveHtml } from '../utils/learningAppHtmlGenerator';
import { handleSaveSlidesAsHtml } from '../utils/slidesHtmlGenerator';
import { handleSaveSlideExplainerAsHtml } from '../utils/slideExplainerHtmlGenerator';
import { handleSavePrintableWorksheetAsHtml } from '../utils/printableWorksheetHtmlGenerator';
import { handleSavePartyModeAsHtml } from '../utils/partyModeHtmlGenerator';
import type { LessonSettings } from '../utils/htmlGenerator';
import Input from '../components/ui/Input';
import { DEFAULT_READ_ALOUD_VOICE } from '../components/ui/SearchableVoiceSelect';
import ManualGenerator from '../components/content/ManualGenerator';
import LessonGalleryV2 from '../components/content/LessonGalleryV2';
import AudioGenerator from '../components/content/AudioGenerator';
import LiveLessonStudio from '../components/content/LiveLessonStudio';
import AddMediaStudio from '../components/content/AddMediaStudio';
import { collectLessonMediaItems } from '../utils/lessonMedia';
import LearnerSavedFiles from '../components/learners/LearnerSavedFiles';
import ManualPlaceGameRenderer from '../components/content/ManualPlaceGameRenderer';

import { generateStandalonePlaceGameHtml } from '../utils/placeGameHtmlGenerator';
import { generateConversationGameHtml } from '../services/generation/DailyConversationGame/DailyConversationGame';
import { generateDailyEnglishLessonHtml } from '../services/generation/DailyEnglishLesson/DailyEnglishLesson';
import { generateStandaloneHtml } from '../tutorly-lessons/Avatar_Lesson/avatarhtmlgenerator';
import { generateStandaloneHtmlV2 } from '../tutorly-lessons/Avatar_Lesson_V2/htmlgenerator';

type LessonType = 'explainerLesson' | 'englishLesson' | 'englishLessonV2' | 'examPrepLesson' | 'conversationalLesson' | 'bilingualStudyLesson';
type GenerationPackageId = LessonType | 'forTeachers' | 'homework' | 'quiz' | 'lessonPlan' | 'learningApp' | 'printableWorksheet' | 'weeklyChallenge' | 'studyGuide' | 'simulations' | 'slides' | 'dailyLesson' | 'conversationGame' | 'placeGame' | 'partyMode' | 'avatarLesson' | 'avatarLessonV2';

// RENAMED worksheet -> learningApp, ADDED printableWorksheet, ADDED partyMode
const generationPackageDetails: Record<GenerationPackageId, { title: string; description?: string; checklistType?: keyof ChecklistState }> = {
    explainerLesson: { title: "Explainer Lesson", description: "Strict sequence, full content retention.", checklistType: 'explainerLesson' },
    englishLesson: { title: "Micro Lesson", description: "Comprehensive lesson covering all skills.", checklistType: 'englishLesson' },
    englishLessonV2: { title: "Micro Lesson V2", description: "Comprehensive gamified lesson covering all skills.", checklistType: 'englishLesson' },
    examPrepLesson: { title: "Exam Prep Lesson", description: "Focuses on exam strategies.", checklistType: 'examPrepLesson' },
    conversationalLesson: { title: "Conversational English Lesson", description: "Speaking-focused lesson.", checklistType: 'conversationalLesson' },
    bilingualStudyLesson: { title: "Bilingual Study Lesson", description: "Chunk-based study guide with L1 translation.", checklistType: 'bilingualStudyLesson' },
    forTeachers: { title: "Teacher Guide", description: "Generates an enriched lesson plan for the tutor.", checklistType: 'lessonPlan' },
    homework: { title: "Homework", checklistType: 'homework' },
    quiz: { title: "Quiz", checklistType: 'quiz' },
    lessonPlan: { title: "Lesson Plan", checklistType: 'lessonPlan' },
    learningApp: { title: "Learning App (Gamified)", description: "Interactive 4-Level App", checklistType: 'learningApp' }, 
    printableWorksheet: { title: "Official Worksheet", description: "Printable PDF Style" }, 
    weeklyChallenge: { title: "Weekly Challenge (Gamified)", checklistType: 'weeklyChallenge' },
    studyGuide: { title: "Supplementary Study Guide", checklistType: 'studyGuide' },
    simulations: { title: "Supplementary Simulations", checklistType: 'simulations' },
    slides: { title: "Slide Presentation", checklistType: 'slides' },
    dailyLesson: { title: "🚀 Daily English Lesson", description: "A drip-content style interactive lesson." },
    conversationGame: { title: "🎭 Daily Conversation Game", description: "Branching audio roleplay game." },
    placeGame: { title: "🌍 Guess the Place Game", description: "Interactive map and culture game." },
    partyMode: { title: "🎉 Party Mode Arena", description: "Competitive multiplayer classroom game." },
    avatarLesson: { title: "🤖 Avatar Lesson", description: "Interactive branching simulation with character voices." },
    avatarLessonV2: { title: "🤖 Avatar Lesson V2", description: "Cinematic branching simulation with dynamic micro-learning chapters." }
};

// Sub-component for AI Prompt Settings
const AIPromptSettings: FC<{
    learner: LearnerProfile;
    onUpdate: (p: LearnerProfile) => void;
}> = ({ learner, onUpdate }) => {
    const [profile, setProfile] = useState({
        targetLanguage: learner.targetLanguage || 'English',
        enableTranslations: learner.enableTranslations ?? true,
        readAloudVoice: learner.readAloudVoice || DEFAULT_READ_ALOUD_VOICE,
        examPrepDetails: learner.examPrepDetails || '',
        lessonPrefs: learner.lessonPrefs || '',
        lessonPlanPrefs: learner.lessonPlanPrefs || '',
        homeworkPrefs: learner.homeworkPrefs || '',
        quizPrefs: learner.quizPrefs || '',
        classmates: learner.classmates || []
    });
    
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        setProfile({
            targetLanguage: learner.targetLanguage || 'English',
            enableTranslations: learner.enableTranslations ?? true,
            readAloudVoice: learner.readAloudVoice || DEFAULT_READ_ALOUD_VOICE,
            examPrepDetails: learner.examPrepDetails || '',
            lessonPrefs: learner.lessonPrefs || '',
            lessonPlanPrefs: learner.lessonPlanPrefs || '',
            homeworkPrefs: learner.homeworkPrefs || '',
            quizPrefs: learner.quizPrefs || '',
            classmates: learner.classmates || []
        });
    }, [learner]);

    useEffect(() => {
        const getVoices = () => {
            const voiceList = window.speechSynthesis.getVoices();
            // Try to find the language code based on target language name, or default to all if unclear
            const langCode = profile.targetLanguage === 'Spanish' ? 'es' : profile.targetLanguage === 'French' ? 'fr' : profile.targetLanguage === 'German' ? 'de' : 'en';
            setVoices(voiceList.filter(voice => voice.lang.startsWith(langCode)));
        };
        getVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
             window.speechSynthesis.onvoiceschanged = getVoices;
        }
    }, [profile.targetLanguage]);
    
    // Save to parent immediately via debounce or blur, or a "Save Settings" button.
    // For seamless UX, let's use a Save button here, or trigger onUpdate on blur.
    const handleSave = () => {
        onUpdate({ 
            ...learner, 
            ...profile 
        });
    };

    return (
        <Card className="mb-6 bg-blue-50 border border-blue-100">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-blue-900 border-b border-blue-200 pb-2 w-full flex justify-between">
                    <span><i className="fas fa-sliders-h mr-2"></i> Customization</span>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-sm py-1">Save Settings</Button>
                </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div>
                        <label className="flex items-center space-x-2 cursor-pointer pb-2">
                            <input
                                type="checkbox"
                                checked={profile.enableTranslations}
                                onChange={e => setProfile({...profile, enableTranslations: e.target.checked})}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-700">Enable translations in lesson</span>
                        </label>
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Read Aloud Voice</label>
                        <SearchableVoiceSelect value={profile.readAloudVoice || ''} onChange={val => setProfile({...profile, readAloudVoice: val})} hideCharacters />
                        <p className="text-[11px] text-gray-400 mt-1">Natural Microsoft Azure voices are used for all read-aloud tools. Default: Microsoft Ava Multilingual (Natural).</p>
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Exam Details</label>
                        <Input value={profile.examPrepDetails} onChange={e => setProfile({...profile, examPrepDetails: e.target.value})} placeholder="e.g. IELTS Academic, target band 8.0" />
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Custom Instructions for Lesson</label>
                        <Textarea value={profile.lessonPrefs} onChange={e => setProfile({...profile, lessonPrefs: e.target.value})} rows={2} placeholder="Focus on phrasal verbs..." />
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Custom Instructions for Lesson Plan</label>
                        <Textarea value={profile.lessonPlanPrefs} onChange={e => setProfile({...profile, lessonPlanPrefs: e.target.value})} rows={2} placeholder="Include a debate activity..." />
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Custom Instructions for Homework</label>
                        <Textarea value={profile.homeworkPrefs} onChange={e => setProfile({...profile, homeworkPrefs: e.target.value})} rows={2} placeholder="Add more writing prompts..." />
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Custom Instructions for Quiz</label>
                        <Textarea value={profile.quizPrefs} onChange={e => setProfile({...profile, quizPrefs: e.target.value})} rows={2} placeholder="Make all questions matching..." />
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-blue-200">
                <h4 className="text-md font-bold text-blue-900 mb-4 flex items-center">
                    <i className="fas fa-users mr-2"></i> Classmates
                    <span className="text-sm font-normal text-gray-500 ml-4">(Will automatically participate in lesson dialogues)</span>
                </h4>
                
                <div className="space-y-4">
                    {(profile.classmates || []).map((cm, idx) => (
                        <div key={cm.id} className="bg-white p-4 border border-blue-100 rounded-lg relative">
                            <button 
                                onClick={() => {
                                    const newClassmates = [...(profile.classmates || [])];
                                    newClassmates.splice(idx, 1);
                                    setProfile({...profile, classmates: newClassmates});
                                }}
                                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                            >
                                <i className="fas fa-trash"></i>
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                <div>
                                    <label className="font-semibold text-gray-700 block text-xs mb-1">Name</label>
                                    <Input value={cm.name} onChange={e => {
                                        const newClassmates = [...(profile.classmates || [])];
                                        newClassmates[idx].name = e.target.value;
                                        setProfile({...profile, classmates: newClassmates});
                                    }} placeholder="e.g. John" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="font-semibold text-gray-700 block text-xs mb-1">Voice</label>
                                    <SearchableVoiceSelect value={cm.voice || ''} onChange={val => {
                                        const newClassmates = [...(profile.classmates || [])];
                                        newClassmates[idx].voice = val;
                                        setProfile({...profile, classmates: newClassmates});
                                    }} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                <div>
                                    <label className="font-semibold text-gray-700 block text-xs mb-1">Nationality</label>
                                    <Input value={cm.nationality} onChange={e => {
                                        const newClassmates = [...(profile.classmates || [])];
                                        newClassmates[idx].nationality = e.target.value;
                                        setProfile({...profile, classmates: newClassmates});
                                    }} placeholder="e.g. Spanish" />
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700 block text-xs mb-1">Place of Living</label>
                                    <Input value={cm.placeOfLiving} onChange={e => {
                                        const newClassmates = [...(profile.classmates || [])];
                                        newClassmates[idx].placeOfLiving = e.target.value;
                                        setProfile({...profile, classmates: newClassmates});
                                    }} placeholder="e.g. Madrid" />
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700 block text-xs mb-1">Job</label>
                                    <Input value={cm.job} onChange={e => {
                                        const newClassmates = [...(profile.classmates || [])];
                                        newClassmates[idx].job = e.target.value;
                                        setProfile({...profile, classmates: newClassmates});
                                    }} placeholder="e.g. Designer" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label className="font-semibold text-gray-700 block text-xs mb-1">Role in Class</label>
                                    <select 
                                        className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
                                        value={cm.roles && cm.roles.length ? cm.roles[0] : 'custom'}
                                        onChange={e => {
                                            const newClassmates = [...(profile.classmates || [])];
                                            newClassmates[idx].roles = [e.target.value];
                                            setProfile({...profile, classmates: newClassmates});
                                        }}
                                    >
                                        <option value="helping my learner">Helping my learner</option>
                                        <option value="my learner friend">My learner friend</option>
                                        <option value="enemy">Enemy / Competitor</option>
                                        <option value="lover">Lover / Crush</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700 block text-xs mb-1">Mood</label>
                                    <Input value={cm.mood} onChange={e => {
                                        const newClassmates = [...(profile.classmates || [])];
                                        newClassmates[idx].mood = e.target.value;
                                        setProfile({...profile, classmates: newClassmates});
                                    }} placeholder="e.g. Energetic" />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-gray-700 block text-xs mb-1">Facts & Custom Instructions</label>
                                <Textarea value={cm.facts} onChange={e => {
                                        const newClassmates = [...(profile.classmates || [])];
                                        newClassmates[idx].facts = e.target.value;
                                        setProfile({...profile, classmates: newClassmates});
                                    }} rows={2} placeholder="Any specific facts, accents, or behaviors..." />
                            </div>
                        </div>
                    ))}
                    
                    <Button 
                        onClick={() => {
                            const newClassmates = [...(profile.classmates || [])];
                            newClassmates.push({
                                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                                name: '',
                                voice: '',
                                nationality: '',
                                placeOfLiving: '',
                                facts: '',
                                mood: '',
                                job: '',
                                focusedLanguage: '',
                                roles: ['helping my learner']
                            });
                            setProfile({...profile, classmates: newClassmates});
                        }}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm py-2 px-4 shadow-none font-semibold w-full"
                    >
                        <i className="fas fa-plus mr-2"></i> Add Classmate
                    </Button>
                </div>
            </div>
        </Card>
    );
};

// Sub-component for Lesson Settings Tab
const LessonSettingsTab: FC<{ 
    learner: LearnerProfile; 
    onUpdate: (p: LearnerProfile) => void;
    sessionFiles: Map<string, File>;
    onAddFile: (id: string, file: File) => void;
    onRemoveFile: (id: string) => void;
    onGoToSaved: () => void;
    onRenderLesson?: () => void;
    onMediaCheckChange?: (counts: { broken: number; total: number }) => void;
    lessonSections?: { id?: string | number; title: string; subtitle?: string }[];
    lessonTypeLabel?: string;
}> = ({ learner, onUpdate, sessionFiles, onAddFile, onRemoveFile, onGoToSaved, onRenderLesson, onMediaCheckChange, lessonSections, lessonTypeLabel }) => {
    const [settings, setSettings] = useState<LessonSettings>(learner.currentLessonSettings || {
        lessonName: '',
        nextClassDate: '',
        lessonTimeRange: '',
        materialLinks: '',
        teacherNotes: '',
        homeworkChecklist: '',
        themeColor: '#111827',
        attachedFiles: []
    });

    // Media link verification (images + YouTube/video URLs from AI JSON)
    const [linkChecks, setLinkChecks] = useState<Record<string, { status: 'checking' | 'ok' | 'broken' | 'warning'; message: string }>>({});
    const [verifying, setVerifying] = useState(false);
    // Inline media-replacement pickers for broken links: search a service, show a
    // thumbnail list, and click a result to instantly replace the card's URL.
    const [mediaFindQuery, setMediaFindQuery] = useState<Record<string, string>>({});
    const [mediaFindKind, setMediaFindKind] = useState<Record<string, 'image' | 'gif'>>({});
    const [mediaSearch, setMediaSearch] = useState<Record<string, { open: boolean; loading: boolean; kind: 'image' | 'gif' | 'video'; results: any[]; error: string }>>({});
    /** Lesson Setup or Media — the two panes of this screen. */
    const [pane, setPane] = useState<'setup' | 'media'>('setup');
    useEffect(() => {
        if (learner.currentLessonSettings) {
            let current = { ...learner.currentLessonSettings };
            // Auto-populate date if empty and we have a SMART goal
            if (!current.nextClassDate && (learner as any).smartGoal) {
                const smartGoal = (learner as any).smartGoal;
                const today = new Date();
                const daysToAdd = Math.ceil(7 / (smartGoal.lessonsPerWeek || 1));
                const nextDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
                current.nextClassDate = nextDate.toISOString().split('T')[0];
                
                // Immediately save back to store
                setTimeout(() => {
                    onUpdate({ ...learner, currentLessonSettings: current });
                }, 0);
            }
            setSettings(current);
        } else if ((learner as any).smartGoal) {
            // New settings case
            const smartGoal = (learner as any).smartGoal;
            const today = new Date();
            const daysToAdd = Math.ceil(7 / (smartGoal.lessonsPerWeek || 1));
            const nextDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
            const newSettings = {
                lessonName: '',
                nextClassDate: nextDate.toISOString().split('T')[0],
                lessonTimeRange: '',
                materialLinks: '',
                teacherNotes: '',
                homeworkChecklist: '',
                themeColor: '#111827',
                attachedFiles: []
            };
            setSettings(newSettings);
            // Immediately save back to store
            setTimeout(() => {
                onUpdate({ ...learner, currentLessonSettings: newSettings });
            }, 0);
        }
    }, [learner.currentLessonSettings, (learner as any).smartGoal]);

    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files) as File[];
        processFiles(files);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            processFiles(files);
        }
    };

    const processFiles = (files: File[]) => {
        const addedInfos: any[] = [];
        files.forEach(file => {
            const id = 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            addedInfos.push({ id, file });
            onAddFile(id, file);
        });
        
        setSettings(prev => {
            const newFiles = [...(prev.attachedFiles || [])];
            addedInfos.forEach(({ id, file }) => {
                newFiles.push({
                    id,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    description: ''
                });
            });
            return { ...prev, attachedFiles: newFiles };
        });
    };

    const removeFile = (index: number) => {
        const file = settings.attachedFiles?.[index];
        if (file) {
            onRemoveFile(file.id);
            setSettings(prev => ({
                ...prev,
                attachedFiles: (prev.attachedFiles || []).filter((_, i) => i !== index)
            }));
        }
    };

    const updateFileDescription = (index: number, desc: string) => {
        setSettings(prev => {
            const newFiles = [...(prev.attachedFiles || [])];
            if(newFiles[index]) {
                newFiles[index] = { ...newFiles[index], description: desc };
            }
            return { ...prev, attachedFiles: newFiles };
        });
    };

    // Unified media list (settings.lessonMedia + legacy lessonImages/lessonVideos merged, de-duped by URL)
    const allMedia = useMemo(() => collectLessonMediaItems(settings), [settings]);

    // Add Media studio → persist into lessonMedia and retire legacy duplicates so nothing renders twice.
    const handleMediaChange = (mediaItems: LessonMediaItem[]) => {
        const urls = new Set(mediaItems.map(i => String(i.url || '').trim().toLowerCase()).filter(Boolean));
        setSettings(prev => ({
            ...prev,
            lessonMedia: mediaItems,
            lessonImages: (prev.lessonImages || []).filter(i => !urls.has(String(i.url || '').trim().toLowerCase())),
            lessonVideos: (prev.lessonVideos || []).filter(v => !urls.has(String(v.url || '').trim().toLowerCase()))
        }));
    };

    // ─── Verify image / YouTube / video links are reachable ───
    const verifyMediaLink = (url: string, kind: 'image' | 'youtube' | 'video' | 'link'): Promise<{ status: 'ok' | 'broken' | 'warning'; message: string }> => {
        const trimmed = (url || '').trim();
        if (!trimmed) {
            return Promise.resolve({ status: 'warning', message: 'Empty URL — add a link' });
        }
        return new Promise((resolve) => {
            if (kind === 'youtube') {
                const idMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                const id = idMatch ? idMatch[1] : '';
                if (!id) {
                    resolve({ status: 'broken', message: 'Not a valid YouTube URL (needs an 11-character video ID)' });
                    return;
                }
                // Public, CORS-enabled oEmbed endpoint confirms the video still exists.
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 8000);
                fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json', { signal: controller.signal })
                    .then(res => {
                        clearTimeout(timer);
                        if (res.ok) resolve({ status: 'ok', message: 'Video found on YouTube' });
                        else resolve({ status: 'broken', message: 'YouTube returned HTTP ' + res.status + ' (video may be private or removed)' });
                    })
                    .catch(() => {
                        clearTimeout(timer);
                        resolve({ status: 'warning', message: 'ID format is valid but could not confirm (offline / network blocked)' });
                    });
                return;
            }
            if (kind === 'image') {
                // Real <img> load test — accurate even when CORS blocks fetch().
                const img = new Image();
                let done = false;
                const finish = (result: { status: 'ok' | 'broken' | 'warning'; message: string }) => {
                    if (!done) {
                        done = true;
                        clearTimeout(timer);
                        resolve(result);
                    }
                };
                const timer = setTimeout(() => finish({ status: 'broken', message: 'Timed out loading image (15s)' }), 15000);
                img.referrerPolicy = 'no-referrer';
                img.onload = () => finish({ status: 'ok', message: 'Image loads successfully' });
                img.onerror = () => finish({ status: 'broken', message: 'Image failed to load (404 / removed / blocked)' });
                img.src = trimmed;
                return;
            }
            // MP4 / Vimeo / any other web resource (also used for materialLinks)
            if (kind !== 'video' && kind !== 'link') {
                resolve({ status: 'warning', message: 'Unsupported link type' });
                return;
            }
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            fetch(trimmed, { method: 'HEAD', signal: controller.signal })
                .then(res => {
                    clearTimeout(timer);
                    if (res.ok || res.status < 400) resolve({ status: 'ok', message: 'Reachable (HTTP ' + res.status + ')' });
                    else resolve({ status: 'broken', message: 'HTTP ' + res.status });
                })
                .catch(() => {
                    clearTimeout(timer);
                    // CORS may block reading the response — fall back to a no-cors reachability probe.
                    fetch(trimmed, { method: 'HEAD', mode: 'no-cors' })
                        .then(() => resolve({ status: 'warning', message: 'Reachable, but status unverified (CORS blocked)' }))
                        .catch(() => resolve({ status: 'broken', message: 'URL is not reachable' }));
                });
        });
    };

    const verifyAllLinks = async () => {
        const items: { id: string; url: string; kind: 'image' | 'youtube' | 'video' | 'link' | 'file' }[] = [];
        // Lesson images
        (settings.lessonImages || []).forEach(img => items.push({ id: img.id, url: img.url, kind: 'image' }));
        // Lesson videos
        (settings.lessonVideos || []).forEach(vid => {
            const isYt = vid.type === 'youtube' || /youtube\.com|youtu\.be/i.test(vid.url || '');
            items.push({ id: vid.id, url: vid.url, kind: isYt ? 'youtube' : 'video' });
        });
        // Material links — one URL per line or comma separated
        (settings.materialLinks || '').split(/[\n,]/).map(s => s.trim()).filter(u => /^https?:\/\//i.test(u)).forEach((url, i) => {
            const isYt = /youtube\.com|youtu\.be/i.test(url);
            items.push({ id: 'mat_' + i, url, kind: isYt ? 'youtube' : 'link' });
        });
        // Attached files — confirm each one is stored in session memory (ready to embed)
        (settings.attachedFiles || []).forEach(f => items.push({ id: 'file_' + f.id, url: f.id, kind: 'file' }));
        if (items.length === 0) {
            alert('No links to verify yet. Add lesson images, videos, material links, or attached files first.');
            return;
        }
        setVerifying(true);
        setLinkChecks(prev => {
            const next = { ...prev };
            items.forEach(it => { next[it.id] = { status: 'checking', message: 'Checking…' }; });
            return next;
        });
        for (const it of items) {
            const result = it.kind === 'file'
                ? sessionFiles.has(it.url)
                    ? { status: 'ok' as const, message: 'File is stored in memory — ready to embed' }
                    : { status: 'broken' as const, message: 'File missing — re-upload it' }
                : await verifyMediaLink(it.url, it.kind as 'image' | 'youtube' | 'video' | 'link');
            setLinkChecks(prev => {
                const next = { ...prev, [it.id]: result };
                // Keep the Lesson Settings tab badge (broken count) in sync live.
                const done = Object.values(next).filter(c => c.status !== 'checking');
                onMediaCheckChange?.({
                    broken: done.filter(c => c.status === 'broken').length,
                    total: done.length,
                });
                return next;
            });
        }
        setVerifying(false);
        setLinkChecks(prev => {
            const done = Object.values(prev).filter(c => c.status !== 'checking');
            onMediaCheckChange?.({
                broken: done.filter(c => c.status === 'broken').length,
                total: done.length,
            });
            return prev;
        });
    };

    const checkSummary = useMemo(() => {
        const checks = Object.values(linkChecks);
        const done = checks.filter(c => c.status !== 'checking');
        return {
            total: done.length,
            ok: done.filter(c => c.status === 'ok').length,
            broken: done.filter(c => c.status === 'broken').length,
            warn: done.filter(c => c.status === 'warning').length,
            checking: checks.filter(c => c.status === 'checking').length,
        };
    }, [linkChecks]);

    const linkStatusBadge = (id: string) => {
        const c = linkChecks[id];
        if (!c) return null;
        const cls = c.status === 'ok' ? 'bg-green-600' : c.status === 'broken' ? 'bg-red-600' : c.status === 'warning' ? 'bg-amber-500' : 'bg-blue-600';
        const icon = c.status === 'checking' ? <span className="inline-block w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" /> : c.status === 'ok' ? '✓' : c.status === 'broken' ? '✗' : '!';
        const label = c.status === 'checking' ? 'Checking' : c.status === 'ok' ? 'OK' : c.status === 'broken' ? 'BROKEN' : 'CAUTION';
        return <span className={`absolute top-1 left-1 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 text-white ${cls}`}>{icon}{label}</span>;
    };

    const linkStatusMessage = (id: string) => {
        const c = linkChecks[id];
        if (!c || c.status === 'checking') return null;
        const cls = c.status === 'ok' ? 'text-green-600' : c.status === 'broken' ? 'text-red-600' : 'text-amber-600';
        return <p className={`text-[9px] font-semibold mt-1 ${cls}`}>{c.message}</p>;
    };

    // For broken links: search the media services (the server's /api/media-search
    // endpoint returns a full result list for images, GIFs, and YouTube videos) and
    // show an inline thumbnail grid. Clicking a result replaces the card's URL.
    const searchReplacementMedia = async (id: string, kind: 'image' | 'gif' | 'video', query: string) => {
        if (!query.trim()) return;
        setMediaSearch(prev => ({ ...prev, [id]: { open: true, loading: true, kind, results: [], error: '' } }));
        try {
            // Server API first; falls back to browser-side provider searches on static/shared hosting.
            const { results } = await searchMediaWithFallback(kind, query.trim());
            setMediaSearch(prev => ({ ...prev, [id]: { open: true, loading: false, kind, results, error: '' } }));
        } catch (e: any) {
            setMediaSearch(prev => ({ ...prev, [id]: { open: true, loading: false, kind, results: [], error: String(e?.message || e) } }));
        }
    };

    const applyReplacementMedia = (id: string, kind: 'image' | 'gif' | 'video', result: any) => {
        const url = String(result?.url || '').trim();
        if (!url) return;
        if (kind === 'video') {
            // The search list returns embed URLs — normalize to a watch URL for the card.
            const vid = String(result.id || '').replace(/^yt_/, '');
            const watchUrl = /^[a-zA-Z0-9_-]{11}$/.test(vid) ? 'https://www.youtube.com/watch?v=' + vid : url;
            setSettings(prev => ({
                ...prev,
                lessonVideos: (prev.lessonVideos || []).map(v => v.id === id ? { ...v, url: watchUrl, sourceUrl: watchUrl, caption: result.title || v.caption } : v)
            }));
        } else {
            setSettings(prev => ({
                ...prev,
                lessonImages: (prev.lessonImages || []).map(im => im.id === id ? { ...im, url, caption: result.title || im.caption } : im)
            }));
        }
        // Reset the check so the new link is re-verified on the next Verify Links run.
        setLinkChecks(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setMediaSearch(prev => ({ ...prev, [id]: { ...(prev[id] || { open: true, loading: false, kind, results: [], error: '' }), open: false } }));
    };

    const mediaResultsPanel = (id: string) => {
        const st = mediaSearch[id];
        if (!st || !st.open) return null;
        return (
            <div className="mt-1.5 bg-gray-50 border border-gray-200 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wide">
                        {st.kind === 'video' ? '🎬 Video results' : st.kind === 'gif' ? '🖼 GIF results' : '🖼 Image results'}
                    </span>
                    <button type="button" onClick={() => setMediaSearch(prev => ({ ...prev, [id]: { ...(prev[id] || st), open: false } }))} className="text-gray-400 hover:text-gray-700 text-[10px] font-bold">✕ close</button>
                </div>
                {st.loading ? (
                    <p className="text-[10px] text-gray-500 py-2 text-center">⏳ Searching…</p>
                ) : st.error ? (
                    <p className="text-[10px] text-red-600 py-1">⚠ {st.error}</p>
                ) : st.results.length === 0 ? (
                    <p className="text-[10px] text-gray-500 py-1">No results found — try a different search.</p>
                ) : (
                    <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto">
                        {st.results.map((r, ri) => (
                            <button
                                key={ri}
                                type="button"
                                onClick={() => applyReplacementMedia(id, st.kind, r)}
                                title={(r.title || r.caption || 'Replace with this media') + ' — click to replace'}
                                className="relative group rounded overflow-hidden border border-gray-200 hover:border-blue-500 transition cursor-pointer p-0"
                            >
                                <img src={r.preview || r.url} alt={r.title || 'media result'} className="w-full h-14 object-cover bg-gray-100" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                                <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] font-semibold px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{r.title || r.caption || 'Click to replace'}</span>
                            </button>
                        ))}
                    </div>
                )}
                <p className="text-[8px] text-gray-400 mt-1">Click any result to instantly replace this link.</p>
            </div>
        );
    };

    const linkFindButton = (id: string, kind: 'image' | 'youtube') => {
        const c = linkChecks[id];
        if (!c || c.status !== 'broken') return null;
        const item = kind === 'youtube'
            ? (settings.lessonVideos || []).find(v => v.id === id)
            : (settings.lessonImages || []).find(i => i.id === id);
        const defaultQuery = (kind === 'youtube' ? item?.caption : (item as any)?.altText || item?.caption) || 'lesson topic';
        const query = mediaFindQuery[id] ?? defaultQuery;
        const st = mediaSearch[id];

        if (kind === 'youtube') {
            return (
                <div className="mt-1 space-y-1">
                    <div className="flex gap-1">
                        <input
                            type="text"
                            value={query}
                            onChange={e => setMediaFindQuery(prev => ({ ...prev, [id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchReplacementMedia(id, 'video', query); } }}
                            placeholder="Search video title…"
                            className="flex-1 min-w-0 p-1 text-[10px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <button
                            type="button"
                            onClick={() => searchReplacementMedia(id, 'video', query)}
                            disabled={st?.loading}
                            title="Search YouTube for this title and show a clickable list of videos"
                            className="shrink-0 text-[9px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded px-2 py-1 transition disabled:opacity-60 cursor-pointer"
                        >
                            {st?.loading ? '⏳…' : '🔎 Find Videos'}
                        </button>
                    </div>
                    {mediaResultsPanel(id)}
                </div>
            );
        }

        const findKind = mediaFindKind[id] || 'image';
        return (
            <div className="mt-1 space-y-1">
                <div className="flex gap-1">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setMediaFindQuery(prev => ({ ...prev, [id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchReplacementMedia(id, findKind, query); } }}
                        placeholder="Search image title…"
                        className="flex-1 min-w-0 p-1 text-[10px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <select
                        value={findKind}
                        onChange={e => setMediaFindKind(prev => ({ ...prev, [id]: e.target.value as 'image' | 'gif' }))}
                        title="Search for a static photo or an animated GIF"
                        className="shrink-0 text-[10px] font-semibold px-1 py-1 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer"
                    >
                        <option value="image">🖼 Image</option>
                        <option value="gif">🎞 GIF</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => searchReplacementMedia(id, findKind, query)}
                        disabled={st?.loading}
                        title="Search image/GIF services for this title and show a clickable list"
                        className="shrink-0 text-[9px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded px-2 py-1 transition disabled:opacity-60 cursor-pointer"
                    >
                        {st?.loading ? '⏳…' : '🔎 Find'}
                    </button>
                </div>
                {mediaResultsPanel(id)}
            </div>
        );
    };

    const handleSave = () => {
        // Header images are removed by design — lesson headers always use the neat gradient design.
        const settingsToSave: any = { ...settings };
        delete settingsToSave.headerImage;
        delete settingsToSave._tempSearch;
        const formattedLesson = settingsToSave.unitNumber && settingsToSave.unitName 
            ? `${settingsToSave.unitNumber.startsWith('Unit') ? settingsToSave.unitNumber : 'Unit ' + settingsToSave.unitNumber}: ${settingsToSave.unitName}`
            : (settingsToSave.lessonName || '');

        let updatedCoursePlan = learner.coursePlan ? { ...learner.coursePlan } : ({} as any);
        if (settings.autoUpdateCoursePlan !== false && (formattedLesson || settings.unitNumber || settings.unitName)) {
            updatedCoursePlan = {
                ...updatedCoursePlan,
                currentLesson: formattedLesson || updatedCoursePlan.currentLesson || 'Unit 1',
                coursebookInfo: {
                    ...(updatedCoursePlan.coursebookInfo || {}),
                    ...(settings.unitNumber ? { unit: settings.unitNumber } : {}),
                    ...(settings.unitName ? { unitTitle: settings.unitName } : {}),
                }
            };
        }

        onUpdate({ 
            ...learner, 
            currentLessonSettings: settingsToSave,
            ...(settingsToSave.autoUpdateCoursePlan !== false && formattedLesson ? { coursePlan: updatedCoursePlan } : {})
        });
        // Render Lesson = the final step of Lesson Settings: persist and move straight to the
        // next step (Saved Lessons), where the rendered HTML lesson now appears.
        if (onGoToSaved) onGoToSaved();
        else if (onRenderLesson) onRenderLesson();
    };

    return (
        <Card>
            {/*
              Two panes, because they are two different jobs. "Set up the lesson" is a form;
              "place the media" is a board where the same settings are judged by where they put
              a picture on the page. Splitting them means neither has to be read past the other,
              and the media board is reachable in one click from the sidebar's own badge.
            */}
            <div className="flex items-center gap-1.5 mb-4 border-b border-slate-200">
                {([
                    ['setup', '⚙️ Lesson Setup', 'Deadlines, theme, links, notes and the files that go with the lesson'],
                    ['media', '🎨 Media', 'Images, GIFs, videos, audio and embeds — placed, previewed and targeted'],
                ] as const).map(([id, label, hint]) => (
                    <button key={id} type="button" onClick={() => setPane(id)} title={hint}
                        className={`px-3 py-2 text-sm font-bold rounded-t-lg border-b-2 -mb-px transition cursor-pointer ${pane === id ? 'border-blue-600 text-blue-700 bg-blue-50/60' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                        {label}
                        {id === 'media' && allMedia.length > 0 && (
                            <span className="ml-1.5 text-[10px] font-mono bg-slate-200 text-slate-700 rounded-full px-1.5 py-0.5">{allMedia.length}</span>
                        )}
                    </button>
                ))}
            </div>
            {pane === 'setup' && (
            <>
            <h3 className="text-xl font-bold mb-4">Lesson Configuration</h3>
            <p className="text-gray-600 mb-4">These settings affect the HTML file generation (deadlines, themes, notes, files) and sync with Course Plan.</p>

            <div className="space-y-4">
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="font-extrabold text-sm text-indigo-950 flex items-center gap-1.5">
                            <span>📖</span> Unit Number & Title (Course Plan Sync)
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 cursor-pointer select-none">
                            <input 
                                type="checkbox"
                                checked={settings.autoUpdateCoursePlan !== false}
                                onChange={(e) => setSettings({ ...settings, autoUpdateCoursePlan: e.target.checked })}
                                className="accent-indigo-600 rounded cursor-pointer"
                            />
                            <span>⚡ Auto-update Course Plan</span>
                        </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Unit Number</label>
                            <Input 
                                value={settings.unitNumber || ''} 
                                onChange={e => {
                                    const num = e.target.value;
                                    const combined = num && settings.unitName ? `${num.startsWith('Unit') ? num : 'Unit ' + num}: ${settings.unitName}` : (settings.lessonName || num);
                                    setSettings({ ...settings, unitNumber: num, lessonName: combined });
                                }} 
                                placeholder="e.g. Unit 5" 
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Unit / Topic Title</label>
                            <Input 
                                value={settings.unitName || ''} 
                                onChange={e => {
                                    const title = e.target.value;
                                    const combined = settings.unitNumber ? `${settings.unitNumber.startsWith('Unit') ? settings.unitNumber : 'Unit ' + settings.unitNumber}: ${title}` : title;
                                    setSettings({ ...settings, unitName: title, lessonName: combined });
                                }} 
                                placeholder="e.g. Advanced Negotiations & Strategy" 
                            />
                        </div>
                    </div>
                    <p className="text-[11px] text-indigo-700">
                        When enabled, saving or rendering this lesson will automatically update <strong>Current Lesson</strong> in the learner profile's Course Plan.
                    </p>
                </div>

                <div>
                    <label className="font-semibold text-gray-700 block mb-1">Lesson Full Name (Optional Override)</label>
                    <Input 
                        value={settings.lessonName || ''} 
                        onChange={e => setSettings({...settings, lessonName: e.target.value})} 
                        placeholder="e.g. Unit 5: Advanced Business Concepts" 
                    />
                    <p className="text-xs text-gray-500">Overrides the default title in the generated HTML header.</p>
                </div>
                <div>
                    <label className="font-semibold text-gray-700 block mb-1">Next Class Date (Deadline)</label>
                    <div className="flex gap-2 items-center">
                        <Input type="date" value={settings.nextClassDate} onChange={e => setSettings({...settings, nextClassDate: e.target.value})} />
                        {(learner as any).smartGoal && (
                            <button 
                                type="button" 
                                onClick={() => {
                                    const smartGoal = (learner as any).smartGoal;
                                    const today = new Date();
                                    const daysToAdd = Math.ceil(7 / (smartGoal.lessonsPerWeek || 1));
                                    const nextDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
                                    setSettings({...settings, nextClassDate: nextDate.toISOString().split('T')[0]});
                                }}
                                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg shrink-0 cursor-pointer"
                                title="Auto-calculate from SMART Goal"
                            >
                                🎯
                            </button>
                        )}
                    </div>
                </div>
                <div>
                    <label className="font-semibold text-gray-700 block mb-1">Time of Lesson (Range)</label>
                    <Input 
                        value={settings.lessonTimeRange || ''} 
                        onChange={e => setSettings({...settings, lessonTimeRange: e.target.value})} 
                        placeholder="e.g. 45-60 minutes" 
                        className="bg-white text-black border-gray-300"
                    />
                    <p className="text-xs text-gray-500">Displayed at the top of the lesson HTML.</p>
                </div>
                <div>
                    <label className="font-semibold text-gray-700 block mb-1">Theme Color</label>
                    <div className="flex gap-2 mb-2">
                        {['#0ea5e9', '#059669', '#f59e0b', '#6366f1', '#d946ef', '#7c3aed', '#4b5563', '#111827'].map(c => (
                            <button 
                                key={c}
                                onClick={() => setSettings({...settings, themeColor: c})}
                                className={`w-8 h-8 rounded-full border-2 ${settings.themeColor === c ? 'border-black' : 'border-transparent'}`}
                                style={{backgroundColor: c}}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-gray-500">Affects header gradients and emoji backgrounds in generated files.</p>
                </div>
                <div>
                    <label className="font-semibold text-gray-700 block mb-1">Teacher Notes</label>
                    <Textarea value={settings.teacherNotes} onChange={e => setSettings({...settings, teacherNotes: e.target.value})} placeholder="Personal note to student..." />
                </div>
                <div>
                    <label className="font-semibold text-gray-700 block mb-1">Homework Checklist</label>
                    <Textarea value={settings.homeworkChecklist} onChange={e => setSettings({...settings, homeworkChecklist: e.target.value})} placeholder="List items..." />
                </div>
                <div>
                    <div className="flex items-center justify-between">
                        <label className="font-semibold text-gray-700 block mb-1">Material Links</label>
                        <button type="button" onClick={verifyAllLinks} disabled={verifying}
                            className="mb-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 rounded-lg px-2 py-0.5 transition disabled:opacity-60 cursor-pointer"
                            title="Check that every material link and attached file is reachable / stored">
                            {verifying ? '⏳ Checking…' : '✓ Check links & files'}
                        </button>
                    </div>
                    <Textarea value={settings.materialLinks} onChange={e => setSettings({...settings, materialLinks: e.target.value})} placeholder="One URL per line..." />
                    {/* Per-link verification chips (filled in by Verify Links) */}
                    {Object.entries(linkChecks).filter(([k]) => k.startsWith('mat_')).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                            {Object.entries(linkChecks).filter(([k]) => k.startsWith('mat_')).map(([id, c]) => (
                                <span key={id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 text-white ${c.status === 'checking' ? 'bg-blue-600' : c.status === 'ok' ? 'bg-green-600' : c.status === 'broken' ? 'bg-red-600' : 'bg-amber-500'}`}>
                                    {c.status === 'checking' ? <span className="inline-block w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" /> : c.status === 'ok' ? '✓' : c.status === 'broken' ? '✗' : '!'}
                                    {c.status === 'checking' ? 'Checking' : c.status === 'ok' ? 'OK' : c.status === 'broken' ? 'BROKEN' : 'CAUTION'}
                                </span>
                            ))}
                            <span className="text-[10px] text-gray-400 self-center">material links</span>
                        </div>
                    )}
                </div>

                {/* DRAG AND DROP FILE UPLOAD */}
                <div>
                    <label className="font-semibold text-gray-700 block mb-1">Attach Files (PDF, MP3, MP4, Images)</label>
                    <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        onClick={() => document.getElementById('file-upload-input')?.click()}
                    >
                        <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                        <p className="text-gray-500">Drag & Drop files here or click to upload</p>
                        <input 
                            type="file" 
                            id="file-upload-input" 
                            className="hidden" 
                            multiple 
                            onChange={handleFileSelect}
                        />
                    </div>
                    
                    {/* FILE LIST */}
                    {settings.attachedFiles && settings.attachedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {settings.attachedFiles.map((fileMeta, index) => {
                                const hasFile = sessionFiles.has(fileMeta.id);
                                return (
                                <div key={fileMeta.id} className={`flex flex-col bg-white p-3 rounded border shadow-sm ${linkChecks['file_' + fileMeta.id]?.status === 'broken' ? 'border-red-400 ring-1 ring-red-300' : !hasFile ? 'border-yellow-400 bg-yellow-50' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="bg-gray-100 p-2 rounded">
                                                <i className={`fas ${fileMeta.type.includes('pdf') ? 'fa-file-pdf text-red-500' : fileMeta.type.includes('image') ? 'fa-file-image text-purple-500' : fileMeta.type.includes('audio') ? 'fa-file-audio text-yellow-500' : fileMeta.type.includes('video') ? 'fa-file-video text-blue-500' : 'fa-file text-gray-500'}`}></i>
                                            </div>
                                            <div className="truncate">
                                                <p className="font-medium text-sm truncate">{fileMeta.name}</p>
                                                <p className="text-xs text-gray-500">{(fileMeta.size / 1024).toFixed(1)} KB</p>
                                                {!hasFile && <p className="text-xs text-red-600 font-bold">File missing from memory. Re-upload.</p>}
                                            </div>
                                        </div>
                                        {(linkChecks['file_' + fileMeta.id]?.status === 'ok' || linkChecks['file_' + fileMeta.id]?.status === 'broken') && (
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 text-white shrink-0 ${linkChecks['file_' + fileMeta.id]?.status === 'ok' ? 'bg-green-600' : 'bg-red-600'}`} title={linkChecks['file_' + fileMeta.id]?.message}>
                                                {linkChecks['file_' + fileMeta.id]?.status === 'ok' ? '✓ OK' : '✗ MISSING'}
                                            </span>
                                        )}
                                        <button 
                                            onClick={() => removeFile(index)}
                                            className="text-red-500 hover:text-red-700 p-2"
                                            title="Remove file"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                    <div className="mt-2">
                                        <Input 
                                            value={fileMeta.description || ''} 
                                            onChange={(e) => updateFileDescription(index, e.target.value)}
                                            placeholder="Description / Instructions..." 
                                            className="text-sm py-1"
                                        />
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </div>

                <p className="text-xs text-gray-400 mt-2">Media (images, GIFs, video, audio, embeds) is on the 🎨 <button type="button" onClick={() => setPane('media')} className="text-blue-600 hover:underline font-semibold cursor-pointer">Media tab</button>, where each item shows exactly where it will land in the lesson body.</p>

            </div>
            </>
            )}

            {pane === 'media' && (
            <div className="space-y-4">
                {/* UNIFIED ADD MEDIA STUDIO — images, GIFs, YouTube/video, audio/podcast & any embed */}
                <AddMediaStudio
                    items={allMedia}
                    sections={lessonSections || []}
                    lessonName={settings.lessonName || ''}
                    lessonTypeLabel={lessonTypeLabel}
                    learnerName={learner.name}
                    onChange={handleMediaChange}
                    onChecksChange={onMediaCheckChange}
                />
            </div>
            )}

            <div className="pt-4 mt-2 border-t border-slate-200">
                <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 font-bold text-base px-6 py-3 shadow-lg">
                        <i className="fas fa-magic mr-2"></i> Render Lesson
                    </Button>
                    {pane === 'setup' && (
                        <button type="button" onClick={() => setPane('media')}
                            className="text-sm font-bold text-blue-700 hover:underline cursor-pointer">
                            🎨 Place media ({allMedia.length}) →
                        </button>
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-2">Click to update settings and generate the final lesson HTML with your images, videos, and configurations.</p>
            </div>
        </Card>
    );
};

const LearnerSyllabusTab: FC<{ 
    learner: any; 
    onUpdate: (p: any) => void;
}> = ({ learner, onUpdate }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCompetency, setExpandedCompetency] = useState<string | null>(null);

    const syllabus = learner.syllabus || { competencies: [] };
    const competencies = syllabus.competencies || [];

    const handleToggleStatus = (compName: string, chapterId: string) => {
        const updatedCompetencies = competencies.map((comp: any) => {
            if (comp.competencyName === compName) {
                return {
                    ...comp,
                    chapters: comp.chapters.map((ch: any) => {
                        if (ch.id === chapterId) {
                            return {
                                ...ch,
                                status: ch.status === 'completed' ? 'pending' : 'completed'
                            };
                        }
                        return ch;
                    })
                };
            }
            return comp;
        });

        onUpdate({
            ...learner,
            syllabus: {
                ...syllabus,
                competencies: updatedCompetencies
            }
        });
    };

    // Filter chapters across all categories if query is entered
    const filteredCompetencies = useMemo(() => {
        if (!searchQuery) return competencies;
        const q = searchQuery.toLowerCase();
        return competencies.map((comp: any) => {
            const matchingChapters = comp.chapters.filter((ch: any) => 
                ch.title.toLowerCase().includes(q) ||
                ch.description.toLowerCase().includes(q) ||
                (ch.vocabulary && ch.vocabulary.some((v: string) => v.toLowerCase().includes(q))) ||
                (ch.grammar && ch.grammar.toLowerCase().includes(q))
            );
            return {
                ...comp,
                chapters: matchingChapters
            };
        }).filter((comp: any) => comp.chapters.length > 0);
    }, [competencies, searchQuery]);

    // If search is active, we should expand all sections with results automatically
    useEffect(() => {
        if (searchQuery && filteredCompetencies.length > 0) {
            setExpandedCompetency(filteredCompetencies[0].competencyName);
        }
    }, [searchQuery, filteredCompetencies]);

    return (
        <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-850 flex items-center gap-2">
                        <i className="fas fa-book text-indigo-600"></i> Course Syllabus & Chapters
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Track learning progress across distinct skill competencies and units.</p>
                </div>
            </div>

            {/* Search Box */}
            <div className="relative mb-6">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chapters, grammar, or vocabulary..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                )}
            </div>

            {competencies.length === 0 ? (
                <div className="text-center p-8 bg-gray-50/60 rounded-xl border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500">No syllabus loaded for this learner.</p>
                    <p className="text-xs text-gray-400 mt-1">Go to the Profile tab to create or paste a syllabus first!</p>
                </div>
            ) : filteredCompetencies.length === 0 ? (
                <div className="text-center p-8 bg-gray-50/60 rounded-xl border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500">No chapters match "{searchQuery}"</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredCompetencies.map((comp: any, compIdx: number) => {
                        const total = comp.chapters.length;
                        // To count properly from full list
                        const originalComp = competencies.find((c: any) => c.competencyName === comp.competencyName);
                        const originalChapters = originalComp ? originalComp.chapters : [];
                        const completed = originalChapters.filter((ch: any) => ch.status === 'completed').length;
                        const pct = originalChapters.length > 0 ? Math.round((completed / originalChapters.length) * 100) : 0;
                        const isExpanded = expandedCompetency === comp.competencyName;

                        return (
                            <div 
                                key={`${comp.competencyId || comp.competencyName || 'comp'}-${compIdx}`}
                                className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                                    isExpanded ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-gray-250 hover:border-gray-350 bg-white'
                                }`}
                            >
                                {/* Category Header */}
                                <div 
                                    onClick={() => setExpandedCompetency(isExpanded ? null : comp.competencyName)}
                                    className="p-4 flex items-center justify-between cursor-pointer select-none bg-slate-50/50 hover:bg-slate-50"
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span>
                                            <span className="font-extrabold text-sm text-gray-800 truncate">{comp.competencyName}</span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="flex-1 max-w-[200px] bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500 font-mono">
                                                {pct}% ({completed}/{originalChapters.length})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                            {comp.chapters.length} Units
                                        </span>
                                        <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs text-gray-400`}></i>
                                    </div>
                                </div>

                                {/* Chapters / Units List */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-white divide-y divide-gray-100 p-2 space-y-2">
                                        {comp.chapters.map((ch: any, idx: number) => {
                                            const isDone = ch.status === 'completed';
                                            return (
                                                <div 
                                                    key={`${comp.competencyId}-${ch.id}-${idx}`} 
                                                    className={`p-4 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                                        isDone ? 'bg-emerald-50/40 border border-emerald-100' : 'bg-slate-50/30 border border-slate-100'
                                                    }`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                                {isDone ? 'Completed' : 'Pending'}
                                                            </span>
                                                            <h4 className={`font-bold text-sm text-gray-800 ${isDone ? 'line-through text-gray-500' : ''}`}>
                                                                {ch.title}
                                                            </h4>
                                                        </div>
                                                        <p className="text-xs text-gray-650 mt-1 leading-relaxed">{ch.description}</p>
                                                        
                                                        {((ch.vocabulary && ch.vocabulary.length > 0) || ch.grammar) && (
                                                            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-sans">
                                                                {ch.vocabulary && ch.vocabulary.length > 0 && (
                                                                    <div className="text-slate-650">
                                                                        <strong className="text-slate-800">Vocabulary: </strong>
                                                                        {ch.vocabulary.join(', ')}
                                                                    </div>
                                                                )}
                                                                {ch.grammar && (
                                                                    <div className="text-indigo-700">
                                                                        <strong className="text-indigo-900">Grammar: </strong>
                                                                        {ch.grammar}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Complete/Pending Toggle Button */}
                                                    <button
                                                        onClick={() => handleToggleStatus(comp.competencyName, ch.id)}
                                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-auto ${
                                                            isDone 
                                                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200' 
                                                                : 'bg-emerald-650 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg'
                                                        }`}
                                                    >
                                                        {isDone ? (
                                                            <>
                                                                <i className="fas fa-undo"></i> Mark Pending
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fas fa-check-circle"></i> Mark Complete
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};

const LearnerPathTab: FC<{ learner: LearnerProfile; onUpdate: (p: LearnerProfile) => void }> = ({ learner, onUpdate }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [editData, setEditData] = useState<{title: string, headings: string}>({title: '', headings: ''});
    const [libraryFiles, setLibraryFiles] = useState<any[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);

    useEffect(() => {
        const fetchLibrary = async () => {
            setLoadingFiles(true);
            try {
                const res = await fetch(`/api/content?learnerId=${learner.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setLibraryFiles(data);
                }
            } catch (e) {
                console.error("Failed to fetch library", e);
            } finally {
                setLoadingFiles(false);
            }
        };
        fetchLibrary();
    }, [learner.id]);

    const handleDelete = (index: number) => {
        if(confirm("Are you sure you want to delete this history entry? This will not delete the generated files, only the record.")) {
            // Calculate real index (array is reversed in display)
            const realIndex = (learner.lessonHistory!.length - 1) - index;
            const newHistory = [...(learner.lessonHistory || [])];
            newHistory.splice(realIndex, 1);
            onUpdate({...learner, lessonHistory: newHistory});
        }
    };

    const startEdit = (index: number, entry: any) => {
        setEditingIndex(index);
        setEditData({ title: entry.title, headings: entry.headings ? entry.headings.join('\n') : '' });
    };

    const saveEdit = (index: number) => {
        const realIndex = (learner.lessonHistory!.length - 1) - index;
        const newHistory = [...(learner.lessonHistory || [])];
        
        newHistory[realIndex] = {
            ...newHistory[realIndex],
            title: editData.title,
            headings: editData.headings.split('\n').filter(s => s.trim())
        };
        
        onUpdate({...learner, lessonHistory: newHistory});
        setEditingIndex(-1);
    };

    const cancelEdit = () => {
        setEditingIndex(-1);
    };

    const toggleHeadingCheck = (index: number, heading: string) => {
        const realIndex = (learner.lessonHistory!.length - 1) - index;
        const newHistory = [...(learner.lessonHistory || [])];
        const entry = newHistory[realIndex];
        const completed = entry.completedHeadings ? [...entry.completedHeadings] : [];
        
        if (completed.includes(heading)) {
            const idx = completed.indexOf(heading);
            completed.splice(idx, 1);
        } else {
            completed.push(heading);
        }
        
        newHistory[realIndex] = {
            ...entry,
            completedHeadings: completed
        };
        
        onUpdate({...learner, lessonHistory: newHistory});
    };

    return (
        <div className="space-y-8">
            <section>
                <h3 className="text-xl font-bold mb-4 text-gray-800">📜 Lesson History Log</h3>
                {(!learner.lessonHistory || learner.lessonHistory.length === 0) ? (
                    <p className="text-gray-500 text-center py-4">No lesson history recorded yet.</p>
                ) : (
                    <div className="space-y-4">
                        {learner.lessonHistory.slice().reverse().map((hist, i) => (
                            <Card key={i} className="border-l-4 border-indigo-500 relative group">
                                {editingIndex === i ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Title</label>
                                            <Input 
                                                value={editData.title} 
                                                onChange={e => setEditData({...editData, title: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Details (One per line)</label>
                                            <Textarea 
                                                value={editData.headings} 
                                                onChange={e => setEditData({...editData, headings: e.target.value})} 
                                                rows={4}
                                            />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <Button onClick={cancelEdit} className="bg-gray-400 hover:bg-gray-500 text-sm py-1">Cancel</Button>
                                            <Button onClick={() => saveEdit(i)} className="bg-green-600 hover:bg-green-700 text-sm py-1">Save</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-lg text-indigo-900">{hist.title || 'Untitled Lesson'}</h4>
                                                <p className="text-xs text-gray-500">{new Date(hist.date).toLocaleDateString()} &bull; {new Date(hist.date).toLocaleTimeString()}</p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                <button 
                                                    onClick={() => startEdit(i, hist)} 
                                                    className="text-gray-400 hover:text-blue-600 p-1" 
                                                    title="Edit Entry"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(i)} 
                                                    className="text-gray-400 hover:text-red-600 p-1" 
                                                    title="Delete Entry"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <p className="font-semibold text-xs uppercase text-gray-500 mb-1">Content Covered:</p>
                                            {(() => {
                                                const toc: any[] = (hist as any)?.toc && Array.isArray((hist as any).toc) ? (hist as any).toc : [];
                                                const list: { key: string; label: string; detail?: string }[] = toc.length
                                                    ? toc.map((t: any, ti: number) => ({ key: String(t.title || t.heading || ('Section ' + (ti + 1))), label: String(t.title || t.heading || ('Section ' + (ti + 1))), detail: String(t.overview || '').trim() || undefined }))
                                                    : (hist.headings || []).map((h: string) => ({ key: h, label: h }));
                                                if (list.length === 0) {
                                                    return <p className="text-sm text-gray-400 italic">No details recorded.</p>;
                                                }
                                                return (
                                                    <ul className="space-y-1.5 text-sm text-gray-700">
                                                        {list.map((item, j) => {
                                                            const isChecked = !!hist.completedHeadings?.includes(item.key);
                                                            return (
                                                                <li key={j}>
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => toggleHeadingCheck(i, item.key)}
                                                                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-500 shrink-0"
                                                                        />
                                                                        <span className={isChecked ? "text-emerald-700 font-bold" : "text-gray-750 font-medium"}>
                                                                            {item.label}
                                                                        </span>
                                                                    </div>
                                                                    {item.detail && (
                                                                        <p className="text-[11px] text-slate-500 font-medium pl-6 mt-0.5 leading-snug">{item.detail}</p>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                );
                                            })()}
                                        </div>
                                    </>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

const LearnerPage: FC<{
    learners: LearnerProfile[];
    setLearners: React.Dispatch<React.SetStateAction<LearnerProfile[]>>;
    allContent: Record<string, LearnerContent>;
    setAllContent: React.Dispatch<React.SetStateAction<Record<string, LearnerContent>>>;
    recentLearnerIds: string[];
    setRecentLearnerIds: React.Dispatch<React.SetStateAction<string[]>>;
    platforms: PlatformProfile[];
    tutorProfile?: TutorProfile;
    isEmbedded?: boolean;
    embeddedLearnerId?: string;
    tourStep?: number | null;
    /**
     * A GROUP CLASS stage that only exists for a group: the tutor's questioning plan (who to
     * ask more, which parts belong to whom). It renders as the FIRST tab of the lesson
     * workspace, ahead of Lesson Creator and Gallery, because it shapes what both of them
     * produce — and its content is injected into every prompt by `groupClassPromptBlock`.
     */
    groupBriefTab?: { label: string; node: React.ReactNode };
}> = ({ learners, setLearners, allContent, setAllContent, recentLearnerIds, setRecentLearnerIds, platforms, tutorProfile, isEmbedded, embeddedLearnerId, tourStep, groupBriefTab }) => {
    const params = useParams<{ id: string }>();
    const id = isEmbedded ? embeddedLearnerId : params.id;
    const learner = learners.find(l => l.id === id);
    
    
    const [activeTab, setActiveTab] = useState('generator');
    const [brokenMediaCount, setBrokenMediaCount] = useState(0);
    const [autoCuratedMedia, setAutoCuratedMedia] = useState<{ at: string; items: LessonMediaItem[]; error?: string } | null>(null);
    const [hasNewSavedLesson, setHasNewSavedLesson] = useState(false);
    const [isSendLessonModalOpen, setIsSendLessonModalOpen] = useState(false);
    const [rawText, setRawText] = useState('');
    
    // --- NEW: Session Files State (In-Memory Only) ---
    const [sessionFiles, setSessionFiles] = useState<Map<string, File>>(new Map());

    /**
     * Bumped every time the tutor leaves Lesson Settings for Saved Lessons ("Render Lesson").
     *
     * The newest rendered lesson then scrolls itself into view with a short focus animation. Without
     * this, landing on Saved Lessons with the page still parked on an older lesson made a successful
     * render look like nothing had happened.
     */
    const [focusNewestLesson, setFocusNewestLesson] = useState(0);
    const goToSavedLessonsFocused = () => {
        setFocusNewestLesson(n => n + 1);
        setActiveTab('savedLessons');
    };

    // --- HTML LIVE WORKBENCH STATES ---
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorCode, setEditorCode] = useState('');
    const [editorTitle, setEditorTitle] = useState('Resource');

    const handleAddSessionFile = (id: string, file: File) => {
        setSessionFiles(prev => new Map(prev).set(id, file));
    };

    const handleRemoveSessionFile = (id: string) => {
        setSessionFiles(prev => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    };
    
    const [inputType, setInputType] = useState<'text' | 'media' | 'manual' | 'audio' | 'live' | 'gallery' | 'customization' | 'group'>(groupBriefTab ? 'group' : 'manual');
    const [presetManualType, setPresetManualType] = useState<string | null>(null);
    const [liveLessonContent, setLiveLessonContent] = useState<any>(null);

    // Sync active learner info for music-lesson-v1 and sub-apps
    useEffect(() => {
        if (learner) {
            try {
                const lAny = learner as any;
                const data = {
                    id: learner.id,
                    name: learner.name,
                    avatar: lAny.avatarId || lAny.avatar || '🎤',
                    cefrLevel: lAny.cefrLevel || lAny.targetLevel || learner.targetLanguage || 'B2',
                    l1Language: lAny.l1Language || learner.targetLanguage || 'Spanish',
                    goals: Array.isArray(lAny.learningGoals || lAny.goals) ? (lAny.learningGoals || lAny.goals).join(', ') : (lAny.learningGoals || lAny.goals || ''),
                    focus: lAny.lessonPrefs || lAny.focus || '',
                    country: lAny.country || 'Learner Location',
                    interests: lAny.interests || [],
                    facts: lAny.notes || lAny.examPrepDetails || lAny.facts || ''
                };
                localStorage.setItem('activeLearnerId', learner.id);
                localStorage.setItem('tutorly_selected_learner', JSON.stringify(data));
            } catch (e) {
                console.log('Error syncing learner storage', e);
            }
        }
    }, [learner]);

    // Synchronize tabs and subtabs automatically with active Learner Profile Tour step
    useEffect(() => {
        if (tourStep === undefined || tourStep === null) return;
        
        // Step 6: Lesson Hub - Lesson Creator (Automatic tab removed — Render with AI covers it)
        if (tourStep === 6) {
            setActiveTab('generator');
            setInputType('manual');
        }
        // Step 7: Lesson Creator - Custom Lesson Structure
        // Step 8: Lesson Creator - Syllabus Integration
        // Step 9: Lesson Creator - Custom Prompts
        // Step 10: Lesson Creator - Paste & Validate JSON
        else if (tourStep >= 7 && tourStep <= 10) {
            setActiveTab('generator');
            setInputType('manual'); // "Manual"
        }
        // Step 11: Lesson Creator - Lesson Settings Customization
        else if (tourStep === 11) {
            setActiveTab('lessonSettings');
        }
        // Step 12: Lesson Creator - Render Content
        // Step 13: Lesson Creator - Save & Send to Learner
        else if (tourStep >= 12 && tourStep <= 13) {
            setActiveTab('generator');
            setInputType('manual');
        }
        // Step 14: Lesson Gallery & Saved Lessons
        else if (tourStep === 14) {
            setActiveTab('savedLessons');
        }
    }, [tourStep]);

    const saveContentToLibrary = async (type: string, title: string, htmlContent: string) => {
        if (!learner) return;
        const fileName = buildLessonFileName({ learnerName: learner.name, lessonLabel: type, ...getLessonFilePrefill(learner), audience: 'Learner' });

        try {
            const { saveAndExportHtmlLesson } = await import('../utils/htmlLessonSaver');
            // Lessons that ship a one-page digest section (Micro Lesson family) also file the
            // standalone A4 sheet; for every other content type this is simply an empty string.
            let digestHtml = '';
            try {
                const { generateLessonDigestHtml } = await import('../utils/englishLessonHtmlGenerator');
                digestHtml = generateLessonDigestHtml(htmlContent, learner.name, title || type);
            } catch (digestErr) {
                console.warn('Digest extraction skipped:', digestErr);
            }
            const result = await saveAndExportHtmlLesson({
                htmlContent: htmlContent,
                fileName: fileName,
                learnerName: learner.name,
                tutorName: tutorProfile?.name || 'Tutor',
                type: type,
                title: title || type,
                triggerDownload: false,
                toLibrary: true,
                digestHtml
            });

            // Update Local State
            setAllContent(prev => {
                const next = { ...prev };
                if (!next[learner.id]) next[learner.id] = { rawText: '', lessonText: '', learningPackage: null };
                return next;
            });

            alert(digestHtml
                ? `Saved to Library: ${result.url || fileName}\n\nThe 🧾 A4 digest was filed with it — open it from the lesson's row (print → Save as PDF).`
                : `Saved to Library! Access at: ${result.url || fileName}`);
        } catch (err: any) {
            console.error("Save content to library error:", err);
            // Universal fallback download
            const { triggerUniversalDownload } = await import('../utils/htmlLessonSaver');
            triggerUniversalDownload(htmlContent, fileName);
            alert(`Saved locally and downloaded ${fileName} to your device.`);
        }
    };

    const currentContent = id ? allContent[id] : undefined;

    // Latest manual lesson generated via the Lesson Creator — feeds the Add Media studio
    // AI prompt with the real section outline so media can be targeted to the exact section.
    const lessonSections = useMemo(() => {
        const g = currentContent?.generatedLessons;
        if (!g) return [];
        const entries = Object.entries(g).filter(([k]) => generationPackageDetails[k as GenerationPackageId]);
        const sorted = entries.sort((a: any, b: any) => (new Date(b[1]?.generatedAt || 0).getTime()) - (new Date(a[1]?.generatedAt || 0).getTime()));
        const best = sorted[0];
        if (!best) return [];
        const sections = (best[1] as any)?.sections;
        if (!Array.isArray(sections)) return [];
        // Prefer the detailed Table of Contents (exact title + concise per-section coverage) so the
        // Add Media studio prompt knows what every section teaches; fall back to the plain sections.
        const toc = (best[1] as any)?.tableOfContents;
        const source = Array.isArray(toc) && toc.length ? toc : sections;
        return source
            .map((s: any, i: number) => {
                const src = sections[i] || {};
                return {
                    // 1-based id so the dropdown value, the AI prompt section number and the media
                    // injector all agree on which section a targetSection points to.
                    id: i + 1,
                    title: String(s.title || s.heading || src.title || src.heading || ('Section ' + (i + 1))),
                    subtitle: String(s.overview || s.summary || s.subtitle || src.summary || src.subtitle || src.description || '').trim(),
                    // The section's activities, in render order: the media board names the card a
                    // picture will land in ("activity 4 of 10 · Exam Practice Test 1"), and the plan
                    // behind that promise is the renderer's own placement function.
                    activities: (Array.isArray((src as any).activities) ? (src as any).activities : []).map((a: any) => ({
                        title: String(a?.title || ''),
                        type: String(a?.type || '')
                    }))
                };
            })
            .filter((s: any) => s.title && String(s.title).trim());
    }, [currentContent?.generatedLessons]);

    const lessonTypeLabel = useMemo(() => {
        const g = currentContent?.generatedLessons;
        if (!g) return undefined;
        const keys = Object.keys(g).filter((k) => generationPackageDetails[k as GenerationPackageId]);
        if (!keys.length) return undefined;
        const key = keys.sort((ka: string, kb: string) => (new Date((g as any)[kb]?.generatedAt || 0).getTime()) - (new Date((g as any)[ka]?.generatedAt || 0).getTime()))[0];
        const t = generationPackageDetails[key as GenerationPackageId]?.title || key;
        const emojiMatch = t.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]|[\uD800-\uDBFF][\uDC00-\uDFFF])+\s*/u);
        return emojiMatch ? t.slice(emojiMatch[0].length) : t;
    }, [currentContent?.generatedLessons]);

    useEffect(() => {
        if (id && currentContent?.rawText) {
            setRawText(currentContent.rawText);
        } else {
            setRawText('');
        }
        
        if (id && !recentLearnerIds.includes(id)) {
            setRecentLearnerIds(prev => [id, ...prev.filter(i => i !== id)].slice(0, 5));
        }
    }, [id, currentContent, recentLearnerIds, setRecentLearnerIds]);

    
    const updateContent = (updates: Partial<LearnerContent>) => {
        if (!id) return;
        setAllContent(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || { rawText: '', lessonText: '', learningPackage: null }),
                ...updates
            }
        }));
    };

    const handleUpdateProfile = (updatedProfile: LearnerProfile) => {
        setLearners(prev => prev.map(l => l.id === updatedProfile.id ? updatedProfile : l));
    };

    const switchToManualCreator = (type: string) => {
        setActiveTab('generator');
        setInputType('manual');
    };

    const handleClearSaved = () => {
        if (!confirm("Are you sure you want to clear ALL generated contents in the Saved Lessons tab?")) return;
        if (!id) return;
        setAllContent(prev => {
            const next = { ...prev };
            if (next[id]) {
                next[id] = { rawText: next[id].rawText, learningPackage: null };
            }
            return next;
        });
        // We do NOT setActiveTab('generator') here so the user can see it clears in real time on this tab.
    };

    const handleManualContent = (type: string, data: any) => {
        const timestamp = new Date().toISOString();
        let updates: Partial<LearnerContent> = {};
        
        // --- NEW: Tracking for History ---
        let historyTitle = "";
        let historyHeadings: string[] = [];
        let historyToc: any = null;
        let profileUpdates = { ...learner };

        // --- NEW: Process Settings from Manual JSON ---
        if (data.settings) {
             const existingSettings = profileUpdates.currentLessonSettings || {
                lessonName: '',
                unitNumber: '',
                unitName: '',
                autoUpdateCoursePlan: true,
                nextClassDate: '',
                lessonTimeRange: '',
                materialLinks: '',
                teacherNotes: '',
                homeworkChecklist: '',
                themeColor: '#111827',
                attachedFiles: []
            };
            
            const newUnitNumber = data.settings.unitNumber || existingSettings.unitNumber || '';
            const newUnitName = data.settings.unitName || existingSettings.unitName || '';
            const formattedLesson = newUnitNumber && newUnitName 
                ? `${newUnitNumber.startsWith('Unit') ? newUnitNumber : 'Unit ' + newUnitNumber}: ${newUnitName}`
                : (data.settings.lessonName || existingSettings.lessonName || '');

            profileUpdates.currentLessonSettings = {
                ...existingSettings,
                unitNumber: newUnitNumber,
                unitName: newUnitName,
                autoUpdateCoursePlan: data.settings.autoUpdateCoursePlan !== undefined ? data.settings.autoUpdateCoursePlan : existingSettings.autoUpdateCoursePlan,
                lessonName: formattedLesson || data.settings.lessonName || existingSettings.lessonName,
                nextClassDate: data.settings.nextClassDate || existingSettings.nextClassDate,
                lessonTimeRange: data.settings.lessonTimeRange || existingSettings.lessonTimeRange,
                teacherNotes: data.settings.teacherNotes || existingSettings.teacherNotes,
                homeworkChecklist: data.settings.homeworkChecklist || existingSettings.homeworkChecklist,
                materialLinks: data.settings.materialLinks || existingSettings.materialLinks,
                lessonImages: data.settings.lessonImages || existingSettings.lessonImages || [],
                lessonVideos: data.settings.lessonVideos || existingSettings.lessonVideos || [],
                headerImage: data.settings.headerImage || existingSettings.headerImage,
                // Lesson Cheat Sheet (Lesson Creator → Step 2). Deliberately strict: the sheet only
                // exists when the render that produced this lesson asked for it, so re-rendering a
                // lesson without the toggle removes the sheet again instead of leaving a stale one.
                lessonCheatSheet: data.settings.lessonCheatSheet === true
            };

            // Auto-update Course Plan if enabled or if unit details exist
            if (data.settings.autoUpdateCoursePlan !== false && (formattedLesson || newUnitNumber || newUnitName)) {
                profileUpdates.coursePlan = {
                    ...(profileUpdates.coursePlan || {}),
                    currentLesson: formattedLesson || profileUpdates.coursePlan?.currentLesson || 'Unit 1',
                    coursebookInfo: {
                        ...(profileUpdates.coursePlan?.coursebookInfo || {}),
                        ...(newUnitNumber ? { unit: newUnitNumber } : {}),
                        ...(newUnitName ? { unitTitle: newUnitName } : {})
                    }
                };
            }
        }

        
        switch(type) {
            case 'musicLesson':
            case 'videoLesson':
                // Retired types: the Automatic generator that produced these was removed, so
                // keep any legacy data reachable but never navigate to a non-existent tab or
                // claim a download path that no longer exists.
                updates.musicLesson = data;
                updates.videoLesson = data;
                historyTitle = `${type === 'musicLesson' ? 'Music' : 'Video'} Lesson: ${data.title || 'Untitled'}`;
                setActiveTab('savedLessons');
                break;
            case 'liveLesson':
                setLiveLessonContent(data);
                setInputType('live');
                return; // Don't update history yet, wait for save in studio
            case 'englishLesson':
            case 'englishLessonV2':
            case 'explainerLesson':
            case 'examPrepLesson':
            case 'conversationalLesson':
            case 'bilingualStudyLesson':
            case 'feedbackLesson':
                data.generatedAt = timestamp;
                updates.generatedLessons = {
                    ...currentContent?.generatedLessons,
                    [type]: { sections: data.sections, settings: data.settings, lessonSummary: data.lessonSummary, tableOfContents: Array.isArray(data.tableOfContents) ? data.tableOfContents : undefined, generatedAt: timestamp }
                } as any;
                if (!updates.learningPackage) updates.learningPackage = { ...currentContent?.learningPackage } as any;
                updates.learningPackage!.lesson = { sections: data.sections, generatedAt: timestamp } as any;
                
                // History Extraction — prefer the lesson's detailed Table of Contents so the Learner Path log is exact
                const histToc = Array.isArray(data.tableOfContents) && data.tableOfContents.length ? data.tableOfContents : null;
                historyToc = histToc;
                historyTitle = type === 'englishLessonV2' ? (data.settings?.lessonName || 'Micro Lesson V2') : (histToc && histToc[0]?.title) || (data.sections && data.sections.length > 0 ? data.sections[0].title : `Manual ${type}`);
                historyHeadings = histToc ? histToc.map((t:any) => t.title) : (data.sections ? data.sections.map((s:any) => s.title) : []);
                
                setActiveTab('savedLessons');
                break;
            case 'homework':
                data.generatedAt = timestamp;
                if (!updates.learningPackage) updates.learningPackage = { ...currentContent?.learningPackage } as any;
                updates.learningPackage!.homework = data;
                
                historyTitle = "Manual Homework Assignment";
                historyHeadings = ["Reading Tasks", "Listening Tasks", "Speaking", "Writing", "Grammar & Vocab"];
                
                setActiveTab('savedLessons');
                break;
            case 'quiz':
                data.generatedAt = timestamp;
                if (!updates.learningPackage) updates.learningPackage = { ...currentContent?.learningPackage } as any;
                updates.learningPackage!.quiz = data;
                
                historyTitle = "Manual Quiz";
                historyHeadings = data.sections ? data.sections.map((s:any) => s.title) : ["Quiz Sections"];
                
                setActiveTab('savedLessons');
                break;
            case 'lessonGuide':
            case 'lessonPlan':
            case 'forTeachers':
                if (!updates.learningPackage) updates.learningPackage = { ...currentContent?.learningPackage } as any;
                updates.learningPackage!.lessonPlan = data; // Assuming HTML string for now based on current logic, but might be object if manual passed
                // Since ManualGenerator handles raw content, if it's a string it's direct.
                if (typeof data === 'string') {
                    // It's html string
                    historyTitle = "Manual Teacher Guide";
                } else {
                     updates.learningPackage!.lessonPlan = JSON.stringify(data); 
                }
                historyTitle = "Manual Lesson Plan";
                historyHeadings = ["Teacher Guide / Plan"];
                setActiveTab('lessonPlan');
                break;
            case 'weeklyChallenge':
                updates.gamifiedWeeklyChallenge = data;
                historyTitle = (data.theme || "Weekly") + " Challenge";
                historyHeadings = data.days ? data.days.map((d:any) => `${d.dayName}: ${d.title}`) : [];
                setActiveTab('weeklyChallenge');
                break;
            case 'learningApp':
                updates.learningApp = { sections: data.sections };
                historyTitle = "Manual Learning App";
                historyHeadings = data.sections ? data.sections.map((s:any) => s.title) : ["App Levels"];
                setActiveTab('learningApp');
                break;
            case 'printableWorksheet':
                updates.printableWorksheet = data;
                historyTitle = "Official Worksheet";
                historyHeadings = data.sections ? data.sections.map((s:any) => s.title) : ["Worksheet Sections"];
                setActiveTab('printableWorksheet');
                break;
            case 'studyGuide':
                updates.studyGuide = data;
                historyTitle = "Manual Study Guide";
                historyHeadings = ["Audio Overview", "Slides", "Flashcards"];
                setActiveTab('studyGuide');
                break;
            case 'slides':
                updates.slidePackage = data;
                historyTitle = "Manual Slide Deck";
                historyHeadings = data.slides ? data.slides.map((s:any) => s.title) : ["Slides"];
                setActiveTab('slides');
                break;
            case 'simulations':
                // simulations are array
                const simArray = Array.isArray(data) ? data : [data];
                updates.simulations = simArray;
                historyTitle = "Manual Simulations";
                historyHeadings = simArray.map((s:any) => s.title);
                setActiveTab('simulations');
                break;
            case 'dailyLesson':
                if (!data.htmlContent) {
                    data.htmlContent = generateDailyEnglishLessonHtml(data, 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80', '', '');
                }
                updates.dailyLesson = { ...data, createdAt: timestamp };
                historyTitle = data.lessonTitle || "Daily Lesson";
                historyHeadings = ["Interactive Daily Lesson"];
                setTimeout(() => {
                    const blob = new Blob([data.htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = buildLessonFileName({ learnerName: learner.name, lessonLabel: 'Daily English Lesson', ...getLessonFilePrefill(learner), audience: 'Learner' });
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                break;
            case 'conversationGame':
                if (!data.htmlContent) {
                    data.htmlContent = generateConversationGameHtml(data, data.theme || 'purple', learner, { appName: '', appAddress: '' }, {});
                }
                updates.conversationGame = { ...data, createdAt: timestamp };
                historyTitle = "Conversation Game";
                historyHeadings = [data.theme || "Roleplay Game"];
                setTimeout(() => {
                    const blob = new Blob([data.htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = buildLessonFileName({ learnerName: learner.name, lessonLabel: 'Conversation Game', ...getLessonFilePrefill(learner), audience: 'Learner' });
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                break;
            case 'partyMode':
                updates.partyMode = data;
                historyTitle = data.gameTitle || "Party Mode Game";
                historyHeadings = ["Competitive Arena (64 Items)"];
                setActiveTab('partyMode');
                break;
            case 'placeGame':
                if (!data.htmlContent) {
                    data.htmlContent = generateStandalonePlaceGameHtml(data, learner.name);
                }
                updates.placeGame = { ...data, createdAt: timestamp };
                historyTitle = "Place Game";
                historyHeadings = [data.city || "Guess the Place"];
                setTimeout(() => {
                    const blob = new Blob([data.htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = buildLessonFileName({ learnerName: learner.name, lessonLabel: 'Guess The Place', ...getLessonFilePrefill(learner), audience: 'Learner' });
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                break;
            case 'avatarLesson':
                if (!data.htmlContent) {
                    data.htmlContent = generateStandaloneHtml(data);
                }
                updates.avatarLesson = { ...data, createdAt: timestamp };
                historyTitle = data.meta?.title || "Avatar Lesson";
                historyHeadings = data.lessons ? data.lessons.map((l: any) => l.title) : ["Avatar Lesson Narrative"];
                setTimeout(() => {
                    const blob = new Blob([data.htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = buildLessonFileName({ learnerName: learner.name, lessonLabel: 'Avatar Lesson', ...getLessonFilePrefill(learner), audience: 'Learner' });
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                break;
            case 'avatarLessonV2':
                if (!data.htmlContent) {
                    data.htmlContent = generateStandaloneHtmlV2(data);
                }
                updates.avatarLessonV2 = { ...data, createdAt: timestamp };
                historyTitle = data.meta?.title || "Avatar Lesson V2";
                historyHeadings = data.lessons ? data.lessons.map((l: any) => l.title) : ["Avatar Lesson V2 Narrative"];
                setTimeout(() => {
                    const blob = new Blob([data.htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = buildLessonFileName({ learnerName: learner.name, lessonLabel: 'Avatar Lesson V2', ...getLessonFilePrefill(learner), audience: 'Learner' });
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                break;
        }
        
        updateContent(updates);
        
        // --- UPDATE LEARNER PATH ---
        if (historyTitle) {
            const newEntry = {
                title: historyTitle,
                date: timestamp,
                headings: historyHeadings,
                ...(historyToc ? { toc: historyToc } : {})
            };
            profileUpdates.lessonHistory = [...(profileUpdates.lessonHistory || []), newEntry];
            profileUpdates.lastGeneratedAt = timestamp;
        }

        handleUpdateProfile(profileUpdates);

        // Auto-run the media AI prompt (Lesson Settings → Add Media) for sectioned lessons so the tutor
        // lands on pre-filled media suggestions to approve instead of copying/pasting by hand.
        if (type === 'englishLesson' || type === 'englishLessonV2' || type === 'explainerLesson' || type === 'examPrepLesson' || type === 'conversationalLesson' || type === 'bilingualStudyLesson') {
        }

        setHasNewSavedLesson(true);
        if (data.settings) {
            setActiveTab('lessonSettings');
        } else {
            setActiveTab('savedLessons');
        }

        // playSuccessSound(); // Removed success beep sound for manual "Render Content" as requested by user.
    };



    const handleAddCustomSimulation = (newSimulation: SimulationScenario) => {
        if (!id) return;
        setAllContent(prev => {
            const currentSims = prev[id]?.simulations || [];
            return {
                ...prev,
                [id]: {
                    ...prev[id],
                    simulations: [...currentSims, newSimulation],
                }
            };
        });
    };
    

    const GeneratorItem: FC<React.PropsWithChildren<{
        id: GenerationPackageId;
        type: 'radio' | 'checkbox';
        title: string;
        isChecked: boolean;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    }>> = ({ id, type, title, isChecked, onChange, children }) => (
        <details className="bg-white border rounded-lg hover:border-blue-300" open={false}>
            <summary className="p-3 flex items-center cursor-pointer list-none">
                <input 
                    type={type} 
                    id={`gen-${id}`} 
                    name={type === 'radio' ? 'lessonType' : `gen-${id}`}
                    value={id}
                    checked={isChecked} 
                    onChange={onChange}
                    onClick={e => e.stopPropagation()} 
                    className={`mr-3 h-5 w-5 ${type === 'radio' ? 'text-blue-600 focus:ring-blue-500' : 'text-indigo-600 focus:ring-indigo-500'}`}
                />
                <label htmlFor={`gen-${id}`} className="font-bold text-gray-800">{title}</label>
            </summary>
            {children && (
                <div className="px-4 pb-4 border-t border-gray-200 mt-2 pt-3">
                    {children}
                </div>
            )}
        </details>
    );


    if (!learner) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold text-red-500">Learner not found.</h2>
                <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">Return to Dashboard</Link>
            </div>
        );
    }        const navGroups = [
            {
                label: 'Lesson Workflow',
                items: [
                    { id: 'generator', label: 'Lesson Creator', icon: 'fa-magic' },
                    { id: 'lessonSettings', label: 'Lesson Settings', icon: 'fa-sliders-h', badge: brokenMediaCount > 0 ? brokenMediaCount : 0 },
                    { id: 'savedLessons', label: 'Saved Lessons', icon: 'fa-folder-open', isNew: hasNewSavedLesson }
                ]
            },
            {
                label: 'Learner Plan',
                items: [
                    { id: 'chapters', label: 'Chapters & Syllabus', icon: 'fa-book' },
                    { id: 'path', label: 'Learner Path', icon: 'fa-history' }
                ]
            }
        ];

    return (
        <div>
            {!isEmbedded && (
                <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <h2 className="text-3xl font-bold text-gray-800">{learner.name}</h2>
                    <p className="text-gray-500">
                        Level: <strong>{learner.cefrLevel}</strong> | 
                        L2 (Target): <strong>{learner.targetLanguage || 'English'}</strong> | 
                        L1 (Speaking): <strong>{learner.l1Language || 'English'}</strong>
                    </p>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4 lg:w-1/5">
                    <div className="sticky top-24">
                        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Lesson Workspace</h3>
                        {navGroups.map(group => (
                            <div key={group.label} className="mb-3">
                                <p className="px-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">{group.label}</p>
                                <div className="space-y-1">
                                    {group.items.map((item: any) => (
                                        <button key={item.id} onClick={() => { setActiveTab(item.id); if(item.id==='savedLessons') setHasNewSavedLesson(false); }}
                                            className={`w-full text-left flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                                activeTab === item.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                            }`}>
                                            <div className="flex items-center">
                                                <i className={`fas ${item.icon} mr-3 w-5 text-center`}></i>
                                                {item.label}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {item.badge > 0 && (
                                                    <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none" title="Broken links or files in Lesson Settings">⚠ {item.badge}</span>
                                                )}
                                                {item.isNew && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="flex-1">
                    {activeTab === 'generator' && (
                        <div className="space-y-6">
                            <Card>
                                <div className="flex gap-4 border-b mb-4 overflow-x-auto">
                                    {/* Group classes get this stage FIRST, before Lesson Creator:
                                        it decides who gets asked what, so it has to be settled
                                        before a lesson is built around the room. */}
                                    {groupBriefTab && (
                                        <button
                                            className={`pb-2 px-4 font-semibold whitespace-nowrap ${inputType === 'group' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500'}`}
                                            onClick={() => setInputType('group')}
                                        >
                                            <i className="fas fa-users-cog mr-2"></i>{groupBriefTab.label}
                                        </button>
                                    )}
                                    <button 
                                        className={`pb-2 px-4 font-semibold whitespace-nowrap ${inputType === 'manual' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
                                        onClick={() => setInputType('manual')}
                                    >
                                        Lesson Creator
                                    </button>
                                    <button 
                                        className={`pb-2 px-4 font-semibold ${inputType === 'gallery' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500'}`}
                                        onClick={() => setInputType('gallery')}
                                    >
                                        Gallery
                                    </button>
                                </div>


                                {groupBriefTab && inputType === 'group' && (
                                    <div className="animate-fade-in">{groupBriefTab.node}</div>
                                )}

                                {inputType === 'manual' && (
                                    <ManualGenerator 
                                        learner={learner} 
                                        presetType={presetManualType || undefined}
                                        onContentRender={handleManualContent}
                                         onUpdateLearner={handleUpdateProfile}
                                        onSaveLearnerSettings={(settings) => {
                                            const updatedLearner = { ...learner, manualGeneratorSettings: settings };
                                            handleUpdateProfile(updatedLearner);
                                            try {
                                                useLearnerStore.getState().updateLearner(updatedLearner as any);
                                            } catch (e) {
                                                console.error("Failed to update learner store:", e);
                                            }
                                            if (setLearners) {
                                                setLearners((prev: any) => {
                                                    if (Array.isArray(prev)) {
                                                        return prev.map((p: any) => p.id === learner.id ? updatedLearner : p);
                                                    }
                                                    return prev;
                                                });
                                            }
                                        }}
                                    />
                                )}

                                {inputType === 'gallery' && (
                                    <LessonGalleryV2
                                        learnerName={learner?.name}
                                        onOpenInCreator={(typeId) => {
                                            setPresetManualType(typeId);
                                            setInputType('manual');
                                        }}
                                    />
                                )}

                            </Card>
                            
                        </div>
                    )}

                    {activeTab === 'savedLessons' && (
                        <div className="mb-4 flex justify-end gap-2">
                            <Button id="send-saved-lesson-mail-btn" onClick={() => setIsSendLessonModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 font-bold whitespace-nowrap flex items-center gap-2">
                                <i className="fas fa-envelope"></i> Send Mail / Share Package
                            </Button>
                            <Button id="clear-saved-contents-btn" onClick={handleClearSaved} className="bg-red-600 hover:bg-red-700 font-bold whitespace-nowrap">
                                <i className="fas fa-trash-alt mr-2"></i> Clear Saved Contents
                            </Button>
                        </div>
                    )}

                    {activeTab === 'savedLessons' && currentContent?.generatedLessons && (() => {
                        const entries = Object.entries(currentContent.generatedLessons).sort(([ka, a], [kb, b]) => {
                            const timeA = (a as any).generatedAt ? new Date((a as any).generatedAt).getTime() : 0;
                            const timeB = (b as any).generatedAt ? new Date((b as any).generatedAt).getTime() : 0;
                            return timeB - timeA;
                        });
                        // The lesson just rendered is the newest entry: the card the tutor came here for.
                        const newestKey = entries[0]?.[0];
                        return entries.map(([key, lessonObj]) => (
                            <GenerationResult 
                                key={key}
                                content={lessonObj} 
                                learner={learner} 
                                learningPackage={currentContent?.learningPackage || null} 
                                platforms={platforms} 
                                title={generationPackageDetails[key as GenerationPackageId]?.title || 'Lesson'} 
                                // The package slot IS the Step 1 content type: pass it so the renderer
                                // dispatches on the format the tutor chose, not on the title's wording.
                                contentType={key}
                                lessonSettings={learner.currentLessonSettings}
                                sessionFiles={sessionFiles}
                                onSaveToLibrary={saveContentToLibrary}
                                onSwitchToManualCreator={switchToManualCreator}
                                autoFocus={key === newestKey}
                                focusSignal={focusNewestLesson}
                            />
                        ));
                    })()}

                    {activeTab === 'savedLessons' && currentContent?.learningPackage?.lesson && !currentContent?.generatedLessons && (
                        <GenerationResult 
                            content={currentContent.learningPackage.lesson} 
                            learner={learner} 
                            learningPackage={currentContent?.learningPackage || null} 
                            platforms={platforms} 
                            title="Lesson" 
                            lessonSettings={learner.currentLessonSettings}
                            sessionFiles={sessionFiles}
                            onSaveToLibrary={saveContentToLibrary}
                            onSwitchToManualCreator={switchToManualCreator}
                        />
                    )}
                    
                    {activeTab === 'savedLessons' && (currentContent?.learningPackage?.homework ? <HomeworkRenderer content={currentContent.learningPackage.homework} learner={learner} learningPackage={currentContent.learningPackage} platforms={platforms} lessonSettings={learner.currentLessonSettings} onSaveToLibrary={saveContentToLibrary} /> : null)}
                    
                    {activeTab === 'savedLessons' && currentContent?.learningPackage?.quiz && <GenerationResult content={currentContent?.learningPackage?.quiz} learner={learner} learningPackage={currentContent?.learningPackage || null} platforms={platforms} title="Quiz" lessonSettings={learner.currentLessonSettings} sessionFiles={sessionFiles} onSaveToLibrary={saveContentToLibrary} />}
                    
                    {activeTab === 'savedLessons' && currentContent?.learningPackage?.lessonPlan && <GenerationResult content={currentContent?.learningPackage?.lessonPlan} learner={learner} learningPackage={currentContent?.learningPackage || null} platforms={platforms} title="Lesson Plan" lessonSettings={learner.currentLessonSettings} sessionFiles={sessionFiles} onSaveToLibrary={saveContentToLibrary} />}
                    
                    {activeTab === 'savedLessons' && currentContent?.learningApp && (
                        <Card>
                            <h3 className="text-xl font-bold mb-4">Interactive Learning App</h3>
                            <div className="flex justify-end space-x-4">
                                <Button 
                                    onClick={async () => { await handleSaveLearningAppAsInteractiveHtml(currentContent.learningApp!, learner); }} 
                                    className="bg-teal-600 hover:bg-teal-700"
                                >
                                    ⬇️ Save Interactive App
                                </Button>
                                <Button 
                                    onClick={async () => {
                                        const html = await handleSaveLearningAppAsInteractiveHtml(currentContent.learningApp!, learner, true);
                                        setEditorCode(html as string);
                                        setEditorTitle("Interactive Learning App");
                                        setIsEditorOpen(true);
                                    }} 
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                                >
                                    ✏️ Open in HTML Editor
                                </Button>
                                <Button 
                                    onClick={async () => {
                                        const html = await handleSaveLearningAppAsInteractiveHtml(currentContent.learningApp!, learner, true);
                                        saveContentToLibrary('LearningApp', 'Interactive Learning App', html as string);
                                    }} 
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    💾 Save to Library
                                </Button>
                            </div>
                            <div className="mt-4 p-4 bg-gray-50 border rounded text-sm text-gray-600">
                                This generates the gamified "Daily Mastery" app with Levels 1-4.
                            </div>
                        </Card>
                    )}

                    {activeTab === 'savedLessons' && currentContent?.printableWorksheet && (
                        <Card>
                            <h3 className="text-xl font-bold mb-4">Official Printable Worksheet</h3>
                            <div className="flex justify-end space-x-4">
                                <Button 
                                    onClick={() => handleSavePrintableWorksheetAsHtml(currentContent.printableWorksheet!, learner, `Worksheet_${learner.name.replace(/\s+/g, '_')}.html`)} 
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    ⬇️ Download Worksheet
                                </Button>
                                <Button 
                                    onClick={() => {
                                        const html = handleSavePrintableWorksheetAsHtml(currentContent.printableWorksheet!, learner, 'Worksheet.html', true) as string;
                                        setEditorCode(html);
                                        setEditorTitle("Printable Worksheet");
                                        setIsEditorOpen(true);
                                    }} 
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                                >
                                    ✏️ Open in HTML Editor
                                </Button>
                                <Button 
                                    onClick={() => {
                                        const html = handleSavePrintableWorksheetAsHtml(currentContent.printableWorksheet!, learner, 'Worksheet.html', true) as string;
                                        saveContentToLibrary('PrintableWorksheet', 'Printable Worksheet', html);
                                    }} 
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    💾 Save to Library
                                </Button>
                            </div>
                            <div className="mt-4 max-h-60 overflow-y-auto bg-gray-50 border p-4 rounded text-sm">
                                {currentContent.printableWorksheet.sections.map((s, i) => (
                                    <div key={i} className="mb-2"><strong>{s.title}:</strong> {s.instruction}</div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {activeTab === 'savedLessons' && (
                        currentContent?.gamifiedWeeklyChallenge ? 
                        <div className="mt-6 p-4 border rounded-md bg-indigo-50 border-indigo-200">
                            <h3 className="text-xl font-bold text-indigo-900 mb-2">{currentContent.gamifiedWeeklyChallenge.theme} Challenge</h3>
                            <p className="mb-4 text-indigo-800">{currentContent.gamifiedWeeklyChallenge.storylineIntro}</p>
                            <div className="flex flex-wrap gap-2">
                                <Button 
                                    onClick={() => handleSaveGamifiedChallengeAsHtml(currentContent.gamifiedWeeklyChallenge!, learner)}
                                    className="bg-teal-600 hover:bg-teal-700"
                                >
                                    ⬇️ Save Interactive App
                                </Button>
                                <Button 
                                    onClick={() => {
                                        const html = handleSaveGamifiedChallengeAsHtml(currentContent.gamifiedWeeklyChallenge!, learner, true) as string;
                                        setEditorCode(html);
                                        setEditorTitle("Gamified Weekly Challenge");
                                        setIsEditorOpen(true);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                                >
                                    ✏️ Open in HTML Editor
                                </Button>
                                <Button 
                                    onClick={() => {
                                        const html = handleSaveGamifiedChallengeAsHtml(currentContent.gamifiedWeeklyChallenge!, learner, true) as string;
                                        saveContentToLibrary('GamifiedChallenge', 'Gamified Weekly Challenge', html);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    💾 Save to Library
                                </Button>
                                <Button 
                                    onClick={() => {
                                        setAllContent(prev => {
                                            const next = {...prev};
                                            if (next[learner.id]) {
                                                delete next[learner.id].gamifiedWeeklyChallenge;
                                            }
                                            return next;
                                        });
                                    }}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    X Discard
                                </Button>
                            </div>
                        </div>
                        : (currentContent?.weeklyChallenge ? <WeeklyChallengeRenderer content={currentContent.weeklyChallenge} learner={learner} lessonSettings={learner.currentLessonSettings} onSaveToLibrary={saveContentToLibrary} /> : null)
                    )}
                    
                    {activeTab === 'savedLessons' && (
                        <SimulationsRenderer 
                            content={currentContent?.simulations} 
                            learner={learner} 
                            onUpdate={(updatedSims) => {
                                setAllContent(prev => {
                                    if (!learner) return prev;
                                    return {
                                        ...prev,
                                        [learner.id]: {
                                            ...prev[learner.id],
                                            simulations: updatedSims
                                        }
                                    };
                                });
                            }} 
                        />
                    )}
                    
                    {activeTab === 'savedLessons' && (currentContent?.studyGuide ? <StudyGuideRenderer content={currentContent.studyGuide} learner={learner} /> : null)}

                    {activeTab === 'savedLessons' && currentContent?.slidePackage && (
                        <div className="space-y-4">
                            <div className="flex gap-2 justify-end">
                                <Button onClick={() => handleSaveSlidesAsHtml(currentContent.slidePackage!.slides, learner, `Slides_${learner.name.replace(/\s+/g,'_')}.html`)} className="bg-teal-600">Save Slides HTML</Button>
                                <Button onClick={() => handleSaveSlideExplainerAsHtml(currentContent.slidePackage!, learner, `Explainer_${learner.name.replace(/\s+/g,'_')}.html`)} className="bg-purple-600">Save Explainer Doc</Button>
                            </div>
                            <Card>
                                <h3 className="text-xl font-bold mb-4">Slide Preview</h3>
                                <p className="text-gray-500">Total Slides: {currentContent.slidePackage.slides.length}</p>
                                <ul className="list-disc pl-5 mt-2">
                                    {currentContent.slidePackage.slides.map((s, sIdx) => (
                                        <li key={`${s.slideNumber || 'slide'}-${sIdx}`}>Slide {s.slideNumber}: {s.title}</li>
                                    ))}
                                </ul>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'savedLessons' && currentContent?.dailyLesson && (
                        <Card>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-bold">Daily English Lesson</h3>
                                <Button onClick={() => {
                                    setAllContent(prev => {
                                        const next = {...prev};
                                        if (next[learner.id]) delete next[learner.id].dailyLesson;
                                        return next;
                                    });
                                }} className="bg-red-600 hover:bg-red-700 text-sm py-1 px-3">X Discard</Button>
                            </div>
                            <p className="mb-4 text-green-600 font-semibold">Generated Successfully!</p>
                            <Button onClick={() => {
                                const blob = new Blob([currentContent.dailyLesson!.htmlContent], { type: 'text/html' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = buildLessonFileName({ learnerName: learner.name, lessonLabel: 'Daily English Lesson', ...getLessonFilePrefill(learner), audience: 'Learner' });
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            }} className="bg-green-600 hover:bg-green-700">Download Interactive HTML</Button>
                        </Card>
                    )}

                    {activeTab === 'savedLessons' && currentContent?.conversationGame && (
                        <Card>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-bold">Daily Conversation Game</h3>
                                <Button onClick={() => {
                                    setAllContent(prev => {
                                        const next = {...prev};
                                        if (next[learner.id]) delete next[learner.id].conversationGame;
                                        return next;
                                    });
                                }} className="bg-red-600 hover:bg-red-700 text-sm py-1 px-3">X Discard</Button>
                            </div>
                            <p className="mb-4 text-green-600 font-semibold">Generated Successfully! Theme: {currentContent.conversationGame.theme}</p>
                            <Button onClick={() => {
                                const blob = new Blob([currentContent.conversationGame!.htmlContent], { type: 'text/html' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = buildLessonFileName({ learnerName: learner.name, lessonLabel: 'Conversation Game', ...getLessonFilePrefill(learner), audience: 'Learner' });
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            }} className="bg-purple-600 hover:bg-purple-700">Download Interactive Game</Button>
                        </Card>
                    )}

                    {activeTab === 'savedLessons' && currentContent?.placeGame && (
                        <Card>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-bold">Guess the Place</h3>
                                <Button onClick={() => {
                                    setAllContent(prev => {
                                        const next = {...prev};
                                        if (next[learner.id]) delete next[learner.id].placeGame;
                                        return next;
                                    });
                                }} className="bg-red-600 hover:bg-red-700 text-sm py-1 px-3">X Discard</Button>
                            </div>
                            
                            {(currentContent.placeGame as any).places ? (
                                <>
                                    <div className="flex justify-end mb-4">
                                        <Button onClick={() => {
                                            const safeName = learner.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
                                            const htmlContent = generateStandalonePlaceGameHtml(currentContent.placeGame, safeName);
                                            const blob = new Blob([htmlContent], { type: 'text/html' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = buildLessonFileName({ learnerName: learner.name, lessonLabel: 'Guess The Place', ...getLessonFilePrefill(learner), audience: 'Learner' });
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                        }} className="bg-blue-600 hover:bg-blue-700">
                                            <i className="fas fa-download mr-2"></i> Download Game as HTML
                                        </Button>
                                    </div>
                                    <ManualPlaceGameRenderer data={currentContent.placeGame as any} />
                                </>
                            ) : (
                                <>
                                    <p className="mb-4 text-green-600 font-semibold">Location: {currentContent.placeGame.placeName} ({currentContent.placeGame.city}, {currentContent.placeGame.country})</p>
                                    <Button onClick={() => {
                                        const blob = new Blob([currentContent.placeGame!.htmlContent], { type: 'text/html' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = buildLessonFileName({ learnerName: learner.name, lessonLabel: 'Guess The Place', ...getLessonFilePrefill(learner), audience: 'Learner' });
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                    }} className="bg-blue-600 hover:bg-blue-700">Download Game</Button>
                                </>
                            )}
                        </Card>
                    )}

                    {activeTab === 'savedLessons' && currentContent?.partyMode && (
                        <Card>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-bold">🎉 Party Mode Arena</h3>
                                <Button onClick={() => {
                                    setAllContent(prev => {
                                        const next = {...prev};
                                        if (next[learner.id]) delete next[learner.id].partyMode;
                                        return next;
                                    });
                                }} className="bg-red-600 hover:bg-red-700 text-sm py-1 px-3">X Discard</Button>
                            </div>
                            <p className="mb-4 text-pink-600 font-semibold">{currentContent.partyMode.gameTitle}</p>
                            <p className="text-sm text-gray-600 mb-4">{currentContent.partyMode.gameDescription}</p>
                            <div className="flex gap-2">
                                <Button onClick={() => handleSavePartyModeAsHtml(currentContent.partyMode!, learner, buildLessonFileName({ learnerName: learner.name, lessonLabel: 'Party Mode', ...getLessonFilePrefill(learner), audience: 'Learner' }))} className="bg-pink-600 hover:bg-pink-700">
                                    Download Competitive Game App
                                </Button>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'savedLessons' && (
                        <div id="learner-page-saved-lessons">
                            <LearnerSavedFiles 
                                tutorName={tutorProfile?.name || 'Unknown_Tutor'} 
                                learnerName={learner.name || 'Unknown_Learner'} 
                            />
                        </div>
                    )}

                    {activeTab === 'lessonSettings' && (
                        <div id="learner-page-lesson-settings">
                            <LessonSettingsTab learner={learner} onUpdate={handleUpdateProfile} sessionFiles={sessionFiles} onAddFile={handleAddSessionFile} onRemoveFile={handleRemoveSessionFile} onGoToSaved={goToSavedLessonsFocused} onRenderLesson={goToSavedLessonsFocused} onMediaCheckChange={(counts) => setBrokenMediaCount(counts.broken)} lessonSections={lessonSections} lessonTypeLabel={lessonTypeLabel} />
                        </div>
                    )}
                    {activeTab === 'path' && <LearnerPathTab learner={learner} onUpdate={handleUpdateProfile} />}
                    {activeTab === 'chapters' && <LearnerSyllabusTab learner={learner} onUpdate={handleUpdateProfile} />}
                </main>
            </div>
            <ChatWidget learner={learner} content={currentContent} />
            {isSendLessonModalOpen && learner && (
                <SendSavedLessonModal
                    isOpen={isSendLessonModalOpen}
                    onClose={() => setIsSendLessonModalOpen(false)}
                    learner={learner as any}
                    currentContent={currentContent}
                />
            )}
            <HtmlLiveEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                initialLearnerHtml={editorCode}
                initialPresenterHtml={editorCode}
                title={editorTitle}
                learner={learner as any}
            />
        </div>
    );
};

export default LearnerPage;