'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Sparkles, ShieldAlert } from 'lucide-react';
import { scene } from '@/lib/art';
import { AudioManager } from '@/lib/audio';
import { useGameEngine, shuffle, pickN } from '@/lib/gameCore';
import { GameHUD, JuiceShell } from '@/components/GameHUD';
import { StartCard, EndCard } from './WhisperingWallGame';

interface Props { onExit: () => void; onRewardStar: () => void; }

const POSITIVE = ['Radiant', 'Brilliant', 'Kind', 'Sparkling', 'Gorgeous', 'Magnificent', 'Shining', 'Lovely', 'Clever', 'Gentle', 'Cheerful', 'Graceful'];
const NEGATIVE = ['Dull', 'Cracked', 'Ugly', 'Boring', 'Rusty', 'Gloomy', 'Messy', 'Grumpy'];

interface Falling { id: number; word: string; good: boolean; x: number; y: number; speed: number; }

export const MagicMirrorGame: React.FC<Props> = ({ onExit, onRewardStar }) => {
  const g = useGameEngine({ startingLives: 3, maxLevel: 8 });
  const [items, setItems] = useState<Falling[]>([]);
  const [healed, setHealed] = useState(0);
  const [curse, setCurse] = useState(0);
  const [speech, setSpeech] = useState('Sigh… nobody likes an old cracked mirror…');
  const [shieldUp, setShieldUp] = useState(false);

  // The two bars the physics reads, so a 60ms tick never has to call the engine
  // from inside a state updater (that was how one missed word could cost two
  // lives).
  const healedRef = useRef(0);
  const curseRef = useRef(0);
  const shieldRef = useRef(false);
  const calmTaps = useRef(0);

  const setHealedTo = useCallback((value: number) => {
    healedRef.current = Math.max(0, Math.min(100, value));
    setHealed(healedRef.current);
  }, []);
  const setCurseTo = useCallback((value: number) => {
    curseRef.current = Math.max(0, Math.min(100, value));
    setCurse(curseRef.current);
  }, []);

  useEffect(() => {
    if (!g.running) return;
    setItems([]);
    setHealedTo(0);
    setCurseTo(0);
    shieldRef.current = false;
    setShieldUp(false);
    calmTaps.current = 0;
    setSpeech('Sigh… nobody likes an old cracked mirror…');
  }, [g.level, g.running, setCurseTo, setHealedTo]);

  // Spawner — rate & negative ratio scale with level
  useEffect(() => {
    if (!g.running) return;
    const interval = Math.max(650, 1700 - g.level * 130);
    const negChance = Math.min(0.45, 0.15 + g.level * 0.04);
    const id = setInterval(() => {
      const good = Math.random() > negChance;
      const word = good
        ? POSITIVE[Math.floor(Math.random() * POSITIVE.length)]
        : NEGATIVE[Math.floor(Math.random() * NEGATIVE.length)];
      setItems(list => [...list, {
        id: Date.now() + Math.random(),
        word, good,
        x: 6 + Math.random() * 78,
        y: -10,
        speed: 0.55 + g.level * 0.16 + Math.random() * 0.3,
      }]);
    }, interval);
    return () => clearInterval(id);
  }, [g.running, g.level]);

  // Physics tick
  useEffect(() => {
    if (!g.running) return;
    const id = setInterval(() => {
      setItems(list => {
        const next: Falling[] = [];
        for (const it of list) {
          const y = it.y + it.speed;
          if (y > 100) {
            // A missed kind word grows the curse. Mean words are free to ignore.
            if (it.good) {
              setCurseTo(curseRef.current + 8);
              AudioManager.playSound('thud');
              if (curseRef.current >= 100) {
                AudioManager.playSound('alarm');
                g.registerMiss(true);
                setCurseTo(40);
              }
            }
            continue;
          }
          next.push({ ...it, y });
        }
        return next;
      });
    }, 60);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [g.running]);

  const tap = (it: Falling) => {
    setItems(l => l.filter(x => x.id !== it.id));
    if (it.good) {
      AudioManager.playSound('sparkle');
      AudioManager.speak(`You are ${it.word.toLowerCase()}!`, 'en');
      setSpeech(`"${it.word}"… oh, that feels wonderful!`);
      g.registerHit(110);
      onRewardStar();
      calmTaps.current += 1;
      setHealedTo(healedRef.current + 9);
      setCurseTo(curseRef.current - 5);
      // Five kind words in a row earn a shield: one free mistake, which is the
      // mechanic the code always promised and never actually switched on.
      if (calmTaps.current % 5 === 0 && !shieldRef.current) {
        shieldRef.current = true;
        setShieldUp(true);
        AudioManager.playSound('shield');
        g.pushFloater('SHIELD UP!', 'epic');
      }
      if (healedRef.current >= 100) {
        AudioManager.playSound('fanfare');
        setTimeout(() => g.advanceLevel(), 900);
      }
    } else {
      if (shieldRef.current) {
        shieldRef.current = false;
        setShieldUp(false);
        AudioManager.playSound('shield');
        setSpeech('"Phew! The shield caught that one!"');
        return;
      }
      AudioManager.playSound('wrong');
      setSpeech(`"${it.word}"… ouch, that hurts my glass…`);
      setCurseTo(curseRef.current + 12);
      g.triggerShake(12);
      setHealedTo(healedRef.current - 6);
      if (curseRef.current >= 100) {
        g.registerMiss(true);
        setCurseTo(40);
      }
    }
  };

  if (!g.running && !g.gameOver && !g.victory) {
    return <StartCard title="Magic-Mirror Compliment Battle" img={scene('magic-mirror')} tag="Reflex · Word Sorting · Curse Defence"
      rules={[
        'Kind words fall from the sky. Tap them before they reach the floor.',
        'Say each kind word out loud as you tap it!',
        'Do not tap the mean words — they make the dark curse grow.',
        'Five kind words in a row wins you a shield for one mistake.',
        'Fill the healed bar to 100% to finish the level.',
      ]}
      onStart={g.start} onExit={onExit} />;
  }
  if (g.gameOver || g.victory) return <EndCard victory={g.victory} score={g.score} best={g.bestCombo} onAgain={g.start} onExit={onExit} />;

  return (
    <JuiceShell shake={g.shake} hitStop={g.hitStop} className="space-y-3">
      <GameHUD title="Magic Mirror" score={g.score} combo={g.combo} multiplier={g.multiplier}
        lives={g.lives} level={g.level} levelLabel={g.band.label} timeLeft={g.timeLeft}
        timeLimit={g.band.timeLimit} floaters={g.floaters} onExit={() => { g.stop(); onExit(); }} />

      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[540px] border border-white/10">
        <img src={scene('magic-mirror')} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-violet-950/72" />

        {/* Falling word field */}
        <div className="absolute inset-0 z-20">
          <AnimatePresence>
            {items.map(it => (
              <motion.button
                key={it.id}
                initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.6, opacity: 0 }}
                onClick={() => tap(it)}
                style={{ left: `${it.x}%`, top: `${it.y}%` }}
                className={`absolute px-4 py-2.5 rounded-xl font-black text-base shadow-xl cursor-pointer select-none ${
                  it.good
                    ? 'bg-gradient-to-br from-amber-300 to-yellow-400 text-violet-950'
                    : 'bg-gradient-to-br from-slate-700 to-slate-900 text-slate-200 border border-rose-500/50'
                }`}
              >
                {it.word}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <div className="relative z-10 p-5 md:p-7 h-full flex flex-col justify-between pointer-events-none">
          <div className="flex flex-wrap gap-3">
            <div className={`flex-1 min-w-[180px] p-3 rounded-2xl bg-black/50 backdrop-blur border ${shieldUp ? 'border-sky-400' : 'border-amber-400/30'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-1">
                Mirror Healed {shieldUp && <span className="text-sky-300">· SHIELD UP 🛡️</span>}
              </p>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-amber-300 to-yellow-400" animate={{ width: `${healed}%` }} />
              </div>
            </div>
            <div className="flex-1 min-w-[180px] p-3 rounded-2xl bg-black/50 backdrop-blur border border-rose-500/30">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-300 mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Dark Curse
              </p>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-rose-600 to-fuchsia-700" animate={{ width: `${curse}%` }} />
              </div>
            </div>
          </div>

          <div className="self-center mb-2 max-w-md pointer-events-auto">
            <div className="bg-white/95 rounded-2xl px-5 py-3 shadow-xl text-center">
              <p className="font-bold text-slate-800 italic">&ldquo;{speech}&rdquo;</p>
              <button onClick={() => AudioManager.speak(speech, 'en')} className="mt-1 text-xs font-black text-violet-700 cursor-pointer inline-flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> hear the mirror
              </button>
            </div>
          </div>
        </div>
      </div>
    </JuiceShell>
  );
};
