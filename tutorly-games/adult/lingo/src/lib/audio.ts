"use client";

import { speakLine, stopSpeaking } from "./tts";

/**
 * Speak a line out loud. Audio comes from the Azure natural voices when they
 * are configured (Settings → Voice), otherwise from the browser's own voices.
 * `speaker` picks which voice is used, so dialogues sound like different people.
 */
export function speak(text: string, lang = "en-US", rate = 0.9, speaker = "Narrator") {
  void speakLine(text, { language: lang, rate, speaker });
}

export { stopSpeaking };

let ctx: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.18) {
  const ac = audioCtx();
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, ac.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  o.connect(g);
  g.connect(ac.destination);
  o.start(ac.currentTime + start);
  o.stop(ac.currentTime + start + dur + 0.05);
}

export function playCorrect() {
  tone(660, 0, 0.12, "sine");
  tone(880, 0.1, 0.16, "sine");
  tone(1320, 0.22, 0.22, "sine", 0.12);
}

export function playWrong() {
  tone(220, 0, 0.18, "sawtooth", 0.08);
  tone(165, 0.12, 0.25, "sawtooth", 0.08);
}

export function playClick() {
  tone(520, 0, 0.06, "triangle", 0.1);
}

export function playComplete() {
  [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.18, "triangle", 0.14));
}

export function playStreak() {
  [880, 1108, 1318, 1760].forEach((f, i) => tone(f, i * 0.09, 0.15, "sine", 0.14));
}
