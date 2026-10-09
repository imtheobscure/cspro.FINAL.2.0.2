import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { THEME_CONFIG } from '../utils/helpers';
import { playDramaticReveal, playCountdownFinal, startAmbient } from '../utils/audio';

export function SplashScreen() {
  const { state, dispatch } = useGame();
  const [phase, setPhase] = useState<'dark' | 'glow' | 'title' | 'sub' | 'bar' | 'done'>('dark');
  const cfg = THEME_CONFIG[state.theme];
  const isMafia = state.theme === 'mafia';

  let splashText = "COMBAT ARENA";
  let splashSubtext = cfg.name;
  let logoUrl = null;
  try {
    const store = JSON.parse(localStorage.getItem('app-storage') || '{}');
    if (store.state?.tutorInfo?.splashScreenText) splashText = store.state.tutorInfo.splashScreenText;
    if (store.state?.tutorInfo?.splashScreenSubtext) splashSubtext = store.state.tutorInfo.splashScreenSubtext;
    if (store.state?.logoUrl) logoUrl = store.state.logoUrl;
  } catch (e) {}

  useEffect(() => {
    if (!state.showSplash) return;
    const t = [
      setTimeout(() => setPhase('glow'), 300),
      setTimeout(() => { setPhase('title'); playDramaticReveal(); }, 1200),
      setTimeout(() => setPhase('sub'), 2400),
      setTimeout(() => { setPhase('bar'); playCountdownFinal(); }, 3200),
      setTimeout(() => { setPhase('done'); startAmbient(state.theme); }, 4200),
      setTimeout(() => dispatch({ type: 'TOGGLE_SPLASH' }), 5000),
    ];
    return () => t.forEach(clearTimeout);
  }, [dispatch, state.showSplash, state.theme]);

  return (
    <AnimatePresence>
      {state.showSplash && (
        <motion.div
          key="splash"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: isMafia
              ? 'radial-gradient(ellipse at center, #180808 0%, #080404 50%, #020101 100%)'
              : 'radial-gradient(ellipse at center, #081808 0%, #040804 50%, #010201 100%)',
          }}
        >
          {/* Subtle particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: Math.random() * 4 + 1,
                  height: Math.random() * 4 + 1,
                  left: `${Math.random() * 100}%`,
                  bottom: 0,
                  background: cfg.neonColor,
                }}
                animate={{ y: [0, -(window.innerHeight + 20)], opacity: [0, 0.4, 0] }}
                transition={{ duration: Math.random() * 8 + 6, repeat: Infinity, delay: Math.random() * 4 }}
              />
            ))}
          </div>

          {/* Emblem — contained in center */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={phase !== 'dark' ? { scale: 1, opacity: 1 } : {}}
            transition={{ type: 'spring', stiffness: 150, damping: 18 }}
            className="relative mb-6 md:mb-10"
          >
            {/* Glow */}
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1.1, 0.95] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -inset-6 md:-inset-8 rounded-full"
              style={{ background: `radial-gradient(circle, ${cfg.neonColor}35 0%, transparent 70%)` }}
            />
            {/* Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-3 md:-inset-4 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, ${cfg.neonColor}, transparent 30%, ${cfg.neonColor}60, transparent 70%, ${cfg.neonColor})`,
                filter: 'blur(4px)',
                opacity: 0.4,
              }}
            />
            {/* Circle */}
            <div
              className="relative flex items-center justify-center w-32 h-32 md:w-44 md:h-44 rounded-full border-2 overflow-hidden"
              style={{
                borderColor: `${cfg.neonColor}70`,
                background: 'rgba(0,0,0,0.7)',
                boxShadow: `0 0 50px ${cfg.neonColor}40`,
              }}
            >
              <motion.span
                className="text-6xl md:text-8xl select-none flex items-center justify-center"
                style={{ filter: `drop-shadow(0 0 20px ${cfg.neonColor}80)` }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                {logoUrl ? <img src={logoUrl} className="w-24 h-24 md:w-32 md:h-32 object-contain" alt="Logo" /> : (isMafia ? '🎭' : '🐺')}
              </motion.span>
            </div>
          </motion.div>

          {/* COMBAT ARENA title */}
          <AnimatePresence>
            {(phase === 'title' || phase === 'sub' || phase === 'bar' || phase === 'done') && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-2 md:mb-4 px-4"
              >
                <h1 className="text-5xl md:text-8xl font-black tracking-[0.2em] uppercase leading-none"
                  style={{ color: '#fff', textShadow: `0 0 30px ${cfg.neonColor}60, 0 0 60px ${cfg.neonColor}20` }}>
                  {splashText}
                </h1>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Subtitle */}
          <AnimatePresence>
            {(phase === 'sub' || phase === 'bar' || phase === 'done') && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-6 px-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-12 md:w-20 h-px" style={{ background: `${cfg.neonColor}60` }} />
                  <span className="text-xl md:text-2xl">{isMafia ? '♠️' : '🌙'}</span>
                  <div className="w-12 md:w-20 h-px" style={{ background: `${cfg.neonColor}60` }} />
                </div>
                <p className="text-lg md:text-2xl font-bold tracking-[0.2em] uppercase" style={{ color: cfg.neonColor }}>
                  {splashSubtext}
                </p>
                <p className="text-sm md:text-base text-gray-500 tracking-wider mt-1 uppercase">
                  Gamified Learning Engine
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading bar */}
          <AnimatePresence>
            {(phase === 'bar' || phase === 'done') && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-48 md:w-72 mt-4 md:mt-8">
                <div className="h-[2px] bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1 }}
                    className="h-full rounded-full"
                    style={{ background: cfg.neonColor, boxShadow: `0 0 10px ${cfg.neonColor}` }}
                  />
                </div>
                <motion.p animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-gray-600 text-[9px] md:text-xs mt-2 text-center tracking-[0.3em] uppercase">
                  {phase === 'done' ? 'ENTERING ARENA...' : 'LOADING...'}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
