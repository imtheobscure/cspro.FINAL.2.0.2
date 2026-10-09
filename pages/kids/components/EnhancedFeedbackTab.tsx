/* ════════════════════════════════════════════════════════════════════════════
   📊 ENHANCED GAMIFIED & HIGHLY VISUALIZED FEEDBACK TAB
   - Visual Competency Radar / Spider Diagram (SVG)
   - Learning Momentum & XP Velocity Growth Curve (SVG Chart)
   - 4-Way Mastery Progress Ring Gauges
   - Elemental Power-Ups & Superpowers (Star ratings, badges & gauges)
   - Boss Challenges Tracker with visual Boss HP Bars & Defeat Rewards
   - Visual Teacher Stamps & Star Rating Meter
   - One-Click Printable & Save as PDF Report Card layout with clean print styles
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Award, Zap, Shield, Flame, Star, Sparkles,
  Printer, Download, Plus, CheckCircle2, AlertTriangle,
  Swords, Trophy, Crown, Heart, Check, X, RefreshCw,
  BarChart3, PieChart, Activity, HelpCircle, FileText
} from 'lucide-react';
import { Learner, TeacherProfile, Weakness, FeedbackEntry } from '../types';
import { playClick, playStarShower, playQuestDing, playTone } from '../utils/kidsAudio';

interface EnhancedFeedbackTabProps {
  learner: Learner;
  onUpdate: (u: Partial<Learner>) => void;
  ts: { bg: string; text: string; btn: string; border: string; card: string };
  teacher: TeacherProfile;
}

export const EnhancedFeedbackTab: React.FC<EnhancedFeedbackTabProps> = ({
  learner,
  onUpdate,
  ts,
  teacher
}) => {
  // Active subview or filter (All, Radar, Bosses, Strengths)
  const [activeVisualMode, setActiveVisualMode] = useState<'overview' | 'radar' | 'bosses' | 'powers'>('overview');

  // New Boss Challenge Modal / State
  const [showAddBossModal, setShowAddBossModal] = useState(false);
  const [bossName, setBossName] = useState('');
  const [bossEmoji, setBossEmoji] = useState('🐉');
  const [bossTotalHp, setBossTotalHp] = useState(100);

  // New Visual Sticker / Fact state
  const [newStickerNote, setNewStickerNote] = useState('');
  const [selectedStickerIcon, setSelectedStickerIcon] = useState('🌟');

  // Feedback Log
  const feedbackLog = learner.feedbackLog || [];

  // Weaknesses / Boss Challenges
  const weaknesses = learner.weaknesses || [];

  /* ── 1. SKILL RADAR CHART COMPUTATIONS ── */
  const skillEntries = useMemo(() => {
    const raw: Record<string, number> = (learner.skills as Record<string, number>) || {};
    const defaultSkills = [
      { key: 'vocabulary', label: 'Vocabulary', emoji: '📚', val: raw.vocabulary ?? 85 },
      { key: 'grammar', label: 'Grammar', emoji: '🧩', val: raw.grammar ?? 75 },
      { key: 'pronunciation', label: 'Pronunciation', emoji: '🗣️', val: raw.pronunciation ?? 90 },
      { key: 'listening', label: 'Listening', emoji: '🎧', val: raw.listening ?? 80 },
      { key: 'speaking', label: 'Speaking', emoji: '🎤', val: raw.speaking ?? 88 },
      { key: 'reading', label: 'Reading', emoji: '📖', val: raw.reading ?? 82 },
      { key: 'writing', label: 'Writing', emoji: '✍️', val: raw.writing ?? 80 },
      { key: 'comprehension', label: 'Comprehension', emoji: '🧠', val: raw.comprehension ?? 86 },
    ];
    return defaultSkills;
  }, [learner.skills]);

  // Generate SVG points for the Radar Diagram
  const radarSvgData = useMemo(() => {
    const total = skillEntries.length;
    const center = 150;
    const radius = 105;

    // Web polygon points for learner's current score
    const scorePoints = skillEntries.map((s, i) => {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const r = (Math.max(10, Math.min(100, s.val)) / 100) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return { x, y, val: s.val, ...s, angle };
    });

    const polygonString = scorePoints.map(p => `${p.x},${p.y}`).join(' ');

    // Axis spokes
    const axisSpokes = skillEntries.map((s, i) => {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const x2 = center + radius * Math.cos(angle);
      const y2 = center + radius * Math.sin(angle);
      const labelX = center + (radius + 24) * Math.cos(angle);
      const labelY = center + (radius + 20) * Math.sin(angle);
      return { x1: center, y1: center, x2, y2, labelX, labelY, ...s };
    });

    return { center, radius, polygonString, scorePoints, axisSpokes };
  }, [skillEntries]);

  /* ── 2. XP VELOCITY & PROGRESSION CURVE ── */
  const xpHistory = useMemo(() => {
    // Generate 7-day visual curve from learner dailyXP or simulated growth
    const raw = learner.dailyXP && learner.dailyXP.length >= 7
      ? learner.dailyXP.slice(-7)
      : [40, 75, 60, 110, 95, 140, learner.xp > 0 ? (learner.xp % 200) + 80 : 150];

    const max = Math.max(...raw, 160);
    const chartWidth = 360;
    const chartHeight = 110;
    const padding = 20;

    const points = raw.map((val, idx) => {
      const x = padding + (idx / (raw.length - 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - (val / max) * (chartHeight - padding * 2);
      return { x, y, val, day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx] };
    });

    const pathD = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x},${chartHeight - padding} L ${points[0].x},${chartHeight - padding} Z`;

    return { points, pathD, areaD, totalRecent: raw.reduce((a, b) => a + b, 0) };
  }, [learner.dailyXP, learner.xp]);

  /* ── 3. MASTERY RING PERCENTAGES ── */
  const questMasteryPct = useMemo(() => {
    const completed = (learner.completedQuests || []).length;
    const total = completed + (learner.currentQuests || []).length || 10;
    return Math.min(100, Math.round((completed / Math.max(1, total)) * 100));
  }, [learner.completedQuests, learner.currentQuests]);

  const homeworkMasteryPct = useMemo(() => {
    const hw = learner.homework || [];
    if (hw.length === 0) return 85;
    const completed = hw.filter(h => h.completed).length;
    return Math.round((completed / hw.length) * 100);
  }, [learner.homework]);

  const overallAccuracyPct = useMemo(() => {
    const scores = Object.values(learner.skills || {});
    if (scores.length === 0) return 88;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [learner.skills]);

  /* ── 4. ELEMENTAL SUPERPOWERS ── */
  const elementalPowers = [
    {
      id: 'flame',
      name: 'Flame of Speed',
      icon: '🔥',
      color: 'from-orange-500 to-amber-500',
      stars: 5,
      level: 'Grandmaster',
      desc: 'Rapid question answers & quick reflexes'
    },
    {
      id: 'lightning',
      name: 'Lightning Accuracy',
      icon: '⚡',
      color: 'from-yellow-400 to-amber-600',
      stars: 4,
      level: 'Expert Strike',
      desc: 'High precision on grammar & spelling tests'
    },
    {
      id: 'shield',
      name: 'Shield of Retention',
      icon: '🛡️',
      color: 'from-blue-500 to-cyan-500',
      stars: 5,
      level: 'Titan Guard',
      desc: 'Long-term vocabulary & phrase memory'
    },
    {
      id: 'starlight',
      name: 'Starlight Creativity',
      icon: '✨',
      color: 'from-purple-500 to-pink-500',
      stars: 5,
      level: 'Mythic Spark',
      desc: 'Vivid storytelling & speaking expression'
    }
  ];

  /* ── ADD NEW BOSS CHALLENGE ── */
  const handleAddBoss = () => {
    if (!bossName.trim()) return;
    playQuestDing();
    const newWeakness: Weakness = {
      id: `boss-${Date.now()}`,
      name: `${bossEmoji} ${bossName.trim()}`,
      points: Math.round(bossTotalHp / 20) || 5,
      completed: false,
      dateAdded: new Date().toISOString().split('T')[0]
    };
    onUpdate({ weaknesses: [...weaknesses, newWeakness] });
    setBossName('');
    setShowAddBossModal(false);
  };

  /* ── DEAL DAMAGE TO BOSS / COMPLETE CHALLENGE ── */
  const handleToggleBossDamage = (id: string, currentlyCompleted: boolean) => {
    if (!currentlyCompleted) {
      playStarShower();
      playTone(587.33, 0.15, 'triangle', 0.1);
    } else {
      playClick();
    }
    const updated = weaknesses.map(w => {
      if (w.id === id) {
        return { ...w, completed: !currentlyCompleted };
      }
      return w;
    });
    onUpdate({ weaknesses: updated });
  };

  /* ── ADD VISUAL STICKER / FACT ── */
  const handleAddSticker = () => {
    if (!newStickerNote.trim()) return;
    playQuestDing();
    const newEntry: FeedbackEntry = {
      id: `sticker-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      note: `${selectedStickerIcon} ${newStickerNote.trim()}`
    };
    onUpdate({ feedbackLog: [...feedbackLog, newEntry] });
    setNewStickerNote('');
  };

  /* ── PRINT & SAVE AS PDF REPORT ── */
  const handlePrintReport = () => {
    playClick();
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* ── PRINT-ONLY STYLES INJECTION ── */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, header, footer, .no-print {
            display: none !important;
          }
          .printable-report {
            display: block !important;
            box-shadow: none !important;
            border: 2px solid #333 !important;
            padding: 24px !important;
            background: white !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── 1. Top Gamified Header & Printable Actions Bar ── */}
      <div className={`${ts.card} rounded-3xl p-5 border-3 border-indigo-200/80 dark:border-slate-700 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 backdrop-blur-md no-print`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20 shrink-0">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {learner.name}'s Visual Mastery Matrix
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                Target: {learner.targetCEFR || 'Level A2'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900">
                ⭐ {overallAccuracyPct}% Mastery
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              Gamified competency radar, velocity charts, elemental powers, and printable PDF report card.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Printable & Save as PDF */}
          <button
            onClick={handlePrintReport}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm rounded-2xl cursor-pointer shadow-md flex items-center gap-2 transition-all active:scale-95"
            title="Print or Save Report as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>

          {/* Add Boss Challenge */}
          <button
            onClick={() => {
              playClick();
              setShowAddBossModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm rounded-2xl cursor-pointer shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <Swords className="w-4 h-4" />
            <span>+ New Boss Challenge</span>
          </button>
        </div>
      </div>

      {/* ── 2. Four Master Key Visual Rings (High-Impact Gauges) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ring 1: Overall Competency */}
        <div className={`${ts.card} p-4 rounded-3xl border-2 border-emerald-200 dark:border-slate-700 shadow-md flex items-center gap-3.5`}>
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-emerald-100 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500"
                strokeDasharray={`${overallAccuracyPct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-slate-900 dark:text-white">
              {overallAccuracyPct}%
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Skill Index</p>
            <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400">Master Level</h4>
          </div>
        </div>

        {/* Ring 2: Quests Completed */}
        <div className={`${ts.card} p-4 rounded-3xl border-2 border-purple-200 dark:border-slate-700 shadow-md flex items-center gap-3.5`}>
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-purple-100 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-purple-600"
                strokeDasharray={`${questMasteryPct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-slate-900 dark:text-white">
              {questMasteryPct}%
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Quests Conquered</p>
            <h4 className="text-sm font-black text-purple-600 dark:text-purple-400">
              {(learner.completedQuests || []).length} Completed
            </h4>
          </div>
        </div>

        {/* Ring 3: Homework Mastery */}
        <div className={`${ts.card} p-4 rounded-3xl border-2 border-amber-200 dark:border-slate-700 shadow-md flex items-center gap-3.5`}>
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-amber-100 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-amber-500"
                strokeDasharray={`${homeworkMasteryPct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-slate-900 dark:text-white">
              {homeworkMasteryPct}%
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Homework Rate</p>
            <h4 className="text-sm font-black text-amber-600 dark:text-amber-400">Star Precision</h4>
          </div>
        </div>

        {/* Ring 4: Pet & Hero Evolution Power */}
        <div className={`${ts.card} p-4 rounded-3xl border-2 border-rose-200 dark:border-slate-700 shadow-md flex items-center gap-3.5`}>
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <span className="text-2xl animate-bounce">
              {learner.avatar || '🦊'}
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Companion Sync</p>
            <h4 className="text-sm font-black text-rose-600 dark:text-rose-400">
              Rank {(learner.level || 1) + 2} Ascendant
            </h4>
          </div>
        </div>
      </div>

      {/* ── 3. Visual Radar Web & Learning Velocity Chart (2-Column Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Competency Spider / Radar Web (7 cols) */}
        <div className={`lg:col-span-7 ${ts.card} rounded-3xl p-5 border-3 border-indigo-200/80 dark:border-slate-700 shadow-xl space-y-4`}>
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              <span>Competency Radar Diagram</span>
            </h4>
            <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-900 text-xs font-black">
              8 Dimensions
            </span>
          </div>

          {/* SVG Radar Visualizer */}
          <div className="relative flex items-center justify-center py-2">
            <svg
              viewBox="0 0 300 300"
              className="w-full max-w-[340px] h-[300px] overflow-visible select-none"
            >
              {/* Concentric Guide Circles */}
              {[0.25, 0.5, 0.75, 1].map((scale, i) => (
                <circle
                  key={i}
                  cx={radarSvgData.center}
                  cy={radarSvgData.center}
                  r={radarSvgData.radius * scale}
                  fill="none"
                  stroke="rgba(147, 51, 234, 0.12)"
                  strokeWidth="1.5"
                  strokeDasharray={scale === 1 ? 'none' : '3,3'}
                />
              ))}

              {/* Axis Lines */}
              {radarSvgData.axisSpokes.map((axis, i) => (
                <line
                  key={i}
                  x1={axis.x1}
                  y1={axis.y1}
                  x2={axis.x2}
                  y2={axis.y2}
                  stroke="rgba(147, 51, 234, 0.2)"
                  strokeWidth="1.5"
                />
              ))}

              {/* Radar Filled Area Polygon */}
              <polygon
                points={radarSvgData.polygonString}
                fill="rgba(147, 51, 234, 0.25)"
                stroke="#9333ea"
                strokeWidth="3"
                strokeLinejoin="round"
                className="filter drop-shadow-md"
              />

              {/* Data Point Dots & Badges */}
              {radarSvgData.scorePoints.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5.5"
                    fill="#9333ea"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-7 transition-all"
                  />
                  {/* Outer Emoji & Label */}
                  <text
                    x={radarSvgData.axisSpokes[i].labelX}
                    y={radarSvgData.axisSpokes[i].labelY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-[11px] font-black fill-slate-800 dark:fill-slate-200"
                  >
                    {pt.emoji} {pt.label} ({pt.val}%)
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Quick Skill Bar Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            {skillEntries.map(s => (
              <div key={s.key} className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs font-black">
                  <span>{s.emoji} {s.label}</span>
                  <span className={s.val >= 85 ? 'text-emerald-600' : 'text-purple-600'}>{s.val}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className={`h-full rounded-full ${s.val >= 85 ? 'bg-emerald-500' : s.val >= 75 ? 'bg-purple-600' : 'bg-amber-500'}`}
                    style={{ width: `${s.val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: XP Growth Velocity & Momentum Curve (5 cols) */}
        <div className={`lg:col-span-5 ${ts.card} rounded-3xl p-5 border-3 border-indigo-200/80 dark:border-slate-700 shadow-xl space-y-4 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <span>Learning Velocity & XP Curve</span>
              </h4>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-black">
                🔥 7-Day Trend
              </span>
            </div>

            {/* SVG Velocity Chart */}
            <div className="py-3">
              <svg viewBox="0 0 360 120" className="w-full h-32 overflow-visible select-none">
                <defs>
                  <linearGradient id="xpVelocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Area Fill */}
                <path d={xpHistory.areaD} fill="url(#xpVelocityGrad)" />

                {/* Main Curve */}
                <path
                  d={xpHistory.pathD}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="filter drop-shadow-sm"
                />

                {/* Data Points */}
                {xpHistory.points.map((p, i) => (
                  <g key={i}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={p.x}
                      y="118"
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-gray-500"
                    >
                      {p.day}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Quick Velocity Highlights */}
          <div className="p-3.5 bg-emerald-50/70 dark:bg-slate-800/80 rounded-2xl border border-emerald-200 dark:border-slate-700 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Total Recent XP Momentum:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-black text-sm">+{xpHistory.totalRecent} XP</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Consistency Streak:</span>
              <span className="text-amber-600 dark:text-amber-400 font-black">🔥 {learner.streak || 5} Days Active</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── 4. Gamified Boss Challenges (Learning Weaknesses Defeated) ── */}
      <div className={`${ts.card} rounded-3xl p-5 border-3 border-red-200 dark:border-slate-700 shadow-xl space-y-4`}>
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-red-500" />
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              Quest Bosses & Challenge HP Bars
            </h4>
          </div>
          <span className="text-xs font-bold text-gray-500">
            Tap to deal damage & defeat challenges!
          </span>
        </div>

        {/* Boss Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {weaknesses.length === 0 && (
            <div className="col-span-full py-8 text-center bg-red-50/50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-red-200">
              <p className="text-3xl mb-1">🎉</p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                All Challenge Bosses Defeated!
              </p>
              <p className="text-xs text-gray-500 font-bold mt-0.5">
                Click "+ New Boss Challenge" above to add new areas for growth.
              </p>
            </div>
          )}

          {weaknesses.map(w => {
            const isDefeated = w.completed;
            const hpPercent = isDefeated ? 0 : 75;

            return (
              <motion.div
                key={w.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleToggleBossDamage(w.id, isDefeated)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  isDefeated
                    ? 'bg-emerald-50 dark:bg-slate-900/60 border-emerald-300 opacity-80'
                    : 'bg-white dark:bg-slate-900 border-red-200 dark:border-slate-700 hover:border-red-400 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h5 className={`text-sm font-black truncate ${isDefeated ? 'line-through text-emerald-800 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                    {w.name}
                  </h5>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${isDefeated ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {isDefeated ? '🏆 Defeated' : '⚔️ Active Boss'}
                  </span>
                </div>

                {/* HP Bar */}
                <div className="space-y-1 mt-3">
                  <div className="flex justify-between text-[11px] font-black">
                    <span className="text-gray-500">Challenge HP</span>
                    <span className={isDefeated ? 'text-emerald-600' : 'text-red-600'}>
                      {isDefeated ? '0 / 100 HP (Defeated!)' : `${hpPercent} / 100 HP`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isDefeated ? 'bg-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mt-2">
                  <span>Reward: +{w.points || 5} Gems</span>
                  <span>Added: {w.dateAdded || 'Recent'}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── 5. Elemental Superpowers & Pedagogical Strengths (Visual Cards) ── */}
      <div className={`${ts.card} rounded-3xl p-5 border-3 border-amber-200 dark:border-slate-700 shadow-xl space-y-4`}>
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              Learner Elemental Superpowers & Strengths
            </h4>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-black">
            4 Power Archetypes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {elementalPowers.map(p => (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-amber-400 shadow-sm space-y-2.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${p.color} flex items-center justify-center text-xl shadow-md text-white`}>
                  {p.icon}
                </div>
                <span className="text-xs font-black text-amber-500 tracking-tight">
                  {'★'.repeat(p.stars)}
                </span>
              </div>

              <div>
                <h5 className="text-sm font-black text-slate-900 dark:text-white">{p.name}</h5>
                <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mt-0.5">{p.level}</p>
                <p className="text-xs font-bold text-gray-500 mt-1">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. Visual Stickers & Tutor Praise Bank ── */}
      <div className={`${ts.card} rounded-3xl p-5 border-3 border-indigo-200 dark:border-slate-700 shadow-xl space-y-4`}>
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              Tutor Praise Stickers & Visual Fact Bank
            </h4>
          </div>
          <span className="text-xs font-bold text-gray-500">Custom praise badges</span>
        </div>

        {/* Sticker Feed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {feedbackLog.length === 0 && (
            <p className="col-span-full text-xs font-bold text-gray-400 py-4 text-center">
              No praise stickers added yet. Add one below!
            </p>
          )}

          {feedbackLog.map(f => (
            <div
              key={f.id}
              className="p-3 bg-indigo-50/80 dark:bg-slate-900/80 rounded-2xl border-2 border-indigo-100 dark:border-slate-800 flex items-start justify-between gap-2 shadow-xs"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-2xl">{f.note.split(' ')[0] || '🌟'}</span>
                <div>
                  <p className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                    {f.note.replace(/^[^\s]+\s*/, '') || f.note}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">{f.date}</p>
                </div>
              </div>
              <button
                onClick={() => onUpdate({ feedbackLog: feedbackLog.filter(x => x.id !== f.id) })}
                className="text-gray-300 hover:text-red-400 cursor-pointer p-1"
                title="Remove Sticker"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Sticker Tool */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2.5">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {['🌟', '🏆', '🚀', '🎯', '💎', '👑', '💖'].map(emoji => (
              <button
                key={emoji}
                onClick={() => setSelectedStickerIcon(emoji)}
                className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center cursor-pointer transition-all ${
                  selectedStickerIcon === emoji ? 'bg-purple-100 border border-purple-400 shadow-xs' : 'hover:bg-slate-100'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <input
            value={newStickerNote}
            onChange={(e) => setNewStickerNote(e.target.value)}
            placeholder="Add a praise sticker (e.g. Mastered past tense verbs with flying colors!)..."
            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-purple-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddSticker()}
          />

          <button
            onClick={handleAddSticker}
            className={`px-4 py-2 bg-gradient-to-r ${ts.btn} text-white font-black text-xs rounded-xl cursor-pointer shadow-md hover:brightness-110 transition-all`}
          >
            + Award Sticker
          </button>
        </div>
      </div>

      {/* ── 7. PRINTABLE OFFICIAL REPORT CARD (Rendered on window.print) ── */}
      <div className="hidden printable-report border-4 border-slate-900 rounded-3xl p-8 bg-white text-black space-y-6">
        {/* Certificate Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{learner.avatar || '👑'}</span>
            <div>
              <h1 className="text-2xl font-black">{learner.name}'s Official Mastery Progress Report</h1>
              <p className="text-sm font-bold text-gray-700">
                Target: {learner.targetCEFR || 'Level A2'} • Tutor: {teacher.name || 'Tutor'} • Date: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="px-3 py-1 bg-slate-900 text-white font-black text-sm rounded-xl">
              Overall: {overallAccuracyPct}% Mastery
            </div>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-3 border-2 border-slate-300 rounded-xl">
            <p className="text-xs font-bold text-gray-600">Total XP</p>
            <p className="text-lg font-black">{learner.xp || 0} XP</p>
          </div>
          <div className="p-3 border-2 border-slate-300 rounded-xl">
            <p className="text-xs font-bold text-gray-600">Quests Finished</p>
            <p className="text-lg font-black">{(learner.completedQuests || []).length}</p>
          </div>
          <div className="p-3 border-2 border-slate-300 rounded-xl">
            <p className="text-xs font-bold text-gray-600">Active Streak</p>
            <p className="text-lg font-black">{learner.streak || 5} Days</p>
          </div>
          <div className="p-3 border-2 border-slate-300 rounded-xl">
            <p className="text-xs font-bold text-gray-600">Companion Rank</p>
            <p className="text-lg font-black">Level {(learner.level || 1) + 2}</p>
          </div>
        </div>

        {/* Skill Scores Table */}
        <div>
          <h3 className="text-base font-black mb-2 border-b border-slate-300 pb-1">Core Competency Assessment</h3>
          <div className="grid grid-cols-2 gap-2">
            {skillEntries.map(s => (
              <div key={s.key} className="flex justify-between p-2 border border-slate-200 rounded-lg text-xs font-bold">
                <span>{s.emoji} {s.label}</span>
                <span className="font-black">{s.val}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signature Line */}
        <div className="pt-8 flex justify-between items-end border-t border-slate-300">
          <div>
            <p className="text-xs text-gray-500 font-bold">Verified by Tutorly Learning Platform</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b-2 border-slate-900 mb-1" />
            <p className="text-xs font-black">{teacher.name || 'Certified Instructor'} (Signature)</p>
          </div>
        </div>
      </div>

      {/* ── 🛡️ ADD BOSS CHALLENGE MODAL ── */}
      <AnimatePresence>
        {showAddBossModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border-4 border-red-200 dark:border-slate-700 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Create New Challenge Boss
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddBossModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 block mb-1">
                    Boss Monster Emoji
                  </label>
                  <div className="flex gap-2">
                    {['🐉', '👹', '🦖', '🧌', '👾', '🌋'].map(e => (
                      <button
                        key={e}
                        onClick={() => setBossEmoji(e)}
                        className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center cursor-pointer border-2 transition-all ${
                          bossEmoji === e ? 'border-red-500 bg-red-50 dark:bg-red-950/50 scale-110' : 'border-slate-200'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 block mb-1">
                    Challenge / Boss Name
                  </label>
                  <input
                    value={bossName}
                    onChange={(e) => setBossName(e.target.value)}
                    placeholder="e.g. Phonics Dragon, Irregular Past Tense Golem..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-red-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 block mb-1">
                    Boss Total HP (Effort Level)
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={10}
                    value={bossTotalHp}
                    onChange={(e) => setBossTotalHp(parseInt(e.target.value))}
                    className="w-full accent-red-500"
                  />
                  <div className="flex justify-between text-[11px] font-bold text-gray-500">
                    <span>Quick (50 HP)</span>
                    <span className="text-red-500 font-black">{bossTotalHp} HP</span>
                    <span>Epic (200 HP)</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  onClick={() => setShowAddBossModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBoss}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs rounded-xl cursor-pointer shadow-md hover:brightness-110"
                >
                  Summon Boss ⚔️
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
