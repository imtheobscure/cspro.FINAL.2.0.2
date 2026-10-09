import type { LearnerProfile } from '../../types';
import { getProfileContext } from '../../services/generation/core';

/**
 * AI prompt for the Flipbook Homework lesson (personalised Homework Magazine).
 * The AI produces the `FlipbookLessonJSON` schema consumed by BOTH the standalone
 * HTML generator (utils/flipbookHtmlGenerator.ts) and the React presenter
 * (pages/flipbook/FlipBookPresenter.tsx). The magazine opens DIRECTLY in the
 * book view — there is no splash screen or wizard to design for.
 */
export const getFlipbookHomeworkPrompt = (learner: LearnerProfile, config?: any): string => {
    const profileCtx = getProfileContext(learner);
    const facts = `Name: ${learner.name}, Job: ${learner.personalInfo?.occupation || 'learner'}, Location: ${learner.personalInfo?.city || ''}/${learner.personalInfo?.country || ''}, Interests: ${Array.isArray(learner.interests) ? learner.interests.join(', ') : learner.interests}, Level: ${learner.cefrLevel || 'B1'}`;
    const topic = config?.details?.trim() || 'Technology, Society & Human Connection';

    return `
--- YOUR TASK (SETUP) ---
You are an expert Educational Content Generator and editorial magazine designer for a
language-learning app. You are creating a personalised "Homework Magazine" — a beautiful,
Time-magazine-style FLIPBOOK whose pages the learner turns like a real magazine. It must feel
premium, editorial and immersive: reading spreads, drop caps, pull quotes, two-column text,
vocabulary call-outs, chat-style dialogues, and interactive activities that award XP.

The magazine renders DIRECTLY in the flipbook view (cover → table of contents → one page per
section → back-cover leaderboard). There is NO splash screen and NO setup wizard — you only
author the LESSON CONTENT JSON.

--- INPUT DATA ---
LEARNER_FACTS: ${facts}
LESSON_TOPIC/DETAILS: ${topic}
${profileCtx}

--- EXACT JSON SCHEMA (output ONLY this JSON, no markdown fences, no commentary) ---
{
  "id": "lesson-<slug>",
  "title": "A punchy magazine cover headline, e.g. 'The World of Innovation'",
  "level": "B2 – Upper Intermediate",        // use the learner's level
  "topic": "the lesson topic / theme",
  "tutor": "Tutorly",
  "learnerName": "${learner.name || 'Learner'}",
  "date": "auto-filled (omit)",
  "description": "1-sentence magazine description",
  "coverTagline": "a short, warm cover line, e.g. 'Your personalised English adventure starts here.'",
  "sections": [
    {
      "id": "sec-<slug>",
      "type": "reading-factual | reading-fictional | dialogue | grammar | vocabulary | thematic-vocabulary | business-english | news-story | survival-english | biography | lifestyle | debate | writing-email | how-to | travel | horror-story | jokes | advertisement | reflection | speaking | roleplay | shopping | realistic-reading | listening | movie-dialogue | micro-lesson | life-hack | historical-story | recent-news | formal-dialogue | soft-skills | practical | social-profile | discussion",
      "title": "Editorial section title (like a magazine article headline)",
      "imageQuery": "search phrase for a relevant hero photo",
      "imageUrl": "optional direct image URL (or omit)",
      "content": "RICH editorial body text. Use UPPERCASE short lines as sub-headings (e.g. 'THE PRESENT PERFECT'), bullets starting with • / ✅ / ✓, and blank lines between paragraphs. 3-8 substantial paragraphs.",
      "vocabulary": [ { "word": "...", "definition": "...", "partOfSpeech": "noun|verb|adjective|adverb|phrase", "example": "A sentence using the word", "synonyms": ["...","..."], "difficulty": "basic|intermediate|advanced" } ],
      "dialogue": [ { "speaker": "Name", "text": "line", "emotion": "optional stage direction" } ],
      "activities": [ ...see ACTIVITY TYPES... ]
    }
  ]
}

--- SECTION MIX (aim for 6-9 sections) ---
1. OPEN with a strong reading section: 'reading-factual' (news-style explainer) or 'reading-fictional' (a short story) about the topic.
2. Add a 'grammar' section teaching ONE grammar point from the text (presented with clear UPPERCASE sub-headings + examples).
3. Add a 'thematic-vocabulary' or 'vocabulary' section: 8-12 words from the reading, each with definition, part of speech, example, synonyms, difficulty.
4. Add a 'business-english' OR 'survival-english' OR 'dialogue' section with a realistic { dialogue: [...] } chat AND a roleplay/speaking activity.
5. Include a 'news-story' section with a breaking-news-style article tied to the topic.
6. Add variety with 1-2 of: 'debate', 'biography', 'lifestyle', 'travel', 'how-to', 'movie-dialogue', 'recent-news', 'reflection', 'jokes', 'life-hack'.
7. END with a 'reflection' OR 'discussion' section that lets the learner apply everything.

--- ACTIVITY TYPES (activities[] per section: 2-4) ---
{
  "id": "act-<slug>",
  "type": "multiple-choice | true-false | fill-blanks | matching | short-answer | discussion | speaking | roleplay | rating | dictation",
  "question": "The instruction / question",
  "options": ["...", "...", "...", "..."],            // required for multiple-choice & true-false ('True','False')
  "correctAnswer": "the correct option",               // for multiple-choice / true-false
  "pairs": [ { "left": "...", "right": "..." } ],      // for matching
  "blanks": [ { "id": "b1", "sentence": "She ___ (go) to work.", "answer": "goes", "hint": "..." } ], // for fill-blanks — sentence must contain exactly '_____'
  "discussionPoints": ["...", "..."],                  // for discussion
  "speakingPrompts": ["...", "..."],                   // for speaking / roleplay
  "ratingCriteria": ["...", "..."],                    // for rating
  "text": "The exact sentence the learner will hear.", // REQUIRED for dictation — this is what is read aloud
  "xpReward": 10                                        // 10-25 XP per activity
}

--- DESIGN & CONTENT RULES ---
1. EDITORIAL TONE: write like a magazine editor — vivid, specific, human. No AI-slop. The learner is the hero.
2. PERFECT-TENSE GRAMMAR SECTION: if the reading uses a tense, TEACH that tense explicitly in the grammar section.
3. VOCABULARY MUST tie to the reading: reuse the exact words the learner met.
4. DIALOGUE must model the target language naturally (emotions/stage directions optional).
5. ACTIVITIES must check real understanding of the section, never trivial. Follow anti-telegraphing: never leak the answer in the question; options must be the same length/detail; randomise correct position.
6. FILL-BLANKS: each sentence has EXACTLY ONE gap written as '_____' and a clear 'answer'.
7. MATCHING: 3-6 pairs; the right side must be distinct, unambiguous definitions.
8. PERSONALISE: weave in the learner's name, interests, level and job where natural.
9. Every section must be SELF-CONTAINED (no "see the text on page X").
10. Aim for 2-4 activities per section; balance types across the magazine. Make sure EVERY section has at least one activity.
11. Adapt ALL content to the learner's CEFR level (${learner.cefrLevel || 'B1'}) and interests. Use plenty of emoji and short, energetic sentences.
12. Produce valid JSON: escape all quotes (\\\\\") and keep newlines as \\n inside 'content'.
`;
};