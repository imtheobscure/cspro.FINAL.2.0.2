import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { buildSubtitleContent, escapeHtml } from '../utils/subtitleContent';
import type { AppSettings, SpeakerConfig } from '../types';

/**
 * Document Picture-in-Picture for subtitles.
 *
 * The Document Picture-in-Picture API (`documentPictureInPicture.requestWindow`)
 * renders an arbitrary DOM element inside an always-on-top OS window — perfect
 * for keeping subtitles visible over Zoom/Meet/Teams while the call owns the
 * main screen.
 *
 * Browser support (as of mid-2025): Chrome 116+, Edge 116+. Not in Firefox/
 * Safari. When unsupported we fall back to a plain `window.open` popout that
 * renders the same content via `postMessage` — still useful on a second
 * monitor, though not always-on-top.
 *
 * Either way we render the SAME live + history subtitle content as the docked
 * bar and the floating overlay, using a single throttled update loop.
 */

// TypeScript doesn't ship types for documentPictureInPicture yet.
interface DocumentPipWindow extends Window {
  document: Document;
}
interface DocumentPictureInPicture {
  window: DocumentPipWindow | null;
  onwindowresize?: ((e: Event) => void) | null;
  requestWindow: (opts?: { width?: number; height?: number }) => Promise<DocumentPipWindow>;
}

function getDocPip(): DocumentPictureInPicture | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.documentPictureInPicture ?? null;
}

export function isDocumentPipSupported(): boolean {
  return !!getDocPip();
}

export interface SubtitlePip {
  active: boolean;
  supported: boolean;
  mode: 'document-pip' | 'window-popout' | 'none';
  open: () => void;
  close: () => void;
}

export function useSubtitlePip(
  settings: AppSettings,
  speakers: SpeakerConfig[],
  isDark: boolean,
): SubtitlePip {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<'document-pip' | 'window-popout' | 'none'>('none');
  const pipWindowRef = useRef<DocumentPipWindow | null>(null);
  const popoutRef = useRef<Window | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastHtmlRef = useRef<string>('');

  const snap = useAppStore(useShallow(s => ({
    currentlySpeaking: s.currentlySpeaking,
    interimTextTutor: s.interimTextTutor,
    interimTextLearner: s.interimTextLearner,
    pendingTextTutor: s.pendingTextTutor,
    pendingTextLearner: s.pendingTextLearner,
  })));
  const chunks = useAppStore(s => s.chunks);

  const supported = isDocumentPipSupported();

  const render = useCallback(() => {
    if (rafRef.current !== null) return; // already scheduled
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const content = buildSubtitleContent(snap, chunks, settings.subtitle);
      const html = renderHtml(content, settings, speakers, isDark);
      if (html === lastHtmlRef.current) return;
      lastHtmlRef.current = html;

      // Document PIP: inject into the live DOM.
      const pw = pipWindowRef.current;
      if (pw && !pw.closed) {
        const root = pw.document.getElementById('root');
        if (root) root.innerHTML = html;
        return;
      }
      // Window popout fallback: postMessage.
      const wo = popoutRef.current;
      if (wo && !wo.closed) {
        wo.postMessage({ t: 'sub', html }, '*');
      }
    });
  }, [snap, chunks, settings, speakers, isDark]);

  // Continuous render while active.
  useEffect(() => {
    if (!active) return;
    render();
    // Re-render on store changes is handled by snap/chunks deps above; this
    // interval catches edge cases (e.g. popout reload).
    const id = window.setInterval(render, 250);
    return () => window.clearInterval(id);
  }, [active, render]);

  const close = useCallback(() => {
    const dp = getDocPip();
    if (dp?.window && !dp.window.closed) {
      try { dp.window.close(); } catch { /* ignore */ }
    }
    if (popoutRef.current && !popoutRef.current.closed) {
      try { popoutRef.current.close(); } catch { /* ignore */ }
    }
    pipWindowRef.current = null;
    popoutRef.current = null;
    setActive(false);
    setMode('none');
    lastHtmlRef.current = '';
  }, []);

  const openDocPip = useCallback(async () => {
    const dp = getDocPip();
    if (!dp) return false;
    try {
      const win = await dp.requestWindow({ width: 560, height: 220 });
      if (!win || win.closed) return false;
      pipWindowRef.current = win;
      injectStyles(win, isDark, settings);
      win.document.body.innerHTML = '<div id="root"></div>';

      win.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
        setActive(false);
        setMode('none');
      });

      // Copy stylesheets for consistent look
      try {
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
          win.document.head.appendChild(node.cloneNode(true));
        });
      } catch { /* ignore */ }

      setActive(true);
      setMode('document-pip');
      return true;
    } catch (err) {
      console.warn('[useSubtitlePip] documentPictureInPicture.requestWindow failed:', err);
      return false;
    }
  }, [isDark, settings]);

  const openPopout = useCallback(() => {
    // Use a unique name each time to bypass popup blockers. Avoid '_blank'
    // because Firefox opens a new tab instead of a popup window when the
    // target is '_blank', and that tab often closes immediately.
    const name = 'tutorly_sub_' + Date.now();
    const w = window.open('', name, 'popup=yes,width=600,height=240');
    if (!w || w.closed) {
      // Popup blocked — try once more with a different unique name.
      const name2 = 'tutorly_sub_' + Date.now() + '_2';
      const w2 = window.open('', name2, 'popup=yes,width=600,height=240');
      if (!w2 || w2.closed) return false;
      popoutRef.current = w2;
      const doc = w2.document;
      doc.open();
      doc.write(popoutShellHtml(isDark, settings));
      doc.close();
    } else {
      popoutRef.current = w;
      const doc = w.document;
      doc.open();
      doc.write(popoutShellHtml(isDark, settings));
      doc.close();
    }
    setActive(true);
    setMode('window-popout');
    lastHtmlRef.current = '';
    return true;
  }, [isDark, settings]);

  const open = useCallback(() => {
    // If already open, focus instead of duplicating.
    if (pipWindowRef.current && !pipWindowRef.current.closed) { pipWindowRef.current.focus(); return; }
    if (popoutRef.current && !popoutRef.current.closed) { popoutRef.current.focus(); return; }

    if (supported) {
      openDocPip().then(ok => { if (!ok) openPopout(); });
    } else {
      openPopout();
    }
  }, [supported, openDocPip, openPopout]);

  // Close popout/PIP if the user disables it in settings.
  useEffect(() => {
    if (!settings.subtitle.documentPip && active) close();
  }, [settings.subtitle.documentPip, active, close]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      try { pipWindowRef.current?.close(); } catch { /* ignore */ }
      try { popoutRef.current?.close(); } catch { /* ignore */ }
    };
  }, []);

  return { active, supported, mode, open, close };
}

