import { useCallback, useEffect, useState } from "react";

/**
 * The theme, as one attribute on `<html>`.
 *
 * Light is the default and it is set *statically* in `index.html`, before any JavaScript
 * runs, so the first paint is already correct — there is no flash of the wrong theme and no
 * default to get wrong. This module only owns the choice and the toggle.
 *
 * The reason it is an attribute rather than a React context full of colours: `index.css`
 * declares the same semantic roles twice, once per theme, and every surface in the app reads
 * a *role* ("the page", "a raised panel", "the ink for meta text") rather than a colour. A
 * theme switch is then a single DOM write that 1,600 lines of JSX already respond to, which
 * is why adding light did not mean auditing every component.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "flexcards_theme";

/**
 * The inline script in `index.html` reads the same key.
 *
 * Duplicating the string is deliberate: importing a constant into a synchronous inline
 * script is not possible, and the alternative — a flash of the default theme for anyone who
 * chose dark — is worse than one shared literal.
 */
export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); a wrong guess is harmless.
    return null;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* nothing to do */
  }
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  /*
   * Seeded from what is already on the document rather than from storage, so the hook agrees
   * with the boot script instead of second-guessing it.
   */
  const [theme, setTheme] = useState<Theme>(() => {
    const current = typeof document !== "undefined" ? document.documentElement.dataset.theme : null;
    if (current === "dark" || current === "light") return current;
    return readStoredTheme() ?? "light";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((previous) => {
      const next: Theme = previous === "dark" ? "light" : "dark";
      storeTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
