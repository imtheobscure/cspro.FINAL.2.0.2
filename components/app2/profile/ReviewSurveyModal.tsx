import React, { useState } from 'react';
import { REVIEW_SKILLS, type ReviewSkillKey, type SkillRatings } from './reviewSkills';

interface ReviewSurveyModalProps {
    expectations: string[];
    onComplete: (data: {
        stars: number;
        liked: string;
        disliked: string;
        expectationsMetOptions: string[];
        /** One 1–5 rating per teaching-quality question, keyed by REVIEW_SKILLS. */
        skillRatings: SkillRatings;
        lessonName?: string;
    }) => void;
    onClose: () => void;
    showLessonNameInput?: boolean;
}

export const ReviewSurveyModal: React.FC<ReviewSurveyModalProps> = ({ 
    expectations, 
    onComplete, 
    onClose,
    showLessonNameInput = false
}) => {
    const [stars, setStars] = useState(0);
    const [hoverStars, setHoverStars] = useState(0);
    const [liked, setLiked] = useState('');
    const [disliked, setDisliked] = useState('');
    const [lessonName, setLessonName] = useState('');
    const [selectedExpectations, setSelectedExpectations] = useState<string[]>([]);
    /*
     * The four teaching-quality ratings, and which one the pointer is over.
     *
     * Hover is tracked per skill rather than as one shared number: four rows sit side by
     * side now, and a single hover value lit up the wrong row the moment the pointer moved.
     */
    const [skillRatings, setSkillRatings] = useState<Partial<Record<ReviewSkillKey, number>>>({});
    const [hoverSkill, setHoverSkill] = useState<{ key: ReviewSkillKey; value: number } | null>(null);
    const [phase, setPhase] = useState<'survey' | 'thanks'>('survey');

    const toggleExpectation = (exp: string) => {
        if (selectedExpectations.includes(exp)) {
            setSelectedExpectations(selectedExpectations.filter(e => e !== exp));
        } else {
            setSelectedExpectations([...selectedExpectations, exp]);
        }
    };

    const handleSubmit = () => {
        if (stars === 0) {
            alert('Please select a star rating.');
            return;
        }
        /*
         * The four ratings are required, and they are checked together so a tutor who missed
         * two of them is told which two. They drive the whole point of the aggregate, and a
         * half-filled row that average-skips is worse than being asked to finish.
         */
        const missing = REVIEW_SKILLS.filter(({ key }) => !skillRatings[key]);
        if (missing.length > 0) {
            alert(`Please rate all four: ${missing.map(m => m.label).join(', ')}.`);
            return;
        }
        if (showLessonNameInput && !lessonName.trim()) {
            alert('Please enter a lesson name.');
            return;
        }
        setPhase('thanks');
    };

    const handleOk = () => {
        onComplete({ 
            stars, 
            liked, 
            disliked, 
            expectationsMetOptions: selectedExpectations,
            skillRatings,
            lessonName: showLessonNameInput ? lessonName.trim() : undefined
        });
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col animate-fade-in overflow-y-auto w-full h-full pb-20 md:pb-0">
            {phase === 'survey' ? (
                <div className="max-w-2xl mx-auto w-full p-6 pt-12 flex flex-col gap-8">
                    <button onClick={onClose} className="absolute top-6 right-6 text-2xl text-gray-400 hover:text-gray-800" id="close-review-modal-btn">
                        <i className="fas fa-times"></i>
                    </button>
                    
                    <div className="text-center">
                        <h2 className="text-4xl font-extrabold text-gray-900 mb-2">Class Review</h2>
                        <p className="text-xl text-gray-500">How was your session today?</p>
                    </div>

                    {showLessonNameInput && (
                        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/80">
                            <label className="block text-sm font-black uppercase tracking-wider text-indigo-900 mb-2">
                                📖 Lesson Title / Subject
                            </label>
                            <input 
                                type="text"
                                value={lessonName}
                                onChange={e => setLessonName(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-900 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition"
                                placeholder="E.g. Present Tense Revision, Lesson 5, Workspace Conversation"
                            />
                        </div>
                    )}

                    <div className="bg-gray-50 rounded-2xl p-8 shadow-sm text-center">
                        <h3 className="text-xl font-bold mb-4">Rate the Class</h3>
                        <div className="flex justify-center gap-3">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button
                                    key={s}
                                    onMouseEnter={() => setHoverStars(s)}
                                    onMouseLeave={() => setHoverStars(0)}
                                    onClick={() => setStars(s)}
                                    className="text-5xl transition-transform hover:scale-110"
                                    id={`star-btn-${s}`}
                                >
                                    <i className={`fa-star ${s <= (hoverStars || stars) ? 'fas text-yellow-400 drop-shadow' : 'far text-gray-300'}`}></i>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/*
                      * The four teaching-quality ratings, below the overall stars.
                      *
                      * They are asked as four separate questions rather than folded into the
                      * single rating because the overall number can only ever say whether the
                      * class was good — these say which part of the teaching to keep doing.
                      * Each row is one question with the keyword as its heading, and the stars
                      * carry a real label for the radio group so this is answerable by
                      * keyboard and by a screen reader, not only by mouse.
                      */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Rate the Teaching</h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Four quick ratings — these are what the Reviews tab averages.
                            </p>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {REVIEW_SKILLS.map(({ key, label, question }) => {
                                const value = skillRatings[key] ?? 0;
                                const shown = hoverSkill && hoverSkill.key === key ? hoverSkill.value : value;
                                return (
                                    <div key={key} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                                        <div className="sm:flex-1 min-w-0 text-left">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-black text-gray-900">{label}</span>
                                                {value > 0 && (
                                                    <span className="text-xs font-bold text-gray-400">{value}/5</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-0.5 leading-snug">{question}</p>
                                        </div>

                                        <div
                                            role="radiogroup"
                                            aria-label={label}
                                            className="flex gap-2 shrink-0"
                                        >
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={value === s}
                                                    aria-label={`${label}: ${s} of 5`}
                                                    onMouseEnter={() => setHoverSkill({ key, value: s })}
                                                    onMouseLeave={() => setHoverSkill(null)}
                                                    onFocus={() => setHoverSkill({ key, value: s })}
                                                    onBlur={() => setHoverSkill(null)}
                                                    onClick={() => setSkillRatings(prev => ({ ...prev, [key]: s }))}
                                                    className="text-3xl transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
                                                    id={`skill-${key}-star-${s}`}
                                                >
                                                    <i className={`fa-star ${s <= shown ? 'fas text-yellow-400 drop-shadow' : 'far text-gray-300'}`}></i>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-lg font-bold text-gray-800 mb-2">What did you like about the session?</label>
                            <textarea 
                                value={liked}
                                onChange={e => setLiked(e.target.value)}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition resize-none min-h-[100px]"
                                placeholder="E.g. Great explanations, fun games..."
                            />
                        </div>
                        
                        <div>
                            <label className="block text-lg font-bold text-gray-800 mb-2">What could be improved?</label>
                            <textarea 
                                value={disliked}
                                onChange={e => setDisliked(e.target.value)}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition resize-none min-h-[100px]"
                                placeholder="E.g. Audio was glitchy, went too fast..."
                            />
                        </div>

                        {expectations.length > 0 && (
                            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                                <label className="block text-lg font-bold text-indigo-900 mb-4">Were your expectations met? Select any that apply:</label>
                                <div className="space-y-3">
                                    {expectations.map(exp => (
                                        <label key={exp} className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-300 transition shadow-sm">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedExpectations.includes(exp)}
                                                onChange={() => toggleExpectation(exp)}
                                                className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-700 font-medium">{exp}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            onClick={handleSubmit}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-indigo-500 hover:to-purple-500 hover:shadow-lg transition flex items-center gap-2"
                            id="submit-review-survey-btn"
                        >
                            Submit Review <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto animate-slide-up">
                    <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-bounce">
                        <i className="fas fa-check"></i>
                    </div>
                    
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-2">Thank You!</h2>
                    <p className="text-lg text-gray-650 mb-6">Your feedback has been saved instantly to your session log.</p>
                    
                    {/* Prompt only shown when 5 stars given, designed to be highly prominent in a customized warning box style */}
                    {stars === 5 && (
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 shadow-md my-4 max-w-md mx-auto animate-pulse">
                            <span className="text-4xl mb-2 block">🥺</span>
                            <p className="text-amber-950 font-serif font-black text-lg leading-relaxed italic">
                                "Don't you wanna leave a positive review on the site for me or something?"
                            </p>
                        </div>
                    )}

                    <button 
                        onClick={handleOk}
                        className="bg-emerald-650 hover:bg-emerald-700 text-white font-black uppercase text-base tracking-widest px-10 py-4 rounded-2xl shadow-md transition duration-200 mt-6 min-w-[150px]"
                        id="review-ok-btn"
                    >
                        OK
                    </button>
                </div>
            )}
        </div>
    );
};
