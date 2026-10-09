import React, { useState, useMemo } from 'react';
import Modal from '../../Modal';
import { Learner } from '../../../../types2';
import { format } from 'date-fns';
import JSZip from 'jszip';

const downloadZipPackage = async (learner: Learner, currentContent: any, targetFilesList: any[]) => {
    if (!currentContent) return;
    const zip = new JSZip();
    
    // Add text guidelines overview (clean, stripped of raw **)
    const textOverview = `========================================
📚 TOPIC: ${learner.currentLessonSettings?.lessonName || 'Comprehensive Topic Class'}
========================================
📅 TARGET DEADLINE: ${learner.currentLessonSettings?.nextClassDate ? format(new Date(learner.currentLessonSettings.nextClassDate), 'PPPP') : 'Flexible'}

💬 TEACHER GUIDELINES & NOTES:
${(learner.currentLessonSettings?.teacherNotes || '').replace(/\*\*/g, '')}

📝 HOMEWORK:
${Array.isArray(learner.currentLessonSettings?.homeworkChecklist) 
    ? (learner.currentLessonSettings.homeworkChecklist || []).join('\n') 
    : (learner.currentLessonSettings?.homeworkChecklist || '')}

🔗 MATERIAL RESOURCES:
${Array.isArray(learner.currentLessonSettings?.materialLinks) 
    ? (learner.currentLessonSettings.materialLinks || []).join('\n') 
    : (learner.currentLessonSettings?.materialLinks || '')}
`;
    zip.file("ReadMe_Guidelines.txt", textOverview);

    // Add selected HTML/materials to zip
    targetFilesList.forEach(file => {
        if (file.id.startsWith('lesson_')) {
            const key = file.id.replace('lesson_', '');
            const content = currentContent.generatedLessons?.[key];
            if (content) {
                zip.file(`lessons/${key}.html`, content);
            }
        } else if (file.id === 'learning_app') {
            if (currentContent.learningApp) zip.file("Interactive_Learning_App.html", currentContent.learningApp);
        } else if (file.id === 'printable_worksheet') {
            if (currentContent.printableWorksheet) zip.file("Printable_Worksheets.html", currentContent.printableWorksheet);
        } else if (file.id === 'simulations') {
            if (currentContent.simulations) zip.file("3D_Simulations.html", currentContent.simulations);
        } else if (file.id === 'study_guide') {
            if (currentContent.studyGuide) zip.file("Study_Guide.html", currentContent.studyGuide);
        } else if (file.id === 'slide_package') {
            if (currentContent.slidePackage) zip.file("Slide_Presentation.html", currentContent.slidePackage);
        } else if (file.id === 'daily_lesson') {
            if (currentContent.dailyLesson) zip.file("Daily_Lesson_Plan.html", currentContent.dailyLesson);
        }
    });

    const contentBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(contentBlob);
    const lessonCleanName = (learner.currentLessonSettings?.lessonName || 'lesson-materials').replace(/[^a-zA-Z0-9]/g, '-');
    link.download = `${learner.name}-${lessonCleanName}-bundle.zip`;
    link.click();
};

interface SendSavedLessonModalProps {
    isOpen: boolean;
    onClose: () => void;
    learner: Learner;
    currentContent: any;
}

