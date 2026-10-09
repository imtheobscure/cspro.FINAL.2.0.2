import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GamifiedThemeData, GamifiedDayContent, GamifiedQuizQuestion } from './gamifiedTypes';

/* ────────────────────────── tiny state store ────────────────────────── */

interface GState {
  points: number;
  fearMeter: number;
  completedDays: number[];
  unlockedDays: number[];
  badges: string[];
  cluesCollected: string[];
  mysteryBoxes: number;
  currentDay: number;
  tab: string;
  screen: 'game' | 'day';
  gramAns: Record<string, string>;
  gramChecked: Record<string, boolean>;
  cqAns: Record<number, Record<number, number>>;
  quizAns: Record<number, Record<number, number>>;
  listAns: Record<number, string>;
  listChecked: Record<number, boolean>;
  dictAns: Record<number, string>;
  dictChecked: Record<number, boolean>;
  dlgTurn: Record<number, number>;
  dlgChoice: Record<number, number>;
  spkIdx: Record<number, number>;
  spkResult: Record<number, Record<number, string>>;
  spkAcc: Record<number, Record<number, number>>;
  writeText: Record<number, string>;
  writeDone: Record<number, boolean>;
  bossQ: Record<number, number>;
  bossHP: Record<number, number>;
  bossScore: Record<number, number>;
  bossOver: Record<number, boolean>;
  bossAnswered: Record<number, boolean>;
  bossTimer: Record<number, number>;
  clueMatched: Record<number, number[]>;
  clueSel: Record<number, number | null>;
  foundGlitches: { day: number; idx: number }[];
  charVoices: Record<string, string>;
  showBlood: boolean;
  isShaking: boolean;
  showJumpScare: boolean;
  spkListening: boolean;
}

const DEFAULT_STATE: GState = {
  points: 0, fearMeter: 0, completedDays: [], unlockedDays: [0], badges: [], cluesCollected: [], mysteryBoxes: 0,
  currentDay: 0, tab: 'lesson', screen: 'game',
  gramAns: {}, gramChecked: {}, cqAns: {}, quizAns: {}, listAns: {}, listChecked: {}, dictAns: {}, dictChecked: {},
  dlgTurn: {}, dlgChoice: {}, spkIdx: {}, spkResult: {}, spkAcc: {}, writeText: {}, writeDone: {},
  bossQ: {}, bossHP: {}, bossScore: {}, bossOver: {}, bossAnswered: {}, bossTimer: {}, clueMatched: {}, clueSel: {},
  foundGlitches: [], charVoices: {}, showBlood: false, isShaking: false, showJumpScare: false, spkListening: false,
};

const useGamified = (lessonId: string, learnerName?: string, lessonTitle?: string, fileName?: string) => {
  const storageKey = `tutorly-gamified-${lessonId}`;
  const [state, setState] = useState<GState>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved) return { ...DEFAULT_STATE, ...saved };
    } catch { /* ignore */ }
    return { ...DEFAULT_STATE };
  });

  const set = useCallback((patch: Partial<GState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        const persist: Record<string, unknown> = { ...next };
        delete persist.screen; delete persist.tab; delete persist.currentDay;
        localStorage.setItem(storageKey, JSON.stringify(persist));
        // Mirror progress for the tutor dashboard (keyed by learner name).
        if (learnerName) {
          const KEY = `tutorly-gamified-progress-${learnerName}`;
          let list: any[] = [];
          try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { list = []; }
          const rec = {
            fileName: fileName || lessonId,
            title: lessonTitle || lessonId,
            points: next.points,
            fearMeter: next.fearMeter,
            completedDays: [...next.completedDays],
            unlockedDays: [...next.unlockedDays],
            badges: [...next.badges],
            cluesCollected: [...next.cluesCollected],
            mysteryBoxes: next.mysteryBoxes,
            updatedAt: new Date().toISOString(),
          };
          const others = list.filter((r: any) => r.fileName !== rec.fileName);
          others.unshift(rec);
          localStorage.setItem(KEY, JSON.stringify(others.slice(0, 20)));
        }
      } catch { /* ignore */ }
      return next;
    });
  }, [storageKey, learnerName, lessonTitle, fileName]);

  return { state, set };
};

/* ────────────────────────── sounds (Web Audio) ────────────────────────── */

let audioCtx: AudioContext | null = null;
const getCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

const playScream = () => {
  try {
    const c = getCtx(); const dur = 1.5; const n = c.sampleRate * dur;
    const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / c.sampleRate;
      const env = Math.exp(-t * 2) * (1 + 0.5 * Math.sin(t * 80));
      d[i] = ((Math.random() * 2 - 1) * 0.3 + Math.sin(t * 800 * (1 + Math.sin(t * 5) * 0.5)) * 0.5 + (Math.sin(t * 1200) * 0.3 + Math.sin(t * 400) * 0.5) * 0.2) * env * 0.7;
    }
    const s = c.createBufferSource(); s.buffer = b;
    const ws = c.createWaveShaper(); const curve = new Float32Array(256);
    for (let j = 0; j < 256; j++) { const x = (j * 2) / 256 - 1; curve[j] = (Math.PI + 50) * x / (Math.PI + 50 * Math.abs(x)); }
    ws.curve = curve; s.connect(ws); ws.connect(c.destination); s.start();
  } catch { /* audio unavailable */ }
};
const playBreathing = () => {
  try {
    const c = getCtx(); const dur = 3; const n = c.sampleRate * dur;
    const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / c.sampleRate; const bc = Math.sin(t * Math.PI * 1.5);
      d[i] = (((Math.random() * 2 - 1) * 0.3) * Math.abs(bc) + Math.sin(t * 60) * 0.15 * Math.abs(bc)) * 0.5;
    }
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
    s.connect(f); f.connect(c.destination); s.start();
  } catch { /* */ }
};
const playHeartbeat = (bpm = 90) => {
  try {
    const c = getCtx(); const iv = 60 / bpm; const dur = iv * 6; const n = c.sampleRate * dur;
    const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0);
    for (let beat = 0; beat < 6; beat++) {
      const bs = beat * iv * c.sampleRate;
      for (let i = 0; i < c.sampleRate * 0.15; i++) { const idx = Math.floor(bs + i); if (idx < n) { const t = i / c.sampleRate; d[idx] = Math.sin(t * 200) * Math.exp(-t * 30) * 0.6; } }
      const s2 = bs + c.sampleRate * 0.2;
      for (let k = 0; k < c.sampleRate * 0.1; k++) { const idx2 = Math.floor(s2 + k); if (idx2 < n) { const t2 = k / c.sampleRate; d[idx2] = Math.sin(t2 * 250) * Math.exp(-t2 * 40) * 0.4; } }
    }
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 150;
    const g = c.createGain(); g.gain.value = 1.5; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  } catch { /* */ }
};
const playHorrorDrone = (dur = 5) => {
  try {
    const c = getCtx();
    const o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator(), g = c.createGain();
    o1.type = 'sawtooth'; o1.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 57; o3.type = 'triangle'; o3.frequency.value = 110;
    g.gain.value = 0; g.gain.linearRampToValueAtTime(0.15, c.currentTime + 1); g.gain.linearRampToValueAtTime(0, c.currentTime + dur);
    o1.connect(g); o2.connect(g); o3.connect(g); g.connect(c.destination);
    o1.start(); o2.start(); o3.start(); o1.stop(c.currentTime + dur); o2.stop(c.currentTime + dur); o3.stop(c.currentTime + dur);
  } catch { /* */ }
};
const playSuccess = () => {
  try {
    const c = getCtx();
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.3; g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.15 + 0.5);
      o.connect(g); g.connect(c.destination); o.start(c.currentTime + i * 0.15); o.stop(c.currentTime + i * 0.15 + 0.5);
    });
  } catch { /* */ }
};
const playWrong = () => {
  try {
    const c = getCtx(); const o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = 150; g.gain.value = 0.25; g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.3);
  } catch { /* */ }
};
const playUnlock = () => {
  try {
    const c = getCtx();
    [880, 1108, 1318].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = f; g.gain.value = 0.25; g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.4);
      o.connect(g); g.connect(c.destination); o.start(c.currentTime + i * 0.12); o.stop(c.currentTime + i * 0.12 + 0.4);
    });
  } catch { /* */ }
};
const playJumpScare = () => {
  try {
    const c = getCtx(); const dur = 0.7; const n = c.sampleRate * dur;
    const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const t = i / c.sampleRate; const env = Math.exp(-t * 4); const tone = Math.sin(t * 1000 * (1 + Math.sin(t * 40) * 0.4)); d[i] = (Math.random() * 2 - 1) * 0.2 + tone * 0.6 * env; }
    const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start();
  } catch { /* */ }
};

