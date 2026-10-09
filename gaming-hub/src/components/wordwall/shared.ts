import type { WordwallModeId, WordwallPayload, WordwallItem } from "../../data/wordwallModes";

export interface ArenaProps {
  modeId: WordwallModeId;
  payload: WordwallPayload;
  score: number;
  lives: number;
  setLives: React.Dispatch<React.SetStateAction<number>>;
  addScore: (delta: number, message: string, good?: boolean) => void;
}

export function shuffle<T>(arr: T[]) { return [...arr].sort(() => Math.random() - 0.5); }
export function itemAt(items: WordwallItem[], i: number) { return items[i % items.length]; }
