import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useNarration } from '../context/NarrationContext';
import { THEME_CONFIG, getCareerProgress, generateId } from '../utils/helpers';
import { ALL_ROLES } from '../data/roles';
import { playChime, playCardFlip } from '../utils/audio';
import { speakAsLearner } from '../utils/speakLearner';
import { AvatarDisplay } from './AvatarDisplay';
import type { AirdropRecord } from '../types';

const FC: Record<string, { color: string; label: string; tag: string }> = {
  town: { color: '#3b82f6', label: 'Innocents', tag: '🏛️' }, mafia: { color: '#dc2626', label: 'Mafia', tag: '🎭' },
  neutral: { color: '#8b5cf6', label: 'Neutrals', tag: '⚖️' }, village: { color: '#22c55e', label: 'Village', tag: '🏘️' },
  werewolves: { color: '#ea580c', label: 'Werewolves', tag: '🐺' }, lonewolves: { color: '#a855f7', label: 'Lone Wolves', tag: '🌙' },
};

// Use shared utility for natural voice fallback

// Airdrop Lesson Card Creator with AI prompt
function AirdropLessonCard({ state, copyToClipboard, speak }: {
  state: ReturnType<typeof import('../context/GameContext').useGame>['state'];
  copyToClipboard: (t: string) => Promise<void>;
  speak: (t: string) => void;
}) {
  const [lessonText, setLessonText] = useState('');
  const [questions, setQuestions] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [copiedLesson, setCopiedLesson] = useState(false);
  // cardRef available for future canvas export

  const lessonPrompt = `
Generate a mini language lesson card for an airdrop event in Combat Arena.

Subject: ${state.tutorProfile.subject}
Theme: ${state.theme === 'mafia' ? 'Mafia Syndicate' : 'Werewolf Pack'}
Learners CEFR levels: ${[...new Set(state.learners.map(l => l.cefrLevel))].join(', ')}
Current topics: ${state.learners.map(l => l.currentLesson).filter(Boolean).join('; ') || 'General'}

Generate a focused mini-lesson with:
1. A short reading text (3-5 sentences) themed to the game
2. 3-5 vocabulary items with definitions
3. 1 grammar point explained simply
4. 5 comprehension/practice questions

Return ONLY valid JSON:
{
  "lessonCard": {
    "title": "Lesson title",
    "readingText": "A 3-5 sentence themed reading passage",
    "vocabulary": [
      { "word": "word", "definition": "definition", "example": "example sentence" }
    ],
    "grammarPoint": {
      "rule": "Grammar rule name",
      "explanation": "Simple explanation",
      "examples": ["example 1", "example 2"]
    },
    "questions": [
      "Question 1?",
      "Question 2?"
    ]
  }
}
`.trim();

  const handleCopyLessonPrompt = () => {
    copyToClipboard(lessonPrompt);
    setCopiedLesson(true);
    speak('Lesson prompt copied. Paste into AI to generate a lesson card.');
    setTimeout(() => setCopiedLesson(false), 3000);
  };

  const handleImportLesson = () => {
    try {
      const data = JSON.parse(lessonText);
      const lc = data.lessonCard || data;
      let text = '';
      if (lc.title) text += `📚 ${lc.title}\n\n`;
      if (lc.readingText) text += `📖 READING:\n${lc.readingText}\n\n`;
      if (lc.vocabulary) text += `📝 VOCABULARY:\n${lc.vocabulary.map((v: any) => `• ${v.word} — ${v.definition}\n  "${v.example}"`).join('\n')}\n\n`;
      if (lc.grammarPoint) text += `📐 GRAMMAR: ${lc.grammarPoint.rule}\n${lc.grammarPoint.explanation}\n${(lc.grammarPoint.examples || []).map((e: string) => `  ✓ ${e}`).join('\n')}\n\n`;
      if (lc.questions) {
        setQuestions(lc.questions.join('\n'));
        text += `❓ QUESTIONS:\n${lc.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`;
      }
      setLessonText(text);
      setShowPreview(true);
      speak('Lesson card created! Preview is shown below.');
    } catch {
      // Not JSON, treat as plain text
      setShowPreview(true);
    }
  };

  const saveAsImage = () => {
    const content = `${lessonText}\n\n❓ QUESTIONS:\n${questions}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lesson_card_${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="rounded-2xl border-2 p-6 space-y-4" style={{ borderColor: '#a855f730', background: 'rgba(15,5,25,0.9)' }}>
      <div className="flex items-center gap-4">
        <span className="text-5xl">📚</span>
        <div>
          <h3 className="text-2xl font-black text-white">Airdrop Lesson Card</h3>
          <p className="text-base text-gray-400">Create a mini language lesson to send with airdrops</p>
        </div>
      </div>

      {/* Step 1: Copy prompt for AI */}
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={handleCopyLessonPrompt}
        title="Copy a prompt that asks AI to generate a mini lesson with reading, vocab, grammar, and questions"
        className="w-full py-4 rounded-xl font-black text-lg border-2 transition-all"
        style={{ borderColor: copiedLesson ? '#22c55e' : '#a855f7', color: '#000', background: copiedLesson ? '#22c55e' : '#a855f7' }}>
        {copiedLesson ? '✅ LESSON PROMPT COPIED!' : '📋 COPY LESSON PROMPT FOR AI'}
      </motion.button>

      {/* Step 2: Paste JSON or write manually */}
      <div className="space-y-2">
        <p className="text-base text-gray-400">Paste AI lesson JSON or write your own lesson text:</p>
        <textarea value={lessonText} onChange={e => setLessonText(e.target.value)} rows={5}
          placeholder="Paste AI lesson JSON here, or type your own lesson text (reading, vocab, grammar)..."
          className="w-full bg-black/50 border-2 border-gray-700 rounded-xl p-4 text-white text-base resize-none" />
        <textarea value={questions} onChange={e => setQuestions(e.target.value)} rows={3}
          placeholder="Questions for learners (one per line)..."
          className="w-full bg-black/50 border-2 border-gray-700 rounded-xl p-4 text-white text-base resize-none" />
        <div className="flex gap-3">
          <button onClick={handleImportLesson}
            title="Parse the JSON and create a visual lesson card"
            className="flex-1 py-3 rounded-xl font-bold text-lg border-2 border-purple-700/40 bg-purple-900/20 text-purple-300">
            👁️ Preview Card
          </button>
        </div>
      </div>

      {/* Preview */}
      <AnimatePresence>
        {showPreview && (lessonText || questions) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            <div className="rounded-2xl border-2 border-purple-600/50 p-6 space-y-4"
              style={{ background: 'linear-gradient(145deg,rgba(30,10,50,0.95),rgba(15,5,30,0.9))', boxShadow: '0 10px 40px rgba(168,85,247,0.2)' }}>
              <div className="flex items-center gap-3">
                <span className="text-5xl">{state.tutorProfile.emoji}</span>
                <div>
                  <h3 className="text-2xl font-black text-white">Lesson Card</h3>
                  <p className="text-base text-purple-300">{state.tutorProfile.subject}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-purple-700/30">
                <p className="text-white text-lg whitespace-pre-wrap leading-relaxed">{lessonText}</p>
              </div>
              {questions && (
                <div className="p-4 rounded-xl bg-black/30 border border-yellow-700/30">
                  <h4 className="text-lg font-bold text-yellow-300 mb-2">❓ Questions</h4>
                  {questions.split('\n').filter(Boolean).map((q, i) => (
                    <p key={i} className="text-white text-lg py-1">{i + 1}. {q}</p>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 text-center">Complete this lesson to earn your airdrop reward!</p>
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={saveAsImage}
                title="Download this lesson card as a text file to send to learners"
                className="flex-1 py-3 rounded-xl font-bold text-lg border-2 border-green-700/40 bg-green-900/20 text-green-300">
                💾 Save as File
              </button>
              <button onClick={() => setShowPreview(false)}
                title="Close the preview"
                className="px-6 py-3 rounded-xl font-bold text-lg border-2 border-gray-700 text-gray-400">✕ Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Dashboard() {
  const { state, dispatch, copyToClipboard } = useGame();
  const { speak, voices } = useNarration();
  const cfg = THEME_CONFIG[state.theme];
  const isMafia = state.theme === 'mafia';
  const totalXp = state.learners.reduce((s, l) => s + l.careerXp, 0);
  const totalCoins = state.learners.reduce((s, l) => s + l.coins, 0);
  const aliveCount = state.learners.filter(l => l.isAlive).length;
  const [airdropSent, setAirdropSent] = useState(false);

  const sendAirdrop = useCallback((label: string, rarity: 'common'|'rare'|'epic'|'legendary', xp: number, coins: number) => {
    const record: AirdropRecord = {
      id: generateId(), date: new Date().toISOString(), theme: state.theme,
      item: { id: generateId(), name: label, emoji: rarity==='legendary'?'💎':rarity==='epic'?'💜':rarity==='rare'?'💙':'📦', rarity, cost: 0, stock: 1, atk: rarity==='legendary'?20:rarity==='epic'?12:rarity==='rare'?8:4, def: 0, vendettaDebuff: 0, description: 'Airdrop.', theme: state.theme },
      xp, coins,
    };
    dispatch({ type: 'LOG_AIRDROP', payload: record });
    state.learners.filter(l => l.isAlive).forEach(l => {
      dispatch({ type: 'GRANT_XP', payload: { learnerId: l.id, amount: Math.floor(xp / state.learners.length) } });
      dispatch({ type: 'GRANT_COINS', payload: { learnerId: l.id, amount: Math.floor(coins / state.learners.length) } });
    });
    speak(`${label} airdrop delivered!`); playChime();
    setAirdropSent(true); setTimeout(() => setAirdropSent(false), 3000);
  }, [state, dispatch, speak]);

  const factions = isMafia ? ['town','mafia','neutral'] : ['village','werewolves','lonewolves'];
  const grouped = factions.map(f => ({ faction: f, ...FC[f], learners: state.learners.filter(l => { const r = ALL_ROLES.find(ro => ro.id === l.currentRoleId); return r?.faction === f; }) }));

  return (
    <div className="p-4 md:p-8 space-y-8 pb-28 md:pb-8">
      {/* Welcome */}
      <motion.div initial={{ opacity:0,y:-20 }} animate={{ opacity:1,y:0 }}
        className="relative rounded-2xl overflow-hidden" style={{ border: `2px solid ${cfg.neonColor}20` }}>
        <div className="absolute inset-0">
          <img src={isMafia?'./images/mafia-bg.jpg':'./images/wolf-bg.jpg'} alt="" className="w-full h-full object-cover" style={{ filter:'brightness(0.12)' }}/>
          <div className="absolute inset-0" style={{ background:`linear-gradient(135deg,rgba(0,0,0,0.8),${cfg.neonColor}08)` }}/>
        </div>
        <div className="relative p-6 md:p-10 flex flex-col md:flex-row items-center gap-6">
          <motion.span animate={{ rotate:[0,4,-4,0] }} transition={{ duration:6,repeat:Infinity }}
            className="text-[5rem] md:text-[8rem] flex-shrink-0" style={{ filter:`drop-shadow(0 0 40px ${cfg.neonColor}60)` }}>
            {state.tutorProfile.emoji}
          </motion.span>
          <div className="text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-black text-white">Welcome, <span style={{ color:cfg.neonColor }}>{state.tutorProfile.name}</span></h2>
            <p className="text-lg md:text-xl text-gray-400 mt-2">{cfg.name} · {state.tutorProfile.subject} · Week {state.weekNumber}</p>
            <p className="text-base text-gray-500 mt-1"><span className="text-green-400 font-black">{aliveCount}</span> alive · <span className="text-yellow-400 font-black">{state.battleHistory.length}</span> battles</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon:'⚡', label:'Total XP', value:totalXp.toLocaleString(), color:cfg.neonColor, tip:'Combined XP of all learners' },
          { icon:'💰', label:'Coins', value:totalCoins.toLocaleString(), color:'#22cc88', tip:'Total coins across all learners' },
          { icon:'⚔️', label:'Battles', value:state.battleHistory.length, color:'#cc4422', tip:'Battles completed' },
          { icon:'📦', label:'Airdrops', value:state.airdropHistory.length, color:'#6622cc', tip:'Crates sent' },
        ].map((s,i) => (
          <motion.div key={s.label} initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.05 }}
            whileHover={{ scale:1.04,y:-3 }} title={s.tip}
            className="rounded-2xl p-5 text-center" style={{ background:`${s.color}08`, border:`2px solid ${s.color}20` }}>
            <div className="text-4xl mb-2" style={{ filter:`drop-shadow(0 0 12px ${s.color}40)` }}>{s.icon}</div>
            <div className="text-3xl font-black" style={{ color:s.color }}>{s.value}</div>
            <div className="text-sm text-gray-500 uppercase tracking-wider mt-1 font-bold">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* === INTEGRATED WAR ROOM: Role Assign + Airdrop === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Assignment */}
        <div className="rounded-2xl border-2 p-6 space-y-4" style={{ borderColor:`${cfg.neonColor}25`, background:'rgba(10,10,20,0.9)' }}>
          <div className="flex items-center gap-3">
            <span className="text-5xl">🎲</span>
            <div>
              <h3 className="text-2xl font-black text-white">Assign Roles</h3>
              <p className="text-base text-gray-400">Shuffle all 21 {isMafia?'Mafia':'Werewolf'} roles</p>
            </div>
          </div>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
            onClick={() => { playChime(); speak('New identities assigned.'); dispatch({ type:'ASSIGN_ROLES' }); }}
            title="Randomly assign a role to every learner. Resets weekly level."
            className="w-full py-4 rounded-xl font-black text-xl border-2"
            style={{ borderColor:cfg.neonColor, color:'#000', background:cfg.neonColor }}>
            🎲 ASSIGN — WEEK {state.weekNumber + 1}
          </motion.button>
        </div>

        {/* Quick Airdrop */}
        <div className="rounded-2xl border-2 p-6 space-y-4" style={{ borderColor:'#6622cc30', background:'rgba(10,5,25,0.9)' }}>
          <div className="flex items-center gap-3">
            <span className="text-5xl">📦</span>
            <div>
              <h3 className="text-2xl font-black text-white">Quick Airdrop</h3>
              <p className="text-base text-gray-400">Send loot to all alive operatives</p>
            </div>
          </div>
          <AnimatePresence>
            {airdropSent && (
              <motion.div initial={{ opacity:0,scale:0.8 }} animate={{ opacity:1,scale:1 }} exit={{ opacity:0 }}
                className="p-3 rounded-xl bg-green-900/40 border-2 border-green-700/40 text-center">
                <p className="font-bold text-green-300 text-lg">✅ DELIVERED!</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="grid grid-cols-4 gap-2">
            {([
              { l:'Common', r:'common' as const, e:'📦', xp:25, coins:10, c:'#9ca3af' },
              { l:'Rare', r:'rare' as const, e:'💙', xp:50, coins:25, c:'#3b82f6' },
              { l:'Epic', r:'epic' as const, e:'💜', xp:100, coins:50, c:'#a855f7' },
              { l:'Legend', r:'legendary' as const, e:'💎', xp:200, coins:100, c:'#fbbf24' },
            ]).map(a => (
              <motion.button key={a.r} whileHover={{ scale:1.08 }} whileTap={{ scale:0.92 }}
                onClick={() => sendAirdrop(`${a.l} Crate`,a.r,a.xp,a.coins)}
                title={`Send ${a.l}: +${a.xp} XP, +${a.coins} coins per learner`}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all"
                style={{ borderColor:`${a.c}40`, background:`${a.c}10`, color:a.c }}>
                <span className="text-3xl">{a.e}</span>
                <span className="text-xs font-bold uppercase">{a.l}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Airdrop Lesson Card Creator */}
      <AirdropLessonCard state={state} copyToClipboard={copyToClipboard} speak={speak} />

      {/* Quick actions row */}
      <div className="flex flex-wrap gap-3">
        {[
          { label:'Battle Arena', icon:'⚔️', tip:'View battle stories & war chronicles', action:() => { playCardFlip(); dispatch({ type:'SET_NAV',payload:'arena' }); }, color:'#cc4422' },
          { label:'Armory', icon:'🏪', tip:'Shop for items', action:() => dispatch({ type:'SET_NAV',payload:'shop' }), color:'#22cc88' },
          { label:'God Mode', icon:'👑', tip:'AI Prompt Hub, Roles, Voice', action:() => dispatch({ type:'SET_NAV',payload:'tutor' }), color:cfg.neonColor },
        ].map((b,i) => (
          <motion.button key={b.label} whileHover={{ scale:1.06 }} whileTap={{ scale:0.94 }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3+i*0.04 }}
            onClick={b.action} title={b.tip}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-base md:text-lg"
            style={{ border:`2px solid ${b.color}35`, background:`${b.color}10`, color:b.color }}>
            <span className="text-2xl" style={{ filter:`drop-shadow(0 0 6px ${b.color}50)` }}>{b.icon}</span>
            {b.label}
          </motion.button>
        ))}
      </div>

      {/* Faction Groups */}
      {grouped.map(group => group.learners.length > 0 && (
        <div key={group.faction}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl" style={{ filter:`drop-shadow(0 0 8px ${group.color}50)` }}>{group.tag}</span>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wider" style={{ color:group.color }}>{group.label}</h3>
            <div className="flex-1 h-px ml-3" style={{ background:`${group.color}30` }}/>
            <span className="text-base font-bold text-gray-500">{group.learners.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {group.learners.map((learner,i) => {
              const role = ALL_ROLES.find(r => r.id === learner.currentRoleId);
              const progress = getCareerProgress(learner.careerXp);
              return (
                <motion.div key={learner.id} initial={{ opacity:0,y:30 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.06 }}
                  whileHover={{ scale:1.03,y:-3 }}
                  onClick={() => { playCardFlip(); dispatch({ type:'SELECT_LEARNER',payload:learner.id }); dispatch({ type:'SET_NAV',payload:'profiles' }); }}
                  className="cursor-pointer rounded-2xl p-5 relative overflow-hidden"
                  style={{ background:learner.isAlive?`linear-gradient(145deg,rgba(10,10,18,0.9),${group.color}08)`:'rgba(8,8,8,0.85)', border:`2px solid ${learner.isAlive?`${group.color}30`:'#222'}` }}>
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background:group.color }}/>
                  {!learner.isAlive && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-2xl"><span className="text-6xl opacity-50">👻</span></div>}
                   <div className="flex items-center gap-4 mb-4">
                    <AvatarDisplay learner={learner} size="lg" color={group.color}
                      onHover={() => speakAsLearner(learner,voices)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xl md:text-2xl font-black text-white truncate">{learner.name}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {role && <span className="text-base font-bold" style={{ color:group.color }}>{role.name}</span>}
                        <span className="text-sm text-gray-500 font-mono">Lv.{learner.weeklyRoleLevel}</span>
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-sm font-black"
                        style={{ background:`${group.color}20`, border:`1px solid ${group.color}40`, color:group.color, boxShadow:`0 0 10px ${group.color}30` }}>
                        {learner.cefrLevel}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[{ l:'XP',v:learner.careerXp.toLocaleString(),c:'#fbbf24' },{ l:'COINS',v:learner.coins.toLocaleString(),c:'#22cc88' },{ l:'ATK/DEF',v:`${learner.bonusAtk}/${learner.bonusDef}`,c:'#cc4422' }].map(s => (
                      <div key={s.l} className="text-center p-2 rounded-lg" style={{ background:'rgba(0,0,0,0.3)' }}>
                        <p className="text-lg font-black" style={{ color:s.c }}>{s.v}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                    <motion.div initial={{ width:0 }} animate={{ width:`${progress.percent}%` }}
                      transition={{ delay:i*0.06+0.3,duration:1 }}
                      className="h-full rounded-full"
                      style={{ background:`linear-gradient(90deg,${group.color}60,${group.color})`, boxShadow:`0 0 8px ${group.color}40` }}/>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
