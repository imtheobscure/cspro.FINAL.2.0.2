/**
 * Voice grouping & accent-aware labels for read-aloud voice pickers.
 *
 * Groups Microsoft Azure natural voices (and other modern neural voices) by
 * accent/region and gender, labels them like "British.Female.Sonia" and orders
 * the grouped voices FIRST in any dropdown, with British voices highlighted in
 * red so they are easy to spot.
 */

export interface VoiceRegion {
  key: string;         // 'gb' | 'us' | 'au' | ...
  label: string;       // 'British' | 'American' | ...
  flag: string;        // '🇬🇧'
  color: string;       // accent color (red for British)
  isBritish: boolean;
  order: number;       // lower = earlier in the dropdown
}

// Ordered English accents. en-GB gets the red highlight and top position.
const EN_REGIONS: VoiceRegion[] = [
  { key: 'gb', label: 'British', flag: '🇬🇧', color: '#dc2626', isBritish: true, order: 1 },
  { key: 'us', label: 'American', flag: '🇺🇸', color: '#1d4ed8', isBritish: false, order: 2 },
  { key: 'au', label: 'Australian', flag: '🇦🇺', color: '#b45309', isBritish: false, order: 3 },
  { key: 'ca', label: 'Canadian', flag: '🇨🇦', color: '#0d9488', isBritish: false, order: 4 },
  { key: 'ie', label: 'Irish', flag: '🇮🇪', color: '#15803d', isBritish: false, order: 5 },
  { key: 'nz', label: 'New Zealander', flag: '🇳🇿', color: '#7c3aed', isBritish: false, order: 6 },
  { key: 'in', label: 'Indian', flag: '🇮🇳', color: '#f97316', isBritish: false, order: 7 },
  { key: 'za', label: 'South African', flag: '🇿🇦', color: '#0891b2', isBritish: false, order: 8 },
  { key: 'sg', label: 'Singaporean', flag: '🇸🇬', color: '#db2777', isBritish: false, order: 9 },
  { key: 'hk', label: 'Hong Kong', flag: '🇭🇰', color: '#ca8a04', isBritish: false, order: 10 },
  { key: 'ph', label: 'Filipino', flag: '🇵🇭', color: '#be185d', isBritish: false, order: 11 },
  { key: 'ng', label: 'Nigerian', flag: '🇳🇬', color: '#059669', isBritish: false, order: 12 },
  { key: 'ke', label: 'Kenyan', flag: '🇰🇪', color: '#4d7c0f', isBritish: false, order: 13 },
  { key: 'gh', label: 'Ghanaian', flag: '🇬🇭', color: '#b91c1c', isBritish: false, order: 14 },
  { key: 'mx', label: 'Mexican', flag: '🇲🇽', color: '#a16207', isBritish: false, order: 15 },
];

const EN_REGION_BY_LANG: Record<string, VoiceRegion> = {};
EN_REGIONS.forEach(r => {
  EN_REGION_BY_LANG['en-' + r.key] = r;
});

// Region detection from the human-readable region inside the voice name
// (e.g. "Microsoft Sonia Online (Natural) - English (United Kingdom)").
const REGION_ALIASES: Record<string, string> = {
  'united kingdom': 'gb', 'uk': 'gb', 'britain': 'gb', 'british': 'gb', 'england': 'gb',
  'scotland': 'gb', 'wales': 'gb', 'british english': 'gb', 'english uk': 'gb',
  'united states': 'us', 'usa': 'us', 'america': 'us', 'american': 'us', 'us english': 'us',
  'australia': 'au', 'australian': 'au', 'australian english': 'au',
  'canada': 'ca', 'canadian': 'ca', 'canadian english': 'ca',
  'ireland': 'ie', 'irish': 'ie', 'irish english': 'ie',
  'new zealand': 'nz', 'new zealander': 'nz',
  'india': 'in', 'indian': 'in', 'indian english': 'in',
  'south africa': 'za', 'south african': 'za',
  'singapore': 'sg', 'singaporean': 'sg',
  'hong kong': 'hk', 'hongkong': 'hk', 'hong kong english': 'hk',
  'philippines': 'ph', 'filipino': 'ph', 'filipina': 'ph',
  'nigeria': 'ng', 'nigerian': 'ng',
  'kenya': 'ke', 'kenyan': 'ke',
  'ghana': 'gh', 'ghanaian': 'gh',
  'tanzania': 'tz', 'tanzanian': 'tz',
  'mexico': 'mx', 'mexican': 'mx',
};

