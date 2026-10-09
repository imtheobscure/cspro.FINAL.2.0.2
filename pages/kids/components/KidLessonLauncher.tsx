/* ════════════════════════════════════════════════════════════════════════════
   🚀 KID LESSON LAUNCHER — one file that runs anything the AI built
   ════════════════════════════════════════════════════════════════════════════

   The Lesson Creator and Game Studio produce JSON. This is the piece that turns
   that JSON into something a child actually does — for every content type:

     · a LESSON  → step slides, the tutor's exact lines, word cards, wrap-up
     · an ACTIVITY → the picture quiz inside a lesson (prompt, options, praise)
     · a GAME     → handed to the projector stage (`KidGameStage`), unchanged

   Why one file: the launcher is the single entry point both the creator and any
   future screen share, so a new content type is added in ONE place, and the
   child meets the SAME splash, the same controls and the same praise every time.
   React, layout, speech, keyboard and the progress logic live here; the game
   rounds themselves stay in the projector engine they were already proven on.

   Identity comes from every profile tab, not just the name: the child's hero
   form (avatar + XP), their pet (pet XP) and the newest thing in their kingdom
   (the canvas) stand on the splash, so the lesson that opens is *theirs*.

   Nothing here talks to a network. Speech uses the browser's own voices; when
   there is no voice — a locked-down laptop, a school account — the lesson runs
   silently and the tutor reads the lines, which are always on screen.
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Play, RotateCcw, Volume2, X } from 'lucide-react';
import type { Learner } from '../types';
import { getAvatarEvolution, getPetEvolution } from '../types';
import {
  KID_BANDS,
  type KidAgeBand,
  type KidLesson,
  type KidLessonCircle,
  type KidLessonCustomization,
  type KidLessonGameItem,
  type KidLessonGame,
  type KidLessonMedia,
  type KidLessonMission,
  type KidLessonMovement,
  type KidLessonPhonics,
  type KidLessonPhonicsStory,
  type KidLessonQuiz,
  type KidLessonDeck,
  type KidLessonRoutine,
  type KidLessonStoryWalk,
  type KidLessonRetellRung,
  type KidLessonScene,
  type KidLessonStep,
  type KidLessonStory,
  type KidLessonStoryMap,
  type KidLessonStoryPage,
  type KidLessonWord,
} from '../utils/lessonCreatorTypes';
import { mediaKindEmoji, mediaKindLabel, youtubeEmbedUrl } from '../utils/kidLessonMedia';
import type { KidGame, KidGameScript } from '../utils/kidGameCatalog';
import { KidGameStage } from './games/KidGameStage';
/* Which player this KIND of lesson runs on. A flashcard deck is a deck, a memory
   lesson is a grid, a worksheet is a sheet — see `kidLessonStage.ts` for why the
   nine method models stay slides while these do not. */
import { stageForLesson, stageGameFor, stageScriptFor } from '../utils/kidLessonStage';
import { KidPaperStage } from './KidPaperStage';
/* The same free-media stack the games use: emoji rendered as crisp SVG (one duck
   on every laptop) and, where one can be found safely, the real photograph of the
   thing — with the emoji always underneath as the fallback, so a word card can
   never be an empty box. */
import { KidEmoji, KidPicture } from './games/KidFreeMedia';
import { playClick, playErrorSound, playLevelUpFanfare, playQuestDing, playStarShower } from '../utils/kidsAudio';
import { speakKidLine } from '../utils/kidVoices';

export interface KidLessonLauncherProps {
  learner: Learner;
  /** The band the content was built for; falls back to the lesson/game's own band. */
  band?: KidAgeBand;
  /** A parsed AI lesson. */
  lesson?: KidLesson | null;
  /** A parsed AI game script — played through the projector stage. */
  game?: { script: KidGameScript; game: KidGame } | null;
  /** The Step-2 dials from the creator; `voiceName` picks the read-aloud voice. */
  customization?: KidLessonCustomization | null;
  onClose: () => void;
  onFinish?: (summary: { stars: number; title: string }) => void;
}

/* ── The child's identity: hero, pet and kingdom crest, on every splash ───── */
function identityFor(learner: Learner) {
  let hero = '🧒';
  let heroForm = '';
  try {
    const a = getAvatarEvolution(learner.gender, learner.avatarArchetype, learner.xp);
    if (a) {
      hero = a.emoji || hero;
      heroForm = a.form || '';
    }
  } catch {
    /* no avatar table — the plain child emoji is a fine fallback */
  }
  let pet = '';
  let petForm = '';
  try {
    const p = getPetEvolution(learner.petType, learner.petXp ?? 0);
    if (p) {
      pet = p.emoji || '';
      petForm = p.form || '';
    }
  } catch {
    /* same */
  }
  const crest = (learner.landItems || []).slice(-1)[0]?.emoji || '🏰';
  return { hero, heroForm, pet, petForm, crest };
}

/* ── Speech: Microsoft natural voices when the device has them, silence always
      allowed. The picking and the child register live in `kidVoices.ts`, so the
      launcher, the voice dropdown and the exported HTML all sound the same. ──── */
const speak = (text: string, voiceName: string, veryYoung: boolean) => speakKidLine(text, voiceName, veryYoung);

/* Deterministic shuffle, so a question's options never move between renders. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed * 9301 + 49297;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Slide =
  | { kind: 'step'; index: number }
  | { kind: 'scene' }
  /* The sound ladder: the map of the whole phonics session, printed rung by rung. */
  | { kind: 'phonics' }
  /* The decodable story: the child reads it themselves at the end, then retells it. */
  | { kind: 'decodable' }
  /* The command ladder: Move & Do's map of its own seven commands. */
  | { kind: 'movement' }
  /* The crown round, where the child gives the orders instead of taking them. */
  | { kind: 'crown' }
  /* The three real moments of the day, and the grown-up's script for each one. */
  | { kind: 'routine' }
  /* The whole circle written down: the hello, the pictures, the wait, the surprise. */
  | { kind: 'circle' }
  /* The story told beat by beat, where every beat is an action the child does. */
  | { kind: 'storyWalk' }
  | { kind: 'story'; rung: number }
  | { kind: 'hotseat' }
  | { kind: 'words' }
  | { kind: 'activity' }
  | { kind: 'media'; index: number }
  | { kind: 'lyrics' }
  | { kind: 'mission' }
  | { kind: 'wrap' };

/* ── The words of the song ──
   The chant, the hello song and the goodbye song used to be invisible: they sat in
   `lyrics` on the lesson and no stage ever drew them, so a circle-time lesson lost
   the one part a tutor has to know by heart. They get a slide, in the same big type
   as everything else, with `chantRhythm` on screen as the clap. */
