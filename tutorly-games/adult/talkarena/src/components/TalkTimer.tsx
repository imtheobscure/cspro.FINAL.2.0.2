import { useEffect, useRef, useState } from 'react';
import { Btn, Meter } from './ui';
import { MicMeter } from '../lib/speech';
import { useGame } from '../store/GameContext';
import { audio } from '../lib/audio';
import { cn } from '../utils/cn';

/**
 * The heart of the whole app: a timer that only counts what the room actually says.
 * It listens to the microphone, measures real speech energy and credits the seconds
 * to the team, so "talk time" in the report is measured, not guessed.
 */
export default function TalkTimer({
  seconds = 45,
  teamId,
  task,
  onSpeak,
}: {
  seconds?: number;
  teamId: string | null;
  task: string;
  onSpeak?: () => void;
}) {
  const { addTalk, teams, talk } = useGame();
  const [left, setLeft] = useState(0);
  const [level, setLevel] = useState(0);
  const [spoken, setSpoken] = useState(0);
  const meter = useRef<MicMeter | null>(null);
  const team = teams.find((t) => t.id === teamId);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    if (left === 1) {
      audio.buzz();
      meter.current?.stop();
      meter.current = null;
      setLevel(0);
    }
    return () => clearTimeout(t);
  }, [left]);

  useEffect(() => () => meter.current?.stop(), []);

  const start = async () => {
    setLeft(seconds);
    setSpoken(0);
    audio.whoosh();
    const m = new MicMeter();
    let acc = 0;
    m.onTick = (lv, ms) => {
      setLevel(lv);
      setSpoken(Math.round(ms / 100) / 10);
      if (ms - acc > 1000) {
        if (teamId) addTalk(teamId, ms - acc);
        acc = ms;
      }
    };
    const ok = await m.start();
    if (ok) meter.current = m;
  };

  const stop = () => {
    setLeft(0);
    meter.current?.stop();
    meter.current = null;
    setLevel(0);
  };

  return (
    <div className="rounded-3xl border-4 border-amber-300 bg-amber-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black uppercase tracking-wide text-amber-700">
            Talk task — measured live from the microphone
          </div>
          <p className="text-2xl font-bold text-slate-800">{task}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('rounded-2xl px-4 py-2 text-4xl font-black tabular-nums', left > 0 && left <= 8 ? 'bg-rose-100 text-rose-700' : 'text-amber-700')}>
            {left > 0 ? `${left}s` : '—'}
          </div>
          {left > 0 ? (
            <Btn variant="danger" onClick={stop}>■ Stop</Btn>
          ) : (
            <Btn variant="warm" onClick={() => void start()}>🎙 Start {seconds}s talk</Btn>
          )}
          {onSpeak && <Btn size="sm" onClick={onSpeak}>🔊</Btn>}
        </div>
      </div>
      {left > 0 && (
        <div className="mt-3 space-y-2">
          <Meter value={left / seconds} tone="#d97706" />
          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm font-black uppercase text-slate-500">Voice level</span>
            <div className="flex-1"><Meter value={level} tone={level > 0.12 ? '#059669' : '#cbd5e1'} height={12} /></div>
            <span className="tabular-nums text-sm font-black text-slate-600">{spoken}s spoken</span>
          </div>
          {team && (
            <p className="text-sm font-bold" style={{ color: team.color }}>
              Credited to {team.emoji} {team.name} · session total {Math.round((talk[team.id] ?? 0) / 1000)}s
            </p>
          )}
        </div>
      )}
    </div>
  );
}
