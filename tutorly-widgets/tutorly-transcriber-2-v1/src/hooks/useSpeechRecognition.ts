import { useRef, useCallback, useEffect } from 'react';
import type { SpeakerRole } from '../types';

export interface RecognitionResult {
  transcript: string;
  isFinal: boolean;
  speaker: SpeakerRole;
  confidence: number;
}

export interface UseSpeechRecognitionOptions {
  speaker: SpeakerRole;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onResult: (result: RecognitionResult) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

function getSpeechRecognitionClass(): AnySpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return !!getSpeechRecognitionClass();
}

export function getBrowserInfo(): { name: string; supportsRecognition: boolean } {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return { name: 'Microsoft Edge', supportsRecognition: true };
  if (ua.includes('Chrome/')) return { name: 'Google Chrome', supportsRecognition: true };
  if (ua.includes('Firefox/')) return { name: 'Mozilla Firefox', supportsRecognition: false };
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return { name: 'Safari', supportsRecognition: false };
  return { name: 'Unknown', supportsRecognition: false };
}

const RESTART_INTERVAL_MS = 10 * 60 * 1000;
const MAX_ERRORS_BEFORE_PAUSE = 5;

/**
 * Fixed-capacity ring buffer for offline WASM audio capture.
 *
 * Replaces the previous approach of reallocating + copying a growing
 * Float32Array on every 4096-sample `onaudioprocess` tick. With this we only
 * allocate the per-chunk views (no copy) until we flush, and then a single
 * contiguous copy is made for the worker — drastically reducing GC pressure.
 */
class AudioRingBuffer {
  private chunks: Float32Array[] = [];
  private _sampleCount = 0;

  push(chunk: Float32Array) {
    this.chunks.push(chunk);
    this._sampleCount += chunk.length;
  }

  get sampleCount() {
    return this._sampleCount;
  }

  flush(): Float32Array {
    const total = this.chunks.reduce((n, c) => n + c.length, 0);
    const out = new Float32Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    this.chunks = [];
    this._sampleCount = 0;
    return out;
  }

  clear() {
    this.chunks = [];
    this._sampleCount = 0;
  }
}

