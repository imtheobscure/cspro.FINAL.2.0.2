import { useEffect, useMemo, useState } from 'react';
import type { EditableQuestionFramework, ExamConfigParams, ExamQuestionType, ProctoringRules } from '../types';
import { Shield, Clock, Sliders, CheckSquare, Sparkles, Volume2, Search } from 'lucide-react';

interface ExamParametersConfigProps {
  config: ExamConfigParams;
  proctoring: ProctoringRules;
  onConfigChange: (config: ExamConfigParams) => void;
  onProctoringChange: (proctoring: ProctoringRules) => void;
}

const questionTypeKeys: ExamQuestionType[] = [
  'multipleChoice',
  'multipleSelect',
  'essay',
  'writing',
  'fillInBlank',
  'matching',
  'ordering',
  'likert',
  'listening',
  'speaking',
  'noteCompletion',
  'tableCompletion',
  'summaryCompletion',
  'sentenceCompletion',
  'gapFill',
  'completeWords',
];

const syncQuestionTypeFlags = (frameworks: EditableQuestionFramework[], current: ExamConfigParams['questionTypes']) => {
  const next = { ...current };
  questionTypeKeys.forEach((type) => {
    next[type] = frameworks.some((framework) => framework.questionType === type && framework.enabled);
  });
  next.essay = next.essay || next.writing;
  next.writing = next.writing || next.essay;
  return next;
};

