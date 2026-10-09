import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export interface Player { id: string; name: string; avatar: string; score: number; }
export interface Settings {
  narratorVoice: string; // voice name
  rate: number;
  bgm: boolean;
  sfx: boolean;
  level: CEFR;
  players: Player[];
  activePlayer: string;
  characterVoices: Record<string, string>;
  strictness: number;
  audience: "adult" | "kids";
  exam: boolean;
  difficulty: "arcade" | "pte" | "brutal";
}

const DEFAULT: Settings = {
  narratorVoice: "",
  rate: 1,
  bgm: true,
  sfx: true,
  level: "B1",
  players: [
    { id: "p1", name: "Player 1", avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Felix", score: 0 },
    { id: "p2", name: "Player 2", avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka", score: 0 },
  ],
  activePlayer: "p1",
  characterVoices: {},
  strictness: 0.72,
  audience: "adult",
  exam: false,
  difficulty: "arcade",
};

interface Ctx { s: Settings; set: (p: Partial<Settings>) => void; addScore: (id: string, n: number) => void; }
const C = createContext<Ctx>({ s: DEFAULT, set: () => {}, addScore: () => {} });

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Settings>(() => {
    try { const raw = localStorage.getItem("speedreader.settings"); if (raw) return { ...DEFAULT, ...JSON.parse(raw) }; } catch {}
    return DEFAULT;
  });
  useEffect(() => { localStorage.setItem("speedreader.settings", JSON.stringify(s)); }, [s]);
  const v = useMemo<Ctx>(() => ({
    s,
    set: (p) => setS((o) => ({ ...o, ...p })),
    addScore: (id, n) => setS((o) => ({ ...o, players: o.players.map((pl) => pl.id === id ? { ...pl, score: pl.score + n } : pl) })),
  }), [s]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export const useStore = () => useContext(C);

export const load = <T,>(k: string, d: T): T => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch { return d; } };
export const save = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
