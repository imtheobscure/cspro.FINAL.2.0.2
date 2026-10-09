import React, { useEffect, useRef, useState } from 'react';
import VideoLessonApp from '../video_app/VideoLessonApp';
import { useStore } from '../video_app/store';
import { DEMO_LESSON } from '../video_app/demoLesson';
import '../video_app/videoApp.css';

/**
 * Full-screen host for the Video Lesson presenter (the actual Video Lesson
 * React app, booting straight into the lesson — no splash / profile setup).
 *
 * `#/video/<fileName>` — a saved lesson: reads the stashed lesson JSON stored
 * by the Manual JSON Creator at `tutorly-video-lesson-<fileName>`, falling
 * back to the Big Buck Bunny mock sample lesson.
 *
 * Learner progress (XP / level / streak / badges / completed activities) is
 * mirrored to `tutorly-video-lessons-<learner>` so the tutor dashboard can
 * show progress chips for saved Video Lesson files.
 */
const VideoLivePage: React.FC = () => {
  const lessonId = (window.location.hash.match(/^#\/video\/([^/?#]+)/) || [])[1] || 'mock';
  const [ready, setReady] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [fileName, setFileName] = useState('mock');
  const [learnerName, setLearnerName] = useState('Demo Learner');
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    const decoded = decodeURIComponent(lessonId);
    if (startedRef.current === lessonId) return;
    startedRef.current = lessonId;

    const st = useStore.getState();
    // Fresh session per file — keep prior XP, but always (re)load the lesson payload.
    let lessonData: unknown = null;
    let fName = 'mock';
    let lName = 'Demo Learner';
    let mock = false;
    try {
      const raw = localStorage.getItem(`tutorly-video-lesson-${decoded}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const candidate = parsed.lesson || parsed;
        if (candidate && Array.isArray(candidate.segments) && candidate.segments.length > 0) {
          lessonData = candidate;
          fName = decoded;
          if (parsed.learnerName) lName = parsed.learnerName;
        }
      }
    } catch {
      /* fall through to mock */
    }
    if (!lessonData) {
      lessonData = DEMO_LESSON;
      mock = true;
    }
    try {
      st.setLesson(lessonData as never);
      st.setShowSplash(false);
      st.setShowProfileSetup(false);
      st.setAppMode('subtitle');
      const meta = (lessonData as { metadata?: { videoUrl?: string } }).metadata;
      if (meta?.videoUrl) {
        st.setMediaUrl(meta.videoUrl);
        st.setMediaType(/youtube|youtu\.be/i.test(meta.videoUrl) ? 'youtube' : 'video');
      }
      // Prefer the learner name recorded with the lesson; else keep current store learner.
      if (lName && lName !== 'Demo Learner') st.setLearner({ name: lName, avatar: st.learner.avatar || '🎬' });
      st.updateLeaderboard();
    } catch {
      /* noop */
    }
    setFileName(fName);
    setLearnerName(lName);
    setIsMock(mock);
    setReady(true);
  }, [lessonId]);

  // Mirror learner progress to a per-learner array key the dashboard reads.
  useEffect(() => {
    if (!ready) return;
    const st = useStore.getState();
    const mirror = (state: typeof st) => {
      const s = useStore.getState();
      const lesson = s.lesson;
      if (!lesson) return;
      const key = `tutorly-video-lessons-${learnerName}`;
      const title = (lesson as { metadata?: { title?: string } }).metadata?.title || 'Video Lesson';
      const record = {
        fileName,
        title,
        learnerName,
        name: learnerName,
        xp: s.learner.xp,
        level: s.learner.level,
        streak: s.learner.streak,
        badges: s.learner.badges,
        completed: s.learner.completedActivities.length,
        total: (lesson as { segments: { activities: unknown[] }[] }).segments.reduce(
          (a, seg) => a + seg.activities.length,
          0
        ),
        updatedAt: Date.now(),
      };
      try {
        const all = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = all.findIndex((r: { fileName?: string }) => r.fileName === fileName);
        if (idx >= 0) all[idx] = record;
        else all.push(record);
        localStorage.setItem(key, JSON.stringify(all.slice(-40)));
      } catch {
        /* noop */
      }
      void state;
    };
    const unsub = useStore.subscribe(mirror);
    mirror(st);
    return () => unsub();
  }, [ready, fileName, learnerName]);

  if (!ready) {
    return (
      <div className="p-8 text-white" style={{ background: '#0f0c29', minHeight: '100vh' }}>
        Loading video lesson…
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-between px-4 py-2"
        style={{ background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(102,126,234,0.5)' }}
      >
        <button
          onClick={() => {
            try {
              window.location.hash = '#/dashboard';
            } catch {
              /* noop */
            }
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          ← Back to Dashboard
        </button>
        {isMock ? (
          <span className="text-xs text-white/50">Demo sample (no saved lesson) — Video Lesson demo.</span>
        ) : (
          <span className="text-xs text-white/50">{fileName} — Video Lesson</span>
        )}
        <span className="text-xs text-white/40">🎬 Video Lesson</span>
      </div>
      <div style={{ paddingTop: 40 }}>
        <VideoLessonApp />
      </div>
    </>
  );
};

export default VideoLivePage;
