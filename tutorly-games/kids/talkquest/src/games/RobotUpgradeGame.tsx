'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Battery, Cpu, Zap } from 'lucide-react';
import { scene } from '@/lib/art';
import { AudioManager } from '@/lib/audio';
import { useGameEngine, shuffle, pickN } from '@/lib/gameCore';
import { GameHUD, JuiceShell } from '@/components/GameHUD';
import { StartCard, EndCard } from './WhisperingWallGame';

interface Props { onExit: () => void; onRewardStar: () => void; }

const MODULES = [
  { id: 'story', n: 'Storyteller', e: '📖', tag: 'kind', power: 3 },
  { id: 'sing', n: 'Lullaby Singer', e: '🎵', tag: 'calm', power: 2 },
  { id: 'math', n: 'Math Helper', e: '🧮', tag: 'smart', power: 3 },
  { id: 'joke', n: 'Joke Machine', e: '🤡', tag: 'fun', power: 2 },
  { id: 'horn', n: 'Loud Horn', e: '📯', tag: 'rude', power: 4 },
  { id: 'translate', n: 'Translator', e: '🌍', tag: 'smart', power: 3 },
  { id: 'listen', n: 'Good Listener', e: '👂', tag: 'kind', power: 2 },
  { id: 'spark', n: 'Spark Blaster', e: '⚡', tag: 'rude', power: 5 },
  // Each mission tag needs at least three modules, or a level could ask for
  // three "calm" modules when the app only had one to offer.
  { id: 'blanket', n: 'Warm Blanket', e: '🧣', tag: 'calm', power: 2 },
  { id: 'hum', n: 'Quiet Humming', e: '🎶', tag: 'calm', power: 2 },
  { id: 'giggle', n: 'Giggle Box', e: '😂', tag: 'fun', power: 3 },
  { id: 'bubbles', n: 'Bubble Maker', e: '🫧', tag: 'fun', power: 2 },
  { id: 'helper', n: 'Kind Helper', e: '💗', tag: 'kind', power: 2 },
  { id: 'quiz', n: 'Quiz Friend', e: '❓', tag: 'smart', power: 2 },
];

const BRIEFS = [
  { need: 'kind', text: 'I will help a sad child at school. What should I install?', why: 'Kind modules comfort people.' },
  { need: 'calm', text: 'I must help a baby fall asleep tonight. What do I need?', why: 'Calm modules soothe.' },
  { need: 'smart', text: 'I will help with homework in two languages. Pick for me!', why: 'Smart modules explain things.' },
  { need: 'fun', text: 'I am going to a birthday party! What makes people laugh?', why: 'Fun modules entertain.' },
];

