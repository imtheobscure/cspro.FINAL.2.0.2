import { useEffect, useRef, useState } from "react";
import { useStore, store, useBus } from "../state/store";
import { avatarForName } from "../lib/avatars";
import { cn } from "../utils/cn";

interface Props {
  onOpenPanel: () => void;
  onOpenTutor: () => void;
}

export default function AvatarWidget({ onOpenPanel, onOpenTutor }: Props) {
  const speaker = useStore((s) => s.speaker);
  const npcs = useStore((s) => s.npcs);
  const tutor = useStore((s) => s.tutor);

  // SINGLE SOURCE OF TRUTH:
  // The widget must always reflect the active speaker from store.speaker.
  // If an NPC is speaking, show THAT NPC.
  // Otherwise always show Tutor.
  const activeSpeakerNpc = speaker.speaking && speaker.npcId
    ? npcs.find((n) => n.id === speaker.npcId) ?? null
    : null;

  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem("widget-pos");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: 24, y: window.innerHeight - 120 };
  });

  const dragRef = useRef<{ ox: number; oy: number; dragging: boolean }>({
    ox: 0,
    oy: 0,
    dragging: false,
  });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const [floaters, setFloaters] = useState<{ id: string; emoji: string; tx: number }[]>([]);

  useEffect(() => {
    localStorage.setItem("widget-pos", JSON.stringify(pos));
  }, [pos]);

  useBus((ev) => {
    if (ev.type === "floating-emoji") {
      const id = Math.random().toString(36).slice(2);
      const tx = (Math.random() - 0.5) * 80;
      setFloaters((f) => [...f, { id, emoji: ev.payload.emoji, tx }]);
      setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2000);
    }
  });

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    movedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragRef.current.dragging = true;
    dragRef.current.ox = e.clientX - pos.x;
    dragRef.current.oy = e.clientY - pos.y;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragRef.current.dragging) return;
    const dist = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
    if (dist > 5) movedRef.current = true;
    if (!movedRef.current) return;
    setPos({
      x: Math.max(8, Math.min(window.innerWidth - 80, e.clientX - dragRef.current.ox)),
      y: Math.max(8, Math.min(window.innerHeight - 80, e.clientY - dragRef.current.oy)),
    });
  }

  function onMouseUp() {
    dragRef.current.dragging = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  function handleClick() {
    if (movedRef.current) return;
    store.set((s) => ({ ...s, settings: { ...s.settings, panelOpen: !s.settings.panelOpen } }));
    onOpenPanel();
  }

  // Use ONLY the currently active speaker, never any remembered previous one.
  const name = activeSpeakerNpc?.name || tutor.name || "Tutor Academy";
  const avatar = activeSpeakerNpc?.avatar || tutor.avatar || avatarForName(name);
  const speaking = !!activeSpeakerNpc;
  const emoji = speaker.emoji;

  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[60] select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenTutor();
      }}
    >
      <div
        className="relative cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onClick={handleClick}
        title="Click: open chat • Right-click: Tutor Control • Drag to move"
      >
        {speaking && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
            <span className="absolute -inset-1 rounded-full ring-2 ring-emerald-400/60 animate-pulse" />
          </>
        )}

        <div
          className={cn(
            "relative w-16 h-16 rounded-full bg-gradient-to-br from-white to-slate-100 border-2 border-white shadow-xl overflow-hidden flex items-center justify-center",
            speaking ? "ring-2 ring-emerald-400" : "ring-1 ring-slate-200",
          )}
        >
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
          {emoji && speaking && (
            <span
              key={emoji + speaker.text.slice(0, 5)}
              className="absolute -top-2 -right-2 text-2xl drop-shadow"
              style={{ animation: "popReact 1.6s ease-out infinite" }}
            >
              {emoji}
            </span>
          )}
        </div>

        <span
          className={cn(
            "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white",
            speaking ? "bg-emerald-500 animate-pulse" : "bg-slate-300",
          )}
        />

        <div
          className={cn(
            "absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[10px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded-full",
            speaking ? "bg-emerald-100 text-emerald-700" : "bg-white/80 text-slate-500",
          )}
        >
          {name}
        </div>

        {speaking && speaker.text && (
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 max-w-xs whitespace-normal bg-white border border-slate-200 shadow-xl rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-slate-700 z-10">
            <div className="font-semibold text-indigo-600 text-[10px] uppercase tracking-wider mb-0.5">
              {name}
            </div>
            <div className="line-clamp-3">{stripHtml(speaker.text)}</div>
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none">
          {floaters.map((f) => (
            <span
              key={f.id}
              className="absolute left-1/2 top-0 text-2xl"
              style={{
                animation: "floatUp 2s ease-out forwards",
                ["--tx" as any]: `${f.tx}px`,
              }}
            >
              {f.emoji}
            </span>
          ))}
        </div>
      </div>

      <style>{`
@keyframes floatUp {
  0%   { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
  20%  { opacity: 1; transform: translate(calc(-50% + var(--tx, 0px) * 0.3), -20px) scale(1.1); }
  100% { transform: translate(calc(-50% + var(--tx, 0px)), -120px) scale(0.8); opacity: 0; }
}
@keyframes popReact {
  0%,100% { transform: scale(1) rotate(-8deg); }
  50%     { transform: scale(1.3) rotate(8deg); }
}
      `}</style>
    </div>
  );
}

function stripHtml(html: string) {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent || "";
}
