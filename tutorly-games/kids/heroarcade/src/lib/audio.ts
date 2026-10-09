import { Lang, LANG_META } from '../data/types';

/* ------------------------------------------------------------------ */
/*  SFX bus (synthesised, no external files – "audio-design" skill)    */
/* ------------------------------------------------------------------ */
let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let sfxEnabled = true;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.35;
    sfxGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function setSfxEnabled(v: boolean) { sfxEnabled = v; }

function tone(freq: number, dur: number, type: OscillatorType = 'sine', when = 0, vol = 1) {
  if (!sfxEnabled) return;
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
  o.connect(g).connect(sfxGain!);
  o.start(c.currentTime + when);
  o.stop(c.currentTime + when + dur + 0.02);
}

export const sfx = {
  tap: () => tone(600, 0.08, 'triangle'),
  pop: () => { tone(400, 0.05, 'square', 0, 0.6); tone(800, 0.08, 'sine', 0.03); },
  correct: () => { tone(523, 0.12, 'sine'); tone(659, 0.12, 'sine', 0.1); tone(784, 0.2, 'sine', 0.2); },
  wrong: () => { tone(200, 0.2, 'sawtooth', 0, 0.4); tone(160, 0.25, 'sawtooth', 0.15, 0.4); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', i * 0.12)); tone(1319, 0.5, 'triangle', 0.5); },
  whoosh: () => { if (!sfxEnabled) return; const c = ac(); const o = c.createOscillator(); const g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(200, c.currentTime); o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.25); g.gain.setValueAtTime(0.3, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3); o.connect(g).connect(sfxGain!); o.start(); o.stop(c.currentTime + 0.32); },
  chomp: () => { tone(150, 0.08, 'square', 0, 0.5); tone(120, 0.1, 'square', 0.08, 0.5); },
  radio: () => { if (!sfxEnabled) return; const c = ac(); const b = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.4; const s = c.createBufferSource(); s.buffer = b; s.connect(sfxGain!); s.start(); tone(1200, 0.1, 'sine', 0.2, 0.4); },
  rocket: () => { if (!sfxEnabled) return; const c = ac(); const o = c.createOscillator(); const g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(80, c.currentTime); o.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.4); g.gain.setValueAtTime(0.2, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.45); o.connect(g).connect(sfxGain!); o.start(); o.stop(c.currentTime + 0.5); },
  step: () => tone(300, 0.05, 'triangle', 0, 0.5),
  coin: () => { tone(988, 0.08, 'square', 0, 0.4); tone(1319, 0.25, 'square', 0.08, 0.4); },
  roar: () => { if (!sfxEnabled) return; const c = ac(); const o = c.createOscillator(); const g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, c.currentTime); o.frequency.linearRampToValueAtTime(60, c.currentTime + 0.5); g.gain.setValueAtTime(0.3, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.6); o.connect(g).connect(sfxGain!); o.start(); o.stop(c.currentTime + 0.62); },
};

/* ------------------------------------------------------------------ */
/*  TTS – Microsoft Azure Neural voices (kid voices) with fallback     */
/* ------------------------------------------------------------------ */
export interface VoiceOption { id: string; label: string; }

