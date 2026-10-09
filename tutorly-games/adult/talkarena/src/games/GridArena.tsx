import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Btn, Card, Chip } from '../components/ui';
import TalkTimer from '../components/TalkTimer';
import { useGame } from '../store/GameContext';
import { useNarrator } from '../lib/useNarrator';
import { audio } from '../lib/audio';
import type { Question } from '../lib/types';
import { cn } from '../utils/cn';

const TOTAL_ROUNDS = 10;
const CARDS_PER_ROUND = 6;

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

export default function GridArena({ focusIds, onOpenReport }: { focusIds?: string[]; onOpenReport: () => void }) {
  const { pack, teams, activeTeam, setActiveTeam, nextTeam, award, scores, pushLog, players, settings, log } = useGame();
  const { say, sayCast, mixVoices } = useNarrator();

  const pool = useMemo(() => {
    const base = focusIds?.length ? pack.questions.filter((q) => focusIds.includes(q.id)) : pack.questions;
    return base.length ? base : pack.questions;
  }, [pack.questions, focusIds]);

  const [round, setRound] = useState(1);
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [board, setBoard] = useState<Question[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [open, setOpen] = useState<Question | null>(null);
  const [roundOver, setRoundOver] = useState(false);
  const [spot, setSpot] = useState<(typeof players)[number] | null>(null);

  const pickRandom = () => {
    if (!players.length) return;
    const p = players[Math.floor(Math.random() * players.length)];
    setSpot(p);
    setActiveTeam(p.teamId);
    audio.reveal();
    say(`${p.name}, you are up. Answer in a full sentence.`);
  };

  const buildBoard = useCallback(
    (r: number) => {
      const missedIds = log.filter((l) => !l.correct).map((l) => l.qid);
      const score = (q: Question) => (seen[q.id] ?? 0) * 10 - (missedIds.includes(q.id) ? 6 : 0) + Math.random() * 3;
      const ordered = [...pool].sort((a, b) => score(a) - score(b));
      const picked = shuffle(ordered.slice(0, Math.max(CARDS_PER_ROUND, Math.min(ordered.length, CARDS_PER_ROUND + 4)))).slice(0, CARDS_PER_ROUND);
      const byValue = [...picked].sort((a, b) => a.value - b.value).map((q, i) => ({ ...q, value: q.value + (r - 1) * 25 + i * 0 }));
      setBoard(byValue);
      setDone([]);
      setRoundOver(false);
    },
    [pool, seen, log],
  );

  useEffect(() => {
    buildBoard(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  useEffect(() => {
    audio.play('arena', 0.3 + (round / TOTAL_ROUNDS) * 0.6);
    audio.setIntensity(0.3 + (round / TOTAL_ROUNDS) * 0.6);
  }, [round]);

  const finishCard = (q: Question) => {
    setDone((d) => [...d, q.id]);
    setSeen((s) => ({ ...s, [q.id]: (s[q.id] ?? 0) + 1 }));
    setOpen(null);
    nextTeam();
    if (done.length + 1 >= board.length) {
      setRoundOver(true);
      audio.cheer();
    }
  };

  const goNextRound = () => {
    const r = round + 1;
    setRound(r);
    buildBoard(r);
    audio.whoosh();
  };

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-indigo-50 via-white to-amber-50">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-600 text-3xl text-white shadow-lg">🎯</div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Grid Arena</h2>
            <p className="text-base font-semibold text-slate-500">
              Round <span className="text-indigo-700">{round}</span> of {TOTAL_ROUNDS} · {pack.meta.level} · {pack.meta.topic}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-2">
            <Btn size="sm" variant="warm" onClick={pickRandom}>🎲 Who speaks?</Btn>
            {spot && (
              <span className="flex items-center gap-2">
                <Avatar style={spot.style} seed={spot.seed} size={40} ring={teams.find((t) => t.id === spot.teamId)?.color} />
                <span className="text-xl font-black text-slate-800">{spot.name}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTeam(t.id)}
              className={cn(
                'rounded-2xl border-2 px-5 py-3 text-left transition',
                activeTeam === t.id ? 'scale-[1.03] border-slate-900 bg-white shadow-lg' : 'border-slate-200 bg-white/60',
              )}
            >
              <div className="text-sm font-black uppercase tracking-wide" style={{ color: t.color }}>
                {t.emoji} {t.name}
              </div>
              <div className="text-3xl font-black tabular-nums text-slate-900">{scores[t.id] ?? 0}</div>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {board.map((q) => {
          const used = done.includes(q.id);
          const repeat = (seen[q.id] ?? 0) > 0;
          return (
            <button
              key={q.id}
              disabled={used}
              onClick={() => {
                audio.whoosh();
                setOpen(q);
              }}
              className={cn(
                'group relative h-44 overflow-hidden rounded-3xl border-2 p-5 text-left transition-all',
                used
                  ? 'border-slate-200 bg-slate-100 opacity-60'
                  : 'border-indigo-200 bg-gradient-to-br from-white to-indigo-50 hover:-translate-y-1 hover:border-indigo-500 hover:shadow-2xl',
              )}
            >
              <div className="flex items-center justify-between">
                <Chip tone="indigo">{q.category}</Chip>
                {repeat && !used && <Chip tone="amber">🔁 re-ask</Chip>}
              </div>
              <div className="mt-3 text-6xl font-black tabular-nums text-indigo-700 group-hover:text-indigo-900">{q.value}</div>
              <div className="absolute bottom-4 left-5 text-sm font-bold uppercase tracking-wider text-slate-400">
                {q.type === 'listening' ? '🎧 listening' : q.type === 'reading' ? '📖 reading' : q.type === 'multi' ? '✅ multi-answer' : q.type === 'tf' ? '⚖️ true / false' : '🎲 multiple choice'}
              </div>
              {used && <div className="absolute inset-0 grid place-items-center text-6xl">✔️</div>}
            </button>
          );
        })}
      </div>

      {roundOver && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-emerald-300 bg-emerald-50">
          <div>
            <h3 className="text-2xl font-black text-emerald-900">Round {round} complete 🎉</h3>
            <p className="font-semibold text-emerald-800">
              {round < TOTAL_ROUNDS ? 'Next board is hotter: higher values, and everything the class missed comes back.' : 'All 10 rounds done. Open the score sheet and build the teaching plan.'}
            </p>
          </div>
          <div className="flex gap-3">
            {round < TOTAL_ROUNDS ? (
              <Btn variant="ok" size="lg" onClick={goNextRound}>
                ▶ Start round {round + 1}
              </Btn>
            ) : (
              <Btn variant="dark" size="lg" onClick={onOpenReport}>
                📊 Open end-of-game report
              </Btn>
            )}
            <Btn onClick={onOpenReport}>Score sheet</Btn>
          </div>
        </Card>
      )}

      {open && (
        <QuestionPanel
          q={open}
          onClose={() => setOpen(null)}
          onDone={finishCard}
          say={say}
          sayCast={sayCast}
          mixVoices={mixVoices}
          round={round}
          teams={teams}
          players={players}
          activeTeam={activeTeam}
          award={award}
          pushLog={pushLog}
          timerSec={settings.timerSec}
        />
      )}
    </div>
  );
}

type PanelProps = {
  q: Question;
  round: number;
  onClose: () => void;
  onDone: (q: Question) => void;
  say: (t: string, v?: string) => void;
  sayCast: (l: { character: string; text: string }[], onLine?: (i: number) => void, onDone?: () => void) => void;
  mixVoices: (c: string[]) => void;
  teams: ReturnType<typeof useGame>['teams'];
  players: ReturnType<typeof useGame>['players'];
  activeTeam: string;
  award: (t: string | null, p: number) => void;
  pushLog: ReturnType<typeof useGame>['pushLog'];
  timerSec: number;
};

function QuestionPanel({ q, round, onClose, onDone, say, sayCast, mixVoices, teams, players, activeTeam, award, pushLog, timerSec }: PanelProps) {
  const [picked, setPicked] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [team, setTeam] = useState(activeTeam);
  const [player, setPlayer] = useState<string | null>(null);
  const [left, setLeft] = useState(timerSec);
  const [running, setRunning] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [line, setLine] = useState(-1);
  const start = useRef(Date.now());

  const characters = useMemo(() => Array.from(new Set((q.dialogue ?? []).map((d) => d.character))), [q]);
  const correct = useMemo(() => picked.length === q.answer.length && picked.every((p) => q.answer.includes(p)), [picked, q.answer]);

  useEffect(() => {
    if (!running || locked) return;
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          audio.buzz();
          setRunning(false);
          return 0;
        }
        if (l <= 6) audio.tick();
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, locked]);



  const toggle = (i: number) => {
    if (locked) return;
    audio.tick();
    if (q.type === 'multi') setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
    else setPicked([i]);
  };

  const lockIn = () => {
    if (!picked.length) return;
    const ok = picked.length === q.answer.length && picked.every((p) => q.answer.includes(p));
    setLocked(true);
    setRunning(false);
    if (ok) audio.correct(round);
    else audio.wrong();
    award(team, ok ? q.value : 0);
    pushLog({
      game: 'arena',
      round,
      qid: q.id,
      category: q.category,
      prompt: q.prompt,
      value: q.value,
      teamId: team,
      playerId: player,
      correct: ok,
      ms: Date.now() - start.current,
      points: ok ? q.value : 0,
      grammarPoint: q.miniLesson.grammarPoint,
      skill: q.miniLesson.skill,
      subSkill: q.miniLesson.subSkill,
      level: q.level,
    });
  };

  const steal = (tid: string) => {
    award(tid, Math.round(q.value / 2));
    audio.correct(1);
  };

  const teamPlayers = players.filter((p) => p.teamId === team);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="indigo">{q.category}</Chip>
            <Chip tone="amber">{q.value} pts</Chip>
            <Chip tone="violet">CEFR {q.level}</Chip>
            <Chip tone="sky">{q.miniLesson.skill}</Chip>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn('rounded-2xl px-4 py-2 text-3xl font-black tabular-nums', left <= 6 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700')}>
              {left}s
            </div>
            <Btn size="sm" onClick={() => setRunning((r) => !r)}>
              {running ? '⏸ Pause' : '▶ Timer'}
            </Btn>
            <Btn size="sm" onClick={() => { setLeft(timerSec); setRunning(false); }}>
              ↺
            </Btn>
            <Btn size="sm" variant="ghost" onClick={onClose}>
              ✕
            </Btn>
          </div>
        </div>

        {/* who is answering */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <span className="text-sm font-black uppercase tracking-wide text-slate-500">Answering:</span>
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTeam(t.id); setPlayer(null); audio.tick(); }}
              className={cn('rounded-xl border-2 px-4 py-2 font-black', team === t.id ? 'border-slate-900 bg-white' : 'border-transparent bg-white/60 text-slate-500')}
              style={{ color: team === t.id ? t.color : undefined }}
            >
              {t.emoji} {t.name}
            </button>
          ))}
          <span className="ml-2 flex items-center gap-2">
            {teamPlayers.map((p) => (
              <button key={p.id} onClick={() => { setPlayer(p.id); audio.tick(); }} className={cn('rounded-full p-0.5 transition', player === p.id ? 'ring-4 ring-indigo-400' : 'opacity-70 hover:opacity-100')} title={p.name}>
                <Avatar style={p.style} seed={p.seed} size={40} />
              </button>
            ))}
          </span>
        </div>

        {/* stimulus */}
        {q.text && (
          <div className="rounded-3xl border-2 border-sky-200 bg-sky-50/70 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-lg font-black text-sky-900">📖 Read this</h4>
              <Btn size="sm" onClick={() => say(q.text!)}>🔊 Read aloud</Btn>
            </div>
            <p className="text-2xl leading-relaxed text-slate-800">{q.text}</p>
          </div>
        )}

        {q.dialogue && (
          <div className="rounded-3xl border-2 border-violet-200 bg-violet-50/70 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-lg font-black text-violet-900">🎧 Listen — cast of {characters.length}</h4>
              <div className="flex flex-wrap gap-2">
                <Btn size="sm" variant="primary" onClick={() => sayCast(q.dialogue!, setLine, () => setLine(-1))}>▶ Play dialogue</Btn>
                <Btn size="sm" onClick={() => mixVoices(characters)}>🎲 Mix voices</Btn>
                <Btn size="sm" onClick={() => setShowScript((s) => !s)}>{showScript ? '🙈 Hide script' : '👁 Show script'}</Btn>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {characters.map((c) => (
                <Chip key={c} tone="violet">🗣 {c}</Chip>
              ))}
            </div>
            {showScript && (
              <div className="mt-3 space-y-2">
                {q.dialogue.map((d, i) => (
                  <p key={i} className={cn('rounded-xl px-3 py-2 text-xl', line === i ? 'bg-violet-200 font-bold' : 'bg-white/70')}>
                    <b>{d.character}:</b> {d.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {q.media?.map((m, i) => (
          <figure key={i} className="overflow-hidden rounded-3xl border border-slate-200">
            <img src={m.url} alt={m.caption} className="h-64 w-full object-cover" loading="lazy" />
            <figcaption className="bg-slate-50 px-4 py-2 text-base font-semibold text-slate-600">{m.caption}{m.credit ? ` · ${m.credit}` : ''}</figcaption>
          </figure>
        ))}

        {/* prompt */}
        <div className="flex items-start justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white">
          <p className="text-3xl font-black leading-snug tracking-tight">{q.prompt}</p>
          <Btn size="sm" variant="ghost" onClick={() => say(q.prompt)}>🔊</Btn>
        </div>
        {q.type === 'multi' && <p className="text-lg font-bold text-amber-700">Select exactly {q.answer.length} answers, then lock in.</p>}

        {/* options */}
        <div className={cn('grid gap-3', q.options.length > 3 ? 'sm:grid-cols-2' : 'sm:grid-cols-2')}>
          {q.options.map((o, i) => {
            const isPicked = picked.includes(i);
            const isRight = q.answer.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={cn(
                  'rounded-2xl border-2 p-5 text-left text-2xl font-bold transition-all',
                  !locked && isPicked && 'border-indigo-600 bg-indigo-50 shadow-lg',
                  !locked && !isPicked && 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-400',
                  locked && isRight && 'border-emerald-500 bg-emerald-50 text-emerald-900',
                  locked && !isRight && isPicked && 'border-rose-500 bg-rose-50 text-rose-900',
                  locked && !isRight && !isPicked && 'border-slate-200 bg-slate-50 opacity-60',
                )}
              >
                <span className="mr-3 inline-grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-lg text-white">{'ABCDE'[i]}</span>
                {o}
                {locked && isRight && ' ✅'}
                {locked && !isRight && isPicked && ' ❌'}
              </button>
            );
          })}
        </div>

        {!locked ? (
          <div className="flex flex-wrap gap-3">
            <Btn variant="primary" size="lg" onClick={lockIn} disabled={!picked.length}>
              🔒 Lock in answer
            </Btn>
            <Btn size="lg" onClick={() => { setPicked([]); }}>Clear</Btn>
            <Btn size="lg" variant="warm" onClick={() => { setLocked(true); setRunning(false); audio.reveal(); }}>
              👁 Reveal (no score)
            </Btn>
          </div>
        ) : (
          <Feedback q={q} correct={correct} say={say} teams={teams} steal={steal} teamId={team} onDone={() => onDone(q)} />
        )}
      </div>
    </div>
  );
}

function Feedback({
  q, correct, say, teams, steal, teamId, onDone,
}: {
  q: Question;
  correct: boolean;
  say: (t: string, v?: string) => void;
  teams: ReturnType<typeof useGame>['teams'];
  steal: (t: string) => void;
  teamId: string | null;
  onDone: () => void;
}) {
  const ml = q.miniLesson;
  const lesson = `${ml.rule}. ${ml.why}. For example: ${ml.example}. Watch out: ${ml.mistake}`;
  return (
    <div className="space-y-4">
      <div className={cn('rounded-3xl border-4 p-5', correct ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50')}>
        <h4 className={cn('text-3xl font-black', correct ? 'text-emerald-800' : 'text-rose-800')}>
          {correct ? '✅ Correct!' : '❌ Not this time'}
        </h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border-l-8 border-emerald-500 bg-white p-4">
            <div className="text-sm font-black uppercase tracking-wide text-emerald-700">The rule</div>
            <p className="text-xl font-semibold text-slate-800">{ml.rule}</p>
          </div>
          <div className="rounded-2xl border-l-8 border-sky-500 bg-white p-4">
            <div className="text-sm font-black uppercase tracking-wide text-sky-700">Why / the trap</div>
            <p className="text-xl font-semibold text-slate-800">{ml.why}</p>
          </div>
          <div className="rounded-2xl border-l-8 border-violet-500 bg-white p-4">
            <div className="text-sm font-black uppercase tracking-wide text-violet-700">Model sentence</div>
            <p className="text-xl font-semibold text-slate-800">{ml.example}</p>
          </div>
          <div className="rounded-2xl border-l-8 border-rose-500 bg-white p-4">
            <div className="text-sm font-black uppercase tracking-wide text-rose-700">Common mistake</div>
            <p className="text-xl font-semibold text-slate-800">{ml.mistake}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone="indigo">🧩 {ml.grammarPoint}</Chip>
          <Chip tone="sky">🎯 {ml.subSkill}</Chip>
          <Btn size="sm" onClick={() => say(lesson)}>🔊 Teach this aloud</Btn>
        </div>
      </div>

      <TalkTimer task={q.talkTask} teamId={teamId} seconds={45} onSpeak={() => say(q.talkTask)} />

      <div className="flex flex-wrap items-center gap-3">
        {!correct && teams.map((t) => (
          <Btn key={t.id} variant="ghost" onClick={() => steal(t.id)}>
            🥷 Steal for {t.emoji} {t.name} (+{Math.round(q.value / 2)})
          </Btn>
        ))}
        <Btn variant="dark" size="lg" className="ml-auto" onClick={onDone}>
          Next card ▶
        </Btn>
      </div>
    </div>
  );
}
