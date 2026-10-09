/**
 * Accessibility plumbing.
 *
 * Three things this app was missing, in the order they matter to someone who cannot use
 * a mouse:
 *
 *  1. **Focus that stays put.** The overlays (review sheet, cheat drawer, projector)
 *     render over the stage, but focus stayed on the page underneath — so Tab walked
 *     invisibly into content the overlay was covering, and Escape did nothing. A focus
 *     trap fixes that and restores focus to whatever opened the dialog.
 *  2. **Keyboard control.** A flashcard game is the ideal case for shortcuts: space to
 *     flip, 1–3 to grade. Without them, the core loop needs a pointer for every card.
 *  3. **A running commentary.** Every result on this screen is conveyed by colour and
 *     motion, which is invisible to a screen reader. One polite live region announces
 *     the outcome in words.
 */

import { useEffect, useRef, useState } from "react";

/** Everything focusable, in DOM order. Kept as one selector so it is easy to audit. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // `offsetParent` is null for anything display:none, which must not receive focus.
    (element) => element.offsetParent !== null || element === document.activeElement
  );
}

/**
 * Contains Tab within `ref` while `active`, and returns focus where it came from.
 *
 * The restore step is the half that is usually forgotten and the half users notice: an
 * overlay that closes into nowhere leaves a keyboard user at the top of the document
 * with no idea what happened.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, onEscape?: () => void) {
  const ref = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Defer so the overlay has mounted before focus is moved into it.
    const raf = requestAnimationFrame(() => {
      const container = ref.current;
      if (!container) return;
      const first = focusableWithin(container)[0] ?? container;
      first.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onEscape) {
        event.stopPropagation();
        onEscape();
        return;
      }
      if (event.key !== "Tab") return;
      const container = ref.current;
      if (!container) return;
      const items = focusableWithin(container);
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;

      // Wrap in both directions, including when focus has escaped the container.
      if (event.shiftKey && (current === first || !container.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, [active, onEscape]);

  return ref;
}

export type ShortcutMap = Record<string, (event: KeyboardEvent) => void>;

/**
 * Binds single-key shortcuts, with the guards that are always needed and never written.
 *
 * Ignored entirely while the user is typing in a field, while a modifier is held (so it
 * cannot shadow browser shortcuts), when the key repeats from being held down, and when
 * an overlay is open — otherwise pressing space in the JSON editor would flip a card
 * behind it.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  // Kept in a ref so rebinding does not require re-registering the listener per render.
  const handlers = useRef(shortcuts);
  handlers.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;
      const handler = handlers.current[event.key] ?? handlers.current[event.key.toLowerCase()];
      if (!handler) return;
      event.preventDefault();
      handler(event);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

/**
 * Announces a message to assistive technology.
 *
 * The text is cleared after the announcement window: a live region that keeps its last
 * value will not re-announce the same string, so "Correct" twice in a row would be
 * silent the second time.
 */
export function useAnnouncer() {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = (text: string, clearAfterMs = 1400) => {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), clearAfterMs);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { message, announce };
}

/**
 * The live region itself.
 *
 * `polite` rather than `assertive`: an interruption mid-word is worse than a delay, and
 * this region fires on every single card.
 */
export function LiveRegion({ message }: { message: string }) {
  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  );
}