// Language labels used for non-English natural voices ("Other Accents" group).
export const LANG_LABELS: Record<string, string> = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
  ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic', nl: 'Dutch',
  tr: 'Turkish', hi: 'Hindi', pl: 'Polish', ru: 'Russian', sv: 'Swedish',
  no: 'Norwegian', da: 'Danish', fi: 'Finnish', cs: 'Czech', el: 'Greek',
  he: 'Hebrew', th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay',
  hu: 'Hungarian', ro: 'Romanian', uk: 'Ukrainian', fa: 'Persian', ur: 'Urdu',
  bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', gu: 'Gujarati',
  kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', sw: 'Swahili', af: 'Afrikaans',
  hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian', bg: 'Bulgarian', sr: 'Serbian',
  lt: 'Lithuanian', lv: 'Latvian', et: 'Estonian', is: 'Icelandic', ca: 'Catalan',
  eu: 'Basque', gl: 'Galician', cy: 'Welsh', ga: 'Irish Gaelic', mt: 'Maltese',
  sq: 'Albanian', mk: 'Macedonian', hy: 'Armenian', ka: 'Georgian', az: 'Azerbaijani',
  kk: 'Kazakh', uz: 'Uzbek', ne: 'Nepali', si: 'Sinhala', km: 'Khmer', lo: 'Lao',
  my: 'Burmese', am: 'Amharic', ti: 'Tigrinya', so: 'Somali', ha: 'Hausa',
  yo: 'Yoruba', ig: 'Igbo', zu: 'Zulu', xh: 'Xhosa', st: 'Sesotho', sn: 'Shona',
  ny: 'Chichewa', mg: 'Malagasy', rw: 'Kinyarwanda', om: 'Oromo', tl: 'Filipino',
  jw: 'Javanese', su: 'Sundanese', ceb: 'Cebuano', mn: 'Mongolian', kmr: 'Kurdish',
  ps: 'Pashto', dv: 'Divehi', tt: 'Tatar', ug: 'Uyghur',
};

// Gender detection lists (Azure neural voice first names + common platform voices).
const FEMALE_NAMES = [
  'ava', 'emma', 'jenny', 'aria', 'ana', 'michelle', 'cora', 'elizabeth', 'jenifer',
  'nancy', 'zira', 'sonia', 'libby', 'maisie', 'clara', 'natasha', 'elvira', 'neerja',
  'swara', 'kavya', 'reha', 'pallavi', 'sobhita', 'ananya', 'ezinne', 'gaabi', 'thando',
  'tumi', 'zinhle', 'aaliyah', 'amina', 'bushra', 'maryam', 'yan', 'luna', 'hiugaai',
  'tingting', 'xiaoxiao', 'xiaoyi', 'xiaozhen', 'hiumaan', 'aqpeye', 'abrielle', 'tessa',
  'hannah', 'serena', 'bella', 'sienna', 'chloe', 'freya', 'harper', 'isabella', 'jasmine',
  'kenzie', 'madison', 'nora', 'olivia', 'ruby', 'sophie', 'willow', 'zara', 'amelie',
  'camille', 'celeste', 'coralie', 'eloise', 'jacqueline', 'josephine', 'yvette', 'denise',
  'ellen', 'heleen', 'milou', 'fenna', 'maalke', 'selma', 'viona', 'noor', 'maria',
  'sofia', 'lucia', 'elena', 'marina', 'nuria', 'alba', 'estrella', 'paloma', 'dilara',
  'emel', 'gonca', 'derya', 'aysel', 'gul', 'ikbal', 'hala', 'heba', 'laila', 'rana',
  'salma', 'shaimaa', 'jameela', 'fatima', 'ayesha', 'uzma', 'hafsa', 'sara', 'mariam',
  'anna', 'sonja', 'lili', 'emily', 'karen', 'moira', 'fiona', 'veena', 'victoria',
  'susan', 'heera', 'jessica', 'linda', 'sharon', 'amanda', 'tracy', 'lisa', 'annette',
  'yolanda', 'leah', 'rosa', 'asmani', 'martha', 'zuzana', 'helena', 'zari', 'elsa',
  'katia', 'samantha', 'allison', 'joanna', 'kendra', 'kimberly', 'salli',
  'nicole', 'ruth', 'stephen', 'catherine', 'gwyneth', 'madeline', 'sarah',
  'alice', 'emma', 'harriet', 'hazel', 'jacinda', 'vicki', 'julia', 'siobhan',
  'niamh', 'aoife', 'eimear', 'saoirse', 'clodagh', 'rose', 'daisy', 'poppy', 'ivy',
  'holly', 'amy', 'megan', 'charlotte', 'grace', 'freya', 'scarlett', 'victoria',
];

