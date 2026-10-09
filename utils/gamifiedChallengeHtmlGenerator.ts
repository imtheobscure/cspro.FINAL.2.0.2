/**
 * Gamified Challenge — standalone single-file HTML generator.
 *
 * Turns a GamifiedThemeData into a self-contained game HTML (theme hub + day
 * view with all tabs: lesson, vocab, grammar, glitch-hunter reading, listening,
 * dialogue, speaking, writing, dictation, quiz, boss battle and drag-drop
 * clues) that opens DIRECTLY in the game hub — no splash screen, no welcome,
 * no theme selector, no lesson creator. All CSS + JS is inlined so it works
 * offline from file://.
 *
 * Consumed by:
 *  - Manual JSON Creator (Lessons > Lesson Creator → gamifiedChallenge type)
 *  - Gallery sample build: npx tsx tools/build_gamified_challenge.ts
 */
import type { GamifiedThemeData, GamifiedDayContent } from '../pages/gamified/gamifiedTypes';
import { GAMIFIED_HTML_CSS } from './gamifiedChallengeHtmlStyles';
import { GAMIFIED_HTML_SCRIPT } from './gamifiedChallengeHtmlScript';
import { buildLessonFileName, getLessonFilePrefill } from './lessonFileNaming';

// Embed JSON inside a <script type="application/json"> tag safely.
const escapeJson = (s: string) => s
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const escapeAttr = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;');

export interface GamifiedHtmlOptions {
  learnerName?: string;
  learnerPhoto?: string | null;
}

/**
 * Produce the standalone HTML for a gamified challenge theme.
 * `themeData` must be a full GamifiedThemeData (as emitted by the Manual JSON
 * Creator / mock builder).
 */
export const generateGamifiedChallengeHtml = (
  themeData: GamifiedThemeData,
  fileName: string,
  options: GamifiedHtmlOptions = {},
): string => {
  const learnerName = options.learnerName || 'Learner';
  const photo = options.learnerPhoto || '';
  const json = escapeJson(JSON.stringify({
    themeData,
    learnerName,
    fileName,
    learnerPhoto: photo,
  }));

  const title = (themeData && themeData.welcomeTitle) ? themeData.welcomeTitle : 'Gamified Challenge';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeAttr(title)} — Gamified Challenge</title>
