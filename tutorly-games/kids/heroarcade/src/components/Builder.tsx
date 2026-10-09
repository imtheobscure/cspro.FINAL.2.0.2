import { useMemo, useState } from 'react';
import { Theme, LANGS, LANG_META, Lang } from '../data/types';
import { useStore, FONT_STEPS } from '../lib/store';
import { speak, voicesFor, naturalVoicesFor, voiceChoices } from '../lib/audio';
import { ACTIVITY_LABELS, EXAMPLE_PLAN, basePlan, buildPlanPrompt, parsePlan } from '../lib/lessons';
import { Btn, Icon } from './ui';

/* ============================ CATEGORY (THEME) BUILDER ============================ */

const EXAMPLE = {
  id: 'dinosaurs',
  icon: '🦖',
  color: '#D9F99D',
  title: { en: 'Dinosaurs', zh: '恐龙', fr: 'Dinosaures', it: 'Dinosauri', de: 'Dinosaurier', tr: 'Dinozorlar', fa: 'دایناسورها' },
  words: [
    { id: 't-rex', icon: '🦖', t: { en: 'T-rex', zh: '霸王龙', fr: 'T-rex', it: 'T-rex', de: 'T-Rex', tr: 'T-rex', fa: 'تی‌رکس' }, ccq: ['Is a T-rex big or small?', 'Does a T-rex have big teeth?'] },
  ],
  talk: ['Which dinosaur do you like?', 'Are dinosaurs alive today?'],
  story: {
    title: 'The Dinosaur Egg',
    pages: [{ icon: '🥚', text: 'Max finds a big egg in the park.' }, { icon: '🦕', text: 'Crack! A baby dinosaur comes out.' }],
    questions: [{ q: 'What does Max find?', options: ['An egg', 'A ball', 'A hat'], answer: 0 }],
  },
};

export function buildPrompt(topic: string) {
  return `You are an expert designer of bilingual language lessons for children aged 6–12 (the Tutorly HeroArcade app).
Create ONE complete lesson theme about: "${topic || 'YOUR TOPIC HERE'}".

Return ONLY valid JSON (no markdown, no comments) that matches this exact schema:
${JSON.stringify(EXAMPLE, null, 2)}

Rules:
1. "id": lowercase letters/dashes, unique. "icon": ONE emoji. "color": a soft pastel hex.
2. "title": translations for all 7 languages: en, zh (Simplified Chinese), fr, it, de, tr, fa (Farsi).
3. "words": AT LEAST 20 words. Each word has: "id" (lowercase, dashes), "icon" (ONE emoji that clearly shows the word – it is rendered with OpenMoji SVG), "t" with ALL 7 languages, and 1–2 "ccq" (simple English concept-checking questions a tutor can ask, e.g. "Is it big or small?", "Do you like it?", "What color is it?").
4. "talk": 4 open speaking questions in very simple English.
5. "story": a short story (6 pages) about the Tutorly Heroes – Max (⚡ super speed), Lina (🦸‍♀️ can fly), Kai (💪 super strong), Zara (🐾 talks to animals) and Bolt (🤖 robot dog). Each page: ONE emoji "icon" + 1–2 very short sentences in simple present-tense English (A1 level, max 12 words per sentence). Use at least 6 words from the word list. 3 comprehension "questions" with 3 options each and "answer" = index of the correct option.
6. Language must be super simple, positive and safe for kids. No violence, no scary content.
7. Output nothing except the JSON object.`;
}

/* ============================ THE BUILDER SCREEN ============================ */

type Tab = 'theme' | 'lesson';

