import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useNarration } from '../context/NarrationContext';
import { THEME_CONFIG, generateId } from '../utils/helpers';
import { playChime } from '../utils/audio';
import type { AirdropRecord } from '../types';

export function WarRoom() {
  const { state, dispatch } = useGame();
  const { speak } = useNarration();
  const cfg = THEME_CONFIG[state.theme];
  const [airdropSent, setAirdropSent] = useState(false);

  const sendAirdrop = (label: string, rarity: 'common'|'rare'|'epic'|'legendary', xp: number, coins: number) => {
    const record: AirdropRecord = {
      id: generateId(), date: new Date().toISOString(), theme: state.theme,
      item: { id: generateId(), name: label, emoji: rarity === 'legendary' ? '💎' : rarity === 'epic' ? '💜' : rarity === 'rare' ? '💙' : '📦', rarity, cost: 0, stock: 1, atk: rarity === 'legendary' ? 20 : rarity === 'epic' ? 12 : rarity === 'rare' ? 8 : 4, def: 0, vendettaDebuff: 0, description: 'Airdrop reward.', theme: state.theme },
      xp, coins,
    };
    dispatch({ type: 'LOG_AIRDROP', payload: record });
    state.learners.filter(l => l.isAlive).forEach(l => {
      dispatch({ type: 'GRANT_XP', payload: { learnerId: l.id, amount: Math.floor(xp / state.learners.length) } });
      dispatch({ type: 'GRANT_COINS', payload: { learnerId: l.id, amount: Math.floor(coins / state.learners.length) } });
    });
    speak(`Airdrop delivered! ${label} sent to all operatives.`);
    playChime();
    setAirdropSent(true);
    setTimeout(() => setAirdropSent(false), 3000);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 pb-28 md:pb-8">
      <div>
        <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider">
          {state.theme === 'mafia' ? '🗂️' : '🌲'} War Room
        </h2>
        <p className="text-lg text-gray-400">Role assignment, airdrops & strategic operations</p>
      </div>

      {/* Upcoming events */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Daily Airdrop', icon: '📦', color: '#6622cc', desc: 'Send rewards to learners' },
          { label: 'Weekly Battle', icon: '⚔️', color: cfg.neonColor, desc: 'Launch combat in the Arena' },
          { label: 'Week', icon: '📅', color: '#cc8822', desc: `Current: Week ${state.weekNumber}` },
        ].map(e => (
          <motion.div key={e.label} whileHover={{ scale: 1.02 }}
            className="rounded-2xl border-2 p-5 text-center" style={{ borderColor: `${e.color}30`, background: `${e.color}08` }}>
            <div className="text-5xl mb-2" style={{ filter: `drop-shadow(0 0 12px ${e.color}40)` }}>{e.icon}</div>
            <h3 className="text-xl font-black text-white uppercase">{e.label}</h3>
            <p className="text-base text-gray-400 mt-1">{e.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Role Assignment */}
      <div className="rounded-2xl border-2 p-6 space-y-4" style={{ borderColor: `${cfg.neonColor}25`, background: 'rgba(10,10,20,0.9)' }}>
        <div className="flex items-center gap-4">
          <span className="text-5xl">🎲</span>
          <div>
            <h3 className="text-2xl font-black text-white">Weekly Role Assignment</h3>
            <p className="text-base text-gray-400">Randomly assign roles from all 21 {state.theme === 'mafia' ? 'Mafia' : 'Werewolf'} roles. Resets weekly level to 1.</p>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => { playChime(); speak('Shuffling roles. A new identity awaits.'); dispatch({ type: 'ASSIGN_ROLES' }); }}
          title="Randomly assign a new role to every learner"
          className="w-full py-5 rounded-xl font-black text-2xl border-2"
          style={{ borderColor: cfg.neonColor, color: '#000', background: cfg.neonColor }}>
          🎲 ASSIGN ROLES — WEEK {state.weekNumber + 1}
        </motion.button>
        <p className="text-sm text-gray-500 text-center">Career XP and Credits are preserved. Weekly role level resets.</p>
      </div>

      {/* Quick Airdrop */}
      <div className="rounded-2xl border-2 p-6 space-y-4" style={{ borderColor: '#6622cc30', background: 'rgba(10,5,25,0.9)' }}>
        <div className="flex items-center gap-4">
          <span className="text-5xl">📦</span>
          <div>
            <h3 className="text-2xl font-black text-white">Quick Airdrop</h3>
            <p className="text-base text-gray-400">Send a loot crate to all alive operatives. For AI-generated airdrops, use God Mode → AI Prompt.</p>
          </div>
        </div>

        <AnimatePresence>
          {airdropSent && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="p-4 rounded-xl bg-green-900/40 border-2 border-green-700/40 text-center">
              <span className="text-4xl">📦</span>
              <p className="font-bold text-green-300 text-xl mt-1">AIRDROP DELIVERED!</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { label: 'Common', rarity: 'common' as const, emoji: '📦', xp: 25, coins: 10, color: '#9ca3af' },
            { label: 'Rare', rarity: 'rare' as const, emoji: '💙', xp: 50, coins: 25, color: '#3b82f6' },
            { label: 'Epic', rarity: 'epic' as const, emoji: '💜', xp: 100, coins: 50, color: '#a855f7' },
            { label: 'Legendary', rarity: 'legendary' as const, emoji: '💎', xp: 200, coins: 100, color: '#fbbf24' },
          ]).map(a => (
            <motion.button key={a.rarity} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => sendAirdrop(`${a.label} Crate`, a.rarity, a.xp, a.coins)}
              title={`Send ${a.label} airdrop: +${a.xp} XP, +${a.coins} coins per learner`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 font-bold text-base transition-all"
              style={{ borderColor: `${a.color}40`, background: `${a.color}10`, color: a.color }}>
              <span className="text-4xl">{a.emoji}</span>
              <span>{a.label}</span>
              <span className="text-sm opacity-70">+{a.xp}⚡ +{a.coins}💰</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Favor Tokens */}
      <div className="rounded-2xl border-2 p-6" style={{ borderColor: '#fbbf2430', background: 'rgba(20,15,0,0.9)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-5xl">⭐</span>
            <div>
              <h3 className="text-2xl font-black text-white">Favor Tokens</h3>
              <p className="text-base text-gray-400">Spend to nudge battle outcomes</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-yellow-400">{state.tutorProfile.favorTokens}</p>
            <p className="text-sm text-gray-500">Available</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => dispatch({ type: 'UPDATE_TUTOR', payload: { favorTokens: state.tutorProfile.favorTokens + 5 } })}
            title="Add 5 favor tokens" className="flex-1 py-3 rounded-xl font-bold text-lg border-2 border-yellow-800/40 bg-yellow-900/20 text-yellow-300">+5 Tokens</button>
          <button onClick={() => dispatch({ type: 'UPDATE_TUTOR', payload: { favorTokens: Math.max(0, state.tutorProfile.favorTokens - 1) } })}
            title="Spend 1 favor token" className="px-6 py-3 rounded-xl font-bold text-lg border-2 border-gray-700 text-gray-400">-1 Spend</button>
        </div>
      </div>

      {/* Airdrop History */}
      {state.airdropHistory.length > 0 && (
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-3">📜 Airdrop History</h3>
          <div className="space-y-2">
            {state.airdropHistory.slice(0, 5).map(drop => (
              <div key={drop.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-800/50 bg-gray-900/50">
                <span className="text-3xl">{drop.item.emoji}</span>
                <div>
                  <p className="text-lg font-bold text-white">{drop.item.name}</p>
                  <p className="text-sm text-gray-500">{new Date(drop.date).toLocaleString()} · +{drop.xp}⚡ +{drop.coins}💰</p>
                </div>
                <span className="ml-auto text-sm capitalize text-gray-400">{drop.item.rarity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
