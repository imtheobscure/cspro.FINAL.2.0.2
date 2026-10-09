/* ════════════════════════════════════════════════════════════════════════════
   📺 KID GAME STAGE — the projector player
   ════════════════════════════════════════════════════════════════════════════

   A game script has no idea it is being shown to a class. This is the part that knows:

   * **It takes the whole screen.** Children look at the biggest thing in the room, so the
     stage is a full-bleed overlay with the game's own colours and nothing else on it.
   * **It is sized for a room, not a lap.** The engines inside were built for a child
     holding a tablet, so their type is small at projector distance. Rather than fork 30
     components, the stage scales the whole activity (CSS `zoom`) — layout, text, emoji,
     buttons — with a control the tutor can nudge until the back row can read it.
   * **It runs the band's rules.** Very Young: no score anywhere on screen, the round's word
     is spoken aloud the moment it appears, one enormous Next button, and a wrong tap is
     always recoverable. Young: stars for the class, points that stay private to the
     tutor's tally, and a proper round counter.
   * **It is drivable from the keyboard**, because a tutor standing at the board has one
     hand free: ← → to move, Space to hear it again, Esc to leave.
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Volume2, ChevronLeft, ChevronRight, Info, Minus, Plus, Play } from 'lucide-react';
import { ActivityRenderer } from '../flipbook/ActivityComponents';
import type { LessonActivity } from '../../utils/flipbookTypes';
import { heroEmojiFor, heroImageFor, type KidGame, type KidGameScript } from '../../utils/kidGameCatalog';
import { KID_BANDS } from '../../utils/lessonCreatorTypes';
import { KidPicture, MediaCredit, useFreePhoto } from './KidFreeMedia';
import { playClick, playLevelUpFanfare, playQuestDing } from '../../utils/kidsAudio';
import { learnerSnapshot } from '../../utils/lessonCreatorPrompt';
import type { Learner } from '../../types';

interface KidGameStageProps {
  script: KidGameScript;
  game: KidGame;
  learner?: Learner;
  onClose: () => void;
  /** Called once when the tutor leaves, with the points the class collected. */
  onFinish?: (points: number) => void;
}

/** Speaks a line with a child-friendly voice, if the browser has one. */
function sayAloud(text: string) {
  if (!text || !('speechSynthesis' in window)) return;
  try {
    const voices = window.speechSynthesis.getVoices();
    const child = voices.find((v) => /child|kid|Ana|Maisie|Samantha/i.test(v.name));
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = child ? 1.25 : 1.15;
    utterance.rate = 0.92;
    if (child) utterance.voice = child;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* speech is a bonus; silence must never break the game */
  }
}

const readAloudFor = (round: LessonActivity): string =>
  String((round as any).readAloudText || (round as any).word || round.prompt || '');

/**
 * The single word this round is about — the thing to find a real photograph of.
 *
 * This has to be derived carefully, because the hero sits at the top of the screen
 * and the engines that use it are quiz-shaped: on a *Listen & Point* or a *Quiz
 * Show* round the answer is one of the options, so putting the answer word up here
 * as a photograph would hand the class the answer before the tutor has said the
 * question.
 *
 * So only the round's own declared target is used:
 *   · `word` — the engine's target field (balloonPop, whackAMole, spellingBee);
 *   · `readAloudText` — what the tutor speaks, which on a listening game is the
 *     target, not an option.
 *
 * `options` is deliberately NOT consulted, for the reason above, and `prompt` is
 * not used either: it frequently contains the answer ("Which one is the duck?").
 * When neither field yields a bare noun the hero stays an emoji, which is the
 * correct, safe outcome.
 */
