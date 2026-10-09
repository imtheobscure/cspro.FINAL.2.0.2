import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { motion } from "framer-motion";

interface Player {
  id: string;
  name: string;
}

export function MadlibsTool({ payload, players }: { payload: any, players: Player[] }) {
  const { catSay, sfx } = useApp();
  const madlibs = payload?.madlibs || [];
  
  const [selectedTemplate, setSelectedTemplate] = useState<any>(madlibs[0] || null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showStory, setShowStory] = useState(false);

  // If no templates loaded yet
  if (!madlibs.length) {
    return <div className="p-8 text-center text-white/50">No Madlibs themes found in this payload. Generate a JSON with "madlibs" array first!</div>;
  }

  const handleSelectTemplate = (template: any) => {
    sfx.play("click");
    setSelectedTemplate(template);
    setAnswers({});
    setShowStory(false);
  };

  const handleAnswerChange = (id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const isAllFilled = () => {
    if (!selectedTemplate) return false;
    return selectedTemplate.blanks.every((b: any) => answers[b.id]?.trim());
  };

  const generateStory = () => {
    if (!isAllFilled()) {
      catSay("Please fill perfectly all the blanks first!", "😿");
      sfx.play("buzz");
      return;
    }
    sfx.play("coin");
    setShowStory(true);
    catSay("The story has been generated! Read it and think about the reflection questions.", "😻");
  };

  const renderTemplateText = () => {
    let text = selectedTemplate.templateText;
    // Replace {1}, {2} etc with answers styled differently
    selectedTemplate.blanks.forEach((b: any) => {
      const regex = new RegExp(`\\{${b.id}\\}`, 'g');
      const replacement = `<span class="px-2 py-0.5 mx-1 bg-fuchsia-500/20 text-fuchsia-300 font-bold border-b-2 border-fuchsia-400 rounded">${answers[b.id] || "___"}</span>`;
      text = text.replace(regex, replacement);
    });
    return <div dangerouslySetInnerHTML={{ __html: text }} className="leading-loose text-lg" />;
  };

  return (
    <div className="w-full text-white bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-white/10 pb-4">
         <div>
            <h2 className="text-3xl font-black text-fuchsia-400">🎭 Madlibs Generator</h2>
            <p className="text-white/60">Choose a theme and fill in the blanks to create a unique story!</p>
         </div>
         <select 
            className="bg-black/50 border border-white/20 rounded-xl px-4 py-3 font-bold outline-none focus:border-fuchsia-500 w-full md:w-auto text-lg"
            onChange={(e) => handleSelectTemplate(madlibs.find((m:any) => m.id === e.target.value))}
            value={selectedTemplate?.id || ""}
         >
            {madlibs.map((m: any) => (
               <option key={m.id} value={m.id}>{m.theme} - {m.title}</option>
            ))}
         </select>
      </div>

      {selectedTemplate && !showStory && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
             {selectedTemplate.blanks.map((b: any) => {
                const isPerson = b.type.toLowerCase() === "person" || b.label.toLowerCase().includes("name");
                const allSuggestions = isPerson ? [...players.map(p => p.name), ...b.suggestions] : b.suggestions;
                
                return (
                  <div key={b.id} className="bg-black/40 border border-white/10 p-4 rounded-2xl flex flex-col gap-2">
                     <label className="text-sm font-bold text-white/80 uppercase tracking-widest">{b.label} <span className="text-xs text-white/40 normal-case ml-1">({b.type})</span></label>
                     <div className="flex gap-2">
                        <select 
                           className="bg-slate-800 border border-white/20 rounded-lg px-2 py-2 text-sm flex-1 outline-none"
                           onChange={(e) => handleAnswerChange(b.id, e.target.value)}
                           value={allSuggestions.includes(answers[b.id]) ? answers[b.id] : ""}
                        >
                           <option value="" disabled>Choose...</option>
                           {allSuggestions.map((s: string, i: number) => (
                              <option key={i} value={s}>{s}</option>
                           ))}
                        </select>
                        <input 
                           type="text" 
                           placeholder="or type custom..."
                           className="bg-slate-800 border border-white/20 rounded-lg px-3 py-2 text-sm flex-[1.5] outline-none focus:border-fuchsia-500"
                           value={answers[b.id] || ""}
                           onChange={(e) => handleAnswerChange(b.id, e.target.value)}
                        />
                     </div>
                  </div>
                );
             })}
          </div>
          <button 
             onClick={generateStory} 
             className="w-full py-4 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white font-black text-xl hover:scale-[1.01] transition-transform shadow-xl hover:shadow-fuchsia-500/20"
          >
            ✨ Generate Story ✨
          </button>
        </motion.div>
      )}

      {selectedTemplate && showStory && (
         <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
            <div className="bg-black/40 rounded-2xl p-8 border border-white/10">
               <h3 className="text-4xl font-black mb-6 text-center text-amber-200">{selectedTemplate.title}</h3>
               {renderTemplateText()}
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
               <h4 className="text-xl font-black text-blue-300 mb-4 flex items-center gap-2">🤔 Reflection Time</h4>
               <ul className="space-y-3">
                  {selectedTemplate.reflectionQuestions?.map((q: string, i: number) => (
                     <li key={i} className="bg-blue-950/40 p-4 rounded-xl text-blue-100 border border-blue-500/20 text-lg leading-relaxed">
                        {q}
                     </li>
                  ))}
               </ul>
            </div>

            <button 
               onClick={() => setShowStory(false)}
               className="mx-auto block px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition-colors"
            >
               ← Edit words or Play again
            </button>
         </motion.div>
      )}
    </div>
  );
}
