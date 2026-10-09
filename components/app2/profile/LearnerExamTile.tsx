import React, { useState } from 'react';
import JSZip from 'jszip';
import SectionCard from '../SectionCard';
import { Learner } from '../../../types2';
import { useLearnerStore } from '../../../store/useLearnerStore';

interface Props {
  learner: Learner;
}

const formatLoggedDateAndElapsed = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    const absoluteDate = d.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return `${absoluteDate} (Just now)`;
    if (diffMins < 60) return `${absoluteDate} (${diffMins}m elapsed)`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${absoluteDate} (${diffHours}h elapsed)`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return `${absoluteDate} (Yesterday)`;
    return `${absoluteDate} (${diffDays} days elapsed)`;
  } catch (e) {
    return dateStr;
  }
};

const cleanOptionDisplay = (raw: any): string => {
  if (raw === undefined || raw === null || raw === '') return '[UNANSWERED]';
  let str = typeof raw === 'object' ? (raw.displayText || raw.label || raw.text || raw.raw || JSON.stringify(raw)) : String(raw);
  
  str = str.trim();
  if (!str) return '[UNANSWERED]';

  // Fix "Option ION C:" or duplicated Option ION artifacts
  str = str.replace(/Option\s+ION\s*/gi, 'Option ');

  // Replace opt_a, opt_b, opt_c, opt_1 with Option A, Option B, etc.
  str = str.replace(/\bopt_([a-zA-Z0-9]+)\b/gi, (_, code) => {
    let cleanCode = code.toUpperCase();
    if (/^\d+$/.test(cleanCode)) {
      const num = parseInt(cleanCode, 10);
      if (num >= 1 && num <= 26) cleanCode = String.fromCharCode(64 + num);
    }
    return `Option ${cleanCode}`;
  });

  // Clean duplicate "Option Option", "Option (Option C)", "Option Option C:"
  str = str.replace(/Option\s*\(\s*Option\s*([A-Z0-9]+)\s*\):?/gi, 'Option $1:');
  str = str.replace(/Option\s*\(\s*([A-Z0-9]+)\s*\):?/gi, 'Option $1:');
  str = str.replace(/Option\s+Option\s*/gi, 'Option ');
  str = str.replace(/^Option\s+([A-Z0-9]+):\s*Option\s+\1:?/gi, 'Option $1:');

  if (/see evaluation rubrics/i.test(str) || /correct answer not provided/i.test(str) || /answer key defined in task specification/i.test(str)) {
    return 'Sample Model Answer / Task Rubric';
  }

  return str;
};

const isWritingOrSpeakingTask = (q: any) => {
  const type = String(q.taskType || q.type || '').toLowerCase();
  const sec = String(q.sectionTitle || q.section || '').toLowerCase();
  return /write|essay|speak|interview|record/i.test(type) || /writing|speaking/i.test(sec);
};

const extractAllQuestionsFromReport = (rawReport: any) => {
  if (!rawReport) return [];
  
  let baseQuestions = Array.isArray(rawReport.detailedQuestionsAnalysis) ? [...rawReport.detailedQuestionsAnalysis] : [];
  
  if (baseQuestions.length === 0 && Array.isArray(rawReport.sections)) {
    let qNum = 1;
    rawReport.sections.forEach((sec: any) => {
      const items = sec.items || sec.tasks || [];
      items.forEach((item: any) => {
        const isAnswered = item.answer !== undefined && item.answer !== null && item.answer !== '' && item.answer !== '[UNANSWERED]';
        const isWritingOrSpeaking = isWritingOrSpeakingTask(item);
        
        let gradeStatus = item.correct ? 'CORRECT' : (item.earned > 0 ? 'PARTIAL' : (isWritingOrSpeaking ? 'NEEDS_MANUAL_GRADING' : 'INCORRECT'));
        
        baseQuestions.push({
          questionNumber: item.order || qNum++,
          taskId: item.id || item.taskId || `q_${qNum}`,
          sectionId: sec.id || sec.sectionId || 'section',
          sectionTitle: sec.title || sec.sectionTitle || 'General Section',
          taskType: item.type || item.taskType || 'single_choice',
          status: isAnswered ? 'ANSWERED' : 'UNANSWERED',
          prompt: item.prompt || item.title || '',
          chosenAnswer: {
            raw: item.answer,
            displayText: item.answer ? cleanOptionDisplay(item.answer) : '[UNANSWERED]'
          },
          correctAnswer: {
            raw: item.correctAnswer || item.modelAnswer || item.explanation,
            displayText: item.correctAnswer ? cleanOptionDisplay(item.correctAnswer) : (item.modelAnswer ? `Sample Answer: ${item.modelAnswer}` : 'Sample Model Answer / Task Rubric')
          },
          scoring: {
            gradeStatus,
            pointsEarned: item.earned ?? (item.correct ? 1 : 0),
            pointsMax: item.max ?? 1,
            isCorrect: Boolean(item.correct)
          },
          telemetry: {
            visitsCount: item.visits ?? 1,
            timeSpentSeconds: item.totalMs ? Math.round(item.totalMs / 1000) : (item.timeSpentSeconds ?? 0),
            timeSpentMs: item.totalMs ?? ((item.timeSpentSeconds ?? 0) * 1000)
          },
          candidateNotes: item.notes || '',
          explanation: item.explanation || ''
        });
      });
    });
  }

  return baseQuestions;
};

export const LearnerExamTile: React.FC<Props> = ({ learner }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [aiAnalysisJSON, setAiAnalysisJSON] = useState('');
  const [activeTabs, setActiveTabs] = useState<Record<number, string>>({});
  const [sectionFilters, setSectionFilters] = useState<Record<number, string>>({});
  const [statusFilters, setStatusFilters] = useState<Record<number, string>>({});
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  
  const updateLearner = useLearnerStore(state => state.updateLearner);
  const examHistory = learner.examAnalysis || [];

  const tryParse = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      setParsedData(parsed);
    } catch (e) {
      setParsedData(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.name.endsWith('.zip') || file.type === 'application/zip') {
      try {
        const zip = await JSZip.loadAsync(file);
        let targetFile = zip.file('payload.json') || zip.file('submission_data.json') || zip.file('results.json');
        if (!targetFile) {
          const jsonFiles = zip.file(/\.json$/i);
          if (jsonFiles.length > 0) {
            targetFile = jsonFiles[0];
          }
        }

        if (targetFile) {
          const text = await targetFile.async('string');
          setJsonInput(text);
          tryParse(text);
        } else {
          alert('No valid payload.json or JSON file found inside this ZIP package.');
        }
      } catch (err) {
        console.error('Error reading ZIP file:', err);
        alert('Failed to parse ZIP package. Please ensure it is a valid zip package.');
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          setJsonInput(text);
          tryParse(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCopyPrompt = () => {
    if (!parsedData) return;
    
    const examInfo = parsedData.examMetadata || parsedData.exam || { title: parsedData.examFamily || 'Mock Test' };
    const title = examInfo.title || examInfo.name || 'Mock Test';
    const candidateRef = parsedData.candidateReference || learner.name || 'Candidate';
    const scoreInfo = parsedData.scoring || {};
    const timingData = parsedData.timing || {};
    const allQuestions = extractAllQuestionsFromReport(parsedData);

    let questionsSummaryText = '';

    if (allQuestions.length > 0) {
      questionsSummaryText = allQuestions.map((q: any) => {
        const chosenStr = q.chosenAnswer?.displayText || (typeof q.chosenAnswer?.raw === 'object' ? JSON.stringify(q.chosenAnswer?.raw) : String(q.chosenAnswer?.raw ?? '[UNANSWERED]'));
        const correctStr = q.correctAnswer?.displayText || (typeof q.correctAnswer?.raw === 'object' ? JSON.stringify(q.correctAnswer?.raw) : String(q.correctAnswer?.raw ?? 'See Rubric'));

        const timeSpentSec = Math.round((q.telemetry?.timeSpentMs ? q.telemetry.timeSpentMs / 1000 : (q.telemetry?.timeSpentSeconds || 0)));

        return `[QUESTION #${q.questionNumber}] Task ID: ${q.taskId} | Section: ${q.sectionTitle} | Type: ${q.taskType}
Status: ${q.status} | Auto-Grade Status: ${q.scoring?.gradeStatus || 'N/A'} (${q.scoring?.pointsEarned || 0}/${q.scoring?.pointsMax || 1} pts)
Time Spent: ${timeSpentSec}s | Visits: ${q.telemetry?.visitsCount || q.telemetry?.visits || 1}
PROMPT: ${q.prompt || 'N/A'}
CANDIDATE CHOSEN ANSWER: ${chosenStr}
CORRECT ANSWER KEY: ${correctStr}
${q.candidateNotes ? `Candidate Notes: ${q.candidateNotes}\n` : ''}`;
      }).join('\n--------------------------------------------------\n');
    } else {
      const answersData = parsedData.answers || {};
      questionsSummaryText = JSON.stringify(answersData, null, 2);
    }
    
    const prompt = `Act as an expert English language examiner and tutor. Perform an exhaustive, rigorous assessment of this student's completed exam submission.

EXAM OVERVIEW:
- Exam Title: ${title}
- Exam Family / Framework: ${parsedData.examFamily || title}
- Candidate Reference: ${candidateRef}
- Session ID: ${parsedData.sessionId || 'N/A'}
- Completion Date: ${parsedData.session?.completedAt || new Date().toISOString()}
- Overall Auto-Score: ${scoreInfo.weightedPercent ?? scoreInfo.percent ?? 0}% (Correct: ${scoreInfo.correctCount ?? 0}/${scoreInfo.totalCount ?? 0})
- Total Time Spent: ${timingData.totalTimeSpentMs ? Math.round(timingData.totalTimeSpentMs / 1000) + 's' : 'N/A'}
- Warnings / Interferences: ${parsedData.session?.warnings ?? 0}
- Focus Loss Incidents: ${parsedData.focusLossEvents?.length ?? 0}

DETAILED QUESTION-BY-QUESTION RESPONSES & TELEMETRY:
--------------------------------------------------
${questionsSummaryText}
--------------------------------------------------

CRITICAL EVALUATION INSTRUCTIONS:
1. EXAM-SPECIFIC RUBRICS: You MUST apply official grading criteria, band score descriptors, and scoring rules specific to THIS exact exam system (${title} / ${parsedData.examFamily || title}). For example:
   - For IELTS: Use official 9-band descriptors (Task Response/Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
   - For TOEFL: Use official 0-30 rubric criteria per section.
   - For Cambridge (B2 First, C1 Advanced, C2 Proficiency): Use CEFR Statement of Results scoring scales.
   - For PTE / Duolingo / TOEIC: Use their respective official band descriptors and skill scales.
   Do NOT use generic or mismatched rubrics.

2. COMPREHENSIVE QUESTION COVERAGE: In the "gradedQuestions" array below, include ALL auto-scored items provided in the detailed question breakdown above (do NOT truncate or limit to 3 items).

3. FOR WRITING TASKS:
   - Provide original essay/email text.
   - Provide corrected draft with inline HTML styling:
     - Strikeout deleted errors: <del style="color:#ef4444; text-decoration:line-through; font-weight:bold;">wrong text</del>
     - Underline green insertions: <ins style="color:#10b981; text-decoration:underline; font-weight:bold; background-color:#ecfdf5; padding:0 2px;">corrected text</ins>
   - Provide detailed rubric breakdown table specific to this exam format.

4. FOR SPEAKING TASKS:
   - Provide prompt and checklist of what to evaluate.
   - Provide detailed rubric table (Fluency & Coherence, Pronunciation, Lexical Resource, Grammar).

OUTPUT REQUIREMENT:
Output EXACTLY a single valid JSON object matching the schema below. Output ONLY raw JSON without markdown wrappers.

SCHEMA:
{
  "examName": "${title}",
  "overallScore": ${scoreInfo.weightedPercent ?? 85},
  "passed": ${Boolean(scoreInfo.passed ?? true)},
  "skillsScores": {
    "reading": { "score": 28, "max": 30, "feedback": "Detailed feedback..." },
    "listening": { "score": 26, "max": 30, "feedback": "Detailed feedback..." },
    "speaking": { "score": 22, "max": 30, "feedback": "Detailed feedback..." },
    "writing": { "score": 24, "max": 30, "feedback": "Detailed feedback..." },
    "overall": { "score": 85, "max": 100, "interpretation": "Overall score interpretation..." }
  },
  "gradedQuestions": [
    {
      "questionId": "task_id",
      "title": "Task Title",
      "section": "Reading / Listening / Grammar",
      "studentAnswer": "Full option label or answer text",
      "correctAnswer": "Full option label or answer text",
      "isCorrect": true,
      "earnedScore": 1,
      "maxScore": 1,
      "feedback": "Detailed feedback..."
    }
  ],
  "writingAnalysis": [
    {
      "questionId": "writing_task_id",
      "title": "Essay / Email Title",
      "original": "Original text...",
      "correctedHtml": "HTML with <del> and <ins>...",
      "detailedRubricsHtml": "<table... ></table>",
      "score": 4.5,
      "maxScore": 5.0,
      "feedback": "Detailed feedback..."
    }
  ],
  "speakingAnalysis": [
    {
      "questionId": "speaking_task_id",
      "title": "Speaking Task Title",
      "questionPrompt": "Prompt...",
      "whatToCheckHtml": "<ul><li>Checklist items...</li></ul>",
      "evaluatorRubricHtml": "<table... ></table>",
      "recordedAudioInfo": "Audio webm reference...",
      "suggestedGrade": "24/30"
    }
  ],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "strengths": ["Strength 1", "Strength 2"],
  "telemetryAnalysisHtml": "Pacing and focus telemetry analysis...",
  "recycledErrors": ["Error 1 -> Correction 1"],
  "examRecommendedPlansHtml": "<h5>Study Plan</h5>...",
  "recommendedPractice": ["Practice item 1"],
  "usefulSitesAndTools": ["Resource 1"],
  "overallScoreRubricHtml": "<p>Rubric summary...</p>"
}
`;

    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitAnalysis = () => {
    try {
      const parsedAnalysis = JSON.parse(aiAnalysisJSON);
      
      const strengthsCount = Array.isArray(parsedAnalysis.strengths) ? parsedAnalysis.strengths.length : 0;
      const weaknessesCount = Array.isArray(parsedAnalysis.weaknesses) ? parsedAnalysis.weaknesses.length : 0;
      const xpEarned = Number(parsedAnalysis.xp) || (150 + (strengthsCount + weaknessesCount) * 10);
      
      parsedAnalysis.xpEarned = xpEarned;
      parsedAnalysis.date = new Date().toISOString();
      parsedAnalysis.rawReport = parsedData; // preserve raw simulator telemetry & questions
      
      const updatedExamHistory = [parsedAnalysis, ...examHistory];
      
      updateLearner({
        ...learner,
        xp: (learner.xp || 0) + xpEarned,
        examAnalysis: updatedExamHistory
      });
      setAiAnalysisJSON('');
      setJsonInput('');
      setParsedData(null);
      alert(`Exam Analysis successfully logged! +${xpEarned} XP awarded to ${learner.name}'s profile.`);
    } catch (e) {
      alert("Invalid JSON format. Please paste valid JSON output from the AI.");
    }
  };

  const renderAggregatedTrends = () => {
     if (examHistory.length === 0) return null;
     
     const totalExams = examHistory.length;
     const avgScore = Math.round(examHistory.reduce((acc, curr) => acc + (Number(curr.overallScore) || 0), 0) / totalExams);
     const totalPassed = examHistory.filter(e => e.passed).length;
     const allErrors = examHistory.flatMap(e => e.recycledErrors || []).filter(Boolean);
     const allStrengths = examHistory.flatMap(e => e.strengths || []).filter(Boolean);
     const allWeaknesses = examHistory.flatMap(e => e.weaknesses || []).filter(Boolean);
     
     return (
         <div className="mt-8 border-t border-indigo-200 pt-6">
             <h3 className="text-xl font-black text-indigo-900 mb-4 bg-indigo-50 p-3 rounded-lg flex items-center gap-2">
                 <i className="fas fa-chart-line text-indigo-600"></i> Overall Exam Heatmap & Aggregated Trends
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 rounded-2xl border border-indigo-200 shadow-sm text-center relative overflow-hidden">
                     <div className="absolute right-2 top-2 opacity-10 text-6xl">📊</div>
                     <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-widest mb-1">Mock Exams Logged</h4>
                     <p className="text-4xl font-black text-indigo-900">{totalExams}</p>
                     <p className="text-xs text-indigo-600 mt-2">{totalPassed} attempts passed target</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-2xl border border-emerald-200 shadow-sm text-center relative overflow-hidden">
                     <div className="absolute right-2 top-2 opacity-10 text-6xl">🎯</div>
                     <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1">Average Score</h4>
                     <p className="text-4xl font-black text-emerald-900">{avgScore}%</p>
                     <p className="text-xs text-emerald-600 mt-2">Overall cohort standard</p>
                  </div>

                  <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-5 rounded-2xl border border-rose-200 shadow-sm text-center relative overflow-hidden">
                     <div className="absolute right-2 top-2 opacity-10 text-6xl">⚠️</div>
                     <h4 className="text-xs font-bold text-rose-800 uppercase tracking-widest mb-1">Persistent Gaps</h4>
                     <p className="text-4xl font-black text-rose-900">{allWeaknesses.length}</p>
                     <p className="text-xs text-rose-600 mt-2">Flagged weakness parameters</p>
                  </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                     <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><i className="fas fa-trophy text-amber-500"></i> Top Extractable Competencies</h4>
                     <div className="flex flex-wrap gap-1.5">
                         {allStrengths.slice(0, 8).map((strength, i) => (
                             <span key={i} className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg font-medium">
                                 {strength}
                             </span>
                         ))}
                     </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                     <h4 className="font-bold text-rose-900 mb-3 flex items-center gap-2"><i className="fas fa-circle-exclamation text-rose-500"></i> Recycled Error Vocabulary</h4>
                     <div className="flex flex-wrap gap-1.5">
                         {allErrors.slice(0, 8).map((error, i) => (
                             <span key={i} className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
                                 {error}
                             </span>
                         ))}
                     </div>
                  </div>
             </div>
         </div>
     )
  };

  return (
    <SectionCard title="Learner Exam Analysis" icon={<i className="fas fa-user-graduate text-indigo-600"></i>}>
      <div className="space-y-6 animate-fade-in">
        <p className="text-sm text-gray-600 leading-relaxed">
          Unlock deep educational metrics. Paste the raw compiled report JSON or upload the ZIP package from your Mock Test simulator, generate the exam prompt, run it through your AI tutor model, and paste back the parsed analysis JSON.
        </p>
        
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  Import Exam Simulator Submission Package (.zip or .json)
              </h5>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold cursor-pointer transition shadow-sm">
                <i className="fas fa-file-archive text-indigo-600"></i> Upload ZIP or JSON
                <input 
                  type="file" 
                  accept=".json,.zip,application/json,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <textarea
                  className="flex-grow p-3 border border-slate-300 rounded-lg text-xs font-mono h-24 resize-y shadow-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="Paste payload.json raw contents or upload your Exam Submission ZIP file above..."
                  value={jsonInput}
                  onChange={(e) => {
                      setJsonInput(e.target.value);
                      tryParse(e.target.value);
                  }}
                />
                <button 
                  onClick={handleCopyPrompt} 
                  disabled={!parsedData}
                  className={`px-5 py-3 rounded-lg font-bold shadow transition-all flex items-center justify-center gap-2 text-sm ${parsedData ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.01]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  {copied ? (
                    <>
                      <i className="fas fa-check text-emerald-400"></i> Copied AI Prompt!
                    </>
                  ) : (
                    <>
                      <i className="fas fa-robot text-indigo-200"></i> Copy AI Analysis Prompt
                    </>
                  )}
                </button>
            </div>
            
            {parsedData && (
              <div className="space-y-4">
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-950 grid grid-cols-2 md:grid-cols-5 gap-3 font-medium shadow-sm">
                   <div><i className="fas fa-file-signature text-indigo-600 mr-1.5"></i> <strong>Exam:</strong> {parsedData.examMetadata?.title || parsedData.exam?.name || parsedData.examFamily || 'Mock Test'}</div>
                   <div><i className="fas fa-user text-indigo-600 mr-1.5"></i> <strong>Candidate:</strong> {parsedData.candidateReference || learner.name || 'Candidate'}</div>
                   <div><i className="fas fa-percent text-indigo-600 mr-1.5"></i> <strong>Auto-Score:</strong> {parsedData.scoring?.weightedPercent ?? parsedData.scoring?.rawPercent ?? parsedData.percent ?? 0}%</div>
                   <div><i className="fas fa-clock text-indigo-600 mr-1.5"></i> <strong>Time Spent:</strong> {parsedData.timing?.totalTimeSpentMs ? Math.round(parsedData.timing.totalTimeSpentMs / 1000) + 's' : 'N/A'}</div>
                   <div><i className="fas fa-shield-alt text-amber-600 mr-1.5"></i> <strong>Incidents:</strong> {parsedData.session?.warnings ?? 0} warnings</div>
                </div>
              </div>
            )}
        </div>

        {parsedData && (
            <div className="pt-4 border-t border-slate-200 animate-fade-in">
                <h5 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    Paste AI Analysis JSON
                </h5>
                <textarea
                  className="w-full p-3 border border-indigo-300 rounded-lg text-xs font-mono h-24 resize-y shadow-sm focus:ring-2 focus:ring-indigo-500 bg-indigo-50/50"
                  placeholder="Paste the parsed JSON analysis block back from Gemini / AI tutor..."
                  value={aiAnalysisJSON}
                  onChange={(e) => setAiAnalysisJSON(e.target.value)}
                />
                <button 
                  onClick={handleSubmitAnalysis} 
                  disabled={!aiAnalysisJSON.trim()}
                  className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg shadow-md transition disabled:bg-slate-300 disabled:cursor-not-allowed text-sm"
                >
                  <i className="fas fa-chart-bar mr-2"></i> Submit & Render Visual Telemetry
                </button>
            </div>
        )}

        {examHistory.length > 0 && (
            <div className="mt-8 space-y-6">
                <h3 className="text-xl font-black text-indigo-900 border-b pb-2 flex items-center gap-2">
                    <i className="fas fa-history text-indigo-600"></i> Mock Exam Analysis Log
                </h3>
                
                {examHistory.map((data, idx) => {
                    const rawReport = data.rawReport || {};
                    const sections = rawReport.sections || [];
                    const focusLossCount = rawReport.focusLossEvents?.length ?? 0;
                    const durationMins = rawReport.timing?.totalTimeSpentMs ? Math.ceil(rawReport.timing.totalTimeSpentMs / 60000) : null;
                    
                    const skillsScores = data.skillsScores;
                    const gradedQuestions = data.gradedQuestions || [];
                    const writingAnalysis = data.writingAnalysis || [];
                    const speakingAnalysis = data.speakingAnalysis || [];
                    
                    // Extract ALL questions from raw report or sections
                    const allQuestions = extractAllQuestionsFromReport(rawReport);
                    
                    // Separate auto-scored questions from writing/speaking tasks
                    const autoScoredQuestions = allQuestions.filter(q => !isWritingOrSpeakingTask(q));
                    const finalAutoScored = autoScoredQuestions.length > 0 ? autoScoredQuestions : allQuestions;

                    // Active Tab state
                    const currentTab = activeTabs[idx] || (finalAutoScored.length > 0 ? "autoscored" : "skills");
                    
                    // Filter states for Auto-Scored Questions
                    const secFilter = sectionFilters[idx] || 'ALL';
                    const statFilter = statusFilters[idx] || 'ALL';
                    const query = (searchQueries[idx] || '').toLowerCase().trim();

                    // Extract unique sections
                    const availableSections = Array.from(new Set(finalAutoScored.map((q: any) => q.sectionTitle).filter(Boolean)));

                    // Filtered questions
                    const filteredQuestions = finalAutoScored.filter((q: any) => {
                      if (secFilter !== 'ALL' && q.sectionTitle !== secFilter) return false;
                      
                      const gradeStat = q.scoring?.gradeStatus || (q.scoring?.isCorrect ? 'CORRECT' : 'INCORRECT');
                      if (statFilter === 'CORRECT' && gradeStat !== 'CORRECT') return false;
                      if (statFilter === 'INCORRECT' && gradeStat !== 'INCORRECT') return false;
                      if (statFilter === 'PARTIAL' && gradeStat !== 'PARTIAL') return false;
                      if (statFilter === 'NEEDS_MANUAL_GRADING' && gradeStat !== 'NEEDS_MANUAL_GRADING') return false;
                      
                      if (query) {
                        const qText = `${q.questionNumber} ${q.sectionTitle} ${q.taskType} ${q.prompt} ${q.chosenAnswer?.displayText} ${q.correctAnswer?.displayText}`.toLowerCase();
                        if (!qText.includes(query)) return false;
                      }
                      
                      return true;
                    });

                    // Statistics for auto-scored tasks
                    const totalAutoCount = finalAutoScored.length;
                    const correctAutoCount = finalAutoScored.filter((q: any) => q.scoring?.isCorrect || q.scoring?.gradeStatus === 'CORRECT').length;
                    const totalEarnedPts = finalAutoScored.reduce((acc: number, q: any) => acc + (q.scoring?.pointsEarned || 0), 0);
                    const totalMaxPts = finalAutoScored.reduce((acc: number, q: any) => acc + (q.scoring?.pointsMax || 1), 0);
                    const accuracyPercent = totalMaxPts > 0 ? Math.round((totalEarnedPts / totalMaxPts) * 100) : 0;

                    return (
                        <details key={idx} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden group mb-4" open={idx === 0}>
                            <summary className="font-bold text-slate-800 p-4 cursor-pointer hover:bg-slate-50 text-sm flex justify-between items-center outline-none select-none group-open:bg-slate-50/50 transition-colors">
                                <span className="tracking-wide flex items-center gap-2.5">
                                    <i className="fas fa-file-alt text-indigo-500 text-lg"></i> 
                                    <div className="text-left">
                                        <div className="font-bold text-slate-950 text-sm">{data.examName || rawReport.examMetadata?.title || 'Mock Examination'}</div>
                                        <div className="text-xs text-slate-500 font-normal">{formatLoggedDateAndElapsed(data.date)}</div>
                                    </div>
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-1 rounded-full font-black flex items-center gap-1 shadow-sm">
                                        Score: {data.overallScore}%
                                    </span>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm ${data.passed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {data.passed ? 'PASSED' : 'RETRY'}
                                    </span>
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (confirm("Are you sure you want to delete this exam analysis?")) {
                                                const updatedExamHistory = (learner.examAnalysis || []).filter((_, i) => i !== idx);
                                                updateLearner({
                                                    ...learner,
                                                    examAnalysis: updatedExamHistory
                                                });
                                            }
                                        }}
                                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-full hover:bg-slate-100 transition flex items-center justify-center w-8 h-8 focus:outline-none"
                                        title="Delete this exam analysis"
                                    >
                                        <i className="fas fa-trash-alt text-xs"></i>
                                    </button>
                                    <i className="fas fa-chevron-down text-slate-400 group-open:rotate-180 transition-transform"></i>
                                </div>
                            </summary>

                            <div className="p-5 border-t border-slate-100 bg-slate-50/20 space-y-6">
                                {/* TAB SELECTOR BAR */}
                                <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                                    <button
                                        onClick={() => setActiveTabs(prev => ({...prev, [idx]: "autoscored"}))}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${currentTab === 'autoscored' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        <i className="fas fa-list-check mr-1.5 text-indigo-600"></i> Auto-Scored Questions ({totalAutoCount})
                                    </button>

                                    {skillsScores && (
                                        <button
                                            onClick={() => setActiveTabs(prev => ({...prev, [idx]: "skills"}))}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${currentTab === 'skills' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            <i className="fas fa-chart-pie mr-1.5 text-purple-600"></i> Skill Scores
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setActiveTabs(prev => ({...prev, [idx]: "writing"}))}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${currentTab === 'writing' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        <i className="fas fa-file-pen mr-1.5 text-amber-600"></i> Writing ({writingAnalysis.length})
                                    </button>

                                    <button
                                        onClick={() => setActiveTabs(prev => ({...prev, [idx]: "speaking"}))}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${currentTab === 'speaking' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        <i className="fas fa-microphone mr-1.5 text-rose-600"></i> Speaking ({speakingAnalysis.length})
                                    </button>

                                    <button
                                        onClick={() => setActiveTabs(prev => ({...prev, [idx]: "telemetry"}))}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${currentTab === 'telemetry' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        <i className="fas fa-clipboard-check mr-1.5 text-emerald-600"></i> Diagnostics & Plans
                                    </button>
                                </div>

                                {/* TAB CONTENT 1: AUTO-SCORED QUESTIONS */}
                                {currentTab === 'autoscored' && (
                                    <div className="space-y-4 animate-fade-in">
                                        {/* SUMMARY BANNER */}
                                        <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-indigo-900">
                                                    <i className="fas fa-bullseye text-indigo-600 mr-1"></i> Auto-Score Accuracy: {accuracyPercent}% ({totalEarnedPts}/{totalMaxPts} pts)
                                                </span>
                                                <span className="text-indigo-700">
                                                    ({correctAutoCount} of {totalAutoCount} tasks correct)
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-indigo-700 font-medium">
                                                Showing {filteredQuestions.length} of {totalAutoCount} items
                                            </div>
                                        </div>

                                        {/* FILTER & SEARCH BAR */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Filter by Section</label>
                                                <select
                                                    value={secFilter}
                                                    onChange={(e) => setSectionFilters(prev => ({...prev, [idx]: e.target.value}))}
                                                    className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium focus:ring-1 focus:ring-indigo-500"
                                                >
                                                    <option value="ALL">All Sections ({totalAutoCount})</option>
                                                    {availableSections.map((secName, sI) => (
                                                        <option key={sI} value={secName}>{secName}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Filter by Result</label>
                                                <select
                                                    value={statFilter}
                                                    onChange={(e) => setStatusFilters(prev => ({...prev, [idx]: e.target.value}))}
                                                    className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium focus:ring-1 focus:ring-indigo-500"
                                                >
                                                    <option value="ALL">All Statuses</option>
                                                    <option value="CORRECT">Correct Only</option>
                                                    <option value="INCORRECT">Incorrect Only</option>
                                                    <option value="PARTIAL">Partial Credit</option>
                                                    <option value="NEEDS_MANUAL_GRADING">Needs Manual Grading</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Search Items</label>
                                                <input
                                                    type="text"
                                                    placeholder="Search question text or answers..."
                                                    value={searchQueries[idx] || ''}
                                                    onChange={(e) => setSearchQueries(prev => ({...prev, [idx]: e.target.value}))}
                                                    className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium focus:ring-1 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        {/* QUESTION CARDS LIST */}
                                        {filteredQuestions.length > 0 ? (
                                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                                                {filteredQuestions.map((q: any, qIdx: number) => {
                                                    const isCorrect = q.scoring?.isCorrect || q.scoring?.gradeStatus === 'CORRECT';
                                                    const isPartial = q.scoring?.gradeStatus === 'PARTIAL';
                                                    const isManual = q.scoring?.gradeStatus === 'NEEDS_MANUAL_GRADING';
                                                    const isAnswered = q.status === 'ANSWERED';

                                                    let badgeColor = "bg-rose-100 text-rose-800 border-rose-200";
                                                    if (isCorrect) badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                                                    else if (isPartial) badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                                                    else if (isManual) badgeColor = "bg-sky-100 text-sky-800 border-sky-200";
                                                    else if (!isAnswered) badgeColor = "bg-slate-100 text-slate-600 border-slate-200";

                                                    const rawChosen = q.chosenAnswer?.displayText || q.chosenAnswer?.raw;
                                                    const rawCorrect = q.correctAnswer?.displayText || q.correctAnswer?.raw;

                                                    const chosenText = cleanOptionDisplay(rawChosen);
                                                    const correctText = cleanOptionDisplay(rawCorrect);

                                                    const timeSpentMs = q.telemetry?.timeSpentMs ?? (q.telemetry?.timeSpentSeconds ? q.telemetry.timeSpentSeconds * 1000 : 0);
                                                    const timeSpentSec = Math.round(timeSpentMs / 1000);
                                                    const timeDisplay = timeSpentSec > 0 ? `${timeSpentSec}s` : '< 1s';
                                                    const visitsDisplay = q.telemetry?.visitsCount ?? q.telemetry?.visits ?? 1;

                                                    // Merge AI feedback if available in gradedQuestions array
                                                    const matchedAiGraded = gradedQuestions.find((g: any) => 
                                                      String(g.questionId) === String(q.taskId) || 
                                                      String(g.title) === String(q.prompt) ||
                                                      (g.questionNumber && g.questionNumber === q.questionNumber)
                                                    );
                                                    const aiFeedbackText = matchedAiGraded?.feedback || q.explanation || q.feedback;

                                                    return (
                                                        <div key={qIdx} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 text-xs shadow-sm hover:border-indigo-300 transition-all">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2 font-bold text-slate-900">
                                                                    <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px] font-black shrink-0">
                                                                        {q.questionNumber || qIdx + 1}
                                                                    </span>
                                                                    <span className="text-slate-800">{q.sectionTitle}</span>
                                                                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                                                                        {q.taskType}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${badgeColor}`}>
                                                                        {q.scoring?.gradeStatus || q.status} ({q.scoring?.pointsEarned ?? 0}/{q.scoring?.pointsMax ?? 1} pts)
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-500 font-mono font-medium">
                                                                        ⏱️ {timeDisplay} | 👁️ {visitsDisplay} visit{visitsDisplay === 1 ? '' : 's'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {q.prompt && (
                                                                <p className="text-slate-800 font-medium italic bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                                                                    "{q.prompt.length > 320 ? q.prompt.slice(0, 320) + '...' : q.prompt}"
                                                                </p>
                                                            )}

                                                            {/* CANDIDATE ANSWER LEFT vs CORRECT ANSWER RIGHT */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                                                <div className="p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-lg">
                                                                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block mb-1">Candidate Chosen Answer:</span>
                                                                    <span className="font-semibold text-indigo-950 break-words text-xs leading-snug">
                                                                        {chosenText}
                                                                    </span>
                                                                </div>

                                                                <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-lg">
                                                                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block mb-1">Correct Answer Key:</span>
                                                                    <span className="font-semibold text-emerald-950 break-words text-xs leading-snug">
                                                                        {correctText}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {aiFeedbackText && (
                                                                <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg text-amber-950 text-xs italic font-medium leading-relaxed">
                                                                    <i className="fas fa-lightbulb text-amber-500 mr-1.5"></i>
                                                                    <strong>AI Tutor Insight:</strong> {aiFeedbackText}
                                                                </div>
                                                            )}

                                                            {q.candidateNotes && (
                                                                <div className="p-2 bg-slate-100 border border-slate-200 rounded text-slate-700 text-[11px] font-medium">
                                                                    <strong>Candidate Notes:</strong> {q.candidateNotes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
                                                <i className="fas fa-search text-slate-300 text-lg mb-1 block"></i>
                                                <div>No auto-scored questions match the selected section/status filters.</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB CONTENT 2: SKILL SCORES */}
                                {currentTab === 'skills' && skillsScores && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {Object.entries(skillsScores).filter(([key]) => ['reading', 'listening', 'speaking', 'writing'].includes(key)).map(([key, val]: [string, any]) => {
                                                const percentage = Math.round((val.score / val.max) * 100);
                                                return (
                                                    <div key={key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-colors">
                                                        <div>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                                    {key === 'reading' && <i className="fas fa-book-open text-blue-500"></i>}
                                                                    {key === 'listening' && <i className="fas fa-headphones text-purple-500"></i>}
                                                                    {key === 'speaking' && <i className="fas fa-microphone text-rose-500"></i>}
                                                                    {key === 'writing' && <i className="fas fa-pen-nib text-amber-500"></i>}
                                                                    {key}
                                                                </span>
                                                                <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">{val.score}/{val.max}</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                                                                <div 
                                                                    className={`h-full rounded-full ${key === 'reading' ? 'bg-blue-500' : key === 'listening' ? 'bg-purple-500' : key === 'speaking' ? 'bg-rose-500' : 'bg-amber-500'}`}
                                                                    style={{ width: `${percentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <p className="text-[11px] text-slate-600 italic font-semibold leading-normal">{val.feedback}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {skillsScores?.overall && (
                                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mt-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                <div className="space-y-0.5">
                                                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                                                        <i className="fas fa-star"></i> Overall Score Interpretation
                                                    </span>
                                                    <p className="text-xs text-indigo-950 font-semibold leading-relaxed">{skillsScores.overall.interpretation}</p>
                                                </div>
                                                <div className="bg-indigo-600 text-white p-3 rounded-xl text-center shrink-0 min-w-[120px] shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Overall Standard</div>
                                                    <div className="text-xl font-black">{skillsScores.overall.score}/{skillsScores.overall.max}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB CONTENT 3: WRITING */}
                                {currentTab === 'writing' && (
                                    <div className="space-y-6 animate-fade-in">
                                        {writingAnalysis.length > 0 ? (
                                            writingAnalysis.map((essay: any, eIdx: number) => (
                                                <div key={eIdx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 p-4 border-b border-slate-200 flex justify-between items-center">
                                                        <h5 className="font-black text-indigo-900 text-xs flex items-center gap-2">
                                                            <i className="fas fa-file-pen"></i> {essay.title || `Writing Task ${eIdx + 1}`}
                                                        </h5>
                                                        <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm">
                                                            Score: {essay.score}/{essay.maxScore || 5.0}
                                                        </span>
                                                    </div>
                                                    <div className="p-5 space-y-5">
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                            <div className="space-y-1.5">
                                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                                    <i className="fas fa-align-left"></i> Original Submission
                                                                </span>
                                                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-semibold whitespace-pre-wrap leading-relaxed h-[220px] overflow-y-auto">
                                                                    {essay.original}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1">
                                                                    <i className="fas fa-wand-magic-sparkles"></i> Corrected Draft & Inline Feedback
                                                                </span>
                                                                <div 
                                                                    className="p-3 bg-indigo-50/20 border border-indigo-100 rounded-lg text-xs text-indigo-950 font-semibold leading-relaxed h-[220px] overflow-y-auto"
                                                                    dangerouslySetInnerHTML={{ __html: essay.correctedHtml }}
                                                                ></div>
                                                            </div>
                                                        </div>

                                                        {essay.detailedRubricsHtml && (
                                                            <div className="pt-4 border-t border-slate-100 space-y-2">
                                                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                                    <i className="fas fa-table-list text-indigo-500"></i> Rubric & Grade Boundaries
                                                                </span>
                                                                <div className="prose max-w-none text-xs text-slate-700" dangerouslySetInnerHTML={{ __html: essay.detailedRubricsHtml }}></div>
                                                            </div>
                                                        )}

                                                        {essay.feedback && (
                                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs italic text-slate-600 leading-relaxed font-semibold">
                                                                <i className="fas fa-comment-dots text-indigo-400 mr-1.5"></i> <strong>General Comments:</strong> {essay.feedback}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                <i className="fas fa-circle-info mr-1 text-slate-300"></i> No detailed writing tasks analyzed for this log yet.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB CONTENT 4: SPEAKING */}
                                {currentTab === 'speaking' && (
                                    <div className="space-y-6 animate-fade-in">
                                        {speakingAnalysis.length > 0 ? (
                                            speakingAnalysis.map((speak: any, sIdx: number) => (
                                                <div key={sIdx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                    <div className="bg-gradient-to-r from-rose-50 to-rose-100/50 p-4 border-b border-slate-200 flex justify-between items-center">
                                                        <h5 className="font-black text-rose-900 text-xs flex items-center gap-2">
                                                            <i className="fas fa-volume-high text-rose-500"></i> {speak.title || `Speaking Task ${sIdx + 1}`}
                                                        </h5>
                                                        {speak.suggestedGrade && (
                                                            <span className="bg-rose-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm">
                                                                Suggested Score: {speak.suggestedGrade}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="p-5 space-y-4">
                                                        <div className="p-3.5 bg-rose-50/30 border border-rose-100/50 rounded-xl">
                                                            <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider flex items-center gap-1.5 mb-1.5">
                                                                <i className="fas fa-circle-question"></i> Speaking Question Prompt
                                                            </span>
                                                            <p className="text-xs font-bold text-rose-950 leading-relaxed">{speak.questionPrompt}</p>
                                                        </div>

                                                        {speak.recordedAudioInfo && (
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-slate-100 p-2 rounded-lg border border-slate-200 w-fit">
                                                                <i className="fas fa-file-waveform text-rose-400"></i> {speak.recordedAudioInfo}
                                                            </div>
                                                        )}

                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                            <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-sm">
                                                                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b pb-2 mb-2">
                                                                    <i className="fas fa-clipboard-check text-rose-400"></i> Checklist: What to check for
                                                                </span>
                                                                <div className="text-xs text-slate-700 font-semibold leading-relaxed speaking-checklist prose max-w-none" dangerouslySetInnerHTML={{ __html: speak.whatToCheckHtml }}></div>
                                                            </div>
                                                            <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-sm">
                                                                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b pb-2 mb-2">
                                                                    <i className="fas fa-ranking-star text-rose-400"></i> Correction Rubrics Table
                                                                </span>
                                                                <div className="text-xs text-slate-700 prose max-w-none shadow-sm rounded-lg overflow-hidden border border-slate-200 bg-white" dangerouslySetInnerHTML={{ __html: speak.evaluatorRubricHtml }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                <i className="fas fa-circle-info mr-1 text-slate-300"></i> No detailed speaking tasks analyzed yet.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB CONTENT 5: DIAGNOSTICS & PLANS */}
                                {currentTab === 'telemetry' && (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                                <div>
                                                    <h4 className="font-black text-slate-900 text-sm mb-2 flex items-center gap-2">
                                                        <i className="fas fa-stopwatch text-indigo-500"></i> Exam Pacing Analysis
                                                    </h4>
                                                    <p className="text-xs text-slate-600 mb-4">
                                                        A total of <span className="font-bold text-indigo-600">{durationMins ?? 'N/A'} minutes</span> was spent completing the examination tasks.
                                                    </p>
                                                </div>
                                                {sections.length > 0 && (
                                                    <div className="space-y-2">
                                                        {sections.map((section: any, sIdx: number) => (
                                                            <div key={sIdx} className="space-y-1">
                                                                <div className="flex justify-between text-[11px] text-slate-500 font-bold">
                                                                    <span className="truncate max-w-[200px]">{section.title}</span>
                                                                    <span>{section.percent}% accuracy</span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                                                    <div 
                                                                      className={`h-full rounded-full ${section.percent >= 70 ? 'bg-emerald-500' : section.percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                                                      style={{ width: `${section.percent}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                                <h4 className="font-black text-slate-900 text-sm mb-2 flex items-center gap-2">
                                                    <i className="fas fa-shield-halved text-rose-500"></i> Telemetry & Integrity Diagnostics
                                                </h4>
                                                <div className="space-y-3 mt-3">
                                                     <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 border border-rose-100">
                                                         <span className="text-xs text-rose-900 font-bold"><i className="fas fa-triangle-exclamation mr-1"></i> Focus Interferences</span>
                                                         <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-black">{focusLossCount} events</span>
                                                     </div>
                                                     <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
                                                         <span className="text-xs text-amber-900 font-bold"><i className="fas fa-circle-exclamation mr-1"></i> Warnings Registered</span>
                                                         <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-black">{rawReport.session?.warnings ?? 0} warnings</span>
                                                     </div>
                                                     <div className="text-xs text-slate-700 max-h-36 overflow-y-auto font-semibold" dangerouslySetInnerHTML={{__html: data.telemetryAnalysisHtml || 'No detailed anomaly alerts extracted.'}}></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm">
                                                 <h4 className="font-black text-emerald-900 text-sm mb-2 flex items-center gap-2">
                                                     <i className="fas fa-thumbs-up text-emerald-500"></i> Extracted Strengths
                                                 </h4>
                                                 <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1.5 font-semibold">
                                                     {data.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                 </ul>
                                             </div>

                                             <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm">
                                                 <h4 className="font-black text-rose-900 text-sm mb-2 flex items-center gap-2">
                                                     <i className="fas fa-thumbs-down text-rose-500"></i> Critical Weakness Gaps
                                                 </h4>
                                                 <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1.5 font-semibold">
                                                     {data.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                                 </ul>
                                             </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             {data.recycledErrors?.length > 0 && (
                                                  <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm">
                                                      <h4 className="font-bold text-orange-950 text-sm mb-3 flex items-center gap-2">
                                                          <i className="fas fa-rotate"></i> Recycled Vocabulary & Grammar Errors
                                                      </h4>
                                                      <ul className="list-disc pl-5 text-xs text-orange-900 space-y-1.5 font-semibold">
                                                          {data.recycledErrors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                                                      </ul>
                                                  </div>
                                             )}

                                             {data.examRecommendedPlansHtml && (
                                                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 shadow-sm">
                                                      <h4 className="font-bold text-blue-950 text-sm mb-3 flex items-center gap-2">
                                                          <i className="fas fa-calendar-alt text-blue-600"></i> Recommended Prep Plan & Schedule
                                                      </h4>
                                                      <div className="text-xs text-blue-950 prose max-w-none font-semibold" dangerouslySetInnerHTML={{__html: data.examRecommendedPlansHtml}}></div>
                                                  </div>
                                             )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                                 <h4 className="font-black text-slate-900 text-sm mb-2 flex items-center gap-2">
                                                     <i className="fas fa-clipboard-list text-indigo-500"></i> Recommended Practice & Assignments
                                                 </h4>
                                                 <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1.5 font-semibold">
                                                     {data.recommendedPractice?.map((p: string, i: number) => <li key={i}>{p}</li>)}
                                                 </ul>
                                             </div>

                                             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                                 <h4 className="font-black text-slate-900 text-sm mb-2 flex items-center gap-2">
                                                     <i className="fas fa-globe text-indigo-500"></i> Useful Preparation Sites & Tools
                                                 </h4>
                                                 <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1.5 font-semibold">
                                                     {data.usefulSitesAndTools?.map((site: string, i: number) => <li key={i}>{site}</li>)}
                                                 </ul>
                                             </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </details>
                    );
                })}
                
                {renderAggregatedTrends()}
            </div>
        )}
      </div>
    </SectionCard>
  );
};
