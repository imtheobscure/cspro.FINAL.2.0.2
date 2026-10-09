import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Theme, LANG_META } from '../data/types';
import { UI, pick, shuffle, HEROES } from '../data';
import { useStore } from '../lib/store';
import { speak, sfx, heardMatches, normalize, startMicMeter, listenOnce, recognitionSupported } from '../lib/audio';
import { Btn, Icon, SpeakBtn, MicBtn, Bubble, Confetti, GameShell, Progress } from './ui';
import { cn } from '../utils/cn';

/* ====================== 5. VOICE MAZE NAVIGATOR ====================== */
const N = 7;
function makeMaze(): boolean[][] { // true = wall
  const g = Array.from({ length: N }, () => Array(N).fill(true));
  const carve = (x: number, y: number) => {
    g[y][x] = false;
    for (const [dx, dy] of shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]])) {
      const nx = x + dx * 2, ny = y + dy * 2;
      if (nx >= 0 && ny >= 0 && nx < N && ny < N && g[ny][nx]) { g[y + dy][x + dx] = false; carve(nx, ny); }
    }
  };
  carve(0, 0);
  return g;
}
export function MazeNavigator({ theme, onBack }: { theme: Theme; onBack: () => void }) {
  const { settings, addStars } = useStore();
  const L = settings.learn;
  const [seed, setSeed] = useState(0);
  const maze = useMemo(makeMaze, [seed]);
  const obstacles = useMemo(() => {
    const cells: [number, number][] = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!maze[y][x] && !(x === 0 && y === 0) && !(x === N - 1 && y === N - 1)) cells.push([x, y]);
    return pick(cells, 4).map((c, i) => ({ x: c[0], y: c[1], w: pick(theme.words, 4)[i], cleared: false }));
  }, [maze, theme]);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [blocked, setBlocked] = useState<typeof obstacles[0] | null>(null);
  const [msg, setMsg] = useState('');
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const won = pos.x === N - 1 && pos.y === N - 1;
  const hero = HEROES[0];
  useEffect(() => { setPos({ x: 0, y: 0 }); setCleared(new Set()); setBlocked(null); }, [seed]);
  useEffect(() => { if (won) { sfx.win(); addStars(5); } }, [won]); // eslint-disable-line

  const dirs: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const move = (d: keyof typeof dirs) => {
    if (blocked) { setMsg(`First say the word: ${blocked.w.t[L]}`); sfx.wrong(); return; }
    const [dx, dy] = dirs[d];
    const nx = pos.x + dx, ny = pos.y + dy;
    if (nx < 0 || ny < 0 || nx >= N || ny >= N || maze[ny][nx]) { sfx.wrong(); setMsg('Bump! There is a wall.'); return; }
    sfx.step(); setPos({ x: nx, y: ny }); setMsg('');
    const ob = obstacles.find((o) => o.x === nx && o.y === ny && !cleared.has(`${o.x},${o.y}`));
    if (ob) { setBlocked(ob); speak(`${UI.whatIsThis[L]}`, L); }
  };
  const heardDir = (h: string) => {
    const n = normalize(h);
    const found = (Object.keys(dirs) as (keyof typeof dirs)[]).find((d) => n.includes(normalize(UI[d][L])) || n.includes(d));
    if (found) move(found); else { sfx.wrong(); setMsg(`Say: ${UI.up[L]} / ${UI.down[L]} / ${UI.left[L]} / ${UI.right[L]} (heard "${h}")`); }
  };
  const clearObstacle = () => { if (!blocked) return; sfx.correct(); addStars(1); speak(UI.goodJob[L], L); setCleared((c) => new Set([...c, `${blocked.x},${blocked.y}`])); setBlocked(null); setMsg(''); };

  return (
    <GameShell title="Voice Maze Navigator" icon="🧭" onBack={onBack}
      tutorTip={`The learner guides ${hero.name} to the ⭐ ONLY by speaking directions: "${UI.up[L]}", "${UI.down[L]}", "${UI.left[L]}", "${UI.right[L]}". When ${hero.name} meets an object, the learner must NAME it (and describe it) to pass. Tutor can use the arrow buttons if the mic misses. Ask: "Where is ${hero.name} now? What is next to him?"`}
      right={<Btn tone="ghost" onClick={() => setSeed((s) => s + 1)}>🔀 New maze</Btn>}>
      <Confetti show={won} />
      <div className="grid lg:grid-cols-[auto_1fr] gap-8 items-start">
        <div className="bg-slate-800 p-3 rounded-3xl shadow-[0_10px_0_#0f172a] inline-block">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${N}, 64px)` }}>
            {maze.map((row, y) => row.map((wall, x) => {
              const ob = obstacles.find((o) => o.x === x && o.y === y && !cleared.has(`${o.x},${o.y}`));
              const isHero = pos.x === x && pos.y === y;
              const isGoal = x === N - 1 && y === N - 1;
              return (
                <div key={`${x}-${y}`} className={cn('w-16 h-16 rounded-lg flex items-center justify-center', wall ? 'bg-slate-700' : 'bg-emerald-100')}>
                  {isHero ? <motion.div layoutId="hero" className="text-4xl">{hero.icon}</motion.div> : isGoal ? <span className="text-4xl">⭐</span> : ob ? <Icon icon={ob.w.icon} size={44} /> : null}
                </div>
              );
            }))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {won ? (
            <div className="bg-emerald-50 border-4 border-emerald-200 rounded-3xl p-8 text-center"><div className="text-5xl font-black text-emerald-700">🏁 You made it!</div><div className="text-2xl mt-2 text-slate-600">Tell me the way you went: "First up, then right…"</div></div>
          ) : blocked ? (
            <div className="bg-amber-50 border-4 border-amber-200 rounded-3xl p-6 flex flex-col items-center gap-3">
              <div className="text-2xl font-black text-amber-900">🚧 Something is in the way! What is it?</div>
              <Icon icon={blocked.w.icon} size={140} />
              <div dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-3xl font-black text-slate-800">"{UI.itIsA[L]} …"</div>
              <MicBtn lang={L} size="md" prompt="Name it" onResult={(h) => heardMatches(h, blocked.w.t[L]) ? clearObstacle() : (sfx.wrong(), setMsg(`${UI.tryAgain[L]} (heard "${h}")`))} />
              <div className="flex gap-2"><Btn tone="success" onClick={clearObstacle}>✓ Tutor: named it</Btn><Btn tone="ghost" onClick={() => speak(blocked.w.t[L], L)}>🔊 Hint</Btn></div>
            </div>
          ) : (
            <div className="bg-white border-4 border-slate-100 rounded-3xl p-6 flex flex-col items-center gap-4">
              <div className="text-2xl font-black text-slate-800">Say a direction!</div>
              <div className="grid grid-cols-3 gap-2 w-56">
                <div /><Btn tone="soft" onClick={() => move('up')}>⬆ {UI.up[L]}</Btn><div />
                <Btn tone="soft" onClick={() => move('left')}>⬅ {UI.left[L]}</Btn>
                <MicBtn lang={L} size="md" onResult={heardDir} />
                <Btn tone="soft" onClick={() => move('right')}>{UI.right[L]} ➡</Btn>
                <div /><Btn tone="soft" onClick={() => move('down')}>⬇ {UI.down[L]}</Btn><div />
              </div>
            </div>
          )}
          {msg && <div className="text-rose-500 font-bold text-xl">{msg}</div>}
        </div>
      </div>
    </GameShell>
  );
}

/* ====================== 6. PICTURE-BOOK DETECTIVE ====================== */
export function Detective({ theme, onBack, onRestart }: { theme: Theme; onBack: () => void; onRestart: () => void }) {
  const { settings, addStars } = useStore();
  const L = settings.learn;
  const places = ['in the kitchen', 'in the garden', 'at school', 'in the park'];
  const suspects = useMemo(() => shuffle([{ icon: '🐱', name: 'Kitty' }, { icon: '🐶', name: 'Rex' }, { icon: '🦊', name: 'Foxy' }, { icon: '🐻', name: 'Teddy' }]).map((s, i) => ({ ...s, place: places[i], had: pick(theme.words, 4)[i], likes: pick(theme.words, 4)[i] })), [theme]);
  const [missing] = useState(() => pick(theme.words, 1)[0]);
  const thief = useMemo(() => Math.floor(Math.random() * 4), []);
  const [asked, setAsked] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [verdict, setVerdict] = useState<'right' | 'wrong' | null>(null);
  const [msg, setMsg] = useState('');
  const questions: { key: 'where' | 'had' | 'like'; text: string }[] = [
    { key: 'where', text: UI.whereWereYou[L] }, { key: 'had', text: UI.whatDidYouHave[L] }, { key: 'like', text: UI.whatDoYouLike[L] },
  ];
  const answerFor = (i: number, k: string) => {
    const s = suspects[i];
    if (k === 'where') return i === thief ? `I was ${s.place}… near the ${missing.t.en}. Hmm.` : `I was ${s.place}.`;
    if (k === 'had') return i === thief ? `I had… um… a ${s.had.t.en}. Nothing else!` : `I had a ${s.had.t.en}.`;
    return i === thief ? `I like ${missing.t.en}! I mean… I like ${s.likes.t.en}.` : `I like ${s.likes.t.en}.`;
  };
  const ask = (k: 'where' | 'had' | 'like') => { if (sel === null) return; const a = answerFor(sel, k); setAnswer(a); speak(a, 'en'); setAsked((q) => ({ ...q, [`${sel}-${k}`]: true })); addStars(1); };
  const accuse = (i: number) => { if (i === thief) { setVerdict('right'); sfx.win(); addStars(5); speak(`Yes! It was me. I took the ${missing.t.en}. I am sorry.`, 'en'); } else { setVerdict('wrong'); sfx.wrong(); speak('No! It was not me!', 'en'); setTimeout(() => setVerdict(null), 1800); } };

  return (
    <GameShell title="Picture-Book Detective" icon="🕵️" onBack={onBack}
      tutorTip={`Something is missing: the ${missing.t.en}! The learner interviews 4 suspects. They must ASK each question out loud (mic or tap). The thief gives clues by accident (mentions the missing item). Encourage open questions and note-taking: "Who was in the kitchen? What did Foxy have?" Then the detective accuses someone.`}>
      <Confetti show={verdict === 'right'} />
      <div className="bg-indigo-50 border-4 border-indigo-200 rounded-3xl p-5 flex items-center gap-4">
        <span className="text-5xl">🔍</span>
        <div className="text-2xl font-black text-indigo-900">Missing: the <span dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-indigo-600">{missing.t[L]}</span> ({missing.t.en}). Who took it?</div>
        <Icon icon={missing.icon} size={80} className="ml-auto" />
      </div>
      {verdict === 'right' ? (
        <div className="flex flex-col items-center gap-4 py-8"><div className="text-8xl">{suspects[thief].icon}</div><div className="text-5xl font-black text-emerald-700">Case solved! It was {suspects[thief].name}!</div><div className="text-2xl text-slate-600">Explain: How did you know? "Because…"</div><Btn size="xl" onClick={onRestart}>New case</Btn></div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_420px] gap-6">
          <div className="grid grid-cols-2 gap-4">
            {suspects.map((s, i) => (
              <div key={i} className={cn('bg-white rounded-3xl border-4 p-5 flex flex-col items-center gap-2', sel === i ? 'border-indigo-500 shadow-[0_0_0_6px_#c7d2fe]' : 'border-slate-100 shadow-[0_6px_0_#e2e8f0]')}>
                <button onClick={() => { setSel(i); setAnswer(''); sfx.tap(); }} className="text-8xl">{s.icon}</button>
                <div className="text-2xl font-black text-slate-800">{s.name}</div>
                <div className="flex gap-1">{questions.map((q) => <span key={q.key} className={cn('w-4 h-4 rounded-full', asked[`${i}-${q.key}`] ? 'bg-emerald-500' : 'bg-slate-200')} />)}</div>
                <Btn tone="danger" size="md" onClick={() => accuse(i)}>👉 {UI.whoTookIt[L].replace('?', '')}: {s.name}!</Btn>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border-4 border-amber-200 rounded-3xl p-6 flex flex-col gap-4 items-center">
            {sel === null ? <div className="text-2xl text-slate-500 font-semibold text-center my-auto">👆 Tap a suspect to interview</div> : (
              <>
                <div className="text-6xl">{suspects[sel].icon}</div>
                {answer && <Bubble>{answer}</Bubble>}
                <div className="text-slate-500 font-semibold">Ask a question out loud:</div>
                {questions.map((q) => (
                  <button key={q.key} onClick={() => ask(q.key)} dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="w-full bg-white rounded-2xl border-4 border-slate-200 hover:border-indigo-400 px-4 py-3 text-2xl font-black text-slate-800 flex items-center gap-3">
                    <SpeakBtn text={q.text} lang={L} size="sm" /> {q.text}
                  </button>
                ))}
                <MicBtn lang={L} size="md" prompt="Ask with your voice" onResult={(h) => { const hit = questions.find((q) => heardMatches(h, q.text.split(' ').slice(0, 2).join(' '))); if (hit) ask(hit.key); else { sfx.wrong(); setMsg(`Try one of the three questions (heard "${h}")`); } }} />
                {msg && <div className="text-rose-500 font-bold text-center">{msg}</div>}
              </>
            )}
            {verdict === 'wrong' && <div className="text-3xl font-black text-rose-600">Not them! Keep asking.</div>}
          </div>
        </div>
      )}
    </GameShell>
  );
}

/* ====================== 7. TELEPHONE MONSTER CHAIN ====================== */
export function TelephoneMonsters({ theme, onBack }: { theme: Theme; onBack: () => void }) {
  const { settings, addStars } = useStore();
  const L = settings.learn;
  const monsters = ['👾', '👹', '🤖', '👻', '🧌'];
  const [round, setRound] = useState(0);
  const [pos, setPos] = useState(0);
  const [score, setScore] = useState(0);
  const [heard, setHeard] = useState('');
  const [msg, setMsg] = useState('');
  const phrases = useMemo(() => pick(theme.words, 5).map((w) => {
    const two = pick(theme.words.filter((x) => x.id !== w.id), 1)[0];
    return { text: `${w.t[L]} ${L === 'zh' || L === 'fa' ? '' : 'and '}${two.t[L]}`.trim(), words: [w, two] };
  }), [theme, L]);
  const p = phrases[round];
  const done = round >= phrases.length;
  const whisper = () => { sfx.pop(); speak(p.text, L); };
  useEffect(() => { if (!done) { setPos(0); setHeard(''); setTimeout(whisper, 400); } }, [round]); // eslint-disable-line
  const pass = (ok: boolean) => {
    if (ok) { sfx.correct(); if (pos + 1 >= 4) { addStars(3); setScore((s) => s + 1); speak(UI.goodJob[L], L); setTimeout(() => setRound(round + 1), 1500); } else setPos(pos + 1); setMsg(''); }
    else { sfx.wrong(); setMsg(`${UI.tryAgain[L]} – listen again!`); }
  };
  return (
    <GameShell title="Telephone Monster Chain" icon="👾" onBack={onBack}
      tutorTip="Monster 1 whispers a secret phrase (press it to hear it – only once if you want a challenge!). The learner must REPEAT it clearly to the next monster. Each monster in line must hear it correctly. Focus on clear pronunciation and listening. Tutor: use ✓ when the repetition is good."
      right={<div className="text-2xl font-black text-amber-500">⭐ {score}/{phrases.length}</div>}>
      <Confetti show={done} />
      {done ? (
        <div className="text-center py-10 flex flex-col items-center gap-4"><div className="text-5xl font-black text-emerald-700">All messages delivered!</div><div className="text-2xl text-slate-600">{score} perfect chains. Can you remember all the phrases?</div><Btn size="xl" onClick={() => { setRound(0); setScore(0); }}>Play again</Btn></div>
      ) : (
        <>
          <div className="bg-violet-50 border-4 border-violet-200 rounded-[2.5rem] p-8 flex items-end justify-around min-h-[260px]">
            {monsters.map((m, i) => (
              <motion.div key={i} animate={i === pos ? { y: [0, -14, 0], scale: 1.15 } : i < pos ? { scale: 1 } : { scale: 0.9, opacity: 0.5 }} transition={{ repeat: i === pos ? Infinity : 0, duration: 1 }} className="flex flex-col items-center gap-2">
                <button onClick={i === 0 ? whisper : undefined} className={cn('text-7xl', i === 0 && 'cursor-pointer hover:scale-110 transition-transform')}>{m}</button>
                <div className="text-lg font-bold text-slate-600">{i === 0 ? '🔊 tap me' : i < pos ? '✅' : i === pos ? '👂 listening' : ''}</div>
              </motion.div>
            ))}
          </div>
          <div className="bg-white border-4 border-slate-100 rounded-3xl p-6 flex flex-col items-center gap-4">
            <Progress total={4} current={pos} />
            <div className="text-2xl font-black text-slate-800">{UI.repeat[L]} → monster {pos + 2}</div>
            <div className="flex gap-2">{p.words.map((w, k) => <Icon key={k} icon={w.icon} size={70} className="opacity-30" />)}</div>
            <MicBtn lang={L} prompt="Whisper it to the next monster" onResult={(h) => { setHeard(h); pass(p.words.every((w) => heardMatches(h, w.t[L]))); }} />
            {heard && <div className="text-slate-400">Heard: "{heard}"</div>}
            {msg && <div className="text-rose-500 font-bold text-xl">{msg}</div>}
            <div className="flex gap-3"><Btn tone="success" onClick={() => pass(true)}>✓ Tutor: good repeat</Btn><Btn tone="ghost" onClick={whisper}>🔊 Hear again</Btn><Btn tone="ghost" onClick={() => setMsg(`Phrase: ${p.text}`)}>👁 Show</Btn></div>
          </div>
        </>
      )}
    </GameShell>
  );
}

/* ====================== 8. FLUENCY ROCKET BOOSTERS ====================== */
export function RocketBoosters({ theme, onBack }: { theme: Theme; onBack: () => void }) {
  const { settings, addStars } = useStore();
  const L = settings.learn;
  const words = useMemo(() => pick(theme.words, 6), [theme]);
  const script = useMemo(() => {
    const n = (i: number) => words[i % words.length].t[L];
    const en = (i: number) => words[i % words.length].t.en;
    const s = L === 'en' ? [
      `Hi Max! Look, I see a ${en(0)} and a ${en(1)}.`,
      `Wow! I like the ${en(0)}. Do you like it too?`,
      `Yes, I do! And I have a ${en(2)} at home.`,
      `Really? My favourite is the ${en(3)}. It is great!`,
      `Let's play with the ${en(4)} and the ${en(5)}!`,
      `Three, two, one… blast off!`,
    ] : [
      `${UI.hello[L]} ${UI.iSee[L]} ${n(0)}.`,
      `${UI.iSee[L]} ${n(1)}. ${UI.itIsA[L]} ${n(1)}!`,
      `${UI.iWant[L]} ${n(2)}. ${UI.yes[L]}!`,
      `${UI.itIsA[L]} ${n(3)}. ${UI.goodJob[L]}`,
      `${UI.iSee[L]} ${n(4)}. ${UI.iSee[L]} ${n(5)}.`,
      `${UI.thankYou[L]} ${UI.yummy[L]}`,
    ];
    return s;
  }, [words, L]);
  const [alt, setAlt] = useState(0); // 0..100
  const [line, setLine] = useState(0);
  const [level, setLevel] = useState(0);
  const [micOn, setMicOn] = useState(false);
  const [listening, setListening] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const won = alt >= 100;
  useEffect(() => { if (won) { sfx.win(); addStars(5); stopRef.current(); setMicOn(false); } }, [won]); // eslint-disable-line
  useEffect(() => () => stopRef.current(), []);
  // physics: voice pushes up, gravity pulls down
  useEffect(() => {
    if (won) return;
    const id = setInterval(() => setAlt((a) => Math.max(0, Math.min(100, a + (level > 0.08 ? level * 3.2 : -0.6)))), 100);
    return () => clearInterval(id);
  }, [level, won]);
  const toggleMic = async () => {
    if (micOn) { stopRef.current(); setMicOn(false); setLevel(0); return; }
    try { stopRef.current = await startMicMeter(setLevel); setMicOn(true); sfx.rocket(); } catch { alert('Microphone not available. Use the BOOST button.'); }
  };
  const boost = () => { sfx.rocket(); setAlt((a) => Math.min(100, a + 6)); };
  const checkLine = async () => {
    if (!recognitionSupported()) return;
    setListening(true);
    try { const h = await listenOnce(L); const ws = script[line].split(' ').filter((w) => w.length > 3).slice(0, 3); const ok = ws.filter((w) => heardMatches(h, w)).length >= Math.max(1, ws.length - 1); if (ok) { sfx.correct(); setAlt((a) => Math.min(100, a + 15)); setLine((l) => Math.min(script.length - 1, l + 1)); } else sfx.wrong(); } catch { /* */ }
    setListening(false);
  };

  return (
    <GameShell title="Fluency Rocket Boosters" icon="🚀" onBack={onBack}
      tutorTip="Turn on the microphone. The learner reads the dialogue lines aloud – the louder and more CONTINUOUS their voice, the higher the rocket flies. Silence makes it sink! Great for fluency and confidence. Press 'Next line' as they read; the tutor BOOST button helps younger learners. Reach the moon to win."
      right={<Btn tone={micOn ? 'danger' : 'success'} onClick={toggleMic}>{micOn ? '⏹ Stop mic' : '🎤 Start mic'}</Btn>}>
      <Confetti show={won} />
      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <div className="relative bg-gradient-to-b from-slate-900 via-indigo-900 to-sky-400 rounded-[2rem] h-[520px] overflow-hidden border-4 border-slate-700">
          {Array.from({ length: 25 }).map((_, i) => <div key={i} className="absolute w-1 h-1 bg-white rounded-full opacity-70" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 60}%` }} />)}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-6xl">🌕</div>
          <motion.div animate={{ bottom: `${8 + alt * 0.78}%`, rotate: level > 0.1 ? [-3, 3, -3] : 0 }} transition={{ type: 'spring', stiffness: 60, damping: 15 }} className="absolute left-1/2 -translate-x-1/2 text-7xl flex flex-col items-center">
            🚀
            {level > 0.08 && <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 0.3 }} className="text-4xl -mt-3">🔥</motion.div>}
          </motion.div>
          <div className="absolute bottom-0 inset-x-0 h-8 bg-emerald-600" />
          <div className="absolute right-3 top-3 bottom-3 w-4 bg-white/20 rounded-full overflow-hidden"><motion.div animate={{ height: `${alt}%` }} className="absolute bottom-0 w-full bg-amber-400" /></div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-white border-4 border-slate-100 rounded-3xl p-4 flex items-center gap-4">
            <span className="text-2xl font-black text-slate-700">Voice power</span>
            <div className="flex-1 h-8 bg-slate-100 rounded-full overflow-hidden"><motion.div animate={{ width: `${level * 100}%` }} className={cn('h-full', level > 0.08 ? 'bg-emerald-500' : 'bg-slate-300')} /></div>
            <span className="text-2xl font-black text-indigo-700">{Math.round(alt)}%</span>
          </div>
          {won ? <div className="bg-emerald-50 border-4 border-emerald-200 rounded-3xl p-8 text-center text-5xl font-black text-emerald-700">🌕 You reached the moon!</div> : (
            <div className="bg-white border-4 border-slate-100 rounded-3xl p-6 flex flex-col gap-4">
              <div className="text-slate-500 font-semibold text-xl">Read aloud – keep talking!</div>
              {script.map((s, i) => (
                <div key={i} onClick={() => setLine(i)} dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className={cn('rounded-2xl px-5 py-3 text-2xl font-bold cursor-pointer flex items-center gap-3 transition-colors', i === line ? 'bg-amber-100 border-4 border-amber-300 text-slate-900' : i < line ? 'text-emerald-600 line-through opacity-60' : 'text-slate-400')}>
                  <span className="text-3xl">{i % 2 === 0 ? HEROES[0].icon : HEROES[1].icon}</span>{s}
                  {i === line && <SpeakBtn text={s} lang={L} size="sm" className="ml-auto" />}
                </div>
              ))}
              <div className="flex gap-3 flex-wrap">
                <Btn tone="accent" size="lg" onClick={boost}>🔥 Tutor BOOST</Btn>
                <Btn tone="soft" size="lg" onClick={() => setLine((l) => Math.min(script.length - 1, l + 1))}>Next line →</Btn>
                <Btn tone="ghost" size="lg" disabled={listening} onClick={checkLine}>{listening ? 'Listening…' : '🎤 Check this line (+15)'}</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}


