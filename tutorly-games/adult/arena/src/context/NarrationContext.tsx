import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface NarrationContextValue {
  isSpeaking: boolean;
  isPaused: boolean;
  currentText: string;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  setSelectedVoice: (name: string) => void;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  togglePause: () => void;
}

const NarrationContext = createContext<NarrationContextValue | null>(null);

const VOICE_STORAGE_KEY = 'combat_arena_voice';

export function NarrationProvider({ children }: { children: React.ReactNode }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoiceState] = useState(() => {
    try { return localStorage.getItem(VOICE_STORAGE_KEY) || ''; } catch { return ''; }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const selectedVoiceRef = useRef(selectedVoice);

  // Keep ref in sync
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);

  const setSelectedVoice = useCallback((name: string) => {
    setSelectedVoiceState(name);
    selectedVoiceRef.current = name;
    try { localStorage.setItem(VOICE_STORAGE_KEY, name); } catch {}
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      setVoices(v);
      // If no voice selected yet, pick the best natural English voice available
      if (!selectedVoiceRef.current && v.length > 0) {
        // Priority: Edge natural voices > Google > any English > fallback
        const good =
          v.find(voice => voice.name.includes('Online') && voice.lang.startsWith('en') && !voice.name.includes('David'))
          || v.find(voice => voice.name.includes('Natural') && voice.lang.startsWith('en'))
          || v.find(voice => voice.name.includes('Google') && voice.lang.startsWith('en'))
          || v.find(voice => voice.lang.startsWith('en-US') && !voice.name.includes('David'))
          || v.find(voice => voice.lang.startsWith('en') && !voice.name.includes('David'))
          || v.find(voice => voice.lang.startsWith('en'))
          || v[0];
        if (good) setSelectedVoice(good.name);
      }
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, [setSelectedVoice]);

  // FORCED: All speech uses selectedVoice, ignoring any other voice param
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    setIsPaused(false);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.95;
    utterance.rate = 0.82;
    utterance.volume = 1;

    // FORCE the selected God voice on everything
    const voiceName = selectedVoiceRef.current;
    if (voiceName) {
      const allVoices = window.speechSynthesis.getVoices();
      const voice = allVoices.find(v => v.name === voiceName);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => { setIsSpeaking(true); setCurrentText(text); };
    utterance.onend = () => { setIsSpeaking(false); setCurrentText(''); setIsPaused(false); };
    utterance.onpause = () => setIsPaused(true);
    utterance.onresume = () => setIsPaused(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const pause = useCallback(() => { window.speechSynthesis?.pause(); setIsPaused(true); }, []);
  const resume = useCallback(() => { window.speechSynthesis?.resume(); setIsPaused(false); }, []);
  const stop = useCallback(() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); setIsPaused(false); setCurrentText(''); }, []);
  const togglePause = useCallback(() => {
    if (!isSpeaking) return;
    if (isPaused) { resume(); } else { pause(); }
  }, [isSpeaking, isPaused, resume, pause]);

  return (
    <NarrationContext.Provider value={{
      isSpeaking, isPaused, currentText, voices, selectedVoice,
      setSelectedVoice, speak, pause, resume, stop, togglePause,
    }}>
      {children}
    </NarrationContext.Provider>
  );
}

export function useNarration() {
  const ctx = useContext(NarrationContext);
  if (!ctx) throw new Error('useNarration must be used within NarrationProvider');
  return ctx;
}
