import React, { useEffect, useState } from "react";

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0); // 0=enter, 1=hold, 2=exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(() => onComplete(), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-700"
      style={{ opacity: phase === 2 ? 0 : 1 }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-[2000ms]"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)",
            transform: `translate(-50%, -50%) scale(${phase >= 1 ? 1.5 : 0.3})`,
            opacity: phase >= 1 ? 1 : 0,
          }}
        />
        {/* Floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="splash-particle"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Logo & text */}
      <div
        className="relative z-10 flex flex-col items-center transition-all duration-700"
        style={{
          transform: phase >= 1 ? "translateY(0) scale(1)" : "translateY(30px) scale(0.8)",
          opacity: phase >= 1 ? 1 : 0,
        }}
      >
        {/* Icon */}
        <div className="mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-blue-500 via-violet-500 to-indigo-600 shadow-2xl shadow-blue-500/30">
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none">
            <path d="M14 18h36" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.9">
              <animate attributeName="x2" values="30;50;50" dur="1.5s" fill="freeze" />
            </path>
            <path d="M14 30h26" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.7">
              <animate attributeName="x2" values="20;40;40" dur="1.5s" begin="0.15s" fill="freeze" />
            </path>
            <path d="M14 42h32" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.5">
              <animate attributeName="x2" values="22;46;46" dur="1.5s" begin="0.3s" fill="freeze" />
            </path>
            <path d="M48 36l10 5-10 5z" fill="#fbbf24" opacity="0.9">
              <animate attributeName="opacity" values="0;0.9;0.9" dur="1s" begin="0.8s" fill="freeze" />
            </path>
          </svg>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white">
          Tutorly Prompter
        </h1>
        <p
          className="mt-2 text-sm text-slate-400 transition-opacity duration-700"
          style={{ opacity: phase >= 1 ? 1 : 0, transitionDelay: "400ms" }}
        >
          Your personal teaching companion
        </p>

        {/* Loading bar */}
        <div className="mt-8 h-0.5 w-48 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-blue-400 transition-all duration-[2000ms] ease-out"
            style={{ width: phase >= 1 ? "100%" : "0%" }}
          />
        </div>
      </div>
    </div>
  );
};
