import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Theme, Word, LANG_META } from '../data/types';
import { shuffle, pick, UI } from '../data';
import { useStore } from '../lib/store';
import { speak, sfx } from '../lib/audio';
import { Btn, Icon, SpeakBtn, WordTile, Progress, Confetti, MicBtn } from './ui';
import { heardMatches } from '../lib/audio';
import { cn } from '../utils/cn';

/* ============================ QUIZ ============================ */
type Mode = 'word2img' | 'img2word' | 'listen' | 'say';
export function Quiz({ theme }: { theme: Theme }) {
  const { settings, addStars } = useStore();
  const learn = settings.learn;
  const [mode, setMode] = useState<Mode>('word2img');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const TOTAL = 8;
  const questions = useMemo(() => shuffle(theme.words).slice(0, TOTAL).map((target) => ({ target, options: shuffle([target, ...pick(theme.words.filter((w) => w.id !== target.id), 3)]) })), [theme, mode]);
  const q = questions[round];

  useEffect(() => { setRound(0); setScore(0); setPicked(null); setDone(false); }, [mode, theme]);
  useEffect(() => { if (q && mode === 'listen') speak(q.target.t[learn], learn); }, [round, mode]); // eslint-disable-line

  const choose = (w: Word) => {
    if (picked) return;
    setPicked(w.id);
    const ok = w.id === q.target.id;
    if (ok) { sfx.correct(); setScore((s) => s + 1); addStars(1); } else sfx.wrong();
    setTimeout(() => {
      setPicked(null);
      if (round + 1 >= TOTAL) { setDone(true); sfx.win(); } else setRound((r) => r + 1);
    }, 1100);
  };

  const modes: { id: Mode; label: string }[] = [
    { id: 'word2img', label: '📖 Read → Picture' },
    { id: 'img2word', label: '🖼️ Picture → Word' },
    { id: 'listen', label: '👂 Listen → Picture' },
    { id: 'say', label: '🎤 Picture → Say it' },
  ];

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <Confetti show />
        <div className="text-7xl">🏆</div>
        <div className="text-5xl font-black text-slate-800">{score} / {TOTAL}</div>
        <div className="text-2xl text-slate-600 font-semibold">{score === TOTAL ? 'Perfect! Superstar!' : score >= TOTAL / 2 ? 'Great job!' : 'Good try! Let\'s practice again.'}</div>
        <Btn size="xl" onClick={() => { setRound(0); setScore(0); setDone(false); }}>Play again</Btn>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => <Btn key={m.id} tone={mode === m.id ? 'primary' : 'ghost'} onClick={() => setMode(m.id)}>{m.label}</Btn>)}
        <div className="ml-auto flex items-center gap-4"><Progress total={TOTAL} current={round} /><span className="text-2xl font-black text-amber-500">⭐ {score}</span></div>
      </div>

      {mode === 'say' ? (
        <SayRound key={q.target.id + round} target={q.target} onDone={(ok) => { if (ok) { setScore((s) => s + 1); addStars(1); } if (round + 1 >= TOTAL) { setDone(true); sfx.win(); } else setRound((r) => r + 1); }} />
      ) : (
        <>
          <div className="bg-white rounded-[2rem] border-4 border-indigo-100 shadow-[0_8px_0_#c7d2fe] p-8 flex flex-col items-center gap-4">
            {mode === 'word2img' && (
              <>
                <div className="text-2xl text-slate-500 font-semibold">{UI.whatIsThis[learn]} Find the picture:</div>
                <div dir={LANG_META[learn].rtl ? 'rtl' : 'ltr'} className="text-6xl font-black text-slate-800">{q.target.t[learn]}</div>
                <SpeakBtn text={q.target.t[learn]} lang={learn} />
              </>
            )}
            {mode === 'img2word' && (
              <>
                <div className="text-2xl text-slate-500 font-semibold">{UI.whatIsThis[learn]}</div>
                <Icon icon={q.target.icon} size={200} />
              </>
            )}
            {mode === 'listen' && (
              <>
                <div className="text-2xl text-slate-500 font-semibold">{UI.listen[learn]} Which picture is it?</div>
                <SpeakBtn text={q.target.t[learn]} lang={learn} size="lg" />
              </>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {q.options.map((o) => {
              const state = picked ? (o.id === q.target.id ? 'ok' : o.id === picked ? 'bad' : 'dim') : 'idle';
              return (
                <motion.div key={o.id} animate={state === 'ok' ? { scale: [1, 1.1, 1] } : state === 'bad' ? { x: [0, -10, 10, -10, 0] } : {}}>
                  {mode === 'img2word' ? (
                    <button onClick={() => choose(o)} dir={LANG_META[learn].rtl ? 'rtl' : 'ltr'}
                      className={cn('w-full min-h-[120px] rounded-3xl border-4 text-4xl font-black p-4 transition-colors', state === 'ok' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : state === 'bad' ? 'bg-rose-100 border-rose-400 text-rose-800' : state === 'dim' ? 'bg-slate-50 border-slate-100 text-slate-300' : 'bg-white border-slate-100 shadow-[0_6px_0_#e2e8f0] hover:border-indigo-300 text-slate-800')}>
                      {o.t[learn]}
                    </button>
                  ) : (
                    <WordTile word={o} hideText onClick={() => choose(o)} className={cn(state === 'ok' && 'border-emerald-500 bg-emerald-50', state === 'bad' && 'border-rose-400 bg-rose-50', state === 'dim' && 'opacity-40')} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SayRound({ target, onDone }: { target: Word; onDone: (ok: boolean) => void }) {
  const { settings } = useStore();
  const learn = settings.learn;
  const [heard, setHeard] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const finish = (good: boolean) => { setOk(good); good ? sfx.correct() : sfx.wrong(); setTimeout(() => onDone(good), 1200); };
  return (
    <div className="bg-white rounded-[2rem] border-4 border-indigo-100 shadow-[0_8px_0_#c7d2fe] p-8 flex flex-col items-center gap-5">
      <div className="text-2xl text-slate-500 font-semibold">{UI.whatIsThis[learn]} Say it out loud!</div>
      <Icon icon={target.icon} size={220} />
      {ok === null ? (
        <>
          <MicBtn lang={learn} onResult={(h) => { setHeard(h); finish(heardMatches(h, target.t[learn])); }} prompt="Tap and say the word" />
          <div className="flex gap-3 items-center text-slate-500 font-semibold">
            <span>Tutor:</span>
            <Btn tone="success" onClick={() => finish(true)}>✓ They said it</Btn>
            <Btn tone="ghost" onClick={() => finish(false)}>Skip</Btn>
          </div>
        </>
      ) : (
        <div className="text-center">
          <div dir={LANG_META[learn].rtl ? 'rtl' : 'ltr'} className="text-5xl font-black text-slate-800">{target.t[learn]}</div>
          <div className={cn('text-3xl font-black mt-2', ok ? 'text-emerald-600' : 'text-rose-500')}>{ok ? '⭐ ' + UI.goodJob[learn] : UI.tryAgain[learn]}</div>
          {heard && <div className="text-slate-400 text-lg mt-1">Heard: "{heard}"</div>}
        </div>
      )}
    </div>
  );
}

/* ============================ MATCHING (drag & drop) ============================ */
export function Matching({ theme }: { theme: Theme }) {
  const { settings, addStars } = useStore();
  const learn = settings.learn;
  const [seed, setSeed] = useState(0);
  const pairs = useMemo(() => pick(theme.words, 6), [theme, seed]);
  const targets = useMemo(() => shuffle(pairs), [pairs]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const done = matched.size === pairs.length;
  useEffect(() => { setMatched(new Set()); setSelected(null); }, [seed, theme]);
  useEffect(() => { if (done && pairs.length) { sfx.win(); addStars(3); } }, [done]); // eslint-disable-line

  const tryMatch = (wordId: string, targetId: string) => {
    if (wordId === targetId) {
      sfx.correct();
      setMatched((m) => new Set([...m, wordId]));
      const w = pairs.find((p) => p.id === wordId)!;
      speak(w.t[learn], learn);
    } else { sfx.wrong(); setWrong(targetId); setTimeout(() => setWrong(null), 500); }
    setSelected(null); setDragging(null); setOver(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <Confetti show={done} />
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-xl text-slate-600 font-semibold">Drag each word onto its picture (or tap a word, then tap a picture). Say the word as you match!</p>
        <Btn tone="ghost" className="ml-auto" onClick={() => setSeed((s) => s + 1)}>🔀 New set</Btn>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-3">
          {pairs.map((w) => matched.has(w.id) ? (
            <div key={w.id} className="rounded-2xl bg-emerald-100 border-4 border-emerald-300 px-6 py-4 text-3xl font-black text-emerald-700 flex items-center gap-3">✓ <span dir={LANG_META[learn].rtl ? 'rtl' : 'ltr'}>{w.t[learn]}</span></div>
          ) : (
            <motion.div key={w.id} drag dragSnapToOrigin dragElastic={0.2} whileDrag={{ scale: 1.08, zIndex: 50 }}
              onDragStart={() => { setDragging(w.id); sfx.tap(); }}
              onDrag={(_, info) => { const el = document.elementFromPoint(info.point.x - window.scrollX, info.point.y - window.scrollY); const t = el?.closest('[data-target]')?.getAttribute('data-target') || null; setOver(t); }}
              onDragEnd={() => { if (over) tryMatch(w.id, over); else setDragging(null); }}
              onClick={() => { setSelected(selected === w.id ? null : w.id); sfx.tap(); }}
              className={cn('cursor-grab active:cursor-grabbing rounded-2xl bg-white border-4 px-6 py-4 text-3xl font-black text-slate-800 shadow-[0_6px_0_#e2e8f0] flex items-center gap-3 select-none', selected === w.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100')}>
              <span className="text-slate-300">⠿</span><span dir={LANG_META[learn].rtl ? 'rtl' : 'ltr'}>{w.t[learn]}</span>
              <SpeakBtn text={w.t[learn]} lang={learn} size="sm" className="ml-auto" />
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map((w) => (
            <div key={w.id} data-target={w.id} onClick={() => selected && tryMatch(selected, w.id)}
              className={cn('rounded-3xl border-4 bg-white flex flex-col items-center justify-center p-4 min-h-[160px] transition-all',
                matched.has(w.id) ? 'border-emerald-400 bg-emerald-50' : over === w.id && dragging ? 'border-indigo-500 scale-105 bg-indigo-50' : wrong === w.id ? 'border-rose-400 bg-rose-50' : selected ? 'border-dashed border-indigo-300 cursor-pointer' : 'border-slate-100')}>
              <Icon icon={w.icon} size={110} />
              {matched.has(w.id) && <div dir={LANG_META[learn].rtl ? 'rtl' : 'ltr'} className="text-xl font-black text-emerald-700 mt-1">{w.t[learn]}</div>}
            </div>
          ))}
        </div>
      </div>
      {done && <div className="text-center text-4xl font-black text-emerald-600">🎉 All matched! {UI.goodJob[learn]}</div>}
    </div>
  );
}

/* ============================ STORYBOOK ============================ */
export function StoryBook({ theme }: { theme: Theme }) {
  const { settings, addStars } = useStore();
  const st = theme.story;
  const [page, setPage] = useState(-1); // -1 cover, pages, then quiz
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const total = st.pages.length;
  const quizAt = total;
  const glossary = useMemo(() => theme.words.slice(0, 40), [theme]);
  const readRef = useRef(false);

  useEffect(() => { if (page >= 0 && page < total && settings.autoSpeak) speak(st.pages[page].text, 'en'); }, [page]); // eslint-disable-line

  const readAll = async () => {
    if (readRef.current) return; readRef.current = true;
    for (let i = 0; i < total; i++) { setPage(i); await speak(st.pages[i].text, 'en'); await new Promise((r) => setTimeout(r, 500)); }
    readRef.current = false;
  };

  // highlight glossary words in text
  const renderText = (text: string) => {
    const parts: (string | Word)[] = [];
    const lower = text.toLowerCase();
    let i = 0;
    const found: { start: number; end: number; w: Word }[] = [];
    glossary.forEach((w) => {
      const en = w.t.en.toLowerCase().replace(/\s*\(.*\)/, '');
      if (en.length < 3) return;
      const re = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'g');
      let m;
      while ((m = re.exec(lower))) { if (!found.some((f) => m!.index < f.end && m!.index + m![0].length > f.start)) found.push({ start: m.index, end: m.index + m[0].length, w }); }
    });
    found.sort((a, b) => a.start - b.start);
    found.forEach((f) => { parts.push(text.slice(i, f.start)); parts.push(f.w); i = f.end; parts.push(text.slice(f.start, f.end)); });
    parts.push(text.slice(i));
    // parts sequence: [text, Word, matchedText, text, ...]
    const out: React.ReactNode[] = [];
    for (let k = 0; k < parts.length; k++) {
      const p = parts[k];
      if (typeof p === 'string') out.push(<span key={k}>{p}</span>);
      else {
        const matchedText = parts[k + 1] as string; k++;
        out.push(
          <button key={k} onClick={() => speak(p.t[settings.learn], settings.learn)} title={p.t[settings.learn]}
            className="inline-flex items-baseline gap-1 bg-amber-100 border-b-4 border-amber-400 rounded-lg px-1 mx-0.5 font-black text-slate-900 hover:bg-amber-200">
            {matchedText}
            {settings.learn !== 'en' && <span className="text-indigo-600 text-[0.7em]">({p.t[settings.learn]})</span>}
          </button>,
        );
      }
    }
    return out;
  };

  if (page === -1) {
    return (
      <div className="flex flex-col items-center gap-6 py-6">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-[2.5rem] p-10 w-full max-w-3xl shadow-[0_12px_0_#312e81] flex flex-col items-center gap-4">
          <div className="text-xl font-bold uppercase tracking-widest opacity-80">HeroArcade · Storybook</div>
          <Icon icon={st.pages[0].icon} size={180} />
          <h2 className="text-5xl font-black text-center">{st.title}</h2>
          <div className="flex gap-2 text-4xl">⚡🦸‍♀️💪🐾🤖</div>
          <div className="text-lg opacity-90">{total} pages · {st.questions.length} questions</div>
        </motion.div>
        <div className="flex gap-4 flex-wrap justify-center">
          <Btn size="xl" tone="accent" onClick={() => setPage(0)}>📖 Read together</Btn>
          <Btn size="xl" tone="ghost" onClick={readAll}>🔊 Read to me</Btn>
        </div>
        <p className="text-slate-500 text-lg text-center max-w-2xl">Stories are in simple English. Highlighted words are from this theme – tap one to hear it in the learning language.</p>
      </div>
    );
  }

  if (page >= quizAt) {
    const score = st.questions.filter((q, i) => answers[i] === q.answer).length;
    const allAnswered = Object.keys(answers).length === st.questions.length;
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <Confetti show={allAnswered && score === st.questions.length} />
        <h3 className="text-4xl font-black text-slate-800 text-center">🧠 Did you understand?</h3>
        {st.questions.map((q, i) => (
          <div key={i} className="bg-white rounded-3xl border-4 border-slate-100 shadow-[0_6px_0_#e2e8f0] p-6">
            <div className="flex items-center gap-3 mb-4"><SpeakBtn text={q.q} lang="en" size="sm" /><span className="text-3xl font-black text-slate-800">{q.q}</span></div>
            <div className="grid md:grid-cols-3 gap-3">
              {q.options.map((o, k) => {
                const chosen = answers[i];
                const state = chosen === undefined ? 'idle' : k === q.answer ? 'ok' : k === chosen ? 'bad' : 'dim';
                return (
                  <button key={k} disabled={chosen !== undefined} onClick={() => { const ok = k === q.answer; setAnswers((a) => ({ ...a, [i]: k })); ok ? (sfx.correct(), addStars(1)) : sfx.wrong(); }}
                    className={cn('rounded-2xl border-4 px-4 py-4 text-2xl font-bold transition-colors', state === 'ok' ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : state === 'bad' ? 'bg-rose-100 border-rose-300 text-rose-800' : state === 'dim' ? 'bg-slate-50 border-slate-100 text-slate-300' : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800')}>
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {allAnswered && <div className="text-center text-4xl font-black text-indigo-700">You got {score} / {st.questions.length}! ⭐</div>}
        <div className="bg-amber-50 border-4 border-amber-200 rounded-3xl p-6">
          <div className="text-2xl font-black text-amber-900 mb-2">💬 Talk about the story</div>
          <ul className="text-xl text-slate-800 font-semibold list-disc pl-6 space-y-1">
            <li>Who is your favourite hero in this story? Why?</li>
            <li>What would you do?</li>
            <li>Can you tell the story again in your own words?</li>
            <li>Can you act out one page with me?</li>
          </ul>
        </div>
        <div className="flex justify-between"><Btn tone="soft" size="lg" onClick={() => setPage(total - 1)}>← Back to story</Btn><Btn size="lg" onClick={() => { setPage(-1); setAnswers({}); }}>Finish</Btn></div>
      </div>
    );
  }

  const p = st.pages[page];
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4"><Btn tone="ghost" onClick={() => setPage(-1)}>📕 Cover</Btn><Progress total={total} current={page} /><span className="ml-auto text-xl text-slate-500 font-bold">Page {page + 1} / {total}</span></div>
      <AnimatePresence mode="wait">
        <motion.div key={page} initial={{ x: 80, opacity: 0, rotateY: 20 }} animate={{ x: 0, opacity: 1, rotateY: 0 }} exit={{ x: -80, opacity: 0 }} transition={{ duration: 0.35 }}
          className="bg-white rounded-[2.5rem] border-4 border-slate-100 shadow-[0_12px_0_#e2e8f0] p-8 md:p-12 grid md:grid-cols-[300px_1fr] gap-8 items-center">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="flex justify-center"><Icon icon={p.icon} size={260} /></motion.div>
          <div className="flex flex-col gap-6">
            <p className="text-4xl md:text-[2.6rem] leading-snug font-bold text-slate-800">{renderText(p.text)}</p>
            <div className="flex gap-3 items-center">
              <SpeakBtn text={p.text} lang="en" size="lg" />
              <span className="text-slate-500 text-lg font-semibold">Read aloud, then ask: "What happened?"</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-between">
        <Btn size="xl" tone="soft" disabled={page === 0} onClick={() => setPage(page - 1)}>← Back</Btn>
        <Btn size="xl" onClick={() => setPage(page + 1)}>{page + 1 === total ? 'Questions →' : 'Next →'}</Btn>
      </div>
    </div>
  );
}
