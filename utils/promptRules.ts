/**
 * Rules shared by every "Copy AI Prompt" in the platform.
 *
 * The single most common failure of AI-authored multiple choice is that the
 * correct option is the longest / most detailed one, so a learner scores well
 * without reading the question. Every prompt that can produce options embeds
 * this block (or the short form) so the model actively defends against the cue.
 *
 * Kept dependency-free and as plain strings so the Lesson Creator prompts and
 * the individual studios (classmate, kids flipbook, quiz) can share the exact
 * same wording.
 */

export const ANSWER_LENGTH_ANTI_CUE_RULE = `
--- ✍️ ANSWER-LENGTH ANTI-CUE RULE (MANDATORY — APPLY IT TO EVERY MULTIPLE CHOICE ITEM) ---
The most common way AI-written multiple choice becomes guessable: the correct option is simply the longest, most detailed, most specific one, so learners pick it without reading or thinking. This is FORBIDDEN — it is the number-one thing you must police in your own output.
For EVERY item that has an option list and one correct choice (quiz, comprehension question, cloze, listening/reading question, tap-the-answer, mock-test question):
1. LENGTH BALANCE — every option must be within ±2 words of the others, and no option may be more than ~1.4× longer than the shortest option (count words, not characters).
2. THE LONGEST OPTION MUST NEVER BE THE CORRECT ANSWER. If your correct option turns out to be the longest, fix it: shorten the correct option, or lengthen the distractors until at least one distractor is longer than the correct option.
3. NO DETAIL CUE — the correct option must not be the only option carrying a number, a date, a proper name, a comma, a subordinate clause ("…, which …"), or extra qualifying detail. Distractors must have exactly the same shape and level of detail as the correct option: same part of speech, same topic family, same abstraction level.
4. NO POSITION CUE — rotate where the correct answer sits; it must never land at the same index twice in a row, and across the set every position should be used roughly evenly.
5. NO LEXICAL ECHO — the correct option must not repeat keywords from the question stem more than the distractors do, and must never be the only option containing a keyword from the question.
6. SELF-CHECK BEFORE YOU RETURN (silently, for every single item, and fix any that fails): re-read the options and answer three questions — (a) are all options within ±2 words of each other? (b) is the correct answer NOT the longest and NOT the most detailed? (c) is the correct index rotating? If any answer is "no", rewrite that item before outputting. Never output an item you have not checked this way.
7. If an item cannot be balanced without becoming unfair or ambiguous, rewrite the question itself (shorter correct answer, richer but equally detailed distractors) — never leave a giveaway in place.
`;

export const ANSWER_LENGTH_ANTI_CUE_RULE_SHORT = `ANSWER-LENGTH ANTI-CUE RULE (MANDATORY): every option must be within ±2 words of the others and carry the same level of detail; the correct option must NEVER be the longest, the most detailed, or the only one with a number, name, comma or extra clause, and it must not echo question keywords more than the distractors do. Rotate the correct position across items. Silently self-check every item before returning and rewrite any item whose longest option is the correct answer.`;
