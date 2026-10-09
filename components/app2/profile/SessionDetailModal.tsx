import React, { useRef, useState, useMemo } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { differenceInDays, isThisWeek, isThisMonth } from 'date-fns';
import { Session, Learner } from '../../../types2';
import Modal from '../Modal';
import { FIXED_PENALTIES } from '../../../constants2';
import ProgressBar from '../ProgressBar';
import { sendEmailWithAIGreeting } from '../../../utils/emailSender';
import { useLearnerStore } from '../../../store/useLearnerStore';
import JSZip from 'jszip';

const SimpleMarkdown: React.FC<{ text?: string }> = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\*.*?\*|==.*?==|_.*?_)/g).filter(Boolean);

    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <strong key={index}>{part.slice(1, -1)}</strong>;
                }
                if (part.startsWith('_') && part.endsWith('_')) {
                    return <em key={index}>{part.slice(1, -1)}</em>;
                }
                if (part.startsWith('==') && part.endsWith('==')) {
                    return <mark key={index} className="bg-yellow-200 px-1 rounded">{part.slice(2, -2)}</mark>;
                }
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </>
    );
};

const MasteryGauge: React.FC<{ level: number, previousLevel?: number, justification: string, darkTheme?: boolean }> = ({ level, previousLevel, justification, darkTheme = false }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (level / 100) * circumference;
    const strokeColor = level >= 75 ? '#10b981' : level >= 50 ? '#f59e0b' : '#ef4444';

    let trendLabel = null;
    let trendColor = '';
    if (previousLevel !== undefined) {
        const diff = level - previousLevel;
        if (diff > 0) {
            trendLabel = `+${diff}% vs last session`;
            trendColor = 'text-emerald-500';
        } else if (diff < 0) {
            trendLabel = `${diff}% vs last session`;
            trendColor = 'text-red-500';
        } else {
            trendLabel = `Same as last session`;
            trendColor = 'text-gray-500';
        }
    }

    return (
        <div className={`relative overflow-hidden flex flex-col md:flex-row items-center md:items-stretch justify-between p-6 rounded-2xl w-full gap-6 ${darkTheme ? 'bg-slate-900 border border-slate-800' : 'bg-gray-50 border border-gray-150'}`}>
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-9xl opacity-[0.035] select-none pointer-events-none">🧠</span>
            
            {/* Left side: Gauge circle & trend label */}
            <div className="relative z-10 flex flex-col items-center justify-center md:w-1/3 shrink-0 pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-slate-200/50 dark:border-slate-800/50 pr-0 md:pr-6">
                <h5 className={`text-xs font-black uppercase tracking-wider mb-3 text-center ${darkTheme ? 'text-slate-200' : 'text-slate-800'}`}>Class Success Rate</h5>
                <div className="flex flex-col items-center relative">
                    <svg width="110" height="110" viewBox="0 0 120 120" className="transform -rotate-90">
                        <circle stroke={darkTheme ? "#1e293b" : "#e5e7eb"} strokeWidth="10" fill="transparent" r={radius} cx="60" cy="60" />
                        <circle
                            stroke={strokeColor}
                            strokeWidth="10"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            fill="transparent"
                            r={radius}
                            cx="60"
                            cy="60"
                            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                        />
                    </svg>
                    <div className={`absolute inset-0 flex items-center justify-center text-2xl font-black ${darkTheme ? 'text-white' : 'text-slate-900'}`}>{level}%</div>
                </div>
                {trendLabel && <p className={`text-[10px] font-black uppercase tracking-tight mt-3 ${trendColor}`}>{trendLabel}</p>}
                <p className={`text-[9px] font-medium text-center mt-2 max-w-[150px] leading-tight ${darkTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                    An assessment of how successful the class has been for both tutor and learner.
                </p>
            </div>

            {/* Right side: Tutor Assessment text */}
            <div className="relative z-10 flex-grow flex flex-col justify-center py-2 text-center md:text-left">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${darkTheme ? 'text-indigo-400' : 'text-indigo-900'}`}>Tutor Assessment</p>
                <div className="relative">
                    <span className="absolute -left-3 -top-3 text-3xl font-serif text-slate-350 dark:text-slate-650 opacity-60 leading-none">“</span>
                    <p className={`text-sm italic font-serif leading-relaxed px-2 rounded-lg ${darkTheme ? 'text-slate-300' : 'text-slate-805'}`}>
                        {justification}
                    </p>
                    <span className="text-3xl font-serif text-slate-350 dark:text-slate-651 opacity-60 leading-none block text-right -mt-2 -mr-1">”</span>
                </div>
            </div>
        </div>
    );
};

const SpeakingTimeGauge: React.FC<{ spokenTime: number, duration: number, previousSpokenTime?: number, previousDuration?: number, darkTheme?: boolean }> = ({ spokenTime, duration = 45, previousSpokenTime, previousDuration, darkTheme = false }) => {
    const ratio = spokenTime / duration;
    const level = Math.min(100, Math.round(ratio * 105)); // soft scaling to feel rewarding!
    
    let previousLevel: number | undefined = undefined;
    if (previousSpokenTime !== undefined && previousDuration !== undefined && previousDuration > 0) {
        previousLevel = Math.min(100, Math.round((previousSpokenTime / previousDuration) * 105));
    }

    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (level / 100) * circumference;
    
    let strokeColor = '#ef4444'; // passive/needs-work
    let statusLabel = 'Passive Lesson 🎧';
    let labelColor = 'text-red-500';
    if (ratio >= 0.50) {
        strokeColor = '#10b981'; // excellent
        statusLabel = 'Active Fluency! 🗣️⚡';
        labelColor = 'text-green-500 font-extrabold';
    } else if (ratio >= 0.30) {
        strokeColor = '#0ea5e9'; // good
        statusLabel = 'Balanced Practice 💬';
        labelColor = 'text-sky-600 font-bold';
    }

    let trendLabel = null;
    let trendColor = '';
    if (previousLevel !== undefined) {
        const diff = level - previousLevel;
        if (diff > 0) {
            trendLabel = `+${diff}% vs last session`;
            trendColor = 'text-emerald-500';
        } else if (diff < 0) {
            trendLabel = `${diff}% vs last session`;
            trendColor = 'text-red-500';
        } else {
            trendLabel = `Same as last session`;
            trendColor = 'text-gray-500';
        }
    }

    return (
        <div className={`relative overflow-hidden flex flex-col items-center justify-between p-4 rounded-xl w-full min-h-[260px] h-full ${darkTheme ? 'bg-slate-900 border border-slate-800' : 'bg-gray-50 border border-gray-150'}`}>
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-8xl opacity-[0.03] select-none pointer-events-none">🗣️</span>
            <div className="relative z-10 flex flex-col items-center w-full h-full justify-between flex-grow">
                <h5 className={`text-xs font-black uppercase tracking-wider mb-2 ${darkTheme ? 'text-slate-200' : 'text-slate-800'}`}>Speaking Time</h5>
                <div className="flex flex-col items-center">
                    <svg width="100" height="100" viewBox="0 0 120 120" className="transform -rotate-90">
                        <circle stroke={darkTheme ? "#1e293b" : "#e5e7eb"} strokeWidth="10" fill="transparent" r={radius} cx="60" cy="60" />
                        <circle
                            stroke={strokeColor}
                            strokeWidth="10"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            fill="transparent"
                            r={radius}
                            cx="60"
                            cy="60"
                            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                        />
                    </svg>
                    <div className={`text-2xl font-black -mt-16 ${darkTheme ? 'text-white' : 'text-slate-900'}`}>{level}%</div>
                </div>
                <div className="mt-12 w-full flex flex-col items-center flex-grow justify-end">
                    {trendLabel && <p className={`text-[10px] font-bold uppercase tracking-tight mb-1 ${trendColor}`}>{trendLabel}</p>}
                    <p className={`text-center text-xs uppercase tracking-tight mb-1 ${labelColor}`}>{statusLabel}</p>
                    <p className={`text-[10px] font-bold ${darkTheme ? 'text-slate-400' : 'text-slate-650'}`}>{spokenTime} mins out of {duration}</p>
                </div>
            </div>
        </div>
    );
};

