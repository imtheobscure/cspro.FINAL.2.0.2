"use client";

import { useSyncExternalStore } from "react";
import { packVersion, subscribePacks } from "./customPack";

/**
 * Re-render a screen when a category pack or lesson plan is installed.
 *
 * Custom content is added to the live catalogue after mount (a static export
 * cannot read `localStorage` while prerendering), so the screens that count
 * words, list themes or list lessons have to be told when that happened. The
 * value itself is only a counter — reading it is what subscribes.
 */
export function usePacksVersion(): number {
  return useSyncExternalStore(subscribePacks, packVersion, () => 0);
}
