import React, { useState } from 'react';
import { CEFRLevel, AudienceMode, Question } from '../types/game';
import { generateAIPrompt, downloadJSONFile, validateQuestionJSON } from '../utils/aiPromptGenerator';
import { SAMPLE_QUESTIONS } from '../data/sampleQuestions';
import { Copy, Check, Download, Upload, Bot, FileText, AlertCircle, X, Sparkles } from 'lucide-react';

interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (questions: Question[]) => void;
  currentCefr: CEFRLevel;
  currentMode: AudienceMode;
}

export const AIPromptModal: React.FC<AIPromptModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
  currentCefr,
  currentMode,
}) => {
  const [selectedCefr, setSelectedCefr] = useState<CEFRLevel>(currentCefr);
  const [selectedMode, setSelectedMode] = useState<AudienceMode>(currentMode);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'import' | 'templates'>('prompt');
  
  // Custom JSON Input
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });

  if (!isOpen) return null;

  const generatedPrompt = generateAIPrompt(selectedCefr, selectedMode, questionCount);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadTemplate = () => {
    const template = SAMPLE_QUESTIONS.slice(0, 8);
    downloadJSONFile(template, `runner_${selectedMode}_${selectedCefr}_lesson.json`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawJsonText(content);
      validateAndApplyJSON(content);
    };
    reader.readAsText(file);
  };

  const validateAndApplyJSON = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const validated = validateQuestionJSON(parsed);
      onImportQuestions(validated);
      setImportStatus({
        type: 'success',
        message: `Successfully loaded ${validated.length} questions into the combat arena!`,
      });
    } catch (err: unknown) {
      setImportStatus({
        type: 'error',
        message: (err as Error).message || 'Invalid JSON format. Check schema.',
      });
    }
  };

  const handleApplyPastedJSON = () => {
    if (!rawJsonText.trim()) return;
    validateAndApplyJSON(rawJsonText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-label="Lesson studio" className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                AI Curriculum Generator & JSON Importer
                <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Strict CEFR Pipeline
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Generate tailored questions from any PDF/Lesson via ChatGPT or Claude, then import instantly.
              </p>
            </div>
          </div>
          <button
            aria-label="Close lesson studio"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'prompt' 
                ? 'border-amber-400 text-amber-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            1. Copy AI Master Prompt
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'import' 
                ? 'border-amber-400 text-amber-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            2. Import Custom JSON ({importStatus.type === 'success' ? 'Loaded' : 'Ready'})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'templates' 
                ? 'border-amber-400 text-amber-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            Download Templates
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* TAB 1: AI Master Prompt */}
          {activeTab === 'prompt' && (
            <div className="space-y-5">
              
              {/* Configuration Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Target CEFR Level
                  </label>
                  <select
                    value={selectedCefr}
                    onChange={(e) => setSelectedCefr(e.target.value as CEFRLevel)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-sm outline-none focus:border-amber-400"
                  >
                    <option value="A1">A1 - Breakthrough / Beginner</option>
                    <option value="A2">A2 - Elementary</option>
                    <option value="B1">B1 - Intermediate</option>
                    <option value="B2">B2 - Upper Intermediate</option>
                    <option value="C1">C1 - Advanced Professional</option>
                    <option value="C2">C2 - Mastery</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Audience Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMode('adult')}
                      className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                        selectedMode === 'adult' 
                          ? 'bg-amber-500 text-slate-950 shadow-md' 
                          : 'bg-slate-900 text-slate-400 border border-slate-700'
                      }`}
                    >
                      Adult / Pro
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMode('kid')}
                      className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                        selectedMode === 'kid' 
                          ? 'bg-sky-500 text-slate-950 shadow-md' 
                          : 'bg-slate-900 text-slate-400 border border-slate-700'
                      }`}
                    >
                      Kid / Fun
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-sm outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="bg-sky-950/40 border border-sky-500/30 rounded-xl p-4 flex gap-3 text-sky-200 text-sm">
                <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-bold mb-0.5">How this works:</strong>
                  Copy the master prompt below and paste it into ChatGPT, Claude, or any LLM. The AI will strictly ask you for your lesson PDF or text first, and then output valid game JSON with power-ups scaled to difficulty and sanitized punctuation!
                </div>
              </div>

              {/* Prompt Text Box */}
              <div className="relative">
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto max-h-64 whitespace-pre-wrap select-all">
                  {generatedPrompt}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="absolute top-3 right-3 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm px-4 py-2 rounded-lg shadow-lg active:scale-95 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-950" />
                      COPIED TO CLIPBOARD!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      COPY AI MASTER PROMPT
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: Import Custom JSON */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              
              {/* File upload drag/button */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl cursor-pointer border border-slate-700 transition-all">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Upload .json File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-400">or paste your AI-generated JSON directly below:</span>
              </div>

              {/* Text Area */}
              <textarea
                value={rawJsonText}
                onChange={(e) => setRawJsonText(e.target.value)}
                placeholder="Paste JSON array here... [ { &quot;id&quot;: &quot;q1&quot;, &quot;type&quot;: &quot;multiple_choice&quot;, ... } ]"
                className="w-full h-60 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 outline-none focus:border-amber-400"
              />

              {/* Status Notice */}
              {importStatus.type === 'success' && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-300 text-sm flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span>{importStatus.message}</span>
                </div>
              )}
              {importStatus.type === 'error' && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-lg text-rose-300 text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                  <span>{importStatus.message}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleApplyPastedJSON}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base rounded-xl shadow-lg transition-all"
              >
                Apply Custom Questions to Active Game
              </button>
            </div>
          )}

          {/* TAB 3: Templates */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm">
                Download verified sample lesson JSON files with all 8 question types (Multiple Choice, Multi-select, True/False, Listening TTS, Reading Comprehension, Spelling, Unscramble, and Sorting) calibrated to CEFR standards.
              </p>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-white text-base">CEFR Question Pack Template (.json)</h4>
                  <p className="text-xs text-slate-400">Includes all 8 question types with fruit triggers and power-ups.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-xl transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Sample JSON
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
