/**
 * ShoutOut — the emoji-flood arcade.
 *
 * This app began life as the Emoji Flood room inside TalkArena and is a game of
 * its own now: same teams, same class, but it runs a whole session end to end
 * (splash → room → waves → scoreboard) instead of living in a tab bar. Only what
 * that needs is typed here.
 */
export interface EmojiItem {
  emoji: string;
  name: string;
  alts: string[];
}

export interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  items: EmojiItem[];
}

export interface Team {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

/** One screen, one score — or a team per wave. */
export type Mode = 'solo' | 'teams';

export interface Settings {
  mode: Mode;
  /** How many waves a session runs for. */
  waves: number;
  pace: string;
  /** Categories in the mix — the deck minus whatever the tutor switched off. */
  categoryIds: string[];
  /** A different category every wave. */
  mixed: boolean;
  cam: boolean;
  music: boolean;
  sfx: boolean;
  musicVol: number;
  sfxVol: number;
  narrator: string;
  rate: number;
  fontScale: number;
  splash: boolean;
}

/** What one finished wave leaves behind — the scoreboard is built from these. */
export interface WaveResult {
  wave: number;
  teamId: string;
  categoryId: string;
  categoryName: string;
  spawned: number;
  popped: number;
  landed: number;
  /** Cleared the wave without drowning. */
  survived: boolean;
  /** Popped 90%+ — the wave was saved, not merely survived. */
  saved: boolean;
  /** Words that reached the water — the tutor's revision list. */
  landedWords: string[];
  ms: number;
  points: number;
}
