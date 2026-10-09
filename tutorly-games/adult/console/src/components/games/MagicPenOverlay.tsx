"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eraser,
  Sparkles,
  Pencil,
  Type,
  Trash2,
  Copy,
  Check,
  Minus,
  Plus,
  ScrollText,
  GripVertical,
  Palette,
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  createdAt: number;
}

/** A piece of writing on the board: typed once, then moved and resized freely. */
interface TextItem {
  id: string;
  text: string;
  /** Position as a percentage of the board, so it survives a window resize. */
  x: number;
  y: number;
  size: number;
  color: string;
  /** Drawn behind the writing so it reads over a busy 3D scene. */
  scrim: boolean;
}

interface LogEntry {
  id: string;
  text: string;
  at: number;
}

/** The ink stays on the game for this long, then erases itself. */
const INK_LIFETIME_MS = 10_000;
/** How long the erase animation takes once it starts. */
const ERASE_MS = 1_100;

const PEN_COLORS = ["#f8fafc", "#22d3ee", "#a855f7", "#f472b6", "#fbbf24", "#34d399", "#ef4444", "#0f172a"];
const TEXT_SIZES = [24, 32, 44, 60, 84];

/** Where the writing is kept between lessons. */
const LOG_KEY = "tutorly:console:whiteboard-log:v1";
const ITEMS_KEY = "tutorly:console:whiteboard-items:v1";

/**
 * Stamps must be on the same clock as the frame callback's timestamp, which is
 * `performance.now()` (ms since the page loaded) — `Date.now()` is epoch ms and
 * the difference is decades, so the ink would never age out.
 */
