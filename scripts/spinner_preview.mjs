/**
 * Builds spinner_preview.html — a plain host page that mounts the Spinner widget
 * exactly the way the Widgets dock does (styles + markup + runtime, then open).
 * No sample data, no self-test: the tool opens empty and you paste your own JSON.
 *
 * Run: node scripts/spinner_preview.mjs   ->  spinner_preview.html
 */
import esbuild from 'esbuild';
import { writeFileSync } from 'fs';

const built = await esbuild.build({
  entryPoints: ['utils/html/spinner.ts'],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: '__SPN__',
  platform: 'browser',
  target: 'es2020',
  logLevel: 'warning',
});

const code = built.outputFiles[0].text;
const getSpinnerFeatures = new Function(code + '\nreturn __SPN__.getSpinnerFeatures;')();
const sp = getSpinnerFeatures();

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Spinner widget — host page</title>
<style>
  body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f8fafc; color: #0f172a; padding: 32px 24px; }
  .pv-wrap { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin: 0 0 8px; }
  h2 { font-size: 1.1rem; margin: 22px 0 6px; }
  p { line-height: 1.7; }
  .pv-note { background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; border-radius: 14px; padding: 12px 16px; font-size: 0.88rem; font-weight: 600; line-height: 1.6; margin-bottom: 18px; }
  ${sp.css}
</style>
</head>
<body>
  <div class="pv-wrap">
    <div class="pv-note">Spinner widget preview. It comes from the Widgets dock &rarr; <b>More widgets</b> &rarr; <b>Spinner</b>. This host page stands in for a lesson page so you can see the overlay work over real content.</div>
    <h1>Lesson page (host document)</h1>
    <h2>Warm up</h2>
    <p>This paragraph belongs to the host page. The spinner overlay sits above it and must never disturb it.</p>
    <p>Probe sentence: the quick brown fox jumps over the lazy dog.</p>
    <h2>Practice</h2>
    <p>Everything the widget adds lives in its own overlay with a blurred backdrop.</p>
  </div>

  ${sp.html}

  <script>${sp.js}</script>
  <script>window.openSpinnerTool();</script>
</body>
</html>
`;

writeFileSync('spinner_preview.html', page, 'utf8');
console.log('wrote spinner_preview.html (' + page.length + ' bytes)');
