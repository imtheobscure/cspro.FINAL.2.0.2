/**
 * Learner + app preferences (Zustand).
 *
 * The learner profile collected on the setup screen is not decoration: it is
 * exactly what the AI prompt sends, so every activity, example and feedback line
 * comes back personalised. Light theme is the Tutorly default (the same default
 * as the dashboard and every other game in the hub).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LearnerProfile } from "../types";

export type Theme = "light" | "dark";

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const AVATARS = ["🎬", "🍿", "🎧", "🦉", "🐙", "🚀", "🧑‍🎓", "🦊", "🐼", "🦄", "🧠", "🌟"];

export const L1_OPTIONS: { code: string; label: string }[] = [
  { code: "fa", label: "Persian (Farsi)" },
  { code: "ar", label: "Arabic" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "tr", label: "Turkish" },
  { code: "ru", label: "Russian" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "it", label: "Italian" },
  { code: "hi", label: "Hindi" },
  { code: "vi", label: "Vietnamese" },
  { code: "th", label: "Thai" },
  { code: "pl", label: "Polish" },
];

interface ProfileState {
  name: string;
  avatar: string;
  level: string;
  nativeLanguage: string;
  goals: string;
  interests: string;
  facts: string;
  /** Set once the learner has been through the setup screen. */
  ready: boolean;

  /**
   * Catalog credentials. This app is a static, browser-only build, so there is no
   * server to hold an API key — the operator pastes theirs into Settings and it
   * stays in this browser's localStorage. TMDB unlocks search of every movie and
   * TV series plus cast/ratings/official destinations; OMDb adds IMDb numbers.
   * The open catalogs (Internet Archive, Wikimedia Commons) need no key at all.
   *
   * A deployment can also pre-fill these from VITE_TMDB_API_KEY
   * / VITE_CATALOG_REGION (see .env.local). Vite inlines VITE_* values into the
   * shipped JavaScript, so a pre-filled key is public — fine for a free, rate-*
   * limited TMDB key, wrong for anything that costs money. A value already in
   * localStorage always wins, so a learner can override the default.
   */
  tmdbKey: string;
  /** YouTube Data API v3 key — search needs it; Dailymotion needs nothing. */
  youtubeKey: string;
  /** Vimeo personal access token — optional. */
  vimeoKey: string;
  /** ISO-3166-1 region whose streaming availability to show. */
  catalogRegion: string;

  theme: Theme;
  preferEngine: "auto" | "shaka" | "hlsjs" | "native";
  autoPlay: boolean;
  animations: boolean;
  /** Studio mode keeps the engine log + lesson diagnostics visible. */
  studio: boolean;
  showSplash: boolean;

  setProfile: (patch: Partial<Omit<ProfileState, "setProfile" | "setTheme" | "toggleTheme" | "setPreference" | "learner" | "reset">>) => void;
  setPreference: (patch: Partial<Pick<ProfileState, "preferEngine" | "autoPlay" | "animations" | "studio" | "showSplash">>) => void;
  setCatalogKeys: (patch: Partial<Pick<ProfileState, "tmdbKey" | "youtubeKey" | "vimeoKey" | "catalogRegion">>) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  learner: () => LearnerProfile;
  reset: () => void;
}

const DEFAULTS = {
  name: "",
  avatar: "🎬",
  level: "B1",
  nativeLanguage: "fa",
  goals: "",
  interests: "",
  facts: "",
  ready: false,
  // Vite exposes only VITE_-prefixed vars to the client, and inlines them at
  // build time — see .env.local for the trade-off.
  tmdbKey: (import.meta.env.VITE_TMDB_API_KEY as string | undefined)?.trim() ?? "",
  youtubeKey: (import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined)?.trim() ?? "",
  vimeoKey: (import.meta.env.VITE_VIMEO_ACCESS_TOKEN as string | undefined)?.trim() ?? "",
  catalogRegion: ((import.meta.env.VITE_CATALOG_REGION as string | undefined)?.trim() || "US").toUpperCase(),
  theme: "light" as Theme,
  preferEngine: "auto" as const,
  autoPlay: false,
  animations: true,
  studio: false,
  showSplash: true,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      setProfile: (patch) => set({ ...patch, ready: true }),
      setPreference: (patch) => set(patch),
      setCatalogKeys: (patch) => set(patch),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),

      learner: () => {
        const state = get();
        return {
          name: state.name,
          level: state.level,
          nativeLanguage: state.nativeLanguage,
          goals: state.goals,
          interests: state.interests,
          facts: state.facts,
        };
      },

      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "tutoflix-profile",
      version: 1,
      /*
       * A key pasted in the 🔑 panel must always win, but a *blank* stored value must
       * not mask the build-time default. Without this merge, anyone who opened the app
       * once before a VITE_* key existed keeps an empty string in localStorage forever
       * and the new env key looks broken.
       */
      merge: (persisted, current) => {
        const merged: ProfileState = { ...current, ...((persisted ?? {}) as Partial<ProfileState>) };
        for (const field of ["tmdbKey", "youtubeKey", "vimeoKey"] as const) {
          if (!merged[field]?.trim()) merged[field] = current[field];
        }
        return merged;
      },
    },
  ),
);

export function displayName(state: Pick<ProfileState, "name" | "avatar">): string {
  return `${state.avatar} ${state.name || "Learner"}`;
}
