/**
 * Procedural, zero-asset audio engine.
 * Adaptive music beds (intensity-driven layers) + a full arcade SFX kit,
 * all synthesised live with the Web Audio API so nothing has to download.
 */

export type TrackName = 'lobby' | 'arena' | 'flood' | 'debate' | 'draw' | 'victory' | null;

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type StepFn = (e: Engine, step: number, t: number, i: number) => void;

interface Track {
  bpm: number;
  steps: number;
  fn: StepFn;
}

class Engine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  verb!: ConvolverNode;
  verbGain!: GainNode;
  comp!: DynamicsCompressorNode;

  track: TrackName = null;
  intensity = 0.5;
  musicVol = 0.55;
  sfxVol = 0.9;
  musicOn = true;
  sfxOn = true;

  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private ducked = 0;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx: typeof AudioContext =
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
      window.AudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 6;
    this.comp.attack.value = 0.003;
    this.comp.release.value = 0.22;
    this.master = ctx.createGain();
    this.master.gain.value = 0.95;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVol;
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVol;

    // small hall reverb (generated impulse)
    this.verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.7);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
    }
    this.verb.buffer = buf;
    this.verbGain = ctx.createGain();
    this.verbGain.gain.value = 0.28;

    this.musicBus.connect(this.comp);
    this.sfxBus.connect(this.comp);
    this.musicBus.connect(this.verbGain);
    this.sfxBus.connect(this.verbGain);
    this.verbGain.connect(this.verb);
    this.verb.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(ctx.destination);
  }

  setMusicVol(v: number) {
    this.musicVol = v;
    if (this.ctx) this.musicBus.gain.value = this.musicOn ? v : 0;
  }
  setSfxVol(v: number) {
    this.sfxVol = v;
    if (this.ctx) this.sfxBus.gain.value = this.sfxOn ? v : 0;
  }
  toggleMusic(on: boolean) {
    this.musicOn = on;
    if (this.ctx) this.musicBus.gain.value = on ? this.musicVol : 0;
  }
  toggleSfx(on: boolean) {
    this.sfxOn = on;
    if (this.ctx) this.sfxBus.gain.value = on ? this.sfxVol : 0;
  }

  /** Duck the music for a moment so narration stays intelligible. */
  duck(amount = 0.25, ms = 900) {
    if (!this.ctx || !this.musicOn) return;
    const g = this.musicBus.gain;
    const now = this.ctx.currentTime;
    this.ducked++;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(this.musicVol * amount, now, 0.08);
    window.setTimeout(() => {
      this.ducked--;
      if (this.ducked <= 0 && this.ctx) {
        this.ducked = 0;
        this.musicBus.gain.setTargetAtTime(this.musicOn ? this.musicVol : 0, this.ctx.currentTime, 0.25);
      }
    }, ms);
  }

  play(track: TrackName, intensity = 0.5) {
    this.init();
    this.intensity = intensity;
    if (this.track === track) return;
    this.track = track;
    this.step = 0;
    if (!this.ctx) return;
    this.nextTime = this.ctx.currentTime + 0.06;
    if (this.timer == null) this.timer = window.setInterval(() => this.schedule(), 25);
  }

  setIntensity(i: number) {
    this.intensity = Math.max(0, Math.min(1, i));
  }

  stop() {
    this.track = null;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.track) return;
    const def = TRACKS[this.track];
    if (!def) return;
    const spb = 60 / def.bpm / 4; // 16th
    while (this.nextTime < ctx.currentTime + 0.14) {
      def.fn(this, this.step % def.steps, this.nextTime, this.intensity);
      this.step++;
      this.nextTime += spb;
    }
  }

  // ---------- voices ----------
  env(node: AudioNode, t: number, a: number, d: number, peak: number, bus: GainNode = this.musicBus) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    node.connect(g);
    g.connect(bus);
    return g;
  }

  kick(t: number, gain = 1) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(o, t, 0.004, 0.24, 0.9 * gain);
    o.start(t);
    o.stop(t + 0.3);
    const n = this.noise(0.03);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    n.connect(f);
    this.env(f, t, 0.001, 0.03, 0.25 * gain);
    n.start(t);
  }

  noise(dur: number) {
    const c = this.ctx!;
    const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource();
    s.buffer = b;
    return s;
  }

  snare(t: number, gain = 0.6) {
    const c = this.ctx!;
    const n = this.noise(0.22);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1900;
    f.Q.value = 0.8;
    n.connect(f);
    this.env(f, t, 0.002, 0.16, gain);
    n.start(t);
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.1);
    this.env(o, t, 0.002, 0.1, gain * 0.45);
    o.start(t);
    o.stop(t + 0.16);
  }

  hat(t: number, open = false, gain = 0.22) {
    const c = this.ctx!;
    const n = this.noise(open ? 0.3 : 0.06);
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7800;
    n.connect(f);
    this.env(f, t, 0.001, open ? 0.24 : 0.045, gain);
    n.start(t);
  }

  tone(
    t: number,
    freq: number,
    dur: number,
    type: OscillatorType = 'sawtooth',
    gain = 0.2,
    cutoff = 2400,
    bus?: GainNode,
    detune = 0,
  ) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * 0.35), t + dur);
    f.Q.value = 6;
    o.connect(f);
    this.env(f, t, 0.008, dur, gain, bus ?? this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  pad(t: number, freqs: number[], dur: number, gain = 0.06) {
    freqs.forEach((fq, i) => this.tone(t, fq, dur, 'sawtooth', gain, 1400, this.musicBus, i * 7 - 7));
  }

  // ---------- SFX ----------
  private sfx(fn: () => void) {
    if (!this.sfxOn) return;
    this.init();
    if (!this.ctx) return;
    fn();
  }

  pop(pitch = 1) {
    this.sfx(() => {
      const c = this.ctx!,
        t = c.currentTime;
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(900 * pitch, t);
      o.frequency.exponentialRampToValueAtTime(180 * pitch, t + 0.09);
      this.env(o, t, 0.002, 0.1, 0.5, this.sfxBus);
      o.start(t);
      o.stop(t + 0.14);
      const n = this.noise(0.05);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2400 * pitch;
      n.connect(f);
      this.env(f, t, 0.001, 0.05, 0.25, this.sfxBus);
      n.start(t);
    });
  }

  correct(streak = 0) {
    this.sfx(() => {
      const t = this.ctx!.currentTime;
      const base = 72 + Math.min(streak, 6);
      [0, 4, 7, 12].forEach((s, i) =>
        this.tone(t + i * 0.055, mtof(base + s), 0.3, 'triangle', 0.28, 5200, this.sfxBus),
      );
    });
  }

  wrong() {
    this.sfx(() => {
      const t = this.ctx!.currentTime;
      this.tone(t, mtof(46), 0.3, 'sawtooth', 0.22, 700, this.sfxBus);
      this.tone(t + 0.02, mtof(45), 0.32, 'square', 0.16, 600, this.sfxBus);
    });
  }

  tick() {
    this.sfx(() => {
      const t = this.ctx!.currentTime;
      this.tone(t, 1750, 0.045, 'square', 0.1, 6000, this.sfxBus);
    });
  }

  whoosh() {
    this.sfx(() => {
      const c = this.ctx!,
        t = c.currentTime;
      const n = this.noise(0.5);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(4200, t + 0.35);
      n.connect(f);
      this.env(f, t, 0.08, 0.4, 0.3, this.sfxBus);
      n.start(t);
    });
  }

  buzz() {
    this.sfx(() => {
      const t = this.ctx!.currentTime;
      for (let i = 0; i < 3; i++) this.tone(t + i * 0.09, mtof(38 + i), 0.09, 'square', 0.25, 900, this.sfxBus);
    });
  }

  reveal() {
    this.sfx(() => {
      const t = this.ctx!.currentTime;
      [0, 7, 12, 16, 19, 24].forEach((s, i) =>
        this.tone(t + i * 0.04, mtof(64 + s), 0.5, 'sine', 0.14, 7000, this.sfxBus),
      );
    });
  }

  alarm() {
    this.sfx(() => {
      const t = this.ctx!.currentTime;
      for (let i = 0; i < 4; i++) {
        this.tone(t + i * 0.16, 880, 0.12, 'square', 0.16, 3000, this.sfxBus);
        this.tone(t + i * 0.16 + 0.08, 660, 0.12, 'square', 0.16, 3000, this.sfxBus);
      }
    });
  }

  drown() {
    this.sfx(() => {
      const c = this.ctx!,
        t = c.currentTime;
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 1.4);
      this.env(o, t, 0.02, 1.5, 0.3, this.sfxBus);
      o.start(t);
      o.stop(t + 1.7);
      const n = this.noise(1.6);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1600, t);
      f.frequency.exponentialRampToValueAtTime(180, t + 1.4);
      n.connect(f);
      this.env(f, t, 0.05, 1.5, 0.35, this.sfxBus);
      n.start(t);
    });
  }

  cheer() {
    this.sfx(() => {
      const c = this.ctx!,
        t = c.currentTime;
      const n = this.noise(2.2);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1500;
      f.Q.value = 0.6;
      n.connect(f);
      this.env(f, t, 0.35, 1.9, 0.4, this.sfxBus);
      n.start(t);
      [0, 4, 7, 12, 7, 12, 16].forEach((s, i) =>
        this.tone(t + i * 0.1, mtof(67 + s), 0.5, 'triangle', 0.2, 6000, this.sfxBus),
      );
    });
  }

  stamp() {
    this.sfx(() => {
      const t = this.ctx!.currentTime;
      this.tone(t, 420, 0.08, 'triangle', 0.22, 2600, this.sfxBus);
      this.tone(t + 0.05, 780, 0.1, 'sine', 0.16, 4000, this.sfxBus);
    });
  }

  swell(level: number) {
    this.sfx(() => {
      const t = this.ctx!.currentTime;
      this.tone(t, 120 + level * 40, 0.5, 'sawtooth', 0.12, 500 + level * 300, this.sfxBus);
    });
  }
}

