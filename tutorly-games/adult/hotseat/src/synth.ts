/**
 * ─── WEB AUDIO SYNTHESISED SOUND BANK ────────────────────────────────────────
 * Every sound below is generated in the browser with the Web Audio API.
 * There are NO external files, so nothing can 403/404 or need a CDN, and the
 * first note is instant (no download). Longer music beds are synthesised too,
 * so the show still has music when the internet is down.
 *
 * Usage:
 *   playSynth('letsPlay', 0.7)                 // one-shot sting
 *   const h = startSynthLoop('background', .4) // music bed, returns handle
 *   h.stop()                                    // stop it again
 *   setSynthVolume(0.5) / stopAllSynth()
 */

/** Magic value you can store in the audio-URL fields to mean "use the synth". */
export const SYNTH_URL = 'synth:';

export const isSynthUrl = (url?: string | null): boolean => {
  if (!url) return true; // an empty field means "built-in synth", never silence
  const v = url.trim().toLowerCase();
  return v === SYNTH_URL || v === 'synth' || v === 'built-in' || v === 'builtin';
};

export type SynthKey =
  | 'background'
  | 'finalAnswer'
  | 'win'
  | 'lose'
  | 'letsPlay'
  | 'swoosh'
  | 'phoneRing'
  | 'crowdMurmur'
  | 'cashRegister'
  | 'victory'
  | 'heartbeat'
  | 'tick';

const LOOPING: SynthKey[] = ['background', 'finalAnswer', 'heartbeat', 'crowdMurmur', 'phoneRing'];

// ─── AudioContext plumbing ───────────────────────────────────────────────────
type Ctor = new () => AudioContext;

let ctx: AudioContext | null = null;
let masterVol = 0.6;

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  const Ctor = w.AudioContext || w.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
      // Ping-pong delay adds a little stadium space to the stings.
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.22;
      const fb = ctx.createGain();
      fb.gain.value = 0.22;
      const wet = ctx.createGain();
      wet.gain.value = 0.16;
      const pre = ctx.createGain();
      pre.gain.value = 1;
      pre.connect(ctx.destination);
      pre.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(ctx.destination);
      fxBus = pre;
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

let fxBus: GainNode | null = null;

/** Call once from a click/keypress so iOS/Safari will let audio start. */
export function unlockSynth(): void {
  audioCtx();
}

export function setSynthVolume(v: number): void {
  masterVol = Math.max(0, Math.min(1, v));
}

/** Stop every looping synth voice (used by the mute / music toggles). */
export function stopAllSynth(): void {
  activeLoops.forEach(h => h.stop());
  activeLoops.clear();
}

// ─── Small helpers ───────────────────────────────────────────────────────────
let noiseBuf: AudioBuffer | null = null;

function noiseSource(c: AudioContext): AudioBufferSourceNode {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 2), c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  return src;
}

interface ToneOpts {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  peak?: number;
  glideTo?: number;
  attack?: number;
  detune?: number;
}

function tone(c: AudioContext, out: AudioNode, o: ToneOpts): void {
  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, o.at);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.glideTo), o.at + o.dur);
  if (o.detune) osc.detune.value = o.detune;
  const g = c.createGain();
  const peak = (o.peak ?? 0.3) * masterVol;
  const atk = o.attack ?? 0.006;
  g.gain.setValueAtTime(0.0001, o.at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), o.at + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);
  osc.connect(g);
  g.connect(out);
  osc.start(o.at);
  osc.stop(o.at + o.dur + 0.05);
}

function noiseHit(
  c: AudioContext,
  out: AudioNode,
  o: { at: number; dur: number; peak?: number; type?: BiquadFilterType; freq?: number; sweepTo?: number; q?: number }
): void {
  const src = noiseSource(c);
  const f = c.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq ?? 1200, o.at);
  if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(o.sweepTo, o.at + o.dur);
  f.Q.value = o.q ?? 1.1;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, o.at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, (o.peak ?? 0.25) * masterVol), o.at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(o.at);
  src.stop(o.at + o.dur + 0.05);
}

