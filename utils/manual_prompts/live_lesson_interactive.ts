import type { LearnerProfile } from '../../types';

/**
 * The exact h5pActivity shape each activity type renders. The lesson engine reads
 * these keys directly, so a step that only carries { "type": "fill-in-blanks" }
 * renders an empty activity — the #1 reason an AI-generated manual looked broken.
 * Keep this in sync with utils/liveLessonHtmlScript.ts (missingFields()).
 */
export const LIVE_LESSON_ACTIVITY_FIELDS: Record<string, string> = {
  'would-you-rather': '{ "rounds": [ { "id": "r1", "question": "...", "optionA": { "id": "a", "text": "...", "emoji": "🅰️" }, "optionB": { "id": "b", "text": "...", "emoji": "🅱️" }, "speakingPrompts": ["..."], "feedback": { "correctFeedback": "...", "incorrectFeedback": "..." } } ] }',
  'accordion': '{ "panels": [ { "id": "p1", "title": "...", "content": "..." } ] }',
  'true-false': '{ "statement": "...", "correct": true, "trueFeedback": "...", "falseFeedback": "..." }',
  'mark-the-words': '{ "text": "A paragraph that contains the target words.", "correctWords": ["word1", "word2"] }  // correctWords must be the exact words that appear in text',
  'fill-in-blanks': '{ "textWithBlanks": "I [blank0] never [blank1] sushi.", "blanks": [ { "id": "blank0", "correct": ["have"], "hint": "auxiliary" }, { "id": "blank1", "correct": ["eaten", "tried"], "hint": "past participle" } ] }  // blanks[].id must match the [blank0] markers in textWithBlanks',
  'memory-game': '{ "pairs": [ { "id": "m1", "cardA": "🦈", "cardB": "shark" } ] }  // 8 pairs',
  'image-hotspots': '{ "imageUrl": "https://images.unsplash.com/...", "imageAlt": "...", "showSpeakingQuestion": "Have you ever ...?", "hotspots": [ { "id": "h1", "x": 25, "y": 40, "label": "...", "content": "...", "icon": "📍" } ] }  // x/y are percentages',
  'spot-the-difference': '{ "imageA": "https://images.unsplash.com/...", "imageB": "https://images.unsplash.com/...", "timeLimit": 120, "differences": [ { "id": "d1", "x": 30, "y": 55, "radius": 8, "description": "The bag has changed colour" } ] }',
  'truth-or-dare': '{ "items": [ { "type": "truth", "text": "...?", "targetLanguage": "I have (never)..." } ] }  // alternate "truth" and "dare"',
  'drag-the-words': '{ "textWithPlaceholders": "I [drag] never [drag] sushi before.", "words": [ { "id": "w1", "word": "have", "correctPosition": 1 } ] }  // correctPosition is 1-based, in text order',
  'flashcards': '{ "shuffle": true, "ttsEnabled": true, "cards": [ { "id": "fc1", "front": "go", "back": "gone\\n\'Have you ever gone skydiving?\'", "category": "irregular verbs" } ] }  // 10 cards; back = meaning on line 1, model sentence on line 2',
  'word-cloud': '{ "prompt": "What words do you associate with ...?", "seedWords": ["word1", "word2"], "maxSubmissions": 5 }',
  'audio-discussion': '{ "instructions": "...", "prompts": [ { "id": "ap1", "text": "...", "hint": "...", "usefulLanguage": ["I have never visited..."] } ], "sampleOpinions": [ { "speaker": "Mina, B1", "text": "..." } ] }  // 3 prompts + 2 model answers',
  'team-quiz': '{ "instructions": "...", "secondsPerQuestion": 20, "questions": [ { "id": "q1", "question": "...", "points": 10, "choices": [ { "id": "c1", "text": "...", "correct": true }, { "id": "c2", "text": "...", "correct": false } ] } ] }  // 5 questions, exactly one correct choice each',
  'multiple-choice': '{ "question": "...", "allowMultiple": false, "choices": [ { "id": "c1", "text": "...", "correct": true } ] }',
};

/** The per-type field reference, limited to the activity types in this lesson. */
export function activityFieldReference(activities: string[]): string {
  return activities
    .map((a) => `- "${a}" → ${LIVE_LESSON_ACTIVITY_FIELDS[a] || 'standard H5P keys for this type'}`)
    .join('\n');
}

/**
 * AI prompt that produces a Live Lesson manual (LiveLessonManual schema) for the
 * Manual JSON Creator's "Live Lesson" (interactive) content type. The output JSON is
 * normalized by normalizeLiveLesson() and rendered by the standalone HTML generator
 * and the React presenter.
 */
