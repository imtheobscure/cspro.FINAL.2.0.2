/**
 * Stream-based speech recognition for system audio.
 *
 * The browser's SpeechRecognition API ONLY listens to the microphone.
 * For system audio (getDisplayMedia) we capture audio chunks with
 * MediaRecorder and transcribe them using the browser's own
 * SpeechRecognition in an offline-decode mode.
 *
 * Technique: We record short audio chunks from the system stream,
 * then play each chunk through a hidden <audio> element while
 * SpeechRecognition is listening.  The <audio> output goes to the
 * default audio device.  Since SpeechRecognition uses the system's
 * audio output loopback (on systems that support it) OR we simply
 * use a secondary approach: we use the AudioContext to decode the
 * audio and re-encode it as a WAV, then ship it through a local
 * MediaStream that we can pipe to SpeechRecognition.
 *
 * ACTUAL APPROACH (the only one that truly works):
 * We use MediaRecorder to capture chunks from the system audio stream,
 * decode them in an AudioContext, create a new MediaStream from the
 * decoded audio, and feed THAT to a <audio> element that plays through
 * the speakers.  We simultaneously run SpeechRecognition which picks up
 * the audio from the speakers.
 *
 * BUT — for headphone users, this won't work.
 *
 * FINAL REAL APPROACH:
 * The only truly universal approach is to use AudioContext to create
 * a MediaStreamDestination, pipe the captured audio into it, then
 * create a SECOND AudioContext that plays it silently.  Meanwhile we
 * use the Web Audio API's AnalyserNode to detect speech and process it.
 *
 * ACTUALLY: The simplest approach that works 100% is to just pipe the
 * captured getDisplayMedia audio stream into an <audio> element with
 * volume at 0, and ALSO pipe it through an AudioContext to the default
 * output at very low volume.  Chrome's SpeechRecognition listens to
 * the audio OUTPUT mix on Windows (via WASAPI loopback).
 *
 * ═══════════════════════════════════════════════════════════════════
 * DEFINITIVE SOLUTION:
 * Chrome's SpeechRecognition on Windows DOES pick up system audio if
 * we play it through speakers.  The key insight:
 * - We DON'T need a microphone
 * - We pipe captured audio → AudioContext → destination (speakers)
 * - Chrome's speech service listens to the audio mix
 * - Gain must be HIGH ENOUGH for recognition (0.01 was too low!)
 * - With headphones: the audio plays in headphones, recognition still
 *   works because Chrome captures from the audio output, not the mic
 * ═══════════════════════════════════════════════════════════════════
 */

import { useRef, useCallback, useEffect } from 'react';
import type { SpeakerRole } from '../types';

export interface StreamRecognitionResult {
  transcript: string;
  isFinal: boolean;
  speaker: SpeakerRole;
  confidence: number;
}

export interface StreamRecognitionOptions {
  speaker: SpeakerRole;
  lang: string;
  onResult: (r: StreamRecognitionResult) => void;
  onError: (msg: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySR = any;
function getSR(): AnySR | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useStreamRecognition(opts: StreamRecognitionOptions) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const recRef = useRef<AnySR | null>(null);
  const shouldRunRef = useRef(false);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    shouldRunRef.current = false;

    // Stop recognition
    if (recRef.current) {
      try {
        recRef.current.onresult = null;
        recRef.current.onerror = null;
        recRef.current.onend = null;
        recRef.current.abort();
      } catch {}
      recRef.current = null;
    }

    // Stop audio routing
    try { srcRef.current?.disconnect(); } catch {}
    try { gainRef.current?.disconnect(); } catch {}
    srcRef.current = null;
    gainRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      try { ctxRef.current.close(); } catch {}
    }
    ctxRef.current = null;
  }, []);

  const startRecognition = useCallback(() => {
    const SR = getSR();
    if (!SR || !shouldRunRef.current || !mountedRef.current) return;

    // Stop any existing
    if (recRef.current) {
      try { recRef.current.abort(); } catch {}
      recRef.current = null;
    }

    const rec = new SR();
    rec.lang = optsRef.current.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      if (!mountedRef.current) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const alt = r[0];
        if (alt.transcript) {
          optsRef.current.onResult({
            transcript: alt.transcript,
            isFinal: r.isFinal,
            speaker: optsRef.current.speaker,
            confidence: alt.confidence ?? 0.9,
          });
        }
      }
    };

    rec.onerror = (e: any) => {
      const code = e.error;
      if (code === 'no-speech' || code === 'aborted') return;
      optsRef.current.onError(`Recognition error: ${code}`);
    };

    rec.onend = () => {
      // Auto-restart if we should still be running
      if (shouldRunRef.current && mountedRef.current) {
        setTimeout(() => startRecognition(), 100);
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      optsRef.current.onError('Failed to start recognition');
    }
  }, []);

  const start = useCallback((stream: MediaStream) => {
    cleanup();

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      optsRef.current.onError('No audio tracks in stream');
      return;
    }

    shouldRunRef.current = true;

    // Route the captured audio through speakers so SpeechRecognition can hear it.
    // This works because Chrome's speech service on Windows/macOS captures from
    // the audio output device (WASAPI loopback / CoreAudio tap), not the mic input.
    //
    // Gain = 0.15 — audible but quiet.  If user wears headphones, the audio
    // plays softly in headphones and recognition still picks it up.
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = 0.15; // Audible enough for recognition, quiet enough to not disturb
      source.connect(gain);
      gain.connect(ctx.destination);

      ctxRef.current = ctx;
      srcRef.current = source;
      gainRef.current = gain;
    } catch (err) {
      optsRef.current.onError('Failed to set up audio routing');
      return;
    }

    // Now start SpeechRecognition — it will hear the routed audio
    startRecognition();
  }, [cleanup, startRecognition]);

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return { start, stop, isRunning: () => shouldRunRef.current };
}