/** A short "cymbal / shimmer" tail used at the end of the big stings. */
function shimmer(c: AudioContext, out: AudioNode, at: number, dur = 1.1, peak = 0.16): void {
  noiseHit(c, out, { at, dur, peak, type: 'highpass', freq: 5200, q: 0.7 });
  noiseHit(c, out, { at: at + 0.01, dur: dur * 0.6, peak: peak * 0.6, type: 'highpass', freq: 9000, q: 0.7 });
}

// ─── The sounds ──────────────────────────────────────────────────────────────
function oneShot(c: AudioContext, out: AudioNode, key: SynthKey): void {
  const t = c.currentTime + 0.03;
  switch (key) {
    // Game-show intro sting: rising whoosh → brass fanfare → shimmer.
    case 'letsPlay': {
      noiseHit(c, out, { at: t, dur: 0.45, peak: 0.22, freq: 300, sweepTo: 5200, q: 0.9 });
      const brass: [number, number][] = [
        [523.25, 0.3], [659.25, 0.52], [783.99, 0.74], [1046.5, 0.96],
      ];
      brass.forEach(([f, at], i) => {
        const a = t + at;
        const d = i === brass.length - 1 ? 1.0 : 0.24;
        tone(c, out, { freq: f, at: a, dur: d, type: 'sawtooth', peak: 0.2 });
        tone(c, out, { freq: f * 1.005, at: a, dur: d, type: 'sawtooth', peak: 0.14, detune: 8 });
        tone(c, out, { freq: f / 2, at: a, dur: d, type: 'triangle', peak: 0.16 });
      });
      // final chord
      [523.25, 659.25, 783.99, 1046.5].forEach(f =>
        tone(c, out, { freq: f, at: t + 0.96, dur: 1.5, type: 'sawtooth', peak: 0.11, attack: 0.02 })
      );
      tone(c, out, { freq: 65.41, at: t + 0.96, dur: 1.4, type: 'sine', peak: 0.3 });
      // sparkle run
      [1567.98, 2093, 2637].forEach((f, i) =>
        tone(c, out, { freq: f, at: t + 1.0 + i * 0.08, dur: 0.5, type: 'triangle', peak: 0.1 })
      );
      shimmer(c, out, t + 0.96, 1.4, 0.2);
      break;
    }
    case 'win': {
      [880, 1174.66, 1567.98].forEach((f, i) => {
        tone(c, out, { freq: f, at: t + i * 0.075, dur: 0.6, type: 'sine', peak: 0.26 });
        tone(c, out, { freq: f * 2, at: t + i * 0.075, dur: 0.4, type: 'sine', peak: 0.09 });
      });
      tone(c, out, { freq: 220, at: t, dur: 0.35, type: 'triangle', peak: 0.14 });
      shimmer(c, out, t + 0.16, 0.7, 0.1);
      break;
    }
    case 'victory': {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
        tone(c, out, { freq: f, at: t + i * 0.115, dur: 0.42, type: 'sawtooth', peak: 0.18 });
        tone(c, out, { freq: f / 2, at: t + i * 0.115, dur: 0.4, type: 'triangle', peak: 0.13 });
      });
      [523.25, 659.25, 783.99, 1046.5].forEach(f =>
        tone(c, out, { freq: f, at: t + 0.6, dur: 2.2, type: 'sawtooth', peak: 0.1, attack: 0.05 })
      );
      tone(c, out, { freq: 65.41, at: t + 0.6, dur: 2.0, type: 'sine', peak: 0.28 });
      [1046.5, 1318.5, 1567.98, 2093].forEach((f, i) =>
        tone(c, out, { freq: f, at: t + 0.7 + i * 0.1, dur: 0.6, type: 'triangle', peak: 0.09 })
      );
      shimmer(c, out, t + 0.6, 2.2, 0.22);
      break;
    }
    case 'lose': {
      // Descending three-note "wah wah wah" + a low thud.
      [392, 349.23, 293.66].forEach((f, i) => {
        const a = t + i * 0.26;
        tone(c, out, { freq: f, at: a, dur: 0.3, type: 'sawtooth', peak: 0.2, glideTo: f * 0.94 });
        tone(c, out, { freq: f * 0.5, at: a, dur: 0.3, type: 'square', peak: 0.09 });
      });
      tone(c, out, { freq: 120, at: t + 0.72, dur: 0.9, type: 'sine', peak: 0.3, glideTo: 45 });
      noiseHit(c, out, { at: t + 0.72, dur: 0.5, peak: 0.12, type: 'lowpass', freq: 400 });
      break;
    }
    case 'cashRegister': {
      noiseHit(c, out, { at: t, dur: 0.12, peak: 0.16, type: 'highpass', freq: 3000 });
      tone(c, out, { freq: 2093, at: t + 0.02, dur: 0.35, type: 'sine', peak: 0.16 });
      tone(c, out, { freq: 2637, at: t + 0.06, dur: 0.4, type: 'sine', peak: 0.12 });
      tone(c, out, { freq: 3136, at: t + 0.1, dur: 0.45, type: 'sine', peak: 0.09 });
      tone(c, out, { freq: 180, at: t + 0.24, dur: 0.3, type: 'triangle', peak: 0.2, glideTo: 90 });
      noiseHit(c, out, { at: t + 0.24, dur: 0.22, peak: 0.14, type: 'lowpass', freq: 700 });
      break;
    }
    case 'swoosh': {
      noiseHit(c, out, { at: t, dur: 0.5, peak: 0.24, freq: 300, sweepTo: 6500, q: 1.4 });
      noiseHit(c, out, { at: t + 0.22, dur: 0.4, peak: 0.16, freq: 4500, sweepTo: 400, q: 1.2 });
      break;
    }
    case 'tick': {
      noiseHit(c, out, { at: t, dur: 0.045, peak: 0.2, type: 'highpass', freq: 2200 });
      tone(c, out, { freq: 1400, at: t, dur: 0.05, type: 'square', peak: 0.07 });
      break;
    }
    // Ring-ring … pause … ring-ring (then stops; loop handle repeats it).
    case 'phoneRing': {
      for (let r = 0; r < 2; r++) {
        const a = t + r * 1.25;
        [440, 480].forEach(f => {
          tone(c, out, { freq: f, at: a, dur: 0.85, type: 'sine', peak: 0.17, attack: 0.02 });
          tone(c, out, { freq: f, at: a + 0.9, dur: 0.85, type: 'sine', peak: 0.17, attack: 0.02 });
        });
      }
      break;
    }
    default:
      break;
  }
}

