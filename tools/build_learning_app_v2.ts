/**
 * Build the Learning App V2 gallery sample:
 *   npx tsx tools/build_learning_app_v2.ts
 * Writes Learners/Learning_App_V2_Around_Town.html (served at
 * /learners/Learning_App_V2_Around_Town.html).
 */
import { writeFileSync } from 'fs';
import { generateLearningAppV2Html } from '../utils/learningAppV2HtmlGenerator';
import { buildLearningAppV2Mock } from '../data/learningAppV2Mock';

const mock = buildLearningAppV2Mock('Demo Learner');
const html = generateLearningAppV2Html(mock as any, 'Learning_App_V2_Around_Town');

const out = 'Learners/Learning_App_V2_Around_Town.html';
writeFileSync(out, html, 'utf8');
console.log(`Written ${out} (${(html.length / 1024).toFixed(1)} KB)`);