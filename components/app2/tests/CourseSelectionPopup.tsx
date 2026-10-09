import React, { useState, useMemo } from 'react';
import { useCoursebookStore, Coursebook } from '../../../store/useCoursebookStore';
import { CoursePlan } from '../../../types2';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (course: Coursebook) => void;
}

const CourseSelectionPopup: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
    const { coursebooks } = useCoursebookStore();
    const [step, setStep] = useState(0);
    const [preferences, setPreferences] = useState<{
        targetLanguage?: string;
        targetAudience?: string;
        primaryFocus?: string;
        cefr?: string;
        video?: string;
        skillBalance?: string;
        overallDifficulty?: string;
        accent?: string;
        authenticity?: string;
    }>({});
    const [selectedCourse, setSelectedCourse] = useState<Coursebook | null>(null);

    const languages = useMemo(() => {
        const langs = new Set(coursebooks.map(b => b.targetLanguage || 'English'));
        return Array.from(langs);
    }, [coursebooks]);

    const recommendedCourses = useMemo(() => {
        let sorted = [...coursebooks];
        
        if (preferences.targetLanguage) {
            sorted = sorted.filter(c => (c.targetLanguage || 'English') === preferences.targetLanguage);
        }

        // Score courses
        const scored = sorted.map(course => {
            let score = 0;
            
            if (preferences.targetAudience && course.targetAudience.toLowerCase().includes(preferences.targetAudience.split(' ')[0].toLowerCase())) score += 2;
            if (preferences.primaryFocus && course.primaryFocus.toLowerCase().includes(preferences.primaryFocus.split(' ')[0].toLowerCase())) score += 2;
            
            // Match CEFR more accurately
            if (preferences.cefr && course.cefr.includes(preferences.cefr.substring(0, 2))) {
                score += 3;
            }
            
            if (preferences.video && course.video.toLowerCase().includes(preferences.video.toLowerCase())) score += 1;
            
            if (preferences.skillBalance && course.skillBalance.toLowerCase().includes(preferences.skillBalance.toLowerCase())) score += 1.5;
            
            if (preferences.overallDifficulty) {
                // Course difficulty might be "Easy-Moderate", matching "Easy" or "Moderate"
                if (course.overallDifficulty.toLowerCase().includes(preferences.overallDifficulty.toLowerCase())) score += 1.5;
            }

            if (preferences.accent && course.accent.toLowerCase().includes(preferences.accent.toLowerCase())) score += 1.5;
            if (preferences.authenticity && course.authenticity.toLowerCase().includes(preferences.authenticity.toLowerCase())) score += 1.5;

            return { course, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.map(s => s.course).slice(0, 3);
    }, [coursebooks, preferences]);

    if (!isOpen) return null;

    const STEPS = [
        {
            title: "🌍 Which language are we learning?",
            field: 'targetLanguage',
            options: languages.map(l => ({ value: l, label: l, color: 'blue' }))
        },
        {
            title: "👤 Who is the student?",
            field: 'targetAudience',
            options: [
                { value: 'Kids', label: 'Child (Kids)', color: 'green' },
                { value: 'Teenagers', label: 'Teenager', color: 'purple' },
                { value: 'Adults', label: 'Adult', color: 'orange' },
                { value: 'Business professionals', label: 'Professional (Business)', color: 'gray' },
            ]
        },
        {
            title: "🎯 What is the main goal?",
            field: 'primaryFocus',
            options: [
                { value: 'General', label: 'General & Everyday Speaking', color: 'blue' },
                { value: 'Exam prep', label: 'Pass an Exam or Test', color: 'red' },
                { value: 'Business', label: 'Work and Business', color: 'gray' },
                { value: 'Academic', label: 'School and Study', color: 'indigo' },
                { value: 'Survival', label: 'Travel and Survival', color: 'teal' },
            ]
        },
        {
            title: "📈 What is their current level?",
            field: 'cefr',
            options: [
                { value: 'A1', label: 'A1 / A2 (Beginner)', color: 'green' },
                { value: 'B1', label: 'B1 / B2 (Intermediate)', color: 'blue' },
                { value: 'C1', label: 'C1 / C2 (Advanced)', color: 'purple' },
            ]
        },
        {
            title: "🗣️ What skills do they want to focus on?",
            field: 'skillBalance',
            options: [
                { value: 'Speaking', label: 'Mostly Speaking & Listening', color: 'pink' },
                { value: 'Reading', label: 'Mostly Reading & Writing', color: 'yellow' },
                { value: 'Integrated', label: 'A mix of everything', color: 'teal' },
            ]
        },
        {
            title: "🧠 How challenging should the course be?",
            field: 'overallDifficulty',
            options: [
                { value: 'Easy', label: 'Easy and relaxed', color: 'green' },
                { value: 'Moderate', label: 'Normal pace', color: 'blue' },
                { value: 'Difficult', label: 'Challenging and fast', color: 'red' },
            ]
        },
        {
            title: "🎧 Which accent do they prefer?",
            field: 'accent',
            options: [
                { value: 'American', label: 'American English', color: 'blue' },
                { value: 'British', label: 'British English', color: 'red' },
                { value: 'International', label: 'International / Doesn\'t matter', color: 'teal' },
            ]
        },
        {
            title: "📰 What kind of materials do they prefer?",
            field: 'authenticity',
            options: [
                { value: 'Authentic', label: 'Real articles, videos & news', color: 'purple' },
                { value: 'Mixed', label: 'A mix of real and learner materials', color: 'pink' },
                { value: 'Semi-authentic', label: 'Simple materials for learners', color: 'green' },
            ]
        },
        {
            title: "🎬 Do they like watching videos in class?",
            field: 'video',
            options: [
                { value: 'Yes', label: 'Yes, lots of videos!', color: 'pink' },
                { value: 'Some', label: 'Sometimes', color: 'yellow' },
                { value: 'No', label: 'No, just reading and talking', color: 'gray' },
            ]
        }
    ];

    const handleSelectOption = (field: string, value: string) => {
        setPreferences(prev => ({ ...prev, [field]: value }));
        if (step < STEPS.length - 1) {
            setStep(prev => prev + 1);
        } else {
            // Reached the end, let it naturally render the results step (step === STEPS.length)
            setStep(STEPS.length);
        }
    };

    const handleConfirmSelect =() => {
        if (selectedCourse) {
            onSelect(selectedCourse);
            onClose();
        }
    };

    const renderQuiz = () => {
        const currentStep = STEPS[step];
        return (
            <div className="animate-fade-in text-center py-8">
                <h2 className="text-3xl font-black text-gray-800 mb-8">{currentStep.title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {currentStep.options.map((opt: any) => (
                        <button
                            key={String(opt.value)}
                            onClick={() => handleSelectOption(currentStep.field as any, opt.value)}
                            className={`bg-${opt.color}-100 text-${opt.color}-800 hover:bg-${opt.color}-200 p-6 rounded-2xl border-2 border-${opt.color}-300 hover:scale-105 transition-all text-xl font-bold shadow-sm`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {step > 0 && (
                    <button onClick={() => setStep(prev => prev - 1)} className="mt-8 text-gray-500 font-bold hover:text-gray-800">
                        ← Back
                    </button>
                )}
            </div>
        );
    };

    const renderResults = () => {
        return (
            <div className="animate-fade-in h-full flex flex-col">
                <h2 className="text-2xl font-bold text-center mb-6">🎯 Recommended Courses</h2>
                
                {selectedCourse ? (
                    <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-xl p-6 border-2 border-brand-blue">
                         <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">{selectedCourse.coursebook}</h3>
                                <p className="text-gray-600 font-bold">{selectedCourse.publisher} • {selectedCourse.targetLanguage || 'English'}</p>
                            </div>
                            <span className="bg-green-100 text-green-800 px-3 py-1 font-bold text-xl rounded-lg border border-green-300">
                                {selectedCourse.cefr}
                            </span>
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                <span className="text-gray-500 uppercase text-xs font-bold block">Target Audience</span>
                                <span className="font-semibold text-gray-800">{selectedCourse.targetAudience}</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                <span className="text-gray-500 uppercase text-xs font-bold block">Primary Focus</span>
                                <span className="font-semibold text-gray-800">{selectedCourse.primaryFocus}</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                <span className="text-gray-500 uppercase text-xs font-bold block">Skill Balance</span>
                                <span className="font-semibold text-gray-800">{selectedCourse.skillBalance}</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                <span className="text-gray-500 uppercase text-xs font-bold block">Vocabulary Type</span>
                                <span className="font-semibold text-gray-800">{selectedCourse.vocabularyType}</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                <span className="text-gray-500 uppercase text-xs font-bold block">Real World Topics</span>
                                <span className="font-semibold text-gray-800">{selectedCourse.realWorldTopics}</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                <span className="text-gray-500 uppercase text-xs font-bold block">Communication Goal</span>
                                <span className="font-semibold text-gray-800">{selectedCourse.communicationGoal}</span>
                            </div>
                         </div>

                         <div className="mt-8 flex gap-4">
                            <button onClick={() => setSelectedCourse(null)} className="flex-1 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300">
                                ← Back to list
                            </button>
                            <button onClick={handleConfirmSelect} className="flex-1 py-3 bg-brand-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 hover:scale-105 transition-transform">
                                ☑️ Use this Course
                            </button>
                         </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {recommendedCourses.map((course, idx) => (
                            <div key={course.id || idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col hover:border-brand-blue hover:shadow-md cursor-pointer transition-all" onClick={() => setSelectedCourse(course)}>
                                <h3 className="font-bold text-xl text-brand-blue mb-1">{course.coursebook}</h3>
                                <p className="text-sm font-semibold text-gray-500 mb-3">{course.publisher}</p>
                                
                                <div className="mt-auto space-y-2 text-sm text-gray-700">
                                    <p><span className="font-semibold">Level:</span> {course.cefr}</p>
                                    <p className="line-clamp-2"><span className="font-semibold">Focus:</span> {course.primaryFocus}</p>
                                </div>
                                <button className="mt-6 w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg group-hover:bg-indigo-100">
                                    View Details →
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-80 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 z-10 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow">
                    <i className="fas fa-times text-xl"></i>
                </button>
                
                <div className="flex-1 p-8 overflow-y-auto">
                    {step < STEPS.length ? renderQuiz() : renderResults()}
                </div>
            </div>
        </div>
    );
};

export { CourseSelectionPopup };
export default CourseSelectionPopup;
