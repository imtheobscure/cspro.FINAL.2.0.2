"use client";

import { useEffect, useState } from "react";

export function Confetti({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<{ id: number; left: number; delay: number; color: string; emoji?: string }[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const colors = ["#ffd23f", "#6d5efc", "#22d3ee", "#34d399", "#ef4444", "#f97316"];
    const emojis = ["💵", "💰", "⭐", "🎉", "✨"];
    const batch = Array.from({ length: 60 }, (_, i) => ({
      id: trigger * 1000 + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      color: colors[Math.floor(Math.random() * colors.length)],
      emoji: Math.random() > 0.6 ? emojis[Math.floor(Math.random() * emojis.length)] : undefined,
    }));
    setPieces(batch);
    const t = setTimeout(() => setPieces([]), 2600);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-10vh",
            fontSize: p.emoji ? 26 : 12,
            width: p.emoji ? "auto" : 10,
            height: p.emoji ? "auto" : 16,
            background: p.emoji ? "transparent" : p.color,
            borderRadius: 2,
            animation: `confettiFall ${1.8 + Math.random()}s ${p.delay}s ease-in forwards`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

export interface FloatText {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

export function FloatingTexts({ items }: { items: FloatText[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[95]">
      {items.map((f) => (
        <div
          key={f.id}
          className="anim-float-up absolute money text-3xl md:text-5xl"
          style={{ left: f.x, top: f.y, color: f.color, transform: "translate(-50%,-50%)" }}
        >
          {f.text}
        </div>
      ))}
    </div>
  );
}
