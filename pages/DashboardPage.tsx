
import React, { FC, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LearnerProfile, LearnerContent, PlaceGame, PlatformProfile, GroupClass, StructuredOutput, HomeworkOutput, QuizOutput, WeeklyChallengeOutput, StudyGuideOutput, SimulationScenario, PrintableWorksheetOutput, PartyModeOutput, TutorProfile } from '../types';
import { SUPPORTED_TARGET_LANGUAGES } from '../types';
import { mapUserJsonProfileToLearnerProfile } from '../services/profileMapper';
import { generateProfileFromTranscript } from '../services/generation/profileService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import AddLearnerModal from '../components/learners/AddLearnerModal';
import LearnerRow from '../components/learners/LearnerRow';
import Textarea from '../components/ui/Textarea';
import Spinner from '../components/ui/Spinner';
import { REALISTIC_ENGLISH_LESSON, REALISTIC_EXPLAINER_LESSON, REALISTIC_CONVERSATIONAL_LESSON, REALISTIC_PARTY_MODE } from '../utils/testContent';
import App2Dashboard from './app2/Dashboard';
import { CEFR_LEVEL_ORDER, CEFR_LEVEL_LABELS, TIER_NAMES, getCefrTierTopics, countCumulativeCefrTopics, type CefrLevelKey } from '../utils/cefrGrammarDictionary';

/** The audience presets the lesson generators already understand. */
const PLATFORM_AUDIENCES = [
    'Adult Professional',
    'University Student',
    'Teenager',
    'Child',
    'General Learner',
];

export interface ConversationGame {
    id: string;
    characters: string;
    theme: string;
    secretCode: string;
    createdAt: string;
}

export interface DailyLesson {
    id: string;
    title: string;
    secretCode: string;
    createdAt: string;
}

const TranscriptToProfileModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onAdd: (p: LearnerProfile) => void;
}> = ({ isOpen, onClose, onAdd }) => {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    if (!isOpen) return null;

    const handleProcess = async () => {
        if (!text.trim()) return;
        setLoading(true);
        try {
            const data = await generateProfileFromTranscript(text);
            const profile: LearnerProfile = {
                id: Date.now().toString(),
                name: data.name || 'Extracted Learner',
                cefrLevel: data.cefrLevel || 'B1',
                l1Language: data.l1Language || 'English',
                targetLanguage: 'English',
                tutorVoice: 'You are an expert ESL/EFL content creator for language tutors, creating highly personalized and pedagogically sound learning materials.',
                personalInfo: {
                    age: 0,
                    country: data.personalInfo?.country || '',
                    occupation: data.personalInfo?.occupation || '',
                },
                interests: data.interests || '',
                facts: data.facts || [],
                learningChallenges: data.learningChallenges || [],
                needsAndExpectations: data.needsAndExpectations || '',
                sessionHistory: [],
                coursePlan: { longTermGoals: [], shortTermGoals: [] }
            };
            onAdd(profile);
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to extract profile. Please ensure you have pasted a substantial transcript.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-2">Create Profile from Transcript</h2>
                <p className="text-gray-600 mb-4">Paste a messy transcript of a student speaking. AI will analyze it to generate a detailed learner profile.</p>
                <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Tutor: How was your day? Student: Oh it was good, I worked as civil engineer before I moved to Athens..." rows={12} />
                <div className="flex justify-end gap-2 mt-6">
                    <Button onClick={onClose} className="bg-gray-400 hover:bg-gray-500">Cancel</Button>
                    <Button onClick={handleProcess} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                        {loading ? <><Spinner /> Processing...</> : <><i className="fas fa-magic mr-2"></i>Extract Profile</>}
                    </Button>
                </div>
            </div>
        </div>
    );
};

/**
 * Add / Edit Platform.
 *
 * Rebuilt as three tabs because a platform is really three things: who it is
 * (Basics), who the lessons are for (Audience), and what the output must look
 * like (Output & Rules). The old one-screen form could not set a level, a
 * language or an audience at all — which is why the dashboard card read
 * "undefined • undefined" and every platform lesson silently fell back to B1.
 */
const AddPlatformModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (platform: PlatformProfile) => void;
    platformToEdit: PlatformProfile | null;
}> = ({ isOpen, onClose, onSave, platformToEdit }) => {
    const blank = (): Omit<PlatformProfile, 'id'> => ({
        name: '',
        description: '',
        targetLevel: 'B1',
        cefrTier: 1,
        targetLanguage: 'English',
        targetAudience: 'General Learner',
        topic: '',
        country: '',
        city: '',
        specifications: { register: 'Neutral', outputFormat: 'Markdown', customInstructions: '', maxTokens: 3500 },
    });
    const [platform, setPlatform] = useState<Omit<PlatformProfile, 'id'>>(blank());
    const [tab, setTab] = useState<'basics' | 'audience' | 'output'>('basics');

    useEffect(() => {
        if (platformToEdit) {
            setPlatform({
                ...blank(),
                ...platformToEdit,
                specifications: { ...blank().specifications, ...platformToEdit.specifications },
            });
        } else {
            setPlatform(blank());
        }
        setTab('basics');
    }, [platformToEdit, isOpen]);

    if (!isOpen) return null;

    const specs = platform.specifications;
    const setSpecs = (patch: Partial<PlatformProfile['specifications']>) =>
        setPlatform(p => ({ ...p, specifications: { ...p.specifications, ...patch } }));

    const handleSave = () => {
        if (!platform.name.trim()) {
            setTab('basics');
            alert('Platform Name is required.');
            return;
        }
        const id = platformToEdit?.id || `platform-${Date.now()}`;
        onSave({ ...platform, id });
        onClose();
    };

    const TabBtn: FC<{ name: 'basics' | 'audience' | 'output'; label: string; icon: string }> = ({ name, label, icon }) => (
        <button
            type="button"
            onClick={() => setTab(name)}
            className={`flex-1 font-bold py-3 px-3 rounded-t-lg transition-colors border-b-4 flex items-center justify-center gap-2 text-sm ${
                tab === name ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
            <i className={`fas ${icon}`}></i>
            <span>{label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold">{platformToEdit ? 'Edit' : 'Add'} Platform</h2>
                    <p className="text-xs text-gray-500 mt-1">
                        A platform is a destination the lessons are written for — its own level, audience and output contract.
                    </p>
                </div>

                <div className="flex border-b border-gray-200 bg-gray-50">
                    <TabBtn name="basics" label="Basics" icon="fa-info-circle" />
                    <TabBtn name="audience" label="Audience" icon="fa-users" />
                    <TabBtn name="output" label="Output & Rules" icon="fa-file-code" />
                </div>

                <div className="p-6 max-h-[62vh] overflow-y-auto space-y-4">
                    {tab === 'basics' && (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Platform Name</label>
                                <Input value={platform.name} onChange={e => setPlatform({ ...platform, name: e.target.value })} placeholder="Platform Name (e.g., Coursera Quiz)" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">What it is for</label>
                                <Textarea value={platform.description} onChange={e => setPlatform({ ...platform, description: e.target.value })} placeholder="Description (e.g., For multiple-choice quizzes)" rows={2} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Target Language</label>
                                    <select value={platform.targetLanguage || 'English'} onChange={e => setPlatform({ ...platform, targetLanguage: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md bg-white text-black">
                                        {SUPPORTED_TARGET_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">CEFR Level &amp; Grammar Tier</label>
                                    <select value={platform.targetLevel || 'B1'} onChange={e => setPlatform({ ...platform, targetLevel: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md bg-white text-black">
                                        {CEFR_LEVEL_ORDER.map(lvl => <option key={lvl} value={lvl}>{CEFR_LEVEL_LABELS[lvl]}</option>)}
                                    </select>
                                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                        {[1, 2, 3].map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setPlatform({ ...platform, cefrTier: t })}
                                                title={`Tier ${t} — ${TIER_NAMES[t - 1]} (${getCefrTierTopics(platform.targetLevel || 'B1', t).length} topics)`}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                                    (platform.cefrTier || 1) === t
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                                                }`}
                                            >
                                                Tier {t}
                                            </button>
                                        ))}
                                        <span
                                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-700"
                                            title={`Grammar allowed at ${platform.targetLevel || 'B1'} · Tier ${platform.cefrTier || 1}`}
                                        >
                                            <i className="fas fa-eye mr-1"></i>Allowed Grammar ({countCumulativeCefrTopics(platform.targetLevel || 'B1', platform.cefrTier || 1)})
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-2">Same pair as the individual profile — every lesson written for this platform is held to it.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'audience' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Target Audience</label>
                                    <select value={platform.targetAudience || 'General Learner'} onChange={e => setPlatform({ ...platform, targetAudience: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md bg-white text-black">
                                        {PLATFORM_AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Topic / Focus</label>
                                    <Input value={platform.topic || ''} onChange={e => setPlatform({ ...platform, topic: e.target.value })} placeholder="e.g., Business English, IELTS speaking, exam drills" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Country</label>
                                    <Input value={platform.country || ''} onChange={e => setPlatform({ ...platform, country: e.target.value })} placeholder="e.g., United Arab Emirates" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">City</label>
                                    <Input value={platform.city || ''} onChange={e => setPlatform({ ...platform, city: e.target.value })} placeholder="e.g., Dubai" />
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                                The audience and topic are folded into every AI prompt for this platform, so the examples,
                                register and situations match who is actually reading the lesson.
                            </p>
                        </div>
                    )}

                    {tab === 'output' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Register</label>
                                    <select value={specs.register} onChange={e => setSpecs({ register: e.target.value as any })} className="w-full p-2 border border-gray-300 rounded-md bg-white text-black">
                                        {['Formal', 'Informal', 'Neutral', 'Academic', 'Business'].map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Format</label>
                                    <select value={specs.outputFormat} onChange={e => setSpecs({ outputFormat: e.target.value as any })} className="w-full p-2 border border-gray-300 rounded-md bg-white text-black">
                                        <option value="Markdown">Markdown</option>
                                        <option value="PlainText">Plain Text</option>
                                        <option value="HTML">HTML</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Tone</label>
                                    <select value={specs.tone || 'Encouraging & Professional'} onChange={e => setSpecs({ tone: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md bg-white text-black">
                                        {['Encouraging & Professional', 'Casual, Natural & Conversational', 'Strict, Academic & Rigorous', 'Playful, Energetic & Fun', 'Direct, Socratic & Challenge-Driven'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Word Count (optional)</label>
                                    <Input type="number" value={specs.wordCount?.toString() || ''} onChange={e => setSpecs({ wordCount: parseInt(e.target.value) || undefined })} placeholder="e.g., 1200" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Max Tokens</label>
                                    <Input type="number" value={(specs.maxTokens ?? 3500).toString()} onChange={e => setSpecs({ maxTokens: parseInt(e.target.value) || 3500 })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Emoji Intensity</label>
                                    <select value={specs.emojiIntensity || 'Moderate'} onChange={e => setSpecs({ emojiIntensity: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md bg-white text-black">
                                        {['None', 'Light', 'Moderate', 'Heavy'].map(x => <option key={x} value={x}>{x}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Custom Instructions</label>
                                <Textarea value={specs.customInstructions} onChange={e => setSpecs({ customInstructions: e.target.value })} placeholder="Custom Instructions (e.g., 'All questions must be multiple-choice.')" rows={4} />
                                <p className="text-[11px] text-gray-500 mt-2">
                                    These are injected into every lesson prompt for this platform (see the Copy AI Prompt button on the platform page).
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between gap-3">
                    <span className="text-[11px] text-gray-500">
                        {platform.targetLevel || 'B1'} · Tier {platform.cefrTier || 1} · {platform.targetAudience || 'General Learner'}
                    </span>
                    <div className="flex gap-2">
                        <Button onClick={onClose} className="bg-gray-200 text-gray-700 hover:bg-gray-300">Cancel</Button>
                        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">{platformToEdit ? 'Save Changes' : 'Add Platform'}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AddGroupModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (group: GroupClass) => void;
    groupToEdit: GroupClass | null;
}> = ({ isOpen, onClose, onSave, groupToEdit }) => {
    const [group, setGroup] = useState<Omit<GroupClass, 'id'>>({
        name: '', targetLevel: 'B1', requirements: '', learnerFacts: '', l1Language: '', targetLanguage: 'English', enableTranslations: true
    });

    useEffect(() => {
        if (groupToEdit) {
            setGroup({ ...groupToEdit, targetLanguage: groupToEdit.targetLanguage || 'English' });
        } else {
            setGroup({ name: '', targetLevel: 'B1', requirements: '', learnerFacts: '', l1Language: '', targetLanguage: 'English', enableTranslations: true });
        }
    }, [groupToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!group.name.trim() || !group.l1Language.trim()) {
            alert('Group Name and L1 Language are required.');
            return;
        }
        const id = groupToEdit?.id || `group-${Date.now()}`;
        onSave({ ...group, id });
        onClose();
        if (!groupToEdit) {
            setGroup({ name: '', targetLevel: 'B1', requirements: '', learnerFacts: '', l1Language: '', targetLanguage: 'English', enableTranslations: true });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                 <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold">{groupToEdit ? 'Edit' : 'Create'} Group Class</h2>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="font-semibold text-gray-700 block mb-1">Group Name</label>
                            <Input value={group.name} onChange={e => setGroup({ ...group, name: e.target.value })} placeholder="e.g., Business English A2" required />
                        </div>
                        <div>
                            <label className="font-semibold text-gray-700 block mb-1">Target Level</label>
                            <p className="text-xs text-gray-500 mb-1">Content will be generated 1 level below this.</p>
                            <select value={group.targetLevel} onChange={e => setGroup({ ...group, targetLevel: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md bg-white text-black">
                                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="font-semibold text-gray-700 block mb-1">L1 Language (Primary)</label>
                            <Input value={group.l1Language} onChange={e => setGroup({ ...group, l1Language: e.target.value })} placeholder="e.g., Spanish" required />
                        </div>
                        <div>
                            <label className="font-semibold text-gray-700 block mb-1">Target Language</label>
                            <select value={group.targetLanguage} onChange={e => setGroup({ ...group, targetLanguage: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md bg-white text-black">
                                {SUPPORTED_TARGET_LANGUAGES.map(lang => (
                                    <option key={lang} value={lang}>{lang}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={group.enableTranslations ?? true} 
                                onChange={e => setGroup({ ...group, enableTranslations: e.target.checked })} 
                                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                            />
                            <span className="font-semibold text-gray-700">Enable L1 Translations</span>
                        </label>
                        <p className="text-xs text-gray-500 pl-7">If checked, key vocabulary and phrases will be translated into the L1 Language.</p>
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Group Requirements / Goals</label>
                        <Textarea value={group.requirements} onChange={e => setGroup({ ...group, requirements: e.target.value })} placeholder="Focus on speaking, business vocabulary..." rows={3} />
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Learner Facts (All in one place)</label>
                        <p className="text-xs text-gray-500 mb-1">Paste facts about all students here. The AI will pick them up for personalization.</p>
                        <Textarea value={group.learnerFacts} onChange={e => setGroup({ ...group, learnerFacts: e.target.value })} placeholder="Maria likes tennis. Juan is a doctor..." rows={6} />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                    <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">{groupToEdit ? 'Save Changes' : 'Create Group'}</Button>
                </div>
            </div>
        </div>
    );
};


import SettingsModal from '../components/settings/SettingsModal';

import ManageSavedFiles from '../components/app2/dashboard/ManageSavedFiles';

const DashboardPage: FC<{
    learners: LearnerProfile[];
    setLearners: React.Dispatch<React.SetStateAction<LearnerProfile[]>>;
    platforms: PlatformProfile[];
    setPlatforms: React.Dispatch<React.SetStateAction<PlatformProfile[]>>;
    groupClasses: GroupClass[];
    setGroupClasses: React.Dispatch<React.SetStateAction<GroupClass[]>>;
    allContent: Record<string, LearnerContent>;
    setAllContent: React.Dispatch<React.SetStateAction<Record<string, LearnerContent>>>;
    groupContent: Record<string, LearnerContent>;
    setGroupContent: React.Dispatch<React.SetStateAction<Record<string, LearnerContent>>>;
    platformContent: Record<string, LearnerContent>;
    setPlatformContent: React.Dispatch<React.SetStateAction<Record<string, LearnerContent>>>;
    dailyLessons: DailyLesson[];
    setDailyLessons: React.Dispatch<React.SetStateAction<DailyLesson[]>>;
    conversationGames: ConversationGame[];
    setConversationGames: React.Dispatch<React.SetStateAction<ConversationGame[]>>;
    placeGames: PlaceGame[];
    setPlaceGames: React.Dispatch<React.SetStateAction<PlaceGame[]>>;
    recentLearnerIds: string[];
    setRecentLearnerIds: React.Dispatch<React.SetStateAction<string[]>>;
    tutorProfile: TutorProfile;
    setTutorProfile: React.Dispatch<React.SetStateAction<TutorProfile>>;
}> = ({
    learners, setLearners,
    platforms, setPlatforms,
    groupClasses, setGroupClasses,
    allContent, setAllContent,
    groupContent, setGroupContent,
    platformContent, setPlatformContent,
    recentLearnerIds,
    tutorProfile,
    setTutorProfile
}) => {
    const navigate = useNavigate();
    const bulkInputRef = useRef<HTMLInputElement>(null);
    const [isAddLearnerOpen, setIsAddLearnerOpen] = useState(false);
    const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
    const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
    const [isAddPlatformOpen, setIsAddPlatformOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<GroupClass | null>(null);
    const [editingPlatform, setEditingPlatform] = useState<PlatformProfile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'learner' | 'group' | 'platform'>('all');
    
    const [learnerPage, setLearnerPage] = useState(1);
    const itemsPerPage = 10;

    // Unified Data Processing
    const allItems = [
        ...learners.map(l => {
            const content = allContent[l.id];
            const lessonCount = content?.generatedLessons ? Object.keys(content.generatedLessons).length : 0;
            const deadline = l.currentLessonSettings?.nextClassDate;
            
            return {
                id: l.id,
                type: 'learner' as const,
                name: l.name,
                level: l.cefrLevel,
                language: l.targetLanguage,
                lastActive: l.lastGeneratedAt || new Date().toISOString(),
                stats: { 
                    lessons: lessonCount, 
                    deadline: deadline ? new Date(deadline).toLocaleDateString() : 'No Deadline'
                }
            };
        }),
        ...groupClasses.map(g => {
            const content = groupContent[g.id];
            const lessonCount = content?.generatedLessons ? Object.keys(content.generatedLessons).length : 0;
            const deadline = g.currentLessonSettings?.nextClassDate;

            return {
                id: g.id,
                type: 'group' as const,
                name: g.name,
                level: g.targetLevel,
                language: g.targetLanguage,
                lastActive: new Date().toISOString(), // Groups need lastActive in type
                stats: { 
                    lessons: lessonCount, 
                    deadline: deadline ? new Date(deadline).toLocaleDateString() : 'No Deadline'
                }
            };
        }),
        ...platforms.map(p => {
            const content = platformContent[p.id];
            const lessonCount = content?.generatedLessons ? Object.keys(content.generatedLessons).length : 0;
            const deadline = p.currentLessonSettings?.nextClassDate;

            return {
                id: p.id,
                type: 'platform' as const,
                name: p.name,
                level: 'N/A',
                language: 'English',
                lastActive: new Date().toISOString(),
                stats: { 
                    lessons: lessonCount, 
                    deadline: deadline ? new Date(deadline).toLocaleDateString() : 'No Deadline'
                }
            };
        })
    ];

    const filteredItems = allItems
        .filter(item => {
            if (filterType !== 'all' && item.type !== filterType) return false;
            return item.name.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice((learnerPage - 1) * itemsPerPage, learnerPage * itemsPerPage);

    const handleAddLearner = (profile: LearnerProfile) => {
        setLearners(prev => {
            if (prev.find(l => l.name === profile.name || l.id === profile.id)) {
                alert(`Learner ${profile.name} already exists.`);
                return prev;
            }
            return [...prev, profile];
        });
        setIsAddLearnerOpen(false);
    };

    const handleBulkImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                const importedList = data.learners || [];
                
                setLearners(prev => {
                    const existingNames = new Set(prev.map(l => l.name.toLowerCase()));
                    const existingIds = new Set(prev.map(l => l.id));
                    const toAdd: LearnerProfile[] = [];
                    
                    importedList.forEach((raw: any) => {
                        const mapped = mapUserJsonProfileToLearnerProfile(raw);
                        if (!existingNames.has(mapped.name.toLowerCase()) && !existingIds.has(mapped.id)) {
                            toAdd.push(mapped);
                        }
                    });

                    if (toAdd.length === 0) {
                        alert("No new unique learners found in the file.");
                        return prev;
                    }
                    alert(`Imported ${toAdd.length} new learners.`);
                    return [...prev, ...toAdd];
                });
            } catch (err) {
                alert('Invalid JSON file format. Could not import.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleAddTestUser = () => {
        const testId = "test-user-alpha";
        const generationDate = new Date().toISOString();
        
        // Detailed Test Profile
        const testUser: LearnerProfile = {
            id: testId,
            name: "Test Student Alpha",
            cefrLevel: "B2",
            l1Language: "Spanish",
            targetLanguage: "English",
            tutorVoice: "You are an expert ESL/EFL content creator.",
            readAloudVoice: 'Microsoft Ava Online (Natural) - English (United States)',
            personalInfo: { age: 30, country: "Spain", occupation: "Marketing Manager" },
            interests: "Remote Work, Technology, Travel, Cooking",
            facts: ["Works for a tech startup.", "Wants to move to London."],
            needsAndExpectations: "Wants to sound professional in Zoom meetings.",
            learningChallenges: ["Phrasal Verbs", "Present Perfect"],
            sessionHistory: [],
            coursePlan: { longTermGoals: ["Fluent Business English"], shortTermGoals: ["Lead a meeting"] },
            lastGeneratedAt: generationDate
        };

        const longText = "Remote work has transformed the business landscape. While it offers flexibility, it also demands discipline and robust communication skills. Employees must learn to manage their time effectively and maintain work-life balance.";

        // Use the REALISTIC content from utils/testContent.ts
        const mockContent: LearnerContent = {
            rawText: longText,
            lessonText: longText,
            learningPackage: {
                lesson: REALISTIC_ENGLISH_LESSON,
                lessonPlan: "<h3>Lesson Plan</h3><p>Teach the basics of remote work vocabulary.</p>",
                lessonSummary: "Focus on remote work vocab.",
                homework: {
                    reading: { title: "Read", tasks: [{ title: "Article", text: "<p>Article text...</p>", questions: [{question:"Q1", answer:"A1"}] }] },
                    listening: { title: "Listen", podcast: { title: "Pod", scenario: "Office", script: "Hello...", questions: [] }, conversation: { title: "Chat", scenario: "Coffee", script: "Hi...", questions: [] } },
                    speaking: { title: "Speak", instruction: "Record", prompt: "Talk about work", modelAnswer: "I work..." },
                    writing: { title: "Write", instruction: "Email", prompt: "Write to boss" },
                    grammar: { title: "Grammar", explanation: "Present Perfect", exercises: "1. I have..." },
                    vocabulary: { title: "Vocab", explanation: "Work words", exercises: "Match..." },
                    integratedSkills: { title: "Integrated", scenario: "Project", task: "Plan..." },
                    softSkills: { title: "Soft Skills", scenario: "Conflict", task: "Solve..." },
                    answerKey: "All answers..."
                },
                quiz: { sections: [{ title: "Section A", color: "#333", activities: [] }], answerKey: "Key..." },
                generatedAt: generationDate,
                completed: false
            },
            partyMode: REALISTIC_PARTY_MODE,
            generatedLessons: {
                'englishLesson': REALISTIC_ENGLISH_LESSON,
                'explainerLesson': REALISTIC_EXPLAINER_LESSON,
                'conversationalLesson': REALISTIC_CONVERSATIONAL_LESSON
            }
        };

        setLearners(prev => [...prev.filter(l => l.id !== testId), testUser]);
        setAllContent(prev => ({ ...prev, [testId]: mockContent }));
        
        alert("Test Student Alpha updated with REALISTIC, LONG-FORM content!");
    };

    const handleSaveGroup = (group: GroupClass) => {
        setGroupClasses(prev => {
            const index = prev.findIndex(g => g.id === group.id);
            if (index >= 0) {
                const newGroups = [...prev];
                newGroups[index] = group;
                return newGroups;
            }
            return [...prev, group];
        });
        setIsAddGroupOpen(false);
        setEditingGroup(null);
    };
    
    const handleDeleteGroup = (id: string) => {
        if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
            // Update state immediately
            setGroupClasses(prev => prev.filter(g => g.id !== id));
            // Cleanup content
            setGroupContent(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    const handleSavePlatform = (platform: PlatformProfile) => {
        setPlatforms(prev => {
            const index = prev.findIndex(p => p.id === platform.id);
            if (index >= 0) {
                const newPlatforms = [...prev];
                newPlatforms[index] = platform;
                return newPlatforms;
            }
            return [...prev, platform];
        });
        setIsAddPlatformOpen(false);
        setEditingPlatform(null);
    };

    const handleDeletePlatform = (id: string) => {
        if (window.confirm('Are you sure you want to delete this platform? This action cannot be undone.')) {
            setPlatforms(prev => prev.filter(p => p.id !== id));
            setPlatformContent(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    const handleDeleteLearner = (id: string) => {
        setLearners(prev => prev.filter(l => l.id !== id));
        setAllContent(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const handleToggleComplete = (id: string) => {
        setAllContent(prev => {
            const current = prev[id];
            if (!current || !current.learningPackage) return prev;
            return {
                ...prev,
                [id]: {
                    ...current,
                    learningPackage: {
                        ...current.learningPackage,
                        completed: !current.learningPackage.completed
                    }
                }
            };
        });
    };

    const filteredLearners = learners.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const paginatedLearners = filteredLearners.slice((learnerPage - 1) * itemsPerPage, learnerPage * itemsPerPage);

    return (
        <div className="space-y-8">
            <AddLearnerModal isOpen={isAddLearnerOpen} onClose={() => setIsAddLearnerOpen(false)} onAddLearner={handleAddLearner} learners={learners} />
            <TranscriptToProfileModal isOpen={isTranscriptOpen} onClose={() => setIsTranscriptOpen(false)} onAdd={handleAddLearner} />
            <AddGroupModal isOpen={isAddGroupOpen} onClose={() => { setIsAddGroupOpen(false); setEditingGroup(null); }} onSave={handleSaveGroup} groupToEdit={editingGroup} />
            <AddPlatformModal isOpen={isAddPlatformOpen} onClose={() => { setIsAddPlatformOpen(false); setEditingPlatform(null); }} onSave={handleSavePlatform} platformToEdit={editingPlatform} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} tutorProfile={tutorProfile} setTutorProfile={setTutorProfile} />
            
            <input type="file" ref={bulkInputRef} className="hidden" accept=".json" onChange={handleBulkImport} />

            {/* MAIN CONTENT GRID */}
            <div className="space-y-8">
                <App2Dashboard 
                    platforms={platforms} 
                    tutorProfile={tutorProfile} 
                    setPlatforms={setPlatforms} 
                    setIsAddPlatformOpen={setIsAddPlatformOpen} 
                    setTutorProfile={setTutorProfile}
                />
            </div>
            
            <div id="tutor-manage-saved-files" className="mt-12">
                <ManageSavedFiles />
            </div>
        </div>
    );
};

export default DashboardPage;
