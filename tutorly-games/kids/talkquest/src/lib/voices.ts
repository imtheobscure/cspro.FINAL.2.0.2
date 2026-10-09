import type { SupportedLanguage } from '@/types/theme';

/**
 * READ ALOUD — the same free Microsoft voices Edge's own Read aloud uses.
 *
 * `speechSynthesis` is the browser's list of installed/most-recently-downloaded
 * voices. On Edge (and on Chrome with Google's voices) the ones named
 * "Microsoft … Online (Natural)" ARE the Azure neural voices, child voices
 * included, with no API key and no server. So TalkQuest ranks them first and
 * stays honest about what the device actually has, because a machine with only
 * the old robotic SAPI voices should say so rather than pretend.
 *
 * Three faults the old picker had, all fixed here:
 *
 * 1. `getVoices()` is EMPTY on the first call in every Chromium browser — the
 *    list arrives a moment later with a `voiceschanged` event. The old code read
 *    it once and quietly fell back to whatever the default was.
 * 2. It pitch-shifted every voice up by 15%, including the real child voices.
 *    Ana and Eloise already sound like children; raising their pitch is what
 *    makes "kid voice" settings sound like chipmunks. Pitch is only nudged on
 *    the old non-natural voices, where it does help.
 * 3. `cancel()` immediately followed by `speak()` drops the utterance in Chrome.
 *    There is a short gap before speaking now.
 */

export type VoiceInfo = {
  name: string;
  lang: string;
  /** A Microsoft/Azure natural voice (or Google's own neural voices). */
  natural: boolean;
  /** Sounds like a child or is one of Azure's dedicated child voices. */
  child: boolean;
  local: boolean;
};

export type VoiceReport = {
  /** The language code that was asked for, e.g. "zh-CN". */
  lang: string;
  code: string;
  /** How many installed voices match this language at all. */
  count: number;
  chosen?: VoiceInfo;
  natural: boolean;
  child: boolean;
  /** What the tutor should understand from the choice above. */
  message: string;
  alternates: VoiceInfo[];
};

const LANG_CODE: Record<SupportedLanguage, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
  tr: 'tr-TR',
  fa: 'fa-IR',
};

export const SPEECH_LANGS: SupportedLanguage[] = ['en', 'zh', 'fr', 'it', 'de', 'tr', 'fa'];

export const LANG_LABEL: Record<SupportedLanguage, string> = {
  en: 'English',
  zh: '中文 Chinese',
  fr: 'Français French',
  it: 'Italiano Italian',
  de: 'Deutsch German',
  tr: 'Türkçe Turkish',
  fa: 'فارسی Farsi',
};

export function langCode(lang: SupportedLanguage): string {
  return LANG_CODE[lang] ?? LANG_CODE.en;
}

/** Azure's dedicated child voices, plus the names Edge gives them. */
const CHILD_HINT = /(^|[\s-])(ana|xiaoshuang|xiaoyi|yunjian?|eloise|lena|isabella|gisela|mila|emma|olivia|child|kid|junior|boy|girl)([\s-]|$)/i;
const NATURAL_HINT = /(online \(natural\)|natural|neural|multilingual|google\s+(uk|us)\s+english|microsoft\s+\w+\s+online)/i;

export function describeVoice(v: SpeechSynthesisVoice): VoiceInfo {
  const name = v.name ?? '';
  return {
    name,
    lang: v.lang ?? '',
    natural: NATURAL_HINT.test(name),
    child: CHILD_HINT.test(name),
    local: Boolean(v.localService),
  };
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * The list Chromium refuses to give on the first call. `loadVoices()` fills this
 * in, and `voicesFor` reads it whenever the live call still comes back empty —
 * without it the very first read-aloud of a session used the system default.
 */
let cache: SpeechSynthesisVoice[] = [];

function rawVoices(): SpeechSynthesisVoice[] {
  if (!canSpeak()) return cache;
  try {
    const live = window.speechSynthesis.getVoices() ?? [];
    if (live.length) cache = live;
    return live.length ? live : cache;
  } catch {
    return cache;
  }
}

/**
 * Resolves with the voice list, waiting for `voiceschanged` when the browser has
 * not published it yet (Chromium: first call returns []).
 */
export function loadVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  if (!canSpeak()) return Promise.resolve([]);
  const now = rawVoices();
  if (now.length) {
    cache = now;
    return Promise.resolve(now);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
      resolve(rawVoices());
    };
    const onChange = () => {
      if (rawVoices().length) finish();
    };
    window.speechSynthesis.addEventListener('voiceschanged', onChange);
    setTimeout(finish, timeoutMs);
  });
}

/** Voices for one language, best first: natural child, natural, then the rest. */
export function voicesFor(lang: SupportedLanguage): SpeechSynthesisVoice[] {
  const code = langCode(lang).slice(0, 2).toLowerCase();
  const matches = rawVoices().filter((v) => {
    const l = (v.lang ?? '').toLowerCase().replace('_', '-');
    return l.startsWith(code);
  });
  const score = (v: SpeechSynthesisVoice) => {
    const info = describeVoice(v);
    return (info.natural ? 0 : 2) + (info.child ? 0 : 1);
  };
  return [...matches].sort((a, b) => score(a) - score(b));
}

/** Everything the voice-test screen shows for one language. */
export function voiceReport(lang: SupportedLanguage): VoiceReport {
  const code = langCode(lang);
  const matches = voicesFor(lang);
  const chosen = matches[0];
  const info = chosen ? describeVoice(chosen) : undefined;
  const short = code.slice(0, 2);

  const message = !canSpeak()
    ? 'This browser cannot read text aloud at all. Read the words out yourself — the child should hear a real voice anyway.'
    : !matches.length
      ? `No ${LANG_LABEL[lang]} voice is installed on this device. Read aloud will fall back to the system default. On Edge, open Settings → Languages and add ${LANG_LABEL[lang]} to get the free Microsoft natural voices.`
      : info?.natural && info.child
        ? `Using ${chosen?.name} — a natural Microsoft child voice. This is the ideal voice for this app.`
        : info?.natural
          ? `Using ${chosen?.name} — a natural Microsoft voice, but an adult one. Edge also has child voices for some languages; the app uses the best voice this device has.`
          : `Using ${chosen?.name} — a basic system voice. It works, but it sounds robotic. On Edge, the same "Microsoft … Online (Natural)" voices its Read aloud uses are free and need no setup.`;

  return {
    lang: code,
    code: short,
    count: matches.length,
    chosen: info,
    natural: Boolean(info?.natural),
    child: Boolean(info?.child),
    message,
    alternates: matches.slice(1, 6).map(describeVoice),
  };
}

/** The voice the app will use for a language, if the device has one. */
export function pickVoice(lang: SupportedLanguage): SpeechSynthesisVoice | undefined {
  return voicesFor(lang)[0];
}

export function pitchFor(lang: SupportedLanguage): number {
  // A real child voice is left alone. The old robotic voices get a gentle lift,
  // which is the only case where raising pitch actually makes them friendlier.
  const voice = pickVoice(lang);
  if (!voice) return 1.05;
  return describeVoice(voice).child ? 1 : 1.12;
}

export function rateFor(lang: SupportedLanguage): number {
  const voice = pickVoice(lang);
  if (voice && describeVoice(voice).natural) return 0.92;
  return 0.86;
}
