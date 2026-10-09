"use client";

/**
 * Speech for Lingo.
 *
 * Dialogues are performed by *Microsoft Azure natural neural voices* — one
 * distinct voice per character, assigned deterministically so a character always
 * sounds the same. Audio can come from three places, tried in this order:
 *
 *   1. the learner's own Azure key (Settings → Voice), sent straight to Azure —
 *      for static hosts with no backend;
 *   2. the app's own `/api/tts` proxy (Express keeps `AZURE_SPEECH_KEY` on the
 *      server, so the key never reaches the browser) — the recommended setup;
 *   3. the browser's built-in voices as a last resort, still one voice per
 *      character, so nothing is ever silent.
 */
import { useEffect, useState } from "react";

export interface Voice {
  id: string;
  label: string;
  locale: string;
  gender: "Female" | "Male";
  note?: string;
}

/** Curated natural voices. Multilingual ones can speak every supported language. */
export const AZURE_VOICES: Voice[] = [
  // Multilingual (speak any of the languages below, ideal for the dialogues)
  { id: "en-US-AvaMultilingualNeural", label: "Ava", locale: "en-US", gender: "Female", note: "multilingual, warm" },
  { id: "en-US-AndrewMultilingualNeural", label: "Andrew", locale: "en-US", gender: "Male", note: "multilingual, friendly" },
  { id: "en-US-EmmaMultilingualNeural", label: "Emma", locale: "en-US", gender: "Female", note: "multilingual, bright" },
  { id: "en-US-BrianMultilingualNeural", label: "Brian", locale: "en-US", gender: "Male", note: "multilingual, casual" },
  // English — US
  { id: "en-US-JennyNeural", label: "Jenny", locale: "en-US", gender: "Female" },
  { id: "en-US-AriaNeural", label: "Aria", locale: "en-US", gender: "Female" },
  { id: "en-US-MichelleNeural", label: "Michelle", locale: "en-US", gender: "Female" },
  { id: "en-US-MonicaNeural", label: "Monica", locale: "en-US", gender: "Female" },
  { id: "en-US-SaraNeural", label: "Sara", locale: "en-US", gender: "Female" },
  { id: "en-US-JaneNeural", label: "Jane", locale: "en-US", gender: "Female" },
  { id: "en-US-NancyNeural", label: "Nancy", locale: "en-US", gender: "Female" },
  { id: "en-US-CoraNeural", label: "Cora", locale: "en-US", gender: "Female" },
  { id: "en-US-ElizabethNeural", label: "Elizabeth", locale: "en-US", gender: "Female" },
  { id: "en-US-GuyNeural", label: "Guy", locale: "en-US", gender: "Male" },
  { id: "en-US-DavisNeural", label: "Davis", locale: "en-US", gender: "Male" },
  { id: "en-US-JasonNeural", label: "Jason", locale: "en-US", gender: "Male" },
  { id: "en-US-TonyNeural", label: "Tony", locale: "en-US", gender: "Male" },
  { id: "en-US-BrandonNeural", label: "Brandon", locale: "en-US", gender: "Male" },
  { id: "en-US-ChristopherNeural", label: "Christopher", locale: "en-US", gender: "Male" },
  { id: "en-US-EricNeural", label: "Eric", locale: "en-US", gender: "Male" },
  { id: "en-US-RogerNeural", label: "Roger", locale: "en-US", gender: "Male" },
  { id: "en-US-SteffanNeural", label: "Steffan", locale: "en-US", gender: "Male" },
  // English — other regions
  { id: "en-GB-SoniaNeural", label: "Sonia", locale: "en-GB", gender: "Female" },
  { id: "en-GB-LibbyNeural", label: "Libby", locale: "en-GB", gender: "Female" },
  { id: "en-GB-RyanNeural", label: "Ryan", locale: "en-GB", gender: "Male" },
  { id: "en-IE-EmilyNeural", label: "Emily", locale: "en-IE", gender: "Female" },
  { id: "en-IE-ConnorNeural", label: "Connor", locale: "en-IE", gender: "Male" },
  { id: "en-AU-NatashaNeural", label: "Natasha", locale: "en-AU", gender: "Female" },
  { id: "en-AU-WilliamNeural", label: "William", locale: "en-AU", gender: "Male" },
  { id: "en-CA-ClaraNeural", label: "Clara", locale: "en-CA", gender: "Female" },
  { id: "en-CA-LiamNeural", label: "Liam", locale: "en-CA", gender: "Male" },
  { id: "en-IN-NeerjaNeural", label: "Neerja", locale: "en-IN", gender: "Female" },
  { id: "en-IN-PrabhatNeural", label: "Prabhat", locale: "en-IN", gender: "Male" },
  // Other teaching languages
  { id: "es-ES-ElviraNeural", label: "Elvira", locale: "es-ES", gender: "Female" },
  { id: "es-MX-DaliaNeural", label: "Dalia", locale: "es-MX", gender: "Female" },
  { id: "es-ES-AlvaroNeural", label: "Álvaro", locale: "es-ES", gender: "Male" },
  { id: "fr-FR-DeniseNeural", label: "Denise", locale: "fr-FR", gender: "Female" },
  { id: "fr-FR-HenriNeural", label: "Henri", locale: "fr-FR", gender: "Male" },
  { id: "de-DE-KatjaNeural", label: "Katja", locale: "de-DE", gender: "Female" },
  { id: "de-DE-ConradNeural", label: "Conrad", locale: "de-DE", gender: "Male" },
  { id: "it-IT-ElsaNeural", label: "Elsa", locale: "it-IT", gender: "Female" },
  { id: "it-IT-DiegoNeural", label: "Diego", locale: "it-IT", gender: "Male" },
  { id: "pt-BR-FranciscaNeural", label: "Francisca", locale: "pt-BR", gender: "Female" },
  { id: "pt-PT-FernandaNeural", label: "Fernanda", locale: "pt-PT", gender: "Female" },
  { id: "tr-TR-EmelNeural", label: "Emel", locale: "tr-TR", gender: "Female" },
  { id: "tr-TR-AhmetNeural", label: "Ahmet", locale: "tr-TR", gender: "Male" },
  { id: "ru-RU-SvetlanaNeural", label: "Svetlana", locale: "ru-RU", gender: "Female" },
  { id: "ar-SA-ZariyahNeural", label: "Zariyah", locale: "ar-SA", gender: "Female" },
  { id: "fa-IR-DilaraNeural", label: "Dilara", locale: "fa-IR", gender: "Female" },
  { id: "fa-IR-FaridNeural", label: "Farid", locale: "fa-IR", gender: "Male" },
  { id: "hi-IN-SwaraNeural", label: "Swara", locale: "hi-IN", gender: "Female" },
  { id: "zh-CN-XiaoxiaoNeural", label: "Xiaoxiao", locale: "zh-CN", gender: "Female" },
  { id: "ja-JP-NanamiNeural", label: "Nanami", locale: "ja-JP", gender: "Female" },
  { id: "ko-KR-SunHiNeural", label: "Sun-Hi", locale: "ko-KR", gender: "Female" },
];

