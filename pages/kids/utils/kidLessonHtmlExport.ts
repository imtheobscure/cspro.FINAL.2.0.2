/* ════════════════════════════════════════════════════════════════════════════
   📄 KID LESSON HTML — a lesson you can keep, in three simple pages
   ════════════════════════════════════════════════════════════════════════════

   A lesson built in the Creator lives inside the app. A tutor also needs it as
   something that survives a wiped laptop, a shared USB stick and a school laptop
   with no internet: a plain `.html` file you can double-click.

   So a lesson exports as THREE files, because a lesson is three different things
   at three different times:

     1. `…-1-before-class.html` — the tutor's preparation page: what to print, cut
        and set out, the printable itself, the words, and the links to check BEFORE
        the child arrives. It is meant to be skimmed standing up.
     2. `…-2-in-class.html` — the presentation. This is the one that goes on the
        shared screen: enormous type, one big idea per screen, arrow keys to move,
        a space bar that reads the line aloud. Readable from the back of a room.
     3. `…-3-at-home.html` — the family page: the homework missions, the exact
        English to say at home, and the links that belong at home.

   The files are deliberately dependency-free: no framework, no build, no network
   needed for the words themselves. Media links open in the same tab or a new one,
   and the in-class page degrades to plain type if the machine has no internet —
   which is the whole reason the tutor's own voice is the audio at this age.
   ════════════════════════════════════════════════════════════════════════════ */

import type { Learner, TeacherProfile } from '../types';
import type {
  KidAgeBand,
  KidLesson,
  KidLessonMedia,
  KidLessonWord,
} from './lessonCreatorTypes';
import { KID_BANDS } from './lessonCreatorTypes';
import { mediaKindEmoji, mediaKindLabel, youtubeEmbedUrl } from './kidLessonMedia';

export type KidLessonPhase = 'prep' | 'class' | 'home';

export interface KidPhaseFile {
  phase: KidLessonPhase;
  /** "Before class", "In class", "At home". */
  label: string;
  emoji: string;
  filename: string;
  html: string;
}

const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** A filesystem-safe slug, so a child's name never breaks a download. */
const slug = (value: string): string =>
  String(value || 'lesson')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .toLowerCase() || 'lesson';

const phaseLabel: Record<KidLessonPhase, string> = {
  prep: 'Before class',
  class: 'In class',
  home: 'At home',
};
const phaseEmoji: Record<KidLessonPhase, string> = { prep: '🧰', class: '📺', home: '🏠' };

/** The three files, in order, for a lesson. */
export const KID_LESSON_PHASES: KidLessonPhase[] = ['prep', 'class', 'home'];

/* ────────────────────────────────────────────────────────────────────────────
   Shared styling — big, warm and high-contrast, because a projector eats contrast
   ──────────────────────────────────────────────────────────────────────────── */

