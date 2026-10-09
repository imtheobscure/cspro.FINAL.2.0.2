import React, { useState, useMemo } from 'react';
import Modal from '../../Modal';
import { Learner } from '../../../../types2';
import { generateEmailHtml, generateEmailPlainText } from './EmailContentPreview';
import { useAutomationStore } from '../../../../store/useAutomationStore';

interface EmailComposerModalProps {
    isOpen: boolean;
    onClose: () => void;
    learner: Learner;
}

const contentOptions = [
    { id: 'overview', label: '📊 Performance Overview', desc: 'XP points, streak, lessons completed and hours.' },
    { id: 'achievements', label: '🏆 Honors & Badge Certificates', desc: 'Visually beautifully styled list of unlocked honors.' },
    { id: 'radarChart', label: '🕸️ Dynamic Radar Chart', desc: 'Visual SVG representation of overall competency shape.' },
    { id: 'progressChart', label: '📈 Recent Progress Updates', desc: 'Detailed updates and justifications of skill bars.' },
    { id: 'learningPath', label: '🗺️ Skill Learning Path Line', desc: 'Skills logged during session timelines.' },
    { id: 'skillTree', label: '🌳 Specialized Skill Tree', desc: 'Visual hierarchical connection showing unlocked capability branches.' },
    { id: 'heatmap', label: '🟩 Activity Heatmap Grid', desc: 'GitHub-style visual continuous monthly grid.' },
    { id: 'records', label: '🏅 Academic Records & Bests', desc: 'Lifetime milestones, high scores, and maximum streaks.' },
    { id: 'termCalendar', label: '📆 Term Syllabus Calendar', desc: 'Visual weekly term indicators tracking syllabus goals.' },
    { id: 'smartGoals', label: '🎯 SMART Goals Trajectory', desc: 'Detailed goals mapped with visual success trajectories.' },
    { id: 'chatsTemplate', label: '💬 Styled Dialog Chats', desc: 'Personalized interactive chat dialog styled inside phone bubbles.' },
    { id: 'automationAndAnalytics', label: '📊 Automation & Financial analytics', desc: 'Account standing, billing, package balance, and campaign stats.' },
    { id: 'recentSessions', label: '🏫 Recent Sessions Log', desc: 'Summary of the last 2 completed sessions.' },
    { id: 'attendance', label: '📅 Attendance Record & integrity', desc: 'Stats on attended vs cancelled sessions.' },
    { id: 'feedback', label: '💌 Direct Tutor Comments', desc: 'Specific feedback notes written by you.' },
    { id: 'challenges', label: '🔥 Arena Quest Milestones', desc: 'Active and completed quests standing.' },
    { id: 'competition', label: '🏆 Tournament Duel Standings', desc: 'Division ranks and win statistics.' },
    { id: 'needs', label: '🎯 Identified Learning Needs', desc: 'Top focus items with visual priority tags.' },
    { id: 'homework', label: '📝 Homework Assignments', desc: 'Active/Due homework states with XP.' },
    { id: 'competencies', label: '🎓 Skill Competencies Syllabus', desc: 'Full competency ratings with progress sliders.' },
    { id: 'sessionReviews', label: '⭐ End-of-Class Surveys', desc: 'Reviews and feedback typed by the student.' },
    { id: 'spacedRepetition', label: '🧠 Spaced Memory Flashcards', desc: 'Terms queued for active review.' }
];

type MailTab = 'report' | 'reminders';
type ReminderType = 'class' | 'homework' | 'streak' | 'reengage';

