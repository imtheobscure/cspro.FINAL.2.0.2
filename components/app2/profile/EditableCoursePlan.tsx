import React, { useState, useEffect } from 'react';
import { Learner, CoursePlan, GroupClass } from '../../../types2';
import { ICONS } from '../../../constants2';
import SectionCard from '../SectionCard';
import CoursePlannerForm from '../CoursePlannerForm';

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 bg-white/60 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 min-w-0 overflow-hidden">
        <span className="text-indigo-600 dark:text-indigo-400 mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center font-bold">{icon}</span>
        <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</p>
            <div className="font-bold text-slate-900 dark:text-white text-sm break-words">{value || 'N/A'}</div>
        </div>
    </div>
);

export const EditableCoursePlan = ({ learner, onUpdate }: { learner: Learner | GroupClass; onUpdate: (updatedData: Learner | GroupClass) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingPlan, setEditingPlan] = useState<CoursePlan>(learner.coursePlan || {} as CoursePlan);

    useEffect(() => {
        setEditingPlan(learner.coursePlan || {} as CoursePlan);
    }, [learner.coursePlan]);

    const handleSave = () => {
        onUpdate({ ...learner, coursePlan: editingPlan });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditingPlan(learner.coursePlan || {} as CoursePlan);
        setIsEditing(false);
    };

    const coursePlanLabels = {
        duration: { 30: '30m - Quick Drills', 60: '60m - Standard', 90: '90m - In-Depth', 120: '120m - Intensive' },
        frequency: { Light: '1x/wk - Light', Balanced: '2x/wk - Balanced', Intensive: '3x/wk - Intensive', Custom: 'Flex - Custom' },
    };

    const courseName = learner.coursePlan?.courseName || '';

    return (
        <SectionCard title="Course Plan" icon={ICONS.calendar}>
            {isEditing ? (
                <div className="space-y-4">
                    <CoursePlannerForm plan={editingPlan} onPlanChange={setEditingPlan} sessions={('sessions' in learner ? learner.sessions || [] : []) as any} />
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={handleCancel} className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="bg-indigo-600 text-white font-bold py-2 px-5 rounded-xl hover:bg-indigo-500 transition shadow-md cursor-pointer">
                            Save Plan
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Header Action Bar */}
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold text-slate-500">Plan & Schedule</span>
                        <button 
                            onClick={() => setIsEditing(true)} 
                            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                        >
                            ✏️ Edit Plan
                        </button>
                    </div>

                    {/* Course Name Banner if present */}
                    {courseName && (
                        <div className="p-3 bg-indigo-50/50 dark:bg-slate-800/40 rounded-xl border border-indigo-100 dark:border-slate-700/60 min-w-0">
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-0.5">Course Name</span>
                            <span className="text-sm font-extrabold text-slate-800 dark:text-white break-words">{courseName}</span>
                        </div>
                    )}

                    {/* Standard Course Parameters Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                        <InfoItem 
                            icon={<span>🎯</span>} 
                            label="Current Level" 
                            value={learner.coursePlan?.level || ('cefrLevel' in learner ? learner.cefrLevel : undefined) || ('level' in learner ? learner.level : undefined) || 'B1'} 
                        />
                        <InfoItem 
                            icon={<span>🚀</span>} 
                            label="Target Level" 
                            value={learner.coursePlan?.targetLevel || 'B2'} 
                        />
                        <InfoItem 
                            icon={<span>⏳</span>} 
                            label="Duration" 
                            value={learner.coursePlan?.duration ? coursePlanLabels.duration[learner.coursePlan.duration as keyof typeof coursePlanLabels.duration] : '60m - Standard'} 
                        />
                        <InfoItem 
                            icon={<span>🔄</span>} 
                            label="Frequency" 
                            value={learner.coursePlan?.frequency ? coursePlanLabels.frequency[learner.coursePlan.frequency as keyof typeof coursePlanLabels.frequency] : '2x/wk - Balanced'} 
                        />
                        <InfoItem 
                            icon={<span>🗓️</span>} 
                            label="Total Sessions" 
                            value={learner.coursePlan?.totalSessions ? `${learner.coursePlan.totalSessions} Sessions` : '12 Sessions'} 
                        />
                        <InfoItem 
                            icon={<span>📖</span>} 
                            label="Current Lesson" 
                            value={learner.coursePlan?.currentLesson || 'Unit 1'} 
                        />
                    </div>

                    {learner.coursePlan?.features && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs min-w-0">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">✨ Special Features & Notes:</span>
                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">{learner.coursePlan.features}</p>
                        </div>
                    )}
                </div>
            )}
        </SectionCard>
    );
};
