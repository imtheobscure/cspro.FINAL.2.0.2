import { useState } from 'react';
import { LearnerProfile, ExamConfigParams, ProctoringRules, ExamJSONSchema } from './types';
import { LearnerProfileForm } from './components/LearnerProfileForm';
import { ExamParametersConfig } from './components/ExamParametersConfig';
import { AIPromptGeneratorBox } from './components/AIPromptGeneratorBox';
import { JSONValidatorView } from './components/JSONValidatorView';
import { TestPresetSelector } from './components/TestPresetSelector';
import { BrandingSettings } from './components/BrandingSettings';
import { GraduationCap, ShieldCheck, Cpu, Sparkles, Palette } from 'lucide-react';
import { DEFAULT_FRAMEWORKS, DEFAULT_VOICE_SETTINGS, DEFAULT_BRANDING, INTERNATIONAL_TEST_PRESETS, buildQuestionTypeFlags } from './testCatalog';

export default function App() {
  const [learner, setLearner] = useState<LearnerProfile>({
    name: '',
    id: '',
    email: '',
    notes: '',
    context: 'Pre-employment systems programming screening review',
    targetScore: '80%',
    tutorEmail: 'academic-advisor@domain.edu',
    collectCandidateInfo: false
  });

  const [config, setConfig] = useState<ExamConfigParams>({
    selectedTestId: 'ielts',
    selectedTestName: INTERNATIONAL_TEST_PRESETS[0].name,
    selectedTestInfo: INTERNATIONAL_TEST_PRESETS[0].summary,
    selectedTestEnvironment: INTERNATIONAL_TEST_PRESETS[0].environment,
    examInstances: 1,
    taskFrameworks: DEFAULT_FRAMEWORKS,
    voiceSettings: DEFAULT_VOICE_SETTINGS,
    branding: DEFAULT_BRANDING,
    aiGenerationMode: 'mockTest',
    aiModeUserContent: '',
    // Seeded from the same registry the preset selector and the framework table use.
    questionTypes: buildQuestionTypeFlags([
      'multipleChoice', 'multipleSelect', 'essay', 'writing', 'fillInBlank',
      'matching', 'ordering', 'listening', 'speaking',
      'noteCompletion', 'tableCompletion', 'summaryCompletion', 'sentenceCompletion', 'completeWords',
    ]),
    adaptiveMode: true,
    practiceMode: false,
    questionRandomisation: true,
    defaultTimerMinutes: 30,
    timerMode: 'total',
    passingScorePercent: 75,
  });

  const [proctoring, setProctoring] = useState<ProctoringRules>({
    webcamRequired: true,
    maxWarnings: 3,
    tabSwitchPenalty: true,
    pauseTimerOnWarning: true,
    enforceFullscreen: true,
    reproctorOnResume: true,
    aiProctorLog: true,
    gazeTracking: false,
    keystrokeDynamics: false,
    waveformVisualization: true,
    silenceAlerts: true,
    fillerWordTracking: false,
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'tests' | 'mode' | 'config' | 'branding' | 'prompt' | 'validator'>('profile');

  const handleConfigOverridesFromSchema = (schema: ExamJSONSchema) => {
    if (!schema || !schema.metadata) return;
    setConfig(prev => ({
      ...prev,
      selectedTestName: schema.metadata.examFamily || schema.metadata.title || prev.selectedTestName,
      selectedTestInfo: schema.metadata.testInfo || prev.selectedTestInfo,
      selectedTestEnvironment: schema.metadata.environmentVariables || prev.selectedTestEnvironment,
      examInstances: schema.metadata.examInstances || prev.examInstances,
      taskFrameworks: schema.metadata.taskBlueprints || prev.taskFrameworks,
      voiceSettings: schema.metadata.voiceSettings || prev.voiceSettings,
      branding: schema.metadata.branding || prev.branding,
      adaptiveMode: schema.metadata.adaptiveFlag === true,
      practiceMode: schema.metadata.practiceModeFlag === true,
      defaultTimerMinutes: schema.metadata.timeLimitMinutes || prev.defaultTimerMinutes,
      timerMode: schema.metadata.timerMode || prev.timerMode,
      passingScorePercent: schema.metadata.passingScorePercent || prev.passingScorePercent,
      questionRandomisation: schema.metadata.shuffleQuestions ?? prev.questionRandomisation,
    }));
    if (schema.proctoring) {
      setProctoring(prev => ({
        ...prev,
        webcamRequired: schema.proctoring?.webcamRequired ?? prev.webcamRequired,
        maxWarnings: schema.proctoring?.maxWarnings || prev.maxWarnings,
        tabSwitchPenalty: schema.proctoring?.tabSwitchPenalty ?? prev.tabSwitchPenalty,
        pauseTimerOnWarning: schema.proctoring?.pauseTimerOnWarning ?? prev.pauseTimerOnWarning,
        enforceFullscreen: schema.proctoring?.enforceFullscreen ?? prev.enforceFullscreen,
        gazeTracking: schema.proctoring?.gazeTracking ?? prev.gazeTracking,
        keystrokeDynamics: schema.proctoring?.keystrokeDynamics ?? prev.keystrokeDynamics,
        waveformVisualization: schema.proctoring?.waveformVisualization ?? prev.waveformVisualization,
        silenceAlerts: schema.proctoring?.silenceAlerts ?? prev.silenceAlerts,
        fillerWordTracking: schema.proctoring?.fillerWordTracking ?? prev.fillerWordTracking,
      }));
    }
    if (schema.metadata.tutorEmail) {
      setLearner(prev => ({ ...prev, tutorEmail: schema.metadata.tutorEmail }));
    }
  };

  const tabs = [
    { id: 'profile', label: 'Candidate', num: '1' },
    { id: 'tests', label: 'Standards', num: '2' },
    { id: 'mode', label: 'AI Mode', num: '3' },
    { id: 'config', label: 'Rules', num: '4' },
    { id: 'branding', label: 'Brand', num: '5' },
    { id: 'prompt', label: 'Prompt', num: '6' },
    { id: 'validator', label: 'Compile', num: '7' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 pb-16">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col lg:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <a href="/" className="text-slate-500 hover:text-slate-800 flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors" title="Back to Classroom">
              &larr; Back
            </a>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
                <GraduationCap className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">ExamCraft Framework</h1>
                <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">Proctored Assessment Builder & Standalone Compiler v2</span>
              </div>
            </div>
          </div>

          <nav className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-full lg:w-auto justify-around flex-wrap">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`px-2 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                <span className="w-4 h-4 rounded-full bg-slate-200 text-[9px] inline-flex items-center justify-center font-mono">{tab.num}</span>
                <span className="hidden xl:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-8">
        <section className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-xs font-medium text-blue-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />Fully self-contained evaluation toolchain
            </div>
            <h2 className="text-xl font-bold tracking-tight">Create Anti-Cheat HTML Exam Packages Instantly</h2>
            <p className="text-xs text-slate-300 leading-relaxed">Design assessments with generative AI. Supports IELTS, TOEFL, Cambridge, PTE, Duolingo and custom exams with speaking recording, listening read-aloud, gaze tracking, peer.js tutor observation, band score prediction and CEFR mapping.</p>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto bg-white/5 p-4 rounded-xl border border-white/10 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Parameters</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-semibold text-emerald-400"><ShieldCheck className="w-3.5 h-3.5" />{config.practiceMode ? 'Practice' : 'Proctored'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-mono">{config.defaultTimerMinutes}m ({config.timerMode})</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{config.adaptiveMode ? 'Adaptive' : 'Standard'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{config.aiGenerationMode === 'mockTest' ? 'Mock' : config.aiGenerationMode === 'lessonText' ? 'Lesson' : 'Transcript'}</span>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] font-medium text-slate-400 mt-1">
              <span>Candidate: <strong className="text-white">{learner.name || 'Unset'}</strong></span>
              <button onClick={() => setActiveTab('validator')} className="text-blue-400 hover:text-blue-300 underline">Jump to compile →</button>
            </div>
          </div>
        </section>

        <div className="space-y-8">
          {activeTab === 'profile' && (
            <div>
              <div className="flex items-center gap-2 mb-3"><span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs inline-flex items-center justify-center font-bold">1</span><h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Stage 1: Candidate Dossier & Feedback Routing</h3></div>
              <LearnerProfileForm profile={learner} onChange={setLearner} />
            </div>
          )}

          {activeTab === 'tests' && (
            <div>
              <div className="flex items-center gap-2 mb-3"><span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs inline-flex items-center justify-center font-bold">2</span><h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Stage 2: International Test Standards & Mock Exam Selector</h3></div>
              <TestPresetSelector config={config} onConfigChange={setConfig} />
            </div>
          )}

          {activeTab === 'mode' && (
            <div>
              <div className="flex items-center gap-2 mb-3"><span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs inline-flex items-center justify-center font-bold">3</span><h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Stage 3: AI Generation Mode Selector</h3></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'lessonText' as const, icon: '📚', title: 'Lesson Text Mode', desc: 'AI asks you for lesson content/topic then generates questions from that text. Best for class quizzes.', color: 'from-blue-500 to-blue-700' },
                  { id: 'mockTest' as const, icon: '🎯', title: 'Mock Test Mode', desc: 'AI creates realistic mock exams aligned to official test standards (IELTS, TOEFL, Cambridge, etc.).', color: 'from-emerald-500 to-emerald-700' },
                  { id: 'realTestTranscript' as const, icon: '🎙️', title: 'Real Test + Transcript Mode', desc: 'Paste your real exam text and audio transcripts. AI builds an accurate JSON with exact read-aloud scripts.', color: 'from-purple-500 to-purple-700' },
                ].map(mode => (
                  <button key={mode.id} type="button" onClick={() => setConfig(prev => ({ ...prev, aiGenerationMode: mode.id }))} className={`text-left rounded-xl border p-5 transition-all ${config.aiGenerationMode === mode.id ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center text-2xl mb-3 shadow-md`}>{mode.icon}</div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{mode.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{mode.desc}</p>
                    {config.aiGenerationMode === mode.id && <span className="mt-3 inline-block text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">Active</span>}
                  </button>
                ))}
              </div>

              {config.aiGenerationMode === 'realTestTranscript' && (
                <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-800">📋 Paste Your Real Test Content & Audio Transcripts</h4>
                  <p className="text-xs text-slate-500">Paste your reading passages, listening scripts, speaking prompts, and writing tasks. The AI prompt will instruct the external model to build an exact JSON with all the read-aloud data embedded.</p>
                  <textarea value={config.aiModeUserContent} onChange={e => setConfig(prev => ({ ...prev, aiModeUserContent: e.target.value }))} rows={8} placeholder={`Paste your exam content here.\n\nExample format:\n--- READING PASSAGE ---\n[Text goes here]\n\n--- LISTENING TRANSCRIPT ---\nSpeaker A: Hello...\nSpeaker B: Hi there...\n\n--- SPEAKING PROMPT ---\nDescribe a memorable journey...\n\n--- WRITING TASK ---\nWrite an essay about...\n\nInclude audio transcript details for each listening section.\nSpecify accent type (British, American, Australian) where relevant.`} className="w-full text-sm rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 resize-y font-mono" />
                </div>
              )}

              {config.aiGenerationMode === 'lessonText' && (
                <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-800">📚 Lesson Text / Topic Input</h4>
                  <p className="text-xs text-slate-500">Enter your lesson topic or paste course content. The AI will generate the prompt that asks for this and then produces the exam.</p>
                  <textarea value={config.aiModeUserContent} onChange={e => setConfig(prev => ({ ...prev, aiModeUserContent: e.target.value }))} rows={4} placeholder="e.g. Present Perfect vs Past Simple in English Grammar\nor paste your lesson slides, notes, textbook excerpt..." className="w-full text-sm rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div>
              <div className="flex items-center gap-2 mb-3"><span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs inline-flex items-center justify-center font-bold">4</span><h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Stage 4: Engine Constraints, Question Frameworks & Advanced Features</h3></div>
              <ExamParametersConfig config={config} proctoring={proctoring} onConfigChange={setConfig} onProctoringChange={setProctoring} />
            </div>
          )}

          {activeTab === 'branding' && (
            <div>
              <div className="flex items-center gap-2 mb-3"><span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs inline-flex items-center justify-center font-bold"><Palette className="w-3 h-3" /></span><h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Stage 5: Branding & Appearance Settings</h3></div>
              <BrandingSettings branding={config.branding} onChange={branding => setConfig(prev => ({ ...prev, branding }))} />
            </div>
          )}

          {activeTab === 'prompt' && (
            <div>
              <div className="flex items-center gap-2 mb-3"><span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs inline-flex items-center justify-center font-bold">6</span><h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Stage 6: LLM Integration Link</h3></div>
              <AIPromptGeneratorBox config={config} proctoring={proctoring} learner={learner} />
            </div>
          )}

          {activeTab === 'validator' && (
            <div>
              <div className="flex items-center gap-2 mb-3"><span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs inline-flex items-center justify-center font-bold">7</span><h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Stage 7: JSON Validation & Distributed Executable Engine Export</h3></div>
              <JSONValidatorView learner={learner} onLoadConfigOverrides={handleConfigOverridesFromSchema} />
            </div>
          )}
        </div>

        <footer className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 text-xs text-slate-500">
          <div className="flex items-center gap-2 text-slate-700 font-semibold border-b border-slate-100 pb-2"><Cpu className="w-4 h-4 text-slate-500" />Standalone System Architecture Overview</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-600 pt-1">
            <div><strong className="text-slate-800 block mb-1">📷 Advanced Proctoring</strong>Face tracking via FaceDetector or frame-diff heuristics. Gaze tracking, keystroke dynamics, and waveform visualization for comprehensive monitoring.</div>
            <div><strong className="text-slate-800 block mb-1">🎙️ Speaking & Listening</strong>Browser-native speech synthesis for monologues/dialogues with different voices per speaker. Microphone recording with local audio export on results.</div>
            <div><strong className="text-slate-800 block mb-1">👨‍🏫 Peer.js Tutor Observation</strong>Real-time remote proctoring. Tutor can observe candidate stats, send chat messages, make announcements, and manage the test environment remotely.</div>
          </div>
        </footer>
      </main>
    </div>
  );
}
