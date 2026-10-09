import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { StoreProvider, useStore, FONT_STEPS } from './lib/store';
import { LANG_META, Theme } from './data/types';
import { HEROES } from './data';
import { Btn, Icon } from './components/ui';
import { ThemePage } from './components/ThemePage';
import { LessonBuilder, SettingsPanel } from './components/Builder';
import { cn } from './utils/cn';

function Logo() {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_5px_0_#312e81] flex items-center justify-center">
        <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none">
          <path d="M10 12h28" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <path d="M24 12v26" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <circle cx="36" cy="34" r="5" fill="#FBBF24" />
        </svg>
      </div>
      <div>
        <div className="text-3xl font-black text-slate-800 leading-none tracking-tight">HeroArcade</div>
        <div className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Tutorly kids · ages 6–12</div>
      </div>
    </div>
  );
}

function Home({ onOpen, onBuilder }: { onOpen: (t: Theme) => void; onBuilder: () => void }) {
  const { themes, settings } = useStore();
  const [q, setQ] = useState('');
  const L = settings.learn;
  const list = useMemo(() => themes.filter((t) => !q || t.title.en.toLowerCase().includes(q.toLowerCase()) || t.title[L].includes(q) || t.words.some((w) => w.t.en.toLowerCase().includes(q.toLowerCase()))), [themes, q, L]);
  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-[2.5rem] bg-white border-4 border-indigo-100 shadow-[0_10px_0_#c7d2fe] overflow-hidden grid lg:grid-cols-[1fr_460px]">
        <div className="p-8 md:p-10 flex flex-col gap-4 justify-center">            <div className="text-indigo-600 font-black uppercase tracking-widest">For ages 6–12 · Tutor-led · Screen-share ready</div>
            {/* The header count is derived, so a pasted theme or lesson plan is
                reflected here the moment it is added. */}
          <h1 className="text-5xl md:text-6xl font-black text-slate-800 leading-tight">Learn words. <span className="text-indigo-600">Speak</span> a lot. Have fun!</h1>
          <p className="text-2xl text-slate-600 font-semibold">{themes.length} themes · {themes.reduce((a, t) => a + t.words.length, 0)} words · 7 languages · 8 speaking games · a hero story for every theme.</p>
          <div className="flex gap-3 flex-wrap items-center">
            {HEROES.map((h) => <div key={h.id} className="flex items-center gap-1 bg-slate-50 rounded-full px-3 py-1 text-lg font-bold text-slate-700"><span className="text-2xl">{h.icon}</span>{h.name}</div>)}
          </div>
          <div className="flex gap-3 flex-wrap">
            <Btn size="lg" onClick={() => document.getElementById('themes')?.scrollIntoView({ behavior: 'smooth' })}>▶ Choose a theme</Btn>
            <Btn size="lg" tone="accent" onClick={onBuilder}>🧩 Build a new lesson with AI</Btn>
          </div>
        </div>
        <img src="./images/heroes.png" alt="Tutorly Heroes" className="w-full h-full object-cover min-h-[260px]" />
      </section>

      <section id="themes" className="flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-4xl font-black text-slate-800">Themes</h2>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a theme or word…" className="ml-auto text-xl border-4 border-slate-200 rounded-2xl px-5 py-3 w-full md:w-96 outline-none focus:border-indigo-400 bg-white" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {list.map((t, i) => (
            <motion.button key={t.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i, 20) * 0.02 }} whileHover={{ y: -6 }} whileTap={{ scale: 0.97 }} onClick={() => onOpen(t)}
              className="rounded-[2rem] border-4 border-white shadow-[0_8px_0_rgba(0,0,0,0.08)] p-5 flex flex-col items-center gap-2 text-center relative min-h-[200px] justify-center" style={{ background: t.color }}>
              {t.custom && <span className="absolute top-3 right-3 text-xs font-black bg-white/80 rounded-full px-2 py-1 text-indigo-700">CUSTOM</span>}
              <span className="absolute top-3 left-3 text-sm font-black text-slate-500/70">{i + 1}</span>
              <Icon icon={t.icon} size={84} />
              <div dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-2xl font-black text-slate-800 leading-tight">{t.title[L]}</div>
              {settings.support !== 'none' && settings.support !== L && <div className="text-lg font-semibold text-slate-600">{t.title[settings.support]}</div>}
              <div className="text-sm font-bold text-slate-500">{t.words.length} words</div>
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Shell() {
  const { settings, update, stars } = useStore();
  const [view, setView] = useState<'home' | 'theme' | 'builder'>('home');
  const [theme, setTheme] = useState<Theme | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const L = settings.learn;
  return (
    <div className="min-h-screen bg-[#FBF8F1] text-slate-800" style={{ fontFamily: '"Nunito", "Segoe UI", system-ui, sans-serif' }}>
      <header className="sticky top-0 z-30 bg-[#FBF8F1]/90 backdrop-blur border-b-2 border-slate-100">
        <div className="max-w-[1500px] mx-auto px-4 md:px-8 py-3 flex items-center gap-4 flex-wrap">
          <button onClick={() => { setView('home'); window.scrollTo(0, 0); }}><Logo /></button>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white rounded-2xl border-2 border-slate-200 p-1">
              <span className="text-slate-400 font-bold px-2 text-sm">LEARN</span>
              <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-lg font-black">{LANG_META[L].flag} {LANG_META[L].native}</button>
              <span className="text-slate-300">→</span>
              <span className="text-slate-400 font-bold px-1 text-sm">SUPPORT</span>
              <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-lg font-black">{settings.support === 'none' ? '🚫 None' : `${LANG_META[settings.support].flag} ${LANG_META[settings.support].native}`}</button>
            </div>
            <div className="bg-amber-100 text-amber-800 rounded-2xl px-4 py-2 text-xl font-black">⭐ {stars}</div>
            {/* Cycles Large → Extra large → Huge → Giant, then back. The whole app
                scales from this one number (see FONT_STEPS), so a tutor can fix
                readability for a shared screen in one click. */}
            <Btn tone="ghost" title={`Text size (${settings.fontScale}×)`} onClick={() => { const i = FONT_STEPS.indexOf(settings.fontScale as (typeof FONT_STEPS)[number]); update({ fontScale: FONT_STEPS[(i + 1 + FONT_STEPS.length) % FONT_STEPS.length] }); }}>A<span className="text-2xl">A</span></Btn>
            <Btn tone="ghost" onClick={() => setView('builder')}>🧩 Builder</Btn>
            <Btn tone="soft" onClick={() => setShowSettings(true)}>⚙️ Settings</Btn>
          </div>
        </div>
      </header>

      <main className={cn('max-w-[1500px] mx-auto px-4 md:px-8 py-6')}>
        {view === 'home' && <Home onOpen={(t) => { setTheme(t); setView('theme'); window.scrollTo(0, 0); }} onBuilder={() => setView('builder')} />}
        {view === 'theme' && theme && <ThemePage key={theme.id + L} theme={theme} onHome={() => setView('home')} />}
        {view === 'builder' && <LessonBuilder onBack={() => setView('home')} />}
      </main>

      <footer className="max-w-[1500px] mx-auto px-8 py-8 text-slate-400 text-base font-semibold flex flex-wrap gap-4 items-center">
        <span>© Tutorly · HeroArcade</span>
        <span>·</span>
        <span>Icons: OpenMoji (CC BY-SA 4.0)</span>
        <span>·</span>
        <span>Voices: Microsoft natural neural voices (kid voices first), Azure key optional</span>
        <span className="ml-auto">Safe · Low-stimulation · Tutor-controlled</span>
      </footer>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
