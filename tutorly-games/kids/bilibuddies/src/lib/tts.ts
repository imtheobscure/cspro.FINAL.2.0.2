"use client";

import { LANG_MAP } from "@/data/languages";
import type { LangCode } from "@/data/types";

/**
 * READ ALOUD — the free Microsoft natural KID voices.
 *
 * This used to POST to `/api/tts`, which needed an `AZURE_SPEECH_KEY` on a Node
 * host; without one the lesson fell back to whatever robotic device voice the
 * browser happened to have. BiliBuddies now ships as static files, so it uses the
 * voices Microsoft already puts on the machine: Edge exposes the same Azure
 * neural voices its own "Read aloud" uses to `speechSynthesis`, named
 * `Microsoft <Name> Online (Natural) - <Language> (<Region>)` — including the
 * child voices Ana (en), Xiaoshuang (zh), Éloïse (fr), Elsa/Pierina (it),
 * Gisela/Amala (de) and Emel (tr). No key, no server, no bill.
 *
 * The public API (`speak`, `speakAll`, `preload`, `primeVoices`,
 * `stopSpeaking`, `azureStatus`) is unchanged, so no game mode needed editing.
 */
export type VoiceKind = "kid" | "adult";

let current: SpeechSynthesisUtterance | null = null;
let token = 0;

export function azureStatus(): "unknown" | "on" | "off" {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return "off";
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return "unknown";
  return voices.some(isNatural) ? "on" : "off";
}

const isNatural = (v: SpeechSynthesisVoice) => /online\s*\(natural\)|natural|neural/i.test(v.name) && /microsoft/i.test(v.name);

/** Child voices first — this is the age group that should hear them. */
const KID_RE = /(^|\W)(ana|maisie|xiaoshuang|eloise|élise|pierina|gisela|amala|emel)(\W|$)/i;

function allVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  try {
    return window.speechSynthesis.getVoices() ?? [];
  } catch {
    return [];
  }
}

/**
 * The best voice for a language on this device: a Microsoft natural child voice
 * if there is one, then any natural voice, then any voice in that language.
 */
export function pickBrowserVoice(lang: LangCode, kind: VoiceKind = "kid"): SpeechSynthesisVoice | null {
  const bcp = LANG_MAP[lang].bcp47.toLowerCase();
  const base = bcp.split("-")[0];
  const voices = allVoices();
  if (!voices.length) return null;
  const score = (v: SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    let s = 0;
    if (isNatural(v)) s += 40;
    if (KID_RE.test(v.name)) s += kind === "kid" ? 22 : 4;
    if (v.lang.toLowerCase().startsWith(base)) s += 8;
    if (v.lang.toLowerCase() === bcp) s += 4;
    if (v.default) s += 1;
    if (/female|girl|woman|zira|samantha/i.test(name)) s += 2;
    return s;
  };
  const forLang = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(base));
  const pool = forLang.length ? forLang : voices;
  return pool.map((v) => ({ v, s: score(v) })).sort((a, b) => b.s - a.s)[0]?.v ?? null;
}

/** Every voice for a language, best first — used by the voice-test screen. */
export function voicesFor(lang: LangCode): SpeechSynthesisVoice[] {
  const bcp = LANG_MAP[lang].bcp47.toLowerCase();
  const base = bcp.split("-")[0];
  return allVoices()
    .filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(base))
    .sort((a, b) => {
      const s = (v: SpeechSynthesisVoice) => (isNatural(v) ? 40 : 0) + (KID_RE.test(v.name) ? 20 : 0);
      return s(b) - s(a) || a.name.localeCompare(b.name);
    });
}

export function stopSpeaking() {
  token++;
  current = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

function browserSpeak(text: string, lang: LangCode, slow: boolean, kind: VoiceKind): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    const def = LANG_MAP[lang];
    u.lang = def.bcp47;
    const v = pickBrowserVoice(lang, kind);
    if (v) u.voice = v;
    // Bright and unhurried: the register a nursery teacher uses with a 3-year-old.
    u.rate = slow ? 0.62 : 0.82;
    u.pitch = kind === "kid" ? 1.25 : 1.08;
    u.volume = 1;
    current = u;

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      resolve();
    };
    // Some engines never fire `onend`; never leave a lesson step hanging.
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

export type SpeakOpts = {
  lang: LangCode;
  kind?: VoiceKind;
  slow?: boolean;
};

/** Speaks one phrase; resolves when finished (or immediately if unsupported). */
export async function speak(text: string, opts: SpeakOpts): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  stopSpeaking();
  const my = token;
  await browserSpeak(clean, opts.lang, Boolean(opts.slow), opts.kind ?? "kid");
  void my;
}

/** Speaks a list of phrases one after another (chants, counting…). */
export async function speakAll(items: { text: string; opts: SpeakOpts }[]): Promise<void> {
  for (const it of items) {
    // eslint-disable-next-line no-await-in-loop
    await speak(it.text, it.opts);
  }
}

/** Kept for API compatibility: the browser voice needs no warm-up or download. */
export function preload(_text: string, _opts: SpeakOpts) {
  void _text;
  void _opts;
}

/** Call once on the first user gesture so browsers allow speech. */
export function primeVoices() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
}

/** True when this device has at least one Microsoft natural voice. */
export function hasNaturalVoices(): boolean {
  return allVoices().some(isNatural);
}
