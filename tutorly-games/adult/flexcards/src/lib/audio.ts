/*
 * Sound.
 *
 * Two jobs, and they want opposite things.
 *
 * **The word, said out loud.** The right answer is a recording. `speechSynthesis` is a
 * speech *synthesiser*: it reads "serendipity" from its letter sequence using whatever voice
 * the operating system shipped, and on the machines this app runs on that is very often a
 * robotic US voice reading a British word. Wiktionary holds human recordings — a UK speaker, a
 * US speaker, usually several more — so `playRecording` is tried first and the synthesiser is
 * the fallback. The whole point of the pronunciation section is that the learner hears the
 * word correctly, and a synthesised approximation of a word they haven't learned yet teaches
 * them the wrong vowels.
 *
 * **The interface.** The effects are synthesised, deliberately: a single-file build cannot
 * ship a dozen samples without turning into a dozen megabytes, and interface sounds are short
 * transients where synthesis is genuinely the right tool. But the old engine was the classic
 * cheap-sounding version of that — a bare oscillator starting and stopping at full gain, which
 * puts a click on both ends and reads as a beep rather than an instrument. What is here instead:
 *
 *  - **A master chain**, not per-sound gain. One `BiquadFilter` high-shelf at -5.5dB/5.5kHz
 *    (air absorption — a laptop speaker has no business being that bright), one at +2.2dB/190Hz
 *    (cabinet), then a short convolution reverb on a parallel bus, wet mixed per sound.
 *  - **Every burst is a filtered noise transient over a tonal layer.** A harmonic series with
 *    instant attack is what a beep is; a real percussive hit is broadband noise with a fast
 *    envelope, plus some tone for pitch.
 *  - **Envelopes with shapes**, and exponential ramps rather than `stop()` at full gain — that
 *    single change removes the click at the end of every sound.
 */

import { getJson } from "./http";

export type SoundName = "flip" | "know" | "learning" | "session" | "levelUp" | "click" | "whoosh" | "error";

/* ─────────────────────────────────────────────────────────────
 * The word, said out loud
 * ───────────────────────────────────────────────────────────── */

let currentAudio: HTMLAudioElement | null = null;
let availableVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const load = () => {
    availableVoices = window.speechSynthesis.getVoices();
  };
  load();
  // Chrome populates the list asynchronously and fires `voiceschanged` once it has.
  window.speechSynthesis.addEventListener("voiceschanged", load);
}

function isMuted(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.sound === "off";
}

export function stopSpeech(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/**
 * Play a real recording.
 *
 * Resolves `false` when there is nothing to play or the browser refuses, which is the signal
 * the caller needs to fall back to the synthesiser rather than silently doing nothing.
 */
export async function playRecording(url: string): Promise<boolean> {
  if (!url || isMuted()) return false;
  stopSpeech();
  return new Promise((resolve) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.addEventListener("canplaythrough", () => {
      void audio.play().then(() => resolve(true)).catch(() => resolve(false));
    });
    audio.addEventListener("error", () => resolve(false));
    // Some browsers fire neither event for a URL that 404s behind a redirect.
    setTimeout(() => resolve(false), 4000);
    audio.load();
  });
}

/**
 * Say the word, preferring a recording.
 *
 * The fallback picks an en-GB or en-US voice explicitly rather than letting the browser choose:
 * a default voice that happens to be en-IN reading a C1 British English word is not wrong
 * exactly, but it isn't what the deck is teaching either.
 */
export async function speakWord(text: string, options: { recording?: string; lang?: string; rate?: number } = {}): Promise<void> {
  if (!text) return;
  if (options.recording && (await playRecording(options.recording))) return;
  speakText(text, options.lang ?? "en-GB", options.rate ?? 0.92);
}

