/**
 * ============================================================================
 * LessonRenderer.tsx – Demo React component
 * 
 * Imports the generator, loads the built-in demo lesson, and renders the
 * complete interactive HTML inside a sandboxed iframe (for script isolation).
 * ============================================================================
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import { generateEnglishLessonHtml } from './englishLessonHtmlGenerator';
import { demoLesson, demoLearner, demoConfig } from './demoLessonData';

/**
 * LessonRenderer – Renders the full English lesson app inside an iframe.
 * Uses useMemo to avoid regenerating the HTML on every render.
 */
export default function LessonRenderer() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // Generate the HTML once using useMemo
  const lessonHtml = useMemo(() => {
    return generateEnglishLessonHtml(demoLesson, demoLearner, demoConfig);
  }, []);

  // Auto-resize iframe to fill viewport
  useEffect(() => {
    const handleResize = () => {
      if (iframeRef.current && isFullscreen) {
        iframeRef.current.style.height = `${window.innerHeight}px`;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  // Dismiss legend after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowLegend(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Legend overlay - dismissible */}
      {showLegend && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 12,
            fontSize: '0.85rem',
            textAlign: 'center',
            maxWidth: 500,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>
            <strong>📖 Prepare</strong> = Self-study &nbsp;|&nbsp;
            <strong>🎤 Produce</strong> = Class speaking &nbsp;|&nbsp;
            <strong>✏️ Practice</strong> = Homework
            <br />
            <small style={{ opacity: 0.7 }}>
              Tutor Dashboard: Ctrl+Shift+T (passcode: 1234) • Accessibility: Ctrl+/
            </small>
          </span>
          <button
            onClick={() => setShowLegend(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Fullscreen toggle button */}
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          zIndex: 10000,
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '6px 14px',
          cursor: 'pointer',
          fontSize: '0.8rem',
        }}
      >
        {isFullscreen ? '⛶ Windowed' : '⛶ Fullscreen'}
      </button>

      {/* The lesson iframe – uses srcDoc for script isolation */}
      <iframe
        ref={iframeRef}
        srcDoc={lessonHtml}
        title="English Lesson"
        style={{
          width: '100%',
          height: isFullscreen ? '100vh' : '80vh',
          border: isFullscreen ? 'none' : '2px solid #ddd',
          borderRadius: isFullscreen ? 0 : 12,
          background: '#fff',
        }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
      />
    </div>
  );
}
