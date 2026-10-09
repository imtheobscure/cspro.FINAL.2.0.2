import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useNarration } from '../context/NarrationContext';
import { THEME_CONFIG, generateId } from '../utils/helpers';
import { ALL_ROLES } from '../data/roles';
import { playChime } from '../utils/audio';
import type { VoiceCard } from '../types';

const EMOJI_PICKS = ['🧙‍♂️','🧛‍♂️','🕴️','👑','🎭','🤵','🦁','🐺','🔱','⚡','🌑','💀','🎩','🔮','🦅','🐉','👨‍🏫','🧙','🎪','🃏'];

// Generate the ONE SINGLE MEGA PROMPT
function buildMegaPrompt(state: ReturnType<typeof import('../context/GameContext').useGame>['state']): string {
  const theme = state.theme === 'mafia' ? 'Mafia Syndicate' : 'Werewolf Pack';
  const themeRoles = ALL_ROLES.filter(r => r.theme === state.theme);
  const learnerBlock = state.learners.map(l => {
    const role = themeRoles.find(r => r.id === l.currentRoleId);
    return `  ${l.emoji} ${l.name} | Role: ${role?.emoji||'?'} ${role?.name||'?'} (${role?.faction||'?'}) | Lv${l.weeklyRoleLevel} | XP:${l.careerXp} | Coins:${l.coins} | CEFR:${l.cefrLevel} | ATK+${l.bonusAtk} DEF+${l.bonusDef} | ${l.isAlive?'ALIVE':'DEAD'} | Goals: "${l.goals}" | Lesson: "${l.currentLesson}" | Notes: "${l.lessonNotes}"`;
  }).join('\n');

  return `
══════════════════════════════════════════════════════════════════
COMBAT ARENA — SINGLE MEGA PROMPT (generates ALL game content)
══════════════════════════════════════════════════════════════════

GAME: ${theme} | Week ${state.weekNumber} | Subject: ${state.tutorProfile.subject}
GOD: ${state.tutorProfile.emoji} ${state.tutorProfile.name}

LEARNERS (${state.learners.length}):
${learnerBlock}

CURRENT SHOP ITEMS: ${state.items.filter(i=>i.theme===state.theme).map(i=>`${i.emoji}${i.name}(${i.rarity})`).join(', ')}

══════════════════════════════════════════════════════════════════
TASK: Generate ONE JSON that contains ALL of the following sections.
Each section is personalized based on each learner's CEFR level,
goals, current lesson, and role. Return ONLY valid JSON:
══════════════════════════════════════════════════════════════════

{
  "quests": [
    {
      "id": "q_unique", "title": "Quest Title", "description": "Quest description",
      "emoji": "📋", "type": "weekly",
      "assignedTo": ["l1","l2"], 
      "totalXp": 100, "totalCoins": 50,
      "steps": [
        { "id": "s1", "title": "Step 1", "description": "${state.tutorProfile.subject} task matching CEFR level", "completed": false, "reward": {"xp": 30, "coins": 15} }
      ]
    }
  ],
  "items": [
    {
      "id": "i_unique", "name": "Item Name", "emoji": "🗡️",
      "rarity": "common|rare|epic|legendary",
      "cost": 100, "stock": 5, "atk": 10, "def": 5, "vendettaDebuff": 0,
      "description": "Item flavour text", "theme": "${state.theme}"
    }
  ],
  "battleSimulation": {
    "title": "Week ${state.weekNumber} Battle",
    "nights": [
      {
        "night": 1,
        "narrative": "Dramatic story of what happens (3-5 sentences).",
        "actions": [
          { "actorId": "l1", "action": "attacks", "targetId": "l2", "result": "Hit! -20HP", "emoji": "🔫" }
        ],
        "eliminations": [],
        "learningMissions": [
          { "learnerId": "l1", "mission": "A ${state.tutorProfile.subject} task matching their CEFR" }
        ]
      }
    ],
    "winner": "l1",
    "storyConclusion": "Epic conclusion paragraph."
  },
  "airdrops": [
    {
      "title": "Airdrop Name",
      "narrative": "Dramatic narration for God to read.",
      "item": { "name": "Crate Item", "emoji": "📦", "rarity": "rare", "atk": 5, "def": 5 },
      "xpReward": 50, "coinReward": 25,
      "learningChallenge": "A ${state.tutorProfile.subject} question/task"
    }
  ],
  "dialogueCards": {
    "l1": [
      { "label": "Introduction", "text": "Character dialogue", "emoji": "🎭" },
      { "label": "Accusation", "text": "...", "emoji": "😠" },
      { "label": "Defense", "text": "...", "emoji": "😰" },
      { "label": "Victory", "text": "...", "emoji": "🎉" }
    ]
  },
  "screenNarrations": {
    "welcome": "Welcome narration for God to read aloud.",
    "battleStart": "Battle announcement narration.",
    "battleEnd": "Battle conclusion narration.",
    "airdropAnnounce": "Airdrop arrival narration.",
    "roleReveal": "Role assignment narration.",
    "victory": "Victory narration."
  },
  "monthlyEpicQuest": {
    "title": "Monthly City Building Quest Title",
    "description": "Epic quest description — teams build city structures.",
    "targetXP": 5000,
    "buildings": [
      {
        "name": "Building Name",
        "emoji": "🏛️",
        "faction": "town|mafia|neutral|village|werewolves|lonewolves",
        "xpRequired": 1000,
        "perk": "Team perk when building is completed (e.g. +10 ATK to all team members)",
        "description": "What this building represents"
      }
    ]
  }
}

RULES:
- Quests: Create 1 quest per learner, difficulty based on their CEFR level (A1=easiest, C2=hardest).
  Each quest has 3-5 steps related to "${state.tutorProfile.subject}" and their learning goals.
- Items: Create 4-6 shop items themed to ${theme}, mix of rarities.
- Battle: Simulate 5-7 nights. Use role abilities. Reference learners by their IDs (${state.learners.map(l=>l.id).join(',')}).
- Airdrops: Create 2-3 dramatic airdrops with ${state.tutorProfile.subject} learning challenges.
- Dialogue: Create 4 cards per learner, personalized to their role and personality.
- Monthly Epic Quest: Create 3 buildings per faction (9 total). Each building has an XP threshold.
  When a team's total XP reaches the threshold, the building unlocks and grants a battle perk.
- Narrations: All dramatic, themed to ${theme}, reference the subject "${state.tutorProfile.subject}".
`.trim();
}

