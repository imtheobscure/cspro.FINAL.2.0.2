'use client';
import { useMemo, useState } from 'react';
import { ArrowRight, Check, ClipboardCopy, FileJson, Layers, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import Shell from './Shell';
import { usePacksVersion } from '@/lib/playroom/usePacks';
import {
  EXAMPLE_LESSON,
  EXAMPLE_THEME,
  STUDIO_IDS,
  STUDIO_NAMES,
  addLessonPackFromText,
  addThemePackFromText,
  buildLessonPrompt,
  buildThemePrompt,
  customLessonPacks,
  customThemePacks,
  removeLessonPack,
  removeThemePack,
  type InstallResult,
  type StudioId,
} from '@/lib/playroom/customPack';
import { t } from '@/lib/data/phrases';

/**
 * MAKE YOUR OWN — the “copy an AI prompt, paste the JSON back” screen.
 *
 * The tutor chooses a topic, copies a prompt that already describes this game's
 * exact schema (so the AI cannot invent a shape ToyBox cannot read), pastes the
 * answer into a box and presses one button. Both kinds of content ToyBox has
 * are here: a whole CATEGORY PACK (theme → units → words, in six languages) and
 * a LESSON PLAN for one studio (timed steps, what to say, what to ask).
 *
 * Everything is stored as the raw pasted JSON, so a fix in the importer upgrades
 * packs pasted before it, and nothing is stored as a half-built object graph.
 */
const TABS = [
  { id: 'pack' as const, label: '🗂️ A new category', blurb: 'A theme with units and words — the word garden, the lesson library and every word game get it at once.' },
  { id: 'lesson' as const, label: '📋 A lesson plan', blurb: 'A timed plan for one studio: what you say, what you ask, and a tip for each step.' },
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="button primary large"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const area = document.createElement('textarea');
          area.value = text;
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          document.body.removeChild(area);
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      }}
    >
      <ClipboardCopy size={19} />
      {copied ? 'Copied! Paste it into your AI' : label}
    </button>
  );
}

