import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FlipbookLessonJSON, FlipbookSection, FlipbookActivity, FlipbookVocabItem, FlipbookDialogueLine } from './flipbookTypes';
import {
  FLIPBOOK_TYPE_COLORS,
  FLIPBOOK_TYPE_LABELS,
  FLIPBOOK_TYPE_ICONS,
  FLIPBOOK_TYPE_BG,
  flipbookSectionImage,
  generateFlipbookLeaderboard,
} from './flipbookTypes';

/* ────────────────────────── tiny state store ────────────────────────── */

interface MagazineState {
  page: number;
  xp: number;
  sound: boolean;
  voice: string;
  rate: number;
  completedPages: number[];
  done: Record<string, boolean>;
  answers: Record<string, string | string[] | Record<string, string> | Record<number, number>>;
}

const useMagazine = (lessonId: string, learnerName?: string, lessonTitle?: string, fileName?: string, totalSections = 0) => {
  const storageKey = `tutorly-fb-${lessonId}`;
  const [state, setState] = useState<MagazineState>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved) return { page: 0, xp: 0, sound: true, voice: '', rate: 0.95, completedPages: [], done: {}, answers: {}, ...saved };
    } catch { /* ignore */ }
    return { page: 0, xp: 0, sound: true, voice: '', rate: 0.95, completedPages: [], done: {}, answers: {} };
  });

  const set = useCallback((patch: Partial<MagazineState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        const { page: _p, ...persist } = next;
        localStorage.setItem(storageKey, JSON.stringify(persist));
        // Mirror progress for the tutor dashboard (keyed by learner name).
        if (learnerName) {
          const KEY = `tutorly-flipbook-progress-${learnerName}`;
          let list: any[] = [];
          try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { list = []; }
          const rec = {
            fileName: fileName || lessonId,
            title: lessonTitle || lessonId,
            xp: next.xp,
            level: Math.floor(next.xp / 100) + 1,
            completedPages: [...next.completedPages],
            totalSections,
            answers: { ...next.answers },
            updatedAt: new Date().toISOString(),
          };
          const others = list.filter((r: any) => r.fileName !== rec.fileName);
          others.unshift(rec);
          localStorage.setItem(KEY, JSON.stringify(others.slice(0, 20)));
        }
      } catch { /* ignore */ }
      return next;
    });
  }, [storageKey, learnerName, lessonTitle, fileName, totalSections]);

  const level = Math.floor(state.xp / 100) + 1;
  return { state, set, level };
};

/* ────────────────────────── sounds (Web Audio) ────────────────────────── */

let audioCtx: AudioContext | null = null;
const getCtx = () => { if (!audioCtx) audioCtx = new AudioContext(); return audioCtx; };

const playTone = (freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.3) => {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch { /* audio unavailable */ }
};

const sounds = {
  pageFlip: (enabled: boolean) => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const n = ctx.sampleRate * 0.15;
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 0.4; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.5;
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
    } catch { /* fallback */ }
  },
  correct: (enabled: boolean) => { if (!enabled) return; playTone(523, 0.1); setTimeout(() => playTone(659, 0.1), 100); setTimeout(() => playTone(784, 0.2), 200); },
  wrong: (enabled: boolean) => { if (!enabled) return; playTone(300, 0.15, 'sawtooth', 0.2); setTimeout(() => playTone(250, 0.2, 'sawtooth', 0.15), 150); },
  badge: (enabled: boolean) => { if (!enabled) return; [0, 100, 200, 300, 400].forEach((d, i) => setTimeout(() => playTone(523 + i * 100, 0.15), d)); },
};

/* ────────────────────────── TTS ────────────────────────── */

const pickVoice = (pref?: string): SpeechSynthesisVoice | null => {
  const vs = window.speechSynthesis.getVoices();
  if (!vs.length) return null;
  if (pref) { const m = vs.filter((v) => v.name.toLowerCase().includes(pref.toLowerCase()) || v.name === pref); if (m.length) return m[0]; }
  const nat = vs.filter((v) => /ava|aria|natural|online/.test(v.name.toLowerCase()) && v.lang.startsWith('en'));
  if (nat.length) return nat[0];
  return vs.find((v) => v.lang.startsWith('en')) || null;
};

const speakText = (text: string, voice?: string, rate = 0.95) => {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[✅❌🏆🎯💡🔑⚡🎓📚]/g, ''));
    u.rate = rate; u.pitch = 1;
    const v = pickVoice(voice); if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch { /* tts unavailable */ }
};

/* ────────────────────────── dictionary hook ────────────────────────── */

interface DictResult { word: string; phonetic?: string; meanings: Array<{ partOfSpeech: string; definitions: Array<{ definition: string; example?: string }>; synonyms: string[] }>; }

const useDictionary = () => {
  const [result, setResult] = useState<DictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lookup = useCallback(async (word: string) => {
    if (!word.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setResult({ word: data[0].word, phonetic: data[0].phonetic, meanings: data[0].meanings });
    } catch { setError('Definition not found.'); }
    setLoading(false);
  }, []);
  return { result, loading, error, lookup };
};

/* ────────────────────────── activity card ────────────────────────── */

