"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MediaState = "idle" | "asking" | "on" | "denied" | "unsupported";

/** Shared webcam access. Never throws; surfaces a safe state for the tutor. */
export function useCamera() {
  const [state, setState] = useState<MediaState>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /** callback ref — safe to hand straight to <video ref> */
  const attachVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && stream) {
        el.srcObject = stream;
        void el.play().catch(() => {});
      }
    },
    [stream],
  );

  const start = useCallback(async () => {
    if (state === "on" || state === "asking") return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    setState("asking");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(s);
      setState("on");
    } catch {
      setState("denied");
    }
  }, [state]);

  const stop = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setState("idle");
  }, [stream]);

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  return { state, stream, attachVideo, start, stop };
}

/** Live microphone level (0..1) + MediaRecorder for echo playback. */
export function useMic() {
  const [state, setState] = useState<MediaState>("idle");
  const [level, setLevel] = useState(0);
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const start = useCallback(async () => {
    if (state === "on" || state === "asking") return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    setState("asking");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = s;
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      an.smoothingTimeConstant = 0.75;
      src.connect(an);
      analyserRef.current = an;
      const data = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        an.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128) / 128);
        setLevel((p) => p * 0.55 + peak * 0.85);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
      setState("on");
    } catch {
      setState("denied");
    }
  }, [state]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void ctxRef.current?.close();
    ctxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setLevel(0);
    setRecording(false);
    setState("idle");
  }, []);

  const begin = useCallback(() => {
    const s = streamRef.current;
    if (!s || typeof MediaRecorder === "undefined") return false;
    try {
      chunks.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const end = useCallback(() => {
    recRef.current?.state === "recording" && recRef.current.stop();
    recRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { state, level, recording, url, start, stop, begin, end };
}
