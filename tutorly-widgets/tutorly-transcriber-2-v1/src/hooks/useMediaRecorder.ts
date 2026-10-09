import { useRef, useCallback, useState, useMemo } from 'react';
import type { RecordingConfig, RecordingItem } from '../types';

export interface UseMediaRecorderResult {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  recordings: RecordingItem[];
  startRecording: (stream: MediaStream, config: RecordingConfig) => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  deleteRecording: (id: string) => void;
  saveRecording: (id: string) => void;
  clearRecordings: () => void;
  error: string | null;
}

// Resolution presets with aggressive compression for smaller files
const RESOLUTION_PRESETS = {
  high: { width: 1280, height: 720, videoBps: 1500000, audioBps: 128000 },
  medium: { width: 854, height: 480, videoBps: 800000, audioBps: 96000 },
  low: { width: 640, height: 360, videoBps: 400000, audioBps: 64000 },
};

function getBestMimeType(format: string, includeVideo: boolean): string {
  if (format === 'webm') {
    if (includeVideo) {
      // VP9 has much better compression than VP8
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) return 'video/webm;codecs=vp8,opus';
      if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm';
    }
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  }
  if (format === 'mp4') {
    if (includeVideo) {
      if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4';
    }
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  }
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  return 'audio/webm';
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Downscale video stream using canvas for better compression
async function createDownscaledStream(
  originalStream: MediaStream,
  targetWidth: number,
  targetHeight: number,
  frameRate: number = 15
): Promise<{ stream: MediaStream; cleanup: () => void }> {
  const videoTrack = originalStream.getVideoTracks()[0];
  if (!videoTrack) {
    return { stream: originalStream, cleanup: () => {} };
  }

  const settings = videoTrack.getSettings();
  const sourceWidth = settings.width || 1920;
  const sourceHeight = settings.height || 1080;

  // Calculate aspect-ratio-preserving dimensions
  const aspectRatio = sourceWidth / sourceHeight;
  let finalWidth = targetWidth;
  let finalHeight = Math.round(targetWidth / aspectRatio);
  
  if (finalHeight > targetHeight) {
    finalHeight = targetHeight;
    finalWidth = Math.round(targetHeight * aspectRatio);
  }

  // Make dimensions even (required for some codecs)
  finalWidth = Math.floor(finalWidth / 2) * 2;
  finalHeight = Math.floor(finalHeight / 2) * 2;

  // Create video element to capture frames
  const video = document.createElement('video');
  video.srcObject = originalStream;
  video.muted = true;
  await video.play();

  // Create canvas for downscaling
  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';

  // Capture frames at reduced rate
  let animationId: number;
  let lastFrameTime = 0;
  const frameInterval = 1000 / frameRate;

  const drawFrame = (currentTime: number) => {
    if (currentTime - lastFrameTime >= frameInterval) {
      ctx.drawImage(video, 0, 0, finalWidth, finalHeight);
      lastFrameTime = currentTime;
    }
    animationId = requestAnimationFrame(drawFrame);
  };
  animationId = requestAnimationFrame(drawFrame);

  // Create new stream from canvas
  const canvasStream = canvas.captureStream(frameRate);
  
  // Add audio tracks from original stream
  const audioTracks = originalStream.getAudioTracks();
  audioTracks.forEach(track => canvasStream.addTrack(track));

  const cleanup = () => {
    cancelAnimationFrame(animationId);
    video.pause();
    video.srcObject = null;
    canvasStream.getTracks().forEach(t => {
      if (t.kind === 'video') t.stop();
    });
  };

  return { stream: canvasStream, cleanup };
}

