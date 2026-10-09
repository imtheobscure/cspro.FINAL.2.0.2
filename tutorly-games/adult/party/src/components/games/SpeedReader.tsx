"use client";

import { useEffect, useRef, useState } from "react";
import { SPEED_TEXTS } from "@/content/games-a";
import { Bar, Btn, Chip, Panel } from "@/components/ui";
import { useArena } from "@/components/arena/provider";
import { sfx } from "@/lib/audio";
import { Listener, normalise, recognitionSupported, scoreReading } from "@/lib/speech";

type Take = { take: number; wpm: number; accuracy: number; missed: string[]; seconds: number };

export default function SpeedReader() {
  const a = useArena();
  const [ti, setTi] = useState(0);
  const [takes, setTakes] = useState<Take[]>([]);
  const [live, setLive] = useState("");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const listener = useRef<Listener | null>(null);
  const started = useRef(0);

  const text = SPEED_TEXTS[ti];
  const words = text.text.split(/\s+/);
  const result = scoreReading(text.text, live);
  const round = takes.length + 1;
  const best = takes.reduce((m, t) => Math.max(m, t.wpm), 0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds(Math.round((Date.now() - started.current) / 100) / 10), 100);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => () => listener.current?.stop(), []);

  const start = () => {
    setLive(""); setSeconds(0);
    started.current = Date.now();
    const l = new Listener((final, interim) => setLive(`${final} ${interim}`));
    listener.current = l;
    const ok = l.start();
    setRunning(true);
    sfx(ok ? "chime" : "wrong");
  };

  const stop = () => {
    listener.current?.stop();
    setRunning(false);
    const secs = Math.max(1, (Date.now() - started.current) / 1000);
    const r = scoreReading(text.text, live);
    const wpm = Math.round((r.correct / secs) * 60);
    const take: Take = { take: round, wpm, accuracy: r.accuracy, missed: r.missed.slice(0, 12), seconds: Math.round(secs) };
    setTakes((t) => [...t, take]);
    sfx(r.accuracy > 80 ? "correct" : "buzz");
    a.log({
      gameKey: "speed", questionId: text.id, teamId: a.current.id, teamName: a.current.name,
      skill: "Speaking · Read aloud", grammarPoint: "Pronunciation & fluency", correct: r.accuracy >= 80,
      points: Math.round(r.accuracy), seconds: Math.round(secs), detail: { wpm, missed: take.missed },
    });
    if (r.accuracy >= 80) a.addPoints(a.current.id, 100 + Math.max(0, wpm - 90));
  };

  const nextText = () => { setTi((v) => (v + 1) % SPEED_TEXTS.length); setTakes([]); setLive(""); sfx("whoosh"); };

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip colour="#22d3ee">Take {Math.min(round, 5)} of 5</Chip>
        <Chip colour="#f59e0b">target {text.targetWpm} wpm</Chip>
        {best > 0 && <Chip colour="#34d399">record {best} wpm</Chip>}
        <span className="ml-auto text-xs text-slate-400">{recognitionSupported() ? "Speech recognition ready" : "This browser has no speech recognition — score by ear with the tutor buttons."}</span>
      </div>

      <Panel title={`${text.title} — read it aloud`} right={<Btn size="sm" tone="ghost" onClick={nextText}>Next text →</Btn>}>
        <p className="text-2xl leading-relaxed">
          {words.map((w, i) => {
            const clean = normalise(w);
            const hit = result.hit[i];
            return (
              <span key={i} className={`transition-colors ${hit ? "text-emerald-300" : running ? "text-slate-500" : "text-slate-200"} ${text.watchWords.some((x) => normalise(x) === clean) ? "underline decoration-amber-400/70 decoration-2 underline-offset-4" : ""}`}>
                {w}{" "}
              </span>
            );
          })}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Words matched" value={`${result.correct}/${result.total}`} />
          <Metric label="Accuracy" value={`${result.accuracy}%`} tone="#34d399" />
          <Metric label="Elapsed" value={`${seconds.toFixed(1)}s`} tone="#f59e0b" />
        </div>
        <div className="mt-2"><Bar value={result.accuracy} colour={result.accuracy > 80 ? "#34d399" : "#f59e0b"} /></div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!running
            ? <Btn tone="red" size="lg" onClick={start} disabled={takes.length >= 5}>🎙 Record take {Math.min(round, 5)}</Btn>
            : <Btn tone="amber" size="lg" onClick={stop}>■ Stop & score</Btn>}
          <Btn tone="ghost" onClick={() => a.say(text.text)}>🔊 Hear a model</Btn>
          <Btn tone="ghost" onClick={() => { setTakes([]); setLive(""); }}>Reset takes</Btn>
        </div>
        {live && <p className="mt-3 rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-2 text-sm text-cyan-100">🎙 {live}</p>}
      </Panel>

      {takes.length > 0 && (
        <Panel title="Report">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-slate-500">
              <tr><th className="py-1">Take</th><th>WPM</th><th>Accuracy</th><th>Time</th><th>Problem words</th></tr>
            </thead>
            <tbody>
              {takes.map((t) => (
                <tr key={t.take} className="border-t border-white/5">
                  <td className="py-1.5 font-black">{t.take}</td>
                  <td className="tabular-nums">{t.wpm}</td>
                  <td className="tabular-nums" style={{ color: t.accuracy > 80 ? "#34d399" : "#fb7185" }}>{t.accuracy}%</td>
                  <td className="tabular-nums">{t.seconds}s</td>
                  <td className="text-xs text-amber-200">{t.missed.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {takes.length >= 5 && (
            <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              Five takes complete. Best {best} wpm. Drill the words in amber, then run the next text.
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}

function Metric({ label, value, tone = "#38bdf8" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-2xl font-black" style={{ color: tone }}>{value}</p>
    </div>
  );
}
