import React, { useEffect, useMemo, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   TUTORLY GAME SHELL
   ───────────────────────────────────────────────────────────────────────────
   ONE splash screen + ONE setup flow for ALL games.

   Flow (identical in every game):
     1. Splash screen  →  press Play
     2. Setup page     →  player names + facts + avatars + game location
     3. Copy AI prompt →  paste it into ChatGPT / Claude
     4. Paste the JSON the AI returns → Load pack
     5. Start the game with that content

   To use it in another game: copy this file, then pass a config object
   (title, emoji, features, location label, and your own prompt builder).
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   SHELL CSS — shipped INSIDE this file on purpose.
   The splash used to depend on classes living in each game's index.css; when a
   game did not have them the decorative emojis fell into normal flow and the
   splash became a tall column of emoji that scrolled. Keeping the styles here
   makes the shell a true drop-in: copy the file and it is correct everywhere.
   The splash is locked to one viewport height (100dvh) and its type/spacing
   scale with BOTH the viewport width and height, so it never gets "long".
   ═══════════════════════════════════════════════════════════════════════════ */
const SHELL_CSS = `
.tutorly-shell-root { --shell-gap: clamp(6px, 1.5vh, 22px); }

/* ── splash: exactly one screen tall, never scrolls ── */
.shell-splash {
  height: 100dvh;
  min-height: 100svh;
  max-height: 100dvh;
  overflow: hidden;
}
.shell-setup-screen {
  height: 100dvh;
  max-height: 100dvh;
  overflow-y: auto;   /* only ever needed below the FitFrame floor */
  overflow-x: hidden;
}
.shell-splash-scroll {
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
}

/* ── decorative background emojis: absolutely placed, never in flow ── */
.shell-floater {
  position: absolute;
  pointer-events: none;
  user-select: none;
  animation: shellFloat 7s ease-in-out infinite;
}
@keyframes shellFloat {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50%      { transform: translateY(-18px) rotate(4deg); }
}

/* ── hero emoji + entrance animations ── */
.shell-hero-emoji { display: inline-block; animation: shellHeroPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes shellHeroPop {
  0%   { transform: scale(0.6) rotate(-8deg); opacity: 0; }
  60%  { transform: scale(1.08) rotate(3deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes shellCardIn {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.shell-card-in { animation: shellCardIn 0.35s ease; }

/* ── vertical rhythm that adapts to the window HEIGHT ── */
.shell-splash .shell-brand-row   { margin-bottom: clamp(6px, 1.6vh, 26px); }
.shell-splash .shell-brand-text  { margin-bottom: clamp(4px, 1.6vh, 22px); }
.shell-splash .shell-divider     { margin-bottom: clamp(4px, 1.6vh, 22px); }
.shell-splash .shell-hero-emoji  { font-size: clamp(2.4rem, 6.5vh, 6.5rem); margin-bottom: clamp(2px, 0.8vh, 10px); }
.shell-splash .shell-title       { font-size: clamp(1.5rem, 6vh, 3.9rem); margin: 0 0 clamp(2px, 0.9vh, 10px); }
.shell-splash .shell-sub         { margin-bottom: clamp(4px, 1.4vh, 18px); }
.shell-splash .shell-tagline     { font-size: clamp(0.82rem, 2.1vh, 1.25rem); margin-bottom: clamp(6px, 1.8vh, 26px); }
.shell-splash .shell-chip-row    { margin-bottom: clamp(8px, 2vh, 28px); }
.shell-splash .shell-chip        { padding: clamp(4px, 0.8vh, 7px) clamp(9px, 1vw, 14px); font-size: clamp(0.68rem, 1.6vh, 0.82rem); }
.shell-splash .shell-play-btn    { padding: clamp(11px, 2vh, 18px) clamp(18px, 3.4vw, 52px); font-size: clamp(0.92rem, 2.4vh, 1.5rem); }
.shell-splash .shell-alt-btn     { padding: clamp(11px, 2vh, 18px) clamp(12px, 1.8vw, 26px); font-size: clamp(0.85rem, 2vh, 1rem); }
.shell-splash .shell-footer      { margin-top: clamp(8px, 2vh, 30px); }

/* Very short windows (laptops in a projector window, tablets landscape):
   drop the optional decoration before anything gets clipped. */
@media (max-height: 720px) {
  .shell-splash .shell-optional { display: none !important; }
  .shell-splash .shell-tagline  { margin-bottom: 10px; }
  .shell-splash .shell-chip-row { gap: 6px; margin-bottom: 12px; }
}
@media (max-height: 560px) {
  .shell-splash .shell-chip-row { display: none !important; }
  .shell-splash .shell-title    { font-size: clamp(1.25rem, 5.5vh, 1.9rem); }
  .shell-splash .shell-hero-emoji { font-size: clamp(2rem, 9vh, 3rem); }
}

/* Narrow phones: centre the toolbar, stack the action buttons. */
@media (max-width: 620px) {
  .shell-splash .shell-actions { flex-direction: column; align-items: stretch; }
  .shell-splash .shell-actions > button { width: 100%; }
}

/* ── SETUP PAGE: two columns, so the steps fit the window height ── */
.setup-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 16px; align-items: start; }
.setup-col { min-width: 0; }
.setup-grid > .setup-col:last-child { position: sticky; top: 12px; }
@media (max-width: 1080px) {
  .setup-grid { grid-template-columns: 1fr; }
  .setup-grid > .setup-col:last-child { position: static; }
}
/* Short windows: tighten the setup steps before anything is cut off. */
@media (max-height: 900px) {
  .shell-setup-screen { padding-top: 10px !important; }
  .shell-setup-screen section, .shell-setup-screen [style*="marginBottom: 14"] { margin-bottom: 10px !important; }
  .shell-setup-screen h1 { font-size: clamp(1.3rem, 3.6vh, 1.9rem) !important; }
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   FITFRAME — the "nothing is ever clipped" guarantee for every screen.
   Measures the natural height of its children against the space it was given
   and, only when they do not fit, shrinks them with CSS `zoom` until they do.
   Media queries alone cannot promise a fit (a 7-option question, a long form,
   a short projector window), so this is the backstop under all of them.
   Never scales above 1x; stops at `min` and lets the parent scroll after that.
   `zoom` keeps layout boxes in the parent's coordinate space, which is what
   lets `avail / visual` converge in one pass with no feedback loop.
   ═══════════════════════════════════════════════════════════════════════════ */
export const FitFrame: React.FC<{ children: React.ReactNode; min?: number; className?: string }> = ({
  children,
  min = 0.62,
  className,
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);
  const [width, setWidth] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const fit = () => {
      const parent = el.parentElement;
      if (!parent) return;
      const cs = getComputedStyle(parent);
      const availH =
        parent.clientHeight - parseFloat(cs.paddingTop || '0') - parseFloat(cs.paddingBottom || '0');
      const availW =
        parent.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
      const visualH = el.getBoundingClientRect().height;
      if (availH <= 0 || visualH <= 0 || availW <= 0) return;
      const ratio = availH / visualH;
      setScale(prev => {
        if (ratio >= 1) {
          const relaxed = Math.min(1, prev * ratio);
          return relaxed - prev > 0.02 ? +relaxed.toFixed(3) : prev;
        }
        const next = Math.max(min, prev * ratio);
        return prev - next > 0.005 ? +next.toFixed(3) : prev;
      });
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };
    const onResize = () => {
      setScale(1);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { raf = requestAnimationFrame(fit); });
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener('resize', onResize);
    // A single measurement can run before the content has settled (web fonts,
    // late data, images), which used to leave a too-tall frame unscaled. Repeat
    // a few cheap passes on the way in and once the fonts are ready.
    const timers = [90, 260, 700, 1600].map(ms => window.setTimeout(schedule, ms));
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) void fonts.ready.then(schedule).catch(() => {});
    schedule();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      timers.forEach(t => window.clearTimeout(t));
      cancelAnimationFrame(raf);
    };
  }, [min]);

  // With `zoom`, 100% width would end up narrower than the frame; size it in px.
  React.useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const cs = getComputedStyle(parent);
    const availW =
      parent.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
    if (availW > 0) setWidth(availW / scale);
  }, [scale]);

  return (
    <div
      ref={ref}
      className={className}
      /* No `maxWidth: 100%` here on purpose: it is measured against the UNZOOMED
         containing block, so with zoom < 1 it would clamp the width and leave a
         gap on the right instead of filling the frame. */
      style={{ zoom: scale, width: width ? `${width}px` : '100%' } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TUTORLY BRANDING — shared with the Adult Dashboard
   ───────────────────────────────────────────────────────────────────────────
   The Adult Dashboard's General Settings → "Splash Screen Text / Subtext"
   (and the tutor logo) are saved in localStorage under `app-storage`. Games
   are served from the same origin, so they read the very same values: change
   it once in the dashboard and every game's first page updates (instantly in
   open tabs, and on load everywhere else).
   ═══════════════════════════════════════════════════════════════════════════ */
export interface TutorlyBranding {
  /** tutorInfo.splashScreenText, e.g. "Tutorly Presents" */
  text: string | null;
  /** tutorInfo.splashScreenSubtext, e.g. "Welcome to your learning journey" */
  subtext: string | null;
  /** the tutor's logo — replaces the 🎓 mark when set */
  logoUrl: string | null;
  /** tutorInfo.enableSplashScreens — off hides the personalised band */
  enabled: boolean;
}

const EMPTY_BRANDING: TutorlyBranding = { text: null, subtext: null, logoUrl: null, enabled: true };

export function readTutorlyBranding(): TutorlyBranding {
  if (typeof window === 'undefined') return EMPTY_BRANDING;
  try {
    const raw = window.localStorage.getItem('app-storage');
    if (!raw) return EMPTY_BRANDING;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    const tutorInfo = (parsed?.state?.tutorInfo ?? {}) as Record<string, unknown>;
    const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
    return {
      text: str(tutorInfo.splashScreenText),
      subtext: str(tutorInfo.splashScreenSubtext),
      logoUrl: str(tutorInfo.logoUrl) ?? str(parsed?.state?.logoUrl),
      enabled: tutorInfo.enableSplashScreens !== false,
    };
  } catch {
    return EMPTY_BRANDING;
  }
}

/** Live view of the dashboard settings: updates the moment they are saved. */
export function useTutorlyBranding(): TutorlyBranding {
  const [branding, setBranding] = useState<TutorlyBranding>(readTutorlyBranding);
  useEffect(() => {
    const refresh = () => setBranding(readTutorlyBranding());
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'app-storage') refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return branding;
}

export interface ShellPlayer {
  name: string;
  emoji: string;
  color: string;
  /** interests / strengths / background — the AI uses this to personalise questions */
  facts: string;
  /** home town or city */
  from: string;
  isNPC: boolean;
  npcLines: string;
}

export interface PromptCtx {
  players: ShellPlayer[];
  location: string;
  level: string;
  topic: string;
}

export interface ShellSetupResult extends PromptCtx {
  /** raw JSON pasted by the teacher (null when they start with the default content) */
  json: string | null;
}

export interface ShellSplashConfig {
  gameTitle: string;
  gameEmoji: string;
  tagline: string;
  accent?: string;
  features: { icon: string; label: string }[];
  howToPlay: string[];
  /** optional third button, e.g. a game's own extra setup screen */
  extraAction?: { label: string; onClick: () => void };
}

export interface ShellSetupConfig {
  gameTitle: string;
  gameEmoji: string;
  accent?: string;
  playersHeading: string;
  playersHelp: string;
  locationLabel: string;
  locationPlaceholder: string;
  locationHelp: string;
  /** heading of step 2 — games that need no city can rename it (default: "Game location & level") */
  settingsHeading?: string;
  topics: string[];
  levels: string[];
  playerColors: string[];
  avatars: string[];
  maxPlayers: number;
  buildPrompt: (ctx: PromptCtx) => string;
  /** optional instant validation of the pasted JSON so the teacher sees errors early */
  validateJson?: (json: string) => { ok: boolean; message: string };
  /** placeholder of the JSON paste box — each game names the key its own pack starts with */
  jsonPlaceholder?: string;
  onStart: (data: ShellSetupResult) => void;
  onBack?: () => void;
}

type Palette = {
  bg: string;
  page: string;
  card: string;
  input: string;
  border: string;
  text: string;
  sub: string;
  chip: string;
};

function palettes(dark: boolean): Palette {
  return dark
    ? {
        bg: '#0b1220',
        page: 'linear-gradient(160deg,#0b1220 0%,#101a2e 45%,#0b1220 100%)',
        card: 'rgba(30,41,59,0.86)',
        input: '#0f172a',
        border: '#334155',
        text: '#f1f5f9',
        sub: '#94a3b8',
        chip: 'rgba(255,255,255,0.06)',
      }
    : {
        bg: '#f5f5f0',
        page: 'linear-gradient(160deg,#eef2ff 0%,#f8fafc 45%,#fef7ec 100%)',
        card: 'rgba(255,255,255,0.9)',
        input: '#f8fafc',
        border: '#cbd5e1',
        text: '#1e2a3a',
        sub: '#64748b',
        chip: 'rgba(255,255,255,0.85)',
      };
}

const shellButton = (kind: 'gold' | 'navy' | 'green' | 'ghost', text: string, dark: boolean) => {
  if (kind === 'gold')
    return {
      background: 'linear-gradient(135deg,#f5b042 0%,#e09a20 50%,#f5b042 100%)',
      color: '#1e2a3a',
      border: 'none',
      boxShadow: '0 6px 22px rgba(224,154,32,0.45)',
      fontWeight: 900,
    } as React.CSSProperties;
  if (kind === 'green')
    return {
      background: 'linear-gradient(135deg,#6dcf70,#3da342)',
      color: '#fff',
      border: 'none',
      boxShadow: '0 6px 20px rgba(61,163,66,0.4)',
      fontWeight: 800,
    } as React.CSSProperties;
  if (kind === 'ghost')
    return {
      background: 'transparent',
      color: text,
      border: `1px solid ${dark ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.2)'}`,
      fontWeight: 700,
    } as React.CSSProperties;
  return {
    background: 'linear-gradient(135deg,#2d3f57 0%,#1e2a3a 100%)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
    fontWeight: 800,
  } as React.CSSProperties;
};

