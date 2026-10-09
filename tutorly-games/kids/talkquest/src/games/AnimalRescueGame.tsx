'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, ArrowLeft as AL, ArrowRight as AR, Radio, Volume2, Droplets } from 'lucide-react';
import { scene } from '@/lib/art';
import { AudioManager } from '@/lib/audio';
import { useGameEngine } from '@/lib/gameCore';
import { GameHUD, JuiceShell } from '@/components/GameHUD';
import { StartCard, EndCard } from './WhisperingWallGame';

interface Props { onExit: () => void; onRewardStar: () => void; }

type Cell = 'path' | 'tree' | 'river' | 'home' | 'berry' | 'hazard';

/** Procedural maze generation (procedural-gen skill): random walk carve + hazards. */
function genMaze(size: number, level: number): { grid: Cell[][]; start: [number, number]; home: [number, number]; spine: Set<string> } {
  const grid: Cell[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => 'tree' as Cell));
  let r = 0, c = 0;
  grid[0][0] = 'path';
  /** The trail the random walk actually took — the safe route home. */
  const spine = new Set<string>(['0,0']);

  const steps = size * size * 2;
  for (let i = 0; i < steps; i++) {
    const dir = Math.floor(Math.random() * 4);
    if (dir === 0 && r > 0) r--;
    else if (dir === 1 && r < size - 1) r++;
    else if (dir === 2 && c > 0) c--;
    else if (dir === 3 && c < size - 1) c++;
    grid[r][c] = 'path';
    spine.add(`${r},${c}`);
  }

  // Connect the end of the walk to the far corner. Without this the walk could
  // stop somewhere in the middle and the level had NO way home at all — the
  // child was left bumping into trees, and the only exits were a hazard or the
  // clock. The route is walked out in full and recorded on the spine.
  while (r < size - 1) { r++; grid[r][c] = 'path'; spine.add(`${r},${c}`); }
  while (c < size - 1) { c++; grid[r][c] = 'path'; spine.add(`${r},${c}`); }
  grid[size - 1][size - 1] = 'home';

  const offSpine: [number, number][] = [];
  const onSpine: [number, number][] = [];
  grid.forEach((row, ri) => row.forEach((cell, ci) => {
    if (cell !== 'path') return;
    if (ri === 0 && ci === 0) return;
    (spine.has(`${ri},${ci}`) ? onSpine : offSpine).push([ri, ci]);
  }));

  // Hazards go BESIDE the safe route, never ON it — a river across the only way
  // through made a level impossible to finish.
  const hazards = Math.min(6, 1 + Math.floor(level / 1.5));
  const berries = Math.max(1, 3 - Math.floor(level / 4));
  for (let i = 0; i < hazards && offSpine.length; i++) {
    const idx = Math.floor(Math.random() * offSpine.length);
    const [hr, hc] = offSpine.splice(idx, 1)[0];
    if (grid[hr][hc] === 'path') grid[hr][hc] = Math.random() > 0.5 ? 'river' : 'hazard';
  }
  // Berries sit on the safe route, so every one of them can be reached.
  for (let i = 0; i < berries && onSpine.length; i++) {
    const idx = Math.floor(Math.random() * onSpine.length);
    const [br, bc] = onSpine.splice(idx, 1)[0];
    if (grid[br][bc] === 'path') grid[br][bc] = 'berry';
  }
  return { grid, start: [0, 0], home: [size - 1, size - 1], spine };
}

const CUB_LINES = [
  'Krrzzt! Which way now? Tell me!',
  'Krrzzt! I hear water nearby!',
  'Krrzzt! It is getting dark, hurry!',
  'Krrzzt! My paws are tired!',
  'Krrzzt! I see berries! Yum!',
];