interface SessionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: Session;
    sessionNumber: number;
    learner: Learner;
}

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ isOpen, onClose, session, sessionNumber, learner }) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const { name: learnerName } = learner;
    const [emailButtonState, setEmailButtonState] = useState<'idle' | 'generating' | 'generated'>('idle');
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);

    const updateLearner = useLearnerStore(state => state.updateLearner);
    const learners = useLearnerStore(state => state.learners);

    const sortedSessions = [...(learner.sessions || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const currentIndex = sortedSessions.findIndex(s => s.id === session.id);
    const previousSession = currentIndex > 0 ? sortedSessions[currentIndex - 1] : null;

    const [leaderboardPeriod, setLeaderboardPeriod] = useState<'all' | 'week' | 'month'>('all');

    const leaderboard = useMemo(() => {
        const filteredLearners = (learners || []).filter(l => {
            if (leaderboardPeriod === 'all') return true;
            
            const sList = l.sessions || [];
            const lastSession = sList
                .filter(s => s.attended && s.date && !isNaN(new Date(s.date).getTime()))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            if (!lastSession) return false;

            const lastSessionDate = new Date(lastSession.date);

            if (leaderboardPeriod === 'week') {
                return isThisWeek(lastSessionDate, { weekStartsOn: 1 });
            }
            if (leaderboardPeriod === 'month') {
                return isThisMonth(lastSessionDate);
            }
            return true;
        });

        const sorted = [...filteredLearners].sort((a, b) => (b.xp || 0) - (a.xp || 0));
        const cIndex = sorted.findIndex(l => l.id === learner.id);
        
        if (cIndex === -1) return null;
        
        const above = cIndex > 0 ? sorted[cIndex - 1] : null;
        const below = cIndex < sorted.length - 1 ? sorted[cIndex + 1] : null;
        
        return {
            above,
            current: { ...sorted[cIndex], rank: cIndex + 1 },
            below,
        };
    }, [learner.id, learners, leaderboardPeriod]);

    const totalHours = useMemo(() => {
        const sList = learner.sessions || [];
        return Math.round(sList.reduce((acc, s) => acc + (s.attended ? s.duration || 0 : 0), 0) / 60) || 0;
    }, [learner.sessions]);

    const lastSeenData = useMemo(() => {
        const sList = learner.sessions || [];
        const lastSession = sList.filter(s => s.attended).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const daysSinceLastSession = lastSession ? differenceInDays(new Date(), new Date(lastSession.date)) : null;
        const lastSeen = daysSinceLastSession !== null ? `${daysSinceLastSession}d ago` : 'N/A';
        let lastSeenEmoji = '🤩';
        if (daysSinceLastSession !== null) {
            if (daysSinceLastSession <= 7) lastSeenEmoji = '😊';
            else if (daysSinceLastSession <= 21) lastSeenEmoji = '🤔';
            else lastSeenEmoji = '😟';
        }
        return { lastSeen, lastSeenEmoji };
    }, [learner.sessions]);

    // Dynamic state with preferences fallback & new visual widgets pre-selected on load
    const [selectedTemplate, setSelectedTemplate] = useState<string>(() => {
        return (learner.reportPreferences?.template === 'galactic' ? 'duolingo' : learner.reportPreferences?.template) || 'duolingo';
    });
    
    const [selectedComponents, setSelectedComponents] = useState<string[]>(() => {
        return learner.reportPreferences?.selectedComponents || [
            'overview', 'focusLearnings', 'competency', 'competencyUpdates', 'spokenRatio', 'achievements', 'progress', 'learningPath', 'heatmap', 'records', 'unlockedVocabulary', 'nextSteps', 'engagementLeaderboard'
        ];
    });

    // Custom prominent editable banner parameters
    const [reportBannerText, setReportBannerText] = useState("Official Language Certificate of Session Accomplishment and Dynamic Metric Assessment 🎓");
    const [reportBannerType, setReportBannerType] = useState<'success' | 'warning' | 'info' | 'danger' | 'accent'>('accent');
    const [showReportBanner, setShowReportBanner] = useState<boolean>(false);
    const [reportBannerPosition, setReportBannerPosition] = useState<'top' | 'bottom'>('top');

    // Exam Submission & Essay Correction Portal States
    const [uploadedExamPayload, setUploadedExamPayload] = useState<any>(null);
    const [isUnzipping, setIsUnzipping] = useState<boolean>(false);
    const [zipError, setZipError] = useState<string | null>(null);
    const [essayCorrections, setEssayCorrections] = useState<Record<string, any>>({});
    const [isCorrecting, setIsCorrecting] = useState<Record<string, boolean>>({});

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUnzipping(true);
        setZipError(null);
        setUploadedExamPayload(null);

        try {
            if (file.name.endsWith('.zip')) {
                const zip = await JSZip.loadAsync(file);
                // Look for payload.json or any json file in the root
                const jsonFile = zip.file('payload.json') || Object.values(zip.files).find(f => f.name.endsWith('.json') && !f.dir);
                if (!jsonFile) {
                    throw new Error('No payload.json found inside the ZIP package.');
                }
                const text = await jsonFile.async('text');
                const parsed = JSON.parse(text);
                if (!parsed.answers) {
                    throw new Error('Invalid exam package content.');
                }
                setUploadedExamPayload(parsed);
            } else if (file.name.endsWith('.json')) {
                const text = await file.text();
                const parsed = JSON.parse(text);
                if (!parsed.answers) {
                    throw new Error('Invalid exam package content.');
                }
                setUploadedExamPayload(parsed);
            } else {
                throw new Error('Unsupported file format. Please upload a .zip or .json exam package.');
            }
        } catch (err: any) {
            console.error('Error parsing exam file:', err);
            setZipError(err.message || 'Failed to read the exam package file.');
        } finally {
            setIsUnzipping(false);
        }
    };

    const handleCorrectEssay = async (taskId: string, essayText: string, taskTitle: string) => {
        if (isCorrecting[taskId]) return;
        
        setIsCorrecting(prev => ({ ...prev, [taskId]: true }));
        try {
            const res = await fetch('/api/ai/correct-essay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    essayText,
                    taskTitle,
                    candidateReference: learner.name || 'Student'
                })
            });

            if (!res.ok) {
                throw new Error('Correction failed');
            }

            const data = await res.json();
            
            // Update corrections state
            setEssayCorrections(prev => ({ ...prev, [taskId]: data }));

            // Save correction directly to learner's official sessionAnalysis so it's fully integrated and aggregated!
            const newAnalysisEntry = {
                date: new Date().toISOString(),
                essayFeedbackHtml: data.essayFeedbackHtml,
                weaknesses: data.weaknesses || [],
                strengths: data.strengths || [],
                recycledErrors: data.recycledErrors || [],
                xpEarned: 50,
                examTitle: (uploadedExamPayload && uploadedExamPayload.examId) || taskTitle,
                originalText: essayText
            };

            const updatedAnalysis = [newAnalysisEntry, ...(learner.sessionAnalysis || [])];
            updateLearner({
                ...learner,
                xp: (learner.xp || 0) + 50,
                sessionAnalysis: updatedAnalysis
            });

        } catch (err: any) {
            console.error('Error correcting essay:', err);
            alert('Failed to generate essay correction. Please try again.');
        } finally {
            setIsCorrecting(prev => ({ ...prev, [taskId]: false }));
        }
    };

    const handleToggleComponent = (compName: string) => {
        let updated: string[];
        if (selectedComponents.includes(compName)) {
            updated = selectedComponents.filter(c => c !== compName);
        } else {
            updated = [...selectedComponents, compName];
        }
        setSelectedComponents(updated);
        
        // Persist to store
        updateLearner({
            ...learner,
            reportPreferences: {
                template: selectedTemplate,
                selectedComponents: updated
            }
        });
    };

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplate(templateId);
        // Persist to store
        updateLearner({
            ...learner,
            reportPreferences: {
                template: templateId,
                selectedComponents
            }
        });
    };

    const handleDeselectAllComponents = () => {
        const updated: string[] = [];
        setSelectedComponents(updated);
        // Persist to store
        updateLearner({
            ...learner,
            reportPreferences: {
                template: selectedTemplate,
                selectedComponents: updated
            }
        });
    };

    const handleSaveAsImage = () => {
        if (certificateRef.current) {
            toPng(certificateRef.current, { 
                pixelRatio: 3,
                cacheBust: true,
                backgroundColor: selectedTemplate === 'executive' ? '#020617' : '#ffffff',
                style: { transform: 'scale(1)', transformOrigin: 'top left' },
                styleSheetsFilter: (sheet) => {
                    if (sheet.href) {
                        try {
                            const url = new URL(sheet.href, window.location.origin);
                            if (url.origin !== window.location.origin) {
                                return false;
                            }
                        } catch (e) {
                            return false;
                        }
                    }
                    try {
                        const rules = sheet.cssRules;
                        return true;
                    } catch (e) {
                        return false;
                    }
                }
            } as any).then(dataUrl => {
                const link = document.createElement('a');
                const sessionDate = new Date(session.date).toISOString().split('T')[0];
                link.download = `${learnerName}_Class_Report_${sessionDate}.png`;
                link.href = dataUrl;
                link.click();
            });
        }
    };

    const handlePrintPdf = () => {
        if (certificateRef.current) {
            const printContent = certificateRef.current.cloneNode(true) as HTMLElement;
            const allStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
            const stylesHtml = Array.from(allStyles).map(s => {
                if (s.tagName === 'LINK') {
                    const href = (s as HTMLLinkElement).href;
                    return `<link rel="stylesheet" href="${href}">`;
                }
                return s.outerHTML;
            }).join('\n');
            const bgColor = selectedTemplate === 'executive' ? '#020617' : '#ffffff';
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <html>
                    <head>
                        <base href="${window.location.origin}/">
                        <title>Class Report - ${learnerName} - ${new Date(session.date).toISOString().split('T')[0]}</title>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                        ${stylesHtml}
                        <style>
                            @media print {
                                @page { size: landscape; margin: 0.5in; }
                                html, body {
                                    margin: 0;
                                    padding: 20px;
                                    background-color: ${bgColor} !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                    color-scheme: ${selectedTemplate === 'executive' ? 'dark' : 'light'} !important;
                                }
                                .no-print { display: none !important; }
                                * {
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }
                            }
                            html, body {
                                margin: 0;
                                padding: 20px;
                                background-color: ${bgColor} !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                color: ${selectedTemplate === 'executive' ? '#f1f5f9' : '#1e293b'};
                                font-family: 'Quicksand', 'Segoe UI', system-ui, sans-serif !important;
                            }
                            .no-print { display: none !important; }
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            
                            /* Explicit Print Overrides for Tailwind classes */
                            .bg-white { background-color: #ffffff !important; }
                            .bg-slate-50 { background-color: #f8fafc !important; }
                            .bg-rose-50 { background-color: #fff1f2 !important; }
                            .bg-indigo-50 { background-color: #e0e7ff !important; }
                            .bg-emerald-50 { background-color: #ecfdf5 !important; }
                            .bg-slate-950 { background-color: #020617 !important; }
                            .bg-black\\/5 { background-color: rgba(0,0,0,0.05) !important; }
                            .bg-\\[\\#f0fdf4\\] { background-color: #f0fdf4 !important; }
                            
                            .border-slate-950 { border-color: #020617 !important; }
                            .border-slate-200\\.5 { border-color: #e2e8f0 !important; }
                            .border-rose-100 { border-color: #ffe4e6 !important; }
                            .border-indigo-100 { border-color: #e0e7ff !important; }
                            .border-emerald-100 { border-color: #d1fae5 !important; }
                            
                            .text-slate-900 { color: #0f172a !important; }
                            .text-slate-800 { color: #1e293b !important; }
                            .text-slate-700 { color: #334155 !important; }
                            .text-slate-600 { color: #475569 !important; }
                            .text-rose-600 { color: #dc2626 !important; }
                            .text-indigo-600 { color: #4f46e5 !important; }
                            .text-emerald-600 { color: #059669 !important; }
                        </style>
                    </head>
                    <body>
                        <div class="max-w-7xl mx-auto">
                            ${printContent.outerHTML}
                        </div>
                        <script>
                            window.onload = function() { setTimeout(function() { window.print(); }, 800); };
                        <\/script>
                    </body>
                    </html>
                `);
                win.document.close();
            }
        } else {
            window.print();
        }
    };

    const handleEmailFlow = async () => {
        if (emailButtonState === 'idle') {
            if (certificateRef.current) {
                setEmailButtonState('generating');
                try {
                    const blob = await toBlob(certificateRef.current, { 
                        pixelRatio: 2, 
                        backgroundColor: selectedTemplate === 'executive' ? '#020617' : '#ffffff', 
                        cacheBust: true,
                        styleSheetsFilter: (sheet) => {
                            if (sheet.href) {
                                try {
                                    const url = new URL(sheet.href, window.location.origin);
                                    if (url.origin !== window.location.origin) {
                                        return false;
                                    }
                                } catch (e) {
                                    return false;
                                }
                            }
                            try {
                                const rules = sheet.cssRules;
                                return true;
                            } catch (e) {
                                return false;
                            }
                        }
                    } as any);
                    if (blob) {
                        setGeneratedBlob(blob);
                        setEmailButtonState('generated');
                    } else {
                        throw new Error("Blob conversion failed.");
                    }
                } catch (err) {
                    console.error("Error generating report image:", err);
                    alert("Could not generate the report image.");
                    setEmailButtonState('idle');
                }
            }
        } else if (emailButtonState === 'generated' && generatedBlob) {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': generatedBlob })]);
                const bodyContent = `Here is your custom Class Report for our session on ${new Date(session.date).toLocaleDateString()}.\n\nI've generated and attached this premium, ${selectedTemplate.toUpperCase()} style report. I also copied the high-resolution report card directly to your clipboard!\n\nSimply paste it (Ctrl+V or Cmd+V) directly into this message.`;
                
                await sendEmailWithAIGreeting({
                    learner,
                    topic: `Session Report for ${session.lessonName || 'our last class'}`,
                    subject: `Academic Report: ${session.lessonName || new Date(session.date).toLocaleDateString()}`,
                    bodyContent,
                });
                setEmailButtonState('idle');
                setGeneratedBlob(null);
            } catch (err) {
                console.error("Could not copy to clipboard or send email:", err);
                alert("Copied to clipboard failed or email sending stopped.");
                setEmailButtonState('generated');
            }
        }
    };

    if (!isOpen) return null;

    // Report Components styling based on theme
    const isDark = selectedTemplate === 'executive';
    const isDuolingo = selectedTemplate === 'duolingo';
    const isMinimalist = selectedTemplate === 'minimalist';
    const isOfficial = selectedTemplate === 'official';

    const getThemeClasses = () => {
        switch (selectedTemplate) {
            case 'official':
                return {
                    container: "bg-[#fcfaf2] text-amber-950 p-8 md:p-12 rounded-xl border-[16px] border-double border-amber-800 shadow-2xl relative font-serif",
                    header: "border-b border-amber-200 pb-2 text-amber-900 font-serif font-bold tracking-tight text-center",
                    accentText: "text-amber-800",
                    accentBg: "bg-amber-100/60 border border-amber-200",
                    subCard: "bg-[#f7f4e8] p-4 rounded border border-amber-100 shadow-xs",
                    heading: "text-amber-900 font-bold font-serif uppercase tracking-wider text-sm",
                    gridBorder: "divide-amber-100",
                    accentBadge: "bg-amber-800 text-[#fcfaf2]"
                };
            case 'executive':
                return {
                    container: "bg-slate-950 text-slate-100 p-8 rounded-xl border border-cyan-500/40 shadow-2xl relative font-mono",
                    header: "border-b border-cyan-500/30 pb-2 text-cyan-400 font-mono tracking-widest text-center uppercase",
                    accentText: "text-cyan-400",
                    accentBg: "bg-slate-900 border border-cyan-500/20",
                    subCard: "bg-slate-900/60 p-4 rounded border border-slate-800 shadow-none",
                    heading: "text-cyan-400 font-mono uppercase tracking-widest text-xs",
                    gridBorder: "divide-slate-800",
                    accentBadge: "bg-cyan-500 text-slate-950"
                };
            case 'duolingo':
                return {
                    container: "bg-white text-[#3c3c3c] p-8 md:p-12 rounded-3xl border-b-[8px] border-x-[3px] border-t-[3px] border-[#58cc02] shadow-xl relative font-sans",
                    header: "border-b-2 border-emerald-100 pb-3 text-[#58cc02] font-sans font-black tracking-tight text-center uppercase text-xl",
                    accentText: "text-[#58cc02] font-extrabold",
                    accentBg: "bg-green-50 border-2 border-green-150",
                    subCard: "bg-white p-5 rounded-2xl border-2 border-b-4 border-gray-150 shadow-sm",
                    heading: "text-[#58cc02] font-extrabold uppercase tracking-widest text-[11px]",
                    gridBorder: "divide-gray-150",
                    accentBadge: "bg-[#58cc02] text-white font-extrabold"
                };
            case 'minimalist':
                return {
                    container: "bg-white text-black p-8 rounded-none border-4 border-black relative font-sans",
                    header: "border-b-4 border-black pb-4 text-black font-sans font-black tracking-tighter text-left text-3xl uppercase",
                    accentText: "text-black font-bold underline",
                    accentBg: "bg-neutral-100 border border-neutral-300",
                    subCard: "bg-white p-4 rounded-none border-2 border-black",
                    heading: "text-black font-black uppercase tracking-tighter text-sm",
                    gridBorder: "divide-neutral-200",
                    accentBadge: "bg-black text-white"
                };
            default: // classic
                return {
                    container: "bg-white text-gray-800 p-8 rounded-md border-double border-4 border-gray-800 shadow-md relative font-sans",
                    header: "border-b-2 border-gray-200 pb-3 text-gray-900 font-extrabold text-center",
                    accentText: "text-brand-blue",
                    accentBg: "bg-blue-50 border border-blue-100",
                    subCard: "bg-gray-50 p-4 rounded-lg border border-gray-200",
                    heading: "text-gray-800 font-bold uppercase text-xs",
                    gridBorder: "divide-gray-200",
                    accentBadge: "bg-brand-blue text-white font-bold"
                };
        }
    };

    const styling = getThemeClasses();

    // Preparation of component-specific data
    const competenciesData = learner.competencies.map(c => ({
        subject: c.name,
        A: c.progress,
        fullMark: 100
    }));

    // Simple line progress chart
    const historicalProgressData = [...learner.sessions]
        .slice(-6)
        .reverse()
        .map((s, idx) => ({
            name: `Class ${idx + 1}`,
            xp: 50 + (idx * 8) + (Math.sin(idx) * 10),
            hours: (idx + 1) * 1.5
        }));

    const renderBannerContent = () => {
        if (!showReportBanner || !reportBannerText) return null;
        return (
            <div className={`p-4 rounded-3xl border-2 font-sans font-black text-xs text-center shadow-md transition-all ${
                reportBannerType === 'success' ? 'bg-[#58cc02] text-white border-green-600' :
                reportBannerType === 'warning' ? 'bg-[#ff9600] text-white border-amber-600 animate-pulse' :
                reportBannerType === 'info' ? 'bg-[#0ea5e9] text-white border-sky-600' :
                reportBannerType === 'danger' ? 'bg-rose-600 text-white border-rose-700' :
                'bg-gradient-to-r from-teal-500 via-indigo-600 to-[#58cc02] text-white border-indigo-400'
            }`}>
                🌟 {reportBannerText}
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Customizer: Session #${sessionNumber} Class Report`} size="full">
            {/* INLINE CSS FOR PRINT ISOLATION */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: landscape; margin: 0.3in; }
                    body * {
                        visibility: hidden;
                    }
                    #printable-report-area, #printable-report-area * {
                        visibility: visible;
                    }
                    #printable-report-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: ${selectedTemplate === 'executive' ? '#020617' : '#ffffff'} !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Reset layout for parents to allow multi-page printing */
                    .modal-body, .printable-modal, .fixed.inset-0, #root, body, html {
                        position: static !important;
                        overflow: visible !important;
                        height: auto !important;
                        max-height: none !important;
                        transform: none !important;
                        box-shadow: none !important;
                        background: ${selectedTemplate === 'executive' ? '#020617' : '#ffffff'} !important;
                    }
                    /* Explicitly hide non-printable modal parts */
                    .no-print, .modal-header, .backdrop-overlay, .modal-footer {
                        display: none !important;
                    }
                    /* Force background colors and images to print */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
            `}} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
                {/* 1. COMPOSER PANEL (Side Controller) */}
                <div className="lg:col-span-4 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <i className="fas fa-magic text-indigo-600 text-lg"></i>
                            <h3 className="font-bold text-gray-800 text-base">Class Report Designer</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 font-normal">
                            Choose a visual template theme and select which dynamic widgets from the comprehensive review suite to overlay onto this Class Report.
                        </p>

                        {/* Theme Select */}
                        <div className="space-y-2 mb-5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-widest block">1. Style Template</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'duolingo', label: 'Duolingo White', icon: 'fa-graduation-cap' },
                                    { id: 'classic', label: 'Classic Board', icon: 'fa-certificate' },
                                    { id: 'official', label: 'Official Diploma', icon: 'fa-scroll' },
                                    { id: 'executive', label: 'Executive Dark', icon: 'fa-terminal' },
                                    { id: 'minimalist', label: 'Minimalist Swiss', icon: 'fa-square' }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelectTemplate(item.id)}
                                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                                            selectedTemplate === item.id
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        <i className={`fas ${item.icon} text-emerald-500`}></i>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Editable Prominent Banner Settings */}
                        <div className="space-y-2 mb-5 bg-white p-3 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">Banner</label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={showReportBanner}
                                        onChange={(e) => setShowReportBanner(e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shadow-2xs"
                                    />
                                    <span className="text-[10px] font-bold text-gray-650 uppercase">Show</span>
                                </label>
                            </div>
                            {showReportBanner && (
                                <div className="space-y-2 pt-1 font-sans">
                                    <input 
                                        type="text" 
                                        value={reportBannerText}
                                        onChange={(e) => setReportBannerText(e.target.value)}
                                        placeholder="Type custom prominent report banner..."
                                        className="w-full bg-gray-50 text-xs border border-gray-200 p-2 rounded-lg"
                                    />
                                    <div className="flex items-center justify-between gap-2 bg-slate-50/70 p-1.5 border border-slate-100 rounded-lg">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider pl-1 font-sans">Banner Position:</span>
                                        <div className="flex bg-gray-200/80 rounded-md p-0.5 border border-gray-300 shadow-2xs shrink-0 font-sans">
                                            <button
                                                type="button"
                                                onClick={() => setReportBannerPosition('top')}
                                                className={`text-[9px] font-black px-2.5 py-1 rounded-md transition-all uppercase ${
                                                    reportBannerPosition === 'top' 
                                                        ? 'bg-white text-indigo-700 shadow-xs' 
                                                        : 'text-gray-500 hover:text-gray-800'
                                                }`}
                                            >
                                                Top
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setReportBannerPosition('bottom')}
                                                className={`text-[9px] font-black px-2.5 py-1 rounded-md transition-all uppercase ${
                                                    reportBannerPosition === 'bottom' 
                                                        ? 'bg-white text-indigo-700 shadow-xs' 
                                                        : 'text-gray-500 hover:text-gray-800'
                                                }`}
                                            >
                                                Bottom
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1">
                                        {(['accent', 'success', 'warning', 'info', 'danger'] as const).map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setReportBannerType(type)}
                                                className={`text-[8px] font-black uppercase py-10 rounded text-center truncate ${
                                                    reportBannerType === type 
                                                        ? 'bg-indigo-600 text-white border-indigo-600 font-extrabold' 
                                                        : 'bg-gray-50 border-gray-250 text-gray-650 hover:bg-gray-100'
                                                }`}
                                                style={{ padding: '4px 2px' }}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Component Toggles */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-widest block">2. Compose Report Widgets</label>
                                <button 
                                    type="button" 
                                    onClick={handleDeselectAllComponents} 
                                    className="text-[10px] text-red-600 hover:text-red-800 font-bold uppercase tracking-wider underline cursor-pointer"
                                    title="Deselect all composition widgets"
                                >
                                    Deselect All
                                </button>
                            </div>
                            <div className="space-y-1 max-h-[16rem] overflow-y-auto pr-1">
                                {[
                                    { id: 'overview', name: 'Class Info', desc: 'Summary of class notes, time, and rate.', icon: 'fa-info-circle text-blue-500' },
                                    { id: 'focusLearnings', name: 'Focus & Learnings', desc: 'Your strengths, needs practice, and recommendations.', icon: 'fa-graduation-cap text-indigo-500' },
                                    { id: 'spokenRatio', name: 'Talk Time', desc: 'How much you and the tutor spoke.', icon: 'fa-microphone-alt text-emerald-500' },
                                    { id: 'competencyUpdates', name: 'My Growth', desc: 'Skills you practiced and improved today.', icon: 'fa-chart-line text-green-500' },
                                    { id: 'competency', name: 'Skills Map', desc: 'Your English skill levels on a radar chart.', icon: 'fa-atom text-purple-500' },
                                    { id: 'achievements', name: 'Review', desc: 'Your progress review, achievements, and corrections.', icon: 'fa-clipboard-check text-indigo-500' },
                                    { id: 'engagementLeaderboard', name: 'Engagement & Rank', desc: 'XP, Streak, Hours, and Leaderboard rank.', icon: 'fa-user-clock text-rose-500' },
                                    { id: 'sentimentEmotion', name: 'Sentiment & Emotion', desc: 'Emotional journey, mood timeline, and SEL metrics.', icon: 'fa-heart text-purple-500' },
                                    { id: 'unlockedVocabulary', name: 'New Words', desc: 'New words you learned today.', icon: 'fa-book text-pink-500' },
                                    { id: 'nextSteps', name: 'Homework', desc: 'Your homework and top-priority tasks.', icon: 'fa-star text-orange-500' },
                                    { id: 'progress', name: 'My Progress', desc: 'Simple chart of your learning progress.', icon: 'fa-chart-pie text-cyan-500' },
                                    { id: 'learningPath', name: 'Course Plan', desc: 'Lesson path and completed modules.', icon: 'fa-road text-indigo-500' },
                                    { id: 'skillTree', name: 'Skills Tree', desc: 'Map of your English skills.', icon: 'fa-network-wired text-emerald-500' },
                                    { id: 'heatmap', name: 'My Classes', desc: 'Calendar heatmap showing when you studied.', icon: 'fa-th text-pink-500' },
                                    { id: 'records', name: 'My Stats', desc: 'Your streak days, experience points, and levels.', icon: 'fa-list-ol text-cyan-500' },
                                    { id: 'calendar', name: 'My Calendar', desc: 'Calendar chart of your lessons.', icon: 'fa-calendar-day text-teal-500' },
                                    { id: 'challengeBoard', name: 'Challenges', desc: 'Active fun challenges to earn extra points.', icon: 'fa-tasks text-orange-500' },
                                    { id: 'competition', name: 'Rank', desc: 'Game-like scoreboard and competitive level.', icon: 'fa-gamepad text-rose-500' },
                                    { id: 'automation', name: 'Invoices', desc: 'Hour balance and payment tracker.', icon: 'fa-file-invoice-dollar text-red-500' },
                                    { id: 'termCalendar', name: 'Term Calendar', desc: 'Syllabus calendar with weekly term indicators tracking goals.', icon: 'fa-calendar-alt text-indigo-500' },
                                    { id: 'smartGoals', name: 'SMART Goals', desc: 'Detailed goals mapped with visual success trajectories.', icon: 'fa-bullseye text-emerald-500' },
                                    { id: 'recentSessions', name: 'Recent Sessions', desc: 'Summary of most recent completed sessions.', icon: 'fa-history text-blue-500' },
                                    { id: 'attendance', name: 'Attendance', desc: 'Stats on attended vs cancelled sessions.', icon: 'fa-calendar-check text-green-500' },
                                    { id: 'feedback', name: 'Tutor Feedback', desc: 'Direct tutor comments and feedback notes.', icon: 'fa-comment-dots text-amber-500' },
                                    { id: 'sessionReviews', name: 'Session Reviews', desc: 'End-of-class reviews and surveys from the student.', icon: 'fa-star-half-alt text-yellow-500' },
                                    { id: 'spacedRepetition', name: 'Flashcards', desc: 'Spaced memory flashcards queued for review.', icon: 'fa-layer-group text-pink-500' },
                                    { id: 'chatsTemplate', name: 'Chat Dialog', desc: 'Personalized chat dialog styled inside phone bubbles.', icon: 'fa-comments text-teal-500' },
                                ].map((comp) => {
                                    const isSelected = selectedComponents.includes(comp.id);
                                    return (
                                        <button
                                            key={comp.id}
                                            onClick={() => handleToggleComponent(comp.id)}
                                            className={`w-full flex items-start gap-2.5 p-2 rounded-lg border text-left transition-all ${
                                                isSelected 
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-xs' 
                                                    : 'bg-white border-gray-100 hover:border-gray-200 text-gray-500'
                                            }`}
                                        >
                                            <div className="mt-1">
                                                {isSelected ? (
                                                    <span className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center text-white text-[10px]">
                                                        <i className="fas fa-check"></i>
                                                    </span>
                                                ) : (
                                                    <span className="w-4 h-4 rounded border border-gray-300 block bg-white"></span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <i className={`fas ${comp.icon} text-xs`}></i>
                                                    <span className="text-xs font-semibold truncate text-gray-800">{comp.name}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 leading-tight truncate mt-0.5">{comp.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Report actions */}
                    <div className="pt-4 border-t border-gray-200 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleSaveAsImage}
                                className="bg-brand-blue text-white font-bold py-2.5 px-3 rounded-lg hover:bg-blue-600 text-xs flex items-center justify-center gap-1.5 shadow-xs"
                            >
                                <i className="fas fa-camera"></i>
                                Save Image
                            </button>
                            <button
                                onClick={handlePrintPdf}
                                className="bg-emerald-600 text-white font-bold py-2.5 px-3 rounded-lg hover:bg-emerald-700 text-xs flex items-center justify-center gap-1.5 shadow-xs"
                            >
                                <i className="fas fa-print"></i>
                                Print PDF
                            </button>
                        </div>
                        <button
                            onClick={handleEmailFlow}
                            disabled={emailButtonState === 'generating'}
                            className="w-full bg-brand-purple text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            <i className="fas fa-envelope"></i>
                            {emailButtonState === 'generating' ? 'Analyzing...' : emailButtonState === 'generated' ? 'Paste & Send Email 🚀' : 'Export & Email'}
                        </button>
                    </div>
                </div>

                {/* 2. REPORT PREVIEW INTERFACE (Right Content Sandbox) */}
                <div className="lg:col-span-8 bg-gray-100 p-4 rounded-xl border border-gray-200 overflow-y-auto max-h-[85vh]">
                    <div id="printable-report-area" ref={certificateRef} className={styling.container}>
                        
                        {/* Certificate Gold/Watermark Ring Decorations */}
                        {isOfficial && (
                            <>
                                <div className="absolute top-4 left-4 right-4 bottom-4 border border-amber-300 pointer-events-none" style={{ borderStyle: 'solid' }}></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-50/20" style={{ zIndex: 0 }}>
                                    <i className="fas fa-hotel text-[25vw]" />
                                </div>
                                <div className="absolute bottom-6 right-6 text-center opacity-80 z-10" aria-hidden="true">
                                    <i className="fas fa-stamp text-5xl text-amber-600"></i>
                                    <p className="text-[9px] font-bold text-amber-700 mt-1 tracking-widest uppercase">ACADEMIC STANDING</p>
                                </div>
                            </>
                        )}
                        {/* Large, beautiful golden watermark medal seal background ornament */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.035] text-amber-500 pointer-events-none select-none z-0" style={{ pointerEvents: 'none' }}>
                            <i className="fas fa-medal text-[35rem]" />
                        </div>

                        {isDuolingo && (
                            <>
                                <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-yellow-400 opacity-20 animate-pulse"></div>
                                <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-100 rounded-full opacity-30"></div>
                                <div className="absolute bottom-12 right-12 text-center opacity-30 pointer-events-none" aria-hidden="true">
                                    <i className="fas fa-graduation-cap text-8xl text-emerald-400"></i>
                                </div>
                            </>
                        )}

                        <div className="relative z-10 space-y-6">
                            
                            {/* Prominent Custom Report Banner */}
                            {reportBannerPosition === 'top' && renderBannerContent()}

                            {/* Certificate Headers */}
                            <div className="text-center font-sans">
                                <h3 className={`text-4xl md:text-5xl font-black uppercase tracking-tight ${styling.header}`}>
                                    Class Report
                                </h3>
                                {session.lessonName && (
                                    <p className="text-sm md:text-base font-extrabold text-indigo-600 mt-2 tracking-wide uppercase">
                                        📖 Lesson Focus: {session.lessonName}
                                    </p>
                                )}
                                <p className="text-xs font-semibold mt-1 opacity-75">
                                    {new Date(session.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                                </p>
                                <p className="text-base font-extrabold mt-2 tracking-wide uppercase text-slate-800 dark:text-slate-100">
                                    <span className="font-black underline">{learnerName}</span>
                                </p>
                            </div>

                            {/* WIDGET 1: OVERVIEW & ENGAGEMENT */}
                            {selectedComponents.includes('overview') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>1. Session Overview</h4>
                                        <i className="fas fa-info-circle"></i>
                                    </div>
                                    <div className="space-y-4">
                                        {/* Row 2: Lesson Summary & Notes (side-by-side) */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Lesson Summary */}
                                            {(session.aiAnalysis?.revisedLessonSummary || session.lessonSummary) && (() => {
                                                const rawText = session.aiAnalysis?.revisedLessonSummary || session.lessonSummary || '';
                                                let timelineItems: string[] = [];
                                                if (rawText) {
                                                    timelineItems = rawText
                                                        .split(/(?:\r?\n|•|^-|\d+\.\s+)/)
                                                        .map(item => item.trim())
                                                        .filter(item => item.replace(/^[•\s\-\d\.]+/g, '').trim().length > 3);
                                                    
                                                    if (timelineItems.length <= 1) {
                                                        timelineItems = rawText
                                                            .split(/(?<=\w\w\.)\s+/)
                                                            .map(s => s.trim())
                                                            .filter(s => s.replace(/^[•\s\-\d\.]+/g, '').trim().length > 3);
                                                    }
                                                }
                                                return (
                                                    <div className={`p-4 text-xs leading-relaxed ${styling.accentBg} rounded-xl border border-current/5 flex flex-col justify-between shadow-xs`}>
                                                        <div>
                                                            <p className={`font-extrabold ${isDark ? 'text-indigo-400' : 'text-indigo-900'} block mb-3 uppercase tracking-wider text-[10px]`}>Lesson Summary</p>
                                                            {timelineItems.length > 0 ? (
                                                                <div className={`relative pl-5 border-l-2 ${isDark ? 'border-slate-800' : 'border-indigo-150'} ml-2 space-y-3.5 my-2`}>
                                                                    {timelineItems.map((item, idx) => {
                                                                        const cleanItem = item.replace(/^[•\s\-\d\.]+/g, '').trim();
                                                                        return (
                                                                            <div key={idx} className="relative group transition-all duration-300">
                                                                                {/* Indicator Dot */}
                                                                                <div className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 ${isDark ? 'border-slate-950 bg-indigo-500' : 'border-white bg-indigo-600'} group-hover:bg-pink-505 shadow-xs transition-colors duration-350`}></div>
                                                                                <div>
                                                                                    <span className={`text-[9px] font-black uppercase ${isDark ? 'text-indigo-400' : 'text-indigo-600'} tracking-wider`}>
                                                                                        Milestone {idx + 1}
                                                                                    </span>
                                                                                    <p className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'} mt-0.5 leading-relaxed`}>
                                                                                        {cleanItem}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <p className={`font-serif text-sm flex-grow ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>"{rawText}"</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Notes instead of Coach's Notes */}
                                            {session.aiAnalysis?.summary && (
                                                <div className={`p-4 text-xs leading-relaxed italic ${isDark ? 'bg-amber-950/20 border-amber-900/30' : 'bg-amber-50/50 border-amber-200/50'} rounded-xl border flex flex-col justify-between shadow-xs`}>
                                                    <p className={`font-extrabold ${isDark ? 'text-amber-400' : 'text-amber-900'} block mb-1.5 uppercase tracking-wider text-[10px]`}>Notes</p>
                                                    <p className={`font-serif text-sm flex-grow ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>"{session.aiAnalysis.summary}"</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 3: Mastery Level (full-width below) */}
                                        <div className="w-full">
                                            <MasteryGauge 
                                                level={Number(session.aiAnalysis?.masteryLevel) || 85} 
                                                previousLevel={previousSession ? (Number(previousSession.aiAnalysis?.masteryLevel) || 85) : undefined}
                                                justification={session.aiAnalysis?.masteryJustification || 'Outstanding session performance'}
                                                darkTheme={isDark}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* NEW GADGET: ENGAGEMENT & RANK */}
                            {selectedComponents.includes('engagementLeaderboard') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>Leaderboard & Engagement Overview</h4>
                                        <i className="fas fa-user-clock text-rose-500 animate-pulse"></i>
                                    </div>
                                    
                                    {/* Stat Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 font-sans text-xs">
                                        {/* XP Points */}
                                        <div className="p-4 rounded-xl flex flex-col items-center justify-center text-center bg-purple-50 dark:bg-purple-950/20 text-purple-750 dark:text-purple-300 border border-purple-200/50 dark:border-purple-900/50 shadow-xs">
                                            <div className="text-3xl mb-2">✨</div>
                                            <div className="text-2xl font-black">{learner.xp || 0}</div>
                                            <div className="font-extrabold uppercase tracking-widest text-[9px] opacity-80 mt-1">XP Points</div>
                                        </div>
                                        {/* Streak */}
                                        <div className="p-4 rounded-xl flex flex-col items-center justify-center text-center bg-orange-50 dark:bg-orange-950/20 text-orange-750 dark:text-orange-300 border border-orange-200/50 dark:border-orange-900/50 shadow-xs">
                                            <div className="text-3xl mb-2">🔥</div>
                                            <div className="text-2xl font-black">{learner.streak || 0}</div>
                                            <div className="font-extrabold uppercase tracking-widest text-[9px] opacity-80 mt-1">Session Streak</div>
                                        </div>
                                        {/* Total Hours */}
                                        <div className="p-4 rounded-xl flex flex-col items-center justify-center text-center bg-blue-50 dark:bg-blue-950/20 text-blue-750 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50 shadow-xs">
                                            <div className="text-3xl mb-2">⏰</div>
                                            <div className="text-2xl font-black">{totalHours}</div>
                                            <div className="font-extrabold uppercase tracking-widest text-[9px] opacity-80 mt-1">Total Hours</div>
                                        </div>
                                        {/* Last Seen */}
                                        <div className="p-4 rounded-xl flex flex-col items-center justify-center text-center bg-green-50 dark:bg-green-950/20 text-green-750 dark:text-green-300 border border-green-200/50 dark:border-green-900/50 shadow-xs">
                                            <div className="text-3xl mb-2">{lastSeenData.lastSeenEmoji}</div>
                                            <div className="text-2xl font-black">{lastSeenData.lastSeen}</div>
                                            <div className="font-extrabold uppercase tracking-widest text-[9px] opacity-80 mt-1">Last Seen</div>
                                        </div>
                                    </div>

                                    {/* Leaderboard Section */}
                                    <div className="border-t border-current/10 pt-4 mt-2">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                                            <h5 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100">Leaderboard Position</h5>
                                            <div className="flex gap-1 bg-gray-150 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
                                                <button onClick={() => setLeaderboardPeriod('all')} className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${leaderboardPeriod === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-650 shadow-xs' : 'text-slate-500'}`}>All-Time</button>
                                                <button onClick={() => setLeaderboardPeriod('week')} className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${leaderboardPeriod === 'week' ? 'bg-white dark:bg-slate-700 text-indigo-650 shadow-xs' : 'text-slate-500'}`}>This Week</button>
                                                <button onClick={() => setLeaderboardPeriod('month')} className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${leaderboardPeriod === 'month' ? 'bg-white dark:bg-slate-700 text-indigo-650 shadow-xs' : 'text-slate-500'}`}>This Month</button>
                                            </div>
                                        </div>
                                        {leaderboard ? (
                                            <div className="space-y-1.5 font-sans text-xs">
                                                {leaderboard.above && (
                                                    <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50/50 dark:bg-slate-900/30 text-xs border border-gray-100 dark:border-slate-800">
                                                        <span className="font-bold w-6 text-center text-gray-500">{leaderboard.current.rank - 1}</span>
                                                        <span className="flex-1 font-semibold text-slate-750 dark:text-slate-350">{leaderboard.above.name}</span>
                                                        <span className="font-bold text-gray-500">{leaderboard.above.xp} XP</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-100/80 dark:bg-purple-950/40 border-2 border-brand-purple text-sm shadow-xs font-black text-brand-purple dark:text-purple-305">
                                                    <span className="w-6 text-center flex items-center justify-center">
                                                        <i className="fas fa-star text-yellow-500 mr-1"></i>{leaderboard.current.rank}
                                                    </span>
                                                    <span className="flex-1">{leaderboard.current.name} (You)</span>
                                                    <span>{leaderboard.current.xp} XP</span>
                                                </div>
                                                {leaderboard.below && (
                                                    <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50/50 dark:bg-slate-900/30 text-xs border border-gray-100 dark:border-slate-800">
                                                        <span className="font-bold w-6 text-center text-gray-500">{leaderboard.current.rank + 1}</span>
                                                        <span className="flex-1 font-semibold text-slate-755 dark:text-slate-350">{leaderboard.below.name}</span>
                                                        <span className="font-bold text-gray-500">{leaderboard.below.xp} XP</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-center text-xs text-gray-400 italic p-3">You are not ranked for this period.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedComponents.includes('focusLearnings') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>Focus & Learnings</h4>
                                        <i className="fas fa-graduation-cap"></i>
                                    </div>
                                    <div className="flex flex-col gap-4 font-sans text-xs">
                                        {/* Column 1: Strengths / Good Work */}
                                        <div className="bg-gradient-to-br from-emerald-50/80 to-green-50/20 dark:from-emerald-950/30 dark:to-green-950/10 p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 relative overflow-hidden flex flex-col justify-between">
                                            <div className="absolute -right-3 -bottom-5 opacity-[0.08] text-8xl pointer-events-none select-none">
                                                💪
                                            </div>
                                            <div className="space-y-3 relative z-10">
                                                <p className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                                                    <span>💪</span> Good Work
                                                </p>
                                                <div className="space-y-1.5">
                                                    {((session.skillsLearned || session.aiAnalysis?.strengths || []).slice(0, 4)).length > 0 ? (
                                                        (session.skillsLearned || session.aiAnalysis?.strengths || []).slice(0, 4).map((str: string, sIdx: number) => (
                                                            <div key={sIdx} className="p-2.5 bg-white/95 dark:bg-slate-900/90 border border-emerald-150 dark:border-emerald-950 text-emerald-950 dark:text-emerald-50 rounded-lg flex items-start gap-2 font-bold text-xs shadow-xs">
                                                                <span className="text-emerald-500 font-extrabold text-[10px] mt-0.5">●</span>
                                                                <span className="whitespace-normal break-words leading-relaxed" title={str}>{str}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold italic">No items noted</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: Weaknesses / Needs Practice */}
                                        <div className="bg-gradient-to-br from-rose-50/80 to-red-50/20 dark:from-rose-950/30 dark:to-red-950/10 p-4 rounded-xl border border-rose-200/60 dark:border-rose-900/50 relative overflow-hidden flex flex-col justify-between font-sans text-xs">
                                            <div className="absolute -right-3 -bottom-5 opacity-[0.08] text-8xl pointer-events-none select-none">
                                                ⚠️
                                            </div>
                                            <div className="space-y-3 relative z-10">
                                                <p className="text-xs font-black uppercase text-rose-900 dark:text-rose-455 tracking-wider flex items-center gap-1.5">
                                                    <span>⚠️</span> Needs Practice
                                                </p>
                                                <div className="space-y-1.5">
                                                    {((session.needsHelp || session.aiAnalysis?.weaknesses || []).slice(0, 4)).length > 0 ? (
                                                        (session.needsHelp || session.aiAnalysis?.weaknesses || []).slice(0, 4).map((weak: string, wIdx: number) => (
                                                            <div key={wIdx} className="p-2.5 bg-white/95 dark:bg-slate-900/90 border border-red-150 dark:border-red-950 text-red-950 dark:text-red-50 rounded-lg flex items-start gap-2 font-bold text-xs shadow-xs">
                                                                <span className="text-rose-500 font-extrabold text-[10px] mt-0.5">●</span>
                                                                <span className="whitespace-normal break-words leading-relaxed" title={weak}>{weak}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold italic">Perfect session!</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 3: Key Learnings / New Lessons */}
                                        <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/20 dark:from-indigo-950/30 dark:to-blue-950/10 p-4 rounded-xl border border-indigo-200/60 dark:border-indigo-900/50 relative overflow-hidden flex flex-col justify-between font-sans text-xs">
                                            <div className="absolute -right-3 -bottom-5 opacity-[0.08] text-8xl pointer-events-none select-none">
                                                💡
                                            </div>
                                            <div className="space-y-3 relative z-10">
                                                <p className="text-xs font-black uppercase text-indigo-900 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                                                    <span>💡</span> New Lessons
                                                </p>
                                                <div className="space-y-1.5">
                                                    {((session.aiAnalysis?.keyLearnings || session.aiAnalysis?.recommendations || []).slice(0, 4)).length > 0 ? (
                                                        (session.aiAnalysis?.keyLearnings || session.aiAnalysis?.recommendations || []).slice(0, 4).map((learn: string, lIdx: number) => (
                                                            <div key={lIdx} className="p-2.5 bg-white/95 dark:bg-slate-900/90 border border-indigo-150 dark:border-indigo-950 text-indigo-950 dark:text-indigo-50 rounded-lg flex items-start gap-2 font-bold text-xs shadow-xs">
                                                                <span className="text-indigo-500 font-extrabold text-[10px] mt-0.5">●</span>
                                                                <span className="whitespace-normal break-words leading-relaxed" title={learn}>{learn}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold italic">No items noted</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 2: COMPETENCY RADAR CHART */}
                            {selectedComponents.includes('competency') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>2. Competency Profile</h4>
                                        <i className="fas fa-atom"></i>
                                    </div>
                                    <div className="w-full h-64 md:h-72">
                                        {learner.competencies && learner.competencies.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={240}>
                                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={competenciesData}>
                                                    <PolarGrid stroke={isDark ? "#334155" : "#cbd5e1"} />
                                                    <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#94a3b8' : '#334155', fontSize: 10 }} />
                                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: isDark ? '#94a3b8' : '#334155' }} />
                                                    <Radar name="Active Skills" dataKey="A" stroke="#4f46e5" fill="#818cf8" fillOpacity={0.6} />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-xs text-gray-400">
                                                No competencies defined for this profile.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                                                           {/* WIDGET 3: REVIEW (ACHIEVEMENTS) */}
                            {selectedComponents.includes('achievements') && (
                                <div className={`${styling.subCard} overflow-hidden relative font-sans`}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20 relative z-10">
                                        <h4 className={styling.heading}>Review</h4>
                                        <i className="fas fa-clipboard-check text-indigo-500"></i>
                                    </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                    
                                    {/* 1. 👍 GOOD THINGS (Award Badges) */}
                                    <div className="bg-gradient-to-br from-amber-50/50 to-yellow-50/20 p-4 rounded-2xl border border-yellow-250 relative overflow-hidden flex flex-col justify-between min-h-[160px] shadow-xs">
                                        <div className="absolute -right-3 -bottom-5 opacity-[0.08] text-8xl pointer-events-none select-none">
                                            👍
                                        </div>
                                        <div className="space-y-3 relative z-10">
                                            <p className="text-xs font-black uppercase text-amber-805 tracking-wider flex items-center gap-1.5 font-sans">
                                                <span>👍</span> Good Things
                                            </p>
                                            
                                            <div className="space-y-1.5">
                                                {session.badges && session.badges.length > 0 ? (
                                                    session.badges.map((b: any, index: number) => {
                                                        const bName = typeof b === 'string' ? b : b.name;
                                                        const bDesc = typeof b === 'string' ? 'Custom Session Achievement' : (b.description || 'Custom session achievement.');
                                                        let badgeEmoji = '🏅';
                                                        if (bName?.toLowerCase() === 'on time') badgeEmoji = '⏰';
                                                        else if (bName?.toLowerCase() === 'ready!') badgeEmoji = '📚';
                                                        else if (bName?.toLowerCase() === 'speaks alot!') badgeEmoji = '🗣️';
                                                        else if (bName?.toLowerCase() === 'homework hero') badgeEmoji = '🎓';
                                                        else if (bName?.toLowerCase() === 'dedicated') badgeEmoji = '🔥';
                                                        
                                                        return (
                                                            <div key={index} className="p-2 bg-gradient-to-br from-amber-400 to-yellow-300 border border-amber-500 text-slate-950 rounded-xl flex items-center gap-2 font-bold text-xs shadow-3xs">
                                                                <span>{badgeEmoji}</span>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-extrabold truncate leading-tight">{bName}</p>
                                                                    <p className="text-[8px] opacity-80 leading-normal truncate font-medium">{bDesc}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="p-3 border border-slate-200 bg-white/40 border-dashed rounded-xl flex flex-col items-center justify-center text-center py-4 opacity-75">
                                                        <p className="text-[10px] text-slate-500 font-bold">No good behaviour items logged</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                     {/* 2. 👎 BAD THINGS (Penalties) */}
                                    <div className="bg-gradient-to-br from-rose-50/50 to-red-50/20 p-4 rounded-xl border border-rose-250 relative overflow-hidden flex flex-col justify-between min-h-[160px] shadow-xs">
                                        <div className="absolute -right-3 -bottom-4 opacity-[0.08] text-8xl pointer-events-none select-none">
                                            👎
                                        </div>
                                        <div className="space-y-3 relative z-10 font-sans">
                                            <p className="text-xs font-black uppercase text-rose-850 tracking-wider flex items-center gap-1.5">
                                                <span>👎</span> Bad Things
                                            </p>
                                            
                                            <div className="space-y-1.5">
                                                {session.penalties && session.penalties.length > 0 ? (
                                                    session.penalties.map((p: any, index: number) => {
                                                        const pName = typeof p === 'string' ? p : p.name;
                                                        let penaltyEmoji = '🚨';
                                                        if (pName?.toLowerCase().includes('late')) penaltyEmoji = '⏰';
                                                        else if (pName?.toLowerCase().includes('not ready')) penaltyEmoji = '❌';
                                                        else if (pName?.toLowerCase().includes('distracted')) penaltyEmoji = '⚠️';
                                                        
                                                        return (
                                                            <div key={index} className="p-2 border border-red-200 bg-red-100 text-red-950 rounded-xl flex items-center gap-2 font-bold text-xs shadow-3xs">
                                                                <span className="text-rose-600 font-extrabold text-sm">{penaltyEmoji}</span>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-extrabold truncate leading-tight">{pName}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="p-3 border border-slate-200 bg-white/40 border-dashed rounded-xl flex flex-col items-center justify-center text-center py-4 opacity-75">
                                                        <p className="text-[10px] text-slate-500 font-bold">Perfect record! No bad things logged</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
 
                                </div>
                            </div>
                            )}

                            {/* WIDGET: SENTIMENT & EMOTION ANALYSIS */}
                            {selectedComponents.includes('sentimentEmotion') && session.aiAnalysis?.emotionalFeeling && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>Sentiment & Emotion Analysis</h4>
                                        <i className="fas fa-heart text-purple-500"></i>
                                    </div>
                                    {(() => {
                                        const emo = session.aiAnalysis?.emotionalFeeling;
                                        if (!emo) return <p className="text-xs text-gray-400 italic">No sentiment data available.</p>;
                                        
                                        const scoreColor = emo.sentimentScore >= 75 ? '#10b981' : emo.sentimentScore >= 50 ? '#f59e0b' : '#ef4444';
                                        const selMetrics = [
                                            { label: 'Confidence', score: emo.confidenceScore, color: emo.confidenceScore >= 70 ? 'bg-emerald-500' : emo.confidenceScore >= 45 ? 'bg-amber-500' : 'bg-rose-500' },
                                            { label: 'Anxiety', score: emo.anxietyScore, color: emo.anxietyScore > 60 ? 'bg-rose-500' : emo.anxietyScore > 35 ? 'bg-orange-400' : 'bg-emerald-500', invert: true },
                                            { label: 'Risk-Taking', score: emo.riskTakingScore, color: emo.riskTakingScore >= 70 ? 'bg-emerald-500' : emo.riskTakingScore >= 45 ? 'bg-amber-500' : 'bg-rose-500' },
                                            { label: 'Motivation', score: emo.motivationScore, color: emo.motivationScore >= 70 ? 'bg-emerald-500' : emo.motivationScore >= 45 ? 'bg-amber-500' : 'bg-rose-500' },
                                        ];
                                        
                                        return (
                                            <div className="space-y-4 font-sans">
                                                {/* Sentiment Gauge */}
                                                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-purple-50/70'} border ${isDark ? 'border-slate-700' : 'border-purple-200'}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
                                                            <span className="text-lg mr-1">{emo.dominantEmotion === 'Confident' ? '💪' : emo.dominantEmotion === 'Anxious' ? '😰' : emo.dominantEmotion === 'Curious' ? '🤔' : emo.dominantEmotion === 'Frustrated' ? '😤' : emo.dominantEmotion === 'Eager' ? '🤩' : emo.dominantEmotion === 'Hesitant' ? '😐' : emo.dominantEmotion === 'Engaged' ? '🙋' : emo.dominantEmotion === 'Discouraged' ? '😞' : emo.dominantEmotion === 'Enthusiastic' ? '🔥' : '😊'}</span>
                                                            {emo.dominantEmotion || 'Neutral'}
                                                        </span>
                                                        <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{emo.sentimentScore}/100</span>
                                                    </div>
                                                    <div className="w-full h-4 bg-gray-200/50 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${emo.sentimentScore}%`, background: `linear-gradient(90deg, #8b5cf6, ${scoreColor})` }}></div>
                                                    </div>
                                                    {emo.analysis && <p className={`text-[11px] mt-2 italic leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>"{emo.analysis}"</p>}
                                                </div>
                                                
                                                {/* SEL Metrics Grid */}
                                                <div className="grid grid-cols-2 gap-2.5">
                                                    {selMetrics.map(m => (
                                                        <div key={m.label} className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-150'} border`}>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{m.label}</span>
                                                                <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{m.score}/100</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-gray-200/40 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.invert ? 100 - m.score : m.score}%` }}></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                {/* Timeline */}
                                                {(emo as any).timeline && (emo as any).timeline.length > 0 && (
                                                    <div className="space-y-2">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-800'}`}>⏱️ Session Mood Timeline</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(emo as any).timeline.map((t: any, i: number) => (
                                                                <div key={i} className={`flex-1 min-w-[120px] p-2.5 rounded-xl border text-center ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-150'}`}>
                                                                    <span className="text-lg block">{t.emoji}</span>
                                                                    <span className={`text-[9px] font-black uppercase block ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>{t.phase}</span>
                                                                    <span className={`text-xs font-bold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t.mood}</span>
                                                                    <span className={`text-[9px] block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t.description}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Transferable Skills */}
                                                {emo.transferableSkills && emo.transferableSkills.length > 0 && (
                                                    <div className="space-y-2">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>🌟 Transferable Skills</span>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {emo.transferableSkills.map((ts: any, i: number) => (
                                                                <div key={i} className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-150'}`}>
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{ts.skill}</span>
                                                                        <span className="text-[10px] font-black text-emerald-500">{ts.score}%</span>
                                                                    </div>
                                                                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>"{ts.evidence}"</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* WIDGET 4: PROGRESS OVER TIME MAP */}
                            {selectedComponents.includes('progress') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>4. Progressive Growth</h4>
                                        <i className="fas fa-chart-line"></i>
                                    </div>
                                    <div className="w-full h-48 md:h-56">
                                        <ResponsiveContainer width="100%" height={180}>
                                            <LineChart data={historicalProgressData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                                                <XAxis dataKey="name" tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 10 }} />
                                                <YAxis tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 10 }} />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="xp" stroke="#e11d48" strokeWidth={3} activeDot={{ r: 8 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 5: COURSE PLAN ROADMAP */}
                            {selectedComponents.includes('learningPath') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>5. Course Syllabus</h4>
                                        <i className="fas fa-map-marked-alt"></i>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-center text-[10px]">
                                        {learner.needs && learner.needs.length > 0 ? (
                                            learner.needs.slice(0, 4).map((need, idx) => {
                                                const isCompleted = need.status === 'resolved' || need.rating > 4;
                                                const isBeingAddressed = need.status === 'addressing' || idx === 0 || (session.aiAnalysis?.newSkills || []).some((ns: any) => ns.linkedNeed?.toLowerCase() === need.name?.toLowerCase());
                                                
                                                const statusColor = isCompleted 
                                                    ? 'bg-emerald-500 text-white rounded-xl' 
                                                    : isBeingAddressed 
                                                    ? 'bg-indigo-600 text-white rounded-xl' 
                                                    : 'border border-current/20 rounded-xl bg-slate-50/10 opacity-75';
                                                
                                                const statusLabel = isCompleted 
                                                    ? '✓ COMPLETED' 
                                                     : isBeingAddressed 
                                                     ? '⭐ ACTIVE' 
                                                     : 'PENDING';

                                                const topSkill = (need.learningPath && need.learningPath.length > 0) 
                                                    ? need.learningPath[0].name 
                                                    : 'General Dialogue Development';

                                                return (
                                                    <div key={need.id || idx} className={`p-3 flex flex-col justify-between min-h-[90px] shadow-2xs ${statusColor}`}>
                                                        <div>
                                                            <span className="block font-black uppercase text-[8px] opacity-80">Module {idx + 1}</span>
                                                            <span className="block font-extrabold text-xs truncate mt-0.5" title={need.name}>{need.name}</span>
                                                            <span className="block truncate opacity-90 mt-1 font-serif italic text-[11px]" title={topSkill}>{topSkill}</span>
                                                        </div>
                                                        <span className="font-extrabold text-[8px] uppercase mt-2 block tracking-wider">{statusLabel}</span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="col-span-full py-4 text-xs italic text-gray-400">
                                                No syllabus modules defined in learner profile.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 6: KNOWLEDGE SKILL TREE */}
                            {selectedComponents.includes('skillTree') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>6. Linguistic Skill Tree</h4>
                                        <i className="fas fa-network-wired"></i>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-2">
                                        <div className="flex items-center justify-center bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md">
                                            <span>CEFR Benchmark: {learner.cefrLevel || 'B2'}</span>
                                        </div>
                                        <div className="w-1.5 h-6 bg-indigo-400"></div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                                            <div className="border-t-2 border-indigo-400 p-2 text-center">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center mx-auto text-xs">A</div>
                                                <p className="text-[10px] font-bold mt-1">Discourse</p>
                                                <p className="text-[8px] text-gray-400">Mastered</p>
                                            </div>
                                            <div className="border-t-2 border-indigo-400 p-2 text-center">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center mx-auto text-xs">S</div>
                                                <p className="text-[10px] font-bold mt-1">Grammar</p>
                                                <p className="text-[8px] text-gray-400">Fluent</p>
                                            </div>
                                            <div className="border-t-2 border-indigo-400 p-2 text-center">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center mx-auto text-xs">B</div>
                                                <p className="text-[10px] font-bold mt-1">Vocabulary</p>
                                                <p className="text-[8px] text-gray-400">Active Practice</p>
                                            </div>
                                            <div className="border-t-2 border-indigo-400 p-2 text-center">
                                                <div className="w-8 h-8 rounded-full bg-red-100 text-red-800 font-extrabold flex items-center justify-center mx-auto text-xs">P</div>
                                                <p className="text-[10px] font-bold mt-1">Phonology</p>
                                                <p className="text-[8px] text-gray-400">Struggling</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 7: ACTIVE HEAT MAP GRID */}
                            {selectedComponents.includes('heatmap') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>7. Contribution Heatmap</h4>
                                        <i className="fas fa-th"></i>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="grid grid-cols-7 gap-1">
                                            {Array.from({ length: 28 }).map((_, idx) => {
                                                const hasSession = idx === 3 || idx === 10 || idx === 17 || idx === 19 || idx === 24;
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`w-6 h-6 rounded ${
                                                            hasSession ? 'bg-emerald-500 border border-emerald-600' : isDark ? 'bg-slate-900' : 'bg-gray-200'
                                                        }`}
                                                        title={hasSession ? "Class Attended!" : "No Class Record"}
                                                    ></div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] tracking-wide text-gray-400 mt-2">Active attendance clusters over recent 4 calendar weeks</p>
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 8: PERFORMANCE RECORDS INDEX */}
                            {selectedComponents.includes('records') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>8. Performance Index</h4>
                                        <i className="fas fa-list-ol"></i>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                        <div>
                                            <p className="text-[10px] opacity-75">Streak Index</p>
                                            <p className="text-xl font-black text-rose-500">🔥 {learner.streak || 5} Days</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] opacity-75 font-normal">Active Rank Score</p>
                                            <p className="text-xl font-black text-amber-500">🏆 {learner.xp || 120} XP</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] opacity-75 font-normal">Registered Level</p>
                                            <p className="text-xl font-black text-indigo-500">⭐ {learner.level || 1}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] opacity-75 font-normal font-mono">Sessions Met</p>
                                            <p className="text-xl font-black text-emerald-500">✓ {learner.sessions?.length || 1}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 9: TERM SCHEDULING CALENDAR */}
                            {selectedComponents.includes('calendar') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>9. Calendar Tracker</h4>
                                        <i className="fas fa-calendar-day"></i>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] text-gray-400">
                                        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                                        {Array.from({ length: 35 }).map((_, idx) => {
                                            const day = idx - 2;
                                            const isTodaySession = day === new Date(session.date).getDate();
                                            const isPastSession = day === 5 || day === 12 || day === 15;
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className={`p-1 border rounded ${
                                                        isTodaySession 
                                                            ? 'bg-blue-600 text-white font-extrabold border-blue-700' 
                                                            : isPastSession 
                                                            ? 'bg-emerald-100 text-emerald-950 border-emerald-200' 
                                                            : 'bg-transparent border-current/5'
                                                    }`}
                                                >
                                                    {day > 0 && day <= 30 ? day : ''}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 10: WEEKLY CHALLENGE BOARD */}
                            {selectedComponents.includes('challengeBoard') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>10. Weekly Challenge</h4>
                                        <i className="fas fa-tasks"></i>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="p-2 bg-orange-50 border border-orange-200 rounded text-orange-950 text-[11px] space-y-1">
                                            <p className="font-bold">🎯 Verbal Fluency Blitz:</p>
                                            <p className="italic">Speak continuously for 4 minutes during roleplay challenges without long breaks.</p>
                                            <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-bold">Reward +40 XP</span>
                                        </div>
                                        <div className="p-2 bg-purple-50 border border-purple-200 rounded text-purple-950 text-[11px] space-y-1">
                                            <p className="font-bold">🎯 Grammar Revision Quest:</p>
                                            <p className="italic">Complete the homework drill regarding irregular direct objects perfectly.</p>
                                            <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">Reward +35 XP</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 11: DAILY COMPETITION LEADERBOARD */}
                            {selectedComponents.includes('competition') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>11. Arena Placements</h4>
                                        <i className="fas fa-gamepad"></i>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="p-2 bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300 text-amber-950 rounded font-bold">
                                            <p className="text-[9px] uppercase tracking-normal">Win streak</p>
                                            <p className="text-base font-extrabold">🏆 {learner.competitionWins || 3} Wins</p>
                                        </div>
                                        <div className="p-2 bg-slate-100 border border-gray-300 text-slate-900 rounded font-bold">
                                            <p className="text-[9px] uppercase tracking-normal">Status Rank</p>
                                            <p className="text-base font-extrabold text-blue-600">Level {learner.level || 1}</p>
                                        </div>
                                        <div className="p-2 bg-indigo-100 border border-indigo-300 text-indigo-950 rounded font-bold">
                                            <p className="text-[9px] uppercase tracking-normal">Arena Tier</p>
                                            <p className="text-base font-extrabold text-indigo-600">Bronze Division</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 12: AUTOMATION & FINANCE ACCRUAL */}
                            {selectedComponents.includes('automation') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>12. Invoice Standing</h4>
                                        <i className="fas fa-file-invoice-dollar"></i>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-950 rounded flex justify-between items-center font-bold">
                                            <div>
                                                <p className="text-[10px] uppercase opacity-75 font-normal">Pending Invoice Dues</p>
                                                <p className="text-lg font-black text-rose-600">$0.00 (No current debt)</p>
                                            </div>
                                            <i className="fas fa-receipt text-rose-600 text-lg"></i>
                                        </div>
                                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded flex justify-between items-center font-bold">
                                            <div>
                                                <p className="text-[10px] uppercase opacity-75 font-normal">Booked Pre-paid Hours</p>
                                                <p className="text-lg font-black text-emerald-600">{((learner as any).plan?.totalSessions || 10)} Hours Balance</p>
                                            </div>
                                            <i className="fas fa-hourglass-half text-emerald-600 text-lg"></i>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 13: MY GROWTH */}
                            {selectedComponents.includes('competencyUpdates') && (
                                <div className={`${styling.subCard} overflow-hidden`}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>My Growth</h4>
                                        <i className="fas fa-level-up-alt text-emerald-500 animate-bounce"></i>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] text-gray-400 font-semibold font-sans">English skill levels you improved today:</p>
                                        
                                        {/* Updates listing from AI analysis */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            {session.aiAnalysis?.competencyUpdates && session.aiAnalysis.competencyUpdates.length > 0 ? (
                                                session.aiAnalysis.competencyUpdates.map((update: any, idx: number) => {
                                                    const compName = update.competencyName || '';
                                                    const isUp = (update.suggestedProgress || 0) >= 0;
                                                    
                                                    // Map competency name to transparent background emojis and custom styling
                                                    let compEmoji = '🎯';
                                                    let themeBg = 'from-emerald-50 to-teal-50/50 border-emerald-250 text-emerald-950 dark:from-slate-900 dark:to-teal-950/40 dark:border-teal-900';
                                                    if (/speak|dialog|pron|fluent/i.test(compName)) {
                                                        compEmoji = '🗣️';
                                                        themeBg = 'from-sky-50 to-blue-50/50 border-sky-200 text-sky-950 dark:from-slate-900 dark:to-blue-950/40 dark:border-blue-900';
                                                    } else if (/gram|syntax|struct|write/i.test(compName)) {
                                                        compEmoji = '✍️';
                                                        themeBg = 'from-indigo-50 to-violet-50/50 border-indigo-200 text-indigo-950 dark:from-slate-900 dark:to-indigo-950/40 dark:border-indigo-900';
                                                    } else if (/vocab|word|lex/i.test(compName)) {
                                                        compEmoji = '📖';
                                                        themeBg = 'from-amber-50 to-orange-50/40 border-amber-200 text-amber-950 dark:from-slate-900 dark:to-amber-950/40 dark:border-amber-900';
                                                    } else if (/listen|compre/i.test(compName)) {
                                                        compEmoji = '🎧';
                                                        themeBg = 'from-purple-50 to-fuchsia-50/40 border-purple-200 text-purple-950 dark:from-slate-900 dark:to-fuchsia-950/40 dark:border-purple-900';
                                                    }

                                                    return (
                                                        <div key={idx} className={`p-4 rounded-2xl border bg-gradient-to-br ${themeBg} relative overflow-hidden flex flex-col justify-between`}>
                                                            {/* Big transparent background emoji */}
                                                            <div className="absolute -right-3 -bottom-5 opacity-[0.08] text-8xl pointer-events-none select-none">
                                                                {compEmoji}
                                                            </div>
                                                            <div className="relative z-10 space-y-2.5">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-lg">{compEmoji}</span>
                                                                        <p className="text-xs font-black tracking-tight">{compName}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 justify-end">
                                                                            {isUp ? '+' : ''}{update.suggestedProgress || update.suggestedProgressIncrement || 5}% 
                                                                            <i className={`fas ${isUp ? 'fa-caret-up text-emerald-500' : 'fa-caret-down text-rose-500'} text-xs`}></i>
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {update.justification && (
                                                                    <p className="text-[10px] opacity-90 leading-relaxed font-semibold italic text-slate-700 dark:text-slate-350">"{update.justification}"</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-4 border border-slate-200 bg-slate-50 border-dashed rounded-2xl text-center py-6 col-span-full">
                                                    <p className="text-xs text-slate-500 font-bold">No progress milestones logged for this session yet.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* New Skills milestones list */}
                                        {session.aiAnalysis?.newSkills && session.aiAnalysis.newSkills.length > 0 && (
                                            <div className="pt-2 border-t border-dashed border-current/10 space-y-2.5">
                                                <h5 className="text-[11px] font-black uppercase text-indigo-800 dark:text-indigo-400 tracking-wide flex items-center gap-1">
                                                    <span>🚀</span> Skills we practiced
                                                </h5>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {session.aiAnalysis.newSkills.map((skill: any, idx: number) => (
                                                        <div key={idx} className="p-3.5 border border-indigo-150 bg-indigo-50/30 rounded-2xl relative overflow-hidden flex flex-col justify-between dark:bg-indigo-950/40 dark:border-indigo-900">
                                                            <div className="absolute -right-3 -bottom-5 opacity-[0.05] text-7xl pointer-events-none select-none">
                                                                🚀
                                                            </div>
                                                            <div className="relative z-10 space-y-1.5 text-xs text-indigo-950 dark:text-indigo-100">
                                                                <div className="flex justify-between items-start">
                                                                    <p className="font-extrabold text-xs text-indigo-900 dark:text-indigo-400">{skill.skillName}</p>
                                                                    <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-black uppercase px-2 py-0.5 rounded-full">
                                                                        Score: +{skill.suggestedProgress || skill.suggestedProgressIncrement || 10}%
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] leading-relaxed opacity-85 font-semibold">
                                                                    {skill.justification || 'Learned and practiced this skill.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 14: SPEAKING ACTIVE RATIO METRIC */}
                            {selectedComponents.includes('spokenRatio') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>🗣️ Talk Time Ratio</h4>
                                        <i className="fas fa-chart-bar"></i>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs font-black">
                                            <span className="text-[#3c3c3c]">Student Practice Space: {session.spokenTime || 15} mins ({Math.round(((session.spokenTime || 15) / (session.duration || 45)) * 100)}%)</span>
                                            <span className="text-[#58cc02] opacity-80">Tutor Lead: {Math.max(5, (session.duration || 45) - (session.spokenTime || 15))} mins</span>
                                        </div>
                                        <div className="w-full h-4 bg-gray-150 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center" style={{ width: `${Math.round(((session.spokenTime || 15) / (session.duration || 45)) * 100)}%` }}>
                                                Student ({Math.round(((session.spokenTime || 15) / (session.duration || 45)) * 100)}%)
                                            </div>
                                            <div className="h-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center flex-1">
                                                Tutor
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 leading-relaxed font-sans mt-1">
                                            Recommended conversational output ratio is 70%+ student output for optimal retention. Great balance!
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 15: NEW WORDS & GRAMMAR */}
                            {selectedComponents.includes('unlockedVocabulary') && (
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>📚 New Words & Grammar</h4>
                                        <i className="fas fa-book-open text-pink-500"></i>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] mt-1 font-semibold opacity-80 font-sans">New words, phrases, and grammar concepts you learned today:</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-3">
                                            {session.aiAnalysis?.unlockedVocabulary && session.aiAnalysis.unlockedVocabulary.length > 0 ? (
                                                session.aiAnalysis.unlockedVocabulary.map((vocab: any, iIdx: number) => {
                                                    let categoryColor = 'bg-gray-100 text-gray-700 border-gray-200';
                                                    if (vocab.category?.toLowerCase().includes('grammar')) categoryColor = 'bg-blue-50 text-blue-700 border-blue-200';
                                                    else if (vocab.category?.toLowerCase().includes('vocab')) categoryColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                                    else if (vocab.category?.toLowerCase().includes('expression') || vocab.category?.toLowerCase().includes('phrase')) categoryColor = 'bg-purple-50 text-purple-700 border-purple-200';

                                                    return (
                                                        <div key={iIdx} className={`p-3 border rounded-xl relative flex flex-col justify-between ${categoryColor}`}>
                                                            <div>
                                                                <div className="flex items-start justify-between mb-1.5">
                                                                    <p className="font-bold text-sm">"{vocab.word}"</p>
                                                                    {vocab.category && (
                                                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60 border ${categoryColor.split(' ')[2]} shadow-sm`}>
                                                                            {vocab.category}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] font-medium opacity-90 leading-relaxed mt-1">{vocab.definition}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-4 border border-zinc-200 bg-zinc-50 border-dashed rounded-xl col-span-full text-center py-6">
                                                    <p className="text-xs text-zinc-500 font-bold">No new vocabulary or grammar logged for this session yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* WIDGET 16: COURSE PLAN NEXT STEPS */}
                            {selectedComponents.includes('nextSteps') && (<>
                                <div className={styling.subCard}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>🎯 Action Plan</h4>
                                        <i className="fas fa-star text-amber-500"></i>
                                    </div>
                                    <div className="space-y-2.5 text-xs">
                                        <div className="p-3 bg-green-50/30 border border-green-100 rounded-2xl space-y-2">
                                            <p className="font-extrabold text-green-950 block uppercase tracking-wider text-[10px]">Student Priority Tasks:</p>
                                            <div className="space-y-2 font-medium text-gray-700">
                                                {((session.aiAnalysis?.challenges && session.aiAnalysis.challenges.length > 0) 
                                                    ? session.aiAnalysis.challenges 
                                                    : [
                                                        `Review real Corrections & Class Feedback logged for lesson: "${session.lessonName || 'today\'s class'}".`,
                                                        `Practice dialogue loops using newly unlocked target Vocabulary terms.`,
                                                        `Complete any personalized Homework Drill targeting active weaknesses.`
                                                      ]
                                                ).map((task: string, tIdx: number) => (
                                                    <div key={tIdx} className="flex items-start gap-2">
                                                        <input type="checkbox" defaultChecked={tIdx < 2} className="rounded border-gray-300 text-emerald-500 focus:ring-0 w-3.5 h-3.5 mt-0.5" />
                                                        <span className="leading-snug">{task}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-2.5 bg-yellow-50 text-yellow-905 border border-yellow-100 rounded-xl font-bold flex items-center gap-2 text-[10px] dark:bg-amber-950/20 dark:border-amber-900/50">
                                            <span>💡</span>
                                            <span>Momentum booster: Book your next speaking drill session soon to solidify correct habits!</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`${styling.subCard} mt-4`}>
                                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-current/20">
                                        <h4 className={styling.heading}>📝 Exam Package & Essay Correction</h4>
                                        <i className="fas fa-file-invoice text-indigo-500"></i>
                                    </div>
                                    <div className="space-y-4 text-xs">
                                        <p className="text-gray-600 leading-relaxed">
                                            Submit a completed exam ZIP or payload JSON package downloaded from the Mock Test simulator.
                                        </p>

                                        {/* File Uploader */}
                                        <div className="flex items-center justify-center w-full">
                                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-indigo-200 rounded-2xl cursor-pointer bg-indigo-50/20 hover:bg-indigo-50/55 transition-colors group">
                                                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                                                    <i className="fas fa-cloud-upload-alt text-indigo-400 text-2xl mb-1 group-hover:scale-110 transition-transform"></i>
                                                    <p className="text-xs text-indigo-950 font-bold">
                                                        {isUnzipping ? 'Reading Package...' : 'Upload completed_exam_submission.zip / .json'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">Click to browse your device</p>
                                                </div>
                                                <input 
                                                    type="file" 
                                                    accept=".zip,.json" 
                                                    className="hidden" 
                                                    onChange={handleFileUpload} 
                                                    disabled={isUnzipping}
                                                />
                                            </label>
                                        </div>

                                        {zipError && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 font-medium">
                                                ⚠️ {zipError}
                                            </div>
                                        )}

                                        {/* Uploaded Package Details */}
                                        {uploadedExamPayload && (
                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                                <div className="flex items-center justify-between border-b pb-2">
                                                    <span className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider">📦 Exam Package Telemetry</span>
                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-black text-[9px]">Loaded</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-gray-700">
                                                    <div>
                                                        <span className="text-gray-400 block text-[9px] uppercase font-bold">Exam ID / Family</span>
                                                        <span className="font-semibold text-slate-900">{uploadedExamPayload.examFamily || uploadedExamPayload.examId || 'Independent Exam'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 block text-[9px] uppercase font-bold">Completed By</span>
                                                        <span className="font-semibold text-slate-900">{uploadedExamPayload.candidateReference || 'Student'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 block text-[9px] uppercase font-bold">Time Spent</span>
                                                        <span className="font-semibold text-slate-900">
                                                            {uploadedExamPayload.timing ? (
                                                                `${Math.floor(uploadedExamPayload.timing.totalTimeSpentMs / 60000)}m ${Math.floor((uploadedExamPayload.timing.totalTimeSpentMs % 60000) / 1000)}s`
                                                            ) : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 block text-[9px] uppercase font-bold">Focus Deviations</span>
                                                        <span className={`font-semibold ${uploadedExamPayload.focusLossEvents?.length > 0 ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                                                            {uploadedExamPayload.focusLossEvents?.length || 0} alerts
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Focus deviation listing */}
                                                {uploadedExamPayload.focusLossEvents?.length > 0 && (
                                                    <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl space-y-1">
                                                        <span className="text-[10px] font-black text-rose-800 block">⚠️ Security / Focus Infractions logged:</span>
                                                        <ul className="list-disc pl-4 space-y-1 text-[10px] text-rose-900 font-medium">
                                                            {uploadedExamPayload.focusLossEvents.map((ev: any, idx: number) => (
                                                                <li key={idx}>
                                                                    Tab switched or focus lost at {new Date(ev.timestamp).toLocaleTimeString()} (Warned: {ev.isWarning ? 'Yes' : 'No'})
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Essay List from package */}
                                                <div className="pt-3 border-t">
                                                    <span className="font-extrabold text-indigo-950 uppercase text-[10px] tracking-wider block mb-2">✍️ Candidate Writings Found</span>
                                                    {(() => {
                                                        const essayTasks = Object.keys(uploadedExamPayload.answers || {}).filter(taskId => {
                                                            const ans = uploadedExamPayload.answers[taskId];
                                                            return ans && typeof ans.text === 'string' && ans.text.trim().length > 10;
                                                        });

                                                        if (essayTasks.length === 0) {
                                                            return <p className="text-gray-400 italic">No long-form essay answers detected in this package.</p>;
                                                        }

                                                        return (
                                                            <div className="space-y-4">
                                                                {essayTasks.map(taskId => {
                                                                    const ans = uploadedExamPayload.answers[taskId];
                                                                    const isHwCorrecting = isCorrecting[taskId];
                                                                    const correction = essayCorrections[taskId];

                                                                    return (
                                                                        <div key={taskId} className="bg-white p-3 border border-gray-200 rounded-xl space-y-2 shadow-xs">
                                                                            <div className="flex justify-between items-start">
                                                                                <span className="font-bold text-gray-800 block text-xs">{taskId.replace('task_', '').replace(/_/g, ' ')}</span>
                                                                                <span className="text-[10px] text-gray-400 font-mono font-medium">{ans.text.trim().split(/\s+/).length} words</span>
                                                                            </div>
                                                                            <pre className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[11px] overflow-x-auto whitespace-pre-wrap font-sans text-gray-700 select-all max-h-32">
                                                                                {ans.text}
                                                                            </pre>

                                                                            {!correction ? (
                                                                                <button
                                                                                    onClick={() => handleCorrectEssay(taskId, ans.text, taskId)}
                                                                                    disabled={isHwCorrecting}
                                                                                    className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                                                                >
                                                                                    {isHwCorrecting ? (
                                                                                        <>
                                                                                            <i className="fas fa-spinner fa-spin"></i>
                                                                                            <span>Analyzing & Correcting Writing...</span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <i className="fas fa-magic"></i>
                                                                                            <span>✨ Run Instant AI Essay Correction & Feedback</span>
                                                                                        </>
                                                                                    )}
                                                                                </button>
                                                                            ) : (
                                                                                <div className="mt-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                                                                                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                                                                                        <i className="fas fa-check-circle text-emerald-500"></i>
                                                                                        <span>Correction Logged successfully (+50 XP awarded!)</span>
                                                                                    </div>
                                                                                    
                                                                                    {/* Correction feedback render */}
                                                                                    <div className="space-y-2 text-xs">
                                                                                        <span className="font-extrabold text-indigo-950 uppercase text-[9px] tracking-wider block">Essay Type Feedback:</span>
                                                                                        <div 
                                                                                            className="prose prose-sm text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-indigo-50"
                                                                                            dangerouslySetInnerHTML={{ __html: correction.essayFeedbackHtml }}
                                                                                        />

                                                                                        {/* Strengths & Weaknesses */}
                                                                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                                                                            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                                                                                <strong className="text-emerald-900 block mb-1">👍 Strengths</strong>
                                                                                                <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-emerald-800">
                                                                                                    {(correction.strengths || []).map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                                                                                                </ul>
                                                                                            </div>
                                                                                            <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                                                                                                <strong className="text-amber-900 block mb-1">⚠️ Weaknesses</strong>
                                                                                                <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-amber-800">
                                                                                                    {(correction.weaknesses || []).map((w: string, idx: number) => <li key={idx}>{w}</li>)}
                                                                                                </ul>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Recycled errors */}
                                                                                        {correction.recycledErrors?.length > 0 && (
                                                                                            <div className="bg-orange-50/50 p-2 rounded-lg border border-orange-100">
                                                                                                <strong className="text-orange-950 block mb-1">🚨 Key Errors Clarified</strong>
                                                                                                <ul className="list-disc pl-4 space-y-1 text-[10px] text-orange-900 font-medium">
                                                                                                    {correction.recycledErrors.map((err: string, idx: number) => <li key={idx}>{err}</li>)}
                                                                                                </ul>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}

                                        {/* List of Past Essay Corrections on Learner Profile */}
                                        {learner.sessionAnalysis && learner.sessionAnalysis.length > 0 && (
                                            <div className="pt-3 border-t">
                                                <span className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider block mb-2">📜 Past Essay Corrections on Profile</span>
                                                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                                    {learner.sessionAnalysis.map((analysis: any, idx: number) => (
                                                        <details key={idx} className="bg-white border rounded-xl overflow-hidden group">
                                                            <summary className="p-3 font-bold text-gray-800 cursor-pointer hover:bg-slate-50 flex justify-between items-center select-none outline-none text-[11px]">
                                                                <span className="flex items-center gap-2">
                                                                    <i className="fas fa-file-signature text-indigo-500"></i>
                                                                    <span>{analysis.examTitle || 'Essay Analysis'} ({new Date(analysis.date).toLocaleDateString()})</span>
                                                                </span>
                                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+{analysis.xpEarned || 50} XP</span>
                                                            </summary>
                                                            <div className="p-3 border-t space-y-2 bg-slate-50/50 text-[11px] leading-relaxed">
                                                                {analysis.originalText && (
                                                                    <div className="space-y-1">
                                                                        <span className="text-[9px] uppercase font-extrabold text-gray-400 block">Original Essay Text:</span>
                                                                        <pre className="bg-white border p-2 rounded text-[10px] max-h-24 overflow-y-auto whitespace-pre-wrap font-sans text-gray-600">{analysis.originalText}</pre>
                                                                    </div>
                                                                )}
                                                                <div className="space-y-1 pt-1">
                                                                    <span className="text-[9px] uppercase font-extrabold text-gray-400 block">AI Correction & Feedback:</span>
                                                                    <div className="bg-white border p-3 rounded-lg leading-relaxed text-slate-800 prose prose-sm max-h-48 overflow-y-auto" dangerouslySetInnerHTML={{ __html: analysis.essayFeedbackHtml }} />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                                                        <strong className="text-emerald-900 block text-[10px] mb-0.5">👍 Strengths</strong>
                                                                        <ul className="list-disc pl-3 text-[10px] text-emerald-800 space-y-0.5">
                                                                            {(analysis.strengths || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                                        </ul>
                                                                    </div>
                                                                    <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                                                                        <strong className="text-amber-900 block text-[10px] mb-0.5">⚠️ Weaknesses</strong>
                                                                        <ul className="list-disc pl-3 text-[10px] text-amber-800 space-y-0.5">
                                                                            {(analysis.weaknesses || []).map((w: string, i: number) => <li key={i}>{w}</li>)}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </details>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>)}

                            {/* Bottom Custom Report Banner */}
                            {reportBannerPosition === 'bottom' && renderBannerContent()}

                    </div>
                </div>
            </div>
        </div>
    </Modal>
    );
};

export default SessionDetailModal;
