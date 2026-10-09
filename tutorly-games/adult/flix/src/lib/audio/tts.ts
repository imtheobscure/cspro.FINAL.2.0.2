/**
 * Text-to-speech, used for three things the classroom actually needs:
 *   • model pronunciation of a target sentence (speaking activities);
 *   • listening-comprehension activities when the video has no matching audio
 *     segment to loop;
 *   • reading a discussion prompt aloud for lower-level groups.
 *
 * It routes through the same mute switch as every other sound in the app, so
 * "🔇 muted" is honest: nothing speaks while it is on.
 */

import { usePlayerStore } from "../../store/player";

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Pick a voice for the language being taught, preferring a local one. */
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const exact = voices.filter((voice) => voice.lang.toLowerCase().startsWith(lang.toLowerCase()));
  return exact.find((voice) => voice.localService) ?? exact[0] ?? voices.find((voice) => voice.default) ?? voices[0];
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  /** Called when the utterance ends (or immediately when muted/unsupported). */
  onEnd?: () => void;
}

export function speak(text: string, options: SpeakOptions = {}): void {
  const { rate = 1, pitch = 1, lang = "en-US", onEnd } = options;
  if (!text.trim()) {
    onEnd?.();
    return;
  }
  if (usePlayerStore.getState().muted || !speechSupported()) {
    onEnd?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = Math.max(0.5, Math.min(1.8, rate));
    utterance.pitch = pitch;
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      currentUtterance = null;
      onEnd?.();
    };
    utterance.onerror = () => {
      currentUtterance = null;
      onEnd?.();
    };
    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch {
    onEnd?.();
  }
}

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  return !!currentUtterance && speechSupported() && window.speechSynthesis.speaking;
}

/** Voices load asynchronously in some browsers; warm them up early. */
export function warmVoices(): void {
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.getVoices();
  } catch {
    /* ignore */
  }
}
