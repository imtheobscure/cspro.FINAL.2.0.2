'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { scene } from '@/lib/art';
import { AudioManager } from '@/lib/audio';
import { useGameEngine } from '@/lib/gameCore';
import { GameHUD, JuiceShell } from '@/components/GameHUD';
import { StartCard, EndCard } from './WhisperingWallGame';
import { CuteMonster, MonsterMood } from '@/components/CuteMonster';

interface Props { onExit: () => void; onRewardStar: () => void; }

/** Utility-AI style needs model (game-ai skill): three drives decay over time. */
interface Needs { hunger: number; comfort: number; sleep: number }

const ACTIONS = [
  { id: 'feed', label: 'Warm Milk', icon: '🍼', affects: 'hunger', say: 'Say: "Here is your warm milk, Gloop."' },
  { id: 'rock', label: 'Rock Gently', icon: '🤱', affects: 'comfort', say: 'Say softly: "There there, you are safe."' },
  { id: 'sing', label: 'Sing Lullaby', icon: '🎵', affects: 'sleep', say: 'Sing: "Twinkle twinkle little star…"' },
  { id: 'blanket', label: 'Star Blanket', icon: '🌟', affects: 'comfort', say: 'Say: "Here is your cosy blanket."' },
  { id: 'snack', label: 'Berry Snack', icon: '🫐', affects: 'hunger', say: 'Say: "Yummy berries for you!"' },
  { id: 'story', label: 'Tell a Story', icon: '📖', affects: 'sleep', say: 'Say: "Once upon a time…"' },
] as const;

const NEED_LABEL: Record<keyof Needs, { label: string; emoji: string; colour: string }> = {
  hunger: { label: 'Hungry', emoji: '🍼', colour: 'bg-amber-500' },
  comfort: { label: 'Needs Cuddles', emoji: '🤱', colour: 'bg-rose-500' },
  sleep: { label: 'Sleepy', emoji: '😴', colour: 'bg-indigo-500' },
};