/* ────────────────────────── TTS ────────────────────────── */

const getVoices = (): SpeechSynthesisVoice[] => { try { return window.speechSynthesis?.getVoices() || []; } catch { return []; } };
const findVoice = (uri?: string) => {
  if (!uri) return null;
  return getVoices().find((v) => v.voiceURI === uri || v.name === uri) || null;
};
const speakText = (text: string, uri?: string, rate = 1, pitch = 1) => {
  try {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = findVoice(uri); if (v) u.voice = v;
    u.rate = rate; u.pitch = pitch;
    window.speechSynthesis.speak(u);
  } catch { /* tts unavailable */ }
};
const stopSpeaking = () => { try { window.speechSynthesis.cancel(); } catch { /* */ } };
const startSpeechRecognition = (onResult: (t: string) => void, onEnd?: () => void): (() => void) | null => {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  try {
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1; r.continuous = false;
    r.onresult = (e: any) => { try { onResult(e.results[0][0].transcript); } catch { /* */ } };
    r.onend = () => onEnd?.();
    r.onerror = () => onEnd?.();
    r.start();
    return () => { try { r.stop(); } catch { /* */ } };
  } catch { return null; }
};

const fearColor = (v: number) => (v < 33 ? '#00ff88' : v < 66 ? '#ffaa00' : '#ff0000');

/* ────────────────────────── shared bits ────────────────────────── */

const CREEP = { fontFamily: "'Creepster', cursive" };
const ORBITRON = { fontFamily: "'Orbitron'" };
const JUMPSCARES = ['🐦‍⬛', '🕷️', '💀', '👻', '🤡', '👁️'];

const Overlays: React.FC<{ fear: number; blood: boolean; shake: boolean; scare: boolean }> = ({ fear, blood, shake, scare }) => (
  <>
    {blood && <div className="blood-overlay" style={{ display: 'block' }} />}
    {scare && (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none" style={{ animation: 'shake 0.3s ease-in-out', background: 'rgba(0,0,0,0.85)' }}>
        <div className="text-[25rem] filter drop-shadow-[0_0_50px_rgba(255,0,0,1)] animate-splash" style={{ lineHeight: 1 }}>{JUMPSCARES[Math.floor(Math.random() * JUMPSCARES.length)]}</div>
      </div>
    )}
    <div className={`fear-border ${fear > 50 ? 'active' : ''}`} style={{ borderColor: fear > 50 ? `rgba(139,0,0,${fear / 100})` : 'transparent' }} />
  </>
);

const Background: React.FC<{ src: string; opacity?: number }> = ({ src, opacity = 0.2 }) => (
  <div className="fixed inset-0 z-0">
    <img src={src} alt="" className="w-full h-full object-cover" style={{ opacity }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(10,0,0,0.7), rgba(0,0,0,0.95))' }} />
  </div>
);

