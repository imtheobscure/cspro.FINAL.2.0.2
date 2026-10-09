"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GRID_QUESTIONS, type GameKey } from "@/content/pack";
import type { Question } from "@/content/build";
import { normalisePack } from "@/content/normalise";
import { LUCK_DECK, POWER_UPS, type LuckId, type PowerId } from "@/content/cards";
import { speak, stopSpeaking } from "@/lib/speech";
import { audio } from "@/lib/audio";
import { getPack, logEvent, saveSession } from "@/lib/localApi";

export type Team = { id: string; name: string; avatar: string; score: number; streak: number; powers: PowerId[]; isTutor?: boolean };

export type Settings = {
  autoRead: boolean;
  narrator: string | null;
  music: boolean;
  musicVol: number;
  sfxVol: number;
  timer: number;
  luck: Record<string, boolean>;
  mafia: "easy" | "standard" | "brutal";
  pointerOn: boolean;
};

export type Cell = {
  cell: number;
  bonus?: { type: "luck"; id: LuckId } | { type: "power"; id: PowerId };
  done: boolean;
  correct?: boolean;
  teamId?: string;
  seconds?: number;
  points?: number;
};

export type ArenaState = {
  sessionCode: string;
  teams: Team[];
  turn: number;
  settings: Settings;
  cells: Cell[];
  roomCode: string | null;
  activeGame: GameKey;
  startedAt: number;
  packSlug: string;
  packTitle: string;
};

const KEY = "pma-state-v2";

export function defaultSettings(): Settings {
  return {
    autoRead: false,
    narrator: null,
    music: true,
    musicVol: 0.32,
    sfxVol: 0.85,
    timer: 45,
    luck: Object.fromEntries(LUCK_DECK.map((c) => [c.id, true])),
    mafia: "standard",
    pointerOn: false,
  };
}

export function buildCells(settings: Settings): Cell[] {
  const enabledLuck = LUCK_DECK.filter((c) => settings.luck[c.id]).map((c) => c.id);
  const slots = Array.from({ length: 64 }, (_, i) => i + 1);
  const shuffled = [...slots].sort(() => Math.random() - 0.5);
  const luckCells = new Map<number, LuckId>();
  enabledLuck.slice(0, 17).forEach((id, i) => { if (shuffled[i]) luckCells.set(shuffled[i], id); });
  const powerCells = new Map<number, PowerId>();
  const powerSlots = shuffled.slice(17, 17 + 11);
  [...POWER_UPS].sort(() => Math.random() - 0.5).slice(0, powerSlots.length).forEach((p, i) => powerCells.set(powerSlots[i], p.id));
  return slots.map((n) => ({
    cell: n,
    done: false,
    bonus: luckCells.has(n) ? { type: "luck" as const, id: luckCells.get(n)! }
      : powerCells.has(n) ? { type: "power" as const, id: powerCells.get(n)! } : undefined,
  }));
}

export function newSession(teams: Team[], settings = defaultSettings(), pack = { slug: "built-in", title: "Work, Travel & Modern Life" }): ArenaState {
  return {
    sessionCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
    teams, turn: 0, settings, cells: buildCells(settings), roomCode: null,
    activeGame: "grid", startedAt: Date.now(), packSlug: pack.slug, packTitle: pack.title,
  };
}

export function loadState(): ArenaState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ArenaState;
    if (!s?.teams?.length) return null;
    return s;
  } catch { return null; }
}

