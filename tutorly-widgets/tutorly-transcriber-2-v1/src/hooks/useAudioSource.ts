import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import type { AudioSourceType, AudioDevice } from '../types';

function releaseMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach(track => {
      track.stop();
      stream.removeTrack(track);
    });
  } catch {}
}

export interface AudioSourceState {
  stream: MediaStream | null;
  sourceType: AudioSourceType;
  deviceId: string | null;
  label: string;
  error: string | null;
  isAcquiring: boolean;
}

/*
 * System audio transcription — how it actually works in Chrome:
 *
 * The Web Speech API (SpeechRecognition) does NOT accept a MediaStream.
 * It always uses the browser's own audio pipeline.
 *
 * However, when you share a **Chrome tab** via getDisplayMedia and the
 * user ticks "Share tab audio", Chrome routes that tab's audio into
 * the speech recognition pipeline automatically.
 *
 * What we must do:
 *   1. Call getDisplayMedia with audio:true — user picks a TAB
 *   2. Keep the stream alive (don't stop video track — that kills the session)
 *   3. Request minimal video (1×1, 1fps) so it costs near-zero CPU
 *   4. Do NOT create AudioContext loopback — it adds echo/latency and
 *      doesn't help (mic won't pick up speakers reliably with headphones)
 *
 * The user MUST share a Chrome tab (not a window or entire screen)
 * and MUST tick "Share tab audio" for this to work.
 */
export function useAudioSource() {
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const [state, setState] = useState<AudioSourceState>({
    stream: null,
    sourceType: 'microphone',
    deviceId: null,
    label: '',
    error: null,
    isAcquiring: false,
  });

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      releaseMediaStream(streamRef.current);
      streamRef.current = null;
      if (mountedRef.current) {
        setState(prev => ({ ...prev, stream: null, label: '' }));
      }
    }
  }, []);

  // ── Microphone ──────────────────────────────────────────────────────────
  const acquireMicrophone = useCallback(async (deviceId: string | null): Promise<MediaStream | null> => {
    if (mountedRef.current) setState(prev => ({ ...prev, isAcquiring: true, error: null }));
    releaseStream();

    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId
          ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      track.onended = () => releaseStream();

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          stream,
          sourceType: 'microphone',
          deviceId: track.getSettings().deviceId ?? deviceId,
          label: track.label || 'Microphone',
          error: null,
          isAcquiring: false,
        }));
      }
      return stream;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      let friendly = msg;
      if (msg.includes('NotAllowed') || msg.includes('Permission denied')) friendly = 'Microphone permission denied.';
      else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) friendly = 'No microphone found.';
      else if (msg.includes('NotReadable')) friendly = 'Microphone busy in another app.';
      if (mountedRef.current) setState(prev => ({ ...prev, error: friendly, stream: null, isAcquiring: false }));
      return null;
    }
  }, [releaseStream]);

  // ── System Audio (tab capture) ──────────────────────────────────────────
  const acquireSystemAudio = useCallback(async (): Promise<MediaStream | null> => {
    if (mountedRef.current) setState(prev => ({ ...prev, isAcquiring: true, error: null }));
    releaseStream();

    try {
      /*
       * preferCurrentTab: true — Chrome 109+ will default-select the
       * current tab, making it one click to share.
       *
       * Video at 1×1 / 1fps: keeps capture session alive but costs
       * almost zero CPU.  Stopping video kills the entire capture.
       */
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1 },
          height: { ideal: 1 },
          frameRate: { ideal: 1 },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        // @ts-expect-error – Chrome 109+ only
        preferCurrentTab: true,
      });

      const audioTracks = displayStream.getAudioTracks();

      if (audioTracks.length === 0) {
        displayStream.getTracks().forEach(t => t.stop());
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            error: 'No audio captured. You must share a Chrome TAB (not window/screen) and tick "Share tab audio".',
            stream: null,
            isAcquiring: false,
          }));
        }
        return null;
      }

      streamRef.current = displayStream;

      // Listen for user stopping the share
      audioTracks[0].onended = () => releaseStream();
      const videoTracks = displayStream.getVideoTracks();
      if (videoTracks.length > 0) videoTracks[0].onended = () => releaseStream();

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          stream: displayStream,
          sourceType: 'system',
          deviceId: null,
          label: 'System Audio (Tab)',
          error: null,
          isAcquiring: false,
        }));
      }

      return displayStream;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      let friendly = msg;
      if (msg.includes('NotAllowed') || msg.includes('Permission denied')) friendly = 'Screen capture cancelled.';
      else if (msg.includes('NotSupported')) friendly = 'System audio not supported here. Use Chrome/Edge on Windows.';
      if (mountedRef.current) setState(prev => ({ ...prev, error: friendly, stream: null, isAcquiring: false }));
      return null;
    }
  }, [releaseStream]);

  // ── Screen + Video (for recording) ──────────────────────────────────────
  const acquireScreenWithVideo = useCallback(async (): Promise<MediaStream | null> => {
    if (mountedRef.current) setState(prev => ({ ...prev, isAcquiring: true, error: null }));
    releaseStream();

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });

      streamRef.current = stream;
      stream.getTracks().forEach(track => { track.onended = () => releaseStream(); });

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          stream,
          sourceType: 'system',
          deviceId: null,
          label: 'Screen + Audio',
          error: null,
          isAcquiring: false,
        }));
      }
      return stream;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (mountedRef.current) setState(prev => ({ ...prev, error: msg, stream: null, isAcquiring: false }));
      return null;
    }
  }, [releaseStream]);

  // ── Enumerate devices ───────────────────────────────────────────────────
  const enumerateDevices = useCallback(async (): Promise<AudioDevice[]> => {
    try {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(t => t.stop());
      } catch {}
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 6)}`, kind: d.kind }));
    } catch {
      return [];
    }
  }, []);

  // ── Test stream ─────────────────────────────────────────────────────────
  const testStream = useCallback(async (stream: MediaStream): Promise<{ level: number; working: boolean }> => {
    return new Promise(resolve => {
      let resolved = false;
      const timeout = setTimeout(() => { if (!resolved) { resolved = true; resolve({ level: 0, working: false }); } }, 3000);

      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const buf = new Uint8Array(analyser.frequencyBinCount);
        let maxLevel = 0;
        let ticks = 0;

        const check = () => {
          if (resolved) return;
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
          maxLevel = Math.max(maxLevel, avg);
          ticks++;
          if (ticks < 20) setTimeout(check, 60);
          else {
            clearTimeout(timeout);
            resolved = true;
            source.disconnect();
            ctx.close();
            resolve({ level: maxLevel, working: maxLevel > 1 });
          }
        };
        check();
      } catch {
        clearTimeout(timeout);
        if (!resolved) { resolved = true; resolve({ level: 0, working: false }); }
      }
    });
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseStream();
    };
  }, [releaseStream]);

  return useMemo(() => ({
    state,
    acquireMicrophone,
    acquireSystemAudio,
    acquireScreenWithVideo,
    releaseStream,
    enumerateDevices,
    testStream,
  }), [state, acquireMicrophone, acquireSystemAudio, acquireScreenWithVideo, releaseStream, enumerateDevices, testStream]);
}
