import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { LearnerProfile } from '../../types';

interface HtmlLiveEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialLearnerHtml: string;
    initialPresenterHtml: string;
    title: string;
    learner: LearnerProfile;
}

const HtmlLiveEditorModal: React.FC<HtmlLiveEditorModalProps> = ({
    isOpen,
    onClose,
    initialLearnerHtml,
    initialPresenterHtml,
    title,
    learner
}) => {
    const [activeView, setActiveView] = useState<'learner' | 'presenter'>('learner');
    
    // Maintain local edits
    const [learnerHtml, setLearnerHtml] = useState<string>('');
    const [presenterHtml, setPresenterHtml] = useState<string>('');
    const [renderedHtml, setRenderedHtml] = useState<string>('');
    const [isVisualMode, setIsVisualMode] = useState<boolean>(false);
    const [selectedTagName, setSelectedTagName] = useState<string>('');

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset local states to inputs when modal opens or files change
    useEffect(() => {
        if (isOpen) {
            const learnerVal = initialLearnerHtml || '<html><body><h3>No Learner HTML compiled.</h3></body></html>';
            const presenterVal = initialPresenterHtml || '<html><body><h3>No Presenter HTML compiled.</h3></body></html>';
            setLearnerHtml(learnerVal);
            setPresenterHtml(presenterVal);
            setRenderedHtml(activeView === 'learner' ? learnerVal : presenterVal);
            setIsVisualMode(false);
            setSelectedTagName('');
        }
    }, [isOpen, initialLearnerHtml, initialPresenterHtml]);

    // Track active code
    const activeCode = useMemo(() => {
        return activeView === 'learner' ? learnerHtml : presenterHtml;
    }, [activeView, learnerHtml, presenterHtml]);

    // Force sync when view changes
    useEffect(() => {
        setRenderedHtml(activeView === 'learner' ? learnerHtml : presenterHtml);
    }, [activeView]);

    // Debounce preview update when typing in raw code mode (only when visual editor is off!)
    useEffect(() => {
        if (isVisualMode) return;
        const timer = setTimeout(() => {
            setRenderedHtml(activeCode);
        }, 1200);
        return () => clearTimeout(timer);
    }, [activeCode, isVisualMode]);

    const handleCodeChange = (newVal: string, skipIframeSync = false) => {
        if (activeView === 'learner') {
            setLearnerHtml(newVal);
        } else {
            setPresenterHtml(newVal);
        }
        if (!skipIframeSync) {
            setRenderedHtml(newVal);
        }
    };

    const forceApplyPreview = () => {
        setRenderedHtml(activeCode);
    };

    const [isCopySuccess, setIsCopySuccess] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(activeCode);
            setIsCopySuccess(true);
            setTimeout(() => setIsCopySuccess(false), 2000);
        } catch (err) {
            console.error("Copy failed", err);
            alert("Could not copy code automatically.");
        }
    };

    const handleDownload = () => {
        const fileContent = activeCode;
        const cleanTitle = title.replace(/\s+/g, '_');
        const cleanName = learner.name.replace(/\s+/g, '_');
        const filename = `Enhanced_${activeView}_${cleanName}_${cleanTitle}.html`;

        import('../../utils/htmlLessonSaver').then(({ saveAndExportHtmlLesson }) => {
            saveAndExportHtmlLesson({
                htmlContent: fileContent,
                fileName: filename,
                learnerName: learner.name,
                type: title || 'Enhanced Lesson',
                title: filename,
                triggerDownload: true
            });
        }).catch(() => {
            const blob = new Blob([fileContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                try { document.body.removeChild(a); } catch(e) {}
                URL.revokeObjectURL(url);
            }, 1000);
        });
    };

    // Save directly back to the library server environment
    const handleSaveToLibrary = async () => {
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            // Re-point the filename mapping based on category/title
            let categoryName = title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '') || 'InteractiveLesson';
            let fileName = activeView === 'learner' ? 'learner.html' : 'presenter.html';

            if (title.toLowerCase().includes("challenge")) {
                categoryName = "GamifiedWeeklyChallenge";
            } else if (title.toLowerCase().includes("worksheet")) {
                categoryName = "PrintableWorksheet";
            } else if (title.toLowerCase().includes("learning app") || title.toLowerCase().includes("activity")) {
                categoryName = "LearningApp";
            }

            const { saveAndExportHtmlLesson } = await import('../../utils/htmlLessonSaver');
            await saveAndExportHtmlLesson({
                htmlContent: activeCode,
                fileName: `${categoryName}_${fileName}`,
                learnerName: learner.name,
                tutorName: 'Tutor',
                type: categoryName,
                title: `${categoryName} (${activeView})`,
                triggerDownload: false,
                toLibrary: true
            });

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            console.error(err);
            alert("Storage save error: " + (err.message || err));
        } finally {
            setIsSaving(false);
        }
    };

    // Advanced interactive eraser tools
    const applyCleanUp = (type: 'scripts' | 'images' | 'alerts' | 'reset') => {
        if (type === 'reset') {
            if (activeView === 'learner') {
                setLearnerHtml(initialLearnerHtml);
            } else {
                setPresenterHtml(initialPresenterHtml);
            }
            return;
        }

        let code = activeCode;
        if (type === 'scripts') {
            // Remove all script blocks
            code = code.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '<!-- [Tutor Removed JavaScript] -->');
        } else if (type === 'images') {
            // Replace <img ... /> with placeholder text
            code = code.replace(/<img\b[^>]*\/?>/gi, '<div style="padding: 10px; border: 1px dashed #ccc; text-align: center; font-size: 11px; color: #888;">[Tutor Strip Image Block]</div>');
        } else if (type === 'alerts') {
            // Insert gorgeous warning block in the top of the body
            const alertSnippet = `
            <div style="background-color: #fef2f2; border-left: 5px solid #ef4444; padding: 15px; margin: 15px 0; font-family: sans-serif; border-radius: 4px;">
                <h4 style="margin: 0 0 5px 0; color: #991b1b; font-size: 14px;">⚠️ MUTED LESSON CORRECTION NOTICE</h4>
                <p style="margin: 0; color: #b91c1c; font-size: 12px; line-height: 1.4;">Dear learner, please review this custom revised section diligently before attempting your homework guidelines.</p>
            </div>
            `;
            const bodyTag = /<body[^>]*>/i;
            if (bodyTag.test(code)) {
                code = code.replace(bodyTag, (match) => `${match}\n${alertSnippet}`);
            } else {
                code = `${alertSnippet}\n${code}`;
            }
        }

        handleCodeChange(code);
    };

    // IFrame load hook to inject editable design status
    const handleIframeLoad = () => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument) return;

        const doc = iframe.contentDocument;

        if (isVisualMode) {
            doc.designMode = "on";
            if (doc.body) {
                doc.body.contentEditable = "true";
            }

            // Sync visual iframe content Editable edits snappily back to parent state (without reloading iframe!)
            const syncState = () => {
                const allElements = doc.querySelectorAll('*');
                const outlines: any[] = [];
                // Temporarily clear active select outlines to avoid persisting outline styles
                allElements.forEach((el: any) => {
                    outlines.push({ el, val: el.style.outline });
                    el.style.outline = '';
                });

                const rawContent = doc.documentElement.outerHTML;

                // Restore active outlines back in iframe DOM
                outlines.forEach(item => {
                    item.el.style.outline = item.val;
                });

                // Update text buffers in background (passing true skips parent srcDoc refresh, preserving cursor!)
                handleCodeChange(rawContent, true);
            };

            const triggerEvents = ['input', 'keyup', 'blur', 'paste'];
            triggerEvents.forEach(evt => {
                doc.addEventListener(evt, syncState);
            });

            // Click element selection helper - matches DOM nodes directly back to raw textarea characters
            doc.addEventListener('click', (e: any) => {
                e.preventDefault();
                e.stopPropagation();

                const allElements = doc.querySelectorAll('*');
                allElements.forEach((el: any) => {
                    el.style.outline = '';
                });

                const clickedEl = e.target;
                if (clickedEl && clickedEl.tagName !== 'BODY' && clickedEl.tagName !== 'HTML') {
                    clickedEl.style.outline = '3px dashed #ef4444';
                    clickedEl.style.outlineOffset = '2px';
                    setSelectedTagName(clickedEl.tagName.toLowerCase());
                    (window as any)._workbenchSelectedElement = clickedEl;

                    // Code location highlighting logic
                    const tagType = clickedEl.tagName.toLowerCase();
                    const codeStr = activeView === 'learner' ? learnerHtml : presenterHtml;
                    let matchIndex = -1;
                    let matchLength = 0;

                    // Attempt 1: Search by ID
                    if (clickedEl.id) {
                        const idQuery1 = `id="${clickedEl.id}"`;
                        const idQuery2 = `id='${clickedEl.id}'`;
                        matchIndex = codeStr.indexOf(idQuery1);
                        if (matchIndex === -1) matchIndex = codeStr.indexOf(idQuery2);
                        if (matchIndex !== -1) {
                            const tagStart = codeStr.lastIndexOf('<', matchIndex);
                            const tagEnd = codeStr.indexOf('>', matchIndex);
                            if (tagStart !== -1 && tagEnd !== -1) {
                                matchIndex = tagStart;
                                matchLength = (tagEnd - tagStart) + 1;
                            }
                        }
                    }

                    // Attempt 2: Search by innerText
                    if (matchIndex === -1 && clickedEl.innerText && clickedEl.innerText.trim().length > 3) {
                        const cleanText = clickedEl.innerText.trim().substring(0, 40);
                        matchIndex = codeStr.indexOf(cleanText);
                        if (matchIndex !== -1) {
                            matchLength = cleanText.length;
                        }
                    }

                    // Attempt 3: Search by classname matcher
                    if (matchIndex === -1 && clickedEl.className) {
                        const firstClass = clickedEl.className.split(' ').filter(Boolean)[0];
                        if (firstClass) {
                            const classQuery = `<${tagType}[^>]*class=[^>]*${firstClass}`;
                            const regex = new RegExp(classQuery, 'i');
                            const matched = codeStr.match(regex);
                            if (matched && matched.index !== undefined) {
                                matchIndex = matched.index;
                                matchLength = matched[0].length;
                            }
                        }
                    }

                    // Attempt 4: Search by Tag name only
                    if (matchIndex === -1) {
                        const tagQuery = `<${tagType}`;
                        matchIndex = codeStr.indexOf(tagQuery);
                        if (matchIndex !== -1) {
                            matchLength = tagQuery.length;
                        }
                    }

                    // Perform textarea highlighting scroll
                    if (matchIndex !== -1 && textareaRef.current) {
                        const textarea = textareaRef.current;
                        textarea.focus();
                        textarea.setSelectionRange(matchIndex, matchIndex + matchLength);
                        
                        const linesBefore = textarea.value.slice(0, matchIndex).split('\n');
                        const lineIndex = linesBefore.length - 1;
                        const lineHeight = 18;
                        textarea.scrollTop = Math.max(0, (lineIndex - 5) * lineHeight);
                    }
                } else {
                    setSelectedTagName('');
                    (window as any)._workbenchSelectedElement = null;
                }
            });
        } else {
            doc.designMode = "off";
            if (doc.body) {
                doc.body.contentEditable = "false";
                const allElements = doc.querySelectorAll('*');
                allElements.forEach((el: any) => {
                    el.style.outline = '';
                });
            }
        }
    };

    // WYSIWYG rich text formatter action
    const triggerFormat = (command: string) => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument) return;
        iframe.contentDocument.execCommand(command, false);
        
        // Sync outer HTML change back to text buffers
        const rawContent = iframe.contentDocument.documentElement.outerHTML;
        handleCodeChange(rawContent, true);
    };

    // Direct remove selected component node
    const handleDeleteSelectedElement = () => {
        const target = (window as any)._workbenchSelectedElement;
        if (target) {
            target.remove();
            setSelectedTagName('');
            (window as any)._workbenchSelectedElement = null;

            const iframe = iframeRef.current;
            if (iframe && iframe.contentDocument) {
                const refreshedHtml = iframe.contentDocument.documentElement.outerHTML;
                handleCodeChange(refreshedHtml, true);
            }
        } else {
            alert("No tag selected! Click on any element (card, button, text, image block) inside the visual editor to select and delete it.");
        }
    };

    // Reload iframe when visual mode toggles or view swap
    useEffect(() => {
        const timer = setTimeout(() => {
            handleIframeLoad();
        }, 150);
        return () => clearTimeout(timer);
    }, [isVisualMode, activeView]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex flex-col p-4 md:p-6" id="html-editor-modal-container">
            {/* Header section with styling controls */}
            <div className="bg-slate-900 text-white rounded-t-xl border-t border-x border-slate-800 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="bg-red-500 w-3 h-3 rounded-full"></span>
                        <span className="bg-yellow-500 w-3 h-3 rounded-full"></span>
                        <span className="bg-green-500 w-3 h-3 rounded-full"></span>
                        <h2 className="font-black text-sm tracking-widest text-[#10b981] uppercase ml-2 flex items-center gap-1.5">
                            ⚡ TUTOMY ADVANCED HTML WORKBENCH & INLINE EDITOR
                        </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Editing resource templates: <strong className="text-white">{title}</strong> for student <strong className="text-white">{learner.name}</strong></p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* View mode toggle */}
                    <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveView('learner')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activeView === 'learner' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            🎓 Student File
                        </button>
                        <button
                            type="button"
                            disabled={!initialPresenterHtml}
                            onClick={() => setActiveView('presenter')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all disabled:opacity-30 ${activeView === 'presenter' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            👨‍🏫 Presenter Panel
                        </button>
                    </div>

                    <div className="flex gap-1.5 items-center ml-auto md:ml-0">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${isCopySuccess ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                        >
                            <i className={`fas ${isCopySuccess ? 'fa-check' : 'fa-clipboard'}`}></i>
                            {isCopySuccess ? 'Copied HTML!' : 'Copy Code'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-black p-2 rounded-lg text-xs flex items-center gap-1.5 transition-all"
                        >
                            <i className="fas fa-file-download"></i> Download Local
                        </button>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSaveToLibrary}
                            className={`p-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${saveSuccess ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 shadow-md hover:scale-[1.03] active:scale-[0.97]'}`}
                        >
                            <i className={isSaving ? "fas fa-spinner fa-spin" : saveSuccess ? "fas fa-check-circle" : "fas fa-cloud-upload-alt"}></i>
                            {isSaving ? 'Saving...' : saveSuccess ? '✓ Overwritten!' : '💾 Save & Overwrite'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white p-2 rounded-lg transition-all"
                        >
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Split Screen Workspace Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 bg-slate-950 border-x border-b border-slate-800 overflow-hidden">
                
                {/* Left Side: Code editor panel */}
                <div className="lg:col-span-6 flex flex-col border-r border-slate-800 h-full">
                    {/* Tiny utility toolbar */}
                    <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <i className="fas fa-code text-[#4ade80]"></i> RAW SOURCE CODE (MUTABLE)
                        </span>

                        <div className="flex gap-1.5 items-center">
                            <button
                                type="button"
                                onClick={forceApplyPreview}
                                title="Force re-compile code to live preview iframe"
                                className="px-2 py-0.5 text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white rounded font-extrabold transition-all border border-emerald-500 mr-2"
                            >
                                ⚡ Compile & Sync Preview
                            </button>
                            <button
                                type="button"
                                onClick={() => applyCleanUp('alerts')}
                                title="Add high-contrast color warning box"
                                className="px-2 py-0.5 text-[9px] bg-slate-800 text-red-400 hover:bg-red-950/40 rounded transition-all flex items-center gap-1 border border-red-900/50"
                            >
                                🔔 Add Notice
                            </button>
                            <button
                                type="button"
                                onClick={() => applyCleanUp('scripts')}
                                title="Remove active Javascript hooks"
                                className="px-2 py-0.5 text-[9px] bg-slate-800 text-amber-400 hover:bg-amber-950/40 rounded transition-all flex items-center gap-1 border border-amber-900/50"
                            >
                                ❌ Strip Scripts
                            </button>
                            <button
                                type="button"
                                onClick={() => applyCleanUp('images')}
                                title="Strip static graphic media references"
                                className="px-2 py-0.5 text-[9px] bg-slate-800 text-teal-400 hover:bg-teal-950/40 rounded transition-all flex items-center gap-1 border border-teal-900/50"
                            >
                                🖼️ Mute Media
                            </button>
                            <button
                                type="button"
                                onClick={() => applyCleanUp('reset')}
                                title="Discard edit buffer and reload original master output"
                                className="px-2 py-0.5 text-[9px] bg-slate-800 text-slate-400 hover:bg-slate-700 rounded transition-all font-mono"
                            >
                                🔄 Reset
                            </button>
                        </div>
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={activeCode}
                        onChange={(e) => handleCodeChange(e.target.value, true)}
                        className="flex-1 w-full p-4 bg-slate-900 text-slate-300 font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 selection:bg-slate-800"
                        placeholder="Insert HTML document code elements..."
                    />
                </div>

                {/* Right Side: Visual sandboxed preview */}
                <div className="lg:col-span-6 flex flex-col bg-slate-900 h-full">
                    <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            LIVE GRAPHIC SANDBOX PREVIEW
                        </span>
                        
                        {/* Interactive Visual Toggle Choice Mode */}
                        <button
                            type="button"
                            onClick={() => setIsVisualMode(!isVisualMode)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${isVisualMode ? 'bg-indigo-600 text-white shadow shadow-indigo-400/50' : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'}`}
                        >
                            <i className="fas fa-magic"></i>
                            {isVisualMode ? '🎨 Visual Editor: ACTIVE' : '⚙️ Visual Editor: INACTIVE'}
                        </button>
                    </div>

                    {/* Visual WYSIWYG Formatting and selection toolbar */}
                    {isVisualMode && (
                        <div className="bg-slate-850 border-b border-slate-800 p-2 flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex gap-1.5 items-center">
                                <button
                                    type="button"
                                    onClick={() => triggerFormat('bold')}
                                    title="Make text bold"
                                    className="p-1 px-3 bg-slate-800 text-slate-100 font-bold hover:bg-slate-700 rounded text-xs border border-slate-700"
                                >
                                    B
                                </button>
                                <button
                                    type="button"
                                    onClick={() => triggerFormat('italic')}
                                    title="Make text italic"
                                    className="p-1 px-3 bg-slate-800 text-slate-150 italic hover:bg-slate-700 rounded text-xs border border-slate-700"
                                >
                                    I
                                </button>
                                <button
                                    type="button"
                                    onClick={() => triggerFormat('underline')}
                                    title="Underline text"
                                    className="p-1 px-3 bg-slate-800 text-slate-200 underline hover:bg-slate-700 rounded text-xs border border-slate-700"
                                >
                                    U
                                </button>
                                <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">
                                    ✍️ Edit and type text directly in columns! Click tags to view source lines.
                                </span>
                            </div>

                            {/* Remove element block */}
                            <div className="flex items-center gap-1.5">
                                {selectedTagName && (
                                    <span className="text-[10px] font-mono bg-slate-900 text-rose-400 px-2 py-0.5 rounded border border-rose-950/40">
                                        Selected: &lt;{selectedTagName}&gt;
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={handleDeleteSelectedElement}
                                    title="Delete the currently selected component element from the HTML document structure"
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-all shadow-sm"
                                >
                                    <i className="fas fa-trash-alt text-[10px]"></i>
                                    Delete Block
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 bg-white relative">
                        <iframe
                            ref={iframeRef}
                            id="html-workbench-live-preview"
                            title="Tutory workbench HTML simulator frame"
                            srcDoc={renderedHtml}
                            onLoad={handleIframeLoad}
                            className="w-full h-full border-none"
                            referrerPolicy="no-referrer"
                            allow="microphone"
                        />
                    </div>
                </div>

            </div>

            {/* Hint message */}
            <div className="bg-slate-900 text-slate-500 text-[10px] text-center p-2 rounded-b-xl border-x border-b border-slate-800 font-medium">
                <i className="fas fa-info-circle mr-1"></i> Edit direct raw elements using the text area, or turn on Visual Editor to type directly inside screen columns. Changes are saved back to the lesson library immediately upon saving.
            </div>
        </div>
    );
};

export default HtmlLiveEditorModal;
