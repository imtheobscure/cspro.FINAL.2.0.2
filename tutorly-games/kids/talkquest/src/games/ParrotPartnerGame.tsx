'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Wind, Feather } from 'lucide-react';
import { scene } from '@/lib/art';
import { AudioManager } from '@/lib/audio';
import { useGameEngine, shuffle, pickN } from '@/lib/gameCore';
import { GameHUD, JuiceShell } from '@/components/GameHUD';
import { StartCard, EndCard } from './WhisperingWallGame';

interface Props { onExit: () => void; onRewardStar: () => void; }

const SUBJ = ['The treasure', 'The golden key', 'The old map', 'The secret box', 'The red flag'];
const VERB = ['is hidden', 'is buried', 'is waiting', 'is locked', 'is floating'];
const PLACE = ['under the palm tree', 'behind the waterfall', 'inside the dark cave', 'on Skull Rock', 'near the blue lagoon'];

function makeMessage() {
  return `${SUBJ[Math.floor(Math.random() * SUBJ.length)]} ${VERB[Math.floor(Math.random() * VERB.length)]} ${PLACE[Math.floor(Math.random() * PLACE.length)]}`;
}

export const ParrotPartnerGame: React.FC<Props> = ({ onExit, onRewardStar }) => {
  const g = useGameEngine({ startingLives: 3, maxLevel: 8 });
  const [phase, setPhase] = useState<'learn' | 'fly' | 'rebuild'>('learn');
  const [message, setMessage] = useState('');
  const [parts, setParts] = useState<string[]>([]);
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [bank, setBank] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [gust, setGust] = useState(false);

  const startRound = (lvl: number) => {
    const msg = makeMessage();
    const p = [
      msg.split(' ').slice(0, 2).join(' '),
      msg.split(' ').slice(2, 4).join(' '),
      msg.split(' ').slice(4).join(' '),
    ];
    setMessage(msg); setParts(p);
    setSlots([null, null, null]);
    const decoyN = Math.min(4, 1 + Math.floor(lvl / 2));
    const decoys = pickN([...SUBJ, ...PLACE].filter(x => !p.includes(x)), decoyN);
    setBank(shuffle([...p, ...decoys]));
    setPhase('learn');
    setProgress(0);
    AudioManager.speak(`Squawk! Remember this: ${msg}`, 'en');
    const learnMs = Math.max(2500, 6000 - lvl * 400);
    setTimeout(() => { setPhase('fly'); AudioManager.playSound('whoosh'); }, learnMs);
  };

  useEffect(() => { if (g.running) startRound(g.level); /* eslint-disable-next-line */ }, [g.level, g.running]);

  // Flight animation + wind gusts
  useEffect(() => {
    if (phase !== 'fly') return;
    const id = setInterval(() => {
      setProgress(p => {
        const np = p + 2.5 + g.level * 0.3;
        if (Math.random() < 0.12) { setGust(true); AudioManager.playSound('whoosh'); setTimeout(() => setGust(false), 500); }
        if (np >= 100) { setPhase('rebuild'); AudioManager.playSound('radio'); return 100; }
        return np;
      });
    }, 90);
    return () => clearInterval(id);
  }, [phase, g.level]);

  const place = (word: string) => {
    const idx = slots.findIndex(s => s === null);
    if (idx === -1) return;
    if (word === parts[idx]) {
      const next = [...slots]; next[idx] = word;
      setSlots(next);
      setBank(b => b.filter(x => x !== word));
      AudioManager.speak(word, 'en');
      g.registerHit(130);
      onRewardStar();
      if (next.every(Boolean)) {
        AudioManager.playSound('fanfare');
        setTimeout(() => g.advanceLevel(), 1100);
      }
    } else {
      g.registerMiss(true);
    }
  };

  if (!g.running && !g.gameOver && !g.victory) {
    return <StartCard title="Parrot-Partner Secret Delivery" img={scene('parrot-delivery')} tag="Memory Chunks · Sequencing · Recall"
      rules={[
        'Captain Pepper shows you a secret message — say it out loud with him!',
        'The message disappears and he flies across the islands.',
        'When he lands, rebuild the message in the RIGHT order from memory.',
        'Decoy phrases appear as levels rise. Wrong piece = 1 life.',
      ]}
      onStart={g.start} onExit={onExit} />;
  }
  if (g.gameOver || g.victory) return <EndCard victory={g.victory} score={g.score} best={g.bestCombo} onAgain={g.start} onExit={onExit} />;

  return (
    <JuiceShell shake={g.shake} hitStop={g.hitStop} className="space-y-3">
      <GameHUD title="Parrot Delivery" score={g.score} combo={g.combo} multiplier={g.multiplier}
        lives={g.lives} level={g.level} levelLabel={g.band.label} timeLeft={g.timeLeft}
        timeLimit={g.band.timeLimit} floaters={g.floaters} onExit={() => { g.stop(); onExit(); }} />

      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[520px] border border-white/10">
        <img src={scene('parrot-delivery')} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-sky-950/60" />

        <div className="relative z-10 p-6 md:p-8">
          {phase === 'learn' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="max-w-2xl mx-auto bg-amber-400/95 rounded-3xl p-8 text-center shadow-2xl">
              <div className="text-6xl mb-3">🦜</div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-900 mb-2">Memorise & say it out loud!</p>
              <p className="text-2xl md:text-3xl font-black text-slate-900 leading-snug">&ldquo;{message}&rdquo;</p>
              <button onClick={() => AudioManager.speak(message, 'en')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-black cursor-pointer">
                <Volume2 className="w-5 h-5" /> Hear again
              </button>
            </motion.div>
          )}

          {phase === 'fly' && (
            <div className="max-w-3xl mx-auto">
              <div className="relative h-56 rounded-3xl bg-gradient-to-b from-sky-400/60 to-blue-600/60 border-2 border-white/25 overflow-hidden mb-4">
                {['🌴', '🗿', '💰', '🏝️'].map((ic, i) => (
                  <div key={i} className="absolute text-3xl" style={{ left: `${12 + i * 24}%`, bottom: '12%' }}>{ic}</div>
                ))}
                <motion.div className="absolute text-5xl" style={{ top: gust ? '18%' : '28%' }}
                  animate={{ left: `${progress}%`, rotate: gust ? [-12, 12, -12] : 0 }}
                  transition={{ duration: 0.3 }}>
                  🦜
                </motion.div>
                {gust && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/90 text-xs font-black text-sky-900 flex items-center gap-1">
                    <Wind className="w-3 h-3" /> Wind gust!
                  </motion.div>
                )}
              </div>
              <div className="h-3 rounded-full bg-white/20 overflow-hidden mb-2">
                <motion.div className="h-full bg-gradient-to-r from-sky-300 to-blue-500" animate={{ width: `${progress}%` }} />
              </div>
              <p className="text-center text-sm font-black text-white/85">
                Pepper is flying… keep repeating the message in your head!
              </p>
            </div>
          )}

          {phase === 'rebuild' && (
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-5">
                <div className="text-5xl mb-1">🦜</div>
                <p className="text-lg font-black text-white">Squawk! What was the message?</p>
              </div>

              <div className="space-y-2 mb-5">
                {slots.map((s, i) => (
                  <div key={i} className={`h-14 rounded-2xl border-2 border-dashed flex items-center justify-center text-base font-black px-3 text-center ${
                    s ? 'bg-emerald-400/25 border-emerald-300 text-white' : 'bg-white/10 border-white/25 text-white/40'
                  }`}>
                    {s || `Part ${i + 1}`}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {bank.map((b, i) => (
                  <motion.button key={`${b}-${i}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => place(b)}
                    className="px-4 py-3 rounded-xl bg-gradient-to-br from-sky-300 to-blue-500 text-slate-900 font-black text-sm shadow-lg cursor-pointer">
                    {b}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </JuiceShell>
  );
};
