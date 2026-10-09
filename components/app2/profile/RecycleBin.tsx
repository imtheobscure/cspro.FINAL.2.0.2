import React, { useState, useMemo } from 'react';
import { Learner, GroupClass } from '../../../types2';
import SectionCard from '../SectionCard';
import { sendEmailWithAIGreeting } from '../../../utils/emailSender';

interface LearningChallengesProps {
    learner: Learner | GroupClass;
    onUpdate: (updatedLearner: Learner | GroupClass) => void;
    isTabContent?: boolean;
    isForScreenshot?: boolean;
}

const STAGES = [
    { label: "1d", title: "Review in 1 Day", days: 1 },
    { label: "3d", title: "Review in 3 Days", days: 3 },
    { label: "7d", title: "Review in 7 Days", days: 7 },
    { label: "14d", title: "Review in 14 Days", days: 14 }
];

const LearningChallenges: React.FC<LearningChallengesProps> = ({ learner, onUpdate, isTabContent = false, isForScreenshot = false }) => {
    const masteredSkills = useMemo(() => learner.masteredSkills || [], [learner.masteredSkills]);

    // Track spaced repetition state from localStorage, keyed by learner ID
    const [spacedRepState, setSpacedRepState] = useState<Record<string, { stageDays: number; lastChecked?: string }>>(() => {
        try {
            const saved = localStorage.getItem(`spaced_rep_${learner.id}`);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const handleToggleStage = (point: string, days: number) => {
        if (isForScreenshot) return;
        const current = spacedRepState[point];
        let newState = { ...spacedRepState };

        if (current && current.stageDays === days) {
            // Toggle off
            delete newState[point];
        } else {
            // Set stage
            newState[point] = { stageDays: days, lastChecked: new Date().toISOString() };
        }

        setSpacedRepState(newState);
        localStorage.setItem(`spaced_rep_${learner.id}`, JSON.stringify(newState));
    };

    const needsHelpItems = useMemo(() => {
        const uniqueWeaknesses = new Map<string, { point: string; ccq: string }>();
        
        // Iterate backwards to get the most recent CCQ for a recurring weakness
        [...(learner.sessions || [])].reverse().forEach(session => {
            // 1. Process structured weaknessDetails if any
            if (session.weaknessDetails && Array.isArray(session.weaknessDetails)) {
                session.weaknessDetails.forEach(item => {
                    if (item && item.point && !uniqueWeaknesses.has(item.point)) {
                        uniqueWeaknesses.set(item.point, {
                            point: item.point,
                            ccq: item.ccq || `Can you explain the correct usage of "${item.point}"?`
                        });
                    }
                });
            }

            // 2. Fallback: Process needsHelp strings so manual session logs with plain list items ALSO generate data!
            if (session.needsHelp && Array.isArray(session.needsHelp)) {
                session.needsHelp.forEach(point => {
                    if (typeof point === 'string' && point.trim() && !uniqueWeaknesses.has(point.trim())) {
                        uniqueWeaknesses.set(point.trim(), {
                            point: point.trim(),
                            ccq: `How would you correctly apply "${point.trim()}" in a sentence?`
                        });
                    }
                });
            }
        });

        return Array.from(uniqueWeaknesses.values())
            .filter(item => !masteredSkills.includes(item.point))
            .slice(0, 10);
    }, [learner.sessions, masteredSkills]);


    const handleMasterItem = (itemToMaster: string) => {
        if (isForScreenshot) return;
        const newMasteredSkills = [...masteredSkills, itemToMaster];
        onUpdate({ ...learner, masteredSkills: newMasteredSkills });
    };

    const handleEmailChallenges = async () => {
        if (!('email' in learner)) {
            alert("Email functionality is only available for individual learners.");
            return;
        }

        if (needsHelpItems.length === 0) {
            alert("There are no challenges to email.");
            return;
        }

        let bodyContent = "Here are a few topics from your 'Recycle Bin' that we can practice again:\n\n";

        needsHelpItems.forEach(item => {
            const rep = spacedRepState[item.point];
            const intervalText = rep ? ` (Next review in ${rep.stageDays} days)` : '';
            bodyContent += `🎯 Focus: ${item.point}${intervalText}\n`;
            bodyContent += `Practice Question: ${item.ccq}\n\n`;
        });

        bodyContent += "Let's work on these in our next session!";

        await sendEmailWithAIGreeting({
            learner,
            topic: "Learning Challenges",
            subject: `A Few Things to Practice! 💡`,
            bodyContent,
        });
    };
    
    const content = (
        <div className="space-y-4">
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="font-bold text-sm text-brand-gray-darkest">Topics to Recycle:</h4>
                        <p className="text-xs text-gray-400">Keep track of learner errors with checkbox questions and spaced repetition schedules.</p>
                    </div>
                    {needsHelpItems.length > 0 && !isForScreenshot && 'email' in learner && (
                         <button 
                            onClick={handleEmailChallenges}
                            className="bg-brand-blue text-white font-bold py-1.5 px-3 rounded-xl hover:bg-blue-600 text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
                        >
                           <i className="fas fa-envelope"></i> Email Challenges
                        </button>
                    )}
                </div>
                {needsHelpItems.length > 0 ? (
                    <div className="space-y-3">
                        {needsHelpItems.map((item) => {
                            const rep = spacedRepState[item.point];
                            return (
                                <div 
                                    key={item.point}
                                    className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 shadow-sm hover:shadow-md transition-all duration-300"
                                >
                                    {/* Mastered Checkbox */}
                                    <div className="pt-1 shrink-0">
                                        <input 
                                            type="checkbox"
                                            checked={false}
                                            onChange={() => handleMasterItem(item.point)}
                                            className="w-5 h-5 rounded border-red-300 text-brand-green focus:ring-brand-green cursor-pointer shrink-0"
                                            title="Mark as Mastered / Resolve Error"
                                        />
                                    </div>

                                    {/* Challenge Details */}
                                    <div className="flex-1 min-w-0 space-y-3">
                                        <div>
                                            <p className="text-sm font-semibold text-red-950 pr-2 leading-relaxed">
                                                {item.ccq}
                                            </p>
                                            <p className="text-xs text-red-700 italic mt-1 font-medium">
                                                🎯 Focus point: {item.point}
                                            </p>
                                        </div>

                                        {/* Spaced Repetition Checkbox Options */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-black uppercase text-red-800 tracking-wider">Spaced Rep:</span>
                                            <div className="flex items-center gap-1.5">
                                                {STAGES.map((stg) => {
                                                    const isChecked = rep && rep.stageDays === stg.days;
                                                    return (
                                                        <label 
                                                            key={stg.days}
                                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold cursor-pointer transition-all ${
                                                                isChecked 
                                                                    ? "bg-brand-blue text-white border-brand-blue shadow-sm" 
                                                                    : "bg-white border-gray-200 text-gray-500 hover:bg-slate-50"
                                                            }`}
                                                            title={stg.title}
                                                        >
                                                            <input 
                                                                type="checkbox"
                                                                checked={!!isChecked}
                                                                onChange={() => handleToggleStage(item.point, stg.days)}
                                                                className="sr-only"
                                                            />
                                                            <span>{stg.label}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-brand-gray-medium italic p-4 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200">
                        No items in the recycle bin yet. Topics from the 'Weaknesses' section of session logs will automatically appear here as interactive checkboxes.
                    </p>
                )}
            </div>
        </div>
    );

    if (isTabContent) {
        return content;
    }

    return (
        <SectionCard title="Learning Challenges" icon={<span>💡</span>}>
            {content}
        </SectionCard>
    );
};

export default LearningChallenges;