export function useSpeechRecognition(opts: UseSpeechRecognitionOptions) {
  const recognitionRef = useRef<AnySpeechRecognition | null>(null);
  const isRunningRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const optsRef = useRef(opts);
  const errorCountRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRestartRef = useRef(0);
  const mountedRef = useRef(true);

  // Offline audio ctx refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const offlineBufferRef = useRef<AudioRingBuffer>(new AudioRingBuffer());
  // True when this hook created the audio stream itself (so it owns cleanup).
  // False when an external stream was passed in (owned by useAudioSource).
  const ownsStreamRef = useRef(false);
  
  optsRef.current = opts;

  const cleanup = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    if (scriptNodeRef.current) {
      try { scriptNodeRef.current.disconnect(); } catch {}
      scriptNodeRef.current = null;
    }
    if (audioStreamRef.current) {
      // Only stop tracks we created ourselves. External streams are owned by
      // useAudioSource; stopping them here would break the shared source.
      if (ownsStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
      audioStreamRef.current = null;
    }
    ownsStreamRef.current = false;
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    offlineBufferRef.current.clear();

    isRunningRef.current = false;
  }, []);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    cleanup();
  }, [cleanup]);

  /**
   * Offline (WASM Whisper) recognition.
   *
   * Reworked to:
   *   - Use the SINGLE shared worker (workers/aiWorkerClient) instead of
   *     spawning its own — fixes the double-worker / double-model bug.
   *   - Accept an EXTERNAL MediaStream (mic-with-device OR system/tab audio)
   *     so offline mode respects the user's chosen source instead of always
   *     grabbing the default microphone. If none is passed, it acquires the
   *     mic itself with the requested deviceId.
   *   - Ensure the model is loaded before capturing (so the first chunk
   *     isn't lost while downloading).
   *   - Stop capturing while a recognition request is in flight, preventing
   *     request pile-up and out-of-memory under slow CPUs. Capture resumes
   *     immediately after each result returns.
   *   - Emit each recognized segment as a final result.
   */
  const startOfflineWasm = async (externalStream?: MediaStream | null) => {
    try {
      // Make sure the Whisper model is loaded first (downloads on first use).
      const { ensureModelsLoaded } = await import('../workers/aiWorkerClient');
      try {
        await ensureModelsLoaded(['recognize']);
      } catch (loadErr) {
        // Model couldn't be loaded (no network, blocked mirror, etc.).
        // Surface a clear error so the user knows offline transcription
        // isn't available, instead of silently capturing nothing.
        optsRef.current.onError(`Offline model not loaded: ${loadErr instanceof Error ? loadErr.message : String(loadErr)}. Check Settings → Offline Mode.`);
        return;
      }

      // Use the external stream if provided (mic w/ device, or system audio).
      // Otherwise fall back to acquiring the mic ourselves.
      let stream: MediaStream | null = externalStream ?? null;
      ownsStreamRef.current = !stream; // we own it only if we create it
      if (!stream) {
        const deviceId = (optsRef.current as any).deviceId ?? null;
        const constraints: MediaStreamConstraints = {
          audio: deviceId
            ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      if (!mountedRef.current) {
        // Don't stop tracks we didn't create (externalStream owned by caller).
        if (!externalStream) stream.getTracks().forEach(t => t.stop());
        return;
      }
      audioStreamRef.current = stream;

      const ctx = new window.AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but the only API that works cross-browser
      // without shipping a separate AudioWorklet bundle. It is acceptable here
      // because we process at 16kHz mono in small chunks.
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      const actualRate = ctx.sampleRate;
      console.log(`[Offline] AudioContext sampleRate = ${actualRate} Hz`);

      // Whisper expects 16 kHz input. If the AudioContext delivers a
      // different rate, resample with linear interpolation.
      const NEEDS_RESAMPLE = actualRate !== 16000 && actualRate > 0;

      // Pull in recognizeOffline lazily to avoid a circular import at module load.
      const { recognizeOffline } = await import('../workers/aiWorkerClient');

      // Read the recognition language from settings so we can pass it to
      // Whisper. Whisper often returns empty on short clips without a
      // language hint — it can't auto-detect fast enough on 3s of audio.
      const recognitionLang = optsRef.current.lang; // e.g. 'en-US', 'fr-FR'
      const langCode = recognitionLang ? recognitionLang.split('-')[0].toLowerCase() : 'en';

      let processing = false;
      let emptyChunks = 0;

      processor.onaudioprocess = (e) => {
        if (!mountedRef.current || processing) return;
        const input = e.inputBuffer.getChannelData(0);
        offlineBufferRef.current.push(input);
        const bufferSamples = offlineBufferRef.current.sampleCount;
        const threshold = 16000 * 3; // 3 seconds of audio
        if (bufferSamples >= threshold) {
          let audioData = offlineBufferRef.current.flush();
          if (NEEDS_RESAMPLE && audioData.length > 0) {
            const ratio = actualRate / 16000;
            const newLen = Math.floor(audioData.length / ratio);
            const resampled = new Float32Array(newLen);
            for (let i = 0; i < newLen; i++) {
              const pos = i * ratio;
              const idx = Math.floor(pos);
              const frac = pos - idx;
              const a = audioData[Math.min(idx, audioData.length - 1)];
              const b = audioData[Math.min(idx + 1, audioData.length - 1)];
              resampled[i] = a + frac * (b - a);
            }
            audioData = resampled;
          }

          // Check RMS audio level — skip silent chunks to avoid wasting CPU
          let rms = 0;
          for (let i = 0; i < audioData.length; i++) rms += audioData[i] * audioData[i];
          rms = Math.sqrt(rms / audioData.length);
          if (rms < 0.005) {
            console.log(`[Offline] Skipping silent chunk (rms=${rms.toFixed(4)}, samples=${audioData.length})`);
            return; // Don't set processing=true, just discard
          }

          processing = true;
          console.log(`[Offline] Sending ${audioData.length} samples to worker (rms=${rms.toFixed(4)}, lang=${langCode})...`);
          recognizeOffline(audioData, langCode)
            .then(text => {
              if (!mountedRef.current) return;
              if (text && text.trim()) {
                emptyChunks = 0;
                console.log(`[Offline] Recognized: "${text.trim()}"`);
                optsRef.current.onResult({
                  transcript: text.trim(),
                  isFinal: true,
                  speaker: optsRef.current.speaker,
                  confidence: 1,
                });
              } else {
                emptyChunks++;
                console.log(`[Offline] Empty result (${emptyChunks}/10 consecutive)`);
                if (emptyChunks >= 10) {
                  optsRef.current.onError('Offline transcription returned empty 10 times. Check that your microphone is picking up audio and the model is downloaded in Settings → Offline Mode.');
                  emptyChunks = 0;
                }
              }
            })
            .catch(err => {
              console.error('[Offline] recognize failed (chunk skipped):', err);
            })
            .finally(() => { processing = false; });
        }
      };

      source.connect(processor);
      // ScriptProcessor requires a destination connection to fire callbacks.
      // Use a zero-gain node so nothing is audible.
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);


      scriptNodeRef.current = processor;
      isRunningRef.current = true;
    } catch (e: any) {
      optsRef.current.onError(`Offline mode failed: ${e?.message || e}`);
      cleanup();
    }
  };

  const start = useCallback((externalStream?: MediaStream | null) => {
    // Read from localStorage to check if we enabled offlineMode
    const settings = localStorage.getItem('tutorly_settings');
    let isOffline = false;
    if (settings) {
      try { isOffline = JSON.parse(settings).offlineMode; } catch {}
    }

    if (isOffline) {
       startOfflineWasm(externalStream);
       return;
    }

    const SR = getSpeechRecognitionClass();
    if (!SR) {
      optsRef.current.onError('Speech Recognition not supported. Use Chrome or Edge.');
      return;
    }

    if (isRunningRef.current) return;

    cleanup();
    
    if (Date.now() - lastRestartRef.current > 10000) {
      errorCountRef.current = 0;
    }
    lastRestartRef.current = Date.now();

    const recognition = new SR();
    recognition.lang = optsRef.current.lang;
    recognition.continuous = optsRef.current.continuous;
    recognition.interimResults = optsRef.current.interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isRunningRef.current = true;
      errorCountRef.current = 0;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      if (!mountedRef.current) return;
      
      try {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const alt = result[0];
          optsRef.current.onResult({
            transcript: alt.transcript,
            isFinal: result.isFinal,
            speaker: optsRef.current.speaker,
            confidence: alt.confidence ?? 1,
          });
        }
      } catch (e) {
        console.warn('Error processing speech result:', e);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      const code = event.error;
      
      if (code === 'no-speech' || code === 'aborted') return;
      
      errorCountRef.current++;
      
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        optsRef.current.onError('Microphone permission denied');
        shouldRestartRef.current = false;
        cleanup();
        return;
      }
      
      if (code === 'network') {
        optsRef.current.onError('Network error - check internet connection');
        return;
      }
      
      if (errorCountRef.current >= MAX_ERRORS_BEFORE_PAUSE) {
        optsRef.current.onError('Too many errors - recognition paused');
        shouldRestartRef.current = false;
        cleanup();
        return;
      }
      
      optsRef.current.onError(`Speech error: ${code}`);
    };

    recognition.onend = () => {
      isRunningRef.current = false;
      
      if (!mountedRef.current) return;
      
      optsRef.current.onEnd();
      
      if (shouldRestartRef.current && errorCountRef.current < MAX_ERRORS_BEFORE_PAUSE) {
        // Restart as fast as possible
        restartTimerRef.current = setTimeout(() => {
          if (shouldRestartRef.current && !isRunningRef.current && mountedRef.current) {
            start();
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;

    try {
      recognition.start();
    } catch {
      optsRef.current.onError('Failed to start speech recognition');
      cleanup();
    }
    
    // Periodic restart for memory management
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      if (shouldRestartRef.current && mountedRef.current) {
        cleanup();
        setTimeout(() => {
          if (shouldRestartRef.current && mountedRef.current) {
            start();
          }
        }, 200);
      }
    }, RESTART_INTERVAL_MS);
  }, [cleanup]);

  const setLanguage = useCallback((lang: string) => {
    optsRef.current = { ...optsRef.current, lang };
    if (isRunningRef.current && shouldRestartRef.current) {
      cleanup();
      setTimeout(() => {
        if (shouldRestartRef.current && mountedRef.current) {
          start();
        }
      }, 200);
    }
  }, [cleanup, start]);

  const abort = useCallback(() => {
    shouldRestartRef.current = false;
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      shouldRestartRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    start,
    stop,
    abort,
    setLanguage,
    isSupported: !!getSpeechRecognitionClass(),
    isRunning: () => isRunningRef.current,
  };
}
