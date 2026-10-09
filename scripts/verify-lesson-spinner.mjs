/**
 * Generates a COMPLETE lesson through the real htmlGenerator and verifies the
 * Spinner widget survived the assembly (html + css + js, no broken script tag).
 * Also writes lesson_preview_spinner.html so the lesson itself can be opened.
 *
 * Run: node scripts/verify-lesson-spinner.mjs
 */
import esbuild from 'esbuild';
import { writeFileSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';

const tmp = '.tmp-lesson-generator.mjs';
const built = await esbuild.build({
  entryPoints: ['utils/htmlGenerator.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'warning',
});
writeFileSync(tmp, built.outputFiles[0].text, 'utf8');
const { generateStandardLessonHtml } = await import(pathToFileURL(process.cwd() + '/' + tmp).href);
rmSync(tmp, { force: true });

const learner = {
  id: 'l1',
  name: 'Preview Learner',
  level: 'B1',
  l1Language: 'Persian',
  coursePlan: { courseName: 'General English' },
};

const content = {
  sections: [
    {
      title: 'Warm up',
      color: '#6366f1',
      activities: [
        {
          type: 'multiple_choice',
          prompt: 'Which word means "a short rest"?',
          options: ['break', 'brick', 'brake'],
          correct: 'break',
          points: 20,
        },
        {
          type: 'vocabulary',
          prompt: 'Describe your morning routine.',
          points: 20,
        },
      ],
    },
    {
      title: 'Practice',
      color: '#10b981',
      activities: [
        { type: 'speaking', prompt: 'Talk about your weekend for one minute.', points: 30 },
      ],
    },
  ],
};

const html = generateStandardLessonHtml(content, null, learner, 'Preview Lesson', { lessonName: 'Preview Lesson' }, 'presenter', true);

const checks = {
  'lesson renders a full document': html.startsWith('<!DOCTYPE html>') && html.trim().endsWith('</html>'),
  'spinner overlay embedded': html.includes('id="spinner-overlay"'),
  'spinner wheel embedded': html.includes('id="spinner-wheel"'),
  'spinner window iframe embedded': html.includes('id="spinner-window-frame"'),
  'spinner css embedded': html.includes('#spinner-overlay { position: fixed; inset: 0; z-index: 260000;'),
  'spinner tool api embedded': html.includes('window.SpinnerTool'),
  'spinner window runtime embedded': html.includes('function spinnerWindowRuntime()'),
  'spinner tile in games grid': html.includes("'🏆','🧠','🚀','🎉'") ? html.includes("'🎡'") : html.includes("'🎡'"),
  'spinner launch hooked to the grid': html.includes("emoji === '🎡'"),
  'games grid labels describe the tiles': html.includes('Spinner — collections of items'),
  'emoji picker still intact': html.includes('id="emoji-grid-games"') && html.includes('id="emoji-picker"'),
  'annotations toolbar still intact': html.includes('id="fixed-footer"') && html.includes('id="emoji-stamp-btn"'),
  'mini games untouched': html.includes("launchMiniGame('slots')") && html.includes("launchMiniGame('coin')"),
  // NOTE: two extra "<script" substrings come from the collaboration widget, which
  // writes them through placeholders inside its own JS strings. That is pre-existing.
  'script boundaries unchanged (6 real closing tags)': (html.match(/<\/script>/g) || []).length === 6,
  'spinner region holds no raw closing script tag': (function () {
    var start = html.indexOf('function spinnerWindowRuntime');
    if (start === -1) return false;
    var end = html.indexOf('window.SpinnerTool', start);
    var region = html.slice(start, end === -1 ? start + 40000 : end);
    return region.length > 1000 && region.indexOf('</script') === -1;
  })(),
  'isolated window doc is assembled by concatenation': html.includes("'<' + 'script>'") && html.includes("'</scr' + 'ipt>'"),
  'spinner css is scoped (no global .spn-win leak into page css)': !/<\/style>[\s\S]*\.spn-win-emoji/.test(html.split('<script')[0]),
};

let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  if (!pass) ok = false;
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + name);
}

writeFileSync('lesson_preview_spinner.html', html, 'utf8');
console.log('lesson size: ' + html.length + ' bytes -> lesson_preview_spinner.html');

if (!ok) process.exit(1);
console.log('LESSON + SPINNER VERIFIED');
