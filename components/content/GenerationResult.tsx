
import React, { FC, useEffect, useRef, useState } from 'react';
import type { LearnerProfile, LearningPackage, StructuredOutput, QuizOutput, PlatformProfile, LessonSettings, HomeworkOutput } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import SectionCard from './SectionCard';
import HtmlLiveEditorModal from './HtmlLiveEditorModal';
import { handleSaveAsHtml, generateStandardLessonHtml } from '../../utils/htmlGenerator';
import { saveLessonPlanAsHtml } from '../../utils/lessonPlanHtmlGenerator';
import { handleSaveEnglishLessonAsHtml, generateEnglishLessonHtml } from '../../utils/englishLessonHtmlGenerator';
import { handleSaveEnglishLessonV2AsHtml, generateEnglishLessonV2HtmlString } from '../../utils/englishLessonV2HtmlGenerator';
import { handleSaveHomeworkAsInteractiveHtml } from '../../utils/homeworkHtmlGenerator';
import { handleSaveQuizAsExamHtml } from '../../utils/quizHtmlGenerator';
import { formatLessonForPlatform } from '../../utils/textFormatters';
import { generateThemedHtmlPage, calculateSectionDates } from '../../utils/htmlGenerator';
import { getManualPrompt } from '../../utils/manualPrompts';
import { buildLessonFileName, getLessonFilePrefill } from '../../utils/lessonFileNaming';
// @ts-ignore
import JSZip from 'jszip';
import { injectMediaHtml, extractYoutubeId } from '../../utils/lessonMedia';

export { injectMediaHtml };

