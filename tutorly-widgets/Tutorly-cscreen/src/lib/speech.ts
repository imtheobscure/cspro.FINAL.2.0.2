// Natural voice utilities + speech queue with control + audio analyser for reaction sync

const BAD_NAME_RX = /(david|zira|mark)/i;
const MS_RX = /^Microsoft\b/i;
const AVA_US_RX = /(microsoft\s+ava|ava\s+multilingual|ava)/i;
const MULTILINGUAL_RX = /multilingual/i;
const US_RX = /(en-us|english\s*\(united states\)|united states|united\s*states|us\b)/i;

export function getAllVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis.getVoices();
}

export function getNaturalVoices(): SpeechSynthesisVoice[] {
  const all = getAllVoices();
  if (!all.length) return [];
  // Rank with strong preference for Microsoft Ava multilingual natural (United States).
  const ranked = [...all].sort((a, b) => score(b) - score(a));
  const filtered = ranked.filter((v) => !(MS_RX.test(v.name) && BAD_NAME_RX.test(v.name)));
  return filtered.length ? filtered : ranked;
}

export function getPreferredDefaultVoice(): SpeechSynthesisVoice | null {
  const voices = getNaturalVoices();
  return voices[0] || null;
}

export function getPreferredDefaultVoiceURI(): string {
  return getPreferredDefaultVoice()?.voiceURI || "";
}

function score(v: SpeechSynthesisVoice) {
  let s = 0;
  const n = v.name.toLowerCase();
  const lang = (v.lang || "").toLowerCase();

  // Hard preference requested by user:
  // Microsoft Ava multilingual natural (United States) should win whenever available.
  if (AVA_US_RX.test(v.name) && MULTILINGUAL_RX.test(v.name) && (US_RX.test(v.name) || lang === "en-us")) s += 1000;
  else if (AVA_US_RX.test(v.name) && (US_RX.test(v.name) || lang === "en-us")) s += 700;
  else if (AVA_US_RX.test(v.name)) s += 500;

  if (n.includes("google")) s += 30;
  if (n.includes("natural")) s += 25;
  if (n.includes("neural")) s += 25;
  if (n.includes("premium")) s += 20;
  if (n.includes("enhanced")) s += 18;
  if (n.includes("siri")) s += 15;
  if (n.includes("samantha")) s += 12;
  if (v.localService) s += 2;
  if (BAD_NAME_RX.test(n)) s -= 50;
  // Microsoft voices are no longer penalized when they are the requested preferred family.
  if (MS_RX.test(v.name) && !AVA_US_RX.test(v.name)) s -= 10;
  return s;
}

export function onVoicesReady(cb: () => void) {
  if (typeof speechSynthesis === "undefined") return;
  if (speechSynthesis.getVoices().length) {
    cb();
    return;
  }
  const handler = () => {
    if (speechSynthesis.getVoices().length) {
      speechSynthesis.removeEventListener("voiceschanged", handler);
      cb();
    }
  };
  speechSynthesis.addEventListener("voiceschanged", handler);
  // Some browsers need this kick
  speechSynthesis.getVoices();
}

export interface SpeakOptions {
  text: string;
  voiceURI?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onBoundary?: (word: string) => void;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(opts: SpeakOptions): SpeechSynthesisUtterance | null {
  if (typeof speechSynthesis === "undefined") return null;
  // strip emoji/markdown for speech
  const cleaned = sanitizeForSpeech(opts.text);
  if (!cleaned.trim()) return null;
  const u = new SpeechSynthesisUtterance(cleaned);
  const voices = getAllVoices();
  let v = voices.find((vv) => vv.voiceURI === opts.voiceURI);
  // If no explicit voice is set, or it's invalid/unavailable, always prefer Ava US.
  if (!v) v = getPreferredDefaultVoice() || voices[0];
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  }
  u.rate = clamp(opts.rate ?? 1, 0.5, 2);
  u.pitch = clamp(opts.pitch ?? 1, 0, 2);
  u.volume = clamp(opts.volume ?? 1, 0, 1);
  u.onstart = () => opts.onStart?.();
  u.onend = () => {
    if (currentUtterance === u) currentUtterance = null;
    opts.onEnd?.();
  };
  u.onerror = () => {
    if (currentUtterance === u) currentUtterance = null;
    opts.onEnd?.();
  };
  if (opts.onBoundary) {
    u.onboundary = (e) => {
      const word = cleaned.slice(e.charIndex, e.charIndex + (e.charLength || 0));
      opts.onBoundary!(word);
    };
  }
  currentUtterance = u;
  try {
    speechSynthesis.speak(u);
  } catch {}
  return u;
}

export function pauseSpeech() {
  try {
    speechSynthesis.pause();
  } catch {}
}
export function resumeSpeech() {
  try {
    speechSynthesis.resume();
  } catch {}
}
export function stopSpeech() {
  try {
    speechSynthesis.cancel();
  } catch {}
  currentUtterance = null;
}
export function isSpeaking() {
  return typeof speechSynthesis !== "undefined" && speechSynthesis.speaking;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function sanitizeForSpeech(text: string): string {
  // strip html tags
  const div = document.createElement("div");
  div.innerHTML = text;
  const plain = div.textContent || div.innerText || "";
  // strip emoji
  return plain.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu,
    "",
  );
}
