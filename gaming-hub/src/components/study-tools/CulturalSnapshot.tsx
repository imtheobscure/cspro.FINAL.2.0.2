import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";

export function CulturalSnapshot({ payload }: { payload: any }) {
  const { sfx, catSay } = useApp();
  const [postIdx, setPostIdx] = useState(0);
  
  // Use posts from payload, or fallback to mock
  const mappedPosts = payload?.posts?.length ? payload.posts : [{
     id: "mock1",
     author: payload?.topic ? "@" + payload.topic.replace(/\s+/g, '').toLowerCase() + "_daily" : "@culture_daily",
     image: payload?.backgroundImage || payload?.items?.[0]?.image || "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800",
     location: "Global",
     time: "2 hours ago",
     caption: payload?.items?.[0]?.example || "Exploring the rich traditions and beautiful customs from around the world.",
     likes: 1243,
     comments: [
        { user: "@traveler99", text: "Wow, I didn't know about that rule!" },
        { user: "@foodie_mx", text: "The local context gives it so much meaning." }
     ],
     fact: "Did you know traditions vary greatly. " + (payload?.items?.[0]?.back || ""),
     translation: "",
     pronunciation: "",
     culturalNotes: "Context matters.",
     challenge: "Find a local tradition.",
     questions: [
        { question: "What is the main topic of the post?", options: ["Culture", "Food", "Sports"], answer: "Culture" }
     ]
  }];

  const currentPost = mappedPosts[postIdx];
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(currentPost?.likes || 0);

  // Quiz state
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    setLiked(false);
    setSaved(false);
    setLikes(currentPost?.likes || 0);
    setAnswers({});
  }, [currentPost]);

  const handleLike = () => {
     sfx.play("click");
     setLiked(!liked);
     setLikes((prev: number) => liked ? prev - 1 : prev + 1);
  };

  const handleSave = () => {
     sfx.play("click");
     setSaved(!saved);
  };

  const nextPost = () => {
    if (postIdx < mappedPosts.length - 1) {
      sfx.play("open");
      setPostIdx((p: number) => p + 1);
    } else {
      catSay("You've viewed all the posts!", "😸");
    }
  };

  const prevPost = () => {
    if (postIdx > 0) {
      sfx.play("open");
      setPostIdx((p: number) => p - 1);
    }
  };

  const handleAnswer = (qIdx: number, option: string, correctAnswer: string) => {
     if (answers[qIdx]) return;
     setAnswers((prev: any) => ({ ...prev, [qIdx]: option }));
     if (option === correctAnswer) {
        sfx.play("coin");
     } else {
        sfx.play("buzz");
     }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-8 pb-32 text-white">
       
       {/* Instagram-style Post UI */}
       <div className="flex-1 bg-white rounded-[2rem] border border-gray-200 shadow-xl overflow-hidden text-black max-w-sm mx-auto w-full flex flex-col">
           <div className="flex items-center justify-between p-4 border-b border-gray-100">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-0.5">
                     <div className="w-full h-full bg-white rounded-full p-0.5 uppercase flex items-center justify-center font-black text-xs text-fuchsia-500">
                        {currentPost.author.slice(1,3)}
                     </div>
                  </div>
                  <div>
                    <div className="font-bold text-sm leading-tight">{currentPost.author}</div>
                    <div className="text-[10px] text-gray-400">{currentPost.location} • {currentPost.time}</div>
                  </div>
               </div>
               <div className="text-xl">•••</div>
           </div>
           
           <div className="w-full aspect-square bg-gray-100 relative group overflow-hidden">
              <img src={currentPost.image} alt="Cultural post" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
           </div>

           <div className="p-4 flex-1 overflow-auto">
               <div className="flex justify-between items-center mb-4 text-2xl">
                  <div className="flex gap-4">
                     <button onClick={handleLike} className="hover:scale-110 transition-transform">
                        {liked ? <span className="text-red-500">❤️</span> : <span>🤍</span>}
                     </button>
                     <button className="hover:scale-110 transition-transform">💬</button>
                     <button className="hover:scale-110 transition-transform">✈️</button>
                  </div>
                  <button onClick={handleSave} className="hover:scale-110 transition-transform">
                     {saved ? <span>⬛</span> : <span>⬜</span>}
                  </button>
               </div>
               
               <div className="font-bold text-sm mb-2">{likes.toLocaleString()} likes</div>
               
               <div className="text-sm pb-3 mb-3">
                  <span className="font-bold mr-2">{currentPost.author}</span>
                  <span>{currentPost.caption}</span>
               </div>

               <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Comments ({currentPost.comments?.length || 0})</h4>
                  {currentPost.comments?.map((c: any, i: number) => (
                     <div key={i} className="text-sm flex gap-2 items-start">
                        <span className="font-bold leading-tight">{c.user}</span>
                        <span className="leading-tight text-gray-700">{c.text}</span>
                     </div>
                  ))}
               </div>
           </div>
       </div>

       {/* Deep Context & Analysis */}
       <div className="flex-[1.5] flex flex-col gap-5">
           
           <div className="flex justify-between items-center bg-slate-900 rounded-2xl border border-white/10 p-4 shadow-xl">
             <div className="text-white/50 text-sm font-bold uppercase tracking-widest pl-2">Snapshot {postIdx + 1} of {mappedPosts.length}</div>
             <div className="flex gap-2">
                <button onClick={prevPost} disabled={postIdx === 0} className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed font-bold">← Prev</button>
                <button onClick={nextPost} disabled={postIdx === mappedPosts.length - 1} className="px-5 py-2 rounded-xl bg-fuchsia-500 text-white font-bold hover:bg-fuchsia-400 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-fuchsia-500/20">Next →</button>
             </div>
           </div>

           <div className="bg-slate-900 rounded-[2rem] border border-white/10 p-8 shadow-2xl space-y-8 flex-1">
               <div>
                  <h2 className="text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">Context & Translation</h2>
                  <p className="text-white/50 text-sm tracking-wide uppercase font-bold">Deep Dive into the Post</p>
               </div>

               <div className="grid md:grid-cols-2 gap-6">
                  {currentPost.fact && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 shadow-inner">
                      <div className="text-emerald-300 text-xs font-black uppercase tracking-widest mb-2">🧬 Cultural Fact</div>
                      <p className="text-emerald-100 leading-relaxed font-medium">{currentPost.fact}</p>
                    </div>
                  )}

                  {currentPost.culturalNotes && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 shadow-inner">
                      <div className="text-blue-300 text-xs font-black uppercase tracking-widest mb-2">🎭 Implicit Meaning</div>
                      <p className="text-blue-100 leading-relaxed font-medium">{currentPost.culturalNotes}</p>
                    </div>
                  )}

                  {currentPost.translation && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-inner md:col-span-2">
                      <div className="flex justify-between items-start">
                         <div>
                            <div className="text-amber-300 text-xs font-black uppercase tracking-widest mb-2">🗣️ Native Translation</div>
                            <p className="text-amber-100 text-lg font-bold">{currentPost.translation}</p>
                         </div>
                         {currentPost.pronunciation && (
                           <div className="text-amber-300/60 font-mono bg-amber-900/40 px-3 py-1 rounded-lg shrink-0">
                             {currentPost.pronunciation}
                           </div>
                         )}
                      </div>
                    </div>
                  )}
                  
                  {currentPost.challenge && (
                    <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl p-5 shadow-inner md:col-span-2">
                      <div className="text-fuchsia-300 text-xs font-black uppercase tracking-widest mb-2">🎯 Learner Challenge</div>
                      <p className="text-fuchsia-100 leading-relaxed font-medium text-lg border-l-4 border-fuchsia-400 pl-4">{currentPost.challenge}</p>
                    </div>
                  )}
                  
                  {currentPost.questions && currentPost.questions.length > 0 && (
                     <div className="md:col-span-2 mt-4">
                        <h3 className="text-xl font-bold mb-4 text-cyan-300">Quick Knowledge Check</h3>
                        <div className="space-y-4">
                           {currentPost.questions.map((q: any, i: number) => (
                              <div key={i} className="bg-slate-800/80 p-4 rounded-xl border border-white/10">
                                 <p className="font-bold mb-3">{q.question}</p>
                                 <div className="grid sm:grid-cols-2 gap-2">
                                    {q.options.map((opt: string) => {
                                       const isSelected = answers[i] === opt;
                                       const isCorrect = opt === q.answer;
                                       const isAnswered = answers[i] !== undefined;
                                       
                                       let btnClasses = "p-3 rounded-lg border text-sm font-bold transition-all text-left ";
                                       if (!isAnswered) {
                                          btnClasses += "bg-white/5 border-white/20 hover:bg-white/10 cursor-pointer";
                                       } else if (isCorrect) {
                                          btnClasses += "bg-emerald-500/30 border-emerald-500 text-emerald-100";
                                       } else if (isSelected && !isCorrect) {
                                          btnClasses += "bg-rose-500/30 border-rose-500 text-rose-100";
                                       } else {
                                          btnClasses += "bg-white/5 border-white/10 opacity-50 cursor-not-allowed";
                                       }

                                       return (
                                          <button 
                                             key={opt}
                                             disabled={isAnswered}
                                             onClick={() => handleAnswer(i, opt, q.answer)}
                                             className={btnClasses}
                                          >
                                             {opt}
                                          </button>
                                       );
                                    })}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
           </div>
       </div>

    </div>
  );
}
