import { useMemo, useState } from 'react';
import type { ExamConfigParams } from '../types';
import { buildQuestionTypeFlags, DEFAULT_FRAMEWORKS, INTERNATIONAL_TEST_PRESETS, InternationalTestPreset } from '../testCatalog';
import { BookOpen, Clock, Layers, Search } from 'lucide-react';

interface TestPresetSelectorProps {
  config: ExamConfigParams;
  onConfigChange: (config: ExamConfigParams) => void;
}

const applyPresetToConfig = (config: ExamConfigParams, preset: InternationalTestPreset): ExamConfigParams => {
  const nextFrameworks = DEFAULT_FRAMEWORKS.map((framework) => ({
    ...framework,
    enabled: preset.taskTypes.includes(framework.questionType),
    estimatedQuestions: preset.taskTypes.includes(framework.questionType) ? framework.estimatedQuestions : 0,
  }));

  return {
    ...config,
    selectedTestId: preset.id,
    selectedTestName: preset.name,
    selectedTestInfo: preset.summary,
    selectedTestEnvironment: preset.environment,
    taskFrameworks: nextFrameworks,
    adaptiveMode: preset.adaptiveMode,
    defaultTimerMinutes: preset.totalMinutes,
    timerMode: preset.timerMode,
    passingScorePercent: preset.passingScorePercent,
    // Derived from the preset's own task list, so a newly added renderer becomes
    // selectable here without editing this mapping by hand.
    questionTypes: (() => {
      const flags = buildQuestionTypeFlags(preset.taskTypes);
      flags.essay = flags.essay || flags.writing;
      flags.writing = flags.writing || flags.essay;
      return flags;
    })(),
  };
};

export const TestPresetSelector = ({ config, onConfigChange }: TestPresetSelectorProps) => {
  const [query, setQuery] = useState('');
  const filteredTests = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return INTERNATIONAL_TEST_PRESETS;
    return INTERNATIONAL_TEST_PRESETS.filter((preset) =>
      `${preset.name} ${preset.family} ${preset.level} ${preset.summary}`.toLowerCase().includes(q)
    );
  }, [query]);

  const selectedPreset = INTERNATIONAL_TEST_PRESETS.find((item) => item.id === config.selectedTestId);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            International Test Standards Library
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Select a real-world exam family to auto-fill task types, timing, execution mode, and prompt environment variables.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search IELTS, TOEFL, Cambridge..."
            className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTests.map((preset) => {
          const selected = config.selectedTestId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onConfigChange(applyPresetToConfig(config, preset))}
              className={`text-left rounded-xl border p-4 transition-all ${
                selected
                  ? 'border-indigo-600 bg-indigo-50 shadow-sm ring-2 ring-indigo-100'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{preset.name}</h3>
                  <span className="text-[11px] text-slate-500">{preset.family} / {preset.level}</span>
                </div>
                <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {selected ? 'Selected' : 'Use'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed min-h-12">{preset.summary}</p>

              <div className="grid grid-cols-3 gap-2 mt-4 text-[11px]">
                <span className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col gap-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <strong className="text-slate-900">{preset.totalMinutes}m</strong>
                  <span className="text-slate-500">timer</span>
                </span>
                <span className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col gap-0.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <strong className="text-slate-900">{preset.estimatedQuestions}</strong>
                  <span className="text-slate-500">items</span>
                </span>
                <span className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col gap-0.5">
                  <span className="font-bold text-emerald-600">{preset.passingScorePercent}%</span>
                  <strong className="text-slate-900">pass</strong>
                  <span className="text-slate-500">target</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-2">Selected environment variables</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(config.selectedTestEnvironment || {}).map(([key, value]) => (
              <span key={key} className="text-[11px] bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-700">
                <strong>{key}:</strong> {String(value)}
              </span>
            ))}
            {!selectedPreset && <span className="text-xs text-slate-500">No preset selected.</span>}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Complete Exam Instances</label>
              <input
                type="number"
                min={1}
                max={10}
                value={config.examInstances}
                onChange={(event) => onConfigChange({ ...config, examInstances: Math.max(1, parseInt(event.target.value) || 1) })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Custom Exam Name</label>
              <input
                value={config.selectedTestName}
                onChange={(event) => onConfigChange({ ...config, selectedTestId: 'custom', selectedTestName: event.target.value })}
                placeholder="My custom exam"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Custom Exam Info / Standards Notes</label>
            <textarea
              value={config.selectedTestInfo}
              onChange={(event) => onConfigChange({ ...config, selectedTestId: 'custom', selectedTestInfo: event.target.value, selectedTestEnvironment: { custom: true, userDefined: true } })}
              rows={3}
              placeholder="Describe sections, task types, target learners, official reference style, scoring scale and timing rules."
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500 resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
