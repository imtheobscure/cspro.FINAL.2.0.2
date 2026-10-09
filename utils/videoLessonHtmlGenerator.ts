import type { Lesson } from '../pages/video_app/types';
import { videoLessonHtmlCss } from './videoLessonHtmlStyles';
import { videoLessonHtmlScript } from './videoLessonHtmlScript';

export interface VideoLessonHtmlOptions {
  learnerName?: string;
  learnerAvatar?: string;
  includeVideo?: boolean;
  subtitlesVtt?: string;
}

/**
 * Generates the fully self-contained Video Lesson HTML.
 * Boots straight into the lesson — no splash — with the media player, per-segment
 * gamified activities (XP / levels / badges / streaks, persisted per learner),
 * subtitle/transcript panel, Learning-with-Streaming search tab and Watch Party.
 */
export function generateVideoLessonHtml(
  lesson: Lesson,
  fileName: string,
  opts: VideoLessonHtmlOptions = {}
): string {
  const subs = opts.subtitlesVtt || '';
  const payload = {
    lesson: lesson as unknown,
    fileName,
    learnerName: opts.learnerName || 'Learner',
    learnerAvatar: opts.learnerAvatar || '🎬',
    includeVideo: opts.includeVideo !== false,
  };
  // JSON inside <script> — neutralize any "</script" that user content could smuggle in.
  const payloadJson = JSON.stringify(payload).replace(/</g, '\\u003c');
  const subsJson = JSON.stringify(subs).replace(/</g, '\\u003c');
  const safeTitle = (lesson.metadata?.title || 'Video Lesson').replace(/[<>&"]/g, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${safeTitle} — Video Lesson</title>
<style>
${videoLessonHtmlCss}
</style>
</head>
<body style="margin:0">
<div id="vl-root"></div>
<script src="https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js" defer></script>
<script>
window.__VL__ = ${payloadJson};
window.__VL_SUBS__ = ${subsJson};
</script>
<script>
${videoLessonHtmlScript}
</script>
</body>
</html>`;
}
