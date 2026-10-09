"use client";

/**
 * Fully synthesised score + SFX engine.
 * No audio files: every layer is generated with the Web Audio API, so nothing can 404
 * on a classroom projector and the whole soundtrack survives a dead internet connection.
 */

export type TrackName = "lobby" | "arena" | "tension" | "noir" | "lounge" | "whimsy" | "chase" | "victory";
export type SfxName =
  | "correct" | "wrong" | "tick" | "tock" | "whoosh" | "boom" | "powerup" | "card" | "coin"
  | "drumroll" | "applause" | "siren" | "buzz" | "bell" | "reveal" | "heartbeat" | "click" | "deal" | "chime";

const NOTE: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
function hz(name: string) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) return 440;
  return 440 * Math.pow(2, (NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12 - 69) / 12);
}

type Step = { t: number; n?: string[]; v?: number };
type Pattern = {
  bpm: number;
  steps: number;
  kick: number[];
  snare: number[];
  hat: number[];
  bass: Step[];
  chords: Step[];
  lead: Step[];
  swing?: number;
  bassWave?: OscillatorType;
  leadWave?: OscillatorType;
  padLevel?: number;
};

const P: Record<TrackName, Pattern> = {
  lobby: {
    bpm: 96, steps: 16, kick: [0, 8], snare: [4, 12], hat: [2, 6, 10, 14], padLevel: 0.5,
    bass: [{ t: 0, n: ["F1"] }, { t: 6, n: ["F1"] }, { t: 8, n: ["A#1"] }, { t: 14, n: ["C2"] }],
    chords: [{ t: 0, n: ["F3", "A3", "C4", "E4"] }, { t: 8, n: ["A#3", "D4", "F4"] }],
    lead: [{ t: 2, n: ["C5"] }, { t: 5, n: ["E5"] }, { t: 10, n: ["F5"] }, { t: 13, n: ["A4"] }], leadWave: "triangle",
  },
  arena: {
    bpm: 128, steps: 16, kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14, 15], padLevel: 0.34,
    bass: [{ t: 0, n: ["E1"] }, { t: 3, n: ["E1"] }, { t: 6, n: ["G1"] }, { t: 8, n: ["E1"] }, { t: 11, n: ["A1"] }, { t: 14, n: ["B1"] }],
    chords: [{ t: 0, n: ["E3", "G3", "B3"] }, { t: 8, n: ["C4", "E4", "G4"] }],
    lead: [{ t: 0, n: ["E5"] }, { t: 2, n: ["B4"] }, { t: 4, n: ["G5"] }, { t: 6, n: ["E5"] }, { t: 8, n: ["C5"] }, { t: 10, n: ["G5"] }, { t: 12, n: ["B5"] }, { t: 14, n: ["A5"] }],
    bassWave: "sawtooth", leadWave: "square",
  },
  tension: {
    bpm: 140, steps: 16, kick: [0, 6, 8, 14], snare: [], hat: [0, 2, 4, 6, 8, 10, 12, 14], padLevel: 0.55,
    bass: [{ t: 0, n: ["D1"] }, { t: 8, n: ["D#1"] }],
    chords: [{ t: 0, n: ["D3", "A3", "D4"] }, { t: 12, n: ["D#3", "A3", "D4"] }],
    lead: [{ t: 7, n: ["A5"] }, { t: 15, n: ["A#5"] }], bassWave: "sawtooth", leadWave: "sine",
  },
  noir: {
    bpm: 88, steps: 16, kick: [0, 10], snare: [4, 12], hat: [2, 5, 8, 11, 14], swing: 0.16, padLevel: 0.45,
    bass: [{ t: 0, n: ["A1"] }, { t: 4, n: ["C2"] }, { t: 8, n: ["E2"] }, { t: 12, n: ["G1"] }],
    chords: [{ t: 0, n: ["A3", "C4", "E4", "G4"] }, { t: 8, n: ["D3", "F3", "A3", "C4"] }],
    lead: [{ t: 3, n: ["E5"] }, { t: 7, n: ["D5"] }, { t: 11, n: ["C5"] }, { t: 14, n: ["B4"] }], leadWave: "sine",
  },
  lounge: {
    bpm: 108, steps: 16, kick: [0, 8], snare: [4, 12], hat: [2, 6, 10, 14], swing: 0.2, padLevel: 0.4,
    bass: [{ t: 0, n: ["C2"] }, { t: 4, n: ["E2"] }, { t: 8, n: ["G2"] }, { t: 12, n: ["A2"] }],
    chords: [{ t: 0, n: ["C4", "E4", "G4", "B4"] }, { t: 8, n: ["F3", "A3", "C4", "E4"] }],
    lead: [{ t: 2, n: ["G5"] }, { t: 6, n: ["E5"] }, { t: 9, n: ["C5"] }, { t: 13, n: ["D5"] }], leadWave: "triangle",
  },
  whimsy: {
    bpm: 118, steps: 16, kick: [0, 7, 10], snare: [4, 12], hat: [1, 3, 5, 7, 9, 11, 13, 15], padLevel: 0.3,
    bass: [{ t: 0, n: ["G1"] }, { t: 6, n: ["D2"] }, { t: 10, n: ["E2"] }],
    chords: [{ t: 0, n: ["G3", "B3", "D4"] }, { t: 8, n: ["E3", "G3", "B3"] }],
    lead: [{ t: 0, n: ["D5"] }, { t: 2, n: ["G5"] }, { t: 4, n: ["B5"] }, { t: 6, n: ["A5"] }, { t: 8, n: ["G5"] }, { t: 11, n: ["E5"] }, { t: 13, n: ["D5"] }, { t: 15, n: ["B4"] }],
    leadWave: "triangle",
  },
  chase: {
    bpm: 150, steps: 16, kick: [0, 2, 4, 6, 8, 10, 12, 14], snare: [4, 12], hat: [1, 3, 5, 7, 9, 11, 13, 15], padLevel: 0.3,
    bass: [{ t: 0, n: ["A1"] }, { t: 2, n: ["A1"] }, { t: 4, n: ["C2"] }, { t: 6, n: ["A1"] }, { t: 8, n: ["D2"] }, { t: 10, n: ["A1"] }, { t: 12, n: ["E2"] }, { t: 14, n: ["G1"] }],
    chords: [{ t: 0, n: ["A3", "C4", "E4"] }, { t: 8, n: ["D4", "F4", "A4"] }],
    lead: [{ t: 0, n: ["A5"] }, { t: 1, n: ["C6"] }, { t: 3, n: ["E6"] }, { t: 5, n: ["C6"] }, { t: 7, n: ["A5"] }, { t: 9, n: ["D6"] }, { t: 11, n: ["A5"] }, { t: 13, n: ["E6"] }],
    bassWave: "sawtooth", leadWave: "square",
  },
  victory: {
    bpm: 132, steps: 16, kick: [0, 4, 8, 12], snare: [2, 6, 10, 14], hat: [0, 2, 4, 6, 8, 10, 12, 14], padLevel: 0.5,
    bass: [{ t: 0, n: ["C2"] }, { t: 4, n: ["G1"] }, { t: 8, n: ["A1"] }, { t: 12, n: ["F1"] }],
    chords: [{ t: 0, n: ["C4", "E4", "G4"] }, { t: 4, n: ["G3", "B3", "D4"] }, { t: 8, n: ["A3", "C4", "E4"] }, { t: 12, n: ["F3", "A3", "C4"] }],
    lead: [{ t: 0, n: ["C5"] }, { t: 2, n: ["E5"] }, { t: 4, n: ["G5"] }, { t: 6, n: ["C6"] }, { t: 8, n: ["A5"] }, { t: 10, n: ["G5"] }, { t: 12, n: ["F5"] }, { t: 14, n: ["G5"] }],
    leadWave: "square",
  },
};

