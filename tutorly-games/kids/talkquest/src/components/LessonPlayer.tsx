'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SupportedLanguage } from '@/types/theme';
import { buildLesson, Lesson } from '@/data/lessonEngine';
import { AudioManager } from '@/lib/audio';
import { WordPic } from '@/components/WordPic';
import {
  ArrowLeft, Volume2, Check, X, Star, Mic, ClipboardList,
} from 'lucide-react';

type Stage = 'warmup' | 'vocab' | 'ccq' | 'quiz' | 'match' | 'story' | 'speak';

const STAGES: { id: Stage; label: string; emoji: string }[] = [
  { id: 'warmup', label: 'Hello', emoji: '👋' },
  { id: 'vocab', label: 'Words', emoji: '🃏' },
  { id: 'ccq', label: 'Check', emoji: '❓' },
  { id: 'quiz', label: 'Quiz', emoji: '🎯' },
  { id: 'match', label: 'Match', emoji: '🧩' },
  { id: 'story', label: 'Story', emoji: '📖' },
  { id: 'speak', label: 'Talk', emoji: '🎤' },
];

interface Props {
  slug: string;
  lang: SupportedLanguage;
  onExit: () => void;
  onRewardStar: () => void;
  /** Opens the ready-made timed plan for this same topic. */
  onOpenPlan?: (slug: string) => void;
}

