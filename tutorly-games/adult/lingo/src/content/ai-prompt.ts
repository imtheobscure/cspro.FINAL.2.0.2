/**
 * Builds the copy-paste prompt that turns a source PDF into the single
 * JSON file Lingo consumes (content/tutolingo-content.json).
 *
 * The learner's L1 and their personal profile are injected first, so the agent
 * writes every translation and every example for that specific learner.
 *
 * Two things drive the quality of the app and are therefore stated as hard rules:
 * the file must cover 100% of the source document, and nothing in it may repeat —
 * every exercise, example and mini lesson is one-of-a-kind.
 */
export interface PromptOptions {
  /** ISO code of the learner's first language, when it is a known language. */
  l1: string;
  l1Name: string;
  /** Language being learned. */
  targetLanguage: string;
  /** Free-text learner profile. */
  learnerInfo: string;
  /** Name of the source document (book / chapter / PDF). */
  sourceName: string;
  level: string;
}

export const DEFAULT_TARGET_LANGUAGE = "English";

export function buildContentPrompt(opts: PromptOptions): string {
  const l1Name = opts.l1Name || opts.l1;
  const learner = opts.learnerInfo.trim() || "No extra learner details were provided — keep examples general but natural.";
  const source = opts.sourceName.trim() || "the attached source document";
  const level = opts.level.trim() || "the level taught by the source document";
  const t = opts.targetLanguage;

  return `# ROLE
You are an expert curriculum engineer, corpus linguist and pedagogical content designer. You read a source PDF (coursebook, unit, grammar book, textbook chapter or any teaching material) and convert it into ONE single, complete, machine-readable JSON file for the language-learning app "Lingo". The app renders every activity in the user interface in ENGLISH; all *learner-facing explanations and translations* must be in the learner's first language (L1) given below.

# LEARNER CONTEXT (personalise the coaching, never the graded questions)
- Learner's first language (L1): ${l1Name}${opts.l1 ? ` (ISO code: ${opts.l1})` : " (written out by the learner — use it as given)"}
- Language being learned (target language): ${t}
- Target level: ${level}
- Learner profile: ${learner}

PERSONALISATION IS CONFINED TO THE COACHING LAYER — this is a hard rule, not a preference.
- The learner profile may shape ONLY: every "feedback" block ("meaning", "form", "use", "ccq", "tip"), every "example" sentence ("example.target" / "example.native" on vocabulary and idioms) and every "feedback.examples" line. There, be as personal as you like: their age, interests, job, goals and exam targets.
- The GRADED material must stay neutral, universal and reusable: "sentences[]", "conversations[].turns[]", grammar "exercises[]" and every entry of every "activities" bank ("fillBlank", "reorder", "typeHear", "speak", "listenSelect", "tapComplete", "matchPairs"). No learner name, no "your job", "your city", "your exam", no situation that only makes sense for this one person.
- Why: those strings are the questions the learner is marked on, the audio they must transcribe and the words they must re-order. A personalised question is a question nobody else can practise, and it makes the same lesson unusable on a second run. Personalise the *why* and the *when* (the feedback), never the sentence the learner has to answer.

# SOURCE MATERIAL — THIS IS THE ONLY SOURCE OF TRUTH
- Source document: ${source}
- Cover 100% of the material in that document. Nothing may be skipped.
- You are TRANSCRIBING AND STRUCTURING THE ATTACHED DOCUMENT, not writing a textbook. Every item in the JSON must be traceable to a specific place in that file.
- Use NO outside knowledge: do not add vocabulary, rules, idioms or dialogues that the document does not contain, even if you know them well or think they would be useful. If it is not in the file, it does not go in the JSON.
- Every item you output must carry a "sourceRef" (where in the file it came from) AND a "sourceQuote" (the exact words copied from the file that the item is built on). Copy these character-for-character in the source language — do not translate, paraphrase, tidy up or reconstruct them.
- If you cannot quote the file for an item, that item must not be in the JSON.

# ABSOLUTE OUTPUT RULES
1. Output ONE single JSON file. No markdown, no code fences, no commentary, no explanation before or after. The first character of your answer must be "{" and the last must be "}".
2. The JSON must be syntactically valid at all times: double-quoted keys and strings only, no comments, no trailing commas, no smart quotes, no ellipses. Escape internal quotes and newlines.
3. Do not sample, summarise, abbreviate, deduplicate aggressively or write "…etc.". Enumerate EVERY vocabulary item, EVERY grammar point, EVERY idiom/expression, EVERY dialogue and EVERY sentence group the document contains. Quantity is part of the task.
4. Use all of your available output tokens. If the document is long, keep going until the whole document is covered. Do not stop early, do not ask questions, do not offer a plan — produce the file. If you sense you are running out of room, compress your wording (short strings) instead of dropping items: NEVER drop an item.
5. Include ONLY the content types that actually exist in the document. If there is no grammar (or no idioms, or no conversations), simply omit that key or set it to [] — never invent material to fill a section, and never leave a key with placeholder junk.
6. Never invent facts that are not in the source document. You may add short pedagogical scaffolding (a definition wording, a natural example sentence, a translation) but the underlying items must come from the document. Scaffolding must stay faithful to the document's own wording, register and level — it may not introduce a new topic, a new rule or a new word list.
6a. GROUNDING IS MANDATORY: each vocabulary item, grammar point, idiom, conversation and sentence must include a non-empty "sourceQuote" copied verbatim from the attached file plus a "sourceRef" locating it. An item without both is invalid and must be removed rather than guessed.
7. The meaning of every item must respect the source document's wording, register and level.
8. All translations and explanations ("native", "translation", "nativeRule", "nativeMeaning", "nativeNote" and every "feedback" field) must be in ${l1Name}. All "target" fields and all mini-lesson "examples" must be in ${t}.
9. Provide integer-free stable ids: "v1, v2, …" for vocabulary, "g1, …" grammar, "i1, …" idioms, "c1, …" conversations, "s1, …" sentences.
10. If the source document is longer than one response, prioritise completeness of the sections in this order: vocabulary → grammar → idioms/expressions → conversations → sentences, and never truncate an item mid-way. Every item must be complete.
11. ANSWER-LENGTH ANTI-CUE RULE (mandatory for EVERY option set you write — grammar "exercises", "fillBlank" and "listenSelect" banks): a learner must never be able to score by picking the longest option.
    • All options in one item must be within ±2 words of each other and carry the same level of detail (count words, not characters).
    • THE LONGEST OPTION MUST NEVER BE THE CORRECT ONE. If the correct answer is the longest, shorten it or lengthen the distractors until at least one distractor is longer.
    • The correct option must not be the only one with a number, a name, a comma, a subordinate clause or extra qualifying detail, and must not echo words from the prompt more than the distractors do.
    • Every distractor must be equally plausible and come from the same topic/word family as the correct answer.
    • Rotate the position of the correct answer across items — it must never sit at the same index twice in a row.
    • SILENTLY SELF-CHECK EVERY ITEM BEFORE RETURNING, and rewrite any item whose longest option is the correct one. An item you have not checked must not be in the file.

# NON-REPETITION — THE HARDEST RULE IN THIS PROMPT
The app turns your file into a long run of graded exercises (including unscramble/word-order, listening, dictation, gap-fill, speaking and timed quizzes) and it reads each sentence as a DIFFERENT question. Two identical sentences therefore become two identical questions — which is exactly what must never happen again.

Rules that are checked before you return:
1. UNIQUE PRODUCTION — one sentence, one question. No sentence, question prompt, option set or example sentence may appear twice ANYWHERE in the file, in any section, at any level. Before you finish, search your own output and delete every duplicate.
2. Every vocabulary item, every idiom, every grammar point and every conversation must have its OWN example lines. Never reuse one example for two items, even if both could use it: write a new sentence with a different subject, time, place, verb or register.
3. Per item, write MORE than one usable sentence: at least 3 unique example sentences for every vocabulary item and idiom (one of them inside "example", the rest inside "feedback.examples"), at least 3 for every grammar point, and at least 1 unique shorter variation for each remaining exercise you generate.
4. The banks under "activities" must each contain only sentences that appear nowhere else in the file, and no two entries inside one bank may share a sentence. If the document gives you one sentence, write additional unique variations of it (same target item, fresh wording).
5. Unscramble/reorder material must differ from the listening material, which must differ from the dictation material. Never feed the same string to two exercise types.
6. A "hint" must NEVER be the same text as the item's "native" translation and must never give the answer away: it adds new information (the verb form, the collocation, the first letter of the missing word, a grammar cue).
7. Do not pad with paraphrases that only swap one synonym: a variation is "new" only when its meaning situation changes (who, where, when, why).
8. ONE LESSON, ALL-DIFFERENT QUESTIONS — the rule that decides whether the course feels varied: inside one lesson the app asks every activity kind twice, so a lesson must be able to draw on at least 8 distinct sentences, 8 distinct vocabulary items and 8 distinct grammar exercises. Walk the seven lessons of each unit before you finish (New Words = first half of the vocabulary + first half of the sentences; Grammar Point; Listening & Speaking = conversations + second half of the sentences; More Words = second half of the vocabulary; Idioms; Grammar in Action; Unit Review). If any one of them would have to ask the SAME sentence under two different activity kinds, that unit is under-filled — go back and write more distinct sentences for it. Recycling a word across activities is exactly what you should do; recycling the same sentence as the answer to two different activities is the failure this prompt exists to prevent.
9. Report your own audit in meta.coverage: "distinctSentences" (how many different sentences the file contains in total) and "duplicatesRemoved" (how many you found and fixed while self-checking).

# VOLUME — AIM HIGH
The value of this file is its depth: 5× more usable material than the minimum a reader would expect, all of it still traceable to the document.
- Use these as the FLOOR for every chapter/unit of the document (not the target — the target is “everything the document holds, expanded as far as the document's own wording allows”):
  • vocabulary: 20+ items per chapter, each with term, definition, translation, pronunciation, collocations, synonyms/antonyms where the document supports them, one example AND a full feedback block with 3 more examples.
  • grammar: 6+ points per chapter, each with rule, nativeRule, structure, 3+ examples and 8+ exercises (all four options each).
  • idioms/expressions: 10+ entries per chapter, each with meaning, nativeMeaning, literalMeaning, usageNotes, register, example and a feedback block.
  • conversations: 8+ dialogues per chapter, each with 8+ turns, keyPhrases and a feedback block on every turn.
  • sentences: 60+ standalone sentences per chapter, each with translation, sourceRef and sourceQuote.
- Quantity never excuses quality: every added item must be graded, natural, level-appropriate and used exactly once.
- Never write filler rows (dash placeholders, empty strings, "TODO", repeated ids). Fill every field you emit; if you genuinely cannot fill a field, omit the field rather than emit junk.
- The app also builds timed quizzes (word → meaning, meaning → word, gap-fill, listening; and “best reply” / “reorder the conversation” games) directly from vocabulary, idioms and conversations. The more distinct, well-formed items you provide, the more questions those quizzes can ask — so breadth here pays off twice.

# MINI LESSON — "feedback" ON EVERY ITEM
Every vocabulary item, idiom, grammar point and sentence/dialogue line carries a "feedback" object. The app shows it right after the learner answers: no heading, no title — the content itself teaches, so write it as a short, warm lesson in ${l1Name}, in the voice of a great private tutor.
"feedback": {
  "meaning": "<what it means, in ${l1Name}. 2–3 full sentences. Plain words, no dictionary-speak, no repeating the definition verbatim.>",
  "form": "<HOW it is built, in ${l1Name}: spelling, pronunciation, part of speech, word order, conjugation or the structure it slots into. 2–3 sentences. Mention what to watch out for.>",
  "use": "<WHERE, WHEN and HOW this specific learner will actually use it in their own life, in ${l1Name}: a concrete situation, a real conversation they will have, who they are talking to, and how common it is. 2–3 sentences, personal to the learner profile above.>",
  "examples": ["<3 to 4 UNIQUE ${t} sentences, each from a different situation, none of them copied from example.target, each 5–12 words>"],
  "ccq": "<ONE question in ${t} that the learner answers OUT LOUD with at least one full sentence, to prove they understand — a real speaking prompt, not a definition request and not answerable with a bare yes/no>",
  "tip": "<one short practical tip in ${l1Name} — the single thing to remember>"
}
Rules for the mini lesson:
- It replaces the old short "nativeNote" style. Keep "nativeNote" if you like, but "feedback" is what the learner reads.
- Never leave any of meaning/form/use empty, never write "N/A", never reuse another item's sentences, never repeat the same wording across two items' feedback blocks.
- Write it as prose the learner wants to read: warm, specific, no filler, no headings inside the strings, at most one emoji-free line each.
- The CCQ is the speaking practice. Make it about the learner's real life ("What did you put in your bag for your next trip?"), not about the word itself.

# CONTENT MODEL — map the document onto exactly these five sections
1. "vocabulary" — every new word, phrase or lexical chunk taught in the document.
2. "grammar" — every rule, structure, tense or pattern explained in the document, each with exercises derived from the document's own examples plus natural variants.
3. "idioms" — idioms, phrasal verbs, collocations, proverbs, slang and fixed expressions present in the document (use "type" to classify).
4. "conversations" — every dialogue, role-play, model conversation or scripted exchange in the document.
5. "sentences" — every remaining notable example sentence, exercise sentence, reading line or drill sentence in the document that is not already inside the four sections above, so nothing is lost.

# TUTOLINGO ACTIVITY MAPPING (the app's player supports exactly these activity kinds)
- "match": pairs of target-language item ↔ its meaning/translation  → driven by "vocabulary" and "idioms".
- "select_translation": pick the correct target-language word for a meaning (or the meaning of a word) → driven by "vocabulary" and "idioms".
- "fill_blank": a sentence from the document with one word removed and four options → driven by "vocabulary" examples and grammar exercises.
- "type_hear": listen to a sentence and type it → driven by "sentences" and "conversations".
- "reorder": put the shuffled words of a sentence back in order → driven by "sentences" and "conversations".
- "listen_select": hear a word/sentence and choose it from options → driven by "vocabulary", "sentences".
- "speak": read a sentence out loud (speech recognition) → driven by "sentences", "conversations" and vocabulary chunks.
- "tap_complete": grammar tap-the-correct-option exercise → driven by "grammar.exercises".
So: every vocabulary item needs a meaning + a natural sentence, every grammar point needs at least 4 exercises with options, every idiom needs a meaning + an example, and every conversation needs turn-by-turn lines. That is what makes the eight activity kinds above possible.
Optional: you may additionally supply an "activities" object with explicit activity banks ("matchPairs", "fillBlank", "reorder", "listenSelect", "typeHear", "speak", "tapComplete") when you want to control a specific exercise exactly as it should appear. Everything in those banks must obey the non-repetition rules above.

# HOW THE APP TURNS YOUR FILE INTO LESSONS — READ THIS BEFORE YOU WRITE ANYTHING
The app does not show your file as a book. It cuts it into a course and then builds exercises from your arrays, so the SIZE and the ORDER of those arrays decide whether a lesson is varied or repetitive.

1. The pack is split into units of roughly 56 items (one contiguous slice of every array per unit), and each unit into SEVEN lessons, in this fixed order:
   1. "New Words"  → the FIRST half of the unit's "vocabulary" + the FIRST half of the unit's "sentences"
   2. "Grammar Point" → the FIRST half of the unit's "grammar"
   3. "Listening & Speaking" → the unit's "conversations" + the SECOND half of the unit's "sentences"
   4. "More Words" → the SECOND half of the unit's "vocabulary"
   5. "Idioms & Expressions" → the unit's "idioms"
   6. "Grammar in Action" → the SECOND half of the unit's "grammar"
   7. "Unit Review" → everything the unit holds, revisited
2. A lesson runs 8–16 exercises drawn from the eight activity kinds (match, select_translation, fill_blank, listen_select, type_hear, reorder, speak, tap_complete). A 16-exercise lesson therefore asks every kind TWICE.
3. Each kind reads ONE pool: match/select_translation/listen_select read "vocabulary" and "idioms"; fill_blank reads the "example" sentence of each vocabulary item and the "fillBlank" bank; type_hear, reorder and speak read "sentences", "conversations" and their own banks; tap_complete reads "grammar.exercises" and the "tapComplete" bank.
4. The app walks those pools BY INDEX inside the lesson and wraps around when it runs out.

THE CONSEQUENCE — AND THE FAILURE TO PREVENT: if a unit carries one sentence, the five sentence-driven activities in one lesson ask that same sentence five times, and the second pass asks it five more. A lesson must therefore never be able to run out of material.

# PER-LESSON COVERAGE — MANDATORY FLOORS PER UNIT (count them, do not estimate)
Every array must be written IN UNIT BLOCKS: all items of a unit next to each other, in document order, so a unit's slice is coherent and each half of it works as a lesson on its own.
- "sentences": **40+ distinct sentences per unit** (so each half — lesson 1 and lesson 3 — has 20+). Each one 5+ words, complete, natural, on the unit's topic, and none of them repeated anywhere else in the file.
- Each of these banks: **16+ entries per unit**, every entry a DIFFERENT sentence from the others and from "sentences": "fillBlank", "reorder", "typeHear", "speak", "listenSelect", "tapComplete".
- "vocabulary": **24+ per unit**, and EVERY item needs its own "example.target" — a full sentence that actually CONTAINS the term, because fill_blank blanks that term out. Two vocabulary items may never share an example sentence.
- "grammar": **6+ per unit**, each with **8+ exercises** whose prompts are all different sentences (a grammar lesson will ask several of them back to back).
- "idioms": **12+ per unit**, each with its own "example" sentence, none shared with another idiom.
- "conversations": **4+ per unit**, 8+ turns each, and no turn may be re-used as an item in "sentences" or in a bank.
- If the source document cannot fill these floors on its own, expand WITHIN its topic and its own wording (new sentences built from the vocabulary and grammar it teaches). Never pad with filler, and never repeat a line to reach a count.
- These are FLOORS per unit, not totals for the whole file: a 10-unit pack needs 400+ distinct sentences, 160+ entries in each bank, and so on. The "VOLUME" section below is a floor for the whole document; this section is a floor for every single unit.

# EXACT JSON SCHEMA (follow keys, nesting and types precisely)
{
  "meta": {
    "app": "Lingo",
    "version": "2.0",
    "sourceDocument": "${source}",
    "l1": "${opts.l1}",
    "l1Name": "${l1Name}",
    "targetLanguage": "${t}",
    "level": "${level}",
    "learnerProfile": "<copy of the learner profile above>",
    "theme": "<overall theme of the document>",
    "createdAt": "<ISO date>",
    "coverage": {
      "pagesProcessed": "<number or range of the source document>",
      "sectionsCovered": ["<every chapter/unit/section you processed>"],
      "vocabularyCount": 0,
      "grammarCount": 0,
      "idiomCount": 0,
      "conversationCount": 0,
      "sentenceCount": 0,
      "distinctSentences": 0,
      "duplicatesRemoved": 0,
      "sentencesPerUnit": ["<unit label: how many distinct sentences that unit block holds>"],
      "smallestBankPerUnit": 0,
      "lessonsThatWouldRepeat": 0,
      "omissions": ["<anything in the document you could not convert, with a reason — use an empty array if nothing was omitted>"]
    }
  },
  "vocabulary": [
    {
      "id": "v1",
      "term": "<the word or chunk in ${t}>",
      "pos": "<part of speech>",
      "level": "<A1|A2|B1|B2|C1|C2>",
      "pronunciation": "<IPA if the document provides one, else \\"\\">",
      "definition": "<simple definition in ${t}>",
      "translation": "<translation in ${l1Name}>",
      "nativeNote": "<optional short note in ${l1Name}>",
      "example": { "target": "<personalised example sentence>", "native": "<translation of that sentence in ${l1Name}>" },
      "feedback": {
        "meaning": "<2–3 sentences in ${l1Name}>",
        "form": "<2–3 sentences in ${l1Name} about spelling, pronunciation, grammar, word order>",
        "use": "<2–3 sentences in ${l1Name}, personal to this learner, concrete real-life situations>",
        "examples": ["<${t} example 1>", "<${t} example 2>", "<${t} example 3>"],
        "ccq": "<one ${t} speaking question with a full-sentence answer>",
        "tip": "<one short tip in ${l1Name}>"
      },
      "collocations": ["<typical collocations>"],
      "synonyms": ["<synonyms>"],
      "antonyms": ["<antonyms>"],
      "unit": "<chapter / unit label from the document>",
      "sourceRef": "<page number, exercise number or section title>",
      "sourceQuote": "<verbatim words copied from the document that teach this word — never translated, never paraphrased>",
      "tags": ["<topic tags, e.g. travel, work>"]
    }
  ],
  "grammar": [
    {
      "id": "g1",
      "title": "<grammar point title>",
      "level": "<CEFR level>",
      "rule": "<the rule explained in ${t}>",
      "nativeRule": "<the same rule explained in ${l1Name}>",
      "structure": "<formula, e.g. Subject + base verb (+s/es)>",
      "examples": [ { "target": "<example>", "native": "<translation in ${l1Name}>" } ],
      "commonMistakes": ["<typical learner errors, ideally in ${l1Name} if the document mentions them>"],
      "feedback": {
        "meaning": "<what this pattern expresses, 2–3 sentences in ${l1Name}>",
        "form": "<how to build it step by step, 2–3 sentences in ${l1Name}>",
        "use": "<where this learner will use it in their own life, 2–3 sentences in ${l1Name}>",
        "examples": ["<3 unique ${t} sentences showing the pattern>"],
        "ccq": "<one ${t} speaking question the pattern answers>",
        "tip": "<one short tip in ${l1Name}>"
      },
      "exercises": [
        {
          "type": "multiple_choice",
          "prompt": "<a sentence or question, with ___ for the gap when a gap is needed>",
          "options": ["<4 options>"],
          "answer": "<the correct option, exactly as written in options>",
          "explanation": "<why, in ${t}>",
          "nativeExplanation": "<why, in ${l1Name}>"
        }
      ],
      "unit": "<unit label>",
      "sourceRef": "<page/exercise>",
      "sourceQuote": "<verbatim rule/sentence copied from the document that teaches this grammar point>",
      "tags": ["<tags>"]
    }
  ],
  "idioms": [
    {
      "id": "i1",
      "expression": "<idiom / phrasal verb / collocation in ${t}>",
      "type": "<idiom|phrasal_verb|collocation|proverb|slang|expression>",
      "meaning": "<meaning in ${t}>",
      "literalMeaning": "<word-by-word literal reading>",
      "nativeMeaning": "<equivalent meaning in ${l1Name}>",
      "nativeNote": "<optional short note in ${l1Name}>",
      "example": { "target": "<personalised example>", "native": "<translation in ${l1Name}>" },
      "feedback": {
        "meaning": "<2–3 sentences in ${l1Name}>",
        "form": "<2–3 sentences in ${l1Name} about how the expression is built and what can change inside it>",
        "use": "<2–3 sentences in ${l1Name}: who says this, in which situation, how formal it is, and when this learner will hear or say it>",
        "examples": ["<3 unique ${t} sentences in different situations>"],
        "ccq": "<one ${t} speaking question>",
        "tip": "<one short tip in ${l1Name}>"
      },
      "register": "<formal|neutral|informal|slang>",
      "usageNotes": "<when and how to use it>",
      "unit": "<unit label>",
      "sourceRef": "<page/exercise>",
      "sourceQuote": "<verbatim line copied from the document where this expression appears>",
      "tags": ["<tags>"]
    }
  ],
  "conversations": [
    {
      "id": "c1",
      "title": "<conversation title>",
      "setting": "<where/when the conversation happens>",
      "level": "<CEFR level>",
      "goal": "<what the learner practises here>",
      "nativeSummary": "<one-line summary in ${l1Name}>",
      "turns": [
        {
          "speaker": "A",
          "name": "<speaker name or role>",
          "target": "<line in ${t}>",
          "native": "<line in ${l1Name}>",
          "feedback": {
            "meaning": "<what this line does in the exchange, 1–2 sentences in ${l1Name}>",
            "form": "<the pattern being used, 1–2 sentences in ${l1Name}>",
            "use": "<when this learner would say this exact line, 1–2 sentences in ${l1Name}>",
            "examples": ["<2 different ${t} lines that could replace it>"],
            "ccq": "<one ${t} question the learner answers out loud, continuing the exchange>",
            "tip": "<one short tip in ${l1Name}>"
          }
        },
        { "speaker": "B", "name": "<speaker name or role>", "target": "<line in ${t}>", "native": "<line in ${l1Name}>" }
      ],
      "keyPhrases": [ { "target": "<useful chunk>", "native": "<translation in ${l1Name}>" } ],
      "sourceRef": "<page/section>",
      "sourceQuote": "<verbatim first line(s) of the dialogue copied from the document>",
      "tags": ["<tags>"]
    }
  ],
  "sentences": [
    {
      "id": "s1",
      "target": "<sentence in ${t}>",
      "native": "<translation in ${l1Name}>",
      "feedback": {
        "meaning": "<1–2 sentences in ${l1Name}>",
        "form": "<1–2 sentences in ${l1Name} about the structure used>",
        "use": "<1–2 sentences in ${l1Name}: when this learner will say or hear this line>",
        "examples": ["<2 unique ${t} variations>"],
        "ccq": "<one ${t} speaking question>",
        "tip": "<one short tip in ${l1Name}>"
      },
      "sourceRef": "<page/exercise>",
      "sourceQuote": "<the sentence exactly as it appears in the document>",
      "tags": ["<tags>"]
    }
  ],
  "activities": {
    "matchPairs": [ { "pairs": [ { "target": "<item>", "native": "<translation in ${l1Name}>" } ], "sourceRef": "<page>" } ],
    "fillBlank": [ { "sentence": "<sentence with ______>", "answer": "<the missing word>", "options": ["<4 options>"], "native": "<sentence translation in ${l1Name}>" } ],
    "reorder": [ { "sentence": "<target-language sentence>", "native": "<translation in ${l1Name}>" } ],
    "listenSelect": [ { "prompt": "<word or sentence>", "answer": "<the correct option>", "options": ["<4 options>"], "native": "<translation in ${l1Name}>" } ],
    "typeHear": [ { "sentence": "<sentence to dictate>", "native": "<translation in ${l1Name}>" } ],
    "speak": [ { "sentence": "<sentence to read aloud>", "native": "<translation in ${l1Name}>" } ],
    "tapComplete": [ { "prompt": "<gap sentence with ___>", "options": ["<4 options>"], "answer": "<correct option>", "explanation": "<why>", "native": "<translation in ${l1Name}>" } ]
  }
}

# QUALITY CHECKLIST — verify before you finish
- Every vocabulary item has: term, definition, translation in ${l1Name}, example.target AND example.native, and a COMPLETE feedback block (meaning, form, use, 3+ unique examples, ccq, tip).
- Every grammar point has: rule, nativeRule, at least 3 examples with "native", at least 8 exercises with 4 options each and a matching "answer", plus a complete feedback block.
- Every idiom has: meaning, nativeMeaning, an example with "native", and a complete feedback block.
- Every conversation has at least 8 turns, each with target + native (feedback blocks on the lines that teach something).
- No empty strings where content is expected; no duplicated ids; valid JSON; one single object at the root.
- meta.coverage counts match the real array lengths, and "distinctSentences" matches the number of different sentences you actually wrote.
- GROUNDING: every vocabulary item, grammar point, idiom, conversation and sentence has a non-empty "sourceRef" AND "sourceQuote", and each "sourceQuote" is copied verbatim from the attached file (not invented, not translated).
- NO REPETITION: you have re-read your own output and there is not one repeated sentence, prompt, option set or feedback example anywhere in the file. Delete duplicates instead of returning them.
- PER-LESSON COVERAGE: every unit holds 40+ distinct sentences, 16+ entries in each activity bank, 24+ vocabulary items (each with its own example sentence), 6+ grammar points with 8+ exercises and 12+ idioms — so that all seven lessons of that unit, and both passes of every activity kind inside them, ask different questions.
- PERSONALISATION PLACEMENT: personalisation appears ONLY in "feedback" blocks and in "example" / "feedback.examples" lines. The graded sentences, dialogue turns, grammar exercises and activity banks are neutral and reusable.
- NO OUTSIDE CONTENT: if you imagine closing the file, your JSON should still be a complete, faithful index of that file and nothing more.
- Nothing from the source document is left out (or it is listed in meta.coverage.omissions).
- Every learner-facing translation and every feedback field is in ${l1Name}; every target sentence and every feedback example is in ${t}.

# FINAL INSTRUCTION
Three passes, in this order, before you answer:
1. INTERNAL INVENTORY — list the document's sections, pages and exercise numbers and count the items you must cover.
2. BUILD — write the complete, single, valid JSON object, at the volume targets above, with a full feedback block on every item.
3. SELF-AUDIT AND REWRITE — scan what you wrote for (a) any sentence used twice, (b) any missing feedback field, (c) any option set where the longest option is correct, (d) any section of the document you have not converted, (e) any unit whose sentence or bank pools fall below the per-unit floors — those are the units where one lesson would ask the same sentence under six different activities, (f) any learner-specific wording that escaped into a graded sentence, dialogue turn, grammar exercise or activity bank. Fix every one of them, then output only the corrected JSON.
`;
}

export const CONTENT_FILE_PATH = "content/tutolingo-content.json";
