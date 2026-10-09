import type { LearnerProfile } from '../../types';
import { getProfileContext } from '../../services/generation/core';

export const getLessonAndSuppPrompt = (type: string, learner: LearnerProfile, config?: any): string => {
    const profileCtx = getProfileContext(learner);
    const translationLanguage = (learner.enableTranslations ?? true) && learner.translationLanguage ? learner.translationLanguage : "L1";
    const contentMultiplier = config?.contentMultiplier || 1;

    // Content multiplier level instructions
    const quantityMultiplierInstruction = `
--- CONTENT QUANTITY MULTIPLIER RULES (${contentMultiplier}x Mode) ---
The user has configured a content multiplier of ${contentMultiplier}x. You MUST strictly follow the respective level instruction:

1x (Standard):
- Focus ONLY on the absolute core and essential concepts of the source text. 
- Restrict to exactly 3 sections.
- For each section, filter out optional or auxiliary activities, and focus exclusively on the core 4-5 activities (e.g. topic preview/warm-up, necessary vocabulary/grammar, core explanation/scaffolding, and real world application).
- Content within activities must be concise, target-focused, and highly relevant.

2x (Deep Dive):
- Provide a broader, more in-depth exploration of the source text.
- Generate exactly 4-5 sections.
- For each section, include a wider selection of 8-10 activities (adding dialogues, communication strategy tips, guided practice, matching, roleplays, or speaking challenges).
- Content within activities must be thorough, offering expanded definitions, more elaborate context, and multiple comprehensive examples.

3x (Exhaustive) [DEFAULT IF >2]:
- Provide the ultimate, completely exhaustive academic walkthrough of the entire source text.
- Generate a massive 6-8 distinct sections.
- For each section, include the absolute FULL template list of activities (all 8 for Explainer, all 17 for Exam Prep, or all 30 activities distributed for Micro Lesson).
- Content within activities must be extremely detailed, with maximum possible word counts (>1500 words per section), multi-turn extensive dialogues, dense visual boxes for pitfalls, collocations, case studies, self-assessments, checklists, adaptive study plans, homework, voice recordings, and essay prompts. Leave absolutely nothing out.
`;

    // Mandatory full-text analysis instruction
    const fullTextAnalysisInstruction = `
--- MANDATORY COMPREHENSIVE TEXT ANALYSIS (NON-NEGOTIABLE) ---
You MUST thoroughly and systematically analyze the ENTIRE provided raw source text from the very first word to the very last word. You are STRICTLY FORBIDDEN from being superficial or lazy—you must NOT just analyze the first section/page, create materials for it, and then stop, omit, or truncate. You must divide the ENTIRE source text into logical parts and cover 100% of the concepts, vocabulary, grammar, and themes present across the FULL text, ensuring equal detail, length, and academic rigor for every single part from start to finish. If you truncate, summarize prematurely, or fail to cover the later parts of the source text, it is considered a critical system failure.
`;

    // Shared learner exclusion instructions
    const learnerDataExclusion = `
--- LEARNER DATA EXCLUSION (CRITICAL) ---
The learner profile below is for PERSONALIZATION of examples and scenarios ONLY.
**NEVER** use the learner's personal facts (name, age, job, interests, hobbies, family details, city, etc.) as quiz answers, test questions, or assessable content.
For example:
- ❌ WRONG: "Where does ${learner.name} live?" or "What is ${learner.name}'s job?"
- ✅ CORRECT: Use their city in an example sentence: "${learner.name} was walking through [their city] when..."
- ✅ CORRECT: Create a scenario about their interest: "Imagine you're at a [their interest] event..."
All quiz/test questions must assess LANGUAGE KNOWLEDGE derived from the SOURCE TEXT, not the learner's biography.
`;

    // Shared answer distribution instructions
    const answerDistribution = `
--- ANSWER DISTRIBUTION (CRITICAL - ANTI-PATTERN DETECTION) ---
You MUST ensure that correct answers are RANDOMLY and EVENLY distributed across all options.
Rules:
1. For multiple choice with 4 options (A/B/C/D): Each letter must be the correct answer roughly 25% of the time across all questions.
2. NEVER have more than 2 consecutive questions with the same correct answer letter.
3. For True/False: Alternate unpredictably. Never have more than 2 consecutive True or False answers.
4. Make ALL distractors plausible. Wrong options must be grammatically correct and semantically related.
5. Avoid "All of the above" or "None of the above" options.
6. The longest option must NOT always be the correct one.
7. Vary the position of the correct answer within the options array for each question.
`;

    // Global formatting rules
    const formattingRules = `
--- GLOBAL FORMATTING RULES (CRITICAL - APPLY TO EVERY TEXT BLOCK) ---
1. All reading passages, lesson text, vocabulary examples, grammar explanations, and listening scripts MUST be formatted as PROPER PARAGRAPHS (flowing prose with line breaks between paragraphs).
2. NEVER use numbered textbook/listen-and-repeat format like "01-01 Listen", "01-02 Repeat", or exercise-style numbering (e.g., "1. It's drizzling / pouring outside."). This is not a textbook reproduction.
3. For multi-character listening dialogues, use [male1], [female3], [male2], [female1], [male3], [male4], [female2], [female4], [child1], [child2] tags at the start of each speaker's line. Example: [male1]Hello there! [female3]Hi John, how are you? The [tag] tells which TTS voice reads that line. After the tag you MAY add a short speaker label (e.g. "A:", "B:", "Alexander:") — the label is displayed in the transcript but never spoken aloud.
4. In any text that will be read aloud (listening scripts, reading passages, vocabulary examples), NEVER include asterisks *, underscores _, tildes ~, hash #, pipes |, backtick characters, curly braces {}, square brackets [] (except voice tags), angle brackets <> (except HTML), or emojis. These symbols will be spoken by the speech synthesizer.
5. LISTENING SCRIPTS ARE READ-ALOUD ACTIVITIES (NON-NEGOTIABLE): Every listening script MUST be delivered as its OWN activity with type "listening_script" and content = ONE string containing the ENTIRE tagged dialogue (each speaker line starts with its voice tag). The platform renders a multi-voice ▶ Play Script button (each [male1]/[female2]/[child1] tag is read by a different Microsoft Azure Natural voice) plus a Show Transcript toggle and per-line play buttons. NEVER put a listening script inside a "paragraph", "list", "reading", "quiz" or "vocabulary" activity — those render as static text with NO player. NEVER write headings like "🎧 Listening Script (Activities 1B and 1C)" as plain text inside content — that heading belongs in the activity's title field, and the script itself goes in the content field of the listening_script activity. NEVER reference "the audio", "the clip", or an external file — the script text IS the audio.
6. Every passage must read like natural, flowing English prose — not like worksheet instructions or textbook exercises.
`;

    // Shared feedback instruction
    const feedbackInstruction = `
--- COMPREHENSIVE FEEDBACK (MANDATORY FOR EVERY ACTIVITY) ---
For EVERY activity object, you MUST include a "comprehensiveFeedback" field containing a detailed HTML string (800-2500 words depending on activity complexity).
This feedback must show answers, explain them, and cover ALL of the following. ADD these to the current requirements — do NOT replace or delete any existing requirements:

1. Address the learner as "You" directly.
2. Explain WHY each answer is correct or incorrect in detail. Compare wrong vs right answers and explain the differences.
3. Provide additional examples and usage tips.
4. Include common mistakes learners make with this content.
5. Suggest memory techniques, mnemonics, analogies, and logic/concentration tricks where appropriate.
6. Reference the learner's interests for relatable explanations.
7. Use HTML formatting (<b>, <i>, <ul>, <li>, <br>, <span style="color:...">) for readability.
8. **HOW, WHEN, WHERE to use** — Explain in detail the real-world contexts where this language is used (e.g., "Use this phrase in business meetings when you need to interrupt politely" or "This grammar structure is common in academic writing, especially in introductions"). Include:
   - **Register/Language Style**: Is it formal, informal, neutral? When is each appropriate?
   - **Setting**: Workplace, classroom, casual conversation, travel, academic, etc.
   - **Location**: Which English-speaking regions/cultures commonly use this?
   - **Speaker Relationship**: Use with boss vs. friend vs. stranger vs. service staff
9. **Mini-Culture Lesson**: Include a brief note about cultural norms, pragmatic expectations, and civic awareness tied to the language point.
10. **Soft Skills Training**: Add a dedicated section on the soft skills this activity develops (e.g., critical thinking, active listening, empathy, teamwork, adaptability, conflict resolution, persuasion, time management).
11. **ESL Strategies**: Provide explicit learning strategies tailored for ESL learners — how to approach similar tasks independently, how to notice patterns in English, how to self-monitor errors.
12. **Phrase Bank**: Include 3-5 useful phrases or sentence frames from the activity that the learner can memorize and reuse in real conversations.
13. **Idiomatic & Slang Equivalences**: For key language points, provide common idiom or slang equivalents used by native speakers (e.g., "very happy" → "over the moon", "I agree" → "You can say that again").
14. **Sample Situational Questions**: Provide 2-3 real-life situational questions related to the activity topic that test the learner's ability to apply the language in new contexts.
15. **Sample Discussion Questions**: Provide 2-3 discussion questions that the learner can use with a tutor or study partner to deepen understanding.
16. **Sample Dialogues**: Include a short sample dialogue (6-10 lines) demonstrating the language point in a natural conversation.
17. **Tips & Strategies**: Include practical tips for mastering the content faster and strategies for avoiding common pitfalls.
18. **Memory & Mental Training**: Include 1-2 exercises for logic, concentration, or memory that reinforce the language point (e.g., word association chains, categorization challenges, mental visualization prompts).
19. **Extension Challenge**: Provide 1-2 "try this at home" tasks that push the learner to use the language in their real life before the next lesson.

**CRITICAL**: Every comprehensiveFeedback field MUST show and explain the actual answers. Do NOT write generic feedback. Compare answer options, explain why each is right/wrong, and discuss nuanced differences between similar choices.
`;

    const cefrLevel = config?.cefrLevel || learner?.cefrLevel || 'B1';
    const isC2 = cefrLevel.trim().toUpperCase() === 'C2';
    const l1 = learner?.l1Language || translationLanguage || "the learner's native language";

    const strictTutorDirective = `
--- FORCIBLE & NON-NEGOTIABLE STRICT LANGUAGE TUTOR DIRECTIVE ---
Act as a strict language tutor for an [learner level] (${cefrLevel}) learner. You MUST forcibly and non-negotiably restrict your language to this level (${cefrLevel}) or lower. Do not use any vocabulary, grammar structures, or sentence lengths that exceed [learner level] (${cefrLevel}). If you must use a word above this level, write it in bold and provide the L2 definition and examples and L1 (${l1}) translation.

${isC2 ? `🔥 SPECIAL C2 LEVEL REQUIREMENT:
Since the learner level is C2, AI MUST purposefully use C2 vocabulary, grammar, complexity, and sophisticated sentence structures throughout the lesson.` : `🔥 SPECIAL C2 & LEVEL REQUIREMENT:
On the other hand, when the learner level is C2 (or when C2 is specified), AI MUST purposefully use C2 vocabulary, grammar, and complexity. For the current specified level (${cefrLevel}), you MUST strictly limit vocabulary, grammar, and sentence length to ${cefrLevel} or lower.`}`;

    const baseInstruction = `
--- YOUR TASK (SETUP) ---
You are an expert content generator for an English learning platform.

${strictTutorDirective}

**CRITICAL INSTRUCTION: STOP! DO NOT GENERATE YET.**
I have NOT provided the source text yet.
1. Read the instructions below to understand the required JSON structure.
2. **DO NOT** output the JSON yet.
3. Your response to THIS prompt should be ONLY: "Please provide the source text or PDF content."
4. I will then paste the text in the next message. Once you receive the text, THEN you must generate the JSON.

--- OUTPUT REQUIREMENTS (ONCE SOURCE TEXT IS RECEIVED) ---
1.  **JSON Code Block**: Your output must be a valid JSON string wrapped inside a Markdown code block (\`\`\`json ... \`\`\`). Do not add introductions or conclusions outside the code block.
2.  **Maximal Detail & Quantity**: Use ALL available tokens. Do not summarize or abbreviate. Cover 100% of the source material.
3.  **Complete Structure**: Generate a full lesson with **MULTIPLE SECTIONS** (minimum 4-6 distinct sections). **CRITICAL:** Do NOT generate a single "example" section.
4.  **Content Fidelity**: ALL questions, vocabulary, grammar points, examples, and exercises MUST be derived directly from the provided source text. Do NOT invent content that isn't in or implied by the source.
5.  **JSON String Content Fields**: When a "content" field requires structured data (arrays, objects), provide it as a **valid JSON string** that can be parsed with \`JSON.parse()\`. Ensure proper escaping of quotes and special characters within these strings.
6.  **SELF-CONTAINED LESSON (CRITICAL & NON-NEGOTIABLE)**: The lesson MUST be completely self-contained and independent. Do NOT include any references to external materials, books, videos, PDFs, page numbers, or the source text itself. You are STRICTLY FORBIDDEN from referring to any pictures, diagrams, text, or page numbers from the source material, and NEVER say "read the text in the book", "according to the text", "as mentioned in the article", or similar. Since these lessons are completely self-contained, if context, paragraphs, stories, or complete exact texts are needed to answer any question, you MUST embed those paragraphs or exact texts directly inside the activity's content itself, and then ask the questions from it. Every instruction, question, and activity must work entirely on its own without requiring external access.

${quantityMultiplierInstruction}
${fullTextAnalysisInstruction}

${learnerDataExclusion}
${answerDistribution}

${profileCtx}
`;

    const settingsInstruction = `
--- SUPPLEMENTARY SETTINGS (MANDATORY) ---
Generate a \`settings\` object in the JSON:
1.  **teacherNotes**: "Tips on how to study". Include strategies for retention, effective usage of the lesson, and a motivational note personalized to the learner. You may use markdown for formatting (e.g., **bold**).
2.  **homeworkChecklist**: 3-5 specific, creative daily tasks (e.g. "Record yourself saying...", "Find 3 examples of..."). CRITICAL: Separate each task by exactly one newline character (\`\\n\`) and strictly DO NOT use bullet points (no \`*\`, \`-\`), numbers, or HTML tags. Just the plain text task.
3.  **materialLinks**: **USE GOOGLE SEARCH (Grounding)** to find 3-5 REAL, HIGH-QUALITY, CURRENT links related to the lesson topic. 
    - Format: \`https://www.google.com/search?q=Your+Search+Query\`
    - Example: \`https://www.google.com/search?q=Past+Simple+vs+Present+Perfect+exercises\`
    - Include YouTube videos, songs, articles, or tools. Format as one URL per line.
`;

    // Shared new activity types documentation
    const newActivityTypes = `
--- ADDITIONAL ACTIVITY TYPES AVAILABLE ---
In addition to the standard types, you may use these enhanced activity types for variety:

'flashcard' — Flashcard deck for spaced repetition review
    Content JSON: \`{"cards":[{"front":"Word/Phrase","back":"Definition/Translation"},...]}\`

'sorting' — Categorization/sorting exercise  
    Content JSON: \`{"categories":["Category A","Category B"],"items":[{"text":"item text","category":"Category A"},...]}\`

'typing_speed' — Speed typing challenge
    Content JSON: \`{"text":"A sentence from the source text to type accurately."}\`

'error_correction' — Find and fix the mistake (CRITICAL: The "error" MUST be exactly one single word copied VERBATIM from the sentence — same spelling, same apostrophes, no added punctuation — because the learner taps ONE word. A phrase, a paraphrase, or a word that is not in the sentence is a hard failure. Every sentence MUST contain a real mistake; never ship a correct sentence as a control item.)
    Content JSON: \`{"sentences":[{"sentence":"She don't like coffee.","error":"don't","correction":"doesn't"},...]}\`

'gap_fill' — Fill in the blanks (CRITICAL: EXACTLY ONE \`___\` gap per sentence!)
    Content JSON: \`{"sentences":[{"sentence":"She ___ (go) to work every day.","answer":"goes"},...]}\`

'taboo' — Taboo Game Cards (interactive deck: the class describes the target word without saying any forbidden word. Each card shows the target WORD and its forbidden WORDS together on one face — the teacher holds the card up and the class reads both at once, so never split them into "front" and "back" fields and never ship a face-down/flip-card payload)
    - 8-12 cards, every word taken from the lesson.
    - EVERY card needs EXACTLY 3 forbidden words — high-frequency words that make the target hard to describe (for "app": phone, download, program). Never repeat the target as a forbidden word, and never pick three words that leave no way to describe it.
    - Use short entries only: ONE word or a two-word phrase per card ("turn off", "connect to"). A sentence as the target cannot be guessed and reads badly on a card.
    - The deck ONLY renders as type "taboo". Never wrap the card JSON inside a "paragraph" activity and never rename the type. Only the fields \`target\` (string) and \`forbidden\` (array of exactly 3 strings) are read — no extra fields.
    Content JSON: \`{"cards":[{"target":"Word","forbidden":["Word1","Word2","Word3"]}]}\`

'pronunciation' — Pronunciation Challenge (alias of pronunciation_check — same interactive renderer)
    Content JSON: \`{"words":[{"word":"Colonel","phonetic":"/ˈkɜːrnəl/","audioScript":"The colonel gave an order."}]}\`

'voice_recording' — Spoken audio recording assessment
    Content JSON: \`{"prompt": "Record yourself explaining...", "text": "Record yourself explaining...", "type": "voice_recording"}\`

'essay_writing' — Free-text paragraph / essay submission
    Content JSON: \`{"prompt": "Write a short paragraph about...", "minWords": 50, "type": "essay_writing"}\`

Use these types strategically to create variety.

--- MULTI-CHARACTER READ-ALOUD (CRITICAL FOR ALL LISTENING ACTIVITIES) ---
Every listening activity is read aloud by the platform's multi-voice TTS engine.
Prefix each speaker line with a voice tag: [male1]…[male5], [female1]…[female5], or [child1]/[child2].
Each tag maps to a DISTINCT voice (children get real child voices), and the transcript highlights
each line karaoke-style while that line is being read aloud. Use the tags in: listening_script
(panel/dialogue scripts), listening_mc audioScript, dictation sentences, gap_transcript audioText,
shadowing model lines, and movie_scene / conversation_roleplay lines. You may add a display-only
speaker name after the tag (e.g. "[female1]Sophia: ...") — the name is shown in the transcript,
never spoken. Not every section needs every type — mix them based on what the source content
naturally supports. You MUST incorporate 'voice_recording' and 'essay_writing' in multiple sections to evaluate productive skills and track progress.

--- 🎙️ TTS-SAFE SPOKEN TEXT (CRITICAL) ---
Everything that is SPOKEN ALOUD is read by the speech engine and — for read_aloud, shadowing, pronunciation
and minimal_pairs — matched word by word against the learner's microphone. Those fields (read_aloud "text",
shadowing model lines, dictation sentences, listening_script / listening_mc audioScript, gap_transcript audioText,
pronunciation / word_stress audioScript, movie_scene and conversation_roleplay lines, voice_recording prompts)
MUST be plain spoken English:
- ONLY letters, spaces, apostrophes, sentence punctuation (. , ? ! — " -) and the [male1]/[female2] voice tags.
- NEVER write intonation or direction arrows (↗ ↘ → ← ↑ ↓ ⇒), brackets, emoji, IPA slashes, bullets, hash marks or any symbol inside spoken text. The engine reads the mark out loud as a word and the microphone can never match it, so the activity stalls on that token forever.
- To show stress or intonation, describe it in comprehensiveFeedback in words, or wrap a stressed word in <b>…</b> (bold is display-only and ignored by the recognizer).
- A spoken field that contains any of these marks is a hard failure — rewrite it before returning the JSON.
`;

    // Shared architecture for EVERY lesson type rendered by the Micro Lesson engine
    // (Explainer, Exam Prep, Conversational, Bilingual Study, Micro Lesson). It encodes what the
    // engine actually supports: paragraph content is injected as raw HTML into a padded activity
    // card, tinted surfaces are built by appending a hex alpha to a --theme-* token, and every
    // data-shaped payload belongs in its own typed activity instead of a prose blob.
    const microLessonTextArchitecture = `
--- MICRO LESSON TEXT ARCHITECTURE (NON-NEGOTIABLE) ---
This lesson is rendered and exported by the MICRO LESSON engine. Everything you write is injected inside a padded activity
card, so YOU own the layout of the text. An undifferentiated wall of prose is a failure. Organise every activity like a
well-set magazine page: short blocks, visible anchors, colour-coded boxes, tables and reflowing grids.

1. ONE IDEA PER BLOCK
   - Never write more than 3-4 sentences (about 90 words) of continuous prose before breaking the flow with a sub-heading,
     a list, a table, a coloured box or a divider.
   - Every ~150 words of prose MUST contain at least one visual organiser (sub-heading, box, list, table, grid, chip row).
   - If one activity would need more than roughly one screen for a single idea, SPLIT it into two activities with their own
     clear titles instead of writing one giant block. Two organised activities always beat one huge one.

2. USE THE RIGHT ACTIVITY TYPE FOR THE SHAPE OF THE CONTENT (CRITICAL)
   - Prose, explanation, instructions, reading text -> type "paragraph" with structured HTML.
   - Word lists with definitions and examples -> type "vocabulary_table" (NEVER a hand-built vocabulary HTML table inside a paragraph).
   - Question sets -> type "questions" (the engine renders a real list card, not prose).
   - Any dialogue/script that should be READ ALOUD by the platform's multi-voice player -> type "listening_script" with the WHOLE
     tagged script in ONE string, each speaker line starting with a voice tag such as [male1] or [female2].
   - Anything data-shaped (tables of records, forms, structured lists, anything you would write as JSON) -> use its dedicated
     interactive type.
   - NEVER put a JSON string or an object dump inside a "paragraph" activity: it renders as visible code.
   - NEVER put plain "Q: ... A: ..." answer pairs in learner-facing content. Model answers, keys and worked solutions belong in
     the activity's "comprehensiveFeedback" field, and only questions/prompts go in "content".

3. STRUCTURED HTML VOCABULARY ("paragraph" content is raw HTML - these patterns ARE the house style)
   - Sub-heading (never h1/h2/h3 - the section already owns those):
     <h4 style="margin:18px 0 8px;color:var(--theme-text);">🟦 Short heading of six words or fewer</h4>
   - Prose paragraph:
     <p style="margin:0 0 12px;line-height:1.75;color:var(--theme-text);">One idea, three sentences maximum.</p>
   - Emphasis inside a sentence: <b>...</b> and <i>...</i> only. No <u>, no markdown (no ** or ##), no ALL-CAPS headings.
   - Bullets: <ul style="margin:0 0 14px 18px;line-height:1.7;">...</ul> - maximum 6 items, about 14 words each.
   - Numbered steps: <ol style="margin:0 0 14px 18px;line-height:1.7;">...</ol> for sequences, procedures and strategies.
   - Vocabulary table (if one is unavoidable inside a paragraph): <table class="vocab-table"> with thead/tbody/tr/th/td.
     NEVER put a <br> or <p> directly inside a table, and never write anything above the opening <table> tag when the table
     should start the card.
   - Pull-quote / key sentence:
     <blockquote class="styled-quote"><b>Key line the learner must remember</b><br><span style="color:var(--theme-text-secondary);">Why it matters</span></blockquote>
   - Responsive stat / card row (never fixed columns):
     <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:14px 0;">...</div>
   - Chips and labels: <span class="tag-chip">Labelled chip</span>
   - Wrong -> right pair:
     <div style="margin:6px 0;"><span style="color:var(--theme-error);text-decoration:line-through;">Wrong version</span>
     <span style="color:var(--theme-success);font-weight:700;"> Correct version</span></div>
   - Checklist item: ☐ one per line inside a list (great for rubrics and homework).
   - Divider between clusters of blocks:
     <hr style="border:none;border-top:1px solid var(--theme-text);opacity:0.12;margin:18px 0;">

4. COLOUR CODE WITH THEME TOKENS - NEVER HARDCODE A COLOUR
   - The exported lesson is themeable (light AND dark). Hardcoded values such as white, #fff, #f8fafc, #1e293b, #e5e7eb,
     dark hex text on a tinted box, or black text on a dark surface break dark mode and are a failure. The same goes for the
     invalid concatenation form var(--theme-info-14) - write var(--theme-info-14) instead.
   - Use ONLY these tokens: --theme-primary, --theme-secondary, --theme-accent, --theme-info, --theme-success,
     --theme-warning, --theme-error, --theme-bg, --theme-surface, --theme-text, --theme-text-secondary.
   - Tints and hairlines are published as their OWN tokens: every alpha step exists as
     --theme-<token>-<alpha>, e.g. --theme-info-14, --theme-success-10, --theme-text-20, --theme-accent-30.
     The alpha belongs INSIDE the name. Writing var(--theme-info-14) is INVALID CSS and the browser drops the whole
     declaration - the background AND every border declared beside it vanish together - so never write it that way.
     Steps available on every token: 08 10 12 14 15 18 20 22 25 30 40 50 55 60. Use -08/-10 for the faintest wash,
     -14 for a tinted box surface, -20 for a hairline or table border, -30 for emphasis borders and chips, -55/-60 for strong fills:
     <div style="background:var(--theme-info-14);border-left:4px solid var(--theme-info);border-radius:10px;padding:14px 16px;margin:14px 0;">
       <strong style="color:var(--theme-text);">🎯 Box title</strong>
       <p style="margin:6px 0 0;line-height:1.7;color:var(--theme-text);">Box body text.</p>
     </div>
   - Keep ONE meaning per colour for the WHOLE lesson and always label the box with a word (never colour alone):
     definition/context -> --theme-info; example/model answer -> --theme-success; warning/trap/exam pitfall -> --theme-warning;
     error/correction -> --theme-error; tip/strategy -> --theme-accent; neutral note -> --theme-text-secondary.
   - Body copy is ALWAYS var(--theme-text); captions and metadata are var(--theme-text-secondary).

5. READABILITY & RESPONSIVENESS
   - Multi-column layouts MUST reflow: display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px.
     NEVER use fixed two/three-column grids, floats, pixel widths for text containers, or pixel font sizes.
   - Prefer short paragraphs and generous line-height (1.7+). Separate clusters with a sub-heading or <hr>, never with empty spacer divs.
   - Media: images max-width:100%;height:auto;border-radius:12px; video in a 56.25% responsive wrapper - never a fixed height.
   - Design for a phone first: the same HTML must read cleanly at about 360px wide and scale up gracefully on a projector.

6. MEDIA FIELDS (do not duplicate)
   - imageUrl / imageCaption / videoUrl / videoCaption render floated inline, magazine-style, beside the body text.
     Use them for the main illustration; only add extra <img>/<iframe> inside "content" when the media IS the content.
`;

    switch (type) {
        case 'explainerLesson':
            return `${baseInstruction}
--- CONTENT TYPE: Explainer Lesson ---
The user will provide a raw text in the next message. Generate a preparatory lesson for the learner to review BEFORE class. It must be detailed and suitable for a 2-hour class.

${microLessonTextArchitecture}

--- EXPLAINER ORGANISATION OVERRIDE (APPLIES TO EVERY ACTIVITY BELOW) ---
The activity list below was written for the old single-document renderer, where each activity was one huge styled HTML blob.
In the Micro Lesson engine every activity is its own card on its own screen, so each one MUST be delivered as a SEQUENCE OF
SHORT LABELLED BLOCKS (sub-head -> 2-4 sentences or a list/table/box -> next sub-head).
- Never deliver a 1000-word "Language You Need", an 800-word "Detailed Breakdown", a 500-word "Communication Toolkit", a
  600-word "Expert Talk" or a 700-1200 word "Case Study" as one continuous block. Split each of those into 4-8 labelled
  sub-blocks, separated by sub-headings or <hr>.
- If an activity carries two different jobs, make it two activities: the dialogue itself belongs in a "listening_script"
  activity, its analysis belongs in a follow-up paragraph activity; the section's word list belongs in a "vocabulary_table"
  activity rather than a hand-built table inside prose.
- Keep the 13 pedagogical steps, the dialogic tutor voice, the translations, and the NO GAMES / NO MATCHING / NO gap-fill rules.
  Only the SHAPE of the text changes: chunked, labelled, scannable.
- Every box, tint, border and heading colour comes from the theme tokens in the architecture rules above. The fixed light hex
  values used in the snippets below are forbidden - treat those snippets as shapes and re-colour them with tokens.

--- DIALOGIC TEACHING VOICE ---
Speak directly to the learner in 2nd person ("You"). Use a warm, encouraging tutor voice. Address them by name (${learner.name}) throughout. Make them feel like you are sitting beside them guiding them step by step.

--- GENERATION INSTRUCTIONS ---
1.  **Sequential Processing (CRITICAL):** Process the raw text in exact order. Sections must follow the source text flow. Create **at least 5-7 distinct sections**.
2.  **Content Derivation:** All content MUST be directly derived from the provided raw text.
3.  **Hyper-Personalization:** Personalize examples using learner's name, interests, and facts (but NEVER as quiz content).
4.  **Formatting:** Use inline styles for colors and styled divs. NO MARKDOWN (no ** or ##). Use <div style="..."> with colored backgrounds, borders, and padding to create visually distinct sections.
5.  **Translations:** If translation language is specified (${translationLanguage}), provide translations for key terms and examples in [square brackets].
6.  **SELF-CONTAINED LESSON (CRITICAL & NON-NEGOTIABLE)**: The lesson MUST be completely self-contained and independent. Do NOT refer to external books, videos, PDFs, page numbers, or the original source text. You are STRICTLY FORBIDDEN from referring to any pictures, diagrams, text, or page numbers from the source material, and NEVER say "read the text in the book", "according to the text", "as mentioned in the article", or similar. Since these lessons are completely self-contained, if context, paragraphs, stories, or complete exact texts are needed to answer any question, you MUST embed those paragraphs or exact texts directly inside the activity's content itself, and then ask the questions from it. Every instruction, question, and activity must work entirely on its own.

${feedbackInstruction}
${settingsInstruction}
${formattingRules}

--- REQUIRED STRUCTURE FOR EACH SECTION ---
For **EVERY SECTION** (minimum 5 sections), include exactly these activities in this order. Each section should be roughly 5X more content than a standard lesson:

1.  **Warm-up** (type: 'paragraph')
    -   Title: '🤔 Think about these questions...'
    -   Content: A detailed HTML paragraph greeting ${learner.name} directly and posing 5 thought-provoking questions connecting the section topic to their life. Use a styled <div> with a light background color. Do NOT use Q&A format. Write in flowing paragraph style.

2.  **Necessary Language** (type: 'paragraph')
    -   Title: '📚 Language You Need'
    -   Content: A comprehensive HTML string (>1000 words) teaching ALL the language tools needed for this section. Extract from the source content what is actually being taught — do NOT default to Present Simple or generic grammar. Teach the SPECIFIC grammar, spoken grammar, lexicalized grammar, and discourse markers that the lesson content requires. Talk directly to ${learner.name}:
        -   <div style="background:var(--theme-info-14);padding:14px 16px;border-radius:10px;margin:12px 0;border-left:4px solid var(--theme-info);"> <b>Grammar</b> — Identify the specific grammar structure(s) from the lesson (e.g., second conditional for hypotheticals, present perfect for experiences, passive voice for formal writing, reported speech for retelling, etc.). Provide a clear formula, examples, and when to use it.
        -   <div style="background:var(--theme-success-14);padding:14px 16px;border-radius:10px;margin:12px 0;border-left:4px solid var(--theme-success);"> <b>Spoken Grammar</b> — Natural speech patterns like ellipsis ("Going? instead of Are you going?"), fillers ("Well...", "You know..."), discourse markers ("Actually...", "The thing is..."), heads ("That restaurant, is it good?"), tails ("It's nice, isn't it?"), and vague language ("sort of", "kind of").
        -   <div style="background:var(--theme-warning-14);padding:14px 16px;border-radius:10px;margin:12px 0;border-left:4px solid var(--theme-warning);"> <b>Lexicalized Grammar</b> — Fixed chunks and constructions like "The more X, the more Y", "It's not that... but...", "What I mean is...", "The reason why... is that...".
        -   <div style="background:var(--theme-text-secondary-10);padding:14px 16px;border-radius:10px;margin:12px 0;border-left:4px solid var(--theme-text-secondary);"> <b>Discourse Markers</b> — Connectives for coherence: sequencing (firstly, meanwhile), contrasting (however, on the other hand), adding (furthermore, moreover), concluding (in short, to sum up).
        -   <div style="background:var(--theme-accent-14);padding:14px 16px;border-radius:10px;margin:12px 0;border-left:4px solid var(--theme-accent);"> <b>Vocabulary & Phrases</b> — For each word/phrase: definition, example sentence, [${translationLanguage}] translation, usage notes, and <span style="font-weight:bold;color:var(--theme-secondary);">Register synonyms</span> in three styles:
          <div style="background:var(--theme-info-12);padding:8px 10px;border-radius:8px;margin:4px 0;font-size:0.9em;">🔵 <b>Formal</b>: [formal synonym/alternative] — use in academic writing, business meetings, official documents</div>
          <div style="background:var(--theme-text-secondary-10);padding:8px 10px;border-radius:8px;margin:4px 0;font-size:0.9em;">⚪ <b>Neutral</b>: [neutral alternative] — use in everyday conversation, emails, general situations</div>
          <div style="background:var(--theme-error-12);padding:8px 10px;border-radius:8px;margin:4px 0;font-size:0.9em;">🟢 <b>Informal</b>: [informal/slang alternative] — use with friends, casual chats, social media</div>
        -   <div style="background:var(--theme-secondary-14);padding:14px 16px;border-radius:10px;margin:12px 0;border-left:4px solid var(--theme-secondary);"> <b>Idiomatic Expressions & Terminologies</b> — Key idioms, collocations, and field-specific terminology from the lesson with explanations.
        -   <div style="background:var(--theme-success-10);padding:12px 14px;border-radius:10px;margin:12px 0;"> <b>Personalized Practice</b>: After each item, personalize: "Think about your own life — when would YOU use this? For example, you could say... [example using ${learner.name}'s interests/job]"
        -   Include a "Where & When" usage box: <div style="background:var(--theme-secondary-12);padding:12px 14px;border-radius:10px;border-left:4px solid var(--theme-secondary);"> explaining real-world contexts for each language item.

3.  **Conversation / Dialogue** (type: 'paragraph')
    -   Title: '💬 Let's See It in Action'
    -   Content: A full conversation (10-15 turns) that naturally uses the vocabulary, grammar, and phrases from the lesson. Write it as a styled dialogue:
        -   Use <div style="background:var(--theme-text-secondary-10);padding:12px 14px;border-radius:8px;margin:5px 0;"> for each speaker turn
        -   Bold the speaker name: <b>Sarah:</b>
        -   After the dialogue, add a "Did you notice?" section pointing out key language used.

4.  **Deep Dive Explanation** (type: 'paragraph')
    -   Title: '🔍 Detailed Breakdown'
    -   Content: An extremely detailed HTML string (minimum 800 words, aim for 1200+) that scaffolds the lesson content from easy to difficult like a complete textbook lesson. Speak directly to ${learner.name}:
        -   <h4 style="color:var(--theme-text);margin-top:18px;">Step 1: Starting Simple</h4> — Introduce the core concept in the simplest terms. Use an analogy or comparison to something ${learner.name} already knows: "Think of it like..."
        -   <h4 style="color:var(--theme-text);margin-top:18px;">Step 2: Building Up</h4> — Add complexity layer by layer. Elaborate on the concept with more detail. Show how it works in different contexts.
        -   <h4 style="color:var(--theme-text);margin-top:18px;">Step 3: Going Deeper</h4> — Advanced nuances, exceptions, edge cases. Compare and contrast with similar concepts the learner might confuse.
        -   <div style="background:var(--theme-accent-14);padding:14px 16px;border-radius:10px;margin:12px 0;border-left:4px solid var(--theme-accent);"> <b style="color:var(--theme-text);">Why This Matters</b><br>Explain why this knowledge is valuable for ${learner.name}'s specific goals and daily life.</div>
        -   <div style="background:var(--theme-info-14);padding:14px 16px;border-radius:10px;margin:12px 0;border-left:4px solid var(--theme-info);"> <b style="color:var(--theme-text);">How This Connects to Your Work / Life</b><br>Directly connect each sub-topic to ${learner.name}'s job, studies, or personal interests. Give concrete examples: "Since you work in [their field], this means..."</div>
        -   <div style="background:var(--theme-success-14);padding:14px 16px;border-radius:10px;margin:12px 0;border-left:4px solid var(--theme-success);"> <b style="color:var(--theme-text);">Personalized Example</b><br>An extended example (3-5 sentences) using ${learner.name}'s name, interests, and real-life context to demonstrate the concept.</div>
        -   <div style="background:var(--theme-warning-14);padding:14px 16px;border-radius:10px;margin:12px 0;border-left:4px solid var(--theme-warning);"> <b style="color:var(--theme-text);">Quick Check — Think About These</b><br>4-6 Concept Checking Questions (CCQs) that gradually increase in difficulty. Format each as:
          <div style="background:var(--theme-surface);border:1px solid var(--theme-text-18);border-radius:8px;padding:8px 10px;margin:5px 0;">❓ <b>Question 1:</b> [Simple recall question]</div>
          <div style="background:var(--theme-surface);border:1px solid var(--theme-text-18);border-radius:8px;padding:8px 10px;margin:5px 0;">❓ <b>Question 2:</b> [Application question]</div>
          <div style="background:var(--theme-surface);border:1px solid var(--theme-text-18);border-radius:8px;padding:8px 10px;margin:5px 0;">❓ <b>Question 3:</b> [Analysis question]</div>
          <div style="background:var(--theme-surface);border:1px solid var(--theme-text-18);border-radius:8px;padding:8px 10px;margin:5px 0;">❓ <b>Question 4:</b> [Evaluation/Create question]</div>

5.  **Communication Skills & Strategies** (type: 'paragraph')
    -   Title: '🛠️ Communication Toolkit'
    -   Content: A detailed HTML paragraph (>500 words) teaching communication strategies related to the lesson. Use styled sections:
        -   <div style="background:var(--theme-success-12);padding:12px 14px;border-radius:10px;margin:8px 0;border-left:4px solid var(--theme-success);"> for "Soft Skills" — real-life skills like active listening, empathy, persuasion, critical thinking, etc.
        -   <div style="background:var(--theme-error-12);padding:12px 14px;border-radius:10px;margin:8px 0;border-left:4px solid var(--theme-error);"> for "Common Mistakes to Avoid"
        -   <div style="background:var(--theme-text-secondary-10);padding:12px 14px;border-radius:8px;margin:8px 0;"> for tips and strategies
        -   Do NOT use HTML formatting tags like <b> for structure — use styled divs with backgrounds and borders instead. Keep the text clean and readable.
        -   Explain WHEN, WHERE, and HOW to apply these skills in real life.

6.  **Soft Skills & Future Skills** (type: 'paragraph')
    -   Title: '🌟 Skills for Real Life'
    -   Content: HTML string (>500 words) connecting the lesson to real-world skills:
        -   Identify 2-3 specific real-life skills this lesson develops (e.g., writing professional emails, reading news articles, giving presentations, negotiating, etc.)
        -   <div style="background:var(--theme-warning-12);padding:12px 14px;border-radius:10px;margin:8px 0;border-left:4px solid var(--theme-warning);"> for each skill with step-by-step guidance
        -   <div style="background:var(--theme-success-10);padding:12px 14px;border-radius:10px;margin:8px 0;"> for "How to Practice This in Your Daily Life"
        -   Personalize each skill to ${learner.name}'s context: "Since you work in [their field], here is how you can use this..."

7.  **Real World Application** (type: 'paragraph')
    -   Title: '🌍 Real World Application'
    -   Content: An HTML string with:
        -   <div style="background:var(--theme-bg);padding:16px 18px;border-radius:10px;margin:12px 0;border:1px solid var(--theme-text-18);"> <h4 style="color:var(--theme-text);margin-top:0;">Setting the Scene</h4>Write a richly detailed introductory section (3-4 paragraphs, 400+ words) describing a realistic real-world context where the lesson's language and skills would be used. Describe the environment, the people involved, the stakes, and the communication challenges. Make it vivid and relatable to ${learner.name}'s world. For example, if the lesson is about business negotiation, describe a specific company, a specific deal, and the personalities of the people at the table.</div>
        -   Then 5 distinct scenarios labeled <h4 style="color:var(--theme-secondary);margin-top:18px;">Scenario 1: [Title]</h4> through <h4 style="color:var(--theme-secondary);margin-top:18px;">Scenario 5: [Title]</h4>, each in a separate <div style="background:var(--theme-surface);border:1px solid var(--theme-text-18);padding:14px 16px;border-radius:10px;margin:12px 0;box-shadow:var(--theme-shadow);">
        -   Each scenario presents a situation related to the lesson with different communication styles, decisions, or outcomes
        -   <b>Inside each scenario, include a full dialogue (300+ words, 12-20 turns)</b> that demonstrates the situation. The dialogue must feel natural and use the language from the lesson. Format as:
          <div style="background:var(--theme-text-secondary-10);padding:10px 12px;border-radius:8px;margin:8px 0;"><b>Person A:</b> Their dialogue line...</div>
          <div style="background:var(--theme-text-secondary-10);padding:10px 12px;border-radius:8px;margin:8px 0;"><b>Person B:</b> Their response...</div>
        -   After each scenario's dialogue, add: <div style="background:var(--theme-secondary-12);padding:12px 14px;border-radius:10px;margin:10px 0;border-left:4px solid var(--theme-secondary);"><p style="font-weight:bold;color:var(--theme-secondary);margin:0 0 8px 0;">Think About It:</p><p style="margin:0;">1. [Question about the communication style/decisions made]</p><p style="margin:0;">2. [Question about what the learner would do differently]</p></div>
        -   Do NOT use "Fix the Mistake Challenge" labels or "Positive Example" / "Correction Example" labels

8.  **Expert Talk** (type: 'paragraph')
    -   Title: '🎯 Expert Talk'
    -   Content: A detailed HTML string (>600 words) analyzing each scenario from above:
        -   <div style="background:var(--theme-secondary-14);padding:14px 16px;border-radius:10px;margin:12px 0;border-left:4px solid var(--theme-secondary);"> for expert analysis of each scenario
        -   For each scenario, provide: what worked well, what could be improved, alternative approaches
        -   <div style="background:var(--theme-warning-12);padding:12px 14px;border-radius:10px;margin:8px 0;"> "How You Can Use This" — personalized advice for ${learner.name}
        -   Include strategies the learner can apply in similar situations
        -   This replaces traditional "Director's Notes"

9.  **Dialogues Across Registers** (type: 'paragraph')
    -   Title: '🎭 Same Situation, Different Styles'
    -   Content: HTML string with 3-5 short dialogues (6-10 turns each) on the same topic but in different registers:
        -   <div style="background:var(--theme-info-12);padding:12px 14px;border-radius:10px;margin:8px 0;border-left:4px solid var(--theme-info);"> <b>Casual / Informal</b> — between friends, using slang and reduced forms
        -   <div style="background:var(--theme-text-secondary-10);padding:12px 14px;border-radius:10px;margin:8px 0;border-left:4px solid var(--theme-text-secondary);"> <b>Neutral</b> — everyday polite conversation
        -   <div style="background:var(--theme-error-12);padding:12px 14px;border-radius:10px;margin:8px 0;border-left:4px solid var(--theme-error);"> <b>Formal</b> — professional or academic setting
        -   After each dialogue, add a <div style="background:var(--theme-warning-10);padding:10px 12px;border-radius:8px;margin:5px 0;"> Cultural Note box explaining cultural norms, politeness strategies, or civic information relevant to the dialogue
        -   <div style="background:var(--theme-success-10);padding:10px 12px;border-radius:8px;margin:5px 0;"> Situational Strategy box explaining when to use each register

10. **Case Study** (type: 'paragraph')
    -   Title: '📋 Case Study'
    -   Content: HTML string containing:
        -   <div style="background:var(--theme-bg);padding:16px 18px;border-radius:10px;margin:12px 0;border:1px solid var(--theme-text-18);"> <h4 style="color:var(--theme-text);margin-top:0;">Real-World Case Study</h4>A real-world article or text (700-1200 words) related to the lesson topic, simplified to the learner's level. Use a practical, authentic-feeling scenario — it could be a news story, a business case, a workplace situation, or a social dilemma. Include specific details, characters, and outcomes.</div>
        -   After the article, add: <div style="background:var(--theme-secondary-10);padding:16px 18px;border-radius:10px;margin:14px 0;">
        -   <h4 style="color:var(--theme-secondary);margin-top:0;">Discussion & Debate Cards</h4>
        -   5-7 discussion/debate cards about the case study. Each card as a styled card:
          <div style="background:var(--theme-surface);border:2px solid var(--theme-text-18);border-radius:12px;padding:14px 16px;margin:12px 0;box-shadow:var(--theme-shadow);">
          <h5 style="color:var(--theme-secondary);margin:0 0 8px 0;">Card 1: [Debate Topic Question]</h5>
          <div style="background:var(--theme-success-12);padding:10px 12px;border-radius:8px;margin:8px 0;border-left:3px solid var(--theme-success);"><b>Checklist — Points to Cover:</b>
          <br>☐ [Key point 1 to discuss]
          <br>☐ [Key point 2 to discuss]
          <br>☐ [Key point 3 to discuss]
          <br>☐ [Key point 4 to discuss]</div>
          <div style="background:var(--theme-error-12);padding:10px 12px;border-radius:8px;margin:8px 0;border-left:3px solid var(--theme-error);"><b>Arguments FOR:</b> [2-3 arguments supporting one position]</div>
          <div style="background:var(--theme-info-12);padding:10px 12px;border-radius:8px;margin:8px 0;border-left:3px solid var(--theme-info);"><b>Counter-Arguments AGAINST:</b> [2-3 counter-arguments for the opposing position]</div>
          <div style="background:var(--theme-text-secondary-10);padding:10px 12px;border-radius:8px;margin:8px 0;"><b>💡 Discussion Tip:</b> [A strategy for discussing this topic effectively]</div>
          </div>
        -   Repeat the card structure for each of the 5-7 cards with different debate topics.

11. **Review & Reflection** (type: 'paragraph')
    -   Title: '✅ Review & Reflection'
    -   Content: HTML string with:
        -   <div style="background:var(--theme-success-10);padding:14px 16px;border-radius:10px;margin:12px 0;"> Summary of key points from the section (4-6 bullet points in styled divs)
        -   <div style="background:var(--theme-warning-10);padding:12px 14px;border-radius:10px;margin:10px 0;"> "Check Your Progress" — 3-5 self-reflection questions for the learner to think about
        -   <div style="background:var(--theme-error-10);padding:12px 14px;border-radius:10px;margin:10px 0;"> "Your Next Step" — actionable task for the learner to do before the next session

12. **Recorded Output** (type: 'voice_recording')
    -   Title: '🎤 Record Your Thoughts'
    -   Content: \`{"prompt": "Record a 60-second summary explaining what you learned in this section. Use at least 3 new words or phrases.", "text": "", "type": "voice_recording"}\`

13. **Written Output** (type: 'essay_writing')
    -   Title: '✍️ Write About It'
    -   Content: \`{"prompt": "Write a short paragraph (min 50 words) reflecting on how you will use this lesson's content in your daily life.", "minWords": 50, "type": "essay_writing"}\`

--- CRITICAL RULES ---
- **NO GAMES**: Do NOT include any speaking games, Truth or Dare, Would You Rather, Two Truths One Lie, Never Have I Ever, or any gamified activities. This is a serious explainer lesson.
- **NO MATCHING**: Do NOT include matching activities, "Match the Term to Its Definition", or similar.
- **NO "Complete the Sentences"** type gap-fill activities.
- **NO "Find and Fix the Errors"** activities.
- **ALL sections** (Warm-up, Language, Dialogue, Deep Dive, Communication Toolkit, Skills, Real World Application, Expert Talk, Registers, Case Study, Review) must be formatted as rich styled HTML paragraphs — NOT in accordion format. Use <div style="..."> for all structure.
- **EACH section** must feel like a complete mini-lesson with all the above 13 activities.
- **Voice Recording and Essay Writing** are optional supplement activities — include at least 1 of each across the entire lesson.
- **YOUTUBE VIDEOS**: Use only current, verifiable HTTPS YouTube watch/youtu.be links. Embed each at the most relevant point and provide a visible "Open on YouTube" link with target="_blank" for file:// exports. Do NOT put all videos at the end.
- **IMAGES**: Use only current, verifiable HTTPS image URLs from reputable sources. Embed each right after the paragraph or concept it illustrates and include alt text, caption, and sourceUrl. Do NOT cluster all images together.
- Repeat this full 13-activity structure for EVERY section (minimum 5 sections).

--- REQUIRED JSON SCHEMA ---
{
  "sections": [
    {
      "title": "Section Title (with Emoji)",
      "color": "#4b5563",
      "studyTime": "45 minutes",
      "activities": [
          { "type": "paragraph", "title": "🤔 Think about these questions...", "content": "...", "comprehensiveFeedback": "..." },
          { "type": "paragraph", "title": "📚 Language You Need", "content": "...", "comprehensiveFeedback": "..." },
          { "type": "paragraph", "title": "💬 Let's See It in Action", "content": "...", "comprehensiveFeedback": "..." },
          { "type": "paragraph", "title": "🔍 Detailed Breakdown", "content": "...", "comprehensiveFeedback": "..." },
          { "type": "paragraph", "title": "🛠️ Communication Toolkit", "content": "...", "comprehensiveFeedback": "..." },
          { "type": "paragraph", "title": "🌟 Skills for Real Life", "content": "...", "comprehensiveFeedback": "..." },
          { "type": "paragraph", "title": "🌍 Real World Application", "content": "...", "comprehensiveFeedback": "..." },
          { "type": "paragraph", "title": "🎯 Expert Talk", "content": "...", "comprehensiveFeedback": "..." },
          { "type": "paragraph", "title": "🎭 Same Situation, Different Styles", "content": "...", "comprehensiveFeedback": "..." },
          { "type": "paragraph", "title": "📋 Case Study", "content": "...", "comprehensiveFeedback": "..." },
          { "type": "paragraph", "title": "✅ Review & Reflection", "content": "...", "comprehensiveFeedback": "..." },
          { "type": "voice_recording", "title": "🎤 Record Your Thoughts", "content": "{\\"prompt\\":\\"Record...\\", \\"text\\": \\"\\", \\"type\\": \\"voice_recording\\"}", "comprehensiveFeedback": "..." },
          { "type": "essay_writing", "title": "✍️ Write About It", "content": "{\\"prompt\\":\\"Write...\\", \\"minWords\\": 50, \\"type\\": \\"essay_writing\\"}", "comprehensiveFeedback": "..." }
      ]
    }
  ],
  "lessonSummary": "A concise summary for the teacher.",
  "settings": {
    "teacherNotes": "Tips and strategies...",
    "homeworkChecklist": "Daily tasks...",
    "lessonImages": [
      { "id": "img-1", "url": "https://images.unsplash.com/photo-XXXX?auto=format&fit=crop&w=1200&q=80", "caption": "Description", "type": "image", "altText": "Accessible description", "sourceUrl": "https://unsplash.com/photos/..." }
    ],
    "lessonVideos": [
      { "id": "vid-1", "url": "https://www.youtube.com/watch?v=EXACT_11_CHAR_ID", "caption": "Description", "type": "youtube", "sourceUrl": "https://www.youtube.com/watch?v=EXACT_11_CHAR_ID" }
    ],
    "materialLinks": "URL 1\\nURL 2..."
  }
}
`;

        case 'englishLesson':
            return `${baseInstruction}
--- CONTENT TYPE: Micro Lesson V1 — Expanded Color-Coded Template (30 Activities) ---
The user will provide a raw text in the next message. You MUST create a "Discovery-Based", Communicative, Gamified Micro Lesson based on that text using the EXPANDED 30-ACTIVITY template below.

${newActivityTypes}

--- CORE GENERATION INSTRUCTIONS ---
1.  **Long Text Handling (CRITICAL)**: If the text is long (>2000 words), generate **at least 5-8 distinct Sections**. Cover 100% of the content.
2.  **Discovery-Based**: Present examples and discovery questions BEFORE explicit rules.
3.  **Massive Content**: Each section should be detailed (10-15 activities per section). ALL 30 activity types listed below MUST appear across the full lesson.
4.  **Hyper-Personalization & Formatting**: Use learner details in examples. Use HTML tags and emojis. NO MARKDOWN.
5.  **JSON String Content (CRITICAL)**: For interactive activities (matching, scramble, gap_fill, dictation, multiple_choice, etc.), the "content" field must be a VALID JSON STRING. Test mentally that 'JSON.parse(content)' would succeed.
6.  **SELF-CONTAINED LESSON (CRITICAL & NON-NEGOTIABLE)**: The lesson MUST be completely self-contained and independent. Do NOT refer to external books, videos, PDFs, page numbers, or the original source text. You are STRICTLY FORBIDDEN from referring to any pictures, diagrams, text, or page numbers from the source material, and NEVER say "read the text in the book", "according to the text", "as mentioned in the article", or similar. Since these lessons are completely self-contained, if context, paragraphs, stories, or complete exact texts are needed to answer any question, you MUST embed those paragraphs or exact texts directly inside the activity's content itself, and then ask the questions from it. Every instruction, question, and activity must work entirely on its own.
7.  **Every activity MUST end with a productive skill practice** — either a 'voice_recording' (🔊 Speak/Record) or 'essay_writing' (📝 Write Essay) activity placed immediately after it.
8.  **Magazine-Style Images (CRITICAL)**: Never reference section headers when placing images. The 'imageUrl'/'imageCaption' fields (and settings.lessonImages) render INSIDE the activity body, floated right with the text wrapping tightly around them like a magazine article. Place 'imageUrl' on the activity whose content the image illustrates (e.g. the paragraph that discusses it), never on a title/header activity.

--- SKILL ANALYSIS & SECTION STRUCTURE (CRITICAL) ---
Before generating, you MUST ANALYZE the lesson text for teachable skills. For EACH section of the lesson:

1. **Identify which skills are present** in that section of the source text: Vocabulary, Grammar, Pronunciation, Reading, Listening, Speaking, Writing.
2. **Add lesson/teaching text first** (type: "paragraph" with rich HTML) that presents the core content for that section.
3. **Then add ALL activities for the skills found** — in the exact numbered order of the 30-Activity Template below. Only include activities relevant to the skills in that section.
4. **Every section MUST include Topic Preview** (activity 1) at the start OR at the section's beginning if it is the first section.
5. **Every lesson MUST include Final Review & Discussion** (activity 30) as the last section.
6. **Distribute the remaining 28 activities** across your 5-8 sections based on which skills each section of the source text contains. A vocabulary section gets vocab activities (2-6). A grammar section gets grammar activities (7-11). A pronunciation section gets activity 12, etc.
7. **Every single activity must have a dedicated "Answers & Feedback" section** as its 'comprehensiveFeedback' field — with personalized tips, answer explanations, and real-world application notes.

--- COLOR CODING SCHEME ---
Assign EACH activity a color based on its skill category. Set the section's \`color\` field to match the DOMINANT skill in that section. Use these hex codes:

🟦 **Topic Preview & Review** → #3B82F6 (Blue)
🟧 **Vocabulary** (activities 2-6) → #F97316 (Orange)
🟩 **Grammar** (activities 7-11) → #22C55E (Green)
🟪 **Pronunciation** (activity 12) → #A855F7 (Purple)
🟨 **Listening** (activities 13, 15, 16) → #EAB308 (Yellow)
🟥 **Reading** (activities 17-18) → #EF4444 (Red)
🟫 **Speaking** (activities 26, 28, 29) → #D97706 (Amber)
⬜ **Writing** (activities 20-21) → #6B7280 (Gray)
🎯 **Integrated / Games / Review** → #6366F1 (Indigo)

--- IMAGES & VIDEOS REQUIREMENT (CRITICAL) ---
- **Inline Images and Videos in ANY Activity**: You can embed an inline image or video directly inside ANY activity (not just paragraphs!) by adding the following optional fields to that activity's JSON object:
  - 'imageUrl': URL of a relevant image (e.g., from Unsplash or a valid image link)
  - 'imageCaption': A description of the image to display underneath
  - 'videoUrl': A YouTube video link (e.g. 'https://www.youtube.com/watch?v=VIDEO_ID')
  - 'videoCaption': A caption to display underneath the video
  - *When these fields are present, the system automatically renders them inline, aligning images elegantly on the right side on desktop!*
- **Dedicated Paragraph Blocks**: You can also embed media inline in paragraph activities as before:
  - **Images**: '<img src="https://example.com/image.jpg" alt="description" style="max-width:100%;border-radius:12px;margin:16px 0;" />'
  - **YouTube Videos**: '<div style="position:relative;padding-bottom:56.25%;height:0;margin:16px 0;"><iframe src="https://www.youtube.com/embed/VIDEO_ID" style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:12px;" allowfullscreen></iframe></div>'

--- ACTIVITY STYLING & VALIDATION CRITICAL RULES ---
1. **Topic Preview (Activity 1) & Final Review (Activity 30)**:
   - The 'content' field **MUST ONLY** contain a list of questions (numbered or bulleted). STYLIZE the questions beautifully using emojis and bold text so they look appealing.
   - **DO NOT** mix model answers in the 'content' field.
   - All model answers, feedback, and discussion advice **MUST ALWAYS** go inside the 'comprehensiveFeedback' field.
2. **Fill in the Blanks / Gap Fill (Activities 5 & 10)**:
   - Provide a valid JSON string: {"sentences": [{"sentence": "She ___ (go) to work.", "answer": "goes", "hint": "present simple"}, ...]}
   - Each sentence must have **EXACTLY ONE** blank represented by exactly three underscores: '___'.
   - The correct answer must be clear and direct.
   - To support multiple correct/acceptable answers, use a pipe '|' or slash '/' in the '"answer"' field (e.g., '"answer": "goes|is going"' or '"answer": "don\\'t/do not"').
   - Ensure the blanks are not ambiguous.
3. **Grammar Box (Activity 8)**:
   - Provide a highly-detailed, comprehensive grammar explanation.
   - The 'ccqs' (concept-checking questions) array **MUST** contain objects with explicit '"question"' and '"answer"' keys (e.g., '[{"question": "Is she still working now?", "answer": "Yes, she is."}]'). Never omit these keys.
4. **Multiple Choice, Reading & Listening Comprehension Questions (Activities 13, 17, and all MC/TF questions) [CRITICAL]**:
   - **No Letter Prefixes in Options**: In the '"options"' array, provide ONLY the clean plain-text option strings without any "A.", "B.", "A)", or "1." prefixes (e.g., ["Paris is the capital", "London is the capital", "Rome is the capital"]). The UI automatically renders and attaches the letter badges (A, B, C, D) dynamically.
   - **Exact String Matching for Answers**: The '"answer"' (or '"a"') field **MUST BE THE EXACT FULL TEXT STRING** that matches one of the items in the '"options"' array identically (e.g., "answer": "Paris is the capital").
   - ⚠️ **FATAL ANTI-PATTERN TO AVOID**: NEVER set '"answer"' to just a single letter like "A", "B", "C", or "D"! The interactive assessment engine strictly evaluates (option === correctAnswer). If '"answer"' is set to "B" while the options contain full sentences, the equality check will always fail, causing ALL options to appear incorrect! Always supply the complete matching text string as the answer.
5. **Unscramble Sentences & Text Reconstruction (Activities 7 & 24 'scramble') [CRITICAL]**:
   - **Punctuation Removal**: You MUST strip and remove ALL punctuation marks (periods '.', commas ',', question marks '?', exclamation marks '!', colons ':', semicolons ';', quotes '""' / '\'\'', dashes '-') from BOTH:
     1) The pipe-separated scrambled chunks in '"sentence"' (e.g., "sentence": "is | she | still | working | now" — NEVER "working | is | she | still | now?").
     2) The final unscrambled sentence in '"answer"' (e.g., "answer": "is she still working now" or "answer": "she is still working now" — with ZERO punctuation).
   - This ensures clean word chips and guarantees that word drag-and-drop answer evaluation never fails due to punctuation mismatches.

${feedbackInstruction}
${settingsInstruction}
${formattingRules}

--- THE COMPLETE COLOR-CODED TEMPLATE ---
For EVERY section, after placing the lesson/teaching text (type: "paragraph"), include the relevant activities from this template. Each activity MUST have:
- A **dedicated comprehensiveFeedback** field (= Answers & Feedback section) with answer explanations, personalized tips, cultural notes, and How/When/Where usage guide
- An ending **Speak/Record** OR **Write Essay** activity (voice_recording or essay_writing) placed immediately after

Every activity below specifies its type, title format, content format, color code, and the ending practice type it must be paired with.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**🟦 Activity 1 — Topic Preview**
   type: "questions"
   title: "🚀 Topic Preview — Quick Start"
   content: One hook sentence + 2-3 personalized warm-up questions connecting the topic to \${learner.name}'s life. Format ONLY as a numbered list of questions (e.g. "1. Question... \n 2. Question..."). Stylize them with bold text and emojis so they look great! DO NOT mix or include any answers in this content field.
   color: #3B82F6
   comprehensiveFeedback: Model/sample answers to each of the warm-up questions, why this lesson matters (real-life value), cultural/SEL tip relevant to the topic.
   ➡️ Ending: 🔊 voice_recording — "Choose one warm-up question and record a 30-second reply."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟧 Activity 2 — Vocabulary in Context**
   type: "vocabulary_table"
   title: "📖 Vocabulary in Context"
   content: JSON string array. Each item: {"word":"...", "translation":"[\${translationLanguage}]", "definition":"...", "example":"Personalized for \${learner.name}", "ccq":"Concept-checking question?"}. Extract EVERY new word/phrase/idiom from the section — no limit.
   color: #F97316
   comprehensiveFeedback: Differences in use (formal meeting vs. casual chat vs. academic), formal & informal synonyms, sample short dialogue using \${learner.name}'s context, common collocations, parts of speech, color-coded categories (🟦 Work words, 🟩 Feelings words, 🟨 Academic, 🟥 Idioms).
   ➡️ Ending: 📝 essay_writing — "Write a 4-sentence paragraph using at least 3 vocabulary items from the table in your own life context."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟧 Activity 3 — Vocabulary Matching**
   type: "matching"
   title: "🧩 Vocabulary Matching — Pair It Up"
   content: JSON string array: [{"left":"Word/Phrase","right":"Definition/Translation"},...]. Include 8-12 pairs. Shuffle-safe.
   color: #F97316
   comprehensiveFeedback: Correct matches explained, nuance check (why one synonym fits better), exam tip (IELTS/TOEFL synonym strategy).
   ➡️ Ending: 🔊 voice_recording — "Read one matched pair aloud, make a sentence with the word, and explain why you chose that match."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟧 Activity 4 — Flashcards**
   type: "flashcard"
   title: "🃏 Flashcards — Spaced Repetition"
   content: JSON string: {"cards":[{"front":"Word/Phrase","dialogue":"A: Dialogue prompt.\\nB: Response using **Word/Phrase** in bold.","back":"Clear definition","translation":"Translation in [${translationLanguage}]","image":"https://images.unsplash.com/...","personalizedExamples":["Example 1...","Example 2...","Example 3..."],"ccq":"Speaking CCQ question prompting conversation."}]}. 8-12 cards.
   color: #F97316
   comprehensiveFeedback: Spaced-repetition advice, memory tricks (mnemonics, visual associations), study skill tip (create paper flashcards).
   ➡️ Ending: 📝 essay_writing — "After studying, write down the 3 hardest words and a personal story that links them together."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟧 Activity 5 — Vocabulary Fill in the Blanks**
   type: "gap_fill"
   title: "✍️ Fill in the Blanks — Use the Right Word"
   content: JSON string: {"sentences":[{"sentence":"She ___ (go) to work every day.","answer":"goes"},...]}. CRITICAL: EXACTLY ONE '___' gap per sentence. 6-10 sentences. Support multiple correct answers in '"answer"' using '|' or '/' (e.g. '"goes|is going"').
   color: #F97316
   comprehensiveFeedback: Correct answers with explanations, collocations that naturally go together, grammatical hints (adjective vs. noun).
   ➡️ Ending: 🔊 voice_recording — "Read the complete paragraph aloud, then paraphrase the whole text in your own words."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟩 Activity 7 — Grammar Discovery (Scramble)**
   type: "scramble"
   title: "🔀 Grammar Discovery — Can You Unscramble?"
   content: JSON string: '{"sentences": [{"sentence": "is | she | still | working | now", "answer": "is she still working now", "hint": "present continuous"}, ...]}'. The 'sentence' field MUST contain the scrambled words separated by pipes ('|') with ALL punctuation removed. The 'answer' MUST be the clean unscrambled sentence with NO punctuation (no periods, question marks, commas, etc.). CRITICAL: This MUST NOT BE EMPTY! Provide a valid JSON string.
   color: #22C55E
   comprehensiveFeedback: Correctly unscrambled sentences, form highlighted (grammatical structure), meaning expressed, when to use in real conversation, formal/informal alternatives.
   ➡️ Ending: 🔊 voice_recording — "Unscramble one sentence aloud, then create a new sentence about your life using the same grammar."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟩 Activity 8 — Grammar Box**
   type: "grammar_explanation"
   title: "📚 Grammar Box — How It Works"
   content: JSON string: '{"rules": [{"title": "Form & Meaning", "explanation": "Detailed explanation...", "formula": "Subject + verb + object", "examples": ["Example 1", "Example 2"], "mistakes": [{"wrong": "Incorrect sentence", "right": "Correct sentence"}], "ccqs": [{"q": "Concept check question?", "a": "Answer"}]}]}'. Provide a highly-detailed, comprehensive grammar explanation with structural formulas, examples, common mistakes, and CCQs (concept checking questions). CRITICAL: This MUST NOT BE EMPTY! Provide a valid JSON string.
   color: #22C55E
   comprehensiveFeedback: "Why do we say...?" detailed answer with timelines, common learner errors and how to avoid them, contrast with L1, color-coded grammar labels (🟣 TENSES, 🟠 CONDITIONALS, 🟡 MODALS).
   ➡️ Ending: 📝 essay_writing — "Write a short dialogue between 2 people that naturally uses the target grammar at least 3 times."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟩 Activity 9 — Grammar Error Correction**
   type: "error_correction"
   title: "🔍 Find the Mistake — Can You Spot It?"
   content: JSON string: {"sentences":[{"sentence":"She don't like coffee.","error":"don't","correction":"doesn't"},...]}. 5-8 sentences, EXACTLY ONE error per sentence. CRITICAL: (a) EVERY sentence MUST contain its mistake as written — never output a sentence that is already correct, because that item has nothing to tap. (b) The "error" MUST be exactly one single word COPIED VERBATIM out of that same sentence (identical characters and apostrophes, no punctuation added, no paraphrase) — the UI highlights words by matching them literally, so a phrase or a re-worded error can never be found. (c) "correction" fixes only that one word.
   color: #22C55E
   comprehensiveFeedback: Each mistake identified and corrected, why the error happened (over-generalization, L1 interference), self-correction checklist, exam tip (check subject-verb agreement first).
   ➡️ Ending: 🔊 voice_recording — "Read the wrong sentence aloud, pause, say the correct version, and explain the error."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟩 Activity 10 — Grammar Gap-Fill Practice**
   type: "gap_fill"
   title: "✍️ Grammar Gap-Fill — Complete the Sentence"
   content: JSON string: {"sentences":[{"sentence":"If I ___ (know), I would have come.","answer":"had known"},...]}. 5-8 sentences, EXACTLY ONE '___' gap per sentence. Focus on the target grammar point. Support multiple correct answers in '"answer"' using '|' or '/' (e.g. '"had known|knew"').
   color: #22C55E
   comprehensiveFeedback: Correct answers with rule reminders, nuance (when 2 options are grammatically possible but one is more natural), collocations tied to the grammar.
   ➡️ Ending: 📝 essay_writing — "Write a 5-sentence paragraph about a childhood memory, using the grammar point in every sentence."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟩 Activity 11 — Grammar Memory Match / Flip Card**
   type: "paragraph"
   title: "🧠 Grammar Memory Match — Find the Pair"
   content: HTML string with a memory match table (2 columns). Left column: grammar structure labels (e.g., "Present Perfect", "Third Conditional"). Right column: example sentences or function descriptions. Format as an HTML table with <b>bold</b> structure names. Include a hidden answer key section.
   color: #22C55E
   comprehensiveFeedback: Correct pairs explained, cognitive strategy (why matching form+meaning strengthens memory), pattern recognition skill.
   ➡️ Ending: 🔊 voice_recording — "Read each pair aloud, state whether they match, and explain why they belong together."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟪 Activity 12 — Pronunciation (Minimal Pairs / Tongue Twister / Shadowing)**
   type: "pronunciation"
   title: "🗣️ Pronunciation — Say It Right"
   content: JSON string: {"words":[{"word":"ChallengingWord","phonetic":"/IPA/","audioScript":"Natural sentence using the word."},...]}. Include 5-8 words from the section.
   color: #A855F7
   comprehensiveFeedback: Articulation tips (tongue position, lip rounding), minimal pair list, tongue twister with slow-to-fast guide, shadowing technique instructions, common L1 transfer issues.
   ➡️ Ending: 🔊 voice_recording — "Shadow the model sentence exactly, then read the minimal pairs and record your own version."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟨 Activity 13 — Listening (Monologue or Multi-Person Conversation)**
   type: "listening_mc"
   title: "🎧 Listening — Real Talk"
   content: JSON string with: audioScript (800-1200 word natural podcast-style monologue/dialogue with tagged voices, FORMAT: each speaker line MUST start with [voiceTag] like [male1], [female3], [male2], [child1] etc. The [tag] tells which voice reads that line — the platform reads each tag with a different Microsoft Azure Natural voice. Example: [male1]Hello there! [female3]Hi John, how are you? [male1]I'm great, thanks for asking!. You may add short speaker labels after the tag (e.g. "A:", "Alexander:") — displayed in the transcript, never spoken. IMPORTANT: Use ONLY clean text inside the tags, NO asterisks, NO markdown symbols, NO emojis in the dialogue text — they will be read aloud as garbage.), questions (4-6 mixing multiple choice AND true/false, FORMAT: {"question": "What is the speaker's main recommendation?", "options": ["Invest in structured language immersion and deliberate practice", "Rely entirely on passive listening without notes", "Memorize bilingual wordlists in alphabetical order", "Postpone conversational practice until reaching advanced level"], "answer": "Invest in structured language immersion and deliberate practice", "explanation": "The speaker explicitly emphasizes structured immersion and deliberate practice."}. CRITICAL: Do NOT prefix options with letters like "A." or "B." (the UI adds letter badges automatically). The "answer" field MUST be the EXACT full string matching one of the options identically, NEVER just a single letter like "A" or "B").
   color: #EAB308
   comprehensiveFeedback: MC/TF answers with justification, listening strategy (preview questions, predict, listen for signposts), critical thinking (fact vs. opinion), cultural references explained.
   ➡️ Ending: 📝 essay_writing — "Summarise the listening in exactly 60 words."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟨 Activity 15 — Audio Matching**
   type: "audio_matching"
   title: "🔊 Audio Matching — Listen & Match"
   content: JSON string: {"pairs":[{"audioScript":"Natural sentence using the word","term":"TargetWord","definition":"Meaning"},...]}. 5-6 pairs.
   color: #EAB308
   comprehensiveFeedback: Full answer key with phonetic transcriptions, active listening tip (repeat mentally then match), common confusions (near-homophones).
   ➡️ Ending: 📝 essay_writing — "Choose the 3 hardest items. Write a sentence for each that clearly shows the meaning."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟨 Activity 16 — Gap-Transcript (Dictation)**
   type: "dictation"
   title: "✍️ Gap-Transcript — Type What You Hear"
   content: JSON string array of 3-5 sentences (80-120 words total) from the listening section. Varying difficulty.
   color: #EAB308
   comprehensiveFeedback: Full correct transcript with punctuation, error analysis (spelling, homophones, missing articles), context-guessing strategy, exam tip (write what you hear, don't paraphrase).
   ➡️ Ending: 🔊 voice_recording — "Read the complete transcript aloud, record it, and compare your pronunciation to the original."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟥 Activity 17 — Reading (Lesson Text Verbatim)**
   type: "contextual_mc"
   title: "📖 Reading & Comprehension"
   content: JSON string: '{"context": "CRITICAL: You MUST X5 the length and rewrite the text from the source beautifully. Talk to the learners directly in the 2nd person (\\'you\\') as this is self-study. Explain and expand the topic in a simple to understand way. You must heavily style this section using HTML: add color-coded text, info boxes, highlight important notes, and use bullet points or tables where helpful. Do NOT just write a 1 paragraph text. Make it a comprehensive, engaging reading module. Format as PROPER HTML PARAGRAPHS.", "questions": [{"question": "What is the primary conclusion drawn from the analysis?", "options": ["Proactive communication and deliberate feedback loops drive consistent performance", "Strict adherence to outdated procedures prevents unexpected workplace misunderstandings", "Occasional spontaneous team meetings are sufficient to resolve complex scheduling conflicts", "Formal written warnings should replace interpersonal feedback discussions completely"], "answer": "Proactive communication and deliberate feedback loops drive consistent performance", "explanation": "The text emphasizes that proactive communication combined with feedback loops is essential."}]}'. CRITICAL: In every question, the 'options' array MUST contain clean plain-text strings WITHOUT 'A.' or 'B.' letter prefixes (the UI renders letter badges automatically). The 'answer' field MUST BE THE EXACT FULL TEXT STRING that matches one of the options identically. NEVER output just a letter like 'A' or 'B' as the answer! Provide 4-6 comprehension questions in MC or TF format, at least 1 inference + 1 fact + 1 opinion.
   color: #EF4444
   comprehensiveFeedback: Answer key with line references, skills training (preview, skim, scan), timed reading suggestion, critical thinking (author's purpose and tone).
   ➡️ Ending: 📝 essay_writing — "Write a 3-sentence summary of the text, then add your personal opinion in one more sentence."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟥 Activity 18 — Read Aloud / Karaoke**
   type: "read_aloud"
   title: "📢 Read Aloud — Speak with Confidence"
   content: JSON string: {"text":"A 30-60 word paragraph from the lesson text."}. The "text" is SPOKEN ALOUD and tracked word by word by a speech recognizer, so it MUST be plain spoken English: normal words, spaces and ordinary punctuation only. NEVER insert intonation arrows (↗ ↘ → ↑ ↓), brackets, dashes used as signs, emoji, IPA slashes /fəˈnetɪk/, bullets or any symbol — the microphone cannot pronounce them and the reader stalls on that mark forever. If you want to show where the voice rises or falls, say it in comprehensiveFeedback in words, or wrap a stressed word in <b>…</b> (bold is display-only and the reader ignores it).
   color: #EF4444
   comprehensiveFeedback: Fluency rubric (pace, phrasing, expression), recording self-assessment checklist, and the intonation patterns described in words (e.g. "rise on the question tags ↗" written as prose), never as symbols inside the spoken text.
   ➡️ Ending: 🔊 voice_recording — "Record your reading, listen back, note 2 things to improve, then re-record."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🎯 Activity 19 — Split View (Side-by-Side Comparison)**
   type: "paragraph"
   title: "📊 Split View — Compare & Contrast"
   content: HTML string with a 2-column table. Left column: Version A (e.g., formal letter, academic text, English). Right column: Version B (e.g., informal email, casual speech, translation). Lay the two versions out as a RESPONSIVE two-block grid: <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;"> with one tinted card per version (var(--theme-info-10) for Version A, var(--theme-secondary-10) for Version B) - never a fixed 50% table. Mark key differences with <span style="color:var(--theme-error);font-weight:700;">a labelled contrast point</span>.
   color: #6366F1
   comprehensiveFeedback: Key differences highlighted (tone, vocabulary, structure), when to use each register, personalized question ("In your job, would you use version A or B? Why?").
   ➡️ Ending: 📝 essay_writing — "Rewrite a formal paragraph in an informal style, or vice versa."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**⬜ Activity 20 — Guided Writing / Scaffold Writing**
   type: "paragraph"
   title: "🪜 Guided Writing — Build Your Paragraph"
   content: HTML string. Provide sentence starters and paragraph frames. Format as a structured template:
   - Topic sentence: <code>[Start with: "..."]</code>
   - Supporting detail 1: <code>[Use: "For example,..."]</code>
   - Supporting detail 2: <code>[Use: "Furthermore,..."]</code>
   - Concluding sentence: <code>[End with: "In conclusion,..."]</code>
   Include a bank of transition words. Total: 150-200 words of guidance.
   color: #6B7280
   comprehensiveFeedback: Model paragraph with annotations (topic sentence, supporting details, concluding sentence), transition words bank, common mistakes (run-on sentences, comma splices) with corrections.
   ➡️ Ending: 📝 essay_writing — "Complete the scaffold, then rewrite the paragraph without the starters."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**⬜ Activity 21 — Paragraph Organiser (Reorder Sentences)**
   type: "sorting"
   title: "📋 Paragraph Organiser — Put It in Order"
   content: JSON string: {"categories":["Sentence 1 (Topic)","Sentence 2","Sentence 3","Sentence 4 (Conclusion)"], "items":[{"text":"First sentence...","category":"Sentence 1 (Topic)"},{"text":"Second sentence...","category":"Sentence 2"},...]}. 4-6 items to sort into correct paragraph order.
   color: #6B7280
   comprehensiveFeedback: Correct order with justification (chronology, cause-effect, general-to-specific), cohesion analysis (pronoun referencing, linking words), study skill (use this to plan writing).
   ➡️ Ending: 🔊 voice_recording — "Read the organised paragraph aloud and explain why you placed the sentences in that order."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟨 Activity 22 — Dictation (from Listening Sentences)**
   type: "dictation"
   title: "✍️ Dictation — Type the Exact Words"
   content: JSON string array of 3-5 sentences (80-120 words total) drawn from the listening section. Include full punctuation.
   color: #EAB308
   comprehensiveFeedback: Exact sentence transcription, punctuation rules, capitalisation notes, homophone alert (there/their/they're), typing speed tip (accuracy first).
   ➡️ Ending: 📝 essay_writing — "After dictation, extend one sentence into a short paragraph on the same topic."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🎯 Activity 23 — Typing Speed Race**
   type: "typing_speed"
   title: "⌨️ Typing Speed Race — Type It Fast"
   content: JSON string: {"text":"A meaningful 10-20 word sentence from the lesson text."}
   color: #6366F1
   comprehensiveFeedback: Speed and accuracy tips, keyboard shortcut recommendations, future skill (efficient digital communication).
   ➡️ Ending: 🔊 voice_recording — "After typing, say the sentence aloud from memory without looking at the screen."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🎯 Activity 24 — Text Reconstruction**
   type: "scramble"
   title: "🧩 Text Reconstruction — Piece It Together"
   content: JSON string array: [{"sentence":"paragraph | sentence | one | chunks | in | order","answer":"paragraph sentence one chunks in order","hint":"Discourse marker hint"},{"sentence":"next | logical | step | sentence | chunks","answer":"next logical step sentence chunks","hint":"Next logical step"},...]. Break 3-5 sentences from the reading into pipe-separated chunks. CRITICAL: Remove all punctuation (periods, commas, question marks, exclamation marks, quotes) from BOTH the scrambled chunks in 'sentence' and the complete sentence in 'answer'.
   color: #6366F1
   comprehensiveFeedback: Correct sequence with discourse markers highlighted, logical connectors (first, next, as a result) used as clues, everyday skill (reconstructing a broken story in conversation).
   ➡️ Ending: 📝 essay_writing — "Reconstruct the text, then write a short continuation (2-3 sentences)."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🎯 Activity 25 — Sequence Ordering / Timeline Placement**
   type: "paragraph"
   title: "📅 Timeline — Put Events in Order"
   content: HTML string. Present a list of 5-8 events, dates, or steps from the lesson text in scrambled order. Format as an HTML <ol> with each item numbered for reference. Below the list, provide a <table> or <div> grid where the learner can mentally reorder. Include the correct timeline at the bottom inside <details><summary>Show Correct Order</summary>[ordered list]</details>.
   color: #6366F1
   comprehensiveFeedback: Completed timeline with sequence words, note-taking method (timeline graphic organiser), exam tip (dates and sequence signals are key for ordering tasks).
   ➡️ Ending: 🔊 voice_recording — "Narrate the timeline as a continuous story in your own words."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟫 Activity 26 — Speaking: Just A Minute (JAM)**
   type: "speaking_jam"
   title: "⏱️ Just A Minute — Speak for 60 Seconds"
   content: JSON string with EXACTLY 3 different topic cards: {"topic":"Topic phrase","bullets":["Talk about X","Mention Y","Give your opinion on Z"]}
   color: #D97706
   comprehensiveFeedback: Model 60-second speech (text), structure (opinion → reason → example → conclusion), fluency strategies (fillers, circumlocution), feedback checklist (hesitation, repetition, relevance).
   ➡️ Ending: 🔊 voice_recording — "Record your own JAM, listen, self-evaluate with the checklist, then re-record."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟧 Activity 27 — Sorting Activity**
   type: "sorting"
   title: "📊 Sorting — Categorize It"
   content: JSON string: {"categories":["Formal","Informal","Neutral"], "items":[{"text":"Good morning","category":"Formal"},{"text":"Hey","category":"Informal"},...]}. 8-12 items across 2-3 categories.
   color: #F97316
   comprehensiveFeedback: Correct categories with borderline cases discussed, why a word belongs to a specific register, learner's life application ("Which bucket would you use when speaking to your boss?").
   ➡️ Ending: 📝 essay_writing — "Write 2 short emails: one formal, one informal, using sorted phrases correctly."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟫 Activity 28 — Speaking Game (Truth, Dare, Never Have I Ever, Would You Rather)**
   type: "speaking_game"
   title: "🎲 Speaking Game — [Game Name]"
   content: JSON string with {"game": "Speaking Game", "rounds": [{"type": "truth" | "dare" | "never" | "would_you_rather", "text": "Question/prompt content"}]}. You MUST generate exactly: 2-3 Truth questions (type: "truth"), 2-3 Dare challenges (type: "dare"), 2-3 "Never Have I Ever" prompts (type: "never"), and 2-3 "Would You Rather" dilemmas (type: "would_you_rather"), totaling 8 to 12 rounds. Every round must strictly recycle the lesson's target vocabulary and grammar, challenging the user in a safe and engaging way.
   color: #D97706
   comprehensiveFeedback: Sample replies using target language, social-emotional learning (safe sharing, respectful listening), soft skill (impromptu speaking, thinking on feet).
   ➡️ Ending: 🔊 voice_recording — "Play a full round. Record your answers to at least one of each prompt type."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟫 Activity 29 — Movie Scene (Karaoke Roleplay)**
   type: "movie_scene"
   title: "🎭 Movie Scene — Karaoke Roleplay"
   content: JSON string with: intro (setting the scene), lines array (8-12 lines alternating NPC and "You", each line with a voice tag like [male2] or [female3] so the platform reads each character aloud with a distinct voice; add stage directions and emotions). Include 3 register versions embedded in the content as note: neutral, casual (slang/reduced forms), formal (polite/complete sentences).
   color: #D97706
   comprehensiveFeedback: Performance tips (emphasis, emotion, pausing), cultural nuance (body language and gestures appropriate to the scene), language use (scripted vs. natural speech).
   ➡️ Ending: 🔊 voice_recording — "Record the scene with a partner or play both roles yourself. Focus on expressive delivery."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟫 BONUS — Multi-Character Listening Script (Panel Discussion / Dialogue Review)**
   type: "listening_script"
   title: "🎧 Listening — [Panel / Dialogue Name]"
   content: A plain-text multi-line script (NOT JSON). Every line starts with a voice tag [male1]-[male5], [female1]-[female5], or [child1]/[child2], optionally followed by a display-only speaker name ("[female1]Sophia: ..."). 8-12 lines on the section topic. The platform renders a Play Script player with distinct voices per character, karaoke line highlighting, and a Show/Hide Transcript toggle.
   color: #EAB308
   comprehensiveFeedback: Key ideas of the discussion, who said what, listening strategy tips.
   ➡️ Ending: 🔊 voice_recording — "Replay one line, shadow the speaker, then record your own answer to the panel's question."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🟦 Activity 30 — Final Review & Discussion**
   type: "questions"
   title: "💬 Final Review & Discussion — Real-Life Application"
   content: 5-7 thoughtful, real-life transfer questions about the lesson topic. Format ONLY as a numbered list of questions (e.g. "1. Question... \n 2. Question..."). DO NOT mix or include any answers in this content field.
   color: #3B82F6
   comprehensiveFeedback: Model/sample answers to each of the 5-7 transfer questions, "How will you use this language tomorrow?" advice — model answers for work/study/travel/social, goal-setting (choose one phrase to use today), reflection (easiest/hardest activity and why).
   ➡️ Ending: 🔊 voice_recording — "Record a 1-minute reflection: one thing you learned, one thing you'll use today, and one question you still have."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

--- SECTION STRUCTURE SUMMARY ---
Each section's activities array MUST follow this blueprint:
1. **Lesson/Teaching Text** (type: "paragraph") — the core content from the source for this section. CRITICAL OVERRIDE REQUIREMENT: You MUST 5X (five times) the length of the lesson text and rewrite the concepts beautifully. Talk to the learners directly in the 2nd person ("you") as this is self-study. Explain the concepts in a simple-to-understand yet extremely detailed way. You must heavily style this section using HTML: add color-coded text, warning/tip boxes, callout cards, highlight important notes, and use bullet points or tables where helpful. Do NOT write a short or 1-paragraph text under any circumstance. Make it an incredibly comprehensive, exhaustive, engaging masterclass lesson text.
2. **Image** (inline in paragraph OR via settings.lessonImages)
3. **YouTube Video** (inline in paragraph OR via settings.lessonVideos)
4. **Skills Activities** from the 30-activity template above — only include activities whose skills are present in this section's text
5. **Ending Practice** — each activity above must be followed by either voice_recording or essay_writing

--- CRITICAL RULES ---
- ALL 30 activity types MUST appear across the full lesson's sections (5-8 sections minimum).
- The SPEAKING GAME (activity 28) is MANDATORY in at least one section. Vary the game type.
- Voice Recording and Essay Writing MUST each appear in at least 4 different sections (every activity must be paired with one or the other).
- The GRAMMAR BOX (activity 8) MUST include: Form, Meaning, Use, CCQs, Common Q&A, and How/When/Where usage guide.
- The LISTENING (activity 13) MUST include BOTH multiple choice AND true/false questions mixed together.
- Include "Answers & Feedback" (comprehensiveFeedback) with personalized tips for EVERY activity — never skip it.
- Include "How/When/Where" usage tips in every comprehensiveFeedback.
- Include at least 1 image AND 1 YouTube video per section (in paragraph activities or settings). 🔒 NON-NEGOTIABLE: every image URL must be a real, direct image file URL (images.unsplash.com/photo-…, images.pexels.com/photos/…, upload.wikimedia.org/…) — never search pages or invented URLs. Every YouTube URL must be a real watch/youtu.be URL with an EXACTLY 11-character video ID, still live in 2026 — never invent IDs. Add altText and sourceUrl fields so the teacher can edit them in Lesson Settings.
- **Push to the limit**: Make every activity as long, detailed, and rich as possible.
- **SELF-CONTAINED LESSON (CRITICAL & NON-NEGOTIABLE)**: Never refer to external books, materials, pictures, diagrams, or source texts. Never say "according to the text". All text or paragraphs must be included directly in the activity's content itself.

--- REQUIRED JSON SCHEMA ---
{
  "sections": [
    {
      "title": "Section Title (with Emoji)",
      "color": "#58cc02",
      "studyTime": "45 minutes",
      "xpReward": 100,
      "activities": [
        {
          "type": "paragraph",
          "title": "📖 Lesson Text — [Topic]",
          "content": "<div style='font-size:1.05rem;line-height:1.8;'><p>CRITICAL OVERRIDE: This Lesson Text MUST be extremely detailed (at least 5X the length, 800+ words). Rewrite the concepts beautifully and talk to the learner directly in the 2nd person ('you') for self-study. Include: intro hook, detailed concepts, interactive notes, key terminology tables, collocations, common pitfalls, and warning/tip boxes styled with borders. Do NOT write a short section.</p>[Full beautifully styled, detailed, multi-paragraph masterclass lesson text with collocations, info-boxes, and tables goes here...]</div>",
          "comprehensiveFeedback": "<b>Reading Notes:</b> Key takeaways..."
        },
        {
          "type": "paragraph",
          "title": "📺 Watch & Learn",
          "content": "<div style='position:relative;padding-bottom:56.25%;height:0;'><iframe src='https://www.youtube.com/embed/VIDEO_ID' style='position:absolute;top:0;left:0;width:100%;height:100%;border-radius:12px;' allowfullscreen></iframe></div>",
          "comprehensiveFeedback": "Key moments to watch..."
        },
        {
          "type": "questions",
          "title": "🚀 Topic Preview — Quick Start",
          "content": "1. Connecting hook and warm-up question 1?\\n2. Warm-up question 2 connecting to daily life?",
          "comprehensiveFeedback": "<b>Model Answers:</b> 1. Sample natural answer...<br>2. Sample natural answer...<br><b>Why this matters:</b> Real-life value...<br><b>Cultural tip:</b> ..."
        },
        {
          "type": "vocabulary_table",
          "title": "📖 Vocabulary in Context",
          "content": "[{\\"word\\":\\"example\\", \\"translation\\":\\"[translation]\\", \\"definition\\":\\"meaning\\", \\"example\\":\\"Personalized for \\${learner.name}\\", \\"ccq\\":\\"CCQ?\\"}]",
          "comprehensiveFeedback": "<b>Answers &amp; Feedback:</b> Usage notes, synonyms, collocations..."
        },
        {
          "type": "voice_recording",
          "title": "🔊 Speak: Record Your Answer",
          "content": "{\\"prompt\\":\\"Record a 30-second reply to...\\", \\"text\\": \\"\\", \\"type\\": \\"voice_recording\\"}",
          "comprehensiveFeedback": "<b>Speaking Tips:</b> Pronunciation, fluency, and content suggestions..."
        },
        {
          "type": "matching",
          "title": "🧩 Vocabulary Matching",
          "content": "[{\\"left\\":\\"Word\\",\\"right\\":\\"Definition\\"}]",
          "comprehensiveFeedback": "<b>Answers &amp; Feedback:</b> Correct pairs explained with nuance..."
        },
        {
          "type": "essay_writing",
          "title": "📝 Write: Essay Practice",
          "content": "{\\"prompt\\":\\"Write a 4-sentence paragraph using 3 vocabulary items...\\", \\"minWords\\": 50, \\"type\\": \\"essay_writing\\"}",
          "comprehensiveFeedback": "<b>Writing Tips:</b> Structure, vocabulary use, and model paragraph..."
        }
      ]
    }
  ],
  "lessonSummary": "A concise summary of the entire lesson for the teacher.",
  "settings": {
    "teacherNotes": "Tips on how to study this lesson...",
    "homeworkChecklist": "Task 1: ...\\nTask 2: ...\\nTask 3: ...",
    "materialLinks": "https://www.google.com/search?q=Topic+resources\\nhttps://www.youtube.com/watch?v=VIDEO_ID",
    "lessonImages": [
      { "id": "img-1", "url": "https://images.unsplash.com/photo-XXXX?auto=format&fit=crop&w=1200&q=80", "caption": "Relevant image description", "type": "image", "altText": "Accessible description", "sourceUrl": "https://unsplash.com/photos/..." }
    ],
    "lessonVideos": [
      { "id": "vid-1", "url": "https://www.youtube.com/watch?v=EXACT_11_CHAR_ID", "caption": "Topic-related video", "type": "youtube", "sourceUrl": "https://www.youtube.com/watch?v=EXACT_11_CHAR_ID" }
    ]
  }
}
`;

        case 'examPrepLesson':
            return `${baseInstruction}
--- CONTENT TYPE: Exam Prep Lesson ---
The user will provide a raw text in the next message. Create a lesson using this text to teach specific exam skills for **${learner.examPrepDetails || "a standardized English exam"}**.

${microLessonTextArchitecture}

--- EXAM PREP ORGANISATION OVERRIDE (APPLIES TO ALL 17 ACTIVITIES BELOW) ---
Each of the 17 activities is its own card, and exam prep is the easiest lesson type to turn into a wall of text. Hard rules:
- Deliver every long activity (warm-up task, 500-word strategy workshop, guided practice, mock task, model answer, three practice
  tests, cheat sheet, study plan) as 3-7 SHORT LABELLED BLOCKS: sub-head, then 2-4 sentences OR a list OR a table OR a box.
- Practice tests must be laid out as: instruction block -> numbered questions -> answer key with a one-line reason per answer,
  using <ol>/<ul> and the coloured boxes - never one continuous paragraph of test + key.
- Model-answer comparison (Version A vs Version B) is a two-block comparison: one box per version, each with a score line and
  3-5 rubric bullets. Do not interleave the two versions inside one block.
- Rubrics, checklists and the cheat sheet must be scannable: sub-head + box per criteria group, bullets of at most 14 words,
  and ☐ checkboxes for anything the learner ticks off. Never emit a rubric as prose.
- Always label each box with its word (Did You Know?, Be Careful!, Common Error, Collocations, Q&A, Past Exam Case Study) so the
  learner knows what kind of support they are reading, and keep one colour per box type.

--- METHODOLOGY: TEST-TEACH-TEST + INPUT FLOODING + BLOOM'S TAXONOMY + EXAM PRACTICE ---
Break the source text into 3-5 logical exam task sections.
For **EACH SECTION**, generate exactly **17 ACTIVITIES**. Do not skip any.
Push your capacity to the absolute limit: create super detailed, exhaustive, academic, and highly scaffolded study guides/lessons. Provide 10X more information and explanation than usual.

--- MANDATORY VISUAL STYLE & COLOR-CODED BOXES ---
To make the content extremely visually appealing, professional, and readable, you MUST integrate several colour-coded container boxes styled with inline CSS. Use these boxes heavily across ALL activities (except the Vocabulary table) to organise explanations, highlight tips, and warn the learner. ALWAYS colour them with theme tokens as shown - never with fixed light hex values, because the exported lesson must stay readable in dark mode too. Keep ONE colour per box type for the whole lesson, and always keep the box title line so the learner knows what kind of support they are reading:

- **Did You Know?**: 
  <div style="background:var(--theme-success-14); border-left:4px solid var(--theme-success); padding:14px 16px; border-radius:10px; margin:14px 0;">
    <strong style="color:var(--theme-text); font-size:1.1em;">💡 Did You Know?</strong>
    <p style="margin: 5px 0 0 0;color:var(--theme-text);">[Detailed, interesting, and high-value background info related to the exam/concept]</p>
  </div>

- **Be Careful!**: 
  <div style="background:var(--theme-warning-14); border-left:4px solid var(--theme-warning); padding:14px 16px; border-radius:10px; margin:14px 0;">
    <strong style="color:var(--theme-text); font-size:1.1em;">⚠️ Be Careful!</strong>
    <p style="margin: 5px 0 0 0;color:var(--theme-text);">[Crucial trap alerts, common points of confusion, or scoring pitfalls]</p>
  </div>

- **Common Errors**: 
  <div style="background:var(--theme-error-14); border-left:4px solid var(--theme-error); padding:14px 16px; border-radius:10px; margin:14px 0;">
    <strong style="color: var(--theme-text); font-size: 1.1em;">❌ Common Error</strong>
    <p style="margin: 5px 0 0 0;color:var(--theme-text);">[A specific incorrect attempt/form contrasted directly with the correct alternative and explanation]</p>
  </div>

- **Common Collocations**: 
  <div style="background:var(--theme-info-14); border-left:4px solid var(--theme-info); padding:14px 16px; border-radius:10px; margin:14px 0;">
    <strong style="color:var(--theme-text); font-size:1.1em;">🔗 Common Collocations</strong>
    <p style="margin: 5px 0 0 0;color:var(--theme-text);">[Highly relevant word pairings or idiom groups used for higher Lexical Resource marks]</p>
  </div>

- **Q&A Section**: 
  <div style="background:var(--theme-secondary-14); border-left:4px solid var(--theme-secondary); padding:14px 16px; border-radius:10px; margin:14px 0;">
    <strong style="color:var(--theme-text); font-size:1.1em;">❓ Q&A Section</strong>
    <div style="margin: 5px 0 0 0;color:var(--theme-text);"><strong>Q:</strong> [Question]<br><strong>A:</strong> [Deep analytical answer]</div>
  </div>

- **Real Examples from Past Exams**: 
  <div style="background:var(--theme-text-secondary-10); border-left:4px solid var(--theme-text-secondary); padding:14px 16px; border-radius:10px; margin:14px 0;">
    <strong style="color: var(--theme-text); font-size: 1.1em;">📝 Past Exam Case Study</strong>
    <p style="margin: 5px 0 0 0;color:var(--theme-text);">[A grounded, real example or actual question snippet from a past standardized exam like IELTS, TOEFL, Cambridge, etc. detailing exactly what the test makers expect. Ground this in real-world exam requirements obtained from search if needed.]</p>
  </div>

--- CRITICAL HTML TABLE SPACING RULE ---
NEVER insert <br> or <p> tags directly inside a <table> element. Do not put a <br> after the <table> opening tag, between <tr> tags, or between <td> tags. A <table> must only contain valid table-structured tags (thead, tbody, tr, th, td) with no loose <br> tags anywhere inside.

--- NO ACCORDIONS/DETAILS POLICY (CRITICAL) ---
NEVER use show-answer accordions, expandable buttons, or '<details>'/'<summary>' tags for Homework assignments, Practice Tests, or anything else in the lesson content. ALL content, instructions, prompts, and answers (for practice tests/homework keys) must be displayed openly and beautifully directly in the prose/feedback, so they are fully visible without requiring the user to expand or click anything.

**Practice (CRITICAL):** The learner makes these persistent errors: "${learner.commonMistakes || 'None specified'}". Flood the content with correct usage and practice of these points. Use "Common Errors" boxes to specifically focus on these mistakes.
**Explanation Depth:** Provide 10X more explanation than usual. Push the AI to its absolute limit, adding layers of academic detail and information.

**BLOOM'S TAXONOMY MAPPING**:
- Levels 1-2 (Remember/Understand): Warm-up, Source Text, Explanation, Language Analysis
- Level 3 (Apply): Strategy Workshop, Guided Practice
- Level 4 (Analyze): Mock Task, Feedback & Model Analysis (Version A vs. B)
- Level 5 (Evaluate): Exam Skill Practice Tests 1, 2, & 3, Self-Assessment Rubrics & Checklists, Cheat Sheet & Reference, Personalised Study Plan
- Level 6 (Create): Homework Task, Voice Recording, Essay Writing

**HOW/WHEN/WHERE USAGE**: For every vocabulary item and exam strategy point, include explicit tips on WHERE (speaking section, writing task, reading passage), WHEN (during the exam vs. in real life), and HOW (formal register, academic tone, time-saving technique) to use it.
**SELF-CONTAINED LESSON (CRITICAL & NON-NEGOTIABLE)**: The lesson MUST be completely self-contained and independent. Do NOT refer to external books, videos, PDFs, page numbers, or the original source text. You are STRICTLY FORBIDDEN from referring to any pictures, diagrams, text, or page numbers from the source material, and NEVER say "read the text in the book", "according to the text", "as mentioned in the article", or similar. Since these lessons are completely self-contained, if context, paragraphs, stories, or complete exact texts are needed to answer any question, you MUST embed those paragraphs or exact texts directly inside the activity's content itself, and then ask the questions from it. Every instruction, question, and activity must work entirely on its own.

${feedbackInstruction}
${answerDistribution}
${settingsInstruction}
${formattingRules}

--- REQUIRED STRUCTURE FOR EACH SECTION ---
Activities mapped to Bloom's Taxonomy levels (strictly follow this 17-activity order):

🔷 **REMEMBER & UNDERSTAND (Levels 1-2)**:
1.  **Warm up (Test)** (type: 'paragraph')
    - Title: '🩺 Warm up'
    - Content: A mini-task (500 words) testing the skill BEFORE teaching it. Include task, answers, and detailed feedback explaining *why* each is right/wrong. Style using the visual boxes where appropriate.
    - comprehensiveFeedback: Detailed analysis of common errors in this skill area.

2.  **Coherent Input Text** (type: 'paragraph')
    - Title: '📖 Source Text'
    - Content: The specific chunk of the Raw Text for this section, formatted with HTML.
    - comprehensiveFeedback: Reading strategies and annotation tips.

3.  **Detailed Explanation (Teach)** (type: 'paragraph')
    - Title: '💡 Explanation:'
    - Content: Explain with analogies related to learner interests (${learner.interests}). Include 3 CCQs with answers. Integrate at least one "Did You Know?" or "Be Careful!" box to structure the content.
    - comprehensiveFeedback: Extended explanation with additional examples.

4.  **Language Analysis (Teach)** (type: 'paragraph')
    - Title: '🔬 Language Analysis'
    - Content:
        - HTML Table for Vocabulary (Word | Form | Meaning | Use | Translation | Example | Where/When to Use).
          *CRITICAL*: The vocabulary words MUST be high-level, challenging academic words extracted strictly from the Coherent Input Text of this lesson.
          *STRICT LAYOUT RULE*: Do NOT write any introductory text, titles, descriptions, or line breaks before the table. The activity content MUST start directly with the '<table>' tag (with class "vocab-table") to prevent any empty space above it. No <br> tags inside <table>!
        - Grammar Explanation with color-coded highlighting of critical structures.
        - Practice corrections for common mistakes using the "Common Errors" box style. Include "Common Collocations" and "Q&A" boxes to explain structures.
    - comprehensiveFeedback: Why each vocabulary item matters for the exam.

🔷 **APPLY (Level 3)**:
5.  **Strategy Workshop (Teach)** (type: 'paragraph')
    - Title: '🛠️ Strategy Workshop'
    - Content: 500+ words on high-scoring strategies, time management, scoring criteria, and "Band Booster" tips. Highlight critical tips in "Be Careful!" or "Past Exam Case Study" boxes.
    - comprehensiveFeedback: Additional strategies and common pitfalls.

6.  **Guided Practice (Scaffolding)** (type: 'paragraph')
    - Title: '🪜 Guided Practice'
    - Content: A heavily supported task (500 words). Step-by-step application of strategies. Use beautiful boxes for hints and common pitfalls.
    - comprehensiveFeedback: Detailed walkthrough of the ideal approach.

🔷 **ANALYZE (Level 4)**:
7.  **Simulated Mock Task (Test)** (type: 'paragraph')
    - Title: '⏱️ Simulated Mock Task'
    - Content: A strict, timed task mimicking the real exam exactly.
    - comprehensiveFeedback: Time management tips and exam-day advice.

8.  **Feedback & Model Analysis (Model Answer Comparison)** (type: 'paragraph')
    - Title: '🏆 Model Answer'
    - Content: Present TWO versions for contrastive learning:
        - **Version A (Poor Version)**: A response demonstrating weak performance, common student errors, or lack of structure. Include "Approximate Score: [Poor Score]" and bulleted rubric-based comments explaining why this version is sub-optimal and fails key criteria. Style with "Common Errors" box.
        - **Version B (Perfect Version)**: A responses demonstrating elite exam performance, rich vocabulary, and ideal structure. Include "Approximate Score: [Perfect Score]" and bulleted rubric-based comments highlighting why it achieves a high score under the test criteria. Style with "Did You Know?" and "Common Collocations" boxes.
    - comprehensiveFeedback: Scoring rubric breakdown and self-assessment checklist.

🔷 **EVALUATE & ADAPT (Level 5)**:
9.  **Exam Skill Practice Test 1 (Real Exam Condition)** (type: 'paragraph')
    - Title: '📝 Exam Practice Test 1'
    - Content: A complete, realistic exam practice test targeting the specific skills learned. Include full instructions, question prompts, and a comprehensive answer key with explanations at the bottom (NEVER inside '<details>' or accordions, display them openly). Ground this strictly in real past exams or official exam specifications. Style nicely using the visual boxes.
    - comprehensiveFeedback: Analytical breakdown of typical test items.

10. **Exam Skill Practice Test 2 (Real Exam Condition)** (type: 'paragraph')
    - Title: '📝 Exam Practice Test 2'
    - Content: A second complete, realistic exam practice test targeting the specific skills learned with different questions or a slightly different angle. Include full instructions, question prompts, and a comprehensive answer key with explanations at the bottom (NEVER inside '<details>' or accordions, display them openly). Ground this strictly in real past exams or official exam specifications. Style nicely using the visual boxes.
    - comprehensiveFeedback: Deep-dive reasoning for correct choices on alternative tasks.

11. **Exam Skill Practice Test 3 (Real Exam Condition)** (type: 'paragraph')
    - Title: '📝 Exam Practice Test 3'
    - Content: A third complete, realistic exam practice test targeting the specific skills learned. Include full instructions, question prompts, and a comprehensive answer key with explanations at the bottom (NEVER inside '<details>' or accordions, display them openly). Ground this strictly in real past exams or official exam specifications. Style nicely using the visual boxes.
    - comprehensiveFeedback: Speed strategies and confidence-building advice.

12. **Self-Assessment Rubrics & Checklists** (type: 'paragraph')
    - Title: '📋 Self-Assessment Rubrics & Checklists'
    - Content: A beautifully styled, color-coded modern review card. Provide interactive-style self-assessment tables and checkbox grids (e.g. ☑️ Cohesion, ☑️ Grammatical Range) with specific criteria guidelines so learners can audit their own performance before submitting productive work.
    - comprehensiveFeedback: The science of self-assessment and why self-editing is the hallmark of elite exam candidates.

13. **Cheat Sheet & Grammar Reference** (type: 'paragraph')
    - Title: '🧠 Exam Cheat Sheet'
    - Content: A consolidated cheat sheet version of key strategies, critical grammar formulas, and common mistakes to review. Style it with beautifully colored cards (e.g., using div style="background:var(--theme-secondary-10); padding:12px 14px; border-left:4px solid var(--theme-secondary); border-radius:10px; margin-bottom:12px;") that are highly scannable for learners to easily recycle.
    - comprehensiveFeedback: High-yield memory triggers and rapid-review mnemonics.

14. **Adaptive Study Plan & Recommendations** (type: 'paragraph')
    - Title: '⚡ Personalised Study Plan'
    - Content: A modern, visually appealing personalized study path. Provide clear "If-Then" recommendations based on how well they understood the previous practice (e.g., "If you struggled with the Guided Practice, study reference X. If you scored high on the Mock Task, challenge yourself with extension activity Y").
    - comprehensiveFeedback: Recommendations for further practice outside this lesson.

🔷 **CREATE (Level 6)**:
15. **Homework Task** (type: 'list')
    - Title: '🏠 Homework Mission'
    - Content: A high-fidelity list-based speaking/writing task with clear instructions, sentence starters, grammar checklists, and strict success criteria. NEVER use expandable accordions or show-answer foldouts for the task.
    - comprehensiveFeedback: How to self-evaluate homework and track improvement.

16. **Recorded Exam Task** (type: 'voice_recording')
    - Title: '🎤 Record Your Answer'
    - Content: '{"prompt": "Record your answer for the speaking mock task. Timing is critical.", "text": "", "type": "voice_recording"}'
    - comprehensiveFeedback: Speaking tips and evaluation criteria.

17. **Written Exam Task** (type: 'essay_writing')
    - Title: '✍️ Submit Your Essay'
    - Content: '{"prompt": "Write your full essay for the mock task here.", "minWords": 150, "type": "essay_writing"}'
    - comprehensiveFeedback: Writing tips, formatting, and scoring insights.

--- REQUIRED JSON SCHEMA ---
{
  "sections": [
    {
      "title": "Section Title",
      "color": "#ef4444",
      "studyTime": "45 minutes",
      "activities": [
        { "type": "paragraph", "title": "🩺 Warm up", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "📖 Source Text", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "💡 Explanation:", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "🔬 Language Analysis", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "🛠️ Strategy Workshop", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "🪜 Guided Practice", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "⏱️ Simulated Mock Task", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "🏆 Model Answer", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "📝 Exam Practice Test 1", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "📝 Exam Practice Test 2", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "📝 Exam Practice Test 3", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "📋 Self-Assessment Rubrics & Checklists", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "🧠 Exam Cheat Sheet", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "⚡ Personalised Study Plan", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "list", "title": "🏠 Homework Mission", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "voice_recording", "title": "🎤 Record Your Answer", "content": "{\\"prompt\\":\\"Record your answer for the speaking mock task.\\", \\"text\\": \\"\\", \\"type\\": \\"voice_recording\\"}", "comprehensiveFeedback": "..." },
        { "type": "essay_writing", "title": "✍️ Submit Your Essay", "content": "{\\"prompt\\":\\"Write your full essay for the mock task here.\\", \\"minWords\\": 150, \\"type\\": \\"essay_writing\\"}", "comprehensiveFeedback": "..." }
      ]
    }
  ],
  "lessonSummary": "Summary for the teacher.",
  "settings": {
    "teacherNotes": "Tips and strategies...",
    "homeworkChecklist": "Daily tasks...",
    "materialLinks": "URL 1\\nURL 2..."
  }
}
`;

        case 'conversationalLesson':
            return `${baseInstruction}
--- CONTENT TYPE: Conversational English Lesson ---
Design a speaking-focused lesson based on the provided raw text (next message).

${microLessonTextArchitecture}

--- CONVERSATIONAL ORGANISATION OVERRIDE (APPLIES TO EVERY MODULE BELOW) ---
A speaking lesson must be immediately speakable, so keep the reading load tiny and the prompts loud:
- The Language Focus activity is NOT a word dump: deliver it as blocks - one small block per phrase cluster (sub-head, the 2-3
  phrases as bullets with translations, one "say it when ..." line), plus a "Spoken Grammar Tip" box and a "Where & When" box.
  Never one long paragraph of 8 phrases with notes.
- The Communication Toolkit activity must be four labelled blocks (Sentence Starters / Phrases / Spoken Grammar / When & Where to
  Use), each a short bullet list, not one flowing paragraph.
- The Discussion activity (type "questions") holds QUESTIONS ONLY - one question per line, at most 6 per module, no answers, no
  "Q:" or "A:" labels. Model answers, follow-up prompts and vocabulary notes belong in comprehensiveFeedback.
- Every speaking prompt (speaking_jam, speaking_game, roleplay) must state the task in ONE short line the learner can act on
  without re-reading the text above it.

--- 🏷️ CANONICAL ACTIVITY TYPE NAMES (NON-NEGOTIABLE) ---
Set every activity's "type" field to EXACTLY one canonical machine name below. NEVER use a human label as the type (e.g. type: "Dialogue model", "Speaking challenge" or "Speaking game" is a HARD FAILURE that renders as raw code), and never invent new type names. Friendly labels like "Dialogue model" belong only in the activity TITLE:
- "conversation_roleplay" → Dialogue Model & Roleplay Practice (perform-along scene: a one-line setting plus speaker lines, where the learner's lines are attributed to the speaker "You")
- "speaking_jam" → Speaking Challenge / timed talk (topic + tips + minimum seconds)
- "speaking_game" → Speaking Game card decks (rounds of truth / dare / would_you_rather / two_truths_one_lie)
- "would_you_rather", "multiple_choice", "true_false", "matching", "flashcard", "gap_fill", "error_correction", "sorting", "scramble", "questions", "list", "paragraph", "vocabulary_table", "voice_recording", "essay_writing"
Every module below already names its canonical type — keep it exactly.

--- METHODOLOGY: CONVERSATION COACH + CLT + BLOOM'S TAXONOMY ---
Goal: Get the learner speaking using high-level vocabulary. Focus on flow, register, and natural expressions.

**BLOOM'S TAXONOMY MAPPING**:
- Remember/Understand: Activation, Language Deep Dive, Communication Toolkit
- Apply: Vocabulary Practice, Dialogue Model, Roleplay
- Analyze: Speaking Game (Taboo, Would You Rather, Truth or Dare)
- Evaluate: Discussion/Debate
- Create: Voice Recording, Written Reflection

**HOW/WHEN/WHERE**: For every phrase and expression, include explicit tips on WHERE (casual chat, business meeting, phone call, social media), WHEN (first meeting, formal event, friendly catch-up), and HOW (intonation, register, reductions like "gonna", "wanna") to use it naturally.
**SELF-CONTAINED LESSON (CRITICAL & NON-NEGOTIABLE)**: The lesson MUST be completely self-contained and independent. Do NOT refer to external books, videos, PDFs, page numbers, or the original source text. You are STRICTLY FORBIDDEN from referring to any pictures, diagrams, text, or page numbers from the source material, and NEVER say "read the text in the book", "according to the text", "as mentioned in the article", or similar. Since these lessons are completely self-contained, if context, paragraphs, stories, or complete exact texts are needed to answer any question, you MUST embed those paragraphs or exact texts directly inside the activity's content itself, and then ask the questions from it. Every instruction, question, and activity must work entirely on its own.

${feedbackInstruction}
${settingsInstruction}
${formattingRules}

--- REQUIRED STRUCTURE ---
Break the text into 4-6 Conversational Modules.
For **EACH MODULE**, generate these activities:

1.  **Activation (Warm-up)** (type: 'questions')
    - Title: '🤔 Think about these questions...'
    - Content: Hyper-personalized questions connecting the topic to the learner's life (${learner.interests}).
    - comprehensiveFeedback: Why these questions activate relevant schema and how to expand answers.

2.  **Language Deep Dive** (type: 'paragraph')
    - Title: '🗣️ Language Focus'
    - Content: 5-8 Key Words/Phrases with ${translationLanguage} translations. Include a "Spoken Grammar Tip" (reductions, linking, fillers). Include a "Where & When" box explaining real-world usage contexts.
    - comprehensiveFeedback: Pronunciation tips, common confusions, and register notes for each phrase.

3.  **Communication Toolkit** (type: 'list')
    - Title: '🛠️ Communication Toolkit'
    - Content: A single HTML string with 4 visually color-coded sub-sections:
        - <b style="color: var(--theme-info);">Sentence Starters:</b> (2-3 examples, each on its own bullet)
        - <b style="color: var(--theme-success);">Phrases:</b> (2-3 examples)
        - <b style="color: var(--theme-secondary);">Spoken Grammar:</b> (1-2 practical tips)
        - <b style="color: var(--theme-warning);">🔊 When & Where to Use:</b> (context tips for each phrase)
        - Keep each block to a short bullet list of at most 4 items - never merge the four blocks into one flowing paragraph.
        - Provide ${translationLanguage} translations for all items.

4.  **Vocabulary Practice** (type: 'matching')
    - Title: '🧩 Phrase Matching'
    - Content: JSON string matching phrases to meanings. 6 pairs.
    - comprehensiveFeedback: Extended usage examples and collocations for each phrase.

5.  **Real-Life Dialogue Model** (type: 'conversation_roleplay')
    - Title: '🎭 Dialogue Model'
    - Content: JSON string with EXACTLY this shape: { "setting": "one-line situation the learner can picture", "lines": [ { "speaker": "Maya", "text": "line" }, { "speaker": "You", "text": "the line the learner performs" }, ... ] }. The engine reads "setting" (not "context") for the scene banner and treats any speaker named "You" as the learner's line, so never use a "yourTurn" array and never leave the learner without lines. Give a realistic dialogue of 8+ lines that recycles the module vocabulary, and mark the learner's lines with "You".
    - comprehensiveFeedback: Analysis of discourse markers, turn-taking strategies, and intonation patterns in the dialogue.

6.  **Structured Practice (Roleplay)** (type: 'conversation_roleplay')
    - Title: '🎬 Roleplay Practice'
    - Content: Same conversation_roleplay JSON shape as item 5 ("setting" + "lines", learner lines attributed to "You"), but a 6-10 line scenario where every one of the learner's lines is written as a natural model the learner performs aloud, followed by an open question they can extend.
    - comprehensiveFeedback: Tips on how to extend answers, show active listening, and manage conversation flow.

7.  **Speaking Challenge** (type: 'speaking_jam')
    - Title: '⏱️ Speaking Challenge'
    - Content: JSON string for JAM format. Topic derived from the section.
    - comprehensiveFeedback: Strategies for fluency, filler words to use, and how to organize thoughts quickly.

8.  **Speaking Game** — Choose ONE variety to make speaking fun:
    - 🎲 "Would You Rather" — Topic-related conversational dilemmas
    - 🎲 "Truth or Dare" — Personal questions + speaking challenges
    - 🎲 "Never Have I Ever" — Experience-sharing game
    - 🎲 "Two Truths One Lie" — Fact/opinion guessing game
    - 🎲 "Roleplay Roulette" — Improv scenarios
    - Content JSON: \`{"game":"...","rounds":[{"text":"...","type":"truth/dare/never/would_you_rather"}, ...]}\`
    - Include 6-8 rounds.
    - Title: '🎲 Speaking Game'
    - comprehensiveFeedback: How games lower the affective filter and boost fluency.

9.  **Discussion/Debate** (type: 'questions')
    - Title: '💬 Discussion'
    - Content: 5 Provocative questions or "Would You Rather" scenarios. Format as ONE question per line, questions ONLY - no answers, no "Q:"/"A:" labels, no numbering tricks (e.g. \`Question 1?\\nAnswer 1.\\nQuestion 2?\\nAnswer 2.\`). The old example above is stale: the Micro Lesson engine renders this as a clean question list with a record-your-answer button, so keep every model answer and every discussion phrase OUT of the content field and inside comprehensiveFeedback.
    - comprehensiveFeedback: Analysis of advanced vocabulary and discourse markers used in the model answers.

10. **Recorded Speaking Output** (type: 'voice_recording')
    - Title: '🎤 Express Yourself'
    - Content: \`{"prompt": "Record a short monologue summarizing your viewpoint on this topic.", "text": "", "type": "voice_recording"}\`
    - comprehensiveFeedback: Detailed feedback on fluency, intonation, and usage of key phrases.

11. **Written Reflection** (type: 'essay_writing')
    - Title: '✍️ Writing Challenge'
    - Content: \`{"prompt": "Write a paragraph expanding on your recorded answer (min 50 words).", "minWords": 50, "type": "essay_writing"}\`
    - comprehensiveFeedback: Feedback on grammar accuracy and cohesive writing flow.

--- REQUIRED JSON SCHEMA ---
{
  "sections": [
    {
      "title": "Conversational Module Title (with Emoji)",
      "color": "#0891b2",
      "studyTime": "45 minutes",
      "activities": [
        { "type": "questions", "title": "...", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "...", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "matching", "title": "...", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "conversation_roleplay", "title": "...", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "conversation_roleplay", "title": "...", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "speaking_jam", "title": "...", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "speaking_game", "title": "...", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "questions", "title": "...", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "voice_recording", "title": "🎤 Express Yourself", "content": "{\\"prompt\\":\\"Record a short monologue summarizing your viewpoint on this topic.\\", \\"text\\": \\"\\", \\"type\\": \\"voice_recording\\"}", "comprehensiveFeedback": "..." },
        { "type": "essay_writing", "title": "✍️ Writing Challenge", "content": "{\\"prompt\\":\\"Write a paragraph expanding on your recorded answer (min 50 words).\\", \\"minWords\\": 50, \\"type\\": \\"essay_writing\\"}", "comprehensiveFeedback": "..." }
      ]
    }
  ],
  "lessonSummary": "Summary for the teacher.",
  "settings": {
    "teacherNotes": "Tips and strategies...",
    "homeworkChecklist": "Daily tasks...",
    "materialLinks": "URL 1\\nURL 2..."
  }
}
`;

        case 'bilingualStudyLesson':
            return `${baseInstruction}
--- CONTENT TYPE: Bilingual Study Lesson ---
Create a scaffolded, chunk-based study module from the raw text, providing significant L1 support in **${learner.l1Language || 'their native language'}**.

${microLessonTextArchitecture}

--- BILINGUAL ORGANISATION OVERRIDE (APPLIES TO EVERY CHUNK BELOW) ---
Bilingual readers need the two languages clearly separated, so structure every activity as paired blocks:
- Annotated Text (paragraph): the chunk split into 2-4 SHORT paragraphs (2-4 sentences each), with each difficult term bolded
  and immediately glossed in ${learner.l1Language} in round brackets. Never one solid paragraph of the whole chunk.
- What it Means (paragraph): alternate blocks - one English block (2-4 sentences), then its ${learner.l1Language} counterpart as a
  visually separate block (tinted box or sub-head + paragraph). One idea per pair, never a single long bilingual wall.
- Instructions and scaffolding language is always L1 and always on its OWN line or block, never mixed into an English sentence.
- Practice and comprehension items must stay as typed activities (vocabulary_table, multiple_choice, gap_fill, voice_recording,
  essay_writing) exactly as specified below - never move practice into prose.

--- METHODOLOGY: BILINGUAL CURRICULUM DESIGN ---
Break the text into small "learning chunks" (paragraphs). Generate a study section for EVERY chunk.
CRITICAL MANDATES:
- All activity instructions (e.g., "Read the text", "Answer the questions") MUST be provided in the learner's L1 (${learner.l1Language}).
- Provide deep conceptual explanations in BOTH L1 (${learner.l1Language}) and L2 (English). Do not rely solely on word-level translations!

${feedbackInstruction}
${settingsInstruction}
${formattingRules}

--- REQUIRED STRUCTURE FOR EACH SECTION (CHUNK) ---
1.  **Annotated Text** (type: 'paragraph', title: '📖 1. Read the Annotated Text')
    - Content: The original text chunk. Difficult/key words must be **bolded** and followed by their ${learner.l1Language} translation in parentheses.
    - comprehensiveFeedback: Pronunciation guide for difficult words, word family expansions, and collocations.

2.  **Simple Explanation** (type: 'paragraph', title: '💡 2. What it Means')
    - Content: Provide conceptual explanations in BOTH the target language (English) and ${learner.l1Language}, truly explaining the concepts in the learner's native tongue, not just word-level translations. Give clear instructions for activities in ${learner.l1Language} as well.
    - comprehensiveFeedback: Cultural context, register notes, and when/where this language is used naturally.

3.  **Key Vocabulary** (type: 'vocabulary_table', title: '📝 3. Key Vocabulary')
    - Content: JSON string array of vocabulary items from this chunk with translations, definitions, examples, and CCQs. 5-8 items.
    - comprehensiveFeedback: Memory techniques, word roots, and related vocabulary families.

4.  **Check Your Understanding** (type: 'multiple_choice', title: '🤔 4. Check Your Understanding')
    - Content: JSON string with EXACTLY this shape: {"context": "optional one-line situation for the whole set", "questions": [{"question": "...", "options": ["...", "...", "..."], "answer": "the option text repeated EXACTLY as written in options", "explanation": "one-line reason"}]}. Provide 3-4 questions testing comprehension of the SOURCE TEXT chunk (never learner biography). Write the question in English and append its ${learner.l1Language} translation on the same string (English first, then the L1 gloss in round brackets); do the same inside every option so a bilingual learner can answer independently. The options are shuffled by the engine, so never reference option letters, and never answer with "A"/"B".
    - comprehensiveFeedback: Why each answer is correct/incorrect with text references.

5.  **Practice Exercises** (type: 'gap_fill', title: '✍️ 5. Practice')
    - Content: JSON string with 4-6 gap fill sentences using vocabulary/grammar from this chunk.
    - comprehensiveFeedback: Grammar rules behind each gap, common mistakes, and additional practice suggestions.

6.  **Speaking Practice** (type: 'voice_recording', title: '🎤 6. Read Aloud / Speak')
    - Content: \`{"prompt": "Record yourself reading the summary aloud or answering a question in English.", "text": "", "type": "voice_recording"}\`
    - comprehensiveFeedback: Feedback on pronunciation and fluency.

7.  **Writing Practice** (type: 'essay_writing', title: '✍️ 7. Write a Sentence')
    - Content: \`{"prompt": "Write a sentence or short paragraph using the new vocabulary.", "minWords": 20, "type": "essay_writing"}\`
    - comprehensiveFeedback: Provide corrections on structure and vocabulary.

--- REQUIRED JSON SCHEMA ---
{
  "sections": [
    {
      "title": "Chunk Title (with Emoji)",
      "color": "#10b981",
      "studyTime": "45 minutes",
      "activities": [
        { "type": "paragraph", "title": "📖 1. Read the Annotated Text", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "paragraph", "title": "💡 2. What it Means", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "vocabulary_table", "title": "📝 3. Key Vocabulary", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "multiple_choice", "title": "🤔 4. Check Your Understanding", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "gap_fill", "title": "✍️ 5. Practice", "content": "...", "comprehensiveFeedback": "..." },
        { "type": "voice_recording", "title": "🎤 6. Read Aloud / Speak", "content": "{\\"prompt\\":\\"Record yourself.\\", \\"text\\": \\"\\", \\"type\\": \\"voice_recording\\"}", "comprehensiveFeedback": "..." },
        { "type": "essay_writing", "title": "✍️ 7. Write a Sentence", "content": "{\\"prompt\\":\\"Write a sentence.\\", \\"minWords\\": 20, \\"type\\": \\"essay_writing\\"}", "comprehensiveFeedback": "..." }
      ]
    }
  ],
  "lessonSummary": "Summary for the teacher.",
  "settings": {
    "teacherNotes": "Tips and strategies...",
    "homeworkChecklist": "Daily tasks...",
    "materialLinks": "URL 1\\nURL 2..."
  }
}
`;

        case 'homework':
            return `${baseInstruction}
--- CONTENT TYPE: Homework ---
Generate a massively comprehensive, hyper-enhanced homework package (10x larger and richer than standard). Difficulty MUST be one level ABOVE the learner's CEFR level. Recycle 100% of the concepts from the raw text provided in the next message, completely transforming them into rich, immersive activities.

**INTERACTIVE CONTENT REQUIREMENT (CRITICAL)**
For structured exercises, you **MUST** provide content as **valid JSON strings** inside the string fields to enable interactive games. Double escape your quotes if necessary to maintain valid JSON inside the main JSON root.
- **Grammar Exercises**: JSON string for Scramble OR Gap Fill Game: 
  - Scramble: \`[{"sentence":"word1|word2|word3","hint":"..."}]\`
  - Gap Fill: \`[{"sentence":"This is a _ gap.","answer":"test","hint":"..."}]\`
- **Vocabulary Exercises**: JSON string for Matching/Flashcard Game: \`[{"left":"Word","right":"Definition"}]\`
- **Dialogue Script**: JSON string for Movie Scene: \`{"intro":"...","lines":[{"speaker":"A","text":"..."}]}\`
- **Speaking Task**: Provide a rich, challenging scenario for a Just-a-Minute (JAM) speaking jam. Provide the prompt string directly. *Note: This will render as both a speaking jam AND an interactive voice recording block.*
- **Writing Task**: Provide a robust writing prompt. *Note: This will render as both a guided writing planner AND a formal essay block.*
- **Session Report**: The header's Save Report button is available to learners at all times — never emit "save_report" as an activity type; it is no longer a supported activity.

${answerDistribution}
${feedbackInstruction}

--- REQUIRED JSON SCHEMA (MANDATORY 15 TASKS) ---
Generate a value for every single key. Do not omit any.
Texts must be exceptionally long and detailed (Reading > 2500 words total, Listening Scripts > 2000 words total).
ALL questions must be derived from the Source Text. Give deep, thought-provoking questions.

{
   "reading": {
       "title": "Extensive Reading Practice",
       "tasks": [
           { "title": "Task 1 (Authentic Long-form Article)", "text": "HTML Formatted Text (1500+ words). Use strong headings, bullet points, and rich vocabulary.", "questions": [{"question":"Deep inference Q","answer":"A"}], "comprehensiveFeedback": "..." },
           { "title": "Task 2 (Opinion Piece)", "text": "HTML Formatted Text (1000+ words). Casual, argumentative genre.", "questions": [{"question":"Q","answer":"A"}], "comprehensiveFeedback": "..." }
       ]
   },
   "listening": {
       "title": "Immersive Listening Practice",
       "podcast": { "title":"Expert Podcast", "scenario":"Describe the setting and the expert...", "script":"Engaging Monologue script (2000+ words) perfectly crafted for text-to-speech voice engines to read. Voice-tag each speaker line: monologue = one [male1] or [female2] tag on the first line; dialogue = every line starts with its own [male1]/[female3]/[male2]/[female1]/[child1] tag. Optional short speaker labels after the tag ("A:", "Alexander:") are shown in the transcript but never spoken.", "questions": [{"question":"Q","answer":"A"}], "comprehensiveFeedback": "..." },
       "conversation": { "title":"Real-World Conversation", "scenario":"...", "script":"Dialogue script (2000+ words) mimicking natural speech patterns. Every speaker line MUST start with a voice tag ([male1], [female3], [male2], [female1], [child1], etc.) so the platform's multi-voice Azure Natural read-aloud player assigns a distinct voice to each character.", "questions": [{"question":"Q","answer":"A"}], "comprehensiveFeedback": "..." }
   },
   "speaking": { "title":"Speaking Challenge", "instruction":"Record yourself answering this prompt.", "prompt":"A complex, multi-part speaking prompt requiring 1-2 minutes of talking.", "modelAnswer":"A highly sophisticated model answer.", "comprehensiveFeedback": "..." },
   "writing": { "title":"Creative Writing", "instruction":"Draft a comprehensive response.", "prompt":"...", "comprehensiveFeedback": "..." },
   "grammar": { "title":"Grammar Deep Dive", "explanation":"Advanced explanation of a specific grammar structure found in the text.", "exercises":"JSON String for Scramble OR Gap Fill game", "comprehensiveFeedback": "..." },
   "vocabulary": { "title":"Vocabulary Mastery", "explanation":"Nuance and collocation rules for key vocabulary.", "exercises":"JSON String for Matching game (will also generate Flashcards)", "comprehensiveFeedback": "..." },
   "dialogue": { "title":"Interactive Dialogue", "context":"...", "script":"JSON String for Movie Scene", "comprehensionQuestions": [{"question":"Q","answer":"A"}], "comprehensiveFeedback": "..." },
   "fiction": { "title":"Thematic Fiction", "story":"1500+ word personalized HTML story integrating core vocabulary seamlessly.", "questions":[{"question":"Q","answer":"A"}], "hypotheticalQuestion":"...", "comprehensiveFeedback": "..." },
   "roleplay": { "title":"Decision Roleplay", "scenario":"...", "optionA": {"description":"Effective strategy","outcome":"Positive feedback"}, "optionB": {"description":"Ineffective strategy","outcome":"Negative consequence with explanation"}, "expertComment":"...", "analysisQuestions": [{"question":"Q","answer":"A"}], "comprehensiveFeedback": "..." },
   "practical": { "title":"Practical Search", "searchTopic": "Search for this specific real-world data...", "taskInstructions": "...", "comprehensiveFeedback": "..." },
   "review": { "title":"Weekly Review", "analysis":"Detailed takeaway analysis of progress.", "questions": [{"question":"Q","answer":"A"}], "comprehensiveFeedback": "..." },
   "discussion": { "title":"Group Discussion", "intro":"...", "comments": [{"character":"Name","text":"Strong opinion derived from source text"}], "comprehensiveFeedback": "..." },
   "integratedSkills": { "title":"Integrated Project", "scenario":"...", "task":"...", "comprehensiveFeedback": "..." },
   "softSkills": { "title":"Soft Skills Challenge", "scenario":"Workplace or social scenario requiring empathy/tact", "task":"...", "comprehensiveFeedback": "..." },
   "answerKey": "A comprehensive answer key for ALL sections."
}
`;

        case 'quiz':
            return `${baseInstruction}
--- CONTENT TYPE: Quiz / IELTS Mock Test / Exam Simulator ---
Generate an EXTREMELY exhaustive quiz or mock test that strictly assesses concepts from the raw text provided in the next message. 

\${answerDistribution}
\${feedbackInstruction}

--- GENERATION RULES ---
1. Every question must be answerable ONLY from the source text.
2. EXAM SIMULATION (CRITICAL): If the user specifies an Exam Type (e.g., IELTS, Duolingo, PTE), you MUST design the exam structure, question types, and HTML UI to perfectly mimic that specific exam.
   - Example: For IELTS Reading, you MUST create 3-4 deep reading passages and simulate all 10 task types (e.g., True/False/Not Given, Heading Matching, Summary Completion, Multiple Choice, Diagram Labelling, etc.). Do not just return 5 simple MCQs! Provide an exhaustive, rigorous, full-length test.
   - Example: For IELTS Listening, simulate the audio playback logic.
3. For EVERY activity, you MUST use the type "interactive_html". The "content" field must contain raw, self-contained HTML/JS. 
4. The interactive_html code MUST:
   - Include auto-assessment logic in JS (evaluate answers and show feedback dynamically when clicking a Submit/Check button). Ensure JS avoids global variable conflicts by scoping properly or using closures.
   - NEVER mess up external CSS. Limit your styles to classes inside your container or inline styles. Do NOT style the "body" or global tags!
   - Look highly professional and mirror the digital environment of the target exam.
   - READ ALOUD LOGIC: For any listening, dictation, or audio-driven task, provide an HTML <button> that triggers the Web Speech API on click to read the text. It MUST search the voices for the user's preferred voice or fallback to the closest match. Code example: <button onclick="const msg = new SpeechSynthesisUtterance('Test script'); msg.voice = speechSynthesis.getVoices().find(v => v.name.includes('\${learner.readAloudVoice || 'Google UK English Female'}')) || null; speechSynthesis.speak(msg);">🔊 Listen</button>
5. Do NOT use any other types like "multiple_choice" or "gap_fill" - put all of that interactive UI inside "interactive_html" content as HTML and JS. Ensure properly escaped JSON strings since your HTML/JS will be inside a JSON string.

--- REQUIRED JSON SCHEMA ---
{
  "sections": [
    {
      "title": "Section Title (e.g. Reading Section)",
      "color": "#6366f1",
      "studyTime": "30 minutes",
      "activities": [
        {
          "type": "interactive_html",
          "title": "Exam Task Title",
          "content": "<div class='exam-ui'><h2>Task</h2><p>...</p><button onclick='checkAnswers()'>Submit</button>...<script>function checkAnswers(){...}</script></div>",
          "comprehensiveFeedback": "Deep feedback on how to approach this task type."
        }
      ]
    }
  ],
  "answerKey": "A comprehensive answer key and grading rubric...",
  "lessonSummary": "Quiz covering...",
  "settings": {
    "teacherNotes": "Assessment notes...",
    "homeworkChecklist": "Review tasks...",
    "materialLinks": "URL 1\\nURL 2..."
  }
}
`;

        case 'lessonGuide':
            return `--- CONTENT TYPE: Detailed Lesson Guide ---
You are an expert master ESL/EFL curriculum architect and senior teacher trainer. Based on the lesson content you JUST generated in your previous response, you MUST create an incredibly exhaustive, voluminous, and comprehensive companion document for the teacher. This guide MUST be at least THREE (X3) TIMES LONGER, deeper, and more detailed than standard guides, providing unmatched pedagogical authority to help the teacher look exceptionally knowledgeable.

**CRITICAL INSTRUCTION FOR MULTI-SECTION COVERAGE:**
You MUST repeat this entire, robust 15-point detailed structure for ALL sections in the lesson content separately (e.g., Section 1 Detailed Guide, Section 2 Detailed Guide, Section 3 Detailed Guide, and so on). Do NOT summarize, group, omit, or abbreviate any sections! Every single section must be expanded to its maximum potential with no reduction.

For EVERY section, you MUST provide at least 10 extra explanatory words per point, explicit grammar analysis points, and custom teaching strategies.

Provide **${translationLanguage} translations** for every new word, linguistic explanation, and classroom example.

--- COMPREHENSIVE 15-POINT PEDAGOGICAL EXPANSION (REQUIRED FOR EVERY SEPARATE SECTION) ---

1. 📘 **Exhaustive Grammar Dictionary & Morphology Breakdown**:
   - For the target grammar point of this section, provide a rigorous analysis of its mechanical form, structural constraints, and deep semantic usage.
   - Include morpho-syntactic features, pronunciation rules, and 3 common learner misconceptions/frequently made errors with custom correction strategies.
   - Provide 5 highly personalized examples using ${learner.name}'s real profile context with parallel ${translationLanguage} translations.

2. 📖 **Advanced Thesaurus & Collocation Maps**:
   - Provide 5-7 synonyms and 5-7 antonyms for the section's core lexicon.
   - Classify each by register (highly formal, colloquial, professional, or academic text) with 10 extra descriptive words for each usage.
   - List 4-5 high-frequency collocations, idioms, or phrasal verbs with examples in English and translations in ${translationLanguage}.

3. ❓ **Concept Checking Questions (CCQs) & Metalinguistic Inquiries**:
   - Provide 5-6 deep CCQs with expected responses and pedagogical hints on how to probe the student's understanding if they hesitate.

4. 🔑 **Exhaustive Activity Answer Keys & Dialogue Scripts**:
   - Write down complete, line-by-line model answers and idealized dialogue scripts for all tasks, scenarios, and matching games in this section.

5. 💡 **Elite Teaching Strategies & Scaffolding Pathways**:
   - Step-by-step scaffolding pathways: how exactly to introduce, practice, and review this specific material in an online classroom. This must include 10 extra words on how to adapt for fast vs slow-paced learners.

6. 🌱 **Social-Emotional Learning (SEL) Integrations**:
   - Questions and discussion triggers connecting the language target to emotional maturity, empathy, self-awareness, or active relationship building.

7. 🔮 **Deep Background Facts & Linguistic Trivia**:
   - Deep background context, facts, history, or etymological origins of terms in this section to show ultimate teacher authority.

8. 🎮 **Gamified Zoom/Webcam Challenges**:
   - Timed, highly interactive games, warmups, or quick-fire drills suitable for webcam environments.

9. 🗺️ **Civic & Cultural Nuance Analysis**:
   - Pragmatic details, politeness scales, cultural values, or unspoken social norms reflecting the language topic.

10. 🎯 **Linguistic Edge Cases & Syntax Exceptions**:
    - Identify subtle grammatical anomalies, silent letters, spelling traps, or exceptions to the rule in this section.

11. 🎬 **Curation of Complementary Digital Artifacts**:
    - Recommendations of specific topics to search on YouTube, Spotify, or educational blogs to supplement this specific learning chunk.

12. ⏳ **10-Minute High-Impact Expansion Exercises**:
    - Ready-made speaking role-plays or creative writing prompts if the lesson finishes ahead of schedule.

13. 🗣️ **Pronunciation, Intonation, & Phonogram Drills**:
    - Accentuation, sentence-level stress, weak forms, contractions, and phonetics focus points for the oral exercises.

14. 🛠️ **Differentiated Scaffolding Options**:
    - Explicit, granular directions on adjusting the task difficulty dynamically.

15. 📊 **Rigorous Feedback Rubric & Success Milestones**:
    - Section-specific feedback criteria for writing or speaking tasks to guide precise grading.

--- HYPER-PERSONALIZATION UTILITIES ---
Incorporate ${learner.name}'s professional background, passions, and goals into every sample sentence and roleplay.

--- FORMATTING CONSTRAINTS ---
Do NOT use Markdown. Return a JSON object containing ONLY a single key "plan" mapped to your raw HTML-styled guide.
Use ONLY these tags: <h3>, <h4>, <b>, <i>, <ul>, <li>, <br>, <div>, <table>, <tr>, <td>, <th>, <span>. Ensure the output is extremely long and detailed!

--- REQUIRED JSON SCHEMA ---
{
  "plan": "<h3>🎯 Detailed Lesson Guide</h3><h4>Learner: ${learner.name}</h4><br><h3>Section 1: [Title] Detailed Guide</h3><p>[Extremely voluminous content here...]</p><br><h3>Section 2: [Title] Detailed Guide</h3><p>[Extremely voluminous content here...]</p>"
}
`;

        case 'lessonPlan':
            // A lesson plan is the tutor's RUN-SHEET: the clock, the staging, what to say and do
            // in the room. The Teacher Guide below is the reference LIBRARY for the same lesson.
            // They must never be the same prompt — a tutor choosing between two cards in Step 1
            // has to get two different documents.
            return `${baseInstruction}
--- CONTENT TYPE: Lesson Plan (tutor run-sheet) ---
You are an expert ESL/EFL lesson planner. Turn the raw text in the next message into a single, timed, ready-to-run lesson plan the tutor follows live in the session.
Provide **${translationLanguage} translations** for every new word and example.

--- THE CLOCK IS THE SPINE (NON-NEGOTIABLE) ---
Every heading must carry a time budget that adds up to a realistic 55-60 minute lesson, in this order:
*   <h3>🎯 Warm-up & Lead-in (5-7 mins)</h3> — hook the topic to ${learner.name}'s interests; 2 named questions to ask.
*   <h3>📚 Presentation (10-15 mins)</h3> — what the tutor SAYS and SHOWS for each teaching point (teacher talk script, board/annotation moves, the example sentences to use).
*   <h3>🔧 Controlled Practice (10-15 mins)</h3> — how to stage every exercise in the text, how to check answers, and the exact instruction line to give the learner.
*   <h3>🗣️ Freer Practice / Production (10-15 mins)</h3> — roleplay or task that forces the target language, with the success criteria the tutor listens for.
*   <h3>📝 Wrap-up, Feedback & Homework (5 mins)</h3> — 3 exit-check questions, error-correction notes, and what to assign.

--- WHAT A RUN-SHEET MUST CONTAIN ---
1. **Staging** — for each stage: what the tutor does, what the learner does, and how long it takes.
2. **Teacher Scripts** — verbatim lines for instructions, concept-checking questions (with expected answers) and transition phrases.
3. **Answer Key** — the correct answers, inline in the stage where they are needed (never a separate appendix).
4. **Contingency Plans** — one 'if they struggle' and one 'if it runs early' option per stage.
5. **Materials Checklist** — exactly what to open, share or play before the clock starts.

--- HYPER-PERSONALIZATION ---
Every question, example and roleplay must use ${learner.name}'s real profile (job, interests, city, goals) — for illustration, never as assessable content.

--- FORMATTING CONSTRAINTS ---
Do NOT use Markdown. Return a JSON object with a single key "plan" holding the HTML of the run-sheet.
Use ONLY these tags: <h3>, <h4>, <b>, <i>, <ul>, <li>, <br>, <div>, <table>, <tr>, <td>, <th>, <span>.

--- REQUIRED JSON SCHEMA ---
{
  "plan": "<h3>🎯 Lesson Plan: [Title]</h3><h4>Learner: ${learner.name} | Level: ${learner.cefrLevel} | Total: 60 mins</h4>..."
}
`;

        case 'forTeachers':
            // The Teacher Guide is the reference LIBRARY behind the plan: grammar depth, culture,
            // etymology, error prediction. It is NOT a run-sheet and carries no clock.
            return `${baseInstruction}
--- CONTENT TYPE: Teacher Guide (subject reference) ---
You are a senior teacher trainer and applied linguist. Based on the raw text in the next message, write the reference document the tutor reads BEFORE the lesson to understand the subject matter deeply.
Provide **${translationLanguage} translations** for every new word and explanation.

--- WHAT A TEACHER GUIDE MUST CONTAIN (no timings anywhere) ---
1.  <h3>🧠 Subject Background</h3> — the concept itself explained for the teacher, plus what a B1-level learner can and cannot understand about it.
2.  <h3>📘 Grammar & Structure Analysis</h3> — full form, meaning and use of the target grammar; the exceptions learners meet; the metalanguage a tutor may use with confidence.
3.  <h3>📖 Vocabulary Deep Dive</h3> — for every key item: part of speech, register, collocations, word family, pronunciation traps, and the L1 translation.
4.  <h3>⚠️ Anticipated Errors</h3> — the mistakes learners at ${learner.cefrLevel} typically make with this material, WHY they make them, and the correction strategy for each.
5.  <h3>🌍 Culture & Context</h3> — pragmatic and cultural notes that make the topic land in a real conversation.
6.  <h3>❓ Concept-Check Question Bank</h3> — at least 8 questions with the expected learner answers, ordered easy to hard.
7.  <h3>🔗 Further Resources</h3> — the specific things to search to go deeper (topics, series, reference sections), not bare URLs.

--- HYPER-PERSONALIZATION ---
Anchor every explanation to ${learner.name}'s real profile and goals so the tutor can teach the same subject again to a different learner and reuse the document.

--- FORMATTING CONSTRAINTS ---
Do NOT use Markdown. Return a JSON object with a single key "plan" holding the HTML of the guide.
Use ONLY these tags: <h3>, <h4>, <b>, <i>, <ul>, <li>, <br>, <div>, <table>, <tr>, <td>, <th>, <span>.

--- REQUIRED JSON SCHEMA ---
{
  "plan": "<h3>👩‍🏫 Teacher Guide: [Title]</h3><h4>Subject reference for ${learner.name} | Level: ${learner.cefrLevel}</h4>..."
}
`;

        default:
            return "Unknown type selected for Lessons/Supplementary.";
    }
};