export const AnimalRescueGame: React.FC<Props> = ({ onExit, onRewardStar }) => {
  const g = useGameEngine({ startingLives: 3, maxLevel: 8 });
  const size = Math.min(7, 4 + Math.floor(g.level / 2));
  const [maze, setMaze] = useState(() => genMaze(5, 1));
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [fog, setFog] = useState(true);
  const [radio, setRadio] = useState(CUB_LINES[0]);
  const [moves, setMoves] = useState(0);
  /** Cells that have already hurt the cub this level, so one puddle costs one life. */
  const bumped = useRef<Set<string>>(new Set());

  const reset = useCallback((lvl: number) => {
    const s = Math.min(7, 4 + Math.floor(lvl / 2));
    const m = genMaze(s, lvl);
    setMaze(m); setPos([0, 0]); setMoves(0);
    bumped.current = new Set();
    setFog(lvl >= 3);
    setRadio(CUB_LINES[0]);
    AudioManager.playSound('radio');
    AudioManager.speak('Base camp, this is Barnaby Bear! I am lost! Guide me home!', 'en');
  }, []);

  useEffect(() => { if (g.running) reset(g.level); }, [g.level, g.running, reset]);

  const move = (dir: 'up' | 'down' | 'left' | 'right') => {
    const [r, c] = pos;
    const nr = r + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0);
    const nc = c + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
    if (nr < 0 || nc < 0 || nr >= maze.grid.length || nc >= maze.grid.length) {
      AudioManager.playSound('thud'); g.triggerShake(6); return;
    }
    const cell = maze.grid[nr][nc];
    if (cell === 'tree') { AudioManager.playSound('thud'); g.pushFloater('Blocked!', 'bad'); g.triggerShake(8); return; }
    if (cell === 'river' || cell === 'hazard') {
      // First time on a spot hurts; after that the cub just refuses to go again,
      // so a child exploring the maze cannot lose the whole game to one puddle.
      const key = `${nr},${nc}`;
      if (!bumped.current.has(key)) {
        bumped.current.add(key);
        AudioManager.playSound('wrong');
        g.registerMiss(true);
        setRadio('Krrzzt! Ouch! Not that way — try another one!');
      } else {
        AudioManager.playSound('thud');
        setRadio('Krrzzt! I am not going back in there!');
      }
      return;
    }
    AudioManager.playSound('radio');
    setPos([nr, nc]); setMoves(m => m + 1);
    setRadio(CUB_LINES[Math.floor(Math.random() * CUB_LINES.length)]);

    if (cell === 'berry') {
      const grid = maze.grid.map(row => [...row]); grid[nr][nc] = 'path';
      setMaze({ ...maze, grid });
      g.addTime(6); g.registerHit(80); onRewardStar();
      g.pushFloater('+6s Berry!', 'epic');
    } else if (cell === 'home') {
      AudioManager.playSound('fanfare');
      // Never negative: a long, careful route still has to feel like a win.
      g.registerHit(Math.max(120, 400 - moves * 5));
      onRewardStar();
      setTimeout(() => g.advanceLevel(), 900);
    } else {
      g.registerHit(30);
    }
  };

  const visible = (r: number, c: number) => {
    if (!fog) return true;
    const [pr, pc] = pos;
    return Math.abs(pr - r) + Math.abs(pc - c) <= 2;
  };

  if (!g.running && !g.gameOver && !g.victory) {
    return <StartCard title="Animal-Rescue Dispatch" img={scene('animal-rescue')} tag="Procedural Maze · Fog of War · Hazards"
      rules={[
        'Every level is a brand new forest with a safe way home.',
        'Say the direction out loud, then tap the arrow to move Barnaby.',
        'Trees block the way. Water and holes hurt him — once each.',
        'Grab 🫐 berries for +6 seconds, then reach 🏡 to finish the level.',
      ]}
      onStart={g.start} onExit={onExit} />;
  }
  if (g.gameOver || g.victory) return <EndCard victory={g.victory} score={g.score} best={g.bestCombo} onAgain={g.start} onExit={onExit} />;

  return (
    <JuiceShell shake={g.shake} hitStop={g.hitStop} className="space-y-3">
      <GameHUD title="Animal Rescue" score={g.score} combo={g.combo} multiplier={g.multiplier}
        lives={g.lives} level={g.level} levelLabel={g.band.label} timeLeft={g.timeLeft}
        timeLimit={g.band.timeLimit} floaters={g.floaters} onExit={() => { g.stop(); onExit(); }} />

      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[520px] border border-white/10">
        <img src={scene('animal-rescue')} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-emerald-950/75" />

        <div className="relative z-10 p-5 md:p-7 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Maze */}
          <div className="p-4 rounded-2xl bg-emerald-950/70 border-2 border-emerald-400/30">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Forest Grid {size}×{size}</p>
              {fog && <span className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-black text-slate-300">FOG ACTIVE</span>}
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))` }}>
              {maze.grid.map((row, r) => row.map((cell, c) => {
                const here = pos[0] === r && pos[1] === c;
                const vis = visible(r, c);
                const bg = !vis ? 'bg-slate-900/90 border-slate-800'
                  : cell === 'tree' ? 'bg-green-950 border-green-900'
                  : cell === 'river' ? 'bg-blue-600 border-blue-400'
                  : cell === 'hazard' ? 'bg-rose-700 border-rose-500'
                  : cell === 'home' ? 'bg-amber-400 border-amber-300'
                  : cell === 'berry' ? 'bg-indigo-500 border-indigo-300'
                  : 'bg-emerald-800/70 border-emerald-700';
                return (
                  <div key={`${r}-${c}`} className={`relative aspect-square rounded-lg border flex items-center justify-center text-lg ${bg}`}>
                    {vis && cell === 'tree' && '🌲'}
                    {vis && cell === 'river' && '🌊'}
                    {vis && cell === 'hazard' && '🕳️'}
                    {vis && cell === 'home' && '🏡'}
                    {vis && cell === 'berry' && '🫐'}
                    {here && <motion.span layoutId="cub" className="absolute text-2xl drop-shadow">🐻</motion.span>}
                  </div>
                );
              }))}
            </div>
            <p className="text-center text-xs font-bold text-emerald-200 mt-3">Moves: {moves}</p>
          </div>

          {/* Radio + pad */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900 border-4 border-slate-700 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <Radio className="w-7 h-7 text-amber-400" />
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Channel 4 Live
                </span>
              </div>
              <div className="relative bg-slate-950 rounded-xl p-4 min-h-[80px] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,.06)_3px,rgba(255,255,255,.06)_5px)]" />
                <motion.p key={radio} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="relative text-base font-black text-emerald-300 text-center">{radio}</motion.p>
              </div>
              <button onClick={() => AudioManager.speak(radio.replace('Krrzzt!', ''), 'en')}
                className="mt-3 w-full py-2.5 rounded-xl bg-amber-500 text-slate-900 font-black text-sm cursor-pointer flex items-center justify-center gap-2">
                <Volume2 className="w-4 h-4" /> Replay Radio
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/70 border border-emerald-400/20">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-300 text-center mb-3">
                Say the direction out loud, then tap
              </p>
              <div className="flex flex-col items-center gap-2">
                <PadBtn onClick={() => move('up')}><ArrowUp className="w-7 h-7" /></PadBtn>
                <div className="flex gap-2">
                  <PadBtn onClick={() => move('left')}><AL className="w-7 h-7" /></PadBtn>
                  <PadBtn onClick={() => move('down')}><ArrowDown className="w-7 h-7" /></PadBtn>
                  <PadBtn onClick={() => move('right')}><AR className="w-7 h-7" /></PadBtn>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </JuiceShell>
  );
};

const PadBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <motion.button whileTap={{ scale: 0.88 }} onClick={onClick}
    className="w-16 h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg cursor-pointer flex items-center justify-center">
    {children}
  </motion.button>
);