/** One cycle of a looping bed. `cycleMs` decides when the next cycle is drawn. */
function loopCycle(c: AudioContext, out: AudioNode, key: SynthKey, cycle: number): void {
  const t = c.currentTime + 0.05;
  if (key === 'heartbeat') {
    const beat = (at: number, peak: number) => {
      tone(c, out, { freq: 72, at, dur: 0.22, type: 'sine', peak: peak * 0.5, glideTo: 38 });
      noiseHit(c, out, { at, dur: 0.1, peak: peak * 0.1, type: 'lowpass', freq: 260 });
    };
    beat(t, 1);
    beat(t + 0.3, 0.62);
  } else if (key === 'crowdMurmur') {
    // Blurred brown-ish noise = a room full of people.
    const src = noiseSource(c);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 420 + Math.random() * 380;
    bp.Q.value = 0.7;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.1 * masterVol), t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + cycle);
    src.connect(lp);
    lp.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + cycle + 0.1);
    // a few stray voices
    for (let i = 0; i < 3; i++) {
      tone(c, out, {
        freq: 160 + Math.random() * 260,
        at: t + Math.random() * cycle * 0.8,
        dur: 0.3 + Math.random() * 0.4,
        type: 'triangle',
        peak: 0.03,
      });
    }
  } else if (key === 'background') {
    // Suspense bed: pulsing A minor pad + a heartbeat-ish bass.
    const bar = cycle / 4;
    [110, 164.81, 220, 261.63].forEach(f =>
      tone(c, out, { freq: f, at: t, dur: cycle * 0.98, type: 'sawtooth', peak: 0.045, attack: 0.5 })
    );
    for (let i = 0; i < 4; i++) {
      tone(c, out, { freq: i % 2 === 0 ? 55 : 55, at: t + i * bar, dur: bar * 0.7, type: 'sine', peak: 0.16, glideTo: 41 });
    }
    // tense high shimmer on beat 4
    tone(c, out, { freq: 1244.51, at: t + bar * 3, dur: bar * 1.6, type: 'triangle', peak: 0.03 });
  } else if (key === 'finalAnswer') {
    // Faster, tenser: 8th-note ticking bass + minor-2nd cluster.
    const step = cycle / 8;
    for (let i = 0; i < 8; i++) {
      tone(c, out, { freq: 58, at: t + i * step, dur: step * 0.8, type: 'sine', peak: i % 2 ? 0.1 : 0.18, glideTo: 44 });
      noiseHit(c, out, { at: t + i * step, dur: 0.04, peak: 0.05, type: 'highpass', freq: 3000 });
    }
    [146.83, 155.56, 220, 233.08].forEach(f =>
      tone(c, out, { freq: f, at: t, dur: cycle * 0.95, type: 'sawtooth', peak: 0.035, attack: 0.35 })
    );
  } else if (key === 'phoneRing') {
    for (let r = 0; r < 2; r++) {
      const a = t + r * 1.25;
      [440, 480].forEach(f => {
        tone(c, out, { freq: f, at: a, dur: 0.85, type: 'sine', peak: 0.17, attack: 0.02 });
        tone(c, out, { freq: f, at: a + 0.9, dur: 0.85, type: 'sine', peak: 0.17, attack: 0.02 });
      });
    }
  }
}

