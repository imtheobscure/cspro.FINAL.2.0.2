import React, { useState, useEffect } from 'react';
import { Learner } from '../../../types2';
import { ICONS, INTEREST_OPTIONS, LEARNING_STYLE_OPTIONS } from '../../../constants2';
import { calculateAge, formatBirthday } from '../../../utils/dateUtils';
import { getFlagEmoji } from '../../../utils/countryUtils';
import SectionCard from '../SectionCard';
import TagSelector from '../TagSelector';
import { getTimezoneForLocation } from '../../../services/geminiService2';
import { useAppStore } from '../../../store/useAppStore';
import { LEARNER_CATEGORIES, getCategoryById } from '../../../data/learnerCategories';

const inputClass = "w-full p-2 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue placeholder:text-brand-gray-medium";

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <span className="text-brand-gray-dark mt-1 w-5 h-5 flex items-center justify-center">{icon}</span>
        <div>
            <p className="text-sm text-brand-gray-dark">{label}</p>
            <div className="font-bold">{value || 'N/A'}</div>
        </div>
    </div>
);

interface PersonalInformationProps {
    learner: Learner;
    onUpdate: (updatedLearner: Learner) => void;
}

const languageColorMap: Record<string, string> = {
    "English": "bg-blue-100 text-blue-800",
    "Spanish": "bg-yellow-100 text-yellow-800",
    "Mandarin Chinese": "bg-red-100 text-red-800",
    "Hindi": "bg-orange-100 text-orange-800",
    "Arabic": "bg-green-100 text-green-800",
    "Portuguese": "bg-green-100 text-green-800",
    "Bengali": "bg-teal-100 text-teal-800",
    "Russian": "bg-indigo-100 text-indigo-800",
    "Japanese": "bg-red-100 text-red-800",
    "German": "bg-gray-200 text-gray-800",
    "French": "bg-blue-100 text-blue-800",
    "Korean": "bg-blue-100 text-blue-800",
    "Turkish": "bg-red-100 text-red-800",
    "Italian": "bg-green-100 text-green-800",
};


