import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// FitFrame lives in the shared shell so EVERY game gets the same
// "nothing is ever clipped" guarantee (splash, setup, menu, play screen).
import { FitFrame, SplashScreen, PlayerSetup } from './GameShell';
import type { ShellPlayer, ShellSetupConfig, ShellSetupResult, ShellSplashConfig } from './GameShell';
import {
  buildMenuPrompt, buildMillionairePrompt, parseMillionairePack, validateMillionaireJson,
  type ParsedMillionairePack,
} from './gamePack';
import {
  SYNTH_URL, isSynthUrl, playSynth, startSynthLoop, setSynthVolume, stopAllSynth, unlockSynth,
  type SynthHandle, type SynthKey,
} from './synth';

/**
 * SINGLE-FILE VERSION
 * - Audio URL settings (paste your own working links + saved to localStorage)
 * - Live-ish exchange rate refresh (USD -> local currency)
 * - Host TTS speaks personalized "what you can buy" message during final-answer suspense
 * - Removed raining money emojis and removed ⚡⚡⚡ text
 * - Kept the rest of the game behavior/UI as-is
 */

// ─────────────────────────────────────────────────────────────────────────────
// Embedded CSS (so you can copy a single .tsx file)
// NOTE: This is the same as src/index.css except the first line (@import "tailwindcss").
// ─────────────────────────────────────────────────────────────────────────────
const EMBEDDED_CSS = `
:root {
  --gold: #f5c518;
  --gold-dark: #c9a227;
  --gold-light: #ffe066;
  --bg-light: #f5f5f0;
  --bg-card: #ffffff;
  --text-primary: #1a1a2e;
  --text-secondary: #4a4a6a;
  --safe: #00b894;
  --danger: #e17055;
  --accent: #6c63ff;
  --shadow-gold: 0 0 30px rgba(245, 197, 24, 0.4);
}

.dark {
  --bg-light: #0d0d1a;
  --bg-card: #1a1a2e;
  --text-primary: #f0f0ff;
  --text-secondary: #a0a0c0;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Montserrat', 'Inter', sans-serif;
  background: var(--bg-light);
  color: var(--text-primary);
  transition: background 0.4s, color 0.4s;
  overflow-x: hidden;
}

/* ===== 3D CARD EFFECTS ===== */
.card-3d {
  transform-style: preserve-3d;
  perspective: 1000px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card-3d:hover {
  transform: translateY(-4px) rotateX(2deg);
}

.glass-card {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1), inset 0 1px 0 rgba(255,255,255,0.8);
}

.dark .glass-card {
  background: rgba(26, 26, 46, 0.85);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05);
}

/* ===== GOLD SHIMMER ===== */
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.gold-shimmer {
  background: linear-gradient(90deg, #c9a227, #f5c518, #ffe066, #f5c518, #c9a227);
  background-size: 200% auto;
  animation: shimmer 3s linear infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gold-border {
  border: 2px solid;
  border-image: linear-gradient(135deg, #c9a227, #f5c518, #ffe066, #c9a227) 1;
}

/* ===== ANSWER OPTIONS ===== */
.option-btn {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  border: 2.5px solid #e0d8b0;
  background: linear-gradient(135deg, #fffdf0 0%, #fff9e6 50%, #fffdf0 100%);
  color: var(--text-primary);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
  transform: translateZ(0);
  box-shadow: 0 4px 15px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
}

.option-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  transition: left 0.5s;
}
.option-btn:hover::before { left: 100%; }

.option-btn:hover {
  border-color: var(--gold);
  background: linear-gradient(135deg, #fff9d0 0%, #fffaaa 50%, #fff9d0 100%);
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 8px 30px rgba(245, 197, 24, 0.3), inset 0 1px 0 rgba(255,255,255,0.9);
}

.option-btn.selected {
  border-color: var(--gold-dark);
  background: linear-gradient(135deg, #ffd700 0%, #ffec6e 50%, #ffd700 100%);
  color: #1a1200;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 25px rgba(245,197,24,0.5), inset 0 1px 0 rgba(255,255,255,0.5);
}

.option-btn.correct {
  border-color: #00b894;
  background: linear-gradient(135deg, #00b894 0%, #00cec9 50%, #00b894 100%);
  color: white;
  box-shadow: 0 8px 30px rgba(0, 184, 148, 0.5);
  animation: correctPulse 0.6s ease;
}

.option-btn.wrong {
  border-color: #e17055;
  background: linear-gradient(135deg, #e17055 0%, #d63031 50%, #e17055 100%);
  color: white;
  box-shadow: 0 8px 30px rgba(225, 112, 85, 0.5);
  animation: wrongShake 0.5s ease;
}

.option-btn.eliminated {
  opacity: 0.3;
  pointer-events: none;
  transform: scale(0.95);
  filter: grayscale(1);
}

.dark .option-btn {
  background: linear-gradient(135deg, #1e1e3a 0%, #252545 50%, #1e1e3a 100%);
  border-color: #3a3a6a;
  color: #f0f0ff;
}
.dark .option-btn:hover {
  border-color: var(--gold);
  background: linear-gradient(135deg, #2a2a1a 0%, #3a3a00 50%, #2a2a1a 100%);
}
.dark .option-btn.selected {
  background: linear-gradient(135deg, #c9a227 0%, #f5c518 50%, #c9a227 100%);
  color: #1a1200;
}

/* ===== PRIZE LADDER ===== */
.prize-item {
  position: relative;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 2px 0;
}
.prize-item.current {
  background: linear-gradient(90deg, #f5c518, #ffe066, #f5c518);
  background-size: 200% auto;
  animation: shimmer 2s linear infinite;
  color: #1a1200;
  transform: scale(1.05) translateX(-4px);
  box-shadow: 0 4px 20px rgba(245,197,24,0.6);
  border-radius: 12px;
  font-size: 1.05rem;
}
.prize-item.safe {
  color: #00b894;
  font-weight: 700;
}
.prize-item.passed {
  color: #888;
  text-decoration: line-through;
  opacity: 0.6;
}

/* ===== TIMER ===== */
.timer-ring {
  transition: stroke-dashoffset 1s linear;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
}

/* ===== LIFELINE BUTTONS ===== */
.lifeline-btn {
  position: relative;
  border-radius: 50%;
  width: 72px;
  height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 3px solid rgba(245,197,24,0.5);
  background: linear-gradient(135deg, #fff9d0, #fffaaa, #fff9d0);
  box-shadow: 0 6px 20px rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.05);
}
.lifeline-btn:hover:not(:disabled) {
  transform: translateY(-5px) scale(1.15);
  box-shadow: 0 12px 30px rgba(245,197,24,0.4), inset 0 2px 0 rgba(255,255,255,0.8);
  border-color: var(--gold);
}
.lifeline-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  filter: grayscale(0.8);
  transform: none;
}
.lifeline-btn.used {
  opacity: 0.3;
  filter: grayscale(1);
  cursor: not-allowed;
}
.dark .lifeline-btn {
  background: linear-gradient(135deg, #2a2a1a, #3a3a00, #2a2a1a);
  border-color: rgba(245,197,24,0.3);
}

/* ===== ANIMATIONS ===== */
@keyframes correctPulse {
  0% { transform: scale(1); }
  30% { transform: scale(1.05); }
  60% { transform: scale(0.98); }
  100% { transform: scale(1); }
}

@keyframes wrongShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(5px); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes bounceIn {
  0% { transform: scale(0.3) rotate(-5deg); opacity: 0; }
  50% { transform: scale(1.08) rotate(2deg); opacity: 0.9; }
  70% { transform: scale(0.95) rotate(-1deg); }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

@keyframes floatUp {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-80px) scale(0.5); opacity: 0; }
}

@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(245,197,24,0.3); }
  50% { box-shadow: 0 0 50px rgba(245,197,24,0.7), 0 0 80px rgba(245,197,24,0.3); }
}

@keyframes timerWarning {
  0%, 100% { color: #e17055; }
  50% { color: #d63031; }
}

@keyframes confettiFall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
}

@keyframes spotlightRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes questionReveal {
  0% { opacity: 0; transform: scale(0.85) translateY(20px); filter: blur(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
}

@keyframes prizeWin {
  0% { transform: scale(1); }
  25% { transform: scale(1.3) rotate(-3deg); }
  50% { transform: scale(1.2) rotate(3deg); }
  75% { transform: scale(1.25) rotate(-1deg); }
  100% { transform: scale(1) rotate(0deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-fadeInUp { animation: fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.animate-fadeIn { animation: fadeIn 0.4s ease forwards; }
.animate-bounceIn { animation: bounceIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.animate-questionReveal { animation: questionReveal 0.7s ease forwards; }
.animate-glowPulse { animation: glowPulse 2s ease-in-out infinite; }
.animate-prizeWin { animation: prizeWin 0.8s ease forwards; }
.animate-bounce { animation: bounce 1s ease-in-out infinite; }
.animate-pulse { animation: pulse 1.5s ease-in-out infinite; }

/* ===== MODAL ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

/* ===== CONFETTI ===== */
.confetti-piece {
  position: fixed;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  animation: confettiFall linear forwards;
  z-index: 9999;
  pointer-events: none;
}

/* ===== PROGRESS BAR ===== */
.progress-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 1s linear;
  background: linear-gradient(90deg, #00b894, #00cec9);
}
.progress-bar-fill.warning {
  background: linear-gradient(90deg, #fdcb6e, #e17055);
  animation: timerWarning 0.5s ease-in-out infinite;
}
.progress-bar-fill.danger {
  background: linear-gradient(90deg, #e17055, #d63031);
}

/* ===== SCROLLBAR ===== */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 3px; }
::-webkit-scrollbar-thumb { background: var(--gold-dark); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--gold); }

.dark ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
.dark ::-webkit-scrollbar-thumb { background: rgba(245,197,24,0.4); }

/* ===== HOST SPEECH BUBBLE ===== */
.speech-bubble {
  position: relative;
  background: linear-gradient(135deg, #fff9d0, #fffef5);
  border: 2px solid var(--gold);
  border-radius: 20px;
  padding: 16px 20px;
  box-shadow: 0 8px 30px rgba(245,197,24,0.2);
  animation: fadeInUp 0.5s ease;
}
.speech-bubble::before {
  content: '';
  position: absolute;
  bottom: -14px;
  left: 30px;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 14px solid var(--gold);
}
.speech-bubble::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 32px;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 12px solid #fff9d0;
}

.dark .speech-bubble {
  background: linear-gradient(135deg, #2a2a1a, #1e1e10);
  border-color: var(--gold-dark);
}
.dark .speech-bubble::after { border-top-color: #2a2a1a; }

/* ===== WALKAWAY / FINAL ANSWER BTNS ===== */
.final-answer-btn {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 14px 40px;
  font-size: 1.2rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 6px 25px rgba(0, 184, 148, 0.4), inset 0 1px 0 rgba(255,255,255,0.3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.final-answer-btn:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 12px 35px rgba(0, 184, 148, 0.5);
}
.final-answer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.walkaway-btn {
  background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 12px 28px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(225,112,85,0.3);
}
.walkaway-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(225,112,85,0.4);
}

.host-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid var(--gold);
  background: linear-gradient(135deg, #1a1a2e, #2d2d5e);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  box-shadow: 0 4px 20px rgba(245,197,24,0.4), inset 0 2px 4px rgba(255,255,255,0.1);
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .prize-sidebar { display: none !important; }
}

@media (max-width: 900px) {
  .prize-sidebar { display: none !important; }
  .mobile-prize-strip { display: flex !important; }
}

@media (max-width: 768px) {
  .question-text { font-size: 1.6rem !important; }
  .option-text { font-size: 1.2rem !important; }
}

.json-textarea {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  border-radius: 12px;
  border: 2px solid rgba(245,197,24,0.3);
  padding: 16px;
  resize: vertical;
  transition: border-color 0.3s;
  background: rgba(255,255,255,0.9);
  color: var(--text-primary);
  width: 100%;
}

.styled-select {
  appearance: none;
  border-radius: 12px;
  border: 2px solid rgba(245,197,24,0.3);
  padding: 10px 16px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.3s;
  background: white;
  padding-right: 40px;
  color: var(--text-primary);
}

.styled-input {
  border-radius: 12px;
  border: 2px solid rgba(245,197,24,0.3);
  padding: 10px 16px;
  font-size: 1rem;
  font-weight: 600;
  transition: border-color 0.3s;
  background: white;
  color: var(--text-primary);
  width: 100%;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ===== RESULT SPLASH ===== */
@keyframes resultSplash {
  0% { transform: scale(0) rotate(-20deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(5deg); opacity: 1; }
  70% { transform: scale(0.9) rotate(-2deg); }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

.result-splash {
  animation: resultSplash 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

/* ===== ROLLING COUNTER ===== */
@keyframes countUp {
  0% { transform: translateY(40px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
.rolling-counter { animation: countUp 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }

/* ===== OPTION SWEEP ===== */
@keyframes optSweep {
  0% { border-color: rgba(245,197,24,0.1); box-shadow: none; }
  50% { border-color: rgba(245,197,24,0.9); box-shadow: 0 0 30px rgba(245,197,24,0.5); }
  100% { border-color: rgba(245,197,24,0.1); box-shadow: none; }
}
.option-sweep { animation: optSweep 0.6s ease; }

/* ===== CAMERA ZOOM ===== */
@keyframes cameraZoomIn {
  0% { transform: scale(1); }
  50% { transform: scale(1.015); }
  100% { transform: scale(1.03); }
}
@keyframes cameraZoomOut { from { transform: scale(1.03); } to { transform: scale(1); } }
.camera-zoom-in { animation: cameraZoomIn 3s ease forwards; }
.camera-zoom-out { animation: cameraZoomOut 0.6s ease forwards; }

/* ===== DANGER/GLOW WASH ===== */
@keyframes dangerWash {
  0% { opacity: 0; }
  30% { opacity: 0.25; }
  100% { opacity: 0; }
}
.danger-wash {
  position: fixed; inset: 0; z-index: 9990; pointer-events: none;
  background: radial-gradient(circle, rgba(225,50,50,0.35), transparent 70%);
  animation: dangerWash 1.8s ease forwards;
}
.glow-wash {
  position: fixed; inset: 0; z-index: 9990; pointer-events: none;
  background: radial-gradient(circle, rgba(0,200,150,0.3), transparent 70%);
  animation: dangerWash 1.8s ease forwards;
}

/* ===== SHIELD PULSE ===== */
@keyframes shieldPulse {
  0%,100% { box-shadow: 0 0 8px rgba(0,184,148,0.3); }
  50% { box-shadow: 0 0 28px rgba(0,184,148,0.7), 0 0 56px rgba(0,184,148,0.25); }
}
.safe-haven-pulse { animation: shieldPulse 2s ease-in-out infinite; }

/* ===== BANK TRANSFER ===== */
@keyframes bankTransfer {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  60% { transform: translateY(-60px) scale(1.2); opacity: 0.8; }
  100% { transform: translateY(-120px) scale(0.6); opacity: 0; }
}
.bank-transfer-particle {
  position: fixed; pointer-events: none; z-index: 9991;
  font-size: 1.6rem;
  animation: bankTransfer 1.2s ease forwards;
}

/* ===== HEARTBEAT ===== */
@keyframes heartbeat {
  0%,100% { transform: scale(1); }
  15% { transform: scale(1.08); }
  30% { transform: scale(1); }
  45% { transform: scale(1.05); }
  60% { transform: scale(1); }
}
.heartbeat { animation: heartbeat 0.9s ease-in-out infinite; }

/* ===== CINEMATIC BAR ===== */
.cinematic-bar {
  position: fixed; left: 0; right: 0; z-index: 9998; pointer-events: none;
  background: #000; transition: height 0.8s ease;
}

/* ===== CATEGORY BG ===== */
.category-bg {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.06;
  background-size: cover; background-position: center;
  border-radius: inherit; transition: opacity 0.5s;
}

/* ===== RESPONSIVE LAYOUT =====
   Every screen is laid out with these helpers so the game fits the window it
   is given (browser tab, projector, tablet or phone) without horizontal
   scrolling. */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; }
.audio-row { display: grid; grid-template-columns: 200px 1fr auto; gap: 0.75rem; align-items: center; }
.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.options-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }

/* Top toolbar of buttons (menu screen) — never stacks into a tall column. */
.menu-toolbar {
  display: flex; flex-wrap: wrap; gap: 0.5rem;
  justify-content: flex-end; align-items: center;
  pointer-events: none;
}
.menu-toolbar > * { pointer-events: auto; }

@media (max-width: 1024px) {
  .grid-2 { grid-template-columns: 1fr; }
  .audio-row { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .menu-toolbar { justify-content: center; gap: 0.35rem; }
  .menu-toolbar > * { padding: 7px 12px !important; font-size: 0.78rem !important; }
  .options-grid, .options-grid.cols-3 { grid-template-columns: 1fr; }
  .option-btn { min-height: 60px !important; padding: 14px 16px !important; }
  .lifeline-btn { width: 58px !important; height: 58px !important; font-size: 1.3rem !important; }
}

@media (max-width: 480px) {
  .grid-2 { gap: 0.75rem !important; }
  .glass-card { border-radius: 1.25rem !important; padding: 1.25rem !important; }
}

/* ===== THE GAME SCREEN NEVER LEAVES THE FRAME =====
   The play screen used to grow to its content height (1403px in an 888px
   window), so the question, options and lifelines ran off the bottom. It is
   now locked to one viewport height: the prize ladder owns the left rail, the
   centre column owns the rest and scrolls internally ONLY if it truly cannot
   fit. Spacing and type shrink with the window height first. */
.play-root {
  height: 100dvh;
  max-height: 100dvh;
  min-height: 0;
  overflow: hidden;
}
.play-main {
  height: 100dvh;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  margin-left: 210px;
  max-width: 1100px;
}
.prize-sidebar { width: 210px; }

/* The rail itself never scrolls: the ladder is fitted to it instead. */
.prize-ladder-root { height: 100%; box-sizing: border-box; display: flex; flex-direction: column; padding: 8px 5px; overflow: hidden; }
.prize-ladder-head { flex: 0 0 auto; text-align: center; padding: 5px 0 9px; border-bottom: 1px solid rgba(245,197,24,0.2); margin-bottom: 6px; }
.prize-ladder-body { flex: 1 1 auto; min-height: 0; overflow: hidden; }

/* Short window: tighten the whole turn before anything is cut off. */
@media (max-height: 940px) {
  .play-main { padding: 10px clamp(12px, 2vw, 22px) 14px !important; }
  .play-topbar { margin-bottom: 8px !important; gap: 0.5rem !important; }
  .play-topbar .glass-card { padding: 6px 16px !important; }
  .play-meta { margin-bottom: 8px !important; }
  .play-question { padding: 12px 16px !important; margin-bottom: 8px !important; }
  .question-text { font-size: clamp(1rem, 3.4vh, 1.6rem) !important; line-height: 1.32 !important; }
  .play-timer { margin-bottom: 8px !important; }
  .options-grid { gap: 0.5rem !important; margin-bottom: 8px !important; }
  .option-btn { min-height: 52px !important; padding: 9px 14px !important; gap: 10px !important; }
  .option-text { font-size: clamp(0.85rem, 2.1vh, 1.05rem) !important; }
  .host-avatar { width: 42px !important; height: 42px !important; font-size: 1.2rem !important; }
  .speech-bubble { padding: 9px 14px !important; }
  .speech-bubble p { font-size: clamp(0.82rem, 2vh, 1rem) !important; }
  .lifeline-btn { width: 56px !important; height: 56px !important; font-size: 1.2rem !important; }
  .prize-item { padding: 2px 10px !important; font-size: 0.78rem !important; margin: 1px 0 !important; border-radius: 8px !important; }
  .prize-item.current { font-size: 0.86rem !important; }
  .prize-sidebar { overflow: hidden !important; }
  /* post-answer summary also has to stay inside the frame */
  .result-splash { padding: 12px !important; margin-bottom: 10px !important; }
  .result-splash h2 { font-size: clamp(1.2rem, 3.6vh, 1.9rem) !important; }
  .result-splash p { font-size: clamp(0.8rem, 2vh, 1rem) !important; }
  .result-splash > div { font-size: clamp(1.6rem, 4.6vh, 2.6rem) !important; }
  .result-splash p { font-size: clamp(0.8rem, 2vh, 1rem) !important; }
  .play-explain { padding: 10px 14px !important; margin-bottom: 10px !important; }
  .play-explain p { font-size: clamp(0.82rem, 2vh, 1rem) !important; line-height: 1.45 !important; }
  .play-lifelines { padding: 10px 14px !important; }
  .play-lifelines-head { margin-bottom: 0.4rem !important; }
  .play-lifelines-row { gap: 1rem !important; }
  .play-players { margin-bottom: 0.5rem !important; }
}
@media (max-height: 720px) {
  .play-question { padding: 10px 12px !important; }
  .option-btn { min-height: 44px !important; padding: 7px 12px !important; }
  .lifeline-btn { width: 48px !important; height: 48px !important; font-size: 1rem !important; }
  .prize-item { padding: 1px 8px !important; font-size: 0.72rem !important; }
}

/* No room for the rail (matches the width rules that hide .prize-sidebar):
   drop its margin too, and clear the fixed mobile prize strip. */
@media (max-width: 1024px) {
  .play-main { margin-left: 0 !important; padding-bottom: 76px !important; max-width: none; }
  /* the rail is hidden at this width, so the compact strip must take over */
  .mobile-prize-strip { display: flex !important; }
}

.menu-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
@media (max-width: 1080px) { .menu-card-grid { grid-template-columns: 1fr; } }

/* ===== MENU (main) SCREEN =====
   The menu used to be ONE tall column (hero 107 + settings card 1163 + toolbar
   = ~1580px), so <FitFrame> had to shrink it — which made the ⚙️ Game Settings
   card tiny. It is now two columns on any normal window: the hero + actions in
   the first, the settings card in the second, with the card's own fields in two
   columns. That measures ~700px, so it renders at zoom 1 and full type size. */
.menu-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 760px);
  gap: clamp(1rem, 2.4vh, 2rem) clamp(1rem, 3vw, 2.75rem);
  align-items: center;
  width: 100%;
}
.menu-hero { grid-column: 1; grid-row: 1; margin-bottom: clamp(0.5rem, 1.6vh, 1.25rem); }
.menu-actions { grid-column: 1; grid-row: 2; }
.menu-grid > .menu-card { grid-column: 2; grid-row: 1 / span 2; }
/* Below the FitFrame floor the menu scrolls instead of clipping, and safe
   centering is what stops a centred flex child from being cut off at the top. */
.menu-screen { overflow-y: auto !important; justify-content: safe center !important; }
@media (max-width: 900px) {
  .menu-grid { grid-template-columns: minmax(0, 1fr); }
  .menu-hero, .menu-actions, .menu-grid > .menu-card { grid-column: 1; grid-row: auto; }
}

/* Only compact when the window is genuinely short — the old rules fired at
   1000px and shrank the settings text on a normal screen for no reason. */
@media (max-height: 1000px) {
  .menu-screen { padding: 54px clamp(12px, 2vw, 28px) 10px !important; }
  .menu-hero-emoji { font-size: clamp(2rem, 5.4vh, 3.4rem) !important; margin-bottom: 4px !important; }
  .menu-hero h1 { font-size: clamp(1.5rem, 5.2vh, 2.6rem) !important; margin-bottom: 4px !important; }
  .menu-hero p { font-size: clamp(0.85rem, 2vh, 1.1rem) !important; }
  .menu-card { padding: clamp(16px, 2.6vh, 26px) !important; border-radius: 1.5rem !important; }
  .menu-card h3 { margin-bottom: 0.9rem !important; font-size: 1.2rem !important; }
  .menu-card .grid-2 { gap: 0.8rem !important; margin-bottom: 0.9rem !important; }
  .menu-card label { font-size: 1rem !important; margin-bottom: 5px !important; }
  .menu-card select, .menu-card input { padding: 9px 12px !important; font-size: 1.05rem !important; }
  .menu-learn { padding: 12px 14px !important; margin-bottom: 0.8rem !important; }
  .menu-learn-head { font-size: 1rem !important; margin-bottom: 0.6rem !important; }
  .menu-card button { padding-top: 11px !important; padding-bottom: 11px !important; font-size: 1.1rem !important; }
  .menu-card button[style*="font-size: 1.5rem"] { padding: 14px !important; font-size: 1.25rem !important; }
}
@media (max-height: 760px) {
  .menu-hero-emoji { display: none !important; }
  .menu-hero p { display: none !important; }
  .menu-shortcuts { display: none !important; }
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Game data
// ─────────────────────────────────────────────────────────────────────────────

type QuestionType = 'A' | 'B' | 'C';
type QuestionCategory = 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'trivia';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Question {
  id: number;
  text: string;
  type: QuestionType;
  category: QuestionCategory;
  options: string[];
  correctIndices: number[];
  explanation: string;
  listeningText?: string;
  difficulty: Difficulty;
}

const PRIZE_LADDER = [
  100, 200, 300, 500, 1000,
  2000, 4000, 8000, 16000, 32000,
  64000, 125000, 250000, 500000, 1000000,
  1500000, 2000000, 2500000, 3000000, 4000000,
  5000000, 6000000, 7000000, 8000000, 10000000,
  12000000, 15000000, 18000000, 20000000, 30000000,
];

const SAFE_HAVENS = [4, 9, 14, 19, 24, 29];

const formatPrize = (amount: number): string => {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}K`;
  return `$${amount.toLocaleString()}`;
};