// ---------------- Tracks ----------------
const PROG_MINOR = [
  [57, 60, 64, 67],
  [53, 57, 60, 65],
  [55, 59, 62, 67],
  [53, 56, 60, 63],
];
const PROG_MAJOR = [
  [60, 64, 67, 71],
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [55, 59, 62, 65],
];

const TRACKS: Record<Exclude<TrackName, null>, Track> = {
  lobby: {
    bpm: 84,
    steps: 64,
    fn: (e, s, t, i) => {
      const bar = Math.floor(s / 16);
      const ch = PROG_MAJOR[bar % 4];
      if (s % 16 === 0) e.pad(t, ch.map(mtof), 3.2, 0.045);
      if (s % 4 === 0) e.tone(t, mtof(ch[0] - 24), 0.5, 'sine', 0.16, 600);
      if (s % 2 === 0 && i > 0.2) {
        const n = ch[(s / 2) % ch.length] + 12;
        e.tone(t, mtof(n), 0.35, 'triangle', 0.07, 3200);
      }
      if (s % 8 === 4) e.hat(t, false, 0.08);
    },
  },
  arena: {
    bpm: 128,
    steps: 64,
    fn: (e, s, t, i) => {
      const bar = Math.floor(s / 16);
      const ch = PROG_MINOR[bar % 4];
      if (s % 4 === 0) e.kick(t, 0.95);
      if (s % 8 === 4) e.snare(t, 0.5 + i * 0.2);
      if (s % 2 === 0) e.hat(t, s % 8 === 6, 0.14 + i * 0.1);
      if (s % 2 === 0) e.tone(t, mtof(ch[0] - 24), 0.22, 'square', 0.2, 420 + i * 500);
      const arp = [0, 1, 2, 3, 2, 1, 3, 2];
      if (i > 0.3) {
        const n = ch[arp[s % 8]] + 12;
        e.tone(t, mtof(n), 0.16, 'sawtooth', 0.07 + i * 0.05, 2600 + i * 2600);
      }
      if (s % 16 === 0) e.pad(t, ch.map(mtof), 2.0, 0.035);
    },
  },
  flood: {
    bpm: 150,
    steps: 32,
    fn: (e, s, t, i) => {
      const ch = PROG_MINOR[(Math.floor(s / 16) + 2) % 4];
      if (s % 4 === 0 || (i > 0.6 && s % 8 === 6)) e.kick(t, 1);
      if (s % 8 === 4) e.snare(t, 0.6);
      if (i > 0.45 && s % 8 === 7) e.snare(t, 0.3);
      e.hat(t, false, 0.07 + i * 0.12);
      const seq = [0, 0, 3, 0, 2, 0, 1, 2];
      e.tone(t, mtof(ch[seq[s % 8]] - 24), 0.12, 'sawtooth', 0.17 + i * 0.08, 380 + i * 900);
      if (i > 0.55 && s % 2 === 1) {
        e.tone(t, mtof(ch[(s * 3) % 4] + 24), 0.1, 'square', 0.05 + i * 0.05, 5200);
      }
      if (i > 0.8 && s % 16 === 15) e.tone(t, mtof(ch[0] + 12), 0.5, 'sawtooth', 0.12, 3000);
    },
  },
  debate: {
    bpm: 96,
    steps: 64,
    fn: (e, s, t, i) => {
      const ch = PROG_MINOR[Math.floor(s / 16) % 4];
      if (s % 8 === 0) e.kick(t, 0.6);
      if (s % 16 === 8) e.snare(t, 0.3);
      if (s % 4 === 2) e.hat(t, false, 0.07);
      if (s % 16 === 0) e.pad(t, ch.map(mtof), 3.4, 0.05);
      if (i > 0.5 && s % 4 === 0) e.tone(t, mtof(ch[(s / 4) % 4] - 12), 0.6, 'triangle', 0.09, 1400);
    },
  },
  draw: {
    bpm: 100,
    steps: 64,
    fn: (e, s, t, i) => {
      const ch = PROG_MAJOR[(Math.floor(s / 16) + 1) % 4];
      if (s % 16 === 0) e.pad(t, ch.map(mtof), 3.0, 0.04);
      if (s % 8 === 0) e.tone(t, mtof(ch[0] - 24), 0.7, 'sine', 0.13, 500);
      if (s % 4 === 2 && i > 0.3) e.tone(t, mtof(ch[(s / 4) % 4] + 12), 0.5, 'sine', 0.06, 3600);
      if (s % 8 === 6) e.hat(t, false, 0.05);
    },
  },
  victory: {
    bpm: 120,
    steps: 32,
    fn: (e, s, t) => {
      const ch = PROG_MAJOR[Math.floor(s / 8) % 4];
      if (s % 4 === 0) e.kick(t, 0.8);
      if (s % 8 === 4) e.snare(t, 0.5);
      e.hat(t, s % 8 === 7, 0.12);
      const arp = [0, 2, 1, 3, 2, 3, 1, 2];
      e.tone(t, mtof(ch[arp[s % 8]] + 12), 0.2, 'triangle', 0.14, 6000);
      if (s % 8 === 0) e.pad(t, ch.map(mtof), 1.6, 0.05);
    },
  },
};

export const audio = new Engine();
