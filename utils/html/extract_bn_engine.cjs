// One-shot extraction: pulls the Micro Lesson V1 Bookmarks & Notes engine out of
// utils/englishLessonHtmlGenerator.ts and packages it as getBnEngineBundle() in
// utils/html/bnEngine.ts, so Micro Lesson V2 (and other non-V1 lessons) can ship
// the exact same full-featured panels from the Annotation Toolbar.
const fs = require('fs');

const srcPath = 'utils/englishLessonHtmlGenerator.ts';
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

const idx = (pred, from = 0) => {
  for (let i = from; i < lines.length; i++) if (pred(lines[i], i)) return i;
  throw new Error('marker not found from ' + from);
};

// --- Piece A: state, storage, utilities, toast, updateStats ---
const startA = idx((l) => l.includes('  const state = {'), 2000);
const endA = idx((l) => l.includes('// ===== XP SYSTEM ====='), startA);
let pieceA = lines.slice(startA, endA).join('\n');

// --- Piece B: the whole LessonApp object + expose line ---
const startB = idx((l) => l.includes('  const LessonApp = {'), startA);
const endB = idx((l) => l.trim() === '// Expose', startB);
const pieceB = lines.slice(startB, endB - 1).join('\n'); // drop trailing blank before "// Expose"
const expose = '  window.LessonApp = LessonApp;';

// --- Replace TS-side template interpolations with V2-safe runtime defaults ---
const repl = [
  ['${features.fontSizeScaling || 1}', '1'],
  ['${tutorConfig.enabled && !tutorConfig.unlockCode ? "true" : "false"}', '"false"'],
  ['${avatarBase64 ? "true" : "false"}', '"false"'],
  ['${avatarBase64 ? JSON.stringify(avatarBase64) : "null"}', '"null"'],
  ['${JSON.stringify(gamification.badges || [])}', '[]'],
];
for (const [from, to] of repl) {
  if (!pieceA.includes(from)) throw new Error('interpolation not found: ' + from);
  pieceA = pieceA.split(from).join(to);
}

// --- Hazard checks (must all be zero before embedding in a template literal) ---
for (const [name, s] of [['pieceA', pieceA], ['pieceB', pieceB], ['expose', expose]]) {
  const bt = (s.match(/`/g) || []).length;
  const ip = (s.match(/\$\{/g) || []).length;
  if (bt || ip) throw new Error(name + ' has backticks(' + bt + ') or ${(' + ip + ')');
}

const indent = (s) => s.split('\n').map((l) => '  ' + l).join('\n');

// --- Build the generated bnEngine.ts as plain strings (no nested template literals) ---
const out = [
  '/**',
  ' * FULL Micro Lesson V1 Bookmarks & Notes engine - extracted VERBATIM from the V1',
  ' * generator (utils/englishLessonHtmlGenerator.ts). Do NOT hand-edit the embedded',
  ' * code: re-run _extract_bn.cjs to re-sync.',
  ' *',
  ' * Lesson pages that ship their own LessonApp (Micro Lesson V1 family) ignore this',
  ' * bundle. Pages WITHOUT LessonApp (Micro Lesson V2, Conversational lessons) run it',
  ' * so the Annotation Toolbar Bookmark / Notes buttons open the SAME full-featured',
  ' * panels everywhere: multi-page notes editor, 34+ templates, speech dictation,',
  ' * linguistic assistant, exports, themes, pin/maximize, Time & Study Log analytics,',
  ' * and the bookmark list with the live count badge.',
  ' */',
  'export const getBnEngineBundle = (init: {',
  '  learnerName: string;',
  '  l1: string;',
  '  level: string;',
  '  voiceUri: string;',
  '}): string => {',
  '  const prelude = `',
  '  var __BN_INIT = {',
  "    learnerName: ${JSON.stringify(init.learnerName || 'Student')},",
  "    l1: ${JSON.stringify(init.l1 || 'Spanish')},",
  "    level: ${JSON.stringify(init.level || 'Intermediate (B1-B2)')},",
  "    voiceUri: ${JSON.stringify(init.voiceUri || '')}",
  '  };',
  "  var FEATURES = { autoSave: true, xpPopups: true, hapticFeedback: false, screenShake: false, animations: true, celebrationIntensity: 'normal', tts: true, readingProgress: false, fontSizeScaling: 1 };",
  '  var LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000];',
  "  var LEARNER_NAME = __BN_INIT.learnerName || 'Student';",
  "  var LEARNER_L1 = __BN_INIT.l1 || 'Spanish';",
  "  var LEARNER_LEVEL = __BN_INIT.level || 'Intermediate (B1-B2)';",
  "  var LEARNER_VOICE_URI = __BN_INIT.voiceUri || '';",
  '  window.APP_CHARACTERS = window.APP_CHARACTERS || window.DEFAULT_APP_CHARACTERS || [];',
  '  var GAMIFICATION = {};',
  "  var TUTOR = { enabled: false, unlockCode: '' };",
  '  function checkBadges() {}',
  '  function triggerCelebration() {}',
  '  `;',
  '  return `',
  '(function () {',
  '  // Page already ships its own full engine (Micro Lesson V1 family) - only refresh',
  '  // the badge count so it is correct immediately on load.',
  '  if (window.LessonApp) {',
  '    if (window.LessonApp.updateBookmarkCount) { try { window.LessonApp.updateBookmarkCount(); } catch (e) {} }',
  '    return;',
  '  }',
  '  // No LessonApp on this page (Micro Lesson V2, Conversational, ...) - install the',
  '  // full V1-compatible Bookmarks & Notes engine exactly as Micro Lesson V1 ships it.',
  '  ${prelude}',
  indent(pieceA),
  indent(pieceB),
  expose,
  '  loadState();',
  '  if (!window.__LESSON_OPENED_TIME) window.__LESSON_OPENED_TIME = state.reportStartedAt || new Date().toISOString();',
  '  if (window.LessonApp.updateBookmarkCount) { try { window.LessonApp.updateBookmarkCount(); } catch (e) {} }',
  '})();',
  '`;',
  '};',
  '',
].join('\n');

fs.writeFileSync('utils/html/bnEngine.ts', out, 'utf8');
console.log('Wrote utils/html/bnEngine.ts');
console.log('pieceA lines:', pieceA.split('\n').length, 'pieceB lines:', pieceB.split('\n').length);
