/* ════════════════════════════════════════════════════════════════════════════
   🖨 PAPER STAGE — the kinds of lesson that ARE a document
   ════════════════════════════════════════════════════════════════════════════

   A worksheet is a sheet. Homework is a sheet. A lesson plan and a family guide
   are sheets. Playing them as a row of step slides told the tutor nothing about
   what they were actually getting, so those four kinds open here instead.

   What this stage does:

     · lays the whole thing out as one page, in the order a tutor reads it
     · shows the ANSWER SPACE — the ruled lines a child writes on — so a tutor can
       see at a glance that this is a thing you hand out, not a thing you click
     · prints, through the browser's own dialog, so the page that is on screen is
       the page that comes out of the printer
     · keeps the family note and the tutor note ON the sheet, because a worksheet
       that reaches home without them is a worksheet nobody can run

   No network, no library: one page, one print button, and the lesson's own words.
   ════════════════════════════════════════════════════════════════════════════ */

import React from 'react';
import { Printer, X } from 'lucide-react';
import type { KidAgeBand, KidLesson } from '../utils/lessonCreatorTypes';
import { KID_BANDS, kindById } from '../utils/lessonCreatorTypes';
import { KidEmoji } from './games/KidFreeMedia';

interface KidPaperStageProps {
  lesson: KidLesson;
  learnerName: string;
  onClose: () => void;
}

/** The emphasised section for each paper kind — what the sheet is FOR. */
const FOCUS: Record<string, { emoji: string; title: string; intro: string }> = {
  worksheet: {
    emoji: '🖨',
    title: 'Print this',
    intro: 'Hand it out or hold it up — the run sheet below is your copy of the same page, with the words to say at every task.',
  },
  homeworkQuest: {
    emoji: '🏠',
    title: 'This week’s quest',
    intro: 'Everything lives on the board: each job has a line to say and a way to prove it. Send it home as it is.',
  },
  lessonPlan: { emoji: '📝', title: 'The plan', intro: 'Your own run sheet: what to say, what the child does, and the timing.' },
  familyGuide: { emoji: '👨‍👩‍👧', title: 'For the family', intro: 'Written to be handed over, not explained.' },
};

const Section: React.FC<{ emoji: string; title: string; children: React.ReactNode }> = ({ emoji, title, children }) => (
  <section className="mt-5 break-inside-avoid">
    <h3 className="border-b-2 border-slate-200 pb-1 text-xs font-black uppercase tracking-widest text-slate-500">
      {emoji} {title}
    </h3>
    <div className="mt-2">{children}</div>
  </section>
);

