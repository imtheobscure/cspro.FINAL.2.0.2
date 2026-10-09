/* ════════════════════════════════════════════════════════════════════════════
   🧩 LESSON CREATOR — young-learner edition
   ════════════════════════════════════════════════════════════════════════════

   The same mechanism as the adult Lesson Creator (pick a kind → copy an AI prompt →
   paste the JSON back → get a real lesson), built for the two bands this dashboard
   teaches in. What the tutor gets, in order:

     1. the band (2-5 or 5-12 — defaulted from the learner's age, switchable)
     2. the kind of lesson
     3. lesson customization — difficulty, energy and the default read-aloud voice
     4. one button that copies a prompt written for this child, this band and these dials.
        The prompt tells the AI to ask for the lesson text or PDF first; the tutor pastes
        the material into the AI, not here
     5. a paste box that validates the JSON properly — a syntax error says WHERE it broke
        and what usually causes it, a shape error names the missing fields — plus a
        preview of the lesson it read
     6. ▶ Launch opens it in `KidLessonLauncher` (splash, steps, words, activities, the
        chosen voice), and Save keeps it on the learner through every backup and export

   Nothing here talks to an AI: the tutor brings their own, and the prompt is written so
   that any of them returns something this panel can read back.
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Loader2, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import type { Learner, TeacherProfile } from '../types';
import {
  DEFAULT_KID_LESSON_CUSTOMIZATION,
  KID_BANDS,
  KID_LESSON_CATEGORIES,
  KID_LESSON_DIFFICULTIES,
  KID_LESSON_ENERGIES,
  KID_LESSON_KINDS,
  KID_LESSON_PART_LABEL,
  KID_LESSON_PART_ORDER,
  difficultyById,
  energyById,
  kindById,
  parseKidLesson,
  type KidAgeBand,
  type KidLesson,
  type KidLessonCustomization,
  type KidLessonEditorPart,
  type KidLessonGame,
  type KidLessonKind,
  type KidLessonMedia,
  type KidLessonParseResult,
  type KidLessonStep,
  type KidLessonWord,
  type SavedKidLesson,
} from '../utils/lessonCreatorTypes';
import { buildKidLessonPrompt, defaultBand, promptNextSteps } from '../utils/lessonCreatorPrompt';
import { demoLessonFor } from '../utils/kidLessonDemos';
import { stageForLesson } from '../utils/kidLessonStage';
import { buildKidPhaseFiles, type KidPhaseFile } from '../utils/kidLessonHtmlExport';
import { mediaKindEmoji, mediaKindLabel } from '../utils/kidLessonMedia';
import {
  gamesForBand,
  gameById,
  type KidGame,
  type KidGameScript,
  type SavedKidGame,
} from '../utils/kidGameCatalog';
import { demoForGame } from '../utils/kidGameDemos';
import { buildKidGamePrompt, parseKidGame, type KidGameParseResult } from '../utils/kidGamePrompt';
import { KidLessonLauncher } from './KidLessonLauncher';
import { playClick, playErrorSound, playQuestDing, playStarShower } from '../utils/kidsAudio';
import { isLessonAllowed, getRequiredTierForLesson, type UserTier } from '../../../utils/tiers';

interface KidsLessonCreatorProps {
  learner: Learner;
  teacher: TeacherProfile;
  tier?: UserTier;
  onUpdate: (updated: Partial<Learner>) => void;
  onUpgrade?: (message: string) => void;
}

const prettyDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

export const KidsLessonCreator: React.FC<KidsLessonCreatorProps> = ({
  learner,
  teacher,
  tier = 'free',
  onUpdate,
  onUpgrade,
}) => {
  /* ── State ─────────────────────────────────────────────────────────────── */
  const [band, setBand] = useState<KidAgeBand>(() => defaultBand(learner));
  const [kindId, setKindId] = useState<string>('miniLesson');
  /** The Step-2 dials: difficulty, energy and the read-aloud voice. */
  const [customization, setCustomization] = useState<KidLessonCustomization>(DEFAULT_KID_LESSON_CUSTOMIZATION);
  /** Browser voices for the read-aloud picker; empty until the browser lists them. */
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rawJson, setRawJson] = useState('');
  const [result, setResult] = useState<KidLessonParseResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [openSavedId, setOpenSavedId] = useState<string | null>(null);
  /** The editable working copy of the lesson on screen — Test, Edit and Save all act on this. */
  const [draft, setDraft] = useState<KidLesson | null>(null);
  /** True while the tutor is cutting or adding parts of the lesson. */
  const [editing, setEditing] = useState(false);
  /** Which of the three saved HTML pages is being previewed, if any. */
  const [phasePreview, setPhasePreview] = useState<KidPhaseFile | null>(null);

  /* ── Game Studio state ──────────────────────────────────────────────────
     A separate mode rather than a separate screen, because a tutor plans a lesson and
     then wants the game in it: switching modes keeps the band and the brief that were
     already typed, and the games sit on the same learner as the lessons. */
  const [mode, setMode] = useState<'lesson' | 'game'>('lesson');
  const [gameId, setGameId] = useState<string>('lookListenPoint');
  const [gameTopic, setGameTopic] = useState('');
  const [gameWords, setGameWords] = useState('');
  const [gameNotes, setGameNotes] = useState('');
  const [gameRaw, setGameRaw] = useState('');
  const [gameCopied, setGameCopied] = useState(false);
  const [gameResult, setGameResult] = useState<KidGameParseResult | null>(null);
  const [gameSaved, setGameSaved] = useState(false);
  /** What the launcher is playing right now: an AI lesson, or a game script. */
  const [launching, setLaunching] = useState<{ lesson?: KidLesson; game?: { script: KidGameScript; game: KidGame } } | null>(null);

  /* A learner switched under the panel (different child, or an age was corrected). */
  useEffect(() => {
    setBand(defaultBand(learner));
    setResult(null);
    setRawJson('');
    setCustomization(DEFAULT_KID_LESSON_CUSTOMIZATION);
    setJustSaved(false);
    setOpenSavedId(null);
    setDraft(null);
    setEditing(false);
    setPhasePreview(null);
    setKindId('miniLesson');
    setGameRaw('');
    setGameResult(null);
    setGameTopic('');
    setGameWords('');
    setGameNotes('');
    setLaunching(null);
  }, [learner.id]);

  const kind = kindById(kindId) || KID_LESSON_KINDS[0];
  const saved: SavedKidLesson[] = useMemo(() => (learner.savedLessons || []) as SavedKidLesson[], [learner.savedLessons]);

  /* ── Games for the current band ────────────────────────────────────────── */
  const shelf = useMemo(() => gamesForBand(band), [band]);
  const game: KidGame = useMemo(() => gameById(gameId) || shelf[0] || gamesForBand('veryYoung')[0], [gameId, shelf]);
  const savedGames: SavedKidGame[] = useMemo(() => (learner.savedGames || []) as SavedKidGame[], [learner.savedGames]);

  /* A band switch that leaves the selected game behind moves to that band's first game. */
  useEffect(() => {
    if (!shelf.some((g) => g.id === gameId)) setGameId(shelf[0]?.id || gameId);
  }, [shelf, gameId]);

  /* Voices arrive asynchronously in some browsers; the read-aloud picker fills when they do. */
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
  }, []);

  /* Audition the chosen voice without launching a whole lesson. */
  const speakTest = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const text = band === 'veryYoung'
        ? `Hello ${learner.name || 'friend'}! Let's play!`
        : `Hello ${learner.name || 'friend'}! Ready to learn?`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = band === 'veryYoung' ? 1.25 : 1.12;
      utterance.rate = band === 'veryYoung' ? 0.88 : 0.96;
      const chosen = voices.find((v) => v.name === customization.voiceName);
      if (chosen) utterance.voice = chosen;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      /* silence is an acceptable answer here */
    }
  };

  /* Lesson kinds are filtered by band: a "Move & Do" lesson for a 2-year-old is the point of
     the band, and showing it to a 10-year-old's tutor as an equal option is noise. */
  const kindsForBand = useMemo(() => KID_LESSON_KINDS.filter((k) => k.bands.includes(band)), [band]);
  const kindsOtherBand = useMemo(() => KID_LESSON_KINDS.filter((k) => !k.bands.includes(band)), [band]);

  useEffect(() => {
    if (!kindsForBand.some((k) => k.id === kindId)) setKindId(kindsForBand[0]?.id || 'miniLesson');
  }, [kindsForBand, kindId]);

  const allowed = isLessonAllowed(kind.tierId, tier);
  const requiredTier = getRequiredTierForLesson(kind.tierId);

  const bandProfile = KID_BANDS[band];
  const detected = defaultBand(learner);
  const detectedBand = KID_BANDS[detected];

  /* ── Actions ───────────────────────────────────────────────────────────── */
  const copyPrompt = async () => {
    if (!allowed) {
      onUpgrade?.(`${kind.label} is a ${requiredTier.toUpperCase()} lesson. Upgrade to build it for ${learner.name}.`);
      playErrorSound();
      return;
    }
    const prompt = buildKidLessonPrompt(
      {
        kind,
        band,
        customization,
        setting: 'one-to-one lesson, tutor beside the learner',
        bandChosenDeliberately: band !== detected,
      },
      learner,
      teacher
    );
    playClick();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      playQuestDing();
      window.setTimeout(() => setCopied(false), 2600);
    } catch {
      /* Clipboard blocked (iframe or permission): the preview below still lets the tutor select and copy. */
      setShowPrompt(true);
    }
  };

  const checkReply = () => {
    playClick();
    setChecking(true);
    const parsed = parseKidLesson(rawJson, kind);
    setResult(parsed);
    setChecking(false);
    if (parsed.ok && parsed.lesson) {
      /* The parsed lesson becomes the EDITABLE working copy, so the tutor can cut or
         add parts before they ever press Save. A fresh paste is a NEW lesson, so the
         "currently open saved lesson" is cleared — otherwise Save would quietly
         overwrite the one that happened to be open. */
      setOpenSavedId(null);
      setDraft(cloneLesson(parsed.lesson));
      setEditing(false);
      playStarShower();
    } else {
      setDraft(null);
      playErrorSound();
    }
  };

  /** Copies a lesson deeply, so editing the draft never changes what was parsed or saved. */
  const cloneLesson = (lesson: KidLesson): KidLesson =>
    JSON.parse(JSON.stringify(lesson)) as KidLesson;

  const saveLesson = () => {
    if (!draft) return;
    const base = saved.find((entry) => entry.id === openSavedId);
    const entry: SavedKidLesson = {
      id: base?.id || `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kindId: (draft.kind && kindById(draft.kind)?.id) || kind.id,
      kindLabel: kindById(draft.kind || '')?.label || kind.label,
      kindEmoji: kindById(draft.kind || '')?.emoji || kind.emoji,
      band,
      topic: draft.title,
      createdAt: base?.createdAt || new Date().toISOString(),
      summary: result?.summary,
      customization,
      lesson: cloneLesson(draft),
    };
    onUpdate({ savedLessons: [entry, ...saved.filter((e) => e.id !== entry.id)] });
    setJustSaved(true);
    setOpenSavedId(entry.id);
    setEditing(false);
    playStarShower();
    playQuestDing();
    window.setTimeout(() => setJustSaved(false), 2600);
  };

  const removeLesson = (id: string) => {
    playClick();
    onUpdate({ savedLessons: saved.filter((entry) => entry.id !== id) });
    if (openSavedId === id) {
      setOpenSavedId(null);
      setDraft(null);
    }
  };

  /** Open a saved lesson into the editor. */
  const openSaved = (entry: SavedKidLesson) => {
    playClick();
    setOpenSavedId(entry.id);
    setDraft(cloneLesson(entry.lesson));
    setEditing(false);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  /**
   * The Test button.
   *
   * It builds a complete, finished lesson for this kind and band on the spot
   * (`kidLessonDemos.ts`) and plays it on screen — so a tutor can see exactly what
   * this kind of lesson IS, and how it looks to the child, in one press and with no
   * AI involved. It also becomes the editable draft, so a tutor can start from the
   * example and cut it down rather than from an empty box.
   *
   * TEST IS NEVER BEHIND THE PLAN GATE, deliberately and for every band and kind.
   * The example is already written into the app — no AI call, no cost — so throwing
   * a pricing sheet over it teaches the tutor nothing and hides the one thing that
   * would sell the lesson to them. The locked tier still shows as a badge on the
   * tile, and the tier is still enforced on the actions that DO cost something
   * (copying the AI prompt below), so the upsell stays honest and in one place.
   */
  const testKind = (target: KidLessonKind) => {
    playClick();
    const demo = demoLessonFor(target.id, band, learner);
    setKindId(target.id);
    setResult(null);
    setRawJson('');
    setOpenSavedId(null);
    setDraft(cloneLesson(demo));
    setEditing(false);
    setLaunching({ lesson: demo });
  };

  /** Preview one of the three saved pages inside the app. */
  const previewPhase = (file: KidPhaseFile) => {
    playClick();
    setPhasePreview(file);
  };

  /** Save one page as a real .html file the tutor can keep or print. */
  const downloadPhase = (file: KidPhaseFile) => {
    playClick();
    try {
      const blob = new Blob([file.html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      playQuestDing();
    } catch {
      playErrorSound();
    }
  };

  /** All three pages, one after another. */
  const downloadAllPhases = () => {
    if (!draft) return;
    buildKidPhaseFiles(draft, band, learner, teacher).forEach((file) => downloadPhase(file));
  };

  /* ── Game Studio actions ───────────────────────────────────────────────── */
  const copyGamePrompt = async () => {
    if (!gameTopic.trim()) {
      playErrorSound();
      return;
    }
    const prompt = buildKidGamePrompt(
      { game, topic: gameTopic, words: gameWords, notes: gameNotes },
      learner,
      teacher
    );
    playClick();
    try {
      await navigator.clipboard.writeText(prompt);
      setGameCopied(true);
      playQuestDing();
      window.setTimeout(() => setGameCopied(false), 2600);
    } catch {
      /* Clipboard blocked — the prompt preview below is selectable instead. */
      setShowPrompt(true);
    }
  };

  const checkGameReply = () => {
    playClick();
    const parsed = parseKidGame(gameRaw, game);
    setGameResult(parsed);
    if (parsed.ok) playStarShower();
    else playErrorSound();
  };

  /** Everything on screen goes through the one-file launcher — lessons and games alike. */
  const launchLesson = (target: KidLesson) => {
    playClick();
    setLaunching({ lesson: target });
  };

  const launchGame = (script: KidGameScript, source: KidGame) => {
    playClick();
    setLaunching({ game: { script, game: source } });
  };

  /*
   * The game Test button.
   *
   * Same rule as the lesson Test: every game ships a written mock, so pressing Test
   * plays it there and then — never a pricing sheet. If a game ever arrives without
   * an example the button is disabled on the tile instead, with `demoForGame`
   * coverage enforced by `.freebuff/mock-coverage.ts`.
   */
  const playDemo = (target: KidGame) => {
    const script = demoForGame(target.id);
    if (!script) {
      playErrorSound();
      return;
    }
    launchGame(script, target);
  };

  const saveGame = (fromDemo = false) => {
    const script = fromDemo ? demoForGame(game.id) : gameResult?.script;
    if (!script) return;
    const entry: SavedKidGame = {
      id: `game-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      gameId: game.id,
      label: game.label,
      emoji: game.emoji,
      band,
      topic: gameTopic.trim() || script.topic || game.label,
      createdAt: new Date().toISOString(),
      summary: fromDemo ? 'built-in example' : gameResult?.summary,
      fromDemo,
      script,
    };
    onUpdate({ savedGames: [entry, ...savedGames] });
    setGameSaved(true);
    playStarShower();
    playQuestDing();
    window.setTimeout(() => setGameSaved(false), 2600);
  };

  const removeGame = (id: string) => {
    playClick();
    onUpdate({ savedGames: savedGames.filter((entry) => entry.id !== id) });
  };

  /** What is on screen right now: the editable working copy of the lesson. */
  const preview: KidLesson | null = draft;
  const previewKind = useMemo(() => (preview?.kind ? kindById(preview.kind) || kind : kind), [preview, kind]);
  /** The three keepable HTML pages, rebuilt from the draft so an edit is always reflected. */
  const phaseFiles: KidPhaseFile[] = useMemo(
    () => (preview ? buildKidPhaseFiles(preview, (preview.band as KidAgeBand) || band, learner, teacher) : []),
    [preview, band, learner, teacher],
  );

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* ── Header + band ── */}
      <div className="rounded-3xl border-2 border-indigo-100 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-2">
              🧩 Lesson Creator
            </h2>
            <p className="mt-1 text-sm font-bold text-indigo-500">
              Build a lesson for {learner.name || 'this learner'}
              {learner.age ? ` (age ${learner.age})` : ''} — pick the kind, copy the AI prompt, paste the lesson back.
            </p>
          </div>
          <span className="rounded-2xl bg-indigo-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-500">
            {saved.length} saved lesson{saved.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Mode. A tutor plans a lesson and then wants the game inside it, so the two share
            the band, the brief and the learner rather than living on separate pages. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { playClick(); setMode('lesson'); }}
            className={`rounded-2xl border-2 px-4 py-2 text-sm font-black transition-all ${
              mode === 'lesson' ? 'border-indigo-400 bg-indigo-50 text-indigo-950 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'
            }`}
          >
            📚 Lessons
          </button>
          <button
            type="button"
            onClick={() => { playClick(); setMode('game'); }}
            className={`rounded-2xl border-2 px-4 py-2 text-sm font-black transition-all ${
              mode === 'game' ? 'border-violet-400 bg-violet-50 text-violet-950 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200'
            }`}
          >
            🎮 Games to play on screen
          </button>
          <span className="text-[11px] font-bold text-slate-400">
            {mode === 'game'
              ? 'Big pictures, one thing at a time. Every game has a ▶ Test button.'
              : 'A lesson to teach: steps, words, things to print, a note for the family. Every lesson has a ▶ Test button.'}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.keys(KID_BANDS) as KidAgeBand[]).map((bandId) => {
            const profile = KID_BANDS[bandId];
            const active = band === bandId;
            return (
              <button
                key={bandId}
                type="button"
                onClick={() => { playClick(); setBand(bandId); }}
                className={`rounded-2xl border-2 p-3 text-left transition-all ${
                  active
                    ? 'border-indigo-400 bg-indigo-50/80 shadow-md scale-[1.01]'
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{profile.emoji}</span>
                  <div>
                    <p className="text-sm font-black text-indigo-950">
                      {profile.label} <span className="text-indigo-400">{profile.ages}</span>
                    </p>
                    <p className="text-[11px] font-bold text-slate-500">{profile.tagline}</p>
                  </div>
                </div>
                {detected === bandId && (
                  <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                    ✓ matches {learner.name}'s age{learner.age ? ` ${learner.age}` : ''}
                  </p>
                )}
              </button>
            );
          })}
        </div>
        {band !== detected && (
          <p className="mt-2 text-[11px] font-bold text-amber-600">
            Heads up: {learner.name} is {learner.age ?? '?'}, so the {detectedBand.label} ({detectedBand.ages}) band is the usual fit.
            You are building for {bandProfile.label} ({bandProfile.ages}) — that is fine for a very advanced or a delayed learner.
          </p>
        )}
      </div>

      {mode === 'lesson' && (
        <>
      {/* ── Step 1: kind ── */}
      <div className="rounded-3xl border-2 border-slate-100 bg-white/80 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Step 1 · Pick a lesson</p>
        {KID_LESSON_CATEGORIES.map((category) => {
          const inCategory = kindsForBand.filter((k) => k.category === category);
          if (!inCategory.length) return null;
          return (
            <div key={category} className="mt-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-indigo-400">{category}</p>
              <div className="mt-2 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {inCategory.map((k) => {
                  const active = k.id === kind.id;
                  const locked = !isLessonAllowed(k.tierId, tier);
                  return (
                    <div
                      key={k.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        /* Selecting a kind only selects it — the badge already says it is
                           a paid kind, and the tutor still needs to be able to read the
                           tile and press ▶ Test before deciding. The plan gate sits on
                           the AI prompt, which is the part that costs something. */
                        playClick();
                        setKindId(k.id);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { playClick(); setKindId(k.id); } }}
                      className={`relative cursor-pointer rounded-2xl border-2 p-3 text-left transition-all ${
                        active ? 'border-indigo-400 bg-indigo-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{k.emoji}</span>
                        <span className="text-sm font-black text-indigo-950">{k.label}</span>
                      </div>
                      <p className="mt-1 text-[11px] font-bold leading-snug text-slate-500">{k.blurb}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {k.bands.map((b) => (
                          <span key={b} className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
                            {KID_BANDS[b].emoji} {KID_BANDS[b].ages}
                          </span>
                        ))}
                        {locked && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-700">
                            {getRequiredTierForLesson(k.tierId)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); testKind(k); }}
                          className="rounded-xl bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white hover:bg-emerald-500"
                          title={`Play a finished ${k.label} example right now`}
                        >
                          ▶ Test
                        </button>
                        {/* What the button will OPEN, in plain words. A tutor should not
                            have to press it to find out whether this kind is a deck, a
                            game or a sheet — and a flashcard deck that opened as step
                            slides was exactly the confusion this line prevents. */}
                        <span className="text-[10px] font-bold text-slate-400">{stageForLesson(k.id).opens}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {kindsOtherBand.length > 0 && (
          <p className="mt-3 text-[11px] font-bold text-slate-400">
            {kindsOtherBand.length} more kind{kindsOtherBand.length === 1 ? '' : 's'} exist for the other band — switch the band above to see them.
          </p>
        )}
      </div>

      {/* ── Step 2: customization — how the lesson runs, not what it is about ── */}
      <div className="rounded-3xl border-2 border-slate-100 bg-white/80 p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Step 2 · Make it fit</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">
            The AI asks you for the lesson text or PDF in Step 3 — here you choose HOW it comes back for {learner.name}.
          </p>
        </div>
        <div>
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Difficulty</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {KID_LESSON_DIFFICULTIES.map((option) => {
              const active = customization.difficulty === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => { playClick(); setCustomization((c) => ({ ...c, difficulty: option.id })); }}
                  className={`rounded-2xl border-2 p-3 text-left transition-all ${
                    active ? 'border-indigo-400 bg-indigo-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  <p className="text-sm font-black text-indigo-950">{option.emoji} {option.label}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-slate-500">{option.blurb}</p>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Energy</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {KID_LESSON_ENERGIES.map((option) => {
              const active = customization.energy === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => { playClick(); setCustomization((c) => ({ ...c, energy: option.id })); }}
                  className={`rounded-2xl border-2 p-3 text-left transition-all ${
                    active ? 'border-indigo-400 bg-indigo-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  <p className="text-sm font-black text-indigo-950">{option.emoji} {option.label}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-slate-500">{option.blurb}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Default read-aloud voice</label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <select
              value={customization.voiceName}
              onChange={(e) => setCustomization((c) => ({ ...c, voiceName: e.target.value }))}
              className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-indigo-950 outline-none focus:border-indigo-400"
            >
              <option value="">✨ Auto — a friendly child-friendly voice</option>
              {learner.teacherVoice ? <option value={learner.teacherVoice}>🍎 {teacher.characterName}'s saved voice</option> : null}
              {learner.avatarVoice ? <option value={learner.avatarVoice}>🦸 {learner.name}'s avatar voice</option> : null}
              {learner.petVoice ? <option value={learner.petVoice}>🐾 The pet's voice</option> : null}
              {voices.map((voice) => (
                <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => { playClick(); speakTest(); }}
              className="rounded-2xl border-2 border-indigo-200 bg-white px-3 py-2.5 text-xs font-black uppercase tracking-wider text-indigo-500 hover:border-indigo-400"
            >
              🔊 Test
            </button>
          </div>
          <p className="mt-1 text-[10px] font-bold text-slate-400">
            Every step, word and game round is read aloud with this voice when you press ▶ Launch.
          </p>
        </div>
      </div>

      {/* ── Step 3: prompt ── */}
      <div className="rounded-3xl border-2 border-violet-100 bg-violet-50/40 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-violet-400">Step 3 · Copy the AI words</p>
        <p className="mt-1 text-sm font-bold text-slate-600">
          The prompt is written for {bandProfile.label} ({bandProfile.ages}) and carries {learner.name}'s whole profile —
          hero, pet, kingdom, quests, skills and family notes
          {learner.interests?.length ? ` (including their love of ${learner.interests.slice(0, 2).join(' and ')})` : ''} —
          plus your {difficultyById(customization.difficulty).label} difficulty and {energyById(customization.energy).label} energy.
          It tells the AI to ask you for the lesson text or PDF first, then build the full lesson from it.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyPrompt}
            className={`rounded-2xl px-4 py-2.5 text-sm font-black text-white shadow-md transition-all ${
              copied ? 'bg-emerald-500' : allowed ? 'bg-violet-600 hover:bg-violet-500' : 'bg-slate-400'
            }`}
          >
            {copied ? <>✓ Prompt copied!</> : <>📋 Copy the {kind.label} prompt</>}
          </button>
          <button
            type="button"
            onClick={() => { playClick(); setShowPrompt((v) => !v); }}
            className="rounded-2xl border-2 border-violet-200 bg-white px-3 py-2.5 text-xs font-black uppercase tracking-wider text-violet-500 hover:border-violet-400"
          >
            {showPrompt ? 'Hide the prompt' : 'Read the prompt'}
          </button>
          {!allowed && (
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">
              {requiredTier} lesson — the prompt can be read, saving needs an upgrade
            </span>
          )}
        </div>
        <ol className="mt-3 space-y-1 text-[11px] font-bold text-slate-500">
          {promptNextSteps(kind, band).map((step, i) => (
            <li key={i}>{i + 1}. {step}</li>
          ))}
        </ol>
        {/*
         * Deliberately a plain conditional, not an <AnimatePresence>: the profile wraps every
         * tab in its own AnimatePresence with mode="wait", and a nested one inside a tab leaves
         * that outer switcher waiting for an exit that never finishes — which froze tab
         * switching for the rest of the visit. Showing and hiding is all this needs.
         */}
        {showPrompt && (
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-900 p-3 text-[10px] leading-relaxed text-slate-100">
            {buildKidLessonPrompt({ kind, band, customization, bandChosenDeliberately: band !== detected }, learner, teacher)}
          </pre>
        )}
      </div>

      {/* ── Step 4: paste ── */}
      <div className="rounded-3xl border-2 border-slate-100 bg-white/80 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Step 4 · Paste it back</p>
        <textarea
          value={rawJson}
          onChange={(e) => { setRawJson(e.target.value); setResult(null); }}
          rows={7}
          placeholder={'Paste the AI’s reply here — the whole { … } block. Fenced ```json blocks are fine.'}
          className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-3 py-2.5 font-mono text-[11px] text-slate-700 outline-none focus:border-indigo-400"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={checkReply}
            disabled={!rawJson.trim() || checking}
            className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md hover:bg-indigo-500 disabled:bg-slate-300"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : '✅ Check it'}
          </button>
          <button
            type="button"
            onClick={() => { playClick(); setRawJson(''); setResult(null); }}
            className="rounded-2xl border-2 border-slate-200 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:border-slate-400"
          >
            Clear
          </button>
          {result?.ok && (
            <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-600">
              ✓ Read it: {result.summary}
            </span>
          )}
        </div>

        {result && !result.ok && (
          <div className="mt-3 rounded-2xl border-2 border-rose-200 bg-rose-50 p-3">
            <p className="text-[11px] font-bold text-rose-600">⚠ {result.error}</p>
            {result.problems?.length ? (
              <ul className="mt-1.5 space-y-0.5">
                {result.problems.slice(0, 6).map((problem, i) => (
                  <li key={i} className="text-[10px] font-medium text-rose-500">• {problem}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
        {result?.ok && result.missing?.length ? (
          <p className="mt-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-700">
            Good lesson, but the AI left out: {result.missing.join(', ')}. Ask it for the missing part, or save it as it is — it will still run.
          </p>
        ) : null}
      </div>

      {/* ── Preview ── */}
      {preview && (
        <div className="rounded-3xl border-2 border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-500">
                {previewKind.emoji} {previewKind.label} · {KID_BANDS[(preview.band as KidAgeBand) || band]?.label || bandProfile.label}
              </p>
              <h3 className="text-xl font-black text-indigo-950">{preview.title}</h3>
              <p className="text-[11px] font-bold text-slate-500">
                {[
                  preview.durationMinutes ? `${preview.durationMinutes} min` : '',
                  preview.ageRange ? `ages ${preview.ageRange}` : '',
                  preview.words?.length ? `${preview.words.length} words` : '',
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => launchLesson(preview)}
                className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md hover:bg-indigo-500"
              >
                ▶ Start class
              </button>
              <button
                type="button"
                onClick={saveLesson}
                disabled={!allowed}
                className={`rounded-2xl px-4 py-2.5 text-sm font-black text-white shadow-md transition-all ${
                  justSaved ? 'bg-emerald-500' : allowed ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                {justSaved ? '✓ Saved' : '💾 Save'}
              </button>
              {openSavedId && (
                <button
                  type="button"
                  onClick={() => { playClick(); setOpenSavedId(null); setDraft(null); }}
                  className="rounded-2xl border-2 border-slate-200 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          {/* Keep it as three simple pages: before class, in class, at home. */}
          <div className="mt-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-500">🧰 Save it as 3 simple pages</p>
                <p className="text-[10px] font-bold text-slate-500">
                  Before class · In class · At home — plain .html files that open on any laptop.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadAllPhases}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white hover:bg-indigo-500"
              >
                <Download className="h-3.5 w-3.5" /> Save all 3
              </button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {phaseFiles.map((file) => (
                <div key={file.phase} className="rounded-xl border-2 border-slate-100 bg-white p-2">
                  <p className="text-[11px] font-black text-indigo-950">{file.emoji} {file.label}</p>
                  <p className="truncate text-[9px] font-bold text-slate-400">{file.filename}</p>
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => previewPhase(file)}
                      className="flex items-center gap-1 rounded-lg border-2 border-indigo-100 px-2 py-1 text-[10px] font-black uppercase text-indigo-500 hover:border-indigo-300"
                    >
                      <Eye className="h-3 w-3" /> Look
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadPhase(file)}
                      className="flex items-center gap-1 rounded-lg border-2 border-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-600 hover:border-emerald-300"
                    >
                      <Download className="h-3 w-3" /> Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cut or add any part, then present or save it. */}
          <div className="mt-4 rounded-2xl border-2 border-amber-100 bg-amber-50/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-600">✏️ Make it yours</p>
              <button
                type="button"
                onClick={() => { playClick(); setEditing((v) => !v); }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${
                  editing ? 'bg-amber-500 text-white' : 'border-2 border-amber-200 bg-white text-amber-600 hover:border-amber-400'
                }`}
              >
                <Pencil className="h-3.5 w-3.5" /> {editing ? 'Done editing' : 'Edit the parts'}
              </button>
            </div>
            {editing ? (
              <LessonEditor lesson={preview} onChange={(next) => setDraft(next)} />
            ) : (
              <p className="mt-1 text-[10px] font-bold text-slate-500">
                Every part can be removed or added — the words, the steps, the game, the videos and the notes.
              </p>
            )}
          </div>

          {preview.objectives?.length ? (
            <div className="mt-4 rounded-2xl bg-indigo-50/70 p-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-indigo-500">By the end, {learner.name || 'the child'} can…</p>
              <ul className="mt-1 space-y-0.5">
                {preview.objectives.slice(0, 4).map((o, i) => <li key={i} className="text-sm font-bold text-indigo-900">• {o}</li>)}
              </ul>
            </div>
          ) : null}

          {preview.materials?.length ? (
            <p className="mt-3 text-[11px] font-bold text-slate-500">🧺 You need: {preview.materials.join(' · ')}</p>
          ) : null}

          {preview.words?.length ? (
            <div className="mt-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Words</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {preview.words.map((w, i) => (
                  <div key={i} className="rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-3 text-center">
                    <p className="text-3xl">{w.emoji || '🔤'}</p>
                    <p className="text-sm font-black text-indigo-950">{w.word}</p>
                    {w.sayAloud ? <p className="text-[10px] font-bold text-slate-500">{w.sayAloud}</p> : null}
                    {w.meaning ? <p className="text-[10px] font-medium text-slate-400">{w.meaning}</p> : null}
                    {w.example ? <p className="mt-1 text-[10px] italic text-indigo-500">{w.example}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {preview.steps?.length ? (
            <div className="mt-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">The lesson, step by step</p>
              <div className="mt-2 space-y-2">
                {preview.steps.map((step, i) => (
                  <div key={i} className="rounded-2xl border-2 border-slate-100 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-black text-indigo-950">{i + 1}. {step.name}</p>
                      {step.minutes ? <span className="text-[10px] font-black uppercase text-slate-400">{step.minutes} min</span> : null}
                    </div>
                    {step.teacherScript ? (
                      <p className="mt-1 rounded-xl bg-violet-50 p-2 text-[11px] font-bold text-violet-900">🗣 {step.teacherScript}</p>
                    ) : null}
                    {step.childAction ? <p className="mt-1 text-[11px] font-bold text-slate-600">🧒 {step.childAction}</p> : null}
                    {step.print ? <p className="mt-1 text-[11px] font-bold text-slate-600">🖨 {step.print}</p> : null}
                    {step.tip ? <p className="mt-1 text-[11px] font-medium italic text-amber-700">💡 {step.tip}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {preview.game ? (
            <div className="mt-4 rounded-2xl border-2 border-amber-100 bg-amber-50/50 p-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-600">🎮 {preview.game.name}</p>
              {preview.game.howToPlay ? <p className="mt-1 text-xs font-bold text-slate-700">{preview.game.howToPlay}</p> : null}
              {preview.game.winCondition ? <p className="mt-1 text-[11px] font-bold text-slate-500">🏁 {preview.game.winCondition}</p> : null}
              {preview.game.offline ? <p className="mt-1 text-[11px] font-bold text-slate-500">✂️ No screen: {preview.game.offline}</p> : null}
              {preview.game.items?.length ? (
                <div className="mt-2 space-y-1">
                  {preview.game.items.map((item, i) => (
                    <div key={i} className="rounded-xl bg-white/80 p-2">
                      <p className="text-[11px] font-black text-indigo-950">
                        {item.picture ? `${item.picture} ` : ''}{item.prompt}
                      </p>
                      <p className="text-[11px] font-bold text-emerald-600">✓ {item.answer}</p>
                      {item.distractors?.length ? <p className="text-[10px] font-medium text-slate-400">✗ {item.distractors.join(' · ')}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {preview.lyrics?.length ? (
            <div className="mt-4 rounded-2xl border-2 border-pink-100 bg-pink-50/50 p-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-pink-600">🎵 {preview.chantRhythm ? `Rhythm: ${preview.chantRhythm}` : 'Lyrics'}</p>
              <div className="mt-1 space-y-0.5">
                {preview.lyrics.map((line, i) => <p key={i} className="text-sm font-bold text-pink-900">{line}</p>)}
              </div>
            </div>
          ) : null}

          {(preview.worksheet?.length || preview.homework?.length) ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {preview.worksheet?.length ? (
                <div className="rounded-2xl border-2 border-slate-100 p-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">🖨 To print</p>
                  <ul className="mt-1 space-y-0.5">{preview.worksheet.map((item, i) => <li key={i} className="text-[11px] font-bold text-slate-700">• {item}</li>)}</ul>
                </div>
              ) : null}
              {preview.homework?.length ? (
                <div className="rounded-2xl border-2 border-slate-100 p-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">🏠 At home</p>
                  <ul className="mt-1 space-y-0.5">{preview.homework.map((item, i) => <li key={i} className="text-[11px] font-bold text-slate-700">• {item}</li>)}</ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {preview.caregiverNote ? (
            <div className="mt-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 p-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">👨‍👩‍👧 For the family</p>
              <p className="mt-1 text-[11px] font-bold text-emerald-900">{preview.caregiverNote}</p>
            </div>
          ) : null}
          {preview.teacherNote ? (
            <div className="mt-3 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 p-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-indigo-500">🍎 For the tutor</p>
              <p className="mt-1 text-[11px] font-bold text-indigo-900">{preview.teacherNote}</p>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Saved ── */}
      {saved.length > 0 && (
        <div className="rounded-3xl border-2 border-slate-100 bg-white/80 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            {learner.name}'s saved lessons
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {saved.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-2 rounded-2xl border-2 border-slate-100 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-indigo-950">
                    {entry.kindEmoji} {entry.lesson?.title || entry.topic}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {entry.kindLabel} · {KID_BANDS[entry.band]?.ages || entry.band} · {prettyDate(entry.createdAt)}
                  </p>
                  {entry.summary ? <p className="text-[10px] font-bold text-slate-500">{entry.summary}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => launchLesson(entry.lesson)}
                    className="rounded-xl border-2 border-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-600 hover:border-emerald-300"
                  >
                    ▶ Start
                  </button>
                  <button
                    type="button"
                    onClick={() => openSaved(entry)}
                    className="rounded-xl border-2 border-indigo-100 px-2 py-1 text-[10px] font-black uppercase text-indigo-500 hover:border-indigo-300"
                  >
                    ✏️ Open
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLesson(entry.id)}
                    className="rounded-xl border-2 border-rose-100 p-1.5 text-rose-400 hover:border-rose-300"
                    title="Delete this lesson"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {saved.length === 0 && !preview && (
        <p className="rounded-3xl border-2 border-dashed border-slate-200 p-4 text-center text-[11px] font-bold text-slate-400">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
          No lessons saved yet. Nothing here is sent to an AI automatically — you paste the prompt anywhere you like,
          and the lesson you build stays on this profile.
          <Plus className="ml-2 inline h-3.5 w-3.5" />
        </p>
      )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          GAME STUDIO — scripts the projector player runs
          ══════════════════════════════════════════════════════════════════ */}
      {mode === 'game' && (
        <>
          <div className="rounded-3xl border-2 border-violet-100 bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-violet-400">Step 1 · Pick a game</p>
            <p className="mt-1 text-[11px] font-bold text-slate-500">
              {bandProfile.emoji} {bandProfile.ages} shelf — each tile says what the child does and why that game suits this age.
              Press <b>▶ Test</b> on any tile to play it right now, with no AI involved.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shelf.map((g) => {
                const active = g.id === game.id;
                const hasDemo = !!demoForGame(g.id);
                return (
                  <div
                    key={g.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { playClick(); setGameId(g.id); setGameResult(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { playClick(); setGameId(g.id); } }}
                    className={`cursor-pointer rounded-2xl border-2 p-3 transition-all ${
                      active ? 'border-violet-400 bg-violet-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-violet-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-black text-indigo-950">
                        <span className="text-xl">{g.emoji}</span>{g.label}
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
                        {g.minutes} min
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] font-bold text-slate-600">{g.interaction}</p>
                    <p className="mt-1 text-[10px] font-medium leading-snug text-slate-400">🧠 {g.why}</p>
                    {/* Real photos, declared. A tutor picking between tiles deserves to
                        know which ones will show photographs of the actual words and
                        which are working on the written form instead — that is the
                        difference between a recognition task and an orthography one,
                        and it changes who the game suits. */}
                    <p className="mt-1.5 text-[10px] font-bold text-sky-600">
                      {g.media === 'essential' ? '📷 Real photos — the child identifies the thing' : '📝 Written words — the child reads and spells'}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium leading-snug text-slate-400">
                      🖨 If the screen dies: {g.noScreen}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); playDemo(g); }}
                        disabled={!hasDemo}
                        className="rounded-xl bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white hover:bg-emerald-500 disabled:bg-slate-300"
                      >
                        ▶ Test
                      </button>
                      <span className="text-[10px] font-bold text-slate-400">
                        {String(g.rounds).split(',')[0]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] font-bold text-amber-600">
              ⚠️ The other band's shelf is a switch away — a 2-year-old and a 9-year-old never get the same game.
            </p>
          </div>

          <div className="rounded-3xl border-2 border-slate-100 bg-white/80 p-5 shadow-sm space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Step 2 · What is the game about?</p>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Topic or target *</label>
              <input
                value={gameTopic}
                onChange={(e) => setGameTopic(e.target.value)}
                placeholder={band === 'veryYoung' ? 'e.g. farm animals — the word "duck"' : 'e.g. past tense with the pond story'}
                className="mt-1 w-full rounded-2xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold text-indigo-950 outline-none focus:border-violet-400"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Words to use (optional)</label>
                <input
                  value={gameWords}
                  onChange={(e) => setGameWords(e.target.value)}
                  placeholder="duck, cow, pond, swim"
                  className="mt-1 w-full rounded-2xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold text-indigo-950 outline-none focus:border-violet-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Anything to know (optional)</label>
                <input
                  value={gameNotes}
                  onChange={(e) => setGameNotes(e.target.value)}
                  placeholder="two teams · one child is non-verbal · only 10 minutes left"
                  className="mt-1 w-full rounded-2xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold text-indigo-950 outline-none focus:border-violet-400"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-violet-100 bg-violet-50/40 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-violet-400">Step 3 · Copy the game prompt</p>
            <p className="mt-1 text-sm font-bold text-slate-600">
              The prompt names the player this game runs on ({game.engine}), the exact JSON it must return, the
              {' '}{bandProfile.label} rules, and what {learner.name} already knows — so the game comes back playable
              rather than pretty.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyGamePrompt}
                className={`rounded-2xl px-4 py-2.5 text-sm font-black text-white shadow-md transition-all ${gameCopied ? 'bg-emerald-500' : 'bg-violet-600 hover:bg-violet-500'}`}
              >
                {gameCopied ? '✓ Prompt copied!' : `📋 Copy the ${game.label} prompt`}
              </button>
              <button
                type="button"
                onClick={() => { playClick(); playDemo(game); }}
                disabled={!demoForGame(game.id)}
                className="rounded-2xl border-2 border-emerald-200 bg-white px-3 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-600 hover:border-emerald-400 disabled:opacity-40"
              >                    ▶ Play the test game
                  </button>
              <button
                type="button"
                onClick={() => { playClick(); setShowPrompt((v) => !v); }}
                className="rounded-2xl border-2 border-violet-200 bg-white px-3 py-2.5 text-xs font-black uppercase tracking-wider text-violet-500 hover:border-violet-400"
              >
                {showPrompt ? 'Hide the prompt' : 'Read the prompt'}
              </button>
            </div>
            <ol className="mt-3 space-y-1 text-[11px] font-bold text-slate-500">
              <li>1. Copy the prompt into any AI (ChatGPT, Gemini, Claude).</li>
              <li>2. Answer its question with your topic if it asks one.</li>
              <li>3. Paste the whole JSON block into Step 4 below.</li>
              <li>4. Press ▶ Play — the game opens full screen for the class.</li>
            </ol>
            {showPrompt && (
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-900 p-3 text-[10px] leading-relaxed text-slate-100">
                {buildKidGamePrompt({ game, topic: gameTopic, words: gameWords, notes: gameNotes }, learner, teacher)}
              </pre>
            )}
          </div>

          <div className="rounded-3xl border-2 border-slate-100 bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Step 4 · Paste the game back</p>
            <textarea
              value={gameRaw}
              onChange={(e) => { setGameRaw(e.target.value); setGameResult(null); }}
              rows={7}
              placeholder={'Paste the AI’s reply here — the whole { "rounds": [ … ] } block. Fenced ```json blocks are fine.'}
              className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-3 py-2.5 font-mono text-[11px] text-slate-700 outline-none focus:border-violet-400"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={checkGameReply}
                disabled={!gameRaw.trim()}
                className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-md hover:bg-violet-500 disabled:bg-slate-300"
              >
                ✅ Check the game
              </button>
              <button
                type="button"
                onClick={() => { playClick(); setGameRaw(''); setGameResult(null); }}
                className="rounded-2xl border-2 border-slate-200 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:border-slate-400"
              >
                Clear
              </button>
              {gameResult?.ok && (
                <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-600">
                  ✓ Playable: {gameResult.summary}
                </span>
              )}
            </div>

            {gameResult && !gameResult.ok && (
              <div className="mt-3 rounded-2xl border-2 border-rose-200 bg-rose-50 p-3">
                <p className="text-[11px] font-bold text-rose-600">⚠ {gameResult.error}</p>
                {gameResult.problems?.length ? (
                  <ul className="mt-1 space-y-0.5">
                    {gameResult.problems.slice(0, 6).map((p, i) => <li key={i} className="text-[10px] font-medium text-rose-500">• {p}</li>)}
                  </ul>
                ) : null}
              </div>
            )}
            {gameResult?.ok && (gameResult.problems?.length || gameResult.fixes?.length) ? (
              <div className="mt-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-3">
                {gameResult.problems?.length ? (
                  <>
                    <p className="text-[11px] font-black text-amber-700">{gameResult.problems.length} round(s) could not be played and were dropped:</p>
                    <ul className="mt-1 space-y-0.5">
                      {gameResult.problems.slice(0, 6).map((p, i) => <li key={i} className="text-[10px] font-medium text-amber-700">• {p}</li>)}
                    </ul>
                  </>
                ) : null}
                {gameResult.fixes?.length ? (
                  <p className="mt-1 text-[10px] font-bold text-amber-700">Fixed for you: {gameResult.fixes.join(' ')}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {gameResult?.ok && gameResult.script && (
            <div className="rounded-3xl border-2 border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-500">
                    {game.emoji} {game.label} · {bandProfile.label} {bandProfile.ages} · {gameResult.script.rounds.length} rounds
                  </p>
                  <h3 className="text-xl font-black text-indigo-950">{gameResult.script.title}</h3>
                  {gameResult.script.howToPlay ? (
                    <p className="mt-1 max-w-2xl text-[11px] font-bold text-slate-500">👩‍🏫 {gameResult.script.howToPlay}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => launchGame(gameResult.script as KidGameScript, game)}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-base font-black text-white shadow-lg hover:bg-emerald-500"
                  >
                    ▶ Play on screen
                  </button>
                  <button
                    type="button"
                    onClick={() => saveGame(false)}
                    className={`rounded-2xl px-4 py-3 text-sm font-black text-white shadow-md ${gameSaved ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                  >
                    {gameSaved ? '✓ Saved' : '💾 Save to profile'}
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {gameResult.script.rounds.map((r, i) => (
                  <div key={i} className="rounded-2xl border-2 border-slate-100 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Round {i + 1} · {String(r.type)}</p>
                    <p className="text-sm font-black text-indigo-950">{String(r.prompt || '')}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                      {(Array.isArray(r.options) && (r.options as any[]).length ? (r.options as any[]).map((o) => typeof o === 'string' ? o : String(o?.text ?? '')).join(' · ')
                        : Array.isArray((r as any).lyrics) ? (r as any).lyrics.join(' / ')
                        : Array.isArray((r as any).checklist) ? (r as any).checklist.join(' · ')
                        : Array.isArray((r as any).pairs) ? (r as any).pairs.map((p: any) => `${p.left}=${p.right}`).join(' · ')
                        : String((r as any).readAloudText || ''))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {savedGames.length > 0 && (
            <div className="rounded-3xl border-2 border-slate-100 bg-white/80 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">{learner.name}'s saved games</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {savedGames.map((entry) => {
                  const source = gameById(entry.gameId) || game;
                  return (
                    <div key={entry.id} className="flex items-start justify-between gap-2 rounded-2xl border-2 border-slate-100 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-indigo-950">{entry.emoji} {entry.script?.title || entry.label}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {entry.label} · {KID_BANDS[entry.band]?.ages || entry.band} · {entry.script?.rounds.length || 0} rounds · {prettyDate(entry.createdAt)}
                        </p>
                        {entry.summary ? <p className="text-[10px] font-bold text-slate-500">{entry.summary}</p> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => entry.script && launchGame(entry.script, source)}
                          className="rounded-xl border-2 border-emerald-200 px-2 py-1 text-[10px] font-black uppercase text-emerald-600 hover:border-emerald-400"
                        >
                          ▶ Play
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGame(entry.id)}
                          className="rounded-xl border-2 border-rose-100 p-1.5 text-rose-400 hover:border-rose-300"
                          title="Delete this game"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {savedGames.length === 0 && !gameResult?.ok && (
            <p className="rounded-3xl border-2 border-dashed border-slate-200 p-4 text-center text-[11px] font-bold text-slate-400">
              🎮 No games saved yet. Play a built-in example with one press, or build your own with the prompt.
            </p>
          )}
        </>
      )}

      {/* The single-file launcher — lessons, activities and games all open through it.
          Rendered last so it covers everything; Esc or its own X closes it. */}
      {launching && (
        <KidLessonLauncher
          learner={learner}
          band={launching.game ? launching.game.script.band : band}
          lesson={launching.lesson || null}
          game={launching.game || null}
          customization={customization}
          onClose={() => setLaunching(null)}
        />
      )}

      {/* One of the three saved pages, shown exactly as the file will look. */}
      {phasePreview && (
        <div className="fixed inset-0 z-[85] flex flex-col bg-slate-900/85 p-3 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-white">
            <p className="text-sm font-black">
              {phasePreview.emoji} {phasePreview.label} · <span className="text-white/60">{phasePreview.filename}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadPhase(phasePreview)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-emerald-500"
              >
                <Download className="h-3.5 w-3.5" /> Save this page
              </button>
              <button
                type="button"
                onClick={() => { playClick(); setPhasePreview(null); }}
                className="rounded-xl bg-white/15 p-2 hover:bg-white/25"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <iframe
            title={phasePreview.label}
            srcDoc={phasePreview.html}
            sandbox="allow-scripts allow-same-origin allow-popups"
            className="mt-3 w-full flex-1 rounded-2xl border-0 bg-white"
          />
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   ✏️ THE LESSON EDITOR — take a part out, or put one back
   ══════════════════════════════════════════════════════════════════════════════

   A lesson from an AI is a good first draft, never a finished thing: a tutor wants
   to drop a word the child already knows, shorten the worksheet, or add the song
   they actually sing. This is the smallest editor that makes that possible — in
   plain words, with no JSON to touch by hand. Every part gets one ✕ to remove it
   and one "+ add" to bring it back.

   It edits the draft in place through `onChange`, so the preview, the three saved
   HTML pages and the presenter all show the change the moment it is made.
   ══════════════════════════════════════════════════════════════════════════════ */

const edInput =
  'w-full rounded-xl border-2 border-slate-200 px-2.5 py-2 text-xs font-bold text-indigo-950 outline-none focus:border-indigo-400';
const edBtn =
  'rounded-xl border-2 border-emerald-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wide text-emerald-600 hover:border-emerald-400';

const PartHead: React.FC<{ emoji: string; label: string; onRemove: () => void }> = ({ emoji, label, onRemove }) => (
  <div className="mt-4 flex items-center justify-between gap-2">
    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
      {emoji} {label}
    </p>
    <button type="button" onClick={onRemove} className="rounded-lg border-2 border-rose-100 px-2 py-1 text-[10px] font-black uppercase text-rose-400 hover:border-rose-300">
      ✕ Remove
    </button>
  </div>
);

const EdChip: React.FC<{ children: React.ReactNode; onRemove: () => void }> = ({ children, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">
    {children}
    <button type="button" onClick={onRemove} className="text-rose-400 hover:text-rose-600" title="Remove">
      ✕
    </button>
  </span>
);

const LESSON_DEFAULT_GAME: KidLessonGame = {
  name: 'New game',
  howToPlay: 'Say what to do, one step at a time.',
  winCondition: 'Everyone has several turns and the game ends happily.',
  turns: 4,
  offline: 'How to play it with no screen.',
  items: [{ prompt: 'Which one?', answer: 'this one', distractors: ['that one'] }],
};

interface LessonEditorProps {
  lesson: KidLesson;
  onChange: (next: KidLesson) => void;
}

const LessonEditor: React.FC<LessonEditorProps> = ({ lesson, onChange }) => {
  const set = (patch: Partial<KidLesson>) => onChange({ ...lesson, ...patch });

  const [objective, setObjective] = useState('');
  const [material, setMaterial] = useState('');
  const [lyric, setLyric] = useState('');
  const [worksheetItem, setWorksheetItem] = useState('');
  const [homeworkItem, setHomeworkItem] = useState('');
  const [wordDraft, setWordDraft] = useState({ word: '', emoji: '', meaning: '' });
  const [stepDraft, setStepDraft] = useState({ name: '', teacherScript: '', childAction: '' });
  const [mediaDraft, setMediaDraft] = useState<{ kind: KidLessonMedia['kind']; title: string; url: string }>({
    kind: 'video',
    title: '',
    url: '',
  });
  const [gameItemDraft, setGameItemDraft] = useState({ prompt: '', answer: '' });
  const [cardDraft, setCardDraft] = useState({ word: '', emoji: '', childSays: '' });

  const present: Record<KidLessonEditorPart, boolean> = {
    objectives: !!lesson.objectives?.length,
    phonics: !!lesson.phonics,
    movement: !!lesson.movement,
    routine: !!lesson.routine,
    circle: !!lesson.circle,
    sheet: !!lesson.sheet,
    quest: !!lesson.quest,
    quiz: !!lesson.quiz,
    deck: !!lesson.deck,
    storyWalk: !!lesson.storyWalk,
    story: !!lesson.story?.pages?.length || !!lesson.story?.roleplay,
    scene: !!lesson.scene,
    words: !!lesson.words?.length,
    media: !!lesson.media?.length,
    steps: !!lesson.steps?.length,
    game: !!lesson.game,
    mission: !!lesson.mission,
    lyrics: !!lesson.lyrics?.length,
    worksheet: !!lesson.worksheet?.length,
    homework: !!lesson.homework?.length,
    run: !!lesson.run,
    caregiverNote: !!lesson.caregiverNote,
  };

  const removePart = (part: KidLessonEditorPart) => {
    playClick();
    if (part === 'objectives') return set({ objectives: undefined });
    if (part === 'words') return set({ words: undefined });
    if (part === 'media') return set({ media: undefined });
    if (part === 'steps') return set({ steps: undefined });
    if (part === 'game') return set({ game: undefined });
    if (part === 'lyrics') return set({ lyrics: undefined });
    if (part === 'worksheet') return set({ worksheet: undefined });
    if (part === 'homework') return set({ homework: undefined });
    if (part === 'caregiverNote') return set({ caregiverNote: undefined });
    if (part === 'scene') return set({ scene: undefined });
    if (part === 'mission') return set({ mission: undefined });
    if (part === 'run') return set({ run: undefined });
    if (part === 'story') return set({ story: undefined });
    if (part === 'phonics') return set({ phonics: undefined });
    if (part === 'movement') return set({ movement: undefined });
    if (part === 'routine') return set({ routine: undefined });
    if (part === 'circle') return set({ circle: undefined });
    if (part === 'sheet') return set({ sheet: undefined });
    if (part === 'quest') return set({ quest: undefined });
    if (part === 'quiz') return set({ quiz: undefined });
    if (part === 'deck') return set({ deck: undefined });
    if (part === 'storyWalk') return set({ storyWalk: undefined });
  };

  const addPart = (part: KidLessonEditorPart) => {
    playClick();
    if (part === 'objectives') return set({ objectives: ['Say one new thing by yourself'] });
    if (part === 'words') return set({ words: [{ word: 'new word', emoji: '⭐', meaning: 'what it is', example: 'A sentence with it.' }] });
    if (part === 'media')
      return set({
        media: [
          {
            kind: 'video',
            title: 'A song we can sing',
            url: 'https://www.youtube.com/results?search_query=super+simple+songs',
            where: 'both',
            why: 'Sing it together.',
            source: 'YouTube',
          },
        ],
      });
    if (part === 'steps')
      return set({ steps: [{ name: 'New step', minutes: 3, teacherScript: 'Say this out loud.', childAction: 'What the child does.' }] });
    if (part === 'game') return set({ game: { ...LESSON_DEFAULT_GAME, items: LESSON_DEFAULT_GAME.items?.map((i) => ({ ...i })) } });
    if (part === 'lyrics') return set({ lyrics: ['A new song line 🎵'] });
    if (part === 'worksheet') return set({ worksheet: ['Something to print and do'] });
    if (part === 'homework') return set({ homework: ['A 5-minute thing to do at home — 10 XP'] });
    if (part === 'caregiverNote') return set({ caregiverNote: 'The exact English words to say at home this week.' });
    if (part === 'scene')
      return set({
        scene: {
          title: 'A real picture we look at together',
          photoQuery: 'the topic in real photos',
          clipTitle: 'A very short clip',
          clipUrl: 'https://www.youtube.com/results?search_query=the+topic+for+kids',
          listenFor: 'Listen for one word — put your hand up every time you hear it.',
        },
      });
    if (part === 'mission')
      return set({
        mission: {
          title: 'A real thing to do, out loud',
          realWorld: 'Where this happens in real life this week.',
          sayIt: '“The exact sentence the child must say to finish it.”',
          steps: ['Step one', 'Step two', 'Step three'],
        },
      });
    if (part === 'story')
      return set({
        story: {
          pages: [{ text: 'One page of the story.', emoji: '📖' }],
          map: { character: 'who it is about', setting: 'where it happens', problem: 'what they wanted', feeling: 'how they felt', ending: 'how it ended' },
          rungs: [
            { with: 'the pages and the words', prompt: 'Tell it back with the pages here. Start with: “First… then… at the end…”', talkTarget: 5 },
            { with: 'the pictures only', prompt: 'The words go away — same story, pictures only.', talkTarget: 5 },
            { with: 'everything hidden, just the story map', prompt: 'Everything hidden — use all five boxes.', talkTarget: 4 },
          ],
          roleplay: { character: 'the character', emoji: '🎭', questions: ['Why did you ___?', 'How did you feel?'] },
        },
      });
    if (part === 'phonics')
      return set({
        phonics: {
          sound: '/s/',
          inWords: ['sun', 'sock', 'sand'],
          realWords: ['sun', 'sock', 'sand', 'sip', 'sam'],
          nonsenseWords: ['sab', 'sot'],
          minimalPairs: [{ a: 'sip', b: 'zip', emojiA: '🥤', emojiB: '🤐' }],
          ladder: [
            { step: 'hear it', what: 'Say the sound on its own, three times. The child copies.', talkTarget: 3 },
            { step: 'say it', what: 'Say it inside a word: sss—un.', talkTarget: 3 },
            { step: 'find it', what: 'Which picture starts with /s/? Two pictures only.', talkTarget: 2 },
            { step: 'blend it', what: 'Sound it out and push it together: s-a-t, s-u-n.', talkTarget: 3 },
            { step: 'read it', what: 'Read the four real words, one at a time.', talkTarget: 4 },
            { step: 'spell it', what: 'Build one word out of its letter tiles.', talkTarget: 2 },
            { step: 'write it', what: 'Write the dictation words as you say them.', talkTarget: 1 },
          ],
          mouth: 'teeth together, air keeps going — “sss”, like a snake',
          dictation: ['sun', 'sock', 'sand'],
          answerKey: ['sun', 'sock', 'sand'],
          decodable: {
            title: 'Sam and the Sun',
            lines: ['Sam has a sock.', 'Sam sits in the sun.', 'Sam is sad.', 'Sam sees a sock in the sun.'],
            /* Every word /s/ cannot decode — a decodable story is only decodable when
               nothing in it is a surprise. */
            trickyWords: ['has', 'a', 'sits', 'in', 'the', 'is', 'sad', 'sees'],
            retell: 'tell me where Sam sat, and why Sam was sad',
            talkTarget: 3,
          },
        },
      });
    if (part === 'movement')
      return set({
        movement: {
          commands: [
            { command: 'jump', emoji: '🦘', do: 'Jump like a frog!', twoStep: 'Clap your hands, then jump!' },
            { command: 'clap', emoji: '👏', do: 'Clap your hands!', twoStep: 'Clap twice, then sit down!' },
            { command: 'sit down', emoji: '🪑', do: 'Sit down on the floor.', twoStep: 'Turn around, then sit down!' },
            { command: 'stand up', emoji: '🧍', do: 'Stand up tall like a tree!', twoStep: 'Stand up, then turn around!' },
            { command: 'turn around', emoji: '🌀', do: 'Turn around, all the way!', twoStep: 'Jump twice, then turn around!' },
            { command: 'touch your nose', emoji: '👃', do: 'Touch your nose!', twoStep: 'Stretch up high, then touch your nose!' },
            { command: 'stretch', emoji: '🙆', do: 'Stretch up high like a tall tree!', twoStep: 'Stretch up high, then sit down slowly!' },
          ],
          newCommand: 'stretch',
          speedPlay: ['Fast! ⚡', 'Slow like a turtle 🐢', 'Whisper 🤫', 'Robot voice 🤖'],
          bossRound: ['jump!', 'clap!', 'sit down!', 'stand up!', 'turn around!'],
        },
      });
    if (part === 'routine')
      return set({
        routine: {
          name: 'At the sink, at the table, at the bed',
          moments: [
            { moment: 'wash hands', emoji: '🧼', say: 'Wash, wash, wash your hands!', childDoes: 'Rubs hands together.', childSays: '“wash!”', photoQuery: 'child washing hands bathroom sink' },
            { moment: 'eat', emoji: '🍎', say: 'Time to eat! Eat, eat, eat!', childDoes: 'Pretends to eat.', childSays: '“eat!”', photoQuery: 'toddler eating at family table' },
            { moment: 'sleep', emoji: '🛏️', say: 'Shhh... sleepy head. Time to sleep.', childDoes: 'Lies down and closes their eyes.', childSays: '“sleepy!”', photoQuery: 'child sleeping in bed' },
          ],
          sameLine: 'It is TIME!',
          fillIn: 'wash, wash, wash your ___',
          pronunciation: [
            { word: 'wash', hint: '“wosh” — rhymes with “posh”, one short round sound' },
            { word: 'eat', hint: '“eet” — a long ee, like the end of “feet”' },
            { word: 'sleepy', hint: '“SLEE-pee” — long and loud first, quiet and short second' },
          ],
        },
      });
    if (part === 'circle')
      return set({
        circle: {
          name: 'The Hello Circle',
          hello: [
            'Hello, hello, hello to you! 👋',
            'Hello, hello, how are you? 😀',
            'Sunny or rainy, happy or blue? ☀️🌧️',
            'Hello, hello, I see you! 👀',
          ],
          goodbye: [
            'Goodbye, goodbye, goodbye to you 👋',
            'Goodbye, goodbye, see you soon! 🌟',
            'Clap your hands and wave goodnight 👏',
            'Goodbye, goodbye — off goes the light! 🌙',
          ],
          check: [
            { look: 'sunny', emoji: '☀️', childSays: 'sunny!' },
            { look: 'rainy', emoji: '🌧️', childSays: 'rainy!' },
            { look: 'happy', emoji: '😀', childSays: 'happy!' },
            { look: 'sleepy', emoji: '😴', childSays: 'sleepy!' },
          ],
          waitLine: 'Tap it... tap it... OPEN!',
          surprise: 'duck',
          ask: ['How are you today?', 'What was the weather like yesterday?'],
          nextTime: '“Goodbye, teddy!” — said to my toy tonight.',
        },
      });
    if (part === 'sheet')
      return set({
        sheet: {
          name: 'The Pond Page',
          tasks: [
            { do: 'Match each word to its picture.', emoji: '🔤', paper: 'draw one line', say: 'Read the word, then draw the line.', childSays: 'Duck — this one!' },
            { do: 'Write the missing letters: p _ n d.', emoji: '✏️', paper: 'ruled boxes', boxes: 4, say: 'Sound it out, then write it.', childSays: 'p-o-n-d, pond.' },
            { do: 'Finish: “In my pond there is ___.”', emoji: '💧', paper: 'ruled boxes', boxes: 4, say: 'There is no wrong answer here.', childSays: 'In my pond there is a frog.' },
          ],
          traceWords: ['pond', 'duck'],
          talkFrame: 'In my pond there is ___.',
          answerKey: ['Part 1: duck · pond · frog', 'Part 2: p-o-n-d'],
        },
      });
    if (part === 'quest')
      return set({
        quest: {
          name: 'The Blue Finder',
          partner: 'a grown-up — or the pet, if the pet is closer',
          jobs: [
            { do: 'Bring something blue to a grown-up.', emoji: '💙', night: 'night one', xp: 10, say: 'Find me something blue!', childSays: 'Blue! Here it is!', proof: 'said aloud — the grown-up hears it' },
            { do: 'Find two socks that match.', emoji: '🧦', night: 'night one', xp: 10, say: 'Two socks! Find their friends.', childSays: 'socks!', proof: 'the grown-up sees the pair' },
            { do: 'Show the family what you found.', emoji: '👋', night: 'all week', xp: 20, say: 'Show Grandma your blue thing!', childSays: 'Look! Blue!', proof: 'the family sees it and claps' },
          ],
          tally: 'colour one star for every finished job — the child holds the pencil',
          reward: 'when every star is coloured, the child chooses the bedtime story',
          master: 'I read every job aloud, choose the order, give myself the XP and write the proof — the board is mine.',
        },
      });
    if (part === 'quiz')
      return set({
        quiz: {
          name: 'The Pond Quiz Show',
          rounds: ['THE WARM-UP', 'THE PICTURE ROUND', 'THE QUIZ', 'THE CHILD ASKS'],
          scoreLine: 'ten points, and the duck takes the lead!',
          master: 'I read the question aloud, you answer — and I tell you why you are right.',
        },
      });
    if (part === 'deck')
      return set({
        deck: {
          name: 'The Pond Pack',
          scoreLine: 'the whole pond pack, all by myself!',
          passes: ['the whole pack, sentence by sentence', 'the ones that got away', 'three cards from memory'],
          master: 'I read every card out loud, you answer, and I say why you are right.',
          cards: [
            { word: 'duck', emoji: '🦆', say: 'Tell me about this one — what is it doing?', childSays: 'The duck swims in the pond.', cue: 'a duck on the water', sentence: 'My duck is in the bath.' },
            { word: 'pond', emoji: '💧', say: 'What is this place?', childSays: 'The pond is cool and blue.', cue: 'a small blue pool of water', sentence: 'The pond near my house is small.' },
            { word: 'swim', emoji: '🏊', say: 'What is the action on this card?', childSays: 'Fish swim all day.', cue: 'arms moving through water', sentence: 'I swim at the pool on Saturday.' },
            { word: 'duck and pond', emoji: '🃏', say: 'Two cards! Say both, then tell me about one of them.', childSays: 'The duck swims in the pond.', review: ['duck', 'pond'] },
            { word: 'splash', emoji: '💦', say: 'What happened here?', childSays: 'Splash! Into the water.', cue: 'water flying up', sentence: 'I splash in the bath.' },
            { word: 'boat', emoji: '⛵', say: 'What is this, and where does it go?', childSays: 'A little boat sails past.', cue: 'something that floats on water', sentence: 'The boat is in the harbour.' },
          ],
          spacing: [
            'tonight at dinner: the duck, the pond and the swim cards — the child says the sentence from memory, no screen',
            'tomorrow in the car: the three cards that went in the practice-again pile',
            'in three days: the whole pack, sorted again, and the child runs the last pass',
          ],
        },
      });
    if (part === 'storyWalk')
      return set({
        storyWalk: {
          title: 'The Frog Who Lost His Hop',
          echo: 'Hop, hop, hop!',
          map: ['🐸 a sad frog', '👏 clapping', '🏃 running', '💧 the pond'],
          choose: 'Where does the frog hop next? You say it: “Hop to the ___!”',
          beats: [
            { line: 'The little frog is sad. He lost his hop!', action: 'Sit down like a sad frog.', say: 'hop!', emoji: '🐸' },
            { line: 'He claps his hands. Clap, clap! Nothing happens.', action: 'Clap your hands twice.', say: 'Hop, hop, hop!', emoji: '👏' },
            { line: 'Then he remembers. HOP!', action: 'Jump like a frog, two big jumps.', say: 'hop, hop, HOP!', emoji: '🐸' },
          ],
          chain: ['Creep to the door, then push it.', 'Pull the rope, then lift the box.'],
        },
      });
    if (part === 'run')
      return set({
        run: {
          targetMinutes: 30,
          brainBreaks: ['Shake it out for ten seconds, then sit down slowly.'],
          exitTicket: ['One sentence the child can now say.'],
          nextTime: 'Where the next session starts.',
        },
      });
  };

  return (
    <div className="mt-3 rounded-2xl border-2 border-slate-100 bg-white/70 p-3">
      {/* What is missing, put back in one press. */}
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Add a part back</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {KID_LESSON_PART_ORDER.filter((part) => !present[part]).map((part) => (
          <button
            key={part}
            type="button"
            onClick={() => addPart(part)}
            className="rounded-full border-2 border-dashed border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500 hover:border-indigo-400"
          >
            + {KID_LESSON_PART_LABEL[part]}
          </button>
        ))}
        {KID_LESSON_PART_ORDER.every((part) => present[part]) && (
          <span className="text-[10px] font-bold text-emerald-600">✓ every part is here — remove any you do not want below</span>
        )}
      </div>

      {/* Title */}
      <PartHead emoji="🏷️" label="Title" onRemove={() => set({ title: 'Our lesson' })} />
      <input value={lesson.title} onChange={(e) => set({ title: e.target.value })} className={`${edInput} mt-1.5`} />

      {/* Objectives */}
      {present.objectives && (
        <>
          <PartHead emoji="🎯" label={KID_LESSON_PART_LABEL.objectives} onRemove={() => removePart('objectives')} />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(lesson.objectives || []).map((o, i) => (
              <EdChip key={i} onRemove={() => set({ objectives: (lesson.objectives || []).filter((_, idx) => idx !== i) })}>
                {o}
              </EdChip>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What can the child do now?" className={edInput} />
            <button type="button" className={edBtn} onClick={() => { if (objective.trim()) { set({ objectives: [...(lesson.objectives || []), objective.trim()] }); setObjective(''); } }}>
              + Add
            </button>
          </div>
        </>
      )}

      {/* Materials */}
      <PartHead emoji="🧺" label="Things to get ready" onRemove={() => set({ materials: undefined })} />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {(lesson.materials || []).map((m, i) => (
          <EdChip key={i} onRemove={() => set({ materials: (lesson.materials || []).filter((_, idx) => idx !== i) })}>
            {m}
          </EdChip>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="A toy, a song, a printer…" className={edInput} />
        <button type="button" className={edBtn} onClick={() => { if (material.trim()) { set({ materials: [...(lesson.materials || []), material.trim()] }); setMaterial(''); } }}>
          + Add
        </button>
      </div>

      {/* Words */}
      {present.words && (
        <>
          <PartHead emoji="🔤" label={KID_LESSON_PART_LABEL.words} onRemove={() => removePart('words')} />
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {(lesson.words || []).map((w, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
                <span className="truncate text-[11px] font-bold text-slate-700">
                  {w.emoji || '🔤'} {w.word}
                  {w.meaning ? <span className="text-slate-400"> — {w.meaning}</span> : null}
                </span>
                <button type="button" onClick={() => set({ words: (lesson.words || []).filter((_, idx) => idx !== i) })} className="shrink-0 text-rose-400 hover:text-rose-600">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-[1fr_4rem_1fr_auto]">
            <input value={wordDraft.word} onChange={(e) => setWordDraft((d) => ({ ...d, word: e.target.value }))} placeholder="word" className={edInput} />
            <input value={wordDraft.emoji} onChange={(e) => setWordDraft((d) => ({ ...d, emoji: e.target.value }))} placeholder="🦆" className={edInput} />
            <input value={wordDraft.meaning} onChange={(e) => setWordDraft((d) => ({ ...d, meaning: e.target.value }))} placeholder="what it means" className={edInput} />
            <button
              type="button"
              className={edBtn}
              onClick={() => {
                if (!wordDraft.word.trim()) return;
                const newWord: KidLessonWord = { word: wordDraft.word.trim(), emoji: wordDraft.emoji.trim() || undefined, meaning: wordDraft.meaning.trim() || undefined };
                set({ words: [...(lesson.words || []), newWord] });
                setWordDraft({ word: '', emoji: '', meaning: '' });
              }}
            >
              + Add
            </button>
          </div>
        </>
      )}

      {/* Media */}
      {present.media && (
        <>
          <PartHead emoji="🎬" label={KID_LESSON_PART_LABEL.media} onRemove={() => removePart('media')} />
          <div className="mt-1.5 space-y-1.5">
            {(lesson.media || []).map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
                <span className="min-w-0 truncate text-[11px] font-bold text-slate-700">
                  {mediaKindEmoji(m.kind)} {m.title} <span className="text-slate-400">· {mediaKindLabel(m.kind)}{m.where ? ` · ${m.where}` : ''}</span>
                </span>
                <button type="button" onClick={() => set({ media: (lesson.media || []).filter((_, idx) => idx !== i) })} className="shrink-0 text-rose-400 hover:text-rose-600">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-[7rem_1fr_1fr_auto]">
            <select value={mediaDraft.kind} onChange={(e) => setMediaDraft((d) => ({ ...d, kind: e.target.value as KidLessonMedia['kind'] }))} className={edInput}>
              <option value="video">🎬 Video</option>
              <option value="audio">🎧 Sound</option>
              <option value="activity">🧩 Tap game</option>
              <option value="story">📖 Story</option>
              <option value="picture">🖼️ Picture</option>
            </select>
            <input value={mediaDraft.title} onChange={(e) => setMediaDraft((d) => ({ ...d, title: e.target.value }))} placeholder="what it is" className={edInput} />
            <input value={mediaDraft.url} onChange={(e) => setMediaDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https://…" className={edInput} />
            <button
              type="button"
              className={edBtn}
              onClick={() => {
                if (!/^https:\/\//.test(mediaDraft.url.trim())) return;
                const item: KidLessonMedia = {
                  kind: mediaDraft.kind,
                  title: mediaDraft.title.trim() || mediaKindLabel(mediaDraft.kind),
                  url: mediaDraft.url.trim(),
                  where: 'class',
                };
                set({ media: [...(lesson.media || []), item] });
                setMediaDraft({ kind: 'video', title: '', url: '' });
              }}
            >
              + Add
            </button>
          </div>
        </>
      )}

      {/* Steps */}
      {present.steps && (
        <>
          <PartHead emoji="🕐" label={KID_LESSON_PART_LABEL.steps} onRemove={() => removePart('steps')} />
          <div className="mt-1.5 space-y-1.5">
            {(lesson.steps || []).map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
                <span className="min-w-0 text-[11px] font-bold text-slate-700">
                  {i + 1}. {s.name}
                  {s.teacherScript ? <span className="block font-medium text-slate-400">🗣 {s.teacherScript}</span> : null}
                </span>
                <button type="button" onClick={() => set({ steps: (lesson.steps || []).filter((_, idx) => idx !== i) })} className="shrink-0 text-rose-400 hover:text-rose-600">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-[1fr_1.4fr_1.4fr_auto]">
            <input value={stepDraft.name} onChange={(e) => setStepDraft((d) => ({ ...d, name: e.target.value }))} placeholder="step name" className={edInput} />
            <input value={stepDraft.teacherScript} onChange={(e) => setStepDraft((d) => ({ ...d, teacherScript: e.target.value }))} placeholder="what the tutor says" className={edInput} />
            <input value={stepDraft.childAction} onChange={(e) => setStepDraft((d) => ({ ...d, childAction: e.target.value }))} placeholder="what the child does" className={edInput} />
            <button
              type="button"
              className={edBtn}
              onClick={() => {
                if (!stepDraft.name.trim() && !stepDraft.teacherScript.trim()) return;
                const newStep: KidLessonStep = {
                  name: stepDraft.name.trim() || `Step ${(lesson.steps?.length || 0) + 1}`,
                  minutes: 3,
                  teacherScript: stepDraft.teacherScript.trim() || undefined,
                  childAction: stepDraft.childAction.trim() || undefined,
                };
                set({ steps: [...(lesson.steps || []), newStep] });
                setStepDraft({ name: '', teacherScript: '', childAction: '' });
              }}
            >
              + Add
            </button>
          </div>
        </>
      )}

      {/* Game */}
      {present.game && lesson.game && (
        <>
          <PartHead emoji="🎮" label={KID_LESSON_PART_LABEL.game} onRemove={() => removePart('game')} />
          <input
            value={lesson.game.name}
            onChange={(e) => set({ game: { ...lesson.game!, name: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />
          <div className="mt-1.5 space-y-1.5">
            {(lesson.game.items || []).map((it, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
                <span className="min-w-0 truncate text-[11px] font-bold text-slate-700">
                  {it.picture ? `${it.picture} ` : ''}{it.prompt} → <span className="text-emerald-600">{it.answer}</span>
                </span>
                <button
                  type="button"
                  onClick={() => set({ game: { ...lesson.game!, items: (lesson.game!.items || []).filter((_, idx) => idx !== i) } })}
                  className="shrink-0 text-rose-400 hover:text-rose-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-[1.4fr_1fr_auto]">
            <input value={gameItemDraft.prompt} onChange={(e) => setGameItemDraft((d) => ({ ...d, prompt: e.target.value }))} placeholder="the question" className={edInput} />
            <input value={gameItemDraft.answer} onChange={(e) => setGameItemDraft((d) => ({ ...d, answer: e.target.value }))} placeholder="the answer" className={edInput} />
            <button
              type="button"
              className={edBtn}
              onClick={() => {
                if (!gameItemDraft.prompt.trim() || !gameItemDraft.answer.trim()) return;
                const items = [...(lesson.game!.items || []), { prompt: gameItemDraft.prompt.trim(), answer: gameItemDraft.answer.trim() }];
                set({ game: { ...lesson.game!, items } });
                setGameItemDraft({ prompt: '', answer: '' });
              }}
            >
              + Add
            </button>
          </div>
        </>
      )}

      {/* Lyrics */}
      {present.lyrics && (
        <>
          <PartHead emoji="🎵" label={KID_LESSON_PART_LABEL.lyrics} onRemove={() => removePart('lyrics')} />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(lesson.lyrics || []).map((l, i) => (
              <EdChip key={i} onRemove={() => set({ lyrics: (lesson.lyrics || []).filter((_, idx) => idx !== i) })}>
                {l}
              </EdChip>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input value={lyric} onChange={(e) => setLyric(e.target.value)} placeholder="a song line" className={edInput} />
            <button type="button" className={edBtn} onClick={() => { if (lyric.trim()) { set({ lyrics: [...(lesson.lyrics || []), lyric.trim()] }); setLyric(''); } }}>
              + Add
            </button>
          </div>
        </>
      )}

      {/* The printable's real payload: every task carries what the grown-up says and
          the one line the child says back, plus the trace words, the frame and the
          key the child marks their own work with. */}
      {present.sheet && lesson.sheet && (
        <>
          <PartHead emoji="✏️" label={KID_LESSON_PART_LABEL.sheet} onRemove={() => removePart('sheet')} />
          <input
            value={lesson.sheet.name || ''}
            placeholder="What the family calls the page: “The Pond Page”"
            onChange={(e) => set({ sheet: { ...lesson.sheet!, name: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            The tasks — what they do, what happens on paper, what you say and what they say back
          </p>
          <div className="mt-1 space-y-1.5">
            {(lesson.sheet.tasks || []).map((t, i) => (
              <div key={i} className="rounded-xl border-2 border-indigo-100 p-2">
                <div className="flex items-center gap-1.5">
                  <input
                    value={t.emoji || ''}
                    placeholder="🦆"
                    onChange={(e) => set({ sheet: { ...lesson.sheet!, tasks: lesson.sheet!.tasks!.map((x, idx) => (idx === i ? { ...x, emoji: e.target.value } : x)) } })}
                    className="w-12 rounded-lg border border-slate-200 px-2 py-1 text-center text-lg"
                  />
                  <input
                    value={t.do}
                    placeholder="Colour the duck yellow."
                    onChange={(e) => set({ sheet: { ...lesson.sheet!, tasks: lesson.sheet!.tasks!.map((x, idx) => (idx === i ? { ...x, do: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                  <button
                    type="button"
                    onClick={() => set({ sheet: { ...lesson.sheet!, tasks: lesson.sheet!.tasks!.filter((_, idx) => idx !== i) } })}
                    className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                  >
                    remove
                  </button>
                </div>
                <input
                  value={t.paper || ''}
                  placeholder="on paper: colour · draw one line · ruled boxes · cut and stick"
                  onChange={(e) => set({ sheet: { ...lesson.sheet!, tasks: lesson.sheet!.tasks!.map((x, idx) => (idx === i ? { ...x, paper: e.target.value } : x)) } })}
                  className={`${edInput} mt-1 text-[11px]`}
                />
                <div className="mt-1 flex gap-1.5">
                  <input
                    value={t.say || ''}
                    placeholder="🗣 You say: “Colour the duck yellow!”"
                    onChange={(e) => set({ sheet: { ...lesson.sheet!, tasks: lesson.sheet!.tasks!.map((x, idx) => (idx === i ? { ...x, say: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                  <input
                    value={t.childSays || ''}
                    placeholder="🧒 They say: “duck!”"
                    onChange={(e) => set({ sheet: { ...lesson.sheet!, tasks: lesson.sheet!.tasks!.map((x, idx) => (idx === i ? { ...x, childSays: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={t.boxes ?? ''}
                    placeholder="boxes"
                    onChange={(e) => set({ sheet: { ...lesson.sheet!, tasks: lesson.sheet!.tasks!.map((x, idx) => (idx === i ? { ...x, boxes: e.target.value ? Number(e.target.value) : undefined } : x)) } })}
                    className="w-16 shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px]"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ sheet: { ...lesson.sheet!, tasks: [...(lesson.sheet!.tasks || []), { do: 'Circle the word that starts with /d/.', emoji: '⭕', paper: 'circle', say: 'Say it, then circle it.', childSays: 'duck!' }] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
          >
            + another task
          </button>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">✍️ Words to trace before writing them alone</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(lesson.sheet.traceWords || []).map((w, i) => (
              <EdChip key={i} onRemove={() => set({ sheet: { ...lesson.sheet!, traceWords: lesson.sheet!.traceWords!.filter((_, idx) => idx !== i) } })}>
                {w}
              </EdChip>
            ))}
            <button
              type="button"
              onClick={() => set({ sheet: { ...lesson.sheet!, traceWords: [...(lesson.sheet!.traceWords || []), 'pond'] } })}
              className="rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
            >
              + word
            </button>
          </div>

          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">🗣 The sentence they finish about their own page</p>
              <input
                value={lesson.sheet.talkFrame || ''}
                placeholder="In my pond there is ___."
                onChange={(e) => set({ sheet: { ...lesson.sheet!, talkFrame: e.target.value } })}
                className={`${edInput} mt-1 text-[11px]`}
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">✅ One answer for the self-check</p>
              <input
                value={lesson.sheet.answerKey?.[0] || ''}
                placeholder="Part 2: p-o-n-d · d-u-c-k · s-w-i-m"
                onChange={(e) => set({ sheet: { ...lesson.sheet!, answerKey: e.target.value ? [e.target.value, ...(lesson.sheet!.answerKey || []).slice(1)] : (lesson.sheet!.answerKey || []).slice(1) } })}
                className={`${edInput} mt-1 text-[11px]`}
              />
            </div>
          </div>
        </>
      )}

      {/* The card deck: the spine of the card night. Every card carries BOTH lines —
          the one the grown-up says and the one the child says back — because a card
          with no talking turn teaches pointing. The passes, the finish line, the
          master pass and the spaced week are edited here too: they are what makes
          the words come back during the week instead of stopping at the door. */}
      {present.deck && lesson.deck && (
        <>
          <PartHead emoji="🃏" label={KID_LESSON_PART_LABEL.deck} onRemove={() => removePart('deck')} />
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            <input
              value={lesson.deck.name || ''}
              placeholder="What the class calls the pack: “The Pond Pack”"
              onChange={(e) => set({ deck: { ...lesson.deck!, name: e.target.value } })}
              className={edInput}
            />
            <input
              value={lesson.deck.scoreLine || ''}
              placeholder="What the class says when it is finished: “the whole pond pack!”"
              onChange={(e) => set({ deck: { ...lesson.deck!, scoreLine: e.target.value } })}
              className={edInput}
            />
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            The cards — the line YOU say, then the line THEY say back
          </p>
          <div className="mt-1.5 space-y-1.5">
            {(lesson.deck.cards || []).map((c, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-black text-slate-700">
                    {c.emoji || '🃏'} {c.word}
                    {c.review?.length ? <span className="text-slate-400"> · 🃏 mixes {c.review.join(' + ')}</span> : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => set({ deck: { ...lesson.deck!, cards: (lesson.deck!.cards || []).filter((_, idx) => idx !== i) } })}
                    className="shrink-0 text-rose-400 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                  <input
                    value={c.say || ''}
                    placeholder="What you say as the card goes down"
                    onChange={(e) => set({ deck: { ...lesson.deck!, cards: (lesson.deck!.cards || []).map((card, idx) => (idx === i ? { ...card, say: e.target.value } : card)) } })}
                    className={`${edInput} text-[11px]`}
                  />
                  <input
                    value={c.childSays || ''}
                    placeholder="The line they say back"
                    onChange={(e) => set({ deck: { ...lesson.deck!, cards: (lesson.deck!.cards || []).map((card, idx) => (idx === i ? { ...card, childSays: e.target.value } : card)) } })}
                    className={`${edInput} text-[11px]`}
                  />
                  <input
                    value={c.do || ''}
                    placeholder="2-5: the ACTION on the back of the card"
                    onChange={(e) => set({ deck: { ...lesson.deck!, cards: (lesson.deck!.cards || []).map((card, idx) => (idx === i ? { ...card, do: e.target.value } : card)) } })}
                    className={`${edInput} text-[11px]`}
                  />
                  <input
                    value={c.cue || ''}
                    placeholder="5-12: the picture cue that makes it answerable"
                    onChange={(e) => set({ deck: { ...lesson.deck!, cards: (lesson.deck!.cards || []).map((card, idx) => (idx === i ? { ...card, cue: e.target.value } : card)) } })}
                    className={`${edInput} text-[11px]`}
                  />
                  <input
                    value={c.sentence || ''}
                    placeholder="5-12: the word in THEIR own world"
                    onChange={(e) => set({ deck: { ...lesson.deck!, cards: (lesson.deck!.cards || []).map((card, idx) => (idx === i ? { ...card, sentence: e.target.value } : card)) } })}
                    className={`${edInput} text-[11px] sm:col-span-2`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-[1fr_4rem_1fr_auto]">
            <input value={cardDraft.word} onChange={(e) => setCardDraft((d) => ({ ...d, word: e.target.value }))} placeholder="card word" className={edInput} />
            <input value={cardDraft.emoji} onChange={(e) => setCardDraft((d) => ({ ...d, emoji: e.target.value }))} placeholder="🦆" className={edInput} />
            <input value={cardDraft.childSays} onChange={(e) => setCardDraft((d) => ({ ...d, childSays: e.target.value }))} placeholder="the line they say back" className={edInput} />
            <button
              type="button"
              className={edBtn}
              onClick={() => {
                if (!cardDraft.word.trim()) return;
                set({
                  deck: {
                    ...lesson.deck!,
                    cards: [
                      ...(lesson.deck!.cards || []),
                      { word: cardDraft.word.trim(), emoji: cardDraft.emoji.trim() || undefined, childSays: cardDraft.childSays.trim() || undefined },
                    ],
                  },
                });
                setCardDraft({ word: '', emoji: '', childSays: '' });
              }}
            >
              + Add
            </button>
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">The passes, in the order the night deals them</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(lesson.deck.passes || []).map((p, i) => (
              <EdChip key={i} onRemove={() => set({ deck: { ...lesson.deck!, passes: (lesson.deck!.passes || []).filter((_, idx) => idx !== i) } })}>
                {p}
              </EdChip>
            ))}
            <button
              type="button"
              onClick={() => set({ deck: { ...lesson.deck!, passes: [...(lesson.deck!.passes || []), 'A NEW PASS'] } })}
              className="rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
            >
              + pass
            </button>
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">🎤 The last pass the CHILD runs (5-12)</p>
            <input
              value={lesson.deck.master || ''}
              placeholder="I read every card aloud, you answer — and I say why you are right."
              onChange={(e) => set({ deck: { ...lesson.deck!, master: e.target.value } })}
              className={`${edInput} mt-1 text-[11px]`}
            />
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">🗓 The spaced week — which cards come back tonight, tomorrow, in three days (no screen)</p>
            <div className="mt-1 grid gap-1">
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  value={lesson.deck!.spacing?.[i] || ''}
                  placeholder={
                    [
                      'TONIGHT: the duck, the pond and the swim cards, said aloud at the table',
                      'TOMORROW: the three cards that got away',
                      'IN THREE DAYS: the whole pack from memory',
                    ][i]
                  }
                  onChange={(e) => {
                    const next = [...(lesson.deck!.spacing || [])];
                    while (next.length < 3) next.push('');
                    next[i] = e.target.value;
                    set({ deck: { ...lesson.deck!, spacing: next } });
                  }}
                  className={`${edInput} text-[11px]`}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* The quiz night: the named rounds, the score line said out loud, and the
          final round the child runs. The questions themselves stay under the game. */}
      {present.quiz && lesson.quiz && (
        <>
          <PartHead emoji="❓" label={KID_LESSON_PART_LABEL.quiz} onRemove={() => removePart('quiz')} />
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            <input
              value={lesson.quiz.name || ''}
              placeholder="What the family calls the night: “The Pond Quiz Show”"
              onChange={(e) => set({ quiz: { ...lesson.quiz!, name: e.target.value } })}
              className={edInput}
            />
            <input
              value={lesson.quiz.scoreLine || ''}
              placeholder="How the score is said out loud: “ten points, and the duck takes the lead!”"
              onChange={(e) => set({ quiz: { ...lesson.quiz!, scoreLine: e.target.value } })}
              className={edInput}
            />
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">The rounds, in the order the class runs them</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(lesson.quiz.rounds || []).map((r, i) => (
              <EdChip key={i} onRemove={() => set({ quiz: { ...lesson.quiz!, rounds: lesson.quiz!.rounds!.filter((_, idx) => idx !== i) } })}>
                {r}
              </EdChip>
            ))}
            <button
              type="button"
              onClick={() => set({ quiz: { ...lesson.quiz!, rounds: [...(lesson.quiz!.rounds || []), 'A NEW ROUND'] } })}
              className="rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
            >
              + round
            </button>
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">🎤 The final round the CHILD runs (5-12)</p>
            <input
              value={lesson.quiz.master || ''}
              placeholder="I read the question aloud, you answer — and I tell you why you are right."
              onChange={(e) => set({ quiz: { ...lesson.quiz!, master: e.target.value } })}
              className={`${edInput} mt-1 text-[11px]`}
            />
          </div>
        </>
      )}

      {/* The quest board: the jobs with their XP, the line for the grown-up, the line
          for the child, the proof, and the tally that makes the week happen. */}
      {present.quest && lesson.quest && (
        <>
          <PartHead emoji="🏠" label={KID_LESSON_PART_LABEL.quest} onRemove={() => removePart('quest')} />
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            <input
              value={lesson.quest.name || ''}
              placeholder="What the family calls the quest: “The Blue Finder”"
              onChange={(e) => set({ quest: { ...lesson.quest!, name: e.target.value } })}
              className={edInput}
            />
            <input
              value={lesson.quest.partner || ''}
              placeholder="Who does it with the child: “a grown-up — or the pet”"
              onChange={(e) => set({ quest: { ...lesson.quest!, partner: e.target.value } })}
              className={edInput}
            />
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            The jobs — what they do, what you say, what they say back, the XP and the proof
          </p>
          <div className="mt-1 space-y-1.5">
            {(lesson.quest.jobs || []).map((j, i) => (
              <div key={i} className="rounded-xl border-2 border-indigo-100 p-2">
                <div className="flex items-center gap-1.5">
                  <input
                    value={j.emoji || ''}
                    placeholder="💙"
                    onChange={(e) => set({ quest: { ...lesson.quest!, jobs: lesson.quest!.jobs!.map((x, idx) => (idx === i ? { ...x, emoji: e.target.value } : x)) } })}
                    className="w-12 rounded-lg border border-slate-200 px-2 py-1 text-center text-lg"
                  />
                  <input
                    value={j.do}
                    placeholder="Bring something blue to a grown-up."
                    onChange={(e) => set({ quest: { ...lesson.quest!, jobs: lesson.quest!.jobs!.map((x, idx) => (idx === i ? { ...x, do: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                  <input
                    type="number"
                    min={1}
                    value={j.xp ?? ''}
                    placeholder="XP"
                    onChange={(e) => set({ quest: { ...lesson.quest!, jobs: lesson.quest!.jobs!.map((x, idx) => (idx === i ? { ...x, xp: e.target.value ? Number(e.target.value) : undefined } : x)) } })}
                    className="w-16 shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => set({ quest: { ...lesson.quest!, jobs: lesson.quest!.jobs!.filter((_, idx) => idx !== i) } })}
                    className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                  >
                    remove
                  </button>
                </div>
                <div className="mt-1 flex gap-1.5">
                  <input
                    value={j.say || ''}
                    placeholder="🗣 You say: “Find me something blue!”"
                    onChange={(e) => set({ quest: { ...lesson.quest!, jobs: lesson.quest!.jobs!.map((x, idx) => (idx === i ? { ...x, say: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                  <input
                    value={j.childSays || ''}
                    placeholder="🧒 They say: “Blue! Here it is!”"
                    onChange={(e) => set({ quest: { ...lesson.quest!, jobs: lesson.quest!.jobs!.map((x, idx) => (idx === i ? { ...x, childSays: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                </div>
                <div className="mt-1 flex gap-1.5">
                  <input
                    value={j.night || ''}
                    placeholder="which night: “night one” · “all week”"
                    onChange={(e) => set({ quest: { ...lesson.quest!, jobs: lesson.quest!.jobs!.map((x, idx) => (idx === i ? { ...x, night: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                  <input
                    value={j.proof || ''}
                    placeholder="proof: a photo · initials · said aloud"
                    onChange={(e) => set({ quest: { ...lesson.quest!, jobs: lesson.quest!.jobs!.map((x, idx) => (idx === i ? { ...x, proof: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ quest: { ...lesson.quest!, jobs: [...(lesson.quest!.jobs || []), { do: 'Say the new word to somebody at home.', emoji: '⭐', night: 'night two', xp: 10, say: 'Say it for me!', childSays: 'new word!', proof: 'said aloud' }] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
          >
            + another job
          </button>

          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">🧾 The nightly tally the child marks</p>
              <input
                value={lesson.quest.tally || ''}
                placeholder="colour one star for every finished job"
                onChange={(e) => set({ quest: { ...lesson.quest!, tally: e.target.value } })}
                className={`${edInput} mt-1 text-[11px]`}
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">🏆 What the week adds up to</p>
              <input
                value={lesson.quest.reward || ''}
                placeholder="the child chooses the bedtime story"
                onChange={(e) => set({ quest: { ...lesson.quest!, reward: e.target.value } })}
                className={`${edInput} mt-1 text-[11px]`}
              />
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">🧑‍✈️ The child’s own job of running the board (5-12)</p>
            <input
              value={lesson.quest.master || ''}
              placeholder="I read every job aloud, choose the order, give the XP and write the proof."
              onChange={(e) => set({ quest: { ...lesson.quest!, master: e.target.value } })}
              className={`${edInput} mt-1 text-[11px]`}
            />
          </div>
        </>
      )}

      {/* Worksheet */}
      {present.worksheet && (
        <>
          <PartHead emoji="🖨" label={KID_LESSON_PART_LABEL.worksheet} onRemove={() => removePart('worksheet')} />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(lesson.worksheet || []).map((w, i) => (
              <EdChip key={i} onRemove={() => set({ worksheet: (lesson.worksheet || []).filter((_, idx) => idx !== i) })}>
                {w}
              </EdChip>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input value={worksheetItem} onChange={(e) => setWorksheetItem(e.target.value)} placeholder="what to print" className={edInput} />
            <button type="button" className={edBtn} onClick={() => { if (worksheetItem.trim()) { set({ worksheet: [...(lesson.worksheet || []), worksheetItem.trim()] }); setWorksheetItem(''); } }}>
              + Add
            </button>
          </div>
        </>
      )}

      {/* Homework */}
      {present.homework && (
        <>
          <PartHead emoji="🏠" label={KID_LESSON_PART_LABEL.homework} onRemove={() => removePart('homework')} />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(lesson.homework || []).map((h, i) => (
              <EdChip key={i} onRemove={() => set({ homework: (lesson.homework || []).filter((_, idx) => idx !== i) })}>
                {h}
              </EdChip>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input value={homeworkItem} onChange={(e) => setHomeworkItem(e.target.value)} placeholder="a 5-minute home task" className={edInput} />
            <button type="button" className={edBtn} onClick={() => { if (homeworkItem.trim()) { set({ homework: [...(lesson.homework || []), homeworkItem.trim()] }); setHomeworkItem(''); } }}>
              + Add
            </button>
          </div>
        </>
      )}

      {/* Notes */}
      {present.caregiverNote && (
        <>
          <PartHead emoji="👨‍👩‍👧" label={KID_LESSON_PART_LABEL.caregiverNote} onRemove={() => removePart('caregiverNote')} />
          <textarea
            value={lesson.caregiverNote || ''}
            onChange={(e) => set({ caregiverNote: e.target.value })}
            rows={2}
            className={`${edInput} mt-1.5`}
          />
        </>
      )}

      {/* The story: the pages, the map every retell is built from, the three retell
          rungs and the hot-seat. */}
      {present.story && lesson.story && (
        <>
          <PartHead emoji="📚" label={KID_LESSON_PART_LABEL.story} onRemove={() => removePart('story')} />
          <p className="mt-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Story pages</p>
          <div className="mt-1 space-y-1.5">
            {lesson.story.pages.map((page, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl border-2 border-slate-200 p-2">
                <input
                  value={page.emoji || ''}
                  onChange={(e) => set({ story: { ...lesson.story!, pages: lesson.story!.pages.map((p, idx) => (idx === i ? { ...p, emoji: e.target.value } : p)) } })}
                  className="w-12 rounded-lg border border-slate-200 px-1 py-1 text-center text-lg"
                />
                <textarea
                  value={page.text}
                  rows={1}
                  onChange={(e) => set({ story: { ...lesson.story!, pages: lesson.story!.pages.map((p, idx) => (idx === i ? { ...p, text: e.target.value } : p)) } })}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm font-bold"
                />
                <button
                  type="button"
                  onClick={() => set({ story: { ...lesson.story!, pages: lesson.story!.pages.filter((_, idx) => idx !== i) } })}
                  className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ story: { ...lesson.story!, pages: [...lesson.story!.pages, { text: 'Another page.', emoji: '📖' }] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
          >
            + another page
          </button>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">The story map — what every retell is built from</p>
          <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
            {(['character', 'setting', 'problem', 'feeling', 'ending'] as const).map((key) => (
              <input
                key={key}
                value={lesson.story!.map?.[key] || ''}
                placeholder={key}
                onChange={(e) => set({ story: { ...lesson.story!, map: { ...lesson.story!.map, [key]: e.target.value } } })}
                className={`${edInput}`}
              />
            ))}
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">The retelling ladder — the same story back, with less help each time</p>
          <div className="mt-1 space-y-1.5">
            {(lesson.story.rungs || []).map((rung, i) => (
              <div key={i} className="rounded-xl border-2 border-emerald-100 bg-emerald-50/40 p-2">
                <input
                  value={rung.with}
                  onChange={(e) => set({ story: { ...lesson.story!, rungs: lesson.story!.rungs!.map((r, idx) => (idx === i ? { ...r, with: e.target.value } : r)) } })}
                  className={`${edInput} text-[11px]`}
                />
                <textarea
                  value={rung.prompt}
                  rows={2}
                  onChange={(e) => set({ story: { ...lesson.story!, rungs: lesson.story!.rungs!.map((r, idx) => (idx === i ? { ...r, prompt: e.target.value } : r)) } })}
                  className={`${edInput} mt-1 text-[11px]`}
                />
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">sentences owed</span>
                  <input
                    type="number"
                    value={rung.talkTarget ?? 0}
                    onChange={(e) => set({ story: { ...lesson.story!, rungs: lesson.story!.rungs!.map((r, idx) => (idx === i ? { ...r, talkTarget: Number(e.target.value) || 0 } : r)) } })}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => set({ story: { ...lesson.story!, rungs: lesson.story!.rungs!.filter((_, idx) => idx !== i) } })}
                    className="ml-auto rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                  >
                    remove rung
                  </button>
                </div>
              </div>
            ))}
          </div>
          {(lesson.story.rungs?.length || 0) < 3 ? (
            <button
              type="button"
              onClick={() => set({ story: { ...lesson.story!, rungs: [...(lesson.story!.rungs || []), { with: 'the pictures only', prompt: 'Same story, less help.', talkTarget: 5 }] } })}
              className="mt-1.5 rounded-full border-2 border-dashed border-emerald-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-600"
            >
              + another retell rung
            </button>
          ) : null}

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">🎭 Hot-seat — you are in role, the child asks</p>
          <div className="mt-1 flex gap-1.5">
            <input
              value={lesson.story.roleplay?.emoji || ''}
              onChange={(e) => set({ story: { ...lesson.story!, roleplay: { character: lesson.story!.roleplay?.character || 'the character', questions: lesson.story!.roleplay?.questions || [], ...lesson.story!.roleplay, emoji: e.target.value } } })}
              className="w-12 rounded-lg border border-slate-200 px-1 py-1 text-center text-lg"
            />
            <input
              value={lesson.story.roleplay?.character || ''}
              placeholder="the character you play"
              onChange={(e) => set({ story: { ...lesson.story!, roleplay: { questions: lesson.story!.roleplay?.questions || [], ...lesson.story!.roleplay, character: e.target.value } } })}
              className={`${edInput} min-w-0 flex-1`}
            />
          </div>
          <div className="mt-1 space-y-1">
            {(lesson.story.roleplay?.questions || []).map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={q}
                  onChange={(e) => set({ story: { ...lesson.story!, roleplay: { character: lesson.story!.roleplay!.character, ...lesson.story!.roleplay, questions: lesson.story!.roleplay!.questions.map((x, idx) => (idx === i ? e.target.value : x)) } } })}
                  className={`${edInput}`}
                />
                <button
                  type="button"
                  onClick={() => set({ story: { ...lesson.story!, roleplay: { character: lesson.story!.roleplay!.character, ...lesson.story!.roleplay, questions: lesson.story!.roleplay!.questions.filter((_, idx) => idx !== i) } } })}
                  className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ story: { ...lesson.story!, roleplay: { character: lesson.story!.roleplay?.character || 'the character', questions: [...(lesson.story!.roleplay?.questions || []), 'Why did you ___?'] } } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-violet-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-500"
          >
            + another question
          </button>
        </>
      )}

      {/* Phonics: the sound, the ladder it is taught in, the pairs that test hearing,
          the made-up words that test decoding, the dictation and the decodable story. */}
      {present.phonics && lesson.phonics && (
        <>
          <PartHead emoji="🔤" label={KID_LESSON_PART_LABEL.phonics} onRemove={() => removePart('phonics')} />
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={lesson.phonics.sound}
              placeholder="/d/ or -at"
              onChange={(e) => set({ phonics: { ...lesson.phonics!, sound: e.target.value } })}
              className="w-28 rounded-lg border-2 border-indigo-100 px-2 py-1 text-lg font-black text-indigo-700"
            />
            <input
              value={lesson.phonics.mouth || ''}
              placeholder="Where the tongue and lips go, in a child’s words"
              onChange={(e) => set({ phonics: { ...lesson.phonics!, mouth: e.target.value } })}
              className={`${edInput} min-w-0 flex-1`}
            />
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            The sound ladder — hear it, say it, find it, blend it, read it, spell it, write it
          </p>
          <div className="mt-1 space-y-1.5">
            {(lesson.phonics.ladder || []).map((rung, i) => (
              <div key={i} className="rounded-xl border-2 border-indigo-100 p-2">
                <div className="flex items-center gap-1.5">
                  <input
                    value={rung.step}
                    onChange={(e) => set({ phonics: { ...lesson.phonics!, ladder: lesson.phonics!.ladder!.map((r, idx) => (idx === i ? { ...r, step: e.target.value } : r)) } })}
                    className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-black uppercase text-indigo-700"
                  />
                  <input
                    type="number"
                    value={rung.talkTarget ?? 0}
                    onChange={(e) => set({ phonics: { ...lesson.phonics!, ladder: lesson.phonics!.ladder!.map((r, idx) => (idx === i ? { ...r, talkTarget: Number(e.target.value) || 0 } : r)) } })}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm font-bold"
                  />
                  <span className="text-[10px] font-black uppercase text-slate-400">said out loud</span>
                  <button
                    type="button"
                    onClick={() => set({ phonics: { ...lesson.phonics!, ladder: lesson.phonics!.ladder!.filter((_, idx) => idx !== i) } })}
                    className="ml-auto rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                  >
                    remove
                  </button>
                </div>
                <textarea
                  value={rung.what}
                  rows={1}
                  onChange={(e) => set({ phonics: { ...lesson.phonics!, ladder: lesson.phonics!.ladder!.map((r, idx) => (idx === i ? { ...r, what: e.target.value } : r)) } })}
                  className={`${edInput} mt-1 text-[11px]`}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ phonics: { ...lesson.phonics!, ladder: [...(lesson.phonics!.ladder || []), { step: 'hear it', what: 'What happens here.', talkTarget: 2 }] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
          >
            + another rung
          </button>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">👂 Hear the difference — the child listens, never guesses from the picture</p>
          <div className="mt-1 space-y-1">
            {(lesson.phonics.minimalPairs || []).map((pair, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={pair.a}
                  onChange={(e) => set({ phonics: { ...lesson.phonics!, minimalPairs: lesson.phonics!.minimalPairs!.map((p, idx) => (idx === i ? { ...p, a: e.target.value } : p)) } })}
                  className={`${edInput} min-w-0 flex-1`}
                />
                <span className="text-[10px] font-black uppercase text-slate-300">vs</span>
                <input
                  value={pair.b}
                  onChange={(e) => set({ phonics: { ...lesson.phonics!, minimalPairs: lesson.phonics!.minimalPairs!.map((p, idx) => (idx === i ? { ...p, b: e.target.value } : p)) } })}
                  className={`${edInput} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  onClick={() => set({ phonics: { ...lesson.phonics!, minimalPairs: lesson.phonics!.minimalPairs!.filter((_, idx) => idx !== i) } })}
                  className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ phonics: { ...lesson.phonics!, minimalPairs: [...(lesson.phonics!.minimalPairs || []), { a: 'cat', b: 'cap' }] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-violet-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-500"
          >
            + another pair
          </button>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">The word lines — real words, made-up words (they test decoding), dictation and the answers</p>
          <div className="mt-1 space-y-1.5">
            <input
              value={(lesson.phonics.realWords || []).join(', ')}
              placeholder="Real words — cat, hat, mat"
              onChange={(e) => set({ phonics: { ...lesson.phonics!, realWords: e.target.value.split(',').map((w) => w.trim()).filter(Boolean) } })}
              className={edInput}
            />
            <input
              value={(lesson.phonics.nonsenseWords || []).join(', ')}
              placeholder="Made-up words — zat, vim (never a real word, never rude in another language)"
              onChange={(e) => set({ phonics: { ...lesson.phonics!, nonsenseWords: e.target.value.split(',').map((w) => w.trim()).filter(Boolean) } })}
              className={edInput}
            />
            <input
              value={(lesson.phonics.dictation || []).join(', ')}
              placeholder="Dictation — the words the child writes"
              onChange={(e) => set({ phonics: { ...lesson.phonics!, dictation: e.target.value.split(',').map((w) => w.trim()).filter(Boolean) } })}
              className={edInput}
            />
            <input
              value={(lesson.phonics.answerKey || []).join(', ')}
              placeholder="The tutor's answers for the dictation"
              onChange={(e) => set({ phonics: { ...lesson.phonics!, answerKey: e.target.value.split(',').map((w) => w.trim()).filter(Boolean) } })}
              className={edInput}
            />
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            📖 The decodable story — built from this sound only, read aloud by the child
          </p>
          <div className="mt-1 space-y-1.5 rounded-xl border-2 border-emerald-100 bg-emerald-50/40 p-2">
            <input
              value={lesson.phonics.decodable?.title || ''}
              placeholder="Story title"
              onChange={(e) => set({ phonics: { ...lesson.phonics!, decodable: { lines: lesson.phonics!.decodable?.lines || [], ...lesson.phonics!.decodable, title: e.target.value } } })}
              className={edInput}
            />
            <textarea
              value={(lesson.phonics.decodable?.lines || []).join('\n')}
              rows={3}
              placeholder="One short sentence per line — only words this sound can decode"
              onChange={(e) => set({ phonics: { ...lesson.phonics!, decodable: { ...lesson.phonics!.decodable, title: lesson.phonics!.decodable?.title, lines: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) } } })}
              className={`${edInput} text-[11px]`}
            />
            <input
              value={(lesson.phonics.decodable?.trickyWords || []).join(', ')}
              placeholder="Two words that do not follow the rule (say them first)"
              onChange={(e) => set({ phonics: { ...lesson.phonics!, decodable: { lines: lesson.phonics!.decodable?.lines || [], ...lesson.phonics!.decodable, trickyWords: e.target.value.split(',').map((w) => w.trim()).filter(Boolean) } } })}
              className={`${edInput} text-[11px]`}
            />
            <input
              value={lesson.phonics.decodable?.retell || ''}
              placeholder="What the child says after reading it"
              onChange={(e) => set({ phonics: { ...lesson.phonics!, decodable: { lines: lesson.phonics!.decodable?.lines || [], ...lesson.phonics!.decodable, retell: e.target.value } } })}
              className={edInput}
            />
            <button
              type="button"
              onClick={() => set({ phonics: { ...lesson.phonics!, decodable: undefined } })}
              className="rounded-full border-2 border-dashed border-rose-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-rose-400"
            >
              ✕ remove the decodable story
            </button>
          </div>
        </>
      )}

      {/* Move & Do (TPR): the command ladder, the ONE new command, the speed play and
          the crown round — the four things that turn a naturally silent method into a
          lesson the child talks all the way through. */}
      {present.movement && lesson.movement && (
        <>
          <PartHead emoji="🤸" label={KID_LESSON_PART_LABEL.movement} onRemove={() => removePart('movement')} />
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              value={lesson.movement.newCommand || ''}
              placeholder="the ONE new command, e.g. stretch"
              onChange={(e) => set({ movement: { ...lesson.movement!, newCommand: e.target.value } })}
              className={`${edInput} min-w-0 flex-1`}
            />
            <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-amber-500">🆕 new today</span>
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            The command ladder — everything they know, plus the one that is new
          </p>
          <div className="mt-1 space-y-1.5">
            {(lesson.movement.commands || []).map((c, i) => (
              <div key={i} className={`rounded-xl border-2 p-2 ${lesson.movement!.newCommand && c.command === lesson.movement!.newCommand ? 'border-amber-300 bg-amber-50/40' : 'border-indigo-100'}`}>
                <div className="flex items-center gap-1.5">
                  <input
                    value={c.emoji || ''}
                    placeholder="🤸"
                    onChange={(e) => set({ movement: { ...lesson.movement!, commands: lesson.movement!.commands!.map((x, idx) => (idx === i ? { ...x, emoji: e.target.value } : x)) } })}
                    className="w-12 rounded-lg border border-slate-200 px-2 py-1 text-center text-lg"
                  />
                  <input
                    value={c.command}
                    onChange={(e) => set({ movement: { ...lesson.movement!, commands: lesson.movement!.commands!.map((x, idx) => (idx === i ? { ...x, command: e.target.value } : x)) } })}
                    className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-sm font-black text-indigo-700"
                  />
                  <button
                    type="button"
                    onClick={() => set({ movement: { ...lesson.movement!, commands: lesson.movement!.commands!.filter((_, idx) => idx !== i) } })}
                    className="ml-auto rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                  >
                    remove
                  </button>
                </div>
                <input
                  value={c.do || ''}
                  placeholder="What you say out loud: “Jump like a frog!”"
                  onChange={(e) => set({ movement: { ...lesson.movement!, commands: lesson.movement!.commands!.map((x, idx) => (idx === i ? { ...x, do: e.target.value } : x)) } })}
                  className={`${edInput} mt-1 text-[11px]`}
                />
                <input
                  value={c.twoStep || ''}
                  placeholder="Two-step chain for the 4s and 5s: “Clap, then jump!”"
                  onChange={(e) => set({ movement: { ...lesson.movement!, commands: lesson.movement!.commands!.map((x, idx) => (idx === i ? { ...x, twoStep: e.target.value } : x)) } })}
                  className={`${edInput} mt-1 text-[11px]`}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ movement: { ...lesson.movement!, commands: [...(lesson.movement!.commands || []), { command: 'spin around', emoji: '🌪️', do: 'Spin around once!' }] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
          >
            + another command
          </button>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">⚡ Same words, four voices — comma separated</p>
          <input
            value={(lesson.movement.speedPlay || []).join(', ')}
            placeholder="Fast! ⚡, Slow like a turtle 🐢, Whisper 🤫, Robot voice 🤖"
            onChange={(e) => set({ movement: { ...lesson.movement!, speedPlay: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })}
            className={`${edInput} mt-1`}
          />

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">👑 The boss round — the commands the CHILD gives you, comma separated</p>
          <input
            value={(lesson.movement.bossRound || []).join(', ')}
            placeholder="jump!, clap!, sit down!"
            onChange={(e) => set({ movement: { ...lesson.movement!, bossRound: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })}
            className={`${edInput} mt-1`}
          />
          <p className="mt-1 text-[10px] font-bold text-slate-400">
            Nothing moves until the child says the command in English — this round is where the talking happens.
          </p>
        </>
      )}

      {/* Routines & Words: the three real moments of the day, the line said the SAME
          way every time, and the say-it-like-this card for a parent who does not speak
          English. The family's side of a routine is the load-bearing part. */}
      {present.routine && lesson.routine && (
        <>
          <PartHead emoji="🚿" label={KID_LESSON_PART_LABEL.routine} onRemove={() => removePart('routine')} />
          <input
            value={lesson.routine.name || ''}
            placeholder="What the family calls it: “Bath, Food and Bed”"
            onChange={(e) => set({ routine: { ...lesson.routine!, name: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            The three real moments — the same words at the same moment, every single day
          </p>
          <div className="mt-1 space-y-1.5">
            {(lesson.routine.moments || []).map((m, i) => (
              <div key={i} className="rounded-xl border-2 border-indigo-100 p-2">
                <div className="flex items-center gap-1.5">
                  <input
                    value={m.emoji || ''}
                    placeholder="🧼"
                    onChange={(e) => set({ routine: { ...lesson.routine!, moments: lesson.routine!.moments!.map((x, idx) => (idx === i ? { ...x, emoji: e.target.value } : x)) } })}
                    className="w-12 rounded-lg border border-slate-200 px-2 py-1 text-center text-lg"
                  />
                  <input
                    value={m.moment}
                    placeholder="wash hands"
                    onChange={(e) => set({ routine: { ...lesson.routine!, moments: lesson.routine!.moments!.map((x, idx) => (idx === i ? { ...x, moment: e.target.value } : x)) } })}
                    className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm font-black text-indigo-700"
                  />
                  <input
                    value={m.photoQuery || ''}
                    placeholder="real photo search: child washing hands"
                    onChange={(e) => set({ routine: { ...lesson.routine!, moments: lesson.routine!.moments!.map((x, idx) => (idx === i ? { ...x, photoQuery: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                  <button
                    type="button"
                    onClick={() => set({ routine: { ...lesson.routine!, moments: lesson.routine!.moments!.filter((_, idx) => idx !== i) } })}
                    className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                  >
                    remove
                  </button>
                </div>
                <input
                  value={m.say}
                  placeholder="The EXACT English: “Wash, wash, wash your hands!”"
                  onChange={(e) => set({ routine: { ...lesson.routine!, moments: lesson.routine!.moments!.map((x, idx) => (idx === i ? { ...x, say: e.target.value } : x)) } })}
                  className={`${edInput} mt-1 text-[11px]`}
                />
                <div className="mt-1 flex gap-1.5">
                  <input
                    value={m.childDoes || ''}
                    placeholder="What the child does"
                    onChange={(e) => set({ routine: { ...lesson.routine!, moments: lesson.routine!.moments!.map((x, idx) => (idx === i ? { ...x, childDoes: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                  <input
                    value={m.childSays || ''}
                    placeholder="What the child says"
                    onChange={(e) => set({ routine: { ...lesson.routine!, moments: lesson.routine!.moments!.map((x, idx) => (idx === i ? { ...x, childSays: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ routine: { ...lesson.routine!, moments: [...(lesson.routine!.moments || []), { moment: 'get dressed', emoji: '👕', say: 'Let’s get dressed!', childSays: '“dressed!”' }] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
          >
            + another moment
          </button>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">🔁 The line said the SAME way at every moment</p>
          <input
            value={lesson.routine.sameLine || ''}
            placeholder="It is TIME!"
            onChange={(e) => set({ routine: { ...lesson.routine!, sameLine: e.target.value } })}
            className={`${edInput} mt-1`}
          />
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">🗣 The half-line the child always finishes</p>
          <input
            value={lesson.routine.fillIn || ''}
            placeholder="wash, wash, wash your ___"
            onChange={(e) => set({ routine: { ...lesson.routine!, fillIn: e.target.value } })}
            className={`${edInput} mt-1`}
          />

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">👨‍👩‍👧 Say-it-like-this — for the grown-up who does not speak English</p>
          <div className="mt-1 space-y-1.5">
            {(lesson.routine.pronunciation || []).map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={p.word}
                  placeholder="wash"
                  onChange={(e) => set({ routine: { ...lesson.routine!, pronunciation: lesson.routine!.pronunciation!.map((x, idx) => (idx === i ? { ...x, word: e.target.value } : x)) } })}
                  className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm font-black text-indigo-700"
                />
                <input
                  value={p.hint || ''}
                  placeholder="“wosh” — rhymes with “posh”"
                  onChange={(e) => set({ routine: { ...lesson.routine!, pronunciation: lesson.routine!.pronunciation!.map((x, idx) => (idx === i ? { ...x, hint: e.target.value } : x)) } })}
                  className={`${edInput} min-w-0 flex-1 text-[11px]`}
                />
                <button
                  type="button"
                  onClick={() => set({ routine: { ...lesson.routine!, pronunciation: lesson.routine!.pronunciation!.filter((_, idx) => idx !== i) } })}
                  className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ routine: { ...lesson.routine!, pronunciation: [...(lesson.routine!.pronunciation || []), { word: 'sleepy', hint: '“SLEE-pee” — long first, short second' }] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
          >
            + another word
          </button>
        </>
      )}

      {/* Circle Time: the whole ritual written down, because the sameness IS the
          method — the hello and the goodbye songs word for word, the pictures the
          child points at, the wait line said before every reveal, and the ONE
          surprise. Change any of these next week and it is a different lesson. */}
      {present.circle && lesson.circle && (
        <>
          <PartHead emoji="🔄" label={KID_LESSON_PART_LABEL.circle} onRemove={() => removePart('circle')} />
          <input
            value={lesson.circle.name || ''}
            placeholder="What the family calls it: “The Hello Circle”"
            onChange={(e) => set({ circle: { ...lesson.circle!, name: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            👋 The hello song — the same words at the start of every lesson
          </p>
          <div className="mt-1 space-y-1.5">
            {(lesson.circle.hello || []).map((line, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={line}
                  placeholder="Hello, hello, hello to you!"
                  onChange={(e) => set({ circle: { ...lesson.circle!, hello: lesson.circle!.hello!.map((x, idx) => (idx === i ? e.target.value : x)) } })}
                  className={`${edInput} min-w-0 flex-1 text-[11px]`}
                />
                <button
                  type="button"
                  onClick={() => set({ circle: { ...lesson.circle!, hello: lesson.circle!.hello!.filter((_, idx) => idx !== i) } })}
                  className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ circle: { ...lesson.circle!, hello: [...(lesson.circle!.hello || []), 'Hello, hello, hello to you!'] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
          >
            + another hello line
          </button>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            👋 The goodbye — the same words at the end of every lesson
          </p>
          <div className="mt-1 space-y-1.5">
            {(lesson.circle.goodbye || []).map((line, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={line}
                  placeholder="Goodbye, goodbye, see you soon!"
                  onChange={(e) => set({ circle: { ...lesson.circle!, goodbye: lesson.circle!.goodbye!.map((x, idx) => (idx === i ? e.target.value : x)) } })}
                  className={`${edInput} min-w-0 flex-1 text-[11px]`}
                />
                <button
                  type="button"
                  onClick={() => set({ circle: { ...lesson.circle!, goodbye: lesson.circle!.goodbye!.filter((_, idx) => idx !== i) } })}
                  className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ circle: { ...lesson.circle!, goodbye: [...(lesson.circle!.goodbye || []), 'Goodbye, goodbye, see you soon!'] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
          >
            + another goodbye line
          </button>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            👉 The big pictures — the child POINTS, the grown-up says the word back
          </p>
          <div className="mt-1 space-y-1.5">
            {(lesson.circle.check || []).map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={c.emoji || ''}
                  placeholder="☀️"
                  onChange={(e) => set({ circle: { ...lesson.circle!, check: lesson.circle!.check!.map((x, idx) => (idx === i ? { ...x, emoji: e.target.value } : x)) } })}
                  className="w-12 rounded-lg border border-slate-200 px-2 py-1 text-center text-lg"
                />
                <input
                  value={c.look}
                  placeholder="sunny"
                  onChange={(e) => set({ circle: { ...lesson.circle!, check: lesson.circle!.check!.map((x, idx) => (idx === i ? { ...x, look: e.target.value } : x)) } })}
                  className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm font-black text-indigo-700"
                />
                <input
                  value={c.childSays || ''}
                  placeholder="What the child says — “sunny!”"
                  onChange={(e) => set({ circle: { ...lesson.circle!, check: lesson.circle!.check!.map((x, idx) => (idx === i ? { ...x, childSays: e.target.value } : x)) } })}
                  className={`${edInput} min-w-0 flex-1 text-[11px]`}
                />
                <button
                  type="button"
                  onClick={() => set({ circle: { ...lesson.circle!, check: lesson.circle!.check!.filter((_, idx) => idx !== i) } })}
                  className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ circle: { ...lesson.circle!, check: [...(lesson.circle!.check || []), { look: 'windy', emoji: '🌬️', childSays: 'windy!' }] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
          >
            + another picture
          </button>

          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">🪄 The same wait, before every reveal</p>
              <input
                value={lesson.circle.waitLine || ''}
                placeholder="Tap it... tap it... OPEN!"
                onChange={(e) => set({ circle: { ...lesson.circle!, waitLine: e.target.value } })}
                className={`${edInput} mt-1 text-[11px]`}
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">🎁 The ONE surprise in the box</p>
              <input
                value={lesson.circle.surprise || ''}
                placeholder="duck"
                onChange={(e) => set({ circle: { ...lesson.circle!, surprise: e.target.value } })}
                className={`${edInput} mt-1 text-[11px]`}
              />
            </div>
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            🗣 The check-in questions — for 5-12, where the child asks them
          </p>
          <div className="mt-1 space-y-1.5">
            {(lesson.circle.ask || []).map((q, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={q}
                  placeholder="How are you today?"
                  onChange={(e) => set({ circle: { ...lesson.circle!, ask: lesson.circle!.ask!.map((x, idx) => (idx === i ? e.target.value : x)) } })}
                  className={`${edInput} min-w-0 flex-1 text-[11px]`}
                />
                <button
                  type="button"
                  onClick={() => set({ circle: { ...lesson.circle!, ask: lesson.circle!.ask!.filter((_, idx) => idx !== i) } })}
                  className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ circle: { ...lesson.circle!, ask: [...(lesson.circle!.ask || []), 'What did you do yesterday?'] } })}
            className="mt-1.5 rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
          >
            + another question
          </button>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">🗓 The sentence the child closes with</p>
          <input
            value={lesson.circle.nextTime || ''}
            placeholder="Before next lesson I will look at the calendar."
            onChange={(e) => set({ circle: { ...lesson.circle!, nextTime: e.target.value } })}
            className={`${edInput} mt-1 text-[11px]`}
          />
        </>
      )}

      {/* Move & Tell a Story: the story told beat by beat, where every beat is an
          action the child performs, the echo line that always comes back, the map
          they act the retell from, and the beat where the child decides. */}
      {present.storyWalk && lesson.storyWalk && (
        <>
          <PartHead emoji="🤸" label={KID_LESSON_PART_LABEL.storyWalk} onRemove={() => removePart('storyWalk')} />
          <input
            value={lesson.storyWalk.title || ''}
            placeholder="What the story is called: “Jump Like a Frog”"
            onChange={(e) => set({ storyWalk: { ...lesson.storyWalk!, title: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            The story, beat by beat — every beat is an action the child does
          </p>
          <div className="mt-1 space-y-1.5">
            {(lesson.storyWalk.beats || []).map((b, i) => (
              <div key={i} className="rounded-xl border-2 border-indigo-100 p-2">
                <div className="flex items-center gap-1.5">
                  <input
                    value={b.emoji || ''}
                    placeholder="🐸"
                    onChange={(e) => set({ storyWalk: { ...lesson.storyWalk!, beats: lesson.storyWalk!.beats!.map((x, idx) => (idx === i ? { ...x, emoji: e.target.value } : x)) } })}
                    className="w-12 rounded-lg border border-slate-200 px-2 py-1 text-center text-lg"
                  />
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-indigo-400">beat {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => set({ storyWalk: { ...lesson.storyWalk!, beats: lesson.storyWalk!.beats!.filter((_, idx) => idx !== i) } })}
                    className="ml-auto shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                  >
                    remove
                  </button>
                </div>
                <input
                  value={b.line}
                  placeholder="The sentence you tell: “The little frog is sad. He lost his hop!”"
                  onChange={(e) => set({ storyWalk: { ...lesson.storyWalk!, beats: lesson.storyWalk!.beats!.map((x, idx) => (idx === i ? { ...x, line: e.target.value } : x)) } })}
                  className={`${edInput} mt-1 text-[11px]`}
                />
                <div className="mt-1 flex gap-1.5">
                  <input
                    value={b.action || ''}
                    placeholder="What the child DOES on it"
                    onChange={(e) => set({ storyWalk: { ...lesson.storyWalk!, beats: lesson.storyWalk!.beats!.map((x, idx) => (idx === i ? { ...x, action: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                  <input
                    value={b.say || ''}
                    placeholder="What they say: “Hop, hop, hop!”"
                    onChange={(e) => set({ storyWalk: { ...lesson.storyWalk!, beats: lesson.storyWalk!.beats!.map((x, idx) => (idx === i ? { ...x, say: e.target.value } : x)) } })}
                    className={`${edInput} min-w-0 flex-1 text-[11px]`}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set({ storyWalk: { ...lesson.storyWalk!, beats: [...(lesson.storyWalk!.beats || []), { line: 'What happens next?', action: 'Do it together.', emoji: '✨' }] } })}
              className="rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
            >
              + another beat
            </button>
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            The echo line — it comes back in every beat, so the child always has a turn
          </p>
          <input
            value={lesson.storyWalk.echo || ''}
            placeholder="“Hop, hop, hop!”"
            onChange={(e) => set({ storyWalk: { ...lesson.storyWalk!, echo: e.target.value } })}
            className={`${edInput} mt-1`}
          />

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            The story map — the pictures the child acts the retell from
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(lesson.storyWalk.map || []).map((piece, i) => (
              <div key={i} className="flex items-center gap-1 rounded-lg border border-slate-200 px-1.5 py-1">
                <input
                  value={piece}
                  onChange={(e) => set({ storyWalk: { ...lesson.storyWalk!, map: lesson.storyWalk!.map!.map((x, idx) => (idx === i ? e.target.value : x)) } })}
                  className="w-28 text-[11px] font-bold text-indigo-700 outline-none"
                />
                <button
                  type="button"
                  onClick={() => set({ storyWalk: { ...lesson.storyWalk!, map: lesson.storyWalk!.map!.filter((_, idx) => idx !== i) } })}
                  className="rounded bg-rose-50 px-1 text-[10px] font-black text-rose-500"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set({ storyWalk: { ...lesson.storyWalk!, map: [...(lesson.storyWalk!.map || []), '✨ more'] } })}
              className="rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
            >
              + a picture
            </button>
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            The beat where the CHILD decides — their first own sentence
          </p>
          <input
            value={lesson.storyWalk.choose || ''}
            placeholder="“Where does the frog hop? You say it: Hop to the ___!”"
            onChange={(e) => set({ storyWalk: { ...lesson.storyWalk!, choose: e.target.value } })}
            className={`${edInput} mt-1`}
          />

          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Two-step commands — for the 5-12 version, where the whole sentence has to be held
          </p>
          <div className="mt-1 space-y-1.5">
            {(lesson.storyWalk.chain || []).map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={c}
                  onChange={(e) => set({ storyWalk: { ...lesson.storyWalk!, chain: lesson.storyWalk!.chain!.map((x, idx) => (idx === i ? e.target.value : x)) } })}
                  className={`${edInput} min-w-0 flex-1 text-[11px]`}
                />
                <button
                  type="button"
                  onClick={() => set({ storyWalk: { ...lesson.storyWalk!, chain: lesson.storyWalk!.chain!.filter((_, idx) => idx !== i) } })}
                  className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500"
                >
                  remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set({ storyWalk: { ...lesson.storyWalk!, chain: [...(lesson.storyWalk!.chain || []), 'Creep to the door, then push it.'] } })}
              className="rounded-full border-2 border-dashed border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-500"
            >
              + a two-step command
            </button>
          </div>
        </>
      )}

      {/* The real scene: one photograph, one clip, one listening job. */}
      {present.scene && lesson.scene && (
        <>
          <PartHead emoji="📷" label={KID_LESSON_PART_LABEL.scene} onRemove={() => removePart('scene')} />
          <input
            value={lesson.scene.title}
            onChange={(e) => set({ scene: { ...lesson.scene!, title: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />
          <input
            value={lesson.scene.photoQuery || ''}
            placeholder="Real-photo search, e.g. duck on a pond"
            onChange={(e) => set({ scene: { ...lesson.scene!, photoQuery: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />
          <input
            value={lesson.scene.clipTitle || ''}
            placeholder="What the clip is"
            onChange={(e) => set({ scene: { ...lesson.scene!, clipTitle: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />
          <input
            value={lesson.scene.clipUrl || ''}
            placeholder="Clip link, or a search page for it"
            onChange={(e) => set({ scene: { ...lesson.scene!, clipUrl: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />
          <input
            value={lesson.scene.listenFor || ''}
            placeholder="What the child listens for while it plays"
            onChange={(e) => set({ scene: { ...lesson.scene!, listenFor: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />
        </>
      )}

      {/* The real-world mission: the thing that leaves the screen. */}
      {present.mission && lesson.mission && (
        <>
          <PartHead emoji="🌍" label={KID_LESSON_PART_LABEL.mission} onRemove={() => removePart('mission')} />
          <input
            value={lesson.mission.title}
            onChange={(e) => set({ mission: { ...lesson.mission!, title: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />
          <textarea
            value={lesson.mission.realWorld}
            onChange={(e) => set({ mission: { ...lesson.mission!, realWorld: e.target.value } })}
            rows={2}
            className={`${edInput} mt-1.5`}
          />
          <input
            value={lesson.mission.sayIt}
            onChange={(e) => set({ mission: { ...lesson.mission!, sayIt: e.target.value } })}
            className={`${edInput} mt-1.5`}
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(lesson.mission.steps || []).map((s, i) => (
              <EdChip key={i} onRemove={() => set({ mission: { ...lesson.mission!, steps: (lesson.mission!.steps || []).filter((_, idx) => idx !== i) } })}>
                {s}
              </EdChip>
            ))}
          </div>
        </>
      )}

      {/* The clock, the breaks and the ending. */}
      {present.run && lesson.run && (
        <>
          <PartHead emoji="⏱️" label={KID_LESSON_PART_LABEL.run} onRemove={() => removePart('run')} />
          <label className="mt-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">
            Whole session in minutes
          </label>
          <input
            type="number"
            value={lesson.run.targetMinutes ?? 30}
            onChange={(e) => set({ run: { ...lesson.run!, targetMinutes: Math.max(1, Number(e.target.value) || 30) } })}
            className={`${edInput} mt-1`}
          />
          {(['brainBreaks', 'exitTicket'] as const).map((key) => (
            <div key={key}>
              <label className="mt-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                {key === 'brainBreaks' ? 'Brain breaks' : 'Exit ticket — what the child can now say'}
              </label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(lesson.run![key] || []).map((v, i) => (
                  <EdChip key={i} onRemove={() => set({ run: { ...lesson.run!, [key]: (lesson.run![key] || []).filter((_, idx) => idx !== i) } })}>
                    {v}
                  </EdChip>
                ))}
              </div>
            </div>
          ))}
          <label className="mt-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">Next time starts with</label>
          <input
            value={lesson.run.nextTime || ''}
            onChange={(e) => set({ run: { ...lesson.run!, nextTime: e.target.value } })}
            className={`${edInput} mt-1`}
          />
        </>
      )}
      <PartHead emoji="🍎" label="Note for the tutor" onRemove={() => set({ teacherNote: undefined })} />
      <textarea
        value={lesson.teacherNote || ''}
        onChange={(e) => set({ teacherNote: e.target.value })}
        rows={2}
        className={`${edInput} mt-1.5`}
      />
    </div>
  );
};

export default KidsLessonCreator;
