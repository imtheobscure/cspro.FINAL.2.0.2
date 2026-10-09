import React, { useState } from 'react';

interface FrequencyTestProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (freq: string) => void;
}

const FREQ_QUESTIONS = [
    {
        question: "How much free time do you have each week for learning?",
        options: [
            { text: "Very little (1-2 hours)", points: 1 },
            { text: "A moderate amount (3-5 hours)", points: 2 },
            { text: "A lot (6+ hours)", points: 3 }
        ]
    },
    {
        question: "How quickly do you need to reach your goal?",
        options: [
            { text: "No rush, just learning for fun", points: 1 },
            { text: "Within a year", points: 2 },
            { text: "Urgent! Asap (Exam/Job coming up)", points: 3 }
        ]
    }
];

const FrequencyTest: React.FC<FrequencyTestProps> = ({ isOpen, onClose, onComplete }) => {
    const [currentQ, setCurrentQ] = useState(0);
    const [score, setScore] = useState(0);

    if (!isOpen) return null;

    const handleAnswer = (points: number) => {
        const newScore = score + points;
        
        if (currentQ < FREQ_QUESTIONS.length - 1) {
            setScore(newScore);
            setCurrentQ(currentQ + 1);
        } else {
            // Determine frequency
            let freq = 'Light';
            if (newScore >= 5) freq = 'Intensive';
            else if (newScore >= 3) freq = 'Balanced';
            
            alert(`Based on your answers, we suggest: ${freq} Frequency`);
            onComplete(freq);
        }
    };

    const q = FREQ_QUESTIONS[currentQ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-90 font-sans p-4">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-500">Lifestyle Assessment</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <h1 className="text-3xl font-extrabold text-gray-800 mb-8 text-center mt-4">
                    {q.question}
                </h1>

                <div className="space-y-4 mb-8">
                    {q.options.map((opt, idx) => (
                        <button 
                            type="button"
                            key={idx} 
                            onClick={() => handleAnswer(opt.points)}
                            className="w-full border-2 border-gray-200 hover:border-brand-blue hover:bg-blue-50 text-gray-800 font-bold rounded-xl p-6 text-xl transition-all"
                        >
                            {opt.text}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export { FrequencyTest };
export default FrequencyTest;
