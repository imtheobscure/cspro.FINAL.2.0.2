// ─── Who Wants To Be A Millionaire Sound Effects ──────────────────────────
// Using Pixabay CDN (royalty-free, direct links) for reliable playback

export const AUDIO_URLS = {
  // Background suspense music - game show tension (2 min)
  suspense: 'https://cdn.pixabay.com/download/audio/2025/02/19/audio_80846e10c4.mp3?filename=delosound-suspense-tension-background-music-302978.mp3',
  
  // Suspense game track (42 seconds - perfect for final answer reveal)
  finalAnswer: 'https://cdn.pixabay.com/download/audio/2025/05/10/audio_a314b7e1fa.mp3?filename=raydellrios-suspense-gamevideo-track-339286.mp3',
  
  // Correct answer - victory ding/fanfare
  correct: 'https://cdn.pixabay.com/download/audio/2024/11/27/audio_8eac518a54.mp3?filename=level-up-191997.mp3',
  
  // Wrong answer - fail buzzer
  wrong: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_942694ed22.mp3?filename=failure-drum-sound-effect-2-7184.mp3',
  
  // "Lets Play" / Game start intro
  letsPlay: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_8cb749d484.mp3?filename=game-start-6104.mp3',
  
  // Tick tock / clock for timer warning
  tick: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_b49e5e64bf.mp3?filename=clock-ticking-in-a-quiet-room-32847.mp3',
  
  // Swoosh for 50:50 lifeline
  swoosh: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_b1c1314fe6.mp3?filename=whoosh-6316.mp3',
  
  // Phone ring for Phone a Friend
  phoneRing: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_b12a543c2c.mp3?filename=old-telephone-ring-14498.mp3',
  
  // Crowd murmur for Ask Audience  
  crowdMurmur: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_63eb44d4c1.mp3?filename=crowd-talking-1-6032.mp3',
  
  // Victory fanfare for winning big
  victory: 'https://cdn.pixabay.com/download/audio/2024/06/05/audio_35f0c2c6d8.mp3?filename=winsquare-6993.mp3',
  
  // Cash register / money sound
  cashRegister: 'https://cdn.pixabay.com/download/audio/2024/02/29/audio_6e56be1f9d.mp3?filename=cash-register-purchase-87313.mp3',
};

class AudioManager {
  private audios: Map<string, HTMLAudioElement> = new Map();
  private bgAudio: HTMLAudioElement | null = null;
  private _muted: boolean = false;
  private _volume: number = 0.5;
  private initialized: boolean = false;
  
  get muted() { return this._muted; }
  get volume() { return this._volume; }

  // Preload all sounds
  init() {
    if (this.initialized) return;
    this.initialized = true;
    
    Object.entries(AUDIO_URLS).forEach(([key, url]) => {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = this._volume;
        audio.src = url;
        audio.crossOrigin = 'anonymous';
        
        // Add event listeners for debugging
        audio.addEventListener('canplaythrough', () => {
          console.log(`[Audio] ${key} loaded successfully`);
        });
        audio.addEventListener('error', (e) => {
          console.warn(`[Audio] ${key} failed to load:`, e);
        });
        
        this.audios.set(key, audio);
      } catch (e) {
        console.warn(`[Audio] Failed to create audio for ${key}:`, e);
      }
    });
  }

  setVolume(vol: number) {
    this._volume = Math.max(0, Math.min(1, vol));
    this.audios.forEach(a => { a.volume = this._volume; });
    if (this.bgAudio) this.bgAudio.volume = this._volume * 0.35;
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    this.audios.forEach(a => { a.muted = muted; });
    if (this.bgAudio) this.bgAudio.muted = muted;
  }

  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  // Play a one-shot sound effect
  play(key: string): Promise<void> {
    if (this._muted) return Promise.resolve();
    const audio = this.audios.get(key);
    if (!audio) {
      console.warn(`[Audio] Sound not found: ${key}`);
      return Promise.resolve();
    }
    
    try {
      // Create a clone for overlapping sounds
      const clone = audio.cloneNode(true) as HTMLAudioElement;
      clone.volume = this._volume;
      clone.muted = this._muted;
      return clone.play().catch((err) => {
        console.warn(`[Audio] Playback failed for ${key}:`, err.message);
      });
    } catch (e) {
      return Promise.resolve();
    }
  }

  // Play background music (looping)
  playBackground(key: string) {
    this.stopBackground();
    const audio = this.audios.get(key);
    if (!audio) {
      console.warn(`[Audio] Background sound not found: ${key}`);
      return;
    }
    
    try {
      this.bgAudio = audio.cloneNode(true) as HTMLAudioElement;
      this.bgAudio.loop = true;
      this.bgAudio.volume = this._volume * 0.3;
      this.bgAudio.muted = this._muted;
      this.bgAudio.currentTime = 0;
      this.bgAudio.play().catch((err) => {
        console.warn(`[Audio] Background playback failed:`, err.message);
      });
    } catch (e) {
      console.warn('[Audio] Background play error:', e);
    }
  }

  // Play a sound once as background (not looping)
  playBackgroundOnce(key: string) {
    this.stopBackground();
    const audio = this.audios.get(key);
    if (!audio) return;
    
    try {
      this.bgAudio = audio.cloneNode(true) as HTMLAudioElement;
      this.bgAudio.loop = false;
      this.bgAudio.volume = this._volume * 0.45;
      this.bgAudio.muted = this._muted;
      this.bgAudio.currentTime = 0;
      this.bgAudio.play().catch(() => {});
    } catch (e) {
      // fail silently
    }
  }

  // Stop background music
  stopBackground() {
    if (this.bgAudio) {
      try {
        this.bgAudio.pause();
        this.bgAudio.currentTime = 0;
        this.bgAudio.loop = false;
      } catch (e) {}
      this.bgAudio = null;
    }
  }

  // Stop all sounds
  stopAll() {
    this.stopBackground();
    this.audios.forEach(a => {
      try { a.pause(); a.currentTime = 0; } catch (e) {}
    });
  }

  // Fade out background
  fadeOutBackground(duration = 1000): Promise<void> {
    return new Promise(resolve => {
      if (!this.bgAudio) { resolve(); return; }
      const bg = this.bgAudio;
      const startVol = bg.volume;
      const steps = 20;
      const stepTime = duration / steps;
      const volStep = startVol / steps;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        bg.volume = Math.max(0, startVol - volStep * step);
        if (step >= steps) {
          clearInterval(interval);
          try { bg.pause(); bg.currentTime = 0; } catch (e) {}
          this.bgAudio = null;
          resolve();
        }
      }, stepTime);
    });
  }
}

// Singleton export
export const audioManager = new AudioManager();
