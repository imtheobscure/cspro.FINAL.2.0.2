import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Theme, Word, LANG_META, Lang } from '../data/types';
import { ccqsFor, CHANT_FRAMES, UI, shuffle } from '../data';
import { useStore } from '../lib/store';
import { speak, sfx } from '../lib/audio';
import { Btn, Icon, SpeakBtn, WordTile, MicBtn, Progress, BiText } from './ui';
import { heardMatches } from '../lib/audio';

/* ============================ DICTIONARY ============================ */
export function Dictionary({ theme }: { theme: Theme }) {
  const { settings } = useStore();
  const [idx, setIdx] = useState<number | null>(null);
  const learn = settings.learn;
  const support = settings.support;

  useEffect(() => {
    if (idx !== null && settings.autoSpeak) speak(theme.words[idx].t[learn], learn);
  }, [idx, learn]); // eslint-disable-line

  if (idx !== null) {
    const w = theme.words[idx];
    const ccqs = ccqsFor(w, learn);
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Btn tone="ghost" onClick={() => setIdx(null)}>▦ All words</Btn>
          <Progress total={theme.words.length} current={idx} className="flex-wrap" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <AnimatePresence mode="wait">
            <motion.div key={w.id} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }}
              className="bg-white rounded-[2rem] border-4 border-slate-100 shadow-[0_8px_0_#e2e8f0] p-8 flex flex-col items-center gap-5">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}>
                <Icon icon={w.icon} size={240} />
              </motion.div>
              <div dir={LANG_META[learn].rtl ? 'rtl' : 'ltr'} className="text-6xl font-black text-slate-800 text-center">{w.t[learn]}</div>
              {support !== 'none' && support !== learn && (
                <div dir={LANG_META[support].rtl ? 'rtl' : 'ltr'} className="text-3xl font-semibold text-slate-500">{w.t[support]}</div>
              )}
              <div className="flex gap-3 flex-wrap justify-center">
                <SpeakBtn text={w.t[learn]} lang={learn} size="lg" />
                {support !== 'none' && support !== learn && <SpeakBtn text={w.t[support]} lang={support} size="md" className="bg-slate-400 shadow-[0_4px_0_#475569]" />}
              </div>
              <RepeatCheck word={w} lang={learn} />
            </motion.div>
          </AnimatePresence>
          <div className="flex flex-col gap-4">
            <div className="bg-amber-50 border-4 border-amber-200 rounded-[2rem] p-6">
              <h3 className="text-2xl font-black text-amber-900 mb-3">💬 Ask the learner</h3>
              <ul className="flex flex-col gap-2">
                {ccqs.map((q, i) => (
                  <li key={i} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2">
                    <SpeakBtn text={q} lang={learn} size="sm" />
                    <span dir={LANG_META[learn].rtl ? 'rtl' : 'ltr'} className="text-xl font-bold text-slate-800 flex-1">{q}</span>
                  </li>
                ))}
                {(w.ccq || []).map((q, i) => (
                  <li key={'x' + i} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2 border-2 border-dashed border-amber-300">
                    <SpeakBtn text={q} lang="en" size="sm" />
                    <span className="text-xl font-bold text-slate-800 flex-1">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-sky-50 border-4 border-sky-200 rounded-[2rem] p-6">
              <h3 className="text-2xl font-black text-sky-900 mb-2">🌍 In every language</h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(LANG_META) as Lang[]).map((l) => (
                  <button key={l} onClick={() => speak(w.t[l], l)} dir={LANG_META[l].rtl ? 'rtl' : 'ltr'}
                    className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 text-lg font-bold text-slate-700 hover:bg-sky-100 text-left">
                    <span>{LANG_META[l].flag}</span><span className="truncate">{w.t[l]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-between gap-4">
          <Btn size="xl" tone="soft" onClick={() => setIdx((idx - 1 + theme.words.length) % theme.words.length)}>← Previous</Btn>
          <Btn size="xl" onClick={() => setIdx((idx + 1) % theme.words.length)}>Next →</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Btn onClick={() => setIdx(0)} size="lg">▶ Start flashcards</Btn>
        <Btn tone="soft" size="lg" onClick={async () => { for (const w of theme.words) { await speak(w.t[learn], learn); await new Promise((r) => setTimeout(r, 350)); } }}>🔊 Read all words</Btn>
        <span className="text-xl text-slate-500 font-semibold ml-auto">{theme.words.length} words</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {theme.words.map((w, i) => (
          <WordTile key={w.id + i} word={w} onClick={() => setIdx(i)} />
        ))}
      </div>
    </div>
  );
}

function RepeatCheck({ word, lang }: { word: Word; lang: Lang }) {
  const [state, setState] = useState<'idle' | 'ok' | 'no'>('idle');
  return (
    <div className="flex items-center gap-4 flex-wrap justify-center">
      <MicBtn lang={lang} size="md" prompt="Say the word!" onResult={(h) => { const ok = heardMatches(h, word.t[lang]); setState(ok ? 'ok' : 'no'); ok ? sfx.correct() : sfx.wrong(); }} />
      {state === 'ok' && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-3xl font-black text-emerald-600">⭐ {UI.goodJob[lang]}</motion.span>}
      {state === 'no' && <span className="text-2xl font-bold text-rose-500">{UI.tryAgain[lang]}</span>}
    </div>
  );
}

/* ============================ CCQ TALK CARDS ============================ */
export function TalkCards({ theme }: { theme: Theme }) {
  const { settings } = useStore();
  const learn = settings.learn;
  const cards = useMemo(() => {
    const wordQs = theme.words.flatMap((w) => (w.ccq || []).map((q) => ({ q, icon: w.icon, lang: 'en' as Lang, word: w })));
    const frameQs = shuffle(theme.words).slice(0, 8).map((w) => ({ q: ccqsFor(w, learn)[Math.floor(Math.random() * 4)], icon: w.icon, lang: learn, word: w }));
    const open = theme.talk.map((q) => ({ q, icon: theme.icon, lang: 'en' as Lang, word: null as Word | null }));
    return [...open, ...shuffle([...wordQs, ...frameQs])];
  }, [theme, learn]);
  const [i, setI] = useState(0);
  const c = cards[i];
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-xl text-slate-600 font-semibold text-center max-w-3xl">Concept-checking questions. Read the question, wait, and let the learner answer in a full sentence. Tap 🔊 to hear it.</p>
      <Progress total={Math.min(cards.length, 20)} current={i % 20} />
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }} transition={{ duration: 0.3 }}
          className="bg-white rounded-[2.5rem] border-4 border-indigo-100 shadow-[0_10px_0_#c7d2fe] p-10 w-full max-w-3xl flex flex-col items-center gap-6">
          <Icon icon={c.icon} size={180} />
          <div dir={LANG_META[c.lang].rtl ? 'rtl' : 'ltr'} className="text-4xl md:text-5xl font-black text-slate-800 text-center leading-tight">{c.q}</div>
          {c.word && <BiText learn={c.word.t[learn]} support={settings.support !== 'none' ? c.word.t[settings.support] : undefined} sizeMain="text-2xl text-indigo-600" sizeSub="text-lg" />}
          <SpeakBtn text={c.q} lang={c.lang} size="lg" />
        </motion.div>
      </AnimatePresence>
      <div className="flex gap-4">
        <Btn tone="soft" size="xl" onClick={() => setI((i - 1 + cards.length) % cards.length)}>←</Btn>
        <Btn size="xl" onClick={() => setI((i + 1) % cards.length)}>Next question →</Btn>
      </div>
    </div>
  );
}

/* ============================ CHANT ============================ */
export function Chant({ theme }: { theme: Theme }) {
  const { settings } = useStore();
  const learn = settings.learn;
  const [seed, setSeed] = useState(0);
  const lines = useMemo(() => {
    const ws = shuffle(theme.words).slice(0, 12);
    const frames = CHANT_FRAMES[learn];
    return frames.map((f, i) => {
      const trio = [ws[i * 3 % ws.length], ws[(i * 3 + 1) % ws.length], ws[(i * 3 + 2) % ws.length]];
      return { text: f.replace('{1}', trio[0].t[learn]).replace('{2}', trio[1].t[learn]).replace('{3}', trio[2].t[learn]), words: trio };
    });
  }, [theme, learn, seed]);
  const [active, setActive] = useState(-1);
  const playAll = async () => {
    for (let i = 0; i < lines.length; i++) {
      setActive(i); sfx.pop();
      await speak(lines[i].text, learn);
      await new Promise((r) => setTimeout(r, 300));
    }
    setActive(-1);
  };
  return (
    <div className="flex flex-col gap-6 items-center">
      <p className="text-xl text-slate-600 font-semibold text-center">Chant together! Clap on the beat. Learners repeat each line after the voice.</p>
      <div className="flex gap-3">
        <Btn size="xl" tone="accent" onClick={playAll}>🎵 Play chant</Btn>
        <Btn size="xl" tone="ghost" onClick={() => setSeed((s) => s + 1)}>🔀 New words</Btn>
      </div>
      <div className="w-full max-w-4xl flex flex-col gap-4">
        {lines.map((l, i) => (
          <motion.div key={i + '-' + seed} animate={active === i ? { scale: 1.03, backgroundColor: '#FEF3C7' } : { scale: 1, backgroundColor: '#FFFFFF' }}
            className="rounded-3xl border-4 border-slate-100 shadow-[0_6px_0_#e2e8f0] px-6 py-4 flex items-center gap-4">
            <div className="flex -space-x-3">
              {l.words.map((w, k) => <Icon key={k} icon={w.icon} size={64} />)}
            </div>
            <div dir={LANG_META[learn].rtl ? 'rtl' : 'ltr'} className="text-3xl font-black text-slate-800 flex-1 leading-snug">{l.text}</div>
            <SpeakBtn text={l.text} lang={learn} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
