'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Search, PackageSearch } from 'lucide-react';
import { scene } from '@/lib/art';
import { AudioManager } from '@/lib/audio';
import { useGameEngine, shuffle, pickN } from '@/lib/gameCore';
import { GameHUD, JuiceShell } from '@/components/GameHUD';
import { StartCard, EndCard } from './WhisperingWallGame';

interface Props { onExit: () => void; onRewardStar: () => void; }

const TYPES = [
  { n: 'Teddy', e: '🧸' }, { n: 'Ball', e: '⚽' }, { n: 'Car', e: '🚗' },
  { n: 'Doll', e: '🪆' }, { n: 'Robot', e: '🤖' }, { n: 'Kite', e: '🪁' },
  { n: 'Train', e: '🚂' }, { n: 'Duck', e: '🦆' },
];
const COLOURS = ['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Brown'];
const SIZES = ['Small', 'Medium', 'Large'];
const EXTRAS = ['with a scarf', 'with spots', 'with a bell', 'with stars', 'with stripes'];

interface Toy { type: string; emoji: string; colour: string; size: string; extra: string; }

function makeToy(): Toy {
  const t = TYPES[Math.floor(Math.random() * TYPES.length)];
  return {
    type: t.n, emoji: t.e,
    colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    size: SIZES[Math.floor(Math.random() * SIZES.length)],
    extra: EXTRAS[Math.floor(Math.random() * EXTRAS.length)],
  };
}

const sameToy = (a: Toy, b: Toy) =>
  a.type === b.type && a.colour === b.colour && a.size === b.size && a.extra === b.extra;

const keyOf = (t: Toy) => `${t.type}|${t.colour}|${t.size}|${t.extra}`;

const QUESTIONS = [
  { key: 'type', q: 'What kind of toy is it?' },
  { key: 'colour', q: 'What colour is it?' },
  { key: 'size', q: 'How big is it?' },
  { key: 'extra', q: 'Does it have anything special on it?' },
] as const;

