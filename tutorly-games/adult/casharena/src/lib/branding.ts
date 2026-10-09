/**
 * The arena's identity, and the reader for the tutor's own splash wording.
 *
 * This file is deliberately NOT a client module: `layout.tsx` (a server
 * component) imports `GAME` for the page title, and a `"use client"` import there
 * would turn the whole thing into a client boundary. Nothing in here touches the
 * DOM at import time — `readTutorlyBranding` only reads `localStorage` when it is
 * called, which always happens in a browser.
 */

/** The one place this game's name lives. The hub tile uses the same strings. */
export const GAME = {
  /** Short name, used in the lockup and the nav. */
  name: "Cash Arena",
  /** Brand prefix — matches Tutorly Edupoly / Tutorly HotSeat / Tutorly Lingo. */
  brand: "Tutorly",
  /** Full lockup. */
  fullName: "Tutorly Cash Arena",
  emoji: "💸",
  tagline:
    "The live multiplayer quiz arena: every correct answer pays cash, the shop multiplies it, power-up cards drop mid-game and the leaderboard never sits still.",
  /** Short line for the hub tile and the page description. */
  blurb: "Live multiplayer quiz arena — answer for cash, buy upgrades, drop power-ups and race a real-time leaderboard.",
  accent: "#f5c542",
} as const;

/**
 * The branding the Adult Dashboard writes, read here.
 *
 * `localStorage['app-storage']` is written by the Adult Dashboard
 * (General Settings → Splash Screen, and Settings → App). Every game is served
 * from the same origin, so this is the same key the shared `GameShell.tsx` in
 * `tutorly-games/adult/*` reads: set it once in the dashboard and every game's
 * first page follows. Field names and the `enableSplashScreens !== false`
 * default are kept identical on purpose.
 */
export interface TutorlyBranding {
  /** tutorInfo.splashScreenText, e.g. "Tutorly Presents" */
  text: string | null;
  /** tutorInfo.splashScreenSubtext, e.g. "Welcome to your learning journey" */
  subtext: string | null;
  /** the tutor's logo — replaces the 🎓 mark when set */
  logoUrl: string | null;
  /** tutorInfo.enableSplashScreens — off hides the personalised band */
  enabled: boolean;
}

export const EMPTY_BRANDING: TutorlyBranding = { text: null, subtext: null, logoUrl: null, enabled: true };

export function readTutorlyBranding(): TutorlyBranding {
  if (typeof window === "undefined") return EMPTY_BRANDING;
  try {
    const raw = window.localStorage.getItem("app-storage");
    if (!raw) return EMPTY_BRANDING;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    const tutorInfo = (parsed?.state?.tutorInfo ?? {}) as Record<string, unknown>;
    const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
    return {
      text: str(tutorInfo.splashScreenText),
      subtext: str(tutorInfo.splashScreenSubtext),
      logoUrl: str(tutorInfo.logoUrl) ?? str(parsed?.state?.logoUrl),
      enabled: tutorInfo.enableSplashScreens !== false,
    };
  } catch {
    return EMPTY_BRANDING;
  }
}

/** `?splash=1` (or the nav's "First page" button) brings the splash back. */
export const SPLASH_SEEN_KEY = "tutorly:casharena:splash-seen";

export function showSplashAgain(): void {
  try {
    window.localStorage.removeItem(SPLASH_SEEN_KEY);
  } catch {
    /* nothing to forget */
  }
}
