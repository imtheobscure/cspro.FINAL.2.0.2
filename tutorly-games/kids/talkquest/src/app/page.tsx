'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupportedLanguage } from '@/types/theme';
import { TutorHeader } from '@/components/TutorHeader';
import { GameLauncher } from '@/components/GameLauncher';
import { LessonLibrary } from '@/components/LessonLibrary';
import { LessonPlayer } from '@/components/LessonPlayer';
import { LessonPlanScreen } from '@/components/LessonPlanScreen';
import { AiStudio } from '@/components/AiStudio';
import { VoiceTest } from '@/components/VoiceTest';
import { WhatsNew } from '@/components/WhatsNew';
import { WhisperingWallGame } from '@/games/WhisperingWallGame';
import { AlienCafeGame } from '@/games/AlienCafeGame';
import { ParrotPartnerGame } from '@/games/ParrotPartnerGame';
import { DetectiveClueGame } from '@/games/DetectiveClueGame';
import { AnimalRescueGame } from '@/games/AnimalRescueGame';
import { TimeTravelerGame } from '@/games/TimeTravelerGame';
import { MonsterBabysitterGame } from '@/games/MonsterBabysitterGame';
import { MagicMirrorGame } from '@/games/MagicMirrorGame';
import { LostFoundGame } from '@/games/LostFoundGame';
import { RobotUpgradeGame } from '@/games/RobotUpgradeGame';
import confetti from 'canvas-confetti';
import { AudioManager } from '@/lib/audio';
import { registerStoredContent } from '@/lib/customPack';
import { allThemes, subscribeThemes } from '@/data/themesMaster';
import { loadVoices } from '@/lib/voices';
import { Gamepad2, GraduationCap, Wand2, Mic, ClipboardList } from 'lucide-react';

type Section = 'lessons' | 'games' | 'studio' | 'voices';

