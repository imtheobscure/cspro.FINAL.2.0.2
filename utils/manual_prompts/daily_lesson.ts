/**
 * Daily Lesson — AI prompt for the Manual JSON Creator.
 * Instructs the model to emit a full DailyLessonData JSON (the same schema
 * the standalone HTML generator and React presenter consume).
 */
export const DAILY_LESSON_PROMPT = `You are an expert ESL lesson designer. Create a COMPLETE daily English lesson ("Daily Lesson") in strict JSON. The output is rendered as an interactive 10-step lesson with a talking cat mascot, plus three bonus modules (Conversation Game, Guess the Place, Leaderboard), so fill EVERY field below — no empty arrays, no placeholders.

Return ONLY valid JSON with this exact shape:

{
  "topic": "Lesson topic title",
  "level": "B1",
  "theme": "Theme / category",
  "warmup": [
    { "question": "Discussion question", "answer": "Detailed model answer (2-3 sentences)", "emoji": "📱" }
  ],
  "keywords": [
    { "term": "Key word or phrase", "definition": "Clear definition", "example": "Example sentence", "level": "B1" }
  ],
  "dialogue": {
    "title": "Dialogue title",
    "speakers": ["Maya", "James"],
    "lines": [
      { "speaker": "Maya", "text": "Spoken line", "emotion": "curious" }
    ]
  },
  "reading": {
    "basic": { "title": "Title", "content": "<h3>Heading</h3><p>Paragraph with <b>bold keywords</b>.</p>" },
    "intermediate": { "title": "Title", "content": "<h3>Heading</h3><p>Paragraph with <b>bold keywords</b>.</p>" },
    "advanced": { "title": "Title", "content": "<h3>Heading</h3><p>Paragraph with <b>bold keywords</b>.</p>" }
  },
  "grammarSlides": [
    { "level": "A2/B1", "structure": "Grammar structure name", "example": "Example sentence", "meaning": "Meaning & use explanation", "mistake": "Common mistake description", "alternatives": ["Alternative 1", "Alternative 2"] }
  ],
  "radioDrama": {
    "title": "Drama title",
    "setting": "Setting description",
    "cast": ["Narrator", "Character 1", "Character 2"],
    "ambientSound": "kitchen",
    "lines": [
      { "character": "Narrator", "text": "Narration line", "emotion": "neutral" },
      { "character": "Character 1", "text": "Spoken line", "emotion": "sincere" }
    ],
    "comprehensionQuestions": [
      { "question": "Q?", "options": ["A", "B", "C", "D"], "correct": 1, "explanation": "Why." }
    ]
  },
  "dictation": { "sentences": ["Sentence one.", "Sentence two."] },
  "discussion": {
    "topic": "Discussion topic",
    "post": "A social-media style post with an opinion (as if posted by @TechWatcher)",
    "comments": [
      { "character": "Commenter name", "avatar": "emoji", "text": "Comment text", "isCorrect": false, "feedback": "Analysis of why this comment is/ isn't insightful (2-3 sentences)" },
      { "character": "Commenter name", "avatar": "emoji", "text": "Comment text", "isCorrect": true, "feedback": "Analysis praising the nuanced critical thinking" }
    ]
  },
  "quiz": [
    { "question": "Q?", "options": ["A", "B", "C", "D"], "correct": 1, "explanation": "Why." }
  ],
  "secretCode": "A-SECRET-CODE-WITH-DASHES",
  "conversationGame": {
    "title": "Game title",
    "description": "Scenario description",
    "characters": [
      { "name": "Character 1", "role": "Role", "avatar": "emoji", "personality": "Personality" }
    ],
    "nodes": {
      "start": {
        "id": "start",
        "speaker": "Character 1",
        "text": "Opening question",
        "emotion": "cheerful",
        "choices": [
          { "text": "Response A", "next": "node_id", "catNote": "Cat's quick note on this choice" },
          { "text": "Response B", "next": "node_id", "catNote": "Cat's quick note on this choice" }
        ]
      },
      "win_node": {
        "id": "win_node",
        "speaker": "Character 1",
        "text": "Congratulation message",
        "emotion": "cheerful",
        "choices": [],
        "isEnd": true,
        "isWin": true,
        "endMessage": "What the learner learned by winning"
      }
    },
    "keywords": { "term": "definition" },
    "discussionQuestions": ["Question 1", "Question 2"]
  },
  "guessThePlace": {
    "name": "City, Country",
    "coordinates": { "lat": 35.01, "lng": 135.77 },
    "clue": "A long atmospheric description (3-5 paragraphs) with rich vocabulary but NO mention of the place name",
    "tooltipWords": { "word": "Simple definition" },
    "hints": ["Hint 1 (progressively easier)", "Hint 2", "Hint 3"],
    "images": [
      { "label": "Image label", "emoji": "🛩️", "description": "Description" }
    ],
    "funFacts": ["Fact 1", "Fact 2", "Fact 3"],
    "cultureNotes": ["Note 1"],
    "thingsToAvoid": ["Avoid 1"],
    "country": "Country",
    "language": "Language",
    "languageCode": "xx",
    "survivalPhrases": [
      { "phrase": "Hello", "pronunciation": "Pronunciation", "translation": "Translation", "context": "When to use" }
    ],
    "audioTour": {
      "lines": [
        { "speaker": "Tourist Guide", "text": "Guide line" },
        { "speaker": "Tourist", "text": "Tourist reply" }
      ]
    }
  },
  "catFeedback": {
    "correct": ["Encouraging line 1", "Encouraging line 2"],
    "incorrect": ["Supportive line 1", "Supportive line 2"],
    "idle": ["Fun fact or tip 1", "Fun fact or tip 2"],
    "lessonIntro": "The cat's welcome message for this lesson",
    "moduleIntro": {
      "lesson": "Cat's intro for the main lesson module",
      "conversation": "Cat's intro for the conversation game",
      "place": "Cat's intro for the place game"
    }
  }
}

RULES:
- Include 3–5 warmup questions, 10–22 keywords, 8–15 dialogue lines, 5–8 grammar slides across the three CEFR levels (A2/B1, B1/B2, B2/C1), 4–10 radio drama lines with a "Narrator" character, 4–6 dictation sentences, 4 discussion comments (exactly ONE with "isCorrect": true), and 8–10 quiz questions.
- The reading content is HTML: use <h3> headings, <p> paragraphs, and <b> around key vocabulary.
- The radio drama cast must start with "Narrator" and each cast member must appear in "lines" with that exact "character" name.
- "correct" indexes are 0-based.
- The conversation game needs 6–10 nodes forming a branching tree with at least one win path (isEnd + isWin true) and several lose paths (isEnd true, isWin false).
- Choose a DIFFERENT topic than the "Digital Age / Technology" sample (mock data) — pick a fresh theme each time.
- Do not use markdown fences — output raw JSON only.`;

export const getDailyLessonPrompt = (learner?: { name?: string }, _config?: unknown): string =>
  DAILY_LESSON_PROMPT;