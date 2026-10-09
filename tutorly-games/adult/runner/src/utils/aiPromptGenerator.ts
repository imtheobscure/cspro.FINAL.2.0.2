import { CEFRLevel, AudienceMode, Question } from '../types/game';

export function generateAIPrompt(level: CEFRLevel = 'B1', mode: AudienceMode = 'adult', questionCount: number = 10): string {
  return `You are an elite Educational Curriculum and Game Content Designer for "Runner: English Arena".
Your task is to create custom game questions based STRICTLY on the user's lesson content or PDF.

[CRITICAL INSTRUCTION - NON-NEGOTIABLE WORKFLOW]:
Step 1: In your very first reply, DO NOT generate any questions yet. You must non-negotiably ask the user:
"Please upload or paste your PDF text, lesson transcript, or vocabulary/grammar curriculum. Also confirm if you'd like target CEFR Level ${level} (${mode} mode) or another level."

Step 2: Once the user provides the lesson material, analyze the text and create EXACTLY ${questionCount} game questions calibrated strictly at or slightly below CEFR Level ${level} for ${mode} learners.

[SELF-CONTAINED CONTENT RULE]:
If the lesson text refers to external pictures, diagrams, or videos, you MUST adapt the questions to be 100% SELF-CONTAINED within the text prompt itself (e.g., describe the scenario or quote the context directly). No questions should require looking at an external file.

[PUNCTUATION RULE FOR SPELLING & UNSCRAMBLE]:
- For 'unscramble' questions: Provide scrambled words array WITHOUT any punctuation (no periods, commas, question marks). All words must be lowercase or normal casing, so punctuation never causes answer verification errors.
- For 'spelling' questions: The correctWord must be purely letters (a-z), strictly no punctuation.

[QUESTION TYPES TO INCLUDE IN JSON]:
Distribute the questions across these types:
1. "multiple_choice": 4 options, 1 correctIndex (0-3).
2. "multi_select": 4 options, multiple correctIndices array (e.g. [0, 2]).
3. "true_false": statement string, isTrue boolean.
4. "listening": audioScript (text to be spoken aloud by Azure/WebSpeech), prompt, options, correctIndex.
5. "reading": readingPassage (short paragraph), question, options, correctIndex.
6. "spelling": clue, correctWord (no punctuation), missingLettersTemplate.
7. "unscramble": prompt, scrambledWords array (no punctuation!), correctSentence.
8. "sorting": categoryA, categoryB, items: [{ text, category: "A" | "B" }] (6 items).

[ANSWER-LENGTH ANTI-CUE RULE - MANDATORY FOR EVERY OPTION SET]:
Players guess the longest option instead of reading, so never let word count give the answer away:
- All options in one question must be within ±2 words of each other and carry the same level of detail (count words, not characters).
- THE LONGEST OPTION MUST NEVER BE THE CORRECT ONE. If the correct option is the longest, shorten it or lengthen the distractors until a distractor is longer.
- The correct option must not be the only option with a number, a name, a comma or extra qualifying detail, and must not echo keywords from the prompt more than the distractors do.
- All distractors must be equally plausible and from the same topic/word family; rotate the correct index across questions so it is never the same index twice in a row (this applies to "multiple_choice", "multi_select", "listening" and "reading").
- SILENTLY SELF-CHECK EVERY QUESTION BEFORE RETURNING and rewrite any question whose longest option is the correct one.

[POWER-UP REWARD ALLOCATION BY DIFFICULTY]:
Assign one of the following rewards to 'powerUpReward' based on question difficulty:
- A1/A2 (Easy): 'squad_boost_small', 'dual_smg', 'shotgun_spread'
- B1 (Medium): 'gatling_overload', 'rescue_medic_ally', 'energy_shield'
- B2/C1 (Hard/Heroic): 'plasma_laser', 'rescue_sniper_ally', 'rocket_barrage', 'nuke_airstrike', 'squad_boost_large', 'ice_blizzard'

[STRICT JSON FORMAT]:
Output ONLY raw, valid JSON enclosed in \`\`\`json ... \`\`\` code blocks adhering to this schema:
[
  {
    "id": "q1",
    "type": "multiple_choice",
    "cefr": "${level}",
    "audience": "${mode}",
    "prompt": "Question text here",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctIndex": 0,
    "difficultySeconds": 20,
    "powerUpReward": "gatling_overload",
    "explanation": "Brief educational feedback"
  }
]

Now, respond ONLY with your initial polite request asking the user to provide their lesson PDF/text.`;
}

export function downloadJSONFile(data: unknown, filename: string = 'lesson_questions.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function sanitizeUnscrambleSentence(sentence: string): string[] {
  // Strip punctuation, keep alphanumeric words
  return sentence
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function validateQuestionJSON(data: unknown): Question[] {
  if (!Array.isArray(data)) {
    throw new Error('JSON root must be an array of question objects.');
  }

  return data.map((item, idx) => {
    if (!item.type || !item.prompt) {
      throw new Error(`Question at index ${idx} is missing required fields "type" or "prompt".`);
    }

    // Auto-sanitize unscramble words if present
    if (item.type === 'unscramble') {
      if (!item.scrambledWords && item.correctSentence) {
        const words = sanitizeUnscrambleSentence(item.correctSentence);
        item.scrambledWords = [...words].sort(() => Math.random() - 0.5);
      } else if (Array.isArray(item.scrambledWords)) {
        item.scrambledWords = item.scrambledWords.map((w: string) => 
          w.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim()
        );
      }
      if (item.correctSentence) {
        item.correctSentence = item.correctSentence
          .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
          .trim()
          .toLowerCase();
      }
    }

    if (item.type === 'spelling' && item.correctWord) {
      item.correctWord = item.correctWord.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    }

    // Default fallbacks
    if (!item.difficultySeconds) item.difficultySeconds = 20;
    if (!item.powerUpReward) item.powerUpReward = 'gatling_overload';
    if (!item.id) item.id = `custom_${idx + 1}`;

    return item as Question;
  });
}
