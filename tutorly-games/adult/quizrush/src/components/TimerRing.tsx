"use client";

export default function TimerRing({
  seconds,
  total,
  frozen,
}: {
  seconds: number;
  total: number;
  frozen?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, seconds / total));
  const r = 34;
  const circ = 2 * Math.PI * r;
  const color = frozen ? "#22d3ee" : seconds <= 5 ? "#ef4444" : seconds <= 10 ? "#f59e0b" : "#22c55e";
  return (
    <div className={`relative h-20 w-20 md:h-24 md:w-24 ${frozen ? "anim-ring" : ""}`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-2xl md:text-3xl font-black" style={{ color }}>
        {frozen ? "❄️" : seconds}
      </div>
    </div>
  );
}
