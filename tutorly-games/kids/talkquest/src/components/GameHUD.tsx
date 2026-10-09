'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Zap, Timer, Trophy, ArrowLeft, Flame } from 'lucide-react';

interface Props {
  title: string;
  score: number;
  combo: number;
  multiplier: number;
  lives: number;
  maxLives?: number;
  level: number;
  levelLabel: string;
  timeLeft: number;
  timeLimit: number;
  floaters: { id: number; text: string; tone: 'good' | 'bad' | 'epic' }[];
  onExit: () => void;
}

export const GameHUD: React.FC<Props> = ({
  title, score, combo, multiplier, lives, maxLives = 3,
  level, levelLabel, timeLeft, timeLimit, floaters, onExit,
}) => {
  const pct = Math.max(0, Math.min(100, (timeLeft / Math.max(1, timeLimit)) * 100));
  const danger = timeLeft <= 5;

  return (
    <div className="relative z-30">
      <div className="flex flex-wrap items-center gap-2 md:gap-3 p-3 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-white/10 shadow-xl">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition"
        >
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>

        <span className="hidden md:block text-sm font-black text-white/90 truncate max-w-[180px]">{title}</span>

        {/* Lives */}
        <div className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/10">
          {Array.from({ length: maxLives }).map((_, i) => (
            <motion.span
              key={i}
              animate={i < lives ? { scale: [1, 1.18, 1] } : { scale: 1 }}
              transition={{ duration: 1.4, repeat: i < lives ? Infinity : 0, delay: i * 0.2 }}
            >
              <Heart className={`w-4 h-4 ${i < lives ? 'text-rose-400 fill-rose-400' : 'text-white/20'}`} />
            </motion.span>
          ))}
        </div>

        {/* Score */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400/20 border border-amber-300/30">
          <Trophy className="w-4 h-4 text-amber-300" />
          <motion.span key={score} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-sm font-black text-amber-200 tabular-nums">
            {score.toLocaleString()}
          </motion.span>
        </div>

        {/* Combo */}
        <AnimatePresence>
          {combo > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-sm ${
                multiplier >= 4 ? 'bg-fuchsia-500 text-white' :
                multiplier >= 3 ? 'bg-orange-500 text-white' :
                multiplier >= 2 ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-white'
              }`}
            >
              <Flame className="w-4 h-4" /> {combo} <span className="opacity-80">×{multiplier}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Level */}
        <div className="px-3 py-2 rounded-xl bg-indigo-500/25 border border-indigo-300/30">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Lv {level}</span>
          <span className="ml-1.5 text-[10px] font-black text-white/80">{levelLabel}</span>
        </div>

        {/* Timer */}
        <div className="flex-1 min-w-[120px] flex items-center gap-2">
          <Timer className={`w-4 h-4 ${danger ? 'text-rose-400' : 'text-white/60'}`} />
          <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${danger ? 'bg-rose-500' : pct < 40 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <motion.span
            animate={danger ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={{ duration: 0.5, repeat: danger ? Infinity : 0 }}
            className={`text-sm font-black tabular-nums ${danger ? 'text-rose-300' : 'text-white/80'}`}
          >
            {Math.max(0, timeLeft)}s
          </motion.span>
        </div>
      </div>

      {/* Floating score popups */}
      <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center">
        <AnimatePresence>
          {floaters.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 10, scale: 0.6 }}
              animate={{ opacity: 1, y: -46 - i * 8, scale: f.tone === 'epic' ? 1.35 : 1 }}
              exit={{ opacity: 0, y: -90 }}
              transition={{ duration: 0.9 }}
              className={`absolute font-black text-2xl drop-shadow-lg ${
                f.tone === 'epic' ? 'text-fuchsia-300' : f.tone === 'bad' ? 'text-rose-400' : 'text-emerald-300'
              }`}
            >
              {f.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

/** Wraps game content and applies screen-shake + hit-stop (game-feel skill). */
export const JuiceShell: React.FC<{
  shake: number; hitStop: boolean; children: React.ReactNode; className?: string;
}> = ({ shake, hitStop, children, className = '' }) => (
  <motion.div
    animate={shake > 0 ? { x: [0, -shake, shake, -shake * 0.6, 0], y: [0, shake * 0.4, -shake * 0.4, 0] } : { x: 0, y: 0 }}
    transition={{ duration: 0.26 }}
    style={{ filter: hitStop ? 'brightness(1.5) saturate(1.3)' : 'none' }}
    className={className}
  >
    {children}
  </motion.div>
);
