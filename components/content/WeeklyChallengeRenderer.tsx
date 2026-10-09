
import React, { FC, useState, useEffect, PropsWithChildren } from 'react';
import type { LearnerProfile, WeeklyChallengeOutput, WeeklyChallengeDialogueLine, WeeklyChallengeRolePlayTurn, WeekendReview, WeeklyChallengeReading, WeeklyChallengeFictionReading, WeeklyChallengeSection } from '../../types';
import ReadAloudButton from './ReadAloudButton';
import Button from '../ui/Button';
import GroupedVoiceOptions from '../ui/GroupedVoiceOptions';
import Spinner from '../ui/Spinner';
import { cleanTextForSpeech } from '../../utils/textFormatters';
import { handleSaveChallengeAsHtml, type LessonSettings } from '../../utils/htmlGenerator';

// --- Sub-Components for Rendering Each Challenge Type ---

const Instruction: FC<{ text: string }> = ({ text }) => (
    <p className="mb-3 text-sm italic text-gray-600 bg-gray-100 p-2 rounded-md">ℹ️ {text}</p>
);

const ReadingChallenge: FC<{ content: WeeklyChallengeReading }> = ({ content }) => (
    <>
        <Instruction text={content.instruction} />
        <p className="font-semibold text-sm mb-2 text-gray-500">Genre: {content.genre}</p>
        <div className="whitespace-pre-wrap p-3 border rounded-md bg-white">{content.text}</div>
        <h4 className="font-semibold mt-4 mb-2">Comprehension Questions:</h4>
        <ol className="list-decimal list-inside space-y-2">
            {content.questions.map((q, i) => <li key={i}>{q.question}</li>)}
        </ol>
        <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold">Show Answer Key</summary>
            <pre className="mt-1 bg-gray-100 p-2 rounded whitespace-pre-wrap font-sans">{content.answerKey}</pre>
        </details>
    </>
);

const FictionReadingChallenge: FC<{ content: WeeklyChallengeFictionReading }> = ({ content }) => (
    <>
        <Instruction text={content.instruction} />
        <p className="font-semibold text-sm mb-2 text-gray-500">Genre: {content.genre}</p>
        <div className="whitespace-pre-wrap p-3 border rounded-md bg-white">{content.text}</div>
        <h4 className="font-semibold mt-4 mb-2">True or False?</h4>
        <ol className="list-decimal list-inside space-y-2">
            {content.questions.map((q, i) => <li key={i}>{q.question}</li>)}
        </ol>
        <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold">Show Answer Key</summary>
            <pre className="mt-1 bg-gray-100 p-2 rounded whitespace-pre-wrap font-sans">{content.answerKey}</pre>
        </details>
    </>
);


const ListeningChallenge: FC<{ content: WeeklyChallengeOutput['listening']['content']; learner: LearnerProfile }> = ({ content, learner }) => {
    const [selectedVoice, setSelectedVoice] = useState<string>(learner.readAloudVoice || '');
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    
    useEffect(() => {
        const getVoices = () => {
            const voiceList = window.speechSynthesis.getVoices();
            setVoices(voiceList.filter(voice => voice.lang.startsWith('en-')));
        };
        getVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = getVoices;
        }
    }, []);

    return (
        <>
            <Instruction text={content.instruction} />
            <p className="font-semibold text-sm mb-2 text-gray-500">Genre: {content.genre}</p>
            <div className="flex items-center p-2 border rounded-md mb-4 bg-white">
                <div className="flex-grow">
                    <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="w-full p-2 border-gray-300 rounded-md bg-white text-black text-sm">
                        <option value="">Browser Default Voice</option>
                        <GroupedVoiceOptions voices={voices} />
                    </select>
                </div>
                <ReadAloudButton text={cleanTextForSpeech(content.text)} voiceURI={selectedVoice} />
            </div>
            <h4 className="font-semibold mt-4 mb-2">Comprehension Questions:</h4>
            <ol className="list-decimal list-inside space-y-2">
                {content.comprehensionQuestions.map((q, i) => <li key={i}>{q.question}</li>)}
            </ol>
            <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold">Show Answer Key</summary>
                <pre className="mt-1 bg-gray-100 p-2 rounded whitespace-pre-wrap font-sans">{content.answerKey}</pre>
            </details>
            <h4 className="font-semibold mt-4 mb-2">Speaking Practice:</h4>
            <div className="space-y-3">
                {content.speakingQuestions.map((q, i) => (
                    <div key={i} className="p-2 bg-gray-50 rounded border">
                        <p className="font-semibold">{q.question}</p>
                        <ul className="text-xs list-disc list-inside ml-4 mt-1 text-gray-600">
                            {q.requirements.map((item, j) => <li key={j}>Remember to: {item}</li>)}
                        </ul>
                    </div>
                ))}
            </div>
        </>
    );
};

