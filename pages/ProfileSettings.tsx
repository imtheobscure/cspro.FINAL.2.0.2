
import React, { FC, useState, useEffect } from 'react';
import type { LearnerProfile } from '../types';
import { SearchableVoiceSelect } from '../components/ui/SearchableVoiceSelect';
import { SUPPORTED_TARGET_LANGUAGES, LANGUAGE_CODE_MAP } from '../types';
import Card from '../components/ui/Card';
import Textarea from '../components/ui/Textarea';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const FormSection: FC<React.PropsWithChildren<{ title: string; description: string }>> = ({ title, description, children }) => (
    <div className="mt-6 pt-6 border-t">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const ProfileSettings: FC<{learner: LearnerProfile, onUpdate: (profile: LearnerProfile) => void}> = ({learner, onUpdate}) => {
    // FIX: Initialize state with a default for personalInfo to prevent crashes on malformed legacy data.
    const [profile, setProfile] = useState({
        ...learner,
        personalInfo: learner.personalInfo || { age: 0, country: '', gender: 'Prefer not to say' },
        targetLanguage: learner.targetLanguage || 'English'
    });
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        // FIX: Ensure personalInfo exists when the learner prop changes.
        setProfile({
            ...learner,
            personalInfo: learner.personalInfo || { age: 0, country: '', gender: 'Prefer not to say' },
            targetLanguage: learner.targetLanguage || 'English'
        });
    }, [learner]);

    useEffect(() => {
        const getVoices = () => {
            const voiceList = window.speechSynthesis.getVoices();
            const langCode = LANGUAGE_CODE_MAP[profile.targetLanguage || 'English'] || 'en';
            setVoices(voiceList.filter(voice => voice.lang.startsWith(langCode)));
        };
        getVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
             speechSynthesis.onvoiceschanged = getVoices;
        }
    }, [profile.targetLanguage]);
    
    const handleSave = () => {
        onUpdate(profile);
        alert("Profile settings updated!");
    };
    
    const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const genders: LearnerProfile['personalInfo']['gender'][] = ['Male', 'Female', 'Other', 'Prefer not to say'];

    return (
        <Card>
            <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile & Generation Settings</h2>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Save Settings</Button>
            </div>
            
            <FormSection title="Learner Identity" description="Basic profile information.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Full Name</label>
                        <Input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} placeholder="Learner's Name"/>
                    </div>
                </div>
            </FormSection>

            <FormSection title="Personal Information" description="Basic learner details for personalization.">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Gender</label>
                         <select value={profile.personalInfo.gender || ''} onChange={e => setProfile(p => ({...p, personalInfo: {...p.personalInfo, gender: e.target.value as any}}))} className="w-full p-2 border border-gray-300 rounded-md bg-white text-black">
                             <option value="">Select Gender</option>
                             {genders.map(g => <option key={g} value={g}>{g}</option>)}
                         </select>
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Occupation</label>
                        <Input value={profile.personalInfo.occupation || ''} onChange={e => setProfile(p => ({...p, personalInfo: {...p.personalInfo, occupation: e.target.value}}))} placeholder="e.g., Software Engineer"/>
                    </div>
                     <div>
                        <label className="font-semibold text-gray-700 block mb-1">Address</label>
                         <p className="text-xs text-gray-500 mb-1">Used to generate localized, relevant content.</p>
                        <Input value={profile.personalInfo.address || ''} onChange={e => setProfile(p => ({...p, personalInfo: {...p.personalInfo, address: e.target.value}}))} placeholder="e.g., Paris, France"/>
                    </div>
                 </div>
            </FormSection>

            <FormSection title="Learning & Course Details" description="Information about the learner's course and target level.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="font-semibold text-gray-700 block mb-1">CEFR Level</label>
                        <p className="text-xs text-gray-500 mb-1">The AI will simplify content to one level below this.</p>
                         <select value={profile.cefrLevel} onChange={e => setProfile(p => ({...p, cefrLevel: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md bg-white text-black">
                            {cefrLevels.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Target Language</label>
                        <p className="text-xs text-gray-500 mb-1">The language the student wants to learn.</p>
                        <select 
                            value={profile.targetLanguage} 
                            onChange={e => setProfile(p => ({...p, targetLanguage: e.target.value}))} 
                            className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
                        >
                            {SUPPORTED_TARGET_LANGUAGES.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Course Name</label>
                        <p className="text-xs text-gray-500 mb-1">Displayed in the generated files.</p>
                        <Input 
                            value={profile.coursePlan?.courseName || ''} 
                            onChange={e => setProfile(p => ({...p, coursePlan: {...p.coursePlan, courseName: e.target.value}}))} 
                            placeholder="e.g., Intensive Business English"
                        />
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Class Frequency (per week)</label>
                        <p className="text-xs text-gray-500 mb-1">Used to calculate the "Daily Drip" schedule for files.</p>
                        <Input 
                            type="number"
                            value={profile.coursePlan?.classFrequency?.toString() || '3'} 
                            onChange={e => setProfile(p => ({...p, coursePlan: {...p.coursePlan, classFrequency: parseInt(e.target.value) || 3}}))} 
                            placeholder="e.g., 3"
                        />
                    </div>
                </div>
            </FormSection>

             <FormSection title="Exam Preparation" description="Specify if the learner is preparing for a specific exam.">
                <div>
                    <label className="font-semibold text-gray-700 block mb-1">Exam Details</label>
                    <p className="text-xs text-gray-500 mb-1">E.g., "IELTS Academic, target band 8.0" or "TOEFL iBT, focus on speaking section".</p>
                    <Input
                        value={profile.examPrepDetails || ''}
                        onChange={e => setProfile({...profile, examPrepDetails: e.target.value})}
                        placeholder="Enter exam name and target score/focus"
                    />
                </div>
            </FormSection>

            <FormSection title="Personalization Info (Auto-Synced from Profile)" description="This data is automatically pulled from the learner's profile tabs (Goals, Competencies, Sessions).">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-sm text-blue-700">
                    <p className="font-bold mb-2">✨ Automatic AI Sync</p>
                    <p>Interests, Needs, Common Mistakes, and Facts are automatically synchronized from the learner's main profile, competency tracking, and past sessions.</p>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end mt-4">
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Translation Language</label>
                        <p className="text-xs text-gray-500 mb-1">Language for keyword translations (e.g., Spanish).</p>
                        <Input value={profile.translationLanguage || ''} onChange={e => setProfile({...profile, translationLanguage: e.target.value})} placeholder="e.g., Spanish"/>
                    </div>
                    <div>
                        <label className="flex items-center space-x-2 cursor-pointer pb-2">
                            <input
                                type="checkbox"
                                checked={profile.enableTranslations ?? true}
                                onChange={e => setProfile({...profile, enableTranslations: e.target.checked})}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Enable translations in lesson</span>
                        </label>
                    </div>
                </div>
                <div className="mt-4">
                    <label className="font-semibold text-gray-700 block mb-1">Goal / Language Focus</label>
                    <p className="text-xs text-gray-500 mb-1">Temporary override: Enter a specific goal for this generated lesson only.</p>
                    <Textarea
                        value={profile.languageFocus || ''}
                        onChange={e => setProfile({...profile, languageFocus: e.target.value})}
                        rows={2}
                        placeholder="e.g., use more business-related phrasal verbs, practice using the past perfect continuous tense"
                    />
                </div>
                <div className="mt-4">
                    <label className="font-semibold text-gray-700">Read Aloud Voice</label>
                    <SearchableVoiceSelect value={profile.readAloudVoice || ''} onChange={val => setProfile({...profile, readAloudVoice: val})} />
                </div>
            </FormSection>

            <FormSection title="Custom Generation Instructions" description="Provide specific instructions for the AI for each content type.">
                 <div>
                     <label className="font-semibold text-gray-700 block mb-1">Custom Instructions for Lesson</label>
                     <Textarea value={profile.lessonPrefs || ''} onChange={e => setProfile({...profile, lessonPrefs: e.target.value})} rows={2} placeholder="e.g., Focus on phrasal verbs. Use lots of analogies."/>
                </div>
                 <div>
                     <label className="font-semibold text-gray-700 block mb-1">Custom Instructions for Lesson Plan</label>
                     <Textarea value={profile.lessonPlanPrefs || ''} onChange={e => setProfile({...profile, lessonPlanPrefs: e.target.value})} rows={2} placeholder="e.g., Include a debate activity. Make the role-play funny."/>
                </div>
                 <div>
                     <label className="font-semibold text-gray-700 block mb-1">Custom Instructions for Homework</label>
                     <Textarea value={profile.homeworkPrefs || ''} onChange={e => setProfile({...profile, homeworkPrefs: e.target.value})} rows={2} placeholder="e.g., Make the writing task a blog post. Add more speaking prompts."/>
                </div>
                 <div>
                     <label className="font-semibold text-gray-700 block mb-1">Custom Instructions for Quiz</label>
                     <Textarea value={profile.quizPrefs || ''} onChange={e => setProfile({...profile, quizPrefs: e.target.value})} rows={2} placeholder="e.g., Make the questions multiple choice. The writing task should be an email."/>
                </div>
            </FormSection>
        </Card>
    );
}

export default ProfileSettings;
