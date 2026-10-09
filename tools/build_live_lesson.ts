/**
 * Builds the Live Lesson gallery sample (Learners/Live_Lesson_...html) from
 * the built-in mock lesson data, so the lesson gallery tile always has
 * something to preview.
 *
 * Run: npx tsx tools/build_live_lesson.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { buildLiveLessonMockLesson } from '../data/liveLessonMock';
import { generateLiveLessonHtml } from '../utils/liveLessonHtmlGenerator';

const outDir = path.join(process.cwd(), 'Learners');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const lesson = buildLiveLessonMockLesson({ name: 'Demo Learner', cefrLevel: 'B1' });
const title = lesson.metadata?.title || 'Present Perfect in Context';
const fileName = `Live_Lesson_${String(title).replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '')}`;
const html = generateLiveLessonHtml(lesson, fileName, {
  learnerName: 'Demo Learner',
  learnerAvatar: '🐱',
});

const outPath = path.join(outDir, `${fileName}.html`);
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath} (${html.length.toLocaleString()} bytes)`);
