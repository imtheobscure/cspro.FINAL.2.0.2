import type { Lang } from "./data/types";

/**
 * READ ALOUD — the free Microsoft natural KID voices.
 *
 * The old build posted the text to `/api/tts`, which needed an
 * `AZURE_SPEECH_KEY` on a Node host; without one it dropped to whatever robot
 * voice the browser had. LearnLoop now ships as static files, so it uses the
 * voices Microsoft already puts on the device: Edge exposes the same Azure
 * neural voices its own "Read aloud" uses to `speechSynthesis`, named
 * `Microsoft <Name> Online (Natural) - <Language> (<Region>)` — including the
 * child voices Ana (en), Xiaoshuang (zh), Éloïse (fr), Elsa/Pierina (it),
 * Gisela/Amala (de) and Emel (tr). No key, no server, no bill.
 *
 * The public API is unchanged (`speak`, `speakSequence`, `KID_VOICES`,
 * `DEFAULT_VOICE`, `azureStatus`), so none of the game modes needed touching.
 */

/** Azure Neural voices — child / warm young voices preferred per language. */
export const KID_VOICES: Record<Lang, { id: string; name: string }[]> = {
  en: [
    { id: "en-US-AnaNeural", name: "Ana 🧒 (child)" },
    { id: "en-US-EmmaMultilingualNeural", name: "Emma (young)" },
    { id: "en-GB-SoniaNeural", name: "Sonia (warm)" },
    { id: "en-US-AvaMultilingualNeural", name: "Ava (bright)" },
  ],
  zh: [
    { id: "zh-CN-XiaoshuangNeural", name: "Xiaoshuang 晓双 (child)" },
    { id: "zh-CN-XiaoyiNeural", name: "Xiaoyi 晓伊 (girl)" },
    { id: "zh-CN-XiaoxiaoNeural", name: "Xiaoxiao 晓晓 (young)" },
    { id: "zh-CN-YunxiNeural", name: "Yunxi 云希 (boy)" },
  ],
  fr: [
    { id: "fr-FR-EloiseNeural", name: "Éloïse (child)" },
    { id: "fr-FR-DeniseNeural", name: "Denise (warm)" },
    { id: "fr-FR-VivienneMultilingualNeural", name: "Vivienne (young)" },
    { id: "fr-FR-HenriNeural", name: "Henri (bright)" },
  ],
  it: [
    { id: "it-IT-ElsaNeural", name: "Elsa (young)" },
    { id: "it-IT-IsabellaNeural", name: "Isabella (warm)" },
    { id: "it-IT-PierinaNeural", name: "Pierina 🧒 (child)" },
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

export const DEFAULT_VOICE: Record<Lang, string> = {
  en: "en-US-AnaNeural",
  zh: "zh-CN-XiaoshuangNeural",
  fr: "fr-FR-EloiseNeural",
  it: "it-IT-ElsaNeural",
  de: "de-DE-GiselaNeural",
  tr: "tr-TR-EmelNeural",
};

export const LOCALE: Record<Lang, string> = {
  en: "en-US",
  zh: "zh-CN",
  fr: "fr-FR",
  it: "it-IT",
  de: "de-DE",
  tr: "tr-TR",
};

/* ─────────────────────────── voice discovery ─────────────────────────── */

const natural = (v: SpeechSynthesisVoice) => /online\s*\(natural\)|natural|neural/i.test(v.name) && /microsoft/i.test(v.name);
const childish = (v: SpeechSynthesisVoice) => /(^|\W)(ana|maisie|xiaoshuang|eloise|élise|pierina|gisela|amala|emel)(\W|$)/i.test(v.name);

/** Every voice we could read `lang` with, best first (used by the voice test). */
export function voicesFor(lang: Lang, voices: SpeechSynthesisVoice[]) {
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

export function allVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  try {
    return window.speechSynthesis.getVoices() ?? [];
  } catch {
    return [];
  }
}

let currentAudio: HTMLAudioElement | null = null;
let token = 0;

function stopAll() {
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
function pickVoice(lang: Lang, wanted?: string): SpeechSynthesisVoice | undefined {
  const voices = allVoices();
  if (wanted) {
    const byUri = voices.find((v) => v.voiceURI === wanted || v.name === wanted);
    if (byUri) return byUri;
  }
  return voicesFor(lang, voices)[0];
}

/** Resolve when the utterance finished (or the watchdog fires). */
function speakBrowser(text: string, lang: Lang, rate: number, wanted?: string): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve();
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALE[lang];
  u.rate = rate;
  // Slightly high and bright: the register a nursery teacher uses with a 3-year-old.
  u.pitch = 1.18;
  u.volume = 1;
  const voice = pickVoice(lang, wanted);
  if (voice) u.voice = voice;
  const myToken = token;
  void myToken;

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
  /** kept for API compatibility: there is only one engine now (the browser's) */
  local?: boolean;
  muted?: boolean;
}

/** Public read-aloud entry point. Never hangs, never throws. */
export async function speak(text: string, opts: SpeakOptions): Promise<void> {
  if (!text?.trim() || opts.muted) return;
  stopAll();
  await speakBrowser(text, opts.lang, opts.slow ? 0.72 : 0.92, opts.voice);
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

export { stopAll as stopSpeaking };

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

/** True when the device has any natural Microsoft voice at all. */
export function hasNaturalVoices(): boolean {
  return allVoices().some(natural);
}
