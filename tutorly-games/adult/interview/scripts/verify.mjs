/*
 * TARGETS THE OLD SERVER API — see the README's "Validation" section.
 *
 * This suite drove a Next.js server with PostgreSQL behind it: it created
 * workspaces over HTTP, checked that one learner's data was invisible to another,
 * and asserted on the `/api/…` responses. Interview is a static app with the
 * workspace in `localStorage` now, so most of what is below no longer has an
 * endpoint to talk to and the suite will fail as written.
 *
 * It is kept for one reason: the parts that do not need a database (curriculum
 * shapes, character/scenario coverage, the WCAG A/AA sweep of a rendered page)
 * are still worth re-pointing at a served `dist/` when someone next touches this
 * app. Static equivalents: serve `dist/` and run the accessibility checks against
 * it; drive the workspace through the UI or `localStorage` instead of `/api/`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => { const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }); module._compile(result.outputText, filename); };
const { characters, frameworkLabels } = require('../src/lib/characters.ts');
const { questionBank, scenarios, roles } = require('../src/lib/curriculum.ts');
const { createPrompt, createStarterPack, createSessionQuestions, evaluateAnswers } = require('../src/lib/interview-engine.ts');
const { packSchema, parsePack } = require('../src/lib/validation.ts');
assert.equal(characters.length, 24);
assert.equal(questionBank.length, 156);
assert.equal(new Set(questionBank.map(q => q.id)).size, 156);
for (const q of questionBank) assert.deepEqual(q.answer.map(a => a.label), frameworkLabels[q.framework], q.id);
const learner = { id: 'NEVER_SHARE_THIS_INTERNAL_ID', name: 'Jordan', role: 'Software engineering', organization: 'A real organization', facts: 'Built an accessible volunteer scheduling tool.', level: 'B2', accessTokenHash: 'NEVER_SHARE_AUTH_DATA' };
const prompts = characters.map(c => createPrompt(c, learner, 'job'));
assert.equal(new Set(prompts).size, 24);
for (const prompt of prompts) { assert.ok(prompt.includes('Jordan')); assert.ok(!prompt.includes(learner.id)); assert.ok(!prompt.includes(learner.accessTokenHash)); }
for (const c of characters) for (const s of scenarios) { const pack = createStarterPack(c.id, s.id); assert.ok(packSchema.safeParse(pack).success, `${c.id}/${s.id}`); assert.equal(parsePack(JSON.stringify(pack)).questions.length, 8); const qs = createSessionQuestions(c, learner, s.id); assert.equal(qs.length, 8); assert.equal(new Set(qs.map(q => q.id)).size, 8); }
for (const role of roles.filter(r => r !== 'General')) { const qs = createSessionQuestions(characters[23], { ...learner, role }, 'job'); assert.equal(qs.filter(q => q.id.startsWith('role-')).length, 2, role); assert.ok(qs.some(q => q.id.startsWith('character-24-'))); }
assert.throws(() => parsePack('{broken'));
assert.throws(() => parsePack(JSON.stringify({ ...createStarterPack(1, 'job'), characterId: 25 })));
console.log('PASS: 24 lessons, 156 unique framework-labeled questions, 144 valid scenario packs, private prompts, guaranteed role coverage.');

const base = process.env.TUTORLY_TEST_URL || 'http://127.0.0.1:3000';
fs.mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const contexts = [];
const runtimeErrors = [];
const accessibility = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1060 }, baseURL: base, reducedMotion: 'reduce' }); contexts.push(context);
  const page = await context.newPage(); page.on('pageerror', e => runtimeErrors.push(e.message));
  page.setDefaultTimeout(12000);
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByText('Your private learning space', { exact: true }).waitFor();
  await page.screenshot({ path: 'artifacts/dashboard-desktop-final.png', fullPage: true });
  let workspace = await (await context.request.get('/api/workspace')).json();
  assert.equal(workspace.sessions.length, 0);
  assert.ok(!('accessTokenHash' in workspace.profile));
  const cookie = (await context.cookies()).find(c => c.name === 'tutorly_workspace');
  assert.ok(cookie && cookie.httpOnly && cookie.value.length === 64);
  assert.notEqual(cookie.value, workspace.profile.id);
  const settingsResponse = await context.request.put('/api/workspace', { data: { action: 'preferences', data: { sound: false, autoSpeak: false, rate: 1, voice: '', reducedMotion: true } } });
  assert.equal(settingsResponse.status(), 200);
  assert.ok(!('accessTokenHash' in (await settingsResponse.json()).profile));
  await page.reload({ waitUntil: 'networkidle' });
  const navigate = async name => { await page.locator('nav').getByRole('button', { name: new RegExp(`^${name}`) }).click(); };
  await page.getByRole('button', { name: 'Personalize my journey', exact: true }).click();
  const profileDialog = page.getByRole('dialog', { name: 'Your Tutorly preferences' });
  await profileDialog.getByLabel('What should we call you?').fill('Jordan');
  await profileDialog.getByLabel('Your target role or field').fill('Software engineering');
  await profileDialog.getByLabel(/Organization or institution/).fill('A real organization');
  await profileDialog.getByLabel(/A little about your story/).fill(learner.facts);
  await profileDialog.getByLabel('Your English level').selectOption('B2');
  await profileDialog.getByRole('button', { name: 'Save my profile', exact: true }).click();
  await profileDialog.waitFor({ state: 'hidden' });
  workspace = await (await context.request.get('/api/workspace')).json();
  assert.equal(workspace.profile.name, 'Jordan');
  assert.equal(workspace.profile.role, 'Software engineering');
  console.log('PASS: profile and preferences persist without exposing access credentials.');

  await navigate('Learning path');
  assert.equal(await page.locator('.character-card').count(), 24);
  await page.getByRole('button', { name: "View Catherine Blake's lesson" }).click();
  await page.getByRole('tab', { name: /During the interview/ }).click();
  assert.equal(await page.locator('.lesson-modal .answer-part').count(), 4);
  await page.getByRole('tab', { name: /After the interview/ }).click();
  await page.getByRole('button', { name: 'Mark lesson as prepared' }).click();
  await page.getByRole('button', { name: 'Prepared · mark for review' }).waitFor();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await navigate('Question bank');
  await page.locator('.question-open').first().click();
  assert.equal(await page.locator('.question-card-body .answer-part').count(), 3);
  await page.getByRole('button', { name: 'Save question', exact: true }).first().click();
  await page.getByRole('button', { name: 'Remove saved question', exact: true }).waitFor();
  await page.getByLabel('Search interview questions', { exact: true }).fill('bug');
  assert.ok(await page.locator('.question-card').count() >= 1);
  assert.ok((await page.locator('.question-list').innerText()).includes('investigate a bug'));
  await page.getByLabel('Search interview questions', { exact: true }).fill('');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Remove saved question', exact: true }).waitFor();
  console.log('PASS: complete 24-character gallery, lesson preparation, framework answers, search, and persistent bookmarks.');

  await navigate('AI studio');
  await page.getByLabel('Your interviewer').selectOption('5');
  const prompt = await page.locator('.prompt-preview').textContent();
  assert.ok(prompt.includes('Priya Shah') && prompt.includes('Jordan'));
  assert.ok(!prompt.includes(workspace.profile.id));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy my personalized AI prompt' }).click();
  assert.ok((await page.evaluate(() => navigator.clipboard.readText())).includes('SESSION 5 OF 24'));
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download an example' }).click();
  const download = await downloadPromise;
  const pack = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  pack.title = 'My accessible engineering practice';
  await page.getByLabel('AI interview JSON').fill('{broken');
  await page.getByRole('button', { name: 'Validate & import my interview' }).click();
  await page.getByText('This is not valid JSON.', { exact: false }).waitFor();
  await page.getByLabel('AI interview JSON').fill(JSON.stringify(pack));
  await page.getByRole('button', { name: 'Validate & import my interview' }).click();
  await page.locator('.saved-pack-card').getByRole('heading', { name: pack.title, exact: true }).waitFor();
  await page.screenshot({ path: 'artifacts/ai-studio-final.png', fullPage: true });
  console.log('PASS: unique private prompt, working clipboard, downloadable valid JSON, rejected invalid JSON, and persistent imported pack.');

  await page.getByRole('button', { name: 'Practice this interview' }).click();
  await page.getByRole('button', { name: 'Start my 8-question interview', exact: true }).click();
  await page.getByRole('dialog', { name: 'Interview practice with Priya Shah' }).waitFor();
  await page.getByText('Question 1 of 8', { exact: true }).waitFor();
  await page.screenshot({ path: 'artifacts/interview-room-final.png', fullPage: true });
  const answer = 'In a volunteer project, the existing schedule was difficult to understand. My task was to make it clearer and more accessible. I asked volunteers about their needs, built a simpler scheduling tool, and checked the instructions with a new user. As a result, the team could identify responsibilities more easily. I learned to test an explanation rather than assume it was clear.';
  for (let i = 1; i <= 3; i++) { await page.locator('#interview-answer').fill(answer); await page.getByRole('button', { name: 'Next question', exact: true }).click(); await page.getByText(`Question ${i + 1} of 8`, { exact: true }).waitFor(); }
  const draft = 'This draft is deliberately paused and will be resumed.';
  await page.locator('#interview-answer').fill(draft);
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Save & exit', exact: true }).click();
  await page.getByRole('button', { name: 'Resume session' }).waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Resume session' }).click();
  await page.getByText('Question 4 of 8', { exact: true }).waitFor();
  await page.waitForFunction(expected => document.querySelector('#interview-answer')?.value === expected, draft);
  for (let i = 4; i <= 8; i++) { await page.locator('#interview-answer').fill(answer); await page.getByRole('button', { name: i === 8 ? 'Finish interview' : 'Next question', exact: true }).click(); if (i < 8) await page.getByText(`Question ${i + 1} of 8`, { exact: true }).waitFor(); }
  await page.getByRole('heading', { name: 'You showed up. That matters.' }).waitFor();
  assert.equal(await page.locator('.report-metrics strong').first().innerText(), '8');
  await page.screenshot({ path: 'artifacts/session-reflection-final.png', fullPage: true });
  const transcriptDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export transcript', exact: true }).click();
  assert.ok(fs.readFileSync(await (await transcriptDownload).path(), 'utf8').includes(answer));
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  workspace = await (await context.request.get('/api/workspace')).json();
  assert.equal(workspace.sessions[0].status, 'completed');
  assert.equal(workspace.sessions[0].answers.length, 8);
  assert.deepEqual(workspace.sessions[0].guidance.after, pack.after);
  assert.equal(workspace.sessions[0].metrics.words, 8 * answer.split(/\s+/).length);
  assert.ok(workspace.profile.completedLessons.includes(24));
  console.log('PASS: eight real saved answers, pause/reload/resume, restored draft, actual metrics, and downloadable transcript.');

  const builtInResponse = await context.request.post('/api/sessions', { data: { characterId: 24, scenario: 'job' } });
  assert.equal(builtInResponse.status(), 201);
  let builtIn = (await builtInResponse.json()).session;
  assert.equal(builtIn.questions.filter(q => q.id.startsWith('role-')).length, 2);
  for (let i = 0; i < 2; i++) { const result = await context.request.patch(`/api/sessions/${builtIn.id}`, { data: { questionId: builtIn.questions[i].id, text: answer, seconds: 20 } }); assert.equal(result.status(), 200); builtIn = (await result.json()).session; }
  assert.equal(builtIn.questions.length, 9);
  assert.equal(builtIn.questions[2].id, 'adaptive-follow-up');
  const repeated = await context.request.patch(`/api/sessions/${builtIn.id}`, { data: { ...builtIn.answers[1] } });
  assert.equal((await repeated.json()).session.answers.length, 2);
  const conflicting = await context.request.patch(`/api/sessions/${builtIn.id}`, { data: { ...builtIn.answers[1], text: 'A different answer.' } });
  assert.equal(conflicting.status(), 409);
  const invalid = await context.request.post('/api/packs', { data: { ...pack, characterId: 25 } }); assert.equal(invalid.status(), 400);
  const outsider = await browser.newContext({ baseURL: base }); contexts.push(outsider);
  const outsiderWorkspace = await (await outsider.request.get('/api/workspace')).json(); assert.equal(outsiderWorkspace.sessions.length, 0);
  const forbidden = await outsider.request.patch(`/api/sessions/${builtIn.id}`, { data: { questionId: builtIn.questions[2].id, text: answer, seconds: 15 } }); assert.equal(forbidden.status(), 404);
  const outsidePack = await outsider.request.post('/api/sessions', { data: { characterId: 5, scenario: 'job', packId: workspace.packs[0].id } }); assert.equal(outsidePack.status(), 404);
  const wrongOrigin = await context.request.put('/api/workspace', { headers: { Origin: 'https://unrelated.example' }, data: { action: 'lesson', id: 1, complete: true } }); assert.equal(wrongOrigin.status(), 403);
  console.log('PASS: adaptive follow-ups, idempotent answers, conflict checks, malformed pack rejection, cross-workspace isolation, and origin protection.');

  await page.reload({ waitUntil: 'networkidle' });
  for (const screen of ['Dashboard', 'Learning path', 'Practice room', 'Question bank', 'AI studio', 'My progress']) { await navigate(screen); await page.waitForTimeout(100); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${screen} desktop overflow`); const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); accessibility.push({ screen, violations: report.violations }); }
  await page.getByRole('button', { name: 'Voice and sound settings' }).click();
  const voiceDialog = page.getByRole('dialog', { name: 'Your Tutorly preferences' });
  assert.ok((await voiceDialog.innerText()).includes('Microsoft'));
  const settingsAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); accessibility.push({ screen: 'Settings dialog', violations: settingsAudit.violations });
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  const mobileContext = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); contexts.push(mobileContext);
  const mobile = await mobileContext.newPage(); mobile.on('pageerror', e => runtimeErrors.push(e.message));
  await mobile.goto(base, { waitUntil: 'networkidle' });
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);
  await mobile.screenshot({ path: 'artifacts/dashboard-mobile-final.png', fullPage: true });
  await mobile.getByRole('button', { name: 'Open navigation' }).click();
  await mobile.locator('nav').getByRole('button', { name: /^Learning path/ }).click();
  assert.equal(await mobile.locator('.character-card').count(), 24);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);
  const mobileAudit = await new AxeBuilder({ page: mobile }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); accessibility.push({ screen: 'Mobile learning path', violations: mobileAudit.violations });
  fs.writeFileSync('artifacts/accessibility-all.json', JSON.stringify(accessibility, null, 2));
  console.log('Accessibility summary:', JSON.stringify(accessibility.map(a => ({ screen: a.screen, violations: a.violations.map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length, samples: v.nodes.slice(0, 3).map(n => ({ target: n.target, summary: n.failureSummary })) })) })), null, 2));
  assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'));
  assert.equal(accessibility.flatMap(a => a.violations).length, 0, 'Review artifacts/accessibility-all.json for accessibility findings.');
  console.log('PASS: all screens, mobile navigation, no overflow, no browser errors, and zero checked WCAG A/AA violations.');
} catch (error) {
  try { const page = contexts[0]?.pages()[0]; if (page) { await page.screenshot({ path: 'artifacts/verification-failure.png', fullPage: true }); console.error('Failure page:', page.url()); console.error('Open dialog:', (await page.locator('[role=dialog]').allTextContents()).join(' ').slice(0, 1600)); } } catch {}
  throw error;
} finally {
  for (const context of contexts) { try { const response = await context.request.delete('/api/workspace', { data: { confirmation: 'DELETE' } }); if (response.status() === 200) console.log('Removed test workspace and its related records.'); } catch {} }
  await browser.close();
}
