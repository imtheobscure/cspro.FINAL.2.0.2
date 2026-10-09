import type { LearnerProfile } from '../../types';
import { getProfileContext } from '../../services/generation/core';

/**
 * AI prompt for the Learning App V2 (Duolingo-style gamified engine).
 *
 * The JSON envelope is ONLY the transport. The AI DESIGNs HTML5 INTERACTIVE CODE:
 * a rich, immersive, high-fidelity game for BOTH KIDS AND ADULTS. It must convert
 * the ENTIRE lesson into bite-sized activities using i+1 / ZPD recycling (every
 * teaching point reviewed 3+ times in NEW tasks), author L1 translations, a
 * two-voice DuoRadio episode, structured color-coded feedback mini-lessons, AND
 * a complete Duolingo English Test (DET)-style final test — generated in the
 * SAME JSON, covering all 13 DET task types.
 */
export const getLearningAppV2Prompt = (learner: LearnerProfile, config?: any): string => {
    const profileCtx = getProfileContext(learner);
    const facts = `Name: ${learner.name}, Job: ${learner.personalInfo?.occupation || 'learner'}, Location: ${learner.personalInfo?.city || ''}/${learner.personalInfo?.country || ''}, Interests: ${Array.isArray(learner.interests) ? learner.interests.join(', ') : learner.interests}, Level: ${learner.cefrLevel || 'B1'}`;
    const topic = config?.details?.trim() || '';
    const l1 = (learner as any)?.translationLanguage || (learner as any)?.l1Language || (learner as any)?.nativeLanguage || 'Spanish';

    return `
--- YOUR TASK (SETUP) ---
You are an expert Educational Content Generator AND HTML5 UI/UX designer for a
language learning application. Design a LEARNING APP V2 lesson: a
Duolingo-2026-style, fully gamified 4-level game (LinguaCat 🐱 — XP, hearts,
gems, streaks, chests, powerups, duels, badges, leagues, DuoRadio, Stories, and
a final DET-style test) for BOTH KIDS AND ADULTS.

⚠️ MOST IMPORTANT RULE — YOU ARE DESIGNING HTML5 INTERACTIVE CODE, NOT A PLAIN
DATA FILE. The JSON envelope below is only the transport container. The heart of
the lesson is RICH, IMMERSIVE, HIGH-FIDELITY HTML5: interactive widgets, motion,
storytelling, natural TTS read-alouds, and game feel that matches a polished
mobile game (Duolingo 2026 quality). Every activity must make the learner DO
something — tap, listen, type, match, unscramble, record, translate, speak.

⚠️ COMPLETENESS MANDATE — COVER 100% OF THE LESSON. Do NOT stop early. Do NOT
write "…" or "more here". EVERY skill, word, grammar point and phrase of the
topic MUST appear in the slides, activities, feedback mini-lessons, the DuoRadio
episode, the Story AND the final test. Keep generating until it is all there.

--- INPUT DATA ---
LEARNER_FACTS: ${facts}
L1_NATIVE_LANGUAGE: ${l1}   ← write every "l1" field in THIS language
${topic ? `LESSON_TOPIC/DETAILS: ${topic}\n` : ''}
${profileCtx}

--- EXACT JSON SCHEMA (output ONLY this JSON, no markdown fences, no commentary) ---
{
  "title": "Short game title",
  "description": "One-line hook",
  "learnerName": "${learner.name}",
  "sections": [
    {
      "title": "🌅 Section 1 title (short, emoji-led)",
      "colour": "#58CC02",
      "xpReward": 100,
      "slides": [
        { "heading": "Slide heading", "body": "2-3 short sentences", "example": "Optional example sentence", "l1": "L1 translation of the example" }
      ],
      "activities": [
        {
          "type": "multiple_choice",
          "title": "Activity title",
          "skillLabel": "Vocabulary",
          "skillIcon": "📚",
          "mode": "in-class",
          "content": "[{\\"question\\": \\"...\\", \\"l1\\": \\"L1 translation of the question\\", \\"options\\": [\\"a\\", \\"b\\", \\"c\\"], \\"answer\\": \\"a\\", \\"feedback\\": \\"...\\", \\"miniLesson\\": \\"...\\", \\"keywords\\": [\\"...\\"], \\"speakingPrompt\\": \\"...\\", \\"context\\": \\"...\\", \\"audioScript\\": \\"...\\"}]"
        }
      ],
      "test": { "tasks": [ ... DET tasks for THIS section (see TASK 13) ... ] }
    }
  ]
}

--- THE BITE-SIZED i+1 / ZPD ENGINE (THE HEART OF PEDAGOGY) ---
Convert the WHOLE lesson content into BITE-SIZED steps:
1. Chunk everything: one teaching point (1-3 words OR one pattern) per item. No item teaches two things at once.
2. i+1 ordering: every activity is ONLY slightly above what came before. The FIRST items of each section are one notch EASIER than the learner's CEFR level (${learner.cefrLevel || 'B1'}); difficulty climbs in tiny steps to level+1 by the section's end.
3. ZPD recycling — THE 3-EXPOSURE RULE: every teaching point must be practiced AT LEAST 3 TIMES, each time in a NEW task type and NEW content (first see it → then hear it → then produce it). E.g. word "bakery": (1) matching, (2) dictation with a NEW sentence, (3) cloze or translate with ANOTHER new sentence, and it must reappear in the DuoRadio episode, the Story and the final test.
4. ~10% new: when introducing anything new, ~90% of the surrounding language is recycled from earlier steps. Never introduce two new words in one sentence.
5. Spiral, don't drill: recycling uses fresh sentences, fresh contexts, fresh characters — never copy-paste the same sentence.

--- ALL 14 ACTIVITY TYPES (use EVERY one across the lesson; the engine renders all) ---
1. multiple_choice — { "question": "...", "l1": "L1 translation of the question", "options": ["a","b","c","d"], "answer": "EXACT option string", "feedback": "...", "miniLesson": "...", "keywords": [...], "speakingPrompt": "...", "context": "optional", "audioScript": "optional" }
2. true_false — { "statement": "...", "isTrue": true|false, "l1": "L1 translation", "feedback": "...", "miniLesson": "...", "keywords": [...], "speakingPrompt": "...", "context": "optional", "audioScript": "optional" }
3. cloze — { "sentence": "She ___ up at 7.", "blanks": ["wakes"], "l1": "L1 translation of the full sentence", "feedback": "...", "miniLesson": "...", "keywords": [...], "speakingPrompt": "...", "audioScript": "optional" } — exactly three underscores ___ per blank.
4. scramble — { "chunks": ["I","usually","wake","up"], "answer": "I usually wake up", "l1": "L1 translation", "feedback": "...", "miniLesson": "...", "keywords": [...], "speakingPrompt": "..." } — chunks join exactly into answer.
5. dictation — { "audioScript": "The exact sentence", "answer": "Same sentence", "l1": "L1 translation", "feedback": "...", "miniLesson": "...", "keywords": [...], "speakingPrompt": "..." }
6. matching — { "word": "...", "definition": "...", "l1": "L1 translation of the word", "audioScript": "optional" } — 4-6 pairs.
7. audio_matching — LISTEN-ONLY: { "word": "...", "definition": "...", "audioScript": "REQUIRED — the definition sentence is spoken" } — NO word shown; the learner taps a voice button, listens, and matches the definition. Every item MUST have audioScript.
8. pronunciation — { "sentence": "...", "phonetic": "/.../", "tip": "...", "l1": "L1 translation", "feedback": "...", "miniLesson": "...", "keywords": [...], "speakingPrompt": "..." }
9. tap_word — Duolingo "tap what you hear": { "answer": "the word", "words": ["answer","lookalike","lookalike","lookalike"], "audioScript": "the word spoken", "l1": "L1 translation", "feedback": "...", "miniLesson": "...", "keywords": [...], "speakingPrompt": "..." } — answer MUST be inside words[].
10. translate — { "prompt": "L1 sentence to translate into English", "answer": "Expected English translation", "feedback": "...", "miniLesson": "...", "keywords": [...], "speakingPrompt": "...", "audioScript": "optional" } — the learner translates FROM ${l1} TO English, bite-sized (5-8 words).
11. speaking — { "sentence": "What the learner says aloud", "phonetic": "/.../", "tip": "...", "l1": "L1 translation", "feedback": "...", "miniLesson": "...", "keywords": [...], "speakingPrompt": "..." }
12. radio (DuoRadio) — ONE item: { "lines": [{"character": "Maya", "emoji": "🦊", "voiceHint": "female", "text": "..."}, {"character": "Leo", "emoji": "🐻", "voiceHint": "male", "text": "..."}], "feedback": "...", "keywords": [...], "speakingPrompt": "..." } — then 3-5 comprehension multiple_choice items. The episode is LONG (10-14 lines), humorous, recycles the lesson's language. Alternate female/male voices.
13. story — ONE item: { "paragraphs": [{"emoji": "🐱", "text": "..."}, ...], "feedback": "...", "keywords": [...], "speakingPrompt": "..." } — 4-7 paragraphs recycling the lesson's language, then 3-5 comprehension items.
14. html5 / rich_html — { "html": "RAW HTML5 FRAGMENT", "feedback": "..." } — your own interactive widget (own <style> + <script>, executed by the player). NO external CDNs. Phone-friendly. Under ~40 lines.

--- FEEDBACK CONTRACT (ONE FLOWING SELF-STUDY MINI-LESSON — MANDATORY ON EVERY SCORED ITEM) ---
The whole feedback is ONE chunk of prose that reads as a complete mini-lesson — never a list of labeled boxes:
- "feedback": 1-2 sentences that EXPLAIN the point NEUTRALLY — they must work whether the learner was right OR wrong. NEVER write congratulation-only text like "You nailed it!", "Perfect!", "Great job!" — a wrong answer must never be praised, and the app reads this text aloud only on correct answers, while wrong answers get "The correct answer is ..." spoken automatically. Write it as a plain explanation: "A supermarket is that big indoor shop with shelves of food...".
- "miniLesson": a real mini-lesson — a STEP-BY-STEP walkthrough, 3-4 short steps, talking DIRECTLY to the learner ("you", "your"), BELOW their CEFR level, long enough to actually teach: Step 1 — notice the pattern; Step 2 — the rule in one simple sentence; Step 3 — a fresh example; Step 4 — "now you try it" with their own life. Teach vocabulary, grammar, ideas, culture and content together. NO titles like "Mini-Lesson", "Rule:", "Step 1:" — the app renders paragraphs; write the steps as flowing sentences. NO HTML tags of any kind (never </b>, <b>, <br>). Mark important info INLINE with **double stars** (key word/phrase → green) and *single stars* (nuance → blue). One idea per sentence; easy to digest.
- "keywords": 2-4 key words/phrases (the app inserts them as chips with NO label).
- "speakingPrompt": an oral follow-up in 2nd person that recycles the same language.
- "ccq" (OPTIONAL): an array of 2-3 short Concept-Check Questions in 2nd person — yes/no, one-word, or "say it out loud" questions that prove the learner understood the mini lesson (e.g. "Is a supermarket the same as a market?", "Say out loud: where do YOU buy food?"). The app shows them at the end of the feedback as speaking questions WITH model answers; if you omit them, the app auto-generates CCQs from the answer and keywords. Always include them when you can.
Example miniLesson: "First, notice the two words: **supermarket** and **market**. The trick is that BOTH sell food — so you must read the details. A supermarket is the big indoor shop with shelves; a market is usually open-air. Picture the shelves of milk inside the building — that is your supermarket. Now you try: say out loud where you buy food in your own town."
Example ccq: ["Is a supermarket the same as a market?", "Say it out loud: where do YOU buy food?", "True or false: a bookshop sells medicine."]

--- ANTI-TELEGRAPHING (NEVER GIVE AWAY THE ANSWER) ---
Learners game patterns, so every question must be honestly challenging: (1) multiple_choice options must all be the SAME length and detail level — the longest/most specific option must NOT be the correct one, the correct answer's position must vary randomly, and distractors must be plausible topic neighbors (e.g. for "buy food": Market vs Supermarket vs Bookshop); (2) true_false statements must be plausible both ways; (3) cloze sentences and hints must never contain the missing word; (4) matching must include 2 extra distractor definitions; (5) tap_word distractors must be minimal pairs (same length, one sound apart); (6) scramble chunks must be similar in length; (7) the question text must never repeat the correct option's key words. If a learner could guess by scanning for the longest or most specific option, rewrite it.

--- HTML5 WIDGET SCORING CONTRACT (type "html5" / "rich_html") ---
Your widget may be exploratory (flip cards, memory games) — fine, then it counts as done when the learner clicks Continue. But if your widget asks a QUESTION with right/wrong answers, it MUST score itself: after the learner's final answer set the plain global flag window.__lav2Html5Ok = true (correct) or window.__lav2Html5Ok = false (wrong) inside your <script> — the engine then counts it as correct/incorrect and shows rich feedback. Also give in-widget feedback (green/red) BEFORE setting the flag. Keep widgets phone-friendly (390px) and under ~40 lines; no external CDNs.

--- 4 SECTIONS, SIMPLE → DIFFICULT ---
Section 1 Foundations (easiest — below level), Section 2 Integrated Skills, Section 3 Complex Integration, Section 4 Mastery Review (hardest — level+1, recycles the weakest points). Each section: 3-5 slides, 5-7 bite-sized activities, vivid colour, xpReward 80-150, ~1/3 "homework". Difficulty rises INSIDE every activity too (easy first item → hardest last).

--- TASK 13 — THE FINAL TEST (Duolingo English Test STYLE, generated WITH the lesson) ---
Every section carries "test": { "tasks": [...] } — together the sections build ONE complete DET-style test over the whole lesson. Cover ALL of these task types across the sections (exact keys):
- read_select: { "type": "read_select", "words": ["real","fakeword","real",...12-16 words mixing real English words and plausible fakes], "real": [the real words only], "audio": optional } — tap all real words.
- fill_blanks: { "type": "fill_blanks", "items": ["She {{w:oke}} up early.", "The bakery {{s:sells}} fresh bread."] } — type the missing letters; the part before : is the visible stem, after : the answer. 4-6 items.
- read_complete: { "type": "read_complete", "passage": "A paragraph with {{st:answer}} gaps (4-6 gaps) recycling the lesson text." }
- interactive_reading: { "type": "interactive_reading", "passage": "5-8 sentence passage", "steps": [ { "kind": "highlight", "prompt": "Click the sentence that says...", "answer": "the exact sentence" }, { "kind": "title", "prompt": "Best title", "options": ["a","b","c"], "answer": "a" }, { "kind": "complete", "prompt": "...", "options": ["a","b","c"], "answer": "b" }, ... 5-6 linked steps on the SAME text ] }
- listen_type: { "type": "listen_type", "audio": "sentence spoken by TTS", "answer": "same sentence" } — 3-4 items.
- interactive_listening: { "type": "interactive_listening", "lines": [{"character":"Maya","emoji":"🦊","voiceHint":"female","text":"..."},...6-10 turns], "questions": [{"question":"...","options":["a","b","c"],"answer":"a"},...2-3], "summary": "Summary with {{word:answer}} gaps" }
- write_photo: { "type": "write_photo", "image": "https://stock-image-url", "prompt": "Describe the photo", "minWords": 30, "sample": "model answer" } — use a real stock-photo URL (unsplash/pexels style) OR omit image for a placeholder frame.
- interactive_writing: { "type": "interactive_writing", "prompt": "...", "minWords": 40, "followUp": "a follow-up question on the same topic", "sample": "model" }
- writing_sample: { "type": "writing_sample", "prompt": "open-ended prompt", "sample": "model" }
- speak_photo: { "type": "speak_photo", "image": "https://stock-image-url", "prompt": "Describe this photo aloud", "sample": "model description" }
- read_speak: { "type": "read_speak", "prompt": "question to read then answer aloud for 30-90s", "sample": "model answer" }
- interactive_speaking: { "type": "interactive_speaking", "turns": [{"character":"Maya","emoji":"🦊","text":"question 1"}, {"character":"Leo","emoji":"🐻","text":"question 2"}, ...4-5], "sample": "model answers" }
- speaking_sample: { "type": "speaking_sample", "topic": "speak 1-3 minutes about...", "sample": "model" }
Distribute so ALL 13 types appear at least once; every test task must recycle ONLY language taught in this lesson. Images: short stock-photo URLs (e.g. https://images.unsplash.com/photo-...) when relevant, otherwise omit "image" and the engine shows a clean placeholder.

--- AUDIO / VOICE RULES ---
audioScript = natural English at/below the learner's level. Do NOT put emoji in audioScript or any field that is read aloud — the app strips them, but write clean spoken sentences anyway. DuoRadio lines alternate female/male voiceHint so two natural voices converse.

--- DUAL AUDIENCE (KIDS AND ADULTS) ---
KIDS: bright colors, big emoji (display text only), playful missions, zero shame.
ADULTS: real-world value, register, pronunciation notes, culture — never babyish.
Tone: warm game coach; use the learner's name (${learner.name}) occasionally. Short sentences.

--- HIGH-FIDELITY DESIGN PRINCIPLES ---
MAXIMUM INTERACTIVITY; NARRATIVE & IMMERSION; SENSORY SUPPORT (see-it-hear-it); LEVEL ADAPTATION to ${learner.cefrLevel || 'B1'} with i+1 easing described above; ACCESSIBLE (never color alone, big tap targets, 390px-first).

--- VALIDATION (run this checklist before outputting) ---
✓ All 14 activity types used; audio_matching items have NO visible word — only audioScript.
✓ Every teaching point practiced 3+ times in NEW tasks (i+1/ZPD spiral); first items below CEFR level.
✓ Every scored item has feedback + miniLesson (flowing paragraph, no titles, no HTML tags, **marks** only) + keywords + speakingPrompt; l1 translations present on question/statement/sentence items.
✓ No option/prompt/hint leaks the answer; options are equal-length and plausible; correct position varies.
✓ One radio episode (10-14 lines) AND one story (4-7 paragraphs), both recycling the lesson.
✓ Every section has test.tasks; ALL 13 DET task types appear across the lesson test.
✓ Valid JSON: escape every quote inside content strings as \\\\\\", newlines as \\\\n; content is a single JSON STRING. Validate mentally before outputting.
`;
};