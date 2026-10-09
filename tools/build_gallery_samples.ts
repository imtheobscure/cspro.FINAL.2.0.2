/**
 * Builds one standalone sample HTML per Manual Creator content type that has a
 * generator, using the project's mock JSON — so the Lesson Gallery can offer a
 * "Preview & Test" tile for EVERY Select Content Type entry.
 *
 * Run: npx tsx tools/build_gallery_samples.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { MOCK_JSON_DATA } from '../data/mockJsonData';
import { MOCK_AVATAR_LESSON_V1, MOCK_AVATAR_LESSON_V2 } from '../data/avatarLessonMocks';
import { generateEnglishLessonV2HtmlString } from '../utils/englishLessonV2HtmlGenerator';
import { generateStandaloneHtml } from '../tutorly-lessons/Avatar_Lesson/avatarhtmlgenerator';
import { generateStandaloneHtmlV2 } from '../tutorly-lessons/Avatar_Lesson_V2/htmlgenerator';
import { generateStandaloneClassmateHtml, getDefaultClassmateSampleJson } from '../utils/classmateStandalone';
import { generateExamSimulatorHtml } from '../tutorly-lessons/Mock-Test/ExamSimulatorHtmlGenerator';
import { generateExamHtml } from '../tutorly-lessons/Mock_Test_V3/ExamSimulatorHtmlGenerator.v3';
import { generateConversationMakerHtml } from '../utils/conversationMakerHtmlGenerator';
import { generatePartyModeHtml } from '../utils/partyModeHtmlGenerator';
import { generateStandalonePlaceGameHtml } from '../utils/placeGameHtmlGenerator';
import { handleSaveSimulationAsHtml } from '../utils/simulationHtmlGenerator';
import { handleSaveHomeworkAsInteractiveHtml } from '../utils/homeworkHtmlGenerator';
import { generateEnglishLessonHtml } from '../utils/englishLessonHtmlGenerator';
import { renderTypeSample } from '../utils/gallerySampleTemplate';
import { buildTestLabHtml } from '../utils/testLabHtmlGenerator';

const OUT = path.join(process.cwd(), 'Learners');

const LEARNER: any = {
  id: 'learner-gallery',
  name: 'Learner',
  cefrLevel: 'B1',
  l1Language: 'Arabic',
  targetLanguage: 'English',
  translationLanguage: 'Arabic',
  readAloudVoice: 'Microsoft',
  avatar: '',
  personalInfo: { name: 'Learner', age: 0, nativeLanguage: 'Arabic', targetLanguage: 'English' },
};

function write(name: string, html: string) {
  if (!html || html.length < 500) { console.log('✗ SKIP (short/empty)', name); return false; }
  fs.writeFileSync(path.join(OUT, name), html);
  console.log('✓', name, `(${(html.length / 1024).toFixed(0)} KB)`);
  return true;
}

function parse(key: string): any {
  try { return JSON.parse((MOCK_JSON_DATA as any)[key]); } catch (e) { console.log('✗ parse fail', key); return null; }
}

const results: Record<string, string> = {};

// ── Micro Lesson V2 ────────────────────────────────────────────────
try {
  const content = parse('englishLessonV2');
  if (content) results.englishLessonV2 = generateEnglishLessonV2HtmlString(content, LEARNER, undefined, 'learner');
} catch (e) { console.log('✗ englishLessonV2:', (e as Error).message); }

// ── Avatar Lesson V1 ───────────────────────────────────────────────
try { results.avatarLesson = generateStandaloneHtml(MOCK_AVATAR_LESSON_V1 as any); }
catch (e) { console.log('✗ avatarLesson:', (e as Error).message); }

// ── Avatar Lesson V2 ───────────────────────────────────────────────
try { results.avatarLessonV2 = generateStandaloneHtmlV2(MOCK_AVATAR_LESSON_V2 as any); }
catch (e) { console.log('✗ avatarLessonV2:', (e as Error).message); }

// ── Classmate ──────────────────────────────────────────────────────
try {
  const scenario = getDefaultClassmateSampleJson('maya_lin', 'Learner');
  results.classmate = generateStandaloneClassmateHtml(scenario, undefined, LEARNER);
} catch (e) { console.log('✗ classmate:', (e as Error).message); }

// ── Exam Prep Lesson (mock test v1 generator) ─────────────────────
try {
  const mock = parse('examPrepLesson');
  if (mock) results.examPrepLesson = generateExamSimulatorHtml(mock);
} catch (e) { console.log('✗ examPrepLesson:', (e as Error).message); }

// ── Mock Test ──────────────────────────────────────────────────────
try {
  const mock = parse('mockTest');
  if (mock) results.mockTest = generateExamSimulatorHtml(mock);
} catch (e) { console.log('✗ mockTest:', (e as Error).message); }

// ── Mock Test V2 ───────────────────────────────────────────────────
try {
  const mock = parse('mockTestV2');
  if (mock) results.mockTestV2 = generateExamHtml(mock, { validate: false } as any);
} catch (e) { console.log('✗ mockTestV2:', (e as Error).message); }

// ── Conversation Maker ─────────────────────────────────────────────
try {
  const mock = parse('conversationMaker') || {
    settings: { topic: 'Daily routines', cefrLevel: 'B1', targetL1: 'Arabic', characters: [] },
    characters: [
      { name: 'Sam', emoji: '🧑', role: 'You', voiceURI: '' },
      { name: 'Alex', emoji: '👩', role: 'Friend', voiceURI: '' },
    ],
    scenes: [
      { title: 'Morning chat', lines: [{ speaker: 'Sam', text: 'Good morning! How was your weekend?' }, { speaker: 'Alex', text: 'Great, I visited my family in the mountains.' }, { speaker: 'Sam', text: 'That sounds lovely. Did you go hiking?' }, { speaker: 'Alex', text: 'A little. The view from the top was amazing!' }] },
    ],
  };
  results.conversationMaker = generateConversationMakerHtml(mock, LEARNER, undefined);
} catch (e) { console.log('✗ conversationMaker:', (e as Error).message); }

// ── Party Mode ─────────────────────────────────────────────────────
try {
  const mock = parse('partyMode');
  if (mock) results.partyMode = generatePartyModeHtml(mock, LEARNER, undefined);
} catch (e) { console.log('✗ partyMode:', (e as Error).message); }

// ── Guess the Place ────────────────────────────────────────────────
try {
  const mock = parse('placeGame');
  if (mock) results.placeGame = generateStandalonePlaceGameHtml(mock, 'Learner');
} catch (e) { console.log('✗ placeGame:', (e as Error).message); }

// ── Audio Lab (simulations) ────────────────────────────────────────
try {
  const mock = parse('simulations');
  if (mock) results.simulations = handleSaveSimulationAsHtml(mock, LEARNER, 'Audio_Lab_Sample', true);
} catch (e) { console.log('✗ simulations:', (e as Error).message); }

// ── Homework ───────────────────────────────────────────────────────
try {
  const mock = parse('homework');
  if (mock) results.homework = handleSaveHomeworkAsInteractiveHtml(mock, LEARNER);
} catch (e) { console.log('✗ homework:', (e as Error).message); }

// ── Type-branded template for every section-shaped content type ─────
// Each Gallery sample renders inside a shell branded with the TYPE'S OWN
// name/emoji/color (NOT the Micro Lesson shell), with mock content and
// working activities, so every tile opens a lesson that looks like the
// format it represents.
function branded(name: string, id: string, emoji: string, color: string, sections: any[], subtitle?: string) {
  if (!sections || !sections.length) { console.log('✗', name, ': no sections'); return; }
  results[id] = renderTypeSample(sections, { name, emoji, color, subtitle, learnerName: 'Learner' });
}

// ── Bilingual Study Lesson ──────────────────────────────────────────
try {
  const mock = parse('bilingualStudyLesson');
  branded('Bilingual Lesson', 'bilingualStudyLesson', '🌐', '#0ea5e9', mock?.sections || [{ title: 'Chunk-based Study', color: '#0ea5e9', studyTime: '25 mins', xpReward: 20, activities: [{ title: '📖 Study chunk', type: 'paragraph', content: mock?.title || 'Bilingual chunk-based study lesson — each chunk is presented with L1 translation support.' }, { title: '💬 Reflect', type: 'reflection', content: 'Repeat the chunk aloud in English, then in your language.' }] }], 'Chunk-based study with L1 translation support');
} catch (e) { console.log('✗ bilingualStudyLesson:', (e as Error).message); }

// ── Explainer Lesson ────────────────────────────────────────────────
try {
  const mock = parse('explainerLesson');
  const secs = Array.isArray(mock?.sections) ? mock.sections : (mock?.steps ? mock.steps.map((s: any, i: number) => ({ title: s.title || ('Step ' + (i + 1)), color: '#f97316', studyTime: '5 mins', xpReward: 10, activities: [{ title: '💡 Explain', type: 'paragraph', content: s.content || s.text || '' }, { title: '✅ Check', type: 'multiple_choice', content: s.question || 'Did you understand this step?', options: ['Yes — I can explain it', 'Partly — one more read'], answer: 'Yes — I can explain it' }] })) : []);
  branded('Explainer Lesson', 'explainerLesson', '💡', '#f97316', secs, 'Concept → examples → retention checks');
} catch (e) { console.log('✗ explainerLesson:', (e as Error).message); }

// ── Conversational Lesson ───────────────────────────────────────────
try {
  const mock = parse('conversationalLesson');
  const secs = Array.isArray(mock?.sections) ? mock.sections : (mock?.dialogues ? mock.dialogues.map((d: any, i: number) => ({ title: d.title || ('Dialogue ' + (i + 1)), color: '#8b5cf6', studyTime: '10 mins', xpReward: 15, activities: [{ title: '🗣️ Dialogue', type: 'paragraph', content: (d.lines || d.dialogue || []).map((l: any) => (l.speaker ? l.speaker + ': ' : '') + (l.text || l)).join('\n') }, { title: '💬 Your turn', type: 'short_answer', content: d.prompt || 'How would you respond in this situation?' }] })) : []);
  branded('Conversational Lesson', 'conversationalLesson', '🗣️', '#8b5cf6', secs, 'Speaking-first guided practice with model answers');
} catch (e) { console.log('✗ conversationalLesson:', (e as Error).message); }

// ── Conversation Game ───────────────────────────────────────────────
try {
  const mock = parse('conversationGame');
  const secs = Array.isArray(mock?.sections) ? mock.sections : (mock?.scenes ? mock.scenes.map((sc: any, i: number) => ({ title: sc.title || ('Scene ' + (i + 1)), color: '#14b8a6', studyTime: '5 mins', xpReward: 10, activities: [{ title: '💬 Choose your path', type: 'multiple_choice', content: sc.prompt || sc.setup || 'What do you say next?', options: (sc.choices || [{ text: 'Say hello and introduce yourself', answer: true }, { text: 'Stay quiet', answer: false }]).map((c: any) => typeof c === 'string' ? c : (c.text || c.label || '')), answer: (sc.choices || []).find((c: any) => c && typeof c === 'object' && c.answer)?.text || '' }] })) : []);
  branded('Conversation Game', 'conversationGame', '💬', '#14b8a6', secs, 'Branching audio roleplay — pick paths and earn points');
} catch (e) { console.log('✗ conversationGame:', (e as Error).message); }

// ── Daily Lesson (classic) ──────────────────────────────────────────
try {
  const mock = parse('dailyLesson');
  const secs = Array.isArray(mock?.sections) ? mock.sections : (mock?.steps ? mock.steps.map((s: any, i: number) => ({ title: s.title || ('Step ' + (i + 1)), color: '#4f46e5', studyTime: '10 mins', xpReward: 15, activities: [{ title: '📖 Daily study', type: 'paragraph', content: s.content || s.text || '' }, { title: '✅ Quick check', type: 'multiple_choice', content: s.question || 'What did this step teach?', options: s.options || ['I understood it', 'Show me again'], answer: s.answer || 'I understood it' }] })) : []);
  branded('Daily Lesson (classic)', 'dailyLesson', '📅', '#4f46e5', secs, 'Day-stamped lesson with study + practice flow');
} catch (e) { console.log('✗ dailyLesson:', (e as Error).message); }

// ── Test Lab Activity ───────────────────────────────────────────────
// The REAL Test Lab experience: the full Testing Panel game (hot seat, taboo,
// listening, matching, scramble, cloze, conversation & more) pre-loaded with
// mock data that covers EVERY supported activity type.
try {
  const mock = parse('testLab') || { content: [] };
  if (!mock.content || !mock.content.length) throw new Error('testLab mock has no content array');
  results.testLab = buildTestLabHtml(mock, LEARNER);
} catch (e) { console.log('✗ testLab:', (e as Error).message); }

// ── Exam Prep Lesson ────────────────────────────────────────────────
try {
  const mock = parse('examPrepLesson');
  const secs = Array.isArray(mock?.sections) ? mock.sections : [
    { title: 'Reading Strategy', color: '#dc2626', studyTime: '15 mins', xpReward: 20, activities: [{ title: '📖 Strategy', type: 'paragraph', content: mock?.readingStrategy || 'Skim the text, highlight keywords, then read the questions before answering.' }] },
    { title: 'Writing Task', color: '#ea580c', studyTime: '20 mins', xpReward: 20, activities: [{ title: '✍️ Write', type: 'short_answer', content: mock?.writingTask || 'Write a short essay (120–150 words) about technology and learning.' }] },
    { title: 'Speaking Cue Card', color: '#16a34a', studyTime: '10 mins', xpReward: 15, activities: [{ title: '🎤 Speak', type: 'short_answer', content: mock?.speakingTopic || 'Describe a person you admire. Say who they are, why you admire them, and how they influenced you.' }] },
    { title: 'Mini Mock', color: '#2563eb', studyTime: '15 mins', xpReward: 20, activities: [{ title: '❓ Mini mock', type: 'multiple_choice', content: 'Which sentence is grammatically correct?', options: ['She go to school every day', 'She goes to school every day', 'She going to school every day'], answer: 'She goes to school every day' }] },
  ];
  branded('Exam Prep Lesson', 'examPrepLesson', '📝', '#dc2626', secs, 'IELTS-style prep: strategy, writing, speaking & mini mock');
} catch (e) { console.log('✗ examPrepLesson:', (e as Error).message); }

// ── Weekly Challenge ────────────────────────────────────────────────
try {
  const mock = parse('weeklyChallenge');
  const tasks = Array.isArray(mock?.tasks) ? mock.tasks : Array.isArray(mock?.sections) ? [] : [
    { title: 'Day 1 · Vocabulary sprint', type: 'multiple_choice', content: 'Choose the synonym of “rapid”.', options: ['Fast', 'Slow', 'Quiet'], answer: 'Fast' },
    { title: 'Day 2 · Listening warm-up', type: 'paragraph', content: 'Listen to a short audio and note three keywords you hear.' },
    { title: 'Day 3 · Speaking mission', type: 'short_answer', content: 'Record yourself describing your morning routine in 5 sentences.' },
  ];
  branded('Weekly Challenge', 'weeklyChallenge', '🏆', '#f59e0b', [{ title: mock?.title || 'Weekly Challenge', color: '#f59e0b', studyTime: '15 mins', xpReward: 100, activities: tasks.map((t: any, i: number) => ({ title: t.title || ('Task ' + (i + 1)), type: t.type === 'fillInTheBlank' ? 'gap_fill' : t.type === 'matching' ? 'matching' : t.type === 'reading' || t.type === 'listening' ? 'paragraph' : 'multiple_choice', content: t.content || '', options: t.options, answer: t.answer || t.correct })) }], '7-day gamified mission set with streaks & rewards');
} catch (e) { console.log('✗ weeklyChallenge:', (e as Error).message); }

// ── Quiz ────────────────────────────────────────────────────────────
try {
  const mock = parse('quiz');
  const qs = Array.isArray(mock?.questions) ? mock.questions : (Array.isArray(mock?.sections) ? [] : [
    { question: 'What is the past tense of “go”?', options: ['goed', 'went', 'gone'], answer: 'went' },
    { question: 'Choose the correct article: ___ apple a day.', options: ['a', 'an', 'the'], answer: 'an' },
    { question: '“Ubiquitous” means…', options: ['rare', 'everywhere', 'expensive'], answer: 'everywhere' },
  ]);
  branded('Quiz', 'quiz', '❓', '#dc2626', [{ title: '❓ Quiz', color: '#dc2626', studyTime: '20 mins', xpReward: 100, activities: qs.map((q: any, i: number) => ({ title: 'Question ' + (i + 1), type: 'multiple_choice', content: q.question || q.text || '', options: q.options || ['A', 'B', 'C'], answer: q.answer || q.correct || '' })) }], 'Timed exam-style assessment with instant scoring');
} catch (e) { console.log('✗ quiz:', (e as Error).message); }

// ── Study Guide ─────────────────────────────────────────────────────
try {
  const mock = parse('studyGuide');
  const secs = Array.isArray(mock?.sections) ? mock.sections.map((s: any, i: number) => ({ title: s.title || ('Section ' + (i + 1)), color: '#3b82f6', studyTime: '10 mins', xpReward: 25, activities: [{ title: '📖 Study block', type: 'paragraph', content: s.content || s.text || '' }] })) : [
    { title: 'Key Point 1', color: '#3b82f6', studyTime: '10 mins', xpReward: 25, activities: [{ title: '📖 Key point', type: 'paragraph', content: 'The present perfect connects the past with the present: “I have visited London twice.”' }] },
    { title: 'Key Point 2', color: '#3b82f6', studyTime: '10 mins', xpReward: 25, activities: [{ title: '🃏 Vocabulary cards', type: 'flashcards', pairs: [{ a: 'achieve', b: 'to succeed in doing something' }, { a: 'benefit', b: 'a good or helpful result' }, { a: 'improve', b: 'to make something better' }] }] },
    { title: 'Revise', color: '#3b82f6', studyTime: '5 mins', xpReward: 10, activities: [{ title: '✅ Check yourself', type: 'multiple_choice', content: '“She ___ to Rome twice.”', options: ['has been', 'have been', 'is being'], answer: 'has been' }] },
  ];
  branded('Study Guide', 'studyGuide', '📚', '#3b82f6', secs, 'Podcast-style revision guide with key points & activities');
} catch (e) { console.log('✗ studyGuide:', (e as Error).message); }

// ── Slide Presentation ──────────────────────────────────────────────
try {
  const mock = parse('slides');
  const list = Array.isArray(mock) ? mock : (mock?.slides || []);
  const secs = list.length ? list.map((s: any, i: number) => ({ title: s.title || ('Slide ' + (i + 1)), color: '#8b5cf6', studyTime: '5 mins', xpReward: 10, activities: [{ title: '📽️ Slide', type: 'paragraph', content: s.content || s.text || s.body || '' }] })) : [
    { title: 'Slide 1 · Welcome', color: '#8b5cf6', studyTime: '5 mins', xpReward: 10, activities: [{ title: '📽️ Slide', type: 'paragraph', content: 'Today we explore the world of business English — key phrases for meetings, emails and presentations.' }] },
    { title: 'Slide 2 · Key Vocabulary', color: '#8b5cf6', studyTime: '5 mins', xpReward: 10, activities: [{ title: '🃏 Vocabulary', type: 'flashcards', pairs: [{ a: 'agenda', b: 'a list of items to discuss' }, { a: 'deadline', b: 'the latest time to finish' }, { a: 'stakeholder', b: 'a person affected by a decision' }] }] },
    { title: 'Slide 3 · Discussion', color: '#8b5cf6', studyTime: '5 mins', xpReward: 10, activities: [{ title: '💬 Discuss', type: 'short_answer', content: 'What is the most important meeting you attended this month?' }] },
  ];
  branded('Slide Presentation', 'slides', '📽️', '#8b5cf6', secs, 'Polished slide deck with speaker notes');
} catch (e) { console.log('✗ slides:', (e as Error).message); }

// ── Teacher docs (lessonPlan / forTeachers / lessonGuide) ──────────
try {
  const mock = parse('lessonPlan');
  const blocks = [
    mock?.title || 'Lesson Plan',
    mock?.objectives ? '🎯 Objectives: ' + (Array.isArray(mock.objectives) ? mock.objectives.join('; ') : mock.objectives) : '🎯 Objectives: use present perfect to talk about experiences; practice question forms.',
    mock?.teacherInstructions ? '👩‍🏫 Instructions: ' + (Array.isArray(mock.teacherInstructions) ? mock.teacherInstructions.join(' ') : mock.teacherInstructions) : '👩‍🏫 Instructions: warm-up (5m) → presentation (10m) → controlled practice (15m) → freer speaking (20m) → wrap-up (10m).',
    mock?.differentiationNotes ? '🧩 Differentiation: ' + mock.differentiationNotes : '🧩 Differentiation: extend fast finishers with an extra speaking task; support lower levels with sentence starters.',
    mock?.duration ? '⏱️ Duration: ' + mock.duration : '⏱️ Duration: 60 minutes',
  ].filter(Boolean);
  branded('Lesson Plan', 'lessonPlan', '📋', '#64748b', [{ title: '📋 ' + (mock?.title || 'Lesson Plan'), color: '#64748b', studyTime: '5 mins', xpReward: 5, activities: blocks.map((b) => ({ title: '📋 Plan block', type: 'paragraph', content: b })) }], 'Objectives, timings, activity flow & wrap-up');
} catch (e) { console.log('✗ lessonPlan:', (e as Error).message); }

try {
  const mock = parse('forTeachers');
  const blocks = mock ? [mock] : [{ title: 'Teacher Guide', instructions: 'Use the lesson plan steps with the whole class; monitor pair work; collect exit tickets.', differentiation: 'Provide sentence frames for A1–A2 learners; challenge C1 learners with open-ended follow-ups.', tips: 'Praise effort, use wait time after questions, and keep instructions short.' }];
  branded('Teacher Guide', 'forTeachers', '👩‍🏫', '#ec4899', [{ title: '👩‍🏫 Teacher Guide', color: '#ec4899', studyTime: '5 mins', xpReward: 5, activities: [{ title: '👩‍🏫 Instructions', type: 'paragraph', content: (mock?.instructions || blocks[0].instructions) + '\n\n🧩 ' + (mock?.differentiation || blocks[0].differentiation) + '\n\n💡 ' + (mock?.tips || blocks[0].tips) }] }], 'Instructions, differentiation notes & classroom tips');
} catch (e) { console.log('✗ forTeachers:', (e as Error).message); }

try {
  const mock = parse('lessonGuide');
  branded('Lesson Guide', 'lessonGuide', '📖', '#78716c', [{ title: '📖 Lesson Guide', color: '#78716c', studyTime: '5 mins', xpReward: 5, activities: [{ title: '📖 Guide', type: 'paragraph', content: mock ? (mock.objectives ? '🎯 Objectives: ' + (Array.isArray(mock.objectives) ? mock.objectives.join('; ') : mock.objectives) + '\n\n' : '') + (mock.teacherInstructions ? '👩‍🏫 ' + (Array.isArray(mock.teacherInstructions) ? mock.teacherInstructions.join(' ') : mock.teacherInstructions) : '') : '🎯 Objectives: talk about past experiences.\n\n👩‍🏫 Teacher instructions: model the target language, then let learners practice in pairs.' }] }], 'Learning objectives & quick teacher reference');
} catch (e) { console.log('✗ lessonGuide:', (e as Error).message); }

// ── Audio Lesson ────────────────────────────────────────────────────
try {
  const mock = parse('audioLesson');
  const scen = Array.isArray(mock?.audioScenarios) ? mock.audioScenarios : [
    { title: 'At the café', context: 'You order a coffee at a busy café in London.', dialogue: [{ speaker: 'Barista', text: 'Good morning! What can I get you?' }, { speaker: 'You', text: 'A cappuccino, please. And a croissant.' }, { speaker: 'Barista', text: 'Coming right up — anything else?' }] },
    { title: 'Calling customer support', context: 'Your internet stopped working and you call the provider.', dialogue: [{ speaker: 'Agent', text: 'Thank you for calling. How can I help?' }, { speaker: 'You', text: 'My connection has been down since this morning.' }, { speaker: 'Agent', text: 'Let me run a quick check on your line.' }] },
    { title: 'Job interview', context: 'You are introducing yourself at an interview.', dialogue: [{ speaker: 'Interviewer', text: 'Tell me about yourself.' }, { speaker: 'You', text: 'I have five years of experience in marketing.' }, { speaker: 'Interviewer', text: 'Why do you want this role?' }] },
  ];
  branded('Audio Lesson', 'audioLesson', '🎧', '#84cc16', scen.map((s: any, i: number) => ({ title: '🎧 ' + (s.title || ('Scenario ' + (i + 1))), color: '#84cc16', studyTime: '10 mins', xpReward: 20, activities: [{ title: '🎧 Scenario', type: 'paragraph', content: '🎙️ ' + (s.context || '') + '\n\n' + (s.dialogue || []).map((d: any) => (d.speaker ? d.speaker + ': ' : '') + d.text).join('\n') }, { title: '💬 Reflect', type: 'reflection', content: 'Say one sentence about this scenario in English.' }] })), 'Audio immersion: scenarios, replay & listening comprehension');
} catch (e) { console.log('✗ audioLesson:', (e as Error).message); }

// ── Printable Worksheet ─────────────────────────────────────────────
try {
  const mock = parse('printableWorksheet');
  const qs = Array.isArray(mock?.questions) ? mock.questions : [
    { text: 'Complete: I ___ (visit) Paris twice.', type: 'blank', answer: 'have visited' },
    { text: 'Write one sentence using “already”.', type: 'short' },
    { text: 'Choose the correct form: She ___ her homework yet. (hasn\'t finished / didn\'t finished)', type: 'mcq', options: ['hasn\'t finished', 'didn\'t finished'], answer: 'hasn\'t finished' },
  ];
  branded('Official Worksheet', 'printableWorksheet', '🖨️', '#4b5563', [{ title: '🖨️ ' + (mock?.title || 'Worksheet'), color: '#4b5563', studyTime: '15 mins', xpReward: 20, activities: qs.map((q: any, i: number) => ({ title: '✏️ Q' + (i + 1), type: q.type === 'blank' ? 'gap_fill' : q.type === 'mcq' ? 'multiple_choice' : 'short_answer', content: q.text || q.question || '', options: q.options, answer: q.answer || '' })) }], 'Print-ready exercises with answer key');
} catch (e) { console.log('✗ printableWorksheet:', (e as Error).message); }

// ── Live Lesson / H5P (classic studio type) ────────────────────────
try {
  const mock = parse('liveLesson');
  const secs = Array.isArray(mock?.sections) ? mock.sections : [
    { title: 'Warm-up', color: '#ea580c', studyTime: '10 mins', xpReward: 10, activities: [{ title: '❓ Warm-up', type: 'multiple_choice', content: 'Which word means “to begin”?', options: ['start', 'finish', 'pause'], answer: 'start' }] },
    { title: 'Core activity', color: '#ea580c', studyTime: '15 mins', xpReward: 20, activities: [{ title: '📖 Reading', type: 'paragraph', content: 'In this lesson we practise describing routines. Read the paragraph and note the time expressions.' }, { title: '✏️ Gap fill', type: 'gap_fill', content: 'I ___ up at 7 o\'clock every day.', answer: 'wake' }] },
    { title: 'Wrap-up', color: '#ea580c', studyTime: '5 mins', xpReward: 5, activities: [{ title: '🤔 Reflect', type: 'reflection', content: 'What new word did you learn today?' }] },
  ];
  branded('H5P', 'liveLesson', '👨‍💻', '#ea580c', secs, 'Classic H5P-style studio lesson with activity blocks');
} catch (e) { console.log('✗ liveLesson:', (e as Error).message); }

// write out
console.log('\n--- writing samples ---');
for (const [key, html] of Object.entries(results)) {
  write(`Gallery_${key}_Sample.html`, html);
}
console.log('\nDone. Tiles with samples:', Object.keys(results).length);