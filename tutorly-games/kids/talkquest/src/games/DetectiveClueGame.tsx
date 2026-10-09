'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Fingerprint, ShieldQuestion, Gavel } from 'lucide-react';
import { scene } from '@/lib/art';
import { AudioManager } from '@/lib/audio';
import { useGameEngine, shuffle, pickN } from '@/lib/gameCore';
import { GameHUD, JuiceShell } from '@/components/GameHUD';
import { StartCard, EndCard } from './WhisperingWallGame';

interface Props { onExit: () => void; onRewardStar: () => void; }

const SUSPECTS = [
  { id: 'paws', n: 'Professor Paws', e: '🐱' }, { id: 'whisk', n: 'Whiskers McFluff', e: '🐰' },
  { id: 'barn', n: 'Barnaby Bear', e: '🐻' }, { id: 'quill', n: 'Quill the Hedgehog', e: '🦔' },
  { id: 'nib', n: 'Nibbles Mouse', e: '🐭' },
];

const TRAITS = {
  colour: ['red scarf', 'blue hat', 'green boots', 'yellow ribbon', 'purple gloves', 'orange bag'],
  food: ['cheese', 'carrots', 'honey', 'berries', 'apple', 'soup'],
  place: ['the garden', 'the kitchen', 'the attic', 'the library', 'the park', 'the shop'],
};

type Clue = { text: string; kind: keyof typeof TRAITS; value: string; };

/**
 * Deduction puzzle: a culprit, plus clues that identify exactly one suspect.
 *
 * The old version gave every suspect a RANDOM trait, so two of them often wore
 * the same scarf as the thief — the clues then fitted both and the case had no
 * unique answer, which is brutal for a 7-year-old. Traits are now dealt out of a
 * shuffled pool, so no two suspects share one, and the three clues that name the
 * thief's traits fit nobody else.
 */
function generateCase(level: number) {
  const count = Math.min(5, 3 + Math.floor(level / 3));
  const cast = pickN(SUSPECTS, count);
  const culprit = cast[Math.floor(Math.random() * cast.length)];

  const deal = (pool: string[]) => shuffle(pool).slice(0, count);
  const colours = deal(TRAITS.colour);
  const foods = deal(TRAITS.food);
  const places = deal(TRAITS.place);

  const assign = cast.map((s, i) => ({
    ...s,
    colour: colours[i],
    food: foods[i],
    place: places[i],
  }));
  const guilty = assign.find(a => a.id === culprit.id)!;

  const clues: Clue[] = [
    { text: `The thief wore a ${guilty.colour}.`, kind: 'colour', value: guilty.colour },
    { text: `The thief likes to eat ${guilty.food}.`, kind: 'food', value: guilty.food },
    { text: `The thief was seen in ${guilty.place}.`, kind: 'place', value: guilty.place },
  ];

  const questions = [
    { q: 'What were you wearing yesterday?', kind: 'colour' as const },
    { q: 'What is your favourite food?', kind: 'food' as const },
    { q: 'Where were you at three o’clock?', kind: 'place' as const },
  ];

  return { cast: assign, guilty, clues: shuffle(clues), questions };
}

