/**
 * Daily Lesson — standalone single-file HTML generator.
 *
 * Turns a DailyLessonData into a self-contained interactive lesson HTML that
 * boots DIRECTLY into the lesson (no splash screen, no avatar setup, no lesson
 * creator). The learner profile comes from the embed payload. All CSS + JS is
 * inlined so it works offline from file://.
 *
 * Consumed by:
 *  - Manual JSON Creator (Lessons > Lesson Creator → dailyLesson type)
 *  - Gallery sample build: npx tsx tools/build_daily_lesson.ts
 */
import type { DailyLessonData } from '../pages/daily/dailyTypes';
import { DAILY_HTML_CSS } from './dailyLessonHtmlStyles';
import { DAILY_HTML_SCRIPT } from './dailyLessonHtmlScript';

// Embed JSON inside a <script type="application/json"> tag safely.
const escapeJson = (s: string) => s
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const escapeAttr = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;');

export interface DailyHtmlOptions {
  learnerName?: string;
  learnerAvatar?: string;
}

/**
 * Produce the standalone HTML for a daily lesson.
 * `lesson` must be a full DailyLessonData (as emitted by the Manual JSON
 * Creator / mock builder).
 */
export const generateDailyLessonHtml = (
  lesson: DailyLessonData,
  fileName: string,
  options: DailyHtmlOptions = {},
): string => {
  const learnerName = options.learnerName || 'Learner';
  const learnerAvatar = options.learnerAvatar || '🐱';
  const json = escapeJson(JSON.stringify({
    lesson,
    learnerName,
    learnerAvatar,
    fileName,
  }));

  const title = (lesson && lesson.topic) ? lesson.topic : 'Daily Lesson';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeAttr(title)} — Daily Lesson</title>
<style>${DAILY_HTML_CSS}</style>
</head>
<body class="dark">
<div id="app"></div>
<div id="cat-widget"></div>
<script type="application/json" id="daily-data">${json}</script>
<script>
(function(){
  var el = document.getElementById('daily-data');
  var data = null;
  try { data = JSON.parse(el.textContent); } catch (e) { console.error('Bad daily lesson payload', e); }
  window.__DAILY__ = data || {};
})();
</script>
<script>${DAILY_HTML_SCRIPT}</script>
</body>
</html>`;
};

/**
 * Adapts a loose/partial JSON payload (whatever the tutor pastes into the
 * Manual JSON Creator) into a complete DailyLessonData, filling every section
 * with graceful fallbacks so the standalone HTML never crashes on a sparse
 * object. Mirrors the Daily_Lesson app's tolerance for minimal input.
 */
export const normalizeDailyLesson = (raw: any, fallback?: DailyLessonData): DailyLessonData => {
  const base: DailyLessonData = fallback || {
    topic: 'Daily English Lesson',
    level: 'B1',
    theme: 'General English',
    warmup: [],
    keywords: [],
    dialogue: { title: '', speakers: [], lines: [] },
    reading: {
      basic: { title: '', content: '<p>No reading content yet.</p>' },
      intermediate: { title: '', content: '<p>No reading content yet.</p>' },
      advanced: { title: '', content: '<p>No reading content yet.</p>' },
    },
    grammarSlides: [],
    radioDrama: { title: '', setting: '', cast: [], lines: [] },
    dictation: { sentences: [] },
    discussion: { topic: '', post: '', comments: [] },
    quiz: [],
    secretCode: '',
    catFeedback: {
      correct: ['Purrr-fect! That\'s exactly right!'],
      incorrect: ['Oh no, not quite... Don\'t worry, every mistake is a lesson in disguise!'],
      idle: ['I\'m watching over your lesson progress. You\'re doing great!'],
      lessonIntro: 'Welcome to your Daily English Lesson! I\'ll be your guide throughout.',
      moduleIntro: {},
    },
  };
  const src = raw || {};
  return {
    topic: src.topic || base.topic,
    level: src.level || base.level,
    theme: src.theme || base.theme,
    warmup: Array.isArray(src.warmup) ? src.warmup : base.warmup,
    keywords: Array.isArray(src.keywords) ? src.keywords : base.keywords,
    dialogue: src.dialogue || base.dialogue,
    reading: {
      basic: src.reading?.basic || base.reading.basic,
      intermediate: src.reading?.intermediate || base.reading.intermediate,
      advanced: src.reading?.advanced || base.reading.advanced,
    },
    grammarSlides: Array.isArray(src.grammarSlides) ? src.grammarSlides : base.grammarSlides,
    radioDrama: src.radioDrama || base.radioDrama,
    dictation: src.dictation || base.dictation,
    discussion: src.discussion || base.discussion,
    quiz: Array.isArray(src.quiz) ? src.quiz : base.quiz,
    secretCode: src.secretCode || base.secretCode,
    conversationGame: src.conversationGame,
    guessThePlace: src.guessThePlace,
    catFeedback: {
      ...base.catFeedback,
      ...(src.catFeedback || {}),
      moduleIntro: src.catFeedback?.moduleIntro || base.catFeedback.moduleIntro,
    },
    keywordTranslations: src.keywordTranslations,
    stepImages: src.stepImages,
  };
};