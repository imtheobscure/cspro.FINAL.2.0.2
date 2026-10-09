import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '../utils/cn';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/appStore';
import { buildSubtitleContent } from '../utils/subtitleContent';
import type { AppSettings, SpeakerConfig } from '../types';
import { Move, X, Maximize2, PictureInPicture2 } from 'lucide-react';

/**
 * Draggable + resizable floating subtitle overlay.
 *
 * Rendered as a fixed-position panel on top of the app so a learner can
 * drag it over a video call (Zoom/Meet) when the browser window is on top.
 * Position & size persist to localStorage.
 *
 * Pointer-events logic:
 *   - The panel and its text are non-interactive EXCEPT the header bar and
 *     the resize handle, so it never blocks clicks on the underlying app /
 *     video call. The body uses `pointer-events: none` while the header and
 *     handle stay interactive.
 */

export interface OverlayGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_GEOM: OverlayGeometry = { x: 24, y: 120, w: 520, h: 200 };
const GEO_KEY = 'tutorly_subtitle_overlay_geom';
const MIN_W = 280;
const MIN_H = 120;

function loadGeom(): OverlayGeometry {
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (!raw) return DEFAULT_GEOM;
    const g = JSON.parse(raw);
    return {
      x: typeof g.x === 'number' ? g.x : DEFAULT_GEOM.x,
      y: typeof g.y === 'number' ? g.y : DEFAULT_GEOM.y,
      w: Math.max(MIN_W, typeof g.w === 'number' ? g.w : DEFAULT_GEOM.w),
      h: Math.max(MIN_H, typeof g.h === 'number' ? g.h : DEFAULT_GEOM.h),
    };
  } catch {
    return DEFAULT_GEOM;
  }
}

function clampToViewport(g: OverlayGeometry): OverlayGeometry {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(Math.max(g.w, MIN_W), vw);
  const h = Math.min(Math.max(g.h, MIN_H), vh);
  const x = Math.min(Math.max(g.x, 0), Math.max(0, vw - w));
  const y = Math.min(Math.max(g.y, 0), Math.max(0, vh - h));
  return { x, y, w, h };
}

interface DragState {
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  orig: OverlayGeometry;
}

export interface FloatingSubtitleOverlayProps {
  settings: AppSettings;
  speakers: SpeakerConfig[];
  isDark: boolean;
  onClose: () => void;
  onEnterPip?: () => void;
  pipSupported: boolean;
}

export function FloatingSubtitleOverlay({
  settings,
  speakers,
  isDark,
  onClose,
  onEnterPip,
  pipSupported,
}: FloatingSubtitleOverlayProps) {
  const [geom, setGeom] = useState<OverlayGeometry>(() => clampToViewport(loadGeom()));
  const dragRef = useRef<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to the store fields we need to render live subtitles.
  const snap = useAppStore(useShallow(s => ({
    currentlySpeaking: s.currentlySpeaking,
    interimTextTutor: s.interimTextTutor,
    interimTextLearner: s.interimTextLearner,
    pendingTextTutor: s.pendingTextTutor,
    pendingTextLearner: s.pendingTextLearner,
  })));
  const chunks = useAppStore(s => s.chunks);

  const persistGeom = useCallback((g: OverlayGeometry) => {
    try { localStorage.setItem(GEO_KEY, JSON.stringify(g)); } catch { /* ignore */ }
  }, []);

  // ── Drag / resize via pointer events ─────────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const st = dragRef.current;
      if (!st) return;
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (st.mode === 'move') {
        const next = clampToViewport({ ...st.orig, x: st.orig.x + dx, y: st.orig.y + dy });
        setGeom(next);
      } else {
        const next = clampToViewport({
          ...st.orig,
          w: st.orig.w + dx,
          h: st.orig.h + dy,
        });
        setGeom(next);
      }
    };
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setGeom(g => { persistGeom(g); return g; });
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [persistGeom]);

  const startMove = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { mode: 'move', startX: e.clientX, startY: e.clientY, orig: geom };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  };

  const startResize = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode: 'resize', startX: e.clientX, startY: e.clientY, orig: geom };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
  };

  // Keep inside the viewport when the window resizes.
  useEffect(() => {
    const onResize = () => setGeom(g => clampToViewport(g));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { fontSize, historyFontSize, tutorColor, learnerColor } = settings.subtitle;
  const content = buildSubtitleContent(snap, chunks, settings.subtitle);
  const labelFor = (role: 'tutor' | 'learner') => speakers.find(s => s.role === role)?.label || (role === 'tutor' ? 'Tutor' : 'Learner');
  const colorFor = (role: 'tutor' | 'learner') => (role === 'tutor' ? tutorColor : learnerColor);

  return (
    <div
      ref={containerRef}
      style={{
        left: geom.x,
        top: geom.y,
        width: geom.w,
        height: geom.h,
      }}
      className={cn(
        'fixed z-40 flex flex-col rounded-xl overflow-hidden shadow-2xl border backdrop-blur-md select-none',
        isDark ? 'bg-slate-950/80 border-white/10 text-white' : 'bg-white/85 border-slate-300 text-slate-900',
      )}
    >
      {/* Header — draggable, interactive */}
      <div
        onPointerDown={startMove}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 border-b cursor-grab active:cursor-grabbing shrink-0',
          isDark ? 'border-white/10 bg-white/5' : 'border-slate-300/60 bg-slate-100/60',
        )}
        title="Drag to move"
      >
        <Move size={12} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Subtitles</span>
        <div className="ml-auto flex items-center gap-0.5">
          {pipSupported && onEnterPip && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={onEnterPip}
              title="Picture-in-Picture (over Zoom/Meet)"
              className={cn('p-1 rounded', isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-200 text-slate-600')}
            >
              <PictureInPicture2 size={13} />
            </button>
          )}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={onClose}
            title="Close overlay"
            className={cn('p-1 rounded', isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-200 text-slate-600')}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body — pointer-events none so it never blocks the underlying app/call */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2"
        style={{ pointerEvents: 'none' }}
      >
        {content.live.length === 0 && content.history.length === 0 && (
          <div className={cn('text-sm italic py-1 opacity-50')}>Listening…</div>
        )}

        {content.live.map((line, i) => (
          <div key={`live-${i}`} className={cn(i > 0 && 'mt-2')}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: colorFor(line.speaker) }}>
              {labelFor(line.speaker)}
            </div>
            <div className="leading-tight font-semibold truncate" style={{ fontSize }}>
              {line.text}
            </div>
          </div>
        ))}

        {content.history.length > 0 && (
          <div className={cn('mt-2 pt-2 border-t space-y-1', isDark ? 'border-white/10' : 'border-slate-300/50')}>
            {content.history.map(l => (
              <div key={l.id} className="flex flex-wrap gap-x-2">
                <span className="text-[10px] font-bold uppercase shrink-0" style={{ color: colorFor(l.speaker) }}>
                  {labelFor(l.speaker)}
                </span>
                <span className="opacity-90" style={{ fontSize: historyFontSize }}>{l.text}</span>
                {l.translation && (
                  <span className="opacity-60" style={{ fontSize: historyFontSize }}>→ {l.translation}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resize handle — bottom-right */}
      <div
        onPointerDown={startResize}
        className={cn(
          'absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end',
          isDark ? 'text-slate-400' : 'text-slate-500',
        )}
        title="Drag to resize"
      >
        <Maximize2 size={11} />
      </div>
    </div>
  );
}