/** Azure neural voices – child voices first where available. */
export const AZURE_VOICES: Record<Lang, VoiceOption[]> = {
  en: [
    { id: 'en-US-AnaNeural', label: 'Ana (child, US)' },
    { id: 'en-GB-MaisieNeural', label: 'Maisie (child, UK)' },
    { id: 'en-US-JennyNeural', label: 'Jenny (friendly)' },
    { id: 'en-US-GuyNeural', label: 'Guy' },
  ],
  zh: [
    { id: 'zh-CN-XiaoshuangNeural', label: 'Xiaoshuang (child)' },
    { id: 'zh-CN-XiaoyouNeural', label: 'Xiaoyou (child)' },
    { id: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao' },
  ],
  fr: [
    { id: 'fr-FR-EloiseNeural', label: 'Eloise (child)' },
    { id: 'fr-FR-DeniseNeural', label: 'Denise' },
  ],
  it: [
    { id: 'it-IT-PierinaNeural', label: 'Pierina' },
    { id: 'it-IT-ElsaNeural', label: 'Elsa' },
  ],
  de: [
    { id: 'de-DE-GiselaNeural', label: 'Gisela (child)' },
    { id: 'de-DE-KatjaNeural', label: 'Katja' },
  ],
  tr: [
    { id: 'tr-TR-EmelNeural', label: 'Emel' },
    { id: 'tr-TR-AhmetNeural', label: 'Ahmet' },
  ],
  fa: [
    { id: 'fa-IR-DilaraNeural', label: 'Dilara' },
    { id: 'fa-IR-FaridNeural', label: 'Farid' },
  ],
};

export interface TtsConfig {
  azureKey: string;
  azureRegion: string;
  voices: Partial<Record<Lang, string>>;
  rate: number; // 0.6 – 1.2
}

/** Add the extra natural child voices Azure actually has per language. */
export const AZURE_VOICES_EXTRA: Partial<Record<Lang, VoiceOption[]>> = {
  en: [{ id: 'en-US-EmmaMultilingualNeural', label: 'Emma (young)' }, { id: 'en-US-AvaMultilingualNeural', label: 'Ava (bright)' }],
  zh: [{ id: 'zh-CN-XiaoyiNeural', label: 'Xiaoyi (girl)' }, { id: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao (young)' }],
  fr: [{ id: 'fr-FR-VivienneMultilingualNeural', label: 'Vivienne (young)' }, { id: 'fr-FR-HenriNeural', label: 'Henri (bright)' }],
  it: [{ id: 'it-IT-IsabellaNeural', label: 'Isabella (warm)' }, { id: 'it-IT-DiegoNeural', label: 'Diego (bright)' }],
  de: [{ id: 'de-DE-AmalaNeural', label: 'Amala (young)' }, { id: 'de-DE-KatjaNeural', label: 'Katja (warm)' }],
  tr: [{ id: 'tr-TR-AhmetNeural', label: 'Ahmet (bright)' }],
  fa: [{ id: 'fa-IR-FaridNeural', label: 'Farid (bright)' }],
};

/** The full choice list offered in Settings, child voices first. */
export function voiceChoices(lang: Lang): VoiceOption[] {
  return [...AZURE_VOICES[lang], ...(AZURE_VOICES_EXTRA[lang] ?? [])];
}

let cfg: TtsConfig = { azureKey: '', azureRegion: 'eastus', voices: {}, rate: 0.9 };
export function setTtsConfig(c: TtsConfig) { cfg = c; }
export function getTtsConfig() { return cfg; }

const cache = new Map<string, string>(); // key -> object URL
let currentAudio: HTMLAudioElement | null = null;
let listeners: ((speaking: boolean) => void)[] = [];
export function onSpeaking(fn: (s: boolean) => void) { listeners.push(fn); return () => { listeners = listeners.filter((l) => l !== fn); }; }
function emit(s: boolean) { listeners.forEach((l) => l(s)); }

export function stopSpeaking() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  emit(false);
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function azureSpeak(text: string, lang: Lang): Promise<boolean> {
  if (!cfg.azureKey) return false;
  const voice = cfg.voices[lang] || AZURE_VOICES[lang][0].id;
  const key = `${voice}|${cfg.rate}|${text}`;
  let url = cache.get(key);
  if (!url) {
    const ratePct = Math.round((cfg.rate - 1) * 100);
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${LANG_META[lang].bcp}"><voice name="${voice}"><prosody rate="${ratePct >= 0 ? '+' : ''}${ratePct}%">${escapeXml(text)}</prosody></voice></speak>`;
    const res = await fetch(`https://${cfg.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': cfg.azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Tutorly',
      },
      body: ssml,
    });
    if (!res.ok) throw new Error(`Azure TTS ${res.status}`);
    const blob = await res.blob();
    url = URL.createObjectURL(blob);
    cache.set(key, url);
  }
  return new Promise((resolve) => {
    const a = new Audio(url);
    currentAudio = a;
    emit(true);
    a.onended = () => { emit(false); resolve(true); };
    a.onerror = () => { emit(false); resolve(false); };
    a.play().catch(() => { emit(false); resolve(false); });
  });
}

/* ------------------------------------------------------------------ */
/*  Which device voice is the natural KID voice?                      */
/* ------------------------------------------------------------------ */

/** True for the free Azure neural voices Edge exposes to the Web Speech API. */
const isNatural = (v: SpeechSynthesisVoice) =>
  /online\s*\(natural\)|natural|neural/i.test(v.name) && /microsoft/i.test(v.name);

/** True for the voices Azure ships as child voices. */
const isChildish = (v: SpeechSynthesisVoice) =>
  /(^|\W)(ana|maisie|xiaoshuang|xiaoyou|eloise|élise|pierina|gisela|amala|emel|dilara)(\W|$)/i.test(v.name);

export function allVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    return window.speechSynthesis.getVoices() ?? [];
  } catch {
    return [];
  }
}

/**
 * Every voice that can read `lang`, best first.
 *
 * The old build took the FIRST voice whose tag matched the language, which on a
 * Windows machine is `Microsoft David Desktop` — the flat, robotic one — even
 * though Edge is holding Microsoft's natural child voices (Ana, Xiaoshuang,
 * Éloïse, Pierina, Gisela, Emel, Dilara) in the very same list. Scoring them is
 * the whole difference between “read aloud” sounding like a robot and sounding
 * like the voice the app advertises.
 */
export function voicesFor(lang: Lang, voices: SpeechSynthesisVoice[] = allVoices()): SpeechSynthesisVoice[] {
  const tag = LANG_META[lang].bcp.toLowerCase();
  const prefix = lang === 'en' ? 'en' : tag.slice(0, 2);
  const wanted = (AZURE_VOICES[lang][0]?.id ?? '').replace(/Neural$/, '').replace(/^[a-z]{2}-[A-Z]{2}-/, '').toLowerCase();
  return voices
    .filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(prefix))
    .map((v) => {
      const name = v.name.toLowerCase();
      let score = 0;
      if (isNatural(v)) score += 40;
      if (isChildish(v)) score += 20;
      if (wanted && name.includes(wanted)) score += 14;
      if (v.lang.replace('_', '-').toLowerCase() === tag) score += 4;
      if (v.default) score += 1;
      return { voice: v, score };
    })
    .sort((a, b) => b.score - a.score || a.voice.name.localeCompare(b.voice.name))
    .map((x) => x.voice);
}

/** The natural Microsoft voices this device can read `lang` with — for the voice test. */
export function naturalVoicesFor(lang: Lang): SpeechSynthesisVoice[] {
  return voicesFor(lang).filter(isNatural);
}

/** Does this device have any natural Microsoft voice at all? */
export function hasNaturalVoices(): boolean {
  return allVoices().some(isNatural);
}

function pickBrowserVoice(lang: Lang, wanted?: string): SpeechSynthesisVoice | undefined {
  const voices = allVoices();
  // A voice chosen in Settings is an Azure id; the device names the same voice
  // "Microsoft Ana Online (Natural) - English (United States)", so match the bare
  // name as well as an exact name/URI.
  if (wanted) {
    const bare = wanted.replace(/Neural$/, '').replace(/^[a-z]{2}-[A-Z]{2}-/, '').toLowerCase();
    const exact = voices.find((v) => v.voiceURI === wanted || v.name === wanted);
    if (exact) return exact;
    const loose = voices.find((v) => v.name.toLowerCase().includes(bare));
    if (loose) return loose;
  }
  return voicesFor(lang)[0];
}

function browserSpeak(text: string, lang: Lang): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_META[lang].bcp;
    u.rate = cfg.rate;
    // A touch high and bright: the register a teacher uses with a 6–12 year old.
    u.pitch = 1.12;
    const voice = pickBrowserVoice(lang, cfg.voices[lang]);
    if (voice) u.voice = voice;
    emit(true);
    u.onend = () => { emit(false); resolve(true); };
    u.onerror = () => { emit(false); resolve(false); };
    try {
      window.speechSynthesis.speak(u);
    } catch {
      emit(false);
      resolve(false);
    }
  });
}

/** Speak text in a language. Uses Azure if configured, otherwise the browser. */
export async function speak(text: string, lang: Lang): Promise<void> {
  stopSpeaking();
  try {
    const ok = await azureSpeak(text, lang);
    if (ok) return;
  } catch (e) {
    console.warn('Azure TTS failed, falling back', e);
  }
  await browserSpeak(text, lang);
}

/* ------------------------------------------------------------------ */
/*  Speech recognition (Web Speech API)                                 */
/* ------------------------------------------------------------------ */
export function recognitionSupported() {
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function listenOnce(lang: Lang, onInterim?: (t: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return reject(new Error('unsupported'));
    const r = new SR();
    r.lang = LANG_META[lang].bcp;
    r.interimResults = true;
    r.maxAlternatives = 3;
    let final = '';
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      onInterim?.(final || interim);
    };
    r.onerror = (e: any) => reject(new Error(e.error));
    r.onend = () => resolve(final.trim());
    r.start();
  });
}

export function normalize(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Fuzzy check that the heard text contains the target (whole or ≥70% prefix). */
export function heardMatches(heard: string, target: string): boolean {
  const h = normalize(heard);
  const t = normalize(target);
  if (!h || !t) return false;
  if (h.includes(t)) return true;
  // per-token loose match
  const tokens = t.split(' ');
  return tokens.every((tok) => {
    if (tok.length <= 2) return h.includes(tok);
    const stem = tok.slice(0, Math.max(3, Math.ceil(tok.length * 0.7)));
    return h.includes(stem);
  });
}

/* ------------------------------------------------------------------ */
/*  Microphone level meter (for Rocket Boosters)                        */
/* ------------------------------------------------------------------ */
export async function startMicMeter(onLevel: (level: number) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const c = ac();
  const src = c.createMediaStreamSource(stream);
  const an = c.createAnalyser();
  an.fftSize = 512;
  src.connect(an);
  const data = new Uint8Array(an.frequencyBinCount);
  let raf = 0;
  const loop = () => {
    an.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
    onLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
    raf = requestAnimationFrame(loop);
  };
  loop();
  return () => { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); src.disconnect(); };
}
