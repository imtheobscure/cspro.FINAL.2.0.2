
import type { LearnerProfile } from '../types';
import { getLessonAndSuppPrompt } from './manual_prompts/lessons_and_supp';
import { getExtraAndDailyPrompt } from './manual_prompts/extra_and_daily';
import { getTestLabPrompt } from './manual_prompts/test_lab';
import { getInteractiveLessonPrompt } from './manual_prompts/interactive_lesson';
import { getLearningAppV2Prompt } from './manual_prompts/learning_app_v2';
import { getFlipbookHomeworkPrompt } from './manual_prompts/flipbook_homework';
import { getGamifiedChallengePrompt } from './manual_prompts/gamified_challenge';
import { getLiveLessonPrompt } from './manual_prompts/live_lesson';
import { getVideoLessonPrompt } from './manual_prompts/video_lesson';
import { getMusicLessonPrompt } from './manual_prompts/music_lesson';
import { getDailyLessonPrompt } from './manual_prompts/daily_lesson';
import { getLiveLessonInteractivePrompt } from './manual_prompts/live_lesson_interactive';
import { getVideoLessonInteractivePrompt } from './manual_prompts/video_lesson_interactive';
import { getMockTestPrompt } from './manual_prompts/mock_test';
import { getMockTestV2Prompt } from './manual_prompts/mock_test_v2';

import { getEnglishLessonV2Prompt } from './manual_prompts/english_lesson_v2';
import { getAvatarLessonPrompt } from './manual_prompts/avatar_lesson';
import { getAvatarLessonV2Prompt } from './manual_prompts/avatar_lesson_v2';
import { getPedagogicalHistoryPromptBlock } from './pedagogicalHistory';
import { buildCefrGrammarConstraintBlock } from './cefrGrammarDictionary';
import { ANSWER_LENGTH_ANTI_CUE_RULE } from './promptRules';

export const getStrictLanguageTutorPromptBlock = (learnerLevel?: string, l1Language?: string, cefrTier?: number): string => {
    const level = learnerLevel?.trim() || 'B1';
    const isC2 = level.toUpperCase() === 'C2';
    const l1 = l1Language || "the learner's native language (L1)";

    let block = `\n\n--- FORCIBLE & NON-NEGOTIABLE STRICT LANGUAGE TUTOR DIRECTIVE ---
Act as a strict language tutor for an [learner level] (${level}) learner. You must forcibly and non-negotiably restrict your language to this level (${level}) or lower. Do not use any vocabulary, grammar structures, or sentence lengths that exceed [learner level] (${level}). If you must use a word above this level, write it in bold and provide the L2 definition and examples and L1 translation (${l1}).

${isC2 ? `🔥 SPECIAL C2 LEVEL REQUIREMENT:
Since the learner level is C2, AI MUST purposefully use C2 vocabulary, grammar, complexity, and sophisticated sentence structures throughout the lesson.` : `🔥 SPECIAL C2 & LEVEL REQUIREMENT:
On the other hand, when the learner level is C2 (or when C2 is specified), AI MUST purposefully use C2 vocabulary, grammar, and complexity. For the current specified level (${level}), you MUST strictly limit vocabulary, grammar, and sentence length to ${level} or lower.`}
`;

    // CEFR grammar dictionary ceiling (level + tier selected in Lesson Creator Step 2).
    // Applies to EVERY lesson type so the Copy AI prompt always enforces it.
    if (typeof cefrTier === 'number' && cefrTier >= 1 && cefrTier <= 3) {
        block += buildCefrGrammarConstraintBlock(level, cefrTier);
    }

    return block;
};

