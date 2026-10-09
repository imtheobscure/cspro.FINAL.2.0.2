import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FlexItem {
  id: string;
  front: string;
  back: string;
  pronunciation?: string;
  example?: string;
  ccq?: string;
  image?: string;
  challenge?: string;
  joke?: string;
  song?: string;
  movie?: string;
  usage?: string;
  definition?: string;
  synonyms?: string[];
  antonyms?: string[];
  culturalFact?: string;
  commonErrors?: string[];
  wouldYou?: string;
  truthOrDare?: { truth: string; dare: string };
  register?: { slang: string; casual: string; informal: string; neutral: string; formal: string };
  registerSlider?: number;
  partOfSpeech?: string;
  difficulty?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  tags?: string[];
  emoji?: string;
  nativeEquivalents?: Record<string, string>;
  collocations?: string[];
  phoneticIPA?: string;
  videoQuery?: string;
}

interface Payload {
  items: FlexItem[];
  targetLang?: string;
  nativeLang?: string;
  title?: string;
}

// ─── Demo Payload ─────────────────────────────────────────────────────────────
const DEMO_PAYLOAD: Payload = {
  title: "Advanced English Vocabulary",
  targetLang: "English",
  nativeLang: "Spanish",
  items: [
    {
      id: "1",
      front: "Serendipity",
      back: "A fortunate discovery made by accident",
      pronunciation: "ser·en·DIP·i·ty",
      phoneticIPA: "/ˌser.ənˈdɪp.ɪ.ti/",
      partOfSpeech: "noun",
      difficulty: "C1",
      emoji: "🍀",
      example: "Finding that rare book at a garage sale was pure serendipity.",
      ccq: "If you plan to find something, is it serendipity? (No) If you stumble upon it by lucky accident? (Yes!)",
      definition: "The occurrence of events by chance in a happy or beneficial way — coined by Horace Walpole from the Persian fairy tale 'Three Princes of Serendip'.",
      synonyms: ["fortuitousness", "providence", "luck", "happy chance", "fluke"],
      antonyms: ["misfortune", "deliberate", "intentional"],
      culturalFact: "The word was invented in 1754 by English writer Horace Walpole. 'Serendip' is an old Persian name for Sri Lanka. It's one of the 10 hardest English words to translate.",
      commonErrors: ["❌ 'It was a serendipity' → ✅ 'It was serendipity' (no article)", "❌ 'serendipituous' → ✅ 'serendipitous' (adjective form)"],
      wouldYou: "Would you rather experience serendipity every day and never be surprised, or experience it only once but it changes your life forever?",
      truthOrDare: { truth: "Tell us about the most serendipitous moment of your life.", dare: "Stand up and mime bumping into your long-lost friend on the street — act out the serendipitous reunion!" },
      usage: "Used in written English, speeches, and storytelling. Rarely used in casual everyday speech. Often found in brand names (Serendipity Ice Cream NYC). Perfect in essays about fate vs. coincidence.",
      song: "♫ You and me could write a bad romance... or was it serendipity? Every playlist that finds you perfectly — that's serendipity. ♫",
      movie: "\"I believe in destiny. Some call it God, I call it serendipity.\" — Serendipity (2001, John Cusack)",
      joke: "I accidentally made the perfect coffee this morning. Serendip-a-tea! ☕",
      challenge: "PHYSICAL DARE: Stand up! Draw 'serendipity' on paper using only pictures — no words! Show the class in 60 seconds!",
      register: { slang: "lucky break / stumbled on it", casual: "a happy accident", informal: "stumbled upon by luck", neutral: "fortuitous discovery", formal: "serendipitous occurrence" },
      registerSlider: 3,
      collocations: ["pure serendipity", "serendipitous discovery", "by serendipity", "a moment of serendipity"],
      nativeEquivalents: { Spanish: "serendipia", French: "sérendipité", German: "Serendipität", Japanese: "セレンディピティ" },
      tags: ["abstract", "literary", "rare"],
      videoQuery: "serendipity movie scene",
      image: "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=800&q=80",
    },
    {
      id: "2",
      front: "Resilience",
      back: "The ability to recover quickly from difficulties",
      pronunciation: "re·ZIL·ience",
      phoneticIPA: "/rɪˈzɪl.i.əns/",
      partOfSpeech: "noun",
      difficulty: "B2",
      emoji: "💪",
      example: "Her resilience after losing her job inspired the whole team.",
      ccq: "If someone cries and gives up — resilience? (No). If they bounce back stronger? (Yes!)",
      definition: "The capacity to withstand or to recover quickly from difficulties; toughness. In materials science, the ability to spring back into shape.",
      synonyms: ["toughness", "hardiness", "adaptability", "fortitude", "grit", "bounce-back"],
      antonyms: ["fragility", "vulnerability", "weakness"],
      culturalFact: "The word comes from Latin 'resilire' (to spring back). In Japan, the concept of 'Nana korobi ya oki' (fall seven times, stand up eight) is the cultural equivalent.",
      commonErrors: ["❌ 'She has a lot of resilience' is OK but ❌ 'She is very resilience' → ✅ 'She is very resilient'", "❌ 'resillience' (spelling) → ✅ 'resilience'"],
      wouldYou: "Would you rather have superhuman physical resilience (never get tired) or emotional resilience (nothing can break your spirit)?",
      truthOrDare: { truth: "Share a time when you showed incredible resilience. What kept you going?", dare: "Do 10 jumping jacks RIGHT NOW while saying 'I am resilient!' after each one!" },
      usage: "High-frequency word in psychology, business, HR, and education. Very common in job interviews: 'Tell me about your resilience'. Also used in climate/environmental contexts.",
      song: "♫ What doesn't kill you makes you stronger, stand a little taller — that's resilience in every corner! ♫",
      movie: "\"It's not about how hard you hit. It's about how hard you can get hit and keep moving forward.\" — Rocky Balboa",
      joke: "I told my gym trainer I have resilience. He said 'Great, now do 50 more push-ups.' 😅",
      challenge: "PHYSICAL DARE: Stand up! Show the class what resilience LOOKS like — mime being knocked down 3 times and bouncing back each time, getting stronger!",
      register: { slang: "thick-skinned / bounce back", casual: "tough as nails", informal: "keeps going no matter what", neutral: "ability to recover", formal: "psychological resilience / adaptive capacity" },
      registerSlider: 2,
      collocations: ["build resilience", "show resilience", "emotional resilience", "resilience in the face of adversity"],
      nativeEquivalents: { Spanish: "resiliencia", French: "résilience", German: "Resilienz", Japanese: "回復力" },
      tags: ["psychology", "business", "positive"],
      videoQuery: "resilience motivation speech",
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    },
    {
      id: "3",
      front: "Ephemeral",
      back: "Lasting for a very short time; transitory",
      pronunciation: "e·FEM·er·al",
      phoneticIPA: "/ɪˈfem.ər.əl/",
      partOfSpeech: "adjective",
      difficulty: "C1",
      emoji: "🌸",
      example: "The ephemeral beauty of cherry blossoms makes them all the more precious.",
      ccq: "Is a rainbow ephemeral? (Yes!) Is a mountain ephemeral? (No, it lasts millions of years)",
      definition: "Lasting for a very short time. From Greek 'ephemeros' — epi (on) + hemera (day) — literally 'lasting only a day'.",
      synonyms: ["fleeting", "transient", "momentary", "short-lived", "transitory", "evanescent"],
      antonyms: ["permanent", "eternal", "everlasting", "enduring"],
      culturalFact: "Japanese concept of 'mono no aware' (物の哀れ) captures this perfectly — the bittersweet beauty of impermanence. Cherry blossoms (sakura) are the ultimate symbol.",
      commonErrors: ["❌ 'ephemerous' → ✅ 'ephemeral'", "❌ 'The ephemerality of it' is rare; use 'its fleeting nature' in speech"],
      wouldYou: "Would you rather experience something extraordinarily beautiful but ephemeral (lasts 1 second), or something ordinary that lasts forever?",
      truthOrDare: { truth: "What's the most ephemeral beautiful thing you've ever witnessed? Describe it.", dare: "Draw a picture of something ephemeral in 30 seconds and show everyone!" },
      usage: "Literary, poetic, and academic usage. Common in philosophy, art criticism, social media (Snapchat/Instagram Stories are literally ephemeral!). Great for essays.",
      song: "♫ Like a flower in the rain, you were ephemeral — beautiful and fleeting, never meant to stay... ♫",
      movie: "\"Everything is temporary. Emotions, thoughts, people and scenery.\" — Inception vibes. \"We accept the love we think we deserve... but every moment is ephemeral.\"",
      joke: "My attention span is so ephemeral that I forgot the punchline of this joke. 🤷",
      challenge: "ARTISTIC DARE: You have 45 seconds! Draw something that represents 'ephemeral' — a sunset? a bubble? Show everyone before time runs out!",
      register: { slang: "here today gone tomorrow", casual: "doesn't last long", informal: "short-lived / fades fast", neutral: "temporary / brief", formal: "ephemeral / transient / evanescent" },
      registerSlider: 4,
      collocations: ["ephemeral beauty", "ephemeral pleasure", "ephemeral content", "ephemeral nature of"],
      nativeEquivalents: { Spanish: "efímero/a", French: "éphémère", German: "flüchtig / ephemer", Japanese: "はかない (hakanai)" },
      tags: ["literary", "adjective", "philosophy"],
      videoQuery: "cherry blossom ephemeral beauty timelapse",
      image: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80",
    },
  ],
};

