// ============================================================
// COMBAT ARENA — AUDIO ENGINE (Web Audio API)
// ============================================================

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ---- Tone generators ----

export function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.08) {
  try {
    const ctx = getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + duration);
  } catch { /* silent fail */ }
}

export function playChime() {
  playTone(880, 0.15, 'sine', 0.06);
  setTimeout(() => playTone(1175, 0.15, 'sine', 0.06), 80);
  setTimeout(() => playTone(1320, 0.25, 'sine', 0.05), 160);
}

export function playCoinDrop() {
  playTone(1200, 0.08, 'square', 0.04);
  setTimeout(() => playTone(1600, 0.08, 'square', 0.04), 60);
  setTimeout(() => playTone(2000, 0.12, 'square', 0.03), 120);
}

export function playCardFlip() {
  try {
    const ctx = getCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.01));
    const s = ctx.createBufferSource();
    const g = ctx.createGain();
    s.buffer = buf; g.gain.value = 0.06;
    s.connect(g).connect(ctx.destination);
    s.start();
  } catch { /* silent */ }
}

export function playImpact() {
  playTone(80, 0.25, 'sawtooth', 0.1);
  setTimeout(() => playTone(60, 0.4, 'sawtooth', 0.06), 50);
  try {
    const ctx = getCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    const s = ctx.createBufferSource();
    const g = ctx.createGain(); g.gain.value = 0.12;
    s.buffer = buf; s.connect(g).connect(ctx.destination); s.start();
  } catch { /* silent */ }
}

export function playAlert() {
  playTone(440, 0.1, 'square', 0.05);
  setTimeout(() => playTone(660, 0.1, 'square', 0.05), 120);
  setTimeout(() => playTone(440, 0.15, 'square', 0.04), 240);
}

export function playVictory() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => setTimeout(() => playTone(n, 0.3, 'sine', 0.06), i * 150));
}

export function playDeath() {
  playTone(440, 0.3, 'sawtooth', 0.05);
  setTimeout(() => playTone(330, 0.3, 'sawtooth', 0.04), 200);
  setTimeout(() => playTone(220, 0.5, 'sawtooth', 0.03), 400);
}

export function playDramaticReveal() {
  // deep rumble
  playTone(55, 1.5, 'sawtooth', 0.08);
  setTimeout(() => playTone(65, 1.0, 'sawtooth', 0.06), 300);
  // rising sparkle
  setTimeout(() => {
    [440, 554, 659, 880, 1047, 1319].forEach((n, i) => {
      setTimeout(() => playTone(n, 0.2, 'sine', 0.04), i * 80);
    });
  }, 800);
}

export function playAirdropLand() {
  // Whoosh down
  try {
    const ctx = getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(800, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.6);
  } catch { /* */ }
  setTimeout(() => playImpact(), 450);
  setTimeout(() => playCoinDrop(), 600);
}

export function playCountdown() {
  playTone(440, 0.15, 'square', 0.06);
}

export function playCountdownFinal() {
  playTone(880, 0.3, 'square', 0.08);
  setTimeout(() => playTone(880, 0.3, 'square', 0.08), 150);
}

// ---- Ambient generator ----

let ambientNode: OscillatorNode | null = null;
let ambientRunning = false;

export function startAmbient(theme: 'mafia' | 'werewolf') {
  if (ambientRunning) stopAmbient();
  try {
    const ctx = getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.value = theme === 'mafia' ? 55 : 42;
    f.type = 'lowpass';
    f.frequency.value = theme === 'mafia' ? 120 : 100;
    f.Q.value = 5;
    g.gain.value = 0.015;
    o.connect(f).connect(g).connect(ctx.destination);
    o.start();
    ambientNode = o;
    ambientRunning = true;

    // modulate subtly
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = theme === 'mafia' ? 0.1 : 0.08;
    lfoGain.gain.value = theme === 'mafia' ? 8 : 6;
    lfo.connect(lfoGain).connect(o.frequency);
    lfo.start();
  } catch { /* silent */ }
}

export function stopAmbient() {
  try {
    ambientNode?.stop();
    ambientNode = null;
    ambientRunning = false;
  } catch { /* */ }
}