export const KidPaperStage: React.FC<KidPaperStageProps> = ({ lesson, learnerName, onClose }) => {
  const band: KidAgeBand = lesson.band === 'veryYoung' ? 'veryYoung' : 'young';
  const profile = KID_BANDS[band];
  const kind = kindById(lesson.kind || '');
  const focus = FOCUS[lesson.kind || ''] || FOCUS.worksheet;

  const words = (lesson.words || []).filter((w) => w.word);
  const worksheet = (lesson.worksheet || []).filter(Boolean);
  const homework = (lesson.homework || []).filter(Boolean);
  const steps = (lesson.steps || []).filter((s) => s.name || s.teacherScript);
  const isPlan = lesson.kind === 'lessonPlan';
  /* A sheet whose phases are named is a print-and-talk page: the run sheet is the
     tutor's half of the same sheet, so it prints above the tasks. A plain list of
     tasks (or a task sheet with no timing) still prints as tasks only. */
  const sheet = lesson.sheet;
  const quest = lesson.quest;
  const questJobs = (quest?.jobs || []).filter((j) => j.do);
  const questXp = questJobs.reduce((sum, j) => sum + (typeof j.xp === 'number' ? j.xp : 0), 0);
  const hasPhases = steps.some((s) => !!s.phase);
  const showRunSheet = steps.length > 0 && (isPlan || hasPhases);
  const phasesTotal = steps.reduce((sum, s) => sum + (typeof s.minutes === 'number' ? s.minutes : 0), 0);
  const turnsTotal = steps.reduce((sum, s) => sum + (s.talkTarget || 0), 0);

  /* The ruled lines a child writes on. Two per task for a reader, and none at all
     for the little ones — a 3-year-old writes nothing, and printing lines for them
     would just be a sheet their tutor has to explain away. */
  const linesFor = (i: number) => {
    if (band === 'veryYoung') return null;
    return (
      <div key={`lines-${i}`} className="mt-2 space-y-3">
        <div className="h-px w-full bg-slate-300" />
        <div className="h-px w-full bg-slate-300" />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-200">
      {/* ── The bar: leave, or print exactly what is below ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-white px-3 py-2 sm:px-5 sm:py-3">
        <span className="text-2xl">{kind?.emoji || focus.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-slate-800 sm:text-lg">{lesson.title || 'This lesson'}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-xs">
            {profile.emoji} {profile.label} {profile.ages}
            {kind ? ` · ${kind.label}` : ''} · {focus.title}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-indigo-500"
        >
          <Printer className="h-3.5 w-3.5" /> Print this page
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── The sheet ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-xl sm:p-10">
          <header className="border-b-4 border-slate-800 pb-3">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
              {learnerName || 'Our learner'} · {profile.ages}
            </p>
            <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">{lesson.title || 'Our lesson'}</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {focus.emoji} {focus.intro}
              {lesson.durationMinutes ? ` · about ${lesson.durationMinutes} minutes` : ''}
            </p>
          </header>

          {lesson.objectives?.length ? (
            <Section emoji="🎯" title="What this teaches">
              <ul className="space-y-1">
                {lesson.objectives.map((o, i) => (
                  <li key={i} className="text-base font-bold text-slate-700">• {o}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {lesson.materials?.length ? (
            <Section emoji="🧰" title="You need">
              <div className="flex flex-wrap gap-2">
                {lesson.materials.map((m, i) => (
                  <span key={i} className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm font-bold text-slate-600">{m}</span>
                ))}
              </div>
            </Section>
          ) : null}

          {/* The tasks / the quest / the plan — the body of the sheet. */}
          {showRunSheet ? (
            <Section emoji="📝" title={isPlan ? 'Run sheet' : 'Run sheet — your half of this page'}>
              {!isPlan ? (
                <p className="mb-3 rounded-xl bg-indigo-50 p-3 text-sm font-bold text-indigo-900">
                  🔁 {steps.length} phases · {phasesTotal} minutes · {turnsTotal} turns for the child to say out loud. Say the
                  line, then wait — the talking IS the lesson, and the paper is only what they talk about.
                </p>
              ) : null}
              <div className="space-y-3">
                {steps.map((s, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-base font-black text-slate-800">{s.name}</p>
                      {s.minutes ? <span className="shrink-0 text-xs font-black uppercase text-slate-400">{s.minutes} min</span> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-black uppercase tracking-wide text-slate-400">
                      {s.phase ? <span>{s.phase}</span> : null}
                      {s.floorMinutes ? <span>· cannot end before {s.floorMinutes} min</span> : null}
                      {s.talkTarget ? <span>· 🗣 {s.talkTarget} turns</span> : null}
                    </div>
                    {s.teacherScript ? <p className="mt-1 text-sm font-bold text-indigo-700">🗣 Say this: {s.teacherScript}</p> : null}
                    {/* The frame carries its own quoting (the AI writes it as it is said), so
                        it prints raw here exactly as the run screen shows it. */}
                    {s.sayFrame ? <p className="mt-0.5 text-sm font-black text-emerald-800">💬 They finish it: {s.sayFrame}</p> : null}
                    {s.childAction ? <p className="mt-0.5 text-sm font-bold text-slate-600">🧒 {s.childAction}</p> : null}
                    {s.reserve?.length ? (
                      <p className="mt-0.5 text-sm text-slate-500">➕ If this phase runs short: {s.reserve.join(' · ')}</p>
                    ) : null}
                    {s.tip ? <p className="mt-0.5 text-sm text-slate-500">💡 {s.tip}</p> : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* The quest board: the jobs, their XP and the two lines that go with each
              one. A job with no line to say is a job done in silence, and a job with
              no proof is a job that never happens — so both print on the row. */}
          {questJobs.length ? (
            <Section emoji="🏠" title={band === 'veryYoung' ? 'The quest board — read every job out loud' : 'The quest board — you run it'}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {quest?.name ? (
                  <span className="rounded-xl bg-amber-100 px-3 py-1.5 text-base font-black text-amber-900">{quest.name}</span>
                ) : null}
                {quest?.partner ? <span className="text-sm font-bold text-slate-500">with {quest.partner}</span> : null}
                {questXp ? (
                  <span className="rounded-xl border border-amber-300 px-3 py-1.5 text-sm font-black text-amber-800">
                    ⭐ {questJobs.length} jobs · {questXp} XP this week
                  </span>
                ) : null}
              </div>
              <ol className="space-y-4">
                {questJobs.map((j, i) => (
                  <li key={i} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-base font-bold text-slate-800">
                        <span className="mr-2 font-black text-slate-400">{i + 1}.</span>
                        {j.emoji ? <span className="mr-1">{j.emoji}</span> : null}
                        {j.do}
                      </p>
                      {j.xp ? (
                        <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-0.5 text-sm font-black text-amber-900">⭐ {j.xp} XP</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
                      {j.night ? <span>{j.night}</span> : null}
                      {j.proof ? <span>· proof: {j.proof}</span> : null}
                    </div>
                    {j.say ? <p className="mt-1 text-sm font-bold text-indigo-700">🗣 You say: “{j.say}”</p> : null}
                    {j.childSays ? <p className="mt-0.5 text-sm font-black text-emerald-800">🧒 They say: “{j.childSays}”</p> : null}
                  </li>
                ))}
              </ol>
              {quest?.master ? (
                <p className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm font-bold text-indigo-900">🧑‍✈️ Their own job: {quest.master}</p>
              ) : null}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {quest?.tally ? (
                  <p className="rounded-xl border border-slate-300 p-3 text-sm font-bold text-slate-700">🧾 The tally: {quest.tally}</p>
                ) : null}
                {quest?.reward ? (
                  <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">🏆 The week adds up to: {quest.reward}</p>
                ) : null}
              </div>
            </Section>
          ) : null}

          {/* The tasks, with the words that go with them. A task without a line to
              say is a task the child does in silence, so every row carries both. */}
          {sheet?.tasks?.length ? (
            <Section emoji="✏️" title={band === 'veryYoung' ? 'The tasks — you read every one of them aloud' : 'The tasks — read each one aloud, then do it'}>
              <ol className="space-y-4">
                {sheet.tasks.map((t, i) => (
                  <li key={i} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-base font-bold text-slate-800">
                      <span className="mr-2 font-black text-slate-400">{i + 1}.</span>
                      {t.emoji ? <span className="mr-1">{t.emoji}</span> : null}
                      {t.do}
                      {t.paper ? (
                        <span className="ml-2 rounded-lg border border-slate-300 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-slate-500">
                          {t.paper}
                        </span>
                      ) : null}
                    </p>
                    {t.say ? <p className="mt-1 text-sm font-bold text-indigo-700">🗣 You say: “{t.say}”</p> : null}
                    {t.childSays ? <p className="mt-0.5 text-sm font-black text-emerald-800">🧒 They say: “{t.childSays}”</p> : null}
                    {t.boxes ? (
                      <div className="mt-2 flex gap-1.5">
                        {Array.from({ length: t.boxes }).map((_, b) => (
                          <span key={b} className="inline-block h-8 w-8 border-2 border-slate-400" />
                        ))}
                      </div>
                    ) : null}
                    {!t.boxes && !sheet.traceWords?.length && band !== 'veryYoung' ? linesFor(i) : null}
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}

          {sheet?.traceWords?.length ? (
            <Section emoji="✍️" title={band === 'veryYoung' ? 'Trace these with a finger — no pencil yet' : 'Trace these first, then write them alone'}>
              <div className="flex flex-wrap gap-3">
                {sheet.traceWords.map((w, i) => (
                  <span key={i} className="rounded-xl border-2 border-dashed border-slate-400 px-4 py-2 text-2xl font-black tracking-[0.2em] text-slate-400">
                    {w}
                  </span>
                ))}
              </div>
            </Section>
          ) : null}

          {sheet?.answerKey?.length ? (
            <Section emoji="✅" title="Check it yourself — turn the page over and mark your own work">
              <div className="grid gap-2 sm:grid-cols-2">
                {sheet.answerKey.map((a, i) => (
                  <span key={i} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-base font-black text-emerald-900">
                    {a}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Nothing here is wrong to get wrong: say the answer out loud, fix it, and say it again.
              </p>
            </Section>
          ) : null}

          {sheet?.talkFrame ? (
            <Section emoji="🗣" title="Say this about your own page">
              <p className="rounded-xl bg-indigo-50 p-3 text-xl font-black text-indigo-900">“{sheet.talkFrame}”</p>
            </Section>
          ) : null}

          {worksheet.length && !sheet?.tasks?.length && !questJobs.length ? (
            <Section emoji="✏️" title={lesson.kind === 'homeworkQuest' ? 'Jobs to do' : 'Tasks'}>
              <ol className="space-y-4">
                {worksheet.map((task, i) => (
                  <li key={i}>
                    <p className="text-base font-bold text-slate-800">
                      <span className="mr-2 font-black text-slate-400">{i + 1}.</span>{task}
                    </p>
                    {linesFor(i)}
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}

          {homework.length ? (
            <Section emoji="🏠" title="At home this week">
              <ul className="space-y-3">
                {homework.map((h, i) => (
                  <li key={i} className="rounded-xl bg-amber-50 p-3">
                    <p className="text-base font-bold text-amber-900">• {h}</p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {words.length ? (
            <Section emoji="🔤" title="The words">
              <div className="grid gap-3 sm:grid-cols-2">
                {words.slice(0, 10).map((w, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 p-2.5">
                    <KidEmoji emoji={w.emoji || '🔤'} size={34} />
                    <div className="min-w-0">
                      <p className="text-lg font-black text-slate-800">{w.word}</p>
                      {w.meaning ? <p className="text-sm font-bold text-slate-500">{w.meaning}</p> : null}
                      {w.example ? <p className="text-sm italic text-slate-400">{w.example}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* A sheet that goes home without these is a sheet nobody can run. */}
          {lesson.caregiverNote ? (
            <Section emoji="👨‍👩‍👧" title="For the family">
              <p className="rounded-xl bg-emerald-50 p-3 text-base font-bold text-emerald-900">{lesson.caregiverNote}</p>
            </Section>
          ) : null}

          {lesson.teacherNote ? (
            <Section emoji="🍎" title="For the tutor">
              <p className="rounded-xl bg-indigo-50 p-3 text-base font-bold text-indigo-900">{lesson.teacherNote}</p>
            </Section>
          ) : null}

          <footer className="mt-8 border-t border-slate-200 pt-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Made in the Lesson Creator · press Print this page to hand it out
          </footer>
        </article>
      </div>
    </div>
  );
};

export default KidPaperStage;