export const DetectiveClueGame: React.FC<Props> = ({ onExit, onRewardStar }) => {
  const g = useGameEngine({ startingLives: 3, maxLevel: 8 });
  const [c, setC] = useState(() => generateCase(1));
  const [selected, setSelected] = useState<string | null>(null);
  const [asked, setAsked] = useState<Record<string, string[]>>({});
  const [reply, setReply] = useState('');
  const [revealed, setRevealed] = useState<number>(0);
  const [verdict, setVerdict] = useState<null | boolean>(null);

  useEffect(() => {
    if (!g.running) return;
    setC(generateCase(g.level));
    setSelected(null); setAsked({}); setReply(''); setRevealed(0); setVerdict(null);
    AudioManager.playSound('riser');
  }, [g.level, g.running]);

  const askQuestion = (kind: keyof typeof TRAITS, q: string) => {
    if (!selected) return;
    const done = asked[selected] ?? [];
    if (done.includes(kind)) return;

    const s = c.cast.find(x => x.id === selected)!;
    const answer = s[kind];
    const nervous = s.id === c.guilty.id ? '*looks worried* ' : '*smiles* ';
    const line = `${nervous}${kind === 'colour' ? `I wore a ${answer}.` : kind === 'food' ? `I like to eat ${answer}.` : `I was in ${answer}.`}`;
    setReply(line);
    AudioManager.speak(line.replace(/\*[^*]+\*\s*/, ''), 'en');
    setAsked(a => ({ ...a, [selected]: [...done, kind] }));
    AudioManager.playSound('select');
    // Asking a question is the skill here, but it should not pay like a correct
    // answer, or a child can farm points by interviewing everybody.
    g.registerHit(20);
  };

  const revealClue = () => {
    if (revealed >= c.clues.length) return;
    AudioManager.playSound('unlock');
    setRevealed(r => r + 1);
  };

  const accuse = (id: string) => {
    const right = id === c.guilty.id;
    setVerdict(right);
    if (right) {
      AudioManager.playSound('fanfare');
      g.registerHit(500);
      onRewardStar();
      setTimeout(() => g.advanceLevel(), 1600);
    } else {
      AudioManager.playSound('alarm');
      g.registerMiss(true);
      setTimeout(() => setVerdict(null), 1600);
    }
  };

  const suspect = selected ? c.cast.find(x => x.id === selected) : null;

  if (!g.running && !g.gameOver && !g.victory) {
    return <StartCard title="Detective Clue-Interrogators" img={scene('detective-office')} tag="Deduction · Interrogation · Elimination"
      rules={[
        'Every level is a brand new mystery with new suspects.',
        'Open the case file to see what the thief wore, ate and where they went.',
        'Ask the suspects the three questions. Compare their answers with the clues.',
        'Only ONE suspect matches all the clues. Accusing the wrong one costs a life.',
      ]}
      onStart={g.start} onExit={onExit} />;
  }
  if (g.gameOver || g.victory) return <EndCard victory={g.victory} score={g.score} best={g.bestCombo} onAgain={g.start} onExit={onExit} />;

  return (
    <JuiceShell shake={g.shake} hitStop={g.hitStop} className="space-y-3">
      <GameHUD title="Detective Office" score={g.score} combo={g.combo} multiplier={g.multiplier}
        lives={g.lives} level={g.level} levelLabel={g.band.label} timeLeft={g.timeLeft}
        timeLimit={g.band.timeLimit} floaters={g.floaters} onExit={() => { g.stop(); onExit(); }} />

      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[520px] border border-white/10">
        <img src={scene('detective-office')} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-stone-950/78" />

        <div className="relative z-10 p-5 md:p-7 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Case file */}
          <div className="p-4 rounded-2xl bg-amber-950/70 border-2 border-amber-400/30">
            <p className="text-xs font-black uppercase tracking-widest text-amber-300 mb-3 flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4" /> Case File
            </p>
            <div className="space-y-2 mb-3">
              {c.clues.map((cl, i) => (
                <div key={i} className={`p-3 rounded-xl border text-sm font-bold ${
                  i < revealed ? 'bg-amber-50 border-amber-300 text-stone-800' : 'bg-white/5 border-white/15 text-white/30'
                }`}>
                  {i < revealed ? `🔎 ${cl.text}` : '🔒 Locked clue'}
                </div>
              ))}
            </div>
            <button onClick={revealClue} disabled={revealed >= c.clues.length}
              className="w-full py-2.5 rounded-xl bg-amber-500 disabled:opacity-40 text-stone-900 font-black text-sm cursor-pointer">
              Reveal Next Clue ({revealed}/{c.clues.length})
            </button>
          </div>

          {/* Interrogation */}
          <div className="p-4 rounded-2xl bg-stone-900/80 border border-white/10">
            <p className="text-xs font-black uppercase tracking-widest text-stone-300 mb-3 flex items-center gap-1.5">
              <ShieldQuestion className="w-4 h-4" /> Interrogation
            </p>
            {suspect ? (
              <>
                <div className="text-center mb-3">
                  <div className="text-6xl">{suspect.e}</div>
                  <p className="font-black text-white">{suspect.n}</p>
                </div>
                {reply && (
                  <motion.div key={reply} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-3 mb-3">
                    <p className="text-sm font-bold text-stone-800">{reply}</p>
                  </motion.div>
                )}
                <div className="space-y-2">
                  {c.questions.map(q => {
                    const done = (asked[suspect.id] ?? []).includes(q.kind);
                    return (
                      <button key={q.kind} onClick={() => askQuestion(q.kind, q.q)} disabled={done}
                        className={`w-full p-3 rounded-xl text-left text-sm font-bold cursor-pointer ${
                          done ? 'bg-stone-800 text-stone-500 line-through' : 'bg-white/90 text-stone-800 hover:bg-white'
                        }`}>
                        “{q.q}”
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => accuse(suspect.id)}
                  className="mt-3 w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black cursor-pointer flex items-center justify-center gap-2">
                  <Gavel className="w-4 h-4" /> Accuse {suspect.n.split(' ')[0]}
                </button>
              </>
            ) : (
              <p className="text-sm text-stone-400 italic text-center py-10">Pick a suspect →</p>
            )}
          </div>

          {/* Lineup */}
          <div className="p-4 rounded-2xl bg-stone-900/80 border border-white/10">
            <p className="text-xs font-black uppercase tracking-widest text-stone-300 mb-3">Suspect Lineup</p>
            <div className="space-y-2">
              {c.cast.map(s => (
                <button key={s.id} onClick={() => { setSelected(s.id); setReply(''); AudioManager.playSound('pop'); }}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 font-black text-sm cursor-pointer transition ${
                    selected === s.id ? 'bg-amber-400 text-stone-900' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}>
                  <span className="text-2xl">{s.e}</span>
                  <span className="truncate">{s.n}</span>
                  {(asked[s.id]?.length ?? 0) > 0 && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-black/25">{asked[s.id].length}/3</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {verdict !== null && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
              <div className={`rounded-3xl p-8 text-center ${verdict ? 'bg-emerald-500' : 'bg-rose-600'}`}>
                <div className="text-6xl mb-2">{verdict ? '🎯' : '❌'}</div>
                <p className="text-2xl font-black text-white">
                  {verdict ? 'Case Solved!' : 'Wrong suspect!'}
                </p>
                <p className="text-white/85 font-bold mt-1">
                  {verdict ? 'Tell your tutor HOW you knew.' : 'Check the clues again.'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </JuiceShell>
  );
};
