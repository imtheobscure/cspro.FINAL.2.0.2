import { useEffect, useRef, useState } from "react";
import type { ChatAttachment } from "../state/types";
import { Btn } from "../ui/primitives";
import { formatBytes, formatDuration } from "./media";

/**
 * Full-screen viewer. A photo in the chat is usually a textbook page, a homework
 * photo or a screenshot, and the room needs to actually read it — so the viewer
 * can zoom, pan and download rather than just being a bigger thumbnail.
 */
export default function Lightbox({ items, index, onClose }: { items: ChatAttachment[]; index: number; onClose: () => void }) {
  const [at, setAt] = useState(index);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const media = items[at];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next(1);
      if (e.key === "ArrowLeft") next(-1);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(6, z + 0.25));
      if (e.key === "-") setZoom((z) => Math.max(1, z - 0.25));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, items.length]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [at]);

  function next(dir: 1 | -1) {
    setAt((i) => (i + dir + items.length) % items.length);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(6, Math.max(1, z + (e.deltaY < 0 ? 0.15 : -0.15))));
  }

  if (!media) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-slate-950/90 backdrop-blur-sm flex flex-col" onClick={onClose}>
      <div className="flex items-center gap-2 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{media.name || media.title || media.kind}</div>
          <div className="text-[11px] text-white/60">
            {[media.provider, media.width && media.height ? `${media.width}×${media.height}` : "", media.durationSec ? formatDuration(media.durationSec) : "", formatBytes(media.sizeBytes)]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <Btn size="sm" variant="ghost" className="!text-white hover:!bg-white/10" onClick={() => setZoom((z) => Math.max(1, z - 0.25))}>
          −
        </Btn>
        <span className="text-xs tabular-nums w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Btn size="sm" variant="ghost" className="!text-white hover:!bg-white/10" onClick={() => setZoom((z) => Math.min(6, z + 0.25))}>
          +
        </Btn>
        <Btn
          size="sm"
          variant="ghost"
          className="!text-white hover:!bg-white/10"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          Reset
        </Btn>
        {media.url && (
          <a
            href={media.url}
            download={media.name || "media"}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            ⬇ Save
          </a>
        )}
        <Btn size="sm" variant="ghost" className="!text-white hover:!bg-white/10" onClick={onClose}>
          ✕
        </Btn>
      </div>

      <div
        className="flex-1 min-h-0 flex items-center justify-center overflow-hidden px-4 pb-4"
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onMouseDown={(e) => {
          dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onMouseMove={(e) => {
          if (!dragRef.current || zoom === 1) return;
          setOffset({ x: dragRef.current.ox + (e.clientX - dragRef.current.x), y: dragRef.current.oy + (e.clientY - dragRef.current.y) });
        }}
        onMouseUp={() => (dragRef.current = null)}
        onMouseLeave={() => (dragRef.current = null)}
        style={{ cursor: zoom > 1 ? "grab" : "default" }}
      >
        {media.kind === "video" ? (
          <video src={media.url} controls autoPlay className="max-h-full max-w-full rounded-xl" />
        ) : media.kind === "audio" || media.kind === "voice" ? (
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-slate-800 font-semibold">{media.name || "Audio"}</div>
            <audio src={media.url} controls autoPlay className="w-full" />
            {media.transcript && <p className="text-sm text-slate-600 whitespace-pre-wrap">{media.transcript}</p>}
          </div>
        ) : (
          <img
            src={media.url}
            alt={media.name || "attachment"}
            draggable={false}
            className="max-h-full max-w-full rounded-xl shadow-2xl select-none"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transition: dragRef.current ? "none" : "transform .12s" }}
          />
        )}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-3 pb-5" onClick={(e) => e.stopPropagation()}>
          <Btn size="sm" variant="ghost" className="!text-white hover:!bg-white/10" onClick={() => next(-1)}>
            ◀ Prev
          </Btn>
          <span className="text-xs text-white/70 tabular-nums">
            {at + 1} / {items.length}
          </span>
          <Btn size="sm" variant="ghost" className="!text-white hover:!bg-white/10" onClick={() => next(1)}>
            Next ▶
          </Btn>
        </div>
      )}
    </div>
  );
}