const TYPE_LABELS: Record<QuestionType, string> = {
  A: '4 Options • 1 Correct',
  B: '5 Options • 2 Correct',
  C: '7 Options • 3 Correct',
};

const CATEGORY_ICONS: Record<QuestionCategory, string> = {
  vocabulary: '📚',
  grammar: '✏️',
  reading: '📖',
  listening: '🎧',
  trivia: '🌍',
};

const CATEGORY_COLORS: Record<QuestionCategory, string> = {
  vocabulary: 'bg-purple-100 text-purple-800',
  grammar: 'bg-blue-100 text-blue-800',
  reading: 'bg-green-100 text-green-800',
  listening: 'bg-orange-100 text-orange-800',
  trivia: 'bg-pink-100 text-pink-800',
};

const HOST_LINES = {
  welcome: [
    "Welcome to HotSeat – Language Edition! I'm your host, and tonight, knowledge is power!",
    "Good evening, and welcome! Are you ready to test your English skills and win big? Let's play HotSeat!",
  ],
  questionIntro: [
    "Here comes your next question. Think carefully!",
    "For {prize}, here is your question...",
    "You're doing brilliantly! Now, for {prize}...",
    "The stakes are rising! For {prize}...",
    "This is where it gets interesting! For {prize}...",
  ],
  finalAnswer: [
    "Is that your final answer?",
    "Are you absolutely sure? Final answer?",
    "Once you confirm, there's no going back. Final answer?",
  ],
  correct: [
    "CORRECT! Magnificent! You've just won {prize}!",
    "That's absolutely right! {prize} is yours!",
    "Brilliant! You knew that! {prize} added to your winnings!",
    "Incredible! {prize}! You're unstoppable tonight!",
  ],
  wrong: [
    "Oh no... The correct answer was {correct}. You leave with {prize}.",
    "I'm so sorry. The answer was {correct}. You take home {prize}.",
    "What a difficult moment. {correct} was the answer. You walk away with {prize}.",
  ],
  fiftyFifty: [
    "Let's use the 50-50 lifeline! Two wrong answers... disappear!",
    "50-50 activated! The odds just got better!",
  ],
  phoneAFriend: [
    "You're calling a friend! Let's see what they think...",
    "Phone a friend! Your friend is on the line...",
  ],
  askAudience: [
    "Let's ask the audience! Look at those results...",
    "The audience is voting! Interesting distribution...",
  ],
  timerWarning: [
    "10 seconds left! Don't panic, think clearly!",
    "You have 10 seconds remaining! Trust your instincts!",
  ],
  walkAway: [
    "You've decided to walk away. Smart move! You take {prize} with you!",
    "Walking away is sometimes the wisest choice. {prize} is yours!",
  ],
  safeHaven: [
    "Congratulations! You've reached a safe haven at {prize}! No matter what, this is yours!",
    "Safe haven reached! {prize} is guaranteed! Now let's go higher!",
  ],
  multiCorrect: [
    "This is a multi-answer question! Select ALL correct answers before submitting.",
    "Careful! This question has more than one correct answer. Find them all!",
  ],
};

// Host reaction variants by outcome & tier
const HOST_REACTIONS = {
  correctLow: [
    "Nice start! Keep it going, {name}!",
    "Easy one, but you nailed it! Let's climb higher!",
    "Off to a great start! The money is building!",
  ],
  correctMid: [
    "Impressive knowledge, {name}! The prize is getting serious now!",
    "You're on fire! {prize} and counting!",
    "The audience is impressed! Can you keep this streak going?",
  ],
  correctHigh: [
    "INCREDIBLE, {name}! {prize}! This is life-changing money!",
    "The crowd goes wild! {prize}! You're a GENIUS!",
    "I can't believe it! {prize}! You could retire on this!",
    "History in the making! {prize}! Absolutely phenomenal!",
  ],
  wrongLow: [
    "Oh dear, {name}. It happens to the best of us. You leave with {prize}.",
    "Not to worry. Learning is winning too! You take home {prize}.",
  ],
  wrongMid: [
    "That's a tough one to lose, {name}. The safe haven saves you at {prize}.",
    "So close to greatness! But {prize} is nothing to sneeze at.",
  ],
  wrongHigh: [
    "The silence is deafening... {name}, that was a million-dollar mistake. You fall to {prize}.",
    "Oh {name}... so close to the top. The correct answer slipped away. You keep {prize}.",
    "A heartbreaker. The whole studio feels it. You leave with {prize}.",
  ],
  walkawayBrave: [
    "A courageous decision, {name}. You walk away a winner with {prize}!",
    "Smart! Sometimes the bravest move is knowing when to stop. {prize} is yours!",
  ],
  safeHavenReached: [
    "SAFE HAVEN! {name}, no matter what happens, {prize} is GUARANTEED!",
    "You've locked in {prize}! That's your floor now. Let's see how high you can fly!",
  ],
};

const getHostReaction = (outcome: string, name: string, prize: string): string => {
  const pool = (HOST_REACTIONS as Record<string, string[]>)[outcome];
  if (!pool || pool.length === 0) return '';
  let line = pool[Math.floor(Math.random() * pool.length)];
  line = line.replace(/\{name\}/g, name).replace(/\{prize\}/g, prize);
  return line;
};

// Category background images (Unsplash, free)
const CATEGORY_BG_IMAGES: Record<string, string> = {
  vocabulary: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1200&q=60',
  grammar: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=60',
  reading: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&q=60',
  listening: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=60',
  trivia: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=60',
};

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'What does the idiom "break the ice" mean?',
    type: 'A',
    category: 'vocabulary',
    options: [
      'To damage something made of ice',
      'To do or say something to relieve tension or shyness in a social situation',
      'To end a friendship',
      'To feel very cold',
    ],
    correctIndices: [1],
    explanation: '"Break the ice" means to do or say something to relieve tension or make people feel comfortable in a new social situation.',
    difficulty: 'easy',
  },
  {
    id: 2,
    text: 'Choose the CORRECT sentence:',
    type: 'A',
    category: 'grammar',
    options: [
      'She don\'t like coffee in the mornings.',
      'She doesn\'t likes coffee in the mornings.',
      'She doesn\'t like coffee in the mornings.',
      'She not like coffee in the mornings.',
    ],
    correctIndices: [2],
    explanation: 'With third-person singular (she/he/it) in simple present negative, we use "doesn\'t" + base verb (like, not likes).',
    difficulty: 'easy',
  },
  {
    id: 3,
    text: 'Which TWO sentences use the idiom "hit the sack" CORRECTLY?',
    type: 'B',
    category: 'vocabulary',
    options: [
      'I\'m exhausted! I need to hit the sack.',
      'He hit the sack during the boxing match.',
      'After a long day of work, she hit the sack at 9 PM.',
      'The children hit the sack in the playground.',
      'Can you hit the sack and bring it inside?',
    ],
    correctIndices: [0, 2],
    explanation: '"Hit the sack" is an idiom meaning to go to bed/sleep. Options A and C use it correctly.',
    difficulty: 'easy',
  },
  {
    id: 4,
    text: 'Listen carefully. What is the main message of this sentence?',
    type: 'A',
    category: 'listening',
    listeningText: 'Every cloud has a silver lining, so even though you failed the exam, use it as a chance to study harder and grow.',
    options: [
      'Failing exams is a good thing',
      'Clouds produce silver rain',
      'There is something positive in every negative situation',
      'You should study less and relax',
    ],
    correctIndices: [2],
    explanation: '"Every cloud has a silver lining" means there is something positive to be found in every difficult situation.',
    difficulty: 'easy',
  },
  {
    id: 5,
    text: 'SAFE HAVEN ✦ Which sentence is in the PRESENT PERFECT tense?',
    type: 'A',
    category: 'grammar',
    options: [
      'She was studying all night.',
      'I have visited Paris three times.',
      'They will arrive tomorrow.',
      'He studies every day.',
    ],
    correctIndices: [1],
    explanation: 'Present Perfect uses "have/has + past participle". "I have visited" = Present Perfect.',
    difficulty: 'easy',
  },
  {
    id: 6,
    text: 'Select the TWO words that are SYNONYMS of "happy":',
    type: 'B',
    category: 'vocabulary',
    options: ['Melancholy', 'Elated', 'Sorrowful', 'Content', 'Anxious'],
    correctIndices: [1, 3],
    explanation: '"Elated" means extremely happy and "content" means satisfied and happy. Both are synonyms of happy.',
    difficulty: 'medium',
  },
  {
    id: 7,
    text: 'Choose the THREE grammatically CORRECT sentences:',
    type: 'C',
    category: 'grammar',
    options: [
      'If I were you, I would study harder.',
      'She has been working here since five years.',
      'The book that I borrowed is fascinating.',
      'He don\'t understand the question.',
      'They arrived before the meeting started.',
      'I am agree with your opinion.',
      'Neither of the students was prepared.',
    ],
    correctIndices: [0, 2, 4],
    explanation: 'A: Correct second conditional. C: Correct relative clause. E: Correct past sequence.',
    difficulty: 'medium',
  },
  {
    id: 8,
    text: 'Read this passage: "The Amazon rainforest, often called the \'lungs of the Earth\', produces 20% of the world\'s oxygen and is home to 10% of all species on Earth." What is the BEST title for this passage?',
    type: 'A',
    category: 'reading',
    options: [
      'Types of Trees in Brazil',
      'The Amazon: Earth\'s Vital Ecosystem',
      'How Oxygen is Produced',
      'Wildlife Photography in South America',
    ],
    correctIndices: [0],
    explanation: 'The passage focuses on the Amazon\'s vital role in oxygen production and biodiversity.',
    difficulty: 'medium',
  },
  {
    id: 9,
    text: 'Which TWO words correctly complete this sentence: "The scientist\'s discovery was truly ___; it changed everything we knew."',
    type: 'B',
    category: 'vocabulary',
    options: ['Mundane', 'Groundbreaking', 'Trivial', 'Revolutionary', 'Ordinary'],
    correctIndices: [1, 3],
    explanation: '"Groundbreaking" and "Revolutionary" both describe something that dramatically changes existing knowledge or practice.',
    difficulty: 'medium',
  },
  {
    id: 10,
    text: 'SAFE HAVEN ✦ Which sentence uses a CONDITIONAL correctly?',
    type: 'A',
    category: 'grammar',
    options: [
      'If she will study, she passes the exam.',
      'If he studied, he would have passed.',
      'Unless you don\'t hurry, you\'ll miss the bus.',
      'If I had known, I would have come earlier.',
    ],
    correctIndices: [3],
    explanation: '"If I had known, I would have come earlier" is a correct Third Conditional (past hypothetical).',
    difficulty: 'medium',
  },
  {
    id: 11,
    text: 'Choose the THREE idioms that relate to the concept of "working hard":',
    type: 'C',
    category: 'vocabulary',
    options: [
      'Burn the midnight oil',
      'Bite the bullet',
      'Go the extra mile',
      'Let the cat out of the bag',
      'Burn the candle at both ends',
      'Spill the beans',
      'Bite off more than you can chew',
    ],
    correctIndices: [0, 2, 4],
    explanation: '"Burn the midnight oil", "Go the extra mile", and "Burn the candle at both ends" relate to working hard.',
    difficulty: 'hard',
  },
  {
    id: 12,
    text: 'What is the correct passive form of: "The teacher explains the rules every day."',
    type: 'A',
    category: 'grammar',
    options: [
      'The rules are explained by the teacher every day.',
      'The rules were explained by the teacher every day.',
      'The rules have been explained by the teacher every day.',
      'The rules are being explained by the teacher every day.',
    ],
    correctIndices: [0],
    explanation: 'Present simple passive: subject + am/is/are + past participle.',
    difficulty: 'hard',
  },
  {
    id: 13,
    text: 'Listen to this conversation and select TWO statements that are TRUE:',
    type: 'B',
    category: 'listening',
    listeningText: 'Anna: "I\'ve been under the weather lately. I think I\'m burning out." Mark: "You should bite the bullet and take a vacation. You\'ve been burning the midnight oil for months!"',
    options: [
      'Anna is feeling physically or mentally unwell',
      'Mark suggests Anna should quit her job',
      'Anna has been working excessively',
      'Mark is the one who is tired',
      'Anna has already booked a vacation',
    ],
    correctIndices: [0, 2],
    explanation: '"Under the weather" means unwell and "burning the midnight oil" means working late.',
    difficulty: 'hard',
  },
  {
    id: 14,
    text: 'Select the THREE sentences that use REPORTED SPEECH correctly:',
    type: 'C',
    category: 'grammar',
    options: [
      'She said she was tired.',
      'He told me that he will go tomorrow.',
      'They said they had finished the project.',
      'She asked me where did I live.',
      'He mentioned that he had been working all day.',
      'She told that she likes coffee.',
      'He said he couldn\'t attend the meeting.',
    ],
    correctIndices: [0, 2, 4],
    explanation: 'A, C, E correctly use backshift and structure for reported speech.',
    difficulty: 'hard',
  },
  {
    id: 15,
    text: '⭐ MILLION DOLLAR QUESTION ⭐ Which word BEST describes someone who uses very formal, academic vocabulary in everyday conversation?',
    type: 'A',
    category: 'vocabulary',
    options: ['Eloquent', 'Pedantic', 'Verbose', 'Laconic'],
    correctIndices: [1],
    explanation: '"Pedantic" describes someone who is overly focused on formal rules/details or uses overly academic vocabulary.',
    difficulty: 'hard',
  },
  {
    id: 16,
    text: 'Which THREE words are antonyms of "ambiguous"?',
    type: 'C',
    category: 'vocabulary',
    options: ['Clear', 'Vague', 'Explicit', 'Uncertain', 'Definite', 'Obscure', 'Unequivocal'],
    correctIndices: [0, 2, 6],
    explanation: '"Clear", "Explicit", and "Unequivocal" mean the opposite of ambiguous.',
    difficulty: 'hard',
  },
  {
    id: 17,
    text: 'Which TWO sentences correctly use the word "despite"?',
    type: 'B',
    category: 'grammar',
    options: [
      'Despite of the rain, they went outside.',
      'Despite the rain, they went outside.',
      'Despite she was tired, she kept working.',
      'Despite being tired, she kept working.',
      'Despite that it was raining, they went out.',
    ],
    correctIndices: [1, 3],
    explanation: '"Despite" is followed by a noun/gerund, not a clause.',
    difficulty: 'hard',
  },
  {
    id: 18,
    text: 'Listen to the sentence and identify what literary device is being used: "The wind whispered secrets through the ancient trees."',
    type: 'A',
    category: 'listening',
    listeningText: 'The wind whispered secrets through the ancient trees.',
    options: ['Simile', 'Hyperbole', 'Personification', 'Alliteration'],
    correctIndices: [2],
    explanation: 'Personification gives human qualities (whispering) to non-human things (the wind).',
    difficulty: 'hard',
  },
  {
    id: 19,
    text: 'Read: "Procrastination is the thief of time." Select THREE correct interpretations:',
    type: 'C',
    category: 'reading',
    options: [
      'Delaying tasks wastes valuable time',
      'Burglars often procrastinate',
      'Time management suffers when we put things off',
      'Theft is related to time travel',
      'Procrastination has negative consequences',
      'The sentence is about a literal robbery',
      'Avoiding tasks leads to lost opportunities',
    ],
    correctIndices: [0, 2, 4],
    explanation: 'It is a metaphor: procrastination wastes time and has negative consequences.',
    difficulty: 'hard',
  },
  {
    id: 20,
    text: 'Choose the grammatically CORRECT complex sentence:',
    type: 'A',
    category: 'grammar',
    options: [
      'Although he was tired but he continued working.',
      'He continued working, although he was tired.',
      'Although he continued working and he was tired.',
      'He was tired, although but continued working.',
    ],
    correctIndices: [1],
    explanation: 'You do not use "although" with "but" together.',
    difficulty: 'hard',
  },
  {
    id: 21,
    text: 'Which TWO sentences correctly use the subjunctive mood?',
    type: 'B',
    category: 'grammar',
    options: [
      'I suggest that he studies more carefully.',
      'I suggest that he study more carefully.',
      'It is essential that she is on time.',
      'It is essential that she be on time.',
      'The doctor recommended that he rests.',
    ],
    correctIndices: [1, 3],
    explanation: 'Subjunctive uses base verb: "he study", "she be".',
    difficulty: 'hard',
  },
  {
    id: 22,
    text: 'Choose THREE words with the correct prefix meaning "not" or "opposite":',
    type: 'C',
    category: 'vocabulary',
    options: ['Irrelevant', 'Disrespect', 'Unnatural', 'Inpossible', 'Misunderstand', 'Disagrement', 'Nonfiction'],
    correctIndices: [0, 1, 2],
    explanation: 'Ir-, Dis-, Un- correctly form negatives here.',
    difficulty: 'hard',
  },
  {
    id: 23,
    text: 'Which answer correctly identifies ALL the errors in this sentence: "Yesterday, she go to the market and buys fresh vegetable."',
    type: 'A',
    category: 'grammar',
    options: [
      'go → went, buys → bought, vegetable → vegetables',
      'go → goes, buys → bought, vegetable → vegetables',
      'go → went, buys → buy, vegetable → vegetables',
      'No errors in this sentence',
    ],
    correctIndices: [0],
    explanation: 'Past tense needed plus plural vegetables.',
    difficulty: 'hard',
  },
  {
    id: 24,
    text: 'Select the TWO sentences that contain DANGLING MODIFIERS:',
    type: 'B',
    category: 'grammar',
    options: [
      'Running to catch the bus, my phone fell out of my pocket.',
      'Having studied all night, the exam seemed easy.',
      'The student, who studied all night, passed the exam.',
      'Bored by the movie, the remote was grabbed by Tom.',
      'After finishing lunch, we went for a walk.',
    ],
    correctIndices: [0, 3],
    explanation: 'A and D have dangling modifiers (phone/remote were not running/bored).',
    difficulty: 'hard',
  },
  {
    id: 25,
    text: 'Choose THREE sentences that correctly use INVERSION for emphasis:',
    type: 'C',
    category: 'grammar',
    options: [
      'Never have I seen such beautiful work.',
      'Rarely she goes to the cinema.',
      'Not only did he fail, but he also lost his notes.',
      'Hardly I had arrived when it started raining.',
      'Seldom do we get opportunities like this.',
      'Only when she apologized did he forgive her.',
      'No sooner I sat down than the phone rang.',
    ],
    correctIndices: [0, 2, 4],
    explanation: 'A, C, E have correct inversion structure.',
    difficulty: 'hard',
  },
  {
    id: 26,
    text: 'Which word is a PORTMANTEAU (blend of two words)?',
    type: 'A',
    category: 'vocabulary',
    options: ['Beautiful', 'Brunch', 'Running', 'Happiness'],
    correctIndices: [1],
    explanation: 'Brunch = breakfast + lunch.',
    difficulty: 'hard',
  },
  {
    id: 27,
    text: 'Select TWO sentences that correctly use CLEFT SENTENCES for emphasis:',
    type: 'B',
    category: 'grammar',
    options: [
      'It was John who broke the window.',
      'It was John that he broke the window.',
      'What I need is a long vacation.',
      'What I need it is a long vacation.',
      'It is because tired that she left.',
    ],
    correctIndices: [0, 2],
    explanation: 'A and C are correctly formed cleft sentences.',
    difficulty: 'hard',
  },
  {
    id: 28,
    text: 'Choose THREE collocations that are CORRECT with the verb "make":',
    type: 'C',
    category: 'vocabulary',
    options: ['Make a mistake', 'Make a decision', 'Make homework', 'Make progress', 'Make an effort', 'Make the dishes', 'Make a journey'],
    correctIndices: [0, 1, 3],
    explanation: 'Make a mistake/decision/progress are correct. We do homework/dishes; go on a journey.',
    difficulty: 'hard',
  },
  {
    id: 29,
    text: 'Select the TWO sentences that are written in the CORRECT academic register:',
    type: 'B',
    category: 'reading',
    options: [
      'The results of the study show that pollution is super bad for everyone.',
      'The findings indicate a significant correlation between air quality and respiratory health.',
      'Lots of people think that climate change is a really big deal.',
      'This research demonstrates that interventions can effectively mitigate environmental degradation.',
      'Scientists are kinda worried about the ozone layer and stuff.',
    ],
    correctIndices: [1, 3],
    explanation: 'Academic register uses formal, precise vocabulary and avoids slang.',
    difficulty: 'hard',
  },
  {
    id: 30,
    text: '🏆 GRAND FINALE: $30,000,000 🏆 Choose the THREE statements that CORRECTLY describe language acquisition theory:',
    type: 'C',
    category: 'trivia',
    options: [
      'Krashen\'s Input Hypothesis suggests learners acquire language through comprehensible input (i+1)',
      'Behaviourism claims language is acquired purely through imitation and reinforcement',
      'The Critical Period Hypothesis suggests language is easiest to learn in early childhood',
      'Chomsky argued that language is entirely culturally transmitted with no innate component',
      'Vygotsky\'s Zone of Proximal Development relates to learning with guidance from a more capable peer',
      'The Affective Filter Hypothesis claims anxiety has no effect on language acquisition',
      'Communicative Language Teaching prioritizes real-world communication over grammar drills',
    ],
    correctIndices: [0, 1, 2],
    explanation: 'Krashen i+1, behaviourism, and critical period are correctly described here.',
    difficulty: 'hard',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Learner personalization
// ─────────────────────────────────────────────────────────────────────────────

type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
type AgeGroup = 'child' | 'teen' | 'adult';

interface LearnerProfile {
  name: string;
  country: string;
  currency: string;
  currencySymbol: string;
  exchangeRate: number; // 1 USD -> X currency
  cefrLevel: Cefr;
  age: AgeGroup;
}

// ─── Player / Actor System ────────────────────────────────────────────────

const AVATAR_POOL = ['👩‍🎓','👨‍🎓','👩‍💻','👨‍💻','🧑‍🏫','🧑‍🎤','🧙','🧑‍🚀','🦸','🦹','🧛','🧜','🧝','🤴','👸','🥷','🧑‍🎨','🧑‍🔬','🧑‍🍳','🧑‍⚕️','🧑‍✈️','🧑‍🌾','🧑‍🔧','🧑‍🏭','🐱','🐶','🦊','🐼','🦁','🐸','🐲','🦄','🐺','🐻'];

interface GamePlayer {
  id: string;
  name: string;
  avatar: string;
  type: 'learner' | 'actor';
  // Learner fields
  country?: string;
  cefrLevel?: Cefr;
  age?: AgeGroup;
  interests?: string;
  strengths?: string;
  weaknesses?: string;
  facts?: string; // teacher notes
  // Actor fields
  personality?: string;
  dialogueLines?: string[]; // custom lines AI generates
  luckRate?: number; // 1-10
  backstory?: string;
}

const PLAYERS_STORAGE_KEY = 'wwtbam_players_v2';

const defaultPlayer = (type: 'learner' | 'actor'): GamePlayer => ({
  id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  name: type === 'learner' ? 'New Student' : 'New Actor',
  avatar: AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)],
  type,
  country: 'United States',
  cefrLevel: 'B1',
  age: 'adult',
  interests: '',
  strengths: '',
  weaknesses: '',
  facts: '',
  personality: type === 'actor' ? 'Friendly and encouraging' : '',
  dialogueLines: [],
  luckRate: type === 'actor' ? 5 : undefined,
  backstory: '',
});

