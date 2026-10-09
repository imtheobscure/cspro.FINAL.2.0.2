/**
 * Deep links into the References hub.
 *
 * A lesson exercise, a wrong answer or a Home unit all point at the entry that
 * explains the item they just practised, so "where can I read about this?"
 * is always one tap away. The link carries the tab plus the exact key to land
 * on; the receiving view scrolls to it and flashes it.
 */
"use client";

import { useEffect } from "react";

export type RefTab = "vocabulary" | "grammar" | "dialogues" | "idioms";

export const REF_TABS: RefTab[] = ["vocabulary", "grammar", "dialogues", "idioms"];

export const REF_TAB_LABEL: Record<RefTab, string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  dialogues: "Dialogues",
  idioms: "Idioms",
};

export const REF_TAB_ICON: Record<RefTab, string> = {
  vocabulary: "📚",
  grammar: "📝",
  dialogues: "💬",
  idioms: "🎭",
};

export function isRefTab(v: string | null | undefined): v is RefTab {
  return !!v && (REF_TABS as string[]).includes(v);
}

/** `/references?tab=grammar&focus=Present%20Simple` */
export function refHref(tab: RefTab, key?: string): string {
  const base = `/references?tab=${tab}`;
  return key && key.trim() ? `${base}&focus=${encodeURIComponent(key.trim())}` : base;
}

/** Stable anchor id for an entry, used by the scroll helper. */
export function refAnchor(tab: RefTab, key: string | number): string {
  return `ref-${tab}-${String(key).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}`;
}

/**
 * Scroll to, and briefly flash, the entry a deep link asked for.
 * Runs after the view has rendered its (possibly filtered) list.
 */
export function useFocusScroll(focus: string | undefined, ready: boolean, delay = 320) {
  useEffect(() => {
    if (!focus || !ready) return;
    const needle = focus.trim().toLowerCase();
    if (!needle) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    const attempt = () => {
      const all = Array.from(document.querySelectorAll<HTMLElement>("[data-ref]"));
      const target = all.find((el) => {
        const value = (el.dataset.ref || "").trim().toLowerCase();
        return value === needle || (needle.length > 3 && value.includes(needle));
      });
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("ref-flash");
        window.setTimeout(() => target.classList.remove("ref-flash"), 2800);
        return;
      }
      if (tries++ < 6) timer = setTimeout(attempt, 220);
    };

    timer = setTimeout(attempt, delay);
    return () => clearTimeout(timer);
  }, [focus, ready, delay]);
}
