"use client";

import { useMemo } from "react";
import { Category, Theme } from "./types";
import { CATEGORIES as BASE_CATEGORIES, THEMES as BASE_THEMES } from "./data";
import { InstalledPack, usePacks } from "./customPack";

/**
 * The catalogue the app actually shows: the built-in library plus every pack the
 * tutor installed from pasted AI JSON.
 *
 * A pack whose `category.id` matches a built-in category (for example "nature")
 * is merged into that category instead of adding a look-alike — that is how
 * "extend an existing topic area" works from the JSON screen.
 */
export interface Catalogue {
  categories: Category[];
  themes: Theme[];
  words: number;
  customThemeIds: Set<string>;
}

export function mergeCatalogue(packs: InstalledPack[]): Catalogue {
  const categories: Category[] = BASE_CATEGORIES.map((c) => ({ ...c }));
  const themes: Theme[] = [...BASE_THEMES];
  const customThemeIds = new Set<string>();

  for (const pack of packs) {
    const existing = categories.find((c) => c.id === pack.category.id);
    if (!existing) categories.push({ ...pack.category });

    for (const theme of pack.themes) {
      if (themes.some((t) => t.id === theme.id)) continue; // a built-in theme keeps its id
      themes.push(theme);
      customThemeIds.add(theme.id);
    }
  }

  return {
    categories,
    themes,
    words: themes.reduce((sum, t) => sum + t.words.length, 0),
    customThemeIds,
  };
}

export function useCatalogue(): Catalogue {
  const packs = usePacks();
  return useMemo(() => mergeCatalogue(packs), [packs]);
}

export function themesIn(cat: Catalogue, categoryId: string): Theme[] {
  return cat.themes.filter((t) => t.category === categoryId);
}

export function themeIn(cat: Catalogue, themeId: string): Theme | undefined {
  return cat.themes.find((t) => t.id === themeId);
}

export function categoryIn(cat: Catalogue, categoryId: string): Category | undefined {
  return cat.categories.find((c) => c.id === categoryId);
}
