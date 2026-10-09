import type { Lang } from "./data/types";

/**
 * READ ALOUD — the free Microsoft natural KID voices.
 *
 * The server build posted every line to `/api/tts`, which proxied SSML to Azure
 * with an `AZURE_SPEECH_KEY` that only existed on a Node host. ToyBox is now a
 * STATIC export (no server, no key), so read-aloud uses the Azure neural voices
 * Microsoft already ships on the device: Edge exposes the same voices its own
 * “Read aloud” uses to `speechSynthesis`, named
 * `Microsoft <Name> Online (Natural) - <Language> (<Region>)`, including the
 * child voices Ana (en), Xiaoshuang (zh), Éloïse (fr), Pierina (it), Gisela (de)
 * and Emel (tr). No key, no server, no bill.
 *
 * `KID_VOICES` is still the list the settings screen offers, and
 * `DEFAULT_VOICE` is still the first entry per language, so the preference a
 * tutor picks keeps working — the picked voice is matched by name against what
 * the device actually has, and the best natural voice is used when the exact
 * one is not installed.
 */

/** Azure Neural voices — child / warm young voices preferred per language. */
export const KID_VOICES: Record<Lang, { id: string; name: string }[]> = {
  en: [
    { id: "en-US-AnaNeural", name: "Ana 🧒 (child)" },
    { id: "en-GB-MaisieNeural", name: "Maisie 🧒 (child, UK)" },
    { id: "en-US-EmmaMultilingualNeural", name: "Emma (young)" },
    { id: "en-GB-SoniaNeural", name: "Sonia (warm)" },
    { id: "en-US-AvaMultilingualNeural", name: "Ava (bright)" },
  ],
  zh: [
    { id: "zh-CN-XiaoshuangNeural", name: "Xiaoshuang 晓双 (child)" },
    { id: "zh-CN-XiaoyouNeural", name: "Xiaoyou 晓悠 (child)" },
    { id: "zh-CN-XiaoyiNeural", name: "Xiaoyi 晓伊 (girl)" },
    { id: "zh-CN-XiaoxiaoNeural", name: "Xiaoxiao 晓晓 (young)" },
  ],
  fr: [
    { id: "fr-FR-EloiseNeural", name: "Éloïse 🧒 (child)" },
    { id: "fr-FR-DeniseNeural", name: "Denise (warm)" },
    { id: "fr-FR-VivienneMultilingualNeural", name: "Vivienne (young)" },
    { id: "fr-FR-HenriNeural", name: "Henri (bright)" },
  ],
  it: [
    { id: "it-IT-PierinaNeural", name: "Pierina 🧒 (child)" },
    { id: "it-IT-ElsaNeural", name: "Elsa (young)" },
    { id: "it-IT-IsabellaNeural", name: "Isabella (warm)" },
    { id: "it-IT-DiegoNeural", name: "Diego (bright)" },
  ],
  de: [
    { id: "de-DE-GiselaNeural", name: "Gisela 🧒 (child)" },
    { id: "de-DE-AmalaNeural", name: "Amala (young)" },
    { id: "de-DE-SeraphinaMultilingualNeural", name: "Seraphina (young)" },
    { id: "de-DE-KatjaNeural", name: "Katja (warm)" },
  ],
  tr: [
    { id: "tr-TR-EmelNeural", name: "Emel (warm)" },
    { id: "tr-TR-AhmetNeural", name: "Ahmet (bright)" },
  ],
};

export const DEFAULT_VOICE = Object.fromEntries(
  Object.entries(KID_VOICES).map(([k, v]) => [k, v[0].id]),
) as Record<Lang, string>;

export const LOCALE: Record<Lang, string> = {
  en: "en-US",
  zh: "zh-CN",
  fr: "fr-FR",
  it: "it-IT",
  de: "de-DE",
  tr: "tr-TR",
};

/* ─────────────────────────── voice discovery ─────────────────────────── */

const natural = (v: SpeechSynthesisVoice) =>
  /online\s*\(natural\)|natural|neural/i.test(v.name) && /microsoft/i.test(v.name);
const childish = (v: SpeechSynthesisVoice) =>
  /(^|\W)(ana|maisie|xiaoshuang|xiaoyou|eloise|élise|pierina|gisela|amala|emel)(\W|$)/i.test(v.name);

export function allVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  try {
    return window.speechSynthesis.getVoices() ?? [];
  } catch {
    return [];
  }
}

