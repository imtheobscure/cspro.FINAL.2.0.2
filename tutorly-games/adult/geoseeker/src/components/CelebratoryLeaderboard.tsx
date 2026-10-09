import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Home, Medal, Award, Crown } from 'lucide-react';
import { Player } from '../types';

interface CelebratoryLeaderboardProps {
  players: Player[];
  onMainMenu: () => void;
}

export default function CelebratoryLeaderboard({ players, onMainMenu }: CelebratoryLeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden font-sans">
      {/* Decorative Lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-600/30 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      {/* Confetti simulation using spans */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-sm"
            style={{
              width: Math.random() * 8 + 4 + 'px',
              height: Math.random() * 12 + 6 + 'px',
              backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#a855f7'][Math.floor(Math.random() * 5)],
              left: Math.random() * 100 + '%',
              top: -20
            }}
            animate={{
              y: ['0vh', '100vh'],
              x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 300],
              rotate: [0, Math.random() * 360 * 5]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl w-full p-8 flex flex-col items-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
          className="flex flex-col items-center text-center mb-12"
        >
          <Trophy className="w-24 h-24 text-amber-400 mb-6 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]" />
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 drop-shadow-sm mb-4">
            TOURNAMENT COMPLETE
          </h1>
          <p className="text-xl text-slate-300 font-medium">The world has been explored. Let's see the standings!</p>
        </motion.div>

        <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl space-y-4">
          {sortedPlayers.map((player, idx) => (
            <motion.div 
              key={player.id}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + (idx * 0.2) }}
              className={`flex items-center justify-between p-4 rounded-2xl border ${idx === 0 ? 'bg-gradient-to-r from-amber-900/40 to-amber-950 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-slate-800/50 border-slate-700'}`}
            >
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center w-12 h-12">
                  {idx === 0 && <Crown className="absolute -top-4 w-6 h-6 text-amber-400 drop-shadow-md z-10" />}
                  <div className={`w-12 h-12 rounded-full overflow-hidden border-2 flex-shrink-0 bg-slate-800 ${idx === 0 ? 'border-amber-400' : idx === 1 ? 'border-slate-300' : idx === 2 ? 'border-amber-700' : 'border-slate-600'}`}>
                    <img src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(player.name)}`} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div>
                  <h3 className={`text-xl font-black ${idx === 0 ? 'text-amber-300' : 'text-white'}`}>{player.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">Rank #{idx + 1}</p>
                </div>
              </div>
              <div className="text-right">
                <h4 className={`text-2xl font-mono font-black ${idx === 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                  {player.score.toLocaleString()}
                </h4>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Points</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-12"
        >
          <button
            onClick={onMainMenu}
            className="flex items-center gap-3 bg-sky-600 hover:bg-sky-500 text-white font-black px-8 py-4 rounded-full shadow-xl shadow-sky-600/30 transition-transform hover:scale-105 active:scale-95 text-lg"
          >
            <Home className="w-6 h-6" /> Back to Main Menu
          </button>
        </motion.div>
      </div>
    </div>
  );
}