export default function HomePage() {
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const [section, setSection] = useState<Section>('lessons');
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [stars, setStars] = useState(0);

  /**
   * One boot step does three jobs: put back the categories and lesson plans the
   * tutor pasted in earlier visits (an install only touches memory, so without
   * this a reload silently falls back to the generated plan), warm the browser's
   * voice list — Chromium hands it over empty at first — and create the audio
   * context on the first tap so sounds are not swallowed.
   */
  useEffect(() => {
    registerStoredContent();
    void loadVoices();
    const unlock = () => AudioManager.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const reward = () => {
    setStars(s => s + 1);
    try {
      confetti({ particleCount: 40, spread: 72, origin: { y: 0.72 }, scalar: 0.95,
        colors: ['#fbbf24', '#34d399', '#38bdf8', '#fb7185', '#a78bfa'] });
    } catch { /* */ }
  };

  const games: Record<string, React.ReactNode> = {
    'whispering-wall': <WhisperingWallGame onExit={() => setActiveGame(null)} onRewardStar={reward} />,
    'alien-cafe': <AlienCafeGame onExit={() => setActiveGame(null)} onRewardStar={reward} />,
    'parrot-partner': <ParrotPartnerGame onExit={() => setActiveGame(null)} onRewardStar={reward} />,
    'detective-clue': <DetectiveClueGame onExit={() => setActiveGame(null)} onRewardStar={reward} />,
    'animal-rescue': <AnimalRescueGame onExit={() => setActiveGame(null)} onRewardStar={reward} />,
    'time-traveler': <TimeTravelerGame onExit={() => setActiveGame(null)} onRewardStar={reward} />,
    'monster-babysitter': <MonsterBabysitterGame onExit={() => setActiveGame(null)} onRewardStar={reward} />,
    'magic-mirror': <MagicMirrorGame onExit={() => setActiveGame(null)} onRewardStar={reward} />,
    'lost-and-found': <LostFoundGame onExit={() => setActiveGame(null)} onRewardStar={reward} />,
    'robot-upgrade': <RobotUpgradeGame onExit={() => setActiveGame(null)} onRewardStar={reward} />,
  };

  /**
   * Live count, not a one-shot `useMemo`: a tutor who pastes in a new category
   * later sees the header grow with them instead of waiting for a reload.
   */
  const [topicCount, setTopicCount] = useState(() => allThemes().length);
  useEffect(() => {
    setTopicCount(allThemes().length);
    return subscribeThemes(() => setTopicCount(allThemes().length));
  }, []);
  const inFocus = !!activeGame || !!activeLesson || !!activePlan;

  const openLesson = (slug: string) => {
    setActiveLesson(slug);
    setActiveGame(null);
    setActivePlan(null);
  };
  const openPlan = (slug: string) => {
    setActivePlan(slug);
    setActiveLesson(null);
    setActiveGame(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TutorHeader
        currentLang={lang} onLangChange={setLang}
        stars={stars} onRewardStar={reward}
        onOpenVoiceTest={() => { AudioManager.playSound('select'); setSection('voices'); setActiveGame(null); setActiveLesson(null); setActivePlan(null); }}
        themeTitle={activeGame ? 'Game time!' : activeLesson ? 'Lesson time!' : activePlan ? 'Lesson plan' : `Let’s talk · ${topicCount} topics`}
      />

      {!inFocus && section !== 'voices' && (
        <div className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-6">
          <div className="inline-flex flex-wrap items-center gap-1 p-1.5 bg-white rounded-2xl card-3d">
            {([
              { id: 'lessons', label: 'Lessons', icon: <GraduationCap className="w-4 h-4" /> },
              { id: 'games', label: 'Speaking games', icon: <Gamepad2 className="w-4 h-4" /> },
              { id: 'studio', label: 'Add your own lessons', icon: <Wand2 className="w-4 h-4" /> },
              { id: 'voices', label: 'Voices', icon: <Mic className="w-4 h-4" /> },
            ] as const).map(t => (
              <button key={t.id}
                onClick={() => { AudioManager.playSound('select'); setSection(t.id); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer ${
                  section === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-orange-50'
                }`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        {/*
          No `mode="wait"` here on purpose. With it, Framer Motion holds the new
          screen back until the old one has finished exiting — and it cannot see
          inside the exiting subtree, so a nested AnimatePresence (the What's new
          panel, which animates itself away) never reports done. The result was a
          dead click: choosing a Lesson plan looked like nothing happened until
          the panel was dismissed. Fading the new screen in over the old one is
          just as smooth and cannot get stuck.
        */}
        <AnimatePresence>
          {activeGame ? (
            <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {games[activeGame]}
            </motion.div>
          ) : activePlan ? (
            <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LessonPlanScreen
                slug={activePlan} lang={lang}
                onExit={() => setActivePlan(null)}
                onOpenLesson={openLesson}
                onLaunchGame={(id) => { setActivePlan(null); setActiveGame(id); }} />
            </motion.div>
          ) : activeLesson ? (
            <motion.div key="lesson" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LessonPlayer
                slug={activeLesson} lang={lang}
                onExit={() => setActiveLesson(null)}
                onRewardStar={reward}
                onOpenPlan={openPlan} />
            </motion.div>
          ) : section === 'lessons' ? (
            <motion.div key="lib" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <WhatsNew />
              <LessonLibrary onOpenLesson={openLesson} onOpenPlan={openPlan} onAddContent={() => setSection('studio')} />
            </motion.div>
          ) : section === 'games' ? (
            <motion.div key="games" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GameLauncher onLaunchGame={setActiveGame} />
            </motion.div>
          ) : section === 'voices' ? (
            <motion.div key="voices" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <VoiceTest />
            </motion.div>
          ) : (
            <motion.div key="studio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AiStudio onOpenLesson={openLesson} onOpenPlan={openPlan} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-5 text-center">
        <p className="text-xs font-bold text-slate-500">
          <span className="font-black text-slate-800">TalkQuest</span> · speak more · play more · 7 languages · 10 speaking games
        </p>
        <button onClick={() => { setSection('studio'); setActiveGame(null); setActiveLesson(null); setActivePlan(null); }}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-slate-700 cursor-pointer">
          <ClipboardList className="w-3.5 h-3.5" /> Add your own category or lesson plan
        </button>
      </footer>
    </div>
  );
}