/** Every voice we could read `lang` with, best first (used by the voice test). */
export function voicesFor(lang: Lang, voices: SpeechSynthesisVoice[] = allVoices()) {
  const prefix = lang === "zh" ? "zh" : LOCALE[lang].slice(0, 2).toLowerCase();
  const want = DEFAULT_VOICE[lang].replace(/Neural$/, "").replace(/^[a-z]{2}-[A-Z]{2}-/, "").toLowerCase();
  return voices
    .filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(prefix))
    .map((v) => {
      const name = v.name.toLowerCase();
      let score = 0;
      if (natural(v)) score += 40;
      if (childish(v)) score += 20;
      if (name.includes(want)) score += 14;
      if (v.default) score += 1;
      return { voice: v, score };
    })
    .sort((a, b) => b.score - a.score || a.voice.name.localeCompare(b.voice.name))
    .map((x) => x.voice);
}

/** True when the device has any natural Microsoft (Azure neural) voice at all. */
export function hasNaturalVoices(): boolean {
  return allVoices().some(natural);
}

/** The natural kid voices this device can actually read `lang` with. */
export function naturalVoicesFor(lang: Lang) {
  return voicesFor(lang).filter(natural);
}

let currentAudio: HTMLAudioElement | null = null;
let token = 0;

export function stopSpeaking() {
  token++;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/** Pick the warmest kid voice available for a language on this device. */
function pickVoice(lang: Lang, wanted?: string, preferLocal = false): SpeechSynthesisVoice | undefined {
  const voices = allVoices();
  if (preferLocal) {
    // "Prefer browser voices" in Settings: use a plain installed voice rather
    // than the natural Microsoft one, for a device whose natural voice is slow
    // to arrive or whose meeting software cannot share it.
    const ranked = voicesFor(lang, voices);
    return ranked.find((v) => !natural(v)) ?? ranked[0];
  }
  if (wanted) {
    // The tutor picked an Azure id; the device names the same voice
    // "Microsoft Ana Online (Natural) - English (United States)", so match
    // on the bare name ("Ana") as well as on an exact name/URI.
    const bare = wanted.replace(/Neural$/, "").replace(/^[a-z]{2}-[A-Z]{2}-/, "").toLowerCase();
    const byExact = voices.find((v) => v.voiceURI === wanted || v.name === wanted);
    if (byExact) return byExact;
    const byBare = voices.find((v) => v.name.toLowerCase().includes(bare));
    if (byBare) return byBare;
  }
  return voicesFor(lang)[0];
}

/** Resolve when the utterance finished (or the watchdog fires). */
function speakBrowser(
  text: string,
  lang: Lang,
  rate: number,
  wanted?: string,
  pitch?: number,
  preferLocal = false,
): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve();
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALE[lang];
  u.rate = rate;
  // Slightly high and bright: the register a nursery teacher uses with a 3-year-old.
  u.pitch = pitch ?? 1.18;
  u.volume = 1;
  const voice = pickVoice(lang, wanted, preferLocal);
  if (voice) u.voice = voice;

  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      resolve();
    };
    const watchdog = window.setTimeout(done, Math.min(30000, Math.max(2500, text.length * 140)));
    u.onend = done;
    u.onerror = done;
    try {
      synth.speak(u);
    } catch {
      done();
    }
  });
}

export interface SpeakOptions {
  lang: Lang;
  voice?: string;
  /** true = slow, story-time pace for 3-year-olds */
  slow?: boolean;
  /** exact pace (wins over `slow`) — used by the phonics and letter drills */
  rate?: number;
  /** exact pitch (wins over the child-friendly default) */
  pitch?: number;
  /** kept for API compatibility: there is only one engine now (the browser's) */
  local?: boolean;
  muted?: boolean;
  /** kept for API compatibility with the old Azure phoneme hint */
  phoneme?: string;
}

/** Public read-aloud entry point. Never hangs, never throws. */
export async function speak(text: string, opts: SpeakOptions): Promise<void> {
  if (!text?.trim() || opts.muted) return;
  stopSpeaking();
  await speakBrowser(text, opts.lang, opts.rate ?? (opts.slow ? 0.72 : 0.92), opts.voice, opts.pitch, opts.local);
}

export async function speakSequence(
  items: { text: string; lang: Lang }[],
  opts: Omit<SpeakOptions, "lang"> & { onIndex?: (i: number) => void },
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    opts.onIndex?.(i);
    // eslint-disable-next-line no-await-in-loop
    await speak(items[i].text, { ...opts, lang: items[i].lang });
  }
}

/**
 * "Have I got a natural Microsoft voice?" — the old build reported whether the
 * Azure key worked; the voice test now reports the same thing about the device.
 */
export function azureStatus(): "unknown" | "yes" | "no" {
  if (typeof window === "undefined") return "unknown";
  const voices = allVoices();
  if (!voices.length) return "unknown";
  return voices.some(natural) ? "yes" : "no";
}

/* ──────────────────────── re-exported utilities ──────────────────────── */

/** Resume the audio queue after a user gesture (mobile browsers require it). */
export function warmUpSpeech() {
  try {
    window.speechSynthesis?.getVoices();
  } catch {
    /* No speech synthesis on this device. */
  }
}