const LyricsSlide: React.FC<{ lyrics: string[]; rhythm?: string; veryYoung: boolean; onSay: (text: string) => void }> = ({
  lyrics, rhythm, veryYoung, onSay,
}) => (
  <div className="mx-auto max-w-4xl rounded-3xl bg-white p-6 text-slate-800 shadow-2xl sm:p-10">
    <p className="text-center text-xs font-black uppercase tracking-[0.3em] text-indigo-400">🎵 Sing it together</p>
    <div className="mt-5 space-y-3">
      {lyrics.map((line, i) => (
        <p key={i} className={`text-center font-black leading-snug text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
          {line}
        </p>
      ))}
    </div>
    {rhythm ? (
      <p className="mt-5 text-center text-sm font-bold text-slate-500">👏 Rhythm: {rhythm}</p>
    ) : null}
    <div className="mt-6 text-center">
      <button
        type="button"
        onClick={() => onSay(lyrics.join('. '))}
        className="rounded-2xl bg-indigo-600 px-6 py-3 text-lg font-black text-white hover:bg-indigo-500"
      >
        🔊 Hear the whole song
      </button>
    </div>
  </div>
);

/* ── A lesson's free media: the clip, the song, the game the class can tap ──
   Videos that we can be sure are embeddable play right here on the tutor's
   screen; everything else gets one enormous button, because a link that opens a
   real page beats a frame that shows nothing. The tutor's own voice is still the
   audio for the little ones, so nothing here is ever load-bearing. */
const MediaSlide: React.FC<{ media: KidLessonMedia; veryYoung: boolean }> = ({ media, veryYoung }) => {
  const embed = media.kind === 'video' && (media.embeddable || /youtu/i.test(media.url)) ? youtubeEmbedUrl(media.url) : null;
  return (
    <div className="mx-auto max-w-5xl rounded-3xl bg-white p-5 text-center text-slate-800 shadow-2xl sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-indigo-400">
        {mediaKindEmoji(media.kind)} {mediaKindLabel(media.kind)}
      </p>
      <p className={`mt-1 font-black text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>{media.title}</p>
      {embed ? (
        <iframe
          src={embed}
          title={media.title}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="mt-4 w-full rounded-2xl bg-black"
          style={{ aspectRatio: '16 / 9', border: 0 }}
        />
      ) : (
        <span className="mt-4 block text-[90px] leading-none">{mediaKindEmoji(media.kind)}</span>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <a href={media.url} target="_blank" rel="noreferrer" className="rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-black text-white shadow-lg hover:bg-indigo-500">
          ▶ Open it
        </a>
        {media.searchUrl && media.searchUrl !== media.url ? (
          <a href={media.searchUrl} target="_blank" rel="noreferrer" className="rounded-2xl border-2 border-indigo-200 px-5 py-4 text-base font-black text-indigo-500 hover:border-indigo-400">
            🔎 Search for it
          </a>
        ) : null}
      </div>
      {media.why ? <p className="mt-3 text-sm font-bold text-slate-500">{media.why}</p> : null}
      {media.source ? <p className="mt-1 text-[10px] font-medium text-slate-400">{media.source}</p> : null}
    </div>
  );
};

/* ── The step slide: the tutor's exact words, the child's action, the tip ─── */
const StepSlide: React.FC<{ step: KidLessonStep; index: number; veryYoung: boolean; onSay: (text: string) => void }> = ({
  step,
  index,
  veryYoung,
  onSay,
}) => (
  <div className="rounded-3xl bg-white p-5 text-slate-800 shadow-2xl sm:p-8" style={{ maxWidth: 1100, margin: '0 auto' }}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs font-black uppercase tracking-widest text-indigo-400">
        Step {index + 1}{step.name ? ` · ${step.name}` : ''}
      </p>
      {step.minutes ? (
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-500">{step.minutes} min</span>
      ) : null}
    </div>

    {step.teacherScript ? (
      <div className="mt-4 rounded-2xl border-2 border-violet-100 bg-violet-50/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-violet-500">🗣 Say this, word for word</p>
          <button
            type="button"
            onClick={() => onSay(step.teacherScript || '')}
            className="rounded-xl bg-violet-600 p-2 text-white hover:bg-violet-500"
            title="Hear it"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>
        <p className={`mt-2 font-bold leading-snug text-violet-950 ${veryYoung ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
          {step.teacherScript}
        </p>
      </div>
    ) : null}

    {step.childAction ? (
      <p className={`mt-3 font-black text-slate-700 ${veryYoung ? 'text-2xl' : 'text-lg'}`}>🧒 {step.childAction}</p>
    ) : null}

    {/* The sentence frame: the child's job is to finish the sentence, not to
        recognise a word. It is the highest-value line on the whole slide, so it
        gets the loudest type after the teacher script. */}
    {step.sayFrame ? (
      <div className="mt-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">💬 The child says it like this</p>
        <p className={`mt-1 font-black text-emerald-900 ${veryYoung ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>{step.sayFrame}</p>
        <button
          type="button"
          onClick={() => onSay(step.sayFrame || '')}
          className="mt-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white hover:bg-emerald-500"
        >
          🔊 Hear the frame
        </button>
      </div>
    ) : null}

    {/* The question ladder: three questions the tutor can always ask, so a child who
        is answering well never gets met with silence. */}
    {step.questionLadder?.length ? (
      <div className="mt-3 rounded-2xl border-2 border-sky-100 bg-sky-50/70 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-sky-600">❓ Ask these, easy to imagining</p>
        <ol className="mt-1.5 space-y-1">
          {step.questionLadder.map((q, i) => (
            <li key={i} className="flex items-start gap-2 text-base font-bold text-sky-950">
              <span className="font-black text-sky-400">{i + 1}.</span> {q}
            </li>
          ))}
        </ol>
      </div>
    ) : null}

    {step.print ? <p className="mt-2 text-sm font-bold text-slate-500">🖨 {step.print}</p> : null}
    {step.tip ? <p className="mt-2 text-sm font-medium italic text-amber-700">💡 {step.tip}</p> : null}
  </div>
);

/* ── The real scene: one photograph and one clip with a job attached ─────── */
const SceneSlide: React.FC<{ scene: KidLessonScene; veryYoung: boolean }> = ({ scene, veryYoung }) => {
  const embed = scene.clipUrl && /youtu/i.test(scene.clipUrl) ? youtubeEmbedUrl(scene.clipUrl) : null;
  const photoSearch = scene.photoQuery
    ? `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(scene.photoQuery)}&title=Special:MediaSearch&type=image`
    : null;
  return (
    <div className="mx-auto max-w-5xl rounded-3xl bg-white p-5 text-slate-800 shadow-2xl sm:p-8">
      <p className="text-center text-xs font-black uppercase tracking-[0.3em] text-indigo-400">📷 Look at this together</p>
      <p className={`mt-2 text-center font-black text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
        {scene.title}
      </p>
      {scene.photoQuery ? (
        <div className="mt-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-sm font-bold text-slate-600">A real photograph of: <b>{scene.photoQuery}</b></p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">Free, real photos — no drawings, because at this age the picture IS the word.</p>
          {photoSearch ? (
            <a href={photoSearch} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-2xl bg-indigo-600 px-5 py-3 text-base font-black text-white hover:bg-indigo-500">
              🔎 Show me the real photos
            </a>
          ) : null}
        </div>
      ) : null}
      {embed ? (
        <iframe
          src={embed}
          title={scene.clipTitle || scene.title}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="mt-4 w-full rounded-2xl bg-black"
          style={{ aspectRatio: '16 / 9', border: 0 }}
        />
      ) : null}
      {scene.clipTitle ? (
        <p className="mt-3 text-center text-lg font-black text-indigo-900">🎬 {scene.clipTitle}</p>
      ) : null}
      {scene.clipUrl && !embed ? (
        <div className="mt-3 text-center">
          <a href={scene.clipUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-indigo-600 px-5 py-3 text-base font-black text-white hover:bg-indigo-500">
            ▶ Play the clip
          </a>
        </div>
      ) : null}
      {scene.listenFor ? (
        <p className={`mt-4 rounded-2xl bg-amber-50 p-4 text-center font-black text-amber-900 ${veryYoung ? 'text-2xl' : 'text-xl'}`}>
          👂 {scene.listenFor}
        </p>
      ) : null}
    </div>
  );
};

/* ── The sound ladder: hear it → say it → find it → blend it → read it → spell it
      → write it. The order is not a suggestion, so it is printed as a ladder with
      the child's spoken turns marked against each rung. ──────────────────────── */
const PhonicsSlide: React.FC<{ phonics: KidLessonPhonics; veryYoung: boolean; onSay: (t: string) => void }> = ({
  phonics,
  veryYoung,
  onSay,
}) => (
  <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-slate-800 shadow-2xl sm:p-8">
    <p className="text-center text-xs font-black uppercase tracking-[0.3em] text-indigo-400">🔤 The sound ladder</p>
    {phonics.sound ? (
      <p className={`mt-2 text-center font-black text-indigo-950 ${veryYoung ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}`}>
        {phonics.sound}
      </p>
    ) : null}
    {phonics.mouth ? (
      <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-center text-base font-bold text-amber-900">
        👄 Watch my mouth: {phonics.mouth}
      </p>
    ) : null}

    {/* The ladder itself — every rung in order, with the child's turns marked. */}
    {phonics.ladder?.length ? (
      <ol className="mt-4 space-y-2">
        {phonics.ladder.map((rung, i) => (
          <li key={i} className="rounded-2xl border-2 border-indigo-100 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">{i + 1}</span>
              <span className="text-sm font-black uppercase tracking-wide text-indigo-900">{rung.step}</span>
              {rung.talkTarget ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">
                  🗣 {rung.talkTarget} out loud
                </span>
              ) : null}
            </div>
            {rung.what ? <p className="mt-1 text-base font-bold text-slate-700">{rung.what}</p> : null}
          </li>
        ))}
      </ol>
    ) : null}

    {/* Hear-the-difference pairs. The child has to HEAR it before they can read it. */}
    {phonics.minimalPairs?.length ? (
      <div className="mt-4 rounded-2xl bg-violet-50 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-violet-600">👂 Hear the difference — say both, which one did I say?</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {phonics.minimalPairs.map((pair, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSay(pair.a)}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-violet-200 bg-white p-3 text-lg font-black text-violet-900 hover:border-violet-400"
            >
              <span>{pair.emojiA || '🔊'} {pair.a}</span>
              <span className="text-violet-300">vs</span>
              <span>{pair.emojiB || '🔊'} {pair.b}</span>
            </button>
          ))}
        </div>
      </div>
    ) : null}

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {phonics.realWords?.length ? (
        <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 p-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">✅ Real words — read them</p>
          <p className="mt-1 text-xl font-black text-emerald-900">{phonics.realWords.join(' · ')}</p>
        </div>
      ) : null}
      {/* Nonsense words are the only fair test of decoding: a real word can be read
          from memory, a made-up one can only be read by sounding it out. */}
      {phonics.nonsenseWords?.length ? (
        <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/50 p-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-sky-600">🎲 Made-up words — can you still read them?</p>
          <p className="mt-1 text-xl font-black text-sky-900">{phonics.nonsenseWords.join(' · ')}</p>
          <p className="mt-1 text-[11px] font-bold text-sky-700">Nobody has seen these before — so they show real sounding-out, not memory.</p>
        </div>
      ) : null}
    </div>

    {phonics.dictation?.length ? (
      <div className="mt-4 rounded-2xl border-2 border-slate-200 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">✏️ Dictation — say each word, the child writes it</p>
        <p className="mt-1 text-lg font-black text-slate-800">{phonics.dictation.join(' · ')}</p>
        {phonics.answerKey?.length ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] font-black uppercase tracking-wider text-slate-400">Show the answers (for you)</summary>
            <p className="mt-1 text-lg font-black text-emerald-700">{phonics.answerKey.join(' · ')}</p>
          </details>
        ) : null}
        <p className="mt-1 text-[11px] font-bold text-slate-400">Then the child reads each word back and checks it themselves.</p>
      </div>
    ) : null}
  </div>
);

/* ── The drill phase: the real engine, opened from inside the run sheet ──────
   Two kinds are a run sheet AND a drill — phonics (the word builder) and Move & Do
   (the command game) — and both want the same slide with their own words on it. So
   the slide carries the KIND's own language: a TPR tutor who reads “build the words”
   looks for words, and a phonics tutor who reads “do the commands” has lost the
   lesson. ────────────────────────────────────────────────────────────────── */
const DrillSlide: React.FC<{
  step?: KidLessonStep;
  phonics?: KidLessonPhonics;
  movement?: KidLessonMovement;
  routine?: KidLessonRoutine;
  circle?: KidLessonCircle;
  storyWalk?: KidLessonStoryWalk;
  quiz?: KidLessonQuiz;
  deck?: KidLessonDeck;
  game?: KidLessonGame;
  veryYoung: boolean;
  onOpen: () => void;
  onSay: (t: string) => void;
}> = ({ step, phonics, movement, routine, circle, storyWalk, quiz, deck, game, veryYoung, onOpen, onSay }) => {
  const commands = movement?.commands || [];
  const moments = routine?.moments || [];
  const beats = storyWalk?.beats || [];
  /* The circle's chips are the three lines the child says in EVERY circle, whatever
     the week: the hello, the wait and the one surprise word. */
  const circleChips = circle
    ? [
        ...(circle.hello?.length ? [{ label: '👋 the same hello', say: circle.hello[0], good: true }] : []),
        ...(circle.waitLine ? [{ label: '🪄 the same wait', say: circle.waitLine, good: true }] : []),
        ...(circle.surprise ? [{ label: `🎁 ${circle.surprise}`, say: circle.surprise, good: true }] : []),
      ]
    : [];
  /* The quiz night's chips are the two things the child SAYS at the big screen: the
     sentence that answers a question (the engine prints the same sentence inside its
     own “Yes!”), and the score line, because counting is English too. */
  const quizChips = quiz
    ? [
        ...((game?.items || []).filter((it) => it.childSays).slice(0, 3).map((it) => ({
          label: `${it.picture || '❓'} ${it.childSays}`,
          say: it.childSays as string,
          good: true,
        }))),
        ...(quiz.scoreLine ? [{ label: `🏆 ${quiz.scoreLine}`, say: quiz.scoreLine, good: true }] : []),
      ]
    : [];
  /* The card night's chips are the lines the child OWES on the deck: every card's
     childSays (a tapped card is still a spoken sentence), then the finish line the
     class says together. The card player opens under them as the drill. */
  const deckChips = deck
    ? [
        ...((deck.cards || []).filter((c) => c.childSays).slice(0, 3).map((c) => ({
          label: `${c.emoji ? `${c.emoji} ` : '🃏'} ${c.childSays}`,
          say: c.childSays as string,
          good: true,
        }))),
        ...(deck.scoreLine ? [{ label: `🏆 ${deck.scoreLine}`, say: deck.scoreLine, good: true }] : []),
      ]
    : [];
  /* The drill slide is shared by every drill kind, so the words on it are the KIND's
     words: phonics brings its word list, TPR its commands, a routine its three
     moments, a story walk its echo and its beats, a circle its hello and its one
     surprise, a quiz its answer sentences. The tutor taps a chip to hear the exact
     line said out loud. */
  const chips: { label: string; say: string; good: boolean }[] = commands.length
    ? commands.map((c) => ({ label: `${c.emoji ? `${c.emoji} ` : ''}${c.command}`, say: c.do || c.command, good: true }))
    : moments.length
      ? moments.map((m) => ({ label: `${m.emoji ? `${m.emoji} ` : ''}${m.moment}`, say: m.say || m.moment, good: true }))
      : beats.length
        ? [
            ...(storyWalk?.echo ? [{ label: `🔁 ${storyWalk.echo}`, say: storyWalk.echo, good: true }] : []),
            ...beats.map((b) => ({ label: `${b.emoji ? `${b.emoji} ` : ''}${b.action}`, say: b.line, good: true })),
          ]
        : circleChips.length
          ? circleChips
          : quizChips.length
            ? quizChips
            : deckChips.length
              ? deckChips
              : [
                  ...(phonics?.realWords || []).map((w) => ({ label: w, say: w, good: true })),
                  ...(phonics?.nonsenseWords || []).map((w) => ({ label: w, say: w, good: false })),
                ];
  const brand = moments.length ? '🚿' : commands.length ? '🤸' : beats.length ? '🤸' : circleChips.length ? '🔄' : quizChips.length ? '❓' : deckChips.length ? '🃏' : '🔤';
  return (
    <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-center text-slate-800 shadow-2xl sm:p-8">
      <span className="text-[72px] leading-none">{brand}</span>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-emerald-500">
        {moments.length
          ? 'The routine game — this phase is the doing'
          : commands.length
            ? 'The movement game — this phase is the doing'
            : beats.length
              ? 'The story walk — this phase is the doing'
              : circleChips.length
                ? 'The circle game — this phase is the doing'
                : quizChips.length
                  ? 'The quiz — this phase is the doing'
                  : deckChips.length
                    ? 'The card night — every card is a line to say'
                    : 'The drill — this phase is the doing'}
      </p>
      <p className={`mt-2 font-black text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
        {step?.name || (moments.length ? 'Do the whole routine' : commands.length ? 'Do the commands' : beats.length ? 'Walk the story' : circleChips.length ? 'Run the whole circle' : quizChips.length ? 'Run the whole quiz night' : deckChips.length ? 'Run the whole card night' : 'Build the words')}
      </p>
      {step?.teacherScript ? (
        <p className="mx-auto mt-3 max-w-3xl text-lg font-bold text-slate-600">🗣 {step.teacherScript}</p>
      ) : null}
      {step?.sayFrame ? (
        <p className={`mt-3 font-black text-emerald-900 ${veryYoung ? 'text-2xl' : 'text-xl'}`}>💬 {step.sayFrame}</p>
      ) : null}
      {chips.length ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {chips.map((c, i) => (
            <button
              key={`${c.label}-${i}`}
              type="button"
              onClick={() => onSay(c.say)}
              className={`rounded-2xl border-2 px-4 py-2 text-xl font-black ${
                c.good ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-sky-200 bg-sky-50 text-sky-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onOpen}
        className="mt-6 rounded-3xl bg-emerald-600 px-8 py-5 text-xl font-black text-white shadow-2xl hover:scale-105 hover:bg-emerald-500 sm:text-2xl"
      >
        {moments.length
          ? '▶ Run the routine game on the big screen'
          : commands.length
            ? '▶ Run the command game on the big screen'
            : beats.length
              ? '▶ Run the story walk on the big screen'
            : circleChips.length
              ? '▶ Run the circle game on the big screen'
              : quizChips.length
                ? '▶ Run the quiz night on the big screen'
                : deckChips.length
                  ? '▶ Deal the pack on the big screen'
                  : '▶ Run the drill on the big screen'}
      </button>
      <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">
        Close it and you come straight back to this phase of the run sheet
      </p>
    </div>
  );
};

/* ── The decodable story: the payoff of the whole lesson ─────────────────────
   A word list proves the child can RECOGNISE; a story proves they can READ. Every
   line here is built out of the family just taught, so the child has never seen the
   words and can still decode them — which is exactly why they read it aloud to you,
   and then tell it back. That retell is the biggest talking lever the kind has.

   For 2-5 there is no reading yet, so the same slide flips: the tutor reads, the
   child joins in with the sound on every line. The story is still the payoff — it is
   just the sound that they say, not the print. ──────────────────────────── */
const DecodableSlide: React.FC<{ story: KidLessonPhonicsStory; veryYoung: boolean; onSay: (t: string) => void }> = ({
  story,
  veryYoung,
  onSay,
}) => (
  <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-center text-slate-800 shadow-2xl sm:p-8">
    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500">
      {veryYoung ? '🔊 Our sound story' : '📖 Read it yourself'}
    </p>
    <p className={`mt-1 font-black text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
      {story.title || 'Our story'}
    </p>
    <p className="mt-2 text-sm font-bold text-slate-500">
      {veryYoung
        ? 'I read, you join in — every time you hear our sound, say it with me!'
        : 'Every word uses the sound we just learned. Sound it out — never guess from the picture.'}
    </p>
    <div className="mt-4 space-y-2">
      {story.lines.map((line, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSay(line)}
          className={`block w-full rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 px-4 py-3 text-left font-black text-emerald-950 hover:border-emerald-300 ${
            veryYoung ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
          }`}
        >
          <span className="mr-2 text-emerald-400">{i + 1}.</span>
          {line}
        </button>
      ))}
    </div>
    {story.trickyWords?.length ? (
      <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
        🧩 Say these two first — they do not follow the rule: {story.trickyWords.join(' · ')}
      </p>
    ) : null}
    {story.retell ? (
      <p className={`mt-4 rounded-2xl bg-indigo-50 p-4 font-black text-indigo-900 ${veryYoung ? 'text-2xl' : 'text-xl'}`}>
        🗣 Now tell it back: {story.retell}
      </p>
    ) : null}
    <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
      {veryYoung ? 'Read it twice — slow, then silly' : 'Read it twice — slowly, then like you are telling it to someone'}
      {story.talkTarget ? ` · ${story.talkTarget} turns out loud` : ''}
    </p>
  </div>
);

/* ── The command ladder: Move & Do's map of its own seven commands ───────────
   Six of the seven are already known and exactly ONE is new — that ratio is the
   method, so the new one is marked. `twoStep` is shown as the stretch for the four-
   and five-year-olds in the band, never as the default, and the speed-play row is how
   the same seven words fill thirty minutes without ever teaching anything new. This
   is the only page of print in the lesson, and the child reads none of it. ──────── */
const MovementSlide: React.FC<{ movement: KidLessonMovement; veryYoung: boolean; onSay: (t: string) => void }> = ({
  movement,
  veryYoung,
  onSay,
}) => (
  <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-slate-800 shadow-2xl sm:p-8">
    <p className="text-center text-xs font-black uppercase tracking-[0.3em] text-amber-500">🤸 The command ladder</p>
    <p className="mt-1 text-center text-sm font-bold text-slate-500">
      Say each command twice and do it big. The child copies you, then says the command back.
    </p>
    {movement.newCommand ? (
      <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-center text-lg font-black text-amber-900">
        🆕 Today’s ONE new command: {movement.newCommand} — everything else they already know
      </p>
    ) : null}
    <ol className="mt-4 space-y-2">
      {(movement.commands || []).map((c, i) => {
        const isNew = !!movement.newCommand && c.command === movement.newCommand;
        return (
          <li key={i} className={`rounded-2xl border-2 p-3 ${isNew ? 'border-amber-300 bg-amber-50/60' : 'border-indigo-100'}`}>
            <button type="button" onClick={() => onSay(c.do || c.command)} className="flex w-full flex-wrap items-center gap-2 text-left">
              <span className="text-3xl">{c.emoji || '🤸'}</span>
              <span className={`font-black text-indigo-950 ${veryYoung ? 'text-2xl' : 'text-xl'}`}>{c.command}</span>
              {isNew ? (
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase text-amber-900">the new one</span>
              ) : null}
              <span className="ml-auto text-sm font-black uppercase tracking-wide text-indigo-400">🔊 hear it</span>
            </button>
            {c.do ? <p className="mt-1 text-base font-bold text-slate-600">🗣 “{c.do}”</p> : null}
            {c.twoStep ? (
              <p className="mt-1 text-sm font-bold text-violet-700">➕ For your fours and fives: “{c.twoStep}”</p>
            ) : null}
          </li>
        );
      })}
    </ol>
    {movement.speedPlay?.length ? (
      <div className="mt-4 rounded-2xl bg-sky-50 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-sky-600">⚡ Same words, four voices — this is how they stay interesting</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {movement.speedPlay.map((s, i) => (
            <span key={i} className="rounded-2xl border-2 border-sky-200 bg-white px-3 py-1 text-base font-black text-sky-900">{s}</span>
          ))}
        </div>
      </div>
    ) : null}
    <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
      Nothing here is read by the child — you say it, they do it
    </p>
  </div>
);

/* ── The crown round: the child gives the orders ──────────────────────────────
   This is the talk engine of the whole kind. TPR is naturally silent — a child can
   have the entire lesson and never say a word — so the last working phase hands the
   microphone over: the child wears the crown, the adult obeys ONLY English, and
   nothing moves until the child says it. The adult “malfunctioning” on purpose is
   what makes the child say the command again, which is the whole point of the phase.
   ─────────────────────────────────────────────────────────────────────────── */
const BossSlide: React.FC<{ movement: KidLessonMovement; veryYoung: boolean; onSay: (t: string) => void }> = ({
  movement,
  veryYoung,
  onSay,
}) => (
  <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-center text-slate-800 shadow-2xl sm:p-8">
    <span className="text-[72px] leading-none">👑</span>
    <p className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-amber-500">Free production — now YOU are the boss</p>
    <p className={`mt-2 font-black text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
      You give the commands!
    </p>
    <p className="mx-auto mt-3 max-w-2xl text-base font-bold text-slate-600">
      👑 Put the crown (or the scarf) on the child. They give a command and you do it — and nothing moves until they
      say it in English. When you get it wrong on purpose, they have to say it again to fix you.
    </p>
    {movement.bossRound?.length ? (
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {movement.bossRound.map((c, i) => (
          <button
            key={`${c}-${i}`}
            type="button"
            onClick={() => onSay(c)}
            className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-3 text-2xl font-black text-amber-900 hover:border-amber-400"
          >
            {c} 🔊
          </button>
        ))}
      </div>
    ) : null}
    <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
      The child talks, the grown-up moves — swap back after a few turns
    </p>
  </div>
);

/* ── The three real moments: a routine lesson's map of the whole day ───────────
   A routine is the one kind whose teaching mostly happens AFTER the session, at the
   sink, the table and the bed — so this slide is written for the grown-up as much as
   the child: each moment carries the real photograph to look at, the exact English to
   say (word for word, because the fixed wording is the method), what the child does
   back, and the one word the child says. The say-it-like-this row underneath is for a
   parent who has never said the words out loud. ─────────────────────────────── */
/*
   The story walk, for 🤸 Move & Tell a Story.

   This is the map the whole session works down, and it is printed beat by beat because
   that is the only shape this kind has: each beat is a sentence the tutor TELLS and an
   action the child DOES. The echo line sits on top of the list, since every beat is
   built on it, and the two-step chain and the choice beat sit under it.
*/
const StoryWalkSlide: React.FC<{ storyWalk: KidLessonStoryWalk; veryYoung: boolean; onSay: (t: string) => void }> = ({
  storyWalk,
  veryYoung,
  onSay,
}) => (
  <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-slate-800 shadow-2xl sm:p-8">
    <p className="text-center text-xs font-black uppercase tracking-[0.3em] text-emerald-500">🤸 The story you walk through</p>
    <p className={`mt-2 text-center font-black text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
      {storyWalk.title || 'Our story'}
    </p>
    {storyWalk.echo ? (
      <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-center text-lg font-black text-amber-900">
        🔁 It comes back in EVERY beat — the child joins in: “{storyWalk.echo}”
      </p>
    ) : null}

    <ol className="mt-4 space-y-3">
      {(storyWalk.beats || []).map((b, i) => (
        <li key={i} className="rounded-2xl border-2 border-emerald-100 p-3">
          <button type="button" onClick={() => onSay(b.line)} className="flex w-full flex-wrap items-center gap-2 text-left">
            <span className="text-3xl">{b.emoji || '🤸'}</span>
            <span className="text-[11px] font-black uppercase tracking-wide text-emerald-500">beat {i + 1}</span>
            <span className="ml-auto text-sm font-black uppercase tracking-wide text-emerald-500">🔊 hear the line</span>
          </button>
          <p className={`mt-1 font-black text-slate-700 ${veryYoung ? 'text-2xl' : 'text-lg'}`}>🗣 “{b.line}”</p>
          <p className="mt-1 text-base font-black text-emerald-800">🧒 {b.action}</p>
          {b.say ? (
            <p className="mt-1 text-base font-black text-indigo-800">💬 The child says: “{b.say}”</p>
          ) : null}
        </li>
      ))}
    </ol>

    {storyWalk.choose ? (
      <p className={`mt-4 rounded-2xl bg-indigo-50 p-4 text-center font-black text-indigo-900 ${veryYoung ? 'text-2xl' : 'text-xl'}`}>
        🗣 The one beat the CHILD decides: {storyWalk.choose}
      </p>
    ) : null}

    {storyWalk.chain?.length ? (
      <div className="mt-4 rounded-2xl border-2 border-slate-200 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">🔗 Two steps in one command — say the whole sentence first</p>
        <ul className="mt-2 space-y-1">
          {storyWalk.chain.map((c, i) => (
            <li key={i} className="text-base font-bold text-slate-700">
              <button type="button" onClick={() => onSay(c)} className="text-left font-black text-indigo-800 hover:text-indigo-500">
                🔊 {c}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}

    {storyWalk.map?.length ? (
      <div className="mt-4 rounded-2xl border-2 border-slate-200 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">🗺️ The story map — the child acts the retell from this, in order</p>
        <p className={`mt-2 font-black text-indigo-900 ${veryYoung ? 'text-2xl' : 'text-xl'}`}>{storyWalk.map.join('  →  ')}</p>
        <p className="mt-1 text-sm font-bold text-slate-500">Words hidden at the last retell — the pictures are all they need.</p>
      </div>
    ) : null}
  </div>
);

const RoutineSlide: React.FC<{ routine: KidLessonRoutine; veryYoung: boolean; onSay: (t: string) => void }> = ({
  routine,
  veryYoung,
  onSay,
}) => (
  <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-slate-800 shadow-2xl sm:p-8">
    <p className="text-center text-xs font-black uppercase tracking-[0.3em] text-emerald-500">🚿 The three real moments</p>
    <p className={`mt-2 text-center font-black text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
      {routine.name || 'Our routine'}
    </p>
    {routine.sameLine ? (
      <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-center text-lg font-black text-amber-900">
        🔁 Say the SAME thing every time: “{routine.sameLine}”
      </p>
    ) : null}

    <ol className="mt-4 space-y-3">
      {(routine.moments || []).map((m, i) => {
        const photoSearch = m.photoQuery
          ? `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(m.photoQuery)}&title=Special:MediaSearch&type=image`
          : null;
        return (
          <li key={i} className="rounded-2xl border-2 border-emerald-100 p-3">
            <button type="button" onClick={() => onSay(m.say || m.moment)} className="flex w-full flex-wrap items-center gap-2 text-left">
              <span className="text-3xl">{m.emoji || '🚿'}</span>
              <span className={`font-black text-indigo-950 ${veryYoung ? 'text-2xl' : 'text-xl'}`}>{m.moment}</span>
              <span className="ml-auto text-sm font-black uppercase tracking-wide text-emerald-500">🔊 hear the line</span>
            </button>
            {m.say ? <p className="mt-1 text-lg font-black text-slate-700">🗣 “{m.say}”</p> : null}
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              {m.childDoes ? <p className="text-sm font-bold text-slate-500">🧒 {m.childDoes}</p> : null}
              {m.childSays ? <p className="text-sm font-black text-emerald-800">💬 {m.childSays}</p> : null}
            </div>
            {photoSearch ? (
              <a
                href={photoSearch}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white hover:bg-indigo-500"
              >
                🔎 Show me a real photo of {m.photoQuery}
              </a>
            ) : null}
          </li>
        );
      })}
    </ol>

    {routine.fillIn ? (
      <p className={`mt-4 rounded-2xl bg-indigo-50 p-4 text-center font-black text-indigo-900 ${veryYoung ? 'text-2xl' : 'text-xl'}`}>
        🗣 Say the first half — the child finishes it: “{routine.fillIn}”
      </p>
    ) : null}

    {routine.pronunciation?.length ? (
      <div className="mt-4 rounded-2xl border-2 border-slate-200 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">👨‍👩‍👧 For the grown-up — how to say it out loud</p>
        <ul className="mt-2 space-y-1">
          {routine.pronunciation.map((p, i) => (
            <li key={i} className="text-base font-bold text-slate-700">
              <span className="font-black text-indigo-800">{p.word}</span>
              {p.hint ? ` — ${p.hint}` : ''}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] font-bold text-slate-400">
          Say the line at the real moment, every day this week. Never test, never translate — just say it and do it.
        </p>
      </div>
    ) : null}
  </div>
);

/* ── The circle: the same four moments, written down once and worked all session ──
   Circle Time's whole method is that the order and the words do not change, so this
   slide is the ritual itself: the hello song line by line, the big pictures the child
   points at, the wait line said before every reveal, the ONE surprise word and the
   goodbye. A tutor with this on screen can run next week's circle without having to
   remember a word of it — and the child hears the identical lines every week. ── */
const CircleSlide: React.FC<{ circle: KidLessonCircle; veryYoung: boolean; onSay: (t: string) => void }> = ({
  circle,
  veryYoung,
  onSay,
}) => (
  <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-slate-800 shadow-2xl sm:p-8">
    <p className="text-center text-xs font-black uppercase tracking-[0.3em] text-emerald-500">🔄 The same circle, every week</p>
    <p className={`mt-2 text-center font-black text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
      {circle.name || 'Our circle'}
    </p>
    <p className="mt-3 rounded-2xl bg-indigo-50 p-3 text-center text-sm font-black text-indigo-900">
      Nothing here changes except the ONE surprise — so the hello, the pictures, the wait and the goodbye stay word for word, every week.
    </p>

    {circle.hello?.length ? (
      <div className="mt-4 rounded-2xl border-2 border-emerald-100 p-3">
        <p className="text-[11px] font-black uppercase tracking-wider text-emerald-500">👋 The hello — the same words at the start of every lesson</p>
        <ul className="mt-2 space-y-1">
          {circle.hello.map((line, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSay(line)}
                className={`text-left font-black text-slate-700 hover:text-emerald-600 ${veryYoung ? 'text-2xl' : 'text-xl'}`}
              >
                🔊 {line}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}

    {circle.check?.length ? (
      <div className="mt-4 rounded-2xl border-2 border-amber-100 p-3">
        <p className="text-[11px] font-black uppercase tracking-wider text-amber-600">👉 The big pictures — the child POINTS, you say the word back</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {circle.check.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSay(c.childSays || c.look)}
              className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-left hover:border-amber-400"
            >
              <span className="text-4xl">{c.emoji || '👉'}</span>
              <span>
                <span className={`block font-black text-amber-900 ${veryYoung ? 'text-2xl' : 'text-xl'}`}>{c.look}</span>
                {c.childSays ? <span className="block text-sm font-black text-emerald-800">💬 “{c.childSays}”</span> : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    ) : null}

    {circle.ask?.length ? (
      <div className="mt-4 rounded-2xl border-2 border-indigo-100 p-3">
        <p className="text-[11px] font-black uppercase tracking-wider text-indigo-500">🗣 The check-in — the CHILD asks these, in this order</p>
        <ul className="mt-2 space-y-1">
          {circle.ask.map((q, i) => (
            <li key={i}>
              <button type="button" onClick={() => onSay(q)} className="text-left text-lg font-black text-indigo-900 hover:text-indigo-500">
                🔊 {q}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}

    {circle.waitLine ? (
      <p className={`mt-4 rounded-2xl bg-indigo-50 p-4 text-center font-black text-indigo-900 ${veryYoung ? 'text-2xl' : 'text-xl'}`}>
        🪄 The same wait before every reveal: “{circle.waitLine}” — the child says the last word with you
      </p>
    ) : null}

    {circle.surprise ? (
      <p className={`mt-4 rounded-2xl bg-emerald-50 p-4 text-center font-black text-emerald-900 ${veryYoung ? 'text-3xl' : 'text-2xl'}`}>
        🎁 The ONE new thing in the box: “{circle.surprise}”
      </p>
    ) : null}

    {circle.goodbye?.length ? (
      <div className="mt-4 rounded-2xl border-2 border-emerald-100 p-3">
        <p className="text-[11px] font-black uppercase tracking-wider text-emerald-500">👋 The goodbye — the same words at the end of every lesson</p>
        <ul className="mt-2 space-y-1">
          {circle.goodbye.map((line, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSay(line)}
                className={`text-left font-black text-slate-700 hover:text-emerald-600 ${veryYoung ? 'text-2xl' : 'text-xl'}`}
              >
                🔊 {line}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}

    {circle.nextTime ? (
      <p className="mt-4 rounded-2xl border-2 border-slate-200 p-3 text-center text-base font-black text-slate-700">
        🗓 The child closes with: “{circle.nextTime}”
      </p>
    ) : null}
  </div>
);

/* ── The story pages: one page on screen, in the biggest type the room can take.
      The tutor TELLS it — the child is listening, not decoding — so nothing here
      asks a pre-reader to read. `rung` hides the words for the later retells. ── */
const StoryPagesSlide: React.FC<{ pages: KidLessonStoryPage[]; veryYoung: boolean; rung: number; onSay: (t: string) => void }> = ({
  pages,
  veryYoung,
  rung,
  onSay,
}) => (
  <div className="mx-auto max-w-5xl rounded-3xl bg-white p-5 text-center text-slate-800 shadow-2xl sm:p-8">
    <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400">
      📚 The story{rung > 0 ? ` · retell ${rung}` : ''}
    </p>
    <div className="mt-4 space-y-4">
      {pages.map((page, i) => (
        <div key={i} className="rounded-2xl border-2 border-slate-200 p-4">
          <span className="text-[54px] leading-none sm:text-[64px]">{page.emoji || '📖'}</span>
          {/* Rung 2 and 3 hide the words — the child supplies them. */}
          {rung === 0 ? (
            <p className={`mt-2 font-black leading-snug text-indigo-950 ${veryYoung ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
              {page.speaker ? <span className="text-slate-400">{page.speaker}: </span> : null}
              {page.text}
            </p>
          ) : (
            <p className="mt-2 text-lg font-black uppercase tracking-widest text-slate-300">words hidden — the child tells this one</p>
          )}
          {rung === 0 && page.text ? (
            <button
              type="button"
              onClick={() => onSay(page.text)}
              className="mt-2 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white hover:bg-indigo-500"
            >
              🔊 Hear this page
            </button>
          ) : null}
        </div>
      ))}
    </div>
  </div>
);

/* ── The retell rungs: the same story back, with less help each time ──────── */
const RetellSlide: React.FC<{ rung: KidLessonRetellRung; map?: KidLessonStoryMap; veryYoung: boolean }> = ({ rung, map, veryYoung }) => {
  const boxes: [string, string | undefined][] = [
    ['👤 Who', map?.character],
    ['📍 Where', map?.setting],
    ['❓ What they wanted', map?.problem],
    ['💗 How they felt', map?.feeling],
    ['🏁 How it ended', map?.ending],
  ];
  return (
    <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-slate-800 shadow-2xl sm:p-8">
      <p className="text-center text-xs font-black uppercase tracking-[0.3em] text-emerald-500">
        🗣 Retell {rung.with ? `— ${rung.with}` : ''}
      </p>
      {rung.prompt ? (
        <p className={`mt-3 text-center font-black leading-snug text-emerald-900 ${veryYoung ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
          {rung.prompt}
        </p>
      ) : null}
      {/* The story map: every retell a child gives is assembled out of these five,
          so they stay on screen for the rungs that need scaffolding. */}
      {map ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {boxes.map(([label, value]) => (
            <div key={label} className="rounded-2xl border-2 border-slate-200 p-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-1 text-base font-bold text-slate-700">{value || '—'}</p>
            </div>
          ))}
        </div>
      ) : null}
      {rung.talkTarget ? (
        <p className="mt-4 text-center text-sm font-black uppercase tracking-widest text-slate-400">
          🗣 {rung.talkTarget} sentences from the child before we move on
        </p>
      ) : null}
    </div>
  );
};

/* ── Hot-seating: the tutor is in role, and the CHILD does the asking ─────── */
const HotSeatSlide: React.FC<{ roleplay: NonNullable<KidLessonStory['roleplay']>; veryYoung: boolean; onSay: (t: string) => void }> = ({
  roleplay,
  veryYoung,
  onSay,
}) => (
  <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-center text-slate-800 shadow-2xl sm:p-8">
    <span className="text-[80px] leading-none">{roleplay.emoji || '🎭'}</span>
    <p className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-violet-500">🎭 Hot-seat</p>
    <p className={`mt-2 font-black text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
      You are {roleplay.character} — the child asks YOU
    </p>
    {roleplay.questions?.length ? (
      <div className="mt-5 space-y-2 text-left">
        <p className="text-center text-[11px] font-black uppercase tracking-wider text-violet-500">Questions the child can ask</p>
        {roleplay.questions.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSay(q)}
            className="block w-full rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-3 text-left text-lg font-bold text-violet-950 hover:border-violet-400"
          >
            ❓ {q}
          </button>
        ))}
      </div>
    ) : null}
    {roleplay.lines?.length ? (
      <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-left">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Lines the child can say in role</p>
        {roleplay.lines.map((l, i) => (
          <p key={i} className="mt-1 text-lg font-black text-slate-700">💬 {l}</p>
        ))}
      </div>
    ) : null}
    <p className="mt-4 text-sm font-bold text-slate-500">Answer in role. Then swap — the child becomes the character and you ask.</p>
  </div>
);

/* ── The real mission: the part of the lesson that leaves the screen ─────── */
const MissionSlide: React.FC<{ mission: KidLessonMission; veryYoung: boolean; onSay: (text: string) => void }> = ({
  mission,
  veryYoung,
  onSay,
}) => (
  <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-slate-800 shadow-2xl sm:p-8">
    <p className="text-center text-xs font-black uppercase tracking-[0.3em] text-emerald-500">🌍 The real-world mission</p>
    <p className={`mt-2 text-center font-black text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
      {mission.title}
    </p>
    {mission.realWorld ? (
      <p className="mt-4 rounded-2xl bg-slate-100 p-4 text-center text-base font-bold text-slate-700">{mission.realWorld}</p>
    ) : null}
    {mission.steps?.length ? (
      <ol className="mx-auto mt-4 max-w-xl space-y-2">
        {mission.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 rounded-2xl border-2 border-slate-200 p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 font-black text-emerald-700">{i + 1}</span>
            <span className="text-base font-bold text-slate-700">{s}</span>
          </li>
        ))}
      </ol>
    ) : null}
    {mission.sayIt ? (
      <div className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">✅ The child is done when they say</p>
        <p className={`mt-1 font-black text-emerald-900 ${veryYoung ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>{mission.sayIt}</p>
        <button
          type="button"
          onClick={() => onSay(mission.sayIt)}
          className="mt-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white hover:bg-emerald-500"
        >
          🔊 Hear it
        </button>
      </div>
    ) : null}
  </div>
);

/* ── The word cards: one enormous card for the little ones, a shelf for 5+ ── */
const WordsSlide: React.FC<{ words: KidLessonWord[]; veryYoung: boolean; index: number; onSay: (text: string) => void }> = ({
  words,
  veryYoung,
  index,
  onSay,
}) => {
  if (veryYoung) {
    const word = words[Math.min(index, words.length - 1)];
    if (!word) return null;
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center rounded-3xl bg-white p-8 text-center text-slate-800 shadow-2xl">
        {/* A real photograph of the word when one can be found safely, the big emoji
            forever underneath. At 2-5 the picture IS the word. */}
        <KidPicture word={word.word} emoji={word.emoji} size={170} />
        <p className="mt-4 text-5xl font-black text-indigo-950">{word.word}</p>
        {word.sayAloud ? <p className="mt-2 text-2xl font-bold text-slate-500">{word.sayAloud}</p> : null}
        <button
          type="button"
          onClick={() => onSay(word.word)}
          className="mt-6 flex items-center gap-2 rounded-3xl bg-indigo-600 px-8 py-4 text-xl font-black text-white shadow-lg hover:bg-indigo-500"
        >
          <Volume2 className="h-6 w-6" /> Say it again
        </button>
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 sm:grid-cols-3">
      {words.map((word, i) => (
        <button
          key={`${word.word}-${i}`}
          type="button"
          onClick={() => onSay(word.word)}
          className="rounded-3xl bg-white p-5 text-center text-slate-800 shadow-xl transition-transform hover:scale-[1.03]"
        >
          {/* One duck on every laptop: the emoji as crisp SVG, with the glyph as the fallback. */}
          <KidEmoji emoji={word.emoji || '🔤'} size={62} className="mx-auto" />
          <p className="mt-2 text-2xl font-black text-indigo-950">{word.word}</p>
          {word.meaning ? <p className="mt-1 text-sm font-bold text-slate-500">{word.meaning}</p> : null}
          {word.example ? <p className="mt-1 text-sm italic text-indigo-500">{word.example}</p> : null}
        </button>
      ))}
    </div>
  );
};

export const KidLessonLauncher: React.FC<KidLessonLauncherProps> = ({
  learner,
  band,
  lesson,
  game,
  customization,
  onClose,
  onFinish,
}) => {
  const rawBand = band || (lesson?.band as KidAgeBand | undefined) || game?.script.band || 'young';
  const bandId: KidAgeBand = rawBand === 'veryYoung' ? 'veryYoung' : 'young';
  const profile = KID_BANDS[bandId];
  const veryYoung = bandId === 'veryYoung';
  const identity = useMemo(() => identityFor(learner), [learner]);
  const voiceName = customization?.voiceName || '';

  const steps = useMemo(() => lesson?.steps || [], [lesson]);
  const words = useMemo(() => lesson?.words || [], [lesson]);
  const items = useMemo(() => lesson?.game?.items || [], [lesson]);
  /** Only the media that belongs on the class screen — the home links stay for the family page. */
  const media = useMemo(() => (lesson?.media || []).filter((m) => m.where !== 'home'), [lesson]);
  const lyrics = useMemo(() => (lesson?.lyrics || []).filter(Boolean), [lesson]);
  const story = useMemo(() => lesson?.story, [lesson]);
  /** The story walk's beats, for the beat the story slide lands on. */
  const beats = useMemo(() => lesson?.storyWalk?.beats || [], [lesson]);
  const title = lesson?.title || game?.script.title || lesson?.game?.name || 'Our lesson';

  /* The stage this KIND plays on. A lesson that is an object — a deck, a grid, a
     sheet — must not be dressed up as a row of step slides. */
  const stage = useMemo(() => stageForLesson(lesson?.kind), [lesson?.kind]);
  /* A DRILL kind keeps the deck — its engine is opened from inside one phase rather
     than replacing the whole screen — so the script has to be built for it too. */
  const engineScript = useMemo(
    () => (lesson && (stage.stage === 'engine' || stage.drill) ? stageScriptFor(lesson) : null),
    [lesson, stage.stage, stage.drill],
  );
  const engineGame = useMemo(
    () => (lesson && (stage.stage === 'engine' || stage.drill) ? stageGameFor(lesson) : null),
    [lesson, stage.stage, stage.drill],
  );

  /*
   * The order of a session.
   *
   * The real photograph opens it (that is the hook's picture), the phases run, and
   * the real-world mission closes it just before the exit ticket — so the last thing
   * that happens in the lesson is the child saying something out loud about their own
   * life, not the tutor showing one more screen.
   */
  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    if (lesson?.scene?.title) out.push({ kind: 'scene' });
    /* The sound ladder comes straight after the hook picture: it is the map of the
       whole session — hear, say, find, blend, read, spell, write — and the tutor
       works down it while the phases below decide when. */
    if (lesson?.phonics) out.push({ kind: 'phonics' });
    /* The command ladder, for TPR: the session IS these seven commands, so the ladder
       is the map the phases work down — printed once, worked the whole session. */
    if (lesson?.movement?.commands?.length) out.push({ kind: 'movement' });
    /* The three real moments, for a routine: the map of the day the whole session
       works down, written for the grown-up as much as the child. */
    if (lesson?.routine?.moments?.length) out.push({ kind: 'routine' });
    /* The circle, straight after the hook picture: it is the whole ritual — the hello,
       the pictures, the wait, the surprise and the goodbye — and the session is made
       of walking down it in exactly that order. */
    if (lesson?.circle) out.push({ kind: 'circle' });
    /* The story comes right after the hook picture and before the run sheet, because
       the pages are what the tutor tells FROM — the phases then tell them when. */
    if (story?.pages?.length) out.push({ kind: 'story', rung: 0 });
    /* The crown round belongs to the free-production phase, so it lands straight
       AFTER that phase rather than at the end of the deck: the child's turn with the
       microphone is the phase itself, not a slide about it. With no phase named, it
       falls back to just before the wrap, the same place the decodable story takes. */
    const crownAfter = lesson?.movement?.bossRound?.length
      ? steps.findIndex((s) => /free production/i.test(`${s.phase || ''} ${s.name || ''}`))
      : -1;
    const crownAt = crownAfter >= 0 ? crownAfter : Math.max(0, steps.length - 2);
    /* The story arrives when it is told, not before it is guessed: Move & Tell a
       Story opens with a guess, so the beats land immediately BEFORE the phase the
       tutor tells them in (GUIDED TALK). A lesson with no named phases still gets
       the story right after the hook picture. */
    const walkAfter = beats.length
      ? steps.findIndex((s) => /guided talk/i.test(`${s.phase || ''} ${s.name || ''}`))
      : -1;
    const walkAt = walkAfter >= 0 ? walkAfter : 1;
    steps.forEach((step, i) => {
      /* The decodable story arrives immediately before the FINAL phase: the child
         reads it aloud themselves, and then the wrap closes the session on it. A
         story that arrives after the goodbye is a story nobody reads. */
      if (i === steps.length - 1 && lesson?.phonics?.decodable?.lines?.length) out.push({ kind: 'decodable' });
      if (beats.length && i === walkAt) out.push({ kind: 'storyWalk' });
      out.push({ kind: 'step', index: i });
      if (lesson?.movement?.bossRound?.length && i === crownAt) out.push({ kind: 'crown' });
    });
    /* Then the same story handed back over, three times, with less help each time. */
    (story?.rungs || []).forEach((_, i) => out.push({ kind: 'story', rung: i + 1 }));
    if (story?.roleplay) out.push({ kind: 'hotseat' });
    /* A lesson with a decodable story but no phases still needs to show it. */
    if (!steps.length && lesson?.phonics?.decodable?.lines?.length) out.push({ kind: 'decodable' });
    /* Same for the crown round: a TPR lesson with no phases still gets its big turn. */
    if (!steps.length && lesson?.movement?.bossRound?.length) out.push({ kind: 'crown' });
    /* Same for the story walk: no phases, but the beats still need showing. */
    if (!steps.length && beats.length) out.push({ kind: 'storyWalk' });
    if (words.length) out.push({ kind: 'words' });
    if (lyrics.length) out.push({ kind: 'lyrics' });
    if (items.length) out.push({ kind: 'activity' });
    media.forEach((_, i) => out.push({ kind: 'media', index: i }));
    if (lesson?.mission?.title) out.push({ kind: 'mission' });
    out.push({ kind: 'wrap' });
    return out;
  }, [steps, words.length, lyrics.length, items.length, media, lesson?.scene?.title, lesson?.mission?.title, lesson?.phonics, lesson?.movement, lesson?.routine, lesson?.circle, lesson?.storyWalk, beats, story]);

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [stars, setStars] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const spokenFor = useRef('');

  /* Which slide is on screen, and whether it is the last one. Declared here rather
     than next to the render because the clock and the talk meter are measured
     against the phase the tutor is actually in. */
  const slide = slides[Math.min(index, slides.length - 1)];
  const isLast = index >= slides.length - 1;

  /* ── The session clock ──────────────────────────────────────────────────────
     A tutor is paid for a session, not for a worksheet. This counts UP from zero
     toward the session's target so the tutor can always see how much of the hour
     is still to fill — and the run sheet's minute floors are measured against it,
     which is what stops a lesson being over in eight minutes.

     The intervals stop when the run screen is not mounted, so a lesson left open
     overnight costs nothing. */
  const runSheet = lesson?.run;
  const targetMinutes = runSheet?.targetMinutes || Number(lesson?.durationMinutes) || 30;
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!started || finished) return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [started, finished]);

  /* ── The talk meter ─────────────────────────────────────────────────────────
     Each phase owes the child a number of spoken turns, and the tutor counts them
     by tapping the big button every time the child says something. The phase will
     not advance until the target is met — but the Next button always offers a way
     through, because a tutor must never be trapped by a lesson. */
  const [talkCount, setTalkCount] = useState(0);
  useEffect(() => {
    setTalkCount(0);
  }, [index, wordIndex, itemIndex]);
  const talkTarget = slide?.kind === 'step' ? steps[slide.index]?.talkTarget || 0 : 0;
  const talkMet = !talkTarget || talkCount >= talkTarget;

  /* The break card, shown once per phase change when the lesson brought breaks. */
  const breaks = runSheet?.brainBreaks || [];
  const [breakOpen, setBreakOpen] = useState(false);
  /*
   * The drill, opened from inside its phase.
   *
   * A phonics lesson is a 30-minute progression AND a drill, and the two are not the
   * same thing. The run sheet is the spine; the drill is the one phase where the child
   * actually builds the words. So the engine opens over the deck from that phase, and
   * closing it returns to the SAME phase — the clock, the floor and the talk meter all
   * carry on where they were, because the tutor never really left the run sheet.
   */
  const [drillOpen, setDrillOpen] = useState(false);
  const breakFor = useMemo(() => (breaks.length ? breaks[(slide?.kind === 'step' ? slide.index : index) % breaks.length] : ''), [breaks, slide, index]);
  /*
   * When a reset is due.
   *
   * A three-year-old needs one roughly every other phase — five minutes of sitting is
   * the outside edge at that age. A nine-year-old can hold a thought for longer, so
   * they get one every third phase: fewer, but not none. A thirty-minute session with
   * no reset in it is how the last ten minutes get lost.
   */
  const breakEvery = veryYoung ? 2 : 3;
  const breakDue = useMemo(() => {
    if (!breaks.length) return false;
    return slide?.kind === 'step' && (slide.index + 1) % breakEvery === 0;
  }, [breaks.length, breakEvery, slide]);

  /* The phase the tutor is in right now, and how long it has been running. */
  const phaseInfo = useMemo(() => {
    if (slide?.kind !== 'step') return null;
    const step = steps[slide.index];
    if (!step) return null;
    const phaseMinutes = typeof step.minutes === 'number' ? step.minutes : Number(step.minutes) || 0;
    const floor = step.floorMinutes || phaseMinutes;
    const before = steps.slice(0, slide.index).reduce((sum, s) => sum + (typeof s.minutes === 'number' ? s.minutes : 0), 0);
    const startedAt = before * 60;
    const into = Math.max(0, elapsed - startedAt);
    return {
      step,
      floor,
      phaseMinutes,
      into,
      remaining: Math.max(0, phaseMinutes * 60 - into),
      floorLeft: Math.max(0, floor * 60 - into),
    };
  }, [slide, steps, elapsed]);

  const totalSpoken = useMemo(
    () => (lesson?.talkGoal || 0) || steps.reduce((sum, s) => sum + (s.talkTarget || 0), 0),
    [lesson?.talkGoal, steps],
  );

  /* How many spoken turns have already been banked.
     Only the phases the tutor has FINISHED count, plus the live count in the one on
     screen — a counter that opens at 40/40 (as it did before this) tells the tutor
     the session is complete before the child has said a word. Before the first phase
     the answer is zero; after the last phase it is everything. */
  const stepOffset = useMemo(() => slides.findIndex((s) => s.kind === 'step'), [slides]);
  const spokenBanked = useMemo(() => {
    if (!steps.length || stepOffset < 0) return 0;
    /* On a phase it is the phases already finished; on any other slide it is the
       phases that come BEFORE it in the deck. Counting "not a phase = the whole
       session" opened the meter at 40/40 on a decodable story sitting between the
       drill and the wrap — telling the tutor the session was done before it was. */
    const position = slide?.kind === 'step'
      ? slide.index
      : slides.slice(0, index).filter((s) => s.kind === 'step').length;
    return steps.slice(0, position).reduce((sum, s) => sum + (s.talkTarget || 0), 0);
  }, [steps, slide, index, stepOffset, slides]);
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  const narrate = useCallback((text: string) => speak(text, voiceName, veryYoung), [voiceName, veryYoung]);

  /* Read the slide out loud as it appears — the screens are built for a room. */
  useEffect(() => {
    if (!started || finished || !slide) return;
    const key = `${index}:${wordIndex}:${itemIndex}`;
    if (spokenFor.current === key) return;
    spokenFor.current = key;
    const timer = window.setTimeout(() => {
      if (slide.kind === 'step') {
        const step = steps[slide.index];
        narrate([step?.teacherScript, step?.childAction].filter(Boolean).join('. '));
      } else if (slide.kind === 'words') {
        narrate(words[veryYoung ? wordIndex : 0]?.word || '');
      } else if (slide.kind === 'activity') {
        narrate(items[itemIndex]?.prompt || '');
      } else if (slide.kind === 'media') {
        narrate(media[slide.index]?.title || '');
      } else if (slide.kind === 'lyrics') {
        narrate(lyrics[0] || '');
      } else if (slide.kind === 'scene') {
        narrate(lesson?.scene?.title || '');
      } else if (slide.kind === 'story') {
        narrate(slide.rung === 0 ? (story?.pages?.[0]?.text || '') : (story?.rungs?.[slide.rung - 1]?.prompt || ''));
      } else if (slide.kind === 'hotseat') {
        narrate(story?.roleplay?.character ? `You are ${story.roleplay.character}` : '');
      } else if (slide.kind === 'mission') {
        narrate(lesson?.mission?.sayIt || '');
      } else if (slide.kind === 'phonics') {
        narrate(lesson?.phonics?.sound || '');
      } else if (slide.kind === 'decodable') {
        narrate(lesson?.phonics?.decodable?.lines?.[0] || '');
      } else if (slide.kind === 'movement') {
        narrate(lesson?.movement?.newCommand
          ? `Here is the new one for today. ${lesson.movement.newCommand}.`
          : (lesson?.movement?.commands?.[0]?.do || ''));
      } else if (slide.kind === 'crown') {
        narrate((lesson?.movement?.bossRound || []).join(', ') || 'You give the commands!');
      } else if (slide.kind === 'routine') {
        narrate(lesson?.routine?.moments?.[0]?.say || lesson?.routine?.name || '');
      } else if (slide.kind === 'circle') {
        narrate(lesson?.circle?.hello?.[0] || lesson?.circle?.name || '');
      } else if (slide.kind === 'storyWalk') {
        narrate(lesson?.storyWalk?.beats?.[0]?.line || lesson?.storyWalk?.title || '');
      } else {
        narrate(veryYoung ? 'You did it! Well done!' : 'Great work! Let us remember what we learned.');
      }
    }, 420);
    return () => window.clearTimeout(timer);
  }, [started, finished, slide, index, wordIndex, itemIndex, steps, words, items, media, lyrics, lesson?.scene?.title, lesson?.mission?.sayIt, lesson?.phonics, veryYoung, narrate]);

  /**
   * The next slide, gated on the phase's talk target.
   *
   * `force` is the tutor's override, and it exists on purpose: a lesson that traps a
   * tutor behind a counter is worse than a lesson that under-counts. The button says
   * exactly what is outstanding ("3 more times out loud") next to a quiet way past it.
   */
  const next = useCallback((force = false) => {
    playClick();
    setShowHelp(false);
    if (!force && slide?.kind === 'step' && talkTarget && talkCount < talkTarget) {
      playErrorSound();
      return;
    }
    if (slide?.kind === 'words' && veryYoung && wordIndex < words.length - 1) {
      setWordIndex((w) => w + 1);
      return;
    }
    if (slide?.kind === 'activity' && itemIndex < items.length - 1) {
      setItemIndex((i) => i + 1);
      setPicked(null);
      setRevealed(false);
      return;
    }
    if (isLast) {
      setFinished(true);
      playLevelUpFanfare();
      return;
    }
    /* Leaving a phase is when a brain break is offered, not mid-phase — a reset in
       the middle of a story breaks the story. */
    if (breakDue && breakFor) setBreakOpen(true);
    setIndex((i) => i + 1);
    setPicked(null);
    setRevealed(false);
  }, [slide, talkTarget, talkCount, veryYoung, wordIndex, words.length, itemIndex, items.length, isLast, breakDue, breakFor]);

  const prev = useCallback(() => {
    playClick();
    if (slide?.kind === 'activity' && itemIndex > 0) {
      setItemIndex((i) => i - 1);
      setPicked(null);
      setRevealed(false);
      return;
    }
    setIndex((i) => Math.max(0, i - 1));
    setPicked(null);
    setRevealed(false);
  }, [slide, itemIndex]);

  const leave = useCallback(() => {
    playClick();
    onFinish?.({ stars, title });
    onClose();
  }, [stars, title, onFinish, onClose]);

  /* One hand free at the board: arrows move, space repeats, escape leaves. */
  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (slide?.kind === 'step') narrate(steps[slide.index]?.teacherScript || '');
        else if (slide?.kind === 'activity') narrate(items[itemIndex]?.prompt || '');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        leave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, next, prev, leave, slide, steps, items, itemIndex, narrate]);

  /* ── A game: the same splash, then straight to the projector stage ── */
  if (game && started) {
    return <KidGameStage script={game.script} game={game.game} learner={learner} onClose={leave} />;
  }

  /* ── A lesson whose kind is an OBJECT, not an order ──
     These three branches are the whole point of `kidLessonStage.ts`: flashcards open
     as a deck you turn, memory pairs as a grid you flip, a worksheet as a sheet you
     print. The splash above is still shared, so the child meets the same start every
     time; only the play changes, and it changes to the thing the tile promised. */
  if (lesson && started) {
    if (stage.stage === 'paper') {
      return <KidPaperStage lesson={lesson} learnerName={learner.name || ''} onClose={leave} />;
    }
    if (stage.stage === 'engine' && engineScript && engineGame) {
      return <KidGameStage script={engineScript.script} game={engineGame} learner={learner} onClose={leave} />;
    }
  }

  /* ── Splash — identical for every content type, banded by age ── */
  if (!started) {
    return (
      <div className={`fixed inset-0 z-[80] flex flex-col items-center justify-center bg-gradient-to-br ${profile.color} p-6 text-center text-white`}>
        <button onClick={leave} className="absolute right-4 top-4 rounded-2xl bg-black/20 p-2 hover:bg-black/30" title="Close">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-end gap-4 text-7xl sm:text-8xl">
          <span title={identity.heroForm || 'hero'}>{identity.hero}</span>
          {identity.pet ? <span title={identity.petForm || 'pet'}>{identity.pet}</span> : null}
          <span title="kingdom">{identity.crest}</span>
        </div>
        <p className="mt-5 text-sm font-black uppercase tracking-[0.3em] text-white/80">
          {profile.emoji} {profile.label} · {profile.ages}
        </p>
        <h1 className="mt-2 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg font-bold text-white/90">
          {learner.name || 'Our learner'}
          {identity.heroForm ? ` the ${identity.heroForm}` : ''}
          {identity.petForm ? ` and ${identity.petForm}` : ''} — ready?
        </p>
        <button
          onClick={() => {
            playClick();
            setStarted(true);
          }}
          className="mt-9 flex items-center gap-3 rounded-3xl bg-white px-10 py-5 text-2xl font-black text-indigo-700 shadow-2xl transition-transform hover:scale-105 sm:text-3xl"
        >
          <Play className="h-8 w-8" /> Let&rsquo;s go!
        </button>
        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-white/60">
          ← → move · Space hear it again · Esc leave
        </p>
      </div>
    );
  }

  /* ── The run screen ── */
  const progress = slide
    ? slide.kind === 'step'
      ? `${slide.index + 1}/${steps.length}`
      : slide.kind === 'scene'
        ? 'Look together'
        : slide.kind === 'phonics'
          ? 'The sound ladder'
          : slide.kind === 'decodable'
            ? 'Read it yourself'
            : slide.kind === 'movement'
              ? 'The command ladder'
                : slide.kind === 'routine'
                  ? 'The three moments'
                  : slide.kind === 'circle'
                    ? 'The same circle'
                  : slide.kind === 'storyWalk'
                    ? 'The story you walk'
                  : slide.kind === 'crown'
                    ? 'You are the boss'
            : slide.kind === 'story'
          ? (slide.rung > 0 ? `Retell ${slide.rung}` : 'The story')
          : slide.kind === 'hotseat'
            ? 'Hot-seat'
        : slide.kind === 'mission'
          ? 'Real-world mission'
          : slide.kind === 'words'
            ? 'Words'
            : slide.kind === 'lyrics'
              ? 'Song'
              : slide.kind === 'activity'
                ? `Play ${itemIndex + 1}/${items.length}`
                : slide.kind === 'media'
                  ? `Look ${slide.index + 1}/${media.length}`
                  : 'Finish'
    : '';

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-gradient-to-b from-slate-900 to-indigo-950 text-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-5 sm:py-3">
        <span className="text-2xl sm:text-3xl">{identity.hero}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black sm:text-xl">{title}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 sm:text-xs">
            {profile.emoji} {learner.name || 'Learner'} · {progress}
            {identity.pet ? ` · ${identity.pet}` : ''}
            {identity.crest ? ` · ${identity.crest}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              playClick();
              setShowHelp((v) => !v);
            }}
            className={`rounded-xl p-2 ${showHelp ? 'bg-amber-400/80' : 'bg-white/10 hover:bg-white/20'}`}
            title="How to run this"
          >
            <Info className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              playClick();
            if (slide?.kind === 'step') narrate(steps[slide.index]?.teacherScript || '');
            else if (slide?.kind === 'activity') narrate(items[itemIndex]?.prompt || '');
            else if (slide?.kind === 'media') narrate(media[slide.index]?.title || '');
            else if (slide?.kind === 'lyrics') narrate(lyrics.join('. '));
            else if (slide?.kind === 'scene') narrate(lesson?.scene?.title || '');
            else if (slide?.kind === 'story') narrate(slide.rung === 0 ? (story?.pages || []).map((p) => p.text).join('. ') : (story?.rungs?.[slide.rung - 1]?.prompt || ''));
            else if (slide?.kind === 'hotseat') narrate(story?.roleplay?.questions?.[0] || '');
            else if (slide?.kind === 'mission') narrate(lesson?.mission?.sayIt || '');
            else if (slide?.kind === 'phonics') narrate(lesson?.phonics?.sound || '');
            else if (slide?.kind === 'decodable') narrate((lesson?.phonics?.decodable?.lines || []).join('. '));
            else if (slide?.kind === 'movement') narrate((lesson?.movement?.commands || []).map((c) => c.do || c.command).join('. '));
            else if (slide?.kind === 'crown') narrate((lesson?.movement?.bossRound || []).join(', ') || 'You give the commands!');
            else if (slide?.kind === 'routine') narrate((lesson?.routine?.moments || []).map((m) => m.say || m.moment).join('. '));
            else if (slide?.kind === 'circle') narrate([...(lesson?.circle?.hello || []), lesson?.circle?.waitLine || '', ...(lesson?.circle?.goodbye || [])].join('. '));
            else if (slide?.kind === 'storyWalk') narrate((lesson?.storyWalk?.beats || []).map((b) => b.line).join(' '));
            else narrate(words[wordIndex]?.word || '');
            }}
            className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
            title="Say it again (Space)"
          >
            <Volume2 className="h-4 w-4" />
          </button>
          <button onClick={leave} className="rounded-xl bg-rose-500/80 p-2 hover:bg-rose-500" title="Close (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showHelp ? (
        <div className="border-b border-white/10 bg-white/5 px-4 py-3 text-white/90 sm:px-6">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">How to run it</p>
          <p className="mt-1 max-w-4xl text-sm font-bold leading-relaxed">
            {lesson?.game?.howToPlay || lesson?.teacherNote || 'Say it with the child, then let them try it alone. Praise every try.'}
          </p>
          <p className="mt-2 max-w-4xl text-[11px] font-medium text-white/60">
            {profile.ages} · {veryYoung ? 'No score, no losing — “nearly, try again” is the harshest feedback' : 'Stars are for the class; points stay with you'} · ← → move · Space repeat · Esc close
          </p>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {/* The drill phase, open over the deck. Closing it drops the tutor back on the
            same phase, with the clock and the talk meter exactly where they were. */}
        {drillOpen && engineScript && engineGame ? (
          <KidGameStage script={engineScript.script} game={engineGame} learner={learner} onClose={() => setDrillOpen(false)} />
        ) : finished ? (
          <div className="mx-auto flex max-w-3xl flex-col items-center rounded-3xl bg-white p-8 text-center text-slate-800 shadow-2xl">
            <span className="text-[90px]">{veryYoung ? '🎉' : '🏆'}</span>
            <p className="mt-2 text-3xl font-black text-indigo-950 sm:text-4xl">{veryYoung ? 'You did it! Well done!' : 'Nice work — lesson complete!'}</p>
            {!veryYoung ? <p className="mt-2 text-lg font-black text-amber-600">Stars earned: {stars}</p> : null}
            <ul className="mt-4 max-w-xl space-y-1">
              {(lesson?.objectives?.length
                ? lesson.objectives
                : veryYoung
                  ? ['Say one word you learned today!', 'Give your grown-up a high five!']
                  : ['Say one thing you can do now that you could not do before.', 'Tell your family one word you learned today.']
              ).map((line, i) => (
                <li key={i} className="text-base font-bold text-slate-600 sm:text-lg">
                  • {line}
                </li>
              ))}
            </ul>
            {lesson?.caregiverNote ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">👨‍👩‍👧 {lesson.caregiverNote}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => {
                  playClick();
                  setFinished(false);
                  setIndex(0);
                  setWordIndex(0);
                  setItemIndex(0);
                  setPicked(null);
                  setRevealed(false);
                  setStars(0);
                  spokenFor.current = '';
                }}
                className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-base font-black text-white shadow-lg hover:bg-indigo-500"
              >
                <RotateCcw className="h-4 w-4" /> Play again
              </button>
              <button
                onClick={leave}
                className="rounded-2xl border-2 border-slate-200 px-5 py-3 text-base font-black text-slate-600 hover:border-slate-400"
              >
                Back to the creator
              </button>
            </div>
          </div>
        ) : (
          <SlideBody
            slide={slide}
            lesson={lesson}
            steps={steps}
            words={words}
            items={items}
            media={media}
            lyrics={lyrics}
            veryYoung={veryYoung}
            wordIndex={wordIndex}
            itemIndex={itemIndex}
            picked={picked}
            revealed={revealed}
            onSay={narrate}
            onPick={(option, correct) => {
              setPicked(option);
              setRevealed(true);
              if (correct) {
                setStars((s) => s + 1);
                if (veryYoung) playQuestDing();
                else playStarShower();
              } else {
                playErrorSound();
              }
            }}
            onReveal={() => setRevealed(true)}
            onOpenDrill={() => setDrillOpen(true)}
          />
        )}
      </div>

      {/* ── The brain break ──
          Offered at a phase edge, never mid-story. For a very young child this is not
          a reward, it is the thing that makes a 30-minute session possible at all. */}
      {breakOpen && breakFor ? (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-indigo-950/96 p-6 text-center text-white">
          <span className="text-[80px] sm:text-[100px]">🧘</span>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.3em] text-amber-300">Brain break</p>
          <p className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">{breakFor}</p>
          <button
            onClick={() => {
              playClick();
              setBreakOpen(false);
            }}
            className="mt-8 rounded-3xl bg-white px-8 py-5 text-xl font-black text-indigo-700 shadow-2xl hover:scale-105 sm:text-2xl"
          >
            We did it — straight back in ▶
          </button>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-white/50">Ninety seconds, then the next phase</p>
        </div>
      ) : null}

      {/* ── The run bar: the clock, the phase timer and the talk meter ──
          Three numbers, because they are the three ways a lesson quietly fails:
          it finishes far too early, a phase overruns, or the child never speaks.
          The tutor sees all three at a glance and can fix any of them mid-lesson. */}
      {!finished && lesson ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 bg-black/20 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white/60 sm:px-6">
          <span title="Time since the session started">⏱ {clock}</span>
          <span className="text-white/30" title="The length the run sheet plans for">of {targetMinutes}:00</span>
          {totalSpoken ? (
            <span className="text-emerald-300/90" title="Spoken turns the child owes across the whole session">
              💬 {spokenBanked + talkCount}/{totalSpoken}
            </span>
          ) : null}
          {phaseInfo ? (
            <>
              <span className="text-amber-300/90">
                {phaseInfo.step.phase || 'PHASE'} · {Math.floor(phaseInfo.into / 60)}:{String(phaseInfo.into % 60).padStart(2, '0')}
              </span>
              <span className="text-white/40">
                {phaseInfo.remaining > 0 ? `${Math.ceil(phaseInfo.remaining / 60)} min left` : 'phase over — use the reserve'}
              </span>
              {phaseInfo.floor > 0 && phaseInfo.floorLeft > 0 ? (
                <span className="text-rose-300/80" title="This phase cannot end before its minute floor">
                  🔒 {Math.ceil(phaseInfo.floorLeft / 60)} min minimum
                </span>
              ) : null}
            </>
          ) : null}
          {/* The reserve: what to do here if the phase finished early. It is the whole
              reason a lesson does not simply stop when the child is quick. */}
          {phaseInfo?.step.reserve?.length ? (
            <span className="w-full text-white/45" title="Use these if the phase runs short — the lesson deepens, it does not end">
              ➕ If this phase runs short: {phaseInfo.step.reserve.join(' · ')}
            </span>
          ) : null}
        </div>
      ) : null}

      {!finished ? (
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-3 sm:px-6">
          <button
            onClick={prev}
            disabled={index === 0 && !(slide?.kind === 'activity' && itemIndex > 0)}
            className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-3 text-sm font-black text-white hover:bg-white/20 disabled:opacity-30 sm:px-4"
          >
            <ChevronLeft className="h-5 w-5" /> Back
          </button>

          {/* The talk meter. The tutor taps once per thing the child says out loud;
              the phase will not advance until the count is met, and the button says
              how many are still owed. The override is deliberately quiet. */}
          {talkTarget ? (
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setTalkCount((c) => c + 1);
                  if (talkCount + 1 >= talkTarget) playQuestDing();
                }}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition-all ${
                  talkMet ? 'bg-emerald-500/90 text-white' : 'bg-sky-500/90 text-white hover:bg-sky-400'
                }`}
                title="Tap every time the child says something out loud"
              >
                💬 {talkMet ? 'Talk target met!' : 'They said it! +1'}
                <span className="rounded-full bg-black/25 px-2 py-0.5 text-[11px]">{talkCount}/{talkTarget}</span>
              </button>
              {!talkMet ? (
                <button type="button" onClick={() => next(true)} className="text-[10px] font-bold uppercase tracking-wider text-white/35 hover:text-white/60">
                  move on anyway
                </button>
              ) : null}
            </div>
          ) : (
            <p className="hidden text-center text-[11px] font-bold uppercase tracking-widest text-white/40 sm:block">
              {slide?.kind === 'words' && veryYoung
              ? `Word ${wordIndex + 1} of ${words.length}`
              : slide?.kind === 'step' && steps[slide.index]?.drill
                ? 'The sound drill'
                : progress}
            </p>
          )}

          <button
            onClick={() => next()}
            className={`flex items-center gap-2 rounded-2xl px-6 py-4 font-black text-white shadow-xl sm:px-10 sm:py-5 ${
              isLast && !(slide?.kind === 'activity' && itemIndex < items.length - 1)
                ? 'bg-emerald-500 hover:bg-emerald-400'
                : talkMet
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300'
                  : 'bg-slate-600 hover:bg-slate-500'
            }`}
            style={{ fontSize: veryYoung ? '1.4rem' : '1.15rem' }}
            title={talkTarget && !talkMet ? `${talkTarget - talkCount} more out loud before this phase is done` : undefined}
          >
            {isLast && !(slide?.kind === 'activity' && itemIndex < items.length - 1)
              ? '🏁 Finish'
              : slide?.kind === 'words' && veryYoung && wordIndex < words.length - 1
                ? 'Next word'
                : talkTarget && !talkMet
                  ? `Say ${talkTarget - talkCount} more`
                  : veryYoung ? 'Next ▶' : 'Next'}
            {!(isLast && !(slide?.kind === 'activity' && itemIndex < items.length - 1)) ? <ChevronRight className="h-6 w-6" /> : null}
          </button>
        </div>
      ) : null}
    </div>
  );
};

/* ── Slide bodies live in one small switch so a new type is added in one place ── */
interface SlideBodyProps {
  slide: Slide | undefined;
  lesson?: KidLesson | null;
  steps: KidLessonStep[];
  words: KidLessonWord[];
  items: KidLessonGameItem[];
  media: KidLessonMedia[];
  lyrics: string[];
  veryYoung: boolean;
  wordIndex: number;
  itemIndex: number;
  picked: string | null;
  revealed: boolean;
  onSay: (text: string) => void;
  onPick: (option: string, correct: boolean) => void;
  onReveal: () => void;
  /** Opens the engine behind a drill phase, without leaving the run sheet. */
  onOpenDrill: () => void;
}

const SlideBody: React.FC<SlideBodyProps> = ({
  slide,
  lesson,
  steps,
  words,
  items,
  media,
  lyrics,
  veryYoung,
  wordIndex,
  itemIndex,
  picked,
  revealed,
  onSay,
  onPick,
  onReveal,
  onOpenDrill,
}) => {
  if (!slide) return null;
  if (slide.kind === 'step') {
    const step = steps[slide.index];
    if (!step) return null;
    /* A drill phase is not a slide with words on it — it is the engine, opened from
       here and closed back into here, so the phase keeps its clock and its talk meter. */
    if (step.drill) {
      return (
        <DrillSlide step={step} phonics={lesson?.phonics} movement={lesson?.movement} routine={lesson?.routine} circle={lesson?.circle} storyWalk={lesson?.storyWalk} quiz={lesson?.quiz} deck={lesson?.deck} game={lesson?.game} veryYoung={veryYoung} onOpen={onOpenDrill} onSay={onSay} />
      );
    }
    return <StepSlide step={step} index={slide.index} veryYoung={veryYoung} onSay={onSay} />;
  }
  if (slide.kind === 'phonics') {
    return lesson?.phonics ? <PhonicsSlide phonics={lesson.phonics} veryYoung={veryYoung} onSay={onSay} /> : null;
  }
  if (slide.kind === 'decodable') {
    return lesson?.phonics?.decodable ? (
      <DecodableSlide story={lesson.phonics.decodable} veryYoung={veryYoung} onSay={onSay} />
    ) : null;
  }
  if (slide.kind === 'movement') {
    return lesson?.movement?.commands?.length
      ? <MovementSlide movement={lesson.movement} veryYoung={veryYoung} onSay={onSay} />
      : null;
  }
  if (slide.kind === 'crown') {
    return lesson?.movement?.bossRound?.length
      ? <BossSlide movement={lesson.movement} veryYoung={veryYoung} onSay={onSay} />
      : null;
  }
  if (slide.kind === 'routine') {
    return lesson?.routine?.moments?.length
      ? <RoutineSlide routine={lesson.routine} veryYoung={veryYoung} onSay={onSay} />
      : null;
  }
  if (slide.kind === 'circle') {
    return lesson?.circle ? <CircleSlide circle={lesson.circle} veryYoung={veryYoung} onSay={onSay} /> : null;
  }
  if (slide.kind === 'storyWalk') {
    return lesson?.storyWalk?.beats?.length
      ? <StoryWalkSlide storyWalk={lesson.storyWalk} veryYoung={veryYoung} onSay={onSay} />
      : null;
  }
  if (slide.kind === 'words') {
    return <WordsSlide words={words} veryYoung={veryYoung} index={wordIndex} onSay={onSay} />;
  }
  if (slide.kind === 'media') {
    const item = media[slide.index];
    return item ? <MediaSlide media={item} veryYoung={veryYoung} /> : null;
  }
  if (slide.kind === 'lyrics') {
    return <LyricsSlide lyrics={lyrics} rhythm={lesson?.chantRhythm} veryYoung={veryYoung} onSay={onSay} />;
  }
  if (slide.kind === 'scene') {
    return lesson?.scene ? <SceneSlide scene={lesson.scene} veryYoung={veryYoung} /> : null;
  }
  if (slide.kind === 'story') {
    if (!lesson?.story) return null;
    /* Rung 0 is the story itself; every rung after that is the child handing it back. */
    if (slide.rung === 0) {
      return <StoryPagesSlide pages={lesson.story.pages} veryYoung={veryYoung} rung={0} onSay={onSay} />;
    }
    const rung = lesson.story.rungs?.[slide.rung - 1];
    if (!rung) return null;
    return (
      <>
        <StoryPagesSlide pages={lesson.story.pages} veryYoung={veryYoung} rung={slide.rung} onSay={onSay} />
        <div className="mt-4">
          <RetellSlide rung={rung} map={slide.rung >= 2 ? lesson.story.map : undefined} veryYoung={veryYoung} />
        </div>
      </>
    );
  }
  if (slide.kind === 'hotseat') {
    return lesson?.story?.roleplay ? (
      <HotSeatSlide roleplay={lesson.story.roleplay} veryYoung={veryYoung} onSay={onSay} />
    ) : null;
  }
  if (slide.kind === 'mission') {
    return lesson?.mission ? <MissionSlide mission={lesson.mission} veryYoung={veryYoung} onSay={onSay} /> : null;
  }
  if (slide.kind === 'activity') {
    const item = items[Math.min(itemIndex, items.length - 1)];
    if (!item) return null;
    /* Options are shuffled once per item, deterministically, so the answer never
       stays glued to the first button across replays. */
    const options = seededShuffle([item.answer, ...(item.distractors || [])].filter(Boolean), itemIndex + 3);
    const correctPicked = picked !== null && picked === item.answer;
    return (
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 text-center text-slate-800 shadow-2xl sm:p-8">
        {item.picture ? (
          <div className="flex justify-center">
            <KidEmoji emoji={item.picture} size={96} />
          </div>
        ) : null}
        <p className={`mt-3 font-black text-indigo-950 ${veryYoung ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
          {item.prompt}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const isCorrect = option === item.answer;
            const state = revealed && isCorrect ? 'correct' : revealed && picked === option ? 'wrong' : 'idle';
            return (
              <button
                key={option}
                type="button"
                disabled={revealed}
                onClick={() => onPick(option, isCorrect)}
                className={`rounded-3xl border-4 px-5 py-5 text-xl font-black transition-all ${
                  state === 'correct'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : state === 'wrong'
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-indigo-100 bg-indigo-50/50 text-indigo-950 hover:border-indigo-300'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        {revealed ? (
          <p className={`mt-5 text-2xl font-black ${correctPicked ? 'text-emerald-600' : 'text-amber-600'}`}>
            {correctPicked ? 'Yes! 🎉' : 'Nearly — try again 💛'}
          </p>
        ) : (
          <button
            type="button"
            onClick={onReveal}
            className="mt-5 text-sm font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-600"
          >
            Show me
          </button>
        )}
        {!veryYoung ? <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">Stars so far stay with the tutor</p> : null}
      </div>
    );
  }

  /* The wrap slide: the child says back what they can do, the family gets their note. */
  return (
    <div className="mx-auto max-w-4xl space-y-4 text-slate-800">
      <div className="rounded-3xl bg-white p-6 text-center shadow-2xl">
        <span className="text-[70px]">{veryYoung ? '🌈' : '🌟'}</span>
        <p className="mt-2 text-3xl font-black text-indigo-950">
          {veryYoung ? 'What a great lesson!' : 'Nice work — time to wrap up!'}
        </p>
        {lesson?.objectives?.length ? (
          <div className="mt-4 rounded-2xl bg-indigo-50 p-4 text-left">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-400">
              {veryYoung ? 'Now you can…' : 'By the end, the learner can…'}
            </p>
            <ul className="mt-2 space-y-1">
              {lesson.objectives.slice(0, 4).map((o, i) => (
                <li key={i} className="text-lg font-bold text-indigo-900">• {o}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {/* What the tutor needs to have ready — it existed on the lesson and on the
            printed pages, but never on the screen the tutor actually teaches from. */}
        {lesson?.materials?.length ? (
          <div className="mt-3 rounded-2xl bg-slate-100 p-4 text-left">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">🧰 Get ready</p>
            <p className="mt-1 text-base font-bold text-slate-700">{lesson.materials.join(' · ')}</p>
          </div>
        ) : null}
        {lesson?.homework?.length ? (
          <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-left">
            <p className="text-xs font-black uppercase tracking-widest text-amber-500">🏠 At home this week</p>
            <ul className="mt-2 space-y-1">
              {lesson.homework.slice(0, 4).map((h, i) => (
                <li key={i} className="text-base font-bold text-amber-900">• {h}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {lesson?.caregiverNote ? (
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">👨‍👩‍👧 {lesson.caregiverNote}</p>
      ) : null}
      {/* The exit ticket: the proof the session did something, in the child's own
          voice. It is the last thing on screen for a reason. */}
      {lesson?.run?.exitTicket?.length ? (
        <div className="rounded-3xl bg-white p-5 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-500">🎫 Exit ticket — say these to finish</p>
          <ul className="mt-2 space-y-1.5">
            {lesson.run.exitTicket.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-lg font-black text-emerald-900">
                <span className="text-emerald-400">{i + 1}.</span> {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Where the next session starts, so the lesson points forward instead of
          just stopping — the difference between a session and a worksheet. */}
      {lesson?.run?.nextTime ? (
        <div className="rounded-3xl bg-white p-5 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-widest text-violet-500">⏭ Next time starts with</p>
          <p className="mt-1 text-lg font-black text-violet-900">{lesson.run.nextTime}</p>
        </div>
      ) : null}

      {lesson?.teacherNote ? (
        <p className="rounded-2xl bg-indigo-50 p-4 text-sm font-bold text-indigo-800">🍎 {lesson.teacherNote}</p>
      ) : null}
    </div>
  );
};

export default KidLessonLauncher;
