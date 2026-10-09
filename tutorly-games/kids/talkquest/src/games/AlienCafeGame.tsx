'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Flame } from 'lucide-react';
import { scene } from '@/lib/art';
import { AudioManager } from '@/lib/audio';
import { useGameEngine, pickN } from '@/lib/gameCore';
import { GameHUD, JuiceShell } from '@/components/GameHUD';
import { StartCard, EndCard } from './WhisperingWallGame';
import { SpeakGate } from '@/components/SpeakGate';

interface Props { onExit: () => void; onRewardStar: () => void; }

const MENU = [
  { id: 'burger', n: 'Space Burger', e: '🍔' }, { id: 'pizza', n: 'Moon Pizza', e: '🍕' },
  { id: 'juice', n: 'Star Juice', e: '🧃' }, { id: 'fries', n: 'Galaxy Fries', e: '🍟' },
  { id: 'cake', n: 'Comet Cake', e: '🍰' }, { id: 'ice', n: 'Nebula Ice', e: '🍦' },
  { id: 'soup', n: 'Meteor Soup', e: '🍲' }, { id: 'donut', n: 'Orbit Donut', e: '🍩' },
];
const ALIENS = [
  { n: 'Zoggy', e: '👽', c: 'from-emerald-400 to-green-600' },
  { n: 'Blip', e: '🛸', c: 'from-fuchsia-400 to-purple-600' },
  { n: 'Grunk', e: '🤖', c: 'from-cyan-400 to-blue-600' },
  { n: 'Nix', e: '👾', c: 'from-amber-400 to-orange-600' },
];

interface Customer {
  alien: typeof ALIENS[0];
  order: { id: string; qty: number }[];
  patience: number;
  id: number;
}

