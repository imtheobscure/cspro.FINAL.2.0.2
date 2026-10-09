import type { LearnerProfile } from '../../types';
import { EXAM_PROFILE_TASK_TYPE_MATRIX, resolveExamTaskType } from '../../tutorly-lessons/Mock-Test/ExamSimulatorHtmlGenerator';

const EXAM_PROFILE_LABELS: Record<string, string> = {
  ielts_academic_paper_2026: "IELTS Academic (Paper)",
  ielts_academic_computer_2026: "IELTS Academic (Computer)",
  ielts_general_paper_2026: "IELTS General (Paper)",
  ielts_general_computer_2026: "IELTS General (Computer)",
  ielts_ukvi_2026: "IELTS UKVI",
  ielts_life_skills_a1_2026: "IELTS Life Skills A1",
  ielts_life_skills_b1_2026: "IELTS Life Skills B1",
  toefl_ibt_2026: "TOEFL iBT",
  toefl_essentials_2026: "TOEFL Essentials",
  toefl_itp_2026: "TOEFL ITP",
  toefl_junior_2026: "TOEFL Junior",
  pte_academic_2026: "PTE Academic",
  pte_core_2026: "PTE Core",
  pte_home_a1_2026: "PTE Home A1",
  pte_home_b1_2026: "PTE Home B1",
  duolingo_english_test_2026: "Duolingo English Test (DET)",
  cambridge_a2_key_2026: "Cambridge A2 Key",
  cambridge_b1_preliminary_2026: "Cambridge B1 Preliminary",
  cambridge_b2_first_2026: "Cambridge B2 First",
  cambridge_c1_advanced_2026: "Cambridge C1 Advanced",
  cambridge_c2_proficiency_2026: "Cambridge C2 Proficiency",
  celpip_general_2026: "CELPIP General",
  celpip_general_ls_2026: "CELPIP General LS",
  oet_2026: "OET (Occupational English Test)",
  trinity_ise_2026: "Trinity ISE",
  aptis_2026: "Aptis",
  languagecert_2026: "LanguageCert",
  gcse_english_language_2026: "GCSE English Language",
  gcse_english_literature_2026: "GCSE English Literature",
  gcse_mathematics_2026: "GCSE Mathematics",
  gcse_combined_science_2026: "GCSE Combined Science",
  eleven_plus_2026: "Eleven Plus (11+)",
  iseb_common_entrance_2026: "ISEB Common Entrance",
  ssat_upper_middle_2026: "SSAT Upper/Middle",
  sat_2026: "SAT",
  act_2026: "ACT",
  hspt_2026: "HSPT",
  isee_upper_2026: "ISEE Upper",
  naplan_2026: "NAPLAN",
  canadian_cat4_2026: "Canadian CAT4/CCAT",
  english_placement_test_2026: "English Placement Test",
  exam_prep_test_teach_test: "Test-Teach-Test (TTT)"
};