const MALE_NAMES = [
  'guy', 'andrew', 'brian', 'christopher', 'eric', 'roger', 'steffan', 'thomas', 'james',
  'jacob', 'matthew', 'ethan', 'nathan', 'liam', 'william', 'connor', 'daniel', 'oliver',
  'george', 'noah', 'ryan', 'david', 'mark', 'ben', 'bill', 'jack', 'pat', 'sam', 'sean',
  'todd', 'aiden', 'caleb', 'carter', 'charlie', 'dylan', 'elliot', 'felix', 'finn',
  'hunter', 'kai', 'leo', 'luke', 'mason', 'michael', 'oscar', 'riley', 'toby', 'austin',
  'parker', 'brandon', 'vincent', 'logan', 'aaron', 'adam', 'alan', 'alex', 'alvin',
  'amir', 'arjun', 'asa', 'ash', 'blaine', 'chris', 'dustin', 'eugene', 'frank', 'garrett',
  'gill', 'henry', 'herman', 'jason', 'jeff', 'joe', 'joel', 'jordan', 'kyle', 'lucas',
  'malcolm', 'marcus', 'martin', 'matt', 'miguel', 'mike', 'milo', 'morris', 'neil',
  'nicholas', 'pablo', 'ravi', 'ray', 'reed', 'ricardo', 'rick', 'robin', 'sid', 'stefan',
  'terrance', 'trevor', 'victor', 'vijay', 'vinnie', 'walter', 'wendell', 'wilfred',
  'jonty', 'arthur', 'theodore', 'freddie', 'alfie', 'reggie', 'ronnie', 'albie', 'bobby',
  'kian', 'stanley', 'hugo', 'judah', 'graeme', 'blair', 'callum', 'cameron', 'clyde',
  'dean', 'ewan', 'ian', 'jay', 'angus', 'bruce', 'craig', 'euan', 'fergus', 'hamish',
  'lewis', 'cormac', 'cian', 'cillian', 'darragh', 'eoghan', 'fionn', 'oisin', 'padraig',
  'conor', 'killian', 'brendan', 'declan', 'eamon', 'edward', 'enda', 'fergal', 'finbar',
  'gerard', 'hugh', 'john', 'joseph', 'kevin', 'lorcan', 'niall', 'owen', 'patrick',
  'peter', 'philip', 'raymond', 'robert', 'ronan', 'rory', 'samuel', 'shane', 'stephen',
  'timothy', 'tomas', 'aidan', 'aodh', 'cathal', 'ciaran', 'colm', 'colm', 'daire',
  'diarmuid', 'donal', 'eanna', 'fearghal', 'fiachra', 'fintan', 'gearoid', 'iarla',
  'kieran', 'lochlann', 'malachy', 'murtagh', 'odhran', 'pearse', 'rian', 'ruairi',
  'senan', 'turlough', 'daniel', 'joshua', 'kevin', 'brian', 'david', 'james', 'john',
  'dan', 'mark', 'steve', 'tom', 'jerry', 'vicki', 'geraint', 'salli', 'zayn', 'mahmoud',
  'hamza', 'ali', 'omar', 'youssef', 'khaled', 'tariq', 'fares', 'rashid', 'karim',
  'hassan', 'hussein', 'ahmed', 'mohamed', 'mostafa', 'saad', 'bilal', 'ismail', 'yusuf',
];

const FEMALE_SET = new Set(FEMALE_NAMES);
const MALE_SET = new Set(MALE_NAMES);

function norm(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z]/g, '');
}

/** Extract the plain first name from an Azure-style voice name. */
export function getVoiceFirstName(name: string): string {
  const n = name || '';
  // "Microsoft Sonia Online (Natural) - English (United Kingdom)" -> "Sonia"
  let m = n.match(/^Microsoft\s+([A-Za-z]+)/i);
  if (m && m[1]) return m[1];
  // "SoniaNeural", "JennyNeural", "Ava Multilingual Neural"
  m = n.match(/([A-Za-z]+)\s*(?:Multilingual)?\s*(?:Neural|Online|Natural)\b/i);
  if (m && m[1]) return m[1];
  // "Google UK English Female" -> "Google UK English" (first token)
  const first = n.split(/[\s-]+/)[0];
  return first || n;
}

