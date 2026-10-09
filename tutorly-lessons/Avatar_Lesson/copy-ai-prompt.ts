/**
 * copy-ai-prompt.ts
 * ---------------------------------------------------------------------------
 * The external-AI instruction prompt for the Avatar Lesson Engine.
 *
 * WHAT THIS IS
 * A single, exhaustive prompt you hand to an external AI (ChatGPT, Claude,
 * Gemini, etc.) along with raw lesson material (plain text, Markdown, or a
 * PDF excerpt). The AI returns ONE valid JSON object that plugs directly into
 * generateStandaloneHtml() from htmlgenerator.tsx. No transformation needed.
 *
 * WHY IT LIVES IN A .ts FILE
 * Keeping the prompt as a typed, versioned export lets you import it into the
 * generator UI, a CLI, or a server route without copy-paste drift. The schema
 * described in the prompt is the SAME contract the engine validates against.
 *
 * USAGE
 *   import { buildCopyPrompt } from "./copy-ai-prompt";
 *   const prompt = buildCopyPrompt({ audience: "Grade 9", tone: "playful" });
 *   // then send: prompt + "\n\nSOURCE MATERIAL:\n" + rawText
 * ---------------------------------------------------------------------------
 */

export interface CopyPromptOptions {
  /** Target audience, e.g. "Grade 9", "med students", "adult learners". */
  audience?: string;
  /** Difficulty, e.g. "Beginner", "Intermediate", "Advanced". */
  difficulty?: string;
  /** Tone, e.g. "playful", "formal", "cinematic", "warm mentor". */
  tone?: string;
  /** Preferred accents/regions, e.g. ["United Kingdom", "United States"]. */
  preferredRegions?: string[];
  /** Preferred voice preset ids, e.g. ["aria", "ryan"]. */
  preferredVoices?: string[];
  /** Approximate lesson count if you want to force it. Omit to auto-segment. */
  lessonCountHint?: number;
  /** Minimum initial choices in the scenario. Default 5. */
  minInitialChoices?: number;
  /** Minimum total branch transitions. Default 25. */
  minTotalBranches?: number;
  /** Minimum distinct endings. Default 3. */
  minEndings?: number;
  /** Domain constraints, e.g. "keep chemistry formulas accurate". */
  domainConstraints?: string;
}

/* =========================================================================
 * The voice roster block. Kept in sync with VOICE_PRESETS in htmlgenerator.tsx.
 * The AI may only assign voicePresetId values from this list.
 * ========================================================================= */