class Engine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  verb!: ConvolverNode;
  noiseBuf!: AudioBuffer;
  track: TrackName | null = null;
  step = 0;
  nextTime = 0;
  timer: number | null = null;
  musicVol = 0.38;
  sfxVol = 0.85;
  muted = false;

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    }
    const Ctor: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 24; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.22;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    comp.connect(this.master).connect(ctx.destination);

    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicVol; this.musicBus.connect(comp);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.sfxVol; this.sfxBus.connect(comp);

    // Generated plate-style reverb impulse.
    const len = Math.floor(ctx.sampleRate * 2.1);
    const imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = imp.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.verb = ctx.createConvolver(); this.verb.buffer = imp;
    const verbGain = ctx.createGain(); verbGain.gain.value = 0.3;
    this.verb.connect(verbGain).connect(comp);

    const nlen = Math.floor(ctx.sampleRate * 1.2);
    this.noiseBuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    return ctx;
  }

  private osc(type: OscillatorType, freq: number, t: number, dur: number, gain: number, dest?: AudioNode, detune = 0, send = 0.12) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.musicBus);
    if (send > 0) { const s = ctx.createGain(); s.gain.value = send * gain; g.connect(s).connect(this.verb); }
    o.start(t); o.stop(t + dur + 0.05);
  }

  private noise(t: number, dur: number, gain: number, type: BiquadFilterType, freq: number, dest?: AudioNode, q = 1) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.sfxBus);
    src.start(t); src.stop(t + dur + 0.02);
  }

  private kick(t: number, gain = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(gain * 0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.musicBus); o.start(t); o.stop(t + 0.32);
    this.noise(t, 0.03, gain * 0.25, "lowpass", 900, this.musicBus);
  }

  private snare(t: number, gain = 1) {
    this.noise(t, 0.17, gain * 0.34, "highpass", 1500, this.musicBus);
    this.osc("triangle", 190, t, 0.1, gain * 0.16, this.musicBus, 0, 0.2);
  }

  private hat(t: number, gain = 1) { this.noise(t, 0.045, gain * 0.13, "highpass", 7800, this.musicBus); }

  private schedule() {
    const ctx = this.ctx!;
    const p = P[this.track!];
    const spb = 60 / p.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.18) {
      const s = this.step % p.steps;
      const swing = p.swing && s % 2 === 1 ? spb * p.swing : 0;
      const t = this.nextTime + swing;
      if (p.kick.includes(s)) this.kick(t);
      if (p.snare.includes(s)) this.snare(t);
      if (p.hat.includes(s)) this.hat(t, s % 4 === 0 ? 1.2 : 0.7);
      p.bass.filter((b) => b.t === s).forEach((b) => b.n?.forEach((n) => this.osc(p.bassWave ?? "triangle", hz(n), t, spb * 2.4, 0.3, this.musicBus, 0, 0.05)));
      p.chords.filter((c) => c.t === s).forEach((c) =>
        c.n?.forEach((n, i) => this.osc("sawtooth", hz(n), t, spb * 7, 0.055 * (p.padLevel ?? 0.4), this.musicBus, i * 6 - 6, 0.5)));
      p.lead.filter((l) => l.t === s).forEach((l) => l.n?.forEach((n) => this.osc(p.leadWave ?? "triangle", hz(n), t, spb * 1.7, 0.1, this.musicBus, 0, 0.35)));
      this.nextTime += spb;
      this.step++;
    }
    this.timer = window.setTimeout(() => this.schedule(), 40);
  }

  playMusic(track: TrackName) {
    const ctx = this.ensure();
    if (this.track === track && this.timer !== null) return;
    this.stopMusic();
    this.track = track;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.08;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.musicBus.gain.linearRampToValueAtTime(this.muted ? 0 : this.musicVol, ctx.currentTime + 1.2);
    this.schedule();
  }

  stopMusic() {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    this.track = null;
    if (this.ctx) {
      this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicBus.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
    }
  }

  setMusicVolume(v: number) { this.musicVol = v; if (this.ctx && this.track) this.musicBus.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.1); }
  setSfxVolume(v: number) { this.sfxVol = v; if (this.ctx) this.sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  setMuted(m: boolean) {
    this.muted = m;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.08);
  }

  sfx(name: SfxName) {
    const ctx = this.ensure();
    const t = ctx.currentTime + 0.01;
    const B = this.sfxBus;
    switch (name) {
      case "correct":
        ["C5", "E5", "G5", "C6"].forEach((n, i) => this.osc("triangle", hz(n), t + i * 0.055, 0.34, 0.24, B, 0, 0.35));
        break;
      case "wrong":
        this.osc("sawtooth", 180, t, 0.28, 0.2, B, -20, 0.15);
        this.osc("square", 120, t + 0.06, 0.34, 0.2, B, 15, 0.15);
        break;
      case "tick": this.noise(t, 0.02, 0.15, "bandpass", 2400, B, 4); break;
      case "tock": this.noise(t, 0.03, 0.18, "bandpass", 1500, B, 4); break;
      case "whoosh": {
        const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.4;
        f.frequency.setValueAtTime(320, t); f.frequency.exponentialRampToValueAtTime(5200, t + 0.34);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.32, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        src.connect(f).connect(g).connect(B); src.start(t); src.stop(t + 0.45);
        break; }
      case "boom": {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(26, t + 0.9);
        g.gain.setValueAtTime(0.85, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        o.connect(g).connect(B); o.start(t); o.stop(t + 1.2);
        this.noise(t, 0.85, 0.5, "lowpass", 1100, B);
        break; }
      case "powerup":
        [0, 1, 2, 3, 4, 5].forEach((i) => this.osc("square", 330 * Math.pow(1.19, i), t + i * 0.045, 0.18, 0.16, B, 0, 0.3));
        break;
      case "card": this.noise(t, 0.09, 0.3, "highpass", 2600, B); break;
      case "deal": this.noise(t, 0.05, 0.24, "bandpass", 3400, B, 2); break;
      case "coin":
        this.osc("square", 1320, t, 0.08, 0.18, B, 0, 0.3);
        this.osc("square", 1760, t + 0.07, 0.24, 0.18, B, 0, 0.35);
        break;
      case "drumroll":
        for (let i = 0; i < 34; i++) this.noise(t + i * 0.035, 0.05, 0.1 + i * 0.006, "highpass", 1800, B);
        break;
      case "applause":
        for (let i = 0; i < 60; i++) this.noise(t + Math.random() * 1.6, 0.05 + Math.random() * 0.1, 0.05 + Math.random() * 0.07, "bandpass", 1200 + Math.random() * 3200, B, 0.8);
        break;
      case "siren": {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(560, t);
        for (let i = 0; i < 3; i++) {
          o.frequency.linearRampToValueAtTime(980, t + 0.45 + i * 0.9);
          o.frequency.linearRampToValueAtTime(560, t + 0.9 + i * 0.9);
        }
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.1);
        g.gain.setValueAtTime(0.16, t + 2.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.9);
        o.connect(g).connect(B); o.start(t); o.stop(t + 3);
        break; }
      case "buzz":
        this.osc("square", 92, t, 0.5, 0.28, B, 0, 0.05);
        this.osc("square", 61, t, 0.5, 0.22, B, 0, 0.05);
        break;
      case "bell":
        [880, 1320, 1760].forEach((f, i) => this.osc("sine", f, t + i * 0.005, 1.5 - i * 0.3, 0.2 - i * 0.05, B, 0, 0.6));
        break;
      case "reveal":
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.osc("sine", f, t + i * 0.06, 0.7, 0.12, B, 0, 0.55));
        break;
      case "heartbeat":
        this.osc("sine", 62, t, 0.16, 0.5, B, 0, 0.05);
        this.osc("sine", 56, t + 0.22, 0.2, 0.36, B, 0, 0.05);
        break;
      case "chime":
        [1046, 1568].forEach((f, i) => this.osc("sine", f, t + i * 0.08, 0.6, 0.14, B, 0, 0.5));
        break;
      case "click":
      default: this.noise(t, 0.015, 0.18, "highpass", 3800, B); break;
    }
  }
}

let engine: Engine | null = null;
export function audio() {
  if (typeof window === "undefined") return null;
  if (!engine) engine = new Engine();
  return engine;
}
export const sfx = (n: SfxName) => audio()?.sfx(n);
export const music = (t: TrackName) => audio()?.playMusic(t);
export const stopMusic = () => audio()?.stopMusic();
