import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "alh_sfx_v1";

export type SfxName =
  | "hover" | "click" | "open" | "close" | "buzz" | "coin"
  | "unlock" | "splash" | "flip" | "dice" | "snow" | "bell"
  | "spin" | "cash" | "pop" | "chomp" | "bonk" | "tick"
  | "pencil" | "unwrap";

export function useSfx() {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== "false"; } catch { return true; }
  });
  const ctxRef = useRef<AudioContext | null>(null);

  const setEnabled = (b: boolean) => {
    setEnabledState(b);
    try { localStorage.setItem(STORAGE_KEY, String(b)); } catch { /* */ }
  };

  const getCtx = () => {
    if (!ctxRef.current) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (AC) ctxRef.current = new AC();
    }
    return ctxRef.current;
  };

  // Lazy-resume on first user interaction (browser autoplay policy)
  useEffect(() => {
    const resume = () => {
      const c = getCtx();
      if (c && c.state === "suspended") c.resume();
    };
    window.addEventListener("pointerdown", resume, { once: true });
    return () => window.removeEventListener("pointerdown", resume);
  }, []);

  const tone = useCallback((freq: number, dur: number, type: OscillatorType = "sine", gain = 0.06, slide?: number) => {
    if (!enabled) return;
    const ctx = getCtx(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(60, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }, [enabled]);

  const noise = useCallback((dur: number, gain = 0.05) => {
    if (!enabled) return;
    const ctx = getCtx(); if (!ctx) return;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = gain;
    src.buffer = buffer; src.connect(g); g.connect(ctx.destination);
    src.start();
  }, [enabled]);

  const play = useCallback((name: SfxName) => {
    if (!enabled) return;
    switch (name) {
      case "hover": tone(880, 0.06, "sine", 0.03); break;
      case "click": tone(660, 0.08, "triangle", 0.05, 440); break;
      case "open":  tone(523, 0.10, "sine", 0.06); setTimeout(() => tone(784, 0.12, "sine", 0.06), 80); break;
      case "close": tone(523, 0.10, "sine", 0.05, 200); break;
      case "buzz":  tone(180, 0.20, "sawtooth", 0.07); break;
      case "coin":  tone(988, 0.06, "square", 0.05); setTimeout(() => tone(1318, 0.10, "square", 0.05), 60); break;
      case "unlock":tone(523, 0.08, "triangle", 0.06); setTimeout(() => tone(659, 0.08, "triangle", 0.06), 90); setTimeout(() => tone(988, 0.14, "triangle", 0.06), 180); break;
      case "splash":noise(0.25, 0.08); break;
      case "flip":  tone(440, 0.05, "triangle", 0.05, 660); break;
      case "dice":  noise(0.18, 0.05); setTimeout(() => tone(220, 0.06, "square", 0.04), 100); break;
      case "snow":  tone(1200, 0.30, "sine", 0.03, 600); break;
      case "bell":  tone(1568, 0.30, "sine", 0.05, 784); break;
      case "spin":  tone(220, 0.6, "sawtooth", 0.04, 880); break;
      case "cash":  tone(988, 0.08, "square", 0.05); setTimeout(() => tone(1480, 0.12, "square", 0.05), 60); setTimeout(() => tone(1976, 0.18, "square", 0.05), 140); break;
      case "pop":   tone(900, 0.05, "sine", 0.07, 200); break;
      case "chomp": tone(300, 0.05, "square", 0.05); setTimeout(() => tone(180, 0.05, "square", 0.05), 60); break;
      case "bonk":  tone(140, 0.10, "square", 0.07, 60); break;
      case "tick":  tone(1500, 0.03, "square", 0.04); break;
      case "pencil":noise(0.10, 0.03); break;
      case "unwrap":noise(0.15, 0.04); setTimeout(() => tone(880, 0.10, "triangle", 0.05), 100); break;
    }
  }, [enabled, tone, noise]);

  return { play, enabled, setEnabled };
}
