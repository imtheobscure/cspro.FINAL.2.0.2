import type { PartyModeOutput, LearnerProfile } from "../../types";
import { escapeHtml } from "../textFormatters";
import { BUILTIN_ALIBI, BUILTIN_SPYFALL } from "./builtinSpecials";


export const getPartyModeStyle = () => `
/* ============================================================
   DESIGN TOKENS
   One professional palette and one type scale for the whole
   game. Everything below reads these, so the look is changed in
   one place instead of being edited rule by rule.

   Two deliberate choices:
   • the greens/blues are a calmer, higher-contrast set than the
     playground lime the game shipped with — the projector is far
     from the wall and saturation washes out under bright light;
   • the two families are declared here and loaded in the page
     head, with a system stack as the fallback, so a classroom
     with no internet still renders properly instead of falling
     back to a bare sans-serif.
   ============================================================ */
:root {
    /* ========== PREMIUM LIGHT PALETTE ==========
       Bright studio, deep ink. One coherent system so every game feels like the
       same studio title. Every accent comes in a pair: a saturated --x for fills
       and borders, a pastel --x-soft to sit behind text, and a deep --x-ink that
       is guaranteed to read on that pastel (all >= 7:1).
       No dark surfaces anywhere — the arena is light on every screen. */
    --primary: #7c3aed;       /* violet */
    --primary-dark: #5b21b6;
    --primary-soft: #ede9fe;
    --primary-ink: #4c1d95;
    --secondary: #0891b2;     /* cyan */
    --secondary-dark: #155e75;
    --secondary-soft: #cffafe;
    --secondary-ink: #164e63;
    --accent: #db2777;        /* pink */
    --accent-dark: #9d174d;
    --accent-soft: #fce7f3;
    --accent-ink: #831843;
    --yellow: #d97706;        /* amber */
    --yellow-dark: #92400e;
    --yellow-soft: #fef3c7;
    --yellow-ink: #78350f;
    --purple: #8b5cf6;
    --purple-dark: #6d28d9;
    --purple-soft: #f3e8ff;
    --purple-ink: #5b21b6;
    --orange: #c2410c;
    --orange-dark: #9a3412;
    --orange-soft: #ffedd5;
    --orange-ink: #7c2d12;
    /* Surfaces — ONE light studio. Every card is paper white, every ink is deep,
       every divider is a hairline of slate. Nothing in the arena is dark anymore,
       so no screen can read as a different product, and no label ever has to
       fight its own background to be readable. */
    --bg: #eef1f8;
    --bg-2: #ffffff;
    --surface: #ffffff;
    --surface-glass: #ffffff;
    --card-bg: #ffffff;
    --text: #334155;      /* 9.1:1 on white */
    --ink: #0b1220;       /* 19.1:1 on white — headings and every game title */
    --gray: #475569;      /* 7.5:1 on white — the quietest text we allow */
    --gray-light: #e2e8f0;
    --line: rgba(15,23,42,0.12);
    --navy: #1e293b;
    --navy-2: #0b1220;
    /* ink for text that sits on a white surface (drawing board, QR card) */
    --on-light: #0b1220;
    --on-light-muted: #475569;
    --neon-glow: 0 14px 34px -14px rgba(124,58,237,0.45);
    /* Radii + elevation */
    --radius: 12px;
    --radius-lg: 18px;
    --shadow-sm: 0 1px 2px rgba(15,23,42,0.05), 0 1px 3px rgba(15,23,42,0.07);
    --shadow-md: 0 14px 30px -18px rgba(15,23,42,0.35);
    --shadow-lg: 0 30px 70px -30px rgba(15,23,42,0.5);
    /* Type */
    --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    --font-display: 'Sora', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

* { box-sizing: border-box; user-select: none; }

body {
    margin: 0; padding: 0;
    font-family: var(--font-sans);
    background-color: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-tap-highlight-color: transparent;
    height: 100vh;
    height: 100dvh; /* real viewport on phones (100vh hides behind browser chrome) */
    overflow: hidden;
    display: flex;
    flex-direction: column;
    overscroll-behavior: none;
}

/* ========== PREMIUM BACKGROUND ========== */
body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    background:
        radial-gradient(900px 700px at 15% 10%, rgba(124,58,237,0.10), transparent 60%),
        radial-gradient(800px 600px at 85% 15%, rgba(8,145,178,0.09), transparent 60%),
        radial-gradient(700px 500px at 50% 95%, rgba(219,39,119,0.07), transparent 60%),
        linear-gradient(180deg, #f7f8fd 0%, #eef1f8 45%, #e9edf7 100%);
}
body::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
    pointer-events: none;
}

/* ========== SUPER VISIBLE LASER POINTER ==========
   A white-hot core inside a red halo, a pulsing ring and a comet
   trail, blended with screen so it burns through any background —
   light canvas, dark glass, video — from the back of the room. */
body.laser-active {
    cursor: none !important;
}
body.laser-active * {
    cursor: none !important;
}
#global-laser-dot {
    position: fixed;
    left: -100px; top: -100px;
    width: 58px; height: 58px;
    pointer-events: none;
    z-index: 999999;
    display: none;
    transform: translate(-50%, -50%);
    mix-blend-mode: screen;
}
#global-laser-dot::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 50%,
        #ffffff 0%, #ffe3e3 10%, #ff5252 30%, #ff0000 48%, rgba(204,0,0,0.85) 62%, rgba(255,0,60,0) 74%);
    box-shadow:
        0 0 10px rgba(255,255,255,0.9),
        0 0 22px #ff1a1a,
        0 0 48px rgba(255,0,60,0.9),
        0 0 96px rgba(255,0,60,0.5),
        0 0 160px rgba(255,0,60,0.3);
    animation: laserPulse 0.7s ease-in-out infinite alternate;
}
#global-laser-dot::after {
    content: '';
    position: absolute;
    inset: -12px;
    border-radius: 50%;
    border: 2px solid rgba(255,64,64,0.55);
    animation: laserRing 1.1s ease-out infinite;
}
#global-laser-trail {
    position: fixed;
    left: -100px; top: -100px;
    width: 30px; height: 30px;
    background: radial-gradient(circle, rgba(255,120,120,0.95) 0%, rgba(255,0,60,0.5) 45%, transparent 72%);
    border-radius: 50%;
    pointer-events: none;
    z-index: 999998;
    display: none;
    transform: translate(-50%, -50%);
    filter: blur(4px);
    mix-blend-mode: screen;
}
body.laser-active #global-laser-dot,
body.laser-active #global-laser-trail {
    display: block;
}
@keyframes laserPulse {
    0% { transform: scale(1); filter: brightness(1); }
    100% { transform: scale(1.12); filter: brightness(1.3); }
}
@keyframes laserRing {
    0% { transform: scale(0.8); opacity: 0.9; }
    100% { transform: scale(1.6); opacity: 0; }
}

/* --- LAYOUT FIX: FORCE GRID TO FIT --- */
.app-container {
    display: grid;
    grid-template-columns: 320px 1fr;
    /* "auto" rather than a fixed 70px: the toolbar now wraps on narrow
       screens, and a fixed row clipped whatever wrapped onto a second line */
    grid-template-rows: auto minmax(0, 1fr);
    height: 100%;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%; /* was 100vw — that overflowed by the scrollbar width */
    overflow: hidden; 
}

/* ========== PREMIUM HEADER — glass + neon ========== */
.header {
    grid-column: 1 / -1;
    background: linear-gradient(180deg, #ffffff, #f1f5f9);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border-bottom: 1px solid var(--line);
    box-shadow: 0 2px 14px rgba(15,23,42,0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 18px;
    z-index: 60;
    min-height: 68px;
    height: auto;
    flex-wrap: wrap;
    position: relative;
}
.header::after {
    content: '';
    position: absolute;
    bottom: -1px; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(139,92,246,0.5) 30%, rgba(6,182,214,0.5) 70%, transparent);
}
.logo { font-family: var(--font-display); font-weight: 900; font-size: 1.35rem; color: var(--ink); display: flex; align-items: center; gap: 10px; letter-spacing: -0.02em; }
.logo i { color: var(--primary); }
.game-stats { display: flex; gap: 10px; font-weight: 700; color: var(--gray); font-size: 0.9rem; }
.stat-item { display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid rgba(15,23,42,0.10); border-radius: 999px; padding: 5px 13px; backdrop-filter: blur(8px); font-family: var(--font-mono); }

/* ===== ARENA BUTTONS — the one button language for the whole game =====
   Dark glass chips in the header; saturated gradient fills in the arena.
   Every .btn-action reads these, so nothing drifts. */
/* These three are written as .btn-action.pm-btn-* on purpose: plain
   .pm-btn-exit loses to the later .btn-action rule, which paints every action
   button's label white — invisible on these light chips. Inside .header-controls
   the header rule still wins, which is exactly what the header wants. */
.btn-action.pm-btn-laser, .btn-action.pm-btn-exit, .btn-action.pm-btn-settings { display: inline-flex; align-items: center; gap: 8px; }
.btn-action.pm-btn-exit { background: #fee2e2; color: #b91c1c; border: 1px solid rgba(220,38,38,0.35); }
.btn-action.pm-btn-exit:hover { background: #fecaca; border-color: rgba(220,38,38,0.6); box-shadow: 0 4px 18px rgba(220,38,38,0.2); }
.btn-action.pm-btn-exit:active { background: #fca5a5; }
.btn-action.pm-btn-settings { background: #ede9fe; color: var(--primary-ink); border: 1px solid rgba(124,58,237,0.4); }
.btn-action.pm-btn-settings:hover { background: #ddd6fe; box-shadow: 0 4px 18px rgba(124,58,237,0.22); }
.btn-action.pm-btn-laser { background: #f1f5f9; color: #b91c1c; border: 1px solid rgba(15,23,42,0.12); }
.pm-btn-laser .pm-laser-ico { width: 11px; height: 11px; border-radius: 50%; background: radial-gradient(circle at 40% 40%, #fff 0%, #ff6b6b 35%, #ff0000 70%); box-shadow: 0 0 8px #ff2222, 0 0 16px rgba(255,0,40,0.6); display: inline-block; flex: 0 0 auto; }
.btn-action.pm-btn-laser.laser-on { background: linear-gradient(135deg, #ff2244, #cc0000); color: #fff; border-color: #ff4444; animation: laserBtnGlow 1.2s ease-in-out infinite alternate; }
.pm-btn-laser.laser-on .pm-laser-ico { background: #fff; box-shadow: 0 0 10px #fff, 0 0 22px rgba(255,255,255,0.8); }

.header-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.header-controls .btn-action {
    text-transform: none; letter-spacing: 0; font-weight: 800;
    font-size: 0.84rem; padding: 9px 14px; border-radius: 12px;
    background: #f1f5f9; color: var(--text);
    border: 1px solid rgba(15,23,42,0.12); box-shadow: 0 1px 3px rgba(15,23,42,0.08);
    white-space: nowrap; backdrop-filter: blur(8px);
    transition: all 0.2s ease;
}
.header-controls .btn-action:hover { background: rgba(15,23,42,0.06); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(15,23,42,0.14); }
.header-controls .btn-action:active { transform: none; background: rgba(15,23,42,0.10); }
.header-controls .btn-blue { border-color: rgba(8,145,178,0.4); color: var(--secondary-ink); }
.header-controls .btn-purple { border-color: rgba(124,58,237,0.4); color: var(--purple-ink); }
.header-controls .btn-red { border-color: rgba(220,38,38,0.4); color: #b91c1c; background: #fee2e2; }
.header-controls .btn-green { border-color: rgba(5,150,105,0.4); color: #047857; }
.header-controls .btn-gray { background: #f1f5f9; color: var(--text); border: 1px solid rgba(15,23,42,0.12); }
.header-controls .btn-action.laser-on { background: linear-gradient(135deg, #ff2244, #cc0000); color: #fff; border-color: #ff4444; box-shadow: 0 0 16px rgba(255,0,40,0.6), 0 0 32px rgba(255,0,40,0.3); animation: laserBtnGlow 1.2s ease-in-out infinite alternate; }
@keyframes laserBtnGlow { 0% { box-shadow: 0 0 16px rgba(255,0,40,0.5); } 100% { box-shadow: 0 0 28px rgba(255,0,40,0.8), 0 0 48px rgba(255,0,40,0.4); } }


select.voice-select { padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(15,23,42,0.14); background: #f1f5f9; color: var(--text); font-family: inherit; font-size: 0.84rem; max-width: 190px; }
select.voice-select option { color: #0f172a; }
.pm-settings-box select.voice-select { width: 100%; max-width: none; background: #f8fafc; border-color: rgba(15,23,42,0.16); color: var(--ink); }

/* ========== PREMIUM SURFACES — glass + glow ========== */
.sidebar-title { font-family: var(--font-display); color: var(--text); letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.72rem; }
.screen { background: transparent; }
.screen h1 { font-family: var(--font-display); letter-spacing: -0.03em; color: var(--ink); }
.screen p { color: var(--gray); }

/* --- PROJECTOR LEGIBILITY + PREMIUM CARDS --- */
.game-card { font-family: var(--font-display); background: linear-gradient(180deg, #ffffff, #f4f6fb); border: 1px solid rgba(15,23,42,0.16); box-shadow: 0 14px 34px -14px rgba(2,6,23,0.8); backdrop-filter: blur(12px); transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.game-card:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 16px 48px rgba(139,92,246,0.25), 0 0 0 2px rgba(139,92,246,0.3); border-color: rgba(139,92,246,0.4); }
.modal-timer, .pm-room-code, .pm-rank, .pm-sheet .pm-cell, .pm-plan-stats, .pm-modal-count { font-family: var(--font-mono); }

/* ========== PREMIUM SIDEBAR — dark glass ========== */
.sidebar {
    grid-row: 2;
    background: linear-gradient(180deg, #ffffff, #f8fafc);
    backdrop-filter: blur(16px);
    border-right: 1px solid rgba(139,92,246,0.12);
    padding: 18px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    z-index: 20;
    height: 100%;
}

/* LARGE AVATAR FOR ACTIVE PLAYER */
.active-player-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 16px;
    padding: 16px 12px;
    border-radius: 16px;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    text-align: center;
}
.active-player-avatar {
    width: 96px; height: 96px;
    border-radius: 50%;
    border: 3px solid rgba(139,92,246,0.6);
    box-shadow: 0 0 20px rgba(139,92,246,0.3), 0 4px 16px rgba(0,0,0,0.3);
    margin-bottom: 8px;
    transition: all 0.3s;
}
.active-player-name { font-size: 1.15rem; font-weight: 900; color: var(--ink); }
.active-player-status { color: var(--primary-dark); font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.08em; }

.player-card {
    background: linear-gradient(180deg, #ffffff, #f8fafc);
    border: 1px solid rgba(15,23,42,0.14);
    border-radius: 14px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
    transition: all 0.25s ease;
    position: relative;
    cursor: pointer;
    box-shadow: 0 10px 24px -12px rgba(2,6,23,0.7);
}
.player-card:hover { border-color: rgba(139,92,246,0.45); transform: translateY(-1px); box-shadow: 0 12px 28px -12px rgba(139,92,246,0.35); }
.player-card-header { display: flex; align-items: center; gap: 10px; width: 100%; position:relative; }
.player-card.active { border-color: var(--secondary); background: linear-gradient(180deg, rgba(6,182,214,0.16), rgba(6,182,214,0.08)); transform: scale(1.02); box-shadow: 0 0 24px rgba(34,211,238,0.22); }
.player-avatar { width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(15,23,42,0.25); object-fit: cover; background: #1e293b; }
.player-info { flex: 1; }
.player-name { font-weight: 800; font-size: 1rem; color: var(--ink); }
.player-score { font-weight: 800; font-size: 1.1rem; color: var(--yellow-dark); text-shadow: 0 0 14px rgba(251,191,36,0.35); }
.remove-player-btn { color: var(--accent); cursor: pointer; font-size: 0.8rem; background: none; border: none; position: absolute; top: 0; right: 0; }

.inventory { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px; width: 100%; }
.inv-item { 
    background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; border-radius: 8px; 
    padding: 6px 12px; font-size: 0.8rem; font-weight: bold; 
    cursor: pointer; border: 2px solid rgba(255,255,255,0.85); box-shadow: 0 4px 12px -6px rgba(124,58,237,0.7);
    transition: all 0.2s;
}
.inv-item:hover { transform: translateY(-2px); filter: brightness(1.1); }
.inv-item.used { opacity: 0.5; cursor: default; background: var(--gray); transform: none; box-shadow: none; filter: none; }

.rarity-common { background: rgba(148,163,184,0.35); box-shadow: 0 0 10px rgba(156, 163, 175, 0.4); border-color: rgba(15,23,42,0.25); color: var(--text); }
.rarity-epic { background: linear-gradient(135deg, #a855f7, #7e22ce); box-shadow: 0 0 15px rgba(168, 85, 247, 0.6); border-color: #e9d5ff; }
.rarity-legendary { background: linear-gradient(135deg, #fbbf24, #d97706); box-shadow: 0 0 20px rgba(251, 191, 36, 0.8); border-color: #fef3c7; animation: pulseGlow 1.5s infinite alternate; }

@keyframes pulseGlow {
    0% { box-shadow: 0 0 10px rgba(251, 191, 36, 0.6); }
    100% { box-shadow: 0 0 25px rgba(251, 191, 36, 1); }
}

.active-effects-box {
    background: rgba(139,92,246,0.10); border: 1px solid rgba(139,92,246,0.20); border-radius: 12px; padding: 12px; margin-top: 14px;
    text-align: center; display: none; /* Hidden by default */
}
.active-effects-title { font-size: 0.8rem; text-transform: uppercase; color: var(--accent-dark); font-weight: bold; margin-bottom: 5px; }
.effect-badge { background: #db2777; color: white; padding: 5px 10px; border-radius: 8px; font-size: 0.9rem; font-weight: bold; display: inline-block; margin: 2px; }

/* ========== PREMIUM GAME AREA — open to the arena backdrop ========== */
.game-area {
    grid-column: 2;
    grid-row: 2;
    background: transparent;
    padding: 20px;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
}

/* GRID (8×8) — premium glass tiles */
.grid-wrapper {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);
    gap: 10px;
    height: 100%;
    width: 100%;
    overflow: hidden; 
}
.game-card {
    background: linear-gradient(180deg, #ffffff, #f4f6fb);
    border-radius: 14px;
    border: 1px solid rgba(15,23,42,0.16);
    box-shadow: 0 14px 34px -14px rgba(2,6,23,0.8);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 2.5rem;
    color: var(--text);
    cursor: pointer;
    transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
}
.game-card:hover { transform: translateY(-3px) scale(1.02); border-color: rgba(139,92,246,0.75); color: var(--primary-dark); background: linear-gradient(180deg, #ffffff, #f3f0ff); box-shadow: 0 16px 36px -12px rgba(139,92,246,0.45), 0 0 22px rgba(139,92,246,0.28); }
.game-card:active { transform: translateY(1px) scale(0.98); box-shadow: 0 2px 8px rgba(0,0,0,0.25); }
.game-card.answered { 
    background: #f8fafc; color: var(--gray); box-shadow: none; border-color: var(--ink); 
    cursor: pointer; transform: none; 
}
.game-card.lucky { border-color: rgba(245,158,11,0.55); color: var(--yellow-ink); background: #fffbeb; box-shadow: 0 0 24px rgba(245,158,11,0.18); }

/* --- QUESTION MODAL — the neon card --- */
.modal {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(2,6,23,0.72);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 20px;
}
.modal-card {
    background: linear-gradient(180deg, #ffffff, #f8fafc);
    border: 1px solid rgba(139,92,246,0.30);
    box-shadow: 0 40px 90px -20px rgba(2,6,23,0.9), 0 0 44px rgba(139,92,246,0.14);
    width: 98%; /* Wide to fit all info */
    max-width: 1400px;
    height: 90vh; /* Fixed height for consistency */
    border-radius: 20px;
    padding: 0; /* Reset padding, use flex */
    text-align: center;
    position: relative;
    animation: popIn 0.3s ease-out;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* Manage internal scroll */
    color: var(--ink);
}

/* NEW MODAL HEADER LAYOUT */
.modal-header {
    padding: 15px 25px;
    background: #f8fafc;
    border-bottom: 1px solid rgba(15,23,42,0.10);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    gap: 15px;
}

.modal-header-left, .modal-header-right {
    display: flex;
    align-items: center;
    gap: 15px;
}

.modal-header-center {
    flex: 1;
    display: flex;
    justify-content: center;
    gap: 10px;
}

/* Power-up strip inside the question header — built from the live inventory,
   so it fits however many the team is carrying (was hard-coded to 3 slots). */
.pu-slot {
    height: 40px;
    padding: 0 12px;
    border: 2px dashed rgba(15,23,42,0.18);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--gray);
    font-size: 0.8rem;
    font-weight: 700;
    font-family: inherit;
    text-transform: uppercase;
    background: #f8fafc;
    white-space: nowrap;
    flex: 0 0 auto;
}
.pu-slot.filled {
    border-style: solid;
    border-color: var(--purple);
    color: var(--purple-dark);
    background: #f3e8ff;
    cursor: pointer;
    box-shadow: 0 2px 0 var(--purple);
    transition: transform 0.1s;
}
.pu-slot.filled:active { transform: translateY(2px); box-shadow: none; }

.modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

.modal-footer {
    padding: 20px;
    border-top: 1px solid rgba(15,23,42,0.10);
    background: #f8fafc;
    flex-shrink: 0;
}

.q-tag {
    display: inline-block;
    background: #f1f5f9;
    color: var(--gray);
    border: 1px solid rgba(15,23,42,0.14);
    font-weight: 800;
    padding: 5px 15px;
    border-radius: 20px;
    text-transform: uppercase;
    font-size: 0.9rem;
}

.q-content { font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; line-height: 1.3; color: var(--ink); margin: 10px 0; overflow-wrap: break-word; }

.q-context-box {
    background: rgba(6,182,214,0.08);
    border: 1px solid rgba(34,211,238,0.35);
    border-radius: 12px;
    padding: 20px;
    text-align: left;
    margin-bottom: 10px;
    width: 100%;
    box-sizing: border-box; 
    max-height: 300px;
    overflow-y: auto;
    font-size: 1.2rem;
    line-height: 1.6;
    color: var(--secondary-ink);
    max-width: none !important; 
}

/* Options Grid */
.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; width: 100%; }
.option-btn {
    background: #f8fafc; border: 1px solid rgba(15,23,42,0.18); border-radius: 16px;
    padding: 20px; font-size: 1.3rem; font-weight: 800; color: var(--ink);
    cursor: pointer; box-shadow: 0 10px 24px -12px rgba(2,6,23,0.7); transition: all 0.15s;
    display: flex; align-items: center; justify-content: center; min-height: 80px;
}
.option-btn:hover { background: rgba(6,182,214,0.10); transform: translateY(-2px); border-color: var(--secondary); box-shadow: 0 14px 30px -12px rgba(34,211,238,0.35); }
.option-btn:active { transform: translateY(1px); box-shadow: none; }
.option-btn.disabled { opacity: 0.35; pointer-events: none; }

/* Action Buttons — the one gradient language, shared by every game */
.action-row { display: flex; gap: 15px; justify-content: center; margin-top: 10px; width: 100%; }
.btn-action {
    padding: 15px 30px; font-size: 1.2rem; font-weight: 800; color: white; border-radius: 16px; border: none; cursor: pointer; transition: transform 0.1s, box-shadow 0.2s, filter 0.2s; text-transform: uppercase;
}
.btn-action:active { transform: translateY(4px); box-shadow: none; }
/* Every action button carries WHITE text, so every fill has to stay dark enough
   to hold it: all four of these are >= 5:1 against white. The light pastel ends
   the theme uses elsewhere are for text on white, never for a button fill. */
.btn-green { background: linear-gradient(135deg, #7c3aed, #5b21b6); box-shadow: 0 4px 0 rgba(0,0,0,0.2), 0 6px 20px rgba(124,58,237,0.35); }
.btn-red { background: linear-gradient(135deg, #db2777, #9d174d); box-shadow: 0 4px 0 rgba(0,0,0,0.2), 0 6px 20px rgba(219,39,119,0.35); }
.btn-blue { background: linear-gradient(135deg, #0e7490, #155e75); box-shadow: 0 4px 0 rgba(0,0,0,0.2), 0 6px 20px rgba(14,116,144,0.35); }
.btn-purple { background: linear-gradient(135deg, #7c3aed, #5b21b6); box-shadow: 0 4px 0 rgba(0,0,0,0.2), 0 6px 20px rgba(124,58,237,0.35); }
.btn-gray { background: rgba(15,23,42,0.10); color: var(--text); font-size: 1rem; padding: 10px; min-width: 50px; }
.btn-action:hover { filter: brightness(1.08); }

/* Timer */
.modal-timer {
    background: #f8fafc; padding: 5px 15px; border-radius: 12px;
    font-weight: 900; font-size: 1.5rem; color: var(--ink);
    border: 1px solid rgba(15,23,42,0.16); width: 80px; text-align: center;
}
.modal-timer.danger { color: var(--accent-dark); border-color: var(--accent); animation: pulse 1s infinite; }

/* Feedback Section (New) */
.feedback-section {
    width: 100%; text-align: left; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.4); border-radius: 12px; padding: 20px; margin-top: 20px; display: none;
}
.feedback-header { font-size: 2rem; font-weight: 900; color: var(--primary-dark); margin-bottom: 15px; }
.hint-box { background: #eef2ff; border-left: 4px solid var(--secondary); padding: 15px; margin-bottom: 15px; font-size: 1.1rem; color: var(--secondary-ink); display:none; width: 100%; text-align: left;}

.fb-block {
    background: #f1f5f9; padding: 15px; border-radius: 12px; margin-bottom: 12px; border: 1px solid rgba(15,23,42,0.10);
}
.fb-block h4 {
    margin: 0 0 10px 0; color: var(--yellow-dark); text-transform: uppercase; font-size: 0.9rem;
}
.fb-block p, .fb-block ul { margin: 0; font-size: 1.1rem; color: var(--text); }

/* Powerup styling */
.powerup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(1000px 700px at 50% 20%, #f3e8ff, #ddd6fe 55%, #ede9fe); z-index: 200; display: none; align-items: center; justify-content: center; flex-direction: column; color: var(--ink); text-align:center; animation: popIn 0.3s; }
.powerup-icon { font-size: 8rem; margin-bottom: 20px; animation: spin 1s ease-out; }
.powerup-title { font-size: 4rem; font-weight: 900; text-transform: uppercase; color: var(--primary-ink); }

/* Lucky Card Overlay — full-screen drama, arena palette */
.lucky-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 200; display: none; align-items: center; justify-content: center; flex-direction: column; animation: popIn 0.3s; color: var(--ink); text-align:center; }
.lucky-overlay.good { background: radial-gradient(1000px 700px at 50% 25%, #d1fae5, #a7f3d0 60%, #ecfdf5); }
.lucky-overlay.bad { background: radial-gradient(1000px 700px at 50% 25%, #ffe4e6, #fecdd3 60%, #fff1f2); }
.lucky-overlay.neutral { background: radial-gradient(1000px 700px at 50% 25%, #dbeafe, #bfdbfe 60%, #eff6ff); }
.lucky-title { font-size: 4rem; font-weight: 900; margin-bottom: 20px; }
.lucky-overlay.good .lucky-title { color: #065f46; }
.lucky-overlay.bad .lucky-title { color: #9f1239; }
.lucky-overlay.neutral .lucky-title { color: #1e3a8a; }
.lucky-desc { font-size: 2.5rem; font-weight: 800; color: var(--ink); }

/* STREAK OVERLAY (FULL SCREEN) */
.streak-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 200;
    display: none; align-items: center; justify-content: center; flex-direction: column;
    background: radial-gradient(1000px 700px at 50% 25%, #fef3c7, #fde68a 60%, #fffbeb); color: var(--ink); animation: popIn 0.3s; text-align: center;
}
.streak-fire { font-size: 8rem; margin-bottom: 20px; animation: pulse 0.5s infinite alternate; }
.streak-title { font-size: 5rem; font-weight: 900; text-transform: uppercase; color: #78350f; }
.streak-sub { font-size: 3rem; font-weight: 800; color: #92400e; }

/* ========== PREMIUM GAME OVERLAYS — the dark arena stage ==========
   One stage under every game: the app's space backdrop shows
   through a dark glass, so the whole arena reads as ONE title
   while each game keeps its own accent. */
.special-game-overlay {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background:
        radial-gradient(700px 500px at 12% 8%, rgba(124,58,237,0.10), transparent 60%),
        radial-gradient(640px 480px at 88% 12%, rgba(8,145,178,0.09), transparent 60%),
        rgba(247,248,253,0.82);
    backdrop-filter: blur(18px) saturate(1.15);
    -webkit-backdrop-filter: blur(18px) saturate(1.15);
    z-index: 10;
    display: none; flex-direction: column; padding: 20px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
}

/* SPLIT GAME LAYOUT (Taboo & Hot Seat) — transparent; the arena stage shows */
.split-game-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    gap: clamp(16px, 3vw, 40px);
    padding: 20px;
    align-items: center;
    justify-content: center;
    background: transparent;
    box-sizing: border-box;
    overflow-y: auto;
}

/* ---- ONE LOOK, MANY GAMES ---------------------------------------------------
   Every game takes its colour from exactly one place. The accent below is the
   ONLY thing that differs between these views; the white surface, the card, the
   border, the radius and the type all come from the shared block above, so
   fourteen games cannot drift into fourteen styles.

   The per-game backdrop photographs and tinted washes (Sentiment's rose,
   Spyfall's slate, Alibi's amber, Keep Talking's burned photograph) are gone with
   them: they were both the loudest source of "every game looks different" and an
   external request per lesson. Each group keeps its meaning — blue quiz, green
   performance, purple role-play, yellow challenge. */
#view-practice    { --game: var(--primary);   --game-soft: var(--primary-soft);   --game-ink: var(--primary-dark); }
#view-pictionary  { --game: var(--primary);   --game-soft: var(--primary-soft);   --game-ink: var(--primary-dark); }
#view-concept     { --game: var(--secondary); --game-soft: var(--secondary-soft); --game-ink: var(--secondary-dark); }
#view-spyfall     { --game: var(--secondary); --game-soft: var(--secondary-soft); --game-ink: var(--secondary-dark); }
#view-hotseat     { --game: var(--accent);    --game-soft: var(--accent-soft);    --game-ink: var(--accent-dark); }
#view-bomb        { --game: var(--accent);    --game-soft: var(--accent-soft);    --game-ink: var(--accent-dark); }
#view-taboo       { --game: var(--purple);    --game-soft: var(--purple-soft);    --game-ink: var(--purple-dark); }
#view-social      { --game: var(--purple);    --game-soft: var(--purple-soft);    --game-ink: var(--purple-dark); }
#view-sentiment   { --game: var(--purple);    --game-soft: var(--purple-soft);    --game-ink: var(--purple-dark); }
#view-alibi       { --game: var(--yellow);    --game-soft: var(--yellow-soft);    --game-ink: var(--yellow-dark); }

/* One heading treatment for every game: display face, light ink, one neon accent. */
.special-game-overlay h1, .special-game-overlay h2 { font-family: var(--font-display); font-weight: 800; color: var(--ink); }
.special-game-overlay .game-accent-title { color: var(--game-ink, var(--primary-dark)); text-shadow: 0 1px 0 rgba(255,255,255,0.9); }
.special-game-overlay p { color: var(--gray); }

.game-left-panel {
    flex: 0 0 260px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: linear-gradient(180deg, #ffffff, #f8fafc);
    border: 1px solid rgba(139,92,246,0.22);
    padding: 20px;
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 44px -18px rgba(2,6,23,0.7), 0 1px 0 rgba(139,92,246,0.15) inset;
    color: var(--text);
    text-align: center;
}

.game-right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: 800px;
    height: 100%;
}

@media (max-width: 900px) {
    .split-game-container { flex-direction: column; gap: 20px; }
    .game-left-panel { flex-direction: row; width: 100%; flex: 0 0 auto; justify-content: space-around; }
    .game-right-panel { width: 100%; }
}

/* SENTIMENT ANALYST — the line is the game, so the card takes the leftover
   height and the text is fitted into it rather than allowed to grow past it. */
.sentiment-card {
    background: linear-gradient(180deg, #ffffff, #f8fafc);
    border: 1px solid var(--game, var(--purple));
    border-radius: var(--radius-lg);
    padding: clamp(16px, 3vh, 40px) clamp(14px, 3vw, 40px);
    width: 100%;
    max-width: 900px;
    flex: 1 1 auto;
    min-height: 180px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--ink);
    box-shadow: 0 20px 50px -18px rgba(2,6,23,0.8), 0 0 40px color-mix(in srgb, var(--game, var(--purple)) 22%, transparent);
    margin-bottom: 14px;
}    /* 1em, not a size: the card is what gets fitted, and this inherits it. */
.sentiment-text { font-size: 1em; font-weight: 700; line-height: 1.4; margin: 0; }
.sentiment-label { font-weight: 800; letter-spacing: 0.02em; }

/* SPYFALL — dark glass interrogator cards */
.spy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
    width: 100%;
    max-width: 900px;
    margin-top: 16px;
}
.spy-card {
    background: #f1f5f9;
    border: 1px solid rgba(15,23,42,0.14);
    border-radius: 16px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    position: relative;
    box-shadow: 0 8px 22px -14px rgba(2,6,23,0.9), 0 1px 0 #f1f5f9 inset;
    backdrop-filter: blur(8px);
}
.spy-card:hover {
    background: rgba(15,23,42,0.10);
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 12px 28px rgba(6,182,214,0.22), 0 0 0 2px rgba(6,182,214,0.18);
    border-color: rgba(6,182,214,0.45);
}
.spy-avatar {
    width: 72px; height: 72px;
    border-radius: 50%;
    border: 3px solid rgba(15,23,42,0.22);
    margin-bottom: 8px;
    background: rgba(15,23,42,0.10);
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    object-fit: cover;
}
.spy-name { font-family: var(--font-display); font-weight: 800; color: var(--ink); margin-bottom: 3px; font-size: 0.92rem; }
.spy-bubble {
    display: none;
    position: absolute;
    bottom: 110%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15,23,42,0.96);
    border: 1px solid rgba(15,23,42,0.16);
    color: var(--ink);
    padding: 12px 14px;
    border-radius: 14px;
    width: max-content;
    max-width: 300px;
    font-size: 0.88rem;
    line-height: 1.5;
    z-index: 50;
    box-shadow: 0 12px 32px rgba(0,0,0,0.35);
    pointer-events: none;
    white-space: normal;
    word-wrap: break-word;
}
.spy-card:nth-child(even) .spy-bubble {
    /* Try to keep it inside for even children assuming they are on the right */
    left: auto;
    right: -20px;
    transform: none;
}
.spy-card:nth-child(even) .spy-bubble::after {
    left: auto;
    right: 40px;
    transform: none;
}
.spy-card:nth-child(odd) .spy-bubble {
    /* Odd children on the left */
    left: -20px;
    transform: none;
}
.spy-card:nth-child(odd) .spy-bubble::after {
    left: 40px;
    transform: none;
}
.spy-bubble::after {
    content: ''; position: absolute; top: 100%; left: 50%; margin-left: -10px;
    border-width: 10px; border-style: solid; border-color: white transparent transparent transparent;
}
.spy-card:hover .spy-bubble { display: block; }
.spy-accuse-btn {
    margin-top: 10px;
    background: #ef4444;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: bold;
}

/* PRACTICE MODE — premium */
.practice-container {
    display: flex; flex-direction: column; height: 100%; align-items: center; justify-content: center; background: transparent;
}
.practice-card {
    width: 90%; max-width: 1000px; height: 80vh; 
    perspective: 1000px; position: relative; cursor: pointer;
    margin-bottom: 30px;
}
.practice-card .face {
    width: 100%; height: 100%; position: absolute; backface-visibility: hidden;
    border-radius: 20px; box-shadow: 0 24px 60px -20px rgba(2,6,23,0.8), 0 0 40px rgba(139,92,246,0.14);
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
    padding: 40px; text-align: center; border: 1px solid rgba(15,23,42,0.14);
    background: linear-gradient(180deg, #ffffff, #f8fafc); backdrop-filter: blur(12px); transition: transform 0.6s;
    overflow-y: auto;
}
/* The practice Exit sits above the deck, not in the header, so it borrows the
   header's compact shape rather than the arena's big-print action button. */
#view-practice .pm-btn-exit { padding: 9px 14px; font-size: 0.85rem; border-radius: 12px; text-transform: none; letter-spacing: 0; }
/* The back is the same paper as the front — one card, turned over. A different
   colour made the reveal look like a different screen instead of the same card. */
.practice-card .back { transform: rotateY(180deg); background: linear-gradient(180deg, #ffffff, #f8fafc); border-color: var(--primary); align-items: flex-start; text-align: left; }
.practice-card.flipped .front { transform: rotateY(180deg); }
.practice-card.flipped .back { transform: rotateY(0deg); }

/* Practice Options Layout */
.prac-options-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
}
.prac-opt-btn {
    padding: 15px; border: 2px solid rgba(15,23,42,0.14); border-radius: 12px; font-weight: bold; background: #f8fafc; color: var(--text); cursor: pointer;
}
.prac-opt-btn:hover { background: rgba(6,182,214,0.16); border-color: var(--secondary); }
.prac-opt-btn.correct { background: rgba(34,197,94,0.16); border-color: #16a34a; color: #047857; }
.prac-opt-btn.wrong { background: var(--accent-soft); border-color: var(--accent); color: var(--accent-ink); }

.p-question { font-size: 2.2rem; font-weight: 800; color: var(--text); margin-bottom: 10px; margin-top: 40px; }
.p-answer { font-size: 2rem; font-weight: 900; color: var(--primary); margin-bottom: 20px; width: 100%; text-align: center; border-bottom: 2px dashed rgba(15,23,42,0.16); padding-bottom: 10px; }
.p-hint { font-size: 1.1rem; color: var(--secondary-ink); background: rgba(6,182,214,0.14); padding: 15px; border-radius: 12px; margin-bottom: 10px; width: 100%; }
.p-deep { font-size: 1rem; line-height: 1.5; color: var(--text); background: #f1f5f9; padding: 10px; border-radius: 8px; border: 1px solid rgba(15,23,42,0.10); margin-bottom: 10px; width: 100%; }
.p-ccq { font-size: 1rem; color: var(--yellow-ink); font-style: italic; background: var(--yellow-soft); padding: 10px; border-radius: 8px; width: 100%; }

.practice-nav { display: flex; gap: 20px; }

/* CONCEPT LINK — premium */
.concept-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: transparent; position: relative; }
/* .cl-node removed */
.cl-links { display: flex; gap: 40px; margin-bottom: 50px; }
.cl-clue { width: clamp(90px, 15vw, 150px); height: clamp(90px, 15vw, 150px); border-radius: var(--radius-lg); background: #f1f5f9; border: 3px dashed var(--game); display: flex; align-items: center; justify-content: center; font-size: clamp(2.6rem, 6vw, 5rem); font-weight: 800; cursor: pointer; transition: all .2s; color: var(--game-ink, var(--primary-dark)); box-shadow: 0 8px 20px -12px color-mix(in srgb, var(--game) 65%, transparent); }
.cl-clue:hover { transform: translateY(-2px); background: #ffffff; border-style: solid; color: var(--game-ink); }
.cl-clue.revealed { background: #ffffff; border-color: var(--game); border-style: solid; color: var(--game-ink); }

.cl-answer-display { 
    font-size: clamp(1.4rem, 4vw, 3rem); font-weight: 900; color: var(--gray);
    text-transform: uppercase;
    padding: 16px 32px; border: 3px dashed rgba(15,23,42,0.25); border-radius: var(--radius-lg); background: #f8fafc;
    cursor: pointer; transition: all .3s; user-select: none; text-align: center; max-width: 100%;
}
.cl-answer-display.revealed {
    color: var(--primary-dark);
    background: linear-gradient(135deg, var(--primary-soft), var(--secondary-soft));
    border-color: rgba(139,92,246,0.45);
    box-shadow: var(--neon-glow);
    border-style: solid;
}

/* HOT SEAT — neon */
.hotseat-container { width: 100%; height: 100%; background: transparent; }
.hs-card { background: linear-gradient(180deg, #ffffff, #f8fafc); border: 1px solid rgba(236,72,153,0.35); border-radius: 20px; padding: 32px; width: 100%; font-size: 2rem; font-weight: 800; color: var(--ink); box-shadow: 0 20px 50px -18px rgba(2,6,23,0.8), 0 0 40px rgba(236,72,153,0.18); margin-bottom: 20px; min-height: 280px; display:flex; align-items:center; justify-content:center; text-align: center; backdrop-filter: blur(12px); }
.hs-timer { font-family: var(--font-mono); font-size: 4rem; font-weight: 900; color: var(--accent); background: #f8fafc; padding: 10px 40px; border-radius: 50px; border: 2px solid rgba(236,72,153,0.45); display:inline-block; text-shadow: 0 0 22px rgba(236,72,153,0.55); }
.hs-controls { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap:wrap; justify-content:center; }
.hs-btn-small { padding: 7px 13px; border-radius: 10px; font-weight: 800; cursor: pointer; border: 1px solid rgba(15,23,42,0.14); background: #f1f5f9; color: var(--text); white-space: nowrap; }
.hs-btn-small:hover { background: rgba(15,23,42,0.15); }
.hs-score-display { font-size: 1.5rem; font-weight: 900; color: var(--yellow-dark); margin-top: 20px; text-shadow: 0 0 18px rgba(251,191,36,0.4); }

/* TABOO — neon */
.taboo-container { width: 100%; height: 100%; background: transparent; }
.tb-card { background: linear-gradient(180deg, #ffffff, #f8fafc); border: 1px solid rgba(167,139,250,0.4); border-radius: 20px; padding: 32px; width: 100%; max-width: 500px; text-align: center; box-shadow: 0 20px 50px -18px rgba(2,6,23,0.8), 0 0 40px rgba(139,92,246,0.2); margin: 0 auto; backdrop-filter: blur(12px); }
.tb-target { font-family: var(--font-display); font-size: 3rem; font-weight: 900; color: var(--ink); border-bottom: 1px solid rgba(15,23,42,0.14); padding-bottom: 20px; margin-bottom: 20px; text-shadow: 0 1px 0 rgba(255,255,255,0.9); }
.tb-forbidden { font-size: 1.5rem; line-height: 1.8; font-weight: 700; color: #be123c; }

/* ========== PICTIONARY — STUDIO MODE ==========
   A darkroom studio: the canvas is the brightest thing on screen,
   the tools read as one instrument rail. Nothing competes with
   the drawing for the class's attention. */
.pictionary-container { display: flex; flex-direction: column; align-items: stretch; height: 100%; position: relative; gap: 0; padding: 10px 14px 14px; background: transparent; }
/* header row: title · actions · What to Draw pill (everything in ONE row so the canvas keeps the height) */
.pic-studio-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; min-height: 42px; }
.pic-studio-title { font-family: var(--font-display); font-weight: 900; font-size: clamp(1.05rem, 2vw, 1.5rem); color: var(--ink); letter-spacing: -0.02em; display: flex; align-items: center; gap: 10px; }
.pic-studio-title i { color: #f472b6; filter: drop-shadow(0 0 8px rgba(244,114,182,0.5)); }
.pic-header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pic-act-btn { padding: 9px 14px; font-size: 0.85rem; border-radius: 12px; background: #f1f5f9; color: var(--text); border: 1px solid rgba(15,23,42,0.14); }
.pic-act-btn.pic-act-green { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-color: transparent; color: #fff; box-shadow: 0 4px 14px rgba(139,92,246,0.35); }
.pic-act-btn.pic-act-green:hover { box-shadow: 0 6px 20px rgba(139,92,246,0.5); }
.pic-draw-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; border: 1px solid rgba(124,58,237,0.35); background: #ffffff; color: var(--primary-ink); font-family: inherit; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 10px -4px rgba(15,23,42,0.25); }
.pic-draw-btn:hover { background: var(--primary-soft); transform: translateY(-1px); }
.pic-draw-btn.has-content { background: linear-gradient(135deg, #8b5cf6, #06b6d4); border-color: transparent; box-shadow: 0 4px 20px rgba(139,92,246,0.4); }
/* popup for What to Draw */
.pic-draw-popup { position: fixed; inset: 0; z-index: 5000; display: none; align-items: center; justify-content: center; padding: 20px; background: rgba(226,232,240,0.78); backdrop-filter: blur(8px); }
.pic-draw-popup.open { display: flex; }
.pic-draw-card { background: #ffffff; border: 1px solid rgba(124,58,237,0.28); border-radius: 20px; padding: 28px; max-width: 560px; width: 100%; box-shadow: 0 28px 70px -20px rgba(15,23,42,0.35); animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.pic-draw-card h3 { margin: 0 0 4px; font-size: 0.75rem; letter-spacing: 0.12em; color: #8b5cf6; font-weight: 800; }
.pic-draw-card p { margin: 0 0 16px; font-size: 1.35rem; font-weight: 800; color: #0f172a; line-height: 1.4; }
.pic-draw-card .pm-brief-tools { margin: 0; }
/* THE CANVAS — the star of the show. Every fixed row above is clamped,
   so flex:1 gives the drawing surface everything the frame can spare. */
#pictionary-canvas-container { position: relative; flex: 1 1 auto; min-height: 260px; width: 100%; border-radius: 18px; background: #ffffff; overflow: hidden;
    border: 1px solid rgba(15,23,42,0.16);
    box-shadow: 0 22px 50px -24px rgba(15,23,42,0.35), 0 0 0 1px rgba(124,58,237,0.14);
}
/* Fabric wraps the <canvas> in a .canvas-container and puts a SECOND canvas on
   top of it (the upper canvas). The upper one is what receives every mouse event
   — the lower one is only painted on. Absolute-positioning the lower canvas with
   a z-index lifted it above the upper one, so clicks landed on an element that
   listens for nothing and the board looked dead. Both canvases are left in
   Fabric's hands: it sizes and stacks them, the board keeps the crosshair. */
#pictionary-canvas-container .canvas-container { touch-action: none; }
#pictionary-canvas-container canvas,
#pictionary-canvas-container .upper-canvas { touch-action: none; display: block; }
#pictionary-canvas-container .upper-canvas { cursor: crosshair; }
/* One instrument rail: groups of tools separated by hairlines. */
.pictionary-tools { display: flex; gap: 10px; margin: 12px 0 0; padding: 9px 12px; border-radius: 16px; align-items: center; flex-wrap: wrap; justify-content: center;
    background: linear-gradient(180deg, #ffffff, #f8fafc);
    border: 1px solid rgba(124,58,237,0.22);
    box-shadow: 0 16px 38px -26px rgba(15,23,42,0.45);
}
.pic-tool-group { display: flex; gap: 6px; align-items: center; }
.pic-tool-group + .pic-tool-group { padding-left: 10px; border-left: 1px solid rgba(15,23,42,0.10); }
.tool-btn { padding: 0; border: 1px solid rgba(15,23,42,0.10); border-radius: 12px; background: #f1f5f9; cursor: pointer; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: var(--text); }
.tool-btn svg { width: 21px; height: 21px; fill: currentColor; stroke: currentColor; }
.tool-btn:hover { background: #e2e8f0; transform: translateY(-1px); }
.tool-btn.active { background: linear-gradient(135deg, #7c3aed, #0891b2); color: #ffffff; border-color: transparent; box-shadow: 0 10px 22px -10px rgba(124,58,237,0.75); transform: scale(1.05); }
/* If the CDN never arrives the board has to explain itself rather than sit
   there looking drawable and doing nothing. */
.pic-nocdn { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px; font-weight: 700; color: var(--gray); background: #ffffff; z-index: 30; }
/* Swatches — one tap recolours the brush; the current colour is ringed. */
.pic-swatches { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
.pic-swatch { width: 24px; height: 24px; border-radius: 50%; border: 2px solid rgba(15,23,42,0.18); cursor: pointer; padding: 0; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; }
.pic-swatch:hover { transform: scale(1.18); }
.pic-swatch.on { border-color: #fff; box-shadow: 0 0 0 2px rgba(139,92,246,0.9), 0 0 12px rgba(139,92,246,0.5); transform: scale(1.12); }
.pic-custom-color { position: relative; width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; border: 2px dashed rgba(15,23,42,0.35); overflow: hidden; }
.pic-custom-color svg { width: 14px; height: 14px; fill: var(--gray); stroke: var(--gray); }
.pic-custom-color:hover { border-color: rgba(15,23,42,0.4); }
.pic-custom-color input { position: absolute; inset: -6px; opacity: 0; cursor: pointer; }
/* Brush size slider + live dot preview */
.pic-size-group { gap: 9px; }
#pic-size { accent-color: #8b5cf6; width: 96px; cursor: pointer; }
.pic-size-dot-wrap { width: 40px; height: 40px; border-radius: 10px; background: #f1f5f9; border: 1px solid rgba(15,23,42,0.10); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.pic-size-dot { display: block; border-radius: 50%; background: #0f172a; width: 4px; height: 4px; box-shadow: 0 0 0 1.5px rgba(15,23,42,0.35); transition: width 0.12s, height 0.12s; }
#sticker-input { border: 1px solid rgba(15,23,42,0.12); border-radius: 10px; padding: 0 10px; font-size: 1.05rem; width: 56px; height: 40px; text-align: center; background: #f1f5f9; color: var(--text); }
#sticker-input::placeholder { color: var(--gray); }
/* On short or narrow screens the rail is allowed to compact: fewer
   pixels per tool, but nothing hidden and nothing wrapped off-screen. */
@media (max-width: 900px), (max-height: 640px) {
    .pictionary-container { padding: 8px 10px 10px; }
    .pic-studio-header { margin-bottom: 8px; }
    .tool-btn { width: 38px; height: 38px; }
    .tool-btn svg { width: 18px; height: 18px; }
    .pic-swatch { width: 20px; height: 20px; }
    #pic-size { width: 74px; }
    .pic-size-dot-wrap { width: 32px; height: 32px; }
    #sticker-input { height: 38px; }
}
@media (max-width: 640px) {
    .pic-header-actions { width: 100%; justify-content: flex-start; }
    #pictionary-canvas-container { min-height: 200px; }
}

@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes popIn { from { transform: scale(0.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes spin { from { transform: rotate(0deg) scale(0); } to { transform: rotate(360deg) scale(1); } }

/* MODE SELECT VIEW — the marquee. Tiles are dark neon cards, grouped by
   the same four accents, with a glow on hover. */
#mode-select-view { display:none; background: transparent; }
#mode-select-view h1 { color: var(--ink); }
.mode-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: clamp(10px, 1.6vw, 18px); max-width: 1000px; width: 100%; margin: clamp(14px, 2.4vh, 30px) 0; }

/* Every tile leads with a drawn mark instead of a photograph — see .mode-art. A
   picture of somebody else's Pictionary box said nothing about THIS lesson, and
   on a projector it read as a stock photo with a caption. A drawn icon is
   instant, identical offline, and belongs to the same set as the other eleven. */

/* ============================================================
   THE FRONT DOOR (setup screen)
   ------------------------------------------------------------
   One banner, two numbered steps, two buttons. No photograph: a photograph of
   somebody else's classroom is borrowed atmosphere, and on a projector it read
   as a stock image with text on top. The banner is a drawn mark instead — the
   same board-and-badge motif the tiles use — on a paper-white card, so it looks
   deliberate offline and there is nothing to download.
   ============================================================ */
.setup-inner { max-width: 960px; }
.setup-hero {
    position: relative; width: 100%; display: flex; align-items: center;
    gap: clamp(14px, 2.6vw, 34px);
    border-radius: var(--radius-lg); overflow: hidden; margin: 0 0 clamp(14px, 2.2vh, 26px);
    padding: clamp(20px, 3vw, 34px);
    background: linear-gradient(118deg, #ffffff 0%, #f8f6ff 58%, #f0fdff 100%);
    border: 1px solid var(--line);
    box-shadow: 0 26px 60px -36px rgba(15,23,42,0.4);
}
.setup-hero-body { position: relative; z-index: 2; flex: 1 1 auto; min-width: 0; text-align: left; }
.setup-kicker { font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 800; color: var(--primary); margin-bottom: 6px; }
.setup-hero-body h1 { font-family: var(--font-display); font-size: clamp(1.6rem, 3.8vw, 2.6rem); margin: 0 0 8px; color: var(--ink); letter-spacing: -0.02em; }
.setup-hero-body p { margin: 0; max-width: 56ch; color: var(--gray); font-weight: 600; font-size: clamp(0.9rem, 1.1vw, 1rem); }
.setup-hero-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.setup-chip {
    display: inline-flex; align-items: center; gap: 6px; padding: 6px 13px; border-radius: 999px;
    background: #ffffff; border: 1px solid var(--line);
    font-size: 0.78rem; font-weight: 800; color: var(--text);
}
.setup-chip i { color: var(--primary); }
.setup-hero-art { flex: 0 0 auto; width: clamp(112px, 19vw, 190px); }
.setup-hero-art svg { width: 100%; height: auto; display: block; }
.art-slab { fill: #ffffff; stroke: rgba(124,58,237,0.3); stroke-width: 2.4; }
.art-dots circle { fill: var(--secondary); }
.art-badge { fill: var(--primary); }
.art-star { fill: #ffffff; }

.setup-card {
    width: 100%; text-align: left; background: #ffffff;
    border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: clamp(14px, 2vw, 22px); box-shadow: 0 26px 54px -40px rgba(15,23,42,0.45);
    color: var(--text);
}
.setup-step { display: flex; align-items: center; gap: 12px; margin: 0 0 12px; text-align: left; }
.setup-step-wide { width: 100%; justify-content: center; margin: clamp(16px, 2.4vh, 26px) 0 10px; }
.setup-step-num {
    flex: 0 0 auto; width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: var(--primary-soft); color: var(--primary-ink); border: 1px solid var(--primary);
    font-family: var(--font-display); font-weight: 800;
}
.setup-step-title { font-family: var(--font-display); font-weight: 800; font-size: clamp(1rem, 1.4vw, 1.16rem); color: var(--ink); }
.setup-step-sub { font-size: 0.85rem; color: var(--gray); font-weight: 600; }
.setup-seats { display: flex; flex-wrap: wrap; gap: 10px; width: 100%; min-height: 34px; margin: 0 0 12px; }
.setup-seat {
    display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px 6px 6px;
    background: #f1f5f9; border: 1px solid rgba(15,23,42,0.16); border-radius: 999px;
    box-shadow: 0 8px 20px -10px rgba(2,6,23,0.7); font-weight: 800; color: var(--ink); font-size: 0.92rem;
}
.setup-seat img { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; background: #1e293b; }
.setup-seat.role-tutor { border-color: var(--purple); }
.setup-seat.role-learner { border-color: var(--primary); }
.setup-seat button { background: none; border: 0; cursor: pointer; color: var(--gray); font-size: 1.05rem; line-height: 1; padding: 2px 4px; }
.setup-seat button:hover { color: var(--accent); }
.setup-add { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
.setup-add input {
    flex: 1 1 240px; padding: 13px 14px; border: 1px solid rgba(15,23,42,0.16); border-radius: 12px;
    font-family: inherit; font-size: 1rem; font-weight: 700; color: var(--ink); background: #f8fafc;
}
.setup-add input::placeholder { color: var(--gray); }
.setup-add input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(139,92,246,0.25); }
.setup-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; width: 100%; }
.setup-btn { font-size: clamp(1rem, 1.3vw, 1.1rem); padding: 15px 26px; border-radius: 999px; }
/* One primary action: Start. It is larger, carries the accent shadow, and sits
   first, so the eye lands on the only thing a tutor has to press. */
.setup-btn-primary { padding: 16px 44px; font-size: clamp(1.05rem, 1.5vw, 1.25rem); box-shadow: 0 16px 34px -14px rgba(124,58,237,0.6); }
@media (max-width: 720px) {
    .setup-hero { flex-direction: column-reverse; align-items: flex-start; }
    .setup-hero-art { width: clamp(96px, 30vw, 150px); align-self: center; }
    .setup-hero-body { text-align: center; width: 100%; }
    .setup-hero-body p { margin: 0 auto; }
    .setup-hero-chips { justify-content: center; }
    .setup-step-wide { justify-content: flex-start; }
    .setup-actions .setup-btn { flex: 1 1 100%; }
}
/* The primary chip is the one row that becomes a full-width bar on a phone, so
   the thumb always lands on Start rather than on Play on phones. */
@media (max-width: 720px) {
    .setup-actions { flex-direction: column-reverse; }
}

/* ---- MODE TILES ------------------------------------------------------------
   Fourteen games, four accents. The tile shape, border, radius and press are
   identical everywhere; only the accent changes, and it changes by the KIND of
   game (quiz / performance / role-play / challenge) — not by whatever hue a
   given game was given. That is what makes the board read as one product
   instead of fourteen skins. */
.cat-quiz { --card-color: var(--secondary); --card-soft: #ecfeff; }
.cat-performance { --card-color: var(--primary); --card-soft: #f5f3ff; }
.cat-roles { --card-color: var(--purple); --card-soft: #f3e8ff; }
.cat-challenge { --card-color: var(--yellow); --card-soft: #fffbeb; }

/* The key to those four colours, so the grouping is readable rather than a
   decoration the class has to guess at. */
.mode-legend { display: flex; flex-wrap: wrap; gap: 8px 18px; justify-content: center; margin: 0 0 clamp(8px, 1.6vh, 18px); }
.mode-legend-item { display: inline-flex; align-items: center; gap: 7px; font-size: 0.8rem; font-weight: 700; color: var(--gray); }
.mode-legend-item i { width: 12px; height: 12px; border-radius: 50%; background: var(--card-color); display: inline-block; }

.mode-card {
    position: relative; overflow: hidden;
    background: #ffffff;
    border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 14px; font-family: inherit;
    cursor: pointer; box-shadow: 0 12px 28px -20px rgba(15,23,42,0.35);
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 10px;
    min-height: clamp(152px, 20vh, 200px);
    transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
    color: var(--card-color);
}
/* Every tile leads with the same drawn mark on the same tinted panel, so the
   board reads as one icon set. The mark is the game; the tint is only its kind. */
.mode-art {
    flex: 1 1 auto; width: 100%; min-height: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: 14px; padding: 10px;
    background: var(--card-soft);
    border: 1px solid color-mix(in srgb, var(--card-color) 30%, transparent);
    transition: transform .16s ease;
}
.mode-art svg {
    width: clamp(44px, 6vw, 62px); height: clamp(44px, 6vw, 62px); display: block;
    stroke: currentColor; fill: none; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round;
}
.mode-art svg .filled { fill: currentColor; stroke: none; }
.mode-name {
    font-family: var(--font-display); font-weight: 800; color: var(--ink);
    font-size: clamp(0.8rem, 1.02vw, 0.96rem); line-height: 1.2; letter-spacing: -0.01em;
}
.mode-card.premium-card { border-color: var(--line); background: #ffffff; }
.mode-card.premium-card:hover { transform: translateY(-4px); border-color: var(--card-color); box-shadow: 0 22px 46px -22px color-mix(in srgb, var(--card-color) 55%, rgba(15,23,42,0.45)); }
.mode-card.premium-card:hover .mode-art { transform: scale(1.05); }
.mode-card.premium-card:active { transform: translateY(-1px); }
.mode-card.premium-card span {
    font-family: var(--font-display);
    font-weight: 800; font-size: 1.02rem; color: var(--ink); text-align: center; z-index: 2;
}

/* PRACTICE MODE MIC */
.practice-mic-btn {
    background: var(--purple); color: white; width: 60px; height: 60px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
    margin: 20px auto; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    transition: all 0.2s;
}
.practice-mic-btn.listening { animation: pulse 1.5s infinite; background: var(--accent); }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }

/* ============================================================
   SCREENS — a scroll-safe, centred shell for setup / mode select
   ------------------------------------------------------------
   These views used to be flex-centred inside a height:100% box, so
   whenever the content was taller than the window the top was clipped
   AND unreachable (Flexbox pushes overflow past both edges, but only
   downward overflow scrolls). "Select Game Environment" is 270px
   taller than a 900px-tall window — that is why its title sat outside
   the frame. flex-start + auto margins on the inner block centres when
   there is room and starts at the top when there is not.
   ============================================================ */
.screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
    text-align: center;
}
.screen > .screen-inner {
    margin: auto;
    width: 100%;
    max-width: 1100px;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.screen h1 { font-size: clamp(1.7rem, 4.6vw, 3.5rem); line-height: 1.1; }

/* ============================================================
   TOASTS — non-blocking feedback (replaces window.alert)
   pmNotify() froze the whole game mid-turn; on a projector that
   looks like a crash.
   ============================================================ */
.pm-toast-wrap {
    position: fixed; left: 50%; bottom: calc(20px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    z-index: 99999; display: flex; flex-direction: column; gap: 8px; align-items: center;
    width: max-content; max-width: min(92vw, 540px); pointer-events: none;
}
.pm-toast {
    background: linear-gradient(180deg, #ffffff, #f8fafc); color: var(--ink); font-weight: 800; font-size: clamp(0.85rem, 1.6vw, 1rem);
    border: 1px solid rgba(15,23,42,0.14);
    padding: 12px 18px; border-radius: 14px; box-shadow: 0 14px 36px rgba(2,6,23,0.55);
    display: flex; align-items: center; gap: 10px; text-align: left;
    animation: pmToastIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: auto;
}
.pm-toast.good { background: linear-gradient(135deg, #7c3aed, #5b21b6); border-color: rgba(167,139,250,0.5); color: #fff; }
.pm-toast.bad { background: linear-gradient(135deg, #dc2626, #be123c); border-color: rgba(251,113,133,0.5); color: #fff; }
.pm-toast.info { background: linear-gradient(135deg, rgba(34,211,238,0.85), rgba(14,116,144,0.95)); border-color: rgba(103,232,249,0.5); }
.pm-toast.warn { background: linear-gradient(135deg, rgba(251,191,36,0.85), rgba(180,83,9,0.95)); border-color: rgba(252,211,77,0.5); }
.pm-toast.out { animation: pmToastOut 0.25s forwards; }
@keyframes pmToastIn { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes pmToastOut { to { opacity: 0; transform: translateY(10px) scale(0.98); } }

/* ============================================================
   POWER-UPS — chips, target picker
   ============================================================ */
#target-modal { z-index: 300; }
#target-modal .modal-card { height: auto; max-height: min(88dvh, 640px); width: min(560px, 96vw); }
.pu-target-list { display: flex; flex-direction: column; gap: 10px; padding: 16px; overflow-y: auto; }
.pu-target {
    display: flex; align-items: center; gap: 12px; padding: 12px 14px; width: 100%;
    border: 1px solid rgba(15,23,42,0.14); border-radius: 14px; background: #f8fafc;
    font-family: inherit; font-weight: 800; font-size: 1.05rem; cursor: pointer; text-align: left;
    color: var(--ink);
}
.pu-target:hover { border-color: var(--secondary); background: rgba(6,182,214,0.10); }
.pu-target img { width: 40px; height: 40px; border-radius: 50%; }
.pu-target .pts { margin-left: auto; color: var(--gray); font-size: 0.95rem; }

.pu-picker { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 940px; margin-top: 10px; }
.pu-chip {
    display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px;
    border: 1px solid rgba(15,23,42,0.14); border-radius: 999px; background: #f8fafc;
    font-family: inherit; font-weight: 800; font-size: 0.88rem; cursor: pointer; color: var(--ink);
    min-height: 40px;
}
.pu-chip .pu-emo { font-size: 1.15rem; line-height: 1; }
.pu-chip.on { border-color: var(--primary); background: var(--primary-soft); color: var(--purple-ink); box-shadow: 0 0 18px rgba(139,92,246,0.25); }
.pu-chip.off { opacity: 0.42; }
.pu-chip.pu-tier-legendary.on { border-color: var(--yellow); }
.pu-chip.pu-tier-epic.on { border-color: var(--purple); }
.pu-chip.pu-tier-common.on { border-color: var(--secondary); }
.pu-picker-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; }
.pu-mini {
    border: 1px solid rgba(15,23,42,0.14); background: #f8fafc; border-radius: 999px; cursor: pointer;
    font-family: inherit; font-weight: 800; font-size: 0.82rem; padding: 8px 14px; color: var(--gray);
    min-height: 38px;
}
.pu-mini:hover { border-color: var(--secondary); color: var(--secondary-ink); }
.pu-section-label {
    margin-top: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;
    color: var(--primary-dark); font-size: 0.85rem;
}

/* ============================================================
   RESPONSIVE — tablet & phone layouts
   ============================================================ */
@media (max-width: 1024px) {
    body { height: auto; min-height: 100dvh; overflow-y: auto; }
    .app-container {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto 1fr;
        height: auto;
        min-height: 0;
        overflow: visible;
    }
    .header {
        grid-column: 1; grid-row: 1;
        position: sticky; top: 0; height: auto; min-height: 60px;
        flex-wrap: wrap; gap: 8px; padding: 8px 12px;
    }
    .logo { font-size: 1.15rem; }
    .header-controls { flex-wrap: wrap; gap: 8px; }
    .game-stats { font-size: 1rem; }
    .sidebar {
        grid-column: 1; grid-row: 2;
        height: auto; max-height: none;
        border-right: 0; border-bottom: 2px solid var(--gray-light);
        padding: 14px;
    }
    .active-player-display { flex-direction: row; text-align: left; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; }
    .active-player-avatar { width: 58px; height: 58px; margin-bottom: 0; border-width: 3px; }
    .active-player-name { font-size: 1.15rem; }
    .active-player-status { font-size: 0.78rem; }
    .active-effects-box { margin-top: 8px; }
    #leaderboard-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }
    .player-card { margin-bottom: 0; }
    .game-area { grid-column: 1; grid-row: 3; height: auto; min-height: 62vh; padding: 10px; }
    .grid-wrapper { height: auto; aspect-ratio: 1 / 1; max-height: 82dvh; max-width: 100%; margin: 0 auto; gap: clamp(3px, 1vw, 8px); }
    .game-card { font-size: clamp(0.8rem, 3.4vw, 2rem); border-width: 2px; border-radius: 8px; box-shadow: 0 3px 0 var(--gray-light); }
    .practice-card { height: auto; min-height: 60dvh; max-height: none; margin-bottom: 16px; }
    .practice-card .face { position: relative; min-height: 60dvh; padding: 20px; }
    .practice-card .front, .practice-card .back { transform: none; }
    .practice-card.flipped .front { display: none; }
    .practice-card.flipped .back { display: flex; }
    .split-game-container { flex-direction: column; gap: 14px; padding: 10px; }
}

@media (max-width: 640px) {
    .screen { padding: 16px 12px calc(18px + env(safe-area-inset-bottom)); }
    .mode-grid { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
    .mode-card { padding: 18px 12px; }
    .mode-card.premium-card span { font-size: 1rem; }
    .mode-art svg { width: clamp(38px, 11vw, 52px); height: clamp(38px, 11vw, 52px); }
    .btn-action { font-size: 0.95rem; padding: 12px 18px; }
    .modal { padding: 8px; }
    .modal-card { height: auto; max-height: 94dvh; width: 100%; }
    .modal-header { flex-wrap: wrap; gap: 8px; padding: 10px 12px; }
    .modal-header-center { flex-wrap: wrap; justify-content: center; }
    .options-grid { grid-template-columns: 1fr !important; }
    .option-btn { font-size: 1rem; padding: 14px; }
    .q-content { font-size: 1.25rem !important; }
    .active-player-avatar { width: 48px; height: 48px; }
    #leaderboard-list { grid-template-columns: 1fr 1fr; }
    .player-avatar { width: 30px; height: 30px; }
    .sidebar { padding: 10px; }
    .game-area { padding: 6px; min-height: 54vh; }
    .special-game-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        height: auto; width: auto; overflow-y: auto; padding: 10px;
    }
}

@media (max-height: 560px) and (orientation: landscape) {
    .screen { padding: 10px 12px; }
    .screen h1 { font-size: 1.4rem; }
    .mode-grid { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }
    .mode-card { padding: 10px; }
    .mode-art svg { width: 36px; height: 36px; }
}

@media (prefers-reduced-motion: reduce) {
    .mode-card.premium-card::before { animation: none; }
    .mode-art, .mode-card.premium-card { transition: none; }
    .pm-toast { animation: none; }
}

/* ============================================================
   HIDDEN ROLES — Mafia / Werewolf
   ============================================================ */
.social-top { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap; margin-bottom:14px; }
.social-kicker { font-size:0.72rem; font-weight:900; letter-spacing:1.5px; color:var(--purple-dark); text-transform:uppercase; }
.social-title { font-size:clamp(1.3rem, 3vw, 2.1rem); font-weight:900; color:var(--ink); margin:2px 0 4px; }
.social-setting { font-size:clamp(1rem, 1.2vw, 1.16rem); color:var(--ink); max-width:70ch; margin:0; font-weight:600; }
.social-actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.social-actions .btn-action { padding:8px 14px; font-size:0.85rem; }
/* ONE LINE, DELIBERATELY. A tutor working a hidden-role round reaches for the
   difficulty dial and the transport mid-sentence, so on a desktop the strip is
   compacted rather than allowed to wrap a lone button onto a second line under
   the cursor. The type stays legible (0.83rem bold); below a tablet it wraps and
   grows again, which is the right trade on a small screen. */
@media (min-width: 900px) {
    .social-actions { flex-wrap:nowrap; gap:6px; }
    /* nowrap on the bar is useless if a label inside it still breaks: "Read big"
       came back as two lines, which is what pushed the strip back to two rows. */
    .social-actions .btn-action { padding:8px 10px; font-size:0.82rem; white-space:nowrap; flex:0 0 auto; }
    .social-difficulty { flex-wrap:nowrap; }
    .social-diff-btn { padding:5px 10px; font-size:0.76rem; white-space:nowrap; }
    .social-diff-label { font-size:0.6rem; letter-spacing:0.8px; }
}
.social-stage { display:grid; grid-template-columns:minmax(200px, 270px) 1fr; gap:16px; align-items:stretch; }
/* 40dvh, not 52: with the vote box and the difficulty bar under it, the taller
   ceiling pushed the whole screen past the bottom of the frame. The rail scrolls
   its own overflow, so a big cast is reachable either way. */
.social-rail { display:grid; grid-template-columns:repeat(auto-fill, minmax(84px, 1fr)); gap:8px; max-height:40dvh; overflow-y:auto; padding:4px; }
.social-char { display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 4px; border:2px solid var(--gray-light); border-radius:14px; background:#f1f5f9; cursor:pointer; font-family:inherit; min-height:96px; }
.social-char img { width:46px; height:46px; border-radius:50%; background:rgba(15,23,42,0.10); }
.social-char-name { font-size:0.74rem; font-weight:800; color:var(--ink); text-align:center; line-height:1.1; }
.social-char-role { font-size:0.62rem; font-weight:700; color:var(--gray); text-transform:uppercase; text-align:center; }
.social-char.speaking { border-color:var(--secondary); box-shadow:0 0 0 3px rgba(6,182,214,0.28); background:rgba(6,182,214,0.12); }
.social-char.accused { border-color:var(--accent); background:var(--accent-soft); }
.social-char.team-mafia, .social-char.team-werewolf { background:var(--accent-soft); border-color:var(--accent); }
.social-char.team-neutral { background:var(--yellow-soft); border-color:var(--yellow); }
.social-char.team-town { background:var(--primary-soft); border-color:var(--primary); }
.social-line-card {
    background:var(--surface); border:2px solid var(--gray-light); border-radius:var(--radius-lg);
    padding:16px 20px; box-shadow:var(--shadow-sm);
    display:flex; flex-direction:column; overflow:hidden; max-height:40dvh;
}
/* The line is the only thing that grows: it takes the leftover height of the card
   and is fitted to it, so a long defence shrinks rather than spilling out. */
#social-line { flex:1 1 auto; min-height:0; overflow:auto; display:flex; align-items:center; }
.social-speaking { font-size:0.7rem; font-weight:900; letter-spacing:1.4px; text-transform:uppercase; color:var(--secondary-dark); }
.social-speaker { font-size:clamp(1.05rem, 2vw, 1.5rem); font-weight:900; color:var(--ink); margin:4px 0 10px; }
.social-line { font-size:1.35rem; line-height:1.5; color:var(--text); margin:0; }
.social-progress { margin-top:12px; font-weight:800; color:var(--gray); font-size:0.85rem; }
.social-hint { margin:10px 0 0; font-size:0.78rem; color:var(--gray); }
.social-vote { margin-top:16px; background:#f8fafc; border:2px dashed var(--gray-light); border-radius:16px; padding:14px; }
.social-vote-title { font-weight:900; color:var(--ink); margin-bottom:10px; }
.social-vote-row { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
.social-vote-chip { border:2px solid var(--gray-light); background:#f1f5f9; border-radius:999px; padding:8px 14px; font-family:inherit; font-weight:800; font-size:0.85rem; color:var(--text); cursor:pointer; min-height:38px; }
.social-vote-chip.on { border-color:var(--accent); background:var(--accent-soft); color:var(--accent-ink); }
.social-verdict { margin-top:16px; }
.social-verdict-title { font-size:clamp(1.05rem, 2vw, 1.4rem); font-weight:900; margin-bottom:12px; color:var(--ink); }
.social-verdict-roles { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px; margin-bottom:14px; }
.social-role-row { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:12px; background:#f1f5f9; border:2px solid var(--gray-light); }
.social-role-row img { width:34px; height:34px; border-radius:50%; }
.social-role-name { font-weight:900; color:var(--ink); font-size:0.9rem; }
.social-role-title { font-weight:800; color:var(--gray); font-size:0.82rem; }
.social-role-team { margin-left:auto; font-size:0.68rem; font-weight:900; text-transform:uppercase; letter-spacing:1px; color:var(--gray); }
.social-role-row.team-mafia, .social-role-row.team-werewolf { border-color:var(--accent); background:var(--accent-soft); }
.social-role-row.team-neutral { border-color:var(--yellow); background:var(--yellow-soft); }
.social-role-row.team-town { border-color:var(--primary); background:var(--primary-soft); }
.social-verdict-actions { display:flex; gap:10px; flex-wrap:wrap; }
/* Difficulty dial — an inline group inside the actions bar, not a band of its own.
   The bar itself is styled once, up with the rest of the social layout; a second
   copy of the rule here silently beat the compact desktop one above, which is why
   the strip kept wrapping after it had been measured to fit. */
.social-difficulty { display:inline-flex; flex-wrap:wrap; align-items:center; gap:6px; }
.social-diff-label { font-size:0.68rem; font-weight:900; letter-spacing:1.2px; color:var(--gray); }
.social-diff-btn { border:2px solid rgba(15,23,42,0.18); background:#f1f5f9; border-radius:999px; padding:6px 13px; font-family:inherit; font-weight:800; font-size:0.8rem; color:var(--text); cursor:pointer; }
.social-diff-btn.on { border-color:var(--purple); background:var(--purple-soft); color:var(--purple-ink); }
/* vote row + report */
.social-vote-actions { display:flex; gap:10px; flex-wrap:wrap; }
.social-vote-count { font-size:0.72rem; color:var(--secondary-ink); }
.social-report { margin-bottom:16px; display:grid; gap:10px; }
.social-report-block { background:#f8fafc; border:2px solid var(--gray-light); border-radius:14px; padding:10px 12px; }
.social-tell-row { display:flex; gap:10px; align-items:flex-start; padding:8px 10px; border-radius:12px; background:#f8fafc; border-left:6px solid #94a3b8; margin-bottom:6px; }
.social-tell-row.team-mafia, .social-tell-row.team-werewolf { border-left-color:var(--accent); background:var(--accent-soft); }
.social-tell-row.team-neutral { border-left-color:var(--yellow); background:var(--yellow-soft); }
.social-tell-row.team-town { border-left-color:var(--primary); background:var(--primary-soft); }
.social-tell-row img { width:32px; height:32px; border-radius:50%; }
.social-tell-role { font-size:0.74rem; font-weight:800; color:var(--gray); text-transform:uppercase; letter-spacing:0.6px; }
.social-tell-quote { font-size:0.9rem; color:var(--text); font-style:italic; margin-top:2px; }
.social-accuse-row { display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px dashed rgba(15,23,42,0.14); font-size:0.86rem; flex-wrap:wrap; }
.social-accuse-who { font-weight:800; color:var(--ink); }
.social-accuse-arrow { color:var(--gray); }
.social-accuse-to { font-weight:800; color:var(--gray); }
.social-accuse-verdict { font-size:0.7rem; font-weight:900; text-transform:uppercase; letter-spacing:0.6px; padding:2px 8px; border-radius:999px; }
.social-accuse-verdict.right { background:#dcfce7;color: #047857; }
.social-accuse-verdict.wrong { background:var(--accent-soft); color:var(--accent-dark); }
.social-report-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
.social-report-actions .btn-action { padding:8px 12px; font-size:0.82rem; }
/* hidden roles on a phone */
.guest-social { margin-top:14px; }
.guest-social-head { display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; font-size:0.7rem; font-weight:900; letter-spacing:1px; text-transform:uppercase; color:var(--primary-dark); }
.guest-social-list { display:grid; gap:8px; margin-top:10px; }
.guest-social-char { display:flex; gap:10px; align-items:flex-start; text-align:left; background:#f8fafc; border:2px solid rgba(148,163,184,0.35); border-radius:14px; padding:10px; font-family:inherit; color:var(--text); cursor:pointer; }
.guest-social-char img { width:38px; height:38px; border-radius:50%; flex:0 0 auto; }
.guest-social-body { display:flex; flex-direction:column; gap:3px; min-width:0; }
.guest-social-name { font-weight:900; font-size:0.92rem; color:var(--ink); }
.guest-social-role { font-size:0.7rem; font-weight:900; text-transform:uppercase; letter-spacing:0.6px; color:var(--yellow-dark); }
.guest-social-line { font-size:0.84rem; line-height:1.45; color:var(--gray); }
.guest-social-votes { margin-left:auto; font-size:0.74rem; font-weight:900; color:var(--yellow-dark); flex:0 0 auto; }
.guest-social-char.picked { border-color:#22d3ee; background:rgba(34,211,238,0.14); }
.guest-social-char.revealed { cursor:default; }
.guest-social-char.revealed.team-mafia, .guest-social-char.revealed.team-wolves { border-color:#ef4444; background:rgba(239,68,68,0.14); }
.guest-social-char.revealed.team-town { border-color:var(--primary); background:rgba(16,185,129,0.12); }
.guest-social-char.revealed.team-neutral { border-color:var(--yellow); background:rgba(245,158,11,0.12); }
.guest-social-sent { margin-top:10px; font-size:0.84rem; color:var(--text); line-height:1.5; }
.guest-social-sent strong { color:var(--ink); }

/* ============================================================
   GAME GUIDE MODAL
   ============================================================ */
.guide-card { width:min(1000px, 96vw); height:auto; max-height:86dvh; }
.guide-body { display:grid; grid-template-columns:minmax(190px, 250px) 1fr; min-height:0; flex:1; overflow:hidden; }
.guide-rail { display:flex; flex-direction:column; gap:6px; padding:14px; overflow-y:auto; background:#f8fafc; border-right:1px solid rgba(15,23,42,0.10); }
.guide-tab { text-align:left; border:1px solid transparent; background:#f1f5f9; border-radius:10px; padding:10px 12px; font-family:inherit; font-weight:800; font-size:0.86rem; color:var(--gray); cursor:pointer; min-height:42px; }
.guide-tab:hover { border-color:var(--secondary); }
.guide-tab.on { border-color:var(--purple); background:var(--primary-soft); color:var(--purple-ink); }
.guide-main { padding:18px 22px; overflow-y:auto; }
.guide-hero { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
.guide-emoji { font-size:2.6rem; line-height:1; }
.guide-hero h3 { margin:0; font-size:1.4rem; font-weight:900; color:var(--ink); }
.guide-hero p { margin:2px 0 0; color:var(--gray); font-weight:700; }
.guide-block { margin-bottom:16px; }
.guide-block h4 { margin:0 0 6px; font-size:0.78rem; font-weight:900; letter-spacing:1.2px; text-transform:uppercase; color:var(--gray); }
.guide-block p, .guide-block li { font-size:0.95rem; line-height:1.6; color:var(--gray); }
.guide-block ol, .guide-block ul { margin:0; padding-left:20px; }

@media (max-width: 1024px) {
    .social-stage { grid-template-columns:1fr; }
    .social-rail { max-height:none; grid-template-columns:repeat(auto-fill, minmax(76px, 1fr)); }
}
/* ---- modal shell: power-ups, character voices, the score sheet ----
   Glass on the dark arena: deep navy, neon hairline, blur behind. */
.pm-modal-overlay { position:fixed; inset:0; background:rgba(2,6,23,0.62); backdrop-filter:blur(6px); display:none; align-items:center; justify-content:center; z-index:12000; padding:16px; }
.pm-modal-box { background: linear-gradient(180deg, #ffffff, #f8fafc); border:1px solid rgba(139,92,246,0.28); border-radius:18px; box-shadow:0 40px 90px -20px rgba(2,6,23,0.9), 0 0 40px rgba(139,92,246,0.12); color:var(--text); width:min(780px, 96vw); max-height:90dvh; display:flex; flex-direction:column; gap:14px; padding:18px 20px; overflow:auto; }
.pm-modal-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.pm-modal-sub { margin:4px 0 0; color:var(--gray); font-size:0.85rem; font-weight:600; }
.pm-modal-x { background:#f1f5f9; border:1px solid rgba(15,23,42,0.14); border-radius:10px; width:34px; height:34px; font-size:1rem; cursor:pointer; font-weight:800; color:var(--text); flex:0 0 auto; }
.pm-modal-x:hover { background:rgba(15,23,42,0.16); }
.pm-modal-foot { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; border-top:1px solid rgba(15,23,42,0.10); padding-top:12px; }
.pm-modal-count { font-family:monospace; font-size:0.8rem; color:var(--gray); font-weight:700; }
#powerup-picker { max-height:44dvh; overflow-y:auto; }

/* ---- the settings sheet ---- */
.pm-settings-box { width: min(660px, 96vw); gap: 0; }
.pm-set-group { border-top: 1px solid rgba(15,23,42,0.10); padding: 14px 0; }
.pm-set-group:first-of-type { border-top: 0; padding-top: 0; }
.pm-set-title { font-family: var(--font-display); font-weight: 800; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gray); margin-bottom: 8px; }
.pm-set-row { display: flex; gap: 8px; flex-wrap: wrap; }
.pm-set-row .btn-action { flex: 1 1 220px; justify-content: flex-start; text-align: left; padding: 12px 14px; min-height: 46px; }
.pm-set-label { display: block; font-weight: 800; font-size: 0.86rem; color: var(--ink); margin: 12px 0 4px; }
.pm-settings-box select.voice-select { width: 100%; max-width: none; }

/* ---- floating score pops ---- */
.pm-pop-layer { position:fixed; inset:0; pointer-events:none; z-index:11500; overflow:hidden; }
.pm-score-pop { position:absolute; font-weight:900; font-size:1.5rem; padding:6px 14px; border-radius:999px; color:#fff; box-shadow:0 10px 24px rgba(15,23,42,0.25); animation:pmPop 1.6s ease-out forwards; white-space:nowrap; }
.pm-score-pop.good { background:linear-gradient(135deg,var(--primary),#059669); }
.pm-score-pop.bad { background:linear-gradient(135deg,#ef4444,#b91c1c); }
.pm-score-pop.info { background:linear-gradient(135deg,#6366f1,#4338ca); }
@keyframes pmPop { 0%{opacity:0; transform:translateY(14px) scale(0.8);} 18%{opacity:1; transform:translateY(0) scale(1.06);} 70%{opacity:1;} 100%{opacity:0; transform:translateY(-46px) scale(0.96);} }

/* ---- leaderboard reordering ---- */
.player-card { position:relative; }
.player-card.pm-moved { z-index:2; }
.player-card.pm-rank-up { animation:pmRankUp 0.9s ease-out; }
@keyframes pmRankUp { 0%{box-shadow:0 0 0 3px rgba(16,185,129,0.75);} 100%{box-shadow:none;} }
.pm-score-bump { animation:pmBump 0.7s ease-out; }
@keyframes pmBump { 0%{transform:scale(1);} 40%{transform:scale(1.22); color:#059669;} 100%{transform:scale(1);} }

/* ---- who is holding what (always visible on a projector) ---- */
.pm-holdings { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.pm-hold-chip { display:flex; align-items:center; gap:4px; background:#f1f5f9; border:1px solid rgba(15,23,42,0.14); border-radius:999px; padding:2px 8px; font-size:0.72rem; font-weight:800; color:var(--text); }
.pm-hold-chip img { width:16px; height:16px; border-radius:50%; object-fit:cover; }
.pm-hold-chip .pm-hold-name { max-width:96px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* ---- colour-coded mini lesson ---- */
.fb-mini { display:grid; gap:8px; margin-top:10px; }
.fb-block { border-radius:12px; padding:10px 12px; font-size:0.95rem; line-height:1.45; border-left:6px solid transparent; }
.fb-block .fb-tag { display:block; font-size:0.7rem; font-weight:900; letter-spacing:0.08em; text-transform:uppercase; opacity:0.85; margin-bottom:2px; }
.fb-correct { background:var(--primary-soft); border-left-color:var(--primary); color:#065f46; }
.fb-wrong { background:var(--accent-soft); border-left-color:#ef4444; color:#7f1d1d; }
.fb-rule { background:#eff6ff; border-left-color:#3b82f6; color:#1e3a8a; }
.fb-vocab { background:var(--yellow-soft); border-left-color:var(--yellow); color:#78350f; }
.fb-speak { background:#f5f3ff; border-left-color:#8b5cf6; color:#4c1d95; }
.fb-media { display:flex; flex-wrap:wrap; gap:10px; margin-top:8px; }
.fb-media figure { margin:0; max-width:260px; }
.fb-media img { width:100%; border-radius:10px; border:1px solid var(--gray-light); }
.fb-media figcaption { font-size:0.72rem; color:var(--gray); font-weight:700; margin-top:4px; }
.fb-media iframe { width:280px; height:158px; border:0; border-radius:10px; }
.fb-steps { margin:6px 0 0; padding-left:20px; }
.fb-steps li { margin:2px 0; }

/* ---- score sheet / end-of-game report ---- */
.pm-sheet { width:100%; border-collapse:collapse; font-size:0.85rem; }
.pm-sheet th, .pm-sheet td { border-bottom:1px solid rgba(15,23,42,0.10); padding:6px 8px; text-align:left; }
.pm-sheet th { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--gray); }
.pm-sheet td.ok { color:#047857; font-weight:800; }
.pm-sheet td.miss { color:#b91c1c; font-weight:800; }
.pm-sheet .pm-cell { font-weight:900; font-family:monospace; }
/* The report is long now (plan + two tables) — scroll the body, not the box, so
   the one-tap follow-ups in the footer stay on screen while the class reads. */
#report-body { max-height:56dvh; overflow-y:auto; }
/* teaching plan — the part of the report a tutor acts on */
.pm-plan { border:1px solid rgba(139,92,246,0.35); background:linear-gradient(180deg, #f5f3ff, #ede9fe); border-radius:16px; padding:12px 14px; margin-bottom:6px; }
.pm-plan-stats { display:flex; flex-wrap:wrap; gap:6px 18px; font-family:monospace; font-size:0.78rem; color:var(--gray); }
.pm-plan-stats strong { color:#1e1b4b; font-size:0.95rem; }
.pm-plan-head { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin:10px 0 6px; }
.pm-plan-flag { background:#1e1b4b; color:#fff; font-size:0.68rem; font-weight:900; letter-spacing:0.06em; padding:3px 9px; border-radius:999px; }
.pm-plan-weak { font-weight:900; color:#b91c1c; font-size:1.05rem; }
.pm-plan-why { color:var(--gray); font-size:0.8rem; font-weight:600; }
.pm-plan-section { margin-top:12px; }
.pm-plan-title { font-size:0.72rem; font-weight:900; letter-spacing:0.08em; color:#4338ca; margin-bottom:4px; }
.pm-plan tr.weak td { background:#fff7ed; }
.pm-plan .pm-plan-missed { font-size:0.74rem; color:var(--gray); margin-top:2px; line-height:1.4; }
.pm-plan-bar { display:inline-block; width:52px; height:7px; background:rgba(15,23,42,0.12); border-radius:999px; overflow:hidden; vertical-align:middle; margin-left:6px; }
.pm-plan-bar > span { display:block; height:100%; border-radius:999px; }
.pm-plan-btn { border:none; border-radius:9px; padding:5px 9px; font-size:0.74rem; font-weight:800; cursor:pointer; margin-right:4px; color:#fff; }
.pm-plan-btn.purple { background:#7c3aed; }
.pm-plan-btn.blue { background:#2563eb; }
.pm-plan-btn.gray { background:#475569; }
.pm-plan-btn:hover { filter:brightness(1.12); }
.pm-plan-detail { display:none; margin-top:10px; }
.pm-plan-script { white-space:pre-wrap; font-family:inherit; font-size:0.85rem; line-height:1.55; color:var(--text); background:#f8fafc; border:1px dashed rgba(15,23,42,0.20); border-radius:12px; padding:10px 12px; margin:0; max-height:34dvh; overflow-y:auto; }

.pm-rank { display:inline-flex; width:20px; height:20px; border-radius:6px; align-items:center; justify-content:center; font-size:0.7rem; font-weight:900; font-family:monospace; background:#eef2ff; color:#4338ca; }

/* ---- character voices + the room ---- */
.pm-voice-row { display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid rgba(15,23,42,0.10); }
.pm-voice-row img { width:32px; height:32px; border-radius:50%; object-fit:cover; }
.pm-voice-row .pm-voice-name { flex:1; font-weight:800; font-size:0.9rem; }
.pm-voice-row select { max-width:230px; padding:6px 8px; border:1px solid rgba(15,23,42,0.16); border-radius:8px; font-size:0.8rem; background:#f8fafc; color:var(--ink); }
.pm-room-code { font-family:monospace; font-size:2rem; font-weight:900; letter-spacing:0.3em; color:var(--primary-dark);background: var(--primary-soft); border:1px dashed rgba(139,92,246,0.5); border-radius:12px; padding:6px 10px; text-align:center; text-shadow: 0 0 18px rgba(139,92,246,0.5); }
.pm-room-row { display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid var(--gray-light); }
.pm-room-row img { width:30px; height:30px; border-radius:50%; object-fit:cover; }
.pm-room-row .pm-room-name { flex:1; font-weight:800; }
.pm-room-row .pm-room-meta { font-size:0.72rem; color:var(--gray); font-weight:700; }
.pm-spread { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
.pm-spread div { font-size:0.75rem; font-weight:800; background:rgba(15,23,42,0.10); color:var(--text); border-radius:8px; padding:4px 8px; }

/* A student's phone. Deliberately dark, big tap targets, no game chrome. */
#guest-view { display:none; position:fixed; inset:0; z-index:11000; overflow-y:auto; background:linear-gradient(160deg,#ffffff,#eef1f8); color:var(--ink); font-family:system-ui,-apple-system,sans-serif; padding:18px; padding-bottom:calc(18px + env(safe-area-inset-bottom)); }
#guest-view .guest-shell { max-width:520px; margin:0 auto; }
#guest-view .guest-head { text-align:center; margin-bottom:14px; }
#guest-view .guest-emoji { font-size:2rem; }
#guest-view .guest-title { font-weight:900; letter-spacing:0.08em; }
#guest-view .guest-status { font-size:0.85rem; color:var(--gray); font-weight:700; margin-top:2px; }
#guest-view .guest-card { background:#ffffff; border:1px solid var(--line); border-radius:18px; padding:16px; box-shadow:var(--shadow-sm); }
#guest-view .guest-label { display:block; font-size:0.72rem; font-weight:800; letter-spacing:0.1em; color:var(--gray); margin:8px 0 4px; }
#guest-view .guest-code-input { width:100%; padding:12px; border-radius:12px; border:1px solid var(--line); background:#ffffff; color:var(--secondary-ink); font-family:monospace; font-size:1.5rem; letter-spacing:0.3em; text-align:center; text-transform:uppercase; }
#guest-view .guest-input { width:100%; padding:12px; border-radius:12px; border:1px solid var(--line); background:#ffffff; color:var(--ink); font-size:1rem; }
#guest-view .guest-btn { width:100%; margin-top:14px; padding:14px; border:0; border-radius:14px; background:linear-gradient(135deg,#0891b2,#2563eb); color:#ffffff; font-weight:900; font-size:1rem; cursor:pointer; }
#guest-view .guest-btn-alt { width:auto; margin:0; padding:12px 16px; background:#e2e8f0; color:var(--ink); }
#guest-view .guest-me { display:flex; align-items:center; gap:10px; background:#ffffff; border:1px solid var(--line); border-radius:14px; padding:10px; margin-bottom:12px; }
#guest-view .guest-me img { width:38px; height:38px; border-radius:50%; object-fit:cover; background:#e2e8f0; }
#guest-view .guest-myname { font-weight:900; color:var(--ink); }
#guest-view .guest-mystats { font-size:0.75rem; color:var(--gray); font-weight:700; }
#guest-view .guest-score { font-size:1.5rem; font-weight:900; color:var(--yellow-ink); }
#guest-view .guest-wait { text-align:center; padding:26px 12px; background:#ffffff; border:1px solid var(--line); border-radius:16px; font-weight:700; color:var(--text); }
#guest-view .guest-qmeta { display:flex; justify-content:space-between; font-size:0.72rem; font-weight:800; letter-spacing:0.08em; color:var(--gray); }
#guest-view .guest-qtext { font-size:1.05rem; font-weight:800; margin:8px 0 12px; line-height:1.35; color:var(--ink); }
#guest-view .guest-context { background:#f1f5f9; border-radius:12px; padding:10px; font-size:0.85rem; margin-bottom:10px; display:none; color:var(--text); }
#guest-view .guest-options { display:grid; gap:8px; }
#guest-view .guest-option { padding:14px; border-radius:14px; border:1px solid var(--line); background:#ffffff; color:var(--ink); font-weight:800; font-size:1rem; text-align:left; cursor:pointer; transition:transform .12s, background .12s; }
#guest-view .guest-option:active { transform:scale(0.98); }
#guest-view .guest-option.picked { background:linear-gradient(135deg,#0891b2,#2563eb); color:#ffffff; border-color:transparent; }
#guest-view .guest-option.right { background:linear-gradient(135deg,#059669,#047857); color:#ffffff; border-color:transparent; }
#guest-view .guest-option.wrongpick { background:linear-gradient(135deg,#dc2626,#b91c1c); color:#ffffff; border-color:transparent; }
#guest-view .guest-free { display:none; gap:8px; margin-top:10px; }
#guest-view .guest-verdict { display:none; margin-top:12px; border-radius:16px; padding:14px; background:#ffffff; border:1px solid var(--line); }
#guest-view .guest-verdict-head { font-weight:900; font-size:1.05rem; color:var(--ink); }
#guest-view .guest-verdict-body { margin-top:6px; font-size:0.88rem; line-height:1.45; color:var(--text); }
#guest-view .guest-verdict-body .fb-block { color:var(--ink); }
#guest-view .guest-board { margin-top:14px; }
#guest-view .guest-board .pm-room-row { border-bottom:1px solid var(--line); }
#guest-view .guest-board .pm-room-name { color:var(--text); }


@media (max-width: 640px) {
    .guide-card { max-height:94dvh; }
    .guide-body { grid-template-columns:1fr; }
    .guide-rail { flex-direction:row; overflow-x:auto; border-right:0; border-bottom:1px solid var(--gray-light); padding:10px; }
    .guide-tab { white-space:nowrap; }
    .social-actions .btn-action { flex:1 1 44%; }
    .social-verdict-roles { grid-template-columns:1fr; }
    /* The rail sits above the statement on a phone, and the difficulty dial wraps
       rather than scrolling sideways — both were the two things a class could not
       reach mid-round on a small screen. */
    .social-stage { grid-template-columns:1fr; }
    .social-rail { max-height:32dvh; grid-template-columns:repeat(auto-fill, minmax(72px, 1fr)); }
    .social-diff-btn { flex:1 1 28%; padding:8px 6px; }
    .social-diff-label { flex:1 1 100%; }
    .social-line { font-size:1rem; }
    .social-vote-actions .btn-action { width:100%; }
    .social-vote-chip { flex:1 1 44%; }
    .social-accuse-row { font-size:0.8rem; }
    #report-body { max-height:60dvh; }
    .pm-plan { padding:10px; }
    .pm-plan .pm-sheet th:nth-child(2), .pm-plan .pm-sheet td:nth-child(2) { display:none; }
    .pm-plan-btn { margin-bottom:4px; }
    .pm-plan-script { max-height:40dvh; }
}

/* ============================================================
   POLISH — flatter controls, softer cards, real contrast
   Appended so it wins over the shop-window styles above without
   rewriting hundreds of rules (which is how one screen drifts
   away from the others).
   ============================================================ */
.btn-action {
    text-transform: none; font-weight: 700; letter-spacing: -0.005em;
    border-radius: var(--radius); box-shadow: var(--shadow-sm);
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-action:active { transform: translateY(1px); box-shadow: none; }
.btn-gray { background: #f1f5f9; color: var(--text); font-weight: 700; font-size: 1rem; padding: 10px 16px; border: 1px solid var(--line); }
.btn-green { background: linear-gradient(135deg, #7c3aed, #5b21b6); }
.btn-blue { background: linear-gradient(135deg, #0e7490, #155e75); }
/* The laser chip is an INDICATOR, not a call to action, so it is the one button
   that must not be white-on-accent. It has to be re-declared after .btn-action
   or the white text rule wins — which is exactly how it shipped invisible: a
   white label on a pale grey chip, in the settings sheet only, because the sheet
   version sits outside .header-controls. */
.pm-btn-laser { background: #f1f5f9; color: var(--text); border: 1px solid rgba(15,23,42,0.12); }
.pm-btn-laser.laser-on { background: linear-gradient(135deg, #ff2244, #cc0000); color: #ffffff; border-color: #ff4444; }

.game-card {
    border-radius: var(--radius); border-width: 1px; border-color: var(--line);
    box-shadow: var(--shadow-sm); color: var(--ink);
}
.game-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.game-card:active { transform: translateY(0); }
.game-card.answered { background: #f8fafc; color: var(--gray); }
.game-card.lucky { border-color: var(--yellow); background: var(--yellow-soft); color: var(--yellow-dark); }

.modal { background: rgba(226,232,240,0.78); backdrop-filter: blur(6px); }
.modal-card, .pm-modal-box, .guide-card { border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); }
.modal-header, .pm-modal-head, .pm-modal-foot { border-color: rgba(15,23,42,0.10); }
.modal-timer { border-width: 1px; border-color: rgba(15,23,42,0.14); box-shadow: var(--shadow-sm); }
.q-tag { text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.72rem; }
.q-context-box { border-width: 1px; border-left: 4px solid var(--secondary); }
.options-grid { gap: 12px; }
.option-btn {
    background: #f8fafc; border: 1px solid rgba(15,23,42,0.16); color: var(--ink);
    border-width: 1px; border-radius: var(--radius);
    box-shadow: 0 10px 24px -12px rgba(2,6,23,0.7); font-weight: 700; font-size: 1.15rem;
}
.option-btn:hover { transform: translateY(-1px); border-color: var(--secondary); background: rgba(6,182,214,0.10); box-shadow: 0 12px 28px -12px rgba(34,211,238,0.35); }
.option-btn:active { transform: translateY(0); }
.option-btn.disabled { opacity: 0.4; }
.pu-slot { text-transform: none; letter-spacing: 0; border-width: 1px; border-color: rgba(15,23,42,0.18); }
.pu-slot.filled { border-width: 1px; box-shadow: var(--shadow-sm); }
.mode-card.premium-card { box-shadow: var(--shadow-sm); }
.social-line-card { border-width: 1px; border-color: var(--line); box-shadow: var(--shadow-md); }
.player-card { border-radius: var(--radius); }

/* ============================================================
   FLASHCARDS — the card fills the frame
   ------------------------------------------------------------
   Everything inside a card face is sized in em of the face's own font-size,
   and the script sets that font-size to the largest value the content still
   fits into. That is what makes the choices big on a projector and still inside
   a short laptop card: the type scales to the space, instead of a fixed size
   having to fit every question. A long question therefore comes out slightly
   smaller and a short one comes out larger — never clipped either way.
   ============================================================ */
.practice-card .face { font-size: 18px; gap: 0.4em; padding: clamp(14px, 2vw, 2em); }
.practice-card .p-question { font-size: 2.05em; line-height: 1.22; margin: 0.1em 0 0.15em; }
.practice-card .p-answer { font-size: 2.15em; line-height: 1.2; margin-bottom: 0.35em; padding-bottom: 0.3em; }
.practice-card .prac-options-grid { gap: 0.55em; }
.practice-card .prac-options-grid.one-col { grid-template-columns: 1fr; }
.practice-card .prac-opt-btn { font-size: 1.35em; line-height: 1.25; padding: 0.65em 0.85em; min-height: 2.7em; display: flex; align-items: center; justify-content: center; }
.practice-card .p-hint, .practice-card .p-deep, .practice-card .p-ccq { font-size: 0.95em; }
.practice-card .q-context-box { font-size: 1em !important; max-height: none; }
.practice-card .q-tag { font-size: 0.68em; }
.practice-card .fb-block { font-size: 1em; }
.practice-card .fb-block .fb-tag { font-size: 0.72em; }
.practice-card .fb-block h4 { font-size: 1.02em; margin: 0 0 0.2em; }
.practice-card .fb-block ul { margin: 0.3em 0 0; padding-left: 1.2em; }
.practice-card .fb-media img { max-height: 8em; width: auto; }
.practice-card .btn-action { font-size: 0.9em; padding: 0.55em 1em; }

/* ============================================================
   SPYFALL + ALIBI — long, spoken text that has to stay readable
   Both games are a cast talking: statements run to fifty words and alibis to
   eighty. They are read aloud AND shown, in a panel that scrolls and whose type
   is fitted to the space, so a class reads it from the back while hearing the
   character's own voice.
   ============================================================ */
/* ============================================================
   THE TWO TALKING GAMES — Spyfall and Alibi
   Every other split-screen game puts a 250px control strip beside a wide stage.
   These two are the opposite: the wide thing is the spoken line (a statement of
   forty words, an alibi of eighty) and the cast is a row of faces. On a projector
   width is cheap and height is expensive, so both read across the screen — faces
   on top, one fitted panel underneath. The old layout put an eighty-word alibi in
   a 250px column, which is exactly why it came out at 12px and still overflowed.
   ============================================================ */
.talk-view { padding: 12px; background: transparent; }
.talk-layout { display: flex; flex-direction: column; gap: 10px; height: 100%; min-height: 0; }
.talk-head { display: flex; align-items: center; gap: 10px 16px; flex-wrap: wrap; flex: 0 0 auto; }
.talk-titles { flex: 0 0 auto; }
.talk-titles h1 { margin: 0; font-size: clamp(1.1rem, 2.1vw, 1.6rem); }
.talk-titles p { margin: 2px 0 0; font-size: 0.88rem; color: var(--gray); font-weight: 600; }
.talk-status { margin-left: auto; flex: 0 0 auto; font-weight: 800; color: var(--game-ink, var(--primary-dark)); font-size: clamp(0.95rem, 1.1vw, 1.1rem); }
.talk-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.talk-rail { flex: 0 0 auto; }
.talk-rail .spy-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; width: 100%; max-width: 100%; margin: 0; }
.talk-rail .spy-card { min-height: 0; padding: 8px 4px; }
.talk-rail .spy-card .spy-avatar { width: 60px; height: 60px; }
.suspects-rail { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; align-items: stretch; }
.talk-stage { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 8px; }
.talk-stage .spy-statement, .talk-stage .alibi-statement { flex: 1 1 auto; min-height: 96px; max-height: none; }
.talk-actions { flex: 0 0 auto; justify-content: center; margin-left: 0; }

@media (max-width: 900px) {
    .talk-rail .spy-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .talk-actions { margin-left: 0; }
    .suspects-rail .alibi-suspect { width: min(120px, 30vw); }
}
/* On a phone the overlay scrolls, so the layout stops pretending to be one screen
   and the spoken panel is given a real share of the viewport instead of 4em. */
@media (max-width: 767px) {
    .talk-layout { height: auto; }
    .talk-titles p { font-size: 0.82rem; }
    .talk-stage .spy-statement, .talk-stage .alibi-statement { min-height: 30dvh; }
}

/* The spoken panel is the game, so its type is fitted to it (see fitGamePanels).
   A fixed min-height in em would grow with the font size it is measuring, so the
   floor is a real height instead. */
.spy-statement, .alibi-statement {
    width: 100%; text-align: left; background: linear-gradient(180deg, #ffffff, #f8fafc); color: var(--ink);
    border: 1px solid rgba(15,23,42,0.12); border-left: 5px solid var(--game, var(--secondary));
    border-radius: var(--radius); padding: 12px 16px; line-height: 1.5;
    font-size: 1.05rem; overflow-y: auto; flex: 1 1 auto; min-height: 96px;
    max-height: 40dvh; box-shadow: 0 18px 40px -16px rgba(2,6,23,0.7);
}
.spy-speaker, .alibi-speaker {
    display: flex; align-items: center; gap: 10px; width: 100%;
    font-weight: 800; color: var(--ink); margin: 10px 0 4px; flex-wrap: wrap;
}
.spy-speaker img, .alibi-speaker img { width: 40px; height: 40px; border-radius: 50%; background: rgba(15,23,42,0.10); }
.spy-speaker .spy-speaker-name, .alibi-speaker .alibi-speaker-name { font-size: 1.05em; }
.spy-card { border-width: 1px; border-color: rgba(15,23,42,0.12); background: #ffffff; box-shadow: 0 14px 30px -18px rgba(15,23,42,0.3); }
.spy-card .spy-name { color: var(--ink); }
.spy-card.speaking { border-color: var(--secondary); box-shadow: 0 0 0 3px rgba(34,211,238,0.25), 0 0 24px rgba(34,211,238,0.2); }
.spy-card .spy-avatar { width: 72px; height: 72px; border-width: 1px; border-color: rgba(15,23,42,0.18); background: #e2e8f0; }
.spy-card .spy-name { color: var(--ink); font-weight: 800; font-size: 0.95rem; text-align: center; line-height: 1.15; }
.spy-accuse-btn, .alibi-accuse-btn {
    margin-top: 8px; border: 0; border-radius: 9px; padding: 7px 12px; cursor: pointer;
    background: var(--accent); color: #fff; font-weight: 800; font-size: 0.78rem; letter-spacing: 0.04em;
}
.spy-accuse-btn:hover, .alibi-accuse-btn:hover { filter: brightness(1.08); }
.alibi-suspect {
    display: flex; flex-direction: column; align-items: center; cursor: pointer;
    width: min(150px, 26vw); padding: 10px; border-radius: var(--radius);
    border: 1px solid var(--line); background: #f1f5f9; box-shadow: var(--shadow-sm);
}
.alibi-suspect img { width: 72px; height: 72px; border-radius: 50%; margin-bottom: 6px; background: rgba(15,23,42,0.10); }
.alibi-suspect.selected { border-color: var(--game); box-shadow: 0 0 0 3px var(--game-soft); }
.alibi-suspect .alibi-suspect-name { font-weight: 800; color: var(--ink); text-align: center; font-size: 0.95rem; line-height: 1.15; }

/* KEEP TALKING — the countdown is the drama; it glows. */
.bomb-timer {
    font-family: var(--font-mono); font-size: clamp(2.6rem, 9vh, 5.5rem); font-weight: 800;
    color: #b91c1c; background: #f8fafc;
    padding: 6px 32px; border-radius: var(--radius-lg); border: 2px solid var(--game, var(--accent));
    text-shadow: 0 0 26px rgba(236,72,153,0.55);
    transition: transform .2s;
}
.bomb-task-card {
    background: linear-gradient(180deg, #ffffff, #f8fafc); border: 1px solid var(--game, var(--accent)); border-radius: var(--radius-lg);
    padding: clamp(14px, 3vh, 32px); width: min(780px, 94%); flex: 1 1 auto; min-height: 140px; max-height: 46dvh;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    text-align: center; position: relative; overflow: hidden; box-shadow: 0 20px 50px -18px rgba(2,6,23,0.8), 0 0 40px color-mix(in srgb, var(--game, var(--accent)) 22%, transparent);
    transition: transform .2s;
}
.bomb-task-card h2 { color: var(--gray); }
#bomb-task-text { font-size: 1em; font-weight: 800; color: var(--ink); margin: 0; line-height: 1.35; }
.bomb-stripe { position: absolute; top: 0; left: 0; width: 100%; height: 8px; background: repeating-linear-gradient(45deg, var(--yellow), var(--yellow) 10px, #0f172a 10px, #0f172a 20px); }
.bomb-meter { width: min(780px, 94%); background: #f8fafc; border: 1px solid rgba(15,23,42,0.12); border-radius: var(--radius); padding: 10px 16px; }
.bomb-meter-head { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.85rem; color: var(--gray); margin-bottom: 8px; }
#bomb-status { color: #047857; font-weight: 800; }
.bomb-meter-track { width: 100%; height: 16px; background: rgba(15,23,42,0.10); border-radius: 999px; overflow: hidden; }
#volume-meter { width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--yellow), var(--accent)); transition: width .1s; }

/* ============================================================
   THE BRIEF + THE BIG READER
   ------------------------------------------------------------
   Three games hang on a paragraph the whole room has to be able to read: the
   Alibi situation, the Spyfall location, the hidden-role scene. Each of those
   used to be a 12px line wedged into the corner of a header, which is the one
   place nobody reads from the back row. A brief is now a labelled card on the
   same white surface as everything else, with the same two controls in the same
   place in every game — and the big reader opens that text as large as the frame
   allows, in the voice of whoever the text belongs to.
   ============================================================ */
.pm-brief-tools { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; flex: 0 0 auto; }
/* Anything that opens the big reader says so with the cursor, and every one of
   them is a surface the tutor can already see — no extra chrome. */
.pm-tappable { cursor: zoom-in; }

/* ============================================================
   POWER-UPS BELONG TO THE GRID ARENA
   ------------------------------------------------------------
   Lucky cards are only ever hidden inside the 8×8 board, so every power-up
   affordance — the toolbar chip, the held-cards row, the active-effects box and
   the current team's inventory — is hidden unless the Grid Arena is the game on
   screen. The is-grid class on the app container is set by launchGame. */
body:not(.is-grid) .pm-grid-only,
body:not(.is-grid) #pm-powerups-btn,
body:not(.is-grid) #active-effects-box { display: none !important; }

/* Pictionary's prompt card. The statement is masked with a redaction shadow
   rather than hidden, so the drawer can see there IS something to reveal. */
.pic-prompt {
    margin-bottom: 16px; width: 100%; max-width: 900px; text-align: left;
    background: var(--game-soft); border: 2px solid var(--game);
    border-radius: var(--radius); padding: 12px 16px;
}
.pic-prompt-label { font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 800; color: var(--game-ink); }
.pic-prompt-text { margin: 4px 0 10px; font-size: clamp(1.05rem, 1.5vw, 1.4rem); font-weight: 800; line-height: 1.4; color: #0f172a; }
.pic-prompt-text.masked { color: transparent; text-shadow: 0 0 16px rgba(15, 23, 42, 0.85); user-select: none; }
/* Only shown when the lesson handed the game a bare word rather than a scene: see
   pmDrawIsScene. A word round still has to produce speech, or the drawing is all
   that happens and the language practice walks out of the room. */
.pic-say-hint { margin: 0 0 10px; font-size: 0.95rem; font-weight: 700; line-height: 1.45; color: var(--gray); max-width: 62ch; }
.pm-brief-tools .btn-action { padding: 8px 12px; font-size: 0.86rem; }

.pm-reader {
    position: fixed; inset: 0; z-index: 10060; display: none;
    align-items: center; justify-content: center;
    padding: clamp(8px, 2.4vh, 36px); background: rgba(226,232,240,0.78); backdrop-filter: blur(6px);
}
.pm-reader.open { display: flex; }
.pm-reader-card {
    background: #ffffff; border: 1px solid rgba(124,58,237,0.28);
    border-radius: var(--radius-lg);
    width: min(1500px, 97vw); height: min(93dvh, 1000px);
    display: flex; flex-direction: column;
    padding: clamp(12px, 2.2vh, 26px); box-shadow: var(--shadow-lg);
}
.pm-reader-head {
    display: flex; align-items: center; gap: 10px 14px; flex-wrap: wrap; flex: 0 0 auto;
    border-bottom: 1px solid var(--line); padding-bottom: 10px; margin-bottom: 12px;
}
.pm-reader-titles { flex: 1 1 260px; min-width: 0; }
.pm-reader-kicker { font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 800; color: var(--gray); }
.pm-reader-title { font-family: var(--font-display); font-size: clamp(1.05rem, 2vw, 1.6rem); font-weight: 800; color: var(--ink); }
.pm-reader-tools { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.pm-reader-body {
    flex: 1 1 auto; min-height: 0; overflow-y: auto; text-align: left; padding: 2px;
    color: var(--ink); font-weight: 600; line-height: 1.45; white-space: pre-wrap;
}
@media (max-width: 767px) {
    .pm-brief-tools { margin-left: 0; width: 100%; }
    .pm-brief-tools .btn-action { flex: 1 1 44%; }
    .pm-reader-tools { margin-left: 0; width: 100%; }
    .pm-reader-tools .btn-action { flex: 1 1 44%; }
}

/* ---- projector QR (Play on phones, big enough to scan from the back row) ---- */
.pm-qr-box { background: #fff; border-radius: 20px; padding: 18px; text-align: center; border: 1px solid rgba(15,23,42,0.16); box-shadow: 0 0 40px rgba(139,92,246,0.25); }
.pm-qr-box img { width: min(68vw, 420px); height: auto; aspect-ratio: 1 / 1; border-radius: 12px; }
.pm-qr-code { font-family: var(--font-mono); font-size: clamp(1.5rem, 5.5vw, 2.8rem); font-weight: 700; letter-spacing: 0.3em; color: var(--navy); margin-top: 6px; }
.pm-qr-link { font-family: var(--font-mono); font-size: 0.82rem; color: #475569; word-break: break-all; margin-top: 6px; }
.pm-qr-hint { font-size: 0.8rem; color: var(--gray); font-weight: 600; margin-top: 8px; }

/* ============================================================
   RESPONSIVE — NARROW DESKTOP (1025–1400px)
   The toolbar wraps to a second line instead of squeezing eight
   controls into one 70px row and clipping the last of them; the
   sidebar gives back a little width to the board.
   768–1024px keeps the stacked layout defined further up.
   ============================================================ */
@media (min-width: 1025px) and (max-width: 1400px) {
    .app-container { grid-template-columns: 280px 1fr; }
    .header { padding: 8px 14px; row-gap: 6px; }
    .logo { font-size: 1.1rem; }
    .header-controls { justify-content: flex-start; }
    .header-controls .btn-action { font-size: 0.8rem; padding: 7px 10px; }
    select.voice-select { max-width: 150px; }
    .active-player-avatar { width: 88px; height: 88px; }
}

/* ============================================================
   RESPONSIVE — PHONE (≤767px): a dedicated layout
   A phone is not a small laptop. The header keeps only the brand,
   the clock and a menu button; the roster becomes a horizontal
   strip; the board stays square and fits without scrolling; and
   the question card is a full-height sheet rather than a dialog
   floating in a 3-panel layout that no longer exists.
   ============================================================ */
@media (max-width: 767px) {
    :root { --radius: 10px; --radius-lg: 14px; }

    /* --- header: brand · clock · ☰ --- */
    .header {
        position: sticky; top: 0; z-index: 90;
        flex-wrap: nowrap; align-items: center; gap: 8px;
        padding: 8px 12px; min-height: 58px;
    }
    .logo { font-size: 1rem; gap: 7px; flex: 0 0 auto; }
    .header .game-stats { margin-left: auto; gap: 8px; }
    .stat-item { padding: 4px 10px; font-size: 0.85rem; }
    /* One button left in the bar — the settings sheet — so it is a 46px target. */
    .header-controls .btn-action { padding: 11px 14px; min-height: 46px; font-size: 0.88rem; }

    /* --- roster + leaderboard: a strip, not half the screen --- */
    .app-container { grid-template-columns: 1fr; grid-template-rows: auto auto minmax(0, 1fr); }
    .sidebar {
        padding: 10px 12px; border-right: 0; border-bottom: 1px solid var(--line);
        max-height: 34dvh; overflow-y: auto;
    }
    .active-player-display { flex-direction: row; gap: 10px; text-align: left; margin: 0 0 8px; padding-bottom: 8px; }
    .active-player-avatar { width: 44px; height: 44px; border-width: 2px; margin: 0; }
    .active-player-name { font-size: 1rem; }
    #leaderboard-list { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .player-card { min-width: 152px; flex: 0 0 auto; margin: 0; }
    .active-effects-box { margin-top: 8px; }
    .pm-holdings { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }

    /* --- the board itself: square, fitted, still tappable --- */
    .game-area { padding: 8px; min-height: 0; height: auto; }
    .grid-wrapper {
        height: auto; width: 100%; max-width: min(100%, 94dvh);
        aspect-ratio: 1 / 1; margin: 0 auto; gap: clamp(2px, 1vw, 8px);
    }
    .game-card { font-size: clamp(0.62rem, 4.2vw, 1.15rem); border-radius: 8px; }

    /* --- screens --- */
    .screen { padding: 14px 12px calc(18px + env(safe-area-inset-bottom)); }
    .screen h1 { font-size: 1.5rem; }
    .mode-grid { grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 10px; }
    .mode-card { padding: 14px 10px; }
    .mode-card.premium-card span { font-size: 0.92rem; }
    .mode-art svg { width: clamp(34px, 10vw, 46px); height: clamp(34px, 10vw, 46px); }
    #setup-list { max-width: 100%; }

    /* --- cards + questions become full-height sheets --- */
    .modal { padding: 0; align-items: stretch; }
    .modal-card { width: 100%; height: 100dvh; max-height: none; border-radius: 0; }
    .modal-header { padding: 10px 12px; gap: 8px; }
    .modal-header-left, .modal-header-right { gap: 8px; }
    .modal-body { padding: 16px 14px; gap: 14px; }
    .modal-footer { padding: 12px; }
    .q-content { font-size: 1.3rem !important; }
    .options-grid { grid-template-columns: 1fr !important; gap: 10px; }
    .option-btn { font-size: 1rem; min-height: 60px; padding: 14px; }
    .action-row .btn-action, .modal-footer .btn-action { flex: 1 1 46%; }
    .pm-modal-box { max-height: 92dvh; width: 96vw; padding: 14px; }
    .pm-modal-head, .pm-modal-foot { flex-wrap: wrap; gap: 8px; }
    .guide-card { max-height: 94dvh; }
    .special-game-overlay { padding: 10px; }
    .social-actions .btn-action { flex: 1 1 44%; }
    .social-stage { grid-template-columns: 1fr; }
    .social-rail { max-height: 30dvh; }
    .fb-media img, .fb-media iframe { max-width: 100%; }
}

/* ============================================================
   RESPONSIVE — TABLET (768–1024px)
   The bar holds three things now (brand · clock · settings), so
   a tablet does not need a collapsed toolbar at all — it just
   gets more comfortable tap targets.
   ============================================================ */
@media (min-width: 768px) and (max-width: 1024px) {
    .header { flex-wrap: nowrap; align-items: center; gap: 10px; padding: 8px 14px; min-height: 62px; }
    .header .logo { flex: 0 0 auto; }
    .header .game-stats { margin-left: auto; }
    .header-controls .btn-action { min-height: 44px; }
}

/* Short landscape phones: the header gets tighter and the roster strip goes
   away entirely, so the board keeps a usable height. */
@media (max-height: 500px) and (orientation: landscape) {
    .header { min-height: 50px; padding: 6px 10px; }
    .sidebar { max-height: 26dvh; }
    .grid-wrapper { max-width: min(100%, 78dvh); }
}

/* Touch devices keep no hover state stuck on after a tap. */
@media (hover: none) {
    .game-card:hover, .option-btn:hover, .mode-card:hover, .btn-action:hover { transform: none; }
    .game-card:active { border-color: var(--secondary); }
}
`;


export const getSetupViewHtml = (partyData: PartyModeOutput) => `
    <!-- SETUP VIEW -->
    <div id="setup-view" class="screen">
      <div class="screen-inner setup-inner">
        <!--
          The front door. What this is, and the only two things a tutor does here:
          seat the table, then Start. No game is offered on this screen — Practice
          Mode included — because the game is chosen on the next one, and a shortcut
          past the game menu was just a second front door.
        -->
        <div class="setup-hero">
            <div class="setup-hero-body">
                <div class="setup-kicker">Tutorly · Adult Dashboard</div>
                <h1>Party Mode Arena</h1>
                <p>Twelve games, one lesson. Every question, clue and scene comes from the material you are teaching today.</p>
                <div class="setup-hero-chips">
                    <span class="setup-chip"><i class="fas fa-palette"></i> 12 games</span>
                    <span class="setup-chip"><i class="fas fa-check"></i> Nothing to install</span>
                    <span class="setup-chip"><i class="fas fa-clock"></i> Ready in seconds</span>
                </div>
            </div>
            <div class="setup-hero-art" aria-hidden="true">
                <svg viewBox="0 0 168 160">
                    <rect class="art-slab" x="10" y="18" width="126" height="126" rx="30"/>
                    <g class="art-dots">
                        <circle cx="45" cy="53" r="5.5"/><circle cx="73" cy="53" r="5.5"/><circle cx="101" cy="53" r="5.5"/>
                        <circle cx="45" cy="81" r="5.5"/><circle cx="73" cy="81" r="5.5"/><circle cx="101" cy="81" r="5.5"/>
                        <circle cx="45" cy="109" r="5.5"/><circle cx="73" cy="109" r="5.5"/><circle cx="101" cy="109" r="5.5"/>
                    </g>
                    <circle class="art-badge" cx="134" cy="40" r="26"/>
                    <path class="art-star" d="M134 25l4.7 10.2 11.3.9-8.5 7.5 2.4 11.1-9.9-5.8-9.9 5.8 2.4-11.1-8.5-7.5 11.3-.9z"/>
                </svg>
            </div>
        </div>

        <div class="setup-card">
            <div class="setup-step">
                <span class="setup-step-num">1</span>
                <div>
                    <div class="setup-step-title">Who is at the table</div>
                    <div class="setup-step-sub">Teams compete; the learner at this machine is already seated.</div>
                </div>
            </div>

            <div id="setup-list" class="setup-seats"></div>

            <div class="setup-add">
                <input type="text" id="player-input" placeholder="Add a team or player name" autocomplete="off">
                <button class="btn-action btn-blue" onclick="addSetupPlayer()">Add Player</button>
                <button class="btn-action btn-green" id="add-tutor-btn" onclick="addTutorPlayer()" title="Add the tutor — name and photo come from the Adult Dashboard">
                    <i class="fas fa-chalkboard-teacher"></i> Add Tutor
                </button>
            </div>
        </div>

        <div class="setup-step setup-step-wide">
            <span class="setup-step-num">2</span>
            <div>
                <div class="setup-step-title">Start the class</div>
                <div class="setup-step-sub">Phones are optional: students join with a code and answer the same board.</div>
            </div>
        </div>

        <div class="setup-actions">
            <button class="btn-action btn-blue setup-btn" onclick="openRoom()" title="Show the code and QR students scan to join from their phone">📱 Play on phones</button>
            <button class="btn-action btn-green setup-btn setup-btn-primary" onclick="goToModeSelect()">Start</button>
        </div>
      </div>
    </div>

    <!-- POWER-UP PICKER MODAL -->
    <div id="powerup-modal" class="pm-modal-overlay">
      <div class="pm-modal-box">
        <div class="pm-modal-head">
          <div style="min-width:0;">
            <div class="pu-section-label" style="margin:0;">Power-Ups in play</div>
            <p class="pm-modal-sub" id="powerup-modal-sub">Lucky cards are hidden inside the grid. Choose the ones this class may find.</p>
          </div>
          <button class="pm-modal-x" onclick="closePowerupModal()" aria-label="Close">✕</button>
        </div>
        <div class="pu-picker" id="powerup-picker"></div>
        <div class="pu-picker-actions">
            <button class="pu-mini" onclick="setAllPowerups(true)" title="Enable every power-up">All</button>
            <button class="pu-mini" onclick="setAllPowerups(false)" title="No lucky cards — every card is a question">None</button>
            <button class="pu-mini" onclick="presetPowerups('classic')" title="The full Baamboozle set">Classic</button>
            <button class="pu-mini" onclick="presetPowerups('jr')" title="Baamboozle Classic Jr: only Gift and Baam, the two kind-to-young-learners cards">Classic Jr</button>
        </div>
        <div class="pm-modal-foot">
          <span class="pm-modal-count" id="powerup-modal-count"></span>
          <button class="btn-action btn-green" id="powerup-modal-go" onclick="confirmPowerupsAndStart()">⚡ Deal the 8×8 board</button>
        </div>
      </div>
    </div>

    <!-- THE SETTINGS SHEET — everything the old toolbar held.
         The toolbar was a row of eight chips above every game: half of them did
         nothing in the game on screen (power-ups exist only in the Grid Arena)
         and all of them cost the board a row. One sheet, three groups, opened
         from the bar. Power-ups are marked grid-only, so they are not offered in
         a game that cannot deal them. -->
    <div id="settings-modal" class="pm-modal-overlay">
      <div class="pm-modal-box pm-settings-box">
        <div class="pm-modal-head">
          <div style="min-width:0;">
            <div class="pu-section-label" style="margin:0;">Settings</div>
            <p class="pm-modal-sub" id="settings-teams">2 players at the table</p>
          </div>
          <button class="pm-modal-x" onclick="closeSettings()" aria-label="Close">✕</button>
        </div>

        <div class="pm-set-group">
          <div class="pm-set-title">The game</div>
          <div class="pm-set-row">
            <button class="btn-action btn-blue" onclick="closeSettings(); goToModeSelect();">🃏 Choose another game</button>
            <button class="btn-action btn-purple" onclick="closeSettings(); openGuide(selectedGameMode);">❓ How to play this game</button>
            <button class="btn-action btn-purple" onclick="closeSettings(); openReport();">📋 Score sheet &amp; end-of-game report</button>
          </div>
        </div>

        <div class="pm-set-group">
          <div class="pm-set-title">The room</div>
          <p class="pm-modal-sub" id="settings-room-state" style="text-align:left; margin:0 0 8px;">No room open</p>
          <div class="pm-set-row">
            <button class="btn-action btn-blue" onclick="closeSettings(); openRoom();">📱 Play on phones — code &amp; QR</button>
          </div>
        </div>

        <div class="pm-set-group pm-grid-only">
          <div class="pm-set-title">The Grid Arena</div>
          <p class="pm-modal-sub" style="text-align:left; margin:0 0 8px;">Lucky cards are hidden inside the 8×8 board — they are not used by any other game.</p>
          <div class="pm-set-row">
            <button class="btn-action btn-gray" onclick="openPowerupModal()" title="Which lucky cards are in play">⚡ Power-Ups in play <span id="settings-powerups-count">–</span></button>
          </div>
        </div>

        <div class="pm-set-group">
          <div class="pm-set-title">On every board</div>
          <div class="pm-set-row">
            <button class="btn-action btn-gray" id="auto-read-btn" onclick="toggleAutoRead()" title="Read new questions aloud automatically — off by default"><span id="auto-read-label">🔇 Auto-read off</span></button>
            <button class="btn-action pm-btn-laser" id="pm-settings-laser-btn" onclick="toggleLaser()" title="Turn the pointer into a laser for pointing at the projector"><i class="pm-laser-ico"></i><span class="pm-laser-label">Laser pointer</span></button>
          </div>
          <label class="pm-set-label" for="host-voice-select">Narrator voice</label>
          <p class="pm-modal-sub" style="text-align:left; margin:0 0 6px;">Taken from the read-aloud voice in your Lesson Settings. Characters inside a game keep their own voices.</p>
          <select id="host-voice-select" class="voice-select" onchange="updateHostVoice()">
            <option value="">Select Host Voice</option>
          </select>
        </div>

        <div class="pm-modal-foot">
          <span class="pm-modal-count"></span>
          <button class="btn-action btn-green" onclick="closeSettings()">Done</button>
        </div>
      </div>
    </div>

    <!-- CHARACTER VOICES (the Micro Lesson trick: every character sounds like themselves) -->
    <div id="voice-modal" class="pm-modal-overlay">
      <div class="pm-modal-box">
        <div class="pm-modal-head">
          <div style="min-width:0;">
            <div class="pu-section-label" style="margin:0;">Character voices</div>
            <p class="pm-modal-sub">Eight people read by one voice sound like one person. Give each character their own — the narrator keeps the read-aloud voice from your Lesson Settings.</p>
          </div>
          <button class="pm-modal-x" onclick="closeCharacterVoices()" aria-label="Close">✕</button>
        </div>
        <div id="char-voice-list"></div>
        <div class="pm-modal-foot">
          <span class="pm-modal-count" id="voice-modal-count"></span>
          <span style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-action btn-gray" onclick="autoAssignCharacterVoices()">🎲 Mix voices</button>
            <button class="btn-action btn-blue" onclick="playNarratorSample()">🔊 Hear the narrator</button>
            <button class="btn-action btn-green" onclick="closeCharacterVoices()">Done</button>
          </span>
        </div>
      </div>
    </div>

    <!-- SCORE SHEET / END-OF-GAME REPORT -->
    <div id="report-modal" class="pm-modal-overlay">
      <div class="pm-modal-box">
        <div class="pm-modal-head">
          <div style="min-width:0;">
            <div class="pu-section-label" style="margin:0;">Score sheet &amp; report</div>
            <p class="pm-modal-sub" id="report-sub">Every cell, who answered it, and exactly what the class missed.</p>
          </div>
          <button class="pm-modal-x" onclick="closeReport()" aria-label="Close">✕</button>
        </div>
        <div id="report-body"></div>
        <div class="pm-modal-foot">
          <span class="pm-modal-count" id="report-count"></span>
          <span style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-action btn-gray" onclick="copyReportText()">📋 Copy the sheet</button>
            <button class="btn-action btn-blue" onclick="copyTeachingPlan()">🎯 Copy the teaching plan</button>
            <button class="btn-action btn-purple" onclick="startReteachRound()">🔁 Re-ask what we missed</button>
            <button class="btn-action btn-green" onclick="closeReport()">Close</button>
          </span>
        </div>
      </div>
    </div>

    <!-- GUEST VIEW: what a student's phone shows when they open the share link -->
    <div id="guest-view">
      <div class="guest-shell">
        <div class="guest-head">
          <div class="guest-emoji">🎉</div>
          <div class="guest-title">PARTY MODE</div>
          <div id="guest-status" class="guest-status">Joining the room…</div>
        </div>

        <div id="guest-join-card" class="guest-card">
          <label class="guest-label">ROOM CODE</label>
          <input id="guest-code" class="guest-code-input" maxlength="5" placeholder="ABCDE" autocomplete="off">
          <label class="guest-label">YOUR NAME</label>
          <input id="guest-name" class="guest-input" maxlength="24" placeholder="Your name" autocomplete="off">
          <button class="guest-btn" onclick="joinRoomFromForm()">JOIN THE GAME</button>
        </div>

        <div id="guest-play" style="display:none;">
          <div class="guest-me">
            <!-- 1×1 transparent placeholder instead of src="": an empty src makes the
                 browser request the page itself, so every lesson opened on a laptop
                 fired one wasted request for a view nobody is looking at yet. The
                 join handler swaps in the real avatar. -->
            <img id="guest-avatar" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="">
            <div style="flex:1; min-width:0;">
              <div id="guest-myname" class="guest-myname">You</div>
              <div id="guest-mystats" class="guest-mystats">0 correct · 0 pts</div>
            </div>
            <div id="guest-score" class="guest-score">0</div>
          </div>

          <div id="guest-wait" class="guest-wait">Waiting for the tutor to open a card…</div>

          <div id="guest-question" style="display:none;">
            <div class="guest-qmeta"><span id="guest-qskill">SKILL</span><span id="guest-qtimer">30</span></div>
            <div id="guest-qtext" class="guest-qtext">…</div>
            <div id="guest-qcontext" class="guest-context"></div>
            <div id="guest-options" class="guest-options"></div>
            <div id="guest-free" class="guest-free">
              <input id="guest-free-input" class="guest-input" placeholder="Type your answer" autocomplete="off">
              <button class="guest-btn guest-btn-alt" onclick="guestSendFree()">Send</button>
            </div>
          </div>

          <div id="guest-verdict" class="guest-verdict">
            <div id="guest-verdict-head" class="guest-verdict-head">…</div>
            <div id="guest-verdict-body" class="guest-verdict-body"></div>
          </div>

          <!-- Hidden roles on a phone: hear every statement, then accuse. -->
          <div id="guest-social" class="guest-social" style="display:none;">
            <div class="guest-social-head">
              <span id="guest-social-kicker">HIDDEN ROLES</span>
              <span id="guest-social-title"></span>
            </div>
            <p id="guest-social-setting" class="guest-context"></p>
            <div id="guest-social-list" class="guest-social-list"></div>
            <div id="guest-social-sent" class="guest-social-sent"></div>
          </div>

          <div id="guest-room-board" class="guest-board"></div>
        </div>
      </div>
    </div>

    <!-- PLAY ON PHONES (room code) -->
    <div id="room-modal" class="pm-modal-overlay">
      <div class="pm-modal-box">
        <div class="pm-modal-head">
          <div style="min-width:0;">
            <div class="pu-section-label" style="margin:0;">Play on phones</div>
            <p class="pm-modal-sub">Students join with a code, answer on their own screen, and score by speed and accuracy — the board stays on your projector.</p>
          </div>
          <button class="pm-modal-x" onclick="closeRoom()" aria-label="Close">✕</button>
        </div>
        <div id="room-body"></div>
      </div>
    </div>

    <!-- PROJECTOR QR — the room code, big enough to scan from the back row.
         The room panel is a narrow dialog; on a projector the class needs the
         code on the wall, so this is a separate, full-size view of the same
         join link. -->
    <div id="room-qr-modal" class="pm-modal-overlay">
      <div class="pm-modal-box" style="max-width:760px;">
        <div class="pm-modal-head">
          <div style="min-width:0;">
            <div class="pu-section-label" style="margin:0;">Join on your phone</div>
            <p class="pm-modal-sub">Point a phone camera at the code, or open the lesson on the phone and type the room code. Answers are scored on speed and accuracy; the board stays on your projector.</p>
          </div>
          <button class="pm-modal-x" onclick="closeRoomQr()" aria-label="Close">✕</button>
        </div>
        <div id="room-qr-body"></div>
        <div class="pm-modal-foot">
          <span class="pm-modal-count" id="room-qr-count"></span>
          <span style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-action btn-gray" onclick="copyRoomCode()">📋 Copy the code</button>
            <button class="btn-action btn-green" onclick="closeRoomQr()">Done</button>
          </span>
        </div>
      </div>
    </div>
`;

export const getModeSelectViewHtml = () => `
    <!-- MODE SELECT VIEW -->
    <!-- MODE SELECT — one dark neon screen, one tile shape, four accents.
         The four groups read as "what kind of game is this":
         cyan = quiz, purple = performance, violet = roles, amber = challenge. -->
    <div id="mode-select-view" class="screen">
        <div class="screen-inner">
            <h1 style="font-family:var(--font-display); font-weight:800; margin: 0 0 clamp(10px, 2.4vh, 30px);">Select Game Environment</h1>
            <div class="mode-legend">
                <span class="mode-legend-item cat-quiz"><i></i>Quiz</span>
                <span class="mode-legend-item cat-performance"><i></i>Performance</span>
                <span class="mode-legend-item cat-roles"><i></i>Role-play</span>
                <span class="mode-legend-item cat-challenge"><i></i>Challenge</span>
            </div>
            <!-- Twelve games, one drawn mark each: a single 24px line-icon set, all
                 stroked in the tile's own accent on a tint of that same accent. The
                 mark is the game and the tint is only its kind, so the board reads as
                 one icon set instead of a dozen borrowed photographs — and it renders
                 identically offline, because there is nothing to download. -->
            <div class="mode-grid premium-grid">
                <div class="mode-card premium-card cat-quiz" onclick="launchGame('practice')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><rect x="3.2" y="6.4" width="11.4" height="14.8" rx="2.6"/><path d="M6.9 11.2h4M6.9 14.4h4"/><path d="M17.8 4.2v11.8a2.6 2.6 0 0 1-2.6 2.6h-1"/></svg></div>
                    <span class="mode-name">Practice Mode</span>
                </div>
                <div class="mode-card premium-card cat-quiz" onclick="launchGame('bamboozle')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><rect x="3.2" y="3.2" width="7.4" height="7.4" rx="2.2"/><rect x="13.4" y="3.2" width="7.4" height="7.4" rx="2.2"/><rect x="3.2" y="13.4" width="7.4" height="7.4" rx="2.2"/><rect x="13.4" y="13.4" width="7.4" height="7.4" rx="2.2"/></svg></div>
                    <span class="mode-name">The Grid Arena</span>
                </div>
                <div class="mode-card premium-card cat-performance" onclick="launchGame('pictionary')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><path d="M4.6 19.4l1.1-3.6L16.4 5.1a2.2 2.2 0 0 1 3.1 3.1L8.8 18.8z"/><path d="M13.8 7.8l3.1 3.1"/><path d="M3.6 21.4h7"/></svg></div>
                    <span class="mode-name">Pictionary</span>
                </div>
                <div class="mode-card premium-card cat-quiz" onclick="launchGame('concept')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><path d="M9.6 14.4a4.2 4.2 0 0 1 0-5.9l1.9-1.9a4.2 4.2 0 0 1 5.9 5.9l-1.2 1.2"/><path d="M14.4 9.6a4.2 4.2 0 0 1 0 5.9l-1.9 1.9a4.2 4.2 0 0 1-5.9-5.9l1.2-1.2"/></svg></div>
                    <span class="mode-name">Concept Link</span>
                </div>
                <div class="mode-card premium-card cat-challenge" onclick="launchGame('hot_seat')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><path d="M6.6 20v-6.6a2.2 2.2 0 0 1 2.2-2.2h6.4a2.2 2.2 0 0 1 2.2 2.2V20"/><path d="M6.6 15.8h10.8"/><path d="M12 3.4c1.5 1.8 3.3 2.7 3.3 4.8A3.3 3.3 0 0 1 12 11.5a3.3 3.3 0 0 1-3.3-3.3c0-2.1 1.8-3 3.3-4.8z"/></svg></div>
                    <span class="mode-name">Hot Seat</span>
                </div>
                <div class="mode-card premium-card cat-challenge" onclick="launchGame('taboo')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4"/><path d="M6.1 6.1l11.8 11.8"/></svg></div>
                    <span class="mode-name">Taboo</span>
                </div>
                <div class="mode-card premium-card cat-challenge" onclick="launchGame('alibi')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><rect x="4.4" y="3.6" width="10.4" height="16.8" rx="2.4"/><path d="M7.4 8.2h4.4M7.4 11.6h3"/><circle cx="16.4" cy="15.2" r="3.6"/><path d="M19 17.8l2.2 2.2"/></svg></div>
                    <span class="mode-name">Alibi Puzzle</span>
                </div>
                <div class="mode-card premium-card cat-performance" onclick="launchGame('bomb')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><circle cx="10.4" cy="14.4" r="6.4"/><path d="M8.2 12.2a3.4 3.4 0 0 1 2.2-2.2"/><path d="M15.2 9.6l1.8-1.8"/><path d="M18.8 4.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg></div>
                    <span class="mode-name">Keep Talking</span>
                </div>
                <div class="mode-card premium-card cat-roles" onclick="launchGame('sentiment')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><path d="M3.6 5.8h7V11a3.5 3.5 0 0 1-7 0z"/><circle class="filled" cx="6.1" cy="8.8" r=".85"/><circle class="filled" cx="8.1" cy="8.8" r=".85"/><path d="M5.5 11.6a2 2 0 0 0 3.2 0"/><path d="M13.4 5.8h7v7.2a3.5 3.5 0 0 1-7 0z"/><circle class="filled" cx="15.9" cy="9.2" r=".85"/><circle class="filled" cx="17.9" cy="9.2" r=".85"/><path d="M15.3 13.4a2 2 0 0 1 3.2 0"/></svg></div>
                    <span class="mode-name">Sentiment Analyst</span>
                </div>
                <div class="mode-card premium-card cat-roles" onclick="launchGame('spyfall')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><path d="M5.6 10.4L12 4l6.4 6.4"/><path d="M3.4 10.4h17.2"/><circle cx="8.6" cy="15.6" r="2.6"/><circle cx="15.4" cy="15.6" r="2.6"/><path d="M11.2 15.6h1.6"/></svg></div>
                    <span class="mode-name">Spyfall</span>
                </div>
                <div class="mode-card premium-card cat-roles" onclick="launchGame('mafia')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><circle cx="6.6" cy="9.2" r="2.8"/><circle cx="12" cy="7.2" r="3.2"/><circle cx="17.4" cy="9.2" r="2.8"/><path d="M2.4 19.6a4.6 4.6 0 0 1 8.4 0"/><path d="M13.2 19.6a4.6 4.6 0 0 1 8.4 0"/></svg></div>
                    <span class="mode-name">Mafia</span>
                </div>
                <div class="mode-card premium-card cat-roles" onclick="launchGame('werewolf')">
                    <div class="mode-art"><svg viewBox="0 0 24 24"><path d="M19.6 14.4A8.5 8.5 0 0 1 9.6 4.4a8.5 8.5 0 1 0 10 10z"/><path d="M18.6 3.2l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z"/></svg></div>
                    <span class="mode-name">Werewolf</span>
                </div>
            </div>
            <div style="display:flex; gap:12px; flex-wrap:wrap; justify-content:center; margin-top: clamp(14px, 2.4vh, 34px);">
                <button class="btn-action btn-purple" style="font-size: 1.05rem; padding: 14px 26px; border-radius: 50px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);" onclick="openGuide('list')">📖 How to play</button>
                <button class="btn-action btn-blue" style="font-size: 1.05rem; padding: 14px 26px; border-radius: 50px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);" onclick="openRoom()" title="Students join with a code and answer on their phones">📱 Play on phones</button>
                <button class="btn-action btn-gray" style="font-size: 1.05rem; padding: 14px 26px; border-radius: 50px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);" onclick="document.getElementById('mode-select-view').style.display='none'; document.getElementById('app-container').style.display='grid';">Back to Grid</button>
            </div>
        </div>
    </div>
`;

export const getGameLayoutHtml = (partyData: PartyModeOutput) => `
    <div id="global-laser-dot"></div>
    <div id="global-laser-trail"></div>
    <!-- GAME LAYOUT -->
    <div class="app-container" id="app-container" style="display:none;">
        <!--
          A two-item bar: who this is, how long the round has run, and one way in
          to everything else. The eight controls that used to live here took a
          row off the top of every game — and in most games half of them were
          irrelevant — so they moved into the settings sheet (openSettings). The
          board now owns the whole screen.
        -->
        <header class="header" id="pm-header">
            <div class="logo"><i class="fas fa-crown"></i> Party Mode</div>
            <div class="game-stats">
                <div class="stat-item"><i class="fas fa-clock"></i> <span id="time-elapsed">00:00</span></div>
            </div>
            <div class="header-controls" id="pm-header-controls">
                <button class="btn-action pm-btn-laser" id="pm-laser-btn" onclick="toggleLaser()" title="Laser pointer — a white-hot dot for the projector"><i class="pm-laser-ico"></i><span class="pm-laser-label">Laser</span></button>
                <button class="btn-action pm-btn-exit" id="pm-exit-btn" onclick="exitToMenu()" title="Back to game selection">✕ Exit</button>
                <button class="btn-action pm-btn-settings" id="pm-settings-btn" onclick="openSettings()" title="Everything for this game: the room, the guide, the score sheet, the voice">⚙️ Settings</button>
            </div>
        </header>

        <aside class="sidebar">
            <div class="active-player-display" id="active-player-display">
                <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" id="active-avatar-large" class="active-player-avatar">
                <div class="active-player-status">Current Turn</div>
                <div class="active-player-name" id="active-name-large">Player</div>
                <div class="inventory pm-grid-only" id="active-inventory" style="margin-top:10px; justify-content:center;"></div>
            </div>
            
            <div class="active-effects-box" id="active-effects-box" style="display:block;">
                <div class="active-effects-title"><i class="fas fa-bolt"></i> Power Ups</div>
                <div id="active-effects-list"></div>
            </div>

            <div class="sidebar-title" style="margin-top:20px; font-weight:800; color:var(--gray);">Leaderboard</div>
            <div id="leaderboard-list"></div>

            <!-- Who is holding what — on a projector the class can see the whole board
                 at once instead of asking who has the ⚡ cards. Lucky cards are only
                 dealt by the Grid Arena, so this whole block is hidden in every other
                 game (see is-grid below). -->
            <div class="sidebar-title pm-grid-only" id="pm-holdings-title" style="margin-top:16px; font-weight:800; color:var(--gray);">Power-ups held</div>
            <div id="pm-holdings" class="pm-holdings pm-grid-only"><span style="color:var(--gray); font-size:0.75rem; font-weight:700;">Nobody is holding a power-up.</span></div>
        </aside>

        <main class="game-area">
            <div class="grid-wrapper" id="game-grid">
                <!-- Grid items injected here -->
            </div>
            
            <!-- SPECIAL GAME OVERLAYS -->
            
            <!-- HIDDEN ROLES — MAFIA / WEREWOLF -->
            <div id="view-social" class="special-game-overlay">
                <div class="social-top">
                    <div class="social-heading">
                        <div class="social-kicker" id="social-kicker">HIDDEN ROLES</div>
                        <h2 class="social-title" id="social-title">The Village Meeting</h2>
                        <p class="social-setting pm-tappable" id="social-setting" onclick="pmReadBig('social', true)" title="Tap to read the scene large"></p>
                    </div>
                    <!-- One bar for every control: the difficulty dial and the transport
                         buttons share the row and wrap together, so the board keeps the
                         height instead of paying for two rows of chrome. -->
                    <div class="social-actions">
                        <span class="social-diff-label">DIFFICULTY</span>
                        <span class="social-difficulty" id="social-difficulty">
                            <button class="social-diff-btn" data-diff="easy" onclick="setSocialDifficulty(this.dataset.diff)" title="Three characters carry a partial giveaway">😌 Easy</button>
                            <button class="social-diff-btn" data-diff="standard" onclick="setSocialDifficulty(this.dataset.diff)" title="Two of the eight carry a partial giveaway">🙂 Standard</button>
                            <button class="social-diff-btn" data-diff="brutal" onclick="setSocialDifficulty(this.dataset.diff)" title="Nobody gives anything away">😈 Brutal</button>
                        </span>
                        <button class="btn-action btn-blue" onclick="pmReadBig('social')" title="Show the current line as large as the screen allows">🔍 Read big</button>
                        <button class="btn-action btn-gray" onclick="socialPrevSpeaker()" title="Previous character">◀</button>
                        <button class="btn-action btn-blue" onclick="socialSpeak()" title="Hear this line"><i class="fas fa-volume-up"></i> Speak</button>
                        <button class="btn-action btn-blue" onclick="socialNextSpeaker()" title="Next character">▶</button>
                        <button class="btn-action btn-purple" id="social-auto-btn" onclick="toggleSocialAuto()" title="Hands-free: play every line in turn">Auto: off</button>
                        <button class="btn-action btn-gray" onclick="openCharacterVoices()" title="Give every character its own voice">🎙️ Voices</button>
                        <button class="btn-action btn-gray" onclick="openGuide(socialState.variant)" title="How to play">❓</button>
                    </div>
                </div>


                <div class="social-stage">
                    <div class="social-rail" id="social-rail"></div>
                    <div class="social-line-card">
                        <div class="social-speaking" id="social-speaking">Speaking now</div>
                        <div class="social-speaker" id="social-speaker">—</div>
                        <p class="social-line pm-tappable" id="social-line" onclick="pmReadBig('social')" title="Tap to read this line large"></p>
                        <div class="social-progress" id="social-progress"></div>
                        <p class="social-hint">Nothing here names a role. Every statement fits more than one character — that is the game.</p>
                    </div>
                </div>

                <div class="social-vote" id="social-vote-box">
                    <div class="social-vote-title">🗳 Who holds the hidden role?</div>
                    <div class="social-vote-row" id="social-vote-row"></div>
                    <div class="social-vote-actions">
                        <button class="btn-action btn-green" onclick="socialLockAccusation()">Lock in the accusation</button>
                        <button class="btn-action btn-blue" id="social-room-pick" style="display:none;" onclick="socialUseRoomPick()"></button>
                    </div>
                </div>

                <div class="social-verdict" id="social-verdict" style="display:none;">
                    <div class="social-verdict-title" id="social-verdict-title"></div>
                    <div class="social-report" id="social-report"></div>
                    <div class="social-verdict-roles" id="social-verdict-roles"></div>
                    <div class="social-verdict-actions">
                        <button class="btn-action btn-blue" onclick="socialNextRound()">Next round</button>
                        <button class="btn-action btn-purple" onclick="openGuide(socialState.variant)">How to play</button>
                    </div>
                </div>
            </div>

            <!-- PRACTICE MODE OVERLAY -->
            <div id="view-practice" class="special-game-overlay">
                <div class="practice-container">
                    <!-- Practice takes over the whole screen, so it carries its own way
                         out: the header is hidden in here, and a card deck with no
                         Exit traps the tutor on this one screen. -->
                    <div style="width:80%; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <button class="btn-action pm-btn-exit" onclick="exitToMenu()" title="Back to game selection">✕ Exit</button>
                        <div style="font-size:1.5rem; font-weight:900; color:var(--ink);" id="practice-counter">1/64</div>
                    </div>
                    <div class="practice-card" id="practice-card">
                        <!-- FRONT FACE -->
                        <div class="face front">
                            <div style="position:absolute; top:20px; left:20px; display:flex; gap:10px;">
                                <span class="q-tag" id="prac-skill">Skill</span>
                                <span class="q-tag" id="prac-level" style="background:var(--secondary-soft); color:var(--secondary-dark);">Level</span>
                            </div>
                            <div class="p-question" id="prac-q">Question</div>
                            <button class="btn-action btn-gray" onclick="event.stopPropagation(); playTTS(document.getElementById('prac-q').innerText)" style="margin-bottom:15px; padding:5px 10px; font-size:0.9rem;" title="Play Audio Segment"><i class="fas fa-volume-up"></i></button>
                            <div id="prac-context" class="q-context-box" style="display:none; margin: 15px 0; width:100%;"></div>
                            <div id="prac-options" class="prac-options-grid" style="width:100%; margin-top:15px;"></div>
                            <div style="margin-top:auto; width:100%; display:flex; justify-content:space-between; align-items:center;">
                                <div></div>
                                <button class="btn-action btn-blue" onclick="event.stopPropagation(); playHint()"><i class="fas fa-lightbulb"></i> Hint</button>
                            </div>
                        </div>
                        <!-- BACK FACE -->
                        <div class="face back">
                            <div class="p-answer" id="prac-a">Answer</div>
                            <button class="btn-action btn-gray" onclick="event.stopPropagation(); playTTS(document.getElementById('prac-a').innerText)" style="margin-bottom:15px; padding:5px 10px; font-size:0.9rem;"><i class="fas fa-volume-up"></i></button>
                            <div id="prac-feedback-area" style="width:100%; text-align:left;"></div>
                        </div>
                    </div>
                    <div class="practice-nav">
                        <button class="btn-action btn-purple" style="background: #475569; border-bottom: 4px solid #334155;" onclick="navPractice(-1)">Previous</button>
                        <button class="btn-action btn-blue" onclick="togglePracticeFlip()">🔁 Flip</button>
                        <button class="btn-action btn-green" onclick="navPractice(1)">Next</button>
                    </div>
                </div>
            </div>

            <!-- PICTIONARY — STUDIO -->
            <div id="view-pictionary" class="special-game-overlay" style="background: transparent;">
                <div class="pictionary-container">
                    <div class="pic-studio-header">
                        <div class="pic-studio-title"><i class="fas fa-palette"></i> Pictionary Studio</div>
                        <div class="pic-header-actions">
                            <button class="btn-action pic-act-btn" id="pic-hint-top-btn" onclick="playHint()" title="Get a hint on what to draw">💡 Hint</button>
                            <button class="btn-action pic-act-btn pic-act-green" onclick="nextSpecialQuestion()" title="Deal the next statement">NEXT ▸</button>
                            <button class="pic-draw-btn" id="pic-draw-btn" onclick="togglePicDrawPopup()" title="Show what to draw">🎨 What to draw</button>
                        </div>
                    </div>
                    <!-- Popup: What to Draw — keeps canvas maximal -->
                    <div class="pic-draw-popup" id="pic-draw-popup" onclick="if(event.target===this)togglePicDrawPopup()">
                        <div class="pic-draw-card">
                            <h3>WHAT TO DRAW</h3>
                            <p class="pic-prompt-text masked pm-tappable" id="pictionary-word" onclick="pmReadBig('pictionary')" style="cursor:pointer;">Loading the statement…</p>
                            <div class="pm-brief-tools" style="margin:0;">
                                <button class="btn-action btn-blue" onclick="togglePicWordVisibility()" title="Show or hide"><span id="pic-eye-icon">👁</span> <span id="pic-eye-label">Reveal</span></button>
                                <button class="btn-action btn-gray" onclick="pmReadBig('pictionary')">🔍 Read big</button>
                                <button class="btn-action btn-gray" onclick="copyText(document.getElementById('pictionary-word').innerText)">📋 Copy</button>
                                <button class="btn-action btn-green" onclick="togglePicDrawPopup()">✓ Got it — draw!</button>
                            </div>
                            <div class="pic-say-hint" id="pic-say-hint" style="display:none; margin-top:10px;">Say one sentence about it while you draw — where it is, who is there, and what happens next.</div>
                            <div id="pic-hint-box" style="margin-top:10px; font-weight:bold; color:var(--primary-dark); display:none;"></div>
                        </div>
                    </div>
                    
                    <div id="pictionary-canvas-container">
                        <canvas id="pictionary-canvas" width="800" height="500"></canvas>

                    </div>
                    
                    <div class="pictionary-tools" id="pictionary-tools">
                        <!-- INK: pen, highlighter, eraser -->
                        <div class="pic-tool-group">
                            <button class="tool-btn" data-tool="pen" onclick="setPicTool('pen')" title="Pen — crisp lines"><svg viewBox="0 0 24 24"><path d="M3 21l3.75-.75L20.1 6.9a2.1 2.1 0 0 0-2.97-2.97L3.75 17.25 3 21z"/></svg></button>
                            <button class="tool-btn" data-tool="marker" onclick="setPicTool('marker')" title="Marker — translucent, layers like a real highlighter"><svg viewBox="0 0 24 24"><path d="M8.5 3.5l12 12-5 5-12-12v-5h5z"/><path d="M6.5 20.5h13" stroke-width="2" fill="none"/></svg></button>
                            <button class="tool-btn" data-tool="eraser" onclick="setPicTool('eraser')" title="Eraser"><svg viewBox="0 0 24 24"><path d="M16.24 3.56a2 2 0 0 1 2.83 0l1.37 1.37a2 2 0 0 1 0 2.83L9.3 18.9l-6.2-6.2L16.24 3.56z"/><path d="M4 21h16" stroke-width="2" fill="none"/></svg></button>
                        </div>
                        <!-- SHAPES: drag one out, then it keeps its own handles -->
                        <div class="pic-tool-group">
                            <button class="tool-btn" data-tool="arrow" onclick="setPicTool('arrow')" title="Arrow — drag the way it should point"><svg viewBox="0 0 24 24"><path d="M4 20L20 4" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M13 4h7v7" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                            <button class="tool-btn" data-tool="line" onclick="setPicTool('line')" title="Line"><svg viewBox="0 0 24 24"><path d="M4 20L20 4" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg></button>
                            <button class="tool-btn" data-tool="rect" onclick="setPicTool('rect')" title="Rectangle"><svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="3"/></svg></button>
                            <button class="tool-btn" data-tool="ellipse" onclick="setPicTool('ellipse')" title="Circle / oval"><svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8.5" ry="6.5"/></svg></button>
                            <button class="tool-btn" data-tool="text" onclick="setPicTool('text')" title="Text — click where the word should go"><svg viewBox="0 0 24 24"><path d="M5 6.5V4.5h14v2" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 4.5v15" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M9 19.5h6" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
                        </div>
                        <!-- SELECT: move, scale and rotate anything already drawn -->
                        <div class="pic-tool-group">
                            <button class="tool-btn" data-tool="select" onclick="setPicTool('select')" title="Select — move, scale and rotate what is already on the board"><svg viewBox="0 0 24 24"><path d="M6 3l12.5 7.6-5.2 1.3 2.9 5.5-2.5 1.3-2.9-5.5-3.8 3.8L6 3z"/></svg></button>
                        </div>
                        <!-- HISTORY -->
                        <div class="pic-tool-group">
                            <button class="tool-btn" id="pic-undo-btn" onclick="picUndo()" title="Undo (Ctrl+Z)"><svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9h9a7 7 0 0 1 0 14h-3" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                            <button class="tool-btn" onclick="picRedo()" title="Redo (Ctrl+Shift+Z)"><svg viewBox="0 0 24 24"><path d="M15 14l5-5-5-5" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 9h-9a7 7 0 0 0 0 14h3" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                            <button class="tool-btn" onclick="clearPicCanvas()" title="Clear the whole board"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg></button>
                        </div>
                        <!-- COLOURS: swatch rail + custom picker -->
                        <div class="pic-tool-group pic-colors-group">
                            <div class="pic-swatches" id="pic-swatches">
                                <button class="pic-swatch on" data-color="#0f172a" style="background:#0f172a;" onclick="setPicColor(this, '#0f172a')" title="Black"></button>
                                <button class="pic-swatch" data-color="#ef4444" style="background:#ef4444;" onclick="setPicColor(this, '#ef4444')" title="Red"></button>
                                <button class="pic-swatch" data-color="#f97316" style="background:#f97316;" onclick="setPicColor(this, '#f97316')" title="Orange"></button>
                                <button class="pic-swatch" data-color="#f59e0b" style="background:#f59e0b;" onclick="setPicColor(this, '#f59e0b')" title="Amber"></button>
                                <button class="pic-swatch" data-color="#22c55e" style="background:#22c55e;" onclick="setPicColor(this, '#22c55e')" title="Green"></button>
                                <button class="pic-swatch" data-color="#06b6d4" style="background:#06b6d4;" onclick="setPicColor(this, '#06b6d4')" title="Cyan"></button>
                                <button class="pic-swatch" data-color="#3b82f6" style="background:#3b82f6;" onclick="setPicColor(this, '#3b82f6')" title="Blue"></button>
                                <button class="pic-swatch" data-color="#8b5cf6" style="background:#8b5cf6;" onclick="setPicColor(this, '#8b5cf6')" title="Purple"></button>
                                <button class="pic-swatch" data-color="#ec4899" style="background:#ec4899;" onclick="setPicColor(this, '#ec4899')" title="Pink"></button>
                                <button class="pic-swatch" data-color="#ffffff" style="background:#fff; border-color:rgba(15,23,42,0.35);" onclick="setPicColor(this, '#ffffff')" title="White"></button>
                            </div>
                            <label class="pic-custom-color" id="pic-custom-wrap" title="Any colour">
                                <input type="color" id="pic-color" value="#0f172a">
                                <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 1.6 1.6 0 0 0 1.6-1.6c0-.42-.16-.8-.42-1.08a1.6 1.6 0 0 1 1.2-2.66H17a5 5 0 0 0 5-5C22 6 17.5 2 12 2z"/><circle cx="6.5" cy="11.5" r="1.3" fill="#fff"/><circle cx="11" cy="7.5" r="1.3" fill="#fff"/><circle cx="15.5" cy="9.5" r="1.3" fill="#fff"/></svg>
                            </label>
                        </div>
                        <!-- BRUSH size -->
                        <div class="pic-tool-group pic-size-group">
                            <input type="range" id="pic-size" min="1" max="40" value="4" oninput="picSizeChanged()" title="Brush size">
                            <span class="pic-size-dot-wrap" id="pic-size-preview" title="Brush size"><span class="pic-size-dot" id="pic-size-dot"></span></span>
                        </div>
                        <!-- SCENE helpers -->
                        <div class="pic-tool-group">
                            <button class="tool-btn" onclick="toggleWireframe()" title="Spawn a poseable mannequin"><svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2.5"/><path d="M12 7.5v7M12 10l-4 2M12 10l4 2M12 14.5l-3 5M12 14.5l3 5" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
                            <button class="tool-btn" onclick="toggleWireframeGender()" title="Toggle mannequin build"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.4"/><path d="M12 7.8v6.4M12 9.6l-3.4 1.7M12 9.6l3.4 1.7M12 14.2l-2.6 5M12 14.2l2.6 5M9 19.8c1.8 1.2 4.2 1.2 6 0" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
                            <button class="tool-btn" onclick="clearWireframe()" title="Remove the mannequin"><svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2.2"/><path d="M12 7v7M12 10l-3.5 2M12 10l3.5 2M12 14l-2.8 5M12 14l2.8 5" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M3.5 3.5l17 17" stroke-width="2.4" stroke-linecap="round"/></svg></button>
                            <button class="tool-btn" onclick="addStickerFromInput()" title="Emoji stamp — type one, press this"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke-width="2"/><circle cx="9" cy="10" r="1.1"/><circle cx="15" cy="10" r="1.1"/><path d="M8.5 14.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2" fill="none" stroke-width="2" stroke-linecap="round"/></svg></button>
                            <input type="text" id="sticker-input" maxlength="4" placeholder="🙂" title="Type an emoji, then press the stamp button">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- CONCEPT LINK -->
            <div id="view-concept" class="special-game-overlay">
                <div class="concept-container">
                    <h1 class="game-accent-title" style="margin-bottom:30px;">🔗 Concept Link</h1>
                    <div class="cl-links">
                        <div class="cl-clue" onclick="revealClue(this, 0)">1</div>
                        <div class="cl-clue" onclick="revealClue(this, 1)">2</div>
                        <div class="cl-clue" onclick="revealClue(this, 2)">3</div>
                    </div>
                    
                    <div id="cl-answer-display" class="cl-answer-display" onclick="revealConceptAnswer()">
                        TAP TO REVEAL
                    </div>
                    
                    <div id="concept-hint-box" style="margin-top:15px; background:var(--game-soft); padding:10px; border-radius:8px; display:none;"></div>
                    
                    <div style="margin-top:30px;">
                        <button class="btn-action btn-blue" onclick="playHint()">💡 Hint</button>
                        <button class="btn-action btn-green" onclick="nextSpecialQuestion()">Next Concept</button>
                    </div>
                </div>
            </div>

            <!-- HOT SEAT -->
            <div id="view-hotseat" class="special-game-overlay">
                <div class="hotseat-container split-game-container">
                    <div class="game-left-panel">
                        <div style="font-size:2rem; font-weight:900;">🔥 HOT SEAT</div>
                        <div class="hs-timer" id="hs-timer">300</div>
                        <div class="hs-controls">
                            <button class="hs-btn-small" onclick="pauseHSTimer()"><i class="fas fa-pause"></i> Pause</button>
                            <button class="hs-btn-small" onclick="resumeHSTimer()"><i class="fas fa-play"></i> Resume</button>
                            <button class="hs-btn-small" onclick="resetHotSeat()">Reset Round</button>
                        </div>
                        <div class="hs-score-display">Score: <span id="hs-score-val">0</span></div>
                    </div>
                    <div class="game-right-panel">
                        <div class="hs-card" id="hs-word">PRESS START</div>
                        <div style="display:flex; gap:20px; margin-top:20px; width:100%; justify-content:center;">
                            <button class="btn-action btn-red" onclick="hsNextQuestion(false)" style="width:150px;">PASS</button>
                            <button class="btn-action btn-green" onclick="hsNextQuestion(true)" style="width:150px;">CORRECT</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TABOO -->
            <div id="view-taboo" class="special-game-overlay">
                <div class="taboo-container split-game-container">
                    <div class="game-left-panel">
                        <h1 style="color:var(--purple); margin:0;">🚫 TABOO</h1>
                        <div class="hs-timer" id="tb-timer" style="border-color:var(--purple);">60</div>
                        <div class="hs-controls">
                             <button class="hs-btn-small" onclick="pauseHSTimer()"><i class="fas fa-pause"></i> Pause</button>
                             <button class="hs-btn-small" onclick="resumeHSTimer()"><i class="fas fa-play"></i> Resume</button>
                             <button class="hs-btn-small" onclick="adjustHSTimer(10)">+10s</button>
                        </div>
                        <button class="btn-action btn-blue" onclick="playHint()">💡 Hint</button>
                    </div>
                    <div class="game-right-panel">
                        <div id="taboo-hint-box" style="margin-bottom:10px; background:var(--secondary-soft); border:1px solid rgba(6,182,214,0.3); color:var(--secondary-ink); padding:10px; border-radius:10px; display:none; width:100%; text-align:center;"></div>
                        <div class="tb-card">
                            <div class="tb-target" id="tb-target">TARGET</div>
                            <button class="btn-action btn-gray" style="margin-bottom:15px; font-size:0.8rem; padding:5px 10px;" onclick="copyText(document.getElementById('tb-target').innerText)" title="Copy Word"><i class="fas fa-copy"></i></button>
                            <div class="tb-forbidden" id="tb-forbidden">Forbidden 1<br>Forbidden 2<br>Forbidden 3</div>
                        </div>
                        <div style="margin-top:30px; display:flex; gap:20px;">
                            <button class="btn-action btn-red" onclick="hsPass()" style="width:150px;">SKIP</button>
                            <button class="btn-action btn-green" onclick="hsCorrect()" style="width:150px;">GOT IT</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ALIBI PUZZLE (Updated) -->
            <!-- ALIBI PUZZLE — the same shape as Spyfall: the cast across the top,
                 then one wide panel for the story being told. An alibi runs to eighty
                 words, so it needs the width, not a 250px strip. -->
            <div id="view-alibi" class="special-game-overlay talk-view">
                <div class="talk-layout">
                    <div class="talk-head">                        <div class="talk-titles">
                            <h1 class="game-accent-title">🕵️ Alibi Puzzle</h1>
                            <p>Read the situation, then interrogate. One suspect's story cannot be true.</p>
                        </div>
                        <div id="alibi-status" class="talk-status">Click a suspect to interrogate.</div>
                    </div>
                    <!-- The situation is the one paragraph the puzzle hangs on, but it
                         does not need to sit on screen for the whole round: it is one
                         button away, opening full screen and read aloud. Keeping it out
                         of the layout is what gives the alibis below their size. -->
                    <div id="alibi-context-display" style="display:none;"></div>

                    <div class="talk-rail">
                        <div id="suspects-container" class="suspects-rail">
                            <!-- Injected -->
                        </div>
                    </div>
                    <div class="talk-stage">
                        <div class="alibi-speaker" id="alibi-speaker" style="display:none;">
                            <img id="alibi-speaker-avatar" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="">
                            <span class="alibi-speaker-name" id="alibi-speaker-name">—</span>
                            <button class="btn-action btn-blue" style="padding:6px 12px; font-size:0.85rem;" onclick="alibiRepeat()" title="Hear that story again">🔊 Repeat</button>
                        </div>
                        <div class="alibi-statement pm-tappable" id="alibi-statement" onclick="pmReadBig('alibi')" title="Tap to read the alibi large">Interrogate a suspect to hear their story.</div>
                    </div>
                    <div class="talk-actions">
                        <button class="btn-action btn-red" id="alibi-accuse-btn" style="display:none;" onclick="accuseSelectedSuspect()">ACCUSE</button>
                        <button class="btn-action btn-blue" onclick="pmReadBig('alibi', true)" title="Show the situation — and read it aloud">📄 Situation</button>
                        <button class="btn-action btn-gray" onclick="openCharacterVoices()" title="Give every suspect their own voice">🎙️ Voices</button>
                        <button class="btn-action btn-blue" onclick="nextSpecialQuestion()">Next Round</button>
                    </div>
                </div>
            </div>

            <!-- BOMB GAME -->
            <!-- KEEP TALKING — the same white card as every other game. The drama
                 comes from the pulsing timer and the live sensor bar, not from a
                 burned-photograph backdrop. -->
            <div id="view-bomb" class="special-game-overlay">
                <style>
                    @keyframes timerPulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.04); }
                    }
                    .bomb-active-bg { animation: none; background: var(--accent-soft); }
                    .bomb-active-bg #bomb-timer { animation: timerPulse 1s infinite !important; }
                </style>
                <div id="bomb-game-wrapper" class="split-game-container" style="flex-direction:column; gap:clamp(10px, 2vh, 20px); position:relative;">
                    <!-- Exit moved to header -->
                    <h1 class="game-accent-title" style="font-size:clamp(1.4rem, 3vw, 2.4rem); margin:0;"><i class="fas fa-bomb"></i> KEEP TALKING</h1>

                    <div id="bomb-timer" class="bomb-timer">02:30</div>

                    <div id="bomb-task-card" class="bomb-task-card">
                        <div class="bomb-stripe"></div>
                        <h2 style="margin:0 0 10px; font-size:0.95rem; letter-spacing:0.16em;">CURRENT DIRECTIVE</h2>
                        <p id="bomb-task-text" class="pm-tappable" onclick="pmReadBig('bomb')" title="Tap to read the directive large">Loading decryption sequence...</p>
                        <div class="pm-brief-tools" style="justify-content:center; margin-top:12px;">
                            <button class="btn-action btn-blue" onclick="pmReadBig('bomb')" title="Show the directive as large as the screen allows">🔍 Read big</button>
                        </div>
                        <button class="btn-action btn-green" onclick="nextBombTask()" style="margin-top:14px;">DIRECTIVE COMPLETE</button>
                    </div>

                    <div class="bomb-meter">
                        <div class="bomb-meter-head"><span>AUDIO SENSOR</span><span id="bomb-status">SAFE</span></div>
                        <div class="bomb-meter-track"><div id="volume-meter"></div></div>
                    </div>

                    <button id="start-bomb-btn" class="btn-action btn-red" style="font-size:1.2rem; padding:16px 40px; letter-spacing:0.12em;" onclick="startBombGame()">INITIATE SEQUENCE</button>
                </div>
            </div>

            <!-- SENTIMENT ANALYST -->
            <div id="view-sentiment" class="special-game-overlay">
                <div class="split-game-container">
                    <div class="game-left-panel">
                        <h1 class="game-accent-title">🎭 Sentiment Analyst</h1>
                        <p style="text-align:center;">Read the line with the required EMOTION!</p>
                        <div class="sentiment-icon" id="sentiment-icon" style="font-size:5rem;">😐</div>
                        <div class="sentiment-label" id="sentiment-emotion" style="font-size:1.5rem; color:var(--game-ink); margin-top:10px;">NEUTRAL</div>
                        <button class="btn-action btn-blue" onclick="nextSpecialQuestion()" style="margin-top:auto; margin-bottom:10px;">Next Round</button>
                    </div>
                    <div class="game-right-panel">
                        <div class="sentiment-card pm-tappable" id="sentiment-card" onclick="pmReadBig('sentiment')" title="Tap to read the line large"><p class="sentiment-text" id="sentiment-line">Loading...</p></div>
                        <div class="pm-brief-tools" style="justify-content:center; margin-top:12px;">
                            <!-- One way in, not three. The card itself and this button
                                 both open the big reader, which owns its own read-aloud,
                                 size controls and voice; a second "Listen" button here
                                 was the same action with a different label. -->
                            <button class="btn-action btn-blue" onclick="pmReadBig('sentiment')" title="Show the line as large as the screen allows">🔍 Read big</button>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
                            <button class="practice-mic-btn" id="sentiment-mic-btn" onclick="toggleSentimentRec()"><i class="fas fa-microphone"></i></button>
                            <audio id="sentiment-audio-playback" controls style="display:none; margin-top:10px;"></audio>
                        </div>
                        <div id="sentiment-feedback" style="margin-top:10px; font-weight:bold; height:20px;">Tap mic to record</div>
                        <div style="display:flex; gap:20px; margin-top:30px;">
                            <button class="btn-action btn-red" onclick="sentimentNext(false)">Fail (Flat)</button>
                            <button class="btn-action btn-green" onclick="sentimentNext(true)">Pass (Great Tone!)</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SPYFALL -->
            <!-- SPYFALL — a row of faces over a large line panel.
                 The olds layout put the cast in a right column and the line in a
                 250px strip, so an eighty-word statement came out at 12px and still
                 ran off the bottom. On a projector the width is the cheap dimension
                 and the height is the expensive one, so this reads across: six faces,
                 then one wide panel for whoever is speaking. -->
            <div id="view-spyfall" class="special-game-overlay talk-view">
                <div class="talk-layout">
                    <div class="talk-head">
                        <div class="talk-titles">
                            <h1 class="game-accent-title">🕵️ SPYFALL</h1>
                            <p>One of these six is guessing. Ask a question only an insider could answer safely.</p>
                        </div>
                        <div id="spy-status" class="talk-status">Tap a face to hear what they say.</div>
                    </div>
                    <!-- The location stays off the board: the spy is the one player who
                         must not be told it, and the tutor opens it as a full-screen
                         panel (read aloud) only when the class needs it. -->
                    <div id="spyfall-context" style="display:none;"></div>
                    <div class="talk-rail">
                        <div id="spy-grid" class="spy-grid"></div>
                    </div>
                    <div class="talk-stage">
                        <div class="spy-speaker" id="spy-speaker" style="display:none;">
                            <img id="spy-speaker-avatar" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="">
                            <span class="spy-speaker-name" id="spy-speaker-name">—</span>
                            <button class="btn-action btn-blue" style="padding:6px 12px; font-size:0.85rem;" onclick="spyRepeat()" title="Hear that line again">🔊 Repeat</button>
                        </div>
                        <div class="spy-statement pm-tappable" id="spy-statement" onclick="pmReadBig('spyfall')" title="Tap to read the statement large">Tap a face to hear what they say.</div>
                    </div>                        <div id="spy-reveal-area" style="display:none; text-align:center; animation:popIn 0.5s; flex:0 0 auto;">
                        <h2 id="spy-reveal-title" style="margin:0;"></h2>
                        <p id="spy-reveal-desc" style="margin:4px 0 8px;"></p>
                        <button class="btn-action btn-blue" onclick="nextSpecialQuestion()">Next Round</button>
                    </div>
                    <div class="talk-actions">
                        <button class="btn-action btn-blue" onclick="pmReadBig('spyfall', true)" title="Show the location — and read it aloud">📍 Location</button>
                        <button class="btn-action btn-purple" id="spy-auto-btn" onclick="spyPlayAll()" title="Hear every character in turn, each in their own voice">▶ Hear everyone in turn</button>
                        <button class="btn-action btn-gray" onclick="openCharacterVoices()" title="Give every character its own voice">🎙️ Voices</button>
                    </div>
                </div>
            </div>

        </main>

        <!-- THE BIG READER — one panel for every long line in the arena.
             An alibi, a spyfall statement, a sentiment line and a hidden-role
             scene all have to be readable from the back row, and each of them
             arrived as an unpredictable amount of text. This shows exactly one
             piece of it, at the largest size the frame allows, and reads it in
             the voice of whoever it belongs to. Opened by “🔍 Read big”, or by
             tapping the panel itself. -->
        <div id="pm-reader" class="pm-reader" aria-hidden="true" role="dialog" aria-label="Read this aloud">
            <div class="pm-reader-card">
                <div class="pm-reader-head">
                    <div class="pm-reader-titles">
                        <div class="pm-reader-kicker" id="pm-reader-kicker">Read this aloud</div>
                        <div class="pm-reader-title" id="pm-reader-title">Read this</div>
                    </div>
                    <div class="pm-reader-tools">
                        <button class="btn-action btn-blue" id="pm-reader-speak" onclick="pmReaderSpeak()" title="Read it aloud again">🔊 Read aloud</button>
                        <button class="btn-action btn-gray" onclick="pmReaderSize(-1)" title="Smaller text">A−</button>
                        <button class="btn-action btn-gray" onclick="pmReaderSize(1)" title="Larger text">A+</button>
                        <button class="btn-action btn-red" onclick="closeReader()" title="Close and go back to the game">✕ Close</button>
                    </div>
                </div>
                <div class="pm-reader-body" id="pm-reader-body"></div>
            </div>
        </div>
    </div>
`;

export const getQuestionModalHtml = () => `
    <!-- MAIN QUESTION MODAL -->
    <div class="modal" id="q-modal">
        <div class="modal-card">
            <div class="modal-header">
                <div class="modal-header-left">
                    <div class="q-tag" id="q-skill">SKILL</div>
                    <div class="q-tag" id="q-level" style="background:var(--secondary-soft); color:var(--secondary-dark);">LEVEL</div>
                    <div class="q-tag" id="q-points" style="background:var(--yellow-soft); color:var(--yellow-ink);">10</div>
                </div>
                
                <div class="modal-header-center">
                    <div class="q-tag" id="q-streak" style="background:#dcfce7;color: #047857; border:2px solid rgba(34,197,94,0.6);">🔥 0</div>
                    <div id="header-powerups" style="display:flex; gap:6px; margin-left:12px; overflow-x:auto; padding-bottom:2px;"></div>
                </div>

                <div class="modal-header-right" style="cursor:pointer;" onclick="toggleQTimer()" title="Click to Pause/Resume">
                     <div style="position:relative; width:50px; height:50px;">
                        <svg viewBox="0 0 36 36" style="width:100%; height:100%; transform:rotate(-90deg);">
                            <path class="circular-chart-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill:none; stroke:#e5e7eb; stroke-width:3;"></path>
                            <path id="q-timer-path" class="circular-chart-fg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill:none; stroke:#3b82f6; stroke-width:3; stroke-dasharray: 100, 100; transition:stroke-dasharray 1s linear, stroke 0.3s;"></path>
                        </svg>
                        <div id="q-timer" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-weight:900; font-size:1rem; color:var(--ink);">30</div>
                     </div>
                     <button onclick="event.stopPropagation(); closeQuestionModal()" style="background:none; border:none; font-size:2rem; cursor:pointer; color:var(--gray);">&times;</button>
                </div>
            </div>
            
            <div class="modal-body">
                <div class="q-content" id="q-text">Question...</div>
                <div id="q-context-box" class="q-context-box" style="display:none;"></div>
                <div id="hint-box" class="hint-box"></div>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button class="btn-action btn-blue" id="hint-btn" style="padding:10px 20px; font-size:0.9rem;" onclick="playHint()">💡 Hint</button>
                    <button class="btn-action btn-purple" id="practice-toggle-btn" style="padding:10px 20px; font-size:0.9rem;" onclick="togglePracticeMode()">🎤 Practice Mode</button>
                </div>
                <div id="q-interaction-area" style="width:100%; display:block; margin-top:20px;"></div>
                <div id="practice-mode-area" style="display:none; text-align:center; width:100%; margin-top:20px;">
                    <div id="practice-mic-btn" class="practice-mic-btn" onclick="togglePracticeMic()"><i class="fas fa-microphone"></i></div>
                    <p id="practice-status" style="color:#666;">Tap mic to speak your answer...</p>
                    <div id="practice-result" style="font-size:1.5rem; font-weight:bold; margin-top:10px;"></div>
                </div>
                <div id="q-feedback" class="feedback-section">
                    <div class="feedback-header" id="fb-header">CORRECT!</div>
                    <div id="fb-content"></div>
                </div>
            </div>
            
            <div class="modal-footer">
                <div class="action-row" id="q-controls">
                    <button class="btn-action btn-blue" id="show-answer-btn" onclick="revealAnswer()">Show Answer</button>
                    <div id="host-controls" style="display:none; gap:10px;">
                        <button class="btn-action btn-red" onclick="resolveTurn(false)"><i class="fas fa-times"></i> Wrong</button>
                        <button class="btn-action btn-green" onclick="resolveTurn(true)"><i class="fas fa-check"></i> Correct</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

export const getPowerupOverlayHtml = () => `
    <div class="powerup-overlay" id="powerup-overlay">
        <div class="powerup-icon" id="pu-icon">🎁</div>
        <div class="powerup-title" id="pu-title">DOUBLE POINTS!</div>
        <p id="pu-blurb" style="font-size:clamp(1rem, 2vw, 1.4rem); font-weight:bold; color:var(--text); padding:0 20px;">Added to your inventory — spend it whenever you like.</p>
        <button class="btn-action btn-blue" onclick="closePowerup()" style="margin-top:24px; border:2px solid rgba(15,23,42,0.18);">CONTINUE</button>
    </div>
    <div class="streak-overlay" id="streak-overlay">
        <div class="streak-fire">🔥</div>
        <div class="streak-title">STREAK BONUS!</div>
        <div class="streak-sub">+50 POINTS</div>
    </div>

    <!-- TARGET PICKER — Eraser / Gift and any card that lands on a chosen player -->
    <div class="modal" id="target-modal">
        <div class="modal-card">
            <div class="modal-header">
                <div class="modal-header-left"><div class="q-tag" style="background:#f3e8ff; color:var(--purple-dark);">CHOOSE A TARGET</div></div>
            </div>
            <div style="padding:14px 16px 0; text-align:left;">
                <p id="target-title" style="font-weight:800; font-size:1.05rem; margin:0; color:var(--text);"></p>
            </div>
            <div class="pu-target-list" id="target-list"></div>
            <div class="modal-footer" style="justify-content:center;">
                <button class="btn-action btn-gray" onclick="cancelTarget()">Cancel</button>
            </div>
        </div>
    </div>

    <!-- GAME GUIDES — read aloud ON CLICK, never automatically -->
    <div class="modal" id="guide-modal">
        <div class="modal-card guide-card">
            <div class="modal-header">
                <div class="modal-header-left"><div class="q-tag" style="background:#f3e8ff; color:var(--purple-dark);">📖 GAME GUIDES</div></div>
                <div class="modal-header-right">
                    <button class="btn-action btn-blue" style="padding:8px 14px; font-size:0.85rem;" onclick="readGuideAloud()" title="Hear this guide read out"><i class="fas fa-volume-up"></i> Read aloud</button>
                    <button onclick="closeGuide()" style="background:none; border:none; font-size:2rem; cursor:pointer; color:var(--gray);">&times;</button>
                </div>
            </div>
            <div class="guide-body">
                <div class="guide-rail" id="guide-rail"></div>
                <div class="guide-main" id="guide-main"></div>
            </div>
        </div>
    </div>
`;

export const getLuckyOverlayHtml = () => `
    <div class="lucky-overlay" id="lucky-overlay">
        <div class="lucky-title" id="lucky-title">🍀 LUCKY CARD!</div>
        <div class="lucky-desc" id="lucky-desc">SWAP SCORES!</div>
        <div id="lucky-result" style="font-size:clamp(1.05rem, 2.2vw, 1.7rem); font-weight:800; margin-top:14px; padding:0 20px;"></div>
        <button class="btn-action btn-blue" onclick="closeLucky()" style="margin-top:24px; border:2px solid white;">CONTINUE</button>
    </div>
`;


export const getPartyModeScript = (
    partyData: PartyModeOutput,
    celebratoryPhrases: string[],
    tauntPhrases: string[],
    learner: LearnerProfile
) => `
// --- DATA ---
const gameData = ${JSON.stringify(partyData)};
const celebrationPhrases = ${JSON.stringify(celebratoryPhrases)};
const tauntPhrases = ${JSON.stringify(tauntPhrases)};
/* "voice" is the read-aloud voice chosen in the Adult Dashboard → Lessons →
   Step 2 · Customization & Lesson Structure. The generator resolves it (learner
   pick first, then the tutor's own voice) and the narrator uses it, so the party
   game narrates in the same voice as the rest of that tutor's lessons. The user
   still sees the picker in the game header, and can change it there. */
const learnerData = {
    name: "${escapeHtml(learner.name)}",
    voice: "${(partyData as any).readAloudVoice || learner.readAloudVoice || ''}",
    avatar: "${(partyData as any).learnerAvatar || ''}"
};

/* canvas-confetti arrives from a CDN. When that request is blocked — offline
   classroom, strict school proxy — the global is simply missing, and the old
   code threw on the first confetti() call inside init(). Because that threw
   mid-init, every handler registered after it never got attached, so the game
   looked frozen with no error shown. The shim keeps the lesson alive: confetti
   is decoration. Fabric is guarded where it is used, because a missing board
   has to be explained to the tutor rather than swallowed. */
if (typeof window.confetti !== 'function') { window.confetti = function () {}; }

let players = [];
let currentPlayerIndex = 0;
let timeElapsed = 0;
let timerInterval = null;

let qTimerInterval = null;
let qTimeLeft = 0;
let currentPotentialPoints = 0;
let hsTimerInterval = null;
let hsTimeLeft = 300; // Default 5 mins for Hot Seat

let currentQuestion = null;
let gridItems = []; 
let currentMultiplier = 1;
let currentRisk = false;     // Double Jeopardy: a miss costs double too
let currentStreak = 0; 
let selectedGameMode = 'bamboozle';
let hostVoice = null;
let pendingPowerup = null;
let pmPending = null;        // power-up waiting for a target to be chosen
let enabledPowerups = null;  // 🍀 cards the tutor left switched on
/* The power-up picker opens when The Grid Arena is chosen (see launchGame), and
   is offered exactly once per session — a tutor who already chose a set does not
   want a dialog every time they walk back to the menu. The header button reopens
   it whenever they change their mind. */
let pendingLaunchMode = null;
let powerupsConfirmed = false;

/* =====================================================================
   POWER-UP REGISTRY — one source of truth
   ---------------------------------------------------------------------
   Before: a bare list of names lived here and the effects lived ~1,200
   lines further down inside activatePowerup(). The two drifted, which is
   how three of the eleven power-ups (Immunity, Streak Saver, Supersonic)
   fell through to a silent "+20 points" fallback row, Eraser was wired to
   the 50-50 copy-paste, and Power Play handed every team +50%.

   Now one entry carries the name, the tier, what it needs and what it
   does. The sidebar, the in-question strip, the ⚡ cells, the 🍀 cards and
   the setup picker all read THIS list, so they cannot drift apart again.

   channel: 'lucky' → random 🍀 card, the way Baamboozle deals them
            'grid'  → ⚡ pick-up the player chooses when to spend
   needs:   none | question | mcq | target
   ===================================================================== */
const POWERUPS = {

    /* ---- 🍀 The Baamboozle deck: all 17 cards, with their real rules ---- */
    fairy: { name: "Fairy", emoji: "🧚", tier: "legendary", channel: ["lucky"], tone: "good", needs: "none",
        label: "Take another team's points", blurb: "Steals 5-25 points from one other team.",
        run: function (c) { const t = c.opponent(); if (!t) return "Fairy: no other team to steal from."; const a = pmTake(t, c.p, pmRand(5, 25)); return c.p.name + " took " + a + " pts from " + t.name + "!"; } },
    thief: { name: "Thief", emoji: "🦝", tier: "epic", channel: ["lucky"], tone: "bad", needs: "none",
        label: "Hand over some hard-earned points", blurb: "You give 5-25 points to one other team.",
        run: function (c) { const t = c.opponent(); if (!t) return "Thief: no other team to pay."; const a = pmTake(c.p, t, pmRand(5, 25)); return c.p.name + " hands " + a + " pts to " + t.name + "."; } },
    rocket: { name: "Rocket", emoji: "🚀", tier: "legendary", channel: ["lucky"], tone: "good", needs: "none",
        label: "Blast right to first place", blurb: "Leapfrogs the leader by 5 points.",
        run: function (c) { const top = pmSorted()[0]; if (!top || top.id === c.p.id) { c.p.score += 25; return c.p.name + " is already leading: +25 pts instead."; } c.p.score = top.score + 5; return "Rocket! " + c.p.name + " blasts into 1st place with " + c.p.score + " pts!"; } },
    banana: { name: "Banana", emoji: "🍌", tier: "badluck", channel: ["lucky"], tone: "bad", needs: "none",
        label: "Get pulled back to last place", blurb: "Drops you to 5 points behind the last team.",
        run: function (c) { const all = pmSorted(); const last = all[all.length - 1]; if (last.id === c.p.id) return "Banana! " + c.p.name + " was already last, so it does nothing."; c.p.score = Math.max(0, last.score - 5); return "Banana! " + c.p.name + " slides back to last place (" + c.p.score + " pts)."; } },
    star: { name: "Star", emoji: "⭐", tier: "legendary", channel: ["lucky"], tone: "good", needs: "none",
        label: "Your current points are doubled", blurb: "Doubles your score right now.",
        run: function (c) { c.p.score *= 2; return "Star! " + c.p.name + " doubles to " + c.p.score + " pts!"; } },
    heart: { name: "Heart", emoji: "💖", tier: "neutral", channel: ["lucky"], tone: "good", needs: "none",
        label: "The other team receives free points", blurb: "A rival receives 5-25 free points.",
        run: function (c) { const t = c.opponent(); if (!t) return "Heart: no other team to help."; const a = pmRand(5, 25); t.score += a; return t.name + " kindly receives " + a + " pts."; } },
    eraser: { name: "Eraser", emoji: "🧽", tier: "badluck", channel: ["lucky"], tone: "bad", needs: "none",
        label: "Your score is reset to zero", blurb: "Wipes your own score to 0.",
        run: function (c) { c.p.score = 0; return "Eraser! " + c.p.name + " is back to 0 pts."; } },
    virus: { name: "Virus", emoji: "🦠", tier: "badluck", channel: ["lucky"], tone: "bad", needs: "none",
        label: "All scores are completely reset", blurb: "Every team goes back to 0.",
        run: function () { players.forEach(function (pl) { pl.score = 0; }); return "Virus! Every score is back to 0."; } },
    shark: { name: "Shark", emoji: "🦈", tier: "neutral", channel: ["lucky"], tone: "good", needs: "none",
        label: "Other teams lose points", blurb: "Every rival loses 5-25 points.",
        run: function (c) { const ops = pmOpponents(c.p); if (!ops.length) return "Shark: nobody else to bite."; let total = 0; ops.forEach(function (o) { const a = Math.min(pmRand(5, 25), Math.max(0, o.score)); o.score -= a; total += a; }); return "Shark! Rivals lose " + total + " pts between them."; } },
    magnet: { name: "Magnet", emoji: "🧲", tier: "legendary", channel: ["lucky"], tone: "good", needs: "none",
        label: "Steal some points from your opponents", blurb: "Steals 5-25 points from the leader.",
        run: function (c) { const t = c.leader(); if (!t || t.id === c.p.id) { c.p.score += 25; return "Magnet: nobody ahead to drain, +25 pts instead."; } const a = pmTake(t, c.p, pmRand(5, 25)); return "Magnet! " + c.p.name + " steals " + a + " pts from " + t.name + "."; } },
    lifesaver: { name: "Lifesaver", emoji: "🛟", tier: "neutral", channel: ["lucky"], tone: "good", needs: "none",
        label: "Give some points to your competition", blurb: "A rival receives 5-25 points from you.",
        run: function (c) { const t = c.opponent(); if (!t) return "Lifesaver: no other team to help."; const a = Math.min(pmRand(5, 25), Math.max(0, c.p.score)); t.score += a; c.p.score -= a; return "Lifesaver! " + t.name + " receives " + a + " pts from " + c.p.name + "."; } },
    trap: { name: "Trap", emoji: "🕸️", tier: "badluck", channel: ["lucky"], tone: "warn", needs: "none",
        label: "No points!", blurb: "No question, no points - the turn is skipped.",
        run: function (c) { return "Trap! No question and no points for " + c.p.name + " - turn skipped."; } },
    seesaw: { name: "Seesaw", emoji: "⚖️", tier: "wild", channel: ["lucky"], tone: "info", needs: "none",
        label: "Swap points with one of your opponents", blurb: "Swaps your score with the leader.",
        run: function (c) { const t = c.leader(); if (!t || t.id === c.p.id) return "Seesaw: nobody ahead to swap with."; const tmp = c.p.score; c.p.score = t.score; t.score = tmp; return "Seesaw! " + c.p.name + " (" + c.p.score + ") and " + t.name + " (" + t.score + ") swap scores."; } },
    gold: { name: "Gold", emoji: "🥇", tier: "legendary", channel: ["lucky"], tone: "good", needs: "none",
        label: "Win fifty bonus points", blurb: "+50 points.",
        run: function (c) { c.p.score += 50; return "Gold! +50 pts, " + c.p.name + " is on " + c.p.score + "."; } },
    boom: { name: "Boom", emoji: "💥", tier: "badluck", channel: ["lucky"], tone: "bad", needs: "none",
        label: "Lose fifty points", blurb: "-50 points.",
        run: function (c) { c.p.score -= 50; return "BOOM! -50 pts, " + c.p.name + " is on " + c.p.score + "."; } },
    gift: { name: "Gift", emoji: "🎁", tier: "goodluck", channel: ["lucky"], tone: "good", needs: "none",
        label: "Receive some bonus points", blurb: "+5 to +25 points, free.",
        run: function (c) { const a = pmRand(5, 25); c.p.score += a; return "Gift! +" + a + " pts for " + c.p.name + "."; } },
    baam: { name: "Baam", emoji: "😵", tier: "badluck", channel: ["lucky"], tone: "bad", needs: "none",
        label: "Lose a random number of points", blurb: "-5 to -25 points.",
        run: function (c) { const a = pmRand(5, 25); c.p.score -= a; return "BAAM! -" + a + " pts for " + c.p.name + "."; } },

    /* ---- ⚡ Grid Arena pick-ups: the player decides when to spend them ---- */
    g_x2: { name: "X2", emoji: "✖️", tier: "legendary", channel: ["grid"], tone: "good", needs: "none",
        blurb: "Doubles the points of your next answer.",
        run: function () { currentMultiplier = Math.max(currentMultiplier, 2); return "X2 armed: your next answer is worth double."; } },
    g_fifty: { name: "50-50", emoji: "✂️", tier: "epic", channel: ["grid"], tone: "info", needs: "mcq",
        blurb: "Removes two wrong options from the question you have open.",
        run: function () { const correct = String(currentQuestion.answer).trim(); const btns = Array.prototype.slice.call(document.querySelectorAll('#q-interaction-area .option-btn:not(.disabled)')); let removed = 0; btns.forEach(function (b) { if (removed < 2 && b.innerText.trim() !== correct) { b.classList.add('disabled'); b.style.opacity = '0.25'; b.style.pointerEvents = 'none'; removed++; } }); return removed + " wrong option" + (removed === 1 ? "" : "s") + " removed."; } },
    g_immunity: { name: "Immunity", emoji: "🛡️", tier: "epic", channel: ["grid"], tone: "good", needs: "none",
        blurb: "Your next wrong answer costs you nothing.",
        run: function (c) { c.p.shield = true; return "Immunity on: your next miss costs nothing."; } },
    g_freeze: { name: "Time Freeze", emoji: "❄️", tier: "legendary", channel: ["grid"], tone: "info", needs: "question",
        blurb: "Pauses the question timer so the thinking can continue.",
        run: function () { if (qTimerInterval) { window.pauseQTimer(); return "Time frozen - timer paused at " + qTimeLeft + "s."; } return "Time was already paused."; } },
    g_supersonic: { name: "Supersonic", emoji: "🚀", tier: "legendary", channel: ["grid"], tone: "good", needs: "question",
        blurb: "Adds 10 seconds and 1.5x points to this question.",
        run: function () { addQTime(10); currentMultiplier = Math.max(currentMultiplier, 1.5); return "Supersonic! +10s and 1.5x points on this question."; } },
    g_saver: { name: "Streak Saver", emoji: "🎯", tier: "epic", channel: ["grid"], tone: "good", needs: "none",
        blurb: "Your streak survives one wrong answer.",
        run: function (c) { c.p.streakSaver = (c.p.streakSaver || 0) + 1; return "Streak Saver armed: one miss will not reset your streak."; } },
    g_double: { name: "Double Jeopardy", emoji: "🎲", tier: "legendary", channel: ["grid"], tone: "warn", needs: "question",
        blurb: "This question is worth double, but a miss costs double too.",
        run: function () { currentMultiplier = Math.max(currentMultiplier, 2); currentRisk = true; return "Double Jeopardy! Double points, and double the penalty if you miss."; } },
    g_play: { name: "Power Play", emoji: "⚡", tier: "legendary", channel: ["grid"], tone: "info", needs: "none",
        blurb: "Swaps your score with the team in front.",
        run: function (c) { const t = c.leader(); if (!t || t.id === c.p.id) return "Power Play: you are already leading, nothing to swap."; const tmp = c.p.score; c.p.score = t.score; t.score = tmp; return "Power Play! " + c.p.name + " and " + t.name + " swap scores."; } },
    g_eraser: { name: "Eraser", emoji: "🧽", tier: "epic", channel: ["grid"], tone: "info", needs: "target",
        blurb: "Wipes one rival's score back to zero.",
        run: function (c) { c.target.score = 0; return "Eraser! " + c.target.name + " is back to 0 pts."; } },
    g_gift: { name: "Gift", emoji: "🎁", tier: "epic", channel: ["grid"], tone: "good", needs: "target",
        blurb: "Hands 50 points to any player you pick, including yourself.",
        run: function (c) { c.target.score += 50; return "Gift! " + c.target.name + " receives 50 pts."; } },
    g_booster: { name: "Streak Booster", emoji: "🔥", tier: "common", channel: ["grid"], tone: "good", needs: "none",
        blurb: "Adds 2 to your current streak, closer to the streak bonus.",
        run: function () { currentStreak += 2; return "Streak boosted to 🔥 " + currentStreak + "."; } }
};

const LUCKY_IDS = Object.keys(POWERUPS).filter(function (id) { return POWERUPS[id].channel.indexOf('lucky') > -1; });
const GRID_IDS = Object.keys(POWERUPS).filter(function (id) { return POWERUPS[id].channel.indexOf('grid') > -1; });

/* =====================================================================
   GAME GUIDES
   ---------------------------------------------------------------------
   Every game used to announce itself out loud the moment it opened —
   is gone. The spoken explanation now lives here, behind the tutor's
   "How to play" button, and only plays when it is clicked.
   ===================================================================== */
const GUIDES = {
    practice: {
        emoji: '🎓', name: 'Practice Mode', tagline: 'Run through the lesson one card at a time, no scores, no rival teams.',
        setup: 'Works with a single learner: the whole lesson becomes a flip-card deck.',
        how: ['Tap the card to reveal the answer.', 'Use 🔊 to hear the question, 🎤 to have the learner answer out loud.', 'Work through the deck at whatever pace the lesson needs.'] ,
        winning: 'Nothing to win — this is the rehearsal. Every card is worth reading twice.',
        tips: ['Ideal for the first pass through new material.', 'Flip back to the front for a quick re-test at the end.'],
    },
    bamboozle: {
        emoji: '🔠', name: 'The Grid Arena', tagline: 'The main event — 64 numbered tiles, teams take turns picking one.',
        setup: 'Add 2+ teams on the setup screen, then pick this mode. Some tiles hide a question, some a 🍀 lucky card, some an ⚡ power-up.',
        how: ['A team picks a tile; a question opens with a 30-second timer.', 'The team answers out loud — you judge, or the learner taps an option.', 'Correct answers score the tile\u2019s points; wrong ones lose points and reset the streak.', 'Every 5 correct in a row earns a +50 streak bonus.'] ,
        winning: 'Most points when the last tile is gone wins. Because of the lucky cards, a last-place team can still take it.',
        tips: ['Open the power-up picker on the setup screen to set the chaos level (Classic Jr is the gentle one).', 'Click a team on the leaderboard to hand the turn to them manually.'],
    },
    pictionary: {
        emoji: '🎨', name: 'Pictionary', tagline: 'One person draws a scene from the lesson, the team works out what is happening.',
        setup: 'The scene is masked behind the eye button until the drawer has read it.',
        how: ['The drawer reveals the scene (👁) and reads it — then draws it with the on-screen tools.', 'The drawer talks while they draw: the class asks questions to work out what they mean.', 'You can paste in an image and drag it onto the canvas as a sticker.'] ,
        winning: 'The class scores when they describe the scene back in a full sentence. Faster, more points.',
        tips: ['Keep the scene hidden until the drawer has read it — the reading is part of the game.', 'Insist on questions, not guesses: “Is someone carrying something?” is the language practice.'],
    },
    concept: {
        emoji: '🔗', name: 'Concept Link', tagline: 'Three emojis, one hidden idea. The class has to find the link.',
        setup: 'Each round shows three icons and hides a keyword behind them.',
        how: ['Talk through the icons as a class.', 'Tap the hidden keyword to reveal it.', 'The class then explains the connection in a full sentence.'] ,
        winning: 'Points for the team that names the concept before the reveal.',
        tips: ['The icons are deliberately indirect — insist on reasoning, not shouting.'],
    },
    hot_seat: {
        emoji: '🔥', name: 'Hot Seat', tagline: 'One learner in the seat, five minutes, as many questions as they can survive.',
        setup: 'Pick the learner, then run the timer.',
        how: ['Questions come thick and fast — speak the answers.', 'Every correct answer adds to the round score.', 'The round ends when the timer sounds.'] ,
        winning: 'Highest round score. Play again with the next learner and compare.',
        tips: ['Reset the timer between learners for a fair comparison.'],
    },
    taboo: {
        emoji: '🚫', name: 'Taboo', tagline: 'Describe the word without saying the five forbidden ones.',
        setup: 'Each card carries a target word and five banned words.',
        how: ['One learner describes, the team guesses.', 'Say a forbidden word and the card is lost.', 'Tap the card to move to the next one.'] ,
        winning: 'Most cards described inside the time limit.',
        tips: ['Play as a class against the clock rather than team vs team for quieter groups.'],
    },
    alibi: {
        emoji: '🕵️', name: 'Alibi Puzzle', tagline: 'Five suspects, five stories, one of them is lying.',
        setup: 'Read the situation first — the contradiction hides in the details.',
        how: ['Play each suspect\u2019s alibi aloud with 🔊.', 'Interrogate: ask the class what does not add up.', 'Click the suspect you believe is guilty.'] ,
        winning: 'A correct accusation scores; a wrong one gives the suspect the round.',
        tips: ['Read the situation twice before any alibi — the clue is in the setup.'],
    },
    bomb: {
        emoji: '💣', name: 'Keep Talking', tagline: 'A bomb with a timer. Keep producing language until it is defused.',
        setup: 'Tasks appear one after another — no silence allowed.',
        how: ['Read the task and speak immediately.', 'Chain sentences: no long pauses, no repeats.', 'The timer keeps running whatever happens.'] ,
        winning: 'The class wins if it clears the tasks before the timer ends.',
        tips: ['Give the learner the first ten seconds to plan silently — it raises the quality.'],
    },
    sentiment: {
        emoji: '🎭', name: 'Sentiment Analyst', tagline: 'Say the line with the emotion on the card — the class guesses the feeling.',
        setup: 'Emotions range from Angry to Opera Singer to Robot.',
        how: ['The learner reads the line in the hidden emotion.', 'The class names the emotion.', 'Reveal to check.'] ,
        winning: 'Points for the reader when the class cannot tell, and for the class when it can.',
        tips: ['The funniest emotions are the ones that almost fit the sentence.'],
    },
    spyfall: {
        emoji: '🥷', name: 'Spyfall', tagline: 'Everyone knows the location — except one. Statements in turn, then accuse.',
        setup: 'Six characters; one is the spy and does not know the place.',
        how: ['Each character gives a statement about the location.', 'Discuss: who is being evasive?', 'Accuse the suspect.'] ,
        winning: 'Correct accusation scores for the class; a wrong one lets the spy escape.',
        tips: ['Ban naming the location in a statement — that is the whole game.'],
    },
    mafia: {
        emoji: '🕶️', name: 'Mafia: Hidden Roles', tagline: 'Eight characters speak in turn. Two are mafia. Nobody says so.',
        setup: 'A round deals 8 characters with avatars — 14 are available, so every round is a different line-up. Each character has one prepared statement.',
        how: ['Play the character lines in turn with 🔊, or hand each one to a learner to read out.', 'Discuss after each statement: who sounds too helpful?', 'Click the character you accuse, then lock the accusation in.', 'Reveal the roles and see whether the class caught it.'] ,
        winning: 'A correct accusation scores for the active team and adds to the streak. A wrong one hands the round to the accused.',
        tips: ['Statement difficulty is deliberate: every line fits at least two roles, so guessing from one sentence is meant to fail.', 'Press "Next round" for a fresh line-up — nothing is remembered between rounds.', 'Ask WHY before allowing an accusation — the reasoning is the lesson.'],
    },
    werewolf: {
        emoji: '🐺', name: 'Werewolf: Hidden Roles', tagline: 'The same social deduction, with the village roster — Seer, Healer, Witch and two wolves.',
        setup: '8 characters dealt from a pool of 14, two of them wolves, one Seer who must earn trust. The line-up changes every round.',
        how: ['Hear every statement in turn before arguing.', 'Ask each learner to nominate the least convincing character and say why.', 'Lock in one accusation for the team.', 'Reveal: the roles flip face-up on the board.'] ,
        winning: 'Correct accusation scores for the active team. Talking the class out of a wrong one is worth as much as being right.',
        tips: ['The village roster has more helpers than Mafia — use that to talk about how trust is built.', 'A helper who sounds evasive is the interesting one: Seer, Witch and Tanner all have reasons to be vague.'],
    },
};

/* =====================================================================
   HIDDEN ROLES — Mafia & Werewolf (social deduction)
   ---------------------------------------------------------------------
   Two complete rosters ship with the game so it is always playable, even
   when the generated lesson has no social_deduction items (sparse JSON has
   bitten this package before). When the lesson DOES carry them, those
   characters are used instead — see buildSocialRound.

   Every statement is written to fit at least two roles: the dangerous
   roles never sound dangerous, and nobody ever says their own role name.
   That is the difficulty setting.
   ===================================================================== */
const SOCIAL_ROSTERS = {
    mafia: {
        title: 'Sudden Company Reunion',
        setting: 'The boardroom door locks behind you: two of the eight people here worked against the company all along.',
        dangerousTeam: 'mafia',
        characters: [
            { name: 'Rocco', role: 'Mafia Boss', seed: 'hidden-rocco', line: 'Eight of us in one room and still nobody has mentioned the client list. I moved it somewhere safer last night, if that helps. I only want to know who was awake at two in the morning.' },
            { name: 'Lena', role: 'Goon', seed: 'hidden-lena', line: 'I copied the summary of the audit into my own notes so we would all have one. If a page went missing it was not from the pages I keep in my desk.' },
            { name: 'Inspector Vale', role: 'Detective', seed: 'hidden-vale', line: 'I met the person who filed the complaint. They described someone cheerful. Cheerful people are not always careless, but the timing of that cheerful one is interesting.' },
            { name: 'Dr. Amara', role: 'Doctor', seed: 'hidden-amara', line: 'I was in the clinic until midnight, and the last person I treated can confirm it. Whatever happened after that happened after I had switched the lights off.' },
            { name: 'Bruno', role: 'Bodyguard', seed: 'hidden-bruno', line: 'I stand where I am told to stand. Last night I was told to stand outside a closed office. I heard talking, but I could not tell how many people were talking.' },
            { name: 'Tad', role: 'Jester', seed: 'hidden-tad', line: 'Honestly? I am the one you should look at. I was nowhere near the building, I told nobody, and I have a very good reason for hiding in the car.' },
            { name: 'Marta', role: 'Villager', seed: 'hidden-marta', line: 'I gave the photocopier code to two colleagues, so anyone could have made that page. I trust both of them, which I accept is a strange thing to say today.' },
            { name: 'Gus', role: 'Villager', seed: 'hidden-gus', line: 'I finished at seven and went straight home. My neighbour can confirm the light in my kitchen, although I would rather nobody spoke to my neighbour.' },
            { name: 'Vittorio', role: 'Goon', seed: 'hidden-vittorio', line: 'I was on the phone to a supplier for most of the evening and the call is logged on my own phone, which I have not handed over because nobody has asked me properly.' },
            { name: 'Nino', role: 'Serial Killer', seed: 'hidden-nino', line: 'I come in through the side door because the front one sticks. I do that every night, and every night somebody tells me it is strange, and every night I do it again.' },
            { name: 'Sofia', role: 'Villager', seed: 'hidden-sofia', line: 'I left my coat on the chair when I went to get it out of the machine, so I was in and out of that room twice and I honestly could not tell you which time was which.' },
            { name: 'Elio', role: 'Villager', seed: 'hidden-elio', line: 'I only know what the schedule says, and the schedule had me on the third floor. I did not check the date on it, which in hindsight was careless.' },
            { name: 'Rosa', role: 'Villager', seed: 'hidden-rosa', line: 'I heard two people arguing and I told nobody, because it was not my business. If you want me to name them I can, but I do not think it will help you.' },
            { name: 'Nadia', role: 'Villager', seed: 'hidden-nadia', line: 'I took the client list home once, months ago, and brought it back the next morning. I would rather you heard that from me than from the log.' },
        ],
    },
    werewolf: {
        title: 'The Village Meeting',
        setting: 'The village alarm rang at dusk. Two of the eight people standing by the fountain are not what they say.',
        dangerousTeam: 'werewolf',
        characters: [
            { name: 'Maren', role: 'Alpha Wolf', seed: 'hidden-maren', line: 'I counted the sheep twice tonight and both counts matched. If something walked through the field it left no hoof marks, which I find reassuring and slightly insulting.' },
            { name: 'Ivo', role: 'Werewolf', seed: 'hidden-ivo', line: 'The fence on my side was already broken when the alarm rang. I fixed it this morning with two planks, and I would rather not explain where the planks came from.' },
            { name: 'Selka', role: 'Seer', seed: 'hidden-selka', line: 'I have seen the same shape twice this month, and both times the moon was old. I keep these things written down because my memory argues with me.' },
            { name: 'Brother Anselm', role: 'Healer', seed: 'hidden-anselm', line: 'I was boiling bandages when the alarm went off, so ask anyone who was in the courtyard. I did not count how many of them there were.' },
            { name: 'Tomas', role: 'Hunter', seed: 'hidden-tomas', line: 'My dogs slept through it, which has never happened before. A tired animal is not proof of anything except that the animal was tired.' },
            { name: 'Ysolde', role: 'Witch', seed: 'hidden-ysolde', line: 'I keep a jar of things I do not discuss. One spoonful went missing, and I am more annoyed about the spoon.' },
            { name: 'Pell', role: 'Tanner', seed: 'hidden-pell', line: 'I want you all to know I have been accused of this before and it was an excellent evening. Do with that what you like.' },
            { name: 'Greta', role: 'Villager', seed: 'hidden-greta', line: 'I slept through the alarm and I have the snoring witnesses to prove it. My husband says I did not move, which he also said the night before.' },
            { name: 'Rurik', role: 'Werewolf', seed: 'hidden-rurik', line: 'Something got into my henhouse and it did not eat anything, which is the part I keep coming back to. Whatever was in there was not there for the hens.' },
            { name: 'Neska', role: 'Villager', seed: 'hidden-neska', line: 'I was mending the mill wheel until it got dark and my hands show it. I did not see who passed the fountain, and I have stopped pretending otherwise.' },
            { name: 'Halvard', role: 'Villager', seed: 'hidden-halvard', line: 'I am old and I sleep badly, so I heard the alarm before most of you. I stayed inside, which I know is not the answer you are hoping for.' },
            { name: 'Petra', role: 'Villager', seed: 'hidden-petra', line: 'I came to the fountain for water and stayed because everyone else did. I have no reason to be standing in this line and I would like that noted.' },
            { name: 'Jonas', role: 'Villager', seed: 'hidden-jonas', line: 'I was at the far end of the row and my lantern went out. Relighting it took some time, and after that I could see almost nobody at all.' },
            { name: 'Annika', role: 'Villager', seed: 'hidden-annika', line: 'I have said less than everyone else tonight because I have been listening, and I have decided that is the safer position to hold.' },
        ],
    },
};

/* ---------------------------------------------------------------------
   THE TELLS — the difficulty dial.
   ---------------------------------------------------------------------
   Every statement above is written to fit at least two roles, which makes the
   round a genuine puzzle and, at its hardest, close to unfair for a class that
   has never played one before. So the round also carries optional *tells*: one
   extra sentence, in the same voice, that narrows the character towards their own
   team if you actually listen to it ("I only answer to one person in this room,
   and it is not the inspector.").

   The difficulty setting decides how many of those go into the round — never
   whether they are any good. Easy hands out three, at least one of them from the
   hidden side, so a class can practise the skill of listening past the alibi while
   still being able to reach an answer. Brutal hands out none, which is the version
   that teaches the class to argue about *reasoning* rather than to hunt a line.

   The end-of-round report names them afterwards, so the tell is a lesson and not
   an accident: "Rocco was the tell — the mafia boss said he only answered to one
   person, and the inspector was standing right there."
   --------------------------------------------------------------------- */
const SOCIAL_TELLS = {
    mafia: {
        'Mafia Boss': 'If you want to know who else was in on it, watch who defends me right now.',
        'Goon': 'I only answer to one person in this room, and it is not the inspector.',
        'Serial Killer': 'I do not care which side wins tonight. I have my own list and it is not finished.',
        'Detective': 'I checked one story before this meeting and it did not hold, so I know where to look next.',
        'Doctor': 'I was called to one person tonight and I will say it plainly: they are still here because of me.',
        'Bodyguard': 'Someone in this room is standing only because I stood in front of them, and I want no thanks for it.',
        'Jester': 'Whatever you decide about me, I have already won, and you will understand that in a moment.',
        'Villager': 'I will tell you exactly where I was and I will not change one word of it, because it is true.',
    },
    werewolf: {
        'Alpha Wolf': 'Two of us agreed before dusk on what to say, and one of us is speaking last on purpose.',
        'Werewolf': 'The plan was to say nothing unusual tonight, and I think I have managed that.',
        'Seer': 'I dreamed something about this room before the alarm, and it is why I am standing over here.',
        'Healer': 'I have already decided who I would help if this turns ugly, and they do not know it yet.',
        'Hunter': 'My dogs will follow only one trail tonight, and I have already chosen whose.',
        'Witch': 'I have something in my pocket that changes tonight, and I am not spending it on a guess.',
        'Tanner': 'Do not waste your vote on me — I have wanted you to do exactly that all evening.',
        'Villager': 'I have nothing beyond the truth, so here it is: I was at the fountain the whole time.',
    },
};

/** How many characters leak something, per difficulty. */
const SOCIAL_DIFFICULTY_TELLS = { easy: 3, standard: 2, brutal: 0 };
/* There was a sentence band here that spelled the deal out on the board: it
   announced, in front of the players, how many characters were leaking this round
   and how many tells to hunt for. That is the game. The difficulty buttons carry
   the same information for the tutor alone, and the end-of-round report names the
   real tell afterwards, where naming it actually teaches something. */
const SOCIAL_DIFF_KEY = 'pm_social_difficulty_v1';

function loadSocialDifficulty() {
    try {
        const raw = window.localStorage.getItem(SOCIAL_DIFF_KEY);
        if (raw && SOCIAL_DIFFICULTY_TELLS[raw] !== undefined) return raw;
    } catch (e) { /* private mode — standard is a fine default */ }
    return 'standard';
}

const SOCIAL_TEAM_LABEL = { mafia: 'Mafia', werewolf: 'Werewolf', neutral: 'Neutral', town: 'Town' };

let socialState = { variant: 'mafia', round: 0, characters: [], speaker: 0, auto: false, accusation: null, revealed: false, setting: '', title: '', timer: null, difficulty: 'standard', accusations: [], votes: {} };

/* ---------------------------------------------------------------------
   AUTO-READ — off unless the tutor asks for it.
   Games used to narrate themselves: a welcome on launch, then every
   question read out the moment it opened. On a projector that is loud,
   repetitive and impossible to stop. Speech is now opt-in per device:
   the header button turns it on, every card keeps its own 🔊 button, and
   every game guide has "Read aloud" for when you want the explanation
   spoken. Nothing speaks without a click.
   --------------------------------------------------------------------- */
/* ---------------------------------------------------------------------
   THE SCORE SHEET
   ---------------------------------------------------------------------
   One entry per answered cell (or per round of a special game): who answered,
   what they answered, whether they got it, how long they took and what it was
   worth. The end-of-game report is built from this, and so is the one-tap
   "re-ask what we missed" round — which is the part that turns a party game
   into a lesson.
   --------------------------------------------------------------------- */
let matchLog = [];
let pendingGridQuestions = null;   // set by the re-teach round, consumed by renderGrid
let gridRoundLabel = 'Round 1';

const AUTO_READ_KEY = 'pm_auto_read_v1';
/* The narrator's voice is remembered per browser, so a tutor picks it once — on
   any lesson — and every party game after that narrates in it. */
const HOST_VOICE_KEY = 'pm_host_voice_v1';
const CHAR_VOICE_KEY = 'pm_char_voices_v1';
let autoReadOn = false;
try { autoReadOn = window.localStorage.getItem(AUTO_READ_KEY) === '1'; } catch (e) { autoReadOn = false; }

function syncAutoReadButton() {
    const btn = document.getElementById('auto-read-btn');
    const label = document.getElementById('auto-read-label');
    if (!btn || !label) return;
    label.innerText = autoReadOn ? '🔊 Auto-read on' : '🔇 Auto-read off';
    btn.classList.toggle('btn-green', autoReadOn);
    btn.classList.toggle('btn-gray', !autoReadOn);
}

window.toggleAutoRead = function () {
    autoReadOn = !autoReadOn;
    try { window.localStorage.setItem(AUTO_READ_KEY, autoReadOn ? '1' : '0'); } catch (e) { /* ignore */ }
    if (!autoReadOn) { try { window.speechSynthesis.cancel(); } catch (e) { /* nothing playing */ } }
    syncAutoReadButton();
    pmNotify(autoReadOn ? '🔊 Auto-read on — new questions are read aloud.' : '🔇 Auto-read off — press 🔊 on any card to hear it.', 'info');
};

/* ---- power-up helpers ---- */
function pmRand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pmSorted() { return players.slice().sort(function (a, b) { return b.score - a.score; }); }
function pmOpponents(of) { return players.filter(function (pl) { return pl.id !== of.id; }); }
function pmTake(from, to, amt) { const a = Math.min(Math.max(0, amt), Math.max(0, from.score)); from.score -= a; to.score += a; return a; }
function pmDef(id) { return (id && POWERUPS[id]) ? POWERUPS[id] : null; }
function addQTime(sec) {
    qTimeLeft = Math.max(0, qTimeLeft) + sec;
    const el = document.getElementById('q-timer');
    if (el) el.innerText = qTimeLeft;
    if (qTimerInterval) startQTimer(qTimeLeft);
}

/* Non-blocking feedback. pmNotify() froze the game mid-turn (and on a projector
   that reads as a crash), so every message now floats up as a toast instead. */
function pmNotify(msg, tone) {
    if (msg === undefined || msg === null || msg === '') return;
    let wrap = document.getElementById('pm-toast-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'pm-toast-wrap';
        wrap.className = 'pm-toast-wrap';
        document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'pm-toast ' + (tone || 'info');
    el.innerText = String(msg);
    wrap.appendChild(el);
    while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
    setTimeout(function () {
        el.classList.add('out');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    }, 2800);
}

/* ---- which 🍀 cards are switched on (setup screen) ---- */
function powerupEnabled(id) {
    if (!enabledPowerups) loadPowerupPrefs();
    return enabledPowerups.has(id);
}
function loadPowerupPrefs() {
    enabledPowerups = null;
    try {
        const raw = window.localStorage.getItem('pm_powerups_v1');
        if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) enabledPowerups = new Set(arr.filter(function (id) { return !!pmDef(id) && POWERUPS[id].channel.indexOf('lucky') > -1; }));
        }
    } catch (e) { /* private mode / blocked storage */ }
    if (!enabledPowerups) enabledPowerups = new Set(LUCKY_IDS);
}
function savePowerupPrefs() {
    try { window.localStorage.setItem('pm_powerups_v1', JSON.stringify(Array.from(enabledPowerups))); } catch (e) { /* ignore */ }
}
function renderPowerupPicker() {
    if (!enabledPowerups) loadPowerupPrefs();
    const el = document.getElementById('powerup-picker');
    if (el) {
        el.innerHTML = LUCKY_IDS.map(function (id) {
            const def = POWERUPS[id];
            const on = enabledPowerups.has(id);
            return '<button type="button" class="pu-chip ' + (on ? 'on' : 'off') + ' pu-tier-' + def.tier + '" title="' + def.name + ': ' + def.blurb + '" data-pu="' + id + '" onclick="togglePowerup(this.dataset.pu)"><span class="pu-emo">' + def.emoji + '</span>' + def.name + '</button>';
        }).join('');
    }
    /* The count is shown in two places, both inside the game: the ⚡ row in the
       settings sheet and the footer of the picker itself. It is not on the setup
       screen (nothing about power-ups belongs before a game is chosen) and not in
       the toolbar of games that have no lucky cards at all. */
    const count = enabledPowerups.size;
    const countEl = document.getElementById('settings-powerups-count');
    if (countEl) countEl.innerText = count + ' of ' + LUCKY_IDS.length;
    const modalCount = document.getElementById('powerup-modal-count');
    if (modalCount) {
        modalCount.innerText = count === 0
            ? 'No lucky cards — every cell hides a question.'
            : count + ' of ' + LUCKY_IDS.length + ' lucky cards can appear (about ' + Math.round(64 * 0.15) + ' cells).';
    }
}

/* ---- the settings sheet ---- */
/* The header used to hold eight controls, which cost the board a row on every
   screen and showed power-ups in games that have none. One sheet, three groups,
   opened from the bar. Anything that opens another modal closes this first. */
window.openSettings = function () {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    syncSettingsSheet();
};
window.closeSettings = function () {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.style.display = 'none';
};
/* The sheet shows live state — how many lucky cards are in play, whether the
   board reads itself, and how many teams are in the room. */
function syncSettingsSheet() {
    const teams = document.getElementById('settings-teams');
    if (teams) teams.innerText = players.length + (players.length === 1 ? ' player' : ' players') + ' at the table';
    syncAutoReadButton();
    const roomEl = document.getElementById('settings-room-state');
    if (roomEl) roomEl.innerText = (typeof room !== 'undefined' && room && room.code)
        ? ('Room ' + room.code + ' is open — students can still join')
        : 'No room open';
}
/* Fitted type is measured against a frame, so a resize invalidates it. Debounced,
   because a drag fires this dozens of times a second. */
let pmResizeTimer = null;
window.addEventListener('resize', function () {
    if (pmResizeTimer) window.clearTimeout(pmResizeTimer);
    pmResizeTimer = window.setTimeout(function () {
        fitPracticeFaces();
        fitGamePanels();
        pmReaderFit();
        /* The drawing board keeps its pixels when the frame changes. */
        if (pmFab && pmFab._pmAlive) picResizeCanvas();
    }, 160);
});

/* ---- the power-up modal ---- */
window.openPowerupModal = function (mode) {
    window.closeSettings();
    pendingLaunchMode = mode || null;
    if (!enabledPowerups) loadPowerupPrefs();
    renderPowerupPicker();
    const go = document.getElementById('powerup-modal-go');
    const sub = document.getElementById('powerup-modal-sub');
    if (sub) sub.innerText = pendingLaunchMode
        ? 'Lucky cards are hidden inside the 8×8 grid. Choose the ones this class may find, then deal the board.'
        : 'Lucky cards are hidden inside the grid. Changes apply to the next board you deal.';
    if (go) go.style.display = pendingLaunchMode ? 'inline-flex' : 'none';
    document.getElementById('powerup-modal').style.display = 'flex';
};
window.closePowerupModal = function () {
    pendingLaunchMode = null;
    const modal = document.getElementById('powerup-modal');
    if (modal) modal.style.display = 'none';
};
window.confirmPowerupsAndStart = function () {
    const mode = pendingLaunchMode;
    powerupsConfirmed = true;
    pendingLaunchMode = null;
    const modal = document.getElementById('powerup-modal');
    if (modal) modal.style.display = 'none';
    if (mode) launchGame(mode, true);
};
window.togglePowerup = function (id) {
    if (!enabledPowerups) loadPowerupPrefs();
    if (enabledPowerups.has(id)) enabledPowerups.delete(id); else enabledPowerups.add(id);
    savePowerupPrefs(); renderPowerupPicker();
};
window.setAllPowerups = function (on) {
    enabledPowerups = on ? new Set(LUCKY_IDS) : new Set();
    savePowerupPrefs(); renderPowerupPicker();
    pmNotify(on ? "All " + LUCKY_IDS.length + " lucky cards are in play." : "Lucky cards off: every card hides a question.", 'info');
};
window.presetPowerups = function (which) {
    /* Classic Jr is the Baamboozle set for younger learners: only Gift and Baam. */
    enabledPowerups = new Set(which === 'jr' ? ['gift', 'baam'] : LUCKY_IDS);
    savePowerupPrefs(); renderPowerupPicker();
    pmNotify(which === 'jr' ? "Classic Jr: Gift and Baam only." : "Classic: all " + LUCKY_IDS.length + " Baamboozle cards.", 'info');
};

let specialQueue = []; 
let practiceQueue = [];
let practiceIndex = 0;

// Define special question types that should NOT be in the main grid or standard practice
const specialTypes = ['pictionary', 'concept_icons', 'hot_seat', 'taboo_titan', 'drawing_duel', 'charades', 'alibi_puzzle', 'keep_talking', 'sentiment_analyst', 'spyfall', 'social_deduction'];
/* Games that were taken out of the arena. A lesson generated before that still
   carries their cards, and a card whose game no longer exists would otherwise
   land on the 8x8 board as a tile that opens nothing — so they are filtered out
   of every deck instead of being played. */
const RETIRED_TYPES = ['avatar_bingo', 'speed_reader'];
const isGridQuestion = function (q) {
    return !!q && specialTypes.indexOf(q.type) < 0 && RETIRED_TYPES.indexOf(q.type) < 0;
};

function init() {
    /* A share link opens this file with ?room=CODE: that device is a student's
       phone, so it becomes the answer screen and nothing else runs. */
    const joinCode = pmCodeFromUrl();
    if (joinCode) { startGuestMode(joinCode); return; }

    // The tutor opens the table when the lesson knows who they are, then the learner.
    // Both photos come from the dashboard; the dicebear avatar is only a last resort.
    if (gameData.tutor && gameData.tutor.name) {
        addPlayerInternal(gameData.tutor.name, gameData.tutor.avatar || ("https://api.dicebear.com/9.x/notionists/svg?seed=" + gameData.tutor.name), 'tutor');
    }
    addPlayerInternal(learnerData.name, gameData.learnerAvatar || ("https://api.dicebear.com/9.x/notionists/svg?seed=" + learnerData.name), 'learner');
    loadPowerupPrefs();
    renderPowerupPicker();
    syncAutoReadButton();
    renderRoomPanel();
    window.speechSynthesis.onvoiceschanged = populateVoices;
    populateVoices();
    
    /* Paste a picture straight onto the drawing board. It arrives as a normal
       Fabric object, so it can be dragged, scaled and rotated like any shape. */
    window.addEventListener('paste', (e) => {
        if (selectedGameMode !== 'pictionary') return;
        const c = picEngine();
        if (!c) return;
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    fabric.Image.fromURL(event.target.result, function (img) {
                        const max = Math.min(c.getWidth() * 0.5, 320);
                        const scale = Math.min(1, max / Math.max(1, img.width));
                        img.set({ left: c.getWidth() * 0.2, top: c.getHeight() * 0.2, scaleX: scale, scaleY: scale });
                        c.add(img);
                        picRailActivate('select');
                        picApplyBrush();
                        c.setActiveObject(img);
                        picCommit();
                        c.requestRenderAll();
                    });
                };
                reader.readAsDataURL(blob);
            }
        }
    });
    
    document.body.addEventListener('mousemove', (e) => {
        if (document.body.classList.contains('laser-active')) {
            const dot = document.getElementById('global-laser-dot');
            if (dot) {
                dot.style.left = e.clientX + 'px';
                dot.style.top = e.clientY + 'px';
            }
        }
    });
}

/* One place that turns whatever the app calls a voice (a URI, a display name, or
   a fragment like "Jenny") into a real SpeechSynthesisVoice. The dashboard stores
   URIs, the app's presets store names, and a browser that has not loaded its voice
   list yet matches nothing — all three used to end with the narrator silently
   falling back to the robotic default. */
function pmFindVoice(voices, wanted) {
    if (!wanted) return null;
    /* A resolved SpeechSynthesisVoice was passed straight in. This is how every
       character speaks, and String(voice) is "[object SpeechSynthesisVoice]" —
       which matched nothing, so every character fell silently back to the
       narrator's voice and a woman spoke in a man's voice all lesson. */
    if (typeof wanted === 'object' && wanted.voiceURI) {
        return (voices || []).filter(function (v) { return v.voiceURI === wanted.voiceURI; })[0] || wanted;
    }
    const raw = String(wanted);
    const w = raw.toLowerCase();
    const list = voices || [];
    return list.filter(function (v) { return v.voiceURI === raw; })[0]
        || list.filter(function (v) { return v.name.toLowerCase() === w; })[0]
        || list.filter(function (v) { return v.name.toLowerCase().indexOf(w) > -1; })[0]
        || list.filter(function (v) { return w.indexOf(v.name.toLowerCase()) > -1 && v.name.length > 6; })[0]
        || null;
}

function populateVoices() {
    const voices = window.speechSynthesis.getVoices();
    const select = document.getElementById('host-voice-select');
    if (!select) return;
    select.innerHTML = '<option value="">Select Host Voice</option>';
    voices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.text = v.name + ' (' + v.lang + ')';
        select.appendChild(opt);
    });
    // Priority: the voice already chosen here (this session or last time) -> the
    // read-aloud voice from the dashboard -> the first voice the browser offers.
    if (!hostVoice) hostVoice = pmFindStoredHostVoice() || learnerData.voice || '';
    const match = pmFindVoice(voices, hostVoice);
    if (match) { hostVoice = match.voiceURI; select.value = match.voiceURI; }
    else if (voices.length > 0) {
        // Nothing chosen anywhere: prefer the most natural installed voice over
        // whichever one the browser happens to list first.
        const best = bestNaturalVoice();
        hostVoice = (best && best.voiceURI) || voices[0].voiceURI;
        select.value = hostVoice;
    }
    assignCharacterVoices();
}

function pmFindStoredHostVoice() {
    try { return window.localStorage.getItem(HOST_VOICE_KEY) || ''; } catch (e) { return ''; }
}

function updateHostVoice() {
    hostVoice = document.getElementById('host-voice-select').value;
    try { window.localStorage.setItem(HOST_VOICE_KEY, hostVoice); } catch (e) { /* ignore */ }
    assignCharacterVoices();
}

function goToModeSelect() {
    window.closeSettings();
    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('mode-select-view').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    // No game is on screen, so nothing is "the Grid Arena" any more.
    document.body.classList.remove('is-grid');
}
window.exitToMenu = function() {
    // Smart exit: if in a game -> back to game select, if in game select -> back to setup
    const appVisible = document.getElementById('app-container').style.display !== 'none';
    const modeSelectVisible = document.getElementById('mode-select-view').style.display !== 'none';
    if (appVisible) {
        // close any open game overlay first
        document.querySelectorAll('.special-game-overlay').forEach(el => el.style.display = 'none');
        /* Practice re-lays-out the shell it borrowed (fixed overlay, no header, a
           flush game area). Hand it back before the next game measures itself, or
           the board inherits a zero-padding frame and a stale stacking order. */
        const practice = document.getElementById('view-practice');
        if (practice) { practice.style.position = ''; practice.style.zIndex = ''; }
        const area = document.querySelector('.game-area');
        if (area) area.style.padding = '';
        goToModeSelect();
    } else if (modeSelectVisible) {
        document.getElementById('mode-select-view').style.display = 'none';
        document.getElementById('setup-view').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    } else {
        goToModeSelect();
    }
};

function launchGame(mode, powerupsReady) {
    /* The Grid Arena is the one board whose contents depend on the power-up set, so
       its picker opens right here — the moment the tutor chooses the game — and the
       board is dealt only after they confirm. Every other mode starts immediately. */
    if (mode === 'bamboozle' && !powerupsReady && !powerupsConfirmed) {
        openPowerupModal(mode);
        return;
    }
    selectedGameMode = mode;
    powerupsConfirmed = true;
    specialQueue = [];

    /* Power-ups are dealt by the 8×8 board and by nothing else, so every control
       for them — the toolbar chip, the inventory, the effects box and the
       who-is-holding-what row — appears only while the Grid Arena is the game.
       In the other modes they were clutter the class could see on the projector. */
    const appRoot = document.getElementById('app-container');
    if (appRoot) appRoot.classList.toggle('is-grid', mode === 'bamboozle');
    /* Also on <body>, because the settings sheet lives OUTSIDE #app-container: it
       is a modal over everything, so scoping the rule to the container alone left
       "Power-Ups in play" sitting in the Werewolf settings — exactly what the tutor
       asked not to see outside the Grid Arena. */
    document.body.classList.toggle('is-grid', mode === 'bamboozle');
    
    
    document.querySelectorAll('.special-game-overlay').forEach(el => el.style.display = 'none');
    
    if (mode === 'practice') {
        document.getElementById('setup-view').style.display = 'none';
        document.getElementById('mode-select-view').style.display = 'none';
        document.getElementById('app-container').style.display = 'grid'; 
        document.querySelector('.header').style.display = 'none';
        document.querySelector('.sidebar').style.display = 'none';
        document.querySelector('.game-area').style.padding = '0';
        
        const overlay = document.getElementById('view-practice');
        overlay.style.display = 'flex';
        overlay.style.position = 'fixed'; 
        overlay.style.zIndex = '9999';
        
        practiceQueue = gameData.questions.filter(isGridQuestion);
        practiceIndex = 0;
        loadPracticeCard();
        return;
    }

    document.getElementById('mode-select-view').style.display = 'none';
    /* The front door and the game picker are both hidden here, not just the
       picker. Launching a game used to assume the picker had already been
       dismissed; if anything reached launchGame directly, setup stayed on screen
       and ate ~390px of the frame, which shrank the drawing board with it. */
    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('app-container').style.display = 'grid';
    document.querySelector('.header').style.display = 'flex';
    document.querySelector('.sidebar').style.display = 'flex';
    document.querySelector('.game-area').style.padding = '20px';
    
    startGlobalTimer(); 

    if (mode === 'bamboozle') {
        document.getElementById('game-grid').style.display = 'grid';
        renderGrid();
        highlightActivePlayer();
        /* No spoken welcome any more — it used to fire on every launch, in front of
           the class, whether or not anyone wanted it. The Guide button explains the
           game on demand instead. */
    } else {
        document.getElementById('game-grid').style.display = 'none';
        
        // Filter questions based on mode
        let type = '';
        if (mode === 'pictionary') type = 'pictionary';
        else if (mode === 'concept') type = 'concept_icons';
        else if (mode === 'hot_seat') type = 'hot_seat';
        else if (mode === 'taboo') type = 'taboo_titan';
        else if (mode === 'alibi') type = 'alibi_puzzle';
        else if (mode === 'bomb') type = 'keep_talking';
        else if (mode === 'sentiment') type = 'sentiment_analyst';
        else if (mode === 'spyfall') type = 'spyfall';
        else if (mode === 'mafia' || mode === 'werewolf') type = 'social_deduction';

        if (mode === 'mafia' || mode === 'werewolf') {
            launchSocialGame(mode);
        } else if(type) {
            specialQueue = gameData.questions.filter(q => q.type === type);
            // Ensure we have multiple rounds for specific games
            if (['spyfall', 'sentiment_analyst'].includes(type) && specialQueue.length < 3) {
                // If not enough unique, duplicate what we have for flow testing
                while(specialQueue.length < 3 && specialQueue.length > 0) specialQueue.push({...specialQueue[0], id: specialQueue[0].id + '_copy'});
            }
            if (specialQueue.length === 0 && !['pictionary', 'concept_icons', 'hot_seat', 'taboo_titan'].includes(type)) { 
                pmNotify('No data found for this mode. Please regenerate with new options.'); 
                return; 
            }
            if (specialQueue.length === 0) specialQueue = gameData.questions; // Fallback
            
            // Randomize queue for new games
            specialQueue.sort(() => Math.random() - 0.5);
            nextSpecialQuestion();
        } else {
            pmNotify("Mode under construction.");
        }
    }
    renderLeaderboard();
}

/* ============================================================
   FITTING TEXT TO ITS FRAME
   ------------------------------------------------------------
   Two places put an unpredictable amount of text into a fixed box: a flashcard
   (a two-line question or a two-hundred-word mini lesson) and the spoken panels
   in Spyfall and Alibi (statements of fifty words, alibis of eighty). Both are
   fitted the same way — a binary search for the largest font size whose
   scrollHeight still fits the box — so the type is as large as the space allows
   and never spills outside the frame. Called after content changes, after a
   flip, and (debounced) on resize.
   ============================================================ */
function fitFontToBox(el, minSize, maxSize) {
    if (!el) return;
    if (el.clientHeight <= 0) return;                 // hidden: nothing to measure
    const lo0 = minSize || 11;
    const hi0 = Math.max(lo0, maxSize || el.clientHeight / 3.5);
    let lo = lo0, hi = hi0, best = lo0;
    for (let i = 0; i < 11; i++) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = mid.toFixed(2) + 'px';
        if (el.scrollHeight <= el.clientHeight + 1) { best = mid; lo = mid; }
        else { hi = mid; }
    }
    el.style.fontSize = Math.max(lo0, Math.floor(best)) + 'px';
}

/** The biggest the card's type can be without the content leaving the card.
 *  The floor is readable type, not zero: a card whose mini lesson is genuinely too
 *  long for the frame stops shrinking at 13px and scrolls, because 9px text that
 *  technically fits is worse than a scrollbar nobody has to touch. */
function fitPracticeFaces() {
    const card = document.getElementById('practice-card');
    if (!card) return;
    ['front', 'back'].forEach(function (side) {
        const face = card.querySelector('.face.' + side);
        if (!face) return;
        const cap = Math.max(16, Math.min(30, Math.round(face.clientHeight / 20)));
        fitFontToBox(face, 13, cap);
    });
}

/** Long options read better stacked than squeezed into two columns. */
function layoutPracticeOptions() {
    const grid = document.getElementById('prac-options');
    if (!grid) return;
    const longest = Math.max.apply(null, Array.prototype.map.call(grid.children, function (b) {
        return (b.innerText || '').length;
    }).concat([0]));
    grid.classList.toggle('one-col', longest > 26);
}

window.togglePracticeFlip = function () {
    const card = document.getElementById('practice-card');
    if (!card) return;
    card.classList.toggle('flipped');
    /* The face that was hidden while the class read the question has never been
       measured — it is resized the moment it comes forward. */
    window.requestAnimationFrame(fitPracticeFaces);
};

// --- PRACTICE MODE LOGIC ---
function loadPracticeCard() {
    if (practiceQueue.length === 0) {
        document.getElementById('prac-q').innerText = "No suitable questions found.";
        return;
    }

    if (practiceIndex < 0) practiceIndex = practiceQueue.length - 1;
    if (practiceIndex >= practiceQueue.length) practiceIndex = 0;
    
    const q = practiceQueue[practiceIndex];
    /* Practice never used to claim currentQuestion, so the hint button and the
       answer key were reading whatever card the last game left behind. */
    currentQuestion = q;
    window.pmAnswerKeyRender();
    
    document.getElementById('practice-counter').innerText = (practiceIndex + 1) + '/' + practiceQueue.length;
    document.getElementById('prac-skill').innerText = q.skill || 'General';
    document.getElementById('prac-level').innerText = q.difficultyLevel || 'Std';
    document.getElementById('prac-q').innerText = q.question.replace(/^Question:/i, '').trim();
    
    const contextBox = document.getElementById('prac-context');
    contextBox.innerHTML = '';
    contextBox.style.display = 'none';

    if (q.context) {
        const cleanContext = q.context.replace(/^(Context|Text|Grammar Note):/i, '').trim();
        contextBox.style.display = 'block';
        if (q.type === 'listening_comp') {
            contextBox.innerHTML = \`<button class="btn-action btn-blue" style="width:100%;" onclick="event.stopPropagation(); playTTS(decodeURIComponent('\${encodeURIComponent(cleanContext)}'))"><i class="fas fa-volume-up"></i> Play Audio Segment</button>\`;
        } else {
            contextBox.innerHTML = \`<div class="q-context-box">\${cleanContext.replace(/\\n/g, '<br>')}</div>\`;
        }
    }

    const optionsContainer = document.getElementById('prac-options');
    optionsContainer.innerHTML = '';
    
    if (q.options && q.options.length > 0) {
        optionsContainer.style.display = 'grid';
        // Randomize options for display
        const shuffled = [...q.options].sort(() => Math.random() - 0.5);
        shuffled.forEach(opt => {
            const btn = document.createElement('div'); 
            btn.className = 'prac-opt-btn'; 
            btn.innerText = opt;
            btn.onclick = (e) => {
                e.stopPropagation();
                if(opt === q.answer || opt === "True" && q.answer === "True") {
                    btn.classList.add('correct');
                    playTTS("Correct!");
                } else {
                    btn.classList.add('wrong');
                    playTTS("Try again.");
                }
            };
            optionsContainer.appendChild(btn);
        });
    } else {
        optionsContainer.style.display = 'none';
    }

    document.getElementById('prac-a').innerText = q.answer;
    
    let feedbackHtml = '';
    if(q.explanation) feedbackHtml += \`<div class="fb-block"><h4><i class="fas fa-info-circle"></i> Why?</h4><p>\${q.explanation}</p></div>\`;
    if(q.deepDive) feedbackHtml += \`<div class="fb-block"><h4><i class="fas fa-microscope"></i> Deep Dive</h4><p>\${q.deepDive}</p></div>\`;
    if(q.examples && q.examples.length) feedbackHtml += \`<div class="fb-block"><h4><i class="fas fa-list-ul"></i> Examples</h4><ul>\${q.examples.map(ex => \`<li>\${ex}</li>\`).join('')}</ul></div>\`;
    if(q.speakingCCQ) feedbackHtml += \`<div class="fb-block"><h4><i class="fas fa-comment"></i> Concept Check</h4><p>\${q.speakingCCQ}</p></div>\`;

    document.getElementById('prac-feedback-area').innerHTML = feedbackHtml;
    document.querySelector('.practice-card').classList.remove('flipped');
    layoutPracticeOptions();
    // Measure after the browser has laid the new content out, not before.
    window.requestAnimationFrame(fitPracticeFaces);
}

window.showPracticeHint = (e) => {
    e.stopPropagation();
    const q = practiceQueue[practiceIndex];
    const hint = q.hint || "Listen closely to the question.";
    playTTS(hint);
}

window.navPractice = (dir) => {
    practiceIndex += dir;
    loadPracticeCard();
};

function addPlayer() {
    const input = document.getElementById('player-input');
    const name = input.value.trim();
    if(!name) return;
    addPlayerInternal(name, "https://api.dicebear.com/9.x/notionists/svg?seed=" + name);
    input.value = '';
}
window.addSetupPlayer = addPlayer;

/* One place where a player joins the table, so the tutor, the learner and anyone
   typed into the box all end up with the same shape (including the role, which the
   setup list and the leaderboard use to badge them). A name already at the table is
   never added twice — pressing “Add Tutor” twice used to create a second tutor. */
function addPlayerInternal(name, avatar, role) {
    const clean = String(name || '').trim() || 'Player';
    const existing = players.filter(function (p) { return p.name.toLowerCase() === clean.toLowerCase(); })[0];
    if (existing) { renderSetupList(); return existing; }
    const player = {
        id: Date.now() + Math.random(),
        name: clean,
        avatar,
        score: 0,
        inventory: [],
        role: role || 'player'
    };
    players.push(player);
    renderSetupList();
    return player;
}

/* The tutor plays too. Their name and photo are resolved by the generator from the
   Adult Dashboard (gameData.tutor), so this button needs no typing and no file
   picker — the photo is already the same one the dashboard shows. */
window.addTutorPlayer = function () {
    const t = gameData.tutor;
    const already = players.filter(function (p) { return p.role === 'tutor'; })[0];
    if (already) { pmNotify('👨‍🏫 ' + already.name + ' is already at the table.', 'info'); return; }
    if (!t || !t.name) {
        pmNotify('No tutor profile on this lesson yet — check the tutor details in Lesson Settings.', 'warn');
        return;
    }
    addPlayerInternal(t.name, t.avatar || '', 'tutor');
    pmNotify('👨‍🏫 ' + t.name + ' joined — photo from your Adult Dashboard.', 'good');
    highlightActivePlayer();
};

window.removePlayer = (id) => { players = players.filter(p => p.id !== id); renderSetupList(); }

window.setCurrentPlayer = (index) => {
    currentPlayerIndex = index;
    highlightActivePlayer();
}

function renderSetupList() {
    const list = document.getElementById('setup-list');
    if (!list) return;
    list.innerHTML = players.map(p => \`
        <span class="setup-seat role-\${p.role || 'player'}">
            <img src="\${p.avatar}" alt="">
            <span>\${p.role === 'tutor' ? '👨‍🏫 ' : (p.role === 'learner' ? '🎓 ' : '')}\${p.name}</span>
            <button onclick="removePlayer(\${p.id})" title="Remove \${p.name}" aria-label="Remove \${p.name}">&times;</button>
        </span>
    \`).join('');
}

/* Which questions make a board, and where the 🍀 / ⚡ cells fall. Split out of
   renderGrid so the re-teach round deals "the cards this class missed" through
   exactly the same code path as a normal board. */
function dealGridQuestions(questions, totalCells) {
    const pool = (questions || []).filter(Boolean).slice();
    if (!pool.length) return [];
    pool.sort(function () { return Math.random() - 0.5; });
    // Repeat only when the deck is genuinely shorter than the board, and reshuffle
    // each pass, so a repeat never lands in the same position twice.
    let deck = pool.slice();
    while (deck.length < totalCells) deck = deck.concat(pool.slice().sort(function () { return Math.random() - 0.5; }));
    const luckyIndices = new Set();
    while (luckyIndices.size < Math.floor(totalCells * 0.15)) luckyIndices.add(Math.floor(Math.random() * totalCells));
    const powerupIndices = new Set();
    while (powerupIndices.size < Math.floor(totalCells * 0.2)) {
        const idx = Math.floor(Math.random() * totalCells);
        if (!luckyIndices.has(idx)) powerupIndices.add(idx);
    }
    const items = [];
    for (let i = 0; i < totalCells; i++) {
        const q = deck[i % deck.length];
        const pu = powerupIndices.has(i) ? GRID_IDS[Math.floor(Math.random() * GRID_IDS.length)] : null;
        items.push({ ...q, gridId: i + 1, taken: false, isLucky: luckyIndices.has(i), hiddenPowerup: pu });
    }
    return items;
}

function renderGrid() {
    if (gridItems.length === 0) {
        const pool = gameData.questions.filter(isGridQuestion);
        const reteach = (pendingGridQuestions || []).filter(Boolean);
        const source = reteach.length ? reteach : pool;
        // A re-teach board is exactly as big as the misses — one missed card is a
        // one-card round, not the same question eight times.
        const totalCells = reteach.length ? Math.min(64, reteach.length) : 64;
        gridItems = dealGridQuestions(source, totalCells);
        pendingGridQuestions = null;
        if (!gridItems.length) { pmNotify('No suitable questions found for Grid mode.', 'warn'); return; }
        /* A deck shorter than the board means the class sees the same card twice.
           That is worth saying out loud: it is the one thing a competitive class
           notices, and the fix is on the Copy AI prompt (64 unique grid cards). */
        if (!reteach.length && pool.length < 64) {
            pmNotify('This lesson has ' + pool.length + ' grid questions, so the board repeats some. Regenerate with the Copy AI prompt for 64 unique cards.', 'warn');
        }
    }
    const grid = document.getElementById('game-grid');
    if (!grid) return;
    // 64 cards is an 8×8 board; a re-teach board is as big as the misses, so the
    // columns follow the count instead of stretching 12 cards across 8 columns.
    const cols = gridItems.length === 64 ? 8 : Math.min(8, Math.max(4, Math.ceil(Math.sqrt(gridItems.length))));
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    grid.innerHTML = gridItems.map(item => \`
        <div class="game-card \${item.taken ? 'answered' : ''} \${item.isLucky && item.taken ? 'lucky' : ''}" onclick="clickCard(\${item.gridId - 1})">
            \${item.taken ? (item.isLucky ? '🍀' : (item.hiddenPowerup ? '⚡' : '')) : item.gridId}
        </div>
    \`).join('');
    renderHoldings();
}

function highlightActivePlayer() {
    const activePlayer = players[currentPlayerIndex];
    document.getElementById('active-name-large').innerText = activePlayer.name;
    document.getElementById('active-avatar-large').src = activePlayer.avatar;
    
    renderInventory(activePlayer);
    renderLeaderboard();
}

/* The sidebar inventory, drawn from the registry so a power-up can never appear
   as a bare name whose effect lives (or does not live) somewhere else. */
function renderInventory(activePlayer) {
    const invContainer = document.getElementById('active-inventory');
    if (!invContainer) return;
    if (activePlayer.inventory && activePlayer.inventory.length > 0) {
        invContainer.innerHTML = activePlayer.inventory.map(function (id, i) {
            const def = pmDef(id) || { name: String(id), emoji: '✨', tier: 'common', blurb: 'Bonus power-up' };
            return '<button class="inv-item" data-tier="' + def.tier + '" title="' + def.name + ': ' + def.blurb + '" data-pu="' + id + '" data-i="' + i + '" onclick="activatePowerup(this.dataset.pu, parseInt(this.dataset.i, 10))"><span>' + def.emoji + '</span> ' + def.name + '</button>';
        }).join('');
    } else {
        invContainer.innerHTML = '<span style="color:#999; font-size:0.8rem;">No power-ups yet</span>';
    }
    refreshQuestionSlots();
}

/* The three slots in the question header were hard-coded to p.inventory[0..2],
   so a fourth power-up was unreachable mid-question. Now the strip is built
   from the live inventory and scrolls if the team is carrying a lot. */
function refreshQuestionSlots() {
    const strip = document.getElementById('header-powerups');
    if (!strip) return;
    const p = players[currentPlayerIndex];
    if (!p || !p.inventory || p.inventory.length === 0) {
        strip.innerHTML = '<span style="color:var(--gray); font-size:0.8rem; font-weight:700;">No power-ups</span>';
        return;
    }
    strip.innerHTML = p.inventory.map(function (id, i) {
        const def = pmDef(id) || { name: String(id), emoji: '✨', tier: 'common', blurb: 'Bonus power-up' };
        return '<button type="button" class="pu-slot filled" title="' + def.name + ': ' + def.blurb + '" data-pu="' + id + '" data-i="' + i + '" onclick="activatePowerup(this.dataset.pu, parseInt(this.dataset.i, 10))">' + def.emoji + ' ' + def.name + '</button>';
    }).join('');
}

/* ---- floating score pops ----
   A score that only changes a number is invisible from the back of the room. Every
   point change also floats up from the team that earned it, so the class sees who
   just scored without looking away from the board. */
function pmPop(text, tone, anchorEl) {
    if (!text) return;
    let layer = document.getElementById('pm-pop-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'pm-pop-layer';
        layer.className = 'pm-pop-layer';
        document.body.appendChild(layer);
    }
    const el = document.createElement('div');
    el.className = 'pm-score-pop ' + (tone || 'info');
    el.innerText = text;
    let x = window.innerWidth - 260;
    let y = window.innerHeight / 2;
    try {
        const anchor = anchorEl || document.querySelector('.player-card.active') || document.getElementById('active-avatar-large');
        if (anchor) {
            const r = anchor.getBoundingClientRect();
            x = r.left + (r.width / 2) - 40;
            y = r.top;
        }
    } catch (e) { /* fall back to the default spot */ }
    el.style.left = Math.max(8, Math.min(x, window.innerWidth - 140)) + 'px';
    el.style.top = Math.max(8, y) + 'px';
    layer.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1700);
}

/* ---- who is holding what ---- */
function renderHoldings() {
    const el = document.getElementById('pm-holdings');
    if (!el) return;
    if (!players.length) { el.innerHTML = ''; return; }
    el.innerHTML = players.map(function (p) {
        const chips = (p.inventory || []).map(function (id) {
            const def = pmDef(id) || { emoji: '✨', name: String(id) };
            return '<span class="pm-hold-chip" title="' + def.name + '">' + def.emoji + '</span>';
        }).join('');
        return '<span class="pm-hold-chip"><img src="' + p.avatar + '" alt=""><span class="pm-hold-name">' + p.name + '</span> '
            + (chips || '<span style="opacity:.5;">–</span>') + '</span>';
    }).join('');
}

/* Keep the last score each team had, so a change can be animated (and announced). */
let pmLastScores = {};

function renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    const sorted = [...players].sort((a,b) => b.score - a.score);
    
    const effectsList = document.getElementById('active-effects-list');
    if (effectsList) {
        if (currentMultiplier > 1) {
            effectsList.innerHTML = \`<span class="effect-badge">x\${currentMultiplier} Points</span>\`;
            document.getElementById('active-effects-box').style.display = 'block';
        } else {
            effectsList.innerHTML = '';
            document.getElementById('active-effects-box').style.display = 'none';
        }
    }

    /* FLIP: remember where every team's row was, then redraw. A team that overtook
       another slides into its new place instead of teleporting — on a projector a
       silent jump is easy to miss entirely, which is the opposite of the point. */
    const before = {};
    Array.prototype.forEach.call(list.children, function (el) {
        const pid = el.getAttribute && el.getAttribute('data-pid');
        if (pid) before[pid] = el.getBoundingClientRect().top;
    });

    list.innerHTML = sorted.map((p, index) => {
        const realIndex = players.findIndex(pl => pl.id === p.id);
        const isActive = players[currentPlayerIndex].id === p.id;
        const bumped = pmLastScores[p.id] !== undefined && p.score !== pmLastScores[p.id];
        return \`
        <div class="player-card \${isActive ? 'active' : ''}" data-pid="\${p.id}" onclick="setCurrentPlayer(\${realIndex})">
            <div class="player-card-header">
                <span class="pm-rank">\${index + 1}</span>
                <img src="\${p.avatar}" class="player-avatar">
                <div class="player-info">
                    <div class="player-name">\${p.role === 'tutor' ? '👨‍🏫 ' : (p.role === 'learner' ? '🎓 ' : '')}\${p.name}</div>
                    <div class="player-score \${bumped ? 'pm-score-bump' : ''}" data-score="\${p.score}">\${p.score} pts</div>
                </div>
                \${(p.inventory && p.inventory.length) ? '<i class="fas fa-bolt" style="color:var(--purple); margin-left:5px;" title="Holding ' + p.inventory.length + ' power-up(s)"></i>' : ''}
                <button onclick="event.stopPropagation(); removePlayer(\${p.id})" class="remove-player-btn">&times;</button>
            </div>
        </div>
        \`;
    }).join('');

    Array.prototype.forEach.call(list.children, function (el) {
        const pid = el.getAttribute('data-pid');
        const from = pid ? before[pid] : undefined;
        if (from === undefined) return;
        const delta = from - el.getBoundingClientRect().top;
        if (!delta) return;
        el.classList.add('pm-moved');
        if (delta > 0) el.classList.add('pm-rank-up');
        el.style.transform = 'translateY(' + delta + 'px)';
        el.style.transition = 'none';
        requestAnimationFrame(function () {
            el.style.transition = 'transform .55s cubic-bezier(.2,.8,.2,1)';
            el.style.transform = 'translateY(0)';
            setTimeout(function () { el.classList.remove('pm-moved', 'pm-rank-up'); }, 700);
        });
    });

    pmLastScores = {};
    players.forEach(function (p) { pmLastScores[p.id] = p.score; });
    renderHoldings();
}

/* =====================================================================
   SCORE SHEET, END-OF-GAME REPORT, RE-TEACH ROUND
   ===================================================================== */
function logOutcome(success, meta) {
    const q = currentQuestion || {};
    const p = players[currentPlayerIndex];
    if (!p) return;
    const extra = meta || {};
    const entry = {
        gridId: (q.gridId !== undefined && q.gridId !== null) ? q.gridId : null,
        questionId: q.id || extra.id || '',
        question: String(q.question || q.title || extra.label || '').replace(/^Question:/i, '').trim(),
        skill: q.skill || extra.skill || '',
        type: q.type || extra.type || '',
        // The CEFR point the card tests (tagged by the generator) — this is what
        // turns the sheet into a teaching plan instead of a scorecard.
        cefrTopic: q.cefrTopic || '',
        cefrLevel: q.cefrLevel || '',
        playerName: p.name,
        playerId: p.id,
        correct: success === true,
        answered: success !== null && success !== undefined,
        seconds: Math.max(0, 30 - Math.max(0, qTimeLeft)),
        points: success ? Math.round((currentPotentialPoints || 0) * currentMultiplier) : 0,
        answer: String(q.answer || extra.answer || ''),
        round: gridRoundLabel
    };
    matchLog.push(entry);
    if (matchLog.length > 400) matchLog = matchLog.slice(-400);
}

/** One row per question, first answer wins — the same card can be reviewed twice. */
function uniqueMisses() {
    const seen = {};
    const out = [];
    matchLog.forEach(function (e) {
        if (!e.answered || e.correct) return;
        const key = e.questionId || e.question;
        if (!key || seen[key]) return;
        seen[key] = 1;
        out.push(e);
    });
    return out;
}

function reportStats() {
    const answered = matchLog.filter(function (e) { return e.answered; });
    const correct = answered.filter(function (e) { return e.correct; });
    const perPlayer = {};
    players.forEach(function (p) {
        perPlayer[p.id] = { name: p.name, avatar: p.avatar, answered: 0, correct: 0, missed: [], points: p.score };
    });
    answered.forEach(function (e) {
        const row = perPlayer[e.playerId];
        if (!row) return;
        row.answered += 1;
        if (e.correct) row.correct += 1; else row.missed.push(e);
    });
    return {
        answered: answered.length,
        correct: correct.length,
        players: Object.keys(perPlayer).map(function (k) { return perPlayer[k]; })
    };
}

function renderReport() {
    const body = document.getElementById('report-body');
    const count = document.getElementById('report-count');
    const sub = document.getElementById('report-sub');
    if (!body) return;
    const stats = reportStats();
    const pct = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
    if (sub) {
        sub.innerText = stats.answered
            ? stats.answered + ' cards played · ' + stats.correct + ' correct · ' + pct + '% — what was missed, grouped by the skill and the CEFR point it tests.'
            : 'Nothing has been answered yet. Play a few cards, then come back for the report.';
    }
    if (count) count.innerText = gridRoundLabel + (uniqueMisses().length ? ' · ' + uniqueMisses().length + ' still to re-ask' : ' · nothing missed yet');

    const playerTable = '<table class="pm-sheet"><thead><tr><th>Team</th><th>Correct</th><th>Answered</th><th>Accuracy</th><th>Score</th><th>What they missed</th></tr></thead><tbody>'
        + stats.players.map(function (p) {
            const acc = p.answered ? Math.round((p.correct / p.answered) * 100) + '%' : '—';
            const missed = p.missed.length
                ? p.missed.map(function (m) { return (m.gridId ? '<span class="pm-cell">#' + m.gridId + '</span> ' : '') + (m.question || m.skill || 'card'); }).join('<br>')
                : '<span style="color:var(--primary-dark);font-weight:700;">Nothing — clean sheet 🎉</span>';
            return '<tr><td><strong>' + p.name + '</strong></td><td>' + p.correct + '</td><td>' + p.answered + '</td><td>' + acc + '</td><td>' + p.points + '</td><td style="max-width:320px;">' + missed + '</td></tr>';
        }).join('')
        + '</tbody></table>';

    const cellTable = matchLog.length
        ? '<table class="pm-sheet"><thead><tr><th>Cell</th><th>Question</th><th>Skill</th><th>CEFR point</th><th>Answered by</th><th>Result</th><th>Time</th><th>Points</th><th>Correct answer</th></tr></thead><tbody>'
            + matchLog.slice().reverse().map(function (e) {
                return '<tr><td class="pm-cell">' + (e.gridId ? '#' + e.gridId : '—') + '</td>'
                    + '<td style="max-width:320px;">' + (e.question || '—') + '</td>'
                    + '<td>' + (e.skill || e.type || '—') + '</td>'
                    + '<td style="max-width:200px;">' + (cefrLabel(e) || '—') + '</td>'
                    + '<td>' + e.playerName + '</td>'
                    + '<td class="' + (e.correct ? 'ok' : 'miss') + '">' + (e.answered ? (e.correct ? '✅ correct' : '❌ missed') : '—') + '</td>'
                    + '<td>' + e.seconds + 's</td>'
                    + '<td>' + (e.points ? '+' + e.points : '—') + '</td>'
                    + '<td style="max-width:220px;">' + (e.answer || '—') + '</td></tr>';
            }).join('')
            + '</tbody></table>'
        : '';

    body.innerHTML = buildPlanHtml() + playerTable + (cellTable ? '<div style="height:14px;"></div>' + cellTable : '');
}

/* =====================================================================
   THE TEACHING PLAN
   ---------------------------------------------------------------------
   A score sheet tells the tutor who won. It cannot tell them what to teach next,
   which is the only part a tutor can act on, so the report leads with the miss
   analysis instead of the table:

     · every answered card is grouped by its SKILL and by the CEFR point the
       generator tagged it with ("past simple · A2"), because "Grammar 62%" is not
       a lesson and "past simple 40%" is;
     · the weakest sub-skill is named at the top — lowest accuracy, never fewer
       than one miss, so a single unlucky card cannot label the class;
     · each area carries one-tap follow-ups: deal just those cards again, hear the
       colour-coded mini lessons for them, or copy a short drill to run by hand.
   ===================================================================== */
function cefrLabel(e) {
    if (!e || !e.cefrTopic) return '';
    return e.cefrTopic + (e.cefrLevel ? ' · ' + e.cefrLevel : '');
}

function groupAreas(mode) {
    const groups = {};
    matchLog.forEach(function (e) {
        if (!e.answered) return;
        const label = mode === 'cefr' ? cefrLabel(e) : '';
        // The CEFR breakdown only holds cards the dictionary could tag; a card it
        // could not is counted in the footer rather than lumped into a fake topic.
        if (mode === 'cefr' && !label) return;
        const text = label || e.skill || e.type || 'General';
        const key = (mode === 'cefr' ? 'cefr:' : 'skill:') + text.toLowerCase();
        if (!groups[key]) groups[key] = { key: key, label: text, mode: mode, answered: 0, correct: 0, missed: [], entries: [] };
        const g = groups[key];
        g.answered += 1;
        g.entries.push(e);
        if (e.correct) g.correct += 1;
        else if (g.missed.indexOf(e) === -1) g.missed.push(e);
    });
    return Object.keys(groups).map(function (k) {
        const g = groups[k];
        g.accuracy = g.answered ? Math.round((g.correct / g.answered) * 100) : 0;
        return g;
    }).sort(function (a, b) {
        return b.missed.length - a.missed.length || a.accuracy - b.accuracy || a.label.localeCompare(b.label);
    });
}

/** The class's weakest sub-skill: the area with a miss and the lowest accuracy. */
function weakestArea() {
    const withMisses = groupAreas('cefr').filter(function (a) { return a.missed.length; });
    const pool = withMisses.length ? withMisses : groupAreas('skill').filter(function (a) { return a.missed.length; });
    if (!pool.length) return null;
    return pool.slice().sort(function (a, b) { return a.accuracy - b.accuracy || b.missed.length - a.missed.length; })[0];
}

/** Every area the report can act on, in the order it shows them. */
let planAreas = [];

function buildPlanHtml() {
    planAreas = [];
    const answered = matchLog.filter(function (e) { return e.answered; });
    if (!answered.length) {
        return '<p class="pm-modal-sub" style="margin-bottom:12px;">Play a few cards and this report turns into a teaching plan — what the class missed, grouped by skill and by CEFR point, with a drill for each gap.</p>';
    }

    const cefrAreas = groupAreas('cefr');
    const skillAreas = groupAreas('skill');
    const tagged = answered.filter(function (e) { return !!e.cefrTopic; }).length;
    const weakest = weakestArea();
    const missedTotal = uniqueMisses().length;

    const headline = weakest
        ? '<div class="pm-plan-head"><span class="pm-plan-flag">🎯 WEAKEST SUB-SKILL</span>'
            + '<span class="pm-plan-weak">' + weakest.label + '</span>'
            + '<span class="pm-plan-why">' + weakest.accuracy + '% accuracy over ' + weakest.answered + ' card' + (weakest.answered === 1 ? '' : 's')
            + (weakest.missed.length ? ' · ' + weakest.missed.length + ' missed' : '') + '</span></div>'
        : '<div class="pm-plan-head"><span class="pm-plan-flag">✅ NOTHING WEAK YET</span><span class="pm-plan-why">No card has been missed so far — the class is on top of this set.</span></div>';

    const areaTable = function (title, note, areas) {
        const rows = areas.filter(function (a) { return a.mode === 'cefr' ? a.missed.length || a.answered : a.answered; });
        if (!rows.length) return '';
        const body = rows.map(function (a) {
            const idx = planAreas.push(a) - 1;
            const short = a.missed.length;
            const bar = '<span class="pm-plan-bar"><span style="width:' + a.accuracy + '%; background:' + (a.accuracy >= 80 ? 'var(--primary)' : a.accuracy >= 50 ? 'var(--yellow)' : '#ef4444') + ';"></span></span>';
            return '<tr' + (weakest && a.key === weakest.key ? ' class="weak"' : '') + '>'
                + '<td><strong>' + a.label + '</strong>' + (a.missed.length ? '<div class="pm-plan-missed">' + a.missed.slice(0, 3).map(function (m) { return (m.gridId ? '<span class="pm-cell">#' + m.gridId + '</span> ' : '') + (m.question || '').slice(0, 46); }).join('<br>') + (a.missed.length > 3 ? '<br>…' : '') + '</div>' : '') + '</td>'
                + '<td>' + a.correct + '/' + a.answered + '</td>'
                + '<td>' + a.accuracy + '% ' + bar + '</td>'
                + '<td style="white-space:nowrap;">'
                    + (short ? '<button class="pm-plan-btn purple" onclick="reteachArea(' + idx + ')" title="Deal just the cards this class missed in this area">🔁 Re-ask ' + short + '</button>' : '')
                    + '<button class="pm-plan-btn blue" onclick="teachArea(' + idx + ')" title="Read the mini lesson for every missed card in this area">🔊 Teach it</button>'
                    + '<button class="pm-plan-btn gray" onclick="copyAreaDrill(' + idx + ')" title="Copy a short drill for this area">📋 Drill</button>'
                + '</td></tr>';
        }).join('');
        return '<div class="pm-plan-section"><div class="pm-plan-title">' + title + '</div>'
            + (note ? '<p class="pm-modal-sub" style="margin:0 0 6px;">' + note + '</p>' : '')
            + '<table class="pm-sheet pm-plan"><thead><tr><th>Area</th><th>Score</th><th>Accuracy</th><th>Follow-up</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    };

    const untagged = answered.length - tagged;
    const byCefr = areaTable(
        'BY CEFR POINT',
        tagged ? (tagged + ' of ' + answered.length + ' answered cards matched a grammar point in your CEFR dictionary' + (untagged ? ' — the other ' + untagged + ' are grouped by skill below.' : '')) : 'No card matched a grammar point yet — the skill breakdown below is the one to use.',
        cefrAreas
    );
    const bySkill = areaTable('BY SKILL', '', skillAreas);

    const summary = '<div class="pm-plan-stats">'
        + '<span><strong>' + answered.length + '</strong> cards played</span>'
        + '<span><strong>' + (answered.length - missedTotal) + '</strong> correct</span>'
        + '<span><strong>' + missedTotal + '</strong> to re-teach</span>'
        + '<span><strong>' + (players.filter(function (p) { return p.score > 0; }).length) + '</strong> scoring teams</span>'
        + '</div>';

    return '<div class="pm-plan">' + summary + headline + byCefr + bySkill
        + '<div id="plan-detail" class="pm-plan-detail"></div></div>'
        + '<div style="height:16px;"></div>';
}

/** The mini-lesson script for one area, in the order the class would hear it. */
function areaScript(area) {
    const lines = [];
    lines.push(area.label + '. ' + (area.missed.length ? area.missed.length + ' of ' + area.answered + ' missed here.' : 'Nothing missed here, but it is worth ten seconds.'));
    const seen = {};
    area.missed.concat(area.entries).forEach(function (e) {
        const q = questionById(e.questionId) || {};
        if (seen[e.questionId]) return;
        seen[e.questionId] = 1;
        if (!e.correct) lines.push('' + (e.question || '').replace(/[?] *$/, '') + '? The answer is ' + (e.answer || q.answer || '—') + '.');
        const fb = q.feedback || {};
        if (fb.correct) lines.push('Why: ' + fb.correct);
        if (fb.rule) lines.push('The rule: ' + fb.rule);
        if (fb.vocab) lines.push('The word: ' + fb.vocab);
        if (fb.steps && fb.steps.length) lines.push('Steps: ' + fb.steps.join(' '));
        if (fb.examples && fb.examples.length) lines.push('Examples: ' + fb.examples.join(' '));
        if (fb.speak) lines.push('Now you: ' + fb.speak);
    });
    if (lines.length === 1) lines.push('Re-ask the cards and let the class explain the rule back to you.');
    // Written with String.fromCharCode rather than an escape: this whole script is
    // itself a template literal, so a backslash-n in the source would be consumed
    // while the lesson is generated and arrive as a real line break.
    const NL = String.fromCharCode(10);
    return lines.join(NL).replace(new RegExp(NL + '{3,}', 'g'), NL + NL);
}

function questionById(id) {
    if (!id) return null;
    const deck = gameData.questions || [];
    for (let i = 0; i < deck.length; i++) if (deck[i] && deck[i].id === id) return deck[i];
    return null;
}

/** Read one area's mini lessons out loud — the teaching moment, hands free. */
window.teachArea = function (idx) {
    const area = planAreas[Number(idx)];
    if (!area) return;
    const script = areaScript(area);
    const detail = document.getElementById('plan-detail');
    if (detail) {
        detail.style.display = 'block';
        detail.innerHTML = '<div class="pm-plan-title">TEACHING SCRIPT — ' + area.label + '</div><pre class="pm-plan-script"></pre>';
        const pre = detail.querySelector('pre');
        if (pre) pre.innerText = script;
    }
    playTTS(script);
    pmNotify('🔊 Reading the mini lesson for "' + area.label + '".', 'info');
};

/** Copy a short drill for one area, ready to paste into a plan or a chat. */
window.copyAreaDrill = function (idx) {
    const area = planAreas[Number(idx)];
    if (!area) return;
    const script = areaScript(area);
    const head = 'Drill — ' + area.label + ' (' + area.accuracy + '% accuracy, ' + area.missed.length + ' missed of ' + area.answered + ')';
    const NL = String.fromCharCode(10);
    const text = head + NL + NL + script + NL + NL + 'Quick shape: 3 minutes warm-up on the rule, re-ask the missed cards, then the speaking task above.';
    try { navigator.clipboard.writeText(text); pmNotify('📋 Drill for "' + area.label + '" copied.', 'good'); }
    catch (e) { pmNotify('Could not reach the clipboard in this browser.', 'warn'); }
};

/** The whole plan as plain text — one paste into a lesson plan or a parent note. */
function teachingPlanText() {
    const stats = reportStats();
    const answered = matchLog.filter(function (e) { return e.answered; }).length;
    const lines = [];
    lines.push('Party Mode teaching plan — ' + (gameData.gameTitle || 'lesson'));
    if (gameData.cefrLevel) lines.push('Class level: ' + gameData.cefrLevel + (gameData.cefrTier ? ' · Tier ' + gameData.cefrTier : ''));
    lines.push(answered + ' cards played, ' + stats.correct + ' correct' + (answered ? ' (' + Math.round((stats.correct / answered) * 100) + '%)' : '') + ', ' + uniqueMisses().length + ' to re-teach.');
    const weakest = weakestArea();
    if (weakest) lines.push('WEAKEST: ' + weakest.label + ' — ' + weakest.accuracy + '% over ' + weakest.answered + ' card(s).');
    const dump = function (title, areas) {
        const rows = areas.filter(function (a) { return a.missed.length || a.answered; });
        if (!rows.length) return;
        lines.push('');
        lines.push(title);
        rows.forEach(function (a) {
            lines.push('  • ' + a.label + ': ' + a.correct + '/' + a.answered + ' (' + a.accuracy + '%)'
                + (a.missed.length ? ' — missed: ' + a.missed.map(function (m) { return (m.gridId ? '#' + m.gridId + ' ' : '') + (m.question || ''); }).join(' | ') : ''));
        });
    };
    dump('BY CEFR POINT', groupAreas('cefr'));
    dump('BY SKILL', groupAreas('skill'));
    const weakestArea0 = weakestArea();
    if (weakestArea0 && weakestArea0.missed.length) {
        lines.push('');
        lines.push('DRILL FOR ' + weakestArea0.label.toUpperCase());
        lines.push(areaScript(weakestArea0));
    }
    return lines.join(String.fromCharCode(10));
}

window.copyTeachingPlan = function () {
    try { navigator.clipboard.writeText(teachingPlanText()); pmNotify('📋 Teaching plan copied — weak areas first.', 'good'); }
    catch (e) { pmNotify('Could not reach the clipboard in this browser.', 'warn'); }
};


window.openReport = function () {
    renderReport();
    document.getElementById('report-modal').style.display = 'flex';
};
window.closeReport = function () {
    document.getElementById('report-modal').style.display = 'none';
};
window.copyReportText = function () {
    const stats = reportStats();
    const lines = ['Party Mode score sheet — ' + (gameData.gameTitle || 'lesson') + ' (' + gridRoundLabel + ')',
        stats.answered + ' cards played, ' + stats.correct + ' correct' + (stats.answered ? ' (' + Math.round((stats.correct / stats.answered) * 100) + '%)' : '')];
    stats.players.forEach(function (p) {
        lines.push('• ' + p.name + ': ' + p.correct + '/' + p.answered + ' correct, ' + p.points + ' pts' + (p.missed.length ? ' — missed: ' + p.missed.map(function (m) { return (m.gridId ? '#' + m.gridId + ' ' : '') + (m.question || m.skill); }).join(' | ') : ''));
    });
    const sep = String.fromCharCode(10);
    const text = lines.join(sep);
    try { navigator.clipboard.writeText(text); pmNotify('📋 Score sheet copied.', 'good'); }
    catch (e) { pmNotify('Could not reach the clipboard in this browser.', 'warn'); }
};

/* The round the class actually needed: only the cards they got wrong, dealt as a
   fresh board. This is the whole reason the score sheet exists — a tutor who can
   see what was missed in one tap gets to teach it while the mistake is still warm. */
function dealReteach(missed, label) {
    const byId = {};
    missed.forEach(function (m) { if (m.questionId) byId[m.questionId] = m; });
    pendingGridQuestions = (gameData.questions || []).filter(function (q) { return byId[q.id]; });
    if (pendingGridQuestions.length < missed.length) {
        // Questions that came from a review card may not be in the deck any more;
        // fall back to the logged copy so the round still contains what was missed.
        pendingGridQuestions = pendingGridQuestions.concat(missed.filter(function (m) { return !byId[m.questionId]; }).map(function (m) {
            return { id: m.questionId || ('reteach_' + m.question), question: m.question, answer: m.answer, skill: m.skill, cefrTopic: m.cefrTopic, cefrLevel: m.cefrLevel, type: m.type, points: 10, options: [] };
        }));
    }
    gridRoundLabel = 'Re-teach';
    // The board is replaced, not added to: the old grid has to be cleared or
    // renderGrid keeps the finished board and the misses never get dealt.
    // Counted *before* launchGame — renderGrid consumes the list into the board.
    const missedCount = pendingGridQuestions.length;
    gridItems = [];
    currentPlayerIndex = 0;
    closeReport();
    launchGame('bamboozle', true);
    pmNotify('🔁 Re-teach round: ' + missedCount + ' card(s)' + (label ? ' on ' + label : ' the class missed') + '.', 'info');
}

window.startReteachRound = function () {
    const missed = uniqueMisses();
    if (!missed.length) {
        pmNotify('Nothing to re-ask — the class did not miss a card.', 'good');
        return;
    }
    dealReteach(missed, '');
};

/* One area of the teaching plan, dealt on its own. A whole-class re-teach round
   is a big gesture; "just the seven cards about past simple" is the one a tutor
   can actually fit into the last ten minutes of a lesson. */
window.reteachArea = function (idx) {
    const area = planAreas[Number(idx)];
    if (!area) return;
    if (!area.missed.length) {
        pmNotify('Nothing missed on ' + area.label + ' — nothing to re-ask.', 'good');
        return;
    }
    dealReteach(area.missed, area.label);
};

function startGlobalTimer() {
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeElapsed++;
        const m = Math.floor(timeElapsed / 60).toString().padStart(2, '0');
        const s = (timeElapsed % 60).toString().padStart(2, '0');
        document.getElementById('time-elapsed').innerText = m + ':' + s;
    }, 1000);
}

window.toggleLaser = () => { 
    const on = document.body.classList.toggle('laser-active');
    const trail = document.getElementById('global-laser-trail');
    if (trail) trail.style.display = on ? 'block' : 'none';
    if (on) {
        // track mouse for super-visible dot + comet trail
        if (!window._laserMoveHandler) {
            window._laserMoveHandler = (e) => {
                const dot = document.getElementById('global-laser-dot');
                const trailEl = document.getElementById('global-laser-trail');
                if (dot) { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }
                // trailing glow with slight delay
                setTimeout(() => { if (trailEl) { trailEl.style.left = e.clientX + 'px'; trailEl.style.top = e.clientY + 'px'; } }, 40);
            };
            document.addEventListener('mousemove', window._laserMoveHandler);
        }
    } else {
        if (window._laserMoveHandler) {
            document.removeEventListener('mousemove', window._laserMoveHandler);
            window._laserMoveHandler = null;
        }
    }
    // every laser control (header + settings sheet) reflects the same state
    document.querySelectorAll('#pm-laser-btn, #pm-settings-laser-btn').forEach(function (btn) {
        btn.classList.toggle('laser-on', on);
        const label = btn.querySelector('.pm-laser-label');
        if (label) label.innerText = on ? 'Laser ON' : 'Laser';
        else btn.innerHTML = on ? '🔴 Laser ON' : '🎯 Laser';
    });
};

window.clickCard = (idx) => {
    const item = gridItems[idx];
    if(item.taken) {
        if (!item.isLucky && !item.hiddenPowerup) openQuestion(item, true);
        return;
    }
    item.taken = true;
    renderGrid();
    
    if (selectedGameMode !== 'bamboozle') { openQuestion(item, false); return; }
    if (item.isLucky) triggerLuckyEffect(item);
    else if (item.hiddenPowerup) triggerPowerupFound(item.hiddenPowerup);
    else openQuestion(item, false);
};

/* Build the little world a power-up acts on. Cards ask for an opponent
   (any other team) or the leader (the team in front) instead of guessing,
   so "steal points" steals from someone who actually has points to lose. */
function makeContext(p) {
    return {
        p: p,
        players: players,
        question: currentQuestion,
        target: null,
        opponent: function () { const ops = pmOpponents(p); return ops.length ? ops[pmRand(0, ops.length - 1)] : null; },
        leader: function () { return pmSorted().filter(function (x) { return x.id !== p.id; })[0] || null; }
    };
}

function triggerLuckyEffect(item) {
    const pool = LUCKY_IDS.filter(powerupEnabled);
    const overlay = document.getElementById('lucky-overlay');
    const desc = document.getElementById('lucky-desc');
    const resultEl = document.getElementById('lucky-result');
    const titleEl = document.getElementById('lucky-title');

    /* Every lucky card switched off in setup: turn the cell back into a question
       rather than a dead click that silently eats the turn. */
    if (pool.length === 0) {
        if (overlay) overlay.style.display = 'none';
        if (item) openQuestion(item, false);
        return;
    }

    const id = pool[Math.floor(Math.random() * pool.length)];
    const def = POWERUPS[id];
    const p = players[currentPlayerIndex];

    overlay.className = 'lucky-overlay ' + (def.tone === 'bad' ? 'bad' : def.tone === 'good' ? 'good' : 'neutral');
    if (titleEl) titleEl.innerText = def.emoji + ' LUCKY CARD!';
    desc.innerText = def.name.toUpperCase() + ' — ' + def.label;
    if (resultEl) resultEl.innerText = '';
    overlay.style.display = 'flex';
    playTTS('Lucky card! ' + def.label);

    let outcome;
    try { outcome = def.run(makeContext(p)) || def.label; }
    catch (e) { outcome = def.label + ' could not be applied.'; console.error('Power-up failed:', id, e); }

    if (resultEl) resultEl.innerText = outcome;
    pmNotify('🍀 ' + outcome, def.tone || 'info');
    playTTS(outcome);
    renderLeaderboard();
}

function triggerPowerupFound(id) { collectPowerup(pmDef(id) ? id : GRID_IDS[0]); }

/* =====================================================================
   GAME GUIDES (on demand)
   ---------------------------------------------------------------------
   Replaces the old auto-narration. The tutor opens a guide, and the read
   aloud happens only when the 🔊 button is pressed — nothing speaks at
   the class uninvited.
   ===================================================================== */
let guideMode = 'bamboozle';

function buildGuideText(mode) {
    const g = GUIDES[mode];
    if (!g) return '';
    return 'How to play ' + g.name + '. ' + g.tagline + ' ' + (g.setup || '') + ' '
        + (g.how || []).join(' ') + ' ' + (g.winning || '') + ' ' + (g.tips || []).join(' ');
}

function renderGuide() {
    const keys = Object.keys(GUIDES);
    const rail = document.getElementById('guide-rail');
    const main = document.getElementById('guide-main');
    if (!rail || !main) return;
    rail.innerHTML = keys.map(function (k) {
        const g = GUIDES[k];
        return '<button type="button" class="guide-tab' + (k === guideMode ? ' on' : '') + '" data-guide="' + k + '" onclick="openGuide(this.dataset.guide)">' + g.emoji + ' ' + g.name + '</button>';
    }).join('');
    const g = GUIDES[guideMode];
    main.innerHTML = '<div class="guide-hero"><span class="guide-emoji">' + g.emoji + '</span><h3>' + g.name + '</h3><p>' + g.tagline + '</p></div>'
        + '<div class="guide-block"><h4>Set up</h4><p>' + g.setup + '</p></div>'
        + '<div class="guide-block"><h4>How it runs</h4><ol>' + (g.how || []).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></div>'
        + '<div class="guide-block"><h4>Winning</h4><p>' + g.winning + '</p></div>'
        + ((g.tips && g.tips.length) ? '<div class="guide-block"><h4>Tutor tips</h4><ul>' + g.tips.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>' : '')
        + '<div class="guide-block"><h4>For your eyes only</h4><p>Press <b>Alt+K</b> in any game to open the <b>answer key</b> in a separate window: the live question, its answer, the reasoning and every card the round is still dealing from. The class never sees it, because it is not drawn on the board. Alt+K again closes it.</p></div>';
    const active = rail.querySelector('.guide-tab.on');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

window.openGuide = function (mode) {
    const keys = Object.keys(GUIDES);
    if (mode === 'list') guideMode = 'bamboozle';
    else if (mode && GUIDES[mode]) guideMode = mode;
    else if (GUIDES[selectedGameMode]) guideMode = selectedGameMode;
    else guideMode = keys[0];
    renderGuide();
    document.getElementById('guide-modal').style.display = 'flex';
};

window.closeGuide = function () {
    document.getElementById('guide-modal').style.display = 'none';
    try { window.speechSynthesis.cancel(); } catch (e) { /* nothing playing */ }
};

window.readGuideAloud = function () {
    const text = buildGuideText(guideMode);
    if (!text) return;
    playTTS(text);
    pmNotify('🔊 Reading the ' + GUIDES[guideMode].name + ' guide aloud.', 'info');
};

/* =====================================================================
   CHARACTER VOICES
   ---------------------------------------------------------------------
   Micro Lesson gives every character its own voice, and a hidden-roles round
   needs exactly that: eight characters read by one flat narrator is eight
   people sounding like the same person, which is the one thing the game must
   not do. So every named speaker gets a voice of their own.

   · the assignment is automatic and deliberately varied — the pool excludes the
     narrator's voice and alternates between the installed voices, preferring
     ones whose names suggest a different gender each turn;
   · a voice the tutor sets by hand is remembered per character name, in this
     browser, so "Boris" sounds like Boris in next week's lesson too;
   · everything is spoken through speakAs(), so a game that has characters gets
     this by naming them — no per-game wiring.
   ===================================================================== */
let charVoicePrefs = null;   // { [characterName]: voiceURI } chosen by the tutor
let autoCharVoices = {};     // { [characterName]: voiceURI } assigned this round

function loadCharVoicePrefs() {
    if (charVoicePrefs) return charVoicePrefs;
    charVoicePrefs = {};
    try {
        const raw = window.localStorage.getItem(CHAR_VOICE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) charVoicePrefs = parsed;
        }
    } catch (e) { /* private mode — assignments stay in memory */ }
    return charVoicePrefs;
}

function saveCharVoicePrefs() {
    try { window.localStorage.setItem(CHAR_VOICE_KEY, JSON.stringify(charVoicePrefs || {})); } catch (e) { /* ignore */ }
}

/* Voice names that read as female / male / either. Used only to make consecutive
   characters sound clearly different — a hint, never a rule, so a browser with
   one voice installed still works. */
const VOICE_FEMALE_HINT = /\\b(female|woman|girl|jenny|aria|sonia|michelle|emily|emma|ava|clara|elena|libby|natasha|samantha|zira|catherine|linda|heather|susan|karen|moira|tessa|fiona|nicole|olivia|mia|sara|sarah|nora|hazel|kate|serena|joanna|salli|kendra|kimberly|ivy|amy|maisie|neerja|swara)\\b/i;
/* Word-boundary anchored, and never applied to a name that already reads female:
   "Female" contains the letters of "male", which is how a woman's voice ended up
   being handed to a male character in the first draft of this. */
const VOICE_MALE_HINT = /\\b(male|man|guy|david|mark|george|daniel|james|alex|fred|oliver|thomas|ryan|brian|joey|matthew|christopher|eric|steffan|stefan|liam|gordon|arthur|tom|william|junior|chris|tony|prabhat|rishi)\\b/i;
function voiceReadsFemale(v) { return !!v && VOICE_FEMALE_HINT.test(v.name || ''); }
function voiceReadsMale(v) { return !!v && !voiceReadsFemale(v) && VOICE_MALE_HINT.test(v.name || ''); }

/* Voices that sound like a person rather than a machine. Edge and Chrome ship
   these as "(Natural)" / "(Online)" voices, macOS calls them Premium or
   Enhanced, Android as "Google …". They are also the ones that are NOT local,
   so "localService" is part of the score: the local set is the old robotic one.
   Without this, a class on Edge heard the narrator read a whole lesson in the
   flat offline voice while a natural one sat unused in the list, which is the
   single easiest way to make a spoken game sound cheap. */
const VOICE_NATURAL_HINT = /(natural|neural|online|premium|enhanced|multilingual|siri|google|eloquen)/i;
const VOICE_CARTOON_HINT = /(robot|zarvox|albert|bad news|bubbles|cellos|trinoids|whisper|wobble|organ|bahh|boing|jester|superstar|good news|bells|deranged|hysterical|pipe organ)/i;
function voiceNatureScore(v) {
    if (!v) return -99;
    let score = 0;
    if (VOICE_NATURAL_HINT.test(v.name || '')) score += 4;
    if (v.localService === false) score += 3;
    if (/^en/i.test(v.lang || '')) score += 1;
    if (VOICE_CARTOON_HINT.test(v.name || '')) score -= 6;
    return score;
}

/** The most natural installed voice — the fallback narrator when nobody chose. */
function bestNaturalVoice() {
    const voices = (window.speechSynthesis.getVoices() || []).filter(function (v) { return v && v.voiceURI; });
    if (!voices.length) return null;
    return voices.slice().sort(function (a, b) {
        return voiceNatureScore(b) - voiceNatureScore(a) || String(a.name).localeCompare(String(b.name));
    })[0];
}

/* =====================================================================
   THE CAST
   ---------------------------------------------------------------------
   Any mode with named speakers registers them here — the hidden-role round, the
   Spyfall players, the Alibi suspects, the Sentiment line. One registry means the
   voice assignment and the "🎙️ Voices" panel work for every game instead of only
   for whichever game was wired up first. The character's gender is what a voice is matched
   on: a class must not hear a woman speaking in a man's voice.
   ===================================================================== */
let pmCast = [];
function pmRegisterCast(list) {
    pmCast = (list || []).filter(function (c) { return c && c.name; }).map(function (c) {
        return {
            name: String(c.name),
            gender: String(c.gender == null ? '' : c.gender).toLowerCase(),
            role: String(c.role || ''),
        };
    });
    assignCharacterVoices();
}
/** Everyone who speaks in the round on screen: the hidden-role cast plus whatever
 *  the current mode registered, each name once. */
function currentCast() {
    const social = (typeof socialState !== 'undefined' && socialState && socialState.characters) ? socialState.characters : [];
    const out = [];
    const seen = {};
    social.concat(pmCast).forEach(function (c) {
        if (!c || !c.name) return;
        const key = String(c.name).toLowerCase();
        if (seen[key]) return;
        seen[key] = true;
        out.push({ name: c.name, gender: String(c.gender == null ? '' : c.gender).toLowerCase(), role: c.role || '' });
    });
    return out;
}

/** Installed voices worth giving to a character, most natural first. */
function charVoicePool() {
    const voices = (window.speechSynthesis.getVoices() || []).filter(function (v) { return v && v.voiceURI; });
    const narrator = pmFindVoice(voices, hostVoice);
    const others = voices.filter(function (v) { return !narrator || v.voiceURI !== narrator.voiceURI; });
    const usable = others.length ? others : voices;
    return usable.slice().sort(function (a, b) {
        return voiceNatureScore(b) - voiceNatureScore(a) || String(a.name).localeCompare(String(b.name));
    });
}

/* Give every character a voice of their own, matching the gender the content
   states, unless the tutor set one by hand. Safe to call repeatedly: it runs when
   the voice list arrives, when the narrator's voice changes, and whenever a round
   is dealt. When the browser has no voice for that gender the character still
   gets a distinct one from the mixed pool — variety beats silence. */
function assignCharacterVoices() {
    autoCharVoices = {};
    const cast = currentCast();
    const pool = charVoicePool();
    if (!pool.length || !cast.length) return;
    const femaleVoices = pool.filter(voiceReadsFemale);
    const maleVoices = pool.filter(voiceReadsMale);
    const used = {};
    const prefs = loadCharVoicePrefs();
    const take = function (list, i) {
        const free = list.filter(function (v) { return !used[v.voiceURI]; });
        if (free.length) return free[0];
        if (list.length) return list[i % list.length];
        return pool[i % pool.length];
    };
    cast.forEach(function (c, i) {
        if (prefs[c.name]) return;                   // the tutor's hand-picked voice wins
        const wants = c.gender.charAt(0);
        let v;
        if (wants === 'f') v = take(femaleVoices.length ? femaleVoices : pool, i);
        else if (wants === 'm') v = take(maleVoices.length ? maleVoices : pool, i);
        else v = take(pool, i);
        if (v) { used[v.voiceURI] = true; autoCharVoices[c.name] = v.voiceURI; }
    });
}

/** The voice a character speaks in: the tutor's pick, else the round's assignment. */
function charVoiceFor(name) {
    if (!name) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const prefs = loadCharVoicePrefs();
    if (prefs[name]) return pmFindVoice(voices, prefs[name]);
    if (autoCharVoices[name]) return pmFindVoice(voices, autoCharVoices[name]);
    assignCharacterVoices();
    if (autoCharVoices[name]) return pmFindVoice(voices, autoCharVoices[name]);
    return pmFindVoice(voices, hostVoice);
}

/* ---- the character voice panel ---- */
function renderCharacterVoiceList() {
    const wrap = document.getElementById('char-voice-list');
    const voicesOnScreen = window.speechSynthesis.getVoices() || [];
    const countEl = document.getElementById('voice-modal-count');
    if (countEl) {
        const n = pmFindVoice(voicesOnScreen, hostVoice);
        countEl.innerText = 'Narrator: ' + (n ? n.name + ' (' + n.lang + ')' : 'browser default voice');
    }
    if (!wrap) return;
    // Whoever is speaking in the round on screen — Mafia, Werewolf, Spyfall,
    // Alibi — because all of them register their cast the same way now.
    const cast = currentCast();
    if (!cast.length) {
        wrap.innerHTML = '<p class="pm-modal-sub">Open a round that has characters first — Mafia, Werewolf, Spyfall or Alibi. The panel then lists everyone who speaks in it.</p>';
        return;
    }
    const voices = window.speechSynthesis.getVoices() || [];
    const prefs = loadCharVoicePrefs();
    /* Be honest about a thin voice list. A machine with one female voice installed
       gives every woman in the cast the same voice, and no amount of code can fix
       that — but the tutor can pick per character, or install more voices, if the
       panel says so rather than leaving them to wonder. */
    const counts = {};
    cast.forEach(function (c) {
        if (prefs[c.name]) return;
        const v = charVoiceFor(c.name);
        if (!v) return;
        counts[v.voiceURI] = (counts[v.voiceURI] || 0) + 1;
    });
    const shared = Object.keys(counts).filter(function (k) { return counts[k] > 1; });
    const note = shared.length
        ? '<p class="pm-modal-sub" style="margin:0 0 8px;">This browser has few matching voices installed, so ' + shared.length
            + ' of them are shared between characters. Pick one per character below, or add voices to the browser, and every speaker sounds like a different person.</p>'
        : '';
    wrap.innerHTML = note + cast.map(function (c) {
        const current = charVoiceFor(c.name);
        const chosen = prefs[c.name] || (current ? current.voiceURI : '');
        const opts = ['<option value="">Auto (matched to the character)</option>'].concat(voices.map(function (v) {
            return '<option value="' + v.voiceURI + '"' + (v.voiceURI === chosen ? ' selected' : '') + '>' + v.name + ' (' + v.lang + ')</option>';
        })).join('');
        const genderWord = c.gender.charAt(0) === 'f' ? 'female voice wanted' : c.gender.charAt(0) === 'm' ? 'male voice wanted' : 'no gender given';
        const subtitle = [c.role, genderWord].filter(Boolean).join(' · ');
        return '<div class="pm-voice-row">'
            + '<img src="' + (c.role ? socialAvatar(c) : castAvatar(c.name)) + '" alt="">'
            + '<span class="pm-voice-name">' + c.name + '<br><span style="font-weight:600;color:var(--gray);font-size:0.75rem;">' + subtitle + '</span></span>'
            + '<select onchange="setCharacterVoice(this.dataset.who, this.value)" data-who="' + (c.name || '').replace(/"/g, '&quot;') + '">' + opts + '</select>'
            + '<button class="btn-action btn-blue" style="padding:6px 10px; font-size:0.8rem;" onclick="testCharacterVoice(this.dataset.who)" data-who="' + (c.name || '').replace(/"/g, '&quot;') + '">🔊</button>'
            + '</div>';
    }).join('');
}
function castAvatar(name) { return 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + encodeURIComponent(name || 'player'); }

window.openCharacterVoices = function () {
    renderCharacterVoiceList();
    document.getElementById('voice-modal').style.display = 'flex';
};
window.closeCharacterVoices = function () {
    document.getElementById('voice-modal').style.display = 'none';
    try { window.speechSynthesis.cancel(); } catch (e) { /* nothing playing */ }
};
window.setCharacterVoice = function (name, uri) {
    if (!name) return;
    loadCharVoicePrefs();
    if (uri) charVoicePrefs[name] = uri; else delete charVoicePrefs[name];
    saveCharVoicePrefs();
    pmNotify('🎙️ ' + name + (uri ? ' now speaks in that voice.' : ' is back to an automatic voice.'), 'info');
    renderCharacterVoiceList();
};
window.testCharacterVoice = function (name) {
    const cast = (typeof socialState !== 'undefined' && socialState && socialState.characters) ? socialState.characters : [];
    const c = cast.filter(function (x) { return x.name === name; })[0];
    const line = c ? socialLineOf(c) : 'This is how I sound.';
    speakAs(name, line);
};
window.autoAssignCharacterVoices = function () {
    const cast = (typeof socialState !== 'undefined' && socialState && socialState.characters) ? socialState.characters : [];
    loadCharVoicePrefs();
    // Only this round's cast is re-mixed; hand-picked voices for other characters
    // (a recurring class favourite, say) are left alone.
    cast.forEach(function (c) { if (c && c.name && charVoicePrefs[c.name]) delete charVoicePrefs[c.name]; });
    saveCharVoicePrefs();
    assignCharacterVoices();
    renderCharacterVoiceList();
    pmNotify('🎲 Voices re-mixed — no two characters share one.', 'info');
};
window.playNarratorSample = function () {
    const voices = window.speechSynthesis.getVoices() || [];
    const v = pmFindVoice(voices, hostVoice);
    pmSpeak('This is the narrator, reading in the voice you chose for your lessons.', null);
    pmNotify('🔊 Narrator: ' + (v ? v.name + ' (' + v.lang + ')' : 'the browser default voice'), 'info');
};

/* =====================================================================
   HIDDEN ROLES — Mafia & Werewolf
   ===================================================================== */
function socialTeamOf(c) {
    const role = String(c.role || '').toLowerCase();
    const team = String(c.team || '').toLowerCase();
    if (team === 'mafia' || team === 'werewolf' || team === 'dangerous' || team === 'wolves') return team === 'wolves' ? 'werewolf' : (team === 'dangerous' ? 'mafia' : team);
    if (/alpha wolf|werewolf|wolf/.test(role)) return 'werewolf';
    if (/mafia|goon|boss|godfather/.test(role)) return 'mafia';
    if (/serial killer|killer/.test(role)) return 'neutral';
    return 'town';
}

function socialAvatar(c) {
    return 'https://api.dicebear.com/9.x/adventurer/svg?seed=' + encodeURIComponent(c.seed || c.name || 'hidden');
}

function buildSocialRound(variant) {
    const pool = (gameData.questions || []).filter(function (q) {
        return q && q.type === 'social_deduction'
            && String(q.variant || 'mafia').toLowerCase() === variant
            && Array.isArray(q.characters) && q.characters.length >= 4;
    });
    if (pool.length) {
        const q = pool[Math.floor(Math.random() * pool.length)];
        return {
            variant: variant,
            source: 'lesson',
            points: q.points || 25,
            title: q.title || (variant === 'werewolf' ? 'The Village Meeting' : 'Sudden Company Reunion'),
            setting: q.setting || q.context || SOCIAL_ROSTERS[variant].setting,
            characters: q.characters.slice(0, 10).map(function (c, i) {
                const role = c.role || 'Villager';
                return {
                    name: c.name || ('Character ' + (i + 1)),
                    role: role,
                    team: socialTeamOf(c),
                    seed: c.avatarSeed || c.seed || (variant + '-' + i),
                    line: c.line || c.statement || 'I have nothing to add, and I would rather you did not ask again.',
                    // A lesson written after this feature ships can hand-write its own
                    // tell; anything older falls back to the built-in one for the role.
                    tell: c.tell || (SOCIAL_TELLS[variant] || {})[role] || '',
                };
            }),
        };
    }
    const roster = SOCIAL_ROSTERS[variant] || SOCIAL_ROSTERS.mafia;
    return {
        variant: variant,
        source: 'built-in',
        points: 25,
        title: roster.title,
        setting: roster.setting,
        characters: dealSocialRound(roster, variant),
    };
}

/* Each built-in roster holds 14 characters and a round deals 8 of them, exactly
   two of the hidden side. The draw is random every time, so "Next round" is a
   genuinely new puzzle. With only 8 characters per roster it used to re-deal the
   identical set, name for name — which meant round two was already answered and
   the class only had to remember. */
function dealSocialRound(roster, variant) {
    const all = roster.characters.slice();
    const shuffle = function (arr) { return arr.slice().sort(function () { return Math.random() - 0.5; }); };
    const dangerous = all.filter(function (c) { return socialTeamOf(c) === roster.dangerousTeam; });
    const others = all.filter(function (c) { return socialTeamOf(c) !== roster.dangerousTeam; });
    const picked = shuffle(dangerous).slice(0, 2).concat(shuffle(others).slice(0, 6));
    const dealt = picked.length === 8 ? picked : all.slice(0, 8);
    const tells = SOCIAL_TELLS[variant || 'mafia'] || SOCIAL_TELLS.mafia;
    return shuffle(dealt).map(function (c) {
        return { name: c.name, role: c.role, team: socialTeamOf(c), seed: c.seed, line: c.line, tell: tells[c.role] || '' };
    });
}

/* Which characters actually leak a little this round. Chosen once per deal, kept
   on the character, and named in the end-of-round report — a tell nobody can
   check afterwards is just an unfair game. */
function applySocialTells(characters, variant, difficulty) {
    const want = SOCIAL_DIFFICULTY_TELLS[difficulty] === undefined ? 2 : SOCIAL_DIFFICULTY_TELLS[difficulty];
    const shuffle = function (arr) { return arr.slice().sort(function () { return Math.random() - 0.5; }); };
    const withTell = characters.filter(function (c) { return !!c.tell; });
    const chosen = {};
    withTell.forEach(function (c) { c.told = false; });
    if (!want || !withTell.length) return;
    // At least one dangerous character leaks on easy and standard: a round where
    // every tell belongs to the town teaches the class to distrust the innocent.
    if (difficulty !== 'brutal') {
        const dirty = shuffle(withTell.filter(function (c) { return c.team === variant; }));
        if (dirty[0]) { dirty[0].told = true; chosen[dirty[0].name] = 1; }
    }
    const rest = shuffle(withTell.filter(function (c) { return !chosen[c.name]; }));
    let got = Object.keys(chosen).length;
    for (let i = 0; i < rest.length && got < want; i++) { rest[i].told = true; got++; }
}

/** The line the class actually hears: the statement, plus its tell when this round
 *  is dealing one for that character. */
function socialLineOf(c) {
    if (!c) return '';
    if (c.told && c.tell) return c.line + ' ' + c.tell;
    return c.line;
}

function socialToldCharacters() {
    return (socialState.characters || []).filter(function (c) { return c && c.told; });
}

function launchSocialGame(variant) {
    selectedGameMode = variant;
    const round = buildSocialRound(variant);
    const difficulty = loadSocialDifficulty();
    applySocialTells(round.characters, variant, difficulty);
    socialState = {
        variant: variant, round: 0, characters: round.characters, speaker: 0, auto: false,
        accusation: null, revealed: false, setting: round.setting, title: round.title,
        points: round.points, source: round.source, difficulty: difficulty,
        accusations: [], votes: {},
    };
    document.querySelectorAll('.special-game-overlay').forEach(function (el) { el.style.display = 'none'; });
    document.getElementById('game-grid').style.display = 'none';
    document.getElementById('view-social').style.display = 'flex';
    document.getElementById('social-verdict').style.display = 'none';
    document.getElementById('social-vote-box').style.display = 'block';
    const kicker = document.getElementById('social-kicker');
    if (kicker) {
        kicker.innerText = (variant === 'werewolf' ? 'WEREWOLF' : 'MAFIA') + ' · HIDDEN ROLES · '
            + socialState.characters.length + ' CHARACTERS · ' + (round.source === 'lesson' ? 'FROM THE LESSON' : 'BUILT-IN SET');
    }    document.getElementById('social-title').innerText = round.title;
    document.getElementById('social-setting').innerText = round.setting;
    assignCharacterVoices();
    renderSocial();
    renderSocialDifficulty();
    pushSocialRoundToRoom();


    highlightActivePlayer();
    pmNotify('🕶️ ' + socialState.characters.length + ' characters, two of them dangerous — nothing names a role. Press 🔊 for each line.', 'info');
}

/* ---- difficulty ---- */
function renderSocialDifficulty() {
    const wrap = document.getElementById('social-difficulty');
    if (!wrap) return;
    const told = socialToldCharacters().length;
    const btns = wrap.querySelectorAll('.social-diff-btn');
    Array.prototype.forEach.call(btns, function (b) {
        b.classList.toggle('on', b.dataset.diff === socialState.difficulty);
    });
    /* The line that used to spell the tells out here is gone: it announced, in
       front of the class, how many characters were carrying a giveaway. The
       difficulty buttons say it themselves, and the tutor can see the state of
       each button; nothing on this screen should help the players guess. */
    void told;
}

window.setSocialDifficulty = function (level) {
    if (SOCIAL_DIFFICULTY_TELLS[level] === undefined) return;
    socialState.difficulty = level;
    try { window.localStorage.setItem(SOCIAL_DIFF_KEY, level); } catch (e) { /* ignore */ }
    // The class has already heard some of this round's statements, so the tells are
    // re-dealt into the SAME cast rather than the whole board being replaced — the
    // tutor can drop to easier mid-round when a class is drowning, or tighten it.
    applySocialTells(socialState.characters, socialState.variant, level);
    renderSocialDifficulty();
    renderSocial();
    pushSocialRoundToRoom();
    pmNotify('🎚 Difficulty: ' + level.toUpperCase() + ' — the tells were re-dealt into this cast.', 'info');
};

function renderSocial() {
    const rail = document.getElementById('social-rail');
    if (!rail) return;
    rail.innerHTML = socialState.characters.map(function (c, i) {
        const cls = 'social-char' + (i === socialState.speaker ? ' speaking' : '') + (socialState.accusation === i ? ' accused' : '')
            + (socialState.revealed ? ' team-' + c.team.replace(/[^a-z]/g, '') : '');
        return '<button type="button" class="' + cls + '" data-i="' + i + '" onclick="socialAccuse(this.dataset.i)">'
            + '<img src="' + socialAvatar(c) + '" alt="">'
            + '<span class="social-char-name">' + c.name + '</span>'
            + '<span class="social-char-role">' + (socialState.revealed ? c.role : 'role hidden') + '</span>'
            + '</button>';
    }).join('');
    const c = socialState.characters[socialState.speaker];
    if (!c) return;
    document.getElementById('social-speaker').innerText = c.name + ' — character ' + (socialState.speaker + 1) + ' of ' + socialState.characters.length;
    const line = socialLineOf(c);
    document.getElementById('social-line').innerText = socialState.revealed ? ('(' + c.role + ') ' + line) : line;
    document.getElementById('social-progress').innerText = (socialState.speaker + 1) + ' / ' + socialState.characters.length;
    document.getElementById('social-vote-row').innerHTML = socialState.characters.map(function (cc, i) {
        const votes = socialVotesFor(i);
        return '<button type="button" class="social-vote-chip' + (socialState.accusation === i ? ' on' : '') + '" data-i="' + i + '" onclick="socialAccuse(this.dataset.i)">'
            + cc.name + (votes.total ? ' <span class="social-vote-count">📱 ' + votes.total + '</span>' : '') + '</button>';
    }).join('');
    const autoBtn = document.getElementById('social-auto-btn');
    if (autoBtn) autoBtn.innerText = 'Auto: ' + (socialState.auto ? 'on' : 'off');
    // The room's plurality, offered as one tap — the phones vote, the board decides.
    const roomBtn = document.getElementById('social-room-pick');
    if (roomBtn) {
        const top = socialRoomTopPick();
        roomBtn.style.display = top.total ? 'inline-block' : 'none';
        if (top.total) roomBtn.innerText = '📱 Use the room\u2019s pick (' + top.total + ') — ' + socialState.characters[top.index].name;
    }
    // Every phone keeps the room's running tally, so a learner can see the class
    // moving without the tutor reading names off a projector.
    renderSocialLiveVotes();
    /* Hidden-role statements run long too (a defence, an accusation), so the line
       is fitted like the Spyfall and Alibi panels. */
    fitGamePanels();
}

/** Guest votes for one character: a total plus the names behind it. */
function socialVotesFor(index) {
    const out = { total: 0, from: [] };
    const list = socialState.accusations || [];
    for (let i = 0; i < list.length; i++) {
        if (Number(list[i].target) !== Number(index)) continue;
        out.total += 1;
        out.from.push(list[i].who);
    }
    return out;
}

/** The character the room is accusing most, which the tutor can adopt in one tap. */
function socialRoomTopPick() {
    const tally = {};
    (socialState.accusations || []).forEach(function (a) {
        const t = Number(a.target);
        if (isNaN(t)) return;
        tally[t] = (tally[t] || 0) + 1;
    });
    let best = { index: -1, total: 0 };
    Object.keys(tally).forEach(function (k) {
        if (tally[k] > best.total) best = { index: Number(k), total: tally[k] };
    });
    return best;
}

window.socialUseRoomPick = function () {
    const top = socialRoomTopPick();
    if (!top.total) { pmNotify('No phone has accused anyone yet.', 'info'); return; }
    socialState.accusation = top.index;
    renderSocial();
    pmNotify('📱 Locked onto ' + socialState.characters[top.index].name + ' — the room\u2019s pick.', 'info');
};

/* Each character speaks in their own voice (see CHARACTER VOICES). The name is not
   read out — the rail already shows who is talking, and a synthesized "Boris says"
   in front of every line is what made the round sound like one narrator. */
let socialSpeakToken = 0;
window.socialSpeak = function () {
    const c = socialState.characters[socialState.speaker];
    if (!c) return;
    const token = ++socialSpeakToken;
    speakAs(c.name, socialLineOf(c), function () {
        // Auto-play chains line to line, but only for the line that is still
        // current: pressing ▶ or 🔊 again cancels the old utterance, and a stale
        // end callback must not jump the class two characters ahead.
        if (token !== socialSpeakToken) return;
        if (socialState.auto && socialState.characters.length > 1) {
            socialState.speaker = (socialState.speaker + 1) % socialState.characters.length;
            renderSocial();
            window.socialSpeak();
        }
    });
};
window.socialNextSpeaker = function () {
    socialState.speaker = (socialState.speaker + 1) % socialState.characters.length;
    renderSocial();
    if (socialState.auto) window.socialSpeak();
    if (socialState.speaker === 0) pmNotify('Everyone has spoken once. Discuss, then pick who to accuse.', 'info');
};
window.socialPrevSpeaker = function () {
    socialState.speaker = (socialState.speaker - 1 + socialState.characters.length) % socialState.characters.length;
    renderSocial();
};
window.toggleSocialAuto = function () {
    socialState.auto = !socialState.auto;
    renderSocial();
    if (socialState.auto) { window.socialSpeak(); pmNotify('Auto-play on — each turn is read as it advances.', 'info'); }
    else pmNotify('Auto-play off — use 🔊 when you want a line read.', 'info');
};
window.socialAccuse = function (i) {
    socialState.accusation = parseInt(i, 10);
    renderSocial();
};
window.socialLockAccusation = function () {
    if (socialState.revealed) return;
    if (socialState.accusation === null || socialState.accusation === undefined || isNaN(socialState.accusation)) {
        pmNotify('Pick a character first, then lock the accusation in.', 'warn');
        return;
    }
    socialState.revealed = true;
    const accused = socialState.characters[socialState.accusation];
    const dangerous = socialState.characters.filter(function (c) { return c.team === socialState.variant; });
    const hit = accused.team === socialState.variant;
    const p = players[currentPlayerIndex];
    const pts = socialState.points || 25;
    // The board's own name goes in the report too, so "who accused whom" reads
    // like a transcript rather than a list of phone votes.
    if (p) socialState.accusations.push({ who: p.name, target: socialState.accusation, by: 'board' });
    if (hit) {
        p.score += pts; currentStreak++;
        pmNotify('✅ ' + accused.name + ' really was ' + accused.role + ' — ' + p.name + ' +' + pts + ' pts.', 'good');
    } else {
        currentStreak = 0;
        pmNotify('❌ ' + accused.name + ' was only a ' + accused.role + '. The hidden side was '
            + dangerous.map(function (d) { return d.name + ' (' + d.role + ')'; }).join(' and ') + '.', 'bad');
    }
    renderSocial();
    document.getElementById('social-vote-box').style.display = 'none';
    document.getElementById('social-verdict-title').innerText = hit ? '✅ Correct — every role revealed' : '❌ Wrong — here is the truth';
    document.getElementById('social-verdict-roles').innerHTML = socialState.characters.map(function (c) {
        return '<div class="social-role-row team-' + c.team.replace(/[^a-z]/g, '') + '">'
            + '<img src="' + socialAvatar(c) + '" alt="">'
            + '<span class="social-role-name">' + c.name + '</span>'
            + '<span class="social-role-title">' + c.role + '</span>'
            + '<span class="social-role-team">' + socialTeamLabel(c.team) + '</span></div>';
    }).join('');
    renderSocialReport(accused, hit);
    document.getElementById('social-verdict').style.display = 'block';
    pushSocialRevealToRoom(accused, hit);
    highlightActivePlayer();
};

function socialTeamLabel(team) {
    return SOCIAL_TEAM_LABEL[team] || team || '—';
}

/* =====================================================================
   THE END-OF-ROUND REPORT
   ---------------------------------------------------------------------
   Revealing the roles ends the round; it does not teach anything on its own. So
   the reveal is followed by the three things the class cannot reconstruct
   afterwards:

     · THE REAL TELL — which character was leaking, and the sentence that gave
       them away, so the class learns what a tell sounds like instead of just
       being told who was guilty;
     · WHO ACCUSED WHOM — every hand and every phone, so a class that split its
       vote can see that it split, and the tutor can ask why;
     · WHY IT WAS HARD (or was not) — how many statements were written to fit more
       than one role, and what the difficulty was set to.
   ===================================================================== */
function renderSocialReport(accused, hit) {
    const el = document.getElementById('social-report');
    if (!el) return;
    const told = socialToldCharacters();
    const accusations = (socialState.accusations || []).slice();
    const dangerous = socialState.characters.filter(function (c) { return c.team === socialState.variant; });

    const tellRows = told.length
        ? told.map(function (c) {
            return '<div class="social-tell-row team-' + c.team.replace(/[^a-z]/g, '') + '">'
                + '<img src="' + socialAvatar(c) + '" alt="">'
                + '<div><strong>' + c.name + '</strong> <span class="social-tell-role">' + c.role + ' · ' + socialTeamLabel(c.team) + '</span>'
                + '<div class="social-tell-quote">“' + c.tell + '”</div></div></div>';
        }).join('')
        : '<p class="pm-modal-sub">No character was given a tell this round (the difficulty was BRUTAL), so the class had to argue from the statements alone.</p>';

    const voteRows = accusations.length
        ? accusations.map(function (a) {
            const to = socialState.characters[Number(a.target)];
            const right = to && to.team === socialState.variant;
            return '<div class="social-accuse-row">'
                + '<span class="social-accuse-who">' + (a.by === 'board' ? '🖥 ' : '📱 ') + (a.who || 'Someone') + '</span>'
                + '<span class="social-accuse-arrow">→</span>'
                + '<span class="social-accuse-to">' + (to ? to.name : '—') + '</span>'
                + '<span class="social-accuse-verdict ' + (right ? 'right' : 'wrong') + '">' + (right ? 'on the hidden side' : 'innocent') + '</span>'
                + '</div>';
        }).join('')
        : '<p class="pm-modal-sub">Nobody accused anyone in writing this round.</p>';

    const tally = {};
    accusations.forEach(function (a) { tally[a.target] = (tally[a.target] || 0) + 1; });
    const split = Object.keys(tally).length;
    const phoneVotes = accusations.filter(function (a) { return a.by === 'phone'; }).length;

    el.innerHTML = '<div class="social-report-block">'
        + '<div class="pm-plan-title">🔎 THE REAL TELL</div>' + tellRows + '</div>'
        + '<div class="social-report-block">'
        + '<div class="pm-plan-title">🗳 WHO ACCUSED WHOM</div>' + voteRows
        + (split > 1 ? '<p class="pm-modal-sub">The class split its accusation ' + split + ' ways' + (phoneVotes ? ' across ' + phoneVotes + ' phone vote(s)' : '') + ' — worth asking which argument changed the most minds.</p>' : '')
        + '</div>'
        + '<div class="social-report-block">'
        + '<div class="pm-plan-title">🎚 WHY IT PLAYED THIS WAY</div>'
        + '<p class="pm-modal-sub">Difficulty <strong>' + String(socialState.difficulty || 'standard').toUpperCase() + '</strong> — '
        + socialState.characters.length + ' characters, ' + told.length + ' carrying a tell, exactly 2 on the hidden side'
        + (dangerous.length ? ' (' + dangerous.map(function (d) { return d.role; }).join(', ') + ')' : '') + '. '
        + 'The accusation landed on <strong>' + (accused ? accused.name : '—') + '</strong> (' + socialTeamLabel(accused && accused.team) + ') — '
        + (hit ? 'correct.' : 'wrong.') + '</p>'
        + '<div class="social-report-actions">'
        + '<button class="btn-action btn-gray" onclick="copySocialReport()">📋 Copy this report</button>'
        + '<button class="btn-action btn-purple" data-diff="easy" onclick="setSocialDifficulty(this.dataset.diff)">😌 Play the next round easier</button>'
        + '<button class="btn-action btn-purple" data-diff="brutal" onclick="setSocialDifficulty(this.dataset.diff)">😈 Next round brutal</button>'
        + '</div></div>';
}

window.copySocialReport = function () {
    const told = socialToldCharacters();
    const lines = [];
    lines.push('Hidden roles report — ' + (socialState.variant === 'werewolf' ? 'Werewolf' : 'Mafia') + ' · ' + socialState.title);
    lines.push('Difficulty: ' + String(socialState.difficulty || 'standard').toUpperCase() + ' · ' + socialState.characters.length + ' characters, 2 hidden.');
    lines.push('');
    lines.push('ROLES');
    socialState.characters.forEach(function (c) { lines.push('  • ' + c.name + ' — ' + c.role + ' (' + socialTeamLabel(c.team) + ')' + (c.told ? ' [carried a tell]' : '')); });
    lines.push('');
    lines.push('THE REAL TELL');
    if (told.length) told.forEach(function (c) { lines.push('  • ' + c.name + ' (' + c.role + '): “' + c.tell + '”'); });
    else lines.push('  none — brutal difficulty deals no tells.');
    lines.push('');
    lines.push('WHO ACCUSED WHOM');
    const accusations = socialState.accusations || [];
    if (accusations.length) accusations.forEach(function (a) {
        const to = socialState.characters[Number(a.target)];
        lines.push('  • ' + (a.by === 'board' ? '[board] ' : '[phone] ') + (a.who || 'Someone') + ' → ' + (to ? to.name : '—') + (to && to.team === socialState.variant ? ' (correct)' : ' (innocent)'));
    }); else lines.push('  nobody accused anyone.');
    try { navigator.clipboard.writeText(lines.join(String.fromCharCode(10))); pmNotify('📋 Round report copied.', 'good'); }
    catch (e) { pmNotify('Could not reach the clipboard in this browser.', 'warn'); }
};
window.socialNextRound = function () {
    const round = buildSocialRound(socialState.variant);
    socialState.characters = round.characters;
    socialState.speaker = 0;
    socialState.accusation = null;
    socialState.revealed = false;
    socialState.title = round.title;
    socialState.setting = round.setting;
    socialState.points = round.points;
    socialState.source = round.source;
    socialState.accusations = [];
    socialState.votes = {};
    // The chosen difficulty carries into every new round — a tutor who set Brutal
    // once does not want to re-set it after each cast.
    applySocialTells(socialState.characters, socialState.variant, socialState.difficulty || 'standard');
    document.getElementById('social-title').innerText = round.title;
    document.getElementById('social-setting').innerText = round.setting;
    document.getElementById('social-verdict').style.display = 'none';
    document.getElementById('social-vote-box').style.display = 'block';
    const report = document.getElementById('social-report');
    if (report) report.innerHTML = '';
    assignCharacterVoices();
    renderSocial();
    renderSocialDifficulty();
    pushSocialRoundToRoom();
    pmNotify('🔄 New set of ' + socialState.characters.length + ' characters. Two of them are on the hidden side.', 'info');
};
window.closeSocial = function () {
    document.getElementById('view-social').style.display = 'none';
    try { window.speechSynthesis.cancel(); } catch (e) { /* nothing playing */ }
    goToModeSelect();
};

window.closeLucky = () => { document.getElementById('lucky-overlay').style.display = 'none'; nextTurn(); }
window.copyText = (text) => { navigator.clipboard.writeText(text); }

let maxQTime = 30;

// --- GRID QUESTION TIMER LOGIC ---
window.startQTimer = (seconds) => {
    if(qTimerInterval) clearInterval(qTimerInterval);
    qTimeLeft = seconds;
    maxQTime = Math.max(maxQTime, seconds);
    const qTimerDisplay = document.getElementById('q-timer');
    if(qTimerDisplay) qTimerDisplay.innerText = qTimeLeft;
    const path = document.getElementById('q-timer-path');
    if(path) path.style.stroke = '#3b82f6';
    updateTimerVisuals();
    
    qTimerInterval = setInterval(() => {
        qTimeLeft--;
        if(qTimerDisplay) qTimerDisplay.innerText = qTimeLeft;
        updateTimerVisuals();
        
        if(qTimeLeft <= 0) {
            clearInterval(qTimerInterval);
            playTTS("Time's up! Points halved.");
            if(path) { path.style.stroke = '#ef4444'; path.style.strokeDasharray = '0, 100'; }
            currentPotentialPoints = Math.floor((currentQuestion.points || 10) / 2);
            document.getElementById('q-points').innerText = currentPotentialPoints + " (Time!)";
            document.getElementById('q-points').style.backgroundColor = "var(--accent-soft)";
            document.getElementById('q-points').style.color = "red";
        }
    }, 1000);
};

window.updateTimerVisuals = () => {
    const path = document.getElementById('q-timer-path');
    if(!path) return;
    const dash = (Math.max(0, qTimeLeft) / maxQTime) * 100;
    path.style.strokeDasharray = \`\${dash}, 100\`;
    if (qTimeLeft <= 10 && qTimeLeft > 0) {
        path.style.stroke = 'var(--yellow)';
    }
};

window.toggleQTimer = () => {
    if(qTimerInterval) {
        clearInterval(qTimerInterval);
        qTimerInterval = null;
        const path = document.getElementById('q-timer-path');
        if(path) path.style.stroke = '#9ca3af'; // Grayed out when paused
    } else {
        const path = document.getElementById('q-timer-path');
        if(path) path.style.stroke = '#3b82f6';
        startQTimer(qTimeLeft);
    }
};

window.pauseQTimer = window.toggleQTimer; // For backwards compatibility
window.updateTimerVal = (val) => { qTimeLeft = parseInt(val); if(qTimerInterval) startQTimer(qTimeLeft); };
window.closeQuestionModal = () => { clearInterval(qTimerInterval); currentMultiplier = 1; currentRisk = false; document.getElementById('q-modal').style.display = 'none'; renderLeaderboard(); };

function openQuestion(q, isReview = false) {
    currentQuestion = q;
    currentPotentialPoints = q.points || 10;
    window.pmAnswerKeyRender();
    const modal = document.getElementById('q-modal');
    const content = document.getElementById('q-interaction-area');
    const feedback = document.getElementById('q-feedback');
    const controls = document.getElementById('host-controls');
    const showBtn = document.getElementById('show-answer-btn');
    const contextBox = document.getElementById('q-context-box');
    const hintBox = document.getElementById('hint-box');
    const pracArea = document.getElementById('practice-mode-area');
    
    document.getElementById('q-skill').innerText = q.skill || 'Challenge';
    document.getElementById('q-level').innerText = q.difficultyLevel || 'Std';
    document.getElementById('q-points').innerText = currentPotentialPoints;
    document.getElementById('q-streak').innerText = "🔥 " + currentStreak;
    
    refreshQuestionSlots();

    document.getElementById('q-text').innerText = q.question.replace(/^Question:/i, '').trim(); 
    document.getElementById('q-timer').classList.remove('danger');
    if (!isReview) startQTimer(30); else { clearInterval(qTimerInterval); document.getElementById('q-timer').innerText = "0"; }
    
    contextBox.style.display = 'none'; contextBox.innerHTML = '';
    if (q.context) {
        const cleanContext = q.context.replace(/^(Context|Text|Grammar Note):/i, '').trim();
        if (q.type === 'listening_comp') {
            contextBox.style.display = 'block'; contextBox.innerHTML = \`<div style="text-align:center; padding:20px;"><button class="btn-action btn-blue" onclick="event.stopPropagation(); playTTS(decodeURIComponent('\${encodeURIComponent(cleanContext)}'))"><i class="fas fa-volume-up"></i> Play Audio</button></div>\`;
        } else if (q.type === 'reading_comp' || q.type === 'writing_comp') {
            contextBox.style.display = 'block'; contextBox.innerHTML = \`<div style="background:#f1f5f9; border:1px solid rgba(15,23,42,0.12); padding:15px; border-radius:12px; color:var(--text);">\${cleanContext.replace(/\\n/g, '<br>')}</div>\`;
        } else if (q.type === 'alibi_puzzle') {
            // For Alibi in Grid, treat Context as the "Situation" description
            contextBox.style.display = 'block'; contextBox.innerHTML = \`<div style="background:#f1f5f9; border:1px solid rgba(15,23,42,0.12); padding:15px; border-radius:12px; color:var(--text);"><strong style="color:#c4b5fd;">Situation:</strong> \${cleanContext}</div>\`;
        } else if (!specialTypes.includes(q.type)) {
            contextBox.style.display = 'block'; contextBox.innerHTML = cleanContext.replace(/\\n/g, '<br>');
        }
    }
    
    hintBox.style.display = 'none';
    // Use the hint text for reading later
    document.getElementById('hint-btn').style.display = q.hint ? 'inline-block' : 'none';

    content.innerHTML = '';
    feedback.style.display = 'none';
    controls.style.display = 'none';
    showBtn.style.display = isReview ? 'none' : 'inline-block';
    pracArea.style.display = 'none';
    modal.style.display = 'flex';
    
    if (q.options && q.options.length > 0) {
        const grid = document.createElement('div'); grid.className = 'options-grid';
        // Randomize options for display
        const shuffled = [...q.options].sort(() => Math.random() - 0.5);
        shuffled.forEach(opt => {
            const btn = document.createElement('button'); btn.className = 'option-btn'; btn.innerText = opt;
            if (!isReview) btn.onclick = () => handleAutoCheck(opt, q.answer); 
            grid.appendChild(btn);
        });
        content.appendChild(grid);
    } else if (q.type === 'writing_comp') {
         content.innerHTML = '<input type="text" id="writing-input" style="width:100%; padding:15px; font-size:1.5rem; border:2px solid var(--gray-light); border-radius:12px; text-align:center;" placeholder="Type here...">';
    } else {
        content.innerHTML = '<p style="color:var(--gray); font-size:1.5rem; margin:20px 0;">Give your answer verbally.</p>';
    }
    
    content.style.display = 'block';
    // Every mode that shows a card sends it to the room (see THE ROOM), so phone
    // play is not a Grid-Arena-only feature.
    if (!isReview) pushQuestionToRoom(q);
    if (isReview) revealAnswer(null, true);
    else if (autoReadOn && q.question.length < 150) playTTS(q.question);
}

window.playHint = () => { 
    if(currentQuestion && currentQuestion.hint) {
        playTTS(currentQuestion.hint);
    } else {
        playTTS("Think carefully about the context.");
    }
    /* In Pictionary the hint is written on the brief card as well as spoken,
       because the drawer is mid-sketch and the popup is one tap away. */
    if (selectedGameMode === 'pictionary') {
        const box = document.getElementById('pic-hint-box');
        if (box) {
            box.innerText = '💡 ' + (currentQuestion && currentQuestion.hint ? currentQuestion.hint : 'Think about where it is and what happens next.');
            box.style.display = 'block';
            const pop = document.getElementById('pic-draw-popup');
            if (pop && !pop.classList.contains('open')) pop.classList.add('open');
        }
    }
}

// --- PRACTICE MODE (SPEECH) ---
let isPracticeListening = false;
let pRec = null;

window.togglePracticeMode = () => {
    const area = document.getElementById('practice-mode-area');
    const interact = document.getElementById('q-interaction-area');
    if (area.style.display === 'none') { area.style.display = 'block'; interact.style.display = 'none'; } 
    else { area.style.display = 'none'; interact.style.display = 'block'; if(isPracticeListening && pRec) pRec.stop(); }
};

window.togglePracticeMic = () => {
    if (!('webkitSpeechRecognition' in window)) return pmNotify("Browser not supported");
    const btn = document.getElementById('practice-mic-btn');
    const res = document.getElementById('practice-result');
    if (isPracticeListening) { pRec.stop(); isPracticeListening = false; btn.classList.remove('listening'); return; }
    pRec = new webkitSpeechRecognition(); pRec.lang = 'en-US'; pRec.interimResults = false;
    pRec.onstart = () => { isPracticeListening = true; btn.classList.add('listening'); res.innerHTML = "Listening..."; };
    pRec.onresult = (e) => { const transcript = e.results[0][0].transcript; res.innerHTML = transcript; if (transcript.toLowerCase().includes(currentQuestion.answer.toLowerCase())) revealAnswer(true); };
    pRec.onend = () => { isPracticeListening = false; btn.classList.remove('listening'); };
    pRec.start();
};

function handleAutoCheck(selected, correct) {
    const isCorrect = selected === correct || selected === "True" && correct === "True";
    revealAnswer(isCorrect);
}

/* =====================================================================
   THE MINI LESSON (colour-coded feedback)
   ---------------------------------------------------------------------
   A grid question is worth more than a right/wrong verdict: the moment the
   answer is revealed is the only moment the whole class is looking at the same
   thing. So the feedback the AI is asked for (see the partyMode prompt) is
   rendered here as coloured blocks — green for why the answer is right, red for
   what the wrong options reveal, blue for the rule, amber for the word, violet
   for something to say — with optional media (image / gif / audio / YouTube).

   Everything is optional: a lesson written before this existed still shows the
   old explanation/deepDive/examples fields, because the renderer falls back to
   them. And a broken media URL removes itself rather than leaving a torn icon on
   a projector.
   ===================================================================== */

/* Written without escape sequences on purpose: this file is a template literal, so
   a backslash that looks like a regex escape to the reader can be eaten before the
   lesson is ever built. Plain string work cannot be misread. */
function youtubeEmbedUrl(url) {
    const u = String(url || '');
    let id = '';
    if (u.indexOf('youtu.be/') > -1) id = u.split('youtu.be/')[1] || '';
    else if (u.indexOf('v=') > -1) id = u.split('v=')[1] || '';
    else if (u.indexOf('/embed/') > -1) id = u.split('/embed/')[1] || '';
    else if (u.indexOf('/shorts/') > -1) id = u.split('/shorts/')[1] || '';
    const clean = String(id).split('&')[0].split('?')[0].split('/')[0].split('#')[0].trim();
    return clean.length >= 6 ? 'https://www.youtube.com/embed/' + clean : '';
}

function feedbackMediaHtml(media) {
    if (!media || !media.length) return '';
    const figures = media.slice(0, 3).map(function (m) {
        if (!m) return '';
        const url = String(m.url || '').trim();
        if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) return '';
        const kind = String(m.kind || '').toLowerCase();
        const lower = url.toLowerCase();
        const caption = m.caption ? '<figcaption>' + m.caption + '</figcaption>' : '';
        const isVideo = kind === 'video' || lower.indexOf('youtu') > -1;
        if (isVideo) {
            const embed = youtubeEmbedUrl(url);
            if (!embed) return '';
            return '<figure><iframe src="' + embed + '" title="' + (m.caption || 'Video') + '" loading="lazy" allowfullscreen></iframe>' + caption + '</figure>';
        }
        if (kind === 'audio' || lower.indexOf('.mp3') > -1 || lower.indexOf('.ogg') > -1 || lower.indexOf('.wav') > -1 || lower.indexOf('.m4a') > -1) {
            return '<figure><audio controls preload="none" src="' + url + '" style="width:240px;"></audio>' + caption + '</figure>';
        }
        // Any other image: if it 404s, take the whole figure away — a broken image
        // in front of a class is worse than no image.
        return '<figure><img src="' + url + '" alt="' + (m.caption || '') + '" loading="lazy" onerror="var f=this.closest(&quot;figure&quot;); if(f) f.remove();">' + caption + '</figure>';
    }).filter(Boolean).join('');
    return figures ? '<div class="fb-media">' + figures + '</div>' : '';
}

/** Plain text of the mini lesson — what the 🔊 button reads out. */
function miniLessonText(q) {
    const fb = (q && q.feedback) || {};
    const bits = [fb.headline, fb.correct, fb.wrong, fb.rule, fb.vocab]
        .concat(fb.steps || []).concat(fb.examples || []).concat([fb.speak || (q && q.speakingCCQ)]);
    return bits.filter(Boolean).join(' ');
}

function buildMiniLessonHtml(q) {
    if (!q) return '';
    const fb = q.feedback || {};
    const block = function (cls, tag, body) {
        return body ? '<div class="fb-block ' + cls + '"><span class="fb-tag">' + tag + '</span>' + body + '</div>' : '';
    };
    const list = function (items, cls) {
        const clean = (items || []).filter(function (x) { return x && String(x).trim(); });
        if (!clean.length) return '';
        return '<' + (cls === 'ol' ? 'ol' : 'ul') + ' class="fb-steps">' + clean.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</' + (cls === 'ol' ? 'ol' : 'ul') + '>';
    };
    const media = (fb.media && fb.media.length) ? fb.media : (q.media || []);
    const parts = [
        block('fb-correct', '✅ Why that answer is right', fb.correct || q.explanation || ''),
        block('fb-wrong', '⚠️ What the wrong options show', fb.wrong || ''),
        block('fb-rule', '📘 The rule', fb.rule || q.deepDive || ''),
        block('fb-vocab', '🔤 The word', fb.vocab || ''),
        block('fb-rule', '🧩 Mini lesson', list(fb.steps, 'ol')),
        block('fb-rule', '🗣️ Model sentences', list(fb.examples || q.examples, 'ul')),
        block('fb-speak', '🎤 Say it yourself', fb.speak || q.speakingCCQ || ''),
    ].filter(Boolean).join('');
    const mediaHtml = feedbackMediaHtml(media);
    if (!parts && !mediaHtml) return '';
    const readBtn = parts
        ? '<div style="margin-top:8px;"><button class="btn-action btn-gray" style="padding:6px 12px; font-size:0.85rem;" onclick="readMiniLessonAloud()" title="Read the mini lesson out">🔊 Read this aloud</button></div>'
        : '';
    return '<div class="fb-mini">' + parts + mediaHtml + readBtn + '</div>';
}

window.readMiniLessonAloud = function () {
    const text = miniLessonText(currentQuestion);
    if (!text) { pmNotify('Nothing to read for this question.', 'info'); return; }
    playTTS(text);
};

window.revealAnswer = (autoResult = null, isReview = false) => {
    clearInterval(qTimerInterval);
    if(isPracticeListening && pRec) pRec.stop();
    const feedback = document.getElementById('q-feedback');
    const fbHeader = document.getElementById('fb-header');
    const fbContent = document.getElementById('fb-content');
    fbHeader.innerText = autoResult === false ? "INCORRECT" : "ANSWER REVEALED";
    fbHeader.style.color = autoResult === false ? "var(--accent)" : "var(--primary)";
    
    let html = \`<div class="fb-detail"><strong>Correct Answer:</strong> <span style="font-size:1.5rem; font-weight:800; color:var(--primary);">\${currentQuestion.answer}</span></div>\`;
    if (currentQuestion.explanation) html += \`<div class="fb-detail"><strong>Why?</strong> \${currentQuestion.explanation}</div>\`;
    if (currentQuestion.deepDive) html += \`<div class="fb-detail"><strong>Deep Dive:</strong> \${currentQuestion.deepDive}</div>\`;
    if (currentQuestion.examples && currentQuestion.examples.length) html += \`<div class="fb-detail"><strong>Examples:</strong><ul>\${currentQuestion.examples.map(e => \`<li>\${e}</li>\`).join('')}</ul></div>\`;
    // The question itself is repeated here: on a projector the tutor often reveals
    // the answer while the class is still reading the stem, and the mini lesson
    // below only makes sense next to what was actually asked.
    html += \`<div class="fb-detail" style="border-top:1px dashed rgba(15,23,42,0.18); padding-top:8px;"><strong>\${isReview ? 'Card' : 'Asked'}:</strong> \${String(currentQuestion.question || '').replace(/^Question:/i, '').trim()}\${currentQuestion.gridId ? ' <span style="font-family:monospace; color:var(--gray);">(cell ' + currentQuestion.gridId + ')</span>' : ''}</div>\`;
    html += buildMiniLessonHtml(currentQuestion);

    fbContent.innerHTML = html;
    feedback.style.display = 'block';
    // The phones follow the board: same answer, same mini lesson.
    pushRevealToRoom();
    
    if (isReview) { document.getElementById('host-controls').style.display = 'none'; document.getElementById('show-answer-btn').style.display = 'none'; } 
    else { document.getElementById('host-controls').style.display = 'flex'; document.getElementById('show-answer-btn').style.display = 'none'; }
    
    document.getElementById('q-interaction-area').style.display = 'none'; 
    document.getElementById('practice-mode-area').style.display = 'none';
    
    if (autoResult !== null && !isReview) {
        if(autoResult) { const phrase = celebrationPhrases[Math.floor(Math.random() * celebrationPhrases.length)].replace('{name}', players[currentPlayerIndex].name); playTTS(phrase); confetti(); } 
        else { const phrase = tauntPhrases[Math.floor(Math.random() * tauntPhrases.length)].replace('{name}', players[currentPlayerIndex].name); playTTS(phrase); }
    }
};

window.resolveTurn = (success) => {
    const p = players[currentPlayerIndex];
    // The score sheet records before the score changes, so the report can show the
    // card, who answered it and what it was worth even after the points moved.
    logOutcome(success);
    if(success) {
        const points = Math.round(currentPotentialPoints * currentMultiplier);
        p.score += points; currentStreak++;
        pmNotify('✅ ' + p.name + ' +' + points + ' pts' + (currentMultiplier > 1 ? ' (x' + currentMultiplier + ')' : '') + (currentRisk ? ' — the risk paid off!' : ''), 'good');
        pmPop('+' + points + (currentMultiplier > 1 ? ' ×' + currentMultiplier : ''), 'good');
        if (currentStreak % 5 === 0) { p.score += 50; playTTS("Streak Bonus! 50 Points!"); pmPop('🔥 Streak bonus +50', 'info'); confetti({ particleCount: 200, spread: 90 }); document.getElementById('streak-overlay').style.display = 'flex'; setTimeout(() => { document.getElementById('streak-overlay').style.display = 'none'; }, 3000); }
    } else {
        /* Penalty first, then the two shields that can cancel it: Immunity
           wipes the loss, Streak Saver keeps the streak. */
        let penalty = Math.round(currentPotentialPoints * (currentRisk ? 2 : 1));
        if (p.shield) { p.shield = false; penalty = 0; pmNotify('🛡️ Immunity absorbed that miss — no points lost.', 'info'); }
        else if (p.streakSaver > 0) { p.streakSaver--; pmNotify('🎯 Streak Saver kept your streak at 🔥 ' + currentStreak + '.', 'info'); }
        else { currentStreak = 0; }
        p.score -= penalty;
        if (penalty > 0) { pmNotify('❌ ' + p.name + ' loses ' + penalty + ' pts.', 'bad'); pmPop('−' + penalty, 'bad'); }
    }
    currentMultiplier = 1; currentRisk = false; document.getElementById('q-modal').style.display = 'none'; highlightActivePlayer(); nextTurn();
};

function nextTurn() {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    if (selectedGameMode === 'bamboozle') {
        if (gridItems.length && gridItems.every(i => i.taken)) {
            // The board is finished. This used to return before highlightActivePlayer(),
            // so the last team's score never reached the leaderboard — the one moment
            // everyone is watching it. Now the board updates, then the report opens.
            highlightActivePlayer();
            gridRoundLabel = gridRoundLabel === 'Re-teach' ? 'Re-teach (done)' : 'Final';
            pmNotify('GAME OVER — final score sheet is ready.', 'good');
            try { confetti({ particleCount: 180, spread: 90 }); } catch (e) { /* no confetti library offline */ }
            window.openReport();
            return;
        }
        highlightActivePlayer();
    }
}

// --- SPECIAL MODES LOGIC ---
window.startHSTimer = (initial) => {
    if(hsTimerInterval) clearInterval(hsTimerInterval);
    hsTimeLeft = initial;
    const display = document.getElementById(selectedGameMode === 'taboo' ? 'tb-timer' : 'hs-timer');
    if(display) display.innerText = hsTimeLeft;
    hsTimerInterval = setInterval(() => {
        hsTimeLeft--;
        if(display) display.innerText = hsTimeLeft;
        if(hsTimeLeft <= 0) {
            clearInterval(hsTimerInterval);
            playTTS("Time's up!");
            if(display) display.style.backgroundColor = '#ffcccc';
            if (selectedGameMode === 'hot_seat') { pmNotify("Round Over! Total Score: " + currentRoundScore); }
        }
    }, 1000);
};

window.pauseHSTimer = () => { clearInterval(hsTimerInterval); hsTimerInterval = null; };
window.resumeHSTimer = () => { startHSTimer(hsTimeLeft); };
window.adjustHSTimer = (amt) => { hsTimeLeft += amt; document.getElementById(selectedGameMode === 'taboo' ? 'tb-timer' : 'hs-timer').innerText = hsTimeLeft; };

window.resetHotSeat = () => { hotSeatQIndex = 0; currentRoundScore = 0; document.getElementById('hs-score-val').innerText = '0'; updateHotSeatDisplay(); startHSTimer(300); document.getElementById('hs-timer').style.backgroundColor = '#eee'; };

let hotSeatQIndex = 0;
let currentRoundScore = 0;
let tabooIndex = 0;

function nextSpecialQuestion() {
    if (specialQueue.length === 0) specialQueue = gameData.questions;
    
    // Cycle through queue properly instead of random if we want rounds
    const q = specialQueue.shift(); 
    specialQueue.push(q); // Re-add to end for infinite cycle
    currentQuestion = q;
    window.pmAnswerKeyRender();
    
    document.querySelectorAll('.special-game-overlay').forEach(el => el.style.display = 'none');
    
    if (selectedGameMode === 'pictionary') {
        document.getElementById('view-pictionary').style.display = 'flex';
        /* A statement, not a word. Lessons written before this change still say
           "Draw a cat", so the leading instruction is stripped and whatever is
           left — a noun or a whole scene — is what the drawer gets. */
        const statement = pmDrawStatement(q);
        const wordEl = document.getElementById('pictionary-word');
        wordEl.innerText = statement;
        const sayHint = document.getElementById('pic-say-hint');
        if (sayHint) sayHint.style.display = pmDrawIsScene(statement) ? 'none' : 'block';
        document.getElementById('pic-hint-box').style.display = 'none';
        /* The round opens readable — the auto-opened brief shows the statement
           straight away and the eye button hides it before the phone is passed. */
        picSetWordMasked(false);
        setTimeout(function () {
            initPictionary();
            /* Every round opens ready to draw: pen armed, default colour on. */
            const firstSwatch = document.querySelector('.pic-swatch');
            if (firstSwatch) { document.querySelectorAll('.pic-swatch').forEach(function (s) { s.classList.remove('on'); }); firstSwatch.classList.add('on'); }
            picUpdateSizeDot();
            /* Auto-open the brief so the drawer sees the statement immediately,
               then the class gets the full canvas the moment it is dismissed. */
            const pop = document.getElementById('pic-draw-popup');
            if (pop) pop.classList.add('open');
        }, 100);
    } else if (selectedGameMode === 'concept') {
        document.getElementById('view-concept').style.display = 'flex';
        if (q.icons && q.icons.length > 0) {
            const clueEls = document.querySelectorAll('.cl-clue');
            clueEls.forEach((el, i) => {
                el.innerHTML = '<i class="fas fa-question"></i>'; el.dataset.content = q.icons[i] || '❓'; el.classList.remove('revealed');
            });
        }
        
        // NEW ANSWER LOGIC - REVEAL ACTUAL ANSWER (Hidden Keyword)
        const ansEl = document.getElementById('cl-answer-display');
        ansEl.innerText = "TAP TO REVEAL"; 
        // FIX: Show the answer field which contains the actual concept link answer, not the question which might be a hint.
        const actualAnswer = q.answer || q.question.replace(/^Question:/i, '').trim() || "UNKNOWN";
        ansEl.dataset.answer = actualAnswer.replace(/^Answer:/i, '').trim();
        ansEl.classList.remove('revealed');
        
        document.getElementById('concept-hint-box').style.display = 'none';
    } else if (selectedGameMode === 'hot_seat') {
        document.getElementById('view-hotseat').style.display = 'flex';
        hotSeatQIndex = 0; currentRoundScore = 0; document.getElementById('hs-score-val').innerText = '0';
        updateHotSeatDisplay(); startHSTimer(300);
    } else if (selectedGameMode === 'taboo') {
        document.getElementById('view-taboo').style.display = 'flex';
        tabooIndex = 0; document.getElementById('taboo-hint-box').style.display = 'none';
        updateTabooDisplay(); startHSTimer(300); 
    } else if (selectedGameMode === 'alibi') {
        document.getElementById('view-alibi').style.display = 'flex';
        initAlibi();
    } else if (selectedGameMode === 'bomb') {
        document.getElementById('view-bomb').style.display = 'flex';
        initBomb();
    } else if (selectedGameMode === 'sentiment') {
        document.getElementById('view-sentiment').style.display = 'flex';
        initSentiment();
    } else if (selectedGameMode === 'spyfall') {
        document.getElementById('view-spyfall').style.display = 'flex';
        initSpyfall();
    }

    /* Every one of these views was display:none until this line, so nothing inside
       it had a height to measure. Fit the panels now that they are on screen —
       which is also what makes a long statement shrink instead of spilling out. */
    window.requestAnimationFrame(fitGamePanels);
    /* The sidebar belongs to every mode, not just the board: without this it kept
       whichever team it was drawn with when the grid was last dealt, so a game
       launched from the menu showed an empty avatar and the word "Player". */
    highlightActivePlayer();
}

// NEW FUNCTION FOR CONCEPT REVEAL
window.revealConceptAnswer = () => {
    const el = document.getElementById('cl-answer-display');
    if (!el.classList.contains('revealed')) {
        el.innerText = el.dataset.answer;
        el.classList.add('revealed');
        playTTS(el.innerText);
        confetti();
    }
}

// --- SENTIMENT ANALYST FIX ---
let sentimentMediaRecorder = null;
let sentimentAudioChunks = [];

/* What the drawer gets. A pictionary card can arrive as a scene ("the barista
   pours the milk while the dog waits") or, from a lesson written before this was
   a scene game, as scaffolding — "Draw a cat", "Draw this for your team: cat".
   Everything up to the first colon is instruction, not something to draw. */
function pmDrawStatement(q) {
    let s = String((q && q.question) || '').trim();
    const colon = s.indexOf(':');
    if (colon > -1 && colon < 70) s = s.slice(colon + 1);
    s = s.replace(/\\*\\*/g, '').replace(/^\\s*(draw|illustrate|sketch|show|describe)\\b\\s*:?\\s*(a|an|the)?\\s*/i, '').trim();
    return s || String((q && q.answer) || 'Mystery scene');
}

/* The prompt asks for a SCENE ("the barista pours the milk while the dog waits by
   the door"), because the drawer has to talk while they draw. Lessons written
   before that still carry single nouns, and a noun on its own leaves the drawer
   silent — so a word round asks for the sentence out loud instead of quietly
   dealing a one-word round the class cannot say anything about. */
function pmDrawIsScene(text) {
    const words = String(text || '').trim().split(/\\s+/).filter(Boolean);
    return words.length >= 4;
}

/* The line and the emotion for a Sentiment card. sentimentData is what the prompt
   asks for, and a card without it used to fall back to the word "Hello." — a game
   with nothing in it on a projector. The card itself nearly always carries the
   material: a quoted sentence in the question is the line to say, and the answer
   names the tone. That fallback is real lesson content instead of filler. */
function pmSentimentData(q) {
    q = q || {};
    const d = q.sentimentData;
    if (d && d.line) return { emotion: d.emotion || 'Neutral', line: String(d.line) };
    const quoted = String(q.question || '').match(/[“"']([^”"']{10,})[”"']/);
    const line = (quoted && quoted[1].trim()) || String(q.context || '').trim() || 'Hello.';
    const emotion = String(q.answer || q.sentiment || '').replace(/^(answer|tone|emotion)\\s*:\\s*/i, '').trim();
    return { emotion: emotion || 'Neutral', line: line };
}

function initSentiment() {
    // Ensure we cycle through data
    const data = pmSentimentData(currentQuestion);
    document.getElementById('sentiment-emotion').innerText = data.emotion;
    document.getElementById('sentiment-line').innerText = data.line;
    
    // Reset Audio UI
    const audioEl = document.getElementById('sentiment-audio-playback');
    audioEl.style.display = 'none';
    audioEl.src = '';
    
    document.getElementById('sentiment-feedback').innerText = "Tap mic to record";
    document.getElementById('sentiment-mic-btn').classList.remove('listening');
    
    const map = { 'Angry': '😡', 'Happy': '😃', 'Sad': '😢', 'Headache': '🤕', 'Pee': '🚽', 'Secretive': '🤫', 'Robot': '🤖', 'Sleepy': '😴' };
    document.getElementById('sentiment-icon').innerText = map[Object.keys(map).find(k => data.emotion.includes(k))] || '🎭';
}

window.toggleSentimentRec = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { pmNotify("Microphone not supported."); return; }
    
    const btn = document.getElementById('sentiment-mic-btn');
    const feedback = document.getElementById('sentiment-feedback');
    const audioEl = document.getElementById('sentiment-audio-playback');

    if (sentimentMediaRecorder && sentimentMediaRecorder.state === 'recording') {
        sentimentMediaRecorder.stop();
        btn.classList.remove('listening');
        feedback.innerText = "Recording saved.";
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        sentimentMediaRecorder = new MediaRecorder(stream);
        sentimentAudioChunks = [];

        sentimentMediaRecorder.ondataavailable = (e) => {
            sentimentAudioChunks.push(e.data);
        };

        sentimentMediaRecorder.onstop = () => {
            const blob = new Blob(sentimentAudioChunks, { type: 'audio/ogg; codecs=opus' });
            const audioURL = window.URL.createObjectURL(blob);
            audioEl.src = audioURL;
            audioEl.style.display = 'block';
        };

        sentimentMediaRecorder.start();
        btn.classList.add('listening');
        feedback.innerText = "Recording...";
    } catch (e) {
        console.error(e);
        pmNotify("Could not access microphone.");
    }
};

window.sentimentNext = (pass) => {
    if(pass) {
        players[currentPlayerIndex].score += 15;
        confetti();
        playTTS("Emotion captured perfectly!");
    } else {
        playTTS("Try more emotion next time.");
    }
    renderLeaderboard();
    nextSpecialQuestion(); // Cycles to next item in queue
};

/* A player's face: the avatar seed is content, the name is the fallback. */
function spyAvatar(p) {
    return 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + encodeURIComponent((p && (p.avatarSeed || p.name)) || 'player');
}

let spyState = { data: null, index: 0, playing: false, timer: null };

function initSpyfall() {
    let data = currentQuestion.spyfallData;
    if (!data || !Array.isArray(data.players) || data.players.length < 3) {
        const round = BUILTIN_SPYFALL[spyfallBuiltinIndex++ % BUILTIN_SPYFALL.length];
        data = { location: round.location, job: round.job, players: round.players };
        currentQuestion.spyfallData = data;
        currentQuestion.answer = (round.players.filter(function (p) { return p.isSpy; })[0] || {}).name || '';
    }
    document.getElementById('spyfall-context').innerText = 'Location: ' + data.location + '  |  Job: ' + data.job;
    /* Every player is a character with a stated gender, so each one gets a voice
       that fits them before the first line is spoken — a class should never hear
       a woman speaking in a man's voice, or six people sounding like one. */
    pmRegisterCast(data.players.map(function (p) { return { name: p.name, gender: p.gender, role: data.job }; }));
    spyState = { data: data, index: 0, playing: false, timer: null };
    const grid = document.getElementById('spy-grid');
    grid.innerHTML = '';
    document.getElementById('spy-reveal-area').style.display = 'none';
    document.getElementById('spy-speaker').style.display = 'none';
    const statement = document.getElementById('spy-statement');
    if (statement) { statement.innerText = 'Tap a face to hear what they say.'; statement.classList.add('is-placeholder'); }
    data.players.forEach(function (p, i) {
        const card = document.createElement('div');
        card.className = 'spy-card';
        card.setAttribute('data-i', String(i));
        card.innerHTML = '<img src="' + spyAvatar(p) + '" class="spy-avatar" alt="">'
            + '<div class="spy-name">' + attrEsc(p.name) + '</div>'
            + '<button class="spy-accuse-btn" data-accuse="' + attrEsc(p.name) + '" data-spy="' + (p.isSpy ? '1' : '0') + '">ACCUSE</button>';
        card.addEventListener('click', function (e) {
            // The accuse button has its own handler; a click on the face speaks.
            if (e.target && e.target.classList && e.target.classList.contains('spy-accuse-btn')) return;
            spySay(i);
        });
        const btn = card.querySelector('.spy-accuse-btn');
        if (btn) btn.addEventListener('click', function (e) {
            e.stopPropagation();
            window.checkSpy(btn.getAttribute('data-accuse'), btn.getAttribute('data-spy') === '1');
        });
        grid.appendChild(card);
    });
    fitGamePanels();
}

/** Show a player's line and speak it in that character's own voice. */
function spySay(i) {
    if (!spyState || !spyState.data) return;
    const p = spyState.data.players[i];
    if (!p) return;
    spyState.index = i;
    const statement = document.getElementById('spy-statement');
    if (statement) { statement.innerText = p.statement; statement.classList.remove('is-placeholder'); }
    const strip = document.getElementById('spy-speaker');
    if (strip) strip.style.display = 'flex';
    const nameEl = document.getElementById('spy-speaker-name');
    if (nameEl) nameEl.innerText = p.name;
    const img = document.getElementById('spy-speaker-avatar');
    if (img) img.src = spyAvatar(p);
    Array.prototype.forEach.call(document.querySelectorAll('#spy-grid .spy-card'), function (c) {
        c.classList.toggle('speaking', String(c.getAttribute('data-i')) === String(i));
    });
    fitGamePanels();
    speakAs(p.name, p.statement);
}

window.spyRepeat = function () { if (spyState) spySay(spyState.index); };
window.spyPlayAll = function () {
    const btn = document.getElementById('spy-auto-btn');
    if (!spyState || !spyState.data) return;
    if (spyState.playing) {
        spyState.playing = false;
        if (spyState.timer) window.clearTimeout(spyState.timer);
        try { window.speechSynthesis.cancel(); } catch (e) { /* nothing playing */ }
        if (btn) btn.innerText = '▶ Hear everyone in turn';
        return;
    }
    const players = spyState.data.players;
    spyState.playing = true;
    if (btn) btn.innerText = '■ Stop';
    let i = 0;
    const step = function () {
        if (!spyState || !spyState.playing || i >= players.length) {
            if (spyState) spyState.playing = false;
            if (btn) btn.innerText = '▶ Hear everyone in turn';
            return;
        }
        spySay(i);
        /* A slot per line rather than chaining onend: six different voices on a
           classroom laptop fire onend at different times (and not at all if the
           browser has no speech engine), which used to stall the sequence. */
        const words = String(players[i].statement || '').split(/\\s+/).length;
        const wait = Math.max(7000, words * 420);
        i++;
        spyState.timer = window.setTimeout(step, wait);
    };
    step();
};
function stopSpokenSequence() {
    if (spyState && spyState.playing) {
        spyState.playing = false;
        if (spyState.timer) window.clearTimeout(spyState.timer);
        const btn = document.getElementById('spy-auto-btn');
        if (btn) btn.innerText = '▶ Hear everyone in turn';
    }
    try { window.speechSynthesis.cancel(); } catch (e) { /* nothing playing */ }
}

/** Keep the two spoken panels readable: type fitted to the box, never clipped. */
/** Every game panel that can receive an unpredictable amount of text: the Spyfall
 *  and Alibi lines, the Sentiment line and the Keep Talking directive. Each is
 *  fitted to its own frame,
 *  so a long statement shrinks until it fits and a short one grows until it fills
 *  the card — the type is as large as the space allows and never leaves the frame.
 *  A panel that is genuinely too full stops at 13px and scrolls, because 9px text
 *  that technically fits is worse than a scrollbar nobody has to touch.
 *
 *  Two of these are fitted on their CARD rather than on the text, because the text
 *  inside them sets no size of its own and simply inherits it. */
function fitGamePanels() {
    /* [element id, floor, ceiling] */
    const panels = [
        ['spy-statement', 13, 48],
        ['alibi-statement', 13, 52],
        ['sentiment-card', 13, 44],
        ['bomb-task-card', 13, 40],
        ['social-line', 14, 34]
    ];
    panels.forEach(function (spec) {
        const el = document.getElementById(spec[0]);
        if (!el || el.clientHeight <= 0) return;
        /* A panel still showing its "tap a face" prompt is not a long line, and
           fitting it to the ceiling turned the prompt into a 40px sentence. The
           prompt keeps a prompt's size; real content gets the whole frame. */
        const ceiling = el.classList.contains('is-placeholder') ? Math.min(spec[2], 20) : spec[2];
        fitFontToBox(el, spec[1], ceiling);
    });
}

window.checkSpy = (name, isSpy) => {
    const title = document.getElementById('spy-reveal-title');
    const desc = document.getElementById('spy-reveal-desc');
    const area = document.getElementById('spy-reveal-area');
    if (isSpy) { title.innerText = "CORRECT!"; title.style.color = "var(--primary)"; desc.innerText = name + " was the Spy!"; players[currentPlayerIndex].score += 50; confetti(); } 
    else { title.innerText = "WRONG!"; title.style.color = "#ef4444"; desc.innerText = name + " was innocent."; }
    area.style.display = 'block'; renderLeaderboard();
};

// --- ALIBI PUZZLE LOGIC UPDATED ---
function alibiAvatar(s) {
    return 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + encodeURIComponent((s && s.name) || 'suspect');
}
let alibiState = { suspects: [], selected: null };

/* Both of these games need a whole cast, and the AI content is best-effort: an
   Alibi card can arrive with no suspects and a Spyfall card with no table, and the
   built-in rounds the generator appends are chosen one per round, so a card is not
   always the one that carries the cast. A tile that opens onto "no data" is the
   worst outcome in a room full of learners, so each game falls back to the built-in
   library and steps through it round by round. */
let alibiBuiltinIndex = 0;
let spyfallBuiltinIndex = 0;

function initAlibi() {
    const container = document.getElementById('suspects-container');
    container.innerHTML = '';
    const q = currentQuestion || {};

    let suspects = Array.isArray(q.suspects)
        ? q.suspects.filter(function (s) { return s && s.name && s.alibi; })
        : [];
    if (suspects.length < 2) {
        const round = BUILTIN_ALIBI[alibiBuiltinIndex++ % BUILTIN_ALIBI.length];
        suspects = round.suspects;
        q.suspects = round.suspects;
        q.context = round.context;
        q.question = round.question;
        const guilty = round.suspects.filter(function (s) { return s.isGuilty; })[0];
        q.answer = guilty ? guilty.name : '';
    }

    // The situation the class reads before anyone speaks.
    if (q.context) {
        document.getElementById('alibi-context-display').innerText = String(q.context).replace(/^(Context|Text|Situation):/i, '').trim();
    }

    guiltySuspect = suspects.filter(function (s) { return s.isGuilty; })[0] || null;
    alibiState = { suspects: suspects, selected: null };

    document.getElementById('alibi-status').innerText = 'Click a suspect to interrogate.';
    const statement = document.getElementById('alibi-statement');
    if (statement) { statement.innerText = 'Interrogate a suspect to hear their story.'; statement.classList.add('is-placeholder'); }
    const strip = document.getElementById('alibi-speaker');
    if (strip) strip.style.display = 'none';
    const accuse = document.getElementById('alibi-accuse-btn');
    if (accuse) accuse.style.display = 'none';

    // Each suspect is a character with a gender, so the interrogation plays back
    // in a voice that matches the person who is speaking.
    pmRegisterCast(suspects.map(function (s) { return { name: s.name, gender: s.gender, role: 'suspect' }; }));

    suspects.forEach(function (s, i) {
        const div = document.createElement('div');
        div.className = 'alibi-suspect';
        div.innerHTML = '<img src="' + alibiAvatar(s) + '" alt="">'
            + '<div class="alibi-suspect-name">' + attrEsc(s.name) + '</div>';
        div.addEventListener('click', function () { selectSuspect(i); });
        container.appendChild(div);
    });
    fitGamePanels();
}

/** Interrogate one suspect: show the long alibi in the fitted panel and read it. */
function selectSuspect(i) {
    const s = alibiState && alibiState.suspects ? alibiState.suspects[i] : null;
    if (!s) return;
    alibiState.selected = i;
    const status = document.getElementById('alibi-status');
    if (status) status.innerText = 'Interrogating ' + s.name;
    const statement = document.getElementById('alibi-statement');
    if (statement) { statement.innerText = s.alibi; statement.classList.remove('is-placeholder'); }
    const strip = document.getElementById('alibi-speaker');
    if (strip) strip.style.display = 'flex';
    const nameEl = document.getElementById('alibi-speaker-name');
    if (nameEl) nameEl.innerText = s.name;
    const img = document.getElementById('alibi-speaker-avatar');
    if (img) img.src = alibiAvatar(s);
    const accuse = document.getElementById('alibi-accuse-btn');
    if (accuse) { accuse.style.display = 'inline-flex'; accuse.innerText = 'ACCUSE ' + s.name.toUpperCase(); }
    Array.prototype.forEach.call(document.querySelectorAll('#suspects-container .alibi-suspect'), function (d, k) {
        d.classList.toggle('selected', k === i);
    });
    fitGamePanels();
    speakAs(s.name, s.alibi);
}

window.alibiRepeat = function () {
    if (alibiState && alibiState.selected !== null) selectSuspect(alibiState.selected);
};
window.accuseSelectedSuspect = function () {
    const s = (alibiState && alibiState.selected !== null) ? alibiState.suspects[alibiState.selected] : null;
    if (!s) return;
    window.confirmAlibiAccusation(s.name, !!s.isGuilty);
};

window.confirmAlibiAccusation = (name, isGuilty) => {
    if (isGuilty) {
        pmNotify("CORRECT! " + name + " lied!");
        players[currentPlayerIndex].score += 50;
        confetti();
        nextSpecialQuestion(); // x3 logic handled by main queue
    } else {
        pmNotify("INCORRECT. " + name + " is telling the truth.");
        players[currentPlayerIndex].score -= 10;
        nextTurn(); // Pass to next player to try
    }
    renderLeaderboard();
};

// --- KEEP TALKING (BOMB) LOGIC ---
let bombTimer = null;
let bombTimeLeft = 150;
let bombTasks = [];
let bombTaskIndex = 0;
let audioContext = null;
let microphone = null;
let analyser = null;

function initBomb() {
    bombTasks = currentQuestion.bombTasks || [];
    bombTaskIndex = 0;
    bombTimeLeft = 150;
    document.getElementById('bomb-timer').innerText = "02:30";
    document.getElementById('bomb-task-text').innerText = "Waiting...";
    fitGamePanels();
    document.getElementById('start-bomb-btn').style.display = 'inline-block';
    
    // Clear previous bomb classes
    const wrapper = document.getElementById('bomb-game-wrapper');
    if (wrapper) wrapper.classList.remove('bomb-active-bg');
}

// Minimal Audio Oscillator for siren/beeps
const playSiren = () => {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
};

const playTick = () => {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, audioContext.currentTime);
    gain.gain.setValueAtTime(0.05, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    osc.start();
    osc.stop(audioContext.currentTime + 0.1);
};

window.startBombGame = async () => {
    document.getElementById('start-bomb-btn').style.display = 'none';
    const wrapper = document.getElementById('bomb-game-wrapper');
    if (wrapper) wrapper.classList.add('bomb-active-bg');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        bombTimeLeft = 150;
        let silenceCount = 0;
        document.getElementById('bomb-task-text').innerText = bombTasks[0] || "Just talk!";
        
        bombTimer = setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for(let i = 0; i < bufferLength; i++) sum += dataArray[i];
            let average = sum / bufferLength;
            const meter = document.getElementById('volume-meter');
            meter.style.width = Math.min(100, average * 2) + '%';
            if(average < 10) silenceCount++; else silenceCount = 0;
            let decrement = 1;
            const status = document.getElementById('bomb-status');
            const timerEl = document.getElementById('bomb-timer');
            if(silenceCount > 4) { 
                decrement = 3; 
                status.innerText = "WARNING! AUDIO DROPPED! -3s/sec"; 
                status.style.color = "red"; 
                playSiren();
            } 
            else { 
                status.innerText = "SENSOR ALIGNED"; 
                status.style.color = "var(--primary)"; 
                if (bombTimeLeft < 60) playTick(); // Tick faster/louder under 1 minute
            }
            bombTimeLeft -= decrement;
            if(bombTimeLeft <= 0) { 
                clearInterval(bombTimer); 
                timerEl.innerText = "DETONATED"; 
                if (wrapper) wrapper.classList.remove('bomb-active-bg');
                pmNotify("MISSION FAILED: EXPLOSION!"); 
                closeSpecialGame();
            } 
            else { 
                const m = Math.floor(bombTimeLeft / 60); 
                const s = bombTimeLeft % 60; 
                timerEl.innerText = \`0\${m}:\${s < 10 ? '0'+s : s}\`; 
            }
        }, 1000);
    } catch(e) { pmNotify("Microphone needed for this game!"); }
};

window.nextBombTask = () => {
    bombTaskIndex++;
    if(bombTaskIndex >= bombTasks.length) bombTaskIndex = 0;
    const card = document.getElementById('bomb-task-card');
    card.style.transform = 'scale(0.9)';
    setTimeout(() => card.style.transform = 'scale(1)', 100);
    document.getElementById('bomb-task-text').innerText = bombTasks[bombTaskIndex];
    fitGamePanels();
    players[currentPlayerIndex].score += 5;
    renderLeaderboard();
    window.pmAnswerKeyRender();
};

function updateHotSeatDisplay() {
    if (currentQuestion.hotSeatQuestions && hotSeatQIndex < currentQuestion.hotSeatQuestions.length) { document.getElementById('hs-word').innerText = "Q" + (hotSeatQIndex + 1) + ": " + currentQuestion.hotSeatQuestions[hotSeatQIndex]; } 
    else { document.getElementById('hs-word').innerText = "All questions done! Bonus points!"; }
    window.pmAnswerKeyRender();
}

function updateTabooDisplay() {
    if (currentQuestion.tabooCards && tabooIndex < currentQuestion.tabooCards.length) {
        const card = currentQuestion.tabooCards[tabooIndex];
        document.getElementById('tb-target').innerText = card.target;
        document.getElementById('tb-forbidden').innerHTML = (card.forbidden || []).join('<br>');
    } else { document.getElementById('tb-target').innerText = "Done!"; document.getElementById('tb-forbidden').innerHTML = ""; }
    window.pmAnswerKeyRender();
}

window.revealClue = (el, idx) => {
    if (el.dataset.content) el.innerHTML = el.dataset.content; else el.innerText = (idx+1);
    el.classList.add('revealed');
};

window.hsPass = () => {
    if (selectedGameMode === 'taboo') { tabooIndex++; updateTabooDisplay(); } else { nextSpecialQuestion(); }
};

window.hsNextQuestion = (correct) => {
    if (hsTimeLeft <= 0) return; 
    if (correct) { currentRoundScore++; document.getElementById('hs-score-val').innerText = currentRoundScore; players[currentPlayerIndex].score++; renderLeaderboard(); }
    hotSeatQIndex++;
    updateHotSeatDisplay();
};

window.hsCorrect = () => {
    players[currentPlayerIndex].score += (currentQuestion.points || 10);
    renderLeaderboard();
    if (selectedGameMode === 'taboo') { tabooIndex++; updateTabooDisplay(); } else { nextSpecialQuestion(); }
};

window.showPicHint = () => { playTTS("Hint: " + (currentQuestion.hint || "No hint available")); };
window.showTabooHint = () => { playTTS("Hint: " + (currentQuestion.hint || "No hint available")); };
window.showConceptHint = () => { playTTS("Hint: " + (currentQuestion.hint || "No hint available")); };

window.closeSpecialGame = () => {
    // A character-by-character read-aloud must not keep going after the tutor
    // leaves the game — the class hears it over whatever comes next.
    stopSpokenSequence();
    clearInterval(hsTimerInterval); if(bombTimer) clearInterval(bombTimer); if(audioContext) audioContext.close();
    // Stop streams
    if(sentimentMediaRecorder && sentimentMediaRecorder.state === 'recording') sentimentMediaRecorder.stop();
    
    document.querySelectorAll('.special-game-overlay').forEach(el => el.style.display = 'none');
    goToModeSelect();
}

// Pictionary — a real drawing engine (Fabric.js), not a pixel buffer.
/* The old board recorded polyline commands and replayed them. That is enough for
   a pen and nothing else: no eraser that respects what is underneath, no way to
   move a shape once it is drawn, no scaling, no text. Fabric gives every mark a
   place in an OBJECT MODEL, so a shape can be selected, dragged, scaled, rotated
   and re-stacked — which is what makes the rail feel like a drawing app instead
   of finger painting. It is loaded from the CDN in <head>; if it is missing (an
   offline classroom) the studio says so instead of silently pretending. */
let pmFab = null;
let picTool = 'pen';
let picDraft = null;        // the shape being dragged out right now
let picOrigin = null;
let picLast = null;
let picHistory = [];        // serialised board states, oldest first
let picFuture = [];
const PIC_BG = '#ffffff';
const PIC_HISTORY_MAX = 40;

function picFabricReady() { return typeof fabric !== 'undefined'; }

/* One fabric canvas per lesson. Re-initialising on every round would wrap the
   <canvas> in a second .canvas-container and detach the pointer from the board,
   so it is created once and only ever cleared. */
function picEngine() {
    if (pmFab && pmFab._pmAlive) return pmFab;
    if (!picFabricReady()) return null;
    const el = document.getElementById('pictionary-canvas');
    if (!el) return null;
    pmFab = new fabric.Canvas(el, {
        backgroundColor: PIC_BG,
        preserveObjectStacking: true,
        selection: false,
        renderOnAddRemove: false,
    });
    pmFab._pmAlive = true;
    pmFab.freeDrawingBrush = new fabric.PencilBrush(pmFab);
    pmFab.on('path:created', function () { picCommit(); });
    pmFab.on('object:modified', function () { picCommit(); });
    pmFab.on('mouse:down', picPointerDown);
    pmFab.on('mouse:move', picPointerMove);
    pmFab.on('mouse:up', picPointerUp);
    return pmFab;
}

/* The board is whatever the frame can spare: re-measured on open and on resize,
   so a projector gets a big canvas and a phone still gets enough to draw on. */
function picResizeCanvas() {
    const c = picEngine();
    if (!c) return;
    const host = document.getElementById('pictionary-canvas-container');
    if (!host) return;
    const w = Math.max(120, Math.round(host.clientWidth));
    const h = Math.max(120, Math.round(host.clientHeight));
    if (c.getWidth() !== w || c.getHeight() !== h) {
        c.setDimensions({ width: w, height: h });
        c.calcOffset();
    }
}

/* ---- brushes ---- */
function picIsBrushTool() { return picTool === 'pen' || picTool === 'marker' || picTool === 'eraser'; }
function picIsShapeTool() { return picTool === 'rect' || picTool === 'ellipse' || picTool === 'arrow' || picTool === 'line'; }
function picInk() { return (document.getElementById('pic-color') || {}).value || '#0f172a'; }
function picWidth() {
    const n = Number((document.getElementById('pic-size') || {}).value) || 4;
    if (picTool === 'eraser') return Math.max(12, n * 4);
    if (picTool === 'marker') return n * 3.2;
    return n;
}
/* The marker is translucent so it layers like a real highlighter. A brush-wide
   globalAlpha would fade the whole stroke including its overlaps, so the alpha
   rides on the colour instead — two marker passes then read as two passes. */
function picInkWithAlpha(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function picBrushColour() {
    /* The eraser paints the board's own white. Fabric's EraserBrush punches
       alpha instead, which leaves a hole you can see the page through. */
    if (picTool === 'eraser') return PIC_BG;
    if (picTool === 'marker') return picInkWithAlpha(picInk(), 0.5);
    return picInk();
}

/* ---- history: the whole board, so undo also reverses a move or a scale ---- */
function picSnapshot() {
    const c = picEngine();
    if (!c) return null;
    return JSON.stringify(c.toDatalessJSON());
}
function picCommit() {
    const snap = picSnapshot();
    if (snap === null) return;
    if (picHistory.length && picHistory[picHistory.length - 1] === snap) return;
    picHistory.push(snap);
    if (picHistory.length > PIC_HISTORY_MAX) picHistory.shift();
    picFuture = [];
}
function picRestore(snap) {
    const c = picEngine();
    if (!c || !snap) return;
    c.loadFromJSON(snap, function () {
        picSyncSelectability();
        c.requestRenderAll();
    });
}/* ---- pointer: freehand belongs to Fabric, shapes and text are ours ---- */
function picPointerDown(opt) {
    const c = picEngine();
    if (!c || c.isDrawingMode) return;
    if (picTool === 'text') { picAddText(c.getPointer(opt.e)); return; }
    if (!picIsShapeTool()) return;
    picOrigin = c.getPointer(opt.e);
    picLast = picOrigin;
}
function picPointerMove(opt) {
    const c = picEngine();
    if (!c || !picOrigin) return;
    picLast = c.getPointer(opt.e);
    if (picDraft) { c.remove(picDraft); picDraft = null; }
    picDraft = picMakeShape(picOrigin, picLast);
    if (!picDraft) return;
    picDraft.selectable = false; picDraft.evented = false;
    c.add(picDraft);
    c.requestRenderAll();
}
function picPointerUp(opt) {
    const c = picEngine();
    if (!c || !picOrigin) return;
    const end = (opt && c.getPointer(opt.e)) || picLast;
    if (picDraft) { c.remove(picDraft); picDraft = null; }
    const shape = picMakeShape(picOrigin, end);
    picOrigin = null; picLast = null;
    if (!shape) return;
    c.add(shape);
    shape.setCoords();
    picSyncSelectability();
    picCommit();
    c.requestRenderAll();
}

function picMakeShape(a, b) {
    const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    if (w < 5 && h < 5) return null;              // a stray click is not a shape
    const left = Math.min(a.x, b.x), top = Math.min(a.y, b.y);
    const common = {
        fill: 'transparent', stroke: picInk(), strokeWidth: Math.max(2, picWidth()),
        strokeLineCap: 'round', strokeLineJoin: 'round',
        selectable: false, evented: false, objectCaching: false,
    };
    if (picTool === 'rect') {
        return new fabric.Rect(Object.assign({ left: left, top: top, width: w, height: h, rx: 8, ry: 8 }, common));
    }
    if (picTool === 'ellipse') {
        return new fabric.Ellipse(Object.assign({ left: left, top: top, rx: Math.max(1, w / 2), ry: Math.max(1, h / 2) }, common));
    }
    if (picTool === 'line') {
        return new fabric.Line([a.x, a.y, b.x, b.y], Object.assign({}, common));
    }
    /* An arrow is a shaft plus a solid head, welded into one group so it moves
       and scales as a single object instead of two that drift apart. */
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const head = Math.max(10, common.strokeWidth * 4);
    const shaft = new fabric.Line(
        [a.x, a.y, b.x - Math.cos(ang) * head * 0.85, b.y - Math.sin(ang) * head * 0.85],
        { stroke: common.stroke, strokeWidth: common.strokeWidth, strokeLineCap: 'round' });
    const tip = 'M ' + b.x + ' ' + b.y
        + ' L ' + (b.x - Math.cos(ang - 0.42) * head) + ' ' + (b.y - Math.sin(ang - 0.42) * head)
        + ' L ' + (b.x - Math.cos(ang + 0.42) * head) + ' ' + (b.y - Math.sin(ang + 0.42) * head) + ' Z';
    const cap = new fabric.Path(tip, { fill: common.stroke, stroke: common.stroke, strokeWidth: 1 });
    return new fabric.Group([shaft, cap], { selectable: false, evented: false, objectCaching: false });
}

function picAddText(p) {
    const c = picEngine();
    if (!c) return;
    const t = new fabric.IText('Type here', {
        left: p.x, top: p.y, fill: picInk(), fontSize: Math.max(16, picWidth() * 5), fontWeight: '700',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        selectable: true, evented: true,
    });
    c.add(t);
    c.setActiveObject(t);
    picCommit();
    c.requestRenderAll();
    if (t.enterEditing) { try { t.enterEditing(); } catch (e) { /* host without a caret */ } }
}

/* Only the select tool hands the board's objects to the pointer. Every other
   tool owns the pointer itself, so a brush stroke never grabs a shape that
   happens to be under it — the single worst thing about the old canvas. */
function picSyncSelectability() {
    const c = picEngine();
    if (!c) return;
    const pick = picTool === 'select';
    c.selection = pick;
    c.forEachObject(function (o) { o.selectable = pick; o.evented = pick; });
    if (!pick) c.discardActiveObject();
}

function picRailActivate(tool) {
    picTool = tool;
    document.querySelectorAll('.tool-btn[data-tool]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-tool') === tool);
    });
}

function picApplyBrush() {
    const c = picEngine();
    if (!c) return;
    c.freeDrawingBrush.color = picBrushColour();
    c.freeDrawingBrush.width = picWidth();
    c.isDrawingMode = picIsBrushTool();
    picSyncSelectability();
    c.defaultCursor = picTool === 'select' ? 'move' : 'crosshair';
    c.setCursor(c.defaultCursor);
    c.requestRenderAll();
    picUpdateSizeDot();
}

/* ---- the mannequin: a draggable, scaleable figure for "draw a person" ---- */
function picMannequin(female) {
    const c = picEngine();
    if (!c) return;
    const u = Math.max(26, Math.min(c.getWidth(), c.getHeight()) * 0.07);
    const ink = 'rgba(15,23,42,0.55)';
    const limb = function (x1, y1, x2, y2) {
        return new fabric.Line([x1 * u, y1 * u, x2 * u, y2 * u],
            { stroke: ink, strokeWidth: 2.4, strokeLineCap: 'round' });
    };
    const parts = [
        new fabric.Circle({ left: 0, top: -3.05 * u, radius: 0.6 * u, originX: 'center', originY: 'center',
            fill: 'rgba(15,23,42,0.10)', stroke: ink, strokeWidth: 2.4 }),
        limb(0, -2.4, 0, -0.05),
        limb(-1.1, -2.05, 1.1, -2.05),
        limb(-1.1, -2.05, -1.45, -0.5),
        limb(1.1, -2.05, 1.45, -0.5),
        limb(-0.55, 0, -0.6, 1.95),
        limb(0.55, 0, 0.6, 1.95),
    ];
    if (female) {
        /* A skirt instead of straight legs, so the second build is visibly a
           second build rather than a button that appears to do nothing. */
        parts.push(new fabric.Path(
            'M ' + (-0.62 * u) + ' 0 L ' + (0.62 * u) + ' 0 L ' + (1.2 * u) + ' ' + (1.15 * u)
            + ' L ' + (-1.2 * u) + ' ' + (1.15 * u) + ' Z',
            { fill: 'transparent', stroke: ink, strokeWidth: 2.4, strokeLineJoin: 'round' }));
    }
    const g = new fabric.Group(parts, {
        left: c.getWidth() * 0.34, top: c.getHeight() * 0.5,
        originX: 'center', originY: 'center', objectCaching: false,
    });
    g._pmMannequin = true;
    c.add(g);
    picRailActivate('select');
    picApplyBrush();
    c.setActiveObject(g);
    picCommit();
    c.requestRenderAll();
}

/* ---- booting a round ---- */
function initPictionary() {
    const c = picEngine();
    const host = document.getElementById('pictionary-canvas-container');
    if (!c) {
        /* No CDN, no board. Say so instead of handing the tutor a dead canvas. */
        if (host && !host.querySelector('.pic-nocdn')) {
            host.insertAdjacentHTML('beforeend', '<div class="pic-nocdn">The drawing engine could not load. This lesson needs a connection the first time it is opened — reload once you are back online.</div>');
        }
        return;
    }
    picResizeCanvas();
    picRailActivate('pen');
    picApplyBrush();
}

window.picUndo = function () {
    if (picHistory.length < 2) return;
    picFuture.push(picHistory.pop());
    picRestore(picHistory[picHistory.length - 1]);
};
window.picRedo = function () {
    if (!picFuture.length) return;
    const snap = picFuture.pop();
    picHistory.push(snap);
    picRestore(snap);
};
/* Keyboard: Ctrl/Cmd+Z undo, Shift+Z redo, Delete removes the selected mark —
   the three shortcuts anyone who has used a drawing app already has in their
   fingers, so nobody has to hunt for the rail mid-round. */
document.addEventListener('keydown', function (e) {
    if (selectedGameMode !== 'pictionary') return;
    const popOpen = document.getElementById('pic-draw-popup');
    if (popOpen && popOpen.classList.contains('open') && e.key === 'Escape') { togglePicDrawPopup(); return; }
    const c = picEngine();
    if (c && (e.key === 'Delete' || e.key === 'Backspace') && c.getActiveObject()) {
        const active = c.getActiveObject();
        if (!active.isEditing) { e.preventDefault(); c.remove(active); c.discardActiveObject(); picCommit(); c.requestRenderAll(); return; }
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); window.picUndo(); }
    else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) { e.preventDefault(); window.picRedo(); }
});

/* The two scene buttons pose a figure — one build each, so a second press is
   never a no-op — and the third takes every figure off the board. */
window.toggleWireframe = () => { picMannequin(false); };
window.toggleWireframeGender = () => { picMannequin(true); };
window.clearWireframe = () => { picDropMannequins(); };

function picDropMannequins() {
    const c = picEngine();
    if (!c) return;
    const gone = c.getObjects().filter(function (o) { return o._pmMannequin; });
    if (!gone.length) return;
    gone.forEach(function (o) { c.remove(o); });
    c.discardActiveObject();
    picCommit();
    c.requestRenderAll();
}

/* One entry point for the whole rail: switch tool, re-arm the brush, repaint.
   The rail marks itself active from data-tool, so no button has to pass itself. */
window.setPicTool = (tool) => { picRailActivate(tool || 'pen'); picApplyBrush(); };
window.clearPicCanvas = () => {
    const c = picEngine();
    if (!c) return;
    c.getObjects().slice().forEach(function (o) { c.remove(o); });
    c.discardActiveObject();
    c.requestRenderAll();
    picHistory = [picSnapshot()];
    picFuture = [];
};
/* Swatch tap: recolour the brush and remember it for the custom picker too. */
window.setPicColor = (btn, color) => {
    const input = document.getElementById('pic-color');
    if (input) input.value = color;
    document.querySelectorAll('.pic-swatch').forEach(function (s) { s.classList.remove('on'); });
    if (btn) btn.classList.add('on');
    /* Re-arm the brush immediately — picking a colour while the pen is in hand
       has to change the pen, not just the little dot in the rail. */
    picApplyBrush();
};
/* Keep the little dot in the rail honest about what the brush will do. */
function picUpdateSizeDot() {
    const dot = document.getElementById('pic-size-dot');
    const input = document.getElementById('pic-color');
    const sizeInput = document.getElementById('pic-size');
    if (!dot) return;
    const px = Math.max(3, Math.min(28, Number(sizeInput ? sizeInput.value : 4) * 1.3));
    dot.style.width = px + 'px'; dot.style.height = px + 'px';
    dot.style.background = (input && input.value) || '#0f172a';
}
window.picSizeChanged = () => { picApplyBrush(); };
/* Emoji stamp: Enter in the field OR the stamp button both work, and an empty
   field seeds a friendly default instead of doing nothing. */
window.addStickerFromInput = function () {
    const input = document.getElementById('sticker-input');
    let val = (input && input.value || '').trim();
    if (!val) { val = '🌟'; if (input) input.value = val; }
    window.addSticker(val);
};
/* One place decides whether the statement is readable, so the eye button, the
   drawer button and the popup itself can never disagree about the state. */
function picSetWordMasked(masked) {
    const el = document.getElementById('pictionary-word');
    if (el) el.classList.toggle('masked', !!masked);
    const icon = document.getElementById('pic-eye-icon');
    if (icon) icon.innerText = masked ? '👁' : '🙈';
    const label = document.getElementById('pic-eye-label');
    if (label) label.innerText = masked ? 'Reveal' : 'Hide';
    const btn = document.getElementById('pic-draw-btn');
    if (btn) btn.classList.toggle('has-content', !masked);
}
window.togglePicWordVisibility = () => {
    const el = document.getElementById('pictionary-word');
    if (!el) return;
    picSetWordMasked(!el.classList.contains('masked'));
};
/* Asking for "What to draw" is asking to see it, so opening reveals the
   statement — the eye button is still there for hiding it before handing the
   phone over. */
window.togglePicDrawPopup = () => {
    const pop = document.getElementById('pic-draw-popup');
    if (!pop) return;
    const open = pop.classList.toggle('open');
    if (open) picSetWordMasked(false);
};
/* Emoji stamp — the fastest way to put a sun, a car or a face on the board
   without drawing it. It lands as a Fabric text object, so it drags and scales
   with the same handles as everything else. */
window.addSticker = (val) => {
    const c = picEngine();
    if (!c) return;
    if (val === undefined || val === null || val === '') val = (document.getElementById('sticker-input') || {}).value || '🌟';
    if (!val) return;
    const size = Math.max(48, Math.min(c.getWidth(), c.getHeight()) * 0.16);
    const stamp = new fabric.Text(String(val), {
        left: c.getWidth() * 0.42, top: c.getHeight() * 0.3,
        fontSize: size, fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif",
        originX: 'center', originY: 'center',
    });
    c.add(stamp);
    picRailActivate('select');
    picApplyBrush();
    c.setActiveObject(stamp);
    picCommit();
    c.requestRenderAll();
};

function collectPowerup(id) {
    const p = players[currentPlayerIndex];
    const def = pmDef(id) || POWERUPS[GRID_IDS[0]];
    p.inventory.push(id);
    const overlay = document.getElementById('powerup-overlay');
    const iconEl = document.getElementById('pu-icon');
    const titleEl = document.getElementById('pu-title');
    const blurbEl = document.getElementById('pu-blurb');
    if (iconEl) iconEl.innerText = def.emoji;
    if (titleEl) titleEl.innerText = def.name;
    if (blurbEl) blurbEl.innerText = def.blurb;
    overlay.style.display = 'flex';
    playTTS('Power-up! You got ' + def.name + '. ' + def.blurb);
    pmNotify('⚡ ' + p.name + ' collected ' + def.emoji + ' ' + def.name + ' — ' + def.blurb, 'good');
    pmPop('⚡ ' + def.emoji + ' ' + def.name, 'info');
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    highlightActivePlayer();
}

window.closePowerup = () => { document.getElementById('powerup-overlay').style.display = 'none'; highlightActivePlayer(); nextTurn(); };

/* Why a power-up cannot be spent right now — tested BEFORE it is consumed, so a
   mis-tap never silently eats the card. Used to be a blocking alert, and three
   of the eleven cards had no branch at all and just awarded 20 points. */
function powerupProblem(def) {
    const modal = document.getElementById('q-modal');
    const open = !!modal && modal.style.display === 'flex';
    if (def.needs === 'question' && !open) return def.name + ' needs a question on screen first — open a card, then use it.';
    if (def.needs === 'mcq') {
        if (!open) return def.name + ' needs a question on screen first — open a card, then use it.';
        const left = document.querySelectorAll('#q-interaction-area .option-btn:not(.disabled)');
        if (left.length < 3) return def.name + ' works on multiple-choice questions with 3+ options.';
    }
    if (def.needs === 'target' && players.length < 2) return def.name + ' needs at least one other player.';
    return null;
}

function removeFromInventory(p, id, index) {
    let at = p.inventory.indexOf(id);
    if (at < 0 && typeof index === 'number' && index > -1 && index < p.inventory.length) at = index;
    if (at > -1) p.inventory.splice(at, 1);
}

window.activatePowerup = (id, index) => {
    const def = pmDef(id);
    if (!def) { pmNotify('That power-up is not recognised: ' + id, 'warn'); return; }
    const p = players[currentPlayerIndex];

    const problem = powerupProblem(def);
    if (problem) { pmNotify(problem, 'warn'); return; }

    /* Cards that hit someone else ask first — the old code picked a random
       victim, so "Eraser" and "Gift" felt like they misfired. */
    if (def.needs === 'target') { openTargetPicker(def, id, index, p); return; }

    let msg;
    try { msg = def.run(makeContext(p)) || def.name + ' used.'; }
    catch (e) { msg = def.name + ' could not be applied.'; console.error('Power-up failed:', id, e); }

    removeFromInventory(p, id, index);
    pmNotify('⚡ ' + msg, def.tone || 'info');
    playTTS(msg);
    highlightActivePlayer();
};

function openTargetPicker(def, id, index, p) {
    const modal = document.getElementById('target-modal');
    const list = document.getElementById('target-list');
    const titleEl = document.getElementById('target-title');
    if (!modal || !list) return;
    pmPending = { def: def, id: id, index: index, p: p };
    if (titleEl) titleEl.innerText = def.emoji + ' ' + def.name + ' — ' + def.blurb;
    list.innerHTML = players.map(function (pl) {
        return '<button type="button" class="pu-target" data-pid="' + pl.id + '" onclick="chooseTarget(this.dataset.pid)">'
            + '<img src="' + pl.avatar + '" alt="">'
            + '<span>' + pl.name + (pl.id === p.id ? ' (you)' : '') + '</span>'
            + '<span class="pts">' + pl.score + ' pts</span></button>';
    }).join('');
    modal.style.display = 'flex';
}

window.chooseTarget = function (playerId) {
    const pending = pmPending;
    const modal = document.getElementById('target-modal');
    if (modal) modal.style.display = 'none';
    pmPending = null;
    if (!pending) return;
    const target = players.filter(function (pl) { return String(pl.id) === String(playerId); })[0];
    if (!target) { pmNotify('No target chosen — the power-up was kept.', 'warn'); return; }
    const def = pending.def;
    const p = pending.p;
    const ctx = makeContext(p);
    ctx.target = target;
    let msg;
    try { msg = def.run(ctx) || def.name + ' used.'; }
    catch (e) { msg = def.name + ' could not be applied.'; console.error('Power-up failed:', pending.id, e); }
    removeFromInventory(p, pending.id, pending.index);
    pmNotify('⚡ ' + msg, def.tone || 'info');
    playTTS(msg);
    highlightActivePlayer();
};

window.cancelTarget = function () {
    const modal = document.getElementById('target-modal');
    if (modal) modal.style.display = 'none';
    pmPending = null;
    pmNotify('Cancelled — the power-up is still in your inventory.', 'info');
};

/* The narrator. Everything that is not a character speaks in this voice — the
   read-aloud voice from the dashboard, unless the tutor changes it in the header. */
window.playTTS = function (text) {
    pmSpeak(text, null);
};

/* Low-level speak. "voiceURI" may be anything the app calls a voice; when it
   cannot be resolved the narrator's voice is used, so nothing ever goes silent. */
function pmSpeak(text, voiceURI, onEnd) {
    if (text === undefined || text === null || text === '') return;
    try {
        window.speechSynthesis.cancel();
        const decodedText = decodeURIComponent(encodeURIComponent(String(text)));
        const u = new SpeechSynthesisUtterance(decodedText);
        const voices = window.speechSynthesis.getVoices();
        /* The narrator. When nothing has been chosen anywhere — no dashboard voice,
           no header pick, a browser that has not loaded its list yet — this used to
           leave the voice unset, which hands the class whichever robotic default
           the browser felt like. It now falls back to the most natural voice
           installed, which is what a flashcard read-aloud should sound like. */
        const v = pmFindVoice(voices, voiceURI) || pmFindVoice(voices, hostVoice) || bestNaturalVoice();
        if (v) u.voice = v;
        // Cloud voices read at a classroom pace, not at a robot's.
        if (v && v.localService === false) { u.rate = 0.98; }
        if (onEnd) u.onend = onEnd;
        window.speechSynthesis.speak(u);
        return u;
    } catch (e) { return null; }
}

/* A character speaking. Used by every game that has named speakers, so a hidden
   role, an alibi suspect and a sentiment analyst all sound like themselves. */
function speakAs(name, text, onEnd) {
    return pmSpeak(text, charVoiceFor(name), onEnd);
}

/* =====================================================================
   THE BIG READER
   ---------------------------------------------------------------------
   The talking games all hang on a piece of text nobody wrote to a length: an
   alibi of eighty words, a spyfall statement of forty, a location, a scene, a
   sentiment line. Every one of them used to be a small box in a busy screen, and
   the tutor had to read it out while the class craned at the projector.

   So: one panel, one text, at the largest size that still fits the frame — the
   same fitting rule the game panels use — spoken in the voice of whoever the
   text belongs to (a suspect, a player, a character) or the narrator for the
   case notes. "Read big" opens it; so does tapping the panel it came from.
   ===================================================================== */
let pmReaderScale = 1;

function pmBriefText(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    /* The case-note / location holders are kept in the DOM but out of the layout
       (display:none) so the alibi and statement panels get their height — and
       innerText of an unrendered element is empty, so textContent is the one that
       still carries the text. */
    const raw = el.innerText || el.textContent || '';
    return String(raw).replace(/\\s+/g, ' ').trim();
}

/* What "read big" means in each game, and who it should sound like. "brief" asks
   for the case note / location / scene rather than the line being spoken. */
function pmBigSource(which, brief) {
    if (brief) {
        if (which === 'alibi') return { text: pmBriefText('alibi-context-display'), title: 'The situation', kicker: 'Read this before anyone speaks', voice: null };
        if (which === 'spyfall') return { text: pmBriefText('spyfall-context'), title: 'The location', kicker: 'Everyone knows it — except the spy', voice: null };
        if (which === 'social') return { text: pmBriefText('social-setting'), title: 'The scene', kicker: 'Where this round happens', voice: null };
        return { text: '', title: '', kicker: '', voice: null };
    }
    if (which === 'alibi') {
        const s = (typeof alibiState !== 'undefined' && alibiState && alibiState.selected !== null)
            ? alibiState.suspects[alibiState.selected] : null;
        if (s && s.alibi) return { text: s.alibi, title: s.name, kicker: 'Alibi — read it aloud', voice: s.name };
        return pmBigSource('alibi', true);
    }
    if (which === 'spyfall') {
        const data = (typeof spyState !== 'undefined' && spyState) ? spyState.data : null;
        const p = (data && data.players) ? data.players[spyState.index] : null;
        if (p && p.statement) return { text: p.statement, title: p.name, kicker: 'Statement — read it aloud', voice: p.name };
        return pmBigSource('spyfall', true);
    }
    if (which === 'social') {
        const c = (typeof socialState !== 'undefined' && socialState && socialState.characters)
            ? socialState.characters[socialState.speaker] : null;
        if (c) {
            /* socialLineOf is the same accessor the board uses, so the reader can
               never show a different line from the one on screen. The role prefix
               the reveal adds is stripped: it is a spoiler, not part of the line. */
            const line = String(socialLineOf(c) || '').replace(/^\\([^)]*\\)\\s*/, '').trim();
            if (line) return { text: line, title: c.name, kicker: 'Speaking now — read it aloud', voice: c.name };
        }
        return pmBigSource('social', true);
    }
    if (which === 'sentiment') {
        const data = pmSentimentData(currentQuestion);
        const line = data.line || pmBriefText('sentiment-line');
        const emotion = data.emotion || pmBriefText('sentiment-emotion');
        return { text: line, title: emotion ? 'Read it as: ' + emotion : 'The line', kicker: 'Say this line with the emotion on the card', voice: null };
    }
    if (which === 'bomb') {
        return { text: pmBriefText('bomb-task-text'), title: 'Current directive', kicker: 'Keep talking — no silence allowed', voice: null };
    }
    if (which === 'pictionary') {
        return { text: pmBriefText('pictionary-word'), title: 'What to draw', kicker: 'Draw this — describe it as you go', voice: null };
    }
    return { text: '', title: '', kicker: '', voice: null };
}

window.openReader = function (text, title, kicker, voice) {
    const clean = String(text == null ? '' : text).trim();
    if (!clean) { pmNotify('Nothing to read on this screen yet.', 'warn'); return; }
    document.getElementById('pm-reader-kicker').innerText = String(kicker || 'Read this aloud').toUpperCase();
    document.getElementById('pm-reader-title').innerText = String(title || 'Read this');
    document.getElementById('pm-reader-body').innerText = clean;
    const box = document.getElementById('pm-reader');
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
    pmReaderScale = 1;
    window.requestAnimationFrame(pmReaderFit);
    if (voice) speakAs(voice, clean); else playTTS(clean);
};

window.closeReader = function () {
    const box = document.getElementById('pm-reader');
    if (box) { box.classList.remove('open'); box.setAttribute('aria-hidden', 'true'); }
    try { window.speechSynthesis.cancel(); } catch (e) { /* nothing was playing */ }
};

/* The two ways in: the button in a game's action row, and the panel itself. */
window.pmReadBig = function (which, brief) {
    const src = pmBigSource(which, brief);
    window.openReader(src.text, src.title, src.kicker, src.voice);
};
/* There used to be a second, thinner way to hear a line — a "🔊 Listen" button
   wired to this. It was the reader's read-aloud with none of its voice handling,
   so every game now has one door: the reader, which knows whose text it is. */
window.pmReaderSpeak = function () {
    const body = document.getElementById('pm-reader-body');
    const text = body ? body.innerText : '';
    if (!text) return;
    const name = String(document.getElementById('pm-reader-title').innerText || '');
    const cast = currentCast();
    const known = cast.filter(function (c) { return c.name === name; }).length > 0;
    if (known) speakAs(name, text); else playTTS(text);
};
window.pmReaderSize = function (step) {
    pmReaderScale = Math.max(0.6, Math.min(2.2, pmReaderScale + step * 0.12));
    pmReaderFit();
};

/* The largest size this text fits in, times whatever A−/A+ has asked for. Below
   the floor it scrolls instead, exactly like every other fitted panel: 9px text
   that technically fits is worse than a scrollbar nobody has to touch. */
function pmReaderFit() {
    const body = document.getElementById('pm-reader-body');
    if (!body || !body.clientHeight || body.scrollHeight === 0) return;
    let lo = 14, hi = 96, best = lo;
    while (lo <= hi) {
        const mid = Math.round((lo + hi) / 2);
        body.style.fontSize = mid + 'px';
        if (body.scrollHeight <= body.clientHeight + 1) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    body.style.fontSize = Math.max(14, Math.round(best * pmReaderScale)) + 'px';
}

/* Escape closes the reader — it covers the board, so there must be a way out
   that does not need the mouse. Registered once, and harmless when it is shut. */
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    const box = document.getElementById('pm-reader');
    if (box && box.classList.contains('open')) window.closeReader();
});

/* =====================================================================
   THE ANSWER KEY — the tutor's own screen
   ---------------------------------------------------------------------
   A question on the projector is a question the tutor has to answer too, and
   reading it off the board hands the room the answer with it. This opens a
   SEPARATE window — a second laptop, an extended display, a phone on the desk —
   that always shows the LIVE question, its answer, the reasoning behind it, and
   every card the current round is still dealing from. The class never sees it,
   because it is not drawn on this screen at all.

   Alt+K opens it; Alt+K again closes it.
   ===================================================================== */
let pmKeyWin = null;

const PM_KEY_CSS = [
    'html, body { margin: 0; padding: 0; }',
    'body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; background: #eef1f8; color: #0b1220; -webkit-font-smoothing: antialiased; }',
    '.pmk-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #ffffff; border-bottom: 2px solid #c4b5fd; }',
    '.pmk-bar strong { flex: 1 1 auto; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: #4c1d95; }',
    '.pmk-bar button { font: inherit; font-weight: 800; font-size: 0.8rem; padding: 7px 11px; border-radius: 9px; border: 1px solid #94a3b8; background: #f1f5f9; color: #1e293b; cursor: pointer; }',
    '.pmk-bar button:hover { background: #e2e8f0; }',
    '.pmk-wrap { padding: 14px 16px 44px; }',
    '.pmk-mode { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; color: #4c1d95; }',
    '.pmk-answer { font-size: 1.85rem; font-weight: 900; line-height: 1.22; margin: 6px 0 2px; color: #14532d; }',
    '.pmk-answer.pmk-quiet { color: #334155; }',
    '.pmk-q { font-size: 1.02rem; font-weight: 700; line-height: 1.45; margin: 8px 0 10px; color: #0f172a; }',
    '.pmk-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; }',
    '.pmk-tag { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 9px; border-radius: 999px; background: #ede9fe; color: #4c1d95; border: 1px solid #c4b5fd; }',
    '.pmk-card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 14px; margin: 0 0 10px; }',
    '.pmk-card h4 { margin: 0 0 6px; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: #475569; }',
    '.pmk-card p { margin: 0 0 6px; font-size: 0.95rem; line-height: 1.55; color: #1e293b; }',
    '.pmk-card p:last-child { margin-bottom: 0; }',
    '.pmk-card ol, .pmk-card ul { margin: 0; padding-left: 20px; }',
    '.pmk-card li { font-size: 0.95rem; line-height: 1.5; color: #1e293b; margin-bottom: 4px; }',
    '.pmk-opt { padding: 6px 9px; border-radius: 8px; font-size: 0.95rem; line-height: 1.4; color: #1e293b; border: 1px solid transparent; }',
    '.pmk-opt.ok { background: #dcfce7; border-color: #4ade80; color: #14532d; font-weight: 800; }',
    '.pmk-empty { color: #334155; font-size: 0.95rem; font-weight: 600; }',
    '.pmk-fb .fb-block { margin-bottom: 10px; }',
    '.pmk-fb .fb-tag { display: block; font-size: 0.68rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #475569; margin-bottom: 3px; }',
    '.pmk-fb p { margin: 0; font-size: 0.95rem; line-height: 1.55; color: #1e293b; }',
    '.pmk-fb ul, .pmk-fb ol { margin: 4px 0 0; padding-left: 20px; }',
    '.pmk-fb li { font-size: 0.95rem; line-height: 1.5; color: #1e293b; }',
    '.pmk-fb .btn-action { display: none; }',
    '.pmk-fb img { max-width: 100%; height: auto; border-radius: 8px; }'
].join('');

function pmKeyEsc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* The key follows the board: every place that swaps the live question calls this,
   so the window is never showing a card the room has already moved past. */
window.pmAnswerKeyRender = function () {
    if (!pmKeyWin || pmKeyWin.closed) return;
    const wrap = pmKeyWin.document.getElementById('pmk-wrap');
    if (!wrap) return;
    const q = currentQuestion;
    if (!q) {
        wrap.innerHTML = '<div class="pmk-card"><p class="pmk-empty">No question on the board right now. Deal one and this fills in.</p></div>';
        return;
    }
    const mode = (typeof GUIDES !== 'undefined' && GUIDES[selectedGameMode]) ? GUIDES[selectedGameMode].name : (selectedGameMode || 'Party Mode');
    const isPractice = selectedGameMode === 'practice';
    const answer = String(q.answer == null ? '' : q.answer).trim();
    const question = String(q.question || '').replace(/^Question:/i, '').trim();
    const parts = [];
    parts.push('<div class="pmk-mode">' + pmKeyEsc(mode) + (isPractice ? ' · card ' + (practiceIndex + 1) + ' of ' + practiceQueue.length : '') + '</div>');
    parts.push('<div class="pmk-answer' + (answer ? '' : ' pmk-quiet') + '">' + (answer ? pmKeyEsc(answer) : 'No single answer for this card — see the notes below.') + '</div>');
    if (question) parts.push('<div class="pmk-q">' + pmKeyEsc(question) + '</div>');
    const tags = [];
    if (q.skill) tags.push(q.skill);
    if (q.difficultyLevel) tags.push(q.difficultyLevel);
    if (q.points) tags.push(q.points + ' pts');
    if (q.gridId) tags.push('cell ' + q.gridId);
    if (q.type) tags.push(String(q.type).replace(/_/g, ' '));
    if (tags.length) parts.push('<div class="pmk-tags">' + tags.map(function (t) { return '<span class="pmk-tag">' + pmKeyEsc(t) + '</span>'; }).join('') + '</div>');

    if (q.context) parts.push('<div class="pmk-card"><h4>The text</h4><p>' + pmKeyEsc(q.context).replace(/\\n/g, '<br>') + '</p></div>');
    if (q.options && q.options.length) {
        parts.push('<div class="pmk-card"><h4>Options</h4>' + q.options.map(function (o) {
            const ok = String(o).trim().toLowerCase() === answer.toLowerCase();
            return '<div class="pmk-opt' + (ok ? ' ok' : '') + '">' + (ok ? '✅ ' : '· ') + pmKeyEsc(o) + '</div>';
        }).join('') + '</div>');
    }
    if (q.hint) parts.push('<div class="pmk-card"><h4>Hint you can give</h4><p>' + pmKeyEsc(q.hint) + '</p></div>');
    if (q.explanation) parts.push('<div class="pmk-card"><h4>Why</h4><p>' + pmKeyEsc(q.explanation) + '</p></div>');
    if (q.deepDive) parts.push('<div class="pmk-card"><h4>Deep dive</h4><p>' + pmKeyEsc(q.deepDive) + '</p></div>');
    if (q.examples && q.examples.length) parts.push('<div class="pmk-card"><h4>Examples</h4><ul>' + q.examples.filter(Boolean).map(function (e) { return '<li>' + pmKeyEsc(e) + '</li>'; }).join('') + '</ul></div>');

    /* Rounds that deal a DECK (taboo terms, hot-seat prompts, Keep Talking
       directives) only show one card at a time, which leaves the tutor blind to
       what is coming. The key lists the whole deck and marks where the room is. */
    const deck = [];
    if (q.tabooCards && q.tabooCards.length) {
        deck.push('<div class="pmk-card"><h4>Taboo cards</h4><ol>' + q.tabooCards.map(function (c, i) {
            const here = selectedGameMode === 'taboo' && i === tabooIndex ? ' <b>◀ on screen</b>' : '';
            return '<li><b>' + pmKeyEsc(c.target || c.word || '') + '</b>' + here + '<br><span style="color:#475569;">off-limits: ' + pmKeyEsc((c.forbidden || []).join(', ')) + '</span></li>';
        }).join('') + '</ol></div>');
    }
    if (q.hotSeatQuestions && q.hotSeatQuestions.length) {
        deck.push('<div class="pmk-card"><h4>Hot seat prompts</h4><ol>' + q.hotSeatQuestions.map(function (s, i) {
            const here = i === hotSeatQIndex ? ' <b>◀ on screen</b>' : '';
            return '<li>' + pmKeyEsc(s) + here + '</li>';
        }).join('') + '</ol></div>');
    }
    if (q.bombTasks && q.bombTasks.length) {
        deck.push('<div class="pmk-card"><h4>Directives</h4><ol>' + q.bombTasks.map(function (s, i) {
            const here = i === bombTaskIndex ? ' <b>◀ on screen</b>' : '';
            return '<li>' + pmKeyEsc(s) + here + '</li>';
        }).join('') + '</ol></div>');
    }
    parts.push(deck.join(''));

    const mini = buildMiniLessonHtml(q);
    if (mini) parts.push('<div class="pmk-card pmk-fb"><h4>Mini lesson</h4>' + mini + '</div>');
    if (parts.length <= 3 && !mini) parts.push('<div class="pmk-card"><p class="pmk-empty">This card carries no extra notes — the answer above is the whole of it.</p></div>');
    wrap.innerHTML = parts.join('');
    try { wrap.scrollTop = 0; } catch (e) { /* the window may have just been closed */ }
};

window.pmToggleAnswerKey = function () {
    if (pmKeyWin && !pmKeyWin.closed) {
        try { pmKeyWin.close(); } catch (e) { /* already gone */ }
        pmKeyWin = null;
        pmNotify('Answer key closed.', 'info');
        return;
    }
    let w = null;
    try {
        w = window.open('', 'pmAnswerKey', 'width=600,height=860,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes');
    } catch (e) { w = null; }
    if (!w) {
        pmNotify('The answer key needs pop-ups allowed for this lesson. Allow them, then press Alt+K again.', 'warn');
        return;
    }
    const d = w.document;
    d.title = 'Answer Key';
    const style = d.createElement('style');
    style.textContent = PM_KEY_CSS;
    d.head.appendChild(style);
    d.body.className = 'pmk';
    const bar = d.createElement('div');
    bar.className = 'pmk-bar';
    bar.innerHTML = '<strong>🔑 Answer key · keep this off the projector</strong>';
    const refresh = d.createElement('button');
    refresh.type = 'button';
    refresh.textContent = '↻ Refresh';
    refresh.addEventListener('click', function () { window.pmAnswerKeyRender(); });
    const shut = d.createElement('button');
    shut.type = 'button';
    shut.textContent = '✕ Close';
    shut.addEventListener('click', function () { window.pmToggleAnswerKey(); });
    bar.appendChild(refresh);
    bar.appendChild(shut);
    const wrap = d.createElement('div');
    wrap.className = 'pmk-wrap';
    wrap.id = 'pmk-wrap';
    d.body.appendChild(bar);
    d.body.appendChild(wrap);
    w.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); window.pmToggleAnswerKey(); }
    });
    pmKeyWin = w;
    window.pmAnswerKeyRender();
    pmNotify('Answer key open in its own window — Alt+K closes it.', 'good');
};

/* Alt+K. Alt keeps it out of the browser's way (Ctrl+Shift+K is a devtools
   shortcut, and anything un-modified would land in the tutor's typing). */
document.addEventListener('keydown', function (e) {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.code !== 'KeyK' && String(e.key || '').toLowerCase() !== 'k') return;
    e.preventDefault();
    window.pmToggleAnswerKey();
});

/* =====================================================================
   THE ROOM — phones join the game
   ---------------------------------------------------------------------
   Every mode that asks a question can push it to the room: the tutor keeps the
   board on the projector, students answer on their own screen, and each answer is
   scored on SPEED and ACCURACY the way a quiz game does it — a full score for a
   fast correct answer, half for one that scrapes in at the buzzer, nothing for a
   wrong one. That is why the numbers on the phones can differ from the team
   scores on the board: they are individual, and they are about how sure you were.

   Why PeerJS and not a game server: a lesson is a single HTML file. The tutor has
   no backend, and a free public signalling service only introduces two browsers to
   each other — answers never touch it, they go phone-to-laptop directly. The
   trade-offs are stated in the panel rather than hidden: the signalling service is
   best-effort, a school that blocks WebRTC will say so, and a room lives only as
   long as the tutor's tab.
   ===================================================================== */
const ROOM_PREFIX = 'tutorly-pm-';
const ROOM_PARAM = 'room';
const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_LIMIT_MS = 30000;

let room = null;          // host: { peer, conns, code, link, asks }
let guestMe = null;       // guest: { peer, conn, name, avatar, score, ... }
let guestQuestion = null;
let guestAnswered = false;
let lastSpread = null;

function makeRoomCode() {
    let out = '';
    for (let i = 0; i < 5; i++) out += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
    return out;
}
function pmNormalizeCode(v) {
    return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').slice(0, 5);
}
function pmCodeFromUrl() {
    try {
        const raw = new URL(window.location.href).searchParams.get(ROOM_PARAM);
        const code = raw ? pmNormalizeCode(raw) : '';
        return code.length >= 4 ? code : null;
    } catch (e) { return null; }
}
function roomLink(code) {
    try {
        const u = new URL(window.location.href);
        u.searchParams.set(ROOM_PARAM, code);
        u.hash = '';
        return u.toString();
    } catch (e) { return ''; }
}
/* A link is only worth showing when a phone could actually open it: a lesson opened
   from a file has no address on the network. The code always works. */
function roomShareable() {
    const proto = window.location.protocol;
    if (proto !== 'http:' && proto !== 'https:') return false;
    const host = String(window.location.hostname || '');
    if (!host) return false;
    if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return false;
    if (host.indexOf('127.') === 0) return false;
    return true;
}
function peerAvailable() { return typeof window.Peer === 'function'; }
function guestAvatar(name) { return 'https://api.dicebear.com/9.x/adventurer/svg?seed=' + encodeURIComponent(name || 'guest'); }

/* Speed + accuracy scoring: the base points, times a factor that falls from 1 to
   0.5 as the answer arrives later in the window, rounded, never below 1. */
function speedPoints(base, ms) {
    const frac = Math.max(0, Math.min(1, (Number(ms) || 0) / ROOM_LIMIT_MS));
    return Math.max(1, Math.round((Number(base) || 10) * (1 - 0.5 * frac)));
}

function roomBoard() {
    if (!room) return [];
    return Object.keys(room.conns).map(function (id) {
        const g = room.conns[id];
        return { id: id, name: g.name, avatar: g.avatar, score: g.score, correct: g.correct, answered: g.answered, avgMs: g.answered ? Math.round(g.totalMs / g.answered) : 0 };
    }).sort(function (a, b) { return b.score - a.score || a.avgMs - b.avgMs; });
}

function broadcastRoom(msg) {
    if (!room) return;
    Object.keys(room.conns).forEach(function (id) {
        const conn = room.conns[id].conn;
        try { if (conn && conn.open) conn.send(msg); } catch (e) { /* a dropped phone must not stop the others */ }
    });
}

function renderRoomScoreboard() {
    const wrap = document.getElementById('room-guests');
    if (wrap) {
        const board = roomBoard();
        wrap.innerHTML = board.length
            ? board.map(function (g, i) {
                return '<div class="pm-room-row"><span class="pm-rank">' + (i + 1) + '</span><img src="' + g.avatar + '" alt="">'
                    + '<span class="pm-room-name">' + g.name + '</span>'
                    + '<span class="pm-room-meta">' + g.correct + '/' + g.answered + ' correct · ' + (g.avgMs ? (g.avgMs / 1000).toFixed(1) + 's avg' : '—') + '</span>'
                    + '<strong style="color:#b45309; font-family:monospace;">' + g.score + '</strong></div>';
            }).join('')
            : '<p class="pm-modal-sub">Nobody has joined yet — the code and link are above.</p>';
    }
    // The same board on every phone.
    const guestBoard = document.getElementById('guest-room-board');
    if (guestBoard && guestMe) {
        const board = guestMe.lastBoard || [];
        guestBoard.innerHTML = board.length
            ? '<div class="pm-modal-count" style="margin-bottom:6px;">ROOM SCORES</div>' + board.map(function (g, i) {
                return '<div class="pm-room-row"><span class="pm-rank">' + (i + 1) + '</span><span class="pm-room-name">' + g.name + (guestMe && g.id === guestMe.id ? ' (you)' : '') + '</span><span class="pm-room-meta">' + g.correct + '/' + g.answered + '</span><strong style="color:var(--yellow-dark); font-family:monospace;">' + g.score + '</strong></div>';
            }).join('')
            : '';
    }
}

function renderRoomSpread() {
    const el = document.getElementById('room-spread');
    if (!el) return;
    if (!lastSpread || !Object.keys(lastSpread).length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="pm-modal-count" style="margin-top:10px;">HOW THE ROOM ANSWERED</div><div class="pm-spread">'
        + Object.keys(lastSpread).map(function (k) {
            return '<div>' + (k || '(blank)') + ' · ' + lastSpread[k] + '</div>';
        }).join('') + '</div>';
}

/* ---- host side ---- */
window.openRoom = function () {
    if (room) { renderRoomPanel(); document.getElementById('room-modal').style.display = 'flex'; return; }
    if (!peerAvailable()) {
        pmNotify('The phone-room library (PeerJS) could not load — the lesson works offline, rooms need internet.', 'warn');
        return;
    }
    const code = makeRoomCode();
    room = { peer: null, conns: {}, code: code, link: roomLink(code), asks: true };
    try {
        const peer = new window.Peer(ROOM_PREFIX + code.toLowerCase(), { debug: 1 });
        room.peer = peer;
        peer.on('open', function () { pmNotify('📱 Room ' + code + ' is open — students join with that code.', 'good'); renderRoomPanel(); });
        peer.on('connection', function (conn) { acceptRoomGuest(conn); });
        peer.on('error', function (err) { roomError(err); });
        peer.on('disconnected', function () { try { peer.reconnect(); } catch (e) { /* ignore */ } });
    } catch (e) {
        pmNotify('Could not open a room: ' + ((e && e.message) || 'unknown error'), 'warn');
        room = null;
    }
    renderRoomPanel();
    document.getElementById('room-modal').style.display = 'flex';
};

function roomError(err) {
    const type = (err && err.type) || '';
    let msg = 'The room could not start.';
    if (type === 'unavailable-id') msg = 'That room code was taken — stop the room and open it again for a fresh code.';
    else if (type === 'network' || type === 'server-error') msg = 'The free PeerJS signalling service is unreachable. Rooms need internet; the game itself does not.';
    else if (type === 'browser-incompatible') msg = 'This browser has no WebRTC, so phones cannot join here.';
    else if (type === 'webrtc') msg = 'A phone answered but the direct connection was blocked — a school network is the usual cause.';
    else if (err && err.message) msg = err.message;
    pmNotify('📱 ' + msg, 'warn');
}

function acceptRoomGuest(conn) {
    conn.on('data', function (msg) { handleRoomMessage(conn, msg); });
    conn.on('close', function () { if (room) delete room.conns[conn.peer]; renderRoomPanel(); });
    conn.on('error', function () { if (room) delete room.conns[conn.peer]; renderRoomPanel(); });
}

function handleRoomMessage(conn, msg) {
    if (!room || !msg || typeof msg !== 'object') return;
    if (msg.type === 'join') {
        const name = String(msg.name || 'Guest').slice(0, 24);
        room.conns[conn.peer] = { conn: conn, name: name, avatar: msg.avatar || guestAvatar(name), score: 0, correct: 0, answered: 0, totalMs: 0 };
        pmNotify('📱 ' + name + ' joined the room.', 'good');
        try { conn.send({ type: 'welcome', code: room.code, title: gameData.gameTitle || 'Party Mode', board: roomBoard() }); } catch (e) { /* ignore */ }
        if (currentQuestion) sendQuestionToGuest(conn, currentQuestion);
        renderRoomPanel();
        broadcastRoom({ type: 'board', board: roomBoard() });
        return;
    }
    if (msg.type === 'answer') answerFromGuest(conn, msg);
    if (msg.type === 'accuse') recordGuestAccusation(conn, msg);
}

/* A phone's accusation. It never moves the score on its own — the board still locks
   in one answer, and can adopt the room's plurality in a single tap — but it is
   recorded, shown live on the rail, and listed by name in the round report. */
function recordGuestAccusation(conn, msg) {
    const g = room && room.conns[conn.peer];
    if (!g) return;
    const social = (typeof socialState !== 'undefined' && socialState) ? socialState : null;
    if (!social || !social.characters || !social.characters.length) return;
    if (social.revealed) return;
    const target = Number(msg.target);
    if (isNaN(target) || target < 0 || target >= social.characters.length) return;
    social.accusations = social.accusations || [];
    // One vote per phone: a learner who changes their mind replaces their earlier
    // pick instead of stacking votes on the same character.
    social.accusations = social.accusations.filter(function (a) { return !(a.by === 'phone' && a.who === g.name); });
    social.accusations.push({ who: g.name, target: target, by: 'phone' });
    pmNotify('📱 ' + g.name + ' accuses ' + social.characters[target].name + '.', 'info');
    renderSocial();
    renderSocialLiveVotes();
}

/** Mirror the vote tally to the phones so a learner sees the room agreeing (or not). */
function renderSocialLiveVotes() {
    if (!room) return;
    const social = (typeof socialState !== 'undefined' && socialState) ? socialState : null;
    if (!social) return;
    broadcastRoom({
        type: 'social-votes',
        votes: social.characters.map(function (c, i) {
            const names = (social.accusations || []).filter(function (a) { return Number(a.target) === i; }).map(function (a) { return a.who; });
            return { index: i, count: names.length, names: names };
        }),
    });
}

function answerFromGuest(conn, msg) {
    const g = room && room.conns[conn.peer];
    if (!g) return;
    const q = currentQuestion || {};
    const truth = String(q.answer === undefined || q.answer === null ? '' : q.answer).trim();
    const given = String(msg.choice !== undefined && msg.choice !== null && msg.choice !== '' ? msg.choice : (msg.text || '')).trim();
    const ms = Math.max(0, Math.min(Number(msg.ms) || 0, ROOM_LIMIT_MS));
    const norm = function (s) { return String(s).toLowerCase().split(' ').filter(function (x) { return x !== ''; }).join(' ').trim(); };
    const isRight = !!truth && !!given && (norm(given) === norm(truth) || norm(given).indexOf(norm(truth)) > -1);
    g.answered += 1;
    g.totalMs += ms;
    let gained = 0;
    if (isRight) {
        gained = speedPoints(q.points || 10, ms);
        g.score += gained;
        g.correct += 1;
        pmPop('📱 ' + g.name + ' +' + gained, 'good');
    }
    lastSpread = lastSpread || {};
    const key = given || '(blank)';
    lastSpread[key] = (lastSpread[key] || 0) + 1;
    const rank = roomBoard().findIndex(function (r) { return r.id === conn.peer; }) + 1;
    try {
        conn.send({ type: 'verdict', correct: isRight, gained: gained, score: g.score, rank: rank, answer: truth, correctCount: g.correct, answered: g.answered });
    } catch (e) { /* phone vanished mid-answer */ }
    broadcastRoom({ type: 'board', board: roomBoard() });
    renderRoomSpread();
    renderRoomPanel();
}

function sendQuestionToGuest(conn, q, deadline) {
    if (!conn || !conn.open || !q) return;
    try {
        conn.send({
            type: 'question', id: q.id || '', gridId: q.gridId || null,
            question: String(q.question || '').replace(/^Question:/i, '').trim(),
            context: q.context || '', skill: q.skill || '', points: q.points || 10,
            options: (q.options || []).slice(0, 6), deadline: deadline || 30
        });
    } catch (e) { /* ignore */ }
}

/** Push the card on the board to every phone. Called from openQuestion, so every
 *  mode that asks a question gets phone play for free. */
function pushQuestionToRoom(q) {
    if (!room || !room.asks || !q) return;
    lastSpread = {};
    Object.keys(room.conns).forEach(function (id) { sendQuestionToGuest(room.conns[id].conn, q, 30); });
    renderRoomSpread();
}

function pushRevealToRoom() {
    if (!room) return;
    const q = currentQuestion || {};
    broadcastRoom({ type: 'reveal', answer: String(q.answer || ''), html: buildMiniLessonHtml(q), explanations: String(q.explanation || '') });
}

/* Hidden roles are a listening game before they are a voting game, and a phone in
   a learner's hand is where the listening actually happens — the board shows one
   line at a time, the phone can carry the whole cast. So the round goes to every
   phone in full, and the accusation comes back from there. */
function pushSocialRoundToRoom() {
    if (!room) return;
    const social = (typeof socialState !== 'undefined' && socialState) ? socialState : null;
    if (!social || !social.characters || !social.characters.length) return;
    broadcastRoom({
        type: 'social',
        variant: social.variant,
        title: social.title,
        setting: social.setting,
        difficulty: social.difficulty,
        characters: social.characters.map(function (c) {
            return { name: c.name, avatar: socialAvatar(c), line: socialLineOf(c) };
        }),
    });
    renderRoomPanel();
}

function pushSocialRevealToRoom(accused, hit) {
    if (!room) return;
    const social = (typeof socialState !== 'undefined' && socialState) ? socialState : null;
    if (!social) return;
    broadcastRoom({
        type: 'social-reveal',
        hit: !!hit,
        accused: accused ? accused.name : '',
        roles: social.characters.map(function (c) { return { name: c.name, role: c.role, team: socialTeamLabel(c.team), told: !!c.told, tell: c.tell || '' }; }),
        accusations: (social.accusations || []).map(function (a) {
            const to = social.characters[Number(a.target)];
            return { who: a.who, by: a.by, to: to ? to.name : '', correct: !!(to && to.team === social.variant) };
        }),
    });
}

function renderRoomPanel() {
    const body = document.getElementById('room-body');
    if (!body) return;
    if (!room) {
        body.innerHTML = '<button class="btn-action btn-blue" style="padding:12px 18px;" onclick="openRoom()">📱 Open a room</button>'
            + '<p class="pm-modal-sub" style="margin-top:10px;">Students open the same lesson on a phone, type the code, and answer on their own screen. Each answer is scored on speed and accuracy; the board stays on your projector.</p>'
            + '<p class="pm-modal-sub">Rooms use the free PeerJS signalling service, so this needs internet. Nothing else in the lesson does.</p>';
        return;
    }
    const shareable = roomShareable();
    const link = roomJoinLink();
    /* The QR is ALWAYS shown now. It used to be behind the same shareable test
       as the link, so the commonest case in a classroom — the tutor testing the
       lesson on their own machine, or opening the saved file — showed no code to
       scan at all. The QR always encodes the best join address available, and the
       sentence underneath is what changes: a local address needs a word of
       warning, not a hidden code. */
    body.innerHTML = '<div class="pm-room-code">' + room.code + '</div>'
        + '<div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center; margin-top:10px;">'
            + '<div style="flex:0 0 auto;">'
                + qrImg(link || room.code, 150, 'QR code to join room ' + room.code)
                + '<div class="pm-qr-hint" style="text-align:center;">scan to join</div>'
            + '</div>'
            + '<div style="flex:1 1 240px; min-width:0;">'
                + '<p class="pm-modal-sub">' + (shareable
                    ? 'Students open the link below on their phone (or scan the QR code), type their name and answer every card themselves.'
                    : 'This lesson is open from an address a phone cannot reach (a local file or localhost), so the code above is the join route: open the same lesson on the phone and type it. Open the lesson from a shared address and the QR below becomes scannable as well.') + '</p>'
                + (shareable && link
                    ? '<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:8px;">'
                        + '<input readonly value="' + attrEsc(link) + '" style="flex:1 1 200px; min-width:0; background:#f8fafc; color:var(--text); border:1px solid var(--line); border-radius:10px; padding:10px; font-family:var(--font-mono); font-size:0.78rem;">'
                        + '<button class="btn-action btn-gray" onclick="copyText(this.previousElementSibling.value)">📋 Copy link</button>'
                    + '</div>'
                    : '')
                + '<button class="btn-action btn-blue" style="margin-top:10px;" onclick="openRoomQr()" title="Show the code and QR big enough for the class to scan from their seats">🔍 Show the big QR</button>'
            + '</div>'
        + '</div>'
        + '<div id="room-guests" style="margin-top:14px;"></div>'
        + '<div id="room-spread"></div>'
        + '<div class="pm-modal-foot"><span class="pm-modal-count">' + Object.keys(room.conns).length + ' in the room</span>'
        + '<span style="display:flex; gap:8px; flex-wrap:wrap;">'
        + '<button class="btn-action btn-gray" onclick="toggleRoomAsk()">' + (room.asks ? '❓ Asking: on' : '❓ Asking: off') + '</button>'
        + '<button class="btn-action btn-red" onclick="closeRoom(true)">Stop the room</button>'
        + '</span></div>';
    renderRoomScoreboard();
    renderRoomSpread();
    if (qrModalOpen) renderRoomQr();
}

/* ---- the join code, big enough to scan from the back row ---- */
/* The page's markup is assembled from strings, so anything that ends up inside an
   attribute is escaped here first — a pasted link must not be able to close the
   attribute it sits in. (The engine's own escapeHtml is a build-time helper and
   is not part of the generated page.) */
function attrEsc(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function textEsc(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function roomJoinLink() {
    if (!room) return '';
    if (room.link) return room.link;
    try { return roomLink(room.code); } catch (e) { return ''; }
}
function qrImg(data, size, alt) {
    const primary = 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&margin=6&data=' + encodeURIComponent(data);
    const backup = 'https://quickchart.io/qr?size=' + size + '&text=' + encodeURIComponent(data);
    return '<img src="' + primary + '" data-qr-alt="' + backup + '" onerror="qrFallback(this)" alt="' + attrEsc(alt) + '" style="width:' + size + 'px;height:' + size + 'px;max-width:100%;border-radius:12px;background:#fff;padding:6px;border:1px solid var(--line);">';
}
/* Two free QR services, so a blocked one does not leave the class staring at a
   broken image instead of a code. */
window.qrFallback = function (img) {
    const alt = img.getAttribute('data-qr-alt');
    if (alt) { img.removeAttribute('data-qr-alt'); img.src = alt; return; }
    img.remove();
};
var qrModalOpen = false;
function renderRoomQr() {
    const body = document.getElementById('room-qr-body');
    const count = document.getElementById('room-qr-count');
    if (!body) return;
    if (!room) {
        body.innerHTML = '<p class="pm-modal-sub">Open a room first — its code and QR appear here.</p>';
        if (count) count.innerText = '';
        return;
    }
    const reachable = roomShareable();
    const link = roomJoinLink();
    body.innerHTML = '<div class="pm-qr-box">'
        + qrImg(link || room.code, 460, 'QR code to join room ' + room.code)
        + '<div class="pm-qr-code">' + room.code + '</div>'
        + (reachable && link ? '<div class="pm-qr-link">' + textEsc(link) + '</div>' : '')
        + '<p class="pm-qr-hint">' + (reachable
            ? 'Scan with a phone camera, then type your name. Answers score on speed and accuracy.'
            : 'The QR opens this lesson on a phone. This copy is on a local address, so a phone must already have the lesson open — then simply type the code above.') + '</p>'
        + '</div>';
    if (count) count.innerText = Object.keys(room.conns).length + ' in the room';
}
window.openRoomQr = function () {
    qrModalOpen = true;
    window.closeSettings();
    renderRoomQr();
    const modal = document.getElementById('room-qr-modal');
    if (modal) modal.style.display = 'flex';
};
window.closeRoomQr = function () {
    qrModalOpen = false;
    const modal = document.getElementById('room-qr-modal');
    if (modal) modal.style.display = 'none';
};
window.copyRoomCode = function () {
    if (room) window.copyText(room.code);
};

window.toggleRoomAsk = function () {
    if (!room) return;
    room.asks = !room.asks;
    pmNotify(room.asks ? '❓ New cards are sent to every phone.' : '❓ Phones are not being asked — answers are ignored until you turn this back on.', 'info');
    renderRoomPanel();
};

window.closeRoom = function (stop) {
    if (stop && room) {
        broadcastRoom({ type: 'bye' });
        try { room.peer && room.peer.destroy(); } catch (e) { /* ignore */ }
        room = null;
        pmNotify('📱 Room closed.', 'info');
    }
    document.getElementById('room-modal').style.display = 'none';
    renderRoomPanel();
};

/* ---- guest side (a student's phone) ---- */
function guestStatus(text) {
    const el = document.getElementById('guest-status');
    if (el) el.innerText = text;
}

function showGuestPlay() {
    const join = document.getElementById('guest-join-card');
    const play = document.getElementById('guest-play');
    if (join) join.style.display = 'none';
    if (play) play.style.display = 'block';
    const av = document.getElementById('guest-avatar');
    if (av && guestMe) av.src = guestMe.avatar;
    const nm = document.getElementById('guest-myname');
    if (nm && guestMe) nm.innerText = guestMe.name;
    guestStatus(guestMe ? 'You are in — watch this screen.' : '');
}

window.startGuestMode = function (code) {
    const view = document.getElementById('guest-view');
    if (!view) return;
    view.style.display = 'block';
    ['setup-view', 'mode-select-view', 'app-container'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const codeInput = document.getElementById('guest-code');
    if (codeInput) codeInput.value = code || '';
    const nameInput = document.getElementById('guest-name');
    if (nameInput) nameInput.value = learnerData.name || '';
    guestStatus(code ? 'Room ' + code + ' — write your name, then join.' : 'Ask your tutor for the 5-character room code.');
    try { window.speechSynthesis.cancel(); } catch (e) { /* nothing playing */ }
};

window.joinRoomFromForm = function () {
    const code = pmNormalizeCode(document.getElementById('guest-code').value);
    const name = String(document.getElementById('guest-name').value || '').trim() || learnerData.name || 'Guest';
    if (code.length < 4) { guestStatus('That code looks short — it is five characters, like K7QM2.'); return; }
    if (!peerAvailable()) { guestStatus('This device cannot join a room (the room library did not load — are you offline?).'); return; }
    guestStatus('Connecting to room ' + code + '…');
    try { if (guestMe && guestMe.peer) guestMe.peer.destroy(); } catch (e) { /* ignore */ }
    guestMe = { peer: null, conn: null, id: null, name: name, avatar: guestAvatar(name), score: 0, correct: 0, answered: 0, totalMs: 0, lastBoard: [] };
    const peer = new window.Peer({ debug: 1 });
    guestMe.peer = peer;
    const timer = setTimeout(function () { guestStatus('No answer from room ' + code + '. Check the code with your tutor, or that this network allows WebRTC.'); }, 20000);
    peer.on('open', function () {
        const conn = peer.connect(ROOM_PREFIX + code.toLowerCase(), { reliable: true });
        guestMe.conn = conn;
        conn.on('open', function () {
            clearTimeout(timer);
            try { conn.send({ type: 'join', name: guestMe.name, avatar: guestMe.avatar }); } catch (e) { /* ignore */ }
            showGuestPlay();
        });
        conn.on('data', function (msg) { handleHostMessage(msg); });
        conn.on('close', function () { guestStatus('The tutor closed the room. Your score stays on this screen.'); });
        conn.on('error', function () { guestStatus('The connection to the room failed.'); });
    });
    peer.on('error', function (err) {
        clearTimeout(timer);
        const type = (err && err.type) || '';
        if (type === 'peer-unavailable') guestStatus('No room is open on code ' + code + '. Ask your tutor to keep the game open.');
        else if (type === 'network' || type === 'server-error') guestStatus('The free signalling service is unreachable — rooms need internet.');
        else guestStatus('Could not join: ' + ((err && err.message) || 'unknown error'));
    });
};

function handleHostMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'welcome') {
        guestStatus('In room ' + msg.code + ' · ' + (msg.title || 'Party Mode'));
        if (Array.isArray(msg.board)) { guestMe.lastBoard = msg.board; renderRoomScoreboard(); }
        return;
    }
    if (msg.type === 'board') {
        if (guestMe) guestMe.lastBoard = Array.isArray(msg.board) ? msg.board : [];
        renderRoomScoreboard();
        return;
    }
    if (msg.type === 'question') { renderGuestQuestion(msg); return; }
    if (msg.type === 'reveal') { renderGuestReveal(msg); return; }
    if (msg.type === 'social') { renderGuestSocial(msg); return; }
    if (msg.type === 'social-votes') { renderGuestSocialVotes(msg); return; }
    if (msg.type === 'social-reveal') { renderGuestSocialReveal(msg); return; }
    if (msg.type === 'verdict') {
        const head = document.getElementById('guest-verdict-head');
        const body = document.getElementById('guest-verdict-body');
        if (guestMe) { guestMe.score = msg.score || guestMe.score; }
        const scoreEl = document.getElementById('guest-score');
        if (scoreEl && guestMe) scoreEl.innerText = guestMe.score;
        const stats = document.getElementById('guest-mystats');
        if (stats) stats.innerText = (msg.correctCount || 0) + ' correct · ' + (msg.answered || 0) + ' answered';
        if (head) { head.innerText = msg.correct ? ('✅ ' + (msg.gained || 0) + ' points — ' + (msg.rank ? 'now #' + msg.rank : 'nice')) : '❌ Not this time'; head.style.color = msg.correct ? '#34d399' : '#f87171'; }
        if (body && !msg.correct && msg.answer) body.innerHTML = 'The answer was <strong>' + msg.answer + '</strong>. Keep looking at the board — the mini lesson is up there too.';
        return;
    }
    if (msg.type === 'bye') guestStatus('The tutor closed the room.');
}

function renderGuestQuestion(msg) {
    guestQuestion = msg;
    guestQuestion.startedAt = Date.now();
    guestAnswered = false;
    const wait = document.getElementById('guest-wait');
    const wrap = document.getElementById('guest-question');
    const verdict = document.getElementById('guest-verdict');
    if (wait) wait.style.display = 'none';
    if (verdict) verdict.style.display = 'none';
    if (wrap) wrap.style.display = 'block';
    const skill = document.getElementById('guest-qskill');
    if (skill) skill.innerText = (msg.skill || 'CARD').toUpperCase() + (msg.gridId ? ' · CELL ' + msg.gridId : '');
    const text = document.getElementById('guest-qtext');
    if (text) text.innerText = msg.question || '';
    const ctx = document.getElementById('guest-qcontext');
    if (ctx) { ctx.style.display = msg.context ? 'block' : 'none'; ctx.innerText = msg.context || ''; }
    const optionsEl = document.getElementById('guest-options');
    const freeEl = document.getElementById('guest-free');
    const options = (msg.options || []).filter(function (o) { return o !== undefined && o !== null && String(o).trim(); });
    if (optionsEl) {
        optionsEl.innerHTML = options.map(function (opt, i) {
            return '<button type="button" class="guest-option" data-i="' + i + '" onclick="guestAnswer(this.dataset.i)">' + opt + '</button>';
        }).join('');
    }
    if (freeEl) freeEl.style.display = options.length ? 'none' : 'flex';
    startGuestTimer(Number(msg.deadline) || 30);
}

let guestTimer = null;
function startGuestTimer(seconds) {
    const el = document.getElementById('guest-qtimer');
    let left = seconds;
    if (el) el.innerText = left + 's';
    if (guestTimer) clearInterval(guestTimer);
    guestTimer = setInterval(function () {
        left -= 1;
        if (el) el.innerText = Math.max(0, left) + 's';
        if (left <= 0) { clearInterval(guestTimer); guestTimer = null; if (!guestAnswered) guestStatus('Time is up — the tutor is revealing the answer.'); }
    }, 1000);
}

window.guestAnswer = function (index) {
    if (!guestQuestion || guestAnswered || !guestMe) return;
    guestAnswered = true;
    const choice = (guestQuestion.options || [])[Number(index)];
    const buttons = document.querySelectorAll('#guest-options .guest-option');
    Array.prototype.forEach.call(buttons, function (b) { b.classList.remove('picked'); });
    const mine = document.querySelector('#guest-options .guest-option[data-i="' + index + '"]');
    if (mine) mine.classList.add('picked');
    Array.prototype.forEach.call(buttons, function (b) { b.disabled = true; });
    guestMe.answered += 1;
    const ms = Date.now() - (guestQuestion.startedAt || Date.now());
    guestMe.totalMs += ms;
    try { guestMe.conn.send({ type: 'answer', choice: choice, ms: ms }); } catch (e) { /* ignore */ }
    guestStatus('Answer sent in ' + (ms / 1000).toFixed(1) + 's — faster answers score more.');
};

window.guestSendFree = function () {
    if (!guestQuestion || guestAnswered || !guestMe) return;
    const input = document.getElementById('guest-free-input');
    const text = String((input && input.value) || '').trim();
    if (!text) return;
    guestAnswered = true;
    const ms = Date.now() - (guestQuestion.startedAt || Date.now());
    try { guestMe.conn.send({ type: 'answer', text: text, ms: ms }); } catch (e) { /* ignore */ }
    guestStatus('Answer sent in ' + (ms / 1000).toFixed(1) + 's.');
};

function renderGuestReveal(msg) {
    if (guestTimer) { clearInterval(guestTimer); guestTimer = null; }
    const buttons = document.querySelectorAll('#guest-options .guest-option');
    Array.prototype.forEach.call(buttons, function (b) {
        b.disabled = true;
        const opt = (guestQuestion && guestQuestion.options) ? guestQuestion.options[Number(b.getAttribute('data-i'))] : '';
        if (opt && String(opt) === String(msg.answer)) b.classList.add('right');
        else if (b.classList.contains('picked')) b.classList.add('wrongpick');
    });
    const head = document.getElementById('guest-verdict-head');
    const body = document.getElementById('guest-verdict-body');
    const verdict = document.getElementById('guest-verdict');
    if (verdict) verdict.style.display = 'block';
    if (head) { head.innerText = 'The answer: ' + (msg.answer || '—'); head.style.color = '#67e8f9'; }
    if (body) body.innerHTML = (msg.html || '') + (msg.explanations ? '<div style="margin-top:8px;">' + msg.explanations + '</div>' : '');
    guestStatus('Look up at the board — the mini lesson is up there too.');
}

/* ---- hidden roles on a phone ----
   The whole cast arrives at once, because the point of the game is to compare
   statements, and one line at a time on a screen the size of a hand is exactly
   what makes a class stop listening. Tapping a character is a vote, not a lock:
   the learner can change their mind until the tutor locks the board's answer. */
let guestSocial = null;
let guestSocialVotes = null;

function renderGuestSocial(msg) {
    guestSocial = msg;
    guestSocialVotes = null;
    const wrap = document.getElementById('guest-social');
    if (!wrap) return;
    wrap.style.display = 'block';
    const wait = document.getElementById('guest-wait');
    if (wait) wait.style.display = 'none';
    const q = document.getElementById('guest-question');
    if (q) q.style.display = 'none';
    const kicker = document.getElementById('guest-social-kicker');
    if (kicker) kicker.innerText = (msg.variant === 'werewolf' ? 'WEREWOLF' : 'MAFIA') + ' · DIFFICULTY ' + String(msg.difficulty || 'standard').toUpperCase();
    const title = document.getElementById('guest-social-title');
    if (title) title.innerText = msg.title || '';
    const setting = document.getElementById('guest-social-setting');
    if (setting) { setting.innerText = msg.setting || ''; setting.style.display = msg.setting ? 'block' : 'none'; }
    const sent = document.getElementById('guest-social-sent');
    if (sent) sent.innerHTML = '';
    renderGuestSocialList();
    guestStatus('Hear every statement, then tap who you think is holding the hidden role.');
}

function renderGuestSocialList() {
    const list = document.getElementById('guest-social-list');
    if (!list || !guestSocial) return;
    const characters = guestSocial.characters || [];
    list.innerHTML = characters.map(function (c, i) {
        const votes = guestSocialVotes && guestSocialVotes[i] ? guestSocialVotes[i] : null;
        return '<button type="button" class="guest-social-char" data-i="' + i + '" onclick="guestAccuse(this.dataset.i)">'
            + '<img src="' + (c.avatar || '') + '" alt="">'
            + '<span class="guest-social-body"><span class="guest-social-name">' + c.name + '</span>'
            + '<span class="guest-social-line">' + (c.line || '') + '</span></span>'
            + (votes && votes.count ? '<span class="guest-social-votes">🗳 ' + votes.count + '</span>' : '')
            + '</button>';
    }).join('');
    markGuestAccusation();
}

function markGuestAccusation() {
    const mine = guestSocial && guestSocial.mine;
    const buttons = document.querySelectorAll('#guest-social-list .guest-social-char');
    Array.prototype.forEach.call(buttons, function (b) {
        b.classList.toggle('picked', mine !== undefined && mine !== null && Number(b.getAttribute('data-i')) === Number(mine));
    });
}

window.guestAccuse = function (index) {
    if (!guestSocial || !guestMe || !guestMe.conn) return;
    const i = Number(index);
    guestSocial.mine = i;
    markGuestAccusation();
    try { guestMe.conn.send({ type: 'accuse', target: i }); } catch (e) { /* the phone lost the channel */ }
    const name = (guestSocial.characters || [])[i] ? guestSocial.characters[i].name : '';
    const sent = document.getElementById('guest-social-sent');
    if (sent) sent.innerHTML = '🗳 You accused <strong>' + name + '</strong>. Change your mind any time — the tutor locks the board\u2019s answer.';
};

function renderGuestSocialVotes(msg) {
    const votes = msg.votes || [];
    guestSocialVotes = {};
    votes.forEach(function (v) { guestSocialVotes[v.index] = v; });
    renderGuestSocialList();
}

function renderGuestSocialReveal(msg) {
    const sent = document.getElementById('guest-social-sent');
    const list = document.getElementById('guest-social-list');
    const roles = msg.roles || [];
    if (list) {
        list.innerHTML = roles.map(function (c) {
            const teamCls = /wolf/i.test(c.team) ? 'wolves' : /mafia/i.test(c.team) ? 'mafia' : /neutral/i.test(c.team) ? 'neutral' : 'town';
            return '<div class="guest-social-char revealed team-' + teamCls + '">'
                + '<span class="guest-social-body"><span class="guest-social-name">' + c.name + ' <span class="guest-social-role">' + c.role + '</span></span>'
                + (c.told && c.tell ? '<span class="guest-social-line">the tell: “' + c.tell + '”</span>' : '')
                + '</span></div>';
        }).join('');
    }
    if (sent) {
        const accused = msg.accused ? '<div class="guest-social-line">The board accused <strong>' + msg.accused + '</strong> — ' + (msg.hit ? 'and was right.' : 'and was wrong.') + '</div>' : '';
        const every = (msg.accusations || []).filter(function (a) { return a.by === 'phone'; });
        const mine = every.filter(function (a) { return guestMe && a.who === guestMe.name; })[0];
        sent.innerHTML = (msg.hit ? '✅ ' : '❌ ') + 'Every role is on the board now.' + accused
            + (mine ? '<div class="guest-social-line">You accused ' + mine.to + ' — ' + (mine.correct ? 'on the hidden side. Well spotted.' : 'innocent. Ask what the tell was.') + '</div>' : '')
            + '<div class="guest-social-line">Look up — the tell and who accused whom are on the tutor\u2019s screen.</div>';
    }
    guestStatus('Round over. Every role is revealed on the board.');
}

init();
`;