"use client";

import { useEffect, useRef, useState } from "react";
import { KEEP_TALKING } from "@/content/games-a";
import { Bar, Btn, Chip, Panel } from "@/components/ui";
import { useArena } from "@/components/arena/provider";
import { sfx } from "@/lib/audio";
import { MicMeter } from "@/lib/speech";
import { asset } from "@/lib/basePath";

export default function KeepTalking() {
  const a = useArena();
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(KEEP_TALKING[0].seconds);
  const [running, setRunning] = useState(false);
  const [level, setLevel] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const [status, setStatus] = useState<"idle" | "live" | "boom" | "defused">("idle");
  const meter = useRef<MicMeter | null>(null);
  const t = KEEP_TALKING[i % KEEP_TALKING.length];

  useEffect(() => () => meter.current?.stop(), []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((v) => {
        const quiet = level < 0.06;
        const drain = quiet ? 2 : 0.6;
        const next = Math.max(0, v - drain);
        if (quiet && v > 0) sfx("heartbeat");
        else if (Math.round(next) % 10 === 0) sfx("tick");
        if (next <= 0) {
          setRunning(false); setStatus("boom"); sfx("boom");
          a.addPoints(a.current.id, -100);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, level, a]);

  const start = async () => {
    setStatus("live"); setLeft(t.seconds); setDone([]);
    const m = new MicMeter();
    meter.current = m;
    await m.start(setLevel);
    setRunning(true);
    sfx("siren");
  };

  const tick = (k: number) => {
    if (done.includes(k)) return;
    const next = [...done, k];
    setDone(next);
    setLeft((v) => v + 5);
    sfx("coin");
    if (next.length === t.tasks.length) {
      setRunning(false); setStatus("defused"); meter.current?.stop();
      sfx("applause");
      a.addPoints(a.current.id, 400);
      a.log({ gameKey: "keeptalking", questionId: t.id, teamId: a.current.id, teamName: a.current.name, skill: "Speaking · Fluency", grammarPoint: "Sustained monologue", correct: true, points: 400, seconds: t.seconds - Math.round(left) });
    }
  };

  const next = () => {
    meter.current?.stop(); setRunning(false);
    setI((v) => v + 1); setLeft(KEEP_TALKING[(i + 1) % KEEP_TALKING.length].seconds);
    setDone([]); setStatus("idle"); a.nextTurn(); sfx("whoosh");
  };

  const pct = (left / t.seconds) * 100;

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip colour="#ef4444">Bomb {(i % KEEP_TALKING.length) + 1} of {KEEP_TALKING.length}</Chip>
        <Chip colour="#f59e0b">{a.current?.name} is defusing</Chip>
        <Btn size="sm" tone="blue" className="ml-auto" onClick={next}>Next bomb →</Btn>
      </div>

      <div className={`relative overflow-hidden rounded-3xl border-2 p-5 transition ${status === "boom" ? "animate-shake border-rose-500 bg-rose-950/60" : status === "defused" ? "border-emerald-400 bg-emerald-950/40" : "border-rose-500/40 bg-slate-950/70"}`}>
        <img src={asset("/images/bomb.svg")} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="relative">
          <p className="text-center text-xs uppercase tracking-[0.4em] text-rose-300">Keep talking or it detonates</p>
          <p className="mt-2 text-center font-mono text-7xl font-black tabular-nums" style={{ color: pct < 25 ? "#f43f5e" : pct < 60 ? "#f59e0b" : "#34d399" }}>
            {String(Math.floor(left / 60)).padStart(2, "0")}:{String(Math.floor(left % 60)).padStart(2, "0")}
          </p>
          <div className="mx-auto mt-3 max-w-xl"><Bar value={pct} colour={pct < 25 ? "#f43f5e" : "#34d399"} /></div>

          <div className="mx-auto mt-4 max-w-xl">
            <p className="mb-1 text-center text-[11px] uppercase tracking-widest text-slate-400">Microphone — silence drains the timer three times faster</p>
            <div className="flex h-6 items-end gap-0.5">
              {Array.from({ length: 40 }).map((_, k) => (
                <span key={k} className="flex-1 rounded-sm transition-all"
                  style={{ height: `${Math.max(8, Math.min(100, level * 130 - k * 1.4))}%`, background: level * 40 > k ? (k > 30 ? "#f43f5e" : k > 20 ? "#f59e0b" : "#34d399") : "rgba(255,255,255,.08)" }} />
              ))}
            </div>
          </div>

          <p className="mt-5 text-center text-2xl font-black">{t.topic}</p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {status !== "live" ? <Btn tone="red" size="lg" onClick={start}>💣 Arm the bomb</Btn>
              : <Btn tone="amber" onClick={() => { setRunning(false); meter.current?.stop(); setStatus("idle"); }}>Pause</Btn>}
            <Btn tone="ghost" onClick={() => a.say(t.topic)}>🔊 Read the topic</Btn>
          </div>

          {status === "boom" && <p className="mt-4 text-center text-4xl font-black text-rose-300">💥 BOOM — the room went quiet. (−100)</p>}
          {status === "defused" && <p className="mt-4 text-center text-4xl font-black text-emerald-300">✅ DEFUSED — every task completed. (+400)</p>}
        </div>
      </div>

      <Panel title="Task list — each one adds five seconds">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {t.tasks.map((task, k) => (
            <button key={k} onClick={() => tick(k)}
              className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${done.includes(k) ? "border-emerald-400 bg-emerald-500/15 text-emerald-200 line-through" : "border-white/15 bg-white/[0.04] hover:border-amber-300"}`}>
              {done.includes(k) ? "✓ " : "○ "}{task}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
