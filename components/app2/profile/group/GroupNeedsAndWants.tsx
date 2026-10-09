import React, { useState } from 'react';
import { Competency, GroupClass, Need } from '../../../../types2';
import SectionCard from '../../SectionCard';
import { ICONS, EXPECTATION_OPTIONS } from '../../../../constants2';
import TagSelector from '../../TagSelector';
import StarRating from '../../StarRating';
import NeedsCompetencyEditor from '../NeedsCompetencyEditor';
import { syncCompetenciesFromNeeds } from '../../../../utils/needsCompetencies';

interface GroupNeedsAndWantsProps {
    group: GroupClass;
    onUpdate: (updatedGroup: GroupClass) => void;
}

const GroupNeedsAndWants: React.FC<GroupNeedsAndWantsProps> = ({ group, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableGroup, setEditableGroup] = useState(group);

    /**
     * Needs arrive from the shared editor with the competencies they imply, so the
     * class keeps the same two-level structure an individual learner has (a need,
     * and the competencies that prove it) instead of a flat list of goal labels.
     */
    const handleNeedsChange = (needs: Need[], competencies: Competency[]) => {
        setEditableGroup({ ...editableGroup, needs, competencies });
    };

    const handleSave = () => {
        // Belt and braces: whatever the editor produced, make sure every competency
        // in a need is tracked before this hits the store.
        const competencies = syncCompetenciesFromNeeds(
            editableGroup.needs || [],
            group.needs || [],
            editableGroup.competencies || group.competencies,
        );
        const saved = { ...editableGroup, competencies };
        setEditableGroup(saved);
        onUpdate(saved);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditableGroup(group);
        setIsEditing(false);
    };

    const handleExpectationsChange = (newValue: string) => {
        setEditableGroup({ ...editableGroup, expectations: newValue });
    };

    return (
        <SectionCard title="Group Needs & Expectations" icon={ICONS.target}>
            <div className="flex justify-end mb-2">
                {isEditing ? (
                     <div className="flex gap-2">
                        <button onClick={handleCancel} className="text-sm font-bold bg-gray-200 px-3 py-1 rounded-md">Cancel</button>
                        <button onClick={handleSave} className="text-sm font-bold bg-brand-green text-white px-3 py-1 rounded-md">Save</button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-brand-gray-dark px-4 py-1 rounded-lg transition-colors">
                        Edit
                    </button>
                )}
            </div>

            <div className="mb-4">
                <h3 className="font-bold text-base mb-2 text-brand-gray-darkest">Expectations</h3>
                {isEditing ? (
                    <TagSelector
                        options={EXPECTATION_OPTIONS}
                        value={editableGroup.expectations || ''}
                        onChange={handleExpectationsChange}
                        placeholder="Add new expectation and press Enter"
                    />
                ) : (
                    group.expectations && group.expectations.trim() ? (
                        <div className="flex flex-wrap gap-2">
                           {group.expectations.split(',').map(e => e.trim()).filter(Boolean).map((exp, i) => (
                                <span key={i} className="bg-blue-100 text-brand-blue text-sm font-semibold px-3 py-1 rounded-full">{exp}</span>
                           ))}
                        </div>
                    ) : <p className="text-sm text-brand-gray-dark">No expectations set.</p>
                )}
            </div>

            <div className="border-t border-brand-gray-light pt-4 mt-4">
                <h3 className="font-bold text-base mb-2 text-brand-gray-darkest">Group Needs &amp; Competencies</h3>
                {isEditing ? (
                    <NeedsCompetencyEditor
                        needs={editableGroup.needs || []}
                        competencies={editableGroup.competencies}
                        onChange={handleNeedsChange}
                        subject="class"
                    />
                ) : (
                    <div className="space-y-3">
                        {(group.needs || []).length === 0 && (
                            <p className="text-sm text-brand-gray-dark">No group needs set yet.</p>
                        )}
                        {(group.needs || []).map((need) => (
                            <div key={need.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="flex justify-between items-center gap-2">
                                    <span className="font-medium">{need.name}</span>
                                    <StarRating rating={need.rating} />
                                </div>
                                {(need.learningPath || []).length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {(need.learningPath || []).map((skill: any) => (
                                            <span
                                                key={skill.id || skill.name}
                                                className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-brand-purple"
                                            >
                                                {skill.name}
                                                <span className="text-purple-400"> · {skill.progress ?? 0}%</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </SectionCard>
    );
};

export default GroupNeedsAndWants;
