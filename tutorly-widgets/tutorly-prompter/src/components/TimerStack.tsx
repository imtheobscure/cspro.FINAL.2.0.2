import React, { useEffect, useRef, useState } from "react";
import { Pill } from "./ui";
import { Plus, Pause, Play, X, RotateCw, Clock } from "lucide-react";

export interface ActiveTimer {
  id: string;
  label: string;
  totalSec: number;
  remainingSec: number;
  running: boolean;
  kind: "activity" | "wait" | "custom";
}

export interface TimerStackProps {
  timers: ActiveTimer[];
  lessonStartAt: number | null;
  targetMinutes: number;
  onChange: (timers: ActiveTimer[]) => void;
  onAdd: (label: string, sec: number, kind?: "activity" | "wait" | "custom") => void;
}

const PRESETS = [
  { label: "1m", sec: 60 },
  { label: "2m", sec: 120 },
  { label: "3m", sec: 180 },
  { label: "5m", sec: 300 },
  { label: "10m", sec: 600 },
];

export const TimerStack: React.FC<TimerStackProps> = ({
  timers, lessonStartAt, targetMinutes, onChange, onAdd,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [customMin, setCustomMin] = useState("");
  const lastTickRef = useRef<number>(performance.now());
  const [, forceUpdate] = useState(0);

  // Tick all running timers
  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      const dt = (t - lastTickRef.current) / 1000;
      lastTickRef.current = t;
      let changed = false;
      const next = timers.map((tm) => {
        if (!tm.running) return tm;
        const r = Math.max(0, tm.remainingSec - dt);
        if (r !== tm.remainingSec) changed = true;
        return { ...tm, remainingSec: r, running: r > 0 };
      });
      if (changed) onChange(next);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [timers, onChange]);

  // Lesson clock tick every second
  useEffect(() => {
    if (!lessonStartAt) return;
    const iv = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, [lessonStartAt]);

  const lessonElapsedSec = lessonStartAt ? Math.floor((Date.now() - lessonStartAt) / 1000) : 0;
  const lessonTotalSec = targetMinutes * 60;
  const lessonRemaining = Math.max(0, lessonTotalSec - lessonElapsedSec);
  const lessonPct = lessonTotalSec > 0 ? Math.min(100, (lessonElapsedSec / lessonTotalSec) * 100) : 0;

  function addCustomTimer() {
    const mins = parseFloat(customMin);
    if (!mins || mins <= 0) return;
    onAdd(`${mins}min timer`, Math.round(mins * 60), "custom");
    setCustomMin("");
  }

  return (
    <div className="relative z-20 border-t border-white/10 bg-black/50 px-3 py-2 text-xs backdrop-blur">
      {/* Class time bar */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-blue-400" />
          <span className="font-mono text-slate-200">{fmt(lessonElapsedSec)}</span>
          <div className="relative h-1.5 w-32 rounded-full bg-white/10 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
              style={{
                width: `${lessonPct}%`,
                background: lessonRemaining < 120 ? "#ef4444" : lessonRemaining < 300 ? "#f59e0b" : "#3b82f6",
              }}
            />
          </div>
          <span className="font-mono text-slate-400">{fmt(lessonTotalSec)}</span>
          <Pill color={lessonRemaining < 60 ? "rose" : lessonRemaining < 180 ? "amber" : "slate"}>
            {fmt(lessonRemaining)} left
          </Pill>
        </div>
        <div className="flex items-center gap-1">
          {PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => onAdd(`${p.label}`, p.sec, "custom")}
              className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-white/10 transition"
            >
              +{p.label}
            </button>
          ))}
          {/* Custom timer input */}
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCustomTimer(); }}
            placeholder="min"
            className="h-5 w-12 rounded border border-white/10 bg-slate-900/60 px-1 text-center text-[10px] text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
          <button onClick={addCustomTimer} className="rounded bg-blue-600/80 px-1.5 py-0.5 text-[10px] text-white hover:bg-blue-500">
            <Plus className="h-3 w-3 inline" />
          </button>
          {timers.length > 0 && (
            <button onClick={() => setExpanded((e) => !e)} className="text-slate-400 hover:text-white text-[10px] ml-1">
              {expanded ? "▾" : `▸ (${timers.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Active timers */}
      {expanded && timers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {timers.map((tm) => (
            <TimerChip key={tm.id} t={tm}
              onToggle={() => onChange(timers.map(x => x.id === tm.id ? { ...x, running: !x.running, remainingSec: x.remainingSec || x.totalSec } : x))}
              onReset={() => onChange(timers.map(x => x.id === tm.id ? { ...x, remainingSec: x.totalSec, running: true } : x))}
              onRemove={() => onChange(timers.filter(x => x.id !== tm.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TimerChip: React.FC<{ t: ActiveTimer; onToggle: () => void; onReset: () => void; onRemove: () => void }> = ({ t, onToggle, onReset, onRemove }) => {
  const pct = t.totalSec ? Math.max(0, Math.min(100, (t.remainingSec / t.totalSec) * 100)) : 0;
  const done = t.remainingSec <= 0;
  return (
    <div className={`relative overflow-hidden rounded-lg border px-2.5 py-1.5 text-xs ${done ? "border-rose-500/40 bg-rose-500/10 animate-pulse" : "border-white/10 bg-slate-900/50"}`}>
      <div className="absolute inset-y-0 left-0 bg-blue-500/15" style={{ width: `${pct}%` }} aria-hidden />
      <div className="relative flex items-center gap-1.5">
        <span className="max-w-[12ch] truncate text-slate-200">{t.label}</span>
        <span className={`font-mono ${done ? "text-rose-300 font-bold" : "text-slate-100"}`}>
          {done ? "TIME!" : fmt(Math.ceil(t.remainingSec))}
        </span>
        <button onClick={onToggle} className="rounded p-0.5 hover:bg-white/10">{t.running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}</button>
        <button onClick={onReset} className="rounded p-0.5 hover:bg-white/10"><RotateCw className="h-3 w-3" /></button>
        <button onClick={onRemove} className="rounded p-0.5 hover:bg-white/10"><X className="h-3 w-3" /></button>
      </div>
    </div>
  );
};

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
