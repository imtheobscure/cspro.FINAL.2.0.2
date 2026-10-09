"use client";
import { useEffect, useRef, useState } from "react";
import { fmtCash } from "@/lib/engine";

export function RollingCash({ value, className = "" }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    const from = ref.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const dur = Math.min(900, 300 + Math.abs(to - from) / 20);
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(step);
      else ref.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={`cash-text ${className}`}>{fmtCash(shown)}</span>;
}

export function CashRain({ trigger, big }: { trigger: number; big?: boolean }) {
  const [bills, setBills] = useState<{ id: number; left: number; delay: number; dur: number }[]>([]);
  useEffect(() => {
    if (!trigger) return;
    const n = big ? 40 : 14;
    const arr = Array.from({ length: n }, (_, i) => ({ id: trigger * 100 + i, left: Math.random() * 100, delay: Math.random() * 0.6, dur: 1.6 + Math.random() * 1.2 }));
    setBills(arr);
    const t = setTimeout(() => setBills([]), 3200);
    return () => clearTimeout(t);
  }, [trigger, big]);
  return (
    <>
      {bills.map((b) => (
        <div key={b.id} className="bill" style={{ left: `${b.left}%`, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }}>
          $
        </div>
      ))}
    </>
  );
}

export function FloatingDelta({ items }: { items: { id: number; text: string; positive: boolean }[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex flex-col items-center">
      {items.map((f) => (
        <div key={f.id} className={`anim-float text-5xl font-black drop-shadow-2xl ${f.positive ? "cash-text" : "text-rose-400"}`}>
          {f.text}
        </div>
      ))}
    </div>
  );
}
