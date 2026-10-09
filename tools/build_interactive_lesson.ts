/**
 * Build the Interactive Lesson gallery sample:
 *   npx tsx tools/build_interactive_lesson.ts
 * Writes Learners/Interactive_Lesson_Daily_Routines.html (served at
 * /learners/Interactive_Lesson_Daily_Routines.html).
 */
import { writeFileSync } from 'fs';
import { generateInteractiveLessonHtml } from '../utils/interactiveLessonHtmlGenerator';
import { buildInteractiveLessonMock } from '../data/interactiveLessonMock';

const mock = buildInteractiveLessonMock('Demo Learner', 'A2-B1');
const html = generateInteractiveLessonHtml(mock as any, 'Interactive_Lesson_Daily_Routines');

const out = 'Learners/Interactive_Lesson_Daily_Routines.html';
writeFileSync(out, html, 'utf8');
console.log(`Written ${out} (${(html.length / 1024).toFixed(1)} KB)`);