export const AlienCafeGame: React.FC<Props> = ({ onExit, onRewardStar }) => {
  const g = useGameEngine({ startingLives: 3, maxLevel: 8 });
  const [queue, setQueue] = useState<Customer[]>([]);
  const [tray, setTray] = useState<{ id: string; qty: number }[]>([]);
  const [served, setServed] = useState(0);
  const [rush, setRush] = useState(false);
  const [repeated, setRepeated] = useState(false);

  const makeCustomer = (lvl: number, idx: number): Customer => {
    const itemCount = Math.min(4, 1 + Math.floor(lvl / 2));
    const items = pickN(MENU, itemCount).map(m => ({
      id: m.id,
      qty: 1 + Math.floor(Math.random() * Math.min(3, 1 + Math.floor(lvl / 3))),
    }));
    return {
      alien: ALIENS[idx % ALIENS.length],
      order: items,
      patience: patienceFor(lvl),
      id: Date.now() + idx,
    };
  };

  // Spawn wave for level (tower-defense style wave pacing)
  useEffect(() => {
    if (!g.running) return;
    const count = Math.min(4, 1 + Math.floor(g.level / 2));
    setQueue(Array.from({ length: count }, (_, i) => makeCustomer(g.level, i)));
    setTray([]);
    setRepeated(false);
    setRush(g.level >= 5);
    if (g.level >= 5) AudioManager.playSound('alarm');
    // eslint-disable-next-line
  }, [g.level, g.running]);

  // Patience drain — impatient aliens leave and cost a life
  useEffect(() => {
    if (!g.running || queue.length === 0) return;
    const id = setInterval(() => {
      setQueue(q => {
        if (!q.length) return q;
        const head = { ...q[0], patience: q[0].patience - 1 };
        if (head.patience <= 0) {
          AudioManager.playSound('thud');
          g.registerMiss(true);
          setTray([]);
          return [...q.slice(1), makeCustomer(g.level, Math.floor(Math.random() * 4))];
        }
        if (head.patience === 5) AudioManager.playSound('alarm');
        return [head, ...q.slice(1)];
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [g.running, queue.length, g.level]);

  const current = queue[0];
  /** Every customer starts with the same patience, so the bar means the same thing. */
  const patienceFor = (lvl: number) => Math.max(16, 30 - lvl * 2);

  const addItem = (id: string) => {
    if (!current || !repeated) return;
    AudioManager.playSound('pop');
    setTray(t => {
      const ex = t.find(x => x.id === id);
      return ex ? t.map(x => x.id === id ? { ...x, qty: x.qty + 1 } : x) : [...t, { id, qty: 1 }];
    });
  };

  const removeItem = (id: string) => {
    AudioManager.playSound('select');
    setTray(t => t.flatMap(x => x.id !== id ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []));
  };

  const orderLine = current
    ? current.order.map(o => `${o.qty} ${MENU.find(m => m.id === o.id)?.n}`).join(' and ')
    : '';

  useEffect(() => { setRepeated(false); }, [current?.id]);

  const serve = () => {
    if (!current) return;
    if (!repeated) {
      AudioManager.playSound('wrong');
      g.pushFloater('Say the order first!', 'bad');
      return;
    }
    const ok = current.order.length === tray.length &&
      current.order.every(o => tray.find(t => t.id === o.id)?.qty === o.qty);

    if (ok) {
      const speedBonus = Math.round(current.patience * 8);
      g.registerHit(150 + speedBonus);
      onRewardStar();
      AudioManager.playSound('coin');
      setServed(s => s + 1);
      setTray([]);
      setRepeated(false);
      const rest = queue.slice(1);
      setQueue(rest);
      if (rest.length === 0) setTimeout(() => g.advanceLevel(), 600);
    } else {
      g.registerMiss(true);
      setTray([]);
    }
  };

  const speakOrder = () => {
    if (!current) return;
    const text = current.order.map(o => `${o.qty} ${MENU.find(m => m.id === o.id)?.n}`).join(' and ');
    AudioManager.speak(`I would like ${text}, please!`, 'en');
  };

  useEffect(() => { if (current) speakOrder(); /* eslint-disable-next-line */ }, [current?.id]);

  if (!g.running && !g.gameOver && !g.victory) {
    return <StartCard
      title="Alien-Café Rush" img={scene('alien-cafe')} tag="Listening · Memory · Speed Serving"
      rules={[
        'Listen to the alien, then say the whole order out loud.',
        'Build the exact tray. The numbers matter!',
        'You cannot serve the food before you have said the order.',
        'If the patience bar runs out the alien leaves and you lose a life.',
      ]}
      onStart={g.start} onExit={onExit} />;
  }
  if (g.gameOver || g.victory) return <EndCard victory={g.victory} score={g.score} best={g.bestCombo} onAgain={g.start} onExit={onExit} />;

  return (
    <JuiceShell shake={g.shake} hitStop={g.hitStop} className="space-y-3">
      <GameHUD title="Alien Café" score={g.score} combo={g.combo} multiplier={g.multiplier}
        lives={g.lives} level={g.level} levelLabel={g.band.label} timeLeft={g.timeLeft}
        timeLimit={g.band.timeLimit} floaters={g.floaters} onExit={() => { g.stop(); onExit(); }} />

      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[520px] border border-white/10">
        <img src={scene('alien-cafe')} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/72" />

        {rush && (
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-black flex items-center gap-1.5">
            <Flame className="w-4 h-4" /> RUSH HOUR
          </motion.div>
        )}

        <div className="relative z-10 p-5 md:p-7 grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Queue */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Queue ({queue.length})</p>
            <AnimatePresence>
              {queue.slice(0, 3).map((c, i) => (
                <motion.div key={c.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: i === 0 ? 1 : 0.55, x: 0 }} exit={{ opacity: 0, x: -60 }}
                  className={`p-4 rounded-2xl border-2 ${i === 0 ? 'bg-white/95 border-amber-400' : 'bg-white/20 border-white/20'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${c.alien.c} flex items-center justify-center text-3xl shrink-0`}>{c.alien.e}</div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-black ${i === 0 ? 'text-slate-900' : 'text-white'}`}>{c.alien.n}</p>
                      {i === 0 && (
                        <p className="text-sm font-bold text-slate-700">
                          {c.order.map(o => `${o.qty}× ${MENU.find(m => m.id === o.id)?.n}`).join(', ')}
                        </p>
                      )}
                      {i === 0 && (
                        <div className="mt-1.5 h-2 rounded-full bg-slate-200 overflow-hidden">
                          {/* Scale the bar to where THIS customer started, not to a
                              hard-coded 30 — the bar used to show 66% at the
                              moment the poor alien arrived. */}
                          <motion.div className={`h-full ${c.patience < patienceFor(g.level) * 0.25 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            animate={{ width: `${(c.patience / patienceFor(g.level)) * 100}%` }} />
                        </div>
                      )}
                    </div>
                    {i === 0 && (
                      <button onClick={speakOrder} className="p-2 rounded-lg bg-slate-900 text-white cursor-pointer shrink-0">
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Tray + menu */}
          <div className="lg:col-span-3 space-y-4">
            {current && !repeated && (
              <SpeakGate
                title={`${current.alien.n} is waiting — repeat the order`}
                line={`I would like ${orderLine}, please.`}
                hint="Say the food AND the numbers."
                passLabel="Order repeated"
                onPass={() => { setRepeated(true); g.registerHit(60); onRewardStar(); }}
              />
            )}
            <div className="p-4 rounded-2xl bg-amber-950/70 border-2 border-amber-400/40 min-h-[96px]">
              <p className="text-xs font-black uppercase tracking-widest text-amber-300 mb-2">Serving Tray</p>
              <div className="flex flex-wrap gap-2">
                {tray.length === 0 && <p className="text-amber-200/50 text-sm italic">Tap food below…</p>}
                {tray.map(t => {
                  const m = MENU.find(x => x.id === t.id)!;
                  return (
                    <motion.button key={t.id} layout initial={{ scale: 0 }} animate={{ scale: 1 }}
                      onClick={() => removeItem(t.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-slate-900 font-black text-sm cursor-pointer">
                      <span className="text-xl">{m.e}</span>{m.n}
                      <span className="px-1.5 rounded bg-slate-900 text-white text-xs">×{t.qty}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MENU.map(m => (
                <motion.button key={m.id} whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.93 }}
                  onClick={() => addItem(m.id)}
                  className="p-3 rounded-2xl bg-white/95 text-center shadow-lg cursor-pointer">
                  <div className="text-3xl">{m.e}</div>
                  <p className="text-[11px] font-black text-slate-800 leading-tight mt-1">{m.n}</p>
                </motion.button>
              ))}
            </div>

            <motion.button whileTap={{ scale: 0.96 }} onClick={serve} disabled={tray.length === 0 || !repeated}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-40 text-white font-black text-lg shadow-xl cursor-pointer">
              SERVE ORDER 🚀
            </motion.button>
            <p className="text-center text-xs font-bold text-white/60">Served this run: {served}</p>
          </div>
        </div>
      </div>
    </JuiceShell>
  );
};
