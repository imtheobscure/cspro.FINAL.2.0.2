import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { LogEntry, Pack, Player, Team } from '../lib/types';
import { QUESTIONS } from '../data/questions';
import { DEBATES } from '../data/debate';
import { EMOJI_CATEGORIES, PICTIONARY_DECK, TEAM_PRESETS } from '../data/decks';
import { audio } from '../lib/audio';

export const DEFAULT_PACK: Pack = {
  meta: { title: 'Everyday English — Core Pack', level: 'B1', topic: 'Work, city life & real conversations', author: 'TalkArena' },
  questions: QUESTIONS,
  debates: DEBATES,
  emojiCategories: EMOJI_CATEGORIES,
  pictionary: PICTIONARY_DECK,
};

export interface Settings {
  narrator: string;
  rate: number;
  fontScale: number;
  music: boolean;
  sfx: boolean;
  musicVol: number;
  sfxVol: number;
  cast: Record<string, string>;
  timerSec: number;
  autoNarrate: boolean;
  /** Show the title card at launch. Unticking it on the card itself hides it. */
  splash: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  narrator: '',
  rate: 0.95,
  fontScale: 1.08,
  music: true,
  sfx: true,
  musicVol: 0.45,
  sfxVol: 0.9,
  cast: {},
  timerSec: 45,
  autoNarrate: false,
  splash: true,
};

const DEFAULT_PLAYERS: Player[] = [
  { id: 'p1', name: 'Alex', style: 'adventurer', seed: 'Alex-91', teamId: 't1' },
  { id: 'p2', name: 'Bea', style: 'notionists', seed: 'Bea-22', teamId: 't1' },
  { id: 'p3', name: 'Cem', style: 'open-peeps', seed: 'Cem-7', teamId: 't2' },
  { id: 'p4', name: 'Dina', style: 'micah', seed: 'Dina-55', teamId: 't2' },
];

interface Ctx {
  pack: Pack;
  setPack: (p: Pack) => void;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  scores: Record<string, number>;
  award: (teamId: string | null, pts: number) => void;
  resetScores: () => void;
  log: LogEntry[];
  pushLog: (e: Omit<LogEntry, 'id' | 'at'>) => void;
  clearLog: () => void;
  settings: Settings;
  update: (s: Partial<Settings>) => void;
  talk: Record<string, number>;
  addTalk: (playerId: string, ms: number) => void;
  activeTeam: string;
  setActiveTeam: (id: string) => void;
  nextTeam: () => void;
}

const C = createContext<Ctx | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [pack, setPackState] = useState<Pack>(() => load('ta.pack', DEFAULT_PACK));
  const [players, setPlayers] = useState<Player[]>(() => load('ta.players', DEFAULT_PLAYERS));
  const [teams, setTeams] = useState<Team[]>(() => load('ta.teams', TEAM_PRESETS.slice(0, 2)));
  const [scores, setScores] = useState<Record<string, number>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...load('ta.settings', {}) }));
  const [talk, setTalk] = useState<Record<string, number>>({});
  const [activeTeam, setActiveTeam] = useState<string>(teams[0]?.id ?? 't1');

  useEffect(() => localStorage.setItem('ta.settings', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('ta.players', JSON.stringify(players)), [players]);
  useEffect(() => localStorage.setItem('ta.teams', JSON.stringify(teams)), [teams]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * settings.fontScale}px`;
  }, [settings.fontScale]);

  useEffect(() => {
    audio.toggleMusic(settings.music);
    audio.toggleSfx(settings.sfx);
    audio.setMusicVol(settings.musicVol);
    audio.setSfxVol(settings.sfxVol);
  }, [settings.music, settings.sfx, settings.musicVol, settings.sfxVol]);

  const setPack = useCallback((p: Pack) => {
    setPackState(p);
    try {
      localStorage.setItem('ta.pack', JSON.stringify(p));
    } catch {
      /* quota */
    }
  }, []);

  const award = useCallback((teamId: string | null, pts: number) => {
    if (!teamId) return;
    setScores((s) => ({ ...s, [teamId]: (s[teamId] ?? 0) + pts }));
  }, []);

  const pushLog = useCallback((e: Omit<LogEntry, 'id' | 'at'>) => {
    setLog((l) => [...l, { ...e, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() }]);
  }, []);

  const addTalk = useCallback((playerId: string, ms: number) => {
    setTalk((t) => ({ ...t, [playerId]: (t[playerId] ?? 0) + ms }));
  }, []);

  const nextTeam = useCallback(() => {
    setActiveTeam((cur) => {
      const i = teams.findIndex((t) => t.id === cur);
      return teams[(i + 1) % Math.max(1, teams.length)]?.id ?? cur;
    });
  }, [teams]);

  const value = useMemo<Ctx>(
    () => ({
      pack, setPack, players, setPlayers, teams, setTeams, scores, award,
      resetScores: () => setScores({}),
      log, pushLog, clearLog: () => setLog([]),
      settings, update: (s) => setSettings((p) => ({ ...p, ...s })),
      talk, addTalk, activeTeam, setActiveTeam, nextTeam,
    }),
    [pack, setPack, players, teams, scores, award, log, pushLog, settings, talk, addTalk, activeTeam, nextTeam],
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useGame() {
  const v = useContext(C);
  if (!v) throw new Error('useGame outside provider');
  return v;
}
