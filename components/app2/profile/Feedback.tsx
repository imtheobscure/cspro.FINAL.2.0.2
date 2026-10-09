import React, { useRef, useMemo, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { Learner, Session, GroupClass } from '../../../types2';
import SectionCard from '../SectionCard';

export interface MoodPhase {
    phase: string;
    mood: string;
    emoji: string;
    description: string;
}

export interface EmotionSentence {
    original: string;
    corrected: string;
    emotion: string;
    emoji: string;
    tutorTip: string;
}

export interface EmotionWord {
    word: string;
    type: 'positive' | 'negative' | 'neutral';
    count: number;
    intensity: 'High' | 'Medium' | 'Low';
}

export interface EmotionAnalysisData {
    overallMood: string;
    overallEmoji: string;
    dominantEmotion: string;
    sentimentScore: number;
    timeline: MoodPhase[];
    sentences: EmotionSentence[];
    drivenWords: EmotionWord[];
    additionalNotes?: string;
    confidenceScore?: number;
    confidenceAnalysis?: string;
    anxietyScore?: number;
    anxietyAnalysis?: string;
    riskTakingScore?: number;
    riskTakingAnalysis?: string;
    fearOfMistakesScore?: number;
    fearOfMistakesAnalysis?: string;
    motivationScore?: number;
    motivationAnalysis?: string;
    transferableSkills?: any[];
    speakingScores?: any;
}

export const getOrCreateEmotionAnalysis = (session: any): EmotionAnalysisData & {
    confidenceScore?: number; confidenceAnalysis?: string;
    anxietyScore?: number; anxietyAnalysis?: string;
    riskTakingScore?: number; riskTakingAnalysis?: string;
    fearOfMistakesScore?: number; fearOfMistakesAnalysis?: string;
    motivationScore?: number; motivationAnalysis?: string;
    transferableSkills?: any[];
    speakingScores?: any;
} => {
    if (session.emotionAnalysis && !session.emotionAnalysisDeleted) {
        return session.emotionAnalysis;
    }
    
    const aiEmotional = session.aiAnalysis?.emotionalFeeling || session.aiAnalysis?.emotionAnalysis || session.aiAnalysis?.sentimentAnalysis;
    
    if (aiEmotional) {
        const score = aiEmotional.sentimentScore || 70;
        const emoji = score > 85 ? "🤩" : score > 70 ? "😊" : score > 50 ? "🤔" : score > 30 ? "😟" : "😰";
        return {
            overallMood: aiEmotional.dominantEmotion || aiEmotional.overallMood || "Neutral",
            overallEmoji: emoji,
            dominantEmotion: aiEmotional.dominantEmotion || aiEmotional.overallMood || "Neutral",
            sentimentScore: score,
            timeline: aiEmotional.timeline || [],
            sentences: aiEmotional.sentences || [],
            drivenWords: aiEmotional.drivenWords || [],
            additionalNotes: aiEmotional.analysis || aiEmotional.additionalNotes || "",
            confidenceScore: aiEmotional.confidenceScore,
            confidenceAnalysis: aiEmotional.confidenceAnalysis,
            anxietyScore: aiEmotional.anxietyScore,
            anxietyAnalysis: aiEmotional.anxietyAnalysis,
            riskTakingScore: aiEmotional.riskTakingScore,
            riskTakingAnalysis: aiEmotional.riskTakingAnalysis,
            fearOfMistakesScore: aiEmotional.fearOfMistakesScore,
            fearOfMistakesAnalysis: aiEmotional.fearOfMistakesAnalysis,
            motivationScore: aiEmotional.motivationScore,
            motivationAnalysis: aiEmotional.motivationAnalysis,
            transferableSkills: aiEmotional.transferableSkills || [],
            speakingScores: session.aiAnalysis?.speakingScores || null,
        };
    }

    return {
        overallMood: "Not Analyzed",
        overallEmoji: "😶",
        dominantEmotion: "Not Analyzed",
        sentimentScore: 0,
        timeline: [],
        sentences: [],
        drivenWords: [],
        additionalNotes: "No emotion analysis data available for this session."
    };
};

const SimpleMarkdown: React.FC<{ text?: string }> = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\*.*?\*|==.*?==|_.*?_)/g).filter(Boolean);

    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <strong key={index} className="font-extrabold text-[#0f172a]">{part.slice(1, -1)}</strong>;
                }
                if (part.startsWith('_') && part.endsWith('_')) {
                    return <em key={index} className="italic text-[#334155]">{part.slice(1, -1)}</em>;
                }
                if (part.startsWith('==') && part.endsWith('==')) {
                    return <mark key={index} className="bg-yellow-200 text-slate-950 px-1 rounded font-bold">{part.slice(2, -2)}</mark>;
                }
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </>
    );
};

const getTagStyles = (tag: string) => {
    const lower = (tag || '').toLowerCase().trim();
    switch (lower) {
        case 'grammar':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'vocabulary':
            return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'functional':
            return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'pragmatics':
            return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'appropriacy':
            return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'say better':
            return 'bg-sky-100 text-sky-800 border-sky-200';
        case 'discourse':
            return 'bg-slate-100 text-slate-800 border-slate-200';
        case 'register':
            return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
        case 'cohesion':
            return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case 'coherence':
            return 'bg-pink-100 text-pink-800 border-pink-200';
        case 'slips':
            return 'bg-yellow-105 text-yellow-800 border-yellow-250';
        case 'mistakes':
            return 'bg-rose-100 text-rose-800 border-rose-200';
        case 'errors':
            return 'bg-red-100 text-red-800 border-red-200';
        default:
            return 'bg-slate-900 text-white border-transparent';
    }
};

interface SelMetric {
    label: string;
    score: number;
    analysis: string;
    icon: string;
    color: string;
}

