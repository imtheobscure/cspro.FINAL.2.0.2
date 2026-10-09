'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Gamepad2, Volume2, Type, Wand2, Mic } from 'lucide-react';
import { allThemes } from '@/data/themesMaster';
import { AudioManager } from '@/lib/audio';

/**
 * "What's new in this version" — shown once on the home screen after an update.
 *
 * It is written for the tutor, not for a changelog: each line says what changed
 * and what it means for the next lesson. Dismissing it stores a version key, so
 * it comes back by itself when a later release bumps it.
 */

const SEEN_KEY = 'talkquest.whatsNew.v1';

const NOTES: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <Sparkles className="w-4 h-4" />,
    title: 'You are playing TalkQuest now',
    body: 'A clearer name for what this is: every lesson ends in talking. Older links to the old folder still work and open TalkQuest.',
  },
  {
    icon: <Type className="w-4 h-4" />,
    title: 'Easier words in every lesson',
    body: 'The scripts, questions and stories were rewritten in short, simple sentences a young learner can actually read — no hard or tricky words left in the teacher lines.',
  },
  {
    icon: <Gamepad2 className="w-4 h-4" />,
    title: 'Fairer, snappier games',
    body: 'Ten speaking games had their round logic fixed: rounds end when they should, scores add up, timers stop at zero, and a correct answer no longer slips past you.',
  },
  {
    icon: <Volume2 className="w-4 h-4" />,
    title: 'Better sounds — and a sound button',
    body: 'Every sound is now made inside the app, so it is instant and works with no internet. Soft bells and chimes for right answers, a gentle sound for wrong ones, and one button in the header mutes the whole app.',
  },
  {
    icon: <Mic className="w-4 h-4" />,
    title: 'Read-aloud that tells the truth',
    body: 'The Voices screen plays a real sentence in each language, shows which voice will speak, and says honestly whether it found a natural Microsoft child voice, a basic system voice, or none.',
  },
  {
    icon: <Wand2 className="w-4 h-4" />,
    title: 'Add your own topics and lesson plans with AI',
    body: 'Copy the prompt, paste it into any AI, paste the JSON back — new topics and timed lesson plans install instantly and stay saved on this computer.',
  },
];

export const WhatsNew: React.FC = () => {
  /**
   * Closed until we have read storage, and storage is only read after mount.
   *
   * Reading it in the `useState` initialiser looked fine and was not: the
   * exported page is pre-rendered on a build machine with no localStorage, so the
   * HTML always contained this panel, while a tutor who had already dismissed it
   * rendered without it — a hydration mismatch that made React throw the whole
   * tree away and re-render it (and, with the old step animation, could leave a
   * lesson step blank). The panel appearing a few milliseconds after paint is
   * invisible; a mismatched tree is not.
   */
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let unseen = true;
    try { unseen = localStorage.getItem(SEEN_KEY) !== 'done'; } catch { /* show it once */ }
    if (unseen) setOpen(true);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, 'done'); } catch { /* */ }
    AudioManager.playSound('pop');
    setOpen(false);
  };

  // Plain conditional, NOT an AnimatePresence: this panel sits inside the page's
  // own AnimatePresence, and a nested one makes the parent's screen change wait
  // for an exit that never completes. It only has to animate in.
  if (!open) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50 rounded-[2rem] card-3d p-6 md:p-7 border-2 border-amber-200"
    >
          <button onClick={dismiss} title="Hide this"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-300 text-2xl flex items-center justify-center">🎉</div>
            <div>
              <h2 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'var(--font-display), Fredoka, sans-serif' }}>
                What&apos;s new in this version
              </h2>
              <p className="text-sm font-bold text-slate-600">
                {allThemes().length} topics · 7 languages · 10 speaking games · {allThemes().length} ready lesson plans
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {NOTES.map(n => (
              <div key={n.title} className="flex gap-3 bg-white/80 rounded-2xl p-4">
                <span className="mt-0.5 w-8 h-8 shrink-0 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  {n.icon}
                </span>
                <div>
                  <p className="text-sm font-black text-slate-900">{n.title}</p>
                  <p className="text-[13px] font-bold text-slate-600 leading-snug">{n.body}</p>
                </div>
              </div>
            ))}
          </div>

      <button onClick={dismiss}
        className="mt-5 btn-3d px-5 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm cursor-pointer">
        Got it — let&apos;s teach
      </button>
    </motion.section>
  );
};
