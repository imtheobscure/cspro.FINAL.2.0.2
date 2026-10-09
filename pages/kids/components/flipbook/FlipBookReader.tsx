import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ChevronLeft, ChevronRight, Volume2, VolumeX, Download,
  ArrowLeft, List, Edit3, Trash2, Save, Check, Sparkles, Maximize2
} from 'lucide-react';
import {FlipbookJSON, LessonSection, LessonActivity, ActivityType } from '../../utils/flipbookTypes';
import { ActivityRenderer } from './ActivityComponents';
import { playClick, playQuestDing, playStarShower, playMagicSpell, playLevelUpFanfare, playTrophyUnlock } from '../../utils/kidsAudio';
import { ACTIVITY_DEFINITIONS } from '../../utils/flipbookPrompt';

/* ═══════════════════════════════════════════════════════════════
   HYPER-REALISTIC PAGE AUDIO — flick + whoosh + settle layers
   ═══════════════════════════════════════════════════════════════ */
let bookAudioCtx: AudioContext | null = null;
let bookAudioMuted = false;
function getBookCtx(): AudioContext | null {
  try {
    if (!bookAudioCtx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      bookAudioCtx = new AC();
    }
    if (bookAudioCtx.state === 'suspended') bookAudioCtx.resume().catch(() => {});
    return bookAudioCtx;
  } catch { return null; }
}
function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}
/* A natural page flip: a crisp dry "flic" as the corner lifts, a smooth airy
   whoosh as the sheet sweeps, and a muffled flap as it settles — each tuned soft
   so it reads as paper and paper only, never a synthesized buzz. */
function playPaperFlick(intensity = 1) {
  if (bookAudioMuted) return;
  try {
    const ctx = getBookCtx(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, 0.1);
    const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.Q.value = 1.7;
    filt.frequency.setValueAtTime(3400, t0);
    filt.frequency.exponentialRampToValueAtTime(700, t0 + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.085 * intensity, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
    src.connect(filt); filt.connect(g); g.connect(ctx.destination);
    src.start(t0);
  } catch { /* silent */ }
}
function playPaperWhoosh(intensity = 1) {
  if (bookAudioMuted) return;
  try {
    const ctx = getBookCtx(); if (!ctx) return;
    const t0 = ctx.currentTime + 0.018;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, 0.34);
    const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.Q.value = 0.6;
    filt.frequency.setValueAtTime(360, t0);
    filt.frequency.exponentialRampToValueAtTime(1400, t0 + 0.16);
    filt.frequency.exponentialRampToValueAtTime(220, t0 + 0.32);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.05 * intensity, t0 + 0.11);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
    src.connect(filt); filt.connect(g); g.connect(ctx.destination);
    src.start(t0);
  } catch { /* silent */ }
}
function playPaperSettle() {
  if (bookAudioMuted) return;
  try {
    const ctx = getBookCtx(); if (!ctx) return;
    const t0 = ctx.currentTime + 0.3;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(130, t0);
    o.frequency.exponentialRampToValueAtTime(78, t0 + 0.13);
    g.gain.setValueAtTime(0.032, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + 0.17);
  } catch { /* silent */ }
}
let pageTurnAudio: HTMLAudioElement | null = null;
function playPageTurnSound() {
  if (bookAudioMuted) return;
  try {
    if (!pageTurnAudio) {
      pageTurnAudio = new Audio();
      pageTurnAudio.src = '/pages/kids/assets/audio/page-turn.mp3';
      pageTurnAudio.volume = 0.35;
      pageTurnAudio.preload = 'auto';
    }
    pageTurnAudio.currentTime = 0;
    pageTurnAudio.play().catch(() => {
      /* fallback to synthesized sound if MP3 fails */
      playPaperFlick(0.55);
      playPaperWhoosh(0.45);
      window.setTimeout(() => playPaperSettle(), 185);
    });
  } catch {
    playPaperFlick(0.55);
    playPaperWhoosh(0.45);
    window.setTimeout(() => playPaperSettle(), 185);
  }
}

/* ═══ MICROSOFT AZURE NEURAL TTS — children voices preferred ═══ */
const CHILD_VOICE = /ana|maisie/i;
function webSpeak(text: string, azName?: string, pitch = 1.05, rate = 0.95) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const child = CHILD_VOICE.test(azName || '');
  utterance.pitch = Math.min(2, pitch + (child ? 0.35 : 0));
  utterance.rate = rate || (child ? 0.94 : 1);
  const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  const wantUK = /en-GB/i.test(azName || '');
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0; const n = v.name.toLowerCase();
    if (child && /ana|maisie|kid|child|junior/.test(n)) s += 6;
    if (wantUK ? /gb|uk/i.test(v.lang) : /us/i.test(v.lang)) s += 2;
    if (/natural|neural|online/.test(n)) s += 2;
    return s;
  };
  voices.sort((a, b) => score(b) - score(a));
  if (voices[0]) utterance.voice = voices[0];
  speechSynthesis.speak(utterance);
}
function azureSpeakText(text: string, azName?: string, pitch = 1.05, rate = 0.95) {
  const key = localStorage.getItem('fb_az_key') || '';
  const region = localStorage.getItem('fb_az_region') || '';
  if (key && region) {
    const p = Math.round(Math.abs(pitch - 1) * 100);
    const sign = pitch >= 1 ? '+' : '-';
    const ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="' + (azName || 'en-US-AnaNeural') + '"><prosody pitch="' + sign + p + '%" rate="' + Math.round(rate * 100) + '%">' + text + '</prosody></voice></speak>';
    fetch('https://' + region + '.tts.speech.microsoft.com/cognitiveservices/v1', {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3' },
      body: ssml
    })
      .then(r => { if (!r.ok) throw new Error('azure ' + r.status); return r.arrayBuffer(); })
      .then(buf => {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) throw new Error('no ctx');
        const c = new Ctx();
        c.decodeAudioData(buf, decoded => { const src = c.createBufferSource(); src.buffer = decoded; src.connect(c.destination); src.start(); });
      })
      .catch(() => webSpeak(text, azName, pitch, rate));
    return;
  }
  webSpeak(text, azName, pitch, rate);
}
function speakCharacter(text: string, voiceName?: string, pitch = 1.0, rate = 1.0) {
  azureSpeakText(text, voiceName, pitch, rate);
}
function azureSetup() {
  const key = window.prompt('Microsoft Azure Speech key (paste to enable natural neural voices — children voices like en-US-AnaNeural are used automatically; leave empty to cancel):', localStorage.getItem('fb_az_key') || '');
  if (key === null) return;
  if (!key.trim()) { localStorage.removeItem('fb_az_key'); localStorage.removeItem('fb_az_region'); return; }
  const region = window.prompt('Azure region (e.g. eastus, westeurope, southeastasia):', localStorage.getItem('fb_az_region') || 'eastus');
  if (region === null) return;
  localStorage.setItem('fb_az_key', key.trim());
  localStorage.setItem('fb_az_region', region.trim());
}

