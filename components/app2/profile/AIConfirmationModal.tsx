import React, { useState, useEffect, useMemo } from 'react';
import { AIComprehensiveAnalysis, PendingAIConfirmation, CompetencyUpdateSuggestion, NewSkillSuggestion, Learner } from '../../../types2';
import { useLearnerStore } from '../../../store/useLearnerStore';

interface AIConfirmationModalProps {
    data: PendingAIConfirmation;
    onConfirm: (learnerId: string, sessionData: any, confirmedData: PendingAIConfirmation['analysis']) => void;
    onCancel: () => void;
}

const inputClass = "w-full text-sm p-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue";
const justificationInputClass = "w-full text-xs p-1 mt-1 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue";

const SuggestionItem: React.FC<{ children: React.ReactNode; onRemove: () => void; }> = ({ children, onRemove }) => (
    <div className="flex items-start justify-between p-3 bg-white border rounded-lg gap-2 shadow-sm">
        <div className="text-sm flex-1">{children}</div>
        <button onClick={onRemove} className="text-red-400 hover:text-red-700 font-bold text-xl px-2 flex-shrink-0 -mt-1">&times;</button>
    </div>
);

const Section: React.FC<{ title: string; emoji: string; children: React.ReactNode; colorClass: string }> = ({ title, emoji, children, colorClass }) => (
    <div className={`p-5 rounded-xl border-l-4 ${colorClass}`}>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span>{emoji}</span> {title}
        </h3>
        <div className="space-y-3">{children}</div>
    </div>
);

