import { useEffect, useRef, useState } from "react";
import { Btn, Label } from "../ui/primitives";
import { bus, useBus } from "../state/store";

// Annotation tools work on a fullscreen overlay over the classroom screen.
// Tools: pen, highlighter, eraser, textbox, arrow, rect, clear.
// State synced via the bus so popup window can also command the overlay.

type Tool = "pen" | "highlight" | "eraser" | "text" | "arrow" | "rect";

export default function AnnotationsPanel() {
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#6366f1");
  const [size, setSize] = useState(3);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    bus.emit("annotation-config", { enabled, tool, color, size });
  }, [enabled, tool, color, size]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🖌</span>
          <h3 className="font-semibold text-slate-800">Annotation Tools</h3>
        </div>
        <p className="text-xs text-slate-600">Draw, highlight & add text on the classroom screen. Visible to everyone.</p>
      </div>

      <Btn
        variant={enabled ? "danger" : "primary"}
        size="lg"
        className="w-full"
        onClick={() => setEnabled((v) => !v)}
      >
        {enabled ? "⏹ Stop Annotating" : "✏️ Start Annotating"}
      </Btn>

      <div>
        <Label>Tool</Label>
        <div className="grid grid-cols-3 gap-1 mt-1">
          {(["pen", "highlight", "eraser", "text", "arrow", "rect"] as Tool[]).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={
                "px-2 py-2 text-xs rounded-lg border transition " +
                (tool === t
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")
              }
            >
              {iconFor(t)} {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Color</Label>
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {["#6366f1","#ef4444","#f59e0b","#10b981","#3b82f6","#a855f7","#000000","#ffffff"].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={"w-7 h-7 rounded-full border-2 transition " + (color === c ? "border-slate-800 scale-110" : "border-white")}
              style={{ background: c, boxShadow: "0 0 0 1px #cbd5e1" }}
              title={c}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer" />
        </div>
      </div>

      <div>
        <Label>Size: {size}px</Label>
        <input
          type="range"
          min={1}
          max={24}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Btn variant="ghost" onClick={() => bus.emit("annotation-undo")}>↶ Undo</Btn>
        <Btn variant="danger" onClick={() => bus.emit("annotation-clear")}>🗑 Clear All</Btn>
      </div>
    </div>
  );
}

function iconFor(t: Tool) {
  return { pen: "✏️", highlight: "🖍", eraser: "🧽", text: "T", arrow: "↗", rect: "▭" }[t];
}

// Drawing canvas overlay (rendered by Classroom)
export function AnnotationOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState({
    enabled: false,
    tool: "pen" as Tool,
    color: "#6366f1",
    size: 3,
  });
  const undoStackRef = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const startPt = useRef<{ x: number; y: number } | null>(null);
  const snapshot = useRef<ImageData | null>(null);
  const [textBoxes, setTextBoxes] = useState<{ id: string; x: number; y: number; text: string; color: string }[]>([]);

  useBus((ev) => {
    if (ev.type === "annotation-config") setConfig(ev.payload);
    if (ev.type === "annotation-clear") {
      const c = canvasRef.current;
      if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
      setTextBoxes([]);
      undoStackRef.current = [];
    }
    if (ev.type === "annotation-undo") {
      const c = canvasRef.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      const prev = undoStackRef.current.pop();
      if (prev) {
        try {
          ctx.putImageData(prev, 0, 0);
        } catch {}
      } else ctx.clearRect(0, 0, c.width, c.height);
    }
  });

  /** A saved snapshot can only be painted back while the canvas keeps its size. */
  function fitsCanvas(img: ImageData | null, c: HTMLCanvasElement): img is ImageData {
    return !!img && img.width === c.width && img.height === c.height;
  }

  /**
   * Read the canvas safely.
   *
   * `getImageData` throws an IndexSizeError on a 0-sized bitmap, and a window
   * that is hidden, minimised or still laying out reports `innerWidth === 0` —
   * which is exactly what happened in the built app: the resize handler wrote a
   * 0-width canvas and every later resize, undo or shape draw threw and killed
   * the annotation overlay. Snapshotting through this guard keeps the overlay
   * alive instead of breaking it for the rest of the lesson.
   */
  function grabImage(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement): ImageData | null {
    if (c.width < 1 || c.height < 1) return null;
    try {
      return ctx.getImageData(0, 0, c.width, c.height);
    } catch {
      return null;
    }
  }

  useEffect(() => {
    function resize() {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      // A hidden, minimised or mid-layout window reports 0×0. Leave the canvas
      // alone: shrinking it to 1×1 would throw away the class's work, and the
      // next real resize brings the correct size back.
      if (window.innerWidth < 1 || window.innerHeight < 1) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (c.width === w && c.height === h) return;
      const img = grabImage(ctx, c);
      c.width = w;
      c.height = h;
      // The saved drawing only lines up while the canvas keeps its size.
      if (img && img.width === w && img.height === h) {
        try {
          ctx.putImageData(img, 0, 0);
        } catch {}
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushUndo() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const img = grabImage(ctx, c);
    if (!img) return;
    undoStackRef.current.push(img);
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
  }

  function onDown(e: React.PointerEvent) {
    if (!config.enabled) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const x = e.clientX, y = e.clientY;
    if (config.tool === "text") {
      const id = Math.random().toString(36).slice(2);
      setTextBoxes((t) => [...t, { id, x, y, text: "Text", color: config.color }]);
      return;
    }
    pushUndo();
    drawing.current = true;
    last.current = { x, y };
    startPt.current = { x, y };
    if (config.tool === "rect" || config.tool === "arrow") {
      const shot = grabImage(ctx, c);
      if (shot) snapshot.current = shot;
    }
    if (config.tool === "pen" || config.tool === "highlight") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    if (!drawing.current || !config.enabled) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const x = e.clientX, y = e.clientY;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (config.tool === "pen") {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = config.color;
      ctx.lineWidth = config.size;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (config.tool === "highlight") {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = config.color;
      ctx.lineWidth = config.size * 4;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (config.tool === "eraser") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, config.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (config.tool === "rect" && fitsCanvas(snapshot.current, c) && startPt.current) {
      ctx.putImageData(snapshot.current!, 0, 0);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = config.color;
      ctx.lineWidth = config.size;
      ctx.strokeRect(startPt.current.x, startPt.current.y, x - startPt.current.x, y - startPt.current.y);
    } else if (config.tool === "arrow" && fitsCanvas(snapshot.current, c) && startPt.current) {
      ctx.putImageData(snapshot.current!, 0, 0);
      drawArrow(ctx, startPt.current.x, startPt.current.y, x, y, config.color, config.size);
    }
    last.current = { x, y };
  }

  function onUp() {
    drawing.current = false;
    last.current = null;
    startPt.current = null;
    snapshot.current = null;
    const c = canvasRef.current;
    c?.getContext("2d")!.beginPath();
  }

  return (
    <div
      className="fixed inset-0 z-40"
      style={{ pointerEvents: config.enabled ? "auto" : "none" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: config.enabled ? cursorFor(config.tool) : "default" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      {textBoxes.map((tb) => (
        <input
          key={tb.id}
          autoFocus
          defaultValue={tb.text}
          onBlur={(e) => {
            const v = e.currentTarget.value;
            setTextBoxes((t) => t.map((x) => (x.id === tb.id ? { ...x, text: v } : x)));
          }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
          style={{
            position: "absolute",
            left: tb.x,
            top: tb.y,
            color: tb.color,
            fontWeight: 700,
            background: "rgba(255,255,255,0.9)",
            border: "2px dashed " + tb.color,
            padding: "2px 6px",
            borderRadius: 6,
            fontSize: 18,
            pointerEvents: config.enabled ? "auto" : "none",
          }}
        />
      ))}
    </div>
  );
}

function cursorFor(t: Tool) {
  if (t === "text") return "text";
  if (t === "eraser") return "cell";
  return "crosshair";
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, size: number) {
  const headLen = 14 + size * 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}
