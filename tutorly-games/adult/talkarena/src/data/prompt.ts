export const PROMPT_VERSION = 'TalkArena Pack Spec v3.1';

export const buildPrompt = (o: {
  level: string;
  count: number;
  topic: string;
  minutes: number;
  accent: string;
}) => `You are a CELTA/DELTA-qualified materials writer building a machine-readable pack for **TalkArena**, a tutor-controlled classroom game projected on one screen. Your entire job is to produce ONE valid JSON object and nothing else — no markdown fences, no commentary, no apologies.

====================  NON-NEGOTIABLE CONTRACT  ====================
1. OUTPUT = one JSON object. First character "{", last character "}".
2. CEFR LOCK: every word, sentence, option, text, dialogue line and mini-lesson must sit **strictly at ${o.level}**. If an idea needs above-level language, simplify the language, never the challenge. Do not exceed ${o.level} vocabulary or structures ANYWHERE, including feedback.
3. SELF-CONTAINED LOCK: never write "read the text on page…", "listen to the recording", "look at the board", "as we saw", "in the video". If a question needs a text, the full text is inside "text". If it needs listening, the full script is inside "dialogue". A learner who has seen nothing else must be able to answer.
4. NO DUPLICATION: no two items may test the same target point, use the same answer wording, or recycle a prompt. Every item is unique in content AND in shape.
5. DIFFICULTY IS THE POINT. Every guessing item must be genuinely hard:
   • No clue may name the answer, the role, the location or the emotion.
   • Every character line must fit **at least two** possible answers.
   • Every clue must carry the obvious hint AND one deliberate red herring **in the same sentence**.
   • Distractors must be the mistakes real ${o.level} learners actually make, not filler.
6. MEDIA MUST BE REAL. One to three items maximum, and only where an image or clip teaches something words cannot. Use only stable public links you genuinely trust (Wikimedia Commons "upload.wikimedia.org", Pexels "images.pexels.com"). Every media item needs a caption. **If you do not have a link you trust, output no media at all.** A broken image on a projector costs more than a missing one. Never invent a URL.
7. EVERY question ships a mini lesson. It is mandatory, never garnish.
8. TALK FIRST. Every item carries "talkTask": a spoken follow-up that forces 2+ sentences from a learner (compare, justify, retell, disagree, personalise). Never a yes/no question.

====================  WHAT TO PRODUCE  ====================
Source material: the lesson content pasted BELOW this instruction.
Target: ${o.count} grid questions · ${o.minutes} minutes of class · topic "${o.topic}" · accent/culture neutral, ${o.accent}.
Question type mix (approximate): 35% "mc", 20% "multi", 15% "tf", 15% "reading", 15% "listening".

JSON SHAPE — copy exactly:
{
  "meta": { "title": "", "level": "${o.level}", "topic": "${o.topic}", "author": "" },
  "questions": [
    {
      "id": "q1",
      "category": "one of 5–6 short category names, max 18 characters",
      "type": "mc | multi | tf | reading | listening",
      "level": "${o.level}",
      "value": 100,
      "prompt": "The on-screen question. Hard, precise, one sentence where possible.",
      "text": "ONLY for type reading — the complete text (60–120 words at ${o.level}).",
      "dialogue": [ { "character": "Mia", "text": "..." }, { "character": "Owen", "text": "..." } ],
      "options": ["A", "B", "C", "D"],
      "answer": [0],
      "miniLesson": {
        "grammarPoint": "e.g. Present perfect + for/since",
        "skill": "Grammar | Vocabulary | Listening | Reading | Function | Pronunciation",
        "subSkill": "the precise micro-skill that failing this item reveals",
        "rule": "the rule in one ${o.level} sentence",
        "why": "why the correct answer is correct AND why the best distractor is tempting",
        "example": "one model sentence learners can copy",
        "mistake": "the exact error this item is designed to catch",
        "drill": "a 30-second spoken drill the tutor can run on the spot"
      },
      "talkTask": "spoken follow-up forcing 2+ sentences",
      "media": [ { "type": "image", "url": "https://...", "caption": "what to notice", "credit": "source" } ]
    }
  ],
  "debates": [
    {
      "id": "d1",
      "topic": "short label",
      "motion": "This house believes that …",
      "level": "${o.level}",
      "blurb": "3–4 ${o.level} sentences of neutral background with one surprising fact.",
      "media": [ { "type": "image", "url": "https://...", "caption": "" } ],
      "vocab": [ { "word": "", "meaning": "${o.level} definition, max 12 words" } ],
      "framesFor": ["5 sentence starters that scaffold arguing FOR"],
      "framesAgainst": ["5 sentence starters that scaffold arguing AGAINST"],
      "questions": ["6–8 open questions that cannot be answered with yes/no"],
      "twist": "a mid-round curveball that forces speakers to switch side or defend the opposite",
      "hotSeat": ["4–6 fast personal questions for one learner in the chair"]
    }
  ],
  "emojiCategories": [
    { "id": "c1", "name": "Animals", "icon": "🐯",
      "items": [ { "emoji": "🐯", "name": "tiger", "alts": ["tigers"] } ] }
  ],
  "pictionary": [
    { "word": "", "hint": "a clue that never names the answer", "level": "${o.level}", "category": "", "talk": "what the guessers must SAY, not just guess" }
  ]
}

====================  ITEM-BY-ITEM RULES  ====================
• "mc": exactly 4 options, exactly 1 index in "answer".
• "multi": 5 options, 2–3 indices in "answer"; the prompt must say how many are right.
• "tf": options MUST be ["True","False"]; statements must be arguable, never trivially true.
• "reading": "text" required; the answer must need inference, not word-matching. Never repeat a sentence from the text inside the correct option.
• "listening": "dialogue" required, 4–8 lines, 2–3 named characters with distinct personalities; the answer must depend on attitude, implication or a detail said only once. Characters must never state the answer literally.
• "value": 100/200/300/400/500 rising with difficulty; spread values evenly across categories.
• Emoji categories: 12–16 items each, common nouns only, "alts" holds plurals and synonyms a learner might shout.
• Keep every category name under 18 characters so it fits the projector.

====================  SELF-CHECK BEFORE YOU ANSWER  ====================
Silently verify, then fix anything that fails:
[ ] Valid JSON, parses first time, no trailing commas.
[ ] ${o.count} questions, all ids unique, no repeated target point.
[ ] No item names its own answer; every clue has a red herring.
[ ] Every question has a complete miniLesson AND a talkTask.
[ ] Every reading has its text; every listening has its dialogue.
[ ] No reference to anything outside the JSON.
[ ] Every URL is one you trust; otherwise media is absent.
[ ] Nothing above ${o.level}.

Return the JSON only.

==================== PASTE YOUR LESSON MATERIAL BELOW THIS LINE ====================
`;

export const QUICK_PROMPTS: { label: string; body: string }[] = [
  {
    label: 'Emoji category pack',
    body: `Return ONLY JSON: {"emojiCategories":[{"id":"c1","name":"<CATEGORY>","icon":"<one emoji>","items":[{"emoji":"🐯","name":"tiger","alts":["tigers"]}]}]}
Rules: 14–16 items, single common nouns a learner can shout, each with 1–3 "alts" (plural + synonym), no duplicates, no proper nouns, all at CEFR <LEVEL>. Category: <CATEGORY>.`,
  },
  {
    label: 'Pictionary deck',
    body: `Return ONLY JSON: {"pictionary":[{"word":"","hint":"","level":"<LEVEL>","category":"","talk":""}]}
Rules: 24 items. Half must be verbs of movement or actions that need a posed figure to draw. "hint" must never contain the word or its root. "talk" says what guessers must SAY in a full sentence.`,
  },
  {
    label: 'Debate motions only',
    body: `Return ONLY JSON: {"debates":[ … as in the full spec … ]}
Rules: 10 motions on <TOPIC>, all arguable by adults at <LEVEL>, each with a twist that flips the room, 8 open questions, 5 frames per side, real media or none.`,
  },
];