export function LessonBuilder({ onBack }: { onBack: () => void }) {
  const { addCustomTheme, customThemes, removeCustomTheme, themes, lessonPlans, addLessonPlan, removeLessonPlan } = useStore();
  const [tab, setTab] = useState<Tab>('theme');
  const [topic, setTopic] = useState('');
  const [json, setJson] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [warn, setWarn] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [planTheme, setPlanTheme] = useState<string>(customThemes[0]?.id ?? themes[0]?.id ?? '');

  const themeForPlan = themes.find((t) => t.id === planTheme) ?? themes[0];

  const copy = async (text: string) => {
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
    setTimeout(() => setCopied(false), 2000);
  };

  /* ------------------------------- a new category ------------------------------- */
  const validate = (t: any): string | null => {
    if (!t || typeof t !== 'object') return 'Not an object';
    if (!t.id || !t.icon || !t.title) return 'Missing id/icon/title';
    for (const l of LANGS) if (!t.title[l]) return `title.${l} missing`;
    if (!Array.isArray(t.words) || t.words.length < 5) return 'Need at least 5 words';
    for (const w of t.words) { if (!w.id || !w.icon || !w.t) return `Word "${w.id || '?'}" incomplete`; for (const l of LANGS) if (!w.t[l]) return `Word "${w.id}" missing "${l}"`; }
    if (!Array.isArray(t.talk)) t.talk = [];
    if (!t.story || !Array.isArray(t.story.pages) || !t.story.pages.length) return 'Story pages missing';
    if (!Array.isArray(t.story.questions)) t.story.questions = [];
    if (!t.color) t.color = '#E0E7FF';
    return null;
  };

  const importTheme = () => {
    setErr(''); setOk(''); setWarn([]);
    try {
      const cleaned = json.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
      const t = JSON.parse(cleaned);
      const e = validate(t);
      if (e) { setErr('❌ ' + e); return; }
      addCustomTheme(t as Theme);
      setOk(`✅ Added "${t.title.en}" with ${t.words.length} words! Find it on the home screen.`);
      setPlanTheme(t.id);
      setJson('');
    } catch (e: any) { setErr('❌ Invalid JSON: ' + e.message); }
  };

  /* ------------------------------- a lesson plan ------------------------------- */
  const planPrompt = useMemo(
    () => (themeForPlan ? buildPlanPrompt(themeForPlan, 'en', topic) : ''),
    [themeForPlan, topic],
  );

  const importPlan = () => {
    setErr(''); setOk(''); setWarn([]);
    if (!themeForPlan) { setErr('❌ There is no theme to write a plan for.'); return; }
    const result = parsePlan(json, themeForPlan);
    if (!result.ok) { setErr('❌ ' + result.error); return; }
    addLessonPlan(result.plan);
    setWarn(result.warnings);
    setOk(`✅ Added the plan "${result.plan.title}" — ${result.plan.steps.length} steps, ${result.plan.minutes} min. Open the theme and tap 📋 Lesson Plan.`);
    setJson('');
  };

  const planIsForSelected = json.trim().length > 0;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 flex-wrap">
        <Btn tone="ghost" onClick={onBack}>← Back</Btn>
        <h2 className="text-4xl font-black text-slate-800">🧩 Builder</h2>
        <div className="flex gap-2 ml-auto flex-wrap">
          <Btn tone={tab === 'theme' ? 'primary' : 'soft'} size="lg" onClick={() => { setTab('theme'); setErr(''); setOk(''); setWarn([]); }}>🗂️ New category</Btn>
          <Btn tone={tab === 'lesson' ? 'primary' : 'soft'} size="lg" onClick={() => { setTab('lesson'); setErr(''); setOk(''); setWarn([]); }}>📋 New lesson plan</Btn>
        </div>
      </div>

      {tab === 'theme' ? (
        <>
          <p className="text-xl text-slate-600 font-semibold">Make a brand-new theme in 3 steps: copy the AI prompt → paste it into ChatGPT / Claude / Gemini → paste the JSON answer here. The new theme gets the full dictionary, CCQs, chant, quizzes, matching, story and all 8 games automatically.</p>

          <div className="bg-white rounded-3xl border-4 border-slate-100 shadow-[0_6px_0_#e2e8f0] p-6 flex flex-col gap-4">
            <div className="text-2xl font-black text-slate-800">1 · Topic</div>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Dinosaurs, Halloween, Under the Sea Adventure…" className="text-2xl border-4 border-slate-200 rounded-2xl px-5 py-3 focus:border-indigo-400 outline-none" />
            <div className="text-2xl font-black text-slate-800">2 · Copy the prompt</div>
            <textarea readOnly value={buildPrompt(topic)} className="text-sm font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 h-56" />
            <div><Btn size="lg" tone="accent" onClick={() => copy(buildPrompt(topic))}>{copied ? '✅ Copied!' : '📋 Copy AI prompt'}</Btn></div>
          </div>

          <div className="bg-white rounded-3xl border-4 border-slate-100 shadow-[0_6px_0_#e2e8f0] p-6 flex flex-col gap-4">
            <div className="text-2xl font-black text-slate-800">3 · Paste the JSON from the AI</div>
            <textarea value={json} onChange={(e) => setJson(e.target.value)} placeholder='{ "id": "...", "icon": "🦖", ... }' className="text-base font-mono border-4 border-slate-200 rounded-2xl p-4 h-56 focus:border-indigo-400 outline-none" />
            <div className="flex gap-3 items-center flex-wrap">
              <Btn size="lg" tone="success" onClick={importTheme}>➕ Add category</Btn>
              <Btn size="lg" tone="ghost" onClick={() => setJson(JSON.stringify(EXAMPLE, null, 2))}>Load example</Btn>
              {err && <span className="text-rose-600 font-bold text-lg">{err}</span>}
              {ok && <span className="text-emerald-600 font-bold text-lg">{ok}</span>}
            </div>
          </div>

          {customThemes.length > 0 && (
            <div className="bg-white rounded-3xl border-4 border-slate-100 p-6">
              <div className="text-2xl font-black text-slate-800 mb-3">Your custom categories</div>
              <div className="flex flex-col gap-2">
                {customThemes.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2 flex-wrap">
                    <Icon icon={t.icon} size={40} /><span className="text-xl font-bold text-slate-800 flex-1">{t.title.en} · {t.words.length} words</span>
                    <Btn tone="ghost" onClick={() => { const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${t.id}.json`; a.click(); }}>⬇ Export</Btn>
                    <Btn tone="danger" onClick={() => removeCustomTheme(t.id)}>🗑</Btn>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xl text-slate-600 font-semibold">A lesson plan is the order you teach in: 4–6 timed steps that say exactly what to say, what to ask, and which activity to open. Every theme already has a plan written by the app — this makes a sharper one for your learner.</p>

          <div className="bg-white rounded-3xl border-4 border-slate-100 shadow-[0_6px_0_#e2e8f0] p-6 flex flex-col gap-4">
            <div className="text-2xl font-black text-slate-800">1 · Which theme, and what should the lesson do?</div>
            <select value={planTheme} onChange={(e) => setPlanTheme(e.target.value)} className="text-xl border-4 border-slate-200 rounded-2xl px-4 py-3 bg-white font-bold">
              {(customThemes.length ? [...customThemes, ...themes.filter((t) => !t.custom)] : themes).map((t) => (
                <option key={t.id} value={t.id}>{t.icon} {t.title.en} · {t.words.length} words</option>
              ))}
            </select>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. A gentle first lesson, A fast speaking warm-up, Practice for a shy learner…" className="text-xl border-4 border-slate-200 rounded-2xl px-5 py-3 focus:border-indigo-400 outline-none" />
            <div className="text-2xl font-black text-slate-800">2 · Copy the prompt</div>
            <textarea readOnly value={planPrompt} className="text-sm font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 h-56" />
            <div><Btn size="lg" tone="accent" onClick={() => copy(planPrompt)}>{copied ? '✅ Copied!' : '📋 Copy lesson-plan prompt'}</Btn></div>
          </div>

          <div className="bg-white rounded-3xl border-4 border-slate-100 shadow-[0_6px_0_#e2e8f0] p-6 flex flex-col gap-4">
            <div className="text-2xl font-black text-slate-800">3 · Paste the JSON plan from the AI</div>
            <textarea value={json} onChange={(e) => setJson(e.target.value)} placeholder='{ "id": "space-speaking", "theme": "space", "steps": [ … ] }' className="text-base font-mono border-4 border-slate-200 rounded-2xl p-4 h-56 focus:border-indigo-400 outline-none" />
            <div className="flex gap-3 items-center flex-wrap">
              <Btn size="lg" tone="success" disabled={!planIsForSelected} onClick={importPlan}>➕ Add lesson plan</Btn>
              <Btn size="lg" tone="ghost" onClick={() => themeForPlan && setJson(EXAMPLE_PLAN(themeForPlan))}>Load example</Btn>
              {err && <span className="text-rose-600 font-bold text-lg">{err}</span>}
              {ok && <span className="text-emerald-600 font-bold text-lg">{ok}</span>}
            </div>
            {warn.length > 0 && (
              <ul className="text-lg font-semibold text-amber-700 list-disc pl-6 flex flex-col gap-1">
                {warn.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
            <p className="text-base font-semibold text-slate-500">The activities a step can name: {Object.values(ACTIVITY_LABELS).map((a) => `${a.icon} ${a.label}`).join(' · ')}</p>
          </div>

          {lessonPlans.length > 0 && (
            <div className="bg-white rounded-3xl border-4 border-slate-100 p-6">
              <div className="text-2xl font-black text-slate-800 mb-3">Your lesson plans</div>
              <div className="flex flex-col gap-2">
                {lessonPlans.map((p) => {
                  const t = themes.find((x) => x.id === p.theme);
                  return (
                    <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2 flex-wrap">
                      <Icon icon={t?.icon ?? '📋'} size={40} />
                      <span className="text-xl font-bold text-slate-800 flex-1">{p.title} · {p.steps.length} steps · {p.minutes} min{t ? ` · ${t.title.en}` : ''}</span>
                      <Btn tone="ghost" onClick={() => { const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${p.id}.json`; a.click(); }}>⬇ Export</Btn>
                      <Btn tone="danger" onClick={() => removeLessonPlan(p.id)}>🗑</Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-sky-50 border-4 border-sky-200 rounded-3xl p-6">
            <div className="text-2xl font-black text-sky-900 mb-2">Already planned for you</div>
            <p className="text-lg font-semibold text-slate-600">Every theme ships with a plan the app writes itself, from that theme&apos;s own words, CCQs and story.</p>
            {themeForPlan && <Btn size="lg" tone="soft" className="mt-3" onClick={() => { setJson(''); setOk(`✅ “${basePlan(themeForPlan, 'en').title}” is always available in 📋 Lesson Plan.`); setErr(''); setWarn([]); }}>Show me the built-in plan</Btn>}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================ SETTINGS ============================ */

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, update } = useStore();
  const [testing, setTesting] = useState(false);
  const [voiceReport, setVoiceReport] = useState<{ natural: string[]; any: string[] } | null>(null);

  const langBtn = (l: Lang, active: boolean, onClick: () => void) => (
    <button key={l} onClick={onClick} className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-4 text-xl font-bold ${active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'}`}>
      <span className="text-2xl">{LANG_META[l].flag}</span>{LANG_META[l].native}
    </button>
  );

  const scan = (lang: Lang) => {
    const natural = naturalVoicesFor(lang).map((v) => v.name);
    const any = voicesFor(lang).map((v) => v.name);
    setVoiceReport({ natural, any });
  };

  const TEST_LINE: Record<string, string> = {
    en: 'Hello! I am your reading friend. Let’s say it together!',
    zh: '你好！我是你的朗读小伙伴，我们一起说！',
    fr: 'Bonjour ! Je suis ton ami de lecture. Dis-le avec moi !',
    it: 'Ciao! Sono il tuo amico che legge. Dillo con me!',
    de: 'Hallo! Ich bin dein Lese-Freund. Sag es mit mir!',
    tr: 'Merhaba! Ben senin okuma arkadaşınım. Birlikte söyleyelim!',
    fa: 'سلام! من دوست کتاب‌خوان تو هستم. با من بگو!',
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-40 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[2rem] w-full max-w-4xl p-8 flex flex-col gap-6 my-8 shadow-2xl">
        <div className="flex items-center"><h2 className="text-4xl font-black text-slate-800">⚙️ Settings</h2><Btn tone="ghost" className="ml-auto" onClick={onClose}>Close ✕</Btn></div>

        <section>
          <div className="text-2xl font-black text-slate-800 mb-2">🗣️ Learning language <span className="text-slate-400 text-lg font-semibold">(big text &amp; voice)</span></div>
          <div className="flex flex-wrap gap-2">{LANGS.map((l) => langBtn(l, settings.learn === l, () => update({ learn: l })))}</div>
        </section>
        <section>
          <div className="text-2xl font-black text-slate-800 mb-2">📝 Support language <span className="text-slate-400 text-lg font-semibold">(small text under words – choose &quot;None&quot; for monolingual)</span></div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => update({ support: 'none' })} className={`px-4 py-3 rounded-2xl border-4 text-xl font-bold ${settings.support === 'none' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-200 text-slate-700'}`}>🚫 None (monolingual)</button>
            {LANGS.map((l) => langBtn(l, settings.support === l, () => update({ support: l })))}
          </div>
        </section>

        <section className="bg-sky-50 border-4 border-sky-200 rounded-3xl p-5 flex flex-col gap-3">
          <div className="text-2xl font-black text-sky-900">🎙️ Read-aloud voices (natural child voices)</div>
          <p className="text-slate-600">HeroArcade reads with Microsoft&apos;s natural neural voices when the device has them — Ana, Maisie, Xiaoshuang, Xiaoyou, Éloïse, Pierina, Gisela, Amala, Emel, Dilara — exactly what Edge&apos;s own “Read aloud” uses. No key and no server are needed; add an Azure key below only if you have one and want it used instead.</p>
          <div className="grid md:grid-cols-2 gap-3">
            <input type="password" value={settings.azureKey} onChange={(e) => update({ azureKey: e.target.value })} placeholder="Azure Speech resource key (optional)" className="text-lg border-4 border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-sky-400" />
            <input value={settings.azureRegion} onChange={(e) => update({ azureRegion: e.target.value })} placeholder="Region, e.g. eastus / westeurope" className="text-lg border-4 border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-sky-400" />
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            {LANGS.map((l) => (
              <label key={l} className="flex items-center gap-2 text-lg font-semibold text-slate-700">
                <span className="w-28">{LANG_META[l].flag} {LANG_META[l].name}</span>
                <select value={settings.voices[l] || voiceChoices(l)[0].id} onChange={(e) => update({ voices: { ...settings.voices, [l]: e.target.value } })} className="flex-1 border-2 border-slate-200 rounded-xl px-2 py-2 bg-white">
                  {voiceChoices(l).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-lg font-semibold text-slate-700 flex items-center gap-2">Speed <input type="range" min={0.6} max={1.2} step={0.05} value={settings.rate} onChange={(e) => update({ rate: parseFloat(e.target.value) })} /> {settings.rate.toFixed(2)}×</label>
            <Btn tone="soft" disabled={testing} onClick={async () => { setTesting(true); await speak(TEST_LINE[settings.learn] ?? TEST_LINE.en, settings.learn); setTesting(false); }}>🔊 Test voice</Btn>
            <Btn tone="soft" onClick={() => scan(settings.learn)}>🔍 Check which voices this device has</Btn>
          </div>
          {voiceReport && (
            <div className="bg-white rounded-2xl p-4 text-lg font-semibold text-slate-700">
              <b>{voiceReport.natural.length} natural Microsoft voice{voiceReport.natural.length === 1 ? '' : 's'} for {LANG_META[settings.learn].name}:</b>
              {voiceReport.natural.length > 0 ? <ul className="list-disc pl-6">{voiceReport.natural.map((n) => <li key={n}>{n}</li>)}</ul> : <p className="text-slate-500">None found — read-aloud will use the best installed voice instead. Edge on Windows usually has them; add the Azure key above to use them anywhere.</p>}
              {voiceReport.any.length > 0 && <p className="text-slate-500 mt-2">All {LANG_META[settings.learn].name} voices: {voiceReport.any.join(', ')}</p>}
            </div>
          )}
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 text-xl font-bold text-slate-700 bg-slate-50 rounded-2xl px-4 py-3"><input type="checkbox" className="w-6 h-6" checked={settings.sfx} onChange={(e) => update({ sfx: e.target.checked })} /> Sound effects</label>
          <label className="flex items-center gap-3 text-xl font-bold text-slate-700 bg-slate-50 rounded-2xl px-4 py-3"><input type="checkbox" className="w-6 h-6" checked={settings.autoSpeak} onChange={(e) => update({ autoSpeak: e.target.checked })} /> Auto read-aloud</label>
        </section>

        <section className="bg-slate-50 rounded-3xl p-5">
          <div className="text-2xl font-black text-slate-800 mb-2">🔠 Text size</div>
          <p className="text-slate-600 mb-3">Every size in the app scales from this one setting, so it is the fastest way to make HeroArcade comfortable on a shared screen. It opens at <b>Extra large</b>, and steps down a little on a narrow window so nothing has to wrap.</p>
          <div className="flex flex-wrap gap-2">
            {([['Large', FONT_STEPS[0]], ['Extra large', FONT_STEPS[1]], ['Huge', FONT_STEPS[2]], ['Giant', FONT_STEPS[3]]] as const).map(([label, value]) => (
              <button key={label} onClick={() => update({ fontScale: value })} className={`px-4 py-3 rounded-2xl border-4 text-xl font-bold ${settings.fontScale === value ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-200 text-slate-700'}`}>{label}</button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
