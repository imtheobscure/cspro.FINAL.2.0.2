import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Scene, type SceneState } from "./Scene";
import { modeById, type Mode } from "./modes";
import { READ_TEXTS, buildReadPrompt, dailyText, pickQueue, type ReadText } from "../data/content";
import { useStore, load, save } from "../core/store";
import { LV } from "../data/content";
import { align, createRecognizer, createRecorder, phraseChunks, scoreAttempt, speak, speakKaraoke, sttSupported, tokenize, type WordState, type AttemptResult, type Recognizer } from "../core/speech";
import { playMusic, sfx, setIntensity } from "../core/audio";
import { lookupMany, playAudio, rhymes, type DictEntry } from "../core/dictionary";
import { Btn, Card, Countdown, cx, Modal, Scoreboard } from "../components/ui";

const REPS = 5, ROUNDS = 10;
interface Rec { wpm: number; score: number; holder: string; acc: number; }
interface CustomPack { texts: ReadText[] }

function tipFor(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z']/g, "");
  if (/th/.test(w)) return "Tongue between teeth for 'th' — never swap in /t/, /d/, /s/ or /z/.";
  if (/(ed)$/.test(w)) return "Past '-ed': /t/ after voiceless (walked), /d/ after voiced (played), /ɪd/ only after t/d (wanted).";
  if (/^(str|spr|scr|spl|thr)/.test(w)) return "Three-consonant start: do not insert a vowel inside the cluster.";
  if (/(ght|gh)/.test(w)) return "'gh' is silent (or /f/ in enough). Do not pronounce a /g/.";
  if (/tion|sion/.test(w)) return "'-tion' = /ʃən/. Stress the syllable BEFORE it.";
  if (/(ough)/.test(w)) return "'ough' is irregular — lock this word's exact vowel.";
  if ((w.match(/[aeiouy]+/g) || []).length >= 3) return "Multi-syllable: find the stress and reduce the rest to /ə/.";
  if (/[^aeiou]s$/.test(w)) return "Final '-s' must be heard: /s/ after voiceless, /z/ after voiced.";
  if (/[rl]/.test(w)) return "/r/ has no tongue contact; /l/ touches behind the teeth.";
  if (/w/.test(w)) return "Round the lips for /w/. Do not replace with /v/.";
  return "Say it slowly three times, then drop it back into the whole phrase.";
}
const pte = (x: number) => Math.round(10 + Math.max(0, Math.min(1, x)) * 80);
function burst() { confetti({ particleCount: 160, spread: 78, origin: { y: 0.62 }, colors: ["#fbbf24", "#f97316", "#22d3ee", "#f472b6"] }); }

