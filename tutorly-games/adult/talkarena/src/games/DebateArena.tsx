import { useEffect, useMemo, useRef, useState } from 'react';
import { Btn, Card, Chip, Meter } from '../components/ui';
import { useGame } from '../store/GameContext';
import { useNarrator } from '../lib/useNarrator';
import { audio } from '../lib/audio';
import { MicMeter } from '../lib/speech';
import { cn } from '../utils/cn';

type Stage = 'brief' | 'vocab' | 'prep' | 'for' | 'against' | 'twist' | 'crossfire' | 'hotseat' | 'vote';

const STAGES: { id: Stage; label: string; icon: string; secs: number; hint: string }[] = [
  { id: 'brief', label: 'The motion', icon: '📜', secs: 0, hint: 'Read it out. Nobody speaks yet.' },
  { id: 'vocab', label: 'Load the words', icon: '🧰', secs: 90, hint: 'Each learner says one word in a full sentence.' },
  { id: 'prep', label: 'Prep', icon: '⏳', secs: 120, hint: 'Teams build three arguments and one example each.' },
  { id: 'for', label: 'Speech FOR', icon: '🟢', secs: 120, hint: 'No notes read word for word.' },
  { id: 'against', label: 'Speech AGAINST', icon: '🔴', secs: 120, hint: 'Must answer one point from the other side.' },
  { id: 'twist', label: 'The twist', icon: '🌀', secs: 90, hint: 'Everything changes. React live.' },
  { id: 'crossfire', label: 'Crossfire', icon: '⚔️', secs: 180, hint: 'Open questions. Nobody may pass.' },
  { id: 'hotseat', label: 'Hot seat', icon: '🔥', secs: 90, hint: 'One learner, rapid personal questions.' },
  { id: 'vote', label: 'Vote & score', icon: '🗳️', secs: 0, hint: 'Who moved the room?' },
];

const CRITERIA = [
  'Fluency & flow',
  'Range of language',
  'Accuracy under pressure',
  'Interaction & turn-taking',
  'Evidence & persuasion',
];

