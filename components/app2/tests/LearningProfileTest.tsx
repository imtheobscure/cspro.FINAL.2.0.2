import React, { useState } from 'react';

interface LearningProfileTestProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (results: { vark: string[], gardner: string[], mental: string[], sel: string[] }) => void;
}

const QUESTIONS = [
    {
        question: "How do you like to learn?",
        category: "vark",
        options: [
            { id: "1", text: "🖼️ Seeing pictures", mapping: "Visual" },
            { id: "2", text: "🎧 Listening", mapping: "Auditory" },
            { id: "3", text: "🤸 Moving and doing", mapping: "Kinesthetic" },
            { id: "4", text: "✍️ Reading and writing", mapping: "Reading/Writing" },
        ]
    },
    {
        question: "What are you good at?",
        category: "gardner",
        options: [
            { id: "1", text: "🗣️ Talking and words", mapping: "Linguistic" },
            { id: "2", text: "🧮 Math and puzzles", mapping: "Logical-Mathematical" },
            { id: "3", text: "🎨 Drawing and art", mapping: "Spatial" },
            { id: "4", text: "🏃 Sports and moving", mapping: "Bodily-Kinesthetic" },
            { id: "5", text: "🎵 Music and sounds", mapping: "Musical" },
            { id: "6", text: "🤝 Helping friends", mapping: "Interpersonal" },
            { id: "7", text: "🧘 Knowing myself", mapping: "Intrapersonal" },
            { id: "8", text: "🌿 Nature and animals", mapping: "Naturalist" }
        ]
    },
    {
        question: "How does your brain work best?",
        category: "mental",
        options: [
            { id: "1", text: "🧠 Remembering things", mapping: "Memory" },
            { id: "2", text: "⚖️ Thinking logically", mapping: "Logic" },
            { id: "3", text: "💡 Making new ideas", mapping: "Creativity" },
            { id: "4", text: "🎯 Paying attention", mapping: "Focus" },
        ]
    },
    {
        question: "How do you feel in English class?",
        category: "sel",
        options: [
            { id: "1", text: "😥 Nervous", mapping: "Anxiety" },
            { id: "2", text: "💪 Confident", mapping: "Confidence" },
            { id: "3", text: "😨 Afraid of mistakes", mapping: "Fear of Mistakes" },
            { id: "4", text: "🔥 Excited to learn", mapping: "Motivation" },
            { id: "5", text: "🎲 Happy to try new things", mapping: "Risk-taking" },
        ]
    }
];

const COLORS = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
    'bg-orange-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500'
];