const SpeakingChallenge: FC<{ content: { instruction: string } }> = ({ content }) => (
    <Instruction text={content.instruction} />
);

const WritingChallenge: FC<{ content: { instruction: string } }> = ({ content }) => (
    <Instruction text={content.instruction} />
);

const DialogueChallenge: FC<{ content: WeeklyChallengeOutput['dialogue']['content']; learnerName: string }> = ({ content, learnerName }) => {
    const renderLine = (line: WeeklyChallengeDialogueLine, index: number) => {
        const isLearner = line.character === learnerName || line.character === "You";
        return (
            <div key={index} className={`flex ${isLearner ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`rounded-lg px-3 py-2 max-w-xs lg:max-w-md ${isLearner ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'}`}>
                    <p className="font-bold text-sm mb-1">{line.character}</p>
                    <p className="text-sm">{line.line}</p>
                </div>
            </div>
        );
    };
    return (
        <>
            <Instruction text={content.instruction} />
            <h4 className="font-bold text-md mb-2 text-center">{content.title}</h4>
            <div className="border rounded-lg p-3 bg-white">{content.lines.map(renderLine)}</div>
        </>
    );
};

const RolePlayChallenge: FC<{ content: WeeklyChallengeOutput['rolePlay']['content'] }> = ({ content }) => (
    <>
        <Instruction text={content.instruction} />
        <h4 className="font-bold text-md mb-2">{content.title}</h4>
        <p className="text-sm italic p-2 bg-yellow-100 rounded-md mb-3">{content.scenario}</p>
        {content.turns.map((turn, index) => (
            <div key={index} className="mb-4">
                <p className="font-semibold text-gray-800">{turn.character}'s Turn:</p>
                <div className="mt-2 space-y-2 pl-4">
                    {turn.choices.map(choice => (
                        <div key={choice.option} className="p-2 border rounded-md bg-gray-50">
                            <span className="font-bold mr-2">{choice.option}:</span>
                            <span className="italic">"{choice.text}"</span>
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </>
);

const IntegratedActivityChallenge: FC<{ content: WeeklyChallengeOutput['integratedActivity']['content'] }> = ({ content }) => (
     <>
        <Instruction text={content.instruction} />
        <p><b>Search for:</b> {content.searchTopic}</p>
        <p><b>Find a:</b> {content.resourceDescription}</p>
        <p className="mt-2 p-3 bg-green-100 rounded-md"><b>Your Task:</b> {content.task}</p>
    </>
);

const WeekendReviewChallenge: FC<{ content: WeekendReview }> = ({ content }) => (
    <>
        <Instruction text={content.instruction} />
        <div className="mb-4">
            <h4 className="font-bold text-md mb-2">{content.productiveChallenge.title}</h4>
            <p>{content.productiveChallenge.description}</p>
        </div>
        <div>
             <h4 className="font-bold text-md mb-2 pt-4 border-t">Review Your Week</h4>
            <ol className="list-decimal list-inside space-y-4">
                {content.reviewQuestions.map((q, i) => (
                    <li key={i}>
                        <p className="font-semibold">Context: <span className="font-normal italic">{q.context}</span></p>
                        <p className="font-semibold">Question: <span className="font-normal">{q.question}</span></p>
                        <ul className="text-xs list-disc list-inside ml-4 mt-1 text-gray-600">
                            {q.checklist.map((item, j) => <li key={j}>Remember to use: {item}</li>)}
                        </ul>
                    </li>
                ))}
            </ol>
        </div>
    </>
);

const ChallengeAccordion: FC<PropsWithChildren<{
    title: string;
    day: string;
    time: string;
    color: string;
    isOpen: boolean;
    isToday: boolean;
    onToggle: () => void;
}>> = ({ title, day, time, isOpen, isToday, onToggle, children, color }) => (
    <div className={`bg-white rounded-lg shadow-md mb-4 transition-all ${isToday ? 'border-2 border-blue-500 ring-4 ring-blue-500/20' : ''}`} style={{ borderLeft: `5px solid ${color || '#ccc'}` }}>
        <button onClick={onToggle} className="w-full px-4 py-3 border-b border-gray-200 flex justify-between items-center text-left focus:outline-none focus:ring-2 focus:ring-blue-300">
            <div className="flex items-center">
                <div>
                    <h3 className="text-lg font-bold" style={{ color: color || '#111827' }}>{title}</h3>
                    <div className="text-xs text-gray-500 mt-1">
                        <span className="font-semibold">{day}</span> &bull; <span>{time}</span>
                    </div>
                </div>
                {isToday && <span className="ml-4 text-xs font-bold text-white bg-blue-500 px-2 py-1 rounded-full animate-pulse">TODAY</span>}
            </div>
            <i className={`fas fa-chevron-down text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
        </button>
        {isOpen && <div className="p-4 bg-white rounded-b-lg">{children}</div>}
    </div>
);


// --- Main Renderer Component ---

const WeeklyChallengeRenderer: FC<{ content: WeeklyChallengeOutput, learner: LearnerProfile, lessonSettings?: LessonSettings, onSaveToLibrary?: (type: string, title: string, htmlContent: string) => void }> = ({ content, learner, lessonSettings, onSaveToLibrary }) => {
    if (!content || Object.keys(content).length < 2) {
        return (
            <div className="mt-6 p-4 border rounded-md bg-yellow-50 text-yellow-800">
                <h3 className="font-bold">Weekly Challenge Content Not Available</h3>
                <p>The content for the weekly challenge could not be loaded or was malformed. Please try generating it again from the "New Lesson" tab.</p>
            </div>
        );
    }
    
    const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
    const [isSavingHtml, setIsSavingHtml] = useState(false);
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = daysOfWeek[new Date().getDay()];

    useEffect(() => {
        const initialOpenKeys = new Set<string>();
        Object.entries(content).forEach(([key, section]) => {
            if (key !== 'generatedAt' && section && typeof section === 'object' && 'dayOfWeek' in section && section.dayOfWeek === today) {
                initialOpenKeys.add(key);
            }
        });
        setOpenKeys(initialOpenKeys);
    }, [content, today]);

    const toggleSection = (key: string) => {
        setOpenKeys(prev => {
            const newSet = new Set(prev);
            newSet.has(key) ? newSet.delete(key) : newSet.add(key);
            return newSet;
        });
    };
    
    const handleSave = async (mode: 'presenter' | 'learner') => {
        setIsSavingHtml(true);
        try {
            const html = handleSaveChallengeAsHtml(content, learner, lessonSettings, mode);
            if (onSaveToLibrary) {
                onSaveToLibrary('WeeklyChallenge', `Weekly Challenge (${mode})`, html);
            } else {
                // Fallback to download
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const dateStr = new Date().toISOString().split('T')[0];
                const safeName = learner.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
                a.download = `${safeName}_WeeklyChallenge_${mode}_${dateStr}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error("Failed to save challenge as HTML:", e);
            alert("Sorry, there was an error while generating the HTML file.");
        } finally {
            setIsSavingHtml(false);
        }
    }

    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const sortedSections = Object.entries(content)
        .filter((entry): entry is [string, WeeklyChallengeSection<any>] => {
            const [key, value] = entry;
            return key !== 'generatedAt' && value != null && typeof value === 'object' && 'content' in value && 'dayOfWeek' in value;
        })
        .map(([key, data]) => ({ key, data }))
        .sort((a, b) => dayOrder.indexOf(a.data.dayOfWeek) - dayOrder.indexOf(b.data.dayOfWeek));

    const renderSection = (key: string, sectionData: any) => {
        const titleMap: { [key: string]: string } = {
            reading: 'Reading',
            fictionReading: 'Fictional Reading',
            listening: 'Listening',
            speaking: 'Speaking Practice',
            writing: 'Writing Practice',
            dialogue: 'Dialogue Practice',
            rolePlay: 'Role-Play Scenario',
            integratedActivity: 'Integrated Activity',
            weekendReview: 'Weekend Review & Challenge',
        };
        const title = titleMap[key] || "Challenge";
        
        let componentToRender;
        switch (key) {
            case 'reading': componentToRender = <ReadingChallenge content={sectionData.content} />; break;
            case 'fictionReading': componentToRender = <FictionReadingChallenge content={sectionData.content} />; break;
            case 'listening': componentToRender = <ListeningChallenge content={sectionData.content} learner={learner} />; break;
            case 'speaking': componentToRender = <SpeakingChallenge content={sectionData.content} />; break;
            case 'writing': componentToRender = <WritingChallenge content={sectionData.content} />; break;
            case 'dialogue': componentToRender = <DialogueChallenge content={sectionData.content} learnerName={learner.name} />; break;
            case 'rolePlay': componentToRender = <RolePlayChallenge content={sectionData.content} />; break;
            case 'integratedActivity': componentToRender = <IntegratedActivityChallenge content={sectionData.content} />; break;
            case 'weekendReview': componentToRender = <WeekendReviewChallenge content={sectionData.content} />; break;
            default: return null;
        }

        return (
             <ChallengeAccordion
                key={key}
                title={title}
                day={sectionData.dayOfWeek}
                time={sectionData.estimatedTime}
                color={sectionData.color}
                isOpen={openKeys.has(key)}
                isToday={sectionData.dayOfWeek === today}
                onToggle={() => toggleSection(key)}
            >
                {componentToRender}
            </ChallengeAccordion>
        );
    };
    
    return (
        <div className="mt-6">
             <div className='p-6 border border-gray-300 rounded-lg bg-gray-50 text-center'>
                <div className="py-10">
                    <i className="fas fa-calendar-check text-6xl text-indigo-200 mb-4"></i>
                    <h3 className="text-xl font-bold text-gray-700">Weekly Challenge Generated!</h3>
                    <p className="text-gray-500 mt-2">
                        7 days of gamified content ready for deployment.
                    </p>
                    
                    <div className="flex justify-center mt-6 space-x-4 flex-wrap gap-y-2">
                        <Button onClick={() => handleSave('presenter')} disabled={isSavingHtml} className="bg-teal-600 hover:bg-teal-700">
                            {isSavingHtml ? <Spinner/> : '⬇️ Save as Presenter HTML'}
                        </Button>
                        <Button onClick={() => handleSave('learner')} disabled={isSavingHtml} className="bg-indigo-600 hover:bg-indigo-700">
                            {isSavingHtml ? <Spinner/> : '⬇️ Save as Learner HTML'}
                        </Button>
                    </div>
                </div>

                <details className="mt-4">
                    <summary className="cursor-pointer text-blue-600 font-semibold hover:text-blue-800 select-none">
                        Show Content Preview
                    </summary>
                    <div className="mt-4 text-left border-t pt-4">
                        {sortedSections.map(({ key, data }) => renderSection(key, data))}
                    </div>
                </details>
            </div>
        </div>
    );
};

export default WeeklyChallengeRenderer;