// ─── Sound Engine ─────────────────────────────────────────────────────────────
const useSFX = () => {
  const ctx = useRef<AudioContext | null>(null);
  const getCtx = () => {
    if (!ctx.current) ctx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctx.current;
  };
  const play = useCallback((type: string) => {
    try {
      const ac = getCtx();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      const t = ac.currentTime;
      if (type === "flip") {
        o.type = "sine"; o.frequency.setValueAtTime(440, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.1);
        g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.start(t); o.stop(t + 0.2);
      } else if (type === "known") {
        o.type = "triangle"; o.frequency.setValueAtTime(523, t); o.frequency.setValueAtTime(659, t + 0.1); o.frequency.setValueAtTime(784, t + 0.2);
        g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        o.start(t); o.stop(t + 0.4);
      } else if (type === "learning") {
        o.type = "sawtooth"; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.15);
        g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.start(t); o.stop(t + 0.2);
      } else if (type === "unlock") {
        const freqs = [523, 659, 784, 1047];
        freqs.forEach((freq, i) => {
          const oo = ac.createOscillator(); const gg = ac.createGain();
          oo.connect(gg); gg.connect(ac.destination);
          oo.type = "triangle"; oo.frequency.value = freq;
          gg.gain.setValueAtTime(0.2, t + i * 0.08); gg.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
          oo.start(t + i * 0.08); oo.stop(t + i * 0.08 + 0.15);
        });
        return;
      } else if (type === "tab") {
        o.type = "sine"; o.frequency.setValueAtTime(600, t);
        g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.start(t); o.stop(t + 0.1);
      }
    } catch (_) {}
  }, []);
  return { play };
};

// ─── TTS (Web Speech API) ────────────────────────────────────────────────────
const speak = (text: string, lang = "en-US", rate = 1) => {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = rate; u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v => v.lang.startsWith(lang.split("-")[0]) && v.name.toLowerCase().includes("female"))
    || voices.find(v => v.lang.startsWith(lang.split("-")[0]));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
};

// ─── Particle Burst ───────────────────────────────────────────────────────────
const ParticleBurst: React.FC<{ trigger: number; type: "known" | "learning" | "none" }> = ({ trigger, type }) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; emoji: string }[]>([]);
  useEffect(() => {
    if (trigger === 0 || type === "none") return;
    const colors = type === "known" ? ["#10b981", "#34d399", "#6ee7b7", "#fbbf24"] : ["#f43f5e", "#fb7185", "#fda4af", "#a78bfa"];
    const emojis = type === "known" ? ["⭐", "✨", "🌟", "🎉"] : ["📚", "💡", "🔄", "💪"];
    const newP = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i, x: Math.random() * 100, y: Math.random() * 100,
      color: colors[i % colors.length], emoji: emojis[i % emojis.length],
    }));
    setParticles(newP);
    setTimeout(() => setParticles([]), 1200);
  }, [trigger, type]);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map(p => (
        <div key={p.id} className="absolute text-xl animate-burst" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          {p.emoji}
        </div>
      ))}
    </div>
  );
};