function ResultBanner({ result }: { result: InstallResult | null }) {
  if (!result) return null;
  if (!result.ok) return <p className="error-text" role="alert">❌ {result.error}</p>;
  return (
    <div className="success-text" role="status">
      ✅ {result.summary}
      {result.warnings.length > 0 && (
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
          {result.warnings.slice(0, 8).map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PackStudio() {
  const packsVersion = usePacksVersion();
  const [tab, setTab] = useState<'pack' | 'lesson'>('pack');
  const [topic, setTopic] = useState('');
  const [game, setGame] = useState<StudioId>('monsters');
  const [json, setJson] = useState('');
  const [result, setResult] = useState<InstallResult | null>(null);
  const [busy, setBusy] = useState(false);

  const themePrompt = useMemo(() => buildThemePrompt(topic), [topic]);
  const lessonPrompt = useMemo(() => buildLessonPrompt({ topic, game }), [topic, game]);
  const prompt = tab === 'pack' ? themePrompt : lessonPrompt;

  // `packsVersion` is what re-reads the registries after every install.
  const themes = useMemo(() => customThemePacks(), [packsVersion]);
  const lessons = useMemo(() => customLessonPacks(), [packsVersion]);

  const install = () => {
    setBusy(true);
    setResult(null);
    try {
      const next = tab === 'pack' ? addThemePackFromText(json) : addLessonPackFromText(json);
      setResult(next);
      if (next.ok) setJson('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <h1>Make your own for ToyBox</h1>
            <p>Copy a ready-made prompt, paste it into your favourite AI, then paste the answer back. No account, no key, no code.</p>
          </div>
          <span className="date-pill"><WandSparkles size={15} /> Two minutes per topic</span>
        </div>

        <div className="filters">
          {TABS.map((x) => (
            <button key={x.id} className={`filter ${tab === x.id ? 'active' : ''}`} onClick={() => { setTab(x.id); setResult(null); }}>
              {x.label}
            </button>
          ))}
          <span className="small-badge">{TABS.find((x) => x.id === tab)?.blurb}</span>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <section className="panel">
            <div className="eyebrow" style={{ marginBottom: 13 }}><Sparkles size={14} /> STEP 1 · CHOOSE WHAT TO MAKE</div>
            <h2>{tab === 'pack' ? 'A category pack' : 'A lesson plan'}</h2>
            <label className="form-label" htmlFor="pack-topic">Topic</label>
            <input
              id="pack-topic"
              className="form-input"
              placeholder={tab === 'pack' ? 'e.g. Space, Dinosaurs, Under the sea, Jobs people do…' : 'e.g. Six space words to echo, Warm-up for the talking train…'}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            {tab === 'lesson' && (
              <>
                <label className="form-label" htmlFor="pack-game">Which studio is this plan for?</label>
                <select id="pack-game" className="form-input" value={game} onChange={(e) => setGame(e.target.value as StudioId)}>
                  {STUDIO_IDS.map((id) => <option key={id} value={id}>{STUDIO_NAMES[id]}</option>)}
                </select>
              </>
            )}
          </section>

          <section className="panel">
            <div className="eyebrow" style={{ marginBottom: 13 }}><ClipboardCopy size={14} /> STEP 2 · COPY THE PROMPT</div>
            <h2>Give this to ChatGPT, Claude, Gemini — anything that writes JSON</h2>
            <p>It already contains {tab === 'pack' ? 'the exact category schema' : `the exact lesson schema for ${STUDIO_NAMES[game]}`}, the six languages and the rules, so the answer drops straight in.</p>
            <textarea readOnly value={prompt} className="ai-prompt" aria-label="AI prompt" />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 13 }}>
              <CopyButton text={prompt} label="📋 Copy the AI prompt" />
              <button className="button secondary large" onClick={() => setJson(tab === 'pack' ? EXAMPLE_THEME : EXAMPLE_LESSON)}>
                <FileJson size={18} /> Load an example JSON
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="eyebrow" style={{ marginBottom: 13 }}><Layers size={14} /> STEP 3 · PASTE THE ANSWER</div>
            <h2>Paste the AI’s JSON here</h2>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder='{ "id": "space", "icon": "🚀", … }'
              className="ai-prompt ai-paste"
              aria-label="Pasted JSON"
            />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 13 }}>
              <button className="button primary large" disabled={busy || !json.trim()} onClick={install}>
                <Check size={19} /> {tab === 'pack' ? 'Add this category' : 'Add this lesson plan'}
              </button>
              <button className="button ghost" disabled={!json.trim()} onClick={() => { setJson(''); setResult(null); }}>Clear</button>
            </div>
            <ResultBanner result={result} />
          </section>

          <section className="panel">
            <div className="eyebrow" style={{ marginBottom: 13 }}><Layers size={14} /> YOUR OWN CONTENT</div>
            <h2>{themes.length + lessons.length} made by you</h2>
            {themes.length === 0 && lessons.length === 0 && (
              <p>Nothing yet. Everything you add is kept in this browser, appears in the word garden and the lesson library, and can be exported back out to share with another tutor.</p>
            )}
            <div className="lesson-list" style={{ marginTop: 6 }}>
              {themes.map((theme) => (
                <article className="lesson-row" key={theme.id}>
                  <span style={{ fontSize: 34 }} aria-hidden>{theme.icon}</span>
                  <div className="lesson-details">
                    <h3>{t(theme.name, 'en')}</h3>
                    <p>Category pack · {theme.units.length} units · {theme.units.reduce((n, u) => n + u.words.length, 0)} words</p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => {
                      const raw = window.localStorage.getItem('toybox.customPacks.v1');
                      const pack = raw ? (JSON.parse(raw).themes as { id: string }[]).find((x) => x.id === theme.id) : null;
                      if (!pack) return;
                      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `${theme.id}.json`;
                      a.click();
                    }}
                  >
                    ⬇ Export
                  </button>
                  <button className="icon-btn" aria-label={`Delete ${t(theme.name, 'en')}`} onClick={() => { removeThemePack(theme.id); setResult(null); }}>
                    <Trash2 size={15} />
                  </button>
                </article>
              ))}
              {lessons.map((lesson) => (
                <article className="lesson-row" key={lesson.id}>
                  <span style={{ fontSize: 30 }} aria-hidden>📋</span>
                  <div className="lesson-details">
                    <h3>{t(`custom.lesson.${lesson.id}`, 'en')}</h3>
                    <p>{STUDIO_NAMES[lesson.game]} · {lesson.steps.length} steps · {lesson.minutes} min</p>
                  </div>
                  <a className="button secondary" href={`/studio/${lesson.game}/?lesson=${encodeURIComponent(lesson.id)}`}>
                    Play <ArrowRight size={15} />
                  </a>
                  <button className="icon-btn" aria-label={`Delete ${lesson.id}`} onClick={() => { removeLessonPack(lesson.id); setResult(null); }}>
                    <Trash2 size={15} />
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="eyebrow" style={{ marginBottom: 13 }}><Sparkles size={14} /> GOOD TO KNOW</div>
            <ul className="howto-list">
              <li><b>Six languages are required.</b> A word needs English, Chinese (with pinyin), French, Italian, German and Turkish. The prompt asks for all six; if one is missing the importer fills it with English and tells you.</li>
              <li><b>One emoji per word.</b> Pictures come from the emoji itself, so a word needs a single emoji, never a link or a description.</li>
              <li><b>New ids only.</b> ToyBox already has a big dictionary; a pack that reuses “dog” or “red” keeps the built-in word and reports it.</li>
              <li><b>Plans can bring their own words.</b> Use <code>newWords</code> in a lesson plan when the plan needs a word the dictionary does not have yet.</li>
              <li><b>Everything stays here.</b> Packs are kept in this browser. Use Export to move one to another computer.</li>
            </ul>
          </section>
        </div>
      </main>
    </Shell>
  );
}
