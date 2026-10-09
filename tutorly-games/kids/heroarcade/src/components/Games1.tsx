import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Theme, Word, LANG_META } from '../data/types';
import { UI, NUMBER_WORDS, pick, HEROES } from '../data';
import { useStore } from '../lib/store';
import { speak, sfx, heardMatches, normalize } from '../lib/audio';
import { Btn, Icon, SpeakBtn, MicBtn, Bubble, Confetti, GameShell, Progress } from './ui';
import { cn } from '../utils/cn';

/* ====================== 1. DRAGON FEEDER ====================== */
export function DragonFeeder({ theme, onBack }: { theme: Theme; onBack: () => void }) {
  const { settings, addStars } = useStore();
  const L = settings.learn;
  const [step, setStep] = useState<'ask' | 'describe' | 'eat' | 'done'>('ask');
  const [fed, setFed] = useState<Word[]>([]);
  const [menu, setMenu] = useState<Word[]>(() => pick(theme.words, 3));
  const [want, setWant] = useState<Word>(menu[0]);
  const [msg, setMsg] = useState('');
  const GOAL = 5;
  const size = 160 + fed.length * 30;

  const newRound = () => { const m = pick(theme.words, 3); setMenu(m); setWant(m[Math.floor(Math.random() * 3)]); setStep('ask'); setMsg(''); };
  useEffect(() => { sfx.roar(); speak(UI.hello[L], L); }, []); // eslint-disable-line

  const asked = () => { sfx.roar(); setStep('describe'); speak(`${UI.iWant[L]} ${want.t[L]}!`, L); };
  const described = () => {
    setStep('eat'); sfx.chomp();
    speak(UI.yummy[L], L);
    setTimeout(() => {
      const nf = [...fed, want]; setFed(nf); addStars(2);
      if (nf.length >= GOAL) { setStep('done'); sfx.win(); } else newRound();
    }, 1400);
  };

  return (
    <GameShell title="Dragon Feeder" icon="🐉" onBack={onBack}
      tutorTip={`The learner must ASK the dragon "${UI.whatDoYouWant[L]}" out loud. Then the dragon says what it wants. The learner picks it and DESCRIBES it in a full sentence ("${UI.itIsA[L]} …"). Use the mic or press the tutor buttons when the child speaks. Feed the dragon ${GOAL} times to make it grow!`}
      right={<div className="text-2xl font-black text-amber-500">🍽️ {fed.length}/{GOAL}</div>}>
      <Confetti show={step === 'done'} />
      <div className="grid lg:grid-cols-[1fr_1fr] gap-6 items-start">
        <div className="bg-gradient-to-b from-emerald-50 to-emerald-100 rounded-[2.5rem] border-4 border-emerald-200 p-8 flex flex-col items-center gap-6 min-h-[480px] justify-end relative">
          <AnimatePresence>
            {step !== 'ask' && step !== 'done' && (
              <motion.div key="bubble" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute top-6 right-6 left-6">
                <Bubble side="left">
                  {step === 'describe' && <div className="flex items-center gap-3"><span dir={LANG_META[L].rtl ? 'rtl' : 'ltr'}>{UI.iWant[L]} …</span><Icon icon={want.icon} size={72} /><span className="text-slate-400">?</span></div>}
                  {step === 'eat' && <span>😋 {UI.yummy[L]} {UI.thankYou[L]}</span>}
                </Bubble>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div animate={step === 'eat' ? { scale: [1, 1.2, 0.95, 1.05, 1], rotate: [0, -5, 5, 0] } : step === 'describe' ? { y: [0, -12, 0] } : { y: [0, -6, 0] }} transition={{ repeat: step === 'eat' ? 0 : Infinity, duration: step === 'eat' ? 0.8 : 2 }}>
            <Icon icon={step === 'done' ? '🐲' : '🐉'} size={size} />
          </motion.div>
          <div className="flex gap-1 flex-wrap justify-center">{fed.map((f, i) => <Icon key={i} icon={f.icon} size={40} />)}</div>
          {step === 'done' && <div className="text-4xl font-black text-emerald-700 text-center">The dragon is huge and happy! 🎉</div>}
        </div>

        <div className="flex flex-col gap-5">
          {step === 'ask' && (
            <div className="bg-white rounded-[2rem] border-4 border-slate-100 p-6 flex flex-col items-center gap-4">
              <div className="text-xl text-slate-500 font-semibold">Step 1 · Ask the dragon:</div>
              <div dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-4xl font-black text-slate-800 text-center">"{UI.whatDoYouWant[L]}"</div>
              <SpeakBtn text={UI.whatDoYouWant[L]} lang={L} />
              <MicBtn lang={L} onResult={(h) => { if (h && normalize(h).split(' ').length >= 2) asked(); else setMsg('Ask the full question!'); }} prompt="Ask out loud" />
              <Btn tone="success" onClick={asked}>✓ Tutor: they asked</Btn>
              {msg && <div className="text-rose-500 font-bold text-xl">{msg}</div>}
            </div>
          )}
          {step === 'describe' && (
            <div className="bg-white rounded-[2rem] border-4 border-slate-100 p-6 flex flex-col items-center gap-4">
              <div className="text-xl text-slate-500 font-semibold">Step 2 · Which one does the dragon want? Name it and describe it!</div>
              <div className="grid grid-cols-3 gap-3 w-full">
                {menu.map((m) => (
                  <button key={m.id} onClick={() => { if (m.id === want.id) { sfx.correct(); speak(m.t[L], L); } else { sfx.wrong(); setMsg(UI.tryAgain[L]); } }}
                    className="bg-slate-50 rounded-3xl border-4 border-slate-100 hover:border-indigo-300 p-3 flex flex-col items-center">
                    <Icon icon={m.icon} size={90} />
                    <div dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-xl font-black text-slate-800 mt-1">{m.t[L]}</div>
                  </button>
                ))}
              </div>
              <div dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-3xl font-black text-indigo-700 text-center">"{UI.itIsA[L]} {want.t[L]}. …"</div>
              <div className="text-lg text-slate-500">Add: colour · big/small · I like it / I don't like it</div>
              <MicBtn lang={L} onResult={(h) => { if (heardMatches(h, want.t[L])) described(); else setMsg(`${UI.tryAgain[L]} (heard: "${h}")`); }} prompt="Describe it" />
              <Btn tone="success" onClick={described}>✓ Tutor: good description</Btn>
              {msg && <div className="text-rose-500 font-bold text-xl">{msg}</div>}
            </div>
          )}
          {step === 'eat' && <div className="text-center text-4xl font-black text-emerald-600 py-10">CHOMP! 😋</div>}
          {step === 'done' && <Btn size="xl" onClick={() => { setFed([]); newRound(); }}>Play again</Btn>}
        </div>
      </div>
    </GameShell>
  );
}

/* ====================== 2. WALKIE-TALKIE RIDDLES ====================== */
export function WalkieTalkie({ theme, onBack }: { theme: Theme; onBack: () => void }) {
  const { settings, addStars } = useStore();
  const L = settings.learn;
  const riddles = useMemo(() => pick(theme.words, 4).map((w, i) => ({ w, digit: Math.floor(Math.random() * 9) + 1, clueLevel: 0, id: i })), [theme]);
  const [i, setI] = useState(0);
  const [clue, setClue] = useState(0);
  const [code, setCode] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const r = riddles[i];
  const done = code.length === 4;
  const clues = (w: Word) => {
    const en = w.t.en; const name = w.t[L];
    return [
      `Agent, listen. I am thinking of something from "${theme.title.en}". It starts with the sound "${name[0]}".`,
      `Clue two: In English it has ${en.replace(/[^a-z]/gi, '').length} letters. ${w.ccq?.[0] ? 'Hint: ' + w.ccq[0] : ''}`,
      `Clue three: Here is a blurry picture. Over.`,
    ];
  };
  const playClue = () => { sfx.radio(); setTimeout(() => speak(clues(r.w)[clue], 'en'), 300); };
  useEffect(() => { if (!done) playClue(); }, [i, clue]); // eslint-disable-line
  const solved = () => { sfx.correct(); addStars(2); speak(`Correct! The word is ${r.w.t[L]}. Code digit ${r.digit}. Over.`, 'en'); const c = [...code, r.digit]; setCode(c); setMsg(''); if (c.length < 4) setTimeout(() => { setI(i + 1); setClue(0); }, 2200); else setTimeout(() => sfx.win(), 800); };

  return (
    <GameShell title="Secret-Agent Walkie-Talkie" icon="📻" onBack={onBack}
      tutorTip="Role-play: you are HQ, the learner is a secret agent. Press the radio to hear a spoken clue. The agent must say 'Over' after each message and answer out loud. Each solved riddle reveals one digit of the 4-digit vault code. Encourage full sentences: 'I think it is a …'."
      right={<div className="flex gap-2">{[0, 1, 2, 3].map((k) => <div key={k} className={cn('w-14 h-16 rounded-xl border-4 flex items-center justify-center text-3xl font-black', code[k] !== undefined ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-300')}>{code[k] ?? '?'}</div>)}</div>}>
      <Confetti show={done} />
      {done ? (
        <div className="flex flex-col items-center gap-6 py-10">
          <motion.div initial={{ rotate: 0 }} animate={{ rotate: [0, 10, -10, 0] }} className="text-9xl">🔓</motion.div>
          <div className="text-5xl font-black text-emerald-700">Vault open! Code {code.join('')}</div>
          <div className="text-2xl text-slate-600">Mission complete, Agent {HEROES[Math.floor(Math.random() * 4)].name}!</div>
          <Btn size="xl" onClick={() => { setCode([]); setI(0); setClue(0); }}>New mission</Btn>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-[2.5rem] p-8 text-white flex flex-col items-center gap-5 shadow-[0_12px_0_#0f172a]">
            <div className="flex items-center gap-3 text-emerald-400 font-mono text-xl"><span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" /> HQ CHANNEL 7 · RIDDLE {i + 1}/4</div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={playClue} className="w-48 h-48 rounded-full bg-slate-700 border-8 border-slate-600 flex items-center justify-center text-7xl shadow-inner hover:bg-slate-600">📻</motion.button>
            <div className="font-mono text-lg text-slate-300 text-center max-w-md">"{clues(r.w)[clue]}"</div>
            <div className="flex gap-3">
              <Btn tone="ghost" onClick={playClue}>🔊 Repeat</Btn>
              <Btn tone="accent" disabled={clue >= 2} onClick={() => setClue(clue + 1)}>Next clue →</Btn>
            </div>
            {clue >= 2 && <motion.div initial={{ filter: 'blur(20px)' }} animate={{ filter: 'blur(6px)' }} className="opacity-90"><Icon icon={r.w.icon} size={140} /></motion.div>}
          </div>
          <div className="bg-white rounded-[2rem] border-4 border-slate-100 p-6 flex flex-col items-center gap-4">
            <div className="text-xl text-slate-500 font-semibold">Agent, say your answer: "I think it is a … Over!"</div>
            <MicBtn lang={L} onResult={(h) => { if (heardMatches(h, r.w.t[L])) solved(); else { sfx.wrong(); setMsg(`Negative. Try again. (heard: "${h}")`); } }} prompt="Press to talk" />
            {msg && <div className="text-rose-500 font-bold text-xl text-center">{msg}</div>}
            <div className="border-t-2 border-slate-100 w-full pt-4 flex flex-col items-center gap-3">
              <div className="text-slate-400 font-semibold">Tutor controls</div>
              <div className="flex gap-3 flex-wrap justify-center">
                <Btn tone="success" onClick={solved}>✓ Correct answer</Btn>
                <Btn tone="ghost" onClick={() => setMsg(`Answer: ${r.w.t[L]}`)}>👁 Reveal</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </GameShell>
  );
}

/* ====================== 3. PUPPET THEATER (branching) ====================== */
type Node = { text: string; puppet: number; options: Word[]; action: string };
export function PuppetTheater({ theme, onBack }: { theme: Theme; onBack: () => void }) {
  const { settings, addStars } = useStore();
  const L = settings.learn;
  const puppets = HEROES.slice(0, 4);
  const [scene, setScene] = useState(0);
  const [history, setHistory] = useState<{ hero: string; w: Word; action: string }[]>([]);
  const [anim, setAnim] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const beats = ['finds', 'wants', 'sees', 'gives Bolt', 'dreams about'];
  const node: Node = useMemo(() => ({ text: `${puppets[scene % 4].name} ${beats[scene]} …`, puppet: scene % 4, options: pick(theme.words, 3), action: beats[scene] }), [scene, theme]); // eslint-disable-line
  const TOTAL = 5;
  const done = scene >= TOTAL;

  const choose = (w: Word) => {
    sfx.pop(); setAnim(node.puppet); addStars(1);
    const line = `${puppets[node.puppet].name} ${node.action} ${w.t.en}!`;
    speak(L === 'en' ? line : `${w.t[L]}!`, L);
    setHistory((h) => [...h, { hero: puppets[node.puppet].name, w, action: node.action }]);
    setTimeout(() => { setAnim(null); setScene(scene + 1); setMsg(''); }, 1500);
  };

  return (
    <GameShell title="Puppet Theater" icon="🎭" onBack={onBack}
      tutorTip="The learner is the storyteller. Show the three choices and ask: 'What does Max find?' The child SAYS the choice aloud (mic or tap). The puppet acts it out. After 5 scenes, ask the learner to retell the whole story from the pictures. Encourage 'and then…', 'because…'."
      right={<Progress total={TOTAL} current={Math.min(scene, TOTAL)} />}>
      <div className="bg-gradient-to-b from-rose-700 to-rose-900 rounded-[2.5rem] p-6 shadow-[0_12px_0_#4c0519]">
        <div className="bg-amber-50 rounded-[2rem] p-8 min-h-[280px] flex items-end justify-around border-8 border-amber-200 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-6 bg-rose-800/20" />
          {puppets.map((p, k) => (
            <motion.div key={p.id} animate={anim === k ? { y: [0, -60, 0, -30, 0], rotate: [0, -15, 15, 0] } : node.puppet === k && !done ? { y: [0, -10, 0] } : { y: 0 }} transition={{ duration: anim === k ? 1.2 : 1.5, repeat: anim === k ? 0 : Infinity }}
              className={cn('flex flex-col items-center gap-1', node.puppet !== k && !done && 'opacity-60')}>
              <div className="w-1 h-16 bg-slate-500" />
              <div className="text-7xl">{p.icon}</div>
              <div className="font-black text-slate-800 text-xl">{p.name}</div>
            </motion.div>
          ))}
          {anim !== null && history.length > 0 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1.2 }} className="absolute top-6 left-1/2 -translate-x-1/2"><Icon icon={history[history.length - 1].w.icon} size={120} /></motion.div>
          )}
        </div>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-5">
          <Confetti show />
          <div className="text-4xl font-black text-slate-800">🎬 The End! Now YOU tell the story:</div>
          <div className="flex flex-wrap justify-center gap-3">
            {history.map((h, i) => (
              <div key={i} className="bg-white rounded-3xl border-4 border-slate-100 p-4 flex flex-col items-center w-44">
                <div className="text-3xl">{puppets.find((p) => p.name === h.hero)?.icon}</div>
                <Icon icon={h.w.icon} size={80} />
                <div className="text-lg font-bold text-slate-700 text-center">{h.hero} {h.action} {h.w.t.en}</div>
                <div dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-indigo-600 font-black">{h.w.t[L]}</div>
              </div>
            ))}
          </div>
          <Btn size="xl" onClick={() => { setScene(0); setHistory([]); }}>New story</Btn>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border-4 border-slate-100 p-6 flex flex-col items-center gap-4">
          <div className="text-3xl font-black text-slate-800">{node.text}  <span className="text-slate-400 text-2xl">What happens? Say it!</span></div>
          <div className="grid grid-cols-3 gap-4 w-full max-w-3xl">
            {node.options.map((o) => (
              <button key={o.id} onClick={() => choose(o)} className="bg-slate-50 rounded-3xl border-4 border-slate-100 hover:border-indigo-400 p-4 flex flex-col items-center gap-2">
                <Icon icon={o.icon} size={100} />
                <div dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-2xl font-black text-slate-800">{o.t[L]}</div>
                <SpeakBtn text={o.t[L]} lang={L} size="sm" />
              </button>
            ))}
          </div>
          <MicBtn lang={L} size="md" prompt="Say your choice" onResult={(h) => { const hit = node.options.find((o) => heardMatches(h, o.t[L])); if (hit) choose(hit); else { sfx.wrong(); setMsg(`I didn't catch that (heard: "${h}"). Tap the picture or try again.`); } }} />
          {msg && <div className="text-rose-500 font-bold">{msg}</div>}
        </div>
      )}
    </GameShell>
  );
}

/* ====================== 4. MARKETPLACE BARTERING ====================== */
export function Marketplace({ theme, onBack, onRestart }: { theme: Theme; onBack: () => void; onRestart: () => void }) {
  const { settings, addStars } = useStore();
  const L = settings.learn;
  const keepers = [{ icon: '🦊', name: 'Foxy' }, { icon: '🐻', name: 'Bruno' }, { icon: '🐰', name: 'Hopper' }];
  const [stock] = useState(() => pick(theme.words, 6).map((w, i) => ({ w, price: 3 + Math.floor(Math.random() * 6), keeper: keepers[i % 3], sold: false })));
  const [coins, setCoins] = useState(12);
  const [bag, setBag] = useState<Word[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [phase, setPhase] = useState<'ask' | 'offer' | 'deal' | 'nodeal'>('ask');
  const [offer, setOffer] = useState<number | null>(null);
  const [line, setLine] = useState('');
  const item = sel !== null ? stock[sel] : null;
  const won = bag.length >= 3;

  const say = (t: string) => { setLine(t); speak(t, L); };
  const askPrice = () => { if (!item) return; setPhase('offer'); say(`${item.w.t[L]}: ${NUMBER_WORDS[L][item.price]} ${UI.coins[L]}.`); };
  const makeOffer = (n: number) => {
    if (!item) return; setOffer(n);
    const minOk = Math.max(1, Math.ceil(item.price * 0.6));
    if (n >= minOk && n <= coins) { setPhase('deal'); sfx.coin(); addStars(2); say(`${UI.yes[L]}! ${NUMBER_WORDS[L][n]} ${UI.coins[L]}. ${UI.thankYou[L]}`); setTimeout(() => { setCoins(coins - n); setBag([...bag, item.w]); stock[sel!].sold = true; setSel(null); setPhase('ask'); setOffer(null); setLine(''); }, 2200); }
    else { setPhase('nodeal'); sfx.wrong(); say(n > coins ? UI.tooExpensive[L] : `${UI.no[L]}, ${UI.no[L]}!`); setTimeout(() => setPhase('offer'), 1500); }
  };

  return (
    <GameShell title="Marketplace Friends" icon="🏪" onBack={onBack}
      tutorTip={`Learner has 12 coins and must buy 3 things. They tap an item and must ASK "${UI.howMuch[L]} …?" out loud. The shopkeeper says the price. Then the learner BARGAINS: "${UI.tooExpensive[L]} ${UI.canIHave[L]} 3 ${UI.coins[L]}?" Shopkeepers accept 60% or more. Practise numbers, please/thank you, and polite phrases.`}
      right={<div className="flex gap-4 text-2xl font-black"><span className="text-amber-500">🪙 {coins}</span><span className="text-emerald-600">🛍️ {bag.length}/3</span></div>}>
      <Confetti show={won} />
      {won ? (
        <div className="flex flex-col items-center gap-5 py-8">
          <div className="text-5xl font-black text-emerald-700">Shopping done! 🎉</div>
          <div className="flex gap-3">{bag.map((b, i) => <Icon key={i} icon={b.icon} size={100} />)}</div>
          <div className="text-2xl text-slate-600">Now tell me: what did you buy? How much was it?</div>
          <Btn size="xl" onClick={onRestart}>New market</Btn>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_420px] gap-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stock.map((s, i) => (
              <button key={i} disabled={s.sold} onClick={() => { setSel(i); setPhase('ask'); setLine(''); setOffer(null); sfx.tap(); }}
                className={cn('bg-white rounded-3xl border-4 p-4 flex flex-col items-center gap-1 relative', s.sold ? 'opacity-30' : sel === i ? 'border-indigo-500 shadow-[0_0_0_6px_#c7d2fe]' : 'border-slate-100 shadow-[0_6px_0_#e2e8f0] hover:border-indigo-300')}>
                <div className="absolute -top-3 -left-2 text-4xl">{s.keeper.icon}</div>
                <Icon icon={s.w.icon} size={100} />
                <div dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-2xl font-black text-slate-800">{s.w.t[L]}</div>
                <div className="text-lg text-slate-400 font-bold">{phase !== 'ask' && sel === i ? `🪙 ${s.price}` : '🪙 ?'}</div>
                {s.sold && <div className="absolute inset-0 flex items-center justify-center text-5xl">✅</div>}
              </button>
            ))}
          </div>
          <div className="bg-amber-50 rounded-[2rem] border-4 border-amber-200 p-6 flex flex-col items-center gap-4 min-h-[420px]">
            {!item ? <div className="text-2xl text-slate-500 font-semibold text-center my-auto">👆 Tap something you want to buy</div> : (
              <>
                <div className="flex items-center gap-3"><span className="text-6xl">{item.keeper.icon}</span><div className="text-xl font-black text-slate-700">{item.keeper.name}</div></div>
                {line && <Bubble>{line}</Bubble>}
                {phase === 'ask' && (
                  <>
                    <div dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-3xl font-black text-slate-800 text-center">"{UI.howMuch[L]} {item.w.t[L]}?"</div>
                    <SpeakBtn text={`${UI.howMuch[L]} ${item.w.t[L]}?`} lang={L} />
                    <MicBtn lang={L} size="md" prompt="Ask the price" onResult={(h) => { if (heardMatches(h, item.w.t[L]) || normalize(h).split(' ').length >= 2) askPrice(); else sfx.wrong(); }} />
                    <Btn tone="success" onClick={askPrice}>✓ Tutor: they asked</Btn>
                  </>
                )}
                {(phase === 'offer' || phase === 'nodeal') && (
                  <>
                    <div dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-2xl font-black text-slate-800 text-center">"{UI.tooExpensive[L]} {UI.canIHave[L]} … {UI.coins[L]}?"</div>
                    <div className="text-slate-500 font-semibold">Say a number, or tap:</div>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <button key={n} onClick={() => makeOffer(n)} className={cn('w-14 h-14 rounded-2xl border-4 text-2xl font-black', offer === n ? 'bg-indigo-100 border-indigo-400' : 'bg-white border-slate-200 hover:border-indigo-300')}>{n}</button>)}
                    </div>
                    <MicBtn lang={L} size="md" prompt="Make an offer" onResult={(h) => { const nh = normalize(h); const idx = NUMBER_WORDS[L].findIndex((nw, k) => k > 0 && (nh.includes(nw) || nh.includes(String(k)))); if (idx > 0) makeOffer(idx); else { sfx.wrong(); setLine('?'); } }} />
                  </>
                )}
                {phase === 'deal' && <div className="text-4xl font-black text-emerald-600">🤝 Deal!</div>}
              </>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}
