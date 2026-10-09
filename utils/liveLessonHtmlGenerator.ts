import type { LiveLessonManual } from '../pages/live/liveTypes';
import { LIVE_HTML_CSS } from './liveLessonHtmlStyles';
import { LIVE_HTML_SCRIPT } from './liveLessonHtmlScript';
import { normalizeLiveLesson } from '../data/liveLessonMock';

export interface LiveLessonHtmlOptions {
  learnerName?: string;
  learnerAvatar?: string;
  accentColor?: string;
}

/**
 * Standalone single-file HTML for a Live Lesson (LiveLessonManual schema).
 * Boots DIRECTLY into the interactive lesson — no splash screen, no setup wizard.
 * All CSS + JS inlined; works offline from file://.
 *
 * Consumed by:
 *  - Manual JSON Creator (Lessons > Create Lesson → Live Lesson → Save)
 *  - tools/build_live_lesson.ts (gallery mock sample)
 */
export function generateLiveLessonHtml(
  input: Partial<LiveLessonManual> | LiveLessonManual,
  fileName = 'Live_Lesson',
  options: LiveLessonHtmlOptions = {},
): string {
  const lesson = normalizeLiveLesson(input, {
    learnerName: options.learnerName,
  });

  const title = lesson.metadata?.title || 'Live Interactive Lesson';
  const desc = lesson.metadata?.description || '';
  const learnerName = lesson.learnerProfile?.name || 'Student';
  const avatar = options.learnerAvatar || '🐱';

  // The engine expects the lesson object itself (DATA.procedureBlocks,
  // DATA.metadata, DATA.learnerProfile) — attach fileName for the progress mirror.
  const payload = JSON.stringify({ ...lesson, fileName })
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--');

  const script = LIVE_HTML_SCRIPT.replace('/*__DATA__*/ null', payload);

  let html = '';
  html += '<!DOCTYPE html>\n';
  html += '<html lang="en">\n<head>\n';
  html += '<meta charset="UTF-8"/>\n';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n';
  html += '<title>' + escapeHtml(title) + ' — Live Lesson</title>\n';
  html += '<meta name="description" content="' + escapeHtml(desc) + '"/>\n';
  html += '<style>\n' + LIVE_HTML_CSS + '\n</style>\n';
  html += '</head>\n<body>\n';
  // The shell needs BOTH the id and the class. The id is what the runtime looks
  // up (`getElementById('ll-app')`); the class is what the stylesheet styles
  // (`.ll-app{display:flex;height:100vh}`). Emitting only the id meant the flex
  // row never applied, so `.ll-side` and `.ll-main` stacked vertically and the
  // lesson content rendered ~1900px below the fold — which reads as an empty
  // lesson. See the defensive guard in liveLessonHtmlScript.ts.
  html += '<div id="ll-app" class="ll-app"></div>\n';
  html += '<script>\n' + script + '\n</' + 'script>\n';
  html += '</body>\n</html>';

  return html;
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}