export default function DebateArena() {
  const { pack, teams, activeTeam, setActiveTeam, award, scores, pushLog, addTalk, talk } = useGame();
  const { say } = useNarrator();
  const topics = pack.debates;
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState<Stage>('brief');
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [level, setLevel] = useState(0);
  const [picker, setPicker] = useState(true);
  const [rubric, setRubric] = useState<Record<string, Record<string, number>>>({});
  const t = topics[idx % Math.max(1, topics.length)];

  const saveReview = () => {
    let saved = 0;
    teams.forEach((tm) => {
      CRITERIA.forEach((c) => {
        const v = rubric[tm.id]?.[c] ?? 0;
        if (!v) return;
        saved++;
        pushLog({
          game: 'debate', round: idx + 1, qid: `${t.id}-${c}`, category: t.topic,
          prompt: `${c} — ${tm.name} on "${t.motion}"`, value: 100, teamId: tm.id, playerId: null,
          correct: v >= 4, ms: 0, points: v * 20,
          grammarPoint: `Spoken performance — ${c}`, skill: 'Speaking', subSkill: c, level: t.level,
        });
      });
    });
    if (saved) { audio.correct(2); setRubric({}); }
  };
  const meter = useRef<MicMeter | null>(null);
  const started = useRef(Date.now());

  const stageDef = useMemo(() => STAGES.find((s) => s.id === stage)!, [stage]);

  useEffect(() => { audio.play('debate', 0.5); }, []);

  useEffect(() => {
    setLeft(stageDef.secs);
    setRunning(false);
  }, [stage, stageDef.secs, idx]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setLeft((l) => {
      if (l <= 1) { audio.buzz(); setRunning(false); return 0; }
      if (l <= 5) audio.tick();
      return l - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [running]);

  // talk-time meter while a speaking stage runs
  useEffect(() => {
    const speaking = running && ['vocab', 'for', 'against', 'twist', 'crossfire', 'hotseat'].includes(stage);
    if (speaking) {
      const m = new MicMeter();
      meter.current = m;
      let acc = 0;
      m.onTick = (lv, ms) => {
        setLevel(lv);
        if (ms - acc > 1000) { addTalk(activeTeam, ms - acc); acc = ms; }
      };
      void m.start();
      return () => { m.stop(); meter.current = null; setLevel(0); };
    }
  }, [running, stage, activeTeam, addTalk]);

  const stageIndex = STAGES.findIndex((s) => s.id === stage);
  const next = () => {
    const n = STAGES[Math.min(STAGES.length - 1, stageIndex + 1)];
    setStage(n.id);
    audio.whoosh();
  };

  const finishMotion = (winner: string) => {
    award(winner, 500);
    audio.cheer();
    pushLog({
      game: 'debate', round: idx + 1, qid: t.id, category: t.topic, prompt: t.motion, value: 500,
      teamId: winner, playerId: null, correct: true, ms: Date.now() - started.current, points: 500,
      grammarPoint: 'Argument language: concede, challenge, support', skill: 'Speaking',
      subSkill: 'Extended turn & rebuttal', level: t.level,
    });
    if (idx + 1 < topics.length) {
      setIdx(idx + 1);
      setStage('brief');
      started.current = Date.now();
    } else {
      setPicker(true);
    }
  };

  if (picker) {
    return (
      <div className="space-y-4">
        <Card className="flex items-center gap-4 bg-gradient-to-r from-violet-50 via-white to-rose-50">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-violet-600 text-3xl text-white shadow-lg">⚖️</div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Discussion & Debate</h2>
            <p className="text-base font-semibold text-slate-500">{topics.length} motions · nine stages each · every stage is timed and every learner speaks.</p>
          </div>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topics.map((d, i) => (
            <button key={d.id} onClick={() => { setIdx(i); setPicker(false); setStage('brief'); started.current = Date.now(); audio.whoosh(); }}
              className="group overflow-hidden rounded-3xl border-2 border-slate-200 bg-white text-left shadow transition hover:-translate-y-1 hover:border-violet-400 hover:shadow-2xl">
              <img src={d.media[0]?.url} alt="" className="h-40 w-full object-cover" loading="lazy" />
              <div className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <Chip tone="violet">{d.topic}</Chip>
                  <Chip tone="slate">CEFR {d.level}</Chip>
                </div>
                <p className="text-xl font-black leading-snug text-slate-900">{d.motion}</p>
                <p className="text-sm font-semibold text-slate-500">Round {i + 1} of {topics.length}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <Card className="space-y-3 bg-gradient-to-r from-violet-50 via-white to-rose-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Chip tone="violet">Motion {idx + 1}/{topics.length}</Chip>
            <Chip tone="slate">{t.topic}</Chip>
            <Chip tone="sky">CEFR {t.level}</Chip>
          </div>
          <div className="flex items-center gap-2">
            <Btn size="sm" onClick={() => setPicker(true)}>☰ All motions</Btn>
            <Btn size="sm" onClick={() => say(t.motion)}>🔊 Read the motion</Btn>
          </div>
        </div>
        <h2 className="text-4xl font-black leading-tight tracking-tight text-slate-900">{t.motion}</h2>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((s, i) => (
            <button key={s.id} onClick={() => setStage(s.id)}
              className={cn('rounded-xl border-2 px-3 py-1.5 text-sm font-black transition',
                s.id === stage ? 'border-slate-900 bg-slate-900 text-white' : i < stageIndex ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500')}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-2xl font-black text-slate-900">{stageDef.icon} {stageDef.label}</h3>
            <div className="flex items-center gap-3">
              {stageDef.secs > 0 && (
                <>
                  <div className={cn('rounded-2xl px-4 py-2 text-3xl font-black tabular-nums', left <= 10 && left > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700')}>
                    {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
                  </div>
                  <Btn variant={running ? 'ghost' : 'primary'} onClick={() => setRunning((r) => !r)}>{running ? '⏸ Pause' : '▶ Start'}</Btn>
                  <Btn size="sm" onClick={() => setLeft(stageDef.secs)}>↺</Btn>
                </>
              )}
              <Btn variant="dark" onClick={next}>Next stage ▶</Btn>
            </div>
          </div>
          <p className="text-lg font-semibold text-slate-500">{stageDef.hint}</p>

          {running && (
            <div className="space-y-1 rounded-2xl bg-slate-900 p-4">
              <div className="flex items-center justify-between text-white">
                <span className="font-black">🎙 Live talk meter — {teams.find((x) => x.id === activeTeam)?.name}</span>
                <span className="tabular-nums">{Math.round((talk[activeTeam] ?? 0) / 1000)}s spoken</span>
              </div>
              <Meter value={level} tone="#34d399" height={18} />
            </div>
          )}

          {stage === 'brief' && (
            <div className="space-y-3">
              <figure className="overflow-hidden rounded-3xl border border-slate-200">
                <img src={t.media[0]?.url} alt={t.media[0]?.caption} className="h-72 w-full object-cover" />
                <figcaption className="bg-slate-50 px-4 py-2 font-semibold text-slate-600">{t.media[0]?.caption}</figcaption>
              </figure>
              <p className="text-2xl leading-relaxed text-slate-800">{t.blurb}</p>
              <Btn onClick={() => say(t.blurb)}>🔊 Read the background</Btn>
            </div>
          )}

          {stage === 'vocab' && (
            <div className="grid gap-3 md:grid-cols-2">
              {t.vocab.map((v) => (
                <button key={v.word} onClick={() => say(`${v.word}. ${v.meaning}`)}
                  className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-indigo-400">
                  <div className="text-2xl font-black text-slate-900">{v.word}</div>
                  <div className="text-lg font-semibold text-slate-600">{v.meaning}</div>
                </button>
              ))}
            </div>
          )}

          {(stage === 'prep' || stage === 'for' || stage === 'against') && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border-4 border-emerald-300 bg-emerald-50 p-4">
                <h4 className="mb-2 text-xl font-black text-emerald-900">🟢 Arguing FOR</h4>
                {t.framesFor.map((f, i) => (
                  <p key={i} className="mb-2 rounded-xl bg-white px-3 py-2 text-xl font-semibold text-slate-800">{f}</p>
                ))}
              </div>
              <div className="rounded-3xl border-4 border-rose-300 bg-rose-50 p-4">
                <h4 className="mb-2 text-xl font-black text-rose-900">🔴 Arguing AGAINST</h4>
                {t.framesAgainst.map((f, i) => (
                  <p key={i} className="mb-2 rounded-xl bg-white px-3 py-2 text-xl font-semibold text-slate-800">{f}</p>
                ))}
              </div>
            </div>
          )}

          {stage === 'twist' && (
            <div className="rounded-3xl border-4 border-amber-400 bg-amber-50 p-6 text-center">
              <div className="text-6xl">🌀</div>
              <p className="mt-3 text-3xl font-black text-amber-900">{t.twist}</p>
              <Btn className="mt-4" variant="warm" onClick={() => say(t.twist)}>🔊 Announce the twist</Btn>
            </div>
          )}

          {stage === 'crossfire' && (
            <div className="grid gap-3 md:grid-cols-2">
              {t.questions.map((q, i) => (
                <button key={i} onClick={() => say(q)} className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-left text-xl font-bold text-slate-800 transition hover:border-violet-400">
                  <span className="mr-2 text-violet-600">{i + 1}.</span>{q}
                </button>
              ))}
            </div>
          )}

          {stage === 'hotseat' && (
            <div className="space-y-3">
              <p className="text-lg font-bold text-slate-500">One learner in the chair. Fire these fast — no answer under five words.</p>
              {t.hotSeat.map((q, i) => (
                <button key={i} onClick={() => say(q)} className="w-full rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 text-left text-2xl font-black text-rose-900 transition hover:border-rose-500">
                  🔥 {q}
                </button>
              ))}
            </div>
          )}

          {stage === 'vote' && (
            <div className="space-y-4">
              <div className="rounded-3xl border-4 border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-2 text-xl font-black text-slate-900">📝 Speaking review — the CEFR-style rubric</h4>
                <p className="mb-3 text-base font-semibold text-slate-500">
                  Tap the stars. Anything scored 3 or below is written into the end-of-game teaching plan as a target.
                </p>
                <div className="space-y-3">
                  {teams.map((tm) => (
                    <div key={tm.id} className="rounded-2xl bg-white p-3">
                      <div className="mb-2 text-lg font-black" style={{ color: tm.color }}>{tm.emoji} {tm.name}</div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {CRITERIA.map((c) => (
                          <div key={c} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                            <span className="text-base font-bold text-slate-700">{c}</span>
                            <span className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button key={n} onClick={() => { setRubric((r) => ({ ...r, [tm.id]: { ...(r[tm.id] ?? {}), [c]: n } })); audio.tick(); }}
                                  className={cn('text-2xl leading-none transition', (rubric[tm.id]?.[c] ?? 0) >= n ? 'opacity-100' : 'opacity-25 hover:opacity-60')}>
                                  ★
                                </button>
                              ))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Btn className="mt-3" variant="primary" onClick={saveReview}>💾 Save review into the teaching plan</Btn>
              </div>

              <p className="text-2xl font-black text-slate-900">Who moved the room? The winning team takes 500.</p>
              <div className="flex flex-wrap gap-3">
                {teams.map((tm) => (
                  <Btn key={tm.id} size="lg" variant="ok" onClick={() => finishMotion(tm.id)}>
                    🏆 {tm.emoji} {tm.name}
                  </Btn>
                ))}
              </div>
              <p className="text-base font-semibold text-slate-500">Then the next motion loads automatically — ten in the deck.</p>
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Card className="space-y-2">
            <h3 className="text-lg font-black text-slate-900">Speaking now</h3>
            {teams.map((tm) => (
              <button key={tm.id} onClick={() => setActiveTeam(tm.id)}
                className={cn('flex w-full items-center justify-between rounded-xl border-2 px-3 py-2 font-black', activeTeam === tm.id ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white/60 text-slate-400')}>
                <span style={{ color: tm.color }}>{tm.emoji} {tm.name}</span>
                <span className="text-right">
                  <span className="block text-xl tabular-nums text-slate-900">{scores[tm.id] ?? 0}</span>
                  <span className="block text-xs tabular-nums text-slate-500">{Math.round((talk[tm.id] ?? 0) / 1000)}s talk</span>
                </span>
              </button>
            ))}
          </Card>
          <Card className="space-y-2">
            <h3 className="text-lg font-black text-slate-900">🧰 Key words</h3>
            <div className="flex flex-wrap gap-1.5">
              {t.vocab.map((v) => <Chip key={v.word} tone="violet">{v.word}</Chip>)}
            </div>
          </Card>
          <Card className="space-y-2">
            <h3 className="text-lg font-black text-slate-900">Referee rules</h3>
            <ul className="space-y-1 text-base font-semibold text-slate-600">
              <li>• Nobody repeats another speaker's point.</li>
              <li>• Every claim needs one example.</li>
              <li>• Interrupt only with the frame, never the volume.</li>
              <li>• Silence over three seconds hands the floor away.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
