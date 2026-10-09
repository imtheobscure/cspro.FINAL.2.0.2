import { useEffect, useState } from 'react';
import { Btn, Chip } from './ui';
import { audio } from '../lib/audio';
import { cn } from '../utils/cn';

/**
 * The title card the tutor puts on the projector while the class walks in.
 *
 * It is deliberately more than a logo: the five rooms are ON it, so the lesson
 * starts with one click (the session opens in that room instead of the lobby),
 * and the three numbered steps tell a new tutor what order the app expects to be
 * used in — set the room, play a game, read the plan.
 *
 * It costs no clicks either: any key or click starts the session, because a title
 * card that has to be dismissed with the mouse is a title card the tutor fights
 * with in front of thirty people.
 */
export default function Splash({
  onStart,
  showAlways,
  onShowAlways,
}: {
  /** Start the session, optionally in a specific room (`'arena'`, `'debate'`, …). */
  onStart: (view?: string) => void;
  showAlways: boolean;
  onShowAlways: (v: boolean) => void;
}) {
  const [leaving, setLeaving] = useState(false);

  const start = (view?: string) => {
    if (leaving) return;
    setLeaving(true);
    audio.reveal();
    // Let the fade-out play before the app mounts under it.
    window.setTimeout(() => onStart(view), 180);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const rooms = [
    { id: 'arena', icon: '🎯', name: 'Grid Arena', desc: 'Hard cards, a mini lesson on every miss.' },
    { id: 'pictionary', icon: '🎨', name: 'Pictionary Studio', desc: 'Draw it, and the webcam AI reads the sketch.' },
    { id: 'debate', icon: '⚖️', name: 'Discussion & Debate', desc: 'Nine timed stages and a live talk-time meter.' },
    { id: 'practice', icon: '🧘', name: 'Practice Room', desc: 'One card at a time, nobody is scored.' },
    { id: 'report', icon: '📊', name: 'Report & plan', desc: 'The weakest sub-skill, re-asked on one tap.' },
  ];

  return (
    <div
      onClick={() => start()}
      className={cn(
        'fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(1200px_700px_at_15%_-10%,#4338ca,transparent),radial-gradient(900px_600px_at_100%_10%,#7c3aed,transparent)] bg-slate-950 transition-opacity duration-200',
        leaving ? 'opacity-0' : 'opacity-100',
      )}
    >
      <div className="mx-auto grid min-h-screen max-w-[1500px] items-center gap-8 px-6 py-10 lg:grid-cols-[1.1fr_1fr]">
        {/* brand */}
        <div className="space-y-6 text-white">
          <div className="flex items-center gap-4">
            <span className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 text-5xl shadow-2xl">🗣️</span>
            <div>
              <h1 className="text-6xl font-black leading-none tracking-tight">TalkArena</h1>
              <p className="text-lg font-bold uppercase tracking-[0.25em] text-indigo-200">classroom speaking games</p>
            </div>
          </div>

          <p className="max-w-xl text-2xl font-bold leading-snug text-white/90">
            The tutor runs the room. The class does the talking — every correct answer
            earns a speaking task, every wrong one buys a mini lesson.
          </p>

          <ol className="max-w-xl space-y-3">
            {[
              'Set the room — teams, avatars, projector text size, voices.',
              'Play — grid cards, drawing, debate or pressure-free practice.',
              'Read the plan — the report names the weakest sub-skill and re-asks the misses.',
            ].map((t, i) => (
              <li key={t} className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-lg font-black text-indigo-700">{i + 1}</span>
                <span className="text-lg font-semibold text-white/95">{t}</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Btn variant="ok" size="xl" onClick={() => start()}>▶ Start the session</Btn>
            <span className="text-base font-bold text-white/70">…or press Space</span>
          </div>
        </div>

        {/* rooms */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-white">
            <h2 className="text-xl font-black uppercase tracking-widest text-indigo-200">Open a room directly</h2>
            <Chip tone="violet" className="bg-white/10 text-white">6 rooms</Chip>
          </div>
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={(e) => { e.stopPropagation(); start(r.id); }}
              className="flex w-full items-center gap-4 rounded-2xl border-2 border-white/15 bg-white/5 px-4 py-3 text-left text-white transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/15"
            >
              <span className="text-3xl">{r.icon}</span>
              <span className="min-w-0">
                <span className="block text-xl font-black leading-tight">{r.name}</span>
                <span className="block text-sm font-semibold text-white/70">{r.desc}</span>
              </span>
            </button>
          ))}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-white">
            <span className="text-sm font-bold uppercase tracking-widest text-indigo-200">Also here</span>
            <a
              className="rounded-xl bg-white/15 px-3 py-1.5 text-base font-black hover:bg-white/25"
              href="../shoutout/index.html"
              onClick={(e) => e.stopPropagation()}
            >
              🫧 ShoutOut — the emoji flood arcade ↗
            </a>
            <span className="text-sm font-semibold text-white/70">a game of its own, same class, same teams</span>
          </div>
        </div>
      </div>

      {/* footer bar */}
      <div
        className="sticky bottom-0 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 bg-slate-950/80 px-6 py-3 text-white/80 backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            className="h-4 w-4 accent-indigo-400"
            checked={showAlways}
            onChange={(e) => onShowAlways(e.target.checked)}
          />
          Show this title card at launch
        </label>
        <span className="text-sm font-semibold">Nothing is uploaded: camera, mic and every answer stay in this browser.</span>
        <span className="text-sm font-semibold">Avatars by DiceBear · photos from Pexels · music synthesised live.</span>
      </div>
    </div>
  );
}
