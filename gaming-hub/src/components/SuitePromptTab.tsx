import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";

interface Props {
  basePrompt: string;
  jsonText: string;
  setJsonText: (v: string) => void;
  onBuild: () => void;
  onLoadSample: () => void;
  error?: string;
  metrics?: { label: string; value: number | string }[];
}

export function SuitePromptTab({ basePrompt, jsonText, setJsonText, onBuild, onLoadSample, error, metrics }: Props) {
  const { sfx, catSay } = useApp();
  const [learnerName, setLearnerName] = useState("");
  const [cefrLevel, setCefrLevel] = useState("");
  const [learnerFacts, setLearnerFacts] = useState("");
  const [lessonText, setLessonText] = useState("");
  const [finalPrompt, setFinalPrompt] = useState(basePrompt);

  useEffect(() => {
    let p = basePrompt;
    p = p.replace("[PASTE LEARNER NAME]", learnerName || "[PASTE LEARNER NAME]");
    p = p.replace("[PASTE LEVEL]", cefrLevel || "[PASTE LEVEL]");
    p = p.replace("[PASTE LEARNER FACTS]", learnerFacts || "[PASTE LEARNER FACTS]");
    p = p.replace("[PASTE TEXT/WRITING]", lessonText || "[PASTE TEXT/WRITING]");
    setFinalPrompt(p);
  }, [basePrompt, learnerName, cefrLevel, learnerFacts, lessonText]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(finalPrompt);
      catSay("Master AI Prompt copied! Paste into ChatGPT, Claude, or Gemini, then paste the returned JSON below.", "😻");
      sfx.play("coin");
    } catch {
      catSay("Browser blocked clipboard. Select the prompt manually.", "😿");
    }
  };

  return (
    <section className="grid lg:grid-cols-2 gap-5 animate-[fadeIn_0.2s_ease-out]">
      {/* PROMPT side */}
      <div className="premium-panel p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-black">📋 Master AI Prompt</h2>
            <p className="text-xs text-white/60">Fill details, copy → paste into your AI tool → return JSON.</p>
          </div>
          <button onClick={copy} className="px-4 py-2 rounded-xl bg-amber-300 text-black font-black hover:scale-105 transition shadow-xl shrink-0">📋 Copy</button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
             <label className="text-[10px] uppercase tracking-wider text-white/60 font-bold ml-1">Learner Name</label>
             <input value={learnerName} onChange={(e)=>setLearnerName(e.target.value)} placeholder="e.g. Luna Starlight" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none" />
          </div>
          <div>
             <label className="text-[10px] uppercase tracking-wider text-white/60 font-bold ml-1">CEFR Level / Age</label>
             <input value={cefrLevel} onChange={(e)=>setCefrLevel(e.target.value)} placeholder="e.g. B1 - 8 years old" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none" />
          </div>
          <div className="col-span-2">
             <label className="text-[10px] uppercase tracking-wider text-white/60 font-bold ml-1">Learner Facts / Interests</label>
             <input value={learnerFacts} onChange={(e)=>setLearnerFacts(e.target.value)} placeholder="e.g. Loves magic, dragons, and soccer" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none" />
          </div>
          <div className="col-span-2">
             <label className="text-[10px] uppercase tracking-wider text-white/60 font-bold ml-1">Lesson Text / Student Writing</label>
             <textarea value={lessonText} onChange={(e)=>setLessonText(e.target.value)} placeholder="Paste the reading text or student's essay here for the AI to analyze..." className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none h-20 resize-none" />
          </div>
        </div>

        <pre className="flex-1 min-h-[200px] overflow-auto rounded-2xl bg-black/75 border border-white/20 p-4 text-[11px] whitespace-pre-wrap text-emerald-200 leading-relaxed">{finalPrompt}</pre>
      </div>

      {/* JSON BUILDER side */}
      <div className="premium-panel p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-black">🧬 JSON Builder</h2>
            <p className="text-xs text-white/60">Paste the AI-generated JSON below and click Build.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onBuild} className="px-4 py-2 rounded-xl bg-emerald-400 text-black font-black hover:scale-105 transition shadow-lg shadow-emerald-500/20">⚡ Build Array</button>
            <button onClick={onLoadSample} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 font-bold hover:bg-white/20 transition">Sample</button>
          </div>
        </div>

        {error && <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-300/40 text-rose-100 text-sm mb-3">{error}</div>}

        {metrics && metrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {metrics.map(m => (
              <div key={m.label} className="rounded-xl bg-white/10 border border-white/15 p-2 text-center">
                <div className="text-[10px] text-white/55 uppercase tracking-wider">{m.label}</div>
                <div className="text-xl font-black">{m.value}</div>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          spellCheck={false}
          className="flex-1 font-mono text-[11px] leading-relaxed rounded-2xl bg-black/75 border border-white/20 p-4 text-emerald-200 outline-none focus:ring-2 focus:ring-fuchsia-400"
        />
      </div>
    </section>
  );
}
