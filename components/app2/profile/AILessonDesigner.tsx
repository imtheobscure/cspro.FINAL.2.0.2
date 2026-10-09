import React, { useState } from 'react';
import { Learner } from '../../../types2';
import { generateHyperPersonalizedLesson } from '../../../services/geminiService2';
import SectionCard from '../SectionCard';

interface AILessonDesignerProps {
    learner: Learner;
}

const AILessonDesigner: React.FC<AILessonDesignerProps> = ({ learner }) => {
    const [languageInput, setLanguageInput] = useState('');
    const [lessonContext, setLessonContext] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!languageInput.trim()) {
            alert("Please paste some text into the language input box.");
            return;
        }

        setIsGenerating(true);
        try {
            const html = await generateHyperPersonalizedLesson({
                learner,
                languageInput,
                lessonContext
            });
            setGeneratedHtml(html);
        } catch (error) {
            console.error("Failed to generate lesson:", error);
            alert("Something went wrong while generating the lesson.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!generatedHtml) return;
        const blob = new Blob([generatedHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Lesson_${learner.name}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePreview = () => {
        if (!generatedHtml) return;
        const blob = new Blob([generatedHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    return (
        <SectionCard title="AI Lesson Designer" icon={<i className="fas fa-magic"></i>}>
            <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-blue-800 font-medium">
                        <i className="fas fa-info-circle mr-2"></i>
                        Paste a messy transcript or writing sample below. The AI will reverse-engineer a highly personalized, gamified HTML lesson plan targeting the learner's specific gaps in Lexical Resource, Grammar, Coherence, Pronunciation, and Interaction.
                    </p>
                </div>

                <div>
                    <label className="block font-bold text-lg text-brand-gray-darkest mb-2">
                        Raw Language Input
                        <span className="ml-2 text-sm font-normal text-gray-500">(Transcript, Writing Sample, or List of Errors)</span>
                    </label>
                    <textarea
                        value={languageInput}
                        onChange={(e) => setLanguageInput(e.target.value)}
                        className="w-full h-64 p-4 bg-white border-2 border-brand-gray-light rounded-xl focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue text-brand-gray-darkest font-mono text-base placeholder:text-gray-400 shadow-sm transition-all"
                        placeholder="Paste text here... (e.g., 'I go to store yesterday and buying a apple...')"
                    />
                </div>

                <div>
                    <label className="block font-bold text-lg text-brand-gray-darkest mb-2">
                        Context / Goal
                        <span className="ml-2 text-sm font-normal text-gray-500">(Optional context for the lesson)</span>
                    </label>
                    <textarea
                        value={lessonContext}
                        onChange={(e) => setLessonContext(e.target.value)}
                        className="w-full h-24 p-4 bg-white border-2 border-brand-gray-light rounded-xl focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue text-brand-gray-darkest text-base placeholder:text-gray-400 shadow-sm transition-all"
                        placeholder="e.g., Prepare for a job interview, fix past tense errors, focus on formal vocabulary..."
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !languageInput.trim()}
                        className="flex-1 bg-brand-purple text-white font-extrabold py-4 px-6 rounded-xl hover:bg-purple-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                    >
                        {isGenerating ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i> Designing Lesson...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-wand-magic-sparkles"></i> Generate Personalized Lesson
                            </>
                        )}
                    </button>
                </div>

                {generatedHtml && (
                    <div className="mt-8 p-6 bg-green-50 border-2 border-brand-green rounded-2xl animate-fade-in shadow-md">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-brand-green text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-md">
                                <i className="fas fa-check"></i>
                            </div>
                            <div>
                                <h4 className="font-extrabold text-green-800 text-xl">Lesson Generated!</h4>
                                <p className="text-green-700 font-medium">Your hyper-personalized HTML lesson is ready.</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handlePreview}
                                className="flex-1 bg-white text-brand-green border-2 border-brand-green font-extrabold py-3 px-6 rounded-xl hover:bg-green-50 transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-external-link-alt"></i> Preview Lesson
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex-1 bg-brand-green text-white border-2 border-brand-green font-extrabold py-3 px-6 rounded-xl hover:bg-green-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-download"></i> Download HTML File
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </SectionCard>
    );
};

export default AILessonDesigner;