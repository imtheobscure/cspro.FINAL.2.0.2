/**
 * Build the Lesson Gallery sample for Gamified Challenge.
 * Writes Learners/Gamified_Challenge_<title>.html from the mock theme data.
 * Run: npx tsx tools/build_gamified_challenge.ts
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { buildGamifiedChallengeMock } from '../data/gamifiedChallengeMock';
import { generateGamifiedChallengeHtml } from '../utils/gamifiedChallengeHtmlGenerator';

const outDir = join(process.cwd(), 'Learners');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const theme = buildGamifiedChallengeMock('Demo Learner');
const fileName = `Gamified_Challenge_${theme.welcomeTitle.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '')}`;
const html = generateGamifiedChallengeHtml(theme, fileName, {
  learnerName: 'Demo Learner',
  learnerPhoto: '😎',
});
const out = join(outDir, `${fileName}.html`);
writeFileSync(out, html, 'utf8');
console.log(`Written ${out} (${(html.length / 1024).toFixed(1)} KB)`);