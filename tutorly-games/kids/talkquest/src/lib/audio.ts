'use client';

import { canSpeak, langCode, pitchFor, rateFor, pickVoice } from './voices';

/**
 * TalkQuest audio.
 *
 * Every sound is SYNTHESISED here with the Web Audio API — there is not one
 * audio file and not one network request. The previous version streamed
 * preview MP3s from a CDN, which meant the first "pop" of a lesson arrived a
 * second late (or never, with no internet), and a shared screen-share classroom
 * could not rely on it at all. A synth is instant, exact and works offline.
 *
 * The kit is tuned for children: short, soft, and never punishing. A wrong
 * answer is a gentle two-note "hmm", not a buzz; the reward sounds are bells and
 * arpeggios. Everything is mixed through one master gain so the tutor can mute
 * the whole app with one button (and that choice is remembered).
 *
 * Voice is separate: see `src/lib/voices.ts`, which picks the free Microsoft
 * natural (child) voices and reports honestly what the device has.
 */

export type SfxName =
  | 'pop' | 'select' | 'correct' | 'wrong' | 'star' | 'cheer' | 'fanfare'
  | 'combo' | 'streakBreak' | 'tick' | 'countdown' | 'heartbeat'
  | 'whoosh' | 'thud' | 'unlock' | 'powerup' | 'shield' | 'coin'
  | 'radio' | 'robot' | 'sparkle' | 'alarm' | 'riser' | 'chime'
  | 'boing' | 'splash' | 'tada';

const MUTE_KEY = 'talkquest.audio.v1';

type Note = {
  freq: number;
  /** Seconds from the start of the sound. */
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  /** Glide to this frequency across `dur`. */
  to?: number;
};

type Noise = {
  at?: number;
  dur?: number;
  gain?: number;
  /** Band-pass centre, and where it sweeps to. */
  band?: number;
  to?: number;
  q?: number;
};

