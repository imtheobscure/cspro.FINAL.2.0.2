
import React, { FC, useState, useEffect } from 'react';
import type { LearnerProfile } from '../../types';
import { SUPPORTED_TARGET_LANGUAGES } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { useAuthStore } from '../../store/useAuthStore';
import { canAddLearner, FREE_LEARNER_LIMIT, PRO_LEARNER_LIMIT } from '../../utils/tiers';

const AddLearnerModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onAddLearner: (profile: LearnerProfile) => void;
    learners: LearnerProfile[];
}> = ({ isOpen, onClose, onAddLearner, learners }) => {
    const [newLearner, setNewLearner] = useState({ name: '', cefrLevel: '', l1Language: '', targetLanguage: 'English', country: '', address: '', interests: '', facts: '', needsAndExpectations: '' });
    const [manualAddError, setManualAddError] = useState('');

    useEffect(() => {
      // Reset form when modal opens/closes
      setNewLearner({ name: '', cefrLevel: '', l1Language: '', targetLanguage: 'English', country: '', address: '', interests: '', facts: '', needsAndExpectations: '' });
      setManualAddError('');
    }, [isOpen]);

    if (!isOpen) return null;

    const generateId = () => {
        // Use crypto.randomUUID if available for robust uniqueness
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for older environments
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    };

    const handleManualAdd = () => {
        setManualAddError('');
        const { tier, openUpgradeModal } = useAuthStore.getState();
        if (!canAddLearner(learners.length, tier)) {
            onClose();
            const limit = tier === 'pro' ? PRO_LEARNER_LIMIT : FREE_LEARNER_LIMIT;
            openUpgradeModal(`You have reached the ${tier === 'pro' ? 'PRO' : 'Free Starter'} limit of ${limit} learner profiles. Upgrade to ${tier === 'pro' ? 'VIP Elite Master for unlimited' : 'PRO (100) or VIP (Unlimited)'} learners.`);
            return;
        }

        const { name, cefrLevel, l1Language, targetLanguage, country, address, interests, facts, needsAndExpectations } = newLearner;

        if (!name.trim() || !cefrLevel.trim() || !l1Language.trim()) {
            setManualAddError('Full Name, CEFR Level, and Primary Language are required.');
            return;
        }

        // Generate a safe ID regardless of the name's characters
        const id = generateId();

        const newProfile: LearnerProfile = {
            id,
            name: name.trim(),
            cefrLevel: cefrLevel.trim().toUpperCase(),
            l1Language: l1Language.trim(),
            targetLanguage: targetLanguage.trim() || 'English',
            tutorVoice: "You are an expert ESL/EFL content creator for language tutors, creating highly personalized and pedagogically sound learning materials.",
            readAloudVoice: 'Microsoft Ava Multilingual Online (Natural) - English (United States)',
            enableTranslations: true,
            languageFocus: '',
            personalInfo: {
                age: 0,
                country: country.trim(),
                address: address.trim(),
            },
            interests: interests.trim(),
            facts: facts.split('\n').map(f => f.trim()).filter(Boolean),
            needsAndExpectations: needsAndExpectations.trim(),
            learningChallenges: [],
            sessionHistory: [],
            coursePlan: {
                longTermGoals: [],
                shortTermGoals: [],
            },
        };

        onAddLearner(newProfile);
        alert(`Learner "${newProfile.name}" added successfully!`);
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                 <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Add Learner Manually</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                    </div>
                    <p className="text-gray-600 mt-2">Fill out the form below to create a new learner profile from scratch.</p>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="font-semibold text-gray-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
                                <Input value={newLearner.name} onChange={e => setNewLearner({...newLearner, name: e.target.value})} placeholder="e.g., Jane Doe" />
                            </div>
                            <div>
                                <label className="font-semibold text-gray-700 block mb-1">CEFR Level <span className="text-red-500">*</span></label>
                                <Input value={newLearner.cefrLevel} onChange={e => setNewLearner({...newLearner, cefrLevel: e.target.value})} placeholder="e.g., B1, A2+" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="font-semibold text-gray-700 block mb-1">Primary Language (L1) <span className="text-red-500">*</span></label>
                                <Input value={newLearner.l1Language} onChange={e => setNewLearner({...newLearner, l1Language: e.target.value})} placeholder="e.g., Spanish" />
                            </div>
                            <div>
                                <label className="font-semibold text-gray-700 block mb-1">Target Language</label>
                                <select 
                                    value={newLearner.targetLanguage} 
                                    onChange={e => setNewLearner({...newLearner, targetLanguage: e.target.value})} 
                                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
                                >
                                    {SUPPORTED_TARGET_LANGUAGES.map(lang => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="font-semibold text-gray-700 block mb-1">Country</label>
                                <Input value={newLearner.country} onChange={e => setNewLearner({...newLearner, country: e.target.value})} placeholder="e.g., Brazil" />
                            </div>
                            <div>
                                <label className="font-semibold text-gray-700 block mb-1">Address</label>
                                <Input value={newLearner.address} onChange={e => setNewLearner({...newLearner, address: e.target.value})} placeholder="For localized content" />
                            </div>
                        </div>
                        <div>
                            <label className="font-semibold text-gray-700 block mb-1">Interests</label>
                            <p className="text-xs text-gray-500 mb-1">Provide a detailed description of the learner's interests.</p>
                            <Textarea value={newLearner.interests} onChange={e => setNewLearner({...newLearner, interests: e.target.value})} placeholder="Loves sci-fi movies (especially Star Wars), hiking in the mountains, and trying new Italian recipes." rows={3}/>
                        </div>
                         <div>
                            <label className="font-semibold text-gray-700 block mb-1">Needs & Expectations</label>
                             <p className="text-xs text-gray-500 mb-1">Describe the learner's goals, what they need help with, and their expectations.</p>
                            <Textarea value={newLearner.needsAndExpectations} onChange={e => setNewLearner({...newLearner, needsAndExpectations: e.target.value})} placeholder="Needs to improve presentation skills for work. Expects a focus on business English and confident speaking." rows={3}/>
                        </div>
                        <div>
                            <label className="font-semibold text-gray-700 block mb-1">Personal Facts & Details</label>
                            <p className="text-xs text-gray-500 mb-1">One fact per line. Used for personalization.</p>
                            <Textarea value={newLearner.facts} onChange={e => setNewLearner({...newLearner, facts: e.target.value})} placeholder={"Has a pet dog named Sparky.\nWorks as a software developer."} rows={3}/>
                        </div>
                    </div>
                    {manualAddError && <p className="text-red-500 mt-2">{manualAddError}</p>}
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                     <Button onClick={handleManualAdd} className="bg-green-600 hover:bg-green-700">
                        <i className="fas fa-user-plus mr-2"></i>Add Learner
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddLearnerModal;
