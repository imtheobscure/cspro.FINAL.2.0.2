// Browser-native TTS + ambient/effect audio with crossfade. Singleton.

class AudioEngine {
  private ambient: HTMLAudioElement | null = null;
  private fxPool: HTMLAudioElement[] = [];
  private muted = false;
  private audioCtx: AudioContext | null = null;
  voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const load = () => {
        this.voices = window.speechSynthesis.getVoices();
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }
    // Unlock Web Audio + TTS on the first user gesture so Deploy (which is a
    // click) immediately authorizes ambient/SFX playback in the scene.
    if (typeof window !== "undefined") {
      const unlock = () => {
        try {
          if (!this.audioCtx) {
            const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
            if (Ctx) this.audioCtx = new Ctx();
          }
          if (this.audioCtx && this.audioCtx.state === "suspended") this.audioCtx.resume();
          if ("speechSynthesis" in window) window.speechSynthesis.resume();
        } catch {}
        window.removeEventListener("pointerdown", unlock, true);
        window.removeEventListener("keydown", unlock, true);
      };
      window.addEventListener("pointerdown", unlock, true);
      window.addEventListener("keydown", unlock, true);
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ambient) this.ambient.muted = m;
    if (m && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  // ---- Ambient (with crossfade) -------------------------------------------
  playAmbient(url: string, volume = 0.6, loop = true) {
    if (!url) {
      this.stopAmbient();
      return;
    }
    // Resume Web Audio context (it may be suspended before the first gesture).
    if (this.audioCtx && this.audioCtx.state === "suspended") this.audioCtx.resume();
    const next = new Audio(url);
    next.loop = loop;
    next.volume = 0;
    next.muted = this.muted;
    next.crossOrigin = "anonymous";
    next.preload = "auto";
    const playPromise = next.play();
    if (playPromise) playPromise.catch(() => {
      // If autoplay is blocked, mark as pending and try again on next gesture.
      const tryResume = () => {
        next.play().catch(() => {});
        window.removeEventListener("pointerdown", tryResume, true);
      };
      window.addEventListener("pointerdown", tryResume, true);
    });
    const prev = this.ambient;
    this.ambient = next;
    const target = volume;
    const steps = 20;
    let i = 0;
    const id = setInterval(() => {
      i++;
      const t = i / steps;
      next.volume = Math.min(target, target * t);
      if (prev) prev.volume = Math.max(0, prev.volume * (1 - t));
      if (i >= steps) {
        clearInterval(id);
        prev?.pause();
      }
    }, 40);
  }

  setAmbientVolume(v: number) {
    if (this.ambient) this.ambient.volume = v;
  }

  stopAmbient() {
    const prev = this.ambient;
    this.ambient = null;
    if (!prev) return;
    let v = prev.volume;
    const id = setInterval(() => {
      v -= 0.05;
      prev.volume = Math.max(0, v);
      if (v <= 0) {
        clearInterval(id);
        prev.pause();
      }
    }, 30);
  }

  pauseAll() {
    this.ambient?.pause();
    this.fxPool.forEach((a) => a.pause());
    if ("speechSynthesis" in window) window.speechSynthesis.pause();
  }

  resumeAll() {
    this.ambient?.play().catch(() => {});
    if ("speechSynthesis" in window) window.speechSynthesis.resume();
  }

  // ---- One-shot effect sounds ----------------------------------------------
  playFx(url: string, volume = 1) {
    if (!url || this.muted) return;
    // Resume Web Audio context for autoplay gating.
    if (this.audioCtx && this.audioCtx.state === "suspended") this.audioCtx.resume();
    const a = new Audio(url);
    a.volume = volume;
    a.crossOrigin = "anonymous";
    a.preload = "auto";
    const p = a.play();
    if (p) p.catch(() => {
      const tryAgain = () => {
        a.play().catch(() => {});
        window.removeEventListener("pointerdown", tryAgain, true);
      };
      window.addEventListener("pointerdown", tryAgain, true);
    });
    this.fxPool.push(a);
    a.onended = () => {
      this.fxPool = this.fxPool.filter((x) => x !== a);
    };
  }

  // ---- TTS ----------------------------------------------------------------
  /** Old desktop voices we must NEVER use. */
  private static BLOCKED = ["david", "zira", "mark", "hazel", "george", "susan", "richard", "linda", "heera", "ravi", "sean", "default"];
  /** Edge / online neural voice name fragments we prefer (US, UK, AU, CA, IE, NZ, IN). */
  private static NATURAL = [
    "natural", "online", "ava", "aria", "jenny", "guy", "emma", "brian", "ana", "andrew", "christopher",
    "eric", "michelle", "roger", "steffan", "libby", "maisie", "ryan", "sonia", "thomas", "abbi", "alfie",
    "bella", "elliot", "ethan", "hollie", "noah", "oliver", "olivia", "natasha", "william", "freya", "annette",
    "carly", "darren", "duncan", "elsie", "joanne", "ken", "kim", "neerja", "prabhat", "clara", "liam",
  ];

  private isNatural(v: SpeechSynthesisVoice): boolean {
    const n = v.name.toLowerCase();
    if (AudioEngine.BLOCKED.some((b) => n.includes(b))) return false;
    const enLang = /^en(-|$)/i.test(v.lang);
    if (!enLang) return false;
    return AudioEngine.NATURAL.some((k) => n.includes(k));
  }

  /** All acceptable natural English voices, sorted US > GB > AU > others. */
  naturalVoices(): SpeechSynthesisVoice[] {
    const voices = this.voices.length ? this.voices : (window.speechSynthesis?.getVoices?.() ?? []);
    const rank = (lang: string) => {
      const l = lang.toLowerCase();
      if (l.startsWith("en-us")) return 0;
      if (l.startsWith("en-gb")) return 1;
      if (l.startsWith("en-au")) return 2;
      if (l.startsWith("en-ca")) return 3;
      return 4;
    };
    return voices.filter((v) => this.isNatural(v)).sort((a, b) => rank(a.lang) - rank(b.lang));
  }

  /**
   * Choose the voice to actually use. We NEVER return a blocked desktop voice
   * (David, Zira, Mark, etc.). Order of preference:
   *   1. The requested voiceURI — but ONLY if it is a natural voice.
   *   2. Microsoft Ava (best default).
   *   3. The first available natural English voice (US > GB > AU…).
   *   4. As an absolute last resort, any non-blocked English voice.
   */
  private preferredVoice(voiceURI?: string): SpeechSynthesisVoice | undefined {
    const naturals = this.naturalVoices();
    if (voiceURI) {
      const requested = naturals.find((x) => x.voiceURI === voiceURI);
      if (requested) return requested;
    }
    const ava = naturals.find((x) => x.name.toLowerCase().includes("ava"));
    if (ava) return ava;
    if (naturals.length) return naturals[0];
    // Last resort: any English voice that isn't explicitly blocked.
    const voices = this.voices.length ? this.voices : (window.speechSynthesis?.getVoices?.() ?? []);
    return voices.find((x) => /^en(-|$)/i.test(x.lang) && !AudioEngine.BLOCKED.some((b) => x.name.toLowerCase().includes(b)));
  }

  /**
   * Speak text and return a promise that resolves when speech ends.
   * Estimates duration from text length for browsers that don't fire 'end'.
   */
  speakAsync(text: string, voiceURI?: string, opts: { rate?: number; pitch?: number } = {}): Promise<void> {
    return new Promise((resolve) => {
      if (!text || this.muted || !("speechSynthesis" in window)) {
        setTimeout(resolve, 50);
        return;
      }
      try {
        window.speechSynthesis.cancel(); // stop anything currently speaking
      } catch {}
      const u = new SpeechSynthesisUtterance(text);
      const v = this.preferredVoice(voiceURI);
      if (v) u.voice = v;
      u.rate = opts.rate ?? 1;
      u.pitch = opts.pitch ?? 1;
      const estimatedMs = Math.max(1500, text.length * 55);
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      setTimeout(done, estimatedMs + 800);
      try {
        window.speechSynthesis.speak(u);
      } catch {
        done();
      }
    });
  }

  /** Legacy fire-and-forget speak. */
  speak(text: string, voiceURI?: string, opts: { rate?: number; pitch?: number } = {}) {
    void this.speakAsync(text, voiceURI, opts);
  }

  /**
   * Speak jobs sequentially. Resolves when all lines are finished.
   * Each line awaits the previous so the speakers NEVER overlap.
   */
  async speakSequential(jobs: { text: string; voiceURI?: string; pitch?: number; rate?: number; onStart?: () => void; onEnd?: () => void }[]) {
    if (this.muted || !("speechSynthesis" in window)) {
      jobs.forEach((j) => j.onStart?.());
      jobs.forEach((j) => j.onEnd?.());
      return;
    }
    for (const j of jobs) {
      j.onStart?.();
      await this.speakAsync(j.text, j.voiceURI, { rate: j.rate, pitch: j.pitch });
      j.onEnd?.();
    }
  }

  /** Legacy fire-and-forget queue (NOT sequential — kept for backward compatibility). */
  speakQueue(jobs: { text: string; voiceURI?: string; pitch?: number }[]) {
    jobs.forEach((j) => this.speak(j.text, j.voiceURI, { pitch: j.pitch }));
  }

  stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  /** Synthesised phone-ring (no asset needed). */
  ring() {
    if (this.muted) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const ringOnce = (start: number) => {
        [0, 0.4].forEach((off) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = off === 0 ? 480 : 620;
          o.connect(g);
          g.connect(ctx.destination);
          const t = ctx.currentTime + start + off;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.25, t + 0.02);
          g.gain.setValueAtTime(0.25, t + 0.18);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
          o.start(t);
          o.stop(t + 0.34);
        });
      };
      ringOnce(0);
      ringOnce(1);
    } catch {
      /* no audio */
    }
  }
}

export const audio = new AudioEngine();
