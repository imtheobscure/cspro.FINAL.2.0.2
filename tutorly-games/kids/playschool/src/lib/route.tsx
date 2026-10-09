"use client";

import { useEffect, useState } from "react";

/**
 * Hash navigation.
 *
 * LearnLoop is exported as static files, so path routes (`/play`, `/teacher`)
 * would need a server rewrite — and a theme the tutor installs from pasted JSON
 * can never be pre-rendered at build time. A hash keeps every screen reachable,
 * deep-linkable and refreshable from a plain folder:
 *
 *   #/              landing (what the game is, every theme, the 11 modes)
 *   #/play          the game board (tutor dock + stage)
 *   #/teacher       learners, plans, results, dictionary coverage
 *   #/pack          AI prompt + paste JSON (add themes/words)
 *   #/voices        read-aloud voice test
 */

export type Screen =
  | { name: "home" }
  | { name: "play" }
  | { name: "teacher" }
  | { name: "pack" }
  | { name: "voices" };

export function parseHash(hash: string): Screen {
  const clean = hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  const head = clean.split("/")[0];
  if (head === "play") return { name: "play" };
  if (head === "teacher") return { name: "teacher" };
  if (head === "pack") return { name: "pack" };
  if (head === "voices") return { name: "voices" };
  return { name: "home" };
}

export const href = {
  home: "#/",
  play: "#/play",
  teacher: "#/teacher",
  pack: "#/pack",
  voices: "#/voices",
};

export function navigate(to: string) {
  if (typeof window === "undefined") return;
  window.location.hash = to.startsWith("#") ? to.slice(1) : to;
}

export function useRoute(): Screen {
  const [screen, setScreen] = useState<Screen>(() =>
    parseHash(typeof window === "undefined" ? "" : window.location.hash),
  );
  useEffect(() => {
    const onChange = () => setScreen(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return screen;
}
