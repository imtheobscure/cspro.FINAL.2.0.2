"use client";

/**
 * Tiny synthesized sound-effect kit (audio-design skill):
 * gentle, low-stimulation sounds tiered by importance — tick < pop < ding < fanfare.
 * No external assets, so it always works when screen-sharing.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

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

export function setMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.35;
}
export function isMuted() {
  return muted;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 1, slideTo?: number) {
  const c = ac();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  o.connect(g).connect(master);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}

function noise(start: number, dur: number, vol = 0.4, freq = 1200) {
  const c = ac();
  if (!c || !master) return;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(c.currentTime + start);
}

export const sfx = {
  /** tiny UI tick */
  tick() { tone(880, 0, 0.05, "sine", 0.3); },
  /** soft pop for taps / card pops */
  pop() { tone(420, 0, 0.12, "sine", 0.8, 720); },
  /** card flip whoosh */
  flip() { noise(0, 0.12, 0.25, 2000); },
  /** soft clap for chants */
  clap() { noise(0, 0.09, 0.5, 900); },
  /** correct answer ding */
  ding() { tone(659, 0, 0.18, "triangle", 0.7); tone(988, 0.12, 0.3, "triangle", 0.7); },
  /** gentle "not quite" – never harsh */
  oops() { tone(330, 0, 0.18, "sine", 0.5, 262); },
  /** star earned */
  star() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.25, "triangle", 0.6)); },
  /** level complete fanfare */
  fanfare() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, "triangle", 0.6));
    [262, 330, 392, 523].forEach((f, i) => tone(f, i * 0.12, 0.5, "sine", 0.3));
  },
  /** drop into place */
  snap() { tone(200, 0, 0.08, "square", 0.25, 400); tone(800, 0.05, 0.12, "sine", 0.5); },
  /** metronome beat for chants */
  beat(accent = false) { tone(accent ? 220 : 165, 0, 0.09, "sine", accent ? 0.9 : 0.5); noise(0, 0.03, 0.15, 3000); },
  unlock() { ac(); },
};