export const getLiveLessonInteractivePrompt = (learner: LearnerProfile, settings: any = {}) => {
  const level = learner.cefrLevel || 'B1';
  const name = learner.name || 'Student';
  const interests = learner.interests || 'travel, music, technology';
  const duration = settings.duration || 60;
  const topic = settings.details || settings.topic || '[Specify topic]';
  // An empty selection means "let the AI choose": fall back to the full activity set
  // (an empty array used to blank out the allowed-types list, so the AI invented
  // types the engine cannot render).
  const chosen: string[] = Array.isArray(settings.activities) ? settings.activities.filter(Boolean) : [];
  const activities = chosen.length ? chosen : [
    'would-you-rather', 'accordion', 'true-false', 'mark-the-words', 'fill-in-blanks',
    'memory-game', 'image-hotspots', 'spot-the-difference', 'truth-or-dare',
    'drag-the-words', 'flashcards', 'audio-discussion', 'team-quiz', 'word-cloud',
  ];

  return `You are an expert ESL/EFL lesson designer. Create a COMPLETE, DETAILED "Live Lesson" in JSON (LiveLessonManual schema) that runs as an interactive, gamified lesson.

## LEARNER PROFILE
- Name: ${name}
- Level: ${level} (CEFR)
- Interests: ${interests}
- Duration: ${duration} minutes

## TOPIC
${topic}

## CRITICAL RULES — READ CAREFULLY
1. NEVER write teacher instructions — ALWAYS talk directly to the learner ("${name}, let's…")
2. ALL language MUST be simplified to CEFR ${level} — use ONLY vocabulary and grammar appropriate for ${level}
3. NEVER use markdown ** or __ in any text — the UI renders it; just write plain text
4. Personalize everything using learner name "${name}" and interests: ${interests}
5. Every activity MUST have 3-5 items/rounds/cards, NOT just 1
6. Every activity MUST recycle language from the lesson content (reading, vocabulary, grammar)
7. EVERY h5pActivity MUST CONTAIN THE FULL CONTENT FOR ITS TYPE — not just "type". The required fields for each type are listed under REQUIRED FIELDS PER ACTIVITY TYPE below; omitting them makes the step render empty and the lesson is rejected. Never invent different key names.

## MANDATORY LESSON STRUCTURE (in this exact order)
### BLOCK 1 — WARM-UP (would-you-rather)
- 4 rounds with optionA/optionB (each with id, text, emoji) + speakingPrompts[] (3 each)
### BLOCK 2 — MINI LESSON (accordion)
- 5 panels: Reading Text, Form, Vocabulary List (8-10 words), Key Expressions, Spoken Grammar
- Grammar/vocabulary items include a "color" hex
### BLOCK 3 — CHECK (true-false)
- 5 statements about the reading, each with trueFeedback/falseFeedback
### BLOCK 4 — VOCABULARY (mark-the-words)
- A paragraph using the target vocabulary; correctWords[] lists them
### BLOCK 5 — PRACTICE (fill-in-blanks)
- textWithBlanks uses [blank0], [blank1]... markers; blanks[] with correct[] + hint
### BLOCK 6 — SPEAKING GAME (memory-game)
- 8 pairs: cardA = emoji/word, cardB = meaning/definition
### BLOCK 7 — EXPLORE (image-hotspots)
- imageUrl (stock image), 5 hotspots with x/y/label/content/icon
### BLOCK 8 — GAME (spot-the-difference)
- imageA/imageB + differences[] with x/y/radius/description
### BLOCK 9 — SPEAKING (truth-or-dare)
- 8 items alternating truth/dare, each with targetLanguage
### BLOCK 10 — REVIEW (drag-the-words)
- textWithPlaceholders uses [drag] markers; words[] with correctPosition
### BLOCK 11 — REVIEW (flashcards)
- 10 cards front/back + category
### BLOCK 12 — SPEAKING (audio-discussion)
- instructions + 3 prompts: each { id, text, hint, usefulLanguage[] } + sampleOpinions[] (2 learner-model answers)
### BLOCK 13 — TEAM GAME (team-quiz)
- instructions + secondsPerQuestion (20) + 5 questions: each { id, question, points: 10, choices: [{id,text,correct}] }
### BLOCK 14 — REFLECTION (word-cloud)
- prompt + seedWords[] + maxSubmissions

## EACH STEP MUST INCLUDE
- "languageReference": { "grammar": [{"rule","example","color"}], "vocabulary": [{"word","definition","example","color"}], "sentenceStarters": [{"starter","purpose"}] }
- "ccqQuestions": [{"question","answer","purpose"}] (2-3 per step)
- "speakingQuestions": [{"question","level":"controlled|guided|free","followUp","targetLanguage"}] (2-3 per step)
- "h5pActivity": { "type": "<one of the allowed types>", ... }
- "gamification": { "points": 10-30, "retryAllowed": true, "maxRetries": 2 }
- "feedback": { "correctFeedback", "incorrectFeedback", "languageNote", "encouragement" } for the narrating cat to read aloud

## JSON SCHEMA
{
  "metadata": { "lessonId", "title", "description", "durationMinutes", "learningObjectives": [...], "targetLanguage": "en-US", "defaultLocale": "en", "phase": "speak", "level": "${level}", "topic" },
  "learnerProfile": { "name": "${name}", "level": "${level}", "interests": [...] },
  "globalSettings": { "timerBehaviour": "pause_allowed", "gamification": { "points": 100, "retryAllowed": true, "maxRetries": 3, "badgeConditions": [] }, "confettiOnCorrect": true },
  "procedureBlocks": [
    { "id": "step-001", "title": "...", "type": "<activity type>", "phase": "study|speak|review", "durationSeconds": 300, "teacherPrompt": "...", "studentInstructions": "${name}, ...", "languageReference": {...}, "ccqQuestions": [...], "speakingQuestions": [...], "h5pActivity": { "type": "<activity type>", "<copy the required fields for that type from the list below>" : "..." }, "gamification": {...} }
  ]
}

## REQUIRED FIELDS PER ACTIVITY TYPE — every listed field is MANDATORY
The value of "h5pActivity" is NOT just a type. Each activity needs the keys below, using these exact names:
${activityFieldReference(activities)}

## ALLOWED ACTIVITY TYPES (use these ONLY, in this order)
${activities.map((a: string) => `- ${a}`).join('\n')}

Return ONLY raw JSON — no markdown fences, no preamble.`;
};