export const getMockTestPrompt = (learner: LearnerProfile, config?: any): string => {
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
    const examLabel = EXAM_PROFILE_LABELS[profile] || profile;
    const duration = config?.totalDurationMinutes || 30;
    const delivery = config?.deliveryMode || 'digital_simulation';

    // Spread over the defaults: a PARTIAL proctoring/accessibility object (an older saved draft,
    // or a settings shape that predates a key) used to print `preventFocusLoss: undefined`
    // straight into the prompt the tutor copies. `|| defaults` cannot catch that — merging can.
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
        'map', 'diagram', 'chart', 'visual', 'hotspot', 'photo', 'image', 'picture', 'graph_interaction'
    ];
    const validTaskIds = (EXAM_PROFILE_TASK_TYPE_MATRIX[profile] || []).filter(id => {
        return !forbiddenVisualKeywords.some(kw => id.toLowerCase().includes(kw));
    });
    
    // Filter down to enabled tasks for the selected profile
    const enabledTasks = validTaskIds
        .map(taskId => {
            const taskConf = rawTasks[taskId];
            const def = resolveExamTaskType(taskId);
            const inferredSkill = taskId.includes('listening') ? 'listening' : (taskId.includes('speaking') ? 'speaking' : (taskId.includes('writing') ? 'writing' : 'reading'));
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
                primarySkill: taskConf?.primarySkill || inferredSkill
            };
        })
        .filter(t => t.enabled);

    // If no tasks are enabled, enable the first one by default so the exam is not empty
    if (enabledTasks.length === 0 && validTaskIds.length > 0) {
        const firstId = validTaskIds[0];
        const def = resolveExamTaskType(firstId);
        const inferredSkill = firstId.includes('listening') ? 'listening' : (firstId.includes('speaking') ? 'speaking' : (firstId.includes('writing') ? 'writing' : 'reading'));
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
            primarySkill: inferredSkill
        });
    }

    const totalRawScore = enabledTasks.reduce((sum, t) => sum + t.marks, 0);

    // Construct the prompt string
    return `
--- YOUR TASK (SETUP) ---
You are an expert Psychometrician and assessment architect for an advanced language learning application.

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

--- CONTENT TYPE: Mock Test Exam Package ---
Generate a strictly formatted 2026-compliant Exam Authoring Package JSON object for the ExamSimulatorHtmlGenerator.ts module based exclusively on the provided SOURCE_TEXT.

Your output must be a single JSON object matching this customized structure:

### CUSTOMIZED EXAM STRUCTURE DEFINITION (MANDATORY):
- **Target Exam Profile**: "${profile}" (Official Name: "${examLabel}")
- **Delivery Mode**: "${delivery}"
- **Total Duration**: ${duration} minutes
- **Total Raw Score**: ${totalRawScore} points
- **Proctoring Settings**:
  * preventFocusLoss: ${proctoring.preventFocusLoss}
  * maxFocusLossWarnings: ${proctoring.maxFocusLossWarnings}
  * preventClipboardActions: ${proctoring.preventClipboardActions}
  * preventContextMenu: ${proctoring.preventContextMenu}
  * preventProtectedSelection: ${proctoring.preventProtectedSelection}
  * requireHardwareChecks: { "audio": ${proctoring.requireHardwareChecks}, "microphone": ${proctoring.requireHardwareChecks} }
- **Accessibility Settings**:
  * highContrast: ${accessibility.highContrast}
  * largeText: ${accessibility.largeText}
  * reducedMotion: ${accessibility.reducedMotion}
  * captions: ${accessibility.captions}
  * extraTimeMultiplier: 1

### TASKS TO GENERATE (MANDATORY):
You MUST generate exactly the following ${enabledTasks.length} tasks matching these specifications:
${enabledTasks.map((t, idx) => {
    const isChoiceOrSelect = ["single_choice", "multiple_select", "matrix_selection", "hotspot", "dropdown_gaps", "matching", "categorization"].includes(t.renderer);
    const optionsRequirement = isChoiceOrSelect
        ? `CRITICAL MANDATORY: responseSpec.options MUST NOT BE EMPTY! It must contain at least 2 to 4 options/choices (e.g., "options": [{"optionId": "opt_a", "label": "Choice A"}, {"optionId": "opt_b", "label": "Choice B"}]). NEVER leave options array empty or set to [] for this task renderer!`
        : `Omit or leave options array empty (e.g., "options": []).`;
    
    const isGapFillOrDropdown = ["gap_fill", "dropdown_gaps", "matching", "table_completion", "note_completion", "summary_completion", "flowchart_completion", "sentence_completion"].includes(t.renderer);
    const gapsRequirement = isGapFillOrDropdown
        ? `CRITICAL MANDATORY: responseSpec.gaps MUST NOT BE EMPTY! You must generate exactly ${t.itemCount || 3} gap objects inside the "gaps" array (each with "gapId" and "label"). Also, you MUST write underscores (e.g., "______") inside the prompt or stimulus.passageText where these gaps should be rendered.`
        : `Omit or leave gaps array empty (e.g., "gaps": []).`;

    return `
Task ${idx + 1}:
- taskId: "task_${t.taskId}_001"
- taskType: "${t.taskId}"
- Title: "${t.label}"
- Skill Domain: "${t.primarySkill}"
- Target Quantity: ${t.itemCount} items/questions
- Estimated Time: ${t.durationSeconds} seconds
- Total Marks: ${t.marks}
- Mandatory: ${t.required}
- Psychometric Difficulty: "${t.difficulty}"
- Cognitive Process: "${t.cognitiveProcess}"
- EXAMINER RESPONSE SPECIFICATION:
  * responseSpec.type (MUST BE EXACTLY THIS): "${t.renderer}"
  * Options Requirement: ${optionsRequirement}
  * Gaps Requirement: ${gapsRequirement}
