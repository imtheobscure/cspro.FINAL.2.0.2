'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Send, Wand2, FileJson, ClipboardList, Trash2, Package } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { allThemes, isBuiltInTheme, subscribeThemes, themesVersion } from '@/data/themesMaster';
import {
  addLessonPlanFromText, addThemePackFromText, buildLessonPlanPrompt, buildThemePrompt,
  installedPlanSlugs, isPastedPlan, planFor, removeLessonPlan, removeThemePack,
  subscribePlans, plansVersion, wordList,
} from '@/lib/customPack';

/**
 * The AI studio: two tabs, one for each thing a tutor can paste back.
 *
 *  🗂️ **A new category** fills the library with a topic the app does not have.
 *  📋 **A lesson plan** is a timed, tutor-ready plan for a topic already in the
 *     library — scripts, concept-check questions, and which game to play next.
 *
 * Both work offline: nothing is sent anywhere, and what is pasted in is stored in
 * this browser (see `customPack.ts`). The prompts tell the AI to keep the language
 * at a six-year-old's level, because that is the app's whole point.
 */

type Tab = 'category' | 'plan';

interface Props {
  onOpenLesson: (slug: string) => void;
  onOpenPlan: (slug: string) => void;
}

export const AiStudio: React.FC<Props> = ({ onOpenLesson, onOpenPlan }) => {
  const [tab, setTab] = useState<Tab>('category');
  const [topic, setTopic] = useState('');
  const [themeSlug, setThemeSlug] = useState('my-body');
  const [copied, setCopied] = useState(false);
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean; warnings?: string[] } | null>(null);
  /** What the last successful install was, so the follow-up link opens it. */
  const [lastSlug, setLastSlug] = useState<string | null>(null);

  // Re-render when a pack or plan is installed or removed.
  const themeV = useThemesVersion();
  const planV = usePlansVersion();
  const themes = useMemo(() => allThemes(), [themeV]);
  const pastedPlans = useMemo(() => installedPlanSlugs(), [planV]);

  const prompt = tab === 'category' ? buildThemePrompt(topic) : buildLessonPlanPrompt(themeSlug);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      AudioManager.playSound('coin');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMsg({ text: 'The browser would not let the app copy. Select the text above and copy it by hand.', error: true });
    }
  };

  const install = async () => {
    if (!json.trim()) {
      setMsg({ text: 'Paste the JSON from your AI first.', error: true });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const result = tab === 'category'
        ? addThemePackFromText(json)
        : addLessonPlanFromText(json, themeSlug);
      if (!result.ok) {
        AudioManager.playSound('wrong');
        setMsg({ text: result.error, error: true });
        return;
      }
      AudioManager.playSound('fanfare');
      setMsg({ text: result.summary, error: false, warnings: result.warnings });
      setLastSlug(tab === 'category' ? (result.slug ?? null) : themeSlug);
      setJson('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-3xl card-3d p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Wand2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900" style={{ fontFamily: 'var(--font-display), Fredoka, sans-serif' }}>
              Add your own lessons
            </h1>
            <p className="text-sm font-bold text-slate-500">
              Copy a prompt, paste it into any AI, then paste the answer back here. Nothing leaves this device.
            </p>
          </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-1 p-1.5 bg-orange-50 rounded-2xl">
          {([
            { id: 'category' as const, label: 'A new category', icon: <Package className="w-4 h-4" /> },
            { id: 'plan' as const, label: 'A lesson plan', icon: <ClipboardList className="w-4 h-4" /> },
          ]).map(t => (
            <button key={t.id} onClick={() => { AudioManager.playSound('select'); setTab(t.id); setMsg(null); setJson(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer ${
                tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1 — the prompt */}
      <div className="bg-white rounded-3xl card-3d p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-900">Step 1 — Copy the prompt</h2>
            <p className="text-xs font-bold text-slate-500">
              {tab === 'category'
                ? 'Type the topic you want, then paste the prompt into ChatGPT, Claude or Gemini.'
                : 'Pick the topic this plan is for — the prompt carries its real word list, so the plan fits.'}
            </p>
          </div>
          <button onClick={copy}
            className="btn-3d shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm cursor-pointer">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Prompt'}
          </button>
        </div>

        {tab === 'category' ? (
          <input value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="Type a topic — dinosaurs, my senses, a birthday party…"
            className="w-full mb-3 px-4 py-3.5 rounded-2xl bg-orange-50 border-2 border-orange-100 text-base font-bold focus:outline-none focus:border-amber-400" />
        ) : (
          <label className="block mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">This plan is for</span>
            <select value={themeSlug} onChange={e => { setThemeSlug(e.target.value); setJson(''); setMsg(null); }}
              className="mt-1 w-full px-4 py-3.5 rounded-2xl bg-orange-50 border-2 border-orange-100 text-base font-bold focus:outline-none focus:border-amber-400 cursor-pointer">
              {themes.map(t => (
                <option key={t.slug} value={t.slug}>
                  {t.icon} {t.name} · {wordList(t.slug).length} words{isPastedPlan(t.slug) ? ' · plan pasted' : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <pre className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 max-h-56 overflow-auto whitespace-pre-wrap">{prompt}</pre>
      </div>

      {/* Step 2 — the answer */}
      <div className="bg-white rounded-3xl card-3d p-6">
        <h2 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
          <FileJson className="w-5 h-5" /> Step 2 — Paste the JSON back
        </h2>
        <p className="text-xs font-bold text-slate-500 mb-4">
          {tab === 'category'
            ? 'It is checked, then added to your lesson library straight away.'
            : 'It replaces the plan the app writes itself for that topic. You can bring that one back at any time.'}
        </p>
        <textarea rows={9} value={json} onChange={e => setJson(e.target.value)}
          placeholder={tab === 'category'
            ? '{ "slug": "dinosaurs", "name": "Dinosaurs", "words": [ … ] }'
            : '{ "slug": "my-body", "title": "Hello, My Body!", "steps": [ … ] }'}
          className="w-full p-4 rounded-2xl bg-stone-50 border border-slate-300 text-sm font-mono text-slate-800 focus:outline-none focus:border-slate-600" />

        {msg && (
          <div className={`mt-3 p-4 rounded-2xl text-sm font-bold border ${msg.error ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <p>{msg.text}</p>
            {msg.warnings?.length ? (
              <ul className="mt-2 space-y-1 text-xs font-bold opacity-90">
                {msg.warnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            ) : null}
            {!msg.error && lastSlug && (
              <button
                onClick={() => (tab === 'category' ? onOpenLesson(lastSlug) : onOpenPlan(lastSlug))}
                className="btn-3d mt-3 px-4 py-2 rounded-xl bg-slate-900 text-white font-black text-xs cursor-pointer">
                {tab === 'category' ? 'Open it in the library →' : 'Read the plan →'}
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button onClick={install} disabled={busy}
            className="btn-3d flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black cursor-pointer">
            <Send className="w-4 h-4" /> {busy ? 'Checking…' : tab === 'category' ? 'Add category' : 'Add lesson plan'}
          </button>
        </div>
      </div>

      {/* What has been pasted in */}
      {(pastedThemes().length > 0 || pastedPlans.length > 0) && (
        <div className="bg-white rounded-3xl card-3d p-6">
          <h2 className="text-lg font-black text-slate-900 mb-3">Your own content</h2>
          <div className="space-y-2">
            {pastedThemes().map(t => (
              <div key={t.slug} className="flex items-center gap-3 p-3 rounded-2xl bg-orange-50">
                <span className="text-2xl">{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-800 truncate">{t.name}</p>
                  <p className="text-xs font-bold text-slate-500">{wordList(t.slug).length} words · your category</p>
                </div>
                <button onClick={() => { AudioManager.playSound('select'); onOpenLesson(t.slug); }}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white font-black text-xs cursor-pointer">Open</button>
                <button onClick={() => { removeThemePack(t.slug); }}
                  className="p-2 rounded-xl bg-rose-100 text-rose-700 cursor-pointer" title="Remove this category">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {pastedPlans.map(slug => (
              <div key={slug} className="flex items-center gap-3 p-3 rounded-2xl bg-sky-50">
                <span className="text-2xl">📋</span>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-800 truncate">{planFor(slug).title}</p>
                  <p className="text-xs font-bold text-slate-500">
                    {planFor(slug).steps.length} steps · {planFor(slug).minutes} min · pasted plan
                  </p>
                </div>
                <button onClick={() => { AudioManager.playSound('select'); onOpenPlan(slug); }}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white font-black text-xs cursor-pointer">Read</button>
                <button onClick={() => { removeLessonPlan(slug); }}
                  className="p-2 rounded-xl bg-rose-100 text-rose-700 cursor-pointer"
                  title="Remove the pasted plan and go back to the plan the app writes">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs font-bold text-slate-500">
        Tip: paste a category first, then ask for a lesson plan for it — the plan prompt already knows its words.
      </p>
    </div>
  );
};

/* ── small reactive helpers ─────────────────────────────────────────────── */

function useThemesVersion() {
  const [v, setV] = React.useState(themesVersion());
  React.useEffect(() => subscribeThemes(() => setV(themesVersion())), []);
  return v;
}

function usePlansVersion() {
  const [v, setV] = React.useState(plansVersion());
  React.useEffect(() => subscribePlans(() => setV(plansVersion())), []);
  return v;
}

/** The themes the tutor pasted in: everything that is not a shipped theme. */
function pastedThemes() {
  return allThemes().filter(t => !isBuiltInTheme(t.slug));
}
