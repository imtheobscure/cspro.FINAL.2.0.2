import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useNarration } from '../context/NarrationContext';
import { THEME_CONFIG } from '../utils/helpers';
import { playChime, playCardFlip } from '../utils/audio';

export function Header() {
  const { state, dispatch } = useGame();
  const { isSpeaking, isPaused, togglePause, stop } = useNarration();
  const cfg = THEME_CONFIG[state.theme];
  const isMafia = state.theme === 'mafia';
  
  // Check if there is a profile to return to in the URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const returnToProfileId = urlParams.get('returnToProfile');

  const toggleTheme = () => {
    playCardFlip();
    dispatch({ type: 'SET_THEME', payload: isMafia ? 'werewolf' : 'mafia' });
  };

  return (
    <header
      className="relative z-40 flex items-center justify-between px-3 py-2 md:px-6 md:py-3 gap-2"
      style={{
        background: isMafia
          ? 'linear-gradient(135deg, rgba(15,4,4,0.96) 0%, rgba(25,8,8,0.96) 100%)'
          : 'linear-gradient(135deg, rgba(4,15,6,0.96) 0%, rgba(8,20,10,0.96) 100%)',
        borderBottom: `2px solid ${cfg.neonColor}20`,
        backdropFilter: 'blur(30px)',
        boxShadow: `0 4px 30px rgba(0,0,0,0.5)`,
      }}
    >
      {/* LEFT: Logo + Title */}
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 min-w-0">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="cursor-pointer select-none flex-shrink-0"
          onClick={() => { playChime(); dispatch({ type: 'SET_NAV', payload: 'dashboard' }); }}
        >
          <span className="text-4xl md:text-6xl" style={{
            filter: `drop-shadow(0 0 15px ${cfg.neonColor}80)`,
          }}>
            {cfg.emoji}
          </span>
        </motion.div>
        <div className="min-w-0">
          <h1 className="text-base md:text-2xl font-black tracking-widest uppercase leading-none truncate"
            style={{ textShadow: `0 0 20px ${cfg.neonColor}60` }}>
            <span style={{ color: cfg.neonColor }}>COMBAT</span>{' '}
            <span className="text-white">ARENA</span>
          </h1>
          <p className="text-[10px] md:text-sm tracking-wider text-gray-500 uppercase font-bold truncate">
            {cfg.name} · Wk {state.weekNumber}
          </p>
        </div>
      </div>

      {/* CENTER: Pause + God Profile (desktop only) */}
      <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
        {/* Narration Pause/Stop */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isSpeaking ? togglePause : () => stop()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
          style={{
            border: `2px solid ${isSpeaking ? cfg.neonColor : '#333'}40`,
            background: isSpeaking ? `${cfg.neonColor}15` : 'rgba(20,20,30,0.5)',
          }}
        >
          {isSpeaking && !isPaused ? (
            <div className="flex gap-0.5 items-end h-5">
              {[1,2,3,4].map(i => (
                <motion.div key={i} className="w-1 rounded-full"
                  style={{ background: cfg.neonColor }}
                  animate={{ height: ['25%','100%','25%'] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </div>
          ) : (
            <span className="text-xl">{isPaused ? '▶️' : '🔇'}</span>
          )}
          <span className="text-sm font-bold" style={{ color: isSpeaking ? cfg.neonColor : '#666' }}>
            {isSpeaking ? (isPaused ? 'PLAY' : 'PAUSE') : 'MUTED'}
          </span>
        </motion.button>

        {/* God Profile */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => dispatch({ type: 'SET_NAV', payload: 'tutor' })}
          className="flex items-center gap-3 px-4 py-2 rounded-xl transition-all"
          style={{
            border: `2px solid ${cfg.neonColor}25`,
            background: `${cfg.neonColor}08`,
          }}
        >
          <span className="text-3xl" style={{ filter: `drop-shadow(0 0 10px ${cfg.neonColor}60)` }}>
            {state.tutorProfile.emoji}
          </span>
          <div className="text-left">
            <p className="text-sm font-black text-white leading-none">{state.tutorProfile.name}</p>
            <p className="text-xs text-gray-400">{state.tutorProfile.subject}</p>
          </div>
          <span className="text-lg" style={{ filter: 'drop-shadow(0 0 6px rgba(255,200,0,0.5))' }}>👑</span>
        </motion.button>
      </div>

      {/* RIGHT: Theme Toggle + Status */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-600 bg-gray-800/60 hover:bg-gray-700 text-white text-xs md:text-sm font-bold transition-all"
          onClick={() => { window.location.href = '/'; }}
        >
          <span>🏠</span> <span className="hidden md:inline">Classroom</span>
        </motion.button>

        {returnToProfileId && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-600 bg-indigo-900/60 hover:bg-indigo-800 text-white text-xs md:text-sm font-bold transition-all"
            onClick={() => { window.location.href = `/#/learner/${returnToProfileId}`; }}
          >
            <span>⬅️</span> <span className="hidden md:inline">Profile</span>
          </motion.button>
        )}

        {/* Mobile: Pause button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={isSpeaking ? togglePause : () => stop()}
          className="lg:hidden flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl"
          style={{
            border: `2px solid ${isSpeaking ? cfg.neonColor : '#333'}40`,
            background: isSpeaking ? `${cfg.neonColor}15` : 'transparent',
          }}
        >
          {isSpeaking && !isPaused ? (
            <div className="flex gap-0.5 items-end h-4">
              {[1,2,3].map(i => (
                <motion.div key={i} className="w-1 rounded-full"
                  style={{ background: cfg.neonColor }}
                  animate={{ height: ['25%','100%','25%'] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          ) : (
            <span className="text-lg">{isPaused ? '▶️' : '🔇'}</span>
          )}
        </motion.button>

        {/* Favor Tokens */}
        <div className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.15)' }}>
          <span className="text-xl">⭐</span>
          <span className="text-base font-black text-yellow-400">{state.tutorProfile.favorTokens}</span>
        </div>

        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full overflow-hidden"
          style={{
            border: `2px solid ${cfg.neonColor}60`,
            background: `${cfg.neonColor}12`,
          }}
        >
          <motion.span
            key={state.theme}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="text-2xl md:text-3xl"
            style={{ filter: `drop-shadow(0 0 10px ${cfg.neonColor}80)` }}
          >
            {isMafia ? '🎭' : '🐺'}
          </motion.span>
          <span className="hidden sm:inline text-sm md:text-base font-bold tracking-wider uppercase" style={{ color: cfg.neonColor }}>
            {isMafia ? 'Mafia' : 'Wolves'}
          </span>
        </motion.button>

        {/* Alive count */}
        <div className="hidden md:flex items-center gap-1.5 text-sm text-gray-400">
          <motion.div
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-3 h-3 rounded-full bg-green-500"
            style={{ boxShadow: '0 0 8px rgba(34,197,94,0.6)' }}
          />
          <span className="text-white font-black text-lg">{state.learners.filter(l => l.isAlive).length}</span>
          <span>/{state.learners.length}</span>
        </div>
      </div>
    </header>
  );
}