function cycleMs(key: SynthKey): number {
  switch (key) {
    case 'heartbeat': return 1000;
    case 'crowdMurmur': return 2600;
    case 'background': return 3200;
    case 'finalAnswer': return 1600;
    case 'phoneRing': return 3000;
    default: return 800;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────
export interface SynthHandle {
  stop: () => void;
}

const activeLoops = new Set<SynthHandle>();

/** Play a one-shot sting. Safe to call before any user gesture (it just no-ops). */
export function playSynth(key: SynthKey, volume = 1): void {
  const c = audioCtx();
  if (!c || !fxBus) return;
  const out = c.createGain();
  out.gain.value = Math.max(0, Math.min(2, volume));
  out.connect(fxBus);
  oneShot(c, out, key);
  // clean up the per-shot bus once the tail has rung out
  window.setTimeout(() => {
    try { out.disconnect(); } catch { /* ignore */ }
  }, key === 'victory' || key === 'letsPlay' ? 4000 : 2000);
}

/**
 * Start a looping bed (music, heartbeat, crowd, phone). Returns a handle whose
 * `stop()` fades out and releases the nodes.
 */
export function startSynthLoop(key: SynthKey, volume = 0.6): SynthHandle {
  const c = audioCtx();
  const handle: SynthHandle = { stop: () => { /* replaced below */ } };
  if (!c || !fxBus) return handle;
  const out = c.createGain();
  out.gain.value = volume;
  out.connect(fxBus);
  let stopped = false;
  let timer = 0;

  const cycle = cycleMs(key) / 1000;
  const run = () => {
    if (stopped || !c) return;
    try {
      loopCycle(c, out, key, cycle);
    } catch {
      /* ignore */
    }
    timer = window.setTimeout(run, cycleMs(key) - 120);
  };
  run();

  handle.stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(timer);
    try {
      const now = c.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    } catch { /* ignore */ }
    window.setTimeout(() => { try { out.disconnect(); } catch { /* ignore */ } }, 700);
    activeLoops.delete(handle);
  };

  activeLoops.add(handle);
  return handle;
}

/** True for the keys that should loop rather than fire once. */
export const isLoopingSound = (key: string): boolean => LOOPING.includes(key as SynthKey);

/** Every key the synth can render (used by the settings screen). */
export const SYNTH_KEYS: SynthKey[] = [
  'background', 'finalAnswer', 'win', 'lose', 'letsPlay', 'swoosh',
  'phoneRing', 'crowdMurmur', 'cashRegister', 'victory', 'heartbeat',
];
