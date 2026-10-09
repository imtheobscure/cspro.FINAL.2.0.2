
import type { VoiceInfo } from '../types';

export const ALL_VOICES: VoiceInfo[] = [
  // Microsoft Natural Online Voices (Edge / Azure)
  { id: 'Microsoft Andrew Online (Natural) - English (United States)', name: 'Microsoft Andrew Online (Natural)', description: 'Warm, clear American male', gender: 'male' },
  { id: 'Microsoft Ryan Online (Natural) - English (United Kingdom)', name: 'Microsoft Ryan Online (Natural)', description: 'Charming British male', gender: 'male' },
  { id: 'Microsoft Liam Online (Natural) - English (Canada)', name: 'Microsoft Liam Online (Natural)', description: 'Articulate Canadian male', gender: 'male' },
  { id: 'Microsoft William Online (Natural) - English (Australia)', name: 'Microsoft William Online (Natural)', description: 'Direct Australian male', gender: 'male' },
  { id: 'Microsoft Connor Online (Natural) - English (Ireland)', name: 'Microsoft Connor Online (Natural)', description: 'Friendly Irish male', gender: 'male' },
  { id: 'Microsoft Emma Online (Natural) - English (United States)', name: 'Microsoft Emma Online (Natural)', description: 'Empathetic American female', gender: 'female' },
  { id: 'Microsoft Sonia Online (Natural) - English (United Kingdom)', name: 'Microsoft Sonia Online (Natural)', description: 'Upbeat British female', gender: 'female' },
  { id: 'Microsoft Elvira Online (Natural) - Spanish (Spain)', name: 'Microsoft Elvira Online (Natural)', description: 'Expressive Spanish female', gender: 'female' },
  { id: 'Microsoft Clara Online (Natural) - English (Canada)', name: 'Microsoft Clara Online (Natural)', description: 'Professional Canadian female', gender: 'female' },
  { id: 'Microsoft Natasha Online (Natural) - English (Australia)', name: 'Microsoft Natasha Online (Natural)', description: 'Gentle Australian female', gender: 'female' },
  { id: 'Microsoft Ana Online (Natural) - English (United States)', name: 'Microsoft Ana Online (Natural)', description: 'Playful American child', gender: 'child' },
  { id: 'Microsoft Maisie Online (Natural) - English (United Kingdom)', name: 'Microsoft Maisie Online (Natural)', description: 'Inquisitive British child', gender: 'child' },
  { id: 'Microsoft Ava Multilingual Online (Natural) - English (United States)', name: 'Microsoft Ava Multilingual Online (Natural)', description: 'Versatile natural female', gender: 'female' },
  { id: 'Microsoft Guy Online (Natural) - English (United States)', name: 'Microsoft Guy Online (Natural)', description: 'Friendly American male', gender: 'male' },
  { id: 'Microsoft Christopher Online (Natural) - English (United States)', name: 'Microsoft Christopher Online (Natural)', description: 'Professional American male', gender: 'male' },
  { id: 'Microsoft Aria Online (Natural) - English (United States)', name: 'Microsoft Aria Online (Natural)', description: 'Versatile American female', gender: 'female' },
  { id: 'Microsoft Jenny Online (Natural) - English (United States)', name: 'Microsoft Jenny Online (Natural)', description: 'Clear American female', gender: 'female' },

  // Gemini / Legacy voice fallbacks
  { id: 'Zephyr', name: 'Zephyr', description: 'Mid-pitch, Calm', gender: 'male' },
  { id: 'Puck', name: 'Puck', description: 'High-pitch, Lively', gender: 'male' },
  { id: 'Charon', name: 'Charon', description: 'Low-pitch, Slow', gender: 'male' },
  { id: 'Kore', name: 'Kore', description: 'Mid-pitch, Formal', gender: 'female' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Low-pitch, Authoritative', gender: 'male' },
  { id: 'Leda', name: 'Leda', description: 'Mid-pitch, Professional', gender: 'female' },
  { id: 'Orus', name: 'Orus', description: 'Low-pitch, Deep', gender: 'male' },
  { id: 'Aoede', name: 'Aoede', description: 'High-pitch, Melodic', gender: 'female' },
  { id: 'Callirrhoe', name: 'Callirrhoe', description: 'Mid-pitch, Expressive', gender: 'female' },
  { id: 'Autonoe', name: 'Autonoe', description: 'Mid-pitch, Casual', gender: 'female' },
  { id: 'Achird', name: 'Achird', description: 'High-pitch, Friendly', gender: 'female' },
];

// Tagged voice shortcuts for quick assignment in Read Aloud settings
/* ==================== the learner's TARGET language (L2) voices ====================
   A learner studying a language other than English should hear the lesson in the
   language they are learning. The Step-2 Lesson Creator reads the learner's
   `targetLanguage` (L2), picks the matching Microsoft Natural voice automatically,
   and the multi-voice players ([male1] … [female5]) re-point at the same language -
   so a learner of French hears the dialogue in French voices instead of US English.
   A language with no dedicated Microsoft Natural voice falls back to its language
   tag, which lets the browser (or a multilingual voice) read it.
   The aliases are lower-case and include the English name, the language's own
   name and the ISO code, because `targetLanguage` is free text. */
export interface LanguageVoiceSet {
  aliases: string[];
  /** Language prefix used to find any installed voice of this language ("fr"). */
  code: string;
  /** BCP-47 tag written on the utterance when no dedicated voice is installed. */
  lang: string;
  female: string[];
  male: string[];
  child?: string[];
}

const ENGLISH_ALIASES = [
  'english', 'en', 'eng', 'american', 'americanenglish', 'britishenglish', 'british',
  'australianenglish', 'canadianenglish', 'irishenglish', 'usenglish', 'ukenglish',
];

export const LANGUAGE_VOICE_SETS: LanguageVoiceSet[] = [
  { aliases: ['spanish', 'espanol', 'español', 'castilian', 'es', 'espanolmexicano'], code: 'es', lang: 'es-ES',
    female: ['Microsoft Elvira Online (Natural) - Spanish (Spain)', 'Microsoft Dalia Online (Natural) - Spanish (Mexico)'],
    male: ['Microsoft Alvaro Online (Natural) - Spanish (Spain)', 'Microsoft Jorge Online (Natural) - Spanish (Mexico)'] },
  { aliases: ['french', 'francais', 'français', 'fr'], code: 'fr', lang: 'fr-FR',
    female: ['Microsoft Denise Online (Natural) - French (France)', 'Microsoft Sylvie Online (Natural) - French (Canada)'],
    male: ['Microsoft Henri Online (Natural) - French (France)', 'Microsoft Jean Online (Natural) - French (Canada)'] },
  { aliases: ['german', 'deutsch', 'de'], code: 'de', lang: 'de-DE',
    female: ['Microsoft Katja Online (Natural) - German (Germany)', 'Microsoft Ingrid Online (Natural) - German (Austria)'],
    male: ['Microsoft Conrad Online (Natural) - German (Germany)', 'Microsoft Jonas Online (Natural) - German (Austria)'] },
  { aliases: ['italian', 'italiano', 'it'], code: 'it', lang: 'it-IT',
    female: ['Microsoft Elsa Online (Natural) - Italian (Italy)'],
    male: ['Microsoft Diego Online (Natural) - Italian (Italy)'] },
  { aliases: ['portuguese', 'portugues', 'português', 'pt'], code: 'pt', lang: 'pt-BR',
    female: ['Microsoft Francisca Online (Natural) - Portuguese (Brazil)', 'Microsoft Raquel Online (Natural) - Portuguese (Portugal)'],
    male: ['Microsoft Antonio Online (Natural) - Portuguese (Brazil)', 'Microsoft Duarte Online (Natural) - Portuguese (Portugal)'] },
  { aliases: ['dutch', 'nederlands', 'nl'], code: 'nl', lang: 'nl-NL',
    female: ['Microsoft Fenna Online (Natural) - Dutch (Netherlands)'],
    male: ['Microsoft Maarten Online (Natural) - Dutch (Netherlands)'] },
  { aliases: ['polish', 'polski', 'pl'], code: 'pl', lang: 'pl-PL',
    female: ['Microsoft Zofia Online (Natural) - Polish (Poland)'],
    male: ['Microsoft Marek Online (Natural) - Polish (Poland)'] },
  { aliases: ['russian', 'russkiy', 'русский', 'ru'], code: 'ru', lang: 'ru-RU',
    female: ['Microsoft Svetlana Online (Natural) - Russian (Russia)'],
    male: ['Microsoft Dmitry Online (Natural) - Russian (Russia)'] },
  { aliases: ['turkish', 'turkce', 'türkçe', 'tr'], code: 'tr', lang: 'tr-TR',
    female: ['Microsoft Emel Online (Natural) - Turkish (Turkey)'],
    male: ['Microsoft Ahmet Online (Natural) - Turkish (Turkey)'] },
  { aliases: ['arabic', 'arabicmodernstandard', 'ar'], code: 'ar', lang: 'ar-SA',
    female: ['Microsoft Zariyah Online (Natural) - Arabic (Saudi Arabia)', 'Microsoft Salma Online (Natural) - Arabic (Egypt)'],
    male: ['Microsoft Hamed Online (Natural) - Arabic (Saudi Arabia)', 'Microsoft Shakir Online (Natural) - Arabic (Egypt)'] },
  { aliases: ['hebrew', 'ivrit', 'עברית', 'he'], code: 'he', lang: 'he-IL',
    female: ['Microsoft Hila Online (Natural) - Hebrew (Israel)'],
    male: ['Microsoft Avri Online (Natural) - Hebrew (Israel)'] },
  { aliases: ['hindi', 'hindī', 'हिन्दी', 'hi'], code: 'hi', lang: 'hi-IN',
    female: ['Microsoft Swara Online (Natural) - Hindi (India)'],
    male: ['Microsoft Madhur Online (Natural) - Hindi (India)'] },
  { aliases: ['japanese', 'nihongo', '日本語', 'ja'], code: 'ja', lang: 'ja-JP',
    female: ['Microsoft Nanami Online (Natural) - Japanese (Japan)'],
    male: ['Microsoft Keita Online (Natural) - Japanese (Japan)'] },
  { aliases: ['korean', 'hangugo', '한국어', 'ko'], code: 'ko', lang: 'ko-KR',
    female: ['Microsoft SunHi Online (Natural) - Korean (Korea)'],
    male: ['Microsoft InJoon Online (Natural) - Korean (Korea)'] },
  { aliases: ['chinese', 'mandarin', 'zhongwen', '中文', 'zh'], code: 'zh', lang: 'zh-CN',
    female: ['Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)'],
    male: ['Microsoft Yunxi Online (Natural) - Chinese (Mainland)'] },
  { aliases: ['vietnamese', 'tiengviet', 'tiếngviệt', 'vi'], code: 'vi', lang: 'vi-VN',
    female: ['Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)'],
    male: ['Microsoft NamMinh Online (Natural) - Vietnamese (Vietnam)'] },
  { aliases: ['thai', 'phasathai', 'ไทย', 'th'], code: 'th', lang: 'th-TH',
    female: ['Microsoft Premwadee Online (Natural) - Thai (Thailand)'],
    male: ['Microsoft Niwat Online (Natural) - Thai (Thailand)'] },
  { aliases: ['indonesian', 'bahasaindonesia', 'id'], code: 'id', lang: 'id-ID',
    female: ['Microsoft Gadis Online (Natural) - Indonesian (Indonesia)'],
    male: ['Microsoft Ardi Online (Natural) - Indonesian (Indonesia)'] },
  { aliases: ['malay', 'bahasamelayu', 'ms'], code: 'ms', lang: 'ms-MY',
    female: ['Microsoft Yasmin Online (Natural) - Malay (Malaysia)'],
    male: ['Microsoft Osman Online (Natural) - Malay (Malaysia)'] },
  { aliases: ['filipino', 'tagalog', 'fil'], code: 'fil', lang: 'fil-PH',
    female: ['Microsoft Blessica Online (Natural) - Filipino (Philippines)'],
    male: ['Microsoft Angelo Online (Natural) - Filipino (Philippines)'] },
  { aliases: ['ukrainian', 'ukrayinska', 'українська', 'uk'], code: 'uk', lang: 'uk-UA',
    female: ['Microsoft Polina Online (Natural) - Ukrainian (Ukraine)'],
    male: ['Microsoft Ostap Online (Natural) - Ukrainian (Ukraine)'] },
  { aliases: ['romanian', 'romana', 'română', 'ro'], code: 'ro', lang: 'ro-RO',
    female: ['Microsoft Alina Online (Natural) - Romanian (Romania)'],
    male: ['Microsoft Emil Online (Natural) - Romanian (Romania)'] },
  { aliases: ['hungarian', 'magyar', 'hu'], code: 'hu', lang: 'hu-HU',
    female: ['Microsoft Noemi Online (Natural) - Hungarian (Hungary)'],
    male: ['Microsoft Tamas Online (Natural) - Hungarian (Hungary)'] },
  { aliases: ['czech', 'cestina', 'čeština', 'cs'], code: 'cs', lang: 'cs-CZ',
    female: ['Microsoft Vlasta Online (Natural) - Czech (Czechia)'],
    male: ['Microsoft Antonin Online (Natural) - Czech (Czechia)'] },
  { aliases: ['greek', 'ellinika', 'ελληνικά', 'el'], code: 'el', lang: 'el-GR',
    female: ['Microsoft Athina Online (Natural) - Greek (Greece)'],
    male: ['Microsoft Nestoras Online (Natural) - Greek (Greece)'] },
  { aliases: ['swedish', 'svenska', 'sv'], code: 'sv', lang: 'sv-SE',
    female: ['Microsoft Sofie Online (Natural) - Swedish (Sweden)'],
    male: ['Microsoft Mattias Online (Natural) - Swedish (Sweden)'] },
  { aliases: ['norwegian', 'norsk', 'nb', 'no'], code: 'nb', lang: 'nb-NO',
    female: ['Microsoft Pernille Online (Natural) - Norwegian (Norway)'],
    male: ['Microsoft Finn Online (Natural) - Norwegian (Norway)'] },
  { aliases: ['danish', 'dansk', 'da'], code: 'da', lang: 'da-DK',
    female: ['Microsoft Christel Online (Natural) - Danish (Denmark)'],
    male: ['Microsoft Jeppe Online (Natural) - Danish (Denmark)'] },
  { aliases: ['finnish', 'suomi', 'fi'], code: 'fi', lang: 'fi-FI',
    female: ['Microsoft Noora Online (Natural) - Finnish (Finland)'],
    male: ['Microsoft Harri Online (Natural) - Finnish (Finland)'] },
  { aliases: ['catalan', 'catala', 'català', 'ca'], code: 'ca', lang: 'ca-ES',
    female: ['Microsoft Joana Online (Natural) - Catalan (Spain)'],
    male: ['Microsoft Enric Online (Natural) - Catalan (Spain)'] },
  { aliases: ['persian', 'farsi', 'فارسی', 'fa'], code: 'fa', lang: 'fa-IR',
    female: ['Microsoft Dilara Online (Natural) - Persian (Iran)'],
    male: ['Microsoft Farid Online (Natural) - Persian (Iran)'] },
  { aliases: ['slovak', 'slovencina', 'slovenčina', 'sk'], code: 'sk', lang: 'sk-SK',
    female: ['Microsoft Viktoria Online (Natural) - Slovak (Slovakia)'],
    male: ['Microsoft Lukas Online (Natural) - Slovak (Slovakia)'] },
  { aliases: ['bulgarian', 'balgarski', 'български', 'bg'], code: 'bg', lang: 'bg-BG',
    female: ['Microsoft Daria Online (Natural) - Bulgarian (Bulgaria)'],
    male: ['Microsoft Borislav Online (Natural) - Bulgarian (Bulgaria)'] },
  { aliases: ['croatian', 'hrvatski', 'hr'], code: 'hr', lang: 'hr-HR',
    female: ['Microsoft Gabrijela Online (Natural) - Croatian (Croatia)'],
    male: ['Microsoft Srecko Online (Natural) - Croatian (Croatia)'] },
  { aliases: ['urdu', 'اردو', 'ur'], code: 'ur', lang: 'ur-PK', female: [], male: [] },
  { aliases: ['bengali', 'bangla', 'বাংলা', 'bn'], code: 'bn', lang: 'bn-BD', female: [], male: [] },
  { aliases: ['tamil', 'தமிழ்', 'ta'], code: 'ta', lang: 'ta-IN', female: [], male: [] },
  { aliases: ['telugu', 'తెలుగు', 'te'], code: 'te', lang: 'te-IN', female: [], male: [] },
  { aliases: ['swahili', 'kiswahili', 'sw'], code: 'sw', lang: 'sw-KE', female: [], male: [] },
  { aliases: ['afrikaans', 'af'], code: 'af', lang: 'af-ZA', female: [], male: [] },
  { aliases: ['azerbaijani', 'azerbaycan', 'azərbaycan', 'az'], code: 'az', lang: 'az-AZ', female: [], male: [] },
  { aliases: ['kazakh', 'qazaq', 'қазақ', 'kk'], code: 'kk', lang: 'kk-KZ', female: [], male: [] },
  { aliases: ['georgian', 'kartuli', 'ქართული', 'ka'], code: 'ka', lang: 'ka-GE', female: [], male: [] },
  { aliases: ['armenian', 'hayeren', 'հայերեն', 'hy'], code: 'hy', lang: 'hy-AM', female: [], male: [] },
  { aliases: ['mongolian', 'mongol', 'монгол', 'mn'], code: 'mn', lang: 'mn-MN', female: [], male: [] },
  { aliases: ['nepali', 'नेपाली', 'ne'], code: 'ne', lang: 'ne-NP', female: [], male: [] },
  { aliases: ['sinhala', 'සිංහල', 'si'], code: 'si', lang: 'si-LK', female: [], male: [] },
  { aliases: ['khmer', 'cambodian', 'ខ្មែរ', 'km'], code: 'km', lang: 'km-KH', female: [], male: [] },
  { aliases: ['amharic', 'አማርኛ', 'am'], code: 'am', lang: 'am-ET', female: [], male: [] },
  { aliases: ['somali', 'soomaali', 'so'], code: 'so', lang: 'so-SO', female: [], male: [] },
  { aliases: ['zulu', 'isizulu', 'zu'], code: 'zu', lang: 'zu-ZA', female: [], male: [] },
  { aliases: ['icelandic', 'islenska', 'íslenska', 'is'], code: 'is', lang: 'is-IS', female: [], male: [] },
  { aliases: ['irish', 'gaeilge', 'ga'], code: 'ga', lang: 'ga-IE', female: [], male: [] },
  { aliases: ['welsh', 'cymraeg', 'cy'], code: 'cy', lang: 'cy-GB', female: [], male: [] },
  { aliases: ['estonian', 'eesti', 'et'], code: 'et', lang: 'et-EE', female: [], male: [] },
  { aliases: ['latvian', 'latviesu', 'latviešu', 'lv'], code: 'lv', lang: 'lv-LV', female: [], male: [] },
  { aliases: ['lithuanian', 'lietuviu', 'lietuvių', 'lt'], code: 'lt', lang: 'lt-LT', female: [], male: [] },
  { aliases: ['slovenian', 'slovenscina', 'slovenščina', 'sl'], code: 'sl', lang: 'sl-SI', female: [], male: [] },
  { aliases: ['serbian', 'srpski', 'српски', 'sr'], code: 'sr', lang: 'sr-RS', female: [], male: [] },
];

/** Lower-case, punctuation-free form of a free-text language name. Keeps the
    Latin-1 accented letters and the main non-Latin scripts, so "Français",
    "français", "فارسی" and "日本語" all survive intact. */
function normaliseLanguage(value?: string | null): string {
  return String(value || '').toLowerCase()
    .replace(/[^0-9a-z\u00c0-\u024f\u0370-\u03ff\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]+/g, '')
    .trim();
}

/** True for English, an empty value and anything we cannot place. */
export function isEnglishLanguage(value?: string | null): boolean {
  const v = normaliseLanguage(value);
  if (!v) return true;
  if (ENGLISH_ALIASES.indexOf(v) !== -1) return true;
  if (v.indexOf('english') !== -1) return true;
  // 'en', the ISO 639-2 code 'eng', or a BCP-47 variant whose separators were
  // stripped by normaliseLanguage ('en-GB' -> 'engb'): an English learner must
  // never be handed a foreign voice.
  return v === 'en' || v === 'eng' || /^en[a-z]{2}$/.test(v);
}

/** The voice set for a target-language name, ISO code or the language's own name. */
export function findLanguageVoiceSet(language?: string | null): LanguageVoiceSet | null {
  const v = normaliseLanguage(language);
  if (!v || isEnglishLanguage(v)) return null;
  for (const set of LANGUAGE_VOICE_SETS) {
    for (const raw of set.aliases) {
      const alias = normaliseLanguage(raw);
      if (!alias) continue;
      // Short codes must match exactly ('es' must not match 'estonian'); longer
      // aliases may open a compound name ('spanish' → 'spanishmexican').
      if (v === alias || (alias.length >= 4 && v.indexOf(alias) === 0)) return set;
    }
  }
  return null;
}

/** True when the given voice name/URI belongs to the given Microsoft voice id. */
export function voiceMatchesId(voiceName: string, id: string): boolean {
  const name = String(voiceName || '').toLowerCase();
  const target = String(id || '').toLowerCase();
  if (!name || !target) return false;
  if (name === target || name.indexOf(target) !== -1) return true;
  // Edge reports "Microsoft Denise Online (Natural) - French (France)" while the
  // catalogue keeps the same string, but some builds drop the language suffix.
  const stem = target.indexOf(' - ') !== -1 ? target.split(' - ')[0] : '';
  return !!stem && name.indexOf(stem) !== -1;
}

/** The Microsoft Natural voice ids this language prefers, in order, for a gender. */
export function languageVoiceCandidates(language?: string | null, gender?: 'male' | 'female' | 'child'): string[] {
  const set = findLanguageVoiceSet(language);
  if (!set) return [];
  const other = set.female.length ? set.female : set.male;
  const males = set.male.length ? set.male : set.female;
  if (gender === 'male') return males.concat(other, set.child || []);
  if (gender === 'child') return (set.child || []).concat(set.female, set.male);
  return other.concat(males, set.child || []);
}

/**
 * The voice to read this learner's lesson with. Returns a real installed voice
 * when the machine has one for the target language (matched by name, then by
 * language code), otherwise the Microsoft voice id so the lesson still asks for
 * it. Empty for English and for languages we cannot place.
 */
export function pickVoiceForLanguage(
  language?: string | null,
  gender?: 'male' | 'female' | 'child',
  voices?: SpeechSynthesisVoice[],
): string {
  const set = findLanguageVoiceSet(language);
  if (!set) return '';
  const installed = voices || (typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
  const candidates = languageVoiceCandidates(language, gender);
  for (const id of candidates) {
    const hit = installed.find(v => voiceMatchesId(v.name, id) || voiceMatchesId(v.voiceURI, id));
    if (hit) return hit.voiceURI || hit.name;
  }
  const code = set.code.toLowerCase();
  const byLanguage = installed.find(v => String(v.lang || '').toLowerCase().indexOf(code) === 0);
  if (byLanguage) return byLanguage.voiceURI || byLanguage.name;
  return candidates[0] || '';
}

/**
 * tag → Microsoft voice id for the multi-voice players ([male1] … [female5],
 * [child1], [child2], [speaker]). Null for English, so the English map stays in
 * charge and nothing changes when the learner is studying English.
 */
export function tagVoiceMapForLanguage(language?: string | null): Record<string, string> | null {
  const set = findLanguageVoiceSet(language);
  if (!set) return null;
  const pick = (list: string[], i: number) => (list.length ? list[i % list.length] : '');
  const females = set.female.length ? set.female : set.male;
  const males = set.male.length ? set.male : set.female;
  const children = set.child && set.child.length ? set.child : females;
  const out: Record<string, string> = {};
  for (let i = 0; i < 5; i++) {
    out['male' + (i + 1)] = pick(males, i);
    out['female' + (i + 1)] = pick(females, i);
  }
  out['child1'] = pick(children, 0);
  out['child2'] = pick(children, 1);
  out['speaker'] = pick(females, 0);
  return out;
}

/** The BCP-47 tag the browser should read with when no dedicated voice exists. */
export function speechLanguageTag(language?: string | null): string {
  const set = findLanguageVoiceSet(language);
  return set ? set.lang : '';
}

/** A human label for the Step-2 hint ("French — Microsoft Denise Online (Natural)"). */
export function languageVoiceLabel(language?: string | null, gender?: 'male' | 'female' | 'child'): string {
  const set = findLanguageVoiceSet(language);
  if (!set) return '';
  const first = languageVoiceCandidates(language, gender)[0] || '';
  const name = first ? first.split(' - ')[0] : '';
  const label = String(language || '').trim();
  return name ? (label ? label + ' — ' + name : name) : label;
}

export const TAGGED_VOICES: Record<string, string> = {
  'male1': 'Microsoft Andrew Online (Natural) - English (United States)',
  'male2': 'Microsoft Ryan Online (Natural) - English (United Kingdom)',
  'male3': 'Microsoft Liam Online (Natural) - English (Canada)',
  'male4': 'Microsoft William Online (Natural) - English (Australia)',
  'male5': 'Microsoft Connor Online (Natural) - English (Ireland)',
  'female1': 'Microsoft Emma Online (Natural) - English (United States)',
  'female2': 'Microsoft Sonia Online (Natural) - English (United Kingdom)',
  'female3': 'Microsoft Elvira Online (Natural) - Spanish (Spain)',
  'female4': 'Microsoft Clara Online (Natural) - English (Canada)',
  'female5': 'Microsoft Natasha Online (Natural) - English (Australia)',
  'child1': 'Microsoft Ana Online (Natural) - English (United States)',
  'child2': 'Microsoft Maisie Online (Natural) - English (United Kingdom)',
};
