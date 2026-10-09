import { useMemo, useState, useEffect } from 'react';
import { Btn, Card, Chip } from '../components/ui';
import TalkTimer from '../components/TalkTimer';
import { useGame } from '../store/GameContext';
import { useNarrator } from '../lib/useNarrator';
import { audio } from '../lib/audio';
import { cn } from '../utils/cn';

export default function PracticeRoom() {
  const { pack, activeTeam } = useGame();
  const { say, sayCast } = useNarrator();
  const [skill, setSkill] = useState('All');
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);

  const skills = useMemo(() => ['All', ...Array.from(new Set(pack.questions.map((q) => q.miniLesson.skill)))], [pack.questions]);
  const list = useMemo(() => (skill === 'All' ? pack.questions : pack.questions.filter((q) => q.miniLesson.skill === skill)), [pack.questions, skill]);
  const q = list[i % Math.max(1, list.length)];

  useEffect(() => { audio.play('lobby', 0.4); }, []);


  if (!q) return <Card>No questions in this pack.</Card>;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 via-white to-sky-50">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-600 text-3xl text-white shadow-lg">🧘</div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Practice Room</h2>
            <p className="text-base font-semibold text-slate-500">No scores, no timer pressure, no rounds. One card at a time — say the answer out loud before you flip it.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={skill} onChange={(e) => { setSkill(e.target.value); setI(0); setShow(false); }} className="rounded-xl border-2 border-slate-300 px-3 py-2 font-bold">
            {skills.map((s) => <option key={s}>{s}</option>)}
          </select>
          <Chip tone="slate">{(i % list.length) + 1} / {list.length}</Chip>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="indigo">{q.category}</Chip>
          <Chip tone="violet">CEFR {q.level}</Chip>
          <Chip tone="sky">{q.miniLesson.skill}</Chip>
          <Chip tone="amber">{q.miniLesson.subSkill}</Chip>
        </div>

        {q.text && <div className="rounded-3xl border-2 border-sky-200 bg-sky-50 p-5 text-2xl leading-relaxed text-slate-800">{q.text}</div>}
        {q.dialogue && (
          <div className="rounded-3xl border-2 border-violet-200 bg-violet-50 p-5">
            <Btn size="sm" onClick={() => sayCast(q.dialogue!)}>▶ Play the dialogue</Btn>
            <div className="mt-3 space-y-1">
              {q.dialogue.map((d, k) => <p key={k} className="text-xl"><b>{d.character}:</b> {d.text}</p>)}
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white">
          <p className="text-3xl font-black leading-snug">{q.prompt}</p>
          <Btn size="sm" variant="ghost" onClick={() => say(q.prompt)}>🔊</Btn>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {q.options.map((o, k) => (
            <div key={k} className={cn('rounded-2xl border-2 p-4 text-xl font-bold',
              show && q.answer.includes(k) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white')}>
              <span className="mr-2 font-black text-slate-400">{'ABCDE'[k]}</span>{o}{show && q.answer.includes(k) && ' ✅'}
            </div>
          ))}
        </div>

        {show && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border-l-8 border-emerald-500 bg-emerald-50 p-4"><b className="text-emerald-800">Rule:</b> {q.miniLesson.rule}</div>
            <div className="rounded-2xl border-l-8 border-sky-500 bg-sky-50 p-4"><b className="text-sky-800">Why:</b> {q.miniLesson.why}</div>
            <div className="rounded-2xl border-l-8 border-violet-500 bg-violet-50 p-4"><b className="text-violet-800">Model:</b> {q.miniLesson.example}</div>
            <div className="rounded-2xl border-l-8 border-rose-500 bg-rose-50 p-4"><b className="text-rose-800">Trap:</b> {q.miniLesson.mistake}</div>
          </div>
        )}

        <TalkTimer task={q.talkTask} teamId={activeTeam} seconds={60} onSpeak={() => say(q.talkTask)} />

        <div className="flex flex-wrap gap-3">
          <Btn variant="primary" size="lg" onClick={() => { setShow((s) => !s); audio.reveal(); }}>{show ? '🙈 Hide answer' : '👁 Show answer & lesson'}</Btn>
          <Btn size="lg" onClick={() => { setI((v) => v + 1); setShow(false); audio.whoosh(); }}>Next card ▶</Btn>
          <Btn size="lg" onClick={() => { setI(Math.floor(Math.random() * list.length)); setShow(false); }}>🔀 Shuffle</Btn>
          <Btn size="lg" onClick={() => say(`${q.miniLesson.rule}. For example: ${q.miniLesson.example}`)}>🔊 Teach it aloud</Btn>
        </div>
      </Card>
    </div>
  );
}
