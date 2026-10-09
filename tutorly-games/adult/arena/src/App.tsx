import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameProvider, useGame } from './context/GameContext';
import { NarrationProvider, useNarration } from './context/NarrationContext';
import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { NavBar } from './components/NavBar';
import { Dashboard } from './components/Dashboard';
import { LearnerProfiles } from './components/LearnerProfiles';
// WarRoom merged into Dashboard
import { BattleArena } from './components/BattleArena';
import { ShopForge } from './components/ShopForge';
// QuestsBoard integrated into profiles
import { TutorGodMode } from './components/TutorGodMode';
import { THEME_CONFIG } from './utils/helpers';
import { playCardFlip, startAmbient, stopAmbient } from './utils/audio';

function AppContent() {
  const { state, dispatch } = useGame();
  const { speak, isSpeaking } = useNarration();
  const cfg = THEME_CONFIG[state.theme];
  const [prevNav, setPrevNav] = useState(state.activeNav);
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);
  const isMafia = state.theme === 'mafia';
  const themeBg = isMafia ? './images/mafia-bg.jpg' : './images/wolf-bg.jpg';

  // Narrate screen changes
  const screenNarrations: Record<string, string> = {
    dashboard: `Welcome to the Command Center. ${state.learners.filter(l => l.isAlive).length} operatives standing. The syndicate awaits your orders.`,
    profiles: `Accessing operative dossiers. Select a character to view their complete intelligence file.`,
    warroom: `Entering the War Room. Strategic operations and mission deployment ready.`,
    arena: `The Combat Arena awaits. Blood will be spilled. Honor will be earned.`,
    shop: `Welcome to the Syndicate Armory. Acquire weapons, armor, and artifacts.`,
    quests: `Reviewing active missions. Complete objectives to earn reputation and credits.`,
    tutor: `God Mode activated. You have absolute control over the arena.`,
  };

  // Play card flip and narrate on nav change
  useEffect(() => {
    if (prevNav !== state.activeNav) {
      playCardFlip();
      // Small delay then narrate
      if (!state.showSplash) {
        setTimeout(() => {
          speak(screenNarrations[state.activeNav] || 'Navigating...');
        }, 300);
      }
      setPrevNav(state.activeNav);
    }
  }, [state.activeNav, prevNav, state.showSplash, speak]);

  // Welcome narration after splash
  useEffect(() => {
    if (!state.showSplash && !hasSpokenWelcome) {
      setTimeout(() => {
        speak(`Welcome back, ${state.tutorProfile.name}. The ${isMafia ? 'Syndicate' : 'Pack'} has been waiting. ${state.learners.filter(l => l.isAlive).length} operatives are ready for your command. Week ${state.weekNumber} begins now.`);
        setHasSpokenWelcome(true);
      }, 1000);
    }
  }, [state.showSplash, hasSpokenWelcome, state.tutorProfile.name, state.weekNumber, state.learners, isMafia, speak]);

  // Manage ambient by theme
  useEffect(() => {
    if (!state.showSplash) {
      startAmbient(state.theme);
    }
    return () => stopAmbient();
  }, [state.theme, state.showSplash]);

  const renderScreen = useCallback(() => {
    switch (state.activeNav) {
      case 'dashboard': return <Dashboard />;
      case 'profiles': return <LearnerProfiles />;
      case 'arena': return <BattleArena />;
      case 'shop': return <ShopForge />;
      case 'tutor': return <TutorGodMode />;
      default: return <Dashboard />;
    }
  }, [state.activeNav]);

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* ===== REAL PHOTO BACKGROUND ===== */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={state.theme}
            src={themeBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.08) saturate(0.4)' }}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          />
        </AnimatePresence>
        {/* Color overlay */}
        <div className="absolute inset-0" style={{
          background: isMafia
            ? 'linear-gradient(180deg, rgba(10,2,2,0.9) 0%, rgba(5,1,1,0.95) 100%)'
            : 'linear-gradient(180deg, rgba(2,10,4,0.9) 0%, rgba(1,5,2,0.95) 100%)',
        }} />
      </div>

      {/* ===== FLOATING PARTICLES ===== */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              left: `${Math.random() * 100}%`,
              bottom: `-10px`,
              background: cfg.neonColor,
              boxShadow: `0 0 15px ${cfg.neonColor}60`,
            }}
            animate={{
              y: [0, -(window.innerHeight + 50)],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              delay: Math.random() * 10,
            }}
          />
        ))}
      </div>

      {/* Narration indicator bar */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 4 }}
            exit={{ height: 0 }}
            className="fixed top-0 left-0 right-0 z-[100]"
            style={{ background: cfg.neonColor }}
          >
            <motion.div
              className="h-full"
              style={{ background: 'rgba(255,255,255,0.5)' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Splash screen */}
      <SplashScreen />

      {/* Header */}
      <div className="relative z-20">
        <Header />
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        <NavBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.activeNav}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom padding */}
      <div className="md:hidden h-20 relative z-10" />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <NarrationProvider>
        <AppContent />
      </NarrationProvider>
    </GameProvider>
  );
}
