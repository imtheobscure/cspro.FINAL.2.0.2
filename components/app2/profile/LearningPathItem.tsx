import React, { useState, useEffect } from 'react';
import { Need } from '../../../types2';
import { useLearnerStore } from '../../../store/useLearnerStore';
import EditableStarRating from '../EditableStarRating';
import StarRating from '../StarRating';
import ProgressBar from '../ProgressBar';

interface LearningPathItemProps {
    need: Need;
    learnerId: string;
    isEditing?: boolean;
    onUpdate?: (need: Need) => void;
    onRemove?: (needId: string) => void;
}

const inputClass = "w-full p-2 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue placeholder:text-brand-gray-medium";

const LearningPathItem: React.FC<LearningPathItemProps> = ({ need, learnerId, isEditing, onUpdate, onRemove }) => {
    const addSkill = useLearnerStore(state => state.addSkill);
    const updateSkillProgress = useLearnerStore(state => state.updateSkillProgress);
    
    const [isOpen, setIsOpen] = useState(false);
    const [newSkillName, setNewSkillName] = useState('');
    const [localNeed, setLocalNeed] = useState(need);

    useEffect(() => {
        setLocalNeed(need);
    }, [need]);

    const handleAddSkill = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSkillName.trim()) {
            addSkill(learnerId, need.id, newSkillName.trim());
            setNewSkillName('');
        }
    };
    
    const handleSave = () => {
        if(onUpdate) onUpdate(localNeed);
    }

    if (isEditing) {
        return (
             <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100">
                <input 
                    type="text" 
                    value={localNeed.name} 
                    onChange={e => setLocalNeed(prev => ({...prev, name: e.target.value}))} 
                    onBlur={handleSave}
                    className={inputClass} 
                />
                <EditableStarRating 
                    rating={localNeed.rating} 
                    onRatingChange={r => {
                        const updatedNeed = {...localNeed, rating: r};
                        setLocalNeed(updatedNeed);
                        if(onUpdate) onUpdate(updatedNeed);
                    }} 
                />
                <button onClick={() => onRemove && onRemove(need.id)} className="text-red-500 hover:text-red-700 p-2 text-xl font-bold">&times;</button>
            </div>
        )
    }

    return (
        <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
                <span className="font-medium">{need.name}</span>
                <div className="flex items-center gap-4">
                    <StarRating rating={need.rating} />
                    <button onClick={() => setIsOpen(!isOpen)} className="text-sm font-bold text-brand-blue hover:underline">{isOpen ? 'Hide' : 'Path'}</button>
                </div>
            </div>
            {isOpen && (
                <div className="mt-4 space-y-3 animate-fade-in">
                    {(need.learningPath || []).map(skill => (
                        <div key={skill.id} className="pl-4">
                             <p className="text-sm font-bold mb-1">{skill.name}</p>
                             <div className="flex items-center gap-2">
                                <button onClick={() => updateSkillProgress(learnerId, need.id, skill.id, -10)} className="font-bold text-xs bg-brand-red text-white rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-600 transition-colors">-</button>
                                <ProgressBar progress={skill.progress} />
                                <button onClick={() => updateSkillProgress(learnerId, need.id, skill.id, 10)} className="font-bold text-xs bg-brand-green text-white rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-green-600 transition-colors">+</button>
                                <span className="text-xs font-bold w-8 text-right">{skill.progress}%</span>
                             </div>
                        </div>
                    ))}
                    {(need.learningPath || []).length === 0 && <p className="pl-4 text-sm text-gray-500">No skills defined for this path yet.</p>}
                    <form onSubmit={handleAddSkill} className="pl-4 mt-2 flex gap-2">
                        <input type="text" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} placeholder="Add new skill..." className={`${inputClass} text-sm`} />
                        <button type="submit" className="bg-brand-blue text-white font-bold text-lg rounded-lg px-3 hover:bg-blue-600 transition-colors">+</button>
                    </form>
                </div>
            )}
        </div>
    )
}

export default LearningPathItem;