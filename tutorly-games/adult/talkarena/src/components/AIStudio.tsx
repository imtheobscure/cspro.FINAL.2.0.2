import { useMemo, useState } from 'react';
import { Btn, Card, Chip, Field, inputCls } from './ui';
import { buildPrompt, PROMPT_VERSION, QUICK_PROMPTS } from '../data/prompt';
import { useGame, DEFAULT_PACK } from '../store/GameContext';
import { audio } from '../lib/audio';
import type { Pack } from '../lib/types';

const BANNED = ['read the text on page', 'listen to the recording', 'look at the board', 'as we saw', 'in the video', 'page 1', 'see page', 'your textbook', 'the handout'];
const TRUSTED = ['upload.wikimedia.org', 'images.pexels.com', 'commons.wikimedia.org', 'images.unsplash.com'];

export default function AIStudio() {
  const { pack, setPack } = useGame();
  const [level, setLevel] = useState(pack.meta.level);
  const [count, setCount] = useState(24);
  const [topic, setTopic] = useState(pack.meta.topic);
  const [minutes, setMinutes] = useState(50);
  const [accent, setAccent] = useState('British English');
  const [raw, setRaw] = useState('');
  const [report, setReport] = useState<{ ok: boolean; errors: string[]; warns: string[]; summary: string[] } | null>(null);
  const [copied, setCopied] = useState('');

  const prompt = useMemo(() => buildPrompt({ level, count, topic, minutes, accent }), [level, count, topic, minutes, accent]);

  const copy = (t: string, what: string) => {
    void navigator.clipboard.writeText(t);
    setCopied(what);
    audio.reveal();
    setTimeout(() => setCopied(''), 1600);
  };

  const validate = () => {
    const errors: string[] = [];
    const warns: string[] = [];
    const summary: string[] = [];
    let parsed: Partial<Pack> | null = null;
    try {
      const cleaned = raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
      parsed = JSON.parse(cleaned) as Partial<Pack>;
    } catch (e) {
      setReport({ ok: false, errors: [`JSON did not parse: ${(e as Error).message}`], warns: [], summary: [] });
      audio.wrong();
      return;
    }
    const qs = parsed.questions ?? [];
    if (!qs.length && !parsed.debates?.length && !parsed.emojiCategories?.length && !parsed.pictionary?.length) {
      errors.push('No questions, debates, emoji categories or pictionary words found.');
    }
    const prompts = new Set<string>();
    qs.forEach((q, i) => {
      const at = `Q${i + 1} (${q.id ?? 'no id'})`;
      if (!q.prompt) errors.push(`${at}: missing prompt.`);
      if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`${at}: needs at least 2 options.`);
      if (!Array.isArray(q.answer) || !q.answer.length) errors.push(`${at}: missing answer indices.`);
      else if (q.answer.some((a) => a < 0 || a >= (q.options?.length ?? 0))) errors.push(`${at}: answer index out of range.`);
      if (!q.miniLesson || !q.miniLesson.rule || !q.miniLesson.example) errors.push(`${at}: mini lesson incomplete (rule + example are mandatory).`);
      if (!q.talkTask) warns.push(`${at}: no talkTask — the card will not make anyone speak.`);
      if (q.type === 'reading' && !q.text) errors.push(`${at}: reading card with no text. Not self-contained.`);
      if (q.type === 'listening' && !q.dialogue?.length) errors.push(`${at}: listening card with no dialogue. Not self-contained.`);
      if (q.level && q.level !== level) warns.push(`${at}: level ${q.level} differs from the pack level ${level}.`);
      const blob = `${q.prompt} ${q.options?.join(' ')}`.toLowerCase();
      BANNED.forEach((b) => { if (blob.includes(b)) errors.push(`${at}: refers to outside material ("${b}").`); });
      if (q.prompt) {
        if (prompts.has(q.prompt.toLowerCase())) errors.push(`${at}: duplicate prompt.`);
        prompts.add(q.prompt.toLowerCase());
      }
      (q.media ?? []).forEach((m) => {
        if (!/^https:\/\//.test(m.url)) errors.push(`${at}: media link is not https.`);
        else if (!TRUSTED.some((d) => m.url.includes(d))) warns.push(`${at}: media host not on the trusted list (${m.url.slice(0, 48)}…). Check it on the projector before class.`);
        if (!m.caption) warns.push(`${at}: media has no caption.`);
      });
    });
    summary.push(`${qs.length} questions`);
    summary.push(`${parsed.debates?.length ?? 0} debate motions`);
    summary.push(`${parsed.emojiCategories?.length ?? 0} emoji categories`);
    summary.push(`${parsed.pictionary?.length ?? 0} pictionary words`);
    const ok = errors.length === 0;
    setReport({ ok, errors, warns, summary });
    ok ? audio.correct(3) : audio.wrong();
    if (ok) {
      setPack({
        meta: { ...pack.meta, ...(parsed.meta ?? {}), level: (parsed.meta?.level ?? level) },
        questions: qs.length ? (qs as Pack['questions']) : pack.questions,
        debates: parsed.debates?.length ? parsed.debates : pack.debates,
        emojiCategories: parsed.emojiCategories?.length ? parsed.emojiCategories : pack.emojiCategories,
        pictionary: parsed.pictionary?.length ? parsed.pictionary : pack.pictionary,
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-sky-50 via-white to-violet-50">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-sky-600 text-3xl text-white shadow-lg">🧪</div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">AI Prompt Studio</h2>
            <p className="text-base font-semibold text-slate-500">Copy one strict instruction → paste your lesson under it in your own AI → paste the JSON back here. {PROMPT_VERSION}</p>
          </div>
        </div>
        <Chip tone="emerald">Loaded pack: {pack.meta.title} · {pack.questions.length} cards</Chip>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="text-xl font-black text-slate-900">1 · Set the constraints</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CEFR level">
              <select value={level} onChange={(e) => setLevel(e.target.value as Pack['meta']['level'])} className={inputCls}>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Questions"><input type="number" min={6} max={60} value={count} onChange={(e) => setCount(+e.target.value)} className={inputCls} /></Field>
            <Field label="Minutes of class"><input type="number" min={15} max={120} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className={inputCls} /></Field>
            <Field label="Accent / variety">
              <select value={accent} onChange={(e) => setAccent(e.target.value)} className={inputCls}>
                {['British English', 'American English', 'International English'].map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Topic"><input value={topic} onChange={(e) => setTopic(e.target.value)} className={inputCls} /></Field>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" size="lg" onClick={() => copy(prompt, 'prompt')}>📋 {copied === 'prompt' ? 'Copied!' : 'Copy the full instruction'}</Btn>
            {QUICK_PROMPTS.map((q) => (
              <Btn key={q.label} size="sm" onClick={() => copy(q.body.replace(/<LEVEL>/g, level).replace(/<TOPIC>/g, topic), q.label)}>
                {copied === q.label ? '✓ Copied' : `📋 ${q.label}`}
              </Btn>
            ))}
          </div>
          <details className="rounded-2xl bg-slate-50 p-3">
            <summary className="cursor-pointer text-base font-black text-slate-700">Preview the instruction</summary>
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{prompt}</pre>
          </details>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-xl font-black text-slate-900">2 · Paste the JSON your AI returned</h3>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={14} placeholder='{ "meta": { … }, "questions": [ … ] }'
            className="w-full rounded-2xl border-2 border-slate-300 p-3 font-mono text-xs outline-none focus:border-indigo-500" />
          <div className="flex flex-wrap gap-2">
            <Btn variant="ok" size="lg" onClick={validate}>✅ Validate & load into the games</Btn>
            <Btn onClick={() => { setPack(DEFAULT_PACK); setReport(null); audio.whoosh(); }}>↺ Restore demo pack</Btn>
            <Btn onClick={() => copy(JSON.stringify(pack, null, 2), 'pack')}>{copied === 'pack' ? '✓ Copied' : '⬇ Copy current pack'}</Btn>
          </div>

          {report && (
            <div className={`space-y-2 rounded-2xl border-4 p-4 ${report.ok ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
              <h4 className="text-xl font-black">{report.ok ? '✅ Pack loaded' : '❌ Fix these before class'}</h4>
              <div className="flex flex-wrap gap-2">{report.summary.map((s) => <Chip key={s} tone="slate">{s}</Chip>)}</div>
              {report.errors.map((e, i) => <p key={i} className="text-base font-bold text-rose-800">• {e}</p>)}
              {report.warns.map((w, i) => <p key={i} className="text-sm font-semibold text-amber-700">⚠ {w}</p>)}
            </div>
          )}
        </Card>
      </div>

      <Card className="space-y-2">
        <h3 className="text-xl font-black text-slate-900">What the validator enforces</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {[
            'Valid JSON, unique prompts, no duplicated cards.',
            'Every card carries a complete mini lesson (rule + model sentence).',
            'Reading cards ship their own text; listening cards ship their own script.',
            'No reference to anything outside the JSON (textbook, board, handout, video).',
            'Media must be https and on a trusted host, with a caption.',
            'Everything is checked against the CEFR level you selected.',
          ].map((t) => <p key={t} className="rounded-xl bg-slate-50 px-3 py-2 text-base font-semibold text-slate-700">✔ {t}</p>)}
        </div>
      </Card>
    </div>
  );
}