export default function SpeedReader({ onExit, initialMode }: { onExit: () => void; initialMode: string }) {
  const { s, addScore, set } = useStore();
  const me = s.players.find((p) => p.id === s.activePlayer) || s.players[0];
  const [mode] = useState<Mode>(() => modeById(initialMode));
  const [phase, setPhase] = useState<"loadout" | "prep" | "count" | "read" | "result" | "textReport" | "session">("loadout");
  const [round, setRound] = useState(0); const [rep, setRep] = useState(0);
  const [queue, setQueue] = useState<ReadText[]>([]);
  const [tapMode, setTapMode] = useState(!sttSupported());
  const [records, setRecords] = useState<Record<string, Rec>>(() => load("speedreader.records", {}));
  const [states, setStates] = useState<WordState[]>([]); const [cursor, setCursor] = useState(0);
  const [elapsed, setElapsed] = useState(0); const [wpmLive, setWpmLive] = useState(0);
  const [streak, setStreak] = useState(0); const [nitro, setNitro] = useState(0); const [shield, setShield] = useState(0);
  const [echo, setEcho] = useState(0); const [slow, setSlow] = useState(0);
  const [nitroActive, setNitroActive] = useState(false); const [slowActive, setSlowActive] = useState(false);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]); const [allAttempts, setAllAttempts] = useState<{ text: ReadText; results: AttemptResult[] }[]>([]);
  const [last, setLast] = useState<AttemptResult | null>(null); const [newRecord, setNewRecord] = useState(false);
  const [prepLeft, setPrepLeft] = useState(35); const [modelWord, setModelWord] = useState(-1);
  const [dict, setDict] = useState<DictEntry[]>([]); const [rhymeMap, setRhymeMap] = useState<Record<string, string[]>>({});
  const [clip, setClip] = useState<string | null>(null); const [customOpen, setCustomOpen] = useState(false);
  const [customRaw, setCustomRaw] = useState(""); const [customErr, setCustomErr] = useState(""); const [extra, setExtra] = useState<ReadText[]>([]);
  const [focusPhrase, setFocusPhrase] = useState(true);

  const scene = useRef<SceneState>({ progress: 0, ghost: 0, speed: 0, accuracy: 1, hit: 0, miss: 0, nitro: false, finished: false, combo: 0 });
  const rec = useRef<Recognizer | null>(null); const recorder = useRef(createRecorder());
  const startT = useRef(0); const hits = useRef<number[]>([]); const lastProg = useRef(0); const pauses = useRef(0);
  const heardAtRef = useRef<(string | null)[]>([]); const statesRef = useRef<WordState[]>([]); const forgiven = useRef<Set<number>>(new Set());
  const heardRef = useRef(""); const finishedRef = useRef(false);
  const shieldRef = useRef(0); const nitroRef = useRef(false); const slowRef = useRef(false);
  useEffect(() => { shieldRef.current = shield; }, [shield]);
  useEffect(() => { nitroRef.current = nitroActive; }, [nitroActive]);
  useEffect(() => { slowRef.current = slowActive; }, [slowActive]);

  const isPractice = mode.id === "practice";
  const exam = s.exam || s.difficulty === "pte";
  const text = queue[round]; const words = useMemo(() => (text ? tokenize(text.text) : []), [text]);
  const chunks = useMemo(() => phraseChunks(words), [words]);
  const record = text ? records[text.id] : undefined;
  const ghostWpm = (record?.wpm || mode.ghostWpm) * (s.difficulty === "brutal" ? 1.15 : 1) * (slowActive ? 0.7 : 1);
  const strict = s.difficulty === "brutal" ? Math.max(s.strictness, 0.88) : s.strictness;

  useEffect(() => { playMusic(mode.music); }, [mode]);
  useEffect(() => () => { rec.current?.stop(); recorder.current.stop(); }, []);

  function buildQueue(n = isPractice ? 1 : ROUNDS, extras = extra) {
    const q = pickQueue(s.audience, s.level, n, extras);
    if ((round === 4 || n > 5) && q[4] && s.audience === "adult") {
      const harder = READ_TEXTS.filter((t) => t.audience === "adult" && (t.level === "C1" || t.level === "C2"));
      if (harder.length) q[4] = harder[(q[0].id.charCodeAt(1) || 0) % harder.length];
      if (q[9] && harder.length) q[9] = harder[(q[0].id.charCodeAt(0) || 1) % harder.length];
    }
    setQueue(q); setRound(0); setRep(0); setAttempts([]); setAllAttempts([]);
  }
  function startSession() { if (!queue.length) buildQueue(); setNitro(1); setShield(1); setEcho(1); setSlow(isPractice ? 2 : 1); setPhase(exam && !isPractice ? "prep" : "count"); }

  function resetAttempt() {
    const st: WordState[] = words.map(() => "pending"); setStates(st); statesRef.current = st; heardAtRef.current = words.map(() => null);
    forgiven.current = new Set(); heardRef.current = ""; setCursor(0); setElapsed(0); setWpmLive(0); setStreak(0);
    setNitroActive(false); setSlowActive(false); hits.current = []; pauses.current = 0; finishedRef.current = false; setNewRecord(false); setClip(null); setModelWord(-1);
    scene.current = { progress: 0, ghost: 0, speed: 0, accuracy: 1, hit: 0, miss: 0, nitro: false, finished: false, combo: 0 };
  }
  async function beginReading() {
    resetAttempt(); startT.current = performance.now(); lastProg.current = performance.now(); setPhase("read");
    if (!tapMode) {
      rec.current = createRecognizer((fin, interim) => { heardRef.current = (fin + " " + interim).trim(); process(fin + " " + interim); }, () => {});
      rec.current?.start(); recorder.current.start();
    }
  }
  function applyStates(next: WordState[], heardAt: (string | null)[], cur: number) {
    const prev = statesRef.current; let newHit = 0, newMiss = 0;
    for (let i = 0; i < next.length; i++) {
      if (forgiven.current.has(i)) { next[i] = "ok"; continue; }
      if (prev[i] === "pending" && next[i] === "missed") {
        if (shieldRef.current > 0 && !isPractice) { forgiven.current.add(i); next[i] = "ok"; shieldRef.current--; setShield((x) => x - 1); sfx.boost(); }
        else newMiss++;
      }
      if (prev[i] === "pending" && (next[i] === "ok" || next[i] === "close")) newHit++;
      if (prev[i] !== "pending" && next[i] === "pending") next[i] = prev[i];
    }
    if (newHit) {
      for (let i = 0; i < newHit; i++) hits.current.push(performance.now());
      sfx.word(); scene.current.hit = newHit; lastProg.current = performance.now();
      if (mode.id === "kraken") sfx.cannon();
      setStreak((x) => {
        const n = x + newHit; scene.current.combo = n;
        if (n > 0 && n % 8 === 0) { sfx.combo(n / 8); setNitro((v) => Math.min(3, v + 1)); }
        if (n > 0 && n % 12 === 0) setShield((v) => Math.min(2, v + 1));
        if (n > 0 && n % 10 === 0) setEcho((v) => Math.min(2, v + 1));
        return n;
      });
    }
    if (newMiss) { sfx.miss(); scene.current.miss = newMiss; setStreak(0); scene.current.combo = 0; if (mode.id === "kraken") sfx.splash(); if (mode.id === "avalanche") sfx.ski(); }
    statesRef.current = next; heardAtRef.current = heardAt; setStates([...next]); setCursor(cur);
    const done = next.filter((x) => x !== "pending").length; scene.current.progress = done / Math.max(1, next.length);
    const okc = next.filter((x) => x === "ok").length + 0.6 * next.filter((x) => x === "close").length;
    scene.current.accuracy = done ? okc / done : 1;
    if (cur >= next.length && !finishedRef.current) finish(next, heardAt);
  }
  function process(h: string) { if (finishedRef.current) return; const r = align(words, h, strict, statesRef.current); applyStates(r.states, r.heardAt, r.cursor); }
  function tapWord(i: number) {
    if (phase !== "read" || finishedRef.current) return;
    const next = [...statesRef.current]; const heardAt = [...heardAtRef.current];
    for (let k = 0; k <= i; k++) if (next[k] === "pending") { next[k] = k === i ? "ok" : "missed"; heardAt[k] = k === i ? words[k] : null; }
    applyStates(next, heardAt, i + 1);
  }
  function markMissTap() {
    if (phase !== "read" || finishedRef.current) return;
    const i = statesRef.current.findIndex((x) => x === "pending"); if (i < 0) return;
    const next = [...statesRef.current]; next[i] = "missed"; applyStates(next, heardAtRef.current, i + 1);
  }

  useEffect(() => {
    if (phase !== "read") return;
    const iv = setInterval(() => {
      const now = performance.now(); const el = (now - startT.current) / 1000; setElapsed(el);
      const ghostMul = slowRef.current ? 0.7 : 1;
      scene.current.ghost = Math.min(1, (el / 60) * ghostWpm * ghostMul / Math.max(1, words.length));
      const recent = hits.current.filter((t) => now - t < 4000).length; const wpm = (recent / 4) * 60; setWpmLive(Math.round(wpm));
      scene.current.speed = Math.min(1, wpm / 200) * (nitroRef.current ? 1.35 : 1); setIntensity(scene.current.speed);
      if (mode.theme === "race" && Math.random() < 0.45) sfx.engine(scene.current.speed);
      if (mode.theme === "avalanche" && Math.random() < 0.2) sfx.ski();
      if (now - lastProg.current > 1600 && scene.current.progress > 0 && scene.current.progress < 1) { pauses.current++; lastProg.current = now; }
      const cap = exam ? 40 : Math.max(28, words.length * 1.35);
      if (el > cap && !finishedRef.current) finish(statesRef.current, heardAtRef.current, true);
    }, 80);
    return () => clearInterval(iv);
  }, [phase, ghostWpm, words.length, mode, exam]);

  useEffect(() => {
    if (phase !== "prep") return;
    setPrepLeft(35); sfx.whoosh();
    const iv = setInterval(() => setPrepLeft((x) => { if (x <= 1) { clearInterval(iv); sfx.beep(); setPhase("count"); return 0; } if (x <= 6) sfx.tick(); return x - 1; }), 1000);
    return () => clearInterval(iv);
  }, [phase, round, rep]);

  async function finish(st: WordState[], heardAt: (string | null)[], timeout = false) {
    finishedRef.current = true; rec.current?.stop(); scene.current.finished = true;
    const url = await recorder.current.stop(); if (url) setClip(url);
    const final = st.map((x) => (x === "pending" ? "missed" : x)) as WordState[];
    const secs = (performance.now() - startT.current) / 1000;
    const r = scoreAttempt(words, final, heardAt, secs, pauses.current);
    if (nitroRef.current) r.score += 8; if (timeout) r.score = Math.max(0, r.score - 8);
    if (streak >= 12) r.score += 10; if (r.accuracy === 1) r.score += 20;
    const prevRec = records[text.id]; const beat = r.accuracy >= 0.58 && (!prevRec || r.score > prevRec.score);
    if (beat) { const nr = { ...records, [text.id]: { wpm: r.wpm, score: r.score, holder: me.name, acc: r.accuracy } }; setRecords(nr); save("speedreader.records", nr); setNewRecord(true); sfx.fanfare(); burst(); }
    else if (r.accuracy > 0.78) sfx.crowd(); else sfx.wrong();
    if (!isPractice) addScore(me.id, r.score + (beat ? 50 : 0) + ((round === 4 || round === 9) && r.accuracy > 0.7 ? 30 : 0));
    setLast(r); setAttempts((a) => [...a, r]);
    lookupMany(r.problem.map((p) => p.word), 8).then(setDict);
    const top = r.problem.slice(0, 4).map((p) => p.word);
    Promise.all(top.map(async (w) => [w, await rhymes(w)] as const)).then((pairs) => setRhymeMap(Object.fromEntries(pairs)));
    setTimeout(() => setPhase("result"), 1100);
  }
  function fireNitro() { if (nitro <= 0 || nitroActive || phase !== "read") return; setNitro((n) => n - 1); setNitroActive(true); scene.current.nitro = true; sfx.boost(); setTimeout(() => { setNitroActive(false); scene.current.nitro = false; }, 5000); }
  function fireSlow() { if (slow <= 0 || slowActive || phase !== "read") return; setSlow((n) => n - 1); setSlowActive(true); sfx.whoosh(); setTimeout(() => setSlowActive(false), 6000); }
  function fireEcho() {
    if (echo <= 0 || phase !== "read") return; setEcho((n) => n - 1);
    const rest = words.filter((_, i) => statesRef.current[i] === "pending").slice(0, 5).join(" ");
    if (rest) speak(rest, { voice: s.narratorVoice, rate: 0.85 });
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (phase !== "read") return;
      if (e.code === "Space") { e.preventDefault(); fireNitro(); }
      if (e.key === "e" || e.key === "E") fireEcho();
      if (e.key === "q" || e.key === "Q") fireSlow();
      if (e.code === "Escape") finish(statesRef.current, heardAtRef.current, true);
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  function nextRep() {
    if (isPractice) { setPhase(exam ? "prep" : "count"); return; }
    if (rep + 1 < REPS) { setRep(rep + 1); setPhase(exam ? "prep" : "count"); }
    else { setAllAttempts((a) => [...a, { text, results: attempts }]); setPhase("textReport"); }
  }
  function nextRound() { if (round + 1 < queue.length) { setRound(round + 1); setRep(0); setAttempts([]); setPhase(exam ? "prep" : "count"); } else setPhase("session"); }

  function loadCustom() {
    try {
      const t = customRaw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
      const p = JSON.parse(t) as CustomPack;
      if (!p.texts?.length) { setCustomErr("Need a texts array"); return; }
      const cleaned = p.texts.filter((x) => x.text && x.title).map((x, i) => ({ ...x, id: x.id || "c" + i, audience: x.audience || s.audience, level: x.level || s.level, focus: x.focus || ["rhythm"] }));
      setExtra(cleaned); buildQueue(isPractice ? 1 : ROUNDS, cleaned); setCustomOpen(false); sfx.correct();
    } catch (e: any) { setCustomErr("Invalid JSON: " + e.message); }
  }

  const boss = !isPractice && (round === 4 || round === 9);
  if (phase !== "loadout" && phase !== "session" && !text) return null;

  if (phase === "loadout") {
    const daily = dailyText(s.audience);
    return <div className="max-w-6xl mx-auto p-5 space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 min-h-48">
        <img src={mode.img} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div className="relative p-6 flex items-end justify-between gap-4 min-h-48">
          <div><div className="text-xs uppercase tracking-[0.3em] text-amber-300">{mode.tag}</div><h1 className="text-5xl font-black text-white" style={{ fontFamily: "Bebas Neue, sans-serif" }}>{mode.name}</h1><p className="text-slate-200 max-w-xl">{mode.desc}</p></div>
          <Btn variant="ghost" onClick={onExit}>← Hub</Btn>
        </div>
      </div>
      <Scoreboard />
      <div className="grid md:grid-cols-3 gap-3">
        <Card className="space-y-3">
          <div className="text-xs uppercase text-slate-400">Classroom</div>
          <div className="flex flex-wrap gap-2">{(["adult", "kids"] as const).map((a) => <button key={a} onClick={() => set({ audience: a })} className={cx("px-3 py-1.5 rounded-lg text-sm font-bold", s.audience === a ? "bg-amber-400 text-black" : "bg-slate-800 text-slate-300")}>{a === "adult" ? "👔 Adults" : "🧒 Kids"}</button>)}</div>
          <div className="flex flex-wrap gap-1">{LV.map((l) => <button key={l} onClick={() => set({ level: l })} className={cx("px-2.5 py-1 rounded-lg text-xs font-bold", s.level === l ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-300")}>{l}</button>)}</div>
          <div className="flex flex-wrap gap-2">{(["arcade", "pte", "brutal"] as const).map((d) => <button key={d} onClick={() => set({ difficulty: d, exam: d === "pte" })} className={cx("px-3 py-1.5 rounded-lg text-xs font-bold uppercase", s.difficulty === d ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-300")}>{d}</button>)}</div>
          <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={s.exam} onChange={(e) => set({ exam: e.target.checked })} /> PTE prep (35s look → beep → 40s read)</label>
          <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={tapMode} onChange={(e) => setTapMode(e.target.checked)} /> Tap mode (tutor taps words) {!sttSupported() && <span className="text-rose-400">· mic needs Chrome/Edge</span>}</label>
        </Card>
        <Card className="space-y-2">
          <div className="text-xs uppercase text-slate-400">Session</div>
          <p className="text-sm text-slate-300">{isPractice ? "One text, unlimited takes, full diagnostics." : `${REPS} repetitions × ${ROUNDS} rounds. Rounds 5 and 10 are boss texts.`}</p>
          <p className="text-xs text-amber-200">{mode.blurb}</p>
          <div className="text-xs text-slate-400">Daily challenge: <b className="text-white">{daily.title}</b> ({daily.level})</div>
          <Btn size="sm" variant="dark" onClick={() => { setQueue([daily]); setRound(0); setRep(0); setAttempts([]); setAllAttempts([]); setPhase(exam ? "prep" : "count"); }}>Play daily</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setCustomOpen(true)}>📥 Load custom JSON</Btn>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-400 mb-2">Power-ups</div>
          <ul className="text-xs text-slate-300 space-y-1.5">
            <li>🔥 <b>Nitro</b> [SPACE] — 5s thrust, +8 pts. Earned every 8-word streak.</li>
            <li>🛡️ <b>Shield</b> — auto-forgives the next miss. Every 12-word streak.</li>
            <li>🎧 <b>Echo</b> [E] — model-reads the next 5 unread words.</li>
            <li>❄️ <b>Slow-mo</b> [Q] — ghost drops 30% for 6s.</li>
            <li>🏆 Beat the record ghost: +50 pts and your name on the board.</li>
          </ul>
        </Card>
      </div>
      <div className="flex justify-center"><Btn size="xl" variant="gold" onClick={() => { buildQueue(); startSession(); }}>▶ Launch {mode.name}</Btn></div>
      {customOpen && <Modal onClose={() => setCustomOpen(false)} wide>
        <h3 className="text-xl font-black text-white mb-2">Custom texts</h3>
        <p className="text-xs text-slate-400 mb-2">Copy the strict prompt, paste lesson material into your AI, paste JSON back.</p>
        <div className="flex gap-2 mb-2"><Btn size="sm" variant="gold" onClick={() => { navigator.clipboard.writeText(buildReadPrompt(s.level, "")); sfx.correct(); }}>📋 Copy AI prompt ({s.level})</Btn></div>
        <textarea value={customRaw} onChange={(e) => setCustomRaw(e.target.value)} className="w-full h-40 rounded-lg bg-slate-950 border border-white/10 p-3 font-mono text-xs text-emerald-300" placeholder='{"texts":[...]}' />
        {customErr && <div className="text-rose-400 text-sm">{customErr}</div>}
        <div className="flex justify-end gap-2 mt-2"><Btn variant="ghost" onClick={() => setCustomOpen(false)}>Cancel</Btn><Btn variant="success" onClick={loadCustom}>Load</Btn></div>
      </Modal>}
    </div>;
  }

  function stage() {
    const currentChunk = chunks.find((ch) => ch.includes(cursor)) || [];
    return <div className="max-w-6xl mx-auto p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
        <div className="flex items-center gap-3"><img src={me.avatar} className="h-9 w-9 rounded-full bg-white" /><span className="text-white font-bold">{me.name}</span><span className="text-slate-400">{mode.name}</span>{boss && <span className="text-rose-400 font-black animate-pulse">BOSS ROUND</span>}</div>
        <div className="flex gap-3 font-mono text-slate-200">{!isPractice && <span>R <b className="text-amber-300">{round + 1}/{queue.length}</b></span>}{!isPractice && <span>REP <b className="text-amber-300">{rep + 1}/{REPS}</b></span>}<span>⏱ {elapsed.toFixed(1)}s</span><span>WPM <b className="text-emerald-300">{wpmLive}</b></span><span>COMBO <b className="text-pink-300">x{streak}</b></span>{record && <span className="text-slate-400">🏆 {record.score} {record.holder}</span>}</div>
        <div className="flex gap-1.5 flex-wrap">
          <Btn size="sm" variant={nitro ? "gold" : "dark"} disabled={!nitro || nitroActive} onClick={fireNitro}>🔥 {nitro}</Btn>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-sky-300">🛡️ {shield}</span>
          <Btn size="sm" variant="dark" disabled={!echo} onClick={fireEcho}>🎧 {echo}</Btn>
          <Btn size="sm" variant="dark" disabled={!slow || slowActive} onClick={fireSlow}>❄️ {slow}</Btn>
          {phase === "read" && <Btn size="sm" variant="danger" onClick={() => finish(statesRef.current, heardAtRef.current, true)}>Stop</Btn>}
        </div>
      </div>
      <div className={cx("relative", nitroActive && "ring-4 ring-pink-400/70 rounded-2xl")}>
        <Scene theme={mode.theme} state={scene} avatar={me.avatar} />
        {slowActive && <div className="absolute inset-0 rounded-2xl pointer-events-none bg-sky-400/10" />}
      </div>
      <Card className="text-center py-4">
        <div className="text-[11px] text-slate-400 mb-2 flex justify-between gap-2 flex-wrap">
          <span>{text.title} · {text.level} · {text.focus.join(" · ")}{tapMode && <span className="text-amber-300"> · tap each word · <button onClick={markMissTap} className="underline">skip (miss)</button></span>}</span>
          <label className="flex items-center gap-1"><input type="checkbox" checked={focusPhrase} onChange={(e) => setFocusPhrase(e.target.checked)} /> phrase spotlight</label>
        </div>
        <p className="text-2xl md:text-[1.85rem] leading-relaxed font-semibold">
          {words.map((w, i) => {
            const on = focusPhrase && currentChunk.includes(i);
            const cls = states[i] === "ok" ? "text-emerald-400" : states[i] === "close" ? "text-amber-300" : states[i] === "missed" ? "text-rose-500 line-through decoration-2" : (i === cursor && phase === "read") ? "text-white bg-indigo-600/80 scale-110 shadow-[0_0_22px_rgba(99,102,241,0.95)]" : on ? "text-white" : "text-slate-500";
            return <span key={i} onClick={() => tapWord(i)} className={cx("inline-block mx-1 px-1 rounded transition-all duration-150 cursor-pointer", cls, modelWord === i && "underline decoration-amber-300")}>{w}</span>;
          })}
        </p>
        {!tapMode && phase === "read" && <div className="mt-2 text-[11px] text-slate-500 truncate">🎤 {heardRef.current.slice(-140) || "listening…"}</div>}
      </Card>
    </div>;
  }

  if (phase === "prep") return <div>
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/80 p-6">
      <div className="text-amber-300 tracking-[0.4em] uppercase text-sm mb-2">Preparation · do not speak</div>
      <div className={cx("font-mono text-8xl font-black", prepLeft <= 5 ? "text-rose-400 animate-pulse" : "text-white")}>{prepLeft}</div>
      <p className="max-w-3xl text-center text-2xl text-white mt-6 leading-relaxed">{text.text}</p>
      <div className="text-slate-400 text-sm mt-4">Mark stress. Chunk phrases. You read after the beep.</div>
      <Btn className="mt-6" variant="ghost" onClick={() => { sfx.beep(); setPhase("count"); }}>Skip prep</Btn>
    </div>
    {stage()}
  </div>;
  if (phase === "count") return <div><Countdown onDone={beginReading} label={exam ? "Recording starts" : mode.name} />{stage()}</div>;
  if (phase === "read") return stage();

  if (phase === "result" && last) return <div className="max-w-5xl mx-auto p-5 space-y-4">
    <Card className="text-center">
      {newRecord && <div className="text-3xl font-black text-amber-300 animate-bounce">🏆 NEW RECORD</div>}
      <div className="text-7xl font-black text-white" style={{ fontFamily: "Bebas Neue, sans-serif" }}>{last.score}<span className="text-2xl text-slate-400"> PTS</span></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {[["WPM", last.wpm, "text-emerald-300"], ["Accuracy", Math.round(last.accuracy * 100) + "%", "text-sky-300"], ["Fluency", Math.round(last.fluency * 100) + "%", "text-pink-300"], ["Time", last.seconds.toFixed(1) + "s", "text-amber-300"]].map(([l, v, c]) => <div key={l as string} className="rounded-xl bg-slate-800 p-3"><div className="text-xs text-slate-400">{l}</div><div className={cx("text-2xl font-black", c as string)}>{v}</div></div>)}
      </div>
      <div className="mt-3 text-sm text-slate-300">PTE estimate — Content <b>{pte(last.accuracy)}</b> · Oral fluency <b>{pte(last.fluency)}</b> · Pronunciation <b>{pte((last.ok + last.close * 0.5) / last.words)}</b></div>
      {clip && <div className="mt-3 flex items-center justify-center gap-3 text-sm"><span className="text-slate-400">Your take</span><audio src={clip} controls className="h-8" /></div>}
    </Card>
    <Card>
      <h3 className="font-bold text-white mb-2">Word-level feedback</h3>
      <div className="flex flex-wrap gap-2">{last.problem.length === 0 ? <span className="text-emerald-300">Clean take — every word recognised.</span> : last.problem.map((p, i) => <div key={i} className={cx("rounded-lg px-3 py-2 text-sm border", p.state === "missed" ? "bg-rose-900/40 border-rose-500/40" : "bg-amber-900/40 border-amber-500/40")}><div className="font-bold text-white">{p.word} <button onClick={() => speak(p.word, { voice: s.narratorVoice, rate: 0.8 })} className="text-xs text-indigo-300">🔊</button></div><div className="text-xs text-slate-300">{p.state === "missed" ? "not recognised / skipped" : `heard “${p.heard}”`}</div></div>)}</div>
    </Card>
    {!!dict.length && <Card>
      <h3 className="font-bold text-white mb-2">Dictionary · IPA · native audio <span className="text-xs font-normal text-slate-500">(dictionaryapi.dev)</span></h3>
      <div className="grid sm:grid-cols-2 gap-2">{dict.map((d) => <div key={d.word} className="rounded-lg bg-slate-800 p-3"><div className="flex justify-between items-baseline"><b className="text-white text-lg">{d.word}</b><span className="text-amber-300 font-mono">{d.ipa}</span></div>{d.defs[0] && <div className="text-xs text-slate-400 mt-1">{d.defs[0]}</div>}<div className="flex gap-2 mt-1">{d.audio && <button className="text-xs text-sky-300" onClick={() => playAudio(d.audio!)}>▶ native clip</button>}<button className="text-xs text-indigo-300" onClick={() => speak(d.word, { voice: s.narratorVoice, rate: 0.75 })}>🔊 model</button></div>{rhymeMap[d.word]?.length ? <div className="text-[11px] text-slate-500 mt-1">sounds like: {rhymeMap[d.word].slice(0, 5).join(", ")}</div> : null}</div>)}</div>
    </Card>}
    <div className="flex gap-3 justify-center flex-wrap">
      <Btn size="lg" variant="success" onClick={nextRep}>{isPractice ? "🔁 Another take" : rep + 1 < REPS ? `▶ Repetition ${rep + 2} / ${REPS}` : "📊 Text report"}</Btn>
      <Btn size="lg" variant="ghost" onClick={() => speakKaraoke(text.text, words, { voice: s.narratorVoice, rate: s.rate, onWord: setModelWord, onEnd: () => setModelWord(-1) })}>🔊 Model karaoke</Btn>
      {isPractice && <Btn size="lg" variant="ghost" onClick={() => setPhase("loadout")}>Change text</Btn>}
    </div>
  </div>;

  if (phase === "textReport") {
    const best = attempts.reduce((a, b) => (b.score > a.score ? b : a), attempts[0]);
    const agg = aggregate(attempts);
    const spark = attempts.map((a) => a.score);
    const maxS = Math.max(...spark, 1);
    return <div className="max-w-5xl mx-auto p-5 space-y-4">
      <h2 className="text-4xl font-black text-white" style={{ fontFamily: "Bebas Neue, sans-serif" }}>Text report — {text.title}</h2>
      <Card>
        <div className="flex items-end gap-1 h-24 mb-3">{spark.map((v, i) => <div key={i} className="flex-1 bg-amber-400/80 rounded-t" style={{ height: (v / maxS) * 100 + "%" }} title={`Rep ${i + 1}: ${v}`} />)}</div>
        <table className="w-full text-sm text-slate-200"><thead><tr className="text-slate-400 text-left"><th>Rep</th><th>Score</th><th>WPM</th><th>Acc</th><th>Fluency</th><th>Miss</th><th>Close</th></tr></thead>
          <tbody>{attempts.map((a, i) => <tr key={i} className={cx("border-t border-white/5", a === best && "text-amber-300 font-bold")}><td>{i + 1}</td><td>{a.score}</td><td>{a.wpm}</td><td>{Math.round(a.accuracy * 100)}%</td><td>{Math.round(a.fluency * 100)}%</td><td>{a.missed}</td><td>{a.close}</td></tr>)}</tbody></table>
        <div className="mt-3 text-sm text-slate-300">Rep 1 → {attempts.length}: <b className={attempts[attempts.length - 1].score >= attempts[0].score ? "text-emerald-300" : "text-rose-300"}>{attempts[attempts.length - 1].score - attempts[0].score >= 0 ? "+" : ""}{attempts[attempts.length - 1].score - attempts[0].score} pts</b> · WPM {attempts[0].wpm} → {attempts[attempts.length - 1].wpm}</div>
      </Card>
      <Card>
        <h3 className="font-bold text-white mb-2">Persistent problem words (missed in ≥2 reps)</h3>
        {agg.length === 0 ? <p className="text-emerald-300">No persistent problems. Raise the CEFR.</p> : <div className="grid md:grid-cols-2 gap-2">{agg.map((p) => <div key={p.word} className="rounded-lg bg-slate-800 p-3"><div className="flex justify-between"><b className="text-white text-lg">{p.word}</b><span className="text-xs text-rose-300">{p.count}/{attempts.length}</span></div><div className="text-xs text-slate-400">heard as: {p.heard.join(", ") || "—"}</div><div className="text-sm text-amber-200 mt-1">💡 {tipFor(p.word)}</div><button onClick={() => speak(p.word + ". " + p.word, { voice: s.narratorVoice, rate: 0.75 })} className="text-xs text-indigo-300 mt-1">🔊 model</button></div>)}</div>}
      </Card>
      <Card><h3 className="font-bold text-white mb-1">Reading behaviour</h3><ul className="text-sm text-slate-300 list-disc pl-5 space-y-1">
        <li>Omitted words: {attempts.reduce((n, a) => n + a.missed, 0)} — function words (a, the, of) still score in PTE content.</li>
        <li>Approximate words: {attempts.reduce((n, a) => n + a.close, 0)} — usually endings (-s, -ed) or vowel quality.</li>
        <li>Average pace {Math.round(attempts.reduce((n, a) => n + a.wpm, 0) / attempts.length)} WPM — target 120–160, not faster.</li>
        <li>Focus of this text: {text.focus.join(", ")}.</li>
      </ul></Card>
      <div className="flex gap-3 justify-center"><Btn size="lg" variant="success" onClick={nextRound}>{round + 1 < queue.length ? `▶ Round ${round + 2}` : "🏁 Session report"}</Btn><Btn size="lg" variant="ghost" onClick={() => { setRep(0); setAttempts([]); setPhase(exam ? "prep" : "count"); }}>🔁 Redo text</Btn></div>
    </div>;
  }

  if (phase === "session") {
    const all = allAttempts.flatMap((a) => a.results); const agg = aggregate(all, 2);
    const drill = "PRONUNCIATION DRILL\n" + agg.slice(0, 14).map((p) => `${p.word} — ${tipFor(p.word)}`).join("\n");
    return <div className="max-w-5xl mx-auto p-5 space-y-4">
      <h2 className="text-5xl font-black text-white" style={{ fontFamily: "Bebas Neue, sans-serif" }}>Session complete</h2>
      <Scoreboard />
      <div className="grid md:grid-cols-4 gap-3">{[["Rounds", allAttempts.length], ["Reads", all.length], ["Avg WPM", Math.round(all.reduce((n, a) => n + a.wpm, 0) / Math.max(1, all.length))], ["Avg acc", Math.round(all.reduce((n, a) => n + a.accuracy, 0) / Math.max(1, all.length) * 100) + "%"]].map(([l, v]) => <Card key={l as string} className="text-center"><div className="text-xs text-slate-400">{l}</div><div className="text-3xl font-black text-amber-300">{v}</div></Card>)}</div>
      <Card>
        <h3 className="font-bold text-white mb-2">What to teach next</h3>
        <div className="flex flex-wrap gap-2 mb-3">{agg.slice(0, 14).map((p) => <span key={p.word} className="rounded-full bg-rose-900/50 border border-rose-500/40 px-3 py-1 text-sm text-white">{p.word} <span className="text-xs text-rose-300">×{p.count}</span></span>)}</div>
        <p className="text-sm text-slate-400 mb-2">Weakest pattern: <b className="text-white">{weakest(agg)}</b></p>
        <Btn size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(drill); sfx.correct(); }}>📋 Copy ready-made drill</Btn>
      </Card>
      <div className="flex gap-3 justify-center"><Btn size="lg" onClick={() => { setPhase("loadout"); buildQueue(); }}>Play again</Btn><Btn size="lg" variant="ghost" onClick={onExit}>← Hub</Btn></div>
    </div>;
  }
  return null;
}

function aggregate(attempts: AttemptResult[], min = 2) {
  const m = new Map<string, { word: string; count: number; heard: string[] }>();
  attempts.forEach((a) => a.problem.forEach((p) => { const k = p.word.toLowerCase().replace(/[^a-z']/g, ""); const e = m.get(k) || { word: p.word, count: 0, heard: [] }; e.count++; if (p.heard && !e.heard.includes(p.heard)) e.heard.push(p.heard); m.set(k, e); }));
  return [...m.values()].filter((e) => e.count >= min).sort((a, b) => b.count - a.count);
}
function weakest(agg: { word: string }[]) {
  const buckets: Record<string, number> = { "th sounds": 0, "-ed endings": 0, "consonant clusters": 0, "final -s": 0, "multi-syllable stress": 0, "other": 0 };
  agg.forEach((p) => {
    const w = p.word.toLowerCase();
    if (/th/.test(w)) buckets["th sounds"]++;
    else if (/ed$/.test(w)) buckets["-ed endings"]++;
    else if (/^(str|spr|scr|spl|thr)/.test(w)) buckets["consonant clusters"]++;
    else if (/s$/.test(w)) buckets["final -s"]++;
    else if ((w.match(/[aeiouy]+/g) || []).length >= 3) buckets["multi-syllable stress"]++;
    else buckets.other++;
  });
  return Object.entries(buckets).sort((a, b) => b[1] - a[1])[0][0];
}
