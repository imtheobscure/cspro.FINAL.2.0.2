import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { THEME_CONFIG } from '../utils/helpers';
import type { Quest } from '../types';

function QuestCard({ quest }: { quest: Quest }) {
  const { dispatch } = useGame();
  const [expanded, setExpanded] = useState(false);
  const completedSteps = quest.steps.filter(s => s.completed).length;
  const totalSteps = quest.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const typeColor = {
    daily: '#4422cc',
    weekly: '#cc8822',
    monthly: '#cc2222',
    personal: '#22cc88',
  }[quest.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: quest.completed ? '#22cc4440' : `${typeColor}40`,
        background: quest.completed ? 'rgba(5,20,5,0.8)' : 'rgba(10,10,20,0.9)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-all"
      >
        <span className="text-4xl">{quest.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-white">{quest.title}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
              style={{ background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}40` }}>
              {quest.type}
            </span>
            {quest.completed && <span className="text-green-400 text-sm">✅ Complete</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{quest.description}</p>
          {/* Progress */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full"
                style={{ background: typeColor }}
              />
            </div>
            <span className="text-[10px] text-gray-500">{completedSteps}/{totalSteps}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-yellow-400 font-black text-sm">+{quest.totalXp} Rep</p>
          <p className="text-green-400 text-xs">+{quest.totalCoins} 💰</p>
          <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded steps */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: `${typeColor}20` }}>
              <div className="pt-3 space-y-2">
                {quest.steps.map(step => (
                  <motion.div
                    key={step.id}
                    layout
                    className="flex items-start gap-3 p-3 rounded-xl border transition-all"
                    style={{
                      borderColor: step.completed ? '#22cc4440' : '#33333330',
                      background: step.completed ? 'rgba(0,30,10,0.5)' : 'rgba(15,15,25,0.5)',
                    }}
                  >
                    <button
                      onClick={() => dispatch({ type: 'COMPLETE_QUEST_STEP', payload: { questId: quest.id, stepId: step.id } })}
                      className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5"
                      style={{
                        borderColor: step.completed ? '#22cc44' : '#555',
                        background: step.completed ? '#22cc44' : 'transparent',
                      }}
                    >
                      {step.completed && <span className="text-[10px] text-black font-black">✓</span>}
                    </button>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${step.completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-yellow-400">+{step.reward.xp} Rep</p>
                      <p className="text-xs text-green-400">+{step.reward.coins} 💰</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Assignees */}
              {quest.assignedTo && quest.assignedTo.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-gray-500">Assigned to:</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Isometric quest board tile
function QuestTile({ step, index, completed, color }: { step: string; index: number; completed: boolean; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
      style={{
        transformStyle: 'preserve-3d',
        transform: `perspective(500px) rotateX(30deg) rotateZ(-10deg)`,
      }}
    >
      <div
        className="p-3 rounded-xl border text-center min-h-16 flex flex-col items-center justify-center"
        style={{
          borderColor: completed ? '#22cc4460' : `${color}40`,
          background: completed
            ? 'linear-gradient(135deg, rgba(5,30,10,0.9) 0%, rgba(10,40,15,0.8) 100%)'
            : `linear-gradient(135deg, rgba(10,10,20,0.9) 0%, ${color}10 100%)`,
          boxShadow: completed ? '0 4px 15px rgba(34,204,68,0.2)' : `0 4px 15px ${color}15`,
        }}
      >
        {completed ? (
          <span className="text-2xl">✅</span>
        ) : (
          <span className="text-2xl font-black" style={{ color }}>{index + 1}</span>
        )}
        <p className="text-[9px] text-gray-400 mt-1 leading-tight">{step}</p>
      </div>
      {/* Connector line */}
      {index < 3 && (
        <div
          className="absolute top-1/2 -right-3 w-3 h-0.5"
          style={{ background: completed ? '#22cc44' : color, opacity: 0.5 }}
        />
      )}
    </motion.div>
  );
}

export function QuestsBoard() {
  const { state, dispatch } = useGame();
  const cfg = THEME_CONFIG[state.theme];
  const [filter, setFilter] = useState<'all' | 'active' | 'complete'>('all');

  const monthlyQuest = state.quests.find(q => q.type === 'monthly');
  const filteredQuests = state.quests.filter(q => {
    if (filter === 'active') return !q.completed;
    if (filter === 'complete') return q.completed;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white uppercase tracking-wider">
          {state.theme === 'mafia' ? '📋 Mission Board' : '🗺️ Quest Map'}
        </h2>
        <p className="text-gray-500 text-sm">Field missions and epic quests for your operatives</p>
      </div>

      {/* Monthly Epic Quest — isometric board */}
      {monthlyQuest && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border overflow-hidden"
          style={{
            borderColor: '#cc222240',
            background: 'linear-gradient(135deg, rgba(20,5,5,0.95) 0%, rgba(30,10,10,0.9) 100%)',
            boxShadow: '0 0 40px rgba(200,30,30,0.1)',
          }}
        >
          <div className="p-5 border-b border-red-900/30">
            <div className="flex items-center gap-3">
              <span className="text-5xl">{monthlyQuest.emoji}</span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-900/20 border border-red-900/40 px-2 py-0.5 rounded">
                  MONTHLY EPIC QUEST
                </span>
                <h3 className="text-xl font-black text-white mt-1">{monthlyQuest.title}</h3>
                <p className="text-sm text-gray-400">{monthlyQuest.description}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-black text-yellow-400">+{monthlyQuest.totalXp}</p>
                <p className="text-xs text-gray-400">Rep Reward</p>
              </div>
            </div>
          </div>

          {/* Isometric step map */}
          <div className="p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Quest Progress Map</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {monthlyQuest.steps.map((step, i) => (
                <div key={step.id} className="space-y-2">
                  <QuestTile
                    step={step.title}
                    index={i}
                    completed={step.completed}
                    color='#cc2222'
                  />
                  <button
                    onClick={() => dispatch({ type: 'COMPLETE_QUEST_STEP', payload: { questId: monthlyQuest.id, stepId: step.id } })}
                    className={`w-full text-[10px] py-1 rounded font-bold border transition-all ${step.completed ? 'border-green-800/40 text-green-500 cursor-not-allowed' : 'border-red-800/40 text-red-400 hover:bg-red-900/20'}`}
                    disabled={step.completed}
                  >
                    {step.completed ? '✅ Done' : '⚡ Mark Complete'}
                  </button>
                </div>
              ))}
            </div>
            {monthlyQuest.completed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-4 rounded-xl bg-green-900/30 border border-green-700/40 text-center"
              >
                <span className="text-4xl">🏆</span>
                <p className="font-black text-green-300 text-lg mt-1">EPIC QUEST COMPLETE!</p>
                <p className="text-sm text-green-400">All operatives earned {monthlyQuest.totalXp} Rep + {monthlyQuest.totalCoins} Credits</p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Filter + All quests */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-black text-white uppercase tracking-wider">All Missions</h3>
          <div className="flex gap-1">
            {(['all', 'active', 'complete'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-xs font-bold border transition-all capitalize"
                style={{
                  borderColor: filter === f ? cfg.neonColor : '#333',
                  background: filter === f ? `${cfg.neonColor}20` : 'transparent',
                  color: filter === f ? cfg.neonColor : '#666',
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredQuests.map(quest => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </AnimatePresence>
          {filteredQuests.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">📋</p>
              <p>No missions in this category</p>
              <p className="text-sm mt-1">Head to the War Room to create some!</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-4 text-center" style={{ borderColor: `${cfg.neonColor}30`, background: `${cfg.neonColor}08` }}>
          <p className="text-2xl font-black" style={{ color: cfg.neonColor }}>{state.quests.length}</p>
          <p className="text-xs text-gray-500 uppercase">Total Missions</p>
        </div>
        <div className="rounded-xl border p-4 text-center" style={{ borderColor: '#22cc4430', background: '#22cc4408' }}>
          <p className="text-2xl font-black text-green-400">{state.quests.filter(q => q.completed).length}</p>
          <p className="text-xs text-gray-500 uppercase">Completed</p>
        </div>
        <div className="rounded-xl border p-4 text-center" style={{ borderColor: '#cc882230', background: '#cc882208' }}>
          <p className="text-2xl font-black text-yellow-400">{state.quests.reduce((s, q) => s + q.totalXp, 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 uppercase">Total Rep Available</p>
        </div>
      </div>
    </div>
  );
}
