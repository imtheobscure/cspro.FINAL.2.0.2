import React, { FC, useState } from 'react';
import { TutorProfile } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { Card } from '../ui/Card';

interface TutorProfileModalProps {
    profile: TutorProfile;
    onSave: (profile: TutorProfile) => void;
    onClose: () => void;
}

const TutorProfileModal: FC<TutorProfileModalProps> = ({ profile, onSave, onClose }) => {
    const [formData, setFormData] = useState<TutorProfile>(profile);

    const handleChange = (field: keyof TutorProfile, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Edit Tutor Profile</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Your Name</label>
                        <Input 
                            value={formData.name} 
                            onChange={e => handleChange('name', e.target.value)} 
                            placeholder="e.g. Teacher Sarah"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Your Interests / Hobbies</label>
                        <Textarea 
                            value={formData.interests} 
                            onChange={e => handleChange('interests', e.target.value)} 
                            placeholder="e.g. Travel, Cooking, Sci-Fi Movies..."
                            rows={2}
                        />
                        <p className="text-xs text-gray-500">Used to personalize examples and rapport.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Teaching Method / Style</label>
                        <Textarea 
                            value={formData.teachingMethod} 
                            onChange={e => handleChange('teachingMethod', e.target.value)} 
                            placeholder="e.g. Communicative, Grammar-focused, Fun and energetic, Strict and academic..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Bio / Background</label>
                        <Textarea 
                            value={formData.bio} 
                            onChange={e => handleChange('bio', e.target.value)} 
                            placeholder="Brief professional bio..."
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <input 
                            type="checkbox" 
                            id="useForPersonalization"
                            checked={formData.useForPersonalization}
                            onChange={e => handleChange('useForPersonalization', e.target.checked)}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="useForPersonalization" className="text-sm font-medium text-indigo-900 cursor-pointer">
                            Use my profile to personalize AI lesson generation
                        </label>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(formData)} className="bg-indigo-600 hover:bg-indigo-700">Save Profile</Button>
                </div>
            </Card>
        </div>
    );
};

export default TutorProfileModal;
