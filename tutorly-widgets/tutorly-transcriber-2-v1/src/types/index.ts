export type SpeakerRole = 'tutor' | 'learner';

export type AudioSourceType = 'microphone' | 'system';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface TranscriptEntry {
  id: string;
  speaker: SpeakerRole;
  text: string;
  timestamp: number;
  isFinal: boolean;
  // per-entry cached translation (based on speaker settings at time of translation)
  translation?: string;
  translatedLang?: string;
}

export interface SpeakerConfig {
  role: SpeakerRole;
  label: string;
  audioSource: AudioSourceType;
  deviceId: string | null;
  color: string;
  textColor: string;
  muted: boolean;
  active: boolean;

  // Speech recognition language (Web Speech API)
  recognitionLang: string; // e.g., 'en-US', 'fr-FR'

  // Translation
  translationLang: string; // ISO 639-1, e.g. 'en', 'fr' (empty string = off)
  autoTranslate: boolean;
  autoSpeakTranslation: boolean;

  // Text-to-speech voices (browser supported)
  ttsVoiceTranscription: string | null;
  ttsVoiceTranslation: string | null;
}

export interface SubtitleSettings {
  enabled: boolean;
  showTranslation: boolean;
  fontSize: number; // big, for interim
  historyFontSize: number; // smaller, for scrollback lines
  maxLines: number; // scrollback
  tutorColor: string;
  learnerColor: string;
  popout: boolean;
  // Floating, draggable/resizable overlay rendered on top of the app
  // (and over a video call when the browser tab is on top).
  floatingOverlay: boolean;
  // Document Picture-in-Picture — keeps subtitles visible over Zoom/Meet.
  documentPip: boolean;
}

export interface AutomationSettings {
  selectionFeedbackGoogle: boolean;
  selectionFeedbackBing: boolean;
  selectionAnswerGoogle: boolean;
  selectionAnswerBing: boolean;
  openInPopup: boolean;
  // Customisable prompts
  feedbackPrompt: string;
  answerPrompt: string;
}

export interface AppSettings {
  fontSize: number;
  theme: 'dark' | 'light';
  ghostMode: boolean;
  transcriptLayout: 'single' | 'two-column';
  subtitlePanelVisible: boolean;

  // Silence threshold for chunking (5s/10s/15s…)
  silenceGapMs: number;

  autoCorrect: boolean;
  autoSave: boolean;

  // Global TTS
  speechRate: number;

  subtitle: SubtitleSettings;
  automation: AutomationSettings;

  translationApi?: 'auto' | 'direct' | 'backend' | 'lingva' | 'allorigins';
  offlineMode?: boolean;
  transcriptionModel?: string;
  translationModel?: string;
  modelMirror?: string;
}

export type RecordingFormat = 'webm' | 'mp4' | 'mp3';
export type RecordingQuality = 'high' | 'medium' | 'low';

export interface RecordingConfig {
  format: RecordingFormat;
  quality: RecordingQuality;
  includeVideo: boolean;
  width?: number;
  height?: number;
}

export interface RecordingItem {
  id: string;
  blob: Blob;
  url: string;
  filename: string;
  size: number;
  duration: number;
  timestamp: number;
  format: string;
  hasVideo: boolean;
}

export interface GrammarSuggestion {
  original: string;
  suggestion: string;
  type: 'spelling' | 'grammar' | 'punctuation';
  offset: number;
  length: number;
}

// Session / student profile
export interface SessionProfile {
  id: string;
  learnerName: string;
  createdAt: number;
  entryCount: number;
}

