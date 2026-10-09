/**
 * Music Lesson — builds the standalone gallery sample HTML.
 * Run: npx tsx tools/build_music_lesson.ts
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { buildMusicLessonMock } from '../data/musicLessonMock';
import { generateMusicLessonStandaloneHtml } from '../utils/musicLessonHtmlGenerator';

const lesson = buildMusicLessonMock();
const html = generateMusicLessonStandaloneHtml(lesson);

const out = join(process.cwd(), 'Learners', 'Music_Lesson_Rolling_in_the_Deep.html');
writeFileSync(out, html);
console.log(`Written ${out} (${(html.length / 1024).toFixed(1)} KB)`);