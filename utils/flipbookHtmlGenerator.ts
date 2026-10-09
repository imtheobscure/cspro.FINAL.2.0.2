/**
 * Flipbook Homework — standalone single-file HTML generator.
 *
 * Turns a FlipbookLessonJSON into a self-contained magazine HTML (cover, table of
 * contents, section pages with interactive activities / vocabulary / dialogue /
 * podcast player, back-cover leaderboard) that opens DIRECTLY in the magazine view —
 * no splash screen, no lesson wizard. All CSS + JS is inlined so it works offline
 * from file://.
 *
 * Consumed by:
 *  - Manual JSON Creator (Lessons > Lesson Creator → flipbookHomework type)
 *  - Gallery sample build: npx tsx tools/build_flipbook_homework.ts
 */
import type { FlipbookLessonJSON } from '../pages/flipbook/flipbookTypes';
import {
  FLIPBOOK_TYPE_COLORS,
  FLIPBOOK_TYPE_LABELS,
  FLIPBOOK_TYPE_ICONS,
  FLIPBOOK_TYPE_BG,
  flipbookSectionImage,
} from '../pages/flipbook/flipbookTypes';
import { FLIPBOOK_HTML_CSS } from './flipbookHtmlStyles';
import { FLIPBOOK_HTML_SCRIPT } from './flipbookHtmlScript';

// Embed JSON inside a <script type="application/json"> tag safely.
// NB: never double-escape backslashes — JSON strings already carry \" escaped
// quotes, and doubling them corrupts the payload ("\" → "\\" breaks JSON.parse).
// Only the four HTML/JS-string hazards need escaping.
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

export function generateFlipbookHomeworkHtml(
  lesson: FlipbookLessonJSON,
  fileName?: string,
  opts?: { learnerName?: string; photo?: string | null }
): string {
  const lessonData: FlipbookLessonJSON = {
    ...lesson,
    learnerName: opts?.learnerName || lesson.learnerName || 'Learner',
    date: lesson.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  };

  const json = JSON.stringify(lessonData);
  const photo = opts?.photo || '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeAttr(lessonData.title || 'Flipbook Homework')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
<style>
${FLIPBOOK_HTML_CSS}
</style>
</head>
<body>
<script id="lesson-data" type="application/json">${escapeJson(json)}</script>
<script>
window.__LESSON__ = JSON.parse(document.getElementById('lesson-data').textContent);
window.__FB_COLORS__ = ${JSON.stringify(FLIPBOOK_TYPE_COLORS)};
window.__FB_LABELS__ = ${JSON.stringify(FLIPBOOK_TYPE_LABELS)};
window.__FB_ICONS__ = ${JSON.stringify(FLIPBOOK_TYPE_ICONS)};
window.__FB_BG__ = ${JSON.stringify(FLIPBOOK_TYPE_BG)};
window.__FB_IMAGES__ = ${JSON.stringify(Object.fromEntries(Object.keys(FLIPBOOK_TYPE_COLORS).map((t) => [t, flipbookSectionImage(t)])))};
window.__FB_PHOTO__ = ${JSON.stringify(photo)};
window.__FB_FILENAME__ = ${JSON.stringify(fileName || 'Flipbook_Homework.html')};
${FLIPBOOK_HTML_SCRIPT}
</script>
</body>
</html>`;
}