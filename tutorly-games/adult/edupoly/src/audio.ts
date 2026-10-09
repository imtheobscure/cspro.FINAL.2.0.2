// ─── AUDIO ENGINE ─────────────────────────────────────────────────────────────
// Uses Web Audio API to synthesize all game sounds (no external files needed)

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

function resumeCtx() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}



// ── Beep utility ──
function beep(freq: number, type: OscillatorType, duration: number, volume = 0.4, delay = 0) {
  const ctx = resumeCtx();
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(freq, now);
  osc.type = type;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.linearRampToValueAtTime(0, now + duration);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

// ── DICE ROLL ──
export function playDiceRoll(muted: boolean) {
  if (muted) return;
  const ctx = resumeCtx();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 1.5;
  src.buffer = buf;
  src.connect(filter);
  filter.connect(ctx.destination);
  src.start();
  // Click sounds
  for (let i = 0; i < 5; i++) {
    beep(180 + Math.random() * 200, 'square', 0.04, 0.3, i * 0.06);
  }
}

// ── CORRECT ANSWER ──
export function playCorrect(muted: boolean) {
  if (muted) return;
  // Happy fanfare arpeggio
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => beep(freq, 'sine', 0.2, 0.35, i * 0.1));
  // Coin shimmer
  setTimeout(() => {
    [1200, 1500, 1800].forEach((f, i) => beep(f, 'triangle', 0.15, 0.2, i * 0.05));
  }, 350);
}

// ── WRONG ANSWER ──
export function playWrong(muted: boolean) {
  if (muted) return;
  beep(220, 'sawtooth', 0.15, 0.3, 0);
  beep(180, 'sawtooth', 0.15, 0.3, 0.12);
  beep(150, 'sawtooth', 0.2,  0.25, 0.24);
}

// ── BUY PROPERTY (cash register) ──
export function playBuy(muted: boolean) {
  if (muted) return;
  const notes = [880, 1100, 1320];
  notes.forEach((freq, i) => beep(freq, 'triangle', 0.12, 0.4, i * 0.07));
  // Metallic click
  setTimeout(() => beep(400, 'square', 0.05, 0.2), 250);
}

// ── PAY RENT (coin drop) ──
export function playPayRent(muted: boolean) {
  if (muted) return;
  [800, 650, 500, 400].forEach((freq, i) => beep(freq, 'sine', 0.08, 0.3, i * 0.06));
}

// ── GO TO JAIL ──
export function playJail(muted: boolean) {
  if (muted) return;
  beep(150, 'square', 0.4, 0.35, 0);
  beep(120, 'square', 0.4, 0.3, 0.15);
  beep(90,  'square', 0.5, 0.25, 0.3);
}

// ── MOVE TOKEN (light step sounds) ──
export function playMove(muted: boolean) {
  if (muted) return;
  beep(600, 'sine', 0.05, 0.15);
}

// ── BUY PROPERTY alias ──

// ── TIMER WARNING ──
export function playTimerWarning(muted: boolean) {
  if (muted) return;
  beep(880, 'square', 0.08, 0.2);
}

// ── TIMER EXPIRE ──
export function playTimerExpire(muted: boolean) {
  if (muted) return;
  [440, 330, 220].forEach((f, i) => beep(f, 'sawtooth', 0.2, 0.3, i * 0.1));
}

// ── WIN / GAME OVER ──
export function playWin(muted: boolean) {
  if (muted) return;
  const melody = [523, 659, 784, 1047, 784, 1047, 1175, 1319];
  melody.forEach((f, i) => beep(f, 'sine', 0.18, 0.5, i * 0.13));
}