export const VOICE_ROSTER_BLOCK = String.raw`
VOICE ROSTER (assign one voicePresetId per character from this list only)

United Kingdom English ("Kingdom")
- sonia    en-GB-SoniaNeural    female  Online Natural       emoji 🧝‍♀️
- ryan     en-GB-RyanNeural     male    Online Natural       emoji 🧙‍♂️
- libby    en-GB-LibbyNeural    female  Neural alternative   emoji 👩‍⚕️
- oliver   en-GB-OliverNeural   male    Neural alternative   emoji 👨‍⚕️
- maisie   en-GB-MaisieNeural   female  Child / Youth        emoji 🧒

Australian English ("Australia")
- natasha  en-AU-NatashaNeural  female  Online Natural       emoji 👩‍🌾
- william  en-AU-WilliamNeural  male    Online Natural       emoji 👨‍🌾
- annette  en-AU-AnnetteNeural  female  Neural alternative   emoji 🧜‍♀️
- darren   en-AU-DarrenNeural   male    Neural alternative   emoji 🧜‍♂️

Canadian English ("Canada")
- clara    en-CA-ClaraNeural    female  Online Natural       emoji 👩‍🚀
- liam     en-CA-LiamNeural     male    Online Natural       emoji 👨‍🚀

United States English ("Steam" / Standard Base)
- aria         en-US-AriaNeural                female  Online Natural     emoji 🧚‍♀️
- jenny        en-US-JennyNeural               female  Online Natural     emoji 🦸‍♀️
- guy          en-US-GuyNeural                 male    Online Natural     emoji 🦸‍♂️
- andrew       en-US-AndrewMultilingualNeural  male    HD Natural         emoji 🕵️‍♂️
- ava          en-US-AvaMultilingualNeural     female  HD Natural         emoji 🧛‍♀️
- ana          en-US-AnaNeural                 female  Child              emoji 👧
- christopher  en-US-ChristopherNeural         male    Neural alternative emoji 🧞‍♂️
- eric         en-US-EricNeural                male    Neural alternative emoji 👨‍💻
- steffan      en-US-SteffanNeural             male    Neural alternative emoji 🥷

India English (en-IN)
- neerja   en-IN-NeerjaNeural   female  emoji 👩‍🎓
- prabhat  en-IN-PrabhatNeural  male    emoji 👨‍🎓

Ireland English (en-IE)
- emily    en-IE-EmilyNeural    female  emoji 🧝‍♀️
- connor   en-IE-ConnorNeural   male    emoji 🧝‍♂️

New Zealand English (en-NZ)
- yolanda  en-NZ-MollyNeural    female  emoji 🏄‍♀️
- mitchell en-NZ-MitchellNeural male    emoji 🏄‍♂️

South Africa English (en-ZA)
- leah     en-ZA-LeahNeural     female  emoji 🧕
- luke     en-ZA-LukeNeural     male    emoji 👳‍♂️

Hong Kong English (en-HK)
- yan      en-HK-YanNeural      female  emoji 👩‍💼
- sam      en-HK-SamNeural      male    emoji 👨‍💼

Singapore English (en-SG)
- luna     en-SG-LunaNeural     female  emoji 👩‍🍳
- wayne    en-SG-WayneNeural    male    emoji 👨‍🍳

Philippines English (en-PH)
- rosa     en-PH-RosaNeural     female  emoji 👩‍🔬
- james    en-PH-JamesNeural    male    emoji 👨‍🔬

Nigeria English (en-NG)
- ezinne   en-NG-EzinneNeural   female  emoji 🧞‍♀️
- abeo     en-NG-AbeoNeural     male    emoji 🧞‍♂️

Kenya English (en-KE)
- asmani   en-KE-AsiliaNeural   female  emoji 🦹‍♀️
- chilemba en-KE-ChilembaNeural male    emoji 🦹‍♂️

Ghana English (en-GH)
- afia     en-GH-AfiaNeural     female  emoji 👸
- ekow     en-GH-EkowNeural     male    emoji 🤴

Tanzania English (en-TZ)
- imani    en-TZ-ImaniNeural    female  emoji 👩‍🎤
- elimu    en-TZ-ElimuNeural    male    emoji 👨‍🎤
`;

/* =========================================================================
 * The JSON schema block. Mirrors the AvatarLessonData type exactly.
 * ========================================================================= */

