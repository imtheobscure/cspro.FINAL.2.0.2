"use client";

import { useEffect, useRef, useState } from "react";
import { PICTIONARY_WORDS } from "@/content/games-a";
import { Btn, Chip, Panel } from "@/components/ui";
import { useArena } from "@/components/arena/provider";
import { sfx } from "@/lib/audio";

type Tool = "pen" | "marker" | "magic" | "eraser" | "stamp";
const COLOURS = ["#f8fafc", "#f43f5e", "#f59e0b", "#34d399", "#38bdf8", "#a78bfa", "#fb7185", "#111827"];
const STAMPS = ["😀", "😱", "❤️", "⭐", "🔥", "💧", "🌳", "🏠", "🚗", "✈️", "☀️", "🌙", "❓", "💡", "🐶", "🍕"];

type Joint = { x: number; y: number };
const BASE_POSE: Record<string, Joint> = {
  head: { x: 0, y: -60 }, neck: { x: 0, y: -40 }, hip: { x: 0, y: 10 },
  lhand: { x: -45, y: -10 }, rhand: { x: 45, y: -10 },
  lfoot: { x: -28, y: 70 }, rfoot: { x: 28, y: 70 },
};

export default function Pictionary() {
  const a = useArena();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const pts = useRef<{ x: number; y: number }[]>([]);
  const undoStack = useRef<string[]>([]);

  const [tool, setTool] = useState<Tool>("pen");
  const [colour, setColour] = useState(COLOURS[0]);
  const [width, setWidth] = useState(5);
  const [stamp, setStamp] = useState(STAMPS[0]);
  const [wi, setWi] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [figure, setFigure] = useState(false);
  const [flip, setFlip] = useState(false);
  const [pose, setPose] = useState<Record<string, Joint>>(BASE_POSE);
  const [drag, setDrag] = useState<string | null>(null);
  const [round, setRound] = useState(1);

  const word = PICTIONARY_WORDS[wi % PICTIONARY_WORDS.length];

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = c.clientWidth * 2;
    c.height = c.clientHeight * 2;
    const ctx = c.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctxRef.current = ctx;
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const snapshot = () => {
    const c = canvas.current; if (!c) return;
    undoStack.current.push(c.toDataURL());
    if (undoStack.current.length > 14) undoStack.current.shift();
  };

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent) => {
    const ctx = ctxRef.current; if (!ctx) return;
    snapshot();
    const p = pos(e);
    if (tool === "stamp") {
      ctx.font = `${width * 8}px serif`;
      ctx.fillText(stamp, p.x - width * 4, p.y + width * 3);
      sfx("card");
      return;
    }
    drawing.current = true;
    pts.current = [p];
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ctxRef.current!;
    const p = pos(e);
    pts.current.push(p);
    ctx.strokeStyle = tool === "eraser" ? "#0b1220" : colour;
    ctx.globalAlpha = tool === "marker" ? 0.35 : 1;
    ctx.lineWidth = tool === "eraser" ? width * 4 : tool === "marker" ? width * 3 : width;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (tool !== "magic" || pts.current.length < 6) return;
    // Magic pen: snap the wobbly stroke to a clean line, circle or rectangle.
    const ctx = ctxRef.current!;
    const p = pts.current;
    const first = p[0], last = p[p.length - 1];
    const xs = p.map((q) => q.x), ys = p.map((q) => q.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const closed = Math.hypot(last.x - first.x, last.y - first.y) < Math.max(24, (maxX - minX) * 0.25);
    const last2 = undoStack.current[undoStack.current.length - 1];
    const redraw = () => {
      ctx.strokeStyle = colour; ctx.lineWidth = width;
      if (!closed) { ctx.beginPath(); ctx.moveTo(first.x, first.y); ctx.lineTo(last.x, last.y); ctx.stroke(); return; }
      const w = maxX - minX, h = maxY - minY;
      const boxy = Math.abs(w - h) / Math.max(w, h) < 0.35 && p.length > 40;
      ctx.beginPath();
      if (boxy) ctx.ellipse(minX + w / 2, minY + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      else ctx.rect(minX, minY, w, h);
      ctx.stroke();
    };
    if (last2) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, canvas.current!.width / 2, canvas.current!.height / 2); redraw(); };
      img.src = last2;
    } else redraw();
    sfx("chime");
  };

  const undo = () => {
    const c = canvas.current!, ctx = ctxRef.current!;
    const prev = undoStack.current.pop();
    if (!prev) return;
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, c.width, c.height); ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width / 2, c.height / 2); };
    img.src = prev;
  };

  const clear = () => {
    snapshot();
    const c = canvas.current!, ctx = ctxRef.current!;
    ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, c.width, c.height);
    sfx("whoosh");
  };

  const gotIt = () => {
    a.addPoints(a.current.id, 150);
    a.log({ gameKey: "pictionary", teamId: a.current.id, teamName: a.current.name, skill: "Speaking · Describing", grammarPoint: word.category, correct: true, points: 150 });
    sfx("correct");
    next();
  };

  const next = () => { setWi((v) => v + 1); setReveal(false); setRound((r) => r + 1); a.nextTurn(); clear(); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip colour="#a78bfa">Round {round} of 6</Chip>
        <Chip colour="#38bdf8">{word.category}</Chip>
        {reveal
          ? <span className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-lg font-black text-amber-200">{word.word}</span>
          : <span className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-400">secret word hidden</span>}
        <Btn size="sm" tone="ghost" onClick={() => setReveal((r) => !r)}>{reveal ? "Hide" : "Reveal"}</Btn>
        <Btn size="sm" tone="ghost" onClick={() => navigator.clipboard?.writeText(word.word)}>Copy word</Btn>
        <Btn size="sm" tone="ghost" onClick={() => a.say(word.hint)}>💡 Hint aloud</Btn>
        <div className="ml-auto flex gap-2">
          <Btn size="sm" tone="green" onClick={gotIt}>✓ Got it (+150)</Btn>
          <Btn size="sm" tone="ghost" onClick={next}>Skip →</Btn>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[210px_minmax(0,1fr)]">
        <Panel title="Tools">
          <div className="grid grid-cols-3 gap-1.5">
            {([["pen", "✏️"], ["marker", "🖍"], ["magic", "✨"], ["eraser", "🧽"], ["stamp", "🙂"]] as [Tool, string][]).map(([t, icon]) => (
              <button key={t} onClick={() => setTool(t)}
                className={`rounded-xl border p-2 text-lg ${tool === t ? "border-amber-400 bg-amber-500/15" : "border-white/10 bg-white/5"}`}>{icon}</button>
            ))}
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">Colour</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {COLOURS.map((c) => (
              <button key={c} onClick={() => setColour(c)} className={`h-6 w-6 rounded-lg border-2 ${colour === c ? "border-white" : "border-white/20"}`} style={{ background: c }} />
            ))}
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">Thickness {width}</p>
          <input type="range" min={2} max={26} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full" />
          {tool === "stamp" && (
            <div className="mt-2 flex flex-wrap gap-1">
              {STAMPS.map((s) => (
                <button key={s} onClick={() => setStamp(s)} className={`rounded-lg border p-1 text-lg ${stamp === s ? "border-amber-400" : "border-white/10"}`}>{s}</button>
              ))}
            </div>
          )}
          <div className="mt-3 space-y-1.5">
            <Btn className="w-full" size="sm" tone="ghost" onClick={undo}>↶ Undo</Btn>
            <Btn className="w-full" size="sm" tone="ghost" onClick={clear}>🗑 Clear</Btn>
            <Btn className="w-full" size="sm" tone={figure ? "amber" : "ghost"} onClick={() => setFigure((f) => !f)}>🕺 Stick figure</Btn>
            {figure && (
              <>
                <Btn className="w-full" size="sm" tone="ghost" onClick={() => setFlip((f) => !f)}>⇄ Flip figure</Btn>
                <Btn className="w-full" size="sm" tone="ghost" onClick={() => setPose(BASE_POSE)}>Reset pose</Btn>
              </>
            )}
          </div>
        </Panel>

        <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#0b1220]">
          <canvas
            ref={canvas}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
            className="h-[62vh] w-full touch-none"
          />
          {figure && (
            <svg viewBox="-120 -110 240 220" className="pointer-events-none absolute inset-0 m-auto h-[60vh] w-[60vh]"
              style={{ transform: flip ? "scaleX(-1)" : undefined }}
              onPointerMove={(e) => {
                if (!drag) return;
                const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                const x = ((e.clientX - r.left) / r.width) * 240 - 120;
                const y = ((e.clientY - r.top) / r.height) * 220 - 110;
                setPose((p) => ({ ...p, [drag]: { x: flip ? -x : x, y } }));
              }}
              onPointerUp={() => setDrag(null)}
            >
              <g stroke="#38bdf8" strokeWidth={5} strokeLinecap="round" fill="none">
                <circle cx={pose.head.x} cy={pose.head.y} r={18} />
                <line x1={pose.neck.x} y1={pose.neck.y} x2={pose.hip.x} y2={pose.hip.y} />
                <line x1={pose.neck.x} y1={pose.neck.y} x2={pose.lhand.x} y2={pose.lhand.y} />
                <line x1={pose.neck.x} y1={pose.neck.y} x2={pose.rhand.x} y2={pose.rhand.y} />
                <line x1={pose.hip.x} y1={pose.hip.y} x2={pose.lfoot.x} y2={pose.lfoot.y} />
                <line x1={pose.hip.x} y1={pose.hip.y} x2={pose.rfoot.x} y2={pose.rfoot.y} />
              </g>
              <g className="pointer-events-auto">
                {Object.entries(pose).map(([k, j]) => (
                  <circle key={k} cx={j.x} cy={j.y} r={9} fill="rgba(251,191,36,.55)" stroke="#f59e0b"
                    style={{ cursor: "grab" }} onPointerDown={() => setDrag(k)} />
                ))}
              </g>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
