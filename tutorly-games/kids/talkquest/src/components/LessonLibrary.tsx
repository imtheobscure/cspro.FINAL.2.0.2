'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { allThemes, isBuiltInTheme, subscribeThemes, themesVersion } from '@/data/themesMaster';
import { AudioManager } from '@/lib/audio';
import { WordPic } from '@/components/WordPic';
import { Search, ClipboardList, PlusCircle } from 'lucide-react';

interface Props {
  onOpenLesson: (slug: string) => void;
  onOpenPlan: (slug: string) => void;
  onAddContent: () => void;
}

export const LessonLibrary: React.FC<Props> = ({ onOpenLesson, onOpenPlan, onAddContent }) => {
  const [term, setTerm] = useState('');
  const [cat, setCat] = useState('All');
  // Re-render when a tutor pastes a category in, so it appears here immediately.
  const [v, setV] = useState(themesVersion());
  useEffect(() => subscribeThemes(() => setV(themesVersion())), []);
  const themes = useMemo(() => allThemes(), [v]);
  const cats = useMemo(() => ['All', ...Array.from(new Set(themes.map(t => t.category)))], [themes]);
  const list = themes.filter(t =>
    t.name.toLowerCase().includes(term.toLowerCase()) && (cat === 'All' || t.category === cat)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] card-3d p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900" style={{ fontFamily: 'var(--font-display), Fredoka, sans-serif' }}>
              Pick a lesson
            </h1>
            <p className="mt-1 text-base font-bold text-slate-500">
              {themes.length} topics · 20 words each · sentences, chants, quizzes, a story and a ready lesson plan
            </p>
          </div>
          <button onClick={() => { AudioManager.playSound('select'); onAddContent(); }}
            className="btn-3d flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm cursor-pointer">
            <PlusCircle className="w-4 h-4" /> Add a category with AI
          </button>
        </div>
        <div className="mt-5 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Find animals, food, space…"
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-orange-50 border-2 border-orange-100 text-base font-bold focus:outline-none focus:border-amber-400" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cats.map(c => (
            <button key={c} onClick={() => { AudioManager.playSound('select'); setCat(c); }}
              className={`px-3 py-1.5 rounded-full text-xs font-black cursor-pointer ${
                cat === c ? 'bg-slate-900 text-white' : 'bg-orange-50 text-slate-600 hover:bg-orange-100'
              }`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((t, i) => (
          <motion.div key={t.slug}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.015, 0.3) }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-3xl card-3d p-5 border-2 border-transparent hover:border-amber-300">
            {/* Two real buttons, not one card button with a nested one: a button
                inside a button is invalid HTML and the inner click gets eaten. */}
            <button onClick={() => { AudioManager.playSound('pop'); onOpenLesson(t.slug); }}
              className="w-full text-left cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <WordPic emoji={t.icon} size={36} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">{t.category}</p>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{t.name}</h3>
                </div>
              </div>
            </button>
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {['Words', 'Talk', 'Quiz', 'Story'].map(s => (
                <span key={s} className="px-2 py-0.5 rounded-full bg-orange-50 text-[10px] font-black text-slate-500">{s}</span>
              ))}
              {!isBuiltInTheme(t.slug) && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-black text-emerald-800">your category</span>
              )}
              <button onClick={() => { AudioManager.playSound('select'); onOpenPlan(t.slug); }}
                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-[10px] font-black text-sky-800 cursor-pointer hover:bg-sky-200">
                <ClipboardList className="w-3 h-3" /> Lesson plan
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