export function TutorGodMode() {
  const { state, dispatch, copyToClipboard, exportState, importState } = useGame();
  const { voices, selectedVoice, setSelectedVoice, speak, isSpeaking, stop } = useNarration();
  const cfg = THEME_CONFIG[state.theme];
  const [tab, setTab] = useState<'profile' | 'voice' | 'ai' | 'roles' | 'theme' | 'backup'>('profile');
  const [importJson, setImportJson] = useState('');
  const [megaJson, setMegaJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [profileData, setProfileData] = useState({ ...state.tutorProfile });
  const [testSpeech, setTestSpeech] = useState('Welcome operatives. Your fate awaits.');
  const [importStatus, setImportStatus] = useState('');

  // Role editing state
  const themeRoles = ALL_ROLES.filter(r => r.theme === state.theme);
  const [editingRoles, setEditingRoles] = useState<Record<string, { name: string; emoji: string }>>({});

  useEffect(() => { setProfileData({ ...state.tutorProfile }); }, [state.tutorProfile]);

  const saveProfile = () => {
    dispatch({ type: 'UPDATE_TUTOR', payload: profileData });
    speak('God profile updated.');
    playChime();
  };

  const handleCopyMega = () => {
    const prompt = buildMegaPrompt(state);
    copyToClipboard(prompt);
    setCopied(true);
    speak('Mega prompt copied. Paste into your AI chatbot.');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleMegaImport = () => {
    try {
      const data = JSON.parse(megaJson);
      let count = 0;

      // Import quests
      if (data.quests && Array.isArray(data.quests)) {
        data.quests.forEach((q: any) => {
          dispatch({ type: 'ADD_QUEST', payload: { ...q, id: q.id || generateId(), completed: false, steps: (q.steps || []).map((s: any) => ({ ...s, id: s.id || generateId(), completed: false })) } });
        });
        count += data.quests.length;
      }

      // Import items
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((i: any) => {
          dispatch({ type: 'ADD_ITEM', payload: { ...i, id: i.id || generateId(), theme: i.theme || state.theme, mirrorItemId: undefined } });
        });
        count += data.items.length;
      }

      // Import battle simulation
      if (data.battleSimulation) {
        const bs = data.battleSimulation;
        const events = (bs.nights || []).flatMap((n: any) => (n.actions || []).map((a: any) => ({
          timestamp: new Date().toISOString(), actor: a.actorId || '', target: a.targetId, action: a.action || '', result: a.result || '', emoji: a.emoji || '⚔️', xpGained: 20, coinsGained: 10,
        })));
        dispatch({ type: 'LOG_BATTLE', payload: {
          id: generateId(), date: new Date().toISOString(), theme: state.theme,
          events, winner: bs.winner, story: bs.storyConclusion, participants: state.learners.map(l => l.id),
        }});
        count++;
      }

      // Import airdrops
      if (data.airdrops && Array.isArray(data.airdrops)) {
        data.airdrops.forEach((a: any) => {
          dispatch({ type: 'LOG_AIRDROP', payload: {
            id: generateId(), date: new Date().toISOString(), theme: state.theme,
            item: { id: generateId(), name: a.item?.name || 'Crate', emoji: a.item?.emoji || '📦', rarity: a.item?.rarity || 'rare', cost: 0, stock: 1, atk: a.item?.atk || 0, def: a.item?.def || 0, vendettaDebuff: 0, description: '', theme: state.theme },
            xp: a.xpReward || 50, coins: a.coinReward || 25,
          }});
        });
        count += data.airdrops.length;
      }

      // Import dialogue cards per learner
      if (data.dialogueCards) {
        Object.entries(data.dialogueCards).forEach(([learnerId, cards]: [string, any]) => {
          const vcs: VoiceCard[] = (cards || []).map((c: any) => ({
            id: generateId(), text: c.text || '', voiceName: '', pitch: 1, rate: 1, emoji: c.emoji || '🎭', label: c.label || 'Custom',
          }));
          dispatch({ type: 'UPDATE_LEARNER', payload: { id: learnerId, updates: { voiceCards: vcs } } });
        });
        count += Object.keys(data.dialogueCards).length;
      }

      setImportStatus(`✅ Imported! ${count} items processed.`);
      speak(`Import complete. ${count} items loaded into the arena.`);
      setMegaJson('');
      setTimeout(() => setImportStatus(''), 5000);
    } catch (e) {
      setImportStatus('❌ Invalid JSON. Check format.');
      speak('Invalid JSON format.');
    }
  };

  const saveRoleEdit = (roleId: string) => {
    const ed = editingRoles[roleId];
    if (!ed) return;
    dispatch({ type: 'UPDATE_ROLE', payload: { id: roleId, name: ed.name, emoji: ed.emoji } });
    playChime();
  };

  const startEditRole = (role: typeof themeRoles[0]) => {
    setEditingRoles(prev => ({ ...prev, [role.id]: { name: role.name, emoji: role.emoji } }));
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: '👑' },
    { id: 'voice' as const, label: 'Voice', icon: '🎤' },
    { id: 'ai' as const, label: 'AI Prompt', icon: '🤖' },
    { id: 'roles' as const, label: 'Roles', icon: '🎭' },
    { id: 'theme' as const, label: 'Theme', icon: '🎨' },
    { id: 'backup' as const, label: 'Backup', icon: '💾' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <motion.span animate={{ rotate: [0, 6, -6, 0] }} transition={{ duration: 5, repeat: Infinity }}
          className="text-[5rem] md:text-[7rem]" style={{ filter: `drop-shadow(0 0 30px ${cfg.neonColor}60)` }}>
          {state.tutorProfile.emoji}
        </motion.span>
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-white">{state.tutorProfile.name}</h2>
          <p className="text-xl font-bold mt-1" style={{ color: cfg.neonColor }}>GOD MODE</p>
          <p className="text-lg text-gray-400">{state.tutorProfile.subject}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 md:px-5 py-3 rounded-xl text-base md:text-lg font-bold border-2 transition-all"
            style={{ borderColor: tab === t.id ? cfg.neonColor : '#333', background: tab === t.id ? `${cfg.neonColor}20` : 'transparent', color: tab === t.id ? cfg.neonColor : '#666' }}>
            <span className="text-2xl">{t.icon}</span><span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════════ PROFILE ═══════════ */}
        {tab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border-2 p-6 space-y-5" style={{ borderColor: `${cfg.neonColor}25`, background: 'rgba(10,10,20,0.9)' }}>
              <div className="flex flex-wrap gap-2 mb-4">
                {EMOJI_PICKS.map(e => (
                  <button key={e} onClick={() => setProfileData(p => ({...p, emoji: e}))}
                    className="text-4xl p-1 rounded-lg transition-all"
                    style={{ background: profileData.emoji === e ? `${cfg.neonColor}25` : 'transparent', border: profileData.emoji === e ? `2px solid ${cfg.neonColor}` : '2px solid transparent' }}>
                    {e}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-base text-gray-400 uppercase font-bold block mb-1">God Name</label>
                  <input value={profileData.name} onChange={e => setProfileData(p => ({...p, name: e.target.value}))}
                    className="w-full bg-black/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-white text-xl font-bold" /></div>
                <div><label className="text-base text-gray-400 uppercase font-bold block mb-1">Subject</label>
                  <input value={profileData.subject} onChange={e => setProfileData(p => ({...p, subject: e.target.value}))}
                    className="w-full bg-black/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-white text-xl" /></div>
              </div>
              <button onClick={saveProfile} title="Save your God name, emoji, and subject" className="w-full py-4 rounded-xl font-black text-xl border-2"
                style={{ borderColor: cfg.neonColor, color: '#000', background: cfg.neonColor }}>👑 SAVE PROFILE</button>
            </div>
          </motion.div>
        )}

        {/* ═══════════ VOICE ═══════════ */}
        {tab === 'voice' && (
          <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border-2 p-6 space-y-5" style={{ borderColor: `${cfg.neonColor}25`, background: 'rgba(10,10,20,0.9)' }}>
              <h3 className="text-2xl font-black text-white">🎙️ God Narration Voice</h3>
              <p className="text-lg text-gray-400">This voice is <strong>forcefully applied everywhere</strong> in the app.</p>
              <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
                className="w-full bg-black/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-white text-lg">
                <option value="">-- Auto-select best voice --</option>
                {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
              </select>
              <div className="flex gap-3">
                <input value={testSpeech} onChange={e => setTestSpeech(e.target.value)}
                  className="flex-1 bg-black/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-white text-lg" />
                <button onClick={() => isSpeaking ? stop() : speak(testSpeech)}
                  className="px-6 py-3 rounded-xl font-bold text-lg border-2"
                  style={{ borderColor: cfg.neonColor, color: cfg.neonColor, background: `${cfg.neonColor}15` }}>
                  {isSpeaking ? '⏹ Stop' : '🔊 Test'}
                </button>
              </div>
              {isSpeaking && (
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: `${cfg.neonColor}15`, border: `2px solid ${cfg.neonColor}30` }}>
                  <div className="flex gap-1 items-end h-6">
                    {[1,2,3,4,5].map(i => (
                      <motion.div key={i} className="w-1.5 rounded-full" style={{ background: cfg.neonColor }}
                        animate={{ height: ['20%','100%','20%'] }} transition={{ duration: 0.6, repeat: Infinity, delay: i*0.1 }} />
                    ))}
                  </div>
                  <span className="text-lg font-bold" style={{ color: cfg.neonColor }}>Speaking...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════ AI MEGA PROMPT ═══════════ */}
        {tab === 'ai' && (
          <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border-2 p-6 space-y-5" style={{ borderColor: '#a855f730', background: 'rgba(15,5,25,0.9)' }}>
              <h3 className="text-2xl font-black text-white">🤖 Single Mega AI Prompt</h3>
              <p className="text-lg text-gray-400">
                One prompt generates <strong>everything</strong>: Quests, Shop Items, Battle Simulation,
                Airdrops, Dialogue Cards, and Screen Narrations — all personalized per learner.
              </p>

              {/* What it generates */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { icon: '📜', label: 'Quests', desc: 'Per-learner, CEFR-based' },
                  { icon: '⚒️', label: 'Shop Items', desc: 'Themed weapons & armor' },
                  { icon: '⚔️', label: 'Battle Plan', desc: '7-night war simulation' },
                  { icon: '📦', label: 'Airdrops', desc: 'Lesson-based loot' },
                  { icon: '🎙️', label: 'Dialogues', desc: 'Per-character lines' },
                  { icon: '🗣️', label: 'Narrations', desc: 'God screen narrations' },
                ].map(g => (
                  <div key={g.label} className="p-3 rounded-xl text-center" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                    <span className="text-3xl block mb-1">{g.icon}</span>
                    <p className="text-base font-bold text-white">{g.label}</p>
                    <p className="text-sm text-gray-500">{g.desc}</p>
                  </div>
                ))}
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleCopyMega}
                className="w-full py-5 rounded-xl font-black text-xl border-2 transition-all"
                style={{ borderColor: copied ? '#22c55e' : '#a855f7', color: '#000', background: copied ? '#22c55e' : '#a855f7' }}>
                {copied ? '✅ COPIED!' : '📋 COPY MEGA PROMPT — generates quests, items, battles, airdrops, dialogues, narrations'}
              </motion.button>

              <div className="border-t-2 border-gray-800 pt-5">
                <h4 className="text-xl font-black text-white mb-3">📥 Paste AI Response JSON</h4>
                <textarea value={megaJson} onChange={e => setMegaJson(e.target.value)} rows={10}
                  placeholder="Paste the JSON from your AI chatbot here..."
                  className="w-full bg-black/50 border-2 border-gray-700 rounded-xl p-4 text-white text-base font-mono resize-none" />
                {importStatus && (
                  <p className={`text-lg font-bold mt-2 ${importStatus.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                    {importStatus}
                  </p>
                )}
                <button onClick={handleMegaImport}
                  className="w-full mt-3 py-4 rounded-xl font-black text-xl border-2"
                  style={{ borderColor: '#a855f7', color: '#000', background: '#a855f7' }}>
                  📥 IMPORT EVERYTHING
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════ ROLES EDITOR ═══════════ */}
        {tab === 'roles' && (
          <motion.div key="roles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border-2 p-6 space-y-4" style={{ borderColor: `${cfg.neonColor}25`, background: 'rgba(10,10,20,0.9)' }}>
              <h3 className="text-2xl font-black text-white">🎭 Edit Roles — {state.theme === 'mafia' ? 'Mafia Syndicate' : 'Werewolf Pack'}</h3>
              <p className="text-base text-gray-400">Change emoji & name for any role. Saves instantly across the app.</p>

              {['town','mafia','neutral','village','werewolves','lonewolves'].filter(f => {
                if (state.theme === 'mafia') return ['town','mafia','neutral'].includes(f);
                return ['village','werewolves','lonewolves'].includes(f);
              }).map(faction => {
                const fRoles = themeRoles.filter(r => r.faction === faction);
                const fLabel = faction === 'town' ? '🏛️ Innocents' : faction === 'mafia' ? '🎭 Mafia' : faction === 'neutral' ? '⚖️ Neutrals' : faction === 'village' ? '🏘️ Village' : faction === 'werewolves' ? '🐺 Werewolves' : '🌙 Lone Wolves';
                const fColor = faction === 'town' || faction === 'village' ? '#3b82f6' : faction === 'mafia' || faction === 'werewolves' ? '#dc2626' : '#8b5cf6';
                return (
                  <div key={faction}>
                    <h4 className="text-xl font-black mb-3" style={{ color: fColor }}>{fLabel}</h4>
                    <div className="space-y-2">
                      {fRoles.map(role => {
                        const ed = editingRoles[role.id];
                        const isEditing = !!ed;
                        return (
                          <div key={role.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${fColor}08`, border: `1px solid ${fColor}20` }}>
                            {isEditing ? (
                              <>
                                <input value={ed.emoji} onChange={e => setEditingRoles(prev => ({...prev, [role.id]: {...prev[role.id], emoji: e.target.value}}))}
                                  className="w-14 bg-black/50 border border-gray-700 rounded-lg px-2 py-1 text-3xl text-center" />
                                <input value={ed.name} onChange={e => setEditingRoles(prev => ({...prev, [role.id]: {...prev[role.id], name: e.target.value}}))}
                                  className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-3 py-1 text-white text-lg font-bold" />
                                <button onClick={() => { saveRoleEdit(role.id); setEditingRoles(prev => { const n = {...prev}; delete n[role.id]; return n; }); }}
                                  className="px-3 py-1 rounded-lg bg-green-900/40 text-green-300 text-base font-bold border border-green-700/40">✓ Save</button>
                                <button onClick={() => setEditingRoles(prev => { const n = {...prev}; delete n[role.id]; return n; })}
                                  className="px-3 py-1 rounded-lg bg-gray-800 text-gray-400 text-base font-bold">✕</button>
                              </>
                            ) : (
                              <>
                                <span className="text-4xl">{role.emoji}</span>
                                <span className="text-lg font-bold text-white flex-1">{role.name}</span>
                                <span className="text-sm text-gray-500 hidden md:inline">{role.ability.slice(0, 50)}...</span>
                                <button onClick={() => startEditRole(role)}
                                  className="px-3 py-1 rounded-lg text-sm font-bold border"
                                  style={{ borderColor: `${fColor}40`, color: fColor }}>✏️ Edit</button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ═══════════ THEME & BACKGROUNDS ═══════════ */}
        {tab === 'theme' && (
          <motion.div key="theme" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border-2 p-6 space-y-5" style={{ borderColor: '#a855f730', background: 'rgba(15,5,25,0.9)' }}>
              <h3 className="text-2xl font-black text-white">🎨 Theme & Backgrounds</h3>
              <p className="text-base text-gray-400">Choose the active universe theme. Each theme changes colors, roles, and atmosphere.</p>

              {/* Universe selector */}
              <div className="grid grid-cols-2 gap-4">
                {(['mafia','werewolf'] as const).map(t => {
                  const tc = THEME_CONFIG[t];
                  return (
                    <motion.button key={t} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => dispatch({ type: 'SET_THEME', payload: t })}
                      title={`Switch to ${tc.name} theme`}
                      className="p-6 rounded-2xl border-2 text-center transition-all"
                      style={{ borderColor: state.theme === t ? tc.neonColor : '#333', background: state.theme === t ? `${tc.neonColor}15` : 'transparent' }}>
                      <span className="text-6xl block mb-2" style={{ filter: `drop-shadow(0 0 15px ${tc.neonColor}60)` }}>{tc.emoji}</span>
                      <p className="text-xl font-black" style={{ color: state.theme === t ? tc.neonColor : '#666' }}>{tc.name}</p>
                      {state.theme === t && <span className="text-sm px-2 py-0.5 rounded-full mt-2 inline-block font-bold" style={{ background: tc.neonColor, color: '#000' }}>ACTIVE</span>}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Avatar Image Toggle */}
            <div className="rounded-2xl border-2 p-6 space-y-4" style={{ borderColor: '#22cc8830', background: 'rgba(5,20,15,0.9)' }}>
              <h3 className="text-xl font-black text-white">🖼️ Avatar Images</h3>
              <p className="text-base text-gray-400">
                When ON, operatives show realistic person portraits behind their emoji.
                The emoji appears as a glossy badge in the corner.
              </p>
              <div className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-black/20 transition-all" style={{ background: 'rgba(0,0,0,0.3)' }}
                onClick={() => {
                  const on = localStorage.getItem('combat_arena_avatars') === 'on';
                  localStorage.setItem('combat_arena_avatars', on ? 'off' : 'on');
                  speak(on ? 'Avatar images off.' : 'Avatar images on.');
                  // Force re-render
                  dispatch({ type: 'UPDATE_TUTOR', payload: {} });
                }}>
                <div className="flex-1">
                  <p className="text-lg font-bold text-white">Realistic Avatar Mode</p>
                  <p className="text-sm text-gray-400">Show person portraits on cards</p>
                </div>
                <div className={`w-14 h-8 rounded-full p-1 transition-all ${localStorage.getItem('combat_arena_avatars') === 'on' ? 'bg-green-500' : 'bg-gray-700'}`}>
                  <div className="w-6 h-6 rounded-full bg-white shadow-lg transition-all" style={{ marginLeft: localStorage.getItem('combat_arena_avatars') === 'on' ? 24 : 0 }} />
                </div>
              </div>
              {/* Preview with real people images */}
              {localStorage.getItem('combat_arena_avatars') === 'on' && (
                <div className="grid grid-cols-3 gap-3">
                  {state.learners.slice(0, 3).map((l) => (
                    <div key={l.id} className="relative rounded-xl overflow-hidden h-32" style={{ border: '2px solid #22cc8830' }}>
                      <img src={`https://i.pravatar.cc/200?u=${l.id}`} alt={l.name} className="w-full h-full object-cover" style={{ filter: 'brightness(0.6) saturate(0.8)' }} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.8) 100%)' }} />
                      <div className="absolute bottom-1 right-1 w-10 h-10 rounded-full border-2 flex items-center justify-center text-xl" style={{ borderColor: `${cfg.neonColor}60`, background: 'rgba(0,0,0,0.8)', boxShadow: `0 0 12px ${cfg.neonColor}40, 0 0 4px rgba(0,0,0,0.8)` }}>
                        {l.emoji}
                      </div>
                      <p className="absolute bottom-1.5 left-2 text-sm font-bold text-white drop-shadow-lg">{l.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Background images info */}
            <div className="rounded-2xl border-2 p-6 space-y-4" style={{ borderColor: '#33333350', background: 'rgba(10,10,20,0.9)' }}>
              <h3 className="text-xl font-black text-white">🎨 Page Backgrounds</h3>
              <p className="text-base text-gray-400">
                Theme-matched dark backgrounds applied automatically.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { page: 'HQ', img: state.theme === 'mafia' ? './images/mafia-bg.jpg' : './images/wolf-bg.jpg' },
                  { page: 'Arena', img: './images/battle-bg.jpg' },
                  { page: 'Shop', img: './images/shop-bg.jpg' },
                  { page: 'Splash', img: state.theme === 'mafia' ? './images/mafia-splash.jpg' : './images/wolf-splash.jpg' },
                ].map(bg => (
                  <div key={bg.page} className="rounded-xl overflow-hidden border border-gray-800">
                    <img src={bg.img} alt={bg.page} className="w-full h-20 object-cover" style={{ filter: 'brightness(0.3)' }} />
                    <div className="p-2 bg-black/60"><p className="text-sm font-bold text-gray-400">{bg.page}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════ BACKUP ═══════════ */}
        {tab === 'backup' && (
          <motion.div key="backup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="rounded-2xl border-2 p-6 space-y-5" style={{ borderColor: '#22cc8830', background: 'rgba(5,20,15,0.9)' }}>
              <h3 className="text-2xl font-black text-white">💾 Data Vault</h3>
              <button onClick={() => { exportState(); speak('Backup exported.'); }}
                className="w-full py-4 rounded-xl font-black text-xl border-2"
                style={{ borderColor: '#22cc88', color: '#000', background: '#22cc88' }}>📤 EXPORT BACKUP</button>
              <textarea value={importJson} onChange={e => setImportJson(e.target.value)} rows={6}
                placeholder="Paste backup JSON..." className="w-full bg-black/50 border-2 border-gray-700 rounded-xl p-4 text-white text-base font-mono resize-none" />
              <button onClick={() => { importState(importJson); setImportJson(''); speak('Restored.'); }}
                className="w-full py-4 rounded-xl font-black text-xl border-2"
                style={{ borderColor: cfg.neonColor, color: '#000', background: cfg.neonColor }}>📥 RESTORE</button>
            </div>
            <button onClick={() => { dispatch({ type: 'RESET_WEEKLY' }); speak('Weekly reset.'); }}
              className="px-6 py-3 rounded-xl font-bold text-lg border-2 border-yellow-800/40 bg-yellow-900/20 text-yellow-300">🔄 Reset Weekly</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
