import React, { useState } from 'react';
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

export const LearnerActivityTile: React.FC<Props> = ({ learner }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [aiAnalysisJSON, setAiAnalysisJSON] = useState('');
  
  // New state variables for Voice Message evaluation feature
  const [activeInputMode, setActiveInputMode] = useState<'session' | 'voice'>('session');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [copiedVoice, setCopiedVoice] = useState(false);
  const [voiceAiAnalysisJSON, setVoiceAiAnalysisJSON] = useState('');

  const updateLearner = useLearnerStore(state => state.updateLearner);
  const visualizedData = learner.sessionAnalysis || [];

  const tryParse = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      setParsedData(parsed);
    } catch (e) {
      setParsedData(null);
    }
  };

  const handleCopyPrompt = () => {
    if (!parsedData) return;
    
    let essayData = JSON.stringify(parsedData.essayAnswers || {}, null, 2);
    let errorData = JSON.stringify(parsedData.incorrectAnswers || [], null, 2);
    let interactions = JSON.stringify(parsedData.interactionLog || [], null, 2);
    let timestamps = JSON.stringify(parsedData.activityTimestamps || {}, null, 2);
    let voiceRecords = Object.keys(parsedData.voiceRecordings || {}).length + " recordings submitted.";

    const prompt = `Act as a highly experienced, nitpicking language tutor. Your task is to accurately and in detail analyze the learner's essay answers, errors, and session data. Be meticulous, use deep inference and interpretation.
    
Here are their essay answers:
${essayData}

Here are the mistakes they made:
${errorData}

Voice Activities Logged:
${voiceRecords}

Activity Timestamps (for habit analysis, times are local):
${timestamps}

Please provide a deep analysis and feedback of errors and mistakes in Essay. Write the wrong part ~~strikethrough red~~ and the correct green, explain the grammar/vocab concepts in very simple, basic English. Be extremely nitpicking. Address the learner directly in the 2nd person ("You").

OUTPUT REQUIREMENT:
You MUST output your analysis EXACTLY as a valid JSON object matching this schema. Output ONLY the JSON block.
\`\`\`json
{
  "essayFeedbackHtml": "A rich HTML string where incorrect parts are styled with <del style='color:red;'> and corrections with <ins style='color:green;'>, plus detailed grammatical explanations.",
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "strengths": ["Strength 1", "Strength 2"],
  "habitAnalysisHtml": "HTML string summarizing preferred times of day/week, goal tracking progress based on timestamps.",
  "learnerFactsExtracted": ["Loves gaming", "Struggles with past perfect"],
  "recycledErrors": ["did not went -> did not go"]
}
\`\`\``;

    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [copiedCardKey, setCopiedCardKey] = useState<string | null>(null);
  const [screenshottingKey, setScreenshottingKey] = useState<string | null>(null);
  const [capturedKey, setCapturedKey] = useState<string | null>(null);

  const copyEssayFeedbackToClipboard = async (cardKey: string, essayHtml: string) => {
    if (!essayHtml) return;

    const styledContainer = `
      <div style="font-family: system-ui, -apple-system, sans-serif; background-color: #e0e7ff; padding: 16px; border-radius: 8px; border: 1px solid #c7d2fe; color: #1e1b4b;">
        <h3 style="margin: 0 0 12px 0; color: #312e81; font-size: 15px; font-weight: bold;">
          📝 Essay Type Feedback
        </h3>
        <div style="background-color: #ffffff; padding: 14px; border-radius: 6px; border: 1px solid #c7d2fe; font-size: 14px; line-height: 1.6; color: #1e1b4b;">
          ${essayHtml}
        </div>
      </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = essayHtml;
    const plainText = tempDiv.textContent || tempDiv.innerText || essayHtml.replace(/<[^>]*>/g, '');

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([styledContainer], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          })
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch (err) {
      await navigator.clipboard.writeText(plainText);
    }

    setCopiedCardKey(cardKey);
    setTimeout(() => setCopiedCardKey(null), 2000);
  };

  const captureEssayFeedbackScreenshot = async (elementId: string, cardKey: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    setScreenshottingKey(cardKey);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: '#e0e7ff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setScreenshottingKey(null);
          return;
        }

        try {
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
          }
        } catch (clipboardErr) {
          console.warn('Clipboard image copy fallback:', clipboardErr);
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `essay-type-feedback-screenshot.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setCapturedKey(cardKey);
        setTimeout(() => setCapturedKey(null), 2500);
        setScreenshottingKey(null);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
      setScreenshottingKey(null);
    }
  };

  const formatRegisterHtml = (rawText: string, colorScheme: 'teal' | 'blue' | 'purple' | 'slate' | 'rose') => {
    if (!rawText) return "No sample response provided.";

    // Replace markdown **bold** or *bold* with <b>bold</b>
    let html = rawText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<b>$1</b>');

    const colorClasses: Record<string, string> = {
      teal: 'font-extrabold text-teal-800 bg-teal-100/90 px-1 py-0.5 rounded border border-teal-200/80 shadow-2xs',
      blue: 'font-extrabold text-blue-800 bg-blue-100/90 px-1 py-0.5 rounded border border-blue-200/80 shadow-2xs',
      purple: 'font-extrabold text-purple-800 bg-purple-100/90 px-1 py-0.5 rounded border border-purple-200/80 shadow-2xs',
      slate: 'font-extrabold text-slate-900 bg-slate-200/90 px-1 py-0.5 rounded border border-slate-300 shadow-2xs',
      rose: 'font-extrabold text-rose-900 bg-rose-100/90 px-1 py-0.5 rounded border border-rose-200/80 shadow-2xs',
    };

    const boldClass = colorClasses[colorScheme] || colorClasses.teal;

    // Wrap all <b> or <strong> tags with styled markup
    html = html.replace(/<b\b[^>]*>(.*?)<\/b>/gi, `<b class="${boldClass}">$1</b>`);
    html = html.replace(/<strong\b[^>]*>(.*?)<\/strong>/gi, `<b class="${boldClass}">$1</b>`);

    return html;
  };

  const copyCardToClipboard = async (cardKey: string, cardTitle: string, rawText: string, colorScheme: 'teal' | 'blue' | 'purple' | 'slate' | 'rose') => {
    if (!rawText) return;

    const hexColors: Record<string, string> = {
      teal: '#0f766e',
      blue: '#1e40af',
      purple: '#6b21a8',
      slate: '#0f172a',
      rose: '#9f1239',
    };
    const bgHexColors: Record<string, string> = {
      teal: '#ccfbf1',
      blue: '#dbeafe',
      purple: '#f3e8ff',
      slate: '#e2e8f0',
      rose: '#ffe4e6',
    };

    const mainColor = hexColors[colorScheme] || hexColors.teal;
    const bgColor = bgHexColors[colorScheme] || bgHexColors.teal;

    let styledHtml = rawText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<b>$1</b>');
    styledHtml = styledHtml.replace(/<b\b[^>]*>(.*?)<\/b>/gi, `<b style="font-weight: 800; color: ${mainColor}; background-color: ${bgColor}; padding: 1px 4px; border-radius: 4px;">$1</b>`);

    const plainText = rawText.replace(/<[^>]*>/g, '').replace(/\*\*/g, '').replace(/\*/g, '');

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([styledHtml], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          })
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch (err) {
      await navigator.clipboard.writeText(plainText);
    }

    setCopiedCardKey(cardKey);
    setTimeout(() => setCopiedCardKey(null), 2000);
  };

  const handleCopyVoicePrompt = () => {
    if (!voiceTranscript.trim()) return;

    const prompt = `Act as an expert English language examiner, linguist, and spoken English coach.
Your task is to analyze a raw transcript of a voice message sent by my student.

STUDENT'S VOICE MESSAGE TRANSCRIPT:
"${voiceTranscript.replace(/"/g, '\\"')}"

Instructions:
1. Provide a direct, line-by-line grammar and phrasing correction of the transcript.
   Highlight errors using strikeout red markup and corrected parts using green markup exactly:
   - Red strikeout: <del style="color:#ef4444; text-decoration:line-through; font-weight:bold;">incorrect text</del>
   - Green insertion: <ins style="color:#10b981; text-decoration:underline; font-weight:bold; background-color:#ecfdf5; padding:0 2px;">corrected text</ins>
2. Provide a premium, multi-register spoken English transformation guide:
   - **How to say it better**: Natural, fluent, native speaker conversational phrasing.
   - **How to say it more formally**: Advanced structures, polite register, business or academic context.
   - **How to say it more casually & informally**: Everyday conversational style, standard contractions, idioms.
   - **Street talk / Slang**: Highly informal street slang, natural speech fillers, cool youth idioms.
   - **Expressive / Swear & Obscenity usage context (Edgy Speech & Swear Emphasis)**: Provide a raw, edgy alternative with expressive emphasis, creative swear words, or intense emotional swearing tailored specifically to the context of the student's message. Vary the swear words and edgy expressions creatively based on situation (e.g. use diverse slang/swears like 'damn right', 'bloody hell', 'pissed off', 'badass', 'fucking', 'bullshit', 'freaking', 'holy crap', 'crap', 'ass-kicking', 'screw that', 'no fucking way', etc., avoiding repetitive formulas).

CRITICAL BOLD MARKUP MANDATE FOR ALL 5 REGISTER ALTERNATIVES:
You MUST enclose all new, replaced, or added words and phrases inside real HTML <b>...</b> tags (e.g., "I <b>went ahead and contacted</b> them").
DO NOT use markdown asterisks (* or **). Use real HTML <b>...</b> tags around changed or added words so they stand out cleanly in bold style.

3. Extract:
   - A list of **Strengths** in their speech/vocabulary.
   - A list of **Weaknesses** / areas to focus on.
   - An array of **Recycled Errors** (e.g. ["I goes -> I went"]).
   - **Learner Facts** extracted from their message (e.g. interests, goals, current mood).
4. Award XP: Suggest a recommended XP award between 50 and 100 based on length/complexity.

OUTPUT REQUIREMENT:
You MUST output your response EXACTLY as a valid JSON object matching the schema below. Output ONLY the raw JSON block without any markdown wrappers.

{
  "title": "Voice Message Evaluation",
  "originalTranscript": "${voiceTranscript.replace(/"/g, '\\"')}",
  "correctedHtml": "HTML string highlighting speech slips. Use <del style='color:#ef4444; text-decoration:line-through; font-weight:bold;'>wrong</del> and <ins style='color:#10b981; text-decoration:underline; font-weight:bold; background-color:#ecfdf5; padding:0 2px;'>corrected</ins>.",
  "sayItBetter": "Polished, highly natural spoken alternative with <b>added phrases in bold HTML</b>.",
  "sayItFormally": "Formal/business standard spoken alternative with <b>added phrases in bold HTML</b>.",
  "sayItCasually": "Casual, daily conversational spoken alternative with contractions and <b>added phrases in bold HTML</b>.",
  "streetTalk": "Street talk and cool slang spoken version with <b>added phrases in bold HTML</b>.",
  "obscenitiesExplanation": "Raw edgy alternative with creative, context-specific swear words & expressiveness using <b>added phrases in bold HTML</b>, followed by brief register safety context.",
  "strengths": ["E.g. Clear statement of opinion", "E.g. Good vocabulary range"],
  "weaknesses": ["E.g. Preposition selection", "E.g. Pluralization consistency"],
  "recycledErrors": ["E.g. 'I was go' -> 'I went'"],
  "learnerFactsExtracted": ["E.g. Discusses their upcoming weekend trip", "E.g. Feeling stressed about work"],
  "xpEarned": 75
}`;

    navigator.clipboard.writeText(prompt);
    setCopiedVoice(true);
    setTimeout(() => setCopiedVoice(false), 2000);
  };

  const handleSubmitAnalysis = () => {
    try {
      const parsedAnalysis = JSON.parse(aiAnalysisJSON);
      
      const strengthsCount = Array.isArray(parsedAnalysis.strengths) ? parsedAnalysis.strengths.length : 0;
      const weaknessesCount = Array.isArray(parsedAnalysis.weaknesses) ? parsedAnalysis.weaknesses.length : 0;
      const xpEarned = Number(parsedAnalysis.xp) || (55 + (strengthsCount + weaknessesCount) * 5);
      
      parsedAnalysis.xpEarned = xpEarned;
      parsedAnalysis.date = new Date().toISOString();
      parsedAnalysis.analysisType = 'session_report';
      
      const updatedAnalysis = [parsedAnalysis, ...(learner.sessionAnalysis || [])];
      
      updateLearner({
        ...learner,
        xp: (learner.xp || 0) + xpEarned,
        sessionAnalysis: updatedAnalysis
      });
      setAiAnalysisJSON('');
      setJsonInput('');
      setParsedData(null);
      alert(`Analysis successfully logged! +${xpEarned} XP awarded to ${learner.name}'s profile.`);
    } catch (e) {
      alert("Invalid JSON format. Please paste valid JSON output from the AI.");
    }
  };

  const handleSubmitVoiceAnalysis = () => {
    try {
      const parsedAnalysis = JSON.parse(voiceAiAnalysisJSON);
      
      const strengthsCount = Array.isArray(parsedAnalysis.strengths) ? parsedAnalysis.strengths.length : 0;
      const weaknessesCount = Array.isArray(parsedAnalysis.weaknesses) ? parsedAnalysis.weaknesses.length : 0;
      const xpEarned = Number(parsedAnalysis.xpEarned || parsedAnalysis.xp) || (60 + (strengthsCount + weaknessesCount) * 5);
      
      parsedAnalysis.xpEarned = xpEarned;
      parsedAnalysis.date = new Date().toISOString();
      parsedAnalysis.analysisType = 'voice_message';
      
      const updatedAnalysis = [parsedAnalysis, ...(learner.sessionAnalysis || [])];
      
      updateLearner({
        ...learner,
        xp: (learner.xp || 0) + xpEarned,
        sessionAnalysis: updatedAnalysis
      });
      setVoiceAiAnalysisJSON('');
      setVoiceTranscript('');
      alert(`Voice message analysis successfully logged! +${xpEarned} XP awarded to ${learner.name}'s profile.`);
    } catch (e) {
      alert("Invalid JSON format. Please paste valid JSON output from the AI.");
    }
  };

  const renderAggregatedHeatmap = () => {
     if (visualizedData.length === 0) return null;
     
     const totalStrengths = visualizedData.reduce((acc, curr) => acc + (curr.strengths?.length || 0), 0);
     const totalWeaknesses = visualizedData.reduce((acc, curr) => acc + (curr.weaknesses?.length || 0), 0);
     const allErrors = visualizedData.flatMap(d => d.recycledErrors || []).filter(Boolean);
     const allFacts = visualizedData.flatMap(d => d.learnerFactsExtracted || d.factsExtracted || []).filter(Boolean);
     
     return (
         <div className="mt-8 border-t border-indigo-200 pt-6">
             <h3 className="text-xl font-black text-indigo-900 mb-4 bg-indigo-50 p-3 rounded-lg flex items-center"><i className="fas fa-layer-group mr-2"></i> Overall Heatmap & Aggregated Trends</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center"><i className="fas fa-chart-pie text-indigo-500 mr-2"></i> Trend Summary</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Total Analyzed Logs</span><span className="font-bold text-indigo-600">{visualizedData.length}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Identified Strengths</span><span className="font-bold text-green-600">{totalStrengths}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Areas to Improve</span><span className="font-bold text-red-600">{totalWeaknesses}</span></div>
                    </div>
                 </div>
                 <div className="bg-white p-5 rounded-xl shadow-sm border border-orange-200">
                    <h4 className="font-bold text-orange-800 mb-3 flex items-center"><i className="fas fa-exclamation-triangle mr-2"></i> Most Common Errors (Top 5)</h4>
                    {allErrors.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm text-orange-900 space-y-1">
                            {allErrors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500 italic">No errors logged yet.</p>
                    )}
                 </div>
                 <div className="md:col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl shadow-sm border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-3 flex items-center"><i className="fas fa-brain mr-2"></i> Aggregated Learning Habits & Facts</h4>
                    <div className="flex flex-wrap gap-2">
                        {allFacts.length > 0 ? allFacts.map((fact, i) => (
                            <span key={i} className="px-3 py-1 bg-white border border-blue-200 text-blue-800 text-sm rounded-full shadow-sm">
                                {fact}
                            </span>
                        )) : (
                            <p className="text-sm text-gray-500 italic">No consistent facts extracted yet.</p>
                        )}
                    </div>
                 </div>
             </div>
         </div>
     )
  };

  return (
    <SectionCard title="Learner Session Analysis" icon={<i className="fas fa-chart-line"></i>}>
      <div className="space-y-6 animate-fade-in">
        <p className="text-sm text-gray-600">Analyze raw session JSON summaries or evaluate learner transcribed voice messages. Copy the tailored AI instruction prompt, generate analysis, and save results to earn XP!</p>
        
        {/* Toggle Mode Selectors */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-md shadow-sm">
          <button
            onClick={() => setActiveInputMode('session')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeInputMode === 'session' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <i className="fas fa-file-invoice"></i> Session Report Mode
          </button>
          <button
            onClick={() => setActiveInputMode('voice')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeInputMode === 'voice' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <i className="fas fa-microphone"></i> Paste Voice Message
          </button>
        </div>

        {activeInputMode === 'session' ? (
          <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200 shadow-inner">
            <div>
                <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">1</span>
                  Paste Session Report
                </h5>
                <div className="flex gap-2">
                    <textarea
                    className="flex-grow p-3 border border-gray-300 rounded-lg text-xs font-mono h-24 resize-y shadow-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Paste the raw session report JSON here..."
                    value={jsonInput}
                    onChange={(e) => {
                        setJsonInput(e.target.value);
                        tryParse(e.target.value);
                    }}
                    />
                    <button 
                      onClick={handleCopyPrompt} 
                      disabled={!parsedData}
                      className={`px-4 rounded-lg font-bold shadow transition-all ${parsedData ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      {copied ? <span><i className="fas fa-check"></i> Copied</span> : <span><i className="fas fa-magic"></i> Copy AI Prompt</span>}
                    </button>
                </div>
                
                {parsedData && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 grid grid-cols-4 gap-2">
                     <div><strong>Time:</strong> {Math.ceil((parsedData.durationSeconds || 0) / 60)}m</div>
                     <div><strong>XP:</strong> {parsedData.xp || 0}</div>
                     <div><strong>Errors:</strong> {parsedData.incorrectAnswers?.length || 0}</div>
                     <div><strong>Essays:</strong> {Object.keys(parsedData.essayAnswers || {}).length}</div>
                  </div>
                )}
            </div>

            {parsedData && (
                <div className="pt-4 border-t border-gray-200">
                    <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">2</span>
                      Paste AI Analysis JSON
                    </h5>
                    <textarea
                    className="w-full p-3 border border-indigo-300 rounded-lg text-xs font-mono h-24 resize-y shadow-sm focus:ring-2 focus:ring-indigo-500 bg-indigo-50"
                    placeholder='Paste the output JSON from AI here...'
                    value={aiAnalysisJSON}
                    onChange={(e) => setAiAnalysisJSON(e.target.value)}
                    />
                    <button 
                      onClick={handleSubmitAnalysis} 
                      disabled={!aiAnalysisJSON.trim()}
                      className="mt-2 w-full bg-green-600 text-white font-bold py-2 rounded shadow hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-chart-pie mr-2"></i> Submit & Visualize Analysis
                    </button>
                </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 bg-purple-50/20 p-4 rounded-xl border border-purple-200 shadow-inner">
            <div>
                <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">1</span>
                  Paste Transcribed Learner Voice Message
                </h5>
                <p className="text-xs text-slate-500 mb-2">Transcribe or paste the raw student speech recording transcript below. Copy the highly specialized spoken English analyzer prompt.</p>
                <div className="flex gap-2">
                    <textarea
                    className="flex-grow p-3 border border-gray-300 rounded-lg text-xs h-24 resize-y shadow-sm focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="Example: I was go to super market yesterday and i has forgot my keys..."
                    value={voiceTranscript}
                    onChange={(e) => setVoiceTranscript(e.target.value)}
                    />
                    <button 
                      onClick={handleCopyVoicePrompt} 
                      disabled={!voiceTranscript.trim()}
                      className={`px-4 rounded-lg font-bold shadow transition-all ${voiceTranscript.trim() ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      {copiedVoice ? <span><i className="fas fa-check"></i> Copied</span> : <span><i className="fas fa-wand-magic-sparkles"></i> Copy AI Prompt</span>}
                    </button>
                </div>
            </div>

            {voiceTranscript.trim() && (
                <div className="pt-4 border-t border-purple-100">
                    <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">2</span>
                      Paste Voice AI Analysis JSON
                    </h5>
                    <textarea
                    className="w-full p-3 border border-purple-300 rounded-lg text-xs font-mono h-24 resize-y shadow-sm focus:ring-2 focus:ring-purple-500 bg-purple-50/50"
                    placeholder='Paste the custom multi-register JSON from AI here...'
                    value={voiceAiAnalysisJSON}
                    onChange={(e) => setVoiceAiAnalysisJSON(e.target.value)}
                    />
                    <button 
                      onClick={handleSubmitVoiceAnalysis} 
                      disabled={!voiceAiAnalysisJSON.trim()}
                      className="mt-2 w-full bg-indigo-600 text-white font-bold py-2 rounded shadow hover:bg-indigo-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-check-double mr-2"></i> Submit & Log Spoken Analysis
                    </button>
                </div>
            )}
          </div>
        )}

        {visualizedData.length > 0 && (
            <div className="mt-6 space-y-4">
                <h3 className="text-lg font-black text-indigo-900 border-b pb-2">Activity Analysis</h3>
                
                {visualizedData.map((data, idx) => (
                    <details key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 group mb-4" open={idx === 0}>
                        <summary className="font-bold text-gray-800 p-4 cursor-pointer hover:bg-gray-50 text-sm flex justify-between items-center outline-none select-none rounded-xl group-open:rounded-b-none transition-colors">
                            <span className="tracking-wide flex items-center gap-2">
                                <i className="fas fa-history text-indigo-500"></i> 
                                <span className="font-semibold text-gray-800">{formatLoggedDateAndElapsed(data.date)}</span>
                            </span>
                            <div className="flex items-center gap-3">
                                {data.analysisType === 'voice_message' ? (
                                    <span className="bg-purple-100 text-purple-800 text-[11px] font-black px-2.5 py-1 rounded-full border border-purple-200 flex items-center gap-1 shadow-sm">
                                        <i className="fas fa-microphone"></i> Voice message
                                    </span>
                                ) : (
                                    <span className="bg-blue-100 text-blue-800 text-[11px] font-black px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1 shadow-sm">
                                        <i className="fas fa-file-invoice"></i> Session report
                                    </span>
                                )}
                                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-black flex items-center gap-1 shadow-sm">
                                    <i className="fas fa-bolt text-amber-500"></i> +{data.xpEarned || data.xp || 50} XP
                                </span>
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (confirm("Are you sure you want to delete this analysis?")) {
                                            const updatedAnalysis = (learner.sessionAnalysis || []).filter((_, i) => i !== idx);
                                            updateLearner({
                                                ...learner,
                                                sessionAnalysis: updatedAnalysis
                                            });
                                        }
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-slate-100 transition flex items-center justify-center w-8 h-8 focus:outline-none"
                                    title="Delete this analysis"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                </button>
                                <i className="fas fa-chevron-down text-gray-400 group-open:rotate-180 transition-transform"></i>
                            </div>
                        </summary>
                        <div className="p-5 border-t border-gray-100 bg-gray-50/30">
                            {data.analysisType === 'voice_message' ? (
                                <div className="space-y-6">
                                    {/* Original vs Corrected Text */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm">
                                            <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <i className="fas fa-microphone text-slate-400"></i> Original Voice Transcript
                                            </h5>
                                            <div className="text-xs text-slate-800 font-semibold leading-relaxed whitespace-pre-wrap">
                                                {data.originalTranscript || "No original transcript available."}
                                            </div>
                                        </div>
                                        <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-xl shadow-sm">
                                            <h5 className="font-bold text-emerald-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <i className="fas fa-wand-magic-sparkles text-emerald-500"></i> Spoken Grammar Correction
                                            </h5>
                                            <div 
                                                className="text-xs text-slate-800 leading-relaxed font-semibold"
                                                dangerouslySetInnerHTML={{ __html: data.correctedHtml || "No corrections provided." }}
                                            />
                                        </div>
                                    </div>

                                    {/* Multi-Register Speech Transformations */}
                                    <div>
                                        <h4 className="text-xs font-black text-indigo-950 mb-3 flex items-center gap-2 uppercase tracking-wider">
                                            <i className="fas fa-shuffle text-indigo-500"></i> Spoken Register Alternatives & Slang
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {/* Say It Better */}
                                            <div className="bg-teal-50/50 border border-teal-100 p-4 rounded-xl shadow-sm hover:border-teal-200 transition-colors flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1 gap-2">
                                                        <h5 className="font-black text-teal-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                            <i className="fas fa-face-laugh-beam text-teal-500"></i> Say It Better
                                                        </h5>
                                                        <button
                                                            onClick={() => copyCardToClipboard(`${idx}-better`, 'Say It Better', data.sayItBetter, 'teal')}
                                                            className="text-[11px] font-bold text-teal-700 bg-teal-100/90 hover:bg-teal-200 active:scale-95 transition-all px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                                                            title="Copy formatted text to clipboard"
                                                        >
                                                            {copiedCardKey === `${idx}-better` ? (
                                                                <>
                                                                    <i className="fas fa-check text-emerald-600"></i>
                                                                    <span className="text-emerald-700">Copied!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-copy"></i>
                                                                    <span>Copy</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-teal-800 font-bold mb-2">Natural & Fluent Conversational</p>
                                                    <div 
                                                        className="text-xs text-slate-800 font-medium bg-white p-2.5 rounded-lg border border-teal-50 shadow-inner leading-relaxed"
                                                        dangerouslySetInnerHTML={{ __html: formatRegisterHtml(data.sayItBetter, 'teal') }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Say It Formally */}
                                            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl shadow-sm hover:border-blue-200 transition-colors flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1 gap-2">
                                                        <h5 className="font-black text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                            <i className="fas fa-briefcase text-blue-500"></i> Corporate / Formal
                                                        </h5>
                                                        <button
                                                            onClick={() => copyCardToClipboard(`${idx}-formal`, 'Corporate / Formal', data.sayItFormally, 'blue')}
                                                            className="text-[11px] font-bold text-blue-700 bg-blue-100/90 hover:bg-blue-200 active:scale-95 transition-all px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                                                            title="Copy formatted text to clipboard"
                                                        >
                                                            {copiedCardKey === `${idx}-formal` ? (
                                                                <>
                                                                    <i className="fas fa-check text-emerald-600"></i>
                                                                    <span className="text-emerald-700">Copied!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-copy"></i>
                                                                    <span>Copy</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-blue-800 font-bold mb-2">Polite & High Register Standard</p>
                                                    <div 
                                                        className="text-xs text-slate-800 font-medium bg-white p-2.5 rounded-lg border border-blue-50 shadow-inner leading-relaxed"
                                                        dangerouslySetInnerHTML={{ __html: formatRegisterHtml(data.sayItFormally, 'blue') }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Say It Casually */}
                                            <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl shadow-sm hover:border-purple-200 transition-colors flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1 gap-2">
                                                        <h5 className="font-black text-purple-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                            <i className="fas fa-comments text-purple-500"></i> Everyday Casual
                                                        </h5>
                                                        <button
                                                            onClick={() => copyCardToClipboard(`${idx}-casual`, 'Everyday Casual', data.sayItCasually, 'purple')}
                                                            className="text-[11px] font-bold text-purple-700 bg-purple-100/90 hover:bg-purple-200 active:scale-95 transition-all px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                                                            title="Copy formatted text to clipboard"
                                                        >
                                                            {copiedCardKey === `${idx}-casual` ? (
                                                                <>
                                                                    <i className="fas fa-check text-emerald-600"></i>
                                                                    <span className="text-emerald-700">Copied!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-copy"></i>
                                                                    <span>Copy</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-purple-800 font-bold mb-2">Daily Speech & Contractions</p>
                                                    <div 
                                                        className="text-xs text-slate-800 font-medium bg-white p-2.5 rounded-lg border border-purple-50 shadow-inner leading-relaxed"
                                                        dangerouslySetInnerHTML={{ __html: formatRegisterHtml(data.sayItCasually, 'purple') }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Street Talk */}
                                            <div className="bg-neutral-50/80 border border-neutral-200 p-4 rounded-xl shadow-sm hover:border-neutral-300 transition-colors flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1 gap-2">
                                                        <h5 className="font-black text-neutral-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                            <i className="fas fa-road text-neutral-600"></i> Street Talk & Slang
                                                        </h5>
                                                        <button
                                                            onClick={() => copyCardToClipboard(`${idx}-street`, 'Street Talk & Slang', data.streetTalk, 'slate')}
                                                            className="text-[11px] font-bold text-slate-700 bg-slate-200/90 hover:bg-slate-300 active:scale-95 transition-all px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                                                            title="Copy formatted text to clipboard"
                                                        >
                                                            {copiedCardKey === `${idx}-street` ? (
                                                                <>
                                                                    <i className="fas fa-check text-emerald-600"></i>
                                                                    <span className="text-emerald-700">Copied!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-copy"></i>
                                                                    <span>Copy</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-neutral-700 font-bold mb-2">Colloquialisms & Spoken Fillers</p>
                                                    <div 
                                                        className="text-xs text-slate-800 font-medium bg-white p-2.5 rounded-lg border border-neutral-100 shadow-inner leading-relaxed font-mono"
                                                        dangerouslySetInnerHTML={{ __html: formatRegisterHtml(data.streetTalk, 'slate') }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Obscenities & Swears */}
                                            <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl shadow-sm xl:col-span-2 hover:border-rose-200 transition-colors flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1 gap-2">
                                                        <h5 className="font-black text-rose-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                            <i className="fas fa-skull-crossbones text-rose-500 animate-pulse"></i> Edgy Speech & Swear Emphasis
                                                        </h5>
                                                        <button
                                                            onClick={() => copyCardToClipboard(`${idx}-edgy`, 'Edgy Speech & Swear Emphasis', data.obscenitiesExplanation, 'rose')}
                                                            className="text-[11px] font-bold text-rose-800 bg-rose-100/90 hover:bg-rose-200 active:scale-95 transition-all px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                                                            title="Copy formatted text to clipboard"
                                                        >
                                                            {copiedCardKey === `${idx}-edgy` ? (
                                                                <>
                                                                    <i className="fas fa-check text-emerald-600"></i>
                                                                    <span className="text-emerald-700">Copied!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-copy"></i>
                                                                    <span>Copy</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-rose-800 font-bold mb-2">Expressiveness & Vulgarity Context Guide</p>
                                                    <div 
                                                        className="text-xs text-slate-800 font-medium bg-white p-2.5 rounded-lg border border-rose-100 shadow-inner leading-relaxed"
                                                        dangerouslySetInnerHTML={{ __html: formatRegisterHtml(data.obscenitiesExplanation, 'rose') }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Strengths, Weaknesses, Recycled Errors, Facts */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="bg-emerald-50/20 border border-emerald-100 p-4 rounded-xl shadow-sm">
                                            <h5 className="font-bold text-emerald-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <i className="fas fa-arrow-trend-up text-emerald-500"></i> Speech Strengths
                                            </h5>
                                            <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1 font-semibold">
                                                {(data.strengths || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-rose-50/20 border border-rose-100 p-4 rounded-xl shadow-sm">
                                            <h5 className="font-bold text-rose-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <i className="fas fa-arrow-trend-down text-rose-500"></i> Speech Weaknesses
                                            </h5>
                                            <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1 font-semibold">
                                                {(data.weaknesses || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-orange-50/20 border border-orange-100 p-4 rounded-xl shadow-sm">
                                            <h5 className="font-bold text-orange-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <i className="fas fa-triangle-exclamation text-orange-500"></i> Recycled Speech Errors
                                            </h5>
                                            <ul className="list-disc pl-5 text-xs text-orange-900 space-y-1 font-semibold">
                                                {(data.recycledErrors || []).map((e: string, i: number) => <li key={i}>{e}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-yellow-50/20 border border-yellow-100 p-4 rounded-xl shadow-sm font-semibold">
                                            <h5 className="font-bold text-yellow-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <i className="fas fa-lightbulb text-yellow-500"></i> Extracted Facts
                                            </h5>
                                            <ul className="list-disc pl-5 text-xs text-yellow-950 space-y-1">
                                                {(data.learnerFactsExtracted || data.factsExtracted || []).map((f: string, i: number) => <li key={i}>{f}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        {/* Strengths & Weaknesses */}
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h4 className="font-bold text-green-700 flex items-center gap-2"><i className="fas fa-arrow-trend-up"></i> Strengths</h4>
                                                <ul className="list-disc pl-5 text-sm text-gray-700 mt-1">
                                                    {(data.strengths || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-red-600 flex items-center gap-2"><i className="fas fa-arrow-trend-down"></i> Weaknesses</h4>
                                                <ul className="list-disc pl-5 text-sm text-gray-700 mt-1">
                                                    {(data.weaknesses || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Habit Heatmap & Tracking */}
                                        <div className="flex-1 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                            <h4 className="font-bold text-slate-800 mb-2"><i className="fas fa-fire"></i> Habit & Flow Analysis</h4>
                                            <div className="text-sm text-slate-700 max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{__html: data.habitAnalysisHtml || 'No visual heatmap data provided.'}}></div>
                                        </div>
                                    </div>

                                    {/* Essay Detailed Feedback */}
                                    {data.essayFeedbackHtml && (
                                        <div id={`essay-feedback-container-${idx}`} className="mt-5 bg-indigo-50 p-4 rounded-lg border border-indigo-100 shadow-sm">
                                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 text-sm">
                                                    <i className="fas fa-highlighter text-indigo-600"></i> Essay Type Feedback
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => copyEssayFeedbackToClipboard(`${idx}-essay`, data.essayFeedbackHtml)}
                                                        className="text-[11px] font-bold text-indigo-800 bg-indigo-100/90 hover:bg-indigo-200 active:scale-95 transition-all px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                                                        title="Copy formatted text to clipboard"
                                                    >
                                                        {copiedCardKey === `${idx}-essay` ? (
                                                            <>
                                                                <i className="fas fa-check text-emerald-600"></i>
                                                                <span className="text-emerald-700">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fas fa-copy"></i>
                                                                <span>Copy</span>
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => captureEssayFeedbackScreenshot(`essay-feedback-container-${idx}`, `${idx}-essay-shot`)}
                                                        disabled={screenshottingKey === `${idx}-essay-shot`}
                                                        className="text-[11px] font-bold text-indigo-800 bg-indigo-100/90 hover:bg-indigo-200 active:scale-95 transition-all px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
                                                        title="Capture screenshot of written assignment feedback"
                                                    >
                                                        {screenshottingKey === `${idx}-essay-shot` ? (
                                                            <>
                                                                <i className="fas fa-spinner fa-spin text-indigo-600"></i>
                                                                <span>Capturing...</span>
                                                            </>
                                                        ) : capturedKey === `${idx}-essay-shot` ? (
                                                            <>
                                                                <i className="fas fa-check text-emerald-600"></i>
                                                                <span className="text-emerald-700">Captured!</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fas fa-camera text-indigo-600"></i>
                                                                <span>Screenshot</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="text-sm text-indigo-950 prose prose-sm max-w-none bg-white p-3.5 rounded-lg border border-indigo-100 shadow-2xs leading-relaxed" dangerouslySetInnerHTML={{__html: data.essayFeedbackHtml}}></div>
                                        </div>
                                    )}

                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                            <h4 className="font-bold text-yellow-800 text-xs uppercase tracking-wider mb-2">New Facts Extracted</h4>
                                            <ul className="text-sm list-disc pl-4 text-yellow-900 space-y-1">
                                                {(data.learnerFactsExtracted || []).map((f: string, i: number) => <li key={i}>{f}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                            <h4 className="font-bold text-orange-800 text-xs uppercase tracking-wider mb-2">Recycled Errors to Practice</h4>
                                            <ul className="text-sm list-disc pl-4 text-orange-900 space-y-1">
                                                {(data.recycledErrors || []).map((e: string, i: number) => <li key={i}>{e}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </details>
                ))}
                
                {renderAggregatedHeatmap()}
            </div>
        )}
      </div>
    </SectionCard>
  );
};