export function saveState(s: ArenaState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export type EventInput = {
  gameKey: string; cell?: number; questionId?: string; teamId?: string; teamName?: string;
  skill?: string; grammarPoint?: string; cefr?: string; correct?: boolean; points?: number; seconds?: number;
  detail?: Record<string, unknown>;
};

type Api = {
  s: ArenaState;
  set: (fn: (s: ArenaState) => ArenaState) => void;
  current: Team;
  leader: Team;
  addPoints: (teamId: string, pts: number) => void;
  setScore: (teamId: string, score: number) => void;
  bumpStreak: (teamId: string, correct: boolean) => void;
  nextTurn: () => void;
  setTurnTo: (teamId: string) => void;
  givePower: (teamId: string, p: PowerId) => void;
  spendPower: (teamId: string, p: PowerId) => void;
  setGame: (g: GameKey) => void;
  log: (e: EventInput) => void;
  events: EventInput[];
  say: (text: string, gender?: "m" | "f" | "n") => void;
  shutUp: () => void;
  elapsed: number;
  questions: Question[];
};

const Ctx = createContext<Api | null>(null);

export function ArenaProvider({ initial, children }: { initial: ArenaState; children: React.ReactNode }) {
  const [s, setS] = useState<ArenaState>(initial);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(initial.startedAt || Date.now());

  useEffect(() => { saveState(s); }, [s]);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const a = audio();
    if (!a) return;
    a.setMusicVolume(s.settings.musicVol);
    a.setSfxVolume(s.settings.sfxVol);
    a.setMuted(!s.settings.music);
  }, [s.settings.music, s.settings.musicVol, s.settings.sfxVol]);

  useEffect(() => {
    saveSession({ code: s.sessionCode, packSlug: s.packSlug, title: s.packTitle, teams: s.teams, state: { activeGame: s.activeGame, turn: s.turn } });
  }, [s.sessionCode, s.teams, s.activeGame, s.turn, s.packSlug, s.packTitle]);

  const set = useCallback((fn: (st: ArenaState) => ArenaState) => setS((prev) => fn(prev)), []);

  // Imported Copy-AI packs drive every question-based game; the built-in pack is the fallback.
  const [questions, setQuestions] = useState<Question[]>(GRID_QUESTIONS);
  useEffect(() => {
    if (!s.packSlug || s.packSlug === "built-in") { setQuestions(GRID_QUESTIONS); return; }
    const list = normalisePack(getPack(s.packSlug)?.pack?.data);
    if (list.length) setQuestions(list);
  }, [s.packSlug]);

  const api = useMemo<Api>(() => {
    const teams = s.teams;
    const current = teams[s.turn % Math.max(1, teams.length)] ?? teams[0];
    const leader = [...teams].sort((a, b) => b.score - a.score)[0] ?? current;
    return {
      s, set, current, leader, events, elapsed, questions,
      addPoints: (id, pts) => set((st) => ({ ...st, teams: st.teams.map((t) => (t.id === id ? { ...t, score: t.score + pts } : t)) })),
      setScore: (id, score) => set((st) => ({ ...st, teams: st.teams.map((t) => (t.id === id ? { ...t, score } : t)) })),
      bumpStreak: (id, correct) => set((st) => ({ ...st, teams: st.teams.map((t) => (t.id === id ? { ...t, streak: correct ? t.streak + 1 : 0 } : t)) })),
      nextTurn: () => set((st) => ({ ...st, turn: (st.turn + 1) % Math.max(1, st.teams.length) })),
      setTurnTo: (id) => set((st) => ({ ...st, turn: Math.max(0, st.teams.findIndex((t) => t.id === id)) })),
      givePower: (id, p) => set((st) => ({ ...st, teams: st.teams.map((t) => (t.id === id ? { ...t, powers: [...t.powers, p] } : t)) })),
      spendPower: (id, p) => set((st) => ({
        ...st,
        teams: st.teams.map((t) => {
          if (t.id !== id) return t;
          const i = t.powers.indexOf(p);
          if (i < 0) return t;
          const powers = [...t.powers]; powers.splice(i, 1);
          return { ...t, powers };
        }),
      })),
      setGame: (g) => set((st) => ({ ...st, activeGame: g })),
      log: (e) => {
        setEvents((prev) => [...prev, e]);
        logEvent({ ...e, sessionCode: s.sessionCode });
      },
      say: (text, gender) => { void speak(text, { voiceName: s.settings.narrator, gender }); },
      shutUp: () => stopSpeaking(),
    };
  }, [s, set, events, elapsed, questions]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useArena() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useArena must be used inside ArenaProvider");
  return v;
}

export const QUESTION_FOR_CELL = (cell: number) => GRID_QUESTIONS[(cell - 1) % GRID_QUESTIONS.length];
