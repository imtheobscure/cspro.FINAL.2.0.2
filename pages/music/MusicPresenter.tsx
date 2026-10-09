import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PremiumLesson, MiniLesson, SubtitleLine, WordHighlight, ActivityBlock, CardIteration } from './musicTypes';
import { normalizeLesson } from './lessonNormalizer';
import { clearSavedTimings, loadSavedTimings, saveTimings } from '../../utils/musicTimingStore';

/* ────────────────────────── helpers ────────────────────────── */

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, '0')}`;
const round1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;

const CATS = ['😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🐱'];

const cleanWord = (w: string) => w.replace(/[.,/#!$%^&*;:{}=\\-_`~()?"'’]/g, '').toLowerCase();

/** Light-first surfaces shared by every panel — the app's `dark` class still flips them. */
const SURFACE = 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800';
const MUTED = 'text-slate-500 dark:text-zinc-400';
const BTN_GHOST = 'font-black rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors';
const BTN_PRIMARY = 'font-black rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white hover:from-fuchsia-500 hover:to-indigo-500 transition-all shadow-md shadow-fuchsia-500/20';
const FIELD = 'w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 px-3 py-2 outline-none focus:border-fuchsia-500';

const HL_COLORS: Record<string, string> = {
  idiom: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/30 dark:text-amber-200 dark:border-amber-500/40',
  phrasal_verb: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-500/30 dark:text-pink-200 dark:border-pink-500/40',
  vocab: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-500/30 dark:text-cyan-200 dark:border-cyan-500/40',
  grammar: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/30 dark:text-emerald-200 dark:border-emerald-500/40',
};

interface DictEntry { definition: string; example: string; phonetic: string; audio: string; }

const nativeLanguage = (lesson: PremiumLesson) => lesson.l1 || lesson.learnerProfile?.l1 || 'your language';

const isYouTubeUrl = (url: string) => /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)/i.test(url || '');
const youTubeId = (url: string) => (String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i) || [])[1] || '';

/* ────────────────────────── native-language (L1) blocks ────────────────────────── */

/** Amber "easy version" twin shown under every English block. */
function L1Panel({ lang, heading, body }: { lang: string; heading?: string; body?: string }) {
  if (!heading && !body) return null;
  return (
    <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-300 font-bold mb-1.5">🗣 Easy version · {lang}</p>
      {heading && <p className="text-base font-black text-amber-900 dark:text-amber-200 mb-1">{heading}</p>}
      {body && <div className="music-prose mt-2 text-amber-900/90 dark:text-amber-100/90" dangerouslySetInnerHTML={{ __html: body }} />}
    </div>
  );
}

function L1Line({ lang, text }: { lang: string; text?: string }) {
  if (!text) return null;
  return <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">🗣 {text}</p>;
}

/* ────────────────────────── dictionary popup ────────────────────────── */