const pressable = (style: React.CSSProperties, disabled = false): React.CSSProperties => ({
  ...style,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  transition: 'transform .15s ease, box-shadow .2s ease, filter .2s ease',
});

// ─── TUTORLY BRAND LOCKUP (identical in every game) ───────────────────────────
export const TutorlyBrand: React.FC<{ darkMode: boolean; size?: 'sm' | 'md' | 'lg'; logoUrl?: string | null }> = ({ darkMode, size = 'lg', logoUrl }) => {
  const box = size === 'lg' ? 58 : size === 'md' ? 42 : 32;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? 14 : 9, justifyContent: 'center' }}>
      <div
        style={{
          width: box,
          height: box,
          flexShrink: 0,
          borderRadius: box * 0.28,
          background: 'linear-gradient(135deg,#f7c366 0%,#f5b042 45%,#e09a20 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: box * 0.55,
          lineHeight: 1,
          boxShadow: '0 10px 26px rgba(224,154,32,0.38), inset 0 1px 0 rgba(255,255,255,0.6)',
          overflow: 'hidden',
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          '🎓'
        )}
      </div>
      <div style={{ textAlign: 'left' }}>
        <div
          style={{
            fontSize: size === 'lg' ? 'clamp(1.7rem, 3.6vw, 2.4rem)' : size === 'md' ? '1.15rem' : '0.95rem',
            fontWeight: 950,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: darkMode ? '#ffffff' : '#16233a',
          }}
        >
          Tutorly
        </div>
        <div
          style={{
            fontSize: size === 'lg' ? '0.68rem' : '0.55rem',
            fontWeight: 900,
            letterSpacing: '0.34em',
            color: '#e09a20',
            marginTop: size === 'lg' ? 4 : 2,
          }}
        >
          GAMES
        </div>
      </div>
    </div>
  );
};

