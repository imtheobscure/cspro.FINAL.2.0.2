import { writeFileSync } from 'fs';
import { join } from 'path';
import { DEMO_LESSON, DEMO_SUBTITLES } from '../pages/video_app/demoLesson';
import { generateVideoLessonHtml } from '../utils/videoLessonHtmlGenerator';

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 70);
const fileName = slug(DEMO_LESSON.metadata.title || 'Video_Lesson');
const html = generateVideoLessonHtml(DEMO_LESSON, fileName, {
  learnerName: 'Demo Learner',
  includeVideo: true,
  subtitlesVtt: DEMO_SUBTITLES,
});
writeFileSync(join(process.cwd(), 'Learners', `${fileName}.html`), html, 'utf8');
console.log(`✓ built Learners/${fileName}.html (${(html.length / 1024).toFixed(0)} KB)`);
