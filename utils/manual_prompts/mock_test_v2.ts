import type { LearnerProfile } from '../../types';
import { EXAM_PROFILE_V2_LABELS, EXAM_PROFILE_V2_TASK_TYPE_MATRIX, resolveExamV2TaskType } from './mock_test_v2_matrix';

export const getMockTestV2Prompt = (learner: LearnerProfile, config?: any): string => {
    const targetLang = learner.targetLanguage || 'English';
    const l1Lang = learner.l1Language || 'English';
    const cefrLevel = learner.cefrLevel || 'B2';
    const profileCtx = `
    --- LANGUAGE SIMPLIFICATION (CRITICAL & NON-NEGOTIABLE) ---
    You MUST simplify the language and vocabulary used in instructions, questions, and passages to align with the learner's CEFR level of **${cefrLevel}** (or one level below if necessary for absolute clarity). Your primary goal is to ensure the exam is accessible to their level, but it MUST remain realistic and faithful to a real-world examination in its style, tasks, and rigor.
    
    --- TARGET LANGUAGE SETTING ---
    The learner is taking an exam in: **${targetLang}** (L2) and their native/speaking language is **${l1Lang}** (L1).
    All primary content (passages, questions, options, instructions) MUST be generated in the target language **${targetLang}**. Whenever you provide translations, definitions, or bilingual support for words/sentences, you MUST translate them into the learner's native language, **${l1Lang}**. 
    DO NOT GENERATE CONTENT IN ANY OTHER LANGUAGE. The exam is strictly testing ${targetLang} and using ${l1Lang} to support them when translations are needed.
    
    --- NO HYPER-PERSONALIZATION ---
    DO NOT use the learner's personal details (such as name, interests, job, or city/country) inside the exam content. The exam MUST be realistic, standardized, and professional, just like a real-world official exam. Do NOT customize the questions or passages with landmarks from their city or details from their profile.
    `;

    // fallback if no config is supplied
    const profile = config?.examProfile || 'ielts_academic_paper_2026';
    const examLabel = EXAM_PROFILE_V2_LABELS[profile] || profile;
    const duration = config?.totalDurationMinutes || 30;
    const delivery = config?.deliveryMode === 'paper_transition' ? 'paper' : 'computer';

    // Merged over the defaults, so a partial settings object can never print `undefined` into
    // the prompt (see mock_test.ts for the same guard on the V1 prompt).
    const proctoring = {
        preventFocusLoss: false,
        maxFocusLossWarnings: 3,
        preventClipboardActions: false,
        preventContextMenu: false,
        preventProtectedSelection: false,
        requireHardwareChecks: false,
        ...(config?.proctoring || {})
    };

    const accessibility = {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        captions: true,
        ...(config?.accessibility || {})
    };

    const rawTasks = config?.taskSettings || {};
    
    // Filter out visual/image-dependent task types because there is no picture/map/diagram generation
    const forbiddenVisualKeywords = [
        'map', 'diagram', 'chart', 'visual', 'hotspot', 'photo', 'image', 'picture'
    ];
    const validTaskIds = (EXAM_PROFILE_V2_TASK_TYPE_MATRIX[profile] || []).filter(id => {
        return !forbiddenVisualKeywords.some(kw => id.toLowerCase().includes(kw));
    });
    
    // Filter down to enabled tasks for the selected profile
    const enabledTasks = validTaskIds
        .map(taskId => {
            const taskConf = rawTasks[taskId];
            const def = resolveExamV2TaskType(taskId);
            return {
                taskId,
                label: def?.label || taskId,
                renderer: def?.renderer || 'single_choice',
                enabled: taskConf ? taskConf.enabled : true,
                itemCount: taskConf ? taskConf.itemCount : 5,
                marks: taskConf ? taskConf.marks : 1,
                durationSeconds: taskConf ? taskConf.durationSeconds : 120,
                required: taskConf ? taskConf.required : true,
                difficulty: taskConf ? taskConf.difficulty : `CEFR ${learner.cefrLevel || 'B2'}`,
                cognitiveProcess: taskConf ? taskConf.cognitiveProcess : 'understand',
                primarySkill: taskConf ? taskConf.primarySkill : 'reading'
            };
        })
        .filter(t => t.enabled);

    // If no tasks are enabled, enable the first one by default so the exam is not empty
    if (enabledTasks.length === 0 && validTaskIds.length > 0) {
        const firstId = validTaskIds[0];
        const def = resolveExamV2TaskType(firstId);
        enabledTasks.push({
            taskId: firstId,
            label: def?.label || firstId,
            renderer: def?.renderer || 'single_choice',
            enabled: true,
            itemCount: 5,
            marks: 1,
            durationSeconds: 120,
            required: true,
            difficulty: `CEFR ${learner.cefrLevel || 'B2'}`,
            cognitiveProcess: 'understand',
            primarySkill: 'reading'
        });
    }

    const totalRawScore = enabledTasks.reduce((sum, t) => sum + t.marks, 0);

    // Get the locale based on the exam language
    let locale = 'en';
    if (profile.startsWith('german_')) locale = 'de';
    else if (profile.startsWith('french_')) locale = 'fr';
    else if (profile.startsWith('spanish_')) locale = 'es';

    return `
--- YOUR TASK (SETUP) ---
You are an elite Assessment Architect, Psychometrician, and UI developer for high-stakes certification exam simulations.

**CRITICAL INSTRUCTION: STOP! DO NOT GENERATE YET.**
I have NOT provided the source text yet.
1. Read the instructions below to understand the required JSON structure and customized exam specifications.
2. **DO NOT** output the JSON yet.
3. Your response to THIS prompt should be ONLY: "Please provide the source text or PDF content for the Mock Test."
4. I will then paste the text in the next message. Once you receive the text, THEN you must generate the JSON.

--- INPUT DATA (To be provided next) ---
SOURCE_TEXT: [I will paste this in next message]
LEARNER_LEVEL: ${cefrLevel}

${profileCtx}

--- CONTENT TYPE: Mock Test Exam Blueprint V3 ---
Generate a strictly formatted, 2026-compliant Exam Blueprint JSON object for the ExamSimulatorHtmlGenerator.v3.ts module based exclusively on the provided SOURCE_TEXT.

Your output must be a single JSON object matching this customized structure:

### CUSTOMIZED EXAM STRUCTURE DEFINITION (MANDATORY):
- **Exam ID**: "exam_mock_v3_${profile}_001"
- **Exam Name**: "${examLabel} Simulator"
- **Provider**: "" (optional — your school or center name, kept short; never add filler branding)
- **Locale**: "${locale}"
- **Delivery Mode**: "${delivery}"
- **Total Duration**: ${duration} minutes
- **Pass Percent**: 70
- **Proctoring Settings**:
  * enabled: ${proctoring.preventFocusLoss || proctoring.preventClipboardActions || proctoring.preventContextMenu}
  * fullscreenRequired: false
  * detectTabSwitches: ${proctoring.preventFocusLoss}
  * detectWindowBlur: ${proctoring.preventFocusLoss}
  * detectCopyPaste: ${proctoring.preventClipboardActions}
  * detectContextMenu: ${proctoring.preventContextMenu}
  * detectIdle: true
  * idleThresholdSeconds: 90
  * webcamPrompt: ${proctoring.requireHardwareChecks}
  * microphonePrompt: ${proctoring.requireHardwareChecks}
  * photoIdCheck: true
  * maxWarnings: ${proctoring.maxFocusLossWarnings}
  * snapshotIntervalSeconds: 60
- **Accessibility Settings**:
  * dyslexiaFontOption: true
  * fontScaleControls: true
  * contrastPresets: true
  * keyboardNavigation: true
  * screenReaderLabels: true

### SECTIONS TO GENERATE (MANDATORY):
You MUST generate exactly the following section containing the ${enabledTasks.length} customized questions matching these specifications:

Section:
- Section ID: "section_mock_assessment_v3"
- Title: "Main Assessment Section"
- Type: "integrated"
- Instructions: "Complete all questions in this section carefully using the information provided."
- Section Duration: ${duration} minutes
- Item Count: ${enabledTasks.length} questions

And the individual questions in the section are:
${enabledTasks.map((t, idx) => {
    let specificQuestionSpec = '';
    
    if (t.renderer === 'single_choice' || t.renderer === 'image_choice' || t.renderer === 'true_false_not_given' || t.renderer === 'yes_no_not_given') {
        specificQuestionSpec = `
- **Question Structure**:
  * type: "${t.renderer}"
  * points: ${t.marks}
  * difficulty: "${t.difficulty}"
  * skillTags: ["${t.primarySkill}", "${t.taskId}"]
  * options (MANDATORY): Must be an array of objects, containing between 2 to 4 choices. Each option MUST have:
    * id: string (unique choice ID, e.g., "opt_1")
    * label: string (the option text, written in target locale ${locale})
    * correct: boolean (set to true for EXACTLY one correct option, and false for others)`;
    } else if (t.renderer === 'matching' || t.renderer === 'matching_headings' || t.renderer === 'matching_information' || t.renderer === 'matching_features' || t.renderer === 'matching_sentence_endings' || t.renderer === 'categorization') {
        specificQuestionSpec = `
- **Question Structure**:
  * type: "${t.renderer}"
  * points: ${t.marks}
  * difficulty: "${t.difficulty}"
  * skillTags: ["${t.primarySkill}", "${t.taskId}"]
  * leftItems (MANDATORY): Array of objects with id and label, e.g. [{"id": "l_1", "label": "Item 1"}]
  * rightItems (MANDATORY): Array of objects with id and label, e.g. [{"id": "r_1", "label": "Match A"}]
  * correctMap (MANDATORY): Record mapping left item IDs to right item IDs, e.g. {"l_1": "r_1"}`;
    } else if (
        t.renderer === 'dropdown_cloze' || 
        t.renderer === 'drag_and_drop_cloze' || 
        t.renderer === 'interactive_reading' ||
        t.renderer === 'sentence_completion' ||
        t.renderer === 'summary_completion' ||
        t.renderer === 'note_completion' ||
        t.renderer === 'table_completion' ||
        t.renderer === 'flow_chart_completion' ||
        t.renderer === 'diagram_label_completion'
    ) {
        specificQuestionSpec = `
- **Question Structure**:
  * type: "${t.renderer}"
  * points: ${t.marks}
  * difficulty: "${t.difficulty}"
  * skillTags: ["${t.primarySkill}", "${t.taskId}"]
  * templateHtml (MANDATORY): The HTML string containing placeholder tokens like "{{blank_1}}" or "{{blank_2}}".
    - If it's a table_completion, you MUST generate a clean, real HTML table layout (e.g. \`<table>\`) containing rows and columns, with cells containing placeholder tokens like "{{blank_1}}".
    - If it's a summary_completion, note_completion, or flowchart_completion, you MUST generate a clean HTML structure representing the summary paragraphs or flowchart boxes containing placeholders like "{{blank_1}}".
    - Under no circumstances should you generate a generic placeholder message or omit templateHtml. It must be a complete, realistic, high-quality layout grounded directly in the text!
  * blanks (MANDATORY): An array of objects for each blank:
    * id: string (must match the template token exactly, e.g., "blank_1")
    * options: array of string (choices available for this blank)
    * correct: string (the exact correct answer string which is in options)`;
    } else if (t.renderer === 'highlight_text' || t.renderer === 'highlight_sentence') {
        specificQuestionSpec = `
- **Question Structure**:
  * type: "${t.renderer}"
  * points: ${t.marks}
  * difficulty: "${t.difficulty}"
  * skillTags: ["${t.primarySkill}", "${t.taskId}"]
  * passageHtml (MANDATORY): The text HTML string containing sentences.
  * correctSnippets (MANDATORY): Array of string containing exact sentences/phrases that are correct selections`;
    } else if (t.renderer === 'reorder_paragraphs' || t.renderer === 'sequence') {
        specificQuestionSpec = `
- **Question Structure**:
  * type: "${t.renderer}"
  * points: ${t.marks}
  * difficulty: "${t.difficulty}"
  * skillTags: ["${t.primarySkill}", "${t.taskId}"]
  * items (MANDATORY): Array of objects with id and label representing the paragraphs in random order.
  * correctOrder (MANDATORY): Array of string representing the exact correct chronological list of IDs, e.g. ["p_3", "p_1", "p_2"]`;
    } else if (t.renderer === 'numeric_entry' || t.renderer === 'fraction_entry' || t.renderer === 'equation_entry') {
        specificQuestionSpec = `
- **Question Structure**:
  * type: "${t.renderer}"
  * points: ${t.marks}
  * difficulty: "${t.difficulty}"
  * skillTags: ["${t.primarySkill}", "${t.taskId}"]
  * correctAnswer (MANDATORY): string or number of the correct math/numerical solution
  * acceptedAnswers: array of string/number of alternative acceptable answers`;
    } else if (t.renderer === 'matrix_selection') {
        specificQuestionSpec = `
- **Question Structure**:
  * type: "matrix_selection"
  * points: ${t.marks}
  * difficulty: "${t.difficulty}"
  * skillTags: ["${t.primarySkill}", "${t.taskId}"]
  * rows (MANDATORY): Array of row labels (statements, findings, or categories), e.g. ["Finding 1", "Finding 2"]
  * columns (MANDATORY): Array of column labels (options or categories), e.g. ["Category A", "Category B"]
  * correctCells (MANDATORY): Array of strings identifying the correct row::column intersections, e.g. ["Finding 1::Category A"]`;
    } else if (t.renderer === 'gap_fill' || t.renderer === 'complete_words') {
        specificQuestionSpec = `
- **Question Structure**:
  * type: "${t.renderer}"
  * points: ${t.marks}
  * difficulty: "${t.difficulty}"
  * skillTags: ["${t.primarySkill}", "${t.taskId}"]
  * templateHtml (MANDATORY): Complete HTML/plain-text passage with placeholders "{{blank_1}}", "{{blank_2}}" inserted exactly where answers go. For complete_words (C-Test), preserve the visible leading letters of each target word and open the gap immediately after them.
  * blanks (MANDATORY): Array of objects, each with:
    * id: string (must match the template token exactly, e.g., "blank_1")
    * correct: string OR array of acceptable strings (matched case-insensitively)
    * maxLength: integer (for complete_words: the EXACT number of missing letters)`;
    } else if (t.renderer === 'multi_field' || t.renderer === 'graph_interaction') {
        specificQuestionSpec = `
- **Question Structure**:
  * type: "${t.renderer}"
  * points: ${t.marks}
  * difficulty: "${t.difficulty}"
  * skillTags: ["${t.primarySkill}", "${t.taskId}"]
  * fields (MANDATORY): Array of objects, each with id, label, inputMode ("text" or "decimal"), and optional placeholder and unitLabel.
  * correctAnswers (MANDATORY): Record mapping each field id to its exact correct answer (string, number, or array of acceptable strings), e.g. {"f_1": "42", "f_2": ["increase", "rises"]}
  * workingRequired: boolean — whether the candidate must show working/explanation
  * For graph_interaction: also include media.table = { "columns": [...], "rows": [[...]] } with the numeric data table the candidate reads from. It is a DATA TABLE task — never an image, chart, or diagram.`;
    } else if (t.renderer === 'read_aloud' || t.renderer === 'repeat_sentence' || t.renderer === 'speaking_response' || t.renderer === 'oral_interview' || t.renderer === 'role_play' || t.renderer === 'video_reflection') {
        specificQuestionSpec = `
- **Question Structure**:
  * type: "${t.renderer}"
  * points: ${t.marks}
  * difficulty: "${t.difficulty}"
  * skillTags: ["${t.primarySkill}", "${t.taskId}"]
  * prepSeconds (MANDATORY): integer (e.g., 20 or 30)
  * responseSeconds (MANDATORY): integer (e.g., 60 or 90)
  * sampleResponse (MANDATORY): string containing a high-scoring sample vocal answer spoken in target locale ${locale}`;
    } else {
        specificQuestionSpec = `
- **Question Structure**:
  * type: "${t.renderer}"
  * points: ${t.marks}
  * difficulty: "${t.difficulty}"
  * skillTags: ["${t.primarySkill}", "${t.taskId}"]
  * expectedAnswers (MANDATORY): Array of string or double array of string for acceptable typed keys, e.g. [["correct_answer", "synonym"]]
  * sampleAnswer: string showing a model typed answer`;
    }

    return `
Question ${idx + 1}:
- id: "q_${t.taskId}_${idx + 1}"
- type: "${t.renderer}"
- prompt: "Candidate prompt in target locale (${locale})"
- points: ${t.marks}
- difficulty: "${t.difficulty}"
- instructions: "Short candidate action instruction"
- explanation: "Comprehensive step-by-step rationale for why the answer is correct"
- miniLesson: "Educational context or grammar tip regarding this question"
- strategyTips: ["Tip 1", "Tip 2"]
- skillTags: ["${t.primarySkill}", "${t.taskId}"]
- taskKeys: {
    "correctResponse": "[Exact answer key]",
    "keyRationale": "[Step-by-step reason the answer is correct]",
    "distractorRationales": { "[wrong option id]": "[Why this option is wrong]" },
    "workedSolution": "[Full worked solution — REQUIRED for numeric, graph_interaction and multi_field tasks]"
  }
${specificQuestionSpec}
`;
}).join('\n')}

### CRITICAL RULES (NO COMPROMISES):
1. **Target Locale**: All user-facing prompts, questions, options, left/right items, explanations, passages, and sample answers MUST be written in the target locale: **"${locale}"**. If the locale is 'de', write in German. If 'fr', write in French. If 'es', write in Spanish. If 'en', write in English.
2. **Options Content**: If the question type has an "options" field, it MUST NOT be empty. It must contain complete option objects with id, label, and correct boolean.
3. **Valid JSON**: The output MUST be a single, valid, raw JSON object representing a V3 ExamBlueprint.
4. **MANDATORY: PASSAGE & TRANSCRIPT LENGTH & REALISM POLICY**:
   - **Reading Passages**: Reading passages (specifically for reading tasks) MUST be long, comprehensive, and realistic (600–1000 words). They must contain multi-paragraph structures with clearly labeled paragraphs (e.g. Paragraph A, Paragraph B, Paragraph C, etc.) to allow for matching information/headings tasks. Use high-quality, academic/general professional tone and rich vocabulary directly derived from the SOURCE_TEXT.
   - **Listening Transcripts**: Listening scripts (used for TTS playback in listening tasks) MUST be full-length, detailed monologues or dialogues (500–800 words, at least 3-4 minutes of spoken time). They must contain realistic spoken English elements: natural conversational markers (e.g., "well,", "let me see,", "actually,", "good point,"), natural transitions, hesitations, or self-corrections between speakers. NEVER make them short summaries or simplified bullet points!
5. **MANDATORY: STRICT NO-VISUALS/NO-MAPS POLICY**:
   - Under no circumstances should any task reference, label, or require an image, illustration, map, diagram, layout, or chart. All questions and tasks must be 100% text-based. Do NOT ask candidates to "label the diagram", "view the diagram", "look at the map", or "complete the layout on the image".
   - EXCEPTION: graph_interaction tasks are DATA TABLE tasks — they embed the numbers in media.table (columns/rows of plain text values) and are NEVER rendered as an image, chart, or graph.
6. **MANDATORY: REALISTIC IELTS-STYLE MATCHING TASKS SCHEMA (NO DICTIONARY MATCHING!)**:
   - You MUST NOT generate simple dictionary-style word-to-definition matching (e.g. matching a term with its definition). Instead, implement real-world exam structures using leftItems and rightItems:
     - **For Heading Matching**:
       * 'leftItems': Define paragraphs to be labeled (e.g., 'l_1' with label "Paragraph A", 'l_2' with label "Paragraph B", etc.).
       * 'rightItems': Define 6-8 high-quality headings (e.g., "The economic impact of transport", "Unforeseen financial challenges") based on the text. Always provide MORE options (headings) than paragraphs (leftItems) to create a realistic, challenging, high-quality test!
     - **For Information Matching**:
       * 'leftItems': Define 3-5 specific, rich statements of details/findings paraphrased from the text (e.g., "a description of the initial construction costs").
       * 'rightItems': Define the paragraphs where they are found (e.g., 'r_1' with label "Paragraph A", 'r_2' with label "Paragraph B", etc.).
     - **For Features Matching / Classification**:
       * 'leftItems': Define 3-5 rich findings or opinions from the text (e.g., "believed that traffic congestion was inevitable").
       * 'rightItems': Define the experts or categories mentioned in the text (e.g., 'r_1' with label "Dr. Clara Finch", 'r_2' with label "Professor Sarah Davis").
     - **For Sentence Endings Matching**:
       * 'leftItems': Define sentence starters (e.g., "The main station was built because...").
       * 'rightItems': Define complete, grammatically correct endings (e.g., "...it served as a central hub for agricultural exports.").
      - **For Completion Tasks (sentence, summary, note, table, flowchart, etc.)**:
        * **STRICT GAP/PLACEHOLDER BAN**: Do NOT use generic, meaningless, or lazy labels like "Gap 1", "Sentence with Gap 1", "Word 1", or "Fill in here". All blanks MUST be populated with real, specific options, and the templateHtml must present a realistic, contextual, multi-paragraph passage, table, or flowchart based on the text.
        * **MANDATORY templateHtml**: You MUST write a complete, beautifully structured HTML layout (such as '<table>' for table completion) containing real labels and '{{blank_1}}', '{{blank_2}}' tokens as slots. Under no circumstances should you generate a single placeholder word or leave the templateHtml empty!
        * **MANDATORY blanks**: You MUST provide the corresponding array in 'blanks', where each blank ID matches the template token exactly, with at least 3-4 realistic choices/options and a clear correct answer string.

7. **MANDATORY: MACHINE-READABLE LISTENING AUDIO SCHEMA**:
   For EVERY listening task, provide media.audio with this exact structure:
   - segments: array of { "segmentId": "seg_001", "speakerTag": "female2", "speakerLabel": "Dr. Reyes", "text": "...", "startMs": 0, "endMs": 18000 }
   - Allowed speakerTag values are ONLY male1-male4 and female1-female4 (or speaker for a narrator). Tags are metadata for the speech pipeline and MUST NEVER be spoken aloud.
   - transcriptPolicy: one of "always", "hidden_until_submitted", or "disabled" (hidden policies protect the answers from being read ahead of time).
   - taggedScript: the full script with [female1], [male2] etc. tags immediately before each spoken segment — the tags must never be spoken.
   - playOnce (boolean) and globalIntroText (string) where appropriate.
   - Segment timestamps MUST be chronological: each segment's startMs must be >= the previous segment's endMs, and endMs must never precede startMs.

8. **MANDATORY: C-TEST / COMPLETE WORDS RULE**:
   For complete_words tasks (TOEFL iBT Complete the Words, DET Read and Complete):
   - Keep the visible leading letters of each target word in the passage and open one {{blank_N}} gap immediately after them (e.g., "Urban plann{{blank_1}} increasingly uses data to eval{{blank_2}}...").
   - blanks[].maxLength MUST equal the exact number of missing letters (e.g., 3 for plann___).
   - The full word is the private answer key (correct); the candidate types ONLY the missing letters.

9. **MANDATORY: SCORING RIGOR & PROVENANCE**:
   - Every question MUST carry taskKeys with correctResponse, keyRationale, distractorRationales (one entry per wrong option), and workedSolution (required for numeric_entry, graph_interaction, and multi_field).
   - The blueprint MUST include qualityAssurance (reviewedBy, validationDate, approvedBy, standards) and sourceRegistry (array of { "sourceId", "title", "url", "retrievedAt", "license" }) so every answer can be traced back to the SOURCE_TEXT.
   - The completed exam's results.json is analyzed in the Learner Exam Analysis dashboard, which shows the learner's answer, the question, and the answer key side by side — so answers must be complete and unambiguous.

--- JSON SCHEMA TEMPLATE ---
Your output must be structured exactly like this:

{
  "examId": "exam_mock_v3_${profile}_001",
  "examName": "[Insert Descriptive Title based on Source Text in ${locale}]",
  "year": 2026,
  "provider": "",
  "version": "2026.3",
  "locale": "${locale}",
  "examFamily": "[Exam Family, e.g. IELTS / TOEFL / TestDaF]",
  "candidate": {
    "reference": "[Learner name from the tutor]",
    "name": "[Learner name from the tutor]"
  },
  "deliveryMode": "${delivery}",
  "totalDurationMinutes": ${duration},
  "passPercent": 70,
  "strictProctoring": ${proctoring.preventFocusLoss},
  "oneSkillRetake": false,
  "adaptive": false,
  "calculatorPolicy": "disabled",
  "sections": [
    {
      "id": "section_mock_assessment_v3",
      "title": "Integrated Assessment Component",
      "type": "integrated",
      "instructions": "Answer the following integrated certification mock questions carefully.",
      "durationMinutes": ${duration},
      "itemCount": ${enabledTasks.length},
      "shuffleQuestions": false,
      "allowBackNavigation": true,
      "allowFlagging": true,
      "allowHighlighting": true,
      "allowNotepad": true,
      "allowCalculator": false,
      "questions": [
         // Place the ${enabledTasks.length} questions here!
      ]
    }
  ],
  "scoring": {
    "scale": "percent",
    "passingLogic": "overall",
    "partialCredit": true,
    "bandMapping": [
      { "minPercent": 90, "label": "Excellent" },
      { "minPercent": 75, "label": "Strong" },
      { "minPercent": 60, "label": "Competent" },
      { "minPercent": 0, "label": "Developing" }
    ],
    "writingRubrics": [
      {
        "id": "coherence",
        "label": "Coherence & Cohesion",
        "max": 5,
        "descriptors": [
          { "score": 5, "description": "Logically organized, seamless paragraphs and transition words." },
          { "score": 3, "description": "Generally coherent, paragraphing is somewhat systematic but lacks fine transitions." },
          { "score": 1, "description": "Disorganized writing, confusing progression." }
        ]
      }
    ],
    "speakingRubrics": [
      {
        "id": "fluency",
        "label": "Fluency & Coherence",
        "max": 5,
        "descriptors": [
          { "score": 5, "description": "Fluent speech with near-zero hesitation or self-correction." },
          { "score": 3, "description": "Maintains flow but shows noticeable repetitions and self-correction." },
          { "score": 1, "description": "Halting speech, severe hesitation, fragments." }
        ]
      }
    ]
  },
  "qualityAssurance": {
    "reviewedBy": "[Reviewer name]",
    "validationDate": "[ISO date]",
    "approvedBy": "[Approver name]",
    "standards": ["[Standard or rubric used]"]
  },
  "sourceRegistry": [
    { "sourceId": "src_001", "title": "[Source title from SOURCE_TEXT]", "url": "[Source URL if available]", "retrievedAt": "[ISO date]", "license": "[License if known]" }
  ],
  "ui": {
    "brandTitle": "${examLabel} Simulator",
    "accentHue": 220,
    "density": "comfortable",
    "showSectionTimers": true,
    "showQuestionPalette": true,
    "enableSplitPaneReading": true,
    "enableKeyboardShortcuts": true,
    "fontFamily": "Inter, sans-serif"
  },
  "telemetry": {
    "enabled": true,
    "storeLocally": true,
    "emitConsoleMirror": false,
    "flushIntervalMs": 10000,
    "captureVisibility": true,
    "captureFocus": true,
    "captureClipboard": true,
    "captureNavigation": true,
    "captureAnswerLatency": true
  },
  "proctoring": {
    "enabled": ${proctoring.preventFocusLoss || proctoring.preventClipboardActions},
    "fullscreenRequired": false,
    "detectTabSwitches": ${proctoring.preventFocusLoss},
    "detectWindowBlur": ${proctoring.preventFocusLoss},
    "detectCopyPaste": ${proctoring.preventClipboardActions},
    "detectContextMenu": ${proctoring.preventContextMenu},
    "detectIdle": true,
    "idleThresholdSeconds": 90,
    "webcamPrompt": ${proctoring.requireHardwareChecks},
    "microphonePrompt": ${proctoring.requireHardwareChecks},
    "photoIdCheck": true,
    "maxWarnings": ${proctoring.maxFocusLossWarnings},
    "snapshotIntervalSeconds": 60
  },
  "accessibility": {
    "dyslexiaFontOption": true,
    "fontScaleControls": true,
    "contrastPresets": true,
    "keyboardNavigation": true,
    "screenReaderLabels": true
  }
}
`;
};