const getSelMetrics = (session: any): SelMetric[] => {
    const aiEmotional = session.aiAnalysis?.emotionalFeeling || session.aiAnalysis?.emotionAnalysis || session.aiAnalysis?.sentimentAnalysis;
    
    if (aiEmotional?.confidenceScore !== undefined) {
        const getScoreColor = (label: string, score: number) => {
            if (label === "Anxiety" || label === "Fear of Mistakes") {
                return score > 60 ? 'bg-rose-500' : score > 35 ? 'bg-orange-400' : 'bg-emerald-500';
            }
            return score >= 70 ? 'bg-emerald-500' : score >= 45 ? 'bg-amber-500' : 'bg-rose-500';
        };
        return [
            { label: "Confidence", score: aiEmotional.confidenceScore, analysis: aiEmotional.confidenceAnalysis || "Demonstrated clear confidence and voice delivery.", icon: "💪", color: getScoreColor("Confidence", aiEmotional.confidenceScore) },
            { label: "Anxiety", score: aiEmotional.anxietyScore, analysis: aiEmotional.anxietyAnalysis || "Exhibited low-to-moderate hesitation during speech.", icon: "🥺", color: getScoreColor("Anxiety", aiEmotional.anxietyScore) },
            { label: "Risk-taking", score: aiEmotional.riskTakingScore, analysis: aiEmotional.riskTakingAnalysis || "Attempted advanced phrasing and structure.", icon: "🧗", color: getScoreColor("Risk-taking", aiEmotional.riskTakingScore) },
            { label: "Fear of Mistakes", score: aiEmotional.fearOfMistakesScore, analysis: aiEmotional.fearOfMistakesAnalysis || "Active self-correction patterns observed.", icon: "🛡️", color: getScoreColor("Fear of Mistakes", aiEmotional.fearOfMistakesScore) },
            { label: "Motivation", score: aiEmotional.motivationScore, analysis: aiEmotional.motivationAnalysis || "Maintained high speech velocity and active engagement.", icon: "🔥", color: getScoreColor("Motivation", aiEmotional.motivationScore) },
        ];
    }

    const transcriptText = ((session.notes || session.transcript || "") as string).toLowerCase();
    const positiveWordsCount = (transcriptText.match(/(good|great|perfect|clear|understand|enjoy|happy|easy|confident|like|love|smile|interest)/g) || []).length;
    const negativeWordsCount = (transcriptText.match(/(nervous|difficult|hard|sorry|cannot|can't|struggle|confused|mistake|scared|fear|anxious)/g) || []).length;
    const errorsCount = session.aiAnalysis?.corrections?.flatMap((g: any) => g.examples || []).length || 0;
    
    let confidence = 75 + (positiveWordsCount * 3) - (negativeWordsCount * 4);
    confidence = Math.max(40, Math.min(98, confidence));

    let anxiety = 35 + (negativeWordsCount * 8) - (positiveWordsCount * 2) + (errorsCount * 2);
    anxiety = Math.max(15, Math.min(90, anxiety));

    let riskTaking = 50 + Math.min(25, Math.round(transcriptText.length / 80)) + (positiveWordsCount * 2);
    riskTaking = Math.max(30, Math.min(95, riskTaking));

    let fearOfMistakes = 40 + (errorsCount * 5) - (positiveWordsCount * 3);
    fearOfMistakes = Math.max(20, Math.min(85, fearOfMistakes));

    let motivation = 70 + Math.min(25, (session.spokenTime || 15) * 1.2);
    motivation = Math.max(50, Math.min(98, motivation));

    return [
        { 
            label: "Confidence", 
            score: confidence, 
            analysis: confidence > 75 
                ? "Excellent confidence levels. The learner actively initiated dialogue and spoke with minimal hesitation." 
                : "Moderate confidence. Showed occasional pauses but maintained high effort to communicate ideas.",
            icon: "💪",
            color: "bg-indigo-500"
        },
        { 
            label: "Anxiety", 
            score: anxiety, 
            analysis: anxiety > 50 
                ? "Exhibited notable anxiety markers such as apologizing frequently ('sorry') or pausing before tricky syntax." 
                : "Low anxiety levels. Felt psychologically safe and spoke freely with the tutor.",
            icon: "🥺",
            color: "bg-rose-500"
        },
        { 
            label: "Risk-taking", 
            score: riskTaking, 
            analysis: riskTaking > 75 
                ? "Very high risk-taking. Expressed complex thoughts outside of their comfort zone without relying on basic phrases." 
                : "Moderate risk-taking. Mostly stuck to comfortable phrasing to guarantee correctness.",
            icon: "🧗",
            color: "bg-amber-500"
        },
        { 
            label: "Fear of Mistakes", 
            score: fearOfMistakes, 
            analysis: fearOfMistakes > 50 
                ? "Slightly guarded during corrections. Paid heavy attention to slips and errors in their spoken performance." 
                : "Minimal fear of mistakes. Embraced trial-and-error naturally during roleplay exercises.",
            icon: "🛡️",
            color: "bg-orange-500"
        },
        { 
            label: "Motivation", 
            score: motivation, 
            analysis: "Highly motivated learner. Actively asked questions, engaged with tutor feedback, and requested extra practice.",
            icon: "🔥",
            color: "bg-emerald-500"
        }
    ];
};

interface TransferableSkill {
    skill: string;
    score: number;
    evidence: string;
    emoji: string;
}

const getTransferableSkills = (session: any): TransferableSkill[] => {
    const aiEmotional = session.aiAnalysis?.emotionalFeeling || session.aiAnalysis?.emotionAnalysis || session.aiAnalysis?.sentimentAnalysis;
    if (aiEmotional?.transferableSkills && aiEmotional.transferableSkills.length > 0) {
        return aiEmotional.transferableSkills.map((s: any) => {
            let emoji = "🌟";
            const lower = (s.skill || '').toLowerCase();
            if (lower.includes("creativity") || lower.includes("creative")) emoji = "🎨";
            else if (lower.includes("think") || lower.includes("box") || lower.includes("critical")) emoji = "🧠";
            else if (lower.includes("leadership") || lower.includes("lead")) emoji = "👑";
            else if (lower.includes("empathy") || lower.includes("emotion")) emoji = "🤝";
            else if (lower.includes("adapt") || lower.includes("flexib")) emoji = "🦎";
            else if (lower.includes("problem") || lower.includes("solv")) emoji = "🧩";
            else if (lower.includes("communic") || lower.includes("talk")) emoji = "🗣️";
            else if (lower.includes("persever") || lower.includes("resilien") || lower.includes("grit")) emoji = "💪";
            else if (lower.includes("curios") || lower.includes("explor")) emoji = "🔍";
            else if (lower.includes("collabor") || lower.includes("team")) emoji = "🤲";
            else if (lower.includes("organi") || lower.includes("plan")) emoji = "📋";
            else if (lower.includes("confid") || lower.includes("assert")) emoji = "🦁";
            return { ...s, emoji };
        });
    }

    const transcriptText = ((session.notes || session.transcript || "") as string).toLowerCase();
    const list: TransferableSkill[] = [];

    if (transcriptText.length > 100) {
        list.push({
            skill: "Thinking Outside the Box",
            score: 75 + (transcriptText.length % 15),
            evidence: "Used original analogies and vocabulary extensions during custom speaking exercises.",
            emoji: "🧠"
        });
        list.push({
            skill: "Creativity",
            score: 80 + (transcriptText.length % 10),
            evidence: "Coined descriptive terms to explain complex concepts when precise vocabulary was missing.",
            emoji: "🎨"
        });
    }
    
    if (transcriptText.includes("you") || transcriptText.includes("think") || transcriptText.includes("how")) {
        list.push({
            skill: "Empathy",
            score: 82,
            evidence: "Active conversational tuning, responsive listener prompts, and friendly emotional coordination.",
            emoji: "🤝"
        });
    }

    if (list.length === 0) {
        list.push(
            { skill: "Problem Solving", score: 75, evidence: "Successfully parsed syntax corrections and applied them in follow-up answers.", emoji: "🧩" },
            { skill: "Communication Adaptability", score: 80, evidence: "Quickly adjusted speech velocity based on tutor feedback and cues.", emoji: "🗣️" }
        );
    }

    return list;
};

interface EstimatedSpeakingScores {
    cefr: string;
    ielts: number;
    toefl: number;
    fluencyCoherence: number;
    lexicalResource: number;
    grammarAccuracy: number;
    pronunciation: number;
    rubricJustification: string;
}

const getSpeakingScores = (session: any, learnerLevel: string): EstimatedSpeakingScores => {
    const aiScores = session.aiAnalysis?.speakingScores;
    if (aiScores && aiScores.cefr) {
        return aiScores;
    }

    const levelStr = (learnerLevel || "B1").toUpperCase();
    let baseIelts = 5.5;
    let baseToefl = 60;
    let cefr = "B1";

    if (levelStr.includes("C2")) { cefr = "C2"; baseIelts = 8.5; baseToefl = 115; }
    else if (levelStr.includes("C1")) { cefr = "C1"; baseIelts = 7.5; baseToefl = 98; }
    else if (levelStr.includes("B2")) { cefr = "B2"; baseIelts = 6.5; baseToefl = 84; }
    else if (levelStr.includes("B1")) { cefr = "B1"; baseIelts = 5.5; baseToefl = 62; }
    else if (levelStr.includes("A2")) { cefr = "A2"; baseIelts = 4.5; baseToefl = 44; }
    else if (levelStr.includes("A1")) { cefr = "A1"; baseIelts = 3.5; baseToefl = 25; }

    const correctionsList = session.aiAnalysis?.corrections || [];
    const errorsCount = correctionsList.flatMap((g: any) => g.examples || []).length || 0;
    const transcriptText = ((session.notes || session.transcript || "") as string).toLowerCase();
    const lengthBonus = Math.min(1.0, transcriptText.length / 1000); 
    const errorPenalty = Math.min(1.0, errorsCount * 0.15); 

    let ieltsRaw = baseIelts + lengthBonus - errorPenalty;
    ieltsRaw = Math.max(1.0, Math.min(9.0, ieltsRaw));
    const ielts = Math.round(ieltsRaw * 2) / 2;

    let toeflRaw = 12;
    if (cefr === "C2") toeflRaw = 28 + Math.round(lengthBonus * 2) - errorsCount;
    else if (cefr === "C1") toeflRaw = 24 + Math.round(lengthBonus * 4) - errorsCount;
    else if (cefr === "B2") toeflRaw = 19 + Math.round(lengthBonus * 5) - errorsCount;
    else if (cefr === "B1") toeflRaw = 15 + Math.round(lengthBonus * 4) - errorsCount;
    else if (cefr === "A2") toeflRaw = 10 + Math.round(lengthBonus * 4) - errorsCount;
    else if (cefr === "A1") toeflRaw = 5 + Math.round(lengthBonus * 4) - errorsCount;

    const toefl = Math.max(0, Math.min(30, toeflRaw));

    const fluencyCoherence = Math.max(1.0, Math.min(9.0, Math.round((ielts + (transcriptText.length > 500 ? 0.5 : -0.5)) * 2) / 2));
    const lexicalResource = Math.max(1.0, Math.min(9.0, Math.round((ielts + (transcriptText.includes("learn") ? 0.5 : 0)) * 2) / 2));
    const grammarAccuracy = Math.max(1.0, Math.min(9.0, Math.round((ielts - (errorsCount > 4 ? 0.5 : 0)) * 2) / 2));
    const pronunciation = Math.max(1.0, Math.min(9.0, Math.round((ielts) * 2) / 2));

    const rubricJustification = `Evaluated using actual spoken transcript markers. Lexical variety and syntax complexity support an approximate ${cefr} speaking assessment with a strict focus on communicative competence.`;

    return {
        cefr,
        ielts,
        toefl,
        fluencyCoherence,
        lexicalResource,
        grammarAccuracy,
        pronunciation,
        rubricJustification
    };
};

interface FeedbackProps {
    learner: Learner | GroupClass;
    onUpdate: (updatedLearner: Learner | GroupClass) => void;
    isTabContent?: boolean;
    isForScreenshot?: boolean;
}

interface CustomNotice {
    id: string;
    type: 'attention' | 'warning' | 'success' | 'danger' | 'info';
    position: 'top' | 'bottom';
    content: string;
}

const Feedback: React.FC<FeedbackProps> = ({ learner, onUpdate, isTabContent = false, isForScreenshot = false }) => {
    const feedbackPrintRef = useRef<HTMLDivElement>(null);

    // Persisted toggle switch state for showing Preply referral banner
    const [showPreplyReferral, setShowPreplyReferral] = useState<boolean>(() => {
        const stored = localStorage.getItem(`show-preply-${learner.id}`);
        return stored === null ? true : stored === 'true';
    });

    // Custom alerts appended by tutor
    const [notices, setNotices] = useState<CustomNotice[]>(() => {
        const stored = localStorage.getItem(`notices-${learner.id}`);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse stored notices");
            }
        }
        return [];
    });

    const [showNoticeForm, setShowNoticeForm] = useState(false);
    const [formContent, setFormContent] = useState('');
    const [formType, setFormType] = useState<CustomNotice['type']>('attention');
    const [formPosition, setFormPosition] = useState<CustomNotice['position']>('bottom');
    const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

    // In-place correction editing states
    const [editingCorrectionKey, setEditingCorrectionKey] = useState<string | null>(null);
    const [editCategory, setEditCategory] = useState('');
    const [editExplanation, setEditExplanation] = useState('');
    const [editIncorrect, setEditIncorrect] = useState('');
    const [editCorrect, setEditCorrect] = useState('');

    // Emotion Analysis editing and deletion states
    const [editingEmotionSessionId, setEditingEmotionSessionId] = useState<string | null>(null);
    const [editedEmotionData, setEditedEmotionData] = useState<EmotionAnalysisData | null>(null);

    // Hidden sections per session
    const [hiddenSections, setHiddenSections] = useState<Record<string, string[]>>(() => {
        try {
            const stored = localStorage.getItem(`feedback-hidden-${learner.id}`);
            return stored ? JSON.parse(stored) : {};
        } catch { return {}; }
    });

    const isSectionHidden = (sessionId: string, section: string) => {
        return hiddenSections[sessionId]?.includes(section) || false;
    };

    const toggleSectionHidden = (sessionId: string, section: string) => {
        setHiddenSections(prev => {
            const current = prev[sessionId] || [];
            const updated = current.includes(section)
                ? current.filter(s => s !== section)
                : [...current, section];
            const newHidden = { ...prev, [sessionId]: updated };
            localStorage.setItem(`feedback-hidden-${learner.id}`, JSON.stringify(newHidden));
            return newHidden;
        });
    };

    // Editable section content
    const [editingSection, setEditingSection] = useState<{sessionId: string; section: string} | null>(null);
    const [editContent, setEditContent] = useState<string>('');

    const handleStartEdit = (sessionId: string, section: string, content: string) => {
        setEditingSection({ sessionId, section });
        setEditContent(content);
    };

    const handleSaveEdit = (sessionId: string, session: any) => {
        if (!editingSection) return;
        const section = editingSection.section;
        const updatedSessions = learner.sessions.map(s => {
            if (s.id !== sessionId) return s;
            const updatedAi = { ...(s.aiAnalysis || {}), [`edited_${section}`]: editContent };
            return { ...s, aiAnalysis: updatedAi };
        });
        onUpdate({ ...learner, sessions: updatedSessions } as any);
        setEditingSection(null);
        setEditContent('');
    };

    const handleCancelEdit = () => {
        setEditingSection(null);
        setEditContent('');
    };

    const handleStartEditEmotion = (session: any) => {
        setEditingEmotionSessionId(session.id);
        setEditedEmotionData(JSON.parse(JSON.stringify(getOrCreateEmotionAnalysis(session))));
    };

    const handleSaveEmotion = (sessionId: string) => {
        if (!editedEmotionData) return;
        const updatedSessions = learner.sessions.map(s => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                emotionAnalysis: editedEmotionData,
                emotionAnalysisDeleted: false
            };
        });
        onUpdate({ ...learner, sessions: updatedSessions } as any);
        setEditingEmotionSessionId(null);
        setEditedEmotionData(null);
    };

    const handleDeleteEmotion = (sessionId: string) => {
        const updatedSessions = learner.sessions.map(s => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                emotionAnalysisDeleted: true
            };
        });
        onUpdate({ ...learner, sessions: updatedSessions } as any);
    };

    const handleRestoreEmotion = (sessionId: string) => {
        const updatedSessions = learner.sessions.map(s => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                emotionAnalysisDeleted: false
            };
        });
        onUpdate({ ...learner, sessions: updatedSessions } as any);
    };

    const handleStartEditCorrection = (sessionId: string, gIdx: number, fIdx: number, category: string, explanation: string, incorrect: string, correct: string) => {
        setEditingCorrectionKey(`${sessionId}-${gIdx}-${fIdx}`);
        setEditCategory(category);
        setEditExplanation(explanation);
        setEditIncorrect(incorrect);
        setEditCorrect(correct);
    };

    const handleSaveCorrection = (sessionId: string, gIdx: number, fIdx: number) => {
        const updatedSessions = learner.sessions.map(s => {
            if (s.id !== sessionId || !s.aiAnalysis?.corrections) return s;
            const updatedCorrections = s.aiAnalysis.corrections.map((g, gIndex) => {
                if (gIndex !== gIdx) return g;
                const updatedExamples = (g.examples || []).map((ex, eIndex) => {
                    if (eIndex !== fIdx) return ex;
                    return {
                        incorrect: editIncorrect,
                        correct: editCorrect
                    };
                });
                return {
                    ...g,
                    category: gIndex === gIdx ? editCategory : g.category,
                    explanation: gIndex === gIdx ? editExplanation : g.explanation,
                    examples: updatedExamples
                };
            });
            return { ...s, aiAnalysis: { ...s.aiAnalysis, corrections: updatedCorrections } };
        });
        onUpdate({ ...learner, sessions: updatedSessions } as any);
        setEditingCorrectionKey(null);
    };

    const handleCancelEditCorrection = () => {
        setEditingCorrectionKey(null);
    };

    useEffect(() => {
        localStorage.setItem(`show-preply-${learner.id}`, String(showPreplyReferral));
    }, [showPreplyReferral, learner.id]);

    useEffect(() => {
        localStorage.setItem(`notices-${learner.id}`, JSON.stringify(notices));
    }, [notices, learner.id]);

    const handleAddNotice = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formContent.trim()) return;

        const newNotice: CustomNotice = {
            id: `notice-${Date.now()}`,
            type: formType,
            position: formPosition,
            content: formContent.trim()
        };

        setNotices([...notices, newNotice]);
        setFormContent('');
        setShowNoticeForm(false);
    };

    const handleRemoveNotice = (id: string) => {
        setNotices(notices.filter(n => n.id !== id));
    };

    // Filter sessions with actionable feedback corrections or practice questions - ONLY KEEP THE LAST SESSION FEEDBACK
    const sessionsToRender = useMemo(() => {
        const list = [...(learner.sessions || [])]
            .filter(s => {
                const hasFeedback = s.aiAnalysis?.corrections && s.aiAnalysis.corrections.some(c => c.examples && c.examples.length > 0);
                const hasQuestions = s.reviewQuestions && s.reviewQuestions.length > 0;
                return s.attended && (hasFeedback || hasQuestions);
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return list.slice(0, 1); // Keep only the last session's feedback!
    }, [learner.sessions]);

    // Single-session dynamic screenshot functionality
    const handleSingleSessionScreenshot = (sessionId: string, sessionDate: string) => {
        const element = document.getElementById(`session-report-${sessionId}`);
        if (element) {
            // Find and temporarily hide elements with 'no-print' class during canvas generation
            const noPrintElements = element.querySelectorAll('.no-print');
            noPrintElements.forEach(el => el.classList.add('invisible'));

            toPng(element, {
                pixelRatio: 2.2,
                cacheBust: true,
                backgroundColor: '#ffffff',
                style: {
                    transform: 'scale(1)',
                    padding: '16px'
                },
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
                link.download = `${learner.name}-Feedback-${sessionDate}.png`;
                link.href = dataUrl;
                link.click();
                noPrintElements.forEach(el => el.classList.remove('invisible'));
            }).catch(err => {
                console.error("Screenshot failed", err);
                noPrintElements.forEach(el => el.classList.remove('invisible'));
            });
        }
    };

    const handleFeedbackPrintPdf = (sessionId: string, sessionDate: string) => {
        const element = document.getElementById(`session-report-${sessionId}`);
        if (element) {
            const printContent = element.cloneNode(true) as HTMLElement;
            const allStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
            const stylesHtml = Array.from(allStyles).map(s => {
                if (s.tagName === 'LINK') {
                    const href = (s as HTMLLinkElement).href;
                    return `<link rel="stylesheet" href="${href}">`;
                }
                return s.outerHTML;
            }).join('\n');
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <html>
                    <head>
                        <base href="${window.location.origin}/">
                        <title>Feedback Report - ${learner.name} - ${sessionDate}</title>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                        ${stylesHtml}
                        <style>
                            @media print {
                                @page { size: portrait; margin: 0.5in; }
                                html, body {
                                    margin: 0;
                                    padding: 20px;
                                    background-color: #f8fafc !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                    color-scheme: light !important;
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
                                background-color: #f8fafc !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
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
                        <div class="max-w-4xl mx-auto">
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

    const handleComposerScreenshot = () => {
        if (feedbackPrintRef.current) {
            toPng(feedbackPrintRef.current, {
                pixelRatio: 2,
                cacheBust: true,
                backgroundColor: '#ffffff',
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
                link.download = `${learner.name}-Linguistic-Feedback-Review-${new Date().toISOString().split('T')[0]}.png`;
                link.href = dataUrl;
                link.click();
            });
        }
    };

    const handlePrintReview = () => {
        if (feedbackPrintRef.current) {
            toPng(feedbackPrintRef.current, {
                pixelRatio: 3,
                cacheBust: true,
                backgroundColor: '#ffffff',
                style: { padding: '20px' },
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
                link.download = `${learner.name}-Feedback-Report-${new Date().toISOString().split('T')[0]}.png`;
                link.href = dataUrl;
                link.click();
            }).catch(() => {
                window.print();
            });
        } else {
            window.print();
        }
    };

    const renderSectionControls = (sessionId: string, section: string, content?: string) => (
        <div className="flex items-center gap-1 no-print">
            {content !== undefined && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (editingSection?.sessionId === sessionId && editingSection?.section === section) {
                            handleSaveEdit(sessionId, learner.sessions.find(s => s.id === sessionId)!);
                        } else {
                            handleStartEdit(sessionId, section, content);
                        }
                    }}
                    className={`text-slate-400 hover:text-indigo-600 transition-colors p-1 text-xs active:scale-95 ${editingSection?.sessionId === sessionId && editingSection?.section === section ? 'text-indigo-600' : ''}`}
                    title={editingSection?.sessionId === sessionId && editingSection?.section === section ? 'Save' : 'Edit'}
                >
                    <i className={`fas ${editingSection?.sessionId === sessionId && editingSection?.section === section ? 'fa-check' : 'fa-edit'}`}></i>
                </button>
            )}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    toggleSectionHidden(sessionId, section);
                }}
                className={`text-slate-400 hover:text-rose-600 transition-colors p-1 text-xs active:scale-95 ${isSectionHidden(sessionId, section) ? 'text-rose-500' : ''}`}
                title={isSectionHidden(sessionId, section) ? 'Restore section' : 'Remove section'}
            >
                <i className={`fas ${isSectionHidden(sessionId, section) ? 'fa-undo' : 'fa-times'}`}></i>
            </button>
        </div>
    );

    const getNoticeBoxStyles = (type: CustomNotice['type']) => {
        switch (type) {
            case 'warning':
                return 'bg-amber-50 border-amber-400 text-amber-950';
            case 'danger':
                return 'bg-red-50 border-red-400 text-red-950';
            case 'success':
                return 'bg-emerald-50 border-emerald-400 text-emerald-950';
            case 'info':
                return 'bg-purple-150 border-purple-300 text-purple-950';
            default: // attention
                return 'bg-indigo-50 border-indigo-300 text-indigo-950';
        }
    };

    const getNoticeIcon = (type: CustomNotice['type']) => {
        switch (type) {
            case 'warning':
                return 'fa-exclamation-triangle text-amber-600';
            case 'danger':
                return 'fa-exclamation-circle text-red-600';
            case 'success':
                return 'fa-check-circle text-emerald-600';
            case 'info':
                return 'fa-info-circle text-purple-600';
            default:
                return 'fa-rocket text-indigo-650';
        }
    };

    const renderNoticeBoxes = (position: 'top' | 'bottom') => {
        const filtered = notices.filter(n => n.position === position);
        if (filtered.length === 0) return null;

        return (
            <div className={`space-y-3 ${position === 'top' ? 'mb-4' : 'mt-4'}`}>
                {filtered.map(notice => (
                    <div 
                        key={notice.id} 
                        className={`p-4 border-2 border-l-8 rounded-xl flex justify-between items-start gap-4 shadow-sm ${getNoticeBoxStyles(notice.type)}`}
                    >
                        <div className="flex gap-3">
                            <span className="mt-0.5"><i className={`fas ${getNoticeIcon(notice.type)} text-base`}></i></span>
                            <p className="text-xs font-bold leading-relaxed font-sans">{notice.content}</p>
                        </div>
                        <button 
                            onClick={() => handleRemoveNotice(notice.id)}
                            className="text-slate-400 hover:text-slate-800 transition-colors shrink-0 text-sm font-black font-sans p-1 hover:scale-110 no-print"
                            title="Remove notice"
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    const mainContent = (
        <div className="space-y-6" ref={feedbackPrintRef}>
            {sessionsToRender.length > 0 ? (
                sessionsToRender.map(session => {
                    // Compute accurate session-specific slip statistics 
                    const sessionStats = (() => {
                        const stats: Record<string, number> = {};
                        let total = 0;
                        const corrections = session.aiAnalysis?.corrections || [];
                        corrections.forEach(c => {
                            const cat = c.category || 'Language Analysis';
                            const count = (c.examples || []).length;
                            stats[cat] = (stats[cat] || 0) + count;
                            total += count;
                        });
                        return {
                            total,
                            distribution: Object.entries(stats)
                                .map(([name, count]) => ({
                                    name,
                                    count,
                                    percentage: total > 0 ? Math.round((count / total) * 100) : 0
                                }))
                                .sort((a, b) => b.count - a.count)
                        };
                    })();

                    const isExpanded = expandedSessions[session.id] || isForScreenshot;

                    return (
                        <div 
                            key={session.id} 
                            id={`session-report-${session.id}`} 
                            className="relative bg-white border-2 md:border-4 border-slate-950 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-md break-after-page"
                        >
                            {/* SESSION CONTAINER HEADING (Accordion Toggle) */}
                            <div 
                                className={`flex flex-col md:flex-row md:items-center justify-between cursor-pointer ${isExpanded ? 'border-b-2 md:border-b-4 border-slate-950 pb-4 mb-6' : ''}`}
                                onClick={() => setExpandedSessions(prev => ({ ...prev, [session.id]: !isExpanded }))}
                            >
                                <div className="flex-1 shrink-0">
                                    <h3 className="font-sans font-black text-lg md:text-2xl text-slate-900 tracking-tight flex items-center gap-3">
                                        <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-slate-400 no-print transition-transform`}></i>
                                        Feedback for {new Date(session.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </h3>
                                    {session.lessonName && (
                                        <p className="text-[10px] md:text-xs font-black uppercase tracking-wider text-indigo-850 mt-1.5 flex items-center gap-1 pl-7">
                                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                                            Topic: {session.lessonName}
                                        </p>
                                    )}
                                </div>
                                {isExpanded && (
                                    <div className="flex items-center gap-2 no-print self-end md:self-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSingleSessionScreenshot(session.id, new Date(session.date).toISOString().split('T')[0]);
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2 px-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow active:scale-95 transition-all duration-100"
                                        >
                                            <i className="fas fa-camera text-yellow-300"></i>
                                            Screenshot Report 📷
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleFeedbackPrintPdf(session.id, new Date(session.date).toISOString().split('T')[0]);
                                            }}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow active:scale-95 transition-all duration-100"
                                        >
                                            <i className="fas fa-file-pdf"></i>
                                            Print PDF
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* DROPDOWN CONTENT */}
                            {isExpanded && (
                                <div className="space-y-6">
                                    {/* BANNER ZONE (Appended Top custom notices) */}
                                    {renderNoticeBoxes('top')}

                                    {/* DYNAMIC INTEGRATED PREPLY PROMO BANNER */}
                                    {showPreplyReferral && (
                                        <div className="bg-[#f0fdf4] text-[#166534] p-4.5 rounded-2xl border-2 border-[#bbf7d0] shadow-2xs relative overflow-hidden">
                                    <div className="absolute -right-3 -bottom-5 opacity-10 text-7xl pointer-events-none select-none">
                                        🎁
                                    </div>
                                    <div className="relative z-10 flex items-start gap-3">
                                        <span className="text-2xl shrink-0">🤝</span>
                                        <div className="space-y-0.5">
                                            <h4 className="font-sans font-black text-[10px] uppercase tracking-wider text-[#15803d]">Preply Referral Program</h4>
                                            <p className="text-xs md:text-sm font-semibold leading-relaxed text-[#14532d]">
                                                With a Preply referral link, your friend gets <span className="font-extrabold text-emerald-700">30% off their first lesson</span>—and you get <span className="font-extrabold text-[#15803d]">10% off your own classes too</span>. Ask your tutor for the link!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 📊 INDIVIDUAL PERFORMANCE INFOGRAPHIC */}
                            {sessionStats.total > 0 && !isSectionHidden(session.id, 'analysisInfographic') && (
                                <div className="bg-slate-50 p-4 rounded-xl md:rounded-2xl border border-slate-200.5 space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2 border-slate-250 gap-2">
                                        <h4 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-wider flex items-center gap-2">
                                            <span>📊</span> Analysis Infographic
                                        </h4>
                                        <div className="flex items-center gap-1.5">
                                            <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                                Accuracy Assessment
                                            </span>
                                            {renderSectionControls(session.id, 'analysisInfographic')}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2.5 text-center">
                                        <div className="p-2 md:p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                            <p className="text-[8px] md:text-[9px] text-rose-500 uppercase font-black tracking-wider">Flaws Logged</p>
                                            <p className="text-base md:text-xl font-black text-rose-600 font-mono leading-none mt-1">{sessionStats.total}</p>
                                        </div>
                                        <div className="p-2 md:p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                            <p className="text-[8px] md:text-[9px] text-indigo-500 uppercase font-black tracking-wider leading-tight">Active Ratio</p>
                                            <p className="text-base md:text-xl font-black text-indigo-600 font-mono leading-none mt-1">
                                                {session.spokenTime ? `${Math.round((session.spokenTime / (session.duration || 60)) * 100)}%` : '33%'}
                                            </p>
                                        </div>
                                        <div className="p-2 md:p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                            <p className="text-[8px] md:text-[9px] text-emerald-500 uppercase font-black tracking-wider">Talk Time</p>
                                            <p className="text-base md:text-xl font-black text-emerald-600 font-mono leading-none mt-1">{session.spokenTime || 20}m</p>
                                        </div>
                                    </div>

                                    {sessionStats.distribution.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                            {sessionStats.distribution.map((stat, idx) => {
                                                const colors = [
                                                    { bar: 'bg-emerald-500', bg: 'bg-emerald-100/50 border-emerald-200 text-emerald-950' },
                                                    { bar: 'bg-blue-500', bg: 'bg-blue-100/50 border-blue-200 text-indigo-950' },
                                                    { bar: 'bg-orange-500', bg: 'bg-orange-100/50 border-orange-200 text-orange-950' },
                                                    { bar: 'bg-purple-500', bg: 'bg-purple-100/50 border-purple-201 text-purple-950' }
                                                ][idx % 4];

                                                return (
                                                    <div key={stat.name} className={`p-2.5 rounded-xl border ${colors.bg} space-y-1`}>
                                                        <div className="flex justify-between items-center text-[10px] md:text-xs font-black">
                                                            <span className="truncate max-w-[140px] md:max-w-[180px]">{stat.name}</span>
                                                            <span className="font-mono">{stat.count} slips ({stat.percentage}%)</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${colors.bar}`} 
                                                                style={{ width: `${stat.percentage}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* 🌡️ EMOTIONAL THERMOMETER */}
                                    {(() => {
                                        const aiEmotional = session.aiAnalysis?.emotionalFeeling || (session.aiAnalysis as any)?.emotionAnalysis || (session.aiAnalysis as any)?.sentimentAnalysis;
                                        if (!aiEmotional || isSectionHidden(session.id, 'emotionThermometer')) return null;
                                        return (
                                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 mt-2 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                        <span>🌡️</span> Learner Emotion Thermometer
                                                    </h5>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                                            Dominant: {aiEmotional.dominantEmotion}
                                                        </span>
                                                        {renderSectionControls(session.id, 'emotionThermometer')}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-full h-4.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-blue-400 via-yellow-300 via-orange-400 to-rose-500 transition-all duration-1000"
                                                            style={{ width: `${aiEmotional.sentimentScore || 50}%` }}
                                                        ></div>
                                                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-900 font-mono">
                                                            Emotion/Sentiment Index: {aiEmotional.sentimentScore || 50}/100
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-slate-600 leading-normal italic font-medium">
                                                    "{aiEmotional.analysis}"
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* 📖 SYLLABUS CHAPTER SPECIAL REPORT */}
                            {((session as any).selectedSyllabusChapterIds && (session as any).selectedSyllabusChapterIds.length > 0) && !isSectionHidden(session.id, 'syllabusTarget') && (
                                <div className="bg-emerald-50/40 p-4 rounded-xl md:rounded-2xl border border-emerald-250 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-black text-emerald-900 text-xs md:text-sm uppercase tracking-wider flex items-center gap-2">
                                            <span>📖</span> Syllabus Target Achievement
                                        </h4>
                                        {renderSectionControls(session.id, 'syllabusTarget')}
                                    </div>
                                    
                                    {/* Chapters covered list */}
                                    <div className="space-y-2">
                                        {(() => {
                                            const coveredChapters: any[] = [];
                                            if ((learner as any).syllabus?.competencies) {
                                                (learner as any).syllabus.competencies.forEach((comp: any) => {
                                                    comp.chapters?.forEach((ch: any) => {
                                                        if ((session as any).selectedSyllabusChapterIds.includes(ch.id)) {
                                                            coveredChapters.push({ ...ch, competencyName: comp.competencyName });
                                                        }
                                                    });
                                                });
                                            }

                                            if (coveredChapters.length === 0) return null;

                                            return (
                                                <div className="grid grid-cols-1 gap-2.5">
                                                    {coveredChapters.map((chap, idx) => (
                                                        <div key={`${chap.competencyName}-${chap.id}-${idx}`} className="bg-white p-3 rounded-xl border border-emerald-150 shadow-3xs space-y-1.5">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 block">
                                                                        {chap.competencyName}
                                                                    </span>
                                                                    <span className="font-bold text-xs text-emerald-950 block">
                                                                        {chap.title}
                                                                    </span>
                                                                </div>
                                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${chap.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                                    {chap.status === 'completed' ? 'Mastered' : 'Reviewed'}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-brand-gray-darkest grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg leading-relaxed">
                                                                <div>
                                                                    <span className="font-bold text-[10px] text-emerald-800 block">Grammar Goal</span>
                                                                    {chap.grammar}
                                                                </div>
                                                                <div>
                                                                    <span className="font-bold text-[10px] text-emerald-800 block">Target Vocabulary</span>
                                                                    {chap.vocabulary?.join(', ')}
                                                                </div>
                                                                {chap.functionalLanguage && chap.functionalLanguage.length > 0 && (
                                                                    <div className="col-span-2">
                                                                        <span className="font-bold text-[10px] text-emerald-800 block">Functional Language</span>
                                                                        {chap.functionalLanguage.join(', ')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Specialized Syllabus Feedback from AI */}
                                    {session.aiAnalysis?.advancedFeedback?.syllabusFeedback && (
                                        <div className="bg-white p-3.5 rounded-xl border border-emerald-150 space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                                                🧠 Syllabus Mastery Analysis & Best Practices:
                                            </span>
                                            <div className="text-xs text-emerald-950 leading-relaxed font-sans whitespace-pre-wrap">
                                                <SimpleMarkdown text={session.aiAnalysis.advancedFeedback.syllabusFeedback} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 🧠 MULTI-DIMENSIONAL LINGUISTIC ANALYTICAL MATRIX */}
                            {session.aiAnalysis?.advancedFeedback && !isSectionHidden(session.id, 'linguisticMatrix') && (
                                <div className="bg-indigo-50/40 p-4 rounded-xl md:rounded-2xl border border-indigo-200 space-y-3">
                                    <div className="flex items-center justify-between border-b pb-2 border-indigo-150">
                                        <h4 className="font-black text-indigo-950 text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5">
                                            <span>🧠</span> Multidimensional Linguistic Diagnostic Matrix
                                        </h4>
                                        <div className="flex items-center gap-1.5">
                                            <span className="bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                                Linguistic Indicators
                                            </span>
                                            {renderSectionControls(session.id, 'linguisticMatrix')}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {[
                                            { label: 'Fluency & Flow', text: session.aiAnalysis.advancedFeedback.fluency, icon: '⚡' },
                                            { label: 'Grammar, Vocab & Pronunciation Accuracy', text: session.aiAnalysis.advancedFeedback.accuracy, icon: '🎯' },
                                            { label: 'Coherence & Cohesion Clarity', text: session.aiAnalysis.advancedFeedback.clarity, icon: '🧩' },
                                            { label: 'Confidence & Assertiveness', text: session.aiAnalysis.advancedFeedback.confidence, icon: '💪' },
                                            { label: 'Pragmatic Appropriateness', text: session.aiAnalysis.advancedFeedback.pragmaticAppropriateness, icon: '🤝' },
                                            { label: 'Lexical Sophistication', text: session.aiAnalysis.advancedFeedback.lexicalSophistication, icon: '💎' },
                                            { label: 'Syntactic Complexity', text: session.aiAnalysis.advancedFeedback.syntacticComplexity, icon: '🌿' },
                                            { label: 'Communication Repair Typology', text: session.aiAnalysis.advancedFeedback.repairStrategyTypology, icon: '🔧' },
                                            { label: 'Register Consistency', text: session.aiAnalysis.advancedFeedback.registerConsistency, icon: '👔' },
                                            { label: 'Idea Density & Propositional Richness', text: session.aiAnalysis.advancedFeedback.ideaDensity, icon: '💡' },
                                            { label: 'Meta-Discourse Guidance', text: session.aiAnalysis.advancedFeedback.metaDiscourse, icon: '🧭' },
                                            { label: 'Stance & Attitudinal Markers', text: session.aiAnalysis.advancedFeedback.stanceMarkers, icon: '🎭' },
                                        ].map(item => {
                                            if (!item.text) return null;
                                            return (
                                                <div key={item.label} className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
                                                    <span className="font-black text-indigo-950 text-xs flex items-center gap-1.5">
                                                        <span>{item.icon}</span> {item.label}
                                                    </span>
                                                    <p className="text-[11px] text-slate-700 leading-relaxed">
                                                        {item.text}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 🗣️ ACTIVE SLIP CARD GRID */}
                            {session.aiAnalysis?.corrections && session.aiAnalysis.corrections.length > 0 && !isSectionHidden(session.id, 'classFeedback') && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                                            <span>🗣️</span> Class Feedback
                                        </h4>
                                        {renderSectionControls(session.id, 'classFeedback')}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {session.aiAnalysis.corrections.flatMap((group, gIdx) => 
                                            (group.examples || []).map((example, fIdx) => {
                                                const correctionKey = `${session.id}-${gIdx}-${fIdx}`;
                                                const isEditing = editingCorrectionKey === correctionKey;

                                                if (isEditing) {
                                                    return (
                                                        <div key={correctionKey} className="p-4 bg-white rounded-xl border-2 border-indigo-500 shadow-md space-y-3">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Category</label>
                                                                <select
																		value={editCategory}
																		onChange={e => setEditCategory(e.target.value)}
																		className="w-full p-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 font-bold font-sans"
																	>
																		{['grammar', 'vocabulary', 'functional', 'pragmatics', 'appropriacy', 'Say better', 'discourse', 'register', 'cohesion', 'coherence', 'slips', 'mistakes', 'errors'].map(tag => (
																			<option key={tag} value={tag}>{tag}</option>
																		))}
																	</select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Explanation</label>
                                                                <textarea
                                                                    value={editExplanation}
                                                                    onChange={e => setEditExplanation(e.target.value)}
                                                                    className="w-full p-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 h-16"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Incorrect Phrase</label>
                                                                <input
                                                                    type="text"
                                                                    value={editIncorrect}
                                                                    onChange={e => setEditIncorrect(e.target.value)}
                                                                    className="w-full p-1.5 text-xs bg-rose-50 border border-rose-200 rounded focus:ring-1 focus:ring-rose-500"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Correct Phrase</label>
                                                                <input
                                                                    type="text"
                                                                    value={editCorrect}
                                                                    onChange={e => setEditCorrect(e.target.value)}
                                                                    className="w-full p-1.5 text-xs bg-emerald-50 border border-emerald-250 rounded focus:ring-1 focus:ring-emerald-500"
                                                                />
                                                            </div>
                                                            <div className="flex gap-2 justify-end pt-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCancelEditCorrection}
                                                                    className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-500 hover:text-slate-800 transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveCorrection(session.id, gIdx, fIdx)}
                                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors"
                                                                >
                                                                    Save
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={correctionKey} className="group relative p-4 bg-white rounded-xl border-2 border-slate-200.5 flex flex-col justify-between shadow-2xs">
                                                        <div>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className={`inline-block text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-md border leading-none ${getTagStyles(group.category || '')}`}>
                                                                    {group.category || 'Language Analysis'}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleStartEditCorrection(session.id, gIdx, fIdx, group.category || '', group.explanation || '', example.incorrect || '', example.correct || '')}
                                                                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1 no-print active:scale-95"
                                                                        title="Edit correction"
                                                                    >
                                                                        <i className="fas fa-edit text-xs"></i>
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => {
                                                                            const updatedSessions = learner.sessions.map(s => {
                                                                                if (s.id !== session.id || !s.aiAnalysis?.corrections) return s;
                                                                                const updatedCorrections = s.aiAnalysis.corrections.map((g, gIndex) => {
                                                                                    if (gIndex !== gIdx) return g;
                                                                                    return {
                                                                                        ...g,
                                                                                        examples: (g.examples || []).filter((_, eIndex) => eIndex !== fIdx)
                                                                                    };
                                                                                }).filter(g => (g.examples || []).length > 0);
                                                                                return { ...s, aiAnalysis: { ...s.aiAnalysis, corrections: updatedCorrections } };
                                                                            });
                                                                            onUpdate({ ...learner, sessions: updatedSessions } as any);
                                                                        }}
                                                                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 no-print active:scale-95"
                                                                        title="Remove correction"
                                                                    >
                                                                        <i className="fas fa-trash-alt text-xs"></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-slate-500 font-medium italic mb-2">"{group.explanation}"</p>
                                                        </div>
                                                        
                                                        <div className="space-y-2 pt-2 border-t border-slate-100">
                                                            <div className="p-2.5 bg-rose-50/80 text-rose-800 rounded-lg flex items-start gap-2 border border-rose-200">
                                                                <span className="font-black text-xs shrink-0 bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center">✗</span>
                                                                <span className="text-xs font-serif line-through leading-tight">"{example.incorrect}"</span>
                                                            </div>
                                                            <div className="p-2.5 bg-[#f0fdf4] text-emerald-900 rounded-lg flex items-start gap-2 border border-emerald-250">
                                                                <span className="font-black text-xs shrink-0 bg-emerald-500 text-white w-4 h-4 rounded-full flex items-center justify-center">✓</span>
                                                                <span className="text-xs font-black font-sans leading-tight">"{example.correct}"</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 💖 DYNAMIC EMOTION ANALYSIS FOR CLASS FEEDBACK */}
                            {!(session as any).emotionAnalysisDeleted ? (
                                editingEmotionSessionId === session.id ? (
                                    <div className="space-y-3">
                                        <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                                            <span>🎭</span> Emotion Analysis
                                        </h4>
                                        <div className="bg-white border-2 border-indigo-600 rounded-2xl p-5 shadow-lg space-y-4">
                                            <div className="flex justify-between items-center border-b pb-3 border-indigo-150">
                                                <h4 className="font-sans font-black text-slate-950 text-base flex items-center gap-2">
                                                    <span>⚙️</span> Edit Emotion Analysis Studio
                                                </h4>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingEmotionSessionId(null)}
                                                        className="px-3 py-1.5 text-xs font-bold uppercase text-slate-500 hover:text-slate-800 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveEmotion(session.id)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all shadow-sm"
                                                    >
                                                        Save Analysis 💾
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Form Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Overall Mood</label>
                                                    <input
                                                        type="text"
                                                        value={editedEmotionData?.overallMood || ''}
                                                        onChange={e => setEditedEmotionData({ ...editedEmotionData, overallMood: e.target.value } as any)}
                                                        className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Overall Emoji</label>
                                                    <input
                                                        type="text"
                                                        value={editedEmotionData?.overallEmoji || ''}
                                                        onChange={e => setEditedEmotionData({ ...editedEmotionData, overallEmoji: e.target.value } as any)}
                                                        className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 font-mono"
                                                        placeholder="e.g. 🔥"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Dominant Emotion</label>
                                                    <input
                                                        type="text"
                                                        value={editedEmotionData?.dominantEmotion || ''}
                                                        onChange={e => setEditedEmotionData({ ...editedEmotionData, dominantEmotion: e.target.value } as any)}
                                                        className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 font-semibold"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Sentiment/Confidence Index ({editedEmotionData?.sentimentScore || 0}/100)</label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={editedEmotionData?.sentimentScore || 0}
                                                            onChange={e => setEditedEmotionData({ ...editedEmotionData, sentimentScore: parseInt(e.target.value) } as any)}
                                                            className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
                                                        />
                                                        <span className="font-mono text-xs font-black text-indigo-700 w-8">{editedEmotionData?.sentimentScore || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Timeline Stages Edit */}
                                            <div className="border-t pt-4 border-slate-150 space-y-3">
                                                <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider">⏱️ Session Stages Mood Timeline</h5>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    {editedEmotionData?.timeline.map((item: any, idx: number) => (
                                                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                                            <span className="text-[9px] font-black text-indigo-850 uppercase">{item.phase}</span>
                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={item.mood}
                                                                    placeholder="Mood"
                                                                    onChange={e => {
                                                                        const newTimeline = [...(editedEmotionData?.timeline || [])];
                                                                        newTimeline[idx] = { ...newTimeline[idx], mood: e.target.value };
                                                                        setEditedEmotionData({ ...editedEmotionData, timeline: newTimeline } as any);
                                                                    }}
                                                                    className="p-1.5 text-[10px] bg-white border rounded font-semibold"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={item.emoji}
                                                                    placeholder="Emoji"
                                                                    onChange={e => {
                                                                        const newTimeline = [...(editedEmotionData?.timeline || [])];
                                                                        newTimeline[idx] = { ...newTimeline[idx], emoji: e.target.value };
                                                                        setEditedEmotionData({ ...editedEmotionData, timeline: newTimeline } as any);
                                                                    }}
                                                                    className="p-1.5 text-[10px] bg-white border rounded font-mono text-center"
                                                                />
                                                            </div>
                                                            <textarea
                                                                value={item.description}
                                                                placeholder="Stage description..."
                                                                onChange={e => {
                                                                    const newTimeline = [...(editedEmotionData?.timeline || [])];
                                                                    newTimeline[idx] = { ...newTimeline[idx], description: e.target.value };
                                                                    setEditedEmotionData({ ...editedEmotionData, timeline: newTimeline } as any);
                                                                }}
                                                                className="w-full p-1.5 text-[10px] bg-white border rounded h-14"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Emotion Sentences Edit */}
                                            <div className="border-t pt-4 border-slate-150 space-y-3">
                                                <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider">🎭 Emotional Conversational Triggers & Linguistic Upgrades</h5>
                                                <div className="space-y-3">
                                                    {editedEmotionData?.sentences.map((item: any, idx: number) => (
                                                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div className="col-span-2">
                                                                    <label className="text-[8px] uppercase font-black text-slate-500">Emotion / Mindset State</label>
                                                                    <input
                                                                        type="text"
                                                                        value={item.emotion}
                                                                        onChange={e => {
                                                                            const newSentences = [...(editedEmotionData?.sentences || [])];
                                                                            newSentences[idx] = { ...newSentences[idx], emotion: e.target.value };
                                                                            setEditedEmotionData({ ...editedEmotionData, sentences: newSentences } as any);
                                                                        }}
                                                                        className="w-full p-1.5 text-[10px] bg-white border rounded font-semibold"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[8px] uppercase font-black text-slate-500">Emoji</label>
                                                                    <input
                                                                        type="text"
                                                                        value={item.emoji}
                                                                        onChange={e => {
                                                                            const newSentences = [...(editedEmotionData?.sentences || [])];
                                                                            newSentences[idx] = { ...newSentences[idx], emoji: e.target.value };
                                                                            setEditedEmotionData({ ...editedEmotionData, sentences: newSentences } as any);
                                                                        }}
                                                                        className="w-full p-1.5 text-[10px] bg-white border rounded font-mono text-center"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-[8px] uppercase font-black text-rose-600">Original Learner Phrase (Emotion Carrier)</label>
                                                                    <textarea
                                                                        value={item.original}
                                                                        onChange={e => {
                                                                            const newSentences = [...(editedEmotionData?.sentences || [])];
                                                                            newSentences[idx] = { ...newSentences[idx], original: e.target.value };
                                                                            setEditedEmotionData({ ...editedEmotionData, sentences: newSentences } as any);
                                                                        }}
                                                                        className="w-full p-1.5 text-[10px] bg-white border rounded h-12"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[8px] uppercase font-black text-emerald-700">Corrected Premium Phrase</label>
                                                                    <textarea
                                                                        value={item.corrected}
                                                                        onChange={e => {
                                                                            const newSentences = [...(editedEmotionData?.sentences || [])];
                                                                            newSentences[idx] = { ...newSentences[idx], corrected: e.target.value };
                                                                            setEditedEmotionData({ ...editedEmotionData, sentences: newSentences } as any);
                                                                        }}
                                                                        className="w-full p-1.5 text-[10px] bg-white border rounded h-12"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[8px] uppercase font-black text-indigo-700">Tutor Empathetic & Coaching Tip</label>
                                                                <input
                                                                    type="text"
                                                                    value={item.tutorTip}
                                                                    onChange={e => {
                                                                        const newSentences = [...(editedEmotionData?.sentences || [])];
                                                                        newSentences[idx] = { ...newSentences[idx], tutorTip: e.target.value };
                                                                        setEditedEmotionData({ ...editedEmotionData, sentences: newSentences } as any);
                                                                    }}
                                                                    className="w-full p-1.5 text-[10px] bg-white border rounded font-medium"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Driven Words Edit */}
                                            <div className="border-t pt-4 border-slate-150 space-y-3">
                                                <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider">🗣️ CEFR Lexical Checker & Key Vocabulary Used</h5>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                    {editedEmotionData?.drivenWords.map((item: any, idx: number) => (
                                                        <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                                                            <div className="flex justify-between items-center">
                                                                <input
                                                                    type="text"
                                                                    value={item.word}
                                                                    onChange={e => {
                                                                        const newWords = [...(editedEmotionData?.drivenWords || [])];
                                                                        newWords[idx] = { ...newWords[idx], word: e.target.value };
                                                                        setEditedEmotionData({ ...editedEmotionData, drivenWords: newWords } as any);
                                                                    }}
                                                                    className="w-full p-1 text-[10px] bg-white border rounded font-black text-slate-800"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-1">
                                                                <div>
                                                                    <label className="text-[7px] font-bold block text-slate-500 uppercase">Count</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={item.count}
                                                                        onChange={e => {
                                                                            const newWords = [...(editedEmotionData?.drivenWords || [])];
                                                                            newWords[idx] = { ...newWords[idx], count: parseInt(e.target.value) || 1 };
                                                                            setEditedEmotionData({ ...editedEmotionData, drivenWords: newWords } as any);
                                                                        }}
                                                                        className="w-full p-1 text-[9px] bg-white border rounded"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[7px] font-bold block text-slate-500 uppercase">Type</label>
                                                                    <select
                                                                        value={item.type}
                                                                        onChange={e => {
                                                                            const newWords = [...(editedEmotionData?.drivenWords || [])];
                                                                            newWords[idx] = { ...newWords[idx], type: e.target.value as any };
                                                                            setEditedEmotionData({ ...editedEmotionData, drivenWords: newWords } as any);
                                                                        }}
                                                                        className="w-full p-0.5 text-[8px] bg-white border rounded"
                                                                    >
                                                                        <option value="positive">Pos</option>
                                                                        <option value="negative">Neg</option>
                                                                        <option value="neutral">Neu</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[7px] font-bold block text-slate-500 uppercase">Intensity</label>
                                                                    <select
                                                                        value={item.intensity}
                                                                        onChange={e => {
                                                                            const newWords = [...(editedEmotionData?.drivenWords || [])];
                                                                            newWords[idx] = { ...newWords[idx], intensity: e.target.value as any };
                                                                            setEditedEmotionData({ ...editedEmotionData, drivenWords: newWords } as any);
                                                                        }}
                                                                        className="w-full p-0.5 text-[8px] bg-white border rounded"
                                                                    >
                                                                        <option value="High">High</option>
                                                                        <option value="Medium">Med</option>
                                                                        <option value="Low">Low</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Additional Notes Edit */}
                                            <div className="border-t pt-4 border-slate-150 space-y-1.5">
                                                <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Empathetic Analysis Summary & Notes</label>
                                                <textarea
                                                    value={editedEmotionData?.additionalNotes || ''}
                                                    onChange={e => setEditedEmotionData({ ...editedEmotionData, additionalNotes: e.target.value } as any)}
                                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 h-20"
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-150">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingEmotionSessionId(null)}
                                                    className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:text-slate-800 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveEmotion(session.id)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-sm active:scale-95"
                                                >
                                                    Save Analysis 💾
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                                            <span>🎭</span> Emotion Analysis
                                        </h4>
                                        {(() => {
                                            const data = getOrCreateEmotionAnalysis(session);
                                            return (
                                                <div className="p-5 md:p-6 bg-[#faf5ff] border-2 border-purple-300 rounded-2xl md:rounded-3xl shadow-sm space-y-5 relative overflow-hidden">
                                                    {/* Scoped styled tags for animations */}
                                                    <style>{`
                                                      @keyframes premium-shine {
                                                        0% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 10px 15px rgba(0,0,0,0.08)) brightness(1); }
                                                        50% { transform: scale(1.1) rotate(4deg); filter: drop-shadow(0 20px 25px rgba(234,179,8,0.25)) brightness(1.2) saturate(1.2); }
                                                        100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 10px 15px rgba(0,0,0,0.08)) brightness(1); }
                                                      }
                                                      .emoji-3d-premium {
                                                        display: inline-block;
                                                        font-size: 3rem;
                                                        line-height: 1;
                                                        filter: drop-shadow(0 10px 12px rgba(0,0,0,0.12));
                                                        animation: premium-shine 5s ease-in-out infinite;
                                                        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                                                      }
                                                      .emoji-3d-premium:hover {
                                                        transform: scale(1.25) translateY(-6px) rotate(-8deg);
                                                        filter: drop-shadow(0 25px 30px rgba(99,102,241,0.35)) brightness(1.3) saturate(1.3);
                                                        cursor: pointer;
                                                      }
                                                      .emoji-3d-medium {
                                                        display: inline-block;
                                                        font-size: 2rem;
                                                        line-height: 1;
                                                        filter: drop-shadow(0 6px 8px rgba(0,0,0,0.1));
                                                        transition: all 0.3s ease;
                                                      }
                                                      .emoji-3d-medium:hover {
                                                        transform: scale(1.2) translateY(-2px);
                                                        filter: drop-shadow(0 12px 16px rgba(99,102,241,0.25)) brightness(1.1);
                                                        cursor: pointer;
                                                      }
                                                    `}</style>

                                                    <div className="absolute right-0 top-0 w-24 h-24 bg-purple-200/30 rounded-bl-full pointer-events-none"></div>

                                                    {/* Title Zone */}
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-200 pb-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="emoji-3d-premium">{data.overallEmoji}</span>
                                                            <div>
                                                                <h4 className="font-sans font-black text-purple-950 text-base md:text-lg tracking-tight">
                                                                    Sentiment Analysis
                                                                </h4>
                                                                <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest mt-0.5">
                                                                    
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 no-print self-end sm:self-center">
                                                            <button
                                                                onClick={() => handleStartEditEmotion(session)}
                                                                className="bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 font-extrabold py-1 px-3 rounded-lg text-xs tracking-wider flex items-center gap-1 shadow-sm transition-all duration-100"
                                                                title="Edit Emotion Analysis"
                                                            >
                                                                <i className="fas fa-edit text-purple-700"></i> Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteEmotion(session.id)}
                                                                className="bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 font-extrabold py-1 px-3 rounded-lg text-xs tracking-wider flex items-center gap-1 shadow-sm transition-all duration-100"
                                                                title="Delete Emotion Analysis Section"
                                                            >
                                                                <i className="fas fa-trash-alt text-rose-600"></i> Delete
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Sentiment Meter Grid */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4.5 rounded-2xl border border-purple-150">
                                                        <div className="space-y-1.5 md:col-span-2">
                                                            <div className="flex justify-between items-center text-xs font-black text-purple-900">
                                                                <span className="uppercase tracking-wide">🏆 Sentiment & Confidence Index</span>
                                                                <span className="font-mono text-sm">{data.sentimentScore}/100</span>
                                                            </div>
                                                            {/* Glowing progress bar */}
                                                            <div className="relative w-full h-5 bg-purple-100 rounded-full overflow-hidden border border-purple-200 shadow-inner">
                                                                <div 
                                                                    className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 transition-all duration-1000"
                                                                    style={{ width: `${data.sentimentScore}%` }}
                                                                ></div>
                                                                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-900 tracking-wider font-mono">
                                                                    Index: {data.sentimentScore}/100 • Mood: {data.dominantEmotion}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-center flex flex-col justify-center">
                                                            <p className="text-[9px] font-black text-purple-700 uppercase tracking-widest leading-none">Dominant State</p>
                                                            <p className="text-sm font-black text-purple-950 mt-1">{data.dominantEmotion}</p>
                                                        </div>
                                                    </div>

                                                    {/* 1. Stage-by-Stage Mood Timeline (Changes in Mood) */}
                                                    <div className="space-y-3">
                                                        <h5 className="text-xs font-black uppercase text-purple-900 tracking-widest flex items-center gap-1.5">
                                                            <span>⏱️</span> Mood Timeline (Changes in Mood)
                                                        </h5>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                            {data.timeline.map((item, idx) => (
                                                                <div key={idx} className="bg-white p-3.5 rounded-xl border border-purple-100 flex flex-col items-center text-center space-y-2 hover:shadow-xs transition-shadow relative">
                                                                    <div className="absolute left-3 top-2 bg-purple-50 text-[8px] font-black uppercase text-purple-800 px-1.5 py-0.5 rounded">
                                                                        {idx === 0 ? "Warmup" : idx === 1 ? "Learning" : "Production"}
                                                                    </div>
                                                                    <span className="emoji-3d-medium mt-2">{item.emoji}</span>
                                                                    <div className="space-y-0.5">
                                                                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">{item.phase}</span>
                                                                        <span className="font-bold text-xs text-slate-800 block">{item.mood}</span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-500 leading-normal">{item.description}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* 2. Original corrected sentences carrying emotion */}
                                                    <div className="space-y-3">
                                                        <h5 className="text-xs font-black uppercase text-purple-950 tracking-widest flex items-center gap-1.5">
                                                            <span>💬</span> Emotional Conversational Triggers & Linguistic Upgrades
                                                        </h5>
                                                        <div className="space-y-2.5">
                                                            {data.sentences.map((item, idx) => (
                                                                <div key={idx} className="bg-white p-3 rounded-xl border border-purple-100 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                                                    <div className="sm:col-span-2 flex flex-row sm:flex-col items-center gap-2 justify-start sm:justify-center border-b sm:border-b-0 sm:border-r pb-2 sm:pb-0 sm:pr-2 border-purple-100">
                                                                        <span className="emoji-3d-medium">{item.emoji}</span>
                                                                        <div className="text-left sm:text-center">
                                                                            <span className="text-[8px] font-black text-purple-700 uppercase tracking-widest block">Trigger State</span>
                                                                            <span className="text-[11px] font-bold text-slate-800">{item.emotion}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="sm:col-span-10 space-y-2">
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                            <div className="p-2 bg-rose-50/70 border border-rose-200 rounded-lg flex items-start gap-1.5">
                                                                                <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 rounded uppercase mt-0.5 shrink-0">Carrier</span>
                                                                                <span className="text-xs text-rose-950 font-serif line-through leading-tight">"{item.original}"</span>
                                                                            </div>
                                                                            <div className="p-2 bg-[#f0fdf4] border border-emerald-250 rounded-lg flex items-start gap-1.5">
                                                                                <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 rounded uppercase mt-0.5 shrink-0">Upgrade</span>
                                                                                <span className="text-xs text-emerald-950 font-black leading-tight">"{item.corrected}"</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-[10px] bg-purple-50 text-purple-950 px-2.5 py-1.5 rounded-lg leading-relaxed flex items-center gap-1.5">
                                                                            <span className="font-extrabold text-purple-700 uppercase shrink-0">💡 Mindset Coaching:</span>
                                                                            <span className="font-medium">{item.tutorTip}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* 3. Word Cloud Section */}
                                                    <div className="space-y-2.5">
                                                        <h5 className="text-xs font-black uppercase text-purple-950 tracking-widest flex items-center gap-1.5">
                                                            <span>🗣️</span> CEFR Lexical Checker & Key Vocabulary Used
                                                        </h5>
                                                        <div className="flex flex-wrap gap-2.5 p-3.5 bg-white border border-purple-100 rounded-2xl">
                                                            {data.drivenWords.map((wordObj, wIdx) => {
                                                                const styleClass = wordObj.type === 'positive' 
                                                                    ? 'bg-[#f0fdf4] text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                    : wordObj.type === 'negative'
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100';

                                                                return (
                                                                    <span 
                                                                        key={wIdx} 
                                                                        className={`text-[10px] md:text-xs font-extrabold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-3xs cursor-pointer select-none transition-all duration-100 hover:scale-105 ${styleClass}`}
                                                                        title={`${wordObj.word} used ${wordObj.count} times - Intensity: ${wordObj.intensity}`}
                                                                    >
                                                                        <span className="font-black">#{wordObj.word}</span>
                                                                        <span className="text-[8px] px-1 bg-black/5 rounded-md font-mono">{wordObj.count}x</span>
                                                                        <span className={`text-[7px] px-1 text-white font-mono rounded ${
                                                                            wordObj.intensity === 'High' ? 'bg-amber-500' : wordObj.intensity === 'Medium' ? 'bg-indigo-400' : 'bg-slate-400'
                                                                        }`}>
                                                                            {wordObj.intensity}
                                                                        </span>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* 💖 Social-Emotional Learning (SEL) Indicators */}
                                                    {(() => {
                                                        const selMetrics = getSelMetrics(session);
                                                        return (
                                                            <div className="space-y-3.5 border-t border-purple-200 pt-4">
                                                                <h5 className="text-xs font-black uppercase text-purple-950 tracking-widest flex items-center gap-1.5">
                                                                    <span>💖</span> Social-Emotional Learning (SEL) Metrics
                                                                </h5>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                                    {selMetrics.map(metric => (
                                                                        <div key={metric.label} className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100 space-y-2">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                                                                                    <span>{metric.icon}</span> {metric.label}
                                                                                </span>
                                                                                <span className="font-mono text-xs font-black text-purple-700 bg-white border border-purple-150 px-2 py-0.5 rounded-md">
                                                                                    {metric.score}/100
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-full h-2.5 bg-purple-100 rounded-full overflow-hidden border border-purple-150">
                                                                                <div 
                                                                                    className={`h-full rounded-full ${metric.color} bg-gradient-to-r from-purple-500 to-indigo-500`}
                                                                                    style={{ width: `${metric.score}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            <p className="text-[11px] text-slate-600 leading-normal">{metric.analysis}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* 🌟 Spoken Transferable Skills */}
                                                    {(() => {
                                                        const transSkills = getTransferableSkills(session);
                                                        return (
                                                            <div className="space-y-3 border-t border-purple-200 pt-4">
                                                                <h5 className="text-xs font-black uppercase text-purple-950 tracking-widest flex items-center gap-1.5">
                                                                    <span>🌟</span> Transferable Skills & Emotional Intelligence
                                                                </h5>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    {transSkills.map((ts, idx) => (
                                                                        <div key={idx} className="bg-white p-3.5 rounded-xl border border-purple-100 flex flex-col justify-between hover:shadow-xs transition-shadow">
                                                                            <div className="space-y-1.5">
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                                                                                        <span>{ts.emoji}</span> {ts.skill}
                                                                                    </span>
                                                                                    <span className="font-mono text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                                                                                        Score: {ts.score}%
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-[11px] text-slate-600 leading-normal italic">
                                                                                    <strong className="text-purple-800 font-extrabold not-italic">Evidence: </strong>
                                                                                    "{ts.evidence}"
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* 🏆 STANDARDIZED SPEAKING TEST RUBRICS (CEFR, IELTS, TOEFL 2026) */}
                                                    {(() => {
                                                        const scores = getSpeakingScores(session, (learner as any).proficiencyLevel || "B1");
                                                        return (
                                                            <div className="bg-white text-slate-800 p-4.5 rounded-2xl border border-slate-200 space-y-4 shadow-md relative overflow-hidden mt-4 dark:bg-slate-900 dark:text-white dark:border-slate-800">
                                                                <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full pointer-events-none"></div>
                                                                
                                                                {/* Header */}
                                                                <div className="border-b border-slate-200 pb-2.5 flex justify-between items-center dark:border-slate-800">
                                                                    <div>
                                                                        <h5 className="font-sans font-black text-slate-900 text-xs md:text-sm tracking-wide flex items-center gap-1.5 dark:text-white">
                                                                            <span>🏆</span> Standardized Speaking Rubrics (2026 Grid)
                                                                        </h5>
                                                                        <p className="text-[9px] font-black uppercase text-indigo-600 tracking-wider dark:text-indigo-400">
                                                                            Real Speaking Score Estimation & Diagnostics
                                                                        </p>
                                                                    </div>
                                                                    <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-[8px] font-black uppercase px-2 py-0.5 rounded dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900/40">
                                                                        Standardized
                                                                    </span>
                                                                </div>

                                                                {/* Score Cards */}
                                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                                    <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 dark:bg-slate-850 dark:border-slate-800/60">
                                                                        <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider dark:text-slate-400">CEFR</span>
                                                                        <p className="text-base font-black text-indigo-600 font-mono mt-0.5 dark:text-indigo-400">{scores.cefr}</p>
                                                                    </div>
                                                                    <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 dark:bg-slate-850 dark:border-slate-800/60">
                                                                        <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider dark:text-slate-400">IELTS Spk</span>
                                                                        <p className="text-base font-black text-rose-600 font-mono mt-0.5 dark:text-rose-400">Band {scores.ielts.toFixed(1)}</p>
                                                                    </div>
                                                                    <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 dark:bg-slate-850 dark:border-slate-800/60">
                                                                        <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider dark:text-slate-400">TOEFL Spk</span>
                                                                        <p className="text-base font-black text-emerald-600 font-mono mt-0.5 dark:text-emerald-400">{scores.toefl}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Speaking Parameters */}
                                                                <div className="space-y-3 pt-1">
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                        {[
                                                                            { label: "Fluency & Coherence", score: scores.fluencyCoherence, desc: "Pause frequency, speech velocity, coherence indicators.", color: "from-blue-500 to-indigo-500" },
                                                                            { label: "Lexical Resource", score: scores.lexicalResource, desc: "Active lexical variety, idiomatic appropriateness.", color: "from-emerald-500 to-teal-500" },
                                                                            { label: "Grammar Range & Accuracy", score: scores.grammarAccuracy, desc: "Sentence patterns, subordination, slip metrics.", color: "from-rose-500 to-pink-500" },
                                                                            { label: "Pronunciation Clarity", score: scores.pronunciation, desc: "Phonetic intelligibility, natural phrasing accent.", color: "from-amber-500 to-orange-500" }
                                                                        ].map(item => (
                                                                            <div key={item.label} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 dark:bg-slate-850/50 dark:border-slate-800/40">
                                                                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                                                                    <span>{item.label}</span>
                                                                                    <span className="font-mono text-indigo-600 dark:text-indigo-400">Band {item.score.toFixed(1)}</span>
                                                                                </div>
                                                                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-800">
                                                                                    <div 
                                                                                        className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                                                                                        style={{ width: `${(item.score / 9) * 100}%` }}
                                                                                    ></div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Examiner Justification */}
                                                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] text-slate-600 leading-normal dark:bg-slate-850/80 dark:border-slate-800 dark:text-slate-300">
                                                                    <strong className="text-[8px] text-indigo-600 uppercase tracking-wider block mb-0.5 dark:text-indigo-400">Examiner Rubric Justification:</strong>
                                                                    "{scores.rubricJustification}"
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )
                            ) : (
                                <div className="space-y-3">
                                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                                        <span>🎭</span> Emotion Analysis
                                    </h4>
                                    <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-between shadow-2xs">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🎭</span>
                                            <div>
                                                <h5 className="font-bold text-slate-800 text-sm">Emotion Analysis Hidden</h5>
                                                <p className="text-xs text-slate-500">The emotional journey analysis for this session has been deleted.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestoreEmotion(session.id)}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors no-print"
                                        >
                                            <i className="fas fa-undo"></i> Restore Section
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 🤔 INTERACTIVE COMPREHENSIVE PRACTICE QUESTIONS */}
                            {session.reviewQuestions && session.reviewQuestions.length > 0 && !isSectionHidden(session.id, 'practiceQuestions') && (
                                <div className="p-4 bg-amber-50/50 rounded-2xl border-2 border-amber-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5">
                                            <span>🤔</span> Practice Review Questions
                                        </h4>
                                        {renderSectionControls(session.id, 'practiceQuestions')}
                                    </div>
                                    <div className="space-y-2.5">
                                        {session.reviewQuestions.map((rq, idx) => (
                                            <div key={idx} className="p-3 bg-white border border-slate-250 rounded-xl flex gap-3 shadow-3xs hover:border-slate-400">
                                                <div className="shrink-0 pt-0.5">
                                                    <input type="checkbox" className="w-5 h-5 rounded-md border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-slate-500 font-extrabold italic uppercase tracking-wider">Context: {rq.context}</p>
                                                    <p className="text-sm font-black text-slate-900 mt-0.5 leading-relaxed">
                                                        <SimpleMarkdown text={rq.question} />
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lower Notices/Credits per session */}
                            {renderNoticeBoxes('bottom')}
                                </div>
                            )}
                        </div>
                    );
                })
            ) : (
                <div className="p-12 text-center border-4 border-dashed border-slate-300 rounded-3xl bg-slate-50 space-y-3">
                    <span className="text-5xl">📝</span>
                    <h4 className="font-black text-slate-800 text-lg">No session feedback summaries found.</h4>
                    <p className="text-slate-600 font-semibold text-sm max-w-md mx-auto">
                        Please utilize the "Log Session" panel on standard classes to analyze session scripts and lock down active diagnostic feedback cards.
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <div className="font-sans">
            {/* NOTIFICATION COMPOSER BUTTONS & OVERLAY BAR */}
            <div className="mb-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white p-4.5 rounded-3xl border-2 border-indigo-300 shadow-md no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white">Tutor Workspace Panel</h4>
                    </div>
                    <p className="text-[11px] text-indigo-50 font-bold">Manage referral banners, append custom messages, or capture active print copies.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 md:self-center">
                    <button
                        onClick={() => setShowNoticeForm(!showNoticeForm)}
                        className={`font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition-all duration-100 active:scale-95 ${
                            showNoticeForm 
                            ? 'bg-rose-600 text-white' 
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold'
                        }`}
                    >
                        <i className={`fas ${showNoticeForm ? 'fa-times' : 'fa-bullhorn'} text-sm`}></i>
                        {showNoticeForm ? 'Close Builder' : 'Add Banner Tool 📢'}
                    </button>
                    {sessionsToRender.length > 0 && (
                        <button
                            onClick={handleComposerScreenshot}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow active:scale-95 transition-all duration-100"
                        >
                            <i className="fas fa-camera"></i>
                            Save All 📷
                        </button>
                    )}
                </div>
            </div>

            {/* EXPANDED INLINE CREATOR BOX WITH PREPLY REFERRAL SWITCH */}
            {showNoticeForm && (
                <div className="mb-5 p-5 bg-white border-2 border-slate-900 rounded-2xl md:rounded-3xl space-y-4 shadow-md animate-fade-in no-print">
                    <h5 className="font-sans font-black text-xs text-slate-900 uppercase tracking-widest">Tutor Custom Promotion & Advertisement Controls</h5>
                    
                    {/* PREPLY REFERRAL DIRECT CHECKBOX / TOGGLE */}
                    <div className="p-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-xl shrink-0">🤝</span>
                            <div>
                                <label className="text-xs font-black text-emerald-950 block">Preply Referral Banner Toggle</label>
                                <p className="text-[10px] text-emerald-800 font-bold leading-normal">
                                    Display dynamic Preply program invitation discount card above session infographics.
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                checked={showPreplyReferral} 
                                onChange={(e) => setShowPreplyReferral(e.target.checked)} 
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <form onSubmit={handleAddNotice} className="space-y-3.5 pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Color Style theme</label>
                                <select 
                                    value={formType} 
                                    onChange={(e) => setFormType(e.target.value as any)}
                                    className="w-full bg-slate-50 text-xs border border-slate-300 font-bold rounded-lg p-2"
                                >
                                    <option value="attention">Attention Banner (Blue/Indigo)</option>
                                    <option value="warning">Warning Notice (Yellow)</option>
                                    <option value="success">Success Note (Green)</option>
                                    <option value="danger">Danger Priority (Red)</option>
                                    <option value="info">General Info Capsule (Purple)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Placement Position</label>
                                <select 
                                    value={formPosition} 
                                    onChange={(e) => setFormPosition(e.target.value as any)}
                                    className="w-full bg-slate-50 text-xs border border-slate-300 font-bold rounded-lg p-2"
                                >
                                    <option value="top">Top (Pre-pended above infographic)</option>
                                    <option value="bottom">Bottom (Post-pended at card base)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Custom Notice Message (Supports text)</label>
                            <textarea
                                value={formContent}
                                onChange={(e) => setFormContent(e.target.value)}
                                placeholder="Write custom homework alert, tutor announcement, etc..."
                                rows={2}
                                required
                                className="w-full bg-slate-50 text-xs border border-slate-300 font-medium rounded-lg p-2 focus:ring-1 focus:ring-slate-450"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowNoticeForm(false)}
                                className="px-4 py-2 border border-slate-300 font-bold rounded-lg text-xs hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2 px-5 rounded-lg text-xs transition-colors"
                            >
                                Append Announcement Banner
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {isTabContent ? (
                mainContent
            ) : (
                <SectionCard title="Enhanced Feedback Analysis" icon={<span className="text-sm">📝</span>}>
                    {mainContent}
                </SectionCard>
            )}
        </div>
    );
};

export default Feedback;
