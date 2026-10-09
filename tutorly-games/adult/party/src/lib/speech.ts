"use client";

/* ---------------- Text to speech ---------------- */

export type VoiceInfo = { name: string; lang: string; local: boolean };

export function listVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
}

export function onVoicesReady(cb: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return () => {};
  const handler = () => cb();
  window.speechSynthesis.addEventListener("voiceschanged", handler);
  cb();
  return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
}

/** Prefer Microsoft "Natural" voices when the machine has them. */
export function pickVoice(preferred: string | null, gender?: "m" | "f" | "n"): SpeechSynthesisVoice | null {
  const voices = listVoices();
  if (!voices.length) return null;
  if (preferred) {
    const exact = voices.find((v) => v.name === preferred);
    if (exact && !gender) return exact;
  }
  const natural = voices.filter((v) => /natural|neural|premium|enhanced/i.test(v.name));
  const pool = natural.length ? natural : voices;
  if (gender === "f") return pool.find((v) => /female|aria|jenny|zira|sonia|emma|libby|clara|michelle|hazel/i.test(v.name)) ?? pool[0];
  if (gender === "m") return pool.find((v) => /male|guy|ryan|davis|george|christopher|brian|william|tony/i.test(v.name)) ?? pool[pool.length - 1];
  return (preferred && voices.find((v) => v.name === preferred)) || pool[0];
}

export type SpeakOpts = { voiceName?: string | null; gender?: "m" | "f" | "n"; rate?: number; pitch?: number; onWord?: (charIndex: number) => void };

export function speak(text: string, opts: SpeakOpts = {}): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(opts.voiceName ?? null, opts.gender);
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = opts.rate ?? 1;
    u.pitch = opts.pitch ?? 1;
    if (opts.onWord) u.onboundary = (e) => opts.onWord?.(e.charIndex);
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}

export async function speakScript(lines: { speaker: string; voice: "m" | "f" | "n"; line: string }[], narrator?: string | null) {
  for (const l of lines) {
    await speak(l.line, { gender: l.voice, voiceName: l.voice === "n" ? narrator : null, rate: 0.98 });
    await new Promise((r) => setTimeout(r, 220));
  }
}

/* ---------------- Speech recognition ---------------- */

type SRResultHandler = (final: string, interim: string) => void;

type SRType = {
  continuous: boolean; interimResults: boolean; lang: string;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { resultIndex: number; results: { length: number;[i: number]: { isFinal: boolean;[j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
};

export function recognitionSupported() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export class Listener {
  private rec: SRType | null = null;
  private running = false;
  finalText = "";

  constructor(private onText: SRResultHandler, private lang = "en-GB") {}

  start() {
    if (typeof window === "undefined") return false;
    const w = window as unknown as { SpeechRecognition?: new () => SRType; webkitSpeechRecognition?: new () => SRType };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return false;
    this.stop();
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.lang;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      this.onText(this.finalText.trim(), interim.trim());
    };
    rec.onend = () => { if (this.running) { try { rec.start(); } catch { /* restart race */ } } };
    rec.onerror = () => {};
    this.rec = rec;
    this.running = true;
    try { rec.start(); } catch { /* already started */ }
    return true;
  }

  stop() {
    this.running = false;
    if (this.rec) { try { this.rec.stop(); } catch { /* ignore */ } this.rec = null; }
  }

  reset() { this.finalText = ""; }
}

/* ---------------- Microphone level meter ---------------- */

export class MicMeter {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  level = 0;

  async start(onLevel: (v: number) => void) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch { return false; }
    const Ctor: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    src.connect(this.analyser);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const loop = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      this.level = Math.min(1, Math.sqrt(sum / data.length) * 4.5);
      onLevel(this.level);
      this.raf = requestAnimationFrame(loop);
    };
    loop();
    return true;
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null; this.analyser = null; this.stream = null;
  }
}

/* ---------------- Pronunciation scoring helpers ---------------- */

export const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();

export function scoreReading(target: string, said: string) {
  const t = normalise(target).split(" ").filter(Boolean);
  const s = new Set(normalise(said).split(" ").filter(Boolean));
  const hit: boolean[] = t.map((w) => s.has(w) || [...s].some((x) => x.length > 3 && (x.startsWith(w.slice(0, 4)) || w.startsWith(x.slice(0, 4)))));
  const correct = hit.filter(Boolean).length;
  return { hit, correct, total: t.length, accuracy: t.length ? Math.round((correct / t.length) * 100) : 0, missed: t.filter((_, i) => !hit[i]) };
}

/** Rough CEFR weighting used by the auction NPCs: longer, rarer words bid higher. */
const B2_WORDS = new Set(["nevertheless", "furthermore", "consequently", "arguably", "substantial", "compelling", "robust", "inevitable", "genuine", "remarkable", "sophisticated", "essentially", "considerable", "whereas", "thereby", "notably", "unprecedented", "authentic", "versatile", "exclusive", "invaluable", "meticulous", "lucrative", "sustainable", "innovative"]);

export function speechRichness(text: string) {
  const words = normalise(text).split(" ").filter(Boolean);
  const unique = new Set(words);
  const advanced = words.filter((w) => w.length >= 9 || B2_WORDS.has(w));
  return { words: words.length, unique: unique.size, advanced: advanced.length, advancedWords: [...new Set(advanced)].slice(0, 12) };
}
