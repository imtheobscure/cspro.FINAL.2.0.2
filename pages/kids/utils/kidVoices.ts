/* ════════════════════════════════════════════════════════════════════════════
   🔊 KID VOICES — Microsoft natural voices for the read-aloud
   ════════════════════════════════════════════════════════════════════════════

   The read-aloud is the audio track of every lesson for a 2-5 year old, and the tutor
   is standing next to the child — so the voice has to sound like a person, not like a
   satnav. Edge ships **Microsoft … Online (Natural)** neural voices inside the plain
   Web Speech API, with no key, no account and no network call of our own. That is the
   whole trick: `speechSynthesis.getVoices()` on Edge already contains voices named
   "Microsoft Ana Online (Natural) - English (United States)", and `speak()` uses them.

   So this file does one job: choose the best available voice, in a fixed, explainable
   order, and never fail.

     1. a Microsoft **Natural / Neural** voice, preferring the child-sounding ones
        (Ana, Maisie, Xiaoshuang, Éloïse, Pierina, Gisela) — the register a nursery
        teacher uses with a three-year-old
     2. any Microsoft voice in the right language
     3. any voice at all in the right language
     4. nothing — and then the tutor reads the line, which is always on screen anyway

   The same ranking is used by the lesson launcher, the voice picker in Step 2, and the
   exported three-page HTML, so a saved lesson sounds the same as the one you previewed.
   ════════════════════════════════════════════════════════════════════════════ */

/** The Microsoft neural voices this app asks for, best first, per language. */
export const PREFERRED_NEURAL_VOICES: Record<string, string[]> = {
  en: [
    'en-US-AnaNeural',
    'en-US-EmmaMultilingualNeural',
    'en-US-AvaMultilingualNeural',
    'en-GB-SoniaNeural',
    'en-US-JennyNeural',
    'en-US-GuyNeural',
  ],
  es: ['es-ES-ElviraNeural', 'es-MX-DaliaNeural', 'es-ES-AlvaroNeural'],
  fr: ['fr-FR-EloiseNeural', 'fr-FR-DeniseNeural', 'fr-FR-HenriNeural'],
  de: ['de-DE-GiselaNeural', 'de-DE-AmalaNeural', 'de-DE-KillianNeural'],
  zh: ['zh-CN-XiaoshuangNeural', 'zh-CN-XiaoyiNeural', 'zh-CN-YunxiNeural'],
  it: ['it-IT-PierinaNeural', 'it-IT-ElsaNeural', 'it-IT-DiegoNeural'],
  pt: ['pt-BR-FranciscaNeural', 'pt-PT-RaquelNeural', 'pt-BR-AntonioNeural'],
};

/** The family name inside a Microsoft voice id, e.g. en-US-AnaNeural → ana. */
const familyOf = (voiceId: string) => voiceId.replace(/Neural$/, '').replace(/^[a-z]{2}-[A-Z]{2}-/, '').toLowerCase();

/** A Microsoft neural / "Online (Natural)" voice — the ones that sound like people. */
export const isNaturalMicrosoft = (voice: SpeechSynthesisVoice): boolean =>
  /online\s*\(natural\)|natural|neural/i.test(voice.name) && /microsoft/i.test(voice.name);

/** A voice built for a child listener, by name. */
const CHILD_NAMES = /(^|\W)(ana|maisie|xiaoshuang|eloise|élise|pierina|gisela|amala|emel|clara|luna)(\W|$)/i;
export const isChildVoice = (voice: SpeechSynthesisVoice): boolean => CHILD_NAMES.test(voice.name);

/** Every voice we could read `lang` with, best first. */
export function rankVoices(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const key = (lang || 'en').slice(0, 2).toLowerCase();
  const wanted = PREFERRED_NEURAL_VOICES[key] || PREFERRED_NEURAL_VOICES.en;
  const wantFamilies = wanted.map(familyOf);
  return voices
    .filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(key))
    .map((voice) => {
      const name = voice.name.toLowerCase();
      let score = 0;
      if (isNaturalMicrosoft(voice)) score += 100;
      if (isChildVoice(voice)) score += 30;
      /* An exact match against the voices we actually asked for outranks a
         coincidence of naming — this is the difference between Ana and a random
         "English (United States)" voice called Microsoft Zira. */
      if (wantFamilies.some((f) => name.includes(f) && f.length > 2)) score += 40;
      if (/microsoft/i.test(voice.name)) score += 12;
      if (voice.default) score += 1;
      return { voice, score };
    })
    .sort((a, b) => b.score - a.score || a.voice.name.localeCompare(b.voice.name))
    .map((x) => x.voice);
}

/** The voices on this device, safely. */
export function allVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    return window.speechSynthesis.getVoices() ?? [];
  } catch {
    return [];
  }
}

/** The single best voice for this language on this device, if there is one. */
export const bestKidVoice = (lang = 'en', voices = allVoices()): SpeechSynthesisVoice | undefined =>
  rankVoices(lang, voices)[0];

/** Is the tutor on a device that has the good Microsoft voices? Drives the hint text. */
export const hasNaturalVoices = (voices = allVoices()): boolean => voices.some(isNaturalMicrosoft);

/** The exact name of the preferred child voice, for the exported HTML to ask for. */
export const preferredVoiceName = (lang = 'en'): string => (PREFERRED_NEURAL_VOICES[lang.slice(0, 2)] || PREFERRED_NEURAL_VOICES.en)[0];

/**
 * How a voice should read in a dropdown.
 *
 * "Microsoft Ana Online (Natural) - English (United States)" is unreadable in a
 * picker, and the tutor's real question is "is this the good one, and does it sound
 * like a child?" — so the label answers exactly that.
 */
export function voiceLabel(voice: SpeechSynthesisVoice): string {
  const natural = isNaturalMicrosoft(voice);
  const child = isChildVoice(voice);
  const short = voice.name
    .replace(/^Microsoft\s+/i, '')
    .replace(/\s*Online\s*\(Natural\)/i, '')
    .replace(/\s*-\s*English.*$/i, '')
    .replace(/\s*\(Natural\)/i, '')
    .replace(/\s*\bNeural\b/i, '')
    .trim();
  const tags = [natural ? 'natural' : '', child ? 'child' : ''].filter(Boolean);
  return `${short || voice.name}${tags.length ? ` · ${tags.join(' · ')}` : ''}`;
}

/**
 * Speaks a line the way a nursery teacher would.
 *
 * `veryYoung` slows it down and raises the pitch a little — the same sentence at the
 * same speed is fine for a nine-year-old and unintelligible to a three-year-old. The
 * <audio> free path is deliberate: if the device has no voices, this returns quietly
 * and the tutor reads the line off the screen, which is why every line is on screen.
 */
export function speakKidLine(text: string, voiceName = '', veryYoung = false): void {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = allVoices();
    /* The tutor's explicit pick wins; otherwise the best natural voice there is. */
    const chosen = (voiceName && voices.find((v) => v.name === voiceName || v.voiceURI === voiceName)) || bestKidVoice('en', voices);
    if (chosen) {
      utterance.voice = chosen;
      utterance.lang = chosen.lang;
    }
    utterance.pitch = veryYoung ? 1.2 : 1.05;
    utterance.rate = veryYoung ? 0.82 : 0.95;
    utterance.volume = 1;
    synth.speak(utterance);
  } catch {
    /* No voices, a locked-down browser, a school laptop: the tutor reads it. */
  }
}
