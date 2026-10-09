
import React, { useState, useEffect } from 'react';
import { Learner, Badge, Session, GroupClass } from '../../../types2';
import { FIXED_BADGES, FIXED_PENALTIES } from '../../../constants2';
import Modal from '../Modal';

interface AddSessionFormProps {
    learner: Learner | GroupClass;
    onSaveSession: (sessionData: any) => Promise<void>;
    isOpen: boolean;
    onClose: () => void;
    sessionToEdit?: Session | null;
    liveSessionInfo?: { duration: number } | null;
    embedded?: boolean;
    initialDate?: string;
}

const inputClass = "w-full p-2 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue placeholder:text-brand-gray-medium";

const AddSessionForm: React.FC<AddSessionFormProps> = ({ learner, onSaveSession, isOpen, onClose, sessionToEdit, liveSessionInfo, embedded = false, initialDate }) => {
    const [date, setDate] = useState(initialDate || '');
    const [attended, setAttended] = useState(true);
    // Safe access for duration, checking if coursePlan exists (it does on both Learner and GroupClass)
    const [duration, setDuration] = useState(60);
    const [lessonName, setLessonName] = useState('');
    const [lessonSummary, setLessonSummary] = useState('');
    const [spokenTime, setSpokenTime] = useState(20);
    const [notes, setNotes] = useState('');
    const [metExpectations, setMetExpectations] = useState<string[]>([]);
    const [skillsLearned, setSkillsLearned] = useState('');
    const [needsHelp, setNeedsHelp] = useState('');
    const [selectedFixedBadges, setSelectedFixedBadges] = useState<string[]>([]);
    const [showCustomBadge, setShowCustomBadge] = useState(false);
    const [customBadgeInput, setCustomBadgeInput] = useState('');
    const [customBadges, setCustomBadges] = useState<string[]>([]);
    const [isLogging, setIsLogging] = useState(false);
    const [selectedFixedPenalties, setSelectedFixedPenalties] = useState<string[]>([]);
    const [customPenaltyInput, setCustomPenaltyInput] = useState('');
    const [customPenalties, setCustomPenalties] = useState<string[]>([]);
    const [showCustomPenalty, setShowCustomPenalty] = useState(false);
    
    // Manual AI Analysis Feature
    const [useManualAI, setUseManualAI] = useState(false);
    const [manualJsonInput, setManualJsonInput] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [selectedSyllabusChapterIds, setSelectedSyllabusChapterIds] = useState<string[]>([]);
    const [syllabusSearchTerm, setSyllabusSearchTerm] = useState('');

    const isEditMode = !!sessionToEdit;
    const expectationsList = learner.expectations?.split(',').map(e => e.trim()).filter(e => e.trim() !== '') || [];

    useEffect(() => {
        if (isOpen || embedded) {
            const plan = (learner as any).coursePlan || (learner as any).plan || {};
            if (isEditMode && sessionToEdit) {
                // Populate form for editing
                setDate(sessionToEdit.date);
                setAttended(sessionToEdit.attended);
                setDuration(sessionToEdit.duration ?? Number(plan.duration) ?? 60);
                setLessonName(sessionToEdit.lessonName ?? '');
                setLessonSummary(sessionToEdit.lessonSummary ?? '');
                setSpokenTime(sessionToEdit.spokenTime ?? 20);
                setNotes(sessionToEdit.script ?? ''); // Use script as the main notes field
                setMetExpectations(sessionToEdit.metExpectations ?? []);
                setSkillsLearned((sessionToEdit.skillsLearned ?? []).join('\n'));
                setNeedsHelp((sessionToEdit.needsHelp ?? []).join('\n'));
                setSelectedSyllabusChapterIds((sessionToEdit as any).selectedSyllabusChapterIds || []);
                
                const fixedBadges = (sessionToEdit.badges ?? []).filter(b => FIXED_BADGES.some(fb => fb.name === b.name)).map(b => b.name);
                setSelectedFixedBadges(fixedBadges);

                const customBadgesFromSession = (sessionToEdit.badges ?? [])
                    .filter(b => !FIXED_BADGES.some(fb => fb.name === b.name))
                    .map(b => b.name);
                setCustomBadges(customBadgesFromSession);
                setShowCustomBadge(customBadgesFromSession.length > 0);
                setCustomBadgeInput('');

                const fixedPenalties = (sessionToEdit.penalties ?? []).filter(p => FIXED_PENALTIES.some(fp => fp.name === p));
                setSelectedFixedPenalties(fixedPenalties);
                const customPenaltiesFromSession = (sessionToEdit.penalties ?? []).filter(p => !FIXED_PENALTIES.some(fp => fp.name === p));
                setCustomPenalties(customPenaltiesFromSession);
                setShowCustomPenalty(customPenaltiesFromSession.length > 0);
                setCustomPenaltyInput('');

            } else {
                // Reset form for adding
                setDate(initialDate || new Date().toISOString().split('T')[0]);
                setAttended(true);
                const initialDuration = Number(liveSessionInfo?.duration || plan.duration || 60);
                setDuration(initialDuration);
                const nextSessionNum = ((learner as any).sessions || []).length + 1;
                setLessonName('Session ' + nextSessionNum);
                setLessonSummary('');
                setSpokenTime(Math.round(initialDuration * 0.33)); // Default spoken time to 1/3 of duration
                setNotes('');
                setMetExpectations([]);
                setSkillsLearned('');
                setNeedsHelp('');
                setSelectedFixedBadges([]);
                setShowCustomBadge(false);
                setCustomBadges([]);
                setCustomBadgeInput('');
                setSelectedFixedPenalties([]);
                setCustomPenalties([]);
                setCustomPenaltyInput('');
                setShowCustomPenalty(false);
                setSelectedSyllabusChapterIds([]);
            }
        }
    }, [isOpen, embedded, isEditMode, sessionToEdit, learner, liveSessionInfo, initialDate]);

    const handleExpectationToggle = (expectation: string) => {
        setMetExpectations(prev => 
            prev.includes(expectation)
                ? prev.filter(e => e !== expectation)
                : [...prev, expectation]
        );
    };

    const handleBadgeToggle = (badgeName: string) => {
        setSelectedFixedBadges(prev => 
            prev.includes(badgeName)
                ? prev.filter(name => name !== badgeName)
                : [...prev, badgeName]
        );
    };

    const handleCustomBadgeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newBadge = customBadgeInput.trim();
            if (newBadge && !customBadges.includes(newBadge)) {
                setCustomBadges([...customBadges, newBadge]);
            }
            setCustomBadgeInput('');
        }
    };

    const handlePenaltyToggle = (penaltyName: string) => {
        setSelectedFixedPenalties(prev =>
            prev.includes(penaltyName)
                ? prev.filter(name => name !== penaltyName)
                : [...prev, penaltyName]
        );
    };

    const handleCustomPenaltyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newPenalty = customPenaltyInput.trim();
            if (newPenalty && !customPenalties.includes(newPenalty)) {
                setCustomPenalties([...customPenalties, newPenalty]);
            }
            setCustomPenaltyInput('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLogging(true);

        const badges: Badge[] = FIXED_BADGES
            .filter(b => selectedFixedBadges.includes(b.name))
            .map(badgeInfo => ({
                id: `b-${Date.now()}-${badgeInfo.name.replace(/\s+/g, '')}`,
                name: badgeInfo.name,
                description: badgeInfo.description,
                icon: badgeInfo.icon,
            }));
        
        customBadges.forEach(name => {
            badges.push({
                id: `b-${Date.now()}-custom-${name.replace(/\s+/g, '')}`,
                name: name,
                description: "Custom award",
                icon: 'fas fa-award',
            });
        });
        
        const penalties: string[] = [
            ...FIXED_PENALTIES.filter(p => selectedFixedPenalties.includes(p.name)).map(p => p.name),
            ...customPenalties
        ];
        
        const basePayload = {
            date,
            attended,
            script: notes, // Pass the notes as the script for analysis
            reflection: '', // Reflection is now combined into notes.
            metExpectations: sessionToEdit?.metExpectations ?? [],
            badges: attended ? badges : [],
            penalties: attended ? penalties : [],
            duration: Number(duration),
            lessonName: attended ? lessonName : 'Absence',
            lessonSummary: attended ? lessonSummary : '',
            spokenTime: attended ? Number(spokenTime) : 0,
            manualAnalysisJson: useManualAI ? manualJsonInput : undefined,
            review: sessionToEdit?.review ?? undefined,
            selectedSyllabusChapterIds,
        };

        try {
            if (isEditMode && sessionToEdit) {
                const newSkills = skillsLearned.split('\n').filter(s => s.trim() !== '');
                const newNeeds = needsHelp.split('\n').filter(n => n.trim() !== '');
                // Merge new items with existing ones, ensuring no duplicates.
                const combinedSkills = [...new Set([...(sessionToEdit.skillsLearned || []), ...newSkills])];
                const combinedNeeds = [...new Set([...(sessionToEdit.needsHelp || []), ...newNeeds])];

                const finalPayload = { 
                    ...sessionToEdit, 
                    ...basePayload,
                    skillsLearned: attended ? combinedSkills : [],
                    needsHelp: attended ? combinedNeeds : [],
                };
                await onSaveSession(finalPayload);
            } else {
                await onSaveSession(basePayload);
            }
            
            setIsLogging(false);
            setJsonError(null);
            onClose();
        } catch (error) {
            setIsLogging(false);
            if (error instanceof Error && error.message.startsWith("INVALID_MANUAL_JSON")) {
                const detailedError = error.message.substring("INVALID_MANUAL_JSON:".length).trim();
                setJsonError(detailedError || "JSON syntax/formatting error.");
            } else if (error instanceof Error) {
                setJsonError(error.message);
            } else {
                setJsonError(String(error));
            }
        }
    };
    
    const buttonText = isLogging 
        ? (isEditMode ? 'Saving...' : 'Logging...')
        : (isEditMode ? 'Save Changes' : 'Log Session');

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="session-date" className="font-bold text-brand-gray-darkest mb-1 block">Session Date</label>
                    <input 
                        type="date"
                        id="session-date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className={inputClass}
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="session-duration" className="font-bold text-brand-gray-darkest mb-1 block">Total Duration (min)</label>
                    <input
                        type="number"
                        id="session-duration"
                        value={duration}
                        onChange={e => setDuration(Number(e.target.value))}
                        className={inputClass}
                        required
                    />
                </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={attended} onChange={(e) => setAttended(e.target.checked)} className="h-6 w-6 rounded text-brand-green focus:ring-brand-green" />
                    <span className="font-bold text-lg">Session Attended</span>
                </label>
                {!attended && <p className="text-sm text-red-600 mt-1 pl-9">This will be logged as a missed session.</p>}
            </div>
            
            <div className={`space-y-4 ${!attended ? 'opacity-50' : ''}`}>
                <fieldset disabled={!attended} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="lesson-name" className="font-bold text-brand-gray-darkest mb-1 block">Session Number</label>
                            <input
                                type="text"
                                id="lesson-name"
                                value={lessonName}
                                onChange={(e) => setLessonName(e.target.value)}
                                className={inputClass}
                                placeholder={`e.g., Session ${((learner as any).sessions || []).length + 1}`}
                            />
                        </div>
                         <div>
                            <label htmlFor="spoken-time" className="font-bold text-brand-gray-darkest mb-1 block">Learner Spoken (min)</label>
                            <input
                                type="number"
                                id="spoken-time"
                                value={spokenTime}
                                onChange={e => setSpokenTime(Number(e.target.value))}
                                className={inputClass}
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="lesson-summary" className="font-bold text-brand-gray-darkest mb-1 block">Lesson Summary (Goal)</label>
                        <textarea
                            id="lesson-summary"
                            value={lessonSummary}
                            onChange={e => setLessonSummary(e.target.value)}
                            placeholder="Summarize the lesson's main goal. The AI will compare this to the learner's transcript."
                            className={`${inputClass} h-24`}
                        />
                    </div>

                    {/* Personal Syllabus Chapters */}
                    {(learner as any).syllabus?.competencies && (learner as any).syllabus.competencies.length > 0 ? (
                        <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-200 mt-2 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-emerald-900 block text-sm flex items-center gap-1.5">
                                    <span>📖 Personal Syllabus Chapters Covered</span>
                                    <span className="text-xs font-normal text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full font-sans">
                                        {selectedSyllabusChapterIds.length} Selected
                                    </span>
                                </label>
                            </div>
                            <p className="text-[11px] text-emerald-800 leading-relaxed">
                                Select one or more chapters studied during this session. The AI will cross-reference and evaluate their speaking transcript specifically against these chapter targets.
                            </p>

                            {/* Real-time Keyword Search Filter */}
                            <div className="relative mb-2">
                                <input
                                    type="text"
                                    placeholder="🔍 Search chapters, grammar, or vocabulary..."
                                    value={syllabusSearchTerm}
                                    onChange={(e) => setSyllabusSearchTerm(e.target.value)}
                                    className="w-full text-xs p-2 pl-8 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green placeholder:text-emerald-600/50 text-emerald-950"
                                />
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-emerald-200">
                                {(learner as any).syllabus.competencies.map((comp: any) => {
                                    const filteredChapters = (comp.chapters || []).filter((chap: any) => {
                                        if (!syllabusSearchTerm.trim()) return true;
                                        const query = syllabusSearchTerm.toLowerCase();
                                        const titleMatch = (chap.title || '').toLowerCase().includes(query);
                                        const grammarMatch = (chap.grammar || '').toLowerCase().includes(query);
                                        const vocabMatch = (chap.vocabulary || []).some((v: string) => v.toLowerCase().includes(query));
                                        const descMatch = (chap.description || '').toLowerCase().includes(query);
                                        return titleMatch || grammarMatch || vocabMatch || descMatch;
                                    });

                                    if (filteredChapters.length === 0) return null;

                                    return (
                                        <div key={comp.competencyId} className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                                                {comp.competencyName}
                                            </span>
                                            <div className="grid grid-cols-1 gap-1.5 pl-1">
                                                {filteredChapters.map((chap: any, idx: number) => {
                                                    const isChecked = selectedSyllabusChapterIds.includes(chap.id);
                                                    return (
                                                        <label key={`${comp.competencyId}-${chap.id}-${idx}`} className="flex items-start gap-2.5 p-1.5 rounded hover:bg-emerald-50/70 cursor-pointer transition-colors text-xs text-brand-gray-darkest">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {
                                                                    setSelectedSyllabusChapterIds(prev =>
                                                                        prev.includes(chap.id)
                                                                            ? prev.filter(id => id !== chap.id)
                                                                            : [...prev, chap.id]
                                                                    );
                                                                }}
                                                                className="h-4 w-4 mt-0.5 rounded text-brand-green focus:ring-brand-green border-brand-gray-medium"
                                                            />
                                                            <div className="leading-tight">
                                                                <span className="font-bold block text-emerald-950">{chap.title}</span>
                                                                <span className="text-[10px] text-brand-gray-medium block">
                                                                    Vocab: {chap.vocabulary?.join(', ')} | Grammar: {chap.grammar}
                                                                </span>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-emerald-50/30 p-4 rounded-lg border border-emerald-100 mt-2 space-y-1 text-center">
                            <span className="font-bold text-emerald-900 block text-sm">📖 Personal Syllabus</span>
                            <p className="text-[11px] text-emerald-700 leading-relaxed">
                                No personal syllabus has been uploaded for this learner yet. You can upload one in the <strong>Chapters / Syllabus</strong> tab.
                            </p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="session-notes" className="font-bold text-brand-gray-darkest mb-1 block">Session Notes (Transcript)</label>
                        <textarea 
                            id="session-notes"
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            placeholder={attended ? "Paste the learner's transcript here. The AI will analyze their performance." : "Add a note about the absence (optional)."} 
                            className={`${inputClass} h-36`} 
                        />
                    </div>
                   
                    {!isEditMode && attended && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4 space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={useManualAI} onChange={(e) => setUseManualAI(e.target.checked)} className="h-5 w-5 rounded text-brand-blue focus:ring-brand-blue" />
                                <span className="font-bold text-blue-900">Use Manual AI Analysis</span>
                            </label>
                            
                            {useManualAI && (
                                <div className="space-y-3">
                                    <p className="text-sm text-blue-800">
                                        Instead of the built-in AI, you can generate the JSON yourself using another AI chatbot (like ChatGPT or Claude) and paste the exact result here.
                                    </p>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const learnerFacts = ('facts' in learner) 
                                                ? (Array.isArray(learner.facts) 
                                                    ? learner.facts.join('; ') 
                                                    : typeof learner.facts === 'string' 
                                                        ? learner.facts 
                                                        : 'None')
                                                : 'None';
                                            const manualPrompt = `You are a world-class DELTA/MA TESOL language assessment expert with 20+ years of experience in forensic linguistic analysis. Your task is to produce a meticulously accurate, evidence-based Comprehensive Session Report from the learner's transcript. You must think step-by-step and be extremely precise.

## LEARNER PROFILE
- **Name:** ${learner.name}
- **Level:** ${('coursePlan' in learner && learner.coursePlan?.level) ? learner.coursePlan.level : 'Unknown'}
- **Interests:** ${('interests' in learner) ? learner.interests : ''}
- **Current Competencies:** ${('competencies' in learner) ? learner.competencies.map(c => c.name + ' (' + c.progress + '%)').join(', ') : 'None'}
- **Known Facts:** ${learnerFacts}
- **Lesson Goal:** ${lessonSummary}

## SESSION TRANSCRIPT
${notes}

## OUTPUT RULES — STRICT FOLLOWING IS MANDATORY

### LANGUAGE & TONE
1. Address the learner directly in **2nd person** ("You did great", "Your grammar"). NEVER use 3rd person ("The learner demonstrated").
2. Use **simple, clear English** appropriate for their level. Be precise and nitpicking about errors but kind in tone.
3. Output ONLY a valid JSON object inside a \`\`\`json code block. NO text outside.

### SESSION REPORT FIELDS
4. **summary** (string): A concise 2-3 sentence overall session assessment.
5. **revisedLessonSummary** (string): A polished, report-card-style summary of what was covered. Never empty.
6. **strengths** (string[], min 3): What the learner did well, with specific transcript evidence.
7. **weaknesses** (string[], min 3): Specific areas needing improvement, transcript-referenced.
8. **keyLearnings** (string[], min 3): The most important takeaways from this session.
9. **reviewQuestions** (array, 3-4 items): Each: { context: "what led to this question", question: "the question" }

### CORRECTIONS — EXTREMELY IMPORTANT
10. **corrections** MUST have **10–25 entries**. Each entry is:
    - **category**: one of → 'grammar', 'vocabulary', 'functional', 'pragmatics', 'appropriacy', 'Say better', 'discourse', 'register', 'cohesion', 'coherence', 'slips', 'mistakes', 'errors'
    - **explanation**: Why it's wrong, in simple words
    - **examples**: array of { incorrect: "what learner said", correct: "correct version" }
    - Use a WIDE variety of categories (at least 6 different ones). Be forensic — catch every single error.

### COMPETENCY & PROGRESS
11. **competencyUpdates**: Array of { competencyName, suggestedProgress (absolute 0–100, max ±15 change from current), justification }
12. **newSkills**: Array of { skillName, linkedNeed (must match an existing need name), justification, suggestedProgress (1-15) }
13. **masteryLevel** (0–100 number): Holistic session quality score.
14. **masteryJustification**: Detailed, rubric-style justification citing specific transcript moments. At least 3 sentences.

### VOCABULARY & FACTS
15. **unlockedVocabulary**: Array of { word, category ("Grammar"|"Vocabulary"|"Expression"), definition }
16. **facts**: Extract ONLY real personal facts about the learner's actual life (pets, family, job, city, hobbies, experiences). NEVER include lesson content, grammar topics, reading materials, or examples. Check against existing facts to avoid duplicates. Existing facts: "${learnerFacts}".

### CHAT & ENGAGEMENT
17. **chatMessages**: Exactly 6 long messages (50+ words each). Flow from greeting → session recap → encouragement → homework nudge → goodbye with follow-up question.
18. **suggestedTodos**: 2–4 actionable homework/practice tasks.
19. **challenges**: 1–3 gamified challenge ideas.
20. **badges**: 1–3 badges with { name, description, emoji }.

### EMOTIONAL FEELING & SENTIMENT ANALYSIS — CRITICAL
21. **emotionalFeeling**: This object is EXTREMELY important. Be super accurate:
    - **sentimentScore** (0–100): Overall emotional tone of the session
    - **dominantEmotion** (string): Single word like "Confident", "Anxious", "Curious", "Frustrated", "Eager", "Hesitant", "Engaged", "Discouraged", "Neutral", "Enthusiastic"
    - **analysis** (string): Detailed empathetic analysis of the learner's emotional state throughout the session
    - **confidenceScore** (0–100): How self-assured the learner sounded
    - **confidenceAnalysis** (string): Evidence-based justification
    - **anxietyScore** (0–100): Level of nervousness or hesitation detected
    - **anxietyAnalysis** (string): Evidence-based justification
    - **riskTakingScore** (0–100): Willingness to try complex/unfamiliar language
    - **riskTakingAnalysis** (string): Evidence-based justification
    - **fearOfMistakesScore** (0–100): How much the learner avoided errors vs. experimenting
    - **fearOfMistakesAnalysis** (string): Evidence-based justification
    - **motivationScore** (0–100): Drive and engagement level
    - **motivationAnalysis** (string): Evidence-based justification
    - **transferableSkills**: Array of { skill: string, score: 0-100, evidence: "direct learner quote from transcript" } — identify real-world skills (Creativity, Problem Solving, Empathy, Adaptability, Leadership, Critical Thinking, Perseverance, etc.)
    - **timeline**: Array of { phase: "Lesson Phase Name" (e.g., "Warm-up", "Main Practice", "Roleplay", "Correction Session", "Wrap-up"), mood: "word description", emoji: "appropriate emoji", description: "what happened and how they felt" } — 3-5 phases
    - **sentences**: Array of { original: "learner's exact emotionally-charged phrase", corrected: "upgraded native version", emotion: "the emotion conveyed", emoji: "matching emoji", tutorTip: "specific coaching tip" } — find 3-6 key sentences
    - **drivenWords**: Array of { word: "key word", type: "positive"|"negative"|"neutral", count: number of uses, intensity: "High"|"Medium"|"Low" } — extract 5-15 key emotional/lexical words

### SPEAKING SCORES — PRECISE ESTIMATION
22. **speakingScores**: 
    - **cefr** (string): Accurate CEFR level (A1-C2)
    - **ielts** (0.5–9.0): Overall IELTS band estimate
    - **toefl** (0–120): TOEFL iBT score estimate
    - **fluencyCoherence** (1.0–9.0): IELTS sub-score for fluency
    - **lexicalResource** (1.0–9.0): IELTS sub-score for vocabulary
    - **grammarAccuracy** (1.0–9.0): IELTS sub-score for grammar
    - **pronunciation** (1.0–9.0): IELTS sub-score for pronunciation
    - **rubricJustification** (string): Detailed justification referencing specific transcript evidence for each sub-score

### ADVANCED FEEDBACK — MULTIDIMENSIONAL DIAGNOSTIC
23. **advancedFeedback**: Complete ALL fields with detailed analysis:
    - **fluency**: Pacing, pausing, hesitation patterns
    - **accuracy**: Error frequency and type distribution
    - **clarity**: Message conveyance effectiveness
    - **confidence**: Self-assurance markers
    - **pragmaticAppropriateness**: Context-appropriate language use
    - **lexicalSophistication**: Vocabulary range and precision
    - **syntacticComplexity**: Sentence structure variety
    - **repairStrategyTypology**: Self-correction and repair strategies
    - **registerConsistency**: Formal/informal consistency
    - **ideaDensity**: Content richness per utterance
    - **metaDiscourse**: Signposting and organizational language
    - **stanceMarkers**: Opinion and attitude expression
    - **syllabusFeedback** (if applicable): How the session aligned with selected syllabus chapters

## JSON INTERFACE
\`\`\`json
{
  "summary": "string",
  "revisedLessonSummary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "keyLearnings": ["string"],
  "unlockedVocabulary": [{ "word": "string", "category": "Grammar|Vocabulary|Expression", "definition": "string" }],
  "reviewQuestions": [{ "context": "string", "question": "string" }],
  "recommendations": ["string"],
  "corrections": [{ "category": "string", "explanation": "string", "examples": [{ "incorrect": "string", "correct": "string" }] }],
  "competencyUpdates": [{ "competencyName": "string", "suggestedProgress": 0, "justification": "string" }],
  "newSkills": [{ "skillName": "string", "linkedNeed": "string", "justification": "string", "suggestedProgress": 0 }],
  "masteryLevel": 0,
  "masteryJustification": "string",
  "challenges": ["string"],
  "chatMessages": ["string"],
  "suggestedTodos": ["string"],
  "facts": ["string"],
  "badges": [{ "name": "string", "description": "string", "emoji": "string" }],
  "advancedFeedback": {
    "fluency": "string", "accuracy": "string", "clarity": "string", "confidence": "string",
    "pragmaticAppropriateness": "string", "lexicalSophistication": "string", "syntacticComplexity": "string",
    "repairStrategyTypology": "string", "registerConsistency": "string", "ideaDensity": "string",
    "metaDiscourse": "string", "stanceMarkers": "string", "syllabusFeedback": "string"
  },
  "emotionalFeeling": {
    "sentimentScore": 0,
    "dominantEmotion": "string",
    "analysis": "string",
    "confidenceScore": 0, "confidenceAnalysis": "string",
    "anxietyScore": 0, "anxietyAnalysis": "string",
    "riskTakingScore": 0, "riskTakingAnalysis": "string",
    "fearOfMistakesScore": 0, "fearOfMistakesAnalysis": "string",
    "motivationScore": 0, "motivationAnalysis": "string",
    "transferableSkills": [{ "skill": "string", "score": 0, "evidence": "string" }],
    "timeline": [{ "phase": "string", "mood": "string", "emoji": "string", "description": "string" }],
    "sentences": [{ "original": "string", "corrected": "string", "emotion": "string", "emoji": "string", "tutorTip": "string" }],
    "drivenWords": [{ "word": "string", "type": "positive|negative|neutral", "count": 0, "intensity": "High|Medium|Low" }]
  },
  "speakingScores": {
    "cefr": "string", "ielts": 0, "toefl": 0,
    "fluencyCoherence": 0, "lexicalResource": 0, "grammarAccuracy": 0, "pronunciation": 0,
    "rubricJustification": "string"
  }
}
\`\`\``;
                                            navigator.clipboard.writeText(manualPrompt);
                                            alert("Prompt copied! Paste it into your AI of choice, then paste the resulting JSON below.");
                                        }}
                                        className="bg-white border border-blue-300 text-brand-blue px-3 py-1.5 rounded text-sm font-semibold hover:bg-blue-100"
                                    >
                                        Copy AI Prompt
                                    </button>
                                    <div>
                                        <textarea 
                                            value={manualJsonInput}
                                            onChange={e => {
                                                setManualJsonInput(e.target.value);
                                                if (jsonError) setJsonError(null);
                                            }}
                                            placeholder={`Paste ONLY the raw JSON output here... e.g.\n{\n  "summary": "...",\n  "strengths": [],\n  "weaknesses": []\n}`}
                                            className={`${inputClass} h-48 font-mono text-xs ${jsonError ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                                        />
                                        {jsonError && (
                                            <div className="mt-2 p-3 bg-red-50 border border-red-300 rounded-lg text-xs font-semibold text-red-700 font-mono whitespace-pre-wrap flex flex-col gap-2">
                                                <div>
                                                    <strong className="block text-[10px] text-red-800 uppercase tracking-wider mb-1">⚠️ JSON Parsing Error:</strong>
                                                    {jsonError}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const fixPrompt = `I have a JSON parsing error in my session report:
Error: ${jsonError}

Please fix this JSON object, ensure all syntax (quotes, trailing commas, braces) is 100% correct, and output ONLY the fixed, valid JSON block.

Here is the malformed JSON:
${manualJsonInput}`;
                                                        navigator.clipboard.writeText(fixPrompt);
                                                        alert("Fix prompt copied to clipboard! Paste it into your AI of choice to fix the JSON.");
                                                    }}
                                                    className="self-start mt-1 bg-red-100 hover:bg-red-200 text-red-800 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                                                >
                                                    Copy Fix Prompt for External AI
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isEditMode && (
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-3 bg-green-50 rounded-lg">
                                <label className="font-bold text-green-800">✅ Strengths (one per line)</label>
                                <textarea value={skillsLearned} onChange={e => setSkillsLearned(e.target.value)} className={`${inputClass} h-20 mt-1 bg-white`} />
                            </div>
                            <div className="p-3 bg-red-50 rounded-lg">
                                <label className="font-bold text-red-800">💡 Weaknesses (one per line)</label>
                                <textarea value={needsHelp} onChange={e => setNeedsHelp(e.target.value)} className={`${inputClass} h-20 mt-1 bg-white`} />
                            </div>
                        </div>
                    )}

                    {/* Expectations checking and reviews were removed from here and moved standalone to Reviews tab */}
                
                    <div>
                        <h5 className="font-bold mb-2">🏅 Award Badges:</h5>
                        <div className="flex flex-wrap gap-2">
                            {FIXED_BADGES.map((badge, i) => (
                                <label key={i} className={`flex items-center gap-2 font-medium cursor-pointer p-2 rounded-lg border-2 ${selectedFixedBadges.includes(badge.name) ? 'bg-yellow-100 border-brand-yellow' : 'bg-white'}`}>
                                    <input type="checkbox" checked={selectedFixedBadges.includes(badge.name)} onChange={() => handleBadgeToggle(badge.name)} className="h-5 w-5 rounded text-brand-yellow focus:ring-brand-yellow" />
                                    <i className={`${badge.icon} mr-1`}></i>
                                    {badge.name}
                                </label>
                            ))}
                            <button type="button" onClick={() => setShowCustomBadge(!showCustomBadge)} className="font-bold text-brand-blue p-2 rounded-lg border-2 border-dashed border-brand-blue bg-white hover:bg-blue-100">{showCustomBadge ? 'Hide Custom' : '+ Custom Badge'}</button>
                        </div>
                        {showCustomBadge && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <input 
                                    type="text" 
                                    value={customBadgeInput} 
                                    onChange={e => setCustomBadgeInput(e.target.value)} 
                                    onKeyDown={handleCustomBadgeKeyDown}
                                    placeholder="Type badge name and press Enter..." 
                                    className={inputClass} 
                                />
                                 <div className="flex flex-wrap gap-2 mt-2">
                                    {customBadges.map((badge, index) => (
                                        <div key={index} className="flex items-center gap-1 bg-blue-200 text-blue-800 text-sm font-semibold px-2 py-1 rounded-full">
                                            <span>{badge}</span>
                                            <button type="button" onClick={() => setCustomBadges(prev => prev.filter(b => b !== badge))} className="font-bold text-blue-600 hover:text-blue-900">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h5 className="font-bold mb-2 text-red-700"> Penalties:</h5>
                        <div className="flex flex-wrap gap-2">
                            {FIXED_PENALTIES.map((penalty, i) => (
                                <label key={i} className={`flex items-center gap-2 font-medium cursor-pointer p-2 rounded-lg border-2 ${selectedFixedPenalties.includes(penalty.name) ? 'bg-red-100 border-brand-red' : 'bg-white'}`}>
                                    <input type="checkbox" checked={selectedFixedPenalties.includes(penalty.name)} onChange={() => handlePenaltyToggle(penalty.name)} className="h-5 w-5 rounded text-brand-red focus:ring-brand-red" />
                                    <i className={`${penalty.icon} mr-1`}></i>
                                    {penalty.name}
                                </label>
                            ))}
                            <button type="button" onClick={() => setShowCustomPenalty(!showCustomPenalty)} className="font-bold text-brand-red p-2 rounded-lg border-2 border-dashed border-brand-red bg-white hover:bg-red-100">{showCustomPenalty ? 'Hide Custom' : '+ Custom Penalty'}</button>
                        </div>
                        {showCustomPenalty && (
                            <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                <input
                                    type="text"
                                    value={customPenaltyInput}
                                    onChange={e => setCustomPenaltyInput(e.target.value)}
                                    onKeyDown={handleCustomPenaltyKeyDown}
                                    placeholder="Type penalty and press Enter..."
                                    className={inputClass}
                                />
                                 <div className="flex flex-wrap gap-2 mt-2">
                                    {customPenalties.map((penalty, index) => (
                                        <div key={index} className="flex items-center gap-1 bg-red-200 text-red-800 text-sm font-semibold px-2 py-1 rounded-full">
                                            <span>{penalty}</span>
                                            <button type="button" onClick={() => setCustomPenalties(prev => prev.filter(p => p !== penalty))} className="font-bold text-red-600 hover:text-red-900">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </fieldset>
            </div>

            <div className="flex justify-end items-center pt-4 border-t mt-4">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onClose} className="bg-brand-gray-medium text-white font-bold py-2 px-5 rounded-lg hover:bg-brand-gray-dark">Cancel</button>
                    {!isEditMode && attended && useManualAI && (
                        <button type="submit" disabled={isLogging} className="bg-brand-purple text-white font-bold py-2 px-5 rounded-lg hover:bg-purple-600 disabled:bg-gray-400">
                            {isLogging ? 'Logging...' : 'Manual Log Session'}
                        </button>
                    )}
                    {(!useManualAI || !attended || isEditMode) && (
                        <button type="submit" disabled={isLogging} className="bg-brand-blue text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-600 disabled:bg-gray-400">
                            {buttonText}
                        </button>
                    )}
                </div>
            </div>
        </form>
    );

    const modals = null;

    if (embedded) {
        return (
            <>
                {formContent}
                {modals}
            </>
        );
    }

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? `Edit Session for ${learner.name}` : `Log New Session for ${learner.name}`} closeOnOutsideClick={false}>
                {formContent}
            </Modal>
            {modals}
        </>
    );
};

export default AddSessionForm;
