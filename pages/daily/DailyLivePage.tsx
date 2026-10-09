import React, { useEffect, useState } from 'react';
import DailyPresenter from './DailyPresenter';
import { buildDailyLessonMock } from '../../data/dailyLessonMock';
import { normalizeDailyLesson } from '../../utils/dailyLessonHtmlGenerator';
import type { DailyLessonData } from './dailyTypes';

/**
 * Full-screen host for the Daily Lesson presenter.
 * - `#/daily/:lessonId` — a saved lesson: reads the stashed lesson JSON
 *   (stored by the Manual JSON Creator at `tutorly-daily-live-<fileName>`)
 *   plus learner info, and falls back to the mock sample lesson.
 */
const DailyLivePage: React.FC = () => {
  const lessonId = (window.location.hash.match(/^#\/daily\/([^/?#]+)/) || [])[1] || 'mock';
  const [lesson, setLesson] = useState<DailyLessonData | null>(null);
  const [meta, setMeta] = useState<{ fileName?: string; learnerName?: string; avatar?: string }>({});
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    const decoded = decodeURIComponent(lessonId);
    let lessonData: DailyLessonData | null = null;
    let fileName: string | undefined;
    let learnerName: string | undefined;
    let avatar: string | undefined;

    try {
      const raw = localStorage.getItem(`tutorly-daily-live-${decoded}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const candidate = parsed.lesson || parsed;
        if (candidate && (candidate.topic || candidate.warmup || candidate.quiz)) {
          lessonData = normalizeDailyLesson(candidate);
          if (parsed.learnerName) learnerName = parsed.learnerName;
          if (parsed.learnerAvatar) avatar = parsed.learnerAvatar;
          fileName = decoded;
        }
      }
    } catch { /* fall through to mock */ }

    if (!lessonData) {
      // Demo sample (no saved lesson) — fresh mock lesson.
      lessonData = buildDailyLessonMock();
      fileName = 'mock';
      learnerName = 'Demo Learner';
      avatar = '🐱';
      setIsMock(true);
    }
    setLesson(lessonData);
    setMeta({ fileName, learnerName, avatar });
  }, [lessonId]);

  if (!lesson) return <div className="p-8 text-white" style={{ background: '#0a0a12', minHeight: '100vh' }}>Loading daily lesson…</div>;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-between px-4 py-2" style={{ background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(139,92,246,0.5)' }}>
        <button onClick={() => { try { window.location.hash = '#/dashboard'; } catch { /* */ } }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>← Back to Dashboard</button>
        {isMock && <span className="text-xs text-white/50">Demo sample (no saved lesson) — generating a fresh daily lesson.</span>}
        <span className="text-xs text-white/40">Daily Lesson</span>
      </div>
      <div style={{ paddingTop: 40 }}>
        <DailyPresenter lesson={lesson} fileName={meta.fileName} learnerName={meta.learnerName || 'Demo Learner'} avatar={meta.avatar || '🐱'} />
      </div>
    </>
  );
};

export default DailyLivePage;