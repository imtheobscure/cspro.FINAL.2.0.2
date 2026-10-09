import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store';
import { DEMO_LESSON } from './demoLesson';
import { SplashScreen, ProfileSetup } from './components/SplashScreen';
import { MediaPlayer } from './components/MediaPlayer';
import { ActivityModal } from './components/ActivityModal';
import { CatWidget } from './components/CatWidget';
import { DictionaryModal } from './components/DictionaryModal';
import { XPBar, BadgeDisplay, BadgeModal, Leaderboard } from './components/GamificationPanel';
import { MasterPrompt } from './components/MasterPrompt';
import { TranscriptPanel } from './components/TranscriptPanel';
import { KaraokeMode } from './components/KaraokeMode';
import { Whiteboard } from './components/Whiteboard';
import { downloadLessonHTML } from './utils/htmlGenerator';

export default function App() {
  const {
    showSplash, showProfileSetup,
    lesson, setLesson,
    shakeScreen,
    showLeaderboard, setShowLeaderboard,
    showMasterPrompt, setShowMasterPrompt,
    appMode, karaokeMode,
    learner, updateLeaderboard,
    whiteboardSavedStates,
  } = useStore();

  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportLesson = (includeVideo: boolean) => {
    if (!lesson) return;
    downloadLessonHTML({
      lesson,
      learnerName: learner.name || 'Learner',
      learnerAvatar: learner.avatar || '🎓',
      whiteboardStates: whiteboardSavedStates,
      includeVideo,
    });
    setShowExportModal(false);
  };

  // Load demo lesson on first mount
  useEffect(() => {
    if (!lesson) {
      setLesson(DEMO_LESSON);
      updateLeaderboard();
    }
  }, [lesson, setLesson, updateLeaderboard]);

  return (
    <div className={`min-h-screen bg-gray-950 text-white ${shakeScreen ? 'animate-shake' : ''}`}>
      {/* Splash */}
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>

      {/* Profile Setup */}
      <AnimatePresence>
        {showProfileSetup && !showSplash && <ProfileSetup />}
      </AnimatePresence>

      {/* Main App - only render when splash and profile are done */}
      {!showSplash && !showProfileSetup && (
        <div className="flex flex-col min-h-screen">
          {/* Top bar */}
          <header className="flex flex-wrap items-center gap-3 px-3 py-2 md:px-6 md:py-3 border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-lg sticky top-0 z-50">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-2xl">🎬</span>
              <h1
                className="text-lg md:text-xl font-black tracking-tight hidden sm:block"
                style={{
                  background: 'linear-gradient(135deg, #ffd700, #ff6b35)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Video Lesson
              </h1>
            </div>

            {/* XP Bar */}
            <XPBar />

            {/* Badges */}
            <BadgeDisplay />

            <div className="flex-1" />

            {/* Nav buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => window.location.href = '/'}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-800 hover:bg-gray-700 text-blue-400 hover:text-blue-300 border border-gray-700 transition-all mr-2"
                title="Return to Classroom"
              >
                <i className="fas fa-home mr-1"></i> Home
              </button>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-all"
              >
                🏆
              </button>
              <button
                onClick={() => setShowMasterPrompt(!showMasterPrompt)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-all"
              >
                📝 New
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white border border-purple-500 transition-all"
              >
                📤 Share
              </button>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 flex flex-col lg:flex-row gap-4 p-3 md:p-6 overflow-x-hidden">
            {/* Player column */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              {/* Lesson title */}
              {lesson && (
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl md:text-2xl font-black text-white flex-1 min-w-0 truncate">
                    {lesson.metadata.title}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                    <span className="bg-gray-800 px-2 py-1 rounded-lg">{lesson.metadata.cefrLevel}</span>
                    <span className="bg-gray-800 px-2 py-1 rounded-lg">{lesson.metadata.targetLanguage}</span>
                  </div>
                </div>
              )}

              {/* Media Player with Whiteboard */}
              <div className="relative">
                <MediaPlayer />
                <Whiteboard />
              </div>

              {/* Karaoke Mode */}
              {karaokeMode && <KaraokeMode />}

              {/* Activity progress */}
              {lesson && (
                <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-300">📋 Lesson Progress</h3>
                    <span className="text-xs text-gray-500">
                      {learner.completedActivities.length} / {lesson.segments.reduce((a, s) => a + s.activities.length, 0)} completed
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lesson.segments.flatMap(seg =>
                      seg.activities.map(act => {
                        const done = learner.completedActivities.includes(act.id);
                        const colorMap: Record<string, string> = {
                          gold: 'bg-yellow-500', teal: 'bg-teal-500', purple: 'bg-purple-500',
                          orange: 'bg-orange-500', green: 'bg-green-500', pink: 'bg-pink-500', blue: 'bg-blue-500',
                        };
                        return (
                          <div
                            key={act.id}
                            className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-sm cursor-default transition-all ${
                              done
                                ? `${colorMap[act.color] || 'bg-gray-600'} text-white shadow-lg`
                                : 'bg-gray-800 text-gray-500 border border-gray-700'
                            }`}
                            title={`${act.title || act.type} – ${done ? '✓ Done' : 'Pending'}`}
                          >
                            {done ? '✓' : act.emoji}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Transcript / Segments */}
            <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col gap-4">
              {/* Mode-dependent panel */}
              {appMode === 'transcript' ? (
                <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800/50">
                  <h3 className="text-sm font-bold text-gray-300 mb-3">📄 Transcript</h3>
                  <TranscriptPanel />
                </div>
              ) : (
                <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800/50">
                  <h3 className="text-sm font-bold text-gray-300 mb-3">🎬 Segments</h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {lesson?.segments.map((seg, i) => {
                      const total = seg.activities.length;
                      const done = seg.activities.filter(a => learner.completedActivities.includes(a.id)).length;
                      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                      return (
                        <div key={seg.id} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-white">{i + 1}. {seg.title}</span>
                            <span className={`text-xs font-bold ${pct === 100 ? 'text-green-400' : 'text-gray-500'}`}>
                              {done}/{total}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: pct === 100 ? '#22c55e' : 'linear-gradient(90deg, #ffd700, #ff6b35)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Learner profile card */}
              <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-4xl">{learner.avatar}</div>
                  <div>
                    <h4 className="font-bold text-white">{learner.name || 'Learner'}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>Level {learner.level}</span>
                      <span>·</span>
                      <span className="text-yellow-400 font-bold">{learner.xp} XP</span>
                      {learner.streak > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-orange-400">🔥{learner.streak}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {learner.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {learner.badges.map(bid => {
                      const badge = lesson?.badges.find(b => b.id === bid);
                      return badge ? (
                        <span
                          key={bid}
                          className="text-lg cursor-default"
                          title={badge.name}
                        >
                          {badge.emoji}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="bg-gray-900 hover:bg-gray-800 border border-gray-800/50 rounded-2xl p-3 text-center transition-all"
                >
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="text-xs font-bold text-gray-400">Leaderboard</div>
                </button>
                <button
                  onClick={() => setShowMasterPrompt(true)}
                  className="bg-gray-900 hover:bg-gray-800 border border-gray-800/50 rounded-2xl p-3 text-center transition-all"
                >
                  <div className="text-2xl mb-1">📝</div>
                  <div className="text-xs font-bold text-gray-400">New Lesson</div>
                </button>
              </div>
            </aside>
          </main>
        </div>
      )}

      {/* Modals & overlays */}
      <ActivityModal />
      <DictionaryModal />
      <BadgeModal />
      <Leaderboard />
      <MasterPrompt />

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              className="bg-gray-900 border border-purple-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">📤</div>
              <h3 className="text-2xl font-black text-white mb-2">Share Lesson</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Export this lesson as an interactive HTML file that your learner can open in any browser - 
                no installation needed!
              </p>
              
              {whiteboardSavedStates.length > 0 && (
                <p className="text-purple-400 text-sm mb-4">
                  📝 {whiteboardSavedStates.length} whiteboard note(s) will be included
                </p>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleExportLesson(true)}
                  className="w-full py-3 rounded-xl font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                >
                  📹 Include Video Link
                </button>
                <button
                  onClick={() => handleExportLesson(false)}
                  className="w-full py-3 rounded-xl font-bold text-white bg-gray-700 hover:bg-gray-600 transition-all"
                >
                  📄 Activities Only
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cat Widget - always visible after profile setup */}
      {!showSplash && !showProfileSetup && <CatWidget />}
    </div>
  );
}
