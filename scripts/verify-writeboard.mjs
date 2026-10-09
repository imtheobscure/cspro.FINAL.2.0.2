import esbuild from 'esbuild';
import { readFileSync } from 'fs';

const src = readFileSync('utils/html/writeboard.ts', 'utf8');
const out = esbuild.transformSync(src, { loader: 'ts', format: 'iife', globalName: '__WB__', target: 'es2020' }).code;

const getWriteboardFeatures = new Function(out + '\nreturn __WB__.getWriteboardFeatures;')();
const wb = getWriteboardFeatures();

// The emitted browser JS must parse without syntax errors.
new Function(wb.js);

const checks = {
  'overlay present': wb.html.includes('id="whiteboard-overlay"'),
  'wbArea present': wb.html.includes('id="wbArea"'),
  'pages panel present': wb.html.includes('id="pgList"'),
  'mic widget present': wb.html.includes('id="ribbonMicBtn"') && wb.html.includes('id="micSettingsPanel"'),
  'context menu present': wb.html.includes('id="wbContextMenu"'),
  'AI review modal present': wb.html.includes('id="mAIReview"'),
  'page setup modal present': wb.html.includes('id="mSetup"'),
  'base css rule': wb.css.includes('#whiteboard-overlay{'),
  'print css rule': wb.css.includes('body.wb-printing'),
  'openWhiteboard defined': wb.js.includes('window.openWhiteboard=function'),
  'closeWb defined': wb.js.includes('window.closeWb=function'),
  'dynamic learner name': wb.js.includes('window.LEARNER_NAME||window.__LEARNER_NAME'),
  'autosave defined': wb.js.includes('function autoSave()'),
  'no reference hardcode left': !wb.js.includes('"Farnoosh"') && !wb.html.includes('Farnoosh'),
};

let ok = true;
for (const [k, v] of Object.entries(checks)) {
  if (!v) ok = false;
  console.log((v ? 'PASS' : 'FAIL') + '  ' + k);
}

console.log('sizes: html=' + wb.html.length + ' css=' + wb.css.length + ' js=' + wb.js.length);
if (!ok) process.exit(1);
console.log('WRITEBOARD PORT VERIFIED');