const LearningProfileTest: React.FC<LearningProfileTestProps> = ({ isOpen, onClose, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [results, setResults] = useState<{vark: string[], gardner: string[], mental: string[], sel: string[]}>({ vark: [], gardner: [], mental: [], sel: [] });
    const [showSplash, setShowSplash] = useState(false);
    const [currentSelection, setCurrentSelection] = useState<string[]>([]);

    if (!isOpen) return null;

    const toggleOption = (mapping: string) => {
        setCurrentSelection(prev => 
            prev.includes(mapping) ? prev.filter(item => item !== mapping) : [...prev, mapping]
        );
    };

    const handleNext = () => {
        const category = QUESTIONS[currentStep].category;
        const newResults = { ...results, [category]: [...results[category as keyof typeof results], ...currentSelection] };
        setResults(newResults);
        setCurrentSelection([]);

        if (currentStep < QUESTIONS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            setShowSplash(true);
        }
    };

    const handleFinish = () => {
        onComplete(results);
        setShowSplash(false);
        setCurrentStep(0);
        setResults({ vark: [], gardner: [], mental: [], sel: [] });
    };

    if (showSplash) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 font-sans p-4">
                <div className="bg-white rounded-3xl p-10 max-w-2xl w-full text-center shadow-2xl animate-fade-in transform transition-all scale-100">
                    <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-600 mb-6">🎉 Amazing!</h2>
                    <p className="text-2xl text-gray-700 mb-8 leading-relaxed">
                        We've analyzed your unique brain profile! Here's how you learn best:
                    </p>
                    <div className="grid grid-cols-2 gap-6 mb-10 text-left">
                        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 shadow-sm">
                            <h3 className="font-bold text-purple-800 text-lg mb-2">👁️ VARK Style</h3>
                            <p className="text-purple-600 text-xl font-medium">{results.vark.join(', ') || 'Visual'}</p>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
                            <h3 className="font-bold text-blue-800 text-lg mb-2">🧠 Intelligence</h3>
                            <p className="text-blue-600 text-xl font-medium">{results.gardner.join(', ') || 'Logical'}</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 shadow-sm">
                            <h3 className="font-bold text-green-800 text-lg mb-2">⚡ Superpower</h3>
                            <p className="text-green-600 text-xl font-medium">{results.mental.join(', ') || 'Focus'}</p>
                        </div>
                        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 shadow-sm">
                            <h3 className="font-bold text-orange-800 text-lg mb-2">❤️ EQ</h3>
                            <p className="text-orange-600 text-xl font-medium">{results.sel.join(', ') || 'Awareness'}</p>
                        </div>
                    </div>
                    <button type="button" onClick={handleFinish} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-12 rounded-full text-2xl shadow-xl hover:scale-105 transition-all">
                        Let's Go! 🚀
                    </button>
                </div>
            </div>
        );
    }

    const q = QUESTIONS[currentStep];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-90 font-sans p-4">
            <div className="bg-white rounded-3xl p-8 max-w-5xl w-full shadow-2xl flex flex-col min-h-[85vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-500">Question {currentStep + 1} of {QUESTIONS.length}</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-extrabold text-center text-gray-800 mb-8 mt-4">
                    {q.question}
                </h1>
                
                <p className="text-xl text-center text-gray-500 font-bold mb-8">(Choose one or more)</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 content-start mb-8 overflow-y-auto overflow-x-hidden pr-2">
                    {q.options.map((opt, idx) => {
                        const isSelected = currentSelection.includes(opt.mapping);
                        const parts = opt.text.split(' ');
                        const emoji = parts[0];
                        const textWithoutEmoji = parts.slice(1).join(' ');
                        return (
                            <button 
                                type="button"
                                key={idx} 
                                onClick={() => toggleOption(opt.mapping)}
                                className={`relative ${COLORS[idx % COLORS.length]} transition-all text-white rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-lg transform hover:scale-[1.02] text-center group ${isSelected ? 'ring-4 ring-offset-2 ring-blue-500 scale-[1.03] opacity-100' : 'opacity-85 hover:opacity-100'}`}
                            >
                                <div className="absolute top-3 left-4 text-white opacity-40 font-black text-sm">
                                    {idx + 1}
                                </div>
                                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xl group-hover:bg-opacity-30 transition-all">
                                    {emoji}
                                </div>
                                <span className="text-lg md:text-xl font-bold">{textWithoutEmoji}</span>
                                {isSelected && <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-white"><i className="fas fa-check text-xs"></i></div>}
                            </button>
                        );
                    })}
                </div>
                
                <div className="flex justify-between items-center mt-auto pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                        {currentStep > 0 && (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(prev => prev - 1)}
                                className="text-gray-500 hover:text-gray-800 font-bold px-4 py-2 rounded border border-gray-300"
                            >
                                ← Back
                            </button>
                        )}
                        <div className="flex gap-2">
                            {QUESTIONS.map((_, idx) => (
                                <div key={idx} className={`h-3 rounded-full transition-all ${idx === currentStep ? 'w-12 bg-blue-500' : idx < currentStep ? 'w-4 bg-blue-300' : 'w-4 bg-gray-200'}`} />
                            ))}
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={handleNext}
                        disabled={currentSelection.length === 0}
                        className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-full text-xl shadow-lg transition-all ${currentSelection.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                    >
                        {currentStep === QUESTIONS.length - 1 ? "Finish!" : "Next →"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LearningProfileTest;
