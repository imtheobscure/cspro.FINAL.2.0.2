import React, { useState } from 'react';
import { Learner } from '../../../types2';
import { useLearnerStore } from '../../../store/useLearnerStore';
import SectionCard from '../SectionCard';
import { ICONS, EXPECTATION_OPTIONS } from '../../../constants2';
import LearningPathItem from './LearningPathItem';
import TagSelector from '../TagSelector';

interface NeedsAndWantsProps {
    learner: Learner;
    onUpdate: (updatedLearner: Learner) => void;
}

const NeedsAndWants: React.FC<NeedsAndWantsProps> = ({ learner, onUpdate }) => {
    const addNeed = useLearnerStore(state => state.addNeed);
    const updateNeed = useLearnerStore(state => state.updateNeed);
    const removeNeed = useLearnerStore(state => state.removeNeed);
    
    const [isEditing, setIsEditing] = useState(false);

    const handleExpectationsChange = (newValue: string) => {
        onUpdate({ ...learner, expectations: newValue });
    };

    const handleSituationsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate({ ...learner, situations: e.target.value });
    };

    const handleFocusChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate({ ...learner, focus: e.target.value });
    };


    return (
        <SectionCard title="Needs, Wants & Expectations" icon={ICONS.target}>
            <div className="flex justify-end mb-2">
                <button onClick={() => setIsEditing(!isEditing)} className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-brand-gray-dark px-4 py-1 rounded-lg transition-colors">
                    {isEditing ? 'Done' : 'Edit'}
                </button>
            </div>

            <div className="mb-4">
                <h3 className="font-bold text-base mb-2 text-brand-gray-darkest">Expectations</h3>
                {isEditing ? (
                    <TagSelector
                        options={EXPECTATION_OPTIONS}
                        value={learner.expectations || ''}
                        onChange={handleExpectationsChange}
                        placeholder="Add new expectation and press Enter"
                    />
                ) : (
                    learner.expectations && learner.expectations.trim() ? (
                        <div className="flex flex-wrap gap-2">
                           {learner.expectations.split(',').map(e => e.trim()).filter(Boolean).map((exp, i) => (
                                <span key={i} className="bg-blue-100 text-brand-blue text-sm font-semibold px-3 py-1 rounded-full">{exp}</span>
                           ))}
                        </div>
                    ) : <p className="text-sm text-brand-gray-dark">No expectations set.</p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 border-t border-brand-gray-light pt-4">
                <div>
                    <h3 className="font-bold text-base mb-2 text-brand-gray-darkest flex items-center gap-1.5">
                        <i className="fas fa-comments text-brand-blue text-sm"></i> Situations (where they will use it)
                    </h3>
                    {isEditing ? (
                        <textarea
                            value={learner.situations || ''}
                            onChange={handleSituationsChange}
                            placeholder="e.g. Weekly project syncs, networking events, writing technical documentation..."
                            className="w-full p-2.5 border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue text-sm h-24 resize-none bg-white"
                        />
                    ) : (
                        <p className="text-sm text-brand-gray-dark bg-gray-50 p-2.5 rounded-lg border leading-relaxed">
                            {learner.situations && learner.situations.trim() ? learner.situations : 'No situations defined yet.'}
                        </p>
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-base mb-2 text-brand-gray-darkest flex items-center gap-1.5">
                        <i className="fas fa-bullseye text-brand-blue text-sm"></i> Focus (What lessons should concentrate on)
                    </h3>
                    {isEditing ? (
                        <textarea
                            value={learner.focus || ''}
                            onChange={handleFocusChange}
                            placeholder="e.g. Spontaneous speaking practice, formal business register, pronunciation correction..."
                            className="w-full p-2.5 border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue text-sm h-24 resize-none bg-white"
                        />
                    ) : (
                        <p className="text-sm text-brand-gray-dark bg-gray-50 p-2.5 rounded-lg border leading-relaxed">
                            {learner.focus && learner.focus.trim() ? learner.focus : 'No instructional focus defined yet.'}
                        </p>
                    )}
                </div>
            </div>

            <div className="border-t border-brand-gray-light pt-4 mt-4">
                 <h3 className="font-bold text-base mb-2 text-brand-gray-darkest">Needs & Learning Paths</h3>
                <div className="space-y-2">
                    {learner.needs.map(need => (
                        <LearningPathItem 
                            key={need.id} 
                            need={need} 
                            learnerId={learner.id} 
                            isEditing={isEditing}
                            onUpdate={(n) => updateNeed(learner.id, n)} 
                            onRemove={(nId) => removeNeed(learner.id, nId)} 
                        />
                    ))}
                </div>
                {isEditing && (
                    <button 
                        onClick={() => addNeed(learner.id, {name: 'New Need', rating: 3, learningPath: []})} 
                        className="mt-4 text-sm font-bold text-brand-blue hover:underline"
                    >
                        + Add Need
                    </button>
                )}
            </div>
        </SectionCard>
    );
};

export default NeedsAndWants;