/** Guess gender from the voice name (Azure first names + common platform names). */
export function getVoiceGender(name: string): 'female' | 'male' | 'neutral' {
  const lower = (name || '').toLowerCase();
  if (lower.indexOf('female') !== -1) return 'female';
  if (lower.indexOf('male') !== -1) return 'male';
  // Prefer the extracted first name, then fall back to scanning every word.
  const first = norm(getVoiceFirstName(name));
  if (first && FEMALE_SET.has(first)) return 'female';
  if (first && MALE_SET.has(first)) return 'male';
  const words = lower.split(/[^a-z]+/).filter(Boolean);
  for (const w of words) {
    if (FEMALE_SET.has(w)) return 'female';
  }
  for (const w of words) {
    if (MALE_SET.has(w)) return 'male';
  }
  return 'neutral';
}

/** Is this a modern natural / neural / high-quality voice (Azure Online Natural etc.)? */
export function isNaturalVoice(name: string): boolean {
  const n = (name || '').toLowerCase();
  return /natural|neural|online|enhanced|premium|google/.test(n);
}

/** Resolve the accent region for a voice, from lang code or from the human-readable name. */
export function getVoiceRegion(voice: { name?: string; lang?: string }): VoiceRegion | null {
  const lang = (voice.lang || '').toLowerCase();
  const name = (voice.name || '').toLowerCase();

  // 1. Exact lang match: en-GB, en-US, en-AU, en-CA ...
  const langMatch = lang.match(/^en-([a-z]{2})/);
  if (langMatch) {
    const r = EN_REGION_BY_LANG['en-' + langMatch[1]];
    if (r) return r;
  }

  // 2. Human-readable region inside the name: "English (United Kingdom)", "UK English Male"...
  for (const alias of Object.keys(REGION_ALIASES)) {
    if (name.indexOf(alias) !== -1) {
      const r = EN_REGION_BY_LANG['en-' + REGION_ALIASES[alias]];
      if (r) return r;
    }
  }

  return null;
}

/** Short accent+gender+name label: "British.Female.Sonia". */
export function getVoiceShortLabel(voice: { name?: string; lang?: string }): string {
  const region = getVoiceRegion(voice);
  const first = getVoiceFirstName(voice.name || '');
  const gender = getVoiceGender(voice.name || '');
  const genderLabel = gender === 'neutral' ? '' : gender === 'female' ? 'Female' : 'Male';
  const regionLabel = region ? region.label : langLabel(voice.lang || '');
  const parts = [regionLabel];
  if (genderLabel) parts.push(genderLabel);
  parts.push(first);
  return parts.join('.');
}

function langLabel(lang: string): string {
  const code = (lang || '').split('-')[0].toLowerCase();
  return LANG_LABELS[code] || (lang || '').toUpperCase();
}

export interface VoiceSelectOption {
  value: string;          // voiceURI (or voice name when no URI is available)
  label: string;          // short label "British.Female.Sonia" for natural voices, else "Name (lang)"
  shortLabel: string;     // short label even for non-natural voices
  voice: SpeechSynthesisVoice;
  region: VoiceRegion | null;
  color?: string;         // text color (red for British)
  isNatural: boolean;
  isBritish: boolean;
  gender: 'female' | 'male' | 'neutral';
}

export interface VoiceSelectGroup {
  key: string;            // 'gb-female'
  accentKey: string;      // 'gb' | 'other'
  label: string;          // "British Female" / "Other Voices"
  flag: string;           // '🇬🇧'
  color: string;          // header color
  isBritish: boolean;
  gender: 'female' | 'male' | 'neutral' | 'mixed';
  options: VoiceSelectOption[];
}

const GENDER_RANK: Record<string, number> = { female: 0, male: 1, neutral: 2, mixed: 3 };

/**
 * Group & order voices for a dropdown:
 *  1) Natural English-accent voices, ordered GB → US → AU → CA → IE → NZ → IN → ...
 *     split into Female / Male groups, short labels, red for British.
 *  2) Other natural (non-English) accents.
 *  3) Everything else ("Other Voices") — original names at the end.
 */