export const RobotUpgradeGame: React.FC<Props> = ({ onExit, onRewardStar }) => {
  const g = useGameEngine({ startingLives: 3, maxLevel: 8 });
  const [brief, setBrief] = useState(BRIEFS[0]);
  const [options, setOptions] = useState<typeof MODULES>([]);
  const [installed, setInstalled] = useState<string[]>([]);
  const [power, setPower] = useState(10);
  const [needed, setNeeded] = useState(2);
  const [speech, setSpeech] = useState('BZZZT! Systems online.');
  const [overload, setOverload] = useState(false);

  const newRound = (lvl: number) => {
    const b = BRIEFS[Math.floor(Math.random() * BRIEFS.length)];
    const matching = MODULES.filter(m => m.tag === b.need);
    const others = MODULES.filter(m => m.tag !== b.need);
    // Never ask for more matching modules than exist.
    const need = Math.min(3, matching.length, 1 + Math.floor(lvl / 3));
    const offered = pickN(matching, Math.max(need, 2));
    // …and always leave enough power to buy them, or the mission cannot be won.
    const cheapest = [...offered].sort((a, c) => a.power - c.power).slice(0, need)
      .reduce((sum, m) => sum + m.power, 0);
    setBrief(b);
    setNeeded(need);
    setOptions(shuffle([...offered, ...pickN(others, Math.min(4, 2 + Math.floor(lvl / 2)))]));
    setInstalled([]);
    setPower(Math.max(cheapest, Math.max(6, 14 - lvl)));
    setOverload(false);
    setSpeech(`BZZZT! ${b.text}`);
    AudioManager.speak(b.text, 'en');
  };

  useEffect(() => { if (g.running) newRound(g.level); /* eslint-disable-next-line */ }, [g.level, g.running]);

  const install = (m: typeof MODULES[number]) => {
    if (installed.includes(m.id)) return;
    if (m.power > power) {
      setOverload(true);
      AudioManager.playSound('alarm');
      setSpeech('BZZZT! NOT ENOUGH POWER! Choose a smaller module!');
      g.triggerShake(12);
      setTimeout(() => setOverload(false), 900);
      return;
    }

    const good = m.tag === brief.need;
    setPower(p => p - m.power);
    setInstalled(list => [...list, m.id]);

    if (good) {
      AudioManager.playSound('powerup');
      setSpeech(`BZZZT! ${m.n} installed. ${brief.why}`);
      g.registerHit(140);
      onRewardStar();
      const count = installed.filter(id => MODULES.find(x => x.id === id)?.tag === brief.need).length + 1;
      if (count >= needed) {
        AudioManager.playSound('fanfare');
        setTimeout(() => g.advanceLevel(), 1100);
      }
    } else {
      AudioManager.playSound('robot');
      setSpeech(`BZZZT! ${m.n} does not fit this mission. Tell me WHY it is wrong!`);
      g.registerMiss(true);
    }
  };

  const goodInstalled = installed.filter(id => MODULES.find(x => x.id === id)?.tag === brief.need).length;

  if (!g.running && !g.gameOver && !g.victory) {
    return <StartCard title="Robot-Friend Upgrade Lab" img={scene('robot-lab')} tag="Resource Budget · Reasoning · Debate"
      rules={[
        'Beep-Boop tells you his mission. Listen carefully!',
        'Pick the modules that match the mission: kind, calm, smart or fun.',
        'Every module uses POWER. The battery is smaller at every level.',
        'Say WHY you chose each module out loud — that is the real game!',
      ]}
      onStart={g.start} onExit={onExit} />;
  }
  if (g.gameOver || g.victory) return <EndCard victory={g.victory} score={g.score} best={g.bestCombo} onAgain={g.start} onExit={onExit} />;

  return (
    <JuiceShell shake={g.shake} hitStop={g.hitStop} className="space-y-3">
      <GameHUD title="Robot Upgrade Lab" score={g.score} combo={g.combo} multiplier={g.multiplier}
        lives={g.lives} level={g.level} levelLabel={g.band.label} timeLeft={g.timeLeft}
        timeLimit={g.band.timeLimit} floaters={g.floaters} onExit={() => { g.stop(); onExit(); }} />

      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[520px] border border-white/10">
        <img src={scene('robot-lab')} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/75" />

        <div className="relative z-10 p-5 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Robot */}
          <div className="text-center">
            <motion.svg width="200" height="240" viewBox="0 0 100 120" className="mx-auto"
              animate={overload ? { x: [-4, 4, -4, 0] } : {}} transition={{ duration: 0.3 }}>
              <line x1="50" y1="8" x2="50" y2="24" stroke="#94a3b8" strokeWidth="2" />
              <motion.circle cx="50" cy="6" r="4" fill={overload ? '#ef4444' : '#fbbf24'}
                animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }} />
              <rect x="25" y="24" width="50" height="34" rx="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
              <rect x="34" y="31" width="32" height="16" rx="3" fill={overload ? '#ef4444' : '#0ea5e9'} />
              <circle cx="43" cy="39" r="2.5" fill="#fff" /><circle cx="57" cy="39" r="2.5" fill="#fff" />
              <rect x="20" y="63" width="60" height="46" rx="10" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
              {/* Slots */}
              {[0, 1, 2].map(i => {
                const id = installed[i];
                const mod = MODULES.find(m => m.id === id);
                const good = mod && mod.tag === brief.need;
                return (
                  <rect key={i} x={26 + (i % 2) * 26} y={70 + Math.floor(i / 2) * 18} width="22" height="14" rx="3"
                    fill={mod ? (good ? '#10b981' : '#ef4444') : '#94a3b8'} opacity={mod ? 1 : 0.35} />
                );
              })}
              <rect x="8" y="68" width="8" height="28" rx="4" fill="#94a3b8" />
              <rect x="84" y="68" width="8" height="28" rx="4" fill="#94a3b8" />
            </motion.svg>

            {/* Keyed, not wrapped in `mode="wait"`: see LessonPlayer — a nested
                waiting AnimatePresence can leave the robot's line blank. */}
            <div key={speech}>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-sm bg-white rounded-2xl px-5 py-3 shadow-xl">
                <p className="font-black text-slate-800 text-sm">{speech}</p>
                <button onClick={() => AudioManager.speak(speech.replace('BZZZT!', ''), 'en')}
                  className="mt-1 text-xs font-black text-cyan-700 cursor-pointer inline-flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> hear
                </button>
              </motion.div>
            </div>
          </div>

          {/* Budget + modules */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-2xl border ${overload ? 'bg-rose-500/25 border-rose-400' : 'bg-slate-900/70 border-cyan-400/25'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300 mb-1 flex items-center gap-1">
                  <Battery className="w-3 h-3" /> Power Left
                </p>
                <p className="text-2xl font-black text-white">{power}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/70 border border-emerald-400/25">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-1 flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> Correct Modules
                </p>
                <p className="text-2xl font-black text-white">{goodInstalled} / {needed}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-400/15 border border-amber-400/30">
              <p className="text-xs font-black text-amber-200">
                Mission type: <span className="uppercase">{brief.need}</span> — pick modules that match!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {options.map(m => {
                const used = installed.includes(m.id);
                const tooExpensive = m.power > power;
                return (
                  <motion.button key={m.id} whileHover={{ scale: used ? 1 : 1.04 }} whileTap={{ scale: 0.95 }}
                    onClick={() => install(m)} disabled={used}
                    className={`p-3 rounded-2xl text-left shadow-lg cursor-pointer transition ${
                      used ? 'bg-slate-700 opacity-45' : tooExpensive ? 'bg-rose-100' : 'bg-white/95'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{m.e}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-800 truncate">{m.n}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase">{m.tag}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${tooExpensive ? 'bg-rose-500 text-white' : 'bg-slate-800 text-white'}`}>
                        ⚡{m.power}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </JuiceShell>
  );
};
