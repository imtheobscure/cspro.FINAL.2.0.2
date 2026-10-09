"use client";

import { useEffect, useState } from "react";
import { ACTIVITIES, Activity } from "./types";

/**
 * Hash navigation.
 *
 * The game is exported as static files, so path routes (`/theme/kittens`) would
 * need a server rewrite for every theme — and a category the tutor installs from
 * pasted JSON can never be pre-rendered at build time. A hash keeps every screen
 * reachable, deep-linkable and refreshable from a plain folder:
 *
 *   #/                     home
 *   #/theme/<id>           the topic menu
 *   #/theme/<id>/<act>     one activity
 *   #/pack                 AI prompt + paste JSON (add a topic, or a lesson plan)
 *   #/voices               read-aloud voice test
 *   #/lesson               the timed lesson plan for a topic
 */

export type Screen =
  | { name: "home" }
  | { name: "theme"; themeId: string }
  | { name: "activity"; themeId: string; activity: Activity }
  | { name: "pack" }
  | { name: "voices" }
  | { name: "lesson"; themeId?: string };

export function parseHash(hash: string): Screen {
  const clean = hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  if (!clean) return { name: "home" };
  const [head, second, third] = clean.split("/");
  if (head === "pack") return { name: "pack" };
  if (head === "voices") return { name: "voices" };
  if (head === "lesson") return { name: "lesson", themeId: second };
  if (head === "theme" && second) {
    if (third && (ACTIVITIES as string[]).includes(third)) {
      return { name: "activity", themeId: second, activity: third as Activity };
    }
    return { name: "theme", themeId: second };
  }
  return { name: "home" };
}

export const href = {
  home: "#/",
  theme: (themeId: string) => `#/theme/${themeId}`,
  activity: (themeId: string, activity: Activity) => `#/theme/${themeId}/${activity}`,
  pack: "#/pack",
  voices: "#/voices",
  lesson: (themeId?: string) => (themeId ? `#/lesson/${themeId}` : "#/lesson"),
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
