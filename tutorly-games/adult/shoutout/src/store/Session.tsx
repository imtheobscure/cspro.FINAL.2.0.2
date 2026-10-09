import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { EmojiCategory, EmojiItem, Settings, Team, WaveResult } from '../lib/types';
import { EMOJI_CATEGORIES, TEAM_PRESETS } from '../data/decks';
import { DEFAULT_SETTINGS } from '../lib/pacing';
import { audio } from '../lib/audio';

/**
 * The session store.
 *
 * Everything a ShoutOut session is made of lives here: the room settings, the
 * teams, the wave results and the tutor's own words. It is *this* app's storage
 * (`so.` keys) — the two games are served from the same origin, so a shared key
 * would mean a TalkArena class opening with ShoutOut's teams in it.
 */
const KEY = {
  settings: 'so.settings',
  teams: 'so.teams',
  custom: 'so.custom',
  best: 'so.best',
} as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — nothing here is worth failing a lesson over */
  }
}

/** The tutor's own words are a category like any other, so the engine needs no special case. */
export const MY_WORDS_ID = 'mine';

interface Ctx {
  settings: Settings;
  update: (s: Partial<Settings>) => void;
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  /** The deck the room may draw from: every category plus the tutor's own words. */
  categories: EmojiCategory[];
  /** Categories the room actually draws from, in deck order. */
  enabled: EmojiCategory[];
  custom: EmojiItem[];
  addCustom: (items: EmojiItem[]) => void;
  removeCustom: (name: string) => void;
  scores: Record<string, number>;
  award: (teamId: string, pts: number) => void;
  results: WaveResult[];
  pushWave: (r: WaveResult) => void;
  resetSession: () => void;
  /** Whose wave it is: solo keeps one score, teams rotate one team per wave. */
  teamForWave: (wave: number) => Team;
  best: number;
  recordBest: (total: number) => boolean;
  total: number;
}

const C = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(KEY.settings, {}) }));
  const [teams, setTeams] = useState<Team[]>(() => load(KEY.teams, TEAM_PRESETS.slice(0, 2)));
  const [custom, setCustom] = useState<EmojiItem[]>(() => load(KEY.custom, [] as EmojiItem[]));
  const [scores, setScores] = useState<Record<string, number>>({});
  const [results, setResults] = useState<WaveResult[]>([]);
  const [best, setBest] = useState<number>(() => load(KEY.best, 0));

  const categories = useMemo<EmojiCategory[]>(
    () => (custom.length ? [...EMOJI_CATEGORIES, { id: MY_WORDS_ID, name: 'My words', icon: '⭐', items: custom }] : EMOJI_CATEGORIES),
    [custom],
  );

  // The deck is the default mix; a tutor who switches categories off keeps that choice.
  const enabled = useMemo(() => {
    const ids = settings.categoryIds.length ? settings.categoryIds : categories.map((c) => c.id);
    const picked = categories.filter((c) => ids.includes(c.id));
    return picked.length ? picked : categories;
  }, [categories, settings.categoryIds]);

  useEffect(() => save(KEY.settings, settings), [settings]);
  useEffect(() => save(KEY.teams, teams), [teams]);
  useEffect(() => save(KEY.custom, custom), [custom]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * settings.fontScale}px`;
  }, [settings.fontScale]);

  useEffect(() => {
    audio.toggleMusic(settings.music);
    audio.toggleSfx(settings.sfx);
    audio.setMusicVol(settings.musicVol);
    audio.setSfxVol(settings.sfxVol);
  }, [settings.music, settings.sfx, settings.musicVol, settings.sfxVol]);

  const update = useCallback((s: Partial<Settings>) => setSettings((p) => ({ ...p, ...s })), []);

  const award = useCallback((teamId: string, pts: number) => {
    setScores((s) => ({ ...s, [teamId]: (s[teamId] ?? 0) + pts }));
  }, []);

  const teamForWave = useCallback(
    (wave: number) => {
      if (settings.mode === 'solo' || teams.length < 2) return teams[0] ?? TEAM_PRESETS[0];
      return teams[(wave - 1) % teams.length] ?? teams[0];
    },
    [settings.mode, teams],
  );

  const pushWave = useCallback((r: WaveResult) => setResults((cur) => [...cur, r]), []);

  const total = useMemo(() => Object.values(scores).reduce((a, b) => a + b, 0), [scores]);

  const recordBest = useCallback(
    (sum: number) => {
      if (sum <= best) return false;
      setBest(sum);
      save(KEY.best, sum);
      return true;
    },
    [best],
  );

  const value = useMemo<Ctx>(
    () => ({
      settings,
      update,
      teams,
      setTeams,
      categories,
      enabled,
      custom,
      addCustom: (items) => setCustom((cur) => {
        const seen = new Set(cur.map((i) => i.name.toLowerCase()));
        return [...cur, ...items.filter((i) => i.name && !seen.has(i.name.toLowerCase()))];
      }),
      removeCustom: (name) => setCustom((cur) => cur.filter((i) => i.name !== name)),
      scores,
      award,
      results,
      pushWave,
      resetSession: () => {
        setScores({});
        setResults([]);
      },
      teamForWave,
      best,
      recordBest,
      total,
    }),
    [settings, update, teams, categories, enabled, custom, scores, award, results, pushWave, teamForWave, best, recordBest, total],
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useSession() {
  const v = useContext(C);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
