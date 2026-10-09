/* ═══════════════════════════════════════════════════════════════════════════
   MADLIBS — SHARED TYPES
   Kept out of the component so `gamePack.ts` (the shell's prompt/parser) and the
   game itself agree on one shape and neither has to import the other.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Player {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
}

export interface Blank {
  id: string;
  label: string;
  type: string;
  suggestions: string[];
}

/**
 * A "what happens next" choice. The base story is finished first; each chosen
 * branch adds one beat that needs its own fresh words, so a single template
 * becomes a short branching narrative.
 */
export interface Branch {
  id: string;
  /** the choice the class reads, e.g. "Follow the dragon into the cave" */
  label: string;
  /** the beat added to the story, with {placeholders} for its own blanks */
  beat: string;
  blanks: Blank[];
  tone?: "normal" | "absurd" | "wild";
}

export interface Template {
  id: string;
  theme: string;
  mood: string;
  cefrLevel: string;
  title: string;
  templateText: string;
  blanks: Blank[];
  reflectionQuestions: string[];
  normalEnding: string;
  absurdEnding: string;
  /** optional branching choices; the engine synthesises them when absent */
  branches?: Branch[];
}

export interface LearnerInfo {
  cefrLevel?: string;
  age?: number;
  interests?: string[];
  lessonTopic?: string;
  [k: string]: unknown;
}

export interface Payload {
  madlibs: Template[];
  learnerInfo?: LearnerInfo;
}

export interface CommentEntry {
  id: string;
  name: string;
  avatar: string;
  text: string;
  timestamp: number;
  votes: number;
  reaction: string;
}

/** One branch the class has already played through. */
export interface StoryBeat {
  branchId: string;
  label: string;
  text: string;
  answers: Record<string, string>;
}

export type GamePhase =
  | "SELECT"       // template picker
  | "FILL"         // fill the base blanks (turn-based)
  | "REVEAL_REEL"  // story revealed word-by-word
  | "STORY"        // full story + reactions
  | "BRANCH"       // "what happens next" choice
  | "SWIPE_ENDING" // normal vs absurd ending
  | "PEER_FILL"    // peer challenge
  | "PEER_VERSUS"  // side-by-side comparison (kept for the peer challenge)
  | "REVIEW"       // vocabulary bank / spaced repetition
  | "RECAP";       // session checkpoint
