import { useEffect, useRef, useState } from "react";
import { store } from "../../engine/store";

interface Ptr { id: string; x: number; y: number; color: string; name: string; ts: number }

// Lightweight cross-window pointer presence using a dedicated BroadcastChannel.
const COLORS = ["#f43f5e", "#22c55e", "#3b82f6", "#eab308", "#ec4899", "#14b8a6"];

export function Pointers() {
  const [others, setOthers] = useState<Record<string, Ptr>>({});
  const me = useRef({ id: store.origin, color: COLORS[Math.floor(Math.random() * COLORS.length)], name: "Peer-" + store.origin.slice(0, 3) });
  const bc = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const ch = new BroadcastChannel("storycraft-pointers");
    bc.current = ch;
    ch.onmessage = (e: MessageEvent<Ptr>) => {
      const p = e.data;
      if (p.id === me.current.id) return;
      setOthers((o) => ({ ...o, [p.id]: p }));
    };
    const onMove = (ev: MouseEvent) => {
      ch.postMessage({ id: me.current.id, x: ev.clientX / window.innerWidth, y: ev.clientY / window.innerHeight, color: me.current.color, name: me.current.name, ts: Date.now() });
    };
    window.addEventListener("mousemove", onMove);
    const gc = setInterval(() => {
      setOthers((o) => {
        const now = Date.now();
        const next: Record<string, Ptr> = {};
        for (const k in o) if (now - o[k].ts < 4000) next[k] = o[k];
        return next;
      });
    }, 2000);
    return () => { window.removeEventListener("mousemove", onMove); ch.close(); clearInterval(gc); };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-[55]">
      {Object.values(others).map((p) => (
        <div key={p.id} className="absolute -translate-x-1 -translate-y-1 transition-all duration-75"
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={p.color} style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,.6))` }}>
            <path d="M3 2l7 18 2.5-7L20 10z" />
          </svg>
          <span className="ml-3 rounded px-1 text-[10px] font-bold text-white" style={{ background: p.color }}>{p.name}</span>
        </div>
      ))}
    </div>
  );
}
