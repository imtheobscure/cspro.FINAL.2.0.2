import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlipBookPresenter } from './FlipBookPresenter';
import type { FlipbookLessonJSON } from './flipbookTypes';
import { buildFlipbookHomeworkMock } from '../../data/flipbookHomeworkMock';

/**
 * Full-screen presenter route: /#/flipbook/:lessonId
 *
 * Loads a live flipbook JSON (stashed by the Manual JSON Creator when a
 * "Flipbook Homework" lesson is saved) from localStorage and renders the React
 * FlipBookPresenter magazine. Falls back to the built-in mock sample so the
 * gallery "Open Live as presenter" tile always works.
 */
const FlipBookLivePage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<FlipbookLessonJSON | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    let parsed: FlipbookLessonJSON | null = null;
    if (lessonId) {
      try {
        const raw = localStorage.getItem(`tutorly-flipbook-live-${lessonId}`);
        if (raw) {
          const candidate = JSON.parse(raw);
          if (candidate && Array.isArray(candidate.sections)) parsed = candidate;
        }
      } catch { /* ignore malformed payload */ }
    }
    if (parsed) {
      setLesson(parsed);
    } else {
      // Fall back to mock sample (gallery "Open Live as presenter" / preview tile)
      setLesson(buildFlipbookHomeworkMock('Demo Learner'));
      setNotFound(true);
    }
    // Pull the learner photo stashed alongside the lesson JSON (cover fidelity with the HTML export)
    let photo: string | null = null;
    try { photo = localStorage.getItem(`tutorly-flipbook-photo-${lessonId}`) || null; } catch { /* ignore */ }
    setPhoto(photo);
  }, [lessonId]);

  if (!lesson) {
    return (
      <div className="min-h-screen bg-[#1e1a2b] flex items-center justify-center text-white">
        Loading magazine…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1a2b]">
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur text-white">
        <button
          onClick={() => navigate('/dashboard')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
        >
          ← Back to Dashboard
        </button>
        <span className="text-xs text-white/50">
          {notFound ? 'Demo sample (no saved lesson) — generating a fresh magazine.' : `Presenter · ${lesson.title}`}
        </span>
      </div>
      <FlipBookPresenter lesson={lesson} fileName={lessonId} photo={photo} onClose={() => navigate('/dashboard')} />
    </div>
  );
};

export default FlipBookLivePage;