const ActivityCard: React.FC<{ activity: FlipbookActivity; done: boolean; saved?: string | string[] | Record<string, string> | Record<number, number>; onComplete: (answer: string | string[] | Record<string, string> | Record<number, number>) => void; sound: boolean; compact?: boolean; voice?: string; rate?: number }> = ({ activity, done, saved, onComplete, sound, compact, voice, rate }) => {
  const [selected, setSelected] = useState<string>('');
  const [fill, setFill] = useState<Record<string, string>>({});
  const [match, setMatch] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [short, setShort] = useState('');
  const [dictInput, setDictInput] = useState(typeof saved === 'string' ? saved : '');
  const [dictFeedback, setDictFeedback] = useState<'' | 'ok' | 'bad'>('');
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  // Stop any in-flight recognition when the card unmounts.
  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* */ } }, []);

  const startDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { window.alert('Speech recognition is not supported in this browser — please type your answer.'); return; }
    if (listening) { try { recRef.current?.stop(); } catch { /* */ } setListening(false); return; }
    try {
      const r = new SR();
      r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e: any) => { try { setDictInput(e.results[0][0].transcript); } catch { /* */ } setListening(false); };
      r.onerror = () => setListening(false);
      r.onend = () => setListening(false);
      recRef.current = r;
      setListening(true);
      r.start();
    } catch { setListening(false); }
  };

  const xp = activity.xpReward || 10;
  const isCorrect = (answer: string | string[]): boolean => {
    if (!activity.correctAnswer) return true;
    if (Array.isArray(activity.correctAnswer)) return JSON.stringify(answer) === JSON.stringify(activity.correctAnswer);
    return String(answer).toLowerCase().trim() === String(activity.correctAnswer).toLowerCase().trim();
  };
  const submit = (answer: string | string[] | Record<string, string> | Record<number, number>) => {
    const correct = typeof answer === 'string' || Array.isArray(answer) ? isCorrect(answer) : true;
    if (correct) sounds.correct(sound); else sounds.wrong(sound);
    onComplete(answer);
  };

  const base = compact ? 'text-xs' : 'text-sm';

  if (activity.type === 'multiple-choice' || activity.type === 'true-false') {
    const opts = (activity.options && activity.options.length ? activity.options : ['True', 'False']);
    return (
      <div className={`bg-white border border-[#e8dfc8] rounded-md p-2.5 my-2 shadow-sm ${base}`}>
        <div className="flex items-start gap-2 mb-2"><span className="text-sm">{activity.type === 'true-false' ? '✅' : '🔤'}</span><p className="font-semibold text-gray-800 flex-1">{activity.question}</p></div>
        <div className="space-y-1">
          {opts.map((o) => {
            const isSel = selected === o || String(saved) === String(o);
            const isRight = done && String(o) === String(activity.correctAnswer);
            const isWrongPick = done && isSel && String(o) !== String(activity.correctAnswer);
            return (
              <button key={o} disabled={done} onClick={() => { setSelected(o); submit(o); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-all ${isRight ? 'bg-green-50 border-green-400 text-green-800 font-medium' : isWrongPick ? 'bg-red-50 border-red-400 text-red-800' : isSel ? 'bg-blue-50 border-blue-400 text-blue-800' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'}`}>
                {isRight ? '✓ ' : isWrongPick ? '✗ ' : ''}{o}
              </button>
            );
          })}
        </div>
        {done && <p className={`mt-1.5 text-xs font-medium ${String(saved) === String(activity.correctAnswer) ? 'text-green-600' : 'text-red-600'}`}>
          {String(saved) === String(activity.correctAnswer) ? `✓ Correct! +${xp} XP` : `✗ The answer is: ${activity.correctAnswer}`}
        </p>}
      </div>
    );
  }

  if (activity.type === 'fill-blanks' && activity.blanks) {
    return (
      <div className={`bg-white border border-[#e8dfc8] rounded-md p-2.5 my-2 shadow-sm ${base}`}>
        <div className="flex items-start gap-2 mb-2"><span>✏️</span><p className="font-semibold text-gray-800">{activity.question}</p></div>
        <div className="space-y-2.5">
          {activity.blanks.map((b) => {
            const parts = b.sentence.split('_____');
            const v = fill[b.id] ?? '';
            return (
              <div key={b.id} className="flex flex-wrap items-center gap-1">
                <span className="text-gray-700">{parts[0]}</span>
                <input value={v} onChange={(e) => setFill((f) => ({ ...f, [b.id]: e.target.value }))} disabled={done} placeholder="..." className="border-b-2 px-1.5 py-0.5 text-center w-24 focus:outline-none text-xs bg-transparent" style={{ borderColor: done ? (v.trim().toLowerCase() === b.answer.trim().toLowerCase() ? '#16a34a' : '#dc2626') : '#3b82f6', color: done ? (v.trim().toLowerCase() === b.answer.trim().toLowerCase() ? '#16a34a' : '#dc2626') : 'inherit' }} />
                {parts[1] && <span className="text-gray-700">{parts[1]}</span>}
                {done && v.trim().toLowerCase() !== b.answer.trim().toLowerCase() && <span className="text-green-600 text-xs">({b.answer})</span>}
                {b.hint && !done && <span className="text-gray-400 text-xs italic">💡 {b.hint}</span>}
              </div>
            );
          })}
        </div>
        {!done && <button onClick={() => submit(fill)} className="mt-2.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-medium" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>Check Answers</button>}
        {done && <div className="mt-2 text-xs font-medium text-green-600">✓ Submitted! +{xp} XP</div>}
      </div>
    );
  }

  if (activity.type === 'matching' && activity.pairs) {
    const rights = activity.pairs.map((p) => p.right);
    return (
      <div className={`bg-white border border-[#e8dfc8] rounded-md p-2.5 my-2 shadow-sm ${base}`}>
        <div className="flex items-start gap-2 mb-2"><span>🔗</span><p className="font-semibold text-gray-800">{activity.question}</p></div>
        <div className="space-y-1.5">
          {activity.pairs.map((p, i) => {
            const sel = match[p.left] ?? '';
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="flex-1 bg-blue-50 border border-blue-200 rounded px-2 py-1 text-blue-800">{p.left}</span>
                <span className="text-gray-400 text-xs">→</span>
                <select value={sel} disabled={done} onChange={(e) => setMatch((m) => ({ ...m, [p.left]: e.target.value }))} className="flex-1 text-xs border rounded px-1 py-1 bg-white" style={{ borderColor: done ? (sel === p.right ? '#16a34a' : '#dc2626') : '#d1d5db', color: done ? (sel === p.right ? '#16a34a' : '#dc2626') : 'inherit' }}>
                  <option value="">Select...</option>
                  {rights.map((r) => <option key={r} value={r}>{r.length > 40 ? r.substring(0, 40) + '…' : r}</option>)}
                </select>
              </div>
            );
          })}
        </div>
        {!done && <button onClick={() => submit(match)} className="mt-2.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-medium" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>Check Matches</button>}
        {done && <div className="mt-2 text-xs text-green-600 font-medium">✓ Submitted! +{xp} XP</div>}
      </div>
    );
  }

  if (activity.type === 'short-answer') {
    return (
      <div className={`bg-white border border-[#e8dfc8] rounded-md p-2.5 my-2 shadow-sm ${base}`}>
        <div className="flex items-start gap-2 mb-2"><span>📝</span><p className="font-semibold text-gray-800">{activity.question}</p></div>
        <textarea value={short} onChange={(e) => setShort(e.target.value)} disabled={done} placeholder="Write your answer here..." rows={compact ? 2 : 3} className="w-full border rounded-lg p-2 text-xs resize-none focus:outline-none bg-white" style={{ borderColor: done ? '#16a34a' : '#e5e7eb' }} />
        {!done && <button onClick={() => submit(short)} className="mt-2 px-3.5 py-1.5 rounded-lg text-white text-xs font-medium" style={{ background: 'linear-gradient(135deg,#10b981,#047857)' }}>Submit Answer</button>}
        {done && <div className="mt-1 text-xs text-green-600 font-medium">✓ Answer saved! +{xp} XP</div>}
      </div>
    );
  }

  if (activity.type === 'discussion' && activity.discussionPoints) {
    return (
      <div className={`bg-white border border-[#e8dfc8] rounded-md p-2.5 my-2 shadow-sm ${base}`}>
        <div className="flex items-start gap-2 mb-2"><span>💬</span><p className="font-semibold text-gray-800">{activity.question}</p></div>
        <ul className="space-y-1 pl-4 list-decimal text-xs text-gray-700">{activity.discussionPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
        {!done && <button onClick={() => submit('discussed')} className="mt-2.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-medium" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>Mark as Discussed ✓</button>}
        {done && <div className="mt-2 text-xs text-green-600 font-medium">✓ Discussed! +{xp} XP</div>}
      </div>
    );
  }

  if (activity.type === 'dictation') {
    const target = String(activity.text || (typeof activity.correctAnswer === 'string' ? activity.correctAnswer : ''));
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const exact = norm(dictInput) === norm(target) && !!dictInput.trim();
    return (
      <div className={`bg-white border border-[#e8dfc8] rounded-md p-2.5 my-2 shadow-sm ${base}`}>
        <div className="flex items-start gap-2 mb-2"><span>🎧</span><p className="font-semibold text-gray-800 flex-1">{activity.question}</p></div>
        <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-2" style={{ background: 'linear-gradient(135deg,#1a3a5c,#2d5986)' }}>
          <button onClick={() => speakText(target, voice, rate ?? 0.85)} className="w-7 h-7 rounded-full text-xs bg-[rgba(201,168,76,0.8)] text-white">🔊</button>
          <button onClick={startDictation} disabled={done} title={listening ? 'Listening… tap to stop' : 'Speak your answer'} className={`w-7 h-7 rounded-full text-xs text-white transition-all ${listening ? 'bg-red-500 animate-pulse' : 'bg-[rgba(201,168,76,0.8)]'}`}>{listening ? '🔴' : '🎤'}</button>
          <span className="text-white/80 text-xs">Play the audio, then type or speak exactly what you hear</span>
        </div>
        <input value={dictInput} onChange={(e) => setDictInput(e.target.value)} disabled={done} placeholder="Type what you hear..." className="w-full border-2 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none bg-white" style={{ borderColor: done ? (exact ? '#16a34a' : '#dc2626') : '#3b82f6' }} />
        {done && <p className={`mt-1.5 text-xs font-medium ${exact ? 'text-green-600' : 'text-red-600'}`}>{exact ? `✓ Perfect dictation! +${xp} XP` : `✗ Expected: ${target}`}</p>}
        {!done && <button onClick={() => {
          if (!dictInput.trim()) return;
          if (exact) { sounds.correct(sound); setDictFeedback('ok'); onComplete(dictInput); }
          else { sounds.wrong(sound); setDictFeedback('bad'); }
        }} className="mt-2 px-3.5 py-1.5 rounded-lg text-white text-xs font-medium" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>Check Dictation</button>}
        {dictFeedback === 'bad' && !done && <p className="mt-1 text-xs text-amber-600">Listen again — punctuation and small words count!</p>}
      </div>
    );
  }

  if (activity.type === 'speaking' || activity.type === 'roleplay') {
    return (
      <div className={`bg-white border border-[#e8dfc8] rounded-md p-2.5 my-2 shadow-sm ${base}`}>
        <div className="flex items-start gap-2 mb-2"><span>{activity.type === 'roleplay' ? '🎭' : '🎤'}</span><p className="font-semibold text-gray-800">{activity.question}</p></div>
        {activity.speakingPrompts && <ul className="space-y-1 pl-4 list-decimal text-xs text-gray-700 mb-2">{activity.speakingPrompts.map((p, i) => <li key={i}>{p}</li>)}</ul>}
        {!done && <button onClick={() => submit('speaking-done')} className="px-3.5 py-1.5 rounded-lg text-white text-xs font-medium" style={{ background: 'linear-gradient(135deg,#ec4899,#be185d)' }}>✓ Speaking Completed</button>}
        {done && <div className="text-xs text-green-600 font-medium">✓ Speaking done! +{xp} XP</div>}
      </div>
    );
  }

  if (activity.type === 'rating' && activity.ratingCriteria) {
    return (
      <div className={`bg-white border border-[#e8dfc8] rounded-md p-2.5 my-2 shadow-sm ${base}`}>
        <div className="flex items-start gap-2 mb-2"><span>⭐</span><p className="font-semibold text-gray-800">{activity.question}</p></div>
        <div className="space-y-2">
          {activity.ratingCriteria.map((c, i) => (
            <div key={i}>
              <p className="text-gray-600 text-xs mb-0.5">{c}</p>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} disabled={done} onClick={() => setRatings((r) => ({ ...r, [i]: s }))} className="text-base transition-transform hover:scale-110" style={{ color: (ratings[i] || 0) >= s ? '#f59e0b' : '#d1d5db' }}>★</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {!done && <button onClick={() => submit(ratings)} className="mt-2.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-medium" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>Submit Ratings</button>}
        {done && <div className="mt-2 text-xs text-green-600 font-medium">✓ Rated! +{xp} XP</div>}
      </div>
    );
  }

  return <div className={`bg-white border border-[#e8dfc8] rounded-md p-2.5 my-2 ${base} text-gray-500 italic`}>Activity type "{activity.type}" — {activity.question}</div>;
};

/* ────────────────────────── vocab / dialogue / podcast ────────────────────────── */

const VocabCard: React.FC<{ item: FlipbookVocabItem }> = ({ item }) => {
  const { result, loading, lookup } = useDictionary();
  const [hover, setHover] = useState(false);
  useEffect(() => { if (hover && !result && !loading) lookup(item.word); }, [hover, result, loading, lookup, item.word]);
  return (
    <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="border rounded-lg p-2 cursor-pointer transition-all hover:shadow-md bg-white" style={{ borderColor: '#e8dfc8' }}>
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-bold text-gray-900" style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.75rem' }}>{item.word}</span>
          <span className="text-xs px-1 py-0.5 rounded" style={{ background: '#f0f9ff', color: '#0369a1', fontSize: '0.6rem' }}>{item.partOfSpeech}</span>
        </div>
        <p className="text-gray-500 leading-snug" style={{ fontSize: '0.65rem' }}>{item.definition}</p>
        {item.example && <p className="text-gray-400 italic mt-0.5 leading-snug" style={{ fontSize: '0.62rem' }}>e.g. "{item.example.split('|')[0].trim().substring(0, 80)}"</p>}
        {item.difficulty && <span className="inline-block px-1 py-0.5 rounded mt-1" style={{ background: item.difficulty === 'advanced' ? '#fef2f2' : item.difficulty === 'intermediate' ? '#fef3c7' : '#f0fdf4', color: item.difficulty === 'advanced' ? '#991b1b' : item.difficulty === 'intermediate' ? '#92400e' : '#166534', fontSize: '0.55rem', fontWeight: 600 }}>{item.difficulty}</span>}
      </div>
      <AnimatePresence>
        {hover && (result || loading) && (
          <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute z-50 rounded-xl p-3 shadow-2xl bg-white" style={{ border: '2px solid #c9a84c', top: '100%', left: 0, right: 0, marginTop: 4, minWidth: 180 }}>
            {loading && <p className="text-xs text-gray-400">Looking up...</p>}
            {result && (<>
              <p className="font-bold text-gray-900 mb-1" style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.8rem' }}>{result.word} {result.phonetic && <span className="text-gray-400 font-normal font-mono">{result.phonetic}</span>}</p>
              {result.meanings[0] && <p className="text-gray-700" style={{ fontSize: '0.7rem' }}>{result.meanings[0].definitions[0]?.definition}</p>}
            </>)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DialogueDisplay: React.FC<{ lines: FlipbookDialogueLine[] }> = ({ lines }) => (
  <div className="space-y-1.5">
    {lines.map((line, i) => {
      const isA = i % 2 === 0;
      return (
        <div key={i} className={`flex gap-1.5 ${isA ? '' : 'flex-row-reverse'}`}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0 mt-0.5 font-black" style={{ background: isA ? '#1a3a5c' : '#c9a84c', fontSize: '0.55rem' }}>{line.speaker.charAt(0)}</div>
          <div className={`max-w-[82%] rounded-xl px-2 py-1.5 ${isA ? 'rounded-tl-none' : 'rounded-tr-none'}`} style={{ background: isA ? '#f0f4f8' : '#fef9e7', border: `1px solid ${isA ? '#e2e8f0' : '#fef3c7'}` }}>
            <p className="font-black mb-0.5" style={{ color: isA ? '#1a3a5c' : '#92400e', fontSize: '0.6rem' }}>{line.speaker}</p>
            <p className="text-gray-700 leading-snug" style={{ fontSize: '0.67rem' }}>{line.text}</p>
            {line.emotion && <p className="text-gray-400 italic mt-0.5" style={{ fontSize: '0.6rem' }}>*{line.emotion}*</p>}
          </div>
        </div>
      );
    })}
  </div>
);

const PodcastPlayer: React.FC<{ text: string; title?: string; variant?: 'podcast' | 'narration'; voice?: string; rate?: number }> = ({ text, title, variant = 'podcast', voice, rate }) => {
  const [playing, setPlaying] = useState(false);
  const isNarration = variant === 'narration';
  const stopUI = () => setPlaying(false);
  return (
    <div className="podcast-bar mb-2.5 flex items-center gap-2 rounded-lg px-3 py-2 text-white" style={{ background: 'linear-gradient(135deg,#1a3a5c,#2d5986)' }}>
      <div className="flex items-end gap-0.5 h-5">{playing ? [3, 5, 7, 5, 3, 7, 5, 3].map((h, i) => <span key={i} className="w-0.5 rounded-full bg-white/70" style={{ height: h, animation: 'wave .5s ease-in-out infinite alternate', animationDelay: `${i * 0.08}s` }} />) : <span className="w-3 text-xs">{isNarration ? '🎧' : '🎙️'}</span>}</div>
      <div className="flex-1 min-w-0"><p className="text-white/90 font-medium text-xs truncate">{isNarration ? `🎧 Read Aloud — ${title || 'Section'}` : (title || 'Listen to this section')}</p><p className="text-white/50 text-xs">{isNarration ? 'Narration • play / pause / stop' : 'Natural AI Voice'}</p></div>
      <button onClick={() => { if (playing) { window.speechSynthesis.cancel(); stopUI(); } else { speakText(text, voice, rate ?? 0.95); setPlaying(true); const poll = window.setInterval(() => { if (!window.speechSynthesis.speaking && !window.speechSynthesis.paused) { window.clearInterval(poll); stopUI(); } }, 500); } }} className="w-7 h-7 rounded-full text-xs bg-[rgba(201,168,76,0.8)]">{playing ? '⏸' : '▶'}</button>
      {isNarration && <button onClick={() => { try { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); else if (window.speechSynthesis.speaking) window.speechSynthesis.pause(); } catch { /* */ } setPlaying(!!window.speechSynthesis.speaking && !window.speechSynthesis.paused); }} className="w-7 h-7 rounded-full text-xs bg-white/15">⏸</button>}
      <button onClick={() => { window.speechSynthesis.cancel(); stopUI(); }} className="w-7 h-7 rounded-full text-xs bg-white/15">⏹</button>
    </div>
  );
};

/* ────────────────────────── pages ────────────────────────── */

const CoverPage: React.FC<{ lesson: FlipbookLessonJSON; photo?: string | null }> = ({ lesson, photo }) => (
  <div className="relative w-full h-full overflow-hidden flex flex-col" style={{ background: 'linear-gradient(160deg,#0a1628 0%,#1a3a5c 40%,#0d0d1a 100%)', color: '#fff', padding: '20px 24px' }}>
    <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#c9a84c,#f5d87a,#c9a84c)' }} />
    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#c9a84c,#f5d87a,#c9a84c)' }} />
    <div className="text-center border-b-2 pb-3 mb-3" style={{ borderColor: 'rgba(201,168,76,0.5)' }}>
      <div className="flex items-center justify-between mb-1 text-white/50 text-[10px] tracking-[2px] uppercase font-sans"><span>{lesson.level}</span><span>{lesson.date}</span></div>
      <h1 className="font-black leading-none" style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(34px,6vw,52px)', background: 'linear-gradient(135deg,#c9a84c 0%,#f5d87a 40%,#c9a84c 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>TUTORLY</h1>
      <p className="text-white/60 text-[10px] tracking-[3px] uppercase mt-0.5 font-sans">Homework Magazine</p>
    </div>
    <div className="flex items-center justify-between text-xs text-white/40 mb-2 font-sans"><span>Special Edition</span><span className="flex items-center gap-1"><span style={{ color: '#c9a84c' }}>★★★★★</span>Premium Issue</span></div>
    <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden mb-3" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(201,168,76,0.3)' }}>
      <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: 'linear-gradient(160deg,#1a3a5c,#2d5986)' }}>
        {photo
          ? <img src={photo} alt={lesson.learnerName || 'Learner'} className="w-full h-full object-cover object-top" />
          : <><div className="text-6xl mb-2">👩‍🎓</div><p className="text-white/60 text-sm font-medium">{lesson.learnerName || 'Learner'}</p></>}
      </div>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 50%)' }} />
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-end justify-between">
        <div><p className="text-white font-black text-lg leading-tight" style={{ fontFamily: 'Playfair Display, serif', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{lesson.learnerName || 'English Learner'}</p><p className="text-white/70 text-xs">{lesson.level} • {lesson.topic}</p></div>
        <div className="text-xs px-2 py-1 rounded font-bold" style={{ background: '#c9a84c', color: '#0d0d1a' }}>EXCLUSIVE</div>
      </div>
    </div>
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1"><div className="h-px flex-1" style={{ background: '#c9a84c' }} /><span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#c9a84c' }}>This Issue</span><div className="h-px flex-1" style={{ background: '#c9a84c' }} /></div>
      <h2 className="text-white font-black leading-tight text-center" style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(13px,2.4vw,20px)' }}>{lesson.title}</h2>
      <p className="text-white/50 text-xs text-center mt-1 italic" style={{ fontFamily: 'Merriweather, serif' }}>{lesson.coverTagline || lesson.description}</p>
    </div>
    <div className="border-t pt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-sans" style={{ borderColor: 'rgba(201,168,76,0.3)' }}>
      {['Reading & Comprehension', 'Grammar Masterclass', 'Vocabulary Builder', 'Speaking & Debate', 'Business English', 'Survival Language'].map((item) => (
        <div key={item} className="flex items-center gap-1"><span style={{ color: '#c9a84c' }} className="text-xs">▸</span><span className="text-white/60 text-xs">{item}</span></div>
      ))}
    </div>
    <div className="mt-3 flex items-center justify-between text-white/30 text-xs font-sans"><span>tutorly.com</span><span>© Tutorly Education</span></div>
  </div>
);

const TocPage: React.FC<{ lesson: FlipbookLessonJSON; onNavigate: (page: number) => void }> = ({ lesson, onNavigate }) => (
  <div className="relative w-full h-full overflow-hidden flex flex-col" style={{ background: '#faf8f3' }}>
    <div className="px-6 py-4 border-b-2 shrink-0" style={{ borderColor: '#c9a84c' }}>
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-bold tracking-widest uppercase text-gray-400 font-sans">Contents</p><h1 className="font-black text-gray-900 leading-tight" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem' }}>Table of Contents</h1></div>
        <div className="text-4xl opacity-20">📚</div>
      </div>
      <p className="text-gray-500 text-xs mt-1 italic" style={{ fontFamily: 'Merriweather, serif' }}>{lesson.title} • {lesson.level}</p>
    </div>
    <div className="px-4 py-3 overflow-y-auto flex-1">
      {lesson.sections.map((sec, i) => (
        <button key={sec.id} onClick={() => onNavigate(i + 2)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:scale-[1.01] mb-1.5" style={{ background: 'white', border: '1px solid #f0e8d8', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <span className="text-xl flex-shrink-0">{FLIPBOOK_TYPE_ICONS[sec.type] || '📄'}</span>
          <div className="flex-1 min-w-0"><p className="font-semibold text-gray-800 text-xs truncate" style={{ fontFamily: 'Playfair Display, serif' }}>{sec.title}</p><p className="text-gray-400 text-xs capitalize">{sec.type.replace(/-/g, ' ')}</p></div>
          <div className="flex items-center gap-2 flex-shrink-0">{sec.activities && sec.activities.length > 0 && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.65rem' }}>{sec.activities.length} activities</span>}<span className="text-gray-300 font-mono text-xs">{i + 3}</span><span className="text-gray-200 text-xs">→</span></div>
        </button>
      ))}
    </div>
    <div className="shrink-0 px-6 py-2 border-t flex items-center justify-between text-gray-400 text-xs font-sans" style={{ borderColor: '#e8dfc8', background: '#faf8f3' }}><span>Tutorly Homework Magazine</span><span>{lesson.sections.length} sections</span></div>
  </div>
);

const SectionPageContent: React.FC<{ section: FlipbookSection; pageNumber: number; photo?: string | null; state: MagazineState; level: number; sound: boolean; onComplete: (id: string, answer: string | string[] | Record<string, string> | Record<number, number>) => void; onMarkPageComplete: (page: number) => void }> = ({ section, pageNumber, photo, state, level, sound, onComplete, onMarkPageComplete }) => {
  const accent = FLIPBOOK_TYPE_COLORS[section.type] || '#1a3a5c';
  const typeLabel = FLIPBOOK_TYPE_LABELS[section.type] || section.type.replace(/-/g, ' ');
  const bg = FLIPBOOK_TYPE_BG[section.type] || '#faf8f3';
  const isHorror = section.type === 'horror-story';
  const isAd = section.type === 'advertisement';
  const imgUrl = section.imageUrl || flipbookSectionImage(section.type, section.imageQuery);
  const paragraphs = (section.content || '').split('\n').map((p) => p.trim()).filter((p) => p.length > 0);
  const allDone = section.activities?.length ? section.activities.every((a) => state.done[a.id]) : false;
  const isPageComplete = state.completedPages.includes(pageNumber);

  useEffect(() => {
    if (allDone && section.activities?.length && !isPageComplete) {
      onMarkPageComplete(pageNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col" style={{ background: bg, color: isHorror ? '#e5e7eb' : '#1a1a1a', fontFamily: 'Merriweather, Georgia, serif' }}>
      {isPageComplete && <div className="absolute top-2 right-2 z-20 pointer-events-none w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-lg font-bold" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white' }}>✓</div>}
      <div className="h-1 w-full shrink-0" style={{ background: accent }} />
      <div className="shrink-0 px-4 pt-2 pb-1.5 border-b" style={{ borderColor: isHorror ? 'rgba(255,255,255,0.1)' : '#e8dfc8' }}>
        <div className="flex items-center justify-between">
          <span className="px-2 py-0.5 rounded text-white font-black font-sans" style={{ background: accent, fontSize: '0.58rem', letterSpacing: '0.05em' }}>{typeLabel}</span>
          <div className="flex items-center gap-2">{photo && <img src={photo} alt="" className="w-4 h-4 rounded-full object-cover" style={{ border: `1px solid ${accent}` }} />}<span className="font-mono" style={{ fontSize: '0.6rem', color: isHorror ? '#6b7280' : '#d1d5db' }}>{pageNumber}</span></div>
        </div>
        <h2 className="font-black leading-tight mt-1" style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(0.75rem,2vw,1rem)', color: isHorror ? '#f3f4f6' : accent, lineHeight: 1.2 }}>{section.title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2" style={{ minHeight: 0, fontSize: '0.72rem', lineHeight: 1.75 }}>
        {section.content && <PodcastPlayer text={section.content} title={section.title} variant="narration" voice={state.voice} rate={state.rate} />}
        {(section.type.includes('reading') || section.type.includes('story') || section.type.includes('news') || section.type === 'biography' || section.type === 'lifestyle' || section.type === 'listening') && section.content && <PodcastPlayer text={section.content} title={section.title} variant="podcast" voice={state.voice} rate={state.rate} />}
        {!isAd && (
          <div className="rounded-lg overflow-hidden mb-2.5 relative" style={{ height: 80, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
            <img src={imgUrl} alt={section.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${Math.abs(section.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0))}/800/400`; }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${accent}44, transparent 60%)` }} />
            <div className="absolute bottom-1 left-2"><span className="text-white text-xs font-bold font-sans" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)', fontSize: '0.6rem' }}>{section.imageQuery || section.title}</span></div>
          </div>
        )}
        {isAd && <div className="text-center py-4"><div className="text-6xl mb-3">🎓</div><div className="inline-block px-4 py-2 rounded-full mb-3 font-black text-sm" style={{ background: '#c9a84c', color: '#0d0d1a' }}>TUTORLY™</div></div>}
        {paragraphs.length > 0 && (
          <div style={{ columns: 2, columnGap: '0.75rem', columnRule: `1px solid ${isHorror ? 'rgba(255,255,255,0.1)' : '#e8dfc8'}` }}>
            {paragraphs.map((para, i) => {
              if (para.length < 100 && (para === para.toUpperCase() || /^[A-Z\s\d:–\-'"]+$/.test(para))) return (
                <div key={i} style={{ breakInside: 'avoid', marginBottom: '0.4rem' }}><div style={{ height: 1, background: isHorror ? 'rgba(255,255,255,0.1)' : '#e8dfc8', margin: '0.4rem 0' }} /><h3 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '0.72rem', color: isHorror ? '#f9fafb' : accent, marginBottom: '0.3rem' }}>{para}</h3></div>
              );
              if (i === 0) return <p key={i} className="drop-cap" style={{ marginBottom: '0.5rem', textAlign: 'justify', hyphens: 'auto', color: isHorror ? '#e5e7eb' : '#374151' }}>{para}</p>;
              if (i === 2 && para.length > 80) return <div key={i} className="pull-quote" style={{ breakInside: 'avoid' }}>"{para.substring(0, 120)}..."</div>;
              return <p key={i} style={{ marginBottom: '0.4rem', textAlign: 'justify', hyphens: 'auto', color: isHorror ? '#d1d5db' : '#374151', breakInside: 'avoid' }}>{para}</p>;
            })}
          </div>
        )}
        {section.dialogue && section.dialogue.length > 0 && (<div className="mt-2"><div className="section-rule" /><h3 className="font-black mb-2" style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.72rem', color: accent }}>🗣️ Dialogue Practice</h3><DialogueDisplay lines={section.dialogue} /></div>)}
        {section.vocabulary && section.vocabulary.length > 0 && (<div className="mt-2"><div className="section-rule" /><h3 className="font-black mb-2" style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.72rem', color: accent }}>📚 Key Vocabulary</h3><div style={{ columns: 2, columnGap: '0.5rem' }}>{section.vocabulary.map((v) => <div key={v.word} style={{ breakInside: 'avoid', marginBottom: '0.4rem' }}><VocabCard item={v} /></div>)}</div></div>)}
        {section.activities && section.activities.length > 0 && (
          <div className="mt-2">
            <div className="section-rule" />
            <h3 className="font-black mb-1 flex items-center gap-1" style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.72rem', color: accent }}>✏️ Activities <span className="px-1.5 py-0.5 rounded text-white font-sans" style={{ background: accent, fontSize: '0.55rem' }}>{section.activities.length}</span>{allDone && <span className="text-green-500 text-xs">✓ All done!</span>}</h3>
            {section.activities.map((a) => <ActivityCard key={a.id} activity={a} done={state.done[a.id]} saved={state.answers[a.id]} onComplete={(answer) => onComplete(a.id, answer)} sound={sound} compact voice={state.voice} rate={state.rate} />)}
          </div>
        )}
        <div className="h-4" />
      </div>
      <div className="shrink-0 px-4 py-1.5 border-t flex items-center justify-between font-sans" style={{ borderColor: isHorror ? 'rgba(255,255,255,0.1)' : '#e8dfc8', background: isHorror ? 'rgba(0,0,0,0.2)' : 'rgba(250,248,243,0.95)' }}>
        <span style={{ color: isHorror ? '#6b7280' : '#d1d5db', fontSize: '0.62rem', fontFamily: 'Playfair Display, serif', fontStyle: 'italic' }}>Tutorly Magazine</span>
        <div className="flex items-center gap-2">{isPageComplete && <span style={{ color: '#16a34a', fontSize: '0.6rem' }}>✓ Page Complete</span>}<span style={{ color: isHorror ? '#6b7280' : '#d1d5db', fontSize: '0.62rem' }}>{pageNumber}</span></div>
      </div>
      <p className="hidden">XP {state.xp} Lv {level}</p>
    </div>
  );
};

const BackCoverPage: React.FC<{ lesson: FlipbookLessonJSON; state: MagazineState; level: number }> = ({ lesson, state, level }) => {
  const leaderboard = useMemo(() => generateFlipbookLeaderboard(lesson.learnerName || 'You', state.xp), [lesson.learnerName, state.xp]);
  const myRank = leaderboard.findIndex((e) => e.name === (lesson.learnerName || 'You')) + 1;
  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col" style={{ background: 'linear-gradient(160deg,#0d0d1a 0%,#1a1a2e 50%,#2d1b69 100%)', color: '#fff', padding: '20px 24px' }}>
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#c9a84c,#f5d87a,#c9a84c)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#c9a84c,#f5d87a,#c9a84c)' }} />
      <div className="text-center mb-4"><h1 className="font-black" style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', background: 'linear-gradient(135deg,#c9a84c,#f5d87a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>🏆 Leaderboard</h1><p className="text-white/40 text-xs mt-0.5 font-sans">Global Rankings • This Week</p></div>
      <div className="grid grid-cols-3 gap-3 mb-4 font-sans">
        {[{ label: 'My XP', value: `⚡${state.xp}` }, { label: 'Level', value: `🎓${level}` }, { label: 'Pages Done', value: `🏅${state.completedPages.length}` }].map((s) => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}><div className="text-xl mb-0.5">{s.value}</div><div className="text-white/40 text-xs">{s.label}</div></div>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl flex flex-col" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="px-3 py-2 border-b flex text-xs font-bold text-white/40 uppercase tracking-wider font-sans" style={{ borderColor: 'rgba(201,168,76,0.2)' }}><span className="w-8">#</span><span className="flex-1">Learner</span><span className="w-12 text-right">XP</span><span className="w-8 text-right">Lv.</span></div>
        <div className="overflow-y-auto flex-1">
          {leaderboard.slice(0, 12).map((e, i) => {
            const isMe = e.name === (lesson.learnerName || 'You');
            return (
              <div key={i} className="px-3 py-2 flex items-center border-b font-sans" style={{ borderColor: 'rgba(255,255,255,0.05)', background: isMe ? 'rgba(201,168,76,0.2)' : 'transparent' }}>
                <span className="w-8 text-xs font-bold" style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'rgba(255,255,255,0.4)' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
                <span className="flex-1 flex items-center gap-2"><span className="text-base">{e.avatar}</span><div><p className="text-xs font-medium" style={{ color: isMe ? '#f5d87a' : 'white' }}>{e.name} {isMe && '(You)'}</p><p className="text-white/30 text-xs">{e.flag} {e.country}</p></div></span>
                <span className="w-12 text-right text-xs font-bold" style={{ color: '#c9a84c' }}>{e.xp}</span>
                <span className="w-8 text-right text-xs text-white/40">{e.level}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 text-center font-sans"><p className="text-white/50 text-xs">Your rank: <span style={{ color: '#c9a84c' }} className="font-bold">#{myRank}</span> of {leaderboard.length} learners • {state.completedPages.length} pages completed</p></div>
      <div className="mt-3 text-center border-t pt-3 font-sans" style={{ borderColor: 'rgba(201,168,76,0.3)' }}><p className="font-black text-white" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem' }}><span style={{ color: '#c9a84c' }}>Tutorly</span> Homework Magazine</p><p className="text-white/30 text-xs mt-0.5">{lesson.title} • {lesson.date}</p><p className="text-white/20 text-xs mt-1">tutorly.com • @tutorlyenglish</p></div>
    </div>
  );
};

/* ────────────────────────── main presenter ────────────────────────── */

interface PresenterProps {
  lesson: FlipbookLessonJSON;
  onClose?: () => void;
  onReset?: () => void;
  /** Saved-file name (for progress mirroring) — pass through from FlipBookLivePage. */
  fileName?: string;
  photo?: string | null;
}

const CAT_EMOJIS = ['😺', '😸', '😹', '😻', '😼', '😽', '🐱'];
const CAT_QUOTES = [
  "You're doing BRILLIANTLY! Keep it up! 🌟",
  'Every mistake is a lesson in disguise! 🎓',
  'I believe in you more than catnip! 🐱',
  'Reading is purr-fect for your brain! 📚',
  'Meow! You just got smarter! ✨',
  'Language learning is an adventure — enjoy it! 🌍',
  'Even I had to learn to meow properly! Practice makes perfect! 🎯',
  'Your tutor is SO proud of you right now! 💫',
  'Challenge accepted? Challenge CONQUERED! 💪',
  "You're in the top percentile of cool learners! 🏆",
  "Curiosity didn't kill the cat — it made them fluent! 😻",
  "Take a deep breath. You've got this! 🌸",
];

const FLIP_MS = 900;

export const FlipBookPresenter: React.FC<PresenterProps> = ({ lesson, onClose, onReset, fileName, photo }) => {
  const { state, set, level } = useMagazine(lesson.id, lesson.learnerName, lesson.title, fileName, lesson.sections.length);
  const [showToc, setShowToc] = useState(false);
  const [catEmoji, setCatEmoji] = useState('😺');
  const [catBubble, setCatBubble] = useState('');
  const [winW, setWinW] = useState(window.innerWidth);
  const [turning, setTurning] = useState<{ from: number; to: number; dir: 1 | -1 } | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const total = lesson.sections.length + 3;
  const page = state.page;
  const isMobile = winW < 768;

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load available TTS voices (async — fires again on voiceschanged).
  useEffect(() => {
    const load = () => { try { setVoices(window.speechSynthesis.getVoices()); } catch { /* */ } };
    load();
    try { window.speechSynthesis.addEventListener('voiceschanged', load); } catch { /* */ }
    return () => { try { window.speechSynthesis.removeEventListener('voiceschanged', load); } catch { /* */ } };
  }, []);

  const startFlip = useCallback((to: number) => {
    const clamped = Math.max(0, Math.min(total - 1, to));
    if (clamped === page || turning) return;
    sounds.pageFlip(state.sound);
    const dir: 1 | -1 = clamped > page ? 1 : -1;
    setTurning({ from: page, to: clamped, dir });
    window.setTimeout(() => {
      set({ page: clamped });
      setTurning(null);
      setShowToc(false);
    }, FLIP_MS + 40);
  }, [page, total, turning, state.sound, set]);

  const jumpTo = useCallback((p: number) => {
    const clamped = Math.max(0, Math.min(total - 1, p));
    if (clamped === page || turning) return;
    sounds.pageFlip(state.sound);
    set({ page: clamped });
    setShowToc(false);
  }, [page, total, turning, state.sound, set]);

  const flipTo = useCallback((p: number) => {
    // Adjacent page → realistic turn; far jump (TOC) → instant.
    if (Math.abs(p - page) === 1) startFlip(p); else jumpTo(p);
  }, [page, startFlip, jumpTo]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') flipTo(page + 1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') flipTo(page - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [page, flipTo]);

  const handleComplete = useCallback((id: string, answer: string | string[] | Record<string, string> | Record<number, number>) => {
    const xp = lesson.sections.flatMap((s) => s.activities || []).find((a) => a.id === id)?.xpReward || 10;
    set({ done: { ...state.done, [id]: true }, answers: { ...state.answers, [id]: answer }, xp: state.xp + xp });
  }, [state, set, lesson]);

  const markPageComplete = useCallback((pageNum: number) => {
    if (state.completedPages.includes(pageNum)) return;
    sounds.badge(state.sound);
    set({ completedPages: [...state.completedPages, pageNum] });
  }, [state.completedPages, state.sound, set]);

  const renderPage = useCallback((idx: number) => {
    if (idx <= 0) return <CoverPage lesson={lesson} photo={photo} />;
    if (idx === 1) return <TocPage lesson={lesson} onNavigate={flipTo} />;
    if (idx >= total - 1) return <BackCoverPage lesson={lesson} state={state} level={level} />;
    return <SectionPageContent section={lesson.sections[idx - 2]} pageNumber={idx + 1} photo={photo} state={state} level={level} sound={state.sound} onComplete={handleComplete} onMarkPageComplete={markPageComplete} />;
  }, [lesson, photo, state, level, flipTo, handleComplete, markPageComplete, total]);

  const catQuote = useCallback(() => {
    setCatEmoji(CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)]);
    setCatBubble(CAT_QUOTES[Math.floor(Math.random() * CAT_QUOTES.length)]);
    if (state.sound) speakText(CAT_QUOTES[Math.floor(Math.random() * CAT_QUOTES.length)], undefined, 1.1);
    window.setTimeout(() => setCatBubble(''), 4200);
  }, [state.sound]);

  // Two-page spread model. `page` is the RIGHT page index (0 = cover, 1 = TOC, …).
  // leftIdx = page-1 (or none for the cover), rightIdx = page. When turning,
  // `turning.from` is the page that physically rotates across the spine.
  const leftIdx = page - 1;
  const rightIdx = page;
  const turnIdx = turning ? turning.from : -1;
  const isNext = turning ? turning.dir === 1 : false;
  const leafPage = turning ? turning.from : -1;

  // Sizing: A4 (1:1.414). Desktop = two-page spread; mobile = single portrait page.
  const availH = Math.max(220, window.innerHeight - 150);
  const maxPageH = Math.min(availH, 880);
  let pageW: number, pageH: number, spreadW: number;
  if (isMobile) {
    pageW = Math.max(180, Math.min(window.innerWidth - 28, maxPageH / 1.414));
    pageH = Math.min(maxPageH, pageW * 1.414);
    spreadW = pageW;
  } else {
    pageW = Math.max(200, Math.min((window.innerWidth - 120) / 2, maxPageH / 1.414));
    pageH = Math.min(maxPageH, pageW * 1.414);
    spreadW = pageW * 2 + 8; // two pages + spine gap
  }

  // Which page element occupies the given slot, honoring an in-flight turn.
  const slotContent = (slot: 'left' | 'right') => {
    if (turning) {
      const to = turning.to;
      if (isMobile) {
        // Single-page book: the new page sits in the right slot while the leaf rotates away.
        if (slot === 'right') return renderPage(to);
        return null;
      }
      if (isNext) {
        // old right (`from`) rotates left; new right = `to`.
        if (slot === 'right') return renderPage(to);
        return null; // leaf lands on the left slot
      }
      // old left (`from`) rotates right; new left = `to-1`.
      if (slot === 'left') return renderPage(to - 1);
      return null; // leaf lands on the right slot
    }
    if (isMobile) return slot === 'right' ? renderPage(rightIdx) : null;
    if (slot === 'right') return renderPage(rightIdx);
    return leftIdx >= 0 ? renderPage(leftIdx) : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: 'radial-gradient(ellipse at 40% 40%, #1a3a5c 0%, #0d0d1a 70%)' }}>
      {/* XP bar */}
      <div className="flex items-center gap-3 px-4 py-2 shrink-0" style={{ background: 'linear-gradient(135deg,#0d0d1a,#1a3a5c)', borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
        <span className="hidden sm:block font-black text-sm" style={{ fontFamily: 'Playfair Display, serif', background: 'linear-gradient(135deg,#c9a84c,#f5d87a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Tutorly</span>
        <div className="hidden sm:block w-px h-5 bg-white/20" />
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{ background: 'linear-gradient(135deg,#c9a84c,#f5d87a)', color: '#0d0d1a' }}>{level}</div>
        <div className="hidden sm:block"><p className="text-white text-xs font-medium leading-none">{lesson.learnerName || 'Learner'}</p><p className="text-white/40 text-xs">Level {level}</p></div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="hidden sm:block text-white/60 text-xs shrink-0">XP</span>
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden"><div className="xp-bar-fill h-full" style={{ width: `${state.xp % 100}%`, background: 'linear-gradient(90deg,#f6d365,#fda085)', height: 6, borderRadius: 3, transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} /></div>
          <span className="text-yellow-400 text-xs font-bold shrink-0">⚡{state.xp}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <span className="text-white/40 text-xs">Pg</span>
          <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#c9a84c,#f5d87a)', width: `${total > 1 ? Math.round((page / (total - 1)) * 100) : 0}%` }} /></div>
          <span className="text-white/40 text-xs">{Math.round(total > 1 ? (page / (total - 1)) * 100 : 0)}%</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 shrink-0"><span className="text-xs">🏅</span><span className="text-white/60 text-xs">{state.completedPages.length} done</span></div>
        <button onClick={() => set({ sound: !state.sound })} className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110" style={{ background: 'rgba(255,255,255,0.1)' }}>{state.sound ? '🔊' : '🔇'}</button>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowToc(!showToc)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>📋 <span className="hidden sm:inline">Contents</span></button>
          <button onClick={() => { if (onReset) onReset(); else if (confirm('Restart this magazine? Your XP and progress will be reset.')) { try { Object.keys(localStorage).filter((k) => k.startsWith('tutorly-fb-')).forEach((k) => localStorage.removeItem(k)); } catch { /* */ } window.location.reload(); } }} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white transition-all">← New</button>
          {onClose && <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white transition-all">✕ Close</button>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => flipTo(page - 1)} className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white text-lg transition-all hover:bg-white/10">‹</button>
          <span className="text-white/50 text-xs font-mono px-1">{page + 1} / {total}</span>
          <button onClick={() => flipTo(page + 1)} className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white text-lg transition-all hover:bg-white/10">›</button>
        </div>
        {/* Narration voice & rate picker — persisted with progress */}
        <div className="flex items-center gap-1.5">
          <span className="hidden md:inline text-white/40 text-xs">🎧</span>
          <select
            value={state.voice || ''}
            onChange={(e) => set({ voice: e.target.value })}
            title="Read-aloud voice"
            className="bg-[rgba(255,255,255,0.1)] text-white text-[11px] rounded-md px-1.5 py-1 outline-none border border-white/10 max-w-[110px] md:max-w-[150px]"
          >
            <option value="" className="text-gray-800">Auto voice</option>
            {voices.filter((v) => v.lang.startsWith('en')).map((v) => (
              <option key={v.name} value={v.name} className="text-gray-800">{v.name.replace(/\s*\(.*?\)/g, '')}{v.lang !== 'en-US' ? ` (${v.lang})` : ''}</option>
            ))}
          </select>
          <select
            value={String(state.rate ?? 0.95)}
            onChange={(e) => set({ rate: parseFloat(e.target.value) })}
            title="Narration speed"
            className="bg-[rgba(255,255,255,0.1)] text-white text-[11px] rounded-md px-1.5 py-1 outline-none border border-white/10"
          >
            <option value="0.7" className="text-gray-800">0.7× Slow</option>
            <option value="0.85" className="text-gray-800">0.85×</option>
            <option value="0.95" className="text-gray-800">0.95×</option>
            <option value="1.1" className="text-gray-800">1.1×</option>
            <option value="1.25" className="text-gray-800">1.25× Fast</option>
          </select>
        </div>
      </div>

      {/* Book — two-page spread with a realistic page turn */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden relative" style={{ perspective: 2600 }}>
        <button onClick={() => flipTo(page - 1)} disabled={!!turning || page === 0} className="hidden sm:flex shrink-0 w-10 h-10 rounded-full items-center justify-center text-white/50 hover:text-white text-2xl transition-all hover:scale-110 hover:bg-white/10 mr-4 disabled:opacity-30" aria-label="Previous page">‹</button>

        <div className="relative" style={{ width: spreadW, height: pageH, filter: 'drop-shadow(0 34px 70px rgba(0,0,0,0.85))' }}>
          {/* Base spread */}
          <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
            {/* Left page slot */}
            <div className="absolute" style={{ left: 0, top: 0, width: pageW, height: pageH }}>
              {!isMobile && slotContent('left') && (
                <div className="w-full h-full overflow-hidden rounded-l-sm" style={{ boxShadow: 'inset -22px 0 40px rgba(0,0,0,0.22), -5px 0 16px rgba(0,0,0,0.3)' }}>
                  {slotContent('left')}
                </div>
              )}
            </div>

            {/* Right page slot */}
            <div className="absolute" style={{ left: isMobile ? 0 : pageW + 8, top: 0, width: pageW, height: pageH }}>
              {slotContent('right') && (
                <div className="w-full h-full overflow-hidden rounded-r-sm" style={{ boxShadow: 'inset 22px 0 40px rgba(0,0,0,0.22), 5px 0 16px rgba(0,0,0,0.3)' }}>
                  {slotContent('right')}
                </div>
              )}
            </div>

            {/* Spine gutter shadow (desktop) */}
            {!isMobile && <div className="absolute top-0 bottom-0 w-8" style={{ left: pageW - 4, zIndex: 5, background: 'linear-gradient(to right, rgba(0,0,0,0.28), transparent 60%, rgba(0,0,0,0.28))' }} />}

            {/* Rotating leaf — the page physically turning across the spine */}
            {turning && (
              <div
                className="absolute"
                style={{
                  top: 0,
                  width: pageW,
                  height: pageH,
                  zIndex: 20,
                  transformStyle: 'preserve-3d',
                  transformOrigin: isNext ? 'left center' : 'right center',
                  left: isNext ? (isMobile ? 0 : pageW + 8) : (isMobile ? 0 : 0),
                  animation: isNext
                    ? `pageTurnNext ${FLIP_MS}ms cubic-bezier(0.33, 0.1, 0.18, 1) forwards`
                    : `pageTurnPrev ${FLIP_MS}ms cubic-bezier(0.33, 0.1, 0.18, 1) forwards`,
                }}
              >
                {/* Front face (what you see before turning) */}
                <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', overflow: 'hidden' }}>
                  {renderPage(leafPage)}
                </div>
                {/* Back face (blank paper as it turns away) */}
                <div
                  className="absolute inset-0"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: 'linear-gradient(120deg,#fdfcf8,#f4efe3)',
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.12)',
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center opacity-40" style={{ fontFamily: 'Playfair Display, serif', color: '#c9a84c', fontSize: 40 }}>✦</div>
                </div>
              </div>
            )}

            {/* Moving shadow cast by the turning leaf onto the page it lands on */}
            {turning && (
              <div
                className="absolute top-0 bottom-0"
                style={{
                  width: pageW,
                  // Shadow sweeps across the DESTINATION page as the leaf covers it.
                  left: isNext ? (isMobile ? 0 : 0) : (isMobile ? 0 : pageW + 8),
                  zIndex: 15,
                  background: isNext
                    ? 'linear-gradient(to left, rgba(0,0,0,0.45), transparent)'
                    : 'linear-gradient(to right, rgba(0,0,0,0.45), transparent)',
                  animation: (isNext ? 'turnShadowNext' : 'turnShadowPrev') + ` ${FLIP_MS}ms cubic-bezier(0.33, 0.1, 0.18, 1) forwards`,
                }}
              />
            )}
          </div>

          {/* Corner flip hints */}
          <div className="absolute bottom-0 left-0 w-12 h-12 z-30 cursor-pointer opacity-60 hover:opacity-100" style={{ background: 'linear-gradient(315deg, transparent 50%, rgba(201,168,76,0.5) 50%)' }} onClick={() => flipTo(page - 1)} title="Flip left (← arrow key)" />
          <div className="absolute bottom-0 right-0 w-12 h-12 z-30 cursor-pointer opacity-60 hover:opacity-100" style={{ background: 'linear-gradient(135deg, transparent 50%, rgba(201,168,76,0.5) 50%)' }} onClick={() => flipTo(page + 1)} title="Flip right (→ arrow key)" />
        </div>

        <button onClick={() => flipTo(page + 1)} disabled={!!turning || page === total - 1} className="hidden sm:flex shrink-0 w-10 h-10 rounded-full items-center justify-center text-white/50 hover:text-white text-2xl transition-all hover:scale-110 hover:bg-white/10 ml-4 disabled:opacity-30" aria-label="Next page">›</button>
      </div>

      {/* Mobile nav */}
      <div className="sm:hidden flex items-center justify-center gap-8 py-2 shrink-0">
        <button onClick={() => flipTo(page - 1)} className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl" style={{ background: 'rgba(255,255,255,0.1)' }}>‹</button>
        <span className="text-white/40 text-xs">{page + 1} / {total}</span>
        <button onClick={() => flipTo(page + 1)} className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl" style={{ background: 'rgba(255,255,255,0.1)' }}>›</button>
      </div>

      <div className="text-center py-1 shrink-0"><p className="text-white/20 text-xs">← → arrow keys to flip • Right-click text for dictionary</p></div>

      {/* TOC overlay */}
      <AnimatePresence>
        {showToc && (
          <motion.div className="fixed inset-0 z-40 flex items-start justify-start p-4 pt-24" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowToc(false)}>
            <motion.div className="rounded-2xl overflow-hidden shadow-2xl w-80" style={{ maxHeight: 'calc(100vh - 120px)' }} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <TocPage lesson={lesson} onNavigate={flipTo} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cat mascot */}
      <div className="fixed bottom-4 right-4 z-50">
        <AnimatePresence>
          {catBubble && (
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 10 }} className="absolute bottom-16 right-0 w-56 rounded-2xl p-3 text-sm font-medium shadow-xl bg-white" style={{ border: '2px solid #c9a84c', borderBottomRightRadius: 4 }}>
              <p className="text-gray-800">{catBubble}</p>
              <div className="absolute bottom-[-8px] right-6 w-4 h-4 bg-white border-r-2 border-b-2" style={{ borderColor: '#c9a84c', transform: 'rotate(45deg)' }} />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-2xl" style={{ background: 'linear-gradient(135deg,#1a3a5c,#2d5986)', border: '3px solid #c9a84c', animation: 'cat-bounce 2s ease-in-out infinite' }} onClick={catQuote} title="Cat Assistant – click for encouragement">{catEmoji}</motion.button>
      </div>

      <style>{`
        @keyframes cat-bounce { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-6px) rotate(3deg); } }
        @keyframes wave { from { transform: scaleY(0.5); } to { transform: scaleY(1.5); } }
        /* Realistic page turn — the leaf rotates across the spine in 3D */
        @keyframes pageTurnNext {
          0%   { transform: rotateY(0deg); box-shadow: -6px 0 22px rgba(0,0,0,0.5); }
          45%  { box-shadow: -18px 0 46px rgba(0,0,0,0.7); }
          100% { transform: rotateY(-180deg); box-shadow: 8px 0 24px rgba(0,0,0,0.45); }
        }
        @keyframes pageTurnPrev {
          0%   { transform: rotateY(0deg); box-shadow: 6px 0 22px rgba(0,0,0,0.5); }
          45%  { box-shadow: 18px 0 46px rgba(0,0,0,0.7); }
          100% { transform: rotateY(180deg); box-shadow: -8px 0 24px rgba(0,0,0,0.45); }
        }
        /* Sweeping shadow on the destination page */
        @keyframes turnShadowNext { 0% { transform: translateX(0); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateX(-100%); opacity: 0; } }
        @keyframes turnShadowPrev { 0% { transform: translateX(0); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateX(100%); opacity: 0; } }
        .pull-quote { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; font-style: italic; color: #1a3a5c; border-top: 3px solid #c9a84c; border-bottom: 3px solid #c9a84c; padding: 0.8rem 1rem; margin: 1rem 0; text-align: center; break-inside: avoid; }
        .section-rule { height: 2px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); border: none; margin: 0.6rem 0; }
        .drop-cap::first-letter { font-family: 'Playfair Display', serif; font-size: 3.5em; font-weight: 900; float: left; line-height: 0.8; margin-right: 0.08em; margin-top: 0.05em; color: #c0392b; }
        @media (max-width: 768px) { .drop-cap::first-letter { font-size: 2.5em; } }
      `}</style>
    </div>
  );
};

export default FlipBookPresenter;