import { useEffect, useRef, useState } from "react";
import { useStore, store } from "../state/store";
import { Btn, TInput } from "../ui/primitives";
import { alarmStart, stopAlarm } from "../lib/sounds";

// Two timers:
// 1) Class Timer: schedule class start, alarm 10 min before
// 2) Countdown Timer: circular, fullscreen optional, alarm on zero

export function ClassTimerWidget() {
  const ct = useStore((s) => s.classTimer);
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [alarming, setAlarming] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!ct.targetTs) return;
      const remaining = ct.targetTs - Date.now();
      if (remaining <= 0 && !ct.reminded) {
        // class started time - keep counting
      }
      if (remaining > 0 && remaining <= 10 * 60 * 1000 && !ct.reminded) {
        store.set((s) => {
          s.classTimer = { ...s.classTimer, reminded: true };
          return { ...s };
        });
        alarmStart();
        setAlarming(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [ct]);

  function set() {
    const t = Date.now() + minutes * 60 * 1000;
    store.set((s) => {
      s.classTimer = { targetTs: t, duration: minutes * 60, reminded: false };
      return { ...s };
    });
    setEditing(false);
  }

  function clearTimer() {
    stopAlarm();
    setAlarming(false);
    store.set((s) => {
      s.classTimer = { targetTs: null, duration: 0, reminded: false };
      return { ...s };
    });
  }

  return (
    <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-lg px-3 py-2 flex items-center gap-2">
      <span className="text-lg">⏰</span>
      {alarming ? (
        <>
          <span className="text-rose-600 font-bold text-sm animate-pulse">10 min warning!</span>
          <Btn size="sm" variant="danger" onClick={() => { stopAlarm(); setAlarming(false); }}>Stop</Btn>
        </>
      ) : ct.targetTs ? (
        <ClassCountdown targetTs={ct.targetTs} onClear={clearTimer} />
      ) : editing ? (
        <>
          <TInput
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 !py-1"
          />
          <span className="text-xs text-slate-500">min until class</span>
          <Btn size="sm" variant="primary" onClick={set}>Set</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setEditing(false)}>✕</Btn>
        </>
      ) : (
        <Btn size="sm" variant="ghost" onClick={() => setEditing(true)}>Set class timer</Btn>
      )}
    </div>
  );
}

function ClassCountdown({ targetTs, onClear }: { targetTs: number; onClear: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, targetTs - now);
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return (
    <>
      <span className="font-mono text-sm font-semibold text-slate-700">{m}:{s.toString().padStart(2, "0")}</span>
      <span className="text-[10px] text-slate-500">to class</span>
      <Btn size="sm" variant="ghost" onClick={onClear}>✕</Btn>
    </>
  );
}

// Cool circular countdown timer
export function CountdownTimerWidget() {
  const ct = useStore((s) => s.countdownTimer);
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState(Math.floor(ct.duration / 60));
  const [seconds, setSeconds] = useState(ct.duration % 60);
  const tickRef = useRef<number | null>(null);
  const [alarming, setAlarming] = useState(false);

  useEffect(() => {
    if (ct.running) {
      tickRef.current = window.setInterval(() => {
        const cur = store.get().countdownTimer;
        if (cur.remaining <= 1) {
          store.set((s) => {
            s.countdownTimer = { ...s.countdownTimer, remaining: 0, running: false };
            return { ...s };
          });
          alarmStart();
          setAlarming(true);
        } else {
          store.set((s) => {
            s.countdownTimer = { ...s.countdownTimer, remaining: s.countdownTimer.remaining - 1 };
            return { ...s };
          });
        }
      }, 1000);
    }
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [ct.running]);

  function start() {
    store.set((s) => {
      s.countdownTimer = { ...s.countdownTimer, running: true };
      return { ...s };
    });
  }
  function pause() {
    store.set((s) => {
      s.countdownTimer = { ...s.countdownTimer, running: false };
      return { ...s };
    });
  }
  function reset() {
    store.set((s) => {
      s.countdownTimer = { ...s.countdownTimer, remaining: s.countdownTimer.duration, running: false };
      return { ...s };
    });
    stopAlarm();
    setAlarming(false);
  }
  function applyEdit() {
    const dur = minutes * 60 + seconds;
    store.set((s) => {
      s.countdownTimer = { ...s.countdownTimer, duration: dur, remaining: dur };
      return { ...s };
    });
    setEditing(false);
  }
  function fs() {
    store.set((s) => {
      s.countdownTimer = { ...s.countdownTimer, fullscreen: !s.countdownTimer.fullscreen };
      return { ...s };
    });
  }
  function stopAlarming() {
    stopAlarm();
    setAlarming(false);
    reset();
  }

  const total = ct.duration || 1;
  const pct = ct.remaining / total;
  const mm = Math.floor(ct.remaining / 60);
  const ss = ct.remaining % 60;

  const ring = (size: number, strokeW: number) => {
    const r = (size - strokeW) / 2;
    const c = 2 * Math.PI * r;
    return (
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={strokeW} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#g1)"
          strokeWidth={strokeW}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  if (ct.fullscreen || alarming) {
    return (
      <div className={"fixed inset-0 z-[70] flex items-center justify-center " + (alarming ? "bg-rose-600 animate-pulse" : "bg-white")}>
        <div className="relative flex flex-col items-center">
          <div className="relative">
            {ring(420, 18)}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={"font-mono font-bold tabular-nums " + (alarming ? "text-white" : "text-slate-800")} style={{ fontSize: 96 }}>
                {mm}:{ss.toString().padStart(2, "0")}
              </div>
              <div className={"text-sm uppercase tracking-widest mt-2 " + (alarming ? "text-white" : "text-slate-500")}>
                {alarming ? "TIME'S UP!" : ct.running ? "Running" : "Paused"}
              </div>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2">
            {alarming ? (
              <Btn size="lg" variant="primary" onClick={stopAlarming}>🔕 Stop Alarm</Btn>
            ) : (
              <>
                {ct.running ? (
                  <Btn size="lg" variant="ghost" onClick={pause}>⏸ Pause</Btn>
                ) : (
                  <Btn size="lg" variant="success" onClick={start}>▶ Start</Btn>
                )}
                <Btn size="lg" variant="ghost" onClick={reset}>↺ Reset</Btn>
                <Btn size="lg" variant="ghost" onClick={fs}>⛶ Exit</Btn>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-lg p-2 flex items-center gap-2">
      <div className="relative">
        {ring(56, 5)}
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-semibold text-slate-700">
          {mm}:{ss.toString().padStart(2, "0")}
        </div>
      </div>
      {editing ? (
        <>
          <TInput type="number" value={minutes} onChange={(e) => setMinutes(Math.max(0, Number(e.target.value) || 0))} className="w-14 !py-1" />
          <span className="text-xs">:</span>
          <TInput type="number" value={seconds} onChange={(e) => setSeconds(Math.max(0, Math.min(59, Number(e.target.value) || 0)))} className="w-14 !py-1" />
          <Btn size="sm" variant="primary" onClick={applyEdit}>OK</Btn>
        </>
      ) : (
        <>
          {ct.running ? (
            <Btn size="sm" variant="ghost" onClick={pause}>⏸</Btn>
          ) : (
            <Btn size="sm" variant="success" onClick={start}>▶</Btn>
          )}
          <Btn size="sm" variant="ghost" onClick={reset} title="Reset">↺</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setEditing(true)} title="Edit">✎</Btn>
          <Btn size="sm" variant="ghost" onClick={fs} title="Fullscreen">⛶</Btn>
        </>
      )}
    </div>
  );
}
