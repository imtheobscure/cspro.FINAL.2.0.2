import { useEffect, useState } from 'react';
import { GamifiedPresenter } from './GamifiedPresenter';
import { buildGamifiedChallengeMock } from '../../data/gamifiedChallengeMock';
import type { GamifiedThemeData } from './gamifiedTypes';

/**
 * Full-screen host for the gamified challenge presenter.
 * - `#/gamified/:lessonId` — a saved lesson: reads the stashed theme JSON
 *   (stored by the Manual JSON Creator at `tutorly-gamified-live-<fileName>`)
 *   plus the learner photo, and falls back to the mock sample theme.
 */
const GamifiedLivePage: React.FC = () => {
  const lessonId = (window.location.hash.match(/^#\/gamified\/([^/?#]+)/) || [])[1] || 'mock';
  const [lesson, setLesson] = useState<GamifiedThemeData | null>(null);
  const [meta, setMeta] = useState<{ fileName?: string; learnerName?: string; photo?: string }>({});
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    const decoded = decodeURIComponent(lessonId);
    let theme: GamifiedThemeData | null = null;
    let fileName: string | undefined;
    let photo: string | undefined;
    let learnerName: string | undefined;

    try {
      const raw = localStorage.getItem(`tutorly-gamified-live-${decoded}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        theme = parsed.themeData || parsed;
        if (parsed.learnerName) learnerName = parsed.learnerName;
        fileName = decoded;
        photo = localStorage.getItem(`tutorly-gamified-photo-${decoded}`) || undefined;
      }
    } catch { /* fall through to mock */ }

    if (!theme) {
      // Demo sample (no saved lesson) — fresh mock theme.
      theme = buildGamifiedChallengeMock(learnerName || 'Demo Learner');
      fileName = 'mock';
      setIsMock(true);
    }
    setLesson(theme);
    setMeta({ fileName, learnerName, photo });
  }, [lessonId]);

  if (!lesson) return <div className="p-8 text-white" style={{ background: '#0a0a0a', minHeight: '100vh' }}>Loading gamified challenge…</div>;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-between px-4 py-2" style={{ background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(139,0,0,0.5)' }}>
        <button onClick={() => { try { window.location.hash = '#/dashboard'; } catch { /* */ } }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>← Back to Dashboard</button>
        {isMock && <span className="text-xs text-white/50">Demo sample (no saved lesson) — generating a fresh challenge.</span>}
        <span className="text-xs text-white/40">Gamified Challenge</span>
      </div>
      <div style={{ paddingTop: 44 }}>
        <GamifiedPresenter lesson={lesson} fileName={meta.fileName} learnerName={meta.learnerName || 'Demo Learner'} learnerPhoto={meta.photo || null} />
      </div>
    </>
  );
};

export default GamifiedLivePage;