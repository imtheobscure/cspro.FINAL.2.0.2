'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Character, Preferences } from '@/lib/types';
export function useSpeech(preferences: Preferences, onMessage?: (message: string) => void) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  /**
   * Which speech engine is in use.
   *
   * This was decided by asking the server (`/api/voice`, which answered 'azure'
   * when Microsoft Speech credentials were configured). Interview is a static app
   * now, so there is no server to hold those credentials and no Azure call to
   * make: the device's own voices are the engine, and the Settings screen says so
   * instead of promising a neural voice that cannot be reached from a web page.
   */
  const [provider] = useState('browser');
  const [voiceName, setVoiceName] = useState('Device voice');
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef('');
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const messageRef = useRef(onMessage); messageRef.current = onMessage;
  useEffect(() => { if (!('speechSynthesis' in window)) return; const load = () => setVoices(window.speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang))); load(); window.speechSynthesis.addEventListener('voiceschanged', load); return () => window.speechSynthesis.removeEventListener('voiceschanged', load); }, []);
  const stop = useCallback(() => { generation.current++; controller.current?.abort(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); if (audio.current) { audio.current.pause(); audio.current = null; } if (audioUrl.current) { URL.revokeObjectURL(audioUrl.current); audioUrl.current = ''; } setSpeaking(false); }, []);
  useEffect(() => () => { generation.current++; controller.current?.abort(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); audio.current?.pause(); if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); }, []);
  const speak = useCallback(async (text: string, character: Character) => {
    stop(); const token = generation.current;
    const browserSpeak = () => { if (token !== generation.current) return; if (!('speechSynthesis' in window)) { messageRef.current?.('Speech is not supported in this browser. Captions and typed answers remain available.'); return; } const available = window.speechSynthesis.getVoices(); const named = available.find(v => v.name === preferences.voice); const natural = available.find(v => /Microsoft/i.test(v.name) && /Natural|Online/i.test(v.name) && v.lang.startsWith(character.voice.slice(0, 5))); const microsoft = available.find(v => /Microsoft/i.test(v.name) && /^en/i.test(v.lang)); const english = available.filter(v => /^en/i.test(v.lang)); const voice = named || natural || microsoft || english[character.id % Math.max(english.length, 1)] || available[0]; const utterance = new SpeechSynthesisUtterance(text); if (voice) utterance.voice = voice; utterance.lang = voice?.lang || 'en-US'; utterance.rate = preferences.rate * character.rate; utterance.onstart = () => { if (token === generation.current) setSpeaking(true); }; utterance.onend = () => { if (token === generation.current) setSpeaking(false); }; utterance.onerror = event => { if (token === generation.current) { setSpeaking(false); if (!['interrupted', 'canceled'].includes(event.error)) messageRef.current?.('Audio could not play. Use “Play question” to retry, or continue with captions.'); } }; setVoiceName(voice?.name || 'Default device voice'); window.speechSynthesis.speak(utterance); };
    browserSpeak();
  }, [stop, preferences.rate, preferences.voice]);
  return { voices, speaking, speak, stop, provider, voiceName };
}
interface Recognition { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } } }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void; }
export function useDictation(onText: (text: string) => void, onError: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const textRef = useRef(onText); textRef.current = onText;
  const errorRef = useRef(onError); errorRef.current = onError;
  useEffect(() => { const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }; const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition; if (!Constructor) return; setSupported(true); const rec = new Constructor(); rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true; rec.onresult = event => { let draft = ''; for (let i = event.resultIndex; i < event.results.length; i++) { if (event.results[i].isFinal) textRef.current(event.results[i][0].transcript); else draft += event.results[i][0].transcript; } setInterim(draft); }; rec.onerror = event => { setListening(false); setInterim(''); const messages: Record<string, string> = { 'not-allowed': 'Microphone access was not allowed. You can enable it in browser settings or type your answer.', 'audio-capture': 'No microphone was found. You can continue by typing.', network: 'Your browser’s speech service is unavailable. Please type your answer or try again.', 'no-speech': 'No speech was detected. Try again when you are ready.' }; if (event.error !== 'aborted') errorRef.current(messages[event.error] || 'Dictation stopped. Your existing text is safe; you can keep typing.'); }; rec.onend = () => { setListening(false); setInterim(''); }; recognition.current = rec; return () => { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.abort(); }; }, []);
  const start = useCallback(() => { if (!recognition.current) { errorRef.current('Dictation is not available in this browser. Try Chrome or Edge, or type your answer.'); return; } try { recognition.current.start(); setListening(true); } catch { errorRef.current('The microphone could not start. Wait a moment and try again.'); } }, []);
  const stop = useCallback(() => { recognition.current?.stop(); setListening(false); }, []);
  return { supported, listening, interim, start, stop };
}
export function playChime(enabled: boolean, complete = false) { if (!enabled || typeof window === 'undefined') return; try { const context = new AudioContext(); const gain = context.createGain(); gain.gain.setValueAtTime(0.025, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.7); gain.connect(context.destination); [complete ? 523.25 : 440, complete ? 659.25 : 554.37, ...(complete ? [783.99] : [])].forEach((frequency, i) => { const oscillator = context.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = frequency; oscillator.connect(gain); oscillator.start(context.currentTime + i * 0.1); oscillator.stop(context.currentTime + 0.6); }); setTimeout(() => void context.close(), 900); } catch { /* Sound effects are optional. */ } }
