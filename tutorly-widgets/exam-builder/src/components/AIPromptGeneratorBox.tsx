import React, { useState } from 'react';
import { ExamConfigParams, ProctoringRules, LearnerProfile } from '../types';
import { NATIVE_TYPES, TYPE_ALIASES, UNSUPPORTED_TYPES } from '../questionTypeRegistry';
import { Copy, Check, MessageSquare, ExternalLink, HelpCircle } from 'lucide-react';

interface AIPromptGeneratorBoxProps {
  config: ExamConfigParams;
  proctoring: ProctoringRules;
  learner: LearnerProfile;
}

export const AIPromptGeneratorBox: React.FC<AIPromptGeneratorBoxProps> = ({
  config,
  proctoring,
  learner,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Compute active question types and editable task blueprints.
  const activeFrameworks = config.taskFrameworks.filter((framework) => framework.enabled);
  const activeTypes = activeFrameworks.map((framework) => framework.questionType);

  const sampleSchemaExample = {
    metadata: {
      title: "Generated Assessment Title",
      language: "en-US",
      examFamily: config.selectedTestName,
      testInfo: config.selectedTestInfo,
      examInstances: config.examInstances,
      adaptiveFlag: config.adaptiveMode,
      practiceModeFlag: config.practiceMode,
      timeLimitMinutes: config.defaultTimerMinutes,
      timerMode: config.timerMode,
      passingScorePercent: config.passingScorePercent,
      tutorEmail: learner.tutorEmail || "instructor@domain.edu",
      shuffleQuestions: config.questionRandomisation,
      taskBlueprints: activeFrameworks,
      voiceSettings: config.voiceSettings,
      branding: config.branding,
      peerJsEnabled: false,
      peerJsRoomId: "",
      environmentVariables: config.selectedTestEnvironment
    },
    proctoring: {
      webcamRequired: config.practiceMode ? false : proctoring.webcamRequired,
      webcamCheckFrequencySeconds: 5,
      maxWarnings: config.practiceMode ? 99 : proctoring.maxWarnings,
      tabSwitchPenalty: config.practiceMode ? false : proctoring.tabSwitchPenalty,
      pauseTimerOnWarning: proctoring.pauseTimerOnWarning,
      enforceFullscreen: config.practiceMode ? false : proctoring.enforceFullscreen
    },
    sections: [
      {
        id: "sec-1",
        title: "Section 1 Title",
        description: "Focus areas instructions",
        instructions: "Candidate-facing instructions. If voiceSettings.readInstructions is true, this text should be read aloud.",
        timeLimitMinutes: Math.ceil(config.defaultTimerMinutes / 2),
        listeningActivities: [
          {
            id: "audio-1",
            title: "Listening passage title",
            mode: "dialogue",
            transcript: "Full transcript for fallback accessibility.",
            voiceLanguage: "en-GB",
            accent: "British",
            cast: { Tutor: "male-gb", Student: "female-us", Child: "child-gb" },
            lines: [
              { speaker: "Tutor", text: "Dialogue line one.", gender: "male", accent: "British", voiceLanguage: "en-GB" },
              { speaker: "Student", text: "Dialogue line two.", gender: "female", accent: "American", voiceLanguage: "en-US" },
              { speaker: "Child", text: "Dialogue line three.", gender: "child", accent: "British", voiceLanguage: "en-GB" }
            ]
          }
        ],
        questions: [
          {
            id: "q-1",
            type: activeTypes[0] || "multipleChoice",
            text: "Question text string prompt goes here?",
            scoringWeight: 10,
            difficultyLevel: "medium",
            options: [
              { id: "opt-1", text: "Option A text" },
              { id: "opt-2", text: "Option B text" }
            ],
            correctAnswers: ["opt-1"],
            strategyTips: "Examine scope keywords carefully.",
            explanation: "Reference explanation details.",
            feedbackDetail: "Detailed practice mode feedback that can be read aloud using natural browser voices."
          },
          {
            id: "notes-1",
            type: "noteCompletion",
            text: "Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.",
            scoringWeight: 8,
            templateHtml: "<h4>Student Services - orientation briefing</h4><ul><li>Opening hours change from 1 September to {{n1}} on weekdays.</li><li>Appointments must be booked at least {{n2}} hours in advance.</li><li>Bring photographic identification and a copy of your {{n3}} letter.</li></ul>",
            blanks: [
              { id: "n1", correct: ["8am", "8 am", "eight"], maxLength: 8 },
              { id: "n2", correct: ["24", "twenty-four"], maxLength: 12 },
              { id: "n3", correct: ["offer", "admission"], maxLength: 12 }
            ],
            strategyTips: "The notes follow the order of the recording.",
            explanation: "One word or number per gap; each gap is marked separately."
          },
          {
            id: "words-1",
            type: "completeWords",
            text: "Complete the words in the passage. Type the missing letters of each incomplete word.",
            scoringWeight: 8,
            templateHtml: "The earliest public libraries were not free to enter. Most charged a subscription, which effect____ excluded poorer readers, and the model sp____ across the industrial cities.",
            blanks: [
              { id: "w1", kind: "partial", stem: "effect", tail: "ly", correct: ["ively"], maxLength: 8 },
              { id: "w2", kind: "partial", stem: "sp", tail: "", correct: ["read"], maxLength: 8 }
            ],
            strategyTips: "Work out the whole word from the sentence, then type only the missing letters."
          },
          {
            id: "speaking-1",
            type: "speaking",
            text: "Record a spoken answer to the prompt.",
            instructions: "Speak for 45 to 90 seconds. Your browser will save local audio for download on the result page.",
            scoringWeight: 20,
            maxRecordingSeconds: 90,
            strategyTips: "State your answer, give two reasons, and conclude.",
            feedbackDetail: "Detailed speaking feedback rubric in practice mode."
          }
        ]
      }
    ],
    adaptiveLogic: {
      enabled: config.adaptiveMode,
      rulesDescription: "If section 1 accuracy exceeds 70%, route harder module variants.",
      difficultyProgression: [
        { thresholdCorrectPercent: 70, nextDifficulty: "hard" },
        { thresholdCorrectPercent: 0, nextDifficulty: "medium" }
      ]
    }
  };

  const generatedPromptText = `You are an expert curriculum developer and high-stakes examination architect.

INSTRUCTIONS:
1. First, ASK ME for the Lesson Content, target Topic, official test version, target learner level, and any special institution rules. Wait for my reply before generating the document.
2. Before writing the JSON, search or reason from current, up-to-date public standards for the selected test family. Use realistic timing, task formats, item density, scoring scale and learner-facing wording. Avoid claiming exact official content.
3. Once provided, produce a complete, flawless JSON object describing a rigorous examination structured according to the parameters below.
4. Output ONLY the valid JSON block enclosed in \`\`\`json blocks so it can be extracted automatically. Do not append loose chat greetings.

EXAMINATION PARAMETERS:
- AI Generation Mode: "${config.aiGenerationMode === 'lessonText' ? 'LESSON TEXT — First ask for lesson content then generate from it.' : config.aiGenerationMode === 'mockTest' ? 'MOCK TEST — Create realistic mock exams with official-style accuracy and up-to-date standards.' : 'REAL TEST + TRANSCRIPT — Use the exact exam content and audio transcripts provided below to build a perfect JSON.'}"
${config.aiGenerationMode === 'realTestTranscript' && config.aiModeUserContent.trim() ? `- CANDIDATE PROVIDED EXAM CONTENT & TRANSCRIPTS:\n${config.aiModeUserContent}\n` : ''}
${config.aiGenerationMode === 'lessonText' && config.aiModeUserContent.trim() ? `- CANDIDATE PROVIDED LESSON TOPIC:\n${config.aiModeUserContent}\n` : ''}
- Selected International Test / Custom Exam: "${config.selectedTestName || 'Custom Exam'}"
- Test Information / Standards Notes: "${config.selectedTestInfo || 'User-defined exam.'}"
- Complete Exam Instances To Generate: ${config.examInstances}. Create ${config.examInstances} complete version(s) or full test forms. Use unique section IDs and question IDs per instance.
- Environment Variables: ${JSON.stringify(config.selectedTestEnvironment, null, 2)}
- Candidate Target Context: "${learner.context || 'General Accreditation'}"
- Candidate Name Reference: "${learner.name || 'Student'}"
- Target Passing Score: ${config.passingScorePercent}%
- Timing Setting: ${config.defaultTimerMinutes} minutes total. Mode: "${config.timerMode}".
- Allowed Core Question Types: ${Array.from(new Set(activeTypes)).join(', ') || 'multipleChoice, essay'}.
- Editable Task Blueprints: ${JSON.stringify(activeFrameworks, null, 2)}

HARD CONSTRAINT - RENDERABLE QUESTION TYPES ONLY:
The standalone runtime renders EXACTLY these ten \`type\` values and no others.
${NATIVE_TYPES.map((t) => '  · ' + t).join('\n')}

Every one of the 2026 source tasks below MUST therefore be expressed as one of the ten
types above; the importer rewrites the name automatically and tells the operator what the
adaptation loses. Prefer the mapped form directly so nothing is lost silently:
${Object.entries(TYPE_ALIASES).map(([from, alias]) => '  · ' + from + ' -> ' + alias.to + ' (' + alias.note + ')').join('\n')}

These tasks have NO faithful reduction in this build. Do NOT emit them - the importer
blocks compilation:
${Object.entries(UNSUPPORTED_TYPES).map(([type, reason]) => '  · ' + type + ' (' + reason + ')').join('\n')}

When the requested paper needs a blocked task, choose the nearest renderable type and say
so explicitly in that question's instructions and feedbackDetail fields (for example, render
an IELTS map-labelling item as multipleChoice whose options are the map labels, and state in
the instructions that the labels are listed as text).
- Adaptive Branching: ${config.adaptiveMode ? 'ENABLED. Create sequential sections with varying difficulty thresholds based on correctness.' : 'DISABLED.'}
- Practice Mode Status: ${config.practiceMode ? 'ENABLED. Provide strategyTips and explanation properties for immediate candidate correction routines.' : 'DISABLED. Enforce strict assessment standards.'}
- Natural Voice Read Aloud: ${config.voiceSettings.enabled ? 'ENABLED. Include section.instructions, listeningActivities, dialogue speaker lines, voiceName/voiceLanguage hints, audioText, and feedbackDetail suitable for speechSynthesis.' : 'DISABLED unless required by listening tasks.'}

PROCTORING STRICTNESS CONFIGURATION:
- Webcam Check Required: ${config.practiceMode ? 'false' : proctoring.webcamRequired}
- Max Interruption Strikes Allowed: ${config.practiceMode ? '99' : proctoring.maxWarnings}
- Enforcement flags: Tab switch penalties = ${config.practiceMode ? 'false' : proctoring.tabSwitchPenalty}, Fullscreen takeover = ${config.practiceMode ? 'false' : proctoring.enforceFullscreen}.

SPEAKING, WRITING AND LISTENING REQUIREMENTS:
- For speaking tasks, use type "speaking", include maxRecordingSeconds and a clear prompt. The standalone system will record audio locally and provide download links on results.
- For writing/essay tasks, include detailed rubrics in strategyTips and feedbackDetail. The standalone result email body must include written responses where possible.
- For listening tasks, include section.listeningActivities. Use mode "monologue" or "dialogue". For dialogues, add lines with speaker names and text. Add voiceLanguage hints where appropriate.
- For practice mode, every question must include strategyTips, explanation and feedbackDetail. Feedback must be suitable for natural voice read-aloud.

STIMULUS RULES - A PROMPT THAT PROMISES SOMETHING MUST DELIVER IT:
The importer REFUSES to compile a paper when a task says "complete the notes below" and
carries no notes, so follow these rules for every affected type:
- All completion types (noteCompletion, tableCompletion, summaryCompletion,
sentenceCompletion, gapFill, completeWords) MUST include BOTH:
    templateHtml - the real stimulus, with one {{blankId}} placeholder per gap; and
    blanks        - one entry per placeholder, each with the SAME id and its accepted
                    answers, e.g. { id: "n1", correct: ["8am", "8 am"], maxLength: 8 }.
  Never emit a completion task whose templateHtml is empty, and never leave a placeholder
  without a matching blank. Use a real <table> for tableCompletion, and <ul>/<li> lists for
  noteCompletion. Do not write "Notes:" and stop.
- completeWords (TOEFL iBT 2026 Complete the Words) MUST give each blank a partial word:
  kind "partial", the visible leading letters in stem, any visible trailing letters in tail,
  and the MISSING letters only as the accepted answer, e.g. stem "effect", tail "ly",
  correct ["ively"].
- multipleChoice, multipleSelect and listening items MUST include at least two options and
  a correctAnswers array naming existing option ids.
- matching items MUST include at least two matchingPairs with both sides filled in.
- ordering items MUST include at least two options and a correctAnswers array that is a
  permutation of those option ids.
- Any prompt referring to a passage or a recording MUST carry readingPassage, audioText or
  templateHtml on the item itself. A reading section MUST also list its passage in
  section.readingPassages so the split-pane renders.

MULTI-CHARACTER AUDIO:
- Every dialogue MUST be multi-speaker and MUST be cast, so each character is read by a
  different installed voice. Give the activity a cast map (character -> persona) and give
  each line a gender and an accent. Persona keys are:
  female-us, male-us, female-gb, male-gb, female-au, male-au, female-ca, male-ca,
  female-in, male-in, female-ie, male-ie, female-nz, male-nz, female-za, male-za,
  plus the pitch-based 'child-gb', 'child-us', 'child-au' and 'elder'.
  Note honestly: no Windows or Edge voice is a real child voice, so 'child-*' personas use
  a bright voice at a raised pitch. Do not promise a specific brand of voice; the runtime
  matches whatever natural voices the candidate's machine actually has and falls back cleanly.

REQUIRED JSON SCHEMA STRUCTURE:
Your generated JSON MUST follow this interface perfectly:
\`\`\`json
${JSON.stringify(sampleSchemaExample, null, 2)}
\`\`\`

Ensure multiple question entries are populated per section (at least 3 to 5 questions per section) to allow robust evaluation metrics. Ensure matching or ordering properties are fully populated if those types are generated. Provide clear answer arrays corresponding to unique option IDs.`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPromptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl shadow-lg p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-700/80 pb-4">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-800 uppercase tracking-wider block w-fit mb-1">
            Stage 4: Generative Link
          </span>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            AI Prompt for ChatGPT / Claude
          </h2>
          <p className="text-xs text-slate-400">
            Copy this customized instruction block into your desired external language model interface.
          </p>
        </div>

        <button
          type="button"
          onClick={copyToClipboard}
          className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition-all ${
            copied
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Prompt Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Complete Prompt
            </>
          )}
        </button>
      </div>

      <div className="relative group">
        <textarea
          readOnly
          value={generatedPromptText}
          rows={10}
          className="w-full text-xs font-mono bg-slate-950/80 text-slate-300 p-4 rounded-lg border border-slate-700 focus:outline-none resize-none leading-relaxed selection:bg-indigo-900"
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          title="Click to highlight whole prompt string"
        />
        <div className="absolute bottom-3 right-3 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900/90 text-[10px] px-2 py-1 rounded text-slate-400">
          💡 Auto-updates as you change parameters above
        </div>
      </div>

      <div className="text-xs text-slate-400 bg-slate-900/40 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-slate-300 font-medium block">How to use this text block:</strong>
          <ol className="list-decimal pl-4 space-y-1 text-slate-400">
            <li>Click the <strong className="text-slate-300">Copy Complete Prompt</strong> button.</li>
            <li>Open <a href="https://chat.openai.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">ChatGPT <ExternalLink className="w-2.5 h-2.5" /></a> or similar interfaces and paste the instructions.</li>
            <li>The AI will ask you for your content topic (e.g. <em>"Please provide your target test topic"</em>).</li>
            <li>Reply with your content (e.g. <em>"Advanced JavaScript Promises and Microtasks"</em>).</li>
            <li>Copy the returned JSON block and paste it into the validator view below!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
