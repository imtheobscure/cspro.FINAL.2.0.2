export type QuestionType =
  | "mcq"
  | "multi"
  | "tf"
  | "reading"
  | "listening"
  | "dialogue"
  | "fill";

export interface DialogueLine {
  speaker: string;
  voice: "male" | "female" | "child";
  text: string;
}

export interface Explanation {
  title: string;
  meaning: string;
  usage: string;
  example: string;
  tip?: string;
  emoji?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  passage?: string;
  script?: DialogueLine[];
  options: string[];
  correct: number[];
  timeLimit?: number;
  explanation: Explanation;
}

export interface Quiz {
  id?: number;
  title: string;
  description?: string;
  subject?: string;
  questions: Question[];
}

export interface PlayerPublic {
  id: string;
  name: string;
  avatar: string;
  cash: number;
  streak: number;
  correct: number;
  wrong: number;
  answered: number;
  finished: boolean;
  wrongIds: string[];
}

export type AttackType = "blackout" | "scramble" | "drain" | "slowmo" | "fog";

export type HostMessage =
  | { t: "welcome"; quiz: Quiz; players: PlayerPublic[]; status: string; duration: number; you: string }
  | { t: "players"; players: PlayerPublic[] }
  | { t: "start"; duration: number; startedAt: number }
  | { t: "attack"; type: AttackType; from: string; amount?: number }
  | { t: "end" }
  | { t: "error"; msg: string };

export type ClientMessage =
  | { t: "join"; name: string; avatar: string }
  | { t: "progress"; p: Partial<PlayerPublic> }
  | { t: "attack"; type: AttackType; targetId: string | "random" | "leader"; amount?: number }
  | { t: "drainResult"; targetId: string; amount: number };