export const MonsterBabysitterGame: React.FC<Props> = ({ onExit, onRewardStar }) => {
  const g = useGameEngine({ startingLives: 3, maxLevel: 8, comboDecayMs: 8000 });
  const [needs, setNeeds] = useState<Needs>({ hunger: 80, comfort: 80, sleep: 80 });
  const [calmHeld, setCalmHeld] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [speech, setSpeech] = useState('Waaah! I need something!');

  /** The numbers the game logic reads; state is only what we draw. */
  const needsRef = useRef<Needs>(needs);
  const calmRef = useRef(0);
  const setNeedsTo = useCallback((next: Needs) => {
    needsRef.current = next;
    setNeeds(next);
  }, []);

  const urgent = (Object.keys(needs) as (keyof Needs)[])
    .reduce((a, b) => needs[a] < needs[b] ? a : b);

  useEffect(() => {
    if (!g.running) return;
    setNeedsTo({ hunger: 80, comfort: 80, sleep: 80 });
    calmRef.current = 0;
    setCalmHeld(0);
  }, [g.level, g.running, setNeedsTo]);

  // Needs decay — faster each level. Slower than it used to be, and one action
  // now lifts all three bars a little: with three bars draining and one action
  // feeding one bar, the old numbers made a calm level arithmetically
  // impossible from about level 4.
  useEffect(() => {
    if (!g.running) return;
    const rate = 1.2 + g.level * 0.4;
    const id = setInterval(() => {
      const n = needsRef.current;
      const next: Needs = {
        hunger: Math.max(0, n.hunger - rate * (0.7 + Math.random() * 0.6)),
        comfort: Math.max(0, n.comfort - rate * (0.7 + Math.random() * 0.6)),
        sleep: Math.max(0, n.sleep - rate * (0.7 + Math.random() * 0.6)),
      };
      const lowest = Math.min(next.hunger, next.comfort, next.sleep);
      if (lowest <= 0) {
        AudioManager.playSound('alarm');
        g.registerMiss(true);
        setNeedsTo({ hunger: 60, comfort: 60, sleep: 60 });
        return;
      }
      if (lowest < 25) AudioManager.playSound('heartbeat');
      setNeedsTo(next);
    }, 1200);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [g.running, g.level, g.registerMiss, setNeedsTo]);

  // Finish the level by keeping all three needs comfortable for five ticks.
  useEffect(() => {
    if (!g.running) return;
    const id = setTimeout(() => {
      const n = needsRef.current;
      const allCalm = n.hunger > 62 && n.comfort > 62 && n.sleep > 62;
      calmRef.current = allCalm ? calmRef.current + 1 : 0;
      setCalmHeld(calmRef.current);
      if (calmRef.current >= 5) {
        calmRef.current = 0;
        AudioManager.playSound('fanfare');
        onRewardStar();
        g.advanceLevel();
      }
    }, 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [needs, g.running, g.advanceLevel, onRewardStar]);

  useEffect(() => {
    setSpeech(needs[urgent] < 35
      ? `WAAAH! I am so ${NEED_LABEL[urgent].label.toLowerCase()}!`
      : `Hmm… I feel a bit ${NEED_LABEL[urgent].label.toLowerCase()}.`);
  }, [urgent, needs]);

  const doAction = (a: typeof ACTIONS[number]) => {
    if (busy) return;
    setBusy(a.id);
    AudioManager.playSound('pop');
    AudioManager.speak(a.say.replace(/^(Say|Sing)[^:]*:\s*/, ''), 'en');

    setTimeout(() => {
      const key = a.affects as keyof Needs;
      const correct = key === urgent;
      const n = needsRef.current;
      const next: Needs = { ...n, [key]: Math.min(100, n[key] + (correct ? 45 : 16)) };
      // Comfort leaks into the other two bars, so a good carer can hold the calm.
      for (const other of Object.keys(next) as (keyof Needs)[]) {
        if (other !== key) next[other] = Math.min(100, next[other] + (correct ? 10 : 4));
      }
      setNeedsTo(next);
      if (correct) { g.registerHit(120); onRewardStar(); }
      else { AudioManager.playSound('select'); g.pushFloater('+ a little', 'good'); }
      setBusy(null);
    }, 850);
  };

  const moodScore = (needs.hunger + needs.comfort + needs.sleep) / 3;
  const face: MonsterMood =
    moodScore > 78 ? 'sleepy' : moodScore > 62 ? 'happy' : moodScore > 45 ? 'ok' : moodScore > 28 ? 'sad' : 'crying';

  if (!g.running && !g.gameOver && !g.victory) {
    return <StartCard title="Monster-Babysitter" img={scene('monster-baby')} tag="Needs Simulation · Triage · Soothing Talk"
      rules={[
        'Baby Gloop has THREE needs: hungry, cuddles and sleepy.',
        'All three bars go down together, and faster at every level.',
        'Pick the action that helps his MOST urgent need to score the most.',
        'Say the kind words out loud every time you help him!',
        'Keep all three bars comfortable for a few seconds to finish the level.',
      ]}
      onStart={g.start} onExit={onExit} />;
  }
  if (g.gameOver || g.victory) return <EndCard victory={g.victory} score={g.score} best={g.bestCombo} onAgain={g.start} onExit={onExit} />;

  return (
    <JuiceShell shake={g.shake} hitStop={g.hitStop} className="space-y-3">
      <GameHUD title="Monster Babysitter" score={g.score} combo={g.combo} multiplier={g.multiplier}
        lives={g.lives} level={g.level} levelLabel={g.band.label} timeLeft={g.timeLeft}
        timeLimit={g.band.timeLimit} floaters={g.floaters} onExit={() => { g.stop(); onExit(); }} />

      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[520px] border border-white/10">
        <img src={scene('monster-baby')} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/70" />

        <div className="relative z-10 p-5 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Monster */}
          <div className="text-center">
            <CuteMonster mood={face} rocking={busy === 'rock'} size={280} />

            <div className="mt-2 inline-block bg-white rounded-2xl px-5 py-3 shadow-xl max-w-xs">
              <p className="font-black text-slate-800">{speech}</p>
              <button onClick={() => AudioManager.speak(speech, 'en')} className="mt-1 text-xs font-bold text-indigo-600 cursor-pointer inline-flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> hear
              </button>
            </div>
          </div>

          {/* Needs + actions */}
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
              {(Object.keys(needs) as (keyof Needs)[]).map(k => {
                const v = needs[k]; const meta = NEED_LABEL[k]; const isUrgent = k === urgent;
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-black uppercase tracking-wider ${isUrgent ? 'text-rose-300' : 'text-white/70'}`}>
                        {meta.emoji} {meta.label} {isUrgent && '← most urgent!'}
                      </span>
                      <span className="text-xs font-black text-white/60">{Math.round(v)}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                      <motion.div className={`h-full ${v < 30 ? 'bg-rose-500' : v < 60 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        animate={{ width: `${v}%` }} transition={{ duration: 0.4 }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-1">
                <p className="text-[11px] font-black text-emerald-300">Calm streak: {calmHeld} / 5</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ACTIONS.map(a => (
                <motion.button key={a.id} whileHover={{ scale: busy ? 1 : 1.04 }} whileTap={{ scale: 0.95 }}
                  onClick={() => doAction(a)} disabled={!!busy}
                  className="p-3 rounded-2xl bg-white/95 text-left shadow-lg cursor-pointer disabled:opacity-50">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{a.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{a.label}</p>
                      <p className="text-[10px] font-bold text-slate-500 truncate">{a.say}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </JuiceShell>
  );
};
