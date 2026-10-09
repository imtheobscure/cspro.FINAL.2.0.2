import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { motion } from "framer-motion";

export function GamifiedSentenceBuilder({ payload }: { payload: any }) {
  const { sfx, catSay } = useApp();
  
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [words, setWords] = useState<{ id: string, text: string }[]>([]);
  const [assembled, setAssembled] = useState<{ id: string, text: string }[]>([]);
  
  const [timeLeft, setTimeLeft] = useState(60);
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);

  // Mock Friend State
  const [mockFriendMode, setMockFriendMode] = useState(false);
  const [mockScore, setMockScore] = useState(0);
  const [mockProgress, setMockProgress] = useState(0);

  useEffect(() => {
     if (payload && payload.items) {
        const generatedSentences = payload.items.filter((i: any) => i.sentence).map((i: any) => i.sentence.replace('___', i.clozeTarget))
        // Fallback to examples if no sentence
        const fallbacks = payload.items.filter((i: any) => i.example).map((i: any) => i.example);
        setSentences(generatedSentences.length > 0 ? generatedSentences : fallbacks);
     }
  }, [payload]);

  const loadSentence = (idx: number) => {
     if (!sentences[idx]) return;
     const wordsSplit = sentences[idx].split(" ").map((w, i) => ({ id: `w-${i}-${idx}`, text: w }));
     setWords(wordsSplit.sort(() => Math.random() - 0.5));
     setAssembled([]);
  };

  const startGame = (withMockFriend: boolean) => {
     setPlaying(true);
     setTimeLeft(60);
     setScore(0);
     setCurrentIdx(0);
     setMockFriendMode(withMockFriend);
     setMockScore(0);
     setMockProgress(0);
     loadSentence(0);
     sfx.play("coin");
  };
  
  useEffect(() => {
     if(playing && timeLeft > 0) {
        const timer = setTimeout(() => {
           setTimeLeft(t => t - 1);
           if (mockFriendMode) {
              setMockProgress(p => {
                 const newP = p + (Math.random() * 5); // 0 to 5% progress per sec
                 if (newP >= 100) {
                    setMockScore(s => s + 10);
                    return 0; // reset for next sentence
                 }
                 return newP;
              });
           }
        }, 1000);
        return () => clearTimeout(timer);
     } else if (playing && timeLeft <= 0) {
        setPlaying(false);
        if (mockFriendMode) {
           if (score > mockScore) catSay("Time's up! You beat the bot!", "😻");
           else catSay("Time's up! The bot won this time.", "😼");
        } else {
           catSay(`Time's up! You scored ${score} points!`, "😸");
        }
        sfx.play("buzz");
     }
  }, [playing, timeLeft, mockFriendMode, score, mockScore]);

  const handleWordClick = (word: {id:string, text:string}, from: 'words' | 'assembled') => {
      sfx.play("click");
      if (from === 'words') {
         setWords(words.filter(w => w.id !== word.id));
         setAssembled([...assembled, word]);
      } else {
         setAssembled(assembled.filter(w => w.id !== word.id));
         setWords([...words, word]);
      }
  }

  const checkSentence = () => {
      const currentSentence = sentences[currentIdx];
      const assembledText = assembled.map(a => a.text).join(" ");
      if (assembledText === currentSentence) {
         sfx.play("coin");
         setScore(s => s + 10);
         const nextIdx = currentIdx + 1;
         if (nextIdx < sentences.length) {
            setCurrentIdx(nextIdx);
            loadSentence(nextIdx);
         } else {
            setPlaying(false);
            catSay("You completed all sentences!", "😻");
         }
      } else {
         sfx.play("buzz");
      }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 text-white pb-32">
       <div className="bg-indigo-950/40 rounded-3xl p-6 border border-indigo-500/30 shadow-[0_0_40px_rgba(79,70,229,0.15)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
             <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">🧩 Sentence Builder Race</h2>
             <div className="flex gap-4 items-center bg-black/40 px-6 py-3 rounded-full border border-white/10">
                <div className="text-3xl font-black text-rose-400">{timeLeft}s</div>
                <div className="w-px h-8 bg-white/20"></div>
                <div className="text-xl font-bold text-emerald-400">Score: {score}</div>
             </div>
          </div>
          
          {!playing ? (
             <div className="text-center py-16">
                <div className="text-7xl mb-6">⏱️</div>
                <p className="text-indigo-200 mb-8 max-w-md mx-auto text-lg">Race against the clock to assemble 10 scrambled sentences perfectly. Use power-ups or challenge a mock friend!</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                   <button onClick={() => startGame(false)} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-full font-black text-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-105">Solo Time Attack</button>
                   <button onClick={() => startGame(true)} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 transition-colors rounded-full font-bold text-xl border-2 border-slate-600 hover:scale-105">VS Bot Challenge</button>
                </div>
             </div>
          ) : (
             <div className="space-y-8">
                {mockFriendMode && (
                   <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                       <div className="flex justify-between text-sm font-bold text-indigo-300">
                          <span>🤖 Bot Player (Score: {mockScore})</span>
                          <span>Building sentence...</span>
                       </div>
                       <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden">
                          <motion.div className="bg-rose-500 h-full" animate={{ width: `${mockProgress}%` }} transition={{ duration: 0.5 }} />
                       </div>
                   </div>
                )}
             
                <div className="flex justify-between items-center text-sm font-bold text-indigo-300 uppercase tracking-widest pl-2">
                   <span>Sentence {currentIdx + 1} of {sentences.length}</span>
                </div>
                
                {/* Assembled Area */}
                <div className="min-h-[120px] bg-indigo-900/40 rounded-2xl border-4 border-dashed border-indigo-500/50 p-6 flex flex-wrap gap-3 items-center shadow-inner">
                   {assembled.length === 0 && <span className="text-indigo-500/50 italic font-bold text-xl">Tap words below to build...</span>}
                   {assembled.map(w => (
                      <motion.button layoutId={w.id} key={w.id} onClick={() => handleWordClick(w, 'assembled')}
                         className="px-5 py-3 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 cursor-pointer font-black text-xl hover:scale-105 hover:bg-indigo-400">
                         {w.text}
                      </motion.button>
                   ))}
                </div>
                
                {/* Words to choose from */}
                <div className="flex flex-wrap gap-3 justify-center min-h-[120px] p-6 bg-slate-900/50 rounded-2xl border border-white/5">
                   {words.map(w => (
                      <motion.button layoutId={w.id} key={w.id} onClick={() => handleWordClick(w, 'words')}
                         className="px-5 py-3 bg-slate-800 border-2 border-slate-600 text-white rounded-xl shadow-md cursor-pointer font-bold hover:scale-105 hover:bg-slate-700 hover:border-indigo-400 text-xl transition-colors">
                         {w.text}
                      </motion.button>
                   ))}
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-stretch gap-4 bg-black/40 p-4 rounded-2xl">
                   <div className="flex justify-center gap-3">
                       <button onClick={() => { setTimeLeft(t => t + 10); sfx.play("coin"); }} className="w-16 h-16 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-2xl hover:bg-cyan-500/40 flex items-center justify-center font-black text-2xl" title="Freeze Timer (+10s)">❄️</button>
                       <button onClick={() => { 
                          const firstWord = sentences[currentIdx].split(" ")[0];
                          catSay(`The first word is: "${firstWord}"`, "😼"); 
                          sfx.play("bell");
                       }} className="w-16 h-16 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded-2xl hover:bg-yellow-500/40 flex items-center justify-center font-black text-2xl" title="Reveal First Word">👁️</button>
                   </div>
                   <button onClick={checkSentence} className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black shadow-[0_0_20px_rgba(5,150,105,0.4)] text-2xl transition-transform active:scale-95">CHECK ✓</button>
                </div>
             </div>
          )}
       </div>
    </div>
  );
}
