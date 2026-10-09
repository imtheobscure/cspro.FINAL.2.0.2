"use client";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;
let musicOn = false;
let sfxOn = true;

function ac(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function unlockAudio() {
  try { ac(); } catch { /* ignore */ }
}

export function setSfx(on: boolean) { sfxOn = on; }
export function isSfxOn() { return sfxOn; }
export function isMusicOn() { return musicOn; }

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.3, when = 0, slideTo?: number) {
  if (!sfxOn) return;
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + when);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + when + dur);
  g.gain.setValueAtTime(0, c.currentTime + when);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + when + dur);
  o.connect(g).connect(master!);
  o.start(c.currentTime + when);
  o.stop(c.currentTime + when + dur + 0.05);
}

function noise(dur: number, vol = 0.2, when = 0, hp = 2000) {
  if (!sfxOn) return;
  const c = ac();
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master!);
  src.start(c.currentTime + when);
}

export const sfx = {
  click() { tone(600, 0.05, "square", 0.08); },
  correct() {
    tone(523, 0.12, "triangle", 0.3);
    tone(659, 0.12, "triangle", 0.3, 0.1);
    tone(784, 0.2, "triangle", 0.3, 0.2);
    tone(1047, 0.35, "triangle", 0.3, 0.3);
  },
  cash() {
    // cha-ching: metallic ring + coin shimmer
    noise(0.08, 0.25, 0, 4000);
    tone(2637, 0.4, "sine", 0.25, 0.05);
    tone(3520, 0.5, "sine", 0.18, 0.08);
    tone(4186, 0.6, "sine", 0.12, 0.12);
    for (let i = 0; i < 6; i++) tone(2000 + Math.random() * 3000, 0.08, "sine", 0.08, 0.15 + i * 0.05);
  },
  bigCash() {
    for (let i = 0; i < 12; i++) tone(1500 + i * 220, 0.25, "sine", 0.18, i * 0.06);
    noise(0.3, 0.2, 0, 3000);
    tone(1047, 0.8, "triangle", 0.3, 0.5);
    tone(1319, 0.8, "triangle", 0.3, 0.55);
    tone(1568, 1.0, "triangle", 0.3, 0.6);
  },
  wrong() {
    tone(220, 0.3, "sawtooth", 0.25, 0, 110);
    tone(180, 0.4, "square", 0.12, 0.05, 80);
  },
  powerup() {
    tone(440, 0.1, "square", 0.15);
    tone(554, 0.1, "square", 0.15, 0.08);
    tone(659, 0.1, "square", 0.15, 0.16);
    tone(880, 0.3, "square", 0.15, 0.24);
    tone(1760, 0.5, "sine", 0.2, 0.3);
    noise(0.4, 0.1, 0.3, 6000);
  },
  legendary() {
    for (let i = 0; i < 8; i++) tone(880 * Math.pow(2, i / 12), 0.3, "triangle", 0.2, i * 0.07);
    tone(1760, 1.2, "sine", 0.3, 0.6);
    tone(2217, 1.2, "sine", 0.2, 0.62);
    tone(2637, 1.4, "sine", 0.2, 0.64);
  },
  buy() {
    noise(0.05, 0.3, 0, 5000);
    tone(1200, 0.08, "square", 0.15);
    tone(1800, 0.15, "square", 0.15, 0.08);
    tone(2400, 0.25, "sine", 0.2, 0.12);
  },
  tick() { tone(1000, 0.03, "square", 0.05); },
  urgent() { tone(1400, 0.06, "square", 0.12); tone(1400, 0.06, "square", 0.12, 0.12); },
  attack() {
    tone(300, 0.4, "sawtooth", 0.3, 0, 60);
    noise(0.5, 0.3, 0, 500);
  },
  shield() { tone(400, 0.3, "sine", 0.3, 0, 1200); tone(1200, 0.4, "sine", 0.2, 0.25); },
  whoosh() { noise(0.35, 0.25, 0, 800); },
  streak() { for (let i = 0; i < 5; i++) tone(660 + i * 110, 0.1, "square", 0.12, i * 0.05); },
  countdown() { tone(880, 0.15, "sine", 0.3); },
  go() { tone(880, 0.1, "sine", 0.3); tone(1320, 0.1, "sine", 0.3, 0.1); tone(1760, 0.5, "sine", 0.3, 0.2); },
  fanfare() {
    const seq = [523, 523, 523, 659, 784, 659, 784, 1047];
    seq.forEach((f, i) => tone(f, i === 7 ? 0.9 : 0.18, "triangle", 0.3, i * 0.16));
    noise(0.6, 0.2, 1.1, 3000);
  },
  reveal() { tone(880, 0.06, "sine", 0.15); tone(1760, 0.2, "sine", 0.15, 0.06); },
  slot() { for (let i = 0; i < 10; i++) tone(500 + Math.random() * 800, 0.05, "square", 0.08, i * 0.07); tone(1600, 0.4, "sine", 0.2, 0.75); },
};

/* ---------------- BACKGROUND MUSIC (procedural synthwave loop) ---------------- */
const BASS = [55, 55, 65.4, 65.4, 49, 49, 58.3, 58.3]; // A A C C G G Bb Bb
const ARP = [[220, 261.6, 329.6, 440], [261.6, 329.6, 392, 523.3], [196, 246.9, 293.7, 392], [233.1, 293.7, 349.2, 466.2]];