export const LostFoundGame: React.FC<Props> = ({ onExit, onRewardStar }) => {
  const g = useGameEngine({ startingLives: 3, maxLevel: 8 });
  const [target, setTarget] = useState<Toy>(makeToy);
  const [shelf, setShelf] = useState<Toy[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [master, setMaster] = useState('Welcome! Describe your lost toy and I will find it.');

  const newRound = (lvl: number) => {
    const t = makeToy();
    // Near-miss decoys: they share some attributes with the lost toy, which is
    // what makes describing it worth doing — but no two toys on the shelf are
    // ever identical, and no decoy matches the lost toy on ALL four attributes.
    // A duplicate would be unpickable: two matching teddies, one of them right.
    const decoyCount = Math.min(11, 3 + lvl);
    const decoys: Toy[] = [];
    const used = new Set<string>([keyOf(t)]);
    let guard = 0;
    while (decoys.length < decoyCount && guard++ < decoyCount * 12) {
      const d = makeToy();
      if (Math.random() < 0.6) { d.type = t.type; d.emoji = t.emoji; }
      if (Math.random() < 0.4) d.colour = t.colour;
      if (Math.random() < 0.3) d.size = t.size;
      if (sameToy(d, t) || used.has(keyOf(d))) continue;
      used.add(keyOf(d));
      decoys.push(d);
    }
    setTarget(t);
    setShelf(shuffle([t, ...decoys]));
    setQIdx(0); setAnswers({});
    setMaster('A new traveller! Tell me about your toy.');
    AudioManager.speak('Hello! What kind of toy did you lose?', 'en');
  };

  useEffect(() => { if (g.running) newRound(g.level); /* eslint-disable-next-line */ }, [g.level, g.running]);

  const currentQ = QUESTIONS[qIdx];

  /**
   * The choices for one question, and the lost toy's own answer is ALWAYS one of
   * them. The old builder could offer four other types and leave the right one
   * out, so no tap could ever be correct and the child lost a life for a
   * question that had no right answer.
   */
  const optionsFor = (key: string): string[] => {
    const own = (target as unknown as Record<string, string>)[key];
    if (key === 'size') return SIZES;
    const pool =
      key === 'type' ? TYPES.map(t => t.n) : key === 'colour' ? COLOURS : EXTRAS;
    const others = pool.filter(v => v !== own);
    const asked = key === 'type' || key === 'colour' ? 3 : 2;
    return shuffle([own, ...pickN(others, asked)]);
  };

  const answer = (val: string) => {
    const correct = (target as unknown as Record<string, string>)[currentQ.key] === val;
    if (correct) {
      setAnswers(a => ({ ...a, [currentQ.key]: val }));
      AudioManager.playSound('correct');
      g.registerHit(100);
      onRewardStar();
      setMaster(`Good! A ${val.toLowerCase()} one. Let me look…`);
      if (qIdx < QUESTIONS.length - 1) setQIdx(i => i + 1);
    } else {
      // A wrong detail costs a try, not a life. Losing the game because two of
      // the four questions did not fit the shelf is not a lesson about words.
      AudioManager.playSound('wrong');
      g.pushFloater('Try again', 'bad');
      setMaster('That is not it. Look at your toy and try again!');
    }
  };

  // Filter shelf live based on answers given (deduction feedback loop)
  const filtered = shelf.filter(s =>
    Object.entries(answers).every(([k, v]) => (s as unknown as Record<string, string>)[k] === v)
  );
  const readyToPick = Object.keys(answers).length === QUESTIONS.length;

  const pick = (t: Toy) => {
    const right = t === target;
    if (right) {
      AudioManager.playSound('fanfare');
      g.registerHit(400);
      onRewardStar();
      setMaster('That is the one! Here you go!');
      setTimeout(() => g.advanceLevel(), 1200);
    } else {
      AudioManager.playSound('wrong');
      g.pushFloater('Not this one', 'bad');
      g.triggerShake(8);
      setMaster('That is not yours. Say the colour and size again!');
    }
  };

  if (!g.running && !g.gameOver && !g.victory) {
    return <StartCard title="Lost-and-Found Depot" img={scene('lost-found')} tag="Deduction · Describing · Attribute Filtering"
      rules={[
        'You lost a toy. The Station Master asks you four questions.',
        'Look at your toy, then answer: what kind, what colour, how big, what is special.',
        'Say the whole sentence out loud: I lost my small red teddy with spots.',
        'The shelf shows only the toys that match. Then tap YOUR toy.',
        'The shelf gets bigger and sneakier every level!',
      ]}
      onStart={g.start} onExit={onExit} />;
  }
  if (g.gameOver || g.victory) return <EndCard victory={g.victory} score={g.score} best={g.bestCombo} onAgain={g.start} onExit={onExit} />;

  return (
    <JuiceShell shake={g.shake} hitStop={g.hitStop} className="space-y-3">
      <GameHUD title="Lost & Found" score={g.score} combo={g.combo} multiplier={g.multiplier}
        lives={g.lives} level={g.level} levelLabel={g.band.label} timeLeft={g.timeLeft}
        timeLimit={g.band.timeLimit} floaters={g.floaters} onExit={() => { g.stop(); onExit(); }} />

      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[520px] border border-white/10">
        <img src={scene('lost-found')} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-amber-950/76" />

        <div className="relative z-10 p-5 md:p-7 grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Your toy card (secret memory) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-white/95 shadow-xl text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">Your Lost Toy</p>
              <div className="text-6xl mb-2">{target.emoji}</div>
              <p className="text-lg font-black text-stone-800">
                {target.size} {target.colour} {target.type}
              </p>
              <p className="text-sm font-bold text-stone-500">{target.extra}</p>
              <button onClick={() => AudioManager.speak(`I lost my ${target.size} ${target.colour} ${target.type} ${target.extra}`, 'en')}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 text-white font-black text-xs cursor-pointer">
                <Volume2 className="w-4 h-4" /> Say the full sentence
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-stone-900/80 border border-amber-400/25">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">🧔</span>
                <p className="text-xs font-black uppercase tracking-widest text-amber-300">Station Master</p>
              </div>
              <p className="text-sm font-bold text-white">{master}</p>
            </div>

            {!readyToPick && (
              <div className="p-4 rounded-2xl bg-white/95">
                <p className="text-sm font-black text-stone-800 mb-3">{currentQ.q}</p>
                <div className="grid grid-cols-2 gap-2">
                  {optionsFor(currentQ.key).map(o => (
                    <button key={o} onClick={() => answer(o)}
                      className="p-2.5 rounded-xl bg-stone-100 hover:bg-amber-200 font-black text-sm text-stone-800 cursor-pointer">
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shelf */}
          <div className="lg:col-span-3 p-4 rounded-2xl bg-stone-900/70 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                <PackageSearch className="w-4 h-4" /> Depot Shelf
              </p>
              <span className="text-xs font-black text-white/60">{filtered.length} / {shelf.length} match</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[360px] overflow-y-auto">
              {shelf.map((t, i) => {
                const match = filtered.includes(t);
                return (
                  <motion.button key={i} layout
                    animate={{ opacity: match ? 1 : 0.2, scale: match ? 1 : 0.94 }}
                    onClick={() => readyToPick && match && pick(t)}
                    disabled={!readyToPick || !match}
                    className={`p-3 rounded-xl text-center border-2 cursor-pointer ${
                      match ? 'bg-white border-amber-400' : 'bg-slate-800 border-slate-700'
                    }`}>
                    <div className="text-3xl">{t.emoji}</div>
                    <p className="text-[10px] font-black text-stone-700 truncate">{t.colour} {t.type}</p>
                    <p className="text-[9px] font-bold text-stone-500 truncate">{t.size}</p>
                  </motion.button>
                );
              })}
            </div>
            {readyToPick && (
              <p className="mt-3 text-center text-sm font-black text-emerald-300">
                Now tap YOUR toy on the shelf!
              </p>
            )}
          </div>
        </div>
      </div>
    </JuiceShell>
  );
};