/** Language name → locale prefix, so voices match the language being taught. */
const LANG_PREFIX: Record<string, string> = {
  english: "en", spanish: "es", espanol: "es", français: "fr", french: "fr", german: "de", deutsch: "de",
  italian: "it", italiano: "it", portuguese: "pt", português: "pt", turkish: "tr", russian: "ru",
  arabic: "ar", persian: "fa", farsi: "fa", hindi: "hi", urdu: "ur", chinese: "zh", mandarin: "zh",
  japanese: "ja", korean: "ko", indonesian: "id", vietnamese: "vi", thai: "th", ukrainian: "uk",
  polish: "pl", azerbaijani: "az", kurdish: "ku", hebrew: "he", swahili: "sw",
};

/**
 * Language name → locale prefix.
 *
 * The value may arrive as a full name (“Persian”), a name with its own name in
 * brackets (“Persian (Farsi)”, which is what the pack ships), an ISO code (“fa”) or
 * a full tag (“fa-IR”). All of them must land on the same prefix — labelling a
 * Persian mini lesson “English” was why the feedback 🔊 button read the explanation
 * with an English voice (i.e. not at all).
 */
function localeOf(language?: string): string {
  const raw = (language ?? "").trim().toLowerCase();
  if (!raw) return "en";
  const base = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z\- ]+/g, " ")
    .trim()
    .split(/\s+/)[0] ?? "";
  for (const candidate of [raw, base]) {
    if (LANG_PREFIX[candidate]) return LANG_PREFIX[candidate];
  }
  const code = base.split("-")[0];
  if (LANG_PREFIX[code]) return LANG_PREFIX[code];
  return code && code.length >= 2 ? code : "en";
}

