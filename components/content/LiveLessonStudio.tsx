import React, { FC, useState, useEffect, useRef } from 'react';
import { H5P_TYPES } from '../../utils/h5pTypes';
import { LearnerProfile, TutorProfile } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Textarea from '../ui/Textarea';
import Input from '../ui/Input';
import { generateContentWithRetry } from '../../services/generation/core';
import { fixJson, validateJson } from '../../utils/jsonTools';
import { generateLiveLessonHtml } from '../../utils/liveLessonHtmlGenerator';

interface LiveLessonStudioProps {
    learner: LearnerProfile;
    tutorProfile?: TutorProfile;
    onSave: (data: any) => void;
    initialContent?: any;
}

const LiveLessonStudio: FC<LiveLessonStudioProps> = ({ learner, tutorProfile, onSave, initialContent }) => {
    const [selectedTypes, setSelectedTypes] = useState<string[]>([H5P_TYPES[0].id]);
    const [jsonContent, setJsonContent] = useState(initialContent ? JSON.stringify(initialContent, null, 2) : '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [lessonText, setLessonText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [useTutorInfo, setUseTutorInfo] = useState(false);
    const [useDeepThinking, setUseDeepThinking] = useState(false);
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [activeTab, setActiveTab] = useState<'config' | 'json'>('config');
    const [error, setError] = useState<string | null>(null);

    const filteredTypes = H5P_TYPES.filter(t => t.label.toLowerCase().includes(searchTerm.toLowerCase()));

    const toggleTypeSelection = (id: string) => {
        setSelectedTypes(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            return [...prev, id];
        });
    };

    const generatePrompt = () => {
        const selectedLabels = selectedTypes.map(id => H5P_TYPES.find(t => t.id === id)?.label).join(', ');
        
        const tutorContext = useTutorInfo && tutorProfile && tutorProfile.useForPersonalization 
            ? `
            Tutor Context (Use this persona for feedback/instructions):
            - Name: ${tutorProfile.name}
            - Style: ${tutorProfile.teachingMethod}
            - Interests: ${tutorProfile.interests}
            ` 
            : '';

        const deepThinkingInstruction = useDeepThinking ? "IMPORTANT: Use Deep Thinking / Reasoning to ensure high pedagogical quality." : "";

        const prompt = `
        ${deepThinkingInstruction}
        You are an expert interactive language learning content creator (H5P style).
        I want to create a lesson with the following activity types: ${selectedLabels}.

        Learner Profile:
        - Name: ${learner.name}
        - Level: ${learner.cefrLevel}
        - Interests: ${learner.interests}
        
        ${tutorContext}

        CRITICAL JSON INSTRUCTIONS:
        1. Based on the lesson text provided below, generate a valid JSON object containing H5P activities for the selected types.
        2. The JSON must be an object where keys are the activity type IDs (e.g., "multiple_choice", "fill_blanks") and values are the H5P activity JSONs.
        3. ALWAYS use valid JSON structure. Escape all quotes inside strings. Do NOT leave trailing commas or comments.
        4. Do NOT wrap your output in markdown \`\`\`json or \`\`\` blocks if you can avoid it, just return the raw JSON text. Do NOT add preamble or explanations.
        5. Deeply engage the learner's interests. Use rich vocabulary suited to their CEFR level.

        Specific Schema Hints for reference:
        ${selectedTypes.map(t => `${t}: ${getSchemaHint(t)}`).join('\n')}

        LESSON TEXT:
        ${lessonText}
        `;

        setGeneratedPrompt(prompt);
        return prompt;
    };

    const handleCopyPrompt = () => {
        const prompt = generatePrompt();
        if (!prompt) return;
        navigator.clipboard.writeText(prompt);
        alert("Prompt copied to clipboard! You can paste it into an AI (like Gemini or ChatGPT), get the JSON, and paste it into the JSON Editor tab.");
    };

    const handleGenerateJson = () => {
        if (!lessonText.trim()) {
            alert("Please enter some lesson text first.");
            return;
        }

        const prompt = generatePrompt();
        if (!prompt) return;

        setIsGenerating(true);
        setError(null);
        setActiveTab('json'); // Switch to JSON tab to see result

        generateContentWithRetry({
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        }).then(res => {
            let text = res.text.trim();
            // Remove markdown code blocks if present
            const match = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) text = match[1];
            else {
                const match2 = text.match(/```\s*([\s\S]*?)\s*```/);
                if (match2) text = match2[1];
            }
            
            try {
                const parsed = JSON.parse(text);
                setJsonContent(JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.warn("Initial parse failed, trying to fix JSON...");
                const fixed = fixJson(text);
                if (fixed) {
                    try {
                        const parsedFixed = JSON.parse(fixed);
                        setJsonContent(JSON.stringify(parsedFixed, null, 2));
                    } catch (e2) {
                        setJsonContent(fixed);
                        setError("Generated content was not valid JSON. Please check and fix manually.");
                    }
                } else {
                    setJsonContent(text); // Leave as is for manual fixing
                    setError("Generated content was not valid JSON. Please check and fix manually.");
                }
            }
            setIsGenerating(false);
        }).catch(err => {
            console.error(err);
            setError("Generation failed. Please try again.");
            setIsGenerating(false);
        });
    };

    const handleFormatJson = () => {
        try {
            const parsed = JSON.parse(jsonContent);
            setJsonContent(JSON.stringify(parsed, null, 2));
            setError(null);
        } catch (e) {
            setError("Invalid JSON. Cannot format.");
        }
    };

    const handleSaveContent = () => {
        try {
            const data = JSON.parse(jsonContent || '{}');
            const html = generateLiveLessonHtml(data, learner.name);
            if (onSave) {
                onSave({ ...data, htmlContent: html });
            } else {
                console.info("onSave is not provided, triggering download fallback.");
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `LiveLesson_${learner.name.replace(/\s+/g, '_')}_Offline.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error("Failed to parse JSON for save", e);
            setError("Invalid JSON content. Please fix before saving.");
        }
    };

    const getSchemaHint = (type: string) => {
        // Detailed hints for common types to guide the AI for language learning
        switch(type) {
            case 'image_hotspots': return 'Structure: { "image": "url", "hotspots": [ { "x": 50, "y": 50, "header": "Title", "text": "Description" } ] }';
            case 'multiple_choice': return 'Structure: { "question": "...", "answers": [ { "text": "...", "correct": true/false, "tipsAndFeedback": "..." } ] }';
            case 'accordion': return 'Structure: { "panels": [ { "title": "...", "content": "..." } ] }';
            case 'drag_text': return 'Structure: { "taskDescription": "...", "textField": "Text with *draggable* words." }';
            case 'fill_blanks': return 'Structure: { "text": "The capital of France is *Paris*." }';
            case 'true_false': return 'Structure: { "question": "...", "correct": "true", "feedback": { "correct": "...", "wrong": "..." } }';
            case 'flashcards': return 'Structure: { "cards": [ { "front": "Word", "back": "Definition/Translation", "image": "url (optional)" } ] }';
            case 'dialog_cards': return 'Structure: { "cards": [ { "front": "Phrase", "back": "Meaning/Response", "audio": "url (optional)" } ] }';
            case 'essay': return 'Structure: { "prompt": "Write about...", "sampleAnswer": "...", "keywords": ["word1", "word2"] }';
            case 'dictation': return 'Structure: { "sentences": [ { "text": "Type what you hear", "audio": "url" } ] }';
            case 'sort_paragraphs': return 'Structure: { "paragraphs": ["First part...", "Second part...", "Third part..."] }';
            case 'speak_the_words': return 'Structure: { "question": "Read this sentence aloud:", "expectedAnswer": "..." }';
            case 'guess_answer': return 'Structure: { "image": "url", "question": "What is this?", "answer": "..." }';
            case 'find_words': return 'Structure: { "wordList": ["HELLO", "WORLD"], "gridSize": 10 }';
            case 'mark_words': return 'Structure: { "taskDescription": "Click the verbs.", "textField": "The *cat* *jumped*." }';
            default: return 'Standard H5P JSON structure. Please invent a creative JSON schema that represents this activity.';
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            <Card className="border-l-4 border-pink-500 flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">🔴 H5P Creator Sandbox</h2>
                        <p className="text-gray-600 text-sm">Create interactive H5P activities tailored to {learner.name}.</p>
                    </div>
                    <div className="flex gap-2">
                        {jsonContent && (
                            <Button onClick={handleSaveContent} className="bg-green-600 hover:bg-green-700 text-white">
                                <i className="fas fa-save mr-2"></i> Save Lesson
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden min-h-0">
                    {/* Left Panel: Editor & Config */}
                    <div className="flex flex-col h-full overflow-hidden border-r border-gray-200 pr-4">
                        <div className="flex border-b border-gray-200 mb-4">
                            <button 
                                onClick={() => setActiveTab('config')}
                                className={`px-4 py-2 font-medium text-sm ${activeTab === 'config' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                1. Configuration
                            </button>
                            <button 
                                onClick={() => setActiveTab('json')}
                                className={`px-4 py-2 font-medium text-sm ${activeTab === 'json' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                2. JSON Editor
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            {activeTab === 'config' ? (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Select Activity Types</label>
                                        <Input 
                                            placeholder="Search activity types..." 
                                            value={searchTerm} 
                                            onChange={e => setSearchTerm(e.target.value)} 
                                            className="mb-2"
                                        />
                                        <div className="h-48 overflow-y-auto border border-gray-300 rounded-lg bg-white p-2 space-y-1">
                                            {filteredTypes.map(t => (
                                                <div 
                                                    key={t.id} 
                                                    onClick={() => toggleTypeSelection(t.id)}
                                                    className={`p-2 rounded cursor-pointer flex items-center justify-between ${selectedTypes.includes(t.id) ? 'bg-pink-100 text-pink-800 border border-pink-300' : 'hover:bg-gray-50'}`}
                                                >
                                                    <span className="text-sm">{t.label}</span>
                                                    {selectedTypes.includes(t.id) && <i className="fas fa-check text-pink-600"></i>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Lesson Text / Context / Source Material</label>
                                        <Textarea 
                                            value={lessonText} 
                                            onChange={e => setLessonText(e.target.value)} 
                                            placeholder="Paste the lesson text, article, dialogue, or objectives here..." 
                                            rows={8}
                                            className="text-sm"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={useDeepThinking} 
                                                onChange={e => setUseDeepThinking(e.target.checked)}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Use Deep Thinking Model</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={useTutorInfo} 
                                                onChange={e => setUseTutorInfo(e.target.checked)}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Use Tutor Info for Personalization</span>
                                        </label>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button 
                                            variant="secondary"
                                            onClick={handleCopyPrompt} 
                                            className="w-1/3 py-3 font-bold border border-gray-300"
                                        >
                                            <i className="fas fa-copy mr-2"></i> Copy Prompt
                                        </Button>
                                        <Button 
                                            onClick={handleGenerateJson} 
                                            disabled={isGenerating}
                                            className="w-2/3 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold shadow-md"
                                        >
                                            {isGenerating ? <span className="animate-pulse">Generating Content...</span> : '✨ Generate Content'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-bold text-gray-700">JSON Output</label>
                                        <Button onClick={handleFormatJson} size="sm" variant="secondary">
                                            <i className="fas fa-code mr-1"></i> Format
                                        </Button>
                                    </div>
                                    {error && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-2 text-sm">
                                            {error}
                                        </div>
                                    )}
                                    <textarea
                                        value={jsonContent}
                                        onChange={e => setJsonContent(e.target.value)}
                                        className="flex-1 w-full p-4 font-mono text-xs bg-gray-900 text-green-400 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none resize-none"
                                        spellCheck={false}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Live Preview */}
                    <div className="flex flex-col h-full overflow-hidden">
                        <label className="block text-sm font-bold text-gray-700 mb-2">3. Live Preview</label>
                        <div className="bg-gray-100 p-4 rounded-xl flex-1 overflow-y-auto border border-gray-300 shadow-inner">
                            {jsonContent ? (
                                <LiveLessonRenderer content={jsonContent} />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <i className="fas fa-chalkboard text-6xl mb-4 opacity-20"></i>
                                    <p>Generated content will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

const LiveLessonRenderer: FC<{ content: string }> = ({ content }) => {
    let data: any = {};
    let error = null;
    
    try {
        data = JSON.parse(content);
    } catch (e) {
        error = "Invalid JSON Data";
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-red-500 font-bold">
                <i className="fas fa-exclamation-triangle mr-2"></i> {error}
            </div>
        );
    }

    // Render all keys in the JSON object
    return (
        <div className="space-y-8">
            {Object.keys(data).map((key, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                        <span className="font-mono text-xs font-bold text-gray-500 uppercase">{key}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">H5P</span>
                    </div>
                    <div className="p-6">
                        <ActivityRenderer type={key} data={data[key]} />
                    </div>
                </div>
            ))}
        </div>
    );
};

const ActivityRenderer: FC<{ type: string; data: any }> = ({ type, data }) => {
    if (!data) return null;

    switch (type) {
        case 'image_hotspots':
            return (
                <div className="relative max-w-full mx-auto p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-[inset_0_1px_4px_rgba(0,0,0,0.1),_0_10px_20px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-700">
                    <img src={data.image || 'https://via.placeholder.com/800x600'} alt="Interactive" className="w-full rounded-xl shadow-lg border border-gray-200 dark:border-gray-600" />
                    {(data.hotspots || []).map((h: any, i: number) => (
                        <div 
                            key={i}
                            className="absolute w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full border-[3px] border-white dark:border-gray-800 shadow-[0_5px_15px_rgba(236,72,153,0.5)] cursor-pointer flex items-center justify-center text-white font-black hover:scale-110 hover:shadow-[0_8px_25px_rgba(236,72,153,0.7)] transition-all duration-300 group"
                            style={{ left: `${h.x}%`, top: `${h.y}%` }}
                        >
                            {i + 1}
                            <div className="absolute bottom-[120%] left-1/2 transform -translate-x-1/2 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md text-gray-800 dark:text-gray-100 p-4 rounded-xl shadow-2xl border border-white/20 dark:border-gray-600/50 text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 translate-y-2 group-hover:translate-y-0">
                                <strong className="block mb-2 text-pink-600 dark:text-pink-400 font-extrabold pb-2 border-b border-gray-100 dark:border-gray-700 text-base">{h.header}</strong>
                                <span className="leading-relaxed block">{h.text}</span>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white/95 dark:border-t-gray-800/95"></div>
                            </div>
                        </div>
                    ))}
                </div>
            );

        case 'accordion':
            return (
                <div className="space-y-3">
                    {(data.panels || []).map((p: any, i: number) => (
                        <details key={i} className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 group transition-all duration-300 overflow-hidden">
                            <summary className="p-5 font-bold cursor-pointer list-none flex justify-between items-center group-open:bg-indigo-50/50 dark:group-open:bg-indigo-900/20 text-gray-800 dark:text-gray-200 group-open:text-indigo-700 dark:group-open:text-indigo-400 transition-colors">
                                {p.title}
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-open:bg-indigo-100 dark:group-open:bg-indigo-800/50 transition-colors">
                                    <i className="fas fa-chevron-down transform group-open:rotate-180 transition-transform duration-300 text-gray-500 dark:text-gray-400 group-open:text-indigo-600 dark:group-open:text-indigo-400"></i>
                                </div>
                            </summary>
                            <div className="p-5 text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 leading-relaxed">
                                {p.content}
                            </div>
                        </details>
                    ))}
                </div>
            );

        case 'multiple_choice':
            return (
                <div className="space-y-6 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white leading-tight">{data.question}</h3>
                    <div className="space-y-3">
                        {(data.answers || []).map((a: any, i: number) => (
                            <button key={i} className="w-full text-left p-4 sm:p-5 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-md transition-all duration-200 flex justify-between items-center group transform hover:-translate-y-0.5">
                                <span className="font-medium pr-4">{a.text}</span>
                                {a.correct && <span className="text-xs font-bold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-95 group-hover:scale-100 shrink-0 shadow-sm border border-green-200 dark:border-green-800">Correct <i className="fas fa-check ml-1"></i></span>}
                            </button>
                        ))}
                    </div>
                </div>
            );

        case 'drag_text':
            const parts = (data.textField || '').split('*');
            return (
                <div className="space-y-6 lg:space-y-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <i className="fas fa-hand-pointer text-lg"></i>
                        </div>
                        <p className="font-bold text-gray-700 dark:text-gray-300 text-lg">{data.taskDescription || "Drag the words into the correct boxes"}</p>
                    </div>
                    <div className="leading-loose sm:leading-loose text-lg sm:text-xl p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] text-gray-800 dark:text-gray-200">
                        {parts.map((part: string, i: number) => {
                            if (i % 2 === 0) return <span key={i} className="px-1">{part}</span>;
                            return (
                                <span key={i} className="inline-block mx-2 sm:mx-3 px-4 py-2 sm:py-3 bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl min-w-[120px] text-center text-gray-400 dark:text-gray-500 shadow-inner align-middle transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                                    Drop here
                                </span>
                            );
                        })}
                    </div>
                    <div className="p-5 sm:p-6 bg-white dark:bg-gray-800/80 rounded-2xl flex flex-wrap gap-3 sm:gap-4 border border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-sm">
                        {parts.filter((_: any, i: number) => i % 2 !== 0).sort().map((word: string, i: number) => (
                            <div key={i} className="px-5 py-2 sm:py-3 bg-gradient-to-b from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] cursor-move font-bold text-gray-700 dark:text-gray-200 hover:shadow-[0_5px_15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-200 active:cursor-grabbing active:scale-95">
                                {word}
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'fill_blanks':
            const blankParts = (data.text || '').split('*');
            return (
                <div className="space-y-6 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fas fa-keyboard text-lg"></i>
                        </div>
                        <p className="font-bold text-gray-700 dark:text-gray-300 text-lg">Fill in the missing words</p>
                    </div>
                    <div className="leading-loose sm:leading-loose text-lg sm:text-xl p-8 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl text-gray-800 dark:text-gray-200">
                         {blankParts.map((part: string, i: number) => {
                            if (i % 2 === 0) return <span key={i} className="px-1">{part}</span>;
                            return (
                                <input 
                                    key={i} 
                                    type="text" 
                                    className="mx-2 px-3 py-1 border-b-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none bg-white dark:bg-gray-800 text-center min-w-[100px] text-indigo-700 dark:text-indigo-300 font-semibold rounded-t-md shadow-sm transition-all focus:bg-indigo-50 dark:focus:bg-indigo-900/20" 
                                    placeholder="..."
                                    readOnly={process.env.NODE_ENV !== 'development'}
                                />
                            );
                        })}
                    </div>
                </div>
            );

        case 'true_false':
            return (
                <div className="space-y-8 text-center p-8 sm:p-12 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"></div>
                    <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-2xl shadow-inner mb-6">
                        <i className="fas fa-balance-scale"></i>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white leading-tight">{data.question}</h3>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 pt-4">
                        <button className="flex-1 max-w-[200px] px-8 py-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-[0_8px_25px_rgba(16,185,129,0.2)] text-emerald-600 dark:text-emerald-400 font-bold text-xl transition-all duration-300 transform hover:-translate-y-1">
                            <i className="fas fa-check mr-2"></i> True
                        </button>
                        <button className="flex-1 max-w-[200px] px-8 py-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-2xl hover:border-rose-500 dark:hover:border-rose-400 hover:shadow-[0_8px_25px_rgba(244,63,94,0.2)] text-rose-600 dark:text-rose-400 font-bold text-xl transition-all duration-300 transform hover:-translate-y-1">
                            <i className="fas fa-times mr-2"></i> False
                        </button>
                    </div>
                </div>
            );

        case 'flashcards':
            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <i className="fas fa-layer-group text-2xl text-purple-500"></i>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Flashcards</h3>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full font-medium">{data.cards?.length || 0} Cards</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(data.cards || []).map((c: any, i: number) => (
                            <div key={i} className="group h-48 sm:h-56 cursor-pointer relative rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.1)] transition-all duration-500 overflow-hidden transform hover:-translate-y-2 perspective-1000">
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center transition-all duration-500 transform group-hover:-rotate-y-180 backface-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-700">
                                    {c.image && <img src={c.image} alt={c.front} className="w-16 h-16 object-cover rounded-full mb-3 shadow-md border-2 border-white dark:border-gray-700" />}
                                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white leading-tight">{c.front}</h3>
                                    <div className="absolute bottom-4 left-0 w-full text-center">
                                        <p className="text-gray-400 dark:text-gray-500 text-[10px] uppercase font-bold tracking-widest px-3 py-1 bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full inline-block">Hover to flip</p>
                                    </div>
                                </div>
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center transition-all duration-500 transform rotate-y-180 group-hover:rotate-y-0 backface-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-800/50">
                                    <p className="text-lg sm:text-xl font-medium text-purple-900 dark:text-purple-100 leading-relaxed overflow-y-auto w-full custom-scrollbar break-words">
                                        {c.back}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'dialog_cards':
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <i className="fas fa-comments text-2xl text-blue-500"></i>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Dialog Cards</h3>
                    </div>
                    <div className="flex overflow-x-auto gap-6 p-2 pb-8 snap-x custom-scrollbar">
                        {(data.cards || []).map((c: any, i: number) => (
                            <div key={i} className="min-w-[320px] bg-white dark:bg-gray-800 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center justify-center text-center space-y-6 snap-center shrink-0 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group">
                                <div className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{c.front}</div>
                                <button className="px-6 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors shadow-sm active:scale-95 flex items-center gap-2">
                                    <i className="fas fa-sync-alt group-hover:rotate-180 transition-transform duration-500"></i> Turn
                                </button>
                                <div className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 border-t border-dashed border-gray-200 dark:border-gray-700 w-full pt-6 font-medium">{c.back}</div>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'essay':
            return (
                <div className="space-y-6 sm:space-y-8 p-6 sm:p-8 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                            <i className="fas fa-pen-nib text-xl"></i>
                        </div>
                        <div>
                            <h3 className="text-xl sm:text-2xl font-extrabold text-gray-800 dark:text-white">Essay Task</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Write a comprehensive response</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-l-[6px] border-l-indigo-500 shadow-sm">
                        <p className="text-lg text-gray-700 dark:text-gray-200 font-medium italic">"{data.prompt}"</p>
                    </div>
                    <textarea 
                        className="w-full h-48 sm:h-64 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 outline-none resize-none bg-white dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 shadow-inner transition-colors duration-300 placeholder-gray-400 dark:placeholder-gray-500 text-lg leading-relaxed"
                        placeholder="Start writing your brilliant essay here..."
                        readOnly={process.env.NODE_ENV !== 'development'}
                    ></textarea>
                    {data.keywords && (
                        <div className="mt-4 p-5 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl flex flex-wrap items-center gap-3 border border-indigo-100 dark:border-indigo-800/50">
                            <div className="bg-indigo-600 dark:bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 flex items-center gap-2">
                                <i className="fas fa-key"></i> Keywords
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {data.keywords.map((kw: string, i: number) => (
                                    <span key={i} className="px-4 py-1.5 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg shadow-sm text-sm hover:-translate-y-0.5 transition-transform">
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );

        case 'speak_the_words':
            return (
                <div className="space-y-8 text-center p-8 sm:p-12 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-blue-100 dark:border-gray-700 shadow-xl overflow-hidden relative group">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000 pointer-events-none"></div>
                    <div className="relative z-10 space-y-8">
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-sm border border-white dark:border-gray-700 inline-block max-w-2xl mx-auto">
                            <p className="font-extrabold text-blue-900 dark:text-blue-100 text-2xl sm:text-3xl leading-tight">"{data.question}"</p>
                        </div>
                        <div className="relative inline-block mt-4 mb-2">
                            <div className="absolute inset-0 bg-blue-500 dark:bg-blue-600 rounded-full animate-ping opacity-30"></div>
                            <button className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-blue-500 to-indigo-600 border-[6px] border-white dark:border-gray-800 text-white rounded-full flex items-center justify-center text-4xl shadow-[0_10px_30px_rgba(59,130,246,0.5)] hover:shadow-[0_15px_40px_rgba(59,130,246,0.7)] hover:scale-110 active:scale-95 transition-all duration-300">
                                <i className="fas fa-microphone"></i>
                            </button>
                        </div>
                        <div className="mt-6 flex flex-col items-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-500 mb-2">Expected Pitch</span>
                            <p className="text-gray-600 dark:text-gray-300 font-medium text-lg max-w-lg mx-auto italic">"{data.expectedAnswer}"</p>
                        </div>
                    </div>
                </div>
            );

        case 'find_words':
            return (
                <div className="space-y-8 text-center p-6 sm:p-10 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-lg">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center text-2xl shadow-sm transform rotate-3">
                            <i className="fas fa-search"></i>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-wider">Word Search</h3>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 rounded-3xl shadow-[inset_0_5px_20px_rgba(0,0,0,0.05)] border-2 border-gray-100 dark:border-gray-700 overflow-x-auto custom-scrollbar flex justify-center">
                        <div className="inline-grid gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${data.gridSize || 10}, minmax(0, 1fr))` }}>
                            {Array.from({ length: (data.gridSize || 10) * (data.gridSize || 10) }).map((_, i) => (
                                <div key={i} className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl text-base sm:text-lg font-black text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/40 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-500 hover:scale-110 cursor-pointer transition-all duration-200 shadow-sm">
                                    {String.fromCharCode(65 + Math.floor(Math.random() * 26))}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-900 p-6 rounded-2xl border border-amber-100 dark:border-gray-700">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-500 mb-4 opacity-70">Words to find</h4>
                        <div className="flex flex-wrap justify-center gap-3">
                            {(data.wordList || []).map((word: string, i: number) => (
                                <span key={i} className="px-5 py-2.5 bg-white dark:bg-gray-800 border-2 border-amber-200 dark:border-gray-600 text-amber-700 dark:text-amber-400 font-extrabold rounded-xl shadow-[0_4px_10px_rgba(251,191,36,0.15)] hover:-translate-y-1 hover:shadow-lg transition-all">
                                    {word}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'mark_words':
            const markParts = (data.textField || '').split('*');
            return (
                <div className="space-y-6 sm:space-y-8 bg-white dark:bg-gray-800 p-6 sm:p-10 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl">
                    <div className="flex items-center gap-4 border-b-2 border-gray-100 dark:border-gray-700 pb-5">
                        <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-inner">
                            <i className="fas fa-highlighter text-xl"></i>
                        </div>
                        <p className="font-extrabold text-gray-800 dark:text-white text-xl sm:text-2xl">{data.taskDescription || 'Highlight the target words'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 sm:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[inset_0_2px_15px_rgba(0,0,0,0.02)]">
                        <p className="leading-loose sm:leading-[2.5] text-xl sm:text-2xl text-gray-700 dark:text-gray-300">
                            {markParts.map((part: string, i: number) => {
                                if (i % 2 === 0) return <span key={i} className="px-1">{part}</span>;
                                return (
                                    <span key={i} className="px-3 sm:px-4 py-1.5 sm:py-2 mx-1.5 bg-white dark:bg-gray-800 border-2 border-dashed border-teal-300 dark:border-teal-600 text-teal-700 dark:text-teal-400 font-bold rounded-xl cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/40 hover:border-solid hover:shadow-[0_4px_12px_rgba(20,184,166,0.2)] hover:-translate-y-0.5 active:bg-teal-200 dark:active:bg-teal-800 transition-all duration-200">
                                        {part}
                                    </span>
                                );
                            })}
                        </p>
                    </div>
                </div>
            );

        default:
            return (
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">🧩</div>
                    <h3 className="text-lg font-bold text-gray-700">Preview for {type}</h3>
                    <p className="text-gray-500 text-sm mb-4">Generic JSON Preview</p>
                    <pre className="text-left bg-gray-800 text-green-400 p-4 rounded-lg overflow-auto max-h-64 text-xs font-mono">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            );
    }
};

export default LiveLessonStudio;