const BASE_CSS = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;padding:0}
body{
  font-family:'Nunito','Segoe UI',system-ui,-apple-system,sans-serif;
  color:#1f2437;background:linear-gradient(160deg,#fdf3ff,#eef2ff 45%,#e6fbff);
  min-height:100vh;line-height:1.5;-webkit-font-smoothing:antialiased;
}
.wrap{max-width:1080px;margin:0 auto;padding:26px 20px 70px}
.top{display:flex;flex-wrap:wrap;align-items:center;gap:12px;justify-content:space-between;margin-bottom:18px}
.chip{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:8px 16px;font-weight:900;font-size:15px;
  background:#fff;box-shadow:0 6px 20px rgba(80,60,140,.12)}
h1{font-size:clamp(30px,4.6vw,52px);margin:6px 0 4px;line-height:1.05;letter-spacing:-.5px}
h2{font-size:clamp(22px,2.6vw,30px);margin:0 0 4px}
.sub{font-size:clamp(16px,1.7vw,20px);font-weight:800;color:#6b6f8a;margin:0 0 16px}
.card{background:#fff;border-radius:26px;padding:22px 24px;margin:16px 0;box-shadow:0 12px 34px rgba(80,60,140,.12)}
.emoji{font-size:clamp(48px,7vw,90px);line-height:1;display:inline-block}
.big-emoji{font-size:clamp(84px,14vw,180px);line-height:1;display:block;filter:drop-shadow(0 8px 14px rgba(0,0,0,.12))}
.row{display:flex;flex-wrap:wrap;gap:14px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.word{background:linear-gradient(160deg,#fff,#f3f0ff);border-radius:22px;padding:18px;text-align:center;border:3px solid #e6e1ff}
.word .w-emoji{font-size:clamp(56px,8vw,84px);line-height:1}
.word .w-name{font-size:clamp(24px,3vw,34px);font-weight:900;margin-top:6px;color:#3a2f7a}
.word .w-say{font-weight:900;color:#8a7fd0;font-size:clamp(16px,1.8vw,20px)}
.word .w-meaning{font-weight:800;color:#5a5f7a;font-size:clamp(15px,1.6vw,18px);margin-top:4px}
.word .w-ex{margin-top:6px;font-style:italic;color:#7a6fb0;font-size:clamp(14px,1.5vw,17px)}
.step{border-left:10px solid #8b7bf0;padding:6px 0 6px 18px;margin:18px 0}
.step .s-name{font-weight:900;font-size:clamp(20px,2.4vw,28px);color:#3a2f7a}
.step .s-min{font-weight:900;color:#a29ad0;font-size:15px}
.say{background:#f6f2ff;border-radius:18px;padding:14px 16px;margin-top:8px}
.say .lbl{font-weight:900;letter-spacing:.08em;text-transform:uppercase;font-size:12px;color:#8b7bf0}
.say .txt{font-size:clamp(20px,2.6vw,30px);font-weight:900;color:#2f2856;margin-top:4px}
.do{margin-top:8px;font-weight:900;color:#2f6d4f;font-size:clamp(17px,2vw,22px)}
.tip{margin-top:8px;font-weight:800;font-style:italic;color:#a9701a}
li{font-size:clamp(17px,1.9vw,22px);font-weight:800;margin:6px 0}
ul{padding-left:22px;margin:6px 0}
a.link{display:inline-flex;align-items:center;gap:10px;margin:6px 10px 0 0;padding:12px 16px;border-radius:16px;
  background:#eef0ff;color:#3a2f7a;font-weight:900;text-decoration:none;font-size:clamp(15px,1.7vw,19px);
  border:2px solid #d9dcff}
a.link:hover{background:#e0e3ff}
a.link.alt{background:#fff;border-style:dashed}
.note{border-radius:18px;padding:14px 16px;font-weight:800;font-size:clamp(16px,1.8vw,20px);margin-top:12px}
.note.home{background:#eafff4;color:#1f7a4f}
.note.tutor{background:#eef0ff;color:#3a2f7a}
.note.family{background:#fff6e6;color:#9a6a10}
.foot{margin-top:34px;font-size:13px;font-weight:700;color:#9a97bb;text-align:center}
.pill{display:inline-block;background:#f3f0ff;color:#5a4fd0;border-radius:999px;padding:5px 12px;font-weight:900;font-size:14px;margin:4px 6px 0 0}
`;

/* ────────────────────────────────────────────────────────────────────────────
   Media rendering
   ──────────────────────────────────────────────────────────────────────────── */

const mediaCard = (m: KidLessonMedia): string => {
  const search = m.searchUrl && m.searchUrl !== m.url
    ? `<a class="link alt" href="${esc(m.searchUrl)}" target="_blank" rel="noopener">🔎 Search for it</a>`
    : '';
  const why = m.why ? `<div class="tip">${esc(m.why)}</div>` : '';
  const source = m.source ? `<span class="pill">${esc(m.source)}</span>` : '';
  return `<div class="card">
    <div class="chip">${mediaKindEmoji(m.kind)} ${esc(mediaKindLabel(m.kind))}</div>
    <h2>${esc(m.title)}</h2>
    <div class="row" style="margin-top:8px">
      <a class="link" href="${esc(m.url)}" target="_blank" rel="noopener">▶ Open it</a>
      ${search}
    </div>
    ${why}
    <div style="margin-top:8px">${source}</div>
  </div>`;
};

/** The player for a class video: an embed when we can, a big button when we cannot. */
const mediaPlayer = (m: KidLessonMedia): string => {
  const embed = m.kind === 'video' && (m.embeddable || /youtu/i.test(m.url)) ? youtubeEmbedUrl(m.url) : null;
  if (embed) {
    return `<div class="card">
      <div class="chip">${mediaKindEmoji(m.kind)} ${esc(m.title)}</div>
      <iframe src="${esc(embed)}" title="${esc(m.title)}" allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        style="width:100%;aspect-ratio:16/9;border:0;border-radius:20px;margin-top:10px;background:#000"></iframe>
      <div class="row" style="margin-top:8px">
        <a class="link" href="${esc(m.url)}" target="_blank" rel="noopener">▶ Open on YouTube</a>
        ${m.searchUrl && m.searchUrl !== m.url ? `<a class="link alt" href="${esc(m.searchUrl)}" target="_blank" rel="noopener">🔎 Search</a>` : ''}
      </div>
      ${m.why ? `<div class="tip">${esc(m.why)}</div>` : ''}
    </div>`;
  }
  return mediaCard(m);
};

/* ────────────────────────────────────────────────────────────────────────────
   Shared fragments
   ──────────────────────────────────────────────────────────────────────────── */

function header(learner: Learner | undefined, teacher: TeacherProfile | undefined, band: KidAgeBand, lesson: KidLesson): string {
  const bandProfile = KID_BANDS[band];
  const who = [learner?.name, learner?.age ? `age ${learner.age}` : ''].filter(Boolean).join(' · ');
  const tutor = teacher?.characterName ? `${teacher.characterName}` : 'the tutor';
  return `<div class="top">
    <div>
      <div class="chip">${bandProfile.emoji} ${esc(bandProfile.label)} · ${esc(bandProfile.ages)}${who ? ` · ${esc(who)}` : ''}</div>
      <h1>${esc(lesson.title)}</h1>
      <p class="sub">${esc(lesson.durationMinutes ? `${lesson.durationMinutes} minutes` : bandProfile.sessionMinutes)} · tutor: ${esc(tutor)}</p>
    </div>
  </div>`;
}

const footer = (extra = ''): string =>
  `<p class="foot">Made with the Kids Lesson Creator · ${esc(extra)}</p>`;

/* ────────────────────────────────────────────────────────────────────────────
   Phase 1 — Before class
   ──────────────────────────────────────────────────────────────────────────── */

function prepHtml(lesson: KidLesson, band: KidAgeBand, learner?: Learner, teacher?: TeacherProfile): string {
  const classMedia = (lesson.media || []).filter((m) => m.where !== 'home');
  const homeMedia = (lesson.media || []).filter((m) => m.where === 'home');
  const words = lesson.words || [];

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(lesson.title)} — before class</title>
<style>${BASE_CSS}
.step{border-left-color:#f0a53a}
.say{background:#fff6e6}.say .lbl{color:#c98a1e}.say .txt{color:#5c4413}
</style></head><body><div class="wrap">
${header(learner, teacher, band, lesson)}
<p class="chip">🧰 Before class — get ready while the room is quiet</p>

${lesson.objectives?.length ? `<div class="card"><h2>🎯 What the child will do</h2><ul>${lesson.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}

${lesson.materials?.length ? `<div class="card"><h2>🧺 Get these ready</h2><ul>${lesson.materials.map((m) => `<li>☐ ${esc(m)}</li>`).join('')}</ul></div>` : ''}

${lesson.sheet?.tasks?.length ? `<div class="card"><h2>✏️ ${esc(lesson.sheet.name || 'The page')} — every task has a line to say</h2>
  <p class="sub">Print the page, then work down this list with it in front of you. Nothing is done in silence: you say the line, the child does the task and says their line back. A task with no talking turn is a task that teaches handwriting instead of English.</p>
  <ol>${lesson.sheet.tasks.map((t) => `<li>${esc(t.emoji || '✏️')} <b>${esc(t.do)}</b>${t.paper ? ` <span class="s-min">· on paper: ${esc(t.paper)}</span>` : ''}${t.boxes ? ` <span class="s-min">· ${esc(t.boxes)} ruled boxes</span>` : ''}${t.say ? `<div class="sub">🗣 You say: “${esc(t.say)}”</div>` : ''}${t.childSays ? `<div class="sub">🧒 They say: “${esc(t.childSays)}”</div>` : ''}</li>`).join('')}</ol>
  ${lesson.sheet.traceWords?.length ? `<p class="sub">✍️ Trace first${band === 'veryYoung' ? ' — with a FINGER, never a pencil' : ', then write them alone'}: <b>${lesson.sheet.traceWords.map((w) => esc(w)).join(' · ')}</b></p>` : ''}
  ${lesson.sheet.talkFrame ? `<p class="sub">🗣 The sentence they finish about their own page: “${esc(lesson.sheet.talkFrame)}”</p>` : ''}
  ${lesson.sheet.answerKey?.length ? `<p class="sub">✅ Their own key — the child marks these after part 3: ${lesson.sheet.answerKey.map((a) => esc(a)).join(' · ')}</p>` : ''}
</div>` : ''}

${lesson.quest?.jobs?.length ? `<div class="card"><h2>🏠 ${esc(lesson.quest.name || 'The quest')} — every job has its XP and its line</h2>
  <p class="sub">${lesson.quest.partner ? `The week is done with ${esc(lesson.quest.partner)}. ` : ''}One job a night, never more: you say the line printed on the job, the child does it and says their line back, and the XP and the proof are the child's to write. Nothing on this board needs a screen.</p>
  <ol>${lesson.quest.jobs.map((j) => `<li>${esc(j.emoji || '🏠')} <b>${esc(j.do)}</b>${j.xp ? ` <span class="s-min">· ⭐ ${esc(j.xp)} XP</span>` : ''}${j.night ? ` <span class="s-min">· ${esc(j.night)}</span>` : ''}${j.proof ? `<div class="sub">📸 Proof: ${esc(j.proof)}</div>` : ''}${j.say ? `<div class="sub">🗣 You say: “${esc(j.say)}”</div>` : ''}${j.childSays ? `<div class="sub">🧒 They say: “${esc(j.childSays)}”</div>` : ''}</li>`).join('')}</ol>
  ${lesson.quest.master ? `<p class="sub">🧑✈️ The child’s own job of running the board: <b>${esc(lesson.quest.master)}</b></p>` : ''}
  ${lesson.quest.tally ? `<p class="sub">🧾 The tally: ${esc(lesson.quest.tally)}</p>` : ''}
  ${lesson.quest.reward ? `<p class="sub">🏆 The week adds up to: ${esc(lesson.quest.reward)}</p>` : ''}
</div>` : ''}

${lesson.game?.items?.length && lesson.quiz ? `<div class="card"><h2>❓ ${esc(lesson.quiz.name || 'The quiz night')} — every question has a sentence to answer in</h2>
  <p class="sub">${lesson.game.items[0]?.childSays ? 'The quiz player prints each question’s own sentence inside its “Yes!”, so a right tap is still a spoken turn. ' : ''}Show the real photo first, read all the options, then ask for the sentence — a question that ends in a tap teaches pointing.${lesson.quiz.scoreLine ? ` The score is said out loud: “${esc(lesson.quiz.scoreLine)}”.` : ''}</p>
  <ol>${lesson.game.items.map((it) => `<li>${esc(it.picture || '❓')} <b>${esc(it.prompt)}</b>${it.distractors?.length ? ` <span class="s-min">· options: ${[it.answer, ...it.distractors].map((o) => esc(o)).join(' / ')}</span>` : ''}${it.childSays ? `<div class="sub">🗣 They answer in a sentence: “${esc(it.childSays)}”</div>` : ''}${it.ask ? `<div class="sub">➕ Then ask: “${esc(it.ask)}”</div>` : ''}${it.photoQuery ? `<div class="sub">📷 Real photo: ${esc(it.photoQuery)}${it.lookFor ? ` — look for ${esc(it.lookFor)}` : ''}</div>` : ''}</li>`).join('')}</ol>
  ${lesson.quiz.rounds?.length ? `<p class="sub">🔁 The rounds, in order: <b>${lesson.quiz.rounds.map((r) => esc(r)).join(' → ')}</b></p>` : ''}
  ${lesson.quiz.master ? `<p class="sub">🎤 The final round is the CHILD’s: ${esc(lesson.quiz.master)}</p>` : ''}
</div>` : ''}

${lesson.deck?.cards?.length ? `<div class="card"><h2>🃏 ${esc(lesson.deck.name || 'The card pack')} — every card carries its own line to say</h2>
  <p class="sub">${lesson.deck.cards.some((c) => c.do) ? 'The BACK of every card is a body action, not another label: the child says the word and does the thing. ' : 'The BACK of every card is the child\u2019s own WHOLE sentence, not the word again — a card answered with one word teaches pointing. '}Deal the pack face up and LOOK before you test anything, say each card together, then turn it and wait three seconds.${lesson.deck.cards.some((c) => c.review?.length) ? ' Every fifth card mixes two earlier words — that is where the memory work happens.' : ''}</p>
  <ol>${lesson.deck.cards.map((c) => `<li>${esc(c.emoji || '🃏')} <b>${esc(c.word)}</b>${c.review?.length ? ` <span class="s-min">· 🃏 mixes ${c.review.map((w) => esc(w)).join(' + ')}</span>` : ''}${c.say ? `<div class="sub">🗣 You say: “${esc(c.say)}”</div>` : ''}${c.childSays ? `<div class="sub">🧒 They say: “${esc(c.childSays)}”</div>` : ''}${c.do ? `<div class="sub">🤸 Back of the card — they DO it: ${esc(c.do)}</div>` : ''}${c.cue ? `<div class="sub">👀 The cue on the card: ${esc(c.cue)}</div>` : ''}${c.sentence ? `<div class="sub">🧺 The word in their own world: “${esc(c.sentence)}”</div>` : ''}</li>`).join('')}</ol>
  ${lesson.deck.passes?.length ? `<p class="sub">🔁 The passes of the night, in order: <b>${lesson.deck.passes.map((p) => esc(p)).join(' → ')}</b></p>` : ''}
  ${lesson.deck.master ? `<p class="sub">🎤 The last pass is the CHILD’s: ${esc(lesson.deck.master)}</p>` : ''}
  ${lesson.deck.scoreLine ? `<p class="sub">🏆 Say the finish line out loud together: “${esc(lesson.deck.scoreLine)}”</p>` : ''}
  ${lesson.deck.spacing?.length ? `<p class="sub">🗓 The real week, said at the table with NO screen: <b>${lesson.deck.spacing.map((s) => esc(s)).join(' · ')}</b></p>` : ''}
</div>` : ''}

${lesson.worksheet?.length ? `<div class="card"><h2>🖨 Print this</h2><ul>${lesson.worksheet.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}

${words.length ? `<div class="card"><h2>🔤 The words, one more look</h2><div class="grid">
  ${words.map((w) => `<div class="word"><span class="w-emoji">${esc(w.emoji || '🔤')}</span><div class="w-name">${esc(w.word)}</div>${w.sayAloud ? `<div class="w-say">${esc(w.sayAloud)}</div>` : ''}${w.meaning ? `<div class="w-meaning">${esc(w.meaning)}</div>` : ''}</div>`).join('')}
</div></div>` : ''}

${lesson.run ? `<div class="card"><h2>⏱ The session clock — ${esc(lesson.run.targetMinutes || lesson.durationMinutes || 30)} minutes</h2>
  ${lesson.run.brainBreaks?.length ? `<p class="sub">🧘 Brain breaks, one at each phase edge: ${lesson.run.brainBreaks.map((b) => esc(b)).join(' · ')}</p>` : ''}
  ${lesson.run.exitTicket?.length ? `<p class="sub">🎫 Exit ticket — ask for these before the child leaves: ${lesson.run.exitTicket.map((t) => esc(t)).join(' · ')}</p>` : ''}
  ${lesson.run.nextTime ? `<p class="sub">⏭ Next time starts with: ${esc(lesson.run.nextTime)}</p>` : ''}
</div>` : ''}

${lesson.phonics ? `<div class="card"><h2>🔤 The sound ladder — ${esc(lesson.phonics.sound)}, in this order</h2>
  <p class="sub">Hear it → say it → find it → blend it → read it → spell it → write it. Do not skip a rung: a child who skips one is memorising shapes instead of decoding.</p>
  ${lesson.phonics.mouth ? `<p class="sub">👄 Watch my mouth: ${esc(lesson.phonics.mouth)}</p>` : ''}
  ${lesson.phonics.ladder?.length ? `<ol>${lesson.phonics.ladder.map((r) => `<li><b>${esc(r.step)}</b>${r.talkTarget ? ` <span class="s-min">· 🗣 ${esc(r.talkTarget)} out loud</span>` : ''}${r.what ? `<div class="sub">${esc(r.what)}</div>` : ''}</li>`).join('')}</ol>` : ''}
  ${lesson.phonics.minimalPairs?.length ? `<p class="sub">👂 Hear the difference — say both words, the child says which one they heard: ${lesson.phonics.minimalPairs.map((p) => esc(`${p.a} / ${p.b}`)).join(' · ')}</p>` : ''}
  ${lesson.phonics.realWords?.length ? `<p class="sub">✅ Real words: <b>${lesson.phonics.realWords.map((w) => esc(w)).join(' · ')}</b></p>` : ''}
  ${lesson.phonics.nonsenseWords?.length ? `<p class="sub">🎲 Made-up words — a real word can be read from memory, these can only be sounded out: <b>${lesson.phonics.nonsenseWords.map((w) => esc(w)).join(' · ')}</b></p>` : ''}
  ${lesson.phonics.dictation?.length ? `<p class="sub">✏️ Dictation: <b>${lesson.phonics.dictation.map((w) => esc(w)).join(' · ')}</b>${lesson.phonics.answerKey?.length ? ` — answers: ${lesson.phonics.answerKey.map((w) => esc(w)).join(' · ')}` : ''}</p>` : ''}
</div>` : ''}

${lesson.movement?.commands?.length ? `<div class="card"><h2>🤸 The command ladder — ${lesson.movement.commands.length} commands, one of them new</h2>
  <p class="sub">The body learns first: model every command yourself, twice and big, then let the child copy it and say the command back. Nothing on this page is read by the child.</p>
  ${lesson.movement.newCommand ? `<p class="sub">🆕 Today’s ONE new command: <b>${esc(lesson.movement.newCommand)}</b> — every other one they already know, which is why they can answer instantly.</p>` : ''}
  <ol>${lesson.movement.commands.map((c) => `<li>${esc(c.emoji || '🤸')} <b>${esc(c.command)}</b>${c.do ? ` — “${esc(c.do)}”` : ''}${c.twoStep ? `<div class="sub">➕ For your fours and fives: “${esc(c.twoStep)}”</div>` : ''}</li>`).join('')}</ol>
  ${lesson.movement.speedPlay?.length ? `<p class="sub">⚡ Same words, four voices: ${lesson.movement.speedPlay.map((s) => esc(s)).join(' · ')}</p>` : ''}
  ${lesson.movement.bossRound?.length ? `<p class="sub">👑 The boss round — put the crown on the child and let THEM give these: <b>${lesson.movement.bossRound.map((c) => esc(c)).join(' · ')}</b>. Nothing moves until the child says it in English.</p>` : ''}
</div>` : ''}

${lesson.routine?.moments?.length ? `<div class="card"><h2>🚿 ${esc(lesson.routine.name || 'The routine')} — the same words, at the same moment, every day</h2>
  <p class="sub">Say the line first, then do the action as you say it. Never test, never translate: the same sentence at the same real moment, all week, is the whole method.</p>
  ${lesson.routine.sameLine ? `<p class="sub">🔁 Say this the same way at every moment: <b>${esc(lesson.routine.sameLine)}</b></p>` : ''}
  <ol>${(lesson.routine.moments || []).map((m) => `<li>${esc(m.emoji || '🚿')} <b>${esc(m.moment)}</b> — “${esc(m.say)}”${m.childSays ? `<div class="sub">💬 The child says: ${esc(m.childSays)}</div>` : ''}${m.childDoes ? `<div class="sub">🧒 ${esc(m.childDoes)}</div>` : ''}${m.photoQuery ? `<div class="sub">🔎 Real photo to look at together: ${esc(m.photoQuery)}</div>` : ''}</li>`).join('')}</ol>
  ${lesson.routine.fillIn ? `<p class="sub">🗣 The child finishes this line: “${esc(lesson.routine.fillIn)}”</p>` : ''}
  ${lesson.routine.pronunciation?.length ? `<p class="sub">👨‍👩‍👧 Say it like this: ${lesson.routine.pronunciation.map((p) => `${esc(p.word)}${p.hint ? ` = ${esc(p.hint)}` : ''}`).join(' · ')}</p>` : ''}
</div>` : ''}

${lesson.circle?.hello?.length || lesson.circle?.surprise ? `<div class="card"><h2>🔄 ${esc(lesson.circle?.name || 'Our circle')} — the same circle, every week, with ONE new word inside it</h2>
  <p class="sub">The order and the words do not change: the hello, the pictures, the wait, the surprise, the goodbye. Only the thing in the box is new, so the child spends the rest of the session on ground they already know — and a tutor who changes the hello next week has taught a different lesson.</p>
  ${lesson.circle?.hello?.length ? `<p class="sub">👋 The hello song, word for word: <b>${lesson.circle.hello.map((l) => esc(l)).join(' / ')}</b></p>` : ''}
  ${lesson.circle?.check?.length ? `<ul>${lesson.circle.check.map((c) => `<li>${esc(c.emoji || '👉')} <b>${esc(c.look)}</b> — the child points, you say the word${c.childSays ? ` <span class="s-min">· they say: ${esc(c.childSays)}</span>` : ''}</li>`).join('')}</ul>` : ''}
  ${lesson.circle?.ask?.length ? `<p class="sub">🗣 The check-in questions, in order <b>${lesson.circle.ask.map((q) => esc(q)).join(' · ')}</b> — the child asks these back at 5-12.</p>` : ''}
  ${lesson.circle?.waitLine ? `<p class="sub">🪄 The same wait before every reveal: <b>“${esc(lesson.circle.waitLine)}”</b> — the child says the last word with you, every single time.</p>` : ''}
  ${lesson.circle?.surprise ? `<p class="sub">🎁 The ONE new thing in the box: <b>${esc(lesson.circle.surprise)}</b></p>` : ''}
  ${lesson.circle?.goodbye?.length ? `<p class="sub">👋 The goodbye, word for word: <b>${lesson.circle.goodbye.map((l) => esc(l)).join(' / ')}</b></p>` : ''}
  ${lesson.circle?.nextTime ? `<p class="sub">🗓 The child closes with: “${esc(lesson.circle.nextTime)}”</p>` : ''}
</div>` : ''}

${lesson.storyWalk?.beats?.length ? `<div class="card"><h2>🤸 ${esc(lesson.storyWalk.title || 'The story')} — every beat is an ACTION the child does</h2>
  <p class="sub">Tell the line, then do the action yourself, twice and big, and let the child copy. A beat they only listen to is not a beat — if the action is missing, invent one.</p>
  ${lesson.storyWalk.echo ? `<p class="sub">🔁 The echo, said in EVERY beat — the child joins in without being asked: <b>${esc(lesson.storyWalk.echo)}</b></p>` : ''}
  <ol>${(lesson.storyWalk.beats || []).map((b) => `<li>${esc(b.emoji || '🤸')} <b>${esc(b.line)}</b>${b.action ? `<div class="sub">🧒 The child does: ${esc(b.action)}</div>` : ''}${b.say ? `<div class="sub">💬 The child says: “${esc(b.say)}”</div>` : ''}</li>`).join('')}</ol>
  ${lesson.storyWalk.map?.length ? `<p class="sub">🗺️ The story map, in order — the retell is ACTED from this before it is said: ${lesson.storyWalk.map.map((m) => esc(m)).join(' → ')}</p>` : ''}
  ${lesson.storyWalk.choose ? `<p class="sub">🗣 The one beat where the CHILD decides: “${esc(lesson.storyWalk.choose)}” — their first own sentence in the lesson.</p>` : ''}
  ${lesson.storyWalk.chain?.length ? `<p class="sub">🔗 Two steps in one command — say the WHOLE sentence first, and let them hold both halves: ${lesson.storyWalk.chain.map((c) => esc(c)).join(' · ')}</p>` : ''}
</div>` : ''}

${lesson.story?.pages?.length ? `<div class="card"><h2>📚 The story — ${lesson.story.pages.length} pages, read it once yourself first</h2>
  <p class="sub">Tell it, do not read it. The child is listening, not decoding.</p>
  <ol>${lesson.story.pages.map((p) => `<li>${esc(p.emoji || '📖')} ${p.speaker ? `<b>${esc(p.speaker)}:</b> ` : ''}${esc(p.text)}</li>`).join('')}</ol>
</div>` : ''}

${lesson.story?.map ? `<div class="card"><h2>🗺 The story map — every retell is built from these five</h2>
  <ul>${[['Who', lesson.story.map.character], ['Where', lesson.story.map.setting], ['Wanted', lesson.story.map.problem], ['Felt', lesson.story.map.feeling], ['Ended', lesson.story.map.ending]].map(([k, v]) => `<li><b>${esc(String(k))}:</b> ${esc(String(v || '—'))}</li>`).join('')}</ul>
</div>` : ''}

${lesson.story?.rungs?.length ? `<div class="card"><h2>🗣 The retelling ladder — the same story back, three times</h2>
  <p class="sub">This is where the child does the talking. Do not skip a rung because it went well: the third one is the point.</p>
  ${lesson.story.rungs.map((r, i) => `<div class="step"><div class="s-name">Rung ${i + 1} · ${esc(r.with)}${r.talkTarget ? ` <span class="s-min">· 🗣 ${esc(r.talkTarget)} sentences</span>` : ''}</div>
    <div class="say"><div class="lbl">Hand it over like this</div><div class="txt">${esc(r.prompt)}</div></div></div>`).join('')}
</div>` : ''}

${lesson.story?.roleplay ? `<div class="card"><h2>🎭 Hot-seat — ${esc(lesson.story.roleplay.emoji || '🎭')} you are ${esc(lesson.story.roleplay.character)}</h2>
  <p class="sub">You are in role. The CHILD asks the questions — that is the whole exercise.</p>
  ${lesson.story.roleplay.questions?.length ? `<ul>${lesson.story.roleplay.questions.map((q) => `<li>❓ ${esc(q)}</li>`).join('')}</ul>` : ''}
  ${lesson.story.roleplay.lines?.length ? `<p class="sub">Lines the child can say in role: ${lesson.story.roleplay.lines.map((l) => esc(l)).join(' · ')}</p>` : ''}
</div>` : ''}

${lesson.story?.pairedBook ? `<div class="card"><h2>📖 A real read-aloud to pair with it</h2>
  <p class="sub"><b>${esc(lesson.story.pairedBook.title)}</b>${lesson.story.pairedBook.source ? ` — ${esc(lesson.story.pairedBook.source)}` : ''}</p>
  ${lesson.story.pairedBook.why ? `<p class="sub">${esc(lesson.story.pairedBook.why)}</p>` : ''}
  <div class="row"><a class="link" href="${esc(lesson.story.pairedBook.url)}" target="_blank" rel="noopener">▶ Open it</a></div>
</div>` : ''}

${lesson.scene?.title ? `<div class="card"><h2>📷 The real picture & clip</h2>
  <p class="sub"><b>${esc(lesson.scene.title)}</b>${lesson.scene.photoQuery ? ` — look for a real photo of: ${esc(lesson.scene.photoQuery)}` : ''}</p>
  ${lesson.scene.listenFor ? `<p class="sub">👂 ${esc(lesson.scene.listenFor)}</p>` : ''}
  ${lesson.scene.clipUrl ? `<div class="row"><a class="link" href="${esc(lesson.scene.clipUrl)}" target="_blank" rel="noopener">▶ ${esc(lesson.scene.clipTitle || 'Open the clip')}</a></div>` : ''}
</div>` : ''}

${lesson.steps?.length ? `<div class="card"><h2>🕐 The 30-minute run sheet</h2>
  <p class="sub">Each phase has a minute FLOOR — it does not end before that even if the child is flying — and a TALK TARGET: what the child owes out loud. If a phase runs short, empty its reserve instead of moving on.</p>
  ${lesson.steps.map((s, i) => `<div class="step">
    <div class="s-name">${s.phase ? `<b>${esc(s.phase)}</b> · ` : ''}${i + 1}. ${esc(s.name)}${s.minutes ? ` <span class="s-min">· ${esc(s.minutes)} min</span>` : ''}${s.floorMinutes ? ` <span class="s-min">· floor ${esc(s.floorMinutes)} min</span>` : ''}${s.talkTarget ? ` <span class="s-min">· 🗣 ${esc(s.talkTarget)} out loud</span>` : ''}</div>
    ${s.teacherScript ? `<div class="say"><div class="lbl">Say this</div><div class="txt">${esc(s.teacherScript)}</div></div>` : ''}
    ${s.childAction ? `<div class="do">🧒 ${esc(s.childAction)}</div>` : ''}
    ${s.sayFrame ? `<div class="say"><div class="lbl">The child finishes this</div><div class="txt">${esc(s.sayFrame)}</div></div>` : ''}
    ${s.questionLadder?.length ? `<div class="tip">❓ Ask: ${s.questionLadder.map((q) => esc(q)).join(' → ')}</div>` : ''}
    ${s.reserve?.length ? `<div class="tip">➕ If this phase runs short: ${s.reserve.map((r) => esc(r)).join(' · ')}</div>` : ''}
    ${s.print ? `<div class="tip">🖨 ${esc(s.print)}</div>` : ''}
    ${s.tip ? `<div class="tip">💡 ${esc(s.tip)}</div>` : ''}
  </div>`).join('')}
</div>` : ''}

${lesson.mission?.title ? `<div class="card"><h2>🌍 The real-world mission</h2>
  <p class="sub"><b>${esc(lesson.mission.title)}</b> — ${esc(lesson.mission.realWorld)}</p>
  ${lesson.mission.steps?.length ? `<ul>${lesson.mission.steps.map((m) => `<li>☐ ${esc(m)}</li>`).join('')}</ul>` : ''}
  ${lesson.mission.sayIt ? `<div class="say"><div class="lbl">Done when they say</div><div class="txt">${esc(lesson.mission.sayIt)}</div></div>` : ''}
</div>` : ''}

${classMedia.length ? `<div class="card"><h2>📺 Check these links now</h2>
  <p class="sub">Play each one before the child arrives — if a video has moved, the Search button finds it again.</p>
  ${classMedia.map((m) => `<div style="margin:14px 0"><div class="chip">${mediaKindEmoji(m.kind)} ${esc(m.title)}</div>
    <div class="row" style="margin-top:6px"><a class="link" href="${esc(m.url)}" target="_blank" rel="noopener">▶ Open</a>
    ${m.searchUrl && m.searchUrl !== m.url ? `<a class="link alt" href="${esc(m.searchUrl)}" target="_blank" rel="noopener">🔎 Search</a>` : ''}</div>
    ${m.why ? `<div class="tip">${esc(m.why)}</div>` : ''}</div>`).join('')}
</div>` : ''}

${homeMedia.length ? `<div class="card"><h2>🏠 For the family to try at home</h2>
  ${homeMedia.map((m) => `<div style="margin:12px 0"><div class="chip">${mediaKindEmoji(m.kind)} ${esc(m.title)}</div>
  <div class="row" style="margin-top:6px"><a class="link" href="${esc(m.url)}" target="_blank" rel="noopener">▶ Open</a>
  ${m.searchUrl && m.searchUrl !== m.url ? `<a class="link alt" href="${esc(m.searchUrl)}" target="_blank" rel="noopener">🔎 Search</a>` : ''}</div></div>`).join('')}
</div>` : ''}

${lesson.teacherNote ? `<div class="note tutor">🍎 For you, before you start: ${esc(lesson.teacherNote)}</div>` : ''}
${footer('page 1 of 3 · before class')}
</div></body></html>`;
}

/* ────────────────────────────────────────────────────────────────────────────
   Phase 2 — In class (the presenter)
   ──────────────────────────────────────────────────────────────────────────── */

interface ClassSlide {
  kicker: string;
  title: string;
  big?: string;
  say?: string;
  do?: string;
  tip?: string;
  html?: string;
  emoji?: string;
  /* ── The run sheet, carried onto the printed/offline deck ──────────────────
     The three lines that make a saved page teach the same session the tutor
     previewed: the frame the child completes, the questions to always have
     ready, and what to do when a phase finishes early. */
  /** The sentence frame the child finishes out loud. */
  frame?: string;
  /** Three questions, easy → why → imagine. */
  ladder?: string[];
  /** What to do here if the phase runs short. The lesson deepens; it never ends. */
  reserve?: string[];
  /** The minute floor this phase may not go under. */
  floor?: number;
  /** How many spoken turns the child owes in this phase. */
  talk?: number;
  /** A real link that belongs on this slide (the scene's clip). */
  link?: string;
}

function classSlides(lesson: KidLesson, band: KidAgeBand): ClassSlide[] {
  const veryYoung = band === 'veryYoung';
  const slides: ClassSlide[] = [];
  const words = lesson.words || [];
  const steps = lesson.steps || [];

  slides.push({
    kicker: veryYoung ? 'Get ready to play' : 'Let\'s begin',
    title: lesson.title,
    big: veryYoung ? '🎉' : '🚀',
    say: veryYoung ? 'Sit comfortably. Are you ready?' : 'Are you ready? Let\'s start!',
    emoji: veryYoung ? '🧸' : '🚀',
  });

  /* The real photograph opens the session — it is the hook's picture, and a real
     photo of the real thing beats any drawing for a child who is still building the
     concept. The clip rides with it, carrying its listening job. */
  if (lesson.scene?.title) {
    slides.push({
      kicker: '📷 Look at this together',
      title: lesson.scene.title,
      big: '📷',
      say: lesson.scene.title,
      do: lesson.scene.listenFor,
      tip: lesson.scene.clipTitle ? `🎬 ${lesson.scene.clipTitle}` : undefined,
      link: lesson.scene.clipUrl,
    });
  }

  /* The sound ladder opens the deck, because it is the map of the whole session and
     the order is not negotiable: hear it before you ever see it. */
  if (lesson.phonics) {
    const p = lesson.phonics;
    slides.push({
      kicker: '🔤 The sound ladder',
      title: p.sound,
      big: '🔤',
      html: [
        p.mouth ? `<p class="sub">👄 Watch my mouth: ${esc(p.mouth)}</p>` : '',
        p.ladder?.length
          ? `<ol>${p.ladder.map((r) => `<li><b>${esc(r.step)}</b>${r.talkTarget ? ` <span class="s-min">· 🗣 ${esc(r.talkTarget)}</span>` : ''}${r.what ? ` — ${esc(r.what)}` : ''}</li>`).join('')}</ol>`
          : '',
        p.minimalPairs?.length
          ? `<p class="sub">👂 Hear the difference: ${p.minimalPairs.map((x) => esc(`${x.a} / ${x.b}`)).join(' · ')}</p>`
          : '',
        p.realWords?.length
          ? `<p class="sub">✅ ${p.realWords.map((w) => esc(w)).join(' · ')}${p.nonsenseWords?.length ? ` · 🎲 ${p.nonsenseWords.map((w) => esc(w)).join(' · ')}` : ''}</p>`
          : '',
      ].filter(Boolean).join(''),
      say: p.sound,
    });
  }

  /* The command ladder: the map of a TPR session. Six known commands plus exactly one
     new one is the ratio the method runs on, so the new one is named on the slide. */
  if (lesson.movement?.commands?.length) {
    const m = lesson.movement;
    slides.push({
      kicker: '🤸 The command ladder',
      title: m.newCommand ? `Today’s new command: ${m.newCommand}` : 'Do what I say',
      big: '🤸',
      html: [
        `<ol>${m.commands.map((c) => `<li>${esc(c.emoji || '🤸')} <b>${esc(c.command)}</b>${c.do ? ` — “${esc(c.do)}”` : ''}${c.twoStep ? ` <span class="s-min">· ➕ ${esc(c.twoStep)}</span>` : ''}</li>`).join('')}</ol>`,
        m.speedPlay?.length ? `<p class="sub">⚡ Same words, four voices: ${m.speedPlay.map((s) => esc(s)).join(' · ')}</p>` : '',
      ].filter(Boolean).join(''),
      say: m.commands[0].do || m.commands[0].command,
    });
  }

  /* The three real moments: the map of the day, written for the grown-up as much as
     the child — the exact line to say at each moment, and what the child says back. */
  if (lesson.routine?.moments?.length) {
    const r = lesson.routine;
    slides.push({
      kicker: '🚿 The three real moments',
      title: r.name || 'Our routine',
      big: '🚿',
      html: [
        r.sameLine ? `<p class="sub">🔁 Say this the same way every time: <b>${esc(r.sameLine)}</b></p>` : '',
        `<ol>${r.moments.map((m) => `<li>${esc(m.emoji || '🚿')} <b>${esc(m.moment)}</b> — “${esc(m.say)}”${m.childSays ? ` <span class="s-min">· 💬 ${esc(m.childSays)}</span>` : ''}</li>`).join('')}</ol>`,
        r.fillIn ? `<p class="sub">🗣 The child finishes the line: “${esc(r.fillIn)}”</p>` : '',
        r.pronunciation?.length
          ? `<p class="sub">👨‍👩‍👧 Say it like this: ${r.pronunciation.map((p) => `${esc(p.word)}${p.hint ? ` = ${esc(p.hint)}` : ''}`).join(' · ')}</p>`
          : '',
      ].filter(Boolean).join(''),
      say: r.moments[0].say,
    });
  }

  /* The circle: the whole ritual printed on one slide — the hello, the pictures, the
     wait, the surprise, the goodbye — because the session is walking down it in
     exactly that order, and the tutor has to be able to run it again next week. */
  if (lesson.circle && (lesson.circle.hello?.length || lesson.circle.surprise)) {
    const c = lesson.circle;
    slides.push({
      kicker: '🔄 The same circle, every week',
      title: c.name || 'Our circle',
      big: '🔄',
      html: [
        c.hello?.length ? `<p class="sub">👋 The hello, word for word: <b>${c.hello.map((l) => esc(l)).join(' / ')}</b></p>` : '',
        c.check?.length
          ? `<p class="sub">👉 The big pictures — the child points, you say the word back: ${c.check.map((p) => `${esc(p.emoji || '👉')} ${esc(p.look)}${p.childSays ? ` (“${esc(p.childSays)}”)` : ''}`).join(' · ')}</p>`
          : '',
        c.ask?.length ? `<p class="sub">🗣 The check-in, in order: <b>${c.ask.map((q) => esc(q)).join(' · ')}</b></p>` : '',
        c.waitLine ? `<p class="sub">🪄 The same wait, every time: <b>“${esc(c.waitLine)}”</b></p>` : '',
        c.surprise ? `<p class="sub">🎁 The ONE new thing in the box: <b>${esc(c.surprise)}</b></p>` : '',
        c.goodbye?.length ? `<p class="sub">👋 The goodbye, word for word: <b>${c.goodbye.map((l) => esc(l)).join(' / ')}</b></p>` : '',
      ].filter(Boolean).join(''),
      say: c.hello?.[0] || c.waitLine || c.surprise,
    });
  }

  /* The story walk: the map the whole session works down, printed beat by beat —
     every beat a sentence to TELL and an action to DO, because in this kind a beat
     the child only listens to is not a beat. */
  if (lesson.storyWalk?.beats?.length) {
    const w = lesson.storyWalk;
    slides.push({
      kicker: '🤸 The story you walk through',
      title: w.title || lesson.title,
      big: '🤸',
      html: [
        w.echo ? `<p class="sub">🔁 It comes back in EVERY beat — the child joins in: <b>${esc(w.echo)}</b></p>` : '',
        `<ol>${w.beats.map((b) => `<li>${esc(b.emoji || '🤸')} ${esc(b.line)}${b.action ? ` <span class="s-min">· 🧒 ${esc(b.action)}</span>` : ''}${b.say ? ` <span class="s-min">· 💬 “${esc(b.say)}”</span>` : ''}</li>`).join('')}</ol>`,
        w.choose ? `<p class="sub">🗣 The beat the CHILD decides: “${esc(w.choose)}”</p>` : '',
        w.chain?.length ? `<p class="sub">🔗 Two steps in one command: ${w.chain.map((c) => esc(c)).join(' · ')}</p>` : '',
        w.map?.length ? `<p class="sub">🗺️ The story map — the child acts the retell from this, in order: ${w.map.map((m) => esc(m)).join(' → ')}</p>` : '',
      ].filter(Boolean).join(''),
      say: w.echo || w.beats[0].line,
    });
  }

  /* The story, then the same story handed back three times with less help. This is
     the printed-deck version of the retelling ladder — the practice that turns a
     story a child heard into a story a child can tell. */
  if (lesson.story?.pages?.length) {
    slides.push({
      kicker: '📚 The story',
      title: lesson.title,
      big: '📚',
      html: `<ul>${lesson.story.pages.map((p) => `<li>${p.speaker ? `<b>${esc(p.speaker)}:</b> ` : ''}${esc(p.text)}</li>`).join('')}</ul>`,
      say: lesson.story.pages[0].text,
    });
    (lesson.story.rungs || []).forEach((rung, i) => {
      const map = lesson.story?.map;
      slides.push({
        kicker: `🗣 Retell ${i + 1} — ${rung.with}`,
        title: rung.prompt,
        big: '🗣',
        html: i >= 1 && map
          ? `<ul>${[['Who', map.character], ['Where', map.setting], ['Wanted', map.problem], ['Felt', map.feeling], ['Ended', map.ending]].map(([k, v]) => `<li><b>${esc(String(k))}:</b> ${esc(String(v || '—'))}</li>`).join('')}</ul>`
          : undefined,
        frame: rung.prompt,
        talk: rung.talkTarget,
      });
    });
    if (lesson.story.roleplay) {
      slides.push({
        kicker: '🎭 Hot-seat — you are in role, the child asks',
        title: `You are ${lesson.story.roleplay.character}`,
        big: lesson.story.roleplay.emoji || '🎭',
        html: lesson.story.roleplay.questions?.length
          ? `<ul>${lesson.story.roleplay.questions.map((q) => `<li>❓ ${esc(q)}</li>`).join('')}</ul>`
          : undefined,
        say: lesson.story.roleplay.questions?.[0],
      });
    }
  }

  /* The page's own tasks, on the projector: the tutor works down this list with the
     printed sheet in the child's hands, and every row carries the line to say. */
  if (lesson.sheet?.tasks?.length) {
    const sh = lesson.sheet;
    slides.push({
      kicker: '🖨 The page — one task at a time',
      title: sh.name || lesson.title,
      big: '✏️',
      html: [
        `<ol>${sh.tasks.map((t) => `<li>${esc(t.emoji || '✏️')} <b>${esc(t.do)}</b>${t.paper ? ` <span class="s-min">· ${esc(t.paper)}</span>` : ''}${t.say ? `<div class="sub">🗣 “${esc(t.say)}”</div>` : ''}${t.childSays ? `<div class="sub">🧒 “${esc(t.childSays)}”</div>` : ''}</li>`).join('')}</ol>`,
        sh.talkFrame ? `<p class="sub">🗣 Finish together: “${esc(sh.talkFrame)}”</p>` : '',
        sh.answerKey?.length ? `<p class="sub">✅ Mark this after part 3 — the child does the ticking.</p>` : '',
      ].filter(Boolean).join(''),
      say: sh.tasks[0]?.say || sh.tasks[0]?.do,
    });
  }

  /* The board, on the projector: the tutor works down the jobs while the printed
     sheet goes on the fridge, and every row carries the line to say and the proof. */
  if (lesson.quest?.jobs?.length) {
    const q = lesson.quest;
    slides.push({
      kicker: '🏠 The board — one job at a time',
      title: q.name || lesson.title,
      big: '🏠',
      html: [
        `<ol>${q.jobs.map((j) => `<li>${esc(j.emoji || '🏠')} <b>${esc(j.do)}</b>${j.xp ? ` <span class="s-min">· ⭐ ${esc(j.xp)} XP</span>` : ''}${j.night ? ` <span class="s-min">· ${esc(j.night)}</span>` : ''}${j.say ? `<div class="sub">🗣 “${esc(j.say)}”</div>` : ''}${j.childSays ? `<div class="sub">🧒 “${esc(j.childSays)}”</div>` : ''}${j.proof ? `<div class="sub">📸 ${esc(j.proof)}</div>` : ''}</li>`).join('')}</ol>`,
        q.tally ? `<p class="sub">🧾 ${esc(q.tally)}</p>` : '',
        q.reward ? `<p class="sub">🏆 ${esc(q.reward)}</p>` : '',
      ].filter(Boolean).join(''),
      say: q.jobs[0]?.say || q.jobs[0]?.do,
    });
  }

  /* The show, on the projector: the tutor works down the questions with the real
     photo up first, and every row carries the sentence the class says. */
  if (lesson.game?.items?.length && lesson.quiz) {
    const q = lesson.quiz;
    slides.push({
      kicker: '❓ The show — question by question',
      title: q.name || lesson.title,
      big: '❓',
      html: [
        `<ol>${lesson.game.items.map((it) => `<li>${esc(it.picture || '❓')} <b>${esc(it.prompt)}</b>${it.distractors?.length ? ` <span class="s-min">· ${[it.answer, ...it.distractors].map((o) => esc(o)).join(' / ')}</span>` : ''}${it.childSays ? `<div class="sub">🗣 “${esc(it.childSays)}”</div>` : ''}${it.ask ? `<div class="sub">➕ “${esc(it.ask)}”</div>` : ''}${it.photoQuery ? `<div class="sub">📷 ${esc(it.photoQuery)}${it.lookFor ? ` — ${esc(it.lookFor)}` : ''}</div>` : ''}</li>`).join('')}</ol>`,
        q.scoreLine ? `<p class="sub">🏆 ${esc(q.scoreLine)}</p>` : '',
        q.master ? `<p class="sub">🎤 Last round: the child reads the question and judges the answer.</p>` : '',
      ].filter(Boolean).join(''),
      say: lesson.game.items[0]?.prompt,
    });
  }

  /* The pack, on the projector: six cards per screen, each with the exact line the
     tutor says and the exact line the child owes — so a turned card is a spoken
     sentence and never a tap. Nothing on these slides is read by the child. */
  if (lesson.deck?.cards?.length) {
    const d = lesson.deck;
    for (let i = 0; i < d.cards.length; i += 6) {
      const slice = d.cards.slice(i, i + 6);
      slides.push({
        kicker: `🃏 ${d.name || 'The card pack'} — cards ${i + 1}-${Math.min(i + 6, d.cards.length)}`,
        title: d.name || lesson.title,
        big: '🃏',
        html: [`<ol>${slice.map((c) => `<li>${esc(c.emoji || '🃏')} <b>${esc(c.word)}</b>${c.review?.length ? ` <span class="s-min">· 🃏 mixes ${c.review.map((w) => esc(w)).join(' + ')}</span>` : ''}${c.say ? `<div class="sub">🗣 “${esc(c.say)}”</div>` : ''}${c.childSays ? `<div class="sub">🧒 “${esc(c.childSays)}”</div>` : ''}${c.do ? `<div class="sub">🤸 ${esc(c.do)}</div>` : ''}${c.cue ? `<div class="sub">👀 ${esc(c.cue)}</div>` : ''}</li>`).join('')}</ol>`].join(''),
        say: slice[0]?.say || slice[0]?.word,
      });
    }
    slides.push({
      kicker: '🃏 Sort the deck, pack it home, and say the week',
      title: d.name || lesson.title,
      big: '🗂',
      html: [
        d.passes?.length ? `<p class="sub">🔁 The passes, in order: <b>${d.passes.map((p) => esc(p)).join(' → ')}</b></p>` : '',
        d.master ? `<p class="sub">🎤 The last pass is the CHILD’s: ${esc(d.master)}</p>` : '',
        d.scoreLine ? `<p class="sub">🏆 Say it out loud together: “${esc(d.scoreLine)}”</p>` : '',
        d.spacing?.length ? `<ul>${d.spacing.map((line) => `<li>☐ ${esc(line)}</li>`).join('')}</ul>` : '',
      ].filter(Boolean).join(''),
    });
  }

  steps.forEach((s, i) => {
    slides.push({
      kicker: `${s.phase ? `${s.phase} · ` : ''}Step ${i + 1}${s.name ? ` · ${s.name}` : ''}${s.minutes ? ` · ${s.minutes} min` : ''}${s.drill ? (lesson.deck?.cards?.length ? ' · 🃏 open the card deck' : lesson.movement?.commands?.length ? ' · 🤸 open the command game' : lesson.routine?.moments?.length ? ' · 🚿 open the routine game' : lesson.circle ? ' · 🔄 open the circle game' : lesson.storyWalk?.beats?.length ? ' · 🤸 open the story walk' : ' · 🔤 open the word builder') : ''}`,
      title: s.teacherScript || s.name,
      say: s.teacherScript,
      do: s.childAction,
      /* The run-sheet lines travel with the slide: the floor so the phase cannot end
         early, the frame the child completes, the three questions and the reserve. */
      frame: s.sayFrame,
      ladder: s.questionLadder,
      reserve: s.reserve,
      floor: s.floorMinutes,
      talk: s.talkTarget,
      tip: s.tip,
    });
  });

  /* The crown round: the child gives the orders. TPR is naturally silent, so this is
     the phase that makes the talking happen — the grown-up obeys only English, and
     nothing moves until the child has said the command. */
  if (lesson.movement?.bossRound?.length) {
    slides.push({
      kicker: '👑 Now YOU are the boss',
      title: lesson.movement.bossRound.join(' · '),
      big: '👑',
      say: lesson.movement.bossRound[0],
      do: 'Nothing moves until the child says the command in English. Get it wrong on purpose and they will say it again.',
      frame: lesson.movement.bossRound[0],
      talk: lesson.movement.bossRound.length,
    });
  }

  /* The decodable story: the payoff of the whole lesson. Every word in it comes from
     the sound just taught, so the child reads it themselves — and then tells it back. */
  if (lesson.phonics?.decodable?.lines?.length) {
    const d = lesson.phonics.decodable;
    slides.push({
      kicker: veryYoung ? '📖 Our sound story — you read, they join in' : '📖 Read it yourself — every word is ours',
      title: d.title || 'Our story',
      big: '📖',
      html: [
        `<ul>${d.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`,
        d.trickyWords?.length
          ? `<p class="sub">🧩 Say these first — they do not follow the rule: ${d.trickyWords.map((w) => esc(w)).join(' · ')}</p>`
          : '',
      ].join(''),
      say: d.lines[0],
      frame: d.retell,
      talk: d.talkTarget,
    });
  }

  words.forEach((w) => {
    slides.push({
      kicker: 'A new word',
      title: w.word,
      big: w.emoji || '🔤',
      say: [w.sayAloud, w.meaning].filter(Boolean).join(' · '),
      do: w.example,
    });
  });

  if (lesson.game?.items?.length) {
    const g = lesson.game;
    g.items.forEach((it) => {
      slides.push({
        kicker: `🎮 ${g.name}`,
        title: it.prompt,
        big: it.picture || '🎮',
        say: g.howToPlay,
      });
    });
  }

  if (lesson.lyrics?.length) {
    slides.push({
      kicker: lesson.chantRhythm ? `🎵 Rhythm: ${lesson.chantRhythm}` : '🎵 Sing it together',
      title: 'Let\'s sing!',
      big: '🎵',
      html: `<ul>${lesson.lyrics.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`,
    });
  }

  (lesson.media || []).filter((m) => m.where !== 'home').forEach((m) => {
    slides.push({ kicker: `${mediaKindEmoji(m.kind)} ${mediaKindLabel(m.kind)}`, title: m.title, html: mediaPlayer(m), say: m.why });
  });

  /* The real-world mission closes the session, before the exit ticket — the part of
     the lesson that leaves the screen and happens in the child's own life. */
  if (lesson.mission?.title) {
    slides.push({
      kicker: '🌍 The real-world mission',
      title: lesson.mission.title,
      big: '🌍',
      say: lesson.mission.sayIt || lesson.mission.title,
      do: lesson.mission.realWorld,
      html: lesson.mission.steps?.length
        ? `<ol>${lesson.mission.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
        : undefined,
      frame: lesson.mission.sayIt,
    });
  }

  slides.push({
    kicker: 'Finish',
    title: veryYoung ? 'You did it! Well done!' : 'Great work — lesson complete!',
    big: veryYoung ? '🎉' : '🏆',
    html: [
      lesson.run?.exitTicket?.length
        ? `<p><b>🎫 Exit ticket — say these:</b></p><ul>${lesson.run.exitTicket.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
        : lesson.objectives?.length
          ? `<ul>${lesson.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>`
          : '',
      lesson.run?.nextTime ? `<p style="margin-top:14px"><b>⏭ Next time starts with:</b> ${esc(lesson.run.nextTime)}</p>` : '',
    ].filter(Boolean).join('') || undefined,
    say: veryYoung ? 'Clap for yourself! Give your grown-up a high five!' : 'Tell me one thing you can do now that you could not before.',
  });

  return slides;
}

function classHtml(lesson: KidLesson, band: KidAgeBand, learner?: Learner, teacher?: TeacherProfile): string {
  const slides = classSlides(lesson, band);
  const data = JSON.stringify(slides);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(lesson.title)} — in class</title>
<style>${BASE_CSS}
body{background:linear-gradient(160deg,#241a4d,#3a2f7a 45%,#1c2a63);color:#fff}
.wrap{max-width:1200px;padding-top:14px}
.deck{position:relative;min-height:74vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  background:rgba(255,255,255,.06);border-radius:34px;padding:34px 30px;box-shadow:0 30px 80px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.12)}
.kicker{font-weight:900;letter-spacing:.14em;text-transform:uppercase;font-size:clamp(13px,1.5vw,18px);color:#c9c2ff}
.slide-title{font-size:clamp(34px,6vw,84px);font-weight:900;line-height:1.05;margin:14px 0;max-width:22ch;text-wrap:balance}
.say-box{background:rgba(255,255,255,.12);border-radius:22px;padding:16px 22px;margin-top:16px;max-width:60ch}
.say-box .lbl{font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:900;color:#bdb4ff}
.say-box .txt{font-size:clamp(22px,3.4vw,52px);font-weight:900;margin-top:4px}
.do-line{margin-top:16px;font-weight:900;font-size:clamp(20px,2.8vw,38px);color:#9df3c4}
.say-box.frame{background:rgba(80,220,160,.16);border:1px solid rgba(120,240,190,.35)}
.say-box.frame .lbl{color:#8df0c0}
.tip-line{margin-top:12px;font-weight:800;font-style:italic;color:#ffd68a;font-size:clamp(15px,1.9vw,24px)}
.slide-body{margin-top:18px;font-size:clamp(18px,2.4vw,30px);max-width:70ch}
.slide-body ul{list-style:none;padding:0}
.slide-body li{margin:8px 0;font-weight:900}
.bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-top:16px}
.btn{border:0;cursor:pointer;border-radius:18px;padding:14px 22px;font-family:inherit;font-weight:900;font-size:clamp(16px,1.8vw,22px);
  background:#fff;color:#3a2f7a;box-shadow:0 10px 24px rgba(0,0,0,.25)}
.btn:hover{transform:translateY(-1px)}
.btn.ghost{background:rgba(255,255,255,.16);color:#fff}
.btn.next{background:linear-gradient(135deg,#ffd166,#ff9e3d);color:#3a2205;padding:16px 34px}
.progress{font-weight:900;color:#c9c2ff;font-size:16px}
.frame{position:absolute;inset:0;border-radius:34px;border:2px dashed rgba(255,255,255,.12);pointer-events:none}
@media print{body{background:#fff;color:#000}.deck{box-shadow:none;border:2px solid #ccc;background:#fff}.slide-title,.say-box .txt,.do-line{color:#000}}
</style></head><body><div class="wrap">
${header(learner, teacher, band, lesson)}
<div class="deck">
  <div class="frame"></div>
  <div id="slide"></div>
</div>
<div class="bar">
  <div class="row">
    <button class="btn ghost" id="prev">◀ Back</button>
    <button class="btn ghost" id="say">🔊 Say it again</button>
  </div>
  <span class="progress" id="progress"></span>
  <button class="btn next" id="next">Next ▶</button>
</div>
<p class="foot" style="color:#b9b3e0">← → to move · Space to hear the line again · the tutor's voice is the real audio</p>
</div>
<script>
var slides = ${data};
var i = 0;
var veryYoung = ${band === 'veryYoung' ? 'true' : 'false'};
function esc(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML;}
function render(){
  var s = slides[i]; if(!s) return;
  var html = '';
  html += '<div class="kicker">'+esc(s.kicker)+'</div>';
  if (s.big) html += '<span class="big-emoji">'+esc(s.big)+'</span>';
  html += '<div class="slide-title">'+esc(s.title)+'</div>';
  if (s.say) html += '<div class="say-box"><div class="lbl">Say this</div><div class="txt">'+esc(s.say)+'</div></div>';
  if (s.do) html += '<div class="do-line">🧒 '+esc(s.do)+'</div>';
  /* The frame the child completes — the single highest-value line on the slide. */
  if (s.frame) html += '<div class="say-box frame"><div class="lbl">The child finishes this</div><div class="txt">'+esc(s.frame)+'</div></div>';
  if (s.html) html += '<div class="slide-body">'+s.html+'</div>';
  /* The run-sheet lines: the questions to always have ready, and what to do here if
     the phase finishes early instead of moving on and shortening the session. */
  if (s.ladder && s.ladder.length) html += '<div class="tip-line">❓ Ask: '+s.ladder.map(esc).join(' → ')+'</div>';
  if (s.reserve && s.reserve.length) html += '<div class="tip-line">➕ If this runs short: '+s.reserve.map(esc).join(' · ')+'</div>';
  if (s.talk) html += '<div class="tip-line">🗣 The child owes '+esc(String(s.talk))+' out loud here</div>';
  if (s.floor) html += '<div class="tip-line">🔒 Floor: do not leave this phase before '+esc(String(s.floor))+' min</div>';
  if (s.link) html += '<div class="row"><a class="link" href="'+esc(s.link)+'" target="_blank" rel="noopener">▶ Open the clip</a></div>';
  if (s.tip) html += '<div class="tip-line">💡 '+esc(s.tip)+'</div>';
  document.getElementById('slide').innerHTML = html;
  document.getElementById('progress').textContent = (i+1)+' / '+slides.length;
}
/* The read-aloud asks for a Microsoft ONLINE (NATURAL) voice first: Edge ships them
   free, with no key, and they are the difference between a person reading to a
   three-year-old and a satnav reading a shopping list. Anything is better than
   nothing, so the order degrades all the way down to no voice at all. */
function kidVoice(){
  try{
    var vs = window.speechSynthesis.getVoices() || [];
    var natural = vs.filter(function(v){ return /online\s*\(natural\)|natural|neural/i.test(v.name) && /microsoft/i.test(v.name) && /^en/i.test(v.lang); });
    var child = natural.filter(function(v){ return /(^|\W)(ana|maisie|emma|ava|sonia)(\W|$)/i.test(v.name); });
    return child[0] || natural[0] || vs.filter(function(v){ return /^en/i.test(v.lang); })[0] || null;
  }catch(e){ return null; }
}
function speak(){
  var s = slides[i]; if(!s || !('speechSynthesis' in window)) return;
  var text = s.say || s.title; if(!text) return;
  try{ var u = new SpeechSynthesisUtterance(text); u.pitch = veryYoung?1.2:1.05; u.rate = veryYoung?0.82:0.95;
    var v = kidVoice(); if(v){ u.voice = v; u.lang = v.lang; }
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);}catch(e){}
}
document.getElementById('next').onclick=function(){ if(i<slides.length-1){ i++; render(); } };
document.getElementById('prev').onclick=function(){ if(i>0){ i--; render(); } };
document.getElementById('say').onclick=function(){ speak(); };
document.addEventListener('keydown',function(e){
  if(e.key==='ArrowRight'||e.key==='PageDown'){ e.preventDefault(); document.getElementById('next').click(); }
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){ e.preventDefault(); document.getElementById('prev').click(); }
  else if(e.key===' '){ e.preventDefault(); speak(); }
});
/* Voices arrive asynchronously in every browser; ask once for the list so the very
   first read-aloud already has the good voice instead of the default one. */
if('speechSynthesis' in window){ window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = function(){}; }
render();
</script>
</body></html>`;
}

/* ────────────────────────────────────────────────────────────────────────────
   Phase 3 — At home
   ──────────────────────────────────────────────────────────────────────────── */

function homeHtml(lesson: KidLesson, band: KidAgeBand, learner?: Learner, teacher?: TeacherProfile): string {
  const homeMedia = (lesson.media || []).filter((m) => m.where === 'home' || m.where === 'both');
  const name = learner?.name?.trim() || 'your child';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(lesson.title)} — at home</title>
<style>${BASE_CSS}</style></head><body><div class="wrap">
${header(learner, teacher, band, lesson)}
<p class="chip">🏠 At home — five fun minutes with ${esc(name)}</p>

${lesson.homework?.length ? `<div class="card"><h2>✅ This week's missions</h2><ul>${lesson.homework.map((h) => `<li>☐ ${esc(h)}</li>`).join('')}</ul></div>` : ''}

${lesson.objectives?.length ? `<div class="card"><h2>🌟 ${esc(name)} can already…</h2><ul>${lesson.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}

${lesson.words?.length ? `<div class="card"><h2>🔤 Practise these words</h2><div class="grid">
  ${lesson.words.map((w: KidLessonWord) => `<div class="word"><span class="w-emoji">${esc(w.emoji || '🔤')}</span><div class="w-name">${esc(w.word)}</div>${w.meaning ? `<div class="w-meaning">${esc(w.meaning)}</div>` : ''}</div>`).join('')}
</div></div>` : ''}

${homeMedia.length ? `<div class="card"><h2>📺 Listen and play together</h2>
  <p class="sub">Tap to open. You can watch, play or sing these with ${esc(name)}.</p>
  ${homeMedia.map((m) => `<div style="margin:14px 0">
    <div class="chip">${mediaKindEmoji(m.kind)} ${esc(m.title)}</div>
    <div class="row" style="margin-top:6px"><a class="link" href="${esc(m.url)}" target="_blank" rel="noopener">▶ Open</a>
    ${m.searchUrl && m.searchUrl !== m.url ? `<a class="link alt" href="${esc(m.searchUrl)}" target="_blank" rel="noopener">🔎 Search</a>` : ''}</div>
    ${m.why ? `<div class="tip">${esc(m.why)}</div>` : ''}
  </div>`).join('')}
</div>` : ''}

${lesson.run?.exitTicket?.length ? `<div class="card"><h2>🎫 What ${esc(name)} can say now</h2><ul>${lesson.run.exitTicket.map((t) => `<li>✅ ${esc(t)}</li>`).join('')}</ul></div>` : ''}

${lesson.story?.pages?.length ? `<div class="card"><h2>🗣 Tell the story tonight</h2>
  <p class="sub">Your child tells YOU this story in English — in three bits. If they get stuck, point at the ✨ box for the story map.</p>
  <ul>${lesson.story.pages.slice(0, 6).map((p) => `<li>${esc(p.emoji || '📖')} ${esc(p.text)}</li>`).join('')}</ul>
  ${lesson.story.map ? `<p class="sub">✨ Story map: ${[['who', lesson.story.map.character], ['where', lesson.story.map.setting], ['wanted', lesson.story.map.problem], ['felt', lesson.story.map.feeling], ['ended', lesson.story.map.ending]].map(([k, v]) => `<b>${esc(String(k))}</b> ${esc(String(v || '—'))}`).join(' · ')}</p>` : ''}
  ${lesson.story.roleplay ? `<p class="sub">Ask your child to be ${esc(lesson.story.roleplay.character)} and answer their questions in English!</p>` : ''}
</div>` : ''}

${lesson.story?.pairedBook ? `<div class="card"><h2>📖 Watch a real story being read aloud</h2>
  <p class="sub">${esc(lesson.story.pairedBook.title)} — a real actor reading a real picture book.</p>
  <div class="row"><a class="link" href="${esc(lesson.story.pairedBook.url)}" target="_blank" rel="noopener">▶ Open it</a></div>
</div>` : ''}

${lesson.phonics?.decodable?.lines?.length ? `<div class="card"><h2>📖 Read this story together</h2>
  <p class="sub">${esc(lesson.phonics.decodable.title || 'Our story')} — every word in it comes from the sound your child learned. Let them read it to YOU, and do not read it for them (the sounding-out is the practice).</p>
  <ul>${(lesson.phonics.decodable.lines || []).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
  ${lesson.phonics.decodable.trickyWords?.length ? `<p class="sub">🧩 Say these first — they do not follow the rule: ${lesson.phonics.decodable.trickyWords.map((w) => esc(w)).join(' · ')}</p>` : ''}
  ${lesson.phonics.decodable.retell ? `<p class="sub">🗣 Then ask: <b>${esc(lesson.phonics.decodable.retell)}</b></p>` : ''}
  ${lesson.phonics.dictation?.length ? `<p class="sub">✏️ Say these for your child to write: <b>${lesson.phonics.dictation.map((w) => esc(w)).join(' · ')}</b></p>` : ''}
</div>` : ''}

${lesson.movement?.bossRound?.length ? `<div class="card"><h2>👑 This week your child gives the orders</h2>
  <p class="sub">Ask them to be the boss: they give the commands in English and YOU do every one. Nothing moves until the child says it in English — that single rule is what turns a silent, physical lesson into one your child talks all the way through.</p>
  <p class="sub">The commands: <b>${lesson.movement.bossRound.map((c) => esc(c)).join(' · ')}</b>${lesson.movement.commands?.length ? ` — and any of these: ${lesson.movement.commands.map((c) => esc(c.command)).join(' · ')}` : ''}</p>
  <p class="sub">If you get it wrong on purpose, your child has to say the command again to fix you — that repeat is the practice.</p>
</div>` : ''}

${lesson.storyWalk?.beats?.length ? `<div class="card"><h2>🤸 This week your child directs you</h2>
  <p class="sub">Ask your child to tell the story and YOU do every action.${lesson.storyWalk.echo ? ` Every time they say “${esc(lesson.storyWalk.echo)}”, say it back with them.` : ''} No translation and no testing — if you get a step wrong on purpose, they will say the line again to fix you, and that repeat is the practice.</p>
  ${lesson.storyWalk.beats?.length ? `<ul>${lesson.storyWalk.beats.map((b) => `<li>☐ ${esc(b.emoji || '🤸')} <b>${esc(b.line)}</b>${b.action ? ` <span class="s-min">· you: ${esc(b.action)}</span>` : ''}</li>`).join('')}</ul>` : ''}
  ${lesson.storyWalk.map?.length ? `<p class="sub">🗺️ Three nights, one act a night — the story map: ${lesson.storyWalk.map.map((m) => esc(m)).join(' → ')}</p>` : ''}
  ${lesson.storyWalk.choose ? `<p class="sub">🗣 Ask them: “${esc(lesson.storyWalk.choose)}” — and do whatever they decide.</p>` : ''}
</div>` : ''}

${lesson.circle?.hello?.length || lesson.circle?.surprise ? `<div class="card"><h2>🔄 Your week: the same circle, every evening</h2>
  <p class="sub">Run the same four moments at home, with the same words, in the same order — the hello, the four pictures, the box, the goodbye. The child is the leader; you point, answer and wait. Keep one new thing in the box each evening, and never test or translate.</p>
  <ul>
    ${lesson.circle?.hello?.length ? `<li>☐ Sing the hello first: “${esc(lesson.circle.hello[0])}”</li>` : ''}
    ${lesson.circle?.check?.length ? `<li>☐ Point at the pictures — the child points, you say the word${lesson.circle.check[0]?.childSays ? ` (“${esc(lesson.circle.check[0].childSays)}”)` : ''}</li>` : ''}
    ${lesson.circle?.waitLine ? `<li>☐ Say the same wait before the box: “${esc(lesson.circle.waitLine)}”</li>` : ''}
    ${lesson.circle?.surprise ? `<li>☐ One new thing in the box: <b>${esc(lesson.circle.surprise)}</b> — say it three times</li>` : ''}
    ${lesson.circle?.goodbye?.length ? `<li>☐ Sing the goodbye last: “${esc(lesson.circle.goodbye[0])}”</li>` : ''}
  </ul>
  ${lesson.circle?.ask?.length ? `<p class="sub">🗣 At 5-12 the CHILD asks these: ${lesson.circle.ask.map((q) => esc(q)).join(' · ')} — answer in a whole sentence every time.</p>` : ''}
  ${lesson.circle?.nextTime ? `<p class="sub">🗓 Before the next lesson: “${esc(lesson.circle.nextTime)}”</p>` : ''}
</div>` : ''}

${lesson.routine?.moments?.length ? `<div class="card"><h2>🚿 Your week: the same words, at the same moments</h2>
  <p class="sub">Say the line first and do the action while you say it. No translation, no testing, no screen needed. Do it at the real moment every day this week and your child will start saying it back to you.</p>
  <ul>${(lesson.routine.moments || []).map((m) => `<li>☐ <b>${esc(m.moment)}</b> — say: “${esc(m.say)}”${m.childSays ? ` <span class="s-min">· they say: ${esc(m.childSays)}</span>` : ''}</li>`).join('')}</ul>
  ${lesson.routine.sameLine ? `<p class="sub">🔁 The same line every time: <b>${esc(lesson.routine.sameLine)}</b></p>` : ''}
  ${lesson.routine.pronunciation?.length ? `<p class="sub">👨‍👩‍👧 Say it like this: ${lesson.routine.pronunciation.map((p) => `${esc(p.word)}${p.hint ? ` = ${esc(p.hint)}` : ''}`).join(' · ')}</p>` : ''}
</div>` : ''}

${lesson.sheet?.tasks?.length ? `<div class="card"><h2>✏️ Your week: one part a night, said out loud</h2>
  <p class="sub">The page lives on the table this week and comes back finished. ONE part a night — never the whole page at once — with every answer said out loud while it is written. Sit beside your child, not opposite: the pencil stays in their hand.</p>
  <ul>${lesson.sheet.tasks.map((t) => `<li>☐ ${esc(t.emoji || '✏️')} <b>${esc(t.do)}</b>${t.childSays ? ` <span class="s-min">· they say: “${esc(t.childSays)}”</span>` : ''}</li>`).join('')}</ul>
  ${lesson.sheet.traceWords?.length ? `<p class="sub">✍️ Every night, trace first: <b>${lesson.sheet.traceWords.map((w) => esc(w)).join(' · ')}</b></p>` : ''}
  ${lesson.sheet.talkFrame ? `<p class="sub">🗣 Then finish this together: “${esc(lesson.sheet.talkFrame)}”</p>` : ''}
  ${lesson.sheet.answerKey?.length ? `<p class="sub">✅ Let your child mark their own work with this — and never mark part 3, there is no wrong answer there.</p>` : ''}
</div>` : ''}

${lesson.quest?.jobs?.length ? `<div class="card"><h2>🏠 Your week: one job a night, with a line to say</h2>
  <p class="sub">The board lives on the fridge and every job is worth XP the child writes down themselves. Say the job's line exactly as it is printed, then wait — the answer comes in English or it does not come. ${lesson.quest.reward ? `The week adds up to: ${esc(lesson.quest.reward)}.` : ''}</p>
  <ul>${lesson.quest.jobs.map((j) => `<li>☐ ${esc(j.emoji || '🏠')} <b>${esc(j.do)}</b>${j.xp ? ` <span class="s-min">· ⭐ ${esc(j.xp)} XP</span>` : ''}${j.night ? ` <span class="s-min">· ${esc(j.night)}</span>` : ''}${j.childSays ? ` <span class="s-min">· they say: “${esc(j.childSays)}”</span>` : ''}</li>`).join('')}</ul>
  ${lesson.quest.tally ? `<p class="sub">🧾 ${esc(lesson.quest.tally)}</p>` : ''}
  ${lesson.quest.master ? `<p class="sub">🧑✈️ At 5-12 the child runs the board: ${esc(lesson.quest.master)}</p>` : ''}
</div>` : ''}

${lesson.game?.items?.length && lesson.quiz ? `<div class="card"><h2>❓ Your week: three questions a night, with the real photo</h2>
  <p class="sub">Print the questions (and find the real photograph for each one). Three a night at the table is plenty — the photo first, the question second, then wait three seconds before you help. Never say “wrong”: say “nearly, look at the picture again”. Ask for the sentence, not the word.${lesson.quiz.master ? ' On the last two nights your child is the quizmaster: they read the question and YOU answer — sometimes wrongly on purpose, so they can explain why.' : ''}</p>
  <ul>${lesson.game.items.slice(0, 6).map((it) => `<li>☐ ${esc(it.picture || '❓')} <b>${esc(it.prompt)}</b>${it.childSays ? ` <span class="s-min">· they answer: “${esc(it.childSays)}”</span>` : ''}</li>`).join('')}</ul>
  ${lesson.quiz.scoreLine ? `<p class="sub">🏆 Say the score out loud together: “${esc(lesson.quiz.scoreLine)}”</p>` : ''}
</div>` : ''}

${lesson.deck?.cards?.length ? `<div class="card"><h2>🃏 Your week: three cards a night, with no screen at all</h2>
  <p class="sub">Print the pack and cut it out — then one minute a night, at the table, in the car or in the bath. YOU hold the card up and the child says the line from memory BEFORE the card is turned back over; anything they miss goes in the “practice again” pile and comes back tomorrow. Never say “wrong” — say “nearly!” and do it together. This is the spaced schedule, and it is the whole reason the words survive the week.</p>
  <ul>${(lesson.deck.spacing?.length ? lesson.deck.spacing : ['tonight: the first three cards', 'tomorrow: the ones that got away', 'in three days: the whole pack from memory']).map((line) => `<li>☐ ${esc(line)}</li>`).join('')}</ul>
  ${lesson.deck.master ? `<p class="sub">🧑✈️ On the last night your child runs the deck: ${esc(lesson.deck.master)}</p>` : ''}
  ${lesson.deck.scoreLine ? `<p class="sub">🏆 Finish the whole pack by saying: “${esc(lesson.deck.scoreLine)}”</p>` : ''}
</div>` : ''}

${lesson.mission?.title ? `<div class="card"><h2>🌍 This week's real-world mission</h2>
  <p class="sub">${esc(lesson.mission.realWorld)}</p>
  ${lesson.mission.steps?.length ? `<ul>${lesson.mission.steps.map((m) => `<li>☐ ${esc(m)}</li>`).join('')}</ul>` : ''}
  ${lesson.mission.sayIt ? `<p class="sub">✅ The sentence to ask for: <b>${esc(lesson.mission.sayIt)}</b></p>` : ''}
</div>` : ''}

${lesson.caregiverNote ? `<div class="note home">👨‍👩‍👧 For the family: ${esc(lesson.caregiverNote)}</div>` : ''}
<div class="note family">💛 Praise the TRY, not the perfect answer. “You tried again and fixed it!” beats “clever”.</div>
${footer('page 3 of 3 · at home')}
</div></body></html>`;
}

/* ────────────────────────────────────────────────────────────────────────────
   The door
   ──────────────────────────────────────────────────────────────────────────── */

function filenameFor(lesson: KidLesson, band: KidAgeBand, phase: KidLessonPhase): string {
  const n = phase === 'prep' ? 1 : phase === 'class' ? 2 : 3;
  return `${slug(lesson.title)}-${band === 'veryYoung' ? 'very-young' : 'young'}-${n}-${phase === 'prep' ? 'before-class' : phase === 'class' ? 'in-class' : 'at-home'}.html`;
}

/** Build one phase's HTML. */
export function buildKidPhaseHtml(
  lesson: KidLesson,
  band: KidAgeBand,
  phase: KidLessonPhase,
  learner?: Learner,
  teacher?: TeacherProfile,
): KidPhaseFile {
  const html =
    phase === 'prep'
      ? prepHtml(lesson, band, learner, teacher)
      : phase === 'class'
        ? classHtml(lesson, band, learner, teacher)
        : homeHtml(lesson, band, learner, teacher);
  return { phase, label: phaseLabel[phase], emoji: phaseEmoji[phase], filename: filenameFor(lesson, band, phase), html };
}

/** All three files, in order: before class, in class, at home. */
export function buildKidPhaseFiles(
  lesson: KidLesson,
  band: KidAgeBand,
  learner?: Learner,
  teacher?: TeacherProfile,
): KidPhaseFile[] {
  return KID_LESSON_PHASES.map((phase) => buildKidPhaseHtml(lesson, band, phase, learner, teacher));
}
