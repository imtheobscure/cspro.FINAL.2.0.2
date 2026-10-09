import { useEffect, useState } from 'react';
import { Btn, Chip } from '../components/ui';
import { audio } from '../lib/audio';
import { cn } from '../utils/cn';
import type { Settings } from '../lib/types';

/**
 * The arcade title card.
 *
 * It is on the projector before the class is ready, so it does two jobs: pitch
 * the game in one line, and start a session in the format the tutor already has
 * in mind — three presets (teams, solo, panic) go straight into a wave with no
 * room screen in between. "Open the room" is the door for everything else
 * (categories, the tutor's own words, teams, mic test).
 */
export default function Splash({
  onStart,
  showAlways,
  onShowAlways,
  best,
}: {
  /** With a preset the game starts straight away; without one the room opens. */
  onStart: (preset?: Partial<Settings>) => void;
  showAlways: boolean;
  onShowAlways: (v: boolean) => void;
  best: number;
}) {
  const [leaving, setLeaving] = useState(false);

  const start = (preset?: Partial<Settings>) => {
    if (leaving) return;
    setLeaving(true);
    audio.reveal();
    window.setTimeout(() => onStart(preset), 180);
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

  const presets: { icon: string; name: string; desc: string; preset: Partial<Settings> }[] = [
    {
      icon: '🙌',
      name: 'Team shout-out',
      desc: '2 teams, 5 waves, standard pace — one team per wave, scores rotate.',
      preset: { mode: 'teams', waves: 5, pace: 'normal' },
    },
    {
      icon: '🎓',
      name: 'Solo scramble',
      desc: 'One score, 3 waves, chill pace — whole class shouting together.',
      preset: { mode: 'solo', waves: 3, pace: 'chill' },
    },
    {
      icon: '🔥',
      name: 'Panic round',
      desc: '5 waves, panic pace — words land in a heap. Five minutes, max energy.',
      preset: { mode: 'teams', waves: 5, pace: 'panic' },
    },
  ];

  return (
    <div
      onClick={() => start()}
      className={cn(
        'fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(1100px_700px_at_10%_-10%,#0e7490,transparent),radial-gradient(900px_700px_at_100%_0%,#be123c,transparent)] bg-slate-950 transition-opacity duration-200',
        leaving ? 'opacity-0' : 'opacity-100',
      )}
    >
      <div className="mx-auto grid min-h-screen max-w-[1500px] items-center gap-8 px-6 py-10 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6 text-white">
          <div className="flex items-center gap-4">
            <span className="animate-glow grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-rose-500 to-sky-500 text-5xl shadow-2xl">🫧</span>
            <div>
              <h1 className="text-6xl font-black leading-none tracking-tight">Shout<span className="text-sky-300">Out</span></h1>
              <p className="text-lg font-bold uppercase tracking-[0.25em] text-sky-200">the emoji flood arcade</p>
            </div>
          </div>

          <p className="max-w-xl text-2xl font-bold leading-snug text-white/90">
            Words rain into your camera feed. <b className="text-amber-300">Shout one</b> and
            every copy of it pops at once — let too many land, and the room floods.
          </p>

          <ul className="max-w-xl space-y-3">
            {[
              'Shout the word, not the letter — the mic is listening for whole words.',
              'Every word you pop is 25 points. Clear 90% of a wave and it is saved: +300.',
              'No mic, or a shy class? The type box pops words just as well.',
            ].map((t, i) => (
              <li key={t} className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-lg font-black text-rose-600">{i + 1}</span>
                <span className="text-lg font-semibold text-white/95">{t}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Btn variant="ok" size="xl" onClick={() => start()}>▶ Enter the arena</Btn>
            <Btn size="lg" variant="ghost" onClick={() => start()}>🎛 Open the room</Btn>
            {best > 0 && <Chip tone="amber" className="bg-amber-400/20 text-amber-100">🏅 Best session {best.toLocaleString()}</Chip>}
          </div>
          <p className="text-base font-bold text-white/60">…or just press Space. Any key starts the game.</p>
        </div>

        <div className="space-y-3">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={(e) => { e.stopPropagation(); start(p.preset); }}
              className="flex w-full items-center gap-4 rounded-2xl border-2 border-white/15 bg-white/5 px-4 py-4 text-left text-white transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/15"
            >
              <span className="text-4xl">{p.icon}</span>
              <span className="min-w-0">
                <span className="block text-2xl font-black leading-tight">{p.name}</span>
                <span className="block text-sm font-semibold text-white/70">{p.desc}</span>
              </span>
            </button>
          ))}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-white">
            <span className="text-sm font-bold uppercase tracking-widest text-sky-200">Same class, other game</span>
            <a className="rounded-xl bg-white/15 px-3 py-1.5 text-base font-black hover:bg-white/25"
              href="../talkarena/index.html" onClick={(e) => e.stopPropagation()}>
              🗣️ TalkArena — grid, drawing & debate ↗
            </a>
          </div>
        </div>
      </div>

      <div
        className="sticky bottom-0 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 bg-slate-950/80 px-6 py-3 text-white/80 backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
          <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={showAlways} onChange={(e) => onShowAlways(e.target.checked)} />
          Show this title card at launch
        </label>
        <span className="text-sm font-semibold">Camera and mic never leave this browser — nothing is recorded or uploaded.</span>
        <span className="text-sm font-semibold">Music and sound effects are synthesised live.</span>
      </div>
    </div>
  );
}