// ── HTML rendering for the PIP / popout windows ─────────────────────────────

function renderHtml(
  content: ReturnType<typeof buildSubtitleContent>,
  settings: AppSettings,
  speakers: SpeakerConfig[],
  isDark: boolean,
): string {
  const labelFor = (role: 'tutor' | 'learner') => {
    const sp = speakers.find(s => s.role === role);
    return escapeHtml(sp?.label || (role === 'tutor' ? 'Tutor' : 'Learner'));
  };
  const colorFor = (role: 'tutor' | 'learner') => (role === 'tutor' ? settings.subtitle.tutorColor : settings.subtitle.learnerColor);
  const fs = settings.subtitle.fontSize;
  const hfs = settings.subtitle.historyFontSize;

  let html = '';
  if (content.live.length === 0 && content.history.length === 0) {
    html += `<div class="idle">Listening…</div>`;
  }
  for (const line of content.live) {
    html += `<div class="line"><div class="label" style="color:${colorFor(line.speaker)}">${labelFor(line.speaker)}</div><div class="text" style="font-size:${fs}px">${escapeHtml(line.text)}</div></div>`;
  }
  if (content.history.length > 0) {
    html += `<div class="sep"></div>`;
    for (const l of content.history) {
      html += `<div class="hist"><span class="hlabel" style="color:${colorFor(l.speaker)}">${labelFor(l.speaker)}</span><span class="htext" style="font-size:${hfs}px">${escapeHtml(l.text)}</span>`;
      if (l.translation) html += `<span class="htr" style="font-size:${hfs}px">→ ${escapeHtml(l.translation)}</span>`;
      html += `</div>`;
    }
  }
  // Theme class on the wrapper so CSS can adapt.
  return `<div class="wrap ${isDark ? 'dark' : 'light'}">${html}</div>`;
}

function basePipCss(): string {
  return `
    *{margin:0;box-sizing:border-box}
    html,body{height:100%}
    body{padding:10px 14px;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
    .wrap{height:100%}
    .idle{font-size:18px;font-style:italic;opacity:.5;padding:4px 0}
    .line{margin-bottom:8px}
    .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:2px;opacity:.95}
    .text{font-weight:600;line-height:1.2;word-break:break-word}
    .sep{border-top:1px solid rgba(128,128,128,.25);margin:8px 0;padding-top:6px}
    .hist{display:flex;flex-wrap:wrap;gap:0 8px;line-height:1.35;margin-top:2px}
    .hlabel{font-size:10px;font-weight:700;text-transform:uppercase}
    .htext{opacity:.9}
    .htr{opacity:.6}
    .dark{background:#0b1120;color:#fff}
    .light{background:#ffffff;color:#111827}
  `;
}

function injectStyles(win: DocumentPipWindow, isDark: boolean, _settings: AppSettings): void {
  const style = win.document.createElement('style');
  style.textContent = basePipCss();
  win.document.head.appendChild(style);
  win.document.body.style.background = isDark ? '#0b1120' : '#ffffff';
}

function popoutShellHtml(isDark: boolean, _settings: AppSettings): string {
  const css = basePipCss();
  const bg = isDark ? '#0b1120' : '#ffffff';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Tutorly Subtitles</title><style>${css}body{background:${bg}}</style></head><body><div id="root"><div class="idle">Listening…</div></div><script>window.addEventListener("message",function(e){var d=e.data;if(!d||d.t!=="sub")return;var r=document.getElementById("root");if(r)r.innerHTML=d.html;});</script></body></html>`;
}