// ── AUDIENCE CHEER (synthesized) ──
export function playCheer(muted: boolean) {
  if (muted) return;
  const ctx = resumeCtx();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.sin((i / data.length) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * env * 0.3;
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1500;
  src.buffer = buf;
  src.connect(filter);
  filter.connect(ctx.destination);
  src.start();
}

// ── AUDIENCE GROAN ──
export function playGroan(muted: boolean) {
  if (muted) return;
  const ctx = resumeCtx();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.exp(-i / (data.length * 0.5));
    data[i] = (Math.random() * 2 - 1) * env * 0.2;
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  src.buffer = buf;
  src.connect(filter);
  filter.connect(ctx.destination);
  src.start();
}

// ── BACKGROUND MUSIC (real tracks via Mixkit / stock MP3 URLs) ──
// Note: Browsers require a user gesture before audio can play.

let musicEl: HTMLAudioElement | null = null;
let musicPlaying = false;
let musicMutedFlag = false;
let musicUrl: string | null = null;
let musicVolume = 0.22;

/** Hard mute switch for the background music. Nothing can restart playback while
    this is on — every entry point into the music player checks it. */
export function setMusicMuted(muted: boolean) {
  musicMutedFlag = muted;
  if (muted) {
    musicPlaying = false;
    if (musicEl) musicEl.pause();
  }
}

export function isMusicMuted() {
  return musicMutedFlag;
}

export function isMusicPlaying() {
  return Boolean(musicPlaying && musicEl && !musicEl.paused);
}

function ensureMusicEl() {
  if (!musicEl) {
    musicEl = new Audio();
    musicEl.loop = true;
    musicEl.preload = 'auto';
    (musicEl as any).crossOrigin = 'anonymous';
    musicEl.volume = musicVolume;
  }
  return musicEl;
}

export function setMusicTrack(url: string) {
  musicUrl = url;
  const el = ensureMusicEl();
  if (el.getAttribute('src') !== url) {
    el.setAttribute('src', url);
    el.load();
  }
  if (musicPlaying && !musicMutedFlag && musicVolume > 0) {
    el.play().catch(() => {});
  }
}

export function startBackgroundMusic(muted: boolean, url?: string) {
  const el = ensureMusicEl();
  if (url) setMusicTrack(url);
  if (!musicUrl && el.src) musicUrl = el.src;
  // a muted game must stay silent: never let a caller restart playback
  if (muted || musicMutedFlag || musicVolume <= 0) {
    musicPlaying = false;
    el.pause();
    return;
  }
  musicPlaying = true;
  el.play().catch(() => {});
}

export function stopBackgroundMusic() {
  musicPlaying = false;
  if (musicEl) musicEl.pause();
}

export function setMusicVolume(vol: number) {
  musicVolume = Math.max(0, Math.min(1, vol));
  if (musicEl) musicEl.volume = musicVolume;
}

export function getMusicVolume() {
  return musicVolume;
}

// ── TTS HOST SPEAKER ──
/** Global switch for the spoken host — the game sets it from the sound settings,
    so muting the host voice silences every call site at once. */
let voiceMutedFlag = false;
export function setVoiceMuted(muted: boolean) {
  voiceMutedFlag = muted;
  if (muted && typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}
export function isVoiceMuted() {
  return voiceMutedFlag;
}

export function speak(
  text: string,
  voiceOrUri: SpeechSynthesisVoice | string | null,
  rate = 0.95,
  pitch = 1.05,
  muted = false
) {
  if (muted || voiceMutedFlag) return;
  if (!window.speechSynthesis) return;

  const voices = window.speechSynthesis.getVoices();
  let voice: SpeechSynthesisVoice | null = null;

  if (typeof voiceOrUri === 'string') {
    const uri = voiceOrUri;
    voice = voices.find(v => v.voiceURI === uri) || voices.find(v => v.name === uri) || null;
  } else {
    voice = voiceOrUri;
  }

  // Prefer natural/online voices if nothing was passed
  if (!voice) {
    voice =
      voices.find(v => /natural/i.test(v.name) && /en/i.test(v.lang)) ||
      voices.find(v => /online/i.test(v.name) && /en/i.test(v.lang)) ||
      voices.find(v => v.lang === 'en-US') ||
      voices.find(v => v.lang.startsWith('en')) ||
      null;
  }

  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  if (voice) {
    utt.voice = voice;
    utt.lang = voice.lang;
  } else {
    utt.lang = 'en-US';
  }
  utt.rate = rate;
  utt.pitch = pitch;
  utt.volume = 1;
  window.speechSynthesis.speak(utt);
}

export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}
