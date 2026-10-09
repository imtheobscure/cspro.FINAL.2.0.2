/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, AlertTriangle, Moon, Sun, Clock, RefreshCw,
  ClipboardCopy, ClipboardPaste, CheckCircle, UserCheck, Wand2,
  FileText, ChevronDown, ChevronUp, Loader2, X
} from 'lucide-react';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import StudentRoster from './components/StudentRoster';
import Button from './components/Button';
import { TeacherFeedback, StudentProfile, TranscriptionResponse } from './types';
import {
  buildAnalysisPrompt,
  parseTeacherFeedback,
  consumeHandoff,
  handoffToStudent,
  saveDraft,
  loadDraft,
  countWords,
  handoffSourceLabel,
} from './services/lessonInsightPipeline';

/**
 * Lesson Insight — external-AI workflow.
 *
 * The app no longer talks to Gemini. There is no API key, no audio upload and
 * no in-browser model call. Instead it is a three-step hand-off:
 *
 *   1. CONFIRM the learner profile (pre-filled when the tutor arrived from a
 *      learner's profile page).
 *   2. PASTE the messy class transcript and copy the generated prompt.
 *   3. PASTE the JSON the external AI returns, and read the report.
 *
 * See `services/lessonInsightPipeline.ts` for the prompt text and the parsing.
 */