export const SCHEMA_BLOCK = String.raw`
OUTPUT SCHEMA (return exactly this shape, one JSON object, nothing else)

{
  "schemaVersion": "1.0",
  "meta": {
    "title": "string",
    "subtitle": "string (optional)",
    "audience": "string (optional)",
    "difficulty": "string (optional)",
    "estimatedMinutes": 0,
    "sourceSummary": "string (optional)",
    "authorNote": "string (optional)"
  },
  "characters": [
    {
      "id": "string, stable slug, unique",
      "name": "string, matches the chosen voice person name",
      "emoji": "string, single emoji, matches the roster default unless customized",
      "gender": "female | male | neutral",
      "accent": "string, human readable e.g. United Kingdom English",
      "voicePresetId": "string, one id from the VOICE ROSTER",
      "role": "string (optional) e.g. mentor, skeptic, rival",
      "notes": "string (optional) director notes on speaking style",
      "baseAffinity": 50
    }
  ],
  "lessons": [
    {
      "id": "string, unique slug",
      "title": "string",
      "accent": "css color, oklch recommended e.g. oklch(72% 0.14 24)",
      "conceptIds": ["string, stable concept slugs used by coverage"],
      "summary": "string, one or two sentences",
      "estimatedMinutes": 0,
      "blocks": [
        {
          "id": "string, unique within lesson",
          "type": "paragraph | list | orderedList | table | callout | quote | code | definition",
          "title": "string (optional)",
          "body": "string (used by paragraph, callout, quote, code)",
          "items": ["string (used by list and orderedList)"],
          "headers": ["string (used by table)"],
          "rows": [["string (used by table, one array per row)"]],
          "calloutType": "didYouKnow | qa | fyi | grammarStyle | vocabulary | cultural | civic | lifeSkills | criticalThinking | transferableSkills | softSkills | pronunciation | strategyTips | communication | fluency | custom",
          "icon": "string (optional emoji override for callout)",
          "language": "string (optional, for code blocks)",
          "definitions": [{ "term": "string", "definition": "string" }]
        }
      ],
      "dialogue": [
        { "id": "string", "speakerId": "character id", "text": "spoken line", "emotion": "neutral | joy | anger | fear | love | sorrow" }
      ],
      "quickChecks": [
        {
          "id": "string",
          "question": "string",
          "options": ["string", "string"],
          "answerIndex": 0,
          "explanation": "string"
        }
      ]
    }
  ],
  "scenario": {
    "startNode": "string, id of the first node",
    "nodes": {
      "node-id": {
        "id": "string, must equal its key",
        "type": "context | choice | consequence | ending",
        "title": "string",
        "body": "string, narrative prose (this is displayed, may use normal punctuation)",
        "speakerId": "string (optional)",
        "lines": [
          { "id": "string", "speakerId": "character id", "text": "spoken line", "emotion": "neutral | joy | anger | fear | love | sorrow" }
        ],
        "choices": [
          {
            "id": "string",
            "label": "string, the choice the learner clicks",
            "goto": "string, an existing node id",
            "hint": "string (optional)",
            "setsFlags": { "flagName": true },
            "requiresFlags": { "flagName": true },
            "affinity": [{ "characterId": "id", "amount": 10 }]
          }
        ],
        "next": "string (optional, existing node id, used when no choices)",
        "reinforces": ["conceptId that this node applies or references"],
        "setsFlags": { "flagName": true },
        "requiresFlags": { "flagName": true },
        "affinity": [{ "characterId": "id", "amount": -5 }],
        "endingStyle": "success | warning | tragic | bittersweet"
      }
    },
    "coverageRules": [
      { "conceptId": "string", "lessonId": "string", "requiredNodeIds": ["node id"] }
    ]
  },
  "customVoiceProfiles": [
    { "id": "string", "label": "string", "emoji": "string", "voiceName": "exact voice name", "lang": "en-US" }
  ]
}
`;

/* =========================================================================
 * The worked example block. One complete tiny lesson + branch so the AI
 * locks onto the exact shape. Few-shot beats description.
 * ========================================================================= */