export const LessonPlayer: React.FC<Props> = ({ slug, lang, onExit, onRewardStar, onOpenPlan }) => {
  const lesson: Lesson = useMemo(() => buildLesson(slug), [slug]);
  const [stage, setStage] = useState<Stage>('warmup');
  const [wordIdx, setWordIdx] = useState(0);
  const [ccqIdx, setCcqIdx] = useState(0);
  const [ccqPick, setCcqPick] = useState<number | null>(null);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);
  const [compIdx, setCompIdx] = useState(0);
  const [compPick, setCompPick] = useState<number | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [pickedLeft, setPickedLeft] = useState<string | null>(null);

  const say = (t: string, l: SupportedLanguage | 'en' = 'en') => {
    AudioManager.playSound('select');
    AudioManager.speak(t, l);
  };

  const stageIndex = STAGES.findIndex(s => s.id === stage);
  const goNextStage = () => {
    const next = STAGES[Math.min(STAGES.length - 1, stageIndex + 1)];
    AudioManager.playSound('pop');
    setStage(next.id);
  };

  const w = lesson.words[wordIdx];
  const ccqW = lesson.words[ccqIdx];
  const q = lesson.quiz[quizIdx];
  const page = lesson.story.pages[pageIdx];
  const comp = lesson.story.comprehension[compIdx];
  const shuffledRight = useMemo(() => [...lesson.matching].sort(() => Math.random() - 0.5), [lesson.matching]);

  return (
    <div className="min-h-[70vh]">
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button onClick={onExit} className="btn-3d flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white font-black text-slate-700 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2 card-3d min-w-0">
          <WordPic emoji={lesson.icon} size={36} />
          <div className="min-w-0">
            <p className="text-lg font-black text-slate-900 truncate" style={{ fontFamily: 'var(--font-display), Fredoka, sans-serif' }}>{lesson.name}</p>
            <p className="text-[11px] font-bold text-slate-500">{lesson.words.length} words · step {stageIndex + 1}/7</p>
          </div>
        </div>
        <div className="flex-1" />
        {onOpenPlan && (
          <button onClick={() => { AudioManager.playSound('select'); onOpenPlan(slug); }}
            title="The step-by-step teaching plan for this topic"
            className="btn-3d flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-black text-sm cursor-pointer">
            <ClipboardList className="w-4 h-4" /> <span className="hidden sm:inline">Lesson plan</span>
          </button>
        )}
        <div className="flex flex-wrap gap-1">
          {STAGES.map((s, i) => (
            <button key={s.id} onClick={() => { AudioManager.playSound('select'); setStage(s.id); }}
              className={`px-3 py-2 rounded-2xl text-xs font-black cursor-pointer transition ${
                stage === s.id ? 'bg-slate-900 text-white' : i < stageIndex ? 'bg-emerald-200 text-emerald-900' : 'bg-white text-slate-500'
              }`}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/*
        A `key` on its own, NOT an `<AnimatePresence mode="wait">`.

        The player already sits inside the page's AnimatePresence, and a nested
        `wait` makes the outgoing stage hold the frame until its exit finishes —
        which never happens while the parent is animating. Tapping steps quickly
        (Words → Story) left the whole step area blank. Re-keying the div remounts
        it, so the fade-in still plays and nothing can get stuck.
      */}
      <div key={stage}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {stage === 'warmup' && (
            <div className="max-w-3xl mx-auto bg-white rounded-[2rem] card-3d p-8 md:p-12 text-center">
              <WordPic emoji={lesson.icon} size={96} />
              <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-amber-600">Today we talk</p>
              <h2 className="mt-2 text-3xl md:text-4xl font-black text-slate-900 leading-snug" style={{ fontFamily: 'var(--font-display), Fredoka, sans-serif' }}>
                {lesson.name}
              </h2>
              <p className="mt-3 text-lg font-bold text-slate-600">{lesson.objective}</p>
              <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-3xl p-6">
                <p className="text-2xl font-black text-slate-800 leading-snug">“{lesson.warmUp}”</p>
                <button onClick={() => say(lesson.warmUp)} className="btn-3d mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-black cursor-pointer">
                  <Volume2 className="w-5 h-5" /> Hear it
                </button>
              </div>
              <ul className="mt-6 text-left space-y-1.5 bg-sky-50 rounded-3xl p-5">
                {lesson.tutorNotes.map((n, i) => <li key={i} className="text-sm font-bold text-slate-600">✦ {n}</li>)}
              </ul>
              <button onClick={goNextStage} className="btn-3d mt-8 px-8 py-4 rounded-2xl bg-emerald-400 text-slate-900 font-black text-lg cursor-pointer">
                Let’s go →
              </button>
            </div>
          )}

          {stage === 'vocab' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3 bg-white rounded-[2rem] card-3d p-8 text-center">
                <WordPic emoji={w.emoji} label={w.english} size={140} />
                <h2 className="mt-3 text-5xl font-black text-slate-900" style={{ fontFamily: 'var(--font-display), Fredoka, sans-serif' }}>{w.english}</h2>
                {lang !== 'en' && <p className="text-2xl font-black text-sky-700 mt-1">{w.tr[lang]}</p>}
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={() => say(w.english)} className="btn-3d px-4 py-2.5 rounded-2xl bg-slate-900 text-white font-black text-sm cursor-pointer inline-flex items-center gap-2">
                    <Volume2 className="w-4 h-4" /> English
                  </button>
                  {lang !== 'en' && (
                    <button onClick={() => say(w.tr[lang], lang)} className="btn-3d px-4 py-2.5 rounded-2xl bg-sky-400 text-slate-900 font-black text-sm cursor-pointer">
                      Other language
                    </button>
                  )}
                </div>

                <div className="mt-6 text-left space-y-3">
                  <div className="bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Say these — three different jobs</p>
                    {(w.sentences?.length ? w.sentences : [w.sentence]).map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-orange-300 text-slate-900 font-black text-sm flex items-center justify-center">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-lg font-black text-slate-800 leading-snug">{s}</p>
                          <button onClick={() => say(s)} className="mt-1 text-xs font-black text-orange-700 cursor-pointer">🔊 Hear</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-violet-50 border-2 border-violet-100 rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-500">Two chants — pick a voice</p>
                    {(w.chants?.length ? w.chants : [w.chant]).map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xl">{i === 0 ? '🎵' : '🥁'}</span>
                        <div className="flex-1">
                          <p className="text-base font-black text-violet-900 leading-snug">{c}</p>
                          <button onClick={() => say(c)} className="mt-1 text-xs font-black text-violet-700 cursor-pointer">🔊 Sing</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Talk more</p>
                    <p className="text-base font-bold text-slate-700 mt-1">{w.fact}</p>
                    <p className="text-base font-black text-emerald-800 mt-2">{w.talk}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <button disabled={wordIdx === 0} onClick={() => setWordIdx(i => i - 1)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 disabled:opacity-40 font-black text-sm cursor-pointer">← Back</button>
                  <span className="text-sm font-black text-slate-500">{wordIdx + 1} / {lesson.words.length}</span>
                  {wordIdx < lesson.words.length - 1 ? (
                    <button onClick={() => { AudioManager.playSound('pop'); setWordIdx(i => i + 1); }}
                      className="btn-3d px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-black text-sm cursor-pointer">Next word →</button>
                  ) : (
                    <button onClick={goNextStage} className="btn-3d px-5 py-2.5 rounded-2xl bg-emerald-400 text-slate-900 font-black text-sm cursor-pointer">Check questions →</button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-[2rem] card-3d p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Tap a word</p>
                <div className="grid grid-cols-3 gap-2 max-h-[560px] overflow-y-auto">
                  {lesson.words.map((it, i) => (
                    <button key={it.id} onClick={() => { AudioManager.playSound('select'); setWordIdx(i); }}
                      className={`p-3 rounded-2xl border-2 text-center cursor-pointer ${i === wordIdx ? 'border-slate-900 bg-amber-100' : 'border-slate-100 bg-slate-50 hover:border-amber-300'}`}>
                      <WordPic emoji={it.emoji} size={40} />
                      <div className="text-[11px] font-black truncate mt-1">{it.english}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stage === 'ccq' && (
            <div className="max-w-3xl mx-auto bg-white rounded-[2rem] card-3d p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 text-center mb-3">Check {ccqIdx + 1} / {lesson.words.length}</p>
              <div className="text-center mb-6">
                <WordPic emoji={ccqW.emoji} size={100} />
                <h2 className="mt-3 text-2xl md:text-3xl font-black text-slate-900 leading-snug">{ccqW.ccq.q}</h2>
                <button onClick={() => say(ccqW.ccq.q)} className="mt-3 font-black text-sky-700 cursor-pointer">🔊 Hear the question</button>
              </div>
              <div className="grid gap-3 mb-4">
                {ccqW.ccq.options.map((o, i) => {
                  const chosen = ccqPick === i; const right = i === ccqW.ccq.correct;
                  const cls = ccqPick === null ? 'bg-slate-50 border-slate-200 hover:border-amber-400'
                    : right ? 'bg-emerald-100 border-emerald-400' : chosen ? 'bg-rose-100 border-rose-300' : 'bg-slate-50 border-slate-200 opacity-60';
                  return (
                    <button key={i} disabled={ccqPick !== null}
                      onClick={() => { setCcqPick(i); if (right) { AudioManager.playSound('correct'); onRewardStar(); } else AudioManager.playSound('wrong'); }}
                      className={`p-5 rounded-2xl border-2 text-left text-lg font-black text-slate-800 cursor-pointer flex items-center justify-between ${cls}`}>
                      {o}
                      {ccqPick !== null && right && <Check className="w-6 h-6 text-emerald-600" />}
                      {ccqPick !== null && chosen && !right && <X className="w-6 h-6 text-rose-500" />}
                    </button>
                  );
                })}
              </div>
              {ccqPick !== null && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-4">
                  <p className="font-bold text-slate-800">{ccqW.ccq.why}</p>
                  <p className="mt-2 text-base font-black text-amber-800">🗣️ {ccqW.ccq.sayIt}</p>
                </div>
              )}
              <div className="flex justify-between">
                <button disabled={ccqIdx === 0} onClick={() => { setCcqIdx(i => i - 1); setCcqPick(null); }}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 disabled:opacity-40 font-black text-sm cursor-pointer">← Back</button>
                {ccqIdx < lesson.words.length - 1 ? (
                  <button onClick={() => { AudioManager.playSound('pop'); setCcqIdx(i => i + 1); setCcqPick(null); }}
                    className="btn-3d px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-black text-sm cursor-pointer">Next →</button>
                ) : (
                  <button onClick={goNextStage} className="btn-3d px-5 py-2.5 rounded-2xl bg-emerald-400 text-slate-900 font-black text-sm cursor-pointer">Quiz →</button>
                )}
              </div>
            </div>
          )}

          {stage === 'quiz' && (
            <div className="max-w-3xl mx-auto bg-white rounded-[2rem] card-3d p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Quiz {quizIdx + 1}/{lesson.quiz.length}</span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">{quizScore} right</span>
              </div>
              <div className="text-center mb-6">
                <WordPic emoji={q.emoji || '🔊'} size={90} />
                <h2 className="mt-3 text-2xl font-black text-slate-900">{q.prompt}</h2>
                {q.kind === 'audio' && (
                  <button onClick={() => say(q.options[q.correct])}
                    className="btn-3d mt-3 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-violet-500 text-white font-black cursor-pointer">
                    <Volume2 className="w-5 h-5" /> Play
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {q.options.map((o, i) => {
                  const chosen = quizPick === i; const right = i === q.correct;
                  const cls = quizPick === null ? 'bg-slate-50 border-slate-200 hover:border-amber-400'
                    : right ? 'bg-emerald-100 border-emerald-400' : chosen ? 'bg-rose-100 border-rose-300' : 'bg-slate-50 opacity-50';
                  return (
                    <button key={i} disabled={quizPick !== null}
                      onClick={() => { setQuizPick(i); if (right) { AudioManager.playSound('correct'); setQuizScore(s => s + 1); onRewardStar(); } else AudioManager.playSound('wrong'); }}
                      className={`p-5 rounded-2xl border-2 text-lg font-black text-slate-800 cursor-pointer ${cls}`}>{o}</button>
                  );
                })}
              </div>
              {quizPick !== null && <p className="mb-4 font-black text-amber-800">🗣️ {q.speakAfter}</p>}
              <div className="flex justify-end">
                {quizIdx < lesson.quiz.length - 1 ? (
                  <button disabled={quizPick === null} onClick={() => { AudioManager.playSound('pop'); setQuizIdx(i => i + 1); setQuizPick(null); }}
                    className="btn-3d px-5 py-2.5 rounded-2xl bg-slate-900 disabled:opacity-40 text-white font-black text-sm cursor-pointer">Next →</button>
                ) : (
                  <button onClick={goNextStage} className="btn-3d px-5 py-2.5 rounded-2xl bg-emerald-400 text-slate-900 font-black text-sm cursor-pointer">Match →</button>
                )}
              </div>
            </div>
          )}

          {stage === 'match' && (
            <div className="max-w-4xl mx-auto bg-white rounded-[2rem] card-3d p-8">
              <h2 className="text-2xl font-black text-center text-slate-900">Tap a picture, then tap its word</h2>
              <p className="text-center font-bold text-slate-500 mb-6">Say the word out loud every time.</p>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  {lesson.matching.map(m => {
                    const done = matched.includes(m.left);
                    return (
                      <button key={m.left} disabled={done}
                        onClick={() => { AudioManager.playSound('select'); setPickedLeft(m.left); say(m.left); }}
                        className={`w-full p-4 rounded-2xl border-2 flex items-center gap-3 font-black text-lg cursor-pointer ${
                          done ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : pickedLeft === m.left ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-200'
                        }`}>
                        <WordPic emoji={m.emoji} size={40} />
                        {done && <Check className="w-5 h-5 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {shuffledRight.map(m => {
                    const done = matched.includes(m.left);
                    return (
                      <button key={m.left} disabled={done}
                        onClick={() => {
                          if (!pickedLeft) return;
                          if (pickedLeft === m.left) { AudioManager.playSound('correct'); setMatched(v => [...v, m.left]); onRewardStar(); }
                          else AudioManager.playSound('wrong');
                          setPickedLeft(null);
                        }}
                        className={`w-full p-4 rounded-2xl border-2 font-black text-lg cursor-pointer ${
                          done ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200'
                        }`}>{m.right}</button>
                    );
                  })}
                </div>
              </div>
              {matched.length === lesson.matching.length && (
                <div className="mt-6 text-center">
                  <p className="text-xl font-black text-emerald-700 mb-3">All matched!</p>
                  <button onClick={goNextStage} className="btn-3d px-6 py-3 rounded-2xl bg-emerald-400 text-slate-900 font-black cursor-pointer">Story time →</button>
                </div>
              )}
            </div>
          )}

          {stage === 'story' && (
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="bg-white rounded-[2rem] card-3d p-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 text-center">Story book</p>
                <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-6" style={{ fontFamily: 'var(--font-display), Fredoka, sans-serif' }}>{lesson.story.title}</h2>
                <div className="bg-amber-50 rounded-3xl p-8 text-center border-2 border-amber-100">
                  <WordPic emoji={page.art} size={88} />
                  <p className="mt-5 text-xl md:text-2xl font-bold text-slate-800 leading-relaxed">{page.text}</p>
                  <button onClick={() => say(page.text)} className="btn-3d mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-black cursor-pointer">
                    <Volume2 className="w-5 h-5" /> Read aloud
                  </button>
                </div>
                <div className="mt-5 bg-sky-50 border-2 border-sky-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">Talk about the page</p>
                  <p className="text-lg font-black text-slate-800 mt-1">{page.ask}</p>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <button disabled={pageIdx === 0} onClick={() => setPageIdx(i => i - 1)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 disabled:opacity-40 font-black text-sm cursor-pointer">← Page</button>
                  <span className="text-sm font-black text-slate-500">{pageIdx + 1} / {lesson.story.pages.length}</span>
                  <button disabled={pageIdx === lesson.story.pages.length - 1} onClick={() => { AudioManager.playSound('pop'); setPageIdx(i => i + 1); }}
                    className="btn-3d px-4 py-2.5 rounded-2xl bg-slate-900 disabled:opacity-40 text-white font-black text-sm cursor-pointer">Page →</button>
                </div>
              </div>

              {pageIdx === lesson.story.pages.length - 1 && (
                <div className="bg-white rounded-[2rem] card-3d p-8">
                  <h3 className="text-xl font-black text-slate-900">Did you get it?</h3>
                  <p className="text-sm font-bold text-slate-500 mb-4">Question {compIdx + 1} / {lesson.story.comprehension.length}</p>
                  <p className="text-xl font-black text-slate-800 mb-4">{comp.q}</p>
                  <div className="grid gap-3 mb-4">
                    {comp.options.map((o, i) => {
                      const chosen = compPick === i; const right = i === comp.correct;
                      const cls = compPick === null ? 'bg-slate-50 border-slate-200'
                        : right ? 'bg-emerald-100 border-emerald-400' : chosen ? 'bg-rose-100 border-rose-300' : 'bg-slate-50 opacity-50';
                      return (
                        <button key={i} disabled={compPick !== null}
                          onClick={() => { setCompPick(i); if (right) { AudioManager.playSound('correct'); onRewardStar(); } else AudioManager.playSound('wrong'); }}
                          className={`p-4 rounded-2xl border-2 text-left text-lg font-black cursor-pointer ${cls}`}>{o}</button>
                      );
                    })}
                  </div>
                  {compPick !== null && <p className="mb-4 font-black text-amber-800">🗣️ {comp.discuss}</p>}
                  <div className="flex justify-end">
                    {compIdx < lesson.story.comprehension.length - 1 ? (
                      <button disabled={compPick === null} onClick={() => { setCompIdx(i => i + 1); setCompPick(null); }}
                        className="btn-3d px-5 py-2.5 rounded-2xl bg-slate-900 disabled:opacity-40 text-white font-black text-sm cursor-pointer">Next →</button>
                    ) : (
                      <button onClick={goNextStage} className="btn-3d px-5 py-2.5 rounded-2xl bg-emerald-400 text-slate-900 font-black text-sm cursor-pointer">Speaking →</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {stage === 'speak' && (
            <div className="max-w-3xl mx-auto bg-white rounded-[2rem] card-3d p-8">
              <div className="text-center mb-6">
                <Mic className="w-12 h-12 mx-auto text-rose-500 mb-2" />
                <h2 className="text-2xl font-black text-slate-900">Your turn to talk</h2>
                <p className="font-bold text-slate-500">Five jobs. Do them out loud.</p>
              </div>
              <div className="space-y-3 mb-6">
                {lesson.speakingChallenge.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border-2 border-rose-100">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-rose-400 text-white font-black text-sm flex items-center justify-center">{i + 1}</span>
                    <p className="text-lg font-black text-slate-800 flex-1">{c}</p>
                    <button onClick={() => say(c)} className="p-2 rounded-xl bg-white cursor-pointer"><Volume2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <button onClick={() => { AudioManager.playSound('fanfare'); onRewardStar(); onRewardStar(); onRewardStar(); }}
                  className="btn-3d px-8 py-4 rounded-2xl bg-amber-300 text-slate-900 font-black text-lg cursor-pointer inline-flex items-center gap-2">
                  <Star className="w-6 h-6 fill-current" /> Finish · 3 stars
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
