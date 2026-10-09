import { Category, Theme, Word, tt } from "../types";
import { part1 } from "./part1";
import { part2 } from "./part2";
import { part3 } from "./part3";
import { part4 } from "./part4";
import { extrasSelfHome } from "./extrasSelfHome";
import { extrasSchoolCommunity } from "./extrasSchoolCommunity";
import { extrasNatureFun } from "./extrasNatureFun";

export const CATEGORIES: Category[] = [
  {
    id: "self",
    emoji: "🧒",
    color: "#FFD6A5",
    title: tt("Self & Family", "我和家人", "Moi et ma famille", "Io e la famiglia", "Ich und meine Familie", "Ben ve Ailem"),
  },
  {
    id: "home",
    emoji: "🏠",
    color: "#CDEAC0",
    title: tt("Home & Daily Life", "家和日常", "La maison et le quotidien", "Casa e vita quotidiana", "Zuhause und Alltag", "Ev ve Günlük Hayat"),
  },
  {
    id: "school",
    emoji: "🏫",
    color: "#BDE0FE",
    title: tt("School & Learning", "学校和学习", "L'école", "La scuola", "Schule und Lernen", "Okul ve Öğrenme"),
  },
  {
    id: "community",
    emoji: "🏙️",
    color: "#E2D5F8",
    title: tt("Neighborhood & Community", "我的社区", "Mon quartier", "Il mio quartiere", "Meine Nachbarschaft", "Mahallem"),
  },
  {
    id: "nature",
    emoji: "🌿",
    color: "#B9F0E1",
    title: tt("Animals & Nature", "动物和自然", "Animaux et nature", "Animali e natura", "Tiere und Natur", "Hayvanlar ve Doğa"),
  },
  {
    id: "fun",
    emoji: "🎉",
    color: "#FFC8DD",
    title: tt("Celebrations & Leisure", "节日和娱乐", "Fêtes et loisirs", "Feste e tempo libero", "Feste und Freizeit", "Kutlamalar ve Eğlence"),
  },
];

/** Extra words per theme id — looked up below and appended to the theme. */
const EXTRA_WORDS: Record<string, Word[]> = {
  ...extrasSelfHome,
  ...extrasSchoolCommunity,
  ...extrasNatureFun,
};

const BASE_THEMES: Theme[] = [...part1, ...part2, ...part3, ...part4];

/**
 * The built-in catalogue: every theme, with its extra words appended and each
 * list de-duplicated by word id, so a word added to `extras*` twice (or already
 * present in the theme file) can never show up twice on a card.
 */
export const THEMES: Theme[] = BASE_THEMES.map((theme) => {
  const extra = EXTRA_WORDS[theme.id];
  if (!extra?.length) return theme;
  const seen = new Set(theme.words.map((word) => word.id));
  const merged = [...theme.words];
  for (const word of extra) {
    if (seen.has(word.id)) continue;
    seen.add(word.id);
    merged.push(word);
  }
  return { ...theme, words: merged };
});

export const BUILT_IN_WORD_COUNT = THEMES.reduce((sum, t) => sum + t.words.length, 0);

export function getTheme(id: string): Theme | undefined {
  return THEMES.find((t) => t.id === id);
}

export function themesByCategory(cat: string): Theme[] {
  return THEMES.filter((t) => t.category === cat);
}

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
