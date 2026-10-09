/**
 * The theme switch.
 *
 * The whole app is themed by one attribute on `<html>`. `index.css` holds two token
 * blocks — light on `:root`, dark on `[data-theme="dark"]` — and every surface in the
 * app reads a role from them, so switching is a single attribute write rather than a
 * second set of classes. This module owns that attribute.
 *
 * Three decisions worth stating:
 *
 *  1. **Light is the default, not the OS preference.** This runs on a projector in a lit
 *     classroom, where a near-black screen is the wrong answer even if the laptop runs
 *     dark. Dark is one tap away and remembered, but it is never assumed.
 *  2. **The stored choice is applied before React mounts** (see the inline script in
 *     `index.html`, which reads the same key). React would otherwise render a light tree
 *     first and repaint, which is a visible flash on every load.
 *  3. **Storage failure is not an error.** Private-mode Safari throws on `localStorage`;
 *     a learner in that mode should still get a working toggle that lasts the session.
 */

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** Exported because `index.html`'s boot script has to read the same key. */
export const THEME_STORAGE_KEY = "deck.theme.v1";
/**
 * The key this game used before it was named Deck.
 *
 * Read-only, and only so a learner who already chose dark does not get a light flash on
 * their next visit. Renaming a game must not reset a saved preference.
 */
export const LEGACY_THEME_STORAGE_KEY = "linguaquest3d.theme.v1";

export const DEFAULT_THEME: Theme = "light";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** The stored choice, or the default when there is none or it is unreadable. */
export function readStoredTheme(): Theme {
  try {
    const stored =
      window.localStorage.getItem(THEME_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Writes the attribute the stylesheet keys off. Idempotent. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Non-fatal: the toggle still works for this session.
  }
}

/** Persist and apply in one step — the only writer, so the two cannot drift. */
export function setTheme(theme: Theme): void {
  storeTheme(theme);
  applyTheme(theme);
}

/**
 * Bring the document in line with what was saved.
 *
 * Called once from `main.tsx`. It exists as well as the inline boot script so the
 * attribute is correct even if the script was stripped by a build step or the page was
 * mounted into a host that pre-set `<html>`.
 */
export function syncThemeFromStorage(): Theme {
  const theme = readStoredTheme();
  applyTheme(theme);
  return theme;
}

/**
 * The learner's theme, as React state.
 *
 * The initial value is read from storage during the first render rather than in an
 * effect, so the toggle's label is right on the opening frame instead of flipping once
 * the component has already painted.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => (typeof document === "undefined" ? DEFAULT_THEME : readStoredTheme()));

  // Another tab may change it; a stale toggle would then offer the wrong action.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = isTheme(event.newValue) ? event.newValue : DEFAULT_THEME;
      applyTheme(next);
      setThemeState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((next: Theme) => {
    setTheme(next);
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      setTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme: update, toggle };
}