export function useMediaRecorder(): UseMediaRecorderResult {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sliceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileHandleRef = useRef<any>(null);
  const writableRef = useRef<any>(null);
  const configRef = useRef<RecordingConfig | null>(null);
  const sliceIndexRef = useRef<number>(1);
  const streamRef = useRef<MediaStream | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (sliceTimerRef.current) {
      clearInterval(sliceTimerRef.current);
      sliceTimerRef.current = null;
    }
  }, []);

  const openNewFileSlice = async (isFirst = false) => {
    if (!isFirst && fileHandleRef.current) {
      await writableRef.current?.close();
    }
    const ext = configRef.current?.includeVideo ? 'mp4' : 'webm';
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `video_slice_${sliceIndexRef.current}_${Date.now()}.${ext}`,
        types: [{
          description: 'Video File',
          accept: { [`video/${ext}`]: [`.${ext}`] },
        }],
      });
      fileHandleRef.current = handle;
      writableRef.current = await handle.createWritable();
      sliceIndexRef.current++;
    } catch (e: any) {
      console.warn('File picker cancelled/failed', e);
      throw e;
    }
  };

  const chunksRef = useRef<Blob[]>([]);

  const startRecorderInstance = () => {
    const stream = streamRef.current;
    if (!stream) return;

    const cfg = configRef.current;
    const preset = RESOLUTION_PRESETS[cfg?.quality ?? 'low'] ?? RESOLUTION_PRESETS.low;
    let mimeType = getBestMimeType(cfg?.format || 'webm', cfg?.includeVideo || false);

    // Apply explicit bitrate caps matching the quality preset. This keeps
    // the encoded output (and the in-memory Blob fallback) bounded even
    // when canvas downscaling isn't applied (e.g. audio-only).
    const options: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: cfg?.includeVideo ? preset.videoBps : undefined,
      audioBitsPerSecond: preset.audioBps,
    };

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, options);
    } catch {
      // Codec not supported — fall back to the recorder's defaults.
      try {
        recorder = new MediaRecorder(stream);
      } catch (e) {
        console.error('Failed to create MediaRecorder:', e);
        return;
      }
    }
    recorder.ondataavailable = async (e) => {
      if (e.data && e.data.size > 0) {
        if (writableRef.current) {
          try {
             await writableRef.current.write(e.data); // Directly stream to disk
          } catch (err) {
             console.error('Writable write failed', err);
             // Fallback to memory
             chunksRef.current.push(e.data);
          }
        } else {
          chunksRef.current.push(e.data);
        }
      }
    };
    recorder.onstop = async () => {
      if (chunksRef.current.length > 0) {
         const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
         const url = URL.createObjectURL(blob);
         const rec: RecordingItem = {
            id: Date.now().toString(),
            blob,
            url,
            filename: `recording_${Date.now()}.${getFileExtension(recorder.mimeType)}`,
            duration: duration,
            size: blob.size,
            timestamp: Date.now(),
            format: getFileExtension(recorder.mimeType),
            hasVideo: false,
         };
         setRecordings(prev => [...prev, rec]);
      }
      chunksRef.current = [];
    };
    recorderRef.current = recorder;
    recorder.start(1000); // 1 sec chunks flushed to disk or memory
  };

  const startRecording = useCallback(async (stream: MediaStream, config: RecordingConfig) => {
    setError(null);
    configRef.current = config;
    chunksRef.current = [];

    // For video recordings, downscale via canvas to the configured quality
    // preset BEFORE encoding. This bounds CPU/memory/disk usage — previously
    // the full-resolution source stream was encoded, which could exhaust
    // memory on long or high-res screen captures.
    let effectiveStream = stream;
    if (config.includeVideo) {
      const preset = RESOLUTION_PRESETS[config.quality] ?? RESOLUTION_PRESETS.low;
      try {
        const { stream: downscaled, cleanup } = await createDownscaledStream(
          stream,
          preset.width,
          preset.height,
          // Low quality uses a lower frame rate to save memory/bandwidth.
          config.quality === 'low' ? 12 : config.quality === 'medium' ? 15 : 24,
        );
        effectiveStream = downscaled;
        cleanupRef.current = cleanup; // torn down in stopRecording
      } catch (e) {
        console.warn('Downscale failed, recording at native resolution:', e);
        effectiveStream = stream;
      }
    }

    streamRef.current = effectiveStream;

    if ('showSaveFilePicker' in window && window.self === window.top) {
       try {
         await openNewFileSlice(true);
       } catch (e) {
         console.warn('Could not start disk streaming, falling back to memory');
       }
    }

    startRecorderInstance();
    setIsRecording(true);
    setDuration(0);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }, [stopTimer]);

  const stopRecording = useCallback(async () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    stopTimer();
    setIsRecording(false);
    if (writableRef.current) {
      try { await writableRef.current.close(); } catch {}
      writableRef.current = null;
    }
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, [stopTimer]);

  const pauseRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'paused') {
      recorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
  }, []);

  const deleteRecording = useCallback((id: string) => {
    setRecordings(prev => {
      const item = prev.find(r => r.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter(r => r.id !== id);
    });
  }, []);

  const saveRecording = useCallback((id: string) => {
    const item = recordings.find(r => r.id === id);
    if (!item) return;
    
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [recordings]);

  const clearRecordings = useCallback(() => {
    recordings.forEach(r => URL.revokeObjectURL(r.url));
    setRecordings([]);
  }, [recordings]);

  return useMemo(() => ({
    isRecording,
    isPaused,
    duration,
    recordings,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    saveRecording,
    clearRecordings,
    error,
  }), [isRecording, isPaused, duration, recordings, startRecording, stopRecording, pauseRecording, resumeRecording, deleteRecording, saveRecording, clearRecordings, error]);
}
