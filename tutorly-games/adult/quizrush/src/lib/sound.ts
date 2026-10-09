"use client";

// Lightweight Web Audio sound engine — no external files, 100% free & reliable.
let ctx: AudioContext | null = null;
let musicNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
let musicOn = false;
let sfxOn = true;
let musicTimer: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function unlockAudio() {
  getCtx();
}

export function setSfx(on: boolean) {
  sfxOn = on;
}
export function isSfxOn() {
  return sfxOn;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2, delay = 0) {
  const c = getCtx();
  if (!c || !sfxOn) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime + delay;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  correct() {
    tone(660, 0.12, "triangle", 0.22);
    tone(880, 0.14, "triangle", 0.22, 0.1);
    tone(1320, 0.2, "triangle", 0.18, 0.2);
  },
  wrong() {
    tone(200, 0.22, "sawtooth", 0.18);
    tone(140, 0.3, "sawtooth", 0.16, 0.08);
  },
  cash() {
    tone(1200, 0.05, "square", 0.14);
    tone(1600, 0.05, "square", 0.13, 0.05);
    tone(2000, 0.08, "square", 0.12, 0.1);
  },
  click() {
    tone(520, 0.05, "square", 0.1);
  },
  powerup() {
    tone(523, 0.1, "triangle", 0.2);
    tone(659, 0.1, "triangle", 0.2, 0.09);
    tone(784, 0.1, "triangle", 0.2, 0.18);
    tone(1047, 0.22, "triangle", 0.2, 0.27);
  },
  tick() {
    tone(880, 0.03, "sine", 0.06);
  },
  countdown() {
    tone(440, 0.14, "sine", 0.14);
  },
  start() {
    tone(392, 0.14, "sawtooth", 0.18);
    tone(523, 0.14, "sawtooth", 0.18, 0.14);
    tone(659, 0.14, "sawtooth", 0.18, 0.28);
    tone(784, 0.3, "sawtooth", 0.2, 0.42);
  },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, "triangle", 0.2, i * 0.12));
  },
  join() {
    tone(700, 0.08, "sine", 0.16);
    tone(1000, 0.1, "sine", 0.14, 0.07);
  },
  levelup() {
    tone(440, 0.1, "square", 0.16);
    tone(660, 0.1, "square", 0.16, 0.09);
    tone(880, 0.18, "square", 0.18, 0.18);
  },
};

// Simple upbeat background loop using arpeggiated pads.
const CHORDS = [
  [261.63, 329.63, 392.0],
  [293.66, 349.23, 440.0],
  [329.63, 415.3, 493.88],
  [349.23, 440.0, 523.25],
];

export function startMusic() {
  const c = getCtx();
  if (!c || musicOn) return;
  musicOn = true;
  let step = 0;
  const play = () => {
    if (!musicOn) return;
    const chord = CHORDS[step % CHORDS.length];
    chord.forEach((f, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = f / (i === 0 ? 2 : 1);
      const t = c.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.4);
      gain.gain.linearRampToValueAtTime(0.0001, t + 1.6);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 1.7);
      musicNodes.push({ osc, gain });
    });
    // bass pluck
    const bass = c.createOscillator();
    const bg = c.createGain();
    bass.type = "sine";
    bass.frequency.value = chord[0] / 4;
    const tb = c.currentTime;
    bg.gain.setValueAtTime(0.08, tb);
    bg.gain.exponentialRampToValueAtTime(0.0001, tb + 0.5);
    bass.connect(bg).connect(c.destination);
    bass.start(tb);
    bass.stop(tb + 0.55);
    step++;
    musicNodes = musicNodes.slice(-24);
  };
  play();
  musicTimer = setInterval(play, 1700);
}

export function stopMusic() {
  musicOn = false;
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

export function isMusicOn() {
  return musicOn;
}