const EmailComposerModal: React.FC<EmailComposerModalProps> = ({ isOpen, onClose, learner }) => {
    const homeworkAssignments = useAutomationStore(state => state.homeworkAssignments);
    const spacedRepetitionItems = useAutomationStore(state => state.spacedRepetitionItems);

    const [activeTab, setActiveTab] = useState<MailTab>('report');
    const [recipientEmail, setRecipientEmail] = useState<string>(learner.email || '');
    const [emailSubject, setEmailSubject] = useState<string>(`Your learning report from Tutor Academy! ✨`);
    const [selectedGreeting, setSelectedGreeting] = useState<string>('');
    const [customGreetingInput, setCustomGreetingInput] = useState<string>('');
    const [activeReminderType, setActiveReminderType] = useState<ReminderType>('class');
    const [isCopySuccess, setIsCopySuccess] = useState<boolean>(false);

    // Dynamic Alert and warning block configs
    const [alertText, setAlertText] = useState<string>('');
    const [alertType, setAlertType] = useState<string>('attention');
    const [alertTitle, setAlertTitle] = useState<string>('');

    // Customizable preset banks with elaborate professional academic templates
    const [presets, setPresets] = useState<string[]>([
        `Dear ${learner.name},\n\nI am delighted to share your detailed diagnostic progress report covering our core CEFR benchmarks. We have observed stellar focus and remarkable analytical agility across your active study modules.\n\nTo consolidate these outstanding gains, I have updated your interactive homework checklist and loaded customized study guides. Please review them closely before our next live session as we transition into the intermediate grammar block. Let's keep up this exceptional effort!\n\nBest regards,\nYour Tutor Academy Representative`,
        `Hi ${learner.name},\n\nIncredible victory inside the Tournament Duel Arena today! Your tactical reasoning and spelling accuracy were absolutely brilliant during our gamified vocabulary drills. Your profile streak is now beautifully protected!\n\nAs a target focus milestone, please log in to access the spaced repetition review cards. Consistent daily exposure of only 5 minutes is mathematically proven to double vocabulary retention. Ready for the next championship quest?\n\nKeep shining,\nYour Academic Mentor`,
        `Urgent Attention Needed - Focus Target alert for ${learner.name}:\n\nHello, as we systematically refine our expressive speech objectives, we have identified key reinforcement targets in your intermediate grammar syllabus. Specifically, let's prioritize reducing syntactical slips on conditional sentence structures.\n\nI have injected an high-contrast alert banner with remediation practice items. Please complete these focus tasks to keep your syllabus trajectory on track for diamond rank confirmation!\n\nBest,\nYour Dedicated Tutor`,
        `Dear ${learner.name},\n\nReviewing our Monthly SMART Goals trajectory and your 12-week Term Module schedule, you are performing beautifully on overall class integrity and lesson attendance. We have logged substantial playtime hours inside the multiplayer study hub.\n\nI have attached your visual Term Calendar and financial ledger indicating account standing is fully paid and active. Keep advancing through your unlocked skill hierarchy branches!\n\nWarmly,\nTutor Academy Coordinator`
    ]);

    const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({
        overview: true,
        recentSessions: true,
        progressChart: true,
        homework: true,
        radarChart: true,
        skillTree: true,
        heatmap: true,
    });

    const [isComposing, setIsComposing] = useState(false);

    // Save customized templates at runtime
    const handleSaveAsPreset = () => {
        const textToSave = customGreetingInput.trim() || selectedGreeting;
        if (!textToSave) {
            alert("Please type a custom message in the greeting box first!");
            return;
        }
        if (presets.includes(textToSave)) {
            alert("This message is already in your presets!");
            return;
        }
        setPresets(prev => [textToSave, ...prev]);
        alert("Success! Custom template saved to your temporary preset bank below.");
    };

    // Filter homework and spaced repetition items for this learner
    const learnerHomework = useMemo(() => {
        // Direct integration from learner profile coursePlan currentLessonSettings if available
        const currentLessonHw = (learner.coursePlan as any)?.currentLessonSettings?.homeworkChecklist;
        let formattedHwList: any[] = [];
        if (currentLessonHw) {
            const arr = Array.isArray(currentLessonHw) 
                ? currentLessonHw 
                : typeof currentLessonHw === 'string'
                    ? (currentLessonHw as string).split('\n').filter(Boolean)
                    : [];
            formattedHwList = arr.map((item, idx) => ({
                id: `dynamic-${idx}`,
                learnerId: learner.id,
                title: item,
                completed: false,
                xpReward: 50,
            }));
        }

        const storeHwList = homeworkAssignments.filter(hw => hw.learnerId === learner.id);
        const combined = [...formattedHwList, ...storeHwList];
        
        // Ensure some unique fallback items if both empty
        if (combined.length === 0) {
            return [
                { id: 'hw-f1', title: 'Complete Arena Duel Quest', xpReward: 100 },
                { id: 'hw-f2', title: 'Practice CEFR Vocabulary Level Drill', xpReward: 50 }
            ];
        }
        return combined;
    }, [homeworkAssignments, learner.id, (learner.coursePlan as any)?.currentLessonSettings?.homeworkChecklist]);

    const learnerSpacedRep = useMemo(() => {
        return spacedRepetitionItems.filter(item => item.learnerId === learner.id);
    }, [spacedRepetitionItems, learner.id]);

    const allChatMessages = useMemo(() => {
        const messages = [...(learner.sessions || [])]
            .flatMap(s => s.chatMessages || [])
            .filter(Boolean)
            .reverse(); // Show most recent first
        
        if (messages.length > 0 && !selectedGreeting) {
            setSelectedGreeting(messages[0]);
        }
        return messages;
    }, [learner.sessions, isOpen]);

    // Handle automated template adjustments when switching reminder types
    const handleReminderChange = (type: ReminderType) => {
        setActiveReminderType(type);
        setCustomGreetingInput('');
        switch (type) {
            case 'class':
                setEmailSubject(`⏰ Reminder: Upcoming Live Class with your Tutor!`);
                setSelectedGreeting(`Hi ${learner.name}! This is a friendly reminder that we have a live class scheduled soon at Tutor Academy. Please log in on time and review your flashcards before we start! See you soon.`);
                break;
            case 'homework':
                setEmailSubject(`📝 Quest Mission: Active Homework Due Soon!`);
                setSelectedGreeting(`Hi ${learner.name}! Don't forget to complete your pending homework assignments to boost your score and earn massive visual XP badges. Check your profile dashboard for full details!`);
                break;
            case 'streak':
                setEmailSubject(`💎 Keep it going! Protect your ${learner.streak}-day Streak!`);
                setSelectedGreeting(`Incredible job on your streak, ${learner.name}! You have maintained a continuous class frequency. log in today for a quick practice run to protect your learning progress!`);
                break;
            case 'reengage':
                setEmailSubject(`🌱 We miss you! Let's resume your learning adventure!`);
                setSelectedGreeting(`Hi ${learner.name}! It has been a little while since our last session. Your Arena character misses you! Let's get back on track and log a fun topic session this week.`);
                break;
        }
    };

    const handleSectionToggle = (id: string) => {
        setSelectedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const activeGreeting = useMemo(() => {
        if (customGreetingInput.trim().length > 0) {
            return customGreetingInput;
        }
        return selectedGreeting || `Hi ${learner.name}! Here is your latest custom progress report packed with achievements and focus goals. Keep up the high effort!`;
    }, [selectedGreeting, customGreetingInput, learner.name]);

    // Compile variables to feed into preview generator
    const emailData = useMemo(() => {
        return {
            selectedSections: activeTab === 'report' ? selectedSections : { overview: true },
            greeting: activeGreeting,
            subject: emailSubject,
            homeworkAssignments: learnerHomework,
            spacedRepetitionItems: learnerSpacedRep,
            customAlert: alertText.trim() ? {
                type: alertType,
                text: alertText.trim(),
                title: alertTitle.trim() || {
                    attention: '⚡ IMPORTANT ATTENTION',
                    warning: '⚠️ ACTION REQUIRED',
                    info: '💡 CLASS GUIDELINE',
                    success: '🎉 OUTSTANDING SUCCESS',
                    achievement: '🏆 NEW MILESTONE UNLOCKED'
                }[alertType] || 'NOTICE'
            } : undefined
        };
    }, [activeTab, selectedSections, activeGreeting, emailSubject, learnerHomework, learnerSpacedRep, alertText, alertType, alertTitle]);

    // Generate Beautiful visual HTML string
    const generatedHtml = useMemo(() => {
        return generateEmailHtml(learner, emailData);
    }, [learner, emailData]);

    // Copy to clipboard maintaining visual elements (CSS-inlined HTML copy)
    const handleCopyHtml = async () => {
        try {
            const htmlBlob = new Blob([generatedHtml], { type: 'text/html' });
            const plainText = generateEmailPlainText(learner, emailData.selectedSections, [], emailData);
            const textBlob = new Blob([plainText], { type: 'text/plain' });
            
            // Clipboard items
            const clipboardItem = new ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob
            });
            await navigator.clipboard.write([clipboardItem]);
            
            setIsCopySuccess(true);
            setTimeout(() => {
                setIsCopySuccess(false);
            }, 2500);

            alert("Visual HTML Email successfully copied to clipboard! You can paste it directly into Gmail, Outlook, or Apple Mail to send with all graphics, stars, and cards beautifully formatted!");
        } catch (err) {
            console.error("Modern Clipboard copy failed, attempting fallback:", err);
            
            // Fallback
            const el = document.getElementById('visual-preview-iframe') as HTMLIFrameElement;
            if (el && el.contentWindow) {
                try {
                    const iframeDoc = el.contentDocument || el.contentWindow.document;
                    iframeDoc.execCommand('selectAll', false);
                    iframeDoc.execCommand('copy', false);
                    
                    setIsCopySuccess(true);
                    setTimeout(() => {
                        setIsCopySuccess(false);
                    }, 2500);
                    alert("Visual elements copied! Now paste into your mail message body.");
                } catch (fallbackErr) {
                    console.error("Fallback selectAll copy failed:", fallbackErr);
                    alert("Could not copy rich elements programmatically. Please select and copy from the preview box manually.");
                }
            }
        }
    };

    const handleSendEmailClient = async () => {
        setIsComposing(true);
        try {
            const textContent = generateEmailPlainText(learner, emailData.selectedSections, [], emailData);
            const body = `${activeGreeting}\n\n${textContent}\n\nBest regards,\nYour Tutor Academy Representative`;
            const mailtoLink = `mailto:${recipientEmail || learner.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}`;
            
            window.location.href = mailtoLink;
            onClose();
        } catch (err) {
            console.error("Failed to trigger email client:", err);
            alert("Could not trigger your windows email client. Copy visual HTML instead!");
        } finally {
            setIsComposing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`📧 Tutor Email Suite & Reminders: ${learner.name}`} size="full">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[75vh]" id="email-suite-container">
                
                {/* Left Side: Controls & Configurations */}
                <div className="xl:col-span-5 flex flex-col gap-5 bg-white p-4 rounded-xl border border-gray-200">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-brand-blue text-white px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Suite</span>
                            <h2 className="text-xl font-black text-gray-800">Email Configurator</h2>
                        </div>
                        <p className="text-xs text-gray-500">Configure visual reports, reminders, customizable greetings, and send straight via your system mail client or clipboard copy.</p>
                    </div>

                    {/* Recipient info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">To (Learner Email)</label>
                            <input 
                                type="email" 
                                value={recipientEmail} 
                                onChange={(e) => setRecipientEmail(e.target.value)} 
                                className="w-full px-3 py-2 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Subject</label>
                            <input 
                                type="text" 
                                value={emailSubject} 
                                onChange={(e) => setEmailSubject(e.target.value)} 
                                className="w-full px-3 py-2 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => {
                                setActiveTab('report');
                                setEmailSubject(`Your learning report from Tutor Academy! ✨`);
                            }}
                            className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all ${activeTab === 'report' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <i className="fas fa-file-medical-alt mr-1.5"></i> Custom Status Report
                        </button>
                        <button
                            onClick={() => handleReminderChange('class')}
                            className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all ${activeTab === 'reminders' ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <i className="fas fa-bell mr-1.5"></i> Quick Reminders Suite
                        </button>
                    </div>

                    {/* Active Mode Elements */}
                    <div className="flex-1 overflow-y-auto pr-1 max-h-[35vh]">
                        {activeTab === 'report' ? (
                            <div className="space-y-3">
                                <span className="block text-xs font-bold text-gray-600 uppercase">Select Content to Include:</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {contentOptions.map(opt => (
                                        <label 
                                            key={opt.id} 
                                            className={`flex flex-col gap-0.5 p-2.5 rounded-lg border cursor-pointer hover:bg-slate-50 transition-all ${selectedSections[opt.id] ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-100'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedSections[opt.id]}
                                                    onChange={() => handleSectionToggle(opt.id)}
                                                    className="h-4 w-4 rounded text-brand-blue border-gray-300 focus:ring-brand-blue"
                                                />
                                                <span className="font-bold text-xs text-gray-700">{opt.label}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 pl-6">{opt.desc}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <span className="block text-xs font-bold text-gray-600 uppercase">1. Select Notification Event Type:</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['class', 'homework', 'streak', 'reengage'] as ReminderType[]).map(type => {
                                        const details = {
                                            class: { title: 'Upcoming Class', icon: 'fa-calendar-alt' },
                                            homework: { title: 'Homework Alert', icon: 'fa-book' },
                                            streak: { title: 'Protect Streak', icon: 'fa-fire' },
                                            reengage: { title: 'Re-engagement', icon: 'fa-handshake' }
                                        }[type];
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => handleReminderChange(type)}
                                                className={`p-2.5 text-left border rounded-lg flex items-center gap-1.5 transition-all ${activeReminderType === type ? 'bg-brand-purple text-white border-brand-purple shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                            >
                                                <i className={`fas ${details.icon} text-sm`}></i>
                                                <span className="font-bold text-[11px]">{details.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <span className="block text-xs font-bold text-gray-600 uppercase pt-2">2. Active Reminder Suite Items:</span>
                                <div className="space-y-2">
                                    {/* Action Item 1: Next Class Date */}
                                    <div 
                                        onClick={() => handleReminderChange('class')}
                                        className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer transition-all flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">📅</span>
                                            <div>
                                                <h4 className="font-black text-xs text-purple-950">Next Scheduled Class</h4>
                                                <p className="text-[10px] text-purple-700 font-semibold">{(learner.coursePlan as any)?.nextClassDate || 'Not set or Weekly scheduled'}</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded font-black uppercase">Load</span>
                                    </div>

                                    {/* Action Item 2: Pending Homework count */}
                                    <div 
                                        onClick={() => handleReminderChange('homework')}
                                        className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer transition-all flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">📝</span>
                                            <div>
                                                <h4 className="font-black text-xs text-amber-950">Active Missions Queue</h4>
                                                <p className="text-[10px] text-amber-700 font-semibold">{learnerHomework.length} learning goals active</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded font-black uppercase">Load</span>
                                    </div>

                                    {/* Action Item 3: Streak Status */}
                                    <div 
                                        onClick={() => handleReminderChange('streak')}
                                        className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-all flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">🔥</span>
                                            <div>
                                                <h4 className="font-black text-xs text-rose-950 font-bold">Protect Continuous Streak</h4>
                                                <p className="text-[10px] text-rose-700 font-semibold">Active Streak is {learner.streak} Days</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded font-black uppercase">Load</span>
                                    </div>

                                    {/* Action Item 4: Re-engagement */}
                                    <div 
                                        onClick={() => handleReminderChange('reengage')}
                                        className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-all flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">🌱</span>
                                            <div>
                                                <h4 className="font-black text-xs text-emerald-950 font-bold">Student Re-engagement</h4>
                                                <p className="text-[10px] text-emerald-800 font-semibold">Draft inactivity greetings</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-black uppercase">Load</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add Custom Alert/Banner box */}
                    <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="block text-xs font-black text-gray-700 uppercase flex items-center gap-1.5">
                                🚨 Custom High-Contrast alert Box
                            </span>
                            {alertText && (
                                <button onClick={() => { setAlertText(''); setAlertTitle(''); }} className="text-[10px] text-red-500 hover:underline">
                                    Clear Alert
                                </button>
                            )}
                        </div>
                        <p className="text-[9px] text-gray-400">Injects a visually separated colored notice banner inside HTML email layout as warnings/important announcements.</p>
                        
                        <div className="grid grid-cols-5 gap-1">
                            {([
                                { type: 'attention', icon: '⚡', label: 'Attn' },
                                { type: 'warning', icon: '🚨', label: 'Warn' },
                                { type: 'info', icon: '💡', label: 'Info' },
                                { type: 'success', icon: '✅', label: 'Success' },
                                { type: 'achievement', icon: '🏆', label: 'badge' }
                            ]).map(item => (
                                <button
                                    key={item.type}
                                    type="button"
                                    onClick={() => setAlertType(item.type)}
                                    className={`py-1 text-[9px] border font-semibold flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all ${alertType === item.type ? 'bg-brand-blue text-white border-brand-blue font-black' : 'bg-white text-gray-500 hover:bg-slate-50 border-gray-200'}`}
                                >
                                    <span>{item.icon}</span>
                                    <span className="scale-90 text-[8px] whitespace-nowrap">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <input
                                type="text"
                                value={alertTitle}
                                onChange={(e) => setAlertTitle(e.target.value)}
                                placeholder="Custom Alert Title (e.g. IMPORTANT ACTION REQUIRED)"
                                className="w-full px-2.5 py-1.5 text-[11px] font-bold border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-blue"
                            />
                            <textarea
                                value={alertText}
                                onChange={(e) => setAlertText(e.target.value)}
                                placeholder="Alert content (e.g. Please practice your vocabulary list today to maintain progress)..."
                                rows={2}
                                className="w-full px-2.5 py-1.5 text-[11px] border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-blue"
                            />
                        </div>
                    </div>

                    {/* Choosing Greeting / Custom Editor */}
                    <div className="border-t pt-3 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="block text-xs font-black text-gray-700 uppercase">Greeting Message (Customizable)</span>
                            <button
                                type="button"
                                onClick={handleSaveAsPreset}
                                className="text-[10px] font-bold bg-brand-green/10 text-brand-green border border-brand-green/20 px-2 py-0.5 rounded hover:bg-brand-green hover:text-white transition-all flex items-center gap-1"
                            >
                                💾 Save Custom Preset
                            </button>
                        </div>
                        <textarea
                            value={customGreetingInput}
                            onChange={(e) => setCustomGreetingInput(e.target.value)}
                            placeholder={selectedGreeting || `Type a custom direct salutation or message...`}
                            rows={3}
                            className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        />
                        
                        <div className="space-y-1.5">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase">OR APPLY PRESETS & TEMPLATES BANK:</span>
                            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
                                {allChatMessages.map((msg, index) => (
                                    <button
                                        key={`ai-${index}`}
                                        type="button"
                                        onClick={() => {
                                            setSelectedGreeting(msg);
                                            setCustomGreetingInput('');
                                        }}
                                        className={`p-2 text-left text-[10px] rounded border transition-all ${selectedGreeting === msg && !customGreetingInput ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <span className="bg-purple-100 text-purple-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full mr-1">AI Prompt</span>
                                        "{msg.length > 70 ? `${msg.substring(0, 70)}...` : msg}"
                                    </button>
                                ))}

                                {presets.map((msg, index) => (
                                    <button
                                        key={`preset-${index}`}
                                        type="button"
                                        onClick={() => {
                                            setSelectedGreeting(msg);
                                            setCustomGreetingInput('');
                                        }}
                                        className={`p-2 text-left text-[10px] rounded border transition-all ${selectedGreeting === msg && !customGreetingInput ? 'bg-blue-50 border-brand-blue text-brand-blue-dark font-bold' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <span className="bg-blue-100 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full mr-1">Tutor Preset</span>
                                        "{msg.length > 70 ? `${msg.substring(0, 70)}...` : msg}"
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Live Visual HTML preview */}
                <div className="xl:col-span-7 flex flex-col gap-4 bg-slate-100 p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                        <div>
                            <span className="bg-brand-green text-white px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Live</span>
                            <h3 className="font-black text-gray-800 text-sm mt-1">Responsive HTML Preview</h3>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopyHtml}
                                className={`text-xs font-bold px-3 py-2 rounded-lg shadow-sm border transition-all flex items-center gap-1.5 ${isCopySuccess ? 'bg-green-600 text-white border-green-600' : 'bg-white text-brand-blue hover:bg-blue-50 border-brand-blue'}`}
                            >
                                <i className={`fas ${isCopySuccess ? 'fa-check' : 'fa-clipboard'}`}></i>
                                {isCopySuccess ? 'Copied Visual HTML!' : 'Copy Visual Email'}
                            </button>
                            <button
                                onClick={handleSendEmailClient}
                                disabled={isComposing}
                                className="bg-brand-green text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-1.5 border border-brand-green"
                            >
                                <i className="fas fa-paper-plane"></i> Send via Client
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-white border border-gray-300 rounded-xl overflow-hidden shadow-inner flex flex-col min-h-[45vh]">
                        {/* Interactive iframe reflecting the exact HTML template with styles */}
                        <iframe
                            id="visual-preview-iframe"
                            title="Visual Email Render Box"
                            srcDoc={generatedHtml}
                            className="w-full flex-1 border-none"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                    <div className="p-2 text-center text-[10px] text-gray-400">
                        <i className="fas fa-info-circle mr-1"></i> Paste ("Ctrl + V") into Gmail, Outlook, or Apple Mail to deliver this exact visual styling to the email inbox.
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default EmailComposerModal;
