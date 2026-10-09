import { useMemo, useState } from 'react';
import { Avatar, Btn, Card, Chip, Meter } from '../components/ui';
import { useGame } from '../store/GameContext';
import { useNarrator } from '../lib/useNarrator';
import { audio } from '../lib/audio';
import { speakCast } from '../lib/speech';
import { cn } from '../utils/cn';

export default function Report({ onReask, onTeach }: { onReask: (ids: string[]) => void; onTeach: () => void }) {
  const { log, teams, players, scores, pack, talk, clearLog, resetScores, settings } = useGame();
  const { say } = useNarrator();
  const [copied, setCopied] = useState('');

  const misses = log.filter((l) => !l.correct);
  const accuracy = log.length ? (log.length - misses.length) / log.length : 0;

  const group = (key: 'grammarPoint' | 'skill' | 'subSkill') => {
    const m = new Map<string, { n: number; ms: number; ids: string[] }>();
    misses.forEach((l) => {
      const cur = m.get(l[key]) ?? { n: 0, ms: 0, ids: [] };
      cur.n++; cur.ms += l.ms; cur.ids.push(l.qid);
      m.set(l[key], cur);
    });
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n || b[1].ms - a[1].ms);
  };

  const byGrammar = useMemo(() => group('grammarPoint'), [log]); // eslint-disable-line react-hooks/exhaustive-deps
  const bySkill = useMemo(() => group('skill'), [log]); // eslint-disable-line react-hooks/exhaustive-deps
  const bySub = useMemo(() => group('subSkill'), [log]); // eslint-disable-line react-hooks/exhaustive-deps
  const weakest = bySub[0];

  const missedQs = useMemo(() => {
    const ids = Array.from(new Set(misses.map((m) => m.qid)));
    return pack.questions.filter((q) => ids.includes(q.id));
  }, [misses, pack.questions]);

  const drill = useMemo(() => {
    const lines: string[] = [];
    lines.push(`TALKARENA — DRILL PLAN (${pack.meta.level}) — generated from ${log.length} played cards, ${misses.length} misses.`);
    if (weakest) lines.push(`WEAKEST SUB-SKILL: ${weakest[0]} (${weakest[1].n} misses, avg ${(weakest[1].ms / weakest[1].n / 1000).toFixed(1)}s)`);
    lines.push('');
    byGrammar.forEach(([g, v]) => {
      const q = pack.questions.find((x) => x.miniLesson.grammarPoint === g);
      lines.push(`■ ${g}  —  ${v.n} miss(es)`);
      if (q) {
        lines.push(`   Rule: ${q.miniLesson.rule}`);
        lines.push(`   Model: ${q.miniLesson.example}`);
        lines.push(`   Trap to pre-empt: ${q.miniLesson.mistake}`);
        lines.push(`   30-second drill: learners produce three sentences using the model, each about a different person in the room.`);
        lines.push(`   Speaking follow-up: ${q.talkTask}`);
      }
      lines.push('');
    });
    lines.push('NEXT LESSON WARM-UP: re-ask the missed cards as a fresh board (Grid Arena → "Re-ask misses"), then run the Debate motion that uses the same language.');
    return lines.join('\n');
  }, [byGrammar, log.length, misses.length, pack, weakest]);

  const csv = useMemo(() => {
    const head = 'round,game,category,question,team,player,correct,seconds,value,points,grammar,skill,subskill';
    const rows = log.map((l) => {
      const t = teams.find((x) => x.id === l.teamId)?.name ?? '';
      const p = players.find((x) => x.id === l.playerId)?.name ?? '';
      const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
      return [l.round, l.game, esc(l.category), esc(l.prompt), esc(t), esc(p), l.correct, (l.ms / 1000).toFixed(1), l.value, l.points, esc(l.grammarPoint), esc(l.skill), esc(l.subSkill)].join(',');
    });
    return [head, ...rows].join('\n');
  }, [log, teams, players]);

  const copy = (text: string, what: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(what);
    audio.reveal();
    setTimeout(() => setCopied(''), 1800);
  };

  const teachAloud = () => {
    audio.duck(0.12, 60000);
    const lines = missedQs.slice(0, 6).map((q) => ({
      character: 'narrator',
      text: `${q.miniLesson.grammarPoint}. ${q.miniLesson.rule}. ${q.miniLesson.why}. For example: ${q.miniLesson.example}. Common mistake: ${q.miniLesson.mistake}.`,
    }));
    speakCast(lines.map((l) => ({ text: l.text, voiceURI: settings.narrator || undefined, rate: settings.rate })));
    onTeach();
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
        <div>
          <h2 className="text-3xl font-black tracking-tight">📊 End-of-game report</h2>
          <p className="font-semibold text-white/70">Every cell, who answered it, how long it took and what it was worth — then what to teach next.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={() => copy(csv, 'sheet')}>📋 {copied === 'sheet' ? 'Copied!' : 'Copy score sheet (CSV)'}</Btn>
          <Btn variant="danger" onClick={() => { clearLog(); resetScores(); }}>🗑 New session</Btn>
        </div>
      </Card>

      {/* headline stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <div className="text-sm font-black uppercase text-slate-500">Cards played</div>
          <div className="text-5xl font-black tabular-nums text-slate-900">{log.length}</div>
        </Card>
        <Card>
          <div className="text-sm font-black uppercase text-slate-500">Accuracy</div>
          <div className={cn('text-5xl font-black tabular-nums', accuracy > 0.7 ? 'text-emerald-600' : accuracy > 0.45 ? 'text-amber-600' : 'text-rose-600')}>{Math.round(accuracy * 100)}%</div>
          <Meter value={accuracy} tone={accuracy > 0.7 ? '#059669' : '#e11d48'} />
        </Card>
        <Card>
          <div className="text-sm font-black uppercase text-slate-500">Average time / card</div>
          <div className="text-5xl font-black tabular-nums text-slate-900">{log.length ? (log.reduce((a, l) => a + l.ms, 0) / log.length / 1000).toFixed(1) : '0'}s</div>
        </Card>
        <Card>
          <div className="text-sm font-black uppercase text-slate-500">Class talk time</div>
          <div className="text-5xl font-black tabular-nums text-indigo-700">{Math.round(Object.values(talk).reduce((a, b) => a + b, 0) / 1000)}s</div>
        </Card>
      </div>

      {/* teaching plan */}
      <Card className="space-y-4 border-4 border-indigo-200 bg-indigo-50/50">
        <h3 className="text-2xl font-black text-indigo-950">🧭 Teaching plan — what to teach next</h3>
        {weakest ? (
          <div className="rounded-3xl border-4 border-rose-300 bg-white p-5">
            <div className="text-sm font-black uppercase tracking-wide text-rose-600">The class's weakest sub-skill</div>
            <div className="text-4xl font-black text-slate-900">{weakest[0]}</div>
            <p className="text-lg font-semibold text-slate-600">
              {weakest[1].n} miss{weakest[1].n > 1 ? 'es' : ''} · average {(weakest[1].ms / weakest[1].n / 1000).toFixed(1)}s of thinking time before answering.
            </p>
          </div>
        ) : (
          <p className="text-lg font-semibold text-slate-600">Nothing missed yet — play a round and the plan writes itself.</p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-4">
            <h4 className="mb-2 text-lg font-black text-slate-900">Misses grouped by grammar point</h4>
            {byGrammar.length === 0 && <p className="text-slate-500">—</p>}
            {byGrammar.map(([g, v]) => (
              <div key={g} className="mb-2">
                <div className="flex justify-between text-base font-bold text-slate-700"><span>{g}</span><span>{v.n}</span></div>
                <Meter value={v.n / Math.max(1, misses.length)} tone="#4f46e5" height={10} />
              </div>
            ))}
          </div>
          <div className="rounded-3xl bg-white p-4">
            <h4 className="mb-2 text-lg font-black text-slate-900">Misses grouped by skill</h4>
            {bySkill.length === 0 && <p className="text-slate-500">—</p>}
            {bySkill.map(([g, v]) => (
              <div key={g} className="mb-2">
                <div className="flex justify-between text-base font-bold text-slate-700"><span>{g}</span><span>{v.n}</span></div>
                <Meter value={v.n / Math.max(1, misses.length)} tone="#0891b2" height={10} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Btn variant="primary" size="lg" disabled={!missedQs.length} onClick={() => { onReask(missedQs.map((q) => q.id)); audio.whoosh(); }}>
            🔁 Re-ask only the {missedQs.length} missed cards as a fresh board
          </Btn>
          <Btn variant="ok" size="lg" disabled={!missedQs.length} onClick={teachAloud}>
            🔊 Teach this area aloud (mini lessons)
          </Btn>
          <Btn variant="warm" size="lg" onClick={() => copy(drill, 'drill')}>
            📋 {copied === 'drill' ? 'Drill copied!' : 'Copy ready-made drill for next lesson'}
          </Btn>
          <Btn size="lg" onClick={() => say(weakest ? `The weakest area today was ${weakest[0]}.` : 'Nothing missed yet.')}>🗣 Announce</Btn>
        </div>
      </Card>

      {/* teams */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-xl font-black text-slate-900">🏆 Final scores</h3>
          {teams.map((t) => (
            <div key={t.id} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
              <span className="text-xl font-black" style={{ color: t.color }}>{t.emoji} {t.name}</span>
              <span className="text-3xl font-black tabular-nums">{scores[t.id] ?? 0}</span>
            </div>
          ))}
        </Card>
        <Card>
          <h3 className="mb-2 text-xl font-black text-slate-900">🎙 Who actually spoke</h3>
          {[...teams].map((t) => (
            <div key={t.id} className="mb-2">
              <div className="flex justify-between text-base font-bold text-slate-700">
                <span>{t.emoji} {t.name}</span>
                <span>{Math.round((talk[t.id] ?? 0) / 1000)}s</span>
              </div>
              <Meter value={Math.min(1, (talk[t.id] ?? 0) / 180000)} tone={t.color} height={10} />
            </div>
          ))}
          <p className="mt-2 text-sm font-semibold text-slate-500">Measured live from the microphone during debate speeches.</p>
        </Card>
      </div>

      {/* score sheet */}
      <Card className="overflow-x-auto">
        <h3 className="mb-3 text-xl font-black text-slate-900">🧾 Score sheet — every cell</h3>
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b-2 border-slate-200 text-sm font-black uppercase text-slate-500">
              <th className="p-2">#</th><th className="p-2">Game</th><th className="p-2">Card</th><th className="p-2">Who</th>
              <th className="p-2">Time</th><th className="p-2">Worth</th><th className="p-2">Scored</th><th className="p-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={8}>Nothing played yet.</td></tr>}
            {log.map((l, i) => {
              const t = teams.find((x) => x.id === l.teamId);
              const p = players.find((x) => x.id === l.playerId);
              return (
                <tr key={l.id} className={cn('border-b border-slate-100 text-base', !l.correct && 'bg-rose-50/60')}>
                  <td className="p-2 font-black text-slate-400">{i + 1}</td>
                  <td className="p-2"><Chip tone="slate">{l.game}</Chip></td>
                  <td className="p-2 max-w-sm truncate font-semibold text-slate-800" title={l.prompt}>{l.prompt}</td>
                  <td className="p-2">
                    <span className="flex items-center gap-2 font-bold" style={{ color: t?.color }}>
                      {p && <Avatar style={p.style} seed={p.seed} size={28} />}
                      {t?.emoji} {p?.name ?? t?.name ?? '—'}
                    </span>
                  </td>
                  <td className="p-2 tabular-nums">{(l.ms / 1000).toFixed(1)}s</td>
                  <td className="p-2 tabular-nums">{l.value}</td>
                  <td className={cn('p-2 font-black tabular-nums', l.correct ? 'text-emerald-600' : 'text-rose-600')}>{l.correct ? `+${l.points}` : '✗'}</td>
                  <td className="p-2 text-sm font-semibold text-slate-500">{l.subSkill}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
