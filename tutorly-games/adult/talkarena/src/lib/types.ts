export type CEFR = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type QType = 'mc' | 'multi' | 'tf' | 'reading' | 'listening' | 'open';

export interface MediaItem {
  type: 'image' | 'gif' | 'video';
  url: string;
  caption: string;
  credit?: string;
}

export interface MiniLesson {
  grammarPoint: string;
  skill: string;
  subSkill: string;
  rule: string;
  why: string;
  example: string;
  mistake: string;
  drill?: string;
}

export interface DialogueLine {
  character: string;
  text: string;
}

export interface Question {
  id: string;
  category: string;
  type: QType;
  level: CEFR;
  value: number;
  prompt: string;
  /** Self-contained reading text — never refer to outside material. */
  text?: string;
  /** Self-contained listening script, read aloud by cast voices. */
  dialogue?: DialogueLine[];
  options: string[];
  /** indices of correct options */
  answer: number[];
  miniLesson: MiniLesson;
  /** speaking follow-up — the whole point: make them talk */
  talkTask: string;
  media?: MediaItem[];
}

export interface DebateTopic {
  id: string;
  topic: string;
  motion: string;
  level: CEFR;
  blurb: string;
  media: MediaItem[];
  vocab: { word: string; meaning: string }[];
  framesFor: string[];
  framesAgainst: string[];
  questions: string[];
  twist: string;
  hotSeat: string[];
}

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

export interface PictWord {
  word: string;
  hint: string;
  level: CEFR;
  category: string;
  talk: string;
}

export interface Pack {
  meta: { title: string; level: CEFR; topic: string; author?: string };
  questions: Question[];
  debates: DebateTopic[];
  emojiCategories: EmojiCategory[];
  pictionary: PictWord[];
}

export interface Player {
  id: string;
  name: string;
  style: string;
  seed: string;
  teamId: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface LogEntry {
  id: string;
  /** Emoji Flood left this app: it is the ShoutOut game (`../shoutout/`) now. */
  game: 'arena' | 'pictionary' | 'debate' | 'practice';
  round: number;
  qid: string;
  category: string;
  prompt: string;
  value: number;
  teamId: string | null;
  playerId: string | null;
  correct: boolean;
  ms: number;
  points: number;
  grammarPoint: string;
  skill: string;
  subSkill: string;
  level: CEFR;
  at: number;
}
