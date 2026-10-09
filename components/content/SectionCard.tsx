import React, { FC } from 'react';
import type { Section, LearnerProfile } from '../../types';
import ActivityRenderer from './ActivityRenderer';

const SectionCard: FC<{ section: Section, learner: LearnerProfile; isQuiz?: boolean; isLesson?: boolean; }> = ({ section, learner, isQuiz, isLesson }) => {
    
    // Extract first emoji from title
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
    const match = section.title.match(emojiRegex);
    const firstEmoji = match ? match[0] : null;

    // Quiz styling
    if (isQuiz) {
        return (
            <div className="mb-8 relative overflow-hidden">
                {firstEmoji && (
                    <div 
                        className="absolute top-0 right-4 text-8xl opacity-10 select-none pointer-events-none transform rotate-12"
                        aria-hidden="true"
                    >
                        {firstEmoji}
                    </div>
                )}
                <header className="pb-3 mb-4 border-b-2 border-gray-300 relative z-10">
                    <h3 className="text-2xl font-semibold text-gray-800" dangerouslySetInnerHTML={{ __html: section.title }} />
                </header>
                <div className="space-y-6 relative z-10">
                    {section.activities.map((activity, index) => (
                        <ActivityRenderer key={index} activity={activity} learner={learner} disableReadAloud={true} />
                    ))}
                </div>
            </div>
        );
    }
    
    // Default (Lesson) styling
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8 relative overflow-hidden font-['Quicksand']">
            {firstEmoji && (
                <div 
                    className="absolute top-0 right-0 text-9xl opacity-10 select-none pointer-events-none transform rotate-12 translate-x-8 -translate-y-4"
                    aria-hidden="true"
                >
                    {firstEmoji}
                </div>
            )}
            <header className="relative z-10 mb-6">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    {section.studyTime && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-600">
                            <i className="far fa-clock mr-2"></i>{section.studyTime}
                        </span>
                    )}
                    {section.xpReward && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-amber-50 text-amber-600">
                            <i className="fas fa-star mr-2"></i>{section.xpReward} XP
                        </span>
                    )}
                </div>
                <h3 className="text-3xl font-bold text-gray-800 leading-tight" dangerouslySetInnerHTML={{ __html: section.title.replace(emojiRegex, '').trim() }} />
            </header>
            
            <div className={`bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-200 relative z-10 ${isLesson ? 'lesson-content' : ''}`}>
                {section.activities.reduce((acc: React.ReactNode[], activity, index) => {
                    if (activity.type === 'voice_recording' || activity.type === 'essay_writing') {
                        if (acc.length > 0) {
                            const lastIdx = acc.length - 1;
                            const lastEl = acc[lastIdx] as React.ReactElement<any>;
                            acc[lastIdx] = React.cloneElement(lastEl, { inlineAction: activity } as any);
                        }
                        return acc;
                    }
                    acc.push(<ActivityRenderer key={index} activity={activity} learner={learner} disableReadAloud={isQuiz} isLesson={isLesson} />);
                    return acc;
                }, [])}
            </div>
             <style>{`
                .lesson-content p, .lesson-content li {
                    line-height: 1.8;
                    color: #374151;
                    font-size: 1.05rem;
                }
                .lesson-content h4 {
                    color: #1f2937;
                    font-weight: 700;
                    margin-top: 1.5em;
                    margin-bottom: 0.5em;
                }
             `}</style>
        </div>
    );
};

export default SectionCard;