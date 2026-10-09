import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { cn } from './utils/cn';
import type { AppSettings, AudioDevice, RecordingConfig, SpeakerConfig, TranscriptEntry } from './types';
import { useAudioSource } from './hooks/useAudioSource';
import { useSpeechRecognition, getBrowserInfo, isSpeechRecognitionSupported } from './hooks/useSpeechRecognition';
import { useStreamRecognition } from './hooks/useStreamRecognition';
import { useMediaRecorder } from './hooks/useMediaRecorder';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useTranscriptionEngine } from './hooks/useTranscriptionEngine';
import { useFileBackup } from './hooks/useFileBackup';
// useAudioMeter removed – meters are disabled to keep app lightweight
import { saveSettings, loadSettings, saveSpeakers, loadSpeakers, createSession, getSessions, initStorage } from './utils/storage';
import { translateWithCache } from './utils/translate';
import { RECOGNITION_LANGUAGES, TRANSLATION_LANGUAGES, getSourceLangCode } from './utils/languages';

import { ToastContainer, createToast, type ToastMessage } from './components/Toast';
import { SettingsPanel } from './components/SettingsPanel';
import { TranscriptHistory } from './components/TranscriptHistory';
import { RecordingsPanel } from './components/RecordingsPanel';
import { CurrentlySpeakingLabel } from './components/CurrentlySpeakingLabel';
import { FloatingSubtitleOverlay } from './components/FloatingSubtitleOverlay';
import { useSubtitlePip } from './hooks/useSubtitlePip';
// VolumeMeter removed – meters disabled for lightweight operation

import {
  AlertCircle, BookOpen, Circle, ExternalLink, GraduationCap, History, Mic, Monitor, Play,
  Plus, Radio, Settings, Square, Video, Wifi, WifiOff, Languages, Volume2, X, PictureInPicture2, SquareStack,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   DEFAULTS
   ═══════════════════════════════════════════════════════════════════════════════ */

const DEFAULT_SPEAKER = (role: 'tutor' | 'learner'): SpeakerConfig => ({
  role,
  label: role === 'tutor' ? 'Tutor' : 'Learner',
  audioSource: 'microphone',
  deviceId: null,
  color: role === 'tutor' ? '#6366f1' : '#10b981',
  textColor: '#fff',
  muted: false,
  active: role === 'learner',
  recognitionLang: 'en-US',
  translationLang: '',
  autoTranslate: false,
  autoSpeakTranslation: false,
  ttsVoiceTranscription: null,
  ttsVoiceTranslation: null,
});

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 20,
  theme: 'dark',
  ghostMode: true,
  transcriptLayout: 'single',
  subtitlePanelVisible: true,
  silenceGapMs: 10000,
  autoCorrect: true,
  autoSave: false,
  speechRate: 1,
  subtitle: { enabled: true, showTranslation: true, fontSize: 36, historyFontSize: 13, maxLines: 4, tutorColor: '#6366f1', learnerColor: '#10b981', popout: true, floatingOverlay: false, documentPip: false },
  automation: { selectionFeedbackGoogle: false, selectionFeedbackBing: false, selectionAnswerGoogle: false, selectionAnswerBing: false, openInPopup: true, feedbackPrompt: 'Give detailed grammar/naturalness feedback and provide an improved version for:', answerPrompt: 'Answer this question clearly and concisely:' },
  offlineMode: false,
  transcriptionModel: 'Xenova/whisper-tiny',
  translationModel: 'Xenova/m2m100_418M',
};

const DEFAULT_RECORDING: RecordingConfig = { includeVideo: true, format: 'webm', quality: 'low' };