/** Named patches: a few notes and/or a noise burst each. */
const PATCHES: Record<SfxName, { notes?: Note[]; noise?: Noise[]; volume?: number }> = {
  pop: { notes: [{ freq: 620, to: 1020, dur: 0.08, gain: 0.2, type: 'sine' }], volume: 0.7 },
  select: { notes: [{ freq: 900, dur: 0.04, gain: 0.09, type: 'triangle' }], volume: 0.6 },
  correct: {
    notes: [
      { freq: 1046, dur: 0.16, gain: 0.14, type: 'sine' },
      { freq: 1318, at: 0.08, dur: 0.16, gain: 0.13, type: 'sine' },
      { freq: 1568, at: 0.16, dur: 0.22, gain: 0.12, type: 'sine' },
    ],
  },
  // A warm "hmm", the sound of a kind adult, never a buzzer.
  wrong: {
    notes: [
      { freq: 392, dur: 0.16, gain: 0.12, type: 'triangle' },
      { freq: 311, at: 0.15, dur: 0.24, gain: 0.11, type: 'triangle' },
    ],
  },
  star: {
    notes: [
      { freq: 1568, dur: 0.18, gain: 0.11, type: 'sine' },
      { freq: 2093, at: 0.07, dur: 0.22, gain: 0.09, type: 'sine' },
      { freq: 2637, at: 0.14, dur: 0.3, gain: 0.07, type: 'sine' },
    ],
  },
  sparkle: {
    notes: [
      { freq: 1760, dur: 0.12, gain: 0.09, type: 'sine' },
      { freq: 2349, at: 0.05, dur: 0.16, gain: 0.07, type: 'sine' },
      { freq: 2793, at: 0.1, dur: 0.2, gain: 0.06, type: 'sine' },
    ],
  },
  cheer: {
    notes: [
      { freq: 523, dur: 0.2, gain: 0.13, type: 'triangle' },
      { freq: 659, at: 0.09, dur: 0.2, gain: 0.13, type: 'triangle' },
      { freq: 784, at: 0.18, dur: 0.24, gain: 0.13, type: 'triangle' },
      { freq: 1046, at: 0.27, dur: 0.36, gain: 0.12, type: 'triangle' },
    ],
  },
  fanfare: {
    notes: [
      { freq: 784, dur: 0.18, gain: 0.14, type: 'triangle' },
      { freq: 784, at: 0.14, dur: 0.12, gain: 0.13, type: 'triangle' },
      { freq: 1046, at: 0.26, dur: 0.18, gain: 0.14, type: 'triangle' },
      { freq: 1318, at: 0.4, dur: 0.42, gain: 0.13, type: 'triangle' },
      { freq: 1568, at: 0.4, dur: 0.42, gain: 0.07, type: 'sine' },
    ],
  },
  tada: {
    notes: [
      { freq: 659, dur: 0.16, gain: 0.14, type: 'triangle' },
      { freq: 880, at: 0.12, dur: 0.16, gain: 0.14, type: 'triangle' },
      { freq: 1108, at: 0.24, dur: 0.4, gain: 0.13, type: 'triangle' },
    ],
  },
  chime: {
    notes: [
      { freq: 1318, dur: 0.5, gain: 0.1, type: 'sine' },
      { freq: 1976, at: 0.02, dur: 0.5, gain: 0.05, type: 'sine' },
    ],
  },
  combo: { notes: [{ freq: 880, dur: 0.14, gain: 0.1, type: 'square' }], volume: 0.5 },
  streakBreak: { notes: [{ freq: 700, to: 220, dur: 0.5, gain: 0.1, type: 'triangle' }] },
  tick: { noise: [{ dur: 0.03, gain: 0.08, band: 3200, q: 1 }], volume: 0.5 },
  countdown: {
    notes: [
      { freq: 880, dur: 0.1, gain: 0.11, type: 'square' },
      { freq: 660, at: 0.12, dur: 0.14, gain: 0.1, type: 'square' },
    ],
    volume: 0.5,
  },
  heartbeat: { notes: [{ freq: 62, dur: 0.16, gain: 0.22, type: 'sine' }, { freq: 55, at: 0.22, dur: 0.2, gain: 0.18, type: 'sine' }] },
  whoosh: { noise: [{ dur: 0.34, gain: 0.14, band: 300, to: 2200, q: 0.8 }] },
  thud: {
    notes: [{ freq: 90, to: 52, dur: 0.2, gain: 0.24, type: 'sine' }],
    noise: [{ dur: 0.08, gain: 0.1, band: 200, q: 0.7 }],
  },
  unlock: {
    notes: [
      { freq: 660, dur: 0.14, gain: 0.1, type: 'triangle' },
      { freq: 880, at: 0.1, dur: 0.14, gain: 0.1, type: 'triangle' },
      { freq: 1320, at: 0.2, dur: 0.3, gain: 0.1, type: 'sine' },
      { freq: 1980, at: 0.22, dur: 0.26, gain: 0.05, type: 'sine' },
    ],
  },
  powerup: {
    notes: [{ freq: 220, to: 1320, dur: 0.42, gain: 0.11, type: 'sawtooth' }],
    noise: [{ dur: 0.4, gain: 0.05, band: 500, to: 2600 }],
  },
  shield: {
    notes: [
      { freq: 523, dur: 0.3, gain: 0.1, type: 'sine' },
      { freq: 784, dur: 0.3, gain: 0.08, type: 'sine' },
      { freq: 1046, dur: 0.3, gain: 0.06, type: 'sine' },
    ],
  },
  coin: {
    notes: [
      { freq: 988, dur: 0.06, gain: 0.1, type: 'square' },
      { freq: 1319, at: 0.06, dur: 0.14, gain: 0.09, type: 'square' },
    ],
    volume: 0.5,
  },
  radio: { noise: [{ dur: 0.14, gain: 0.12, band: 1400, q: 0.6 }, { at: 0.18, dur: 0.06, gain: 0.07, band: 2200, q: 0.5 }] },
  robot: {
    notes: [
      { freq: 220, dur: 0.06, gain: 0.1, type: 'square' },
      { freq: 330, at: 0.08, dur: 0.06, gain: 0.1, type: 'square' },
      { freq: 165, at: 0.16, dur: 0.08, gain: 0.09, type: 'square' },
    ],
    volume: 0.6,
  },
  alarm: {
    notes: [
      { freq: 740, dur: 0.12, gain: 0.09, type: 'sine' },
      { freq: 620, at: 0.16, dur: 0.14, gain: 0.09, type: 'sine' },
    ],
    volume: 0.6,
  },
  riser: {
    noise: [{ dur: 0.8, gain: 0.1, band: 260, to: 3200, q: 0.9 }],
    notes: [{ freq: 160, to: 900, dur: 0.8, gain: 0.05, type: 'triangle' }],
  },
  boing: { notes: [{ freq: 400, to: 900, dur: 0.18, gain: 0.14, type: 'sine' }, { freq: 900, to: 380, at: 0.18, dur: 0.24, gain: 0.12, type: 'sine' }] },
  splash: {
    noise: [{ dur: 0.3, gain: 0.14, band: 900, to: 200, q: 0.6 }],
    notes: [{ freq: 320, to: 120, dur: 0.3, gain: 0.08, type: 'sine' }],
  },
};

