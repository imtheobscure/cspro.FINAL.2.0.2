/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { 
  Mic, Upload, Sparkles, AlertTriangle, Moon, Sun, 
  Key, Clock, RefreshCw, UserCheck, CheckCircle, Landmark
} from 'lucide-react';
import AudioRecorder from './components/AudioRecorder';
import FileUploader from './components/FileUploader';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import StudentRoster from './components/StudentRoster';
import Button from './components/Button';
import { 
  transcribeAudio, 
  generateTeacherFeedback, 
  getStoredApiKey, 
  setStoredApiKey, 
  removeStoredApiKey,
  getApproxRemainingMinutes,
  validateApiKey
} from './services/geminiService';
import { AppStatus, AudioData, TranscriptionResponse, TeacherFeedback, StudentProfile } from './types';

function App() {
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [analysisStatus, setAnalysisStatus] = useState<'transcribing' | 'analyzing' | null>(null);
  
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResponse | null>(null);
  const [teacherReport, setTeacherReport] = useState<TeacherFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Student profile tracking
  const [activeStudent, setActiveStudent] = useState<StudentProfile | null>(null);

  // API Key Onboarding Modal States
  const [apiKey, setApiKey] = useState('');
  const [apiKeyVerified, setApiKeyVerified] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [approxRemainingMin, setApproxRemainingMin] = useState(45);

  // Initialize default theme to light (isDarkMode false)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Check state of API key on boot
  useEffect(() => {
    const saved = getStoredApiKey();
    if (saved) {
      setApiKey(saved);
      setApiKeyVerified(true);
    } else {
      setIsKeyModalOpen(true);
    }
    setApproxRemainingMin(getApproxRemainingMinutes());
  }, []);

  const handleVerifyAndSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError(null);
    
    if (!apiKey || apiKey.trim() === "") {
      setOnboardingError("Please enter a valid Gemini API key.");
      return;
    }

    setIsValidatingKey(true);
    try {
      const isValid = await validateApiKey(apiKey.trim());
      if (isValid) {
        setStoredApiKey(apiKey.trim());
        setApiKeyVerified(true);
        setIsKeyModalOpen(false);
        setApproxRemainingMin(getApproxRemainingMinutes());
      } else {
        setOnboardingError("Validation failed. This key appears to be invalid or restricted. Ensure copy-pasting is correct.");
      }
    } catch (err: any) {
      setOnboardingError(err.message || "An error occurred during API key verification. Check your connection.");
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleResetApiKey = () => {
    removeStoredApiKey();
    setApiKey('');
    setApiKeyVerified(false);
    setIsKeyModalOpen(true);
  };

  const handleAudioReady = (data: AudioData) => {
    setAudioData(data);
    setError(null);
    setTranscription(null);
    setTeacherReport(null);
  };

  // Back-to-back pipeline: 1. Transcribe speech, 2. Run error tagging & feedback metrics
  const handleTranscribeAndAnalyze = async () => {
    if (!audioData) return;
    if (!activeStudent) {
      setError("Please select or register a student profile from the roster list first.");
      return;
    }

    setStatus('processing');
    setAnalysisStatus('transcribing');
    setError(null);

    const clientKey = getStoredApiKey();
    if (!clientKey) {
      setError("Your API key is missing. Re-verify your API onboarding credentials first.");
      setIsKeyModalOpen(true);
      setStatus('error');
      return;
    }

    try {
      // 1. Transcribe Raw Base64 audio using custom key
      const transcriptionResults = await transcribeAudio(
        audioData.base64, 
        audioData.mimeType, 
        clientKey,
        activeStudent.name,
        activeStudent.tutorName,
        audioData.micAssignment,
        audioData.tabAssignment
      );

      setAnalysisStatus('analyzing');

      // 2. Feed transcription results into feedback generator
      const feedbackResults = await generateTeacherFeedback(
        transcriptionResults.segments,
        activeStudent,
        clientKey
      );

      // Save generated mistakes history into storage roster (removed as per privacy layout)
      // Log processed minutes
      const deltaSeconds = audioData.duration || 15;
      const v = localStorage.getItem("tutorly_processed_seconds");
      const current = v ? parseInt(v, 10) : 0;
      localStorage.setItem("tutorly_processed_seconds", (current + deltaSeconds).toString());
      setApproxRemainingMin(getApproxRemainingMinutes());

      setTranscription(transcriptionResults);
      setTeacherReport(feedbackResults);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during speech assessment processing. Please verify your API key and connection.");
      setStatus('error');
    } finally {
      setAnalysisStatus(null);
    }
  };

  const handleReset = () => {
    setAudioData(null);
    setTranscription(null);
    setTeacherReport(null);
    setStatus('idle');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-300">
      
      {/* App Header */}
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
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block -mt-1 font-semibold uppercase tracking-wider">Language Teacher Assistant</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Free Quota tracker element */}
            <div className="hidden md:flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-850 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-350 border border-slate-200/50 dark:border-slate-800">
              <Clock size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Est. Quota: <strong>{approxRemainingMin}m</strong> remaining</span>
            </div>

            {/* Change/Reset Key block */}
            <button
              onClick={handleResetApiKey}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center space-x-1 border border-slate-200/50 dark:border-slate-800"
            >
              <Key size={12} />
              <span>Key Setting</span>
            </button>

            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
              aria-label="Toggle Dark Theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Intro */}
        <div className="mb-8 bg-gradient-to-r from-indigo-50/50 to-white dark:from-slate-900/40 dark:to-slate-950 p-6 rounded-2xl border border-indigo-100/50 dark:border-slate-850 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1.5">Interactive Student Speaking Lab</h2>
            <p className="text-sm text-slate-500 dark:text-slate-450 max-w-xl">
              Conduct high-accuracy lesson recordings using <strong>system tab sharing</strong> or microphone streams. Generate comprehensive grammatical feedback metrics, pronunciation timelines, and structured teacher-guided lessons instantly.
            </p>
          </div>
          <div className="flex md:flex-col items-start gap-2.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold justify-between border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
            <div className="flex items-center"><CheckCircle size={14} className="mr-1 text-emerald-500" /> Topic Timeline Clustering</div>
            <div className="flex items-center"><CheckCircle size={14} className="mr-1 text-emerald-500" /> Active vs Receptive Lexis</div>
            <div className="flex items-center"><CheckCircle size={14} className="mr-1 text-emerald-500" /> Speech On-Hover Narration</div>
          </div>
        </div>

        {/* Global error alerts block */}
        {status === 'error' && error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4 flex items-start text-red-700 dark:text-red-400">
            <AlertTriangle className="mr-3 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Workspace core body split */}
        {!teacherReport && status !== 'processing' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Columns - Student Roster & Core parameters */}
            <div className="lg:col-span-1 space-y-6">
              <StudentRoster 
                onSelectedStudentChange={setActiveStudent} 
                activeStudent={activeStudent}
                teacherReport={teacherReport}
              />
            </div>

            {/* Right Column - Voice recording tabs workspace */}
            <div className="lg:col-span-2 space-y-6">
              {/* Input Selection Tabs */}
              <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 inline-flex w-full transition-colors duration-300">
                <button
                  type="button"
                  onClick={() => { setMode('record'); handleReset(); }}
                  className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all ${
                    mode === 'record' 
                      ? 'bg-indigo-650 text-white shadow-sm font-bold' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Mic size={14} className="mr-1.5" />
                  Record Audio Stream
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('upload'); handleReset(); }}
                  className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all ${
                    mode === 'upload' 
                      ? 'bg-indigo-650 text-white shadow-sm font-bold' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-805'
                  }`}
                >
                  <Upload size={14} className="mr-1.5" />
                  Upload Lesson File
                </button>
              </div>

              {/* Main Content card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-205 dark:border-slate-800 p-6 sm:p-8 transition-colors duration-300">
                {mode === 'record' ? (
                  <AudioRecorder onAudioCaptured={handleAudioReady} disabled={status === 'processing'} />
                ) : (
                  <FileUploader onFileSelected={handleAudioReady} disabled={status === 'processing'} />
                )}

                {/* Confirm analysis parameters */}
                {audioData && (
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 gap-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Audio Source Loaded: <strong>{audioData.blob.size > 1024 * 1024 ? (audioData.blob.size / (1024 * 1024)).toFixed(1) + 'MB' : (audioData.blob.size / 1024).toFixed(0) + 'KB'}</strong> • Target Student: <strong className="text-indigo-600 dark:text-indigo-400">{activeStudent?.name || "None Selected"}</strong>
                    </div>
                    <Button 
                      onClick={handleTranscribeAndAnalyze} 
                      isLoading={status === 'processing'}
                      className="w-full sm:w-auto"
                      icon={<Sparkles size={16} />}
                    >
                      Assess & Generate Scorecard
                    </Button>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : null}

        {/* Unified Processing Pipelines layout */}
        {status === 'processing' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-lg max-w-xl mx-auto my-12 transition-colors duration-300">
            <div className="flex justify-center mb-6">
               <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                      <Sparkles size={24} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  </div>
               </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              {analysisStatus === 'transcribing' ? "Transcribing Spoken Audio..." : "Generating Grammar Corrections..."}
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {analysisStatus === 'transcribing' 
                ? "Gemini is performing advanced diarization, distinguishing timestamps, and identifying spoken context segments." 
                : "Analyzing verb tenses, checking prepositions and word choice structures, evaluating phoneme heatmaps, and compiling your 5-bullet mini-lesson."}
            </p>
          </div>
        )}

        {/* Results view layout */}
        {status === 'success' && teacherReport && activeStudent && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 flex items-center uppercase tracking-wider">
                <CheckCircle size={20} className="mr-2 text-emerald-500" />
                Speech Assessment Report Complete
              </h2>
              <Button onClick={handleReset} variant="secondary" className="text-xs py-2">
                Analyze Another Audio File
              </Button>
            </div>
            
            <TranscriptionDisplay 
              feedback={teacherReport} 
              student={activeStudent}
              transcription={transcription}
              onReRunGemini={handleTranscribeAndAnalyze}
              onUpdateFeedback={(updated) => setTeacherReport(updated)}
            />
          </div>
        )}

      </main>

      {/* 4. Onboarding Gemini API key setup Dialog modal overlay */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 grid place-items-center z-50 p-4 transition-all duration-300 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-2.5 text-indigo-600 dark:text-indigo-400 font-bold mb-4">
              <Key size={20} />
              <h2 className="text-base font-bold text-slate-905 dark:text-white">Gemini API Key Required</h2>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              To keep your recordings completely private, Tutorly runs 100% in the browser. Enter your personal Gemini API key. This key is stored in your local browser and never sent to any server.
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-3.5 rounded-xl mb-4">
              <div className="flex items-start space-x-2.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-1">How can I secure an API key?</span>
                  Create or obtain a free-tier API key in 5 seconds on the <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="font-bold underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-800">Google AI Studio Homepage</a>.
                </div>
              </div>
            </div>

            <form onSubmit={handleVerifyAndSaveKey} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">API Credentials Key</label>
                <div className="relative">
                  <input 
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="AIzaSy..."
                    disabled={isValidatingKey}
                  />
                </div>
              </div>

              {onboardingError && (
                <div className="text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-2.5 rounded-lg border border-red-200 dark:border-red-900/40">
                  {onboardingError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                {getStoredApiKey() && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsKeyModalOpen(false)}
                    disabled={isValidatingKey}
                    className="text-xs py-2"
                  >
                    Cancel
                  </Button>
                )}
                
                <Button 
                  type="submit" 
                  isLoading={isValidatingKey}
                  className="text-xs py-2 px-5"
                >
                  Verify & Get Started
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
