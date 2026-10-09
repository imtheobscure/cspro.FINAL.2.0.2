/**
 * Verification harness: Copy AI prompt contents for Music + Video lessons,
 * plus the generated standalone HTML for both.
 * Run: npx tsx tmp_verify_prompts.ts
 */
import { readFileSync } from 'node:fs';
import { getManualPrompt } from '../utils/manualPrompts';
import { generateMusicLessonStandaloneHtml } from '../utils/musicLessonHtmlGenerator';
import { generateVideoLessonHtml } from '../utils/videoLessonHtmlGenerator';
import { buildMusicLessonMock } from '../data/musicLessonMock';
import { buildVideoLessonMock } from '../data/videoLessonMock';
import { musicTimingKey, applySavedTimings, loadSavedTimings, saveTimings, clearSavedTimings } from '../utils/musicTimingStore';

/* The timing store talks to localStorage; give it a minimal one for this harness. */
const mem: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in mem ? mem[k] : null),
  setItem: (k: string, v: string) => { mem[k] = String(v); },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { Object.keys(mem).forEach(k => delete mem[k]); },
};

const learner: any = {
  name: 'Amina',
  cefrLevel: 'B1',
  l1Language: 'Spanish',
  nativeLanguage: 'Spanish',
  goals: 'Speak naturally at work',
  interests: 'music, films',
};

let pass = 0;
const fails: string[] = [];
function check(label: string, ok: boolean, extra = '') {
  if (ok) { pass++; return; }
  fails.push(`${label}${extra ? ' — ' + extra : ''}`);
}

/* ── 1. MUSIC LESSON copy AI prompt ── */
const music = getManualPrompt('musicLesson', learner, {
  details: 'Rolling in the Deep — Adele',
  musicSongTitle: 'Rolling in the Deep',
  musicArtist: 'Adele',
});
check('music: lyric-line contract', /subtitles/i.test(music));
check('music: L1 twin fields (l1Title/l1HtmlBody)', music.includes('l1Title') && music.includes('l1HtmlBody'));
check('music: L1 on every card', /every .*card|EVERY card/i.test(music));
check('music: per-line L1 translation', /translation/i.test(music));
check('music: full-width card writing style', /full[- ]width/i.test(music));
check('music: does NOT ask for a PDF', !/PDF/i.test(music));

/* ── 2. VIDEO LESSON copy AI prompt ── */
const video = getManualPrompt('videoLessonInteractive', learner, { details: 'BBC 6 Minute English on sleep' });
check('video: learner L1 required in metadata', video.includes('"learnerL1"') && video.includes('Spanish'));
check('video: L1 rules section present', video.includes('NATIVE LANGUAGE (L1) RULES'));
check('video: content.translation on activities', video.includes('content.translation'));
check('video: reading/listening translation', video.includes('reading.translation') && video.includes('listening.translation'));
check('video: flashcards carry L1 translation', /flashcard .*translation/.test(video));
check('video: chapter summaries required', video.includes('"summary"') && /summary.*collapsed/i.test(video));
check('video: requiredForNext gating rule', /requiredForNext: true on exactly ONE activity per chapter/i.test(video));
check('video: activity timestamps inside the chapter', /timestamp falls inside the chapter/i.test(video));
check('video: no PDF ask', !/send your PDF/i.test(video));
check('video: does not demand a lesson text', !/Please send your PDF or lesson text/i.test(video));

/* ── 3. generated HTML: music ── */
const musicLesson: any = buildMusicLessonMock();
musicLesson.id = musicLesson.id || 'rolling-deep-adele';
const musicHtml = generateMusicLessonStandaloneHtml(musicLesson);
check('music html: light theme root (no dark class on <html>)', /<html lang="en">/.test(musicHtml) && !/<html[^>]*class="dark"/.test(musicHtml));
check('music html: dark toggle kept', musicHtml.includes("localStorage.setItem('tutorly-music-theme'"));
check('music html: lyrics hero classes', musicHtml.includes('lyric-line') && musicHtml.includes('lyric-l1'));
check('music html: no disc / equaliser in the player', !musicHtml.includes('audio-art') && !musicHtml.includes('disc-spin'));
check('music html: no sync tab', !musicHtml.includes('view-sync') && !musicHtml.includes('tab-btn-sync'));
check('music html: in-player sync dock wired', musicHtml.includes('function toggleSyncDock') && musicHtml.includes('function closeSyncDock') && musicHtml.includes('function stampCurrent'));
check('music html: shared timing key injected', musicHtml.includes(musicTimingKey(musicLesson)));
check('music html: autosaves synced timings', musicHtml.includes('autosaveSyncToBrowser'));
check('music html: every getElementById target exists', (() => {
  const ids = Array.from(musicHtml.matchAll(/getElementById\('([A-Za-z0-9_-]+)'\)/g)).map(m => m[1]);
  return Array.from(new Set(ids)).every(id => musicHtml.includes(`id="${id}"`));
})());

