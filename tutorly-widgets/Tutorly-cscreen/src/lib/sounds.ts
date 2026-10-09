// WebAudio sound effects. Reusable AudioContext.
let ctx: AudioContext | null = null;
export function getCtx(): AudioContext {
  if (!ctx) {
    const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function playTone(freq: number, dur = 0.15, type: OscillatorType = "sine", vol = 0.2) {
  try {
    const ac = getCtx();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0;
    o.connect(g).connect(ac.destination);
    const now = ac.currentTime;
    g.gain.linearRampToValueAtTime(vol, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now);
    o.stop(now + dur + 0.02);
  } catch {}
}

export function chatPing() {
  playTone(880, 0.08, "sine", 0.15);
  setTimeout(() => playTone(1320, 0.12, "sine", 0.12), 80);
}

export function reactionPop() {
  playTone(660, 0.06, "triangle", 0.18);
}

export function alarmStart() {
  stopAlarm();
  alarmInterval = window.setInterval(() => {
    playTone(880, 0.18, "square", 0.35);
    setTimeout(() => playTone(660, 0.18, "square", 0.35), 200);
  }, 500);
}
let alarmInterval: number | null = null;
export function stopAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

// Background chatter: low gentle pseudo-crowd noise via pink-noise oscillator
let chatterNode: { stop: () => void } | null = null;
export function startChatter() {
  stopChatter();
  try {
    const ac = getCtx();
    const bufferSize = 2 * ac.sampleRate;
    const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + 0.0555179 * white;
      b1 = 0.96 * b1 + 0.2674300 * white;
      b2 = 0.86 * b2 + 0.4708 * white;
      output[i] = (b0 + b1 + b2) * 0.05;
    }
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    const gain = ac.createGain();
    gain.gain.value = 0.04;
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start();
    chatterNode = {
      stop: () => {
        try { src.stop(); } catch {}
      },
    };
  } catch {}
}
export function stopChatter() {
  if (chatterNode) {
    chatterNode.stop();
    chatterNode = null;
  }
}

// Reaction sound: cheerful chord
export function reactionFanfare() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.3, "triangle", 0.18), i * 90));
}

// Mic capture for transcription audio analyser
export async function getMicStream(deviceId?: string): Promise<MediaStream> {
  return await navigator.mediaDevices.getUserMedia({
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
  });
}

export async function listAudioInputs(): Promise<MediaDeviceInfo[]> {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.filter((d) => d.kind === "audioinput");
  } catch {
    return [];
  }
}