function DictionaryPopup({ word, highlight, lang, onClose }: { word: string; highlight: WordHighlight | null; lang: string; onClose: () => void }) {
  const [entry, setEntry] = useState<DictEntry | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (highlight) return;
    setEntry(null);
    const w = cleanWord(word);
    if (!w) return;
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`)
      .then(r => { if (!r.ok) throw new Error('nf'); return r.json(); })
      .then((data: any) => {
        const e = data[0];
        setEntry({
          definition: e?.meanings?.[0]?.definitions?.[0]?.definition || 'No definition found.',
          example: e?.meanings?.[0]?.definitions?.[0]?.example || '',
          phonetic: e?.phonetic || e?.phonetics?.find((p: any) => p.text)?.text || '',
          audio: e?.phonetics?.find((p: any) => p.audio)?.audio || '',
        });
      })
      .catch(() => setEntry({ definition: 'Sorry, we could not find a definition for this word.', example: '', phonetic: '', audio: '' }));
  }, [word, highlight]);

  const playAudio = () => {
    if (highlight) {
      const u = new SpeechSynthesisUtterance(highlight.word);
      window.speechSynthesis.speak(u);
      return;
    }
    if (entry?.audio) {
      if (!audioRef.current) audioRef.current = new Audio(entry.audio);
      else audioRef.current.src = entry.audio;
      audioRef.current.play().catch(() => {});
    } else {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
    }
  };

  const typeCls = highlight ? (HL_COLORS[highlight.type] || HL_COLORS.vocab) : 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className={`${SURFACE} rounded-3xl p-7 max-w-lg w-full shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-5">
          <div>
            {highlight && <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md border font-bold ${typeCls}`}>{highlight.type.replace('_', ' ')}</span>}
            <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white capitalize mt-2">{highlight ? highlight.word : cleanWord(word)}</h3>
            {entry?.phonetic && !highlight && <span className="text-indigo-500 font-mono text-sm block mt-1">{entry.phonetic}</span>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 flex items-center justify-center">✕</button>
        </div>
        <div className="space-y-4">
          {highlight ? (
            <>
              <div><div className={`text-xs font-bold uppercase tracking-wider mb-1 ${MUTED}`}>Translation · {lang}</div><p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{highlight.translation}</p></div>
              <div><div className={`text-xs font-bold uppercase tracking-wider mb-1 ${MUTED}`}>Definition</div><p className="text-slate-700 dark:text-zinc-300 leading-relaxed text-[15px]">{highlight.definition}</p></div>
              <div><div className={`text-xs font-bold uppercase tracking-wider mb-1 ${MUTED}`}>Example</div><p className="text-indigo-700 dark:text-indigo-200 italic text-[15px]">"{highlight.example}"</p></div>
              {highlight.ccq && <div><div className={`text-xs font-bold uppercase tracking-wider mb-1 ${MUTED}`}>CCQ</div><p className="text-slate-700 dark:text-zinc-300 text-[15px]">{highlight.ccq}</p></div>}
            </>
          ) : (
            <>
              <div><div className={`text-xs font-bold uppercase tracking-wider mb-1 ${MUTED}`}>Definition</div><p className="text-slate-700 dark:text-zinc-300 leading-relaxed text-[15px]">{entry?.definition || 'Loading definition...'}</p></div>
              {entry?.example && <div><div className={`text-xs font-bold uppercase tracking-wider mb-1 ${MUTED}`}>Example</div><p className="text-indigo-700 dark:text-indigo-200 italic text-[15px]">"{entry.example}"</p></div>}
            </>
          )}
          <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex gap-3">
            <button onClick={playAudio} className={`flex-1 py-3 px-4 ${BTN_PRIMARY} text-xs`}>🔊 Listen</button>
            <button onClick={onClose} className={`flex-1 py-3 px-4 ${BTN_GHOST} text-xs`}>Got it</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── activity renderer (inside mini-lesson) ────────────────────────── */

function ActivityPlayer({ activity, card, onAnswer, lang }: {
  activity: ActivityBlock; card: CardIteration; onAnswer: (correct: boolean, fb?: string) => void; lang: string; onCompleteCard?: () => void;
}) {
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [matchSel, setMatchSel] = useState<{ left?: string; right?: string }>({});
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<string[]>(card.ordering || card.sentenceParts || []);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dropZone, setDropZone] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();

  const playAudio = (text: string, rate = 0.85) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const shuffled = useRef<string[] | null>(null);
  if (!shuffled.current && card.scrambled) shuffled.current = card.scrambled.split('');

  const optionCls = (state: 'right' | 'wrong' | 'idle') =>
    `w-full text-left px-4 py-3.5 rounded-xl text-[15px] font-bold border transition-all ${
      state === 'right' ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200'
      : state === 'wrong' ? 'bg-red-50 border-red-300 text-red-800 dark:bg-red-500/15 dark:border-red-500/40 dark:text-red-200'
      : 'bg-slate-50 border-slate-300 text-slate-800 hover:border-fuchsia-400 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:hover:border-fuchsia-500/50'
    }`;

  switch (activity.type) {
    case 'gapFill':
    case 'multipleChoice': {
      const opts = card.options || [];
      return (
        <div className="space-y-2.5">
          {opts.map(o => {
            const isRight = checked && norm(o) === norm(card.answer);
            const isWrongPick = checked && picked === o && norm(o) !== norm(card.answer);
            return (
              <button key={o} disabled={checked} onClick={() => { setPicked(o); const good = norm(o) === norm(card.answer); setChecked(true); onAnswer(good, good ? card.feedbackCorrect : card.feedbackIncorrect); }}
                className={optionCls(isRight ? 'right' : isWrongPick ? 'wrong' : 'idle')}>
                {o}
              </button>
            );
          })}
        </div>
      );
    }
    case 'trueFalse': {
      return (
        <div className="flex gap-3">
          {[true, false].map(v => {
            const isRight = checked && card.answer === v;
            const isWrongPick = checked && picked === String(v) && card.answer !== v;
            return (
              <button key={String(v)} disabled={checked} onClick={() => { setPicked(String(v)); setChecked(true); onAnswer(card.answer === v, card.answer === v ? card.feedbackCorrect : card.feedbackIncorrect); }}
                className={`flex-1 px-4 py-3.5 rounded-xl text-sm font-black border transition-all ${
                  isRight ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200'
                  : isWrongPick ? 'bg-red-50 border-red-300 text-red-800 dark:bg-red-500/15 dark:border-red-500/40 dark:text-red-200'
                  : 'bg-slate-50 border-slate-300 text-slate-800 hover:border-fuchsia-400 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100'
                }`}>
                {v ? '✅ True' : '❌ False'}
              </button>
            );
          })}
        </div>
      );
    }
    case 'scramble': {
      const letters = shuffled.current || [];
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {letters.map((l, i) => (
              <span key={i} className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-lg font-black text-fuchsia-700 dark:text-fuchsia-300">{l}</span>
            ))}
          </div>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type the unscrambled word..." disabled={checked} className={FIELD} />
          <button disabled={checked || !input.trim()} onClick={() => { const good = norm(input) === norm(card.answer); setChecked(true); onAnswer(good, good ? card.feedbackCorrect : card.feedbackIncorrect); }}
            className={`w-full py-3.5 ${BTN_PRIMARY} text-xs uppercase disabled:opacity-40`}>
            Check Answer
          </button>
        </div>
      );
    }
    case 'dictation': {
      return (
        <div className="space-y-4">
          <button onClick={() => playAudio(String(card.answer))} className={`px-4 py-2.5 ${BTN_GHOST} text-xs`}>🔊 Play Audio</button>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type exactly what you hear..." disabled={checked} className={FIELD} />
          <button disabled={checked || !input.trim()} onClick={() => { const good = norm(input) === norm(card.answer); setChecked(true); onAnswer(good, good ? card.feedbackCorrect : card.feedbackIncorrect); }}
            className={`w-full py-3.5 ${BTN_PRIMARY} text-xs uppercase disabled:opacity-40`}>
            Check
          </button>
        </div>
      );
    }
    case 'errorCorrection': {
      return (
        <div className="space-y-4">
          <p className="text-sm font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3.5">{card.mistakeText}</p>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type the corrected sentence..." disabled={checked} className={FIELD} />
          <button disabled={checked || !input.trim()} onClick={() => { const good = norm(input) === norm(card.answer); setChecked(true); onAnswer(good, good ? card.feedbackCorrect : card.feedbackIncorrect); }}
            className={`w-full py-3.5 ${BTN_PRIMARY} text-xs uppercase disabled:opacity-40`}>
            Check
          </button>
        </div>
      );
    }
    case 'match': {
      const pairs = card.pairs || [];
      const lefts = pairs.map(p => p.left);
      const rights = useMemo(() => [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5), [card]);
      const isRight = (l: string, r: string) => pairs.find(p => p.left === l)?.right === r;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2.5">
            {lefts.map(l => (
              <button key={l} onClick={() => setMatchSel({ ...matchSel, left: l })}
                className={`w-full px-3.5 py-3 rounded-xl text-[15px] font-bold border text-left transition-all ${matched[l] ? 'bg-emerald-50 border-emerald-300 text-emerald-800 line-through dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200' : matchSel.left === l ? 'bg-fuchsia-50 border-fuchsia-400 text-slate-900 dark:bg-fuchsia-500/20 dark:border-fuchsia-500/50 dark:text-white' : 'bg-slate-50 border-slate-300 text-slate-800 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="space-y-2.5">
            {rights.map(r => {
              const owner = pairs.find(p => p.right === r)?.left;
              const isDone = matched[owner || ''] === r;
              return (
                <button key={r} disabled={isDone} onClick={() => { const l = matchSel.left; if (!l) return; setMatchSel({}); if (isRight(l, r)) setMatched(m => ({ ...m, [l]: r })); else onAnswer(false, 'Not quite — try another pair!'); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-[15px] font-bold border transition-all ${isDone ? 'bg-emerald-50 border-emerald-300 text-emerald-800 line-through dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200' : 'bg-slate-50 border-slate-300 text-slate-800 hover:border-fuchsia-400 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100'}`}>
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case 'ordering':
    case 'sentenceBuilder': {
      const move = (from: number, to: number) => setOrder(o => { const c = [...o]; const [it] = c.splice(from, 1); c.splice(to, 0, it); return c; });
      const good = order.join(' ').toLowerCase() === (card.correctOrder || []).join(' ').toLowerCase();
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-center min-h-[52px] p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            {order.map((w, i) => (
              <button key={i} draggable onClick={() => { if (draggedIdx !== null) { move(draggedIdx, i); setDraggedIdx(null); } else setDraggedIdx(i); }}
                className={`px-3.5 py-2.5 rounded-lg text-sm font-black border transition-all ${draggedIdx === i ? 'bg-fuchsia-100 border-fuchsia-400 ring-2 ring-fuchsia-300 dark:bg-fuchsia-500/30 dark:border-fuchsia-500 dark:ring-fuchsia-500/40' : 'bg-white border-slate-300 text-slate-900 hover:border-fuchsia-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white'}`}>
                {w}
              </button>
            ))}
          </div>
          <p className={`text-[11px] text-center ${MUTED}`}>Click a tile, then click its new position.</p>
          <button disabled={checked || !good} onClick={() => { setChecked(true); onAnswer(good, good ? card.feedbackCorrect : card.feedbackIncorrect); }}
            className={`w-full py-3.5 ${BTN_PRIMARY} text-xs uppercase disabled:opacity-40`}>
            Check Order
          </button>
        </div>
      );
    }
    case 'findMistake': {
      const parts = card.sentenceParts || [];
      const wrongIdx = parts.findIndex(w => cleanWord(w) === cleanWord(String(card.answer)));
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {parts.map((w, i) => (
              <button key={i} disabled={checked} onClick={() => { const good = i === wrongIdx; setChecked(true); onAnswer(good, good ? card.feedbackCorrect : card.feedbackIncorrect); }}
                className={`px-3.5 py-2.5 rounded-lg text-[15px] font-black border transition-all ${checked && i === wrongIdx ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/20 dark:border-emerald-500 dark:text-emerald-200' : checked ? 'opacity-50' : 'bg-slate-50 border-slate-300 text-slate-900 hover:border-red-400 dark:bg-zinc-950 dark:border-zinc-800 dark:text-white'}`}>
                {w}
              </button>
            ))}
          </div>
          <p className={`text-[11px] text-center ${MUTED}`}>Click the wrong word.</p>
        </div>
      );
    }
    case 'dragDrop': {
      const options = card.options || [];
      const correctSet = new Set((Array.isArray(card.answer) ? card.answer : [card.answer]).map(norm));
      const good = dropZone.length > 0 && dropZone.every(w => correctSet.has(norm(w))) && options.filter(o => !dropZone.includes(o)).every(o => !correctSet.has(norm(o)));
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {options.map(o => (
              <button key={o} onClick={() => setDropZone(z => z.includes(o) ? z.filter(x => x !== o) : [...z, o])}
                className={`px-3.5 py-2.5 rounded-lg text-sm font-black border transition-all ${dropZone.includes(o) ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/20 dark:border-emerald-500 dark:text-emerald-200' : 'bg-slate-50 border-slate-300 text-slate-900 hover:border-fuchsia-400 dark:bg-zinc-950 dark:border-zinc-800 dark:text-white'}`}>
                {o}
              </button>
            ))}
          </div>
          <div className={`min-h-[58px] p-3 rounded-xl border-2 border-dashed flex flex-wrap gap-2 items-center justify-center ${dropZone.length ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/5' : 'border-slate-300 dark:border-zinc-700'}`}>
            {dropZone.length === 0 ? <span className={`text-[11px] ${MUTED}`}>Click the words that match the category</span> : dropZone.map(w => <span key={w} className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200 text-sm font-black">{w}</span>)}
          </div>
          <button disabled={checked} onClick={() => { setChecked(true); onAnswer(good, good ? card.feedbackCorrect : card.feedbackIncorrect); }}
            className={`w-full py-3.5 ${BTN_PRIMARY} text-xs uppercase disabled:opacity-40`}>
            Check
          </button>
        </div>
      );
    }
    case 'discussionQuestions':
    default: {
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
            <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold mb-1">Speaking Prompt</p>
            <p className="text-[15px] text-slate-800 dark:text-zinc-200 leading-relaxed">{card.prompt || 'Discuss out loud — use target vocabulary from this lesson.'}</p>
          </div>
          <button onClick={() => playAudio(card.question)} className={`px-4 py-2.5 ${BTN_GHOST} text-xs`}>🔊 Hear the Question</button>
          <button onClick={() => onAnswer(true, card.feedbackCorrect || 'Great discussion!')}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase rounded-xl">
            I Discussed It ✓
          </button>
        </div>
      );
    }
  }
}

/* ────────────────────────── mini-lesson modal ────────────────────────── */

function ChallengeModal({ miniLesson, lang, onComplete, onSkip }: { miniLesson: MiniLesson; lang: string; onComplete: (gain: number) => void; onSkip: () => void }) {
  const [step, setStep] = useState<'cards' | 'ccqs' | 'activities' | 'challenge'>('cards');
  const [cardIdx, setCardIdx] = useState(0);
  const [ccqIdx, setCcqIdx] = useState(0);
  const [actIdx, setActIdx] = useState(0);
  const [cardInAct, setCardInAct] = useState(0);
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState<string | null>(null);
  const [fbGood, setFbGood] = useState(true);

  const cards = miniLesson.contentCards || [];
  const ccqs = miniLesson.ccqs || [];
  const act = miniLesson.activities?.[actIdx];
  const card = act?.cards?.[cardInAct];
  const cardData = cards[cardIdx];

  const handleAnswer = (good: boolean, custom?: string) => {
    setFbGood(good);
    setFb(custom || (good ? 'Correct! Well done!' : 'Not quite — try the next one!'));
    if (good) setScore(s => s + 15);
    setTimeout(() => {
      setFb(null);
      if (cardInAct + 1 < (act?.cards.length || 0)) setCardInAct(c => c + 1);
      else if (actIdx + 1 < (miniLesson.activities?.length || 0)) { setActIdx(a => a + 1); setCardInAct(0); }
      else setStep('challenge');
    }, 1400);
  };

  const speak = (t: string) => {
    const u = new SpeechSynthesisUtterance(t.replace(/<[^>]*>/g, '').replace(/[😺😸😹😻😼😽🙀😿😾🐱]/g, ''));
    u.rate = 0.95; u.pitch = 1.15;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const steps: { id: typeof step; label: string }[] = [
    { id: 'cards', label: '1 · Explanation' },
    { id: 'ccqs', label: '2 · Concept check' },
    { id: 'activities', label: '3 · Practice' },
    { id: 'challenge', label: '4 · Challenge' },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-900/55 dark:bg-black/80 backdrop-blur-xl overflow-y-auto">
      <div className={`${SURFACE} rounded-3xl p-5 sm:p-7 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto custom-scrollbar`}>
        {/* header */}
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-200 dark:border-zinc-800 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 dark:border-fuchsia-500/30 font-bold">Interactive Mini-Lesson</span>
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{miniLesson.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{score} XP</span>
            <button onClick={onSkip} className="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">Resume Media ⏩</button>
          </div>
        </div>

        {/* progress rail */}
        <div className="flex flex-wrap gap-2 mt-4">
          {steps.map(s => (
            <span key={s.id} className={`text-[11px] font-black px-3 py-1.5 rounded-full border ${step === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'}`}>{s.label}</span>
          ))}
        </div>

        {/* native language headline */}
        {(miniLesson.l1Title || miniLesson.l1Summary) && (
          <div className="mt-4">
            <L1Panel lang={lang} heading={miniLesson.l1Title || `Easy version · ${lang}`} body={miniLesson.l1Summary ? `<p>${miniLesson.l1Summary}</p>` : undefined} />
          </div>
        )}

        {fb && (
          <div className={`mt-4 p-3.5 rounded-xl text-[15px] font-bold ${fbGood ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300' : 'bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300'}`}>
            {fbGood ? '✅ ' : '💡 '}{fb}
          </div>
        )}

        {step === 'cards' && (
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-[11px] font-mono uppercase ${MUTED}`}>Content Card {cardIdx + 1}/{cards.length}</span>
              <button onClick={() => speak(cardData?.htmlBody || '')} className="text-[11px] px-2.5 py-1 rounded-lg bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:border-fuchsia-500/30 dark:text-fuchsia-300 font-bold">🔊 Read Aloud</button>
            </div>
            <div className="w-full p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
              <h4 className="text-lg sm:text-xl font-black text-fuchsia-700 dark:text-fuchsia-300 mb-3">{cardData?.heading}</h4>
              <div className="music-prose" dangerouslySetInnerHTML={{ __html: cardData?.htmlBody || '' }} />
              <L1Panel lang={lang} heading={cardData?.l1Heading} body={cardData?.l1HtmlBody} />
            </div>
            <button onClick={() => cardIdx + 1 < cards.length ? setCardIdx(c => c + 1) : setStep('ccqs')}
              className={`w-full py-3.5 ${BTN_PRIMARY} text-xs uppercase`}>
              {cardIdx + 1 < cards.length ? 'Next Card →' : 'Continue → Concept Check'}
            </button>
          </div>
        )}

        {step === 'ccqs' && (
          <div className="mt-4 space-y-4">
            <span className={`text-[11px] font-mono uppercase ${MUTED}`}>Quick Concept Check {ccqIdx + 1}/{Math.max(1, ccqs.length)}</span>
            <div className="w-full p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3">
              <p className="text-base sm:text-[17px] font-bold text-slate-900 dark:text-white leading-8">{ccqs[ccqIdx]?.question}</p>
              {!!ccqs[ccqIdx]?.checklist?.length && (
                <div className="flex flex-wrap gap-2">
                  {ccqs[ccqIdx]!.checklist.map((c, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300 text-[11px] font-bold">{c}</span>
                  ))}
                </div>
              )}
              <L1Line lang={lang} text={ccqs[ccqIdx]?.l1Question} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => { setScore(s => s + 15); ccqIdx + 1 < ccqs.length ? setCcqIdx(c => c + 1) : setStep('activities'); }}
                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase rounded-2xl">I Understand ✓ (+15)</button>
              <button onClick={() => speak(ccqs[ccqIdx]?.question || '')} className={`px-4 py-3.5 ${BTN_GHOST} text-xs`}>🔊 Hear</button>
            </div>
          </div>
        )}

        {step === 'activities' && act && card && (
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className={`text-[11px] font-mono uppercase ${MUTED}`}>Activity {actIdx + 1}/{miniLesson.activities.length} · Card {cardInAct + 1}/{act.cards.length}</span>
              <span className={`text-[11px] font-mono ${MUTED}`}>{act.title}</span>
            </div>
            <div className="w-full p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3">
              <h4 className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-300">{card.question}</h4>
              {card.instruction && <p className={`text-[13px] italic ${MUTED}`}>{card.instruction}</p>}
              <ActivityPlayer activity={act} card={card} onAnswer={handleAnswer} lang={lang} />
            </div>
          </div>
        )}

        {step === 'challenge' && (
          <div className="mt-4 space-y-4 text-center">
            <span className="text-5xl block">🎤</span>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">{miniLesson.challenge?.title}</h4>
            <p className={`text-[15px] ${MUTED}`}>{miniLesson.challenge?.instruction}</p>
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-left space-y-2">
              {Array.isArray(miniLesson.challenge?.data?.lines) && miniLesson.challenge.data.lines.map((l: string, i: number) => (
                <p key={i} className="text-[17px] font-black text-fuchsia-700 dark:text-fuchsia-300">"{l}"</p>
              ))}
              {miniLesson.challenge?.data?.situation && <p className="text-[15px] text-slate-700 dark:text-zinc-300">📖 {miniLesson.challenge.data.situation}</p>}
              {Array.isArray(miniLesson.challenge?.data?.checklist) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {miniLesson.challenge.data.checklist.map((c: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300 text-[11px] font-bold">{c}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-r from-fuchsia-50 to-indigo-50 border border-fuchsia-200 dark:from-fuchsia-950/40 dark:to-indigo-950/40 dark:border-fuchsia-500/30 flex items-start gap-4 text-left">
              <span className="text-3xl">😺</span>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-400 font-bold block">Tutor Feedback</span>
                <p className="text-[15px] leading-7 text-slate-700 dark:text-zinc-200 font-medium">{miniLesson.catFeedback}</p>
                <L1Line lang={lang} text={miniLesson.catFeedbackL1} />
              </div>
            </div>
            <button onClick={() => onComplete(score + 50)} className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-[1.01] transition-all">
              Complete & Resume Song (+{score + 50} XP)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── karaoke mode ────────────────────────── */

function KaraokeArena({ lesson, onScore, onBack }: { lesson: PremiumLesson; onScore: (pts: number) => void; onBack: () => void }) {
  const [phase, setPhase] = useState<'setup' | 'singing' | 'results'>('setup');
  const [lineIdx, setLineIdx] = useState(0);
  const [matched, setMatched] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mediaSrc, setMediaSrc] = useState(lesson.mediaUrl);
  const [pitch, setPitch] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recogRef = useRef<any>(null);
  const lines = lesson.subtitles || [];
  const lang = nativeLanguage(lesson);

  const start = () => { setPhase('singing'); setLineIdx(0); setMatched(0); setScore(0); setCombo(0); setTranscript(''); };

  useEffect(() => {
    if (phase !== 'singing') return;
    const audio = audioRef.current;
    if (audio) { audio.currentTime = lines[0]?.start || 0; audio.play().catch(() => {}); }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'; rec.maxAlternatives = 3;
      rec.onresult = (e: any) => {
        let full = '';
        for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript + ' ';
        setTranscript(full.trim());
        const line = lines[Math.min(lineIdx, lines.length - 1)];
        if (!line) return;
        const target = line.text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
        const spoken = full.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
        let count = 0;
        target.forEach(tw => { const tc = tw.replace(/[^a-z]/g, ''); if (spoken.some(sw => { const sc = sw.replace(/[^a-z]/g, ''); return sc.includes(tc) || tc.includes(sc); })) count++; });
        setMatched(m => (count > m ? count : m));
      };
      rec.start();
      recogRef.current = rec;
    }
    return () => { recogRef.current?.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'singing') return;
    const t = setInterval(() => {
      const a = audioRef.current;
      if (!a) return;
      setPitch(Math.random() * 60 + 20);
      const now = a.currentTime;
      const line = lines[lineIdx];
      if (line && now >= line.end && lineIdx < lines.length - 1) {
        const acc = Math.min(100, Math.round((matched / Math.max(1, line.text.split(' ').length)) * 100));
        setScore(s => s + Math.round(acc * 10 * (1 + combo * 0.15)));
        setCombo(c => (acc >= 40 ? c + 1 : 0));
        setMatched(0); setTranscript('');
        setLineIdx(i => i + 1);
      } else if (lineIdx >= lines.length - 1 && lines[lines.length - 1] && now > lines[lines.length - 1].end + 1) {
        finish();
      }
    }, 300);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lineIdx, matched, combo]);

  const finish = () => {
    recogRef.current?.stop();
    audioRef.current?.pause();
    setPhase('results');
    onScore(score);
  };

  const curLine = lines[Math.min(lineIdx, lines.length - 1)];
  const avgAcc = Math.round(((matched / Math.max(1, curLine?.text.split(' ').length || 1)) * 100));
  const words = curLine ? curLine.text.split(' ') : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className={`text-xs font-bold ${MUTED} hover:text-slate-900 dark:hover:text-white`}>← Back to Player</button>
        <span className={`text-xs font-mono ${MUTED}`}>{lesson.songTitle} — {lesson.artist}</span>
      </div>

      {phase === 'setup' && (
        <div className="space-y-5">
          <div className="relative rounded-3xl overflow-hidden h-44 flex items-end bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-slate-900">
            <div className="relative z-10 p-8 flex justify-between items-end w-full">
              <div>
                <span className="text-xs font-mono uppercase tracking-[4px] text-white/80 font-bold">Vocal Arena</span>
                <h2 className="text-3xl font-black text-white tracking-tighter mt-1">Karaoke Studio</h2>
              </div>
              <span className="text-4xl">🎤</span>
            </div>
          </div>
          <div className={`${SURFACE} rounded-3xl p-6 space-y-4`}>
            <div className="p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 text-center">
              <span className="text-3xl block mb-2">🎵</span>
              <p className="text-[15px] font-bold text-slate-900 dark:text-white">Drop an audio file here or paste a backing track URL</p>
              <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto mt-4">
                <input type="text" placeholder="Paste audio/video URL..." value={mediaSrc} onChange={e => setMediaSrc(e.target.value)} className={`${FIELD} text-xs`} />
                <label className={`py-2 px-4 ${BTN_PRIMARY} text-xs cursor-pointer whitespace-nowrap`}>📁 Open from PC
                  <input type="file" accept="audio/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setMediaSrc(URL.createObjectURL(f)); }} />
                </label>
              </div>
            </div>
            <button onClick={start} className="w-full py-4 bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl">
              Sing Live Now ⚡
            </button>
          </div>
        </div>
      )}

      {phase === 'singing' && (
        <div className="space-y-5">
          <audio ref={audioRef} src={mediaSrc} className="hidden" crossOrigin="anonymous" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[{ l: 'Score', v: score.toLocaleString(), c: 'text-fuchsia-600 dark:text-fuchsia-400' }, { l: 'Combo', v: `${combo}x`, c: 'text-indigo-600 dark:text-indigo-400' }, { l: 'Accuracy', v: `${avgAcc}%`, c: 'text-emerald-600 dark:text-emerald-400' }, { l: 'Line', v: `${lineIdx + 1}/${lines.length}`, c: '' }].map((s, i) => (
              <div key={i} className={`p-3 rounded-2xl ${SURFACE} text-center`}>
                <span className={`text-[9px] uppercase block ${MUTED}`}>{s.l}</span>
                <span className={`text-xl font-black ${s.c}`}>{s.v}</span>
              </div>
            ))}
          </div>
          <div className="relative rounded-3xl overflow-hidden min-h-[420px] flex flex-col bg-black shadow-2xl">
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-8">
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-3">
                {words.map((w, i) => (
                  <span key={i} className={`text-4xl md:text-5xl font-black transition-all duration-300 ${i < matched ? 'text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.7)]' : 'text-white/30'}`}>{w}</span>
                ))}
              </div>
              <p className="mt-5 text-xl md:text-2xl font-bold text-amber-300 text-center">{curLine?.translation || ''}</p>
              <div className="mt-5 w-full max-w-sm">
                <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-400 transition-all duration-300" style={{ width: `${words.length ? (matched / words.length) * 100 : 0}%` }} />
                </div>
                <span className="text-[10px] text-white/50 mt-1.5 block text-center">{matched} / {words.length} words matched{lang !== 'your language' ? ` · L1 shown below the line` : ''}</span>
              </div>
            </div>
            <div className="relative z-10 px-6 pb-5">
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 transition-all duration-100" style={{ width: `${pitch}%` }} />
              </div>
              <div className="p-3 mt-3 rounded-xl bg-white/5 border border-white/15">
                <span className="text-[10px] text-fuchsia-300 font-bold block mb-1">Your Voice Recognition</span>
                <p className="text-sm font-mono text-white/80 min-h-[24px]">{transcript || '🎤 Start singing...'}</p>
              </div>
            </div>
          </div>
          <button onClick={finish} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-2xl">Finish Session</button>
        </div>
      )}

      {phase === 'results' && (
        <div className="space-y-6 text-center">
          <span className="text-6xl block">⭐</span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Performance Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className={`p-5 rounded-2xl ${SURFACE}`}><span className={`text-[10px] font-mono uppercase block mb-1 ${MUTED}`}>Score</span><span className="text-3xl font-black text-fuchsia-600 dark:text-fuchsia-400">{score.toLocaleString()}</span></div>
            <div className={`p-5 rounded-2xl ${SURFACE}`}><span className={`text-[10px] font-mono uppercase block mb-1 ${MUTED}`}>Accuracy</span><span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{avgAcc}%</span></div>
            <div className={`p-5 rounded-2xl ${SURFACE}`}><span className={`text-[10px] font-mono uppercase block mb-1 ${MUTED}`}>Best Combo</span><span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{combo}x</span></div>
          </div>
          <button onClick={() => setPhase('setup')} className={`w-full max-w-md mx-auto py-4 ${BTN_PRIMARY} text-sm uppercase`}>Back to Studio</button>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── song search modal ────────────────────────── */

function SongSearch({ onUseTrack, onClose }: { onUseTrack: (url: string, title: string, artist: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState('');
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  const search = () => {
    if (!q.trim()) return;
    setSearching(true); setErr(''); setResults(null);
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q.trim())}&media=music&limit=12&entity=song`)
      .then(r => { if (!r.ok) throw new Error('Search failed'); return r.json(); })
      .then(d => setResults(d.results || []))
      .catch(e => setErr(String(e?.message || e)))
      .finally(() => setSearching(false));
  };

  const playPreview = (i: number, url: string) => {
    if (previewRef.current) { previewRef.current.pause(); previewRef.current.src = ''; }
    if (playingIdx === i) { setPlayingIdx(null); return; }
    const a = new Audio(url);
    a.play().catch(() => {});
    previewRef.current = a;
    setPlayingIdx(i);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/80 backdrop-blur-xl" onClick={onClose}>
      <div className={`${SURFACE} rounded-3xl p-6 shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 dark:border-fuchsia-500/30 font-bold">Free Streaming</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">🔎 Find a Song</h3>
          </div>
          <button onClick={onClose} className={`text-lg ${MUTED} hover:text-slate-900 dark:hover:text-white`}>✕</button>
        </div>
        <div className="flex gap-2 py-4">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search any song, artist or album..." className={FIELD} />
          <button onClick={search} className={`px-5 py-2.5 ${BTN_PRIMARY} text-xs uppercase whitespace-nowrap`}>Search</button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
          {searching && <p className={`text-xs text-center py-10 animate-pulse ${MUTED}`}>🔎 Searching...</p>}
          {err && <p className="text-xs text-red-500 text-center py-10">Search failed: {err}</p>}
          {results && results.length === 0 && <p className={`text-xs text-center py-10 ${MUTED}`}>No songs found. Try another title or artist.</p>}
          {!searching && !err && !results && <p className={`text-xs text-center py-10 ${MUTED}`}>Search iTunes' free catalog — listen to 30-second previews, then load one as your lesson backing track.</p>}
          {(results || []).map((t, i) => (
            <div key={i} className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 hover:border-fuchsia-400 transition-all flex items-center gap-3">
              {t.artworkUrl100
                ? <img src={t.artworkUrl100.replace('100x100', '300x300')} className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-zinc-700" alt="" />
                : <div className="w-12 h-12 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-500/20 flex items-center justify-center text-xl">🎵</div>}
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-black text-slate-900 dark:text-white truncate">{t.trackName}</h5>
                <p className={`text-[11px] truncate ${MUTED}`}>{t.artistName}{t.collectionName ? ` · ${t.collectionName}` : ''}</p>
              </div>
              {t.previewUrl && (
                <>
                  <button onClick={() => playPreview(i, t.previewUrl)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${playingIdx === i ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:border-fuchsia-500/40 dark:text-fuchsia-300'}`}>
                    {playingIdx === i ? '⏹ Stop' : '▶ Preview'}
                  </button>
                  <button onClick={() => onUseTrack(t.previewUrl, t.trackName, t.artistName)}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                    Use Track
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── main presenter ────────────────────────── */

export default function MusicPresenter({ lesson, learnerName, fileName, onBack, onLessonUpdated }: {
  lesson: PremiumLesson;
  learnerName?: string;
  fileName?: string;
  onBack?: () => void;
  /** Fired with the updated lesson whenever a tutor changes lyric timings. */
  onLessonUpdated?: (lesson: PremiumLesson) => void;
}) {
  const [activeLesson, setActiveLesson] = useState<PremiumLesson>(() => {
    const normalized = normalizeLesson(lesson);
    // Timings the tutor synced earlier (here or in the standalone HTML lesson).
    const saved = loadSavedTimings(normalized);
    if (saved?.length) {
      const byIndex = (normalized.subtitles || []).map((line, i) => (saved[i] ? { ...line, start: saved[i].start, end: saved[i].end || line.end, text: saved[i].text || line.text } : line));
      return { ...normalized, subtitles: byIndex };
    }
    return normalized;
  });
  const [view, setView] = useState<'player' | 'karaoke'>('player');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(120);
  const [score, setScore] = useState(0);
  const [miniLesson, setMiniLesson] = useState<MiniLesson | null>(null);
  const [triggeredIds, setTriggeredIds] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<WordHighlight | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const [catMood, setCatMood] = useState(0);
  const [mediaSrc, setMediaSrc] = useState(activeLesson.mediaUrl || '');
  const [mediaLabel, setMediaLabel] = useState('');
  const [ytVideoId, setYtVideoId] = useState('');
  const [captionsOn, setCaptionsOn] = useState(true);
  const [hasVideo, setHasVideo] = useState(false);
  const [lineLoop, setLineLoop] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [tapMode, setTapMode] = useState(false);
  const [tapCursor, setTapCursor] = useState(0);
  const [savedFlash, setSavedFlash] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytRef = useRef<any>(null);
  const ytReadyRef = useRef(false);
  const ytHostRef = useRef<HTMLDivElement | null>(null);

  const lang = nativeLanguage(activeLesson);
  const progressKey = `tutorly-music-progress-${(learnerName || 'Learner')}`;
  const fileKey = fileName || activeLesson.id;
  const subtitles = activeLesson.subtitles || [];
  const activeIndex = subtitles.findIndex(s => time >= s.start && time <= (s.end || s.start + 5));
  const activeSub: SubtitleLine | undefined = activeIndex >= 0 ? subtitles[activeIndex] : undefined;

  /* ── progress mirror (same pattern as flipbook / gamified) ── */
  const mirrorProgress = useCallback(() => {
    try {
      let list: any[] = [];
      try { list = JSON.parse(localStorage.getItem(progressKey) || '[]'); } catch { list = []; }
      const rec = {
        fileName: fileKey, title: activeLesson.songTitle, xp: score, level: Math.floor(score / 500) + 1,
        completedPages: triggeredIds, totalSections: activeLesson.miniLessons.length,
        points: score, updatedAt: new Date().toISOString(),
      };
      const others = list.filter(r => r.fileName !== rec.fileName);
      others.unshift(rec);
      localStorage.setItem(progressKey, JSON.stringify(others.slice(0, 20)));
    } catch { /* ignore */ }
  }, [progressKey, fileKey, score, triggeredIds, activeLesson]);

  useEffect(() => { mirrorProgress(); }, [mirrorProgress]);

  const speak = (text: string, isCat = true) => {
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, '').replace(/[😺😸😹😻😼😽🙀😿😾🐱]/g, ''));
      u.rate = 0.95; u.pitch = isCat ? 1.15 : 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  /* ── media plumbing (one <video> handles both audio and video files) ── */
  useEffect(() => {
    const isYT = isYouTubeUrl(mediaSrc);
    setYtVideoId(isYT ? youTubeId(mediaSrc) : '');
    if (isYT) { videoRef.current?.pause(); setPlaying(false); }
    if (!isYT && videoRef.current) {
      if (videoRef.current.src !== mediaSrc) videoRef.current.src = mediaSrc;
      videoRef.current.playbackRate = speed;
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaSrc]);

  useEffect(() => {
    if (!ytVideoId || !ytHostRef.current) return;
    let cancelled = false;
    const boot = () => {
      if (cancelled || !(window as any).YT?.Player || !ytHostRef.current) return;
      ytReadyRef.current = false;
      ytRef.current = new (window as any).YT.Player(ytHostRef.current, {
        videoId: ytVideoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (ev: any) => { ytReadyRef.current = true; setDuration(ev.target.getDuration() || 120); },
          onStateChange: (ev: any) => setPlaying(ev.data === 1),
        },
      });
    };
    if ((window as any).YT?.Player) boot();
    else {
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => { prev?.(); boot(); };
      if (!document.getElementById('yt-iframe-api')) {
        const s = document.createElement('script');
        s.id = 'yt-iframe-api';
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
    }
    return () => { cancelled = true; };
  }, [ytVideoId]);

  /* ── time ticker ── */
  useEffect(() => {
    const a = videoRef.current;
    const readTime = () => {
      if (ytVideoId) {
        try { return ytRef.current?.getCurrentTime?.() || 0; } catch { return 0; }
      }
      return a?.currentTime || 0;
    };
    const onMeta = () => {
      const d = a?.duration || 0;
      setDuration(d > 0 && isFinite(d) ? d : Math.max(120, subtitles.length ? subtitles[subtitles.length - 1].end : 120));
      // Audio-only sources keep the lyric hero centred; real video docks it low.
      setHasVideo((a?.videoWidth || 0) > 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a?.addEventListener('loadedmetadata', onMeta);
    a?.addEventListener('play', onPlay);
    a?.addEventListener('pause', onPause);
    a?.addEventListener('ended', () => setPlaying(false));

    const tick = setInterval(() => {
      if (!playing) return;
      const t = readTime();
      setTime(t);
      const line = subtitles.find(s => t >= s.start && t <= (s.end || s.start + 5));
      // Line repeat: loop the current lyric line (pronunciation drills).
      if (lineLoop && line && line.end > line.start + 0.2 && t > line.end - 0.05) { seekTo(line.start); return; }
      if (showSync || tapMode) return;
      const hit = activeLesson.miniLessons.find(ml => Math.abs(ml.timeMarker - t) < 0.5 && !triggeredIds.includes(ml.id));
      if (hit) {
        pause();
        setMiniLesson(hit);
        setTriggeredIds(ids => [...ids, hit.id]);
      }
    }, 150);

    return () => {
      a?.removeEventListener('loadedmetadata', onMeta);
      a?.removeEventListener('play', onPlay);
      a?.removeEventListener('pause', onPause);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, subtitles, lineLoop, showSync, tapMode, triggeredIds, activeLesson, ytVideoId]);

  const play = () => {
    if (ytVideoId) { ytRef.current?.playVideo?.(); setPlaying(true); return; }
    videoRef.current?.play().catch(() => {});
    setPlaying(true);
  };
  const pause = () => {
    if (ytVideoId) { ytRef.current?.pauseVideo?.(); setPlaying(false); return; }
    videoRef.current?.pause();
    setPlaying(false);
  };
  const togglePlay = () => (playing ? pause() : play());

  const seekTo = (t: number) => {
    const clamped = Math.max(0, Math.min(t, duration || 0));
    if (ytVideoId) ytRef.current?.seekTo?.(clamped, true);
    else if (videoRef.current) videoRef.current.currentTime = clamped;
    setTime(clamped);
  };

  const goToLine = (dir: number) => {
    if (!subtitles.length) return;
    if (dir > 0) {
      const next = subtitles.find(s => s.start > time + 0.25);
      seekTo(next ? next.start : subtitles[subtitles.length - 1].end || 0);
    } else {
      const prev = [...subtitles].reverse().find(s => s.start < time - 0.6);
      seekTo(prev ? prev.start : 0);
    }
  };

  /* ── lyric timing edits: persist to the shared store + the saved lesson ── */
  const commitTimings = useCallback((next: SubtitleLine[], note: string) => {
    setActiveLesson(prev => {
      const updated = { ...prev, subtitles: next };
      saveTimings(updated, next);
      onLessonUpdated?.(updated);
      return updated;
    });
    setSavedFlash(note);
    setTimeout(() => setSavedFlash(''), 2200);
  }, [onLessonUpdated]);

  const updateLine = (index: number, patch: Partial<SubtitleLine>, note: string) => {
    if (!subtitles[index]) return;
    const next = subtitles.map((s, i) => (i === index ? { ...s, ...patch } : s));
    commitTimings(next, note);
  };

  const shiftAll = (delta: number) => {
    const next = subtitles.map(s => ({
      ...s,
      start: Math.max(0, round1(s.start + delta)),
      end: Math.max(round1(s.start + delta) + 0.2, round1((s.end || s.start) + delta)),
    }));
    commitTimings(next, `All lyric timings shifted ${delta >= 0 ? '+' : ''}${round1(delta)}s — saved.`);
  };

  const autoFit = () => {
    if (!subtitles.length) return;
    const total = duration || 120;
    const step = total / subtitles.length;
    const next = subtitles.map((s, i) => ({ ...s, start: round1(i * step), end: round1(Math.min(total, (i + 1) * step)) }));
    commitTimings(next, `Spread ${next.length} lines evenly across ${fmt(total)} — saved.`);
  };

  const resetTimings = () => {
    clearSavedTimings(activeLesson);
    const fresh = normalizeLesson(lesson);
    setActiveLesson(prev => ({ ...prev, subtitles: fresh.subtitles || [] }));
    setSavedFlash('Timings reset to the lesson values.');
    setTimeout(() => setSavedFlash(''), 2200);
  };

  const tapStamp = () => {
    if (!tapMode) return;
    if (tapCursor >= subtitles.length) {
      setTapMode(false);
      setSavedFlash('All lyric lines are synced 🎉');
      setTimeout(() => setSavedFlash(''), 2400);
      return;
    }
    const t = round1(time);
    const next = subtitles.map((s, i) => {
      if (i === tapCursor) {
        const end = (!s.end || s.end <= t) ? t + 5 : s.end;
        return { ...s, start: t, end };
      }
      if (i === tapCursor - 1) return { ...s, end: t };
      return s;
    });
    commitTimings(next, `Line ${tapCursor + 1} starts at ${fmt(t)} — saved.`);
    setTapCursor(c => c + 1);
  };

  const copyLessonJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(activeLesson, null, 2));
      setSavedFlash('Lesson JSON with your timings copied to the clipboard.');
    } catch {
      setSavedFlash('Could not copy — use “Download JSON” instead.');
    }
    setTimeout(() => setSavedFlash(''), 2600);
  };

  const downloadLessonJson = () => {
    const blob = new Blob([JSON.stringify(activeLesson, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = String(activeLesson.songTitle || 'song').replace(/[^a-z0-9]+/gi, '_') + '_synced_lesson.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 4000);
  };

  // Space owns tap-sync while it is armed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space' && tapMode) { e.preventDefault(); tapStamp(); return; }
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); return; }
      if (e.key === 'ArrowRight') seekTo(time + (e.shiftKey ? 30 : 5));
      if (e.key === 'ArrowLeft') seekTo(time - (e.shiftKey ? 30 : 5));
      if (e.key.toLowerCase() === 'c') setCaptionsOn(v => !v);
      if (e.key.toLowerCase() === 'm') setMuted(m => { if (videoRef.current) videoRef.current.muted = !m; return !m; });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapMode, time, tapCursor, subtitles, playing]);

  const handleChallengeComplete = (gain: number) => {
    setScore(s => s + gain);
    setMiniLesson(null);
    play();
    setCatMood(3);
    speak('Wonderful work! Continuing the song.');
  };

  const handleSkip = () => {
    setMiniLesson(null);
    play();
    speak('Skipping ahead.');
  };

  const useTrack = (url: string, title: string, artist: string) => {
    setMediaSrc(url);
    setMediaLabel(`${title}${artist ? ` — ${artist}` : ''}`);
    setShowSearch(false);
    setTime(0); setDuration(30); setTriggeredIds([]);
    setActiveLesson(l => ({ ...l, mediaUrl: url, songTitle: title, artist }));
  };

  const renderLyricLine = (sub: SubtitleLine) => sub.text.split(' ').map((word, idx) => {
    const clean = cleanWord(word);
    const matched = sub.highlights?.find(h => h.word.toLowerCase() === clean || h.word.toLowerCase().split(' ').includes(clean));
    if (matched) {
      return (
        <span key={idx} onClick={e => { e.stopPropagation(); setSelectedHighlight(matched); }}
          className={`inline-block mx-1 px-2 py-0.5 rounded-lg font-bold border cursor-pointer hover:scale-105 transition-transform ${HL_COLORS[matched.type] || HL_COLORS.vocab}`}>
          {word}
        </span>
      );
    }
    return (
      <span key={idx} onClick={e => { e.stopPropagation(); setSelectedWord(clean); }}
        className="inline-block mx-1 cursor-pointer transition-colors hover:text-fuchsia-300">
        {word}
      </span>
    );
  });

  const isVideoVisible = !ytVideoId && !!mediaSrc && hasVideo;

  const stageLine = subtitles.length ? activeSub : undefined;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      {/* header */}
      <header className={`sticky top-0 z-50 ${SURFACE} border-b px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center text-xl font-black shadow-lg shadow-fuchsia-500/20">🎤</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 dark:border-fuchsia-500/30 font-bold">{activeLesson.level || 'B2'}</span>
              <span className={`text-xs font-medium ${MUTED}`}>{activeLesson.artist}</span>
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{activeLesson.songTitle}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800">
          <button onClick={() => setView('player')} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${view === 'player' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md' : `${MUTED} hover:bg-slate-100 dark:hover:bg-zinc-800`}`}>🎧 Player</button>
          <button onClick={() => setView('karaoke')} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${view === 'karaoke' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md' : `${MUTED} hover:bg-slate-100 dark:hover:bg-zinc-800`}`}>🎤 Karaoke</button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSearch(true)} className={`px-3 py-2 ${BTN_PRIMARY} text-xs flex items-center gap-1.5`}>🔎 Find Song</button>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 font-mono text-xs">⭐ <span className="font-black">{score}</span></div>
          {onBack && <button onClick={onBack} className={`px-3 py-2 ${BTN_GHOST} text-xs`}>← Back</button>}
        </div>
      </header>

      <main className="max-w-[1800px] w-full mx-auto p-4 lg:p-6 flex flex-col gap-6">
        {view === 'player' && (
          <>
            {/* ══ LYRICS-FIRST STAGE ══ */}
            <div className="rounded-3xl overflow-hidden bg-black ring-1 ring-black/40 shadow-[0_30px_70px_-25px_rgba(15,23,42,0.55)] relative">
              <div className="relative w-full aspect-video select-none" onClick={e => { if ((e.target as HTMLElement).closest('button, input, a')) return; togglePlay(); }}>
                <video ref={videoRef} className={`absolute inset-0 w-full h-full object-contain ${isVideoVisible ? '' : 'hidden'}`} playsInline />
                <div ref={ytHostRef} className={`absolute inset-0 ${ytVideoId ? '' : 'hidden'}`} />

                {/* lyric panel — the only hero on the stage */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center text-center px-5 sm:px-10 ${captionsOn ? '' : 'hidden'} ${isVideoVisible || ytVideoId ? 'justify-end pb-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent' : 'bg-[radial-gradient(120%_120%_at_50%_22%,rgba(112,26,117,.55),rgba(3,3,5,.95))]'}`}>
                  {!mediaSrc && (
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-3xl">🎧</div>
                      <p className="text-lg font-black text-white">Load the song to start the lesson</p>
                      <p className="text-sm text-white/60">Paste a link, open a local file, or use the lesson's own media below.</p>
                    </div>
                  )}
                  {mediaSrc && stageLine && (
                    <div className="w-full max-w-5xl">
                      <p className={`font-black text-white tracking-tight flex flex-wrap justify-center items-center gap-x-2 gap-y-1 ${isVideoVisible || ytVideoId ? 'text-2xl lg:text-3xl' : 'text-3xl lg:text-5xl'} leading-tight drop-shadow-[0_3px_18px_rgba(0,0,0,0.8)]`}>
                        {renderLyricLine(stageLine)}
                      </p>
                      {stageLine.translation && (
                        <p className={`mt-4 font-extrabold text-amber-300 ${isVideoVisible || ytVideoId ? 'text-lg lg:text-xl' : 'text-xl lg:text-3xl'}`}>
                          {stageLine.translation}
                        </p>
                      )}
                      <p className="mt-3 text-[11px] font-mono uppercase tracking-widest text-white/45">
                        Line {activeIndex + 1} of {subtitles.length}{lang !== 'your language' ? ` · L1: ${lang}` : ''}
                      </p>
                    </div>
                  )}
                  {mediaSrc && !stageLine && subtitles.length > 0 && (
                    <p className="text-base font-semibold text-white/60">Press ▶ Play — the synced lyric line appears here.</p>
                  )}
                  {mediaSrc && subtitles.length === 0 && (
                    <p className="text-base font-semibold text-white/60">No lyrics yet — open 🎯 Sync to paste and time them.</p>
                  )}
                </div>

                {/* centre play */}
                {!playing && (
                  <button onClick={e => { e.stopPropagation(); togglePlay(); }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-black/55 hover:bg-fuchsia-600/90 backdrop-blur border border-white/25 text-white text-3xl flex items-center justify-center shadow-2xl transition-all">
                    ▶
                  </button>
                )}

                {/* controls */}
                <div className="absolute bottom-0 inset-x-0 px-3 pb-2 pt-16 bg-gradient-to-t from-black/95 via-black/70 to-transparent text-white" onClick={e => e.stopPropagation()}>
                  {/* scrubber with mini-lesson markers */}
                  <div className="relative h-6 flex items-center cursor-pointer" onClick={e => {
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    seekTo(((e.clientX - r.left) / r.width) * (duration || 0));
                  }}>
                    <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-white/25 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-500 to-indigo-400" style={{ width: `${(time / Math.max(1, duration)) * 100}%` }} />
                    </div>
                    {activeLesson.miniLessons.map(ml => (
                      <span key={ml.id} onClick={e => { e.stopPropagation(); seekTo(ml.timeMarker); }} title={ml.title}
                        className="absolute top-1/2 -translate-y-1/2 w-[4px] h-4 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.9)] cursor-pointer"
                        style={{ left: `${(ml.timeMarker / Math.max(1, duration)) * 100}%` }} />
                    ))}
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button onClick={togglePlay} className="w-11 h-11 rounded-full hover:bg-white/15 text-2xl font-black">{playing ? '⏸' : '▶'}</button>
                    <button onClick={() => goToLine(-1)} title="Previous lyric line" className="w-10 h-10 rounded-full hover:bg-white/15 text-base">⏮</button>
                    <button onClick={() => goToLine(1)} title="Next lyric line" className="w-10 h-10 rounded-full hover:bg-white/15 text-base">⏭</button>
                    <button onClick={() => seekTo(time - 5)} className="hidden sm:flex w-10 h-10 rounded-full hover:bg-white/15 text-[11px] font-black">↺5</button>
                    <button onClick={() => seekTo(time + 5)} className="hidden sm:flex w-10 h-10 rounded-full hover:bg-white/15 text-[11px] font-black">↻5</button>
                    <button onClick={() => setLineLoop(v => !v)} title="Repeat the current lyric line"
                      className={`h-10 px-3 rounded-full text-[11px] font-black ${lineLoop ? 'bg-fuchsia-600 text-white' : 'hover:bg-white/15'}`}>🔁 Line</button>
                    <button onClick={() => setMuted(m => { if (videoRef.current) videoRef.current.muted = !m; if (ytVideoId) (m ? ytRef.current?.unMute?.() : ytRef.current?.mute?.()); return !m; })}
                      className="w-10 h-10 rounded-full hover:bg-white/15 text-lg">{muted || volume === 0 ? '🔇' : '🔊'}</button>
                    <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                      onChange={e => { const v = parseFloat(e.target.value); setVolume(v); setMuted(v === 0); if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; } }}
                      className="w-16 sm:w-24 accent-fuchsia-500 cursor-pointer" />
                    <span className="flex-1" />
                    <span className="text-[11px] font-mono tabular-nums whitespace-nowrap text-white/85">{fmt(time)} / {fmt(duration)}</span>
                    <button onClick={() => setCaptionsOn(v => !v)} title="Show / hide the lyrics (C)"
                      className={`h-10 px-3 rounded-full text-[11px] font-black ${captionsOn ? 'bg-fuchsia-600 text-white' : 'hover:bg-white/15 text-white/70'}`}>CC</button>
                    <button onClick={() => { setShowSync(true); setTapMode(false); }} title="Sync the lyrics"
                      className="h-10 px-3 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-black">🎯 Sync</button>
                    <select value={speed} onChange={e => { const v = parseFloat(e.target.value); setSpeed(v); if (videoRef.current) videoRef.current.playbackRate = v; if (ytVideoId) ytRef.current?.setPlaybackRate?.(v); }}
                      className="bg-black/60 border border-white/20 rounded-full px-2 h-10 text-[11px] font-black text-white outline-none">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => <option key={s} value={s} className="text-black">{s}x</option>)}
                    </select>
                  </div>
                </div>

                {/* ══ SIMPLE IN-PLAYER SYNC TOOLS ══ */}
                {showSync && (
                  <div className="absolute inset-0 z-30 overflow-y-auto custom-scrollbar bg-slate-950/96 backdrop-blur-xl text-white" onClick={e => e.stopPropagation()}>
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black">🎯 Sync the lyrics</span>
                          <span className="text-[11px] text-white/60">Play the song, then tap when each line starts — timings are saved straight away.</span>
                        </div>
                        <button onClick={() => { setShowSync(false); setTapMode(false); }} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-black">Close ✕</button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <button onClick={() => { setTapMode(t => !t); setTapCursor(0); }}
                          className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider ${tapMode ? 'bg-white text-slate-900' : 'bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white'}`}>
                          {tapMode ? '■ Stop tap sync' : '▶ Start tap sync'}
                        </button>
                        <button onClick={tapStamp} disabled={!tapMode}
                          className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-black uppercase tracking-widest disabled:opacity-40">
                          ⏱ TAP
                        </button>
                        <span className="text-[11px] text-white/70">{tapMode ? `Tap sync is ON — line ${Math.min(tapCursor + 1, subtitles.length)} of ${subtitles.length}.` : 'Tap sync is off.'}</span>
                        <span className="text-[11px] text-white/70 ml-auto">Next line: <strong>{subtitles[tapCursor]?.text || '—'}</strong></span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <button onClick={() => goToLine(-1)} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">◀ Prev line</button>
                        <button onClick={() => goToLine(1)} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">Next line ▶</button>
                        <span className="w-px h-6 bg-white/15" />
                        <button onClick={() => activeIndex >= 0 && updateLine(activeIndex, { start: round1(time) }, `Line ${activeIndex + 1} start set to ${fmt(time)} — saved.`)} className="h-9 px-3 rounded-lg bg-indigo-500/25 hover:bg-indigo-500/40 text-xs font-black">⏱ Set start = now</button>
                        <button onClick={() => activeIndex >= 0 && updateLine(activeIndex, { end: round1(time) }, `Line ${activeIndex + 1} end set to ${fmt(time)} — saved.`)} className="h-9 px-3 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 text-xs font-black">⏱ Set end = now</button>
                        <button onClick={() => activeIndex >= 0 && updateLine(activeIndex, { start: Math.max(0, round1(subtitles[activeIndex].start - 0.2)), end: Math.max(0.2, round1((subtitles[activeIndex].end || 0) - 0.2)) }, 'Line nudged −0.2s — saved.')} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">−0.2s</button>
                        <button onClick={() => activeIndex >= 0 && updateLine(activeIndex, { start: round1(subtitles[activeIndex].start + 0.2), end: round1((subtitles[activeIndex].end || 0) + 0.2) }, 'Line nudged +0.2s — saved.')} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">+0.2s</button>
                        <span className="w-px h-6 bg-white/15" />
                        <button onClick={() => shiftAll(-0.5)} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">Shift all −0.5s</button>
                        <button onClick={() => shiftAll(0.5)} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">Shift all +0.5s</button>
                        <button onClick={autoFit} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">⚖ Auto-fit</button>
                        <button onClick={resetTimings} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">↩ Reset</button>
                        <span className="w-px h-6 bg-white/15" />
                        <button onClick={copyLessonJson} className="h-9 px-3 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-xs font-black">⧉ Copy lesson JSON</button>
                        <button onClick={downloadLessonJson} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black">⬇ Download JSON</button>
                      </div>

                      {savedFlash && <p className="mt-2 text-[11px] font-bold text-emerald-300">💾 {savedFlash}</p>}

                      <div className="mt-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                        {subtitles.map((s, i) => (
                          <div key={i} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border ${activeIndex === i ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-white/15 bg-white/5'}`}>
                            <span className="col-span-1 text-center text-xs font-black text-white/50">{i + 1}</span>
                            <input type="number" step="0.1" min="0" value={round1(s.start)}
                              onChange={e => updateLine(i, { start: Math.max(0, parseFloat(e.target.value) || 0) }, `Line ${i + 1} start saved.`)}
                              className="col-span-2 p-1.5 rounded-lg bg-black/40 border border-white/15 text-xs font-mono text-center text-white" />
                            <input type="number" step="0.1" min="0" value={round1(s.end || 0)}
                              onChange={e => updateLine(i, { end: Math.max(0, parseFloat(e.target.value) || 0) }, `Line ${i + 1} end saved.`)}
                              className="col-span-2 p-1.5 rounded-lg bg-black/40 border border-white/15 text-xs font-mono text-center text-white" />
                            <input type="text" value={s.text}
                              onChange={e => updateLine(i, { text: e.target.value }, `Line ${i + 1} text saved.`)}
                              className="col-span-5 p-1.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white" />
                            <div className="col-span-2 flex items-center justify-end gap-1">
                              <button onClick={() => { setLineLoop(false); seekTo(s.start); if (!playing) play(); }} title="Play from this line" className="px-2 py-1.5 rounded-lg bg-white/10 text-[11px]">▶</button>
                              <button onClick={() => updateLine(i, { start: round1(time) }, `Line ${i + 1} start saved.`)} title="Set start = current time" className="px-2 py-1.5 rounded-lg bg-indigo-500/25 text-[10px] font-black">S⏱</button>
                              <button onClick={() => updateLine(i, { end: round1(time) }, `Line ${i + 1} end saved.`)} title="Set end = current time" className="px-2 py-1.5 rounded-lg bg-emerald-500/25 text-[10px] font-black">E⏱</button>
                            </div>
                          </div>
                        ))}
                        {!subtitles.length && (
                          <p className="p-6 text-center text-sm text-white/70 rounded-2xl border border-dashed border-white/20">
                            No lyric lines yet — paste them in the source bar below, then sync them here line by line.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ══ SOURCE BAR ══ */}
            <div className={`${SURFACE} rounded-3xl p-5 sm:p-6 flex flex-col gap-4`}>
              <div className="flex flex-wrap items-center gap-2">
                <label className={`px-3 py-2 ${BTN_GHOST} text-[11px] uppercase tracking-wider cursor-pointer`}>
                  📁 Local file
                  <input type="file" accept="audio/*,video/*,.mp3,.mp4,.m4a,.wav,.ogg,.webm,.mov,.mkv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setMediaSrc(URL.createObjectURL(f)); setMediaLabel(f.name); } }} />
                </label>
                <div className="flex-1 min-w-[260px] flex items-center gap-2">
                  <input id="music-media-url" type="text" placeholder="Paste an audio / video link — MP3, MP4, M4A… or a YouTube link"
                    onKeyDown={e => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value.trim(); if (v) { setMediaSrc(v); setMediaLabel(v); } } }}
                    className={`${FIELD} text-xs`} />
                  <button onClick={() => { const el = document.getElementById('music-media-url') as HTMLInputElement | null; const v = el?.value.trim(); if (v) { setMediaSrc(v); setMediaLabel(v); } }}
                    className={`px-4 py-2 ${BTN_PRIMARY} text-[11px] uppercase tracking-wider whitespace-nowrap`}>Load link</button>
                </div>
                <button onClick={() => { setMediaSrc(activeLesson.mediaUrl || ''); setMediaLabel(''); }} className={`px-3 py-2 ${BTN_GHOST} text-[11px] uppercase tracking-wider`}>♻ Use lesson media</button>
                <span className={`text-[11px] font-mono truncate ${MUTED}`}>{mediaLabel || (mediaSrc ? mediaSrc : 'No media loaded')}</span>
              </div>
              <p className={`text-[10px] font-mono text-center ${MUTED}`}>
                Shortcuts — Space play/pause · ← / → 5s · ↑ / ↓ volume · M mute · C show/hide lyrics · 🎯 Sync opens the lyric tools
              </p>
            </div>

            {/* ══ MINI-LESSON ROWS + LEGEND ══ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className={`${SURFACE} rounded-3xl p-5 flex flex-col gap-3`}>
                <h4 className={`text-xs font-mono uppercase tracking-widest font-bold ${MUTED}`}>Vocabulary Legend</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold flex items-center gap-2 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Idiom</div>
                  <div className="p-2.5 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 font-bold flex items-center gap-2 dark:bg-pink-500/15 dark:border-pink-500/30 dark:text-pink-300"><span className="w-2.5 h-2.5 rounded-full bg-pink-400" /> Phrasal Verb</div>
                  <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 font-bold flex items-center gap-2 dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-300"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Key Vocab</div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center gap-2 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Grammar</div>
                </div>
                <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800">
                  <span className={`text-[10px] font-mono uppercase block mb-1 ${MUTED}`}>Tip</span>
                  <p className={`text-[11px] ${MUTED}`}>Tap any word in the lyrics for its meaning + L1 translation. Highlighted words carry the full idiom / phrasal-verb note.</p>
                </div>
              </div>
              <div className={`xl:col-span-2 ${SURFACE} rounded-3xl p-5 flex flex-col gap-3`}>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h4 className={`text-xs font-mono uppercase tracking-widest font-bold ${MUTED}`}>Interactive Mini-Lessons</h4>
                  <span className={`text-[10px] font-mono ${MUTED}`}>{triggeredIds.length}/{activeLesson.miniLessons.length} milestones complete · every card has an easy {lang} version</span>
                </div>
                <div className="flex flex-col gap-3">
                  {activeLesson.miniLessons.map(ml => {
                    const done = triggeredIds.includes(ml.id);
                    const l1Line = ml.l1Title || ml.l1Summary || '';
                    return (
                      <button key={ml.id} onClick={() => { if (!miniLesson) { setMiniLesson(ml); setTriggeredIds(ids => ids.includes(ml.id) ? ids : [...ids, ml.id]); } }}
                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all flex flex-wrap items-center gap-4 ${done ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/30' : 'bg-white border-slate-200 hover:border-fuchsia-400 hover:shadow-lg dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-fuchsia-500/50'}`}>
                        <span className={`w-16 shrink-0 text-center px-2 py-1.5 rounded-xl text-xs font-black font-mono ${done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300'}`}>{done ? '✓ Done' : fmt(ml.timeMarker)}</span>
                        <span className="flex-1 min-w-[220px]">
                          <span className="block text-base font-black text-slate-900 dark:text-white leading-snug">{ml.title}</span>
                          {l1Line && <span className="block text-sm text-amber-700 dark:text-amber-300/90 mt-1 leading-snug">🗣 {l1Line}</span>}
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Start lesson →</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {view === 'karaoke' && (
          <KaraokeArena lesson={activeLesson} onScore={pts => setScore(s => s + pts)} onBack={() => setView('player')} />
        )}
      </main>

      {/* overlays */}
      {selectedWord && <DictionaryPopup word={selectedWord} highlight={null} lang={lang} onClose={() => setSelectedWord(null)} />}
      {selectedHighlight && <DictionaryPopup word={selectedHighlight.word} highlight={selectedHighlight} lang={lang} onClose={() => setSelectedHighlight(null)} />}
      {miniLesson && <ChallengeModal miniLesson={miniLesson} lang={lang} onComplete={handleChallengeComplete} onSkip={handleSkip} />}
      {showSearch && <SongSearch onUseTrack={useTrack} onClose={() => setShowSearch(false)} />}

      {/* cat coach */}
      <div className="fixed bottom-6 right-6 z-[130]">
        <button onClick={() => speak('Hi! I am your cat coach. Tap highlighted words in the lyrics for definitions and L1 translations, or open a mini-lesson for interactive practice!')}
          className="w-16 h-16 bg-gradient-to-tr from-fuchsia-500 to-indigo-600 rounded-full flex items-center justify-center text-4xl shadow-2xl hover:scale-105 active:scale-95 transition-all">
          <span>{CATS[catMood % CATS.length]}</span>
        </button>
      </div>
    </div>
  );
}
