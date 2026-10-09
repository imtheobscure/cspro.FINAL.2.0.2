// ============================================================
// 🏰 KIDS KINGDOM — HIGH-FIDELITY WEB AUDIO SOUND ENGINE
// Zero-latency, crystal-clear celebratory audio effects
// ============================================================

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.08) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + duration);
  } catch { /* silent */ }
}

export function playClick() {
  playTone(520, 0.06, 'triangle', 0.04);
}

export function playQuestDing() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((n, idx) => {
    setTimeout(() => playTone(n, 0.18, 'sine', 0.06), idx * 70);
  });
}

export function playCheckpointUnlock() {
  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.22, 'triangle', 0.07), i * 90);
  });
  setTimeout(() => playStarShower(), 350);
}

export function playHomeworkComplete() {
  const chords = [
    [523.25, 659.25, 783.99],       // C Major
    [587.33, 739.99, 880.00],       // D Major
    [659.25, 830.61, 987.77],       // E Major
    [1046.50, 1318.51, 1567.98]     // High C Major
  ];
  chords.forEach((chord, step) => {
    setTimeout(() => {
      chord.forEach(f => playTone(f, 0.28, 'sine', 0.04));
    }, step * 120);
  });
  setTimeout(() => playCoinClink(), 450);
}

export function playPetFeed() {
  // Cute double-pop + sparkle
  playTone(330, 0.08, 'triangle', 0.06);
  setTimeout(() => playTone(440, 0.08, 'triangle', 0.07), 80);
  setTimeout(() => playTone(587, 0.12, 'sine', 0.08), 160);
  setTimeout(() => playTone(880, 0.2, 'sine', 0.05), 240);
}

export function playStarShower() {
  const freqs = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0];
  freqs.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.15, 'sine', 0.035), i * 50);
  });
}

export function playLevelUpFanfare() {
  const fanfare = [
    { f: 523.25, d: 0.15, t: 0 },
    { f: 523.25, d: 0.15, t: 140 },
    { f: 523.25, d: 0.15, t: 280 },
    { f: 659.25, d: 0.35, t: 420 },
    { f: 587.33, d: 0.18, t: 600 },
    { f: 783.99, d: 0.6,  t: 750 },
    { f: 1046.50, d: 0.8, t: 950 }
  ];
  fanfare.forEach(item => {
    setTimeout(() => {
      playTone(item.f, item.d, 'triangle', 0.08);
      playTone(item.f * 1.5, item.d, 'sine', 0.04);
    }, item.t);
  });
}

export function playMagicSpell() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.4);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.45);
  } catch { /* */ }
  setTimeout(() => playStarShower(), 200);
}

export function playCoinClink() {
  playTone(1760, 0.06, 'square', 0.03);
  setTimeout(() => playTone(2349, 0.09, 'square', 0.03), 60);
  setTimeout(() => playTone(3135, 0.14, 'square', 0.025), 130);
}

export function playStickerStamp() {
  playTone(180, 0.12, 'triangle', 0.08);
  setTimeout(() => playTone(880, 0.25, 'sine', 0.06), 60);
  setTimeout(() => playTone(1320, 0.3, 'sine', 0.04), 140);
}

export function playErrorSound() {
  playTone(280, 0.15, 'sawtooth', 0.05);
  setTimeout(() => playTone(220, 0.25, 'sawtooth', 0.05), 120);
}

export function playPowerUp() {
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.12, 'sawtooth', 0.04), i * 40);
  });
  setTimeout(() => playStarShower(), 300);
}

export function playBossClash() {
  playTone(110, 0.35, 'sawtooth', 0.09);
  setTimeout(() => playTone(164.81, 0.25, 'triangle', 0.08), 80);
  setTimeout(() => playTone(880, 0.2, 'square', 0.04), 160);
}

export function playComboSurge(combo = 1) {
  const base = 440 + Math.min(combo * 60, 600);
  playTone(base, 0.1, 'sine', 0.06);
  setTimeout(() => playTone(base * 1.25, 0.12, 'triangle', 0.07), 70);
  setTimeout(() => playTone(base * 1.5, 0.2, 'square', 0.05), 140);
}

export function playRadarScan() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(400, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  } catch {}
}

export function playTimerTick() {
  playTone(880, 0.03, 'triangle', 0.04);
}

export function playTrophyUnlock() {
  const chords = [
    [523.25, 659.25],
    [587.33, 739.99],
    [659.25, 830.61],
    [783.99, 987.77],
    [1046.50, 1318.51, 1567.98]
  ];
  chords.forEach((c, idx) => {
    setTimeout(() => {
      c.forEach(f => playTone(f, 0.25, 'triangle', 0.05));
    }, idx * 100);
  });
}

export function playEngineRev() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(85, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.28);
  } catch {}
}

export function playNitroBoost() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    // Multi-tone turbo roar + high whistle
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = 'sawtooth';
    o2.type = 'sine';
    o1.frequency.setValueAtTime(120, ctx.currentTime);
    o1.frequency.exponentialRampToValueAtTime(580, ctx.currentTime + 0.4);
    o2.frequency.setValueAtTime(440, ctx.currentTime);
    o2.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.4);
    g.gain.setValueAtTime(0.09, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    o1.connect(g);
    o2.connect(g);
    g.connect(ctx.destination);
    o1.start();
    o2.start();
    o1.stop(ctx.currentTime + 0.45);
    o2.stop(ctx.currentTime + 0.45);
  } catch {}
}

export function playTireScreech() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(950, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.2);
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.22);
  } catch {}
}

export function playMagicEyeSpell() {
  const notes = [659.25, 830.61, 1046.5, 1318.51, 1661.22];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.2, 'sine', 0.05), i * 45);
  });
}

export function playLightningZap() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(1800, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.28);
  } catch {}
}