<style>${GAMIFIED_HTML_CSS}</style>
</head>
<body>
<script type="application/json" id="gamified-data">${json}</script>
<script>
(function(){
  var el = document.getElementById('gamified-data');
  var data = null;
  try { data = JSON.parse(el.textContent); } catch (e) { console.error('Bad gamified payload', e); }
  window.__GAMIFIED__ = data || {};
})();
</script>
<script>${GAMIFIED_HTML_SCRIPT}</script>
</body>
</html>`;
};

/**
 * Adapts the legacy `GamifiedWeeklyChallengeOutput` schema (the older
 * "Weekly Challenge (Gamified)" generator) into the full GamifiedThemeData the
 * standalone HTML / React presenter consume. The legacy days carry only
 * text/audioScript/speakingPrompt/task/quiz — everything else is derived or
 * omitted so the day view still renders every meaningful tab.
 */
export const weeklyChallengeToTheme = (output: any, learnerName?: string): GamifiedThemeData => {
  const safeName = String(output?.theme || 'Weekly Challenge');
  const days: GamifiedDayContent[] = (output?.days || []).map((d: any, i: number) => {
    const c = d?.content || {};
    const quiz = (c.quiz || []).map((q: any, qi: number) => ({
      question: q.question || '',
      options: q.options || [],
      correct: Math.max(0, (q.options || []).indexOf(q.answer)),
      explanation: `Answer: ${q.answer || ''}`,
      codeFragment: '',
    }));
    return {
      dayNumber: d?.dayNumber ?? i,
      title: d?.title || d?.dayName || `Day ${i + 1}`,
      subtitle: d?.skillLabel || '',
      skill: d?.skillLabel || 'challenge',
      narratorIntro: c.audioScript || c.text || d?.unlockClue || 'A new challenge awaits...',
      narratorOutro: '',
      backgroundImage: `https://picsum.photos/seed/gc${i}/1920/1080`,
      artifactEmoji: ['⛓️', '📖', '🎤', '🧩', '💀'][i % 5],
      artifactName: `${d?.title || 'Challenge'} Artifact`,
      unlockCode: d?.secretCode || 'CODE',
      codeHint: d?.unlockClue || 'Find the code in the previous day',
      lesson: {
        title: d?.title || `Day ${i + 1}`,
        content: c.text || d?.storylineIntro || 'Read the challenge and complete the tasks.',
        sections: [
          ...(c.text ? [{ title: 'Challenge Briefing', type: 'text' as const, content: c.text }] : []),
          ...(c.audioScript ? [{ title: 'Audio Script', type: 'text' as const, content: c.audioScript }] : []),
          { title: 'Your Task', type: 'warning' as const, content: c.task || 'Complete the task to earn your reward.' },
        ],
      },
      vocabulary: [],
      grammar: [],
      reading: {
        text: c.text || 'No reading passage provided.',
        glitchWords: [],
        comprehensionQuestions: quiz,
      },
      listening: c.audioScript
        ? [{ text: c.audioScript, hiddenWord: (d?.secretCode || '').toLowerCase() || 'code', hint: d?.unlockClue || 'Listen carefully' }]
        : [],
      dialogue: { scenario: c.task || 'A conversation challenge', characters: ['Narrator', 'You'], turns: [] },
      speaking: c.speakingPrompt
        ? [{ text: c.speakingPrompt, targetAccuracy: 70, clueOnSuccess: d?.unlockClue || 'Clue earned!', mode: 'normal' as const }]
        : [],
      writing: c.task
        ? [{ prompt: c.task, minWords: 30, keywords: [], sampleAnswer: 'Great work! Review your answer with your tutor.' }]
        : [],
      dictation: [],
      quiz,
      fearMeterImpact: 10,
      timeLimit: 1800,
      pointsAvailable: 100,
    };
  });
  return {
    id: 'weekly-challenge',
    name: `🏆 ${safeName}`,
    description: 'A gamified weekly challenge for your learner.',
    icon: '🏆',
    welcomeTitle: `🏆 ${safeName}`,
    welcomeSubtitle: output?.storylineIntro || 'Complete all days to win the final reward!',
    colorPrimary: '#8b0000',
    colorSecondary: '#1a0000',
    backgroundImages: ['https://picsum.photos/seed/gc/1920/1080'],
    soundTheme: 'horror',
    narratorVoicePreference: 'Microsoft',
    masterCode: 'FREEDOM',
    startDate: new Date().toISOString().slice(0, 10),
    days,
  };
};

/**
 * Pre-existing LearnerPage flow: turns the legacy GamifiedWeeklyChallengeOutput
 * into the standalone HTML and saves it (or returns the HTML string when
 * `returnHtmlOnly` is true — used by the HTML editor + library buttons).
 */
export const handleSaveGamifiedChallengeAsHtml = (
  jsonContent: any,
  learner?: { name?: string; photo?: string } | null,
  returnHtmlOnly = false,
): string | void => {
  const themeData = weeklyChallengeToTheme(jsonContent, learner?.name);
  // Shared lesson naming: {learner}_{book}_{unit}_{type}_{Learner}_{date}
  const fileName = buildLessonFileName({
    learnerName: learner?.name || 'Learner',
    lessonLabel: 'Gamified Challenge',
    audience: 'Learner',
    ...getLessonFilePrefill(learner),
  });
  const html = generateGamifiedChallengeHtml(themeData, fileName.replace(/\.html$/, ''), {
    learnerName: learner?.name || 'Learner',
    learnerPhoto: (learner as any)?.photo || null,
  });
  if (returnHtmlOnly) return html;
  import('./htmlLessonSaver').then(({ saveAndExportHtmlLesson }) => {
    saveAndExportHtmlLesson({
      htmlContent: html,
      fileName,
      learnerName: learner?.name || 'Learner',
      type: 'Gamified Challenge',
      title: fileName,
      triggerDownload: true,
      alsoZip: true,
    });
  }).catch(() => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try { document.body.removeChild(link); } catch (e) { /* ignore */ }
      URL.revokeObjectURL(url);
    }, 1000);
  });
};