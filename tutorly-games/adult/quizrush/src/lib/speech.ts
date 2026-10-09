"use client";

// Read-aloud using the browser SpeechSynthesis API.
// On Windows/Edge these map to Microsoft natural voices (e.g. "Microsoft Aria Online").

export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

// Multiple "character" voice presets, chosen from available voices.
export interface VoiceCharacter {
  key: string;
  label: string;
  emoji: string;
  match: RegExp[]; // preferred voice name patterns
  pitch: number;
  rate: number;
}

export const VOICE_CHARACTERS: VoiceCharacter[] = [
  { key: "aria", label: "Aria (Narrator)", emoji: "🎙️", match: [/aria/i, /jenny/i, /female/i, /samantha/i, /zira/i], pitch: 1, rate: 0.98 },
  { key: "guy", label: "Guy (Deep)", emoji: "🧔", match: [/guy/i, /davis/i, /male/i, /david/i, /daniel/i], pitch: 0.85, rate: 0.95 },
  { key: "child", label: "Skye (Bright)", emoji: "🧒", match: [/aria/i, /jenny/i, /female/i], pitch: 1.4, rate: 1.05 },
  { key: "brit", label: "Oliver (British)", emoji: "🎩", match: [/uk/i, /british/i, /george/i, /ryan/i, /libby/i, /en-gb/i], pitch: 1, rate: 0.95 },
];

function pickVoice(char: VoiceCharacter): SpeechSynthesisVoice | undefined {
  const voices = getVoices();
  if (!voices.length) return undefined;
  for (const pat of char.match) {
    const v = voices.find((vc) => pat.test(vc.name) || pat.test(vc.lang));
    if (v) return v;
  }
  return voices.find((v) => /en/i.test(v.lang)) || voices[0];
}

let currentUtter: SpeechSynthesisUtterance | null = null;

export function speak(
  text: string,
  charKey = "aria",
  onEnd?: () => void,
  onBoundary?: (charIndex: number) => void,
) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const char = VOICE_CHARACTERS.find((c) => c.key === charKey) || VOICE_CHARACTERS[0];
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(char);
  if (v) u.voice = v;
  u.pitch = char.pitch;
  u.rate = char.rate;
  u.volume = 1;
  u.onend = () => onEnd?.();
  u.onboundary = (e) => onBoundary?.(e.charIndex);
  currentUtter = u;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtter = null;
}

export function isSpeaking() {
  return typeof window !== "undefined" && window.speechSynthesis?.speaking;
}
