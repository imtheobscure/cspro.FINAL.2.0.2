import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query.
 *
 * Layout decisions that can't be expressed in a class name still have to agree
 * with the CSS breakpoints, so the query string is passed straight through
 * rather than being wrapped in a named set of sizes — the caller keeps using the
 * same `max-width` it would have written in a `sm:` variant.
 *
 * Starts as `false` and corrects on mount. That is deliberate: the app renders
 * on the server-less path first, and assuming "small screen" would flip a
 * desktop user's first paint to the phone layout for one frame.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);

    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/**
 * True when the viewport is too small for a card that is positioned next to the
 * thing it points at.
 *
 * Both clauses matter. A phone in **portrait** is narrow (≤639px, the `sm`
 * breakpoint), and a phone in **landscape** is short (≤520px tall) while being
 * wide — 844px, which passes any width-only test. Keying on width alone left
 * landscape phones on the desktop layout, where the per-step offsets ran the
 * card off the top or bottom of a 390px-tall screen.
 */
export function useIsCompactViewport(): boolean {
  return useMediaQuery('(max-width: 639px), (max-height: 520px)');
}