const PersonalInformation: React.FC<PersonalInformationProps> = ({ learner, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableLearner, setEditableLearner] = useState<Learner>(learner);
    const setLoading = useAppStore(state => state.setLoading);

    useEffect(() => {
        setEditableLearner(learner);
    }, [learner]);

    const handleSave = async () => {
        let learnerToUpdate = { ...editableLearner };

        const locationChanged = learner.city !== learnerToUpdate.city || learner.country !== learnerToUpdate.country;
        
        if (locationChanged && learnerToUpdate.country) {
            setLoading(true);
            try {
                const newTimezone = await getTimezoneForLocation(learnerToUpdate.country, learnerToUpdate.city);
                if (newTimezone) {
                    learnerToUpdate.timezone = newTimezone;
                }
            } catch (error) {
                console.error("Failed to fetch timezone", error);
                // Optionally show an error to the user, but don't block the save.
            } finally {
                setLoading(false);
            }
        }

        onUpdate(learnerToUpdate);
        setIsEditing(false);
    };

    const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditableLearner(prev => ({...prev, [name]: value}));
    };

    const handleTagChange = (fieldName: keyof Learner, value: string) => {
        setEditableLearner(prev => ({...prev, [fieldName]: value}));
    };

    return (
        <SectionCard title="Personal Information" icon={ICONS.user}>
            <div className="flex justify-end mb-2">
                {isEditing ? (
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(false)} className="text-sm font-bold bg-gray-200 px-3 py-1 rounded-md">Cancel</button>
                        <button onClick={handleSave} className="text-sm font-bold bg-brand-green text-white px-3 py-1 rounded-md">Save Info</button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-brand-gray-dark px-4 py-1 rounded-lg transition-colors">Edit</button>
                )}
            </div>
            {isEditing ? (
                 <div className="space-y-4">
                    <input name="name" value={editableLearner.name} onChange={handleInfoChange} className={inputClass} placeholder="Name" />
                    <input name="registeredName" value={editableLearner.registeredName || ''} onChange={handleInfoChange} className={inputClass} placeholder="Registered Name (for Calendar Sync)" />
                    <input name="email" value={editableLearner.email} onChange={handleInfoChange} className={inputClass} placeholder="Email" />
                    <input name="phone" value={editableLearner.phone} onChange={handleInfoChange} className={inputClass} placeholder="Phone" />
                    <input name="country" value={editableLearner.country} onChange={handleInfoChange} className={inputClass} placeholder="Country" />
                    <input name="city" value={editableLearner.city} onChange={handleInfoChange} className={inputClass} placeholder="City" />
                    <input name="birthday" type="date" value={editableLearner.birthday} onChange={handleInfoChange} className={inputClass} />
                    <input name="occupation" value={editableLearner.occupation} onChange={handleInfoChange} className={inputClass} placeholder="Occupation" />
                    <div className="space-y-2">                            <label className="font-semibold text-sm">Category (Theme)</label>
                            <select
                            name="category"
                            value={editableLearner.category || ''}
                            onChange={handleInfoChange}
                            className={inputClass}
                        >
                            <option value="">No Category</option>
                            {LEARNER_CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name} — {cat.tagline}</option>
                            ))}
                        </select>
                    </div>
                    <input name="l1Language" value={editableLearner.l1Language || ''} onChange={handleInfoChange} className={inputClass} placeholder="L1 Language (Native/Speaking)" />
                    <input name="targetLanguage" value={editableLearner.targetLanguage || ''} onChange={handleInfoChange} className={inputClass} placeholder="L2 Language (Targeting)" />
                    <div className="space-y-2">
                        <label className="font-semibold text-sm">Learning Style</label>
                        <TagSelector options={LEARNING_STYLE_OPTIONS} value={editableLearner.learningStyle || ''} onChange={v => handleTagChange('learningStyle', v)} placeholder="Add custom style..."/>
                    </div>
                    <div className="space-y-2">
                        <label className="font-semibold text-sm">Interests</label>
                        <TagSelector options={INTEREST_OPTIONS} value={editableLearner.interests || ''} onChange={v => handleTagChange('interests', v)} placeholder="Add custom interest..."/>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <InfoItem icon={<span>🆔</span>} label="Registered Name" value={learner.registeredName} />
                    <InfoItem icon={ICONS.calendar} label="Birthday" value={`${formatBirthday(learner.birthday)} (Age ${calculateAge(learner.birthday)})`} />
                    <InfoItem icon={ICONS.email} label="Email" value={<a href={`mailto:${learner.email}`} className="text-brand-blue hover:underline">{learner.email}</a>} />
                    <InfoItem icon={ICONS.globe} label="Location" value={`${learner.city || ''}, ${learner.country} ${getFlagEmoji(learner.country)}`} />
                    <InfoItem icon={ICONS.message} label="L1 (Native/Speaking)" value={learner.l1Language || 'Not set'} />
                    <InfoItem icon={ICONS.globe} label="L2 (Target Language)" value={learner.targetLanguage || 'Not set'} />
                    <InfoItem icon={ICONS.message} label="Spoken Languages" value={
                        <div className="flex flex-wrap gap-1.5 -mt-1">
                            {learner.languages?.map((lang, i) => (
                                <span key={i} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${languageColorMap[lang] || 'bg-gray-100 text-gray-800'}`}>
                                    {lang}
                                </span>
                            ))}
                        </div>
                    } />
                    <InfoItem icon={<span>🏷️</span>} label="Category" value={(() => {
                        const cat = getCategoryById(learner.category);
                        if (!cat) return 'Not set';
                        return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-bold text-xs ${cat.chip}`} title={cat.description}>
                                <span>{cat.emoji}</span> {cat.name}
                            </span>
                        );
                    })()} />
                    <InfoItem icon={<span>🧠</span>} label="Learning Style" value={learner.learningStyle || 'Not set'} />
                    <InfoItem icon={<span>💖</span>} label="Interests" value={learner.interests || 'Not set'} />
                    <InfoItem icon={ICONS.briefcase} label="Occupation" value={learner.occupation} />
                </div>
            )}
        </SectionCard>
    );
};

export default PersonalInformation;
