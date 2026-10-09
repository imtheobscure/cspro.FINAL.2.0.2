import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { BadgeRarity } from '../types';
import type { TargetAndTransition } from 'framer-motion';

interface RarityStyle {
  glow: string;
  ring: string;
  label: string;
  animate?: TargetAndTransition;
}

const RARITY_STYLES: Record<BadgeRarity, RarityStyle> = {
  common:    { glow: '0 0 8px rgba(156,163,175,0.5)',  ring: 'ring-gray-400',   label: 'Common' },
  rare:      { glow: '0 0 12px rgba(59,130,246,0.7)',  ring: 'ring-blue-400',   label: 'Rare' },
  epic:      { glow: '0 0 16px rgba(168,85,247,0.8)',  ring: 'ring-purple-400', label: 'Epic',
               animate: { boxShadow: ['0 0 10px rgba(168,85,247,0.5)', '0 0 25px rgba(168,85,247,0.9)', '0 0 10px rgba(168,85,247,0.5)'] } as TargetAndTransition },
  legendary: { glow: '0 0 20px rgba(255,215,0,0.9)',   ring: 'ring-yellow-400', label: 'Legendary',
               animate: { y: [0, -4, 0], boxShadow: ['0 0 15px rgba(255,215,0,0.6)', '0 0 35px rgba(255,215,0,1)', '0 0 15px rgba(255,215,0,0.6)'] } as TargetAndTransition },
};

export const XPBar: React.FC = () => {
  const { learner, lesson } = useStore();
  const pointsToLevelUp = lesson?.globalSettings?.pointsToLevelUp ?? 500;
  const xpInLevel = learner.xp % pointsToLevelUp;
  const pct = (xpInLevel / pointsToLevelUp) * 100;

  return (
    <div className="flex items-center gap-3 bg-gray-900/80 rounded-2xl px-4 py-2.5 border border-gray-700/50 backdrop-blur-sm">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-black text-sm">Lv.{learner.level}</span>
          <span className="text-gray-400 text-xs hidden sm:inline">{learner.name || 'Learner'}</span>
          <span className="text-yellow-400 text-xs font-bold">{learner.xp} XP</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full w-28 md:w-36 overflow-hidden mt-1">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #ffd700, #ff6b35)' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
      {learner.streak > 0 && (
        <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/50 rounded-xl px-2 py-1">
          <span className="text-lg">🔥</span>
          <span className="text-orange-400 font-black text-sm">{learner.streak}</span>
        </div>
      )}
    </div>
  );
};

export const BadgeDisplay: React.FC = () => {
  const { learner, lesson } = useStore();
  const badges = lesson?.badges ?? [];
  const earned = badges.filter(b => learner.badges.includes(b.id));

  if (earned.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {earned.map(badge => {
        const style = RARITY_STYLES[badge.rarity];
        return (
          <motion.div
            key={badge.id}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ring-2 ${style.ring} cursor-pointer`}
            style={{ boxShadow: style.glow }}
            animate={style.animate}
            transition={{ duration: 2, repeat: Infinity }}
            title={`${badge.name} (${style.label}) - ${badge.description}`}
          >
            {badge.emoji}
          </motion.div>
        );
      })}
    </div>
  );
};

export const BadgeModal: React.FC = () => {
  const { showBadgeModal, setShowBadgeModal, lesson } = useStore();
  const badge = lesson?.badges.find(b => b.id === showBadgeModal);
  if (!badge) return null;
  const style = RARITY_STYLES[badge.rarity];

  return (
    <AnimatePresence>
      {showBadgeModal && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setShowBadgeModal(null)}
        >
          <motion.div
            className="bg-gray-900 border-2 border-yellow-500 rounded-3xl p-8 text-center max-w-sm mx-4 shadow-2xl"
            style={{ boxShadow: style.glow }}
            initial={{ scale: 0.5, rotateY: -180 }}
            animate={{ scale: 1, rotateY: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120 }}
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              className="text-7xl mb-4"
              animate={style.animate}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {badge.emoji}
            </motion.div>
            <div className={`text-xs font-black uppercase tracking-widest mb-2 ${
              badge.rarity === 'legendary' ? 'text-yellow-400' :
              badge.rarity === 'epic' ? 'text-purple-400' :
              badge.rarity === 'rare' ? 'text-blue-400' : 'text-gray-400'
            }`}>
              ✨ {style.label} Badge Unlocked!
            </div>
            <h3 className="text-2xl font-black text-white mb-2">{badge.name}</h3>
            <p className="text-gray-400 text-sm mb-6">{badge.description}</p>
            <motion.button
              onClick={() => setShowBadgeModal(null)}
              className="px-8 py-3 rounded-xl font-black text-black"
              style={{ background: 'linear-gradient(135deg, #ffd700, #ff6b35)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Awesome! 🎉
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const Leaderboard: React.FC = () => {
  const { leaderboard, showLeaderboard, setShowLeaderboard } = useStore();

  return (
    <AnimatePresence>
      {showLeaderboard && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setShowLeaderboard(false)}
        >
          <motion.div
            className="bg-gray-950 border border-yellow-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-2xl font-black text-center mb-6" style={{ background: 'linear-gradient(135deg, #ffd700, #ff6b35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🏆 Leaderboard
            </h3>
            <div className="space-y-3">
              {[...leaderboard]
                .sort((a, b) => b.xp - a.xp)
                .slice(0, 6)
                .map((entry, i) => (
                <motion.div
                  key={entry.name + i}
                  className={`flex items-center gap-4 p-3 rounded-xl ${entry.isPlayer ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-gray-900'}`}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <span className="text-2xl font-black text-gray-400 w-8 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <span className="text-3xl">{entry.avatar}</span>
                  <div className="flex-1">
                    <div className={`font-bold text-sm ${entry.isPlayer ? 'text-yellow-400' : 'text-white'}`}>
                      {entry.name} {entry.isPlayer && '(You)'}
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: entry.isPlayer ? 'linear-gradient(90deg, #ffd700, #ff6b35)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (entry.xp / 5000) * 100)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                  <span className={`font-black text-sm ${entry.isPlayer ? 'text-yellow-400' : 'text-gray-300'}`}>{entry.xp.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>
            <button
              onClick={() => setShowLeaderboard(false)}
              className="mt-6 w-full py-3 rounded-xl font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
