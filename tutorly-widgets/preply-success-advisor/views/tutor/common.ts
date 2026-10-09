import type { Platform, Tutor } from "../../types";
import type { Toast } from "../../lib/useAppState";

/**
 * What every tab of a tutor profile is handed.
 *
 * The tabs never hold their own copy of the tutor. They call `update` with a function
 * that receives the freshest record and returns the next one, which means an AI paste
 * applied in one tab is immediately visible in the others — and there is no risk of
 * two tabs overwriting each other's edits.
 */
export interface TutorTabProps {
  tutor: Tutor;
  platform: Platform;
  customPlatforms: Platform[];
  rialPerUsd: number;
  /** Apply a change. Returns nothing; the state layer persists it. */
  update: (updater: (tutor: Tutor) => Tutor) => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
  /**
   * Whether the original chat text is kept alongside the clean log. Set in Settings;
   * off by default, because the clean version is the record you asked for.
   */
  keepRawLogs: boolean;
}

export const numberOr = (value: string, fallback = 0): number => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Comma-separated text ⇄ string[] — used by every tag-like field. */
export const splitList = (value: string): string[] =>
  value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

export const joinList = (value: string[]): string => value.join(", ");
