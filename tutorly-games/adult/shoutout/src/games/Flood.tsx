import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Btn, Card, Chip, Meter } from '../components/ui';
import { audio } from '../lib/audio';
import { Listener, heard, recognitionSupported } from '../lib/speech';
import { useNarrator } from '../lib/useNarrator';
import { waveTuning } from '../lib/pacing';
import { cn } from '../utils/cn';
import type { EmojiCategory, EmojiItem, Team } from '../lib/types';

/** What one finished wave reports back to the session. */
export interface WaveStats {
  spawned: number;
  popped: number;
  landed: number;
  survived: boolean;
  /** Names of the words that reached the water, in the order they landed. */
  landedWords: string[];
  ms: number;
}

interface Drop extends EmojiItem {
  id: number;
  x: number;
  y: number;
  vy: number;
  rot: number;
  spin: number;
  size: number;
  state: 'fall' | 'landed' | 'popped';
  slot: number;
}

export default function Flood({
  wave,
  totalWaves,
  category,
  team,
  pace,
  cam,
  words,
  onWaveEnd,
  onNext,
  onFinish,
  onExit,
}: {
  wave: number;
  totalWaves: number;
  category: EmojiCategory;
  team: Team;
  pace: string;
  cam: boolean;
  /** The words in play this wave (a mixed session changes them every wave). */
  words: EmojiItem[];
  onWaveEnd: (stats: WaveStats) => void;
  onNext: () => void;
  onFinish: () => void;
  onExit: () => void;
}) {
  const { say } = useNarrator();
  const tune = useMemo(() => waveTuning(pace, wave), [pace, wave]);

  const [phase, setPhase] = useState<'ready' | 'count' | 'playing' | 'done'>('ready');
  const [count, setCount] = useState(3);
  const [survived, setSurvived] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [popped, setPopped] = useState(0);
  const [spawned, setSpawned] = useState(0);
  const [landed, setLanded] = useState(0);
  const [speedMult, setSpeedMult] = useState(1);
  const [typed, setTyped] = useState('');
  const [feed, setFeed] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const drops = useRef<Drop[]>([]);
  const video = useRef<HTMLVideoElement | null>(null);
  const raf = useRef(0);
  const lastSpawn = useRef(0);
  const lastT = useRef(0);
  const uid = useRef(1);
  const startedAt = useRef(0);
  const reported = useRef(false);

  const spawnedRef = useRef(0);
  const poppedRef = useRef(0);
  const landedRef = useRef(0);
  const landedWordsRef = useRef<string[]>([]);
  const slotRef = useRef(0);
  const speedRef = useRef(1);
  const comboRef = useRef(0);
  useEffect(() => { speedRef.current = speedMult; }, [speedMult]);

  /**
   * The combo lives in a ref and mirrors into state.
   *
   * A state updater is not a place for side effects (React calls it twice under
   * StrictMode), so the running best is derived here, in one place, from the
   * number we already know.
   */
  const comboUp = useCallback((n: number) => {
    comboRef.current = n;
    setCombo(n);
    setBest((b) => Math.max(b, n));
  }, []);

  /**
   * Report through a ref so the wave loop never restarts when the scoreboard
   * re-renders: the parent's callback identity must not be an animation
   * dependency — that is a dropped frame in the middle of a falling word.
   */
  const reportRef = useRef(onWaveEnd);
  useEffect(() => { reportRef.current = onWaveEnd; }, [onWaveEnd]);

  /** Fresh wave: no drops, counters at zero, and a countdown to the first word. */
  useEffect(() => {
    drops.current = [];
    spawnedRef.current = 0;
    poppedRef.current = 0;
    landedRef.current = 0;
    landedWordsRef.current = [];
    slotRef.current = 0;
    reported.current = false;
    comboUp(0);
    setSpawned(0);
    setPopped(0);
    setLanded(0);
    setBest(0);
    setFeed([]);
    setFlash(null);
    setTranscript('');
    setSpeedMult(1);
    setPhase('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wave, category.id]);

  // ---------- webcam ----------
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (cam) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user', width: 1280 } })
        .then((s) => { stream = s; if (video.current) { video.current.srcObject = s; void video.current.play(); } })
        .catch(() => { /* no camera, no problem — the water still rises */ });
    }
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [cam]);

  // ---------- pop logic ----------
  const popByWord = useCallback(
    (text: string) => {
      if (!text.trim() || phase !== 'playing') return;
      const live = drops.current.filter((d) => d.state !== 'popped');
      const hits = live.filter((d) => heard(text, [d.name, ...d.alts]));
      if (hits.length) {
        hits.forEach((d, i) => {
          d.state = 'popped';
          window.setTimeout(() => audio.pop(1 + i * 0.12), i * 55);
        });
        landedRef.current = Math.max(0, landedRef.current - hits.filter((h) => h.slot >= 0).length);
        poppedRef.current += hits.length;
        setPopped(poppedRef.current);
        setLanded(landedRef.current);
        comboUp(comboRef.current + hits.length);
        setFeed((f) => [hits[0].name, ...f].slice(0, 6));
        setFlash(`💥 ${hits[0].name.toUpperCase()} ×${hits.length}`);
        window.setTimeout(() => setFlash(null), 900);
        window.setTimeout(() => { drops.current = drops.current.filter((d) => d.state !== 'popped'); }, 420);
      } else {
        const tokens = text.trim().split(/\s+/).filter((t) => t.length > 2);
        if (tokens.length) {
          comboUp(0);
          setSpeedMult((s) => Math.min(3.2, s + 0.14));
          audio.wrong();
          setFlash('⚠️ NOT IN PLAY — IT SPEEDS UP');
          window.setTimeout(() => setFlash(null), 700);
        }
      }
    },
    [phase, comboUp],
  );

  // ---------- speech ----------
  useEffect(() => {
    if (!listening) return;
    const l = new Listener();
    let lastHandled = '';
    l.onResult = ({ transcript: t, isFinal }) => {
      setTranscript(t.slice(-80));
      const key = t.trim().toLowerCase();
      if (key === lastHandled) return;
      lastHandled = key;
      popByWord(t);
      if (isFinal) lastHandled = '';
    };
    l.start();
    return () => l.stop();
  }, [listening, popByWord]);

  const endWave = useCallback(
    (didSurvive: boolean) => {
      cancelAnimationFrame(raf.current);
      setSurvived(didSurvive);
      setPhase('done');
      if (didSurvive) audio.cheer();
      else audio.drown();
      if (!reported.current) {
        reported.current = true;
        reportRef.current({
          spawned: spawnedRef.current,
          popped: poppedRef.current,
          landed: landedRef.current,
          survived: didSurvive,
          landedWords: landedWordsRef.current,
          ms: Date.now() - startedAt.current,
        });
      }
    },
    [],
  );

  // ---------- loop ----------
  useEffect(() => {
    if (phase !== 'playing') return;
    lastT.current = performance.now();
    lastSpawn.current = 0;

    // A deck with nothing in it cannot flood a room — end the wave instead of idling.
    if (!words.length) { endWave(true); return; }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastT.current) / 1000);
      lastT.current = now;

      if (spawnedRef.current < tune.quota && now - lastSpawn.current > tune.gap) {
        lastSpawn.current = now;
        const item = words[Math.floor(Math.random() * words.length)];
        if (item) {
          drops.current.push({
            ...item,
            id: uid.current++,
            x: 6 + Math.random() * 84,
            y: -10,
            vy: tune.speed * (0.8 + Math.random() * 0.5),
            rot: (Math.random() - 0.5) * 40,
            spin: (Math.random() - 0.5) * 30,
            size: 54 + Math.random() * 34,
            state: 'fall',
            slot: -1,
          });
          spawnedRef.current += 1;
          setSpawned(spawnedRef.current);
        }
      }

      let landedNow = 0;
      drops.current.forEach((d) => {
        if (d.state === 'fall') {
          d.y += d.vy * speedRef.current * dt * 10;
          d.rot += d.spin * dt;
          if (d.y >= 84) {
            d.state = 'landed';
            d.y = 84;
            d.slot = slotRef.current++;
            landedRef.current += 1;
            landedWordsRef.current.push(d.name);
            landedNow++;
            audio.swell(landedRef.current);
          }
        }
      });
      if (landedNow) setLanded(landedRef.current);

      audio.setIntensity(Math.min(1, 0.35 + landedRef.current / tune.capacity));
      setTick((t) => t + 1);

      if (landedRef.current >= tune.capacity) { endWave(false); return; }
      if (spawnedRef.current >= tune.quota && !drops.current.some((d) => d.state === 'fall')) { endWave(true); return; }
      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, tune, words, endWave]);

  /** 3-2-1 so the class is looking at the screen before the first word falls. */
  useEffect(() => {
    if (phase !== 'count') return;
    if (count <= 0) {
      startedAt.current = Date.now();
      setPhase('playing');
      return;
    }
    audio.tick();
    const t = window.setTimeout(() => setCount((c) => c - 1), 700);
    return () => window.clearTimeout(t);
  }, [phase, count]);

  const start = useCallback(() => {
    if (phase !== 'ready') return;
    drops.current = [];
    spawnedRef.current = 0;
    poppedRef.current = 0;
    landedRef.current = 0;
    landedWordsRef.current = [];
    slotRef.current = 0;
    reported.current = false;
    comboUp(0);
    setSpawned(0);
    setPopped(0);
    setLanded(0);
    setBest(0);
    setFeed([]);
    setCount(3);
    setPhase('count');
    audio.play('flood', 0.45);
    audio.whoosh();
    if (!listening && recognitionSupported()) setListening(true);
    say(`Wave ${wave}. Category: ${category.name}. Shout what you see!`);
  }, [phase, say, wave, category.name, listening]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'ready' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); start(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, start]);

  const fill = Math.min(1, landed / tune.capacity);
  const rate = spawned ? popped / spawned : 0;
  const progress = spawned / tune.quota;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-rose-50 via-white to-sky-50">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-rose-600 text-3xl text-white shadow-lg">{category.icon}</div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">
              Wave {wave} of {totalWaves}
              <span className="ml-3 rounded-xl px-3 py-1 text-xl" style={{ background: team.color + '22', color: team.color }}>
                {team.emoji} {team.name}
              </span>
            </h2>
            <p className="text-base font-semibold text-slate-500">
              {tune.quota} words · {category.name} · {tune.label} pace · pop 90% and the wave is saved
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn size="sm" variant={listening ? 'ok' : 'ghost'} disabled={!recognitionSupported()} onClick={() => setListening((l) => !l)}>🎙 Mic</Btn>
          <Btn size="sm" onClick={() => say(`${category.name}. Words: ${words.slice(0, 6).map((w) => w.name).join(', ')}.`)}>🔊 Read the words</Btn>
          <Btn size="sm" onClick={onExit}>✕ Back to the room</Btn>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* arena */}
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl border-4 border-slate-900 bg-slate-900 shadow-2xl">
          {cam ? (
            <video ref={video} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,#1e293b,#020617)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-sky-900/40" />
          {fill > 0.65 && phase === 'playing' && <div className="animate-danger pointer-events-none absolute inset-0" />}

          <div className="absolute left-0 right-0 top-0 flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 px-5 py-3 backdrop-blur">
            <div className="text-3xl font-black text-white">{category.icon} {category.name}</div>
            <div className="flex items-center gap-3 text-white">
              <span className="text-xl font-black tabular-nums">Popped {popped}/{spawned}</span>
              <span className={cn('rounded-xl px-3 py-1 text-xl font-black tabular-nums', rate >= 0.9 ? 'bg-emerald-500' : 'bg-white/20')}>{Math.round(rate * 100)}%</span>
              {best > 2 && <span className="animate-pulse rounded-xl bg-amber-400 px-3 py-1 text-xl font-black text-slate-900">🔥 BEST ×{best}</span>}
              <span className="rounded-xl bg-rose-500/80 px-3 py-1 text-lg font-black">SPEED ×{speedMult.toFixed(2)}</span>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-500/70 to-sky-300/30 transition-[height] duration-300"
            style={{ height: `${fill * 82}%` }} />

          {drops.current.map((d) => (
            <button
              key={d.id}
              onClick={() => popByWord(d.name)}
              className={cn('absolute select-none', d.state === 'popped' && 'animate-pop')}
              style={{
                left: `${d.x}%`,
                top: d.state === 'landed' ? `${80 - Math.floor(d.slot / 6) * 9}%` : `${d.y}%`,
                fontSize: d.size,
                transform: `rotate(${d.rot}deg)`,
                filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.45))',
                textShadow: '0 2px 0 rgba(255,255,255,.35)',
              }}
            >
              {d.emoji}
            </button>
          ))}

          {flash && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className={cn('rounded-3xl px-10 py-6 text-5xl font-black text-white shadow-2xl',
                flash.startsWith('⚠️') ? 'animate-shake bg-rose-700/90' : 'bg-slate-900/80')}>
                {flash}
              </div>
            </div>
          )}

          {phase === 'ready' && (
            <div className="absolute inset-0 grid place-items-center bg-slate-900/60 backdrop-blur-sm">
              <div className="space-y-4 text-center">
                <div className="text-6xl">{category.icon}</div>
                <h3 className="text-4xl font-black text-white">
                  Wave {wave} — {team.emoji} {team.name}
                </h3>
                <p className="mx-auto max-w-xl text-xl font-semibold text-white/80">
                  {tune.quota} words fall into your camera. Shout the name and every copy pops at once.{' '}
                  {tune.capacity} landed words and the room floods.
                </p>
                <Btn variant="danger" size="xl" onClick={start}>🌊 Release the flood</Btn>
                <p className="text-base font-bold text-white/60">or press Space — the tutors' queue stands behind you</p>
              </div>
            </div>
          )}

          {phase === 'count' && (
            <div className="absolute inset-0 grid place-items-center bg-slate-900/70 backdrop-blur">
              <div className="text-center">
                <div className="animate-float-in text-[10rem] font-black leading-none text-white">{count || '🎙'}</div>
                <p className="text-2xl font-black text-amber-300">{count ? 'Eyes on the screen…' : 'SHOUT!'}</p>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="absolute inset-0 grid place-items-center bg-slate-900/70 backdrop-blur">
              <div className="space-y-3 text-center">
                <div className="text-7xl">{survived ? (rate >= 0.9 ? '🏆' : '😮‍💨') : '🌊'}</div>
                <h3 className="text-5xl font-black text-white">
                  {survived ? (rate >= 0.9 ? 'SAVED!' : 'Survived — just') : 'DROWNED'}
                </h3>
                <p className="text-2xl font-bold text-white/80">
                  You cleared {Math.round(rate * 100)}% of {spawned} words.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Btn variant="warm" size="lg" onClick={() => setPhase('ready')}>↺ Again</Btn>
                  {wave < totalWaves
                    ? <Btn variant="ok" size="lg" onClick={onNext}>▶ Wave {wave + 1}</Btn>
                    : <Btn variant="ok" size="lg" onClick={onFinish}>🏁 Final scoreboard</Btn>}
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3">
            <div className="flex-1 truncate rounded-2xl bg-slate-900/75 px-4 py-2 text-lg font-bold text-white">
              🎙 {listening ? transcript || 'Listening…' : 'Mic off — use the type box'}
            </div>
          </div>
        </div>

        {/* side */}
        <div className="space-y-3">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">🌊 Flood level</h3>
              <Chip tone={fill > 0.7 ? 'rose' : 'sky'}>{landed}/{tune.capacity}</Chip>
            </div>
            <Meter value={fill} tone={fill > 0.7 ? '#e11d48' : '#0284c7'} height={18} />
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-lg font-black text-slate-900">📦 Words sent</h3>
              <Chip tone="violet">{spawned}/{tune.quota}</Chip>
            </div>
            <Meter value={progress} tone="#7c3aed" height={12} />
            <p className="text-xs font-semibold text-slate-500">
              Landed words keep floating — shout them again and they still pop, draining the water.
            </p>
          </Card>

          <Card className="space-y-2">
            <h3 className="text-lg font-black text-slate-900">⌨️ No mic? Type it</h3>
            <form onSubmit={(e) => { e.preventDefault(); popByWord(typed); setTyped(''); }} className="flex gap-2">
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="say the word…"
                className="w-full rounded-xl border-2 border-slate-300 px-3 py-2 font-bold" />
              <Btn variant="primary" type="submit">Pop</Btn>
            </form>
          </Card>

          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">🎯 Words in play</h3>
              {combo > 1 && <Chip tone="amber">combo ×{combo}</Chip>}
            </div>
            <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
              {words.map((i) => <Chip key={i.name} tone="slate">{i.emoji} {i.name}</Chip>)}
            </div>
          </Card>

          <Card className="space-y-2">
            <h3 className="text-lg font-black text-slate-900">📣 Just popped</h3>
            <div className="flex min-h-[2.5rem] flex-wrap gap-1.5">
              {feed.length
                ? feed.map((w, i) => <Chip key={`${w}-${i}`} tone={i === 0 ? 'emerald' : 'slate'}>{w}</Chip>)
                : <p className="text-sm font-semibold text-slate-500">The first word the class pops shows up here.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
