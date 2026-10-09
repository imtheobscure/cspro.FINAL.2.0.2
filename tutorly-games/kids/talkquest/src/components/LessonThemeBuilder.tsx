'use client';

import React, { useState } from 'react';
import { Copy, Check, Send, Wand2, FileJson } from 'lucide-react';
import { AudioManager } from '@/lib/audio';

interface Props { onCustomThemeAdded: (slug: string) => void; }

const AI_PROMPT = `You are an expert bilingual curriculum designer for "Tutorly Kids" (learners aged 5-12, online 1-to-1 tutoring, screen-shared).

Create ONE complete lesson about the topic: [PUT YOUR TOPIC HERE]

RULES
- Language must be VERY simple. Short sentences. Words a 6-year-old knows.
- Exactly 20 vocabulary words.
- Every word needs translations in: en, zh (Chinese), fr, it, de, tr (Turkish), fa (Farsi).
- Every word needs a CCQ (concept check question) with 2 options, the correct index, a short friendly explanation, and a "sayIt" speaking prompt.
- The story must have 5 pages and 4 comprehension questions.
- Aim for MAXIMUM child talking time.

Return ONLY raw JSON, no markdown fences, in exactly this shape:

{
  "slug": "my-topic",
  "name": "My Topic",
  "icon": "🌟",
  "category": "Custom",
  "color": "#475569",
  "objective": "By the end of this lesson the learner can ...",
  "warmUp": "Hello! Today we learn about ... Clap two times and say: I am ready to talk!",
  "words": [
    {
      "id": "w1",
      "english": "Apple",
      "emoji": "🍎",
      "tr": { "en": "Apple", "zh": "苹果", "fr": "Pomme", "it": "Mela", "de": "Apfel", "tr": "Elma", "fa": "سیب" },
      "sentence": "Look! This is an apple.",
      "ccq": {
        "q": "Can we eat an apple?",
        "options": ["Yes, we eat it.", "No, we wear it."],
        "correct": 0,
        "why": "Yes! An apple is a fruit we eat.",
        "sayIt": "Say: I like red apples."
      },
      "chant": "Apple, apple, crunch crunch crunch!",
      "fact": "Apples grow on trees."
    }
    // ... 20 total
  ],
  "quiz": [
    { "kind": "image", "prompt": "Which word matches this picture?", "emoji": "🍎", "options": ["Apple","Ball","Cat","Dog"], "correct": 0, "speakAfter": "Say: It is an apple." }
    // 8 items, mix kinds: "image" | "word" | "audio" | "translate"
  ],
  "matching": [ { "left": "Apple", "right": "Apple", "emoji": "🍎" } ],
  "story": {
    "title": "Milo and the Apple Surprise",
    "pages": [
      {
        "n": 1,
        "text": "Milo woke up early...",
        "tr": { "en": "...", "zh": "...", "fr": "...", "it": "...", "de": "...", "tr": "...", "fa": "..." },
        "art": "🍎🌅",
        "ask": "How does Milo feel? Why?"
      }
      // 5 pages
    ],
    "comprehension": [
      { "q": "What did Milo find?", "options": ["An apple","A car","A shoe"], "correct": 0, "discuss": "Say: Milo found an apple." }
      // 4 questions
    ]
  },
  "speakingChallenge": ["Name three things from today.", "Make a sentence: I like ... because ...", "Ask your tutor a question.", "Describe your favourite word.", "Teach one word back to your tutor."],
  "tutorNotes": ["Wait 5 seconds after each question.", "Ask Why? after yes/no answers.", "Praise the attempt first.", "Aim for 70% child talking time."]
}`;

export const LessonThemeBuilder: React.FC<Props> = ({ onCustomThemeAdded }) => {
  const [copied, setCopied] = useState(false);
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err: boolean } | null>(null);

  const copy = () => {
    navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    AudioManager.playSound('coin');
    setTimeout(() => setCopied(false), 2500);
  };

  const importJson = async () => {
    if (!json.trim()) { setMsg({ t: 'Paste the JSON from your AI first.', err: true }); return; }
    try {
      setBusy(true); setMsg(null);
      const parsed = JSON.parse(json);
      if (!parsed.slug || !parsed.name || !Array.isArray(parsed.words)) {
        throw new Error('JSON must include "slug", "name" and a "words" array.');
      }
      const res = await fetch('/api/custom-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: parsed.slug, title: parsed.name,
          category: parsed.category || 'Custom',
          description: parsed.objective || '',
          themeData: parsed,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not save the lesson.');
      AudioManager.playSound('fanfare');
      setMsg({ t: `Saved! "${parsed.name}" is now in your Lesson Library.`, err: false });
      setJson('');
      onCustomThemeAdded(parsed.slug);
    } catch (e) {
      AudioManager.playSound('wrong');
      setMsg({ t: (e as Error).message, err: true });
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-stone-800 text-white flex items-center justify-center">
            <Wand2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-800">AI Lesson Builder</h1>
            <p className="text-sm font-semibold text-stone-500">Generate any new topic with an external AI, then paste it here.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-black text-stone-800">Step 1 — Copy the prompt</h2>
            <p className="text-xs font-semibold text-stone-500">Replace [PUT YOUR TOPIC HERE] then paste it into ChatGPT or Claude.</p>
          </div>
          <button onClick={copy} className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-black text-sm cursor-pointer">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Prompt'}
          </button>
        </div>
        <pre className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-[11px] font-mono text-stone-600 max-h-56 overflow-auto whitespace-pre-wrap">{AI_PROMPT}</pre>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-stone-800 mb-1 flex items-center gap-2"><FileJson className="w-5 h-5" />Step 2 — Paste the JSON</h2>
        <p className="text-xs font-semibold text-stone-500 mb-4">It is validated and saved to your database, then appears in the Lesson Library.</p>
        <textarea rows={10} value={json} onChange={e => setJson(e.target.value)}
          placeholder='{ "slug": "dinosaurs", "name": "Dinosaurs", "words": [ ... ] }'
          className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-300 text-sm font-mono text-stone-800 focus:outline-none focus:border-stone-600" />
        {msg && (
          <div className={`mt-3 p-4 rounded-2xl text-sm font-bold border ${msg.err ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            {msg.t}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={importJson} disabled={busy}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black cursor-pointer">
            <Send className="w-4 h-4" /> {busy ? 'Saving…' : 'Add Lesson'}
          </button>
        </div>
      </div>
    </div>
  );
};
