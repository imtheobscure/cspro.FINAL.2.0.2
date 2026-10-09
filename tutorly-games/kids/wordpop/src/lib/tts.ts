"use client";

import { useEffect, useState } from "react";
import { Lang, LANGS } from "./types";
import { LANG_META, ui } from "./i18n";

/**
 * READ ALOUD — the free Microsoft Azure voices.
 *
 * Microsoft Edge ships the same Azure neural voices that "Read Aloud" uses and
 * exposes them to the browser as SpeechSynthesis voices named
 * `Microsoft <Name> Online (Natural) - <Language> (<Region>)` — including the
 * child voices (Ana, Maisie, Xiaoshuang, Eloise, Pierina, Gisela…). They cost
 * nothing, need no key and no server, which is why this game uses them rather
 * than a paid synthesis endpoint.
 *
 * Everything here is therefore plain `speechSynthesis`:
 *   · prefer a Microsoft "Online (Natural)" voice for the language,
 *   · prefer a child voice for this age group,
 *   · fall back to any voice in that language, then to the engine default,
 *   · never hang: every utterance has a watchdog so callers can chain phrases.
 *
 * Chrome's `getVoices()` is empty for the first frames, so the list is primed on
 * `voiceschanged` — the Voice test screen shows exactly what was found.
 */

const isAzureNatural = (v: SpeechSynthesisVoice) =>
  /online\s*\(natural\)|natural|neural/i.test(v.name) && /microsoft/i.test(v.name);

/** Azure's child voices — the ones this age group should hear. */
const CHILD_RE = /(^|\W)(ana|maisie|xiaoshuang|eloise|pierina|gisela|emel|yunjian)(\W|$)/i;

/** Nicest voices per language, best first (used only for ordering). */
const PREFERRED: Record<Lang, string[]> = {
  en: ["ana", "maisie", "ava", "emma", "aria", "jenny", "sonia", "libby"],
  zh: ["xiaoshuang", "xiaoxiao", "xiaoyi", "xiaochen", "yunxi", "yunyang"],
  fr: ["eloise", "denise", "vivienne", "brigitte", "henri"],
  it: ["pierina", "elsa", "isabella", "diego", "benigno"],
  de: ["gisela", "katja", "amala", "seraphina", "conrad"],
  tr: ["emel", "ahmet", "filiz"],
};

export const langPrefix = (lang: Lang) => (lang === "zh" ? "zh" : LANG_META[lang].bcp47.slice(0, 2).toLowerCase());

export interface VoiceOption {
  uri: string;
  name: string;
  lang: string;
  azure: boolean;
  child: boolean;
  score: number;
}

function scoreVoice(v: SpeechSynthesisVoice, lang: Lang): number {
  const name = v.name.toLowerCase();
  let score = 0;
  if (isAzureNatural(v)) score += 40;
  if (CHILD_RE.test(v.name)) score += 18;
  const idx = PREFERRED[lang].findIndex((p) => name.includes(p));
  if (idx >= 0) score += 12 - idx;
  if (v.default) score += 1;
  if (v.localService === false) score += 2; // online voices are the neural ones
  return score;
}

/** Every browser voice for a language, best first. */
export function voicesFor(lang: Lang, voices: SpeechSynthesisVoice[]): VoiceOption[] {
  const prefix = langPrefix(lang);
  return voices
    .filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(prefix))
    .map((v) => ({
      uri: v.voiceURI,
      name: v.name,
      lang: v.lang,
      azure: isAzureNatural(v),
      child: CHILD_RE.test(v.name),
      score: scoreVoice(v, lang),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function allVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  try {
    return window.speechSynthesis.getVoices() ?? [];
  } catch {
    return [];
  }
}

/** Live voice list — re-renders when the browser finishes loading its voices. */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => allVoices());
  useEffect(() => {
    const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
    if (!synth) return;
    const load = () => setVoices(allVoices());
    load();
    synth.addEventListener?.("voiceschanged", load);
    // Safari needs the getter touched before it populates, and some engines
    // populate a beat after mount.
    const timers = [120, 450, 1200].map((ms) => window.setTimeout(load, ms));
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);
  return voices;
}

const SETTINGS_KEY = "wordpop.settings.v1";

/**
 * The voice the tutor picked in the Voice test screen (settings.voices[lang]).
 * Read straight from storage so every call site — cards, chants, quizzes, the
 * CCQ panel — honours the choice without threading a prop through the app.
 */
function preferredVoiceUri(lang: Lang): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { voices?: Partial<Record<Lang, string>> };
    const uri = parsed?.voices?.[lang];
    return typeof uri === "string" && uri ? uri : undefined;
  } catch {
    return undefined;
  }
}

let current: SpeechSynthesisUtterance | null = null;

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  current = null;
}

/**
 * Speak `text` in `lang` and resolve when the audio finished.
 *
 * `voiceUri` (from the Voice test screen) wins; otherwise the best available
 * voice for the language is picked. A watchdog resolves long before a hang would
 * freeze a lesson step, and the whole call is a no-op when the browser has no
 * speech engine at all (some locked-down webviews).
 */
export function speak(
  text: string,
  lang: Lang,
  opts: { slow?: boolean; voiceUri?: string; rate?: number; pitch?: number } = {},
): Promise<void> {
  if (!text) return Promise.resolve();
  const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") return Promise.resolve();

  stopSpeaking();

  const voices = allVoices();
  const options = voicesFor(lang, voices);
  const requested = opts.voiceUri ?? preferredVoiceUri(lang);
  const wanted = requested
    ? voices.find((v) => v.voiceURI === requested || v.name === requested || v.name.toLowerCase() === requested.toLowerCase())
    : undefined;
  const picked = wanted ?? voices.find((v) => v.voiceURI === options[0]?.uri);

  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANG_META[lang].bcp47;
  u.rate = opts.rate ?? (opts.slow ? 0.66 : 0.92);
  u.pitch = opts.pitch ?? 1.06;
  u.volume = 1;
  if (picked) u.voice = picked;
  current = u;

  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      if (current === u) current = null;
      resolve();
    };
    // ~2.4 words/second at rate 0.92, plus a generous tail.
    const estimate = (Math.max(1, text.split(/\s+/).length) * 380) / (opts.rate ?? 0.92) + 2200;
    const watchdog = window.setTimeout(done, Math.min(30000, estimate));
    u.onend = done;
    u.onerror = done;
    try {
      synth.speak(u);
    } catch {
      done();
    }
  });
}

/* ─────────────────────────── the Voice test screen ─────────────────────────── */

export interface LangVoiceReport {
  lang: Lang;
  best: VoiceOption | null;
  azure: VoiceOption[];
  others: VoiceOption[];
  sample: string;
}

/** Sample sentence for the voice test — the game's own hello, per language. */
export function sampleFor(lang: Lang): string {
  return `${ui(lang, "hello")} ${ui(lang, "letsLearn")}`;
}

export function voiceReports(voices: SpeechSynthesisVoice[]): LangVoiceReport[] {
  return LANGS.map((lang) => {
    const all = voicesFor(lang, voices);
    return {
      lang,
      best: all[0] ?? null,
      azure: all.filter((v) => v.azure),
      others: all.filter((v) => !v.azure),
      sample: sampleFor(lang),
    };
  });
}