const FogEmbers: React.FC = () => (
  <>
    <div className="fog-layer" />
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="ember-particle" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 4}s`, animationDuration: `${3 + Math.random() * 3}s` }} />
    ))}
  </>
);

const dayByNum = (theme: GamifiedThemeData, n: number) => theme.days.find((d) => d.dayNumber === n);
const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

/* ────────────────────────── HUB ────────────────────────── */

const GameHubView: React.FC<{ theme: GamifiedThemeData; st: GState; set: (p: Partial<GState>) => void; learnerName: string; photo: string | null; onBack: () => void }> = ({ theme, st, set, learnerName, photo, onBack }) => {
  const [codeInput, setCodeInput] = useState('');
  const [codeTarget, setCodeTarget] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => { playHorrorDrone(3); /* eslint-disable-next-line */ }, []);

  const isUnlocked = (n: number) => n === 0 || st.unlockedDays.includes(n);
  const isAvailable = (n: number) => {
    if (!theme.startDate) return true;
    const start = new Date(theme.startDate);
    const d = new Date(start); d.setDate(d.getDate() + n);
    const today = new Date(); today.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
    return today >= d;
  };
  const canAccess = (n: number) => isUnlocked(n) && isAvailable(n);

  const handleDayClick = (n: number) => {
    if (canAccess(n)) { set({ currentDay: n, tab: 'lesson', screen: 'day' }); playHorrorDrone(2); }
    else if (!isAvailable(n)) {
      playWrong();
      setFeedback(`🔒 This day opens on ${new Date(new Date(theme.startDate).getTime() + n * 86400000).toLocaleDateString()}`);
      setTimeout(() => setFeedback(''), 3000);
    } else {
      setCodeTarget(n);
    }
  };

  const submitCode = () => {
    if (codeTarget === null) return;
    const prev = dayByNum(theme, codeTarget - 1);
    const expected = (prev?.unlockCode || '').toUpperCase();
    const master = (theme.masterCode || '').toUpperCase();
    const input = codeInput.trim().toUpperCase();
    if (input === expected || input === master) {
      playSuccess(); playUnlock();
      set({ unlockedDays: [...new Set([...st.unlockedDays, codeTarget])], points: st.points + 50 });
      setCodeTarget(null); setCodeInput('');
      setFeedback('✅ Day Unlocked!');
      setTimeout(() => setFeedback(''), 2000);
    } else {
      if (Math.random() > 0.5) { playJumpScare(); set({ showJumpScare: true }); setTimeout(() => set({ showJumpScare: false }), 850); }
      else { playScream(); playBreathing(); set({ showBlood: true }); setTimeout(() => set({ showBlood: false }), 2000); set({ isShaking: true }); setTimeout(() => set({ isShaking: false }), 600); }
      set({ fearMeter: Math.min(100, st.fearMeter + 15) });
      setFeedback('💀 WRONG CODE! Fear rising...');
      setTimeout(() => setFeedback(''), 3000);
    }
  };

  const fc = fearColor(st.fearMeter);

  return (
    <div className={`min-h-screen relative ${st.isShaking ? 'animate-shake' : ''}`}>
      <Overlays fear={st.fearMeter} blood={st.showBlood} shake={st.isShaking} scare={st.showJumpScare} />
      <Background src={theme.backgroundImages[0] || ''} />
      <FogEmbers />
      <div className="relative z-10 max-w-6xl mx-auto p-4 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-lg font-bold border border-gray-600 shadow-md">🔙 Back</button>
            <button onClick={() => set({ points: 0, fearMeter: 0, completedDays: [], unlockedDays: [0], badges: [], cluesCollected: [], mysteryBoxes: 0 })} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-lg font-bold border border-gray-600 shadow-md">↺ Reset</button>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{photo && photo.length <= 4 ? photo : '😎'}</span>
              <span className="text-xl font-bold text-white">{learnerName}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-xl font-bold text-yellow-400">⭐ {st.points}</div>
            <div className="text-xl font-bold text-purple-400">🏅 {st.badges.length}</div>
            <div className="text-xl font-bold text-blue-400">🎁 {st.mysteryBoxes}</div>
            <div className="text-xl font-bold text-green-400">🔍 {st.cluesCollected.length}</div>
          </div>
        </div>
        <div className="text-center mb-6">
          <h1 style={{ ...CREEP, fontSize: 'clamp(2rem, 6vw, 4rem)', color: '#dc143c', textShadow: '0 0 20px rgba(139,0,0,0.6)' }}>{theme.welcomeTitle}</h1>
          <p className="text-gray-400 text-lg mt-1 max-w-2xl mx-auto">{theme.welcomeSubtitle}</p>
        </div>
        <div className="mb-6 max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg font-bold" style={{ color: fc }}>😱 FEAR METER</span>
            <span className="text-lg font-bold" style={{ color: fc }}>{Math.round(st.fearMeter)}%</span>
          </div>
          <div className="h-5 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${st.fearMeter}%`, background: `linear-gradient(90deg, ${fc}, ${st.fearMeter > 66 ? '#ff0000' : fc})`, boxShadow: `0 0 10px ${fc}` }} />
          </div>
        </div>
        <div className="flex justify-center mb-8">
          <div className="animate-float text-center perspective-3d" style={{ fontSize: '8rem', filter: `drop-shadow(0 0 30px ${fc})`, transition: 'filter 1s' }}>{theme.days[0]?.artifactEmoji || '💎'}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {theme.days.map((day) => {
            const unlocked = isUnlocked(day.dayNumber);
            const available = isAvailable(day.dayNumber);
            const completed = st.completedDays.includes(day.dayNumber);
            const accessible = unlocked && available;
            return (
              <button key={day.dayNumber} onClick={() => handleDayClick(day.dayNumber)}
                className={`card-3d rounded-2xl overflow-hidden text-left cursor-pointer transition-all duration-300 group ${!accessible ? 'opacity-60 grayscale' : 'hover:scale-105'}`}
                style={{ background: 'rgba(20,0,0,0.9)', border: completed ? '2px solid #00ff88' : accessible ? '2px solid rgba(139,0,0,0.5)' : '2px solid rgba(50,50,50,0.5)', boxShadow: completed ? '0 0 20px rgba(0,255,136,0.3)' : accessible ? '0 0 15px rgba(139,0,0,0.3)' : 'none' }}>
                <div className="relative h-28 overflow-hidden">
                  <img src={day.backgroundImage} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                  <div className="absolute top-2 right-2 text-3xl">{completed ? '✅' : accessible ? '🔓' : '🔒'}</div>
                  <div className="absolute bottom-2 left-3 text-4xl">{day.artifactEmoji}</div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-red-500 font-bold mb-1" style={ORBITRON}>DAY {day.dayNumber}</div>
                  <h3 className="text-lg font-bold text-white mb-1" style={CREEP}>{day.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{day.subtitle}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <span>🎯 {day.skill}</span>
                    <span>⭐ {day.pointsAvailable}pts</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {feedback && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-xl text-2xl font-bold z-50 animate-fadeIn"
            style={{ background: feedback.includes('💀') ? 'rgba(139,0,0,0.9)' : 'rgba(0,100,0,0.9)', color: '#fff', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
            {feedback}
          </div>
        )}
        {codeTarget !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
            <div className="rounded-2xl p-8 max-w-md w-full animate-fadeIn border-blood-glow" style={{ background: 'rgba(20,0,0,0.95)' }}>
              <div className="text-center text-6xl mb-4 animate-float-slow">🔐</div>
              <h2 className="text-center text-2xl font-bold text-red-400 mb-2" style={CREEP}>Enter Unlock Code</h2>
              <p className="text-center text-gray-400 mb-4 text-lg">{dayByNum(theme, codeTarget - 1)?.codeHint || 'Find the code in the previous day\'s content'}</p>
              <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitCode()}
                placeholder="Type the code..."
                className="w-full px-6 py-4 rounded-xl bg-gray-900 border-2 border-red-900 text-white text-2xl text-center tracking-widest focus:border-red-500 focus:outline-none mb-4"
                style={ORBITRON}
                autoFocus />
              <div className="flex gap-3">
                <button onClick={() => { setCodeTarget(null); setCodeInput(''); }} className="flex-1 py-3 rounded-xl bg-gray-800 text-white text-lg font-bold cursor-pointer hover:bg-gray-700">Cancel</button>
                <button onClick={submitCode} className="flex-1 py-3 rounded-xl font-bold text-lg cursor-pointer" style={{ background: 'linear-gradient(135deg, #8b0000, #dc143c)', color: '#fff' }}>🔓 Unlock</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ────────────────────────── DAY VIEW ────────────────────────── */

const TABS = (day: GamifiedDayContent) => {
  const t: { id: string; label: string }[] = [
    { id: 'lesson', label: '📖 Lesson' }, { id: 'vocab', label: '📝 Vocab' }, { id: 'grammar', label: '📐 Grammar' },
    { id: 'reading', label: '📕 Reading' }, { id: 'listening', label: '🎧 Listening' }, { id: 'dialogue', label: '🎭 Dialogue' },
    { id: 'speaking', label: '🎤 Speaking' }, { id: 'writing', label: '✍️ Writing' }, { id: 'dictation', label: '📢 Dictation' },
    { id: 'quiz', label: '❓ Quiz' },
  ];
  if (day.bossBattle?.length) t.push({ id: 'boss', label: '💀 Boss' });
  if (day.dragDropClues?.length) t.push({ id: 'clues', label: '🧩 Clues' });
  return t;
};

const DayView: React.FC<{ theme: GamifiedThemeData; day: GamifiedDayContent; st: GState; set: (p: Partial<GState>) => void; learnerName: string; onBack: () => void }> = ({ theme, day, st, set, learnerName, onBack }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const load = () => setVoices(getVoices());
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => { window.speechSynthesis?.removeEventListener('voiceschanged', load); stopSpeaking(); };
  }, []);

  const fc = fearColor(st.fearMeter);
  const tab = st.tab || 'lesson';
  const complete = () => {
    set({
      completedDays: [...new Set([...st.completedDays, day.dayNumber])],
      badges: st.badges.includes(`day${day.dayNumber}_complete`) ? st.badges : [...st.badges, `day${day.dayNumber}_complete`],
      mysteryBoxes: st.mysteryBoxes + 1,
      screen: 'game',
    });
    playSuccess();
  };

  return (
    <div className={`min-h-screen relative ${st.isShaking ? 'animate-shake' : ''}`}>
      <Overlays fear={st.fearMeter} blood={st.showBlood} shake={st.isShaking} scare={st.showJumpScare} />
      <Background src={day.backgroundImage} opacity={0.15} />
      <FogEmbers />
      <div className="relative z-10 max-w-5xl mx-auto p-3 pb-20">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-lg font-bold border border-gray-600 shadow-md">🔙 Back</button>
            <button onClick={() => { stopSpeaking(); set({ screen: 'game' }); }} className="text-3xl cursor-pointer hover:scale-110">⬅️</button>
          </div>
          <div className="text-center flex-1">
            <div className="text-sm text-red-500 font-bold" style={ORBITRON}>DAY {day.dayNumber} • {day.skill.toUpperCase()}</div>
            <h1 className="text-2xl font-bold text-white" style={CREEP}>{day.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg text-yellow-400 font-bold">⭐ {st.points}</span>
            <span className="text-lg font-bold" style={{ color: fc }}>😱 {Math.round(st.fearMeter)}%</span>
          </div>
        </div>
        <div className="flex justify-center mb-3">
          <div className={`text-[12rem] leading-none ${st.fearMeter > 50 ? 'animate-rotate' : 'animate-float-slow'}`} style={{ filter: `drop-shadow(0 0 15px ${fc})` }}>{day.artifactEmoji}</div>
        </div>
        <div className="mb-4 rounded-xl p-4 border-blood-glow" style={{ background: 'rgba(20,0,0,0.9)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-red-400">🔊 Narrator</span>
            <button onClick={() => speakText(day.narratorIntro)} className="px-4 py-2 bg-red-900 text-white rounded-lg text-sm font-bold cursor-pointer hover:bg-red-800">▶️ Read Aloud</button>
          </div>
          <p className="text-gray-300 text-base leading-relaxed italic">"{day.narratorIntro}"</p>
        </div>
        <div className="flex overflow-x-auto gap-1 mb-4 pb-2">
          {TABS(day).map((t) => (
            <button key={t.id} onClick={() => set({ tab: t.id })}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap cursor-pointer transition-all ${tab === t.id ? 'bg-red-900 text-white scale-105' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
              style={{ border: tab === t.id ? '1px solid rgba(220,20,60,0.5)' : '1px solid rgba(50,50,50,0.5)' }}>{t.label}</button>
          ))}
        </div>
        <div className="rounded-xl p-5 border-blood-glow animate-fadeIn" style={{ background: 'rgba(15,0,0,0.9)' }} key={tab}>
          {tab === 'lesson' && <LessonTab day={day} voices={voices} st={st} set={set} />}
          {tab === 'vocab' && <VocabTab day={day} />}
          {tab === 'grammar' && <GrammarTab day={day} st={st} set={set} />}
          {tab === 'reading' && <ReadingTab day={day} st={st} set={set} />}
          {tab === 'listening' && <ListeningTab day={day} st={st} set={set} />}
          {tab === 'dialogue' && <DialogueTab day={day} voices={voices} st={st} set={set} />}
          {tab === 'speaking' && <SpeakingTab day={day} st={st} set={set} />}
          {tab === 'writing' && <WritingTab day={day} st={st} set={set} />}
          {tab === 'dictation' && <DictationTab day={day} st={st} set={set} />}
          {tab === 'quiz' && <QuizTab day={day} st={st} set={set} />}
          {tab === 'boss' && day.bossBattle && <BossTab day={day} st={st} set={set} />}
          {tab === 'clues' && day.dragDropClues && <CluesTab day={day} st={st} set={set} />}
        </div>
        {!st.completedDays.includes(day.dayNumber) && (
          <button onClick={complete}
            className="mt-6 w-full py-5 rounded-xl font-bold text-2xl cursor-pointer animate-pulse-glow"
            style={{ ...ORBITRON, background: 'linear-gradient(135deg, #006400, #008000)', color: '#fff', border: '2px solid rgba(0,128,0,0.5)' }}>
            ✅ Complete Day {day.dayNumber}
          </button>
        )}
      </div>
    </div>
  );
};

/* ── tabs ── */

const VoiceSelect: React.FC<{ voices: SpeechSynthesisVoice[]; value: string; onChange: (v: string) => void }> = ({ voices, value, onChange }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className="px-3 py-2 bg-gray-900 border border-gray-700 text-white text-lg rounded cursor-pointer max-w-[250px]">
    <option value="">Default</option>
    {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name.slice(0, 30)}</option>)}
  </select>
);

const LessonTab: React.FC<{ day: GamifiedDayContent; voices: SpeechSynthesisVoice[]; st: GState; set: (p: Partial<GState>) => void }> = ({ day, voices, st, set }) => (
  <div>
    <h2 className="text-4xl font-bold text-red-400 mb-6" style={CREEP}>{day.lesson.title}</h2>
    <p className="text-gray-300 mb-8 text-2xl leading-relaxed">{day.lesson.content}</p>
    {day.lesson.sections.map((sec, i) => (
      <div key={i} className="mb-8 p-6 rounded-2xl"
        style={{ background: sec.type === 'warning' ? 'rgba(139,0,0,0.2)' : sec.type === 'dialogue' ? 'rgba(100,0,100,0.15)' : 'rgba(30,30,30,0.5)', border: sec.type === 'warning' ? '1px solid rgba(220,20,60,0.5)' : '1px solid rgba(50,50,50,0.3)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-3xl font-bold text-white">{sec.title}</h3>
          <button onClick={() => speakText(sec.content)} className="px-5 py-2 bg-red-900 text-white rounded-lg text-lg font-bold cursor-pointer hover:bg-red-800">🔊 Read</button>
        </div>
        {sec.type === 'dialogue' && (
          <div className="mb-4 flex flex-wrap gap-4">
            {sec.content.split('\n').map((line) => { const m = line.match(/^([^:]+):/); return m ? m[1].trim() : null; }).filter((v, i2, a): v is string => !!v && a.indexOf(v) === i2).map((ch) => (
              <div key={ch} className="flex items-center gap-3">
                <span className="text-xl text-gray-400">{ch}:</span>
                <VoiceSelect voices={voices} value={st.charVoices[ch] || ''} onChange={(v) => set({ charVoices: { ...st.charVoices, [ch]: v } })} />
              </div>
            ))}
          </div>
        )}
        <div className="text-gray-300 whitespace-pre-wrap text-2xl leading-relaxed">
          {sec.type === 'dialogue'
            ? sec.content.split('\n').filter((l) => l.trim()).map((line, li) => {
              const m = line.match(/^([^:]+):\s*"?(.+)"?$/);
              if (m) return (
                <div key={li} className="flex items-start gap-3 mb-3 group">
                  <span className="font-bold text-red-400 min-w-[120px]">{m[1]}:</span>
                  <span className="flex-1">{m[2]}</span>
                  <button onClick={() => speakText(m[2], st.charVoices[m[1].trim()])} className="opacity-0 group-hover:opacity-100 text-xl cursor-pointer">🔊</button>
                </div>
              );
              return <p key={li} className="mb-2">{line}</p>;
            })
            : sec.content}
        </div>
      </div>
    ))}
  </div>
);

const VocabTab: React.FC<{ day: GamifiedDayContent }> = ({ day }) => {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const toggle = (i: number) => { const s = new Set(flipped); s.has(i) ? s.delete(i) : s.add(i); setFlipped(s); };
  return (
    <div>
      <h2 className="text-2xl font-bold text-red-400 mb-4" style={CREEP}>📝 Vocabulary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {day.vocabulary.map((v, i) => (
          <div key={i} onClick={() => toggle(i)} className="cursor-pointer rounded-xl p-4 transition-all hover:scale-105"
            style={{ background: flipped.has(i) ? 'rgba(0,100,0,0.2)' : 'rgba(30,0,0,0.5)', border: '1px solid rgba(139,0,0,0.3)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl font-bold text-white">{v.word}</span>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-1 bg-red-900 rounded text-red-300">{v.partOfSpeech}</span>
                <button onClick={(e) => { e.stopPropagation(); speakText(v.word); }} className="text-lg cursor-pointer">🔊</button>
              </div>
            </div>
            {flipped.has(i) && (
              <div className="animate-fadeIn">
                <p className="text-gray-300 mb-1"><strong>Definition:</strong> {v.definition}</p>
                <p className="text-gray-400 italic mb-1"><strong>Example:</strong> {v.example}</p>
                <button onClick={(e) => { e.stopPropagation(); speakText(v.example); }} className="text-sm text-red-400 cursor-pointer">🔊 Hear example</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const GrammarTab: React.FC<{ day: GamifiedDayContent; st: GState; set: (p: Partial<GState>) => void }> = ({ day, st, set }) => {
  const check = (key: string, correct: string, ans: string) => {
    if (st.gramChecked[key]) return;
    set({ gramChecked: { ...st.gramChecked, [key]: true }, gramAns: { ...st.gramAns, [key]: ans } });
    if (ans.toLowerCase().trim() === correct.toLowerCase().trim()) { playSuccess(); set({ points: st.points + 10 }); }
    else {
      if (Math.random() > 0.8) { playJumpScare(); set({ showJumpScare: true }); setTimeout(() => set({ showJumpScare: false }), 850); }
      else { playWrong(); set({ isShaking: true }); setTimeout(() => set({ isShaking: false }), 600); }
      set({ fearMeter: Math.min(100, st.fearMeter + 5) });
    }
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-red-400 mb-4" style={CREEP}>📐 Grammar</h2>
      {day.grammar.map((g, gi) => (
        <div key={gi} className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(30,0,0,0.5)', border: '1px solid rgba(139,0,0,0.3)' }}>
          <h3 className="text-xl font-bold text-white mb-2">{g.rule}</h3>
          <p className="text-gray-300 mb-3">{g.explanation}</p>
          <div className="mb-3 flex flex-wrap gap-2">{g.examples.map((ex, i) => <span key={i} className="px-3 py-1 bg-gray-800 rounded text-gray-300 text-sm">"{ex}"</span>)}</div>
          {g.exercises.map((ex, ei) => {
            const key = `${gi}-${ei}`;
            const isCorrect = st.gramAns[key]?.toLowerCase().trim() === ex.answer.toLowerCase().trim();
            return (
              <div key={ei} className="mt-3 p-3 rounded-lg" style={{ background: st.gramChecked[key] ? (isCorrect ? 'rgba(0,100,0,0.2)' : 'rgba(100,0,0,0.2)') : 'rgba(20,20,20,0.5)' }}>
                <p className="text-gray-300 mb-2">{ex.instruction}: <strong>{ex.sentence}</strong></p>
                {ex.options ? (
                  <div className="flex flex-wrap gap-2">
                    {ex.options.map((opt, oi) => (
                      <button key={oi} onClick={() => check(key, ex.answer, opt)} disabled={!!st.gramChecked[key]}
                        className={`px-4 py-2 rounded-lg text-base font-bold cursor-pointer transition-all ${st.gramChecked[key] && opt.toLowerCase().trim() === ex.answer.toLowerCase().trim() ? 'bg-green-800 text-white' : st.gramChecked[key] && st.gramAns[key] === opt ? 'bg-red-800 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>{opt}</button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={st.gramAns[key] || ''} onChange={(e) => set({ gramAns: { ...st.gramAns, [key]: e.target.value } })}
                      className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-base" disabled={!!st.gramChecked[key]} />
                    {!st.gramChecked[key] && <button onClick={() => check(key, ex.answer, st.gramAns[key] || '')} className="px-4 py-2 bg-red-900 text-white rounded font-bold cursor-pointer">Check</button>}
                  </div>
                )}
                {st.gramChecked[key] && <p className={`mt-1 text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>{isCorrect ? '✅ Correct!' : `❌ Answer: ${ex.answer}`}</p>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const ReadingTab: React.FC<{ day: GamifiedDayContent; st: GState; set: (p: Partial<GState>) => void }> = ({ day, st, set }) => {
  const glitchMap = new Map<string, typeof day.reading.glitchWords[0]>();
  day.reading.glitchWords.forEach((g) => glitchMap.set(g.text.toLowerCase(), g));
  const words = day.reading.text.split(/(\s+)/);
  const foundN = st.foundGlitches.filter((f) => f.day === day.dayNumber).length;
  const handleClick = (word: string, idx: number) => {
    const clean = word.replace(/[.,!?"';:()]/g, '');
    const gw = glitchMap.get(clean.toLowerCase());
    if (gw?.isGlitch && !st.foundGlitches.some((f) => f.day === day.dayNumber && f.idx === idx)) {
      set({ foundGlitches: [...st.foundGlitches, { day: day.dayNumber, idx }], points: st.points + 15, fearMeter: Math.max(0, st.fearMeter - 2) });
      playSuccess();
    } else if (!gw?.isGlitch) {
      if (Math.random() > 0.7) { playJumpScare(); set({ showJumpScare: true }); setTimeout(() => set({ showJumpScare: false }), 850); }
      else { playWrong(); set({ isShaking: true }); setTimeout(() => set({ isShaking: false }), 600); }
      set({ fearMeter: Math.min(100, st.fearMeter + 5) });
    }
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-red-400 mb-2" style={CREEP}>📕 Glitch Hunter</h2>
      <p className="text-gray-400 mb-4">Click on corrupted words! Found: {foundN}/{day.reading.glitchWords.length}</p>
      <button onClick={() => speakText(day.reading.text)} className="mb-3 px-3 py-1 bg-red-900 text-white rounded text-sm cursor-pointer">🔊 Read Aloud</button>
      <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(20,20,20,0.8)', border: '1px solid rgba(50,50,50,0.5)', lineHeight: '2.2' }}>
        {words.map((w, i) => {
          const clean = w.replace(/[.,!?"';:()]/g, '');
          const gw = glitchMap.get(clean.toLowerCase());
          const isFound = st.foundGlitches.some((f) => f.day === day.dayNumber && f.idx === i);
          return (
            <span key={i} onClick={() => !w.match(/^\s+$/) && handleClick(w, i)}
              className={`inline ${!w.match(/^\s+$/) ? 'cursor-pointer hover:bg-gray-700 rounded px-0.5' : ''} ${isFound ? 'line-through text-green-400' : 'text-gray-200'}`}
              style={{ fontSize: '1.15rem' }}>{isFound ? gw?.correction || w : w}</span>
          );
        })}
      </div>
      <CQ questions={day.reading.comprehensionQuestions} st={st} set={set} />
    </div>
  );
};

const CQ: React.FC<{ questions: GamifiedQuizQuestion[]; st: GState; set: (p: Partial<GState>) => void }> = ({ questions, st, set }) => (
  <div className="mt-4">
    <h3 className="text-lg font-bold text-gray-300 mb-3">Comprehension</h3>
    {questions.map((q, qi) => {
      const picked = st.cqAns[0]?.[qi];
      return (
        <div key={qi} className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(20,20,20,0.5)' }}>
          <p className="text-gray-300 mb-2 font-bold">{q.question}</p>
          <div className="flex flex-wrap gap-2">
            {q.options.map((opt, oi) => (
              <button key={oi} onClick={() => {
                if (picked !== undefined) return;
                set({ cqAns: { 0: { ...st.cqAns[0], [qi]: oi } } });
                if (oi === q.correct) { playSuccess(); set({ points: st.points + 10 }); }
                else {
                  if (Math.random() > 0.8) { playJumpScare(); set({ showJumpScare: true }); setTimeout(() => set({ showJumpScare: false }), 850); }
                  else { playWrong(); set({ isShaking: true }); setTimeout(() => set({ isShaking: false }), 600); }
                  set({ fearMeter: Math.min(100, st.fearMeter + 5) });
                }
              }}
                disabled={picked !== undefined}
                className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer ${picked !== undefined && oi === q.correct ? 'bg-green-800 text-white' : picked === oi && oi !== q.correct ? 'bg-red-800 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>{opt}</button>
            ))}
          </div>
          {picked !== undefined && <p className="mt-1 text-sm text-gray-400">💡 {q.explanation}</p>}
        </div>
      );
    })}
  </div>
);

const ListeningTab: React.FC<{ day: GamifiedDayContent; st: GState; set: (p: Partial<GState>) => void }> = ({ day, st, set }) => (
  <div>
    <h2 className="text-2xl font-bold text-red-400 mb-4" style={CREEP}>🎧 Echo Locator</h2>
    {day.listening.map((l, i) => (
      <div key={i} className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(30,0,0,0.5)', border: '1px solid rgba(139,0,0,0.3)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => speakText(l.text, undefined, 0.8)} className="px-4 py-2 bg-red-900 text-white rounded-lg font-bold cursor-pointer text-lg">🔊 Play</button>
          <button onClick={() => speakText(l.text, undefined, 0.5)} className="px-4 py-2 bg-gray-800 text-white rounded-lg cursor-pointer text-sm">🐢 Slow</button>
          <span className="text-gray-500 text-sm">💡 {l.hint}</span>
        </div>
        <div className="flex gap-2">
          <input value={st.listAns[i] || ''} onChange={(e) => set({ listAns: { ...st.listAns, [i]: e.target.value } })} placeholder="Type the hidden word..."
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 text-white rounded-lg text-lg" disabled={!!st.listChecked[i]} />
          {!st.listChecked[i] && <button onClick={() => {
            set({ listChecked: { ...st.listChecked, [i]: true } });
            if (st.listAns[i]?.toLowerCase().trim() === l.hiddenWord.toLowerCase()) {
              playSuccess(); set({ points: st.points + 20, cluesCollected: [...new Set([...st.cluesCollected, l.hiddenWord])] });
            } else {
              if (Math.random() > 0.6) { playJumpScare(); set({ showJumpScare: true }); setTimeout(() => set({ showJumpScare: false }), 850); }
              else { playScream(); set({ showBlood: true }); setTimeout(() => set({ showBlood: false }), 2000); set({ isShaking: true }); setTimeout(() => set({ isShaking: false }), 600); }
              set({ fearMeter: Math.min(100, st.fearMeter + 10) });
            }
          }} className="px-6 py-3 bg-red-900 text-white rounded-lg font-bold cursor-pointer text-lg">Check</button>}
        </div>
        {st.listChecked[i] && <p className={`mt-2 text-base font-bold ${st.listAns[i]?.toLowerCase().trim() === l.hiddenWord.toLowerCase() ? 'text-green-400' : 'text-red-400'}`}>{st.listAns[i]?.toLowerCase().trim() === l.hiddenWord.toLowerCase() ? `✅ "${l.hiddenWord}"` : `❌ "${l.hiddenWord}"`}</p>}
      </div>
    ))}
  </div>
);

const DialogueTab: React.FC<{ day: GamifiedDayContent; voices: SpeechSynthesisVoice[]; st: GState; set: (p: Partial<GState>) => void }> = ({ day, voices, st, set }) => {
  const turnIdx = st.dlgTurn[day.dayNumber] ?? 0;
  const turn = day.dialogue.turns[turnIdx];
  if (!turn) return <p className="text-gray-400">No dialogue available</p>;
  const chosen = st.dlgChoice[day.dayNumber];
  const choose = (optIdx: number) => {
    const opt = turn.options[optIdx];
    set({ dlgChoice: { ...st.dlgChoice, [day.dayNumber]: optIdx }, points: st.points + opt.points });
    if (opt.outcome === 'survive') { playSuccess(); set({ fearMeter: Math.max(0, st.fearMeter - 5) }); }
    else if (opt.outcome === 'die') {
      if (Math.random() > 0.5) { playJumpScare(); set({ showJumpScare: true }); setTimeout(() => set({ showJumpScare: false }), 850); }
      else { playScream(); playBreathing(); set({ showBlood: true }); setTimeout(() => set({ showBlood: false }), 2000); set({ isShaking: true }); setTimeout(() => set({ isShaking: false }), 600); }
      set({ fearMeter: Math.min(100, st.fearMeter + 20) });
    }
    else { playHeartbeat(100); set({ fearMeter: Math.min(100, st.fearMeter + 5) }); }
    speakText(opt.response, st.charVoices[(turn.character || 'Narrator').trim()]);
  };
  return (
    <div>
      <h2 className="text-4xl font-bold text-red-400 mb-6" style={CREEP}>🎭 Interrogation</h2>
      <p className="text-gray-400 mb-6 text-xl">Scenario: {day.dialogue.scenario}</p>
      <div className="flex flex-wrap gap-4 mb-6">
        {day.dialogue.characters.map((rawChar) => {
          const ch = rawChar.trim();
          return (
            <div key={ch} className="flex items-center gap-3">
              <span className="text-xl text-red-400 font-bold">{ch}:</span>
              <VoiceSelect voices={voices} value={st.charVoices[ch] || ''} onChange={(v) => set({ charVoices: { ...st.charVoices, [ch]: v } })} />
            </div>
          );
        })}
      </div>
      <div className="p-6 rounded-2xl mb-6" style={{ background: 'rgba(30,0,30,0.5)', border: '1px solid rgba(139,0,0,0.3)' }}>
        <p className="text-gray-400 italic mb-4 text-2xl group flex items-center gap-2">
          <span>{turn.narrator}</span>
          <button onClick={() => speakText(turn.narrator)} className="opacity-0 group-hover:opacity-100 text-xl cursor-pointer">🔊</button>
        </p>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-red-400 font-bold text-2xl">{turn.character || 'Narrator'}:</span>
          <button onClick={() => speakText(turn.question, st.charVoices[(turn.character || 'Narrator').trim()])} className="text-xl cursor-pointer">🔊</button>
        </div>
        <p className="text-white text-3xl mb-6 leading-relaxed">{turn.question}</p>
        {chosen === undefined ? (
          <div className="space-y-4">
            {turn.options.map((opt, oi) => (
              <button key={oi} onClick={() => choose(oi)} className="w-full text-left px-6 py-5 rounded-2xl text-2xl cursor-pointer transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(40,0,0,0.8)', border: '1px solid rgba(139,0,0,0.3)' }}>
                <span className="text-gray-200">{opt.text}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="animate-fadeIn">
            <div className="p-6 rounded-2xl mb-4" style={{ background: turn.options[chosen].outcome === 'survive' ? 'rgba(0,100,0,0.2)' : turn.options[chosen].outcome === 'die' ? 'rgba(139,0,0,0.3)' : 'rgba(100,100,0,0.2)' }}>
              <p className="text-3xl font-bold mb-3" style={{ color: turn.options[chosen].outcome === 'survive' ? '#00ff88' : turn.options[chosen].outcome === 'die' ? '#ff4444' : '#ffcc00' }}>
                {turn.options[chosen].outcome === 'survive' ? '✅ SURVIVED!' : turn.options[chosen].outcome === 'die' ? '💀 ELIMINATED!' : '⚠️ CLOSE CALL...'}
              </p>
              <p className="text-white text-2xl leading-relaxed">{turn.options[chosen].response}</p>
            </div>
            {turnIdx < day.dialogue.turns.length - 1 && (
              <button onClick={() => set({ dlgTurn: { ...st.dlgTurn, [day.dayNumber]: turnIdx + 1 }, dlgChoice: { ...st.dlgChoice, [day.dayNumber]: undefined as any } })}
                className="px-8 py-4 bg-red-900 text-white rounded-xl font-bold text-2xl cursor-pointer hover:bg-red-800 transition-colors shadow-lg shadow-red-900/50 hover:shadow-red-900/80">Next Turn →</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SpeakingTab: React.FC<{ day: GamifiedDayContent; st: GState; set: (p: Partial<GState>) => void }> = ({ day, st, set }) => {
  const stopRef = useRef<(() => void) | null>(null);
  const idx = st.spkIdx[day.dayNumber] ?? 0;
  const challenge = day.speaking[idx];
  if (!challenge) return <p className="text-gray-400">No speaking challenges</p>;
  const listening = !!st.spkListening;
  const startListening = () => {
    set({ spkListening: true });
    stopRef.current = startSpeechRecognition((text) => {
      const target = challenge.text.toLowerCase().split(/\s+/);
      const spoken = text.toLowerCase().split(/\s+/);
      let matches = 0;
      target.forEach((w) => { if (spoken.includes(w)) matches++; });
      const acc = Math.round((matches / target.length) * 100);
      set({ spkListening: false, spkResult: { ...st.spkResult, [day.dayNumber]: { ...st.spkResult[day.dayNumber], [idx]: text } }, spkAcc: { ...st.spkAcc, [day.dayNumber]: { ...st.spkAcc[day.dayNumber], [idx]: acc } } });
      if (acc >= challenge.targetAccuracy) { playSuccess(); set({ points: st.points + 25, cluesCollected: [...new Set([...st.cluesCollected, challenge.clueOnSuccess])] }); }
      else { playWrong(); set({ fearMeter: Math.min(100, st.fearMeter + 5) }); }
    }, () => set({ spkListening: false }));
    if (!stopRef.current) { set({ spkListening: false }); }
  };
  const words = challenge.text.split(/\s+/);
  const spokenWords = st.spkResult[day.dayNumber]?.[idx]?.toLowerCase().split(/\s+/) || [];
  const acc = st.spkAcc[day.dayNumber]?.[idx];
  return (
    <div>
      <h2 className="text-2xl font-bold text-red-400 mb-4" style={CREEP}>🎤 {challenge.mode === 'whisper' ? 'Whisper' : challenge.mode === 'shout' ? 'SHOUT' : 'Speak'} Challenge</h2>
      <p className="text-gray-400 mb-4">Read aloud. {challenge.targetAccuracy}% accuracy required.</p>
      <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(20,20,20,0.8)', border: '1px solid rgba(50,50,50,0.5)' }}>
        {words.map((w, i) => <span key={i} className={`karaoke-word ${st.spkResult[day.dayNumber]?.[idx] ? (spokenWords.includes(w.toLowerCase()) ? 'done' : 'wrong') : ''}`}>{w}</span>)}
      </div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={listening ? () => { stopRef.current?.(); set({ spkListening: false }); } : startListening}
          className={`px-8 py-4 rounded-xl font-bold text-xl cursor-pointer ${listening ? 'bg-red-600 animate-pulse' : 'bg-red-900'} text-white`}>{listening ? '⏹️ Stop' : '🎙️ Start Speaking'}</button>
        <button onClick={() => speakText(challenge.text)} className="px-4 py-4 bg-gray-800 text-white rounded-xl cursor-pointer text-lg">🔊 Listen First</button>
      </div>
      {acc !== undefined && (
        <div className="animate-fadeIn p-4 rounded-xl" style={{ background: acc >= challenge.targetAccuracy ? 'rgba(0,100,0,0.2)' : 'rgba(100,0,0,0.2)' }}>
          <span className="text-2xl font-bold" style={{ color: acc >= challenge.targetAccuracy ? '#00ff88' : '#ff4444' }}>{acc >= challenge.targetAccuracy ? '🎉' : '😰'} {acc}%</span>
          {st.spkResult[day.dayNumber]?.[idx] && <p className="text-gray-400 text-sm mt-1">You said: "{st.spkResult[day.dayNumber]?.[idx]}"</p>}
          {acc >= challenge.targetAccuracy && <p className="text-green-400 mt-2 font-bold">🔍 Clue: {challenge.clueOnSuccess}</p>}
        </div>
      )}
      {day.speaking.length > 1 && <div className="flex gap-2 mt-4">{day.speaking.map((_, i) => <button key={i} onClick={() => set({ spkIdx: { ...st.spkIdx, [day.dayNumber]: i } })} className={`w-8 h-8 rounded-full text-sm font-bold cursor-pointer ${i === idx ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{i + 1}</button>)}</div>}
    </div>
  );
};

const WritingTab: React.FC<{ day: GamifiedDayContent; st: GState; set: (p: Partial<GState>) => void }> = ({ day, st, set }) => {
  const prompt = day.writing[0];
  if (!prompt) return null;
  const text = st.writeText[day.dayNumber] || '';
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const keywordsFound = prompt.keywords.filter((k) => text.toLowerCase().includes(k.toLowerCase()));
  const submitted = !!st.writeDone[day.dayNumber];
  return (
    <div>
      <h2 className="text-2xl font-bold text-red-400 mb-4" style={CREEP}>✍️ Writing Challenge</h2>
      <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(30,0,0,0.5)', border: '1px solid rgba(139,0,0,0.3)' }}>
        <p className="text-gray-300 text-lg">{prompt.prompt}</p>
        <p className="text-gray-500 text-sm mt-2">Keywords: {prompt.keywords.map((k) => <span key={k} className={`mx-1 px-2 py-0.5 rounded text-xs ${keywordsFound.includes(k) ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>{k}</span>)}</p>
      </div>
      <textarea value={text} onChange={(e) => set({ writeText: { ...st.writeText, [day.dayNumber]: e.target.value } })} rows={6}
        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white rounded-xl text-base resize-y mb-2" disabled={submitted} placeholder="Write here..." />
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm ${wordCount >= prompt.minWords ? 'text-green-400' : 'text-gray-500'}`}>Words: {wordCount}/{prompt.minWords}</span>
      </div>
      {!submitted
        ? <button onClick={() => { set({ writeDone: { ...st.writeDone, [day.dayNumber]: true }, points: st.points + 30 }); playSuccess(); }} disabled={wordCount < prompt.minWords}
          className="w-full py-3 rounded-xl font-bold text-lg cursor-pointer disabled:opacity-30" style={{ background: 'linear-gradient(135deg, #8b0000, #dc143c)', color: '#fff' }}>Submit ✅</button>
        : <div className="animate-fadeIn p-4 rounded-xl" style={{ background: 'rgba(0,50,0,0.3)' }}><p className="text-green-400 font-bold mb-2">✅ Submitted!</p><p className="text-gray-400 italic text-sm">{prompt.sampleAnswer}</p></div>}
    </div>
  );
};

const DictationTab: React.FC<{ day: GamifiedDayContent; st: GState; set: (p: Partial<GState>) => void }> = ({ day, st, set }) => (
  <div>
    <h2 className="text-2xl font-bold text-red-400 mb-4" style={CREEP}>📢 Dictation</h2>
    {day.dictation.map((d, i) => (
      <div key={i} className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(30,0,0,0.5)', border: '1px solid rgba(139,0,0,0.3)' }}>
        <button onClick={() => speakText(d.text, undefined, d.speed === 'slow' ? 0.6 : d.speed === 'fast' ? 1.3 : 0.9)}
          className="mb-3 px-4 py-2 bg-red-900 text-white rounded-lg font-bold cursor-pointer text-lg">🔊 Play ({d.speed})</button>
        <textarea value={st.dictAns[i] || ''} onChange={(e) => set({ dictAns: { ...st.dictAns, [i]: e.target.value } })}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg text-base mb-2" rows={2} disabled={!!st.dictChecked[i]} placeholder="Type what you hear..." />
        {!st.dictChecked[i]
          ? <button onClick={() => {
            set({ dictChecked: { ...st.dictChecked, [i]: true } });
            norm(st.dictAns[i] || '') === norm(d.text) ? (playSuccess(), set({ points: st.points + 20 })) : (playWrong(), set({ fearMeter: Math.min(100, st.fearMeter + 5) }));
          }} className="px-6 py-2 bg-red-900 text-white rounded-lg font-bold cursor-pointer">Check</button>
          : <p className={`text-sm ${norm(st.dictAns[i] || '') === norm(d.text) ? 'text-green-400' : 'text-red-400'}`}>{norm(st.dictAns[i] || '') === norm(d.text) ? '✅ Perfect!' : `❌ "${d.text}"`}</p>}
      </div>
    ))}
  </div>
);

const QuizTab: React.FC<{ day: GamifiedDayContent; st: GState; set: (p: Partial<GState>) => void }> = ({ day, st, set }) => (
  <div>
    <h2 className="text-2xl font-bold text-red-400 mb-4" style={CREEP}>❓ Quiz</h2>
    {day.quiz.map((q, qi) => {
      const picked = st.quizAns[day.dayNumber]?.[qi];
      return (
        <div key={qi} className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(30,0,0,0.5)', border: '1px solid rgba(139,0,0,0.3)' }}>
          <p className="text-white font-bold text-lg mb-3">{q.question}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.options.map((opt, oi) => (
              <button key={oi} onClick={() => {
                if (picked !== undefined) return;
                set({ quizAns: { ...st.quizAns, [day.dayNumber]: { ...st.quizAns[day.dayNumber], [qi]: oi } } });
                if (oi === q.correct) {
                  playSuccess(); set({ points: st.points + 15, cluesCollected: q.codeFragment && !st.cluesCollected.includes(q.codeFragment) ? [...st.cluesCollected, q.codeFragment] : st.cluesCollected });
                } else {
                  playScream(); set({ showBlood: true }); setTimeout(() => set({ showBlood: false }), 2000); set({ isShaking: true }); setTimeout(() => set({ isShaking: false }), 600); playBreathing();
                  set({ fearMeter: Math.min(100, st.fearMeter + 10) });
                }
              }}
                disabled={picked !== undefined}
                className={`px-4 py-3 rounded-lg text-base font-bold cursor-pointer text-left ${picked !== undefined && oi === q.correct ? 'bg-green-800 text-white' : picked === oi && oi !== q.correct ? 'bg-red-800 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>{opt}</button>
            ))}
          </div>
          {picked !== undefined && <p className="mt-2 text-sm text-gray-400">💡 {q.explanation}</p>}
        </div>
      );
    })}
  </div>
);

const BossTab: React.FC<{ day: GamifiedDayContent; st: GState; set: (p: Partial<GState>) => void }> = ({ day, st, set }) => {
  const questions = day.bossBattle || [];
  const qIdx = st.bossQ[day.dayNumber] ?? 0;
  const bossHP = st.bossHP[day.dayNumber] ?? 100;
  const score = st.bossScore[day.dayNumber] ?? 0;
  const q = questions[qIdx];
  const gameOver = !!st.bossOver[day.dayNumber];
  const answered = !!st.bossAnswered[day.dayNumber];
  const [timer, setTimer] = useState(q?.timeLimit ?? 0);

  const doTimeout = () => {
    playScream(); set({ isShaking: true }); setTimeout(() => set({ isShaking: false }), 600);
    set({ fearMeter: Math.min(100, st.fearMeter + 10) });
    set({ bossAnswered: { ...st.bossAnswered, [day.dayNumber]: true } });
    setTimeout(() => {
      if (qIdx >= questions.length - 1) set({ bossOver: { ...st.bossOver, [day.dayNumber]: true } });
      else set({ bossQ: { ...st.bossQ, [day.dayNumber]: qIdx + 1 }, bossAnswered: { ...st.bossAnswered, [day.dayNumber]: false } });
    }, 1500);
  };

  useEffect(() => {
    if (!q || gameOver || answered) return;
    setTimer(q.timeLimit);
    const id = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(id); setTimeout(doTimeout, 50); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx, gameOver, answered]);

  const answer = (oi: number) => {
    if (answered || !q) return;
    set({ bossAnswered: { ...st.bossAnswered, [day.dayNumber]: true } });
    if (oi === q.correct) {
      playSuccess();
      set({
        bossScore: { ...st.bossScore, [day.dayNumber]: score + 1 },
        bossHP: { ...st.bossHP, [day.dayNumber]: Math.max(0, bossHP - (100 / questions.length)) },
        points: st.points + 20,
        fearMeter: Math.max(0, st.fearMeter - 3),
      });
    } else {
      playScream(); playBreathing(); set({ showBlood: true }); setTimeout(() => set({ showBlood: false }), 2000); set({ isShaking: true }); setTimeout(() => set({ isShaking: false }), 600);
      set({ fearMeter: Math.min(100, st.fearMeter + 15) });
    }
    setTimeout(() => {
      if (qIdx >= questions.length - 1) set({ bossOver: { ...st.bossOver, [day.dayNumber]: true } });
      else {
        set({ bossQ: { ...st.bossQ, [day.dayNumber]: qIdx + 1 }, bossAnswered: { ...st.bossAnswered, [day.dayNumber]: false } });
      }
    }, 1500);
  };

  const fc = fearColor(st.fearMeter);
  if (gameOver) return (
    <div className="text-center animate-fadeIn p-8 rounded-xl" style={{ background: bossHP <= 0 ? 'rgba(0,100,0,0.3)' : 'rgba(100,0,0,0.3)' }}>
      <div className="text-6xl mb-4">{bossHP <= 0 ? '🏆' : '💀'}</div>
      <h3 className="text-3xl font-bold mb-2" style={{ color: bossHP <= 0 ? '#00ff88' : '#ff4444', ...CREEP }}>{bossHP <= 0 ? 'BOSS DEFEATED!' : 'BOSS SURVIVED'}</h3>
      <p className="text-gray-300 text-lg">Score: {score}/{questions.length}</p>
    </div>
  );
  if (!q) return null;
  return (
    <div>
      <h2 className="text-2xl font-bold text-red-400 mb-4" style={CREEP}>💀 BOSS BATTLE</h2>
      <div className="mb-4"><div className="flex justify-between text-sm mb-1"><span className="text-red-400 font-bold">BOSS HP</span><span className="text-red-400">{Math.round(bossHP)}%</span></div>
        <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700"><div className="h-full bg-gradient-to-r from-red-800 to-red-500 rounded-full transition-all duration-500" style={{ width: `${bossHP}%` }} /></div></div>
      <div className="flex justify-center mb-4"><div className={`text-[15rem] leading-none ${bossHP < 30 ? 'animate-glitch' : bossHP < 60 ? 'animate-rotate' : 'animate-float-slow'}`} style={{ filter: `drop-shadow(0 0 20px ${fc})` }}>{day.artifactEmoji}</div></div>
      <div className="animate-fadeIn" key={qIdx}>
        <div className="flex justify-between items-center mb-3"><span className="text-gray-400">Q{qIdx + 1}/{questions.length}</span><span className={`text-2xl font-bold ${timer <= 3 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`} style={ORBITRON}>⏱️ {timer}s</span></div>
        <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(30,0,0,0.8)', border: '1px solid rgba(139,0,0,0.5)' }}>
          <p className="text-white text-xl font-bold mb-4">{q.question}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options.map((opt, oi) => (
              <button key={oi} onClick={() => answer(oi)} disabled={answered}
                className={`px-4 py-4 rounded-xl text-lg font-bold cursor-pointer transition-all ${answered && oi === q.correct ? 'bg-green-700 text-white scale-105' : answered ? 'bg-gray-800 text-gray-500' : 'bg-gray-800 text-white hover:bg-red-900 hover:scale-105'}`}>{opt}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CluesTab: React.FC<{ day: GamifiedDayContent; st: GState; set: (p: Partial<GState>) => void }> = ({ day, st, set }) => {
  const clues = day.dragDropClues || [];
  const matched = st.clueMatched[day.dayNumber] || [];
  const sel = st.clueSel[day.dayNumber] ?? null;
  const [shuffled] = useState(() => [...clues].sort(() => Math.random() - 0.5));
  return (
    <div>
      <h2 className="text-2xl font-bold text-red-400 mb-4" style={CREEP}>🧩 Connect the Clues</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><h3 className="text-lg font-bold text-gray-300 mb-2">Clues</h3>
          {clues.map((c, i) => <button key={i} onClick={() => !matched.includes(i) && set({ clueSel: { ...st.clueSel, [day.dayNumber]: i } })}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 cursor-pointer text-base ${matched.includes(i) ? 'bg-green-900 text-green-300 line-through' : sel === i ? 'bg-red-900 text-white scale-105' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>{c.clue}</button>)}</div>
        <div><h3 className="text-lg font-bold text-gray-300 mb-2">Meanings</h3>
          {shuffled.map((c, i) => <button key={i} onClick={() => {
            if (sel === null) return;
            if (clues[sel].match === c.match) {
              set({ clueMatched: { ...st.clueMatched, [day.dayNumber]: [...new Set([...(st.clueMatched[day.dayNumber] || []), sel])] }, points: st.points + 15, clueSel: { ...st.clueSel, [day.dayNumber]: null } });
              playSuccess();
            } else {
              playWrong(); set({ isShaking: true }); setTimeout(() => set({ isShaking: false }), 600);
              set({ fearMeter: Math.min(100, st.fearMeter + 5), clueSel: { ...st.clueSel, [day.dayNumber]: null } });
            }
          }}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 cursor-pointer text-base ${matched.some((mi) => clues[mi]?.match === c.match) ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>{c.match}</button>)}</div>
      </div>
      {matched.length === clues.length && <div className="mt-4 p-4 rounded-xl text-center animate-fadeIn" style={{ background: 'rgba(0,100,0,0.3)' }}><p className="text-green-400 font-bold text-xl">🎉 All clues matched!</p></div>}
    </div>
  );
};

/* ────────────────────────── main presenter ────────────────────────── */

export interface GamifiedPresenterProps {
  lesson: GamifiedThemeData;
  fileName?: string;
  learnerName?: string;
  learnerPhoto?: string | null;
  onClose?: () => void;
}

export const GamifiedPresenter: React.FC<GamifiedPresenterProps> = ({ lesson, fileName, learnerName, learnerPhoto, onClose }) => {
  const { state, set } = useGamified(lesson.id || 'gamified', learnerName, lesson.welcomeTitle || lesson.name, fileName);
  const learner = learnerName || 'Learner';

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape' && state.screen === 'day') set({ screen: 'game' });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [state.screen, set]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: '#0a0a0a' }}>
      {state.screen === 'game' ? (
        <GameHubView theme={lesson} st={state} set={set} learnerName={learner} photo={learnerPhoto || null} onBack={onClose || (() => { try { window.location.hash = '#/'; } catch { /* */ } })} />
      ) : (
        (() => {
          const day = dayByNum(lesson, state.currentDay);
          if (!day) return null;
          return <DayView theme={lesson} day={day} st={state} set={set} learnerName={learner} onBack={onClose || (() => { try { window.location.hash = '#/'; } catch { /* */ } })} />;
        })()
      )}
    </div>
  );
};

export default GamifiedPresenter;