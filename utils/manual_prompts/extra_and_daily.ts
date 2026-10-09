
import type { LearnerProfile } from '../../types';
import { getProfileContext } from '../../services/generation/core';

export const getExtraAndDailyPrompt = (type: string, learner: LearnerProfile): string => {
    const profileCtx = getProfileContext(learner);
    
    const baseInstruction = `
--- YOUR TASK (SETUP) ---
You are an expert content generator for an English learning platform.

**CRITICAL INSTRUCTION: STOP! DO NOT GENERATE YET.**
I have NOT provided the source text yet.
1. Read the instructions below to understand the required JSON structure.
2. **DO NOT** output the JSON yet.
3. Your response to THIS prompt should be ONLY: "Please provide the source text or PDF content."
4. I will then paste the text in the next message. Once you receive the text, THEN you must generate the JSON.

--- OUTPUT REQUIREMENTS (ONCE SOURCE TEXT IS RECEIVED) ---
1.  **JSON Code Block**: Your output must be a valid JSON string wrapped inside a Markdown code block (use \`\`\`json at the start and \`\`\` at the end). This allows me to easily copy the code. Do not add introductions or conclusions outside the code block.
2.  **Maximal Detail & Quantity**: Use ALL available tokens to generate the most comprehensive, detailed, and voluminous content possible. Do not summarize or abbreviate. You must cover 100% of the source material.
3.  **Complete Structure**: Generate the full content structure requested. Do not output partial examples.
4.  **Handling Length**: If the JSON is too long for one message, prioritize finishing the structure correctly. The user may ask for "Part 2" if needed, but try to fit a valid, complete JSON object.

${profileCtx}
`;

    switch (type) {
        case 'weeklyChallenge':
            return `${baseInstruction}
--- CONTENT TYPE: Gamified Weekly Challenge ---
Generate a COMPLETE 7-Day Gamified Weekly Challenge based on the raw text provided in the next message.
Theme: Mystery/Detective (Default) or whatever fits the text best.

--- CRITICAL: RICH INTERACTIVE CONTENT ---
For EVERY Day, the \`content\` object MUST include a \`type\` field and a \`content\` field that is a **VALID JSON STRING** (for complex types).
Supported Types: 'questions', 'paragraph', 'list', 'multiple_choice', 'gap_fill', 'error_correction', 'scramble', 'matching', 'flashcard', 'sorting', 'typing_speed', 'speaking_jam', 'speaking_game', 'movie_scene', 'read_aloud', 'contextual_mc', 'listening_mc', 'dictation'.

--- ACTIVITY TYPE SPECIFICATIONS (JSON STRING CONTENT) ---
- **vocabulary_table**: \`[{"word":"...","translation":"...","definition":"...","example":"...","ccq":"..."}]\`
- **matching**: \`[{"left":"...","right":"..."}]\`
- **scramble**: \`[{"sentence":"Chunk|Chunk","hint":"..."}]\`
- **multiple_choice**: \`{"questions":[{"q":"...","options":["A","B"],"a":"A","feedback":"..."}]}\`
- **gap_fill**: \`{"sentences":[{"sentence":"She ___ (go).","answer":"goes"}]}\`
- **flashcard**: \`{"cards":[{"front":"...","back":"..."}]}\`
- **sorting**: \`{"categories":["A","B"],"items":[{"text":"...","category":"A"}]}\`
- **error_correction**: \`{"sentences":[{"sentence":"...","error":"...","correction":"..."}]}\` (CRITICAL: The "error" MUST be exactly one single word, do not use phrases or multiple words for the error, as the UI can only select a single word)
- **speaking_jam**: \`{"topic":"...","bullets":["..."]}\`
- **speaking_game**: \`{"game":"Speaking Game","rounds":[{"type":"truth"|"dare"|"never"|"would_you_rather","text":"..."}]}. You MUST generate exactly: 2-3 Truth questions (type: "truth"), 2-3 Dare challenges (type: "dare"), 2-3 "Never Have I Ever" prompts (type: "never"), and 2-3 "Would You Rather" dilemmas (type: "would_you_rather"), totaling 8 to 12 rounds.\`
- **movie_scene**: \`{"intro":"...","lines":[{"speaker":"...","text":"..."}]}\`
- **dictation**: \`{"sentences":["..."]}\`

--- REQUIRED JSON SCHEMA ---
{
  "theme": "Mystery/Detective",
  "storylineIntro": "Introduction story...",
  "finalReward": "The final secret...",
  "comments": [ { "characterName": "Chad", "characterAvatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Chad", "commentText": "..." } ],
  "days": [
    {
      "dayNumber": 1, "dayName": "Monday", "title": "The Evidence", "skillLabel": "Reading",
      "unlockClue": "Find the code...", "secretCode": "CODE1",
      "color": "#2563eb", "estimatedTime": "20 mins",
      "content": {
        "instruction": "Read carefully...", "genre": "Report",
        "type": "contextual_mc", // MUST SPECIFY TYPE
        "content": "{\\"context\\":\\"...HTML Text...\\",\\"questions\\":[{\\"q\\":\\"...\\",\\"options\\":[\\"A\\",\\"B\\"],\\"a\\":\\"A\\",\\"feedback\\":\\"...\\"}]}",
        "task": "Find the clue."
      }
    },
    {
      "dayNumber": 2, "dayName": "Tuesday", "title": "Interrogation", "skillLabel": "Listening",
      "unlockClue": "Listen...", "secretCode": "CODE2",
      "color": "#16a34a", "estimatedTime": "20 mins",
      "content": {
        "instruction": "Listen to the suspect...", "genre": "Dialogue",
        "type": "listening_mc",
        "content": "{\\"audioScript\\":\\"...\\",\\"questions\\":[{\\"q\\":\\"...\\",\\"options\\":[\\"A\\",\\"B\\"],\\"a\\":\\"A\\"}]}",
        "task": "Who is lying?"
      }
    },
    {
      "dayNumber": 3, "dayName": "Wednesday", "title": "Code Breaker", "skillLabel": "Grammar",
      "unlockClue": "Fix the errors...", "secretCode": "CODE3",
      "color": "#d97706", "estimatedTime": "15 mins",
      "content": {
        "instruction": "Fix the corrupted files...", "genre": "Puzzle",
        "type": "error_correction",
        "content": "{\\"sentences\\":[{\\"sentence\\":\\"He go to school.\\",\\"error\\":\\"go\\",\\"correction\\":\\"goes\\"}]}",
        "task": "Decode the message."
      }
    },
    {
      "dayNumber": 4, "dayName": "Thursday", "title": "The Confrontation", "skillLabel": "Speaking",
      "unlockClue": "Speak up...", "secretCode": "CODE4",
      "color": "#dc2626", "estimatedTime": "25 mins",
      "content": {
        "instruction": "Confront the suspect...", "genre": "Roleplay",
        "type": "movie_scene",
        "content": "{\\"intro\\":\\"...\\",\\"lines\\":[{\\"speaker\\":\\"...\\",\\"text\\":\\"...\\"}]}",
        "task": "Record your lines."
      }
    },
    {
      "dayNumber": 5, "dayName": "Friday", "title": "Vocabulary Vault", "skillLabel": "Vocab",
      "unlockClue": "Unlock the vault...", "secretCode": "CODE5",
      "color": "#9333ea", "estimatedTime": "20 mins",
      "content": {
        "instruction": "Match the clues...", "genre": "Game",
        "type": "matching",
        "content": "[{\\"left\\":\\"...\\",\\"right\\":\\"...\\"}]",
        "task": "Complete the set."
      }
    },
    {
      "dayNumber": 6, "dayName": "Saturday", "title": "Speed Chase", "skillLabel": "Fluency",
      "unlockClue": "Type fast...", "secretCode": "CODE6",
      "color": "#ea580c", "estimatedTime": "15 mins",
      "content": {
        "instruction": "Type the report...", "genre": "Challenge",
        "type": "typing_speed",
        "content": "{\\"text\\":\\"...\\"}",
        "task": "Beat the clock."
      }
    },
    {
      "dayNumber": 7, "dayName": "Sunday", "title": "Case Closed", "skillLabel": "Review",
      "unlockClue": "Final exam...", "secretCode": "FINAL_CODE",
      "color": "#059669", "estimatedTime": "30 mins",
      "content": {
        "instruction": "Submit your report...", "genre": "Exam",
        "type": "multiple_choice",
        "content": "{\\"questions\\":[{\\"q\\":\\"...\\",\\"options\\":[\\"A\\",\\"B\\"],\\"a\\":\\"A\\"}]}",
        "task": "Solve the mystery."
      }
    }
  ]
}
`;

        case 'learningApp': // Review App (formerly Learning App) — transcript-based review
            return `${baseInstruction}
--- CONTENT TYPE: Review App (Transcript-Based Review Game) ---
This is a REVIEW APP: it turns a REAL recording of the learner speaking in class into a bite-sized review game. Work in TWO steps:

**STEP 1 — ASK FOR THE TRANSCRIPT (DO NOT GENERATE ANYTHING YET):**
Your first reply must ONLY ask the user for: (1) the TRANSCRIPT of what the learner actually said in class (their real words, however imperfect), and (2) optionally the lesson topic. Do not invent the lesson. Wait for the transcript.

**STEP 2 — ANALYZE THE TRANSCRIPT LIKE AN EXPERT SPEECH COACH:**
The transcript contains mispronunciations, wrong words, wrong grammar and maybe nonsense spellings. Be SUPER SMART: infer the TOPIC and what the learner TRIED to say from context, tone and topic — never mock the mistakes and never take them literally. For each learner error, identify: the intended sentence, the correct form, the error type (pronunciation / vocabulary / grammar / word order), and a plain-language explanation.

Then generate the Review App JSON (same 4-level structure below). The lesson content = the CORRECTED language + the learner's own attempts as practice material. Every activity item MUST carry:
- \`learnerSaid\`: the learner's original words (verbatim from the transcript, including the mispronunciation — e.g. "I goed to the libary yesterday")
- \`corrected\`: the corrected sentence ("I went to the library yesterday")
- \`errorType\`: "pronunciation" | "vocabulary" | "grammar" | "word order"
- \`explanation\`: 1-2 sentences in 2nd person explaining the fix simply
- \`examples\`: 2 fresh example sentences using the corrected form (new content, not the learner's sentence)
- \`ccq\`: 2-3 Concept-Check Questions (short yes/no or one-word questions that prove the learner understood the rule — e.g. "Is it today or yesterday?")
- \`feedback\`: warm 2nd-person text that FIRST quotes what they said ("You said: ..."), then shows the fix, then an example and ONE ccq.

--- CRITICAL: STAND-ALONE APP RULE ---
**NEVER** assume the learner has the text. For EVERY Question/Item, you MUST include the source material (Text or Audio Script) directly within that item's object. The corrected sentence is the basis of every question; the learner's original attempt appears in the feedback.

--- STRUCTURE: 4 LEVELS (MANDATORY COUNTS) ---
**Level 1: Foundations (6 Activities, 6 Items each)** — Matching (corrected word ↔ simple definition), Scramble (build the corrected sentence), Pronunciation (say the corrected sentence aloud), True/False (Listening, decide if the sentence is the learner's version or the corrected one), Multiple Choice (choose the correct form), Dictation (write the corrected sentence).
**Level 2: Integrated Skills (5 Activities, 6 Items each)** — Audio Matching, Cloze (fill the corrected word), True/False (Read+Listen), Multiple Choice (choose WHY the learner's version was wrong), Scramble.
**Level 3: Complex Integration (4 Activities, 6 Items each)** — Cloze, Multiple Choice (mix corrected + new sentences), Matching (error type ↔ example), Dictation.
**Level 4: Mastery (3 Activities, 6 Items each)** — Multiple Choice, Dictation, True/False — all items reuse ONLY the learner's real errors.

--- CONTENT STRINGS FORMAT ---
The \`content\` field for each activity MUST be a valid JSON string.
- 'cloze': \`{ "items": [ { "text": "I [went] home.", "hint": "past go", "feedback": "..." } ] }\`
- 'audio_matching': \`{ "pairs": [ { "audioScript": "...", "term": "...", "definition": "..." } ] }\`
- 'true_false'/'multiple_choice': \`{ "items": [ { "context": "...", "audioScript": "...", "question": "...", "options": ["A","B"], "correctIndex": 0, "feedback": "..." } ] }\`
- 'matching': \`{ "pairs": [ { "left": "...", "right": "..." } ] }\`
- 'scramble': \`{ "items": [ { "sentence": "Chunk | based | sentence", "feedback": "..." } ] }\`
- 'dictation': \`{ "items": [ { "text": "...", "audioScript": "...", "feedback": "..." } ] }\`

--- FEEDBACK FORMAT (EVERY ITEM) ---
The feedback box must be a COMPLETE mini-lesson on the learner's real error:
"You said: **<learner's original words>**". Then the corrected form, then 1-2 example sentences, then 1 Concept-Check Question the learner must answer in their head ("Quick check: ..."). Explain pronunciation fixes with simple spellings (e.g. "library = LI-bra-ry"). Never shame — always praise the attempt first.

--- MOBILE VIEW ---
Design for phones first (390px): one activity on screen, big tap targets, readable 16px+ text, no side-by-side columns narrower than 160px.

--- REQUIRED JSON SCHEMA ---
{
  "sections": [
    {
      "title": "Level 1: Foundations", "color": "#58cc02", "xpReward": 100,
      "activities": [
        { "type": "multiple_choice", "title": "Reading", "skillLabel": "Reading", "skillIcon": "fas fa-book", "content": "{...json string...}" }
      ]
    }
  ]
}
`;

        case 'printableWorksheet':
            return `${baseInstruction}
--- CONTENT TYPE: Printable Worksheet ---
Generate a professional, printable "Official Worksheet" based on the text provided in the next message.

**Requirements:**
1.  **Reading Comprehension**: A section with the text (or a summary) and questions.
2.  **Vocabulary Check**: A matching or fill-in-the-blank exercise.
3.  **Grammar Focus**: Exercises testing a specific grammar point.
4.  **Writing Prompt**: A short essay or paragraph writing task.
5.  **Format**: Use clear headers. Use underscores (_______) for answer spaces.

--- REQUIRED JSON SCHEMA ---
{
  "sections": [
    { "title": "Reading", "instruction": "Read and answer.", "content": "Text and questions..." }
  ],
  "answerKey": "Key..."
}
`;

        case 'studyGuide':
            return `${baseInstruction}
--- CONTENT TYPE: Study Guide ---
Create a premium "Interactive Study Guide" package based on the text provided in the next message.

--- REQUIREMENTS ---
1.  **Audio Podcast Script**: "Deep Dive" style podcast script (>2000 words). Host (Female) & Expert (Male). Format: \`<b>Host:</b> ...\`
2.  **Deep Analysis Slides**: 8-12 detailed slides. HTML content, Usage Notes, Personalized Examples, Comparison, Common Errors.
3.  **Gamified Flashcards**: 30-35 high-quality flashcards. 
    - Fields: Term, Part of Speech, Register, Definition, Examples (2), Would You Rather (Scenario + A/B + Consequences), CCQ (Question + Answer).

--- REQUIRED JSON SCHEMA ---
{
  "audioOverview": { "title": "Podcast", "script": "..." },
  "summarySlides": [
    { "slideNumber": 1, "title": "...", "content": "...", "usageNotes": "...", "personalizedExamples": ["..."], "comparison": "...", "commonErrors": "...", "bulletPoints": ["..."] }
  ],
  "flashcards": [
    { "term": "...", "partOfSpeech": "...", "register": "...", "definition": "...", "examples": ["..."], "wouldYouRather": { "optionA": "...", "optionB": "...", "consequenceA": "...", "consequenceB": "..." }, "ccq": { "question": "...", "answer": "..." } }
  ]
}
`;

        case 'slides':
            return `${baseInstruction}
--- CONTENT TYPE: Slide Presentation ---
Generate a comprehensive Slide Package based on the text provided in the next message.

--- PART 1: VISUAL SLIDES ---
Create 6-8 slides.
- **Keywords Section**: HTML Table.
- **Examples**: Personalized.
- **Comprehension**: 3-4 Q&A.
- **Strategy**: Actionable guide.
- **Dialogue**: Long (>8 lines).
- **Grammar**: Logic rules.

--- PART 2: SLIDE EXPLAINER ---
Generate a Mind Map and detailed Notes for every slide.

--- REQUIRED JSON SCHEMA ---
{
  "slides": [
    {
      "slideNumber": 1, "title": "...", "visualCue": "...",
      "keywordsSection": { "title": "...", "content": "..." },
      "examplesSection": { "title": "...", "content": "..." },
      "comprehensionSection": { "title": "...", "questions": [{"q":"...","a":"..."}] },
      "strategySection": { "title": "...", "content": "..." },
      "dialogueSection": { "title": "...", "content": "..." },
      "grammarSection": { "title": "...", "content": "..." }
    }
  ],
  "explainer": {
    "mindMap": "...",
    "notes": [
        { "slideNumber": 1, "context": "...", "warmUpActivity": "...", "keyVocabularyAndConcepts": "...", "deeperComprehension": { "shortAnswer": "...", "criticalThinking": "...", "exampleGeneration": "..." }, "coreLectureNotes": "...", "practicalApplication": "...", "discussionPrompts": { "for": "...", "against": "..." }, "culturalConnection": "...", "commonMisconceptions": "...", "caseStudyExample": "...", "summaryAndTakeaways": "..." }
    ]
  }
}
`;

        case 'simulations':
            return `${baseInstruction}
--- CONTENT TYPE: Simulations ---
Generate an array of distinct, interactive, voice-based simulation scenarios based on the text provided in the next message.

--- REQUIREMENTS ---
1.  **Sequential Scenarios**: The scenarios should be inspired by the events or topics in the text.
2.  **Dialogue Mood**: Dramatic/Engaging.
3.  **Coherence**: Recycle specific vocabulary and grammar from the text.
4.  **Dialogue Length**: 8-12 turns per dialogue.
5.  **Characters**: 1 to 3 characters per scenario depending on the genre. A classic dialogue/roleplay needs 2-3. A lecture/monologue needs 1. If multiple characters are present, one MUST be the learner unless otherwise specified in the genre instructions. Name new characters dynamically or use those provided.
6.  **Student Dialogue**: If the learner is a speaker, in \`dialogueForStudent\`, replace the learner's full lines with keyword prompts (e.g., "You: [reservation, name]"). If it is a monologue with speaker, leave \`dialogueForStudent\` empty.
7.  **Quantity**: You MUST generate at least 3-5 scenarios for EVERY genre specified in the constraints. If 3 genres are requested, output exactly 9 to 15 full objects in the array. Never stop at just 3 total.

--- REQUIRED JSON SCHEMA ---
[
  {
    "title": "Scenario 1 Title",
    "scenario": "Context description...",
    "characters": [ { "name": "LearnerName", "voice": "Zephyr" }, { "name": "Other", "voice": "Kore" } ],
    "dialogue": [
        { "speaker": "Other", "line": "Hello!", "emotion": "cheerful" },
        { "speaker": "LearnerName", "line": "Hi there.", "emotion": "neutral" }
    ],
    "dialogueForStudent": "Other: Hello!\\nYou: [greeting]",
    "discussionQuestions": {
        "comprehension": ["Q1", "Q2"],
        "speaking": ["Q1", "Q2"],
        "synthesis": ["Q1"]
    },
    "practicePrompt": "You are at...",
    "systemInstructionForPractice": "You are a..."
  }
]
`;

        case 'dailyLesson':
            return `${baseInstruction}
--- CONTENT TYPE: Daily Lesson ---
Generate a personalized Daily English Lesson (10-step structure) based on the text provided in the next message.

--- REQUIREMENTS ---
1. **Genre**: Unique.
2. **Warm-up**: 3 Q&A.
3. **Keywords**: 15-20 items.
4. **Dialogue**: 2 chars, >600 words.
5. **Reading**: 3 levels (Basic, Int, Adv). Each >750 words. HTML formatted.
6. **Slides**: 9 analytical slides.
7. **Radio Drama**: Script for multiple chars.
8. **Discussion Corner**: Question + 4 comments.
9. **Test**: 10 MCQs.
10. **Secret Code**: Reveal.

--- REQUIRED JSON SCHEMA ---
{
  "lessonTitle": "...", "genre": "...", "imagePrompt": "...", "secretCode": "...",
  "warmUpQuestions": [{"question":"...","answer":"..."}],
  "audioKeywords": [{"word":"...","definition":"...","example":"..."}],
  "audioContext": "...",
  "audioDialogue": { "script": "...", "characters": [{"name":"...","voice":"...","role":"..."}] },
  "textContext": "...",
  "article": { "basic": "...", "intermediate": "...", "advanced": "..." },
  "languageAnalysisSlides": [{"level":"Basic","title":"...","grammarPoint":"...","meaning":"...","example":"...","alternative":"...","commonMistake":"..."}],
  "radioDramaScript": "...",
  "radioDramaCharacters": [{"name":"...","voice":"..."}],
  "discussionQuestion": "...",
  "discussionAnswer": "CharacterName",
  "comments": [{"characterName":"...","comment":"..."}],
  "quiz": [{"question":"...","choices":["..."],"correctAnswers":["..."]}]
}
`;

        case 'conversationGame':
            return `${baseInstruction}
--- CONTENT TYPE: Conversation Game ---
Generate a branching, multi-character, voice-only conversation game graph based on the text provided in the next message.
Structure: Start (3 choices) -> Mid (2 choices) -> End (Lose/Win).

--- REQUIREMENTS ---
1.  **Characters**: 2-3 distinct characters with emojis and voices.
2.  **Dialogue**: Natural, emotional, >8 turns per node.
3.  **Winning Path**: Reveal secret code at \`end_win\`.
4.  **Win Node Content**: Keywords + Discussion Questions.

--- REQUIRED JSON SCHEMA ---
{
  "secretCode": "...", "introduction": "...",
  "characters": [{"name":"...","emoji":"...","voice":"...","gender":"...","personality":"..."}],
  "game_graph": {
    "start": { "dialogue": [{"speaker":"...","line":"...","emotion":"..."}], "choices": [{"text":"...","next":"mid_1"}] },
    "mid_1": { "dialogue": [...], "choices": [...] },
    "mid_2": { "dialogue": [...], "choices": [...] },
    "mid_3": { "dialogue": [...], "choices": [...] },
    "end_lose_1": { "dialogue": [...] },
    // ... end_lose_2 to 5 ...
    "end_win": { 
        "dialogue": [...], 
        "keywords": [{"word":"...","definition":"..."}], 
        "discussionQuestions": ["..."] 
    }
  }
}
`;
        
        case 'partyMode':
            return `${baseInstruction}
--- CONTENT TYPE: Party Mode Arena ---
Create a massive "Party Mode" Competitive Game Package (64 items) with 12 distinct game modes based on the text provided in the next message.

--- WHERE THE CONTENT COMES FROM (NON-NEGOTIABLE) ---
Every question, clue, statement, alibi, line and card in this package is built from the
SOURCE TEXT the tutor pastes, and from nothing else.
- **LANGUAGE BELOW THE LEVEL**: write all of it ONE STEP BELOW the learner's CEFR
  level. Short sentences. The most common word that carries the meaning. No idiom the
  class has not met, no structure they have not been taught, no sentence over ~15
  words. The source text is the challenge — the language wrapped around it must never
  be. A clue nobody can read is a clue nobody can answer.
- **NO INVENTED FACTS AS QUESTIONS**: nothing in a question, option, statement, alibi,
  line, card or clue may be invented about the learner, their family, their job,
  their country, their week or their opinions. The game is ABOUT THE LESSON: its
  people, its places, its vocabulary and its grammar. If an item could only be
  answered by knowing the learner, it is the wrong item.
- **PERSONALISATION LIVES IN THE FEEDBACK ONLY**: the one place you use what you know
  about the learner is the teaching layer — the examples, the mini-lesson steps, the
  speaking task, the encouragement and the taunt lines. That is where "remember your
  Monday meeting?" belongs. Never in the question.
- **EVIDENCE MUST SHIP WITH THE ITEM**: if a question can only be answered from a text
  or a recording, that text or recording MUST be inside the same JSON object — the
  context field for reading, the audio script for listening. Never refer to "the
  passage" or "the recording" without pasting it into the item.
- If the source text does not contain enough material for a required number of items,
  ask the SAME ground from a different angle. Never invent material the lesson did
  not teach, and never pad with generic quiz filler.

--- DIFFICULTY IS THE POINT (READ FIRST) ---
Every guessing game in this package must be genuinely HARD to guess. A clue that
names the answer, or a line that only fits one role, is a failed clue.
- Never state the answer, the role, the location or the emotion inside a clue.
- Give each character/card a line that would fit at least TWO different answers.
- Put the obvious hint and one deliberate red herring in the same sentence.
- Assume a smart class: if they can guess on the first clue, rewrite the clue.

--- CRITICAL QUANTITY REQUIREMENT (READ TWICE) ---
The 8×8 board is filled from the GRID questions. The special games listed below are
pulled OUT of the grid and played separately. So the package you return contains:

  1. AT LEAST **64 GRID QUESTIONS** — only these types: 'multiple_choice',
     'reading_comp', 'listening_comp', 'vocab_smash', 'grammar_gladiator'.
     64 questions means 64 DIFFERENT questions: no reused question stems, no two items
     with the same answer string, and no two testing the same grammar point or word.
     A board made of fewer than 64 grid questions forces the game to ask the class the
     same question twice, which is the one thing a competitive class will notice.
  2. OF THOSE 64, **AT LEAST 50 FULLY-FLEDGED QUESTIONS** — every requirement of the
     QUALITY BAR below, including the complete colour-coded feedback package.
  3. PLUS the special-game items under SPECIAL GAME TYPES (they sit on top of the 64
     and do NOT count towards it).
  4. PLUS 6 'social_deduction' items (3 Mafia, 3 Werewolf).

Budget your output accordingly: a short or repetitive board is a failed lesson.

--- SPECIAL GAME TYPES (MANDATORY COUNTS & DETAILS) ---
Ensure you generate the exact counts and DEEP details requested for these special games:

1.  **Alibi Puzzle ('alibi_puzzle') - GENERATE 3 ROUNDS**:
    -   **Context**: Populate the \`context\` field with a detailed **Situation/Context** string describing the crime/event (MUST be > 100 words).
    -   **Suspects**: Generate 5 suspects in the \`suspects\` array.
    -   **Alibis**: Each suspect's \`alibi\` string MUST be **> 80 words**. They must tell a detailed story.
    -   **Logic**: ONE suspect's alibi MUST contradict **a fact stated in the context**, not a suspicion — write the context so that fact is checkable (a log, a camera, a time, a locked door), and make the guilty alibi break it. Name the exact fact in \`explanation\` so the tutor can point at it. \`isGuilty: true\` on that suspect only.
    -   **Genders**: every suspect needs \`"gender": "male"\` or \`"female"\`, mixed across the five. The game reads each alibi aloud in a voice that matches the character, so a missing gender means a man may speak in a woman's voice.

2.  **Keep Talking ('keep_talking')**:
    -   **Content**: You MUST populate the \`bombTasks\` array with **20+ items**.
    -   **Logic**: Tasks must be short, urgent prompts using Lesson Vocabulary (e.g., "Define 'Efficiency'", "Spell 'Bureaucracy'", "Use 'Pivot' in a sentence").
    -   **Schema Check**: Ensure the \`bombTasks\` key is present in the object.

3.  **Pictionary ('pictionary') - GENERATE 5 ROUNDS**:
    -   **Question**: a short SCENE to draw, not a single word. Format: "Draw: <one clear sentence describing something that happens in the lesson>" — for example "Draw: the barista pours the milk while the dog waits by the door".
    -   **Source**: the scene MUST come from the source text — its people, places and actions. Never a generic word list.
    -   **Language**: below the learner's level, one idea per clause, present simple or continuous, 12 words maximum.
    -   **Answer**: the same scene in a few words, so the tutor can check the drawing (for example "barista pouring milk, dog waiting").
    -   **Why a scene and not a word**: the drawer has to talk while they draw and the class has to ask questions. A single noun gives them nothing to say, which is where the language practice was going.

4.  **Concept Link ('concept_icons')**:
    -   **Content**: Generate exactly **5 items**.
    -   **Data**: Provide 3 **EMOJIS** in the \`icons\` array (e.g. ["⚓", "🧠", "💡"]).
    -   **Question**: The hidden concept keyword connecting them.

5.  **Hot Seat ('hot_seat')**:
    -   **Content**: You MUST populate the \`hotSeatQuestions\` array with **EXACTLY 25 DISTINCT ITEMS**.
    -   **Flooding**: These 25 items must AGGRESSIVELY repeat the main grammar and vocabulary.

6.  **Taboo Titan ('taboo_titan')**:
    -   **Content**: You MUST populate the \`tabooCards\` array with **AT LEAST 20 DISTINCT CARDS**.
    -   **Data**: Each card has a \`target\` and **EXACTLY 5 \`forbidden\` words**.

7.  **Sentiment Analyst ('sentiment_analyst') - GENERATE 10 ROUNDS**:
    -   **Data**: Populate \`sentimentData\`.
    -   **Emotion**: Angry, Happy, Sad, Secretive, Robot, Opera Singer, Sleepy.
    -   **Line**: A **30-45 word** monologue built from the SOURCE TEXT — a person from the lesson talking about what the lesson is about, in the lesson's vocabulary. Every word must be sayable by the learner, so keep it a step below their level. Not a made-up monologue about the learner's own life.

8.  **Spyfall ('spyfall') - GENERATE 3 ROUNDS**:
    -   **Data**: Populate \`spyfallData\`.
    -   **Context**: \`location\` / \`job\` come from the SOURCE TEXT — the place and the work the text is about (a hospital ward, an airport hall, a startup office). Not the learner's own city or job, and not a place the lesson never mentions.
    -   **Players**: 6 players. One is Spy.
    -   **Statements**: For EVERY player, write a statement **35-55 words** long — long enough to hold detail, short enough to read on one screen. Non-spies give detailed info. Spy is vague.
    -   **Difficulty**: the spy's statement must NOT be obviously vague — it should be defensible. No player says the location by name.
    -   **Genders**: every player needs \`"gender": "male"\` or \`"female"\`, three of each. The game reads every statement aloud in a voice that matches that character, so the class hears six different people rather than one narrator.

9.  **Hidden Roles — Mafia AND Werewolf ('social_deduction') - GENERATE 6 ITEMS (3 with variant 'mafia', 3 with variant 'werewolf')**:
    -   **What it is**: the class hears one short statement from every character in turn, then has to work out who holds the dangerous role (mafia / werewolf) and who is a plain innocent. Nobody's role is announced until the end — only their line gives them away, and it never says it outright.
    -   **Characters**: EXACTLY 8 characters per item, each with a name, a role, a team, an avatar seed and one statement.
    -   **Roles — variant 'mafia'** (use only these): 'Mafia Boss', 'Goon', 'Detective', 'Doctor', 'Bodyguard', 'Jester', 'Villager', 'Serial Killer'. Exactly 2 of the 8 belong to team 'mafia'.
    -   **Roles — variant 'werewolf'** (use only these): 'Alpha Wolf', 'Werewolf', 'Seer', 'Healer', 'Hunter', 'Witch', 'Tanner', 'Villager'. Exactly 2 of the 8 belong to team 'werewolf'.
    -   **Setting**: one sentence of scene-setting grounded in the lesson topic (a company, a ship, a village, a school trip).
    -   **Statements (the hard part)**: each statement must be 20-40 words, must fit the character's role only INDIRECTLY, and must be written so that at least two different roles could have said it. Innocents may hint at suspicions and give false leads. The dangerous roles must sound helpful and reasonable, never villainous.
    -   **No giveaways**: never use the role's own name, never say 'I am innocent', never use the words mafia, werewolf, innocent, guilty, liar or suspicious inside a statement.
    -   **A separate "tell" for every character (this is the difficulty dial)**: alongside the statement, give each character ONE extra sentence under \`"tell"\` that narrows them towards their own team if the class listens carefully — still in the character's voice, still never naming a role. A tell for a hidden role should show the character knowing more than they should, protecting someone unnamed, or answering to one person; a tell for an innocent should offer a checkable alibi or a plain statement of what they did. The game decides how many of the eight tells actually appear in a round (Easy shows three, Standard two, Brutal none), so every character needs one of equal quality — do not weaken the tells to compensate. The end-of-round report quotes them, so a tell that reads as a giveaway of the role rather than a clue towards the team is a bug.
    -   **Solution**: list which character holds the dangerous roles so the tutor can reveal it.

--- STANDARD GRID QUESTIONS (FILL THE REST) ---
Fill the remaining slots in the 64-item grid with these high-quality types:

- **Multiple Choice ('multiple_choice')**:
  - Question: A difficult grammar or vocabulary question.
  - Options: 4 distinct choices.
- **Reading Comp ('reading_comp')**:
  - Context: An authentic short text (email, news snippet) > 50 words.
  - Question: Inference or detail check.
- **Listening Comp ('listening_comp')**:
  - Context: A realistic audio script > 50 words.
  - Question: What did the speaker mean?
- **Vocabulary Smash ('vocab_smash')**: Definition matching.
- **Grammar Gladiator ('grammar_gladiator')**: Error correction.

--- QUALITY BAR: WHAT "FULLY-FLEDGED" MEANS (50 of the 64 at minimum) ---
A question counts as fully-fledged only when ALL of these are true:
1.  It is worth asking — it tests a decision (a distractor that catches one specific
    mistake, a collocation, a register choice, an inference from the context), not a
    fact anyone could guess.
2.  It has EXACTLY 4 options of similar length and register, exactly one correct, and
    each wrong option is a mistake a real learner at this level actually makes.
3.  It ships the complete colour-coded feedback package described below, with media
    wherever media teaches something the words cannot.
4.  It is anchored to the lesson text, the learner's level and their interests.
5.  It is not a rewording of any other item and shares no answer string with one.
If you cannot reach 50 at that standard, RAISE THE BAR OF THE EXISTING ONES —
never pad the list with "What did the speaker mean?"-style filler.

--- FEEDBACK: A COLOUR-CODED MINI LESSON AFTER EVERY GRID QUESTION ---
The moment the answer is revealed the board shows this, colour-coded by block. It is
the teaching moment of the game, so it is as long as it needs to be — aim for a
2-minute mini lesson from the four blocks together:

    "feedback": {
      "headline": "One short, warm line about what just happened.",
      "correct":  "Why the right answer is right — name the rule. (shown GREEN)",
      "wrong":    "What EACH wrong option reveals, so whoever chose it learns. (RED)",
      "rule":     "The form or pattern, plus 2-3 model sentences. (BLUE)",
      "vocab":    "The key word/chunk, one collocation, one trap. (AMBER)",
      "steps":    ["Step 1 …", "Step 2 …", "Step 3 …"],  // 2-4 steps: the mini lesson
      "examples": ["Model sentence 1", "Model sentence 2"],
      "speak":    "One short speaking task the class answers aloud.",
      "media":    [{ "kind": "image|gif|audio|video", "url": "https://…", "caption": "What to notice" }]
    }

MEDIA RULES (this is what makes the feedback land — and how not to break it)
  · ONLY real, stable, public URLs (Wikimedia Commons, Unsplash, Giphy, YouTube, a
    direct mp3/ogg pronunciation clip). NEVER invent a URL — if you do not have a link
    you trust, OMIT the media array for that question rather than guess. A broken image
    on a projector costs more than a missing one.
  · "video" = a YouTube link (watch or short form; it is embedded), "audio" = a direct
    audio file, "image"/"gif" = a direct image file.
  · 1-3 media items per question at most, and only where it teaches something the
    words cannot: a real object, a gesture, a pronunciation, a scene, a false friend.
  · Every media item needs a caption saying what to look at or listen for.
  · The tutor can also attach media later with Lesson Settings → Add Media; media you
    do not include is never a blocker.

--- REQUIRED JSON SCHEMA ---
{
  "gameTitle": "...", "gameDescription": "...",
  "powerUps": ["..."],
  "questions": [
    {
      "id": "q1", 
      "type": "...", // 'multiple_choice', 'alibi_puzzle', 'keep_talking', 'pictionary', etc.
      "question": "...", 
      "answer": "...", 
      "options": ["..."], // Mandatory 4 options for MC
      "context": "...", // MANDATORY for reading_comp, listening_comp and alibi_puzzle: the actual text (or the audio script) travels inside the item, never a reference to one
      "points": 10, "skill": "...", "difficultyLevel": "...", "taunt": "...", "motivation": "...",
      "hint": "...", "explanation": "...", "deepDive": "...", "examples": ["..."], "speakingCCQ": "...",
      "feedback": {"headline":"...","correct":"...","wrong":"...","rule":"...","vocab":"...","steps":["..."],"examples":["..."],"speak":"...","media":[{"kind":"image","url":"https://...","caption":"..."}]}, // MANDATORY on every grid question
      
      "hotSeatQuestions": ["..."], // Only if hot_seat
      "tabooCards": [{"target":"...","forbidden":["..."]}], // Only if taboo
      "suspects": [{"name":"...","gender":"male|female","alibi":"...","isGuilty":false}], // Only if alibi — 5 suspects, mixed genders, exactly one isGuilty, and the guilty alibi contradicts a stated fact
      "bombTasks": ["Task 1", "Task 2", "Task 3"], // MANDATORY for 'keep_talking'. Must have 20 items.
      // pictionary has no extra field: the statement to draw goes in "question" ("Draw: …") and the tutor's check in "answer"
      "spyfallData": {"location":"...","job":"...","players":[{"name":"...","gender":"male|female","avatarSeed":"...","statement":"... (35-55 words)","isSpy":false}]}, // Only if spyfall — exactly 6 players, 3 of each gender, one isSpy
      "variant": "mafia", // Only if social_deduction: 'mafia' | 'werewolf'
      "setting": "One sentence of scene-setting, no roles named.", // Only if social_deduction
      "characters": [{"name":"...","avatarSeed":"...","role":"Detective","team":"town","statement":"... (20-40 words, hints indirectly, fits at least two roles)","tell":"... (one extra sentence that narrows them towards their team without naming the role — every character needs one)"}], // Only if social_deduction — EXACTLY 8, two of them team 'mafia' or 'werewolf'
      "solution": ["Name of the character holding the dangerous role", "..."], // Only if social_deduction
      "sentimentData": {"emotion":"...", "line":"...", "keywords":[]}, // Only if sentiment
      "icons": ["..."] // Only if concept_icons
    }
    // ... 64 items total
  ]
}
`;

        case 'placeGame':
            return `${baseInstruction}
--- CONTENT TYPE: Guess the Place Game ---
You must generate a "Guess the Place" interactive map/tour game data structure. 
Generate details for a specific famous city and 5 distinct landmarks/places in that city.

--- REQUIRED JSON SCHEMA ---
{
  "city": "Name of the target city",
  "country": "Name of the target country",
  "quotation": "A famous inspirational quote related to travel or this city that will be revealed slowly.",
  "quotationAuthor": "Author of the quotation",
  "places": [
    {
      "placeName": "Name of the landmark (to be guessed)",
      "descriptiveText": "A massive, very detailed paragraph (500-600 words) describing the place without naming it. Use hints and clues.",
      "funFacts": ["Fact 1", "Fact 2", "Fact 3", "Fact 4", "Fact 5", "Fact 6"],
      "cultureNotes": ["Note 1", "Note 2", "Note 3", "Note 4"],
      "thingsToTry": ["Try this food", "Do this activity", "Try 3", "Try 4"],
      "thingsToAvoid": ["Don't do this", "Avoid that", "Avoid 3", "Avoid 4"],
      "quotationWordRavel": "One chunk of the quotation (e.g. 'To travel is')",
      "audioScript": [
        { "speaker": "TourGuide", "text": "Welcome to a very detailed explanation..." },
        { "speaker": "Tourist", "text": "Is this where the..." },
        { "speaker": "TourGuide", "text": "Yes, and here is more detailed information..." },
        { "speaker": "Tourist", "text": "That is fascinating, what about..." },
        { "speaker": "TourGuide", "text": "Another detailed response..." },
        { "speaker": "Tourist", "text": "I see..." }
      ],
      "situationalDialogue": [
          { "speaker": "Learner", "text": "Excuse me, I'm trying to find..." },
          { "speaker": "Local", "text": "Ah yes, it is just down the street." },
          { "speaker": "Learner", "text": "Thank you. Is it very crowded today?" },
          { "speaker": "Local", "text": "Not right now, you picked a great time!" },
          { "speaker": "Learner", "text": "Perfect, I will head there now." },
          { "speaker": "Local", "text": "Enjoy your visit!" }
      ]
    }
  ] // Must generate precisely 5 places. The 5 places' quotationWordRavel chunks MUST combine to form the full quotation.
}
`;

        default:
            return "Unknown type selected for Extra/Daily.";
    }
};
