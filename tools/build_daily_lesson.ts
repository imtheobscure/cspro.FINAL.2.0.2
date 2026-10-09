/**
 * Builds the Daily Lesson gallery sample (Learners/Daily_Lesson_...html) from
 * the built-in mock lesson data, so the lesson gallery tile always has
 * something to preview.
 *
 * Run: npx tsx tools/build_daily_lesson.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { buildDailyLessonMock } from '../data/dailyLessonMock';
import { generateDailyLessonHtml } from '../utils/dailyLessonHtmlGenerator';

const outDir = path.join(process.cwd(), 'Learners');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const lesson = buildDailyLessonMock();
const fileName = `Daily_Lesson_${lesson.topic.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '')}`;
const html = generateDailyLessonHtml(lesson, fileName, {
  learnerName: 'Demo Learner',
  learnerAvatar: '🐱',
});

const outPath = path.join(outDir, `${fileName}.html`);
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath} (${html.length.toLocaleString()} bytes)`);