function fmt(s: number) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`; }

function openExt(provider: 'google' | 'bing', prompt: string, popup: boolean) {
  const base = provider === 'google' ? 'https://www.google.com/search?q=' : 'https://www.bing.com/search?q=';
  const url = `${base}${encodeURIComponent(prompt)}`;
  popup ? window.open(url, `tutorly_${provider}`, 'popup=yes,width=600,height=750') : window.open(url, '_blank', 'noopener');
}

/* ═══════════════════════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [speakers, setSpeakers] = useState<SpeakerConfig[]>([DEFAULT_SPEAKER('tutor'), DEFAULT_SPEAKER('learner')]);
  const [activeRole, setActiveRole] = useState<'tutor' | 'learner'>('learner');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [recordingConfig, setRecordingConfig] = useState<RecordingConfig>(DEFAULT_RECORDING);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [sourceErrors, setSourceErrors] = useState<{ tutor?: string; learner?: string }>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [subtitleCollapsed, setSubtitleCollapsed] = useState(false);
  const [_sessions, setSessions] = useState<{ id: string; learnerName: string; createdAt: number; entryCount: number }[]>([]);
  const [_currentSessionName, setCurrentSessionName] = useState('');
  const [offlineModelReady, setOfflineModelReady] = useState(false);
  const [_offlineLoading, setOfflineLoading] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [offlineStatus, setOfflineStatus] = useState('');

  const browserInfo = getBrowserInfo();
  const isDark = settings.theme === 'dark';

  // Stable refs for callbacks
  const refs = useRef({ speakers, settings, activeRole, isTranscribing });
  refs.current = { speakers, settings, activeRole, isTranscribing };

  const addToast = useCallback((t: ToastMessage['type'], m: string, d?: number) => setToasts(p => [...p.slice(-2), createToast(t, m, d)]), []);
  const dismissToast = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), []);

  // Audio sources
  const tutorSource = useAudioSource();
  const learnerSource = useAudioSource();

  // Transcription engine – ghost mode keeps only 20 entries in memory
  const engine = useTranscriptionEngine(settings.autoSave, settings.silenceGapMs, settings.ghostMode ? 20 : 150);

  // Recording
  const recorder = useMediaRecorder();

  // TTS
  const tts = useSpeechSynthesis();

  // File Backup
  const { pickBackupDirectory, createSessionDocument, appendToFile, isFileBackupReady, backupDir, clearBackup } = useFileBackup();



  /* ── Lifecycle ── */
  useEffect(() => {
    const on = () => { setIsOnline(true); addToast('success', 'Online'); };
    const off = () => { setIsOnline(false); addToast('error', 'Offline'); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [addToast]);

  useEffect(() => {
    // Settings/speakers are synchronous localStorage reads
    const s = loadSettings();
    if (s) setSettings(prev => ({ ...prev, ...s, subtitle: { ...prev.subtitle, ...(s as any).subtitle }, automation: { ...prev.automation, ...(s as any).automation } }));
    const sp = loadSpeakers();
    if (sp?.length) setSpeakers(sp.map((x: any) => ({ ...DEFAULT_SPEAKER(x.role), ...x })));

    // Init session storage (async, but fires once)
    initStorage().then(() => {
      getSessions().then(sl => {
        setSessions(sl);
        const active = localStorage.getItem('tutorly_active_session');
        const p = sl.find(x => x.id === active);
        if (p) setCurrentSessionName(p.learnerName);
      });
    });
  }, []);

  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveSpeakers(speakers); }, [speakers]);

  // Single unified offline initialization flow.
  // When offlineMode turns ON: loads models → tests → sets ready.
  // When offlineMode turns OFF: clears state.
  // When model selection changes while offline: reloads.
  const offlineInitRef = useRef<number>(0);
  const initOfflineModels = useCallback(async () => {
    const initId = ++offlineInitRef.current;

    if (!settings.offlineMode) {
      setOfflineModelReady(false);
      setOfflineLoading(false);
      setOfflineError(null);
      setOfflineStatus('');
      return;
    }

    setOfflineLoading(true);
    setOfflineError(null);
    setOfflineStatus('Loading offline models...');

    const timeoutId = setTimeout(() => {
      setOfflineStatus('Still loading — model files may be large (check console)');
    }, 30000);

    try {
      const { initAIWorker, testOfflineModels } = await import('./utils/translate');

      if (initId !== offlineInitRef.current) return; // stale

      // Load the models (idempotent if already loaded)
      await initAIWorker(['translate', 'recognize']);

      if (initId !== offlineInitRef.current) return; // stale

      // Test them to confirm they work
      const res = await testOfflineModels();

      if (initId !== offlineInitRef.current) return; // stale

      if (res.success) {
        setOfflineModelReady(true);
        setOfflineStatus('Ready');
        setOfflineError(null);
      } else {
        setOfflineModelReady(false);
        setOfflineError(res.message);
        setOfflineStatus('Failed: ' + res.message.slice(0, 60));
      }
    } catch (err: any) {
      if (initId !== offlineInitRef.current) return; // stale
      const msg = err?.message || 'Init failed';
      setOfflineModelReady(false);
      setOfflineError(msg);
      setOfflineStatus('Error: ' + msg.slice(0, 60));
    } finally {
      clearTimeout(timeoutId);
      if (initId === offlineInitRef.current) {
        setOfflineLoading(false);
      }
    }
  }, [settings.offlineMode, (settings as any).translationModel, (settings as any).transcriptionModel]);

  useEffect(() => {
    initOfflineModels();
  }, [initOfflineModels]);

  // Save on unload
  useEffect(() => {
    const h = () => { import('./utils/storage').then(m => m.forceFlush()); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const refreshDevices = useCallback(async () => setAudioDevices(await tutorSource.enumerateDevices()), [tutorSource]);
  useEffect(() => { refreshDevices(); }, []);

  /* ── Speech recognition ── */
  const tutorRec = useSpeechRecognition({
    speaker: 'tutor', lang: speakers.find(s => s.role === 'tutor')?.recognitionLang || 'en-US',
    continuous: true, interimResults: true,
    onResult: r => { if (!refs.current.speakers.find(s => s.role === 'tutor')?.muted) engine.handleResult('tutor', r.transcript, r.isFinal); },
    onError: e => { if (!e.includes('no-speech') && !e.includes('aborted')) addToast('error', `Tutor: ${e}`); },
    onEnd: () => {},
  });

  const learnerRec = useSpeechRecognition({
    speaker: 'learner', lang: speakers.find(s => s.role === 'learner')?.recognitionLang || 'en-US',
    continuous: true, interimResults: true,
    onResult: r => { if (!refs.current.speakers.find(s => s.role === 'learner')?.muted) engine.handleResult('learner', r.transcript, r.isFinal); },
    onError: e => { if (!e.includes('no-speech') && !e.includes('aborted')) addToast('error', `Learner: ${e}`); },
    onEnd: () => {},
  });

  useEffect(() => {
    tutorRec.setLanguage(speakers.find(s => s.role === 'tutor')?.recognitionLang || 'en-US');
    learnerRec.setLanguage(speakers.find(s => s.role === 'learner')?.recognitionLang || 'en-US');
  }, [speakers]);

  /* ── Stream-based recognition for system audio ── */
  const tutorStreamRec = useStreamRecognition({
    speaker: 'tutor',
    lang: speakers.find(s => s.role === 'tutor')?.recognitionLang || 'en-US',
    onResult: r => { if (!refs.current.speakers.find(s => s.role === 'tutor')?.muted) engine.handleResult('tutor', r.transcript, r.isFinal); },
    onError: e => addToast('warning', `Tutor stream: ${e}`),
  });

  const learnerStreamRec = useStreamRecognition({
    speaker: 'learner',
    lang: speakers.find(s => s.role === 'learner')?.recognitionLang || 'en-US',
    onResult: r => { if (!refs.current.speakers.find(s => s.role === 'learner')?.muted) engine.handleResult('learner', r.transcript, r.isFinal); },
    onError: e => addToast('warning', `Learner stream: ${e}`),
  });

  /* ── Ensure stream helper ── */
  const ensureStream = useCallback(async (role: 'tutor' | 'learner') => {
    const sp = refs.current.speakers.find(s => s.role === role)!;
    const src = role === 'tutor' ? tutorSource : learnerSource;
    if (src.state.stream) return true;
    setSourceErrors(e => ({ ...e, [role]: undefined }));
    if (sp.audioSource === 'microphone') {
      const s = await src.acquireMicrophone(sp.deviceId);
      if (!s) { setSourceErrors(e => ({ ...e, [role]: src.state.error ?? 'Mic failed' })); addToast('error', src.state.error ?? 'Mic failed'); return false; }
      return true;
    }
    addToast('info', 'Select tab/window, enable "Share audio"', 7000);
    const s = await src.acquireSystemAudio();
    if (!s) { setSourceErrors(e => ({ ...e, [role]: src.state.error ?? 'System audio failed' })); addToast('warning', src.state.error ?? 'System audio failed'); return false; }
    return true;
  }, [tutorSource, learnerSource, addToast]);

  /* ── Start recognition for a specific role (picks correct engine) ── */
  const startRecForRole = useCallback((role: 'tutor' | 'learner') => {
    const sp = refs.current.speakers.find(s => s.role === role)!;
    const src = role === 'tutor' ? tutorSource : learnerSource;

    // OFFLINE mode → always use the local Whisper engine, regardless of
    // whether the source is a microphone (with selected device) or system/
    // tab audio. Pass the already-acquired stream in so offline mode
    // respects the user's chosen source instead of grabbing the default mic.
    if (refs.current.settings.offlineMode) {
      const rec = role === 'tutor' ? tutorRec : learnerRec;
      rec.start(src.state.stream);
      return;
    }

    if (sp.audioSource === 'system' && src.state.stream) {
      // System audio → use stream-based recognition (sends audio to Google endpoint)
      const streamRec = role === 'tutor' ? tutorStreamRec : learnerStreamRec;
      streamRec.start(src.state.stream);
    } else {
      // Microphone → use browser's built-in SpeechRecognition (fastest, most reliable)
      const rec = role === 'tutor' ? tutorRec : learnerRec;
      rec.start();
    }
  }, [tutorSource, learnerSource, tutorRec, learnerRec, tutorStreamRec, learnerStreamRec]);

  const stopRecForRole = useCallback((role: 'tutor' | 'learner') => {
    if (role === 'tutor') { tutorRec.stop(); tutorStreamRec.stop(); }
    else { learnerRec.stop(); learnerStreamRec.stop(); }
  }, [tutorRec, learnerRec, tutorStreamRec, learnerStreamRec]);

  /* ── Start / Stop ── */
  const startTranscription = useCallback(async () => {
    if (!isOnline && !refs.current.settings.offlineMode) { addToast('error', 'Offline'); return; }

    const role = refs.current.activeRole;
    const sp = refs.current.speakers.find(s => s.role === role)!;
    // Web Speech API only matters for the ONLINE mic path. Offline Whisper
    // works in any browser that supports WASM, so don't block it here.
    if (!refs.current.settings.offlineMode && sp.audioSource === 'microphone' && !isSpeechRecognitionSupported()) {
      addToast('error', `Mic recognition not supported in ${browserInfo.name}. Use Chrome/Edge.`);
      return;
    }

    if (!(await ensureStream(role))) return;
    setIsTranscribing(true);
    startRecForRole(role);
    addToast('success', `${sp.label} transcription started`);
  }, [isOnline, browserInfo.name, ensureStream, startRecForRole, addToast]);

  const stopTranscription = useCallback(() => {
    stopRecForRole('tutor');
    stopRecForRole('learner');
    engine.flushAll();
    setIsTranscribing(false);
    addToast('info', 'Stopped');
  }, [stopRecForRole, engine, addToast]);

  const toggleTranscription = useCallback(() => refs.current.isTranscribing ? stopTranscription() : startTranscription(), [startTranscription, stopTranscription]);

  /* ── Switch speaker (stops current, starts new) ── */
  const switchSpeaker = useCallback(() => {
    const current = refs.current.activeRole;
    const next = current === 'tutor' ? 'learner' : 'tutor';
    setActiveRole(next);
    if (refs.current.isTranscribing) {
      stopRecForRole(current);
      // Ensure new role has a stream, then start
      const sp = refs.current.speakers.find(s => s.role === next)!;
      const src = next === 'tutor' ? tutorSource : learnerSource;
      if (src.state.stream) {
        setTimeout(() => startRecForRole(next), 150);
      } else {
        // Need to acquire stream first
        (async () => {
          if (sp.audioSource === 'microphone') {
            await src.acquireMicrophone(sp.deviceId);
          } else {
            addToast('info', 'Select tab/window, enable "Share audio"', 7000);
            await src.acquireSystemAudio();
          }
          if (src.state.stream) startRecForRole(next);
          else addToast('error', 'Failed to get audio for ' + sp.label);
        })();
      }
    }
  }, [stopRecForRole, startRecForRole, tutorSource, learnerSource, addToast]);

  const setActiveRoleDirect = useCallback((role: 'tutor' | 'learner') => {
    if (role === refs.current.activeRole) return;
    const prev = refs.current.activeRole;
    setActiveRole(role);
    if (refs.current.isTranscribing) {
      stopRecForRole(prev);
      const sp = refs.current.speakers.find(s => s.role === role)!;
      const src = role === 'tutor' ? tutorSource : learnerSource;
      if (src.state.stream) {
        setTimeout(() => startRecForRole(role), 150);
      } else {
        (async () => {
          if (sp.audioSource === 'microphone') {
            await src.acquireMicrophone(sp.deviceId);
          } else {
            addToast('info', 'Select tab/window, enable "Share audio"', 7000);
            await src.acquireSystemAudio();
          }
          if (src.state.stream) startRecForRole(role);
          else addToast('error', 'Failed to get audio for ' + sp.label);
        })();
      }
    }
  }, [stopRecForRole, startRecForRole, tutorSource, learnerSource, addToast]);

  /* ── New Session ── */
  const startNewSession = useCallback(async () => {
    const name = window.prompt('Enter learner name for the new session:');
    if (!name || !name.trim()) return; // cancelled
    if (refs.current.isTranscribing) stopTranscription();
    await createSession(name.trim());
    engine.clearTranscriptData();
    setCurrentSessionName(name.trim());
    setSessions(await getSessions());
    // Auto-create backup document if backup dir is set
    if (isFileBackupReady) {
      const res = await createSessionDocument(name.trim());
      if (res.ok) addToast('success', `Saving to "${name.trim()}.txt"`);
      else if (res.error) addToast('warning', `Backup file error: ${res.error}`);
    }
    addToast('success', `Session "${name.trim()}" created`);
  }, [stopTranscription, engine, addToast, isFileBackupReady, createSessionDocument]);

  /* ── Recording ── */
  const startRecording = useCallback(async () => {
    const role = refs.current.activeRole;
    const src = role === 'tutor' ? tutorSource : learnerSource;
    let stream: MediaStream | null = null;
    if (recordingConfig.includeVideo) {
      stream = await src.acquireScreenWithVideo();
    } else {
      stream = src.state.stream;
      if (!stream) { if (!(await ensureStream(role))) return; stream = src.state.stream; }
    }
    if (!stream) { addToast('error', 'No stream'); return; }
    recorder.startRecording(stream, recordingConfig);
    addToast('success', 'Recording started');
  }, [recordingConfig, tutorSource, learnerSource, recorder, ensureStream, addToast]);

  /* ── Translation helpers ── */
  const translateEntry = useCallback(async (entryId: string) => {
    const entry = engine.transcript.find(e => e.id === entryId);
    if (!entry) return;
    const sp = refs.current.speakers.find(s => s.role === entry.speaker);
    if (!sp?.translationLang) { addToast('warning', 'Set translation language in Settings > Language'); return; }
    setTranslatingId(entryId);
    try {
      const tr = await translateWithCache(entry.text, sp.translationLang, getSourceLangCode(sp.recognitionLang), refs.current.settings.translationApi);
      engine.updateEntryTranslation(entryId, tr, sp.translationLang);
    } catch { addToast('error', 'Translation failed'); }
    finally { setTranslatingId(null); }
  }, [engine, addToast]);

  const speakWithVoice = useCallback((text: string, voice: string | null) => {
    if (!tts.isSupported) return;
    tts.speak(text, voice || undefined, refs.current.settings.speechRate);
  }, [tts]);

  const speakTranscription = useCallback((e: TranscriptEntry) => {
    const sp = refs.current.speakers.find(s => s.role === e.speaker);
    speakWithVoice(e.text, sp?.ttsVoiceTranscription ?? null);
  }, [speakWithVoice]);

  const translateAndSpeak = useCallback(async (e: TranscriptEntry) => {
    await translateEntry(e.id);
    const updated = engine.transcript.find(x => x.id === e.id);
    const sp = refs.current.speakers.find(s => s.role === e.speaker);
    if (updated?.translation && sp) speakWithVoice(updated.translation, sp.ttsVoiceTranslation);
  }, [engine.transcript, translateEntry, speakWithVoice]);

  /* ── Auto-translate and File Backup for new chunks ── */
  const lastAutoIdRef = useRef<string>('');
  useEffect(() => {
    const last = engine.transcript[engine.transcript.length - 1];
    if (!last || last.id === lastAutoIdRef.current) return;
    lastAutoIdRef.current = last.id;
    const sp = refs.current.speakers.find(s => s.role === last.speaker);
    
    // Process File Backup
    if (isFileBackupReady && sp) {
      void appendToFile(last, sp.label);
    }
    
    // Process Auto-translate
    if (!sp?.translationLang || !sp.autoTranslate) return;
    (async () => {
      try {
        const tr = await translateWithCache(last.text, sp.translationLang, getSourceLangCode(sp.recognitionLang), refs.current.settings.translationApi);
        engine.updateEntryTranslation(last.id, tr, sp.translationLang);
        if (sp.autoSpeakTranslation) speakWithVoice(tr, sp.ttsVoiceTranslation);
      } catch {}
    })();
  }, [engine.transcript.length, isFileBackupReady, appendToFile]);

  /* ── Selection automation ── */
  const handleSelection = useCallback((context: 'dialogue' | 'subtitle') => {
    const text = window.getSelection()?.toString().trim() || '';
    if (text.length < 4) return;
    const a = refs.current.settings.automation;
    const isFeedback = context === 'dialogue';
    const promptTemplate = isFeedback ? a.feedbackPrompt : a.answerPrompt;
    const prompt = `${promptTemplate} "${text}"`;
    if (isFeedback ? a.selectionFeedbackGoogle : a.selectionAnswerGoogle) openExt('google', prompt, a.openInPopup);
    if (isFeedback ? a.selectionFeedbackBing : a.selectionAnswerBing) openExt('bing', prompt, a.openInPopup);
  }, []);

  /* ── Subtitle popout / Document Picture-in-Picture ── */
  const subtitlePip = useSubtitlePip(settings, speakers, isDark);

  // Legacy entry point — now opens Document PIP when supported, otherwise the
  // classic window popout. Used by the header "popout" buttons.
  const openSubtitlePopout = useCallback(() => {
    if (subtitlePip.active) { subtitlePip.close(); return; }
    subtitlePip.open();
    if (!subtitlePip.supported) addToast('info', 'Pop-out opened. Use Chrome/Edge for Picture-in-Picture over calls.', 6000);
  }, [subtitlePip, addToast]);

  // Toggle the floating draggable/resizable overlay.
  const toggleFloatingOverlay = useCallback(() => {
    setSettings(p => ({ ...p, subtitle: { ...p.subtitle, floatingOverlay: !p.subtitle.floatingOverlay } }));
  }, []);

  // Auto-open PIP when the user enables it in settings.
  useEffect(() => {
    if (settings.subtitle.documentPip && !subtitlePip.active) subtitlePip.open();
  }, [settings.subtitle.documentPip]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Hotkeys (Ctrl+Shift combos to avoid browser conflicts) ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        else if (showHistory) setShowHistory(false);
        else if (showRecordings) setShowRecordings(false);
        return;
      }

      // Ctrl+Shift+Key — safe combo that doesn't clash with browsers
      if (e.ctrlKey && e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 's': e.preventDefault(); toggleTranscription(); break;        // Ctrl+Shift+S  Start/Stop
          case ' ': e.preventDefault(); switchSpeaker(); break;              // Ctrl+Shift+Space Switch
          case 'x': e.preventDefault(); setShowSettings(v => !v); break;     // Ctrl+Shift+X  Settings
          case 'h': e.preventDefault(); setShowHistory(v => !v); break;      // Ctrl+Shift+H  History
          case 'r': e.preventDefault(); recorder.isRecording ? recorder.stopRecording() : startRecording(); break;
          case 'm': e.preventDefault(); setSpeakers(p => p.map(s => s.role === 'tutor' ? { ...s, muted: !s.muted } : s)); break;  // Ctrl+Shift+M mute tutor
          case 'l': e.preventDefault(); setSpeakers(p => p.map(s => s.role === 'learner' ? { ...s, muted: !s.muted } : s)); break;
          case 'g': e.preventDefault(); setSettings(p => ({ ...p, ghostMode: !p.ghostMode })); break;
          case 'n': e.preventDefault(); startNewSession(); break;
          case 'f': e.preventDefault(); setSettings(p => ({ ...p, subtitle: { ...p.subtitle, floatingOverlay: !p.subtitle.floatingOverlay } })); break; // Ctrl+Shift+F Floating overlay
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showSettings, showHistory, showRecordings, toggleTranscription, switchSpeaker, startRecording, startNewSession, recorder.isRecording]);

  useEffect(() => { if (recorder.error) addToast('error', recorder.error); }, [recorder.error, addToast]);

  // Prompt to set up backup directory on first load
  useEffect(() => {
    if (!isFileBackupReady) {
      const timer = setTimeout(() => {
        addToast('info', 'Go to Settings → Subtitles → "Auto-Save to .txt File" to set up auto-save to your PC', 10000);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isFileBackupReady, addToast]);

  // Cleanup
  useEffect(() => () => {
    tutorRec.abort(); learnerRec.abort();
    tutorStreamRec.stop(); learnerStreamRec.stop();
    tutorSource.releaseStream(); learnerSource.releaseStream();
    tts.stop();
  }, []);

  /* ── Derived ── */
  const tutor = speakers.find(s => s.role === 'tutor')!;
  const learner = speakers.find(s => s.role === 'learner')!;
  const activeSp = speakers.find(s => s.role === activeRole) || learner;
  // Online mic needs the Web Speech API; offline Whisper works anywhere.
  const canStartTranscription = settings.offlineMode || isSpeechRecognitionSupported();
  const visibleEntries = useMemo(() => engine.transcript.slice(-5), [engine.transcript]);

  const subtitleLines = useMemo(() => {
    return engine.transcript.slice(-Math.max(1, settings.subtitle.maxLines)).map(e => ({
      id: e.id, speaker: e.speaker, text: e.text, translation: e.translation, ts: e.timestamp,
    }));
  }, [engine.transcript, settings.subtitle.maxLines]);

  /* ── Render ── */
  return (
    <div className={cn('flex flex-col h-screen overflow-hidden', isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900')}>

      {/* ═══ HEADER ═══ */}
      <header className={cn('flex items-center gap-2 px-3 py-2 border-b shrink-0 flex-wrap', isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}>
        <div className="flex items-center gap-2 mr-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
            <Radio size={14} className="text-white" />
          </div>
          <span className={cn('font-bold text-sm hidden sm:block', isDark ? 'text-white' : 'text-slate-900')}>Tutorly Transcriber</span>
        </div>

        <button onClick={toggleTranscription} disabled={!canStartTranscription}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-sm',
            !canStartTranscription ? 'bg-slate-700 text-slate-400 cursor-not-allowed' :
              isTranscribing ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white')}>
          {isTranscribing ? <><Square size={12} /> Stop</> : <><Play size={12} /> Start</>}
        </button>

        {!recorder.isRecording ? (
          <button onClick={startRecording} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm border', isDark ? 'border-red-900 text-red-400 hover:bg-red-900/30' : 'border-red-300 text-red-600 hover:bg-red-50')} title="Ctrl+Shift+R">
            <Circle size={12} className="fill-red-500 text-red-500" /> Rec
          </button>
        ) : (
          <button onClick={() => recorder.stopRecording()} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm bg-red-600 text-white">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> {fmt(recorder.duration)}
          </button>
        )}

        {isTranscribing && (
          <span className="flex items-center gap-1.5 text-xs text-green-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
        )}



        {/* Speaker pills — click to switch active channel */}
        <div className={cn('flex items-center gap-1 px-1.5 py-1 rounded-lg ml-1', isDark ? 'bg-slate-800' : 'bg-slate-100')}>
          {[tutor, learner].map(sp => (
            <button key={sp.role} onClick={() => setActiveRoleDirect(sp.role)} title="Ctrl+Shift+Space"
              className={cn('flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-colors',
                activeRole === sp.role
                  ? sp.role === 'tutor' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                  : isDark ? 'text-slate-400' : 'text-slate-500')}>
              {sp.role === 'tutor' ? <GraduationCap size={11} /> : <BookOpen size={11} />}
              {sp.label}
              {sp.audioSource === 'system' ? <Monitor size={10} className="opacity-70" /> : <Mic size={10} className="opacity-70" />}
              {sp.muted && <span className="text-red-400 text-[10px]">🔇</span>}
            </button>
          ))}
        </div>

        {/* Offline toggle */}
        <button onClick={() => setSettings(s => ({ ...s, offlineMode: !s.offlineMode } as any))}
          title={settings.offlineMode
            ? offlineModelReady ? 'Offline mode ready' : offlineError ? `Error: ${offlineError}` : offlineStatus || 'Loading models...'
            : 'Switch to offline mode'}
          className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all relative',
            settings.offlineMode
              ? offlineModelReady
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30'
                : offlineError
                  ? 'bg-red-600/20 text-red-400 border-red-600/30'
                  : 'bg-amber-600/20 text-amber-400 border-amber-600/30'
              : isDark ? 'border-slate-700 text-slate-500 hover:text-slate-300' : 'border-slate-200 text-slate-400 hover:text-slate-600')}>
          {settings.offlineMode
            ? <><WifiOff size={12} /><span className="hidden sm:inline max-w-[120px] truncate">{offlineModelReady ? 'Offline' : offlineError ? 'Error' : offlineStatus || '...'}</span></>
            : <><Wifi size={12} /><span className="hidden sm:inline">Online</span></>
          }
        </button>

        {/* Right buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => { if (window.confirm('Start a new session?\nCurrent transcript will be cleared.')) startNewSession(); }} title="New session (Ctrl+Shift+N)"
            className={cn('p-1.5 rounded-lg border', isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100')}>
            <Plus size={14} />
          </button>
          {settings.subtitle.popout && (
            <button onClick={openSubtitlePopout} title={subtitlePip.active ? 'Close subtitles window' : 'Subtitles pop-out window'}
              className={cn('p-1.5 rounded-lg border', subtitlePip.active ? (isDark ? 'border-indigo-500 text-indigo-400 bg-indigo-950/40' : 'border-indigo-500 text-indigo-600 bg-indigo-50') : (isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100'))}>
              <ExternalLink size={14} />
            </button>
          )}
          {subtitlePip.supported && (
            <button onClick={() => { if (subtitlePip.active) subtitlePip.close(); else subtitlePip.open(); }}
              title="Picture-in-Picture over Zoom/Meet"
              className={cn('p-1.5 rounded-lg border', subtitlePip.active ? (isDark ? 'border-indigo-500 text-indigo-400 bg-indigo-950/40' : 'border-indigo-500 text-indigo-600 bg-indigo-50') : (isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100'))}>
              <PictureInPicture2 size={14} />
            </button>
          )}
          <button onClick={toggleFloatingOverlay} title="Floating subtitle overlay (drag over video call)"
            className={cn('p-1.5 rounded-lg border', settings.subtitle.floatingOverlay ? (isDark ? 'border-indigo-500 text-indigo-400 bg-indigo-950/40' : 'border-indigo-500 text-indigo-600 bg-indigo-50') : (isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100'))}>
            <SquareStack size={14} />
          </button>
          <button onClick={() => setShowRecordings(true)} title="Recordings"
            className={cn('p-1.5 rounded-lg border relative', isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100')}>
            <Video size={14} />
            {recorder.recordings.length > 0 && <span className="absolute -top-1 -right-1 px-1 rounded-full text-[10px] bg-red-500 text-white">{recorder.recordings.length}</span>}
          </button>
          <button onClick={async () => {
            if (isFileBackupReady && backupDir) {
              addToast('info', `Backup folder: ${backupDir.name}`);
            } else {
              const result = await pickBackupDirectory();
              if (result.ok) addToast('success', `Backup folder set! New sessions will auto-save.`);
              else if (result.error) addToast('error', result.error);
            }
          }} title={backupDir ? `Backup to: ${backupDir.name}` : 'Select backup folder for auto-save'}
            className={cn('p-1.5 rounded-lg border flex items-center gap-1', isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100', isFileBackupReady ? 'text-indigo-500 border-indigo-500/50' : (isDark ? 'text-slate-400' : 'text-slate-500'))}>
            <Monitor size={14} />
            {isFileBackupReady && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
          </button>
          <button onClick={() => setShowHistory(true)} title="History (Ctrl+Shift+H)"
            className={cn('p-1.5 rounded-lg border', isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100')}>
            <History size={14} />
          </button>
          <button onClick={() => setShowSettings(true)} title="Settings (Ctrl+Shift+X)"
            className={cn('p-1.5 rounded-lg border', isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100')}>
            <Settings size={14} />
          </button>
        </div>
      </header>

      {/* ═══ MAIN (dialogues render ABOVE subtitle bar) ═══ */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-3" onMouseUp={() => handleSelection('dialogue')}>
        {!isSpeechRecognitionSupported() && (
          <div className={cn('max-w-3xl mx-auto mb-3 p-3 rounded-xl border flex items-start gap-2 text-sm', isDark ? 'border-red-900 bg-red-950/40 text-red-300' : 'border-red-200 bg-red-50 text-red-700')}>
            <AlertCircle size={14} className="mt-0.5" /> Speech recognition needs Chrome or Edge.
          </div>
        )}

        {/* Stability warning when too many entries rendered */}
        {!settings.ghostMode && engine.totalCount > 80 && isTranscribing && (
          <div className={cn('max-w-3xl mx-auto mb-3 flex items-center gap-2 flex-wrap text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
            <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full border', isDark ? 'border-amber-800 text-amber-400' : 'border-amber-300 text-amber-600')}>
              ⚠ {engine.totalCount} entries — enable Ghost Mode for long sessions
              <button onClick={() => setSettings(p => ({ ...p, ghostMode: true }))} className="ml-1 opacity-70 hover:opacity-100">Enable</button>
            </span>
          </div>
        )}

        {settings.ghostMode ? (
          <div className={cn('max-w-2xl mx-auto p-5 rounded-xl border', isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-white')}>
            <div className="flex items-center justify-between">
              <div className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>👻 Ghost Mode</div>
              <button
                onClick={() => setSettings(p => ({ ...p, ghostMode: false }))}
                className={cn('px-3 py-1 rounded-lg text-xs font-medium border', isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100')}
              >
                Show Dialogue
              </button>
            </div>
            <div className={cn('text-sm mt-2', isDark ? 'text-slate-400' : 'text-slate-600')}>Dialogue hidden for maximum stability. Subtitles still work.</div>
            <div className={cn('text-sm mt-3 font-mono', isDark ? 'text-slate-300' : 'text-slate-700')}>
              {isTranscribing ? '🟢 Live' : '⚪ Stopped'} · {engine.totalCount} chunks
              {settings.autoSave && ' · Auto-saving'}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto" onMouseUp={() => handleSelection('dialogue')}>
            {visibleEntries.map(entry => {
              const sp = speakers.find(s => s.role === entry.speaker)!;
              const isTutor = entry.speaker === 'tutor';
              const canTr = !!sp.translationLang;
              const hasTr = canTr && entry.translation && entry.translatedLang === sp.translationLang;
              return (
                <div key={entry.id} className={cn('flex mb-3', isTutor ? 'justify-start' : 'justify-end')}>
                  <div className={cn('max-w-[85%] rounded-2xl border shadow-sm overflow-hidden',
                    isTutor ? (isDark ? 'bg-indigo-950/70 border-indigo-900 rounded-tl-sm' : 'bg-indigo-50 border-indigo-200 rounded-tl-sm')
                      : (isDark ? 'bg-emerald-950/70 border-emerald-900 rounded-tr-sm' : 'bg-emerald-50 border-emerald-200 rounded-tr-sm'))}>
                    <div className={cn('px-3 py-1.5 flex items-center gap-2 text-xs border-b', isDark ? 'border-slate-800/50' : 'border-slate-200/50', isTutor ? '' : 'flex-row-reverse')}>
                      <span className={cn('font-bold uppercase', isTutor ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600'))}>{sp.label}</span>
                      <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>{new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="px-3 py-2">
                      <p className={cn('leading-relaxed', isDark ? 'text-slate-100' : 'text-slate-800')} style={{ fontSize: settings.fontSize }}>{entry.text}</p>
                      {hasTr && <p className={cn('mt-1 text-sm leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-500')}>→ {entry.translation}</p>}
                    </div>
                    <div className={cn('px-2 py-1.5 flex items-center gap-0.5 border-t flex-wrap', isDark ? 'border-slate-800/50 bg-slate-900/20' : 'border-slate-200/50 bg-slate-50/50')}>
                      {tts.isSupported && <Btn onClick={() => tts.isSpeaking ? tts.stop() : speakTranscription(entry)} isDark={isDark}><Volume2 size={11} /> {tts.isSpeaking ? 'Stop' : 'Speak'}</Btn>}
                      {canTr && <Btn onClick={() => translateEntry(entry.id)} isDark={isDark} disabled={translatingId === entry.id}><Languages size={11} /> TR</Btn>}
                      {canTr && tts.isSupported && <Btn onClick={() => translateAndSpeak(entry)} isDark={isDark} disabled={translatingId === entry.id}><Languages size={10} /><Volume2 size={10} /> Auto</Btn>}
                    </div>
                  </div>
                </div>
              );
            })}
            {visibleEntries.length === 0 && !isTranscribing && (
              <div className={cn('text-center py-16', isDark ? 'text-slate-600' : 'text-slate-400')}>
                Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-xs">Ctrl+Shift+S</kbd> to start transcription
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═══ SUBTITLE BAR (docked at bottom, ABOVE footer) ═══ */}
      {settings.subtitle.enabled && !subtitleCollapsed && (
        <div className={cn('shrink-0 border-t max-h-56 overflow-y-auto', isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white border-slate-200')} onMouseUp={() => handleSelection('subtitle')}>
          {/* Subtitle toolbar */}
          <div className={cn('flex items-center gap-2 px-3 py-1.5 border-b', isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50')}>
            <span className={cn('text-[10px] font-bold uppercase tracking-widest', isDark ? 'text-slate-400' : 'text-slate-500')}>Subtitles</span>
            <div className="ml-auto flex items-center gap-1">
              {settings.subtitle.popout && (
                <button onClick={openSubtitlePopout} className={cn('p-1 rounded', isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100')} title="Pop out">
                  <ExternalLink size={12} />
                </button>
              )}
              <button onClick={() => setSubtitleCollapsed(true)} className={cn('p-1 rounded', isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100')} title="Collapse">
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Live interim text */}
          <div className="px-4 py-2">
            <CurrentlySpeakingLabel isDark={isDark} />
          </div>

          {/* Scrollback history */}
          {subtitleLines.length > 0 && (
            <div className={cn('px-4 pb-2 pt-1 border-t space-y-1.5', isDark ? 'border-slate-800/60' : 'border-slate-200')}>
              {subtitleLines.map(l => (
                <div key={l.id} className="flex flex-wrap gap-x-2">
                  <span className="text-[10px] font-bold uppercase shrink-0" style={{ color: l.speaker === 'tutor' ? settings.subtitle.tutorColor : settings.subtitle.learnerColor }}>
                    {speakers.find(s => s.role === l.speaker)?.label}
                  </span>
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'} style={{ fontSize: settings.subtitle.historyFontSize }}>{l.text}</span>
                  {settings.subtitle.showTranslation && l.translation && (
                    <span className={isDark ? 'text-slate-500' : 'text-slate-400'} style={{ fontSize: settings.subtitle.historyFontSize }}>→ {l.translation}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsed subtitle toggle */}
      {settings.subtitle.enabled && subtitleCollapsed && (
        <button onClick={() => setSubtitleCollapsed(false)} className={cn('shrink-0 border-t px-4 py-1 text-xs text-center', isDark ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600')}>
          ▲ Show Subtitles
        </button>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer className={cn('flex items-center gap-3 px-3 py-1 border-t text-xs shrink-0 flex-wrap', isDark ? 'border-slate-800 bg-slate-950 text-slate-500' : 'border-slate-200 bg-white text-slate-400')}>
        <span className={cn('flex items-center gap-1', isOnline ? 'text-green-500' : 'text-red-400')}>{isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}</span>
        <span className="flex items-center gap-1">{activeSp.audioSource === 'system' ? <Monitor size={10} /> : <Mic size={10} />} {activeSp.label}</span>
        <span className="flex items-center gap-1"><Languages size={10} /> {activeSp.recognitionLang}</span>
        <span className="ml-auto">{engine.totalCount} chunks</span>
        {settings.autoSave && <span className="text-indigo-400">Auto-save</span>}
        {recorder.isRecording && <span className="text-red-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />REC</span>}
        <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>Ctrl+Shift+N New</span>
      </footer>

      {/* ═══ PANELS ═══ */}
      {showSettings && <SettingsPanel settings={settings} speakers={speakers} onSettingsChange={setSettings} onSpeakerChange={setSpeakers} onClose={() => setShowSettings(false)}
        onTestSource={async r => { const s = r === 'tutor' ? tutorSource : learnerSource; if (!s.state.stream) { addToast('warning', 'No source'); return null; } return s.testStream(s.state.stream); }}
        onAcquireMic={async (r, d) => { const s = r === 'tutor' ? tutorSource : learnerSource; setSourceErrors(e => ({ ...e, [r]: undefined })); const st = await s.acquireMicrophone(d); if (!st) { setSourceErrors(e => ({ ...e, [r]: s.state.error ?? 'Failed' })); addToast('error', s.state.error ?? 'Failed'); } }}
        onAcquireSystem={async r => { const s = r === 'tutor' ? tutorSource : learnerSource; setSourceErrors(e => ({ ...e, [r]: undefined })); addToast('info', 'Share audio', 6000); const st = await s.acquireSystemAudio(); if (!st) { setSourceErrors(e => ({ ...e, [r]: s.state.error ?? 'Failed' })); addToast('warning', s.state.error ?? 'Failed'); } }}
        recordingConfig={recordingConfig} onRecordingConfigChange={setRecordingConfig} isDark={isDark} audioDevices={audioDevices} onRefreshDevices={refreshDevices}
        activeRole={activeRole} onSetActiveRole={setActiveRoleDirect} sourceErrors={sourceErrors}
        voices={tts.voices} recognitionLanguages={RECOGNITION_LANGUAGES} translationLanguages={TRANSLATION_LANGUAGES}
        onVerifyResult={(success) => { setOfflineLoading(false); setOfflineModelReady(success); setOfflineError(success ? null : 'Verify failed'); }}
        pickBackupDirectory={pickBackupDirectory} clearBackup={clearBackup} isFileBackupReady={isFileBackupReady} backupDirName={backupDir?.name} />}

      {showHistory && <TranscriptHistory entries={engine.transcript} speakers={speakers} settings={settings} onClose={() => setShowHistory(false)} onDelete={engine.deleteEntry} onEdit={engine.editEntry} onClear={engine.clearTranscriptData}
        onSessionSwitch={() => {
          // Reload in-memory transcript from the newly-active session
          engine.clearTranscriptData();
          getSessions().then(sl => {
            setSessions(sl);
            const p = sl.find(x => x.id === localStorage.getItem('tutorly_active_session'));
            if (p) setCurrentSessionName(p.learnerName);
          });
        }}
      />}

      {showRecordings && <RecordingsPanel recordings={recorder.recordings} onDelete={recorder.deleteRecording} onSave={recorder.saveRecording} onClear={recorder.clearRecordings} onClose={() => setShowRecordings(false)} isDark={isDark} />}

      {/* ═══ FLOATING SUBTITLE OVERLAY (draggable / resizable) ═══ */}
      {settings.subtitle.floatingOverlay && settings.subtitle.enabled && (
        <FloatingSubtitleOverlay
          settings={settings}
          speakers={speakers}
          isDark={isDark}
          pipSupported={subtitlePip.supported}
          onEnterPip={() => {
            setSettings(p => ({ ...p, subtitle: { ...p.subtitle, floatingOverlay: false, documentPip: true } }));
            subtitlePip.open();
          }}
          onClose={() => setSettings(p => ({ ...p, subtitle: { ...p.subtitle, floatingOverlay: false } }))}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

/* ── Tiny reusable components ── */

function Btn({ children, onClick, isDark, disabled }: { children: React.ReactNode; onClick: () => void; isDark: boolean; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] whitespace-nowrap', disabled ? 'opacity-40' : '', isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-700')}>{children}</button>;
}