// ─── XP Bar ───────────────────────────────────────────────────────────────────
const XPBar: React.FC<{ xp: number; level: number }> = ({ xp, level }) => {
  const xpForLevel = level * 100;
  const pct = Math.min((xp % xpForLevel) / xpForLevel * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5">Lv.{level}</div>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-amber-300/70">{xp % xpForLevel}/{xpForLevel} XP</div>
    </div>
  );
};

// ─── Difficulty Badge ─────────────────────────────────────────────────────────
const DiffBadge: React.FC<{ level?: string }> = ({ level }) => {
  const colors: Record<string, string> = { A1: "bg-green-500", A2: "bg-emerald-500", B1: "bg-blue-500", B2: "bg-indigo-500", C1: "bg-purple-500", C2: "bg-rose-500" };
  if (!level) return null;
  return <span className={`${colors[level] || "bg-slate-500"} text-white text-xs font-black px-2 py-0.5 rounded-full`}>{level}</span>;
};

// ─── Register Slider Visual ───────────────────────────────────────────────────
const RegisterSliderVis: React.FC<{ value: number }> = ({ value }) => {
  const labels = ["Slang", "Casual", "Informal", "Neutral", "Formal"];
  const colors = ["bg-rose-500", "bg-orange-400", "bg-yellow-400", "bg-blue-400", "bg-indigo-500"];
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] text-white/40 font-bold uppercase">
        {labels.map(l => <span key={l}>{l}</span>)}
      </div>
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
        {labels.map((_, i) => (
          <div key={i} className={`absolute h-full transition-all ${colors[i]} ${i <= (value - 1) ? "opacity-100" : "opacity-20"}`}
            style={{ left: `${i * 20}%`, width: "20%" }} />
        ))}
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-500 -ml-2"
          style={{ left: `${((value - 0.5) / 5) * 100}%` }} />
      </div>
      <p className="text-center text-xs font-bold text-white/60">Register: <span className="text-white">{labels[value - 1]}</span></p>
    </div>
  );
};

// ─── Card Face Components ─────────────────────────────────────────────────────

const MediaFace: React.FC<{ item: FlexItem; onSpeak: () => void }> = ({ item, onSpeak }) => (
  <div className="space-y-4">
    <div className="relative rounded-2xl overflow-hidden h-48 bg-gradient-to-br from-slate-800 to-slate-900">
      <img src={item.image} alt={item.front} className="w-full h-full object-cover opacity-90" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute bottom-3 left-3 right-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-black text-white drop-shadow-lg">{item.front}</h2>
            <p className="text-sm text-white/80 font-medium">{item.phoneticIPA}</p>
          </div>
          <button onClick={onSpeak} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center hover:bg-white/40 transition-all active:scale-90">
            <span className="text-lg">🔊</span>
          </button>
        </div>
      </div>
      <div className="absolute top-3 right-3 flex gap-1">
        <DiffBadge level={item.difficulty} />
        <span className="bg-black/50 backdrop-blur text-white text-xs font-bold px-2 py-0.5 rounded-full border border-white/20">{item.partOfSpeech}</span>
      </div>
    </div>
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 text-left">
      <p className="text-base text-white/90 font-medium leading-relaxed">{item.back}</p>
      <div className="h-px bg-white/10" />
      <p className="text-sm text-amber-300 italic">📌 {item.example}</p>
    </div>
    <div className="flex flex-wrap gap-2 justify-center">
      {(item.tags || []).map(tag => (
        <span key={tag} className="text-xs bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 px-2 py-0.5 rounded-full">#{tag}</span>
      ))}
    </div>
  </div>
);

