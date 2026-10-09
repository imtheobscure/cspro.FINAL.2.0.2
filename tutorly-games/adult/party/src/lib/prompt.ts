export type PromptOptions = {
  cefr: string;
  l1: string;
  topic: string;
  lessonTitle: string;
  narratorNotes?: string;
};

/** The single long instruction a tutor copies, pastes above their lesson material, and feeds to any AI. */
export function buildCopyPrompt(o: PromptOptions) {
  const { cefr, l1, topic, lessonTitle } = o;
  return `You are producing the complete content pack for PARTY, a classroom game show with seventeen game environments. Your entire output must be ONE valid JSON object and nothing else: no markdown fence, no commentary, no trailing text.

LESSON: "${lessonTitle}"  |  TOPIC: ${topic}  |  TARGET LEVEL: ${cefr}  |  LEARNER FIRST LANGUAGE: ${l1}

=== NON-NEGOTIABLE RULES ===
1. LEVEL LOCK. Every word, question, story, statement and mini lesson must sit at ${cefr}. If a concept needs a harder word, define it inside the same sentence. Never exceed ${cefr} except in the "keyword" field, which may stretch one sub-level.
2. SELF-CONTAINED. Nothing may refer to outside material. Never write "read the text on page 4", "listen to track 2", "as in the video". If a question needs a reading text, you must WRITE the full text inside "passage". If it needs listening, you must WRITE the full multi-character script inside "script" as an array of {speaker, voice, line}, where voice is "m", "f" or "n". The screen reads it aloud with natural voices, so scripts must sound like speech, not prose.
3. COUNT LOCK. Exactly 64 grid questions, numbered cell 1 to 64. No duplicates, no near-duplicates, no recycled stems, no two questions testing the identical point in the identical way. A class notices repetition instantly.
4. DIFFICULTY TAGS. Tag every question "easy", "medium" or "hard". Aim for 22 easy, 22 medium, 20 hard. The hard set is used as the high cards of a poker deck, so hard questions must genuinely be hard to guess: plausible distractors, no giveaway grammar, no option that is obviously longer or more detailed than the others.
5. MINI LESSON ON EVERY QUESTION. Mandatory, never optional, using this exact shape:
   "lesson": {
     "headline": one warm line, max 12 words,
     "why": why the right answer is right, naming the rule,
     "wrongWhy": one string per wrong option, in the same order as the options, explaining what choosing it reveals,
     "form": { "rule": the pattern in symbols/words, "examples": 2-3 model sentences },
     "keyword": { "word": the key word, "collocation": its strongest partner, "trap": the classic error },
     "steps": 2-4 numbered teaching steps a tutor can say aloud,
     "speakingTask": one short task the class answers out loud,
     "media": [] }
6. MEDIA HONESTY. Only include a media item if you are certain the link is stable and public. One to three per question maximum, and only where an image or clip teaches something words cannot. Every item needs {type: "image"|"gif"|"audio"|"video", url, caption, notice}. If you do not have a link you trust, leave "media" as an empty array. A broken image on a projector costs more than a missing one.
7. GUESSING GAMES MUST BE HARD. No clue may name the answer, the role, the location or the emotion. Every character statement must plausibly fit at least two roles. Every clue must carry an obvious hint AND a deliberate red herring in the same line. The dangerous roles must sound helpful, never villainous.

=== REQUIRED JSON SHAPE ===
{
  "meta": { "title": string, "cefr": "${cefr}", "topic": string, "l1": "${l1}", "narratorHint": string },
  "grid": [ 64 x {
    "cell": 1-64, "difficulty": "easy|medium|hard", "skill": string, "grammarPoint": string,
    "type": "mcq|multi|tf", "prompt": string, "passage": string (optional),
    "script": [ {"speaker": string, "voice": "m|f|n", "line": string} ] (optional),
    "options": [string], "answer": [index numbers], "hint": string, "lesson": { ...as above... } } ],
  "speedReader": [ 6 x { "title": string, "text": 45-70 words, "targetWpm": number, "watchWords": [string] } ],
  "pictionary": [ 24 x { "word": string, "category": string, "hint": string } ],
  "conceptLink": [ 8 x { "clues": [5 emoji], "answer": string, "accept": [string], "hints": [3 strings], "explain": string naming the red herring } ],
  "translationTrap": [ 8 x { "l1": sentence in ${l1}, "literal": the word-for-word version, "natural": [1-2 natural English versions], "why": string, "focus": grammar point } ],
  "forbidden": [ 10 x { "question": a trap question, "banned": ["yes","no","maybe", plus the hedges this question invites], "trap": why it is hard, "model": a model answer that avoids every banned word } ],
  "alibi": [ 5 x { "scene": string, "crime": string, "facts": [4 facts], "language": target grammar,
      "questions": [4 interrogation questions],
      "suspects": [5 x { "name": string, "job": string, "alibi": 2-3 sentences of natural speech }],
      "liar": index 0-4, "contradiction": the exact clash with the facts } ],
  "keepTalking": [ 8 x { "topic": string, "seconds": 80-100, "tasks": [5 language tasks] } ],
  "sentiment": [ 10 x { "line": string, "emotion": string, "coach": prosody coaching note } ],
  "spyfall": [ 6 x { "name": location, "emoji": string, "roles": [8 x {"role": string, "prompt": string}], "starters": [3 questions] } ],
  "mafia": [ 5 x { "title": string, "hidden": the hidden side's name, "flavour": string,
      "cast": [8 x { "n": name, "role": string, "s": statement that fits at least two roles, "tell": string (only for some), "rank": 1|2|3 }],
      "culprits": [exactly 2 indexes], "report": why the round played out as it did } ],
  "sell": [ 10 x { "item": string, "twist": string, "reserve": 30-80 } ],
  "missions": [ 12 x { "mission": string, "reveal": string, "language": functional area } ],
  "story": [ 6 x { "opener": string, "vocab": [5 words], "twist": string } ],
  "debate": [ 6 x { "motion": string, "hook": string, "heat": 1|2|3, "context": string,
      "forArguments": [3 x {"claim","evidence","language"}], "againstArguments": [3 x {"claim","evidence","language"}],
      "vocabulary": [4 x {"word","meaning","example"}], "frames": [3 x {"function","phrases":[..]}],
      "followUps": [3 questions], "curveball": string, "media": [] } ]
}

=== STYLE ===
Write like a warm, quick-witted teacher who has taught adults for twenty years. Adult humour, adult topics, zero childishness, zero clichés about "Mr Smith goes to the bank". Use real names from many cultures. Keep every sentence speakable: this content is read aloud to a room.

Now read the lesson material below and produce the JSON.

--- LESSON MATERIAL BELOW THIS LINE ---`;
}