/** A BCP-47 tag for the browser's own voices, e.g. "fa" → "fa-IR". */
const LANG_REGION: Record<string, string> = {
  en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT", pt: "pt-BR", tr: "tr-TR",
  ru: "ru-RU", ar: "ar-SA", fa: "fa-IR", hi: "hi-IN", ur: "ur-PK", zh: "zh-CN", ja: "ja-JP",
  ko: "ko-KR", id: "id-ID", vi: "vi-VN", th: "th-TH", uk: "uk-UA", pl: "pl-PL", nl: "nl-NL",
  sv: "sv-SE", el: "el-GR", ro: "ro-RO", cs: "cs-CZ", da: "da-DK", fi: "fi-FI", no: "nb-NO",
  hu: "hu-HU", bg: "bg-BG", he: "he-IL", az: "az-AZ", ku: "ku-TR", hy: "hy-AM", ka: "ka-GE",
};

function browserLangOf(language?: string): string {
  const prefix = localeOf(language);
  return LANG_REGION[prefix] ?? prefix;
}

/**
 * Voices that fit a language.
 *
 * Voices of the language itself come first and are the only ones used when they
 * exist: mixing in English voices for a language that has its own meant a Persian
 * explanation could be read by an English voice, which sounds like silence.
 */
export function voicesForLanguage(language?: string): Voice[] {
  const prefix = localeOf(language);
  const matching = AZURE_VOICES.filter((v) => v.locale.toLowerCase().startsWith(prefix));
  const multilingual = AZURE_VOICES.filter((v) => v.id.includes("Multilingual"));
  if (matching.length) return [...matching, ...multilingual];
  return [...multilingual, ...AZURE_VOICES.filter((v) => v.locale.startsWith("en"))];
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * One *unique* voice per speaker: each character keeps a stable voice, and two
 * characters in the same dialogue never share one.
 */
export function assignVoices(speakers: string[], language?: string): Record<string, Voice> {
  const pool = voicesForLanguage(language);
  const out: Record<string, Voice> = {};
  const used = new Set<string>();
  for (const speaker of speakers) {
    let idx = hash(speaker.trim().toLowerCase() || "speaker") % pool.length;
    for (let guard = 0; guard < pool.length && used.has(pool[idx].id); guard++) idx = (idx + 1) % pool.length;
    used.add(pool[idx].id);
    out[speaker] = pool[idx];
  }
  return out;
}

export function voiceForSpeaker(speaker: string, language?: string): Voice {
  return assignVoices([speaker], language)[speaker];
}

/* ------------------------------ configuration ----------------------------- */

export interface VoiceConfig {
  /** Use Azure natural voices (falls back to browser voices when unavailable). */
  azure: boolean;
  /** Azure region of the Speech resource, e.g. "westeurope". */
  region: string;
  /** Optional learner-supplied Speech key for static hosting. */
  key: string;
  /** Speaking rate, 0.6 – 1.3. */
  rate: number;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = { azure: true, region: "", key: "", rate: 0.95 };

const CFG_KEY = "tutolingo-voice-v1";

let config: VoiceConfig = { ...DEFAULT_VOICE_CONFIG };
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(CFG_KEY);
    if (raw) config = { ...DEFAULT_VOICE_CONFIG, ...(JSON.parse(raw) as Partial<VoiceConfig>) };
  } catch {
    /* ignore */
  }
}

export function getVoiceConfig(): VoiceConfig {
  ensureLoaded();
  return config;
}

export function setVoiceConfig(patch: Partial<VoiceConfig>) {
  ensureLoaded();
  config = { ...config, ...patch };
  try {
    window.localStorage.setItem(CFG_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

/** React hook: the live voice settings plus an updater. */
export function useVoiceConfig(): [VoiceConfig, (patch: Partial<VoiceConfig>) => void] {
  const [value, setValue] = useState<VoiceConfig>(DEFAULT_VOICE_CONFIG);
  useEffect(() => {
    setValue(getVoiceConfig());
    const fn = () => setValue(getVoiceConfig());
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return [value, setVoiceConfig];
}

/* -------------------------------- playback -------------------------------- */

const blobCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;
/** null = not probed yet, false = the app's own proxy is not available. */
let proxyAvailable: boolean | null = null;

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

function playUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    void audio.play().catch(() => resolve());
  });
}

/** POST to the app's own Azure proxy (keeps the key on the server). */
async function fetchFromProxy(text: string, voiceId: string, rate: number): Promise<string | null> {
  if (proxyAvailable === false) return null;
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: voiceId, rate }),
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("audio")) {
      proxyAvailable = false;
      return null;
    }
    proxyAvailable = true;
    return URL.createObjectURL(await res.blob());
  } catch {
    proxyAvailable = false;
    return null;
  }
}

