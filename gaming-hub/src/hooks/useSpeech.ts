import { useCallback, useEffect, useRef, useState } from "react";

export interface VoiceOption {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
}

interface UseSpeechReturn {
  voices: VoiceOption[];
  voice: VoiceOption | null;
  setVoiceByName: (name: string) => void;
  rate: number;
  setRate: (n: number) => void;
  pitch: number;
  setPitch: (n: number) => void;
  volume: number;
  setVolume: (n: number) => void;
  muted: boolean;
  setMuted: (b: boolean) => void;
  speak: (text: string, opts?: { interrupt?: boolean }) => void;
  stop: () => void;
  speaking: boolean;
  supported: boolean;
}

const STORAGE_KEY = "alh_speech_settings_v1";

interface Persisted {
  voiceName?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  muted?: boolean;
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePersisted(p: Persisted) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* */ }
}

export function useSpeech(): UseSpeechReturn {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const persisted = useRef<Persisted>(loadPersisted());

  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voice, setVoice] = useState<VoiceOption | null>(null);
  const [rate, _setRate] = useState<number>(persisted.current.rate ?? 1);
  const [pitch, _setPitch] = useState<number>(persisted.current.pitch ?? 1.05);
  const [volume, _setVolume] = useState<number>(persisted.current.volume ?? 1);
  const [muted, _setMuted] = useState<boolean>(persisted.current.muted ?? false);
  const [speaking, setSpeaking] = useState(false);

  // Persist helpers
  const setRate = (n: number) => { _setRate(n); savePersisted({ ...persisted.current, rate: n }); persisted.current.rate = n; };
  const setPitch = (n: number) => { _setPitch(n); savePersisted({ ...persisted.current, pitch: n }); persisted.current.pitch = n; };
  const setVolume = (n: number) => { _setVolume(n); savePersisted({ ...persisted.current, volume: n }); persisted.current.volume = n; };
  const setMuted = (b: boolean) => { _setMuted(b); savePersisted({ ...persisted.current, muted: b }); persisted.current.muted = b; if (b) window.speechSynthesis?.cancel(); };

  // Load voices (async on most browsers)
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    const load = () => {
      const list = synth.getVoices()
        .map(v => ({ name: v.name, lang: v.lang, voice: v }))
        .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
      setVoices(list);
      if (list.length) {
        const wanted = persisted.current.voiceName;
        const found = wanted ? list.find(v => v.name === wanted) : null;
        // Prefer a natural English voice as default
        const preferred = found
          ?? list.find(v => /natural|google|samantha|alex|aria|jenny/i.test(v.name) && v.lang.startsWith("en"))
          ?? list.find(v => v.lang.startsWith("en"))
          ?? list[0];
        setVoice(preferred);
      }
    };
    load();
    synth.onvoiceschanged = load;
    return () => { synth.onvoiceschanged = null; };
  }, [supported]);

  const setVoiceByName = useCallback((name: string) => {
    const v = voices.find(x => x.name === name) ?? null;
    setVoice(v);
    if (v) {
      persisted.current.voiceName = name;
      savePersisted({ ...persisted.current, voiceName: name });
    }
  }, [voices]);

  const speak = useCallback((text: string, opts?: { interrupt?: boolean }) => {
    if (!supported || muted || !text) return;
    const synth = window.speechSynthesis;
    if (opts?.interrupt !== false) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice.voice;
    u.rate = rate;
    u.pitch = pitch;
    u.volume = volume;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }, [supported, muted, voice, rate, pitch, volume]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return {
    voices, voice, setVoiceByName,
    rate, setRate, pitch, setPitch, volume, setVolume,
    muted, setMuted, speak, stop, speaking, supported,
  };
}
