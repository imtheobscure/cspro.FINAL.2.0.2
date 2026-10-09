import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MusicPresenter from './MusicPresenter';
import type { PremiumLesson } from './musicTypes';
import { buildMusicLessonMock } from '../../data/musicLessonMock';
import { saveTimings } from '../../utils/musicTimingStore';

/**
 * Full-screen presenter route: /#/music/:lessonId
 *
 * Loads a live music lesson JSON (stashed by the Manual JSON Creator when a
 * "Music Lesson" is saved) from localStorage and renders the React
 * MusicPresenter. Falls back to the built-in mock sample so the gallery
 * "Open Live as presenter" tile always works.
 */
const MusicLivePage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<PremiumLesson | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [learnerName, setLearnerName] = useState<string | undefined>(undefined);

  useEffect(() => {
    let parsed: PremiumLesson | null = null;
    let learner: string | undefined;
    if (lessonId) {
      try {
        const raw = localStorage.getItem(`tutorly-music-live-${lessonId}`);
        if (raw) {
          const candidate = JSON.parse(raw);
          if (candidate && (candidate.songTitle || candidate.title)) {
            parsed = candidate.lesson || candidate;
            learner = candidate.learnerName || undefined;
          }
        }
      } catch { /* ignore malformed payload */ }
    }
    if (parsed) {
      setLesson(parsed);
      setLearnerName(learner);
    } else {
      // Fall back to mock sample (gallery "Open Live as presenter" / preview tile)
      const mock = buildMusicLessonMock();
      mock.learnerProfile = { name: 'Demo Learner', level: mock.level, l1: mock.l1, goals: mock.goals };
      setLesson(mock);
      setLearnerName('Demo Learner');
      setNotFound(true);
    }
  }, [lessonId]);

  /**
   * Persist anything the tutor changes in the player (lyric timings in
   * particular) back into the saved lesson, so re-opening the presenter or
   * re-rendering the HTML lesson keeps their work.
   */
  const persistLesson = useCallback((updated: PremiumLesson) => {
    try {
      const key = `tutorly-music-live-${lessonId || updated.id}`;
      const existing = localStorage.getItem(key);
      const payload = existing ? { ...JSON.parse(existing), lesson: updated } : { lesson: updated };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch { /* storage blocked — the timing store still holds the sync data */ }
    saveTimings(updated, updated.subtitles);
  }, [lessonId]);

  if (!lesson) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 flex items-center justify-center text-slate-900 dark:text-white">
        Loading song lesson…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950">
      <div className="sticky top-0 z-[60] flex items-center justify-between px-4 py-2 bg-white/80 dark:bg-black/50 backdrop-blur border-b border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-white">
        <button
          onClick={() => navigate('/dashboard')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 transition-colors cursor-pointer"
        >
          ← Back to Dashboard
        </button>
        <span className="text-xs text-slate-500 dark:text-white/50">
          {notFound ? 'Demo sample (no saved lesson) — generating a fresh song lesson.' : `Presenter · ${lesson.songTitle}`}
        </span>
      </div>
      <MusicPresenter
        lesson={lesson}
        learnerName={learnerName}
        fileName={lessonId}
        onBack={() => navigate('/dashboard')}
        onLessonUpdated={persistLesson}
      />
    </div>
  );
};

export default MusicLivePage;