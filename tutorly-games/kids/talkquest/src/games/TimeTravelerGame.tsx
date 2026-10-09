'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Hourglass, Smile, Frown } from 'lucide-react';
import { scene } from '@/lib/art';
import { AudioManager } from '@/lib/audio';
import { useGameEngine, shuffle } from '@/lib/gameCore';
import { GameHUD, JuiceShell } from '@/components/GameHUD';
import { StartCard, EndCard } from './WhisperingWallGame';

interface Props { onExit: () => void; onRewardStar: () => void; }

interface Guest { name: string; emoji: string; era: string; }
const GUESTS: Guest[] = [
  { name: 'Leo the Artist', emoji: '🎨', era: 'A long time ago · 1495' },
  { name: 'Cleo the Queen', emoji: '👑', era: 'Very long ago · 40 BC' },
  { name: 'Marie the Scientist', emoji: '🔬', era: 'Long ago · 1903' },
  { name: 'Amelia the Pilot', emoji: '✈️', era: 'Not so long ago · 1932' },
];

interface Card { object: string; emoji: string; good: string; bad: string[]; }
const OBJECTS: Card[] = [
  { object: 'Phone', emoji: '📱', good: 'It is a small box. We talk to people far away and see them on it.', bad: ['It is a magic rock that makes gold.', 'It is a tiny window you cannot open.'] },
  { object: 'Plane', emoji: '✈️', good: 'It is a big metal bird. It carries people through the sky.', bad: ['It is a dragon we ride to school.', 'It is a very fast boat with no water.'] },
  { object: 'Fridge', emoji: '🧊', good: 'It is a cold cupboard. It keeps our food fresh.', bad: ['It is a snow monster in the kitchen.', 'It is a box that eats food.'] },
  { object: 'Bike', emoji: '🚲', good: 'It has two wheels. We push the pedals with our feet.', bad: ['It is a metal horse that eats grass.', 'It is a chair that runs away.'] },
  { object: 'Torch', emoji: '🔦', good: 'It is a little tube that makes light. We use it in the dark.', bad: ['It is a stick full of trapped sunshine.', 'It is a candle you cannot blow out.'] },
  { object: 'Camera', emoji: '📷', good: 'It takes a picture, and we look at it later.', bad: ['It steals your face forever.', 'It is a box with a painter inside.'] },
];

