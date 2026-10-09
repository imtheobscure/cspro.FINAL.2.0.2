'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, Clock, BookOpen, Trash2, RotateCcw, Wand2, Mic } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { WordPic } from '@/components/WordPic';
import { findTheme } from '@/data/themesMaster';
import { PLAN_GAMES, isPastedPlan, planFor, removeLessonPlan, wordList } from '@/lib/customPack';
import type { SupportedLanguage } from '@/types/theme';

/**
 * 📚 The lesson plan, as a tutor actually uses it: a timed list of steps, every
 * spoken line a button, and every step pointing at the screen or game it belongs
 * to. It shows the plan the tutor pasted in, or — when nothing was pasted — the
 * one the app writes from the theme's own words, questions and story, so this
 * screen is never empty.
 */

interface Props {
  slug: string;
  lang: SupportedLanguage;
  onExit: () => void;
  onOpenLesson: (slug: string) => void;
  onLaunchGame: (gameId: string) => void;
}

export const LessonPlanScreen: React.FC<Props> = ({ slug, lang, onExit, onOpenLesson, onLaunchGame }) => {
  const theme = findTheme(slug);
  const [version, setVersion] = useState(0);
  const plan = useMemo(() => planFor(slug), [slug, version]);
  const pasted = isPastedPlan(slug);

  useEffect(() => {
    AudioManager.playSound('select');
  }, [slug]);

  const say = (text: string) => {
    AudioManager.playSound('select');
    AudioManager.speak(text, lang);
  };

  const activity = (id?: string) => {
    if (!id) return null;
    if (id.startsWith('game:')) {
      const game = PLAN_GAMES.find(g => `game:${g.id}` === id);
      if (!game) return null;
      return (
        <button onClick={() => { AudioManager.playSound('pop'); onLaunchGame(game.id); }}
          className="btn-3d inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500 text-white font-black text-xs cursor-pointer">
          🎮 Play {game.name}
        </button>
      );
    }
    return (
      <button onClick={() => { AudioManager.playSound('pop'); onOpenLesson(slug); }}
        className="btn-3d inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white font-black text-xs cursor-pointer">
        <BookOpen className="w-3.5 h-3.5" /> Open {id.replace('lesson:', '')}
      </button>
    );
  };

  const total = plan.steps.reduce((sum, s) => sum + (s.minutes ?? 0), 0) || plan.minutes;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onExit} className="btn-3d flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white font-black text-slate-700 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2 card-3d">
          <WordPic emoji={theme?.icon ?? '📋'} size={32} />
          <div>
            <p className="text-lg font-black leading-tight text-slate-900" style={{ fontFamily: 'var(--font-display), Fredoka, sans-serif' }}>
              {plan.title}
            </p>
            <p className="text-xs font-bold text-slate-500">
              {theme?.name ?? slug} · {plan.steps.length} steps · {total} min · {pasted ? 'pasted plan' : 'written by the app'}
            </p>
          </div>
        </div>
        <div className="flex-1" />
        {pasted && (
          <button onClick={() => { removeLessonPlan(slug); setVersion(v => v + 1); AudioManager.playSound('select'); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-100 text-rose-700 font-black text-xs cursor-pointer">
            <RotateCcw className="w-4 h-4" /> Back to the app's own plan
          </button>
        )}
        <button onClick={() => { onOpenLesson(slug); }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-400 text-slate-900 font-black text-xs cursor-pointer">
          <BookOpen className="w-4 h-4" /> Start the lesson
        </button>
      </div>

      {plan.objective && (
        <div className="bg-white rounded-3xl card-3d p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Today's goal</p>
          <p className="mt-1 text-lg font-black text-slate-800 leading-snug">{plan.objective}</p>
          {plan.materials?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {plan.materials.map((m, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-orange-50 text-xs font-black text-slate-600">
                  🧰 {m}
                </span>
              ))}
            </div>
          ) : null}
          {plan.words?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {plan.words.map(w => (
                <button key={w} onClick={() => say(w)}
                  className="px-3 py-1.5 rounded-full bg-sky-50 text-xs font-black text-slate-700 cursor-pointer hover:bg-sky-100">
                  🔊 {w}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {plan.steps.map((step, i) => (
        <motion.div key={`${step.title}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.25) }}
          className="bg-white rounded-3xl card-3d p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-9 h-9 rounded-2xl bg-amber-300 text-slate-900 font-black flex items-center justify-center shrink-0">{i + 1}</span>
            <h2 className="text-xl font-black text-slate-900 min-w-0">{step.title}</h2>
            {step.minutes ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-black text-slate-600">
                <Clock className="w-3 h-3" /> {step.minutes} min
              </span>
            ) : null}
            <div className="flex-1" />
            {activity(step.activity)}
          </div>

          <div className="mt-4 space-y-3">
            <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Say this out loud</p>
              <div className="mt-1 flex items-start gap-2">
                <p className="flex-1 text-lg font-black text-slate-800 leading-snug">{step.say}</p>
                <button onClick={() => say(step.say)} className="p-2 rounded-xl bg-white cursor-pointer shrink-0" title="Read it aloud">
                  <Volume2 className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            </div>

            {step.ask?.length ? (
              <div className="space-y-2">
                {step.ask.map((q, qi) => (
                  <div key={qi} className="flex items-start gap-2 bg-sky-50 rounded-2xl p-3">
                    <Mic className="w-4 h-4 text-sky-700 mt-1 shrink-0" />
                    <p className="flex-1 text-base font-black text-slate-800">{q}</p>
                    <button onClick={() => say(q)} className="p-2 rounded-xl bg-white cursor-pointer shrink-0" title="Read it aloud">
                      <Volume2 className="w-4 h-4 text-slate-700" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {step.tutor ? (
              <p className="text-xs font-bold text-slate-500 pl-1">👩‍🏫 Tutor: {step.tutor}</p>
            ) : null}
          </div>
        </motion.div>
      ))}

      <div className="bg-white rounded-3xl card-3d p-6">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-black text-slate-900">Want a different plan?</h2>
        </div>
        <p className="text-sm font-bold text-slate-600">
          Copy the lesson-plan prompt in the <strong>Add your own lessons</strong> tab, ask your AI for a plan for{' '}
          <strong>{theme?.name ?? slug}</strong>, and paste the JSON back. It replaces this plan; the button above brings this one back.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="px-3 py-1.5 rounded-full bg-orange-50 text-xs font-black text-slate-600">
            {wordList(slug).length} words available
          </span>
          {PLAN_GAMES.slice(0, 3).map(g => (
            <button key={g.id} onClick={() => { AudioManager.playSound('pop'); onLaunchGame(g.id); }}
              className="px-3 py-1.5 rounded-full bg-indigo-50 text-xs font-black text-indigo-700 cursor-pointer">
              🎮 {g.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center pb-4">
        <button onClick={() => { if (pasted) { removeLessonPlan(slug); } setVersion(v => v + 1); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black text-slate-400 hover:text-rose-600 cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" /> Remove this pasted plan
        </button>
      </div>
    </div>
  );
};