/* ── 4. generated HTML: video ── */
const videoLesson: any = buildVideoLessonMock({ name: 'Amina', cefrLevel: 'B1' });
const videoHtml = generateVideoLessonHtml(videoLesson, 'Video_Lesson_Test', { learnerName: 'Amina' });
check('video html: light background palette', videoHtml.includes('--bg0:#f8fafc') && videoHtml.includes('--tx:#0f172a'));
check('video html: no dark card background', !videoHtml.includes('#1e1b33') && !videoHtml.includes('#0e0c22'));
check('video html: full-width layout', videoHtml.includes('.vl-wrap{width:100%;max-width:none'));
check('video html: larger body type', videoHtml.includes('font-size:16px}') || videoHtml.includes('line-height:1.62;font-size:16px'));
check('video html: bigger activity questions', videoHtml.includes('.vl-q{font-size:18px'));
check('video html: progressive disclosure (one chapter at a time)', videoHtml.includes('vl-seg-collapsed') && videoHtml.includes('toggleSeg') && videoHtml.includes('vl-seg-cta'));
check('video html: chapter gating CTA', videoHtml.includes('required activit') && videoHtml.includes('Next chapter'));
check('video html: L1 easy-version line', videoHtml.includes('vl-l1') && videoHtml.includes('LEARNER_L1'));
check('video html: XP feedback no longer wiped by re-render', videoHtml.includes('refreshChips(); banner'));
/* ── 5. Lesson Creator wiring (where Step 2 values meet the prompt) ── */
const creator = readFileSync('components/content/ManualGenerator.tsx', 'utf8');
check('creator: song name injected into the Copy AI prompt', creator.includes('- Song name: ${musicSongTitle}'));
check('creator: singer injected into the Copy AI prompt', creator.includes('- Singer / band: ${musicArtist}'));
check('creator: lyric/ media source injected', creator.includes('- The full lyrics are supplied below') && creator.includes('Media link (audio or video'));
check('creator: music prompt never asks for a PDF', creator.includes('Do NOT ask for any PDF, file or lesson text'));
check('creator: video prompt skips the PDF-ask wrapper', creator.includes("selectedType === 'videoLessonInteractive'") && creator.includes('do NOT ask for a PDF or lesson text'));
check('creator: video keeps metadata.videoUrl allowed', creator.includes('metadata.videoUrl') && creator.includes('MEDIA: the ONLY allowed media URL'));
check('creator: saved lyric timings re-applied on render', creator.includes('applySavedTimings(lessonData'));
check('creator: legacy video types keep the media-free rule', creator.includes('MEDIA-FREE CONTENT'));

/* ── 6. lyric-timing round trip: player → store → re-render ── */
const roundTrip: any = buildMusicLessonMock();
roundTrip.id = 'round-trip-song';
const edited = (roundTrip.subtitles || []).map((s: any, i: number) => ({ ...s, start: i * 11 + 3, end: i * 11 + 10 }));
saveTimings(roundTrip, edited);
check('timings: saved under the shared per-song key', !!loadSavedTimings(roundTrip) && loadSavedTimings(roundTrip)!.length === edited.length);
const merged = applySavedTimings(roundTrip, loadSavedTimings(roundTrip));
check('timings: re-applied on re-render', merged.applied && merged.lesson.subtitles[0].start === 3);
check('timings: lesson keeps its own L1 translation', !!merged.lesson.subtitles[0].translation);
const freshCopy: any = buildMusicLessonMock();
freshCopy.id = 'round-trip-song';
const mergedFresh = applySavedTimings(freshCopy, loadSavedTimings(freshCopy));
check('timings: a freshly pasted lesson inherits the tutor timings', mergedFresh.applied && mergedFresh.lesson.subtitles[1].start === 14);
const htmlWithTimings = generateMusicLessonStandaloneHtml(mergedFresh.lesson);
check('timings: generated HTML embeds the synced starts', htmlWithTimings.includes('"start":3'));
clearSavedTimings(roundTrip);
check('timings: clearing removes them', loadSavedTimings(roundTrip) === null);

console.log(`\n${pass} checks passed, ${fails.length} failed.`);
if (fails.length) {
  console.log('\nFAILED:');
  fails.forEach(f => console.log(' ✗ ' + f));
  process.exit(1);
}
console.log('All prompt + HTML checks passed.');
