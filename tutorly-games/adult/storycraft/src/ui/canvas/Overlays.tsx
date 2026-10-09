import { useEffect, useState } from "react";
import type { EffectCard } from "../../engine/types";

export function EffectOverlay({ effect, onDone }: { effect: EffectCard | null; onDone: () => void }) {
  useEffect(() => {
    if (!effect) return;
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [effect, onDone]);
  if (!effect) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center">
      <div className={`aw-fx-emoji aw-anim-${effect.animation}`} style={{ textShadow: `0 0 60px ${effect.color}` }}>
        {effect.emoji}
      </div>
      <div className="absolute bottom-24 rounded-full bg-black/60 px-5 py-1.5 text-lg font-black tracking-wide text-white"
           style={{ textShadow: `0 0 20px ${effect.color}` }}>
        {effect.name}
      </div>
    </div>
  );
}

export function Countdown({ active, onDone }: { active: boolean; onDone: () => void }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    setN(3);
    let cur = 3;
    const beep = (freq: number) => {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.25, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        o.start();
        o.stop(ctx.currentTime + 0.3);
      } catch {
        /* no audio */
      }
    };
    beep(440);
    const id = setInterval(() => {
      cur -= 1;
      if (cur <= 0) {
        clearInterval(id);
        setN(0);
        beep(880);
        setTimeout(() => {
          setN(null);
          onDone();
        }, 700);
      } else {
        setN(cur);
        beep(440);
      }
    }, 800);
    return () => clearInterval(id);
  }, [active, onDone]);

  if (n === null) return null;
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm">
      <div key={n} className="aw-anim-zoom text-[200px] font-black text-white" style={{ textShadow: "0 0 80px #8b5cf6" }}>
        {n === 0 ? "GO!" : n}
      </div>
    </div>
  );
}

export function Weather({ kind }: { kind: string }) {
  if (kind === "clear" || !kind) return null;
  const glyphs: Record<string, string> = {
    rain: "|", snow: "❄", storm: "|", embers: "✦", ash: "·", dust: "•", leaves: "🍂", stars: "✦", aurora: "~", heat: "≈", bubbles: "○",
  };
  const drops = kind === "snow" || kind === "stars" ? 60 : 90;
  const color = kind === "embers" ? "text-orange-300/70" : kind === "ash" || kind === "dust" ? "text-stone-300/45" : kind === "leaves" ? "text-amber-500/70" : kind === "aurora" ? "text-emerald-300/70" : kind === "heat" ? "text-red-200/35" : kind === "bubbles" ? "text-cyan-200/55" : "text-white/40";
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {kind === "fog" && <div className="absolute inset-0 bg-gradient-to-b from-slate-300/20 via-slate-400/10 to-slate-300/20 backdrop-blur-[1px]" />}
      {kind === "aurora" && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_40%_0%,rgba(16,185,129,.28),transparent_45%),radial-gradient(ellipse_at_70%_10%,rgba(168,85,247,.22),transparent_42%)] blur-sm" />}
      {kind === "heat" && <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 via-transparent to-transparent backdrop-blur-[.5px]" />}
      {kind !== "fog" &&
        Array.from({ length: drops }).map((_, i) => (
          <span
            key={i}
            className={`absolute top-0 ${color}`}
            style={{
              left: `${Math.random() * 100}%`,
              fontSize: kind === "snow" || kind === "leaves" || kind === "bubbles" ? 18 : kind === "stars" ? 12 : 10,
              animation: `aw-rainfall ${kind === "stars" || kind === "aurora" ? 3 : 0.7 + Math.random() * 1.7}s linear ${Math.random()}s infinite`,
            }}
          >
            {glyphs[kind] ?? "·"}
          </span>
        ))}
      {kind === "storm" && <StormFlash />}
    </div>
  );
}

function StormFlash() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setOn(true);
      setTimeout(() => setOn(false), 120);
    }, 3500 + Math.random() * 3000);
    return () => clearInterval(id);
  }, []);
  return <div className="absolute inset-0 bg-white transition-opacity duration-100" style={{ opacity: on ? 0.5 : 0 }} />;
}

export function JumpScare({ data, onDone }: { data: { emoji: string } | null; onDone: () => void }) {
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, [data, onDone]);
  if (!data) return null;
  return (
    <div className="absolute inset-0 z-[60] grid place-items-center bg-black aw-anim-flash">
      <div className="text-[280px] aw-anim-zoom">{data.emoji}</div>
    </div>
  );
}

export function Celebration({ items }: { items: { id: string; emoji: string }[] }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-10 z-40 flex justify-center gap-4">
      {items.map((c) => (
        <span key={c.id} className="text-5xl" style={{ animation: "aw-celebrate 1.4s ease-out forwards" }}>
          {c.emoji}
        </span>
      ))}
    </div>
  );
}