/** Ask Azure directly, using the key the learner pasted into Settings. */
async function fetchFromAzure(text: string, voice: Voice, cfg: VoiceConfig): Promise<string | null> {
  if (!cfg.key || !cfg.region) return null;
  const lang = voice.locale || "en-US";
  const ssml =
    `<speak version="1.0" xml:lang="${lang}">` +
    `<voice name="${voice.id}"><prosody rate="${Math.round((cfg.rate - 1) * 100)}%">${escapeXml(text)}</prosody></voice>` +
    `</speak>`;
  try {
    const res = await fetch(`https://${cfg.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": cfg.key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      },
      body: ssml,
    });
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  } catch {
    return null;
  }
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c);
}

/**
 * The list of device voices, waiting for them if the browser fills it in late.
 * Mobile browsers (and Safari in particular) return an empty list on the first
 * call and only populate it after `voiceschanged`, which used to leave phones with
 * no voice at all for the learner's language.
 */
function voicesReady(timeout = 900): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
    if (!synth) return resolve([]);
    const now = synth.getVoices?.() ?? [];
    if (now.length) return resolve(now);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.onvoiceschanged = null;
      resolve(synth.getVoices?.() ?? []);
    };
    synth.onvoiceschanged = finish;
    window.setTimeout(finish, timeout);
  });
}

/** The device's voices for a language, one distinct voice per speaker. */
function browserVoiceFor(
  speaker: string,
  lang: string,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  const prefix = localeOf(lang);
  const sameLanguage = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(prefix));
  const pool = sameLanguage.length ? sameLanguage : voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  // No matching voice: let the browser choose rather than forcing a wrong language
  // onto the text (an English voice reading Persian is indistinguishable from mute).
  if (!pool.length) return undefined;
  return pool[hash(speaker.trim().toLowerCase()) % pool.length];
}

async function speakWithBrowser(text: string, speaker: string, lang: string, rate: number): Promise<void> {
  const voices = await voicesReady();
  return new Promise((resolve) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = browserLangOf(lang);
      u.rate = rate;
      const voice = browserVoiceFor(speaker, u.lang, voices);
      if (voice) u.voice = voice;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}

let speechPrimed = false;
/**
 * Mobile browsers only allow speech that starts inside a user gesture. The app
 * primes the engine on the very first tap anywhere, so a later “Play the whole
 * dialogue” works even when the tap that started it was several words ago.
 */
export function unlockSpeech(): void {
  if (speechPrimed || typeof window === "undefined") return;
  speechPrimed = true;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.getVoices?.();
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    synth.speak(u);
    synth.cancel();
  } catch {
    /* ignore */
  }
}

if (typeof document !== "undefined") {
  const prime = () => unlockSpeech();
  document.addEventListener("pointerdown", prime, { once: true, passive: true });
  document.addEventListener("touchstart", prime, { once: true, passive: true });
  document.addEventListener("keydown", prime, { once: true });
}

export interface SpeakOptions {
  /** Character name — decides which voice is used. */
  speaker?: string;
  /** An explicitly chosen voice (overrides the per-speaker assignment). */
  voice?: Voice;
  language?: string;
  rate?: number;
  /** Skip the cache (used by the settings preview button). */
  fresh?: boolean;
}

/**
 * Speak one line with the character's own natural voice.
 * Returns true when Azure (direct or proxied) actually produced the audio.
 */
export async function speakLine(text: string, opts: SpeakOptions = {}): Promise<boolean> {
  const clean = text.trim();
  if (!clean) return false;
  stopSpeaking();
  const cfg = getVoiceConfig();
  const language = opts.language ?? "English";
  const speaker = opts.speaker ?? "Speaker";
  const voice = opts.voice ?? voiceForSpeaker(speaker, language);
  const rate = opts.rate ?? cfg.rate;

  if (cfg.azure) {
    const cacheKey = `${voice.id}|${rate}|${clean}`;
    const cached = !opts.fresh ? blobCache.get(cacheKey) : undefined;
    if (cached) {
      await playUrl(cached);
      return true;
    }
    const url = cfg.key && cfg.region ? await fetchFromAzure(clean, voice, cfg) : await fetchFromProxy(clean, voice.id, rate);
    if (url) {
      blobCache.set(cacheKey, url);
      await playUrl(url);
      return true;
    }
  }

  await speakWithBrowser(clean, speaker, language, rate);
  return false;
}

/** Does the app's own server voice proxy respond? */
export async function probeServerVoices(): Promise<{ server: boolean; region?: string }> {
  try {
    const res = await fetch("/api/tts/status");
    if (!res.ok) return { server: false };
    const data = (await res.json()) as { available?: boolean; region?: string };
    proxyAvailable = !!data.available;
    return { server: !!data.available, region: data.region };
  } catch {
    proxyAvailable = false;
    return { server: false };
  }
}

export function serverVoiceState(): boolean | null {
  return proxyAvailable;
}
