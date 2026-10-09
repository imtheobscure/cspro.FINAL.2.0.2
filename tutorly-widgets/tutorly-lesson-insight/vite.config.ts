import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Lesson Insight build config.
 *
 * Two deliberate differences from the other root-vite widgets:
 *
 * 1. `base: './'` — every asset reference is relative, so the app works at
 *    `/tutorly-widgets/tutorly-lesson-insight/` and from any other prefix
 *    (a preview harness, a file:// open) without a rebuild. The widget used to
 *    bake in an absolute base, which is exactly the failure `README.md` warns
 *    about under "Deployment gotcha — base paths".
 *
 * 2. There is NO `process.env.GEMINI_API_KEY` define. This app has no API key
 *    and never calls Gemini: the analysis runs in an external AI via a copy
 *    prompt (see `services/lessonInsightPipeline.ts`). Leaving the define in
 *    would ship a build that appears to expect a key it does not use.
 *
 * `vite-plugin-singlefile` is intentionally NOT used: this widget ships a real
 * `assets/` folder so `check-static-deploy.mjs` verifies its references like
 * the Transcriber's.
 */
export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    // One file, so the deployed folder is index.html + assets/ and nothing else.
    chunkSizeWarningLimit: 12000,
  },
});