// ─── Prompt Generator ─────────────────────────────────────────────────────

/**
 * Menu-screen prompt. This used to be a second, weaker prompt builder — the
 * menu and the setup page handed out different (and drifting) instructions.
 * It now delegates to the shared Tutorly builder, so the "Copy AI Prompt"
 * button in the show menu and the one on the setup page are byte-identical:
 * same schema, same quality bar and the same hard, unguessable questions.
 */
const toShellPlayer = (p: GamePlayer): ShellPlayer => ({
  name: p.name,
  emoji: p.avatar,
  color: '#f5c518',
  facts: [
    p.type === 'learner' ? `${p.cefrLevel || 'B1'} learner, ${p.age || 'adult'}` : '',
    p.interests ? `interests: ${p.interests}` : '',
    p.strengths ? `strengths: ${p.strengths}` : '',
    p.weaknesses ? `weaknesses: ${p.weaknesses}` : '',
    p.facts ? `teacher notes: ${p.facts}` : '',
  ]
    .filter(Boolean)
    .join(' · '),
  from: p.country || '',
  isNPC: p.type === 'actor',
  npcLines: p.type === 'actor'
    ? [p.personality, p.backstory, p.dialogueLines?.join(' | ')].filter(Boolean).join(' · ')
    : '',
});

const generatePrompt = (players: GamePlayer[], questionCount: number, topic: string, cefrOverride?: Cefr): string => {
  const learners = players.filter(p => p.type === 'learner');
  const level = cefrOverride || learners[0]?.cefrLevel || 'B1';
  return buildMenuPrompt(players.map(toShellPlayer), questionCount, topic, level);
};

// ─── Player Management Modal ──────────────────────────────────────────────