// ─── DARK / LIGHT TOGGLE (identical in every game) ────────────────────────────
export const ThemeToggle: React.FC<{ darkMode: boolean; onToggle: () => void }> = ({ darkMode, onToggle }) => {
  const p = palettes(darkMode);
  return (
    <button
      onClick={onToggle}
      style={pressable({
        ...shellButton('ghost', p.text, darkMode),
        borderRadius: 99,
        padding: '8px 14px',
        fontSize: '0.82rem',
      })}
    >
      {darkMode ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. SPLASH SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */
export const SplashScreen: React.FC<{
  config: ShellSplashConfig;
  darkMode: boolean;
  onToggleDark: () => void;
  onPlay: () => void;
  hasSavedGame?: boolean;
  onContinue?: () => void;
}> = ({ config, darkMode, onToggleDark, onPlay, hasSavedGame, onContinue }) => {
  const p = palettes(darkMode);
  const accent = config.accent ?? '#f5b042';
  const [showHow, setShowHow] = useState(false);
  // Tutorly's Adult Dashboard settings, shared by every game on this origin.
  const branding = useTutorlyBranding();
  const brandText = branding.enabled ? branding.text : null;
  const brandSub = branding.enabled ? branding.subtext : null;

  const floaters = useMemo(
    () => [config.gameEmoji, '🎲', '🌍', '🏆', '💡', '🎯', '🚀', '✨'],
    [config.gameEmoji]
  );

  return (
    <div
      className="shell-splash tutorly-shell-root"
      style={{
        background: p.page,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(10px, 2.4vh, 30px) clamp(12px, 3vw, 32px)',
        fontFamily: "'Montserrat','Inter',sans-serif",
        color: p.text,
      }}
    >
      <style>{SHELL_CSS}</style>

      {/* floating background emojis */}
      {floaters.map((f, i) => (
        <div
          key={i}
          aria-hidden
          className="shell-floater"
          style={{
            left: `${4 + i * 12}%`,
            top: `${8 + ((i * 37) % 72)}%`,
            fontSize: `${2 + (i % 3) * 1.4}rem`,
            animationDelay: `${i * 0.45}s`,
            opacity: darkMode ? 0.16 : 0.22,
          }}
        >
          {f}
        </div>
      ))}

      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 5 }}>
        <ThemeToggle darkMode={darkMode} onToggle={onToggleDark} />
      </div>

      <FitFrame min={0.75} className="shell-splash-fit">
      <div className="shell-splash-scroll" style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 860, textAlign: 'center', margin: '0 auto' }}>
        <div className="shell-brand-row">
          <TutorlyBrand darkMode={darkMode} size="lg" logoUrl={branding.logoUrl} />
        </div>

        {/* The tutor's own splash wording (Adult Dashboard → General Settings) */}
        {brandText && (
          <div
            className="shell-brand-text"
            style={{
              fontSize: 'clamp(1.05rem, 2.6vw, 1.5rem)',
              fontWeight: 900,
              letterSpacing: '0.02em',
              color: p.text,
              opacity: 0.92,
            }}
          >
            {brandText}
          </div>
        )}

        <div
          className="shell-divider shell-optional"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'center',
          }}
        >
          <div style={{ height: 1, width: 'clamp(20px, 8vw, 90px)', background: darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(22,35,58,0.18)' }} />
          <div style={{ fontSize: '0.66rem', fontWeight: 900, letterSpacing: '0.3em', color: p.sub, whiteSpace: 'nowrap' }}>
            ONE SETUP · EVERY GAME
          </div>
          <div style={{ height: 1, width: 'clamp(20px, 8vw, 90px)', background: darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(22,35,58,0.18)' }} />
        </div>

        <div className="shell-hero-emoji" style={{ lineHeight: 1 }}>
          {config.gameEmoji}
        </div>

        <h1
          className="shell-title"
          style={{
            fontWeight: 950,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            textShadow: darkMode ? '0 6px 30px rgba(0,0,0,0.55)' : '0 4px 18px rgba(15,23,42,0.14)',
          }}
        >
          {config.gameTitle}
        </h1>

        {brandSub && (
          <div
            className="shell-sub"
            style={{
              display: 'inline-block',
              fontSize: 'clamp(0.95rem, 2.2vw, 1.2rem)',
              fontWeight: 800,
              color: darkMode ? '#ffe6b0' : '#8a5a10',
              background: darkMode ? 'rgba(245,176,66,0.14)' : 'rgba(245,176,66,0.18)',
              border: `1px solid ${darkMode ? 'rgba(245,176,66,0.3)' : 'rgba(224,154,32,0.35)'}`,
              borderRadius: 14,
              padding: 'clamp(6px, 1.2vh, 10px) clamp(10px, 1.6vw, 18px)',
              maxWidth: 720,
            }}
          >
            {brandSub}
          </div>
        )}

        <div className="shell-tagline" style={{ fontWeight: 700, color: p.sub }}>
          {config.tagline}
        </div>

        {/* feature chips */}
        <div className="shell-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {config.features.map(f => (
            <div
              key={f.label}
              className="shell-chip"
              style={{
                background: p.chip,
                border: `1px solid ${p.border}`,
                borderRadius: 99,
                fontWeight: 800,
                color: p.text,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <span style={{ fontSize: '1rem' }}>{f.icon}</span> {f.label}
            </div>
          ))}
        </div>

        <div className="shell-actions" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onPlay}
            className="shell-play-btn"
            style={pressable({
              ...shellButton('gold', p.text, darkMode),
              borderRadius: 16,
            })}
          >
            ▶ Play — Set Up Players
          </button>

          {hasSavedGame && onContinue && (
            <button
              onClick={onContinue}
              className="shell-alt-btn"
              style={pressable({
                ...shellButton('green', p.text, darkMode),
                borderRadius: 16,
              })}
            >
              ♻️ Continue Saved Game
            </button>
          )}

          <button
            onClick={() => setShowHow(s => !s)}
            className="shell-alt-btn"
            style={pressable({
              ...shellButton('navy', p.text, darkMode),
              borderRadius: 16,
            })}
          >
            {showHow ? '✕ Close' : '❓ How to Play'}
          </button>

          {config.extraAction && (
            <button
              onClick={config.extraAction.onClick}
              className="shell-alt-btn"
              style={pressable({
                ...shellButton('ghost', p.text, darkMode),
                borderRadius: 16,
              })}
            >
              {config.extraAction.label}
            </button>
          )}
        </div>

        {showHow && (
          <div
            className="shell-card-in"
            style={{
              marginTop: 24,
              background: p.card,
              backdropFilter: 'blur(14px)',
              border: `1px solid ${p.border}`,
              borderRadius: 18,
              padding: '20px 24px',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: 900, letterSpacing: '0.12em', color: accent, marginBottom: 12 }}>
              HOW TO PLAY
            </div>
            {config.howToPlay.map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: accent,
                    color: '#1e2a3a',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.45, color: p.text }}>{line}</div>
              </div>
            ))}
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 12,
                background: darkMode ? 'rgba(245,176,66,0.12)' : 'rgba(245,176,66,0.16)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: p.text,
              }}
            >
              🧩 Every Tutorly game uses this same flow: splash → player setup → AI prompt → paste JSON → play.
            </div>
          </div>
        )}
      </div>

      <div className="shell-footer shell-optional" style={{ position: 'relative', zIndex: 2, fontSize: '0.75rem', fontWeight: 700, color: p.sub, textAlign: 'center' }}>
        Tutorly · personalised language games for every lesson
        <div style={{ marginTop: 4, fontSize: '0.68rem', fontWeight: 600, opacity: 0.75 }}>
          Splash text, subtext and logo follow your Tutorly dashboard settings
        </div>
      </div>
      </FitFrame>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. SETUP PAGE — players (name + facts + avatar) → AI prompt → paste JSON → start
   ═══════════════════════════════════════════════════════════════════════════ */
