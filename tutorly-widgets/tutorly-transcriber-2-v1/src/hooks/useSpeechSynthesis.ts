import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface VoiceInfo {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  isLocal: boolean;
}

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      const voiceInfos: VoiceInfo[] = availableVoices.map(v => ({
        voice: v,
        name: v.name,
        lang: v.lang,
        isLocal: v.localService,
      }));

      // Sort: prioritize Edge voices, then by language
      voiceInfos.sort((a, b) => {
        // Microsoft Edge voices first
        const aEdge = a.name.includes('Microsoft') || a.name.includes('Edge');
        const bEdge = b.name.includes('Microsoft') || b.name.includes('Edge');
        if (aEdge && !bEdge) return -1;
        if (!aEdge && bEdge) return 1;
        return a.name.localeCompare(b.name);
      });

      setVoices(voiceInfos);

      // Auto-select a good default voice
      if (!selectedVoice && voiceInfos.length > 0) {
        // Try to find Microsoft Ava or similar
        const ava = voiceInfos.find(v => 
          v.name.toLowerCase().includes('ava') || 
          v.name.toLowerCase().includes('aria') ||
          v.name.toLowerCase().includes('jenny')
        );
        const microsoft = voiceInfos.find(v => v.name.includes('Microsoft'));
        const defaultVoice = ava || microsoft || voiceInfos[0];
        setSelectedVoice(defaultVoice.name);
      }
    };

    // Load immediately
    loadVoices();

    // Also listen for voiceschanged (Chrome loads voices async)
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Speak text
  const speak = useCallback((text: string, voiceName?: string, rate: number = 1, pitch: number = 1) => {
    if (!isSupported || !text.trim()) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const targetVoiceName = voiceName || selectedVoice;
    
    if (targetVoiceName) {
      const voice = voices.find(v => v.name === targetVoiceName);
      if (voice) {
        utterance.voice = voice.voice;
        utterance.lang = voice.lang;
      }
    }

    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [isSupported, selectedVoice, voices]);

  // Stop speaking
  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  // Pause/resume
  const pause = useCallback(() => {
    if (isSupported) speechSynthesis.pause();
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported) speechSynthesis.resume();
  }, [isSupported]);

  // Get voices for a specific language
  const getVoicesForLanguage = useCallback((langCode: string): VoiceInfo[] => {
    const normalizedCode = langCode.toLowerCase().split('-')[0];
    return voices.filter(v => v.lang.toLowerCase().startsWith(normalizedCode));
  }, [voices]);

  return useMemo(() => ({
    voices,
    selectedVoice,
    setSelectedVoice,
    isSpeaking,
    isSupported,
    speak,
    stop,
    pause,
    resume,
    getVoicesForLanguage,
  }), [voices, selectedVoice, setSelectedVoice, isSpeaking, isSupported, speak, stop, pause, resume, getVoicesForLanguage]);
}