/* Content-type skins — each Content Type is art-directed differently */
const SKIN: Record<string, [string, string]> = {
  'English Lesson': ['#7146c6', '#bc4cae'],
  'Story Lesson': ['#c2477e', '#7d3fc0'],
  'Song Lesson': ['#d9435f', '#f08a3c'],
  'Vocabulary Quest': ['#0d8f8f', '#7ab648'],
  'Grammar Quest': ['#2f6bbf', '#5a8fd9'],
  'Speaking Mission': ['#c0392b', '#e9ad45'],
  'Reading Mission': ['#3e7c4f', '#8f9a3f'],
  'Phonics Lab': ['#2a9fd8', '#ef6fae']
};

/* Growth-mindset effort praise */
const PRAISE_PHRASES = [
  'Your brain just grew! 🌟',
  'Wonderful trying — that is how mastery happens!',
  'Brave work, hero! ✨',
  'You figured it out! 🧠✨',
  'Fantastic effort! The magic is working!',
  'Strong thinking! Keep going! 💪',
  'Every try makes you stronger! ⭐',
];

type DragState = {
  active: boolean;
  started: boolean;
  dir: 'next' | 'prev';
  startX: number;
  startY: number;
  pageW: number;
  lastX: number;
  lastT: number;
  vel: number;
};

interface FlipBookReaderProps {
  book:FlipbookJSON;
  onBackToStudio: () => void;
  onDownloadHtml: () => void;
  onUpdateBook?: (updated:FlipbookJSON) => void;
}