export const EXAMPLE_BLOCK = String.raw`
WORKED EXAMPLE (shape only, your real output will be far larger and cover the whole source)

{
  "schemaVersion": "1.0",
  "meta": {
    "title": "Argument Mapping Basics",
    "subtitle": "Turn opinions into arguments that hold up",
    "audience": "High school learners",
    "difficulty": "Intermediate",
    "estimatedMinutes": 22,
    "sourceSummary": "Introduces claims, evidence, and reasoning as the backbone of persuasion."
  },
  "characters": [
    { "id": "aria", "name": "Aria", "emoji": "🧚‍♀️", "gender": "female", "accent": "United States English", "voicePresetId": "aria", "role": "mentor", "notes": "Encouraging, spots weak logic fast.", "baseAffinity": 55 },
    { "id": "ryan", "name": "Ryan", "emoji": "🧙‍♂️", "gender": "male", "accent": "United Kingdom English", "voicePresetId": "ryan", "role": "skeptic", "notes": "Challenges every unsupported leap.", "baseAffinity": 40 },
    { "id": "ava", "name": "Ava", "emoji": "🧛‍♀️", "gender": "female", "accent": "United States English", "voicePresetId": "ava", "role": "rival", "notes": "Calm, cutting, plays to win.", "baseAffinity": 30 }
  ],
  "lessons": [
    {
      "id": "lesson-claims",
      "title": "Claims Need Support",
      "accent": "oklch(72% 0.14 24)",
      "conceptIds": ["claim", "support"],
      "summary": "A claim is the point you want accepted, but without support it is just an opinion.",
      "estimatedMinutes": 7,
      "blocks": [
        { "id": "c-p1", "type": "paragraph", "body": "A strong claim is specific, contestable, and worth caring about in its context." },
        { "id": "c-tbl", "type": "table", "title": "Weak versus strong", "headers": ["Weak", "Strong"], "rows": [["School lunches matter", "School lunches should include fresh produce because nutrition affects attention"], ["Reading is good", "Twenty minutes of daily reading raises vocabulary scores in younger students"]] },
        { "id": "c-ct", "type": "callout", "calloutType": "criticalThinking", "body": "If nobody could reasonably disagree, it is a fact, not a claim worth arguing." },
        { "id": "c-voc", "type": "callout", "calloutType": "vocabulary", "title": "Diction check", "body": "Contestable means a reasonable person could push back on it." }
      ],
      "dialogue": [
        { "id": "c-d1", "speakerId": "aria", "text": "If your claim is mushy, everything built on it collapses.", "emotion": "neutral" },
        { "id": "c-d2", "speakerId": "ryan", "text": "Good. I was hoping you would say something I could actually challenge.", "emotion": "joy" }
      ],
      "quickChecks": [
        { "id": "c-q1", "question": "Which statement is easier to defend with evidence?", "options": ["Books are useful", "Daily reading time improves vocabulary growth in younger students"], "answerIndex": 1, "explanation": "The second is specific and measurable, so evidence can support it." }
      ]
    }
  ],
  "scenario": {
    "startNode": "hearing",
    "nodes": {
      "hearing": {
        "id": "hearing",
        "type": "context",
        "title": "The Board Hearing Begins",
        "body": "Funding is on the line. You have one opening statement before the board decides.",
        "lines": [ { "id": "h1", "speakerId": "aria", "text": "Lead with a real claim, not a fog cloud.", "emotion": "neutral" } ],
        "choices": [
          { "id": "h-c1", "label": "State a precise claim tying lunch quality to learning", "goto": "strong-open", "setsFlags": { "openedStrong": true }, "affinity": [{ "characterId": "aria", "amount": 10 }] },
          { "id": "h-c2", "label": "Ramble with no clear point", "goto": "weak-open" },
          { "id": "h-c3", "label": "Ask Ryan to stress test your claim first", "goto": "stress-test", "setsFlags": { "testedClaim": true }, "affinity": [{ "characterId": "ryan", "amount": 12 }] },
          { "id": "h-c4", "label": "Lean on emotion only", "goto": "weak-open", "affinity": [{ "characterId": "ava", "amount": 6 }] },
          { "id": "h-c5", "label": "Open with a measurable problem, then the claim", "goto": "strong-open", "setsFlags": { "openedStrong": true, "usedMetric": true } }
        ],
        "reinforces": ["claim", "support"]
      },
      "strong-open": {
        "id": "strong-open",
        "type": "consequence",
        "title": "The Room Leans In",
        "body": "Because your claim is specific, the board can follow the logic instead of guessing what you mean.",
        "lines": [ { "id": "s1", "speakerId": "ava", "text": "Clever. But a clean claim still needs evidence behind it.", "emotion": "anger" } ],
        "reinforces": ["claim"],
        "choices": [
          { "id": "s-c1", "label": "Back the claim with the nutrition study", "goto": "win", "requiresFlags": { "openedStrong": true }, "affinity": [{ "characterId": "aria", "amount": 8 }] },
          { "id": "s-c2", "label": "Freeze and repeat the claim louder", "goto": "weak-open" }
        ]
      },
      "stress-test": {
        "id": "stress-test",
        "type": "consequence",
        "title": "Ryan Attacks the Weak Spots",
        "body": "It stings, but now you know exactly which parts need support before the real vote.",
        "reinforces": ["claim", "support"],
        "next": "win"
      },
      "weak-open": {
        "id": "weak-open",
        "type": "ending",
        "title": "You Lost Them Early",
        "body": "Without a clear supported claim, your evidence has nowhere to land. The board moves on and funding is cut.",
        "reinforces": ["claim"],
        "endingStyle": "tragic"
      },
      "win": {
        "id": "win",
        "type": "ending",
        "title": "A Clean Argument Lands",
        "body": "You present a claim people can test and challenge, and because it is genuinely supported, they accept it.",
        "lines": [ { "id": "w1", "speakerId": "ryan", "text": "That held up. I have nothing left to poke at.", "emotion": "joy" } ],
        "reinforces": ["claim", "support"],
        "endingStyle": "success"
      }
    },
    "coverageRules": [
      { "conceptId": "claim", "lessonId": "lesson-claims", "requiredNodeIds": ["hearing", "strong-open", "stress-test", "win"] },
      { "conceptId": "support", "lessonId": "lesson-claims", "requiredNodeIds": ["hearing", "stress-test", "win"] }
    ]
  }
}
`;