export function speakText(text: string, lang = "en-GB", rate = 0.92): void {
  if (isMuted() || !text) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;

  const wanted = lang.toLowerCase();
  const voice =
    availableVoices.find((candidate) => candidate.lang.replace("_", "-").toLowerCase() === wanted) ??
    availableVoices.find((candidate) => candidate.lang.toLowerCase().startsWith(wanted.slice(0, 2))) ??
    availableVoices.find((candidate) => /en-GB/i.test(candidate.lang)) ??
    null;
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

/* ─────────────────────────────────────────────────────────────
 * Interface sound
 * ───────────────────────────────────────────────────────────── */

let context: AudioContext | null = null;
let master: GainNode | null = null;
let reverbSend: GainNode | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  context = new Ctor();
  const ctx = context;

  /*
   * The master chain. Two shelves rather than a per-sound filter: the tone of the whole
   * instrument should be one decision, not eight.
   */
  const air = ctx.createBiquadFilter();
  air.type = "highshelf";
  air.frequency.value = 5500;
  air.gain.value = -5.5;

  const cabinet = ctx.createBiquadFilter();
  cabinet.type = "lowshelf";
  cabinet.frequency.value = 190;
  cabinet.gain.value = 2.2;

  const ceiling = ctx.createBiquadFilter();
  ceiling.type = "lowpass";
  ceiling.frequency.value = 12000;

  master = ctx.createGain();
  master.gain.value = 0.32;

  air.connect(cabinet).connect(ceiling).connect(master).connect(ctx.destination);

  /* A short room, on a send bus, so each sound can choose how wet it is. */
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 0;
  const convolver = ctx.createConvolver();
  convolver.buffer = buildImpulse(ctx, 0.9, 2.1);
  const wet = ctx.createGain();
  wet.gain.value = 0.9;
  reverbSend.connect(convolver).connect(wet).connect(master);

  return context;
}

/**
 * A synthetic impulse response.
 *
 * Noise with an exponential decay, which is what a small room's response looks like: dense,
 * brief, and high-frequency content dying faster than low. Two channels, decorrelated, so the
 * reverb lands in stereo instead of straight down the middle.
 */
function buildImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function noiseBuffer(ctx: AudioContext, seconds: number, lowpass: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  /*
   * A one-pole lowpass over the noise, so the burst has a centre rather than being white.
   * White noise is the giveaway that the hit was generated: real impacts have a band.
   */
  let previous = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    previous = previous + lowpass * (white - previous);
    data[i] = previous;
  }
  return buffer;
}

/** A single tonal voice with an exponential envelope, which is what stops the click. */
function tone(ctx: AudioContext, options: {
  frequency: number;
  endFrequency?: number;
  type?: OscillatorType;
  start?: number;
  duration: number;
  gain: number;
  wet?: number;
}): void {
  const { frequency, endFrequency, type = "sine", start = 0, duration, gain, wet = 0.12 } = options;
  const at = ctx.currentTime + start;

  const oscillator = ctx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  if (endFrequency && endFrequency !== frequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), at + duration);
  }

  const envelope = ctx.createGain();
  // Attack from near-zero and release to near-zero: `setValueAtTime(0)` is a hard mute and
  // clicks, so both ends stay just above it.
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.012, duration * 0.2));
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  oscillator.connect(envelope);
  envelope.connect(master!);
  if (reverbSend && wet > 0) {
    const send = ctx.createGain();
    send.gain.value = wet;
    envelope.connect(send).connect(reverbSend);
  }

  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
}

/** A filtered noise transient, layered under or over a tone. */
function burst(ctx: AudioContext, options: {
  start?: number;
  duration: number;
  gain: number;
  frequency: number;
  q?: number;
  type?: BiquadFilterType;
  wet?: number;
}): void {
  const { start = 0, duration, gain, frequency, q = 1.1, type = "bandpass", wet = 0.16 } = options;
  const at = ctx.currentTime + start;

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, duration, 0.35);

  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(frequency, at);
  filter.Q.value = q;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  source.connect(filter).connect(envelope);
  envelope.connect(master!);
  if (reverbSend && wet > 0) {
    const send = ctx.createGain();
    send.gain.value = wet;
    envelope.connect(send).connect(reverbSend);
  }

  source.start(at);
  source.stop(at + duration + 0.02);
}

/*
 * The sounds themselves.
 *
 * Each is a layered pair — a transient and a tone — and the differences between them are in
 * the *interval* and the *register*, not the loudness. An ascending third reads as success and
 * a descending one as failure regardless of how loud either is, so the volume stays roughly
 * constant across all of them and the app never sounds like it is shouting.
 */
