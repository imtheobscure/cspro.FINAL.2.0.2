/** Narration (Web Speech Synthesis), live recognition, and a mic talk-time meter. */

export interface VoiceInfo {
  uri: string;
  name: string;
  lang: string;
  natural: boolean;
}

let cache: SpeechSynthesisVoice[] = [];

export function loadVoices(): Promise<VoiceInfo[]> {
  return new Promise((resolve) => {
    const read = () => {
      cache = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
      resolve(
        cache.map((v) => ({
          uri: v.voiceURI,
          name: v.name,
          lang: v.lang,
          natural: /natural|neural|premium|enhanced|siri|google/i.test(v.name),
        })),
      );
    };
    if (!window.speechSynthesis) return resolve([]);
    const list = window.speechSynthesis.getVoices();
    if (list.length) {
      cache = list;
      return read();
    }
    window.speechSynthesis.onvoiceschanged = read;
    setTimeout(read, 900);
  });
}

export interface SpeakOpts {
  voiceURI?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  onStart?: () => void;
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* noop */
  }
}

export function speak(text: string, opts: SpeakOpts = {}) {
  if (!window.speechSynthesis || !text) {
    opts.onEnd?.();
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  if (!cache.length) cache = window.speechSynthesis.getVoices();
  const v = cache.find((x) => x.voiceURI === opts.voiceURI);
  if (v) u.voice = v;
  u.rate = opts.rate ?? 0.96;
  u.pitch = opts.pitch ?? 1;
  u.volume = opts.volume ?? 1;
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  u.onstart = () => opts.onStart?.();
  window.speechSynthesis.speak(u);
}

/** Read a cast dialogue line-by-line with a different voice per character. */
export function speakCast(
  lines: { text: string; voiceURI?: string; pitch?: number; rate?: number }[],
  onLine?: (i: number) => void,
  onDone?: () => void,
) {
  let i = 0;
  const next = () => {
    if (i >= lines.length) {
      onDone?.();
      return;
    }
    const l = lines[i];
    onLine?.(i);
    i++;
    speak(l.text, { voiceURI: l.voiceURI, pitch: l.pitch, rate: l.rate, onEnd: () => setTimeout(next, 220) });
  };
  next();
}

// ------------------- Recognition -------------------
type RecResult = { transcript: string; isFinal: boolean };

interface SRLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
}

export function recognitionSupported() {
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export class Listener {
  private rec: SRLike | null = null;
  private want = false;
  onResult: (r: RecResult) => void = () => {};
  onStateChange: (on: boolean) => void = () => {};
  lang = 'en-US';

  start() {
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as
      | (new () => SRLike)
      | undefined;
    if (!Ctor) return false;
    this.want = true;
    if (this.rec) return true;
    const r = new Ctor();
    r.lang = this.lang;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 3;
    r.onresult = (e: unknown) => {
      const ev = e as { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        let all = '';
        for (let j = 0; j < (res as unknown as { length: number }).length; j++) all += ' ' + res[j].transcript;
        this.onResult({ transcript: all.trim(), isFinal: res.isFinal });
      }
    };
    r.onend = () => {
      this.rec = null;
      this.onStateChange(false);
      if (this.want) setTimeout(() => this.start(), 250);
    };
    r.onerror = () => {
      /* auto-restarts via onend */
    };
    try {
      r.start();
      this.rec = r;
      this.onStateChange(true);
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    this.want = false;
    try {
      this.rec?.stop();
    } catch {
      /* noop */
    }
    this.rec = null;
    this.onStateChange(false);
  }
}

// ------------------- Mic level / talk time -------------------
export class MicMeter {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  level = 0;
  speakingMs = 0;
  onTick: (level: number, speakingMs: number) => void = () => {};

  async start() {
    if (this.stream) return true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return false;
    }
    const Ctx: typeof AudioContext =
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || window.AudioContext;
    this.ctx = new Ctx();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    src.connect(this.analyser);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    let last = performance.now();
    const loop = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      this.level = this.level * 0.7 + Math.min(1, rms * 4.2) * 0.3;
      const now = performance.now();
      if (this.level > 0.12) this.speakingMs += now - last;
      last = now;
      this.onTick(this.level, this.speakingMs);
      this.raf = requestAnimationFrame(loop);
    };
    loop();
    return true;
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
  }
}

/** loose keyword matching for shouted answers */
export function heard(transcript: string, words: string[]) {
  const t = ' ' + transcript.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ') + ' ';
  return words.some((w) => t.includes(' ' + w.toLowerCase().trim() + ' '));
}
