import React, { useState, useEffect } from 'react';
import { CourseLevel } from '../../../types2';

interface PlacementTestProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (level: CourseLevel) => void;
}

const CEFR_QUESTIONS = [
    { text: "Choose the correct sentence:", options: ["I have 20 years old.", "I am 20 years old.", "I having 20 years.", "I has 20 years."], answer: 1, levelDesc: "A1" },
    { text: "Where _____ you yesterday?", options: ["were", "did", "are", "have"], answer: 0, levelDesc: "A2" },
    { text: "If I _____ rich, I would buy a boat.", options: ["am", "was", "were", "been"], answer: 2, levelDesc: "B1" },
    { text: "By this time next year, I ________ graduated.", options: ["will have", "would have", "will be", "have"], answer: 0, levelDesc: "B2" },
    { text: "Rarely ________ such a beautiful sunset.", options: ["I have seen", "have I seen", "I saw", "see I"], answer: 1, levelDesc: "C1" },
    { text: "He _______ have been there, I am absolutely certain he was abroad.", options: ["couldn't", "shouldn't", "wouldn't", "mightn't"], answer: 0, levelDesc: "C2" },
];

const LEVEL_MAPPING: { [key: number]: CourseLevel } = {
    0: CourseLevel.A1,
    1: CourseLevel.A2,
    2: CourseLevel.B1,
    3: CourseLevel.B2,
    4: CourseLevel.C1,
    5: CourseLevel.C2,
    6: CourseLevel.C2,
};

const LEVEL_NAMES: { [key: string]: string } = {
    "A1": "Beginner",
    "A2": "Elementary",
    "B1": "Intermediate",
    "B2": "Upper-Intermediate",
    "C1": "Advanced",
    "C2": "Proficient",
};

const PlacementTest: React.FC<PlacementTestProps> = ({ isOpen, onClose, onComplete }) => {
    const [currentQ, setCurrentQ] = useState(0);
    const [score, setScore] = useState(0);
    const [errors, setErrors] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showSplash, setShowSplash] = useState(false);
    const [shake, setShake] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStartTime(Date.now());
            setCurrentQ(0);
            setScore(0);
            setErrors(0);
            setShowSplash(false);
            setShake(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAnswer = (idx: number) => {
        const correct = CEFR_QUESTIONS[currentQ].answer === idx;
        if (correct) {
            const newScore = score + 1;
            setScore(newScore);
            proceedToNext(newScore, errors);
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            const newErrors = errors + 1;
            setErrors(newErrors);
            if (newErrors >= 1) {
                proceedToNext(score, newErrors, true);
            } else {
                proceedToNext(score, newErrors);
            }
        }
    };

    const proceedToNext = (currentScore: number, currentErrors: number, forceEnd = false) => {
        if (currentQ < CEFR_QUESTIONS.length - 1 && !forceEnd) {
            setTimeout(() => setCurrentQ(currentQ + 1), 500); // short delay so shake is visible
        } else {
            setDuration(Math.round((Date.now() - startTime) / 1000));
            setTimeout(() => setShowSplash(true), 500);
        }
    };

    const finalLevel = LEVEL_MAPPING[score] || CourseLevel.A1;
    const accuracy = Math.round(((score || 1) / (currentQ + 1)) * 100);

    const handleFinish = () => {
        onComplete(finalLevel);
        setShowSplash(false);
    };

    if (showSplash) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 font-sans p-4">
                <div className="bg-white rounded-3xl p-10 max-w-2xl w-full text-center shadow-2xl animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                    <img src="https://flagcdn.com/w160/gb.png" alt="English" className="h-16 mx-auto mb-6 rounded shadow-sm opacity-90" />
                    <h2 className="text-4xl font-extrabold text-gray-800 mb-2">Assessment Complete!</h2>
                    <p className="text-xl text-gray-500 mb-8">Here are your precise results.</p>
                    
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <i className="fas fa-bullseye text-blue-500 text-3xl mb-2"></i>
                            <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wider">Accuracy</h3>
                            <p className="text-3xl font-black text-blue-700">{accuracy}%</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                            <i className="fas fa-layer-group text-purple-500 text-3xl mb-2"></i>
                            <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wider">CEFR Level</h3>
                            <p className="text-3xl font-black text-purple-700">{finalLevel}</p>
                        </div>
                        <div className="bg-pink-50 p-4 rounded-xl border border-pink-100">
                            <i className="fas fa-stopwatch text-pink-500 text-3xl mb-2"></i>
                            <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wider">Speed</h3>
                            <p className="text-3xl font-black text-pink-700">{duration}s</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6 text-left mb-8 border border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><i className="fas fa-check-circle text-green-500"></i> Suggested Can-Do Statements</h4>
                        <ul className="space-y-2 text-gray-700 font-medium list-none">
                            <li className="flex items-start gap-2"><input type="checkbox" readOnly checked className="mt-1 accent-brand-purple" /> Start at {finalLevel} level</li>
                            <li className="flex items-start gap-2"><input type="checkbox" readOnly checked className="mt-1 accent-brand-purple" /> Focus on filling existing gaps</li>
                        </ul>
                    </div>

                    <button type="button" onClick={handleFinish} className="w-full bg-brand-purple hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-xl shadow-lg transition-colors">
                        Apply Level to Course Plan
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-90 font-sans p-4 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
            <div className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-purple bg-opacity-20 flex items-center justify-center rounded-full text-brand-purple">
                            <i className="fas fa-graduation-cap"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Placement Assessment</h2>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <div className="mb-10 p-6 bg-purple-50 rounded-2xl border border-purple-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1 bg-brand-purple w-full"></div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <span className="text-brand-purple font-extrabold text-sm tracking-widest uppercase">Question {currentQ + 1} of {CEFR_QUESTIONS.length}</span>
                        <div className="flex items-center gap-2">
                            <span className="bg-brand-purple text-white font-black text-xs px-2.5 py-1 rounded-md uppercase shadow-sm">
                                {CEFR_QUESTIONS[currentQ].levelDesc}
                            </span>
                            <span className="bg-purple-100 text-purple-800 font-extrabold text-xs px-2.5 py-1 rounded-md uppercase">
                                {LEVEL_NAMES[CEFR_QUESTIONS[currentQ].levelDesc] || 'English'}
                            </span>
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 leading-snug">
                        {CEFR_QUESTIONS[currentQ].text}
                    </h1>
                </div>

                <div className="space-y-4">
                    {CEFR_QUESTIONS[currentQ].options.map((opt, idx) => (
                        <button 
                            type="button"
                            key={idx} 
                            onClick={() => handleAnswer(idx)}
                            className="w-full border-2 border-gray-200 hover:border-brand-purple hover:bg-purple-50 text-gray-800 font-bold rounded-2xl p-6 text-left text-xl transition-all flex items-center gap-4 group"
                        >
                            <div className="w-8 h-8 rounded-full border-2 border-gray-300 group-hover:border-brand-purple group-hover:bg-brand-purple flex items-center justify-center text-transparent group-hover:text-white transition-colors">
                                <i className="fas fa-check text-sm"></i>
                            </div>
                            {opt}
                        </button>
                    ))}
                </div>
                
                <div className="mt-8 bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-purple h-full transition-all duration-300" style={{ width: `${((currentQ) / CEFR_QUESTIONS.length) * 100}%` }}></div>
                </div>
            </div>
            {shake && <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    50% { transform: translateX(10px); }
                    75% { transform: translateX(-10px); }
                }
            `}</style>}
        </div>
    );
};

export { PlacementTest };
export default PlacementTest;
