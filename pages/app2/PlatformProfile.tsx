import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { PlatformProfile, LearnerContent, TutorProfile } from '../../types';
import LearnerPage from '../../pages/LearnerPage';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import { SearchableVoiceSelect } from '../../components/ui/SearchableVoiceSelect';
import { SUPPORTED_TARGET_LANGUAGES, LANGUAGE_CODE_MAP } from '../../types';
import { CEFR_LEVEL_ORDER, CEFR_LEVEL_LABELS, TIER_NAMES, getCefrTierTopics, countCumulativeCefrTopics, type CefrLevelKey } from '../../utils/cefrGrammarDictionary';

type ActiveTab = 'generator' | 'settings' | 'history';

/** The audience presets the lesson generators already understand. */
const PLATFORM_AUDIENCES = ['Adult Professional', 'University Student', 'Teenager', 'Child', 'General Learner'];

interface PlatformSessionConfig {
    targetLevel: string;
    /** Grammar tier 1 · Easy / 2 · Medium / 3 · Advanced — same pair as the individual profile. */
    cefrTier: number;
    targetAudience: string;
    targetLanguage: string;
    topic: string;
    readAloudVoice: string;
    enableTranslations: boolean;
    age: number;
    gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    country: string;
    city: string;
}

const PlatformProfile: React.FC<{
    platforms: PlatformProfile[];
    setPlatforms: React.Dispatch<React.SetStateAction<PlatformProfile[]>>;
    platformContent: Record<string, LearnerContent>;
    setPlatformContent: React.Dispatch<React.SetStateAction<Record<string, LearnerContent>>>;
    tutorProfile?: TutorProfile;
}> = (props) => {
    const { id } = useParams<{ id: string }>();
    const platform = props.platforms.find(p => p.id === id);

    const [activeTab, setActiveTab] = useState<ActiveTab>('generator');
    const [sessionConfig, setSessionConfig] = useState<PlatformSessionConfig>({
        targetLevel: platform?.targetLevel || 'B2',
        cefrTier: platform?.cefrTier || 1,
        targetAudience: platform?.targetAudience || 'Adult Professional',
        targetLanguage: platform?.targetLanguage || 'English',
        topic: platform?.topic || platform?.description || 'General Topic',
        readAloudVoice: platform?.readAloudVoice || 'Microsoft Ava Online (Natural) - English (United States)',
        enableTranslations: true,
        age: 25,
        gender: 'Other',
        country: platform?.country || 'Global',
        city: platform?.city || 'Internet'
    });

    /* Re-sync whenever the platform arrives or changes. State initialisers only run
       once, so a platform loaded after the first paint (or a different one opened from
       the dashboard) used to keep showing the previous settings — and saving then
       wrote them back over the real ones. */
    useEffect(() => {
        if (!platform) return;
        setSessionConfig(prev => ({
            ...prev,
            targetLevel: platform.targetLevel || prev.targetLevel,
            cefrTier: platform.cefrTier || prev.cefrTier,
            targetAudience: platform.targetAudience || prev.targetAudience,
            targetLanguage: platform.targetLanguage || prev.targetLanguage,
            topic: platform.topic || platform.description || prev.topic,
            readAloudVoice: platform.readAloudVoice || prev.readAloudVoice,
            country: platform.country || prev.country,
            city: platform.city || prev.city,
        }));
    }, [platform?.id]);

    const [specs, setSpecs] = useState(platform?.specifications || {
        register: 'Formal', outputFormat: 'Markdown', customInstructions: '', maxTokens: 3500
    });
    const [advPrefs, setAdvPrefs] = useState({
        examPrepDetails: platform?.examPrepDetails || '',
        languageFocus: platform?.languageFocus || '',
        commonMistakes: platform?.commonMistakes || '',
        lessonPrefs: platform?.lessonPrefs || '',
        lessonPlanPrefs: platform?.lessonPlanPrefs || '',
        homeworkPrefs: platform?.homeworkPrefs || '',
        quizPrefs: platform?.quizPrefs || ''
    });

    if (!platform) {
        return <div className="text-center p-10 font-bold">Platform not found or still loading...</div>;
    }

    const platformAsLearnerForAI = {
        ...platform,
        id: platform.id,
        name: platform.name,
        cefrLevel: sessionConfig.targetLevel,
        // The grammar tier, audience and the platform's own output contract. All three
        // are read by the lesson prompts (see the OUTPUT CONTRACT block in
        // components/content/ManualGenerator.tsx), so "Copy AI Prompt" now carries the
        // register, format, length and custom rules of this platform.
        cefrTier: sessionConfig.cefrTier,
        targetAudience: sessionConfig.targetAudience,
        platformName: platform.name,
        platformSpecs: {
            ...specs,
            targetAudience: sessionConfig.targetAudience,
            topic: sessionConfig.topic,
        },
        l1Language: sessionConfig.targetLanguage === 'English' ? 'Spanish' : 'English',
        targetLanguage: sessionConfig.targetLanguage,
        translationLanguage: sessionConfig.targetLanguage === 'English' ? 'Spanish' : 'English',
        tutorVoice: "You are an expert content creator.",
        interests: sessionConfig.topic,
        facts: [`Content created for platform: ${platform.name}`, `Focus: ${platform.description}`],
        personalInfo: { age: sessionConfig.age, country: sessionConfig.country, city: sessionConfig.city, gender: sessionConfig.gender, address: `${sessionConfig.city}, ${sessionConfig.country}` },
        learningChallenges: [],
        sessionHistory: [],
        coursePlan: { longTermGoals: [], shortTermGoals: [] },
        needsAndExpectations: platform.specifications.customInstructions,
        readAloudVoice: sessionConfig.readAloudVoice,
        enableTranslations: sessionConfig.enableTranslations,
        examPrepDetails: advPrefs.examPrepDetails,
        languageFocus: advPrefs.languageFocus,
        commonMistakes: advPrefs.commonMistakes,
        lessonPrefs: advPrefs.lessonPrefs,
        lessonPlanPrefs: advPrefs.lessonPlanPrefs,
        homeworkPrefs: advPrefs.homeworkPrefs,
        quizPrefs: advPrefs.quizPrefs,
        sessions: [],
        email: '', phone: '', languages: [], occupation: 'Platform Audience', major: '', dateCreated: new Date().toISOString(), xp: 0, streak: 0, avatarId: 1, competencies: []
    } as any;

    const TabButton: React.FC<{ name: ActiveTab; label: string; icon: string }> = ({ name, label, icon }) => (
        <button
            onClick={() => setActiveTab(name)}
            className={`flex-1 font-bold py-3 px-4 rounded-t-lg transition-colors border-b-4 flex items-center justify-center gap-2 text-sm sm:text-base ${activeTab === name ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
            <i className={`fas ${icon}`}></i>
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    const handleSaveSpecs = () => {
        props.setPlatforms(prev => prev.map(p => p.id === platform.id ? {
            ...p,
            specifications: specs as any,
            ...advPrefs,
            // The ceiling, audience and focus are part of the platform, not just of this
            // browser tab — without saving them the dashboard card showed
            // "undefined • undefined" and the next visit regenerated at the defaults.
            targetLevel: sessionConfig.targetLevel,
            cefrTier: sessionConfig.cefrTier,
            targetLanguage: sessionConfig.targetLanguage,
            targetAudience: sessionConfig.targetAudience,
            topic: sessionConfig.topic,
            readAloudVoice: sessionConfig.readAloudVoice,
            country: sessionConfig.country,
            city: sessionConfig.city
        } : p));
    };

    const handleAdvChange = (field: string, val: string) => {
        setAdvPrefs(prev => ({...prev, [field]: val}));
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-4 -translate-y-4">
                    <i className="fas fa-satellite-dish text-9xl"></i>
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-extrabold flex items-center gap-3">
                                <span>{platform.name}</span>
                            </h1>
                            <p className="opacity-80 mt-1">{platform.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex border-b border-gray-200 -mb-px">
                <TabButton name="generator" label="Lessons (Generator)" icon="fa-laptop-code" />
                <TabButton name="settings" label="Platform Settings" icon="fa-cogs" />
                <TabButton name="history" label="Generation History" icon="fa-history" />
            </div>

            <div className="mt-6">
                {activeTab === 'generator' && (
                    <div className="animate-fade-in -mx-4 sm:mx-0">
                        <LearnerPage
                            isEmbedded={true}
                            embeddedLearnerId={id}
                            learners={[platformAsLearnerForAI]}
                            setLearners={(action) => {
                                // For platform we only generate, we do not sync learning progress here
                            }}
                            allContent={props.platformContent || {}}
                            setAllContent={props.setPlatformContent || (() => {})}
                            recentLearnerIds={[]}
                            setRecentLearnerIds={() => {}}
                            platforms={props.platforms || []}
                            tutorProfile={props.tutorProfile}
                        />
                    </div>
                )}

                {activeTab === 'settings' && (
                    <Card className="animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Platform Persona Settings</h2>
                            <Button onClick={handleSaveSpecs} className="bg-green-600 hover:bg-green-700"><i className="fas fa-save mr-2"></i>Save Settings</Button>
                        </div>

                        <div className="space-y-6">
                            <div className="border-b pb-4">
                                <h3 className="font-semibold text-lg mb-4 text-brand-purple">Virtual Learner / Audience Persona</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Target Language</label>
                                        <select value={sessionConfig.targetLanguage} onChange={e => setSessionConfig({...sessionConfig, targetLanguage: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg">
                                            {SUPPORTED_TARGET_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">CEFR Level &amp; Grammar Tier</label>
                                        <select value={sessionConfig.targetLevel} onChange={e => setSessionConfig({...sessionConfig, targetLevel: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg">
                                            {CEFR_LEVEL_ORDER.map(l => <option key={l} value={l}>{CEFR_LEVEL_LABELS[l]}</option>)}
                                        </select>
                                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                            {[1, 2, 3].map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setSessionConfig({...sessionConfig, cefrTier: t})}
                                                    title={`Tier ${t} — ${TIER_NAMES[t - 1]} (${getCefrTierTopics(sessionConfig.targetLevel, t).length} topics)`}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${sessionConfig.cefrTier === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'}`}
                                                >
                                                    Tier {t}
                                                </button>
                                            ))}
                                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-700">
                                                <i className="fas fa-eye mr-1"></i>Allowed Grammar ({countCumulativeCefrTopics(sessionConfig.targetLevel, sessionConfig.cefrTier)})
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Target Audience</label>
                                        <select value={sessionConfig.targetAudience} onChange={e => setSessionConfig({...sessionConfig, targetAudience: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg">
                                            {PLATFORM_AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Topic / Focus</label>
                                        <Input value={sessionConfig.topic} onChange={e => setSessionConfig({...sessionConfig, topic: e.target.value})} placeholder="General Interest" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Default Voice</label>
                                        <SearchableVoiceSelect value={sessionConfig.readAloudVoice || ''} onChange={val => setSessionConfig({...sessionConfig, readAloudVoice: val})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Country</label>
                                        <Input value={sessionConfig.country} onChange={e => setSessionConfig({...sessionConfig, country: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">City</label>
                                        <Input value={sessionConfig.city} onChange={e => setSessionConfig({...sessionConfig, city: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="border-b pb-4">
                                <h3 className="font-semibold text-lg mb-4 text-brand-blue">Output Specifications</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Register</label>
                                        <select value={specs.register} onChange={e => setSpecs({...specs, register: e.target.value as any})} className="w-full p-2 border border-gray-300 rounded-lg">
                                            {['Formal', 'Informal', 'Neutral', 'Academic', 'Business'].map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Format</label>
                                        <select value={specs.outputFormat} onChange={e => setSpecs({...specs, outputFormat: e.target.value as any})} className="w-full p-2 border border-gray-300 rounded-lg">
                                            <option value="Markdown">Markdown</option>
                                            <option value="PlainText">Plain Text</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Max Tokens</label>
                                        <Input type="number" value={specs.maxTokens?.toString() || '3500'} onChange={e => setSpecs({...specs, maxTokens: parseInt(e.target.value) || 3500})} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium mb-1">App/Platform Custom Instructions</label>
                                    <Textarea value={specs.customInstructions} onChange={e => setSpecs({...specs, customInstructions: e.target.value})} rows={3} placeholder="Apply formatting rules here..." />
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-lg mb-4 text-brand-green">Advanced Rules for Generators</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium mb-1">Exam Prep Target</label><Input value={advPrefs.examPrepDetails || ''} onChange={e => handleAdvChange('examPrepDetails', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium mb-1">Language Focus</label><Input value={advPrefs.languageFocus || ''} onChange={e => handleAdvChange('languageFocus', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium mb-1">Common Mistakes</label><Input value={advPrefs.commonMistakes || ''} onChange={e => handleAdvChange('commonMistakes', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium mb-1">Lesson Directives</label><Input value={advPrefs.lessonPrefs || ''} onChange={e => handleAdvChange('lessonPrefs', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium mb-1">Homework Directives</label><Input value={advPrefs.homeworkPrefs || ''} onChange={e => handleAdvChange('homeworkPrefs', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium mb-1">Quiz Directives</label><Input value={advPrefs.quizPrefs || ''} onChange={e => handleAdvChange('quizPrefs', e.target.value)} /></div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {activeTab === 'history' && (
                    <Card className="animate-fade-in">
                        <h2 className="text-2xl font-bold mb-4">Generation History</h2>
                        {!platform.lessonHistory || platform.lessonHistory.length === 0 ? (
                            <p className="text-gray-500 text-center py-10">No history available for this platform context.</p>
                        ) : (
                            <div className="space-y-4">
                                {platform.lessonHistory.slice().reverse().map((hist, i) => (
                                    <div key={i} className="border-l-4 border-brand-purple bg-brand-blue/5 p-4 rounded-r-lg shadow-sm">
                                        <h4 className="font-bold text-lg text-gray-800">{hist.title}</h4>
                                        <p className="text-sm text-gray-500 mb-2">{new Date(hist.date).toLocaleDateString()}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {hist.headings?.map((h, j) => (
                                                <span key={j} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-md text-gray-600">{h}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
};

export default PlatformProfile;
