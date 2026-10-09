/**
 * Gamified Challenge — AI prompt for the Manual JSON Creator.
 * Instructs the model to emit a full GamifiedThemeData JSON (the same schema
 * the standalone HTML generator and React presenter consume).
 */
export const GAMIFIED_CHALLENGE_PROMPT = `You are an expert ESL lesson designer. Create a COMPLETE gamified weekly challenge ("Gamified Challenge") in strict JSON. The output will be rendered as an interactive horror-themed game (hub with a days grid + a day view with tabs), so fill EVERY field below — no empty arrays, no placeholders.

Return ONLY valid JSON with this exact shape:

{
  "id": "unique-theme-id",
  "name": "🏆 A catchy theme name",
  "description": "One-line hook for the theme",
  "icon": "emoji",
  "welcomeTitle": "🪚 Welcome to the Game",
  "welcomeSubtitle": "Dramatic two-sentence intro",
  "colorPrimary": "#8b0000",
  "colorSecondary": "#1a0000",
  "backgroundImages": ["https://picsum.photos/seed/a/1920/1080", "https://picsum.photos/seed/b/1920/1080"],
  "soundTheme": "horror",
  "narratorVoicePreference": "Microsoft",
  "masterCode": "FREEDOM",
  "startDate": "2026-09-07",
  "days": [
    {
      "dayNumber": 0,
      "title": "Day title",
      "subtitle": "Short subtitle",
      "skill": "vocabulary",
      "narratorIntro": "Atmospheric spoken intro for the narrator",
      "narratorOutro": "Spoken outro",
      "backgroundImage": "https://picsum.photos/seed/day0/1920/1080",
      "artifactEmoji": "⛓️",
      "artifactName": "Artifact name",
      "unlockCode": "FREEDOM",
      "codeHint": "Hint for the unlock code",
      "lesson": {
        "title": "Lesson title",
        "content": "Short lesson intro paragraph",
        "sections": [
          { "title": "Section title", "type": "text", "content": "Paragraph with \\n line breaks" },
          { "title": "Grammar Trap", "type": "exercise", "content": "Exercise description" },
          { "title": "⚠️ WARNING", "type": "warning", "content": "A warning about the fear meter" },
          { "title": "Dialogue: The Guard", "type": "dialogue", "content": "Guard: \\"line\\"\\nYou: \\"reply\\"\\n..." }
        ]
      },
      "vocabulary": [
        { "word": "escape", "translation": "", "definition": "To break free", "example": "He planned to escape.", "partOfSpeech": "verb" }
      ],
      "grammar": [
        {
          "rule": "Subject-Verb Agreement",
          "explanation": "The verb must agree with the subject.",
          "examples": ["He runs (not he run)"],
          "exercises": [
            { "instruction": "Choose the correct form", "sentence": "The prisoner ___ to escape.", "answer": "wants", "options": ["want", "wants", "wanting"] }
          ]
        }
      ],
      "reading": {
        "text": "A long passage with embedded grammar/typo ERRORS to be clicked and fixed.",
        "glitchWords": [
          { "text": "hanged", "isGlitch": true, "correction": "hung" },
          { "text": "writed", "isGlitch": true, "correction": "written" }
        ],
        "comprehensionQuestions": [
          { "question": "Q?", "options": ["A", "B", "C", "D"], "correct": 1, "explanation": "Why.", "codeFragment": "F" }
        ]
      },
      "listening": [
        { "text": "A sentence read aloud.", "hiddenWord": "escape", "hint": "To break free (6 letters)" }
      ],
      "dialogue": {
        "scenario": "Scenario description",
        "characters": ["Jigsaw", "You"],
        "turns": [
          {
            "narrator": "Narrator line",
            "character": "Jigsaw",
            "question": "The spoken question with options",
            "options": [
              { "text": "Option text", "outcome": "survive", "response": "Consequence response", "points": 20 },
              { "text": "Option text", "outcome": "neutral", "response": "Consequence response", "points": 5 },
              { "text": "Option text", "outcome": "die", "response": "Consequence response", "points": 0 }
            ]
          }
        ]
      },
      "speaking": [
        { "text": "Sentence to speak aloud", "targetAccuracy": 70, "clueOnSuccess": "Clue earned", "mode": "normal" }
      ],
      "writing": [
        { "prompt": "Writing task (30+ words)", "minWords": 30, "keywords": ["escape", "courage"], "sampleAnswer": "Model answer" }
      ],
      "dictation": [
        { "text": "Dictation sentence", "speed": "slow" }
      ],
      "quiz": [
        { "question": "Q?", "options": ["A", "B", "C", "D"], "correct": 1, "explanation": "Why.", "codeFragment": "ED" }
      ],
      "bossBattle": [
        { "question": "Q?", "options": ["A", "B", "C", "D"], "correct": 1, "timeLimit": 8 }
      ],
      "dragDropClues": [
        { "clue": "Day 0: FREEDOM", "match": "Vocabulary - Breaking free" }
      ],
      "fearMeterImpact": 10,
      "timeLimit": 1800,
      "pointsAvailable": 200
    }
  ]
}

RULES:
- Include 5–7 days total. Day 0 MUST have all of: lesson, vocabulary, grammar, reading, listening, dialogue, speaking, writing, dictation, quiz.
- Give the LAST day a "bossBattle" array (3–6 timed questions). Give another day a "dragDropClues" array (5–6 clue/match pairs).
- unlockCode values must be single uppercase words (FREEDOM, WHISPER, CHAPTER, SILENCE, WRITTEN, COMBINE, VICTORY...). codeHint hints at them.
- The reading "glitchWords" must each appear in "text" exactly as written (lowercase comparison is used), with isGlitch true and a correct "correction".
- quiz comprehensionQuestions and quiz entries use 0-based "correct" indexes.
- Keep the horror/game-show tone consistent with the "SAW: Escape Room" sample (mock data). Choose a DIFFERENT theme name and setting than the sample.
- Do not use markdown fences — output raw JSON only.`;

export const getGamifiedChallengePrompt = (learner?: { name?: string }, _config?: unknown): string =>
  GAMIFIED_CHALLENGE_PROMPT;