const SendSavedLessonModal: React.FC<SendSavedLessonModalProps> = ({ isOpen, onClose, learner, currentContent }) => {
    const lessonSettings = learner.currentLessonSettings;

    // 1. Identify all available packages from currentContent
    const availableFiles = useMemo(() => {
        const files: { id: string; name: string; type: string; icon: string }[] = [];
        if (!currentContent) return files;

        if (currentContent.generatedLessons) {
            Object.keys(currentContent.generatedLessons).forEach(key => {
                files.push({
                    id: `lesson_${key}`,
                    name: `Lesson Package: ${key.replace(/([A-Z])/g, ' $1').trim()}`,
                    type: 'HTML / Asset Package',
                    icon: 'fa-file-code'
                });
            });
        }
        if (currentContent.learningApp) {
            files.push({
                id: 'learning_app',
                name: 'Interactive Learning Application (Single HTML App)',
                type: 'HTML Package',
                icon: 'fa-laptop-code'
            });
        }
        if (currentContent.printableWorksheet) {
            files.push({
                id: 'printable_worksheet',
                name: 'Printable Worksheets & Study Companion',
                type: 'PDF / Printable Doc',
                icon: 'fa-print'
            });
        }
        if (currentContent.simulations) {
            files.push({
                id: 'simulations',
                name: '3D Simulations & Immersive Interactive Arena',
                type: 'HTML Application Widget',
                icon: 'fa-cube'
            });
        }
        if (currentContent.studyGuide) {
            files.push({
                id: 'study_guide',
                name: 'Comprehensive Study Guide & Revision Slides',
                type: 'PDF document',
                icon: 'fa-book-open'
            });
        }
        if (currentContent.slidePackage) {
            files.push({
                id: 'slide_package',
                name: 'Interactive Slide Presentation Deck',
                type: 'Slides package',
                icon: 'fa-play-circle'
            });
        }
        if (currentContent.dailyLesson) {
            files.push({
                id: 'daily_lesson',
                name: 'Daily Lesson Plan Tracker & Calendar Tasks',
                type: 'HTML Module',
                icon: 'fa-tasks'
            });
        }

        return files;
    }, [currentContent]);

    // Track selected files to send
    const [selectedFileIds, setSelectedFileIds] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        availableFiles.forEach(f => {
            initial[f.id] = true; // Default all check-marked
        });
        return initial;
    });

    const [isCopySuccess, setIsCopySuccess] = useState(false);

    const handleToggleFile = (id: string) => {
        setSelectedFileIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const targetFilesList = useMemo(() => {
        return availableFiles.filter(f => selectedFileIds[f.id]);
    }, [availableFiles, selectedFileIds]);

    const safeHomework = useMemo(() => {
        if (!lessonSettings?.homeworkChecklist) return [];
        if (Array.isArray(lessonSettings.homeworkChecklist)) return lessonSettings.homeworkChecklist;
        if (typeof lessonSettings.homeworkChecklist === 'string') {
            const text = lessonSettings.homeworkChecklist.trim();
            if (!text) return [];
            return text.split('\n').map((line: string) => line.replace(/^[-*•]?\s*/, '').trim()).filter(Boolean);
        }
        return [];
    }, [lessonSettings?.homeworkChecklist]);

    const safeMaterials = useMemo(() => {
        if (!lessonSettings?.materialLinks) return [];
        if (Array.isArray(lessonSettings.materialLinks)) return lessonSettings.materialLinks;
        if (typeof lessonSettings.materialLinks === 'string') {
            const text = lessonSettings.materialLinks.trim();
            if (!text) return [];
            return text.split('\n').map((line: string) => line.trim()).filter(Boolean);
        }
        return [];
    }, [lessonSettings?.materialLinks]);

    // Build visual email HTML with beautiful styling and full information
    const generatedHtml = useMemo(() => {
        const deadlineDate = lessonSettings?.nextClassDate 
            ? format(new Date(lessonSettings.nextClassDate), 'PPPP') 
            : 'To Be Scheduled';

        const notesRaw = lessonSettings?.teacherNotes || '';
        const parsedNotes = notesRaw
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e1b4b;">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br />');

        const notesListHtml = notesRaw
            ? `<p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6; font-style: italic;">"${parsedNotes}"</p>`
            : `<p style="margin: 0; font-size: 13px; color: #64748b; font-style: italic;">No custom teacher guidelines submitted.</p>`;

        // Homework checklist with green custom visual ticks
        const homeworkHtml = safeHomework.length > 0
            ? safeHomework.map((item: string) => `
                <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                    <span style="color: #10b981; font-weight: bold; font-size: 16px; margin-right: 8px; line-height: 1;">✓</span>
                    <span style="font-size: 13px; color: #374151;">${item}</span>
                </div>
            `).join('')
            : `<p style="color: #64748b; font-style: italic; font-size: 13px; margin: 0;">No active due missions assigned.</p>`;

        // Material links styled beautifully as custom action buttons
        const materialsHtml = safeMaterials.length > 0
            ? safeMaterials.map((link: string) => `
                <a href="${link}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-weight: bold; font-size: 12px; padding: 6px 12px; border-radius: 6px; text-decoration: none; margin-right: 6px; margin-bottom: 6px;">
                    🔗 Open Resource Link
                </a>
            `).join('')
            : `<p style="color: #64748b; font-style: italic; font-size: 13px; margin: 0;">No reference URLs provided.</p>`;

        // List selected packages with neat vector layouts
        const packagesHtml = targetFilesList.length > 0
            ? targetFilesList.map(f => `
                <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <span style="font-weight: bold; color: #0f172a; font-size: 13px; display: block;">📂 ${f.name}</span>
                        <span style="font-size: 11px; color: #64748b;">Type: ${f.type}</span>
                    </div>
                    <span style="font-size: 10px; font-weight: bold; background-color: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">Ready</span>
                </div>
            `).join('')
            : `<p style="color: #64748b; font-style: italic; font-size: 13px; margin: 0; text-align: center;">No zip/html packages selected for delivery.</p>`;

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lessonSettings?.lessonName || 'Your Learning Package'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Inter', -apple-system, sans-serif;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        
        <!-- Premium Visual Header -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 32px 24px; text-align: center; border-bottom: 4px solid #3b82f6;">
            <div style="font-size: 32px; margin-bottom: 8px;">📚</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">NEW LEARNING PACKAGE LOADED</h1>
            <p style="margin: 6px 0 0 0; color: #93c5fd; font-size: 14px; font-weight: 600;">Topic: ${lessonSettings?.lessonName || 'Comprehensive Topic Class'}</p>
        </div>

        <div style="padding: 24px; color: #334155;">
            
            <!-- Target Deadline visual badge -->
            <div style="background-color: #fffbeb; border: 2px solid #fcd34d; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #b45309; font-weight: 800;">Target Deadline / Class Date</div>
                <div style="font-size: 18px; font-weight: 800; color: #78350f; margin-top: 6px;">📅 ${deadlineDate}</div>
            </div>

            <!-- Guidelines / Teacher notes -->
            <div style="margin-bottom: 24px; border-left: 4px solid #3b82f6; padding-left: 16px;">
                <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.03em;">💬 Teacher Guidelines & Notes</h3>
                ${notesListHtml}
            </div>

            <!-- Homework sections -->
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: bold; color: #991b1b; text-transform: uppercase; letter-spacing: 0.02em;">📝 Homework Checklist</h3>
                ${homeworkHtml}
            </div>

            <!-- Course material links -->
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #1e293b; text-transform: uppercase; letter-spacing: 0.02em;">🔗 Reference Materials</h3>
                <div style="display: flex; flex-wrap: wrap;">
                    ${materialsHtml}
                </div>
            </div>

            <!-- Selected interactive packages checklist -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: bold; color: #312e81; text-transform: uppercase; letter-spacing: 0.02em;">📦 Bundle Packages Attached</h3>
                ${packagesHtml}
                <p style="margin: 8px 0 0 0; font-size: 11px; color: #6366f1; font-style: italic;">*Interactive HTML widgets are stored locally in your saved directories. Click or load to execute.</p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #64748b;">
                <p style="margin: 0;">This bundle package is delivered straight from Tutor Academy Workspace.</p>
                <p style="margin: 4px 0 0 0;">Make sure to keep focused and practice daily. Your stats are tracked!</p>
            </div>

        </div>
    </div>
</body>
</html>
        `;
    }, [lessonSettings, targetFilesList]);

    // Fallback or full Clipboard Visual Html copy action
    const handleCopyHtml = async () => {
        try {
            const htmlBlob = new Blob([generatedHtml], { type: 'text/html' });
            
            // Build plain-text description for fallback copy
            const textContent = `
========================================
📚 TOPIC: ${lessonSettings?.lessonName || 'New Complex Class'}
========================================
📅 TARGET DEADLINE: ${lessonSettings?.nextClassDate ? format(new Date(lessonSettings.nextClassDate), 'PPPP') : 'Flexible'}

💬 TEACHER guidelines:
"${(lessonSettings?.teacherNotes || '').replace(/\*\*/g, '')}"

📝 HOMEWORK checklist:
${safeHomework.map((item: string) => ` - [ ] ${item}`).join('\n') || 'None assigned.'}

🔗 COURSE URLs & material links:
${safeMaterials.map((link: string) => ` - ${link}`).join('\n') || 'None.'}

📦 BUNDLE packages included:
${targetFilesList.map(f => ` - ${f.name} (${f.type})`).join('\n') || 'No files.'}
            `;
            const textBlob = new Blob([textContent], { type: 'text/plain' });

            const clipboardItem = new ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob
            });
            await navigator.clipboard.write([clipboardItem]);

            setIsCopySuccess(true);
            setTimeout(() => {
                setIsCopySuccess(false);
            }, 2500);

            alert("Visual Lesson Email copied! Paste directly into Gmail or Outlook.");
        } catch (err) {
            console.error("Failed rich HTML copy:", err);
            alert("Copy failed, please review system restrictions.");
        }
    };

    // Open mailto link with plain text pre-filled
    const handleSendMail = async () => {
        // Automatically download the Zip file to their device so they easily attach it
        try {
            if (currentContent && targetFilesList.length > 0) {
                await downloadZipPackage(learner, currentContent, targetFilesList);
            }
        } catch (e) {
            console.error("ZIP download trigger error during mail send:", e);
        }

        const textContent = `
Hi ${learner.name},

Here is your study package materials from our lesson topic guidelines (the complete interactive .zip package file has been compiled and downloaded - please make sure to drag-and-drop/attach it to your email body!):

========================================
📚 TOPIC: ${lessonSettings?.lessonName || 'Comprehensive Skill Session'}
========================================
📅 TARGET DEADLINE: ${lessonSettings?.nextClassDate ? format(new Date(lessonSettings.nextClassDate), 'PPPP') : 'Flexible'}

💬 TEACHER Guidelines & Notes:
"${(lessonSettings?.teacherNotes || 'Study carefully!').replace(/\*\*/g, '')}"

📝 HOMEWORK Checklist:
${safeHomework.map((item: string) => ` - [ ] ${item}`).join('\n') || 'No active homework checklist.'}

🔗 COURSE URLs & resources:
${safeMaterials.map((link: string) => ` - ${link}`).join('\n') || 'No resource links.'}

📦 Interactive Lesson packages selected (Attached ZIP):
${targetFilesList.map(f => `  ✔️ ${f.name}`).join('\n')}

Looking forward to our next class! Keep up the amazing effort!
        `;

        const mailtoLink = `mailto:${learner.email || ''}?subject=${encodeURIComponent(`📚 Your lesson guidelines: ${lessonSettings?.lessonName || 'Topic class'}`)}&body=${encodeURIComponent(textContent)}`;
        window.location.href = mailtoLink;
        onClose();
    };

    const handleForceDownloadZip = async () => {
        try {
            await downloadZipPackage(learner, currentContent, targetFilesList);
            alert("Success! The completed interactive HTML/zip student bundle package has been successfully downloaded to your tray. Drag and drop it straight into your Gmail or Outlook attachment area!");
        } catch (e) {
            console.error(e);
            alert("ZIP packaging failed. Check generated lesson logs.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`📦 Deliver Saved Lesson Material: ${learner.name}`} size="full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[50vh]">
                
                {/* Left Side: Selecting files and configurations */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 uppercase mb-2">1. Choose packages to include:</h4>
                        <p className="text-xs text-gray-400 mb-3">Check the HTML/zip compiled assets from this topic session that you wish to register in the email body:</p>
                        
                        {availableFiles.length === 0 ? (
                            <div className="p-4 bg-gray-50 border border-dashed rounded-lg text-center text-xs text-gray-400 font-semibold">
                                <i className="fas fa-exclamation-triangle text-lg mb-1 block"></i> No compiled HTML packages produced yet. Run the generator first!
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {availableFiles.map(file => (
                                    <label 
                                        key={file.id} 
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedFileIds[file.id] ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={!!selectedFileIds[file.id]}
                                            onChange={() => handleToggleFile(file.id)}
                                            className="h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-xs flex items-center gap-1.5">
                                                <i className={`fas ${file.icon} text-indigo-500`}></i>
                                                {file.name}
                                            </div>
                                            <span className="text-[10px] text-gray-400 block mt-0.5">{file.type}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Lesson properties overview */}
                    <div className="bg-gray-50 border rounded-lg p-3 space-y-2 mt-2">
                        <h4 className="text-xs font-bold text-gray-600 uppercase">Lesson Context Details:</h4>
                        <div className="text-xs space-y-1">
                            <div>📚 <strong className="text-gray-700">Topic:</strong> {lessonSettings?.lessonName || 'Comprehensive Topic'}</div>
                            <div>📅 <strong className="text-gray-700">Deadline:</strong> {lessonSettings?.nextClassDate ? format(new Date(lessonSettings.nextClassDate), 'PPPP') : 'No date'}</div>
                            <div>📝 <strong className="text-gray-700">Missions/Checklist:</strong> {lessonSettings?.homeworkChecklist?.length || 0} items</div>
                            <div>🔗 <strong className="text-gray-700">URLs:</strong> {lessonSettings?.materialLinks?.length || 0} links</div>
                        </div>
                    </div>

                    {/* Compiled Zip Generator Card block */}
                    <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-4 mt-1">
                        <h4 className="text-xs font-bold text-indigo-900 uppercase flex items-center gap-1.5 mb-1.5">
                            <i className="fas fa-file-archive text-indigo-600"></i>
                            PACKAGE COMPILER WIDGET
                        </h4>
                        <p className="text-[11px] text-indigo-700 leading-relaxed mb-3">
                            Directly package up study guides, PDF sheets, presentation slides, and interactive simulations in a single <strong>.zip file</strong>:
                        </p>
                        <button
                            type="button"
                            onClick={handleForceDownloadZip}
                            disabled={targetFilesList.length === 0}
                            className={`w-full font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${targetFilesList.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'}`}
                        >
                            <i className="fas fa-cloud-download-alt"></i>
                            Download Consolidated ZIP (Attach manually)
                        </button>
                    </div>
                </div>

                {/* Right Side: Visual Email HTML Preview */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border shadow-sm">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                            <i className="fas fa-eye text-brand-green"></i> Live Email Template
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopyHtml}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${isCopySuccess ? 'bg-green-600 text-white border-green-600' : 'bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-200'}`}
                            >
                                <i className={`fas ${isCopySuccess ? 'fa-check' : 'fa-clipboard'} mr-1.5`}></i>
                                {isCopySuccess ? 'Copied Visual HTML!' : 'Copy HTML'}
                            </button>
                            <button
                                onClick={handleSendMail}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                            >
                                <i className="fas fa-paper-plane"></i> Send via Client
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-white border rounded-xl overflow-hidden shadow-inner flex flex-col min-h-[35vh]">
                        <iframe
                            title="Lesson Email Preview Frame"
                            srcDoc={generatedHtml}
                            className="w-full flex-1 border-none"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">
                        <i className="fas fa-info-circle mr-1"></i> Paste directly in Outlook/Gmail body to send this fully styled message to the parent or apprentice.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default SendSavedLessonModal;
