// Web Speech API Voice Recognition with fruit trigger detection

export interface FruitTrigger {
  word: string;
  emoji: string;
  label: string;
}

export const DEFAULT_FRUIT_TRIGGERS: FruitTrigger[] = [
  { word: 'avocado', emoji: '🥑', label: 'Avocado' },
  { word: 'blueberry', emoji: '🫐', label: 'Blueberry' },
  { word: 'kiwi', emoji: '🥝', label: 'Kiwi' },
  { word: 'mango', emoji: '🥭', label: 'Mango' },
  { word: 'coconut', emoji: '🥥', label: 'Coconut' },
  { word: 'pineapple', emoji: '🍍', label: 'Pineapple' },
  { word: 'dragonfruit', emoji: '🐉', label: 'Dragonfruit' },
  { word: 'pomegranate', emoji: '🍎', label: 'Pomegranate' },
];

export type VoiceState = 'inactive' | 'listening' | 'recognized' | 'error' | 'unsupported';

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
  };
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

class VoiceRecognitionService {
  private recognition: ISpeechRecognition | null = null;
  private isListening: boolean = false;
  private isStarting: boolean = false;
  private enabled: boolean = false;
  private currentActiveKeywords: { word: string; index: number }[] = [];
  private onMatchCallback: ((index: number, word: string) => void) | null = null;
  private onTranscriptCallback: ((transcript: string, matchedWord?: string) => void) | null = null;
  private onStatusChangeCallback: ((state: VoiceState, message?: string) => void) | null = null;
  private shouldKeepAlive: boolean = false;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      return;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isStarting = false;
        if (!this.enabled || !this.shouldKeepAlive) {
          this.recognition?.abort();
          return;
        }
        this.isListening = true;
        this.onStatusChangeCallback?.('listening', 'Microphone active - say the fruit word to select!');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.isStarting = false;
        // If user wants continuous mic on, restart
        if (this.enabled && this.shouldKeepAlive) {
          try {
            this.isStarting = true;
            this.recognition?.start();
          } catch {
            this.isStarting = false;
            this.onStatusChangeCallback?.('inactive', 'Microphone paused');
          }
        } else {
          this.onStatusChangeCallback?.('inactive', 'Microphone idle');
        }
      };

      this.recognition.onerror = (e) => {
        if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(e.error)) {
          this.shouldKeepAlive = false;
          this.isStarting = false;
        }
        if (e.error !== 'no-speech') {
          this.onStatusChangeCallback?.('error', `Mic notice: ${e.error}`);
        }
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript.toLowerCase();
          transcript += ` ${text}`;
          if (event.results[i].isFinal) finalTranscript += ` ${text}`;
        }

        let foundMatch: { word: string; index: number } | null = null;

        // Check for any of our active fruit trigger words
        for (const item of this.currentActiveKeywords) {
          const escaped = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`, 'i');
          if (regex.test(finalTranscript)) {
            foundMatch = item;
            break;
          }
        }

        if (foundMatch) {
          this.onStatusChangeCallback?.('recognized', `Identified trigger: "${foundMatch.word.toUpperCase()}"!`);
          this.onTranscriptCallback?.(transcript, foundMatch.word);
          this.onMatchCallback?.(foundMatch.index, foundMatch.word);
        } else {
          this.onTranscriptCallback?.(transcript);
        }
      };
    } catch {
      this.recognition = null;
    }
  }

  public isSupported(): boolean {
    return !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));
  }

  public setEnabled(enable: boolean) {
    this.enabled = enable;
    if (!enable) {
      this.stop();
    }
  }

  public isMicEnabled(): boolean {
    return this.enabled;
  }

  public setCallbacks(
    onMatch: (index: number, word: string) => void,
    onTranscript: (transcript: string, matchedWord?: string) => void,
    onStatusChange: (state: VoiceState, message?: string) => void
  ) {
    this.onMatchCallback = onMatch;
    this.onTranscriptCallback = onTranscript;
    this.onStatusChangeCallback = onStatusChange;
  }

  public setActiveKeywords(keywords: { word: string; index: number }[]) {
    this.currentActiveKeywords = keywords;
  }

  public startListening(keywords: { word: string; index: number }[]) {
    this.currentActiveKeywords = keywords;
    if (!this.enabled || !this.recognition) return;

    this.shouldKeepAlive = true;
    if (!this.isListening && !this.isStarting) {
      try {
        this.isStarting = true;
        this.recognition.start();
      } catch {
        this.isStarting = false;
        // Already started or restarting
      }
    }
  }

  public stop() {
    this.shouldKeepAlive = false;
    this.currentActiveKeywords = [];
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.isListening = false;
      this.isStarting = false;
    }
  }
}

export const voiceService = new VoiceRecognitionService();
