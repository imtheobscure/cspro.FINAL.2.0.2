"use client";

import React, { useEffect, useState } from "react";
import { href, navigate } from "./route";

/* ═══════════════════════════════════════════════════════════════════════════
   TUTORLY GAME SHELL — the same splash screen every adult game already has
   ───────────────────────────────────────────────────────────────────────────
   WordPop is a kids' game in the same family as the 3D games, so its first
   screen is that SAME splash, not a home page with a title on it:

     1. Splash screen  →  press Play
     2. Learners       →  name + avatar (stars are saved per learner)
     3. Topic menu     →  pick a theme, then an activity
     4. Copy AI prompt →  paste into ChatGPT / Claude, paste the JSON back to
                          install a whole new category (see PackStudio)

   The styles ship INSIDE this file on purpose (copied from
   `tutorly-games/adult/3d-millionaire-game/src/GameShell.tsx`): when the splash
   depended on classes living in a game's index.css a missing rule turned into a
   tall column of emoji that scrolled. Keeping them here makes the shell a true
   drop-in. The splash is locked to one viewport height (100dvh) and its
   type/spacing scale with BOTH the viewport width and height.
   ═══════════════════════════════════════════════════════════════════════════ */

const SHELL_CSS = `
.tutorly-shell-root { --shell-gap: clamp(6px, 1.5vh, 22px); }

/* ── splash: exactly one screen tall, never scrolls ── */
.shell-splash {
  position: fixed;
  inset: 0;
  height: 100dvh;
  min-height: 100svh;
  max-height: 100dvh;
  overflow: hidden;
  z-index: 60;
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

/* ── chunky tactile shell buttons (inline colours, no Tailwind) ── */
.shell-btn {
  border: none;
  border-radius: 16px;
  font-weight: 900;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: -0.01em;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}
.shell-btn:hover  { filter: brightness(1.04); transform: translateY(-2px); }
.shell-btn:active { transform: translateY(3px); }

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

/* Narrow phones: stack the action buttons. */
@media (max-width: 620px) {
  .shell-splash .shell-actions { flex-direction: column; align-items: stretch; }
  .shell-splash .shell-actions > button { width: 100%; }
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   FITFRAME — the "nothing is ever clipped" guarantee (same file as the adult
   games). Measures the natural height of its children against the space it was
   given and, only when they do not fit, shrinks them with CSS `zoom` until they
   do. Never scales above 1x; stops at `min` and lets the parent scroll after.
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
        parent.clientHeight - parseFloat(cs.paddingTop || "0") - parseFloat(cs.paddingBottom || "0");
      const availW =
        parent.clientWidth - parseFloat(cs.paddingLeft || "0") - parseFloat(cs.paddingRight || "0");
      const visualH = el.getBoundingClientRect().height;
      if (availH <= 0 || visualH <= 0 || availW <= 0) return;
      const ratio = availH / visualH;
      setScale((prev) => {
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
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(fit);
      });
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener("resize", onResize);
    // A single measurement can run before the content has settled (web fonts,
    // late data, images), which used to leave a too-tall frame unscaled. Repeat
    // a few cheap passes on the way in and once the fonts are ready.
    const timers = [90, 260, 700, 1600].map((ms) => window.setTimeout(schedule, ms));
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) void fonts.ready.then(schedule).catch(() => {});
    schedule();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(raf);
    };
  }, [min]);

  // With `zoom`, 100% width would end up narrower than the frame; size it in px.
  React.useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const cs = getComputedStyle(parent);
    const availW =
      parent.clientWidth - parseFloat(cs.paddingLeft || "0") - parseFloat(cs.paddingRight || "0");
    if (availW > 0) setWidth(availW / scale);
  }, [scale]);

  return (
    <div
      ref={ref}
      className={className}
      /* No `maxWidth: 100%` here on purpose: it is measured against the UNZOOMED
         containing block, so with zoom < 1 it would clamp the width. */
      style={{ zoom: scale, width: width ? `${width}px` : "100%" } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TUTORLY BRANDING — shared with the Adult Dashboard
   ───────────────────────────────────────────────────────────────────────────
   General Settings → "Splash Screen Text / Subtext" (and the tutor logo) are
   saved in localStorage under `app-storage`. The game is served from the same
   origin, so it reads the very same values: change it once in the dashboard and
   every game's first page updates.
   ═══════════════════════════════════════════════════════════════════════════ */
export interface TutorlyBranding {
  text: string | null;
  subtext: string | null;
  logoUrl: string | null;
  enabled: boolean;
}

const EMPTY_BRANDING: TutorlyBranding = { text: null, subtext: null, logoUrl: null, enabled: true };

export function readTutorlyBranding(): TutorlyBranding {
  if (typeof window === "undefined") return EMPTY_BRANDING;
  try {
    const raw = window.localStorage.getItem("app-storage");
    if (!raw) return EMPTY_BRANDING;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    const tutorInfo = (parsed?.state?.tutorInfo ?? {}) as Record<string, unknown>;
    const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
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
      if (!e.key || e.key === "app-storage") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return branding;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BRAND MARKS — drawn inline, so the game never depends on a CDN or a missing
   image file (the old build pointed at a /mascot.png that did not exist).
   ═══════════════════════════════════════════════════════════════════════════ */

export function TutorlyLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect x="4" y="4" width="56" height="56" rx="18" fill="#ff8c7a" />
      <path d="M18 20h28v9h-9.5v17h-9V29H18z" fill="#fff" />
      <circle cx="47" cy="47" r="8" fill="#ffd166" />
      <path d="M47 42.5l1.4 2.9 3.2.4-2.3 2.2.6 3.2-2.9-1.6-2.9 1.6.6-3.2-2.3-2.2 3.2-.4z" fill="#f26b58" />
    </svg>
  );
}

/** The Tutorly owl — the same mascot, drawn rather than fetched. */
export function Mascot({ size = 160, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} role="img" aria-label="Tutorly owl">
      <ellipse cx="60" cy="108" rx="34" ry="6" fill="#2f3a4a" opacity="0.08" />
      <path d="M60 8c26 0 44 20 44 48 0 30-20 48-44 48S16 86 16 56C16 28 34 8 60 8z" fill="#f26b58" />
      <path d="M60 20c18 0 30 15 30 34 0 21-14 34-30 34S30 75 30 54c0-19 12-34 30-34z" fill="#ffd6a5" />
      <path d="M24 26l10-14 8 16z" fill="#f26b58" />
      <path d="M96 26L86 12l-8 16z" fill="#f26b58" />
      <circle cx="46" cy="48" r="14" fill="#fff" />
      <circle cx="74" cy="48" r="14" fill="#fff" />
      <circle cx="47" cy="50" r="6.5" fill="#2f3a4a" />
      <circle cx="73" cy="50" r="6.5" fill="#2f3a4a" />
      <circle cx="49" cy="47" r="2.2" fill="#fff" />
      <circle cx="75" cy="47" r="2.2" fill="#fff" />
      <path d="M60 58l7 10H53z" fill="#f5b93b" />
      <path d="M46 84c8 6 20 6 28 0" stroke="#2f3a4a" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M32 74c-8 2-14 8-16 16 8 2 16-1 22-7z" fill="#ff8c7a" />
      <path d="M88 74c8 2 14 8 16 16-8 2-16-1-22-7z" fill="#ff8c7a" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. SPLASH SCREEN — light Tutorly theme, same flow as every adult game
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SplashStats {
  themes: number;
  words: number;
  categories: number;
  languages: number;
}

const P = {
  page: "linear-gradient(158deg,#fff8ee 0%,#fdf1df 46%,#ffe7dc 100%)",
  text: "#2f3a4a",
  sub: "#5b6778",
  card: "rgba(255,255,255,0.92)",
  chip: "rgba(255,255,255,0.78)",
  border: "rgba(47,58,74,0.10)",
  accent: "#f26b58",
  gold: "#ffd166",
  goldDark: "#e0a52e",
};

/**
 * Everything that changes from game to game. Keeping it in one object is what
 * lets `shell.tsx` stay byte-identical in every Tutorly Kids game — the same
 * convention the four 3D adult games use for `GameShell.tsx`.
 */
export interface SplashCopy {
  /** Game name, shown big. */
  title: string;
  /** The one emoji that says what the game is. */
  emoji: string;
  /** One line under the title (counts + promise). */
  tagline: string;
  /** Small feature chips. */
  chips: { icon: string; label: string }[];
  /** Floating background emoji. */
  floaters: string[];
  /** The numbered how-to-play list. */
  howTo: string[];
  /** Play button label. */
  playLabel?: string;
}

export const Splash: React.FC<{
  stats: SplashStats;
  onPlay: () => void;
  onPack: () => void;
  onVoices: () => void;
  copy: SplashCopy;
}> = ({ stats, onPlay, onPack, onVoices, copy }) => {
  const { title, emoji, tagline, chips, floaters, howTo, playLabel = "▶ Play" } = copy;
  const branding = useTutorlyBranding();
  const brandText = branding.enabled ? branding.text : null;
  const brandSub = branding.enabled ? branding.subtext : null;
  const [showHow, setShowHow] = useState(false);

  return (
    <div
      className="shell-splash tutorly-shell-root"
      style={{
        background: P.page,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(10px, 2.4vh, 30px) clamp(12px, 3vw, 32px)",
        fontFamily: "'Fredoka','Nunito','Montserrat','Inter',sans-serif",
        color: P.text,
      }}
    >
      <style>{SHELL_CSS}</style>

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
            opacity: 0.22,
          }}
        >
          {f}
        </div>
      ))}

      <FitFrame min={0.75} className="shell-splash-fit">
        <div
          className="shell-splash-scroll"
          style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 860, textAlign: "center", margin: "0 auto" }}
        >
          <div className="shell-brand-row" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="" style={{ height: 56, width: 56, borderRadius: 16, objectFit: "cover" }} />
            ) : (
              <TutorlyLogo size={56} />
            )}
            <span style={{ fontWeight: 900, fontSize: "clamp(1.1rem, 3vh, 1.6rem)", letterSpacing: "-0.01em" }}>
              Tutorly<span style={{ color: P.accent }}>.</span>
              <span
                style={{
                  marginLeft: 8,
                  background: P.gold,
                  borderRadius: 999,
                  padding: "2px 10px",
                  fontSize: "0.62em",
                  verticalAlign: "middle",
                }}
              >
                KIDS
              </span>
            </span>
          </div>

          {brandText && (
            <div
              className="shell-brand-text"
              style={{ fontSize: "clamp(1.05rem, 2.6vw, 1.5rem)", fontWeight: 900, letterSpacing: "0.02em", opacity: 0.92 }}
            >
              {brandText}
            </div>
          )}

          <div className="shell-divider shell-optional" style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
            <div style={{ height: 1, width: "clamp(20px, 8vw, 90px)", background: "rgba(47,58,74,0.18)" }} />
            <div style={{ fontSize: "0.66rem", fontWeight: 900, letterSpacing: "0.3em", color: P.sub, whiteSpace: "nowrap" }}>
              ONE SETUP · EVERY GAME
            </div>
            <div style={{ height: 1, width: "clamp(20px, 8vw, 90px)", background: "rgba(47,58,74,0.18)" }} />
          </div>

          <div className="shell-hero-emoji" style={{ lineHeight: 1 }}>
            {emoji}
          </div>

          <h1
            className="shell-title"
            style={{ fontWeight: 950, lineHeight: 1.05, letterSpacing: "-0.02em", textShadow: "0 4px 18px rgba(15,23,42,0.14)" }}
          >
            {title}
          </h1>

          {brandSub && (
            <div
              className="shell-sub"
              style={{
                display: "inline-block",
                fontSize: "clamp(0.95rem, 2.2vw, 1.2rem)",
                fontWeight: 800,
                color: "#8a5a10",
                background: "rgba(245,176,66,0.18)",
                border: "1px solid rgba(224,154,32,0.35)",
                borderRadius: 14,
                padding: "clamp(6px, 1.2vh, 10px) clamp(10px, 1.6vw, 18px)",
                maxWidth: 720,
              }}
            >
              {brandSub}
            </div>
          )}

          <div className="shell-tagline" style={{ fontWeight: 700, color: P.sub }}>
            {tagline}
          </div>
          <div className="shell-optional" style={{ display: "none" }}>
            {stats.categories} · {stats.themes} · {stats.words} · {stats.languages}
          </div>

          <div className="shell-chip-row" style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {chips.map((f) => (
              <div
                key={f.label}
                className="shell-chip"
                style={{
                  background: P.chip,
                  border: `1px solid ${P.border}`,
                  borderRadius: 99,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span style={{ fontSize: "1rem" }}>{f.icon}</span> {f.label}
              </div>
            ))}
          </div>

          <div className="shell-actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={onPlay}
              className="shell-btn shell-play-btn"
              style={{ background: P.gold, color: "#3a2c07", boxShadow: `0 6px 0 ${P.goldDark}, 0 12px 26px rgba(47,58,74,0.18)` }}
            >
              {playLabel}
            </button>

            <button
              onClick={onPack}
              className="shell-btn shell-alt-btn"
              style={{ background: "#8fd9b6", color: "#123a26", boxShadow: "0 5px 0 #4fbf8c" }}
            >
              📋 AI Prompt &amp; JSON
            </button>

            <button
              onClick={onVoices}
              className="shell-btn shell-alt-btn"
              style={{ background: "#7cc4f5", color: "#0f2b40", boxShadow: "0 5px 0 #4ba3e3" }}
            >
              🎤 Read-aloud voice test
            </button>

            <button
              onClick={() => setShowHow((s) => !s)}
              className="shell-btn shell-alt-btn"
              style={{ background: "#2f3a4a", color: "#fff", boxShadow: "0 5px 0 #151b24" }}
            >
              {showHow ? "✕ Close" : "❓ How to Play"}
            </button>
          </div>

          {showHow && (
            <div
              className="shell-card-in"
              style={{
                marginTop: 24,
                background: P.card,
                backdropFilter: "blur(14px)",
                border: `1px solid ${P.border}`,
                borderRadius: 18,
                padding: "20px 24px",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "0.95rem", fontWeight: 900, letterSpacing: "0.12em", color: P.accent, marginBottom: 12 }}>
                HOW TO PLAY
              </div>
              {howTo.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div
                    style={{
                      flexShrink: 0,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: P.accent,
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, lineHeight: 1.45 }}>{line}</div>
                </div>
              ))}
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(245,176,66,0.16)",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                🧩 Every Tutorly game uses this same flow: splash → learner setup → AI prompt → paste JSON → play.
              </div>
            </div>
          )}
        </div>

        <div
          className="shell-footer shell-optional"
          style={{ position: "relative", zIndex: 2, fontSize: "0.75rem", fontWeight: 700, color: P.sub, textAlign: "center" }}
        >
          Tutorly · personalised language games for every lesson
          <div style={{ marginTop: 4, fontSize: "0.68rem", fontWeight: 600, opacity: 0.75 }}>
            Splash text, subtext and logo follow your Tutorly dashboard settings
          </div>
        </div>
      </FitFrame>
    </div>
  );
};

/** Small helper used by the home screen's "back to the splash" button. */
export function goHomeFromSplash() {
  navigate(href.home);
}
