import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Btn, Card, Chip, Meter } from '../components/ui';
import { useGame } from '../store/GameContext';
import { useNarrator } from '../lib/useNarrator';
import { audio } from '../lib/audio';
import { classify, sketchSense, type Pt, type Sig } from '../lib/geometry';
import { analyse as analyseFrame, grab, mask as inkMask, paintMask } from '../lib/vision';
import { drawFigure, newFigure, POSES, clonePose, type Figure, type JointName } from './figure';
import { Listener, heard, recognitionSupported } from '../lib/speech';
import { cn } from '../utils/cn';

const W = 1600, H = 900;
const TOTAL_ROUNDS = 10;

type Tool = 'pen' | 'marker' | 'shape' | 'eraser' | 'stamp';
type Act =
  | { kind: 'stroke'; tool: 'pen' | 'marker' | 'eraser'; color: string; width: number; pts: Pt[] }
  | { kind: 'shape'; shape: 'line' | 'rect' | 'circle' | 'triangle'; color: string; width: number; a: Pt; b: Pt }
  | { kind: 'stamp'; emoji: string; x: number; y: number; size: number; rot: number }
  | { kind: 'figure'; fig: Figure };

const COLORS = ['#0f172a', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#78716c'];
const STAMPS = ['⭐', '❤️', '🔥', '💧', '☀️', '🌧️', '🌳', '🏠', '🚗', '🐶', '🐱', '🍎', '⚽', '🎵', '💡', '❓', '❗', '✅', '❌', '➡️', '⬅️', '⏰', '💰', '🎁'];

export default function Pictionary() {
  const { pack, teams, activeTeam, setActiveTeam, award, scores, pushLog } = useGame();
  const { say } = useNarrator();

  const base = useRef<HTMLCanvasElement | null>(null);
  const live = useRef<HTMLCanvasElement | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);

  const [acts, setActs] = useState<Act[]>([]);
  const [redo, setRedo] = useState<Act[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#0f172a');
  const [width, setWidth] = useState(8);
  const [emoji, setEmoji] = useState('⭐');
  const [grid, setGrid] = useState(true);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [selFig, setSelFig] = useState<string | null>(null);
  const [cam, setCam] = useState(false);
  const [ai, setAi] = useState(false);
  const [guesses, setGuesses] = useState<{ word: string; score: number; hint: string }[]>([]);
  const [vision, setVision] = useState<{ coverage: number; blobs: number } | null>(null);
  const snap = useRef<HTMLCanvasElement | null>(null);
  const maskCvs = useRef<HTMLCanvasElement | null>(null);
  const bg = useRef<Uint8ClampedArray | null>(null);

  const drawing = useRef<{ pts: Pt[]; active: boolean }>({ pts: [], active: false });
  const dragJoint = useRef<{ fig: string; joint: JointName | 'body' } | null>(null);

  // -------- word deck / rounds --------
  const deck = pack.pictionary;
  const [cat, setCat] = useState('All');
  const cats = useMemo(() => ['All', ...Array.from(new Set(deck.map((d) => d.category)))], [deck]);
  const filtered = useMemo(() => (cat === 'All' ? deck : deck.filter((d) => d.category === cat)), [deck, cat]);
  const [round, setRound] = useState(1);
  const [wordIdx, setWordIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [left, setLeft] = useState(90);
  const [running, setRunning] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const startedAt = useRef(Date.now());
  const word = filtered[wordIdx % Math.max(1, filtered.length)];

  useEffect(() => { audio.play('draw', 0.5); }, []);

  // ---------------- canvas drawing ----------------
  const paintAct = useCallback((ctx: CanvasRenderingContext2D, a: Act) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (a.kind === 'stroke') {
      if (a.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = a.width * 3.2;
      } else if (a.tool === 'marker') {
        ctx.globalAlpha = 0.34;
        ctx.strokeStyle = a.color;
        ctx.lineWidth = a.width * 3.4;
      } else {
        ctx.strokeStyle = a.color;
        ctx.lineWidth = a.width;
      }
      ctx.beginPath();
      const p = a.pts;
      if (p.length === 1) { ctx.arc(p[0].x, p[0].y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle as string; ctx.fill(); }
      else {
        ctx.moveTo(p[0].x, p[0].y);
        for (let i = 1; i < p.length - 1; i++) {
          const mx = (p[i].x + p[i + 1].x) / 2, my = (p[i].y + p[i + 1].y) / 2;
          ctx.quadraticCurveTo(p[i].x, p[i].y, mx, my);
        }
        ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
        ctx.stroke();
      }
    } else if (a.kind === 'shape') {
      ctx.strokeStyle = a.color;
      ctx.lineWidth = a.width;
      const { a: s, b: e } = a;
      ctx.beginPath();
      if (a.shape === 'line') { ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); }
      else if (a.shape === 'rect') ctx.rect(Math.min(s.x, e.x), Math.min(s.y, e.y), Math.abs(e.x - s.x), Math.abs(e.y - s.y));
      else if (a.shape === 'circle') ctx.ellipse((s.x + e.x) / 2, (s.y + e.y) / 2, Math.abs(e.x - s.x) / 2, Math.abs(e.y - s.y) / 2, 0, 0, Math.PI * 2);
      else { ctx.moveTo((s.x + e.x) / 2, Math.min(s.y, e.y)); ctx.lineTo(Math.min(s.x, e.x), Math.max(s.y, e.y)); ctx.lineTo(Math.max(s.x, e.x), Math.max(s.y, e.y)); ctx.closePath(); }
      ctx.stroke();
    } else if (a.kind === 'stamp') {
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.font = `${a.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.emoji, 0, 0);
    } else {
      drawFigure(ctx, a.fig);
    }
    ctx.restore();
  }, []);

  const repaint = useCallback(() => {
    const c = base.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    if (!cam) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); }
    if (grid && !cam) {
      ctx.strokeStyle = '#eef2ff';
      ctx.lineWidth = 2;
      for (let x = 0; x <= W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }
    acts.forEach((a) => paintAct(ctx, a));
  }, [acts, grid, cam, paintAct]);

  useEffect(() => { repaint(); }, [repaint]);

  const toLocal = (e: React.PointerEvent): Pt => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const onDown = (e: React.PointerEvent) => {
    if (dragJoint.current) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toLocal(e);
    if (tool === 'stamp') {
      audio.stamp();
      setActs((a) => [...a, { kind: 'stamp', emoji, x: p.x, y: p.y, size: width * 9 + 40, rot: (Math.random() - 0.5) * 0.4 }]);
      return;
    }
    drawing.current = { pts: [p], active: true };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current.active) return;
    const p = toLocal(e);
    drawing.current.pts.push(p);
    const lc = live.current;
    if (!lc) return;
    const ctx = lc.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    const pts = drawing.current.pts;
    if (tool === 'eraser') {
      ctx.save();
      ctx.strokeStyle = 'rgba(244,63,94,0.35)';
      ctx.lineWidth = width * 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.forEach((q) => ctx.lineTo(q.x, q.y));
      ctx.stroke();
      ctx.restore();
    } else {
      paintAct(ctx, { kind: 'stroke', tool: tool === 'marker' ? 'marker' : 'pen', color: tool === 'shape' ? '#94a3b8' : color, width, pts });
    }
  };

  const onUp = () => {
    if (!drawing.current.active) return;
    const pts = drawing.current.pts;
    drawing.current = { pts: [], active: false };
    live.current?.getContext('2d')!.clearRect(0, 0, W, H);
    if (pts.length < 2) {
      if (pts.length === 1 && tool !== 'shape') setActs((a) => [...a, { kind: 'stroke', tool: tool === 'eraser' ? 'eraser' : tool === 'marker' ? 'marker' : 'pen', color, width, pts }]);
      return;
    }
    setRedo([]);
    if (tool === 'shape') {
      const res = classify(pts);
      const b = res.box;
      const shape = res.kind === 'circle' ? 'circle' : res.kind === 'rect' ? 'rect' : res.kind === 'triangle' ? 'triangle' : 'line';
      audio.reveal();
      const a: Pt = shape === 'line' ? pts[0] : { x: b.x0, y: b.y0 };
      const bb: Pt = shape === 'line' ? pts[pts.length - 1] : { x: b.x1, y: b.y1 };
      setActs((prev) => [...prev, { kind: 'shape', shape, color, width, a, b: bb }]);
    } else {
      setActs((prev) => [...prev, { kind: 'stroke', tool: tool === 'eraser' ? 'eraser' : tool === 'marker' ? 'marker' : 'pen', color, width, pts }]);
    }
  };

  // ---------------- figures ----------------
  const addFigure = (g: 'm' | 'f') => {
    setFigures((f) => [...f, newFigure(300 + f.length * 220, 520, g)]);
    audio.stamp();
  };
  const patchFig = (id: string, patch: Partial<Figure>) => setFigures((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const jointDown = (id: string, j: JointName | 'body') => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragJoint.current = { fig: id, joint: j };
    setSelFig(id);
  };
  const svgMove = (e: React.PointerEvent) => {
    const d = dragJoint.current;
    if (!d) return;
    const r = wrap.current!.getBoundingClientRect();
    const gx = ((e.clientX - r.left) / r.width) * W;
    const gy = ((e.clientY - r.top) / r.height) * H;
    setFigures((fs) =>
      fs.map((f) => {
        if (f.id !== d.fig) return f;
        if (d.joint === 'body') return { ...f, x: gx, y: gy };
        const lx = ((gx - f.x) / f.scale) * (f.flip ? -1 : 1);
        const ly = (gy - f.y) / f.scale;
        return { ...f, pose: { ...f.pose, [d.joint]: { x: lx, y: ly } } };
      }),
    );
  };
  const svgUp = () => { dragJoint.current = null; };

  const stampFigure = (id: string) => {
    const f = figures.find((x) => x.id === id);
    if (!f) return;
    setActs((a) => [...a, { kind: 'figure', fig: JSON.parse(JSON.stringify(f)) }]);
    setFigures((fs) => fs.filter((x) => x.id !== id));
    audio.stamp();
  };

  // ---------------- Sketch-Sense AI ----------------
  const think = useCallback(() => {
    const counts: Sig = { circle: 0, rect: 0, triangle: 0, line: 0, curve: 0, figure: 0 };
    acts.forEach((a) => {
      if (a.kind === 'stroke' && a.tool !== 'eraser' && a.pts.length > 3) {
        const k = classify(a.pts).kind;
        counts[k] += 1;
      } else if (a.kind === 'shape') {
        counts[a.shape === 'circle' ? 'circle' : a.shape === 'rect' ? 'rect' : a.shape === 'triangle' ? 'triangle' : 'line'] += 1;
      } else if (a.kind === 'figure') {
        counts.figure = (counts.figure ?? 0) + 1;
        counts.line += 4;
        counts.circle += 1;
      }
    });
    figures.forEach(() => { counts.figure = (counts.figure ?? 0) + 1; counts.line += 4; counts.circle += 1; });

    // --- real computer vision on the webcam feed (background subtraction) ---
    if (cam && bg.current && video.current && snap.current) {
      const cur = grab(video.current, snap.current);
      if (cur) {
        const m = inkMask(cur, bg.current, snap.current.width, snap.current.height);
        const st = analyseFrame(m, snap.current.width, snap.current.height);
        if (maskCvs.current) paintMask(m, snap.current.width, snap.current.height, maskCvs.current);
        setVision({ coverage: st.coverage, blobs: st.blobs.length });
        (['circle', 'rect', 'triangle', 'line', 'curve'] as const).forEach((k) => {
          counts[k] += st.sig[k] ?? 0;
        });
      }
    }

    setGuesses(sketchSense(counts, filtered.map((f) => f.word)));
  }, [acts, figures, filtered, cam]);

  useEffect(() => {
    if (!ai) return;
    const t = setInterval(think, 1200);
    think();
    return () => clearInterval(t);
  }, [ai, think]);

  const calibrate = () => {
    if (!video.current || !snap.current) return;
    const d = grab(video.current, snap.current);
    if (d) { bg.current = new Uint8ClampedArray(d); audio.reveal(); }
  };

  // ---------------- webcam ----------------
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (cam) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'user', width: 1280 } })
        .then((s) => {
          stream = s;
          if (video.current) { video.current.srcObject = s; void video.current.play(); }
        })
        .catch(() => setCam(false));
    }
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [cam]);

  // ---------------- speech guessing ----------------
  const listener = useRef<Listener | null>(null);
  useEffect(() => {
    if (!listening) { listener.current?.stop(); listener.current = null; return; }
    const l = new Listener();
    l.onResult = ({ transcript: t }) => {
      setTranscript(t.slice(-90));
      if (word && heard(t, [word.word, ...word.word.split(' ').filter((w) => w.length > 4)])) {
        gotIt(true);
      }
    };
    l.start();
    listener.current = l;
    return () => l.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, word?.word]);

  // ---------------- timer ----------------
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => {
      if (l <= 1) { audio.buzz(); setRunning(false); return 0; }
      if (l <= 5) audio.tick();
      return l - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [running]);

  const clearBoard = () => { setActs([]); setRedo([]); setFigures([]); audio.whoosh(); };

  const gotIt = (ok: boolean) => {
    const ms = Date.now() - startedAt.current;
    const pts = ok ? 100 + Math.max(0, left) * 2 : 0;
    if (ok) { audio.correct(round); award(activeTeam, pts); } else audio.wrong();
    pushLog({
      game: 'pictionary', round, qid: `pic-${word?.word ?? round}`, category: word?.category ?? 'Pictionary',
      prompt: `Draw & describe: ${word?.word ?? ''}`, value: 100, teamId: activeTeam, playerId: null,
      correct: ok, ms, points: pts, grammarPoint: 'Describing actions & objects', skill: 'Speaking',
      subSkill: word?.category ?? 'Visual vocabulary', level: word?.level ?? 'B1',
    });
    nextWord();
  };

  const nextWord = () => {
    setWordIdx((i) => i + 1);
    setRevealed(false);
    setLeft(90);
    setRunning(false);
    setTranscript('');
    startedAt.current = Date.now();
    setRound((r) => Math.min(TOTAL_ROUNDS, r + 1));
    clearBoard();
  };

  const savePng = () => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    if (base.current) ctx.drawImage(base.current, 0, 0);
    figures.forEach((f) => drawFigure(ctx, f));
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'talkarena-board.png';
    a.click();
  };

  const toolBtn = (t: Tool, icon: string, label: string) => (
    <button
      key={t}
      onClick={() => { setTool(t); audio.tick(); }}
      className={cn('flex w-20 flex-col items-center gap-1 rounded-2xl border-2 p-2 text-xs font-black transition',
        tool === t ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300')}
    >
      <span className="text-2xl">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* word bar */}
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-amber-50 via-white to-indigo-50">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-500 text-3xl text-white shadow-lg">🎨</div>
          <div>
            <div className="text-sm font-black uppercase tracking-wide text-slate-500">Secret word · round {round}/{TOTAL_ROUNDS}</div>
            <div className="flex items-center gap-3">
              <div className={cn('rounded-xl px-4 py-1 text-3xl font-black tracking-tight', revealed ? 'bg-white text-slate-900' : 'select-none bg-slate-900 text-slate-900')}>
                {revealed ? word?.word : '••••••••••'}
              </div>
              <Btn size="sm" onClick={() => { setRevealed((r) => !r); audio.reveal(); }}>{revealed ? '🙈 Hide' : '👁 Reveal'}</Btn>
              <Btn size="sm" onClick={() => { void navigator.clipboard.writeText(word?.word ?? ''); }}>📋 Copy</Btn>
            </div>
            <div className="mt-1 text-base font-semibold text-slate-600">💡 {word?.hint}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={cat} onChange={(e) => { setCat(e.target.value); setWordIdx(0); }} className="rounded-xl border-2 border-slate-300 px-3 py-2 font-bold">
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className={cn('rounded-2xl px-4 py-2 text-3xl font-black tabular-nums', left <= 10 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700')}>{left}s</div>
          <Btn variant={running ? 'ghost' : 'primary'} onClick={() => { setRunning((r) => !r); audio.play('draw', 0.8); }}>{running ? '⏸' : '▶ Start'}</Btn>
          <Btn variant="ok" onClick={() => gotIt(true)}>✅ Guessed!</Btn>
          <Btn variant="danger" onClick={() => gotIt(false)}>⏭ Pass</Btn>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {/* toolbar */}
          <Card className="flex flex-wrap items-center gap-3 p-3">
            {toolBtn('pen', '✏️', 'Pen')}
            {toolBtn('marker', '🖍️', 'Marker')}
            {toolBtn('shape', '✨', 'Magic')}
            {toolBtn('eraser', '🧽', 'Eraser')}
            {toolBtn('stamp', '🩷', 'Stamp')}
            <div className="mx-1 h-12 w-px bg-slate-200" />
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button key={c} onClick={() => { setColor(c); audio.tick(); }}
                  className={cn('h-9 w-9 rounded-full border-4 transition', color === c ? 'scale-110 border-slate-900' : 'border-white shadow')}
                  style={{ background: c }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-500">Size</span>
              <input type="range" min={2} max={40} value={width} onChange={(e) => setWidth(+e.target.value)} className="w-28 accent-indigo-600" />
              <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100">
                <span className="rounded-full bg-slate-900" style={{ width: Math.min(28, width), height: Math.min(28, width) }} />
              </span>
            </div>
            <div className="mx-1 h-12 w-px bg-slate-200" />
            <Btn size="sm" disabled={!acts.length} onClick={() => setActs((a) => { if (!a.length) return a; setRedo((r) => [a[a.length - 1], ...r]); return a.slice(0, -1); })}>↶ Undo</Btn>
            <Btn size="sm" disabled={!redo.length} onClick={() => setRedo((r) => { if (!r.length) return r; setActs((a) => [...a, r[0]]); return r.slice(1); })}>↷ Redo</Btn>
            <Btn size="sm" variant="danger" onClick={clearBoard}>🗑 Clear</Btn>
            <Btn size="sm" onClick={() => setGrid((g) => !g)}>{grid ? '▦ Grid on' : '▢ Grid off'}</Btn>
            <Btn size="sm" onClick={savePng}>💾 Save PNG</Btn>
            <Btn size="sm" variant={cam ? 'ok' : 'ghost'} onClick={() => setCam((c) => !c)}>📷 Webcam</Btn>
            <Btn size="sm" variant={ai ? 'primary' : 'ghost'} onClick={() => { setAi((a) => !a); audio.whoosh(); }}>🤖 Sketch-Sense AI</Btn>
            <Btn size="sm" variant={listening ? 'ok' : 'ghost'} disabled={!recognitionSupported()} onClick={() => setListening((l) => !l)}>
              🎙 {listening ? 'Listening…' : 'Shout guesses'}
            </Btn>
          </Card>

          {tool === 'stamp' && (
            <Card className="flex flex-wrap gap-2 p-3">
              {STAMPS.map((s) => (
                <button key={s} onClick={() => { setEmoji(s); audio.tick(); }}
                  className={cn('h-12 w-12 rounded-xl border-2 text-2xl transition', emoji === s ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50')}>{s}</button>
              ))}
            </Card>
          )}

          {/* board */}
          <div ref={wrap} className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border-4 border-slate-300 bg-white shadow-xl">
            {cam && <video ref={video} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />}
            <canvas ref={base} width={W} height={H} className="absolute inset-0 h-full w-full" />
            <canvas
              ref={live}
              width={W}
              height={H}
              className="absolute inset-0 h-full w-full touch-none"
              style={{ cursor: tool === 'eraser' ? 'cell' : tool === 'stamp' ? 'copy' : 'crosshair' }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
            />
            <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" onPointerMove={svgMove} onPointerUp={svgUp}>
              {figures.map((f) => (
                <FigureSvg key={f.id} f={f} selected={selFig === f.id} onJoint={jointDown} />
              ))}
            </svg>
            {listening && (
              <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-slate-900/80 px-4 py-2 text-lg font-bold text-white">
                🎙 {transcript || 'Listening for your guesses…'}
              </div>
            )}
            <canvas ref={snap} width={160} height={90} className="hidden" />
          </div>
        </div>

        {/* side panel */}
        <div className="space-y-3">
          <Card className="space-y-3">
            <h3 className="text-xl font-black text-slate-900">🧍 Pose figure</h3>
            <div className="flex gap-2">
              <Btn size="sm" variant="primary" onClick={() => addFigure('m')}>＋ Male</Btn>
              <Btn size="sm" variant="danger" onClick={() => addFigure('f')}>＋ Female</Btn>
            </div>
            {figures.length === 0 && <p className="text-sm font-semibold text-slate-500">Add a figure, then drag any joint — head, hands, knees, feet — to build the exact action you are teaching.</p>}
            {figures.map((f) => (
              <div key={f.id} className={cn('space-y-2 rounded-2xl border-2 p-3', selFig === f.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200')}>
                <div className="flex items-center justify-between">
                  <Chip tone={f.gender === 'f' ? 'rose' : 'sky'}>{f.gender === 'f' ? '♀ female' : '♂ male'}</Chip>
                  <div className="flex gap-1">
                    <Btn size="sm" onClick={() => patchFig(f.id, { gender: f.gender === 'm' ? 'f' : 'm', color: f.gender === 'm' ? '#be185d' : '#1d4ed8' })}>⇄ Sex</Btn>
                    <Btn size="sm" onClick={() => patchFig(f.id, { flip: !f.flip })}>🔄 Flip</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setFigures((fs) => fs.filter((x) => x.id !== f.id))}>✕</Btn>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {POSES.map((p) => (
                    <button key={p.name} title={p.name} onClick={() => { patchFig(f.id, { pose: clonePose(p.pose) }); audio.tick(); }}
                      className="h-10 w-10 rounded-xl border-2 border-slate-200 bg-white text-xl hover:border-indigo-400">{p.icon}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-500">Size</span>
                  <input type="range" min={0.4} max={2.4} step={0.05} value={f.scale} onChange={(e) => patchFig(f.id, { scale: +e.target.value })} className="flex-1 accent-indigo-600" />
                </div>
                <Btn size="sm" variant="ok" className="w-full" onClick={() => stampFigure(f.id)}>⬇ Stamp onto board</Btn>
              </div>
            ))}
          </Card>

          {ai && (
            <Card className="space-y-2 border-indigo-300 bg-indigo-50/60">
              <h3 className="text-xl font-black text-indigo-900">🤖 Sketch-Sense AI</h3>
              <p className="text-xs font-semibold text-indigo-700">On-device vision: it reads the primitives you draw <b>and</b> — with the webcam on — subtracts the background to see a sketch you hold up. No upload, no API key, no lag.</p>
              {cam && (
                <div className="space-y-1 rounded-2xl bg-white p-2">
                  <div className="flex items-center justify-between gap-2">
                    <Btn size="sm" variant="primary" onClick={calibrate}>🎯 Calibrate background</Btn>
                    <span className="text-xs font-black text-slate-500">
                      {bg.current ? `ink ${Math.round((vision?.coverage ?? 0) * 100)}% · ${vision?.blobs ?? 0} shapes` : 'not calibrated'}
                    </span>
                  </div>
                  <canvas ref={maskCvs} width={160} height={90} className="h-24 w-full rounded-xl bg-slate-900 object-cover" />
                  <p className="text-[11px] font-semibold text-slate-500">Point the camera at your paper or whiteboard, press calibrate, then draw. This is exactly what the model sees.</p>
                </div>
              )}
              {guesses.length === 0 && <p className="text-sm font-bold text-slate-500">Draw something…</p>}
              {guesses.map((g) => (
                <div key={g.word} className="space-y-1">
                  <div className="flex items-center justify-between text-sm font-black text-slate-700">
                    <span>{g.word} <span className="font-medium text-slate-400">· {g.hint}</span></span>
                    <span className="tabular-nums">{Math.round(g.score * 100)}%</span>
                  </div>
                  <Meter value={g.score} tone="#4f46e5" height={10} />
                </div>
              ))}
              {guesses[0] && (
                <Btn size="sm" className="w-full" onClick={() => say(`Is it a ${guesses[0].word}?`)}>🔊 Let the AI ask the class</Btn>
              )}
            </Card>
          )}

          <Card className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">🗣 Make them talk</h3>
            <p className="text-lg font-semibold text-slate-700">{word?.talk}</p>
            <Btn size="sm" onClick={() => say(word?.talk ?? '')}>🔊 Read the talk task</Btn>
            <div className="flex flex-wrap gap-2 pt-2">
              {teams.map((t) => (
                <button key={t.id} onClick={() => setActiveTeam(t.id)}
                  className={cn('rounded-xl border-2 px-3 py-2 text-left font-black', activeTeam === t.id ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white/60 text-slate-500')}>
                  <span style={{ color: t.color }}>{t.emoji} {t.name}</span>
                  <div className="text-2xl tabular-nums text-slate-900">{scores[t.id] ?? 0}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const JOINTS: JointName[] = ['head', 'neck', 'chest', 'hip', 'elbowL', 'handL', 'elbowR', 'handR', 'kneeL', 'footL', 'kneeR', 'footR'];

function FigureSvg({ f, selected, onJoint }: { f: Figure; selected: boolean; onJoint: (id: string, j: JointName | 'body') => (e: React.PointerEvent) => void }) {
  const p = f.pose;
  const t = `translate(${f.x} ${f.y}) scale(${f.flip ? -f.scale : f.scale} ${f.scale})`;
  const L = (a: Pt, b: Pt, w: number) => <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={f.color} strokeWidth={w} strokeLinecap="round" />;
  return (
    <g transform={t}>
      {f.gender === 'f' ? (
        <>
          <polygon points={`${p.chest.x - 16},${p.chest.y + 20} ${p.hip.x - 34},${p.hip.y + 30} ${p.hip.x + 34},${p.hip.y + 30} ${p.chest.x + 16},${p.chest.y + 20}`} fill={f.color} opacity={0.22} stroke={f.color} strokeWidth={5} />
          <ellipse cx={p.head.x} cy={p.head.y + 2} rx={30} ry={32} fill={f.color} opacity={0.18} />
        </>
      ) : (
        L({ x: p.chest.x - 26, y: p.chest.y - 4 }, { x: p.chest.x + 26, y: p.chest.y - 4 }, 12)
      )}
      {L(p.neck, p.chest, 15)}
      {L(p.chest, p.hip, 17)}
      {L(p.chest, p.elbowL, 11)}
      {L(p.elbowL, p.handL, 10)}
      {L(p.chest, p.elbowR, 11)}
      {L(p.elbowR, p.handR, 10)}
      {L(p.hip, p.kneeL, 13)}
      {L(p.kneeL, p.footL, 11)}
      {L(p.hip, p.kneeR, 13)}
      {L(p.kneeR, p.footR, 11)}
      <circle cx={p.head.x} cy={p.head.y} r={24} fill="#fff" stroke={f.color} strokeWidth={8} />
      {[p.handL, p.handR].map((h, i) => <circle key={i} cx={h.x} cy={h.y} r={7} fill={f.color} />)}
      {[p.footL, p.footR].map((h, i) => <ellipse key={i} cx={h.x} cy={h.y + 3} rx={12} ry={6} fill={f.color} />)}
      {/* drag handles */}
      <circle cx={p.hip.x} cy={p.hip.y} r={20} fill="transparent" stroke={selected ? '#4f46e5' : 'transparent'} strokeWidth={3} strokeDasharray="6 6"
        className="pointer-events-auto cursor-move" onPointerDown={onJoint(f.id, 'body')} />
      {JOINTS.map((j) => (
        <circle key={j} cx={p[j].x} cy={p[j].y} r={13}
          fill={selected ? 'rgba(79,70,229,0.28)' : 'rgba(79,70,229,0.14)'}
          stroke="#4f46e5" strokeWidth={selected ? 3 : 1.5}
          className="pointer-events-auto cursor-grab active:cursor-grabbing"
          onPointerDown={onJoint(f.id, j)} />
      ))}
    </g>
  );
}