const PlayerEditorModal: React.FC<{
  players: GamePlayer[];
  onChange: (players: GamePlayer[]) => void;
  onClose: () => void;
  questionCount: number;
}> = ({ players, onChange, onClose, questionCount }) => {
  const [list, setList] = useState<GamePlayer[]>(players);
  const [editId, setEditId] = useState<string | null>(null);
  const [tab, setTab] = useState<'learners' | 'actors' | 'prompt'>('learners');
  const [promptTopic, setPromptTopic] = useState('');
  const [promptCefr, setPromptCefr] = useState<Cefr>('B1');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const addPlayer = (type: 'learner' | 'actor') => {
    const p = defaultPlayer(type);
    const next = [...list, p];
    setList(next);
    setEditId(p.id);
  };

  const updatePlayer = (id: string, patch: Partial<GamePlayer>) => {
    setList(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const removePlayer = (id: string) => {
    setList(prev => prev.filter(p => p.id !== id));
    if (editId === id) setEditId(null);
  };

  const save = () => { onChange(list); onClose(); };

  const doGenerate = () => {
    const p = generatePrompt(list, questionCount, promptTopic, promptCefr);
    setGeneratedPrompt(p);
  };

  const doCopy = () => {
    navigator.clipboard.writeText(generatedPrompt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };

  const editing = list.find(p => p.id === editId);
  const learners = list.filter(p => p.type === 'learner');
  const actors = list.filter(p => p.type === 'actor');

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '10px', border: '2px solid rgba(245,197,24,0.25)', fontSize: '0.9rem', fontWeight: 600, background: 'var(--bg-card)', color: 'var(--text-primary)' };
  const labelStyle: React.CSSProperties = { display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-secondary)' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card animate-bounceIn" style={{ borderRadius: '2rem', padding: '1.5rem', maxWidth: '900px', width: '100%', margin: '0 1rem', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>👥 Players & Actors</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Add learners, create actors, then generate your AI prompt</p>
          </div>
          <button onClick={onClose} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexShrink: 0 }}>
          {([
            { key: 'learners' as const, label: `👩‍🎓 Learners (${learners.length})`, color: '#6c63ff' },
            { key: 'actors' as const, label: `🎭 Actors (${actors.length})`, color: '#f5c518' },
            { key: 'prompt' as const, label: '📋 Generate Prompt', color: '#00b894' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 20px', borderRadius: '50px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                border: `2px solid ${tab === t.key ? t.color : 'rgba(0,0,0,0.1)'}`,
                background: tab === t.key ? `${t.color}15` : 'transparent',
                color: tab === t.key ? t.color : 'var(--text-secondary)',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

          {/* ── LEARNERS / ACTORS TAB ── */}
          {(tab === 'learners' || tab === 'actors') && (
            <div>
              {/* Player Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                {(tab === 'learners' ? learners : actors).map(p => (
                  <div
                    key={p.id}
                    onClick={() => setEditId(p.id)}
                    style={{
                      padding: '1rem', borderRadius: '1rem', cursor: 'pointer',
                      background: editId === p.id ? 'rgba(245,197,24,0.1)' : 'rgba(0,0,0,0.03)',
                      border: `2px solid ${editId === p.id ? 'var(--gold)' : 'rgba(0,0,0,0.06)'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '2rem' }}>{p.avatar}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {p.type === 'learner' ? `${p.cefrLevel} • ${p.country}` : `Luck: ${p.luckRate}/10`}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); removePlayer(p.id); }} style={{ fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer', color: '#e17055', padding: '4px' }}>🗑️</button>
                    </div>
                    {p.interests && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎯 {p.interests}</div>}
                  </div>
                ))}
                {/* Add button */}
                <button
                  onClick={() => addPlayer(tab === 'learners' ? 'learner' : 'actor')}
                  style={{
                    padding: '1rem', borderRadius: '1rem', cursor: 'pointer',
                    border: '2px dashed rgba(245,197,24,0.4)',
                    background: 'rgba(245,197,24,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontWeight: 800, fontSize: '1rem', color: 'var(--gold-dark)', minHeight: '80px',
                  }}
                >
                  + Add {tab === 'learners' ? 'Learner' : 'Actor'}
                </button>
              </div>

              {/* Edit panel */}
              {editing && (
                <div style={{ padding: '1.25rem', borderRadius: '1.25rem', background: 'rgba(245,197,24,0.04)', border: '1px solid rgba(245,197,24,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>{editing.avatar}</span>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Edit: {editing.name}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {AVATAR_POOL.map(a => (
                          <button
                            key={a}
                            onClick={() => updatePlayer(editing.id, { avatar: a })}
                            style={{ fontSize: '1.3rem', padding: '2px 4px', borderRadius: '8px', border: editing.avatar === a ? '2px solid var(--gold)' : '1px solid transparent', background: editing.avatar === a ? 'rgba(245,197,24,0.15)' : 'transparent', cursor: 'pointer' }}
                          >{a}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid-2" style={{ gap: '0.75rem' }}>
                    <div>
                      <label style={labelStyle}>Name</label>
                      <input style={inputStyle} value={editing.name} onChange={e => updatePlayer(editing.id, { name: e.target.value })} />
                    </div>
                    {editing.type === 'learner' && (
                      <>
                        <div>
                          <label style={labelStyle}>Country</label>
                          <select className="styled-select" style={{ width: '100%' }} value={editing.country || ''} onChange={e => updatePlayer(editing.id, { country: e.target.value })}>
                            {Object.keys(COUNTRY_PRESETS).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>CEFR Level</label>
                          <select className="styled-select" style={{ width: '100%' }} value={editing.cefrLevel || 'B1'} onChange={e => updatePlayer(editing.id, { cefrLevel: e.target.value as Cefr })}>
                            {(['A1','A2','B1','B2','C1','C2'] as Cefr[]).map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Age Group</label>
                          <select className="styled-select" style={{ width: '100%' }} value={editing.age || 'adult'} onChange={e => updatePlayer(editing.id, { age: e.target.value as AgeGroup })}>
                            <option value="child">Child</option><option value="teen">Teen</option><option value="adult">Adult</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Interests (hobbies, topics they love)</label>
                          <input style={inputStyle} value={editing.interests || ''} onChange={e => updatePlayer(editing.id, { interests: e.target.value })} placeholder="e.g. football, anime, cooking, K-pop..." />
                        </div>
                        <div>
                          <label style={labelStyle}>Strengths</label>
                          <input style={inputStyle} value={editing.strengths || ''} onChange={e => updatePlayer(editing.id, { strengths: e.target.value })} placeholder="e.g. good at vocabulary, fast reader..." />
                        </div>
                        <div>
                          <label style={labelStyle}>Weaknesses</label>
                          <input style={inputStyle} value={editing.weaknesses || ''} onChange={e => updatePlayer(editing.id, { weaknesses: e.target.value })} placeholder="e.g. struggles with conditionals..." />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Teacher Notes / Fun Facts</label>
                          <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={editing.facts || ''} onChange={e => updatePlayer(editing.id, { facts: e.target.value })} placeholder="Anything extra: their pet's name, dream job, funny habit..." />
                        </div>
                      </>
                    )}
                    {editing.type === 'actor' && (
                      <>
                        <div>
                          <label style={labelStyle}>Luck Rate (1-10)</label>
                          <input type="number" min={1} max={10} style={inputStyle} value={editing.luckRate ?? 5} onChange={e => updatePlayer(editing.id, { luckRate: Math.max(1, Math.min(10, Number(e.target.value))) })} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Personality</label>
                          <input style={inputStyle} value={editing.personality || ''} onChange={e => updatePlayer(editing.id, { personality: e.target.value })} placeholder="e.g. Sarcastic comedian, Strict professor, Encouraging grandma..." />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Backstory</label>
                          <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={editing.backstory || ''} onChange={e => updatePlayer(editing.id, { backstory: e.target.value })} placeholder="Who is this character? What's their story?" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Custom Dialogue Lines (one per line)</label>
                          <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={editing.dialogueLines?.join('\n') || ''} onChange={e => updatePlayer(editing.id, { dialogueLines: e.target.value.split('\n').filter(Boolean) })} placeholder={"You can do it!\nThat was a tricky one!\nDon't give up now!"} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROMPT TAB ── */}
          {tab === 'prompt' && (
            <div>
              <div style={{ padding: '1rem', borderRadius: '1rem', background: 'rgba(0,184,148,0.05)', border: '1px solid rgba(0,184,148,0.2)', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  📋 This generates a detailed prompt you paste into ChatGPT/Claude/Gemini. The AI returns a JSON array you then paste back into <strong>"Paste My JSON"</strong>.
                </p>
                <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Lesson Topic</label>
                    <input style={inputStyle} value={promptTopic} onChange={e => setPromptTopic(e.target.value)} placeholder="e.g. Travel vocabulary, Conditionals, Science terms..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Target CEFR Level</label>
                    <select className="styled-select" style={{ width: '100%' }} value={promptCefr} onChange={e => setPromptCefr(e.target.value as Cefr)}>
                      {(['A1','A2','B1','B2','C1','C2'] as Cefr[]).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Players: {learners.length} learner{learners.length !== 1 ? 's' : ''}, {actors.length} actor{actors.length !== 1 ? 's' : ''} • {questionCount} questions
                  </span>
                </div>
                <button
                  onClick={doGenerate}
                  disabled={list.length === 0}
                  style={{ padding: '12px 28px', borderRadius: '50px', border: 'none', cursor: list.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '1rem', background: list.length === 0 ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #00b894, #00cec9)', color: list.length === 0 ? 'var(--text-secondary)' : 'white', boxShadow: list.length > 0 ? '0 4px 15px rgba(0,184,148,0.4)' : 'none' }}
                >📋 Generate AI Prompt</button>
              </div>

              {generatedPrompt && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Generated Prompt ({generatedPrompt.length} chars)</span>
                    <button
                      onClick={doCopy}
                      style={{ padding: '8px 20px', borderRadius: '50px', border: '2px solid var(--gold)', background: copied ? 'rgba(0,184,148,0.15)' : 'rgba(245,197,24,0.1)', color: copied ? '#00b894' : 'var(--gold-dark)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                    >{copied ? '✅ Copied!' : '📋 Copy Prompt'}</button>
                  </div>
                  <textarea
                    readOnly
                    value={generatedPrompt}
                    style={{ width: '100%', minHeight: '300px', padding: '1rem', borderRadius: '12px', border: '2px solid rgba(245,197,24,0.25)', fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--bg-card)', color: 'var(--text-primary)', resize: 'vertical' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexShrink: 0 }}>
          <button onClick={save} style={{ flex: 1, padding: '14px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg, #f5c518, #c9a227)', color: '#1a1200', boxShadow: '0 4px 15px rgba(245,197,24,0.4)' }}>
            💾 Save Players ({list.length})
          </button>
          <button onClick={onClose} style={{ padding: '14px 24px', borderRadius: '50px', border: '2px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_LEARNER: LearnerProfile = {
  name: 'Student',
  country: 'United States',
  currency: 'USD',
  currencySymbol: '$',
  exchangeRate: 1,
  cefrLevel: 'B1',
  age: 'adult',
};

const COUNTRY_PRESETS: Record<string, { currency: string; currencySymbol: string }> = {
  'United States': { currency: 'USD', currencySymbol: '$' },
  'United Kingdom': { currency: 'GBP', currencySymbol: '£' },
  'European Union': { currency: 'EUR', currencySymbol: '€' },
  'Japan': { currency: 'JPY', currencySymbol: '¥' },
  'China': { currency: 'CNY', currencySymbol: '¥' },
  'South Korea': { currency: 'KRW', currencySymbol: '₩' },
  'India': { currency: 'INR', currencySymbol: '₹' },
  'Brazil': { currency: 'BRL', currencySymbol: 'R$' },
  'Mexico': { currency: 'MXN', currencySymbol: 'MX$' },
  'Canada': { currency: 'CAD', currencySymbol: 'CA$' },
  'Australia': { currency: 'AUD', currencySymbol: 'A$' },
  'Russia': { currency: 'RUB', currencySymbol: '₽' },
  'Turkey': { currency: 'TRY', currencySymbol: '₺' },
  'Saudi Arabia': { currency: 'SAR', currencySymbol: 'SR' },
  'UAE': { currency: 'AED', currencySymbol: 'AED' },
  'Thailand': { currency: 'THB', currencySymbol: '฿' },
  'Vietnam': { currency: 'VND', currencySymbol: '₫' },
  'Indonesia': { currency: 'IDR', currencySymbol: 'Rp' },
  'Philippines': { currency: 'PHP', currencySymbol: '₱' },
  'Malaysia': { currency: 'MYR', currencySymbol: 'RM' },
  'Singapore': { currency: 'SGD', currencySymbol: 'S$' },
  'Egypt': { currency: 'EGP', currencySymbol: 'E£' },
  'South Africa': { currency: 'ZAR', currencySymbol: 'R' },
  'Nigeria': { currency: 'NGN', currencySymbol: '₦' },
  'Pakistan': { currency: 'PKR', currencySymbol: 'Rs' },
  'Bangladesh': { currency: 'BDT', currencySymbol: '৳' },
  'Argentina': { currency: 'ARS', currencySymbol: 'AR$' },
  'Colombia': { currency: 'COP', currencySymbol: 'COL$' },
  'Poland': { currency: 'PLN', currencySymbol: 'zł' },
  'Ukraine': { currency: 'UAH', currencySymbol: '₴' },
  'Israel': { currency: 'ILS', currencySymbol: '₪' },
  'Switzerland': { currency: 'CHF', currencySymbol: 'CHF' },
  'Sweden': { currency: 'SEK', currencySymbol: 'kr' },
  'Norway': { currency: 'NOK', currencySymbol: 'kr' },
  'Denmark': { currency: 'DKK', currencySymbol: 'kr' },
  'Czech Republic': { currency: 'CZK', currencySymbol: 'Kč' },
  'Romania': { currency: 'RON', currencySymbol: 'lei' },
  'Hungary': { currency: 'HUF', currencySymbol: 'Ft' },
};

type PurchaseCategory = 'food' | 'tech' | 'travel' | 'vehicle' | 'house' | 'luxury' | 'education' | 'experience';
interface PurchaseItem {
  name: string;
  emoji: string;
  minPrice: number;
  maxPrice: number;
  category: PurchaseCategory;
  childFriendly?: boolean;
}

const PURCHASE_ITEMS: PurchaseItem[] = [
  { name: 'fancy dinner for two', emoji: '🍽️', minPrice: 100, maxPrice: 300, category: 'food', childFriendly: true },
  { name: 'new smartphone', emoji: '📱', minPrice: 300, maxPrice: 1200, category: 'tech', childFriendly: true },
  { name: 'gaming console', emoji: '🎮', minPrice: 400, maxPrice: 600, category: 'tech', childFriendly: true },
  { name: 'designer sneakers', emoji: '👟', minPrice: 150, maxPrice: 500, category: 'luxury', childFriendly: true },
  { name: 'weekend getaway', emoji: '🏨', minPrice: 300, maxPrice: 800, category: 'travel', childFriendly: true },
  { name: 'high-end headphones', emoji: '🎧', minPrice: 200, maxPrice: 500, category: 'tech', childFriendly: true },
  { name: 'online course', emoji: '📚', minPrice: 100, maxPrice: 500, category: 'education', childFriendly: true },
  { name: 'concert tickets', emoji: '🎵', minPrice: 100, maxPrice: 500, category: 'experience', childFriendly: true },

  { name: 'laptop', emoji: '💻', minPrice: 800, maxPrice: 3000, category: 'tech', childFriendly: true },
  { name: 'vacation to Europe', emoji: '✈️', minPrice: 2000, maxPrice: 8000, category: 'travel', childFriendly: true },
  { name: 'used motorcycle', emoji: '🏍️', minPrice: 3000, maxPrice: 8000, category: 'vehicle' },
  { name: 'home theater system', emoji: '🎬', minPrice: 2000, maxPrice: 10000, category: 'tech', childFriendly: true },
  { name: 'semester of university', emoji: '🎓', minPrice: 5000, maxPrice: 20000, category: 'education' },

  { name: 'brand new car', emoji: '🚗', minPrice: 25000, maxPrice: 60000, category: 'vehicle', childFriendly: true },
  { name: 'down payment on a house', emoji: '🏠', minPrice: 30000, maxPrice: 100000, category: 'house', childFriendly: true },
  { name: 'small business startup', emoji: '🏪', minPrice: 20000, maxPrice: 100000, category: 'experience' },

  { name: 'luxury apartment', emoji: '🏢', minPrice: 200000, maxPrice: 800000, category: 'house', childFriendly: true },
  { name: 'Ferrari', emoji: '🏎️', minPrice: 250000, maxPrice: 500000, category: 'vehicle', childFriendly: true },
  { name: 'beach house', emoji: '🏖️', minPrice: 300000, maxPrice: 1000000, category: 'house', childFriendly: true },

  { name: 'mansion', emoji: '🏰', minPrice: 1000000, maxPrice: 10000000, category: 'house', childFriendly: true },
  { name: 'private jet', emoji: '✈️', minPrice: 3000000, maxPrice: 50000000, category: 'luxury' },
  { name: 'charitable foundation', emoji: '❤️', minPrice: 1000000, maxPrice: 100000000, category: 'experience', childFriendly: true },
];

const MONEY_IMAGES = [
  'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&q=80',
  'https://images.unsplash.com/photo-1621981386829-9b458a2cddde?w=1200&q=80',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&q=80',
  'https://images.unsplash.com/photo-1565373679580-c0de6dd1e3da?w=1200&q=80',
];

const getRandomMoneyImage = () => MONEY_IMAGES[Math.floor(Math.random() * MONEY_IMAGES.length)];

const formatLocalAmount = (amount: number, learner: LearnerProfile): string => {
  const local = amount * learner.exchangeRate;
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(local);
  return `${learner.currencySymbol}${formatted}`;
};

const getPrizeMessage = (prizeUSD: number, learner: LearnerProfile): string => {
  const localAmountStr = formatLocalAmount(prizeUSD, learner);
  const suitableItems = PURCHASE_ITEMS.filter(item => {
    const affordable = prizeUSD >= item.minPrice && prizeUSD <= item.maxPrice * 2;
    const ageOk = learner.age === 'child' ? !!item.childFriendly : true;
    return affordable && ageOk;
  });
  const selected = suitableItems.sort(() => Math.random() - 0.5).slice(0, 2);

  const templates = [
    `${learner.name}, that's ${localAmountStr} in ${learner.country}!`,
    `In ${learner.country}, ${localAmountStr} could change your life, ${learner.name}.`,
    `${learner.name}, with ${localAmountStr} you could do something amazing.`,
    `${localAmountStr} in ${learner.country}... imagine the possibilities, ${learner.name}.`,
  ];

  let message = templates[Math.floor(Math.random() * templates.length)];
  if (selected.length > 0) {
    const items = selected.map(i => `${i.emoji} ${i.name}`);
    message += items.length === 1
      ? ` You could buy ${items[0]}.`
      : ` You could buy ${items[0]} or ${items[1]}.`;
  }
  return message;
};

// ─────────────────────────────────────────────────────────────────────────────
// Audio settings (editable URLs)
// ─────────────────────────────────────────────────────────────────────────────

type AudioKey =
  | 'background'
  | 'finalAnswer'
  | 'win'
  | 'lose'
  | 'letsPlay'
  | 'swoosh'
  | 'phoneRing'
  | 'crowdMurmur'
  | 'cashRegister'
  | 'victory'
  | 'heartbeat';

type AudioUrls = Record<AudioKey, string>;

const DEFAULT_AUDIO_URLS: AudioUrls = {
  // NOTE: You can paste your own working WWTBAM sounds here via settings.
  // Anything left as 'synth:' (or blank) is generated live with the Web Audio
  // API, so no CDN file can ever 403 and the show still works offline.
  background: 'https://cdn.pixabay.com/download/audio/2025/02/19/audio_80846e10c4.mp3?filename=delosound-suspense-tension-background-music-302978.mp3',
  finalAnswer: 'https://cdn.pixabay.com/download/audio/2025/05/10/audio_a314b7e1fa.mp3?filename=raydellrios-suspense-gamevideo-track-339286.mp3',
  // These Pixabay download links rot over time (several already answer 403),
  // so every short sting is the built-in synth by default: instant, offline and
  // impossible to 404. Paste your own MP3/OGG in ⚙️ Audio settings to override.
  win: SYNTH_URL,
  lose: SYNTH_URL,
  letsPlay: SYNTH_URL,
  swoosh: SYNTH_URL,
  phoneRing: SYNTH_URL,
  crowdMurmur: SYNTH_URL,
  cashRegister: SYNTH_URL,
  victory: SYNTH_URL,
  heartbeat: SYNTH_URL,
};

/** "synth:" / blank in an audio field means: render it with the built-in synth. */
const isBuiltInSound = (key: AudioKey, urls: AudioUrls): boolean =>
  isSynthUrl(urls[key]);

const AUDIO_STORAGE_KEY = 'wwtbam_audio_urls_v1';
const AUDIO_MUTED_KEY = 'wwtbam_muted_v1';
const AUDIO_VOLUME_KEY = 'wwtbam_volume_v1';
const LEARNER_STORAGE_KEY = 'wwtbam_learner_v1';

// Simple audio engine (no extra files)
function createAudio(url: string): HTMLAudioElement {
  const a = new Audio();
  a.preload = 'auto';
  a.src = url;
  a.crossOrigin = 'anonymous';
  return a;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

/** 'splash' + 'setup' are the shared Tutorly start (same screens in every game). */
type GamePhase = 'splash' | 'setup' | 'menu' | 'playing' | 'final-answer' | 'suspense-reveal' | 'result' | 'gameover';
type LifelineType = 'fifty-fifty' | 'phone-friend' | 'ask-audience';
interface LifelineState { used: boolean; }
interface AudiencePoll { [key: number]: number; }
interface PhoneFriendResult { advice: string; suggestedIndices: number[]; }
interface ConfettiPiece { id: number; x: number; color: string; delay: number; duration: number; size: number; rotation: number; }
interface StarParticle { id: number; x: number; y: number; emoji: string; }

const CONFETTI_COLORS = ['#f5c518','#00b894','#6c63ff','#e17055','#0984e3','#fd79a8','#00cec9','#a29bfe','#55efc4'];
const OPTION_LABELS = ['A','B','C','D','E','F','G'];

const getRandomLine = (lines: string[], rep: Record<string, string> = {}): string => {
  let line = lines[Math.floor(Math.random() * lines.length)];
  Object.entries(rep).forEach(([k, v]) => { line = line.replace(`{${k}}`, v); });
  return line;
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const generateAudiencePoll = (question: Question, eliminated: number[]): AudiencePoll => {
  const poll: AudiencePoll = {};
  const active = question.options.map((_o, i) => i).filter(i => !eliminated.includes(i));
  const total = 100;
  const correct = question.correctIndices;
  let used = 0;
  active.forEach(i => {
    const isC = correct.includes(i);
    const base = isC ? Math.floor(total / (correct.length * 1.15)) : Math.floor(total / (active.length * 3.5));
    poll[i] = Math.max(1, base + Math.floor(Math.random() * 12));
    used += poll[i];
  });
  const extra = total - used;
  const correctActive = active.filter(i => correct.includes(i));
  if (correctActive.length > 0) {
    poll[correctActive[Math.floor(Math.random() * correctActive.length)]] += extra;
  }
  return poll;
};

const generatePhoneFriend = (question: Question): PhoneFriendResult => {
  const correct = question.correctIndices;
  const allOpts = question.options.map((_o, i) => i);
  const wrong = allOpts.filter(i => !correct.includes(i));
  const confident = Math.random() < 0.8;
  let suggested: number[];
  if (confident) {
    suggested = [...correct];
    if (Math.random() < 0.1 && wrong.length > 0) suggested.push(wrong[Math.floor(Math.random() * wrong.length)]);
  } else {
    suggested = shuffle([...correct, ...wrong]).slice(0, correct.length + (Math.random() < 0.5 ? 1 : 0));
  }
  const letters = OPTION_LABELS;
  const sl = suggested.map(i => letters[i]).join(', ');
  const phrases = [
    `Hmm, I'm fairly confident the answer${suggested.length > 1 ? 's are' : ' is'} ${sl}. Good luck!`,
    `I think it's ${sl}. I remember this from our lesson! About 80% sure.`,
    `Ooh tough one! I'd go with ${sl}, but trust your instincts too!`,
    `Definitely ${sl}. We covered this topic, don't overthink it!`,
  ];
  return { advice: phrases[Math.floor(Math.random() * phrases.length)], suggestedIndices: suggested };
};

const speak = (text: string, voice?: SpeechSynthesisVoice | null, rate = 0.95, pitch = 1.05) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = rate;
  u.pitch = pitch;
  u.volume = 1;
  window.speechSynthesis.speak(u);
};

async function fetchExchangeRateUSDTo(currency: string): Promise<number | null> {
  // Public endpoint (no key). If blocked, we fall back to current value.
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data?.result === 'success' && data?.rates && typeof data.rates[currency] === 'number') {
      return data.rates[currency];
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI subcomponents
// ─────────────────────────────────────────────────────────────────────────────

const TimerBar: React.FC<{ timeLeft: number; total: number }> = ({ timeLeft, total }) => {
  const pct = (timeLeft / total) * 100;
  const isDanger = pct <= 20;
  const isWarning = pct <= 40 && !isDanger;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>⏱ Timer</span>
        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: isDanger ? '#e17055' : isWarning ? '#fdcb6e' : 'var(--text-primary)', animation: isDanger ? 'timerWarning 0.5s ease-in-out infinite' : 'none' }}>
          {timeLeft}s
        </span>
      </div>
      <div style={{ height: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className={`progress-bar-fill${isDanger ? ' danger' : isWarning ? ' warning' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const CircularTimer: React.FC<{ timeLeft: number; total: number }> = ({ timeLeft, total }) => {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = timeLeft / total;
  const offset = circ * (1 - pct);
  const isDanger = pct <= 0.2;
  const isWarn = pct <= 0.4 && !isDanger;
  const color = isDanger ? '#e17055' : isWarn ? '#fdcb6e' : '#00b894';
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={r} fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.08)" strokeWidth={9} />
        <circle
          cx={48}
          cy={48}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
        />
        <text x={48} y={48} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={20} fontWeight={900} fontFamily="Montserrat, sans-serif">
          {timeLeft}
        </text>
      </svg>
      {isDanger && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: `0 0 20px ${color}`, animation: 'glowPulse 0.5s ease-in-out infinite', pointerEvents: 'none' }} />}
    </div>
  );
};

const ConfettiRain: React.FC<{ pieces: ConfettiPiece[] }> = ({ pieces }) => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
    {pieces.map(p => (
      <div
        key={p.id}
        className="confetti-piece"
        style={{
          left: `${p.x}%`,
          top: '-20px',
          background: p.color,
          width: p.size,
          height: p.size,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          transform: `rotate(${p.rotation}deg)`,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
        }}
      />
    ))}
  </div>
);

const AudiencePollModal: React.FC<{ poll: AudiencePoll; question: Question; onClose: () => void }> = ({ poll, question, onClose }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 600);
    return () => clearTimeout(t);
  }, []);
  const total = Object.values(poll).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card animate-bounceIn" style={{ borderRadius: '2rem', padding: '2rem', maxWidth: '520px', width: '100%', margin: '0 1rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>👥</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Ask the Audience</h2>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>The studio audience has voted!</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {question.options.map((opt, i) => {
            const votes = poll[i] ?? 0;
            const pct = Math.round((votes / total) * 100);
            const maxPct = Math.max(...Object.values(poll).map(v => Math.round((v / total) * 100)));
            const isTopVoted = pct === maxPct;
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--gold-dark)', width: '24px' }}>{OPTION_LABELS[i]}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt}</span>
                  </div>
                  <span style={{ fontWeight: 900, fontSize: '1rem', color: isTopVoted ? 'var(--gold-dark)' : 'var(--text-secondary)', minWidth: '40px', textAlign: 'right' }}>
                    {show ? `${pct}%` : '...'}
                  </span>
                </div>
                <div style={{ height: '28px', background: 'rgba(0,0,0,0.06)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div
                    style={{
                      height: '100%',
                      width: show ? `${pct}%` : '0%',
                      borderRadius: '8px',
                      background: isTopVoted ? 'linear-gradient(90deg, #f5c518, #c9a227)' : 'linear-gradient(90deg, #6c63ff, #a29bfe)',
                      transition: 'width 1.2s cubic-bezier(0.34,1.56,0.64,1)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'rgba(255,255,255,0.25)', borderRadius: '8px' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} style={{ marginTop: '1.5rem', width: '100%', padding: '14px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg, #f5c518, #c9a227)', color: '#1a1200', boxShadow: '0 4px 15px rgba(245,197,24,0.4)' }}>
          Got it, thanks!
        </button>
      </div>
    </div>
  );
};

const PhoneFriendModal: React.FC<{ result: PhoneFriendResult; question: Question; onClose: () => void }> = ({ result, question, onClose }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1800);
    const t2 = setTimeout(() => setStep(2), 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card animate-bounceIn" style={{ borderRadius: '2rem', padding: '2rem', maxWidth: '500px', width: '100%', margin: '0 1rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem', animation: 'glowPulse 1s ease-in-out infinite' }}>📞</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>Phone a Friend</h2>
        </div>
        <div style={{ minHeight: '140px' }}>
          {step === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem' }}>📲 Dialling your friend...</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '12px', height: '12px', background: 'var(--gold)', borderRadius: '50%', animation: `bounce 1s infinite ${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          {step >= 1 && (
            <div className="animate-fadeInUp">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #a29bfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0, boxShadow: '0 4px 15px rgba(108,99,255,0.4)' }}>
                  👤
                </div>
                <div className="speech-bubble" style={{ flex: 1 }}>
                  {step === 1 ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '8px', height: '8px', background: 'var(--gold)', borderRadius: '50%', animation: `bounce 1s infinite ${i * 0.2}s` }} />
                      ))}
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>thinking...</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>{result.advice}</p>
                  )}
                </div>
              </div>
              {step === 2 && (
                <div className="animate-fadeInUp" style={{ padding: '1rem', borderRadius: '1rem', background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.25)' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Suggested Answer(s)</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {result.suggestedIndices.map(i => (
                      <div key={i} style={{ padding: '6px 14px', borderRadius: '50px', background: 'linear-gradient(135deg, #f5c518, #c9a227)', color: '#1a1200', fontWeight: 800, fontSize: '0.95rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 900 }}>{OPTION_LABELS[i]}:</span>
                        <span>
                          {question.options[i]?.slice(0, 25)}
                          {(question.options[i]?.length ?? 0) > 25 ? '…' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={onClose} disabled={step < 2} style={{ marginTop: '1.5rem', width: '100%', padding: '14px', borderRadius: '50px', border: 'none', cursor: step < 2 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '1.1rem', background: step < 2 ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #f5c518, #c9a227)', color: step < 2 ? 'var(--text-secondary)' : '#1a1200' }}>
          Thank you!
        </button>
      </div>
    </div>
  );
};

/**
 * The prize ladder: EVERY level from Q1 to the jackpot, always completely
 * visible. It used to render 30 rows (~1040px) into an 888px rail and then
 * `scrollIntoView` the current row, which cut off the top levels AND the
 * jackpot. The list now lives in a FitFrame inside the rail, so all 30 levels
 * shrink to whatever height the rail has instead of being clipped.
 */
const PrizeLadder: React.FC<{ currentQ: number; questions: Question[] }> = ({ currentQ, questions }) => {
  const maxQ = questions.length;
  const visiblePrizes = PRIZE_LADDER.slice(0, maxQ);

  return (
    <div className="prize-ladder-root">
      <div className="prize-ladder-head">
        <span style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--gold-dark)' }}>Prize Ladder</span>
      </div>
      <div className="prize-ladder-body">
      <FitFrame min={0.42}>
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '2px' }}>
        {visiblePrizes.map((prize, idx) => {
          const isCurrent = idx === currentQ;
          const isPassed = idx < currentQ;
          const isSafe = SAFE_HAVENS.includes(idx);
          const isNext = idx === currentQ + 1;
          return (
            <div
              key={idx}
              className={isCurrent ? 'prize-current' : ''}
              style={{
                padding: '3px 8px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'nowrap',
                whiteSpace: 'nowrap',
                fontSize: isCurrent ? '0.92rem' : '0.78rem',
                fontWeight: isCurrent ? 900 : isSafe && !isPassed ? 700 : 600,
                background: isCurrent
                  ? 'linear-gradient(90deg, #f5c518, #ffe066, #f5c518)'
                  : isSafe && !isPassed && !isCurrent
                    ? 'rgba(0,184,148,0.08)'
                    : 'transparent',
                backgroundSize: isCurrent ? '200% auto' : undefined,
                animation: isCurrent ? 'shimmer 2s linear infinite' : undefined,
                color: isCurrent
                  ? '#1a1200'
                  : isPassed
                    ? 'rgba(0,0,0,0.25)'
                    : isSafe
                      ? '#00b894'
                      : isNext
                        ? 'var(--gold-dark)'
                        : 'var(--text-secondary)',
                transform: isCurrent ? 'scale(1.06) translateX(-2px)' : 'none',
                boxShadow: isCurrent
                  ? '0 4px 20px rgba(245,197,24,0.5)'
                  : isSafe && !isPassed
                    ? '0 0 0 1px rgba(0,184,148,0.3)'
                    : 'none',
                textDecoration: isPassed ? 'line-through' : 'none',
                opacity: isPassed ? 0.5 : 1,
                transition: 'all 0.4s ease',
              }}
            >
              <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>Q{idx + 1}</span>
              <span>{formatPrize(prize)}</span>
              {isSafe && !isPassed && <span title="Safe Haven" style={{ fontSize: '0.8rem' }}>🛡️</span>}
              {isCurrent && <span>◀</span>}
            </div>
          );
        })}
      </div>
      </FitFrame>
      </div>
    </div>
  );
};

const JsonEditorModal: React.FC<{ onLoad: (q: Question[]) => void; onClose: () => void }> = ({ onLoad, onClose }) => {
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const template = JSON.stringify([
    {
      id: 1,
      text: 'Your question here?',
      type: 'A',
      category: 'vocabulary',
      difficulty: 'easy',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndices: [0],
      explanation: 'Explanation shown after answering.',
      listeningText: '(optional) Text read aloud for listening questions.',
    },
  ], null, 2);

  const handleLoad = () => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) throw new Error('Root element must be a JSON array [ ]');
      if (parsed.length === 0) throw new Error('Array is empty');
      onLoad(parsed as Question[]);
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card animate-bounceIn" style={{ borderRadius: '2rem', padding: '2rem', maxWidth: '700px', width: '100%', margin: '0 1rem', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--text-primary)' }}>📋 Paste JSON Questions</h2>
          <button onClick={onClose} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {(['A', 'B', 'C'] as const).map(type => (
            <div key={type} style={{ padding: '6px 14px', borderRadius: '50px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', fontSize: '0.8rem', fontWeight: 700, color: '#6c63ff' }}>
              Type {type}: {TYPE_LABELS[type]}
            </div>
          ))}
          <button onClick={() => setJson(template)} style={{ padding: '6px 14px', borderRadius: '50px', background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold-dark)', cursor: 'pointer' }}>
            📄 Load Template
          </button>
        </div>
        <textarea className="json-textarea" value={json} onChange={e => { setJson(e.target.value); setError(''); }} placeholder={template} style={{ flex: 1, minHeight: '280px', resize: 'vertical' }} />
        {error && (
          <div style={{ marginTop: '0.75rem', padding: '10px 16px', borderRadius: '10px', background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030', fontWeight: 700, fontSize: '0.9rem' }}>
            ❌ {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button onClick={handleLoad} style={{ flex: 1, padding: '14px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg, #f5c518, #c9a227)', color: '#1a1200', boxShadow: '0 4px 15px rgba(245,197,24,0.4)' }}>
            ✅ Load Questions
          </button>
          <button onClick={onClose} style={{ padding: '14px 24px', borderRadius: '50px', border: '2px solid rgba(225,112,85,0.3)', background: 'rgba(225,112,85,0.05)', color: '#e17055', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionPreviewModal: React.FC<{
  questions: Question[];
  onEdit: (q: Question[]) => void;
  onStart: () => void;
  onClose: () => void;
}> = ({ questions, onEdit, onStart, onClose }) => {
  const [qs, setQs] = useState<Question[]>(questions);

  const moveUp = (i: number) => {
    if (i === 0) return;
    const n = [...qs];
    [n[i], n[i - 1]] = [n[i - 1], n[i]];
    setQs(n);
    onEdit(n);
  };

  const moveDown = (i: number) => {
    if (i === qs.length - 1) return;
    const n = [...qs];
    [n[i], n[i + 1]] = [n[i + 1], n[i]];
    setQs(n);
    onEdit(n);
  };

  const remove = (i: number) => {
    const n = qs.filter((_q, j) => j !== i);
    setQs(n);
    onEdit(n);
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card animate-bounceIn" style={{ borderRadius: '2rem', padding: '1.5rem', maxWidth: '750px', width: '100%', margin: '0 1rem', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>👁️ Preview & Edit ({qs.length} Questions)</h2>
          <button onClick={onClose} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            ✕
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {qs.map((q, i) => (
            <div key={`${q.id}-${i}`} style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '0.75rem', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--gold-dark)' }}>Q{i + 1}</span>
                <span style={{ padding: '2px 10px', borderRadius: '50px', background: 'rgba(108,99,255,0.1)', color: '#6c63ff', fontSize: '0.75rem', fontWeight: 700 }}>Type {q.type}</span>
                <span style={{ padding: '2px 10px', borderRadius: '50px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700 }}>{formatPrize(PRIZE_LADDER[i] ?? 0)}</span>
              </div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '8px', lineHeight: 1.5 }}>{q.text}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {q.options.map((opt, oi) => (
                  <span
                    key={oi}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '50px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: q.correctIndices.includes(oi) ? 'rgba(0,184,148,0.12)' : 'rgba(0,0,0,0.04)',
                      color: q.correctIndices.includes(oi) ? '#00b894' : 'var(--text-secondary)',
                      border: q.correctIndices.includes(oi) ? '1px solid rgba(0,184,148,0.4)' : '1px solid transparent',
                    }}
                  >
                    {OPTION_LABELS[oi]}: {opt} {q.correctIndices.includes(oi) ? '✓' : ''}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => moveUp(i)} style={{ padding: '4px 10px', borderRadius: '8px', border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: '0.9rem' }} title="Move up">
                  ⬆️
                </button>
                <button onClick={() => moveDown(i)} style={{ padding: '4px 10px', borderRadius: '8px', border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: '0.9rem' }} title="Move down">
                  ⬇️
                </button>
                <button onClick={() => remove(i)} style={{ padding: '4px 10px', borderRadius: '8px', border: 'none', background: 'rgba(225,112,85,0.08)', cursor: 'pointer', fontSize: '0.9rem', color: '#e17055' }} title="Delete">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexShrink: 0 }}>
          <button
            onClick={onStart}
            disabled={qs.length === 0}
            style={{ flex: 1, padding: '14px', borderRadius: '50px', border: 'none', cursor: qs.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '1.1rem', background: qs.length === 0 ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #f5c518, #c9a227)', color: qs.length === 0 ? 'var(--text-secondary)' : '#1a1200' }}
          >
            🎮 Start Game ({qs.length} Questions)
          </button>
          <button onClick={onClose} style={{ padding: '14px 24px', borderRadius: '50px', border: '2px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

const WalkAwayModal: React.FC<{ prize: number; onConfirm: () => void; onCancel: () => void }> = ({ prize, onConfirm, onCancel }) => (
  <div className="modal-overlay">
    <div className="glass-card animate-bounceIn" style={{ borderRadius: '2rem', padding: '2.5rem', maxWidth: '420px', width: '100%', margin: '0 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚶</div>
      <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Walk Away?</h2>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '1.5rem', fontSize: '1.05rem' }}>Are you sure? You'll leave with your current winnings.</p>
      <div style={{ padding: '1.5rem', borderRadius: '1.5rem', background: 'rgba(245,197,24,0.1)', border: '2px solid rgba(245,197,24,0.3)', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>You Take Home</p>
        <p style={{ fontSize: '3rem', fontWeight: 900 }}>
          <span className="gold-shimmer">{formatPrize(prize)}</span>
        </p>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={onConfirm} className="walkaway-btn" style={{ flex: 1, padding: '14px', fontSize: '1rem' }}>
          Yes, Walk Away
        </button>
        <button onClick={onCancel} style={{ flex: 1, padding: '14px', borderRadius: '50px', border: '2px solid var(--gold)', background: 'transparent', color: 'var(--gold-dark)', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
          Stay
        </button>
      </div>
    </div>
  </div>
);

const AudioSettingsModal: React.FC<{
  urls: AudioUrls;
  onChange: (next: AudioUrls) => void;
  onClose: () => void;
  onTest: (key: AudioKey) => void;
  onSave: () => void;
  onReset: () => void;
  volume: number;
  onVolume: (v: number) => void;
  muted: boolean;
  onToggleMuted: () => void;
}> = ({ urls, onChange, onClose, onTest, onSave, onReset, volume, onVolume, muted, onToggleMuted }) => {
  const entries: { key: AudioKey; label: string; hint: string }[] = [
    { key: 'background', label: 'Background (loop)', hint: 'Plays during questions' },
    { key: 'finalAnswer', label: 'Final Answer suspense', hint: 'Plays after locking answer' },
    { key: 'win', label: 'Win (correct)', hint: 'Plays on correct reveal' },
    { key: 'lose', label: 'Lose (wrong)', hint: 'Plays on wrong reveal' },
    { key: 'letsPlay', label: 'Let\'s Play / Start', hint: 'Plays on game start' },
    { key: 'swoosh', label: '50:50 Swoosh', hint: 'Plays on 50:50' },
    { key: 'phoneRing', label: 'Phone ring', hint: 'Plays on Phone a Friend' },
    { key: 'crowdMurmur', label: 'Audience murmur', hint: 'Plays on Ask Audience' },
    { key: 'cashRegister', label: 'Cash register', hint: 'Extra win SFX on correct' },
    { key: 'victory', label: 'Big victory', hint: 'Extra win SFX on big prizes' },
    { key: 'heartbeat', label: 'Heartbeat', hint: 'Fades in under 10s timer' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card animate-bounceIn" style={{ borderRadius: '2rem', padding: '2rem', maxWidth: '900px', width: '100%', margin: '0 1rem', maxHeight: '92vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--text-primary)' }}>🎵 Audio Settings</h2>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>
              Every sound works out of the box — leave a field empty (or press 🎹 Synth) to use the
              built-in Web Audio synth, or paste a direct MP3/OGG link to use your own file.
            </p>
          </div>
          <button onClick={onClose} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            ✕
          </button>
        </div>

        {/* Master controls — these always work, even mid-show */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.9rem 1rem', borderRadius: '1rem', background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.25)', marginBottom: '1rem' }}>
          <button
            onClick={onToggleMuted}
            className="option-btn"
            style={{ padding: '10px 18px', fontWeight: 900, display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            {muted ? '🔇 Sound is OFF — click to unmute' : '🔊 Sound is ON — click to mute'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '220px' }}>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={e => onVolume(Number(e.target.value) / 100)}
              style={{ flex: 1, accentColor: 'var(--gold)' }}
            />
            <span style={{ fontWeight: 800, color: 'var(--text-secondary)', width: 44, textAlign: 'right' }}>{Math.round(volume * 100)}%</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
          {entries.map(({ key, label, hint }) => (
            <div key={key} className="audio-row">
              <div>
                <div style={{ fontWeight: 900, color: 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {hint}
                  {isBuiltInSound(key, urls) ? ' · 🎹 built-in synth' : ''}
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="styled-input"
                  value={isBuiltInSound(key, urls) ? '' : urls[key]}
                  onChange={e => onChange({ ...urls, [key]: e.target.value })}
                  placeholder="https://.../sound.mp3"
                />
                {isBuiltInSound(key, urls) && (
                  <div
                    style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                      paddingLeft: 16, pointerEvents: 'none', fontWeight: 800,
                      color: 'var(--gold-dark)', fontSize: '0.95rem',
                    }}
                  >
                    🎹 Built-in synth — no file needed
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => onChange({ ...urls, [key]: SYNTH_URL })}
                  className="option-btn"
                  style={{ padding: '10px 12px', fontWeight: 800, display: 'flex', gap: '6px', alignItems: 'center' }}
                  title="Use the built-in synthesised sound"
                >
                  🎹 Synth
                </button>
                <button
                  onClick={() => onTest(key)}
                  className="option-btn"
                  style={{ padding: '10px 14px', fontWeight: 800, justifyContent: 'center', display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  ▶ Test
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onReset} className="walkaway-btn" style={{ background: 'linear-gradient(135deg, #b2bec3, #636e72)' }}>
            Reset Defaults
          </button>
          <button onClick={onSave} className="final-answer-btn" style={{ background: 'linear-gradient(135deg, #f5c518, #c9a227)', color: '#1a1200' }}>
            Save & Use
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // Theme
  const [darkMode, setDarkMode] = useState(false);

  // Audio URLs (editable)
  const [audioUrls, setAudioUrls] = useState<AudioUrls>(() => {
    try {
      const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
      if (!raw) return DEFAULT_AUDIO_URLS;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AUDIO_URLS, ...parsed } as AudioUrls;
    } catch {
      return DEFAULT_AUDIO_URLS;
    }
  });
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showPlayerEditor, setShowPlayerEditor] = useState(false);

  // Players
  const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>(() => {
    try {
      const raw = localStorage.getItem(PLAYERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  // Save players to localStorage
  useEffect(() => {
    try { localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(gamePlayers)); } catch {}
  }, [gamePlayers]);

  // Audio engine refs
  const bgRef = useRef<HTMLAudioElement | null>(null);
  const bgSynthRef = useRef<SynthHandle | null>(null);
  const volumeRef = useRef(0.5);
  const [audioVolume, setAudioVolume] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(AUDIO_VOLUME_KEY);
      const v = raw === null ? 0.5 : Number(raw);
      return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
    } catch {
      return 0.5;
    }
  });
  volumeRef.current = audioVolume;
  const changeVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setAudioVolume(clamped);
    volumeRef.current = clamped;
    setSynthVolume(clamped);
    try {
      localStorage.setItem(AUDIO_VOLUME_KEY, String(clamped));
      if (bgRef.current) bgRef.current.volume = clamped;
    } catch {
      // ignore
    }
  }, []);
  // Sound on/off is remembered, so a muted show stays muted on reload.
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(AUDIO_MUTED_KEY);
      return raw === null ? true : raw !== '1';
    } catch {
      return true;
    }
  });

  const playSfx = useCallback((key: AudioKey) => {
    if (!musicEnabled) return;
    unlockSynth();
    const url = audioUrls[key];
    // Built-in synth: instant, offline, can never fail.
    if (isSynthUrl(url)) {
      playSynth(key as SynthKey, volumeRef.current);
      return;
    }
    try {
      const a = createAudio(url);
      a.volume = volumeRef.current;
      a.muted = !musicEnabled;
      // If the link is dead (403/404), fall back to the synth so it is never silent.
      const fallback = () => playSynth(key as SynthKey, volumeRef.current);
      a.addEventListener('error', fallback, { once: true });
      void a.play().catch(fallback);
    } catch {
      playSynth(key as SynthKey, volumeRef.current);
    }
  }, [audioUrls, musicEnabled]);

  const stopBackground = useCallback(() => {
    if (bgSynthRef.current) {
      try { bgSynthRef.current.stop(); } catch { /* ignore */ }
      bgSynthRef.current = null;
    }
    if (bgRef.current) {
      try {
        bgRef.current.pause();
        bgRef.current.currentTime = 0;
      } catch {
        // ignore
      }
      bgRef.current = null;
    }
  }, []);

  const playBackground = useCallback((url: string, loop = true, volMul = 0.3, synthKey: SynthKey = 'background') => {
    if (!musicEnabled) return;
    unlockSynth();
    stopBackground();
    if (isSynthUrl(url)) {
      bgSynthRef.current = startSynthLoop(synthKey, Math.max(0, Math.min(1, volumeRef.current * volMul)));
      return;
    }
    try {
      const bg = createAudio(url);
      bg.loop = loop;
      bg.volume = Math.max(0, Math.min(1, volumeRef.current * volMul));
      bg.muted = !musicEnabled;
      bgRef.current = bg;
      // Dead link → keep the show going on the synth bed instead of silence.
      bg.addEventListener('error', () => {
        if (bgRef.current !== bg) return;
        bgRef.current = null;
        bgSynthRef.current = startSynthLoop(synthKey, Math.max(0, Math.min(1, volumeRef.current * volMul)));
      }, { once: true });
      void bg.play().catch(() => {
        if (bgRef.current !== bg) return;
        bgRef.current = null;
        bgSynthRef.current = startSynthLoop(synthKey, Math.max(0, Math.min(1, volumeRef.current * volMul)));
      });
    } catch {
      bgSynthRef.current = startSynthLoop(synthKey, Math.max(0, Math.min(1, volumeRef.current * volMul)));
    }
  }, [musicEnabled, stopBackground]);

  const fadeOutBackground = useCallback(async (duration = 700) => {
    const bg = bgRef.current;
    if (!bg) {
      if (bgSynthRef.current) {
        await new Promise(r => setTimeout(r, Math.min(duration, 400)));
        stopBackground();
      }
      return;
    }
    const steps = 18;
    const startVol = bg.volume;
    for (let i = 0; i < steps; i++) {
      await new Promise(r => setTimeout(r, duration / steps));
      try {
        bg.volume = Math.max(0, startVol * (1 - (i + 1) / steps));
      } catch {
        // ignore
      }
    }
    stopBackground();
  }, [stopBackground]);

  // Learner profile
  const [learner, setLearner] = useState<LearnerProfile>(() => {
    try {
      const raw = localStorage.getItem(LEARNER_STORAGE_KEY);
      if (!raw) return DEFAULT_LEARNER;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_LEARNER, ...parsed } as LearnerProfile;
    } catch {
      return DEFAULT_LEARNER;
    }
  });
  const [rateStatus, setRateStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string>('');

  // Save learner changes
  useEffect(() => {
    try {
      localStorage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(learner));
    } catch {
      // ignore
    }
  }, [learner]);

  // Refresh exchange rate when currency changes
  const refreshRate = useCallback(async (currency: string) => {
    setRateStatus('loading');
    const rate = await fetchExchangeRateUSDTo(currency);
    if (rate && Number.isFinite(rate)) {
      setLearner(l => ({ ...l, exchangeRate: rate }));
      setRateStatus('ok');
      setRateUpdatedAt(new Date().toLocaleString());
    } else {
      setRateStatus('error');
    }
  }, []);

  useEffect(() => {
    // refresh on first mount
    void refreshRate(learner.currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Game state
  const [phase, setPhase] = useState<GamePhase>('splash');
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [questionCount, setQuestionCount] = useState(15);

  const [currentQ, setCurrentQ] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [revealedCorrect, setRevealedCorrect] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const [currentPrize, setCurrentPrize] = useState(0);
  const [safeHavenPrize, setSafeHavenPrize] = useState(0);
  const [finalPrize, setFinalPrize] = useState(0);

  const [walkedAway, setWalkedAway] = useState(false);
  const [showWalkAway, setShowWalkAway] = useState(false);

  const [lifelines, setLifelines] = useState<Record<LifelineType, LifelineState>>({
    'fifty-fifty': { used: false },
    'phone-friend': { used: false },
    'ask-audience': { used: false },
  });

  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [audiencePoll, setAudiencePoll] = useState<AudiencePoll | null>(null);
  const [phoneFriendResult, setPhoneFriendResult] = useState<PhoneFriendResult | null>(null);
  const [showAudiencePoll, setShowAudiencePoll] = useState(false);
  const [showPhoneFriend, setShowPhoneFriend] = useState(false);

  // Timer
  const [questionTimer, setQuestionTimer] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // TTS
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [hostSpeech, setHostSpeech] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Visual FX
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [stars, setStars] = useState<StarParticle[]>([]);

  // Modals
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Fullscreen
  const [fullscreen, setFullscreen] = useState(false);

  // Team Mode (kept as before)
  const [teamMode, setTeamMode] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<1 | 2>(1);
  const [teamScores] = useState<[number, number]>([0, 0]);

  // Suspense reveal
  const [finalAnswerStep, setFinalAnswerStep] = useState(false);
  const [suspenseStep, setSuspenseStep] = useState(0);
  const [pendingResult, setPendingResult] = useState<'correct' | 'wrong' | null>(null);
  const [suspenseMessage, setSuspenseMessage] = useState('');
  const [moneyBgImage, setMoneyBgImage] = useState('');
  const suspenseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suspenseSpeechStartedRef = useRef(false);

  const [gameStats, setGameStats] = useState({ correct: 0, wrong: 0, skipped: 0 });

  // Rolling counter
  const [displayPrize, setDisplayPrize] = useState(0);
  const rollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Reveal wash
  const [revealWash, setRevealWash] = useState<'correct' | 'wrong' | null>(null);
  // Bank transfer particles
  const [bankParticles, setBankParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  // Option sweep index during suspense
  const [sweepIdx, setSweepIdx] = useState(-1);
  const sweepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Camera zoom active
  const [cameraZoom, setCameraZoom] = useState(false);
  // Heartbeat audio (real file or synth loop — both expose stop())
  const heartbeatRef = useRef<{ stop: () => void } | null>(null);
  // Cinematic milestones for end-game
  const [milestones, setMilestones] = useState<{ q: number; prize: number }[]>([]);
  const [showCinematic, setShowCinematic] = useState(false);
  const [cinematicIdx, setCinematicIdx] = useState(0);

  const q = questions[currentQ];
  const maxSelect = q ? (q.type === 'A' ? 1 : q.type === 'B' ? 2 : 3) : 1;
  const isSafeHaven = SAFE_HAVENS.includes(currentQ);
  const canRevealFinal = phase === 'suspense-reveal' && suspenseStep >= 2 && !isSpeaking;

  // Load voices
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis?.getVoices() ?? [];
      setVoices(v);
      const pref = v.find(x => x.lang === 'en-US' && /female|samantha|karen|victoria|susan|fiona/i.test(x.name))
        || v.find(x => x.lang === 'en-US')
        || v.find(x => x.lang.startsWith('en'))
        || v[0];
      if (pref) setSelectedVoice(pref);
    };
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  const hostSay = useCallback((text: string, delay = 0) => {
    setHostSpeech(text);
    if (!ttsEnabled || !text) return;

    setTimeout(() => {
      try {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const u = new SpeechSynthesisUtterance(text);
        if (selectedVoice) u.voice = selectedVoice;
        u.rate = 0.95;
        u.pitch = 1.05;
        u.volume = 1;

        u.onstart = () => setIsSpeaking(true);
        u.onend = () => setIsSpeaking(false);
        u.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(u);
      } catch {
        // Fallback to heuristic
        setIsSpeaking(true);
        speak(text, selectedVoice);
        setTimeout(() => setIsSpeaking(false), Math.max(2000, text.length * 65));
      }
    }, delay);
  }, [ttsEnabled, selectedVoice]);

  // Timer loop
  useEffect(() => {
    if (timerRunning && timerEnabled && phase === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimerRunning(false);
            setRevealedCorrect(questions[currentQ]?.correctIndices ?? []);
            setAnswerResult('wrong');
            setPhase('result');
            setShowExplanation(true);
            hostSay("Time's up! Moving to the next question...");
            return 0;
          }
          if (t === 11) hostSay(HOST_LINES.timerWarning[Math.floor(Math.random() * HOST_LINES.timerWarning.length)]);
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerEnabled, phase, currentQ, questions, hostSay]);

  const launchConfetti = (count = 90) => {
    const pieces: ConfettiPiece[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 1.2,
      duration: 2.5 + Math.random() * 2,
      size: 8 + Math.random() * 12,
      rotation: Math.random() * 360,
    }));
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 6000);
  };

  const burstStars = () => {
    const emojis = ['⭐', '✨', '🌟', '💫', '🏆', '🎯', '💎', '🎊'];
    const newStars: StarParticle[] = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 60,
      y: 10 + Math.random() * 60,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }));
    setStars(s => [...s, ...newStars]);
    setTimeout(() => setStars([]), 1500);
  };

  const stopTimer = () => {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Rolling counter animation: smooth count from old -> new
  const animateCounter = useCallback((from: number, to: number) => {
    if (rollingRef.current) clearInterval(rollingRef.current);
    const diff = to - from;
    const steps = 30;
    const stepVal = diff / steps;
    let step = 0;
    setDisplayPrize(from);
    rollingRef.current = setInterval(() => {
      step++;
      if (step >= steps) {
        if (rollingRef.current) clearInterval(rollingRef.current);
        setDisplayPrize(to);
      } else {
        setDisplayPrize(Math.round(from + stepVal * step));
      }
    }, 35);
  }, []);

  // Start heartbeat when timer < 10
  useEffect(() => {
    if (!timerRunning || !timerEnabled || !musicEnabled) return;
    if (timeLeft <= 10 && timeLeft > 0 && phase === 'playing') {
      if (!heartbeatRef.current) {
        const vol = Math.min(0.35, volumeRef.current * 0.7);
        if (isSynthUrl(audioUrls.heartbeat)) {
          const h = startSynthLoop('heartbeat', vol);
          heartbeatRef.current = { stop: () => { try { h.stop(); } catch { /* ignore */ } } };
        } else {
          try {
            const hb = createAudio(audioUrls.heartbeat);
            hb.loop = true;
            hb.volume = vol;
            hb.addEventListener('error', () => {
              const h = startSynthLoop('heartbeat', vol);
              heartbeatRef.current = { stop: () => h.stop() };
            }, { once: true });
            void hb.play().catch(() => {
              const h = startSynthLoop('heartbeat', vol);
              heartbeatRef.current = { stop: () => h.stop() };
            });
            heartbeatRef.current = { stop: () => { try { hb.pause(); hb.src = ''; } catch { /* ignore */ } } };
          } catch { /* ignore */ }
        }
      }
    }
    if (timeLeft > 10 || !timerRunning) {
      if (heartbeatRef.current) {
        try { heartbeatRef.current.stop(); heartbeatRef.current = null; } catch { /* ignore */ }
      }
    }
  }, [timeLeft, timerRunning, timerEnabled, musicEnabled, phase, audioUrls.heartbeat]);

  // Cleanup heartbeat on phase change
  useEffect(() => {
    if (phase !== 'playing' && heartbeatRef.current) {
      try { heartbeatRef.current.stop(); heartbeatRef.current = null; } catch { /* ignore */ }
    }
  }, [phase]);

  // Option sweep during suspense reveal
  const startSweep = useCallback(() => {
    if (sweepRef.current) clearInterval(sweepRef.current);
    const totalOpts = questions[currentQ]?.options.length ?? 4;
    let idx = 0;
    sweepRef.current = setInterval(() => {
      setSweepIdx(idx % totalOpts);
      idx++;
      if (idx >= totalOpts * 2) { // sweep twice
        if (sweepRef.current) clearInterval(sweepRef.current);
        setSweepIdx(-1);
      }
    }, 350);
  }, [questions, currentQ]);

  const stopSweep = useCallback(() => {
    if (sweepRef.current) clearInterval(sweepRef.current);
    setSweepIdx(-1);
  }, []);

  // Bank transfer particles
  const launchBankTransfer = useCallback(() => {
    const particles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: 40 + Math.random() * 20,
      y: 50 + Math.random() * 10,
    }));
    setBankParticles(particles);
    setTimeout(() => setBankParticles([]), 1500);
  }, []);

  // Reveal wash flash
  const flashWash = useCallback((type: 'correct' | 'wrong') => {
    setRevealWash(type);
    setTimeout(() => setRevealWash(null), 1800);
  }, []);

  // Record milestone
  const recordMilestone = useCallback((qIdx: number, prize: number) => {
    setMilestones(prev => [...prev, { q: qIdx, prize }]);
  }, []);

  const startQuestion = (idx: number, allQs: Question[]) => {
    setCurrentQ(idx);
    setSelectedIndices([]);
    setAnswerResult(null);
    setRevealedCorrect([]);
    setEliminatedOptions([]);
    setPhase('playing');
    setFinalAnswerStep(false);
    setShowExplanation(false);

    setTimeLeft(questionTimer);
    if (timerEnabled) setTimeout(() => setTimerRunning(true), 800);

    const qq = allQs[idx];
    const line = getRandomLine(HOST_LINES.questionIntro, { prize: formatPrize(PRIZE_LADDER[idx] ?? 0) });
    hostSay(line, 400);
    if (qq?.type !== 'A') setTimeout(() => hostSay(getRandomLine(HOST_LINES.multiCorrect)), 2500);
    if (SAFE_HAVENS.includes(idx)) setTimeout(() => hostSay(getRandomLine(HOST_LINES.safeHaven, { prize: formatPrize(PRIZE_LADDER[idx] ?? 0) })), 500);
  };

  const startGame = (qs?: Question[], count?: number) => {
    const allQs = (qs ?? questions).slice(0, count ?? questionCount);
    setQuestions(allQs);
    setCurrentQ(0);
    setCurrentPrize(0);
    setSafeHavenPrize(0);
    setFinalPrize(0);
    setWalkedAway(false);
    setPendingResult(null);
    setSuspenseStep(0);
    setLifelines({ 'fifty-fifty': { used: false }, 'phone-friend': { used: false }, 'ask-audience': { used: false } });
    setGameStats({ correct: 0, wrong: 0, skipped: 0 });

    setPhase('playing');

    // IMPORTANT: Start background music immediately in the click gesture chain (avoids autoplay blocking)
    playBackground(audioUrls.background, true, 0.25);
    playSfx('letsPlay');

    setTimeout(() => {
      hostSay(getRandomLine(HOST_LINES.welcome));
      setTimeout(() => startQuestion(0, allQs), 3000);
    }, 150);
  };

  /**
   * What happens when the shared setup page says “Start Game”:
   * the player profiles become the show's learners, the learner profile drives the
   * prize currency, the pasted AI pack becomes the question bank, and the episode
   * goes on air immediately.
   */
  const handleShellStart = useCallback((data: ShellSetupResult) => {
    // 1. the AI question pack (optional — the built-in bank is used without one)
    let pack: ParsedMillionairePack | null = null;
    if (data.json) {
      const parsed = parseMillionairePack(data.json);
      if (parsed.ok) pack = parsed.pack;
    }

    // 2. players → learner profiles (+ NPC rivals as actors)
    const filled = data.players.filter(p => p.name.trim() !== '' || p.isNPC);
    if (filled.length) {
      const mapped: GamePlayer[] = filled.map((p: ShellPlayer, i) => ({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + i,
        name: p.name.trim() || (p.isNPC ? `Rival ${i + 1}` : `Player ${i + 1}`),
        avatar: p.emoji || '🧑‍🎓',
        type: p.isNPC ? 'actor' : 'learner',
        country: p.from,
        cefrLevel: (data.level as Cefr) || 'B1',
        age: 'adult',
        interests: p.facts,
        strengths: '',
        weaknesses: '',
        facts: p.facts,
        personality: p.npcLines || (p.isNPC ? 'Playful rival who loves banter' : ''),
        dialogueLines: [],
        luckRate: p.isNPC ? 6 : undefined,
        backstory: '',
      }));
      setGamePlayers(mapped);
    }

    // 3. the learner profile decides the prize currency and the host's money talk
    const first = filled.find(p => !p.isNPC);
    if (first && first.name.trim()) {
      const raw = first.from || '';
      const country = Object.keys(COUNTRY_PRESETS).find(
        c => raw.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(raw.split(',')[0].trim().toLowerCase())
      );
      const preset = country ? COUNTRY_PRESETS[country] : undefined;
      setLearner(l => ({
        ...l,
        name: first.name.trim(),
        cefrLevel: (data.level as Cefr) || l.cefrLevel,
        ...(country ? { country } : {}),
        ...(preset ? { currency: preset.currency, currencySymbol: preset.currencySymbol } : {}),
      }));
      if (preset) void refreshRate(preset.currency);
    }

    // 4. questions → straight on air
    const list = (pack && pack.questions.length ? pack.questions : DEFAULT_QUESTIONS) as Question[];
    setQuestions(list);
    setQuestionCount(list.length);
    startGame(list, list.length);
  }, [refreshRate, startGame]);

  const toggleOption = (idx: number) => {
    if (answerResult || eliminatedOptions.includes(idx) || finalAnswerStep) return;
    const qq = questions[currentQ];
    if (!qq) return;
    const max = qq.type === 'A' ? 1 : qq.type === 'B' ? 2 : 3;
    setSelectedIndices(prev => {
      if (prev.includes(idx)) return prev.filter(i => i !== idx);
      if (prev.length >= max) {
        if (max === 1) return [idx];
        return [...prev.slice(1), idx];
      }
      return [...prev, idx];
    });
  };

  const handleFinalAnswer = () => {
    const qq = questions[currentQ];
    if (!qq || selectedIndices.length === 0) return;
    const max = qq.type === 'A' ? 1 : qq.type === 'B' ? 2 : 3;
    if (selectedIndices.length < max) {
      hostSay(`Please select all ${max} answer${max > 1 ? 's' : ''} before confirming! You've picked ${selectedIndices.length} so far.`);
      return;
    }
    stopTimer();
    hostSay(getRandomLine(HOST_LINES.finalAnswer));
    setFinalAnswerStep(true);
    setPhase('final-answer');
  };

  const revealFinalAnswer = useCallback(async () => {
    const qq = questions[currentQ];
    if (!qq) return;
    if (!pendingResult) return;

    if (suspenseTimerRef.current) clearTimeout(suspenseTimerRef.current);
    stopSweep();

    await fadeOutBackground(400);

    const isCorrect = pendingResult === 'correct';
    setRevealedCorrect(qq.correctIndices);
    setAnswerResult(pendingResult);
    setShowExplanation(true);
    setPhase('result');
    setSuspenseStep(0);
    setPendingResult(null);
    suspenseSpeechStartedRef.current = false;

    // Camera zoom OUT
    setCameraZoom(false);

    if (isCorrect) {
      const prize = PRIZE_LADDER[currentQ] ?? 0;
      const prevPrize = currentPrize;
      setCurrentPrize(prize);
      if (SAFE_HAVENS.includes(currentQ)) setSafeHavenPrize(prize);
      setGameStats(s => ({ ...s, correct: s.correct + 1 }));

      // Rolling counter animation
      animateCounter(prevPrize, prize);

      // Green glow wash
      flashWash('correct');

      // Bank transfer particles
      launchBankTransfer();

      playSfx('win');
      playSfx('cashRegister');
      if (prize >= 100000) playSfx('victory');

      // Host reaction variant based on tier
      const tier = currentQ < 5 ? 'correctLow' : currentQ < 10 ? 'correctMid' : 'correctHigh';
      const reaction = getHostReaction(tier, learner.name, formatPrize(prize));
      hostSay(reaction || getRandomLine(HOST_LINES.correct, { prize: formatPrize(prize) }), 800);

      launchConfetti(120);
      burstStars();

      // Record milestone at safe havens
      if (SAFE_HAVENS.includes(currentQ)) {
        recordMilestone(currentQ, prize);
      }
    } else {
      const leavePrize = safeHavenPrize;
      setFinalPrize(leavePrize);
      setGameStats(s => ({ ...s, wrong: s.wrong + 1 }));

      // Rolling counter DOWN
      animateCounter(currentPrize, leavePrize);

      // Red danger wash
      flashWash('wrong');

      playSfx('lose');

      const tier = currentQ < 5 ? 'wrongLow' : currentQ < 10 ? 'wrongMid' : 'wrongHigh';
      const reaction = getHostReaction(tier, learner.name, formatPrize(leavePrize));
      hostSay(reaction || getRandomLine(HOST_LINES.wrong, {
        correct: qq.correctIndices.map(i => qq.options[i]).join(' & '),
        prize: formatPrize(leavePrize),
      }), 800);
    }
  }, [questions, currentQ, pendingResult, fadeOutBackground, hostSay, playSfx, safeHavenPrize, currentPrize, learner.name, animateCounter, flashWash, launchBankTransfer, recordMilestone, stopSweep]);

  const confirmAnswer = () => {
    const qq = questions[currentQ];
    if (!qq) return;

    const isCorrect = [...selectedIndices].sort().join(',') === [...qq.correctIndices].sort().join(',');

    // Suspense reveal phase (no immediate answer shown)
    setPendingResult(isCorrect ? 'correct' : 'wrong');
    setSuspenseStep(0);
    suspenseSpeechStartedRef.current = false;
    setPhase('suspense-reveal');

    setSuspenseMessage(getPrizeMessage(PRIZE_LADDER[currentQ] ?? 0, learner));
    setMoneyBgImage(getRandomMoneyImage());

    // Stop background, play final-answer suspense (loop while you wait)
    stopBackground();
    playBackground(audioUrls.finalAnswer, true, 0.6);

    // Camera zoom IN
    setCameraZoom(true);
    // Start option sweep
    startSweep();

    // Move into the "host talking" step
    if (suspenseTimerRef.current) clearTimeout(suspenseTimerRef.current);
    suspenseTimerRef.current = setTimeout(() => {
      setSuspenseStep(1);
      stopSweep(); // stop sweep when host starts talking
    }, 900);
  };

  // Make sure host speaks the personalized message during suspense
  useEffect(() => {
    if (phase === 'suspense-reveal' && suspenseStep === 1 && suspenseMessage) {
      hostSay(suspenseMessage, 250);
    }
  }, [phase, suspenseStep, suspenseMessage, hostSay]);

  // When the host finishes the money talk, allow manual reveal (advance to step 2)
  useEffect(() => {
    if (phase !== 'suspense-reveal') return;
    if (suspenseStep !== 1) return;

    // If TTS is disabled, don't block reveal.
    if (!ttsEnabled) {
      setSuspenseStep(2);
      return;
    }

    if (isSpeaking) suspenseSpeechStartedRef.current = true;
    if (!isSpeaking && suspenseSpeechStartedRef.current) {
      setSuspenseStep(2);
    }
  }, [phase, suspenseStep, isSpeaking, ttsEnabled]);

  // Cleanup suspense timers
  useEffect(() => {
    return () => {
      if (suspenseTimerRef.current) clearTimeout(suspenseTimerRef.current);
    };
  }, []);

  const nextQuestion = () => {
    if (answerResult === 'wrong') {
      setFinalPrize(safeHavenPrize);
      stopBackground();
      setPhase('gameover');
      return;
    }
    const next = currentQ + 1;
    if (next >= questions.length) {
      setFinalPrize(currentPrize);
      launchConfetti(150);
      stopBackground();
      playSfx('victory');
      if (milestones.length > 0) {
        setShowCinematic(true);
        setCinematicIdx(0);
      }
      setPhase('gameover');
      return;
    }

    // resume background
    playBackground(audioUrls.background, true, 0.25);
    startQuestion(next, questions);
  };

  const handleWalkAway = () => {
    stopTimer();
    setShowWalkAway(true);
  };

  const confirmWalkAway = () => {
    setShowWalkAway(false);
    setFinalPrize(currentPrize);
    setWalkedAway(true);
    stopBackground();
    hostSay(getRandomLine(HOST_LINES.walkAway, { prize: formatPrize(currentPrize) }));
    setPhase('gameover');
  };

  // Lifelines
  const useFiftyFifty = () => {
    if (lifelines['fifty-fifty'].used || !!answerResult || finalAnswerStep) return;
    const qq = questions[currentQ];
    if (!qq) return;
    const wrong = qq.options.map((_o, i) => i).filter(i => !qq.correctIndices.includes(i));
    const toElim = shuffle(wrong).slice(0, Math.min(2, wrong.length));
    setEliminatedOptions(toElim);
    setSelectedIndices(prev => prev.filter(i => !toElim.includes(i)));
    setLifelines(l => ({ ...l, 'fifty-fifty': { used: true } }));
    playSfx('swoosh');
    hostSay(getRandomLine(HOST_LINES.fiftyFifty));
  };

  const usePhoneFriend = () => {
    if (lifelines['phone-friend'].used || !!answerResult || finalAnswerStep) return;
    const qq = questions[currentQ];
    if (!qq) return;
    const result = generatePhoneFriend(qq);
    setPhoneFriendResult(result);
    setShowPhoneFriend(true);
    setLifelines(l => ({ ...l, 'phone-friend': { used: true } }));
    playSfx('phoneRing');
    hostSay(getRandomLine(HOST_LINES.phoneAFriend));
    if (ttsEnabled) setTimeout(() => speak(result.advice, selectedVoice, 0.88, 0.92), 4000);
  };

  const useAskAudience = () => {
    if (lifelines['ask-audience'].used || !!answerResult || finalAnswerStep) return;
    const qq = questions[currentQ];
    if (!qq) return;
    const poll = generateAudiencePoll(qq, eliminatedOptions);
    setAudiencePoll(poll);
    setShowAudiencePoll(true);
    setLifelines(l => ({ ...l, 'ask-audience': { used: true } }));
    playSfx('crowdMurmur');
    hostSay(getRandomLine(HOST_LINES.askAudience));
  };

  const playListening = () => {
    const qq = questions[currentQ];
    if (qq?.listeningText) speak(qq.listeningText, selectedVoice, 0.8, 1.0);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key.toLowerCase() === 'm') { setMusicEnabled(p => !p); return; }
      if (phase === 'suspense-reveal') return;

      const qq = questions[currentQ];
      if (!qq) return;

      if ((phase === 'playing' || phase === 'final-answer') && e.key >= '1' && e.key <= '7') {
        const idx = parseInt(e.key) - 1;
        if (idx < qq.options.length && phase === 'playing') toggleOption(idx);
      }
      if (e.key === 'Enter') {
        if (phase === 'playing') handleFinalAnswer();
        else if (phase === 'final-answer') confirmAnswer();
      }
      if (e.key.toLowerCase() === 'w' && phase === 'playing') handleWalkAway();
      if (e.key.toLowerCase() === 'f' && phase === 'playing') useFiftyFifty();
      if (e.key.toLowerCase() === 'p' && phase === 'playing') usePhoneFriend();
      if (e.key.toLowerCase() === 'a' && phase === 'playing') useAskAudience();
      if (e.key.toLowerCase() === 'l' && (qq.category === 'listening')) playListening();
      if (e.key === 'Escape') {
        if (showAudiencePoll) setShowAudiencePoll(false);
        if (showPhoneFriend) setShowPhoneFriend(false);
        if (showWalkAway) setShowWalkAway(false);
        if (showAudioSettings) setShowAudioSettings(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, questions, currentQ, showAudiencePoll, showPhoneFriend, showWalkAway, showAudioSettings]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  // Persist audio URLs
  const saveAudioUrls = () => {
    try {
      localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(audioUrls));
    } catch {
      // ignore
    }
    setShowAudioSettings(false);
  };

  const resetAudioUrls = () => {
    setAudioUrls(DEFAULT_AUDIO_URLS);
    try {
      localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(DEFAULT_AUDIO_URLS));
    } catch {
      // ignore
    }
  };

  const onTestAudio = (key: AudioKey) => {
    if (key === 'background') {
      playBackground(audioUrls.background, true, 0.35);
      setTimeout(() => stopBackground(), 2500);
      return;
    }
    if (key === 'finalAnswer') {
      playBackground(audioUrls.finalAnswer, false, 0.6);
      setTimeout(() => stopBackground(), 3000);
      return;
    }
    playSfx(key === 'win' ? 'win' : key === 'lose' ? 'lose' : key);
  };

  // Muting silences everything at once: music bed, synth beds, live effects.
  useEffect(() => {
    if (!musicEnabled) {
      stopBackground();
      stopAllSynth();
      if (heartbeatRef.current) {
        try { heartbeatRef.current.stop(); heartbeatRef.current = null; } catch { /* ignore */ }
      }
    }
    try {
      localStorage.setItem(AUDIO_MUTED_KEY, musicEnabled ? '0' : '1');
    } catch {
      // ignore
    }
  }, [musicEnabled, stopBackground]);

  // Browsers only allow audio after a gesture: unlock the synth on the first one.
  useEffect(() => {
    const prime = () => unlockSynth();
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  // UI: simple ambient dots
  const ambientDots = useMemo(() => ([
    { w: 300, h: 300, top: '5%', left: '10%', bg: 'rgba(245,197,24,0.05)', delay: '0s' },
    { w: 400, h: 400, top: '50%', left: '70%', bg: 'rgba(108,99,255,0.04)', delay: '1.5s' },
    { w: 250, h: 250, top: '80%', left: '20%', bg: 'rgba(0,184,148,0.04)', delay: '3s' },
  ]), []);

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED TUTORLY START — the SAME splash + setup flow the other games use:
  //   splash → player profiles → copy AI prompt → paste JSON → on air
  // The single difference per game is the config below (title, wording, prompt).
  // ═══════════════════════════════════════════════════════════════════════════
  const shellSplash = useMemo<ShellSplashConfig>(() => ({
    gameTitle: 'HotSeat',
    gameEmoji: '💰',
    tagline: 'The class game show — answer hard questions, use your lifelines, climb the money ladder.',
    accent: '#f5c518',
    features: [
      { icon: '🎙️', label: 'Host voice' },
      { icon: '🛟', label: '3 lifelines' },
      { icon: '🤖', label: 'AI question packs' },
      { icon: '👥', label: 'Solo or teams' },
      { icon: '💵', label: 'Local currency prizes' },
      { icon: '🔥', label: 'Rising stakes' },
    ],
    howToPlay: [
      'Set up the players: name, avatar and a few facts or interests for each learner.',
      'Optional: type the theme or context for this episode.',
      'Press “Copy AI Prompt”, paste it into ChatGPT or Claude, then copy the JSON it writes back.',
      'Paste that JSON into the setup page, press “Load Pack”, then “Start Game”.',
      'On air: answer with 1-4, lock with Enter, and use your lifelines wisely.',
    ],
  }), []);

  const shellSetup = useMemo<ShellSetupConfig>(() => ({
    gameTitle: 'HotSeat',
    gameEmoji: '💰',
    accent: '#f5c518',
    playersHeading: 'Players & learner profiles',
    playersHelp: 'Names, avatars and a few facts about each learner — the AI writes the questions around them.',
    locationLabel: '🌍 THEME / CONTEXT (optional)',
    locationPlaceholder: 'e.g. Travel English, business meetings, science week',
    locationHelp: 'Optional: the theme the questions should be written around.',
    settingsHeading: 'Episode settings',
    topics: ['General English', 'Business English', 'Travel English', 'Academic English', 'Medical English', 'Tech English', 'Hospitality', 'Legal English'],
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    playerColors: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'],
    avatars: AVATAR_POOL.slice(0, 24),
    maxPlayers: 6,
    buildPrompt: ctx => buildMillionairePrompt({ ...ctx, questionCount }),
    validateJson: validateMillionaireJson,
    jsonPlaceholder: 'Paste the JSON your AI returned here — it starts with { "topic": … }',
    onStart: handleShellStart,
    onBack: () => setPhase('splash'),
  }), [questionCount, handleShellStart]);

  if (phase === 'splash') {
    return (
      <SplashScreen
        config={shellSplash}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onPlay={() => setPhase('setup')}
      />
    );
  }
  if (phase === 'setup') {
    return (
      <PlayerSetup
        config={shellSetup}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
      />
    );
  }

  // Render
  return (
    <div className={darkMode ? 'dark' : ''} style={{ minHeight: '100vh', background: 'var(--bg-light)', color: 'var(--text-primary)', fontFamily: "'Montserrat', 'Inter', sans-serif", position: 'relative' }}>
      <style>{EMBEDDED_CSS}</style>

      {/* Background ambient dots */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {ambientDots.map((dot, i) => (
          <div key={i} style={{ position: 'absolute', width: dot.w, height: dot.h, top: dot.top, left: dot.left, borderRadius: '50%', background: dot.bg, animation: `glowPulse 4s ease-in-out infinite ${dot.delay}`, filter: 'blur(40px)' }} />
        ))}
      </div>

      {/* Confetti */}
      <ConfettiRain pieces={confetti} />

      {/* Reveal wash overlay */}
      {revealWash === 'correct' && <div className="glow-wash" />}
      {revealWash === 'wrong' && <div className="danger-wash" />}

      {/* Bank transfer particles */}
      {bankParticles.map(p => (
        <div key={p.id} className="bank-transfer-particle" style={{ left: `${p.x}%`, top: `${p.y}%` }}>💰</div>
      ))}

      {/* Star particles */}
      {stars.map(s => (
        <div key={s.id} style={{ position: 'fixed', left: `${s.x}%`, top: `${s.y}%`, fontSize: '1.5rem', animation: 'floatUp 1.2s ease forwards', zIndex: 9998, pointerEvents: 'none' }}>
          {s.emoji}
        </div>
      ))}

      {/* Modals */}
      {showAudiencePoll && audiencePoll && q && <AudiencePollModal poll={audiencePoll} question={q} onClose={() => setShowAudiencePoll(false)} />}
      {showPhoneFriend && phoneFriendResult && q && <PhoneFriendModal result={phoneFriendResult} question={q} onClose={() => setShowPhoneFriend(false)} />}
      {showJsonEditor && <JsonEditorModal onLoad={qs => { setQuestions(qs.slice(0, 30)); setShowPreview(true); setShowJsonEditor(false); }} onClose={() => setShowJsonEditor(false)} />}
      {showPreview && <QuestionPreviewModal questions={questions} onEdit={setQuestions} onStart={() => { setShowPreview(false); startGame(questions); }} onClose={() => setShowPreview(false)} />}
      {showWalkAway && <WalkAwayModal prize={currentPrize} onConfirm={confirmWalkAway} onCancel={() => { setShowWalkAway(false); if (timerEnabled && phase === 'playing') setTimerRunning(true); }} />}
      {showPlayerEditor && (
        <PlayerEditorModal
          players={gamePlayers}
          onChange={setGamePlayers}
          onClose={() => setShowPlayerEditor(false)}
          questionCount={questionCount}
        />
      )}
      {showAudioSettings && (
        <AudioSettingsModal
          urls={audioUrls}
          onChange={setAudioUrls}
          onClose={() => setShowAudioSettings(false)}
          onTest={onTestAudio}
          onSave={saveAudioUrls}
          onReset={resetAudioUrls}
          volume={audioVolume}
          onVolume={changeVolume}
          muted={!musicEnabled}
          onToggleMuted={() => setMusicEnabled(v => !v)}
        />
      )}

      {/* SUSPENSE REVEAL OVERLAY */}
      {phase === 'suspense-reveal' && q && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'radial-gradient(ellipse at center, rgba(10,10,30,0.97) 0%, rgba(0,0,10,0.99) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.5s ease', overflow: 'hidden' }}>
          {/* Money background image only (no raining emoji) */}
          {moneyBgImage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${moneyBgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: suspenseStep >= 2 ? 0.18 : 0.08,
                filter: 'blur(4px) saturate(1.2)',
                transition: 'opacity 1s ease',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Rings */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: `${250 + i * 200}px`,
                  height: `${250 + i * 200}px`,
                  borderRadius: '50%',
                  border: `2px solid rgba(245,197,24,${0.25 - i * 0.05})`,
                  transform: 'translate(-50%, -50%)',
                  animation: `glowPulse ${2 + i * 0.3}s ease-in-out infinite ${i * 0.4}s`,
                }}
              />
            ))}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '600px',
                height: '600px',
                transform: 'translate(-50%, -50%)',
                background: 'conic-gradient(from 0deg, transparent, rgba(245,197,24,0.08), transparent, rgba(108,99,255,0.05), transparent)',
                borderRadius: '50%',
                animation: 'spotlightRotate 4s linear infinite',
              }}
            />
          </div>

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '760px', padding: '2rem' }}>
            <div style={{ padding: '10px 30px', borderRadius: '50px', display: 'inline-block', marginBottom: '1.25rem', background: 'linear-gradient(135deg, rgba(245,197,24,0.15), rgba(201,162,39,0.1))', border: '2px solid rgba(245,197,24,0.4)', animation: 'glowPulse 1.5s ease-in-out infinite' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f5c518', letterSpacing: '0.05em' }}>
                Q{currentQ + 1} — For {formatPrize(PRIZE_LADDER[currentQ] ?? 0)}
              </span>
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>
                {suspenseStep === 0 ? '🔒 Answer Locked In...' : suspenseStep === 1 ? '🎙️ Host is speaking...' : '🎬 Ready to reveal'}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                {selectedIndices.map((si, idx) => (
                  <div
                    key={si}
                    style={{
                      padding: '14px 28px',
                      borderRadius: '16px',
                      background: suspenseStep >= 2 ? 'linear-gradient(135deg, rgba(245,197,24,0.3), rgba(201,162,39,0.2))' : 'rgba(255,255,255,0.08)',
                      border: `2px solid ${suspenseStep >= 2 ? 'rgba(245,197,24,0.6)' : 'rgba(255,255,255,0.15)'}`,
                      // delay folded into the shorthand: mixing `animation` with
                      // `animationDelay` is what React warns about (and it can be dropped)
                      animation: suspenseStep >= 2 ? `glowPulse 0.7s ease-in-out infinite ${idx * 0.2}s` : 'none',
                      transition: 'all 0.5s ease',
                    }}
                  >
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5c518', marginRight: '10px' }}>{OPTION_LABELS[si]}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
                      {q.options[si]?.slice(0, 40)}
                      {(q.options[si]?.length ?? 0) > 40 ? '…' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* progress */}
            <div style={{ width: '320px', height: '6px', borderRadius: '3px', margin: '0 auto 1.5rem', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #f5c518, #00b894, #6c63ff, #f5c518)', backgroundSize: '200% auto', animation: 'shimmer 1s linear infinite', width: suspenseStep === 0 ? '25%' : suspenseStep === 1 ? '65%' : '100%', transition: 'width 2s ease' }} />
            </div>

            <div style={{ fontSize: suspenseStep >= 2 ? 'clamp(1.8rem, 4.5vw, 3rem)' : 'clamp(1.4rem, 4vw, 2.3rem)', fontWeight: 900, color: 'rgba(255,255,255,0.92)', animation: suspenseStep >= 2 ? 'pulse 0.7s ease-in-out infinite' : 'pulse 1.5s ease-in-out infinite', textShadow: '0 0 40px rgba(245,197,24,0.5)' }}>
              {suspenseStep === 0 && 'Final Answer Locked!'}
              {suspenseStep === 1 && (
                <span>
                  <span style={{ display: 'inline-block', animation: 'bounce 0.6s infinite' }}>.</span>
                  <span style={{ display: 'inline-block', animation: 'bounce 0.6s infinite 0.2s' }}>.</span>
                  <span style={{ display: 'inline-block', animation: 'bounce 0.6s infinite 0.4s' }}>.</span>
                </span>
              )}
              {suspenseStep === 2 && 'Ready. Click REVEAL when you want.'}
            </div>

            {/* Personalized message (and host speaks it) */}
            {suspenseStep >= 1 && suspenseMessage && (
              <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', borderRadius: '1rem', background: 'linear-gradient(135deg, rgba(245,197,24,0.15), rgba(0,184,148,0.1))', border: '1px solid rgba(245,197,24,0.3)', maxWidth: '700px' }}>
                <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.35rem)', fontWeight: 800, color: '#f5c518', lineHeight: 1.5, textAlign: 'center' }}>
                  {suspenseMessage}
                </p>
              </div>
            )}

            <div style={{ marginTop: '2.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={revealFinalAnswer}
                disabled={!canRevealFinal}
                style={{
                  padding: '14px 34px',
                  borderRadius: '999px',
                  border: '2px solid rgba(245,197,24,0.55)',
                  background: canRevealFinal
                    ? 'linear-gradient(135deg, rgba(245,197,24,0.95), rgba(201,162,39,0.95))'
                    : 'rgba(255,255,255,0.06)',
                  color: canRevealFinal ? '#1a1200' : 'rgba(255,255,255,0.45)',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  cursor: canRevealFinal ? 'pointer' : 'not-allowed',
                  boxShadow: canRevealFinal ? '0 12px 50px rgba(245,197,24,0.25)' : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                🎬 Reveal Final Answer
              </button>
              {!canRevealFinal && (
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>
                  {isSpeaking ? '🎙️ Host is still speaking... please wait.' : suspenseStep < 2 ? '⏳ Preparing reveal...' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MENU */}
      {phase === 'menu' && (
        <div
          className="menu-screen"
          style={{
            height: '100dvh',
            maxHeight: '100dvh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            // top padding clears the fixed toolbar
            padding: 'clamp(54px, 7vh, 72px) clamp(12px, 2vw, 32px) clamp(10px, 2vh, 26px)',
            position: 'relative',
            zIndex: 1,
          }}
        >

          {/* top right controls (fixed, so they stay out of the auto-fit) */}
          <div className="menu-toolbar" style={{ position: 'fixed', top: '0.75rem', left: 0, right: 0, zIndex: 100, padding: '0 clamp(0.5rem, 2vw, 1.5rem)' }}>
            <button onClick={() => setPhase('setup')} style={{ padding: '8px 18px', borderRadius: '50px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', border: '2px solid rgba(245,197,24,0.4)', background: 'rgba(245,197,24,0.12)', color: '#8a6d00', backdropFilter: 'blur(10px)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              🎬 Players & AI questions
            </button>
            <button onClick={() => setShowAudioSettings(true)} style={{ padding: '8px 18px', borderRadius: '50px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', border: '2px solid rgba(108,99,255,0.25)', background: 'rgba(255,255,255,0.9)', color: '#6c63ff', backdropFilter: 'blur(10px)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              ⚙️ Audio
            </button>
            <button onClick={() => setMusicEnabled(!musicEnabled)} style={{ padding: '8px 18px', borderRadius: '50px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', border: '2px solid rgba(245,197,24,0.3)', background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)', color: 'var(--text-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              {musicEnabled ? '🔊 Sound On' : '🔇 Muted'}
            </button>
            <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '8px 18px', borderRadius: '50px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', border: '2px solid rgba(245,197,24,0.3)', background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)', color: 'var(--text-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button onClick={toggleFullscreen} style={{ padding: '8px 18px', borderRadius: '50px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', border: '2px solid rgba(245,197,24,0.3)', background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)', color: 'var(--text-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              {fullscreen ? '⛶ Exit' : '⛶ Fullscreen'}
            </button>
          </div>

          {/* The hero + settings card are auto-fitted: they can never be clipped */}
          <FitFrame min={0.74} className="menu-fit">
          {/* Two columns: hero + actions beside the settings card, so the card is
              never scaled down to fit a tall single column. */}
          <div className="menu-grid">
          {/* hero */}
          <div className="menu-hero animate-bounceIn" style={{ textAlign: 'center' }}>
            <div className="menu-hero-emoji" style={{ fontSize: '5rem', marginBottom: '0.75rem', filter: 'drop-shadow(0 4px 20px rgba(245,197,24,0.4))' }}>🎤</div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
              <span className="gold-shimmer">HotSeat</span>
            </h1>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem' }}>🌍 Language Edition • English Learning Game</p>
          </div>

          {/* settings */}
          <div className="glass-card animate-fadeInUp menu-card" style={{ borderRadius: '2rem', padding: '2.5rem', maxWidth: '760px', width: '100%', boxShadow: '0 25px 70px rgba(0,0,0,0.1), 0 0 40px rgba(245,197,24,0.08)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>⚙️ Game Settings</h3>

            {/* Settings / toggles on the left, learner profile on the right, so
                the card is ~370px tall instead of ~840px. */}
            <div className="menu-card-grid">

            <div className="grid-2" style={{ gap: '1.25rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>📊 Number of Questions</label>
                <select className="styled-select" value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} style={{ width: '100%' }}>
                  {[5, 10, 15, 20, 25, 30].map(n => (
                    <option key={n} value={n}>
                      {n} Questions
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>⏱ Timer Duration</label>
                <select className="styled-select" value={questionTimer} onChange={e => setQuestionTimer(Number(e.target.value))} style={{ width: '100%' }}>
                  {[15, 20, 30, 45, 60].map(n => (
                    <option key={n} value={n}>
                      {n} seconds
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>🎤 Host Voice</label>
                <select className="styled-select" value={selectedVoice?.name ?? ''} onChange={e => setSelectedVoice(voices.find(v => v.name === e.target.value) ?? null)} style={{ width: '100%' }}>
                  {voices.filter(v => v.lang.startsWith('en')).map(v => (
                    <option key={v.name} value={v.name}>
                      {v.name.slice(0, 30)}
                    </option>
                  ))}
                  {voices.filter(v => v.lang.startsWith('en')).length === 0 && <option>Default Voice</option>}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>👥 Play Mode</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[{ label: '🧑 Solo', val: false }, { label: '👥 Teams', val: true }].map(({ label, val }) => (
                    <button key={label} onClick={() => setTeamMode(val)} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '2px solid', borderColor: teamMode === val ? 'var(--gold)' : 'rgba(0,0,0,0.1)', background: teamMode === val ? 'rgba(245,197,24,0.1)' : 'transparent', color: teamMode === val ? 'var(--gold-dark)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* toggles */}
            <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: '⏱ Enable Timer', val: timerEnabled, set: setTimerEnabled },
                { label: '🎙️ TTS Host Voice', val: ttsEnabled, set: setTtsEnabled },
              ].map(({ label, val, set }) => (
                <div key={label} onClick={() => set(!val)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '14px', background: val ? 'rgba(245,197,24,0.08)' : 'rgba(0,0,0,0.04)', border: `1.5px solid ${val ? 'rgba(245,197,24,0.3)' : 'rgba(0,0,0,0.08)'}`, cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{label}</span>
                  <div style={{ width: '48px', height: '26px', borderRadius: '13px', background: val ? 'linear-gradient(90deg, #f5c518, #c9a227)' : 'rgba(0,0,0,0.15)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '3px', left: val ? '24px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.3s', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* learner profile */}
            <div className="menu-learn" style={{ padding: '1.25rem', borderRadius: '1rem', background: 'rgba(108,99,255,0.04)', border: '1px solid rgba(108,99,255,0.15)', marginBottom: '1.5rem' }}>
              <h4 className="menu-learn-head" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#6c63ff', marginBottom: '1rem' }}>👤 Learner Profile (personalized money talk)</h4>
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Learner Name</label>
                  <input className="styled-input" value={learner.name} onChange={e => setLearner(l => ({ ...l, name: e.target.value }))} placeholder="Student's name" />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Country</label>
                  <select
                    className="styled-select"
                    value={learner.country}
                    onChange={async e => {
                      const country = e.target.value;
                      const preset = COUNTRY_PRESETS[country];
                      if (preset) {
                        setLearner(l => ({ ...l, country, currency: preset.currency, currencySymbol: preset.currencySymbol }));
                        void refreshRate(preset.currency);
                      } else {
                        setLearner(l => ({ ...l, country }));
                      }
                    }}
                  >
                    {Object.keys(COUNTRY_PRESETS).map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>CEFR Level</label>
                  <select className="styled-select" value={learner.cefrLevel} onChange={e => setLearner(l => ({ ...l, cefrLevel: e.target.value as Cefr }))}>
                    {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as Cefr[]).map(lvl => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Age Group</label>
                  <select className="styled-select" value={learner.age} onChange={e => setLearner(l => ({ ...l, age: e.target.value as AgeGroup }))}>
                    <option value="child">Child</option>
                    <option value="teen">Teen</option>
                    <option value="adult">Adult</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '0.9rem', padding: '10px 16px', borderRadius: '10px', background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                  Currency: <span style={{ color: 'var(--gold-dark)' }}>{learner.currencySymbol} ({learner.currency})</span>
                  <span style={{ marginLeft: '1rem' }}>Rate: 1 USD = {learner.exchangeRate.toLocaleString()} {learner.currency}</span>
                  {rateUpdatedAt && <span style={{ marginLeft: '1rem', fontWeight: 700, opacity: 0.8 }}>Updated: {rateUpdatedAt}</span>}
                  {rateStatus === 'error' && <span style={{ marginLeft: '1rem', color: '#e17055' }}>Rate fetch failed (using last value)</span>}
                </div>
                <button
                  onClick={() => refreshRate(learner.currency)}
                  className="option-btn"
                  style={{ padding: '10px 14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}
                  disabled={rateStatus === 'loading'}
                >
                  {rateStatus === 'loading' ? '⏳ Refreshing...' : '🔄 Refresh Rate'}
                </button>
              </div>
            </div>

            </div>

          {/* the settings card ends here; the actions live in their own column */}
          </div>

          <div className="menu-actions">
            {/* start */}
            <button
              onClick={() => { setQuestions(DEFAULT_QUESTIONS); startGame(DEFAULT_QUESTIONS); }}
              className="animate-glowPulse"
              style={{ width: '100%', padding: '20px', borderRadius: '18px', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '1.5rem', background: 'linear-gradient(135deg, #f5c518 0%, #ffe066 50%, #c9a227 100%)', color: '#1a1200', boxShadow: '0 8px 30px rgba(245,197,24,0.5), inset 0 1px 0 rgba(255,255,255,0.4)', textTransform: 'uppercase' }}
            >
              🎮 Start Game — Default Questions
            </button>

            {/* Players & Actors big button */}
            <button
              onClick={() => setShowPlayerEditor(true)}
              style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid rgba(108,99,255,0.35)', background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(108,99,255,0.03))', color: '#6c63ff', fontWeight: 900, fontSize: '1.15rem', cursor: 'pointer', marginTop: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.3s' }}
            >
              👥 Players & Actors {gamePlayers.length > 0 ? `(${gamePlayers.length})` : ''} + AI Prompt Generator
            </button>

            <div className="grid-2" style={{ gap: '0.75rem', marginTop: '0.75rem' }}>
              <button onClick={() => setShowJsonEditor(true)} className="option-btn" style={{ padding: '14px', fontSize: '1rem', fontWeight: 800, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📋 Paste My JSON
              </button>
              <button onClick={() => { setQuestions(DEFAULT_QUESTIONS); setShowPreview(true); }} className="option-btn" style={{ padding: '14px', fontSize: '1rem', fontWeight: 800, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}>
                👁️ Preview & Edit
              </button>
            </div>

            <div className="menu-shortcuts" style={{ marginTop: '1.2rem', padding: '14px 18px', borderRadius: '14px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⌨️ In-Game Keyboard Shortcuts</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  ['1–7', 'Select option'],
                  ['Enter', 'Final Answer'],
                  ['W', 'Walk Away'],
                  ['F', '50:50'],
                  ['P', 'Phone Friend'],
                  ['A', 'Ask Audience'],
                  ['L', 'Play Listening'],
                  ['M', 'Mute/Unmute'],
                  ['Esc', 'Close popup'],
                ].map(([key, desc]) => (
                  <span key={key} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.05)', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <kbd style={{ fontFamily: 'monospace', background: 'var(--gold)', color: '#1a1200', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 900 }}>{key}</kbd>
                    {desc}
                  </span>
                ))}
              </div>
            </div>
          </div>
          </div>
          </FitFrame>
        </div>
      )}

      {/* GAME SCREEN */}
      {(phase === 'playing' || phase === 'final-answer' || phase === 'result' || phase === 'suspense-reveal') && q && (
        <div className={`play-root${cameraZoom ? ' camera-zoom-in' : ''}`} style={{ display: 'flex', position: 'relative', zIndex: 1, transformOrigin: 'center center' }}>
          {/* Prize Ladder Sidebar */}
          <div className="prize-sidebar" style={{ width: '210px', flexShrink: 0, background: darkMode ? 'rgba(10,10,25,0.97)' : 'rgba(252,252,248,0.97)', borderRight: '1px solid rgba(245,197,24,0.15)', backdropFilter: 'blur(20px)', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10, overflowY: 'auto', boxShadow: '4px 0 30px rgba(0,0,0,0.08)' }}>
            <PrizeLadder currentQ={currentQ} questions={questions} />
          </div>

          {/* Mobile Prize Strip */}
          <div className="mobile-prize-strip" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '8px 16px', background: darkMode ? 'rgba(10,10,25,0.97)' : 'rgba(252,252,248,0.97)', borderTop: '1px solid rgba(245,197,24,0.2)', backdropFilter: 'blur(20px)', justifyContent: 'center', gap: '12px', overflowX: 'auto' }}>
            {questions.slice(Math.max(0, currentQ - 2), Math.min(questions.length, currentQ + 5)).map((_, rel) => {
              const idx = Math.max(0, currentQ - 2) + rel;
              const isCurr = idx === currentQ;
              const isPast = idx < currentQ;
              const isSafe = SAFE_HAVENS.includes(idx);
              return (
                <div key={idx} style={{ textAlign: 'center', minWidth: '60px', padding: '4px 8px', borderRadius: '8px', background: isCurr ? 'linear-gradient(135deg, #f5c518, #c9a227)' : 'transparent', color: isCurr ? '#1a1200' : isPast ? 'rgba(0,0,0,0.3)' : isSafe ? '#00b894' : 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>Q{idx + 1}{isSafe ? '🛡️' : ''}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900 }}>{formatPrize(PRIZE_LADDER[idx] ?? 0)}</div>
                </div>
              );
            })}
          </div>

          {/* Main content */}
          <div className="play-main" style={{ flex: 1, padding: 'clamp(1rem, 2vh, 1.5rem)', display: 'flex', flexDirection: 'column', width: '100%' }}>
            {/* Everything below is auto-fitted to the frame (never clipped) */}
            <FitFrame>
            {/* Top bar */}
            <div className="play-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="glass-card" style={{ padding: '10px 22px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(245,197,24,0.15)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Prize</span>
                  <span className={displayPrize !== currentPrize ? 'rolling-counter' : ''} style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--gold-dark)' }}>{formatPrize(displayPrize || currentPrize)}</span>
                </div>
                {safeHavenPrize > 0 && (
                  <div className="safe-haven-pulse" style={{ padding: '8px 16px', borderRadius: '50px', background: 'rgba(0,184,148,0.1)', border: '1.5px solid rgba(0,184,148,0.4)', fontSize: '0.85rem', fontWeight: 800, color: '#00b894', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🛡️ Safe: {formatPrize(safeHavenPrize)}
                  </div>
                )}
                {teamMode && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {([1, 2] as const).map(t => (
                      <button key={t} onClick={() => setCurrentTeam(t)} style={{ padding: '8px 16px', borderRadius: '50px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: currentTeam === t ? 'var(--gold)' : 'rgba(0,0,0,0.08)', color: currentTeam === t ? '#1a1200' : 'var(--text-secondary)' }}>
                        Team {t}: {formatPrize(teamScores[t - 1])}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setMusicEnabled(!musicEnabled)} style={{ padding: '7px 14px', borderRadius: '50px', border: '1px solid rgba(245,197,24,0.25)', background: musicEnabled ? 'rgba(245,197,24,0.1)' : 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {musicEnabled ? '🔊' : '🔇'}
                </button>
                <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '7px 14px', borderRadius: '50px', border: '1px solid rgba(245,197,24,0.25)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {darkMode ? '☀️' : '🌙'}
                </button>
                <button onClick={toggleFullscreen} style={{ padding: '7px 14px', borderRadius: '50px', border: '1px solid rgba(245,197,24,0.25)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  ⛶
                </button>
                <button onClick={() => { stopTimer(); stopBackground(); setPhase('menu'); }} style={{ padding: '7px 14px', borderRadius: '50px', border: '1px solid rgba(225,112,85,0.3)', background: 'rgba(225,112,85,0.05)', color: '#e17055', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  🏠 Menu
                </button>
              </div>
            </div>

            {/* Active players bar */}
            {gamePlayers.length > 0 && (
              <div className="play-players" style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: '4px' }}>Players:</span>
                {gamePlayers.map(p => (
                  <div key={p.id} title={`${p.name} (${p.type})`} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '50px', background: p.type === 'actor' ? 'rgba(245,197,24,0.1)' : 'rgba(108,99,255,0.08)', border: `1px solid ${p.type === 'actor' ? 'rgba(245,197,24,0.3)' : 'rgba(108,99,255,0.2)'}`, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                    {p.type === 'actor' && p.luckRate && <span style={{ fontSize: '0.65rem', color: 'var(--gold-dark)' }}>🍀{p.luckRate}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Host speech */}
            {hostSpeech && (
              <div className="animate-fadeInUp" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="host-avatar" style={{ animation: isSpeaking ? 'glowPulse 0.8s ease-in-out infinite' : 'none' }}>
                  {isSpeaking ? '🎙️' : '🎤'}
                </div>
                <div className="speech-bubble" style={{ flex: 1 }}>
                  <p style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.55, color: 'var(--text-primary)' }}>{hostSpeech}</p>
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="play-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ padding: '7px 20px', borderRadius: '50px', background: 'linear-gradient(135deg, #f5c518, #c9a227)', color: '#1a1200', fontWeight: 900, fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(245,197,24,0.4)' }}>
                Q{currentQ + 1} • {formatPrize(PRIZE_LADDER[currentQ] ?? 0)}
              </div>
              <span className={`type-badge ${CATEGORY_COLORS[q.category]}`} style={{ padding: '6px 14px', borderRadius: '50px' }}>
                {CATEGORY_ICONS[q.category]} {q.category}
              </span>
              <span style={{ padding: '6px 14px', borderRadius: '50px', background: 'rgba(108,99,255,0.1)', color: '#6c63ff', fontSize: '0.8rem', fontWeight: 700 }}>
                Type {q.type} — {TYPE_LABELS[q.type]}
              </span>
              {isSafeHaven && <span style={{ padding: '6px 14px', borderRadius: '50px', background: 'rgba(0,184,148,0.1)', border: '1px solid rgba(0,184,148,0.3)', color: '#00b894', fontSize: '0.85rem', fontWeight: 800 }}>🛡️ Safe Haven Level!</span>}
            </div>

            {/* Listening */}
            {q.category === 'listening' && q.listeningText && (
              <button
                onClick={playListening}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', padding: '13px 28px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1.05rem', background: 'linear-gradient(135deg, #6c63ff, #a29bfe)', color: 'white', boxShadow: '0 6px 25px rgba(108,99,255,0.4)' }}
              >
                <span style={{ fontSize: '1.4rem' }}>🎧</span>
                ▶ Play Listening Audio (L)
              </button>
            )}

            {/* Question card */}
            <div className="glass-card animate-questionReveal play-question" style={{ borderRadius: '2rem', padding: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: '1.25rem', borderTop: `5px solid ${isSafeHaven ? '#00b894' : answerResult === 'correct' ? '#00b894' : answerResult === 'wrong' ? '#e17055' : 'var(--gold)'}`, boxShadow: `0 20px 60px rgba(0,0,0,0.08)`, position: 'relative', overflow: 'hidden' }}>
              {/* Category background image */}
              {CATEGORY_BG_IMAGES[q.category] && (
                <div className="category-bg" style={{ backgroundImage: `url(${CATEGORY_BG_IMAGES[q.category]})` }} />
              )}
              <p style={{ fontSize: 'clamp(1.3rem, 2.8vw, 2rem)', fontWeight: 800, lineHeight: 1.45, color: 'var(--text-primary)', position: 'relative' }} className="question-text">
                {q.text}
              </p>
              {q.type !== 'A' && (
                <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '50px', background: 'rgba(108,99,255,0.07)', border: '1.5px solid rgba(108,99,255,0.2)' }}>
                  <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#6c63ff' }}>
                    Select {maxSelect} answer{maxSelect > 1 ? 's' : ''} — {selectedIndices.length}/{maxSelect} chosen
                  </span>
                </div>
              )}
            </div>

            {/* Timer */}
            {timerEnabled && phase === 'playing' && !answerResult && (
              <div className="play-timer" style={{ marginBottom: '1.25rem' }}>
                <TimerBar timeLeft={timeLeft} total={questionTimer} />
              </div>
            )}

            {/* Options */}
            <div className={`options-grid${q.options.length > 4 && q.options.length <= 6 ? ' cols-3' : ''}`} style={{ marginBottom: '1.25rem' }}>
              {q.options.map((opt, idx) => {
                const isSelected = selectedIndices.includes(idx);
                const isElim = eliminatedOptions.includes(idx);
                const isCorrect = revealedCorrect.includes(idx);
                const isWrong = isSelected && !isCorrect && !!answerResult;

                let cls = '';
                if (answerResult) {
                  if (isCorrect) cls = 'correct';
                  else if (isWrong) cls = 'wrong';
                } else if (isSelected) cls = 'selected';
                if (isElim) cls = 'eliminated';

                return (
                  <button key={idx} className={`option-btn ${cls} ${sweepIdx === idx ? 'option-sweep' : ''}`} onClick={() => toggleOption(idx)} disabled={!!answerResult || isElim || phase === 'final-answer'} style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', width: '100%', minHeight: '72px' }}>
                    <span style={{ width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', flexShrink: 0, background: isSelected ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)', border: '2px solid rgba(0,0,0,0.08)' }}>
                      {OPTION_LABELS[idx]}
                    </span>
                    <span style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.25rem)', fontWeight: 700, lineHeight: 1.4, flex: 1 }} className="option-text">
                      {opt}
                    </span>
                    <span style={{ fontSize: '1.3rem', marginLeft: 'auto', flexShrink: 0 }}>{isCorrect && answerResult ? '✅' : isWrong ? '❌' : isSelected && !answerResult ? '⭕' : ''}</span>
                  </button>
                );
              })}
            </div>

            {/* Result splash */}
            {answerResult && (
              <div className="result-splash" style={{ padding: '1.6rem', borderRadius: '2rem', marginBottom: '1.25rem', textAlign: 'center', background: answerResult === 'correct' ? 'linear-gradient(135deg, rgba(0,184,148,0.1), rgba(0,206,201,0.15))' : 'linear-gradient(135deg, rgba(225,112,85,0.1), rgba(214,48,49,0.15))', border: `3px solid ${answerResult === 'correct' ? 'rgba(0,184,148,0.4)' : 'rgba(225,112,85,0.4)'}` }}>
                <div style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', marginBottom: '0.25rem', lineHeight: 1 }}>{answerResult === 'correct' ? '🎉' : '😔'}</div>
                <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: '0.4rem', color: answerResult === 'correct' ? '#00b894' : '#e17055' }}>{answerResult === 'correct' ? 'CORRECT!' : 'WRONG ANSWER!'}</h2>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {answerResult === 'correct'
                    ? `You've won ${formatPrize(PRIZE_LADDER[currentQ] ?? 0)}!`
                    : `The correct answer was: ${q.correctIndices.map(i => `${OPTION_LABELS[i]}: ${q.options[i]}`).join(' & ')}`}
                </p>
              </div>
            )}

            {/* Explanation */}
            {showExplanation && answerResult && (
              <div className="animate-fadeInUp play-explain" style={{ padding: '1.5rem', borderRadius: '1.5rem', marginBottom: '1.25rem', borderLeft: `5px solid ${answerResult === 'correct' ? '#00b894' : '#e17055'}`, background: answerResult === 'correct' ? 'rgba(0,184,148,0.05)' : 'rgba(225,112,85,0.05)', border: `1px solid ${answerResult === 'correct' ? 'rgba(0,184,148,0.2)' : 'rgba(225,112,85,0.2)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{answerResult === 'correct' ? '🎉' : '💡'}</span>
                  <span style={{ fontWeight: 900, fontSize: '1.1rem', color: answerResult === 'correct' ? '#00b894' : '#e17055' }}>{answerResult === 'correct' ? `Excellent! +${formatPrize(PRIZE_LADDER[currentQ] ?? 0)}` : 'Explanation'}</span>
                </div>
                <p style={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--text-primary)' }}>{q.explanation}</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
              {phase === 'playing' && !answerResult && (
                <>
                  <button className="final-answer-btn" onClick={handleFinalAnswer} disabled={selectedIndices.length === 0} style={{ flex: 1, minWidth: '180px' }}>
                    ✅ Final Answer {selectedIndices.length > 0 ? `(${selectedIndices.length}/${maxSelect})` : ''}
                  </button>
                  <button className="walkaway-btn" onClick={handleWalkAway} style={{ padding: '14px 28px', fontSize: '1rem' }}>
                    🚶 Walk Away ({formatPrize(currentPrize)}) — W
                  </button>
                </>
              )}

              {phase === 'final-answer' && (
                <div style={{ display: 'flex', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
                  <button className="final-answer-btn animate-glowPulse" onClick={confirmAnswer} style={{ flex: 2, minWidth: '220px', fontSize: '1.3rem', padding: '18px', background: 'linear-gradient(135deg, #00b894, #00cec9)' }}>
                    🔒 Yes! That's My Final Answer!
                  </button>
                  <button className="walkaway-btn" onClick={() => { setPhase('playing'); setFinalAnswerStep(false); if (timerEnabled) setTimerRunning(true); }} style={{ flex: 1, minWidth: '140px' }}>
                    ↩ Change Answer
                  </button>
                </div>
              )}

              {phase === 'result' && (
                <button className="final-answer-btn" onClick={nextQuestion} style={{ flex: 1, minWidth: '200px', fontSize: '1.2rem', padding: '18px', background: answerResult === 'correct' ? 'linear-gradient(135deg, #f5c518, #c9a227)' : 'linear-gradient(135deg, #e17055, #d63031)', color: answerResult === 'correct' ? '#1a1200' : 'white' }}>
                  {answerResult === 'correct' ? (currentQ + 1 >= questions.length ? '🏆 Collect Grand Prize!' : '▶ Next Question →') : '💔 See Final Results'}
                </button>
              )}
            </div>

            {/* Lifelines */}
            <div className="glass-card play-lifelines" style={{ padding: '1.25rem 1.5rem', borderRadius: '1.5rem' }}>
              <div className="play-lifelines-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>💡 Lifelines</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {Object.values(lifelines).map((l, i) => (
                    <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.used ? 'rgba(0,0,0,0.15)' : 'var(--gold)', boxShadow: l.used ? 'none' : '0 0 8px rgba(245,197,24,0.6)' }} />
                  ))}
                </div>
              </div>
              <div className="play-lifelines-row" style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {([
                  { key: 'fifty-fifty' as LifelineType, icon: '½', label: '50:50', sub: 'F', action: useFiftyFifty },
                  { key: 'phone-friend' as LifelineType, icon: '📞', label: 'Phone', sub: 'P', action: usePhoneFriend },
                  { key: 'ask-audience' as LifelineType, icon: '👥', label: 'Audience', sub: 'A', action: useAskAudience },
                ]).map(({ key, icon, label, sub, action }) => {
                  const isUsed = lifelines[key].used;
                  const isDisabled = isUsed || !!answerResult || phase === 'final-answer';
                  return (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <button className={`lifeline-btn ${isUsed ? 'used' : ''}`} onClick={action} disabled={isDisabled} title={`${label} (${sub})`} style={{ position: 'relative' }}>
                        <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{isUsed ? '✗' : icon}</span>
                        {!isUsed && <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#6c63ff', color: 'white', fontSize: '0.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sub}</div>}
                      </button>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: isUsed ? 'rgba(0,0,0,0.3)' : 'var(--text-secondary)', textDecoration: isUsed ? 'line-through' : 'none' }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            </FitFrame>
          </div>

          {/* Fixed timer */}
          {timerEnabled && phase === 'playing' && !answerResult && (
            <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 50 }}>
              <CircularTimer timeLeft={timeLeft} total={questionTimer} />
            </div>
          )}
        </div>
      )}

      {/* GAME OVER */}
      {phase === 'gameover' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', zIndex: 1 }}>
          <button onClick={() => setDarkMode(!darkMode)} style={{ position: 'fixed', top: '1rem', right: '1rem', padding: '8px 18px', borderRadius: '50px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', border: '2px solid rgba(245,197,24,0.3)', background: 'rgba(255,255,255,0.9)', color: 'var(--text-primary)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Cinematic Milestones Montage */}
          {showCinematic && milestones.length > 0 && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.5s ease' }}>
              {/* Cinematic bars */}
              <div className="cinematic-bar" style={{ top: 0, height: '60px' }} />
              <div className="cinematic-bar" style={{ bottom: 0, height: '60px' }} />

              <div style={{ textAlign: 'center', maxWidth: '600px', padding: '2rem' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>
                  Milestone {cinematicIdx + 1} of {milestones.length}
                </p>
                <div className="animate-bounceIn" key={cinematicIdx} style={{ padding: '2rem', borderRadius: '2rem', background: 'linear-gradient(135deg, rgba(245,197,24,0.12), rgba(0,184,148,0.08))', border: '2px solid rgba(245,197,24,0.35)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛡️</div>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>Question {milestones[cinematicIdx].q + 1} — Safe Haven Reached</p>
                  <p style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 900 }}>
                    <span className="gold-shimmer">{formatPrize(milestones[cinematicIdx].prize)}</span>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                  <button
                    onClick={() => {
                      if (cinematicIdx < milestones.length - 1) {
                        setCinematicIdx(cinematicIdx + 1);
                      } else {
                        setShowCinematic(false);
                      }
                    }}
                    style={{ padding: '12px 30px', borderRadius: '50px', border: '2px solid rgba(245,197,24,0.5)', background: 'linear-gradient(135deg, rgba(245,197,24,0.9), rgba(201,162,39,0.9))', color: '#1a1200', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}
                  >
                    {cinematicIdx < milestones.length - 1 ? '▶ Next Milestone' : '🏆 See Final Results'}
                  </button>
                  <button
                    onClick={() => setShowCinematic(false)}
                    style={{ padding: '12px 20px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card" style={{ borderRadius: '2.5rem', padding: 'clamp(2rem, 5vw, 3.5rem)', maxWidth: '680px', width: '100%', textAlign: 'center', boxShadow: '0 30px 80px rgba(0,0,0,0.12), 0 0 60px rgba(245,197,24,0.12)' }}>
            <div style={{ fontSize: 'clamp(4rem, 10vw, 7rem)', marginBottom: '1rem', animation: 'prizeWin 1s ease', lineHeight: 1 }}>{walkedAway ? '🚶' : finalPrize >= 1000000 ? '🏆' : finalPrize > 0 ? '🎖️' : '😔'}</div>

            <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 900, marginBottom: '0.5rem', lineHeight: 1.1 }}>
              {walkedAway ? 'You Walked Away!' : finalPrize >= 1000000 ? '🎊 CHAMPION! 🎊' : finalPrize > 0 ? 'Well Played!' : 'Better Luck Next Time!'}
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '2rem' }}>{walkedAway ? 'A wise strategic choice!' : 'You leave with...'}</p>

            <div style={{ padding: '2rem', borderRadius: '2rem', background: 'linear-gradient(135deg, rgba(245,197,24,0.08), rgba(201,162,39,0.12))', border: '2px solid rgba(245,197,24,0.3)', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🏆 You Leave With</p>
              <p style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: 900, lineHeight: 1, marginBottom: '0.5rem' }}>
                <span className="gold-shimmer">{formatPrize(finalPrize)}</span>
              </p>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Stats: ✅ {gameStats.correct} correct • ❌ {gameStats.wrong} wrong
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={() => { setQuestions(DEFAULT_QUESTIONS); startGame(DEFAULT_QUESTIONS); }} style={{ padding: '18px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '1.3rem', background: 'linear-gradient(135deg, #f5c518, #c9a227)', color: '#1a1200', boxShadow: '0 8px 30px rgba(245,197,24,0.4)' }}>
                🔄 Play Again!
              </button>
              <button onClick={() => { stopBackground(); setPhase('menu'); }} style={{ padding: '14px', borderRadius: '14px', border: '2px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
                🏠 Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