export function groupVoicesForSelect(voices: SpeechSynthesisVoice[]): VoiceSelectGroup[] {
  const grouped = new Map<string, VoiceSelectGroup>();

  const bucket = (voice: SpeechSynthesisVoice, region: VoiceRegion | null, gender: 'female' | 'male' | 'neutral') => {
    const isBritish = !!(region && region.isBritish);
    const accentKey = region ? region.key : 'other';
    const key = `${accentKey}-${gender}`;
    if (!grouped.has(key)) {
      const isOther = !region;
      grouped.set(key, {
        key,
        accentKey,
        label: isOther ? 'Other Voices' : `${region!.label} ${gender === 'female' ? 'Female' : gender === 'male' ? 'Male' : ''}`.trim(),
        flag: isOther ? '🌍' : region!.flag,
        color: isOther ? '#64748b' : region!.color,
        isBritish,
        gender,
        options: [],
      });
    }
    const g = grouped.get(key)!;
    const isNatural = isNaturalVoice(voice.name || '');
    const shortLabel = getVoiceShortLabel(voice);
    const fullLabel = isNatural ? shortLabel : `${voice.name} (${voice.lang})`;
    g.options.push({
      value: voice.voiceURI || voice.name,
      label: fullLabel,
      shortLabel,
      voice,
      region,
      color: isBritish ? '#dc2626' : undefined,
      isNatural,
      isBritish,
      gender,
    });
  };

  voices.forEach(v => {
    // Only modern natural/neural voices belong in the accent groups at the top;
    // legacy voices (David, Zira, Desktop, eSpeak...) go to the bottom list.
    const region = isNaturalVoice(v.name || '') ? getVoiceRegion(v) : null;
    const gender = getVoiceGender(v.name || '');
    bucket(v, region, gender);
  });

  const groups = Array.from(grouped.values());

  // Rank: region order first (natural accents), then 'other' accents, then plain others.
  const rank = (g: VoiceSelectGroup): number => {
    const region = EN_REGIONS.find(r => r.key === g.accentKey);
    if (region) return region.order;
    if (g.accentKey === 'other') {
      // All-natural "other accent" groups before the plain "other voices" bucket.
      const allNatural = g.options.every(o => o.isNatural);
      return allNatural ? 40 : 99;
    }
    return 99;
  };

  // Nicer labels: natural non-English accents become "Other Natural Accents".
  groups.forEach(g => {
    if (g.accentKey === 'other' && g.options.every(o => o.isNatural)) {
      g.label = 'Other Natural Accents';
    }
  });

  groups.sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    const gr = GENDER_RANK[a.gender] - GENDER_RANK[b.gender];
    if (gr !== 0) return gr;
    return a.label.localeCompare(b.label);
  });

  // Sort options inside each group: natural first, then female/male, alphabetical.
  groups.forEach(g => {
    g.options.sort((a, b) => {
      if (a.isNatural !== b.isNatural) return a.isNatural ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  });

  return groups;
}

// ---------------------------------------------------------------------------
// Tiny optimized SVG avatar data-URIs (a few hundred bytes, can never 404)
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function shade(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.max(0, Math.min(255, Math.round(c * factor)));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/** Build a small round SVG avatar (data URI) from initials + color. ~450 bytes. */
export function buildAvatarDataUri(initials: string, color: string): string {
  const safe = (initials || '?').replace(/[<>&"']/g, '').slice(0, 3).toUpperCase() || '?';
  const dark = shade(color, 0.55);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${color}'/><stop offset='1' stop-color='${dark}'/>` +
    `</linearGradient></defs>` +
    `<circle cx='32' cy='32' r='32' fill='url(#g)'/>` +
    `<circle cx='32' cy='32' r='30' fill='none' stroke='rgba(255,255,255,0.35)' stroke-width='1.5'/>` +
    `<text x='32' y='40' font-family='Arial,Helvetica,sans-serif' font-size='24' font-weight='bold' fill='#ffffff' text-anchor='middle'>${safe}</text>` +
    `</svg>`;
  // encodeURIComponent leaves ' ( ) ! * * raw — escape ' so the URI is safe inside
  // single-quoted JS strings in generated HTML and CSS url(...) contexts.
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/'/g, '%27');
}

/** Avatar for a voice: region color + first-name initial (or gender glyph fallback). */
export function buildVoiceAvatarDataUri(voice: { name?: string; lang?: string }): string {
  const region = getVoiceRegion(voice);
  const first = getVoiceFirstName(voice.name || '');
  const gender = getVoiceGender(voice.name || '');
  const color = region ? region.color : '#64748b';
  const initial = first ? first.charAt(0).toUpperCase() : gender === 'female' ? '♀' : gender === 'male' ? '♂' : '🎙';
  return buildAvatarDataUri(initial, color);
}

/** Avatar for a character: gender palette + initials. */
export function buildCharacterAvatarDataUri(name: string, gender?: string, seedColor?: string): string {
  const initials = (name || '')
    .split(/\s+/)
    .map(w => w.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
  const palette: Record<string, [string, string]> = {
    female: ['#ec4899', '#8b5cf6'],
    male: ['#3b82f6', '#6366f1'],
    child: ['#f59e0b', '#f97316'],
  };
  const pair = palette[(gender || '').toLowerCase()] || ['#6366f1', '#8b5cf6'];
  return buildAvatarDataUri(initials, seedColor || pair[0]);
}

// ---------------------------------------------------------------------------
// Embeddable vanilla-JS helpers for GENERATED HTML lessons (no imports).
// Mirrors the logic above so standalone lesson files can group voices too.
// ---------------------------------------------------------------------------

export const VOICE_GROUP_RUNTIME_JS = String.raw`
(function () {
  if (window.__populateGroupedVoiceSelect) return;
  var EN_REGIONS = [
    { key: "gb", label: "British", flag: "\u{1F1EC}\u{1F1E7}", color: "#dc2626", isBritish: true },
    { key: "us", label: "American", flag: "\u{1F1FA}\u{1F1F8}", color: "#1d4ed8", isBritish: false },
    { key: "au", label: "Australian", flag: "\u{1F1E6}\u{1F1FA}", color: "#b45309", isBritish: false },
    { key: "ca", label: "Canadian", flag: "\u{1F1E8}\u{1F1E6}", color: "#0d9488", isBritish: false },
    { key: "ie", label: "Irish", flag: "\u{1F1EE}\u{1F1EA}", color: "#15803d", isBritish: false },
    { key: "nz", label: "New Zealander", flag: "\u{1F1F3}\u{1F1FF}", color: "#7c3aed", isBritish: false },
    { key: "in", label: "Indian", flag: "\u{1F1EE}\u{1F1F3}", color: "#f97316", isBritish: false },
    { key: "za", label: "South African", flag: "\u{1F1FF}\u{1F1E6}", color: "#0891b2", isBritish: false },
    { key: "sg", label: "Singaporean", flag: "\u{1F1F8}\u{1F1EC}", color: "#db2777", isBritish: false },
    { key: "hk", label: "Hong Kong", flag: "\u{1F1ED}\u{1F1F0}", color: "#ca8a04", isBritish: false },
    { key: "ph", label: "Filipino", flag: "\u{1F1F5}\u{1F1ED}", color: "#be185d", isBritish: false },
    { key: "ng", label: "Nigerian", flag: "\u{1F1F3}\u{1F1EC}", color: "#059669", isBritish: false },
    { key: "ke", label: "Kenyan", flag: "\u{1F1F0}\u{1F1EA}", color: "#4d7c0f", isBritish: false },
    { key: "gh", label: "Ghanaian", flag: "\u{1F1EC}\u{1F1ED}", color: "#b91c1c", isBritish: false },
    { key: "mx", label: "Mexican", flag: "\u{1F1F2}\u{1F1FD}", color: "#a16207", isBritish: false }
  ];
  var LANG_LABELS = { es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese", ja: "Japanese", ko: "Korean", zh: "Chinese", ar: "Arabic", nl: "Dutch", tr: "Turkish", hi: "Hindi", pl: "Polish", ru: "Russian", sv: "Swedish", no: "Norwegian", da: "Danish", fi: "Finnish", cs: "Czech", el: "Greek", he: "Hebrew", th: "Thai", vi: "Vietnamese", id: "Indonesian", ms: "Malay", hu: "Hungarian", ro: "Romanian", uk: "Ukrainian", fa: "Persian", ur: "Urdu", bn: "Bengali", sw: "Swahili", af: "Afrikaans" };
  var REGION_ALIASES = { "united kingdom": "gb", "uk": "gb", "britain": "gb", "british": "gb", "england": "gb", "scotland": "gb", "wales": "gb", "united states": "us", "usa": "us", "america": "us", "american": "us", "australia": "au", "australian": "au", "canada": "ca", "canadian": "ca", "ireland": "ie", "irish": "ie", "new zealand": "nz", "india": "in", "indian": "in", "south africa": "za", "singapore": "sg", "singaporean": "sg", "hong kong": "hk", "philippines": "ph", "filipino": "ph", "nigeria": "ng", "nigerian": "ng", "kenya": "ke", "kenyan": "ke", "ghana": "gh", "ghanaian": "gh" };
  var FEMALE = ["ava","emma","jenny","aria","ana","michelle","cora","elizabeth","jenifer","nancy","zira","sonia","libby","maisie","clara","natasha","elvira","neerja","swara","kavya","reha","pallavi","sobhita","ananya","ezinne","gaabi","thando","tumi","zinhle","aaliyah","amina","bushra","maryam","yan","luna","tingting","xiaoxiao","hiumaan","tessa","hannah","serena","bella","sienna","chloe","freya","harper","isabella","jasmine","madison","nora","olivia","ruby","sophie","willow","zara","amelie","camille","celeste","coralie","eloise","jacqueline","josephine","yvette","denise","ellen","heleen","milou","fenna","selma","viona","noor","maria","sofia","lucia","elena","marina","nuria","alba","estrella","paloma","dilara","emel","gonca","derya","aysel","hala","heba","laila","rana","salma","jameela","fatima","ayesha","uzma","hafsa","sara","mariam","anna","emily","karen","moira","fiona","veena","victoria","susan","heera","jessica","linda","sharon","amanda","tracy","lisa","annette","yolanda","leah","rosa","asmani","martha","zuzana","helena","zari","elsa","katia","samantha","allison","joanna","kendra","kimberly","salli","ruth","catherine","gwyneth","madeline","sarah","alice","harriet","hazel","jacinda","vicki","julia","siobhan","niamh","aoife","eimear","saoirse","clodagh","rose","daisy","poppy","ivy","holly","amy","megan","charlotte","grace","scarlett"];
  var MALE = ["guy","andrew","brian","christopher","eric","roger","steffan","thomas","james","jacob","matthew","ethan","nathan","liam","william","connor","daniel","oliver","george","noah","ryan","david","mark","ben","bill","jack","pat","sam","sean","todd","aiden","caleb","carter","charlie","dylan","elliot","felix","finn","hunter","kai","leo","luke","mason","michael","oscar","riley","toby","austin","parker","brandon","vincent","logan","aaron","adam","alan","alex","alvin","amir","arjun","asa","ash","blaine","chris","dustin","eugene","frank","garrett","gill","henry","herman","jason","jeff","joe","joel","jordan","kyle","lucas","malcolm","marcus","martin","matt","miguel","mike","milo","morris","neil","nicholas","pablo","ravi","ray","reed","ricardo","rick","robin","sid","stefan","terrance","trevor","victor","vijay","vinnie","walter","wendell","wilfred","jonty","arthur","theodore","freddie","alfie","reggie","ronnie","albie","bobby","kian","stanley","hugo","graeme","blair","callum","cameron","clyde","dean","ewan","ian","jay","angus","bruce","craig","euan","fergus","hamish","lewis","cormac","cian","cillian","darragh","eoghan","fionn","oisin","padraig","conor","killian","brendan","declan","eamon","edward","enda","fergal","finbar","gerard","hugh","john","joseph","kevin","lorcan","niall","owen","patrick","peter","philip","raymond","robert","ronan","rory","samuel","shane","stephen","timothy","tomas","aidan","cathal","ciaran","colm","daire","diarmuid","donal","fiachra","fintan","gearoid","iarla","kieran","lochlann","malachy","murtagh","odhran","pearse","rian","ruairi","senan","joshua","steve","tom","zayn","mahmoud","hamza","ali","omar","youssef","khaled","tariq","fares","rashid","karim","hassan","hussein","ahmed","mohamed","mostafa","saad","bilal","ismail","yusuf"];

  function norm(s) { return (s || "").toLowerCase().replace(/[^a-z]/g, ""); }
  function langLabel(lang) { var c = (lang || "").split("-")[0].toLowerCase(); return LANG_LABELS[c] || (lang || "").toUpperCase(); }
  function isNatural(name) { return /natural|neural|online|enhanced|premium|google/i.test(name || ""); }
  function firstName(name) {
    var n = name || "";
    var m = n.match(/^Microsoft\s+([A-Za-z]+)/i);
    if (m && m[1]) return m[1];
    m = n.match(/([A-Za-z]+)\s*(?:Multilingual)?\s*(?:Neural|Online|Natural)\b/i);
    if (m && m[1]) return m[1];
    var first = n.split(/[\s-]+/)[0];
    return first || n;
  }
  function genderOf(name) {
    var lower = (name || "").toLowerCase();
    if (lower.indexOf("female") !== -1) return "female";
    if (lower.indexOf("male") !== -1) return "male";
    var first = norm(firstName(name));
    if (FEMALE.indexOf(first) !== -1) return "female";
    if (MALE.indexOf(first) !== -1) return "male";
    var words = lower.split(/[^a-z]+/);
    for (var i = 0; i < words.length; i++) { if (FEMALE.indexOf(words[i]) !== -1) return "female"; }
    for (var j = 0; j < words.length; j++) { if (MALE.indexOf(words[j]) !== -1) return "male"; }
    return "neutral";
  }
  function regionOf(voice) {
    var lang = (voice.lang || "").toLowerCase();
    var name = (voice.name || "").toLowerCase();
    var lm = lang.match(/^en-([a-z]{2})/);
    if (lm) { for (var i = 0; i < EN_REGIONS.length; i++) { if (EN_REGIONS[i].key === lm[1]) return EN_REGIONS[i]; } }
    var keys = Object.keys(REGION_ALIASES);
    for (var j = 0; j < keys.length; j++) {
      if (name.indexOf(keys[j]) !== -1) {
        for (var k = 0; k < EN_REGIONS.length; k++) { if (EN_REGIONS[k].key === REGION_ALIASES[keys[j]]) return EN_REGIONS[k]; }
      }
    }
    return null;
  }
  function shortLabel(voice) {
    var region = regionOf(voice);
    var first = firstName(voice.name || "");
    var g = genderOf(voice.name || "");
    var gl = g === "female" ? "Female" : g === "male" ? "Male" : "";
    var rl = region ? region.label : langLabel(voice.lang || "");
    var parts = [rl]; if (gl) parts.push(gl); parts.push(first);
    return parts.join(".");
  }

  function populateGroupedVoiceSelect(select, voices, currentValue, keepDefaultOption, valueKey) {
    if (!select) return;
    select.innerHTML = "";
    if (keepDefaultOption !== false) {
      var def = document.createElement("option");
      def.value = "";
      def.textContent = "Auto (Ava / Natural)";
      select.appendChild(def);
    }
    var useName = valueKey === "name";
    var groups = {}; var order = [];
    function bucket(voice, region, g) {
      var key = (region ? region.key : "other") + "-" + g;
      if (!groups[key]) {
        var isOther = !region;
        var label = isOther ? "Other Voices" : region.label + " " + (g === "female" ? "Female" : g === "male" ? "Male" : "");
        groups[key] = { key: key, accentKey: region ? region.key : "other", label: label, flag: isOther ? "\u{1F30D}" : region.flag, color: isOther ? "#64748b" : region.color, isBritish: !!(region && region.isBritish), gender: g, options: [] };
        order.push(key);
      }
      var grp = groups[key];
      var nat = isNatural(voice.name || "");
      var sl = shortLabel(voice);
      grp.options.push({ value: voice.voiceURI || voice.name, voice: voice, label: nat ? sl : (voice.name + " (" + voice.lang + ")"), isNatural: nat, isBritish: !!(region && region.isBritish) });
    }
    for (var v = 0; v < voices.length; v++) {
      var voice = voices[v];
      var nat = isNatural(voice.name || "");
      var region = nat ? regionOf(voice) : null;
      var g = genderOf(voice.name || "");
      bucket(voice, region, g);
    }
    var rank = { gb: 1, us: 2, au: 3, ca: 4, ie: 5, nz: 6, in: 7, za: 8, sg: 9, hk: 10, ph: 11, ng: 12, ke: 13, gh: 14, mx: 15, other: 99 };
    var genderRank = { female: 0, male: 1, neutral: 2 };
    order.sort(function (a, b) {
      var ka = groups[a], kb = groups[b];
      var ra = rank[ka.accentKey] !== undefined ? rank[ka.accentKey] : (ka.accentKey === "other" ? (ka.options.every(function (o) { return o.isNatural; }) ? 40 : 99) : 99);
      var rb = rank[kb.accentKey] !== undefined ? rank[kb.accentKey] : (kb.accentKey === "other" ? (kb.options.every(function (o) { return o.isNatural; }) ? 40 : 99) : 99);
      if (ra !== rb) return ra - rb;
      var ga = genderRank[ka.gender] !== undefined ? genderRank[ka.gender] : 3;
      var gb2 = genderRank[kb.gender] !== undefined ? genderRank[kb.gender] : 3;
      if (ga !== gb2) return ga - gb2;
      return ka.label.localeCompare(kb.label);
    });
    order.forEach(function (key) {
      var grp = groups[key];
      var og = document.createElement("optgroup");
      og.label = grp.flag + " " + grp.label + (grp.isBritish ? "  (red = British)" : "");
      grp.options.sort(function (a, b) {
        if (a.isNatural !== b.isNatural) return a.isNatural ? -1 : 1;
        return a.label.localeCompare(b.label);
      });
      grp.options.forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = useName ? (o.voice ? o.voice.name : o.value) : o.value;
        opt.textContent = o.label;
        if (o.isBritish) { try { opt.style.color = "#dc2626"; opt.style.fontWeight = "bold"; } catch (e) {} }
        og.appendChild(opt);
      });
      select.appendChild(og);
    });
    if (currentValue) {
      var found = false;
      for (var i = 0; i < select.options.length; i++) { if (select.options[i].value === currentValue) { found = true; break; } }
      if (found) select.value = currentValue;
    }
  }
  window.__populateGroupedVoiceSelect = populateGroupedVoiceSelect;
  window.populateGroupedVoiceSelect = populateGroupedVoiceSelect;
})();
`;