`;
}).join('\n')}

### CRITICAL BEHAVIOR WARNINGS (NO ERRORS ALLOWED):
1. FORBIDDEN: NEVER use generic placeholders or lazy template strings such as "Term 1", "Term 2", "Gap 1", "Gap 2", "Sentence 1", "Sentence 2", "Option A", "Choice B", or "Question 1". You MUST replace all of these with real, specific, rich content, actual vocabulary terms, natural language sentences, and complete definitions grounded directly in the provided SOURCE_TEXT!
2. MANDATORY: PASSAGE & TRANSCRIPT LENGTH & REALISM POLICY
   - **Reading Passages**: Reading passages (specifically for reading tasks) MUST be long, comprehensive, and realistic (600–1000 words). They must contain multi-paragraph structures with clearly labeled paragraphs (e.g. Paragraph A, Paragraph B, Paragraph C, etc.) to allow for matching information/headings tasks. Use high-quality, academic/general professional tone and rich vocabulary directly derived from the SOURCE_TEXT.
   - **Listening Transcripts**: Listening scripts (used for TTS playback in listening tasks) MUST be full-length, detailed monologues or dialogues (500–800 words, at least 3-4 minutes of spoken time). They must contain realistic spoken English elements: natural conversational markers (e.g., "well,", "let me see,", "actually,", "good point,"), natural transitions, hesitations, or self-corrections between speakers. NEVER make them short summaries or simplified bullet points!
3. MANDATORY: STRICT NO-VISUALS/NO-MAPS POLICY
   - Under no circumstances should any task reference, label, or require an image, illustration, map, diagram, layout, or chart. All questions and tasks must be 100% text-based. Do NOT ask candidates to "label the diagram", "view the diagram", "look at the map", or "complete the layout on the image".
4. MANDATORY: REALISTIC IELTS-STYLE MATCHING TASKS SCHEMA (NO DICTIONARY MATCHING!)
   - You MUST NOT generate simple dictionary-style word-to-definition matching. Instead, implement real-world exam structures using gaps and options:
     - **For Heading Matching (e.g. 'ielts_reading_matching_headings')**:
       * 'responseSpec.gaps': Define one gap for each paragraph (e.g., 'gap_1' with label "Paragraph A", 'gap_2' with label "Paragraph B", etc.).
       * 'responseSpec.options': Define 6-8 high-quality headings (e.g., "The economic impact of transport", "Unforeseen financial challenges") based on the text. Always provide MORE options (headings) than gaps (paragraphs) to create a realistic, challenging, high-quality test!
     - **For Information Matching (e.g. 'ielts_reading_matching_information' or 'ielts_listening_matching')**:
       * 'responseSpec.gaps': Define 3-5 specific, rich statements of details/findings paraphrased from the text (e.g., "a description of the initial construction costs").
       * 'responseSpec.options': Define the paragraphs where they are found (e.g., Option A: "Paragraph A", Option B: "Paragraph B", etc.).
     - **For Features Matching / Classification (e.g. 'ielts_reading_matching_features')**:
       * 'responseSpec.gaps': Define 3-5 rich findings or opinions from the text (e.g., "believed that traffic congestion was inevitable").
       * 'responseSpec.options': Define the experts or categories mentioned in the text (e.g., Option A: "Dr. Clara Finch", Option B: "Professor Sarah Davis").
     - **For Sentence Endings Matching (e.g. 'ielts_reading_matching_sentence_endings')**:
       * 'responseSpec.gaps': Define the sentence starters (e.g., "The main station was built because ______").
       * 'responseSpec.options': Define complete, grammatically correct endings (e.g., "it served as a central hub for agricultural exports.").
 5. STRICT NO-LAZY-GENERATION POLICY FOR ALL COMPLETION TASKS (Note, Summary, Sentence, Table, Flowchart):
   Under NO circumstances should you output a single word, isolated phrase, or generic 1-line gap stub for ANY completion task!
   - **For "Complete the notes" (note_completion)**: The prompt or stimulus text MUST feature a comprehensive, multi-section structured set of notes with clear headings, subheadings, and bullet points detailing the full lecture/text. Blanks ("______") must be embedded inside full contextual bullet points (e.g. "• Initial research focus: ______").
   - **For "Complete the summary" (summary_completion)**: The prompt or stimulus text MUST feature a rich 150-250 word multi-paragraph summary passage with embedded blanks ("______") covering main findings or arguments.
   - **For "Complete the sentences" (sentence_completion)**: The prompt or stimulus text MUST feature 3 to 5 full, multi-clause academic/professional sentences based on distinct points in the text, each containing a blank ("______").
   - **For "Complete the table" (table_completion)**: The prompt or stimulus text MUST feature a complete Markdown or HTML table with column headers, row categories, and data cells containing blanks ("______").
   - **For "Complete the flowchart" (flowchart_completion)**: The prompt or stimulus text MUST feature a complete multi-step process outline ("Step 1: ... -> Step 2: ...") with contextual descriptions and blanks ("______").
 5a. MANDATORY: For table completion, you MUST write a clean, readable Markdown table in the stimulus text containing rows, columns, and underscores where the gap inputs are placed. Do NOT generate empty tables or ignore the layout request!
6. FORBIDDEN: NEVER output "options": [] or "options": null for "single_choice", "multiple_select", "matrix_selection", "hotspot", "dropdown_gaps", "matching", or "categorization" tasks. They MUST contain at least TWO options with valid optionId and label.
7. FORBIDDEN: NEVER output "gaps": [] or "gaps": null for "gap_fill", "dropdown_gaps", "matching", "table_completion", "note_completion", "summary_completion", "flowchart_completion", or "sentence_completion" tasks. They MUST contain gap definitions (each with a unique "gapId" and a real, high-quality "label" grounded in the text), and the stimulus/prompt text MUST contain "______" (underscores) to render those input fields.
8. Keep the "responseSpec.type" strictly aligned with the task's renderer specified above. Do not invent your own responseSpec types.

--- JSON SCHEMA TEMPLATE ---
Your output must be a single JSON object structured exactly like this:

{
  "schemaVersion": "2026.2",
  "packageType": "exam_authoring_package",
  "generationMetadata": {
    "generatedAt": "2026-07-12T12:00:00Z",
    "contentLocale": "en-GB",
    "requestedScope": "representative_mock",
    "generationStatus": "complete",
    "originalContentOnly": true,
    "independentSimulation": true,
    "nonEndorsementNotice": "This is an independent simulation, not endorsed by any official exam provider.",
    "authoringModelNotes": "A high-fidelity representative mock exam customized to the learner's needs."
  },
  "examMetadata": {
    "examId": "exam_mock_${profile}_001",
    "title": "[Insert Exam Title based on the source text]",
    "examFamily": "${examLabel}",
    "standard": "Independent CEFR-aligned diagnostic practice",
    "provider": "Custom independent simulation",
    "specificationOrEdition": "2026 Edition",
    "deliveryMode": "${delivery}",
    "deliveryAdaptation": "native_digital_practice",
    "totalDurationMinutes": ${duration},
    "independentSimulation": true,
    "instructions": "Read the passages and prompts carefully and answer all questions in the sections provided.",
    "officialStructure": {
      "duration": { "kind": "custom", "activeMinutes": ${duration}, "administrativeTimeExcluded": true, "notes": "Configured active testing time." },
      "itemCount": { "kind": "custom", "total": ${enabledTasks.length}, "countingConvention": "tasks", "notes": "Configured task structure." },
      "components": [],
      "breaks": [],
      "navigationPolicy": "free_within_section"
    },
    "officialPassPolicy": { "type": "institution_defined", "percentage": 70, "notes": "Passing criteria approximation." },
    "simulationSettings": { "scope": "representative_mock", "taskCount": ${enabledTasks.length}, "adaptiveMode": "fixed_form_approximation", "practiceTargetPercentage": 70 },
    "proctoringSettings": {
      "enabled": ${proctoring.preventFocusLoss || proctoring.preventClipboardActions},
      "preventFocusLoss": ${proctoring.preventFocusLoss},
      "maxFocusLossWarnings": ${proctoring.maxFocusLossWarnings},
      "preventClipboardActions": ${proctoring.preventClipboardActions},
      "preventContextMenu": ${proctoring.preventContextMenu},
      "preventProtectedSelection": ${proctoring.preventProtectedSelection},
      "focusLossBehavior": "continue",
      "autoSubmitOnLock": false,
      "requireHardwareChecks": { "audio": ${proctoring.requireHardwareChecks}, "microphone": ${proctoring.requireHardwareChecks} }
    },
    "accessibilitySettings": { 
      "reducedMotion": ${accessibility.reducedMotion}, 
      "largeText": ${accessibility.largeText}, 
      "highContrast": ${accessibility.highContrast}, 
      "captions": ${accessibility.captions}, 
      "extraTimeMultiplier": 1 
    }
  },
  "sections": [
    {
      "sectionId": "sec_mock_assessment_1",
      "sectionTitle": "Custom Assessment Tasks",
      "skillDomain": "integrated_skills",
      "instructions": "Complete each of the customized tasks carefully.",
      "durationMinutes": ${duration},
      "navigationPolicy": "free_within_section",
      "tasks": [
        // Generate the ${enabledTasks.length} tasks requested above here!
        // CRITICAL INSTRUCTION: EVERY task MUST follow this complete JSON task schema:
        // {
        //   "taskId": "task_[taskType]_001",
        //   "taskType": "[Insert taskType ID requested above, e.g., ielts_academic_reading_mc_single]",
        //   "title": "Task title",
        //   "instructions": "Exact response and limit instructions",
        //   "prompt": "Candidate-visible prompt",
        //   "stimulus": {
        //     "passageTitle": "Passage Title or null",
        //     "passageText": "The reading passage content (MUST BE null or omitted for listening tasks to prevent candidate from reading the audio script!)",
        //     "audio": null, // OR for listening tasks, generate a structured audio object (see rule 5 below)
        //     "visual": null
        //   },
        //   "responseSpec": {
        //     "type": "single_choice", // Must match taskType's renderer!
        //     "options": [
        //       { "optionId": "opt_a", "label": "Correct Option / Choice A" },
        //       { "optionId": "opt_b", "label": "Incorrect Choice B" },
        //       { "optionId": "opt_c", "label": "Incorrect Choice C" },
        //       { "optionId": "opt_d", "label": "Incorrect Choice D" }
        //     ]
        //   },
        //   "estimatedTimeSeconds": 120,
        //   "publicMarks": 1,
        //   "required": true,
        //   "psychometric": {
        //     "primarySkill": "reading",
        //     "difficulty": "B2",
        //     "cognitiveProcess": "understand"
        //   }
        // }
        //
        // --- CRITICAL RULES FOR RESPONSE SPECIFICATIONS ---
        // 1. If responseSpec.type is "single_choice", "multiple_select", "matrix_selection", "hotspot", "dropdown_gaps", "matching", or "categorization":
        //    The "options" array MUST contain at least TWO choices/options. NEVER leave it empty.
        //    Example:
        //    "options": [
        //       { "optionId": "opt_a", "label": "Choice A" },
        //       { "optionId": "opt_b", "label": "Choice B" }
        //    ]
        // 2. If responseSpec.type is "gap_fill" or "dropdown_gaps":
        //    The "gaps" array MUST be populated, and the "prompt" or "stimulus.passageText" must contain underscores (e.g. "The ______ is blue.") that correspond to those gapIds.
        // 3. If responseSpec.type is "text" or "rich_text":
        //    Provide "minWords" (integer, e.g., 50) and "maxWords" (integer, e.g., 250) in responseSpec.
        // 4. If responseSpec.type is "voice_recording":
        //    Provide "preparationSeconds" and "responseSeconds" in responseSpec.
        // 5. CRITICAL LISTENING TASK RULE (Skill Domain "listening"):
        //    * NEVER put the audio script/transcript inside "stimulus.passageText". You MUST set "stimulus.passageText" to null or omit it, so that the student does not read the text.
        //    * You MUST generate a structured "stimulus.audio" object with "segments" for multi-voice SpeechSynthesis read aloud:
        //      "audio": {
        //        "assetStatus": "script_only_for_tts_pipeline",
        //        "maxPlaybacks": 2,
        //        "estimatedDurationMs": 45000,
        //        "transcriptPolicy": "hidden_until_submitted",
        //        "segments": [
        //          {
        //            "segmentId": "seg_1",
        //            "speakerTag": "female1", // Choose female1-4 or male1-4 for multi-voice reading
        //            "speakerLabel": "Lecturer",
        //            "text": "Hello students. Today we are talking about..."
        //          },
        //          {
        //            "segmentId": "seg_2",
        //            "speakerTag": "male1", // Choose female1-4 or male1-4
        //            "speakerLabel": "Student",
        //            "text": "Excuse me, professor..."
        //          }
        //        ],
        //        "taggedScript": "[female1]Hello students. Today we are talking about... [male1]Excuse me, professor..."
        //      }
        // 6. CRITICAL QUESTION PROMPT RULE:
        //    * EVERY task's "prompt" field MUST contain the actual specific question to be answered (e.g., "What was the main outcome of the Immigration Act of 1965?" or "Why does the speaker recommend...?").
        //    * NEVER set the "prompt" field to generic instructions (e.g. "Listen to the lecture and answer the questions below. Choose the best answer (A, B, or C) for each question.").
        //    * If there are general instructions/introductions, put them inside the task's "instructions" field, and put the ACTUAL specific question inside the "prompt" field! The user needs a real question to choose the best option. Do not leave the question text blank or generic.
        // 7. CRITICAL RULE FOR "toefl_ibt_complete_the_words" or responseSpec.type "complete_words":
        //    * This MUST be generated as a cohesive, paragraph-length C-Test based strictly on the provided SOURCE_TEXT.
        //    * The first sentence of the passage MUST be completely intact and clear (no missing letters or gaps) to establish context.
        //    * Starting from the second sentence, select several key content words (e.g. nouns, verbs, adjectives). For each selected word, keep only its first letter or two (initials) shown, and represent every remaining deleted letter as a single dash "-" (e.g. if the word is "language", render it as "la------" or "l-------").
        //    * Mark each deleted portion of a word with an underscore gap "______" in the passage/stimulus text (e.g. "The la______ was very rich.").
        //    * In "responseSpec.gaps", define each gapId (e.g. "gap_1", "gap_2") corresponding to the underscores in the passage text, and set its "label" to show the word's initial letters followed by dashes for the missing letters (e.g., "la----" or "l------").
        //    * Place the complete C-Test passage with these "______" gaps inside "stimulus.passageText". Do NOT write separate, lists of vocabulary words or definitions; it must be a real context paragraph where the first sentence is intact and subsequent sentences have partial words with initials and dashes as labels!

      ]
    }
  ],
  "scoringPackage": {
    "securityClassification": "candidate_safe_practice",
    "mustBeRemovedFromCandidateHtml": false,
    "scoringModelVersion": "mock_test_2026.1",
    "maximumRawScore": ${totalRawScore},
    "taskKeys": {
      // Map EACH taskId to its scoring keys, options, correctResponse details, distractorRationales, keyRationale, workedSolution etc.
    }
  },
  "sourceRegistry": [
    { "sourceId": "src_001", "provider": "User-supplied lesson", "pageTitle": "Custom Lesson Study", "url": null, "retrievedOrVerifiedDate": "2026-07-12", "factsSupported": ["lesson objectives"], "sourceType": "user_supplied_authorized_source" }
  ],
  "qualityAssurance": {
    "sectionCount": 1,
    "taskCount": ${enabledTasks.length},
    "scoredTaskCount": ${enabledTasks.length},
    "maximumRawScore": ${totalRawScore},
    "duplicateIds": [],
    "tasksMissingScoringKeys": [],
    "candidateFieldsContainPrivateAnswers": false,
    "timingCheck": { "declaredMinutes": ${duration}, "taskEstimateMinutes": ${duration * 0.8}, "status": "within_budget" },
    "difficultyDistribution": { "CEFR ${learner.cefrLevel || 'B2'}": ${enabledTasks.length} },
    "skillCoverage": {},
    "sourceCoverage": {},
    "accessibilityChecks": { "allTasksKeyboardOperable": true, "allVisualsHaveAltText": true },
    "audioCueChronologyValid": true,
    "jsonCompletenessConfirmed": true,
    "expertReviewRequired": false
  }
}
`;
};
