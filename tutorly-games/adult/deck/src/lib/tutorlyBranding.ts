import { useEffect, useState } from "react";

/*
 * The Adult Dashboard's splash settings, read from the same origin's storage.
 *
 * This is the contract `GameShell.tsx` already implements for Edupoly, HotSeat, Ladder
 * and Werewolf, repeated here rather than imported: these two games are separate Vite
 * builds with no shared package, and a game that silently stopped honouring the
 * dashboard's splash settings would look like a dashboard bug, not a game one. Keep the
 * keys and the shapes below identical to `GameShell.tsx` / `readTutorlyBranding`.
 *
 *   dashboard: General Settings → Splash Screen Text / Subtext, the tutor logo, and
 *              "Enable splash screens"
 *   storage:   `app-storage` → state.tutorInfo.{splashScreenText, splashScreenSubtext,
 *              enableSplashScreens}
 *
 * Same origin as `/tutorly-games/adult/<game>/`, so a change made in the dashboard takes
 * effect on the next load of an open tab and instantly in any tab that is already open
 * (`storage`, `focus` and `visibilitychange` are all listened for).
 */
export interface TutorlyBranding {
  /** tutorInfo.splashScreenText, e.g. "Tutorly Presents" */
  text: string | null;
  /** tutorInfo.splashScreenSubtext, e.g. "Welcome to your learning journey" */
  subtext: string | null;
  /** the tutor's own logo, shown instead of the game's mark when set */
  logoUrl: string | null;
  /** tutorInfo.enableSplashScreens — off means no opening screen at all */
  enabled: boolean;
}

const EMPTY_BRANDING: TutorlyBranding = { text: null, subtext: null, logoUrl: null, enabled: true };

const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export function readTutorlyBranding(): TutorlyBranding {
  if (typeof window === "undefined") return EMPTY_BRANDING;
  try {
    const raw = window.localStorage.getItem("app-storage");
    if (!raw) return EMPTY_BRANDING;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    const tutorInfo = (parsed?.state?.tutorInfo ?? {}) as Record<string, unknown>;
    return {
      text: str(tutorInfo.splashScreenText),
      subtext: str(tutorInfo.splashScreenSubtext),
      logoUrl: str(tutorInfo.logoUrl) ?? str(parsed?.state?.logoUrl),
      enabled: tutorInfo.enableSplashScreens !== false,
    };
  } catch {
    /* Unparseable or blocked storage: the game's own defaults stand. */
    return EMPTY_BRANDING;
  }
}

/** Live view of the dashboard settings: updates the moment they are saved. */
export function useTutorlyBranding(): TutorlyBranding {
  const [branding, setBranding] = useState<TutorlyBranding>(readTutorlyBranding);
  useEffect(() => {
    const refresh = () => setBranding(readTutorlyBranding());
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "app-storage") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return branding;
}