export const getManualPrompt = (type: string, learner: LearnerProfile, config?: any): string => {
    let prompt = "Unknown content type. Please select a valid option.";

    const targetLevel = config?.cefrLevel || learner?.cefrLevel || 'B1';
    const targetTier = config?.cefrTier;
    const targetL1 = learner?.l1Language || learner?.translationLanguage || (learner as any)?.nativeLanguage || "the learner's native language";

    if (type === 'englishLessonV2') {
        prompt = getEnglishLessonV2Prompt(learner, config);
    } else if (type === 'avatarLesson') {
        prompt = getAvatarLessonPrompt(learner, config);
    } else if (type === 'avatarLessonV2') {
        prompt = getAvatarLessonV2Prompt(learner, config);
    } else if (type === 'mockTest') {
        prompt = getMockTestPrompt(learner, config);
    } else if (type === 'mockTestV2') {
        prompt = getMockTestV2Prompt(learner, config);
    } else if ([
        'explainerLesson', 
        'englishLesson', 
        'examPrepLesson', 
        'conversationalLesson', 
        'bilingualStudyLesson', 
        'homework', 
        'quiz', 
        'lessonPlan', 
        'forTeachers',
        'lessonGuide'
    ].includes(type)) {
        prompt = getLessonAndSuppPrompt(type, learner, config);
    } else if ([
        'weeklyChallenge', 
        'learningApp', 
        'printableWorksheet', 
        'studyGuide', 
        'slides', 
        'simulations',
        'dailyLesson', 
        'conversationGame', 
        'placeGame', 
        'partyMode'
    ].includes(type)) {
        prompt = getExtraAndDailyPrompt(type, learner);
    } else if (type === 'testLab') {
        prompt = getTestLabPrompt(learner);
    } else if (type === 'interactiveLesson') {
        prompt = getInteractiveLessonPrompt(learner, config);
    } else if (type === 'learningAppV2') {
        prompt = getLearningAppV2Prompt(learner, config);
    } else if (type === 'flipbookHomework') {
        prompt = getFlipbookHomeworkPrompt(learner, config);
    } else if (type === 'gamifiedChallenge') {
        prompt = getGamifiedChallengePrompt(learner, config);
    } else if (type === 'liveLesson') {
        prompt = getLiveLessonPrompt(learner, config);
    } else if (type === 'videoLesson') {
        prompt = getVideoLessonPrompt(learner);
    } else if (type === 'musicLesson') {
        prompt = getMusicLessonPrompt(learner, config);
    } else if (type === 'dailyLessonInteractive') {
        prompt = getDailyLessonPrompt(learner, config);
    } else if (type === 'liveLessonInteractive') {
        prompt = getLiveLessonInteractivePrompt(learner, config);
    } else if (type === 'videoLessonInteractive') {
        prompt = getVideoLessonInteractivePrompt(learner, config);
    }

    // Media + Table-of-Contents contract.
    // 1) Sectioned lessons (Micro Lesson V1/V2, Explainer, Exam Prep, Conversational, Bilingual) are MEDIA-FREE here —
    //    images/GIFs/YouTube/audio are curated afterwards in Lesson Settings → Add Media, where a dedicated prompt
    //    targets them at the exact sections. Those lessons MUST ship a detailed Table of Contents (concise per-section
    //    coverage) so the Lesson Settings media prompt and the Learner Path can describe each section precisely.
    // 2) All other manual types keep the legacy media sourcing rules below.
    const sectionedLessons = ['englishLesson', 'englishLessonV2', 'explainerLesson', 'examPrepLesson', 'conversationalLesson', 'bilingualStudyLesson'];
    if (sectionedLessons.includes(type)) {
        prompt += `
--- 📑 DETAILED TABLE OF CONTENTS (MANDATORY) ---
This lesson's media is NOT added here — it is curated in a later step (Lesson Settings → Add Media) that matches media to the exact sections. So the JSON you return MUST be media-free: do NOT include lessonImages, lessonVideos, imageUrl, videoUrl, audioUrl, media, or any external media links anywhere in the JSON.

Because a separate AI needs to place pictures, GIFs, YouTube videos and audio into the RIGHT sections, your JSON MUST include a detailed table of contents that concisely describes what every section actually covers:
1. Add a top-level "tableOfContents" array (one entry per section, in order):
   [
     {
       "section": 1,
       "title": "the EXACT section title used in sections[]",
       "overview": "2-3 sentences: exactly what this section teaches — the topic, the key vocabulary / grammar / skills, and what the learner does in it (tasks, exercises, games). Written so a media curator instantly knows which visuals, video explainers or audio clips fit here.",
       "skills": ["vocabulary", "grammar", "listening", "speaking", "reading", "writing", "pronunciation"],
       "activityHighlights": ["core activity types in this section, e.g. flashcards, gap-fill, roleplay"]
     }
   ]
2. ALSO start every object inside "sections" with a "summary" property (1-2 concise sentences restating what that section covers).
3. Keep the tableOfContents entries SHORT and precise — no marketing text, no media suggestions.
`;
        prompt += `

--- 🚫 DO NOT ADD MEDIA IN THIS JSON ---
No lessonImages, no lessonVideos, no imageUrl/videoUrl/audioUrl fields, no "media" arrays, no YouTube/image links of any kind. Media is added AFTER rendering from the Lesson Settings → Add Media studio, which has its own dedicated AI prompt that already knows this lesson's sections. A media-free JSON is the correct and expected output.
`;
    } else {
    // Media contract: prompts must produce current, verifiable links and a schema that Lesson Settings can edit.
    prompt += `\n\n--- 🔒 NON-NEGOTIABLE MEDIA SOURCING RULES (2026 / LATEST) ---
Whenever this lesson needs pictures or YouTube videos (they were requested, or the lesson type benefits from media), you MUST include real, working media — and every link MUST be a current, publicly reachable URL as of 2026 (use the latest available date). This is a hard requirement — never invent, guess, or fabricate URLs, video IDs, thumbnails, or citations. If you cannot verify a link is real and reachable, OMIT that media item rather than making one up.

📸 IMAGE LINKS (REQUIRED):
- Use only direct image file URLs (they must end in a real image URL, e.g. images.unsplash.com/photo-…, images.pexels.com/photos/…, upload.wikimedia.org/wikipedia/commons/…, or a museum/government/publisher CDN). NEVER return search-page URLs (google.com/search, unsplash.com/search, pexels.com/search, pinterest.com, stock-photo listing pages) or placeholder services.
- Append size parameters when the provider supports them (e.g. ?auto=format&fit=crop&w=1200&q=80 for Unsplash) so images load fast.
- The image must be topically relevant to the exact lesson section it illustrates.

🎬 YOUTUBE VIDEO LINKS (REQUIRED):
- Return ONLY real YouTube videos: a normal watch URL (https://www.youtube.com/watch?v=VIDEO_ID) or short youtu.be URL (https://youtu.be/VIDEO_ID).
- The VIDEO_ID must be exactly 11 characters [A-Za-z0-9_-]. Count the characters — an ID of any other length is a hallucination; drop the video if it is not exactly 11.
- The video must be topically relevant to the lesson, in English, and preferably published 2020-2026 (or still live and watchable in 2026).
- Prefer videos from official channels (BBC Learning English, TED-Ed, VOA Learning English, English with Lucy, Learn English with TV Series, etc.).

📋 EXACT SCHEMA (put EVERY item in settings so the teacher can edit it in Lesson Settings):
- settings.lessonImages: [{ "id": "img-1", "url": "DIRECT_IMAGE_URL", "caption": "Short descriptive caption", "type": "image", "altText": "Accessible description of the image", "sourceUrl": "Page where this image can be credited/found" }]
- settings.lessonVideos: [{ "id": "vid-1", "url": "https://www.youtube.com/watch?v=EXACT_11_CHAR_ID", "caption": "Video title — one-line why it helps", "type": "youtube", "sourceUrl": "https://www.youtube.com/watch?v=EXACT_11_CHAR_ID" }]
- Include at least 2-3 lessonImages and 1-2 lessonVideos for every lesson type (Micro Lesson V1/V2, Explainer, Exam Prep, Conversational, Bilingual).
- Only add activity-level imageUrl/videoUrl fields when that media belongs directly beside that specific activity.

The app embeds settings.lessonImages / settings.lessonVideos INLINE throughout the lesson content (spread across the sections, like media in a real lesson) — there is no separate "Media & Resources" block at the end. Every video gets an "Open on YouTube" button so it also plays in a new tab when the HTML is opened offline from a hard drive (file://).\n`;


    }

    // Append anti-telegraphing + challenge rules (applies to EVERY lesson type)
    prompt += `\n\n--- 🚫 ANTI-TELEGRAPHING & CHALLENGE RULES (NON-NEGOTIABLE) ---
Never give away the answer anywhere — not in the question, the options, the prompt, the audio, or any visible copy. Learners pattern-match, so you MUST design questions they cannot game:
1. MULTIPLE CHOICE: keep every option the SAME length, detail level and abstraction — the longest/most specific option must NOT be the correct one (learners always pick the longer, wordier option). Counting words: every option within ±2 words of the others. Never start the correct option with the exact words of the question. Randomize the position of the correct answer across items (it must not sit at the same index twice in a row). Avoid "all of the above" / "none of the above". Every distractor must be plausible and drawn from the same topic family (e.g. for "buy food": Market, Supermarket, Bookshop — not obviously unrelated words). The dedicated ANSWER-LENGTH ANTI-CUE RULE below is the enforceable version of this point — obey it literally.
2. TRUE/FALSE: write statements that are plausible both ways — no obvious true-sounding words ("always", "everyone", "never") that scream the answer, and no statements that are false for an easy-to-spot reason.
3. CLOZE / FILL-THE-GAP: the surrounding sentence must not contain the missing word or a synonym of it; the hint must never include the missing word.
4. MATCHING / AUDIO MATCHING: include at least 2 extra distractor pairs (more definitions than words) so learners cannot win by elimination.
5. SCRAMBLE: chunks must be close in length so the longest chunk is not obviously the sentence start.
6. TAP-WORD: distractors must be minimal pairs or topic neighbors (same length, one sound apart) — never obviously fake words.
7. FEEDBACK: feedback is shown AFTER the learner answers, so it may reveal and explain — but it must start by confirming their choice ("Yes/Not quite") before showing the correct answer, and must never print the correct answer inside the question/option text itself.
8. Every question must require real thought at the learner's CEFR level: if a 5-year-old could answer instantly by scanning for the longest option or the only repeated word, rewrite it.
${ANSWER_LENGTH_ANTI_CUE_RULE}`;

    // Append strict language tutor constraints
    prompt += getStrictLanguageTutorPromptBlock(targetLevel, targetL1, targetTier);

    if (learner) {
        prompt += getPedagogicalHistoryPromptBlock(learner);
    }

    return prompt;
};