let step = 0;
function scheduleBar() {
  if (!musicOn || !ctx || !musicGain) return;
  const c = ctx;
  const bpm = 128;
  const beat = 60 / bpm;
  const t0 = c.currentTime + 0.05;
  const bar = step % 8;
  const chord = ARP[Math.floor(bar / 2)];
  // bass
  for (let i = 0; i < 8; i++) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sawtooth";
    o.frequency.value = BASS[bar] * (i % 2 === 0 ? 1 : 2);
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 400 + (i % 2) * 300;
    g.gain.setValueAtTime(0.5, t0 + i * beat * 0.5);
    g.gain.exponentialRampToValueAtTime(0.01, t0 + i * beat * 0.5 + beat * 0.45);
    o.connect(f).connect(g).connect(musicGain);
    o.start(t0 + i * beat * 0.5);
    o.stop(t0 + i * beat * 0.5 + beat * 0.5);
  }
  // arp
  for (let i = 0; i < 16; i++) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "square";
    o.frequency.value = chord[i % 4] * (i % 8 >= 4 ? 2 : 1);
    g.gain.setValueAtTime(0.12, t0 + i * beat * 0.25);
    g.gain.exponentialRampToValueAtTime(0.01, t0 + i * beat * 0.25 + beat * 0.22);
    o.connect(g).connect(musicGain);
    o.start(t0 + i * beat * 0.25);
    o.stop(t0 + i * beat * 0.25 + beat * 0.25);
  }
  // kick + hat
  for (let i = 0; i < 4; i++) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(150, t0 + i * beat);
    o.frequency.exponentialRampToValueAtTime(40, t0 + i * beat + 0.15);
    g.gain.setValueAtTime(0.9, t0 + i * beat);
    g.gain.exponentialRampToValueAtTime(0.01, t0 + i * beat + 0.2);
    o.connect(g).connect(musicGain);
    o.start(t0 + i * beat);
    o.stop(t0 + i * beat + 0.25);
    for (let h = 0; h < 2; h++) {
      const buf = c.createBuffer(1, c.sampleRate * 0.04, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length);
      const s = c.createBufferSource();
      s.buffer = buf;
      const hf = c.createBiquadFilter();
      hf.type = "highpass";
      hf.frequency.value = 7000;
      const hg = c.createGain();
      hg.gain.value = h === 1 ? 0.25 : 0.12;
      s.connect(hf).connect(hg).connect(musicGain);
      s.start(t0 + i * beat + h * beat * 0.5);
    }
  }
  step++;
  musicTimer = window.setTimeout(scheduleBar, beat * 4 * 1000 - 30);
}

export function startMusic() {
  ac();
  if (musicOn) return;
  musicOn = true;
  step = 0;
  scheduleBar();
}
export function stopMusic() {
  musicOn = false;
  if (musicTimer) window.clearTimeout(musicTimer);
  musicTimer = null;
}
export function toggleMusic(): boolean {
  if (musicOn) stopMusic(); else startMusic();
  return musicOn;
}
export function setMusicVolume(v: number) { if (musicGain) musicGain.gain.value = v; }

/* ---------------- TEXT TO SPEECH (Microsoft natural voices preferred) ---------------- */
let voicesCache: SpeechSynthesisVoice[] = [];
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve([]);
    const v = speechSynthesis.getVoices();
    if (v.length) { voicesCache = v; return resolve(v); }
    speechSynthesis.onvoiceschanged = () => { voicesCache = speechSynthesis.getVoices(); resolve(voicesCache); };
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1500);
  });
}

const FEMALE_HINTS = ["aria", "jenny", "sonia", "libby", "michelle", "ana", "emma", "ava", "zira", "samantha", "female", "natasha", "clara", "hazel", "susan"];
const MALE_HINTS = ["guy", "ryan", "davis", "christopher", "eric", "brian", "andrew", "steffan", "thomas", "william", "george", "david", "mark", "daniel", "male", "alex", "james", "liam"];

export function pickVoice(kind: "male" | "female" | "child", idx = 0): SpeechSynthesisVoice | undefined {
  const all = voicesCache.length ? voicesCache : (typeof speechSynthesis !== "undefined" ? speechSynthesis.getVoices() : []);
  const en = all.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    let s = 0;
    if (n.includes("natural")) s += 100;
    if (n.includes("microsoft")) s += 50;
    if (n.includes("online")) s += 30;
    if (n.includes("google")) s += 20;
    const hints = kind === "male" ? MALE_HINTS : FEMALE_HINTS;
    if (hints.some((h) => n.includes(h))) s += 200;
    if (kind === "child" && (n.includes("ana") || n.includes("child"))) s += 300;
    return s;
  };
  const sorted = [...en].sort((a, b) => score(b) - score(a));
  return sorted[idx % Math.max(sorted.length, 1)] ?? sorted[0];
}

export function stopSpeech() {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

export function speak(text: string, kind: "male" | "female" | "child" = "female", opts?: { rate?: number; pitch?: number; onend?: () => void }) {
  if (typeof speechSynthesis === "undefined") { opts?.onend?.(); return; }
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(kind);
  if (v) u.voice = v;
  u.rate = opts?.rate ?? 0.98;
  u.pitch = opts?.pitch ?? (kind === "child" ? 1.4 : kind === "male" ? 0.95 : 1.05);
  u.onend = () => opts?.onend?.();
  u.onerror = () => opts?.onend?.();
  speechSynthesis.speak(u);
}

export function speakScript(lines: { speaker: string; voice: "male" | "female" | "child"; text: string }[], onDone?: () => void) {
  stopSpeech();
  let i = 0;
  const next = () => {
    if (i >= lines.length) { onDone?.(); return; }
    const l = lines[i++];
    if (l.text.includes("____")) { setTimeout(next, 900); return; }
    speak(l.text, l.voice, { onend: () => setTimeout(next, 350) });
  };
  next();
}
