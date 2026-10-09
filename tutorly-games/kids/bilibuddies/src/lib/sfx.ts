/**
 * Tiny synthesised sound-effect kit (Web Audio) — no external assets, no downloads.
 * All sounds are short, warm and low-stimulation: no sudden loud spikes.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export function setSfxMuted(v: boolean) {
  muted = v;
}
export function isSfxMuted() {
  return muted;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

type ToneOpts = {
  freq: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slide?: number;
};

function tone({ freq, dur = 0.18, type = "sine", gain = 0.5, delay = 0, slide }: ToneOpts) {
  const c = ac();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(60, slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur = 0.12, gain = 0.25, filterFreq = 1800, delay = 0) {
  const c = ac();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
}

export const sfx = {
  /** tapping a card / button */
  pop: () => tone({ freq: 620, dur: 0.12, type: "triangle", gain: 0.4, slide: 900 }),
  tap: () => tone({ freq: 480, dur: 0.08, type: "sine", gain: 0.3 }),
  flip: () => {
    tone({ freq: 400, dur: 0.1, type: "triangle", gain: 0.3, slide: 700 });
    tone({ freq: 800, dur: 0.1, type: "sine", gain: 0.2, delay: 0.06, slide: 1100 });
  },
  whoosh: () => noise(0.25, 0.18, 900),
  drop: () => tone({ freq: 300, dur: 0.16, type: "sine", gain: 0.45, slide: 180 }),
  /** correct answer: rising major triad */
  correct: () => {
    tone({ freq: 523.25, dur: 0.16, type: "triangle", gain: 0.45 });
    tone({ freq: 659.25, dur: 0.16, type: "triangle", gain: 0.45, delay: 0.09 });
    tone({ freq: 783.99, dur: 0.3, type: "triangle", gain: 0.45, delay: 0.18 });
  },
  /** gentle "try again" — soft low blip, never harsh */
  wrong: () => {
    tone({ freq: 260, dur: 0.2, type: "sine", gain: 0.3 });
    tone({ freq: 200, dur: 0.22, type: "sine", gain: 0.25, delay: 0.12 });
  },
  star: () => {
    tone({ freq: 1046.5, dur: 0.14, type: "sine", gain: 0.35 });
    tone({ freq: 1568, dur: 0.22, type: "sine", gain: 0.3, delay: 0.08 });
  },
  clap: () => noise(0.09, 0.4, 2400),
  beat: () => tone({ freq: 180, dur: 0.1, type: "sine", gain: 0.35, slide: 120 }),
  win: () => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone({ freq: f, dur: 0.28, type: "triangle", gain: 0.4, delay: i * 0.1 }),
    );
  },
  sparkle: () => {
    [1200, 1600, 2000].forEach((f, i) => tone({ freq: f, dur: 0.18, type: "sine", gain: 0.22, delay: i * 0.06 }));
  },
  tick: () => tone({ freq: 900, dur: 0.05, type: "sine", gain: 0.18 }),
};
