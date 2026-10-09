/**
 * Verifies the generated Spinner widget code (utils/html/spinner.ts).
 *
 * The lesson generator drops { html, css, js } into a page, and the js is emitted
 * INSIDE a <script> tag, so a stray "</script" or a backtick would break every
 * lesson. This script compiles the module, parses the emitted browser JS and
 * asserts the pieces that matter survived the template-literal escape dance.
 *
 * Run: node scripts/verify-spinner.mjs
 */
import esbuild from 'esbuild';
import { readFileSync } from 'fs';

const annotationsSrc = readFileSync('utils/html/annotations.ts', 'utf8');
const classroomSrc = readFileSync('components/classroom/ClassroomScreen.tsx', 'utf8');
const widgetSrc = readFileSync('utils/spinnerWidget.ts', 'utf8');

const built = await esbuild.build({
  entryPoints: ['utils/html/spinner.ts'],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: '__SPN__',
  platform: 'browser',
  target: 'es2020',
});

const code = built.outputFiles[0].text;
const getSpinnerFeatures = new Function(code + '\nreturn __SPN__.getSpinnerFeatures;')();
const sp = getSpinnerFeatures();

// The emitted browser JS must parse (it ships inside a lesson <script> tag).
new Function(sp.js);

const checks = {
  'overlay present': sp.html.includes('id="spinner-overlay"'),
  'collections view present': sp.html.includes('id="spinner-view-collections"'),
  'load json view present': sp.html.includes('id="spinner-view-new"'),
  'wheel view present': sp.html.includes('id="spinner-view-wheel"'),
  'wheel + chips present': sp.html.includes('id="spinner-wheel"') && sp.html.includes('id="spinner-chips"'),
  'drop zone present': sp.html.includes('id="spinner-drop-zone"'),
  'file input present': sp.html.includes('id="spinner-file-input"'),
  'paste area present': sp.html.includes('id="spinner-paste-area"'),
  'saved list present': sp.html.includes('id="spinner-saved-list"'),
  'copy prompt button present': sp.html.includes('id="spinner-copy-prompt-btn"'),
  'single spin button only': sp.html.includes('id="spinner-spin-btn"') && !sp.html.includes('id="spinner-start-btn"'),
  'no count-in or sound toggles': !sp.html.includes('spinner-countdown-toggle') && !sp.html.includes('spinner-sound-toggle') && !sp.css.includes('.spn-switch'),
  'countdown overlay still used': sp.html.includes('id="spinner-countdown"') && sp.js.includes("var seq = ['3', '2', '1', 'Spin']"),

  'card present': sp.html.includes('id="spinner-tarot"'),
  'card has background layer': sp.html.includes('id="spinner-tarot-bg"'),
  'card has media stage': sp.html.includes('id="spinner-tarot-art"'),
  'card has start + finish': sp.html.includes('id="spinner-card-start-btn"') && sp.html.includes('id="spinner-card-finish-btn"'),
  'card has timer': sp.html.includes('id="spinner-tarot-timer"') && sp.html.includes('id="spinner-tarot-fill"'),
  'card has play button for links': sp.html.includes('id="spinner-tarot-play"'),
  'card start/finish wired': sp.js.includes("on('spinner-card-start-btn', 'click'") && sp.js.includes("on('spinner-card-finish-btn', 'click'"),
  'card renders the drawn item': sp.js.includes('function renderCard(item, isHit)'),
  'card resets to idle': sp.js.includes('function resetCard()') && sp.js.includes('function finishCard()'),
  'start plays music once': sp.js.includes('a.loop = false') && sp.js.includes("a.addEventListener('ended'"),
  'finish stops everything': sp.js.includes('function stopCard(reset)') && sp.js.includes('stopMusic();'),
  'timer runs on the card': sp.js.includes('state.timerId = setInterval('),
  'art node picks the right element': sp.js.includes('function artNode(url)') && sp.js.includes("document.createElement('iframe')") && sp.js.includes("document.createElement('video')"),
  'youtube + vimeo embeds': sp.js.includes('function youtubeId(u)') && sp.js.includes('function vimeoId(u)') && sp.js.includes('youtube-nocookie.com/embed/'),
  'play button only for link media': sp.js.includes("if (play) play.hidden = !state.art.embed;"),
  'gif + video + still classification': sp.js.includes('function isGifUrl(u)') && sp.js.includes('function isVideoUrl(u)') && sp.js.includes('function cardArt(item)'),

  'no separate window overlay': !sp.html.includes('spinner-window-overlay') && !sp.html.includes('spinner-window-frame'),
  'no popup window helper': !sp.js.includes('function openWindow(') && !sp.js.includes('URL.createObjectURL(new Blob([doc]'),
  'no custom challenge html hook': !sp.js.includes('challengeHtml'),
  'no counter anywhere': !sp.html.includes('count-btn') && !sp.css.includes('spn-win-dot') && !sp.js.includes('spn-count-btn'),
  'no window chrome css': !sp.css.includes('.spn-wchrome') && !sp.css.includes('.spn-wframe'),

  'flat wheel tone': sp.js.includes("var SEGMENT_TONE = '#1c2028'") && sp.js.includes('return SEGMENT_TONE;'),
  'no light streak element': !sp.html.includes('spinner-aura') && !sp.css.includes('.spn-light'),
  'no sweep keyframes': !sp.css.includes('spnSweep'),
  'no gloss streak gradient': !sp.css.includes('.spn-wheel-gloss'),
  'gold hairline only on wide segments': sp.js.includes('if (step >= 6)'),
  'winning wedge keeps a visible arc': sp.js.includes('var arc = Math.max(step, 2.4)'),
  'winning chip lit': sp.css.includes('.spn-chip.spn-chip-win'),

  'overlay sits above mini games': sp.css.includes('#spinner-overlay { position: fixed; inset: 0; z-index: 260000;'),
  'overlay blurs the lesson behind it': sp.css.includes('backdrop-filter: blur(16px)'),
  'wheel css present': sp.css.includes('.spn-wheel {') && sp.css.includes('.spn-chip {'),
  'particle burst on landing': sp.js.includes("'spn-dust'") && sp.css.includes('@keyframes spnDust'),
  'tick sound': sp.js.includes('function tickSound(speed)'),
  'sound always on': sp.js.includes('function whoosh()') && sp.js.includes('function boom()') && sp.js.includes('function chime()') && sp.js.includes('function playSfx(url)'),

  'dropdown painted dark': sp.css.includes('.spn-select option, .spn-select optgroup { background-color: #101319; color: #ece7db; }') && sp.css.includes('color-scheme: dark'),
  'select shell themed': sp.css.includes('color-scheme: dark; color: #e8e4da;'),

  'no literal </script in emitted page css': !sp.css.includes('</script'),
  'no literal </script in emitted page html': !sp.html.includes('</script'),
  'emitted js never contains a raw closing script tag': !sp.js.includes('</script'),
  'stays inside the lesson html budget': sp.html.length < 60000 && sp.js.length < 160000,
  'localStorage key': sp.js.includes("'__spinner_collections_v1'"),
  'saved collections renderer': sp.js.includes('function renderSaved()'),
  'normalizer handles arrays': sp.js.includes('function pickItems(raw)'),
  'normalizer handles alias fields': sp.js.includes('function normalizeItem(raw, index)'),
  'media aliases collected': sp.js.includes('function collectMedia(item)') && sp.js.includes("'animations'") && sp.js.includes("'visual'"),
  'auto emoji fallback': sp.js.includes('function autoEmoji(seed)'),
  'markdown fence repair': sp.js.includes('function repairJson(text)'),
  'multiple files at once': sp.js.includes('function handleFiles(files)'),
  'drag and drop wired': sp.js.includes("ov.addEventListener('drop'"),
  'unbiased crypto randomness': sp.js.includes('getRandomValues') && sp.js.includes('function pickIndex(items)'),
  'wheel rotation math': sp.js.includes('function runSpin(from, to, dur, step, idx)'),
  'spin watchdog': sp.js.includes('state.watchdog = setTimeout('),

  'one file with many collections': sp.js.includes('function parsePayload(text)') && sp.js.includes("'collections'") && sp.js.includes("var COLLECTION_KEYS = ['collections'"),
  'all collections exported as one file': sp.js.includes('function allCollectionsJson(pretty)'),
  'prompt and collections merged into one copy': sp.html.includes('id="spinner-copy-prompt-btn"') && !sp.html.includes('id="spinner-export-all-btn"'),
  'prompt embeds current file': sp.js.includes('function aiPrompt()') && sp.js.includes('MY CURRENT FILE') && sp.js.includes('allCollectionsJson(true)'),
  'prompt keeps existing collections': sp.js.includes('Keep every collection and every item that is already in my file exactly as it is'),
  'prompt asks for a new collection too': sp.js.includes('Add at least one NEW collection on top of mine'),
  'prompt asks me for theme examples and count': sp.html.includes('id="spinner-new-theme"') && sp.html.includes('id="spinner-new-examples"') && sp.html.includes('id="spinner-new-count"') && sp.js.includes('(I have not said - ask me)'),
  'prompt forbids empty media': sp.js.includes('NEVER leave a media field empty') && sp.js.includes('This is a FAILED reply'),
  'prompt shows the forbidden reply': sp.js.includes('"image":"","gif":"","video":""'),
  'prompt forces link checking': sp.js.includes('HEAD every url') && sp.js.includes('upload.wikimedia.org, media.giphy.com, media.tenor.com'),
  'prompt pushes quality and quantity': sp.js.includes('as many items as you can in one reply') && sp.js.includes('never fewer than 20') && sp.js.includes('say continue'),
  'prompt schema is the collections shape': sp.js.includes('"collections": [') && sp.js.includes('"gif": "direct .gif link"'),
  'prompt asks for all media kinds': ['image', 'gif', 'video', 'poster', 'audio', 'sfx', 'resource'].every(function (k) { return sp.js.indexOf('"' + k + '":') !== -1; }),
  'prompt has no counter field': !sp.js.includes('"target"') && !sp.js.includes('how many taps'),
  'no example json mock data': !sp.js.includes('EXAMPLE_JSON') && !sp.html.includes('spinner-copy-example-btn') && !sp.js.includes('Five reps') && !sp.js.includes('push-up'),

  'no repeat draws until the round is over': sp.js.includes('function nextIndex(col, forcedIndex)') && sp.js.includes('if (!pool.length) { t.seen = []; pool = poolOf(col); }'),
  'tally kept per collection': sp.js.includes('drawn: {},') && sp.js.includes('seen: [],') && sp.js.includes('t.drawn[item.id] = (t.drawn[item.id] || 0) + 1;'),
  'tally survives storage': sp.js.includes('var drawn = (raw.drawn && typeof raw.drawn === \'object\') ? raw.drawn : {};'),
  'tally shown on the card': sp.html.includes('id="spinner-tarot-tally"') && sp.js.includes('function renderTally(item)') && sp.js.includes("'drawn ' + drawnTimes(col, item)"),
  'round progress in the hint': sp.js.includes('left + \' of \' + col.items.length + \' left\''),
  'loader warns about missing media': sp.js.includes('have no image, gif or video link'),
  'public tool api': sp.js.includes('window.SpinnerTool') && sp.js.includes('window.openSpinnerTool'),

  'gone from the emoji stamp games grid': !annotationsSrc.includes('getSpinnerFeatures') && !annotationsSrc.includes('🎡') && !annotationsSrc.includes('openSpinnerTool'),
  'annotations no longer ship the spinner bundle': !annotationsSrc.includes("from './spinner'") && !annotationsSrc.includes('+ sp.html') && !annotationsSrc.includes('+ sp.js'),
  'lives in the widgets dock': classroomSrc.includes("id: 'spinner'") && classroomSrc.includes("label: 'Spinner'") && classroomSrc.includes('openSpinnerWidget()'),
  'widget helper mounts and opens it': widgetSrc.includes('getSpinnerFeatures()') && widgetSrc.includes('new Function(sp.js)()') && widgetSrc.includes('ready.open()'),
  'no literal template interpolation left': !sp.js.includes('${') && !sp.html.includes('${') && !sp.css.includes('${'),
};

let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  if (!pass) ok = false;
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + name);
}

console.log('sizes: html=' + sp.html.length + ' css=' + sp.css.length + ' js=' + sp.js.length);
if (!ok) process.exit(1);
console.log('SPINNER WIDGET VERIFIED');