export const FlipBookReader: React.FC<FlipBookReaderProps> = ({
  book: initialBook,
  onBackToStudio,
  onDownloadHtml,
  onUpdateBook
}) => {
  const [book, setBook] = useState<FlipbookJSON>(initialBook);
  useEffect(() => { setBook(initialBook); }, [initialBook]);

  /* Position map — the two covers are full-surface "closed" states:
     0 = CLOSED FRONT COVER (whole surface) • 1..openCount = open 2-page spreads •
     openCount+1 = CLOSED BACK COVER (whole surface).
     Linear open-page order: bookplate → quest map → hero team → memory lab → magic
     words → per-chapter (story, practice) → exit ticket → certificate → teacher notes.
     This keeps the front cover on top when closed and the "belongs to" page right
     after it, then the final flip closes back onto the back cover. */
  const openCount = 4 + book.sections.length;
  const totalSpreads = openCount + 2;
  /* Helpers for the linear open-page order. Chapters contribute a (story, practice)
     pair each, indexed at 5 + 2*secIdx. */
  const EXIT_LINEAR = 5 + 2 * book.sections.length;
  const CERT_LINEAR = EXIT_LINEAR + 1;
  const NOTES_LINEAR = EXIT_LINEAR + 2;
  const CHAPTER_PAGE_IDX: Array<{ linear: number; sec: number }> =
    book.sections.map((_, sec) => ({ linear: 5 + 2 * sec, sec }));
  const leftLinearOf = (pos: number) => 2 * (pos - 1);
  // Closed states: front cover opens first; back cover is the final closed state.
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isClosed, setIsClosed] = useState(true);
  const [turning, setTurning] = useState<null | 'next' | 'prev'>(null);
  const [peek, setPeek] = useState<null | 'next' | 'prev'>(null);
  const [earnedXp, setEarnedXp] = useState(50);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [completedActivities, setCompletedActivities] = useState<Record<string, boolean>>({});
  const [praise, setPraise] = useState<string | null>(null);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === readerRef.current);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const stageRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const peekRef = useRef<null | 'next' | 'prev'>(null);
  const levelRef = useRef(1);
  const praiseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Leaf rotation: 0 = resting on the right half, -180 = resting on the left */
  const rotation = useMotionValue(0);
  const leafShade = useTransform(rotation, r => Math.min(0.85, Math.abs(r) / 150));
  const underShade = useTransform(rotation, r => Math.min(0.55, Math.abs(r) / 320));

  const level = Math.floor(earnedXp / 120) + 1;
  const levelProgress = ((earnedXp % 120) / 120) * 100;
  const [acc1, acc2] = SKIN[book.contentType || ''] || SKIN['English Lesson'];

  useEffect(() => { bookAudioMuted = isMuted; }, [isMuted]);
  useEffect(() => { setBestStreak(b => Math.max(b, streak)); }, [streak]);

  const fireConfetti = useCallback((scale = 1) => {
    try {
      confetti({
        particleCount: Math.round(70 * scale),
        spread: 78,
        startVelocity: 42,
        origin: { y: 0.62 },
        colors: ['#fbbf24', '#a78bfa', '#f472b6', '#34d399', '#fde68a'],
        scalar: 0.95,
        disableForReducedMotion: true,
      });
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    const lvl = Math.floor(earnedXp / 120) + 1;
    if (lvl > levelRef.current) {
      levelRef.current = lvl;
      if (!isMuted) playLevelUpFanfare();
      fireConfetti(1.7);
    }
  }, [earnedXp, isMuted, fireConfetti]);

  const showPraise = useCallback(() => {
    setPraise(PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)]);
    if (praiseTimer.current) clearTimeout(praiseTimer.current);
    praiseTimer.current = setTimeout(() => setPraise(null), 2600);
  }, []);

  const isChapterMastered = useCallback((secIdx: number) => {
    const sec = book.sections[secIdx];
    if (!sec || !sec.activities || sec.activities.length === 0) return false;
    return sec.activities.every(a => completedActivities[a.id]);
  }, [book.sections, completedActivities]);

  const handleActivityComplete = useCallback((actId: string, points: number) => {
    setCompletedActivities(prev => {
      if (prev[actId]) return prev;
      return { ...prev, [actId]: true };
    });
    setEarnedXp(x => x + (points || 20));
    setStreak(s => s + 1);
    if (!isMuted) { playQuestDing(); playStarShower(); }
    fireConfetti();
    showPraise();
  }, [isMuted, fireConfetti, showPraise]);

  /* ── LEAF TURN ENGINE ── */
  const finalizeTurn = useCallback((dir: 'next' | 'prev') => {
    rotation.set(0);
    setTurning(null);
    peekRef.current = null;
    setPeek(null);
    busyRef.current = false;
    setCurrentSpread(s => {
      const next = dir === 'next' ? Math.min(s + 1, totalSpreads - 1) : Math.max(s - 1, 0);
      setIsClosed(next === 0 || next === totalSpreads - 1);
      return next;
    });
  }, [totalSpreads, rotation]);

  const beginTurn = useCallback((dir: 'next' | 'prev', duration = 0.85) => {
    if (busyRef.current || turning) return;
    if (dir === 'next' && currentSpread >= totalSpreads - 1) return;
    if (dir === 'prev' && currentSpread <= 0) return;
    busyRef.current = true;
    peekRef.current = null;
    setPeek(null);
    /* Covers are whole-surface states rather than 3D leaves, so opening or
       shutting the book plays a quick, gentle reveal instead of a page curl. */
    if (currentSpread === 0 || currentSpread === totalSpreads - 1) {
      if (!isMuted) playPageTurnSound();
      setTurning(dir);
      window.setTimeout(() => finalizeTurn(dir), 600);
      return;
    }
    if (!isMuted) playPageTurnSound();
    rotation.set(dir === 'next' ? 0 : -180);
    setTurning(dir);
    animate(rotation, dir === 'next' ? -180 : 0, {
      duration,
      ease: [0.32, 0.72, 0.24, 1],
      onComplete: () => finalizeTurn(dir),
    });
  }, [currentSpread, totalSpreads, turning, isMuted, rotation, finalizeTurn]);

  const jumpToSpread = useCallback((idx: number) => {
    if (idx === currentSpread) { setIsTocOpen(false); return; }
    if (busyRef.current || turning) return;
    setIsTocOpen(false);
    busyRef.current = true;
    const dir: 'next' | 'prev' = idx > currentSpread ? 'next' : 'prev';
    if (!isMuted) playPageTurnSound();
    /* Jumping to a cover is a soft reveal, not a 3D leaf curl (covers are whole-surface). */
    if (idx === 0 || idx === totalSpreads - 1) {
      setTurning(dir);
      window.setTimeout(() => {
        rotation.set(0);
        setTurning(null);
        peekRef.current = null;
        setPeek(null);
        busyRef.current = false;
        const target = Math.max(0, Math.min(idx, totalSpreads - 1));
        setCurrentSpread(target);
        setIsClosed(target === 0 || target === totalSpreads - 1);
      }, 520);
      return;
    }
    rotation.set(dir === 'next' ? 0 : -180);
    setTurning(dir);
    animate(rotation, dir === 'next' ? -180 : 0, {
      duration: 0.55,
      ease: [0.32, 0.72, 0.24, 1],
      onComplete: () => {
        rotation.set(0);
        setTurning(null);
        busyRef.current = false;
        const nextSpread = Math.max(0, Math.min(idx, totalSpreads - 1));
        setCurrentSpread(nextSpread);
        setIsClosed(nextSpread === 0 || nextSpread === totalSpreads - 1);
      },
    });
  }, [currentSpread, turning, isMuted, rotation, totalSpreads]);

  /* ── EDGE-ONLY DRAG ──
     Deliberately no hover curl: hover transforms steal width from the page and
     make teacher screen-sharing and activity interaction unreliable. */
  const EDGE = 58;
  const INTERACTIVE = 'button,a,input,textarea,select,.opt,.chip,.mem-card,.pair-btn,.sort-item,.bucket,.mood,.lyric,.fc,[data-say]';
  const canTurn = (dir: 'next' | 'prev') =>
    dir === 'next' ? currentSpread < totalSpreads - 1 : currentSpread > 0;
  const edgeDir = (clientX: number): 'next' | 'prev' | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    const x = clientX - rect.left;
    if (x < EDGE) return 'prev';
    if (x > rect.width - EDGE) return 'next';
    return null;
  };
  const isInteractiveEl = (t: EventTarget | null) => !!(t instanceof Element && t.closest(INTERACTIVE));

  const endPeekNow = () => {
    if (!peekRef.current) return;
    peekRef.current = null;
    rotation.set(0);
    setPeek(null);
  };
  const endPeek = useCallback(() => {
    if (dragRef.current?.active || busyRef.current || turning) return;
    const p = peekRef.current;
    if (!p) return;
    const rest = p === 'next' ? 0 : -180;
    animate(rotation, rest, {
      duration: 0.22,
      ease: 'easeOut',
      onComplete: () => { peekRef.current = null; setPeek(null); rotation.set(0); },
    });
  }, [turning, rotation]);

  const onStagePointerMove = (_e?: React.PointerEvent) => {
    /* Keep pointer movement inert unless a drag has started at an edge. */
    if (peekRef.current) endPeekNow();
  };
  const onStagePointerLeave = () => {
    if (!dragRef.current?.active && !turning) endPeek();
  };

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (isInteractiveEl(e.target)) return;
    if (isEditMode || busyRef.current || turning) return;
    const dir = edgeDir(e.clientX);
    if (!dir || !canTurn(dir)) return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const isNarrow = window.innerWidth < 768;
    const pageW = isNarrow ? rect.width : rect.width / 2;
    endPeekNow();
    /* Pending drag: a turn only engages after real movement, so plain clicks
       on (or near) activity elements always pass through untouched. */
    dragRef.current = { active: true, started: false, dir, startX: e.clientX, startY: e.clientY, pageW, lastX: e.clientX, lastT: performance.now(), vel: 0 };
  };

  const onStagePointerMoveDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !d.active) return;
    if (!d.started) {
      if (Math.abs(e.clientX - d.startX) < 8 && Math.abs(e.clientY - d.startY) < 8) return;
      if (!canTurn(d.dir)) { dragRef.current = null; return; }
      d.started = true;
      try { stageRef.current?.setPointerCapture(e.pointerId); } catch { /* noop */ }
      if (!isMuted) playPaperWhoosh(0.5);
      rotation.set(d.dir === 'next' ? 0 : -180);
      setTurning(d.dir);
    }
    const now = performance.now();
    d.vel = (e.clientX - d.lastX) / Math.max(1, now - d.lastT);
    d.lastX = e.clientX;
    d.lastT = now;
    const delta = e.clientX - d.startX;
    const raw = d.dir === 'next'
      ? (delta / d.pageW) * 180
      : -180 + (delta / d.pageW) * 180;
    rotation.set(Math.min(0, Math.max(-180, raw)));
  };

  const onStagePointerUp = () => {
    const d = dragRef.current;
    if (!d || !d.active) return;
    dragRef.current = null;
    if (!d.started) return; /* plain click — never hijack it */
    const deg = rotation.get();
    const flick = d.dir === 'next' ? d.vel < -0.45 : d.vel > 0.45;
    const complete = Math.abs(deg) > 92 || flick;
    busyRef.current = true;
    const target = complete ? (d.dir === 'next' ? -180 : 0) : (d.dir === 'next' ? 0 : -180);
    if (complete && !isMuted) { playPaperFlick(1); playPaperSettle(); }
    animate(rotation, target, {
      duration: 0.45,
      ease: [0.3, 0.7, 0.3, 1],
      onComplete: () => {
        if (complete) finalizeTurn(d.dir);
        else { rotation.set(d.dir === 'next' ? 0 : -180); setTurning(null); busyRef.current = false; }
      },
    });
  };

  /* Keyboard navigation */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditMode) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); beginTurn('next'); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); beginTurn('prev'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beginTurn, isEditMode]);

  const handleReadAloudCurrentSpread = () => {
    playClick();
    const pos = currentSpread;
    if (pos === 0) {
      speakCharacter(`${book.title}. ${book.subtitle}. This magical flipbook belongs to a wonderful learner!`, book.mascot.azureVoice, 1.2, 1.0);
      return;
    }
    if (pos === totalSpreads - 1) {
      speakCharacter(book.backCoverBlurb || 'The end! What a wonderful adventure!', book.mascot.azureVoice, 1.1, 1.0);
      return;
    }
    const L = leftLinearOf(pos);
    if (L === EXIT_LINEAR || L + 1 === EXIT_LINEAR) {
      speakCharacter(book.exitTicket.prompt, book.mascot.azureVoice, 1.1, 1.0);
      return;
    }
    const chap = CHAPTER_PAGE_IDX.find(c => c.linear === L || c.linear + 1 === L);
    if (chap && book.sections[chap.sec]) {
      const sec = book.sections[chap.sec];
      speakCharacter(sec.readAloudText || sec.content, sec.dialogues?.[0]?.azureVoice, 1.0, 0.95);
      return;
    }
    if (L === 0) {
      speakCharacter(`Welcome, ${learnerName}! Let's begin the quest. ${book.learningObjectives[0] || ''}`, book.mascot.azureVoice, 1.15, 1.0);
    } else if (L === 2) {
      speakCharacter(`Meet your hero team! ${book.characters[0]?.name || 'Brave explorer'} and loyal companion ${book.mascot.name} are ready for the quest!`, book.characters[0]?.azureVoice || 'en-US-AnaNeural', 1.25, 1.0);
    } else if (L === 4) {
      const vocabWords = book.vocabulary.map(v => `${v.word}: ${v.meaning}`).join('. ');
      speakCharacter(`Magic words. ${vocabWords}`, book.characters[0]?.azureVoice || 'en-US-AnaNeural', 1.0, 0.95);
    } else {
      speakCharacter(`Exploring ${book.title}!`, book.mascot.azureVoice, 1.1, 1.0);
    }
  };

  /* ── EDIT MODE ACTIONS ── */
  const handleSaveEdits = () => {
    playMagicSpell();
    onUpdateBook?.(book);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleUpdateSection = (idx: number, updated: Partial<LessonSection>) => {
    const newSections = [...book.sections];
    newSections[idx] = { ...newSections[idx], ...updated };
    setBook({ ...book, sections: newSections });
    onUpdateBook?.({ ...book, sections: newSections });
  };

  const handleDeleteActivity = (sectionIdx: number, activityIdx: number) => {
    playClick();
    const sec = book.sections[sectionIdx];
    if (!sec?.activities) return;
    sec.activities = sec.activities.filter((_, i) => i !== activityIdx);
    const updated = { ...book, sections: [...book.sections] };
    setBook(updated);
    onUpdateBook?.(updated);
  };

  const handleAddActivity = (sectionIdx: number, type: ActivityType) => {
    playQuestDing();
    const sec = book.sections[sectionIdx];
    if (!sec) return;
    const newAct: LessonActivity = {
      id: `act-custom-${Date.now()}`,
      type,
      prompt: `Try this game: ${type}`,
      points: 25,
      options: ['Option A ✨', 'Option B 🌟', 'Option C 💎', 'Option D 🚀'],
      correctAnswer: 'Option A ✨',
      feedbackCorrect: 'Brilliant work! You solved it!',
      feedbackIncorrect: 'Try again!'
    };
    sec.activities = [...(sec.activities || []), newAct];
    const updated = { ...book, sections: [...book.sections] };
    setBook(updated);
    onUpdateBook?.(updated);
  };

  /* ═══════════════════════════════════════════════════════════
     PAGE RENDERERS — each Content Type is art-directed differently.
     Plain functions (not components) so page state never remounts.
     ═══════════════════════════════════════════════════════════ */
  const learnerName = book.title.split("'s")[0] || 'Champion';
  const LINEAR_LABEL: string[] = ['Welcome', 'Your Map', 'Your Team', 'Word Game', 'Magic Words'];
  book.sections.forEach((s, i) => {
    LINEAR_LABEL.push(`Chapter ${i + 1} · ${s.title}`);
    LINEAR_LABEL.push(`Chapter ${i + 1} · ${s.title} Game`);
  });
  LINEAR_LABEL.push('Final Game', 'Your Prize', 'Teacher Help');
  const spreadLabel = (pos: number): string => {
    if (pos === 0) return 'Front Cover';
    if (pos === totalSpreads - 1) return 'Back Cover';
    const L = leftLinearOf(pos);
    return LINEAR_LABEL[L] || LINEAR_LABEL[L + 1] || 'Page';
  };

  const paperPage = (key: string, children: React.ReactNode) => (
    <div key={key} className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-[#fbf5e8] magic-scroll px-5 sm:px-12 py-8 sm:py-12 text-[1.35rem] sm:text-[1.65rem] leading-relaxed">
      {children}
    </div>
  );

  const renderCover = () => (
    <div className="relative h-full w-full overflow-hidden rounded-r-[14px]">
      {book.coverImageUrl && (
        <img src={book.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/75 via-indigo-900/60 to-purple-950/85" />
      <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_30%_20%,rgba(255,215,120,0.55),transparent_55%)]" />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-6 gap-2.5">
        <span className="text-5xl drop-shadow-lg">📖✨</span>
        {book.contentType && (
          <span className="px-3 py-1 rounded-full bg-amber-300/90 text-purple-950 text-[11px] font-black uppercase tracking-widest shadow">{book.contentType}</span>
        )}
        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight drop-shadow-md" style={{ fontFamily: 'Georgia, serif' }}>{book.title}</h1>
        <p className="text-amber-100/90 text-xs sm:text-sm font-bold max-w-[26ch]">{book.subtitle}</p>
        <div className="flex items-center gap-2 mt-1 text-[11px] font-black text-amber-200">
          <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/25">{book.level}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/25">⏱ {book.estimatedMinutes} min</span>
          <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/25">⭐ {book.xpTotal} XP</span>
        </div>
        <div className="flex -space-x-2 mt-2">
          {book.characters.map(c => (
            <span key={c.name} className="w-9 h-9 rounded-full bg-white/90 border-2 border-amber-200 flex items-center justify-center text-lg shadow" title={c.name}>{c.emoji}</span>
          ))}
        </div>
        <p className="mt-2 text-amber-200/95 text-[11px] font-black animate-pulse tracking-wide">Drag the page edge to open ›</p>
      </div>
    </div>
  );

  const renderBookplate = () => (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-2">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 border-4 border-white shadow-xl flex items-center justify-center text-5xl">{book.learnerAvatarEmoji}</div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-purple-400">This magical flipbook belongs to</p>
        <p className="text-2xl font-black text-purple-900 mt-1" style={{ fontFamily: 'Georgia, serif' }}>{learnerName}</p>
      </div>
      <div className="px-4 py-2.5 rounded-2xl bg-purple-50 border-2 border-dashed border-purple-200 flex items-center gap-2">
        <span className="text-2xl">{book.learnerPetEmoji}</span>
        <span className="text-xs font-bold text-purple-700">Travels everywhere with {book.mascot.emoji} {book.mascot.name}</span>
      </div>
      <button
        data-say
        onClick={() => { playClick(); speakCharacter(`Welcome, ${learnerName}! I am ${book.mascot.name}. Open the book and let the quest begin!`, book.mascot.azureVoice, 1.2, 1.0); }}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white text-xs font-black shadow-lg hover:brightness-110 flex items-center gap-1.5"
      >
        <Volume2 className="w-3.5 h-3.5" /> {book.mascot.name} says hello
      </button>
      <p className="text-[10px] font-bold text-slate-400">My Quest Book • Start Level 1</p>
    </div>
  );

  const renderQuestMap = () => (
    <div className="h-full flex flex-col gap-2">
      <h2 className="text-3xl sm:text-4xl font-black text-purple-900 flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}><Sparkles className="w-4 h-4 text-amber-500" /> Your Map</h2>
      <p className="text-[11px] font-bold text-slate-500">{book.learningObjectives.length} goals • {book.sections.length} chapters to play</p>
      <div className="mt-1 space-y-1.5">
        {book.learningObjectives.slice(0, 4).map((o, i) => (
          <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-xl bg-white/70 border border-purple-100">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">{o}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200">
        <p className="text-xl font-black text-amber-950">🏆 You will be able to:</p>
        <p className="text-lg sm:text-xl font-bold text-amber-950 leading-snug">{book.successCriteria.slice(0, 2).join(' • ')}</p>
      </div>
      <button
        onClick={() => { playClick(); beginTurn('next'); }}
        className="mt-auto mx-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-xs font-black shadow-lg hover:brightness-110 flex items-center gap-2"
      >
        Meet the Heroes <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  const renderHeroes = () => (
    <div className="h-full flex flex-col gap-2.5">
      <h2 className="text-3xl sm:text-4xl font-black text-purple-900" style={{ fontFamily: 'Georgia, serif' }}>🦸 Your Hero Team</h2>
      <div className="grid grid-cols-2 gap-2">
        {book.characters.slice(0, 4).map(c => (
          <div key={c.name} className="p-2.5 rounded-2xl bg-white/80 border-2 border-purple-100 shadow-sm flex flex-col items-center text-center gap-1">
            <span className="text-3xl">{c.emoji}</span>
            <p className="text-xl font-black text-purple-950 leading-tight">{c.name}</p>
            <p className="text-base sm:text-lg font-bold text-purple-950 uppercase tracking-wide">{c.archetype}</p>
            <button
              data-say
              onClick={() => { playClick(); speakCharacter(`Hello ${learnerName}! I am ${c.name}, your ${c.archetype}. ${c.dialogueStyle}.`, c.azureVoice, c.pitch || 1, c.rate || 1); }}
              className="mt-auto px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-[10px] font-black hover:bg-purple-200 flex items-center gap-1"
            >
              <Volume2 className="w-3 h-3" /> Say hi
            </button>
          </div>
        ))}
      </div>
      <div className="p-3 rounded-2xl bg-gradient-to-r from-fuchsia-100 via-purple-100 to-indigo-100 border-2 border-purple-200 flex items-center gap-3">
        <span className="text-3xl">{book.mascot.emoji}</span>
        <div>
          <p className="text-xs font-black text-purple-900">{book.mascot.name} — your guide</p>
          <p className="text-[10px] font-bold text-purple-600 leading-snug">{book.mascot.personality}</p>
        </div>
      </div>
    </div>
  );

  const renderMemoryLab = () => (
    <div className="h-full flex flex-col justify-center gap-3 px-2">
      <span className="text-4xl">🧪✨</span>
      <h2 className="text-xl font-black text-teal-800" style={{ fontFamily: 'Georgia, serif' }}>Word Game Lab</h2>
      <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed">Here are your {book.vocabulary.length} magic words. Hear them, say them, and use them in the games!</p>
      <div className="space-y-1.5">
        {['🎧 Tap the speaker to hear each word', '🗣️ Say the word out loud', '🧠 Recall it in the chapter games'].map((t, i) => (
          <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-teal-50 border border-teal-100">
            <span className="text-xs font-bold text-teal-800">{t}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 rounded-2xl bg-amber-50 border border-amber-200">
        <p className="text-[11px] font-bold text-amber-700">😺 {book.mascot.catchphrases[1] || book.mascot.catchphrases[0]}</p>
      </div>
    </div>
  );

  const voiceFor = (speaker?: string) => {
    const c = book.characters.find(ch => ch.name === speaker);
    return c ? { voice: c.azureVoice, pitch: c.pitch, rate: c.rate } : { voice: book.mascot.azureVoice, pitch: 1.15, rate: 1 };
  };

  const renderVocabCards = () => (
    <div className="h-full flex flex-col gap-2">
      <h2 className="text-base font-black text-teal-800">🔮 Magic Words</h2>
      <div className="grid grid-cols-1 gap-1.5">
        {book.vocabulary.map(v => (
          <div key={v.word} className="p-2 rounded-xl bg-white/85 border border-teal-100 shadow-sm flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-xl shrink-0">{v.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-800 truncate">{v.word} {v.phonetic && <span className="text-slate-400 font-bold">/{v.phonetic}/</span>}</p>
              <p className="text-[10px] font-bold text-slate-500 truncate">{v.meaning}</p>
            </div>
            <button
              data-say
              onClick={() => { playClick(); const vv = voiceFor(v.speakerCharacter); azureSpeakText(v.audioPronunciationText || `${v.word}. ${v.example}.`, vv.voice, vv.pitch, vv.rate); }}
              className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center shadow hover:scale-110 transition-transform shrink-0"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderChapterLeft = (secIdx: number) => {
    const sec = book.sections[secIdx];
    if (!sec) return null;
    return (
      <div className="h-full flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white flex items-center justify-center text-xl shadow">{sec.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-black uppercase tracking-widest text-purple-400">Chapter {secIdx + 1} • {sec.duration} min</p>
            <h2 className="text-base font-black text-purple-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>{sec.title}</h2>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-base font-black text-amber-800">🎯 Goal: <span className="font-bold text-amber-700">{sec.objective}</span></p>
        </div>
        {sec.imageUrl && (
          <img src={sec.imageUrl} alt="" className="w-full h-24 object-cover rounded-xl border-2 border-white shadow" onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }} />
        )}
        <p className="text-lg sm:text-xl font-bold text-slate-700 leading-relaxed whitespace-pre-line flex-1">{sec.content}</p>
        {sec.dialogues && sec.dialogues.length > 0 && (
          <div className="space-y-1.5">
            {sec.dialogues.slice(0, 3).map((d, i) => {
              const vv = voiceFor(d.azureVoice ? undefined : d.speaker);
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-lg shrink-0">{d.emoji}</span>
                  <div className="flex-1 p-2 rounded-2xl rounded-tl-sm bg-indigo-50/90 border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-500">{d.speaker}</p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">{d.text}</p>
                  </div>
                  <button
                    data-say
                    onClick={() => { playClick(); azureSpeakText(d.text, d.azureVoice || vv.voice, vv.pitch, vv.rate); }}
                    className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 hover:scale-110 transition-transform"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderChapterRight = (secIdx: number) => {
    const sec = book.sections[secIdx];
    if (!sec) return null;
    return (
      <div className="h-full flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <p className="text-base sm:text-lg font-black uppercase tracking-widest text-fuchsia-500">🎮 Try the Game</p>
          {isChapterMastered(secIdx) && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] font-black text-amber-700">⭐ Chapter Done!</span>
          )}
        </div>
        <div className="space-y-2.5 flex-1">
          {(sec.activities || []).map((a, ai) => (
            <div key={a.id} className="relative p-2.5 rounded-2xl bg-white/85 border-2 border-slate-100 shadow-sm">
              {isEditMode && (
                <button
                  onClick={() => handleDeleteActivity(secIdx, ai)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow hover:bg-rose-600 z-10"
                  title="Delete activity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span>{a.emoji || '🎮'}</span>
                <p className="text-xs font-black text-slate-800">{a.title || a.prompt}</p>
                {completedActivities[a.id] && <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
              </div>
              <ActivityRenderer
                activity={a}
                isCompleted={!!completedActivities[a.id]}
                onComplete={(pts) => handleActivityComplete(a.id, pts)}
              />
            </div>
          ))}
        </div>
        {isEditMode && (
          <select
            value=""
            onChange={(e) => { if (e.target.value) handleAddActivity(secIdx, e.target.value as ActivityType); }}
            className="w-full px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-black shadow"
          >
            <option value="">➕ Add a game…</option>
            {ACTIVITY_DEFINITIONS.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.label}</option>)}
          </select>
        )}
      </div>
    );
  };

  const renderExit = () => (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🎟️</span>
        <div>
          <h2 className="text-base font-black text-purple-900">Final Game</h2>
          <p className="text-[10px] font-bold text-slate-500">One last game to win your prize!</p>
        </div>
      </div>
      <div className="p-2 rounded-2xl bg-white/85 border-2 border-slate-100 shadow-sm">
        <ActivityRenderer
          activity={book.exitTicket}
          isCompleted={!!completedActivities[book.exitTicket.id]}
          onComplete={(pts) => handleActivityComplete(book.exitTicket.id, pts)}
        />
      </div>
      <div className="px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-100 to-yellow-50 border border-amber-200 mt-auto">
        <p className="text-[11px] font-bold text-amber-700">😺 {book.mascot.catchphrases[2] || book.mascot.catchphrases[0]}</p>
      </div>
    </div>
  );

  const doneCount = Object.keys(completedActivities).length;
  const totalActs = book.sections.reduce((n, s) => n + (s.activities?.length || 0), 0) + 1;
  const renderCertificate = () => (
    <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-2">
      <div className="w-full p-4 rounded-2xl border-4 border-double border-amber-400 bg-gradient-to-br from-amber-50 via-white to-amber-50 shadow-inner">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">My Learning Prize</p>
        <span className="text-4xl block my-1">🏆</span>
        <p className="text-3xl sm:text-4xl font-black text-purple-900" style={{ fontFamily: 'Georgia, serif' }}>{learnerName}</p>
        <p className="text-[11px] font-bold text-slate-600 mt-1">finished the Flipbook</p>
        <p className="text-xs font-black text-purple-700">{book.title}</p>
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          <div className="p-1.5 rounded-xl bg-purple-50 border border-purple-100"><p className="text-sm font-black text-purple-700">{earnedXp}</p><p className="text-[9px] font-bold text-purple-400">XP</p></div>
          <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-100"><p className="text-sm font-black text-amber-600">Lv {level}</p><p className="text-[9px] font-bold text-amber-400">Level</p></div>
          <div className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-100"><p className="text-sm font-black text-emerald-600">{doneCount}/{totalActs}</p><p className="text-[9px] font-bold text-emerald-400">Quests</p></div>
        </div>
        <p className="text-[9px] font-bold text-slate-400 mt-2">🔥 Best streak: {bestStreak} • {new Date().toLocaleDateString()}</p>
      </div>
      <button
        onClick={() => { playTrophyUnlock(); window.print(); }}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-lg hover:brightness-110 flex items-center gap-1.5"
      >
        🖨️ Print my certificate
      </button>
    </div>
  );

  const renderNotes = () => (
    <div className="h-full flex flex-col gap-2">
      <h2 className="text-base font-black text-purple-900 flex items-center gap-2"><Edit3 className="w-4 h-4 text-purple-400" /> Teacher Help</h2>
      <div className="space-y-1.5">
        {book.teacherNotes.map((n, i) => (
          <div key={i} className="p-2 rounded-xl bg-white/80 border border-purple-100 text-[11px] font-bold text-slate-600 leading-snug">{n}</div>
        ))}
      </div>
      <div className="mt-auto p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
        <p className="text-[10px] font-black text-slate-500">🗣️ Voices:</p>
        <p className="text-[10px] font-bold text-slate-400">Voice help: your teacher can turn on natural voices in the studio.</p>
      </div>
    </div>
  );

  const renderBackCover = () => (
    <div className="relative h-full flex flex-col items-center justify-center text-center gap-3 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-50 to-white" />
      <span className="relative text-5xl">{book.mascot.emoji}</span>
      <p className="relative text-3xl sm:text-4xl font-black text-purple-900" style={{ fontFamily: 'Georgia, serif' }}>The End… or a new beginning?</p>
      <p className="relative text-xs font-bold text-slate-600 max-w-[30ch] leading-relaxed">{book.backCoverBlurb || `${learnerName}, every word you learned made your magic stronger. Close the book — and keep speaking brave English every day!`}</p>
      <div className="relative flex -space-x-2">
        {book.characters.map(c => <span key={c.name} className="w-8 h-8 rounded-full bg-white border-2 border-amber-200 flex items-center justify-center text-base shadow">{c.emoji}</span>)}
      </div>
      <p className="relative text-[10px] font-black tracking-[0.3em] text-purple-300 uppercase">✦ {book.mascot.name} ✦ {book.level} ✦</p>
    </div>
  );

  /* Whole-surface covers shown when the book is closed. These sit on top of the
     book and lift away gently when opened, so the front cover is "on top" and the
     final flip closes back onto the back cover. */
  const renderFullCover = () => (
    <div className="relative h-full w-full overflow-hidden">
      {book.coverImageUrl && (
        <img src={book.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/80 via-indigo-900/65 to-purple-950/90" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,rgba(255,215,120,0.5),transparent_55%)]" />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-8 gap-3">
        <span className="text-5xl drop-shadow-lg">📖✨</span>
        {book.contentType && (
          <span className="px-3 py-1 rounded-full bg-amber-300/90 text-purple-950 text-[11px] font-black uppercase tracking-widest shadow">{book.contentType}</span>
        )}
        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight drop-shadow-md" style={{ fontFamily: 'Georgia, serif' }}>{book.title}</h1>
        <p className="text-amber-100/90 text-xs sm:text-sm font-bold max-w-[32ch]">{book.subtitle}</p>
        <div className="flex items-center gap-2 mt-1 text-[11px] font-black text-amber-200">
          <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/25">{book.level}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/25">⏱ {book.estimatedMinutes} min</span>
          <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/25">⭐ {book.xpTotal} XP</span>
        </div>
        <div className="flex -space-x-2 mt-1">
          {book.characters.map(c => (
            <span key={c.name} className="w-9 h-9 rounded-full bg-white/90 border-2 border-amber-200 flex items-center justify-center text-lg shadow" title={c.name}>{c.emoji}</span>
          ))}
        </div>
        <p className="mt-2 text-amber-200/95 text-[11px] font-black animate-pulse tracking-wide">Drag the page edge to open ›</p>
      </div>
    </div>
  );

  const renderFullBackCover = () => (
    <div className="relative h-full flex flex-col items-center justify-center text-center gap-3 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-600 via-indigo-700 to-purple-900" />
      <span className="relative text-5xl">{book.mascot.emoji}</span>
      <p className="relative text-lg font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>The End… or a new beginning?</p>
      <p className="relative text-xs font-bold text-indigo-100 max-w-[34ch] leading-relaxed">{book.backCoverBlurb || `${learnerName}, every word you learned made your magic stronger. Close the book — and keep speaking brave English every day!`}</p>
      <div className="relative flex -space-x-2 mt-1">
        {book.characters.map(c => <span key={c.name} className="w-8 h-8 rounded-full bg-white border-2 border-amber-200 flex items-center justify-center text-base shadow">{c.emoji}</span>)}
      </div>
      <p className="relative text-[10px] font-black tracking-[0.3em] text-indigo-200 uppercase">✦ {book.mascot.name} ✦ {book.level} ✦</p>
    </div>
  );

  /* spread (position) → left / right content, with covers as whole-surface nodes */
  const linearPages: React.ReactNode[] = [
    renderBookplate(), renderQuestMap(), renderHeroes(), renderMemoryLab(), renderVocabCards()
  ];
  book.sections.forEach((_, i) => {
    linearPages.push(renderChapterLeft(i));
    linearPages.push(renderChapterRight(i));
  });
  linearPages.push(renderExit(), renderCertificate(), renderNotes());

  const nodesFor = (pos: number): { left: React.ReactNode; right: React.ReactNode } => {
    if (pos === 0) return { left: null, right: renderFullCover() };
    if (pos === totalSpreads - 1) return { left: null, right: renderFullBackCover() };
    const L = leftLinearOf(pos);
    return { left: linearPages[L], right: linearPages[L + 1] };
  };

  const isTurningNext = turning === 'next' || peek === 'next';
  const isTurningPrev = turning === 'prev' || peek === 'prev';
  /* While a cover is closed we lay the neighbouring spread underneath so the cover
     can lift away onto it. */
  const isCoverPos = currentSpread === 0 || currentSpread === totalSpreads - 1;
  const underPos = isCoverPos ? (currentSpread === 0 ? 1 : openCount) : currentSpread;
  const leftContent = isTurningPrev ? nodesFor(currentSpread - 1).left : nodesFor(underPos).left;
  const rightContent = isTurningNext ? nodesFor(currentSpread + 1).right : nodesFor(underPos).right;
  const leafFront = isTurningPrev ? nodesFor(currentSpread - 1).right : nodesFor(underPos).right;
  const leafBack = isTurningNext ? nodesFor(currentSpread + 1).left : nodesFor(underPos).left;
  const isFrontClosed = isCoverPos && currentSpread === 0;
  const isBackClosed = isCoverPos && currentSpread === totalSpreads - 1;
  const leavingCover = isCoverPos && !!turning;

  return (
    <div ref={readerRef} className={`flipbook-reader min-h-screen bg-[radial-gradient(ellipse_at_top,#ede9fe_0%,#f5f3ff_45%,#faf5ff_100%)] py-4 px-3 flex flex-col ${isFullscreen ? 'flipbook-reader-fullscreen' : ''} ${isClosed ? 'flipbook-closed' : ''} ${isEditMode ? 'flipbook-editing' : ''}`}>
      {/* ── TOP CHROME ── */}
      <div className="top-chrome max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => { playClick(); onBackToStudio(); }} className="p-2 rounded-xl bg-white/80 border border-purple-100 text-purple-700 shadow-sm hover:bg-white" title="Back to studio"><ArrowLeft className="w-4 h-4" /></button>
          <div className="min-w-0">
            <p className="text-sm font-black text-purple-900 truncate" style={{ fontFamily: 'Georgia, serif' }}>📖 {book.title}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-amber-600">Lv {level}</span>
              <div className="w-20 sm:w-28 h-1.5 rounded-full bg-purple-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-fuchsia-500 transition-all" style={{ width: `${levelProgress}%` }} />
              </div>
              <span className="text-[10px] font-black text-purple-400">{earnedXp} XP</span>
              <span className="text-[10px] font-black text-orange-500">🔥 {streak}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { playClick(); setIsTocOpen(v => !v); }} className="p-2 rounded-xl bg-white/80 border border-purple-100 text-purple-700 shadow-sm hover:bg-white" title="Table of contents"><List className="w-4 h-4" /></button>
          {isClosed && currentSpread === 0 && <span className="px-2 py-1 rounded-lg bg-white/80 border border-purple-100 text-[11px] font-black text-purple-700">Closed • Front Cover</span>}
          {isClosed && currentSpread === totalSpreads - 1 && <span className="px-2 py-1 rounded-lg bg-white/80 border border-purple-100 text-[11px] font-black text-purple-700">Closed • Back Cover</span>}
          <button onClick={() => { playClick(); const el = readerRef.current; if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.(); }} className="p-2 rounded-xl bg-white/80 border border-purple-100 text-purple-700 shadow-sm hover:bg-white" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}><Maximize2 className="w-4 h-4" /></button>
          <button onClick={() => { setIsMuted(m => !m); if (isMuted) playClick(); }} className={`p-2 rounded-xl border shadow-sm ${isMuted ? 'bg-slate-200 text-slate-500 border-slate-300' : 'bg-white/80 border-purple-100 text-purple-700 hover:bg-white'}`} title={isMuted ? 'Unmute' : 'Mute'}>{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
          <button onClick={() => { playClick(); setIsEditMode(v => !v); }} className={`p-2 rounded-xl border shadow-sm ${isEditMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white/80 border-purple-100 text-purple-700 hover:bg-white'}`} title="Edit mode"><Edit3 className="w-4 h-4" /></button>
          {isEditMode && onUpdateBook && (
            <button onClick={handleSaveEdits} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black shadow hover:bg-emerald-700 flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save</button>
          )}
          <button onClick={() => { playMagicSpell(); onDownloadHtml(); }} className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-xs font-black shadow hover:brightness-110 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Save Standalone HTML</button>
        </div>
      </div>

      {/* ── BOOK STAGE ── */}
      <div
        ref={stageRef}
        className={`book-stage relative mx-auto w-full max-w-5xl h-[540px] sm:h-[640px] touch-pan-y select-none ${isFullscreen ? 'book-stage-fullscreen' : ''}`}
        style={{ perspective: 2600 }}
        onPointerDown={onStagePointerDown}
        onPointerMove={(e) => { onStagePointerMoveDrag(e); onStagePointerMove(e); }}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
        onPointerLeave={onStagePointerLeave}
      >
        <div className="absolute inset-0 rounded-[26px] bg-[#eadfc9] shadow-[0_45px_90px_-25px_rgba(76,29,149,0.35)] p-[9px]">
          <div className="relative w-full h-full rounded-[18px] overflow-hidden bg-[#f6efdd] flex select-none">
            {/* left page */}
            <div className="relative w-1/2 h-full">
              {paperPage('left', leftContent)}
            </div>
            {/* right page */}
            <div className="relative w-1/2 h-full">
              {paperPage('right', rightContent)}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_2px,#78350f_3px)]" />
            </div>

            {/* THE TURNING LEAF — true two-faced 3D page. Covers are whole-surface
                states, so they animate via the overlay below instead of a leaf. */}
            {!!turning && !isCoverPos && (
              <motion.div
                className="absolute top-0 h-full z-30"
                style={{
                  left: '50%', width: '50%', rotateY: rotation,
                  transformStyle: 'preserve-3d', transformOrigin: 'left center',
                }}
              >
                <div className="absolute inset-0 overflow-hidden bg-[#fbf5e8] shadow-[10px_0_30px_rgba(0,0,0,0.18)]" style={{ backfaceVisibility: 'hidden' }}>
                  {leafFront}
                  <div className="absolute inset-y-0 left-0 w-10 pointer-events-none bg-gradient-to-r from-purple-950/15 to-transparent" />
                  <motion.div className="absolute inset-0 pointer-events-none bg-gradient-to-l from-black/25 to-transparent" style={{ opacity: leafShade }} />
                </div>
                <div className="absolute inset-0 overflow-hidden bg-[#fbf5e8]" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                  {leafBack}
                  <div className="absolute inset-y-0 right-0 w-10 pointer-events-none bg-gradient-to-l from-purple-950/15 to-transparent" />
                  <motion.div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/20 to-transparent" style={{ opacity: underShade }} />
                </div>
              </motion.div>
            )}

            {/* Edge hit areas are transparent: they enable dragging without
                painting a glow over lesson content. */}
            {canTurn('prev') && <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[58px] z-20 pointer-events-none" />}
            {canTurn('next') && <div aria-hidden="true" className="absolute inset-y-0 right-0 w-[58px] z-20 pointer-events-none" />}
          </div>
        </div>

        {/* Closed-book overlay: shows the front cover on top when shut, and lets the
            final flip shut the book back onto the back cover. Genuine full-surface. */}
        {(isFrontClosed || isBackClosed) && (
          <motion.div
            className="absolute inset-0 z-40 rounded-[26px] overflow-hidden pointer-events-none"
            initial={false}
            animate={leavingCover ? { opacity: 0, rotateY: isFrontClosed ? -125 : 125, scale: 1.05 } : { opacity: 1, rotateY: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0.24, 1] }}
            style={{ transformOrigin: isFrontClosed ? 'left center' : 'right center', transformStyle: 'preserve-3d', willChange: 'opacity, transform' }}
          >
            {isFrontClosed ? renderFullCover() : renderFullBackCover()}
          </motion.div>
        )}

      </div>

      {/* page footer */}
      <div className="page-footer flex items-center justify-center gap-2 mt-3">
        <button onClick={() => beginTurn('prev')} disabled={currentSpread <= 0 || !!turning} className="px-3 py-1.5 rounded-xl bg-white/85 border border-purple-100 text-purple-700 text-xs font-black shadow-sm hover:bg-white disabled:opacity-40 flex items-center gap-1"><ChevronLeft className="w-3.5 h-3.5" /> Prev</button>
        <span className="px-3 py-1.5 rounded-xl bg-white/85 border border-purple-100 text-[11px] font-black text-purple-700 shadow-sm">{spreadLabel(currentSpread)} • {currentSpread + 1}/{totalSpreads}</span>
        <button onClick={() => beginTurn('next')} disabled={currentSpread >= totalSpreads - 1 || !!turning} className="px-3 py-1.5 rounded-xl bg-white/85 border border-purple-100 text-purple-700 text-xs font-black shadow-sm hover:bg-white disabled:opacity-40 flex items-center gap-1">Next <ChevronRight className="w-3.5 h-3.5" /></button>
      </div>

      {/* ── TOC DRAWER ── */}
      <AnimatePresence>
        {isTocOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-purple-950/40 backdrop-blur-sm" onClick={() => setIsTocOpen(false)}>
            <motion.div initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }} transition={{ type: 'spring', damping: 26, stiffness: 260 }} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-[300px] bg-white shadow-2xl p-4 overflow-y-auto magic-scroll">
              <p className="text-sm font-black text-purple-900 mb-3" style={{ fontFamily: 'Georgia, serif' }}>📑 Contents</p>
              <div className="space-y-1">
                {Array.from({ length: totalSpreads }, (_, i) => (
                  <button key={i} onClick={() => jumpToSpread(i)} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${i === currentSpread ? 'bg-purple-600 text-white shadow' : 'hover:bg-purple-50 text-slate-700'}`}>
                    <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${i === currentSpread ? 'bg-white/25' : 'bg-purple-100 text-purple-600'}`}>{i + 1}</span>
                    <span className="truncate">{spreadLabel(i)}</span>
                    {i > 0 && i < totalSpreads - 1 && (() => {
                      const L = leftLinearOf(i);
                      const ch = CHAPTER_PAGE_IDX.find(c => c.linear === L || c.linear + 1 === L);
                      return ch ? isChapterMastered(ch.sec) : false;
                    })() && <span className="ml-auto text-amber-500">⭐</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MASCOT PRAISE TOAST ── */}
      <AnimatePresence>
        {praise && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-black shadow-2xl flex items-center gap-2">
            <span className="text-xl">{book.mascot.emoji}</span> {praise}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SAVE TOAST ── */}
      <AnimatePresence>
        {saveToast && (
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-xl flex items-center gap-2">
            <Check className="w-4 h-4" /> Book saved!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

