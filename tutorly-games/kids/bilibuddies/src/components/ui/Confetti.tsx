"use client";

import { useEffect, useMemo, useState } from "react";

const COLORS = ["#FF8A5B", "#FFC145", "#35B79A", "#5AA2EC", "#A98BE0", "#F2A7C3"];

type Bit = { id: number; left: number; dx: number; dur: number; rot: number; color: string; size: number; round: boolean };

/** soft paper confetti — falls once, no flashing, no sound */
export function Confetti({ on, count = 60, burstKey = 0 }: { on: boolean; count?: number; burstKey?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!on) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [on, burstKey]);

  const bits = useMemo<Bit[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 220,
        dur: 2 + Math.random() * 1.6,
        rot: 360 + Math.random() * 720,
        color: COLORS[i % COLORS.length],
        size: 9 + Math.random() * 12,
        round: Math.random() > 0.55,
      })),
    [count],
  );

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden="true">
      {bits.map((b) => (
        <span
          key={`${burstKey}-${b.id}`}
          className="confetti-bit"
          style={
            {
              left: `${b.left}%`,
              width: b.size,
              height: b.round ? b.size : b.size * 1.5,
              borderRadius: b.round ? "50%" : 4,
              background: b.color,
              "--dx": `${b.dx}px`,
              "--rot": `${b.rot}deg`,
              "--dur": `${b.dur}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** little stars that pop out around a point of success */
export function StarBurst({ on, burstKey = 0 }: { on: boolean; burstKey?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!on) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 900);
    return () => clearTimeout(t);
  }, [on, burstKey]);
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="star-fly absolute text-[2.4rem]"
          style={{
            transform: `rotate(${i * 60}deg) translateY(-90px)`,
            animationDelay: `${i * 0.05}s`,
          }}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}