const HERO_EMOJI_IN_TEXT = /(\p{Extended_Pictographic}(?:️)?(?:‍\p{Extended_Pictographic}(?:️)?)*)\s*([A-Za-z][A-Za-z'-]{1,20})/u;

/**
 * Words that pass the length test but are not a subject anyone can photograph.
 *
 * Found by testing rather than by reading: a round whose target field held "the"
 * produced a hero image of nothing, because "the" is three letters and Commons
 * does have files titled "The". Asking Commons for a picture of a function word
 * wastes a request and, worse, puts an unrelated photograph at the top of a
 * screen where the children are looking for the lesson.
 */
const HERO_NOT_A_NOUN = new Set([
  'the', 'and', 'but', 'for', 'you', 'her', 'him', 'his', 'she', 'its', 'our',
  'out', 'not', 'now', 'new', 'old', 'one', 'two', 'six', 'ten', 'all', 'any',
  'can', 'did', 'get', 'got', 'has', 'had', 'was', 'were', 'are', 'see', 'say',
  'this', 'that', 'they', 'them', 'what', 'which', 'when', 'where', 'who', 'how',
  'why', 'yes', 'pop', 'tap', 'look', 'find', 'pick', 'next', 'done', 'good',
  'word', 'words', 'sound', 'sounds', 'game', 'round', 'answer', 'question',
]);

/** A bare, photographable noun — one word, no emoji, not a question. */
function heroWordFor(round: LessonActivity | undefined): string {
  if (!round) return '';
  const candidates = [(round as any).word, (round as any).readAloudText];
  for (const raw of candidates) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    // "🦆 duck" → "duck". The emoji tells us which picture it is; the word beside
    // it is what Commons will have a photograph of.
    const withEmoji = raw.match(HERO_EMOJI_IN_TEXT);
    const cleaned = withEmoji ? withEmoji[2] : raw;
    const word = cleaned
      .replace(/[^A-Za-z'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // One word only. A two-word phrase is a sentence fragment, not a subject.
    if (!word || word.includes(' ') || word.length < 3) continue;
    if (HERO_NOT_A_NOUN.has(word.toLowerCase())) continue;
    return word.toLowerCase();
  }
  return '';
}

/**
 * Projector corrections for engines that were built for a tablet.
 *
 * Scoped to `.kid-projector`, so the flipbook a child holds on a lap is untouched: these
 * rules only apply inside this full-screen stage, where the audience is at the back of a
 * room. Each one fixes something the engines hard-size: a bingo board capped at 280px,
 * and the 9-12px labels the arcade games print on their objects, which no projector can
 * make readable from ten metres.
 */
const PROJECTOR_CSS = `
.kid-projector .grid > button { min-height: 4.25rem; }
.kid-projector .grid-cols-3 { max-width: none !important; }
.kid-projector .text-xs, .kid-projector .text-sm { font-size: 1.1rem !important; line-height: 1.35 !important; }
.kid-projector .text-\\[9px\\], .kid-projector .text-\\[10px\\], .kid-projector .text-\\[11px\\] { font-size: 1.05rem !important; line-height: 1.2 !important; }
.kid-projector button { -webkit-tap-highlight-color: transparent; }
`;

export const KidGameStage: React.FC<KidGameStageProps> = ({ script, game, learner, onClose, onFinish }) => {
  const band = KID_BANDS[script.band] || KID_BANDS.young;
  const veryYoung = script.band === 'veryYoung';

  const [index, setIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [showHelp, setShowHelp] = useState(false);
  /** Projector scale. Very young children get a bigger bump by default. */
  const [zoom, setZoom] = useState(veryYoung ? 1.3 : 1.12);
  const [finished, setFinished] = useState(false);
  const [runId, setRunId] = useState(0);
  const spokenFor = useRef<string>('');

  /** The stage sizes the card in real pixels, so the zoom control fills the screen instead of overflowing it. */
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 1920 : window.innerWidth));
  const [heroFailed, setHeroFailed] = useState(false);

  const rounds = script.rounds;
  const round = rounds[Math.min(index, rounds.length - 1)];
  const isLast = index >= rounds.length - 1;

  /* The round's poster: the biggest single image on the screen. */
  const heroEmoji = useMemo(() => heroEmojiFor(round, game.emoji), [round, game.emoji]);
  const heroImage = useMemo(() => heroImageFor(round), [round]);
  /** The word to look for a real photograph of — '' when it is not safe to try. */
  const heroWord = useMemo(() => heroWordFor(round), [round]);
  /** Kept so the attribution can name the exact file that is on screen. */
  const heroPhoto = useFreePhoto(heroWord, !heroImage && !heroFailed);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setHeroFailed(false);
  }, [index, runId]);

  /* Fill the room: the card is as wide as the screen divided by the zoom, so a tutor pressing
     "+" for the back row still gets the whole width instead of a scrollbar. The 64px is the
     stage's own 24px of padding plus the width of the scrollbars it shares the window with. */
  const cardWidth = Math.max(660, Math.min(1840, (vw - 64) / zoom));

  const stars = useMemo(() => Object.values(done).filter(Boolean).length, [done]);
  const tutorNote = useMemo(() => learnerSnapshot(learner).split('\n').slice(0, 4).join(' · '), [learner]);

  /* Read the round out loud as it appears — at 2-5 the tutor IS the audio track, and at
     5-12 it saves the tutor's voice for the parts that need it. */
  useEffect(() => {
    if (finished || !round) return;
    const key = `${index}:${runId}`;
    if (spokenFor.current === key) return;
    spokenFor.current = key;
    const delay = window.setTimeout(() => sayAloud(readAloudFor(round)), 450);
    return () => window.clearTimeout(delay);
  }, [index, runId, round, finished]);

  /* One hand free: arrows, space, escape. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === ' ') { e.preventDefault(); if (round) { playClick(); sayAloud(readAloudFor(round)); } }
      else if (e.key === 'Escape') { e.preventDefault(); leave(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, rounds.length, points]);

  const next = () => {
    if (finished) return;
    playClick();
    if (isLast) {
      setFinished(true);
      playLevelUpFanfare();
      return;
    }
    setIndex((i) => Math.min(i + 1, rounds.length - 1));
  };

  const prev = () => {
    playClick();
    if (finished) { setFinished(false); return; }
    setIndex((i) => Math.max(i - 1, 0));
  };

  const leave = () => {
    playClick();
    onFinish?.(points);
    onClose();
  };

  const complete = (awarded: number) => {
    setDone((d) => ({ ...d, [index]: true }));
    if (!veryYoung) setPoints((p) => p + (Number.isFinite(awarded) ? awarded : 0));
    playQuestDing();
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: 'linear-gradient(160deg,#0f172a,#1e1b4b 55%,#0f172a)' }}>
      {/* ── Header: what we are playing, where we are, and the tutor's controls ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-5 sm:py-3">
        <span className="text-2xl sm:text-3xl">{game.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-white sm:text-xl">{script.title}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 sm:text-xs">
            {band.emoji} {band.label} {band.ages} · {game.label}
            {script.topic ? ` · ${script.topic}` : ''}
          </p>
        </div>

        {/* Round progress: dots for a few rounds, a counter when there are many. */}
        {!finished && (
          <div className="flex items-center gap-1.5 rounded-2xl bg-white/10 px-2.5 py-1.5">
            {rounds.length <= 8 ? (
              rounds.map((_, i) => (
                <span key={i} className={`h-2.5 w-2.5 rounded-full ${i === index ? 'bg-amber-300 scale-125' : done[i] ? 'bg-emerald-400' : 'bg-white/25'}`} />
              ))
            ) : (
              <span className="text-xs font-black text-white/80">{index + 1} / {rounds.length}</span>
            )}
          </div>
        )}

        {!veryYoung && (
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-2.5 py-1.5" title="Stars the class has collected — points stay private to you, the class only sees stars.">
            <span className="text-sm font-black text-amber-300">{'★'.repeat(Math.min(stars, 5)) || '☆'}{stars > 5 ? ` ×${stars}` : ''}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{points} pts</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button onClick={() => { playClick(); setZoom((z) => Math.max(0.8, +(z - 0.1).toFixed(2))); }} className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20" title="Smaller">
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={() => { playClick(); setZoom((z) => Math.min(2.2, +(z + 0.1).toFixed(2))); }} className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20" title="Bigger — for the back row">
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={() => { playClick(); setShowHelp((v) => !v); }} className={`rounded-xl p-2 text-white ${showHelp ? 'bg-amber-400/80' : 'bg-white/10 hover:bg-white/20'}`} title="How to run this game">
            <Info className="h-4 w-4" />
          </button>
          <button onClick={() => { playClick(); if (round) sayAloud(readAloudFor(round)); }} className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20" title="Say it again (Space)">
            <Volume2 className="h-4 w-4" />
          </button>
          <button onClick={leave} className="rounded-xl bg-rose-500/80 p-2 text-white hover:bg-rose-500" title="Close (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="border-b border-white/10 bg-white/5 px-4 py-3 text-white/90 sm:px-6">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">How to run it</p>
          <p className="mt-1 max-w-4xl text-sm font-bold leading-relaxed sm:text-base">{script.howToPlay || game.noScreen}</p>
          <p className="mt-2 max-w-4xl text-[11px] font-medium text-white/60">
            {tutorNote} · Size {(zoom * 100).toFixed(0)}% · ← → move · Space repeat · Esc close
          </p>
        </div>
      )}

      {/* ── The activity itself ── */}
      <div className="relative flex-1 overflow-hidden">
        <style>{PROJECTOR_CSS}</style>
        <div className="absolute inset-0 flex overflow-auto p-3 sm:p-4">
          <div className="m-auto" style={{ zoom }}>
          <div className="kid-projector" style={{ width: cardWidth }}>
          <div className="rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
            {/* The round's poster. Every round gets one enormous image, because the children at
                the back of the room look at the biggest thing on the screen — and if the AI
                supplied a real stable picture, that picture beats an emoji. */}
            {!finished && round && (
              <div className="mb-4 flex items-center justify-center">
                {heroImage && !heroFailed ? (
                  <img
                    src={heroImage}
                    alt=""
                    onError={() => setHeroFailed(true)}
                    style={{ maxHeight: 210 }}
                    className="w-auto rounded-3xl border-4 border-indigo-100 object-contain shadow-lg"
                  />
                ) : (
                  /* No picture was supplied, so resolve one from the round's own
                     target word. This is the upgrade that matters most on a
                     projector: the biggest thing in the room becomes the actual
                     thing being taught rather than a glyph for it. KidPicture
                     falls back to the emoji, and KidEmoji makes that glyph look
                     identical on every laptop. */
                  <KidPicture
                    word={heroWord}
                    emoji={heroEmoji}
                    size={veryYoung ? 112 : 92}
                    className="drop-shadow-sm"
                  />
                )}
              </div>
            )}
            {heroPhoto ? <MediaCredit photo={heroPhoto} className="mt-1 text-center !text-slate-300" /> : null}
          {!finished && round ? (
              <React.Fragment key={`${index}-${runId}`}>
                <ActivityRenderer activity={round} onComplete={complete} />
              </React.Fragment>
            ) : (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <span className="text-[74px] sm:text-[96px]">🎉</span>
                <p className="text-3xl font-black text-indigo-950 sm:text-4xl">
                  {veryYoung ? 'You did it! Well done!' : 'Nice work — game finished!'}
                </p>
                {!veryYoung && <p className="text-lg font-black text-amber-600">Stars: {'★'.repeat(Math.min(stars, 5)) || '☆'}</p>}
                <ul className="max-w-2xl space-y-1">
                  {(script.plenary || ['Say one word you learned today!']).map((line, i) => (
                    <li key={i} className="text-base font-bold text-slate-600 sm:text-lg">• {line}</li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => { playClick(); setFinished(false); setIndex(0); setRunId((n) => n + 1); spokenFor.current = ''; }}
                    className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-base font-black text-white shadow-lg hover:bg-indigo-500"
                  >
                    <Play className="h-4 w-4" /> Play again
                  </button>
                  <button onClick={leave} className="rounded-2xl border-2 border-slate-200 px-5 py-3 text-base font-black text-slate-600 hover:border-slate-400">
                    Back to the creator
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
          </div>
        </div>
      </div>

      {/* ── Footer: the one control that matters, sized for a child to tap ── */}
      {!finished && (
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-3 sm:px-6">
          <button
            onClick={prev}
            disabled={index === 0}
            className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-3 text-sm font-black text-white hover:bg-white/20 disabled:opacity-30 sm:px-4"
          >
            <ChevronLeft className="h-5 w-5" /> Back
          </button>
          <p className="hidden text-center text-[11px] font-bold uppercase tracking-widest text-white/40 sm:block">
            Round {index + 1} of {rounds.length}
          </p>
          <button
            onClick={next}
            className={`flex items-center gap-2 rounded-2xl px-6 py-4 font-black text-white shadow-xl sm:px-10 sm:py-5 ${isLast ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300'}`}
            style={{ fontSize: veryYoung ? '1.4rem' : '1.15rem' }}
          >
            {isLast ? '🏁 Finish' : veryYoung ? 'Next ▶' : 'Next'} {!isLast && <ChevronRight className="h-6 w-6" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default KidGameStage;