const AIConfirmationModal: React.FC<AIConfirmationModalProps> = ({ data, onConfirm, onCancel }) => {
    const { analysis, learnerId, sessionData } = data;
    const [isSaving, setIsSaving] = useState(false);
    
    const learner = useLearnerStore(state => state.getLearnerById(learnerId));

    const [summary, setSummary] = useState<string>('');
    const [revisedLessonSummary, setRevisedLessonSummary] = useState<string>('');
    const [masteryLevel, setMasteryLevel] = useState<number>(0);
    const [masteryJustification, setMasteryJustification] = useState<string>('');
    const [strengths, setStrengths] = useState<string[]>([]);
    const [weaknesses, setWeaknesses] = useState<string[]>([]);
    const [keyLearnings, setKeyLearnings] = useState<string[]>([]);
    const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);
    
    const [corrections, setCorrections] = useState<any[]>([]);
    const [facts, setFacts] = useState<string[]>([]);
    const [chatMessages, setChatMessages] = useState<string[]>([]);
    const [personalizedGreetings, setPersonalizedGreetings] = useState<string[]>([]);
    const [personalizedGoodbyes, setPersonalizedGoodbyes] = useState<string[]>([]);
    const [challenges, setChallenges] = useState<string[]>([]);
    const [todos, setTodos] = useState<string[]>([]);
    
    const [competencyUpdates, setCompetencyUpdates] = useState<CompetencyUpdateSuggestion[]>([]);
    const [newSkills, setNewSkills] = useState<NewSkillSuggestion[]>([]);
    const [badges, setBadges] = useState<any[]>([]);
    const [totalXP, setTotalXP] = useState<number>(0);
    
    // Emotional Feeling / Sentiment
    const [sentimentScore, setSentimentScore] = useState<number>(50);
    const [dominantEmotion, setDominantEmotion] = useState<string>('');
    const [emotionAnalysis, setEmotionAnalysis] = useState<string>('');
    const [confidenceScore, setConfidenceScore] = useState<number>(50);
    const [confidenceAnalysis, setConfidenceAnalysis] = useState<string>('');
    const [anxietyScore, setAnxietyScore] = useState<number>(50);
    const [anxietyAnalysis, setAnxietyAnalysis] = useState<string>('');
    const [riskTakingScore, setRiskTakingScore] = useState<number>(50);
    const [riskTakingAnalysis, setRiskTakingAnalysis] = useState<string>('');
    const [fearOfMistakesScore, setFearOfMistakesScore] = useState<number>(50);
    const [fearOfMistakesAnalysis, setFearOfMistakesAnalysis] = useState<string>('');
    const [motivationScore, setMotivationScore] = useState<number>(50);
    const [motivationAnalysis, setMotivationAnalysis] = useState<string>('');
    const [transferableSkills, setTransferableSkills] = useState<any[]>([]);
    const [emotionTimeline, setEmotionTimeline] = useState<any[]>([]);
    const [emotionSentences, setEmotionSentences] = useState<any[]>([]);
    const [drivenWords, setDrivenWords] = useState<any[]>([]);
    
    // Speaking Scores
    const [speakingCefr, setSpeakingCefr] = useState<string>('');
    const [speakingIelts, setSpeakingIelts] = useState<number>(0);
    const [speakingToefl, setSpeakingToefl] = useState<number>(0);
    const [fluencyCoherence, setFluencyCoherence] = useState<number>(0);
    const [lexicalResource, setLexicalResource] = useState<number>(0);
    const [grammarAccuracy, setGrammarAccuracy] = useState<number>(0);
    const [pronunciation, setPronunciation] = useState<number>(0);
    const [rubricJustification, setRubricJustification] = useState<string>('');
    
    // Advanced Feedback
    const [advFluency, setAdvFluency] = useState<string>('');
    const [advAccuracy, setAdvAccuracy] = useState<string>('');
    const [advClarity, setAdvClarity] = useState<string>('');
    const [advConfidence, setAdvConfidence] = useState<string>('');
    const [advPragmatic, setAdvPragmatic] = useState<string>('');
    const [advLexical, setAdvLexical] = useState<string>('');
    const [advSyntactic, setAdvSyntactic] = useState<string>('');
    const [advRepair, setAdvRepair] = useState<string>('');
    const [advRegister, setAdvRegister] = useState<string>('');
    const [advIdeaDensity, setAdvIdeaDensity] = useState<string>('');
    const [advMetaDiscourse, setAdvMetaDiscourse] = useState<string>('');
    const [advStance, setAdvStance] = useState<string>('');
    const [advSyllabus, setAdvSyllabus] = useState<string>('');
    
    // Calculate initial XP once
    useEffect(() => {
        if (analysis) {
            const baseXP = 50;
            const dynamicXP = (analysis.competencyUpdates || []).reduce((acc: number, current: any) => {
                const comp = learner?.competencies?.find(c => c.name?.toLowerCase() === current.competencyName?.toLowerCase());
                const delta = current.suggestedProgress - (comp?.progress || 0);
                return acc + Math.max(0, delta) * 2;
            }, 0);
            setTotalXP(baseXP + dynamicXP);
        }
    }, [analysis, learner]);

    useEffect(() => {
        if (analysis) {
            setSummary(analysis.summary || '');
            setRevisedLessonSummary(analysis.revisedLessonSummary || analysis.summary || '');
            setMasteryLevel(typeof analysis.masteryLevel === 'number' ? analysis.masteryLevel : parseInt(String(analysis.masteryLevel)) || 0);
            setMasteryJustification(analysis.masteryJustification || '');
            setStrengths(analysis.strengths || []);
            setWeaknesses(analysis.weaknesses || []);
            setKeyLearnings(analysis.keyLearnings || []);
            setReviewQuestions(analysis.reviewQuestions || []);
            
            setCorrections(analysis.corrections || []);
            setFacts(analysis.facts || []);
            setChatMessages(analysis.chatMessages || []);
            setPersonalizedGreetings(analysis.personalizedGreetings || []);
            setPersonalizedGoodbyes(analysis.personalizedGoodbyes || []);
            setChallenges(analysis.challenges || []);
            setTodos(analysis.suggestedTodos || []);
            setBadges(analysis.badges || []);
            
            setNewSkills(analysis.newSkills || []);
            
            // Emotional Feeling / Sentiment
            const emo = analysis.emotionalFeeling || (analysis as any).emotionAnalysis || (analysis as any).sentimentAnalysis || {};
            setSentimentScore(emo.sentimentScore ?? 50);
            setDominantEmotion(emo.dominantEmotion || '');
            setEmotionAnalysis(emo.analysis || '');
            setConfidenceScore(emo.confidenceScore ?? 50);
            setConfidenceAnalysis(emo.confidenceAnalysis || '');
            setAnxietyScore(emo.anxietyScore ?? 50);
            setAnxietyAnalysis(emo.anxietyAnalysis || '');
            setRiskTakingScore(emo.riskTakingScore ?? 50);
            setRiskTakingAnalysis(emo.riskTakingAnalysis || '');
            setFearOfMistakesScore(emo.fearOfMistakesScore ?? 50);
            setFearOfMistakesAnalysis(emo.fearOfMistakesAnalysis || '');
            setMotivationScore(emo.motivationScore ?? 50);
            setMotivationAnalysis(emo.motivationAnalysis || '');
            setTransferableSkills(emo.transferableSkills || []);
            setEmotionTimeline(emo.timeline || []);
            setEmotionSentences(emo.sentences || []);
            setDrivenWords(emo.drivenWords || []);
            
            // Speaking Scores
            const ss = analysis.speakingScores || {};
            setSpeakingCefr(ss.cefr || '');
            setSpeakingIelts(ss.ielts ?? 0);
            setSpeakingToefl(ss.toefl ?? 0);
            setFluencyCoherence(ss.fluencyCoherence ?? 0);
            setLexicalResource(ss.lexicalResource ?? 0);
            setGrammarAccuracy(ss.grammarAccuracy ?? 0);
            setPronunciation(ss.pronunciation ?? 0);
            setRubricJustification(ss.rubricJustification || '');
            
            // Advanced Feedback
            const af = analysis.advancedFeedback || {};
            setAdvFluency(af.fluency || '');
            setAdvAccuracy(af.accuracy || '');
            setAdvClarity(af.clarity || '');
            setAdvConfidence(af.confidence || '');
            setAdvPragmatic(af.pragmaticAppropriateness || '');
            setAdvLexical(af.lexicalSophistication || '');
            setAdvSyntactic(af.syntacticComplexity || '');
            setAdvRepair(af.repairStrategyTypology || '');
            setAdvRegister(af.registerConsistency || '');
            setAdvIdeaDensity(af.ideaDensity || '');
            setAdvMetaDiscourse(af.metaDiscourse || '');
            setAdvStance(af.stanceMarkers || '');
            setAdvSyllabus(af.syllabusFeedback || '');

            // Process competency updates with robust name matching and clamping between -15 and +15
            const processedUpdates = (analysis.competencyUpdates || []).map(update => {
                const currentComp = learner?.competencies?.find(c => {
                    const cName = c.name?.trim().toLowerCase() || '';
                    const uName = update.competencyName?.trim().toLowerCase() || '';
                    return cName === uName || cName.includes(uName) || uName.includes(cName);
                });
                if (!currentComp) return update;

                const currentProgress = currentComp.progress;
                let absoluteProgress = update.suggestedProgress;
                
                // If the AI returned a small number (between -15 and +15) and currentProgress is much larger, it's highly likely a delta.
                if (Math.abs(update.suggestedProgress) <= 15 && currentProgress > 20) {
                    absoluteProgress = currentProgress + update.suggestedProgress;
                }

                const delta = absoluteProgress - currentProgress;

                if (delta > 0) {
                    const clampedDelta = Math.max(1, Math.min(15, delta));
                    return { ...update, suggestedProgress: currentProgress + clampedDelta };
                } else if (delta < 0) {
                    const clampedDelta = Math.max(-15, Math.min(-1, delta));
                    return { ...update, suggestedProgress: currentProgress + clampedDelta };
                }
                return { ...update, suggestedProgress: currentProgress };
            });
            setCompetencyUpdates(processedUpdates);
        }
    }, [analysis, learner]);

    const handleConfirm = async () => {
        setIsSaving(true);
        const confirmedData = {
            ...analysis,
            summary,
            revisedLessonSummary,
            masteryLevel,
            masteryJustification,
            strengths,
            weaknesses,
            keyLearnings,
            reviewQuestions,
            corrections,
            facts,
            chatMessages,
            personalizedGreetings,
            personalizedGoodbyes,
            challenges,
            badges,
            suggestedTodos: todos,
            competencyUpdates,
            newSkills,
            adjustedSessionXP: totalXP,
            emotionalFeeling: {
                sentimentScore,
                dominantEmotion,
                analysis: emotionAnalysis,
                confidenceScore,
                confidenceAnalysis,
                anxietyScore,
                anxietyAnalysis,
                riskTakingScore,
                riskTakingAnalysis,
                fearOfMistakesScore,
                fearOfMistakesAnalysis,
                motivationScore,
                motivationAnalysis,
                transferableSkills,
                timeline: emotionTimeline,
                sentences: emotionSentences,
                drivenWords,
            },
            speakingScores: {
                cefr: speakingCefr,
                ielts: speakingIelts,
                toefl: speakingToefl,
                fluencyCoherence,
                lexicalResource,
                grammarAccuracy,
                pronunciation,
                rubricJustification,
            },
            advancedFeedback: {
                fluency: advFluency,
                accuracy: advAccuracy,
                clarity: advClarity,
                confidence: advConfidence,
                pragmaticAppropriateness: advPragmatic,
                lexicalSophistication: advLexical,
                syntacticComplexity: advSyntactic,
                repairStrategyTypology: advRepair,
                registerConsistency: advRegister,
                ideaDensity: advIdeaDensity,
                metaDiscourse: advMetaDiscourse,
                stanceMarkers: advStance,
                syllabusFeedback: advSyllabus,
            },
        };
        await onConfirm(learnerId, sessionData, confirmedData);
        setIsSaving(false);
    };

    const handleArrayChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
        setter(prev => prev.map((item, i) => i === index ? value : item));
    };
    
    const handleArrayRemove = (setter: React.Dispatch<React.SetStateAction<any[]>>, index: number) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdate = (competencyName: string, newProgress: number, justification?: string) => {
        const parsedProgress = isNaN(newProgress) ? 0 : newProgress;
        const clampedProgress = Math.max(0, Math.min(100, parsedProgress));

        setCompetencyUpdates(prev => {
            const existingIndex = prev.findIndex(u => u.competencyName?.toLowerCase() === competencyName?.toLowerCase());
            if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex].suggestedProgress = clampedProgress;
                if (justification !== undefined) {
                    updated[existingIndex].justification = justification;
                }
                return updated;
            } else {
                return [...prev, {
                    competencyName,
                    suggestedProgress: clampedProgress,
                    justification: justification || "",
                }];
            }
        });
    };
    
    const originallyProposedCompetencyNames = useMemo(() => 
        new Set((analysis?.competencyUpdates || []).map((u: any) => u.competencyName?.toLowerCase() || '')),
    [analysis]);

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm z-[100] flex justify-center items-start p-4 md:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col animate-fade-in my-auto">
                <header className="flex justify-between items-center px-6 py-5 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900">Comprehensive Session Review</h2>
                        <p className="text-sm text-gray-500 mt-1">Review, edit, or reject the AI's suggestions before confirming.</p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </header>

                <main className="p-6 overflow-y-visible space-y-8">
                    
                    {/* Class Report / Summary */}
                    <Section title="Class Report" emoji="📝" colorClass="bg-blue-50 border-blue-500 text-blue-900">
                        <div className="space-y-4 bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                            <div>
                                <label className="font-bold text-sm text-gray-700 block mb-1">Revised Lesson Summary</label>
                                <textarea value={revisedLessonSummary} onChange={e => setRevisedLessonSummary(e.target.value)} className={inputClass} rows={2} />
                            </div>
                            <div>
                                <label className="font-bold text-sm text-gray-700 block mb-1">Short Feedback</label>
                                <textarea value={summary} onChange={e => setSummary(e.target.value)} className={inputClass} rows={2} />
                            </div>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className="font-bold text-sm text-gray-700">Strengths ({strengths.length})</label>
                                    {strengths.map((str, i) => (
                                        <SuggestionItem key={i} onRemove={() => handleArrayRemove(setStrengths, i)}>
                                            <input value={str} onChange={e => handleArrayChange(setStrengths, i, e.target.value)} className={inputClass} />
                                        </SuggestionItem>
                                    ))}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="font-bold text-sm text-gray-700">Weaknesses ({weaknesses.length})</label>
                                    {weaknesses.map((wk, i) => (
                                        <SuggestionItem key={i} onRemove={() => handleArrayRemove(setWeaknesses, i)}>
                                            <input value={wk} onChange={e => handleArrayChange(setWeaknesses, i, e.target.value)} className={inputClass} />
                                        </SuggestionItem>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="font-bold text-sm text-gray-700">Key Learnings ({keyLearnings.length})</label>
                                {keyLearnings.map((kl, i) => (
                                    <SuggestionItem key={i} onRemove={() => handleArrayRemove(setKeyLearnings, i)}>
                                        <input value={kl} onChange={e => handleArrayChange(setKeyLearnings, i, e.target.value)} className={inputClass} />
                                    </SuggestionItem>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <label className="font-bold text-sm text-gray-700">Review Questions ({reviewQuestions.length})</label>
                                {reviewQuestions.map((rq, i) => (
                                    <SuggestionItem key={i} onRemove={() => handleArrayRemove(setReviewQuestions, i)}>
                                        <div className="space-y-1">
                                            <input value={rq.context} onChange={e => { const rqs = [...reviewQuestions]; rqs[i].context = e.target.value; setReviewQuestions(rqs); }} className={inputClass} placeholder="Context" />
                                            <input value={rq.question} onChange={e => { const rqs = [...reviewQuestions]; rqs[i].question = e.target.value; setReviewQuestions(rqs); }} className={inputClass} placeholder="Question" />
                                        </div>
                                    </SuggestionItem>
                                ))}
                            </div>
                        </div>
                    </Section>

                    {/* Core Competencies & Skills */}
                    <Section title="Progression & Mastery" emoji="🚀" colorClass="bg-purple-50 border-purple-500 text-purple-900">
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex items-start gap-4">
                                <div className="flex-1">
                                    <label className="font-bold text-sm text-gray-700 block mb-1">Success Rate (0-100%)</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={masteryLevel} onChange={e => setMasteryLevel(parseInt(e.target.value))} className={`${inputClass} w-24 font-bold text-lg`} />
                                        <span className="font-bold text-xl">%</span>
                                    </div>
                                    <input value={masteryJustification} onChange={e => setMasteryJustification(e.target.value)} className={`${inputClass} mt-2`} placeholder="Mastery justification..." />
                                </div>
                            </div>
                            
                            {competencyUpdates.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-bold text-sm text-gray-700">Proposed Competency Updates</h4>
                                    {competencyUpdates.map((update, idx) => {
                                        const currentComp = learner?.competencies?.find(c => {
                                            const cName = c.name?.trim().toLowerCase() || '';
                                            const uName = update.competencyName?.trim().toLowerCase() || '';
                                            return cName === uName || cName.includes(uName) || uName.includes(cName);
                                        });
                                        const delta = update.suggestedProgress - (currentComp?.progress || 0);
                                        return (
                                            <SuggestionItem key={idx} onRemove={() => handleArrayRemove(setCompetencyUpdates as any, competencyUpdates.indexOf(update))}>
                                                <p className="font-bold">{update.competencyName} {!currentComp && <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded ml-2">New</span>}</p>
                                                <div className="flex items-center gap-2 my-1">
                                                    <span>Current: {currentComp ? currentComp.progress : 0}% &rarr;</span>
                                                    <input type="number" value={update.suggestedProgress} onChange={(e) => handleUpdate(update.competencyName, parseInt(e.target.value))} className={`${inputClass} w-20 text-center font-bold`} />
                                                    <span className={`font-bold ml-1 ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>({delta >= 0 ? `+${delta}` : delta} pts)</span>
                                                </div>
                                                <input value={update.justification || ''} onChange={e => handleUpdate(update.competencyName, update.suggestedProgress, e.target.value)} className={justificationInputClass} />
                                            </SuggestionItem>
                                        );
                                    })}
                                </div>
                            )}

                            {newSkills.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-bold text-sm text-gray-700">Discovered New Skills</h4>
                                    {newSkills.map((skill, index) => (
                                        <SuggestionItem key={index} onRemove={() => handleArrayRemove(setNewSkills as any, index)}>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-xs text-gray-500 w-24">Skill Name:</span>
                                                    <input value={skill.skillName} onChange={e => { const s = [...newSkills]; s[index].skillName = e.target.value; setNewSkills(s); }} className={inputClass} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-xs text-gray-500 w-24">Link to Need:</span>
                                                    <select value={skill.linkedNeed} onChange={e => { const s = [...newSkills]; s[index].linkedNeed = e.target.value; setNewSkills(s); }} className={inputClass}>
                                                        {learner?.needs?.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-xs text-gray-500 w-24">Progress:</span>
                                                    <input type="number" value={skill.suggestedProgress ?? 5} onChange={e => { const s = [...newSkills]; s[index].suggestedProgress = parseInt(e.target.value) || 0; setNewSkills(s); }} className={`${inputClass} w-20 text-center`} /> %
                                                </div>
                                            </div>
                                        </SuggestionItem>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* Feedback & Grammar */}
                    {corrections.length > 0 && (
                        <Section title={`Corrections (${corrections.length})`} emoji="✍️" colorClass="bg-rose-50 border-rose-400 text-rose-900">
                            {corrections.map((corr, i) => (
                                <SuggestionItem key={i} onRemove={() => handleArrayRemove(setCorrections, i)}>
                                    <div className="mb-1"><span className="font-bold text-rose-800">{corr.category}</span> - <input value={corr.explanation} onChange={e => { const c = [...corrections]; c[i].explanation = e.target.value; setCorrections(c); }} className="w-full text-xs p-1 border rounded" /></div>
                                    <div className="space-y-1">
                                        {corr.examples?.map((ex: any, ei: number) => (
                                            <div key={ei} className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="bg-white p-1 border border-red-200 rounded text-red-700">❌ {ex.incorrect}</div>
                                                <div className="bg-white p-1 border border-green-200 rounded text-green-700">✅ {ex.correct}</div>
                                            </div>
                                        ))}
                                    </div>
                                </SuggestionItem>
                            ))}
                        </Section>
                    )}

                    {/* Personalization & Engagement */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Section title="Extracted Facts" emoji="🧠" colorClass="bg-emerald-50 border-emerald-500 text-emerald-900 h-full">
                            {facts.length === 0 ? <p className="text-sm opacity-60">No new facts extracted.</p> : facts.map((fact, i) => (
                                <SuggestionItem key={i} onRemove={() => handleArrayRemove(setFacts, i)}>
                                    <input value={fact} onChange={e => handleArrayChange(setFacts, i, e.target.value)} className={inputClass} />
                                </SuggestionItem>
                            ))}
                        </Section>
                        
                        <Section title="Actionable To-Dos" emoji="✅" colorClass="bg-yellow-50 border-yellow-500 text-yellow-900 h-full">
                            {todos.length === 0 ? <p className="text-sm opacity-60">No suggested to-dos.</p> : todos.map((todo, i) => (
                                <SuggestionItem key={i} onRemove={() => handleArrayRemove(setTodos, i)}>
                                    <input value={todo} onChange={e => handleArrayChange(setTodos, i, e.target.value)} className={inputClass} />
                                </SuggestionItem>
                            ))}
                        </Section>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Section title="Follow-up Chat Messages" emoji="💬" colorClass="bg-indigo-50 border-indigo-400 text-indigo-900 h-full">
                            {chatMessages.length === 0 ? <p className="text-sm opacity-60">No messages suggested.</p> : chatMessages.map((msg, i) => (
                                <SuggestionItem key={i} onRemove={() => handleArrayRemove(setChatMessages, i)}>
                                    <textarea value={msg} onChange={e => handleArrayChange(setChatMessages, i, e.target.value)} className={inputClass} rows={2} />
                                </SuggestionItem>
                            ))}
                        </Section>
                        
                        <Section title="Pending Challenges" emoji="🎯" colorClass="bg-orange-50 border-orange-400 text-orange-900 h-full">
                            {challenges.length === 0 ? <p className="text-sm opacity-60">No challenges suggested.</p> : challenges.map((ch, i) => (
                                <SuggestionItem key={i} onRemove={() => handleArrayRemove(setChallenges, i)}>
                                    <textarea value={ch} onChange={e => handleArrayChange(setChallenges, i, e.target.value)} className={inputClass} rows={2} />
                                </SuggestionItem>
                            ))}
                        </Section>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Section title="Personalized Greetings (At least 50 words each)" emoji="👋" colorClass="bg-amber-50 border-amber-400 text-amber-905 h-full">
                            {personalizedGreetings.length === 0 ? <p className="text-sm opacity-60">No greetings suggested.</p> : personalizedGreetings.map((msg, i) => (
                                <SuggestionItem key={i} onRemove={() => handleArrayRemove(setPersonalizedGreetings, i)}>
                                    <textarea value={msg} onChange={e => handleArrayChange(setPersonalizedGreetings, i, e.target.value)} className={inputClass} rows={3} />
                                </SuggestionItem>
                            ))}
                        </Section>
                        
                        <Section title="Personalized Goodbyes (At least 50 words each)" emoji="🎯" colorClass="bg-rose-50 border-rose-400 text-rose-905 h-full">
                            {personalizedGoodbyes.length === 0 ? <p className="text-sm opacity-60">No goodbyes suggested.</p> : personalizedGoodbyes.map((msg, i) => (
                                <SuggestionItem key={i} onRemove={() => handleArrayRemove(setPersonalizedGoodbyes, i)}>
                                    <textarea value={msg} onChange={e => handleArrayChange(setPersonalizedGoodbyes, i, e.target.value)} className={inputClass} rows={3} />
                                </SuggestionItem>
                            ))}
                        </Section>
                    </div>

                    {/* Gamification & Badges Preview */}
                    <Section title="Gamification & Booking Sync" emoji="🎮" colorClass="bg-slate-100 border-slate-500 text-slate-800">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1 bg-white p-4 border rounded-xl shadow-sm text-center">
                                <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Total XP Given</p>
                                <div className="text-4xl font-black text-brand-blue flex items-center justify-center gap-2">
                                    <input type="number" value={totalXP} onChange={e => setTotalXP(parseInt(e.target.value) || 0)} className="w-24 text-center border rounded-lg focus:ring-2 focus:ring-brand-blue" />
                                    <span className="text-xl text-yellow-500">✨</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Editable session rewards</p>
                            </div>

                            <div className="flex-2 flex flex-col justify-center space-y-4">
                                {badges.length > 0 && (
                                    <div className="bg-white p-3 rounded-lg border shadow-sm">
                                        <p className="text-sm font-bold text-gray-700 mb-2">Suggested Badges:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {badges.map((b, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-full relative group">
                                                    <span className="text-lg">{b.emoji}</span>
                                                    <span className="text-xs font-bold text-yellow-800">{b.name}</span>
                                                    <button onClick={() => handleArrayRemove(setBadges, i)} className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 text-[10px] rounded-full hidden group-hover:flex items-center justify-center">&times;</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="bg-white p-3 rounded-lg border shadow-sm text-sm">
                                    <div className="flex items-center gap-2 text-green-700 font-bold mb-1">
                                        <i className="fas fa-calendar-check"></i> Automations triggering:
                                    </div>
                                    <ul className="list-disc pl-5 text-gray-600 text-xs space-y-1 font-medium">
                                        <li>Will mark the scheduled event as completed (if any).</li>
                                        <li>Will deduct 1 session from {"{Active Package}"}.</li>
                                        <li>Will reset <strong>Attention Needed</strong> inactivity timer.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* Emotional Feeling & Sentiment Analysis */}
                    <Section title="Sentiment & Emotion Analysis" emoji="🎭" colorClass="bg-purple-50 border-purple-500 text-purple-900">
                        <div className="space-y-4 bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="font-bold text-sm text-gray-700 block mb-1">Dominant Emotion</label>
                                    <input value={dominantEmotion} onChange={e => setDominantEmotion(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className="font-bold text-sm text-gray-700 block mb-1">Sentiment Score (0-100)</label>
                                    <div className="flex items-center gap-3">
                                        <input type="range" min="0" max="100" value={sentimentScore} onChange={e => setSentimentScore(parseInt(e.target.value))} className="w-full accent-purple-600" />
                                        <span className="font-bold text-lg text-purple-700 w-10">{sentimentScore}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="font-bold text-sm text-gray-700 block mb-1">Emotion Analysis</label>
                                <textarea value={emotionAnalysis} onChange={e => setEmotionAnalysis(e.target.value)} className={inputClass} rows={2} />
                            </div>

                            {/* Psycho-metric Scores Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-gray-200">
                                {[
                                    { label: 'Confidence', score: confidenceScore, setter: setConfidenceScore, analysis: confidenceAnalysis, setAnalysis: setConfidenceAnalysis, color: 'indigo' },
                                    { label: 'Anxiety', score: anxietyScore, setter: setAnxietyScore, analysis: anxietyAnalysis, setAnalysis: setAnxietyAnalysis, color: 'rose' },
                                    { label: 'Risk-Taking', score: riskTakingScore, setter: setRiskTakingScore, analysis: riskTakingAnalysis, setAnalysis: setRiskTakingAnalysis, color: 'amber' },
                                    { label: 'Fear of Mistakes', score: fearOfMistakesScore, setter: setFearOfMistakesScore, analysis: fearOfMistakesAnalysis, setAnalysis: setFearOfMistakesAnalysis, color: 'orange' },
                                    { label: 'Motivation', score: motivationScore, setter: setMotivationScore, analysis: motivationAnalysis, setAnalysis: setMotivationAnalysis, color: 'emerald' },
                                ].map(m => (
                                    <div key={m.label} className={`p-3 rounded-lg border border-${m.color}-200 bg-${m.color}-50/50`}>
                                        <label className={`font-bold text-xs text-${m.color}-800 block mb-1`}>{m.label} ({m.score})</label>
                                        <input type="range" min="0" max="100" value={m.score} onChange={e => m.setter(parseInt(e.target.value))} className={`w-full accent-${m.color}-600 mb-1`} />
                                        <textarea value={m.analysis} onChange={e => m.setAnalysis(e.target.value)} className="w-full text-xs p-1 bg-white border border-gray-200 rounded mt-1" rows={2} placeholder="Analysis..." />
                                    </div>
                                ))}
                            </div>

                            {/* Transferable Skills */}
                            <div className="pt-2 border-t border-gray-200 space-y-2">
                                <label className="font-bold text-sm text-gray-700 block">Transferable Skills ({transferableSkills.length})</label>
                                {transferableSkills.map((ts: any, i: number) => (
                                    <SuggestionItem key={i} onRemove={() => setTransferableSkills(prev => prev.filter((_, idx) => idx !== i))}>
                                        <div className="grid grid-cols-3 gap-2">
                                            <input value={ts.skill} onChange={e => { const s = [...transferableSkills]; s[i].skill = e.target.value; setTransferableSkills(s); }} className={inputClass} placeholder="Skill" />
                                            <input type="number" value={ts.score} onChange={e => { const s = [...transferableSkills]; s[i].score = parseInt(e.target.value) || 0; setTransferableSkills(s); }} className={inputClass} placeholder="Score" />
                                            <input value={ts.evidence} onChange={e => { const s = [...transferableSkills]; s[i].evidence = e.target.value; setTransferableSkills(s); }} className={inputClass} placeholder="Evidence" />
                                        </div>
                                    </SuggestionItem>
                                ))}
                            </div>

                            {/* Emotion Timeline */}
                            <div className="pt-2 border-t border-gray-200 space-y-2">
                                <label className="font-bold text-sm text-gray-700 block">Session Emotion Timeline ({emotionTimeline.length})</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {emotionTimeline.map((item: any, i: number) => (
                                        <SuggestionItem key={i} onRemove={() => setEmotionTimeline(prev => prev.filter((_, idx) => idx !== i))}>
                                            <div className="space-y-1">
                                                <input value={item.phase} onChange={e => { const s = [...emotionTimeline]; s[i].phase = e.target.value; setEmotionTimeline(s); }} className={inputClass} placeholder="Phase" />
                                                <input value={item.mood} onChange={e => { const s = [...emotionTimeline]; s[i].mood = e.target.value; setEmotionTimeline(s); }} className={inputClass} placeholder="Mood" />
                                                <input value={item.emoji} onChange={e => { const s = [...emotionTimeline]; s[i].emoji = e.target.value; setEmotionTimeline(s); }} className={inputClass} placeholder="Emoji" />
                                                <textarea value={item.description} onChange={e => { const s = [...emotionTimeline]; s[i].description = e.target.value; setEmotionTimeline(s); }} className="w-full text-xs p-1 bg-white border border-gray-200 rounded" rows={2} placeholder="Description" />
                                            </div>
                                        </SuggestionItem>
                                    ))}
                                </div>
                            </div>

                            {/* Emotion Sentences */}
                            <div className="pt-2 border-t border-gray-200 space-y-2">
                                <label className="font-bold text-sm text-gray-700 block">Emotional Sentences ({emotionSentences.length})</label>
                                {emotionSentences.map((item: any, i: number) => (
                                    <SuggestionItem key={i} onRemove={() => setEmotionSentences(prev => prev.filter((_, idx) => idx !== i))}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <input value={item.original} onChange={e => { const s = [...emotionSentences]; s[i].original = e.target.value; setEmotionSentences(s); }} className={inputClass} placeholder="Original" />
                                                <input value={item.corrected} onChange={e => { const s = [...emotionSentences]; s[i].corrected = e.target.value; setEmotionSentences(s); }} className={inputClass} placeholder="Corrected" />
                                            </div>
                                            <div className="space-y-1">
                                                <input value={item.emotion} onChange={e => { const s = [...emotionSentences]; s[i].emotion = e.target.value; setEmotionSentences(s); }} className={inputClass} placeholder="Emotion" />
                                                <input value={item.tutorTip} onChange={e => { const s = [...emotionSentences]; s[i].tutorTip = e.target.value; setEmotionSentences(s); }} className={inputClass} placeholder="Tutor Tip" />
                                            </div>
                                        </div>
                                    </SuggestionItem>
                                ))}
                            </div>

                            {/* Driven Words */}
                            <div className="pt-2 border-t border-gray-200 space-y-2">
                                <label className="font-bold text-sm text-gray-700 block">Driven Lexical Words ({drivenWords.length})</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {drivenWords.map((item: any, i: number) => (
                                        <SuggestionItem key={i} onRemove={() => setDrivenWords(prev => prev.filter((_, idx) => idx !== i))}>
                                            <div className="space-y-1">
                                                <input value={item.word} onChange={e => { const s = [...drivenWords]; s[i].word = e.target.value; setDrivenWords(s); }} className={inputClass} placeholder="Word" />
                                                <select value={item.type} onChange={e => { const s = [...drivenWords]; s[i].type = e.target.value; setDrivenWords(s); }} className={inputClass}>
                                                    <option value="positive">Positive</option><option value="negative">Negative</option><option value="neutral">Neutral</option>
                                                </select>
                                                <div className="flex gap-1">
                                                    <input type="number" value={item.count} onChange={e => { const s = [...drivenWords]; s[i].count = parseInt(e.target.value) || 1; setDrivenWords(s); }} className="w-16 text-xs p-1 bg-white border border-gray-300 rounded" />
                                                    <select value={item.intensity} onChange={e => { const s = [...drivenWords]; s[i].intensity = e.target.value; setDrivenWords(s); }} className="text-xs p-1 bg-white border border-gray-300 rounded">
                                                        <option value="High">High</option><option value="Medium">Med</option><option value="Low">Low</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </SuggestionItem>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* Speaking Scores */}
                    <Section title="Speaking Scores Assessment" emoji="🗣️" colorClass="bg-sky-50 border-sky-500 text-sky-900">
                        <div className="space-y-4 bg-white p-4 rounded-xl border border-sky-100 shadow-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="font-bold text-sm text-gray-700 block mb-1">CEFR Level</label>
                                    <input value={speakingCefr} onChange={e => setSpeakingCefr(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className="font-bold text-sm text-gray-700 block mb-1">IELTS (1-9)</label>
                                    <input type="number" step="0.5" min="0" max="9" value={speakingIelts} onChange={e => setSpeakingIelts(parseFloat(e.target.value) || 0)} className={inputClass} />
                                </div>
                                <div>
                                    <label className="font-bold text-sm text-gray-700 block mb-1">TOEFL (0-120)</label>
                                    <input type="number" min="0" max="120" value={speakingToefl} onChange={e => setSpeakingToefl(parseInt(e.target.value) || 0)} className={inputClass} />
                                </div>
                                <div className="flex items-end">
                                    <span className="text-[10px] font-bold text-gray-500">IELTS Sub-scores below</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-200">
                                {[
                                    { label: 'Fluency & Coherence', value: fluencyCoherence, setter: setFluencyCoherence, color: 'bg-indigo-500' },
                                    { label: 'Lexical Resource', value: lexicalResource, setter: setLexicalResource, color: 'bg-emerald-500' },
                                    { label: 'Grammar Accuracy', value: grammarAccuracy, setter: setGrammarAccuracy, color: 'bg-amber-500' },
                                    { label: 'Pronunciation', value: pronunciation, setter: setPronunciation, color: 'bg-rose-500' },
                                ].map(s => (
                                    <div key={s.label} className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-[10px] font-bold text-gray-600 uppercase">{s.label}</p>
                                        <div className="flex items-center gap-2 justify-center my-1">
                                            <input type="range" min="0" max="9" step="0.5" value={s.value} onChange={e => s.setter(parseFloat(e.target.value) || 0)} className="w-16 accent-indigo-600" />
                                            <span className="font-black text-lg">{s.value}</span>
                                        </div>
                                        <div className={`h-1.5 rounded-full ${s.color}`} style={{ width: `${(s.value / 9) * 100}%`, maxWidth: '100%' }}></div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="font-bold text-sm text-gray-700 block mb-1">Rubric Justification</label>
                                <textarea value={rubricJustification} onChange={e => setRubricJustification(e.target.value)} className={inputClass} rows={3} />
                            </div>
                        </div>
                    </Section>

                    {/* Advanced Feedback Diagnostic Matrix */}
                    {advFluency || advAccuracy || advClarity ? (
                        <Section title="Multidimensional Linguistic Diagnostic" emoji="🧠" colorClass="bg-indigo-50 border-indigo-500 text-indigo-900">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                                {[
                                    { label: 'Fluency & Flow', value: advFluency, setter: setAdvFluency, icon: '⚡' },
                                    { label: 'Accuracy', value: advAccuracy, setter: setAdvAccuracy, icon: '🎯' },
                                    { label: 'Clarity', value: advClarity, setter: setAdvClarity, icon: '🧩' },
                                    { label: 'Confidence', value: advConfidence, setter: setAdvConfidence, icon: '💪' },
                                    { label: 'Pragmatic Appropriateness', value: advPragmatic, setter: setAdvPragmatic, icon: '🤝' },
                                    { label: 'Lexical Sophistication', value: advLexical, setter: setAdvLexical, icon: '💎' },
                                    { label: 'Syntactic Complexity', value: advSyntactic, setter: setAdvSyntactic, icon: '🌿' },
                                    { label: 'Repair Strategy Typology', value: advRepair, setter: setAdvRepair, icon: '🔧' },
                                    { label: 'Register Consistency', value: advRegister, setter: setAdvRegister, icon: '👔' },
                                    { label: 'Idea Density', value: advIdeaDensity, setter: setAdvIdeaDensity, icon: '💡' },
                                    { label: 'Meta-Discourse', value: advMetaDiscourse, setter: setAdvMetaDiscourse, icon: '🧭' },
                                    { label: 'Stance Markers', value: advStance, setter: setAdvStance, icon: '🎭' },
                                ].map(f => (
                                    <div key={f.label} className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-1">
                                        <label className="text-xs font-bold text-indigo-800 block flex items-center gap-1.5">
                                            <span>{f.icon}</span> {f.label}
                                        </label>
                                        <textarea value={f.value} onChange={e => f.setter(e.target.value)} className="w-full text-xs p-1.5 bg-white border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500" rows={2} />
                                    </div>
                                ))}
                            </div>
                            {advSyllabus && (
                                <div className="mt-3 bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                    <label className="font-bold text-sm text-emerald-800 block mb-1 flex items-center gap-1.5"><span>📖</span> Syllabus Feedback</label>
                                    <textarea value={advSyllabus} onChange={e => setAdvSyllabus(e.target.value)} className={inputClass} rows={3} />
                                </div>
                            )}
                        </Section>
                    ) : null}

                </main>

                <footer className="p-4 bg-gray-50 border-t flex items-center justify-between rounded-b-2xl sticky bottom-0 z-10 w-full">
                    <p className="text-xs text-gray-500 font-medium px-2">You can always edit this later in the Profile.</p>
                    <div className="flex gap-4">
                        <button onClick={onCancel} className="text-gray-500 hover:text-gray-800 font-bold px-4 py-2 hover:bg-gray-200 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleConfirm} disabled={isSaving} className="bg-brand-blue shadow-lg shadow-blue-500/30 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-600 active:scale-95 transition-all disabled:bg-gray-400 disabled:shadow-none flex items-center gap-2">
                            {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                            {isSaving ? 'Saving...' : 'Update Everything'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AIConfirmationModal;
