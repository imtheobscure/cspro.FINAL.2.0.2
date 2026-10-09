import React, { useEffect, useState } from 'react';
import { LivePresenter } from './LivePresenter';
import { buildLiveLessonMockLesson, normalizeLiveLesson } from '../../data/liveLessonMock';
import type { LiveLessonManual } from './liveTypes';

/**
 * Full-screen host for the Live Lesson presenter.
 * - `#/live/:lessonId` — a saved lesson: reads the stashed lesson JSON
 *   (stored by the Manual JSON Creator at `tutorly-live-live-<fileName>`)
 *   plus learner info, and falls back to the mock sample lesson.
 */
const LiveLivePage: React.FC = () => {
  const lessonId = (window.location.hash.match(/^#\/live\/([^/?#]+)/) || [])[1] || 'mock';
  const [lesson, setLesson] = useState<LiveLessonManual | null>(null);
  const [meta, setMeta] = useState<{ fileName?: string; learnerName?: string }>({});
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    const decoded = decodeURIComponent(lessonId);
    let lessonData: LiveLessonManual | null = null;
    let fileName: string | undefined;
    let learnerName: string | undefined;

    try {
      const raw = localStorage.getItem(`tutorly-live-live-${decoded}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const candidate = parsed.lesson || parsed;
        if (candidate && Array.isArray(candidate.procedureBlocks) && candidate.procedureBlocks.length > 0) {
          lessonData = normalizeLiveLesson(candidate, { learnerName: parsed.learnerName });
          if (parsed.learnerName) learnerName = parsed.learnerName;
          fileName = decoded;
        }
      }
    } catch { /* fall through to mock */ }

    if (!lessonData) {
      // Demo sample (no saved lesson) — fresh mock lesson.
      lessonData = buildLiveLessonMockLesson();
      fileName = 'mock';
      learnerName = 'Demo Learner';
      setIsMock(true);
    }
    setLesson(lessonData);
    setMeta({ fileName, learnerName });
  }, [lessonId]);

  if (!lesson) return <div className="p-8 text-white" style={{ background: '#0f172a', minHeight: '100vh' }}>Loading live lesson…</div>;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-between px-4 py-2" style={{ background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(99,102,241,0.5)' }}>
        <button onClick={() => { try { window.location.hash = '#/dashboard'; } catch { /* */ } }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>← Back to Dashboard</button>
        {isMock && <span className="text-xs text-white/50">Demo sample (no saved lesson) — generating a fresh live lesson.</span>}
        <span className="text-xs text-white/40">Live Lesson</span>
      </div>
      {/*
        The presenter fills whatever box it is given, so give it a definite one:
        the full viewport minus the 40px toolbar above it. box-sizing keeps the
        padding inside the 100vh, which is what previously pushed the lesson's
        own footer (Previous / Next) below the fold.
      */}
      <div style={{ paddingTop: 40, height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <LivePresenter lesson={lesson} learnerName={meta.learnerName || 'Demo Learner'} />
      </div>
    </>
  );
};

export default LiveLivePage;