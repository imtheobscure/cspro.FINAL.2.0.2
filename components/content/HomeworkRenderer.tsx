
import React, { FC, useState } from 'react';
import type { LearnerProfile, LearningPackage, HomeworkOutput, PlatformProfile } from '../../types';
import Button from '../ui/Button';
import ReadAloudButton from './ReadAloudButton';
import HtmlLiveEditorModal from './HtmlLiveEditorModal';
import { cleanTextForSpeech, formatHomeworkForPlatform } from '../../utils/textFormatters';
import { handleSaveHomeworkAsInteractiveHtml } from '../../utils/homeworkHtmlGenerator';
import type { LessonSettings } from '../../utils/htmlGenerator';

const HomeworkRenderer: FC<{
    content: HomeworkOutput;
    learner: LearnerProfile;
    learningPackage: LearningPackage | null;
    platforms: PlatformProfile[];
    lessonSettings?: LessonSettings; 
    onSaveToLibrary?: (type: string, title: string, htmlContent: string) => void;
}> = ({ content, learner, learningPackage, platforms, lessonSettings, onSaveToLibrary }) => {

    const [showAnswerKey, setShowAnswerKey] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorCode, setEditorCode] = useState('');

    const handleOpenEditor = () => {
        const html = handleSaveHomeworkAsInteractiveHtml(content, learner, lessonSettings);
        setEditorCode(html);
        setIsEditorOpen(true);
    };

    const markerStrippingRegex = /^(?:\*|-|•|\d+\.|\w\)[.)]?)\s*/;
    
    const platformProfile = learningPackage?.platformId ? platforms.find(p => p.id === learningPackage.platformId) : null;

    const handleSave = () => {
        try {
            const html = handleSaveHomeworkAsInteractiveHtml(content, learner, lessonSettings); 
            if (onSaveToLibrary) {
                onSaveToLibrary('Homework', 'Interactive Homework', html);
            } else {
                // Fallback to download if no save handler provided
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const dateStr = new Date().toISOString().split('T')[0];
                const safeName = learner.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
                a.download = `Homework_${safeName}_${dateStr}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error("Failed to save homework as HTML:", e);
            alert("Sorry, there was an error while generating the HTML file.");
        }
    }

    const handleCopyToPlatform = () => {
        if (!platformProfile) return;
        const formattedText = formatHomeworkForPlatform(content, platformProfile.specifications.outputFormat);
        navigator.clipboard.writeText(formattedText).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    // Render a list from a newline-separated string
    const renderList = (items: string, type: 'ol' | 'ul' = 'ol') => {
        const listItems = items.split('\n').filter(item => item.trim());
        const ListTag = type;
        const listStyle = type === 'ol' ? 'list-decimal' : 'list-disc';
        return (
            <ListTag className={`${listStyle} list-inside space-y-1`}>
                {listItems.map((item, index) => <li key={index}>{item.replace(markerStrippingRegex, '')}</li>)}
            </ListTag>
        );
    };

    const renderQuestionsWithAnswers = (questions: { question: string, answer: string }[]) => (
        <>
            <p className="text-sm italic text-gray-600 my-2">Instruction: Answer the questions first, then click "Show Answer" to check your work. Note down any problems to discuss in class.</p>
            <ol className="list-decimal list-inside space-y-3">
                {questions.map((q, i) => (
                    <li key={i}>
                        <p className="inline">{q.question}</p>
                        <details className="text-sm mt-1">
                            <summary className="cursor-pointer font-medium text-gray-500 hover:text-gray-700">Show Answer</summary>
                            <p className="mt-1 p-2 bg-gray-100 rounded">{q.answer}</p>
                        </details>
                    </li>
                ))}
            </ol>
        </>
    );

    const Section: FC<React.PropsWithChildren<{ title: string; color: string; icon: string }>> = ({ title, color, icon, children }) => (
        <div className="mb-8 p-6 rounded-lg shadow-lg bg-white" style={{ borderLeft: `5px solid ${color}` }}>
            <h2 className="text-2xl font-bold mb-4 flex items-center" style={{ color }}>
                <i className={`fas ${icon} mr-3`}></i>
                {title}
            </h2>
            <div className="space-y-6">
                {children}
            </div>
        </div>
    );

    const Task: FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
        <div className="pt-4 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
            {children}
        </div>
    );

    return (
        <div className="mt-6">
             <div className='p-6 border border-gray-300 rounded-lg bg-gray-50 text-center'>
                <div className="py-10">
                    <i className="fas fa-book-open text-6xl text-blue-200 mb-4"></i>
                    <h3 className="text-xl font-bold text-gray-700">Homework Generated Successfully!</h3>
                    {content?.generatedAt && (
                        <p className="text-sm text-gray-500 mt-1 font-mono">Generated: {new Date((content as any).generatedAt).toLocaleString()}</p>
                    )}
                    <p className="text-gray-500 mt-2">
                        Comprehensive homework package with Reading, Listening, and more.
                        <br/>
                        Save the HTML file to share with your student.
                    </p>
                    
                    <div className="flex justify-center mt-6 space-x-4 flex-wrap gap-y-2">
                        {onSaveToLibrary && (
                            <Button onClick={() => {
                                const html = handleSaveHomeworkAsInteractiveHtml(content, learner, lessonSettings);
                                onSaveToLibrary('Homework', 'Interactive Homework', html);
                            }} className="bg-blue-600 hover:bg-blue-700">
                                💾 Save to Library
                            </Button>
                        )}
                        <Button onClick={handleOpenEditor} className="bg-emerald-600 hover:bg-emerald-700 font-black">
                            ✏️ Open in HTML Editor
                        </Button>
                        <Button onClick={() => {
                            const html = handleSaveHomeworkAsInteractiveHtml(content, learner, lessonSettings);
                            const blob = new Blob([html], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Homework_${learner.name}_${Date.now()}.html`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }} className="bg-indigo-600 hover:bg-indigo-700">
                            ⬇️ Save Interactive Homework
                        </Button>
                        <Button onClick={() => setShowAnswerKey(!showAnswerKey)} className="bg-yellow-500 hover:bg-yellow-600">
                            {showAnswerKey ? '🙈 Hide' : '🔑 Show'} Answer Key
                        </Button>
                        {platformProfile && (
                             <Button onClick={handleCopyToPlatform} className="bg-purple-600 hover:bg-purple-700">
                                {copyStatus === 'idle' ? `📋 Copy for ${platformProfile.name}` : '✅ Copied!'}
                            </Button>
                        )}
                    </div>
                </div>

                {showAnswerKey && (
                    <div className="text-left mt-4">
                        <Section title="Answer Key" color="#f59e0b" icon="fa-key">
                            <pre className="whitespace-pre-wrap font-sans text-gray-700 bg-yellow-50 p-4 rounded-md">{content.answerKey}</pre>
                        </Section>
                    </div>
                )}

                <details className="mt-4">
                    <summary className="cursor-pointer text-blue-600 font-semibold hover:text-blue-800 select-none">
                        Show Content Preview
                    </summary>
                    <div className="mt-4 text-left border-t pt-4">
                        <Section title={content.reading.title} color="#2563eb" icon="fa-book-open">
                            {content.reading.tasks.map((task, index) => (
                                <Task key={index} title={task.title}>
                                    <div className="p-4 bg-gray-50 border rounded-md mb-2 prose max-w-none" dangerouslySetInnerHTML={{__html: task.text}} />
                                    <h4 className="font-semibold mt-3 mb-1">Questions:</h4>
                                    {renderQuestionsWithAnswers(task.questions)}
                                </Task>
                            ))}
                        </Section>
                        {/* ... Rest of sections rendered as before ... */}
                        <div className="p-4 bg-gray-50 text-sm">
                            (Full preview hidden for brevity. Download file to see interactive elements.)
                        </div>
                    </div>
                </details>
            </div>

            <HtmlLiveEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                initialLearnerHtml={editorCode}
                initialPresenterHtml={editorCode}
                title="Homework Package"
                learner={learner}
            />
        </div>
    );
};

export default HomeworkRenderer;
