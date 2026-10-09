"use client";

import { useEffect, useState } from "react";

/**
 * Hash navigation.
 *
 * BiliBuddies is exported as static files, so a real `/studio?theme=self` route
 * would need a server rewrite — and a theme the tutor installs from pasted JSON
 * can never be pre-rendered at build time. One hash keeps every screen reachable,
 * deep-linkable and refreshable from a plain folder:
 *
 *   #/                      home (languages, children, themes)
 *   #/studio?theme=self&sub=body&mode=learn   the studio
 *   #/pack                  AI prompt + paste JSON (add themes, or a lesson plan)
 *   #/voices                read-aloud voice test
 *   #/lesson?set=self-body  the timed lesson plan for a word set
 */

export type Screen =
  | { name: "home" }
  | { name: "studio"; theme?: string; sub?: string; mode?: string }
  | { name: "pack" }
  | { name: "voices" }
  | { name: "lesson"; set?: string };

export function parseHash(hash: string): Screen {
  const clean = hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  const [head, query] = clean.split("?");
  const params = new URLSearchParams(query ?? "");
  const head0 = head.split("/")[0];
  if (head0 === "studio") {
    return {
      name: "studio",
      theme: params.get("theme") ?? undefined,
      sub: params.get("sub") ?? undefined,
      mode: params.get("mode") ?? undefined,
    };
  }
  if (head0 === "pack") return { name: "pack" };
  if (head0 === "voices") return { name: "voices" };
  if (head0 === "lesson") return { name: "lesson", set: params.get("set") ?? undefined };
  return { name: "home" };
}

export const href = {
  home: "#/",
  studio: (theme?: string, sub?: string, mode?: string) => {
    const p = new URLSearchParams();
    if (theme) p.set("theme", theme);
    if (sub) p.set("sub", sub);
    if (mode) p.set("mode", mode);
    const q = p.toString();
    return `#/studio${q ? `?${q}` : ""}`;
  },
  pack: "#/pack",
  voices: "#/voices",
  lesson: (setId?: string) => (setId ? `#/lesson?set=${encodeURIComponent(setId)}` : "#/lesson"),
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