const GenerationResult: FC<{
    content: LearningPackage[keyof LearningPackage] | undefined;
    learner: LearnerProfile;
    learningPackage: LearningPackage | null;
    platforms: PlatformProfile[];
    title?: string;
    customSaveHandler?: () => void;
    onSaveToLibrary?: (type: string, title: string, html: string) => void;
    onSwitchToManualCreator?: (type: string) => void;
    lessonSettings?: LessonSettings;
    /**
     * The Step 1 content type this content was generated as (the package slot id). Authoritative
     * when present: it decides which engine renders the lesson, so one format can never be
     * rendered as another.
     */
    contentType?: string;
    sessionFiles?: Map<string, File>; 
    /**
     * This card is the lesson just rendered. When the tutor arrives from Lesson Settings the card
     * scrolls itself into view and pulses once, so a successful render is unmistakable instead of
     * leaving the page parked on an older lesson.
     */
    autoFocus?: boolean;
    /** Bumped on every arrival from Lesson Settings; re-runs the focus even for the same lesson. */
    focusSignal?: number;
}> = ({ content, learner, learningPackage, platforms, title, contentType, customSaveHandler, onSaveToLibrary, onSwitchToManualCreator, lessonSettings, sessionFiles, autoFocus, focusSignal }) => {

    /**
     * Which engine renders this content?
     *
     * The CONTENT TYPE is the authority — it is the format the tutor chose in Step 1 and the slot
     * the parsed JSON was saved into. The title is only a fallback, because title matching is a
     * substring guess: 'Daily English Lesson' contains 'English Lesson', so title-only dispatch
     * could hand a Daily Lesson to the Micro Lesson engine (and an Exam Prep to any other engine
     * whose name happens to appear in its title).
     */
    type RenderKind = 'micro-v2' | 'micro-v1' | 'sectioned' | 'homework' | 'quiz' | 'plan' | 'generic';
    const KIND_BY_CONTENT_TYPE: Record<string, RenderKind> = {
        englishLesson: 'micro-v1',
        englishLessonV2: 'micro-v2',
        explainerLesson: 'sectioned',
        examPrepLesson: 'sectioned',
        conversationalLesson: 'sectioned',
        bilingualStudyLesson: 'sectioned',
        homework: 'homework',
        quiz: 'quiz',
        lessonPlan: 'plan',
        forTeachers: 'plan',
        lessonGuide: 'plan',
        // Formats that carry their own saved HTML (they are rendered by their own screens, never by
        // the Micro Lesson engine). Listed explicitly so no future title can route one of them into
        // the wrong engine — the trap being '🚀 Daily English Lesson', whose title contains
        // 'English Lesson' and used to be rendered as a Micro Lesson.
        dailyLesson: 'generic',
        conversationGame: 'generic',
        placeGame: 'generic',
        partyMode: 'generic',
        studyGuide: 'generic',
        printableWorksheet: 'generic',
        weeklyChallenge: 'generic',
        slides: 'generic',
        simulations: 'generic',
        learningApp: 'generic',
        interactiveLesson: 'generic',
        avatarLesson: 'generic',
        avatarLessonV2: 'generic',
    };
    const renderKind: RenderKind = (contentType && KIND_BY_CONTENT_TYPE[contentType]) || (
        title && (title.includes('English Lesson V2') || title.includes('Micro Lesson V2')) ? 'micro-v2'
            : title && (title.includes('Bilingual') || title.includes('Explainer') || title.includes('Conversational') || title.includes('Exam Prep')) ? 'sectioned'
                : title && (title.includes('English Lesson') || title.includes('Micro Lesson')) ? 'micro-v1'
                    : title === 'Homework' ? 'homework'
                        : title === 'Quiz' ? 'quiz'
                            : 'generic'
    );

    const rootRef = useRef<HTMLDivElement | null>(null);
    const [focusPulse, setFocusPulse] = useState(false);

    useEffect(() => {
        if (!autoFocus || !focusSignal) return;
        const el = rootRef.current;
        if (!el) return;
        // One frame of grace so the tab switch paints first, then scroll and pulse.
        const scrollTimer = window.setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setFocusPulse(true);
            try { el.focus({ preventScroll: true }); } catch (e) { /* older engines: scrolling is enough */ }
        }, 140);
        // The class comes off after the animation has finished, so nothing is left lit up.
        const clearTimer = window.setTimeout(() => setFocusPulse(false), 3200);
        return () => {
            window.clearTimeout(scrollTimer);
            window.clearTimeout(clearTimer);
        };
    }, [autoFocus, focusSignal]);
    const [showAnswerKey, setShowAnswerKey] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [isPackaging, setIsPackaging] = useState(false);
    const [embeddedPreviewHtml, setEmbeddedPreviewHtml] = useState<string | null>(null);
    
    // HTML LIVE SPLIT-SCREEN WORKBENCH STATES
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorLearnerHtml, setEditorLearnerHtml] = useState('');
    const [editorPresenterHtml, setEditorPresenterHtml] = useState('');

    const handleOpenEditor = () => {
        let lHtml = "";
        let pHtml = "";
        
        const isModernSectioned = renderKind === 'micro-v1' || renderKind === 'sectioned';

        if (renderKind === 'micro-v2') {
            lHtml = generateEnglishLessonV2HtmlString(structuredContent, learner, lessonSettings, 'learner');
            pHtml = generateEnglishLessonV2HtmlString(structuredContent, learner, lessonSettings, 'presenter');
        } else if (isModernSectioned) {
            lHtml = generateEnglishLessonHtml(structuredContent, learningPackage, learner, lessonSettings, 'learner', false);
            pHtml = generateEnglishLessonHtml(structuredContent, learningPackage, learner, lessonSettings, 'presenter', false);
        } else if (isHomework) {
            lHtml = handleSaveHomeworkAsInteractiveHtml(structuredContent as HomeworkOutput, learner, lessonSettings);
            pHtml = lHtml; 
        } else if (isQuiz) {
            lHtml = generateStandardLessonHtml({ sections: (structuredContent as any).sections || [] }, learningPackage, learner, "Assessment", lessonSettings, 'learner', false);
            pHtml = generateStandardLessonHtml({ sections: (structuredContent as any).sections || [] }, learningPackage, learner, "Assessment", lessonSettings, 'presenter', false);
        } else {
            lHtml = generateStandardLessonHtml(structuredContent, learningPackage, learner, title || 'Generated_Content', lessonSettings, 'learner', false);
            pHtml = generateStandardLessonHtml(structuredContent, learningPackage, learner, title || 'Generated_Content', lessonSettings, 'presenter', false);
        }

        lHtml = injectMediaHtml(lHtml, lessonSettings);
        pHtml = injectMediaHtml(pHtml, lessonSettings);

        setEditorLearnerHtml(lHtml);
        setEditorPresenterHtml(pHtml);
        setIsEditorOpen(true);
    };
    
    const displayTitle = title || 'Generated Content';
    const isLesson = title && (title.includes('English Lesson') || title.includes('Micro Lesson') || title.includes('Explainer') || title.includes('Exam Prep') || title.includes('Conversational') || title.includes('Bilingual'));
    const isWorksheet = title && title.includes('Worksheet');

    const platformProfile = learningPackage?.platformId ? platforms.find(p => p.id === learningPackage.platformId) : null;

    if (!content || !learningPackage) {
        return (
            <Card className="mt-6 border-l-4 border-yellow-500">
                <h2 className="text-xl font-bold text-yellow-800">Content Not Generated</h2>
                <p className="text-gray-600 mt-2">Use the 'Generator' tab to create this content.</p>
            </Card>
        );
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopyStatus('copied');
            const timer = setTimeout(() => setCopyStatus('idle'), 2000);
            return () => clearTimeout(timer);
        }, (err) => {
            console.error('Failed to copy:', err);
            alert('Could not copy text to clipboard.');
        });
    };

    const copyTeacherGuidePrompt = () => {
        const promptText = getManualPrompt('lessonGuide', learner);
        navigator.clipboard.writeText(promptText).then(() => {
            alert("Prompt for Teacher Guide copied!\n\nPaste your previously generated lesson JSON first, then paste this prompt to generate your X5 Teacher Guide.");
            if (onSwitchToManualCreator) {
                onSwitchToManualCreator('lessonGuide');
            } else {
                alert("Please go to the 'New Lesson' tab and select 'Lesson Guide (Detailed)' from the Lesson Creator.");
            }
        });
    };

    if (typeof content === 'string') {
        const handleTranslate = () => {
            const langCode = (learner.l1Language || '').split(/[-_ ,]/)[0].toLowerCase();
            const url = `https://translate.google.com/?sl=en&tl=${langCode || 'auto'}&text=${encodeURIComponent(content)}&op=translate`;
            window.open(url, '_blank', 'noopener,noreferrer');
        };
        
        const isDocument = title === 'Lesson Plan' || title === 'Teacher Guide';

        return (
            <div className="mt-6">
                 <div className="flex justify-end mb-4 space-x-2">
                    <Button onClick={() => handleCopy(content)} className="bg-gray-600 hover:bg-gray-700 w-48 text-center">
                        {copyStatus === 'idle' ? '📋 Copy to Clipboard' : '✅ Copied!'}
                    </Button>
                     {!isDocument && (
                        <Button onClick={handleTranslate} className="bg-green-600 hover:bg-green-700">
                            🌐 Translate
                        </Button>
                     )}
                    {isDocument && (
                        <Button onClick={() => saveLessonPlanAsHtml(content, learner, title)} className="bg-teal-600 hover:bg-teal-700">
                            ⬇️ Save as HTML
                        </Button>
                    )}
                </div>
                <Card>
                    <div 
                        className="whitespace-pre-wrap font-sans text-gray-800"
                        dangerouslySetInnerHTML={{ __html: content }} 
                    />
                </Card>
            </div>
        );
    }
    
    // Type casting for structured content
    const structuredContent = content as any; 
    const isQuiz = renderKind === 'quiz' || title === 'Quiz';
    const isHomework = renderKind === 'homework' || title === 'Homework';

    if (typeof structuredContent !== 'object') {
        return (
            <Card className="mt-6 border-l-4 border-red-500">
                <h2 className="text-xl font-bold text-red-700">Content Display Error</h2>
                <p className="text-gray-600 mt-2">The content format is invalid.</p>
            </Card>
        );
    }
    
    const handleSaveToLibrary = async () => {
        if (!content) return;
        
        try {
            let htmlContent = "";
            const fileMeta = getLessonFilePrefill(learner);
            let fileName = buildLessonFileName({ learnerName: learner.name, lessonLabel: title || 'Content', ...fileMeta, audience: 'Learner' });

            // Generate HTML based on the RESOLVED render kind (content type first, title only as
            // a fallback) — never on a title substring guess.
            if (renderKind === 'micro-v2') {
                 const librarySettings = { ...(lessonSettings || {}), enableCollaboration: true };
                 htmlContent = generateEnglishLessonV2HtmlString(structuredContent, learner, librarySettings, 'learner');
            } else if (renderKind === 'micro-v1') {
                 // Clone settings and enable collaboration for library saves
                 const librarySettings = { ...(lessonSettings || {}), enableCollaboration: true };
                 htmlContent = generateEnglishLessonHtml(structuredContent, learningPackage, learner, librarySettings, 'learner', true);
            } else if (renderKind === 'sectioned') {
                 const librarySettings = { ...(lessonSettings || {}), enableCollaboration: true };
                 htmlContent = generateEnglishLessonHtml(structuredContent, learningPackage, learner, librarySettings, 'learner', true);
            } else if (typeof content === 'string') {
                htmlContent = content;
            } else {
                // Fallback for other types - just stringify for now or use a generic wrapper
                // Ideally we should have generators for all types returning strings
                htmlContent = `<html><body><pre>${JSON.stringify(content, null, 2)}</pre></body></html>`;
            }

            // Inject lesson images/videos from settings into the saved HTML
            htmlContent = injectMediaHtml(htmlContent, lessonSettings);

            if (onSaveToLibrary) {
                onSaveToLibrary(title || 'Content', title || 'Content', htmlContent);
                return;
            }

            const { saveAndExportHtmlLesson } = await import('../../utils/htmlLessonSaver');
            const result = await saveAndExportHtmlLesson({
                htmlContent: htmlContent,
                fileName: fileName,
                learnerName: learner.name,
                tutorName: 'Tutor',
                type: title || 'Content',
                title: `${title || 'Content'} for ${learner.name}`,
                triggerDownload: false,
                toLibrary: true
            });

            alert(`Saved to Library successfully!\nAccess at: ${result.url || fileName}`);
        } catch (e) {
            console.error(e);
            alert("Error saving content.");
        }
    };

    const handleSave = (mode: 'presenter' | 'learner' | 'preview') => {
        if (customSaveHandler) {
            customSaveHandler();
            return;
        } 
        
        let htmlString = "";
        
        if (renderKind === 'micro-v2') {
            if (mode === 'preview') {
                 htmlString = generateEnglishLessonV2HtmlString(structuredContent, learner, lessonSettings, 'presenter');
            } else {
                 handleSaveEnglishLessonV2AsHtml(structuredContent, learner, lessonSettings, mode as 'presenter' | 'learner', title || 'Micro Lesson V2');
                 return;
            }
        } else if (renderKind === 'micro-v1') {
            // Need the returning false to get the string, handleSaveEnglishLessonAsHtml usually triggers download directly 
            // So we'll get the HTML string manually if we need to preview
            if (mode === 'preview') {
                 htmlString = generateEnglishLessonHtml(structuredContent, learningPackage, learner, lessonSettings, 'presenter', false);
            } else {
                 handleSaveEnglishLessonAsHtml(structuredContent, learningPackage, learner, lessonSettings, mode, title || 'Micro Lesson');
                 return;
            }
        } else if (renderKind === 'sectioned') {
            // Conversational / Explainer / Exam Prep / Bilingual lessons are sectioned interactive
            // content — render them with the modern engine (rich activities), never the legacy raw
            // template that used to dump JSON.stringify content as visible text.
            if (mode === 'preview') {
                 htmlString = generateEnglishLessonHtml(structuredContent, learningPackage, learner, lessonSettings, 'presenter', false);
            } else {
                 handleSaveEnglishLessonAsHtml(structuredContent, learningPackage, learner, lessonSettings, mode, title || 'Micro Lesson');
                 return;
            }
        } else if (isHomework) {
            // Use dedicated Homework Saver
            htmlString = handleSaveHomeworkAsInteractiveHtml(structuredContent as HomeworkOutput, learner, lessonSettings);
            if (mode !== 'preview') {
                const blob = new Blob([htmlString], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = buildLessonFileName({ learnerName: learner.name, lessonLabel: 'Homework', ...getLessonFilePrefill(learner), audience: mode === 'presenter' ? 'Presenter' : 'Learner' });
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                return;
            }
        } else if (isQuiz) {
            // Use dedicated Quiz Saver
            if (mode === 'preview') {
                 // For preview, we need the HTML string. The quiz saver might download directly, let's check. 
                 // Wait, we can just use handleSaveAsHtml trick or generateStandardLessonHtml
                 htmlString = generateStandardLessonHtml({ sections: (structuredContent as any).sections || [] }, learningPackage, learner, "Assessment", lessonSettings, 'presenter', false);
            } else {
                 handleSaveQuizAsExamHtml(structuredContent as QuizOutput, learner, "Assessment");
                 return;
            }
        } else {
            if (mode === 'preview') {
                 htmlString = generateStandardLessonHtml(structuredContent, learningPackage, learner, title || 'Generated_Content', lessonSettings, 'presenter', false);
            } else {
                 handleSaveAsHtml(structuredContent, learningPackage, learner, title || 'Generated_Content', lessonSettings, mode);
                 return;
            }
        }

        if (mode === 'preview' && htmlString) {
            setEmbeddedPreviewHtml(injectMediaHtml(htmlString, lessonSettings));
        }
    }

    const handleSavePackage = async () => {
        setIsPackaging(true);
        try {
            const zip = new JSZip();
            const dateStr = new Date().toISOString().split('T')[0];
            const safeName = learner.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
            const safeTitle = (title || 'Lesson').replace(/\s+/g, '_');
            const rootFolderName = `${safeName}_${safeTitle}_Package_${dateStr}`;
            const rootFolder = zip.folder(rootFolderName);
            
            // 1. Add Attached Files
            if (lessonSettings?.attachedFiles && lessonSettings.attachedFiles.length > 0 && sessionFiles) {
                const filesFolder = rootFolder.folder("files");
                let filesAdded = 0;
                lessonSettings.attachedFiles.forEach(meta => {
                    const fileObj = sessionFiles.get(meta.id);
                    if (fileObj) {
                        filesFolder.file(meta.name, fileObj);
                        filesAdded++;
                    }
                });
            }

            // 2. Generate HTML with Relative Paths
            let htmlString = "";
            const filename = buildLessonFileName({ learnerName: learner.name, lessonLabel: title || 'Lesson', ...getLessonFilePrefill(learner), audience: 'Learner' });
            
            if (renderKind === 'micro-v2') {
                htmlString = generateEnglishLessonV2HtmlString(structuredContent, learner, lessonSettings, 'learner');
            } else if (renderKind === 'micro-v1') {
                htmlString = generateEnglishLessonHtml(structuredContent, learningPackage, learner, lessonSettings, 'learner', true);
            } else if (renderKind === 'sectioned') {
                htmlString = generateEnglishLessonHtml(structuredContent, learningPackage, learner, lessonSettings, 'learner', true);
            } else {
                // Fallback for other standard templates
                htmlString = generateStandardLessonHtml(structuredContent, learningPackage, learner, title || 'Generated_Content', lessonSettings, 'learner', true);
            }
            htmlString = injectMediaHtml(htmlString, lessonSettings);
            rootFolder.file(filename, htmlString);

            // 3. Generate Zip
            const zipContent = await zip.generateAsync({type:"blob"});
            const url = URL.createObjectURL(zipContent);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${rootFolderName}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (e) {
            console.error("Package creation failed", e);
            alert("Failed to create package.");
        } finally {
            setIsPackaging(false);
        }
    };

    const handleCopyToPlatform = () => {
        if (!platformProfile) return;
        const formattedText = formatLessonForPlatform(structuredContent, platformProfile.specifications.outputFormat);
        handleCopy(formattedText);
    };

    return (
        <div ref={rootRef} tabIndex={-1} className={`mt-6 outline-none ${focusPulse ? 'lesson-focus-pulse' : ''}`}>
            {focusPulse && (
                <div className="mb-2 flex items-center gap-2 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 animate-in">
                    <span className="text-base">✨</span>
                    <span>Just rendered — this is the lesson you just built.</span>
                </div>
            )}
            <style>{`
                /* A single inward pulse that fades itself out: the card rises, gets a ring, and settles. */
                @keyframes lesson-focus-pulse {
                    0%   { transform: translateY(10px); box-shadow: 0 0 0 0 rgba(99,102,241,0.55); }
                    25%  { transform: translateY(0);    box-shadow: 0 0 0 10px rgba(99,102,241,0.18); }
                    60%  { box-shadow: 0 0 0 16px rgba(99,102,241,0); }
                    100% { transform: translateY(0);    box-shadow: 0 0 0 0 rgba(99,102,241,0); }
                }
                .lesson-focus-pulse { animation: lesson-focus-pulse 2.6s cubic-bezier(0.4, 0, 0.2, 1) 1; border-radius: 16px; }
                @media (prefers-reduced-motion: reduce) {
                    .lesson-focus-pulse { animation: none; outline: 3px solid rgba(99,102,241,0.55); outline-offset: 4px; }
                }
            `}</style>
            <div className='p-6 border border-gray-300 rounded-lg bg-gray-50 text-center'>
                <div className="py-10">
                    <i className={`fas ${isQuiz ? 'fa-clipboard-list' : 'fa-file-code'} text-6xl text-blue-200 mb-4`}></i>
                    <h3 className="text-xl font-bold text-gray-700">{displayTitle} Generated Successfully!</h3>
                    {structuredContent?.generatedAt && (
                        <p className="text-sm text-gray-500 mt-1 font-mono">Generated: {new Date(structuredContent.generatedAt).toLocaleString()}</p>
                    )}
                    
                    <div className="flex justify-center mt-6 space-x-4 flex-wrap gap-y-2">
                         {isQuiz && structuredContent.answerKey && (
                            <Button onClick={() => setShowAnswerKey(!showAnswerKey)} className="bg-yellow-500 hover:bg-yellow-600">
                                {showAnswerKey ? '🙈 Hide' : '🔑 Show'} Answer Key
                            </Button>
                        )}
                        {platformProfile && (
                             <Button onClick={handleCopyToPlatform} className="bg-purple-600 hover:bg-purple-700">
                                {copyStatus === 'idle' ? `📋 Copy for ${platformProfile.name}` : '✅ Copied!'}
                            </Button>
                        )}
                        
                        <Button onClick={handleSaveToLibrary} className="bg-blue-600 hover:bg-blue-700">
                            <i className="fas fa-cloud-upload-alt mr-2"></i> Save to Library
                        </Button>
                        <Button onClick={handleOpenEditor} className="bg-emerald-600 hover:bg-emerald-700 font-black">
                            ✏️ Open in HTML Editor
                        </Button>

                        {/* Modified Save Buttons Logic */}
                        {isHomework ? (
                            <Button onClick={() => handleSave('learner')} className="bg-indigo-600 hover:bg-indigo-700">
                                ⬇️ Save Interactive Homework
                            </Button>
                        ) : isQuiz ? (
                             <Button onClick={() => handleSave('learner')} className="bg-red-600 hover:bg-red-700">
                                ⬇️ Save Secure Exam
                            </Button>
                        ) : (
                            <>
                                <Button onClick={() => handleSave('presenter')} className="bg-teal-600 hover:bg-teal-700">
                                    ⬇️ Save as Presenter HTML
                                </Button>
                                <Button onClick={() => handleSave('learner')} className="bg-indigo-600 hover:bg-indigo-700">
                                    ⬇️ Save as Learner HTML
                                </Button>
                            </>
                        )}
                    </div>
                    {isLesson && (
                        <div className="flex justify-center mt-4 space-x-4">
                            <Button onClick={handleSavePackage} disabled={isPackaging} className="bg-orange-600 hover:bg-orange-700 w-full max-w-md">
                                {isPackaging ? <><i className="fas fa-spinner fa-spin mr-2"></i> Packaging...</> : '📦 Save as Package (ZIP)'}
                            </Button>
                            <Button onClick={copyTeacherGuidePrompt} className="bg-purple-600 hover:bg-purple-700 w-full max-w-xs shrink-0 whitespace-nowrap">
                                👩‍🏫 Teacher Guide
                            </Button>
                        </div>
                    )}
                </div>
                
                {isQuiz && showAnswerKey && (
                    <div className="text-left mt-4">
                        <Card className="mb-6 border-l-4 border-yellow-400">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">🔑 Answer Key</h3>
                            <pre className="whitespace-pre-wrap font-sans text-gray-700 bg-yellow-50 p-3 rounded">{structuredContent.answerKey}</pre>
                        </Card>
                    </div>
                )}

                <details className="mt-4">
                    <summary className="cursor-pointer text-blue-600 font-semibold hover:text-blue-800 select-none">
                        Show Content Preview (Raw)
                    </summary>
                    <div className="mt-4 text-left border-t pt-4">
                        {/* Only show section cards if it's the standard structured content */}
                        {structuredContent.sections && structuredContent.sections.map((section: any, index: number) => (
                            <SectionCard key={index} section={section} learner={learner} isQuiz={isQuiz} isLesson={isLesson || isWorksheet} />
                        ))}
                        {/* Render lessonImages and lessonVideos from settings */}
                        {lessonSettings?.lessonImages && lessonSettings.lessonImages.length > 0 && (
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {lessonSettings.lessonImages.map((img, idx) => (
                                    <div key={idx} className="bg-white border rounded-lg p-3">
                                        <img src={img.url} alt={img.caption} className="w-full rounded-lg" style={{ maxHeight: 300, objectFit: 'cover' }} />
                                        {img.caption && <p className="text-xs text-gray-500 mt-2 text-center italic">{img.caption}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {lessonSettings?.lessonVideos && lessonSettings.lessonVideos.length > 0 && (
                            <div className="mt-6 space-y-4">
                                {lessonSettings.lessonVideos.map((video, idx) => (
                                    <div key={idx} className="bg-white border rounded-lg p-3">
                                        <div className="aspect-video">
                                            <iframe 
                                                src={`https://www.youtube.com/embed/${extractYoutubeId(video.url)}`} 
                                                className="w-full h-full rounded-lg" 
                                                allowFullScreen
                                                title={video.caption || 'Lesson video'}
                                            />
                                        </div>
                                        {video.caption && <p className="text-xs text-gray-500 mt-2 text-center italic">{video.caption}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Unified Add Media studio items (section-targeted) */}
                        {lessonSettings?.lessonMedia && lessonSettings.lessonMedia.length > 0 && (
                            <div className="mt-6">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">🎨 Media Studio Items (injected into lesson sections)</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {lessonSettings.lessonMedia.map(m => (
                                        <div key={m.id} className="bg-white border rounded-lg p-2">
                                            {(m.type === 'image' || m.type === 'gif') ? (
                                                <img src={m.url} alt={m.caption || ''} className="w-full rounded-lg" style={{ maxHeight: 150, objectFit: 'cover' }}
                                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                            ) : (
                                                <div className="w-full rounded-lg bg-slate-100 flex items-center justify-center text-2xl" style={{ height: 90 }}>
                                                    {m.type === 'youtube' ? '▶️' : m.type === 'vimeo' ? '🎞️' : m.type === 'audio' ? '🎧' : m.type === 'podcast' ? '🎙️' : '🔗'}
                                                </div>
                                            )}
                                            <p className="text-[10px] text-gray-600 mt-1.5 truncate" title={m.caption || m.url}>{m.caption || m.url}</p>
                                            {m.targetSection !== undefined && m.targetSection !== '' && (
                                                <p className="text-[9px] font-bold text-indigo-500 truncate">📍 Section: {m.targetSection}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* If it's homework, we might rely on HomeworkRenderer elsewhere, but this is a Raw dump area */}
                        {isHomework && <pre className="bg-gray-100 p-4 text-xs overflow-auto">{JSON.stringify(structuredContent, null, 2)}</pre>}
                    </div>
                </details>

                {embeddedPreviewHtml && (
                    <div id="embedded-viewer-container" className="mt-6 border-2 border-indigo-500 rounded-xl overflow-hidden shadow-2xl relative bg-gray-900" style={{ height: '800px' }}>
                        <div className="bg-indigo-600 text-white p-2 flex justify-between items-center">
                            <span className="font-bold"><i className="fas fa-book-open"></i> Embedded Lesson Viewer</span>
                            <div>
                                <button onClick={() => {
                                    const viewer = document.getElementById('embedded-viewer-container');
                                    if (viewer) {
                                        if (document.fullscreenElement) {
                                            document.exitFullscreen();
                                        } else {
                                            viewer.requestFullscreen().catch(err => console.error(err));
                                        }
                                    }
                                }} className="hover:bg-indigo-700 px-3 py-1 rounded mr-2">🗖 Maximize</button>
                                <button onClick={() => setEmbeddedPreviewHtml(null)} className="hover:bg-indigo-700 px-3 py-1 rounded">✖ Close Viewer</button>
                            </div>
                        </div>
                        <iframe 
                            srcDoc={embeddedPreviewHtml} 
                            className="w-full h-full bg-white border-none"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads" 
                            allow="microphone"
                        />
                    </div>
                )}
            </div>

            <HtmlLiveEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                initialLearnerHtml={editorLearnerHtml}
                initialPresenterHtml={editorPresenterHtml}
                title={title || 'Generated Resource'}
                learner={learner}
            />
        </div>
    );
};

export default GenerationResult;