/* =========================================================================
 * The main prompt builder. Assembles the full instruction from parts +
 * caller options.
 * ========================================================================= */

export const buildCopyPrompt = (options: CopyPromptOptions = {}): string => {
  const minInitialChoices = options.minInitialChoices ?? 5;
  const minTotalBranches = options.minTotalBranches ?? 25;
  const minEndings = options.minEndings ?? 3;

  const optionalInputs = [
    options.audience ? `- Target audience: ${options.audience}` : null,
    options.difficulty ? `- Difficulty: ${options.difficulty}` : null,
    options.tone ? `- Tone: ${options.tone}` : null,
    options.preferredRegions?.length ? `- Preferred accents/regions: ${options.preferredRegions.join(", ")}` : null,
    options.preferredVoices?.length ? `- Preferred voice preset ids: ${options.preferredVoices.join(", ")}` : null,
    options.lessonCountHint ? `- Approximate lesson count: ${options.lessonCountHint}` : null,
    options.domainConstraints ? `- Domain constraints: ${options.domainConstraints}` : null,
  ].filter(Boolean).join("\n");

  const levelStr = options.difficulty || 'B1';
  const isC2 = levelStr.trim().toUpperCase() === 'C2';

  const strictVoiceDirective = options.preferredVoices && options.preferredVoices.length > 0
    ? `\n🔥 CRITICAL FORCIBLE CHARACTER & VOICE PRESET INSTRUCTION:
You MUST assign your created characters using these EXACT chosen voice preset IDs: [${options.preferredVoices.join(", ")}].
Do NOT invent unapproved voice IDs. Every character in the "characters" array MUST map to one of these chosen voice preset IDs.\n`
    : `\n🔥 STRICT NATURAL VOICE QUALITY DIRECTIVE:
Assign voicePresetId values exclusively from the approved VOICE ROSTER below.
NEVER use or output low-quality legacy voices (e.g., Microsoft David, Zira, Mark, or Desktop SAPI). All characters must use modern natural Azure voices.\n`;

  const strictTutorBlock = `--- FORCIBLE & NON-NEGOTIABLE STRICT LANGUAGE TUTOR DIRECTIVE ---
Act as a strict language tutor for an [learner level] (${levelStr}) learner. You MUST forcibly and non-negotiably restrict your language to this level (${levelStr}) or lower. Do not use any vocabulary, grammar structures, or sentence lengths that exceed [learner level] (${levelStr}). If you must use a word above this level, write it in bold and provide the L2 definition and examples and L1 translation.

${isC2 ? `🔥 SPECIAL C2 LEVEL REQUIREMENT:
Since the learner level is C2, AI MUST purposefully use C2 vocabulary, grammar, complexity, and sophisticated sentence structures throughout the lesson.` : `🔥 SPECIAL C2 & LEVEL REQUIREMENT:
On the other hand, when the learner level is C2 (or when C2 is specified), AI MUST purposefully use C2 vocabulary, grammar, and complexity. For the current specified level (${levelStr}), you MUST strictly limit vocabulary, grammar, and sentence length to ${levelStr} or lower.`}
${strictVoiceDirective}`;

  return String.raw`
${strictTutorBlock}

ROLE
You are an elite instructional designer, narrative game writer, and data engineer.
You convert raw educational material into structured JSON for an avatar-driven,
discovery-learning experience that renders as an interactive HTML game.

PRIME DIRECTIVE
Return exactly ONE valid JSON object and nothing else.
No prose before it. No prose after it. No markdown code fences. No comments.
The JSON must conform to the OUTPUT SCHEMA below and pass every SELF-CHECK item.

PEDAGOGICAL FRAME
Design for discovery learning and scaffolding. Move from simple to complex.
Let learners uncover ideas rather than be lectured. Use gamification: stakes,
choices, consequences, and emotional payoff. Every scenario decision must apply
real lesson content, not generic trivia. The story is the practice, not a bonus.

PRODUCT CONTEXT
- The JSON is consumed by a generator that emits a single self-contained HTML file.
- Audio uses the browser Web Speech API. Encourage opening in Microsoft Edge for
  the most natural Microsoft Online Natural voices.
- The renderer supports large 3D emoji avatars, color-coded lessons, tables,
  lists, callouts, definitions, quick checks, and a branching scenario graph.

CONTENT EXTRACTION RULES
1. Read the entire source. Cover 100 percent of its substantive content.
2. Smartly segment into coherent mini-lessons based on the material's natural
   structure. Do not force an arbitrary count. One subtopic per lesson.
3. Each lesson gets a clear title, a concise summary, and rich blocks.
4. Every lesson must include at least one table OR list/orderedList block.
5. Use callouts where they add real value across varied types (Did You Know,
   Q&A, Grammar & Style, Vocabulary, Cultural, Civic, Life Skills, Critical
   Thinking, Transferable Skills, Soft Skills, Pronunciation, Strategy,
   Communication, Fluency, and custom). Do not use callouts as filler.
6. Give each lesson at least one dialogue exchange between two characters.
7. Give each lesson at least one meaningful quickCheck tied to a concept.
8. Assign each lesson a distinct accent color. Vary hues across lessons.
9. Define stable conceptIds per lesson. These drive coverage. Keep them short.
10. Preserve technical accuracy. Do not simplify to the point of being wrong.

CHARACTER RULES
1. Create 3 to 6 characters unless the material strongly demands more.
2. Give them distinct roles, for example mentor, skeptic, strategist, rival,
   wildcard, learner.
3. Assign each a voicePresetId from the VOICE ROSTER. Match gender and emoji to
   the roster entry unless the caller requested a customization.
4. Keep each character's speaking style consistent across all lessons and nodes.
5. Match accent and tone deliberately to personality, not at random.
6. The character name should match the roster voice person name.

SCENARIO RULES (the game layer)
1. Model the scenario as a NODE GRAPH keyed by id, not a linear tree.
2. Set startNode to a vivid context node that establishes real stakes.
3. Provide at least ${minInitialChoices} initial choices from the opening context.
4. Create at least ${minTotalBranches} total branch transitions across the whole
   graph (count every choice.goto and every node.next).
5. Include at least ${minEndings} distinct endings.
6. At least one ending must be tragic or costly. At least one must be a clear success.
7. Use flags (setsFlags / requiresFlags) so later options depend on earlier
   behavior. This enables betrayal, loyalty, romance, sacrifice, and life-or-death
   turns without exploding the graph.
8. Use affinity deltas to track how characters feel about the learner.
9. Allow paths to reconverge to shared nodes and shared endings. Reuse, do not duplicate.
10. Every non-ending node must have either choices or a next. No dead ends.
11. Every goto and next must point to an existing node id.
12. Every node must be reachable from startNode.
13. Every conceptId from every lesson must appear in at least one reachable node's
    reinforces array. This is mandatory coverage.
14. Consequence bodies must explain WHY the learner's decision mattered, referencing
    the lesson concept in plain language.
15. Emotional reactions must be specific and earned, never cartoonish filler.

TTS SAFETY RULES (spoken text only: dialogue[].text and node.lines[].text)
1. Never use these symbols in spoken text: asterisk, underscore, hash, pipe,
   tilde, curly braces. (That is: * _ # | ~ { })
2. Write natural, conversational sentences suitable for reading aloud.
3. Expand abbreviations in spoken text. Spell out symbols and numbers where a
   human would say them.
4. Avoid parenthetical asides in spoken text.
5. Narrative body fields (node.body, lesson prose) may use normal punctuation,
   since they are displayed and not necessarily spoken.

VERBOSITY CONTROL
- Lesson prose: detailed and comprehensive, but tight. No padding, no restating.
- Spoken lines: short enough for a speech bubble and clean TTS, roughly one to
  three sentences.
- Table cells: concise phrases, not paragraphs.

${VOICE_ROSTER_BLOCK}

${SCHEMA_BLOCK}

${EXAMPLE_BLOCK}

SELF-CHECK BEFORE YOU RESPOND (verify silently, fix, then output)
- The output is a single valid JSON object with no surrounding text or fences.
- schemaVersion equals "1.0".
- Every character has a voicePresetId that exists in the VOICE ROSTER.
- Every speakerId used anywhere refers to a defined character id.
- Every lesson has non-empty conceptIds.
- Every lesson has at least one table or list/orderedList block.
- Every lesson has at least one dialogue exchange and one quickCheck.
- scenario.startNode exists in scenario.nodes.
- Every choice.goto and every node.next points to an existing node.
- Every non-ending node has choices or next. No dead ends.
- Every node is reachable from startNode.
- There are at least ${minInitialChoices} initial choices.
- There are at least ${minTotalBranches} total branch transitions.
- There are at least ${minEndings} distinct endings, including one tragic/costly and one success.
- Every conceptId appears in at least one reachable node's reinforces array.
- coverageRules lists each conceptId with its lessonId and the node ids that apply it.
- No spoken text contains * _ # | ~ { }.
- quickCheck answerIndex is a valid index into its options array.

${optionalInputs ? `CALLER OPTIONS\n${optionalInputs}\n` : ""}
INPUT HANDLING
- If the source is long, segment intelligently and still cover everything.
- If the source is technical, preserve accuracy above stylistic flair.
- If the source is humanities or narrative, preserve nuance and interpretation.
- If audience is unspecified, infer a reasonable broad audience from the material.
- If a concept is hard, scaffold it with simpler buildup before advanced application.

NOW DO THE TASK
The user's raw lesson material follows after this prompt.
Read it fully, then return only the finished JSON object.
`.trim();
};

/**
 * Convenience default: the prompt with no caller options applied.
 * Import this when you just want the canonical instruction text.
 */
export const avatarLessonCopyPrompt: string = buildCopyPrompt();

export default avatarLessonCopyPrompt;