function App() {
  const [status, setStatus] = useState<'idle' | 'report'>('idle');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Resolve the handoff/draft during the FIRST render, not in an effect.
  //
  // `StudentRoster` seeds its own fields from `activeStudent` on mount, so a
  // handoff that only arrived in a later effect was overwritten by the roster's
  // sample-learner defaults before it could take effect. Reading it here means
  // the very first render already knows the real learner.
  const bootRef = useRef<{ student: StudentProfile | null; transcript: string; banner: string | null } | null>(null);
  if (bootRef.current === null) {
    const handoff = consumeHandoff();
    if (handoff && handoff.name) {
      bootRef.current = {
        student: handoffToStudent(handoff),
        transcript: '',
        banner: `Loaded ${handoff.name}'s profile facts from ${handoffSourceLabel(handoff.source)}.`,
      };
    } else {
      const draft = loadDraft();
      bootRef.current = {
        student: draft?.student ?? null,
        transcript: draft?.transcript ?? '',
        banner: null,
      };
    }
  }
  const boot = bootRef.current;

  const [student, setStudent] = useState<StudentProfile | null>(boot.student);
  const [transcript, setTranscript] = useState(boot.transcript);
  const [pastedReport, setPastedReport] = useState('');
  const [report, setReport] = useState<TeacherFeedback | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResponse | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [handoffBanner, setHandoffBanner] = useState<string | null>(boot.banner);
  const [showProfile, setShowProfile] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Start on step 2 when a transcript was restored from the draft.
  useEffect(() => {
    if (boot.transcript) setStep(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the draft so a reload mid-lesson does not lose the transcript.
  useEffect(() => {
    if (student) saveDraft({ student, transcript });
  }, [student, transcript]);

  const handleStudentChange = (next: StudentProfile) => {
    setStudent(next);
  };

  const analysisPrompt = student && transcript.trim()
    ? buildAnalysisPrompt(student, transcript)
    : '';

  const handleCopyPrompt = async () => {
    if (!analysisPrompt) return;
    try {
      await navigator.clipboard.writeText(analysisPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Could not reach the clipboard. Select the prompt text and copy it manually.');
    }
  };

  const handleParseReport = () => {
    setError(null);
    if (!student) {
      setError('Set up the learner profile first.');
      return;
    }
    if (!pastedReport.trim()) {
      setError('Paste the JSON the AI returned.');
      return;
    }
    try {
      const parsed = parseTeacherFeedback(pastedReport);
      setReport(parsed);
      // Keep a light transcript shell so the report's "turns" counter and the
      // Lesson Notes tab have something to work from.
      setTranscription({ summary: parsed.generalLessonTopic, segments: [] });
      setStatus('report');
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch (e: any) {
      setError(e?.message || 'Could not read that report.');
    }
  };

  const handleReset = () => {
    setReport(null);
    setPastedReport('');
    setStatus('idle');
    setStep(2);
    setError(null);
  };

  const wordCount = countWords(transcript);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-300">

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/30">
              <Sparkles size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                Tutorly Lesson Insight
              </h1>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block -mt-1 font-semibold uppercase tracking-wider">
                External-AI Lesson Analyst
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
              <CheckCircle size={13} />
              <span>No API key needed</span>
            </div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
              aria-label="Toggle Dark Theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Handoff banner */}
        {handoffBanner && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3.5 flex items-start gap-3">
            <UserCheck className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 flex-1">{handoffBanner}</p>
            <button
              onClick={() => setHandoffBanner(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 p-0.5"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Intro */}
        <div className="mb-8 bg-gradient-to-r from-indigo-50/50 to-white dark:from-slate-900/40 dark:to-slate-950 p-6 rounded-2xl border border-indigo-100/50 dark:border-slate-850 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1.5">Lesson Insight in three steps</h2>
          <p className="text-sm text-slate-500 dark:text-slate-450 max-w-3xl">
            Paste the raw class transcript, copy the generated analyst prompt into any external AI
            (ChatGPT, Claude, Gemini Advanced…), then paste its JSON reply back here. The transcript is
            expected to be messy — the AI is told to work out what the learner meant while never
            correcting their mistakes, because those mistakes are the report.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4 flex items-start text-red-700 dark:text-red-400">
            <AlertTriangle className="mr-3 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 p-0.5" aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        )}

        {status === 'report' && report && student ? (
          <div ref={reportRef} className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 flex items-center uppercase tracking-wider">
                <CheckCircle size={20} className="mr-2 text-emerald-500" />
                Lesson Insight Report
              </h2>
              <Button onClick={handleReset} variant="secondary" className="text-xs py-2">
                Analyse Another Lesson
              </Button>
            </div>

            <TranscriptionDisplay
              feedback={report}
              student={student}
              transcription={transcription}
              rawTranscript={transcript}
              onReRunGemini={handleReset}
              onUpdateFeedback={(updated) => setReport(updated)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left: learner profile */}
            <div className="lg:col-span-1 space-y-6">
              <StudentRoster
                onSelectedStudentChange={handleStudentChange}
                activeStudent={student}
                teacherReport={report}
              />
            </div>

            {/* Right: the three-step pipeline */}
            <div className="lg:col-span-2 space-y-6">

              {/* Step 1 — profile */}
              <StepCard
                number={1}
                title="Learner profile"
                done={Boolean(student?.name)}
                active={step === 1}
                onToggle={() => { setStep(1); setShowProfile((v) => !v); }}
                summary={
                  student?.name
                    ? `${student.name}${student.l2 ? ` · learning ${student.l2}` : ''}${student.facts ? ' · facts loaded' : ''}`
                    : 'No learner set up yet'
                }
              >
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  These fields are pre-filled automatically when you open Lesson Insight from a learner's
                  profile. Edit them on the left at any time — the prompt picks up your changes instantly.
                </p>
                {!student?.facts && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg text-[11px] text-amber-700 dark:text-amber-400 flex gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                      No learner facts yet. The report is far more accurate with them — fill in
                      "Learner Facts, Context &amp; Goals" on the left.
                    </span>
                  </div>
                )}
              </StepCard>

              {/* Step 2 — transcript */}
              <StepCard
                number={2}
                title="Paste the class transcript"
                done={transcript.trim().length > 0}
                active={step === 2}
                onToggle={() => setStep(2)}
                summary={wordCount ? `${wordCount.toLocaleString()} words` : 'Nothing pasted yet'}
              >
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={9}
                  placeholder={
                    'Paste the raw transcript here — auto-captions, a phone recording transcript, or notes you typed during the lesson.\n\nIt does not need to be clean. Speaker labels help but are not required.'
                  }
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-slate-100 leading-relaxed font-mono"
                />

                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button
                    onClick={handleCopyPrompt}
                    disabled={!analysisPrompt}
                    className="w-full sm:w-auto"
                    icon={copied ? <CheckCircle size={15} /> : <ClipboardCopy size={15} />}
                  >
                    {copied ? 'Prompt Copied!' : 'Copy AI Analyst Prompt'}
                  </Button>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
                    Includes the learner facts, the transcript, the messy-transcript rules and the exact
                    JSON schema.
                  </span>
                </div>

                {analysisPrompt && (
                  <details className="mt-4 group">
                    <summary className="cursor-pointer text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                      <ChevronDown size={13} className="group-open:hidden" />
                      <ChevronUp size={13} className="hidden group-open:block" />
                      Preview the prompt
                    </summary>
                    <pre className="mt-3 p-4 bg-slate-950 dark:bg-black/40 text-indigo-100 rounded-xl text-[11px] font-mono whitespace-pre-wrap max-h-80 overflow-y-auto border border-slate-800 leading-relaxed">
                      {analysisPrompt}
                    </pre>
                  </details>
                )}
              </StepCard>

              {/* Step 3 — paste the JSON back */}
              <StepCard
                number={3}
                title="Paste the AI's JSON reply"
                done={false}
                active={step === 3}
                onToggle={() => setStep(3)}
                summary={report ? 'Report loaded' : 'Waiting for the AI response'}
              >
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                  Paste the AI's full reply. Markdown fences and a sentence of preamble are fine —
                  the parser digs the JSON out either way.
                </p>
                <textarea
                  value={pastedReport}
                  onChange={(e) => setPastedReport(e.target.value)}
                  rows={7}
                  placeholder='{ "generalLessonTopic": "…", "grammarInsights": { … } }'
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-slate-100 leading-relaxed font-mono"
                />
                <div className="mt-4">
                  <Button
                    onClick={handleParseReport}
                    disabled={!pastedReport.trim()}
                    className="w-full sm:w-auto"
                    icon={<Wand2 size={15} />}
                  >
                    Build Insight Report
                  </Button>
                </div>
              </StepCard>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface StepCardProps {
  number: number;
  title: string;
  summary: string;
  done: boolean;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({
  number, title, summary, done, active, onToggle, children,
}) => (
  <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-colors duration-300 ${
    active ? 'border-indigo-300 dark:border-indigo-800' : 'border-slate-200 dark:border-slate-800'
  }`}>
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-5 text-left"
    >
      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
        done
          ? 'bg-emerald-500 text-white'
          : active
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
      }`}>
        {done ? <CheckCircle size={15} /> : number}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-slate-800 dark:text-white truncate">{title}</span>
        <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate">{summary}</span>
      </span>
      {active ? (
        <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
      ) : (
        <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
      )}
    </button>
    {active && <div className="px-5 pb-5">{children}</div>}
  </div>
);

export default App;
