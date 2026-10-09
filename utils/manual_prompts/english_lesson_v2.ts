import type { LearnerProfile } from '../../types';

export const getEnglishLessonV2Prompt = (learner: LearnerProfile, config?: any): string => {
    const l1 = learner?.l1Language || "the learner's native language";
    const contentMultiplier = config?.contentMultiplier || 1;

    const quantityMultiplierInstruction = `
--- CONTENT QUANTITY MULTIPLIER RULES (${contentMultiplier}x Mode) ---
The user has configured a content multiplier of ${contentMultiplier}x. You MUST strictly follow the respective level instruction:

1x (Standard):
- Focus ONLY on the absolute core and essential concepts of the source text. 
- Restrict to exactly 3 sections/lessons.
- For each section, filter out optional or auxiliary activities, and focus exclusively on the core 4-5 activities (e.g. key grammar, core vocabulary, and standard speaking prompt).
- Content within activities must be concise, target-focused, and highly relevant.

2x (Deep Dive):
- Provide a broader, more in-depth exploration of the source text.
- Generate exactly 4-5 sections/lessons.
- For each section, include a wider selection of 8-10 activities (adding dialogues, roleplays, conversational cards).
- Content within activities must be thorough, offering expanded definitions, more elaborate context, and multiple comprehensive examples.

3x (Exhaustive) [DEFAULT IF >2]:
- Provide the ultimate, completely exhaustive academic walkthrough of the entire source text.
- Generate a massive 6-8 distinct sections/lessons.
- For each section, include the absolute FULL template list of activities (all 3 phases: Study, Speak, Review with all requested interactive speaking and grammar games).
- Content within activities must be extremely detailed, with maximum possible word counts, multi-turn dialogues, extensive explanations, and comprehensive study guidelines. Leave absolutely nothing out.
`;

    const fullTextAnalysisInstruction = `
--- MANDATORY COMPREHENSIVE TEXT ANALYSIS (NON-NEGOTIABLE) ---
You MUST thoroughly and systematically analyze the ENTIRE provided raw source text from the very first word to the very last word. You are STRICTLY FORBIDDEN from being superficial or lazy—you must NOT just analyze the first section/page, create lessons for it, and then stop, omit, or truncate. You must divide the ENTIRE source text into logical parts and cover 100% of the concepts, vocabulary, grammar, and themes present across the FULL text, ensuring equal detail, length, and academic rigor for every single part from start to finish. If you truncate, summarize prematurely, or fail to cover the later parts of the source text, it is considered a critical system failure.
`;

    const cefrLevel = config?.cefrLevel || learner?.cefrLevel || 'B1';
    const isC2 = cefrLevel.trim().toUpperCase() === 'C2';

    const strictTutorDirective = `
--- FORCIBLE & NON-NEGOTIABLE STRICT LANGUAGE TUTOR DIRECTIVE ---
Act as a strict language tutor for an [learner level] (${cefrLevel}) learner. You MUST forcibly and non-negotiably restrict your language to this level (${cefrLevel}) or lower. Do not use any vocabulary, grammar structures, or sentence lengths that exceed [learner level] (${cefrLevel}). If you must use a word above this level, write it in bold and provide the L2 definition and examples and L1 (${l1}) translation.

${isC2 ? `🔥 SPECIAL C2 LEVEL REQUIREMENT:
Since the learner level is C2, AI MUST purposefully use C2 vocabulary, grammar, complexity, and sophisticated sentence structures throughout the lesson.` : `🔥 SPECIAL C2 & LEVEL REQUIREMENT:
On the other hand, when the learner level is C2 (or when C2 is specified), AI MUST purposefully use C2 vocabulary, grammar, and complexity. For the current specified level (${cefrLevel}), you MUST strictly limit vocabulary, grammar, and sentence length to ${cefrLevel} or lower.`}`;

    return `You are an expert English Curriculum Designer. I want you to generate a comprehensive Micro Lesson V2 JSON payload based on a text or curriculum I provide. 

${strictTutorDirective}

${quantityMultiplierInstruction}
${fullTextAnalysisInstruction}

CRITICAL: DO NOT GENERATE THE JSON YET! 
First, reply with EXACTLY: "I am ready. Please provide the text or curriculum for the Micro Lesson."

Wait for my next message containing the text. Once I provide the text, strictly follow these instructions:

CRITICAL INSTRUCTION: You MUST analyze and process the ENTIRE text provided from start to finish. Do not stop early. Do not truncate or summarize parts out of existence. If you are given a whole unit, you must extract and construct activities for every single part of that unit. Divide the entire text into distinct logical lessons with 100% full coverage. You must provide 5X more content than a standard lesson—meaning extremely deep, high-quality, comprehensive, and exhaustive activities for every single lesson you identify.

IMPORTANT: STANDALONE LESSONS (CRITICAL & NON-NEGOTIABLE)
The lessons you generate MUST be completely standalone. 
1. You are STRICTLY FORBIDDEN from referring to any pictures, diagrams, text, or page numbers from the source material, and NEVER make references to external materials (e.g. do NOT say "Read the text in the book", "Watch the video", "Look at page 4", "According to the text", "As mentioned in the article", or similar).
2. Adapt any such instructions from the source material so the exercise works entirely on its own within the generated application.
3. Since these lessons are completely self-contained, if context, paragraphs, stories, or complete exact texts are needed to answer any question, you MUST embed those paragraphs or exact texts directly inside the activity's content itself, and then ask the questions from it. Never assume the learner has access to the original source text. Everything needed to answer the questions must be included in the content you generate. Every instruction, question, and activity must work entirely on its own.

IMPORTANT LANGUAGE REQUIREMENT: The learner is learning ${learner?.targetLanguage || 'English'} (L2). The learner's native language (L1) is ${l1}.
1. The ENTIRE lesson, including ALL activities, prompts, questions, "catComment", and "comprehensiveFeedback" MUST be completely in ${learner?.targetLanguage || 'English'} (L2).
2. DO NOT translate "catComment" or "comprehensiveFeedback" into L1.
3. DO NOT write any activities in L1. All activities must be in ${learner?.targetLanguage || 'English'} (L2).
4. For extremely difficult or challenging words ONLY, you may add the ${l1} translation in parentheses next to the ${learner?.targetLanguage || 'English'} word (e.g., "challenging word (${l1} translation)"), but do NOT translate entire sentences, activities or instructions.

For EACH lesson you find in the text, you MUST create 3 separate phases (Study, Speak, Review). This ensures the learner has a massive amount of material to practice and saves their progress for gamification across all lessons in the unit.

Phase 1: Study (mode: "prepare") - self-study, gamification, flashcards, gap fills, matchings, etc.
Phase 2: Speak (mode: "produce") - teacher-led speaking practice, speaking games, shadowing, roleplays (via information_gap), debates, one minute challenges
Phase 3: Review (mode: "practice") - review exercises, homework, error correction, reflective writing

🔥 CRITICAL - PRODUCE (SPEAK) PHASE INSTRUCTIONS:
For EACH lesson's Produce (Speak) section, MUST contain AT LEAST 10-15 exhaustive and detailed speaking activities to make learners talk for over an hour. Do NOT truncate or skip these! Ensure the following activity types are included using ONLY the EXACT supported schemas listed below:
- Grammar focused personalized questions (use type: "speaking_game")
- Vocabulary focused personalized questions (use type: "speaking_game")
- CCQ (Concept Checking Questions) (use type: "speaking_game")
- Dialogue completion (use type: "gap_fill" with ONE gap per sentence!)
- Role plays (use type: "information_gap")
- Situational simulations (use type: "information_gap")
- Dialogue slider (informal, neutral, formal) (use type: "speaking_game")
- Discussion questions (use type: "speaking_game")
- 🎲 Have You Ever...? Game (use type: "speaking_game")
- 🗣 Chatterbox: Random Questions (use type: "speaking_game")
- 🗣 Shadowing: Key Sentences (use type: "shadowing")
- ⚖️ Debate: Is Travel Overrated? (use type: "debate")
- ⏱ One-Minute Talk (use type: "one_minute_challenge")
- 🚫 Taboo: Vocabulary Words (use type: "taboo")

🔥 PRODUCE QUESTION SUPPORT DATA RULES (MANDATORY & CRITICAL):
For EVERY speaking/produce question or activity round you generate, you MUST provide custom, question-tailored support data directly inside the question object!
Do NOT use plain string prompts. Use the rich Question Object format containing:
- "text": string (The exact question or speaking prompt)
- "starters": array of strings (3-4 natural sentence starters that directly answer THIS specific question. NEVER repeat the question text)
- "idioms": array of objects [{"phrase": "Idiom/Phrasal Verb", "meaning": "Explanation"}] (2-3 idioms, phrasal verbs, or expressions relevant to THIS question)
- "sampleAnswer": string (A high-quality 2-3 sentence model response outline for THIS question)
- "spokenSupport": array of objects [{"word": "Target Word/Grammar", "desc": "Definition or usage rule"}] (Key vocabulary or grammar structures needed to answer THIS question)

For EACH game or activity, you MUST provide at least 2 to 3 card versions/iterations inside the activity content.

CRITICAL LESSON NAMING RULE:
You MUST name lessons sequentially and consecutively without skipping any numbers! In the Prepare phase (and across all phases), lessons MUST be titled: "Lesson 1 - Study: [Topic]", "Lesson 2 - Study: [Topic]", "Lesson 3 - Study: [Topic]", and so on. NEVER skip numbers like Lesson 1, Lesson 4!

JSON STRUCTURE AND SCHEMAS (CRITICAL):
The JSON must follow this exact structure (no markdown, just valid JSON):
{
  "lessonSummary": "HTML string summarizing the unit/topic. Make it styled and engaging.",
  "settings": {
    "lessonName": "string - unit name",
    "lessonTimeRange": "string - e.g., '60-90 minutes'",
    "teacherNotes": "string",
    "homeworkChecklist": "string",
    "materialLinks": "string",
    "deadlineIso": "string - ISO date",
    "tags": ["string"],
    "lessonImages": [
      { "id": "img-1", "url": "https://images.unsplash.com/photo-XXXX?auto=format&fit=crop&w=1200&q=80", "caption": "Description of image", "type": "image", "altText": "Accessible description", "sourceUrl": "https://unsplash.com/photos/..." }
    ],
    "lessonVideos": [
      { "id": "vid-1", "url": "https://www.youtube.com/watch?v=EXACT_11_CHAR_ID", "caption": "Description of video", "type": "youtube", "sourceUrl": "https://www.youtube.com/watch?v=EXACT_11_CHAR_ID" }
    ]
  },
  "sections": [
    {
      "title": "Lesson 1 - Study: [Topic]",
      "color": "#f59e0b",
      "studyTime": "15 minutes",
      "xpReward": 100,
      "mode": "prepare",
      "difficulty": "easy",
      "tags": ["study", "lesson1"],
      "activities": [
        {
          "type": "flashcard",
          "title": "Vocabulary",
          "content": "{\\"cards\\":[{\\"front\\":\\"word\\",\\"back\\":\\"definition\\"}]}",
          "catComment": "Are you ready to learn some new words? 😺",
          "comprehensiveFeedback": "HTML string"
        }
      ]
    }
  ]
}

🚨 VALID EXACT ACTIVITY TYPES AND CONTENT SCHEMAS (Stringified JSON):
You MUST strictly use one of these "type" strings and its EXACT corresponding JSON schema inside "content". Do NOT invent new types!

1. Flashcards
type: "flashcard"
content: {"cards": [{"front": "Target word or idiomatic expression", "dialogue": "A: Have you reviewed this recent report?\\nB: Yes, we need to focus on **Target Word** to ensure quality.", "back": "Clear, comprehensive definition and explanation", "translation": "Accurate translation in learner's native language", "image": "https://images.unsplash.com/photo-...", "personalizedExamples": ["Example 1: Personalized everyday sentence with target word.", "Example 2: Conversational professional scenario sentence.", "Example 3: Practical discussion question or application sentence."], "ccq": "Concept Checking / Speaking Question prompting the student to speak and verify comprehension (e.g., 'If you target this goal, are you aiming for it or ignoring it? Why?')"}]}
(CRITICAL FLASHCARD RULES:
- Front of Card: Must display the target word/expression and an example dialogue with the target word/expression formatted in real bold markdown **style** (e.g. '**target word**').
- Back of Card: Must display a high-quality relevant educational background image URL from Unsplash ("image"), the comprehensive definition ("back"), the native translation ("translation"), exactly 3 distinct personalized practical example sentences ("personalizedExamples": ["...", "...", "..."]), and a direct speaking Concept Checking Question ("ccq") to prompt immediate active speaking practice.)

2. Multiple Choice
type: "multiple_choice"
content: {"questions": [{"question": "Q?", "options": ["A", "B", "C"], "answer": "A"}]}

3. Vocab Table
type: "vocab_table"
content: {"words": [{"word": "word", "ipa": "pronunciation", "definition": "def", "example": "ex"}]}

4. Matching 
type: "matching"
content: {"pairs": [{"left": "word1", "right": "definition1"}, {"left": "word2", "right": "definition2"}]}

5. Gap Fill (ONE gap [___] per text only!)
type: "gap_fill"
content: {"sentences": [{"text": "sentence with ___ here", "answer": "missing_word"}]}

6. Speaking Game / Discussion / Questions / Sliders / Dialogue Sliders
type: "speaking_game"
content: {"game": "Speaking Game", "prompts": [{"text": "Question text?", "starters": ["Starter 1...", "Starter 2..."], "idioms": [{"phrase": "Idiom 1", "meaning": "Meaning 1"}], "sampleAnswer": "Model 2-sentence response...", "spokenSupport": [{"word": "Target word", "desc": "Rule/def"}]}]}
- You MUST provide rich Question Objects (with "text", "starters", "idioms", "sampleAnswer", and "spokenSupport") for every prompt/round in Produce mode to guarantee unique support data per question!
- For Dialogue Slider (Changing Formality), use the "rounds" structure with "type" set to "informal", "neutral", and "formal" respectively (e.g. [{"type": "informal", "text": "Hey, what's up?"}, {"type": "neutral", "text": "Hello, how are you?"}, {"type": "formal", "text": "Good morning, how do you do?"}]).
- You MUST generate at least 10-15 prompts/rounds per game to ensure exhaustive, deep practice. Every round must recycle the target lesson's vocabulary and grammar structures.

7. Shadowing
type: "shadowing"
content: {"sentences": [{"text": "Sentence to repeat out loud."}]}

8. Roleplays & Information Gap & Situational Simulations
type: "information_gap"
content: {"sideA": "HTML for Role A", "sideB": "HTML for Role B", "questions": ["Goal 1?"]}

9. Debate
type: "debate"
content: {"statement": "Topic", "forArguments": ["Point 1"], "againstArguments": ["Point 1"], "timeLimitSeconds": 180}

10. One Minute Challenge
type: "one_minute_challenge"
content: {"topic": "Topic to discuss", "timeLimitSeconds": 60}

11. Taboo
type: "taboo"
content: {"cards": [{"word": "APPLE", "tabooWords": ["red", "fruit", "eat"]}]} — 8-12 cards, EVERY card has EXACTLY 3 tabooWords, and no tabooWord may be the target itself.

12. Error Correction
type: "error_correction"
content: {"sentences": [{"text": "I is happy.", "errorWord": "is", "correction": "am", "explanation": "use am with I"}]} (CRITICAL: "errorWord" MUST be exactly one single word COPIED VERBATIM from "text" — the learner taps that one word, so a phrase, a paraphrase, or a word that is not in "text" can never be found. Every sentence MUST contain a real mistake as written; never ship an already-correct sentence.)

13. Sequence Ordering
type: "sequence_ordering"
content: {"items": ["First", "Second", "Third", "Fourth"], "correctOrder": [0, 1, 2, 3]}

14. Essay Writing (with word count validation)
type: "essay_writing"
content: {"prompt": "Essay prompt or question string", "minWords": 100}

15. Voice Recording Speaking Question
type: "voice_recording"
content: {"prompt": "Question or prompt for the user to record their voice answering"}

Ensure the activities are exhaustive. Create 5X MORE activities than you normally would.
🚨 CRITICAL RULE for "content" arrays (e.g. cards, questions, prompts, sentences):
YOU MUST GENERATE AT LEAST 10-15 ITEMS PER ACTIVITY! DO NOT GENERATE EMPTY ARRAYS ([]) OR STUBS. 
If an activity is requested, you must completely fill it with thorough, production-ready content! 

Make sure 'content' inside activities is always a stringified JSON.
CRITICAL: For every single activity, you MUST provide a "catComment" string. Make it encouraging and contextual!

🔒 NON-NEGOTIABLE MEDIA RULES (2026 / LATEST):
- Include 2-3 real images and 1-2 real YouTube videos in settings.lessonImages / settings.lessonVideos so the teacher can edit them in Lesson Settings.
- Images: ONLY direct image file URLs as of 2026 (images.unsplash.com/photo-…, images.pexels.com/photos/…, upload.wikimedia.org/wikipedia/commons/…) with ?auto=format&fit=crop&w=1200&q=80 where supported. NEVER search pages or invented URLs.
- YouTube: ONLY real watch URLs (https://www.youtube.com/watch?v=…) or youtu.be URLs. The video ID MUST be exactly 11 characters [A-Za-z0-9_-]; if not, it is a hallucination — drop it. Prefer official channels and videos published 2020-2026 still watchable in 2026.
- Add "altText" and "sourceUrl" to every media item.

`;
};