export const PlayerSetup: React.FC<{
  config: ShellSetupConfig;
  darkMode: boolean;
  onToggleDark: () => void;
}> = ({ config, darkMode, onToggleDark }) => {
  const p = palettes(darkMode);
  const accent = config.accent ?? '#f5b042';
  const maxPlayers = config.maxPlayers ?? 6;
  const branding = useTutorlyBranding();
  // The setup page ships the same stylesheet so it works in any game too.
  const shellStyle = <style>{SHELL_CSS}</style>;

  const blankPlayer = (i: number): ShellPlayer => ({
    name: '',
    emoji: config.avatars[i % config.avatars.length],
    color: config.playerColors[i % config.playerColors.length],
    facts: '',
    from: '',
    isNPC: false,
    npcLines: '',
  });

  const [players, setPlayers] = useState<ShellPlayer[]>([blankPlayer(0), blankPlayer(1)]);
  const [location, setLocation] = useState('');
  const [level, setLevel] = useState(config.levels[Math.min(2, config.levels.length - 1)] ?? 'B1');
  const [topic, setTopic] = useState(config.topics[0] ?? 'General English');
  const [avatarPickFor, setAvatarPickFor] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [json, setJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [packState, setPackState] = useState<{ ok: boolean; message: string } | null>(null);

  const update = <K extends keyof ShellPlayer>(i: number, key: K, value: ShellPlayer[K]) =>
    setPlayers(prev => prev.map((pl, idx) => (idx === i ? { ...pl, [key]: value } : pl)));

  const addPlayer = (isNPC: boolean) => {
    if (players.length >= maxPlayers) return;
    const i = players.length;
    setPlayers(prev => [
      ...prev,
      {
        ...blankPlayer(i),
        name: isNPC ? `NPC ${i}` : '',
        isNPC,
        npcLines: isNPC ? 'Confident rival who loves winning!' : '',
      },
    ]);
    setExpanded(i);
  };

  const removePlayer = (i: number) => {
    if (players.length <= 1) return;
    setPlayers(prev => prev.filter((_, idx) => idx !== i));
    setExpanded(null);
  };

  const prompt = useMemo(
    () => config.buildPrompt({ players, location: location.trim(), level, topic }),
    [config, players, location, level, topic]
  );

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2600);
  };

  const loadPack = () => {
    if (!json.trim()) {
      setPackState({ ok: false, message: 'Paste the JSON your AI returned first.' });
      return;
    }
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch (e) {
      setPackState({ ok: false, message: e instanceof Error ? `JSON error: ${e.message}` : 'Invalid JSON' });
      return;
    }
    const res = config.validateJson
      ? config.validateJson(json)
      : { ok: true, message: 'JSON looks valid — press Start!' };
    setPackState(res);
    if (res.ok) applyPlayersFromPack(data);
  };

  /** if the AI pack contains player profiles, pull names/avatars/colors into the form */
  const applyPlayersFromPack = (data: unknown) => {
    const packs = Array.isArray(data) ? [] : (data as { players?: unknown }).players;
    if (!Array.isArray(packs) || packs.length === 0) return;
    setPlayers(prev =>
      prev.map((pl, i) => {
        const incoming = packs[i] as { name?: string; emoji?: string; color?: string; npcLines?: string } | undefined;
        if (!incoming) return pl;
        return {
          ...pl,
          name: pl.name || incoming.name || pl.name,
          emoji: incoming.emoji || pl.emoji,
          color: incoming.color || pl.color,
          npcLines: pl.npcLines || incoming.npcLines || '',
        };
      })
    );
  };

  const start = () => {
    config.onStart({
      players: players.map((pl, i) => ({ ...pl, name: pl.name.trim() || `Player ${i + 1}` })),
      location: location.trim(),
      level,
      topic,
      json: json.trim() ? json : null,
    });
  };

  const field: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: `1.5px solid ${p.border}`,
    background: p.input,
    color: p.text,
    fontSize: '0.92rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    outline: 'none',
  };
  const label: React.CSSProperties = {
    fontSize: '0.68rem',
    fontWeight: 900,
    letterSpacing: '0.1em',
    color: p.sub,
    display: 'block',
    marginBottom: 4,
  };
  const section: React.CSSProperties = {
    background: p.card,
    backdropFilter: 'blur(14px)',
    border: `1px solid ${p.border}`,
    borderRadius: 20,
    padding: '20px 22px',
    marginBottom: 16,
    boxShadow: darkMode ? '0 18px 50px rgba(0,0,0,0.35)' : '0 14px 40px rgba(15,23,42,0.08)',
  };

  const stepNo = (n: number) => (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: accent,
        color: '#1e2a3a',
        fontWeight: 900,
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {n}
    </div>
  );

  return (
    <div
      className="shell-setup-screen"
      style={{
        minHeight: '100dvh',
        background: p.page,
        padding: 'clamp(12px, 2.2vh, 22px) clamp(12px, 3vw, 26px) clamp(20px, 5vh, 56px)',
        fontFamily: "'Montserrat','Inter',sans-serif",
        color: p.text,
      }}
    >
      {shellStyle}
      <FitFrame min={0.7}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          {config.onBack && (
            <button
              onClick={config.onBack}
              style={pressable({ ...shellButton('ghost', p.text, darkMode), borderRadius: 12, padding: '8px 14px', fontSize: '0.82rem' })}
            >
              ← Back
            </button>
          )}
          <TutorlyBrand darkMode={darkMode} size="md" logoUrl={branding.logoUrl} />
          <div style={{ width: 1, alignSelf: 'stretch', background: p.border, margin: '0 2px' }} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 'clamp(1.05rem, 2.2vw, 1.35rem)', fontWeight: 950, lineHeight: 1.1 }}>
              {config.gameEmoji} {config.gameTitle}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: accent }}>
              PLAYER SETUP · SAME FLOW IN EVERY GAME
            </div>
          </div>
          <ThemeToggle darkMode={darkMode} onToggle={onToggleDark} />
        </div>

        {/* Steps 1+2 (players, settings) sit beside step 3 (AI pack) on a wide
            screen so the whole setup page fits the window instead of running
            ~500px past the bottom of it. On a narrow screen it stacks 1→4. */}
        <div className="setup-grid">
        <div className="setup-col">
        {/* ── STEP 1 · PLAYERS ── */}
        <div style={section}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {stepNo(1)}
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>{config.playersHeading}</div>
              <div style={{ fontSize: '0.82rem', color: p.sub, fontWeight: 600 }}>{config.playersHelp}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', margin: '10px 0 14px' }}>
            <button
              className="btn-navy"
              onClick={() => addPlayer(false)}
              disabled={players.length >= maxPlayers}
              style={pressable({ ...shellButton('navy', p.text, darkMode), padding: '8px 14px', borderRadius: 10, fontSize: '0.8rem' }, players.length >= maxPlayers)}
            >
              + Player
            </button>
            <button
              onClick={() => addPlayer(true)}
              disabled={players.length >= maxPlayers}
              style={pressable(
                {
                  ...shellButton('navy', p.text, darkMode),
                  background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                },
                players.length >= maxPlayers
              )}
            >
              + NPC 🤖
            </button>
          </div>

          {players.map((pl, i) => (
            <div
              key={i}
              style={{
                border: `2px solid ${expanded === i ? accent : p.border}`,
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 10,
                background: pl.isNPC ? (darkMode ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.06)') : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                <button
                  onClick={() => setAvatarPickFor(avatarPickFor === i ? null : i)}
                  title="Pick an avatar"
                  style={pressable({
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: `${pl.color}22`,
                    border: `2px solid ${pl.color}`,
                    fontSize: '1.5rem',
                    flexShrink: 0,
                    lineHeight: 1,
                  })}
                >
                  {pl.emoji}
                </button>
                <input
                  value={pl.name}
                  onChange={e => update(i, 'name', e.target.value)}
                  placeholder={pl.isNPC ? 'NPC name' : 'Player / learner name'}
                  style={{ ...field, flex: 1, minWidth: 120 }}
                />
                <input
                  type="color"
                  value={pl.color}
                  onChange={e => update(i, 'color', e.target.value)}
                  title="Player colour"
                  style={{ width: 34, height: 34, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent', flexShrink: 0 }}
                />
                {pl.isNPC && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#7c3aed', color: '#fff', padding: '3px 7px', borderRadius: 6 }}>
                    NPC
                  </span>
                )}
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  style={pressable({ ...shellButton('ghost', p.text, darkMode), padding: '6px 10px', borderRadius: 8, fontSize: '0.78rem' })}
                >
                  {expanded === i ? '▲' : '▼'}
                </button>
                {players.length > 1 && (
                  <button
                    onClick={() => removePlayer(i)}
                    title="Remove player"
                    style={pressable({
                      background: 'rgba(217,83,79,0.12)',
                      border: '1px solid #d9534f',
                      color: '#d9534f',
                      borderRadius: 8,
                      padding: '6px 9px',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                    })}
                  >
                    ✕
                  </button>
                )}
              </div>

              {avatarPickFor === i && (
                <div style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 4, borderTop: `1px solid ${p.border}` }}>
                  {config.avatars.map(em => (
                    <button
                      key={em}
                      onClick={() => { update(i, 'emoji', em); setAvatarPickFor(null); }}
                      style={pressable({
                        width: 36,
                        height: 36,
                        fontSize: '1.2rem',
                        borderRadius: 8,
                        border: em === pl.emoji ? `2px solid ${accent}` : '2px solid transparent',
                        background: 'transparent',
                        lineHeight: 1,
                      })}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {expanded === i && (
                <div style={{ padding: '12px 14px', borderTop: `1px solid ${p.border}`, display: 'grid', gap: 10 }}>
                  <div>
                    <label style={label}>{pl.isNPC ? '🤖 NPC PERSONALITY & DIALOGUE LINES' : '📋 FACTS / INTERESTS / STRENGTHS (the AI personalises the game with these)'}</label>
                    <textarea
                      value={pl.isNPC ? pl.npcLines : pl.facts}
                      onChange={e => update(i, pl.isNPC ? 'npcLines' : 'facts', e.target.value)}
                      placeholder={
                        pl.isNPC
                          ? 'e.g. "Welcome to MY city! Beat me at my own game!" — dramatic, loves puns…'
                          : 'e.g. Loves football, works in tech, beginner at cooking, learning English for work trips…'
                      }
                      style={{ ...field, minHeight: 62, fontWeight: 600, resize: 'vertical' }}
                    />
                  </div>
                  {!pl.isNPC && (
                    <div>
                      <label style={label}>🏠 FROM (city / country — optional)</label>
                      <input
                        value={pl.from}
                        onChange={e => update(i, 'from', e.target.value)}
                        placeholder="e.g. Berlin, Germany"
                        style={field}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 2 · GAME LOCATION & SETTINGS ── */}
        <div style={section}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {stepNo(2)}
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>{config.settingsHeading ?? 'Game location & level'}</div>
              <div style={{ fontSize: '0.82rem', color: p.sub, fontWeight: 600 }}>{config.locationHelp}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            <div>
              <label style={label}>{config.locationLabel}</label>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder={config.locationPlaceholder}
                style={field}
              />
            </div>
            <div>
              <label style={label}>CEFR LEVEL</label>
              <select value={level} onChange={e => setLevel(e.target.value)} style={field}>
                {config.levels.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>TOPIC FOCUS</label>
              <select value={topic} onChange={e => setTopic(e.target.value)} style={field}>
                {config.topics.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        </div>

        <div className="setup-col setup-col-right">
        {/* ── STEP 3 · AI PACK ── */}
        <div style={section}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {stepNo(3)}
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>AI content pack</div>
              <div style={{ fontSize: '0.82rem', color: p.sub, fontWeight: 600 }}>
                Copy the prompt → paste it into ChatGPT / Claude → paste the JSON it returns here → Load pack.
              </div>
            </div>
          </div>

          <button
            onClick={copyPrompt}
            style={pressable({ ...shellButton('navy', p.text, darkMode), width: '100%', padding: '14px', borderRadius: 12, fontSize: '1rem' })}
          >
            📋 Copy AI Prompt for {config.gameTitle}
            {copied && <span style={{ marginLeft: 10, color: '#6dcf70', fontWeight: 900 }}>✓ Copied!</span>}
          </button>

          <textarea
            value={json}
            onChange={e => { setJson(e.target.value); setPackState(null); }}
            placeholder={config.jsonPlaceholder ?? 'Paste the JSON your AI returned here — one JSON object, no code fences'}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: 150,
              marginTop: 12,
              padding: '12px 14px',
              borderRadius: 12,
              border: `1.5px solid ${p.border}`,
              background: p.input,
              color: p.text,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.82rem',
              resize: 'vertical',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              onClick={loadPack}
              style={pressable({ ...shellButton('green', p.text, darkMode), flex: 1, minWidth: 160, padding: '13px', borderRadius: 12, fontSize: '0.95rem' })}
            >
              📥 Load Pack
            </button>
            <button
              onClick={() => { setJson(''); setPackState(null); }}
              style={pressable({ ...shellButton('ghost', p.text, darkMode), padding: '13px 18px', borderRadius: 12, fontSize: '0.9rem' })}
            >
              Clear
            </button>
          </div>

          {packState && (
            <div
              style={{
                marginTop: 12,
                padding: '11px 14px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: '0.86rem',
                background: packState.ok ? 'rgba(92,184,92,0.16)' : 'rgba(217,83,79,0.16)',
                border: `1.5px solid ${packState.ok ? '#5cb85c' : '#d9534f'}`,
                color: packState.ok ? (darkMode ? '#a7f3a7' : '#1f6b23') : (darkMode ? '#ffb3b0' : '#a12622'),
              }}
            >
              {packState.ok ? '✅ ' : '⚠️ '}
              {packState.message.replace('__APPLY__', '').trim()}
            </div>
          )}

          <div style={{ marginTop: 14, fontSize: '0.8rem', color: p.sub, fontWeight: 700, lineHeight: 1.6 }}>
            1️⃣ Fill in players + location → 2️⃣ Copy the prompt → 3️⃣ Paste into your AI → 4️⃣ Paste the JSON back here → 5️⃣ Start.
            <br />
            Starting without a pack uses this game's built-in content — you can import one later from the in-game Teacher panel.
          </div>
        </div>

        {/* ── STEP 4 · START ── */}
        <button
          onClick={start}
          className="glow-pulse"
          style={pressable({
            ...shellButton('gold', p.text, darkMode),
            width: '100%',
            padding: '20px',
            borderRadius: 16,
            fontSize: 'clamp(1.1rem, 2.4vw, 1.45rem)',
            letterSpacing: '0.01em',
          })}
        >
          🎲 Start Game
        </button>
        </div>
        </div>
      </div>
      </FitFrame>
    </div>
  );
};

/** Small helper: scroll to top when the shell changes page */
export const useScrollTop = (dep: unknown) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dep]);
};
