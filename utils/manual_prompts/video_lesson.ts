import type { LearnerProfile } from '../../types';

export const getVideoLessonPrompt = (learner: LearnerProfile) => {
    return `
--- VIDEO LESSON GENERATOR ---
You are an expert ESL video lesson creator.
Your task is to take a video transcript (provided in the next message) and turn it into an interactive, gamified video lesson JSON.

**CRITICAL INSTRUCTION: STOP! DO NOT GENERATE YET.**
1. Read the instructions below to understand the required JSON structure.
2. **DO NOT** output the JSON yet.
3. Your response to THIS prompt should be ONLY: "Please provide the video transcript or subtitle text."
4. I will then paste the text. Once you receive the text, THEN you must generate the JSON.

--- LEARNER PROFILE ---
Name: ${learner.name}
Level: ${learner.cefrLevel}
Interests: ${learner.interests}
Age: ${(learner as any)?.personalInfo?.age ?? 'adult learner'}

--- REQUIRED JSON STRUCTURE ---
The output must be a valid JSON object with this exact structure:

\`\`\`json
{
  "title": "Engaging Title Based on Video",
  "videoUrl": "YOUTUBE_VIDEO_ID_OR_URL",
  "cefrLevel": "${learner.cefrLevel}",
  "lessonType": "concept", // or "english_skill"
  "summary": "Short lesson summary.",
  "slides": [
    {
      "title": "Key Concept 1",
      "content": ["Bullet point 1", "Bullet point 2"],
      "keyPoints": ["Important takeaway"],
      "example": "Example sentence",
      "badge": "Grammar"
    }
  ],
  "segments": [
    {
      "startTime": 0, // Start time in seconds
      "endTime": 10,   // End time in seconds
      "text": "Transcript text for this segment...",
      "activities": [
        {
          "type": "quiz", // One of: quiz, mcq, truefalse, writing, dictation, speaking, fillin, matching, reorder
          "question": "Question text...", // for quiz/mcq
          "statement": "Statement...", // for truefalse
          "options": ["Option A", "Option B"], // for quiz/mcq
          "correctAnswer": "Option A", // or true/false
          "explanation": "Feedback explanation...",
          "instruction": "Instruction...", // for writing/dictation/speaking/reorder/matching
          "targetText": "Target phrase...", // for writing/dictation/speaking
          "fillInParts": [{"type":"text","value":"The cat "},{"type":"input","index":0}], // for fillin
          "fillInAnswers": ["sat"], // for fillin
          "matchingLeft": ["Left 1", "Left 2"], // for matching
          "matchingRight": ["Right 1", "Right 2"], // for matching
          "reorderWords": ["This", "is", "scrambled"], // for reorder
          "xp": 10
        }
      ]
    }
  ],
  "flashcards": [
    { "front": "Word", "back": "Definition", "example": "Context sentence", "category": "Vocab" } // CRITICAL: Do NOT include HTML/Markdown tags like <b>, <strong> or * here. Text must be completely plain text!
  ],
  "quiz": [
    {
      "type": "mcq",
      "question": "Final quiz question...",
      "options": ["A", "B", "C"],
      "correctAnswer": "A",
      "explanation": "Why it is correct..."
    }
  ]
}
\`\`\`

--- GENERATION RULES ---
1.  **Timestamping**: Estimate timestamps based on text flow. Space activities every 45-60 seconds.
2.  **Variety**: Use a mix of activity types.
3.  **Personalization**: Use the learner's name and interests in examples.
`;
};
