/**
 * Build the Flipbook Homework gallery sample:
 *   npx tsx tools/build_flipbook_homework.ts
 * Writes Learners/Flipbook_Homework_The_World_of_Innovation.html (served at
 * /learners/Flipbook_Homework_The_World_of_Innovation.html).
 */
import { writeFileSync } from 'fs';
import { generateFlipbookHomeworkHtml } from '../utils/flipbookHtmlGenerator';
import { buildFlipbookHomeworkMock } from '../data/flipbookHomeworkMock';

const mock = buildFlipbookHomeworkMock('Demo Learner');
const html = generateFlipbookHomeworkHtml(mock, 'Flipbook_Homework_The_World_of_Innovation', {
  learnerName: 'Demo Learner',
});

const out = 'Learners/Flipbook_Homework_The_World_of_Innovation.html';
writeFileSync(out, html, 'utf8');
console.log(`Written ${out} (${(html.length / 1024).toFixed(1)} KB)`);