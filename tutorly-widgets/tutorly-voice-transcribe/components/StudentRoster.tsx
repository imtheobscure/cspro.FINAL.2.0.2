/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { User, Globe, Sparkles, BookOpen, Clock, Activity, MessageSquare, AlertTriangle, ShieldCheck } from 'lucide-react';
import { StudentProfile, TeacherFeedback } from '../types';

interface StudentRosterProps {
  onSelectedStudentChange: (student: StudentProfile) => void;
  activeStudent: StudentProfile | null;
  teacherReport: TeacherFeedback | null;
}

export const StudentRoster: React.FC<StudentRosterProps> = ({ 
  onSelectedStudentChange, 
  activeStudent,
  teacherReport
}) => {
  // Local state for learner input details to support real-time user entries
  const [name, setName] = useState('Jean-Pierre');
  const [tutorName, setTutorName] = useState('Sarah');
  const [nationality, setNationality] = useState('French');
  const [l1, setL1] = useState('French');
  const [addL1Translations, setAddL1Translations] = useState(true);
  const [l2, setL2] = useState('Spanish');
  const [explanationsInEnglish, setExplanationsInEnglish] = useState(false);
  const [focusedLanguage, setFocusedLanguage] = useState('Subjunctive tense mood, vocabulary range, past-subpast transitions.');
  const [facts, setFacts] = useState('B1-intermediate level. Jean-Pierre is preparing for a move to Seville next month. High oral understanding but hesitates frequently when formulating responses.');

  // Automatically update the parent when inputs change
  useEffect(() => {
    const studentObj: StudentProfile = {
      name: name.trim() || 'Jean-Pierre',
      tutorName: tutorName.trim() || 'Sarah',
      nationality: nationality.trim() || 'French',
      l1: l1.trim() || 'French',
      addL1Translations,
      l2: l2.trim() || 'Spanish',
      explanationsInEnglish,
      focusedLanguage: focusedLanguage.trim(),
      facts: facts.trim()
    };
    onSelectedStudentChange(studentObj);
  }, [name, tutorName, nationality, l1, addL1Translations, l2, explanationsInEnglish, focusedLanguage, facts, onSelectedStudentChange]);

  // Speaking and Filler word statistics helper values
  const speakingMetrics = teacherReport?.speakingMetrics;
  const talkRatio = speakingMetrics?.speakingTimeRatio || { student: 55, tutor: 45 };
  const fairnessScore = speakingMetrics?.turnTakingFairnessScore || 85;
  const fillerDensity = speakingMetrics?.fillerWordDensity || {
    averageDensity: 2.4,
    trendData: [
      { minute: 1, count: 2 },
      { minute: 2, count: 4 },
      { minute: 3, count: 1 },
      { minute: 4, count: 3 },
      { minute: 5, count: 2 }
    ],
    fillerWords: [
      { word: 'um', count: 4 },
      { word: 'like', count: 6 },
      { word: 'eh', count: 2 }
    ]
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Learner Profile Configuration panel */}
      <div id="learner-profile-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md p-5 transition-all duration-300">
        <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-xl text-indigo-650 dark:text-indigo-400">
            <User size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Current Learner Profile</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider">Lesson Context Inputs</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Row 1: Name, Tutor Name and L2 Target Language */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Learner Name
              </label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 focus:border-indigo-500 dark:border-slate-800 dark:focus:border-indigo-500 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50 focus:outline-none dark:text-slate-100 font-semibold transition-all"
                placeholder="e.g. Jean-Pierre"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Tutor Name
              </label>
              <input 
                type="text"
                value={tutorName}
                onChange={(e) => setTutorName(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 focus:border-indigo-500 dark:border-slate-800 dark:focus:border-indigo-500 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50 focus:outline-none dark:text-slate-100 font-semibold transition-all"
                placeholder="e.g. Sarah"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                L2 (Target Language)
              </label>
              <input 
                type="text"
                value={l2}
                onChange={(e) => setL2(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 focus:border-indigo-500 dark:border-slate-800 dark:focus:border-indigo-500 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50 focus:outline-none dark:text-slate-100 font-bold transition-all"
                placeholder="e.g. Spanish"
              />
            </div>
          </div>

          {/* Row 2: Nationality and L1 Native Language */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Nationality
              </label>
              <input 
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 focus:border-indigo-500 dark:border-slate-800 dark:focus:border-indigo-500 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50 focus:outline-none dark:text-slate-100 font-semibold transition-all"
                placeholder="e.g. French"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                L1 (Learner Native Language)
              </label>
              <input 
                type="text"
                value={l1}
                onChange={(e) => setL1(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 focus:border-indigo-500 dark:border-slate-800 dark:focus:border-indigo-500 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50 focus:outline-none dark:text-slate-100 font-semibold transition-all"
                placeholder="e.g. French"
              />
            </div>
          </div>

          {/* Checkboxes Group */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850 space-y-2.5">
            <label className="flex items-start space-x-2.5 cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={addL1Translations}
                onChange={(e) => setAddL1Translations(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-semibold block text-slate-700 dark:text-slate-250">Include L1 translations & structural comparisons</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal block mt-0.5">Identifies differences between L1 ({l1}) and L2 ({l2}), creating false friend alerts.</span>
              </div>
            </label>

            <label className="flex items-start space-x-2.5 cursor-pointer select-none border-t border-slate-150 dark:border-slate-800/60 pt-2.5">
              <input 
                type="checkbox"
                checked={explanationsInEnglish}
                onChange={(e) => setExplanationsInEnglish(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-semibold block text-slate-700 dark:text-slate-250">Explanations in English</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal block mt-0.5">If unchecked, all summaries, grammar card rules, and vocabulary feedback will be written ENTIRELY in L2 ({l2}).</span>
              </div>
            </label>
          </div>

          {/* Target language fields aspect notes */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Focused Language Elements / Topics
            </label>
            <input 
              type="text"
              value={focusedLanguage}
              onChange={(e) => setFocusedLanguage(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-slate-100"
              placeholder="e.g. Subjunctive mood, prepositions, formal registers"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Learner Facts, Context & Goals
            </label>
            <textarea 
              rows={3}
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-slate-100 leading-relaxed"
              placeholder="Provide general context, goals, previous speaking level details..."
            />
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
            <ShieldCheck size={14} className="flex-shrink-0" />
            <span>Private mode: Session insights are local. No persistent server logs are stored.</span>
          </div>

        </div>
      </div>

      {/* 2. Interactive Speaking Metrics & Talking Time Ratio Widget */}
      <div id="speaking-metrics-widget" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md p-5 transition-all duration-300">
        <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl text-amber-500">
            <Activity size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Active Classroom Metrics</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider">Acoustic & Talking Analytics</p>
          </div>
        </div>

        {!teacherReport ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <MessageSquare size={28} className="text-slate-350 dark:text-slate-600 animate-bounce" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3">Awaiting Lesson Analysis</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
              Transcribe a lesson stream to generate real student vs tutor talk times and filler density trends!
            </p>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in duration-350">
            
            {/* Talk time comparison ratio bar with visual colors */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Learner ({name}): {talkRatio.student}%</span>
                <span className="text-slate-500 dark:text-slate-400">Tutor: {talkRatio.tutor}%</span>
              </div>
              <div className="w-full h-3.5 bg-slate-150 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner border border-slate-200/50 dark:border-slate-750">
                <div 
                  className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-500 relative group"
                  style={{ width: `${talkRatio.student}%` }}
                  title={`Student Spoke: ${talkRatio.student}%`}
                >
                  <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                </div>
                <div 
                  className="bg-slate-400 dark:bg-slate-650 h-full transition-all duration-500 relative group"
                  style={{ width: `${talkRatio.tutor}%` }}
                  title={`Tutor Spoke: ${talkRatio.tutor}%`}
                >
                  <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-slate-400 mt-1">
                <span>Ideal Target Student Talk Time: 40% - 60%</span>
                <span className="font-bold text-emerald-500 uppercase">Interactive Balance Logged</span>
              </div>
            </div>

            {/* Turn Taking Fairness Score Indicator */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase font-bold block mb-0.5">Turn-Taking Fairness</span>
                <span className="text-xs text-slate-600 dark:text-slate-350 font-medium">Optimal classroom equity rating</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">{fairnessScore}%</span>
                <span className="text-[9px] text-slate-400 block -mt-0.5">Score</span>
              </div>
            </div>

            {/* Filler words metric breakdown */}
            <div className="space-y-3 pt-2.5 border-t border-slate-105 dark:border-slate-850">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-350 font-semibold mb-1">Filler Word Frequency</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">{fillerDensity.averageDensity}/min average</span>
              </div>

              {/* Simple custom CSS Bar chart for filler words count */}
              <div className="space-y-2">
                {fillerDensity.fillerWords.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      "{item.word}"
                    </span>
                    <div className="flex-1 mx-3 h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (item.count / 10) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-bold font-mono">{item.count}x</span>
                  </div>
                ))}
              </div>

              {/* Dynamic Trend chart for filler words (Small custom SVG bar trend graph) */}
              <div className="pt-2.5">
                <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1.5">Filler Word Density Trend (Over Lesson Minutes)</span>
                <div className="h-16 flex items-end gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-2 rounded-xl">
                  {fillerDensity.trendData.map((d, index) => {
                    const maxHeight = Math.max(...fillerDensity.trendData.map(p => p.count)) || 1;
                    const heightPercent = (d.count / maxHeight) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                        <div 
                          className="bg-indigo-455 hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 w-full rounded-t-sm transition-all duration-300 relative"
                          style={{ height: `${Math.max(10, heightPercent)}%` }}
                        >
                          {/* Tooltip bubble */}
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap mb-1">
                            Min {d.minute}: {d.count} fillers
                          </span>
                        </div>
                        <span className="text-[8px] mt-1 text-slate-400 font-mono">M{d.minute}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Standout Sentence Analysis */}
            {speakingMetrics?.standoutSentence && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase block tracking-wider">
                  Standout Sentence Analysis ({speakingMetrics.standoutSentence.structurallySound ? '🤩 Structural Masterpiece' : '⚠️ Minor Inaccuracy'})
                </span>
                <div className="bg-indigo-50/30 dark:bg-indigo-950/15 p-2.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">
                  <p className="font-bold text-slate-700 dark:text-slate-200">"{speakingMetrics.standoutSentence.sentence}"</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal italic">
                    {speakingMetrics.standoutSentence.analysis}
                  </p>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
};

export default StudentRoster;
