import type { Settings } from './types';

/**
 * Difficulty is a pace, not a number the tutor has to dial in.
 *
 * The three presets below are the whole tuning surface of the game: how fast the
 * words fall, how quickly new ones appear, how many may land before the room
 * floods, and how many words a wave throws. Everything the engine needs is
 * derived from one of these — see `waveTuning()`.
 */
export const PACE = {
  chill: {
    label: 'Chill',
    blurb: 'Slow rain — room for a full sentence between words.',
    base: 2.2,
    perWave: 0.3,
    gap: 1500,
    gapPerWave: 70,
    capacity: 14,
    quota: 8,
  },
  normal: {
    label: 'Standard',
    blurb: 'The class version: quick enough to feel like a game.',
    base: 3.1,
    perWave: 0.55,
    gap: 1150,
    gapPerWave: 78,
    capacity: 12,
    quota: 10,
  },
  panic: {
    label: 'Panic',
    blurb: 'Exam-eve energy. Words land in a heap.',
    base: 4.0,
    perWave: 0.7,
    gap: 900,
    gapPerWave: 60,
    capacity: 9,
    quota: 12,
  },
} as const;

export type PaceId = keyof typeof PACE;

export const PACE_IDS = Object.keys(PACE) as PaceId[];

export const isPace = (v: string): v is PaceId => v in PACE;

/** Everything one wave needs, from the pace plus the wave number. */
export function waveTuning(pace: string, wave: number) {
  const p = PACE[(isPace(pace) ? pace : 'normal') as PaceId];
  const w = Math.max(1, wave);
  return {
    /** Fall speed multiplier for a fresh word. */
    speed: p.base + p.perWave * (w - 1),
    /** Milliseconds between two words appearing. */
    gap: Math.max(320, p.gap - p.gapPerWave * (w - 1)),
    /** Words that may land before the room floods. */
    capacity: p.capacity,
    /** Words this wave throws at the class. */
    quota: p.quota + w * 2,
    label: p.label,
  };
}

/** Points: speed of retrieval is the skill, so volume beats caution. */
export const POINTS = {
  perWord: 25,
  survived: 120,
  saved: 300,
};

export function scoreWave(popped: number, spawned: number, survived: boolean) {
  const rate = spawned ? popped / spawned : 0;
  const saved = survived && rate >= 0.9;
  return {
    saved,
    rate,
    points: popped * POINTS.perWord + (saved ? POINTS.saved : survived ? POINTS.survived : 0),
  };
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** A sane default for a classroom projector, written once. */
export const DEFAULT_SETTINGS: Settings = {
  mode: 'teams',
  waves: 5,
  pace: 'normal',
  categoryIds: [],
  mixed: true,
  cam: true,
  music: true,
  sfx: true,
  musicVol: 0.45,
  sfxVol: 0.9,
  narrator: '',
  rate: 0.95,
  fontScale: 1.08,
  splash: true,
};