export const TimeTravelerGame: React.FC<Props> = ({ onExit, onRewardStar }) => {
  const g = useGameEngine({ startingLives: 3, maxLevel: 8 });
  const [guest, setGuest] = useState<Guest>(GUESTS[0]);
  const [card, setCard] = useState<Card>(OBJECTS[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [interest, setInterest] = useState(100);   // guest engagement meter
  const [served, setServed] = useState(0);
  const [line, setLine] = useState('');

  // The meter lives in a ref as well as state, so the decay tick never has to
  // call registerMiss from inside a state updater (React can run those twice).
  const interestRef = useRef(100);
  const setInterestTo = useCallback((value: number) => {
    interestRef.current = Math.max(0, Math.min(100, value));
    setInterest(interestRef.current);
  }, []);

  const newRound = (lvl: number) => {
    const gu = GUESTS[Math.floor(Math.random() * GUESTS.length)];
    const c = OBJECTS[Math.floor(Math.random() * OBJECTS.length)];
    setGuest(gu); setCard(c); setPicked(null);
    const badCount = Math.min(3, 1 + Math.floor(lvl / 3));
    setOptions(shuffle([c.good, ...c.bad.slice(0, badCount)]));
    const q = `${gu.name} asks: What is this ${c.object}?`;
    setLine(q);
    AudioManager.speak(q, 'en');
  };

  useEffect(() => {
    if (g.running) { newRound(g.level); setInterestTo(100); setServed(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.level, g.running]);

  // The guest gets bored — keep them interested by explaining well.
  useEffect(() => {
    if (!g.running) return;
    const id = setInterval(() => {
      const next = interestRef.current - (0.9 + g.level * 0.25);
      if (next <= 0) {
        AudioManager.playSound('alarm');
        g.registerMiss(true);
        setInterestTo(55);
        return;
      }
      if (next < 30) AudioManager.playSound('heartbeat');
      setInterestTo(next);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [g.running, g.level, g.registerMiss, setInterestTo]);

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const right = options[i] === card.good;
    AudioManager.speak(options[i], 'en');
    if (right) {
      g.registerHit(150);
      onRewardStar();
      setInterestTo(interestRef.current + 32);
      setLine(`${guest.name}: "Now I understand the ${card.object}!"`);
      const next = served + 1;
      setServed(next);
      const needed = Math.min(4, 2 + Math.floor(g.level / 3));
      setTimeout(() => {
        if (next >= needed) { AudioManager.playSound('fanfare'); g.advanceLevel(); }
        else newRound(g.level);
      }, 1500);
    } else {
      g.registerMiss(true);
      setInterestTo(interestRef.current - 10);
      setLine(`${guest.name}: "That cannot be right. Explain it again!"`);
      setTimeout(() => setPicked(null), 1400);
    }
  };

  const needed = Math.min(4, 2 + Math.floor(g.level / 3));

  if (!g.running && !g.gameOver && !g.victory) {
    return <StartCard title="Time-Traveler Dinner Party" img={scene('time-traveler')} tag="Explaining · Simple Language · Engagement"
      rules={[
        'Guests from long ago are at your dinner table.',
        'They point at things from today. Explain each one in EASY words.',
        'Say your answer out loud before you tap it!',
        'A good explanation fills their interest bar. An empty bar loses a life.',
      ]}
      onStart={g.start} onExit={onExit} />;
  }
  if (g.gameOver || g.victory) return <EndCard victory={g.victory} score={g.score} best={g.bestCombo} onAgain={g.start} onExit={onExit} />;

  return (
    <JuiceShell shake={g.shake} hitStop={g.hitStop} className="space-y-3">
      <GameHUD title="Time Traveler Dinner" score={g.score} combo={g.combo} multiplier={g.multiplier}
        lives={g.lives} level={g.level} levelLabel={g.band.label} timeLeft={g.timeLeft}
        timeLimit={g.band.timeLimit} floaters={g.floaters} onExit={() => { g.stop(); onExit(); }} />

      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[520px] border border-white/10">
        <img src={scene('time-traveler')} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-stone-950/74" />

        <div className="relative z-10 p-5 md:p-8 max-w-3xl mx-auto space-y-5">
          {/* Guest + interest */}
          <div className="p-4 rounded-2xl bg-white/95 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-4xl shrink-0">
                {guest.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">{guest.era}</p>
                <p className="text-lg font-black text-stone-800">{guest.name}</p>
                <div className="mt-1.5">
                  <div className="flex items-center gap-2">
                    {interest > 45 ? <Smile className="w-4 h-4 text-emerald-600" /> : <Frown className="w-4 h-4 text-rose-600" />}
                    <div className="flex-1 h-2.5 rounded-full bg-stone-200 overflow-hidden">
                      <motion.div className={`h-full ${interest < 25 ? 'bg-rose-500' : interest < 55 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        animate={{ width: `${interest}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-stone-500">{Math.round(interest)}%</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-black uppercase text-stone-400">Explained</p>
                <p className="text-xl font-black text-stone-800">{served}/{needed}</p>
              </div>
            </div>
          </div>

          {/* Object on the table */}
          <div className="p-6 rounded-3xl bg-amber-400/95 text-center shadow-2xl">
            <div className="text-7xl mb-2">{card.emoji}</div>
            <p className="text-xl font-black text-stone-900">{line}</p>
            <button onClick={() => AudioManager.speak(line, 'en')}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-white font-black text-sm cursor-pointer">
              <Volume2 className="w-4 h-4" /> Hear the guest
            </button>
          </div>

          {/* Explanations */}
          <div className="space-y-2.5">
            {options.map((o, i) => {
              const right = o === card.good;
              const chosen = picked === i;
              const cls = picked === null ? 'bg-white/95 hover:bg-white border-transparent'
                : right ? 'bg-emerald-100 border-emerald-500' : chosen ? 'bg-rose-100 border-rose-500' : 'bg-white/60 border-transparent opacity-60';
              return (
                <button key={i} onClick={() => choose(i)} disabled={picked !== null}
                  className={`w-full p-4 rounded-2xl border-2 text-left text-base font-bold text-stone-800 cursor-pointer transition ${cls}`}>
                  &ldquo;{o}&rdquo;
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs font-black text-white/70">
            🗣️ Read your chosen answer OUT LOUD to the guest before you tap!
          </p>
        </div>
      </div>
    </JuiceShell>
  );
};