export const ExamParametersConfig = ({
  config,
  proctoring,
  onConfigChange,
  onProctoringChange,
}: ExamParametersConfigProps) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceQuery, setVoiceQuery] = useState('');

  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis?.getVoices?.() || []);
    loadVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices);
  }, []);

  const filteredVoices = useMemo(() => {
    const q = voiceQuery.toLowerCase().trim();
    if (!q) return voices.slice(0, 24);
    return voices.filter((voice) => `${voice.name} ${voice.lang}`.toLowerCase().includes(q)).slice(0, 24);
  }, [voices, voiceQuery]);

  const updateConfig = (key: keyof ExamConfigParams, value: any) => onConfigChange({ ...config, [key]: value });
  const updateProctor = (key: keyof ProctoringRules, value: any) => onProctoringChange({ ...proctoring, [key]: value });

  const updateFramework = (id: string, patch: Partial<EditableQuestionFramework>) => {
    const nextFrameworks = config.taskFrameworks.map((framework) =>
      framework.id === id ? { ...framework, ...patch } : framework
    );
    onConfigChange({
      ...config,
      taskFrameworks: nextFrameworks,
      questionTypes: syncQuestionTypeFlags(nextFrameworks, config.questionTypes),
    });
  };

  const updateVoiceSetting = (key: keyof ExamConfigParams['voiceSettings'], value: any) => {
    onConfigChange({
      ...config,
      voiceSettings: { ...config.voiceSettings, [key]: value },
    });
  };

  const previewVoice = () => {
    const utterance = new SpeechSynthesisUtterance('This is a preview of the selected natural read aloud voice for learner instructions and listening activities.');
    const selected = voices.find((voice) => voice.name === config.voiceSettings.voiceName);
    if (selected) utterance.voice = selected;
    utterance.lang = selected?.lang || config.voiceSettings.voiceLanguage || 'en-US';
    utterance.rate = config.voiceSettings.rate;
    utterance.pitch = config.voiceSettings.pitch;
    utterance.volume = config.voiceSettings.volume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-600" />
          Editable Permitted Question Frameworks
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Edit labels, descriptions, item counts, and time-per-item values. The AI prompt and generated schema will inherit these settings.
        </p>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[860px] w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="text-left p-3">Use</th>
                <th className="text-left p-3">Framework Label</th>
                <th className="text-left p-3">Core Type</th>
                <th className="text-left p-3">Description</th>
                <th className="text-left p-3">Items</th>
                <th className="text-left p-3">Sec / Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {config.taskFrameworks.map((framework) => (
                <tr key={framework.id} className={framework.enabled ? 'bg-blue-50/20' : 'bg-white opacity-70'}>
                  <td className="p-3 align-top">
                    <input
                      type="checkbox"
                      checked={framework.enabled}
                      onChange={(event) => updateFramework(framework.id, { enabled: event.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-400"
                    />
                  </td>
                  <td className="p-3 align-top">
                    <input
                      value={framework.label}
                      onChange={(event) => updateFramework(framework.id, { label: event.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="p-3 align-top">
                    <select
                      value={framework.questionType}
                      onChange={(event) => updateFramework(framework.id, { questionType: event.target.value as ExamQuestionType })}
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-blue-500"
                    >
                      {questionTypeKeys.map((key) => <option key={key} value={key}>{key}</option>)}
                    </select>
                  </td>
                  <td className="p-3 align-top">
                    <textarea
                      value={framework.description}
                      onChange={(event) => updateFramework(framework.id, { description: event.target.value })}
                      rows={2}
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500 resize-y"
                    />
                  </td>
                  <td className="p-3 align-top">
                    <input
                      type="number"
                      min={0}
                      value={framework.estimatedQuestions}
                      onChange={(event) => updateFramework(framework.id, { estimatedQuestions: parseInt(event.target.value) || 0 })}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="p-3 align-top">
                    <input
                      type="number"
                      min={5}
                      value={framework.timePerQuestionSeconds}
                      onChange={(event) => updateFramework(framework.id, { timePerQuestionSeconds: parseInt(event.target.value) || 60 })}
                      className="w-24 rounded-md border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-600" />
            Execution Behaviors & Modifiers
          </h3>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
              <input type="checkbox" checked={config.adaptiveMode} onChange={(e) => updateConfig('adaptiveMode', e.target.checked)} className="mt-0.5 rounded text-purple-600 focus:ring-purple-400" />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Enable Dynamic Adaptive Engine</span>
                <span className="text-[11px] text-slate-500 block leading-normal">Reroutes subsequent sections based on previous accuracy or difficulty tags.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={config.practiceMode}
                onChange={(e) => {
                  const checked = e.target.checked;
                  updateConfig('practiceMode', checked);
                  if (checked) onProctoringChange({ ...proctoring, webcamRequired: false, tabSwitchPenalty: false, enforceFullscreen: false });
                }}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-400 accent-emerald-600"
              />
              <div>
                <span className="text-xs font-semibold text-emerald-900 block flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-600" />Practice Mode</span>
                <span className="text-[11px] text-emerald-700 block leading-normal">Relaxes proctoring, reveals strategies, and enables generated detailed feedback read-aloud.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
              <input type="checkbox" checked={config.questionRandomisation} onChange={(e) => updateConfig('questionRandomisation', e.target.checked)} className="mt-0.5 rounded text-blue-600 focus:ring-blue-400" />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Question Randomisation</span>
                <span className="text-[11px] text-slate-500 block">Shuffle question order per candidate to prevent memorisation.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 hover:bg-indigo-50 transition-colors cursor-pointer">
              <input type="checkbox" checked={config.voiceSettings.enabled} onChange={(e) => updateVoiceSetting('enabled', e.target.checked)} className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-400" />
              <div>
                <span className="text-xs font-semibold text-indigo-900 block flex items-center gap-1"><Volume2 className="w-3 h-3 text-indigo-600" />Natural Voice Read Aloud</span>
                <span className="text-[11px] text-indigo-700 block leading-normal">Reads candidate instructions, listening monologues/dialogues, and detailed practice feedback using browser voices.</span>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" />Timer Configuration</h3>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Duration Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(['total', 'section'] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => updateConfig('timerMode', mode)} className={`px-3 py-1.5 rounded-md text-xs font-medium border text-center transition-all ${config.timerMode === mode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{mode === 'total' ? 'Total Global Clock' : 'Per-Section Split'}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1"><span>Default Minutes Allocation</span><span className="font-bold text-amber-700">{config.defaultTimerMinutes} min</span></div>
            <input type="range" min={2} max={240} step={1} value={config.defaultTimerMinutes} onChange={(e) => updateConfig('defaultTimerMinutes', parseInt(e.target.value))} className="w-full accent-amber-600 cursor-pointer" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Passing Threshold Target (%)</label>
            <input type="number" min={10} max={100} value={config.passingScorePercent} onChange={(e) => updateConfig('passingScorePercent', parseInt(e.target.value) || 70)} className="w-full text-sm px-3 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:border-amber-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Volume2 className="w-4 h-4 text-indigo-600" />Natural Read-Aloud Voice Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Searchable Browser Voice Dropdown</label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input value={voiceQuery} onChange={(e) => setVoiceQuery(e.target.value)} placeholder="Search voice name or language" className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500" />
            </div>
            <select
              value={config.voiceSettings.voiceName}
              onChange={(e) => {
                const voice = voices.find((candidate) => candidate.name === e.target.value);
                onConfigChange({ ...config, voiceSettings: { ...config.voiceSettings, voiceName: e.target.value, voiceLanguage: voice?.lang || config.voiceSettings.voiceLanguage } });
              }}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">System default voice</option>
              {filteredVoices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} ({voice.lang})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={config.voiceSettings.readInstructions} onChange={(e) => updateVoiceSetting('readInstructions', e.target.checked)} />Read instructions</label>
            <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={config.voiceSettings.readFeedbackInPractice} onChange={(e) => updateVoiceSetting('readFeedbackInPractice', e.target.checked)} />Read practice feedback</label>
            <button type="button" onClick={previewVoice} className="w-full text-xs font-semibold rounded-lg bg-indigo-600 text-white px-3 py-2 hover:bg-indigo-500">Preview Voice</button>
          </div>
          <label className="text-xs text-slate-700">Rate<input type="range" min={0.5} max={1.5} step={0.05} value={config.voiceSettings.rate} onChange={(e) => updateVoiceSetting('rate', parseFloat(e.target.value))} className="w-full accent-indigo-600" /></label>
          <label className="text-xs text-slate-700">Pitch<input type="range" min={0.5} max={1.5} step={0.05} value={config.voiceSettings.pitch} onChange={(e) => updateVoiceSetting('pitch', parseFloat(e.target.value))} className="w-full accent-indigo-600" /></label>
          <label className="text-xs text-slate-700">Volume<input type="range" min={0.1} max={1} step={0.05} value={config.voiceSettings.volume} onChange={(e) => updateVoiceSetting('volume', parseFloat(e.target.value))} className="w-full accent-indigo-600" /></label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Shield className="w-4 h-4 text-rose-600" />Proctoring Strictness & Integrity Controls</h3>
            <p className="text-xs text-slate-500">Set auto-invalidation constraints for standalone runtime packages.</p>
          </div>
          {config.practiceMode && <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Overridden by Practice Mode</span>}
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 ${config.practiceMode ? 'opacity-60 pointer-events-none' : ''}`}>
          {[
            ['webcamRequired', 'Continuous Webcam Check', 'Uses webcam plus frame-diff presence checks. If the face/view disappears, a warning strike is logged.'],
            ['enforceFullscreen', 'Enforce Fullscreen Takeover', 'Counts a warning if the candidate exits fullscreen.'],
            ['tabSwitchPenalty', 'Tab-Switch / Blur Monitoring', 'Counts a warning when the browser loses focus.'],
            ['pauseTimerOnWarning', 'Pause Timer on Warning Trigger', 'Shows warning overlay and pauses interaction while candidate acknowledges.'],
            ['reproctorOnResume', 'Re-Proctor Verification Hooks', 'Requires fresh camera check after page resume or restore.'],
            ['aiProctorLog', 'AI Proctor JSON Log', 'Stores warnings, answer changes and session events for later review.'],
          ].map(([key, label, desc]) => (
            <label key={key} className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-all">
              <input type="checkbox" checked={Boolean(proctoring[key as keyof ProctoringRules])} onChange={(e) => updateProctor(key as keyof ProctoringRules, e.target.checked)} className="mt-1 rounded text-rose-600 focus:ring-rose-400" />
              <div><span className="text-xs font-semibold text-slate-800 block">{label}</span><span className="text-[11px] text-slate-500 block leading-tight">{desc}</span></div>
            </label>
          ))}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1"><span className="text-xs font-semibold text-slate-800 block">Max Strikes Allowed</span><span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">{proctoring.maxWarnings}</span></div>
            <input type="range" min={1} max={6} step={1} value={proctoring.maxWarnings} onChange={(e) => updateProctor('maxWarnings', parseInt(e.target.value))} className="w-full accent-rose-600 cursor-pointer mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
};
