/**
 * copy-ai-prompt.ts
 * -----------------------------------------------------------------------------
 * Avatar Lesson Engine V2 Prompt — Interactive Avatar Lesson with Self-Introductions
 *
 * Instructs external AIs (Gemini, Claude, ChatGPT, etc.) to generate valid,
 * schema-compliant JSON for the Avatar Lesson V2 Engine.
 * -----------------------------------------------------------------------------
 */

export interface CopyPromptOptionsV2 {
  audience?: string;
  difficulty?: string;
  tone?: string;
  preferredRegions?: string[];
  preferredVoices?: string[];
  preferredThemes?: string[];
  lessonCountHint?: number;
  minInitialChoices?: number;
  minTotalBranches?: number;
  minEndings?: number;
  domainConstraints?: string;
}

export const buildCopyPromptV2 = (options: CopyPromptOptionsV2 = {}): string => {
  const minInitialChoices = options.minInitialChoices ?? 3;
  const minTotalBranches = options.minTotalBranches ?? 10;
  const minEndings = options.minEndings ?? 2;

  const optionBlock = [
    options.audience ? `- Target Audience: ${options.audience}` : null,
    options.difficulty ? `- CEFR Level / Difficulty: ${options.difficulty}` : null,
    options.tone ? `- Tone: ${options.tone}` : null,
    options.preferredRegions?.length ? `- Preferred Accent Regions: ${options.preferredRegions.join(", ")}` : null,
    options.preferredVoices?.length ? `- Preferred Azure Character Voices: ${options.preferredVoices.join(", ")}` : null,
    options.lessonCountHint ? `- Lesson count hint: ${options.lessonCountHint}` : null,
    options.domainConstraints ? `- Topic / Domain Constraints: ${options.domainConstraints}` : null,
  ].filter(Boolean).join("\n");

  const levelStr = options.difficulty || 'B2';
  const isC2 = levelStr.trim().toUpperCase() === 'C2';

  const strictVoiceDirective = options.preferredVoices && options.preferredVoices.length > 0
    ? `\n🔥 STRICT FORCIBLE PREFERRED CHARACTERS DIRECTIVE:
You MUST assign your created characters using these EXACT chosen voice preset IDs: [${options.preferredVoices.join(", ")}].
Do NOT use any other voice IDs. Every character in the "characters" array MUST map to one of these selected IDs.\n`
    : `\n🔥 STRICT VOICE QUALITY DIRECTIVE:
Assign voicePresetId values exclusively from the approved Microsoft Azure Natural Voice presets list below.
NEVER use or assign low-quality legacy voices (e.g., Microsoft David, Zira, Mark, or Desktop SAPI). All characters must use natural Azure voices.\n`;

  const strictTutorBlock = `--- STRICT LANGUAGE LEVEL DIRECTIVE ---
Act as an expert language teacher and instructional designer for a (${levelStr}) learner.
You MUST restrict all vocabulary, grammar, and sentence structures to this level (${levelStr}) or lower.
${isC2 ? `Since the learner is at C2 level, use natural, advanced vocabulary and nuanced professional expressions.` : `Keep sentences clear, direct, and appropriate for ${levelStr} proficiency.`}
${strictVoiceDirective}`;

  return String.raw`
${strictTutorBlock}

ROLE
You are an instructional designer and interactive dialogue writer.
You turn educational source material into an interactive avatar-based lesson with self-introducing characters, clear concept explanations, realistic conversations, quick comprehension checks, and branching decision scenarios.

OUTPUT FORMAT
Return ONLY one valid JSON object. No markdown code blocks, no backticks, no explanations.

STRUCTURE & PRINCIPLES
1. Dynamic Characters & Self-Introductions:
   - Create 2 to 4 distinct characters tailored directly to the lesson topic.
   - Each character MUST have:
     * id, name, emoji (use expressive emojis like 👩‍💼, 👨‍💻, 👩‍🏫, 👨‍⚕️, 👩‍🎨), gender, role, accent, voicePresetId.
     * introText: A natural 1-2 sentence self-introduction spoken by this character in the first person (e.g., "Hello! I'm Sarah, the Project Manager. I will help you practice clear and polite feedback.").
     * baseAffinity: 50 (starting rapport/affinity percentage).
2. Narrator (Ava):
   - Ava is the lesson guide with voicePresetId "ava".
   - Provides supportive guidance before lessons and decisions.
3. Mini-Lessons:
   - Clear titles using simple words from the lesson content.
   - Concept explanations using structured blocks (definitions, tables, callout notes).
   - Natural Practice Conversations (dialogues with turn-by-turn lines spoken by characters).
   - Quick comprehension questions with options, answerIndex, and clear explanations.
4. Rich Branching Scenario:
   - Multi-node decision tree with at least ${minTotalBranches} interconnected nodes and at least ${minEndings} distinct endings.
   - Each node contains context text, dialogue lines from characters, and choices that affect character affinity and lead to different outcomes.
5. Simple, Clean Language:
   - Use direct, natural language from the lesson topic. Avoid jargon like "operative", "clash", "grimoire", or sci-fi words unless the topic explicitly requires it.

APPROVED MICROSOFT AZURE VOICE PRESET IDS
- ava (Narrator - en-US-AvaMultilingualNeural)
- jenny (en-US-JennyNeural, female)
- guy (en-US-GuyNeural, male)
- aria (en-US-AriaNeural, female)
- andrew (en-US-AndrewMultilingualNeural, male)
- christopher (en-US-ChristopherNeural, male)
- eric (en-US-EricNeural, male)
- steffan (en-US-SteffanNeural, male)
- sonia (en-GB-SoniaNeural, female)
- ryan (en-GB-RyanNeural, male)
- libby (en-GB-LibbyNeural, female)
- oliver (en-GB-OliverNeural, male)
- clara (en-CA-ClaraNeural, female)
- liam (en-CA-LiamNeural, male)
- natasha (en-AU-NatashaNeural, female)
- william (en-AU-WilliamNeural, male)
- neerja (en-IN-NeerjaNeural, female)
- prabhat (en-IN-PrabhatNeural, male)
- yan (en-HK-YanNeural, female)
- sam (en-HK-SamNeural, male)
- luna (en-SG-LunaNeural, female)
- wayne (en-SG-WayneNeural, male)
- emily (en-IE-EmilyNeural, female)
- connor (en-IE-ConnorNeural, male)

CONFIGURATION
${optionBlock}
- Minimum initial choices: ${minInitialChoices}
- Minimum scenario branches/nodes: ${minTotalBranches}
- Minimum endings: ${minEndings}

JSON SCHEMA SPECIFICATION (schemaVersion: "2.0")
{
  "schemaVersion": "2.0",
  "meta": {
    "title": "string (clear, simple topic title)",
    "subtitle": "string (brief summary)",
    "audience": "string",
    "difficulty": "string",
    "estimatedMinutes": 15,
    "sourceSummary": "string",
    "defaultTheme": "light"
  },
  "narrator": {
    "id": "narrator",
    "name": "Ava",
    "fixedVoice": "ava",
    "defaultEmoji": "🎙️",
    "moodEmojiMap": {
      "neutral": "🎙️",
      "joy": "😊",
      "anger": "⚡",
      "fear": "💡",
      "love": "🤝",
      "sadness": "💭",
      "shock": "❗",
      "triumph": "🎉"
    }
  },
  "characters": [
    {
      "id": "char-1",
      "name": "Character Name",
      "emoji": "👩‍💼",
      "gender": "female | male | neutral",
      "accent": "American English",
      "voicePresetId": "jenny",
      "role": "Role description",
      "notes": "Short background note",
      "introText": "First-person self-introduction line spoken by this character.",
      "baseAffinity": 50
    }
  ],
  "lessons": [
    {
      "id": "lesson-1",
      "title": "Lesson Title",
      "accent": "General",
      "summary": "Summary of concepts",
      "objective": "Learning objective",
      "blocks": [
        {
          "id": "b1",
          "type": "paragraph | definition | table | callout",
          "title": "Block Title",
          "body": "Text explanation",
          "calloutType": "didYouKnow | qa | fyi | grammarStyle | vocabulary | communication | strategyTips",
          "definitions": [
            { "term": "Key Phrase", "definition": "Clear explanation", "usageExample": "Sample sentence in context." }
          ],
          "headers": ["Phrase", "Meaning", "Example"],
          "rows": [["Could you clarify...", "Asking for more detail", "Could you clarify what you mean by step 2?"]]
        }
      ],
      "dialogue": [
        { "id": "d1", "speakerId": "char-1", "text": "What do you think of this proposal?", "emotion": "neutral" }
      ],
      "narration": [
        { "id": "n1", "text": "Listen to the conversation to see how the phrases are used.", "mood": "neutral" }
      ],
      "quickChecks": [
        {
          "id": "q1",
          "question": "Which phrase is best for asking for clarification politely?",
          "options": ["Could you explain that again?", "That makes no sense.", "Tell me now."],
          "answerIndex": 0,
          "explanation": "'Could you explain that again?' is polite and constructive."
        }
      ]
    }
  ],
  "scenario": {
    "startNode": "node-1",
    "nodes": {
      "node-1": {
        "id": "node-1",
        "type": "context | choice | consequence | ending",
        "act": 1,
        "title": "Opening Situation",
        "body": "Situation description",
        "speakerId": "char-1",
        "lines": [
          { "id": "l1", "speakerId": "char-1", "text": "We need to agree on our project schedule today.", "emotion": "neutral" }
        ],
        "choices": [
          {
            "id": "c1",
            "label": "Suggest a step-by-step review of the timeline.",
            "goto": "node-2",
            "hint": "Collaborative approach",
            "affinity": [{ "characterId": "char-1", "amount": 10 }]
          },
          {
            "id": "c2",
            "label": "Ask if anyone has critical concerns first.",
            "goto": "node-3",
            "hint": "Empathetic approach",
            "affinity": [{ "characterId": "char-1", "amount": 5 }]
          }
        ]
      }
    }
  }
}
`;
};

export default buildCopyPromptV2;
