'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioManager } from '@/lib/audio';
import { langCode } from '@/lib/voices';
import type { SupportedLanguage } from '@/types/theme';

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { 0: RecognitionAlternative; length: number; isFinal: boolean };
type RecognitionEvent = { results: { length: number; [index: number]: RecognitionResult } };
type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function recognitionCtor(): (new () => RecognitionLike) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * The microphone, for the games that genuinely listen (the Whispering Wall).
 *
 * Two things this deliberately does NOT do, because they made the old version
 * lie to the child:
 *
 * 1. **It never invents a transcript.** When the browser has no speech
 *    recognition (Safari, Firefox, and most shared screens) the old version
 *    reported a made-up line — "Open magic sesame stone" — as if the child had
 *    said it, and then the game marked their real effort wrong. Now `supported`
 *    is simply false and the tutor uses the green confirm button instead, which
 *    is how `SpeakGate` works anyway.
 * 2. **It does not rebuild itself on every render.** `onResult` used to be a
 *    fresh closure each render, so the effect re-ran, stopped the recogniser and
 *    started a new one on every state change. The callback lives in a ref.
 */
export function useKidSpeechRecognition(onResult?: (text: string) => void, lang: SupportedLanguage = 'en') {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const callbackRef = useRef(onResult);
  const langRef = useRef(lang);

  callbackRef.current = onResult;
  langRef.current = lang;

  useEffect(() => {
    const Ctor = recognitionCtor();
    setSupported(Boolean(Ctor));
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = langCode(langRef.current);

    recognition.onresult = (event: RecognitionEvent) => {
      const first = event.results?.[0]?.[0]?.transcript ?? '';
      const text = first.trim();
      setTranscript(text);
      setListening(false);
      if (text) callbackRef.current?.(text);
    };
    recognition.onerror = () => {
      setListening(false);
      setError('The microphone did not hear anything this time.');
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    return () => {
      recognitionRef.current = null;
      try {
        recognition.abort();
      } catch {
        /* already stopped */
      }
    };
    // Built once: the language is read through a ref when a listen starts.
  }, []);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError('This browser cannot listen to the microphone. The tutor can press the green button instead.');
      return;
    }
    try {
      recognition.lang = langCode(langRef.current);
      AudioManager.playSound('pop');
      setError(null);
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setError('The microphone is already listening.');
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  return { listening, transcript, supported, error, startListening, stopListening, setTranscript };
}