export function playSound(name: SoundName): void {
  if (isMuted()) return;
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  if (reverbSend) reverbSend.gain.value = 0.42;

  switch (name) {
    case "click":
      burst(ctx, { duration: 0.035, gain: 0.10, frequency: 2600, q: 0.9, wet: 0.08 });
      tone(ctx, { frequency: 1180, endFrequency: 900, type: "triangle", duration: 0.05, gain: 0.05, wet: 0.06 });
      break;

    case "flip":
      // Paper, not a switch: a wide mid-band swish whose filter sweeps upward.
      burst(ctx, { duration: 0.17, gain: 0.09, frequency: 1500, q: 0.7, wet: 0.18 });
      tone(ctx, { frequency: 420, endFrequency: 660, type: "triangle", duration: 0.13, gain: 0.035, wet: 0.14 });
      break;

    case "whoosh":
      burst(ctx, { duration: 0.34, gain: 0.10, frequency: 900, q: 0.6, wet: 0.3 });
      tone(ctx, { frequency: 260, endFrequency: 140, type: "sine", duration: 0.3, gain: 0.03, wet: 0.26 });
      break;

    case "know": {
      // A major third, bell-like: sine plus its octave, long release.
      tone(ctx, { frequency: 587.33, type: "sine", duration: 0.5, gain: 0.13, wet: 0.34 });
      tone(ctx, { frequency: 1174.66, type: "sine", duration: 0.36, gain: 0.05, wet: 0.3 });
      tone(ctx, { frequency: 880, type: "sine", start: 0.08, duration: 0.46, gain: 0.11, wet: 0.34 });
      burst(ctx, { duration: 0.05, gain: 0.06, frequency: 4200, q: 0.8, wet: 0.2 });
      break;
    }

    case "learning":
      // A minor third, softer and shorter: this is not a failure, it is a "not yet".
      tone(ctx, { frequency: 392, type: "sine", duration: 0.34, gain: 0.11, wet: 0.26 });
      tone(ctx, { frequency: 466.16, type: "sine", start: 0.05, duration: 0.32, gain: 0.09, wet: 0.26 });
      break;

    case "session": {
      // Four ascending notes, the app's one genuinely musical moment.
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((frequency, index) => {
        tone(ctx, { frequency, type: "sine", start: index * 0.09, duration: 0.62, gain: 0.1, wet: 0.4 });
        tone(ctx, { frequency: frequency * 2, type: "sine", start: index * 0.09, duration: 0.4, gain: 0.028, wet: 0.34 });
      });
      burst(ctx, { duration: 0.12, gain: 0.05, frequency: 5200, q: 0.7, wet: 0.3 });
      break;
    }

    case "levelUp": {
      const notes = [659.25, 830.61, 987.77, 1318.51, 1567.98];
      notes.forEach((frequency, index) => {
        tone(ctx, { frequency, type: "triangle", start: index * 0.065, duration: 0.5, gain: 0.09, wet: 0.38 });
      });
      break;
    }

    case "error":
      tone(ctx, { frequency: 196, endFrequency: 165, type: "sawtooth", duration: 0.22, gain: 0.07, wet: 0.14 });
      burst(ctx, { duration: 0.09, gain: 0.05, frequency: 320, q: 0.8, wet: 0.1 });
      break;
  }

  /* Let the tail ring and then close the send, so the room does not bleed into the next sound. */
  window.setTimeout(() => {
    if (reverbSend) reverbSend.gain.value = 0;
  }, 900);
}

/** Call once from a user gesture; browsers will not start an AudioContext before one. */
export function primeAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

/**
 * The video search for the Movie and Song sections.
 *
 * There is no keyless video API, so this does not try to embed anything — it builds a search
 * URL for the platform's own page. Following a link to a search result is honest; embedding a
 * scraped stream is neither legal nor reliable, and a dead embed on a projector is worse than
 * a link.
 */
export async function suggestionsForQuery(query: string): Promise<string[]> {
  const term = query.trim();
  if (!term) return [];
  const data = await getJson<{ word: string }[]>(`https://api.datamuse.com/words?sp=${encodeURIComponent(term)}*&max=6`, `sug:${term.toLowerCase()}`);
  return (data ?? []).map((entry) => entry.word);
}