class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private music: { stop: () => void }[] = [];
  private intensity = 0;
  private muted = false;

  constructor() {
    this.muted = this.readMuted();
  }

  private readMuted(): boolean {
    try {
      const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(MUTE_KEY);
      return raw ? Boolean(JSON.parse(raw).muted) : false;
    } catch {
      return false;
    }
  }

  private ac(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** A browser will not start audio until the user interacts: this is that nudge. */
  unlock() {
    this.ac();
  }

  isMuted() {
    return this.muted;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      window.localStorage.setItem(MUTE_KEY, JSON.stringify({ muted }));
    } catch {
      /* ignore */
    }
    const ctx = this.ac();
    if (ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
    }
  }

  /** Quiet the music while the voice speaks. */
  duck(ms = 800) {
    const ctx = this.ac();
    if (!ctx || !this.musicBus) return;
    const now = ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.intensity * 0.03, now, 0.05);
    this.musicBus.gain.setTargetAtTime(this.intensity * 0.14, now + ms / 1000, 0.35);
  }

  private noiseBuffer(ctx: AudioContext, seconds: number) {
    const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private tone(n: Note, start: number) {
    const ctx = this.ac();
    if (!ctx || !this.master) return;
    const t0 = start + (n.at ?? 0);
    const dur = n.dur ?? 0.15;
    const peak = (n.gain ?? 0.12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.freq, t0);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, n.to), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, dur * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private burst(n: Noise, start: number) {
    const ctx = this.ac();
    if (!ctx || !this.master) return;
    const t0 = start + (n.at ?? 0);
    const dur = n.dur ?? 0.2;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, dur + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = n.q ?? 0.8;
    filter.frequency.setValueAtTime(n.band ?? 800, t0);
    if (n.to) filter.frequency.exponentialRampToValueAtTime(Math.max(60, n.to), t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(n.gain ?? 0.12, t0 + Math.min(0.02, dur * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  play(name: SfxName, variant = 0) {
    const ctx = this.ac();
    if (!ctx || this.muted) return;
    const patch = PATCHES[name] ?? PATCHES.pop;
    const start = ctx.currentTime + 0.01;

    if (name === 'combo') {
      // A step up the pentatonic ladder for every third hit, so a long combo
      // climbs instead of repeating one note.
      const steps = [880, 988, 1109, 1245, 1319, 1480, 1661, 1760];
      this.tone({ freq: steps[Math.min(variant, steps.length - 1)], dur: 0.12, gain: 0.1, type: 'triangle' }, start);
      this.tone({ freq: steps[Math.min(variant, steps.length - 1)] * 1.5, at: 0.02, dur: 0.16, gain: 0.05, type: 'sine' }, start);
      return;
    }

    const gainScale = patch.volume ?? 1;
    for (const note of patch.notes ?? []) this.tone({ ...note, gain: (note.gain ?? 0.12) * gainScale }, start);
    for (const noise of patch.noise ?? []) this.burst({ ...noise, gain: (noise.gain ?? 0.12) * gainScale }, start);
  }

  setIntensity(v: number) {
    const ctx = this.ac();
    if (!ctx || !this.musicBus) return;
    this.intensity = Math.max(0, Math.min(1, v));
    this.musicBus.gain.setTargetAtTime(this.intensity * 0.14, ctx.currentTime, 0.4);
  }

  /** A very soft pad: root, fifth, octave, breathing through a low-pass. */
  startMusic() {
    const ctx = this.ac();
    if (!ctx || !this.musicBus || this.music.length) return;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.connect(this.musicBus);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    // A gentle A-minor-ish pad: A2, E3, A3.
    [110, 164.8, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = i * 4;
      gain.gain.value = i === 0 ? 0.5 : 0.22;
      osc.connect(gain).connect(filter);
      osc.start();
      this.music.push({ stop: () => { try { osc.stop(); } catch { /* */ } } });
    });
    this.music.push({ stop: () => { try { lfo.stop(); } catch { /* */ } } });
  }

  stopMusic() {
    this.music.forEach((m) => m.stop());
    this.music = [];
  }
}

const synth = new Synth();

export class AudioManager {
  /** Play one of the kit's sounds. `variant` climbs the combo ladder. */
  static playSound(name: SfxName, variant = 0) {
    try {
      synth.play(name, variant);
    } catch {
      /* audio is never worth breaking a lesson over */
    }
  }

  static unlock() {
    try {
      synth.unlock();
    } catch {
      /* ignore */
    }
  }

  static isMuted() {
    return synth.isMuted();
  }

  static setMuted(muted: boolean) {
    try {
      synth.setMuted(muted);
    } catch {
      /* ignore */
    }
  }

  static setIntensity(v: number) {
    try {
      synth.setIntensity(v);
    } catch {
      /* ignore */
    }
  }

  static startMusic() {
    try {
      synth.startMusic();
    } catch {
      /* ignore */
    }
  }

  static stopMusic() {
    try {
      synth.stopMusic();
    } catch {
      /* ignore */
    }
  }

  /**
   * Read a line out loud in the language being taught.
   *
   * The voice is chosen from the device's own list, best first (a natural
   * Microsoft child voice when there is one — see `voices.ts`). Chrome drops an
   * utterance that follows `cancel()` in the same tick, hence the small gap.
   */
  static speak(text: string, lang: string = 'en', onEnd?: () => void) {
    if (!canSpeak() || !text) {
      onEnd?.();
      return;
    }
    const supported = ['en', 'zh', 'fr', 'it', 'de', 'tr', 'fa'] as const;
    const key = (supported as readonly string[]).includes(lang) ? (lang as (typeof supported)[number]) : 'en';
    try {
      const voice = pickVoice(key);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode(key);
      utterance.rate = rateFor(key);
      utterance.pitch = pitchFor(key);
      if (voice) utterance.voice = voice;
      window.speechSynthesis.cancel();
      synth.duck(Math.min(9000, 600 + text.length * 55));
      // Chrome drops an utterance queued in the same tick as cancel().
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          onEnd?.();
        }
      }, 60);
      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
    } catch {
      onEnd?.();
    }
  }

  static stop() {
    if (canSpeak()) window.speechSynthesis.cancel();
  }
}
