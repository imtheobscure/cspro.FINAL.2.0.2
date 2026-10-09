import type { LangCode } from "./types";

export type LangDef = {
  id: LangCode;
  /** name in English */
  label: string;
  /** name in that language */
  native: string;
  flag: string;
  /** short human hint shown to tutors */
  hi: string;
  bcp47: string;
  /** Azure neural voices: kid voice first, then friendly adult fallbacks */
  voices: { kid: string; kidLabel: string; adult: string; adultLabel: string; fallbacks: string[] };
  /** SSML prosody defaults – calm, slow, warm (low stimulation) */
  rate: string;
  pitch: string;
  showPinyin: boolean;
};

export const LANGS: LangDef[] = [
  {
    id: "en",
    label: "English",
    native: "English",
    flag: "🇬🇧",
    hi: "Hi!",
    bcp47: "en-GB",
    voices: {
      kid: "en-GB-MaisieNeural",
      kidLabel: "Maisie (child)",
      adult: "en-US-AnaNeural",
      adultLabel: "Ana (child, US)",
      fallbacks: ["en-US-JennyNeural", "en-GB-SoniaNeural"],
    },
    rate: "-8%",
    pitch: "+6%",
    showPinyin: false,
  },
  {
    id: "zh",
    label: "Chinese",
    native: "中文",
    flag: "🇨🇳",
    hi: "你好!",
    bcp47: "zh-CN",
    voices: {
      kid: "zh-CN-XiaoshuangNeural",
      kidLabel: "晓双 (child)",
      adult: "zh-CN-XiaoyiNeural",
      adultLabel: "晓伊 (young)",
      fallbacks: ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"],
    },
    rate: "-14%",
    pitch: "+5%",
    showPinyin: true,
  },
  {
    id: "fr",
    label: "French",
    native: "Français",
    flag: "🇫🇷",
    hi: "Salut !",
    bcp47: "fr-FR",
    voices: {
      kid: "fr-FR-EloiseNeural",
      kidLabel: "Eloise (child)",
      adult: "fr-FR-DeniseNeural",
      adultLabel: "Denise",
      fallbacks: ["fr-FR-HenriNeural", "fr-FR-VivienneMultilingualNeural"],
    },
    rate: "-12%",
    pitch: "+5%",
    showPinyin: false,
  },
  {
    id: "it",
    label: "Italian",
    native: "Italiano",
    flag: "🇮🇹",
    hi: "Ciao!",
    bcp47: "it-IT",
    voices: {
      kid: "it-IT-ElsaNeural",
      kidLabel: "Elsa (warm)",
      adult: "it-IT-IsabellaNeural",
      adultLabel: "Isabella",
      fallbacks: ["it-IT-DiegoNeural", "it-IT-GiuliaMultilingualNeural"],
    },
    rate: "-12%",
    pitch: "+5%",
    showPinyin: false,
  },
  {
    id: "de",
    label: "German",
    native: "Deutsch",
    flag: "🇩🇪",
    hi: "Hallo!",
    bcp47: "de-DE",
    voices: {
      kid: "de-DE-GiselaNeural",
      kidLabel: "Gisela (child)",
      adult: "de-DE-SeraphinaMultilingualNeural",
      adultLabel: "Seraphina",
      fallbacks: ["de-DE-KatjaNeural", "de-DE-MajaNeural"],
    },
    rate: "-12%",
    pitch: "+4%",
    showPinyin: false,
  },
  {
    id: "tr",
    label: "Turkish",
    native: "Türkçe",
    flag: "🇹🇷",
    hi: "Merhaba!",
    bcp47: "tr-TR",
    voices: {
      kid: "tr-TR-EmelNeural",
      kidLabel: "Emel (warm)",
      adult: "tr-TR-AhmetNeural",
      adultLabel: "Ahmet",
      fallbacks: ["tr-TR-EmelNeural"],
    },
    rate: "-12%",
    pitch: "+5%",
    showPinyin: false,
  },
];

export const LANG_MAP: Record<LangCode, LangDef> = LANGS.reduce(
  (acc, l) => ({ ...acc, [l.id]: l }),
  {} as Record<LangCode, LangDef>,
);

export const LANG_CODES: LangCode[] = LANGS.map((l) => l.id);
