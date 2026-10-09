/* ════════════════════════════════════════════════════════════════════════════
   ⚔️ COMBAT ARENA — Epic 3D Battle System
   Weekly Light vs Dark battles with permadeath mechanics
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { triggerAutoSync, readCombatHistoryFromStorage, persistCombatHistory } from '../../utils/diskStorage';
import { motion } from 'framer-motion';
import { 
  Swords, Skull, Sparkles,
  Copy, RefreshCw
} from 'lucide-react';
import { Learner, getAvatarEvolution, getPetEvolution, getRarityTier, TeacherProfile } from './types';

interface BattleResult {
  winner: 'heroes' | 'villains' | 'draw';
  battles: Array<{
    hero: Learner;
    villain: Learner;
    winner: 'hero' | 'villain';
    heroDied: boolean;
    villainDied: boolean;
    petDied: { hero?: boolean; villain?: boolean };
    epicMoment: string;
  }>;
  story: string;
}

interface ArenaProps {
  learners: Learner[];
  setLearners: React.Dispatch<React.SetStateAction<Learner[]>>;
  teacher: TeacherProfile;
}

interface BattleStorybookEntry {
  id: string;
  week: number;
  year: number;
  title: string;
  createdAt: string;
  summary: string;
  result: BattleResult;
}

const BATTLE_THEMES = [
  { name: 'Crystal Citadel', emoji: '🏰', bg: 'from-pink-500 via-purple-600 to-indigo-700' },
  { name: 'Shadow Realm', emoji: '🌑', bg: 'from-slate-800 via-purple-900 to-black' },
  { name: 'Volcano Peak', emoji: '🌋', bg: 'from-orange-500 via-red-600 to-red-900' },
  { name: 'Sky Sanctuary', emoji: '☁️', bg: 'from-sky-400 via-blue-500 to-indigo-600' },
];

const generateEpicStoryPrompt = (result: BattleResult, teacher: TeacherProfile) => {
  const heroes = result.battles.filter(b => b.winner === 'hero').length;
  const villains = result.battles.filter(b => b.winner === 'villain').length;
  const deaths = result.battles.filter(b => b.heroDied || b.villainDied).length;
  
  return `Write an EPIC fantasy battle story for ${teacher.characterName}'s English class!

BATTLE OVERVIEW:
- Light Heroes: ${heroes} victories
- Dark Villains: ${villains} victories  
- Total Fallen: ${deaths} warriors

${result.battles.map((b, i) => `
DUEL ${i + 1}: ${b.hero.name} (${b.hero.avatarArchetype}) vs ${b.villain.name} (${b.villain.name})
- Winner: ${b.winner === 'hero' ? b.hero.name : b.villain.name}
- Epic Moment: ${b.epicMoment}
${b.heroDied ? `💀 ${b.hero.name} fell in battle! Their rank regressed...` : ''}
${b.villainDied ? `💀 ${b.villain.name} was defeated! Their power diminished...` : ''}
${b.petDied.hero ? `🐾 ${b.hero.name}'s ${b.hero.petType} was slain!` : ''}
${b.petDied.villain ? `🐾 ${b.villain.name}'s ${b.villain.petType} fell!` : ''}
`).join('\n')}

Write in an exciting, dramatic style suitable for ${teacher.teachingStyle}. Include dialogue, dramatic tension, and describe the visual spectacle!`;
};

const calculateBattlePower = (learner: Learner): number => {
  const avatar = getAvatarEvolution(learner.gender, learner.avatarArchetype, learner.xp);
  const pet = getPetEvolution(learner.petType, learner.petXp ?? 0);
  
  return (
    (learner.attack * 2) +
    (learner.defense * 1.5) +
    (learner.xp * 0.1) +
    ((learner.petXp ?? 0) * 0.05) +
    (learner.totalSessions * 5) +
    (learner.streak * 10) +
    (avatar.rank * 100) +
    (pet.rank * 50) +
    (Math.random() * 50) // luck factor
  );
};

const generateEpicMoment = (hero: Learner, villain: Learner, winner: 'hero' | 'villain'): string => {
  const moments = winner === 'hero' ? [
    `${hero.name} unleashed a devastating "Grammar Slam" that shattered ${villain.name}'s defenses!`,
    `In a brilliant move, ${hero.name} used Past Perfect tense to trap ${villain.name}!`,
    `${hero.name}'s ${hero.petType} charged forward, creating the perfect distraction for victory!`,
    `With a mighty vocabulary blast, ${hero.name} sent ${villain.name} flying!`,
    `${hero.name} channeled ${hero.xp} XP into a legendary pronunciation strike!`,
  ] : [
    `${villain.name} cast a cursed spelling hex that weakened ${hero.name}!`,
    `Using dark grammar magic, ${villain.name} trapped ${hero.name} in a syntax prison!`,
    `${villain.name}'s sinister ${villain.petType} ambushed ${hero.name} from the shadows!`,
    `A wave of confusion spells from ${villain.name} overwhelmed ${hero.name}!`,
    `${villain.name} unleashed their full villainous power, striking down ${hero.name}!`,
  ];
  return moments[Math.floor(Math.random() * moments.length)];
};

export const CombatArena: React.FC<ArenaProps> = ({ learners, setLearners, teacher }) => {
  const [isBattling, setIsBattling] = useState(false);
  const [currentBattle, setCurrentBattle] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [showStoryPrompt, setShowStoryPrompt] = useState(false);
  const [battleHistory, setBattleHistory] = useState<BattleStorybookEntry[]>([]);
  const theme = BATTLE_THEMES[selectedTheme];
  
  const weekNumber = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
  }, []);

  const currentYear = new Date().getFullYear();
  const weekEnds = useMemo(() => {
    const now = new Date();
    const day = now.getDay() || 7;
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + (7 - day));
    return sunday;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readCombatHistoryFromStorage().then(history => {
      if (!cancelled) setBattleHistory(history as BattleStorybookEntry[]);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    void persistCombatHistory(battleHistory.slice(0, 20)).then(() => {
      triggerAutoSync();
    });
  }, [battleHistory]);

  const { heroes, villains } = useMemo(() => {
    const active = learners.filter(l => l.status === 'active');
    return {
      heroes: active.filter(l => ['Fairy', 'Superhero', 'Elf', 'Baby', 'Mage'].includes(l.avatarArchetype)),
      villains: active.filter(l => ['Vampire', 'Supervillain', 'Zombie', 'Troll', 'Mermaid'].includes(l.avatarArchetype)),
    };
  }, [learners]);

  const regressEvolution = (learner: Learner, isPet: boolean = false): Partial<Learner> => {
    const currentXP = isPet ? (learner.petXp ?? 0) : learner.xp;
    const currentRank = isPet 
      ? getPetEvolution(learner.petType, currentXP).rank
      : getAvatarEvolution(learner.gender, learner.avatarArchetype, currentXP).rank;
    
    if (currentRank <= 1) return {}; // Can't regress below rank 1
    
    // Find previous rank's XP threshold
    const evolutionTable = isPet
      ? [{ rank: 1, xpNeeded: 0 }, { rank: 2, xpNeeded: 200 }, { rank: 3, xpNeeded: 800 }, { rank: 4, xpNeeded: 2500 }, { rank: 5, xpNeeded: 8000 }]
      : [{ rank: 1, xpNeeded: 0 }, { rank: 2, xpNeeded: 150 }, { rank: 3, xpNeeded: 500 }, { rank: 4, xpNeeded: 1500 }, { rank: 5, xpNeeded: 5000 }];
    
    const prevRankXP = evolutionTable[currentRank - 2]?.xpNeeded || 0;
    
    if (isPet) {
      return { petXp: Math.max(0, prevRankXP - 1) };
    }
    return { xp: Math.max(0, prevRankXP - 1) };
  };

  const runBattle = useCallback(async () => {
    setIsBattling(true);
    setBattleLog([]);
    setResult(null);
    
    const battles: BattleResult['battles'] = [];
    const maxBattles = Math.min(heroes.length, villains.length);
    
    for (let i = 0; i < maxBattles; i++) {
      setCurrentBattle(i);
      const hero = heroes[i];
      const villain = villains[i];
      
      await new Promise(r => setTimeout(r, 1500));
      
      const heroPower = calculateBattlePower(hero);
      const villainPower = calculateBattlePower(villain);
      
      const winner = heroPower > villainPower ? 'hero' : 'villain';
      const powerDiff = Math.abs(heroPower - villainPower);
      
      // Death mechanics - higher power difference = higher death chance for loser
      const deathChance = Math.min(0.3 + (powerDiff / 500), 0.7);
      const heroDied = winner === 'villain' && Math.random() < deathChance;
      const villainDied = winner === 'hero' && Math.random() < deathChance;
      
      // Pet death chance (separate)
      const petDeathChance = 0.15;
      const petDied = {
        hero: winner === 'villain' && Math.random() < petDeathChance,
        villain: winner === 'hero' && Math.random() < petDeathChance,
      };
      
      const epicMoment = generateEpicMoment(hero, villain, winner);
      
      battles.push({
        hero, villain, winner, heroDied, villainDied, petDied, epicMoment,
      });
      
      setBattleLog(prev => [...prev, 
        `${winner === 'hero' ? '⚡' : '🌑'} ${winner === 'hero' ? hero.name : villain.name} WINS!`,
        epicMoment,
        ...(heroDied ? [`💀 ${hero.name} has fallen! Their power regresses...`] : []),
        ...(villainDied ? [`💀 ${villain.name} is defeated! They lose rank!`] : []),
        ...(petDied.hero ? [`🐾 ${hero.name}'s ${hero.petType} was slain!`] : []),
        ...(petDied.villain ? [`🐾 ${villain.name}'s ${villain.petType} fell in battle!`] : []),
        '---'
      ]);
      
      // Apply consequences
      setLearners(prev => prev.map(l => {
        if (l.id === hero.id) {
          const updates: Partial<Learner> = {};
          if (heroDied) Object.assign(updates, regressEvolution(l, false));
          if (petDied.hero) Object.assign(updates, regressEvolution(l, true));
          return { ...l, ...updates };
        }
        if (l.id === villain.id) {
          const updates: Partial<Learner> = {};
          if (villainDied) Object.assign(updates, regressEvolution(l, false));
          if (petDied.villain) Object.assign(updates, regressEvolution(l, true));
          return { ...l, ...updates };
        }
        return l;
      }));
    }
    
    const finalResult: BattleResult = {
      winner: battles.filter(b => b.winner === 'hero').length > battles.filter(b => b.winner === 'villain').length ? 'heroes' : 'villains',
      battles,
      story: '',
    };
    const entry: BattleStorybookEntry = {
      id: `battle-${Date.now()}`,
      week: weekNumber,
      year: currentYear,
      title: `Week ${weekNumber}: ${finalResult.winner === 'heroes' ? 'The Light Prevails' : 'The Shadows Rise'}`,
      createdAt: new Date().toISOString(),
      summary: `${finalResult.battles.length} duels fought in ${theme.name}. ${finalResult.battles.filter(b => b.heroDied || b.villainDied).length} warriors fell and ${finalResult.battles.filter(b => b.petDied.hero || b.petDied.villain).length} pets were lost.`,
      result: finalResult,
    };
    
    setResult(finalResult);
    setBattleHistory(prev => [entry, ...prev.filter(h => !(h.week === weekNumber && h.year === currentYear))]);
    setIsBattling(false);
  }, [heroes, villains, setLearners, weekNumber, currentYear, theme.name]);

  const copyStoryPrompt = () => {
    if (!result) return;
    navigator.clipboard.writeText(generateEpicStoryPrompt(result, teacher));
    setShowStoryPrompt(true);
    setTimeout(() => setShowStoryPrompt(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Arena Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${theme.bg} rounded-[2.5rem] p-6 shadow-2xl border-4 border-white/40 relative overflow-hidden`}
      >
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-4xl"
              style={{ 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`,
              }}
              animate={{ y: [0, -20, 0], rotate: [0, 360] }}
              transition={{ duration: 3 + Math.random() * 2, repeat: Infinity }}
            >
              {theme.emoji}
            </motion.span>
          ))}
        </div>
        
        <div className="relative z-10 text-center">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-2"
          >
            ⚔️
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">
            COMBAT ARENA
          </h2>
          <p className="text-white/90 font-bold mt-2">
            Week {weekNumber} • {theme.name} • Ends {weekEnds.toLocaleDateString()}
          </p>
          <p className="text-white/80 text-xs font-bold mt-1">Weekly arena resets automatically next week. This week's story is kept in the Storybook.</p>
          
          {/* Theme Selector */}
          <div className="flex justify-center gap-2 mt-4">
            {BATTLE_THEMES.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setSelectedTheme(i)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedTheme === i 
                    ? 'bg-white text-indigo-900 scale-110' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {t.emoji} {t.name}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Team Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Heroes */}
        <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-3xl p-5 border-4 border-yellow-200 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> LIGHT HEROES
            </h3>
            <span className="bg-white/20 text-white font-black px-3 py-1 rounded-full text-sm">
              {heroes.length} Warriors
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
            {heroes.map(h => {
              const avatar = getAvatarEvolution(h.gender, h.avatarArchetype, h.xp);
              const pet = getPetEvolution(h.petType, h.petXp ?? 0);
              const rarity = getRarityTier(avatar.rank);
              return (
                <div key={h.id} className="flex items-center gap-3 p-3 bg-white/95 rounded-2xl border" style={{ boxShadow: rarity.boxGlow }}>
                  <span className={`text-3xl select-none ${rarity.dropGlow}`} style={{ filter: `drop-shadow(${rarity.boxGlow})` }}>
                    {avatar.emoji}
                  </span>
                  <span className="text-xl select-none opacity-80" title={`${h.petType}: ${pet.form}`}>
                    {pet.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-indigo-900 truncate">{h.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold">⚔️{h.attack} 🛡️{h.defense} ⚡{h.xp}</p>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${rarity.badgeBg} ${rarity.badgeText}`}>
                    {rarity.rarity} R{avatar.rank}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Villains */}
        <div className="bg-gradient-to-br from-purple-600 via-indigo-700 to-slate-900 rounded-3xl p-5 border-4 border-purple-400 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Skull className="w-5 h-5" /> DARK VILLAINS
            </h3>
            <span className="bg-white/20 text-white font-black px-3 py-1 rounded-full text-sm">
              {villains.length} Warriors
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
            {villains.map(v => {
              const avatar = getAvatarEvolution(v.gender, v.avatarArchetype, v.xp);
              const pet = getPetEvolution(v.petType, v.petXp ?? 0);
              const rarity = getRarityTier(avatar.rank);
              return (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-white/95 rounded-2xl border" style={{ boxShadow: rarity.boxGlow }}>
                  <span className={`text-3xl select-none ${rarity.dropGlow}`} style={{ filter: `drop-shadow(${rarity.boxGlow})` }}>
                    {avatar.emoji}
                  </span>
                  <span className="text-xl select-none opacity-80" title={`${v.petType}: ${pet.form}`}>
                    {pet.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-indigo-900 truncate">{v.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold">⚔️{v.attack} 🛡️{v.defense} ⚡{v.xp}</p>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${rarity.badgeBg} ${rarity.badgeText}`}>
                    {rarity.rarity} R{avatar.rank}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Battle Controls */}
      {!isBattling && !result && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={runBattle}
          disabled={heroes.length === 0 || villains.length === 0}
          className="w-full py-5 bg-gradient-to-r from-amber-500 via-red-500 to-purple-600 text-white text-2xl font-black rounded-3xl shadow-2xl border-4 border-white/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-3"
        >
          <Swords className="w-8 h-8" /> 
          START WEEKLY BATTLE!
          <Swords className="w-8 h-8" />
        </motion.button>
      )}

      {heroes.length === 0 || villains.length === 0 ? (
        <div className="text-center p-6 bg-amber-50 rounded-2xl border-2 border-amber-200">
          <p className="text-amber-800 font-bold">
            ⚠️ Need both Heroes and Villains to battle!
          </p>
          <p className="text-sm text-amber-600">
            Assign archetypes: Heroes = Fairy/Superhero/Elf/Baby/Mage | Villains = Vampire/Supervillain/Zombie/Troll/Mermaid
          </p>
        </div>
      ) : null}

      {/* Battle Animation */}
      {isBattling && (
        <div className="bg-black/90 rounded-3xl p-6 border-4 border-red-500 shadow-2xl">
          <div className="flex items-center justify-center gap-6 mb-4">
            <motion.div 
              animate={{ x: [-20, 20, -20] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-6xl"
            >
              {heroes[currentBattle] ? getAvatarEvolution(heroes[currentBattle].gender, heroes[currentBattle].avatarArchetype, heroes[currentBattle].xp).emoji : '⚔️'}
            </motion.div>
            <motion.span 
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-4xl text-red-500 font-black"
            >
              VS
            </motion.span>
            <motion.div 
              animate={{ x: [20, -20, 20] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-6xl"
            >
              {villains[currentBattle] ? getAvatarEvolution(villains[currentBattle].gender, villains[currentBattle].avatarArchetype, villains[currentBattle].xp).emoji : '⚔️'}
            </motion.div>
          </div>
          
          <p className="text-center text-white font-bold mb-2">
            Battle {currentBattle + 1} of {Math.min(heroes.length, villains.length)}
          </p>
          <p className="text-center text-white/70 text-sm">
            {heroes[currentBattle]?.name} vs {villains[currentBattle]?.name}
          </p>
          
          {/* Battle Log */}
          <div className="mt-4 p-4 bg-slate-800 rounded-2xl h-48 overflow-y-auto font-mono text-xs">
            {battleLog.map((log, i) => (
              <p key={i} className={`mb-1 ${
                log.includes('WINS') ? 'text-yellow-400 font-bold' :
                log.includes('💀') ? 'text-red-400' :
                log.includes('🐾') ? 'text-pink-400' :
                'text-green-400'
              }`}>
                {log}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-3xl p-6 border-4 border-white/60 shadow-2xl"
        >
          <div className="text-center mb-6">
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-6xl mb-2"
            >
              {result.winner === 'heroes' ? '👑' : result.winner === 'villains' ? '🌑' : '⚖️'}
            </motion.div>
            <h3 className="text-3xl font-black text-white drop-shadow-lg">
              {result.winner === 'heroes' ? 'HEROES TRIUMPH!' : 
               result.winner === 'villains' ? 'VILLAINS CONQUER!' : 
               'DRAW!'}
            </h3>
            <p className="text-white/90 font-bold mt-2">
              {result.battles.filter(b => b.winner === 'hero').length} - {result.battles.filter(b => b.winner === 'villain').length}
            </p>
          </div>

          {/* Death Summary */}
          {result.battles.some(b => b.heroDied || b.villainDied || b.petDied.hero || b.petDied.villain) && (
            <div className="bg-black/30 rounded-2xl p-4 mb-4">
              <h4 className="text-white font-black mb-2 flex items-center gap-2">
                <Skull className="w-5 h-5" /> CASUALTIES
              </h4>
              <div className="space-y-1 text-sm">
                {result.battles.filter(b => b.heroDied).map((b, i) => (
                  <p key={`h-${i}`} className="text-red-300">💀 {b.hero.name} regressed to previous rank</p>
                ))}
                {result.battles.filter(b => b.villainDied).map((b, i) => (
                  <p key={`v-${i}`} className="text-red-300">💀 {b.villain.name} was demoted</p>
                ))}
                {result.battles.filter(b => b.petDied.hero).map((b, i) => (
                  <p key={`ph-${i}`} className="text-pink-300">🐾 {b.hero.name}'s pet {b.hero.petType} was slain</p>
                ))}
                {result.battles.filter(b => b.petDied.villain).map((b, i) => (
                  <p key={`pv-${i}`} className="text-pink-300">🐾 {b.villain.name}'s pet {b.villain.petType} fell</p>
                ))}
              </div>
            </div>
          )}

          {/* Battle Details */}
          <div className="bg-white/20 rounded-2xl p-4 mb-4 max-h-64 overflow-y-auto">
            {result.battles.map((b, i) => (
              <div key={i} className="mb-3 pb-3 border-b border-white/20 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-white text-sm">{b.hero.name} vs {b.villain.name}</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    b.winner === 'hero' ? 'bg-yellow-400 text-yellow-900' : 'bg-purple-400 text-purple-900'
                  }`}>
                    {b.winner === 'hero' ? 'HERO WINS' : 'VILLAIN WINS'}
                  </span>
                </div>
                <p className="text-white/90 text-xs italic">"{b.epicMoment}"</p>
              </div>
            ))}
          </div>

          {/* Story Prompt Button */}
          <button
            onClick={copyStoryPrompt}
            className="w-full py-4 bg-white text-indigo-900 font-black rounded-2xl flex items-center justify-center gap-2 cursor-pointer hover:bg-indigo-50 transition-colors"
          >
            <Copy className="w-5 h-5" />
            {showStoryPrompt ? '✅ Prompt Copied!' : 'Copy Epic Story Prompt for AI'}
          </button>

          <button
            onClick={() => { setResult(null); setBattleLog([]); }}
            className="w-full mt-3 py-3 bg-white/20 text-white font-black rounded-2xl flex items-center justify-center gap-2 cursor-pointer hover:bg-white/30 transition-colors"
          >
            <RefreshCw className="w-5 h-5" /> Battle Again
          </button>
        </motion.div>
      )}

      {/* Storybook History */}
      {battleHistory.length > 0 && (
        <div className="bg-white/85 backdrop-blur-md rounded-[2.5rem] p-6 border-4 border-amber-200 shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-2xl font-black text-indigo-950 flex items-center gap-2">📖 Arena Storybook</h3>
            <span className="text-xs font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full">{battleHistory.length} chapters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto no-scrollbar">
            {battleHistory.map(entry => (
              <div key={entry.id} className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-black text-indigo-950">{entry.title}</p>
                    <p className="text-[10px] font-bold text-gray-500">{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="text-2xl">{entry.result.winner === 'heroes' ? '👑' : '🌑'}</span>
                </div>
                <p className="text-xs font-bold text-gray-700 mt-2">{entry.summary}</p>
                <div className="mt-3 space-y-1">
                  {entry.result.battles.slice(0, 3).map((b, i) => (
                    <p key={i} className="text-[10px] font-bold text-indigo-800 truncate">⚔️ {b.hero.name} vs {b.villain.name}: {b.winner === 'hero' ? b.hero.name : b.villain.name} won</p>
                  ))}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(generateEpicStoryPrompt(entry.result, teacher))}
                  className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy This Chapter Prompt
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CombatArena;