const stamp = () => performance.now();

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Distance from the stroke's start to each point, so a stroke can be erased tip-first. */
function cumulativeLengths(points: Point[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return out;
}

/**
 * Paint one stroke. `eraseProgress` runs 0 → 1: the ink is wiped from its start
 * to its tip while a glowing head and a few sparks travel along it, so the ink
 * disappears instead of just fading out.
 */
function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, eraseProgress: number) {
  const pts = stroke.points;
  if (pts.length === 0) return;

  const alpha = Math.max(0, 1 - eraseProgress);
  if (alpha <= 0) return;

  const cum = cumulativeLengths(pts);
  const total = cum[cum.length - 1];
  const startDistance = eraseProgress * total;

  let start = 0;
  while (start < pts.length - 1 && cum[start + 1] < startDistance) start++;
  const tail = pts.slice(start);

  const path = new Path2D();
  if (total === 0 || tail.length < 2) {
    path.arc(tail[0].x, tail[0].y, stroke.width / 2, 0, Math.PI * 2);
  } else {
    // Midpoint smoothing: the pen follows the player's hand without kinks.
    path.moveTo(tail[0].x, tail[0].y);
    for (let i = 1; i < tail.length - 1; i++) {
      path.quadraticCurveTo(tail[i].x, tail[i].y, (tail[i].x + tail[i + 1].x) / 2, (tail[i].y + tail[i + 1].y) / 2);
    }
    const last = tail[tail.length - 1];
    path.lineTo(last.x, last.y);
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Neon outer glow
  ctx.globalAlpha = alpha;
  ctx.shadowColor = stroke.color;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.stroke(path);

  // Bright core so the ink reads as "magic" rather than a flat line
  ctx.shadowBlur = 0;
  ctx.globalAlpha = alpha * 0.85;
  ctx.strokeStyle = stroke.color === "#0f172a" ? "rgba(255,255,255,0.55)" : "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = Math.max(1, stroke.width * 0.4);
  ctx.stroke(path);

  // The eraser head travelling along the ink, plus sparks flying off it
  if (eraseProgress > 0 && eraseProgress < 1 && total > 0) {
    const head = tail[0];

    const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 24);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    glow.addColorStop(0.35, stroke.color);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    for (let i = 0; i < 6; i++) {
      const angle = i * 1.05 + eraseProgress * 6.28;
      const dist = 6 + ((i * 37) % 17) + eraseProgress * 26;
      ctx.globalAlpha = (1 - eraseProgress) * 0.9;
      ctx.beginPath();
      ctx.arc(head.x + Math.cos(angle) * dist, head.y + Math.sin(angle) * dist, 1.6 + ((i * 13) % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/** `#rrggbb` → the same colour as `rgba()` with an alpha, for scrims and outlines. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Relative luminance of an average colour, 0 (black) → 1 (white). */
function luminanceOf(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * The colour the writing should be to stay readable over whatever is under it.
 *
 * The board sits over the game, so "the colour below" is a moving 3D scene. The
 * honest way to know it is to look: the game's canvas is drawable into an
 * offscreen 2D canvas whenever the frame is same-origin (it always is for a
 * proxied build), so a thumbnail of the region is sampled and averaged. When the
 * read fails — a direct-embed game on another origin, or a WebGL canvas the
 * browser will not hand over — the answer is `null` and the caller keeps the
 * outline, which is what makes the writing readable when nothing can be measured.
 */
function sampleLuminance(iframe: HTMLIFrameElement | null, x: number, y: number, w: number, h: number): number | null {
  try {
    const win = iframe?.contentWindow;
    const doc = win?.document;
    const source = (doc?.querySelector("canvas") as HTMLCanvasElement | null) || null;
    if (!source || !source.width || !source.height) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // The board's own backing store is CSS-sized; the game canvas is in its own
    // pixel space, so the sampled rectangle is scaled through the frame's box.
    const frameBox = iframe!.getBoundingClientRect();
    const scale = source.width / Math.max(1, frameBox.width);
    ctx.drawImage(
      source,
      Math.max(0, x * scale),
      Math.max(0, y * scale),
      Math.max(1, w * scale),
      Math.max(1, h * scale),
      0,
      0,
      24,
      24
    );

    const data = ctx.getImageData(0, 0, 24, 24).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    // A WebGL canvas without a preserved drawing buffer reads back as all black,
    // which is indistinguishable from real black — refuse the sample rather than
    // make every label white over a bright scene.
    if (n === 0 || (r === 0 && g === 0 && b === 0)) return null;
    return luminanceOf(r / n, g / n, b / n);
  } catch {
    return null;
  }
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as unknown as T) : fallback;
  } catch {
    return fallback;
  }
}

interface Props {
  active: boolean;
  /** The game frame, used only to read the colours under a new label. */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

/**
 * Whiteboard for the game viewport: a pencil that draws and erases itself, plus
 * writing that stays put so a class can read it while the game plays underneath.
 *
 * The pencil is deliberately short-lived — a tutor circles the answer and the ink
 * cleans up after itself ten seconds later — while a typed label is an
 * annotation, so it stays until it is deleted and is kept in a log the tutor can
 * read back at the end of the lesson (and find again tomorrow, since the log and
 * the labels are kept in this browser).
 */
export default function MagicPenOverlay({ active, iframeRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const dprRef = useRef(1);
  const boardRef = useRef<HTMLDivElement | null>(null);
  /** Mirrors `hasInk` so the animation loop can compare without re-subscribing. */
  const hasInkRef = useRef(false);
  const dragRef = useRef<{ id: string; mode: "move" | "size"; startX: number; startY: number; x: number; y: number; size: number } | null>(null);

  const [tool, setTool] = useState<"pen" | "text">("pen");
  const [penColor, setPenColor] = useState(PEN_COLORS[1]);
  const [penWidth, setPenWidth] = useState(4.5);
  const [textSize, setTextSize] = useState(44);
  const [textColor, setTextColor] = useState("#ffffff");
  const [hasInk, setHasInk] = useState(false);

  const [items, setItems] = useState<TextItem[]>(() => readStored<TextItem[]>(ITEMS_KEY, []));
  const [editing, setEditing] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>(() => readStored<LogEntry[]>(LOG_KEY, []));
  const [showLog, setShowLog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Keep the board's own state so a lesson's writing is still there tomorrow.
  useEffect(() => {
    try {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    } catch {
      /* a full or blocked storage is not worth failing the whiteboard over */
    }
  }, [items]);
  useEffect(() => {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch {
      /* as above */
    }
  }, [log]);

  // Keep the canvas backing store matched to its on-screen size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      dprRef.current = dpr;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // One animation loop redraws every stroke: it draws the live one and ages the rest.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let stopped = false;
    let handle = 0;
    const frame = (now: number) => {
      if (stopped) return;
      const dpr = dprRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const alive: Stroke[] = [];
      for (const stroke of strokesRef.current) {
        const age = now - stroke.createdAt;
        if (age >= INK_LIFETIME_MS + ERASE_MS) continue;
        alive.push(stroke);
        const erase = age <= INK_LIFETIME_MS ? 0 : (age - INK_LIFETIME_MS) / ERASE_MS;
        paintStroke(ctx, stroke, easeInOut(Math.min(1, erase)));
      }
      strokesRef.current = alive;

      if (currentRef.current) paintStroke(ctx, currentRef.current, 0);

      const nextHasInk = alive.length > 0 || currentRef.current !== null;
      if (nextHasInk !== hasInkRef.current) {
        hasInkRef.current = nextHasInk;
        setHasInk(nextHasInk);
      }

      handle = requestAnimationFrame(frame);
    };

    handle = requestAnimationFrame(frame);
    return () => {
      stopped = true;
      cancelAnimationFrame(handle);
    };
  }, []);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active) return;
    e.preventDefault();
    if (tool === "text") {
      // Writing starts where the tutor clicked; the label is committed in place.
      addTextAt(e.clientX, e.clientY);
      return;
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // No active pointer for that id (e.g. a synthetic event) — drawing still works.
    }
    currentRef.current = { points: [pointFromEvent(e)], color: penColor, width: penWidth, createdAt: stamp() };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = currentRef.current;
    if (!stroke || !active) return;
    const point = pointFromEvent(e);
    const last = stroke.points[stroke.points.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) < 1.5) return;
    stroke.points.push(point);
  };

  const finishStroke = () => {
    const stroke = currentRef.current;
    if (!stroke) return;
    currentRef.current = null;
    if (stroke.points.length === 1) {
      // A tap should leave a dot, not nothing.
      stroke.points.push({ x: stroke.points[0].x + 0.1, y: stroke.points[0].y + 0.1 });
    }
    stroke.createdAt = stamp();
    strokesRef.current.push(stroke);
  };

  const clearInk = useCallback(() => {
    strokesRef.current = [];
    currentRef.current = null;
  }, []);

  /* ------------------------------------------------------------ writing -- */

  /** Place a new label where the tutor clicked, and choose its colour from the scene. */
  const addTextAt = useCallback(
    (clientX: number, clientY: number) => {
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      // What colour is under it? White over a dark scene, near-black over a bright
      // one; unmeasurable stays white, which the dark outline keeps readable.
      const lum = sampleLuminance(iframeRef?.current ?? null, px, py, Math.max(220, textSize * 6), textSize * 1.6);
      const color = lum === null ? textColor : lum > 0.62 ? "#0b1220" : "#ffffff";

      const id = `t${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
      setItems((prev) => [
        ...prev,
        {
          id,
          text: "",
          x: px / Math.max(1, rect.width),
          y: py / Math.max(1, rect.height),
          size: textSize,
          color,
          scrim: lum !== null && lum > 0.42 && lum < 0.62,
        },
      ]);
      setEditing(id);
    },
    [iframeRef, textColor, textSize]
  );

  /** Commit a label: keep the text, remember it in the log, stop editing. */
  const commitText = useCallback((id: string, raw: string) => {
    const text = raw.replace(/\s+$/g, "");
    setEditing(null);

    if (text.trim() === "") {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setLog((prev) => prev.filter((e) => e.id !== id));
      return;
    }

    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
    setLog((prev) => {
      const at = Date.now();
      const existing = prev.find((e) => e.id === id);
      return existing ? prev.map((e) => (e.id === id ? { ...e, text, at } : e)) : [...prev, { id, text, at }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setLog((prev) => prev.filter((e) => e.id !== id));
  }, []);

  /** Move or resize a label. Both are pointer drags measured against the board. */
  const startDrag = (e: React.PointerEvent, item: TextItem, mode: "move" | "size") => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { id: item.id, mode, startX: e.clientX, startY: e.clientY, x: item.x, y: item.y, size: item.size };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const board = boardRef.current;
    if (!drag || !board) return;
    e.preventDefault();
    const rect = board.getBoundingClientRect();
    if (drag.mode === "move") {
      const nx = Math.min(0.98, Math.max(0, drag.x + (e.clientX - drag.startX) / Math.max(1, rect.width)));
      const ny = Math.min(0.98, Math.max(0, drag.y + (e.clientY - drag.startY) / Math.max(1, rect.height)));
      setItems((prev) => prev.map((i) => (i.id === drag.id ? { ...i, x: nx, y: ny } : i)));
    } else {
      // Vertical drag scales the writing; horizontal is allowed too so a trackpad
      // flick in either direction feels like it does something.
      const delta = (e.clientY - drag.startY) + (e.clientX - drag.startX) * 0.6;
      const size = Math.min(160, Math.max(16, Math.round(drag.size + delta)));
      setItems((prev) => prev.map((i) => (i.id === drag.id ? { ...i, size } : i)));
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const resizeItem = (id: string, delta: number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, size: Math.min(160, Math.max(16, i.size + delta)) } : i)));

  const logText = useMemo(
    () => log.map((e) => `${new Date(e.at).toLocaleTimeString()}  ${e.text}`).join("\n"),
    [log]
  );

  const copyLog = async () => {
    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (no permission, insecure context) — the panel is still
      // selectable, so the text can be selected by hand.
    }
  };

  // Ctrl/Cmd+Z removes the last writing on the board; Esc leaves the tool.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        clearInk();
        setItems((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, editing, clearInk]);

  return (
    <div className={`absolute inset-0 z-20 ${active ? "" : "pointer-events-none"}`}>
      <div ref={boardRef} className="absolute inset-0" onPointerMove={onDragMove} onPointerUp={endDrag} onPointerLeave={endDrag}>
        {/* The ink layer: also the drawing surface, and where a click places writing. */}
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onPointerLeave={finishStroke}
          className={`w-full h-full touch-none ${active ? (tool === "text" ? "cursor-text" : "cursor-crosshair") : "pointer-events-none"}`}
        />

        {/* Writing. Rendered above the ink so it stays crisp and stays draggable. */}
        {items.map((item) => {
          const isEditing = editing === item.id;
          return (
            <div
              key={item.id}
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                maxWidth: "86%",
                fontSize: item.size,
                lineHeight: 1.15,
                color: item.color,
                background: item.scrim ? "rgba(2, 6, 23, 0.72)" : "transparent",
                borderRadius: 12,
              }}
              className={`absolute select-none ${active ? "pointer-events-auto" : "pointer-events-none"} ${
                isEditing ? "ring-2 ring-cyan-400/80" : ""
              }`}
              onPointerDown={(e) => {
                if (!active || isEditing) return;
                if ((e.target as HTMLElement).closest("[data-ctl]")) return;
                startDrag(e, item, "move");
              }}
            >
              {isEditing ? (
                <textarea
                  autoFocus
                  defaultValue={item.text}
                  onPointerDown={(e) => e.stopPropagation()}
                  onBlur={(e) => commitText(item.id, e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      commitText(item.id, e.currentTarget.value);
                    } else if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      commitText(item.id, e.currentTarget.value);
                    }
                    e.stopPropagation();
                  }}
                  spellCheck={false}
                  rows={1}
                  style={{
                    fontSize: "inherit",
                    color: "inherit",
                    lineHeight: "inherit",
                    width: `${Math.max(220, item.size * 7)}px`,
                  }}
                  className="bg-transparent outline-none resize-none font-black tracking-tight px-2 py-1"
                />
              ) : (
                <div
                  onClick={() => {
                    if (active) setEditing(item.id);
                  }}
                  title={active ? "Click to edit · drag to move" : item.text}
                  className="font-black tracking-tight whitespace-pre-wrap px-2 py-1 cursor-move"
                  style={{
                    // A complementary outline is what makes the writing readable on
                    // any scene: white ink gets a dark edge, dark ink gets a light one.
                    WebkitTextStroke: item.color === "#0b1220" ? "0" : "1.5px rgba(2,6,23,0.85)",
                    textShadow:
                      item.color === "#0b1220"
                        ? "0 0 6px rgba(255,255,255,0.9), 0 1px 0 rgba(255,255,255,0.75)"
                        : "0 0 10px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.55)",
                  }}
                >
                  {item.text}
                </div>
              )}

              {active && !isEditing && (
                <div
                  data-ctl
                  className="flex items-center gap-1 mt-0.5 bg-slate-950/85 backdrop-blur rounded-lg px-1 py-0.5 border border-slate-700 w-max text-slate-300"
                >
                  <button data-ctl onClick={() => resizeItem(item.id, -6)} className="p-1 hover:text-white" title="Smaller">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span data-ctl className="text-[11px] font-mono px-1">
                    {item.size}px
                  </span>
                  <button data-ctl onClick={() => resizeItem(item.id, 6)} className="p-1 hover:text-white" title="Bigger">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    data-ctl
                    onClick={() => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, color: i.color === "#0b1220" ? "#ffffff" : "#0b1220" } : i)))}
                    className="p-1 hover:text-white"
                    title="Swap ink and outline"
                  >
                    <Palette className="w-3 h-3" />
                  </button>
                  <button
                    data-ctl
                    onClick={() => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, scrim: !i.scrim } : i)))}
                    className="p-1 hover:text-white"
                    title="Shade behind the writing"
                  >
                    <Check className={`w-3 h-3 ${item.scrim ? "text-cyan-300" : "opacity-40"}`} />
                  </button>
                  <button data-ctl onClick={() => removeItem(item.id)} className="p-1 hover:text-red-300" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                  {/* The size drag, for a hand that would rather drag than tap. */}
                  <span
                    data-ctl
                    onPointerDown={(e) => startDrag(e, item, "size")}
                    onPointerMove={onDragMove}
                    onPointerUp={endDrag}
                    className="cursor-nwse-resize px-1 border-l border-slate-700"
                    title="Drag to resize"
                  >
                    <GripVertical className="w-3 h-3" />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* The whiteboard's own controls. */}
      {active && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-1.5 bg-slate-950/85 backdrop-blur px-2 py-1.5 rounded-2xl border border-cyan-500/40 text-[11px] font-mono text-cyan-100 max-w-[94%]">
          <button
            onClick={() => setTool("pen")}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg ${tool === "pen" ? "bg-cyan-500 text-slate-950 font-bold" : "hover:bg-slate-800"}`}
            title="Pencil — draw on the game (ink cleans itself up)"
          >
            <Pencil className="w-3.5 h-3.5" /> Pencil
          </button>
          <button
            onClick={() => setTool("text")}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg ${tool === "text" ? "bg-cyan-500 text-slate-950 font-bold" : "hover:bg-slate-800"}`}
            title="Write text — click the screen to place it, drag to move, drag the handle to resize"
          >
            <Type className="w-3.5 h-3.5" /> Text
          </button>

          {tool === "pen" ? (
            <>
              <span className="w-px h-5 bg-slate-700 mx-0.5" />
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={`w-4 h-4 rounded-full border ${penColor === c ? "ring-2 ring-white" : "border-slate-600"}`}
                  style={{ background: c }}
                  title={`Pencil colour ${c}`}
                />
              ))}
              <span className="w-px h-5 bg-slate-700 mx-0.5" />
              {[2.5, 4.5, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => setPenWidth(w)}
                  className={`px-1.5 py-0.5 rounded ${penWidth === w ? "bg-slate-700 text-white" : "hover:bg-slate-800"}`}
                  title={`Line width ${w}`}
                >
                  {w === 2.5 ? "fine" : w === 4.5 ? "mid" : "thick"}
                </button>
              ))}
            </>
          ) : (
            <>
              <span className="w-px h-5 bg-slate-700 mx-0.5" />
              {TEXT_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setTextSize(s)}
                  className={`px-1.5 py-0.5 rounded ${textSize === s ? "bg-slate-700 text-white" : "hover:bg-slate-800"}`}
                  title={`Default writing size ${s}px`}
                >
                  {s}
                </button>
              ))}
              <span className="text-slate-400">px · click the game to write</span>
            </>
          )}

          <span className="w-px h-5 bg-slate-700 mx-0.5" />
          <button onClick={clearInk} disabled={!hasInk} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 disabled:opacity-40" title="Erase the pencil ink now">
            <Eraser className="w-3.5 h-3.5" /> Clear ink
          </button>
          <button
            onClick={() => setShowLog((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg ${showLog ? "bg-slate-800 text-white" : "hover:bg-slate-800"}`}
            title="Everything written on this board, in order"
          >
            <ScrollText className="w-3.5 h-3.5" /> Log {log.length > 0 ? `(${log.length})` : ""}
          </button>
          <button
            onClick={() => {
              clearInk();
              setItems([]);
            }}
            disabled={items.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 disabled:opacity-40"
            title="Remove every label from the board (the log keeps the text)"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear board
          </button>
        </div>
      )}

      {active && tool === "pen" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-full border border-cyan-500/40 text-[11px] font-mono text-cyan-200 pointer-events-none">
          <Sparkles className="w-3.5 h-3.5" />
          Magic pen — the ink erases itself after 10s
        </div>
      )}

      {/* The text log: what was written, when, and a copy button for a lesson report. */}
      {active && showLog && (
        <div className="absolute top-16 right-3 w-80 max-h-[60%] flex flex-col bg-slate-950/92 backdrop-blur rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <span className="text-[11px] font-mono text-slate-300 uppercase">Whiteboard text log · {log.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={copyLog} disabled={log.length === 0} className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-40" title="Copy the whole log">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setLog([])} disabled={log.length === 0} className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-40" title="Empty the log">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto p-2 space-y-1.5">
            {log.length === 0 ? (
              <p className="text-[11px] text-slate-500 px-1 py-2">
                Nothing written yet. Choose <span className="text-cyan-300">Text</span>, click the game, and type — every line you keep is
                recorded here (and survives a reload).
              </p>
            ) : (
              log.map((entry) => (
                <div key={entry.id} className="flex gap-2 text-[11px]">
                  <span className="font-mono text-slate-500 shrink-0">{new Date(entry.at).toLocaleTimeString()}</span>
                  <span className="text-slate-100 whitespace-pre-wrap break-words">{entry.text}</span>
                </div>
              ))
            )}
          </div>
          {items.length > 0 && (
            <div className="px-3 py-1.5 border-t border-slate-800 text-[10px] font-mono text-slate-500">
              {items.length} label{items.length === 1 ? "" : "s"} on the board
            </div>
          )}
        </div>
      )}
    </div>
  );
}