const DefinitionFace: React.FC<{ item: FlexItem; onSpeak: () => void }> = ({ item, onSpeak }) => (
  <div className="space-y-4 text-left">
    <div className="text-center space-y-1">
      <div className="flex items-center justify-center gap-3">
        <span className="text-5xl">{item.emoji}</span>
        <div>
          <h2 className="text-4xl font-black text-white">{item.front}</h2>
          <p className="text-blue-400 font-mono text-sm">{item.phoneticIPA}</p>
        </div>
        <button onClick={onSpeak} className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center hover:bg-blue-500/40 transition-all active:scale-90 ml-2">
          <span className="text-lg">🔊</span>
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 mt-2">
        <DiffBadge level={item.difficulty} />
        <span className="text-white/40 text-sm italic">{item.partOfSpeech}</span>
      </div>
    </div>
    <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-500/20 rounded-2xl p-4">
      <p className="text-xs text-blue-400/70 uppercase font-bold tracking-widest mb-2">📖 Natural Definition</p>
      <p className="text-sm text-white/85 leading-relaxed">{item.definition || item.back}</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-3">
        <p className="text-xs text-emerald-400/70 font-bold uppercase mb-2">Synonyms</p>
        <div className="flex flex-wrap gap-1">
          {(item.synonyms || []).slice(0, 4).map(s => <span key={s} className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">{s}</span>)}
        </div>
      </div>
      <div className="bg-rose-900/20 border border-rose-500/20 rounded-xl p-3">
        <p className="text-xs text-rose-400/70 font-bold uppercase mb-2">Antonyms</p>
        <div className="flex flex-wrap gap-1">
          {(item.antonyms || []).slice(0, 3).map(s => <span key={s} className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">{s}</span>)}
        </div>
      </div>
    </div>
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <p className="text-xs text-fuchsia-400/70 font-bold uppercase mb-2">🧠 CCQ Check</p>
      <p className="text-sm text-white/75 italic">{item.ccq}</p>
    </div>
  </div>
);

const BilingualFace: React.FC<{ item: FlexItem; onSpeak: () => void }> = ({ item, onSpeak }) => (
  <div className="space-y-4 text-left">
    <div className="text-center">
      <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-fuchsia-400">{item.front}</h2>
      <div className="flex items-center justify-center gap-2 mt-1">
        <p className="text-fuchsia-300 font-mono text-lg">{item.pronunciation}</p>
        <button onClick={onSpeak} className="text-white/50 hover:text-white/90 transition-colors">🔊</button>
      </div>
      <p className="text-blue-300/70 font-mono text-sm">{item.phoneticIPA}</p>
    </div>
    <div className="grid grid-cols-1 gap-2">
      {Object.entries(item.nativeEquivalents || {}).map(([lang, word]) => (
        <div key={lang} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 hover:border-fuchsia-500/30 transition-colors group">
          <span className="text-2xl">{lang === "Spanish" ? "🇪🇸" : lang === "French" ? "🇫🇷" : lang === "German" ? "🇩🇪" : lang === "Japanese" ? "🇯🇵" : "🌐"}</span>
          <div className="flex-1">
            <p className="text-xs text-white/40 uppercase font-bold">{lang}</p>
            <p className="text-base font-bold text-white">{word}</p>
          </div>
          <button onClick={() => speak(word, lang === "Spanish" ? "es-ES" : lang === "French" ? "fr-FR" : lang === "German" ? "de-DE" : lang === "Japanese" ? "ja-JP" : "en-US")}
            className="text-white/30 hover:text-white/80 transition-colors opacity-0 group-hover:opacity-100">🔊</button>
        </div>
      ))}
    </div>
    <div className="bg-indigo-900/30 border border-indigo-500/20 rounded-xl p-3">
      <p className="text-xs text-indigo-400/70 font-bold uppercase mb-2">🔗 Collocations</p>
      <div className="flex flex-wrap gap-2">
        {(item.collocations || []).map(c => (
          <span key={c} className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 px-2 py-1 rounded-lg">{c}</span>
        ))}
      </div>
    </div>
  </div>
);

const ChallengeFace: React.FC<{ item: FlexItem }> = ({ item }) => {
  const [revealed, setRevealed] = useState(false);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [running]);

  const startChallenge = () => { setRevealed(true); setRunning(true); setTimer(0); };
  const stopChallenge = () => setRunning(false);

  return (
    <div className="space-y-4 text-center">
      <div className="text-6xl animate-bounce">🔥</div>
      <h3 className="text-2xl font-black text-orange-400 tracking-wide">PHYSICAL CHALLENGE</h3>
      <h2 className="text-4xl font-black text-white">{item.front}</h2>
      {!revealed ? (
        <button onClick={startChallenge}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-lg hover:from-orange-400 hover:to-red-400 transition-all active:scale-95 shadow-xl shadow-orange-500/30">
          🎯 REVEAL CHALLENGE!
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-orange-900/30 border-2 border-orange-500/50 rounded-2xl p-5 animate-slide-in">
            <p className="text-xl font-bold text-orange-200 leading-relaxed">{item.challenge || "Stand up! Act out, point to, or draw this word in 60 seconds!"}</p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className={`text-4xl font-black font-mono ${timer > 45 ? "text-red-400 animate-pulse" : "text-orange-300"}`}>
              {String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}
            </div>
            <button onClick={stopChallenge} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-bold hover:bg-white/20 transition-all">
              {running ? "⏹ Stop" : "▶ Resume"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TruthOrDareFace: React.FC<{ item: FlexItem }> = ({ item }) => {
  const [choice, setChoice] = useState<"truth" | "dare" | null>(null);
  const tod = item.truthOrDare || { truth: "Tell us something real about yourself related to this word.", dare: "Act out this word for 30 seconds!" };
  return (
    <div className="space-y-4 text-center">
      <div className="text-5xl">🎲</div>
      <h3 className="text-2xl font-black text-white">Truth or Dare</h3>
      <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{item.front}</h2>
      {!choice ? (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <button onClick={() => setChoice("truth")}
            className="py-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400/50 text-white font-black text-xl hover:scale-105 transition-all active:scale-95 shadow-xl shadow-blue-500/30">
            💬 TRUTH
          </button>
          <button onClick={() => setChoice("dare")}
            className="py-5 rounded-2xl bg-gradient-to-br from-rose-600 to-orange-700 border-2 border-rose-400/50 text-white font-black text-xl hover:scale-105 transition-all active:scale-95 shadow-xl shadow-rose-500/30">
            🔥 DARE
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`rounded-2xl p-5 border-2 text-left ${choice === "truth" ? "bg-blue-900/30 border-blue-500/50" : "bg-rose-900/30 border-rose-500/50"}`}>
            <p className={`text-xs font-black uppercase mb-3 ${choice === "truth" ? "text-blue-400" : "text-rose-400"}`}>
              {choice === "truth" ? "💬 YOUR TRUTH" : "🔥 YOUR DARE"}
            </p>
            <p className="text-lg font-bold text-white leading-relaxed">{tod[choice]}</p>
          </div>
          <button onClick={() => setChoice(null)} className="text-sm text-white/50 hover:text-white/80 underline transition-colors">↩ Choose again</button>
        </div>
      )}
    </div>
  );
};

const WouldYouFace: React.FC<{ item: FlexItem }> = ({ item }) => {
  const [voted, setVoted] = useState<"A" | "B" | null>(null);
  const q = item.wouldYou || "Would you rather know this word perfectly, or know 100 basic words?";
  const [partA, partB] = q.includes(" or ") ? q.split(/ or (.+)/) : [q, "or the opposite?"];
  return (
    <div className="space-y-4 text-center">
      <div className="text-5xl">🤔</div>
      <h3 className="text-xl font-black text-yellow-400">Would You Rather?</h3>
      <h2 className="text-3xl font-black text-white">{item.front}</h2>
      <div className="space-y-3 mt-4">
        {[{ key: "A" as const, text: partA, color: "from-emerald-600 to-teal-700", border: "border-emerald-400/50", emoji: "🅰️" },
          { key: "B" as const, text: partB, color: "from-purple-600 to-fuchsia-700", border: "border-purple-400/50", emoji: "🅱️" }].map(opt => (
          <button key={opt.key} onClick={() => setVoted(opt.key)}
            className={`w-full py-4 px-5 rounded-2xl border-2 text-left font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] ${voted === opt.key ? `bg-gradient-to-r ${opt.color} border-white/50 scale-[1.02] shadow-xl` : `bg-gradient-to-r ${opt.color} ${opt.border} opacity-80`}`}>
            <span className="text-xl mr-2">{opt.emoji}</span>{opt.text?.trim()}
          </button>
        ))}
      </div>
      {voted && (
        <div className="animate-fade-in bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-sm text-white/70">🎯 You chose <span className="text-white font-bold">Option {voted}</span>! Now discuss with your partner — why?</p>
        </div>
      )}
    </div>
  );
};

const UsageFace: React.FC<{ item: FlexItem }> = ({ item }) => (
  <div className="space-y-4 text-left">
    <div className="text-center">
      <h2 className="text-3xl font-black text-cyan-400">{item.front}</h2>
      <p className="text-sm text-white/50 mt-1">Usage Notes & Context</p>
    </div>
    <div className="bg-cyan-900/20 border border-cyan-500/20 rounded-2xl p-4">
      <p className="text-xs text-cyan-400/70 font-bold uppercase tracking-widest mb-3">📋 When & How to Use</p>
      <p className="text-sm text-white/80 leading-relaxed">{item.usage || "Used in various formal and informal contexts."}</p>
    </div>
    {item.collocations && item.collocations.length > 0 && (
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <p className="text-xs text-white/40 uppercase font-bold mb-2">🔗 Common Collocations</p>
        <div className="flex flex-wrap gap-2">
          {item.collocations.map(c => (
            <span key={c} className="text-sm bg-cyan-500/15 border border-cyan-500/25 text-cyan-200 px-3 py-1 rounded-full italic">{c}</span>
          ))}
        </div>
      </div>
    )}
    <div className="bg-amber-900/20 border border-amber-500/20 rounded-2xl p-4">
      <p className="text-xs text-amber-400/70 font-bold uppercase tracking-widest mb-3">📌 Example in Context</p>
      <p className="text-sm text-amber-200 italic leading-relaxed">"{item.example}"</p>
    </div>
  </div>
);

const RegisterFace: React.FC<{ item: FlexItem }> = ({ item }) => {
  const reg = item.register || { slang: "—", casual: "—", informal: "—", neutral: item.front, formal: "—" };
  const levels = [
    { key: "slang", label: "Slang", color: "rose", emoji: "😎", bg: "from-rose-900/30 to-pink-900/20", border: "border-rose-500/30" },
    { key: "casual", label: "Casual", color: "orange", emoji: "😊", bg: "from-orange-900/30 to-amber-900/20", border: "border-orange-500/30" },
    { key: "informal", label: "Informal", color: "yellow", emoji: "🙂", bg: "from-yellow-900/30 to-amber-900/20", border: "border-yellow-500/30" },
    { key: "neutral", label: "Neutral", color: "blue", emoji: "😐", bg: "from-blue-900/30 to-indigo-900/20", border: "border-blue-500/30" },
    { key: "formal", label: "Formal", color: "indigo", emoji: "🎩", bg: "from-indigo-900/30 to-purple-900/20", border: "border-indigo-500/30" },
  ];
  return (
    <div className="space-y-3">
      <div className="text-center">
        <h2 className="text-2xl font-black text-emerald-400">{item.front}</h2>
        <p className="text-xs text-white/40 mt-1">Language Register Spectrum</p>
      </div>
      <RegisterSliderVis value={item.registerSlider || 3} />
      <div className="space-y-2 mt-3">
        {levels.map(l => (
          <div key={l.key} className={`flex items-center gap-3 bg-gradient-to-r ${l.bg} border ${l.border} rounded-xl p-3 hover:scale-[1.01] transition-transform`}>
            <span className="text-xl">{l.emoji}</span>
            <div className="w-16 shrink-0">
              <p className="text-xs font-black uppercase text-white/50">{l.label}</p>
            </div>
            <p className="text-sm font-medium text-white flex-1">{reg[l.key as keyof typeof reg]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const CulturalFace: React.FC<{ item: FlexItem }> = ({ item }) => (
  <div className="space-y-4 text-left">
    <div className="text-center">
      <span className="text-5xl">{item.emoji || "🌍"}</span>
      <h2 className="text-3xl font-black text-amber-400 mt-2">{item.front}</h2>
      <p className="text-xs text-white/40">Cultural Context & World Knowledge</p>
    </div>
    <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/20 border border-amber-500/20 rounded-2xl p-5">
      <p className="text-xs text-amber-400/70 font-bold uppercase tracking-widest mb-3">🌍 Cultural Insight</p>
      <p className="text-sm text-white/85 leading-relaxed">{item.culturalFact || "This word carries rich cultural meaning across different contexts and societies."}</p>
    </div>
    {item.commonErrors && item.commonErrors.length > 0 && (
      <div className="bg-red-900/20 border border-red-500/20 rounded-2xl p-4">
        <p className="text-xs text-red-400/70 font-bold uppercase tracking-widest mb-3">⚠️ Common Errors</p>
        <div className="space-y-2">
          {item.commonErrors.map((e, i) => (
            <div key={i} className="text-sm text-white/75 bg-black/20 rounded-lg p-2">{e}</div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const MovieFace: React.FC<{ item: FlexItem }> = ({ item }) => {
  const youglishUrl = `https://youglish.com/pronounce/${encodeURIComponent(item.front)}/english`;
  return (
    <div className="space-y-4 text-left">
      <div className="text-center">
        <span className="text-5xl">🎬</span>
        <h2 className="text-3xl font-black text-yellow-400 mt-2">{item.front}</h2>
        <p className="text-xs text-white/40">In Movies, TV Shows & Media</p>
      </div>
      <div className="bg-black/50 border border-yellow-500/20 rounded-2xl p-4">
        <p className="text-xs text-yellow-400/70 font-bold uppercase mb-3">🎥 Famous Quote</p>
        <p className="text-sm text-white/90 leading-relaxed italic font-mono whitespace-pre-line">{item.movie || `"...${item.front}..." — A great film`}</p>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-white/40 uppercase font-bold">🔍 Find It In Real Speech</p>
        <a href={youglishUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-gradient-to-r from-red-900/30 to-pink-900/20 border border-red-500/30 rounded-xl p-3 hover:border-red-400/60 transition-all group">
          <span className="text-2xl">▶️</span>
          <div>
            <p className="text-sm font-bold text-white group-hover:text-red-300 transition-colors">YouGlish — Hear in Real Videos</p>
            <p className="text-xs text-white/40">Native speakers using "{item.front}" in context</p>
          </div>
          <span className="ml-auto text-white/20 group-hover:text-white/60 transition-colors">↗</span>
        </a>
        <a href={`https://playphrase.me/#/search?q=${encodeURIComponent(item.front)}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-gradient-to-r from-yellow-900/30 to-orange-900/20 border border-yellow-500/30 rounded-xl p-3 hover:border-yellow-400/60 transition-all group">
          <span className="text-2xl">🎞️</span>
          <div>
            <p className="text-sm font-bold text-white group-hover:text-yellow-300 transition-colors">PlayPhrase — Movie Clips</p>
            <p className="text-xs text-white/40">"{item.front}" in actual movie scenes</p>
          </div>
          <span className="ml-auto text-white/20 group-hover:text-white/60 transition-colors">↗</span>
        </a>
      </div>
    </div>
  );
};

const SongFace: React.FC<{ item: FlexItem }> = ({ item }) => (
  <div className="space-y-4 text-left">
    <div className="text-center">
      <span className="text-5xl">🎵</span>
      <h2 className="text-3xl font-black text-pink-400 mt-2">{item.front}</h2>
      <p className="text-xs text-white/40">Memory through Music</p>
    </div>
    <div className="relative bg-gradient-to-br from-pink-900/30 to-purple-900/20 border border-pink-500/20 rounded-2xl p-5">
      <div className="absolute top-3 left-3 text-3xl text-pink-500/30">♫</div>
      <div className="absolute bottom-3 right-3 text-3xl text-pink-500/30">♫</div>
      <p className="text-base text-white/90 italic leading-relaxed pl-6 pr-6 text-center">
        {item.song || `♫ Remember ${item.front} — say it loud and proud today! ♫`}
      </p>
    </div>
    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.front + " lyrics song")}`} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 bg-gradient-to-r from-pink-900/30 to-red-900/20 border border-pink-500/30 rounded-xl p-3 hover:border-pink-400/60 transition-all group">
      <span className="text-2xl">🎤</span>
      <div>
        <p className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">Find Songs on YouTube</p>
        <p className="text-xs text-white/40">Songs using "{item.front}"</p>
      </div>
      <span className="ml-auto text-white/20 group-hover:text-white/60 transition-colors">↗</span>
    </a>
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <p className="text-xs text-white/40 uppercase font-bold mb-2">🎵 Sing it! Replace a word in a famous song with:</p>
      <p className="text-lg font-black text-pink-300 text-center">"{item.front}"</p>
    </div>
  </div>
);

const JokeFace: React.FC<{ item: FlexItem; onSpeak: () => void }> = ({ item, onSpeak }) => {
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-4 text-center">
      <div className="text-6xl">{shown ? "😂" : "🤫"}</div>
      <h3 className="text-lg font-black text-purple-300 uppercase tracking-widest">The Joke Zone</h3>
      <h2 className="text-3xl font-black text-white">{item.front}</h2>
      {!shown ? (
        <button onClick={() => setShown(true)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 border-2 border-purple-400/50 text-white font-black text-lg hover:from-purple-500 hover:to-fuchsia-500 transition-all active:scale-95 shadow-xl shadow-purple-500/30">
          😂 Reveal the Joke!
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-purple-900/40 border border-purple-500/30 rounded-2xl p-5 animate-slide-in">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              {item.joke || `Why did the linguist love "${item.front}"? Because it had the right word at the right time — and so did they! 😂`}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={() => { speak(item.joke || item.front); onSpeak(); }} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-all">
              🔊 Hear it
            </button>
            <button onClick={() => setShown(false)} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-all">
              🔁 Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Tab Definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: "media",     label: "📸 Visual",    emoji: "📸", short: "Visual"    },
  { id: "definition",label: "📖 Define",    emoji: "📖", short: "Define"    },
  { id: "bilingual", label: "🌐 Lingua",    emoji: "🌐", short: "Lingua"    },
  { id: "challenge", label: "🔥 Do It",     emoji: "🔥", short: "Do It"     },
  { id: "truthdare", label: "🎲 T or D",    emoji: "🎲", short: "T or D"    },
  { id: "wyr",       label: "🤔 W-Y-R",     emoji: "🤔", short: "W-Y-R"     },
  { id: "usage",     label: "📋 Usage",     emoji: "📋", short: "Usage"     },
  { id: "register",  label: "🎭 Register",  emoji: "🎭", short: "Register"  },
  { id: "cultural",  label: "🌍 Culture",   emoji: "🌍", short: "Culture"   },
  { id: "movie",     label: "🎬 Screen",    emoji: "🎬", short: "Screen"    },
  { id: "song",      label: "🎵 Song",      emoji: "🎵", short: "Song"      },
  { id: "joke",      label: "😂 Joke",      emoji: "😂", short: "Joke"      },
] as const;

type TabId = typeof TABS[number]["id"];



// ─── Progress Ring ────────────────────────────────────────────────────────────
const ProgressRing: React.FC<{ pct: number; size?: number; stroke?: number; color?: string }> = ({ pct, size = 44, stroke = 4, color = "#10b981" }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
};

// ─── Streak Flame ─────────────────────────────────────────────────────────────
const StreakFlame: React.FC<{ streak: number }> = ({ streak }) => (
  <div className="flex items-center gap-1">
    <span className={`text-xl ${streak >= 3 ? "animate-pulse" : ""}`}>🔥</span>
    <span className="text-sm font-black text-orange-400">{streak}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export function FlexcardsTool({ payload }: { payload?: Payload }) {
  const data = payload || DEMO_PAYLOAD;
  const items = data.items;

  const [flexIndex, setFlexIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("media");
  const [knownIds, setKnownIds] = useState<string[]>([]);
  const [learningIds, setLearningIds] = useState<string[]>([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [burstTrigger, setBurstTrigger] = useState(0);
  const [burstType, setBurstType] = useState<"known" | "learning" | "none">("none");
  const [cardAnim, setCardAnim] = useState<"idle" | "swipe-left" | "swipe-right">("idle");
  const [showComplete, setShowComplete] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [tabGroupIdx, setTabGroupIdx] = useState(0);
  const [levelUpToast, setLevelUpToast] = useState(false);
  const [showWordMap, setShowWordMap] = useState(false);
  const sfx = useSFX();
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);

  const item = items[flexIndex];
  const totalCards = items.length;
  const knownCount = knownIds.length;
  const learningCount = learningIds.length;
  const progress = ((knownCount + learningCount) / totalCards) * 100;

  // Session timer
  useEffect(() => {
    const t = setInterval(() => setSessionTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Level up when XP threshold crossed
  useEffect(() => {
    const needed = level * 100;
    if (xp >= needed) {
      setLevel(l => l + 1);
      sfx.play("unlock");
      setLevelUpToast(true);
      setTimeout(() => setLevelUpToast(false), 2500);
    }
  }, [xp]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const navigate = useCallback((dir: "known" | "learning") => {
    if (!item) return;
    const isKnown = dir === "known";
    setCardAnim(isKnown ? "swipe-right" : "swipe-left");
    sfx.play(isKnown ? "known" : "learning");
    setBurstType(isKnown ? "known" : "learning");
    setBurstTrigger(t => t + 1);

    if (isKnown) {
      setKnownIds(p => [...p, item.id]);
      setStreak(s => s + 1);
      setXp(p => p + 30 + streak * 5);
    } else {
      setLearningIds(p => [...p, item.id]);
      setStreak(0);
      setXp(p => p + 10);
    }

    setTimeout(() => {
      setCardAnim("idle");
      const nextIdx = flexIndex + 1;
      if (nextIdx >= totalCards) {
        setShowComplete(true);
      } else {
        setFlexIndex(nextIdx);
        setActiveTab("media");
      }
    }, 380);
  }, [item, flexIndex, totalCards, streak, sfx]);

  const handleTabChange = useCallback((id: TabId) => {
    setActiveTab(id);
    sfx.play("tab");
  }, [sfx]);

  const handleSpeak = () => { if (item) speak(item.front, "en-US", 0.85); };

  // Keyboard navigation (after navigate & handleTabChange are defined)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") navigate("known");
      if (e.key === "ArrowLeft") navigate("learning");
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        setTabGroupIdx(gi => e.key === "ArrowDown" ? Math.min(gi + 1, 2) : Math.max(gi - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  // Touch / swipe support
  const onTouchStart = (e: React.TouchEvent) => { dragStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    const delta = e.changedTouches[0].clientX - dragStart.current;
    if (Math.abs(delta) > 60) navigate(delta > 0 ? "known" : "learning");
    dragStart.current = null;
  };

  const resetSession = () => {
    setFlexIndex(0); setKnownIds([]); setLearningIds([]);
    setStreak(0); setShowComplete(false); setActiveTab("media");
    setSessionTime(0);
  };

  if (!item && !showComplete) return null;

  // ── Completion Screen ──────────────────────────────────────────────────────
  if (showComplete) {
    const pct = Math.round((knownCount / totalCards) * 100);
    return (
      <div className="max-w-lg mx-auto w-full flex flex-col items-center justify-center min-h-[80vh] p-6 text-center space-y-6">
        <div className="relative">
          <div className="text-8xl animate-bounce">🏆</div>
          <div className="absolute -top-2 -right-2 text-4xl animate-spin-slow">⭐</div>
        </div>
        <div>
          <h1 className="text-4xl font-black text-white">Session Complete!</h1>
          <p className="text-white/60 mt-1">You crushed {totalCards} cards in {formatTime(sessionTime)}</p>
        </div>
        <div className="w-full grid grid-cols-3 gap-3">
          {[{ label: "Known", val: knownCount, color: "emerald", emoji: "✅" },
            { label: "Learning", val: learningCount, color: "rose", emoji: "🔄" },
            { label: "Accuracy", val: `${pct}%`, color: "amber", emoji: "🎯" }].map(s => (
            <div key={s.label} className={`bg-${s.color}-500/10 border border-${s.color}-500/30 rounded-2xl p-4`}>
              <div className="text-3xl">{s.emoji}</div>
              <div className={`text-2xl font-black text-${s.color}-400`}>{s.val}</div>
              <div className="text-xs text-white/50">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
          <XPBar xp={xp} level={level} />
          <div className="flex justify-between text-xs text-white/40">
            <span>🔥 Best Streak: {streak}</span>
            <span>⏱ {formatTime(sessionTime)}</span>
            <span>⚡ XP: +{xp}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full">
          <button onClick={resetSession}
            className="py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-95 shadow-xl">
            🔁 Play Again
          </button>
          <button onClick={() => { setFlexIndex(0); setShowComplete(false); setLearningIds([]); setKnownIds([]); }}
            className="py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-all active:scale-95">
            📖 Review All
          </button>
        </div>
      </div>
    );
  }

  // ── Tab groups for compact display ─────────────────────────────────────────
  const TAB_GROUPS = [
    TABS.slice(0, 4),
    TABS.slice(4, 8),
    TABS.slice(8, 12),
  ];

  const renderFace = () => {
    switch (activeTab) {
      case "media":      return <MediaFace item={item} onSpeak={handleSpeak} />;
      case "definition": return <DefinitionFace item={item} onSpeak={handleSpeak} />;
      case "bilingual":  return <BilingualFace item={item} onSpeak={handleSpeak} />;
      case "challenge":  return <ChallengeFace item={item} />;
      case "truthdare":  return <TruthOrDareFace item={item} />;
      case "wyr":        return <WouldYouFace item={item} />;
      case "usage":      return <UsageFace item={item} />;
      case "register":   return <RegisterFace item={item} />;
      case "cultural":   return <CulturalFace item={item} />;
      case "movie":      return <MovieFace item={item} />;
      case "song":       return <SongFace item={item} />;
      case "joke":       return <JokeFace item={item} onSpeak={handleSpeak} />;
      default:           return <MediaFace item={item} onSpeak={handleSpeak} />;
    }
  };

  const swipeClass = cardAnim === "swipe-right" ? "translate-x-[120%] rotate-12 opacity-0" : cardAnim === "swipe-left" ? "-translate-x-[120%] -rotate-12 opacity-0" : "translate-x-0 rotate-0 opacity-100";

  return (
    <div className="max-w-2xl mx-auto w-full select-none font-sans px-2 relative">

      {/* Level-Up Toast */}
      {levelUpToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-slide-in">
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black px-6 py-3 rounded-2xl shadow-2xl shadow-amber-500/40 border border-amber-300/30">
            <span className="text-2xl animate-spin-slow">⭐</span>
            <span>LEVEL UP! You're Level {level}!</span>
            <span className="text-2xl">🎉</span>
          </div>
        </div>
      )}

      {/* Word Map Modal */}
      {showWordMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowWordMap(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-white mb-4">📋 All Cards</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
              {items.map((it, i) => (
                <button key={it.id} onClick={() => { setFlexIndex(i); setShowWordMap(false); setActiveTab("media"); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-white/10 ${i === flexIndex ? "bg-indigo-500/20 border border-indigo-500/40" : "bg-white/5 border border-white/5"}`}>
                  <span className="text-xl">{it.emoji || "📖"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{it.front}</p>
                    <p className="text-xs text-white/50 truncate">{it.back}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <DiffBadge level={it.difficulty} />
                    {knownIds.includes(it.id) && <span className="text-emerald-400 text-xs">✅</span>}
                    {learningIds.includes(it.id) && <span className="text-rose-400 text-xs">🔄</span>}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowWordMap(false)} className="mt-4 w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-all">Close</button>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <StreakFlame streak={streak} />
          <div className="text-xs text-white/40 font-mono">{formatTime(sessionTime)}</div>
        </div>
        <div className="flex items-center gap-2">
          <ProgressRing pct={progress} />
          <div className="text-xs text-white/60">
            <span className="text-white font-bold">{flexIndex + 1}</span>/{totalCards}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-amber-400 font-black flex items-center gap-1">
            ⚡ <span>{xp} XP</span>
          </div>
          <button onClick={() => setShowWordMap(true)}
            className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-xs hover:bg-white/20 transition-all active:scale-90"
            title="All cards">📋</button>
        </div>
      </div>

      {/* XP Bar */}
      <div className="mb-4">
        <XPBar xp={xp} level={level} />
      </div>

      {/* Word Title Strip */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{item.emoji}</span>
          <div>
            <h1 className="text-xl font-black text-white leading-none">{item.front}</h1>
            <p className="text-xs text-blue-400/80 font-mono">{item.phoneticIPA}</p>
          </div>
          <DiffBadge level={item.difficulty} />
        </div>
        <button onClick={handleSpeak}
          className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center hover:bg-blue-500/40 transition-all active:scale-90 text-base">
          🔊
        </button>
      </div>

      {/* Tab Navigation — Compact Dot Groups */}
      <div className="mb-3">
        {/* Main row — current group */}
        <div className="flex items-center gap-1 bg-black/30 border border-white/10 rounded-2xl p-1.5">
          {TAB_GROUPS[tabGroupIdx].map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id as TabId)}
              className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap ${activeTab === tab.id ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.03]" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}>
              <span className="text-sm block">{tab.emoji}</span>
              <span className="hidden xs:block">{tab.short}</span>
            </button>
          ))}
          {/* Group nav dots */}
          <div className="flex flex-col gap-1 pl-1 border-l border-white/10 ml-1">
            {TAB_GROUPS.map((_, gi) => (
              <button key={gi} onClick={() => { setTabGroupIdx(gi); sfx.play("tab"); }}
                className={`w-2 h-2 rounded-full transition-all ${tabGroupIdx === gi ? "bg-indigo-400 scale-125" : "bg-white/20 hover:bg-white/40"}`} />
            ))}
          </div>
        </div>
        {/* Group Labels */}
        <div className="flex justify-center gap-4 mt-1.5">
          {["📸 Core", "🎮 Games", "🌍 Deep"].map((groupLabel, i) => (
            <button key={i} onClick={() => { setTabGroupIdx(i); sfx.play("tab"); }}
              className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${tabGroupIdx === i ? "text-indigo-400" : "text-white/25 hover:text-white/50"}`}>
              {groupLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <div ref={cardRef}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        className={`relative transition-all duration-350 ease-in-out ${swipeClass}`}
        style={{ transition: "transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s" }}>
        <ParticleBurst trigger={burstTrigger} type={burstType} />

        {/* Glow border based on difficulty */}
        <div className={`absolute -inset-0.5 rounded-3xl blur-sm opacity-30 ${item.difficulty && ["C1", "C2"].includes(item.difficulty) ? "bg-gradient-to-br from-purple-500 to-rose-500" : item.difficulty && ["B1", "B2"].includes(item.difficulty) ? "bg-gradient-to-br from-blue-500 to-indigo-500" : "bg-gradient-to-br from-emerald-500 to-cyan-500"}`} />

        <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {/* Scanline overlay for game feel */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)" }} />

          {/* Card content */}
          <div className="p-5 min-h-[440px] flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {renderFace()}
            </div>

            {/* Swipe hint */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-white/20 font-medium">
              <span>← Swipe or tap buttons</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-4 relative z-10">
        <button onClick={() => navigate("learning")}
          className="group relative flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-rose-600/30 to-pink-600/20 border border-rose-500/40 text-rose-200 font-black text-sm hover:from-rose-600/50 hover:to-pink-600/40 hover:border-rose-400/70 transition-all active:scale-95 overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
          <div className="text-left">
            <div className="text-xs text-rose-400/70 font-medium">Still Learning</div>
            <div className="text-sm font-black text-rose-200">{learningCount} cards</div>
          </div>
          <span className="text-lg">🔄</span>
        </button>

        <button onClick={() => navigate("known")}
          className="group relative flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-600/30 to-teal-600/20 border border-emerald-500/40 text-emerald-200 font-black text-sm hover:from-emerald-600/50 hover:to-teal-600/40 hover:border-emerald-400/70 transition-all active:scale-95 overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-lg">⭐</span>
          <div className="text-right">
            <div className="text-xs text-emerald-400/70 font-medium">Got It!</div>
            <div className="text-sm font-black text-emerald-200">{knownCount} cards</div>
          </div>
          <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
        </button>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-emerald-400 font-black text-lg">{knownCount}</div>
          <div className="text-[10px] text-white/40 font-medium">✅ Known</div>
        </div>
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="text-white font-black text-lg">{totalCards - knownCount - learningCount}</div>
          <div className="text-[10px] text-white/40 font-medium">📋 Remaining</div>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <div className="text-rose-400 font-black text-lg">{learningCount}</div>
          <div className="text-[10px] text-white/40 font-medium">🔄 Learning</div>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="flex justify-center gap-4 mt-3 text-[10px] text-white/20">
        <span>← Known</span>
        <span>·</span>
        <span>Swipe to navigate</span>
        <span>·</span>
        <span>Learning →</span>
      </div>
    </div>
  );
}
