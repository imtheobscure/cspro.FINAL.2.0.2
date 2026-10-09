/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, FileText, FileSpreadsheet, Activity, 
  Map, Award, BookOpen, Key, AlertCircle, Edit3, 
  Download, Printer, Sparkles, RefreshCw, Layers,
  Volume2, Play, ChevronRight, HelpCircle, GraduationCap,
  Calendar, Check, AlertTriangle, Sliders, ToggleLeft, ToggleRight
} from 'lucide-react';
import { TeacherFeedback, StudentProfile, LanguageMistake, PronunciationPhonemeMatch, HomeworkExercise, InteractiveScenario, TranscriptionResponse } from '../types';
import { 
  exportToText, exportToDocx, exportToCsv, exportToHtml, 
  downloadTextFile, downloadBlob 
} from '../services/exportHelper';
import { buildLessonNotesPrompt } from '../services/lessonInsightPipeline';

interface TranscriptionDisplayProps {
  feedback: TeacherFeedback;
  student: StudentProfile;
  transcription?: TranscriptionResponse | null;
  /**
   * The raw pasted class transcript, shown as the report's evidence stream.
   *
   * There are no analysed `segments` any more — the widget no longer
   * transcribes audio itself — so this is what the "Tutor Speech Inventory"
   * panel displays instead.
   */
  rawTranscript?: string;
  onReRunGemini: () => void;
  onUpdateFeedback?: (updated: TeacherFeedback) => void;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ 
  feedback: initialFeedback, 
  student, 
  transcription,
  rawTranscript,
  onReRunGemini,
  onUpdateFeedback
}) => {
  const [feedback, setFeedback] = useState<TeacherFeedback>(initialFeedback);
  const [activeTab, setActiveTab] = useState<'overview' | 'vocabulary' | 'grammar' | 'pronunciation' | 'homework' | 'lesson-notes'>('overview');
  
  // Lesson Notes States. The notes are no longer generated in-app: the tutor
  // copies a prompt out and pastes the resulting HTML back in.
  const [visualHtml, setVisualHtml] = useState<string>('');
  const [pastedNotesHtml, setPastedNotesHtml] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedNotesPrompt, setCopiedNotesPrompt] = useState<boolean>(false);
  
  // Voice Synthesis States
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [hoverSpeak, setHoverSpeak] = useState<boolean>(true);

  // Homework Drag-and-Drop or MCQ State
  const [activeHomeworkDay, setActiveHomeworkDay] = useState<number>(1);
  const [homeworkAnswers, setHomeworkAnswers] = useState<Record<number, string>>({});
  const [homeworkChecked, setHomeworkChecked] = useState<Record<number, boolean>>({});
  const [homeworkIsCorrect, setHomeworkIsCorrect] = useState<Record<number, boolean>>({});

  // Scenario Difficulty Sliders State (dictionary from scenario index to difficulty string)
  const [scenarioDifficulties, setScenarioDifficulties] = useState<Record<number, 'basic' | 'intermediate' | 'advanced'>>({
    0: 'basic',
    1: 'intermediate',
    2: 'advanced'
  });

  // Synonym slider values state (formality register level: 0 = casual, 1 = formal)
  const [synonymRegisters, setSynonymRegisters] = useState<Record<number, number>>({});

  // RuleBank inline editing states
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleContent, setEditingRuleContent] = useState<string>('');

  // Sync state if initialFeedback changes from parent
  useEffect(() => {
    setFeedback(initialFeedback);
    // Initialize synonym sliders to 0 (casual)
    if (initialFeedback.synonymSuggestions) {
      const initialRegisters: Record<number, number> = {};
      initialFeedback.synonymSuggestions.forEach((_, idx) => {
        initialRegisters[idx] = 1; // Default to formal (right)
      });
      setSynonymRegisters(initialRegisters);
    }
  }, [initialFeedback]);

  // Load Speech Voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Select a good default: Look for multilingual Ava, Google voices, or any English/L2 voice
        // `student.l2` can legitimately be empty (a profile with no target
        // language set), and `.substring` on undefined used to throw here and
        // take the whole report down with it.
        const l2Prefix = (student.l2 || '').substring(0, 2).toLowerCase();
        const defaultVoice = availableVoices.find(v =>
          v.name.includes('Ava') ||
          v.name.includes('Google US English') ||
          v.name.includes('Multilingual') ||
          (l2Prefix.length === 2 && v.lang.toLowerCase().startsWith(l2Prefix))
        );
        if (defaultVoice) {
          setSelectedVoice(defaultVoice.name);
        } else if (availableVoices.length > 0) {
          setSelectedVoice(availableVoices[0].name);
        }
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [student.l2]);

  // Read Aloud triggers
  const playSpeech = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop active voices
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      const voiceObj = voices.find(v => v.name === selectedVoice);
      if (voiceObj) {
        utterance.voice = voiceObj;
        utterance.lang = voiceObj.lang;
      }
    }
    window.speechSynthesis.speak(utterance);
  };

  const handleHoverSpeak = (text: string) => {
    if (hoverSpeak) {
      playSpeech(text);
    }
  };

  // Rule Bank Editing
  const handleStartEditRule = (ruleId: string, currentContent: string) => {
    setEditingRuleId(ruleId);
    setEditingRuleContent(currentContent);
  };

  const handleSaveRule = (ruleId: string) => {
    const nextRuleBank = feedback.grammarInsights.ruleBank.map(rule => {
      if (rule.id === ruleId) {
        return { ...rule, content: editingRuleContent };
      }
      return rule;
    });

    const updatedFeedback = {
      ...feedback,
      grammarInsights: {
        ...feedback.grammarInsights,
        ruleBank: nextRuleBank
      }
    };

    setFeedback(updatedFeedback);
    setEditingRuleId(null);
    if (onUpdateFeedback) {
      onUpdateFeedback(updatedFeedback);
    }
  };

  // Exporters trigger
  const dateStr = new Date().toISOString().split('T')[0];
  const filenamePrefix = `Tutorly_Insight_${student.name.replace(/\s+/g, '_')}_${dateStr}`;

  const triggerExportHtml = () => {
    // Inject dynamic Speech Synthesis and hover controls in exported HTML!
    const baseHtml = exportToHtml(feedback, student, dateStr);
    
    // Enrich with TTS voice drop-down, hover speakers and beautiful CSS!
    const enrichedHtml = baseHtml.replace(
      '</body>',
      `
      <div style="position: fixed; bottom: 20px; right: 20px; background: #ffffff; border: 1px solid #4F46E5; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-radius: 12px; padding: 15px; width: 280px; font-family: sans-serif; font-size: 12px; z-index: 9999;">
        <div style="font-weight: bold; color: #4F46E5; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
          <span>🔊 Tutorly Narrator Settings</span>
          <button onclick="window.speechSynthesis.cancel()" style="background: #F3F4F6; border: none; font-size: 9px; padding: 2px 6px; border-radius: 4px; cursor: pointer;">Stop</button>
        </div>
        <label style="display: block; font-weight: bold; margin-bottom: 4px;">Choose Speech Voice:</label>
        <select id="exportVoiceSelect" style="width: 100%; padding: 6px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 11px; margin-bottom: 8px; background: white;"></select>
        
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="exportHoverCheck" checked style="margin-right: 6px;"/>
          Hover over elements to Read Aloud!
        </label>
      </div>

      <script>
        // Populate browser-supported voices
        const voiceSelect = document.getElementById('exportVoiceSelect');
        const hoverCheck = document.getElementById('exportHoverCheck');
        let voices = [];

        function loadExportVoices() {
          voices = window.speechSynthesis.getVoices();
          voiceSelect.innerHTML = '';
          voices.forEach((v) => {
            const option = document.createElement('option');
            option.value = v.name;
            option.textContent = v.name + ' (' + v.lang + ')';
            if (v.name.includes('Ava') || v.name.includes('Google') || v.lang.startsWith('${student.l2.substring(0,2).toLowerCase()}')) {
              option.selected = true;
            }
            voiceSelect.appendChild(option);
          });
        }
        
        loadExportVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = loadExportVoices;
        }

        function speak(text) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          const selectedVoiceName = voiceSelect.value;
          const selectedVoice = voices.find(v => v.name === selectedVoiceName);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
          }
          window.speechSynthesis.speak(utterance);
        }

        // Attach speak handles on tags
        document.querySelectorAll('div, p, li, strong, td').forEach(el => {
          el.addEventListener('mouseenter', () => {
            if (hoverCheck.checked && el.innerText.trim().length > 10) {
              speak(el.innerText);
            }
          });
        });
      </script>
      </body>
      `
    );

    downloadTextFile(enrichedHtml, `${filenamePrefix}.html`, 'text/html');
  };

  const triggerExportText = () => {
    const text = exportToText(feedback, student, dateStr);
    downloadTextFile(text, `${filenamePrefix}.txt`);
  };

  const triggerExportDocx = () => {
    const blob = exportToDocx(feedback, student, dateStr);
    downloadBlob(blob, `${filenamePrefix}.docx`);
  };

  const triggerExportCsv = () => {
    const csv = exportToCsv(feedback);
    downloadTextFile(csv, `${filenamePrefix}_mistakes.csv`, 'text/csv');
  };

  // Checking Homework Quizzes answers inline
  const handleCheckHomework = (day: number, questionAnswer: string) => {
    const userAnswer = homeworkAnswers[day]?.trim().toLowerCase();
    const isCorrect = userAnswer === questionAnswer.trim().toLowerCase();
    
    setHomeworkChecked(prev => ({ ...prev, [day]: true }));
    setHomeworkIsCorrect(prev => ({ ...prev, [day]: isCorrect }));
  };

  // Color mapper for Grammar tags
  const getTagColor = (type: string) => {
    switch (type) {
      case 'article':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200';
      case 'preposition':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200';
      case 'subject-verb agreement':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200';
      case 'tense':
        return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200';
      case 'word choice':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200';
      case 'pronunciation':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-205';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Integrated Premium Toolbars */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md flex flex-wrap items-center justify-between gap-4 transition-colors">
        
        {/* Descriptive details */}
        <div>
          <span className="text-[10px] bg-indigo-50 text-indigo-650 dark:bg-indigo-950 dark:text-indigo-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
            Lesson Insights Active
          </span>
          <h2 className="text-lg font-black text-slate-800 dark:text-white mt-1 flex items-center">
            {student.name} <ChevronRight size={16} className="mx-1 text-slate-400" /> {student.l2} Insights
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            L1 native context: {student.nationality} ({student.l1}) | Target level: Upper Intermediate
          </p>
        </div>

        {/* Exporters and trigger triggers */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={triggerExportHtml}
            className="flex items-center px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            title="Export beautiful, smart web-page with interactive Speak-on-Hover narration built directly into the HTML!"
          >
            <Download size={14} className="mr-1.5" />
            Interactive HTML
          </button>

          <button
            onClick={triggerExportDocx}
            className="flex items-center px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-750 dark:text-slate-300 rounded-xl"
          >
            <FileText size={14} className="mr-1.5" />
            Word
          </button>

          <button
            onClick={triggerExportCsv}
            className="flex items-center px-3 py-2 text-xs font-semibold bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-750 dark:text-slate-305 rounded-xl text-center"
            title="Download CSV database of tagged grammar errors"
          >
            <FileSpreadsheet size={13} className="mr-1.2" />
            CSV Mistakes
          </button>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800"></div>

          <button 
            onClick={onReRunGemini}
            className="flex items-center px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
          >
            <RefreshCw size={14} className="mr-1.5" />
            Re-Analyze
          </button>

        </div>
      </div>

      {/* 2. Natural TTS Voice Selector controls */}
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-900/30 dark:to-indigo-950/10 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow shadow-indigo-500/20">
            <Volume2 size={16} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Multilingual Speech-to-Speech (TTS) Narrator</h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Hover over sections throughout the scorecard, or trigger mispronunciations, and the system reads correct phrasing out aloud!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle hover trigger */}
          <button
            onClick={() => {
              const nextState = !hoverSpeak;
              setHoverSpeak(nextState);
              playSpeech(nextState ? "Narrator trigger: Hover to read is now active." : "Narrator trigger: Hover speak is now disabled.");
            }}
            className="flex items-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-650 dark:text-slate-350 hover:bg-slate-50"
          >
            {hoverSpeak ? (
              <>
                <ToggleRight size={18} className="mr-1.5 text-emerald-500" />
                <span>Hover Speak: Active</span>
              </>
            ) : (
              <>
                <ToggleLeft size={18} className="mr-1.5 text-slate-400" />
                <span>Hover Speak: Off</span>
              </>
            )}
          </button>

          {/* Voice Select Dropdown */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-slate-400 uppercase font-black mr-1">Voice:</span>
            <select
              value={selectedVoice}
              onChange={(e) => {
                setSelectedVoice(e.target.value);
                // Trigger quick speech check
                setTimeout(() => playSpeech("Voice check."), 100);
              }}
              className="text-[11px] px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-slate-200 font-medium max-w-[200px]"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Navigation tabs */}
      <div className="flex overflow-x-auto space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 flex-nowrap scrollbar-none">
        {[
          { id: 'overview', label: '🏠 Overview & Topic Analytics' },
          { id: 'vocabulary', label: '📚 Vocabulary Dashboard' },
          { id: 'grammar', label: '📝 Grammar Insights' },
          { id: 'pronunciation', label: '🔊 Pronunciation Feedback' },
          { id: 'homework', label: '🎓 Self-Study Quizzes & Roleplays' },
          { id: 'lesson-notes', label: '📖 Visual Tutor Lessons' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              playSpeech(`Viewing ${tab.label.split(' ').slice(1).join(' ')}`);
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap border-b-2 flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-650 bg-indigo-50/20 dark:border-indigo-500 dark:text-indigo-400 dark:bg-indigo-950/20'
                : 'border-transparent text-slate-500 dark:text-slate-450 hover:text-slate-800 hover:border-slate-300 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Tab Context Body Content */}
      <div className="space-y-6">
        
        {/* TAB 1: OVERVIEW & TOPIC CLUSTERING */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            
            {/* Left and Middle Panel - Topics & Summaries */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* General Topic & Description */}
              <div 
                onMouseEnter={() => handleHoverSpeak(feedback.generalLessonTopic + ". " + feedback.keyTakeaways.wins.join(". "))}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-2xl p-6 shadow-sm space-y-4 cursor-pointer"
              >
                <div>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest block">Main Lecture Focus</span>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">
                    {feedback.generalLessonTopic}
                  </h3>
                </div>
                
                {/* Visual subtopic clustering timeline */}
                <div className="pt-2">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-3">Topic Flow & Subtopic Clustering</span>
                  <div className="relative border-l-2 border-indigo-150 dark:border-slate-800 pl-4 space-y-5">
                    {feedback.subtopicClustering.map((cluster, idx) => (
                      <div key={idx} className="relative">
                        {/* Bullet count */}
                        <span className="absolute -left-[24px] top-0.5 bg-indigo-600 dark:bg-indigo-500 rounded-full text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{cluster.title}</span>
                            <span className="font-mono text-[10px] bg-indigo-50 text-indigo-650 dark:bg-indigo-950 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                              🕒 {cluster.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                            {cluster.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Takeaways Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="border-b border-slate-100 dark:border-slate-850 pb-2.5">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">General Session Evaluation Summary</h4>
                  <p className="text-[10px] text-slate-400 uppercase">Major Wins & Areas for Focus</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Wins */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <span className="bg-emerald-100 dark:bg-emerald-950/40 p-1 rounded-full">✓</span>
                      <span>Student Wins & Progress</span>
                    </div>
                    <ul className="space-y-2">
                      {feedback.keyTakeaways.wins.map((win, idx) => (
                        <li key={idx} className="text-xs text-slate-650 dark:text-slate-350 pr-2 leading-relaxed">
                          • {win}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Future Focus */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-1.5 text-amber-500 font-bold text-xs">
                      <span className="bg-amber-100 p-1 rounded-full text-amber-500">!</span>
                      <span>Target Focus Guidelines</span>
                    </div>
                    <ul className="space-y-2">
                      {feedback.keyTakeaways.futureFocus.map((focus, idx) => (
                        <li key={idx} className="text-xs text-slate-650 dark:text-slate-350 pr-2 leading-relaxed">
                          • {focus}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Panel - Rubric Scorecard */}
            <div className="lg:col-span-1">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center space-x-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
                  <Award className="text-indigo-650 dark:text-indigo-400" size={16} />
                  <span className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Lesson Scorecard Rubrics</span>
                </div>

                <div className="space-y-3.5">
                  {[
                    { label: '🗣️ Fluency & Flow', data: feedback.speakingMetrics.turnTakingFairnessScore / 20 }, // rough score derived
                    { label: '🎯 Accuracy & Lexis', data: 4.2 },
                    { label: '📚 Vocab Extension', data: 3.8 },
                    { label: '🔉 Pronunciation', data: 4.5 }
                  ].map((rubric, index) => {
                    const mappedScore = rubric.data;
                    const pct = (mappedScore / 5) * 100;
                    return (
                      <div key={index} className="space-y-1 bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-150 dark:border-slate-850">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300">{rubric.label}</span>
                          <span className="text-indigo-650 dark:text-indigo-400 font-bold">{mappedScore.toFixed(1)} / 5</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: VOCABULARY DASHBOARD */}
        {activeTab === 'vocabulary' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Counter 1 */}
              <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Total Words Spoken</span>
                  <div className="text-2xl font-black text-slate-800 dark:text-white font-mono mt-0.5">
                    {feedback.vocabulary.totalWords}
                  </div>
                </div>
                <div className="text-slate-300 text-3xl font-bold font-mono">#</div>
              </div>

              {/* Counter 2 */}
              <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">New Vocabulary Words</span>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                    {feedback.vocabulary.newWordsCount}
                  </div>
                </div>
                <div className="text-indigo-200 text-3xl font-bold font-mono">+</div>
              </div>

              {/* Counter 3: CEFR badge + Target level recommendation */}
              <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Active CEFR Assessment</span>
                  <div className="text-2xl font-black text-emerald-500 font-mono mt-0.5">
                    {feedback.cefrLevel.level}
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-bold uppercase">
                  standardized
                </span>
              </div>
            </div>

            {/* CEFR and level target tracker */}
            <div className="bg-emerald-50/10 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/35 p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-widest flex items-center">
                <GraduationCap size={16} className="mr-2" /> Target level projection & vocabulary gaps
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {feedback.cefrLevel.targetLevelProjection}
              </p>
              {feedback.cefrLevel.missingWordsList && feedback.cefrLevel.missingWordsList.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Recommended target words:</span>
                  {feedback.cefrLevel.missingWordsList.map((word, idx) => (
                    <span 
                      key={idx} 
                      onClick={() => playSpeech(word)}
                      className="text-xs font-semibold px-2.5 py-1 bg-white dark:bg-slate-900 text-slate-755 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-emerald-500 hover:text-emerald-500 cursor-pointer transition-all"
                    >
                      {word} 🔉
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Active vs Passive Vocabulary lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Passive Vocabulary  */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="border-b border-slate-105 dark:border-slate-850 pb-2 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Passive Vocabulary</h4>
                    <p className="text-[9px] text-slate-400">Words the learner understood from context but did not produce</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold">receptive</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {feedback.vocabulary.passiveVocab.map((word, idx) => (
                    <span 
                      key={idx} 
                      onClick={() => playSpeech(word)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-150 dark:border-slate-850 text-xs font-semibold hover:bg-indigo-50/30 cursor-pointer hover:border-indigo-500"
                    >
                      {word} 🔉
                    </span>
                  ))}
                </div>
              </div>

              {/* Active Vocabulary */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="border-b border-slate-105 dark:border-slate-850 pb-2 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase">Active Vocabulary</h4>
                    <p className="text-[9px] text-slate-400">Complex terminology the learner correctly produced</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded font-semibold">productive</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {feedback.vocabulary.activeVocab.map((word, idx) => (
                    <span 
                      key={idx} 
                      onClick={() => playSpeech(word)}
                      className="px-3 py-1.5 bg-indigo-50/20 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-xs font-semibold hover:bg-white cursor-pointer hover:border-emerald-500"
                    >
                      {word} 🔉
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Overused Word Tracker & Word Family Expansion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Overused word tracker */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-850 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Overused Word Tracker (&gt;3x frequency)</h4>
                  <p className="text-[9px] text-slate-405">Redundancy checks with recommended stylistic substitutions</p>
                </div>

                <div className="space-y-3">
                  {feedback.vocabulary.overusedWords.length === 0 ? (
                    <p className="text-xs text-slate-404 italic">No overused terms flagged this session! Great sentence variety.</p>
                  ) : (
                    feedback.vocabulary.overusedWords.map((item, index) => (
                      <div key={index} className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-3 rounded-xl flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-150">
                              "{item.word}"
                            </span>
                            <span className="text-[10px] text-slate-400">Used: {item.count} times</span>
                          </div>
                          
                          <div className="mt-2 text-[10px] text-slate-404">Alternatives to expand variety:</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.alternatives.map((alt, ai) => (
                              <span 
                                key={ai} 
                                onClick={() => playSpeech(alt)}
                                className="text-[10px] font-bold bg-white text-emerald-600 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer hover:border-emerald-500"
                              >
                                {alt}
                              </span>
                            ))}
                          </div>
                        </div>
                        <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={14} />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Word family expansion */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-850 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Word Family Expansion</h4>
                  <p className="text-[9px] text-slate-405">Building lexical breadth by deriving word forms from a key base term</p>
                </div>

                <div className="space-y-3">
                  {feedback.vocabulary.wordFamilyExpansion.map((item, index) => (
                    <div key={index} className="bg-indigo-50/20 dark:bg-indigo-950/15 border border-indigo-100/50 dark:border-indigo-900/30 p-3.5 rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-indigo-750 dark:text-indigo-300">Base word: "{item.base}"</span>
                        <button 
                          onClick={() => playSpeech(item.base)}
                          className="text-[10px] bg-white px-1.5 py-0.5 border text-slate-500 rounded"
                        >
                          🔊 Pronounce Base
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                        {item.family.map((fam, fi) => (
                          <div 
                            key={fi} 
                            onClick={() => playSpeech(fam)}
                            className="bg-white dark:bg-slate-900 border border-slate-200/55 dark:border-slate-800 hover:border-indigo-500 cursor-pointer p-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-350 shadow-sm"
                          >
                            <span className="block truncate">{fam}</span>
                            <span className="text-[8px] text-indigo-400 block mt-0.5">deriv. 🔉</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* False friends Warnings */}
            {student.addL1Translations && feedback.vocabulary.falseFriends && feedback.vocabulary.falseFriends.length > 0 && (
              <div className="bg-amber-50/10 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 p-5 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-450 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle size={16} />
                  <span>Interactive L1 False Friend Alerts</span>
                </div>
                
                <div className="grid grid-cols-1 gap-3.5">
                  {feedback.vocabulary.falseFriends.map((ff, index) => (
                    <div key={index} className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200/40 dark:border-slate-850 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center space-x-2 text-xs">
                          <strong className="text-amber-700 dark:text-amber-450 font-black">"{ff.word}"</strong>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500">Looks like student's L1 ({student.l1})</span>
                        </div>
                        <p className="text-slate-650 dark:text-slate-400 mt-2 leading-relaxed">
                          ⚠️ <span className="font-semibold text-slate-700 dark:text-slate-300">{ff.warning}</span>
                        </p>
                      </div>

                      <div className="flex flex-col gap-1 flex-shrink-0 text-[10px] bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border">
                        <div>
                          <span className="text-slate-450 font-semibold block uppercase">Student L1 Meaning:</span>
                          <span className="font-bold text-red-500">"{ff.l1Meaning}"</span>
                        </div>
                        <div className="border-t pt-1 mt-1">
                          <span className="text-slate-455 font-semibold block uppercase">Actual L2 Correct Meaning:</span>
                          <span className="font-bold text-emerald-500">"{ff.actualMeaning}"</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phrasal verbs / Idioms metrics dashboard */}
            <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="border-b pb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Phrasal Verbs & Idioms attempts statistics</h4>
                  <p className="text-[9px] text-slate-405">Counts attempted vs used perfectly in live conversation</p>
                </div>
                <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">
                  Score: {feedback.advancedVocab.idiomsPhrasalDashboard.usedCorrectly} / {feedback.advancedVocab.idiomsPhrasalDashboard.attempted} Correct
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-105">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block h-4">Attempted Phrases</span>
                  <span className="text-3xl font-black text-slate-700 dark:text-slate-200 block mt-1 font-mono">
                    {feedback.advancedVocab.idiomsPhrasalDashboard.attempted}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-105">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block h-4">Used Correctly</span>
                  <span className="text-3xl font-black text-emerald-500 block mt-1 font-mono">
                    {feedback.advancedVocab.idiomsPhrasalDashboard.usedCorrectly}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-105">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block h-4">Success Ratio</span>
                  <span className="text-3xl font-black text-indigo-650 dark:text-indigo-400 block mt-1 font-mono">
                    {feedback.advancedVocab.idiomsPhrasalDashboard.attempted > 0 
                      ? Math.round((feedback.advancedVocab.idiomsPhrasalDashboard.usedCorrectly / feedback.advancedVocab.idiomsPhrasalDashboard.attempted) * 100)
                      : 0}%
                  </span>
                </div>
              </div>

              {/* Idiomatic Table list */}
              <div className="overflow-hidden border border-slate-150 dark:border-slate-850 rounded-xl">
                <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-850 text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 uppercase text-[10px] text-slate-450 font-bold">
                    <tr>
                      <th className="px-4 py-2.5">Idiomatic Phrase / Phrasal</th>
                      <th className="px-4 py-2.5">Pragmatic Definition</th>
                      <th className="px-4 py-2.5 text-center">Observed Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850 bg-white dark:bg-slate-900">
                    {feedback.advancedVocab.idiomsPhrasalDashboard.list.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-indigo-650 dark:text-indigo-300 font-mono">
                          {item.idiom}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">
                          {item.definition}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                            item.status === 'correct' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                            item.status === 'attempted' ? 'bg-amber-50 text-amber-500 border border-amber-200' :
                            'bg-indigo-50 text-indigo-600 border border-indigo-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Formality level register slider */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="border-b pb-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Register & Stylistics Formality Swinger</h4>
                <p className="text-[9px] text-slate-405">Slide between informal and formal alternatives of actual learner speech</p>
              </div>

              <div className="space-y-4">
                {feedback.synonymSuggestions.map((item, idx) => {
                  const registerVal = synonymRegisters[idx] ?? 1; // Default to Formal
                  return (
                    <div key={idx} className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-201 dark:border-slate-850 p-4 rounded-xl space-y-3.5">
                      <div className="text-[11px] text-slate-450 uppercase font-black">
                        Learner actually said: 
                        <span className="font-mono text-xs text-slate-705 dark:text-slate-300 block bg-white dark:bg-slate-900 p-2.5 rounded mt-1 border">
                          "{item.studentSpoke}"
                        </span>
                      </div>

                      {/* Interactive slide switch */}
                      <div className="flex items-center justify-between gap-4 pt-1">
                        <span className={`text-[10px] font-extrabold tracking-wide uppercase ${registerVal === 0 ? 'text-indigo-650 font-black' : 'text-slate-400'}`}>
                          💬 Conversational / Casual
                        </span>
                        
                        <div className="flex-1 max-w-[120px] flex items-center justify-center">
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="1"
                            value={registerVal}
                            onChange={(e) => setSynonymRegisters(prev => ({ ...prev, [idx]: parseInt(e.target.value, 10) }))}
                            className="w-full accent-indigo-655 h-1 px-1 rounded bg-slate-200 cursor-pointer"
                          />
                        </div>

                        <span className={`text-[10px] font-extrabold tracking-wide uppercase ${registerVal === 1 ? 'text-indigo-655 font-black' : 'text-slate-400'}`}>
                          👔 Formal Registry
                        </span>
                      </div>

                      {/* Active displayed option */}
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border shadow-inner">
                        <div className="text-[9px] font-black uppercase text-indigo-400">
                          {registerVal === 1 ? '👔 Formal Selection:' : '💬 Conversational Selection:'}
                        </div>
                        <p className="text-xs font-black text-slate-800 dark:text-white mt-1">
                          "{registerVal === 1 ? item.formalVersion : item.casualVersion}"
                        </p>
                        <p className="text-[10px] text-slate-404 mt-1 leading-normal">
                          {item.note}
                        </p>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: GRAMMAR INSIGHTS */}
        {activeTab === 'grammar' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Grammar Metrics Row: Error persistence meter */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="border-b pb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase">Error Persistence Meter</h4>
                  <p className="text-[9px] text-slate-405">Highlights mistakes of the same syntactic category appearing repeatedly</p>
                </div>
                <span className="text-[10px] bg-red-50 text-red-650 px-2 py-0.5 rounded font-bold uppercase border">
                  Frequency Check
                </span>
              </div>

              {/* Persistence metric bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feedback.grammarInsights.mistakes.map((mk) => (
                  <div key={mk.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider block">Mistake category Persistence:</span>
                      <span className="font-bold text-xs text-slate-800 dark:text-white capitalize">{mk.type}</span>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-red-500 h-full rounded-full" 
                          style={{ width: `${Math.min(100, (mk.persistenceCount / 4) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-red-500 font-mono block">{mk.persistenceCount}x</span>
                      <span className="text-[8px] text-slate-400 uppercase">Repeated</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grammar lists and corrections */}
            <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="border-b pb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Syntactic Grammatical Mistakes tagged</h4>
                  <p className="text-[9px] text-slate-405">Deep linguistic logs of mistakes with edit overrides allowed</p>
                </div>
              </div>

              <div className="space-y-4">
                {feedback.grammarInsights.mistakes.map((mistake, mi) => (
                  <div 
                    key={mistake.id}
                    className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-850 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase border tracking-wider ${getTagColor(mistake.type)}`}>
                          {mistake.type}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Time: {mistake.timestamp}</span>
                      </div>
                      
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wide">
                        Linked Rule: {mistake.ruleId}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Observed */}
                      <div className="p-2.5 bg-red-50/20 dark:bg-red-950/10 border border-red-100 rounded">
                        <span className="text-[9px] font-black uppercase text-red-500">Observed Flawed Speech:</span>
                        <p className="text-xs font-bold text-red-700 dark:text-red-300 italic line-through mt-0.5">
                          "{mistake.error}"
                        </p>
                      </div>

                      {/* Corrected */}
                      <div className="p-2.5 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100 rounded">
                        <span className="text-[9px] font-black uppercase text-emerald-500 font-bold">Suggested accurate construction:</span>
                        <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 mt-0.5">
                          "{mistake.correction}"
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-650 dark:text-slate-400 leading-normal font-medium bg-white dark:bg-slate-900 border p-2 rounded">
                      <span className="font-extrabold text-indigo-600 block text-[9.5px] uppercase tracking-wider mb-1">Teacher-Editable pedagogical explanation:</span>
                      <textarea
                        rows={2}
                        value={mistake.explanation}
                        onChange={(e) => {
                          const nextMistakes = feedback.grammarInsights.mistakes.map((mk) => {
                            if (mk.id === mistake.id) {
                              return { ...mk, explanation: e.target.value };
                            }
                            return mk;
                          });
                          const nextF = { ...feedback, grammarInsights: { ...feedback.grammarInsights, mistakes: nextMistakes } };
                          setFeedback(nextF);
                          if (onUpdateFeedback) onUpdateFeedback(nextF);
                        }}
                        className="w-full text-xs font-medium dark:bg-slate-950 border-0 p-0 focus:ring-0 focus:outline-none focus:ring-indigo-500 text-slate-600 dark:text-slate-350"
                      />
                    </p>

                  </div>
                ))}
              </div>
            </div>

            {/* Grammar Rule Bank index cards */}
            <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="border-b pb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase font-black">Teacher-Editable Grammar Rule Bank Card</h4>
                  <p className="text-[9px] text-slate-405">Detailed printable rule summary cards teachers can modify on the fly</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feedback.grammarInsights.ruleBank.map((rule) => {
                  const isEditing = editingRuleId === rule.id;
                  return (
                    <div 
                      key={rule.id} 
                      className="bg-indigo-50/20 dark:bg-indigo-950/15 border border-indigo-205 dark:border-indigo-900/35 p-4 rounded-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-indigo-750 dark:text-indigo-300 font-bold uppercase">{rule.title}</span>
                          <span className="text-[9px] font-mono text-slate-400">ID: {rule.id}</span>
                        </div>
                        
                        {isEditing ? (
                          <textarea 
                            rows={3}
                            value={editingRuleContent}
                            onChange={(e) => setEditingRuleContent(e.target.value)}
                            className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-indigo-300 rounded focus:outline-none"
                          />
                        ) : (
                          <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded border border-indigo-50">
                            {rule.content}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end pt-3 text-xs">
                        {isEditing ? (
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => setEditingRuleId(null)}
                              className="px-2.5 py-1 bg-slate-200 text-slate-600 rounded font-bold"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleSaveRule(rule.id)}
                              className="px-2.5 py-1 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                            >
                              Save Rule
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleStartEditRule(rule.id, rule.content)}
                            className="text-[11px] text-indigo-650 dark:text-indigo-400 hover:underline flex items-center font-bold"
                          >
                            <Edit3 size={11} className="mr-0.5" /> Modify Card Content
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Positive reinforcement structure wins */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="border-b pb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-805 dark:text-white uppercase font-black">Positive Reinforcement (Grammar Accomplishments)</h4>
                  <p className="text-[9px] text-slate-405">Specific instances where learner correctly applied advanced tenses/conjugations</p>
                </div>
              </div>

              <div className="space-y-2">
                {feedback.grammarInsights.positiveReinforcement.map((pr, idx) => (
                  <div key={idx} className="p-3 bg-emerald-50/20 dark:bg-emerald-950/20 border border-emerald-150 rounded-lg flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-300 leading-normal">
                    <span className="text-emerald-500 font-black">✓</span>
                    <span>{pr}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: PRONUNCIATION WORKSPACE */}
        {activeTab === 'pronunciation' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
            
            <div className="border-b pb-2">
              <h4 className="text-xs font-bold text-slate-808 dark:text-white uppercase font-black">Phonetic Guidance & Accent Heatmap</h4>
              <p className="text-[9px] text-slate-405">Highlighted speech segments with detected phonal flaws paired with correct auditory target reference spelling</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedback.pronunciationFeedback.map((item, index) => (
                <div 
                  key={index}
                  className="bg-slate-50 dark:bg-slate-950/50 p-4 border rounded-xl flex flex-col justify-between space-y-3 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-slate-800 dark:text-white font-mono">{item.word}</span>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-405 px-1.5 py-0.5 rounded font-mono">
                        {item.phoneticGuidance}
                      </span>
                    </div>
                    
                    <span className="text-[9.5px] bg-red-50 text-red-500 border px-2 py-0.5 rounded font-bold uppercase">
                      🕒 Segment {item.timestamp}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-503 dark:text-slate-403 leading-relaxed italic">
                    Word targeted due to L1 {student.nationality} accent influence guidelines.
                  </p>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => playSpeech(item.word)}
                      className="flex-1 flex items-center justify-center p-2 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-center rounded-lg"
                      title="Read item with selected voice"
                    >
                      <Volume2 size={13} className="mr-1.5 animate-pulse" /> Read Aloud Correct L2 model
                    </button>
                  </div>

                </div>
              ))}
            </div>

            {/* Custom browser natural multilingual warning */}
            <div className="bg-indigo-50/40 dark:bg-indigo-950/15 p-4 rounded-xl border border-indigo-100 flex items-start space-x-3 text-xs text-indigo-750 dark:text-indigo-430 leading-relaxed">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold block mb-0.5">Classroom tip on Read Aloud:</span>
                Toggle the Speech drop-down select option at the top of the report to hear target word pronunciations voiced in native accents via your system browser's Speech API. Works great with Microsoft multilingual or Google voices!
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: PREPLY SELF-STUDY HOMEWORK */}
        {activeTab === 'homework' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Calendar list Day 1 to Day 7 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-md space-y-4">
              <div className="border-b pb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase font-black">Tailored Bite-Sized Homework (Daily Exercises)</h4>
                  <p className="text-[9px] text-slate-405">Generated instantly from mistakes identified during lesson. Tracks 7 interactive days.</p>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold uppercase border">
                  7-Day Calendar
                </span>
              </div>

              {/* Day selectors */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
                {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
                  const isActive = activeHomeworkDay === day;
                  const isAnsChecked = homeworkChecked[day];
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        setActiveHomeworkDay(day);
                        playSpeech(`Day ${day} Exercises.`);
                      }}
                      className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all border flex-shrink-0 flex items-center space-x-1 ${
                        isActive 
                          ? 'bg-indigo-655 text-white bg-indigo-600 shadow-lg border-indigo-600' 
                          : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-205 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800'
                      }`}
                    >
                      <Calendar size={12} className="mr-1" />
                      <span>Day {day}</span>
                      {isAnsChecked && <Check size={11} className="text-emerald-500 font-extrabold ml-1.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Current Day Task quiz card */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-201 dark:border-slate-850 p-5 rounded-2xl space-y-4">
                {(() => {
                  const exercise = feedback.connectedFeatures.dailyExercises.find(ex => ex.day === activeHomeworkDay) 
                    || feedback.connectedFeatures.dailyExercises[0];
                  
                  if (!exercise) return <p className="text-xs italic text-slate-400">Loading exercise details...</p>;
                  
                  const isChecked = homeworkChecked[activeHomeworkDay];
                  const isCorr = homeworkIsCorrect[activeHomeworkDay];
                  
                  return (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div>
                        <span className="text-[9.5px] font-black uppercase text-indigo-600 tracking-widest block">
                          Day {activeHomeworkDay} Activity • Type: {exercise.type.toUpperCase()}
                        </span>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1 leading-normal">
                          {exercise.question}
                        </h4>
                      </div>

                      {/* Interface according to type */}
                      {exercise.type === 'multiple-choice' && exercise.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {exercise.options.map((opt, oi) => {
                            const isSelect = homeworkAnswers[activeHomeworkDay] === opt;
                            return (
                              <button
                                key={oi}
                                disabled={isChecked}
                                onClick={() => setHomeworkAnswers(p => ({ ...p, [activeHomeworkDay]: opt }))}
                                className={`text-xs text-left p-2.5 rounded-xl border transition-all ${
                                  isSelect 
                                    ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-650' 
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-205'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {exercise.type === 'fill-blank' && (
                        <div className="flex items-center space-x-2">
                          <input 
                            type="text"
                            placeholder="Type your answer here..."
                            disabled={isChecked}
                            value={homeworkAnswers[activeHomeworkDay] || ''}
                            onChange={(e) => setHomeworkAnswers(p => ({ ...p, [activeHomeworkDay]: e.target.value }))}
                            className="w-full text-xs p-2.5 bg-white border border-slate-204 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-550"
                          />
                        </div>
                      )}

                      {exercise.type === 'drag-drop' && exercise.options && (
                        <div className="space-y-2">
                          <span className="text-[9px] text-slate-401 uppercase font-bold tracking-wider">Drag/click a token to fill blank:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {exercise.options.map((opt, oi) => {
                              const isSelect = homeworkAnswers[activeHomeworkDay] === opt;
                              return (
                                <button
                                  key={oi}
                                  disabled={isChecked}
                                  onClick={() => setHomeworkAnswers(p => ({ ...p, [activeHomeworkDay]: opt }))}
                                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                    isSelect 
                                      ? 'bg-indigo-600 text-white font-bold border-indigo-600 shadow'
                                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Display checked status feedback with clean animations */}
                      {isChecked ? (
                        <div className="p-3.5 rounded-xl border flex gap-3 text-xs leading-normal animate-in zoom-in-95 duration-250">
                          {isCorr ? (
                            <div className="text-emerald-700 bg-emerald-50 border-emerald-150 flex items-start gap-2">
                              <CheckCircle className="flex-shrink-0 mt-0.5 text-emerald-500" size={16} />
                              <div>
                                <strong className="block mb-0.5">🤩 Brilliant! Correct Answer!</strong>
                                {exercise.explanation}
                              </div>
                            </div>
                          ) : (
                            <div className="text-red-700 bg-red-50 border-red-150 flex items-start gap-2">
                              <AlertCircle className="flex-shrink-0 mt-0.5 text-red-500" size={16} />
                              <div>
                                <strong className="block mb-0.5">❌ Incorrect attempt! Keep practicing.</strong>
                                <span className="block mt-1 font-semibold text-slate-700">Correct solution was: "{exercise.correctAnswer}"</span>
                                <span className="block mt-0.5">{exercise.explanation}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button 
                            disabled={!homeworkAnswers[activeHomeworkDay]}
                            onClick={() => handleCheckHomework(activeHomeworkDay, exercise.correctAnswer)}
                            className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-750 disabled:opacity-40"
                          >
                            Check Answer
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })()}

              </div>
            </div>

            {/* Scenario Practice Slider with basic/intermediate/advanced */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-md space-y-4">
              <div className="border-b pb-2">
                <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase font-black">Scenario Roleplay & Task Challenges</h4>
                <p className="text-[9px] text-slate-405">Tutor-assigned prompt cards focusing on real world communication with interactive difficulty adjustments</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {feedback.connectedFeatures.scenarios.map((sc, index) => {
                  const currentDiff = scenarioDifficulties[index] || 'basic';
                  
                  // Extract active card text based on the active difficulty level of this card
                  const cardDetails = sc[currentDiff] || sc.basic;
                  
                  return (
                    <div 
                      key={index}
                      className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-850 rounded-2xl flex flex-col justify-between space-y-4 cursor-pointer"
                    >
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-indigo-600 block">Scenario Case {index + 1}</span>
                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-white mt-1 h-10 overflow-hidden leading-normal">
                          {sc.title}
                        </h4>

                        {/* Interactive difficulty selector swing buttons */}
                        <div className="my-3.5 flex items-center justify-between p-1 bg-white dark:bg-slate-900 rounded-lg border text-[9px] font-bold">
                          {[
                            { code: 'basic', label: 'Basic' },
                            { code: 'intermediate', label: 'Medium' },
                            { code: 'advanced', label: 'Pro' }
                          ].map((dif) => {
                            const isAct = currentDiff === dif.code;
                            return (
                              <button
                                key={dif.code}
                                onClick={() => {
                                  setScenarioDifficulties(p => ({ ...p, [index]: dif.code as any }));
                                  playSpeech(`Slide scenario ${index + 1} trigger: ${dif.label}`);
                                }}
                                className={`flex-1 py-1 rounded text-center transition-all ${
                                  isAct 
                                    ? 'bg-indigo-600 text-white font-extrabold' 
                                    : 'text-slate-400 hover:text-slate-800'
                                }`}
                              >
                                {dif.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Dynamic changed description text */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border min-h-[90px] flex flex-col justify-between">
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                            {cardDetails.description}
                          </p>
                        </div>
                      </div>

                      {/* Trigger list of bullet objectives */}
                      <div className="pt-2 border-t border-slate-150 dark:border-slate-800 space-y-1.5">
                        <span className="text-[8.5px] uppercase text-slate-400 font-extrabold block">Communication Objectives:</span>
                        <ul className="space-y-1">
                          {cardDetails.tasks.map((task, ti) => (
                            <li key={ti} className="text-[10px] text-slate-600 dark:text-slate-350 flex items-start gap-1 leading-normal">
                              <span className="text-indigo-500 font-bold">•</span>
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: VISUAL TUTOR LESSON NOTES & MATERIALS */}
        {activeTab === 'lesson-notes' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Context Info Banner */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-slate-500/0 dark:from-indigo-950/40 dark:via-purple-950/20 border border-indigo-150 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex items-start space-x-4">
              <span className="text-2xl p-2 bg-indigo-500/10 rounded-xl text-indigo-500">🎓</span>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-805 dark:text-white uppercase font-black">Tutor Material & Interactive Lesson Forge</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Generate classroom resources built exclusively from what {student.tutorName || 'Sarah'} taught. These tools extract tutor audio cues, vocabulary items, and instructional context to forge immersive, interactive HTML5 notes and detailed AI lessons.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Left 2 Columns: Tutor Spoken Transcript Evidence Stream */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-inner space-y-4">
                  <div className="border-b pb-2 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-white uppercase font-black">Class Transcript (Evidence)</h5>
                      <span className="text-[10px] text-slate-405 font-medium block mt-0.5">The raw transcript this report was built from</span>
                    </div>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold font-mono">
                      {(rawTranscript || '').split(/\n+/).filter(Boolean).length || 0} Lines
                    </span>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-indigo-100">
                    {(() => {
                      const tutorName = student.tutorName || 'Sarah';
                      const studentName = student.name || 'Student';

                      // The report is produced from the pasted transcript, so
                      // that text IS the evidence — there are no analysed
                      // segments to show. Fall back to any segments that were
                      // supplied (e.g. by an older saved report).
                      const transcriptText = (rawTranscript || '').trim();
                      // Normalise both sources to the same shape so one renderer
                      // can display either the pasted transcript or, for an
                      // older saved report, its analysed segments.
                      const tutorTurnsList: { speaker: string; timestamp: string; content: string }[] =
                        transcriptText
                          ? transcriptText.split(/\n+/).filter(Boolean).map((line) => {
                              // Pull apart the common "[00:12] Name: text" shape when
                              // it is present; otherwise show the line as one turn.
                              const m = line.match(/^\s*\[?([\d:.-]+)?\]?\s*([^:]{1,40}):\s*([\s\S]+)$/);
                              if (m && m[3]) {
                                return {
                                  timestamp: m[1] || '',
                                  speaker: m[2].trim(),
                                  content: m[3].trim(),
                                };
                              }
                              return { speaker: 'Transcript', timestamp: '', content: line.trim() };
                            })
                          : (transcription?.segments || [])
                              .filter(s =>
                                s.speaker.toLowerCase() === tutorName.toLowerCase() ||
                                s.speaker.toLowerCase() !== studentName.toLowerCase()
                              )
                              .map(s => ({ speaker: s.speaker, timestamp: s.timestamp, content: s.content }));

                      if (tutorTurnsList.length === 0) {
                        return (
                          <div className="py-12 text-center text-xs text-slate-400">
                            No transcript text was attached to this report.
                          </div>
                        );
                      }

                      return tutorTurnsList.map((segment, index) => (
                        <div 
                          key={index} 
                          className="p-3 bg-white dark:bg-slate-900 border rounded-xl hover:border-indigo-100 transition-colors cursor-pointer text-xs"
                          onClick={() => playSpeech(segment.content)}
                        >
                          <div className="flex items-center justify-between mb-1.5 font-bold">
                            <span className="text-indigo-650 dark:text-indigo-400">{segment.speaker}</span>
                            {segment.timestamp && (
                              <span className="text-[9.5px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                                🕒 {segment.timestamp}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 dark:text-slate-350 italic leading-relaxed text-[11px]">
                            “{segment.content}”
                          </p>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Right 3 Columns: Action Cabinet */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Method A: Copy the HTML5 notes prompt (external AI) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-start space-x-3.5">
                    <span className="text-xl p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">✨</span>
                    <div className="space-y-0.5">
                      <h5 className="text-xs font-black text-slate-808 dark:text-white uppercase font-black">Copy Interactive HTML5 Lesson Prompt</h5>
                      <p className="text-[11px] text-slate-505 dark:text-slate-405 leading-relaxed">
                        Copies a prompt that makes an external AI build self-contained, styled lesson cards
                        with Check-Your-Understanding questions, visual boards, tables and rules — complete
                        with inline feedback scripts. Paste the returned HTML into the box below.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={async () => {
                        const textData = rawTranscript || '';
                        try {
                          await navigator.clipboard.writeText(buildLessonNotesPrompt(student, textData));
                          setCopiedNotesPrompt(true);
                          playSpeech("Interactive lesson prompt copied to clipboard.");
                          setTimeout(() => setCopiedNotesPrompt(false), 3000);
                        } catch {
                          setGenerationError('Could not reach the clipboard. Copy the prompt manually.');
                        }
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/10 cursor-pointer"
                    >
                      {copiedNotesPrompt ? (
                        <>
                          <Check size={13} className="mr-1.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} className="mr-1.5" />
                          <span>Copy HTML5 Lesson Prompt</span>
                        </>
                      )}
                    </button>

                    {visualHtml && (
                      <button
                        onClick={() => {
                          setVisualHtml('');
                          setGenerationError(null);
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 border border-slate-202 text-slate-500 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                      >
                        Reset Module
                      </button>
                    )}
                  </div>

                  {/* Paste the HTML the external AI returned */}
                  <div className="pt-1 space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Paste the AI's HTML lesson back here
                    </label>
                    <textarea
                      value={pastedNotesHtml}
                      onChange={(e) => setPastedNotesHtml(e.target.value)}
                      rows={4}
                      placeholder="<div>… the interactive lesson the AI generated …</div>"
                      className="w-full text-[11px] p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-slate-100 font-mono leading-relaxed"
                    />
                    <button
                      onClick={() => {
                        const raw = pastedNotesHtml.trim();
                        if (!raw) {
                          setGenerationError('Paste the HTML the AI returned first.');
                          return;
                        }
                        // Strip markdown fences the model may have added anyway.
                        const fence = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
                        const html = (fence && fence[1] ? fence[1] : raw).trim();
                        if (!/<[a-z][\s\S]*>/i.test(html)) {
                          setGenerationError('That does not look like HTML. Paste the AI\'s raw HTML output.');
                          return;
                        }
                        setGenerationError(null);
                        setVisualHtml(html);
                        playSpeech("Interactive lesson loaded into the sandbox preview.");
                      }}
                      disabled={!pastedNotesHtml.trim()}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
                    >
                      <FileText size={13} className="mr-1.5" />
                      <span>Render Lesson in Sandbox</span>
                    </button>
                  </div>

                  {generationError && (
                    <div className="p-3.5 bg-red-50 text-red-600 rounded-xl border border-red-150 text-xs flex items-center space-x-2">
                      <AlertCircle size={15} />
                      <span>{generationError}</span>
                    </div>
                  )}
                </div>

                {/* Method B: Prompt Clipboard copyable */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-start space-x-3.5">
                    <span className="text-xl p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">📋</span>
                    <div className="space-y-0.5">
                      <h5 className="text-xs font-black text-slate-808 dark:text-white uppercase font-black">Copy Universal Premium HTML Lesson Prompt</h5>
                      <p className="text-[11px] text-slate-505 dark:text-slate-405 leading-relaxed">
                        The same prompt with a stronger emphasis on Read-Aloud selectors and simulated
                        speech-practice sensors, for bots like GPT-4o, Claude or Gemini Advanced.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        const textData = rawTranscript || '';
                        const completePrompt = buildLessonNotesPrompt(student, textData);
                        try {
                          await navigator.clipboard.writeText(completePrompt);
                          setCopiedPrompt(true);
                          playSpeech("Immersive lesson prompt successfully copied to clipboard!");
                          setTimeout(() => setCopiedPrompt(false), 3000);
                        } catch {
                          setGenerationError('Could not reach the clipboard. Copy the prompt manually.');
                        }
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
                    >
                      {copiedPrompt ? (
                        <>
                          <Check size={13} className="mr-1.5" />
                          <span>Copied Prompt to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <FileText size={13} className="mr-1.5" />
                          <span>Copy Contextual Lesson Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* Sandbox Live Viewer Frame */}
            {visualHtml && (
              <div className="border border-indigo-250 dark:border-indigo-950 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="bg-indigo-50 dark:bg-slate-900 px-5 py-3 border-b border-indigo-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">
                      ⚡ Tutorly Interactive Sandbox Preview
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const blob = new Blob([visualHtml], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Tutorly_Lesson_${student.name.replace(/\s+/g, '_')}.html`;
                      a.click();
                      playSpeech("Downloading interactive lesson file.");
                    }}
                    className="px-3.5 py-1.5 bg-indigo-650 text-white rounded-lg text-xs font-black hover:bg-indigo-700 shadow flex items-center space-x-1.5"
                  >
                    <Download size={12} />
                    <span>Download Raw HTML5 Document</span>
                  </button>
                </div>
                <iframe
                  srcDoc={visualHtml}
                  className="w-full h-[620px] bg-white border-0"
                  title="Tutorly Lesson Notes Subscreen Sandbox"
                  sandbox="allow-scripts"
                />
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
};

export default TranscriptionDisplay;
